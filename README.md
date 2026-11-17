# FoodCue — Know your food. Manage your kitchen.

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
VERSION:               v5.0.0 (Release Candidate: Closed Beta Candidate)
DEVELOPER:             Parth Ahuja
PRODUCT BASELINE:      FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT REQUIREMENTS:  FoodCue PRD v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
REPOSITORY:            https://github.com/parth022002/FoodCue.git
CONTROLLING BUDGET:    INR 0 Cash Target (Zero-Cash Development Baseline)
STATUS:                213/213 Tests Passing (37 Suites) | Strict TypeScript | Clean Build
========================================================================================
```

FoodCue is a **local-first, privacy-conscious packaged-food intelligence and kitchen-management Progressive Web Application (PWA)**. It helps households understand packaged-food labels, identify ingredients and allergens, interpret nutritional information, manage kitchen inventory, track expiration dates, and organize pantry stock.

---

## 🚀 Key Capabilities & Completed Architecture

- **Local-First & Zero Mandatory Accounts:** 100% operational offline using IndexedDB (Schema v4). Food scanning, pantry tracking, and expiry alerts require zero sign-in.
- **Universal SmartScan Pipeline:**
  - Real-time camera viewfinder with hardware controls (torch/flashlight, zoom slider, camera switching) and animated reticle.
  - Universal 1D/2D barcode decoding powered by `@sec-ant/zxing-wasm` (EAN-13, EAN-8, UPC-A, UPC-E, QR Code, GS1 Digital Link).
  - Background Web Worker OCR with OpenCV-style grayscale binarization and contrast enhancement.
- **Offline Indian FMCG Barcode Catalogue (500 SKUs):** Instant offline resolution for 500 top Indian household products (Amul, Britannia, Parle, Nestle, ITC, Tata, Haldiram's, Dabur, Mother Dairy, MDH).
- **OpenFoodFacts GTIN Metadata Fallback:** Seamless API fallback with zero token leaks and a mandatory physical pack review gate (`ConfirmedLabel`).
- **Append-Only Pantry Event Ledger:** Resilient event-sourcing design with vector clock conflict resolution and zero silent data merging (`MigrationPreviewDialog`).
- **Multi-Tenant Household Sharing:** Family inventory collaboration powered by Clerk Organizations with tenant isolation verified by live SQL assertions.
- **Web Push Notifications & In-App Expiry Reminders:** Configurable push subscriptions (`api/notifications/subscribe.js`) and in-app alerts with quiet hours protection.
- **Cryptographic Clerk Webhooks (Step 5):** Svix HMAC-SHA256 authenticated webhook ingestion for `user.created`, `user.updated`, and `user.deleted` with idempotent deduplication.

---

## 📁 Repository Structure

```
FoodCue/
├── api/                           # Vercel Serverless Endpoints (esbuild bundled)
│   ├── devices/index.js           # Multi-device registration & heartbeat
│   ├── notifications/subscribe.js # Web push subscription storage
│   ├── sync/                      # Push, Pull, Migrate, Status, Delete endpoints
│   ├── webhooks/clerk.js          # Svix verified Clerk webhook handler
│   └── me.js                      # Authenticated user identity endpoint
├── docs/                          # Cleaned Canonical Specifications & Architecture
│   ├── archive/                   # Safely preserved historical steps & checklists
│   ├── audit/                     # 10 Authoritative Audit & Release Deliverables
│   │   ├── PROJECT_AUDIT_REPORT.md
│   │   ├── DOCUMENT_AUTHORITY_REGISTER.md
│   │   ├── PROJECT_STATUS.md
│   │   ├── RELEASE_READINESS.md
│   │   ├── REQUIREMENT_TRACEABILITY.md
│   │   ├── CLEANUP_REPORT.md
│   │   ├── TEST_EXECUTION_REPORT.md
│   │   ├── DEPENDENCY_AUDIT.md
│   │   └── REMAINING_WORK.md
│   ├── integrations/openfoodfacts/# OpenFoodFacts fallback integration documentation
│   ├── technical/                 # Deep architectural & hardware specifications
│   ├── validation/                # Validation protocols & benchmark annotation guides
│   ├── ARCHITECTURE.md            # Canonical system architecture
│   ├── FOODCUE_DATABASE_SCHEMA.md # Canonical PostgreSQL schema
│   └── schema.sql                 # Complete database schema
├── public/                        # PWA assets, manifest, and service worker (`sw.js`)
├── scripts/                       # Core build, migration, and generation scripts
│   ├── bundle-api.mjs             # Esbuild bundler for Vercel functions
│   ├── generate-fmcg-catalog.mjs  # FMCG catalog generator (500 SKUs)
│   ├── migrate-neon.mjs           # Neon PostgreSQL migrator
│   ├── run-migrations.mjs         # Migration runner
│   └── verify-step5-webhooks.mjs  # Step 5 Clerk webhook verification tool
├── src/                           # Frontend application & domain services
│   ├── adapters/                  # Hardware, storage, OCR, notification adapters
│   ├── app/                       # Application shell, router, providers
│   ├── components/                # Reusable UI components & design system
│   ├── domain/                    # Core business entities, contracts, rules, services
│   ├── features/                  # User journeys (SmartScan, Pantry, Household, Sync, Auth)
│   ├── integrations/              # Third-party API clients
│   ├── server/                    # Backend services, DB client, Svix verification
│   └── sync/                      # Offline sync engine, conflict resolver, queues
├── test/                          # Comprehensive automated test suites (37 files, 213 tests)
├── .env.example                   # Sanitized environment template
├── package.json                   # Dependencies, engines, and scripts
├── tsconfig.json                  # Strict TypeScript configuration
└── vite.config.ts                 # Vite bundler configuration
```

---

## 🛠️ Development & Validation Commands

All commands can be executed using standard `npm`:

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run strict TypeScript typecheck
npm run typecheck

# Run automated test suite (37 files, 213 tests)
npm test

# Build production bundle and serverless API endpoints
npm run build

# Run database migrations against Neon PostgreSQL
npm run db:migrate

# Audit production dependencies for vulnerabilities
npm run security:audit
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
# Neon PostgreSQL Connection String (Required for Cloud Sync)
DATABASE_URL=postgresql://user:password@ep-host.region.aws.neon.tech/neondb?sslmode=require

# Clerk Authentication (Optional for Local Mode, Required for Accounts)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Application Base URL
VITE_APP_URL=http://localhost:5173
```

---

## 📊 Verification & Test Status

- **Automated Tests:** **37 test files, 213 tests passing (100% pass rate).**
- **Type Safety:** `tsc -b --pretty` compiles with zero warnings or errors.
- **Production Bundle:** Vite transforms 2,212 modules; esbuild bundles 8 standalone serverless functions.
- **Release Gate Status:** Classified as **`CLOSED BETA CANDIDATE`** (all code and infrastructure ready; field data collection underway).
- **Audit Reports:** See [`docs/audit/PROJECT_STATUS.md`](file:///c:/Users/parth/OneDrive/Desktop/FoodCue/foodcue%20Code/docs/audit/PROJECT_STATUS.md) and [`docs/audit/REMAINING_WORK.md`](file:///c:/Users/parth/OneDrive/Desktop/FoodCue/foodcue%20Code/docs/audit/REMAINING_WORK.md) for complete details.

---

## 📜 License & Disclaimers

- **License:** MIT License. Developed by Parth Ahuja.
- **Food Safety Disclaimer:** FoodCue is an informational decision-support tool. It does not replace professional medical or dietary advice. In accordance with our fail-closed safety invariant, "Unknown is never assumed safe."
