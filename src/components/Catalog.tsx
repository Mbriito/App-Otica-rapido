import React, { useState, useEffect } from 'react';
import { MIN_FRAME_PRICE, premiumFrames } from '../data/frames';
import { EyewearFrame } from '../types';
import { Filter, SlidersHorizontal, Check, ShieldCheck, Sparkles, MessageSquare, ShoppingCart, ArrowRight, Eye, Sun, UserCheck, RefreshCw } from 'lucide-react';
import FaceShapeGuide from './FaceShapeGuide';
import OpticalImage from './OpticalImage';
import catalogEyewearHero from '../assets/images/catalog_eyewear_hero_1795637102870.jpg';
import { fetchCatalogFrames, subscribeToCatalogUpdates } from '../services/supabaseService';
import { formatBRL } from '../utils/quoteUtils';

interface CatalogProps {
  onSelectFrameForQuote: (frame: EyewearFrame, color: string, lensType: string, lensPrice: number) => void;
  onNavigateToPrescription: () => void;
}

export default function Catalog({ onSelectFrameForQuote, onNavigateToPrescription }: CatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedGender, setSelectedGender] = useState<string>('todos');
  const [selectedShape, setSelectedShape] = useState<string>('todos');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('todos');
  const [allFrames, setAllFrames] = useState<EyewearFrame[]>(premiumFrames);
  const [selectedFrame, setSelectedFrame] = useState<EyewearFrame | null>(null);
  const [chosenColor, setChosenColor] = useState<string>('');
  const [chosenLens, setChosenLens] = useState<{ name: string; price: number }>({
    name: 'Somente Armação (Lente de Demonstração)',
    price: 0
  });

  useEffect(() => {
    let active = true;
    fetchCatalogFrames().then(({ allFrames: loaded }) => {
      if (active) setAllFrames(loaded);
    });

    const unsubscribe = subscribeToCatalogUpdates(({ allFrames: updated }) => {
      if (active) {
        setAllFrames(updated);
        setSelectedFrame((current) =>
          current ? updated.find((f) => f.id === current.id) || current : null
        );
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Opções de Lentes para orçamentação
  const lensOptions = [
    { name: 'Somente Armação (Lente de Demonstração)', price: 0, desc: 'Sem grau oftálmico, para uso estético ou com lentes a definir na visita.' },
    { name: 'Monofocal Orgânica + Antirreflexo', price: 145.00, desc: 'Ideal para Miopia, Hipermetropia ou Astigmatismo leve/médio.' },
    { name: 'Monofocal BlueCut Digital (Filtro Luz Azul)', price: 290.00, desc: 'Ideal para quem usa telas e computadores, reduz o cansaço ocular.' },
    { name: 'Multifocal Progressiva Digital de Alta Precisão', price: 480.00, desc: 'Para presbiopia (visão de perto, intermediária e longe) com campo amplo.' },
    { name: 'Fotossensível (Transitions) com Bloqueio UV400', price: 390.00, desc: 'Lentes inteligentes que clareiam em ambientes fechados e escurecem no sol.' }
  ];

  // Filtering logic
  const filteredFrames = allFrames.filter((frame) => {
    const matchCategory = selectedCategory === 'todos' || frame.category === selectedCategory;
    const matchGender = selectedGender === 'todos' || frame.gender === selectedGender || frame.gender === 'unissex';
    const matchShape = selectedShape === 'todos' || frame.shape === selectedShape;
    const matchMaterial = selectedMaterial === 'todos' || frame.material === selectedMaterial;
    return matchCategory && matchGender && matchShape && matchMaterial;
  });

  const handleFrameClick = (frame: EyewearFrame) => {
    setSelectedFrame(frame);
    setChosenColor(frame.colors[0] || 'Preto Clássico');
    setChosenLens({ name: 'Somente Armação (Lente de Demonstração)', price: 0 });
  };

  const handleSendToQuote = () => {
    if (!selectedFrame) return;
    onSelectFrameForQuote(selectedFrame, chosenColor, chosenLens.name, chosenLens.price);
    setSelectedFrame(null);
  };

  // Build WhatsApp pre-filled text
  const getWhatsAppMessageUrl = (frame: EyewearFrame, color: string, lens: string) => {
    const shapeFormatted = frame.shape === 'gatinho' ? 'De Gatinha' : frame.shape.charAt(0).toUpperCase() + frame.shape.slice(1);
    const categoryFormatted = frame.category === 'sol' ? 'Óculos de Sol' : 'Óculos de Grau';
    const framePrice = Math.max(MIN_FRAME_PRICE, Number(frame.price) || MIN_FRAME_PRICE);
    
    const text = `Olá, *Ótica Rapido*! Gostei deste modelo no catálogo:\n\n` +
      `🕶️ *Modelo:* ${frame.name} (${frame.referenceCode || 'Ref. Ótica'})\n` +
      `💰 *Valor da Armação:* ${formatBRL(framePrice)}\n` +
      `📐 *Formato:* ${shapeFormatted} (${categoryFormatted})\n` +
      `🎨 *Cor Selecionada:* ${color}\n` +
      `🔬 *Tipo de Lentes:* ${lens}\n\n` +
      `Gostaria de agendar meu atendimento (online ou a domicílio) e verificar a confecção com a minha receita médica!`;
    return `https://wa.me/5511947069414?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="py-8">
      {/* Visual Welcome Banner */}
      <div className="bg-sapphire-950 rounded-3xl overflow-hidden shadow-2xl relative mb-12 border border-sapphire-900">
        <div className="absolute inset-0 bg-gradient-to-r from-sapphire-950 via-sapphire-950/88 to-sapphire-950/35 z-10" />
        <OpticalImage
          src={catalogEyewearHero}
          alt="Catálogo de armações de grau e óculos solares UV400 da Ótica Rapido"
          variant="banner"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
        />
        <div className="relative z-20 px-8 py-12 md:py-20 md:px-16 max-w-3xl text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/30 font-mono text-xs text-gold-400 font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Catálogo de Referências & Estilos
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Guia de Modelos: <span className="text-gold-400">Quadrado, Oval, Gatinha, Grau & Sol</span>
          </h2>
          <p className="mt-4 font-sans text-slate-300 text-base md:text-lg leading-relaxed">
            Utilize os modelos abaixo como <strong>referência de formato e estilo</strong> para escolher a estética que mais combina com seu rosto. Você pode selecionar modelos para óculos de grau ou solares e solicitar prova a domicílio ou consultoria online.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <button 
              onClick={onNavigateToPrescription}
              className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-slate-950 font-sans text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-gold-500/20 hover:-translate-y-0.5 cursor-pointer"
            >
              Leitor de Receita Médica
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-mono py-3">
              <ShieldCheck className="h-4 w-4 text-gold-400" />
              Modelos para Atendimento a Domicílio & Online
            </div>
          </div>
        </div>
      </div>

      {/* VISUAL FACE SHAPE GUIDE (Oval, Redondo, Quadrado, Coração) */}
      <FaceShapeGuide
        activeShapeFilter={selectedShape}
        onSelectShapeFilter={(shape) => {
          setSelectedShape(shape);
          // Smooth scroll to catalog filters/grid
          const gridEl = document.getElementById('catalog-grid-section');
          if (gridEl) {
            gridEl.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      <div id="catalog-grid-section" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* FILTERS PANEL */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm self-start text-left">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gold-600" />
              Filtrar Referências
            </h3>
            <SlidersHorizontal className="h-4 w-4 text-slate-400 lg:hidden" />
          </div>

          <div className="space-y-6">
            {/* Category / Tipo (Grau ou Sol) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2.5">
                Tipo de Óculos
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'todos', label: 'Todos os Tipos' },
                  { id: 'grau', label: 'Óculos de Grau', icon: Eye },
                  { id: 'sol', label: 'Óculos de Sol', icon: Sun }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedCategory(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === item.id
                        ? 'bg-sapphire-900 text-white border-sapphire-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape / Formato (Quadrado, Oval, Gatinha, etc) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2.5">
                Formato do Óculos
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'quadrado', label: 'Quadrado' },
                  { id: 'oval', label: 'Oval' },
                  { id: 'gatinho', label: 'De Gatinha' },
                  { id: 'redondo', label: 'Redondo' },
                  { id: 'retangular', label: 'Retangular' },
                  { id: 'aviador', label: 'Aviador' },
                  { id: 'geometrico', label: 'Geométrico' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedShape(item.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedShape === item.id
                        ? 'bg-gold-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender / Público */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2.5">
                Público
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'unissex', label: 'Unissex' },
                  { id: 'feminino', label: 'Feminino' },
                  { id: 'masculino', label: 'Masculino' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedGender(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                      selectedGender === item.id
                        ? 'bg-gold-50 text-gold-800 border-gold-400 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2.5">
                Material de Referência
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'acetato', label: 'Acetato Maciço' },
                  { id: 'titanio', label: 'Titânio Leve' },
                  { id: 'metal', label: 'Metal Fino' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMaterial(item.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedMaterial === item.id
                        ? 'bg-sapphire-900 text-white font-bold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSelectedCategory('todos');
                setSelectedGender('todos');
                setSelectedShape('todos');
                setSelectedMaterial('todos');
              }}
              className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 hover:text-slate-800 hover:border-slate-500 transition-colors font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Limpar Filtros
            </button>
          </div>
        </div>

        {/* EYEWEAR REFERENCE LIST */}
        <div className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <span className="text-sm font-sans text-slate-600 font-medium">
              Exibindo <strong className="text-slate-900 font-bold">{filteredFrames.length}</strong> modelos disponíveis · A partir de{' '}
              <strong className="text-emerald-800 font-mono">{formatBRL(MIN_FRAME_PRICE)}</strong>
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Tabela Oficial 2025/2026</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFrames.map((frame) => {
              const shapeName = frame.shape === 'gatinho' ? 'De Gatinha' : frame.shape.charAt(0).toUpperCase() + frame.shape.slice(1);
              
              return (
                <div
                  key={frame.id}
                  onClick={() => handleFrameClick(frame)}
                  className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 text-left"
                >
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {/* Reference Code Badge */}
                    <span className="absolute top-3 left-3 bg-sapphire-950/90 text-gold-400 text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-md z-10 font-bold border border-sapphire-800">
                      {frame.referenceCode || 'REF'}
                    </span>
                    
                    {/* Category Pill */}
                    <span className={`absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md z-10 ${
                      frame.category === 'sol' 
                        ? 'bg-amber-400 text-slate-950' 
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {frame.category === 'sol' ? 'Solar UV400' : 'Armação de Grau'}
                    </span>

                    <OpticalImage
                      src={frame.imageUrl}
                      alt={`${frame.name} — ${frame.category === 'sol' ? 'Óculos de Sol UV400' : 'Armação de Grau'} (${shapeName})`}
                      fallbackLabel={frame.referenceCode || 'Ótica Rapido'}
                      fallbackSublabel={frame.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Info details */}
                  <div className="p-5 flex flex-col flex-grow text-left">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4 className="font-display font-bold text-base text-slate-900 group-hover:text-gold-700 transition-colors">
                        {frame.name}
                      </h4>
                      <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg flex-shrink-0 tabular-nums">
                        {formatBRL(Math.max(MIN_FRAME_PRICE, Number(frame.price) || MIN_FRAME_PRICE))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        Formato: {shapeName}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md capitalize">
                        {frame.material}
                      </span>
                    </div>

                    {frame.faceRecommendation && (
                      <div className="flex items-start gap-1.5 p-2 bg-gold-50/70 border border-gold-100/80 rounded-lg text-[10px] text-slate-700 mb-3">
                        <UserCheck className="h-3.5 w-3.5 text-gold-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight font-medium">{frame.faceRecommendation}</span>
                      </div>
                    )}

                    <p className="text-xs font-sans text-slate-500 leading-relaxed mb-4 line-clamp-2 flex-grow">
                      {frame.description}
                    </p>
                    
                    {/* Colors Preview Dots */}
                    <div className="flex items-center gap-1.5 mb-4 border-t border-slate-100 pt-3">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mr-1.5">Cores:</span>
                      {frame.colors.map((color, index) => (
                        <span
                          key={index}
                          title={color}
                          className={`inline-block w-3.5 h-3.5 rounded-full border border-slate-300 ${
                            color.includes('Preto') ? 'bg-slate-950' : 
                            color.includes('Dourado') || color.includes('Ouro') ? 'bg-amber-400' :
                            color.includes('Vermelho') || color.includes('Bordô') || color.includes('Rubi') ? 'bg-rose-800' :
                            color.includes('Tartaruga') || color.includes('Caramelo') ? 'bg-amber-800' : 
                            color.includes('Azul') ? 'bg-blue-900' :
                            color.includes('Verde') ? 'bg-emerald-800' :
                            color.includes('Branco') ? 'bg-white' : 'bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="mt-auto pt-2">
                      <button className="w-full py-2.5 bg-slate-100 hover:bg-gold-500 hover:text-slate-950 text-slate-800 font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer">
                        Selecionar Este Modelo
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK MODAL / DETAIL CAROUSEL */}
      {selectedFrame && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-250">
            {/* Image display */}
            <div className="md:w-1/2 relative bg-slate-100 aspect-[4/3] md:aspect-auto md:min-h-[450px] overflow-hidden">
              <OpticalImage
                src={selectedFrame.imageUrl}
                alt={selectedFrame.name}
                variant="modal"
                loading="eager"
                fallbackLabel={selectedFrame.referenceCode || 'Ótica Rapido'}
                fallbackSublabel={selectedFrame.name}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sapphire-950/90 to-transparent p-6 text-white text-left">
                <span className="font-mono text-xs text-gold-400 tracking-wider uppercase font-bold">
                  {selectedFrame.referenceCode || 'REFERÊNCIA ÓTICA'}
                </span>
                <h3 className="font-display font-bold text-2xl mt-0.5 text-white">{selectedFrame.name}</h3>
                <p className="text-xs text-slate-300 font-mono mt-1 capitalize">
                  Formato: {selectedFrame.shape === 'gatinho' ? 'De Gatinha' : selectedFrame.shape} • Material: {selectedFrame.material}
                </p>
                {selectedFrame.faceRecommendation && (
                  <p className="text-[11px] text-gold-300 font-sans mt-1.5 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> {selectedFrame.faceRecommendation}
                  </p>
                )}
              </div>
            </div>

            {/* Customization Details */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto text-left">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono rounded uppercase font-bold">
                    Referência para Atendimento
                  </span>
                  <button
                    onClick={() => setSelectedFrame(null)}
                    className="text-slate-400 hover:text-slate-900 font-sans text-xl font-bold p-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 p-3.5 mb-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold">
                      Valor Oficial da Armação
                    </span>
                    <span className="font-mono text-lg font-black text-emerald-950 tabular-nums">
                      {formatBRL(
                        Math.max(MIN_FRAME_PRICE, Number(selectedFrame.price) || MIN_FRAME_PRICE)
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Total Estimado (c/ Lentes)
                    </span>
                    <span className="font-mono text-base font-black text-slate-950 tabular-nums">
                      {formatBRL(
                        Math.max(MIN_FRAME_PRICE, Number(selectedFrame.price) || MIN_FRAME_PRICE) +
                          chosenLens.price
                      )}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  {selectedFrame.description}
                </p>

                {/* Step 1: Color picking */}
                <div className="mb-6">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
                    1. Escolha a Cor de Preferência
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedFrame.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setChosenColor(color)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs transition-all cursor-pointer ${
                          chosenColor === color
                            ? 'bg-gold-50 text-gold-950 border-gold-400 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          color.includes('Preto') ? 'bg-slate-950' : 
                          color.includes('Dourado') || color.includes('Ouro') ? 'bg-amber-400' :
                          color.includes('Vermelho') || color.includes('Bordô') || color.includes('Rubi') ? 'bg-rose-800' :
                          color.includes('Tartaruga') || color.includes('Caramelo') ? 'bg-amber-800' : 
                          color.includes('Azul') ? 'bg-blue-900' :
                          color.includes('Verde') ? 'bg-emerald-800' :
                          color.includes('Branco') ? 'bg-white border' : 'bg-slate-300'
                        }`} />
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Lens picking */}
                <div className="mb-6">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
                    2. Lentes Oftálmicas (Opcional p/ Orçamento)
                  </label>
                  <div className="space-y-2">
                    {lensOptions.map((lens) => (
                      <button
                        key={lens.name}
                        onClick={() => setChosenLens({ name: lens.name, price: lens.price })}
                        className={`w-full text-left p-3 border rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                          chosenLens.name === lens.name
                            ? 'bg-sapphire-950 text-white border-sapphire-950 shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${
                          chosenLens.name === lens.name ? 'border-gold-400 bg-gold-500' : 'border-slate-300 bg-white'
                        }`}>
                          {chosenLens.name === lens.name && <Check className="h-2.5 w-2.5 text-slate-950 font-black" />}
                        </div>
                        <div>
                          <div className="flex justify-between font-sans text-xs font-bold leading-none mb-1">
                            <span>{lens.name}</span>
                            <span className={chosenLens.name === lens.name ? 'text-gold-400 font-mono' : 'text-slate-700 font-mono font-bold'}>
                              {lens.price === 0 ? 'Sem custo extra' : `+ R$ ${lens.price.toFixed(2)}`}
                            </span>
                          </div>
                          <p className={`text-[10px] leading-relaxed ${chosenLens.name === lens.name ? 'text-slate-300' : 'text-slate-500'}`}>
                            {lens.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-5 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleSendToQuote}
                    className="w-full py-3 border border-slate-900 hover:bg-slate-50 text-slate-900 font-sans text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Adicionar no Orçamento
                  </button>
                  <a
                    href={getWhatsAppMessageUrl(selectedFrame, chosenColor, chosenLens.name)}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Consultar no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
