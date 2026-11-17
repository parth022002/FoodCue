# FoodCue Neon Database Architecture
## Cloud Persistence, Multi-Tenant Isolation & Relational Lakebase Design

```text
========================================================================================
PROJECT:                FoodCue (Know your food. Manage your kitchen.)
PHASE:                  Step 6 — Cloud Sync and Multi-Device Integration
DATABASE ENGINE:        Neon Serverless PostgreSQL (PostgreSQL 16)
CONNECTION MODE:        Dual-Pool (Pooled WebSockets / Direct Unpooled Migrations)
SCHEMA VERSION:         2.0.0 (Migrations 001, 002 Applied & Verified)
CONTROLLING SPEC:       FoodCue Master Specification v13.5 §7 & §12
========================================================================================
```

---

## 1. Overview & Dual-Connection Strategy

FoodCue utilizes **Neon Serverless PostgreSQL** for encrypted multi-device synchronization and tenant-isolated cloud persistence. The backend enforces an explicit zero-cash architecture using Neon's generous free tier with auto-suspend and branch isolation.

### Connection Configuration
- **Pooled Connection (`DATABASE_URL`):** Powered by `@neondatabase/serverless` over WebSockets with `neonConfig.webSocketConstructor`. Optimally pools serverless connections across Vercel Node.js runtime instances.
- **Unpooled Connection (`DATABASE_URL_UNPOOLED`):** Direct TCP connection reserved for DDL schema migrations (`scripts/run-migrations.mjs`).

---

## 2. Relational Schema Architecture (15 Tables)

### A. User & Session Domain
1. **`foodcue_users`**:
   - `user_id` (PK, VARCHAR(64)): Internal FoodCue user UUID.
   - `clerk_id` (UNIQUE, VARCHAR(128)): Clerk subject identifier (`user_...`).
   - `email`, `display_name`, `is_anonymous`, `last_active_at`.
2. **`foodcue_profiles`**:
   - Avoidance arrays: `allergens_to_avoid TEXT[]`, `ingredients_to_avoid TEXT[]`.
   - UI settings: `calm_mode BOOLEAN`, `theme`, `dietary_preference`.
3. **`sync_devices`**:
   - `device_id` (PK, UUID DEFAULT gen_random_uuid()): Client device identifier.
   - `clerk_user_id` (TEXT, NOT NULL): Multi-tenant partition owner.
   - `device_name`, `client_version`, `user_agent`, `last_sync_at`, `is_revoked`.

### B. Core Inventory & Label Domain
4. **`foodcue_pantry_events`**:
   - Append-only event ledger: `event_id` (PK), `item_id`, `clerk_user_id`, `event_type`, `quantity_delta`, `unit`, `location`, `date_type`, `date_value`, `occurred_at`.
5. **`foodcue_pantry_items`**:
   - Projected pantry inventory: `item_id` (PK), `clerk_user_id`, `product_name`, `brand`, `current_quantity`, `unit`, `location`, `status`.
6. **`foodcue_confirmed_labels`**:
   - Physical pack audits: `label_id` (PK), `clerk_user_id`, `candidate_id`, `gtin`, `physical_identity`, `label_version`, `panels`, `raw_ocr_evidence`, `confirmed_at`.
7. **`foodcue_catalog`**:
   - Verified master food catalogue: `catalog_id` (PK), `gtin` (UNIQUE), `brand`, `product_name`, `ingredients_text`, `allergen_declaration`, `nutrition_facts`, `verified`.
8. **`foodcue_shopping_list`**:
   - Smart shopping items: `list_item_id` (PK), `clerk_user_id`, `product_name`, `brand`, `requested_quantity`, `unit`, `checked`, `notes`, `updated_at`.
9. **`foodcue_reminders`**:
   - Expiration and opened shelf-life alerts: `reminder_id` (PK), `clerk_user_id`, `item_id`, `title`, `target_date`, `status`.

### C. Synchronization Engine Domain
10. **`sync_operations`**:
    - Persistent delta operation log: `operation_id` (PK), `clerk_user_id`, `device_id`, `entity_type`, `entity_id`, `operation_type`, `payload JSONB`, `client_timestamp`, `server_timestamp`, `idempotency_key` (UNIQUE).

### D. System & Compliance Domain
11. **`foodcue_webhook_events`**:
    - Svix cryptographic webhook ledger: `event_id` (PK), `event_type`, `status`, `payload JSONB`, `received_at`.
12. **`foodcue_intelligence_rules`**:
    - Deterministic regulatory rules (FSSAI/Codex compliance): `rule_id` (PK), `pattern_regex`, `consequence_level`, `explanation_template`.
13. **`foodcue_audit_log`**:
    - Security audit trail: `audit_id` (PK), `user_id`, `action`, `resource_type`, `details JSONB`, `created_at`.
14. **`foodcue_pantry_locations`**:
    - Storage zones (Pantry, Fridge, Freezer).
15. **`schema_migrations`**:
    - Applied migration ledger with checksums and run timestamps.

---

## 3. Multi-Tenant User Isolation & Indexing

All user-owned tables enforce strict horizontal data isolation through parameterized `clerk_user_id` filtering.

### Performance Indexes
```sql
CREATE INDEX idx_sync_ops_user_cursor ON sync_operations(clerk_user_id, server_timestamp);
CREATE INDEX idx_sync_devices_user ON sync_devices(clerk_user_id, is_revoked);
CREATE INDEX idx_pantry_events_clerk ON foodcue_pantry_events(clerk_user_id, occurred_at);
CREATE INDEX idx_confirmed_labels_clerk ON foodcue_confirmed_labels(clerk_user_id);
CREATE INDEX idx_shopping_list_clerk ON foodcue_shopping_list(clerk_user_id, checked);
```

---

## 4. Verification & Health

The database connectivity is verified live on every serverless execution via `test/server/database/client.test.ts` executing `SELECT 1` against Neon Lakebase with real-time latency reporting (<50ms).
