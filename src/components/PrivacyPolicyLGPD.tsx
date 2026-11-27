import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  Eye, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  HelpCircle, 
  Clock, 
  Mail, 
  Phone, 
  Building2, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  KeyRound,
  Trash2,
  RefreshCw,
  Scale
} from 'lucide-react';
import { saveLgpdRequestRecord } from '../services/supabaseService';

interface PrivacyPolicyLGPDProps {
  onNavigateHome?: () => void;
  onNavigateToPrescription?: () => void;
}

export default function PrivacyPolicyLGPD({ onNavigateHome, onNavigateToPrescription }: PrivacyPolicyLGPDProps) {
  // Interactive Exercise of Rights Form state
  const [requestType, setRequestType] = useState<'acesso' | 'correcao' | 'exclusao' | 'portabilidade' | 'revogacao'>('acesso');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Accordion state for FAQs
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim() || !email.trim() || !cpf.trim()) {
      setFormError('Por favor, preencha os campos obrigatórios (Nome, CPF e E-mail).');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedProtocol = `LGPD-RAPIDO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      await saveLgpdRequestRecord({
        protocol: generatedProtocol,
        requestType,
        fullName: fullName.trim(),
        cpf: cpf.trim(),
        email: email.trim(),
        phone: phone.trim(),
        details: details.trim(),
      });
      setProtocol(generatedProtocol);
      setSubmitted(true);
    } catch {
      setFormError('Não foi possível registrar sua solicitação agora. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setFullName('');
    setCpf('');
    setEmail('');
    setPhone('');
    setDetails('');
    setProtocol('');
  };

  const faqs = [
    {
      q: 'Como a Ótica Rapido protege minha receita médica oftálmica?',
      a: 'Receitas médicas são classificadas como dados sensíveis de saúde (Art. 11 da LGPD). Na Ótica Rapido, os arquivos e dados de dioptrias (grau esférico, cilíndrico, eixo, DNP e adição) são criptografados, armazenados em ambiente seguro com controle estrito de acesso e utilizados unicamente para o cálculo técnico e confecção das suas lentes no laboratório óptico especializado.'
    },
    {
      q: 'Meus dados são compartilhados ou vendidos para terceiros?',
      a: 'Nunca vendemos nem comercializamos seus dados pessoais. O compartilhamento ocorre estritamente com laboratórios ópticos credenciados para fabricação das lentes e parceiros logísticos para entrega do seu óculos, conforme base legal de execução de contrato (Art. 7º, V da LGPD).'
    },
    {
      q: 'Por quanto tempo meus dados e histórico de receitas ficam guardados?',
      a: 'Mantemos seu histórico pelo prazo necessário para cumprimento de obrigações legais (como emissão de notas fiscais e garantias técnicas de 1 a 2 anos das lentes e armações) e para facilitar futuras consultas de graduação pelo titular. Você pode solicitar a exclusão a qualquer momento através do nosso formulário de direitos do titular.'
    },
    {
      q: 'Como posso solicitar a exclusão ou cópia das minhas informações?',
      a: 'Você pode utilizar o formulário interativo de Solicitação de Direitos do Titular presente nesta mesma página ou enviar uma mensagem direta para o Encarregado de Dados (DPO) através do e-mail privacidade@oticarapido.com.br ou WhatsApp oficial.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto text-left space-y-8 pb-12">
      {/* Hero Header */}
      <div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-mono font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="h-4 w-4" />
            Conformidade LGPD • Lei nº 13.709/2018
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white">
            Política de Privacidade & Proteção de Dados
          </h1>
          <p className="font-sans text-slate-300 text-sm md:text-base mt-3 max-w-3xl leading-relaxed">
            Na <strong>Ótica Rapido</strong>, a proteção da sua saúde visual caminha lado a lado com a segurança e o sigilo absoluto dos seus dados pessoais e receitas médicas oftálmicas.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="h-3.5 w-3.5 text-gold-400" />
              Última atualização: Agosto de 2026
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              Tratamento Seguro de Dados de Saúde
            </span>
          </div>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Sigilo Médico e Óptico</h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Receitas oftálmicas tratadas com rigor ético e criptografia conforme o Art. 11 da LGPD.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-700 mt-4 block uppercase tracking-wider">
            ✓ Dados Sensíveis Protegidos
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
              <Scale className="h-5 w-5" />
            </div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Bases Legais Claras</h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Tratamento embasado na execução de contrato (confecção de lentes) e tutela da saúde visual.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-indigo-700 mt-4 block uppercase tracking-wider">
            ✓ 100% Legal & Regulamentado
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <UserCheck className="h-5 w-5" />
            </div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Autonomia do Titular</h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Acesso, retificação, download ou exclusão dos seus dados a qualquer momento via canal oficial.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-700 mt-4 block uppercase tracking-wider">
            ✓ Direitos Garantidos (Art. 18)
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Zero Venda de Dados</h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Jamais comercializamos suas informações com corretores de dados, anunciantes ou redes sociais.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-rose-700 mt-4 block uppercase tracking-wider">
            ✓ Finalidade Específica
          </span>
        </div>
      </div>

      {/* Main Legal Content Sections */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-10 shadow-sm space-y-8">
        
        {/* Section 1: Introduction & Identity */}
        <section className="border-b border-slate-100 pb-8">
          <div className="flex items-center gap-2 text-gold-600 mb-2">
            <Building2 className="h-5 w-5" />
            <h2 className="font-display font-black text-xl text-slate-900">
              1. Identificação do Controlador e Objeto
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            A <strong>ÓTICA RAPIDO</strong> (conceito de ótica online e atendimento personalizado com provador e visitas programadas), inscrita no CNPJ sob o nº 48.912.450/0001-88, atua como <strong>Controladora</strong> no tratamento dos dados pessoais de seus clientes, visitantes da plataforma digital e pacientes que enviam prescrições médicas para produção de óculos de grau, solares e lentes de contato.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Esta Política de Privacidade descreve de forma transparente, clara e acessível as regras de coleta, registro, armazenamento, uso, compartilhamento e eliminação de dados, em total consonância com a <strong>Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018 - LGPD)</strong>, o <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong> e o <strong>Código de Defesa do Consumidor (Lei nº 8.078/1990)</strong>.
          </p>
        </section>

        {/* Section 2: Collected Data */}
        <section className="border-b border-slate-100 pb-8">
          <div className="flex items-center gap-2 text-gold-600 mb-2">
            <Eye className="h-5 w-5" />
            <h2 className="font-display font-black text-xl text-slate-900">
              2. Categorias de Dados Coletados e Finalidades
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Para prestar os serviços de consultoria óptica online, orçamento sob medida, confecção laboratorial de lentes e entrega segura de óculos, coletamos as seguintes categorias de dados:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-700" />
                Dados Cadastrais & Contato
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li>• Nome completo do titular ou paciente;</li>
                <li>• CPF (obrigatório para emissão de NF-e e garantia);</li>
                <li>• Telefone celular / WhatsApp;</li>
                <li>• Endereço de e-mail;</li>
                <li>• Endereço físico para entrega ou visita domiciliar.</li>
              </ul>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4">
              <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Dados Sensíveis de Saúde Visual
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li>• Receita médica oftalmológica (imagem ou digitada);</li>
                <li>• Dioptrias (grau Esférico, Cilíndrico e Eixo);</li>
                <li>• Adição (ADD) para lentes multifocais/progressivas;</li>
                <li>• Distância Nasopupilar (DNP) e Altura de montagem;</li>
                <li>• Nome e CRM/CROO do profissional prescritor.</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-slate-700" />
                Dados de Transação & Pagamento
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li>• Histórico de orçamentos e propostas solicitadas;</li>
                <li>• Recibos fiscais e comprovantes de pagamento;</li>
                <li>• Forma de pagamento escolhida (PIX, Cartão, Boleto);</li>
                <li>• Armações e tratamentos selecionados (Antirreflexo, Filtro Azul, Fotocromáticas).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Legal Bases */}
        <section className="border-b border-slate-100 pb-8">
          <div className="flex items-center gap-2 text-gold-600 mb-2">
            <Scale className="h-5 w-5" />
            <h2 className="font-display font-black text-xl text-slate-900">
              3. Hipóteses Legais de Tratamento (Art. 7º e Art. 11 da LGPD)
            </h2>
          </div>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed mt-2">
            <p>
              O tratamento dos dados pessoais na <strong>Ótica Rapido</strong> ocorre estritamente amparado pelas seguintes bases legais autorizadoras:
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Execução de Contrato (Art. 7º, V da LGPD):</strong>
                  Necessário para elaboração de orçamentos personalizados, montagem e corte milimétrico de lentes de acordo com as especificações da armação e entrega ao cliente.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Tutela da Saúde e Dados Sensíveis (Art. 11, II, 'f' da LGPD):</strong>
                  O manuseio da receita médica oftálmica visa garantir que a correção visual corresponda fielmente à prescrição do oftalmologista ou optometrista habilitado.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Cumprimento de Obrigação Legal e Regulatória (Art. 7º, II da LGPD):</strong>
                  Emissão de notas fiscais eletrônicas (SEFAZ), cumprimento de normas sanitárias e prazos de garantia legal do Código de Defesa do Consumidor.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Consentimento do Titular (Art. 7º, I e Art. 11, I da LGPD):</strong>
                  Coletado no momento do envio voluntário da receita na plataforma ou solicitação de atendimento consultivo via WhatsApp.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Security of Prescriptions & Storage */}
        <section className="border-b border-slate-100 pb-8">
          <div className="flex items-center gap-2 text-gold-600 mb-2">
            <Lock className="h-5 w-5" />
            <h2 className="font-display font-black text-xl text-slate-900">
              4. Armazenamento Seguro e Medidas de Proteção Técnica
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Adotamos rígidos padrões de segurança da informação para salvaguardar a confidencialidade e integridade dos dados, tais como:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span><strong>Criptografia em Trânsito (HTTPS/TLS):</strong> Toda comunicação entre seu navegador e nossos servidores é criptografada.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span><strong>Controle de Acesso Baseado em Função (RBAC):</strong> Apenas óticos e laboratoristas responsáveis possuem acesso às prescrições.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span><strong>Backup e Redundância Segura:</strong> Prevenção contra perda acidental ou corrupção de registros fiscais e receitas.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span><strong>Não Comercialização de Cadastros:</strong> Compromisso formal de não vender e não compartilhar listas com anunciantes.</span>
            </div>
          </div>
        </section>

        {/* Section 5: Data Subject Rights (Art. 18) */}
        <section className="border-b border-slate-100 pb-8">
          <div className="flex items-center gap-2 text-gold-600 mb-2">
            <UserCheck className="h-5 w-5" />
            <h2 className="font-display font-black text-xl text-slate-900">
              5. Seus Direitos como Titular de Dados (Art. 18 da LGPD)
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            A qualquer momento e de forma gratuita, você pode exercer perante a <strong>Ótica Rapido</strong> os seguintes direitos:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <strong className="text-slate-900 block font-bold mb-1">1. Confirmação e Acesso</strong>
              Saber se realizamos o tratamento dos seus dados e solicitar cópia dos mesmos.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <strong className="text-slate-900 block font-bold mb-1">2. Correção e Atualização</strong>
              Solicitar a alteração de dados incompletos, inexatos ou desatualizados.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <strong className="text-slate-900 block font-bold mb-1">3. Anonimização ou Eliminação</strong>
              Requerer a exclusão de dados desnecessários ou tratados com base em consentimento revogado.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <strong className="text-slate-900 block font-bold mb-1">4. Portabilidade dos Dados</strong>
              Solicitar a exportação das suas receitas e histórico de armações para outro prestador óptico.
            </div>
          </div>
        </section>

        {/* Section 6: DPO / Encarregado de Dados */}
        <section>
          <div className="flex items-center gap-2 text-gold-600 mb-2">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="font-display font-black text-xl text-slate-900">
              6. Encarregado pelo Tratamento de Dados (DPO) & Canal de Atendimento
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Para esclarecer dúvidas sobre esta Política, enviar notificações ou exercer quaisquer de seus direitos previstos na LGPD, entre em contato direto com o nosso Comitê de Privacidade e Encarregado de Dados (DPO):
          </p>

          <div className="mt-4 bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-gold-400 font-bold uppercase tracking-wider">
                Canal Oficial de Privacidade • DPO
              </span>
              <h4 className="font-display font-bold text-lg text-white">Comitê de Governança LGPD — Ótica Rapido</h4>
              <p className="text-xs text-slate-300 flex items-center gap-2 pt-1">
                <Mail className="h-3.5 w-3.5 text-gold-400" />
                <span>E-mail: <strong>privacidade@oticarapido.com.br</strong></span>
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gold-400" />
                <span>WhatsApp LGPD: <strong>(11) 94706-9414</strong> (Opção: Privacidade de Dados)</span>
              </p>
            </div>
            <a
              href="https://wa.me/5511947069414?text=Olá!%20Gostaria%20de%20tirar%20uma%20dúvida%20sobre%20a%20política%20de%20privacidade%20e%20meus%20dados%20na%20Ótica%20Rapido."
              target="_blank"
              referrerPolicy="no-referrer"
              className="px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-transform hover:scale-105 cursor-pointer flex-shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              Contatar DPO no WhatsApp
            </a>
          </div>
        </section>
      </div>

      {/* Interactive Module: Solicitação de Direitos do Titular (Art. 18) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-gold-600" />
              <h3 className="font-display font-black text-xl text-slate-900">
                Portal do Titular • Exercício de Direitos LGPD
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Envie sua solicitação oficial de acesso, alteração, portabilidade ou exclusão de dados com geração de protocolo formal.
            </p>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-mono font-bold">
            Atendimento em até 15 dias úteis (Art. 19 LGPD)
          </span>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-950 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-display font-black text-xl text-emerald-950">
                Solicitação LGPD Registrada com Sucesso!
              </h4>
              <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                Sua requisição foi encaminhada ao Encarregado de Dados da <strong>Ótica Rapido</strong>. Você receberá um retorno no e-mail informado.
              </p>
            </div>

            <div className="bg-white border border-emerald-300 p-4 rounded-xl max-w-md mx-auto">
              <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">Protocolo de Atendimento</span>
              <span className="font-mono font-black text-lg text-slate-900 tracking-wider block mt-0.5">{protocol}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Guarde este código para acompanhar o status da solicitação.</span>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Nova Solicitação
              </button>
              <a
                href={`https://wa.me/5511947069414?text=${encodeURIComponent(
                  `Olá! Registrei a solicitação LGPD com o protocolo ${protocol} para ${fullName}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Confirmar no WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase font-mono tracking-wider mb-1.5">
                Tipo de Solicitação:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'acesso', label: '1. Acessar Meus Dados', icon: Eye },
                    { id: 'correcao', label: '2. Corrigir Dados', icon: FileText },
                    { id: 'exclusao', label: '3. Excluir Dados', icon: Trash2 },
                    { id: 'portabilidade', label: '4. Exportar Receitas', icon: Download },
                    { id: 'revogacao', label: '5. Revogar Consentimento', icon: Lock },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const isSelected = requestType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRequestType(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-2 ${isSelected ? 'text-gold-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                  CPF do Titular *
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                  E-mail para Retorno *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                Detalhes ou Observações da Solicitação (Opcional)
              </label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Descreva se deseja a exclusão de uma receita específica, atualização de endereço ou cópia do histórico..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[10px] text-slate-500 font-sans">
                Ao enviar, você autoriza o DPO da Ótica Rapido a checar seus dados cadastrais para confirmar a titularidade.
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-gold-400" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 text-gold-400" />
                    <span>Registrar Solicitação LGPD</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Frequently Asked Questions (FAQ) Accordion */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-gold-600" />
          <h3 className="font-display font-black text-xl text-slate-900">
            Perguntas Frequentes sobre Privacidade & Dados Ópticos
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-slate-200 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100/80 transition-all cursor-pointer"
                >
                  <span className="font-display font-bold text-sm text-slate-900">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Navigation Footer */}
      <div className="bg-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-600 flex-shrink-0" />
          <span>Sua visão com precisão, tecnologia e total segurança jurídica.</span>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="font-bold text-slate-800 hover:text-slate-950 underline cursor-pointer"
            >
              Voltar ao Início
            </button>
          )}
          {onNavigateToPrescription && (
            <button
              type="button"
              onClick={onNavigateToPrescription}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer transition-all"
            >
              Enviar Receita com Segurança →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
