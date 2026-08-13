-- Migration: Re-create and Import `pyp_ci_list` for Supabase (PostgreSQL)
-- Date: 2026-08-13

-- 1. Drop existing table to ensure column structure matches dump exactly
DROP TABLE IF EXISTS public.pyp_ci_list CASCADE;

-- 2. Create fresh table with exact matching camelCase columns
CREATE TABLE public.pyp_ci_list (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" INTEGER NOT NULL DEFAULT 2,
  "updatedAt" TIMESTAMPTZ DEFAULT NULL,
  "updatedBy" INTEGER DEFAULT NULL,
  "deletedAt" TIMESTAMPTZ DEFAULT NULL,
  "deletedBy" INTEGER DEFAULT NULL
);

-- Enable RLS & Permissive Access Policies for Supabase
ALTER TABLE public.pyp_ci_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select pyp_ci_list" ON public.pyp_ci_list FOR SELECT USING (true);
CREATE POLICY "Allow all insert pyp_ci_list" ON public.pyp_ci_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update pyp_ci_list" ON public.pyp_ci_list FOR UPDATE USING (true);
CREATE POLICY "Allow all delete pyp_ci_list" ON public.pyp_ci_list FOR DELETE USING (true);

-- 3. Insert Data Dump into `pyp_ci_list`
INSERT INTO public.pyp_ci_list (id, name, is_deleted, "createdAt", "createdBy", "updatedAt", "updatedBy", "deletedAt", "deletedBy") VALUES
(1, 'We learn about ourselves and new skills as we play.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:36:59', NULL, NULL, NULL),
(2, 'A caring and secure environment helps us understand who we are in a community.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:36:59', NULL, NULL, NULL),
(3, 'Discovering and embracing what makes us who we are promotes self-identity and well-being.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:36:59', NULL, NULL, NULL),
(4, 'Making healthy choices and caring for our bodies supports our growth and development.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(5, 'Our relationships and interactions with others help us learn about ourselves and the world we live in.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(6, 'Our actions as members of the community shape its development.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(7, 'Maintaining balance in lives contributes to health and well-being.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(8, 'We learn about people, homes, and our surroundings to understand our world.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:59:02', 2),
(9, 'Personal histories provide insights into our present and future.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(10, 'People adapt to their physical environments in different ways for survival.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(11, 'Community has changed over time, shaped by advancements in science and technology.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(12, 'Through play, we communicate and explore our creativity.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(13, 'Exploring how things work around us enhances our ability to express ourselves.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(14, 'We use signs and symbols to construct meaning.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(15, 'People tell stories in various ways to share different messages and perspectives.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(16, 'People use various forms of expression to convey their ideas and emotions.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(17, 'We explore and express the wonders of nature to foster environmental awareness.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:57:33', 2),
(18, 'Visual texts enhance our ability to express ideas and build connections across cultures.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:56:57', 2),
(19, 'Order and routines in our everyday activities help us manage our daily lives.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:50:45', 2),
(20, 'Families are made up of different roles and responsibilities to support one another.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(21, 'Working together as a team in our classroom community helps us learn and grow.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:42:59', 2),
(22, 'All living things have essential requirements to survive and grow.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(23, 'Different systems work together to shape the events and processes around us.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(24, 'Communities collaborate to address challenges and resolve conflicts.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(25, 'Understanding weather patterns enables us to prepare for and respond to natural events.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:56:02', 2),
(26, 'Exploring materials and their characteristics enables us to understand how things work around us.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:46:04', 2),
(27, 'Pushing and pulling an object can change the speed and direction of its motion.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:53:51', 2),
(28, 'Living things have adapted to the Earth''s natural cycles for survival.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:47:51', 2),
(29, 'People in our neighborhood do different jobs to help our community function well.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(30, 'Light and sound enable us to perceive and interact with our surroundings.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(31, 'People modify the characteristics of materials to suit different purposes.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:52:38', 2),
(32, 'Our actions as servant leaders impact the school community.', 0, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, NULL, NULL),
(33, 'The physical environment shapes how people live and interact in different regions.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:55:06', 2),
(34, 'Natural resources influence how people use land.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:49:39', 2),
(35, 'Our consumption choices impact the planet and its resources.', 1, '2025-06-30 02:37:10', 2, '2024-12-08 23:54:09', NULL, '2025-10-17 08:51:31', 2),
(36, 'a new dummy central idea', 1, '2025-06-30 02:37:10', 2, '2025-07-07 08:30:13', 2, '2025-11-20 14:03:53', 213),
(37, 'How do we express ourselves', 0, '2025-06-30 02:37:10', 2, '2025-03-25 07:17:09', NULL, NULL, NULL),
(38, 'Light and sound enable us to sense and engage with our surroundings.', 0, '2025-06-30 02:37:10', 2, '2025-05-22 09:08:52', NULL, NULL, NULL),
(39, 'We explore and express the wonders of nature to promote environmental awareness.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 01:28:24', NULL, NULL, NULL),
(40, 'Understanding weather patterns enables us to prepare and respond to natural events.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 02:14:23', NULL, NULL, NULL),
(41, 'Different systems work together to shape how things happen around us', 0, '2025-06-30 02:37:10', 2, '2025-05-23 02:35:17', NULL, NULL, NULL),
(42, 'People modify the characteristics of materials to serve different purposes.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 03:09:56', NULL, NULL, NULL),
(43, 'Our consumption choices impact the planet and its resources.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 03:27:07', NULL, NULL, NULL),
(44, 'The physical environment shapes how people live and interact in different regions.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 06:11:10', NULL, NULL, NULL),
(45, 'Natural resources influence how people use land.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 07:42:09', NULL, NULL, NULL),
(46, 'Visual texts enhance our ability to express ideas and connect across cultures.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 08:06:57', NULL, NULL, NULL),
(47, 'Working together as a team in our classroom community helps us learn and grow.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 09:07:52', NULL, NULL, NULL),
(48, 'Living things have adapted to the earth’s natural cycles for survival.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 09:18:19', NULL, NULL, NULL),
(49, 'People in our neighborhood do different jobs to make our community work well.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 09:34:13', NULL, NULL, NULL),
(50, 'We learn about people, homes, and our surroundings to understand our world.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 09:47:07', NULL, NULL, NULL),
(51, 'People tell stories in different ways to share different messages and points of view.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 11:22:18', NULL, NULL, NULL),
(52, 'Families are made up of different roles and responsibilities to help each other.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 11:43:22', NULL, NULL, NULL),
(53, 'Pushing and pulling on an object can change the speed and direction of its motion.', 0, '2025-06-30 02:37:10', 2, '2025-05-23 11:54:22', NULL, NULL, NULL),
(54, 'Order and routines in our everyday activities help us to manage our daily lives.', 0, '2025-06-30 02:37:10', 2, '2025-05-26 01:36:57', NULL, NULL, NULL),
(55, 'Exploring materials and their characteristics enables us to understand how things work around us', 0, '2025-06-30 02:37:10', 2, '2026-06-10 13:00:29', 2, NULL, NULL),
(56, 'atest', 1, '2025-07-07 08:29:22', 2, '2025-07-07 08:29:42', 2, '2025-07-07 08:30:35', 2),
(57, 'Our body systems and senses allow us to survive, grow, and respond to our environment.', 0, '2025-10-22 15:28:27', 2, NULL, NULL, NULL, NULL),
(58, 'We use energy and waves to understand and connect with the world.', 0, '2025-10-22 15:28:42', 2, NULL, NULL, NULL, NULL),
(59, 'People express beliefs, values, and identity through culture.', 0, '2025-10-22 15:28:53', 2, NULL, NULL, NULL, NULL),
(60, 'People use different forms of expression to convey their ideas and feelings.', 0, '2025-10-23 08:51:16', 213, NULL, NULL, NULL, NULL),
(61, 'Developing awareness and strategies for personal well-being helps us lead a balanced life.', 0, '2025-11-11 08:23:36', 2, NULL, NULL, NULL, NULL),
(62, 'Community has changed over time, shaped by advancements in science, and technology.', 0, '2025-11-11 08:23:48', 2, NULL, NULL, NULL, NULL),
(63, 'Our action as servant leaders impacts the school community.', 0, '2025-11-11 08:23:59', 2, NULL, NULL, NULL, NULL),
(64, 'Communities work together to overcome challenges and resolve conflicts.', 0, '2025-11-11 08:53:23', 2, NULL, NULL, NULL, NULL),
(65, 'Through play we communicate ourselves and explore creativity.', 0, '2025-11-11 15:25:46', 213, NULL, NULL, NULL, NULL),
(66, 'People produce, share, and use goods and services to meet needs and wants.', 0, '2026-04-09 15:57:51', 2, NULL, NULL, NULL, NULL),
(67, 'Exploration and human movement have shaped how people live, adapt, and connect with their environment.', 0, '2026-04-10 07:43:19', 2, NULL, NULL, NULL, NULL),
(68, 'People find ways to reduce the impact of natural hazards on communities.', 0, '2026-04-10 07:43:34', 2, NULL, NULL, NULL, NULL),
(69, 'Living things grow and survive when their needs are met and their environments are cared for.', 0, '2026-05-11 14:18:16', 2, NULL, NULL, NULL, NULL),
(70, 'Our consumption choices impact the planet and the future.', 0, '2026-05-18 11:02:36', 2, NULL, NULL, NULL, NULL),
(71, 'Through visual texts, we explore how ideas and thinking are communicated in meaningful ways', 0, '2026-05-18 11:13:14', 2, NULL, NULL, NULL, NULL),
(72, 'People use natural resources in different ways to support life and human activities.', 0, '2026-05-18 11:26:48', 2, NULL, NULL, NULL, NULL),
(75, 'Living things responds to Earth''s natural cycles in order to survive.', 0, '2026-06-10 12:47:59', 2, NULL, NULL, NULL, NULL);

-- 4. Sync auto-increment sequence ID to max ID
SELECT setval(pg_get_serial_sequence('public.pyp_ci_list', 'id'), COALESCE(MAX(id), 1)) FROM public.pyp_ci_list;
