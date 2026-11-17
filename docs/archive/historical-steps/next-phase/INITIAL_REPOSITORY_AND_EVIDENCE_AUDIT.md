# FoodCue — Initial Repository & Evidence Audit (Next-Phase Baseline)
**Controlling Specification:** FoodCue Master Specification v13.5 & PRD v1.2  
**Baseline Git Commit:** `92ea3a0` (verified on `main`)  
**Working Feature Branch:** `feature/openfoodfacts-gtin-fallback-and-validation`  
**Audit Date:** 17 November 2026  
**Auditing Team:** Senior Cross-Functional Engineering & Quality Team  
**Evaluation Scope:** Codebase Audit, Test Pyramid Reconciliation, OpenFoodFacts Integration Architecture & G1–G6 Field Readiness  

---

## 1. Commit Baseline & Git Integrity

1. **Commit Verification:**
   - Previous reported commit `92ea3a0` is confirmed as the exact HEAD commit on `main`.
   - History is verified, intact, and synchronized with `origin/main`.
2. **Branching Strategy:**
   - Switched to dedicated isolated working branch: `feature/openfoodfacts-gtin-fallback-and-validation`.
   - The stable release baseline `92ea3a0` is fully preserved.

---

## 2. Existing Architecture & Functionality Overview

FoodCue is architected as an offline-capable, local-first Progressive Web Application with optional cloud persistence:

### 2.1 Core Architectural Layers
1. **Presentation & Application Shell:**
   - React 18.3.1 with TypeScript 5.7.3 in strict mode.
   - Vite 6.0.7 build system with code splitting and custom esbuild serverless bundler (`scripts/bundle-api.mjs`).
   - Pure CSS design system with FoodCue brand tokens (`#075A35`, `#06452B`, `#72C900`, `#12231B`, `#F5FAF5`).
   - Accessible navigation with responsive desktop header, mobile bottom nav, and modal dialogs adhering to WCAG 2.2 AA.
2. **SmartScan Multi-Modal Capture:**
   - Barcode decoding via `@sec-ant/zxing-wasm` WebAssembly.
   - GS1 2D syntax parser supporting 13 official AI vectors (`src/domain/rules/gs1Parser.ts`).
   - Anti-phishing payload classifier enforcing 10 QR threat classes with zero auto-navigation (`src/domain/rules/payloadClassifier.ts`).
   - Independent dual-path candidate matcher (`src/domain/services/candidateMatcher.ts`).
   - Multi-source evidence resolver detecting hard conflicts (`src/domain/services/evidenceResolver.ts`).
3. **Food Safety & ConfirmedLabel Boundary:**
   - `createConfirmedLabel()` requires physical identity, label version, all 3 critical panels (`ingredients`, `allergen_declaration`, `nutrition`), and 4 confirmed field states. Throws `ConfirmationError` on violations.
   - Deterministic food-intelligence engine evaluating 6 canonical allergen states and 30 common Indian FMCG additives without unvalidated AI.
4. **Local-First & Cloud Persistence:**
   - Client storage via browser IndexedDB `foodcue-local` (Schema v3) with 8 persistent stores.
   - Append-only immutable pantry event ledger (`src/domain/services/pantryLedger.ts`).
   - Monotonic persistent local change queue (`src/sync/queue/localChangeQueue.ts`).
   - Three-way conflict resolver (`src/sync/reconciliation/conflictResolver.ts`).
   - Serverless backend on Vercel Node 26 with Neon PostgreSQL persistence.
   - Clerk authentication with live Svix HMAC-SHA256 webhook ingestion (200 OK verified).

---

## 3. Existing Test Baseline (152 Tests / 25 Suites)

All 152 automated tests are active, deterministic, and passing:
- **Domain Rules (38 tests):** `gs1Parser.test.ts` (13), `gtin.test.ts` (4), `foodIntelligenceEngine.test.ts` (4), `payloadClassifier.test.ts` (4), `candidateMatcher.test.ts` (3), `evidenceResolver.test.ts` (3), `confirmedLabel.test.ts` (3), `pantryLedger.test.ts` (8).
- **Security & Safety (15 tests):** `qrSecurityThreatClasses.test.ts` (10), `foodSafetyAdversarial.test.ts` (5).
- **Storage & Sync (28 tests):** `database.test.ts` (8), `localOcrAdapter.test.ts` (4), `queue.test.ts` (4), `conflictResolver.test.ts` (4), `shoppingStorage.test.ts` (5), `offlineResilience.test.ts` (3).
- **Serverless API & Auth (45 tests):** `endpoints.test.ts` (21), `isolation.test.ts` (6), `clerk.test.ts` (8), `svixVerification.test.ts` (5), `user.service.test.ts` (7).
- **Database & Environment (11 tests):** `environment.test.ts` (8), `client.test.ts` (3).
- **UI & Navigation (3 tests):** `navigation.test.tsx` (3).
- **End-to-End User Journeys (6 tests):** `userJourneys.test.ts` (Journeys A through F).

---

## 4. Outstanding Requirements & Operational Status

As established in the previous audit, the project status is divided between **Code Readiness** and **Field Operational Gates**:

| Area | Technical Code Status | Operational Field Status | Remaining Action Required |
| :--- | :---: | :---: | :--- |
| **OpenFoodFacts Integration**| Not Implemented | Specification Ready | Implement isolated client, schema, mapping, UI, tests |
| **G1 Problem Validation** | Code Ready | NOT TESTED | Collect 20 qualitative interviews & 100 survey responses |
| **G2 Competitor Validation** | Code Ready | NOT TESTED | Log observed 30-pack competitor audit |
| **G3 Concept Validation** | Code Ready | NOT TESTED | Log >=15 participant unaided usability sessions |
| **G4 Technical & Safety** | 152 Code Tests Pass | NOT READY | Photograph & verify 100 physical packs (40 locked cases) |
| **G5 Economics** | PASS (INR 0) | PASS (INR 0) | Revalidate dependency quotas and zero-cost constraints |
| **G6 Release Controls** | Code Controls Pass | NEEDS REVIEW | Obtain certified 30-day legal and clinical content sign-offs |
| **Step 9 Closed Beta** | Protocols Ready | ON HOLD | Execute 4-week field observation with 10–20 households |
| **Step 10 Public Launch** | Protocols Ready | NOT READY / BLOCKED | Execute 500-pack benchmark and public readiness review |

---

## 5. OpenFoodFacts Proposed Integration Architecture

### 5.1 Architectural Location
To maintain modularity and avoid bloating React components, the integration will reside in:
`src/integrations/openfoodfacts/`
- `openFoodFactsTypes.ts`: Domain types for raw API responses and normalized external candidates.
- `openFoodFactsSchema.ts`: Zod schema for defensive runtime response validation.
- `openFoodFactsClient.ts`: Privacy-preserving HTTP client with timeout, rate limit handling, and mandatory User-Agent.
- `openFoodFactsMapper.ts`: Maps validated raw responses into FoodCue `ProductCandidate` records with explicit `"openfoodfacts"` provenance.
- `openFoodFactsErrors.ts`: Structured error hierarchy (`GtinValidationError`, `RateLimitError`, `NetworkError`, `MalformedResponseError`, `ProductNotFoundError`).

### 5.2 SmartScan Integration Flow
1. User scans barcode (camera, upload, or manual entry).
2. FoodCue checks local verified Indian catalogue (`VERIFIED_INDIAN_CATALOG`).
3. If matched, local candidate is shown immediately.
4. If **no local match is found**:
   - The UI displays a clear no-match state with an **optional fallback action**:
     `Search OpenFoodFacts`
   - Explicit disclosure explains that only the GTIN is sent, and external data is unverified.
5. If the user clicks "Search OpenFoodFacts":
   - Client executes one controlled GET request sending only the GTIN.
   - If found, an unverified candidate card is rendered with an amber badge:
     `External catalogue match — not yet verified against your physical pack.`
   - User must review and confirm physical pack and label version before a `ConfirmedLabel` is generated.
   - If rejected, candidate is discarded.
6. Local-first guarantee: No external call is ever made automatically.

### 5.3 Privacy & Safety Guardrails
- **Zero Metadata Leakage:** No photos, OCR text, pantry data, Clerk tokens, or device IDs are sent.
- **Safety Boundary:** Incomplete external allergen data cannot produce an allergen-free reassurance.
- **License Compliance:** External data attributed to OpenFoodFacts under the Open Database License (ODbL).

---

## 6. Documents Requiring Updates in this Execution Phase
1. `OPENFOODFACTS_INTEGRATION_DESIGN.md`
2. `OPENFOODFACTS_PRIVACY_AND_DATA_FLOW.md`
3. `OPENFOODFACTS_API_USAGE_AND_LICENSING_REVIEW.md`
4. `OPENFOODFACTS_FIELD_MAPPING.md`
5. `OPENFOODFACTS_ERROR_HANDLING.md`
6. `OPENFOODFACTS_TEST_REPORT.md`
7. `OPENFOODFACTS_USER_GUIDE.md`
8. Validation & Release Reports (G1 to G6 protocols and findings, Step 8–10 reviews, and Handover).
