# FoodCue Phase 2 Formal Scope Change Record
## Authorized Cloud Synchronization, Multi-Device Architecture & Account Services

```text
========================================================================================
PROJECT:                FoodCue (Know your food. Manage your kitchen.)
CHANGE RECORD ID:       FC-CR-2026-PHASE2-EXT-01
CONTROLLING SPEC:       FoodCue Master Specification v13.5 §1.4, §12, §14 & §15
APPROVAL STATUS:        Explicitly Authorized Phase 2 Cloud Sync Extension
EFFECTIVE DATE:         November 17, 2026
ARCHITECT:              Parth Ahuja (Lead Architect & Full-Stack Engineer)
========================================================================================
```

---

## 1. Authorization Context

FoodCue was designed and deployed as a local-first consumer progressive web application operating entirely on client-side browser storage (IndexedDB). Master Specification v13.4 §1.4 specified that multi-device synchronization, household family sharing, and user account management were Phase 2 capabilities requiring an explicitly authorized scope extension, data protection review, and separate release gate.

This document establishes the formal change control authorization for **Step 6: Cloud Synchronisation, Multi-Device Integration, Local-to-Cloud Migration, and Consumer Redesign**.

---

## 2. Scope Boundaries

| Capability | Phase 1 (Local Baseline) | Phase 2 Extension (Step 6) | Boundary Enforcement |
|---|---|---|---|
| **Pantry Management** | Browser-local IndexedDB | Local-first + Cloud delta sync | Offline-first; writes append to local ledger first |
| **Authentication** | Anonymous guest | Optional Clerk (Email, User, Google, Apple) | Strict Decoupling: Signing in does NOT enable sync |
| **Cloud Persistence** | None (100% offline) | Neon Serverless PostgreSQL Lakebase | Isolated multi-tenant schema with `clerk_user_id` |
| **Sync Engine** | Not applicable | Incremental, bidirectional delta sync | Queue-backed (`syncQueue`), idempotent, retry backoff |
| **Migration** | Not applicable | 7-Step Interactive Migration Wizard | Requires explicit, recorded user consent |
| **Devices** | Single browser instance | Multi-device with revocation controls | Heartbeats, device list, and revocation endpoints |
| **Photo Storage** | Local IndexedDB only | **STRICTLY LOCAL ONLY** | Camera and gallery photos are never uploaded |

---

## 3. Data-Protection Justification (DPDP Act & GDPR Compliance)

In accordance with India's Digital Personal Data Protection (DPDP) Act 2023 and the General Data Protection Regulation (GDPR):
1. **Data Minimization:** Only structured text metadata required for inventory reconciliation is transmitted to the cloud (pantry events, confirmed label GTIN/attributes, shopping items, avoid-list tokens). Camera frames and raw photos remain strictly local.
2. **Purpose Limitation:** Cloud persistence is utilized strictly for multi-device synchronization and household sharing. Data is never tracked, profiled, or sold.
3. **Decoupled Consent:** Account authentication and cloud synchronization are strictly decoupled. A user may sign in (Mode B) without enabling cloud sync.
4. **Right to Erasure (Article 17):** Users can purge all cloud records via `/api/sync/deleteCloudData` while keeping their local device records intact.
5. **No Vendor Lock-in:** Full offline JSON data export is available at all times.

---

## 4. User Modes

```
+---------------------------------------------------------------------------------+
| Mode A: Local-Only Guest                                                        |
| - No Clerk account. 100% local IndexedDB. 0 network calls. Complete privacy.   |
+---------------------------------------------------------------------------------+
                                       | (User signs in)
                                       v
+---------------------------------------------------------------------------------+
| Mode B: Signed-In User (Sync Disabled)                                          |
| - Authenticated identity via Clerk. Cloud sync is explicitly OFF.               |
| - Zero pantry, label, or shopping data is uploaded. Stored on this device.     |
+---------------------------------------------------------------------------------+
                                       | (User completes 7-Step Migration Wizard)
                                       v
+---------------------------------------------------------------------------------+
| Mode C: Signed-In User (Sync Enabled)                                           |
| - Explicit consent recorded (timestamp, device ID, user ID).                    |
| - Incremental delta sync active via localChangeQueue and Neon Lakebase.         |
| - Reversible: User can disable sync at any time and return to Mode B.           |
+---------------------------------------------------------------------------------+
```

---

## 5. Fallback Guarantees

1. **Offline Continuity:** When internet access is disconnected or unmetered, FoodCue operates with zero interruption. Mutations are enqueued in `syncQueue` and automatically flush upon network restoration.
2. **Server Outage Resilience:** If Neon or Vercel experiences degraded performance, the client falls back to local IndexedDB with informative consumer status ("You're offline. Your changes are saved here.").
3. **Session Revocation Safety:** Revoking a device blocks future cloud syncs without wiping offline local records on that physical device.

---

## 6. Approval & Authorization Sign-off

- **Lead Architect:** Parth Ahuja
- **Architecture Role:** Principal Full-Stack & Systems Engineer
- **Status:** **APPROVED & IMPLEMENTED** (Step 6 Phase 2 Authorized Release)
