-- Migration: Create PYP Master Data Tables (Central Idea, Lines of Inquiry, ATL, Key Concepts)
-- Date: 2026-08-13

-- 1. pyp_ci_list (Master Central Idea)
CREATE TABLE IF NOT EXISTS public.pyp_ci_list (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_deleted SMALLINT DEFAULT 0,
    created_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. pyp_loi_list (Master Lines of Inquiry)
CREATE TABLE IF NOT EXISTS public.pyp_loi_list (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_deleted SMALLINT DEFAULT 0,
    created_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. pyp_atls_list (Master Approaches to Learning)
CREATE TABLE IF NOT EXISTS public.pyp_atls_list (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_deleted SMALLINT DEFAULT 0,
    created_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. pyp_kc_list (Master Key Concepts)
CREATE TABLE IF NOT EXISTS public.pyp_kc_list (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    question TEXT,
    definition TEXT,
    is_deleted SMALLINT DEFAULT 0,
    created_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Permissive Policies for Authenticated / Anon access
ALTER TABLE public.pyp_ci_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyp_loi_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyp_atls_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyp_kc_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select pyp_ci_list" ON public.pyp_ci_list FOR SELECT USING (true);
CREATE POLICY "Allow all insert pyp_ci_list" ON public.pyp_ci_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update pyp_ci_list" ON public.pyp_ci_list FOR UPDATE USING (true);
CREATE POLICY "Allow all delete pyp_ci_list" ON public.pyp_ci_list FOR DELETE USING (true);

CREATE POLICY "Allow all select pyp_loi_list" ON public.pyp_loi_list FOR SELECT USING (true);
CREATE POLICY "Allow all insert pyp_loi_list" ON public.pyp_loi_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update pyp_loi_list" ON public.pyp_loi_list FOR UPDATE USING (true);
CREATE POLICY "Allow all delete pyp_loi_list" ON public.pyp_loi_list FOR DELETE USING (true);

CREATE POLICY "Allow all select pyp_atls_list" ON public.pyp_atls_list FOR SELECT USING (true);
CREATE POLICY "Allow all insert pyp_atls_list" ON public.pyp_atls_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update pyp_atls_list" ON public.pyp_atls_list FOR UPDATE USING (true);
CREATE POLICY "Allow all delete pyp_atls_list" ON public.pyp_atls_list FOR DELETE USING (true);

CREATE POLICY "Allow all select pyp_kc_list" ON public.pyp_kc_list FOR SELECT USING (true);
CREATE POLICY "Allow all insert pyp_kc_list" ON public.pyp_kc_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update pyp_kc_list" ON public.pyp_kc_list FOR UPDATE USING (true);
CREATE POLICY "Allow all delete pyp_kc_list" ON public.pyp_kc_list FOR DELETE USING (true);
