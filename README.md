# FoodCue — Know your food. Manage your kitchen.

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
VERSION:               v4.0.0 (Phase 3 Complete: Cloud Transformation & Multi-Device Sync)
DEVELOPER:             Parth Ahuja
PRODUCT BASELINE:      FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT REQUIREMENTS:  FoodCue PRD v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
PRODUCTION URL:        https://food-cue.vercel.app/
REPOSITORY:            https://github.com/parth022002/FoodCue.git
CONTROLLING BUDGET:    INR 0 Cash Target (Zero-Cash Development Baseline)
STATUS:                110/110 Tests Passing | Strict TypeScript | Clean Build
========================================================================================
```

FoodCue is a **local-first, privacy-conscious packaged-food intelligence and kitchen-management Progressive Web Application (PWA)**. It helps households understand packaged-food labels, identify ingredients and allergens, interpret nutritional information, manage kitchen inventory, track expiration dates, and organize pantry stock.

---

## Phase 3: Cloud Transformation & Multi-Device Synchronisation Highlights

- **Persistent Offline Mutation Queue:** IndexedDB v3 store (`syncQueue`) guarantees that any local pantry action, confirmed label, or shopping list modification is persistently queued across tab reloads, browser restarts, and power outages.
- **Delta Push & Pull Endpoints:** Authenticated `/api/sync/push` and `/api/sync/pull` serverless endpoints provide incremental synchronization with cursor tracking and exponential backoff retry.
- **Cryptographic Clerk Webhook Verification:** `POST /api/webhooks/clerk` features native Node.js Svix HMAC SHA-256 verification and an idempotency ledger (`foodcue_webhook_events`) to prevent duplicate processing and replay attacks.
- **Relational Cloud Database (Neon PostgreSQL):** Applied migration `002_sync_engine_and_devices.sql` creating `sync_devices`, `sync_operations`, and tenant isolation columns with strict horizontal privilege security.
- **Local-to-Cloud Migration Wizard:** An interactive, transparent modal that scans local IndexedDB records and requests explicit user consent before uploading a secure copy to the cloud. Zero local data is deleted.
- **Multi-Device Fleet & Remote Revocation:** Users can view all active devices connected to their account and revoke unauthorized sessions directly from their Profile settings.
- **Consumer-Grade Status UX:** Removed all raw technical diagnostic terminology (`Neon: Ready`, connection strings, raw SQL buttons), replacing them with accessible, real-time sync status badges.

---

## Complete Frontend Architecture

- **Sticky Navigation Bar:** Left-aligned brand logo and tagline, clean center navigation pills (`SmartScan`, `My Kitchen`, `Reminders`, `Shopping List`, `Catalogue`), and isolated right-aligned account and privacy controls.
- **Dedicated Right-Side Account Area:** Positioned outside feature navigation. For signed-out visitors, displays `Sign In` and `Sign Up` buttons; for authenticated users, displays Clerk Organization switcher (Household) and custom profile dropdown.
- **Mobile Navigation Drawer & Bottom Bar:** Touch-friendly mobile drawer menu plus fixed 5-button bottom navigation bar (`Scan`, `Kitchen`, `Remind`, `Shop`, `More`) for effortless one-thumb smartphone operation.
- **Comprehensive 8-Section Privacy Page (`/privacy`):** Complete transparency into local-first storage, IndexedDB live quotas, optional Clerk authentication, Neon PostgreSQL sync in AWS Singapore, zero photo upload policy, data export/import, and project author information (**Parth Ahuja**).
- **Responsive 4-Column Consumer Footer:** Multi-column layout with brand, explore links, household/cloud actions, privacy controls, developer credit, and official FSSAI safety disclaimer.

---

## Architecture: Hybrid Local-Plus-Cloud Persistence

- **Primary Storage:** In-browser IndexedDB v3 (100% offline, zero-latency, private, zero cost).
- **Cloud Backup & Sync:** Neon Lakebase Serverless PostgreSQL (Southeast Asia AWS Singapore pooler, sub-30ms latency) accessed over secure HTTP connection pooling (`@neondatabase/serverless`).
- **No Mandatory Accounts:** Usable immediately without registration or login. Optional cross-device sync available via Neon and Clerk.
- **Deterministic Food Rules:** Zero AI-generated safety verdicts. Allergen and nutrition facts are derived strictly from reviewed, versioned deterministic rule sets against verified physical packaging labels (`ConfirmedLabel`).
- **Offline PWA:** Standalone Progressive Web App with Service Worker (`sw.js`) and Web App Manifest (`manifest.webmanifest`).
- **Production Edge Hosting:** Optimized for deployment on **Vercel** (`https://food-cue.vercel.app/`) with standard Node.js serverless functions in `api/`.

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

3. **Pantry Event Ledger:**
   - Append-only event store supporting `intake`, `consume`, `discard`, `move`, `adjust`, and `undo`.
   - Projected inventory with fast lookup and real-time stock balances.
   - Storage condition tracking (`ambient`, `refrigerated`, `frozen`).

4. **Date Tracking & Reminders:**
   - Tracking for `best_before`, `use_by`, and opened shelf life.
   - Color-coded expiry alerts (`expired`, `expiring_soon`, `fresh`).
   - Snooze and actioned reminder workflows.

5. **Smart Shopping List:**
   - Automated replenishment from depleted or low pantry stock.
   - Real-time check-off workflow and categorized grocery views.

6. **Household & Family Sharing (Clerk Organizations):**
   - Multi-user collaboration on a shared family kitchen pantry.
   - Real-time cross-device sync avoiding duplicate grocery shopping.
   - Combined household allergen avoid-list protection.

7. **Multi-Device Synchronization Engine:**
   - Offline mutation queue stored persistently in IndexedDB.
   - Conflict resolution combining append-only event streams and Last-Write-Wins list merging.
   - Device registration, heartbeat, and remote session revocation.

---

## Verification & Quality Assurance

```bash
# Typecheck with TypeScript 5.7 strict mode
npm run typecheck

# Code quality check with ESLint 9
npm run lint

# Run all 110 automated unit and contract tests
npm test

# Execute database migrations against Neon PostgreSQL
npm run db:migrate

# Build production bundle
npm run build
```

---

## Developer & Attribution

Developed with passion by **Parth Ahuja**.  
- **Email:** [parthahuja2002@gmail.com](mailto:parthahuja2002@gmail.com)  
- **GitHub:** [https://github.com/parth022002/FoodCue](https://github.com/parth022002/FoodCue)  
- **Live URL:** [https://food-cue.vercel.app/](https://food-cue.vercel.app/)  

FoodCue is built with a strict adherence to open standards, zero user surveillance, and zero-cash engineering.
