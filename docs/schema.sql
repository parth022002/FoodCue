-- ============================================================================
-- FoodCue Production Database Schema (PostgreSQL 15+ / Neon Lakebase)
-- Version: 1.0.0
-- Controlling Baseline: FoodCue Master Specification v13.5
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Users & Device Sessions
-- Supports anonymous local-first PWA users and authenticated Clerk accounts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_users (
  user_id VARCHAR(64) PRIMARY KEY,
  clerk_id VARCHAR(128) UNIQUE,
  email VARCHAR(255),
  display_name VARCHAR(128),
  is_anonymous BOOLEAN DEFAULT TRUE,
  device_fingerprint VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. User Profiles, Avoid-Lists & Preferences
-- Stores deterministic avoidance criteria (allergens, ingredients) & UI settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_profiles (
  profile_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES foodcue_users(user_id) ON DELETE CASCADE,
  allergens_to_avoid TEXT[] DEFAULT '{}',
  ingredients_to_avoid TEXT[] DEFAULT '{}',
  dietary_preference VARCHAR(64) DEFAULT 'standard',
  calm_mode BOOLEAN DEFAULT FALSE,
  theme VARCHAR(16) DEFAULT 'system',
  emergency_contact_number VARCHAR(32) DEFAULT '112',
  enable_cloud_backup BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. Master Verified Packaged Food Catalog
-- Verified Indian and global packaged food products with FSSAI registration
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_catalog (
  catalog_id VARCHAR(64) PRIMARY KEY,
  gtin VARCHAR(14) UNIQUE NOT NULL,
  brand VARCHAR(128) NOT NULL,
  product_name VARCHAR(256) NOT NULL,
  variant VARCHAR(128),
  pack_size VARCHAR(64),
  category VARCHAR(64),
  fssai_licence VARCHAR(32),
  ingredients_text TEXT NOT NULL,
  allergen_declaration TEXT,
  cross_contact_statement TEXT,
  serving_size VARCHAR(64),
  servings_per_pack NUMERIC(6, 2),
  nutrition_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ins_additives TEXT[] DEFAULT '{}',
  image_front_url TEXT,
  image_back_url TEXT,
  verified BOOLEAN DEFAULT TRUE,
  verified_by VARCHAR(64) DEFAULT 'curator',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. Confirmed Labels (Physical Pack Verifications)
-- Audit trace of physical packs confirmed by users via SmartScan
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_confirmed_labels (
  label_id VARCHAR(64) PRIMARY KEY,
  candidate_id VARCHAR(64) NOT NULL,
  gtin VARCHAR(14),
  user_id VARCHAR(64),
  physical_identity VARCHAR(256) NOT NULL,
  label_version VARCHAR(128) NOT NULL,
  lot_number VARCHAR(64),
  date_marking_type VARCHAR(32),
  date_marking_value VARCHAR(64),
  panels JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_ocr_evidence JSONB DEFAULT '{}'::jsonb,
  field_states JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash VARCHAR(64),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. Kitchen / Pantry Items (Projected Stock State)
-- Current balance derived from append-only events or fast-lookup projection
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_pantry_items (
  item_id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'local-user',
  catalog_id VARCHAR(64) REFERENCES foodcue_catalog(catalog_id) ON DELETE SET NULL,
  gtin VARCHAR(14),
  product_name VARCHAR(256) NOT NULL,
  brand VARCHAR(128),
  current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(32) NOT NULL DEFAULT 'pack',
  location VARCHAR(32) NOT NULL DEFAULT 'pantry',
  storage_condition VARCHAR(64) DEFAULT 'ambient',
  lot_number VARCHAR(64),
  date_type VARCHAR(32) DEFAULT 'best_before',
  date_value VARCHAR(64),
  opened_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. Pantry Event Ledger (Append-Only Event Store)
-- Primary source of truth for all inventory changes. Never overwrite directly.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_pantry_events (
  event_id VARCHAR(64) PRIMARY KEY,
  item_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(64) DEFAULT 'local-user',
  event_type VARCHAR(32) NOT NULL, -- intake, consume, discard, move, adjust, undo
  quantity_delta NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT 'pack',
  location VARCHAR(32),
  date_type VARCHAR(32),
  date_value VARCHAR(64),
  note TEXT,
  compensating_event_id VARCHAR(64),
  source VARCHAR(32) DEFAULT 'user_action',
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. Date Tracking & Expiry Reminders
-- Reminders for best-before dates, use-by dates, and opened shelf life
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_reminders (
  reminder_id VARCHAR(64) PRIMARY KEY,
  item_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(64) DEFAULT 'local-user',
  title VARCHAR(256) NOT NULL,
  reminder_type VARCHAR(32) NOT NULL DEFAULT 'expiry',
  target_date TIMESTAMPTZ NOT NULL,
  snooze_count INTEGER DEFAULT 0,
  last_snoozed_at TIMESTAMPTZ,
  status VARCHAR(32) DEFAULT 'pending', -- pending, snoozed, actioned, dismissed
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. Smart Shopping List
-- Re-order and replenishment items generated from depleted pantry stock or manual
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_shopping_list (
  list_item_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'local-user',
  gtin VARCHAR(14),
  product_name VARCHAR(256) NOT NULL,
  brand VARCHAR(128),
  category VARCHAR(64) DEFAULT 'General',
  requested_quantity NUMERIC(10, 2) DEFAULT 1.00,
  unit VARCHAR(32) DEFAULT 'pack',
  checked BOOLEAN DEFAULT FALSE,
  source VARCHAR(32) DEFAULT 'manual', -- manual, depleted_stock, low_stock, smartscan
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. Intelligence Rules (FSSAI / Codex Mappings & Additives)
-- Deterministic rules engine definitions versioned for compliance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_intelligence_rules (
  rule_id VARCHAR(64) PRIMARY KEY,
  rule_name VARCHAR(128) NOT NULL,
  category VARCHAR(32) NOT NULL, -- allergen, additive, nutrition, claim
  pattern_regex TEXT NOT NULL,
  consequence_level VARCHAR(32) NOT NULL, -- info, advisory, warning, critical
  legal_reference VARCHAR(128),
  explanation_template TEXT NOT NULL,
  version VARCHAR(16) DEFAULT '1.0',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. Audit Log & Privacy Ledger
-- Tamper-evident log of security-sensitive operations and data wipe events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foodcue_audit_log (
  audit_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'local-user',
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128),
  details JSONB DEFAULT '{}'::jsonb,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Performance Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_catalog_gtin ON foodcue_catalog(gtin);
CREATE INDEX IF NOT EXISTS idx_catalog_brand ON foodcue_catalog(brand);
CREATE INDEX IF NOT EXISTS idx_pantry_items_user ON foodcue_pantry_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pantry_events_item ON foodcue_pantry_events(item_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_reminders_target ON foodcue_reminders(user_id, status, target_date);
CREATE INDEX IF NOT EXISTS idx_shopping_user ON foodcue_shopping_list(user_id, checked);
CREATE INDEX IF NOT EXISTS idx_confirmed_labels_gtin ON foodcue_confirmed_labels(gtin);
