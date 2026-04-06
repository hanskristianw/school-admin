-- Migration: uniform_unit junction table
-- Menggantikan relasi one-to-one (uniform.unit_id) dengan many-to-many
-- Satuan seragam kini bisa berlaku di lebih dari 1 unit

-- 1. Buat junction table
CREATE TABLE IF NOT EXISTS public.uniform_unit (
  uniform_id bigint  NOT NULL REFERENCES public.uniform(uniform_id) ON DELETE CASCADE,
  unit_id    integer NOT NULL REFERENCES public.unit(unit_id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uniform_unit_pkey PRIMARY KEY (uniform_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_uniform_unit_unit ON public.uniform_unit(unit_id);

-- 2. Migrasikan data lama: salin unit_id yang ada ke junction table
INSERT INTO public.uniform_unit (uniform_id, unit_id)
SELECT uniform_id, unit_id
FROM public.uniform
WHERE unit_id IS NOT NULL AND is_universal = false
ON CONFLICT DO NOTHING;

-- 3. Set semua unit_id di tabel uniform menjadi NULL (junction table jadi sumber kebenaran)
--    Kolom unit_id TIDAK dihapus agar backward-compatible, bisa di-drop nanti
UPDATE public.uniform SET unit_id = NULL WHERE is_universal = false;
