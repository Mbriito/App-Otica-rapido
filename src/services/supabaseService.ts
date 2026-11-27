import { supabase } from '../lib/supabase';
import { MIN_FRAME_PRICE, premiumFrames } from '../data/frames';
import { verifyCurrentAdminSession } from './adminAuthService';
import {
  CustomerSession,
  EyewearFrame,
  HomeVisitAppointment,
  MedicalPrescription,
  OpticalQuote,
  QuoteStatus,
  SavedPrescriptionRecord,
} from '../types';
import { calculateQuoteTotals } from '../utils/quoteUtils';

const STORAGE_KEYS = {
  CUSTOM_FRAMES: 'otica_rapido_custom_frames_v1',
  FRAME_PRICE_OVERRIDES: 'otica_rapido_frame_price_overrides_v1',
  CUSTOMER_SESSION: 'otica_rapido_customer_session_v1',
  CUSTOMERS_DB: 'otica_rapido_customers_v1',
  PRESCRIPTIONS: 'otica_rapido_prescriptions_v1',
  APPOINTMENTS: 'otica_rapido_appointments_v1',
  LGPD_REQUESTS: 'otica_rapido_lgpd_requests_v1',
  QUOTES: 'otica_rapido_quotes_v1',
} as const;

const FRAMES_UPDATED_EVENT = 'otica-frames-updated';
const QUOTES_UPDATED_EVENT = 'otica-quotes-updated';
const PRESCRIPTIONS_UPDATED_EVENT = 'otica-prescriptions-updated';

async function assertVerifiedAdmin(adminToken?: string | null): Promise<string> {
  const verified = await verifyCurrentAdminSession(adminToken);
  if (!verified || verified.role !== 'admin') {
    throw new Error('Permissão negada: apenas um administrador (ADM) autenticado pode realizar esta alteração.');
  }
  return verified.email;
}

function normalizeFramePrice(rawPrice: number): number {
  const numeric = Number(rawPrice);
  if (!Number.isFinite(numeric) || numeric < MIN_FRAME_PRICE) {
    return MIN_FRAME_PRICE;
  }
  return Math.round(numeric * 100) / 100;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value?: string): boolean {
  return Boolean(value && UUID_REGEX.test(value));
}

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
    price: normalizeFramePrice(Number(row.price)),
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

export async function fetchFramePriceOverrides(): Promise<Record<string, number>> {
  const localOverrides = readJsonStorage<Record<string, number>>(
    STORAGE_KEYS.FRAME_PRICE_OVERRIDES,
    {}
  );

  if (!supabase) {
    return localOverrides;
  }

  try {
    const { data, error } = await supabase
      .from('frame_price_overrides')
      .select('frame_id, price');

    if (error || !data) {
      return localOverrides;
    }

    const remoteMap: Record<string, number> = {};
    for (const row of data as Array<{ frame_id: string; price: number }>) {
      if (row.frame_id) {
        remoteMap[row.frame_id] = normalizeFramePrice(Number(row.price));
      }
    }
    // Remote Supabase overrides are authoritative so reset prices stay reset
    writeJsonStorage(STORAGE_KEYS.FRAME_PRICE_OVERRIDES, remoteMap);
    return remoteMap;
  } catch (err) {
    console.warn('[Supabase] Falha ao buscar preços personalizados:', err);
    return localOverrides;
  }
}

export function buildCatalogWithPrices(
  customFrames: EyewearFrame[],
  priceOverrides: Record<string, number>
): EyewearFrame[] {
  const normalizedCustom = customFrames.map((frame) => ({
    ...frame,
    price: normalizeFramePrice(
      typeof priceOverrides[frame.id] === 'number' ? priceOverrides[frame.id] : frame.price
    ),
  }));

  const normalizedStandard = premiumFrames.map((frame) => ({
    ...frame,
    price: normalizeFramePrice(
      typeof priceOverrides[frame.id] === 'number' ? priceOverrides[frame.id] : frame.price
    ),
  }));

  return [...normalizedCustom, ...normalizedStandard];
}

export async function fetchCatalogFrames(): Promise<{
  customFrames: EyewearFrame[];
  priceOverrides: Record<string, number>;
  allFrames: EyewearFrame[];
}> {
  const [customFrames, priceOverrides] = await Promise.all([
    fetchCustomFrames(),
    fetchFramePriceOverrides(),
  ]);

  return {
    customFrames,
    priceOverrides,
    allFrames: buildCatalogWithPrices(customFrames, priceOverrides),
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

export async function createCustomFrame(
  payload: CreateFramePayload,
  adminToken?: string | null
): Promise<EyewearFrame> {
  await assertVerifiedAdmin(adminToken);

  const numericPrice = Number(payload.price);
  if (!Number.isFinite(numericPrice) || numericPrice < MIN_FRAME_PRICE) {
    throw new Error(
      `O preço da armação deve ser a partir de R$ ${MIN_FRAME_PRICE.toFixed(2).replace('.', ',')}.`
    );
  }
  const safePrice = normalizeFramePrice(numericPrice);

  const referenceCode =
    payload.referenceCode?.trim() ||
    `REF-ADM-${Math.floor(100 + Math.random() * 900)}`;

  const localRecord: EyewearFrame = {
    id: generateUuid(),
    referenceCode,
    name: payload.name.trim(),
    brand: payload.brand.trim() || 'Ótica Rapido Exclusive',
    price: safePrice,
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
      } else if (error) {
        console.warn('[Supabase] Erro ao salvar armação no banco remoto:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Falha de conexão ao salvar armação:', err);
    }
  }

  const existing = readJsonStorage<EyewearFrame[]>(STORAGE_KEYS.CUSTOM_FRAMES, []);
  const updated = [savedFrame, ...existing.filter((f) => f.id !== savedFrame.id)];
  writeJsonStorage(STORAGE_KEYS.CUSTOM_FRAMES, updated);
  window.dispatchEvent(new CustomEvent(FRAMES_UPDATED_EVENT));

  return savedFrame;
}

export async function updateCatalogFramePrice(params: {
  frameId: string;
  price: number;
  isCustom?: boolean;
  adminToken?: string | null;
}): Promise<number> {
  const adminEmail = await assertVerifiedAdmin(params.adminToken);

  const numericPrice = Number(params.price);
  if (!Number.isFinite(numericPrice) || numericPrice < MIN_FRAME_PRICE) {
    throw new Error(
      `O preço da armação deve ser a partir de R$ ${MIN_FRAME_PRICE.toFixed(2).replace('.', ',')}.`
    );
  }
  const safePrice = normalizeFramePrice(numericPrice);

  if (params.isCustom) {
    if (supabase && isUuid(params.frameId)) {
      try {
        const { error } = await supabase
          .from('frames')
          .update({ price: safePrice })
          .eq('id', params.frameId);
        if (error) {
          console.warn('[Supabase] Erro ao atualizar preço da armação:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase] Falha ao atualizar preço da armação:', err);
      }
    }
    const existing = readJsonStorage<EyewearFrame[]>(STORAGE_KEYS.CUSTOM_FRAMES, []);
    const updated = existing.map((f) =>
      f.id === params.frameId ? { ...f, price: safePrice } : f
    );
    writeJsonStorage(STORAGE_KEYS.CUSTOM_FRAMES, updated);
  } else {
    if (supabase) {
      try {
        const { error } = await supabase.from('frame_price_overrides').upsert(
          {
            frame_id: params.frameId,
            price: safePrice,
            updated_by: adminEmail,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'frame_id' }
        );
        if (error) {
          console.warn('[Supabase] Erro ao salvar override de preço:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase] Falha ao salvar override de preço:', err);
      }
    }
    const existingOverrides = readJsonStorage<Record<string, number>>(
      STORAGE_KEYS.FRAME_PRICE_OVERRIDES,
      {}
    );
    writeJsonStorage(STORAGE_KEYS.FRAME_PRICE_OVERRIDES, {
      ...existingOverrides,
      [params.frameId]: safePrice,
    });
  }

  window.dispatchEvent(new CustomEvent(FRAMES_UPDATED_EVENT));
  return safePrice;
}

export async function resetCatalogFramePrice(
  frameId: string,
  adminToken?: string | null
): Promise<void> {
  await assertVerifiedAdmin(adminToken);

  if (supabase) {
    try {
      const { error } = await supabase.from('frame_price_overrides').delete().eq('frame_id', frameId);
      if (error) {
        console.warn('[Supabase] Erro ao restaurar preço padrão:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Falha ao restaurar preço padrão:', err);
    }
  }

  const existingOverrides = readJsonStorage<Record<string, number>>(
    STORAGE_KEYS.FRAME_PRICE_OVERRIDES,
    {}
  );
  if (frameId in existingOverrides) {
    const next = { ...existingOverrides };
    delete next[frameId];
    writeJsonStorage(STORAGE_KEYS.FRAME_PRICE_OVERRIDES, next);
  }

  window.dispatchEvent(new CustomEvent(FRAMES_UPDATED_EVENT));
}

export async function deleteCustomFrame(
  frameId: string,
  adminToken?: string | null
): Promise<void> {
  await assertVerifiedAdmin(adminToken);

  if (supabase) {
    try {
      const { error } = await supabase.from('frames').delete().eq('id', frameId);
      if (error) {
        console.warn('[Supabase] Erro ao excluir armação:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Falha ao excluir armação:', err);
    }
  }

  const existing = readJsonStorage<EyewearFrame[]>(STORAGE_KEYS.CUSTOM_FRAMES, []);
  const updated = existing.filter((f) => f.id !== frameId);
  writeJsonStorage(STORAGE_KEYS.CUSTOM_FRAMES, updated);
  window.dispatchEvent(new CustomEvent(FRAMES_UPDATED_EVENT));
}

export function subscribeToCatalogUpdates(
  onUpdate: (data: {
    customFrames: EyewearFrame[];
    priceOverrides: Record<string, number>;
    allFrames: EyewearFrame[];
  }) => void
): () => void {
  const handleChange = async () => {
    const result = await fetchCatalogFrames();
    onUpdate(result);
  };

  window.addEventListener(FRAMES_UPDATED_EVENT, handleChange);

  const handleStorageEvent = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEYS.CUSTOM_FRAMES ||
      e.key === STORAGE_KEYS.FRAME_PRICE_OVERRIDES
    ) {
      handleChange();
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (supabase) {
    channel = supabase
      .channel(`public:catalog-realtime-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'frames' },
        () => {
          handleChange();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'frame_price_overrides' },
        () => {
          handleChange();
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener(FRAMES_UPDATED_EVENT, handleChange);
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

export interface SavePrescriptionResult {
  id: string;
  persistedTo: 'supabase' | 'local';
  fileUploaded: boolean;
  warning?: string;
  record: SavedPrescriptionRecord;
}

function normalizeIsoDate(rawDate?: string): string {
  const cleaned = (rawDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const parsed = new Date(`${cleaned}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return cleaned;
    }
  }
  return new Date().toISOString().split('T')[0];
}

function normalizeOpticalNumber(rawValue?: string, fallback = '0.00'): string {
  const cleaned = (rawValue || '').trim().replace(',', '.');
  if (!cleaned) return fallback;
  return cleaned.slice(0, 6);
}

function normalizeOpticalAxis(rawAxis?: string): string {
  const digits = (rawAxis || '').replace(/\D/g, '').slice(0, 3);
  if (!digits) return '0';
  const num = parseInt(digits, 10);
  return String(Math.min(180, Math.max(0, num)));
}

function buildGuestIdentifier(patientName: string): string {
  const slug = patientName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `guest:${slug || 'paciente'}`;
}

export async function savePrescriptionRecord(params: {
  prescription: MedicalPrescription;
  file?: File | null;
  customer?: CustomerSession | null;
  lgpdConsent: boolean;
}): Promise<SavePrescriptionResult> {
  if (!params.lgpdConsent) {
    throw new Error('O consentimento LGPD para tratamento de dados de saúde visual é obrigatório.');
  }

  const trimmedPatient = params.prescription.patientName.trim();
  if (!trimmedPatient) {
    throw new Error('Informe o nome completo do paciente antes de salvar a receita.');
  }

  const normalizedDate = normalizeIsoDate(params.prescription.date);
  const normalizedOd = {
    spherical: normalizeOpticalNumber(params.prescription.od?.spherical, '0.00'),
    cylindrical: normalizeOpticalNumber(params.prescription.od?.cylindrical, '0.00'),
    axis: normalizeOpticalAxis(params.prescription.od?.axis),
    dnp: (params.prescription.od?.dnp || '').trim(),
    addition: (params.prescription.od?.addition || '').trim().replace(',', '.'),
  };
  const normalizedOe = {
    spherical: normalizeOpticalNumber(params.prescription.oe?.spherical, '0.00'),
    cylindrical: normalizeOpticalNumber(params.prescription.oe?.cylindrical, '0.00'),
    axis: normalizeOpticalAxis(params.prescription.oe?.axis),
    dnp: (params.prescription.oe?.dnp || '').trim(),
    addition: (params.prescription.oe?.addition || '').trim().replace(',', '.'),
  };

  // Never persist transient blob: object URLs into storage
  const persistedFileMeta = params.file
    ? {
        name: params.file.name,
        size: `${Math.max(0.1, params.file.size / 1024).toFixed(1)} KB`,
        type: params.file.type || params.prescription.fileAttached?.type || 'application/octet-stream',
      }
    : params.prescription.fileAttached
      ? {
          name: params.prescription.fileAttached.name,
          size: params.prescription.fileAttached.size,
          type: params.prescription.fileAttached.type,
        }
      : undefined;

  let uploadedFilePath: string | null = null;
  let fileUploaded = false;
  let warningMessage: string | undefined;

  if (supabase && params.file) {
    try {
      const ext = params.file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      const ownerPrefix = params.customer?.identifier
        ? params.customer.identifier.replace(/[^a-zA-Z0-9]/g, '_')
        : 'guest';
      const path = `prescriptions/${ownerPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('prescriptions-files')
        .upload(path, params.file, {
          contentType: params.file.type || 'application/octet-stream',
          upsert: false,
        });
      if (!uploadErr) {
        uploadedFilePath = path;
        fileUploaded = true;
      } else {
        warningMessage = 'Os dados ópticos foram salvos, mas o bucket de anexos não aceitou o arquivo no momento.';
      }
    } catch {
      warningMessage = 'Os dados ópticos foram salvos; o anexo permanece vinculado apenas nesta sessão.';
    }
  }

  const finalId = generateUuid();
  const effectiveIdentifier =
    params.customer?.identifier?.trim() || buildGuestIdentifier(trimmedPatient);

  let persistedTo: 'supabase' | 'local' = 'local';

  if (supabase) {
    try {
      const { error } = await supabase.from('prescriptions').insert({
        id: finalId,
        customer_id: isUuid(params.customer?.id) ? params.customer?.id : null,
        customer_identifier: effectiveIdentifier,
        patient_name: trimmedPatient,
        doctor_name: (params.prescription.doctorName || '').trim(),
        doctor_crm: (params.prescription.doctorCrm || '').trim(),
        exam_date: normalizedDate,
        od: normalizedOd,
        oe: normalizedOe,
        observation: (params.prescription.observation || '').trim(),
        file_name: persistedFileMeta?.name || null,
        file_size: persistedFileMeta?.size || null,
        file_type: persistedFileMeta?.type || null,
        file_url: uploadedFilePath,
        lgpd_consent: true,
      });

      if (!error) {
        persistedTo = 'supabase';
      } else {
        warningMessage =
          warningMessage ||
          'Salvo com segurança neste navegador (sincronização remota pendente com o Supabase).';
      }
    } catch {
      warningMessage =
        warningMessage ||
        'Salvo com segurança neste navegador (sem conexão com o Supabase no momento).';
    }
  }

  const savedRecord: SavedPrescriptionRecord = {
    id: finalId,
    customerId: params.customer?.id,
    patientName: trimmedPatient,
    doctorName: (params.prescription.doctorName || '').trim(),
    doctorCrm: (params.prescription.doctorCrm || '').trim(),
    date: normalizedDate,
    od: normalizedOd,
    oe: normalizedOe,
    observation: (params.prescription.observation || '').trim(),
    fileAttached: persistedFileMeta,
    createdAt: new Date().toISOString(),
  };

  const existing = readJsonStorage<SavedPrescriptionRecord[]>(STORAGE_KEYS.PRESCRIPTIONS, []);
  writeJsonStorage(STORAGE_KEYS.PRESCRIPTIONS, [
    savedRecord,
    ...existing.filter((p) => p.id !== finalId),
  ].slice(0, 40));
  window.dispatchEvent(new CustomEvent(PRESCRIPTIONS_UPDATED_EVENT));

  return {
    id: finalId,
    persistedTo,
    fileUploaded,
    warning: warningMessage,
    record: savedRecord,
  };
}

interface SupabasePrescriptionRow {
  id: string;
  customer_id?: string | null;
  customer_identifier?: string | null;
  patient_name?: string | null;
  doctor_name?: string | null;
  doctor_crm?: string | null;
  exam_date?: string | null;
  od?: MedicalPrescription['od'] | null;
  oe?: MedicalPrescription['oe'] | null;
  observation?: string | null;
  file_name?: string | null;
  file_size?: string | null;
  file_type?: string | null;
  created_at?: string | null;
}

export interface ScopedQueryOptions {
  isAdmin?: boolean;
  customerSession?: CustomerSession | null;
}

function mapRowToPrescription(row: SupabasePrescriptionRow): SavedPrescriptionRecord {
  return {
    id: row.id,
    customerId: row.customer_id || undefined,
    patientName: row.patient_name || '',
    doctorName: row.doctor_name || '',
    doctorCrm: row.doctor_crm || '',
    date: row.exam_date || new Date().toISOString().split('T')[0],
    od: row.od || { spherical: '0.00', cylindrical: '0.00', axis: '0', dnp: '', addition: '' },
    oe: row.oe || { spherical: '0.00', cylindrical: '0.00', axis: '0', dnp: '', addition: '' },
    observation: row.observation || '',
    fileAttached: row.file_name
      ? {
          name: row.file_name,
          size: row.file_size || '',
          type: row.file_type || '',
        }
      : undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function fetchPrescriptions(
  options?: ScopedQueryOptions
): Promise<SavedPrescriptionRecord[]> {
  const local = readJsonStorage<SavedPrescriptionRecord[]>(STORAGE_KEYS.PRESCRIPTIONS, []);
  const isAdmin = Boolean(options?.isAdmin);
  const customer = options?.customerSession ?? null;

  // LGPD: visitantes sem sessão de cliente e sem login ADM só visualizam receitas criadas neste navegador
  if (!supabase || (!isAdmin && !customer)) {
    return local;
  }

  try {
    let query = supabase
      .from('prescriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!isAdmin && customer) {
      if (isUuid(customer.id)) {
        query = query.eq('customer_id', customer.id);
      } else if (customer.identifier) {
        query = query.eq('customer_identifier', customer.identifier);
      } else {
        return local;
      }
    }

    const { data, error } = await query;

    if (error || !data) {
      if (error) {
        console.warn('[Supabase] Erro ao consultar receitas:', error.message);
      }
      return local;
    }

    const mapped = (data as SupabasePrescriptionRow[]).map(mapRowToPrescription);

    if (isAdmin) {
      const remoteIds = new Set(mapped.map((r) => r.id));
      return [...mapped, ...local.filter((l) => !remoteIds.has(l.id))].slice(0, 40);
    }

    // Mescla apenas registros remotos do próprio cliente com registros locais deste navegador
    const remoteIds = new Set(mapped.map((r) => r.id));
    const merged = [...mapped, ...local.filter((l) => !remoteIds.has(l.id))].slice(0, 40);
    writeJsonStorage(STORAGE_KEYS.PRESCRIPTIONS, merged);
    return merged;
  } catch (err) {
    console.warn('[Supabase] Falha ao carregar receitas:', err);
    return local;
  }
}

export function subscribeToPrescriptions(
  onUpdate: (records: SavedPrescriptionRecord[]) => void,
  options?: ScopedQueryOptions
): () => void {
  const handleChange = async () => {
    const records = await fetchPrescriptions(options);
    onUpdate(records);
  };
  window.addEventListener(PRESCRIPTIONS_UPDATED_EVENT, handleChange);
  return () => {
    window.removeEventListener(PRESCRIPTIONS_UPDATED_EVENT, handleChange);
  };
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
          customer_id: isUuid(appointment.customerId) ? appointment.customerId : null,
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

interface SupabaseAppointmentRow {
  id: string;
  protocol: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  zip_code?: string | null;
  street_address: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  visit_date: string;
  preferred_time: string;
  service_type: string;
  notes?: string | null;
  lgpd_consent?: boolean | null;
  status: HomeVisitAppointment['status'];
  created_at: string;
}

export async function listRecentAppointments(customerPhoneOrEmail?: string): Promise<HomeVisitAppointment[]> {
  const local = readJsonStorage<HomeVisitAppointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
  if (!supabase || !customerPhoneOrEmail) {
    return local;
  }

  try {
    const clean = customerPhoneOrEmail.trim();
    if (!clean) return local;

    // Usa .eq() separado (evita quebra do parser PostgREST com parênteses em telefones como "(11) 99999-9999")
    const filterColumn = clean.includes('@') ? 'customer_email' : 'customer_phone';
    const { data, error } = await supabase
      .from('home_visit_appointments')
      .select('*')
      .eq(filterColumn, clean)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data) {
      if (error) {
        console.warn('[Supabase] Erro ao buscar agendamentos:', error.message);
      }
      return local;
    }

    return (data as SupabaseAppointmentRow[]).map((row) => ({
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
  } catch (err) {
    console.warn('[Supabase] Falha ao consultar agendamentos:', err);
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
      const { error } = await supabase.from('lgpd_requests').insert({
        protocol: params.protocol,
        request_type: params.requestType,
        full_name: params.fullName,
        cpf: params.cpf,
        email: params.email,
        phone: params.phone || '',
        details: params.details || '',
        status: 'recebido',
      });
      if (error) {
        console.warn('[Supabase] Erro ao registrar solicitação LGPD:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Falha ao registrar solicitação LGPD:', err);
    }
  }

  const existing = readJsonStorage<Array<Record<string, unknown>>>(STORAGE_KEYS.LGPD_REQUESTS, []);
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
  include_frame?: boolean | null;
  prescription?: MedicalPrescription | null;
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
  const items = Array.isArray(row.items) ? row.items : [];
  const inferredIncludeFrame =
    typeof row.include_frame === 'boolean'
      ? row.include_frame
      : items.length > 0
        ? items.some((it) => it.frame?.id !== 'no-frame')
        : true;
  const inferredPrescription =
    row.prescription || items.find((it) => it.prescription)?.prescription || undefined;

  return {
    id: row.id,
    quoteNumber: row.quote_number,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || '',
    customerCpf: row.customer_cpf || '',
    includeFrame: inferredIncludeFrame,
    prescription: inferredPrescription,
    items,
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

interface SupabaseCustomerRow {
  id: string;
  identifier: string;
  identifier_type: 'email' | 'phone';
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  lgpd_consent?: boolean | null;
  lgpd_consent_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
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
      if (error) {
        console.warn('[Supabase] Erro ao listar clientes:', error.message);
      }
      return mergedLocal;
    }

    const mapped: CustomerSession[] = (data as SupabaseCustomerRow[]).map((row) => ({
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
  } catch (err) {
    console.warn('[Supabase] Falha ao consultar clientes:', err);
    return mergedLocal;
  }
}

export async function fetchQuotes(options?: ScopedQueryOptions): Promise<OpticalQuote[]> {
  const localQuotes = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);
  const isAdmin = Boolean(options?.isAdmin);
  const customer = options?.customerSession ?? null;

  // Privacidade: visitantes sem login ADM e sem identificação de cliente veem apenas orçamentos criados neste navegador
  if (!supabase || (!isAdmin && !customer)) {
    return localQuotes;
  }

  try {
    let query = supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin && customer) {
      if (isUuid(customer.id)) {
        query = query.eq('customer_id', customer.id);
      } else if (customer.email) {
        query = query.eq('customer_email', customer.email);
      } else if (customer.phone) {
        query = query.eq('customer_phone', customer.phone);
      } else {
        return localQuotes;
      }
    }

    const { data, error } = await query;

    if (error || !data) {
      if (error) {
        console.warn('[Supabase] Erro ao consultar orçamentos:', error.message);
      }
      return localQuotes;
    }

    const remoteMapped = (data as SupabaseQuoteRow[]).map(mapRowToQuote);
    const remoteKeys = new Set(remoteMapped.map((q) => q.quoteNumber));
    const localOnly = localQuotes.filter((q) => !remoteKeys.has(q.quoteNumber));
    const merged = [...remoteMapped, ...localOnly];
    if (!isAdmin) {
      writeJsonStorage(STORAGE_KEYS.QUOTES, merged);
    }
    return merged;
  } catch (err) {
    console.warn('[Supabase] Falha ao consultar orçamentos:', err);
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

  const includeFrame = payload.includeFrame !== false;
  const normalizedItems = payload.items.map((item, idx) => ({
    ...item,
    frame: includeFrame
      ? {
          ...item.frame,
          price: Math.max(0, Number(item.frame?.price) || 0),
        }
      : {
          ...item.frame,
          id: 'no-frame',
          name: 'Armação Própria do Cliente',
          brand: 'Somente Lentes',
          price: 0,
        },
    selectedColor: includeFrame ? item.selectedColor || 'Preto Clássico' : 'Armação Própria',
    lensPrice: Math.max(0, Number(item.lensPrice) || 0),
    prescription: idx === 0 ? payload.prescription || item.prescription : item.prescription,
  }));

  const totals = calculateQuoteTotals(normalizedItems, payload.discount, includeFrame);
  const existingLocal = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);
  const existingRecord = existingLocal.find(
    (q) => (payload.id && q.id === payload.id) || q.quoteNumber === quoteNumber
  );

  const localQuote: OpticalQuote = {
    ...payload,
    id: isUuid(payload.id) ? payload.id! : existingRecord?.id || generateUuid(),
    quoteNumber,
    customerId: isUuid(payload.customerId) ? payload.customerId : undefined,
    customerName: payload.customerName.trim() || 'Cliente sem nome',
    customerPhone: payload.customerPhone.trim() || '',
    customerEmail: payload.customerEmail?.trim() || '',
    customerCpf: payload.customerCpf?.trim() || '',
    includeFrame,
    prescription: payload.prescription || normalizedItems.find((i) => i.prescription)?.prescription,
    items: normalizedItems,
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    paymentMethod: payload.paymentMethod || 'Pix à vista',
    observations: payload.observations?.trim() || '',
    sellerName: payload.sellerName?.trim() || 'Administrador - Ótica Rapido',
    date: payload.date || new Date().toISOString().split('T')[0],
    validUntil:
      payload.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: payload.status || 'rascunho',
    createdBy: payload.createdBy || 'admin',
    createdAt: existingRecord?.createdAt || nowIso,
  };

  let savedQuote = localQuote;

  if (supabase) {
    const baseDbRow = {
      quote_number: localQuote.quoteNumber,
      customer_id: isUuid(localQuote.customerId) ? localQuote.customerId : null,
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

    const linkedPrescriptionId = (
      localQuote.prescription as Partial<SavedPrescriptionRecord> | undefined
    )?.id;

    const fullDbRow = {
      ...baseDbRow,
      include_frame: localQuote.includeFrame,
      prescription: localQuote.prescription || null,
      prescription_id: isUuid(linkedPrescriptionId) ? linkedPrescriptionId : null,
    };

    const writeRemote = async (rowPayload: Record<string, unknown>) => {
      if (isUuid(payload.id) && existingRecord && isUuid(existingRecord.id)) {
        return supabase!
          .from('quotes')
          .update(rowPayload)
          .eq('id', localQuote.id)
          .select()
          .single();
      }
      return supabase!
        .from('quotes')
        .upsert(rowPayload, { onConflict: 'quote_number' })
        .select()
        .single();
    };

    try {
      let response = await writeRemote(fullDbRow);
      // Graceful fallback if remote Supabase table hasn't added include_frame/prescription columns yet
      if (response.error && /column|schema cache|42703|PGRST204/i.test(response.error.message || '')) {
        response = await writeRemote(baseDbRow);
      }

      if (!response.error && response.data) {
        const mapped = mapRowToQuote(response.data as SupabaseQuoteRow);
        savedQuote = {
          ...mapped,
          includeFrame: localQuote.includeFrame,
          prescription: localQuote.prescription || mapped.prescription,
        };
      } else if (response.error) {
        console.warn('[Supabase] Erro ao sincronizar orçamento:', response.error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Falha de conexão ao salvar orçamento:', err);
    }
  }

  const updatedList = [
    savedQuote,
    ...existingLocal.filter(
      (q) => q.id !== savedQuote.id && q.quoteNumber !== savedQuote.quoteNumber
    ),
  ];
  writeJsonStorage(STORAGE_KEYS.QUOTES, updatedList);
  window.dispatchEvent(new CustomEvent(QUOTES_UPDATED_EVENT));

  return savedQuote;
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus,
  adminToken?: string | null
): Promise<void> {
  await assertVerifiedAdmin(adminToken);

  if (supabase && isUuid(quoteId)) {
    try {
      const { error } = await supabase.from('quotes').update({ status }).eq('id', quoteId);
      if (error) {
        console.warn('[Supabase] Erro ao atualizar status do orçamento:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Falha ao atualizar status do orçamento:', err);
    }
  }

  const existing = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);
  const updated = existing.map((q) => (q.id === quoteId ? { ...q, status } : q));
  writeJsonStorage(STORAGE_KEYS.QUOTES, updated);
  window.dispatchEvent(new CustomEvent(QUOTES_UPDATED_EVENT));
}

export async function deleteQuoteRecord(
  quoteId: string,
  adminToken?: string | null
): Promise<void> {
  await assertVerifiedAdmin(adminToken);

  if (supabase && isUuid(quoteId)) {
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', quoteId);
      if (error) {
        console.warn('[Supabase] Erro ao excluir orçamento:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Falha ao excluir orçamento:', err);
    }
  }

  const existing = readJsonStorage<OpticalQuote[]>(STORAGE_KEYS.QUOTES, []);
  const updated = existing.filter((q) => q.id !== quoteId);
  writeJsonStorage(STORAGE_KEYS.QUOTES, updated);
  window.dispatchEvent(new CustomEvent(QUOTES_UPDATED_EVENT));
}

export function subscribeToQuotes(
  onUpdate: (quotes: OpticalQuote[]) => void,
  options?: ScopedQueryOptions
): () => void {
  const handleChange = async () => {
    const quotes = await fetchQuotes(options);
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
  if (supabase && (options?.isAdmin || options?.customerSession)) {
    channel = supabase
      .channel(`public:quotes-realtime-${Math.random().toString(36).slice(2, 7)}`)
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

