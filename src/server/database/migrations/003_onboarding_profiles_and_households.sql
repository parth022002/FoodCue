-- FoodCue Database Migration: 003_onboarding_profiles_and_households.sql
-- Implements complete user profiles, food preferences, allergy safety records,
-- households, multi-tenant memberships, cryptographic invitations, and explicit sharing controls.
-- Controllable Baseline: FoodCue Master Specification & SaaS Architecture

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. User Profiles & Onboarding State
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  profile_image_url TEXT,
  age INTEGER,
  gender TEXT,
  country TEXT DEFAULT 'India',
  state TEXT,
  city TEXT,
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  onboarding_status VARCHAR(32) NOT NULL DEFAULT 'PROFILE_PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk ON user_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_status);

-- ----------------------------------------------------------------------------
-- 2. User Food Preferences (Dietary Patterns, Cuisines, Avoided Ingredients)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_food_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  preference_type VARCHAR(64) NOT NULL,
  preference_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_food_pref UNIQUE (clerk_user_id, preference_type, preference_value)
);

CREATE INDEX IF NOT EXISTS idx_user_food_pref_clerk ON user_food_preferences(clerk_user_id, preference_type);

-- ----------------------------------------------------------------------------
-- 3. User Allergies & Restrictions (Sensitive Medical Data with Explicit Consent)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  allergen_name TEXT NOT NULL,
  allergen_category VARCHAR(64) DEFAULT 'food',
  severity VARCHAR(32) DEFAULT 'moderate',
  notes TEXT,
  consent_obtained BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_allergy UNIQUE (clerk_user_id, allergen_name)
);

CREATE INDEX IF NOT EXISTS idx_user_allergies_clerk ON user_allergies(clerk_user_id);

-- Explicit status distinction: NOT_PROVIDED vs CONFIRMED_NO_ALLERGIES vs ALLERGIES_SPECIFIED
CREATE TABLE IF NOT EXISTS user_allergy_status (
  clerk_user_id TEXT PRIMARY KEY,
  status VARCHAR(32) NOT NULL DEFAULT 'NOT_PROVIDED',
  consent_timestamp TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. Households
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  household_type VARCHAR(64) DEFAULT 'Family',
  location TEXT,
  owner_clerk_user_id TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_households_owner ON households(owner_clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_households_status ON households(status);

-- ----------------------------------------------------------------------------
-- 5. Household Members & RBAC (Owner, Admin, Member, Viewer)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  membership_status VARCHAR(32) NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_household_member UNIQUE (household_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_hh_members_lookup ON household_members(clerk_user_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_hh_members_hh ON household_members(household_id);

-- ----------------------------------------------------------------------------
-- 6. Cryptographic Household Invitations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS household_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by_clerk_user_id TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invitation_token_hash VARCHAR(128) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_clerk_user_id TEXT,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hh_invitations_token ON household_invitations(invitation_token_hash);
CREATE INDEX IF NOT EXISTS idx_hh_invitations_hh ON household_invitations(household_id, status);
CREATE INDEX IF NOT EXISTS idx_hh_invitations_email ON household_invitations(invitee_email);

-- ----------------------------------------------------------------------------
-- 7. Explicit User Household Sharing Preferences (Default Private)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_household_sharing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  information_category VARCHAR(64) NOT NULL,
  sharing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_hh_sharing UNIQUE (clerk_user_id, household_id, information_category)
);

CREATE INDEX IF NOT EXISTS idx_user_hh_sharing ON user_household_sharing_preferences(household_id, clerk_user_id);

-- ----------------------------------------------------------------------------
-- 8. Shared Household Shopping Lists & Items
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS household_shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  clerk_user_id TEXT, -- nullable for household-wide lists
  name TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_by_clerk_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES household_shopping_lists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'units',
  notes TEXT,
  added_by_clerk_user_id TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON household_shopping_items(shopping_list_id, is_completed);

-- ----------------------------------------------------------------------------
-- 9. Audit Logs for Security-Sensitive Household & Profile Operations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_clerk_user_id TEXT NOT NULL,
  household_id UUID,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_clerk_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hh ON audit_logs(household_id, created_at);
