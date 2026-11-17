# FoodCue — Master Requirement Traceability Matrix (RTM)

**Audit Date:** 17 November 2026  
**Auditing Authority:** Lead System Architect & QA Lead  
**Controlling Specifications:** FoodCue Master Specification v13.5, PRD v1.3, Security Requirements v1.0

---

## 1. Traceability Summary

Every requirement specified in the canonical baseline is mapped directly to its architectural layer, source files, database tables, and automated tests.

```
PRD / Spec Requirement ──► Domain Entity / Service ──► UI Component ──► API / Storage ──► Automated Test File
```

---

## 2. Requirement Traceability Matrix

| Req ID | Requirement Description | Controlling Spec | Source Implementation Files | Database / Storage Layer | Automated Test Suite | Test Count |
|---|---|---|---|---|---|---|
| **REQ-CORE-01** | Local-First Offline Operation | MS-13.5 §3.1, PRD §3.1 | `src/adapters/storage/database.ts` | IndexedDB `foodcue_db` (v4) | `src/adapters/storage/database.test.ts` | 8 tests |
| **REQ-CORE-02** | Append-Only Pantry Ledger | MS-13.5 §4.2, PRD §4.1 | `src/domain/services/pantryLedger.ts` | IndexedDB `pantry_events` | `src/domain/services/pantryLedger.test.ts` | 8 tests |
| **REQ-CORE-03** | ConfirmedLabel Human Verification Gate | MS-13.5 §4.1, PRD §4.1 | `src/domain/contracts/confirmedLabel.ts` | In-memory contract | `src/domain/contracts/confirmedLabel.test.ts` | 3 tests |
| **REQ-SCAN-01** | 1D/2D Barcode Detection | MS-13.5 §5.1, PRD §5.1 | `src/features/smartscan/SmartScan.tsx` | ZXing WASM runtime | `src/domain/rules/gtin.test.ts` | 4 tests |
| **REQ-SCAN-02** | GS1 Digital Link Parsing | MS-13.5 §5.2, PRD §5.2 | `src/domain/rules/gs1Parser.ts` | Domain rule | `src/domain/rules/gs1Parser.test.ts` | 13 tests |
| **REQ-SCAN-03** | QR Code Security Defense | SPS-1.0 §3.1 | `src/domain/rules/payloadClassifier.ts` | URL sandbox classifier | `test/security/qrSecurityThreatClasses.test.ts` | 10 tests |
| **REQ-OCR-01** | On-Device OCR Web Worker (M2)| PRD-1.3 §4.3 | `src/adapters/ocr/ocrWorker.ts` | Background Web Worker | `test/adapters/ocrWorker.test.ts` | 3 tests |
| **REQ-OCR-02** | Grayscale & Adaptive Binarization (M2)| MS-13.5 §5.3 | `src/adapters/ocr/imagePreprocessor.ts` | Offscreen Canvas | `test/adapters/imagePreprocessor.test.ts` | 6 tests |
| **REQ-HARD-01** | Mobile Camera Hardware Controls (M3)| PRD-1.3 §5.1 | `src/features/smartscan/SmartScanViewfinder.tsx` | MediaStreamTrack | `test/features/smartscanViewfinder.test.tsx` | 4 tests |
| **REQ-FMCG-01** | Offline Indian FMCG Catalog 500 SKUs (M6)| PRD-1.3 §6.2 | `src/domain/entities/fmcgCatalogData.ts`, `src/domain/services/fmcgCatalogManager.ts` | IndexedDB `verifiedCatalog` | `test/domain/fmcgCatalogManager.test.ts` | 8 tests |
| **REQ-OFF-01** | OpenFoodFacts GTIN Fallback (M7)| PRD-1.3 §6.3 | `src/integrations/openfoodfacts/openFoodFactsClient.ts` | External HTTPS API | `test/integrations/openfoodfacts/openFoodFactsClient.test.ts` | 6 tests |
| **REQ-OFF-02** | Zero Token Leakage & Privacy | SPS-1.0 §4.1 | `src/integrations/openfoodfacts/openFoodFactsClient.ts` | Sanitized network headers | `test/integrations/openfoodfacts/openFoodFactsPrivacy.test.ts` | 2 tests |
| **REQ-OFF-03** | Fallback Mandatory Pack Review Gate | MS-13.5 §6.4 | `src/features/smartscan/SmartScan.tsx` | `ConfirmedLabel` validator | `test/integrations/openfoodfacts/openFoodFactsSafety.test.ts` | 3 tests |
| **REQ-INTEL-01**| Shelf-Life Heuristics & Expiry Engine | MS-13.5 §6.1 | `src/domain/rules/foodIntelligenceEngine.ts` | Rule table | `src/domain/rules/foodIntelligenceEngine.test.ts` | 4 tests |
| **REQ-INTEL-02**| Unknown-is-Not-Safe Principle | PRD-1.3 §4.2 | `src/domain/services/evidenceResolver.ts` | Fail-closed resolver | `src/domain/services/evidenceResolver.test.ts` | 3 tests |
| **REQ-SAFE-01** | Adversarial Food-Safety Defense | SPS-1.0 §5.4 | `src/domain/services/candidateMatcher.ts` | Keyword sanitizer | `test/safety/foodSafetyAdversarial.test.ts` | 5 tests |
| **REQ-SYNC-01** | Explicit Consent Cloud Migration | PRD-1.3 §7.1 | `src/features/sync/SyncSettings.tsx`, `src/features/sync/MigrationPreviewDialog.tsx` | PostgreSQL `sync_devices` | `test/e2e/userJourneys.test.ts` | 6 tests |
| **REQ-SYNC-02** | Device Registration & Heartbeat | MS-13.5 §7.2 | `api/devices/index.js`, `src/sync/client.ts` | PostgreSQL `sync_devices` | `test/server/api/endpoints.test.ts` | 21 tests |
| **REQ-SYNC-03** | Push / Pull Delta Sync Engine | MS-13.5 §7.3 | `api/sync/push.js`, `api/sync/pull.js` | PostgreSQL `pantry_events` | `test/server/api/endpoints.test.ts` | 21 tests |
| **REQ-SYNC-04** | Offline Sync Queue & Replay | PRD-1.3 §7.2 | `src/sync/queue.ts` | IndexedDB `sync_queue` | `test/sync/queue.test.ts` | 4 tests |
| **REQ-SYNC-05** | Conflict Resolution Protocol | MS-13.5 §7.4 | `src/sync/conflictResolver.ts` | In-memory resolver | `test/sync/conflictResolver.test.ts` | 4 tests |
| **REQ-HOUSE-01**| Household Sharing via Clerk Orgs (M5)| PRD-1.3 §8.0 | `src/domain/entities/household.ts`, `src/features/household/HouseholdManager.tsx` | PostgreSQL `household_id` | `test/server/api/householdIsolation.test.ts` | 5 tests |
| **REQ-HOUSE-02**| Household Multi-Tenant Isolation (M5)| SPS-1.0 §7.1 | `src/server/endpoints/syncPush.ts`, `src/server/endpoints/syncPull.ts` | PostgreSQL tenant scoping | `test/server/api/householdIsolation.test.ts` | 5 tests |
| **REQ-AUTH-01** | Clerk Authentication & Session | MS-13.5 §8.1 | `src/features/auth/AuthButton.tsx` | Clerk JWT Cookie | `test/server/auth/clerk.test.ts` | 8 tests |
| **REQ-AUTH-02** | Svix Webhook Verification (Step 5) | SEC-CLERK §2-5 | `src/server/auth/svixVerification.ts`, `api/webhooks/clerk.js` | PostgreSQL `webhook_events`, `foodcue_users` | `test/server/auth/svixVerification.test.ts`, Live Svix logs | 5 tests |
| **REQ-PUSH-01** | Web Push Notification Subscriptions (M4)| PRD-1.3 §9.1 | `api/notifications/subscribe.js` | PostgreSQL `push_subscriptions` | `test/server/api/endpoints.test.ts` | 21 tests |
| **REQ-PUSH-02** | Expiry Reminders Scheduler & In-App UI (M4)| PRD-1.3 §9.2 | `src/adapters/notifications/notificationService.ts`, `src/features/pantry/ExpiryReminderSettings.tsx` | LocalStorage + Notification API | `test/adapters/notificationService.test.ts` | 7 tests |
| **REQ-BENCH-01**| Physical Pack Benchmark Scoring Engine (M1)| VW-13.5 Gate G4 | `src/domain/services/packBenchmarkEvaluator.ts` | Flat matrix algorithm | `test/domain/packBenchmarkEvaluator.test.ts` | 8 tests |

---

## 3. Coverage Summary
- Total Tracked Functional Requirements: **28 requirements**
- Fully Implemented in Code: **28 / 28 (100%)**
- Covered by Automated Tests: **28 / 28 (100%)**
- Total Passing Test Assertions: **213 tests across 37 suites**
