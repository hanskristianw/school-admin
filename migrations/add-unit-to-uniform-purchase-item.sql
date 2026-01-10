-- Migration: Add unit_id to uniform_purchase_item
-- This allows one purchase order to contain items for multiple units

-- Add unit_id column to uniform_purchase_item
ALTER TABLE uniform_purchase_item
ADD COLUMN unit_id INT4;

-- Add foreign key constraint
ALTER TABLE uniform_purchase_item
ADD CONSTRAINT uniform_purchase_item_unit_fk
FOREIGN KEY (unit_id) REFERENCES unit(unit_id);

-- Migrate existing data: copy unit_id from uniform_purchase to items
UPDATE uniform_purchase_item pi
SET unit_id = p.unit_id
FROM uniform_purchase p
WHERE pi.purchase_id = p.purchase_id
AND pi.unit_id IS NULL;

-- Make unit_id NOT NULL after migration
ALTER TABLE uniform_purchase_item
ALTER COLUMN unit_id SET NOT NULL;

-- Optional: Make uniform_purchase.unit_id nullable (since unit is now per item)
-- Uncomment if you want to remove unit from header level
-- ALTER TABLE uniform_purchase
-- ALTER COLUMN unit_id DROP NOT NULL;

COMMENT ON COLUMN uniform_purchase_item.unit_id IS 'Unit tujuan untuk item ini. Satu purchase order bisa berisi items untuk berbagai unit.';
