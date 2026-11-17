# FoodCue Cloud-Connected Product Architecture & Multi-Device Synchronisation

```text
========================================================================================
PROJECT:               FoodCue
ARCHITECTURE:          Local-First with Resilient Cloud Hybrid Persistence
COMPONENTS:            IndexedDB v3 (Client) | Vercel Serverless (API) | Neon PostgreSQL | Clerk Auth
SPECIFICATION:         FoodCue Master Specification v13.5
========================================================================================
```

---

## 1. High-Level System Architecture

FoodCue combines **zero-latency local-first execution** with **eventual consistency cloud synchronization**:

```mermaid
flowchart TB
    subgraph Client ["Client Device (Browser / PWA)"]
        UI["React 18 User Interface"]
        IDB[("IndexedDB (foodcue-local v3)\n- pantryEvents\n- candidates\n- confirmedLabels\n- syncQueue\n- syncMetadata")]
        SyncEngine["Sync Engine\n- localChangeQueue\n- syncCoordinator\n- conflictResolver"]
        
        UI -->|Reads & Writes| IDB
        UI -->|Enqueues mutations| SyncEngine
        SyncEngine -->|Persists queued ops| IDB
    end

    subgraph Edge ["Vercel Edge & Serverless Layer"]
        HealthAPI["/api/health"]
        AuthAPI["/api/me"]
        WebhookAPI["/api/webhooks/clerk"]
        SyncPushAPI["/api/sync/push"]
        SyncPullAPI["/api/sync/pull"]
        SyncMigrateAPI["/api/sync/migrate"]
        DevicesAPI["/api/devices"]
    end

    subgraph Cloud ["Secure Cloud Persistence"]
        ClerkAuth["Clerk Identity & Household Orgs"]
        NeonDB[("Neon Serverless PostgreSQL\n- foodcue_users\n- sync_devices\n- sync_operations\n- foodcue_pantry_events\n- foodcue_pantry_items\n- foodcue_shopping_list")]
    end

    SyncEngine <-->|Bearer Token Auth (HTTPS)| Edge
    Edge -->|Verify JWT| ClerkAuth
    ClerkAuth -->|Webhooks (Svix HMAC)| WebhookAPI
    Edge -->|Pooled SQL Queries| NeonDB
```

---

## 2. Core Architectural Pillars

### Pillar 1: Local-First Primacy
- Unauthenticated visitors can execute 100% of core features (SmartScan, pantry management, shopping list, expiry reminders, dietary avoidance rules) completely offline.
- Data is stored in IndexedDB (`foodcue-local`).
- No modal blocks or forced sign-in walls exist.

### Pillar 2: Opt-In Cloud Synchronization
- Cloud synchronization is strictly activated when the user signs in via Clerk.
- Before any data is transmitted, an interactive Migration Wizard presents an exact inventory of local records and requires user consent.
- All local data remains on device even after cloud synchronization is enabled.

### Pillar 3: Resilient Delta Sync with Persistent Queue
- Every mutation (adding an item, consuming stock, updating avoid-lists) appends to `syncQueue` in IndexedDB.
- Offline actions remain safely queued across page reloads and browser restarts.
- Once connectivity is restored, the `syncCoordinator` flushes pending batches to `/api/sync/push` with exponential backoff and idempotency keys.

### Pillar 4: Append-Only Event Ledger & Conflict Resolution
- Inventory is modeled as an append-only sequence of immutable events (`intake`, `consume`, `discard`, `adjust`, `move`).
- Multiple devices modifying inventory converge deterministically by merging event sequences rather than overwriting mutable counters.
- Shopping items and preference flags resolve using timestamped Last-Write-Wins (LWW) with tombstones for deletions.

### Pillar 5: Multi-Device Fleet Management
- Each client device receives a persistent UUID stored in `syncMetadata`.
- Devices are registered in `sync_devices` on Neon PostgreSQL.
- Users can view and revoke active devices from their Profile security drawer.
- Revoked devices are rejected at the API boundary on subsequent sync requests.
