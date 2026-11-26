export interface EyewearFrame {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: 'grau' | 'sol' | 'esporte';
  gender: 'unissex' | 'masculino' | 'feminino';
  shape: 'redondo' | 'quadrado' | 'retangular' | 'gatinho' | 'aviador' | 'oval' | 'geometrico';
  material: 'acetato' | 'metal' | 'titanio' | 'madeira' | 'injetado';
  imageUrl: string;
  colors: string[];
  description: string;
  rating: number;
  referenceCode?: string;
  faceRecommendation?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export interface CustomerSession {
  id: string;
  identifier: string;
  identifierType: 'email' | 'phone';
  fullName: string;
  email?: string;
  phone?: string;
  lgpdConsent: boolean;
  lgpdConsentAt: string;
  lastLoginAt: string;
}

export interface AdminSession {
  email: string;
  name: string;
  role: 'admin';
  authenticatedAt: string;
  expiresAt: string;
}

export interface AdminAuthStatus {
  configured: boolean;
  requiresSetup: boolean;
  source: 'env' | 'claimed' | 'unconfigured';
  expectedEmailHint?: string;
}

export interface HomeVisitAppointment {
  id: string;
  protocol: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  zipCode?: string;
  streetAddress: string;
  complement?: string;
  neighborhood: string;
  city: string;
  visitDate: string;
  preferredTime: string;
  serviceType: string;
  notes?: string;
  lgpdConsent: boolean;
  status: 'agendado' | 'confirmado' | 'concluido';
  createdAt: string;
}

export interface EyePrescriptionFields {
  spherical: string; // Esférico (ex: -2.50, +1.25)
  cylindrical: string; // Cilíndrico (ex: -1.00)
  axis: string; // Eixo (ex: 180°)
  dnp: string; // Distância Nasopupilar (ex: 32mm)
  addition?: string; // Adição (ex: +2.00) para perto/multifocal
  height?: string; // Altura (para multifocais)
}

export interface MedicalPrescription {
  patientName: string;
  doctorName: string;
  doctorCrm: string;
  date: string;
  od: EyePrescriptionFields; // Olho Direito
  oe: EyePrescriptionFields; // Olho Esquerdo
  observation?: string;
  fileAttached?: {
    name: string;
    size: string;
    type: string;
    previewUrl?: string;
  };
}

export interface SelectedItem {
  frame: EyewearFrame;
  selectedColor: string;
  lensType: string;
  lensPrice: number;
  prescription?: MedicalPrescription;
}

export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'cancelado';

export interface SavedPrescriptionRecord extends MedicalPrescription {
  id: string;
  customerId?: string;
  createdAt: string;
}

export interface OpticalQuote {
  id: string;
  quoteNumber: string;
  date: string;
  validUntil: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCpf: string;
  includeFrame?: boolean;
  prescription?: MedicalPrescription;
  items: SelectedItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  observations: string;
  sellerName: string;
  status?: QuoteStatus;
  createdBy?: 'admin' | 'cliente';
  createdAt?: string;
}

export interface OpticalReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  customerName: string;
  customerCpf: string;
  customerPhone: string;
  amount: number;
  amountWritten: string; // Valor por extenso
  descriptionOfServices: string;
  paymentMethod: string;
  sellerName: string;
  cnpj: string;
  companyName: string;
}
