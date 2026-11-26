import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  SlidersHorizontal,
  RefreshCw,
  UserCheck,
  Glasses,
} from 'lucide-react';
import { AdminAuthStatus, AdminSession } from '../types';
import {
  fetchAdminAuthStatus,
  loginAdmin,
  setupInitialAdmin,
} from '../services/adminAuthService';

interface AdminLoginSectionProps {
  adminSession: AdminSession | null;
  accessNotice?: string | null;
  onAuthenticated: (session: AdminSession, token: string) => void;
  onLogoutAdmin: () => void;
  onEnterAdminPanel: () => void;
  onNavigateToCatalog: () => void;
}

export default function AdminLoginSection({
  adminSession,
  accessNotice,
  onAuthenticated,
  onLogoutAdmin,
  onEnterAdminPanel,
  onNavigateToCatalog,
}: AdminLoginSectionProps) {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [email, setEmail] = useState('admin@oticarapido.com.br');
  const [adminName, setAdminName] = useState('Administrador Ótica Rapido');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingStatus(true);
    fetchAdminAuthStatus()
      .then((status) => {
        if (!active) return;
        setAuthStatus(status);
        if (status.expectedEmailHint) {
          setEmail(status.expectedEmailHint);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Não foi possível verificar o serviço de autenticação administrativa.'
        );
      })
      .finally(() => {
        if (active) setIsLoadingStatus(false);
      });

    return () => {
      active = false;
    };
  }, [adminSession]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setErrorMsg('A senha de administrador deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('A confirmação da senha não confere.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { admin, token } = await setupInitialAdmin({
        email: email.trim(),
        name: adminName.trim() || 'Administrador Ótica Rapido',
        password,
      });
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg('Acesso administrativo configurado e autenticado com sucesso.');
      onAuthenticated(admin, token);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao configurar o acesso administrativo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Informe o e-mail e a senha administrativa.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { admin, token } = await loginAdmin({
        email: email.trim(),
        password,
      });
      setPassword('');
      setSuccessMsg('Login administrativo verificado com sucesso.');
      onAuthenticated(admin, token);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Credenciais administrativas inválidas.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto text-left space-y-6">
      {/* Header Banner */}
      <div className="bg-sapphire-950 text-white rounded-3xl p-6 md:p-10 border border-sapphire-900 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-gold-400 font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Controle de Acesso &amp; Permissões ADM
            </p>
            <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight text-white">
              Área Administrativa · Ótica Rapido
            </h2>
            <p className="font-sans text-slate-300 text-xs md:text-sm mt-2 max-w-2xl leading-relaxed">
              Somente administradores autenticados podem cadastrar armações, alterar preços individuais do catálogo, gerenciar orçamentos de clientes e emitir recibos oficiais.
            </p>
          </div>
          {adminSession && (
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 px-4 py-2.5 rounded-2xl flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                  Sessão ADM Ativa
                </p>
                <p className="text-xs font-semibold text-white">{adminSession.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restricted route alert */}
      {accessNotice && !adminSession && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 text-xs font-medium shadow-xs">
          <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Acesso protegido por permissão de ADM</p>
            <p className="text-amber-800 mt-0.5">{accessNotice}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Authenticated ADM Dashboard Shortcut */}
      {adminSession ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sapphire-950 text-gold-400 flex items-center justify-center">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-slate-900">
                  {adminSession.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {adminSession.email} · Permissão: ADM Total
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="px-4 py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer w-fit"
            >
              <LogOut className="h-4 w-4" />
              Encerrar Sessão ADM
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gold-700 font-bold">
                Catálogo &amp; Preços
              </span>
              <p className="text-xs font-bold text-slate-900">Edição Individual Liberada</p>
              <p className="text-[11px] text-slate-500">
                Cadastre novas armações e ajuste o valor individual de cada modelo a partir de R$ 120,00.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gold-700 font-bold">
                Orçamentos &amp; Descontos
              </span>
              <p className="text-xs font-bold text-slate-900">Gestão Completa de Clientes</p>
              <p className="text-[11px] text-slate-500">
                Crie propostas personalizadas, aplique descontos e gerencie status dos orçamentos.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gold-700 font-bold">
                Recibos &amp; Faturamento
              </span>
              <p className="text-xs font-bold text-slate-900">Emissão Oficial Liberada</p>
              <p className="text-[11px] text-slate-500">
                Acesso exclusivo à aba de Recibos de Pagamento e edição livre de valores comerciais.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onEnterAdminPanel}
              className="px-6 py-3 bg-sapphire-950 hover:bg-sapphire-900 text-gold-400 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Abrir Painel Administrativo (/admin)
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="px-5 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Glasses className="h-4 w-4 text-gold-600" />
              Ver Vitrine do Catálogo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Login / First-run Setup Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
            {isLoadingStatus ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin text-gold-600" />
                <span>Verificando política de autenticação administrativa...</span>
              </div>
            ) : authStatus?.requiresSetup ? (
              <form onSubmit={handleSetupSubmit} className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                    Configuração Inicial (1º Acesso)
                  </span>
                  <h3 className="font-display font-black text-xl text-slate-900">
                    Definir Credenciais de Administrador
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Nenhuma senha ADM foi definida ainda neste servidor. Crie abaixo a credencial principal de administrador (ou defina <code className="font-mono text-slate-700">ADMIN_EMAIL</code> e <code className="font-mono text-slate-700">ADMIN_PASSCODE</code> nas variáveis de ambiente da Vercel/Secrets).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nome do Administrador
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ex: Maria Brito - Diretoria"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    E-mail de Acesso ADM *
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@oticarapido.com.br"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Criar Senha ADM (mín. 8 caracteres) *
                    </label>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Mostrar ou ocultar senha"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Confirmar Senha ADM *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Configurando acesso ADM...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Salvar Credenciais e Entrar no Painel ADM
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                    <Lock className="h-3 w-3 text-gold-600" />
                    Autenticação Obrigatória
                  </span>
                  <h3 className="font-display font-black text-xl text-slate-900">
                    Entrar como Administrador (ADM)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Informe suas credenciais administrativas verificadas no servidor para desbloquear o painel de gestão e edição de preços.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    E-mail do Administrador *
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@oticarapido.com.br"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Senha Administrativa *
                  </label>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha de ADM"
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Verificando permissões...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Entrar no Painel Administrativo
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Permissions Matrix Card */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
            <h4 className="font-display font-bold text-base text-gold-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Regras de Permissão do Sistema
            </h4>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Clientes (Acesso Público):</strong> podem navegar no catálogo com preços oficiais fixos, enviar receitas, agendar visitas e solicitar orçamentos sem alterar valores.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Administrador (ADM Autenticado):</strong> acesso exclusivo ao <code className="font-mono text-gold-300">/admin</code>, cadastro de armações, edição individual de preços (a partir de R$ 120,00), gestão de orçamentos, descontos e emissão de recibos.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Proteção de Rotas:</strong> links diretos para áreas administrativas bloqueiam automaticamente usuários não autenticados.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
