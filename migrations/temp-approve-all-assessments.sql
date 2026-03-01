-- TEMPORARY: Approve all waiting assessments (bypass approval flow)
-- Run this in Supabase SQL Editor to fix existing assessments showing "Waiting" status
-- Can be reverted when approval flow is re-enabled

UPDATE assessment
SET assessment_status = 1
WHERE assessment_status = 0 OR assessment_status = 3;
