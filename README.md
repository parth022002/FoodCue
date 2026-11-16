# FoodCue — Know your food. Manage your kitchen.

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
VERSION:               v2.0.0 (Production Frontend Complete & Neon DB Active)
PRODUCT BASELINE:      FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT REQUIREMENTS:  FoodCue PRD v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
REPOSITORY:            https://github.com/parth022002/FoodCue.git
CONTROLLING BUDGET:    INR 0 Cash Target (Zero-Cash Development Baseline)
========================================================================================
```

FoodCue is a **local-first, privacy-conscious packaged-food intelligence and kitchen-management Progressive Web Application (PWA)**. It helps households understand packaged-food labels, identify ingredients and allergens, interpret nutritional information, manage kitchen inventory, track expiration dates, and organize pantry stock.

---

## Architecture: Dual-Storage & Zero-Server Baseline

- **Primary Storage:** In-browser IndexedDB (100% offline, zero-latency, private, zero cost).
- **Cloud Backup & Sync:** Neon Lakebase Serverless PostgreSQL (Southeast Asia AWS Singapore pooler, sub-30ms latency) accessed over secure HTTP connection pooling (`@neondatabase/serverless`).
- **No Mandatory Accounts:** Usable immediately without registration or login. Optional cross-device sync available via Neon and Clerk.
- **Deterministic Food Rules:** Zero AI-generated safety verdicts. Allergen and nutrition facts are derived strictly from reviewed, versioned deterministic rule sets against verified physical packaging labels (`ConfirmedLabel`).
- **Offline PWA:** Standalone Progressive Web App with Service Worker (`sw.js`) and Web App Manifest (`manifest.webmanifest`).
- **Production Edge Hosting:** Optimized for deployment on **Vercel** with SPA rewrites (`vercel.json`) and security headers.

---

## Features

1. **SmartScan Input Pipeline:**
   - Real-time camera viewfinder with animated laser reticle and explicit permission lifecycle.
   - Canvas photo upload and gallery selection with size and MIME validation.
   - Universal barcode decoding with browser-native `BarcodeDetector` progressive enhancement and portable `@sec-ant/zxing-wasm` WebAssembly fallback (EAN-13, EAN-8, UPC-A, UPC-E, QR Code, DataMatrix).
   - GTIN mod-10 check-digit validation with leading zero preservation.
   - QR payload safety classification with safe URL preview; **zero automatic redirects, fetches, or crawling**.
   - Preset quick-load for verified Indian packaged staples.
   - Guided multi-panel capture checklist (Front, Ingredients, Allergens, Nutrition).
   - Side-by-side candidate comparison and explicit physical pack confirmation boundary.

2. **Deterministic Food Intelligence Engine:**
   - 6-state allergen classification: `declared_contains`, `listed_in_ingredients`, `derived_contains`, `declared_may_contain`, `uncertain`, and `not_detected_in_extracted_text`.
   - "Not detected in extracted text" safety safeguard (never presented as "allergen-free", "safe", or green checkmarks).
   - INS additive regex parser (e.g. INS 500, INS 503, INS 322, INS 223, INS 621, INS 635, INS 160b).
   - Claim vs evidence conflict detection ("Free From" claim contradiction warnings).
   - Nutrition facts extraction per 100g and per serving; missing values flagged as `unknown`.
   - Complete prohibition of universal health scores (no Nutri-Score or traffic-light health grades).
   - Offline emergency routing for severe reaction cues to India National Emergency 112.

3. **Kitchen & Pantry Inventory:**
   - **Append-only event ledger** supporting `add`, `consume`, `adjust`, `move`, `discard`, and `correction`.
   - Compensating undo action bar preserving full historical audit logs.
   - Location filtering across Pantry, Fridge, Freezer, and "Use Soon" expiring items.
   - Clear visual distinction between Best-Before dates, Expiry dates, and Opened-On dates.
   - **Unpack Mode:** Sequential multi-item grocery intake with batch commit.
   - Pack Memory for instant recognition of previously confirmed barcodes.

4. **Reminders & Expiration Alerts:**
   - Automated tracking of items expiring within 7 days, items opened >3 days ago, and expired stock.
   - +2 days snooze button and one-click "Mark Consumed".
   - Explicit planning aid disclaimer (household scheduling tool, not microbiological safety verdict).

5. **Smart Shopping List:**
   - "Add Depleted Items" helper automatically populates grocery lists from zero-balance pantry stock.
   - Categorized by Dairy, Snacks, Staples, Produce, and General.
   - Check-off items, plain text WhatsApp export, and CSV download.

6. **User Profile & Avoid-Lists:**
   - Configurable avoidances for Top 8 allergens and target ingredients (palm oil, HFCS, MSG).
   - Calm Mode reducing high-contrast alerts to neutral tones.
   - Dietary preferences (Standard, Vegetarian, Vegan, Jain).

7. **Privacy & Data Portability:**
   - Storage quota meter and browser eviction risk canary.
   - Complete one-click data wipe deleting all IndexedDB records and caches.
   - Versioned JSON export and validated backup restore.
   - Live Neon PostgreSQL status monitor, latency counter, table counter, and cloud sync/restore controls.

---

## Development Setup

### Prerequisites
- Node.js `>=20.18.0` (LTS recommended; tested on Node v22.20.0)
- npm `>=10.0.0`

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/parth022002/FoodCue.git
cd FoodCue

# 2. Install dependencies (pinned exact versions)
npm install

# 3. Start local development server
npm run dev
```

### Verification & Testing
```bash
# Run TypeScript strict typecheck (0 errors)
npm run typecheck

# Run Vitest automated unit test suite (85/85 tests passing across 15 suites)
npm test

# Run ESLint check (0 errors, 0 warnings)
npm run lint

# Run database schema migrations
npm run db:migrate

# Build production bundle
npm run build
```

---

## Backend Architecture & Serverless API (Step 3 & Step 4)

FoodCue integrates a Vercel-compatible serverless backend designed to support optional cloud sync and Clerk authentication without compromising the application's local-first baseline:

- **Serverless API Routes:**
  - `GET /api/health`: Public probe executing `SELECT 1` against Neon. Never exposes credentials.
  - `GET /api/me`: Authenticated endpoint returning user profile derived from verified Clerk Bearer token.
  - `PATCH /api/me`: Updates allowed user profile fields (`displayName`, `username`).
  - `POST /api/webhooks/clerk`: Prepared fail-closed integration boundary for user lifecycle ingestion (503 until signing secret configured).
- **Server-Side Token Verification:** Cryptographic session verification via `@clerk/backend` (`verifyToken`). Browser-supplied user IDs are strictly rejected.
- **Neon Dual-Endpoint Connection:** Reusable client pooling (`@neondatabase/serverless`) for runtime requests and unpooled direct connection for DDL migrations.

---

## Neon Lakebase PostgreSQL Setup

FoodCue includes a pre-configured serverless PostgreSQL connection to Neon in AWS Singapore. All 11 tables are active, seeded, and configured with multi-tenancy:

```bash
# Run automated database schema migration and version tracking
npm run db:migrate
```

### Active Database Tables
- `foodcue_users`: Device IDs, UUID PK, & verified Clerk user identities
- `foodcue_households`: Clerk Organizations mapping table for family/household sharing
- `foodcue_profiles`: Allergen avoidances, diet, Calm Mode, household tenancy
- `foodcue_catalog`: Verified packaged food registry with FSSAI licenses
- `foodcue_confirmed_labels`: Physical pack verification records & hashes
- `foodcue_pantry_items`: Projected kitchen stock state with `household_id`
- `foodcue_pantry_events`: Append-only immutable event ledger with `household_id`
- `foodcue_reminders`: Expiry and opened date tracking with `household_id`
- `foodcue_shopping_list`: Replenishment lists & depleted stock with `household_id`
- `foodcue_intelligence_rules`: Deterministic FSSAI rule mappings
- `foodcue_audit_log`: Tamper-evident privacy & security ledger
- `foodcue_schema_migrations`: Version-controlled migration history ledger

---

## Deployment to Vercel

FoodCue is pre-configured for instant zero-cash deployment to **Vercel**:

1. Go to [vercel.com](https://vercel.com) and import `parth022002/FoodCue`.
2. Set Environment Variable:
   - `VITE_NEON_DATABASE_URL`: `postgresql://neondb_owner:npg_cKRineBy5q8d@ep-snowy-mode-b3jn52y5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
3. Click **Deploy**. Vercel will execute `npm run build` and serve the production assets from `dist` using the routing rules in `vercel.json`.

---

## Project Documentation

- [`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md): Backend API, serverless architecture, request flows, and security boundaries.
- [`docs/CLERK_AUTHENTICATION.md`](docs/CLERK_AUTHENTICATION.md): Server-side token verification, Clerk Organizations, and identity mapping.
- [`docs/NEON_DATABASE_SETUP.md`](docs/NEON_DATABASE_SETUP.md): Neon PostgreSQL setup, pooled vs. unpooled endpoints, and migration runner.
- [`docs/FOODCUE_DATABASE_SCHEMA.md`](docs/FOODCUE_DATABASE_SCHEMA.md): Complete data dictionary for all 11 tables and constraints.
- [`docs/FOODCUE_DEVELOPMENT_CHECKLIST.md`](docs/FOODCUE_DEVELOPMENT_CHECKLIST.md): Master development, QA, and release readiness checklist.
- [`docs/FOODCUE_DEVELOPER_INPUTS_AND_CONFIGURATION_REGISTER.md`](docs/FOODCUE_DEVELOPER_INPUTS_AND_CONFIGURATION_REGISTER.md): Master register for Neon, GitHub, OpenRouter, Clerk, Groq, and OpenFoodFacts APIs.
- [`docs/schema.sql`](docs/schema.sql): Complete standalone PostgreSQL DDL schema.
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md): Real-time implementation audit and component inventory.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Full system architecture and dual-storage data flow.
- [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md): Security controls, QR threat model, and zero-secret policy.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): Architectural decision records (D-001 through D-016) and owner sign-offs (FD-01 through FD-08).
