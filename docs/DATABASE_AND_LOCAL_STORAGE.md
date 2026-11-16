# FoodCue Database and Local Storage Specification
**Phase 1 (S1 – Local Data) Technical Baseline & Implementation Guide**

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
DOCUMENT TITLE:        FoodCue Database and Local Storage Specification
DOCUMENT VERSION:      v1.0 (Phase 1 / S1 Baseline Complete)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT SPECIFICATION: FoodCue Product Development Requirements Document (PRD) v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
STATUS:                Production Implementation Verified (30/30 Tests Passing)
========================================================================================
```

---

## 1. Storage Architecture Overview

FoodCue enforces a **strict local-first, privacy-by-default storage architecture**. The primary persistence layer is browser-native **IndexedDB**, isolated behind a decoupled adapter in `src/adapters/storage/database.ts`.

React UI components and feature modules **never** manipulate IndexedDB directly. Data access is channeled through domain services and repository interfaces:

```text
React UI Layer
      │
      ▼
Application / Feature Services (Kitchen, SmartScan, Privacy)
      │
      ▼
Domain Services (Pantry Ledger, ConfirmedLabel Guards)
      │
      ▼
Storage Adapter Interface (database.ts)
      │
      ▼
Browser IndexedDB ("foodcue-local")
```

---

## 2. Database Schema Definition

- **Database Name:** `foodcue-local`
- **Current Schema Version:** `2`
- **Driver / Engine:** Browser-native IndexedDB API (tested with Vitest via `fake-indexeddb`)

### 2.1 Object Stores & Indexes

| Store Name | Primary Key (`keyPath`) | Purpose | Indexes Defined | Deletion Semantics |
|---|---|---|---|---|
| `pantryEvents` | `eventId` (String) | Append-only immutable pantry event ledger | `itemId`<br>`eventType`<br>`occurredAt` | **Never silently deleted.** Compensating events reverse balance. |
| `confirmedLabels` | `confirmedLabelId` (String) | Verified physical packaging labels | `candidateId` | Permanent record; cleared only on factory reset. |
| `candidates` | `id` (String) | Unconfirmed product candidates from scan | None (Scan lifecycle) | Ephemeral / retained until confirmed or discarded. |
| `analysisResults` | `id` (String) | Cached deterministic rule evaluations | None | Flushed when underlying confirmed label changes. |
| `settings` | `key` (String) | User preferences, Calm Mode, avoid-lists | None | Key-value upsert. |
| `metadata` | `key` (String) | Schema migration flags and installation info | None | Internal database maintenance metadata. |

---

## 3. Versioned Schema Migrations

The database migration engine in `openDatabase()` handles incremental database upgrades deterministically:

- **Version 0 -> Version 1 (Baseline Scaffolding):**
  - Creates baseline stores: `candidates`, `confirmedLabels`, `analysisResults`, `pantryEvents`, `settings`.
- **Version 1 -> Version 2 (Performance & Indexing Upgrade):**
  - Creates the `metadata` store for internal system state.
  - Adds composite search indexes on `pantryEvents`:
    - `itemId`: Enables fast item history lookups.
    - `eventType`: Enables filtered ledger queries (`consume`, `discard`).
    - `occurredAt`: Guarantees chronological event ordering.
  - Adds index on `confirmedLabels`:
    - `candidateId`: Enables candidate-to-label provenance tracing.
- **Blocked Upgrade Handling:** The `onblocked` event listener surfaces an alert if another browser tab is preventing migration.
- **Error Safety:** Upgrade transactions fail closed; failed migrations never silently drop or truncate existing user data.

---

## 4. Transaction Management

All write operations enforce strict ACID guarantees using native IndexedDB transactions:

1. **Single-Store Writes (`putRecord`, `deleteRecord`):** Execute within a scoped `"readwrite"` transaction.
2. **Multi-Store Clear (`clearFoodCueData`):** Executes across all stores (`[...STORES]`) in a single atomic transaction.
3. **Rollback Behavior:** If an error occurs during write or import, `tx.abort()` automatically reverses all pending mutations.

---

## 5. Data Portability: Export and Import Contract

### 5.1 Export Package Specification (`FoodCueExportPackage`)
The export function (`exportDataPackage()`) generates a portable, versioned JSON payload:

```json
{
  "format": "FoodCueBackup",
  "schemaVersion": 2,
  "exportVersion": 1,
  "exportedAt": "2026-11-16T19:00:00.000Z",
  "metadata": {
    "totalPantryEvents": 14,
    "totalConfirmedLabels": 3,
    "totalCandidates": 5,
    "appVersion": "1.0.0"
  },
  "data": {
    "pantryEvents": [],
    "confirmedLabels": [],
    "candidates": [],
    "settings": {}
  }
}
```

### 5.2 Import Validation Pipeline
The import function (`importDataPackage(jsonString, mode)`) validates every package through a strict 5-stage gate:

1. **JSON Syntax Verification:** Rejects malformed or non-JSON files.
2. **Format Header Guard:** Requires `format === "FoodCueBackup"`.
3. **Version Compatibility Guard:** Rejects backups from future schema versions (`pkg.schemaVersion > DB_VERSION`) to prevent schema corruption.
4. **Record Invariant Validation:** Validates `eventId`, `itemId`, `quantityDelta` finiteness, and confirmation state on every imported event.
5. **Atomic Execution:**
   - **Merge Mode (`mode = "merge"`):** Idempotently upserts records without overwriting existing unconflicted events.
   - **Replace Mode (`mode = "replace"`):** Atomically wipes current stores before importing new records.

---

## 6. Storage Quota, Persistence & Eviction Canary

- **Quota Metering:** `getStorageQuotaEstimate()` utilizes `navigator.storage.estimate()` to calculate used MB, quota MB, and utilization percentage.
- **Storage Eviction Canary:** Requests `navigator.storage.persist()` on supported browsers to prevent mobile operating systems (iOS Safari, Android Chrome) from clearing local IndexedDB during background memory pressure.
- **Health Verification:** `checkDatabaseHealth()` runs on launch, verifying that all stores exist and reporting live record counts.

---

## 7. Complete Data Deletion & Factory Reset

`clearFoodCueData()` provides user-controlled data sovereignty:
1. Opens an atomic transaction across all stores.
2. Clears every object store.
3. **Verification Step:** Directly queries `countRecords()` for each store; throws an error if any store still contains records.
4. Resets runtime memory state.

---

```text
========================================================================================
END OF DATABASE AND LOCAL STORAGE SPECIFICATION (v1.0)
========================================================================================
```
