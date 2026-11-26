import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  RotateCcw,
  Eye,
  Trash2,
  ArrowRight,
  Save,
  History,
} from 'lucide-react';
import { CustomerSession, MedicalPrescription, SavedPrescriptionRecord } from '../types';
import {
  fetchPrescriptions,
  savePrescriptionRecord,
  subscribeToPrescriptions,
} from '../services/supabaseService';
import { formatDateBR } from '../utils/quoteUtils';

interface PrescriptionUploadProps {
  onPrescriptionAdded: (prescription: MedicalPrescription) => void;
  onPrescriptionSaved?: (prescription: MedicalPrescription) => void;
  customerSession?: CustomerSession | null;
  onRequestLogin?: () => void;
  onOpenLgpdPolicy?: () => void;
}

interface PrescriptionReadResponse {
  isValidPrescription: boolean;
  patientName: string;
  doctorName: string;
  doctorCrm: string;
  date: string;
  od: {
    spherical: string;
    cylindrical: string;
    axis: string;
    dnp: string;
    addition: string;
  };
  oe: {
    spherical: string;
    cylindrical: string;
    axis: string;
    dnp: string;
    addition: string;
  };
  observation: string;
  confidenceNote: string;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PDF_OCR_BYTES = 4 * 1024 * 1024; // 4MB safe limit for serverless JSON payloads
const TARGET_MAX_BASE64_CHARS = 950_000; // ~700KB decoded, safe for all reverse proxies & Vercel

function inferMimeType(file: File): string {
  const direct = (file.type || '').toLowerCase().trim();
  const lowerName = file.name.toLowerCase();

  if (
    direct === 'image/heic' ||
    direct === 'image/heif' ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  ) {
    return 'image/heic';
  }

  if (direct) {
    return direct === 'image/jpg' ? 'image/jpeg' : direct;
  }
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  return '';
}

function resolvePrescriptionReadUrl(): string {
  const customBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (customBase) {
    return `${customBase.replace(/\/+$/, '')}/api/prescriptions/read`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL('/api/prescriptions/read', window.location.origin).toString();
  }
  return '/api/prescriptions/read';
}

function formatNonJsonDiagnostic(
  status: number,
  statusText: string,
  contentType: string,
  rawBody: string
): string {
  const plainSnippet = rawBody
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  let hint = 'O servidor retornou uma resposta inesperada (não JSON).';
  if (status === 413) {
    hint = 'A imagem enviada ficou acima do limite aceito pelo servidor. Tente enviar uma foto mais leve.';
  } else if (status === 404) {
    hint = 'Rota de leitura automática (/api/prescriptions/read) indisponível neste ambiente.';
  } else if (status === 502 || status === 503 || status === 504) {
    hint = 'O servidor demorou para responder. Tente novamente em instantes ou preencha os campos manualmente.';
  } else if (status === 401 || status === 403) {
    hint = 'Acesso bloqueado ao chamar a rota de leitura automática.';
  }

  const statusLabel = `HTTP ${status}${statusText ? ` ${statusText}` : ''}`;
  const typeLabel = contentType ? ` (${contentType.split(';')[0].trim()})` : '';
  const snippetLabel = plainSnippet ? ` — Trecho: "${plainSnippet}"` : '';

  return `${hint} [${statusLabel}${typeLabel}]${snippetLabel}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

async function prepareFileForOcr(file: File): Promise<{ base64: string; mimeType: string }> {
  const inferredMime = inferMimeType(file);
  const dataUrl = await readFileAsDataUrl(file);

  if (inferredMime === 'application/pdf') {
    return { base64: dataUrl, mimeType: 'application/pdf' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const renderScaledJpeg = (maxDim: number, quality: number): string | null => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
      };

      const firstPass = renderScaledJpeg(1400, 0.82);
      if (firstPass && firstPass.length <= TARGET_MAX_BASE64_CHARS) {
        resolve({ base64: firstPass, mimeType: 'image/jpeg' });
        return;
      }

      const secondPass = renderScaledJpeg(1100, 0.7);
      if (secondPass) {
        resolve({ base64: secondPass, mimeType: 'image/jpeg' });
        return;
      }

      resolve({ base64: dataUrl, mimeType: inferredMime || 'image/jpeg' });
    };
    img.onerror = () => {
      resolve({ base64: dataUrl, mimeType: inferredMime || 'image/jpeg' });
    };
    img.src = dataUrl;
  });
}

export default function PrescriptionUpload({
  onPrescriptionAdded,
  onPrescriptionSaved,
  customerSession,
  onRequestLogin,
  onOpenLgpdPolicy,
}: PrescriptionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confidenceNote, setConfidenceNote] = useState<string | null>(null);
  const [lgpdConsent, setLgpdConsent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedPrescription, setLastSavedPrescription] =
    useState<SavedPrescriptionRecord | null>(null);
  const [savedList, setSavedList] = useState<SavedPrescriptionRecord[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    detail?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prescription, setPrescription] = useState<MedicalPrescription>({
    patientName: '',
    doctorName: '',
    doctorCrm: '',
    date: new Date().toISOString().split('T')[0],
    od: { spherical: '0.00', cylindrical: '0.00', axis: '0', dnp: '', addition: '' },
    oe: { spherical: '0.00', cylindrical: '0.00', axis: '0', dnp: '', addition: '' },
    observation: '',
  });

  useEffect(() => {
    let active = true;
    fetchPrescriptions().then((records) => {
      if (active) setSavedList(records);
    });
    const unsubscribe = subscribeToPrescriptions((records) => {
      if (active) setSavedList(records);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (customerSession?.fullName) {
      setPrescription((prev) =>
        prev.patientName ? prev : { ...prev, patientName: customerSession.fullName }
      );
    }
  }, [customerSession]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      void processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      void processFile(selected);
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFile(null);
    setScanComplete(false);
    setScanError(null);
    setConfidenceNote(null);
  };

  const processFile = async (selectedFile: File) => {
    setScanError(null);
    setConfidenceNote(null);
    setSaveFeedback(null);

    if (selectedFile.size === 0) {
      setScanError('O arquivo selecionado está vazio (0 bytes). Escolha outra foto ou PDF.');
      return;
    }

    const detectedMime = inferMimeType(selectedFile);
    if (detectedMime === 'image/heic') {
      setScanError(
        'Formato HEIC (iPhone) não é aceito diretamente. Tire um print da receita ou salve em JPG, PNG ou PDF e envie novamente.'
      );
      return;
    }

    const isPdf = detectedMime === 'application/pdf';
    const isImage =
      detectedMime === 'image/jpeg' ||
      detectedMime === 'image/png' ||
      detectedMime === 'image/webp' ||
      detectedMime === 'image/gif';

    if (!isImage && !isPdf) {
      setScanError('Formato não suportado. Envie uma imagem (JPG, PNG, WEBP) ou arquivo PDF.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setScanError('O arquivo ultrapassa o limite de 10MB. Envie uma imagem ou PDF mais leve.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(isImage ? URL.createObjectURL(selectedFile) : null);
    setFile(selectedFile);

    if (isPdf && selectedFile.size > MAX_PDF_OCR_BYTES) {
      setScanComplete(false);
      setScanError(
        'PDF anexado com sucesso, mas excede 4MB para leitura automática. Preencha os graus ao lado e salve normalmente.'
      );
      return;
    }

    setIsScanning(true);
    setScanComplete(false);

    try {
      const { base64, mimeType } = await prepareFileForOcr(selectedFile);
      const endpointUrl = resolvePrescriptionReadUrl();

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          fileBase64: base64,
          mimeType,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const rawBody = await response.text();
      const isJsonResponse = contentType.toLowerCase().includes('application/json');

      let data: PrescriptionReadResponse | null = null;
      if (isJsonResponse && rawBody.trim()) {
        try {
          data = JSON.parse(rawBody) as PrescriptionReadResponse;
        } catch {
          data = null;
        }
      }

      if (!isJsonResponse || !data) {
        throw new Error(
          formatNonJsonDiagnostic(response.status, response.statusText, contentType, rawBody)
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Não foi possível ler a receita enviada (HTTP ${response.status}). Você pode preencher os valores manualmente ao lado.`
        );
      }

      if (!data.isValidPrescription) {
        setScanError(
          data.confidenceNote ||
            'O arquivo anexado não parece ser uma receita oftalmológica legível. Envie uma foto mais nítida ou preencha os campos manualmente.'
        );
        return;
      }

      setPrescription((prev) => ({
        patientName: data.patientName?.trim() || prev.patientName || customerSession?.fullName || '',
        doctorName: data.doctorName?.trim() || prev.doctorName || '',
        doctorCrm: data.doctorCrm?.trim() || prev.doctorCrm || '',
        date:
          data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date.trim())
            ? data.date.trim()
            : prev.date,
        od: {
          spherical: sanitizeDiopterInput(data.od?.spherical || '0.00') || '0.00',
          cylindrical: sanitizeDiopterInput(data.od?.cylindrical || '0.00') || '0.00',
          axis: sanitizeAxisInput(data.od?.axis || '0') || '0',
          dnp: data.od?.dnp?.trim() || '',
          addition: data.od?.addition?.trim() || '',
        },
        oe: {
          spherical: sanitizeDiopterInput(data.oe?.spherical || '0.00') || '0.00',
          cylindrical: sanitizeDiopterInput(data.oe?.cylindrical || '0.00') || '0.00',
          axis: sanitizeAxisInput(data.oe?.axis || '0') || '0',
          dnp: data.oe?.dnp?.trim() || '',
          addition: data.oe?.addition?.trim() || '',
        },
        observation: data.observation?.trim() || '',
      }));

      if (data.confidenceNote?.trim()) {
        setConfidenceNote(data.confidenceNote.trim());
      }
      setScanComplete(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao realizar a leitura automática da receita. O arquivo continua anexado — você pode tentar novamente ou digitar os valores ao lado.';
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const sanitizeDiopterInput = (raw: string): string => {
    const cleaned = raw.replace(/[^0-9+\-.,]/g, '');
    const sign = cleaned.startsWith('+') || cleaned.startsWith('-') ? cleaned[0] : '';
    const body = cleaned.slice(sign ? 1 : 0).replace(/[+\-]/g, '');

    const sepMatch = body.match(/[.,]/);
    let formatted = body;
    if (sepMatch && sepMatch.index !== undefined) {
      const sep = sepMatch[0];
      const intPart = body.slice(0, sepMatch.index).replace(/[.,]/g, '');
      const decPart = body.slice(sepMatch.index + 1).replace(/[.,]/g, '').slice(0, 2);
      formatted = `${intPart}${sep}${decPart}`;
    }

    return `${sign}${formatted}`.slice(0, 6);
  };

  const sanitizeAxisInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    if (!digits) return '';
    const num = parseInt(digits, 10);
    return num > 180 ? '180' : String(num);
  };

  const handleInputChange = (
    eye: 'od' | 'oe',
    field: 'spherical' | 'cylindrical' | 'axis' | 'dnp' | 'addition',
    value: string
  ) => {
    const sanitizedValue =
      field === 'spherical' || field === 'cylindrical'
        ? sanitizeDiopterInput(value)
        : field === 'axis'
          ? sanitizeAxisInput(value)
          : value;

    setPrescription((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: sanitizedValue,
      },
    }));
  };

  const handleGeneralChange = (
    field: 'patientName' | 'doctorName' | 'doctorCrm' | 'date' | 'observation',
    value: string
  ) => {
    setPrescription((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const persistPrescription = async (redirectToQuotes: boolean) => {
    setSaveFeedback(null);

    if (!prescription.patientName.trim()) {
      setSaveFeedback({
        type: 'error',
        text: 'Informe o nome completo do paciente antes de salvar a receita.',
      });
      return;
    }

    if (!lgpdConsent) {
      setSaveFeedback({
        type: 'error',
        text: 'Confirme o consentimento LGPD para proteger e registrar sua receita médica.',
      });
      return;
    }

    const normalizedPrescription: MedicalPrescription = {
      ...prescription,
      patientName: prescription.patientName.trim(),
      doctorName: prescription.doctorName.trim(),
      doctorCrm: prescription.doctorCrm.trim(),
      date: prescription.date || new Date().toISOString().split('T')[0],
      od: {
        ...prescription.od,
        spherical: (prescription.od.spherical || '0.00').trim().replace(',', '.') || '0.00',
        cylindrical: (prescription.od.cylindrical || '0.00').trim().replace(',', '.') || '0.00',
        axis: (prescription.od.axis || '0').trim() || '0',
      },
      oe: {
        ...prescription.oe,
        spherical: (prescription.oe.spherical || '0.00').trim().replace(',', '.') || '0.00',
        cylindrical: (prescription.oe.cylindrical || '0.00').trim().replace(',', '.') || '0.00',
        axis: (prescription.oe.axis || '0').trim() || '0',
      },
      fileAttached: file
        ? {
            name: file.name,
            size: `${Math.max(0.1, file.size / 1024).toFixed(1)} KB`,
            type: inferMimeType(file) || file.type || 'application/octet-stream',
          }
        : undefined,
    };

    setIsSaving(true);
    try {
      const result = await savePrescriptionRecord({
        prescription: normalizedPrescription,
        file,
        customer: customerSession,
        lgpdConsent,
      });

      setLastSavedPrescription(result.record);
      setPrescription(result.record);
      onPrescriptionSaved?.(result.record);

      const storageNote =
        result.persistedTo === 'supabase'
          ? result.fileUploaded
            ? 'Dados e anexo salvos com sigilo LGPD no banco de dados.'
            : 'Dados salvos com sigilo LGPD no banco de dados.'
          : result.warning || 'Receita salva com segurança e pronta para uso nos orçamentos.';

      setSaveFeedback({
        type: 'success',
        text: `Receita de ${result.record.patientName} salva com sucesso!`,
        detail: storageNote,
      });

      if (redirectToQuotes) {
        onPrescriptionAdded(result.record);
      }
    } catch (err: unknown) {
      setSaveFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível salvar a receita. Verifique os campos e tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistPrescription(false);
  };

  const handleLoadSavedIntoForm = (record: SavedPrescriptionRecord) => {
    handleRemoveAttachment();
    setPrescription({
      patientName: record.patientName,
      doctorName: record.doctorName,
      doctorCrm: record.doctorCrm,
      date: record.date,
      od: { ...record.od },
      oe: { ...record.oe },
      observation: record.observation || '',
      fileAttached: record.fileAttached,
    });
    setLastSavedPrescription(record);
    setSaveFeedback({
      type: 'success',
      text: `Receita de ${record.patientName} carregada para conferência.`,
    });
  };

  const getWhatsAppPrescriptionUrl = () => {
    const text = `Olá! Preciso de ajuda com a leitura da minha receita na Ótica Rapido:\n\n*Paciente:* ${
      prescription.patientName || 'Não Informado'
    }\n*Olho Direito (OD):* Esf: ${prescription.od.spherical || '0.00'} / Cil: ${
      prescription.od.cylindrical || '0.00'
    } / Eixo: ${prescription.od.axis || '0'}°\n*Olho Esquerdo (OE):* Esf: ${
      prescription.oe.spherical || '0.00'
    } / Cil: ${prescription.oe.cylindrical || '0.00'} / Eixo: ${prescription.oe.axis || '0'}°`;
    return `https://wa.me/5511947069414?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="py-8 max-w-5xl mx-auto space-y-8">
      {/* Introduction */}
      <div className="text-center">
        <span className="text-gold-600 font-mono text-xs uppercase tracking-widest font-semibold">
          Leitura Óptica por Imagem e PDF
        </span>
        <h2 className="font-display font-extrabold text-3xl text-slate-900 mt-1">
          Leitor Inteligente de Receita
        </h2>
        <p className="font-sans text-slate-500 text-sm mt-2 max-w-2xl mx-auto">
          Anexe a foto ou PDF da sua receita oftalmológica para leitura automática ou digite os graus manualmente. Depois de salvar, envie direto para a Central de Orçamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Upload Drag Frame */}
        <div className="md:col-span-5 flex flex-col justify-start gap-4">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!file && !isScanning) triggerFileInput();
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[290px] bg-white ${
              isDragging
                ? 'border-gold-500 bg-gold-50/60 scale-[1.01]'
                : file
                  ? 'border-gold-400 bg-gold-50/20'
                  : 'border-slate-300 hover:border-gold-400 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
            />

            {!file ? (
              <div className="w-full flex flex-col items-center">
                <div className="p-4 bg-slate-100 rounded-full text-slate-500 mb-4">
                  <Upload className="h-8 w-8 text-slate-600" />
                </div>
                <h4 className="font-sans font-bold text-sm text-slate-800">
                  {isDragging ? 'Solte a receita aqui para ler' : 'Anexar Receita (Foto ou PDF)'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos aceitos: JPG, PNG, WEBP e PDF (até 10MB)
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                  }}
                  className="mt-6 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Selecionar Arquivo
                </button>
              </div>
            ) : (
              <div className="w-full text-left space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="p-2.5 bg-gold-400/15 text-gold-700 rounded-lg flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden flex-grow">
                    <h4
                      className="font-sans font-bold text-xs text-slate-800 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {(file.size / 1024).toFixed(1)} KB ·{' '}
                      {inferMimeType(file) === 'application/pdf' ? 'PDF' : 'Imagem'}
                    </p>
                  </div>
                  {!isScanning && (
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      title="Remover anexo"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Image Preview so user can compare directly with extracted fields */}
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5">
                    <img
                      src={previewUrl}
                      alt="Pré-visualização da receita enviada"
                      className="w-full max-h-48 object-contain bg-slate-100"
                    />
                  </div>
                )}

                {isScanning && (
                  <div className="flex flex-col items-center py-5 text-center">
                    <RefreshCw className="h-7 w-7 text-gold-600 animate-spin mb-3" />
                    <p className="text-xs font-bold text-slate-800">
                      Lendo receita oftalmológica...
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Extraindo graus esférico, cilíndrico e eixos do arquivo anexado
                    </p>
                  </div>
                )}

                {!isScanning && scanError && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl">
                      <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <strong className="block font-bold">Aviso na leitura automática</strong>
                        <span>{scanError}</span>
                        <span className="block mt-1 text-[11px] text-rose-700">
                          O arquivo continua anexado — você pode preencher os graus ao lado e salvar normalmente.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void processFile(file)}
                        className="py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Tentar Novamente
                      </button>
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="py-2 px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-300 rounded-xl bg-white transition-colors cursor-pointer"
                      >
                        Trocar Arquivo
                      </button>
                    </div>
                  </div>
                )}

                {!isScanning && scanComplete && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <strong className="block font-bold">Leitura concluída com sucesso</strong>
                        <span>
                          Confira os dados ao lado e clique em &ldquo;Salvar Receita&rdquo;.
                        </span>
                      </div>
                    </div>

                    {confidenceNote && (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                        <Eye className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{confidenceNote}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="py-2 px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-300 rounded-xl bg-white transition-all cursor-pointer"
                      >
                        Trocar Arquivo
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="py-2 px-3 text-xs font-semibold text-rose-700 hover:text-rose-900 border border-rose-200 hover:border-rose-300 rounded-xl bg-rose-50/50 transition-all cursor-pointer"
                      >
                        Remover Anexo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!file && scanError && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs text-left">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Quick Notice about Privacy */}
          <div className="p-4 bg-slate-100/70 rounded-xl border border-slate-200/70 text-left">
            <h5 className="text-xs font-sans font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
              Segurança e Privacidade LGPD
            </h5>
            <p className="text-[11px] font-sans text-slate-600 leading-relaxed">
              Sua imagem é processada exclusivamente para extrair os graus oftalmológicos e só é gravada com seu consentimento explícito para confecção das lentes.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Prescription parameters fields */}
        <div className="md:col-span-7">
          <form
            noValidate
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm text-left"
          >
            <h3 className="font-display font-extrabold text-lg text-[#0E1624] mb-1">
              Dados Optométricos da Receita
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Certifique-se de que os valores coincidem com o documento assinado pelo oftalmologista.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome conforme consta na receita"
                  value={prescription.patientName}
                  onChange={(e) => handleGeneralChange('patientName', e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Médico Oftalmologista
                </label>
                <input
                  type="text"
                  placeholder="Dr(a). Nome do profissional"
                  value={prescription.doctorName}
                  onChange={(e) => handleGeneralChange('doctorName', e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  CRM / Registro
                </label>
                <input
                  type="text"
                  placeholder="Ex: CRM-SP 124890"
                  value={prescription.doctorCrm}
                  onChange={(e) => handleGeneralChange('doctorCrm', e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Data da Consulta
                </label>
                <input
                  type="date"
                  value={prescription.date}
                  onChange={(e) => handleGeneralChange('date', e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                />
              </div>
            </div>

            {/* OLHO DIREITO (OD) */}
            <div className="mb-5">
              <h4 className="text-xs font-bold tracking-wide text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg mb-3">
                Olho Direito (OD)
              </h4>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-24 max-w-[104px]">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 leading-tight">
                    Esférico
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={prescription.od.spherical}
                    onChange={(e) => handleInputChange('od', 'spherical', e.target.value)}
                    className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-slate-800 bg-slate-50/50 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
                <div className="w-24 max-w-[104px]">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 leading-tight">
                    Cilíndrico
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={prescription.od.cylindrical}
                    onChange={(e) => handleInputChange('od', 'cylindrical', e.target.value)}
                    className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
                <div className="w-24 max-w-[104px]">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 leading-tight">
                    Eixo (°)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    inputMode="numeric"
                    placeholder="0–180"
                    value={prescription.od.axis}
                    onChange={(e) => handleInputChange('od', 'axis', e.target.value)}
                    className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* OLHO ESQUERDO (OE) */}
            <div className="mb-6">
              <h4 className="text-xs font-bold tracking-wide text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg mb-3">
                Olho Esquerdo (OE)
              </h4>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-24 max-w-[104px]">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 leading-tight">
                    Esférico
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={prescription.oe.spherical}
                    onChange={(e) => handleInputChange('oe', 'spherical', e.target.value)}
                    className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-slate-800 bg-slate-50/50 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
                <div className="w-24 max-w-[104px]">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 leading-tight">
                    Cilíndrico
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={prescription.oe.cylindrical}
                    onChange={(e) => handleInputChange('oe', 'cylindrical', e.target.value)}
                    className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
                <div className="w-24 max-w-[104px]">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 leading-tight">
                    Eixo (°)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    inputMode="numeric"
                    placeholder="0–180"
                    value={prescription.oe.axis}
                    onChange={(e) => handleInputChange('oe', 'axis', e.target.value)}
                    className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Observations text */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Observações / Recomendações da Receita
              </label>
              <textarea
                rows={2}
                value={prescription.observation}
                onChange={(e) => handleGeneralChange('observation', e.target.value)}
                placeholder="Ex: Lentes multifocais, filtro azul, uso contínuo..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none font-sans"
              />
            </div>

            {/* Customer quick-link + LGPD Consent */}
            {!customerSession && onRequestLogin && (
              <div className="mb-4 p-3 bg-gold-50/70 border border-gold-200 rounded-xl flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-700">
                  Deseja vincular esta receita ao seu WhatsApp ou E-mail para acesso rápido?
                </span>
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="px-3 py-1.5 bg-sapphire-900 text-gold-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 flex-shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Identificar-se
                </button>
              </div>
            )}

            <label className="flex items-start gap-2.5 p-3 mb-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={(e) => setLgpdConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sapphire-900 focus:ring-gold-500"
              />
              <span className="text-[11px] text-slate-600 leading-relaxed">
                Autorizo o armazenamento seguro desta receita (dado sensível de saúde — Art. 11 da LGPD) exclusivamente para cálculo e confecção das minhas lentes conforme a{' '}
                {onOpenLgpdPolicy ? (
                  <button
                    type="button"
                    onClick={onOpenLgpdPolicy}
                    className="text-gold-700 font-bold underline cursor-pointer"
                  >
                    Política LGPD
                  </button>
                ) : (
                  'Política LGPD'
                )}
                .
              </span>
            </label>

            {saveFeedback && (
              <div
                className={`mb-4 p-3.5 rounded-xl border text-xs space-y-2 ${
                  saveFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {saveFeedback.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-bold">{saveFeedback.text}</strong>
                    {saveFeedback.detail && (
                      <span className="block text-[11px] opacity-85 mt-0.5">
                        {saveFeedback.detail}
                      </span>
                    )}
                  </div>
                </div>

                {saveFeedback.type === 'success' && lastSavedPrescription && (
                  <button
                    type="button"
                    onClick={() => onPrescriptionAdded(lastSavedPrescription)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-gold-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Ir para Orçamentos com esta Receita</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving || isScanning}
                className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-900 disabled:opacity-60 text-slate-900 font-sans font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Receita'}</span>
              </button>
              <button
                type="button"
                disabled={isSaving || isScanning}
                onClick={() => void persistPrescription(true)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-gold-400 font-sans font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSaving ? 'Salvando...' : 'Salvar e Montar Orçamento'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>Dúvidas para ler algum número da sua receita?</span>
              <a
                href={getWhatsAppPrescriptionUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Tirar dúvida no WhatsApp
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* RECENTLY SAVED PRESCRIPTIONS */}
      {savedList.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-xs text-left">
          <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gold-600" />
              <h3 className="font-display font-bold text-sm text-slate-900">
                Receitas Salvas ({savedList.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Clique para revisar ou enviar direto para a aba Orçamentos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedList.slice(0, 6).map((rx) => (
              <div
                key={rx.id}
                className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {rx.patientName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 flex-shrink-0">
                      {formatDateBR(rx.date)}
                    </span>
                  </div>
                  <p className="font-mono tabular-nums text-[11px] text-slate-600 mt-1">
                    OD: {rx.od.spherical} / {rx.od.cylindrical} ({rx.od.axis}°) · OE:{' '}
                    {rx.oe.spherical} / {rx.oe.cylindrical} ({rx.oe.axis}°)
                  </p>
                  {rx.fileAttached?.name && (
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      Anexo: {rx.fileAttached.name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLoadSavedIntoForm(rx)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Editar / Conferir
                  </button>
                  <button
                    type="button"
                    onClick={() => onPrescriptionAdded(rx)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-gold-400 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Usar no Orçamento</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
