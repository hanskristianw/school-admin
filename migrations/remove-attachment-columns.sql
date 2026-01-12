-- Remove attachment_url columns from uniform purchase tables
-- These columns are no longer needed as we're removing the attachment upload feature

-- Drop from uniform_purchase table
ALTER TABLE public.uniform_purchase DROP COLUMN IF EXISTS attachment_url;

-- Drop from uniform_purchase_receipt table
ALTER TABLE public.uniform_purchase_receipt DROP COLUMN IF EXISTS attachment_url;
