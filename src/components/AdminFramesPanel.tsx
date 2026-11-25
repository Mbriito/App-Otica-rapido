import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  Upload,
  Trash2,
  Glasses,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  RefreshCw,
  ArrowLeft,
  Tag,
  UserCheck,
  FileText,
} from 'lucide-react';
import { EyewearFrame, OpticalQuote } from '../types';
import {
  createCustomFrame,
  deleteCustomFrame,
  fetchCustomFrames,
  fetchQuotes,
  subscribeToCustomFrames,
  uploadFrameImage,
} from '../services/supabaseService';
import AdminCustomerQuotes from './AdminCustomerQuotes';

interface AdminFramesPanelProps {
  onNavigateToCatalog: () => void;
  onOpenQuoteInManager: (quote: OpticalQuote) => void;
}

const FACE_SHAPES_OPTIONS = [
  'Rosto Redondo',
  'Rosto Oval',
  'Rosto Quadrado',
  'Rosto Coração',
  'Rosto Triangular',
  'Rosto Diamante',
  'Todos os Rostos',
];

const SHAPE_OPTIONS: Array<{ value: EyewearFrame['shape']; label: string }> = [
  { value: 'quadrado', label: 'Quadrado' },
  { value: 'oval', label: 'Oval' },
  { value: 'gatinho', label: 'De Gatinha (Cat-Eye)' },
  { value: 'redondo', label: 'Redondo' },
  { value: 'retangular', label: 'Retangular' },
  { value: 'aviador', label: 'Aviador' },
  { value: 'geometrico', label: 'Geométrico' },
];

export default function AdminFramesPanel({
  onNavigateToCatalog,
  onOpenQuoteInManager,
}: AdminFramesPanelProps) {
  const [adminTab, setAdminTab] = useState<'quotes' | 'frames'>('quotes');
  const [quotesCount, setQuotesCount] = useState<number>(0);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Ótica Rapido Exclusive');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<EyewearFrame['category']>('grau');
  const [gender, setGender] = useState<EyewearFrame['gender']>('unissex');
  const [shape, setShape] = useState<EyewearFrame['shape']>('quadrado');
  const [material, setMaterial] = useState<EyewearFrame['material']>('acetato');
  const [selectedFaceShapes, setSelectedFaceShapes] = useState<string[]>(['Rosto Redondo', 'Rosto Oval']);
  const [colorsInput, setColorsInput] = useState('Preto Clássico, Tartaruga Âmbar');
  const [description, setDescription] = useState('');
  const [referenceCode, setReferenceCode] = useState('');

  // Imagem (Upload ou URL)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customFrames, setCustomFrames] = useState<EyewearFrame[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchCustomFrames().then((frames) => {
      if (active) {
        setCustomFrames(frames);
        setIsLoadingList(false);
      }
    });

    fetchQuotes().then((quotes) => {
      if (active) {
        setQuotesCount(quotes.length);
      }
    });

    const unsubscribe = subscribeToCustomFrames((frames) => {
      if (active) {
        setCustomFrames(frames);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const toggleFaceShape = (faceShape: string) => {
    setSelectedFaceShapes((prev) => {
      if (faceShape === 'Todos os Rostos') {
        return prev.includes(faceShape) ? [] : ['Todos os Rostos'];
      }
      const withoutAll = prev.filter((item) => item !== 'Todos os Rostos');
      return withoutAll.includes(faceShape)
        ? withoutAll.filter((item) => item !== faceShape)
        : [...withoutAll, faceShape];
    });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Selecione um arquivo de imagem válido (JPG, PNG ou WEBP).' });
      return;
    }

    setImageFile(file);
    setFeedback(null);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !brand.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o nome e a marca da armação.' });
      return;
    }

    if (!imageFile && !imageUrlInput.trim()) {
      setFeedback({ type: 'error', message: 'Envie uma foto da armação ou informe a URL da imagem.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalImageUrl = imageFile
        ? await uploadFrameImage(imageFile)
        : imageUrlInput.trim();

      const faceRecommendationText =
        selectedFaceShapes.length > 0
          ? selectedFaceShapes.includes('Todos os Rostos')
            ? 'Harmoniza com todos os formatos de rosto'
            : `Ideal para ${selectedFaceShapes.map((s) => s.toLowerCase()).join(', ')}`
          : 'Indicado para uso diário personalizado';

      const colorsList = colorsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await createCustomFrame({
        name,
        brand,
        price: parseFloat(price.replace(',', '.')) || 0,
        category,
        gender,
        shape,
        material,
        imageUrl: finalImageUrl,
        colors: colorsList.length > 0 ? colorsList : ['Preto Clássico'],
        description:
          description.trim() ||
          `Armação ${shape} em ${material} da linha ${brand}. Disponível para atendimento online e prova a domicílio.`,
        faceRecommendation: faceRecommendationText,
        referenceCode: referenceCode.trim() || undefined,
      });

      setName('');
      setPrice('');
      setDescription('');
      setReferenceCode('');
      setImageFile(null);
      setImagePreview('');
      setImageUrlInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setFeedback({
        type: 'success',
        message: 'Armação cadastrada com sucesso! A vitrine do catálogo já foi atualizada em tempo real.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível cadastrar a armação. Verifique os dados e tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (frameId: string) => {
    await deleteCustomFrame(frameId);
    setFeedback({
      type: 'success',
      message: 'Armação removida do catálogo.',
    });
  };

  const activePreviewSrc = imagePreview || imageUrlInput.trim();

  return (
    <div className="py-6 space-y-8 text-left">
      {/* Admin Hero Header */}
      <div className="bg-sapphire-950 text-white rounded-3xl p-6 md:p-10 border border-sapphire-900 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] text-gold-400 font-semibold tracking-wider mb-2">
              Painel Administrativo · /admin
            </p>
            <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight text-white">
              Gestão de Orçamentos &amp; Catálogo
            </h2>
            <p className="font-sans text-slate-300 text-xs md:text-sm mt-2 max-w-2xl leading-relaxed">
              Crie orçamentos personalizados para clientes com envio direto pelo WhatsApp ou cobrança Pix/Link, e publique novas armações na vitrine em tempo real.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-slate-950 rounded-xl font-sans text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver Vitrine do Catálogo
          </button>
        </div>

        {/* Admin Module Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setAdminTab('quotes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'quotes'
                ? 'bg-gold-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Orçamentos de Clientes ({quotesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('frames')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'frames'
                ? 'bg-gold-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Glasses className="h-4 w-4" />
            <span>Catálogo de Armações ({customFrames.length})</span>
          </button>
        </div>
      </div>

      {adminTab === 'quotes' ? (
        <AdminCustomerQuotes
          customFrames={customFrames}
          onOpenQuoteInManager={onOpenQuoteInManager}
          onQuotesCountChange={setQuotesCount}
        />
      ) : (
        <>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* FORMULÁRIO DE CADASTRO (7 COLS) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-slate-900 text-gold-400 rounded-xl">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-slate-900">
                  Cadastrar Nova Armação
                </h3>
                <p className="text-[11px] text-slate-500">
                  Publicação instantânea no catálogo de clientes
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome do Modelo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Milano Acetate Premium"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Marca / Linha *
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Ótica Rapido Exclusive"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preço da Armação (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 389.90"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Código de Referência
              </label>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="Auto (ex: REF-ADM-101)"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EyewearFrame['category'])}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
              >
                <option value="grau">Armação de Grau</option>
                <option value="sol">Óculos de Sol UV400</option>
                <option value="esporte">Linha Esporte</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Formato da Armação *
              </label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as EyewearFrame['shape'])}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
              >
                {SHAPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Material
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value as EyewearFrame['material'])}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
              >
                <option value="acetato">Acetato Maciço</option>
                <option value="titanio">Titânio Leve</option>
                <option value="metal">Metal Fino</option>
                <option value="injetado">TR-90 / Injetado</option>
                <option value="madeira">Madeira Ecológica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Público
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as EyewearFrame['gender'])}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gold-500 outline-none"
              >
                <option value="unissex">Unissex</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
              </select>
            </div>
          </div>

          {/* Formatos de Rosto Compatíveis */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-gold-600" />
              Formatos de Rosto Compatíveis
            </label>
            <div className="flex flex-wrap gap-2">
              {FACE_SHAPES_OPTIONS.map((faceShape) => {
                const isSelected = selectedFaceShapes.includes(faceShape);
                return (
                  <button
                    key={faceShape}
                    type="button"
                    onClick={() => toggleFaceShape(faceShape)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sapphire-900 text-gold-400 border-sapphire-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {faceShape}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Cores Disponíveis (separadas por vírgula)
            </label>
            <input
              type="text"
              value={colorsInput}
              onChange={(e) => setColorsInput(e.target.value)}
              placeholder="Ex: Preto Clássico, Tartaruga Âmbar, Dourado"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
            />
          </div>

          {/* Upload de Imagem */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Imagem da Armação (Upload ou URL) *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-gold-500 rounded-2xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-gold-50/30 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFileChange}
                className="hidden"
              />
              {activePreviewSrc ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                  <img
                    src={activePreviewSrc}
                    alt="Pré-visualização"
                    className="w-28 h-20 object-cover rounded-xl border border-slate-200 bg-white flex-shrink-0"
                  />
                  <div className="flex-grow">
                    <p className="text-xs font-bold text-slate-800">
                      {imageFile ? imageFile.name : 'Imagem vinculada por URL'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Clique aqui para trocar a foto da armação.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <Upload className="h-7 w-7 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Clique para enviar foto da armação
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    JPG, PNG ou WEBP • Enviado para o Supabase Storage
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => {
                  setImageUrlInput(e.target.value);
                  if (e.target.value) {
                    setImageFile(null);
                    setImagePreview('');
                  }
                }}
                placeholder="Ou cole a URL direta da imagem (https://...)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Descrição Comercial / Diferenciais
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva acabamento, conforto nasal, dobradiças e estilo..."
              className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Publicando no Catálogo...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                Publicar Armação no Catálogo
              </>
            )}
          </button>
        </form>

        {/* LISTA EM TEMPO REAL DAS ARMAÇÕES CADASTRADAS (5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Glasses className="h-5 w-5 text-gold-600" />
              <div>
                <h3 className="font-display font-black text-base text-slate-900">
                  Armações Cadastradas ({customFrames.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sincronizado em tempo real com a vitrine
                </p>
              </div>
            </div>
          </div>

          {isLoadingList ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-gold-500" />
              Carregando modelos cadastrados...
            </div>
          ) : customFrames.length === 0 ? (
            <div className="py-12 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl my-auto">
              <Tag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Nenhuma armação personalizada cadastrada ainda
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Cadastre sua primeira armação ao lado para vê-la aparecer instantaneamente na vitrine principal.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[680px] pr-1">
              {customFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 hover:border-gold-300 transition-colors"
                >
                  <img
                    src={frame.imageUrl}
                    alt={frame.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-16 object-cover rounded-xl border border-slate-200 bg-white flex-shrink-0"
                  />
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-gold-700 uppercase">
                          {frame.referenceCode} • {frame.brand}
                        </span>
                        <h4 className="font-display font-bold text-xs text-slate-900 truncate">
                          {frame.name}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(frame.id)}
                        title="Remover armação"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px]">
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold text-slate-700 capitalize">
                        {frame.shape}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-mono font-bold">
                        {frame.price > 0
                          ? `R$ ${frame.price.toFixed(2).replace('.', ',')}`
                          : 'Sob Consulta'}
                      </span>
                    </div>
                    {frame.faceRecommendation && (
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                        {frame.faceRecommendation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
