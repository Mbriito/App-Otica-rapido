import React from 'react';
import { ShieldCheck, Eye, Sparkles, Home, ChevronRight, MessageSquare, BadgeCheck, Glasses, Truck } from 'lucide-react';
import OpticalImage from './OpticalImage';
import homeOpticalHero from '../assets/images/home_optical_hero_1795637104120.jpg';

interface HomePresentationProps {
  onNavigate: (section: string) => void;
}

export default function HomePresentation({ onNavigate }: HomePresentationProps) {
  return (
    <div className="space-y-16 py-4">
      {/* 1. HERO - Apresentação Principal */}
      <section className="relative rounded-3xl overflow-hidden bg-sapphire-950 border border-sapphire-900 shadow-2xl">
        {/* Ambient Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-sapphire-950 via-sapphire-950/90 to-sapphire-950/35 z-10" />
        <OpticalImage
          src={homeOpticalHero}
          alt="Ótica Rapido — Armações de grau e óculos solares em acetato e titânio"
          variant="banner"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
        />
        
        <div className="relative z-20 px-6 py-16 md:py-24 md:px-16 max-w-3xl text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/30 font-mono text-[10px] text-gold-400 font-bold uppercase tracking-wider mb-6">
            <Sparkles className="h-3 w-3" /> O Conceito Mais Moderno em Visão
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-black text-white tracking-tight leading-none text-balance">
            Ótica Rapido
          </h1>
          <p className="font-display text-lg md:text-2xl text-gold-400 font-light mt-2 tracking-wide">
            Atendimento Online & Personalizado a Domicílio
          </p>
          <p className="mt-4 font-sans text-slate-300 text-sm md:text-base leading-relaxed">
            Unimos a máxima agilidade da tecnologia online com o acolhimento do atendimento presencial sob medida. Desenvolvemos óculos perfeitos para o seu estilo de vida com laboratório de alta precisão e entrega garantida.
          </p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-slate-950 font-sans text-xs font-bold rounded-xl transition-all shadow-lg hover:-translate-y-0.5 cursor-pointer"
            >
              Conhecer Catálogo
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              type="button"
              onClick={() => onNavigate('appointments')}
              className="flex items-center gap-2 px-6 py-3 bg-sapphire-900 border border-sapphire-800 hover:bg-sapphire-800 text-slate-200 font-sans text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Home className="h-4 w-4 text-emerald-400" />
              Agendar Visita Residencial
            </button>
          </div>
        </div>
      </section>

      {/* 2. CORE CONCEPT SECTION - Tríade Óptica */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Conceito Ótica Online */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 flex flex-col justify-between text-left shadow-sm">
          <div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 mb-6 border border-slate-200">
              <Glasses className="h-6 w-6 text-gold-600" />
            </div>
            <h3 className="font-display font-black text-xl text-slate-950 mb-3">
              Experiência 100% Online
            </h3>
            <p className="font-sans text-slate-600 text-xs md:text-sm leading-relaxed">
              Sem sair de casa, você escolhe sua armação em nosso catálogo virtual de alta definição, faz o upload de sua receita através de nossa ferramenta de leitura inteligente de receitas, configura suas lentes e recebe seus óculos prontos para uso com toda a comodidade.
            </p>
            <ul className="mt-6 space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Leitor inteligente de receitas automatizado
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Simulador e editor de orçamentos e recibos em tempo real
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Embalagem selada com estojo premium gratuito
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('prescription')}
            className="mt-8 text-xs font-bold text-gold-700 hover:text-gold-800 flex items-center gap-1.5 text-left w-fit cursor-pointer"
          >
            Acessar Leitor de Receita <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Conceito Atendimento a Domicílio */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 flex flex-col justify-between text-left shadow-sm">
          <div>
            <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-600 mb-6 border border-gold-500/20">
              <Home className="h-6 w-6 text-gold-700" />
            </div>
            <h3 className="font-display font-black text-xl text-slate-950 mb-3">
              Consultoria Exclusiva a Domicílio
            </h3>
            <p className="font-sans text-slate-600 text-xs md:text-sm leading-relaxed">
              Prefere provar as armações pessoalmente e sentir o ajuste no rosto? Nossos consultores ópticos especializados realizam visitas agendadas gratuitas à sua residência ou escritório em toda a região de São Paulo, levando uma maleta técnica exclusiva com mais de 100 modelos selecionados.
            </p>
            <ul className="mt-6 space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Agendamento simplificado sem taxa de visita
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Medição técnica pupilar (DNP) digital avançada em casa
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Suporte personalizado para harmonização facial com o designer
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('appointments')}
            className="mt-8 text-xs font-bold text-gold-700 hover:text-gold-800 flex items-center gap-1.5 text-left w-fit cursor-pointer"
          >
            Agendar Visita Especializada <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* 3. ASSURANCES - Segurança & Excelência */}
      <section className="bg-sapphire-900 border border-sapphire-800 rounded-2xl p-8 md:p-12 text-left">
        <div className="max-w-3xl">
          <h3 className="font-display font-black text-2xl text-white">Rigor Clínico, Segurança & Excelência</h3>
          <p className="text-slate-400 text-xs md:text-sm mt-2 leading-relaxed">
            Seus olhos merecem o melhor. Trabalhamos exclusivamente sob rígidos protocolos oftálmicos e parceiros laboratoriais certificados mundialmente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="p-5 rounded-xl bg-sapphire-950/60 border border-sapphire-800/80">
            <ShieldCheck className="h-8 w-8 text-gold-500 mb-3" />
            <h4 className="font-sans font-bold text-sm text-slate-100">Segurança de Grau</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Todas as lentes fabricadas passam por conferência informatizada no lensômetro digital antes da montagem final. Garantia de adaptação ou substituição gratuita.
            </p>
          </div>
          
          <div className="p-5 rounded-xl bg-sapphire-950/60 border border-sapphire-800/80">
            <Eye className="h-8 w-8 text-gold-500 mb-3" />
            <h4 className="font-sans font-bold text-sm text-slate-100">Excelência das Lentes</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Parceria com os laboratórios certificados Essilor, Hoya e Zeiss. Lentes equipadas com tratamentos avançados antirreflexo, anti-risco, repelência a poeira e proteção digital contra luz azul.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-sapphire-950/60 border border-sapphire-800/80">
            <Truck className="h-8 w-8 text-gold-500 mb-3" />
            <h4 className="font-sans font-bold text-sm text-slate-100">Logística Protegida</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Frete rastreável gratuito para todo o Brasil. Os óculos são enviados em estojos reforçados de luxo com lenço de microfibra de alta densidade e spray de limpeza exclusivo.
            </p>
          </div>
        </div>

        {/* Privacy & LGPD Callout */}
        <div className="mt-6 pt-6 border-t border-sapphire-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span><strong>Proteção e Sigilo de Receitas (LGPD):</strong> Seus dados de saúde visual e receitas são criptografados e protegidos nos termos da Lei nº 13.709/2018.</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('lgpd')}
            className="text-gold-400 hover:text-gold-300 font-bold underline cursor-pointer flex-shrink-0"
          >
            Ver Política de Proteção de Dados →
          </button>
        </div>
      </section>

      {/* 4. CALL TO ACTION STEPS */}
      <section className="text-center bg-gold-50/50 border border-gold-100 rounded-2xl p-8 max-w-xl mx-auto">
        <h4 className="font-display font-extrabold text-[#302014] text-lg">Pronto para Enxergar Melhor?</h4>
        <p className="text-slate-600 text-xs mt-1.5 mb-6">
          Escolha o caminho que preferir para iniciar seu atendimento de alta precisão hoje mesmo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="px-5 py-2.5 bg-sapphire-900 hover:bg-sapphire-800 text-white font-sans text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Navegar Catálogo
          </button>
          <button
            type="button"
            onClick={() => onNavigate('prescription')}
            className="px-5 py-2.5 bg-white border border-slate-300 hover:border-sapphire-800 text-slate-800 font-sans text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Carregar Receita
          </button>
          <a
            href="https://wa.me/5511947069414"
            target="_blank"
            referrerPolicy="no-referrer"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <MessageSquare className="h-4 w-4" /> 11 94706-9414
          </a>
        </div>
      </section>
    </div>
  );
}
