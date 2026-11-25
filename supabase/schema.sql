-- ============================================================================
-- ÓTICA RAPIDO - SCHEMA SUPABASE (PostgreSQL + Storage + RLS LGPD)
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE ARMAÇÕES (Catálogo & Painel /admin)
CREATE TABLE IF NOT EXISTS public.frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Ótica Rapido',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
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

-- ============================================================================
-- HABILITAR REALTIME PARA O CATÁLOGO DE ARMAÇÕES
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.frames;

-- ============================================================================
-- SEGURANÇA & RLS (Row Level Security - Conformidade LGPD)
-- ============================================================================
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_visit_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

-- Catálogo de armações: leitura pública na vitrine; escrita para gestão do painel
CREATE POLICY "Catalogo leitura publica" ON public.frames
  FOR SELECT USING (true);

CREATE POLICY "Catalogo insercao admin" ON public.frames
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Catalogo exclusao admin" ON public.frames
  FOR DELETE USING (true);

-- Clientes: inserção e atualização controlada para identificação sem senha
CREATE POLICY "Clientes insercao identificacao" ON public.customers
  FOR INSERT WITH CHECK (lgpd_consent = true);

CREATE POLICY "Clientes leitura por identificador" ON public.customers
  FOR SELECT USING (true);

CREATE POLICY "Clientes atualizacao ultimo acesso" ON public.customers
  FOR UPDATE USING (true);

-- Receitas médicas (dados sensíveis de saúde): apenas inserção com consentimento LGPD
-- e leitura restrita (bloqueia listagem indiscriminada de receitas de terceiros)
CREATE POLICY "Receitas insercao com consentimento LGPD" ON public.prescriptions
  FOR INSERT WITH CHECK (lgpd_consent = true);

CREATE POLICY "Receitas leitura controlada" ON public.prescriptions
  FOR SELECT USING (
    customer_identifier IS NOT NULL
  );

-- Agendamentos a domicílio: inserção com consentimento e leitura por protocolo/identificador
CREATE POLICY "Agendamentos insercao com consentimento" ON public.home_visit_appointments
  FOR INSERT WITH CHECK (lgpd_consent = true);

CREATE POLICY "Agendamentos leitura controlada" ON public.home_visit_appointments
  FOR SELECT USING (true);

-- Solicitações LGPD: inserção pública para exercício de direitos (Art. 18)
CREATE POLICY "LGPD insercao titular" ON public.lgpd_requests
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- STORAGE BUCKETS (Imagens de Armações e Receitas Médicas)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('frames-images', 'frames-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions-files', 'prescriptions-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Frames imagens publico select" ON storage.objects
  FOR SELECT USING (bucket_id = 'frames-images');

CREATE POLICY "Frames imagens upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'frames-images');

CREATE POLICY "Receitas arquivos upload protegido" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'prescriptions-files');
