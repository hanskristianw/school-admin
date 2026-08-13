-- Migration: Re-create and Import `pyp_kc_list` (Key Concepts) for Supabase (PostgreSQL)
-- Date: 2026-08-13

-- 1. Drop existing table to ensure clean schema match
DROP TABLE IF EXISTS public.pyp_kc_list CASCADE;

-- 2. Create fresh table with exact PostgreSQL column types
CREATE TABLE public.pyp_kc_list (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  definition TEXT NOT NULL,
  icon VARCHAR(255) DEFAULT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" INTEGER NOT NULL DEFAULT 2,
  "updatedAt" TIMESTAMPTZ DEFAULT NULL,
  "updatedBy" INTEGER DEFAULT NULL,
  "deletedAt" TIMESTAMPTZ DEFAULT NULL,
  "deletedBy" INTEGER DEFAULT NULL
);

-- Enable RLS & Permissive Access Policies for Supabase
ALTER TABLE public.pyp_kc_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select pyp_kc_list" ON public.pyp_kc_list FOR SELECT USING (true);
CREATE POLICY "Allow all insert pyp_kc_list" ON public.pyp_kc_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update pyp_kc_list" ON public.pyp_kc_list FOR UPDATE USING (true);
CREATE POLICY "Allow all delete pyp_kc_list" ON public.pyp_kc_list FOR DELETE USING (true);

-- 3. Insert Data Dump (7 Standard IB PYP Key Concepts + Test Item)
INSERT INTO public.pyp_kc_list (id, key, question, definition, icon, is_deleted, "createdAt", "createdBy", "updatedAt", "updatedBy", "deletedAt", "deletedBy") VALUES
(1, 'Form', 'What is it like?', 'The understanding that everything has a form with recognizable features that can be observed, identified, described and categorized.', 'form', 0, '2025-06-10 04:45:29', 2, '2025-07-10 01:46:05', NULL, NULL, NULL),
(2, 'Connection', 'How is it linked to other things?', 'The understanding that we live in a world of interacting systems in which the actions of any individual element affect others.', 'connection', 0, '2025-06-10 04:45:29', 2, '2025-07-10 01:46:05', NULL, NULL, NULL),
(3, 'Perspective', 'What are the points of view?', 'The understanding that knowledge is moderated by different points of view which lead to different interpretations, understandings and findings; perspectives may be individual, group, cultural or subject-specific.', 'perspective', 0, '2025-06-10 04:45:29', 2, '2025-07-10 01:46:05', NULL, NULL, NULL),
(4, 'Function', 'How does it work?', 'The understanding that everything has a purpose, a role or a way of behaving that can be investigated.', 'function', 0, '2025-06-10 04:45:29', 2, '2025-07-10 01:46:05', NULL, NULL, NULL),
(5, 'Causation', 'Why is it as it is?', 'The understanding that things do not just happen there are causal relationships at work, and that actions have consequences.', 'causation', 0, '2025-11-21 09:02:15', 2, '2025-07-10 01:46:05', 2, NULL, NULL),
(6, 'Change', 'How is it transforming?', 'The understanding that change is the process of movement from one state to another. It is universal and inevitable.', 'change', 0, '2025-11-21 09:01:39', 2, '2025-07-10 01:46:05', 2, NULL, NULL),
(7, 'Responsibility', 'What are our obligations?', 'The understanding that people make choices based on their understandings, beliefs and values, and the actions they take as a result do make a difference.', 'responsibility', 0, '2025-06-10 04:45:29', 2, '2025-07-10 01:46:05', NULL, NULL, NULL),
(8, 'aku test key', 'bagaimana denganmu', 'oke lah kalau begitu', NULL, 1, '2025-07-10 02:18:44', 2025, '2025-07-10 09:18:44', 2, '2025-07-10 09:18:44', 2)
ON CONFLICT (id) DO UPDATE SET
  key = EXCLUDED.key,
  question = EXCLUDED.question,
  definition = EXCLUDED.definition,
  icon = EXCLUDED.icon,
  is_deleted = EXCLUDED.is_deleted,
  "createdAt" = EXCLUDED."createdAt",
  "createdBy" = EXCLUDED."createdBy",
  "updatedAt" = EXCLUDED."updatedAt",
  "updatedBy" = EXCLUDED."updatedBy",
  "deletedAt" = EXCLUDED."deletedAt",
  "deletedBy" = EXCLUDED."deletedBy";

-- 4. Sync auto-increment sequence ID
SELECT setval(pg_get_serial_sequence('public.pyp_kc_list', 'id'), COALESCE(MAX(id), 1)) FROM public.pyp_kc_list;
