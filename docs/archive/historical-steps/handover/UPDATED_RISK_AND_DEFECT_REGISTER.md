# FoodCue — Updated Risk and Defect Register
**Controlling Authority:** FoodCue Master Specification v13.5 §25; PRD v1.2  
**Document ID:** `DEFECT-RISK-20261117-01`  
**Date:** 17 November 2026  
**Defect Status:** 8 CONFIRMED DEFECTS IDENTIFIED; 8 RESOLVED & VERIFIED IN CODE (0 OPEN)  
**Risk Status:** 7 PROJECT RISKS CATALOGED; 6 CONTROLLED IN CODE; 1 OPERATIONAL BLOCKER  

---

## 1. Consolidated Defect Register

| Defect ID | Category | Severity | Description | Resolution Strategy | Verification Evidence | Status |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| **DEF-01** | Accessibility | S2 | Migration Wizard modal trapped keyboard focus and lacked Escape key listener. | Added global `keydown` event listener for Escape key and ARIA attributes in `MigrationWizard.tsx`. | Manual Esc test + vitest | **CLOSED** |
| **DEF-02** | Accessibility | S2 | Device Revocation dialog lacked Escape key handler and title labeling. | Added Escape handler, `role="dialog"`, and `aria-labelledby` in `ConnectedDevicesView.tsx`. | Manual Esc test + vitest | **CLOSED** |
| **DEF-03** | Security / DoS | S2 | `/api/sync/push` accepted arbitrarily large operation arrays without bounds. | Added boundary guard `operations.length > 100` returning HTTP 400 `BATCH_SIZE_EXCEEDED`. | `test/server/api/endpoints.test.ts` | **CLOSED** |
| **DEF-04** | Food Intelligence| S2 | Dictionary missing common Indian additives (Tartrazine, Sunset Yellow, etc.). | Expanded `COMMON_ADDITIVES` dictionary in `foodIntelligenceEngine.ts` to 30 INS codes. | `foodIntelligenceEngine.test.ts` | **CLOSED** |
| **DEF-05** | Queue / Sync | S2 | Rapid queue enqueues in same millisecond risked timestamp sorting ties. | Implemented `getMonotonicIso()` generator in `localChangeQueue.ts`. | `test/sync/queue.test.ts` | **CLOSED** |
| **DEF-06** | Testing / State | S3 | `syncMetadata` lacked clean reset method for test teardown between runs. | Added `reset()` method to `syncMetadata.ts` reinitializing default local unauthenticated state. | `test/e2e/userJourneys.test.ts` | **CLOSED** |
| **DEF-07** | Storage / Sync | S3 | Missing helper to clear individual IndexedDB store during test teardowns. | Added `clearStore(store: StoreName)` to `src/adapters/storage/database.ts`. | `test/sync/offlineResilience.test.ts` | **CLOSED** |
| **DEF-08** | Runtime / Edge | S1 | Clerk webhook returned 500 on Vercel due to Node 20 runtime deprecation. | Updated `engines` in `package.json` to `"node": "26.x"` and bundled with esbuild. | Live Webhooks 200 OK verified | **CLOSED** |

---

## 2. Active Risk Register

| Risk ID | Category | Risk Description | Mitigated In Code? | Residual Gating Requirement |
| :---: | :--- | :--- | :---: | :--- |
| **RSK-01** | Safety | False reassurance on missing allergen text. | **YES** | Mandatory disclaimer attached to all scans. |
| **RSK-02** | Legal | FSSAI regulation changes. | **YES** | Versioned deterministic food-safety rules. |
| **RSK-03** | Technical | Mobile browser camera permission block. | **YES** | Graceful fallback to gallery upload / manual review. |
| **RSK-04** | Security | Malicious QR code drive-by exploitation. | **YES** | SEC-01 inert payload classification (10 classes). |
| **RSK-05** | Privacy | Unintended cloud upload of kitchen data. | **YES** | PRV-01 local-first default with opt-in consent. |
| **RSK-06** | Financial | Infrastructure overage costs. | **YES** | Zero-cash invariant with hard free-tier boundaries. |
| **RSK-07** | Operational | Premature launch before physical validation. | **NO (GATED)** | **ACTIVE BLOCKER:** G1–G4/G6 datasets required. |
