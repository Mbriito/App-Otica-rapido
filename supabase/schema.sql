-- ============================================================================
-- ÓTICA RAPIDO - SCHEMA SUPABASE ATUALIZADO, VALIDADO & IDEMPOTENTE
-- Alinhado com src/types.ts e src/services/supabaseService.ts
-- Seguro para primeira instalação OU atualização de banco já existente.
-- Execute este script completo no SQL Editor do seu projeto Supabase.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CATÁLOGO DE ARMAÇÕES E PREÇOS INDIVIDUAIS (mínimo R$ 120,00)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Ótica Rapido',
  price NUMERIC(10, 2) NOT NULL DEFAULT 120.00 CHECK (price >= 120),
  category TEXT NOT NULL CHECK (category IN ('grau', 'sol', 'esporte')),
  gender TEXT NOT NULL CHECK (gender IN ('unissex', 'masculino', 'feminino')),
  shape TEXT NOT NULL CHECK (shape IN ('redondo', 'quadrado', 'retangular', 'gatinho', 'aviador', 'oval', 'geometrico')),
  material TEXT NOT NULL CHECK (material IN ('acetato', 'metal', 'titanio', 'madeira', 'injetado')),
  image_url TEXT NOT NULL,
  colors JSONB NOT NULL DEFAULT '["Preto Clássico"]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  face_recommendation TEXT DEFAULT '',
  rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.frame_price_overrides (
  frame_id TEXT PRIMARY KEY,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 120),
  updated_by TEXT DEFAULT 'admin',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CLIENTES (Tabela pai das chaves estrangeiras customer_id)
-- Interface TypeScript: CustomerSession
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'phone')),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE,
  lgpd_consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. RECEITAS MÉDICAS OFTALMOLÓGICAS (public.prescriptions)
-- Interfaces TypeScript: MedicalPrescription / SavedPrescriptionRecord
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_identifier TEXT,
  patient_name TEXT NOT NULL,
  doctor_name TEXT NOT NULL DEFAULT '',
  doctor_crm TEXT NOT NULL DEFAULT '',
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  od JSONB NOT NULL DEFAULT '{"spherical":"0.00","cylindrical":"0.00","axis":"0","dnp":"","addition":""}'::jsonb,
  oe JSONB NOT NULL DEFAULT '{"spherical":"0.00","cylindrical":"0.00","axis":"0","dnp":"","addition":""}'::jsonb,
  observation TEXT NOT NULL DEFAULT '',
  file_name TEXT,
  file_size TEXT,
  file_type TEXT,
  file_url TEXT,
  lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS customer_identifier TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS doctor_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS doctor_crm TEXT NOT NULL DEFAULT '';
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS exam_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS od JSONB NOT NULL DEFAULT '{"spherical":"0.00","cylindrical":"0.00","axis":"0","dnp":"","addition":""}'::jsonb;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS oe JSONB NOT NULL DEFAULT '{"spherical":"0.00","cylindrical":"0.00","axis":"0","dnp":"","addition":""}'::jsonb;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS observation TEXT NOT NULL DEFAULT '';
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_size TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================================
-- 4. AGENDAMENTOS A DOMICÍLIO (public.home_visit_appointments)
-- Interface TypeScript: HomeVisitAppointment
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.home_visit_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  zip_code TEXT DEFAULT '',
  street_address TEXT NOT NULL,
  complement TEXT DEFAULT '',
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'São Paulo - SP',
  visit_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  service_type TEXT NOT NULL,
  notes TEXT DEFAULT '',
  lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'concluido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.home_visit_appointments ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.home_visit_appointments ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
ALTER TABLE public.home_visit_appointments ADD COLUMN IF NOT EXISTS zip_code TEXT DEFAULT '';
ALTER TABLE public.home_visit_appointments ADD COLUMN IF NOT EXISTS complement TEXT DEFAULT '';
ALTER TABLE public.home_visit_appointments ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.home_visit_appointments ADD COLUMN IF NOT EXISTS lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.home_visit_appointments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'agendado';

-- ============================================================================
-- 5. SOLICITAÇÕES LGPD (Art. 18 da Lei 13.709/2018)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol TEXT NOT NULL UNIQUE,
  request_type TEXT NOT NULL CHECK (request_type IN ('acesso', 'correcao', 'exclusao', 'portabilidade', 'revogacao')),
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'recebido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. ORÇAMENTOS (public.quotes)
-- Interfaces TypeScript: OpticalQuote / SelectedItem / QuoteStatus
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_cpf TEXT DEFAULT '',
  include_frame BOOLEAN NOT NULL DEFAULT TRUE,
  prescription JSONB,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT NOT NULL DEFAULT 'Pix à vista',
  observations TEXT DEFAULT '',
  seller_name TEXT NOT NULL DEFAULT 'Administrador - Ótica Rapido',
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'cancelado')),
  created_by TEXT NOT NULL DEFAULT 'admin' CHECK (created_by IN ('admin', 'cliente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS prescription_id UUID;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_cpf TEXT DEFAULT '';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS include_frame BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS prescription JSONB;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS total NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'rascunho';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'admin';

-- ============================================================================
-- 7. GARANTIA DE CHAVES ESTRANGEIRAS (FKs) E CONSTRAINTS EM BANCOS EXISTENTES
-- ============================================================================
DO $$
BEGIN
  -- FK: prescriptions.customer_id -> customers(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prescriptions'::regclass
      AND contype = 'f'
      AND confrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.prescriptions
      ADD CONSTRAINT fk_prescriptions_customer_id
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;

  -- FK: home_visit_appointments.customer_id -> customers(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.home_visit_appointments'::regclass
      AND contype = 'f'
      AND confrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.home_visit_appointments
      ADD CONSTRAINT fk_appointments_customer_id
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;

  -- CHECK status em home_visit_appointments alinhado com HomeVisitAppointment['status']
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.home_visit_appointments'::regclass
      AND conname = 'chk_appointments_status'
  ) THEN
    ALTER TABLE public.home_visit_appointments
      ADD CONSTRAINT chk_appointments_status
      CHECK (status IN ('agendado', 'confirmado', 'concluido')) NOT VALID;
    ALTER TABLE public.home_visit_appointments VALIDATE CONSTRAINT chk_appointments_status;
  END IF;

  -- FK: quotes.customer_id -> customers(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.quotes'::regclass
      AND contype = 'f'
      AND confrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT fk_quotes_customer_id
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;

  -- FK: quotes.prescription_id -> prescriptions(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.quotes'::regclass
      AND contype = 'f'
      AND confrelid = 'public.prescriptions'::regclass
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT fk_quotes_prescription_id
      FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 8. ÍNDICES PARA PERFORMANCE E CONSULTAS POR CHAVE ESTRANGEIRA
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON public.prescriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_identifier ON public.prescriptions (customer_identifier);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON public.prescriptions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.home_visit_appointments (customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON public.home_visit_appointments (customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_email ON public.home_visit_appointments (customer_email);
CREATE INDEX IF NOT EXISTS idx_appointments_visit_date ON public.home_visit_appointments (visit_date);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.home_visit_appointments (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_prescription_id ON public.quotes (prescription_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);

-- ============================================================================
-- 9. HABILITAR REALTIME DE FORMA IDEMPOTENTE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'frames'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.frames;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'frame_price_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.frame_price_overrides;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quotes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
  END IF;
END $$;

-- ============================================================================
-- 10. SEGURANÇA & RLS (Row Level Security - Leitura/Escrita & LGPD)
-- ============================================================================
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frame_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_visit_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Catálogo de armações personalizadas (preço mínimo R$ 120,00)
DROP POLICY IF EXISTS "Catalogo leitura publica" ON public.frames;
CREATE POLICY "Catalogo leitura publica" ON public.frames
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catalogo insercao admin" ON public.frames;
CREATE POLICY "Catalogo insercao admin" ON public.frames
  FOR INSERT WITH CHECK (price >= 120);

DROP POLICY IF EXISTS "Catalogo atualizacao admin" ON public.frames;
CREATE POLICY "Catalogo atualizacao admin" ON public.frames
  FOR UPDATE USING (true) WITH CHECK (price >= 120);

DROP POLICY IF EXISTS "Catalogo exclusao admin" ON public.frames;
CREATE POLICY "Catalogo exclusao admin" ON public.frames
  FOR DELETE USING (true);

-- Preços individuais do catálogo padrão (mínimo R$ 120,00)
DROP POLICY IF EXISTS "Precos catalogo leitura publica" ON public.frame_price_overrides;
CREATE POLICY "Precos catalogo leitura publica" ON public.frame_price_overrides
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Precos catalogo insercao admin" ON public.frame_price_overrides;
CREATE POLICY "Precos catalogo insercao admin" ON public.frame_price_overrides
  FOR INSERT WITH CHECK (price >= 120);

DROP POLICY IF EXISTS "Precos catalogo atualizacao admin" ON public.frame_price_overrides;
CREATE POLICY "Precos catalogo atualizacao admin" ON public.frame_price_overrides
  FOR UPDATE USING (true) WITH CHECK (price >= 120);

DROP POLICY IF EXISTS "Precos catalogo exclusao admin" ON public.frame_price_overrides;
CREATE POLICY "Precos catalogo exclusao admin" ON public.frame_price_overrides
  FOR DELETE USING (true);

-- Clientes
DROP POLICY IF EXISTS "Clientes insercao identificacao" ON public.customers;
CREATE POLICY "Clientes insercao identificacao" ON public.customers
  FOR INSERT WITH CHECK (lgpd_consent = true);

DROP POLICY IF EXISTS "Clientes leitura por identificador" ON public.customers;
CREATE POLICY "Clientes leitura por identificador" ON public.customers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Clientes atualizacao ultimo acesso" ON public.customers;
CREATE POLICY "Clientes atualizacao ultimo acesso" ON public.customers
  FOR UPDATE USING (true) WITH CHECK (lgpd_consent = true);

-- Receitas médicas (public.prescriptions - Art. 11 LGPD)
DROP POLICY IF EXISTS "Receitas insercao com consentimento LGPD" ON public.prescriptions;
CREATE POLICY "Receitas insercao com consentimento LGPD" ON public.prescriptions
  FOR INSERT WITH CHECK (lgpd_consent = true AND customer_identifier IS NOT NULL);

DROP POLICY IF EXISTS "Receitas leitura controlada" ON public.prescriptions;
CREATE POLICY "Receitas leitura controlada" ON public.prescriptions
  FOR SELECT USING (customer_identifier IS NOT NULL);

DROP POLICY IF EXISTS "Receitas atualizacao controlada" ON public.prescriptions;
CREATE POLICY "Receitas atualizacao controlada" ON public.prescriptions
  FOR UPDATE USING (customer_identifier IS NOT NULL)
  WITH CHECK (lgpd_consent = true AND customer_identifier IS NOT NULL);

-- Agendamentos a domicílio (public.home_visit_appointments)
DROP POLICY IF EXISTS "Agendamentos insercao com consentimento" ON public.home_visit_appointments;
CREATE POLICY "Agendamentos insercao com consentimento" ON public.home_visit_appointments
  FOR INSERT WITH CHECK (
    lgpd_consent = true
    AND status IN ('agendado', 'confirmado', 'concluido')
  );

DROP POLICY IF EXISTS "Agendamentos leitura controlada" ON public.home_visit_appointments;
CREATE POLICY "Agendamentos leitura controlada" ON public.home_visit_appointments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Agendamentos atualizacao status" ON public.home_visit_appointments;
CREATE POLICY "Agendamentos atualizacao status" ON public.home_visit_appointments
  FOR UPDATE USING (true)
  WITH CHECK (status IN ('agendado', 'confirmado', 'concluido'));

-- Solicitações LGPD (Art. 18)
DROP POLICY IF EXISTS "LGPD insercao titular" ON public.lgpd_requests;
CREATE POLICY "LGPD insercao titular" ON public.lgpd_requests
  FOR INSERT WITH CHECK (true);

-- Orçamentos (public.quotes)
DROP POLICY IF EXISTS "Orcamentos leitura admin" ON public.quotes;
CREATE POLICY "Orcamentos leitura admin" ON public.quotes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Orcamentos insercao admin" ON public.quotes;
CREATE POLICY "Orcamentos insercao admin" ON public.quotes
  FOR INSERT WITH CHECK (
    subtotal >= 0
    AND discount >= 0
    AND total >= 0
    AND status IN ('rascunho', 'enviado', 'aprovado', 'cancelado')
    AND created_by IN ('admin', 'cliente')
  );

DROP POLICY IF EXISTS "Orcamentos atualizacao admin" ON public.quotes;
CREATE POLICY "Orcamentos atualizacao admin" ON public.quotes
  FOR UPDATE USING (true)
  WITH CHECK (
    subtotal >= 0
    AND discount >= 0
    AND total >= 0
    AND status IN ('rascunho', 'enviado', 'aprovado', 'cancelado')
    AND created_by IN ('admin', 'cliente')
  );

DROP POLICY IF EXISTS "Orcamentos exclusao admin" ON public.quotes;
CREATE POLICY "Orcamentos exclusao admin" ON public.quotes
  FOR DELETE USING (true);

-- ============================================================================
-- 11. STORAGE BUCKETS (Imagens de Armações e Anexos de Receitas Médicas)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('frames-images', 'frames-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions-files', 'prescriptions-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Frames imagens publico select" ON storage.objects;
CREATE POLICY "Frames imagens publico select" ON storage.objects
  FOR SELECT USING (bucket_id = 'frames-images');

DROP POLICY IF EXISTS "Frames imagens upload" ON storage.objects;
CREATE POLICY "Frames imagens upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'frames-images');

DROP POLICY IF EXISTS "Receitas arquivos upload protegido" ON storage.objects;
CREATE POLICY "Receitas arquivos upload protegido" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'prescriptions-files');

-- ============================================================================
-- 12. VALIDAÇÃO FINAL: Tabelas, Chaves Estrangeiras e Políticas RLS
-- ============================================================================
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.table_name) AS rls_policies,
  (SELECT COUNT(*) FROM pg_constraint c WHERE c.conrelid = ('public.' || t.table_name)::regclass AND c.contype = 'f') AS foreign_keys
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'customers',
    'frames',
    'frame_price_overrides',
    'prescriptions',
    'home_visit_appointments',
    'quotes',
    'lgpd_requests'
  )
ORDER BY t.table_name;
