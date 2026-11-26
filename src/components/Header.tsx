import React from 'react';
import {
  Glasses,
  Receipt,
  FileText,
  Home,
  Calendar,
  UserCheck,
  LogOut,
  SlidersHorizontal,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { AdminSession, CustomerSession } from '../types';

interface HeaderProps {
  activeSection: string;
  setActiveSection: (sec: string) => void;
  customerSession: CustomerSession | null;
  adminSession: AdminSession | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onLogoutAdmin: () => void;
}

export default function Header({
  activeSection,
  setActiveSection,
  customerSession,
  adminSession,
  onOpenLogin,
  onLogout,
  onLogoutAdmin,
}: HeaderProps) {
  const navItems = [
    { id: 'home', label: 'Início', mobileLabel: 'Início', icon: Home },
    { id: 'catalog', label: 'Catálogo', mobileLabel: 'Catálogo', icon: Glasses },
    { id: 'prescription', label: 'Receita', mobileLabel: 'Receita', icon: FileText },
    { id: 'appointments', label: 'Visita em Casa', mobileLabel: 'Visita', icon: Calendar },
    { id: 'quotes', label: 'Orçamentos', mobileLabel: 'Orçamentos', icon: Receipt },
  ];

  const customerLabel = customerSession
    ? customerSession.fullName?.split(' ')[0] ||
      customerSession.phone ||
      customerSession.email?.split('@')[0] ||
      'Minha Conta'
    : 'Identificar-se';

  const isAdminActive = activeSection === 'admin' || activeSection === 'admin-login';

  return (
    <header className="sticky top-0 z-50 bg-slate-950 border-b border-slate-900 shadow-xl backdrop-blur-md bg-opacity-95 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">
          {/* Logo Brand */}
          <button
            type="button"
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 text-left"
            onClick={() => setActiveSection('home')}
          >
            <Glasses className="h-8 w-8 text-gold-400" />
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-bold tracking-widest text-white leading-none">
                ÓTICA <span className="text-gold-400 font-light">RAPIDO</span>
              </h1>
              <p className="font-mono text-[9px] uppercase tracking-widest text-gold-500 mt-1 hidden sm:block">
                Ótica Online &amp; a Domicílio
              </p>
            </div>
          </button>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Navegação principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-sans text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gold-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Customer Identification + Admin Login/Panel */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {customerSession ? (
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <UserCheck className="h-3.5 w-3.5 text-gold-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-white max-w-[100px] truncate">
                  {customerLabel}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Encerrar identificação"
                  className="ml-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-gold-400 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Identificar-se</span>
              </button>
            )}

            {adminSession ? (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('admin')}
                  title="Abrir Painel Administrativo (/admin)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    activeSection === 'admin'
                      ? 'bg-gold-500 text-slate-950 border-gold-500'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70 hover:bg-emerald-900/80'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Painel ADM</span>
                </button>
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  title="Sair do modo ADM"
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSection('admin-login')}
                title="Login Administrativo (ADM)"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                  isAdminActive
                    ? 'bg-gold-500 text-slate-950 border-gold-500 font-bold'
                    : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Login ADM</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet nav indicator bar */}
      <div className="lg:hidden flex items-center justify-around bg-slate-900 border-t border-slate-800 py-2.5 px-2 overflow-x-auto gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-sans font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive ? 'text-gold-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setActiveSection(adminSession ? 'admin' : 'admin-login')}
          className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-sans font-medium transition-all whitespace-nowrap cursor-pointer ${
            isAdminActive
              ? 'text-gold-400 font-semibold'
              : adminSession
                ? 'text-emerald-400'
                : 'text-slate-400'
          }`}
        >
          {adminSession ? (
            <SlidersHorizontal className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          <span>{adminSession ? 'ADM' : 'Login ADM'}</span>
        </button>
      </div>
    </header>
  );
}
