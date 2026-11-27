import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HomePresentation from './components/HomePresentation';
import Catalog from './components/Catalog';
import PrescriptionUpload from './components/PrescriptionUpload';
import QuoteReceiptManager from './components/QuoteReceiptManager';
import PrivacyPolicyLGPD from './components/PrivacyPolicyLGPD';
import AdminFramesPanel from './components/AdminFramesPanel';
import AdminLoginSection from './components/AdminLoginSection';
import HomeVisitScheduler from './components/HomeVisitScheduler';
import QuickCustomerLoginModal from './components/QuickCustomerLoginModal';
import PaulistaLocationMap from './components/PaulistaLocationMap';
import {
  AdminSession,
  CustomerSession,
  EyewearFrame,
  MedicalPrescription,
  OpticalQuote,
} from './types';
import {
  clearCustomerSession,
  getStoredCustomerSession,
} from './services/supabaseService';
import { logoutAdmin } from './services/adminAuthService';
import {
  Glasses,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Lock,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';

function resolveSectionFromPath(pathname: string): string {
  const path = pathname.toLowerCase();
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/login-adm' || path === '/admin-login') return 'admin-login';
  if (path === '/agendamento') return 'appointments';
  if (path === '/catalogo') return 'catalog';
  if (path === '/receita') return 'prescription';
  if (path === '/orcamentos') return 'quotes';
  if (path === '/lgpd') return 'lgpd';
  return 'home';
}

function resolveInitialSection(): string {
  if (typeof window !== 'undefined') {
    return resolveSectionFromPath(window.location.pathname);
  }
  return 'home';
}

export default function App() {
  const initialRequestedSection = resolveInitialSection();
  const [activeSection, setActiveSection] = useState<string>(() =>
    initialRequestedSection === 'admin' ? 'admin-login' : initialRequestedSection
  );

  // Admin session held strictly in React/JS memory (never in localStorage/sessionStorage)
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [pendingAdminRedirect, setPendingAdminRedirect] = useState<boolean>(
    initialRequestedSection === 'admin'
  );
  const [adminAccessNotice, setAdminAccessNotice] = useState<string | null>(() =>
    initialRequestedSection === 'admin'
      ? 'A rota /admin exige autenticação de Administrador (ADM). Faça login abaixo para continuar.'
      : null
  );

  // Customer passwordless session state
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(() =>
    getStoredCustomerSession()
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const isAdminAuthenticated = Boolean(adminSession && adminToken && adminSession.role === 'admin');

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Cross-component states
  const [lastSelectedFrame, setLastSelectedFrame] = useState<EyewearFrame | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedLensType, setSelectedLensType] = useState<string>('');
  const [selectedLensPrice, setSelectedLensPrice] = useState<number>(0);
  const [linkedPrescription, setLinkedPrescription] = useState<MedicalPrescription | undefined>(
    undefined
  );
  const [loadedAdminQuote, setLoadedAdminQuote] = useState<OpticalQuote | undefined>(undefined);
  const [newQuoteRequestId, setNewQuoteRequestId] = useState<number>(0);
  const [catalogSelectionId, setCatalogSelectionId] = useState<number>(0);

  // Sync URL path when navigating across all sections (with strict ADM route protection)
  const navigateToSection = (section: string, notice?: string) => {
    let targetSection = section;

    if (section === 'admin' && !isAdminAuthenticated) {
      targetSection = 'admin-login';
      setPendingAdminRedirect(true);
      setAdminAccessNotice(
        notice ||
          'Acesso restrito: faça login como ADM para acessar o Painel Administrativo (/admin).'
      );
    } else if (section === 'admin-login') {
      setAdminAccessNotice(notice || null);
    } else {
      setAdminAccessNotice(null);
    }

    setActiveSection(targetSection);
    if (typeof window !== 'undefined') {
      const routeMap: Record<string, string> = {
        home: '/',
        catalog: '/catalogo',
        prescription: '/receita',
        appointments: '/agendamento',
        quotes: '/orcamentos',
        lgpd: '/lgpd',
        admin: '/admin',
        'admin-login': '/login-adm',
      };
      const targetPath = routeMap[targetSection] || '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ section: targetSection }, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const requested = resolveInitialSection();
      if (requested === 'admin' && !isAdminAuthenticated) {
        setPendingAdminRedirect(true);
        setAdminAccessNotice(
          'A rota /admin exige permissão de ADM. Autentique-se abaixo para continuar.'
        );
        setActiveSection('admin-login');
        if (window.location.pathname !== '/login-adm') {
          window.history.replaceState({ section: 'admin-login' }, '', '/login-adm');
        }
        return;
      }
      setActiveSection(requested);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdminAuthenticated]);

  const handleAdminAuthenticated = (session: AdminSession, token: string) => {
    setAdminSession(session);
    setAdminToken(token);
    setAdminAccessNotice(null);

    if (pendingAdminRedirect || activeSection === 'admin-login' || activeSection === 'admin') {
      setPendingAdminRedirect(false);
      setActiveSection('admin');
      if (typeof window !== 'undefined' && window.location.pathname !== '/admin') {
        window.history.pushState({ section: 'admin' }, '', '/admin');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogoutAdmin = async () => {
    await logoutAdmin();
    setAdminSession(null);
    setAdminToken(null);
    setPendingAdminRedirect(false);
    if (activeSection === 'admin') {
      setAdminAccessNotice('Sessão administrativa encerrada com segurança.');
      setActiveSection('admin-login');
      if (typeof window !== 'undefined') {
        window.history.pushState({ section: 'admin-login' }, '', '/login-adm');
      }
    }
  };

  // When a user selects a frame and lens in the store/catalog
  const handleSelectFrameForQuote = (
    frame: EyewearFrame,
    color: string,
    lensType: string,
    lensPrice: number
  ) => {
    setLoadedAdminQuote(undefined);
    setLastSelectedFrame(frame);
    setSelectedColor(color);
    setSelectedLensType(lensType);
    setSelectedLensPrice(lensPrice);
    setCatalogSelectionId((prev) => prev + 1);
    navigateToSection('quotes');
  };

  // When Admin opens a customer quote directly in the Quotes/Billing manager
  const handleOpenAdminQuoteInManager = (quote: OpticalQuote) => {
    if (!isAdminAuthenticated) {
      navigateToSection('admin-login', 'Faça login como ADM para editar orçamentos administrativos.');
      return;
    }
    setLastSelectedFrame(undefined);
    setLoadedAdminQuote(quote);
    navigateToSection('quotes');
  };

  // When Admin starts a brand-new quote from /admin -> centralized QuoteReceiptManager
  const handleCreateNewAdminQuoteInManager = () => {
    if (!isAdminAuthenticated) {
      navigateToSection('admin-login', 'Faça login como ADM para criar orçamentos administrativos.');
      return;
    }
    setLastSelectedFrame(undefined);
    setLoadedAdminQuote(undefined);
    setNewQuoteRequestId((prev) => prev + 1);
    navigateToSection('quotes');
  };

  // When a user uploads or saves a medical prescription and chooses to use it in Quotes
  const handlePrescriptionAdded = (prescription: MedicalPrescription) => {
    setLoadedAdminQuote(undefined);
    setLinkedPrescription(prescription);
    navigateToSection('quotes');
  };

  const handleLogoutCustomer = () => {
    clearCustomerSession();
    setCustomerSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans transition-all selection:bg-gold-200">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm print:hidden">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Premium Header */}
      <Header
        activeSection={activeSection}
        setActiveSection={navigateToSection}
        customerSession={customerSession}
        adminSession={adminSession}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogoutCustomer}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full print:max-w-none print:p-0">
        {activeSection === 'home' && <HomePresentation onNavigate={navigateToSection} />}

        {activeSection === 'catalog' && (
          <Catalog
            onSelectFrameForQuote={handleSelectFrameForQuote}
            onNavigateToPrescription={() => navigateToSection('prescription')}
          />
        )}

        {activeSection === 'prescription' && (
          <PrescriptionUpload
            onPrescriptionAdded={handlePrescriptionAdded}
            onPrescriptionSaved={(rx) => setLinkedPrescription(rx)}
            customerSession={customerSession}
            isAdmin={isAdminAuthenticated}
            onRequestLogin={() => setIsLoginModalOpen(true)}
            onOpenLgpdPolicy={() => navigateToSection('lgpd')}
          />
        )}

        {activeSection === 'appointments' && (
          <HomeVisitScheduler
            customerSession={customerSession}
            onRequestLogin={() => setIsLoginModalOpen(true)}
            onOpenLgpdPolicy={() => navigateToSection('lgpd')}
          />
        )}

        {activeSection === 'quotes' && (
          <QuoteReceiptManager
            lastSelectedFrame={lastSelectedFrame}
            catalogSelectionId={catalogSelectionId}
            selectedColor={selectedColor}
            selectedLensType={selectedLensType}
            selectedLensPrice={selectedLensPrice}
            linkedPrescription={linkedPrescription}
            customerSession={customerSession}
            initialQuote={loadedAdminQuote}
            newQuoteRequestId={newQuoteRequestId}
            isAdmin={isAdminAuthenticated}
            onRequireAdminLogin={(reason) => navigateToSection('admin-login', reason)}
            onNavigateToPrescription={() => navigateToSection('prescription')}
            onBackToAdmin={isAdminAuthenticated ? () => navigateToSection('admin') : undefined}
          />
        )}

        {activeSection === 'lgpd' && (
          <PrivacyPolicyLGPD
            onNavigateHome={() => navigateToSection('home')}
            onNavigateToPrescription={() => navigateToSection('prescription')}
          />
        )}

        {activeSection === 'admin-login' && (
          <AdminLoginSection
            adminSession={adminSession}
            accessNotice={adminAccessNotice}
            onAuthenticated={handleAdminAuthenticated}
            onLogoutAdmin={handleLogoutAdmin}
            onEnterAdminPanel={() => navigateToSection('admin')}
            onNavigateToCatalog={() => navigateToSection('catalog')}
          />
        )}

        {activeSection === 'admin' &&
          (isAdminAuthenticated && adminSession && adminToken ? (
            <AdminFramesPanel
              adminSession={adminSession}
              adminToken={adminToken}
              onLogoutAdmin={handleLogoutAdmin}
              onNavigateToCatalog={() => navigateToSection('catalog')}
              onOpenQuoteInManager={handleOpenAdminQuoteInManager}
              onCreateNewQuoteInManager={handleCreateNewAdminQuoteInManager}
            />
          ) : (
            <AdminLoginSection
              adminSession={null}
              accessNotice={
                adminAccessNotice ||
                'Acesso restrito: faça login como ADM para acessar o Painel Administrativo.'
              }
              onAuthenticated={handleAdminAuthenticated}
              onLogoutAdmin={handleLogoutAdmin}
              onEnterAdminPanel={() => navigateToSection('admin')}
              onNavigateToCatalog={() => navigateToSection('catalog')}
            />
          ))}
      </main>

      {/* Passwordless Customer Identification Modal */}
      <QuickCustomerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAuthenticated={(session) => setCustomerSession(session)}
        onOpenLgpdPolicy={() => navigateToSection('lgpd')}
      />

      {/* Site Footer - print:hidden */}
      <footer className="bg-slate-950 text-slate-500 py-10 text-xs border-t border-slate-900 print:hidden text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer"
              onClick={() => navigateToSection('home')}
            >
              <Glasses className="h-5 w-5 text-gold-500" />
              <span className="font-display font-extrabold text-white tracking-widest text-sm">
                ÓTICA RAPIDO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Conceito de ótica online e atendimento personalizado com visitas a domicílio, confecção digital de lentes e alta precisão.
            </p>
          </div>

          <div className="space-y-1.5">
            <h5 className="text-white font-sans font-bold text-xs uppercase tracking-wider mb-2.5">
              Atendimento
            </h5>
            <p className="flex items-center gap-1.5 text-[11px]">
              <Phone className="h-3.5 w-3.5 text-gold-500" /> (11) 94706-9414 (WhatsApp)
            </p>
            <p className="flex items-center gap-1.5 text-[11px]">
              <Mail className="h-3.5 w-3.5 text-gold-500" /> atendimento@oticarapido.com.br
            </p>
            <button
              type="button"
              onClick={() => navigateToSection('appointments')}
              className="flex items-center gap-1.5 text-[11px] text-gold-400 hover:text-gold-300 font-semibold cursor-pointer text-left pt-1"
            >
              <Calendar className="h-3.5 w-3.5 text-gold-400" />
              <span>Agendar Visita a Domicílio (SP)</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <h5 className="text-white font-sans font-bold text-xs uppercase tracking-wider mb-2.5">
              Segurança &amp; Gestão
            </h5>
            <button
              type="button"
              onClick={() => navigateToSection('lgpd')}
              className="flex items-center gap-1.5 text-[11px] text-gold-400 hover:text-gold-300 font-semibold cursor-pointer text-left"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
              <span>Política de Privacidade (LGPD)</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('lgpd')}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white cursor-pointer text-left"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-500" />
              <span>Portal de Direitos do Titular (Art. 18)</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection(isAdminAuthenticated ? 'admin' : 'admin-login')}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-gold-400 cursor-pointer text-left"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {isAdminAuthenticated ? 'Painel Administrativo (/admin)' : 'Área Restrita'}
              </span>
            </button>
          </div>

          <div>
            <h5 className="text-white font-sans font-bold text-xs uppercase tracking-wider mb-2.5">
              Localização &amp; Matriz
            </h5>
            <p className="flex items-center gap-1.5 text-[11px]">
              <MapPin className="h-3.5 w-3.5 text-gold-500" /> Av. Paulista, 1200 - Bela Vista, São Paulo/SP
            </p>
            <p className="text-[10px] text-slate-400 mt-2">
              © 2026 Ótica Rapido. Todos os direitos reservados. CNPJ 48.912.450/0001-88.
            </p>
          </div>
        </div>

        {/* Footer Map Component - Av. Paulista Unit */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PaulistaLocationMap />
        </div>
      </footer>
    </div>
  );
}
