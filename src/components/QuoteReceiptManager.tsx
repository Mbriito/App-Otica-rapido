import React, { useState, useEffect } from 'react';
import { OpticalQuote, OpticalReceipt, EyewearFrame, MedicalPrescription, CustomerSession } from '../types';
import { Receipt, FileText, Printer, Plus, Trash2, Edit3, Send, Check, RefreshCw, MessageSquare, Briefcase, QrCode, Link, ExternalLink, Wallet, Copy, CreditCard, Sparkles, AlertCircle, Layers } from 'lucide-react';
import LensTreatmentComparison, { LensTreatment, LENS_TREATMENTS } from './LensTreatmentComparison';

interface QuoteReceiptManagerProps {
  lastSelectedFrame?: EyewearFrame;
  selectedColor?: string;
  selectedLensType?: string;
  selectedLensPrice?: number;
  linkedPrescription?: MedicalPrescription;
  customerSession?: CustomerSession | null;
}

export default function QuoteReceiptManager({
  lastSelectedFrame,
  selectedColor = '',
  selectedLensType = '',
  selectedLensPrice = 0,
  linkedPrescription,
  customerSession
}: QuoteReceiptManagerProps) {
  const [activeTab, setActiveTab] = useState<'quote' | 'receipt'>('quote');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>('filtro_azul');
  const [treatmentToast, setTreatmentToast] = useState<string | null>(null);
  
  // Payment gateway states
  const [paymentType, setPaymentType] = useState<'pix' | 'link'>('pix');
  const [acquirer, setAcquirer] = useState<'mercadopago' | 'pagseguro' | 'stone' | 'infinitepay'>('mercadopago');
  const [installments, setInstallments] = useState<string>('10x sem juros');
  const [paymentStatus, setPaymentStatus] = useState<'aguardando' | 'pago' | 'processando'>('aguardando');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  
  // Orçamentos State
  const [quote, setQuote] = useState<OpticalQuote>({
    id: 'Q-9842',
    quoteNumber: '2026-09842',
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias de validade
    customerName: 'Adriano Cavalcante',
    customerPhone: '(11) 98888-7777',
    customerEmail: 'adriano.caval@gmail.com',
    customerCpf: '123.456.789-00',
    items: [],
    subtotal: 0,
    discount: 50.00,
    total: 0,
    paymentMethod: 'Cartão de Crédito - 10x sem juros',
    observations: 'Orçamento inclui lentes com tratamento antirreflexo avançado e filtro contra luz azul nociva.',
    sellerName: 'Consultora Amanda - Filial Paulista'
  });

  // Load selected frame in catalog to current quota items list automatically if exists
  useEffect(() => {
    if (lastSelectedFrame) {
      setQuote(prev => {
        const newItem = {
          frame: lastSelectedFrame,
          selectedColor: selectedColor || lastSelectedFrame.colors[0],
          lensType: selectedLensType || 'Lente de Demonstração',
          lensPrice: selectedLensPrice,
          prescription: linkedPrescription
        };
        const updatedItems = [newItem];
        const sub = lastSelectedFrame.price + selectedLensPrice;
        return {
          ...prev,
          items: updatedItems,
          subtotal: sub,
          total: Math.max(0, sub - prev.discount)
        };
      });
    } else {
      // Add a default item if nothing was selected
      setQuote(prev => {
        const defaultFrame: EyewearFrame = {
          id: 'def1',
          name: 'Classic Acetate Round',
          brand: 'Aura Eyewear',
          price: 350.00,
          category: 'grau',
          gender: 'unissex',
          shape: 'redondo',
          material: 'acetato',
          imageUrl: '',
          colors: ['Preto Matte'],
          description: '',
          rating: 5
        };
        const newItem = {
          frame: defaultFrame,
          selectedColor: 'Preto Matte',
          lensType: 'Lente Monofocal Antirreflexo Premium',
          lensPrice: 150.00,
          prescription: linkedPrescription
        };
        const sub = defaultFrame.price + 150.00;
        return {
          ...prev,
          items: [newItem],
          subtotal: sub,
          total: Math.max(0, sub - prev.discount)
        };
      });
    }
  }, [lastSelectedFrame, selectedColor, selectedLensType, selectedLensPrice, linkedPrescription]);

  // Recibos State
  const [receipt, setReceipt] = useState<OpticalReceipt>({
    id: 'R-7341',
    receiptNumber: '2026-7341-RC',
    date: new Date().toISOString().split('T')[0],
    customerName: 'Adriano Cavalcante',
    customerCpf: '123.456.789-00',
    customerPhone: '(11) 98888-7777',
    amount: 450.00,
    amountWritten: 'Quatrocentos e cinquenta reais',
    descriptionOfServices: 'Compra de 01 Armação de Grau Aura Eyewear preta com lentes de grau monofocais antirreflexo corporativas.',
    paymentMethod: 'Pix à vista',
    sellerName: 'Gerente Carlos S. - Ótica Visão',
    cnpj: '12.345.678/0001-90',
    companyName: 'Ótica Visão Ltda.'
  });

  // Reset payment status on document changes
  useEffect(() => {
    setPaymentStatus('aguardando');
  }, [activeTab, quote.total, receipt.amount]);

  // Auto-fill customer identification when passwordless session is active
  useEffect(() => {
    if (!customerSession) return;
    setQuote((prev) => ({
      ...prev,
      customerName: customerSession.fullName || prev.customerName,
      customerPhone: customerSession.phone || prev.customerPhone,
      customerEmail: customerSession.email || prev.customerEmail,
    }));
    setReceipt((prev) => ({
      ...prev,
      customerName: customerSession.fullName || prev.customerName,
      customerPhone: customerSession.phone || prev.customerPhone,
    }));
  }, [customerSession]);

  const updateQuoteField = (field: keyof OpticalQuote, value: any) => {
    setQuote(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'discount') {
        const disc = parseFloat(value) || 0;
        updated.total = Math.max(0, prev.subtotal - disc);
      }
      return updated;
    });
  };

  const updateQuoteItemPrice = (index: number, type: 'frame' | 'lens', value: string) => {
    setQuote(prev => {
      const items = [...prev.items];
      const parsedVal = parseFloat(value) || 0;
      if (type === 'frame') {
        items[index].frame.price = parsedVal;
      } else {
        items[index].lensPrice = parsedVal;
      }
      const subtotal = items.reduce((sum, item) => sum + item.frame.price + item.lensPrice, 0);
      return {
        ...prev,
        items,
        subtotal,
        total: Math.max(0, subtotal - prev.discount)
      };
    });
  };

  const updateQuoteItemName = (index: number, type: 'frame' | 'lens', value: string) => {
    setQuote(prev => {
      const items = [...prev.items];
      if (type === 'frame') {
        items[index].frame.name = value;
      } else {
        items[index].lensType = value;
      }
      return { ...prev, items };
    });
  };

  const updateReceiptField = (field: keyof OpticalReceipt, value: any) => {
    setReceipt(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'amount') {
        const val = parseFloat(value) || 0;
        // Basic written out value in Portuguese
        updated.amountWritten = getWrittenOutBRL(val);
      }
      return updated;
    });
  };

  // Basic number writer in PT-BR
  const getWrittenOutBRL = (num: number): string => {
    if (num === 0) return 'Zero reais';
    // Highly simplistic mockup of Portuguese monetary writing for demonstration
    if (num === 450) return 'Quatrocentos e cinquenta reais';
    if (num === 500) return 'Quinhentos reais';
    if (num === 300) return 'Trezentos reais';
    return `${num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} reais`;
  };

  const getPixPayload = () => {
    const totalAmount = activeTab === 'quote' ? quote.total : receipt.amount;
    const documentId = activeTab === 'quote' ? quote.quoteNumber : receipt.receiptNumber;
    return `00020101021226870014br.gov.bcb.pix2565pix.oticavisao.com.br/cob/doc${documentId.replace(/[^a-zA-Z0-9]/g, '')}5204000053039865407${totalAmount.toFixed(2)}5802BR5911Otica Visao6009Sao Paulo62070503***6304`;
  };

  const getPaymentLink = () => {
    const totalAmount = activeTab === 'quote' ? quote.total : receipt.amount;
    const documentId = activeTab === 'quote' ? quote.quoteNumber : receipt.receiptNumber;
    return `https://pagar.oticavisao.com.br/checkout/doc_${documentId.replace(/[^a-zA-Z0-9]/g, '')}?gate=${acquirer}&installments=${encodeURIComponent(installments)}&amt=${totalAmount}`;
  };

  const copyToClipboard = (text: string, type: 'pix' | 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'pix') {
        setCopiedText('Código Pix copiado!');
        setTimeout(() => setCopiedText(null), 3000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    }).catch(() => {
      // Fallback
      if (type === 'pix') {
        setCopiedText('Código copiado!');
        setTimeout(() => setCopiedText(null), 3000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    });
  };

  const handleSelectTreatment = (treatment: LensTreatment) => {
    setSelectedTreatmentId(treatment.id);
    
    setQuote(prev => {
      if (prev.items.length === 0) return prev;
      
      const newItems = [...prev.items];
      const currentItem = newItems[0];
      
      // Determine base lens formulation
      let baseType = 'Lente Monofocal Orgânica';
      if (currentItem.lensType.toLowerCase().includes('multifocal') || currentItem.lensType.toLowerCase().includes('progressiv')) {
        baseType = 'Lente Multifocal Digital Alta Precisão';
      } else if (currentItem.lensType.toLowerCase().includes('bifocal')) {
        baseType = 'Lente Bifocal';
      }
      
      const updatedLensType = `${baseType} + ${treatment.name}`;
      const updatedLensPrice = treatment.suggestedPriceAddon;
      
      newItems[0] = {
        ...currentItem,
        lensType: updatedLensType,
        lensPrice: updatedLensPrice
      };
      
      const newSubtotal = newItems.reduce((acc, it) => acc + (it.frame.price + it.lensPrice), 0);
      const newTotal = Math.max(0, newSubtotal - prev.discount);
      
      let obs = prev.observations;
      if (treatment.id === 'antirreflexo') {
        obs = 'Orçamento com tratamento Antirreflexo Especializado (elimina reflexos, garante nitidez total e conforto na direção noturna).';
      } else if (treatment.id === 'filtro_azul') {
        obs = 'Orçamento com tratamento Filtro Azul Blue UV / BlueCut (bloqueio da luz azul nociva de computadores, celulares e luz LED, reduzindo fadiga ocular).';
      } else if (treatment.id === 'fotocromaticas') {
        obs = 'Orçamento com lentes Fotocromáticas dinâmicas (clareiam em ambientes internos e escurecem no sol com 100% de proteção UVA/UVB).';
      }
      
      return {
        ...prev,
        items: newItems,
        subtotal: newSubtotal,
        total: newTotal,
        observations: obs
      };
    });

    setTreatmentToast(`Tratamento "${treatment.name}" aplicado ao orçamento!`);
    setTimeout(() => setTreatmentToast(null), 3500);
  };

  const handleSimulatePaymentSuccess = () => {
    setPaymentStatus('processando');
    setTimeout(() => {
      setPaymentStatus('pago');
      
      const totalAmount = activeTab === 'quote' ? quote.total : receipt.amount;
      const customerName = activeTab === 'quote' ? quote.customerName : receipt.customerName;
      const customerCpf = activeTab === 'quote' ? quote.customerCpf : receipt.customerCpf;
      const customerPhone = activeTab === 'quote' ? quote.customerPhone : receipt.customerPhone;
      
      // If we are currently in 'quote' mode, let's prefill the receipt structure and update its entries!
      if (activeTab === 'quote') {
        const itemsDescription = quote.items.map((item, i) => `${i+1}) ${item.frame.name} (${item.selectedColor}) + Lentes: ${item.lensType}`).join(', ');
        
        setReceipt({
          id: `R-${Math.floor(1000 + Math.random() * 9000).toString()}`,
          receiptNumber: `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000).toString()}-RC`,
          date: new Date().toISOString().split('T')[0],
          customerName: customerName,
          customerCpf: customerCpf || '123.456.789-00',
          customerPhone: customerPhone,
          amount: totalAmount,
          amountWritten: getWrittenOutBRL(totalAmount),
          descriptionOfServices: `Compra de óculos sob medida realizada a domicílio com receita vinculada. Óculos: ${itemsDescription}.`,
          paymentMethod: paymentType === 'pix' ? 'Pix à vista (Pago instantaneamente)' : `Link de Pagamento - ${installments.toUpperCase()} (Aprovado via ${acquirer.toUpperCase()})`,
          sellerName: quote.sellerName || 'Gerente Carlos S. - Ótica Visão',
          cnpj: '12.345.678/0001-90',
          companyName: 'Ótica Visão Ltda.'
        });
      } else {
        // If we are in 'receipt' mode already, update its payment method
        setReceipt(prev => ({
          ...prev,
          paymentMethod: paymentType === 'pix' ? 'Pix à vista (Pago instantaneamente)' : `Link de Pagamento - ${installments.toUpperCase()} - Aprovado via ${acquirer.toUpperCase()}`
        }));
      }
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  // Build formatted text to share on WhatsApp
  const shareQuoteWhatsApp = () => {
    const text = `*ÓTICA VISÃO - ORÇAMENTO EXCLUSIVO*\n\n` +
      `*Número:* ${quote.quoteNumber}\n` +
      `*Cliente:* ${quote.customerName}\n` +
      `*Validade:* Até ${quote.validUntil.split('-').reverse().join('/')}\n\n` +
      `*PRODUTO(S) SELECIONADO(S):*\n` +
      quote.items.map((item, i) => `${i+1}) ${item.frame.name} (${item.selectedColor}) + Lentes: ${item.lensType} -> R$ ${(item.frame.price + item.lensPrice).toFixed(2)}`).join('\n') + `\n\n` +
      `*Subtotal:* R$ ${quote.subtotal.toFixed(2).replace('.', ',')}\n` +
      `*Desconto Especial:* R$ ${quote.discount.toFixed(2).replace('.', ',')}\n` +
      `*TOTAL ESTIMADO:* R$ ${quote.total.toFixed(2).replace('.', ',')}\n\n` +
      `*Forma de Pagamento sugerida:* ${quote.paymentMethod}\n` +
      `*Vendedor(a):* ${quote.sellerName}\n\n` +
      `Deseja agendar uma visita física na nossa filial para aprovar esse orçamento? Respondendo essa mensagem você confirma o atendimento!`;
    
    return `https://wa.me/5511947069414?text=${encodeURIComponent(text)}`;
  };

  const shareReceiptWhatsApp = () => {
    const text = `*ÓTICA VISÃO - COMPROVANTE DE RECIBO*\n\n` +
      `*Número:* ${receipt.receiptNumber}\n` +
      `*Data:* ${receipt.date.split('-').reverse().join('/')}\n` +
      `*Emitente:* ${receipt.companyName} (CNPJ: ${receipt.cnpj})\n\n` +
      `Recebemos de *${receipt.customerName}* (CPF: ${receipt.customerCpf}) a importância líquida de *${receipt.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}* (${receipt.amountWritten}) referente aos serviços:\n` +
      `"${receipt.descriptionOfServices}"\n\n` +
      `*Método de Liquidação:* ${receipt.paymentMethod}\n` +
      `*Responsável pela Emissão:* ${receipt.sellerName}\n\n` +
      `Obrigado por escolher a nossa Ótica! Sua visão merece o melhor cuidado de especialista.`;
    
    return `https://wa.me/5511947069414?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="py-4">
      {/* Intro info panel */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 mb-8 text-left flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-3 items-start">
          <div className="p-3 bg-slate-900 text-gold-400 rounded-xl flex-shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-display font-black text-[#0B132B] text-sm">Central Administrativa de Documentos</h4>
            <p className="text-xs text-slate-500 max-w-lg mt-0.5">
              Edite diretamente os campos das fichas técnicas de orçamentos e recibos abaixo. A pre-visualização se ajusta em tempo real e você pode imprimir como PDF para entregar ao paciente ou encaminhar via WhatsApp.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-800 rounded-xl transition-all shadow-sm"
        >
          <Printer className="h-4 w-4 text-slate-600" />
          Imprimir / Exportar PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px mb-8 justify-start">
        <button
          onClick={() => setActiveTab('quote')}
          className={`px-5 py-3 font-display font-extrabold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'quote'
              ? 'border-gold-500 text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          1. Orçamento de Óculos Editável
        </button>
        <button
          onClick={() => setActiveTab('receipt')}
          className={`px-5 py-3 font-display font-extrabold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'receipt'
              ? 'border-gold-500 text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          2. Emissor de Recibos Comercial
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
        
        {/* EDITING FORM PANEL (Left - 5 Cols) */}
        <div className="lg:col-span-5 space-y-6 print:hidden text-left">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-display font-black text-slate-900 text-sm pb-4 border-b border-slate-100 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-gold-500" />
              Painel de Edição de Campos
            </h3>

            {activeTab === 'quote' ? (
              // QUOTE EDIT FIELDS
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Cód. Orçamento</label>
                    <input
                      type="text"
                      value={quote.quoteNumber}
                      onChange={(e) => updateQuoteField('quoteNumber', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Válido Até</label>
                    <input
                      type="date"
                      value={quote.validUntil}
                      onChange={(e) => updateQuoteField('validUntil', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Nome do Paciente</label>
                  <input
                    type="text"
                    value={quote.customerName}
                    onChange={(e) => updateQuoteField('customerName', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">CPF Paciente</label>
                    <input
                      type="text"
                      value={quote.customerCpf}
                      onChange={(e) => updateQuoteField('customerCpf', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Tel. WhatsApp</label>
                    <input
                      type="text"
                      value={quote.customerPhone}
                      onChange={(e) => updateQuoteField('customerPhone', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Edit Quote Items directly */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2">Produtos e Valores</span>
                  {quote.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 mb-2">
                      <div>
                        <label className="block text-[9px] text-slate-400">Armação</label>
                        <input
                          type="text"
                          value={item.frame.name}
                          onChange={(e) => updateQuoteItemName(idx, 'frame', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">Preço Armação (R$)</span>
                          <input
                            type="number"
                            value={item.frame.price}
                            onChange={(e) => updateQuoteItemPrice(idx, 'frame', e.target.value)}
                            className="w-32 text-right px-2 py-0.5 bg-white border border-slate-200 rounded text-xs"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-1">
                        <label className="block text-[9px] text-slate-400">Lentes</label>
                        <input
                          type="text"
                          value={item.lensType}
                          onChange={(e) => updateQuoteItemName(idx, 'lens', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">Preço Lentes (R$)</span>
                          <input
                            type="number"
                            value={item.lensPrice}
                            onChange={(e) => updateQuoteItemPrice(idx, 'lens', e.target.value)}
                            className="w-32 text-right px-2 py-0.5 bg-white border border-slate-200 rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Treatment Selector for Lenses */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-gold-500" />
                      Tratamento de Lentes Rápido
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">1-Clique p/ aplicar</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {LENS_TREATMENTS.map((t) => {
                      const isSelected = selectedTreatmentId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTreatment(t)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <span className={`text-[8px] font-mono font-bold uppercase tracking-wider block truncate ${
                              isSelected ? 'text-gold-400' : 'text-slate-500'
                            }`}>
                              {t.badge}
                            </span>
                            <span className="text-[11px] font-bold block leading-tight mt-0.5">
                              {t.id === 'antirreflexo' ? 'Antirreflexo' : t.id === 'filtro_azul' ? 'Filtro Azul' : 'Fotocromáticas'}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono font-semibold block mt-1.5 ${
                            isSelected ? 'text-white' : 'text-slate-500'
                          }`}>
                            +R$ {t.suggestedPriceAddon.toFixed(0)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {treatmentToast && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold rounded-lg flex items-center gap-1.5 animate-fade-in">
                      <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                      <span>{treatmentToast}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Desconto Especial (R$)</label>
                    <input
                      type="number"
                      value={quote.discount}
                      onChange={(e) => updateQuoteField('discount', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Método Sugerido</label>
                    <input
                      type="text"
                      value={quote.paymentMethod}
                      onChange={(e) => updateQuoteField('paymentMethod', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Assinatura do Consultor</label>
                  <input
                    type="text"
                    value={quote.sellerName}
                    onChange={(e) => updateQuoteField('sellerName', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <a
                  href={shareQuoteWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <MessageSquare className="h-4 w-4" />
                  Enviar Orçamento pelo WhatsApp
                </a>
              </div>
            ) : (
              // RECEIPT EDIT FIELDS
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Empresa Emitente</label>
                  <input
                    type="text"
                    value={receipt.companyName}
                    onChange={(e) => updateReceiptField('companyName', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1 font-bold">Valor (R$)</label>
                    <input
                      type="number"
                      value={receipt.amount}
                      onChange={(e) => updateReceiptField('amount', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Numeração Fatura</label>
                    <input
                      type="text"
                      value={receipt.receiptNumber}
                      onChange={(e) => updateReceiptField('receiptNumber', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Extenso Automático</label>
                  <input
                    type="text"
                    readOnly
                    color="gray"
                    value={receipt.amountWritten}
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-100 rounded-lg text-xs text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Nome do Pagador</label>
                  <input
                    type="text"
                    value={receipt.customerName}
                    onChange={(e) => updateReceiptField('customerName', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1 font-semibold">CPF do Pagador</label>
                    <input
                      type="text"
                      value={receipt.customerCpf}
                      onChange={(e) => updateReceiptField('customerCpf', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">WhatsApp de Contato</label>
                    <input
                      type="text"
                      value={receipt.customerPhone}
                      onChange={(e) => updateReceiptField('customerPhone', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Descrição Detalhada do Serviço / Óculos</label>
                  <textarea
                    rows={3}
                    value={receipt.descriptionOfServices}
                    onChange={(e) => updateReceiptField('descriptionOfServices', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Método de Liquidação</label>
                    <input
                      type="text"
                      value={receipt.paymentMethod}
                      onChange={(e) => updateReceiptField('paymentMethod', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">Gerente Emissor</label>
                    <input
                      type="text"
                      value={receipt.sellerName}
                      onChange={(e) => updateReceiptField('sellerName', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <a
                  href={shareReceiptWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <MessageSquare className="h-4 w-4" />
                  Enviar Recibo pelo WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* MÓDULO DE RECEBIMENTO DIGITAL (Pix e Links de Pagamento) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-gold-600" />
                <h4 className="font-display font-black text-xs text-slate-950 uppercase tracking-wider">
                  Módulo de Cobrança Digital
                </h4>
              </div>
              <span className="text-[10px] font-mono bg-gold-400/10 text-gold-700 px-2.5 py-0.5 rounded-full font-bold">
                R$ {((activeTab === 'quote' ? quote.total : receipt.amount) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
            </div>

            {/* Selector de Método */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentType('pix')}
                className={`py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentType === 'pix'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" /> Pix Instantâneo
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('link')}
                className={`py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentType === 'link'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Link className="h-3.5 w-3.5" /> Link de Pagamento
              </button>
            </div>

            {/* PIX CONTENT BLOCKS */}
            {paymentType === 'pix' && (
              <div className="space-y-4 pt-1 animate-fade-in">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col items-center text-center relative overflow-hidden">
                  {/* Real-looking interactive Pix QR code */}
                  <div className="relative p-3 bg-white border border-slate-200 rounded-xl shadow-inner mb-2.5">
                    <svg viewBox="0 0 100 100" className="w-32 h-32">
                      {/* Quiet Zone Grid simulated with beautiful code blocks */}
                      <path d="M5,5 h15 v15 h-15 z M5,10 h15 M10,5 v15" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M5,80 h15 v15 h-15 z M5,85 h15 M10,80 v15" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M80,5 h15 v15 h-15 z M80,10 h15 M85,5 v15" stroke="#334155" strokeWidth="2" fill="none" />
                      
                      {/* Inner Matrix Pixels decoration */}
                      <rect x="25" y="5" width="4" height="4" fill="#334155" />
                      <rect x="35" y="15" width="4" height="4" fill="#334155" />
                      <rect x="55" y="5" width="8" height="8" fill="#334155" />
                      <rect x="70" y="25" width="4" height="12" fill="#334155" />
                      <rect x="5" y="30" width="12" height="4" fill="#334155" />
                      <rect x="25" y="35" width="8" height="4" fill="#334155" />
                      
                      <rect x="35" y="45" width="30" height="4" fill="#1e3a5f" />
                      <rect x="45" y="35" width="4" height="30" fill="#1e3a5f" />
                      
                      <rect x="55" y="65" width="12" height="12" fill="#334155" />
                      <rect x="35" y="75" width="4" height="16" fill="#334155" />
                      <rect x="75" y="55" width="16" height="4" fill="#334155" />
                      <rect x="85" y="65" width="8" height="8" fill="#334155" />
                      
                      {/* High-quality Pix Bacen Central Logo representation */}
                      <circle cx="50" cy="50" r="10" fill="#0284c7" />
                      <path d="M47,50 l3,-3 l3,3 l-3,3 z" fill="#ffffff" />
                    </svg>
                    {paymentStatus === 'pago' && (
                      <div className="absolute inset-0 bg-emerald-500/95 backdrop-blur-xs flex flex-col items-center justify-center text-white rounded-xl">
                        <Check className="h-10 w-10 animate-scale-up mb-1" />
                        <span className="font-sans font-black text-[9px] uppercase tracking-wider">PIX CONFIRMADO</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-400 font-mono">Chave Aleatória de Segurança</span>
                  
                  {/* Copia e Cola field */}
                  <div className="w-full flex gap-1.5 mt-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={getPixPayload()} 
                      className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono text-[9px] truncate outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(getPixPayload(), 'pix')}
                      className="px-3 bg-slate-900 text-white rounded-lg text-xs hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                      title="Copiar Código Pix"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {copiedText && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {copiedText}
                    </span>
                  )}
                </div>

                {/* Simulated status tracker */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    {paymentStatus === 'aguardando' ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span className="font-medium text-slate-650">Aguardando transferência...</span>
                      </>
                    ) : paymentStatus === 'processando' ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        <span className="font-semibold text-blue-600">Validando transação...</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="font-black text-emerald-600 uppercase tracking-widest text-[10px]">PAGAMENTO APROVADO</span>
                      </>
                    )}
                  </div>

                  {paymentStatus === 'aguardando' && (
                    <button
                      type="button"
                      onClick={handleSimulatePaymentSuccess}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Simular Recebimento
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PAYMENT LINK CONTENT BLOCKS */}
            {paymentType === 'link' && (
              <div className="space-y-3.5 pt-1 animate-fade-in text-left">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[8px] uppercase font-mono tracking-wider text-slate-400 mb-1">Gateway Provedor</label>
                    <select
                      value={acquirer}
                      onChange={(e: any) => setAcquirer(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:border-gold-500 focus:outline-none"
                    >
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="pagseguro">PagSeguro UOL</option>
                      <option value="stone">Stone Link</option>
                      <option value="infinitepay">InfinitePay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-mono tracking-wider text-slate-400 mb-1">Max Parcelas</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:border-gold-500 focus:outline-none"
                    >
                      <option value="à vista">À vista (sem juros)</option>
                      <option value="2x sem juros">Até 2x sem juros</option>
                      <option value="3x sem juros">Até 3x sem juros</option>
                      <option value="6x sem juros">Até 6x sem juros</option>
                      <option value="10x sem juros">Até 10x sem juros</option>
                      <option value="12x com pequeno acréscimo">Até 12x c/ acréscimo</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-slate-650">
                    <CreditCard className="h-4 w-4 text-slate-450" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Checkout de Segurança Ativo ({acquirer.toUpperCase()})</span>
                  </div>

                  {/* Show link simulation */}
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      readOnly 
                      value={getPaymentLink()} 
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 font-mono text-[9px] truncate outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(getPaymentLink(), 'link')}
                      className="px-3 bg-slate-900 text-white rounded-lg text-xs hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                      title="Copiar Link de Pagamento"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={(() => {
                        const amount = activeTab === 'quote' ? quote.total : receipt.amount;
                        const clientName = activeTab === 'quote' ? quote.customerName : receipt.customerName;
                        const phone = activeTab === 'quote' ? quote.customerPhone : receipt.customerPhone;
                        const text = `Olá, *${clientName}*! Tudo bem? 🕶️\n\n` +
                          `Segue o seu *link de pagamento seguro* para aprovação e confecção do seu óculos sob medida na *Ótica Rapido*.\n\n` +
                          `💳 *Total:* R$ ${amount.toFixed(2).replace('.', ',')} (Em até ${installments})\n` +
                          `🔗 *Link para pagar:* ${getPaymentLink()}\n\n` +
                          `Assim que aprovado, nosso laboratório iniciará imediatamente a lapidação do seu grau de alta precisão!`;
                        const cleanPhone = phone.replace(/\D/g, '');
                        return `https://wa.me/${cleanPhone ? `55${cleanPhone}` : '5511947069414'}?text=${encodeURIComponent(text)}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors text-center cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Enviar p/ Cliente
                    </a>

                    <button
                      type="button"
                      onClick={handleSimulatePaymentSuccess}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors text-center cursor-pointer"
                    >
                      Simular Aprovação Link
                    </button>
                  </div>

                  {linkCopied && (
                    <span className="text-[10px] text-emerald-600 font-semibold block text-center">
                      ✓ Link de Pagamento copiado para o WhatsApp!
                    </span>
                  )}
                </div>

                {/* Payment State Display */}
                {paymentStatus === 'pago' && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-[11px]">Transação por Cartão de Crédito Aprovada!</p>
                      <p className="text-[10px] text-emerald-650 font-normal leading-tight">Valor faturado e sincronizado. O recibo de quitação fiscal correspondente já foi gerado.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <p className="text-[8px] text-slate-400 font-mono italic leading-normal text-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              Operação integrada ao sistema de gestão financeira Ótica Visão. Em conformidade com as diretivas seguras PCI-DSS.
            </p>
          </div>
        </div>

        {/* HIGH CONTRAST DOCUMENT PREVIEW (Right - 7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-300 rounded-3xl p-8 md:p-12 shadow-md relative min-h-[600px] flex flex-col justify-between overflow-hidden print:border-none print:shadow-none print:p-0">
          
          {/* Internal Sheet Frame */}
          <div>
            {activeTab === 'quote' ? (
              // VISUAL QUOTE CANVAS REPRESENTATION
              <div className="text-left font-sans">
                {/* Visual Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-6">
                  <div>
                    <h2 className="font-display font-black text-2xl uppercase tracking-widest text-slate-900 leading-none">
                      ÓTICA<span className="text-slate-500 font-light">VISÃO</span>
                    </h2>
                    <p className="font-mono text-[9px] uppercase text-slate-500 tracking-wider mt-1">Atendimento Digital & a Domicílio</p>
                    <p className="text-[10px] text-slate-400 mt-1">CNPJ: 12.345.678/0001-90</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-mono tracking-wider rounded uppercase font-bold">
                      PROPOSTA DE ORÇAMENTO
                    </span>
                    <p className="text-xs font-mono font-semibold text-slate-800 mt-2">Nº: {quote.quoteNumber}</p>
                    <p className="text-[10px] text-slate-400">Data: {quote.date.split('-').reverse().join('/')}</p>
                  </div>
                </div>

                {/* Patient/Doctor Block */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400">Dados do Cliente Paciente</span>
                    <p className="font-bold text-xs text-slate-800 mt-0.5">{quote.customerName}</p>
                    <p className="text-[10px] text-slate-500">CPF: {quote.customerCpf}</p>
                    <p className="text-[10px] text-slate-500">WhatsApp: {quote.customerPhone}</p>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400">Validade Especial</span>
                    <p className="font-semibold text-xs text-amber-700 mt-0.5">Até {quote.validUntil.split('-').reverse().join('/')}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Garantia integral das lentes: 365 dias contra riscos e defeitos.</p>
                  </div>
                </div>

                {/* Items details table */}
                <div className="mb-6">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                        <th className="pb-2">Descrição dos Produtos / Lentes</th>
                        <th className="pb-2 text-center w-16">Status</th>
                        <th className="pb-2 text-right w-28">Valor Unitário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {quote.items.map((item, i) => (
                        <tr key={i} className="py-2 inline-table w-full">
                          <td className="py-2">
                            <strong className="font-semibold text-slate-800">{item.frame.name}</strong>
                            <span className="block text-[10px] text-slate-500 font-medium">Marca: {item.frame.brand} | Cor Escolhida: {item.selectedColor}</span>
                          </td>
                          <td className="py-2 text-center">
                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded">Disponível</span>
                          </td>
                          <td className="py-2 text-right font-mono text-slate-800">
                            R$ {item.frame.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {quote.items.map((item, i) => (
                        <tr key={`${i}-lens`} className="py-2 inline-table w-full">
                          <td className="py-2">
                            <strong className="font-semibold text-slate-800">{item.lensType}</strong>
                            <span className="block text-[10px] text-slate-400 leading-tight">Laboratório Parceiro Autorizado Vista</span>
                          </td>
                          <td className="py-2 text-center" />
                          <td className="py-2 text-right font-mono text-slate-800">
                            {item.lensPrice === 0 ? 'Inclusa' : `R$ ${item.lensPrice.toFixed(2)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Linked Prescription Display if present */}
                {linkedPrescription && (
                  <div className="bg-slate-50/50 border border-slate-200 border-dashed rounded-xl p-4 mb-6 text-[10px] font-mono">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Especificações Ópticas da Lente Vinculada (Doutor: {linkedPrescription.doctorName})
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Olho Direito OD:</strong> ESP: {linkedPrescription.od.spherical} | CIL: {linkedPrescription.od.cylindrical} | EIXO: {linkedPrescription.od.axis}° | DNP: {linkedPrescription.od.dnp}mm{linkedPrescription.od.addition ? ` | ADD: ${linkedPrescription.od.addition}` : ''}
                      </div>
                      <div className="border-l border-slate-200 pl-4">
                        <strong>Olho Esquerdo OE:</strong> ESP: {linkedPrescription.oe.spherical} | CIL: {linkedPrescription.oe.cylindrical} | EIXO: {linkedPrescription.oe.axis}° | DNP: {linkedPrescription.oe.dnp}mm{linkedPrescription.oe.addition ? ` | ADD: ${linkedPrescription.oe.addition}` : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="border-t border-slate-200 pt-4 flex flex-col items-end spacing-y-1 bg-slate-50/20 px-4 py-3 rounded-xl">
                  <div className="flex justify-between w-full md:w-72 text-xs text-slate-500">
                    <span>Subtotal Armações + Lentes:</span>
                    <span className="font-mono">R$ {quote.subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between w-full md:w-72 text-xs text-emerald-600 font-semibold border-b border-dashed border-slate-200 pb-1 mt-1">
                    <span>Desconto Exclusivo Fidelidade:</span>
                    <span className="font-mono">- R$ {quote.discount.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between w-full md:w-72 text-sm font-bold text-slate-900 pt-1.5">
                    <span>Valor Líquido Total Proposto:</span>
                    <span className="font-mono text-base text-[#0B132B]">R$ {quote.total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-2 uppercase">{quote.paymentMethod}</p>
                </div>

                <div className="mt-8">
                  <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400 mb-1">Notas e Termos</span>
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    "{quote.observations}"
                  </p>
                </div>
              </div>
            ) : (
              // VISUAL RECEIPT CANVAS REPRESENTATION
              <div className="text-left font-sans">
                {/* Visual Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-8">
                  <div>
                    <h2 className="font-display font-black text-2xl uppercase tracking-widest text-slate-900 leading-none">
                      ÓTICA<span className="text-slate-500 font-light">VISÃO</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-1">CNPJ: {receipt.cnpj}</p>
                    <p className="text-[10px] text-slate-400">{receipt.companyName}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-mono tracking-wider rounded uppercase font-bold">
                      COMPROVANTE DE RECIBO
                    </span>
                    <p className="text-xs font-mono font-semibold text-slate-800 mt-2">Fatura nº: {receipt.receiptNumber}</p>
                    <p className="text-[10px] text-slate-400">Data Emissão: {receipt.date.split('-').reverse().join('/')}</p>
                  </div>
                </div>

                {/* Receipt textual slip core */}
                <div className="space-y-4 text-xs leading-relaxed text-slate-700 font-sans border border-slate-100 p-6 rounded-2xl bg-slate-50/50">
                  <p>
                    Declaramos sob nossa responsabilidade legal que recebemos de <strong className="text-slate-900 font-bold">{receipt.customerName}</strong>, inscrito sob o CPF de número <strong className="text-slate-900">{receipt.customerCpf}</strong>, a importância líquida e certa correspondente a:
                  </p>

                  <div className="bg-slate-200 font-mono text-sm font-extrabold text-slate-900 px-4 py-2.5 rounded-xl border border-slate-300/40 text-center uppercase tracking-wider my-4">
                    BRL R$ {receipt.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </div>

                  <p className="italic text-slate-500 text-center mt-[-8px] text-[10px]">
                    ({receipt.amountWritten})
                  </p>

                  <p className="pt-2">
                    Referente aos serviços comerciais descritos a seguir:
                  </p>
                  <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-mono text-[11px] leading-relaxed italic">
                    "{receipt.descriptionOfServices}"
                  </p>

                  <p className="pt-2">
                    Garantindo quitação de seus débitos fiscais sob o método de liquidação: <strong className="text-slate-900">{receipt.paymentMethod}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Visual Signatures Area */}
          <div className="border-t border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-4 text-xs">
            <div className="text-center md:text-left">
              <p className="font-mono text-[10px] text-slate-400">RESPONSÁVEL PELA EMISSÃO</p>
              <div className="w-48 h-8 mx-auto md:mx-0 border-b border-slate-300 mt-2 font-serif text-slate-400 text-sm flex items-end justify-center py-1 select-none">
                {activeTab === 'quote' ? quote.sellerName.split(' ')[0] : receipt.sellerName.split(' ')[0]} - Assinado Digital
              </div>
              <p className="font-semibold text-[10px] text-slate-700 mt-1">{activeTab === 'quote' ? quote.sellerName : receipt.sellerName}</p>
            </div>
            <div className="text-center md:text-right">
              <p className="font-mono text-[10px] text-slate-400">ASSINATURA DO CLIENTE</p>
              <div className="w-48 h-8 ml-auto border-b border-slate-300 mt-2 flex items-end justify-center font-serif text-slate-300 select-none">
                Visto Físico Presencial
              </div>
              <p className="font-semibold text-[10px] text-slate-700 mt-1">{activeTab === 'quote' ? quote.customerName : receipt.customerName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARATIVE TABLE OF LENS TREATMENTS (Antirreflexo, Filtro Azul, Fotocromáticas) */}
      {activeTab === 'quote' && (
        <div className="mt-8 print:hidden">
          <LensTreatmentComparison
            onSelectTreatment={handleSelectTreatment}
            selectedTreatmentId={selectedTreatmentId}
          />
        </div>
      )}
    </div>
  );
}
