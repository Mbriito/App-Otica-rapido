import React from 'react';
import { UserCheck, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Heart, Circle, Square, HelpCircle } from 'lucide-react';

export interface FaceShapeGuideItem {
  id: 'oval' | 'redondo' | 'quadrado' | 'coracao';
  title: string;
  subtitle: string;
  characteristics: string;
  recommendedShapes: { name: string; iconShape: string }[];
  avoidShapes: string;
  tip: string;
  filterShapeId: string;
  accentColor: {
    bg: string;
    border: string;
    badge: string;
    accent: string;
    iconBg: string;
  };
}

export const FACE_SHAPES: FaceShapeGuideItem[] = [
  {
    id: 'oval',
    title: 'Rosto Oval',
    subtitle: 'O formato mais versátil e equilibrado',
    characteristics: 'Testa ligeiramente mais larga que o queixo, com maçãs do rosto suaves e linhas levemente arredondadas.',
    recommendedShapes: [
      { name: 'Quadrado', iconShape: 'quadrado' },
      { name: 'Gatinha', iconShape: 'gatinho' },
      { name: 'Retangular', iconShape: 'retangular' },
      { name: 'Aviador', iconShape: 'aviador' }
    ],
    avoidShapes: 'Armações excessivamente grandes que ultrapassem muito a largura das têmporas.',
    tip: 'Praticamente todos os formatos harmonizam bem. Modelos geométricos ou retangulares adicionam estrutura elegante.',
    filterShapeId: 'quadrado',
    accentColor: {
      bg: 'bg-emerald-50/60',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      accent: 'text-emerald-700',
      iconBg: 'bg-emerald-500 text-white'
    }
  },
  {
    id: 'redondo',
    title: 'Rosto Redondo',
    subtitle: 'Ângulos suaves com largura e altura proporcionais',
    characteristics: 'Maçãs do rosto volumosas, queixo arredondado e poucos ângulos retos no contorno facial.',
    recommendedShapes: [
      { name: 'Quadrado', iconShape: 'quadrado' },
      { name: 'Retangular', iconShape: 'retangular' },
      { name: 'Gatinha', iconShape: 'gatinho' },
      { name: 'Geométrico', iconShape: 'geometrico' }
    ],
    avoidShapes: 'Armações redondas ou pequenas que acentuam a circularidade do rosto.',
    tip: 'Armações angulares e retangulares alongam visualmente o rosto e definem melhor os traços faciais.',
    filterShapeId: 'quadrado',
    accentColor: {
      bg: 'bg-blue-50/60',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      accent: 'text-blue-700',
      iconBg: 'bg-blue-600 text-white'
    }
  },
  {
    id: 'quadrado',
    title: 'Rosto Quadrado',
    subtitle: 'Mandíbula bem delineada e linhas retas fortes',
    characteristics: 'Testa, maçãs do rosto e maxilar com larguras semelhantes, com ângulos retos e presença marcante.',
    recommendedShapes: [
      { name: 'Oval', iconShape: 'oval' },
      { name: 'Redondo', iconShape: 'redondo' },
      { name: 'Gatinha Suave', iconShape: 'gatinho' },
      { name: 'Aviador', iconShape: 'aviador' }
    ],
    avoidShapes: 'Armações muito retas ou quadradas grossas que pesam o maxilar.',
    tip: 'Modelos ovais, circulares e com bordas arredondadas suavizam as linhas fortes da mandíbula.',
    filterShapeId: 'oval',
    accentColor: {
      bg: 'bg-amber-50/60',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      accent: 'text-amber-700',
      iconBg: 'bg-amber-500 text-slate-950'
    }
  },
  {
    id: 'coracao',
    title: 'Rosto Coração / Triangular',
    subtitle: 'Testa mais ampla e queixo delicado afilado',
    characteristics: 'Testa e maçãs do rosto proeminentes que afunilam em direção a um queixo mais fino e pontiagudo.',
    recommendedShapes: [
      { name: 'Gatinha', iconShape: 'gatinho' },
      { name: 'Oval', iconShape: 'oval' },
      { name: 'Aviador Clássico', iconShape: 'aviador' },
      { name: 'Fio de Nylon / Metal', iconShape: 'metal' }
    ],
    avoidShapes: 'Armações com topos excessivamente pesados ou detalhes volumosos na parte superior.',
    tip: 'Armações com base mais arredondada ou estilo gatinho equilibram a proporção entre a testa e o queixo fino.',
    filterShapeId: 'gatinho',
    accentColor: {
      bg: 'bg-rose-50/60',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      accent: 'text-rose-700',
      iconBg: 'bg-rose-500 text-white'
    }
  }
];

interface FaceShapeGuideProps {
  onSelectShapeFilter?: (shape: string) => void;
  activeShapeFilter?: string;
}

export default function FaceShapeGuide({ onSelectShapeFilter, activeShapeFilter }: FaceShapeGuideProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm mb-12 text-left">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-gold-500/10 text-gold-600 rounded-lg">
              <UserCheck className="h-5 w-5" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gold-600">
              Guia Visagista • Consultoria de Estilo
            </span>
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
            Qual óculos combina com seu formato de rosto?
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Descubra os formatos que mais valorizam seus traços naturais (<strong>Oval</strong>, <strong>Redondo</strong>, <strong>Quadrado</strong> e <strong>Coração</strong>) e clique para filtrar os modelos ideais no catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl self-start md:self-auto text-xs text-slate-600 font-medium">
          <Sparkles className="h-4 w-4 text-gold-500 flex-shrink-0" />
          <span>Equilíbrio e Harmonia Visual</span>
        </div>
      </div>

      {/* Grid of 4 Face Shapes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {FACE_SHAPES.map((face) => {
          return (
            <div
              key={face.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${face.accentColor.bg} ${face.accentColor.border}`}
            >
              <div>
                {/* Visual SVG Avatar Representing the Face Shape */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-center p-2">
                    {face.id === 'oval' && (
                      <svg viewBox="0 0 50 50" className="w-10 h-10 text-emerald-600">
                        {/* Oval Face Silhouette */}
                        <ellipse cx="25" cy="25" rx="16" ry="21" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="1 0" />
                        {/* Eyebrows & Eyes hint */}
                        <path d="M16,21 Q20,19 23,21 M27,21 Q30,19 34,21" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <circle cx="19.5" cy="24" r="1.5" fill="currentColor" />
                        <circle cx="30.5" cy="24" r="1.5" fill="currentColor" />
                        {/* Smile */}
                        <path d="M20,33 Q25,37 30,33" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    )}

                    {face.id === 'redondo' && (
                      <svg viewBox="0 0 50 50" className="w-10 h-10 text-blue-600">
                        {/* Round Face Silhouette */}
                        <circle cx="25" cy="25" r="19" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        {/* Eyebrows & Eyes hint */}
                        <path d="M16,21 Q20,19 23,21 M27,21 Q30,19 34,21" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <circle cx="19.5" cy="24" r="1.5" fill="currentColor" />
                        <circle cx="30.5" cy="24" r="1.5" fill="currentColor" />
                        {/* Smile */}
                        <path d="M20,33 Q25,37 30,33" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    )}

                    {face.id === 'quadrado' && (
                      <svg viewBox="0 0 50 50" className="w-10 h-10 text-amber-600">
                        {/* Square Face Silhouette */}
                        <rect x="7" y="7" width="36" height="36" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        {/* Eyebrows & Eyes hint */}
                        <path d="M16,21 Q20,19 23,21 M27,21 Q30,19 34,21" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <circle cx="19.5" cy="24" r="1.5" fill="currentColor" />
                        <circle cx="30.5" cy="24" r="1.5" fill="currentColor" />
                        {/* Smile */}
                        <path d="M20,33 Q25,37 30,33" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    )}

                    {face.id === 'coracao' && (
                      <svg viewBox="0 0 50 50" className="w-10 h-10 text-rose-600">
                        {/* Heart / Inverted Triangle Face Silhouette */}
                        <path d="M9,13 C14,8 36,8 41,13 C41,25 32,41 25,45 C18,41 9,25 9,13 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        {/* Eyebrows & Eyes hint */}
                        <path d="M16,21 Q20,19 23,21 M27,21 Q30,19 34,21" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <circle cx="19.5" cy="24" r="1.5" fill="currentColor" />
                        <circle cx="30.5" cy="24" r="1.5" fill="currentColor" />
                        {/* Smile */}
                        <path d="M21,34 Q25,37 29,34" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>

                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold border ${face.accentColor.badge}`}>
                    {face.id.toUpperCase()}
                  </span>
                </div>

                <h4 className="font-display font-bold text-lg text-slate-900">
                  {face.title}
                </h4>
                <p className="text-xs font-medium text-slate-600 mb-2.5">
                  {face.subtitle}
                </p>

                <p className="text-[11px] text-slate-600 leading-relaxed mb-4">
                  {face.characteristics}
                </p>

                {/* Combina Perfeitamente com */}
                <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3 mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                    Armações Mais Indicadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {face.recommendedShapes.map((shape, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        {shape.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dica de Especialista */}
                <div className="text-[11px] text-slate-700 bg-white/60 p-2.5 rounded-xl border border-slate-200/50 mb-4">
                  <strong className="text-slate-900 font-bold block mb-0.5">Dica de Visagismo:</strong>
                  {face.tip}
                </div>
              </div>

              {/* Action Button to Filter Catalog */}
              {onSelectShapeFilter && (
                <button
                  type="button"
                  onClick={() => onSelectShapeFilter(face.filterShapeId)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeShapeFilter === face.filterShapeId
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 shadow-xs'
                  }`}
                >
                  <span>Ver Modelos {face.recommendedShapes[0].name}s</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Information Callout */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gold-600 flex-shrink-0" />
          <span><strong>Dúvida no formato?</strong> Nossa equipe realiza consultoria visagista personalizada com prova a domicílio ou por vídeo.</span>
        </div>
        <a
          href="https://wa.me/5511947069414?text=Olá!%20Gostaria%20de%20uma%20ajuda%20para%20descobrir%20qual%20formato%20de%20óculos%20combina%20melhor%20com%20meu%20rosto."
          target="_blank"
          referrerPolicy="no-referrer"
          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline cursor-pointer flex-shrink-0"
        >
          Pedir Ajuda de Especialista no WhatsApp →
        </a>
      </div>
    </div>
  );
}
