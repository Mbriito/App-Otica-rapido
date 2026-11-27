import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Glasses,
  Eye,
  RefreshCw,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { CustomerSession, HomeVisitAppointment } from '../types';
import {
  createHomeVisitAppointment,
  listRecentAppointments,
} from '../services/supabaseService';

interface HomeVisitSchedulerProps {
  customerSession: CustomerSession | null;
  onRequestLogin: () => void;
  onOpenLgpdPolicy: () => void;
}

const SERVICE_TYPES = [
  {
    id: 'Prova de Armações em Casa',
    title: 'Prova de Armações em Casa',
    desc: 'Levamos uma maleta personalizada com armações selecionadas para você provar no espelho.',
    icon: Glasses,
  },
  {
    id: 'Medição de Grau / DNP Digital',
    title: 'Medição de Grau / DNP Digital',
    desc: 'Conferência da receita, medição pupilar (DNP) milimétrica e altura focal para lentes.',
    icon: Eye,
  },
  {
    id: 'Atendimento Completo (Prova + Medição + Orçamento)',
    title: 'Atendimento Completo em Domicílio',
    desc: 'Prova de modelos, consultoria de visagismo, medição técnica e orçamento fechado na hora.',
    icon: Sparkles,
  },
  {
    id: 'Entrega e Ajuste Anatômico Personalizado',
    title: 'Entrega e Ajuste Técnico',
    desc: 'Entrega dos seus óculos prontos com regulagem fina de hastes e plaquetas.',
    icon: Home,
  },
];

const TIME_SLOTS = [
  '09:00 - 11:00',
  '11:00 - 13:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
];

const SP_NEIGHBORHOOD_SUGGESTIONS = [
  'Bela Vista / Paulista',
  'Pinheiros',
  'Vila Mariana',
  'Moema',
  'Itaim Bibi',
  'Jardins',
  'Perdizes',
  'Tatuapé',
  'Santana',
  'Morumbi',
];

export default function HomeVisitScheduler({
  customerSession,
  onRequestLogin,
  onOpenLgpdPolicy,
}: HomeVisitSchedulerProps) {
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES[2].id);
  const [visitDate, setVisitDate] = useState<string>(tomorrowDate);
  const [preferredTime, setPreferredTime] = useState<string>('14:00 - 16:00');
  const [customerName, setCustomerName] = useState<string>(customerSession?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(customerSession?.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(customerSession?.email || '');
  const [zipCode, setZipCode] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [complement, setComplement] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [city, setCity] = useState<string>('São Paulo - SP');
  const [notes, setNotes] = useState<string>('');
  const [lgpdConsent, setLgpdConsent] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<HomeVisitAppointment | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<HomeVisitAppointment[]>([]);

  useEffect(() => {
    if (customerSession) {
      if (customerSession.fullName && !customerName) setCustomerName(customerSession.fullName);
      if (customerSession.phone && !customerPhone) setCustomerPhone(customerSession.phone);
      if (customerSession.email && !customerEmail) setCustomerEmail(customerSession.email);
    }
  }, [customerSession]);

  useEffect(() => {
    let active = true;
    listRecentAppointments(customerSession?.phone || customerSession?.email).then((items) => {
      if (active) setRecentAppointments(items);
    });
    return () => {
      active = false;
    };
  }, [customerSession, confirmedAppointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim() || !streetAddress.trim() || !neighborhood.trim()) {
      setError('Preencha nome, WhatsApp, endereço e bairro em São Paulo para confirmar sua visita.');
      return;
    }

    if (!lgpdConsent) {
      setError('Autorize o uso dos dados de endereço exclusivamente para a visita domiciliar (LGPD).');
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await createHomeVisitAppointment({
        customer: customerSession,
        customerName,
        customerPhone,
        customerEmail,
        zipCode,
        streetAddress,
        complement,
        neighborhood,
        city,
        visitDate,
        preferredTime,
        serviceType,
        notes,
        lgpdConsent,
      });
      setConfirmedAppointment(saved);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao registrar agendamento. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildWhatsAppSummaryUrl = (appt: HomeVisitAppointment) => {
    const formattedDate = appt.visitDate.split('-').reverse().join('/');
    const text =
      `*ÓTICA RAPIDO - AGENDAMENTO DE VISITA A DOMICÍLIO*\n\n` +
      `*Protocolo:* ${appt.protocol}\n` +
      `*Cliente:* ${appt.customerName}\n` +
      `*WhatsApp:* ${appt.customerPhone}\n` +
      `*Tipo de Atendimento:* ${appt.serviceType}\n` +
      `*Data Preferencial:* ${formattedDate}\n` +
      `*Horário:* ${appt.preferredTime}\n` +
      `*Endereço (SP):* ${appt.streetAddress}${appt.complement ? `, ${appt.complement}` : ''} — ${appt.neighborhood}, ${appt.city}${appt.zipCode ? ` (CEP: ${appt.zipCode})` : ''}\n` +
      (appt.notes ? `*Observações / Preferências:* ${appt.notes}\n` : '') +
      `\nGostaria de confirmar minha visita óptica gratuita em casa!`;

    return `https://wa.me/5511947069414?text=${encodeURIComponent(text)}`;
  };

  const resetForNewBooking = () => {
    setConfirmedAppointment(null);
    setNotes('');
  };

  return (
    <div className="py-6 max-w-5xl mx-auto text-left space-y-8">
      {/* Banner */}
      <div className="bg-sapphire-950 text-white rounded-3xl p-6 md:p-10 border border-sapphire-900 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-400/30 font-mono text-[10px] text-gold-400 font-bold uppercase tracking-wider mb-3">
              <Home className="h-3.5 w-3.5" /> Atendimento Personalizado em São Paulo
            </span>
            <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight text-white">
              Agendamento de Visita a Domicílio
            </h2>
            <p className="font-sans text-slate-300 text-xs md:text-sm mt-2 leading-relaxed">
              Um consultor óptico da <strong>Ótica Rapido</strong> vai até sua casa ou escritório em São Paulo sem custo adicional, levando maleta com armações selecionadas e equipamento de medição digital DNP.
            </p>
          </div>

          {!customerSession && (
            <button
              type="button"
              onClick={onRequestLogin}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer flex-shrink-0"
            >
              <UserCheck className="h-4 w-4 text-gold-400" />
              Identificação Rápida
            </button>
          )}
        </div>
      </div>

      {confirmedAppointment ? (
        /* CONFIRMAÇÃO AMIGÁVEL COM ENVIO AUTOMÁTICO PARA WHATSAPP */
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 md:p-10 shadow-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              Protocolo {confirmedAppointment.protocol}
            </span>
            <h3 className="font-display font-black text-2xl md:text-3xl text-slate-900">
              Visita Agendada com Sucesso!
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mt-2 max-w-xl mx-auto">
              Seu pedido de visita em domicílio já foi registrado. Clique abaixo para enviar o resumo automático direto para o WhatsApp oficial da <strong>Ótica Rapido</strong> e agilizar a separação da maleta de armações.
            </p>
          </div>

          {/* Resumo Estruturado */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-2xl mx-auto text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Tipo de Atendimento</span>
              <strong className="text-slate-900 font-bold">{confirmedAppointment.serviceType}</strong>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Data e Horário</span>
              <strong className="text-slate-900 font-bold">
                {confirmedAppointment.visitDate.split('-').reverse().join('/')} • {confirmedAppointment.preferredTime}
              </strong>
            </div>
            <div className="sm:col-span-2 border-t border-slate-200 pt-3">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Endereço da Visita</span>
              <strong className="text-slate-900 font-bold">
                {confirmedAppointment.streetAddress}
                {confirmedAppointment.complement ? `, ${confirmedAppointment.complement}` : ''} — {confirmedAppointment.neighborhood}, {confirmedAppointment.city}
              </strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={buildWhatsAppSummaryUrl(confirmedAppointment)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Enviar Resumo no WhatsApp ((11) 94706-9414)
            </a>
            <button
              type="button"
              onClick={resetForNewBooking}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-sans font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Agendar Outra Visita
            </button>
          </div>
        </div>
      ) : (
        /* FORMULÁRIO DE AGENDAMENTO */
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            {/* 1. Tipo de Atendimento */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Escolha o Tipo de Atendimento *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICE_TYPES.map((service) => {
                  const Icon = service.icon;
                  const isSelected = serviceType === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setServiceType(service.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-sapphire-950 border-sapphire-950 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl flex-shrink-0 ${
                          isSelected ? 'bg-gold-500 text-slate-950' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block font-display font-bold text-xs">
                          {service.title}
                        </span>
                        <span className={`block text-[11px] mt-1 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {service.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Data e Horário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gold-600" />
                  2. Data da Visita *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold-600" />
                  3. Horário Preferencial *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPreferredTime(slot)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                        preferredTime === slot
                          ? 'bg-gold-500 text-slate-950 border-gold-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Endereço em São Paulo */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gold-600" />
                4. Endereço em São Paulo *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">CEP</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="01310-100"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rua / Avenida e Número *</label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1200"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Complemento / Apto</label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Ex: Apto 42 / Sala 5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bairro *</label>
                  <input
                    type="text"
                    required
                    list="sp-neighborhoods"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Bela Vista"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                  <datalist id="sp-neighborhoods">
                    {SP_NEIGHBORHOOD_SUGGESTIONS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cidade / Região</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Contato do Cliente */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                5. Dados de Contato para Confirmação *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Seu Nome *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Preferências de Armações ou Observações
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Gostaria de provar armações quadradas e de gatinha em acetato escuro, e conversar sobre lentes com filtro azul."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 outline-none"
                />
              </div>
            </div>

            {/* LGPD Consent */}
            <label className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={(e) => setLgpdConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sapphire-900 focus:ring-gold-500"
              />
              <span className="text-[11px] text-slate-600 leading-relaxed">
                Autorizo a <strong>Ótica Rapido</strong> a utilizar meus dados de contato e endereço exclusivamente para realização desta visita domiciliar, nos termos da{' '}
                <button
                  type="button"
                  onClick={onOpenLgpdPolicy}
                  className="text-gold-700 font-bold underline cursor-pointer"
                >
                  Política de Privacidade (LGPD)
                </button>
                .
              </span>
            </label>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-sapphire-950 hover:bg-sapphire-900 disabled:opacity-60 text-gold-400 font-display font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Confirmando Agendamento...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Confirmar Agendamento de Visita
                </>
              )}
            </button>
          </div>

          {/* COLUNA LATERAL INFORMATIVA E HISTÓRICO */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
              <h4 className="font-display font-bold text-base text-gold-400">
                Como funciona a visita?
              </h4>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-gold-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Você escolhe data, horário e informa seu endereço na Grande São Paulo.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-gold-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Nosso especialista leva mais de 80 armações higienizadas de acordo com seu estilo.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-gold-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Fazemos a medição de DNP digital no local e enviamos suas lentes para o laboratório.</span>
                </li>
              </ul>

              <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-[11px] text-emerald-400">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span>Sem taxa de deslocamento em São Paulo capital.</span>
              </div>
            </div>

            {recentAppointments.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-3">
                <h4 className="font-display font-bold text-sm text-slate-900">
                  Seus Agendamentos Recentes
                </h4>
                <div className="space-y-2.5">
                  {recentAppointments.slice(0, 3).map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[10px] text-gold-700">
                          {appt.protocol}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {appt.visitDate.split('-').reverse().join('/')}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-[11px]">{appt.serviceType}</p>
                      <p className="text-[10px] text-slate-500">
                        {appt.preferredTime} • {appt.neighborhood}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
