import { supabase } from '../lib/supabase';
import {
  CustomerSession,
  EyewearFrame,
  HomeVisitAppointment,
  MedicalPrescription,
  OpticalQuote,
  QuoteStatus,
} from '../types';

const STORAGE_KEYS = {
  CUSTOM_FRAMES: 'otica_rapido_custom_frames_v1',
  CUSTOMER_SESSION: 'otica_rapido_customer_session_v1',
  CUSTOMERS_DB: 'otica_rapido_customers_v1',
  PRESCRIPTIONS: 'otica_rapido_prescriptions_v1',
  APPOINTMENTS: 'otica_rapido_appointments_v1',
  LGPD_REQUESTS: 'otica_rapido_lgpd_requests_v1',
  QUOTES: 'otica_rapido_quotes_v1',
} as const;

const FRAMES_UPDATED_EVENT = 'otica-frames-updated';
const QUOTES_UPDATED_EVENT = 'otica-quotes-updated';

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora caso o armazenamento local esteja indisponível
  }
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function compressImageToDataUrl(file: File, maxWidth = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// 1. GESTÃO DE ARMAÇÕES (CATÁLOGO + PAINEL /admin + SUPABASE REALTIME)
// ============================================================================

interface SupabaseFrameRow {
  id: string;
  reference_code: string;
  name: string;
  brand: string;
  price: number;
  category: EyewearFrame['category'];
  gender: EyewearFrame['gender'];
  shape: EyewearFrame['shape'];
  material: EyewearFrame['material'];
  image_url: string;
  colors: string[];
  description: string;
  face_recommendation: string;
  rating: number;
  created_at: string;
}

function mapRowToFrame(row: SupabaseFrameRow): EyewearFrame {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    name: row.name,
    brand: row.brand,
    price: Number(row.price) || 0,
    category: row.category,
    gender: row.gender,
    shape: row.shape,
    material: row.material,
    imageUrl: row.image_url,
    colors: Array.isArray(row.colors) && row.colors.length > 0 ? row.colors : ['Preto Clássico'],
    description: row.description || '',
    faceRecommendation: row.face_recommendation || '',
    rating: Number(row.rating) || 5.0,
    isCustom: true,
    createdAt: row.created_at,
  };
}

export async function fetchCustomFrames(): Promise<EyewearFrame[]> {
  const localFrames = readJsonStorage<EyewearFrame[]>(STORAGE_KEYS.CUSTOM_FRAMES, []);

  if (!supabase) {
    return localFrames;
  }

  try {
    const { data, error } = await supabase
      .from('frames')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return localFrames;
    }

    const mapped = (data as SupabaseFrameRow[]).map(mapRowToFrame);
    writeJsonStorage(STORAGE_KEYS.CUSTOM_FRAMES, mapped);
    return mapped;
  } catch {
    return localFrames;
  }
}

export async function uploadFrameImage(file: File): Promise<string> {
  if (supabase) {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `frames/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('frames-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg',
        });

      if (!uploadError) {
        const { data } = supabase.storage.from('frames-images').getPublicUrl(filePath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch {
      // Fallback para compressão local caso bucket ainda não esteja criado
    }
  }

  return compressImageToDataUrl(file);
}

export interface CreateFramePayload {
  name: string;
  brand: string;
  price: number;
  category: EyewearFrame['category'];
  gender: EyewearFrame['gender'];
  shape: EyewearFrame['shape'];
  material: EyewearFrame['material'];
  imageUrl: string;
  colors: string[];
  description: string;
  faceRecommendation: string;
  referenceCode?: string;
}

export async function createCustomFrame(payload: CreateFramePayload): Promise<EyewearFrame> {
  const referenceCode =
    payload.referenceCode?.trim() ||
    `REF-ADM-${Math.floor(100 + Math.random() * 900)}`;

  const localRecord: EyewearFrame = {
    id: generateUuid(),
    referenceCode,
    name: payload.name.trim(),
    brand: payload.brand.trim() || 'Ótica Rapido Exclusive',
    price: Number(payload.price) || 0,
    category: payload.category,
    gender: payload.gender,
    shape: payload.shape,
    material: payload.material,
    imageUrl: payload.imageUrl,
    colors: payload.colors.length > 0 ? payload.colors : ['Preto Clássico'],
    description: payload.description.trim(),
    faceRecommendation: payload.faceRecommendation.trim(),
    rating: 5.0,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  let savedFrame = localRecord;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('frames')
        .insert({
          reference_code: localRecord.referenceCode,
          name: localRecord.name,
          brand: localRecord.brand,
          price: localRecord.price,
          category: localRecord.category,
          gender: localRecord.gender,
          shape: localRecord.shape,
          material: localRecord.material,
          image_url: localRecord.imageUrl,
          colors: localRecord.colors,
          description: localRecord.description,
          face_recommendation: localRecord.faceRecommendation,
          rating: 5.0,
        })
        .select()
        .single();

      if (!error && data) {
        savedFrame = mapRowToFrame(data as SupabaseFrameRow);
      }
    } catch {
      // Mantém persistência local
    }
  }

  const existing = readJsonStorage<EyewearFrame[]>(STORAGE_KEYS.CUSTOM_FRAMES, []);
  const updated = [savedFrame, ...existing.filter((f) => f.id !== savedFrame.id)];
  writeJsonStorage(STORAGE_KEYS.CUSTOM_FRAMES, updated);
  window.dispatchEvent(new CustomEvent(FRAMES_UPDATED_EVENT));

  return savedFrame;
}

export async function deleteCustomFrame(frameId: string): Promise<void> {
  if (supabase) {
    try {
      await supabase.from('frames').delete().eq('id', frameId);
    } catch {
      // Continua removendo do cache local
    }
  }

  const existing = readJsonStorage<EyewearFrame[]>(STORAGE_KEYS.CUSTOM_FRAMES, []);
  const updated = existing.filter((f) => f.id !== frameId);
  writeJsonStorage(STORAGE_KEYS.CUSTOM_FRAMES, updated);
  window.dispatchEvent(new CustomEvent(FRAMES_UPDATED_EVENT));
}

export function subscribeToCustomFrames(onUpdate: (frames: EyewearFrame[]) => void): () => void {
  const handleLocalOrRemoteChange = async () => {
    const frames = await fetchCustomFrames();
    onUpdate(frames);
  };

  window.addEventListener(FRAMES_UPDATED_EVENT, handleLocalOrRemoteChange);

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.CUSTOM_FRAMES) {
      handleLocalOrRemoteChange();
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (supabase) {
    channel = supabase
      .channel('public:frames-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'frames' },
        () => {
          handleLocalOrRemoteChange();
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener(FRAMES_UPDATED_EVENT, handleLocalOrRemoteChange);
    window.removeEventListener('storage', handleStorageEvent);
    if (supabase && channel) {
      supabase.removeChannel(channel);
    }
  };
}

// ============================================================================
// 2. LOGIN RÁPIDO DE CLIENTES (PASSWORDLESS: E-MAIL OU TELEFONE WHATSAPP)
// ============================================================================

export function normalizeIdentifier(raw: string, type: 'email' | 'phone'): string {
  if (type === 'email') {
    return raw.trim().toLowerCase();
  }
  return raw.replace(/\D/g, '');
}

export function getStoredCustomerSession(): CustomerSession | null {
  return readJsonStorage<CustomerSession | null>(STORAGE_KEYS.CUSTOMER_SESSION, null);
}

export function clearCustomerSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.CUSTOMER_SESSION);
  } catch {
    // noop
  }
}

export async function identifyOrRegisterCustomer(params: {
  identifierRaw: string;
  identifierType: 'email' | 'phone';
  fullName?: string;
  lgpdConsent: boolean;
}): Promise<{ session: CustomerSession; isNewCustomer: boolean }> {
  const normalized = normalizeIdentifier(params.identifierRaw, params.identifierType);
  const nowIso = new Date().toISOString();

  if (!normalized) {
    throw new Error('Informe um e-mail ou número de WhatsApp válido.');
  }

  if (!params.lgpdConsent) {
    throw new Error('É necessário aceitar os termos de proteção de dados (LGPD) para continuar.');
  }

  const emailValue = params.identifierType === 'email' ? normalized : undefined;
  const phoneValue = params.identifierType === 'phone' ? params.identifierRaw.trim() : undefined;

  if (supabase) {
    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('identifier', normalized)
        .maybeSingle();

      if (existingCustomer) {
        const updatedName = params.fullName?.trim() || existingCustomer.full_name || '';
        const { data: updatedRow } = await supabase
          .from('customers')
          .update({
            full_name: updatedName,
            last_login_at: nowIso,
          })
          .eq('id', existingCustomer.id)
          .select()
          .single();

        const row = updatedRow || existingCustomer;
        const session: CustomerSession = {
          id: row.id,
          identifier: row.identifier,
          identifierType: row.identifier_type,
          fullName: row.full_name || '',
          email: row.email || undefined,
          phone: row.phone || undefined,
          lgpdConsent: Boolean(row.lgpd_consent),
          lgpdConsentAt: row.lgpd_consent_at || nowIso,
          lastLoginAt: row.last_login_at || nowIso,
        };
        writeJsonStorage(STORAGE_KEYS.CUSTOMER_SESSION, session);
        return { session, isNewCustomer: false };
      }

      const { data: insertedRow, error: insertError } = await supabase
        .from('customers')
        .insert({
          identifier: normalized,
          identifier_type: params.identifierType,
          full_name: params.fullName?.trim() || '',
          email: emailValue || null,
          phone: phoneValue || null,
          lgpd_consent: true,
          lgpd_consent_at: nowIso,
          last_login_at: nowIso,
        })
        .select()
        .single();

      if (!insertError && insertedRow) {
        const session: CustomerSession = {
          id: insertedRow.id,
          identifier: insertedRow.identifier,
          identifierType: insertedRow.identifier_type,
          fullName: insertedRow.full_name || '',
          email: insertedRow.email || undefined,
          phone: insertedRow.phone || undefined,
          lgpdConsent: Boolean(insertedRow.lgpd_consent),
          lgpdConsentAt: insertedRow.lgpd_consent_at || nowIso,
          lastLoginAt: insertedRow.last_login_at || nowIso,
        };
        writeJsonStorage(STORAGE_KEYS.CUSTOMER_SESSION, session);
        return { session, isNewCustomer: true };
      }
    } catch {
      // Fallback para persistência local caso tabela ainda não exista
    }
  }

  // Persistência local (fallback seguro)
  const localCustomers = readJsonStorage<CustomerSession[]>(STORAGE_KEYS.CUSTOMERS_DB, []);
  const foundIndex = localCustomers.findIndex((c) => c.identifier === normalized);

  if (foundIndex >= 0) {
    const existing = localCustomers[foundIndex];
    const updated: CustomerSession = {
      ...existing,
      fullName: params.fullName?.trim() || existing.fullName,
      lastLoginAt: nowIso,
    };
    localCustomers[foundIndex] = updated;
    writeJsonStorage(STORAGE_KEYS.CUSTOMERS_DB, localCustomers);
    writeJsonStorage(STORAGE_KEYS.CUSTOMER_SESSION, updated);
    return { session: updated, isNewCustomer: false };
  }

  const created: CustomerSession = {
    id: generateUuid(),
    identifier: normalized,
    identifierType: params.identifierType,
    fullName: params.fullName?.trim() || '',
    email: emailValue,
    phone: phoneValue,
    lgpdConsent: true,
    lgpdConsentAt: nowIso,
    lastLoginAt: nowIso,
  };
  writeJsonStorage(STORAGE_KEYS.CUSTOMERS_DB, [created, ...localCustomers]);
  writeJsonStorage(STORAGE_KEYS.CUSTOMER_SESSION, created);
  return { session: created, isNewCustomer: true };
}

// ============================================================================
// 3. RECEITAS MÉDICAS OFTALMOLÓGICAS (LGPD ART. 11 - DADOS SENSÍVEIS)
// ============================================================================

export async function savePrescriptionRecord(params: {
  prescription: MedicalPrescription;
  file?: File | null;
  customer?: CustomerSession | null;
  lgpdConsent: boolean;
}): Promise<{ id: string }> {
  if (!params.lgpdConsent) {
    throw new Error('O consentimento LGPD para tratamento de dados de saúde visual é obrigatório.');
  }

  let uploadedFilePath: string | null = null;

  if (supabase && params.file) {
    try {
      const ext = params.file.name.split('.').pop()?.toLowerCase() || 'bin';
      const ownerPrefix = params.customer?.identifier
        ? params.customer.identifier.replace(/[^a-zA-Z0-9]/g, '_')
        : 'guest';
      const path = `prescriptions/${ownerPrefix}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('prescriptions-files')
        .upload(path, params.file, {
          contentType: params.file.type || 'application/octet-stream',
          upsert: false,
        });
      if (!uploadErr) {
        uploadedFilePath = path;
      }
    } catch {
      // Mantém referência do arquivo sem quebrar o fluxo
    }
  }

  const recordId = generateUuid();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert({
          customer_id: params.customer?.id || null,
          customer_identifier: params.customer?.identifier || null,
          patient_name: params.prescription.patientName,
          doctor_name: params.prescription.doctorName || '',
          doctor_crm: params.prescription.doctorCrm || '',
          exam_date: params.prescription.date || new Date().toISOString().split('T')[0],
          od: params.prescription.od,
          oe: params.prescription.oe,
          observation: params.prescription.observation || '',
          file_name: params.prescription.fileAttached?.name || null,
          file_size: params.prescription.fileAttached?.size || null,
          file_type: params.prescription.fileAttached?.type || null,
          file_url: uploadedFilePath,
          lgpd_consent: true,
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        return { id: data.id };
      }
    } catch {
      // Fallback local
    }
  }

  const existing = readJsonStorage<Array<MedicalPrescription & { id: string; customerId?: string; createdAt: string }>>(
    STORAGE_KEYS.PRESCRIPTIONS,
    []
  );
  writeJsonStorage(STORAGE_KEYS.PRESCRIPTIONS, [
    {
      ...params.prescription,
      id: recordId,
      customerId: params.customer?.id,
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ]);

  return { id: recordId };
}

// ============================================================================
// 4. AGENDAMENTO ONLINE A DOMICÍLIO (SÃO PAULO)
// ============================================================================

export async function createHomeVisitAppointment(params: {
  customer?: CustomerSession | null;
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
}): Promise<HomeVisitAppointment> {
  if (!params.lgpdConsent) {
    throw new Error('É necessário autorizar o uso dos dados de endereço conforme a LGPD.');
  }

  const protocol = `AGD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();

  const appointment: HomeVisitAppointment = {
    id: generateUuid(),
    protocol,
    customerId: params.customer?.id,
    customerName: params.customerName.trim(),
    customerPhone: params.customerPhone.trim(),
    customerEmail: params.customerEmail?.trim() || undefined,
    zipCode: params.zipCode?.trim() || undefined,
    streetAddress: params.streetAddress.trim(),
    complement: params.complement?.trim() || undefined,
    neighborhood: params.neighborhood.trim(),
    city: params.city.trim() || 'São Paulo - SP',
    visitDate: params.visitDate,
    preferredTime: params.preferredTime,
    serviceType: params.serviceType,
    notes: params.notes?.trim() || undefined,
    lgpdConsent: true,
    status: 'agendado',
    createdAt: nowIso,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('home_visit_appointments')
        .insert({
          protocol: appointment.protocol,
          customer_id: appointment.customerId || null,
          customer_name: appointment.customerName,
          customer_phone: appointment.customerPhone,
          customer_email: appointment.customerEmail || '',
          zip_code: appointment.zipCode || '',
          street_address: appointment.streetAddress,
          complement: appointment.complement || '',
          neighborhood: appointment.neighborhood,
          city: appointment.city,
          visit_date: appointment.visitDate,
          preferred_time: appointment.preferredTime,
          service_type: appointment.serviceType,
          notes: appointment.notes || '',
          lgpd_consent: true,
          status: 'agendado',
        })
        .select('id, created_at')
        .single();

      if (!error && data) {
        appointment.id = data.id;
        appointment.createdAt = data.created_at || nowIso;
      }
    } catch {
      // Fallback local
    }
  }

  const existing = readJsonStorage<HomeVisitAppointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
  writeJsonStorage(STORAGE_KEYS.APPOINTMENTS, [appointment, ...existing]);

  return appointment;
}

export async function listRecentAppointments(customerPhoneOrEmail?: string): Promise<HomeVisitAppointment[]> {
  const local = readJsonStorage<HomeVisitAppointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
  if (!supabase || !customerPhoneOrEmail) {
    return local;
  }

  try {
    const clean = customerPhoneOrEmail.trim();
    const { data, error } = await supabase
      .from('home_visit_appointments')
      .select('*')
      .or(`customer_phone.eq.${clean},customer_email.eq.${clean}`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data) return local;

    return data.map((row: any) => ({
      id: row.id,
      protocol: row.protocol,
      customerId: row.customer_id || undefined,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email || undefined,
      zipCode: row.zip_code || undefined,
      streetAddress: row.street_address,
      complement: row.complement || undefined,
      neighborhood: row.neighborhood,
      city: row.city,
      visitDate: row.visit_date,
      preferredTime: row.preferred_time,
      serviceType: row.service_type,
      notes: row.notes || undefined,
      lgpdConsent: Boolean(row.lgpd_consent),
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch {
    return local;
  }
}

// ============================================================================
// 5. SOLICITAÇÕES LGPD (ART. 18)
// ============================================================================

export async function saveLgpdRequestRecord(params: {
  protocol: string;
  requestType: 'acesso' | 'correcao' | 'exclusao' | 'portabilidade' | 'revogacao';
  fullName: string;
  cpf: string;
  email: string;
  phone?: string;
  details?: string;
}): Promise<void> {
  if (supabase) {
    try {
      await supabase.from('lgpd_requests').insert({
        protocol: params.protocol,
        request_type: params.requestType,
        full_name: params.fullName,
        cpf: params.cpf,
        email: params.email,
        phone: params.phone || '',
        details: params.details || '',
        status: 'recebido',
      });
    } catch {
      // Fallback local
    }
  }

  const existing = readJsonStorage<any[]>(STORAGE_KEYS.LGPD_REQUESTS, []);
  writeJsonStorage(STORAGE_KEYS.LGPD_REQUESTS, [
    { ...params, createdAt: new Date().toISOString() },
    ...existing,
  ]);
}

// ============================================================================
// 6. ORÇAMENTOS DE CLIENTES (PAINEL /admin + SUPABASE REALTIME)
// ============================================================================

interface SupabaseQuoteRow {
  id: string;
  quote_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_cpf: string | null;
  items: OpticalQuote['items'];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  observations: string | null;
  seller_name: string;
  quote_date: string;
  valid_until: string;
  status: QuoteStatus;
  created_by: 'admin' | 'cliente';
  created_at: string;
}

function mapRowToQuote(row: SupabaseQuoteRow): OpticalQuote {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || '',
    customerCpf: row.customer_cpf || '',
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    total: Number(row.total) || 0,
    paymentMethod: row.payment_method || 'Pix à vista',
    observations: row.observations || '',
    sellerName: row.seller_name || 'Administrador - Ótica Rapido',
    date: row.quote_date || new Date().toISOString().split('T')[0],
    validUntil: row.valid_until || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: row.status || 'rascunho',
    createdBy: row.created_by || 'admin',
    createdAt: row.created_at,
  };
}

export async function fetchRegisteredCustomers(): Promise<CustomerSession[]> {
  const localCustomers = readJsonStorage<CustomerSession[]>(STORAGE_KEYS.CUSTOMERS_DB, []);
  const activeSession = getStoredCustomerSession();
  const mergedLocal = activeSession && !localCustomers.some((c) => c.identifier === activeSession.identifier)
    ? [activeSession, ...localCustomers]
    : localCustomers;

  if (!supabase) {
    return mergedLocal;
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('last_login_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      return mergedLocal;
    }

    const mapped: CustomerSession[] = data.map((row: any) => ({
      id: row.id,
      identifier: row.identifier,
      identifierType: row.identifier_type,
      fullName: row.full_name || '',
      email: row.email || undefined,
      phone: row.phone || undefined,
      lgpdConsent: Boolean(row.lgpd_consent),
      lgpdConsentAt: row.lgpd_consent_at || row.created_at,
      lastLoginAt: row.last_login_at || row.created_at,
    }));

    writeJsonStorage(STORAGE_KEYS.CUSTOMERS_DB, mapped);
    return mapped;
  } catch {
    return mergedLocal;
  }
}

export async function fetchQuotes(): Promise<OpticalQuote[]> {
  const localQuotes = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);

  if (!supabase) {
    return localQuotes;
  }

  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return localQuotes;
    }

    const mapped = (data as SupabaseQuoteRow[]).map(mapRowToQuote);
    writeJsonStorage(STORAGE_KEYS.QUOTES, mapped);
    return mapped;
  } catch {
    return localQuotes;
  }
}

export async function saveQuoteRecord(
  payload: Omit<OpticalQuote, 'id' | 'createdAt'> & { id?: string }
): Promise<OpticalQuote> {
  const nowIso = new Date().toISOString();
  const quoteNumber =
    payload.quoteNumber?.trim() ||
    `OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existingLocal = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);
  const isUpdate = Boolean(payload.id && existingLocal.some((q) => q.id === payload.id));

  const localQuote: OpticalQuote = {
    ...payload,
    id: payload.id || generateUuid(),
    quoteNumber,
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    customerEmail: payload.customerEmail?.trim() || '',
    customerCpf: payload.customerCpf?.trim() || '',
    subtotal: Number(payload.subtotal) || 0,
    discount: Number(payload.discount) || 0,
    total: Number(payload.total) || 0,
    status: payload.status || 'rascunho',
    createdBy: payload.createdBy || 'admin',
    createdAt: nowIso,
  };

  let savedQuote = localQuote;

  if (supabase) {
    try {
      const dbRow = {
        quote_number: localQuote.quoteNumber,
        customer_id: localQuote.customerId || null,
        customer_name: localQuote.customerName,
        customer_phone: localQuote.customerPhone,
        customer_email: localQuote.customerEmail,
        customer_cpf: localQuote.customerCpf,
        items: localQuote.items,
        subtotal: localQuote.subtotal,
        discount: localQuote.discount,
        total: localQuote.total,
        payment_method: localQuote.paymentMethod,
        observations: localQuote.observations,
        seller_name: localQuote.sellerName,
        quote_date: localQuote.date,
        valid_until: localQuote.validUntil,
        status: localQuote.status || 'rascunho',
        created_by: localQuote.createdBy || 'admin',
      };

      const response = isUpdate
        ? await supabase
            .from('quotes')
            .update(dbRow)
            .eq('id', localQuote.id)
            .select()
            .single()
        : await supabase
            .from('quotes')
            .upsert(dbRow, { onConflict: 'quote_number' })
            .select()
            .single();

      if (!response.error && response.data) {
        savedQuote = mapRowToQuote(response.data as SupabaseQuoteRow);
      }
    } catch {
      // Mantém persistência local
    }
  }

  const updatedList = [
    savedQuote,
    ...existingLocal.filter((q) => q.id !== savedQuote.id && q.quoteNumber !== savedQuote.quoteNumber),
  ];
  writeJsonStorage(STORAGE_KEYS.QUOTES, updatedList);
  window.dispatchEvent(new CustomEvent(QUOTES_UPDATED_EVENT));

  return savedQuote;
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<void> {
  if (supabase) {
    try {
      await supabase.from('quotes').update({ status }).eq('id', quoteId);
    } catch {
      // Fallback local
    }
  }

  const existing = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);
  const updated = existing.map((q) => (q.id === quoteId ? { ...q, status } : q));
  writeJsonStorage(STORAGE_KEYS.QUOTES, updated);
  window.dispatchEvent(new CustomEvent(QUOTES_UPDATED_EVENT));
}

export async function deleteQuoteRecord(quoteId: string): Promise<void> {
  if (supabase) {
    try {
      await supabase.from('quotes').delete().eq('id', quoteId);
    } catch {
      // Fallback local
    }
  }

  const existing = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);
  const updated = existing.filter((q) => q.id !== quoteId);
  writeJsonStorage(STORAGE_KEYS.QUOTES, updated);
  window.dispatchEvent(new CustomEvent(QUOTES_UPDATED_EVENT));
}

export function subscribeToQuotes(onUpdate: (quotes: OpticalQuote[]) => void): () => void {
  const handleChange = async () => {
    const quotes = await fetchQuotes();
    onUpdate(quotes);
  };

  window.addEventListener(QUOTES_UPDATED_EVENT, handleChange);

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.QUOTES) {
      handleChange();
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (supabase) {
    channel = supabase
      .channel('public:quotes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotes' },
        () => {
          handleChange();
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener(QUOTES_UPDATED_EVENT, handleChange);
    window.removeEventListener('storage', handleStorageEvent);
    if (supabase && channel) {
      supabase.removeChannel(channel);
    }
  };
}

