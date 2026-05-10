-- Add user_theme column to users table
-- Stores per-user UI theme preference: 'light' or 'dark'
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_theme VARCHAR(10) NOT NULL DEFAULT 'light';
