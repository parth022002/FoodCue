# FoodCue Synchronization Engine Architecture

```text
========================================================================================
MODULE:                Persistent Queue-Based Delta Synchronisation Engine
PACKAGE:               src/sync/
CONTROLLING SPEC:      FoodCue Master Specification v13.5 §12
TRANSPORTS:            HTTPS Fetch with Clerk Bearer Tokens (/api/sync/*)
LOCAL PERSISTENCE:     IndexedDB v3 (syncQueue & syncState stores)
========================================================================================
```

---

## 1. Engine Topology & Directory Layout

```text
src/sync/
├── types/
│   └── syncContracts.ts          # Typed contracts for operations, batches, devices
├── queue/
│   └── localChangeQueue.ts       # Persistent IndexedDB mutation queue
├── state/
│   ├── syncMetadata.ts           # Persistent device identity and cursor storage
│   └── syncStatus.ts             # Reactive state store driving consumer UI badges
├── transport/
│   └── syncApiClient.ts          # Authenticated HTTP client calling Vercel serverless endpoints
├── engine/
│   └── syncCoordinator.ts       # Lifecycle orchestration, auto-reconnection, retry loop
└── reconciliation/
    └── conflictResolver.ts       # Append-only event merge, LWW items, safety avoid-lists
```

---

## 2. Persistent Mutation Queue (`localChangeQueue.ts`)

Every local change made by the user (adding stock, consuming an item, moving inventory, ticking off groceries, confirming a scanned pack label) automatically enqueues an operation into IndexedDB store `syncQueue`:

```typescript
export interface SyncOperation {
  id: string; // Unique queue item UUID
  entityType: "pantry_event" | "pantry_item" | "shopping_item" | "confirmed_label" | "profile_settings";
  entityId: string;
  operationType: "create" | "update" | "delete" | "append_event";
  payload: Record<string, unknown>;
  clientTimestamp: string;
  idempotencyKey: string;
  status: "pending" | "in_flight" | "completed" | "failed";
  retryCount: number;
  lastError?: string;
  createdAt: string;
}
```

### Lifecycle of an Operation:
1. **`pending`**: Inserted immediately upon local mutation. Remains persistently stored even if the user closes their browser or restarts their computer.
2. **`in_flight`**: Selected by `syncCoordinator` in a batch of up to 50 operations.
3. **`completed`**: Confirmed by `/api/sync/push`. Removed from the queue.
4. **`failed`**: In case of network timeout or server error, `retryCount` increments. Operations with `retryCount < 5` return to `pending` with exponential backoff.

---

## 3. Storage Mutation Hook Integration

FoodCue avoids invasive boilerplate throughout the UI by intercepting local mutations in `src/adapters/storage/database.ts`:
- When `putRecord("pantryEvents", event)` is executed anywhere in the app, the storage listener automatically calls `localChangeQueue.enqueue(...)`.
- `syncStatus.setPendingCount(...)` is immediately updated.
- `syncCoordinator.triggerSync()` is requested asynchronously.

---

## 4. Background Sync Triggers

The `syncCoordinator` triggers synchronization automatically under three distinct conditions:
1. **Network Reconnection:** Listens to `window.addEventListener('online', ...)` to flush queued mutations as soon as connectivity resumes.
2. **Periodic Heartbeat:** Runs every 60 seconds to pull remote changes made by other household family members or other devices.
3. **Immediate Mutation Trigger:** Triggers whenever a new operation is enqueued by the user.
