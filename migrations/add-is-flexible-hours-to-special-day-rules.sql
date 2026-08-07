-- Migration: Add is_flexible_hours column to special_day_rules
-- Description: Allows configuring specific dates/ranges where employees are exempt from late & leave early penalties, but must still scan attendance.

ALTER TABLE public.special_day_rules 
ADD COLUMN IF NOT EXISTS is_flexible_hours BOOLEAN DEFAULT false;
