import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Search,
  MessageSquare,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Glasses,
  RotateCcw,
} from 'lucide-react';
import {
  CustomerSession,
  EyewearFrame,
  OpticalQuote,
  QuoteStatus,
  SelectedItem,
} from '../types';
import { premiumFrames } from '../data/frames';
import { LENS_TREATMENTS } from './LensTreatmentComparison';
import {
  deleteQuoteRecord,
  fetchQuotes,
  fetchRegisteredCustomers,
  saveQuoteRecord,
  subscribeToQuotes,
  updateQuoteStatus,
} from '../services/supabaseService';

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
  { label: string; textClass: string; selectClass: string }
> = {
  rascunho: {
    label: 'Rascunho',
    textClass: 'text-slate-600',
    selectClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  enviado: {
    label: 'Enviado',
    textClass: 'text-amber-700',
    selectClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  aprovado: {
    label: 'Aprovado',
    textClass: 'text-emerald-700',
    selectClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  cancelado: {
    label: 'Cancelado',
    textClass: 'text-rose-700',
    selectClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

function createQuoteNumber(): string {
  return `OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getDefaultValidUntil(): string {
  return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

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

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminCustomerQuotes({
  customFrames,
  onOpenQuoteInManager,
  onQuotesCountChange,
}: AdminCustomerQuotesProps) {
  const allFrames = useMemo(
    () => [...customFrames, ...premiumFrames],
    [customFrames]
  );

  // Saved data
  const [quotes, setQuotes] = useState<OpticalQuote[]>([]);
  const [customers, setCustomers] = useState<CustomerSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for saved quotes
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | QuoteStatus>('todos');

  // Form state
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string>(createQuoteNumber);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;

    Promise.all([fetchQuotes(), fetchRegisteredCustomers()]).then(
      ([loadedQuotes, loadedCustomers]) => {
        if (!active) return;
        setQuotes(loadedQuotes);
        setCustomers(loadedCustomers);
        setIsLoading(false);
        onQuotesCountChange?.(loadedQuotes.length);
      }
    );

    const unsubscribe = subscribeToQuotes((updated) => {
      if (!active) return;
      setQuotes(updated);
      onQuotesCountChange?.(updated.length);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [onQuotesCountChange]);

  // Financial calculation
  const subtotal = useMemo(() => {
    return draftItems.reduce((sum, item) => {
      const fPrice = parseFloat(item.framePrice.replace(',', '.')) || 0;
      const lPrice = parseFloat(item.lensPrice.replace(',', '.')) || 0;
      return sum + fPrice + lPrice;
    }, 0);
  }, [draftItems]);

  const numericDiscount = parseFloat(discount.replace(',', '.')) || 0;
  const total = Math.max(0, subtotal - numericDiscount);

  const handleSelectRegisteredCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const found = customers.find((c) => c.id === customerId);
    if (!found) return;
    setCustomerName(found.fullName || '');
    setCustomerPhone(found.phone || (found.identifierType === 'phone' ? found.identifier : ''));
    setCustomerEmail(found.email || (found.identifierType === 'email' ? found.identifier : ''));
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
    setQuoteNumber(createQuoteNumber());
    setSelectedCustomerId('');
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

  const buildQuotePayload = (): Omit<OpticalQuote, 'id' | 'createdAt'> & { id?: string } => {
    const items: SelectedItem[] = draftItems.map((draft) => {
      const matchedFrame = allFrames.find((f) => f.id === draft.frameId);
      const framePrice = parseFloat(draft.framePrice.replace(',', '.')) || 0;
      const lensPrice = parseFloat(draft.lensPrice.replace(',', '.')) || 0;
      const treatment = LENS_TREATMENTS.find((t) => t.id === draft.treatmentId);
      const fullLensLabel = treatment ? `${draft.lensBase} + ${treatment.name}` : draft.lensBase;

      const frameObj: EyewearFrame = matchedFrame
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
          };

      return {
        frame: frameObj,
        selectedColor: draft.selectedColor.trim() || 'Preto Clássico',
        lensType: fullLensLabel,
        lensPrice,
      };
    });

    return {
      id: editingQuoteId || undefined,
      quoteNumber: quoteNumber.trim() || createQuoteNumber(),
      date: new Date().toISOString().split('T')[0],
      validUntil,
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerCpf: customerCpf.trim(),
      items,
      subtotal,
      discount: numericDiscount,
      total,
      paymentMethod,
      observations: observations.trim(),
      sellerName: sellerName.trim() || 'Administrador - Ótica Rapido',
      status,
      createdBy: 'admin',
    };
  };

  const persistCurrentQuote = async (): Promise<OpticalQuote | null> => {
    setFeedback(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe ao menos o nome e o WhatsApp do cliente para gerar o orçamento.',
      });
      return null;
    }

    if (draftItems.some((item) => !item.frameName.trim())) {
      setFeedback({
        type: 'error',
        message: 'Preencha o nome da armação em todos os itens do orçamento.',
      });
      return null;
    }

    setIsSaving(true);
    try {
      const saved = await saveQuoteRecord(buildQuotePayload());
      setFeedback({
        type: 'success',
        message: editingQuoteId
          ? `Orçamento ${saved.quoteNumber} atualizado com sucesso.`
          : `Orçamento ${saved.quoteNumber} criado para ${saved.customerName} e salvo no histórico.`,
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
    const saved = await persistCurrentQuote();
    if (saved) {
      resetForm();
      setFeedback({
        type: 'success',
        message: `Orçamento ${saved.quoteNumber} salvo para ${saved.customerName} (${formatBRL(saved.total)}).`,
      });
    }
  };

  const handleSaveAndOpenPayment = async () => {
    const saved = await persistCurrentQuote();
    if (saved) {
      onOpenQuoteInManager(saved);
    }
  };

  const handleEditQuote = (quote: OpticalQuote) => {
    setEditingQuoteId(quote.id);
    setQuoteNumber(quote.quoteNumber);
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
            frameName: it.frame.name,
            frameBrand: it.frame.brand,
            selectedColor: it.selectedColor || 'Preto Clássico',
            framePrice: String(it.frame.price || 0),
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
    setFeedback({ type: 'success', message: 'Orçamento removido da lista.' });
  };

  const buildWhatsAppUrl = (quote: OpticalQuote) => {
    const cleanPhone = quote.customerPhone.replace(/\D/g, '');
    const targetNumber =
      cleanPhone.length >= 10
        ? cleanPhone.startsWith('55')
          ? cleanPhone
          : `55${cleanPhone}`
        : '5511947069414';

    const itemsLines = quote.items
      .map(
        (item, idx) =>
          `${idx + 1}) ${item.frame.name} (${item.selectedColor}) + ${item.lensType} — ${formatBRL(
            item.frame.price + item.lensPrice
          )}`
      )
      .join('\n');

    const text =
      `*ÓTICA RAPIDO — ORÇAMENTO PERSONALIZADO*\n\n` +
      `Olá, *${quote.customerName}*! Preparamos o seu orçamento:\n\n` +
      `*Nº do Orçamento:* ${quote.quoteNumber}\n` +
      `*Validade:* até ${quote.validUntil.split('-').reverse().join('/')}\n\n` +
      `*ITENS:*\n${itemsLines}\n\n` +
      `*Subtotal:* ${formatBRL(quote.subtotal)}\n` +
      (quote.discount > 0 ? `*Desconto Especial:* - ${formatBRL(quote.discount)}\n` : '') +
      `*TOTAL:* ${formatBRL(quote.total)}\n` +
      `*Condição sugerida:* ${quote.paymentMethod}\n` +
      `*Responsável:* ${quote.sellerName}\n\n` +
      `Responda esta mensagem para aprovar ou solicitar seu link de pagamento / Pix.`;

    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
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
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORMULÁRIO DE ORÇAMENTO PARA CLIENTE (7 COLS) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-slate-900 text-gold-400 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-slate-900">
                  {editingQuoteId ? `Editando Orçamento ${quoteNumber}` : 'Novo Orçamento para Cliente'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Monte propostas sob medida, salve no banco e envie por WhatsApp ou Cobrança Pix/Link
                </p>
              </div>
            </div>

            {editingQuoteId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Cancelar Edição
              </button>
            )}
          </div>

          {/* 1. DADOS DO CLIENTE */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gold-600" />
                1. Identificação do Cliente
              </h4>

              {customers.length > 0 && (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectRegisteredCustomer(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-gold-500 outline-none max-w-full sm:max-w-[260px]"
                >
                  <option value="">Preencher de cliente cadastrado ({customers.length})...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || 'Cliente'} — {c.phone || c.email || c.identifier}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">CPF (Opcional)</label>
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

          {/* 2. ITENS DO ORÇAMENTO (ARMAÇÃO + LENTES) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Glasses className="h-3.5 w-3.5 text-gold-600" />
                2. Armações e Lentes ({draftItems.length})
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Óculos
              </button>
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
                        Item {idx + 1}
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
                                  {f.name} ({f.brand}) {f.price > 0 ? `— ${formatBRL(f.price)}` : ''}
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
                          required
                          value={item.frameName}
                          onChange={(e) =>
                            handleUpdateDraftItem(item.id, { frameName: e.target.value })
                          }
                          placeholder="Ex: Armação Acetato Quadrado"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Cor / Acabamento
                        </label>
                        {selectedFrameObj && selectedFrameObj.colors.length > 0 ? (
                          <select
                            value={item.selectedColor}
                            onChange={(e) =>
                              handleUpdateDraftItem(item.id, { selectedColor: e.target.value })
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
                              handleUpdateDraftItem(item.id, { selectedColor: e.target.value })
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70">
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
                              {t.name} (+{formatBRL(t.suggestedPriceAddon)})
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

          {/* 3. CONDIÇÕES COMERCIAIS E FECHAMENTO */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900">
              3. Condições Comerciais e Validade
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Desconto (R$)
                </label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Inicial
                </label>
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

          {/* RESUMO FINANCEIRO */}
          <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <span>Subtotal: <strong className="font-mono tabular-nums text-slate-200">{formatBRL(subtotal)}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Desconto: <strong className="font-mono tabular-nums text-emerald-400">- {formatBRL(numericDiscount)}</strong></span>
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

          {/* AÇÕES PRINCIPAIS */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 px-5 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
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
              onClick={handleSaveAndOpenPayment}
              className="py-3.5 px-5 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-slate-950 font-display font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="h-4 w-4" />
              Salvar e Gerar Pix / PDF
            </button>
          </div>
        </form>

        {/* LISTA DE ORÇAMENTOS DE CLIENTES (5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-black text-base text-slate-900">
                Orçamentos Emitidos ({quotes.length})
              </h3>
              <span className="font-mono tabular-nums text-xs font-bold text-slate-700">
                {formatBRL(totalPipelineValue)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Histórico em tempo real para envio no WhatsApp, cobrança Pix ou edição
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
              <p className="text-xs font-bold text-slate-700">
                {quotes.length === 0
                  ? 'Nenhum orçamento criado no painel ainda'
                  : 'Nenhum orçamento encontrado para este filtro'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {quotes.length === 0
                  ? 'Preencha o formulário ao lado para criar o primeiro orçamento de cliente.'
                  : 'Limpe a busca ou altere o filtro de status acima.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[760px] pr-1">
              {filteredQuotes.map((q) => {
                const currentStatus: QuoteStatus = q.status || 'rascunho';
                const statusInfo = STATUS_META[currentStatus];
                const isEditingThis = editingQuoteId === q.id;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition-colors space-y-3 ${
                      isEditingThis
                        ? 'bg-amber-50/40 border-gold-400'
                        : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                          <span className="font-bold text-slate-800">{q.quoteNumber}</span>
                          <span aria-hidden="true">·</span>
                          <span>{q.date.split('-').reverse().join('/')}</span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-slate-900 truncate mt-0.5">
                          {q.customerName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {q.customerPhone}
                          {q.customerEmail ? ` · ${q.customerEmail}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block font-mono tabular-nums font-bold text-sm text-slate-950">
                          {formatBRL(q.total)}
                        </span>
                        <select
                          aria-label={`Status do orçamento ${q.quoteNumber}`}
                          value={currentStatus}
                          onChange={(e) =>
                            handleChangeQuoteStatus(q.id, e.target.value as QuoteStatus)
                          }
                          className={`mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md border outline-none cursor-pointer ${statusInfo.selectClass}`}
                        >
                          <option value="rascunho">Rascunho</option>
                          <option value="enviado">Enviado</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>

                    {q.items.length > 0 && (
                      <div className="text-[11px] text-slate-600 border-t border-slate-200/60 pt-2 space-y-0.5">
                        {q.items.map((it, i) => (
                          <p key={i} className="truncate">
                            <span className="font-semibold text-slate-800">{it.frame.name}</span>
                            <span className="text-slate-400"> · </span>
                            <span>{it.lensType}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenQuoteInManager(q)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Pix / PDF
                      </button>

                      <a
                        href={buildWhatsAppUrl(q)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (currentStatus === 'rascunho') {
                            void handleChangeQuoteStatus(q.id, 'enviado');
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <MessageSquare className="h-3 w-3" />
                        WhatsApp
                      </a>

                      <button
                        type="button"
                        onClick={() => handleEditQuote(q)}
                        title="Editar orçamento"
                        className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuote(q.id)}
                        title="Excluir orçamento"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
