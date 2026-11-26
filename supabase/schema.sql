-- ============================================================================
-- ÓTICA RAPIDO - SCHEMA SUPABASE ATUALIZADO & IDEMPOTENTE
-- Seguro para primeira instalação OU atualização de banco já existente.
-- Execute este script completo no SQL Editor do seu projeto Supabase.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE ARMAÇÕES PERSONALIZADAS (Catálogo & Painel /admin)
CREATE TABLE IF NOT EXISTS public.frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Ótica Rapido',
  price NUMERIC(10, 2) NOT NULL DEFAULT 120.00,
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

-- 1B. TABELA DE PREÇOS INDIVIDUAIS EDITADOS PELO ADM (Modelos do Catálogo Padrão)
CREATE TABLE IF NOT EXISTS public.frame_price_overrides (
  frame_id TEXT PRIMARY KEY,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 120),
  updated_by TEXT DEFAULT 'admin',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE CLIENTES (Login Rápido Sem Senha / Passwordless)
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

-- 3. TABELA DE RECEITAS MÉDICAS OFTALMOLÓGICAS (Dados Sensíveis - Art. 11 LGPD)
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_identifier TEXT,
  patient_name TEXT NOT NULL,
  doctor_name TEXT DEFAULT '',
  doctor_crm TEXT DEFAULT '',
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  od JSONB NOT NULL,
  oe JSONB NOT NULL,
  observation TEXT DEFAULT '',
  file_name TEXT,
  file_size TEXT,
  file_type TEXT,
  file_url TEXT,
  lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante compatibilidade caso a tabela prescriptions tenha sido criada em versão anterior
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS customer_identifier TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_size TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. TABELA DE AGENDAMENTOS DE VISITA A DOMICÍLIO (São Paulo)
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
  status TEXT NOT NULL DEFAULT 'agendado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA DE SOLICITAÇÕES LGPD (Art. 18 da Lei 13.709/2018)
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

-- 6. TABELA DE ORÇAMENTOS DE CLIENTES (Central de Orçamentos & Painel /admin)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  customer_cpf TEXT DEFAULT '',
  include_frame BOOLEAN NOT NULL DEFAULT TRUE,
  prescription JSONB,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Pix à vista',
  observations TEXT DEFAULT '',
  seller_name TEXT NOT NULL DEFAULT 'Administrador - Ótica Rapido',
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'cancelado')),
  created_by TEXT NOT NULL DEFAULT 'admin' CHECK (created_by IN ('admin', 'cliente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante colunas de Com/Sem Armação e Receita vinculada em bancos já existentes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS include_frame BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS prescription JSONB;

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON public.prescriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_identifier ON public.prescriptions (customer_identifier);

-- ============================================================================
-- HABILITAR REALTIME DE FORMA IDEMPOTENTE (SEM ERRO SE JÁ ESTIVER ATIVO)
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
-- SEGURANÇA & RLS (Row Level Security - Conformidade LGPD)
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

-- Preços individuais do catálogo padrão (somente leitura pública; mínimo R$ 120,00)
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

-- Clientes: inserção e atualização controlada para identificação sem senha
DROP POLICY IF EXISTS "Clientes insercao identificacao" ON public.customers;
CREATE POLICY "Clientes insercao identificacao" ON public.customers
  FOR INSERT WITH CHECK (lgpd_consent = true);

DROP POLICY IF EXISTS "Clientes leitura por identificador" ON public.customers;
CREATE POLICY "Clientes leitura por identificador" ON public.customers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Clientes atualizacao ultimo acesso" ON public.customers;
CREATE POLICY "Clientes atualizacao ultimo acesso" ON public.customers
  FOR UPDATE USING (true);

-- Receitas médicas (dados sensíveis de saúde - Art. 11 LGPD)
DROP POLICY IF EXISTS "Receitas insercao com consentimento LGPD" ON public.prescriptions;
CREATE POLICY "Receitas insercao com consentimento LGPD" ON public.prescriptions
  FOR INSERT WITH CHECK (lgpd_consent = true);

DROP POLICY IF EXISTS "Receitas leitura controlada" ON public.prescriptions;
CREATE POLICY "Receitas leitura controlada" ON public.prescriptions
  FOR SELECT USING (customer_identifier IS NOT NULL);

-- Agendamentos a domicílio
DROP POLICY IF EXISTS "Agendamentos insercao com consentimento" ON public.home_visit_appointments;
CREATE POLICY "Agendamentos insercao com consentimento" ON public.home_visit_appointments
  FOR INSERT WITH CHECK (lgpd_consent = true);

DROP POLICY IF EXISTS "Agendamentos leitura controlada" ON public.home_visit_appointments;
CREATE POLICY "Agendamentos leitura controlada" ON public.home_visit_appointments
  FOR SELECT USING (true);

-- Solicitações LGPD (Art. 18)
DROP POLICY IF EXISTS "LGPD insercao titular" ON public.lgpd_requests;
CREATE POLICY "LGPD insercao titular" ON public.lgpd_requests
  FOR INSERT WITH CHECK (true);

-- Orçamentos (Central de Orçamentos & Painel /admin)
DROP POLICY IF EXISTS "Orcamentos leitura admin" ON public.quotes;
CREATE POLICY "Orcamentos leitura admin" ON public.quotes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Orcamentos insercao admin" ON public.quotes;
CREATE POLICY "Orcamentos insercao admin" ON public.quotes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Orcamentos atualizacao admin" ON public.quotes;
CREATE POLICY "Orcamentos atualizacao admin" ON public.quotes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Orcamentos exclusao admin" ON public.quotes;
CREATE POLICY "Orcamentos exclusao admin" ON public.quotes
  FOR DELETE USING (true);

-- ============================================================================
-- STORAGE BUCKETS (Imagens de Armações e Anexos de Receitas Médicas)
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
-- VALIDAÇÃO RÁPIDA (retorna as 7 tabelas e 2 buckets configurados)
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'frames',
    'frame_price_overrides',
    'customers',
    'prescriptions',
    'home_visit_appointments',
    'lgpd_requests',
    'quotes'
  )
ORDER BY table_name;
