# FoodCue Step 6 Initial Implementation Audit
## Cloud Synchronisation, Multi-Device Architecture, Local-to-Cloud Migration, Backend Integration & Frontend Redesign

```text
========================================================================================
PROJECT:                FoodCue (Know your food. Manage your kitchen.)
PHASE:                  Step 6 — Cloud Sync and Multi-Device Integration
CONTROLLING SPEC:       FoodCue Master Specification v13.5 §12, §14 & Security Requirements v1.0
DATE OF AUDIT:          November 17, 2026
STATUS:                 Approved Baseline Initial Audit Complete
========================================================================================
```

---

## 1. Executive Summary

This initial audit establishes the technical baseline for **Step 6: Cloud Synchronisation, Multi-Device Integration, Local-to-Cloud Migration, and Frontend Redesign**.

FoodCue was designed as a local-first consumer application storing user data in browser-native IndexedDB. Steps 3, 4, and 5 successfully provisioned:
1. Cloud persistence foundation in **Neon PostgreSQL Lakebase** (15 relational tables).
2. Identity and session management with **Clerk Authentication**.
3. Cryptographically verified Svix webhook ingestion at `/api/webhooks/clerk` with idempotency ledger and constraint-safe user synchronization (verified live in Neon).
4. Edge hosting deployment on **Vercel** with Node.js 26 runtime.

Step 6 expands this foundation into a market-ready, hybrid local-plus-cloud consumer experience where:
- Local IndexedDB remains the primary offline-capable working database.
- Cloud synchronisation is **explicit, optional, and reversible** (independent of signing in).
- A persistent sync queue, bidirectional incremental delta sync engine, conflict reconciliation, multi-device management, and interactive migration wizard ensure data integrity.
- Technical infrastructure indicators are completely eliminated from the consumer UI in favor of clean, reassuring status states.

---

## 2. Existing Architecture & System State

### 2.1 Technology Stack Baseline
| Layer | Technology | Status in Repo |
|---|---|---|
| Frontend Framework | React 18.3.1 + TypeScript 5.7.3 | Production Active |
| Build Tool | Vite 6.0.7 (Modular manualChunks configured) | Production Active |
| Local Persistence | Browser IndexedDB (v3: `foodcue-local`, 8 stores) | Active |
| Cloud Database | Neon PostgreSQL Lakebase (Pooled & Direct endpoints) | Active & Connected |
| Identity & Auth | Clerk React SDK (`@clerk/react` 6.18.8) + Backend (`@clerk/backend` 3.29.0) | Active & Configured |
| Webhook Pipeline | Svix HMAC-SHA256 signature verification (`crypto.timingSafeEqual`) | Active & Live Tested |
| Hosting & Edge API | Vercel Serverless Functions (`/api/*`, Node.js 26.x) | Active (`https://food-cue.vercel.app`) |
| Styling System | Custom CSS Design System (`#075A35` Primary Green, WCAG 2.2 AA) | Active |

### 2.2 Core Component Architecture
```text
                     FOODCUE CONSUMER APPLICATION
                                  │
                          React + TypeScript PWA
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
         Local-First Domain               Clerk Identity Layer
        (SmartScan, Kitchen,             (Sign-In, Sign-Up, Google,
         Reminders, Shopping)             Apple, Households)
                 │                                 │
                 ▼                                 │
          Local IndexedDB                          ▼
         (foodcue-local v3)               Clerk Session Token
                 │                                 │
                 ▼                                 │
        Persistent Sync Queue                      │
       (Ordered mutations)                         │
                 │                                 │
                 ▼                                 │
          Sync Coordinator                         │
      (Incremental push/pull)                      │
                 │                                 │
                 └────────────────┬────────────────┘
                                  ▼
                     Authenticated API Transport
                   (Authorization: Bearer <JWT>)
                                  │
                                  ▼
                      FoodCue Backend on Vercel
                     (/api/sync/push, pull, me)
                                  │
                                  ▼
                   Clerk Session Verification &
                 Horizontal Multi-Tenant Isolation
                                  │
                                  ▼
                         Neon Cloud Lakebase
                     (15 Tables, Ledger Revisions)
```

---

## 3. Detailed Inventory of Existing Assets

### 3.1 Database Tables in Neon PostgreSQL (`public` schema)
A live audit of the Neon Lakebase database confirmed all 15 operational tables exist:
1. `foodcue_users`: Core user identity, mapped to `clerk_user_id` with not-null `user_id`.
2. `foodcue_profiles`: Dietary preferences, allergens, calm mode flag.
3. `foodcue_households`: Shared household/organization metadata.
4. `foodcue_catalog`: Verified Indian packaged food products (FSSAI aligned).
5. `foodcue_confirmed_labels`: Verified physical package labels with ingredients, allergens, and dates.
6. `foodcue_pantry_items`: Aggregated pantry balance cache per user/household.
7. `foodcue_pantry_events`: Append-only immutable pantry event ledger.
8. `foodcue_reminders`: Expiry, best-before, and review reminders.
9. `foodcue_shopping_list`: Planned shopping items and completion status.
10. `foodcue_intelligence_rules`: Deterministic food safety and evaluation rules.
11. `foodcue_audit_log`: Audit trail of cloud data modifications.
12. `foodcue_webhook_events`: Idempotency ledger for Clerk webhooks (`processed`, `failed`, `received`).
13. `foodcue_schema_migrations`: Version-controlled DDL migration tracking.
14. `sync_devices`: Registered client devices, display names, and revocation status.
15. `sync_operations`: Server-side audit log of ingested sync operations and client cursors.

### 3.2 IndexedDB Object Stores (`foodcue-local` v3)
1. `candidates`: Temporary unscanned barcode candidates.
2. `confirmedLabels`: User-confirmed physical packaging labels.
3. `analysisResults`: Deterministic food intelligence assessments.
4. `pantryEvents`: Local append-only ledger of item additions, consumption, disposals.
5. `settings`: Local application preferences (display, notification settings).
6. `metadata`: Key-value configuration storage.
7. `syncQueue`: Persistent queue of outgoing mutations awaiting upload.
8. `syncState`: Client sync cursor, device ID, cloud consent flag, and status.

### 3.3 Serverless API Endpoints (`/api/*`)
| Route | Method | Purpose | Current Runtime State |
|---|---|---|---|
| `/api/health` | GET | Health check confirming app and Neon DB connectivity | Operational (HTTP 200 OK) |
| `/api/webhooks/clerk` | POST | Ingests Clerk `user.created`, `updated`, `deleted` | Operational & Live Tested (HTTP 200 OK) |
| `/api/me` | GET, PATCH | User profile retrieval and update for authenticated session | Requires standalone bundling for Node ESM |
| `/api/devices` | GET, DELETE | Lists user devices; revokes device sync access | Requires standalone bundling for Node ESM |
| `/api/sync/push` | POST | Accepts queued mutation batches from clients | Requires standalone bundling for Node ESM |
| `/api/sync/pull` | GET | Returns incremental cloud deltas after client cursor | Requires standalone bundling for Node ESM |
| `/api/sync/migrate` | POST | Batch local-to-cloud onboarding migration | Requires standalone bundling for Node ESM |

---

## 4. Current Gaps, Deficiencies & Incomplete Integrations

### 4.1 Serverless Runtime Bundling Gaps
- **Observation:** `api/health.ts` and `api/webhooks/clerk.ts` were made self-contained and run flawlessly on Vercel Node 26.
- **Deficiency:** `api/me.ts`, `api/devices/index.ts`, `api/sync/push.ts`, `api/sync/pull.ts`, and `api/sync/migrate.ts` currently import from `../../src/server/...` without an automated bundler, causing Vercel's Node ESM runtime to fail with `ERR_MODULE_NOT_FOUND`.
- **Required Fix:** Implement automated esbuild compilation for all `/api/**/*.ts` endpoints during `npm run build` so that every endpoint deploys as a standalone, zero-dependency Node ESM module.

### 4.2 Consent Separation & User Mode Integrity
- **Observation:** Clerk sign-in works, but users must never have their IndexedDB data uploaded automatically upon sign-in.
- **Deficiency:** Sync status and coordinator need explicit, hardened state checks ensuring:
  1. Mode A: Local-Only (signed out, sync disabled).
  2. Mode B: Signed In, Sync Disabled (account active, no sync).
  3. Mode C: Signed In, Sync Enabled (consent recorded, sync active).
- **Required Fix:** Enforce `cloudSyncEnabled` boolean flag in `syncMetadata` and IndexedDB `syncState`. Block any automatic push/pull if `cloudSyncEnabled === false`.

### 4.3 Frontend Cloud UX & Developer UI Elimination
- **Observation:** Navigation and settings currently have some legacy technical text like "Local", "IndexedDB", and raw database status badges.
- **Deficiency:** Needs replacement with professional, consumer-grade status labels:
  - "Stored on this device"
  - "Cloud sync is off"
  - "Changes waiting to sync"
  - "Syncing your kitchen"
  - "Your kitchen is up to date"
  - "Sync needs attention"
- **Required Fix:** Overhaul `Navbar.tsx`, `ProfileView.tsx`, and `Privacy.tsx` to introduce the dedicated `Profile → Privacy & Cloud` and `Connected Devices` pages.

### 4.4 Local-to-Cloud Migration Experience
- **Observation:** `MigrationWizard.tsx` exists as a prototype modal.
- **Deficiency:** Needs full multi-step consumer wizard:
  1. Intro: "Keep your kitchen in sync"
  2. Data explanation: exact categories synced vs local
  3. Consent: explicit agreement capturing timestamp & device ID
  4. Preview: live counts of pantry items, events, shopping lists, and labels from IndexedDB
  5. Confirmation: explicit launch action
  6. Progress: live batch upload progress indicator
  7. Verification & Summary: records uploaded, skipped, and verified in Neon.

### 4.5 Multi-Device Bidirectional Reconciliation & Conflict Handling
- **Observation:** `conflictResolver.ts` exists for simple pantry and label merges.
- **Deficiency:** Need formal append-only event ledger reconciliation across devices:
  - Pantry events: append-only with stable UUIDs, balance recalculated from ledger projection.
  - Shopping items: per-item status merge.
  - Confirmed labels: revision/provenance preservation.
  - Devices: revocation enforcement where revoked device tokens receive HTTP 403 `DEVICE_REVOKED`.

---

## 5. Security & Multi-Tenant Isolation Audit

1. **Authentication Enforcement:**
   - Every cloud endpoint (`/api/me`, `/api/devices`, `/api/sync/*`) validates the incoming Clerk session Bearer token server-side via `@clerk/backend` `verifyToken()`.
   - Browser-supplied `userId` parameters are strictly rejected as identity proof.
2. **Horizontal User Isolation:**
   - Database queries in Neon explicitly parameterize `WHERE clerk_user_id = $1` or `WHERE user_id = $1`.
   - Automated tests in `test/server/api/isolation.test.ts` verify that User A cannot read, mutate, or delete User B's records.
3. **Replay & Idempotency Protection:**
   - Every sync operation includes a unique `idempotency_key`. The `sync_operations` table enforces `UNIQUE(clerk_user_id, idempotency_key)`, preventing duplicate insertions on retries.
4. **Credential Protection:**
   - No database URLs or Clerk secret keys are exposed to the client bundle. Only `VITE_CLERK_PUBLISHABLE_KEY` is present in the frontend.

---

## 6. Implementation Plan for Step 6

| Stage | Activity | Key Deliverables |
|---|---|---|
| **Stage 1: Audit** | Audit complete codebase & specifications | `docs/STEP_6_INITIAL_AUDIT.md` (this file) |
| **Stage 2: API Bundler** | Automated esbuild compilation for `/api` serverless functions | `scripts/bundle-api.mjs`, standalone endpoints |
| **Stage 3: Sync Engine** | Hardened persistent queue, incremental cursors & delta pull | `src/sync/queue/localChangeQueue.ts`, `syncCoordinator.ts` |
| **Stage 4: Migration Wizard**| 7-step consumer migration flow with real IndexedDB counts | `src/features/sync/MigrationWizard.tsx` |
| **Stage 5: Conflict Resolution**| Ledger projection & domain-specific merge strategies | `src/sync/reconciliation/conflictResolver.ts`, docs |
| **Stage 6: Multi-Device** | Device registration, listing, and revocation enforcement | `api/devices/index.ts`, `syncRepository.ts` |
| **Stage 7: Frontend Redesign** | Consumer UI, `Privacy & Cloud` page, `Connected Devices` | `Privacy.tsx`, `ProfileView.tsx`, `Navbar.tsx` |
| **Stage 8: Testing & QA** | End-to-end multi-device, offline, and migration tests | All 115+ tests pass, coverage report |
| **Stage 9: Documentation** | All 15 required specification documents & final ZIP | Complete docs suite, `FoodCue_Step_6_Cloud_Sync_Multi_Device_v1_0.zip` |
