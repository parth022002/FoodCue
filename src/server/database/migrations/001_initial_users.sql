-- FoodCue Database Migration: 001_initial_users.sql
-- Establishes the cloud user identity foundation in Neon PostgreSQL
-- Aligns with FoodCue Master Specification v13.5 and Clerk authentication

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create or ensure foodcue_users table
CREATE TABLE IF NOT EXISTS foodcue_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) UNIQUE,
  clerk_user_id TEXT UNIQUE,
  clerk_id VARCHAR(128) UNIQUE,
  email TEXT,
  display_name TEXT,
  username TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  device_fingerprint VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- 2. Alter existing table to add new columns if table existed previously
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_users' AND column_name = 'id') THEN
    ALTER TABLE foodcue_users ADD COLUMN id UUID DEFAULT gen_random_uuid() UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_users' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE foodcue_users ADD COLUMN clerk_user_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_users' AND column_name = 'username') THEN
    ALTER TABLE foodcue_users ADD COLUMN username TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_users' AND column_name = 'updated_at') THEN
    ALTER TABLE foodcue_users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_users' AND column_name = 'deleted_at') THEN
    ALTER TABLE foodcue_users ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Backfill synchronizations
UPDATE foodcue_users 
SET clerk_user_id = clerk_id 
WHERE clerk_user_id IS NULL AND clerk_id IS NOT NULL;

UPDATE foodcue_users 
SET clerk_id = clerk_user_id 
WHERE clerk_id IS NULL AND clerk_user_id IS NOT NULL;

UPDATE foodcue_users 
SET user_id = id::text 
WHERE user_id IS NULL;

-- 4. Create indexes for high-speed lookup and soft-deletion queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id ON foodcue_users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON foodcue_users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON foodcue_users(deleted_at);
