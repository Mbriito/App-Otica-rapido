import { MedicalPrescription, OpticalQuote, SelectedItem } from '../types';

export const STORE_WHATSAPP_NUMBER = '5511947069414';

export function formatBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateBR(isoDate?: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function createQuoteNumber(): string {
  return `OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function getDefaultValidUntil(days = 15): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export function isQuoteWithFrame(quote: Pick<OpticalQuote, 'includeFrame'>): boolean {
  return quote.includeFrame !== false;
}

export function getQuoteModalityLabel(includeFrame?: boolean): string {
  return includeFrame === false
    ? 'Somente Lentes (Armação Própria do Cliente)'
    : 'Com Armação + Lentes';
}

export function calculateQuoteTotals(
  items: SelectedItem[],
  discount: number,
  includeFrame = true
): { subtotal: number; discount: number; total: number } {
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const subtotal = items.reduce((sum, item) => {
    const framePart = includeFrame ? Math.max(0, Number(item.frame?.price) || 0) : 0;
    const lensPart = Math.max(0, Number(item.lensPrice) || 0);
    return sum + framePart + lensPart;
  }, 0);

  return {
    subtotal,
    discount: safeDiscount,
    total: Math.max(0, subtotal - safeDiscount),
  };
}

export function formatPrescriptionShortSummary(prescription?: MedicalPrescription): string {
  if (!prescription) return '';
  const od = `OD: Esf ${prescription.od.spherical || '0.00'} | Cil ${prescription.od.cylindrical || '0.00'} | Eixo ${prescription.od.axis || '0'}°`;
  const oe = `OE: Esf ${prescription.oe.spherical || '0.00'} | Cil ${prescription.oe.cylindrical || '0.00'} | Eixo ${prescription.oe.axis || '0'}°`;
  return `${od}\n${oe}`;
}

export function getEffectivePrescription(quote: OpticalQuote): MedicalPrescription | undefined {
  return quote.prescription || quote.items.find((it) => it.prescription)?.prescription;
}

export function buildQuoteSummaryText(quote: OpticalQuote): string {
  const withFrame = isQuoteWithFrame(quote);
  const modality = getQuoteModalityLabel(withFrame);
  const prescription = getEffectivePrescription(quote);

  const itemsLines = quote.items
    .map((item, idx) => {
      const framePrice = withFrame ? Math.max(0, Number(item.frame?.price) || 0) : 0;
      const lensPrice = Math.max(0, Number(item.lensPrice) || 0);
      const lineTotal = framePrice + lensPrice;

      if (withFrame) {
        return `${idx + 1}) Armação: ${item.frame.name} (${item.selectedColor}) — ${formatBRL(
          framePrice
        )}\n   Lentes: ${item.lensType} — ${formatBRL(lensPrice)} | Item: ${formatBRL(lineTotal)}`;
      }
      return `${idx + 1}) Lentes: ${item.lensType} (Armação própria do cliente) — ${formatBRL(
        lensPrice
      )}`;
    })
    .join('\n');

  const rxBlock = prescription
    ? `\n*GRAUS DA RECEITA:*\n${formatPrescriptionShortSummary(prescription)}\n`
    : '';

  const discountLine =
    quote.discount > 0 ? `*Desconto Especial:* - ${formatBRL(quote.discount)}\n` : '';

  return (
    `*ÓTICA RAPIDO — PROPOSTA DE ORÇAMENTO*\n\n` +
    `*Nº do Orçamento:* ${quote.quoteNumber}\n` +
    `*Paciente:* ${quote.customerName || 'Não informado'}\n` +
    `*Modalidade:* ${modality}\n` +
    `*Validade:* até ${formatDateBR(quote.validUntil)}\n\n` +
    `*ITENS DO ORÇAMENTO:*\n${itemsLines}\n` +
    rxBlock +
    `\n*Subtotal:* ${formatBRL(quote.subtotal)}\n` +
    discountLine +
    `*TOTAL:* ${formatBRL(quote.total)}\n` +
    `*Pagamento sugerido:* ${quote.paymentMethod}\n` +
    `*Responsável:* ${quote.sellerName}\n\n` +
    `Respondendo esta mensagem você aprova o orçamento ou solicita seu Pix / link de pagamento.`
  );
}

export function buildQuoteWhatsAppUrl(quote: OpticalQuote): string {
  const cleanPhone = (quote.customerPhone || '').replace(/\D/g, '');
  const targetNumber =
    cleanPhone.length >= 10
      ? cleanPhone.startsWith('55')
        ? cleanPhone
        : `55${cleanPhone}`
      : STORE_WHATSAPP_NUMBER;

  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(buildQuoteSummaryText(quote))}`;
}
