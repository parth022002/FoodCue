-- FoodCue Database Migration: 002_sync_engine_and_devices.sql
-- Establishes the multi-device synchronization engine, device management,
-- and tenant-isolated relational columns in Neon PostgreSQL.
-- Controlling Baseline: FoodCue Master Specification v13.5 §12 & §15

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Webhook Idempotency Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_webhook_events (
  event_id VARCHAR(128) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'received',
  payload JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_status ON foodcue_webhook_events(status, received_at);

-- ----------------------------------------------------------------------------
-- 2. Registered Multi-Device Sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  client_version TEXT DEFAULT '1.0.0',
  user_agent TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_devices_user ON sync_devices(clerk_user_id, is_revoked);

-- ----------------------------------------------------------------------------
-- 3. Persistent Sync Operation Log (Delta Sync & Conflict Resolution)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_operations (
  operation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  device_id UUID REFERENCES sync_devices(device_id) ON DELETE SET NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  operation_type VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_ops_user_cursor ON sync_operations(clerk_user_id, server_timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_ops_entity ON sync_operations(clerk_user_id, entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 4. Multi-Tenant User Isolation Columns on Core Application Tables
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- foodcue_pantry_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_pantry_items' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE foodcue_pantry_items ADD COLUMN clerk_user_id TEXT;
  END IF;

  -- foodcue_pantry_events
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_pantry_events' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE foodcue_pantry_events ADD COLUMN clerk_user_id TEXT;
  END IF;

  -- foodcue_shopping_list
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_shopping_list' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE foodcue_shopping_list ADD COLUMN clerk_user_id TEXT;
  END IF;

  -- foodcue_reminders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_reminders' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE foodcue_reminders ADD COLUMN clerk_user_id TEXT;
  END IF;

  -- foodcue_confirmed_labels
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foodcue_confirmed_labels' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE foodcue_confirmed_labels ADD COLUMN clerk_user_id TEXT;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Tenant Isolation Performance Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pantry_items_clerk ON foodcue_pantry_items(clerk_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pantry_events_clerk ON foodcue_pantry_events(clerk_user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_shopping_list_clerk ON foodcue_shopping_list(clerk_user_id, checked);
CREATE INDEX IF NOT EXISTS idx_confirmed_labels_clerk ON foodcue_confirmed_labels(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_clerk ON foodcue_reminders(clerk_user_id, status, target_date);
