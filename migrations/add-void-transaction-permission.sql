-- =====================================================
-- ADD VOID TRANSACTION PERMISSION TO ROLE TABLE
-- =====================================================
-- Purpose: Add granular permission control for voiding transactions
-- Date: 2026-01-29
-- =====================================================

-- Step 1: Add can_void_transactions column to role table
ALTER TABLE role 
ADD COLUMN IF NOT EXISTS can_void_transactions BOOLEAN DEFAULT false;

-- Step 2: Set permission for Principal and Admin roles by default
UPDATE role 
SET can_void_transactions = true 
WHERE is_principal = true OR is_admin = true;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_role_void_permission 
ON role(can_void_transactions);

-- Step 4: Add helpful comment
COMMENT ON COLUMN role.can_void_transactions IS 'Permission to void/cancel transactions (purchases, sales, etc). Typically granted to Principal and Admin roles.';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check which roles have void permission
-- SELECT role_id, role_name, is_admin, is_principal, can_void_transactions
-- FROM role
-- ORDER BY role_priority DESC;

-- Count users with void permission
-- SELECT 
--   COUNT(DISTINCT u.user_id) as users_with_void_permission
-- FROM users u
-- JOIN role r ON u.user_role_id = r.role_id
-- WHERE r.can_void_transactions = true;
