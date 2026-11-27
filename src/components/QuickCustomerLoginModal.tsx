import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { CustomerSession } from '../types';
import { identifyOrRegisterCustomer } from '../services/supabaseService';

interface QuickCustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (session: CustomerSession) => void;
  onOpenLgpdPolicy: () => void;
}

export default function QuickCustomerLoginModal({
  isOpen,
  onClose,
  onAuthenticated,
  onOpenLgpdPolicy,
}: QuickCustomerLoginModalProps) {
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatBrazilPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleIdentifierChange = (val: string) => {
    setError(null);
    if (method === 'phone') {
      setIdentifier(formatBrazilPhone(val));
    } else {
      setIdentifier(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (method === 'phone') {
      const digits = identifier.replace(/\D/g, '');
      if (digits.length < 10) {
        setError('Informe um WhatsApp válido com DDD (ex: (11) 94706-9414).');
        return;
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
        setError('Informe um endereço de e-mail válido.');
        return;
      }
    }

    if (!lgpdConsent) {
      setError('Para sua segurança, confirme a autorização de tratamento de dados (LGPD).');
      return;
    }

    setIsSubmitting(true);
    try {
      const { session } = await identifyOrRegisterCustomer({
        identifierRaw: identifier,
        identifierType: method,
        fullName,
        lgpdConsent,
      });
      onAuthenticated(session);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível identificar sua conta. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-left">
        {/* Header */}
        <div className="bg-sapphire-950 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar identificação"
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/15 border border-gold-400/30 font-mono text-[10px] text-gold-400 font-bold uppercase tracking-wider mb-3">
            <Sparkles className="h-3 w-3" /> Acesso Rápido Sem Senha
          </span>
          <h3 className="font-display font-black text-xl text-white">
            Identifique-se na Ótica Rapido
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Use apenas seu WhatsApp ou E-mail para salvar suas receitas, orçamentos e agendamentos com segurança.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Method Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMethod('phone');
                setIdentifier('');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                method === 'phone'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod('email');
                setIdentifier('');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                method === 'email'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="h-3.5 w-3.5 text-gold-600" />
              E-mail
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {method === 'phone' ? 'Número do WhatsApp (com DDD) *' : 'Seu E-mail *'}
            </label>
            <input
              type={method === 'phone' ? 'tel' : 'email'}
              required
              autoFocus
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              placeholder={method === 'phone' ? '(11) 99999-9999' : 'voce@exemplo.com'}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Seu Nome (Opcional no retorno)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Maria Oliveira"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>

          {/* LGPD Consent */}
          <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={lgpdConsent}
              onChange={(e) => setLgpdConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sapphire-900 focus:ring-gold-500"
            />
            <span className="text-[11px] text-slate-600 leading-relaxed">
              Concordo com o tratamento dos meus dados exclusivamente para atendimento óptico e guarda segura de receitas conforme a{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLgpdPolicy();
                }}
                className="text-gold-700 font-bold underline cursor-pointer"
              >
                Política LGPD
              </button>
              .
            </span>
          </label>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validando acesso...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                Entrar / Continuar Atendimento
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Sessão segura sem necessidade de criar senha</span>
          </div>
        </form>
      </div>
    </div>
  );
}
