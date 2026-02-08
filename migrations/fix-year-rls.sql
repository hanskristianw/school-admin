-- Fix RLS on year table: allow all operations (dev mode)
ALTER TABLE public.year ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_all_year" ON public.year;
CREATE POLICY "dev_all_year" ON public.year
  FOR ALL USING (true) WITH CHECK (true);
