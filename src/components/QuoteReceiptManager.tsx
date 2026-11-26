import React, { useState, useEffect, useMemo } from 'react';
import {
  OpticalQuote,
  OpticalReceipt,
  EyewearFrame,
  MedicalPrescription,
  CustomerSession,
  SavedPrescriptionRecord,
  SelectedItem,
} from '../types';
import {
  Receipt,
  FileText,
  Printer,
  Plus,
  Trash2,
  Edit3,
  Check,
  RefreshCw,
  MessageSquare,
  QrCode,
  Link,
  Wallet,
  Copy,
  CreditCard,
  Sparkles,
  Save,
  Glasses,
  Eye,
  AlertCircle,
  Download,
  History,
  X,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import LensTreatmentComparison, { LensTreatment, LENS_TREATMENTS } from './LensTreatmentComparison';
import { MIN_FRAME_PRICE, premiumFrames } from '../data/frames';
import {
  fetchCatalogFrames,
  fetchPrescriptions,
  fetchQuotes,
  saveQuoteRecord,
  subscribeToCatalogUpdates,
  subscribeToPrescriptions,
  subscribeToQuotes,
} from '../services/supabaseService';
import {
  buildQuoteSummaryText,
  buildQuoteWhatsAppUrl,
  calculateQuoteTotals,
  createQuoteNumber,
  formatBRL,
  formatDateBR,
  getDefaultValidUntil,
  getEffectivePrescription,
  getQuoteModalityLabel,
  isQuoteWithFrame,
  STORE_WHATSAPP_NUMBER,
} from '../utils/quoteUtils';

interface QuoteReceiptManagerProps {
  lastSelectedFrame?: EyewearFrame;
  selectedColor?: string;
  selectedLensType?: string;
  selectedLensPrice?: number;
  linkedPrescription?: MedicalPrescription;
  customerSession?: CustomerSession | null;
  initialQuote?: OpticalQuote;
  isAdmin?: boolean;
  onRequireAdminLogin?: (reason?: string) => void;
  onNavigateToPrescription?: () => void;
}

const DEFAULT_FRAME: EyewearFrame = {
  ...premiumFrames[0],
};

function createBlankQuote(
  customerSession?: CustomerSession | null,
  prescription?: MedicalPrescription
): OpticalQuote {
  const defaultItem: SelectedItem = {
    frame: { ...DEFAULT_FRAME },
    selectedColor: DEFAULT_FRAME.colors[0],
    lensType: 'Lente Monofocal Orgânica + Filtro Azul (Blue UV)',
    lensPrice: 290,
    prescription,
  };
  const totals = calculateQuoteTotals([defaultItem], 0, true);
  return {
    id: '',
    quoteNumber: createQuoteNumber(),
    date: new Date().toISOString().split('T')[0],
    validUntil: getDefaultValidUntil(15),
    customerId: customerSession?.id,
    customerName: customerSession?.fullName || prescription?.patientName || '',
    customerPhone: customerSession?.phone || '',
    customerEmail: customerSession?.email || '',
    customerCpf: '',
    includeFrame: true,
    prescription,
    items: [defaultItem],
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    paymentMethod: 'Cartão de Crédito - 10x sem juros',
    observations:
      'Orçamento inclui garantia de 1 ano para lentes e ajustes gratuitos na unidade Paulista ou a domicílio.',
    sellerName: 'Consultoria Ótica Rapido',
    status: 'rascunho',
    createdBy: 'cliente',
  };
}

export default function QuoteReceiptManager({
  lastSelectedFrame,
  selectedColor = '',
  selectedLensType = '',
  selectedLensPrice = 0,
  linkedPrescription,
  customerSession,
  initialQuote,
  isAdmin = false,
  onRequireAdminLogin,
  onNavigateToPrescription,
}: QuoteReceiptManagerProps) {
  const [activeTab, setActiveTab] = useState<'quote' | 'receipt'>('quote');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>('filtro_azul');
  const [treatmentToast, setTreatmentToast] = useState<string | null>(null);

  // Live synced lists
  const [savedQuotes, setSavedQuotes] = useState<OpticalQuote[]>([]);
  const [savedPrescriptions, setSavedPrescriptions] = useState<SavedPrescriptionRecord[]>([]);
  const [customFrames, setCustomFrames] = useState<EyewearFrame[]>([]);
  const [allFrames, setAllFrames] = useState<EyewearFrame[]>(premiumFrames);
  const [selectedSavedRxId, setSelectedSavedRxId] = useState<string>('');

  // Save & copy feedback
  const [isSavingQuote, setIsSavingQuote] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [summaryCopied, setSummaryCopied] = useState<boolean>(false);

  // Payment gateway states
  const [paymentType, setPaymentType] = useState<'pix' | 'link'>('pix');
  const [acquirer, setAcquirer] = useState<'mercadopago' | 'pagseguro' | 'stone' | 'infinitepay'>(
    'mercadopago'
  );
  const [installments, setInstallments] = useState<string>('10x sem juros');
  const [paymentStatus, setPaymentStatus] = useState<'aguardando' | 'pago' | 'processando'>(
    'aguardando'
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Quote state
  const [quote, setQuote] = useState<OpticalQuote>(() =>
    createBlankQuote(customerSession, linkedPrescription)
  );

  // Receipt state
  const [receipt, setReceipt] = useState<OpticalReceipt>({
    id: `R-${Math.floor(1000 + Math.random() * 9000)}`,
    receiptNumber: `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-RC`,
    date: new Date().toISOString().split('T')[0],
    customerName: customerSession?.fullName || '',
    customerCpf: '',
    customerPhone: customerSession?.phone || '',
    amount: 640,
    amountWritten: 'R$ 640,00',
    descriptionOfServices:
      'Confecção de óculos sob medida com lentes de grau de alta precisão Ótica Rapido.',
    paymentMethod: 'Pix à vista',
    sellerName: 'Administrador - Ótica Rapido',
    cnpj: '48.912.450/0001-88',
    companyName: 'Ótica Rapido Ltda.',
  });

  const standardFrames = useMemo(
    () => allFrames.filter((f) => !f.isCustom),
    [allFrames]
  );

  // Subscribe to quotes, prescriptions, and live catalog prices
  useEffect(() => {
    let active = true;

    Promise.all([fetchQuotes(), fetchPrescriptions(), fetchCatalogFrames()]).then(
      ([loadedQuotes, loadedRx, catalogData]) => {
        if (!active) return;
        setSavedQuotes(loadedQuotes);
        setSavedPrescriptions(loadedRx);
        setCustomFrames(catalogData.customFrames);
        setAllFrames(catalogData.allFrames);
      }
    );

    const unsubQuotes = subscribeToQuotes((updated) => {
      if (active) setSavedQuotes(updated);
    });
    const unsubRx = subscribeToPrescriptions((updated) => {
      if (active) setSavedPrescriptions(updated);
    });
    const unsubCatalog = subscribeToCatalogUpdates((catalogData) => {
      if (!active) return;
      setCustomFrames(catalogData.customFrames);
      setAllFrames(catalogData.allFrames);
    });

    return () => {
      active = false;
      unsubQuotes();
      unsubRx();
      unsubCatalog();
    };
  }, []);

  // Load quote passed directly from the Admin Panel (/admin)
  useEffect(() => {
    if (!initialQuote) return;
    const withFrame = isQuoteWithFrame(initialQuote);
    const clonedItems = initialQuote.items.map((it) => ({
      ...it,
      frame: { ...it.frame },
    }));
    const totals = calculateQuoteTotals(clonedItems, initialQuote.discount, withFrame);
    setQuote({
      ...initialQuote,
      includeFrame: withFrame,
      items: clonedItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
    });
    setActiveTab('quote');
    setSaveFeedback(null);
  }, [initialQuote]);

  // Load selected frame from Catalog
  useEffect(() => {
    if (!lastSelectedFrame) return;
    setQuote((prev) => {
      const rx = prev.prescription || linkedPrescription;
      const newItem: SelectedItem = {
        frame: { ...lastSelectedFrame },
        selectedColor: selectedColor || lastSelectedFrame.colors[0] || 'Preto Clássico',
        lensType: selectedLensType || 'Lente Monofocal Orgânica + Filtro Azul (Blue UV)',
        lensPrice: selectedLensPrice || 290,
        prescription: rx,
      };
      const totals = calculateQuoteTotals([newItem], prev.discount, true);
      return {
        ...prev,
        id: '',
        includeFrame: true,
        prescription: rx,
        items: [newItem],
        subtotal: totals.subtotal,
        total: totals.total,
      };
    });
    setActiveTab('quote');
  }, [lastSelectedFrame, selectedColor, selectedLensType, selectedLensPrice, linkedPrescription]);

  // Attach prescription when coming from PrescriptionUpload tab
  useEffect(() => {
    if (!linkedPrescription) return;
    setQuote((prev) => ({
      ...prev,
      prescription: linkedPrescription,
      customerName: prev.customerName.trim() || linkedPrescription.patientName || '',
      items: prev.items.map((it, idx) =>
        idx === 0 ? { ...it, prescription: linkedPrescription } : it
      ),
    }));
  }, [linkedPrescription]);

  // Auto-fill customer identification when passwordless session is active
  useEffect(() => {
    if (!customerSession || initialQuote) return;
    setQuote((prev) => ({
      ...prev,
      customerId: prev.customerId || customerSession.id,
      customerName: prev.customerName || customerSession.fullName || '',
      customerPhone: prev.customerPhone || customerSession.phone || '',
      customerEmail: prev.customerEmail || customerSession.email || '',
    }));
    setReceipt((prev) => ({
      ...prev,
      customerName: prev.customerName || customerSession.fullName || '',
      customerPhone: prev.customerPhone || customerSession.phone || '',
    }));
  }, [customerSession, initialQuote]);

  // Reset payment status when total changes
  useEffect(() => {
    setPaymentStatus('aguardando');
  }, [activeTab, quote.total, receipt.amount]);

  const withFrame = isQuoteWithFrame(quote);
  const effectivePrescription = getEffectivePrescription(quote);

  const handleToggleIncludeFrame = (nextIncludeFrame: boolean) => {
    setQuote((prev) => {
      const nextItems = prev.items.map((item) => {
        if (!nextIncludeFrame) {
          return item;
        }
        // Restoring frame mode: if frame was empty placeholder, restore a sensible default name/price
        const needsDefaultName =
          !item.frame.name || item.frame.name === 'Armação Própria do Cliente';
        return {
          ...item,
          frame: {
            ...item.frame,
            name: needsDefaultName ? DEFAULT_FRAME.name : item.frame.name,
            brand:
              item.frame.brand === 'Cliente' || !item.frame.brand
                ? DEFAULT_FRAME.brand
                : item.frame.brand,
            price: item.frame.price > 0 ? item.frame.price : DEFAULT_FRAME.price,
          },
        };
      });
      const totals = calculateQuoteTotals(nextItems, prev.discount, nextIncludeFrame);
      return {
        ...prev,
        includeFrame: nextIncludeFrame,
        items: nextItems,
        subtotal: totals.subtotal,
        total: totals.total,
      };
    });
    setSaveFeedback(null);
  };

  const updateQuoteField = (field: keyof OpticalQuote, value: string | number) => {
    if (field === 'discount' && !isAdmin) {
      return;
    }
    setQuote((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'discount') {
        const disc = Math.max(0, parseFloat(String(value).replace(',', '.')) || 0);
        const totals = calculateQuoteTotals(prev.items, disc, isQuoteWithFrame(prev));
        updated.discount = totals.discount;
        updated.subtotal = totals.subtotal;
        updated.total = totals.total;
      }
      return updated;
    });
  };

  const updateQuoteItem = (
    index: number,
    updater: (item: SelectedItem) => SelectedItem
  ) => {
    setQuote((prev) => {
      const items = prev.items.map((item, idx) => (idx === index ? updater(item) : item));
      const totals = calculateQuoteTotals(items, prev.discount, isQuoteWithFrame(prev));
      return {
        ...prev,
        items,
        subtotal: totals.subtotal,
        total: totals.total,
      };
    });
  };

  const handleSelectCatalogFrameForItem = (index: number, frameId: string) => {
    if (frameId === 'custom') {
      if (!isAdmin) return;
      updateQuoteItem(index, (item) => ({
        ...item,
        frame: {
          ...item.frame,
          id: `custom-${Date.now()}`,
        },
      }));
      return;
    }

    const found = allFrames.find((f) => f.id === frameId);
    if (!found) return;

    updateQuoteItem(index, (item) => ({
      ...item,
      frame: { ...found, price: Math.max(MIN_FRAME_PRICE, found.price || MIN_FRAME_PRICE) },
      selectedColor: found.colors[0] || item.selectedColor || 'Preto Clássico',
    }));
  };

  useEffect(() => {
    if (!isAdmin && activeTab === 'receipt') {
      setActiveTab('quote');
    }
  }, [isAdmin, activeTab]);

  const handleAddQuoteItem = () => {
    const baseFrame = allFrames[0] || DEFAULT_FRAME;
    setQuote((prev) => {
      const nextItem: SelectedItem = {
        frame: {
          ...baseFrame,
          price: isQuoteWithFrame(prev)
            ? Math.max(MIN_FRAME_PRICE, baseFrame.price || MIN_FRAME_PRICE)
            : 0,
        },
        selectedColor: baseFrame.colors[0] || 'Preto Clássico',
        lensType: 'Lente Monofocal Orgânica + Antirreflexo Premium',
        lensPrice: 220,
      };
      const items = [...prev.items, nextItem];
      const totals = calculateQuoteTotals(items, prev.discount, isQuoteWithFrame(prev));
      return {
        ...prev,
        items,
        subtotal: totals.subtotal,
        total: totals.total,
      };
    });
  };

  const handleRemoveQuoteItem = (index: number) => {
    setQuote((prev) => {
      if (prev.items.length <= 1) return prev;
      const items = prev.items.filter((_, idx) => idx !== index);
      const totals = calculateQuoteTotals(items, prev.discount, isQuoteWithFrame(prev));
      return {
        ...prev,
        items,
        subtotal: totals.subtotal,
        total: totals.total,
      };
    });
  };

  const handleSelectSavedPrescription = (rxId: string) => {
    setSelectedSavedRxId(rxId);
    if (!rxId) return;
    const found = savedPrescriptions.find((r) => r.id === rxId);
    if (!found) return;
    setQuote((prev) => ({
      ...prev,
      prescription: found,
      customerName: prev.customerName.trim() || found.patientName || '',
      items: prev.items.map((it, idx) => (idx === 0 ? { ...it, prescription: found } : it)),
    }));
  };

  const handleClearLinkedPrescription = () => {
    setSelectedSavedRxId('');
    setQuote((prev) => ({
      ...prev,
      prescription: undefined,
      items: prev.items.map((it) => ({ ...it, prescription: undefined })),
    }));
  };

  const handleLoadSavedQuote = (quoteId: string) => {
    if (!quoteId) return;
    const found = savedQuotes.find((q) => q.id === quoteId);
    if (!found) return;
    const foundWithFrame = isQuoteWithFrame(found);
    const clonedItems = found.items.map((it) => ({
      ...it,
      frame: { ...it.frame },
    }));
    const totals = calculateQuoteTotals(clonedItems, found.discount, foundWithFrame);
    setQuote({
      ...found,
      includeFrame: foundWithFrame,
      items: clonedItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
    });
    setActiveTab('quote');
    setSaveFeedback(null);
  };

  const handleNewQuote = () => {
    setQuote(createBlankQuote(customerSession, linkedPrescription));
    setSelectedSavedRxId('');
    setSaveFeedback(null);
  };

  const handleSelectTreatment = (treatment: LensTreatment) => {
    setSelectedTreatmentId(treatment.id);

    setQuote((prev) => {
      if (prev.items.length === 0) return prev;

      const newItems = [...prev.items];
      const currentItem = newItems[0];

      let baseType = 'Lente Monofocal Orgânica';
      if (
        currentItem.lensType.toLowerCase().includes('multifocal') ||
        currentItem.lensType.toLowerCase().includes('progressiv')
      ) {
        baseType = 'Lente Multifocal Digital Alta Precisão';
      } else if (currentItem.lensType.toLowerCase().includes('bifocal')) {
        baseType = 'Lente Bifocal';
      }

      newItems[0] = {
        ...currentItem,
        lensType: `${baseType} + ${treatment.name}`,
        lensPrice: treatment.suggestedPriceAddon,
      };

      const totals = calculateQuoteTotals(newItems, prev.discount, isQuoteWithFrame(prev));

      let obs = prev.observations;
      if (treatment.id === 'antirreflexo') {
        obs =
          'Orçamento com tratamento Antirreflexo Especializado (elimina reflexos, garante nitidez total e conforto na direção noturna).';
      } else if (treatment.id === 'filtro_azul') {
        obs =
          'Orçamento com tratamento Filtro Azul Blue UV / BlueCut (bloqueio da luz azul nociva de telas e LED, reduzindo fadiga ocular).';
      } else if (treatment.id === 'fotocromaticas') {
        obs =
          'Orçamento com lentes Fotocromáticas dinâmicas (clareiam em ambientes internos e escurecem no sol com 100% de proteção UVA/UVB).';
      }

      return {
        ...prev,
        items: newItems,
        subtotal: totals.subtotal,
        total: totals.total,
        observations: obs,
      };
    });

    setTreatmentToast(`Tratamento "${treatment.name}" aplicado ao orçamento.`);
    setTimeout(() => setTreatmentToast(null), 3500);
  };

  const handleSaveQuote = async () => {
    setSaveFeedback(null);

    if (!quote.customerName.trim()) {
      setSaveFeedback({
        type: 'error',
        message: 'Informe o nome do paciente/cliente antes de salvar o orçamento.',
      });
      return;
    }

    setIsSavingQuote(true);
    try {
      const totals = calculateQuoteTotals(quote.items, quote.discount, withFrame);
      const saved = await saveQuoteRecord({
        ...quote,
        id: quote.id || undefined,
        quoteNumber: quote.quoteNumber.trim() || createQuoteNumber(),
        includeFrame: withFrame,
        prescription: effectivePrescription,
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        createdBy: quote.createdBy || 'cliente',
        status: quote.status || 'rascunho',
      });

      // Keep filled form fields intact while syncing the saved record ID & totals
      setQuote((prev) => ({
        ...prev,
        id: saved.id,
        quoteNumber: saved.quoteNumber,
        subtotal: saved.subtotal,
        discount: saved.discount,
        total: saved.total,
        status: saved.status,
        createdAt: saved.createdAt,
      }));

      // Immediately update local history list so the user sees it right away
      setSavedQuotes((prev) => [saved, ...prev.filter((q) => q.id !== saved.id)]);

      setSaveFeedback({
        type: 'success',
        message: `Orçamento ${saved.quoteNumber} (${getQuoteModalityLabel(
          withFrame
        )}) salvo com sucesso — ${formatBRL(saved.total)}.`,
      });
    } catch {
      setSaveFeedback({
        type: 'error',
        message: 'Não foi possível salvar o orçamento. Tente novamente.',
      });
    } finally {
      setIsSavingQuote(false);
    }
  };

  const handleCopySummary = () => {
    const text = buildQuoteSummaryText(quote);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSummaryCopied(true);
        setTimeout(() => setSummaryCopied(false), 2600);
      })
      .catch(() => {
        setSummaryCopied(true);
        setTimeout(() => setSummaryCopied(false), 2600);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const updateReceiptField = (field: keyof OpticalReceipt, value: string | number) => {
    setReceipt((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'amount') {
        const val = parseFloat(String(value)) || 0;
        updated.amount = val;
        updated.amountWritten = val === 0 ? 'Zero reais' : formatBRL(val);
      }
      return updated;
    });
  };

  const getPixPayload = () => {
    const totalAmount = activeTab === 'quote' ? quote.total : receipt.amount;
    const documentId = activeTab === 'quote' ? quote.quoteNumber : receipt.receiptNumber;
    return `00020101021226870014br.gov.bcb.pix2565pix.oticarapido.com.br/cob/doc${documentId.replace(
      /[^a-zA-Z0-9]/g,
      ''
    )}5204000053039865407${totalAmount.toFixed(
      2
    )}5802BR5912Otica Rapido6009Sao Paulo62070503***6304`;
  };

  const getPaymentLink = () => {
    const totalAmount = activeTab === 'quote' ? quote.total : receipt.amount;
    const documentId = activeTab === 'quote' ? quote.quoteNumber : receipt.receiptNumber;
    return `https://pagar.oticarapido.com.br/checkout/doc_${documentId.replace(
      /[^a-zA-Z0-9]/g,
      ''
    )}?gate=${acquirer}&installments=${encodeURIComponent(installments)}&amt=${totalAmount}`;
  };

  const copyToClipboard = (text: string, type: 'pix' | 'link') => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (type === 'pix') {
          setCopiedText('Código Pix copiado!');
          setTimeout(() => setCopiedText(null), 3000);
        } else {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 3000);
        }
      })
      .catch(() => {
        if (type === 'pix') {
          setCopiedText('Código copiado!');
          setTimeout(() => setCopiedText(null), 3000);
        } else {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 3000);
        }
      });
  };

  const handleSimulatePaymentSuccess = () => {
    setPaymentStatus('processando');
    setTimeout(() => {
      setPaymentStatus('pago');

      const totalAmount = activeTab === 'quote' ? quote.total : receipt.amount;
      const customerName = activeTab === 'quote' ? quote.customerName : receipt.customerName;
      const customerCpf = activeTab === 'quote' ? quote.customerCpf : receipt.customerCpf;
      const customerPhone = activeTab === 'quote' ? quote.customerPhone : receipt.customerPhone;

      if (activeTab === 'quote') {
        const itemsDescription = quote.items
          .map((item, i) =>
            withFrame
              ? `${i + 1}) ${item.frame.name} (${item.selectedColor}) + Lentes: ${item.lensType}`
              : `${i + 1}) Somente Lentes: ${item.lensType} (Armação própria do cliente)`
          )
          .join(', ');

        setReceipt({
          id: `R-${Math.floor(1000 + Math.random() * 9000)}`,
          receiptNumber: `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-RC`,
          date: new Date().toISOString().split('T')[0],
          customerName: customerName || 'Cliente Ótica Rapido',
          customerCpf: customerCpf || '-',
          customerPhone,
          amount: totalAmount,
          amountWritten: formatBRL(totalAmount),
          descriptionOfServices: `Serviço óptico Ótica Rapido (${getQuoteModalityLabel(
            withFrame
          )}): ${itemsDescription}.`,
          paymentMethod:
            paymentType === 'pix'
              ? 'Pix à vista (Pago instantaneamente)'
              : `Link de Pagamento - ${installments.toUpperCase()} (${acquirer.toUpperCase()})`,
          sellerName: quote.sellerName || 'Administrador - Ótica Rapido',
          cnpj: '48.912.450/0001-88',
          companyName: 'Ótica Rapido Ltda.',
        });
      } else {
        setReceipt((prev) => ({
          ...prev,
          paymentMethod:
            paymentType === 'pix'
              ? 'Pix à vista (Pago instantaneamente)'
              : `Link de Pagamento - ${installments.toUpperCase()} (${acquirer.toUpperCase()})`,
        }));
      }
    }, 900);
  };

  const shareReceiptWhatsApp = () => {
    const cleanPhone = (receipt.customerPhone || '').replace(/\D/g, '');
    const targetNumber =
      cleanPhone.length >= 10
        ? cleanPhone.startsWith('55')
          ? cleanPhone
          : `55${cleanPhone}`
        : STORE_WHATSAPP_NUMBER;

    const text =
      `*ÓTICA RAPIDO — COMPROVANTE DE RECIBO*\n\n` +
      `*Número:* ${receipt.receiptNumber}\n` +
      `*Data:* ${formatDateBR(receipt.date)}\n` +
      `*Emitente:* ${receipt.companyName} (CNPJ: ${receipt.cnpj})\n\n` +
      `Recebemos de *${receipt.customerName || 'Cliente'}* (CPF: ${
        receipt.customerCpf || 'Não informado'
      }) a importância líquida de *${formatBRL(receipt.amount)}* referente aos serviços:\n` +
      `"${receipt.descriptionOfServices}"\n\n` +
      `*Método de Liquidação:* ${receipt.paymentMethod}\n` +
      `*Responsável pela Emissão:* ${receipt.sellerName}\n\n` +
      `Obrigado por escolher a Ótica Rapido!`;

    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="py-4">
      {/* Top Toolbar: Document Switcher + Saved Quotes Quick Reopen */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 text-left flex flex-col lg:flex-row gap-4 lg:items-center justify-between shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('quote')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'quote'
                  ? 'bg-slate-950 text-gold-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Orçamentos
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  onRequireAdminLogin?.(
                    'A emissão de Recibos de Pagamento é restrita ao Administrador (ADM) autenticado.'
                  );
                  return;
                }
                setActiveTab('receipt');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'receipt'
                  ? 'bg-slate-950 text-gold-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAdmin ? <Receipt className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5 text-amber-600" />}
              Recibos {!isAdmin && '(ADM)'}
            </button>
          </div>

          {activeTab === 'quote' && (
            <button
              type="button"
              onClick={handleNewQuote}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Orçamento
            </button>
          )}
        </div>

        {/* Saved Quotes Quick Reopen */}
        {activeTab === 'quote' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <History className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <select
                aria-label="Abrir orçamento salvo"
                value={quote.id || ''}
                onChange={(e) => handleLoadSavedQuote(e.target.value)}
                className="w-full sm:w-72 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-gold-500 outline-none"
              >
                <option value="">
                  {savedQuotes.length > 0
                    ? `Orçamentos salvos (${savedQuotes.length}) — abrir...`
                    : 'Nenhum orçamento salvo ainda'}
                </option>
                {savedQuotes.map((sq) => (
                  <option key={sq.id} value={sq.id}>
                    {sq.quoteNumber} · {sq.customerName} ({sq.includeFrame === false ? 'Só Lentes' : 'Com Armação'}) · {formatBRL(sq.total)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
        {/* LEFT COLUMN: FORM EDITOR + DIGITAL PAYMENT (5 COLS) */}
        <div className="lg:col-span-5 space-y-6 print:hidden text-left">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display font-black text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-gold-500" />
                {activeTab === 'quote' ? 'Montar Orçamento' : 'Emitir Recibo'}
              </h3>
              {activeTab === 'quote' && quote.id && (
                <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                  Salvo · {quote.quoteNumber}
                </span>
              )}
            </div>

            {activeTab === 'quote' ? (
              <div className="space-y-5 pt-4">
                {/* 1. MODALIDADE: COM ARMAÇÃO vs SEM ARMAÇÃO */}
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-2">
                    Modalidade do Orçamento
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleToggleIncludeFrame(true)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        withFrame
                          ? 'bg-slate-950 text-gold-400 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Glasses className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Com Armação</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleIncludeFrame(false)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        !withFrame
                          ? 'bg-slate-950 text-gold-400 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Sem Armação</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {withFrame
                      ? 'Inclui armação (catálogo ou avulsa) + lentes e tratamentos.'
                      : 'Somente lentes / troca de lentes na armação própria do cliente. Valor da armação zerado.'}
                  </p>
                </div>

                {/* 2. DADOS DO CLIENTE & VALIDADE */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                        Nº Orçamento
                      </label>
                      <input
                        type="text"
                        value={quote.quoteNumber}
                        onChange={(e) => updateQuoteField('quoteNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-gold-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                        Válido Até
                      </label>
                      <input
                        type="date"
                        value={quote.validUntil}
                        onChange={(e) => updateQuoteField('validUntil', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Nome do Paciente / Cliente *
                    </label>
                    <input
                      type="text"
                      value={quote.customerName}
                      onChange={(e) => updateQuoteField('customerName', e.target.value)}
                      placeholder="Ex: Maria Clara Oliveira"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={quote.customerPhone}
                        onChange={(e) => updateQuoteField('customerPhone', e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                        CPF (Opcional)
                      </label>
                      <input
                        type="text"
                        value={quote.customerCpf}
                        onChange={(e) => updateQuoteField('customerCpf', e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-gold-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. RECEITA VINCULADA (PUXAR SEM DUPLICAR TELA) */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                      Receita Óptica (Opcional)
                    </span>
                    {onNavigateToPrescription && (
                      <button
                        type="button"
                        onClick={onNavigateToPrescription}
                        className="text-[11px] font-semibold text-gold-700 hover:text-gold-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ler nova receita</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {savedPrescriptions.length > 0 && (
                    <select
                      value={selectedSavedRxId}
                      onChange={(e) => handleSelectSavedPrescription(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-gold-500 outline-none"
                    >
                      <option value="">
                        Puxar receita salva ({savedPrescriptions.length})...
                      </option>
                      {savedPrescriptions.map((rx) => (
                        <option key={rx.id} value={rx.id}>
                          {rx.patientName || 'Paciente'} · OD {rx.od.spherical}/{rx.od.cylindrical} ({rx.od.axis}°) · OE {rx.oe.spherical}/{rx.oe.cylindrical} ({rx.oe.axis}°)
                        </option>
                      ))}
                    </select>
                  )}

                  {effectivePrescription ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 truncate">
                          Receita: {effectivePrescription.patientName || 'Vinculada'}
                        </span>
                        <button
                          type="button"
                          onClick={handleClearLinkedPrescription}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Desvincular receita"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-mono tabular-nums text-[10px] text-slate-600">
                        OD: Esf {effectivePrescription.od.spherical || '0.00'} · Cil{' '}
                        {effectivePrescription.od.cylindrical || '0.00'} · Eixo{' '}
                        {effectivePrescription.od.axis || '0'}°
                      </p>
                      <p className="font-mono tabular-nums text-[10px] text-slate-600">
                        OE: Esf {effectivePrescription.oe.spherical || '0.00'} · Cil{' '}
                        {effectivePrescription.oe.cylindrical || '0.00'} · Eixo{' '}
                        {effectivePrescription.oe.axis || '0'}°
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Nenhuma receita vinculada. Você pode puxar uma receita salva acima ou cadastrar na aba Receita.
                    </p>
                  )}
                </div>

                {/* 4. ITENS DO ORÇAMENTO */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                      {withFrame ? 'Armações e Lentes' : 'Lentes e Tratamentos (Sem Armação)'}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddQuoteItem}
                      className="text-[11px] font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar item
                    </button>
                  </div>

                  {quote.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          Item {idx + 1}
                        </span>
                        {quote.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuoteItem(idx)}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remover
                          </button>
                        )}
                      </div>

                      {withFrame ? (
                        <div className="space-y-2 pb-2.5 border-b border-slate-200/80">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                              {isAdmin ? 'Armação do Catálogo (ou Avulsa)' : 'Armação do Catálogo Oficial'}
                            </label>
                            <select
                              value={
                                allFrames.some((f) => f.id === item.frame.id)
                                  ? item.frame.id
                                  : isAdmin
                                    ? 'custom'
                                    : allFrames[0]?.id || ''
                              }
                              onChange={(e) =>
                                handleSelectCatalogFrameForItem(idx, e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                            >
                              {isAdmin && (
                                <option value="custom">Armação Personalizada / Avulsa (ADM)</option>
                              )}
                              {customFrames.length > 0 && (
                                <optgroup label="Armações Exclusivas">
                                  {customFrames.map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name} ({f.brand}) — {formatBRL(f.price)}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Catálogo Ótica Rapido">
                                {standardFrames.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.referenceCode ? `${f.referenceCode} · ` : ''}
                                    {f.name} — {formatBRL(f.price)}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-7">
                              <label className="block text-[10px] text-slate-500 mb-0.5">
                                Nome da Armação
                              </label>
                              <input
                                type="text"
                                readOnly={!isAdmin}
                                value={item.frame.name}
                                onChange={(e) => {
                                  if (!isAdmin) return;
                                  updateQuoteItem(idx, (cur) => ({
                                    ...cur,
                                    frame: { ...cur.frame, name: e.target.value },
                                  }));
                                }}
                                className={`w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none ${
                                  isAdmin
                                    ? 'bg-white focus:ring-2 focus:ring-gold-500'
                                    : 'bg-slate-100 text-slate-600 cursor-not-allowed'
                                }`}
                              />
                            </div>
                            <div className="col-span-5">
                              <label className="block text-[10px] text-slate-500 mb-0.5 flex items-center justify-between">
                                <span>Valor Armação (R$)</span>
                                {!isAdmin && <Lock className="h-2.5 w-2.5 text-slate-400" />}
                              </label>
                              <input
                                type="number"
                                min={MIN_FRAME_PRICE}
                                step="0.01"
                                readOnly={!isAdmin}
                                value={item.frame.price}
                                onChange={(e) => {
                                  if (!isAdmin) return;
                                  updateQuoteItem(idx, (cur) => ({
                                    ...cur,
                                    frame: {
                                      ...cur.frame,
                                      price: Math.max(0, parseFloat(e.target.value) || 0),
                                    },
                                  }));
                                }}
                                className={`w-full text-right px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums outline-none ${
                                  isAdmin
                                    ? 'bg-white focus:ring-2 focus:ring-gold-500'
                                    : 'bg-slate-100 text-slate-700 font-bold cursor-not-allowed'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[11px] text-amber-900">
                          Armação própria do cliente · Sem custo de armação neste item
                        </div>
                      )}

                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-7">
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            Lentes e Tratamento
                          </label>
                          <input
                            type="text"
                            readOnly={!isAdmin}
                            value={item.lensType}
                            onChange={(e) => {
                              if (!isAdmin) return;
                              updateQuoteItem(idx, (cur) => ({
                                ...cur,
                                lensType: e.target.value,
                              }));
                            }}
                            className={`w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none ${
                              isAdmin
                                ? 'bg-white focus:ring-2 focus:ring-gold-500'
                                : 'bg-slate-100 text-slate-600 cursor-not-allowed'
                            }`}
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="block text-[10px] text-slate-500 mb-0.5 flex items-center justify-between">
                            <span>Valor Lentes (R$)</span>
                            {!isAdmin && <Lock className="h-2.5 w-2.5 text-slate-400" />}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            readOnly={!isAdmin}
                            value={item.lensPrice}
                            onChange={(e) => {
                              if (!isAdmin) return;
                              updateQuoteItem(idx, (cur) => ({
                                ...cur,
                                lensPrice: Math.max(0, parseFloat(e.target.value) || 0),
                              }));
                            }}
                            className={`w-full text-right px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums outline-none ${
                              isAdmin
                                ? 'bg-white focus:ring-2 focus:ring-gold-500'
                                : 'bg-slate-100 text-slate-700 font-bold cursor-not-allowed'
                            }`}
                          />
                        </div>
                      </div>
                      {!isAdmin && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          Valores tabelados pela Ótica Rapido. Escolha a armação e o tratamento desejado abaixo.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Treatment Selector */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-gold-500" />
                      Tratamento de Lentes Rápido
                    </span>
                    <span className="text-[10px] text-slate-400">1 clique</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {LENS_TREATMENTS.map((t) => {
                      const isSelected = selectedTreatmentId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTreatment(t)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-[11px] font-bold block leading-tight">
                            {t.id === 'antirreflexo'
                              ? 'Antirreflexo'
                              : t.id === 'filtro_azul'
                                ? 'Filtro Azul'
                                : 'Fotocromática'}
                          </span>
                          <span
                            className={`text-[10px] font-mono tabular-nums font-semibold block mt-1 ${
                              isSelected ? 'text-gold-400' : 'text-slate-500'
                            }`}
                          >
                            {formatBRL(t.suggestedPriceAddon)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {treatmentToast && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-lg flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{treatmentToast}</span>
                    </div>
                  )}
                </div>

                {/* 5. DESCONTO & CONDIÇÕES */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
                          <span>Desconto (R$)</span>
                          {!isAdmin && <Lock className="h-2.5 w-2.5" />}
                        </label>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            {[0, 50, 100].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updateQuoteField('discount', preset)}
                                className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                              >
                                {preset === 0 ? '0' : `-${preset}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        readOnly={!isAdmin}
                        value={quote.discount}
                        onChange={(e) => updateQuoteField('discount', e.target.value)}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono tabular-nums outline-none ${
                          isAdmin
                            ? 'bg-white focus:ring-2 focus:ring-gold-500'
                            : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                        Forma de Pagamento
                      </label>
                      <input
                        type="text"
                        value={quote.paymentMethod}
                        onChange={(e) => updateQuoteField('paymentMethod', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Consultor Responsável
                    </label>
                    <input
                      type="text"
                      value={quote.sellerName}
                      onChange={(e) => updateQuoteField('sellerName', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Observações
                    </label>
                    <textarea
                      rows={2}
                      value={quote.observations}
                      onChange={(e) => updateQuoteField('observations', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                  </div>
                </div>

                {/* SALVAR ORÇAMENTO */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    disabled={isSavingQuote}
                    onClick={handleSaveQuote}
                    className="w-full py-3 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    {isSavingQuote ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Salvando Orçamento...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {quote.id ? 'Atualizar Orçamento Salvo' : 'Salvar Orçamento'}
                      </>
                    )}
                  </button>

                  {saveFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                        saveFeedback.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      {saveFeedback.type === 'success' ? (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{saveFeedback.message}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // RECEIPT EDIT FIELDS
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                    Empresa Emitente
                  </label>
                  <input
                    type="text"
                    value={receipt.companyName}
                    onChange={(e) => updateReceiptField('companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1 font-bold">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      value={receipt.amount}
                      onChange={(e) => updateReceiptField('amount', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Numeração Fatura
                    </label>
                    <input
                      type="text"
                      value={receipt.receiptNumber}
                      onChange={(e) => updateReceiptField('receiptNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                    Nome do Pagador
                  </label>
                  <input
                    type="text"
                    value={receipt.customerName}
                    onChange={(e) => updateReceiptField('customerName', e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      CPF do Pagador
                    </label>
                    <input
                      type="text"
                      value={receipt.customerCpf}
                      onChange={(e) => updateReceiptField('customerCpf', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={receipt.customerPhone}
                      onChange={(e) => updateReceiptField('customerPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                    Descrição do Serviço
                  </label>
                  <textarea
                    rows={3}
                    value={receipt.descriptionOfServices}
                    onChange={(e) => updateReceiptField('descriptionOfServices', e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Método de Liquidação
                    </label>
                    <input
                      type="text"
                      value={receipt.paymentMethod}
                      onChange={(e) => updateReceiptField('paymentMethod', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Responsável
                    </label>
                    <input
                      type="text"
                      value={receipt.sellerName}
                      onChange={(e) => updateReceiptField('sellerName', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <a
                  href={shareReceiptWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                  Enviar Recibo pelo WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* MÓDULO DE COBRANÇA DIGITAL (PIX & LINK) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-gold-600" />
                <h4 className="font-display font-black text-xs text-slate-950 uppercase tracking-wider">
                  Cobrança Digital
                </h4>
              </div>
              <span className="text-xs font-mono tabular-nums font-bold text-slate-900">
                {formatBRL(activeTab === 'quote' ? quote.total : receipt.amount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentType('pix')}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentType === 'pix'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" /> Pix
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('link')}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentType === 'link'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Link className="h-3.5 w-3.5" /> Link de Pagamento
              </button>
            </div>

            {paymentType === 'pix' && (
              <div className="space-y-3 pt-1">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col items-center text-center">
                  <div className="relative p-2.5 bg-white border border-slate-200 rounded-xl mb-2">
                    <svg viewBox="0 0 100 100" className="w-28 h-28">
                      <path d="M5,5 h15 v15 h-15 z M5,10 h15 M10,5 v15" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M5,80 h15 v15 h-15 z M5,85 h15 M10,80 v15" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M80,5 h15 v15 h-15 z M80,10 h15 M85,5 v15" stroke="#334155" strokeWidth="2" fill="none" />
                      <rect x="25" y="5" width="4" height="4" fill="#334155" />
                      <rect x="35" y="15" width="4" height="4" fill="#334155" />
                      <rect x="55" y="5" width="8" height="8" fill="#334155" />
                      <rect x="70" y="25" width="4" height="12" fill="#334155" />
                      <rect x="5" y="30" width="12" height="4" fill="#334155" />
                      <rect x="25" y="35" width="8" height="4" fill="#334155" />
                      <rect x="35" y="45" width="30" height="4" fill="#1e3a5f" />
                      <rect x="45" y="35" width="4" height="30" fill="#1e3a5f" />
                      <rect x="55" y="65" width="12" height="12" fill="#334155" />
                      <rect x="35" y="75" width="4" height="16" fill="#334155" />
                      <rect x="75" y="55" width="16" height="4" fill="#334155" />
                      <rect x="85" y="65" width="8" height="8" fill="#334155" />
                      <circle cx="50" cy="50" r="10" fill="#0284c7" />
                      <path d="M47,50 l3,-3 l3,3 l-3,3 z" fill="#ffffff" />
                    </svg>
                    {paymentStatus === 'pago' && (
                      <div className="absolute inset-0 bg-emerald-500/95 flex flex-col items-center justify-center text-white rounded-xl">
                        <Check className="h-8 w-8 mb-1" />
                        <span className="font-sans font-black text-[9px] uppercase tracking-wider">
                          PIX CONFIRMADO
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="w-full flex gap-1.5 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={getPixPayload()}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 font-mono text-[10px] truncate outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(getPixPayload(), 'pix')}
                      className="px-3 bg-slate-900 text-white rounded-lg text-xs hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                      title="Copiar Código Pix"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {copiedText && (
                    <span className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {copiedText}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <span className="font-medium text-slate-600">
                    {paymentStatus === 'aguardando'
                      ? 'Aguardando confirmação'
                      : paymentStatus === 'processando'
                        ? 'Validando...'
                        : 'Pagamento confirmado · Recibo pronto'}
                  </span>
                  {paymentStatus === 'aguardando' && (
                    <button
                      type="button"
                      onClick={handleSimulatePaymentSuccess}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Gerar Recibo Pago
                    </button>
                  )}
                </div>
              </div>
            )}

            {paymentType === 'link' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Provedor
                    </label>
                    <select
                      value={acquirer}
                      onChange={(e) =>
                        setAcquirer(
                          e.target.value as 'mercadopago' | 'pagseguro' | 'stone' | 'infinitepay'
                        )
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                    >
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="pagseguro">PagSeguro UOL</option>
                      <option value="stone">Stone Link</option>
                      <option value="infinitepay">InfinitePay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                      Parcelas
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                    >
                      <option value="à vista">À vista</option>
                      <option value="3x sem juros">Até 3x sem juros</option>
                      <option value="6x sem juros">Até 6x sem juros</option>
                      <option value="10x sem juros">Até 10x sem juros</option>
                      <option value="12x com acréscimo">Até 12x</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={getPaymentLink()}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-[10px] truncate outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getPaymentLink(), 'link')}
                    className="px-3 bg-slate-900 text-white rounded-lg text-xs hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                    title="Copiar Link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                {linkCopied && (
                  <span className="text-[11px] text-emerald-600 font-semibold block">
                    Link de pagamento copiado!
                  </span>
                )}

                <div className="flex gap-2">
                  <a
                    href={(() => {
                      const amount = activeTab === 'quote' ? quote.total : receipt.amount;
                      const clientName =
                        activeTab === 'quote' ? quote.customerName : receipt.customerName;
                      const phone =
                        activeTab === 'quote' ? quote.customerPhone : receipt.customerPhone;
                      const cleanPhone = (phone || '').replace(/\D/g, '');
                      const target =
                        cleanPhone.length >= 10
                          ? cleanPhone.startsWith('55')
                            ? cleanPhone
                            : `55${cleanPhone}`
                          : STORE_WHATSAPP_NUMBER;
                      const text =
                        `Olá, *${clientName || 'Cliente'}*!\n\n` +
                        `Segue o link de pagamento do seu orçamento na *Ótica Rapido*:\n` +
                        `*Total:* ${formatBRL(amount)} (${installments})\n` +
                        `*Link:* ${getPaymentLink()}`;
                      return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Enviar Link
                  </a>
                  <button
                    type="button"
                    onClick={handleSimulatePaymentSuccess}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-gold-400 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Confirmar e Recibo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PROPOSAL / RECEIPT PREVIEW + EXPORT & SEND BAR (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prominent Proposal Action Bar (Hidden on Print) */}
          <div className="bg-slate-950 text-white rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="text-left">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-gold-400">
                {activeTab === 'quote' ? 'Ações da Proposta' : 'Ações do Recibo'}
              </span>
              <span className="text-xs text-slate-300">
                {activeTab === 'quote'
                  ? `${quote.quoteNumber} · ${getQuoteModalityLabel(withFrame)}`
                  : receipt.receiptNumber}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar PDF</span>
              </button>

              {activeTab === 'quote' && (
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {summaryCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Resumo Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Resumo</span>
                    </>
                  )}
                </button>
              )}

              <a
                href={
                  activeTab === 'quote'
                    ? buildQuoteWhatsAppUrl(quote)
                    : shareReceiptWhatsApp()
                }
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Enviar WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Printable Document Sheet */}
          <div className="print-document-sheet bg-white border border-slate-300 rounded-3xl p-6 sm:p-10 shadow-sm relative min-h-[620px] flex flex-col justify-between print:border-none print:shadow-none print:rounded-none print:p-0">
            <div>
              {activeTab === 'quote' ? (
                <div className="text-left font-sans">
                  {/* Document Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5 gap-4">
                    <div>
                      <h2 className="font-display font-black text-2xl uppercase tracking-widest text-slate-900 leading-none">
                        ÓTICA<span className="text-slate-500 font-light">RAPIDO</span>
                      </h2>
                      <p className="font-mono text-[10px] uppercase text-slate-500 tracking-wider mt-1">
                        Ótica Online &amp; Atendimento a Domicílio
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Av. Paulista, 1200 · São Paulo/SP · CNPJ 48.912.450/0001-88
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-mono tracking-wider rounded uppercase font-bold">
                        PROPOSTA DE ORÇAMENTO
                      </span>
                      <p className="text-xs font-mono font-bold text-slate-900 mt-2 tabular-nums">
                        Nº {quote.quoteNumber}
                      </p>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        Emissão: {formatDateBR(quote.date)}
                      </p>
                    </div>
                  </div>

                  {/* Modality Explicit Callout */}
                  <div
                    className={`rounded-xl px-4 py-2.5 mb-5 border flex flex-wrap items-center justify-between gap-2 text-xs ${
                      withFrame
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-amber-50/80 border-amber-200 text-amber-950'
                    }`}
                  >
                    <span className="font-semibold">
                      Modalidade: <strong>{getQuoteModalityLabel(withFrame)}</strong>
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                      Válido até {formatDateBR(quote.validUntil)}
                    </span>
                  </div>

                  {/* Patient / Customer Details */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                        Paciente / Cliente
                      </span>
                      <p className="font-bold text-sm text-slate-900 mt-0.5">
                        {quote.customerName || 'Cliente não informado'}
                      </p>
                      {quote.customerPhone && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          WhatsApp: {quote.customerPhone}
                        </p>
                      )}
                      {quote.customerCpf && (
                        <p className="text-xs text-slate-500 font-mono">
                          CPF: {quote.customerCpf}
                        </p>
                      )}
                    </div>
                    <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                        Condição Comercial
                      </span>
                      <p className="font-semibold text-xs text-slate-800 mt-0.5">
                        {quote.paymentMethod}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Garantia de 365 dias nas lentes contra defeitos de fabricação.
                      </p>
                    </div>
                  </div>

                  {/* Semantic Items Table (Zero clipping in Print/PDF) */}
                  <div className="mb-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-[10px] font-mono uppercase text-slate-500">
                          <th className="py-2 pr-3 font-bold">Descrição</th>
                          <th className="py-2 px-2 text-center w-24 font-bold">Tipo</th>
                          <th className="py-2 pl-3 text-right w-32 font-bold">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {quote.items.map((item, i) => (
                          <React.Fragment key={i}>
                            {withFrame && (
                              <tr>
                                <td className="py-3 pr-3 align-top">
                                  <strong className="font-semibold text-slate-900 block">
                                    {item.frame.name}
                                  </strong>
                                  <span className="text-[11px] text-slate-500">
                                    {item.frame.brand} · Cor: {item.selectedColor}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center align-top text-[11px] text-slate-500">
                                  Armação
                                </td>
                                <td className="py-3 pl-3 text-right align-top font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                                  {formatBRL(item.frame.price)}
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td className="py-3 pr-3 align-top">
                                <strong className="font-semibold text-slate-900 block">
                                  {item.lensType}
                                </strong>
                                <span className="text-[11px] text-slate-500">
                                  {withFrame
                                    ? 'Laboratório óptico de alta precisão'
                                    : 'Montagem em armação própria do cliente (sem custo de armação)'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center align-top text-[11px] text-slate-500">
                                Lentes
                              </td>
                              <td className="py-3 pl-3 text-right align-top font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                                {item.lensPrice === 0 ? 'Inclusa' : formatBRL(item.lensPrice)}
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Linked Optical Prescription Summary */}
                  {effectivePrescription && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                      <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-slate-600 block mb-2">
                        Graus da Receita Vinculada
                        {effectivePrescription.doctorName
                          ? ` · ${effectivePrescription.doctorName}`
                          : ''}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono tabular-nums text-slate-800">
                        <div>
                          <strong>OD (Direito):</strong> Esf {effectivePrescription.od.spherical || '0.00'} · Cil{' '}
                          {effectivePrescription.od.cylindrical || '0.00'} · Eixo{' '}
                          {effectivePrescription.od.axis || '0'}°
                        </div>
                        <div className="sm:border-l sm:border-slate-200 sm:pl-3">
                          <strong>OE (Esquerdo):</strong> Esf {effectivePrescription.oe.spherical || '0.00'} · Cil{' '}
                          {effectivePrescription.oe.cylindrical || '0.00'} · Eixo{' '}
                          {effectivePrescription.oe.axis || '0'}°
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial Totals */}
                  <div className="border-t border-slate-200 pt-4 flex flex-col items-end bg-slate-50/70 px-4 py-3.5 rounded-xl">
                    <div className="flex justify-between w-full sm:w-80 text-xs text-slate-600">
                      <span>
                        {withFrame
                          ? 'Subtotal (Armação + Lentes):'
                          : 'Subtotal (Somente Lentes):'}
                      </span>
                      <span className="font-mono tabular-nums font-semibold">
                        {formatBRL(quote.subtotal)}
                      </span>
                    </div>
                    {quote.discount > 0 && (
                      <div className="flex justify-between w-full sm:w-80 text-xs text-emerald-700 font-semibold border-b border-dashed border-slate-200 pb-1.5 mt-1">
                        <span>Desconto Especial:</span>
                        <span className="font-mono tabular-nums">
                          - {formatBRL(quote.discount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between w-full sm:w-80 text-sm font-bold text-slate-950 pt-2">
                      <span>Total da Proposta:</span>
                      <span className="font-mono tabular-nums text-lg text-slate-950">
                        {formatBRL(quote.total)}
                      </span>
                    </div>
                  </div>

                  {quote.observations && (
                    <div className="mt-6">
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                        Observações
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {quote.observations}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // RECEIPT PREVIEW
                <div className="text-left font-sans">
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6 gap-4">
                    <div>
                      <h2 className="font-display font-black text-2xl uppercase tracking-widest text-slate-900 leading-none">
                        ÓTICA<span className="text-slate-500 font-light">RAPIDO</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">{receipt.companyName}</p>
                      <p className="text-[11px] text-slate-400">CNPJ: {receipt.cnpj}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-mono tracking-wider rounded uppercase font-bold">
                        COMPROVANTE DE RECIBO
                      </span>
                      <p className="text-xs font-mono font-bold text-slate-900 mt-2">
                        Fatura nº {receipt.receiptNumber}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Emissão: {formatDateBR(receipt.date)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs leading-relaxed text-slate-700 border border-slate-200 p-6 rounded-2xl bg-slate-50/50">
                    <p>
                      Declaramos que recebemos de{' '}
                      <strong className="text-slate-900">
                        {receipt.customerName || 'Cliente'}
                      </strong>
                      {receipt.customerCpf ? (
                        <>
                          , CPF <strong className="text-slate-900">{receipt.customerCpf}</strong>
                        </>
                      ) : null}
                      , a importância líquida de:
                    </p>

                    <div className="bg-slate-900 text-gold-400 font-mono tabular-nums text-lg font-extrabold px-4 py-3 rounded-xl text-center">
                      {formatBRL(receipt.amount)}
                    </div>

                    <p>Referente aos serviços ópticos descritos abaixo:</p>
                    <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs leading-relaxed">
                      {receipt.descriptionOfServices}
                    </p>

                    <p>
                      Forma de quitação:{' '}
                      <strong className="text-slate-900">{receipt.paymentMethod}</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="border-t border-slate-200 pt-6 mt-10 grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="font-mono text-[10px] text-slate-400">RESPONSÁVEL PELA EMISSÃO</p>
                <div className="w-48 max-w-full h-7 border-b border-slate-300 mt-2" />
                <p className="font-semibold text-[11px] text-slate-700 mt-1">
                  {activeTab === 'quote' ? quote.sellerName : receipt.sellerName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-slate-400">CIENTE DO CLIENTE</p>
                <div className="w-48 max-w-full h-7 ml-auto border-b border-slate-300 mt-2" />
                <p className="font-semibold text-[11px] text-slate-700 mt-1">
                  {activeTab === 'quote'
                    ? quote.customerName || 'Cliente'
                    : receipt.customerName || 'Cliente'}
                </p>
              </div>
            </div>
          </div>

          {/* Subtle print button note */}
          <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 print:hidden">
            <Printer className="h-3.5 w-3.5" />
            <span>Dica: em "Baixar PDF", escolha "Salvar como PDF" no diálogo de impressão.</span>
          </div>
        </div>
      </div>

      {/* COMPARATIVE TABLE OF LENS TREATMENTS */}
      {activeTab === 'quote' && (
        <div className="mt-8 print:hidden">
          <LensTreatmentComparison
            onSelectTreatment={handleSelectTreatment}
            selectedTreatmentId={selectedTreatmentId}
          />
        </div>
      )}
    </div>
  );
}
