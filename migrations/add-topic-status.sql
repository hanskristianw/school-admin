-- Migration: Add topic_status column to topic table
-- Description: Adds topic_status column with default 'published' to support Save as Draft feature.

ALTER TABLE public.topic
ADD COLUMN IF NOT EXISTS topic_status VARCHAR(20) DEFAULT 'published';
