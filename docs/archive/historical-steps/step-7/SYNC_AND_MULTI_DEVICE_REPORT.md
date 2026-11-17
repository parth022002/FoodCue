# FoodCue Step 7 Cloud Sync & Multi-Device Architecture Report

**Document Version:** 1.0.0  
**Project:** FoodCue (Packaged Food Intelligence & Kitchen Management PWA)  
**Parent Specification:** FoodCue Master Specification v13.5 §12 & §19  
**Auditor:** Distributed Systems & Cloud Database Engineer  
**Status:** **PASSED & VERIFIED**

---

## 1. Synchronization Architecture Overview

FoodCue implements an offline-tolerant, bidirectional delta-synchronization architecture designed to balance local-first consumer responsiveness with cloud backup and multi-device collaboration:
- **Client Persistence:** IndexedDB v3 object store `syncQueue` holds mutations in FIFO order with monotonic timestamps.
- **Server Persistence:** Neon Serverless PostgreSQL with dual pooling (`sync_operations`, `sync_devices`, `foodcue_pantry_events`, `foodcue_confirmed_labels`, `foodcue_shopping_list`).
- **Conflict Resolution:** Deterministic domain-specific conflict resolution rules (append-only ledger sequence, shopping list Last-Write-Wins with tombstones, avoid-list union).

---

## 2. Multi-Device Scenarios & Verification Evidence

| Multi-Device Scenario | Expected Behaviour | Actual Verified Behaviour | Status |
|---|---|---|---|
| **Device A creates record offline** | Mutation enqueued in `localChangeQueue` | Enqueued with `status = 'pending'`; persists across reloads | **VERIFIED** |
| **Device A reconnects** | Batch pushed to `/api/sync/push` | Operations acknowledged and cleared from queue | **VERIFIED** |
| **Device B syncs** | Incremental pull from `/api/sync/pull?cursor=...` | Receives delta operations since last cursor | **VERIFIED** |
| **Concurrent edits to different items** | Both changes preserved independently | Changes stored under distinct item IDs with no data loss | **VERIFIED** |
| **Concurrent edits to same shopping item** | Newer timestamp wins (Last-Write-Wins) | Conflict resolver applies newer `updatedAt` value | **VERIFIED** |
| **Deletion on Device A vs. edit on Device B** | Deletion tombstone evaluated by timestamp | Newer change takes precedence; deletion tombstone tracked | **VERIFIED** |
| **Device Revocation** | Revoked device blocked from future sync | Server returns HTTP 403 `DEVICE_REVOKED`; local offline mode continues | **VERIFIED** |
| **Sync Paused by User** | Local functionality continues without interruption | `cloudSyncEnabled = false`; zero network transmissions | **VERIFIED** |

---

## 3. Persistent Queue & Recovery Characteristics

- **Queue Schema:** `id`, `entityType`, `entityId`, `operationType`, `payload`, `clientTimestamp`, `idempotencyKey`, `status`, `retryCount`, `createdAt`.
- **FIFO Guarantee:** Monotonic timestamps (`getMonotonicIso()`) guarantee strict order of queue processing.
- **Backoff & Retries:** Failed pushes increment `retryCount` with exponential backoff and automatically re-attempt on `window.online` or 60s periodic heartbeat.
