# FoodCue Step 7 Initial Repository & Architecture Audit

**Project:** FoodCue (Packaged Food Intelligence & Kitchen Management PWA)  
**Document Version:** 1.0.0  
**Audit Date:** November 17, 2026  
**Auditor:** FoodCue Senior Engineering Team (Full-Stack, Security, QA, Accessibility, DevOps)  
**Parent Specification:** FoodCue Master Specification v13.5 (Final Controlled Baseline)  
**Status:** **PHASE 1 COMPLETE — PRIORITISED DEFECT & REMEDIATION PLAN ESTABLISHED**

---

## 1. Executive Summary

In accordance with the **FoodCue Step 7 Master Implementation Prompt**, this document establishes the baseline technical audit of the entire existing repository across all 12 operational domains.

The audit confirms that the core architectural foundations established in Steps 1 through 6 are operational:
- **Local-first IndexedDB v3** engine operates seamlessly with zero cloud prerequisites.
- **Step 5 Clerk Webhook Integration** is verified live on Vercel and Neon PostgreSQL with Svix HMAC cryptographic signatures, status tracking, and deduplication.
- **Step 6 Cloud Synchronization & Multi-Device Integration** is fully deployed, featuring deterministic conflict resolution, persistent change queue, 7-step non-destructive migration wizard, and GDPR/DPDP data erasure.
- **Automated Regression Suite:** 126 of 126 automated unit, contract, and integration tests passing across 21 test suites.

This audit identifies key implementation gaps, edge cases, accessibility considerations, and performance tuning targets to be addressed systematically during Step 7 execution.

---

## 2. Comprehensive Area-by-Area Audit Matrix

| Area | Existing Implementation | Current Status | Identified Gaps | Priority |
|---|---|---|---|---|
| **Authentication** | `@clerk/react` in frontend (`App.tsx`, `Navbar.tsx`). Server-side JWT bearer validation via `getAuth()` and `verifyClerkToken` in `src/server/auth/clerk.ts`. Unauthenticated calls rejected with HTTP 401. | **Verified** | 1. Token expiration during long-running sessions lacks an explicit foreground toast notifying the user of re-authentication necessity before a push sync.<br>2. Re-authentication flow for sensitive cloud actions (e.g. cloud data deletion) should be enforced. | **P2** |
| **Webhooks** | Production handler in `api/webhooks/clerk.ts` with constant-time Svix HMAC verification, 300s replay window, and ledger deduplication in `foodcue_webhook_events`. | **Verified** | 1. Indefinite retention of raw webhook payloads in `foodcue_webhook_events.payload` (JSONB) creates potential privacy drift over time; needs a 30-day retention pruning policy.<br>2. Test fixtures in `foodcue_users` should be isolated from live metrics. | **P2** |
| **Cloud sync** | Bidirectional delta sync engine (`localChangeQueue.ts`, `syncCoordinator.ts`, `conflictResolver.ts`). API routes: `/api/sync/push`, `/api/sync/pull`, `/api/sync/status`, `/api/sync/migrate`, `/api/sync/deleteCloudData`. | **Verified** | 1. While unit tests verify conflict resolution algorithms, multi-device concurrent conflict resolution needs an end-to-end automated multi-client test harness.<br>2. Batch push payload size limits (e.g. max 50 items/batch) need strict server-side boundary validation. | **P1** |
| **Local storage** | IndexedDB v3 implemented via `idb` with 6 object stores (`candidates`, `confirmedLabels`, `pantryEvents`, `shoppingList`, `syncQueue`, `syncMetadata`). Quota estimation active. | **Verified** | 1. Private browsing mode in Safari (iOS) caps IDB quota at 50MB and can trigger unexpected `QuotaExceededError`; needs an explicit defensive notification.<br>2. Schema version upgrade safety check during future v4 migrations. | **P2** |
| **SmartScan** | ZXing-WASM (`@sec-ant/zxing-wasm`) with native `BarcodeDetector` enhancement, animated viewfinder reticle, canvas photo upload, GTIN mod-10 validator, and multi-panel capture checklist. | **Verified** | 1. Viewfinder lacks hardware torch / flashlight toggle control (`MediaTrackConstraints.torch`) for low-light kitchen scanning.<br>2. Camera tap-to-focus and pinch-to-zoom controls are missing for small barcodes.<br>3. Local Web Worker OCR spike benchmark requires 100-pack photo ground truth dataset (Gate G4). | **P1** |
| **Food intelligence** | `foodIntelligenceEngine.ts` with 6-state allergen classification (8 FSSAI mandatory allergens), INS additive parsing (7 primary additives), claim conflict detector, and India 112 emergency modal. | **Verified** | 1. INS additive registry only covers 7 additives; should be expanded to cover top 25 common Indian packaged food additives (emulsifiers, stabilizers, thickeners).<br>2. Ensure missing allergen/nutrition info is consistently flagged as *"Not detected in extracted text"* rather than inferred safe. | **P1** |
| **Pantry** | Append-only event ledger (`pantryLedger.ts`, `Kitchen.tsx`) with 6 event types, compensating undo, location filters, date semantics (expiry vs best-before), and Unpack Mode. | **Verified** | 1. Compensating undo action window is currently unbounded in UI; should clearly indicate recent actions.<br>2. Bulk date adjustment during Unpack Mode could benefit from auto-increment heuristics. | **P2** |
| **Reminders** | `Reminders.tsx` date-driven planning reminders with +2d snooze. In-app fallback alerts. | **Verified** | 1. Web Push API (`PushManager` in Service Worker) for background notification delivery when PWA is closed is currently not implemented (operates in-app only).<br>2. Permission-denied state in browser notification request needs clearer fallback explanation. | **P2** |
| **Shopping list** | Persistent IndexedDB adapter (`shoppingStorage.ts`), "Add Depleted Items" helper, category grouping, WhatsApp share formatting, and CSV export. | **Verified** | 1. Cross-device deletion tombstone synchronization edge cases when an item is deleted on Device A while marked purchased on Device B.<br>2. Unit/quantity parsing from text input needs strict normalization. | **P2** |
| **Security** | Zero client secrets, strict CSP headers in `public/_headers` and `vercel.json`, parameterised SQL queries (tagged template literals), QR security preview without auto-navigation. | **Verified** | 1. API routes lack explicit sliding-window in-memory or Redis-based rate limiting on serverless edge (currently reliant on Vercel defaults).<br>2. Deprecated package warning on `@sec-ant/zxing-wasm` (upstream moved to `zxing-wasm`). | **P1** |
| **Accessibility** | Semantic HTML, high-contrast palette (#075A35, #12231B, #64736B on #FFFFFF), keyboard navigation, responsive grid layouts. | **Partial** | 1. Dialog focus trapping and Escape key listeners are missing in modal dialogs (`MigrationWizard`, `ConnectedDevicesView` revocation modal).<br>2. Screen-reader live regions (`aria-live="polite"`) needed for dynamic scan and sync state announcements.<br>3. Full WCAG 2.2 AA audit with automated axe-core needed. | **P1** |
| **Deployment** | Vercel production build with Node 26 runtime, esbuild self-contained API bundles (`scripts/bundle-api.mjs`), 5-chunk vendor splitting, edge security headers. | **Verified** | 1. GitHub Actions workflow needs an automated CI check that executes `npm run typecheck`, `npm run lint`, and `npm test` on every pull request.<br>2. Vercel deployment preview smoke test script needed. | **P2** |

---

## 3. Prioritised Remediation Plan

Based on the audit findings, the Step 7 implementation and validation will execute according to the following priorities:

### Phase 2: Test Infrastructure & Test Strategy
- Create `docs/step-7/STEP_7_TEST_STRATEGY.md`.
- Establish automated E2E and multi-session integration test helpers simulating dual-device sync and conflict resolution.
- Add accessibility testing infrastructure (`axe-core` / `@testing-library` accessibility checks).

### Phase 3 & 4: Functional, Security & Sync Hardening (P1 Issues)
1. **Accessibility Compliance (WCAG 2.2 AA):**
   - Implement focus trapping and Escape key handling in all modal dialogs (`MigrationWizard.tsx`, `ConnectedDevicesView.tsx`, and SmartScan confirmation cards).
   - Add `aria-live="polite"` announcements for sync status changes and scan results.
2. **Camera Hardware Controls:**
   - Add torch/flashlight toggle button in `SmartScanViewfinder.tsx` with capability detection (`MediaTrackConstraints.torch`).
3. **Food Intelligence Additives Expansion:**
   - Expand INS additive database with 18 additional common Indian FMCG additives (INS 407, 412, 415, 471, 330, 211, 202, 102, 110, 122, 133, 150d, etc.).
   - Explicitly enforce *"Not detected in extracted text"* notice when ingredients or allergens are incomplete.
4. **API Safety & Rate Limiting Defense:**
   - Add serverless rate-limiting middleware for `/api/webhooks/clerk` and `/api/sync/push`.
   - Add strict batch payload size validation on `/api/sync/push` (max 50 operations per request).

### Phase 5 & 6: Verification, Performance & E2E Validation (P2 Issues)
- Execute complete E2E user journeys A through F.
- Measure performance: initial page load, scan viewfinder initialization, sync throughput, bundle chunk sizes.
- Verify zero client secret leakage and audit privacy boundaries.

### Phase 7 to 10: Bug Fixing, Handover & Release Readiness
- Compile complete documentation deliverables in `docs/step-7/`.
- Provide final engineering handover with release gate recommendations.
