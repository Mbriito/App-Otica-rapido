import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Search,
  MessageSquare,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ArrowUpRight,
  Glasses,
  Eye,
} from 'lucide-react';
import { OpticalQuote, QuoteStatus } from '../types';
import {
  deleteQuoteRecord,
  fetchQuotes,
  subscribeToQuotes,
  updateQuoteStatus,
} from '../services/supabaseService';
import {
  buildQuoteSummaryText,
  buildQuoteWhatsAppUrl,
  formatBRL,
  formatDateBR,
  getEffectivePrescription,
  getQuoteModalityLabel,
  isQuoteWithFrame,
} from '../utils/quoteUtils';

interface AdminCustomerQuotesProps {
  adminToken: string;
  onOpenQuoteInManager: (quote: OpticalQuote) => void;
  onCreateNewQuoteInManager: () => void;
  onQuotesCountChange?: (count: number) => void;
}

const STATUS_META: Record<QuoteStatus, { label: string; selectClass: string }> = {
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

export default function AdminCustomerQuotes({
  adminToken,
  onOpenQuoteInManager,
  onCreateNewQuoteInManager,
  onQuotesCountChange,
}: AdminCustomerQuotesProps) {
  const [quotes, setQuotes] = useState<OpticalQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | QuoteStatus>('todos');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;

    fetchQuotes().then((loadedQuotes) => {
      if (!active) return;
      setQuotes(loadedQuotes);
      setIsLoading(false);
      onQuotesCountChange?.(loadedQuotes.length);
    });

    const unsubQuotes = subscribeToQuotes((updated) => {
      if (!active) return;
      setQuotes(updated);
      onQuotesCountChange?.(updated.length);
    });

    return () => {
      active = false;
      unsubQuotes();
    };
  }, [onQuotesCountChange]);

  const metrics = useMemo(() => {
    const counts = {
      total: quotes.length,
      rascunho: 0,
      enviado: 0,
      aprovado: 0,
      cancelado: 0,
      approvedValue: 0,
    };
    for (const q of quotes) {
      const st: QuoteStatus = q.status || 'rascunho';
      counts[st] += 1;
      if (st === 'aprovado') {
        counts.approvedValue += Number(q.total) || 0;
      }
    }
    return counts;
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return quotes.filter((q) => {
      const st = q.status || 'rascunho';
      const matchStatus = statusFilter === 'todos' || st === statusFilter;
      if (!matchStatus) return false;
      if (!query) return true;
      return (
        q.customerName.toLowerCase().includes(query) ||
        q.quoteNumber.toLowerCase().includes(query) ||
        (q.customerPhone || '').toLowerCase().includes(query) ||
        (q.customerEmail || '').toLowerCase().includes(query)
      );
    });
  }, [quotes, searchTerm, statusFilter]);

  const handleStatusChange = async (quoteId: string, nextStatus: QuoteStatus) => {
    setFeedback(null);
    try {
      await updateQuoteStatus(quoteId, nextStatus, adminToken);
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: nextStatus } : q))
      );
      setFeedback({
        type: 'success',
        message: `Status atualizado para "${STATUS_META[nextStatus].label}".`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Não foi possível atualizar o status do orçamento.',
      });
    }
  };

  const handleDelete = async (quote: OpticalQuote) => {
    setFeedback(null);
    try {
      await deleteQuoteRecord(quote.id, adminToken);
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
      setFeedback({
        type: 'success',
        message: `Orçamento ${quote.quoteNumber} removido do histórico.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Não foi possível excluir o orçamento.',
      });
    }
  };

  const handleCopySummary = (quote: OpticalQuote) => {
    const text = buildQuoteSummaryText(quote);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedQuoteId(quote.id);
        setTimeout(() => setCopiedQuoteId(null), 2200);
      })
      .catch(() => {
        setCopiedQuoteId(quote.id);
        setTimeout(() => setCopiedQuoteId(null), 2200);
      });
  };

  return (
    <div className="space-y-6 text-left">
      {/* Unified Header + Action to Centralized Quote Editor */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="font-display font-black text-xl text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold-600" />
              Gestão de Orçamentos Salvos (ADM)
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              A criação e edição de orçamentos foi unificada na <strong>Central de Orçamentos</strong> (com preços, descontos, PDF e WhatsApp liberados para ADM). Aqui você acompanha status, aprovações e histórico completo.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNewQuoteInManager}
            className="px-5 py-3 bg-sapphire-950 hover:bg-sapphire-900 text-gold-400 rounded-xl font-sans text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Orçamento na Central</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pipeline Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
              Total
            </span>
            <span className="font-mono text-xl font-black text-slate-900 tabular-nums">
              {metrics.total}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
              Rascunhos
            </span>
            <span className="font-mono text-xl font-black text-slate-700 tabular-nums">
              {metrics.rascunho}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
            <span className="block text-[10px] font-mono uppercase text-amber-800 font-bold">
              Enviados
            </span>
            <span className="font-mono text-xl font-black text-amber-900 tabular-nums">
              {metrics.enviado}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="block text-[10px] font-mono uppercase text-emerald-800 font-bold">
              Aprovados
            </span>
            <span className="font-mono text-xl font-black text-emerald-900 tabular-nums">
              {metrics.aprovado}
            </span>
          </div>
          <div className="col-span-2 md:col-span-1 p-3.5 rounded-2xl bg-sapphire-950 text-white border border-sapphire-900">
            <span className="block text-[10px] font-mono uppercase text-gold-400 font-bold">
              Total Aprovado
            </span>
            <span className="font-mono text-base font-black text-white tabular-nums">
              {formatBRL(metrics.approvedValue)}
            </span>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-grow max-w-md">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nº do orçamento, cliente ou WhatsApp..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'rascunho', label: 'Rascunho' },
                { id: 'enviado', label: 'Enviado' },
                { id: 'aprovado', label: 'Aprovado' },
                { id: 'cancelado', label: 'Cancelado' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === opt.id
                    ? 'bg-slate-900 text-gold-400'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Quotes List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-gold-500" />
            Carregando orçamentos salvos...
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              {quotes.length === 0
                ? 'Nenhum orçamento salvo ainda'
                : 'Nenhum orçamento encontrado com os filtros aplicados'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 mb-4">
              Clique abaixo para abrir a Central de Orçamentos e gerar uma nova proposta com ou sem armação.
            </p>
            <button
              type="button"
              onClick={onCreateNewQuoteInManager}
              className="px-4 py-2 bg-sapphire-950 hover:bg-sapphire-900 text-gold-400 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar Primeiro Orçamento
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map((quote) => {
              const withFrame = isQuoteWithFrame(quote);
              const rx = getEffectivePrescription(quote);
              const currentStatus: QuoteStatus = quote.status || 'rascunho';

              return (
                <div
                  key={quote.id}
                  className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl hover:border-gold-300 transition-colors space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900">
                          {quote.quoteNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            withFrame
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {withFrame ? (
                            <Glasses className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          {getQuoteModalityLabel(withFrame)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Criado em {formatDateBR(quote.date)} · Válido até{' '}
                          {formatDateBR(quote.validUntil)}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-sm text-slate-900 truncate">
                        {quote.customerName}
                        {quote.customerPhone ? (
                          <span className="font-mono text-xs font-normal text-slate-500 ml-2">
                            {quote.customerPhone}
                          </span>
                        ) : null}
                      </h4>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        {quote.items.map((item, idx) => (
                          <p key={idx} className="truncate">
                            {idx + 1}.{' '}
                            {withFrame
                              ? `${item.frame.name} (${item.selectedColor}) + ${item.lensType}`
                              : `${item.lensType} (Armação própria)`}
                          </p>
                        ))}
                        {rx && (
                          <p className="font-mono text-[10px] text-slate-500">
                            Receita: OD {rx.od.spherical}/{rx.od.cylindrical} ({rx.od.axis}°) · OE{' '}
                            {rx.oe.spherical}/{rx.oe.cylindrical} ({rx.oe.axis}°)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 flex-shrink-0">
                      <div className="text-left md:text-right">
                        <span className="block font-mono text-base font-black text-emerald-900 tabular-nums">
                          {formatBRL(quote.total)}
                        </span>
                        {quote.discount > 0 && (
                          <span className="block text-[10px] font-mono text-slate-500">
                            Desc.: -{formatBRL(quote.discount)}
                          </span>
                        )}
                      </div>

                      <select
                        aria-label={`Status do orçamento ${quote.quoteNumber}`}
                        value={currentStatus}
                        onChange={(e) =>
                          void handleStatusChange(quote.id, e.target.value as QuoteStatus)
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border outline-none cursor-pointer ${STATUS_META[currentStatus].selectClass}`}
                      >
                        <option value="rascunho">Rascunho</option>
                        <option value="enviado">Enviado</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => onOpenQuoteInManager(quote)}
                      className="px-3 py-1.5 bg-sapphire-950 hover:bg-sapphire-900 text-gold-400 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Abrir / Editar / PDF na Central</span>
                    </button>

                    <a
                      href={buildQuoteWhatsAppUrl(quote)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopySummary(quote)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedQuoteId === quote.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Resumo</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(quote)}
                      title="Excluir orçamento"
                      className="ml-auto px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
