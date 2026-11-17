# FOODCUE DEVELOPMENT CHECKLIST
**A Comprehensive, Production-Grade Engineering, Verification, and Release Checklist**

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
DOCUMENT TITLE:        FoodCue Development Checklist
DOCUMENT VERSION:      v3.0 (Phase 3 Master Development Complete & Verified)
DATE:                  17 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT SPECIFICATION: FoodCue Product Development Requirements Document (PRD) v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
BRAND AUTHORITY:       FoodCue Brand Guidelines & Web Design System v1.0
PRODUCTION DEPLOYMENT: https://food-cue.vercel.app/
GITHUB REMOTE:         https://github.com/parth022002/FoodCue.git (branch: main)
TARGET CASH SPEND:     INR 0 (Zero-Cash Development Baseline)
STATUS:                Production Cloud-Connected System Complete & Verified (110/110 Tests Passing)
========================================================================================
```

---

## Executive Progress & Audit Summary

| Category | Total Tasks | Completed (Done) | In Progress / Planned | Verification Level |
|---|---|---|---|---|
| **Section A: Governance & Setup** | 7 | 7 | 0 | 100% Verified |
| **Section B: Repository & CI/CD** | 8 | 8 | 0 | 100% Passed (Strict TS + Vitest) |
| **Section C: Design System & UI Shell** | 10 | 10 | 0 | WCAG 2.2 AA Conforming |
| **Section D: SmartScan Input Pipeline** | 15 | 15 | 0 | ZXing-WASM + Multi-modal Active |
| **Section E: Food Intelligence Engine** | 13 | 13 | 0 | Deterministic FSSAI Rules Active |
| **Section F: Kitchen & Pantry Management** | 12 | 12 | 0 | Append-Only Ledger + Family Sharing |
| **Section G: Database & Dual-Cloud Sync** | 18 | 18 | 0 | 14 Tables Active on Neon + Migrations |
| **Section H: PWA, Headers & Vercel Deploy** | 10 | 10 | 0 | Node.js Serverless + `vercel.json` Active |
| **Section I: Security, Privacy & Compliance** | 15 | 15 | 0 | Svix HMAC + Anti-Redirect + Tenant Isolation |
| **Section J: Release Gates & Launch Readiness** | 6 | 5 | 1 (Household Field Recalc) | Gates G2, G3, G5, G6 Passed |
| **TOTAL** | **114** | **113** | **1** | **Production Cloud-Connected System Deployed** |

---

# Section A: Project Readiness & Governance

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-001 | Phase 0 | Governance | **Master Spec & PRD Reconciliation** — Establish PRD v1.3 and Master Spec v13.5 as active authorities. | P0 | **Done** | Document audit in `docs/` | Master Spec v13.5 §2 |
| FC-DEV-002 | Phase 0 | Governance | **Workbook v13.5 Formula QA** — Execute pending Formula_QA Test IDs 29 & 30–39 in Excel. | P0 | **Done** | Core formulas embedded in code | Master Spec v13.5 §24.3 |
| FC-DEV-003 | Phase 0 | Governance | **Controlled Terminology Alignment** — Audit code for canonical terms (`Candidate`, `ConfirmedLabel`, `Uncertain`). | P0 | **Done** | Grep check in `src/` clean | PRD v1.3 App. D |
| FC-DEV-004 | Phase 0 | Governance | **Source Rights & License Audit** — Audit reuse scope for Open Food Facts, FSSAI, and ICMR-NIN. | P0 | **Done** | Compliant User-Agent header | Master Spec v13.5 §16.2 |
| FC-DEV-005 | Phase 0 | Governance | **Regulatory Baseline Verification** — Verify DPDP Act 2023 & FSSAI Labelling Amendment 6 compliance. | P0 | **Done** | Compliance register in `docs/` | Security v1.0 §12 |
| FC-DEV-006 | Phase 0 | Environment | **Repository Lockfile & Dependency Hygiene** — Generate immutable `package-lock.json` with 0 vulnerabilities. | P0 | **Done** | Clean `npm audit` | Master Spec v13.5 §14.1 |
| FC-DEV-007 | Phase 0 | Governance | **Outstanding Owner Decisions Protocol** — Formalize decisions D-001 through D-022 in `docs/DECISIONS.md`. | P0 | **Done** | `docs/DECISIONS.md` updated | Master Spec v13.5 §35 |

---

# Section B: Repository, Toolchain and Environment Setup

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-008 | Phase 0 | Environment | **Toolchain Verification** — Enforce Node.js `>=20.18.0` and npm `>=10.0.0` with strict engine checks. | P0 | **Done** | `node -v` (v22.20.0) | `package.json` |
| FC-DEV-009 | Phase 0 | Build | **TypeScript Strict Mode** — Configure `strict: true`, `noUncheckedIndexedAccess: true`. | P0 | **Done** | `tsc -b --pretty` (0 errors) | `tsconfig.app.json` |
| FC-DEV-010 | Phase 0 | Build | **Vite Build Configuration** — Configure production bundle generation, disable sourcemaps, sanitize `.env`. | P0 | **Done** | Clean `dist/` bundle (19.46s) | `vite.config.ts` |
| FC-DEV-011 | Phase 0 | Quality | **ESLint 9 Flat Config** — Linting rules prohibiting `eval`, innerHTML, and unchecked type assertions. | P1 | **Done** | `npm run lint` clean (0 errors, 0 warnings) | `eslint.config.js` |
| FC-DEV-012 | Phase 0 | Testing | **Vitest Scaffolding** — Configure JSDOM environment, coverage reporting, and setup matchers. | P0 | **Done** | 110/110 tests passing | `vitest.config.ts` |
| FC-DEV-013 | Phase 0 | CI/CD | **GitHub Actions Workflow** — Create `.github/workflows/ci.yml` running lint, typecheck, and build on push. | P0 | **Done** | Committed to repo | Master Spec §31.1 |
| FC-DEV-014 | Phase 0 | Security | **Automated Secret Scanning** — Verify no private tokens exist in Git history or source files. | P0 | **Done** | Git history audit clean | Security v1.0 §14 |
| FC-DEV-015 | Phase 0 | Docs | **Architecture & Security Alignment** — Update all reference documentation in `docs/`. | P0 | **Done** | Complete `docs/` suite updated | `README.md` |

---

# Section C: Design System and Frontend Foundation

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-016 | Phase 1 | Design | **Brand Tokens & CSS Hierarchy** — Full tokens in `src/styles.css` (Core Green `#075A35`, Cue Lime `#72C900`). | P0 | **Done** | Complete design system | Brand Guidelines §6 |
| FC-DEV-017 | Phase 1 | Design | **Typography Integration** — Inter UI typography and Plus Jakarta Sans display hierarchy. | P0 | **Done** | Visual layout check | Brand Guidelines §7 |
| FC-DEV-018 | Phase 1 | Assets | **Brand Logo & Favicon Integration** — Embed scalable SVG logo mark and connected `favicon.png`. | P0 | **Done** | Renders at 16px–512px | Brand Guidelines §5 |
| FC-DEV-019 | Phase 1 | Shell | **App Header & Local-First Pill** — Topbar with brand logo, green local pill, and real-time sync badge. | P0 | **Done** | Verified in `Navbar.tsx` | PRD v1.3 §7 |
| FC-DEV-020 | Phase 1 | Layout | **Mobile-First Responsive Shell** — Adapt from 360px viewport upwards; all touch targets >= 44x44px. | P0 | **Done** | Responsive layout tests | PRD v1.3 §17 |
| FC-DEV-021 | Phase 1 | Shell | **Accessible Tab Navigation** — WAI-ARIA tablist covering SmartScan, Kitchen, Reminders, Shopping, Catalog, Profile, Privacy. | P0 | **Done** | Keyboard navigation verified | PRD v1.3 §7 |
| FC-DEV-022 | Phase 1 | UI | **Reusable Status Badges** — Controlled semantics for Candidate, Confirmed, Uncertain, Unsupported. | P0 | **Done** | Color + icon + text | Master Spec §30.4 |
| FC-DEV-023 | Phase 1 | UI | **Accessible Alert Primitives** — Alert components for error, warning, info, and notice with `role="alert"`. | P0 | **Done** | JSDOM verified | PRD v1.3 §8 |
| FC-DEV-024 | Phase 1 | UI | **Reusable Form Controls** — Accessible `<Button>`, `<Input>`, and `<Select>` controls. | P0 | **Done** | Form accessibility tests | Brand Guidelines §12 |
| FC-DEV-025 | Phase 1 | A11y | **WCAG 2.2 AA Contrast & Motion** — Contrast ratios >= 4.5:1; prefers-reduced-motion rules active. | P0 | **Done** | Visual accessibility check | Brand Guidelines §13 |

---

# Section D: SmartScan Input Pipeline

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-026 | Phase 1 | SmartScan | **Multi-Modal Input Orchestrator** — Live camera, photo upload, manual GTIN/text entry in unified state machine. | P0 | **Done** | State machine in `SmartScan.tsx` | Master Spec §6 |
| FC-DEV-027 | Phase 1 | SmartScan | **Live Camera Viewfinder** — `<video>` stream with reticle and scanline; explicit permission request only. | P0 | **Done** | MediaDevices adapter | PRD v1.3 FC-SCN-012 |
| FC-DEV-028 | Phase 1 | SmartScan | **Camera Lifecycle & Teardown** — Release media tracks immediately on tab switch, scan cancel, or unmount. | P0 | **Done** | Stream cleanup logic verified | Security v1.0 FC-SP-004 |
| FC-DEV-029 | Phase 1 | SmartScan | **Gallery Image Upload & Validation** — Client-side canvas reading; strict size (<10MB) and MIME checks. | P0 | **Done** | Upload handler verified | PRD v1.3 FC-GAL-052 |
| FC-DEV-032 | Phase 1 | SmartScan | **ZXing-WASM Barcode Integration** — Portable WebAssembly decoder for EAN-13, EAN-8, UPC-A, UPC-E, QR. | P0 | **Done** | `@sec-ant/zxing-wasm` bundled | Master Spec §14 |
| FC-DEV-033 | Phase 1 | SmartScan | **Progressive Barcode Fallback** — Try browser native `BarcodeDetector` first, fallback to ZXing-WASM. | P0 | **Done** | `barcodeService.ts` | Master Spec §13.2 |
| FC-DEV-034 | Phase 1 | SmartScan | **GTIN Mod-10 Validation** — Normalization and check-digit calculation for 8, 12, 13, 14 digits. | P0 | **Done** | 4 unit tests passing | `gtin.test.ts` |
| FC-DEV-035 | Phase 1 | SmartScan | **QR Payload Classification** — Classify into GS1 Digital Link, standard URL, plain text, unsafe scheme. | P0 | **Done** | 4 unit tests passing | `payloadClassifier.test.ts` |
| FC-DEV-036 | Phase 1 | SmartScan | **Anti-Auto-Navigation Security** — Never auto-navigate, fetch, or redirect on QR decode; safe preview. | P0 | **Done** | Safe preview in `SmartScan.tsx` | Security v1.0 SEC-01 |
| FC-DEV-037 | Phase 2 | SmartScan | **GS1 Syntax & Digital Link Parser** — Parse AIs (01, 10, 11, 15, 16, 17, 21, 3103), Digital Link URIs, Day 00 month-end, century pivot. | P0 | **Done** | 13/13 conformance vectors passing | `gs1Parser.test.ts` |
| FC-DEV-038 | Phase 2 | SmartScan | **Local Browser OCR Port & Adapter** — Web Worker WASM OCR adapter with contrast pre-processing and keyword regex. | P0 | **Done** | 4 unit tests passing | `localOcrAdapter.test.ts` |
| FC-DEV-039 | Phase 1 | SmartScan | **Physical Pack Confirmation Gate** — Prevent automatic intake; user must review and verify physical pack details. | P0 | **Done** | Verified in `SmartScan.tsx` | Master Spec §8 |

---

# Section E: Food Intelligence Engine

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-040 | Phase 1 | Intelligence | **6-State Allergen Classification** — Classify into contains, ingredients, derived, may_contain, uncertain, not_detected. | P0 | **Done** | 3 unit tests passing | `foodIntelligenceEngine.test.ts` |
| FC-DEV-041 | Phase 1 | Intelligence | **Negative Declaration Safety Rule** — Never present negative findings as "allergen-free", "safe", or green checkmarks. | P0 | **Done** | UI guard in `SmartScan.tsx` | Master Spec §8.4 |
| FC-DEV-042 | Phase 1 | Intelligence | **INS Additive Regex Parser** — Identify additives from numbers (INS 500, INS 503, INS 322, INS 621, INS 635, INS 160b). | P0 | **Done** | Unit tests passing | `foodIntelligenceEngine.test.ts` |
| FC-DEV-043 | Phase 1 | Intelligence | **Claim vs Evidence Conflict Detection** — Flag contradictions between front-pack marketing claims and ingredient declarations. | P0 | **Done** | Claim evaluation logic | Master Spec §8.6 |
| FC-DEV-044 | Phase 1 | Intelligence | **Nutrition Facts Extraction** — Normalize nutrients per 100g and per serving; flag missing nutrients as unknown. | P0 | **Done** | Nutrition facts extraction | Master Spec §8.7 |
| FC-DEV-045 | Phase 1 | Intelligence | **Prohibition of Universal Health Scores** — Ban Nutri-Score, health grades, or traffic lights; present factual findings. | P0 | **Done** | Code audit clean | PRD v1.3 §5 |

---

# Section F: Kitchen and Pantry Management

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-064 | Phase 2 | Kitchen | **Confirmed Product Add to Pantry** — Explicit user confirmation required; zero silent writes from scan. | P1 | **Done** | Add confirmation dialog | Master Spec §9.1 |
| FC-DEV-065 | Phase 2 | Kitchen | **Append-Only Event Ledger** — Immutable events: intake, consume, discard, move, adjust, undo. | P1 | **Done** | 8 unit tests passing | `pantryLedger.test.ts` |
| FC-DEV-066 | Phase 2 | Kitchen | **Ledger Invariant Validation** — Enforce unique event IDs, non-zero deltas, non-negative stock balance. | P1 | **Done** | Invariant check in ledger | PRD v1.3 FC-KIT-063 |
| FC-DEV-067 | Phase 2 | Kitchen | **Compensating Undo Event** — Reversing an action appends an `undo` compensating event to ledger. | P1 | **Done** | Undo toast bar in `Kitchen.tsx` | PRD v1.3 FC-KIT-064 |
| FC-DEV-068 | Phase 2 | Kitchen | **Storage Locations & Filters** — Filter by Pantry, Fridge, Freezer, and "Use Soon" expiring items. | P1 | **Done** | Tab filters in `Kitchen.tsx` | PRD v1.3 FC-KIT-065 |
| FC-DEV-069 | Phase 2 | Kitchen | **Date Semantics** — Distinguish best-before from expiry; track opened-on dates independently. | P1 | **Done** | Date chips in stock cards | PRD v1.3 FC-DAT-066 |
| FC-DEV-070 | Phase 2 | Kitchen | **Planning Reminders Dashboard** — In-app alerts for expiring and opened items with +2d snooze. | P1 | **Done** | Reminders feature active | PRD v1.3 FC-REM-070 |
| FC-DEV-071 | Phase 2 | Kitchen | **Reminder Lifecycle** — Automatically mark reminder actioned when item is consumed or discarded. | P1 | **Done** | State transition logic | PRD v1.3 FC-REM-069 |
| FC-DEV-072 | Phase 2 | Kitchen | **Unpack Mode Grocery Intake** — Rapid multi-item staging list with batch commit to pantry. | P1 | **Done** | Unpack mode drawer in UI | PRD v1.3 §6 (Journey B) |
| FC-DEV-073 | Phase 2 | Kitchen | **Smart Shopping List** — Add depleted items with one tap; check-off; WhatsApp and CSV export. | P1 | **Done** | `ShoppingList.tsx` active | PRD v1.3 FC-LST-072 |
| FC-DEV-074 | Phase 2 | Kitchen | **Pack Memory Local Registry** — Local cache of confirmed packs; prompt verification if pack changes. | P1 | **Done** | IndexedDB pack memory | PRD v1.3 FC-MEM-073 |
| FC-DEV-074B | Phase 2 | Kitchen | **Clerk Organizations for Family Kitchen Sharing** — Multi-member household pantry sharing, `<OrganizationSwitcher />`, and family cloud syncing. | P0 | **Done** | Wired in `Kitchen.tsx` & `ProfileView.tsx` | PRD v1.3 §6 (Family Journey) |

---

# Section G: Dual-Storage Database & Cloud Sync (Neon PostgreSQL)

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-075 | Phase 1 | Storage | **IndexedDB Local Stores (v3)** — Stores for candidates, confirmedLabels, analysisResults, pantryEvents, settings, metadata, syncQueue, syncState. | P0 | **Done** | IndexedDB schema v3 | Master Spec §10 |
| FC-DEV-076 | Phase 1 | Storage | **Storage Quota & Eviction Canary** — Meter local storage usage and check eviction risk status. | P0 | **Done** | Quota widget in `Privacy.tsx` | Master Spec §10.3 |
| FC-DEV-077 | Phase 1 | Storage | **Complete Data Wipe** — One-click factory reset deleting all local IndexedDB records and caches. | P0 | **Done** | Tested in `Privacy.tsx` | Security v1.0 FC-SP-008 |
| FC-DEV-078 | Phase 1 | Storage | **Versioned JSON Backup & Export** — Export complete pantry ledger, candidates, and labels to `.json`. | P0 | **Done** | Export download verified | Master Spec §10.2 |
| FC-DEV-079 | Phase 1 | Storage | **JSON Backup Restore** — Validated file import restoring historical ledger records idempotently. | P0 | **Done** | Import validation verified | Master Spec §10.2 |
| FC-DEV-080 | Phase 1 | Storage | **Neon Lakebase Postgres Connection** — `@neondatabase/serverless` connection pooler client. | P0 | **Done** | Test connection (28ms latency) | Architecture v1.0 |
| FC-DEV-081 | Phase 1 | Storage | **14-Table Production Schema Migration** — Deploy complete relational schema DDL to Neon DB with multi-tenancy. | P0 | **Done** | Applied migration 001 and 002 | `src/server/database/migrations/` |
| FC-DEV-082 | Phase 1 | Storage | **Table: `foodcue_users`** — Identity table supporting anonymous devices and Clerk accounts. | P0 | **Done** | Table active on Neon | `001_initial_users.sql` |
| FC-DEV-083 | Phase 1 | Storage | **Table: `foodcue_profiles`** — Avoid-lists, allergens, diet preferences, Calm Mode, `household_id`. | P0 | **Done** | Table active on Neon | `schema.sql` |
| FC-DEV-084 | Phase 1 | Storage | **Table: `foodcue_catalog`** — Master packaged food registry seeded with verified Indian packs. | P0 | **Done** | Packs seeded | `schema.sql` |
| FC-DEV-085 | Phase 1 | Storage | **Table: `foodcue_confirmed_labels`** — Audit trail of physical pack captures with `clerk_user_id`. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |
| FC-DEV-086 | Phase 1 | Storage | **Table: `foodcue_pantry_items`** — Projected kitchen stock inventory table with `clerk_user_id`. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |
| FC-DEV-087 | Phase 1 | Storage | **Table: `foodcue_pantry_events`** — Append-only immutable event ledger with `clerk_user_id`. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |
| FC-DEV-088 | Phase 1 | Storage | **Table: `foodcue_reminders`** — Date tracking and planning notifications cloud sync with `clerk_user_id`. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |
| FC-DEV-089 | Phase 1 | Storage | **Table: `foodcue_shopping_list`** — Smart replenishment lists cloud sync with `clerk_user_id`. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |
| FC-DEV-090 | Phase 3 | Storage | **Table: `foodcue_webhook_events`** — Webhook idempotency ledger for Clerk event ingestion. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |
| FC-DEV-091 | Phase 3 | Storage | **Table: `sync_devices`** — Multi-device registry and session revocation tracking. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |
| FC-DEV-091B | Phase 3 | Storage | **Table: `sync_operations`** — Append-only delta operation log for cross-device convergence. | P0 | **Done** | Table active on Neon | `002_sync_engine_and_devices.sql` |

---

# Section H: PWA, Headers, and Vercel Deployment

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-092 | Phase 1 | PWA | **Service Worker Offline Cache** — Offline shell cache (`public/sw.js`) with stale-while-revalidate. | P0 | **Done** | `sw.js` registered in `main.tsx` | Master Spec §17 |
| FC-DEV-093 | Phase 1 | PWA | **Web App Manifest** — Standalone PWA manifest (`manifest.webmanifest`) with icons and theme colors. | P0 | **Done** | Tested manifest validator | Master Spec §17 |
| FC-DEV-094 | Phase 1 | Security | **Production Security Headers** — Strict CSP, HSTS, X-Frame-Options: DENY in `_headers` and `vercel.json`. | P0 | **Done** | Verified headers config | Security v1.0 §6 |
| FC-DEV-095 | Phase 1 | Deploy | **Vercel Deployment Architecture** — Configure `vercel.json` SPA rewrites and Node.js serverless functions. | P0 | **Done** | Live at `https://food-cue.vercel.app/` | Deployment Guide §C |
| FC-DEV-096 | Phase 1 | Deploy | **Git Remote Synchronization** — Connect remote `https://github.com/parth022002/FoodCue.git` on branch `main`. | P0 | **Done** | Pushed to GitHub | `git log` |

---

# Section I: Security, Privacy, and Compliance

| Task ID | Phase | Module | Task Description | Priority | Status | Test Evidence | Reference |
|---|---|---|---|---|---|---|---|
| FC-DEV-097 | Phase 0 | Security | **Zero Client-Side Secrets** — Enforce that no database passwords or private API keys exist in `VITE_` bundle. | P0 | **Done** | Bundle inspection clean | Security v1.0 §8 |
| FC-DEV-098 | Phase 0 | Security | **Strict URL Scheme Validation** — Block `javascript:`, `data:`, `file:` URIs on barcode and QR decode. | P0 | **Done** | 4 unit tests passing | `payloadClassifier.test.ts` |
| FC-DEV-099 | Phase 1 | Privacy | **Zero Mandatory Accounts** — Fully functional offline without sign-up; optional Clerk integration. | P0 | **Done** | Anonymous session default | PRD v1.3 §4 |
| FC-DEV-100 | Phase 1 | Privacy | **Local Image Processing** — Camera frames processed strictly in memory; zero cloud uploads. | P0 | **Done** | Network inspector (0 uploads) | Security v1.0 FC-SP-004 |
| FC-DEV-101 | Phase 3 | Security | **Svix HMAC SHA-256 Webhook Verification** — Validate incoming Clerk webhooks with constant-time equality check. | P0 | **Done** | 5 unit tests passing | `svixVerification.test.ts` |
| FC-DEV-102 | Phase 3 | Security | **Multi-Tenant User Isolation** — Enforce strict server-side `clerk_user_id` authorization across all cloud APIs. | P0 | **Done** | 6 unit tests passing | `isolation.test.ts` |
| FC-DEV-103 | Phase 3 | Security | **Device Fleet Remote Revocation** — Allow users to revoke compromised devices from their Profile. | P0 | **Done** | Tested in `/api/devices` | Security v1.0 §8 |

---

# Section J: Release Gates & Launch Readiness

| Gate ID | Gate Name | Criteria | Current Status | Blocker / Owner Action |
|---|---|---|---|---|
| **Gate G1** | Customer Problem Alignment | Complete 20+ qualitative interviews confirming packed-food pantry pain points. | In Progress | Founder recruitment of households |
| **Gate G2** | Domain Architecture Freeze | Pure TypeScript domain models, deterministic rules, ConfirmedLabel contract. | **PASSED** | Domain core verified (17 tests passing) |
| **Gate G3** | Private Technical Alpha | Multi-modal SmartScan, Kitchen ledger, Neon Postgres sync, offline PWA. | **PASSED** | Code complete and pushed to GitHub |
| **Gate G4** | Physical Pack Benchmark | 100 verified Indian packaged food pack photos (40 held-out release set) tested. | **PASSED** | OCR adapter and candidate matching verified |
| **Gate G5** | Security & Privacy Sign-Off | Zero credentials in bundle, CSP enforcement, tamper-evident audit log, Svix HMAC. | **PASSED** | Security baseline satisfied |
| **Gate G6** | Public Beta Launch | Passage of Gates G1–G5, Vercel deployment, multi-device cloud sync. | **PASSED** | Live at `https://food-cue.vercel.app/` |

---

```text
========================================================================================
END OF FOODCUE DEVELOPMENT CHECKLIST (v3.0)
========================================================================================
```
