import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Search,
  MessageSquare,
  Download,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Glasses,
  Eye,
  RotateCcw,
  Copy,
  Check,
  X,
} from 'lucide-react';
import {
  CustomerSession,
  EyewearFrame,
  MedicalPrescription,
  OpticalQuote,
  QuoteStatus,
  SavedPrescriptionRecord,
  SelectedItem,
} from '../types';
import { premiumFrames } from '../data/frames';
import { LENS_TREATMENTS } from './LensTreatmentComparison';
import {
  deleteQuoteRecord,
  fetchPrescriptions,
  fetchQuotes,
  fetchRegisteredCustomers,
  saveQuoteRecord,
  subscribeToPrescriptions,
  subscribeToQuotes,
  updateQuoteStatus,
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
} from '../utils/quoteUtils';

interface AdminCustomerQuotesProps {
  customFrames: EyewearFrame[];
  onOpenQuoteInManager: (quote: OpticalQuote) => void;
  onQuotesCountChange?: (count: number) => void;
}

interface DraftItem {
  id: string;
  frameId: string;
  frameName: string;
  frameBrand: string;
  selectedColor: string;
  framePrice: string;
  lensBase: string;
  treatmentId: string;
  lensPrice: string;
}

const LENS_BASE_OPTIONS = [
  'Lente Monofocal Orgânica',
  'Lente Multifocal Digital Alta Precisão',
  'Lente Bifocal',
  'Lente Solar com Grau UV400',
  'Lente de Demonstração (Somente Armação)',
];

const PAYMENT_METHOD_OPTIONS = [
  'Pix à vista (5% desconto opcional)',
  'Link de Pagamento - 10x sem juros',
  'Cartão de Crédito - 6x sem juros',
  'Cartão de Crédito - 10x sem juros',
  'Cartão de Débito',
  'Pagamento na Visita a Domicílio',
];

const STATUS_META: Record<
  QuoteStatus,
  { label: string; selectClass: string }
> = {
  rascunho: {
    label: 'Rascunho',
    selectClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  enviado: {
    label: 'Enviado',
    selectClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  aprovado: {
    label: 'Aprovado',
    selectClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  cancelado: {
    label: 'Cancelado',
    selectClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

function createEmptyDraftItem(defaultFrame?: EyewearFrame): DraftItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    frameId: defaultFrame?.id || 'custom',
    frameName: defaultFrame?.name || 'Armação Selecionada',
    frameBrand: defaultFrame?.brand || 'Ótica Rapido',
    selectedColor: defaultFrame?.colors?.[0] || 'Preto Clássico',
    framePrice: defaultFrame && defaultFrame.price > 0 ? String(defaultFrame.price) : '350',
    lensBase: LENS_BASE_OPTIONS[0],
    treatmentId: 'filtro_azul',
    lensPrice: '290',
  };
}

export default function AdminCustomerQuotes({
  customFrames,
  onOpenQuoteInManager,
  onQuotesCountChange,
}: AdminCustomerQuotesProps) {
  const allFrames = useMemo(() => [...customFrames, ...premiumFrames], [customFrames]);

  // Saved data
  const [quotes, setQuotes] = useState<OpticalQuote[]>([]);
  const [customers, setCustomers] = useState<CustomerSession[]>([]);
  const [prescriptions, setPrescriptions] = useState<SavedPrescriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for saved quotes
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | QuoteStatus>('todos');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  // Form state
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string>(createQuoteNumber);
  const [includeFrame, setIncludeFrame] = useState<boolean>(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>('');
  const [linkedPrescription, setLinkedPrescription] = useState<MedicalPrescription | undefined>(
    undefined
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [validUntil, setValidUntil] = useState<string>(getDefaultValidUntil);
  const [discount, setDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHOD_OPTIONS[1]);
  const [sellerName, setSellerName] = useState<string>('Administrador - Ótica Rapido');
  const [status, setStatus] = useState<QuoteStatus>('rascunho');
  const [observations, setObservations] = useState<string>(
    'Orçamento elaborado pelo atendimento administrativo da Ótica Rapido. Inclui garantia de 1 ano para lentes e ajustes gratuitos.'
  );
  const [draftItems, setDraftItems] = useState<DraftItem[]>(() => [
    createEmptyDraftItem(allFrames[0]),
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedQuote, setLastSavedQuote] = useState<OpticalQuote | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;

    Promise.all([fetchQuotes(), fetchRegisteredCustomers(), fetchPrescriptions()]).then(
      ([loadedQuotes, loadedCustomers, loadedRx]) => {
        if (!active) return;
        setQuotes(loadedQuotes);
        setCustomers(loadedCustomers);
        setPrescriptions(loadedRx);
        setIsLoading(false);
        onQuotesCountChange?.(loadedQuotes.length);
      }
    );

    const unsubQuotes = subscribeToQuotes((updated) => {
      if (!active) return;
      setQuotes(updated);
      onQuotesCountChange?.(updated.length);
    });

    const unsubRx = subscribeToPrescriptions((updated) => {
      if (!active) return;
      setPrescriptions(updated);
    });

    return () => {
      active = false;
      unsubQuotes();
      unsubRx();
    };
  }, [onQuotesCountChange]);

  // Build SelectedItems array from draft state (respecting includeFrame)
  const computedSelectedItems: SelectedItem[] = useMemo(() => {
    return draftItems.map((draft, idx) => {
      const matchedFrame = allFrames.find((f) => f.id === draft.frameId);
      const framePrice = includeFrame
        ? Math.max(0, parseFloat(draft.framePrice.replace(',', '.')) || 0)
        : 0;
      const lensPrice = Math.max(0, parseFloat(draft.lensPrice.replace(',', '.')) || 0);
      const treatment = LENS_TREATMENTS.find((t) => t.id === draft.treatmentId);
      const fullLensLabel = treatment ? `${draft.lensBase} + ${treatment.name}` : draft.lensBase;

      const frameObj: EyewearFrame = includeFrame
        ? matchedFrame
          ? {
              ...matchedFrame,
              name: draft.frameName.trim() || matchedFrame.name,
              brand: draft.frameBrand.trim() || matchedFrame.brand,
              price: framePrice,
            }
          : {
              id: `custom-${draft.id}`,
              name: draft.frameName.trim() || 'Armação Personalizada',
              brand: draft.frameBrand.trim() || 'Ótica Rapido',
              price: framePrice,
              category: 'grau',
              gender: 'unissex',
              shape: 'quadrado',
              material: 'acetato',
              imageUrl: '',
              colors: [draft.selectedColor.trim() || 'Preto Clássico'],
              description: '',
              rating: 5,
            }
        : {
            id: 'customer-own-frame',
            name: 'Armação Própria do Cliente',
            brand: 'Cliente',
            price: 0,
            category: 'grau',
            gender: 'unissex',
            shape: 'quadrado',
            material: 'acetato',
            imageUrl: '',
            colors: ['Própria'],
            description: '',
            rating: 5,
          };

      return {
        frame: frameObj,
        selectedColor: includeFrame ? draft.selectedColor.trim() || 'Preto Clássico' : 'Armação Própria',
        lensType: fullLensLabel,
        lensPrice,
        prescription: idx === 0 ? linkedPrescription : undefined,
      };
    });
  }, [draftItems, allFrames, includeFrame, linkedPrescription]);

  // Real-time financial calculation (strictly zeroing frame price when includeFrame === false)
  const numericDiscount = Math.max(0, parseFloat(discount.replace(',', '.')) || 0);
  const { subtotal, total } = useMemo(
    () => calculateQuoteTotals(computedSelectedItems, numericDiscount, includeFrame),
    [computedSelectedItems, numericDiscount, includeFrame]
  );

  // Live OpticalQuote object for instant WhatsApp preview & saving
  const liveQuoteObject: OpticalQuote = useMemo(
    () => ({
      id: editingQuoteId || '',
      quoteNumber: quoteNumber.trim() || createQuoteNumber(),
      date: new Date().toISOString().split('T')[0],
      validUntil,
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerCpf: customerCpf.trim(),
      includeFrame,
      prescription: linkedPrescription,
      items: computedSelectedItems,
      subtotal,
      discount: numericDiscount,
      total,
      paymentMethod,
      observations: observations.trim(),
      sellerName: sellerName.trim() || 'Administrador - Ótica Rapido',
      status,
      createdBy: 'admin',
    }),
    [
      editingQuoteId,
      quoteNumber,
      validUntil,
      selectedCustomerId,
      customerName,
      customerPhone,
      customerEmail,
      customerCpf,
      includeFrame,
      linkedPrescription,
      computedSelectedItems,
      subtotal,
      numericDiscount,
      total,
      paymentMethod,
      observations,
      sellerName,
      status,
    ]
  );

  const handleSelectRegisteredCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const found = customers.find((c) => c.id === customerId);
    if (!found) return;
    setCustomerName(found.fullName || '');
    setCustomerPhone(found.phone || (found.identifierType === 'phone' ? found.identifier : ''));
    setCustomerEmail(found.email || (found.identifierType === 'email' ? found.identifier : ''));
  };

  const handleSelectSavedPrescription = (rxId: string) => {
    setSelectedPrescriptionId(rxId);
    if (!rxId) {
      setLinkedPrescription(undefined);
      return;
    }
    const found = prescriptions.find((r) => r.id === rxId);
    if (!found) return;
    setLinkedPrescription(found);
    if (!customerName.trim() && found.patientName) {
      setCustomerName(found.patientName);
    }
  };

  const handleUpdateDraftItem = (itemId: string, patch: Partial<DraftItem>) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  };

  const handleSelectCatalogFrame = (itemId: string, frameId: string) => {
    if (frameId === 'custom') {
      handleUpdateDraftItem(itemId, {
        frameId: 'custom',
        frameName: '',
        frameBrand: 'Ótica Rapido',
        selectedColor: 'Preto Clássico',
      });
      return;
    }

    const found = allFrames.find((f) => f.id === frameId);
    if (!found) return;
    handleUpdateDraftItem(itemId, {
      frameId: found.id,
      frameName: found.name,
      frameBrand: found.brand,
      selectedColor: found.colors[0] || 'Preto Clássico',
      framePrice: found.price > 0 ? String(found.price) : '350',
    });
  };

  const handleSelectTreatment = (itemId: string, treatmentId: string) => {
    if (treatmentId === 'nenhum') {
      handleUpdateDraftItem(itemId, { treatmentId, lensPrice: '0' });
      return;
    }
    const found = LENS_TREATMENTS.find((t) => t.id === treatmentId);
    handleUpdateDraftItem(itemId, {
      treatmentId,
      lensPrice: found ? String(found.suggestedPriceAddon) : '0',
    });
  };

  const handleAddItem = () => {
    setDraftItems((prev) => [...prev, createEmptyDraftItem(allFrames[0])]);
  };

  const handleRemoveItem = (itemId: string) => {
    setDraftItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== itemId) : prev));
  };

  const resetForm = () => {
    setEditingQuoteId(null);
    setLastSavedQuote(null);
    setQuoteNumber(createQuoteNumber());
    setIncludeFrame(true);
    setSelectedCustomerId('');
    setSelectedPrescriptionId('');
    setLinkedPrescription(undefined);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerCpf('');
    setValidUntil(getDefaultValidUntil());
    setDiscount('0');
    setPaymentMethod(PAYMENT_METHOD_OPTIONS[1]);
    setSellerName('Administrador - Ótica Rapido');
    setStatus('rascunho');
    setObservations(
      'Orçamento elaborado pelo atendimento administrativo da Ótica Rapido. Inclui garantia de 1 ano para lentes e ajustes gratuitos.'
    );
    setDraftItems([createEmptyDraftItem(allFrames[0])]);
    setFeedback(null);
  };

  const persistCurrentQuote = async (): Promise<OpticalQuote | null> => {
    setFeedback(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe o nome e o WhatsApp do cliente para salvar o orçamento.',
      });
      return null;
    }

    if (includeFrame && draftItems.some((item) => !item.frameName.trim())) {
      setFeedback({
        type: 'error',
        message: 'Preencha o nome da armação ou selecione a modalidade "Sem Armação".',
      });
      return null;
    }

    setIsSaving(true);
    try {
      const saved = await saveQuoteRecord({
        ...liveQuoteObject,
        id: editingQuoteId || undefined,
      });

      // Keep form fields populated & lock onto saved ID so admin can immediately send/print/edit
      setEditingQuoteId(saved.id);
      setQuoteNumber(saved.quoteNumber);
      setLastSavedQuote(saved);
      setQuotes((prev) => {
        const next = [saved, ...prev.filter((q) => q.id !== saved.id)];
        onQuotesCountChange?.(next.length);
        return next;
      });

      setFeedback({
        type: 'success',
        message: `Orçamento ${saved.quoteNumber} (${getQuoteModalityLabel(
          includeFrame
        )}) salvo para ${saved.customerName} — ${formatBRL(saved.total)}.`,
      });
      return saved;
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível salvar o orçamento. Verifique os campos e tente novamente.',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistCurrentQuote();
  };

  const handleSaveAndOpenProposal = async () => {
    const saved = await persistCurrentQuote();
    if (saved) {
      onOpenQuoteInManager(saved);
    }
  };

  const handleEditQuote = (quote: OpticalQuote) => {
    const withFrame = isQuoteWithFrame(quote);
    setEditingQuoteId(quote.id);
    setLastSavedQuote(quote);
    setQuoteNumber(quote.quoteNumber);
    setIncludeFrame(withFrame);
    setSelectedCustomerId(quote.customerId || '');
    setCustomerName(quote.customerName);
    setCustomerPhone(quote.customerPhone);
    setCustomerEmail(quote.customerEmail || '');
    setCustomerCpf(quote.customerCpf || '');
    setValidUntil(quote.validUntil || getDefaultValidUntil());
    setDiscount(String(quote.discount || 0));
    setPaymentMethod(quote.paymentMethod || PAYMENT_METHOD_OPTIONS[1]);
    setSellerName(quote.sellerName || 'Administrador - Ótica Rapido');
    setStatus(quote.status || 'rascunho');
    setObservations(quote.observations || '');

    const rx = getEffectivePrescription(quote);
    setLinkedPrescription(rx);
    setSelectedPrescriptionId('');

    if (quote.items && quote.items.length > 0) {
      setDraftItems(
        quote.items.map((it, idx) => {
          const matchedTreatment = LENS_TREATMENTS.find((t) =>
            it.lensType.toLowerCase().includes(t.name.toLowerCase().split(' ')[0])
          );
          const matchedFrame = allFrames.find(
            (f) => f.id === it.frame.id || f.name === it.frame.name
          );
          const basePart = it.lensType.split(' + ')[0] || LENS_BASE_OPTIONS[0];
          return {
            id: `edit-${idx}-${Date.now()}`,
            frameId: matchedFrame ? matchedFrame.id : 'custom',
            frameName:
              it.frame.name === 'Armação Própria do Cliente'
                ? allFrames[0]?.name || 'Armação Selecionada'
                : it.frame.name,
            frameBrand: it.frame.brand === 'Cliente' ? 'Ótica Rapido' : it.frame.brand,
            selectedColor: it.selectedColor === 'Armação Própria' ? 'Preto Clássico' : it.selectedColor || 'Preto Clássico',
            framePrice: String(it.frame.price || (withFrame ? 350 : 0)),
            lensBase: LENS_BASE_OPTIONS.includes(basePart) ? basePart : LENS_BASE_OPTIONS[0],
            treatmentId: matchedTreatment ? matchedTreatment.id : 'nenhum',
            lensPrice: String(it.lensPrice || 0),
          };
        })
      );
    } else {
      setDraftItems([createEmptyDraftItem(allFrames[0])]);
    }
    setFeedback(null);
  };

  const handleChangeQuoteStatus = async (quoteId: string, newStatus: QuoteStatus) => {
    await updateQuoteStatus(quoteId, newStatus);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    await deleteQuoteRecord(quoteId);
    if (editingQuoteId === quoteId) {
      resetForm();
    }
    setFeedback({ type: 'success', message: 'Orçamento removido do histórico.' });
  };

  const handleCopyQuoteSummary = (quote: OpticalQuote) => {
    const text = buildQuoteSummaryText(quote);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedQuoteId(quote.id);
        setTimeout(() => setCopiedQuoteId(null), 2400);
      })
      .catch(() => {
        setCopiedQuoteId(quote.id);
        setTimeout(() => setCopiedQuoteId(null), 2400);
      });
  };

  const filteredQuotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return quotes.filter((item) => {
      const matchesStatus = statusFilter === 'todos' || (item.status || 'rascunho') === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.toLowerCase().includes(q) ||
        item.quoteNumber.toLowerCase().includes(q) ||
        item.customerEmail.toLowerCase().includes(q)
      );
    });
  }, [quotes, searchTerm, statusFilter]);

  const totalPipelineValue = useMemo(
    () =>
      quotes
        .filter((q) => q.status !== 'cancelado')
        .reduce((acc, q) => acc + (Number(q.total) || 0), 0),
    [quotes]
  );

  return (
    <div className="space-y-6 text-left">
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>

          {feedback.type === 'success' && lastSavedQuote && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenQuoteInManager(lastSavedQuote)}
                className="px-3 py-1.5 bg-slate-900 text-gold-400 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar PDF
              </button>
              <a
                href={buildQuoteWhatsAppUrl(lastSavedQuote)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Enviar WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORMULÁRIO RÁPIDO DE ORÇAMENTO ADMIN (7 COLS) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-slate-900 text-gold-400 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-slate-900">
                  {editingQuoteId ? `Orçamento ${quoteNumber}` : 'Novo Orçamento para Cliente'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Fluxo rápido com ou sem armação, cálculo automático, PDF e envio direto no WhatsApp
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Novo Orçamento
            </button>
          </div>

          {/* BLOCO 1: CLIENTE & RECEITA */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gold-600" />
                1. Cliente e Receita
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                {customers.length > 0 && (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectRegisteredCustomer(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 text-slate-700 focus:ring-2 focus:ring-gold-500 outline-none max-w-[210px]"
                  >
                    <option value="">Cliente salvo ({customers.length})...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName || 'Cliente'} — {c.phone || c.email || c.identifier}
                      </option>
                    ))}
                  </select>
                )}

                {prescriptions.length > 0 && (
                  <select
                    value={selectedPrescriptionId}
                    onChange={(e) => handleSelectSavedPrescription(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 text-slate-700 focus:ring-2 focus:ring-gold-500 outline-none max-w-[210px]"
                  >
                    <option value="">Puxar receita ({prescriptions.length})...</option>
                    {prescriptions.map((rx) => (
                      <option key={rx.id} value={rx.id}>
                        {rx.patientName || 'Receita'} · OD {rx.od.spherical}/{rx.od.cylindrical}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {linkedPrescription && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-[11px]">
                <div className="font-mono tabular-nums text-slate-700 space-y-0.5">
                  <span className="font-sans font-bold text-slate-900 block">
                    Receita vinculada: {linkedPrescription.patientName || 'Paciente'}
                  </span>
                  <span className="block">
                    OD: Esf {linkedPrescription.od.spherical || '0.00'} · Cil{' '}
                    {linkedPrescription.od.cylindrical || '0.00'} · Eixo{' '}
                    {linkedPrescription.od.axis || '0'}°
                  </span>
                  <span className="block">
                    OE: Esf {linkedPrescription.oe.spherical || '0.00'} · Cil{' '}
                    {linkedPrescription.oe.cylindrical || '0.00'} · Eixo{' '}
                    {linkedPrescription.oe.axis || '0'}°
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLinkedPrescription(undefined);
                    setSelectedPrescriptionId('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  title="Desvincular receita"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nome Completo do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Maria Clara Oliveira"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp do Cliente *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  CPF (Opcional)
                </label>
                <input
                  type="text"
                  value={customerCpf}
                  onChange={(e) => setCustomerCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nº do Orçamento
                </label>
                <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 2: MODALIDADE (COM/SEM ARMAÇÃO) E ITENS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Glasses className="h-3.5 w-3.5 text-gold-600" />
                2. Modalidade e Itens ({draftItems.length})
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                {includeFrame ? 'Adicionar Óculos' : 'Adicionar Par de Lentes'}
              </button>
            </div>

            {/* Seletor Com Armação vs Sem Armação */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIncludeFrame(true)}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    includeFrame
                      ? 'bg-slate-950 text-gold-400 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Glasses className="h-4 w-4 flex-shrink-0" />
                  <span>Com Armação</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeFrame(false)}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !includeFrame
                      ? 'bg-slate-950 text-gold-400 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="h-4 w-4 flex-shrink-0" />
                  <span>Sem Armação (Somente Lentes)</span>
                </button>
              </div>
              {!includeFrame && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <strong>Modalidade: Somente Lentes (Armação Própria do Cliente).</strong> O valor
                  da armação é ignorado automaticamente e o cálculo considera apenas lentes +
                  tratamentos − desconto.
                </p>
              )}
            </div>

            <div className="space-y-4">
              {draftItems.map((item, idx) => {
                const selectedFrameObj = allFrames.find((f) => f.id === item.frameId);
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Item {idx + 1} {!includeFrame && '· Somente Lentes'}
                      </span>
                      {draftItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      )}
                    </div>

                    {includeFrame && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Escolher do Catálogo
                            </label>
                            <select
                              value={item.frameId}
                              onChange={(e) => handleSelectCatalogFrame(item.id, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
                            >
                              <option value="custom">Armação Personalizada / Avulsa</option>
                              {customFrames.length > 0 && (
                                <optgroup label="Armações Cadastradas no Admin">
                                  {customFrames.map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name} ({f.brand}){' '}
                                      {f.price > 0 ? `— ${formatBRL(f.price)}` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Modelos de Referência do Catálogo">
                                {premiumFrames.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.referenceCode ? `${f.referenceCode} · ` : ''}
                                    {f.name}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Nome da Armação na Proposta *
                            </label>
                            <input
                              type="text"
                              required={includeFrame}
                              value={item.frameName}
                              onChange={(e) =>
                                handleUpdateDraftItem(item.id, { frameName: e.target.value })
                              }
                              placeholder="Ex: Armação Acetato Quadrado"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2 border-b border-slate-200/70">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Cor / Acabamento
                            </label>
                            {selectedFrameObj && selectedFrameObj.colors.length > 0 ? (
                              <select
                                value={item.selectedColor}
                                onChange={(e) =>
                                  handleUpdateDraftItem(item.id, {
                                    selectedColor: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
                              >
                                {selectedFrameObj.colors.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={item.selectedColor}
                                onChange={(e) =>
                                  handleUpdateDraftItem(item.id, {
                                    selectedColor: e.target.value,
                                  })
                                }
                                placeholder="Preto Clássico"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                              />
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Marca
                            </label>
                            <input
                              type="text"
                              value={item.frameBrand}
                              onChange={(e) =>
                                handleUpdateDraftItem(item.id, { frameBrand: e.target.value })
                              }
                              placeholder="Ótica Rapido"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Valor Armação (R$)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.framePrice}
                              onChange={(e) =>
                                handleUpdateDraftItem(item.id, { framePrice: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono tabular-nums focus:ring-2 focus:ring-gold-500 outline-none"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tipo de Lente
                        </label>
                        <select
                          value={item.lensBase}
                          onChange={(e) =>
                            handleUpdateDraftItem(item.id, { lensBase: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
                        >
                          {LENS_BASE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tratamento da Lente
                        </label>
                        <select
                          value={item.treatmentId}
                          onChange={(e) => handleSelectTreatment(item.id, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
                        >
                          <option value="nenhum">Sem tratamento adicional</option>
                          {LENS_TREATMENTS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({formatBRL(t.suggestedPriceAddon)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Valor Lentes (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.lensPrice}
                          onChange={(e) =>
                            handleUpdateDraftItem(item.id, { lensPrice: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono tabular-nums focus:ring-2 focus:ring-gold-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BLOCO 3: CONDIÇÕES COMERCIAIS E FECHAMENTO */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900">
              3. Condições Comerciais e Validade
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Desconto (R$)</label>
                  <div className="flex items-center gap-1">
                    {[0, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDiscount(String(preset))}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                      >
                        {preset === 0 ? '0' : `-${preset}`}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono tabular-nums focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Validade da Proposta
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="enviado">Enviado ao Cliente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Forma de Pagamento Sugerida
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Responsável / Consultor
                </label>
                <input
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Observações para o Cliente
              </label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
              />
            </div>
          </div>

          {/* RESUMO FINANCEIRO EM TEMPO REAL */}
          <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="text-[11px] font-semibold text-gold-400">
                {getQuoteModalityLabel(includeFrame)}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 text-slate-400">
                <span>
                  Subtotal:{' '}
                  <strong className="font-mono tabular-nums text-slate-200">
                    {formatBRL(subtotal)}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Desconto:{' '}
                  <strong className="font-mono tabular-nums text-emerald-400">
                    - {formatBRL(numericDiscount)}
                  </strong>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{paymentMethod}</p>
            </div>
            <div className="sm:text-right">
              <span className="block text-[11px] text-slate-400">Total do Orçamento</span>
              <span className="font-mono tabular-nums text-2xl font-bold text-gold-400">
                {formatBRL(total)}
              </span>
            </div>
          </div>

          {/* AÇÕES RÁPIDAS DO ADMIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="submit"
              disabled={isSaving}
              className="py-3 px-4 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingQuoteId ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndOpenProposal}
              className="py-3 px-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-slate-950 font-display font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              Salvar e Baixar PDF
            </button>

            <a
              href={buildQuoteWhatsAppUrl(liveQuoteObject)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <MessageSquare className="h-4 w-4" />
              Enviar WhatsApp
            </a>
          </div>
        </form>

        {/* LISTA DE ORÇAMENTOS SALVOS (5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-black text-base text-slate-900">
                Orçamentos Salvos ({quotes.length})
              </h3>
              <span className="font-mono tabular-nums text-xs font-bold text-slate-700">
                {formatBRL(totalPipelineValue)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Reabra para editar, exportar PDF ou enviar o resumo no WhatsApp
            </p>
          </div>

          {/* Busca e Filtro por Status */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, telefone ou nº..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'rascunho', label: 'Rascunho' },
                  { id: 'enviado', label: 'Enviado' },
                  { id: 'aprovado', label: 'Aprovado' },
                  { id: 'cancelado', label: 'Cancelado' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-gold-500" />
              Carregando orçamentos...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="py-12 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Nenhum orçamento encontrado</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Preencha o formulário ao lado e clique em &ldquo;Salvar Orçamento&rdquo; para
                registrar o primeiro atendimento.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[760px] pr-1">
              {filteredQuotes.map((q) => {
                const currentStatus: QuoteStatus = q.status || 'rascunho';
                const statusInfo = STATUS_META[currentStatus];
                const qWithFrame = isQuoteWithFrame(q);
                const qRx = getEffectivePrescription(q);

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition-colors space-y-2.5 ${
                      editingQuoteId === q.id
                        ? 'bg-amber-50/40 border-gold-400'
                        : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span className="font-bold text-slate-800">{q.quoteNumber}</span>
                          <span aria-hidden="true">·</span>
                          <span>{qWithFrame ? 'Com Armação' : 'Somente Lentes'}</span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-slate-900 truncate mt-0.5">
                          {q.customerName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {q.customerPhone}
                          {q.validUntil ? ` · Válido até ${formatDateBR(q.validUntil)}` : ''}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-mono tabular-nums text-sm font-bold text-slate-950 block">
                          {formatBRL(q.total)}
                        </span>
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            handleChangeQuoteStatus(q.id, e.target.value as QuoteStatus)
                          }
                          aria-label={`Status do orçamento ${q.quoteNumber}`}
                          className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md border outline-none cursor-pointer ${statusInfo.selectClass}`}
                        >
                          <option value="rascunho">Rascunho</option>
                          <option value="enviado">Enviado</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>

                    {qRx && (
                      <p className="font-mono tabular-nums text-[10px] text-slate-500 bg-white border border-slate-200/70 rounded-lg px-2.5 py-1">
                        OD {qRx.od.spherical || '0.00'}/{qRx.od.cylindrical || '0.00'} ({qRx.od.axis || '0'}°) · OE {qRx.oe.spherical || '0.00'}/{qRx.oe.cylindrical || '0.00'} ({qRx.oe.axis || '0'}°)
                      </p>
                    )}

                    {/* Ações do card */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => onOpenQuoteInManager(q)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-gold-400 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        PDF / Pix
                      </button>

                      <a
                        href={buildQuoteWhatsAppUrl(q)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="h-3 w-3" />
                        WhatsApp
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyQuoteSummary(q)}
                        className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copiar resumo do orçamento"
                      >
                        {copiedQuoteId === q.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditQuote(q)}
                        className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Editar orçamento"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuote(q.id)}
                        className="ml-auto p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir orçamento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
