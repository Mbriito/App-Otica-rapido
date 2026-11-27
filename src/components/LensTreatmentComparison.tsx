import React, { useState } from 'react';
import { Sparkles, Shield, Monitor, Sun, Check, Eye, HelpCircle, ArrowRight, Info } from 'lucide-react';

export interface LensTreatment {
  id: 'antirreflexo' | 'filtro_azul' | 'fotocromaticas';
  name: string;
  badge: string;
  tagline: string;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
  };
  features: {
    antiGlare: { label: string; score: number; text: string };
    blueLight: { label: string; score: number; text: string };
    uvSunAdaptation: { label: string; score: number; text: string };
    nightDriving: { label: string; score: number; text: string };
    easeOfCleaning: { label: string; score: number; text: string };
  };
  idealFor: string;
  benefitsList: string[];
  suggestedPriceAddon: number;
}

export const LENS_TREATMENTS: LensTreatment[] = [
  {
    id: 'antirreflexo',
    name: 'Antirreflexo (AR)',
    badge: 'Essencial & Nítido',
    tagline: 'Elimina reflexos indesejados e garante transparência total',
    colorTheme: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-200',
      text: 'text-emerald-950',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      accent: 'text-emerald-600'
    },
    features: {
      antiGlare: { label: 'Eliminação de Reflexos', score: 5, text: 'Máxima (99% de transmissão de luz)' },
      blueLight: { label: 'Proteção de Telas Digitais', score: 2, text: 'Básica (conforto padrão)' },
      uvSunAdaptation: { label: 'Escurece no Sol', score: 0, text: 'Não (100% cristalina)' },
      nightDriving: { label: 'Direção Noturna (Faróis)', score: 5, text: 'Excelente (sem ofuscamentos)' },
      easeOfCleaning: { label: 'Camada Hidrorrepelente', score: 4, text: 'Repele poeira e oleosidade' }
    },
    idealFor: 'Uso diário geral, motoristas noturnos e quem preza por olhos visíveis em fotos/vídeos.',
    benefitsList: [
      'Visão nítida sem pontos cegos de brilho',
      'Estética limpa: lentes invisíveis nas fotos',
      'Camada anti-risco de proteção mecânica'
    ],
    suggestedPriceAddon: 145.00
  },
  {
    id: 'filtro_azul',
    name: 'Filtro Azul (Blue UV / BlueCut)',
    badge: 'Mais Recomendado',
    tagline: 'Bloqueio da luz azul nociva de celulares, computadores e LEDs',
    colorTheme: {
      bg: 'bg-indigo-50/50',
      border: 'border-indigo-300',
      text: 'text-indigo-950',
      badgeBg: 'bg-indigo-600 text-white',
      badgeText: 'text-white',
      accent: 'text-indigo-600'
    },
    features: {
      antiGlare: { label: 'Eliminação de Reflexos', score: 5, text: 'Total (Antirreflexo Premium integrado)' },
      blueLight: { label: 'Proteção de Telas Digitais', score: 5, text: 'Máxima (filtra luz azul-violeta nociva)' },
      uvSunAdaptation: { label: 'Escurece no Sol', score: 0, text: 'Não (transparente com reflexo azul sutil)' },
      nightDriving: { label: 'Direção Noturna (Faróis)', score: 4, text: 'Muito boa (atenua lâmpadas de LED)' },
      easeOfCleaning: { label: 'Camada Hidrorrepelente', score: 5, text: 'Super resistente e fácil de limpar' }
    },
    idealFor: 'Profissionais de computador, estudantes, gamers e quem usa celular mais de 2h ao dia.',
    benefitsList: [
      'Alívio imediato de ardor e fadiga visual',
      'Previne dores de cabeça no fim do dia',
      'Melhora a qualidade do sono à noite'
    ],
    suggestedPriceAddon: 290.00
  },
  {
    id: 'fotocromaticas',
    name: 'Fotocromáticas (Fotossensíveis)',
    badge: '2 em 1 Completo',
    tagline: 'Claras em ambientes internos e escuras sob a luz solar',
    colorTheme: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      text: 'text-amber-950',
      badgeBg: 'bg-amber-500 text-slate-950',
      badgeText: 'text-slate-950',
      accent: 'text-amber-600'
    },
    features: {
      antiGlare: { label: 'Eliminação de Reflexos', score: 5, text: 'Total (com tratamento AR)' },
      blueLight: { label: 'Proteção de Telas Digitais', score: 4, text: 'Alta (proteção contínua)' },
      uvSunAdaptation: { label: 'Escurece no Sol', score: 5, text: 'Sim (ativação automática UV400)' },
      nightDriving: { label: 'Direção Noturna (Faróis)', score: 5, text: '100% transparente à noite' },
      easeOfCleaning: { label: 'Camada Hidrorrepelente', score: 4, text: 'Proteção multicamadas ativa' }
    },
    idealFor: 'Pessoas com sensibilidade à luz (fotofobia), praticantes de atividades ao ar livre e quem busca praticidade.',
    benefitsList: [
      'Dispensa alternar com óculos de sol',
      'Bloqueio 100% contra raios UVA e UVB',
      'Conforto visual instantâneo em qualquer luz'
    ],
    suggestedPriceAddon: 390.00
  }
];

interface LensTreatmentComparisonProps {
  onSelectTreatment?: (treatment: LensTreatment) => void;
  selectedTreatmentId?: string;
}

export default function LensTreatmentComparison({
  onSelectTreatment,
  selectedTreatmentId,
}: LensTreatmentComparisonProps) {
  const [activeTab, setActiveTab] = useState<'tabela' | 'detalhes'>('tabela');

  const renderStars = (score: number) => {
    if (score === 0) {
      return <span className="text-[10px] font-mono text-slate-400 font-medium">Não se aplica</span>;
    }
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-xs ${
              star <= score ? 'text-amber-500 font-bold' : 'text-slate-200'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm text-left">
      {/* Header with Title & Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-600" />
            <h4 className="font-display font-black text-slate-900 text-sm tracking-tight">
              Guia Comparativo de Tratamentos de Lentes
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Entenda as diferenças práticas entre <strong>Antirreflexo</strong>, <strong>Filtro Azul</strong> e <strong>Fotocromáticas</strong> para orientar o orçamento.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tabela')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'tabela'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tabela Rápida
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('detalhes')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'detalhes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cards Detalhados
          </button>
        </div>
      </div>

      {/* VIEW 1: COMPARATIVE MATRIX TABLE */}
      {activeTab === 'tabela' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-3 font-mono text-[10px] uppercase text-slate-400 font-bold w-1/4">
                  Critério / Benefício
                </th>
                {LENS_TREATMENTS.map((t) => (
                  <th key={t.id} className="py-3 px-3 font-sans w-1/4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-black uppercase tracking-wider inline-block w-fit ${t.colorTheme.badgeBg}`}>
                        {t.badge}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{t.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: Proteção de Telas */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Telas & Dispositivos</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-normal">Computador, celular e luz LED</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {renderStars(2)}
                  <span className="text-[10px] text-slate-500 block mt-0.5">Básico</span>
                </td>
                <td className="py-3 px-3 bg-indigo-50/40 text-indigo-950 font-medium">
                  {renderStars(5)}
                  <span className="text-[10px] text-indigo-700 block mt-0.5 font-bold">Bloqueio Máximo</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {renderStars(4)}
                  <span className="text-[10px] text-slate-500 block mt-0.5">Alta Proteção</span>
                </td>
              </tr>

              {/* Row 2: Eliminação de Reflexos */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Nitidez & Estética</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-normal">Sem reflexos em fotos/vídeos</span>
                </td>
                <td className="py-3 px-3 bg-emerald-50/40 text-emerald-950">
                  {renderStars(5)}
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">Totalmente Clara</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {renderStars(5)}
                  <span className="text-[10px] text-slate-500 block mt-0.5">AR Premium Incluso</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {renderStars(5)}
                  <span className="text-[10px] text-slate-500 block mt-0.5">Com Tratamento AR</span>
                </td>
              </tr>

              {/* Row 3: Escurece no Sol */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span>Adaptação ao Sol</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-normal">Escurece ao ar livre (UV)</span>
                </td>
                <td className="py-3 px-3 text-slate-500">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    ✕ Não escurece
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-500">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    ✕ Não escurece
                  </span>
                </td>
                <td className="py-3 px-3 bg-amber-50/40 text-amber-950">
                  {renderStars(5)}
                  <span className="text-[10px] text-amber-800 block mt-0.5 font-bold">✓ Escurece no Sol (UV400)</span>
                </td>
              </tr>

              {/* Row 4: Condução Noturna */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-slate-500" />
                    <span>Direção Noturna</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-normal">Proteção contra faróis</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {renderStars(5)}
                  <span className="text-[10px] text-slate-500 block mt-0.5">Excelente</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {renderStars(4)}
                  <span className="text-[10px] text-slate-500 block mt-0.5">Muito Boa</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {renderStars(5)}
                  <span className="text-[10px] text-slate-500 block mt-0.5">100% Transparente</span>
                </td>
              </tr>

              {/* Row 5: Indicação Principal */}
              <tr className="bg-slate-50/40">
                <td className="py-3 px-3 font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-gold-600" />
                    <span>Ideal Para</span>
                  </div>
                </td>
                {LENS_TREATMENTS.map((t) => (
                  <td key={t.id} className="py-3 px-3 text-[11px] text-slate-600 leading-tight">
                    {t.idealFor}
                  </td>
                ))}
              </tr>

              {/* Row 6: Ações de Aplicação no Orçamento */}
              {onSelectTreatment && (
                <tr>
                  <td className="py-3 px-3 font-mono text-[10px] uppercase text-slate-400 font-bold">
                    Ação Rápida
                  </td>
                  {LENS_TREATMENTS.map((t) => (
                    <td key={t.id} className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => onSelectTreatment(t)}
                        className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedTreatmentId === t.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {selectedTreatmentId === t.id ? (
                          <>
                            <Check className="h-3 w-3" /> Selecionado
                          </>
                        ) : (
                          <>
                            Aplicar (+ R$ {t.suggestedPriceAddon.toFixed(2)})
                          </>
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: CARDS VIEW */}
      {activeTab === 'detalhes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {LENS_TREATMENTS.map((treatment) => {
            const isSelected = selectedTreatmentId === treatment.id;
            return (
              <div
                key={treatment.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                  treatment.colorTheme.bg
                } ${treatment.colorTheme.border} ${
                  isSelected ? 'ring-2 ring-emerald-500 shadow-md' : 'shadow-xs'
                }`}
              >
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${treatment.colorTheme.badgeBg}`}>
                      {treatment.badge}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700">
                      + R$ {treatment.suggestedPriceAddon.toFixed(2)}
                    </span>
                  </div>

                  <h5 className="font-display font-bold text-base text-slate-900 mb-1">
                    {treatment.name}
                  </h5>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {treatment.tagline}
                  </p>

                  {/* Benefits Checkpoints */}
                  <div className="space-y-1.5 mb-4">
                    {treatment.benefitsList.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation banner */}
                  <div className="bg-white/80 border border-slate-200/60 p-2.5 rounded-xl text-[10px] text-slate-600 mb-4">
                    <strong className="block text-slate-800 font-bold mb-0.5">Para quem é indicado:</strong>
                    {treatment.idealFor}
                  </div>
                </div>

                {onSelectTreatment && (
                  <button
                    type="button"
                    onClick={() => onSelectTreatment(treatment)}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Aplicado no Orçamento
                      </>
                    ) : (
                      <>
                        Aplicar ao Orçamento
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful Tip Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-400 font-sans">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-gold-600 flex-shrink-0" />
          <span>Dica do especialista: Todos os tratamentos possuem garantia e podem ser combinados com lentes monofocais ou multifocais.</span>
        </div>
        <span className="font-mono text-slate-500 font-medium">Ótica Rapido • Laboratório Oftálmico</span>
      </div>
    </div>
  );
}
