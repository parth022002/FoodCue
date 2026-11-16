# FoodCue Database Schema & Data Dictionary
**Neon PostgreSQL Production Schema Reference (Step 3 & Step 4 Complete)**

```text
========================================================================================
PROJECT:               FoodCue
DOCUMENT:              Database Schema & Data Dictionary
TOTAL PUBLIC TABLES:   11 Tables Active
MIGRATION LEDGER:      foodcue_schema_migrations
DATABASE ENGINE:       PostgreSQL 16 (Neon Serverless)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 §10 & Validation Workbook v13.5
========================================================================================
```

---

## 1. Master Table Inventory

| # | Table Name | Purpose | Key Constraints | Multi-Tenancy Column |
|---|---|---|---|---|
| 1 | `foodcue_users` | Verified user identities & profile metadata | `id` (PK, UUID), `clerk_user_id` (Unique) | User Anchor |
| 2 | `foodcue_profiles` | Avoid-lists, dietary preferences, Calm Mode | `profile_id` (PK), FK `user_id` -> `foodcue_users` | `household_id` |
| 3 | `foodcue_catalog` | Verified packaged food catalog with FSSAI licenses | `catalog_id` (PK), `gtin` (Unique) | Global Public |
| 4 | `foodcue_confirmed_labels` | Physical packaging verifications & evidence hashes | `label_id` (PK), FK `user_id` | `user_id` |
| 5 | `foodcue_pantry_items` | Current projected kitchen inventory stock | `item_id` (PK), FK `catalog_id` | `household_id` |
| 6 | `foodcue_pantry_events` | Immutable append-only pantry transaction ledger | `event_id` (PK) | `household_id` |
| 7 | `foodcue_reminders` | Date tracking & planning alerts (expiry, opened-on) | `reminder_id` (PK) | `household_id` |
| 8 | `foodcue_shopping_list` | Collaborative grocery replenishment list | `list_item_id` (PK) | `household_id` |
| 9 | `foodcue_intelligence_rules`| Deterministic FSSAI rule mappings and regexes | `rule_id` (PK) | Global Public |
| 10| `foodcue_audit_log` | Tamper-evident privacy and security audit log | `audit_id` (PK) | `user_id` |
| 11| `foodcue_households` | Family/household groups mapped to Clerk Orgs | `household_id` (PK, Clerk Org ID) | Household Anchor |

---

## 2. Table Specifications & Column Definitions

### 2.1 Table: `foodcue_users` (User Identity Foundation)
Stores authenticated user identities derived from verified Clerk sessions.

```sql
CREATE TABLE foodcue_users (
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
```

- **Primary Key:** `id` (UUID generated via `gen_random_uuid()`).
- **Unique Constraints:** `clerk_user_id` (Unique index `idx_users_clerk_user_id`), `user_id`.
- **Soft-Deletion Policy:** When an account is closed or deleted, `deleted_at` is set to `CURRENT_TIMESTAMP`. The record is retained to preserve immutable audit references in the pantry ledger without leaking profile access.
- **Indexes:**
  - `CREATE UNIQUE INDEX idx_users_clerk_user_id ON foodcue_users(clerk_user_id);`
  - `CREATE INDEX idx_users_email ON foodcue_users(email);`
  - `CREATE INDEX idx_users_deleted_at ON foodcue_users(deleted_at);`

---

### 2.2 Table: `foodcue_households` (Clerk Organizations)
Represents a shared family household pantry.

```sql
CREATE TABLE foodcue_households (
  household_id VARCHAR(128) PRIMARY KEY, -- Maps to Clerk Organization ID (org_xxx)
  name VARCHAR(256) NOT NULL,
  slug VARCHAR(128),
  image_url TEXT,
  created_by_user_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2.3 Table: `foodcue_pantry_events` (Append-Only Ledger)
The source of truth for all kitchen balances. Balances are derived by projecting event deltas.

```sql
CREATE TABLE foodcue_pantry_events (
  event_id VARCHAR(64) PRIMARY KEY,
  item_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(64) DEFAULT 'local-user',
  event_type VARCHAR(32) NOT NULL, -- intake, consume, discard, move, adjust, undo
  quantity_delta NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT 'pack',
  location VARCHAR(32), -- pantry, fridge, freezer
  date_type VARCHAR(32), -- best_before, expiry, opened_on
  date_value VARCHAR(64),
  note TEXT,
  compensating_event_id VARCHAR(64),
  source VARCHAR(32) DEFAULT 'user_action',
  occurred_at TIMESTAMPTZ NOT NULL,
  household_id VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

- **Indexes:**
  - `CREATE INDEX idx_pantry_events_item ON foodcue_pantry_events(item_id, occurred_at);`
  - `CREATE INDEX idx_pantry_events_household ON foodcue_pantry_events(household_id);`

---

### 2.4 Table: `foodcue_schema_migrations` (Migration Ledger)
Maintains an immutable record of all version-controlled migrations executed against Neon.

```sql
CREATE TABLE foodcue_schema_migrations (
  migration_name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64)
);
```

---

## 3. Migration History & Status

| Migration File | Description | Execution Status | Applied Date |
|---|---|---|---|
| `scripts/migrate-neon.mjs` | Initial baseline migration for 10 tables + Seed catalog | **Applied** | 16 Nov 2026 |
| `001_initial_users.sql` | Upgraded `foodcue_users` (UUID PK, `clerk_user_id`, `deleted_at`) | **Applied & Verified** | 16 Nov 2026 |
