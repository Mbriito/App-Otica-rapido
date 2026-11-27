import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  DollarSign,
  Save,
  RotateCcw,
  Search,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { AdminSession, EyewearFrame, OpticalQuote } from '../types';
import { MIN_FRAME_PRICE, premiumFrames } from '../data/frames';
import {
  createCustomFrame,
  deleteCustomFrame,
  fetchCatalogFrames,
  fetchQuotes,
  resetCatalogFramePrice,
  subscribeToCatalogUpdates,
  updateCatalogFramePrice,
  uploadFrameImage,
} from '../services/supabaseService';
import { formatBRL } from '../utils/quoteUtils';
import AdminCustomerQuotes from './AdminCustomerQuotes';
import OpticalImage from './OpticalImage';

interface AdminFramesPanelProps {
  adminSession: AdminSession;
  adminToken: string;
  onLogoutAdmin: () => void;
  onNavigateToCatalog: () => void;
  onOpenQuoteInManager: (quote: OpticalQuote) => void;
  onCreateNewQuoteInManager: () => void;
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
  adminSession,
  adminToken,
  onLogoutAdmin,
  onNavigateToCatalog,
  onOpenQuoteInManager,
  onCreateNewQuoteInManager,
}: AdminFramesPanelProps) {
  const [adminTab, setAdminTab] = useState<'quotes' | 'prices' | 'frames'>('prices');
  const [quotesCount, setQuotesCount] = useState<number>(0);

  // Catalog state (custom + standard with live overrides)
  const [customFrames, setCustomFrames] = useState<EyewearFrame[]>([]);
  const [allFrames, setAllFrames] = useState<EyewearFrame[]>(premiumFrames);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const savingPriceIdRef = useRef<string | null>(null);
  const [priceSearch, setPriceSearch] = useState('');
  const [priceCategoryFilter, setPriceCategoryFilter] = useState<'todos' | 'grau' | 'sol' | 'esporte'>('todos');

  // New custom frame form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Ótica Rapido Exclusive');
  const [price, setPrice] = useState('189.90');
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const syncPriceDraftsFromFrames = (frames: EyewearFrame[]) => {
    setPriceDrafts((prev) => {
      const next = { ...prev };
      for (const frame of frames) {
        if (!(frame.id in next)) {
          next[frame.id] = frame.price.toFixed(2);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    savingPriceIdRef.current = savingPriceId;
  }, [savingPriceId]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    let active = true;
    fetchCatalogFrames().then(({ customFrames: cf, priceOverrides: ov, allFrames: all }) => {
      if (!active) return;
      setCustomFrames(cf);
      setPriceOverrides(ov);
      setAllFrames(all);
      syncPriceDraftsFromFrames(all);
      setIsLoadingList(false);
    });

    fetchQuotes({ isAdmin: true }).then((quotes) => {
      if (active) {
        setQuotesCount(quotes.length);
      }
    });

    const unsubscribe = subscribeToCatalogUpdates(
      ({ customFrames: cf, priceOverrides: ov, allFrames: all }) => {
        if (!active) return;
        setCustomFrames(cf);
        setPriceOverrides(ov);
        setAllFrames(all);
        setPriceDrafts((prev) => {
          const next: Record<string, string> = {};
          for (const frame of all) {
            next[frame.id] =
              savingPriceIdRef.current === frame.id && prev[frame.id] !== undefined
                ? prev[frame.id]
                : frame.price.toFixed(2);
          }
          return next;
        });
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const filteredPriceFrames = useMemo(() => {
    const query = priceSearch.trim().toLowerCase();
    return allFrames.filter((frame) => {
      const matchCat =
        priceCategoryFilter === 'todos' || frame.category === priceCategoryFilter;
      if (!matchCat) return false;
      if (!query) return true;
      return (
        frame.name.toLowerCase().includes(query) ||
        (frame.referenceCode || '').toLowerCase().includes(query) ||
        frame.brand.toLowerCase().includes(query) ||
        frame.shape.toLowerCase().includes(query)
      );
    });
  }, [allFrames, priceSearch, priceCategoryFilter]);

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

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setFeedback(null);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleSaveIndividualPrice = async (frame: EyewearFrame) => {
    setFeedback(null);
    const rawValue = (priceDrafts[frame.id] ?? String(frame.price)).replace(',', '.');
    const numericPrice = parseFloat(rawValue);

    if (!Number.isFinite(numericPrice) || numericPrice < MIN_FRAME_PRICE) {
      setFeedback({
        type: 'error',
        message: `O preço de "${frame.name}" deve ser no mínimo ${formatBRL(MIN_FRAME_PRICE)}.`,
      });
      return;
    }

    setSavingPriceId(frame.id);
    try {
      const savedPrice = await updateCatalogFramePrice({
        frameId: frame.id,
        price: numericPrice,
        isCustom: Boolean(frame.isCustom),
        adminToken,
      });
      setPriceDrafts((prev) => ({
        ...prev,
        [frame.id]: savedPrice.toFixed(2),
      }));
      setFeedback({
        type: 'success',
        message: `Preço de "${frame.name}" (${frame.referenceCode || 'Modelo'}) atualizado para ${formatBRL(savedPrice)} na vitrine em tempo real.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Não foi possível atualizar o preço da armação.',
      });
    } finally {
      setSavingPriceId(null);
    }
  };

  const handleResetStandardPrice = async (frame: EyewearFrame) => {
    setFeedback(null);
    setSavingPriceId(frame.id);
    try {
      await resetCatalogFramePrice(frame.id, adminToken);
      const original = premiumFrames.find((f) => f.id === frame.id);
      if (original) {
        setPriceDrafts((prev) => ({
          ...prev,
          [frame.id]: original.price.toFixed(2),
        }));
      }
      setFeedback({
        type: 'success',
        message: `Preço padrão de "${frame.name}" restaurado (${formatBRL(original?.price || MIN_FRAME_PRICE)}).`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Não foi possível restaurar o preço padrão.',
      });
    } finally {
      setSavingPriceId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !brand.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o nome e a marca da armação.' });
      return;
    }

    const numericPrice = parseFloat(price.replace(',', '.'));
    if (!Number.isFinite(numericPrice) || numericPrice < MIN_FRAME_PRICE) {
      setFeedback({
        type: 'error',
        message: `Informe um preço válido a partir de ${formatBRL(MIN_FRAME_PRICE)}.`,
      });
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

      await createCustomFrame(
        {
          name,
          brand,
          price: numericPrice,
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
        },
        adminToken
      );

      setName('');
      setPrice('189.90');
      setDescription('');
      setReferenceCode('');
      setImageFile(null);
      setImagePreview('');
      setImageUrlInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setFeedback({
        type: 'success',
        message: `Armação cadastrada por ${formatBRL(numericPrice)}! A vitrine do catálogo já foi atualizada em tempo real.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Não foi possível cadastrar a armação. Verifique os dados e tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (frameId: string) => {
    setFeedback(null);
    try {
      await deleteCustomFrame(frameId, adminToken);
      setFeedback({
        type: 'success',
        message: 'Armação removida do catálogo.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Não foi possível remover a armação.',
      });
    }
  };

  const activePreviewSrc = imagePreview || imageUrlInput.trim();

  return (
    <div className="py-6 space-y-8 text-left">
      {/* Admin Hero Header */}
      <div className="bg-sapphire-950 text-white rounded-3xl p-6 md:p-10 border border-sapphire-900 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[11px] text-gold-400 font-semibold tracking-wider">
                Painel Administrativo · /admin
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                <ShieldCheck className="h-3 w-3" />
                ADM: {adminSession.email}
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight text-white">
              Gestão de Preços, Catálogo &amp; Orçamentos
            </h2>
            <p className="font-sans text-slate-300 text-xs md:text-sm mt-2 max-w-2xl leading-relaxed">
              Área exclusiva para ADM autenticado: edite o preço individual de cada armação (a partir de R$ 120,00), cadastre novos modelos e gerencie orçamentos de clientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-slate-950 rounded-xl font-sans text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver Vitrine
            </button>
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="px-4 py-2.5 bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-slate-200 hover:text-rose-200 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" />
              Sair do ADM
            </button>
          </div>
        </div>

        {/* Admin Module Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => {
              setAdminTab('prices');
              setFeedback(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'prices'
                ? 'bg-gold-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Preços por Modelo ({allFrames.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAdminTab('frames');
              setFeedback(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'frames'
                ? 'bg-gold-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Glasses className="h-4 w-4" />
            <span>Cadastrar Armação ({customFrames.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAdminTab('quotes');
              setFeedback(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'quotes'
                ? 'bg-gold-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Orçamentos de Clientes ({quotesCount})</span>
          </button>
        </div>
      </div>

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

      {/* TAB 1: GESTÃO INDIVIDUAL DE PREÇOS POR MODELO */}
      {adminTab === 'prices' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-display font-black text-xl text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gold-600" />
                Tabela de Preços Individual por Modelo
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Altere o valor de cada armação de forma individual (valor mínimo obrigatório: {formatBRL(MIN_FRAME_PRICE)}). As alterações atualizam o catálogo e os orçamentos imediatamente.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={priceSearch}
                  onChange={(e) => setPriceSearch(e.target.value)}
                  placeholder="Buscar por código, nome ou formato..."
                  className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
              <select
                value={priceCategoryFilter}
                onChange={(e) =>
                  setPriceCategoryFilter(
                    e.target.value as 'todos' | 'grau' | 'sol' | 'esporte'
                  )
                }
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 outline-none"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="grau">Somente Grau</option>
                <option value="sol">Somente Solar UV400</option>
                <option value="esporte">Somente Esportivo</option>
              </select>
            </div>
          </div>

          {isLoadingList ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-gold-500" />
              Carregando modelos do catálogo...
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPriceFrames.map((frame) => {
                const draftVal = priceDrafts[frame.id] ?? frame.price.toFixed(2);
                const parsedDraft = parseFloat(draftVal.replace(',', '.'));
                const isModified =
                  Number.isFinite(parsedDraft) && Math.abs(parsedDraft - frame.price) > 0.009;
                const hasStandardOverride = !frame.isCustom && frame.id in priceOverrides;
                const isSavingThis = savingPriceId === frame.id;

                return (
                  <div
                    key={frame.id}
                    className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gold-300 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <OpticalImage
                        src={frame.imageUrl}
                        alt={frame.name}
                        variant="thumb"
                        className="w-20 h-16 object-cover object-center rounded-xl border border-slate-200 bg-white flex-shrink-0"
                        fallbackClassName="w-20 h-16 rounded-xl flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-mono font-bold text-gold-700 bg-gold-50 border border-gold-200/80 px-2 py-0.5 rounded uppercase">
                            {frame.referenceCode || 'CATÁLOGO'}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              frame.category === 'sol'
                                ? 'bg-amber-100 text-amber-900'
                                : frame.category === 'esporte'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {frame.category === 'sol'
                              ? 'Solar UV400'
                              : frame.category === 'esporte'
                                ? 'Esportivo'
                                : 'Grau'}
                          </span>
                          {frame.isCustom && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Personalizada
                            </span>
                          )}
                          {hasStandardOverride && (
                            <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                              Preço editado ADM
                            </span>
                          )}
                        </div>
                        <h4 className="font-display font-bold text-sm text-slate-900 truncate">
                          {frame.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 capitalize">
                          {frame.brand} · Formato {frame.shape} · {frame.material}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <label
                          htmlFor={`price-${frame.id}`}
                          className="text-[10px] font-mono uppercase text-slate-500 font-bold mb-1"
                        >
                          Preço (mín. R$ 120)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-500">R$</span>
                          <input
                            id={`price-${frame.id}`}
                            type="number"
                            min={MIN_FRAME_PRICE}
                            step="0.01"
                            value={draftVal}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({
                                ...prev,
                                [frame.id]: e.target.value,
                              }))
                            }
                            className="w-28 text-right px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold tabular-nums focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end">
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSaveIndividualPrice(frame)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isModified
                              ? 'bg-sapphire-950 hover:bg-sapphire-900 text-gold-400 shadow-sm'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          }`}
                        >
                          {isSavingThis ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          <span>Salvar</span>
                        </button>

                        {hasStandardOverride && (
                          <button
                            type="button"
                            disabled={isSavingThis}
                            onClick={() => handleResetStandardPrice(frame)}
                            title="Restaurar preço padrão de fábrica"
                            className="p-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORÇAMENTOS DE CLIENTES */}
      {adminTab === 'quotes' && (
        <AdminCustomerQuotes
          adminToken={adminToken}
          onOpenQuoteInManager={onOpenQuoteInManager}
          onCreateNewQuoteInManager={onCreateNewQuoteInManager}
          onQuotesCountChange={setQuotesCount}
        />
      )}

      {/* TAB 3: CADASTRO DE NOVAS ARMAÇÕES */}
      {adminTab === 'frames' && (
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
                    Publicação instantânea no catálogo com preço individual (mínimo R$ 120,00)
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
                  Preço da Armação (R$) *
                </label>
                <input
                  type="number"
                  required
                  min={MIN_FRAME_PRICE}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 189.90"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                />
                <span className="block text-[10px] text-slate-500 mt-1">
                  Valor mínimo: {formatBRL(MIN_FRAME_PRICE)}
                </span>
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
                    <OpticalImage
                      src={activePreviewSrc}
                      alt="Pré-visualização da armação"
                      variant="thumb"
                      loading="eager"
                      className="w-28 h-20 object-cover object-center rounded-xl border border-slate-200 bg-white flex-shrink-0"
                      fallbackClassName="w-28 h-20 rounded-xl flex-shrink-0"
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

          {/* LISTA EM TEMPO REAL DAS ARMAÇÕES PERSONALIZADAS CADASTRADAS (5 COLS) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Glasses className="h-5 w-5 text-gold-600" />
                <div>
                  <h3 className="font-display font-black text-base text-slate-900">
                    Armações Personalizadas ({customFrames.length})
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
                  Cadastre sua primeira armação ao lado ou edite os valores dos 19 modelos do catálogo na aba &ldquo;Preços por Modelo&rdquo;.
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[680px] pr-1">
                {customFrames.map((frame) => (
                  <div
                    key={frame.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 hover:border-gold-300 transition-colors"
                  >
                    <OpticalImage
                      src={frame.imageUrl}
                      alt={frame.name}
                      variant="thumb"
                      className="w-20 h-16 object-cover object-center rounded-xl border border-slate-200 bg-white flex-shrink-0"
                      fallbackClassName="w-20 h-16 rounded-xl flex-shrink-0"
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
                          {formatBRL(Math.max(MIN_FRAME_PRICE, frame.price))}
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
      )}
    </div>
  );
}
