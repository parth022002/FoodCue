# FoodCue Local-to-Cloud Data Migration Architecture

```text
========================================================================================
MODULE:                Local-to-Cloud Migration Wizard
SPECIFICATION:         FoodCue PRD v1.3 §6.3 & Master Specification v13.5 §12
PRIVACY BASELINE:      Zero-Forced-Upload (Strict Explicit User Consent)
DATA INTEGRITY:        Atomic Batch Commit with Zero Local Data Deletion
========================================================================================
```

---

## 1. Overview & Core Philosophy

FoodCue adheres strictly to the principle of **Local-First Primacy with Opt-In Cloud Synchronization**. 

Under no circumstances does FoodCue silently or automatically upload an anonymous user's local pantry inventory or scanned records simply because they signed in. Instead, cloud onboarding follows an explicit, transparent migration workflow powered by the **Migration Wizard** (`src/features/sync/MigrationWizard.tsx`).

### Core Guarantees:
1. **Preserved Local Copy:** All existing records remain in the browser's IndexedDB (`foodcue-local`). Enabling cloud sync does not clear or alter local records.
2. **Pre-Flight Inventory Count:** Before migrating, the wizard scans local IndexedDB and presents an exact breakdown of records to be uploaded (pantry events, confirmed labels, scanned pack candidates).
3. **Explicit Consent & Choice:** The user must explicitly choose **"Sync My Kitchen to Cloud"**. If they choose **"Keep Local Only"**, cloud sync remains inactive and data stays strictly on-device.
4. **Server Idempotency:** The migration payload is processed atomically via `POST /api/sync/migrate` with `ON CONFLICT DO NOTHING` statements, preventing duplicated ledger events or duplicate label IDs.

---

## 2. Migration Wizard Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Migration Wizard (Client)
    participant IDB as IndexedDB (foodcue-local v3)
    participant API as /api/sync/migrate (Serverless)
    participant Neon as Neon PostgreSQL

    User->>UI: Clicks "Enable Cloud Sync" or Signs In
    UI->>IDB: Scan records (pantryEvents, confirmedLabels, candidates)
    IDB-->>UI: Return record counts
    UI->>User: Displays Preview Dialog with exact record counts
    User->>UI: Clicks "Sync My Kitchen to Cloud"
    UI->>UI: Displays progress spinner ("Uploading records...")
    UI->>API: POST /api/sync/migrate (Bearer token + snapshot JSON)
    API->>API: Verify Clerk JWT & derive clerk_user_id
    API->>Neon: Batch insert records with clerk_user_id (ON CONFLICT DO NOTHING)
    Neon-->>API: Confirm inserted counts
    API-->>UI: Return HTTP 200 { migrated: true, counts }
    UI->>IDB: Update syncMetadata (cloudSyncEnabled = true)
    UI->>User: Displays completion receipt ("Your Kitchen Is Connected!")
```

---

## 3. Data Ingestion Contract (`api/sync/migrate.ts`)

```typescript
export interface MigrationSnapshot {
  pantryEvents: Array<{
    eventId: string;
    itemId: string;
    eventType: string;
    quantityDelta: number;
    unit: string;
    location?: string;
    occurredAt: string;
    note?: string;
  }>;
  confirmedLabels: Array<{
    confirmedLabelId: string;
    physicalIdentity: string;
    labelVersion: string;
    lotNumber?: string;
    panels?: unknown;
    fieldStates?: unknown;
    confirmedAt: string;
  }>;
  shoppingItems: Array<{
    listItemId: string;
    productName: string;
    requestedQuantity: number;
    unit: string;
    checked: boolean;
  }>;
}
```

---

## 4. Error Handling & Rollback Safety

- **Network Interruption during Upload:** If the request fails, the local `syncMetadata.cloudSyncEnabled` flag remains `false`. The user is informed with a "Retry Sync" action. Because all records are preserved in IndexedDB, zero data is lost.
- **Partial Retries:** When retried, Postgres primary key constraints (`ON CONFLICT (event_id) DO NOTHING`) ensure already uploaded items are not duplicated.
