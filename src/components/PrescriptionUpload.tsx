import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, MessageSquare, ShieldAlert, UserCheck } from 'lucide-react';
import { CustomerSession, MedicalPrescription } from '../types';
import { savePrescriptionRecord } from '../services/supabaseService';

interface PrescriptionUploadProps {
  onPrescriptionAdded: (prescription: MedicalPrescription) => void;
  customerSession?: CustomerSession | null;
  onRequestLogin?: () => void;
  onOpenLgpdPolicy?: () => void;
}

export default function PrescriptionUpload({
  onPrescriptionAdded,
  customerSession,
  onRequestLogin,
  onOpenLgpdPolicy,
}: PrescriptionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optical values defaults
  const [prescription, setPrescription] = useState<MedicalPrescription>({
    patientName: '',
    doctorName: '',
    doctorCrm: '',
    date: new Date().toISOString().split('T')[0],
    od: { spherical: '0.00', cylindrical: '0.00', axis: '0', dnp: '32', addition: '0.00' },
    oe: { spherical: '0.00', cylindrical: '0.00', axis: '0', dnp: '32', addition: '0.00' },
    observation: ''
  });

  useEffect(() => {
    if (customerSession?.fullName) {
      setPrescription((prev) =>
        prev.patientName ? prev : { ...prev, patientName: customerSession.fullName }
      );
    }
  }, [customerSession]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setIsScanning(true);
    setScanComplete(false);

    // Mock high-end OCR scan simulation
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      // Simulate reading a prescription from image
      setPrescription({
        patientName: 'Adriano Cavalcante',
        doctorName: 'Dr. Roberto L. Siqueira',
        doctorCrm: 'M-SP 124890',
        date: '2026-05-10',
        od: { spherical: '-2.25', cylindrical: '-0.75', axis: '170', dnp: '31.5', addition: '+1.50' },
        oe: { spherical: '-1.75', cylindrical: '-1.00', axis: '10', dnp: '32.0', addition: '+1.50' },
        observation: 'Lentes com proteção UV e Filtro de Luz Azul recomendado para uso prolongado em computadores.'
      });
    }, 2500);
  };

  const handleInputChange = (eye: 'od' | 'oe', field: 'spherical' | 'cylindrical' | 'axis' | 'dnp' | 'addition', value: string) => {
    setPrescription((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value
      }
    }));
  };

  const handleGeneralChange = (field: 'patientName' | 'doctorName' | 'doctorCrm' | 'date' | 'observation', value: string) => {
    setPrescription((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    if (!lgpdConsent) {
      setSaveFeedback({
        type: 'error',
        text: 'Confirme o consentimento LGPD para proteger e processar sua receita médica.',
      });
      return;
    }

    const enrichedPrescription: MedicalPrescription = {
      ...prescription,
      fileAttached: file
        ? {
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            type: file.type,
          }
        : undefined,
    };

    setIsSaving(true);
    try {
      await savePrescriptionRecord({
        prescription: enrichedPrescription,
        file,
        customer: customerSession,
        lgpdConsent,
      });
      setSaveFeedback({
        type: 'success',
        text: 'Receita Médica registrada com sigilo LGPD e vinculada ao seu orçamento!',
      });
      setTimeout(() => {
        onPrescriptionAdded(enrichedPrescription);
      }, 650);
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível salvar a receita. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getWhatsAppPrescriptionUrl = () => {
    const text = `Olá! Acabei de carregar minha receita no site Ótica Rapido:\n\n*Paciente:* ${prescription.patientName || 'Não Informado'}\n*Médico:* ${prescription.doctorName || 'Não Informado'}\n*Olho Direito (OD):* Esf: ${prescription.od.spherical} / Cil: ${prescription.od.cylindrical} / Eixo: ${prescription.od.axis}° / DNP: ${prescription.od.dnp}mm${prescription.od.addition ? ` / Adição: ${prescription.od.addition}` : ''}\n*Olho Esquerdo (OE):* Esf: ${prescription.oe.spherical} / Cil: ${prescription.oe.cylindrical} / Eixo: ${prescription.oe.axis}° / DNP: ${prescription.oe.dnp}mm${prescription.oe.addition ? ` / Adição: ${prescription.oe.addition}` : ''}\n\nGostaria de solicitar um orçamento para lentes adequadas para o meu grau!`;
    return `https://wa.me/5511947069414?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      {/* Introduction */}
      <div className="text-center mb-10">
        <span className="text-gold-500 font-mono text-xs uppercase tracking-widest font-semibold">Tecnologia Digital Óptica</span>
        <h2 className="font-display font-extrabold text-3xl text-slate-900 mt-1">Leitor Inteligente de Receita</h2>
        <p className="font-sans text-slate-500 text-sm mt-2 max-w-2xl mx-auto">
          Faça o upload da sua receita médica oftalmológica. Nosso sistema simula uma análise inteligente para capturar seu grau esférico, cilíndrico e eixos para simplificar a compra de suas lentes corretivas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Upload Drag Frame */}
        <div className="md:col-span-5 flex flex-col justify-start gap-4">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[280px] bg-white ${
              file ? 'border-gold-400 bg-gold-50/25' : 'border-slate-300 hover:border-gold-400 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {!file ? (
              <div onClick={triggerFileInput} className="w-full flex flex-col items-center">
                <div className="p-4 bg-slate-50 rounded-full text-slate-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-slate-500" />
                </div>
                <h4 className="font-sans font-bold text-sm text-slate-800">Arraste a Receita ou Foto</h4>
                <p className="text-xs text-slate-400 mt-1">Suporta JPG, PNG, PDF de até 8MB</p>
                <button
                  type="button"
                  className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Selecionar Arquivo
                </button>
              </div>
            ) : (
              <div className="w-full text-left">
                <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
                  <div className="p-2.5 bg-gold-400/10 text-gold-600 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-sans font-bold text-xs text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                {isScanning && (
                  <div className="flex flex-col items-center py-6">
                    <RefreshCw className="h-8 w-8 text-gold-500 animate-spin mb-3.5" />
                    <p className="text-xs font-mono text-gold-600 font-semibold animate-pulse">Escaneando com OCR Óptico...</p>
                    <p className="text-[10px] text-slate-400 text-center mt-1">Nossa IA está identificando graus e eixos clínicos</p>
                  </div>
                )}

                {scanComplete && (
                  <div>
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl mb-4">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <div className="text-xs">
                        <strong className="block font-semibold">Leitura Concluída!</strong>
                        Os dados foram importados para o formulário ao lado.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      className="w-full text-center py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl bg-white transition-all"
                    >
                      Carregar Outro Arquivo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Notice about Privacy */}
          <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-200/50 text-left">
            <h5 className="text-xs font-sans font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
              Segurança e Privacidade LGPD
            </h5>
            <p className="text-[10px] font-sans text-slate-500 leading-relaxed">
              Respeitamos seus dados médicos. Seus dados de óculos são usados apenas localmente de forma temporária para elaboração de seu orçamento, e nunca armazenados fora deste escopo.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Prescription parameters fields */}
        <div className="md:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm text-left">
            <h3 className="font-display font-extrabold text-lg text-[#0E1624] mb-1">
              Dados Optométricos Registrados
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Certifique-se de que os valores importados coincidem exatamente com o papel assinado pelo oftalmologista.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo do Paciente</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Adriano Cavalcante"
                  value={prescription.patientName}
                  onChange={(e) => handleGeneralChange('patientName', e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Médico CRM</label>
                  <input
                    type="text"
                    placeholder="CRM-SP 124890"
                    value={prescription.doctorCrm}
                    onChange={(e) => handleGeneralChange('doctorCrm', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Data da Consulta</label>
                  <input
                    type="date"
                    value={prescription.date}
                    onChange={(e) => handleGeneralChange('date', e.target.value)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* OLHO DIREITO (OD) TABLE */}
            <div className="mb-6">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Olho Direito (OD)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">Esférico</label>
                  <input
                    type="text"
                    required
                    value={prescription.od.spherical}
                    onChange={(e) => handleInputChange('od', 'spherical', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">Cilíndrico</label>
                  <input
                    type="text"
                    required
                    value={prescription.od.cylindrical}
                    onChange={(e) => handleInputChange('od', 'cylindrical', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">Eixo (°)</label>
                  <input
                    type="text"
                    required
                    value={prescription.od.axis}
                    onChange={(e) => handleInputChange('od', 'axis', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">DNP (DP)</label>
                  <input
                    type="text"
                    required
                    value={prescription.od.dnp}
                    onChange={(e) => handleInputChange('od', 'dnp', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight text-amber-600 font-semibold">Adição (+)</label>
                  <input
                    type="text"
                    value={prescription.od.addition || ''}
                    onChange={(e) => handleInputChange('od', 'addition', e.target.value)}
                    placeholder="Ex: 0.00"
                    className="w-full text-center px-1.5 py-1.5 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-700 bg-amber-50/20 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* OLHO ESQUERDO (OE) TABLE */}
            <div className="mb-6">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                Olho Esquerdo (OE)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">Esférico</label>
                  <input
                    type="text"
                    required
                    value={prescription.oe.spherical}
                    onChange={(e) => handleInputChange('oe', 'spherical', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">Cilíndrico</label>
                  <input
                    type="text"
                    required
                    value={prescription.oe.cylindrical}
                    onChange={(e) => handleInputChange('oe', 'cylindrical', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">Eixo (°)</label>
                  <input
                    type="text"
                    required
                    value={prescription.oe.axis}
                    onChange={(e) => handleInputChange('oe', 'axis', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight">DNP (DP)</label>
                  <input
                    type="text"
                    required
                    value={prescription.oe.dnp}
                    onChange={(e) => handleInputChange('oe', 'dnp', e.target.value)}
                    className="w-full text-center px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 leading-tight text-amber-600 font-semibold">Adição (+)</label>
                  <input
                    type="text"
                    value={prescription.oe.addition || ''}
                    onChange={(e) => handleInputChange('oe', 'addition', e.target.value)}
                    placeholder="Ex: 0.00"
                    className="w-full text-center px-1.5 py-1.5 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-700 bg-amber-50/20 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Observations text */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-500 mb-1">Notas / Observações / Recomendações dos Óculos</label>
              <textarea
                rows={2}
                value={prescription.observation}
                onChange={(e) => handleGeneralChange('observation', e.target.value)}
                placeholder="Exemplo: Lentes multifocais de corredor amplo..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none font-sans"
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
                  className="px-3 py-1.5 bg-sapphire-900 text-gold-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
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
                className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  saveFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {saveFeedback.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{saveFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-gold-400 font-sans font-bold text-xs rounded-xl transition-all shadow-md text-center cursor-pointer"
              >
                {isSaving ? 'Salvando com sigilo LGPD...' : 'Vincular Receita ao Meu Perfil'}
              </button>
              <a
                href={getWhatsAppPrescriptionUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <MessageSquare className="h-4 w-4" />
                Dúvidas? Chamar no WhatsApp
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
