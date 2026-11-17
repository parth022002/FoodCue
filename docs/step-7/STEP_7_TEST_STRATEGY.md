# FoodCue Step 7 Test Strategy & Verification Master Plan

**Document Version:** 1.0.0  
**Project:** FoodCue (Packaged Food Intelligence & Kitchen Management PWA)  
**Parent Specification:** FoodCue Master Specification v13.5  
**Execution Lead:** Senior QA Automation Engineer & Security Engineer  
**Status:** **ACTIVE EXECUTION BASELINE**

---

## 1. Objectives and Scope

The objective of Step 7 testing is to provide rigorous, evidence-based verification across all functional, security, accessibility, performance, and cross-device synchronization boundaries of FoodCue.

Testing spans 8 distinct layers:
1. **Domain & Rules Layer (Unit Tests):** Deterministic food intelligence, allergen rules, INS additives, GS1 parsing, GTIN mod-10 check digits, QR security classification.
2. **Local Storage Layer (Integration Tests):** IndexedDB v3 transactions, append-only event ledger, compensating undo, storage quota estimation, backup package export/import.
3. **Synchronization & Conflict Layer (Integration Tests):** `localChangeQueue`, delta push/pull, Last-Write-Wins (LWW) with tombstones, safety-first avoid list merging.
4. **Serverless API & Backend Layer (API Tests):** Token validation, tenant isolation, Svix cryptographic signature verification, error handling, rate limiting.
5. **Database & Lakebase Layer (Database Tests):** PostgreSQL constraints, unique keys, soft deletion, zero cross-user leakage.
6. **End-to-End User Journeys (E2E Tests):** Complete user flows from anonymous local scanning to cloud migration, multi-device sync, and account deletion.
7. **Security & Privacy Abuse Layer:** Injection prevention, QR preview safety, Svix replay window tolerance, cross-user horizontal privilege escalation tests.
8. **Accessibility & Responsive Layer:** WCAG 2.2 AA compliance, keyboard navigation, dialog focus trapping, color contrast.

---

## 2. Test Layer Architecture & Matrix

| Layer | Target Components | Tools & Framework | Success Criteria |
|---|---|---|---|
| **L1: Domain Rules** | `foodIntelligenceEngine.ts`, `gs1Parser.ts`, `gtin.ts`, `payloadClassifier.ts` | Vitest | 100% deterministic assertion pass; 0 hallucinations. |
| **L2: Local Storage** | `database.ts`, `pantryLedger.ts`, `shoppingStorage.ts` | Vitest, `fake-indexeddb` | Full transaction rollbacks on failure; non-destructive backups. |
| **L3: Sync Engine** | `localChangeQueue.ts`, `syncCoordinator.ts`, `conflictResolver.ts` | Vitest, mock fetch | Offline mutations survive browser restart; zero lost updates. |
| **L4: API & Auth** | `api/webhooks/clerk.ts`, `src/server/endpoints/*.ts` | Vitest, Node Request | Constant-time HMAC matching; unauthenticated calls rejected with 401. |
| **L5: Database** | Neon PostgreSQL 15 tables, `user.repository.ts`, `sync.repository.ts` | Vitest, `@neondatabase/serverless` | Zero cross-user data leakage; all foreign keys enforced. |
| **L6: User Journeys** | Journeys A through F (`SmartScan`, `Kitchen`, `Privacy`, `MigrationWizard`) | Vitest, `@testing-library/react` | Complete user journeys pass without unhandled exceptions. |
| **L7: Security** | CSP headers, QR previews, Svix signature tampering | Vitest, custom scripts | Invalid signatures rejected; 0 client secrets in frontend. |
| **L8: Accessibility** | Modal dialogs, form inputs, status announcements | Vitest, DOM inspection | WCAG 2.2 AA standards met; dialogs trap focus and support Escape. |

---

## 3. Mandatory End-to-End User Journeys (Section 11.1)

### Journey A: Local-First User (Zero Cloud Dependency)
1. Launch FoodCue in local-only mode (unauthenticated).
2. Open SmartScan; simulate camera barcode detection (GTIN-13: `8901030383709`).
3. View product candidate and review guided capture checklist.
4. Confirm physical pack label (`ConfirmedLabel`).
5. Review deterministic food intelligence (Allergens: Wheat, Milk; INS: 500, 503).
6. Add product to pantry ("Kitchen") with location `Pantry` and Best-Before date (+90 days).
7. Create a planning reminder for the item (+88 days).
8. Add missing grocery items to the persistent Shopping List.
9. Close and reload browser session (simulate browser restart).
10. **Assertion:** Verify all pantry events, confirmed labels, reminders, and shopping list items persist in IndexedDB.

### Journey B: Account Creation & Explicit Cloud Activation
1. User operates with pre-existing local IndexedDB records.
2. User authenticates via Clerk (Email / OAuth).
3. **Assertion:** Cloud sync remains strictly `OFF` (`cloudSyncEnabled: false`). No data is sent to the server.
4. User opens `Privacy & Cloud` and initiates "Migrate to Cloud".
5. User reviews 7-step migration preview (records count, data scope, consent checkboxes).
6. User explicitly clicks "Start Cloud Migration".
7. System uploads local records in batches to `/api/sync/migrate`.
8. System updates local state: `cloudSyncEnabled = true`.
9. **Assertion:** Cloud database contains identical records; local IndexedDB remains fully intact as a local backup.
10. User opens session on second device; triggers `/api/sync/pull`.
11. **Assertion:** Second device pulls and renders all synced pantry items.

### Journey C: Offline Resilience & Automatic Recovery
1. User is signed in with cloud sync enabled.
2. Network connection is severed (`navigator.onLine = false`).
3. Status changes to "Offline — Local mode active".
4. User consumes a pantry item and adds 2 shopping list entries.
5. Mutations are queued in `localChangeQueue` (`syncQueue` store in IndexedDB).
6. User reloads page while offline.
7. **Assertion:** Queue items remain intact; pending count shows `3`.
8. Network connection is restored (`window.dispatchEvent(new Event('online'))`).
9. `syncCoordinator` triggers automatic sync.
10. **Assertion:** All 3 queued mutations are pushed to `/api/sync/push`; pending count resets to `0`; status updates to "Your kitchen is up to date".

### Journey D: Multi-Device Concurrent Conflict Resolution
1. Device 1 and Device 2 share the same cloud account.
2. Device 1 updates quantity of "Atta Flour" from `1` to `2` while offline.
3. Device 2 marks "Atta Flour" as `Consumed` (quantity `0`) while offline.
4. Device 1 reconnects and pushes its event.
5. Device 2 reconnects and pushes its event.
6. **Assertion:** Deterministic conflict resolution applies append-only event ordering; the final state reflects the latest chronological compensating event without history corruption.
7. Shopping list item edited on Device 1 and marked purchased on Device 2:
8. **Assertion:** Last-Write-Wins with deletion tombstones merges both changes cleanly.

### Journey E: Complete Privacy, Erasure & Account Deletion
1. Authenticated user with cloud data opens Privacy & Cloud.
2. User requests "Delete Cloud Data".
3. System shows high-consequence confirmation modal.
4. User confirms deletion.
5. Frontend calls `POST /api/sync/deleteCloudData`.
6. Cloud database purges all pantry items, events, shopping lists, and devices.
7. User signs out or deletes account in Clerk.
8. Clerk sends `user.deleted` webhook to `/api/webhooks/clerk`.
9. Server marks user `deleted_at = CURRENT_TIMESTAMP`.
10. **Assertion:** Subsequent API calls reject with 401/403; local device retains local-first data unless user separately selects "Clear Local Storage".

### Journey F: SmartScan Uncertainty & Evidence Integrity
1. Camera or image upload detects an ambiguous or damaged barcode.
2. Multiple candidates returned or partial OCR text extracted.
3. Candidate card flags uncertainty rating.
4. **Assertion:** Unconfirmed candidate cannot be analyzed by Food Intelligence Engine or added to Kitchen without physical pack confirmation.
5. User completes multi-panel physical check and confirms label.
6. `ConfirmedLabel` is issued with explicit observation provenance.

---

## 4. Test ID Naming Convention

- `UT-xxx`: Unit Test (Domain, Rules, Utilities)
- `IT-xxx`: Integration Test (IndexedDB, Queue, Sync)
- `API-xxx`: Serverless API & Webhook Test
- `SEC-xxx`: Security, Privacy & Replay Test
- `E2E-xxx`: End-to-End User Journey Test
- `A11Y-xxx`: Accessibility & WCAG 2.2 AA Test
- `PERF-xxx`: Performance & Resource Benchmark
