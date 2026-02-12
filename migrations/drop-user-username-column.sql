-- Drop user_username column from users table
-- This column is no longer needed since login is now Google OAuth only.
-- The NOT NULL + UNIQUE constraint on this column was causing errors when creating new users.

-- Drop the index first
DROP INDEX IF EXISTS idx_users_username;

-- Drop the column
ALTER TABLE public.users DROP COLUMN IF EXISTS user_username;
