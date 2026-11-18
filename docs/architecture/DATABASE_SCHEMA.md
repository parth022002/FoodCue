# FoodCue — Database Schema & Data Model Specification

FoodCue uses a dual-layer data architecture:
1. **Client-Side:** Dexie IndexedDB (Local-First Offline Storage)
2. **Cloud-Side:** Neon Serverless PostgreSQL (Multi-Device Cloud Persistence)

---

## 1. Client-Side Schema (Dexie IndexedDB)

Defined in `src/adapters/storage/database.ts` (Database Name: `FoodCueLocalDB`):

```typescript
// Dexie Database Schema Version 3
db.version(3).stores({
  // Active pantry items projected from event ledger
  pantry_items: 'id, name, gtin, category, storageLocation, expiryDate, status, householdId, updatedAt',
  
  // Append-only pantry ledger events
  pantry_ledger: 'eventId, itemId, eventType, timestamp, userId, householdId, syncStatus',
  
  // Curated offline Indian FMCG catalog
  fmcg_catalog: 'gtin, name, brand, category, healthScore',
  
  // User personal and household avoid-list criteria
  avoid_list: 'id, type, name, severity, householdId',
  
  // Offline sync queue for offline mutations
  sync_queue: 'id, endpoint, method, payload, createdAt, attempts',
  
  // Confirmed and reviewed packaging labels
  confirmed_labels: 'id, gtin, productName, confidence, confirmedAt',
  
  // Collaborative replenishment shopping list
  shopping_items: 'id, name, gtin, quantity, needed, householdId, updatedAt',
  
  // Local audit log for traceability and debugging
  audit_logs: 'id, timestamp, action, severity, details'
});
```

---

## 2. Server-Side Schema (Neon PostgreSQL)

All migrations are maintained in `scripts/run-migrations.mjs`. There are **15 production tables** in the `public` schema:

```text
                                  +-------------------+
                                  |   foodcue_users   |
                                  +---------+---------+
                                            | 1
                                            |
                                            | N
                                  +---------v---------+
                     +----------->| foodcue_households|<-----------+
                     |            +----+---------+----+            |
                     |                 | 1       | 1               |
                     |                 |         |                 |
                     |               N |       N |                 |
         +-----------v-------+   +-----v-------+ v-----------------+------+
         |foodcue_pantry_    |   |foodcue_     | |foodcue_household_      |
         |ledger_events      |   |shopping_    | |members                 |
         +-------------------+   |items        | +------------------------+
                                 +-------------+
```

### Table 1: `foodcue_users`
Stores authenticated users synchronized from Clerk webhooks.
```sql
CREATE TABLE IF NOT EXISTS foodcue_users (
    id VARCHAR(128) PRIMARY KEY, -- Clerk user_id
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(128),
    last_name VARCHAR(128),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_foodcue_users_email ON foodcue_users(email);
```

### Table 2: `foodcue_households`
Represents shared multi-tenant family kitchens (maps to Clerk Organizations).
```sql
CREATE TABLE IF NOT EXISTS foodcue_households (
    id VARCHAR(128) PRIMARY KEY, -- Clerk org_id or personal household id
    name VARCHAR(255) NOT NULL,
    created_by VARCHAR(128) REFERENCES foodcue_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Table 3: `foodcue_household_members`
User memberships and roles within a household.
```sql
CREATE TABLE IF NOT EXISTS foodcue_household_members (
    id VARCHAR(128) PRIMARY KEY,
    household_id VARCHAR(128) NOT NULL REFERENCES foodcue_households(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL REFERENCES foodcue_users(id) ON DELETE CASCADE,
    role VARCHAR(64) DEFAULT 'member', -- 'admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(household_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON foodcue_household_members(user_id);
```

### Table 4: `foodcue_devices`
Registered multi-device topology per user/household.
```sql
CREATE TABLE IF NOT EXISTS foodcue_devices (
    device_id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL REFERENCES foodcue_users(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    platform VARCHAR(64),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Table 5: `foodcue_pantry_ledger_events`
Append-only pantry event ledger synchronized from clients.
```sql
CREATE TABLE IF NOT EXISTS foodcue_pantry_ledger_events (
    event_id VARCHAR(128) PRIMARY KEY,
    item_id VARCHAR(128) NOT NULL,
    household_id VARCHAR(128) NOT NULL REFERENCES foodcue_households(id) ON DELETE CASCADE,
    user_id VARCHAR(128) REFERENCES foodcue_users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL, -- ITEM_ADDED, ITEM_CONSUMED, ITEM_DISCARDED, ITEM_UPDATED
    payload JSONB NOT NULL,
    vector_clock JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    seq_number BIGSERIAL
);
CREATE INDEX IF NOT EXISTS idx_pantry_ledger_household_seq ON foodcue_pantry_ledger_events(household_id, seq_number);
```

### Table 6: `foodcue_shopping_items`
Collaborative replenishment shopping list.
```sql
CREATE TABLE IF NOT EXISTS foodcue_shopping_items (
    id VARCHAR(128) PRIMARY KEY,
    household_id VARCHAR(128) NOT NULL REFERENCES foodcue_households(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gtin VARCHAR(32),
    quantity NUMERIC DEFAULT 1,
    unit VARCHAR(32) DEFAULT 'pack',
    needed BOOLEAN DEFAULT TRUE,
    added_by VARCHAR(128) REFERENCES foodcue_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shopping_items_household ON foodcue_shopping_items(household_id);
```

### Table 7: `foodcue_user_catalogues`
Private custom catalog items and reviews per user.
```sql
CREATE TABLE IF NOT EXISTS foodcue_user_catalogues (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL REFERENCES foodcue_users(id) ON DELETE CASCADE,
    gtin VARCHAR(32),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    nutrition_data JSONB DEFAULT '{}'::jsonb,
    user_rating INT,
    user_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Table 8: `foodcue_avoid_lists`
User and household allergen and dietary avoid-lists.
```sql
CREATE TABLE IF NOT EXISTS foodcue_avoid_lists (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) REFERENCES foodcue_users(id) ON DELETE CASCADE,
    household_id VARCHAR(128) REFERENCES foodcue_households(id) ON DELETE CASCADE,
    item_type VARCHAR(64) NOT NULL, -- 'allergen', 'dietary', 'additive'
    item_name VARCHAR(128) NOT NULL,
    severity VARCHAR(32) DEFAULT 'high', -- 'high', 'moderate', 'preference'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Table 9: `foodcue_confirmed_labels`
Audited ground-truth food labels confirmed by users or administrators.
```sql
CREATE TABLE IF NOT EXISTS foodcue_confirmed_labels (
    id VARCHAR(128) PRIMARY KEY,
    gtin VARCHAR(32) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    serving_size VARCHAR(64),
    nutrients JSONB NOT NULL,
    ingredients TEXT,
    allergens TEXT[],
    fssai_license VARCHAR(64),
    confidence NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Table 10: `foodcue_catalog`
Cached external and global FMCG products.
```sql
CREATE TABLE IF NOT EXISTS foodcue_catalog (
    gtin VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(128),
    health_score NUMERIC,
    nutrients JSONB DEFAULT '{}'::jsonb,
    source VARCHAR(64) DEFAULT 'fmcg_seed',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tables 11–15: System & Infrastructure Tables
- `foodcue_push_subscriptions`: Stores VAPID endpoint, p256dh, and auth tokens per user/device.
- `foodcue_sync_operations`: Logs push/pull synchronization payloads and idempotency keys.
- `foodcue_intelligence_rules`: Configurable rules for the 0–100 health scoring engine.
- `foodcue_audit_log`: System security, privacy, and access audit log.
- `foodcue_migrations`: Migration lock and tracking history.

---

## 3. Migration Execution

Database migrations are executed deterministically using `node scripts/run-migrations.mjs`. The script connects via unpooled direct compute (`DATABASE_URL_UNPOOLED`) to apply DDL safely and idempotently.
