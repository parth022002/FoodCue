# FoodCue — Feature Dependency & Technical Architecture Matrix

**Audit Date:** November 2026  
**Repository Baseline:** `27945c0`  
**Test Suite Coverage:** 42 test suites / 235 passing tests

---

## 1. Feature-by-Feature Dependency Matrix

| Application Feature | Primary Underlying Engine / Service | External API Key Required? | Configuration & Permissions Needed | Operational Mode | Live Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Product Scanning** | WebAssembly ZXing (`@sec-ant/zxing-wasm`) + native `BarcodeDetector` | **NO** (100% on-device) | Browser camera access (`getUserMedia`); Served over secure HTTPS | Client-side Wasm | **Working & Verified** (Tested in `smartscanViewfinder.test.tsx`) |
| **Product Identification** | `ProductIdentificationAgent` + GTIN-13/EAN-8/UPC-A GS1 Parser | **NO** | Local algorithm | Client-side TypeScript | **Working & Verified** (Tested in `gs1Parser.test.ts` & `gtin.test.ts`) |
| **Nutritional Information (18+ Nutrients)** | `NutritionAnalysisAgent` with data provenance tracking (`verified_pack`, `database_reported`) | **NO** | Local standardizer conforming to ICMR-NIN & FSSAI | Client-side TypeScript | **Working & Verified** (Tested in `aiNutritionAgents.test.ts`) |
| **Branded & Generic Product Search** | `InternetResearchAgent` (Verified Indian Catalog + Open Food Facts mirror) | **NO** | Configured `User-Agent` HTTP header | Multi-source (Local + Open REST) | **Working & Verified** (Tested in `internetProductSearch.test.tsx`) |
| **Packaging Label OCR** | `LocalOcrAdapter` + Dedicated Web Worker (`ocrWorker.ts`) + Canvas Luminance Processor | **NO** | Mobile Web Worker support | Client-side Web Worker | **Working & Verified** (Tested in `localOcrAdapter.test.ts` & `ocrWorker.test.ts`) |
| **Food Health Scoring (0–100)** | `FoodHealthEvaluationAgent` (Algorithmic WHO/FSSAI profiling model) | **NO** | Transparent deterministic scoring rules | Client-side TypeScript | **Working & Verified** (Tested in `aiNutritionAgents.test.ts`) |
| **Additive Translation (INS/E-numbers)** | `IngredientAnalysisAgent` with built-in INS additive knowledge dictionary | **NO** | Local plain-English translation table | Client-side TypeScript | **Working & Verified** (Tested in `aiNutritionAgents.test.ts`) |
| **Allergy & Dietary Conflict Guard** | `PersonalizedRecommendationAgent` cross-referenced with user avoid-lists | **NO** | User profile preferences (Milk, Gluten, Soy, Nuts, etc.) | Client-side TypeScript | **Working & Verified** (Tested in `aiNutritionAgents.test.ts`) |
| **User Authentication & Profiles** | Clerk React SDK (`@clerk/react`) + Clerk Backend SDK (`@clerk/backend`) | **YES** (`pk_test_...` or `pk_live_...`, `sk_test_...` or `sk_live_...`) | Clerk Application Dashboard, allowed origins, redirect URLs | Cloud SaaS Auth | **Working & Verified** (`200 OK` Clerk API response verified) |
| **Cryptographic Webhook Sync** | `/api/webhooks/clerk` with Svix HMAC-SHA256 signature verification | **YES** (`CLERK_WEBHOOK_SIGNING_SECRET`) | Clerk Dashboard webhook endpoint subscription (`user.created/updated/deleted`) | Vercel Serverless Function | **Working & Verified** (Live delivery checkmarks verified) |
| **User-Isolated Private Catalogue** | `userCatalogueService.ts` backed by IndexedDB + Neon relational sync | **NO** for guest; Database URI for sync | Strict tenant barrier (`clerk_user_id`); User must explicitly click "Save" | Local-first + Cloud Postgres | **Working & Verified** (Tested in `userCatalogueView.test.tsx`) |
| **Kitchen & Pantry Inventory** | `pantryLedger.ts` immutable event sourcing engine (`foodcue_pantry_items`) | **NO** for offline; Database URI for sync | IndexedDB local storage + Neon cloud tables | Local-first Event Sourcing | **Working & Verified** (Tested in `pantryLedger.test.ts`) |
| **Expiry Reminders & Notifications** | `notificationService.ts` with quiet hours filtering + Web Push manager | **NO** for in-app; Browser notification prompt | User grants browser `Notification.requestPermission()` | Client-side + Web Push API | **Working & Verified** (Tested in `notificationService.test.ts`) |
| **Image & Media Storage** | **Zero-Retention Ephemeral Memory Pipeline** | **NO** (No S3/Cloudinary needed) | None. Scanned images are processed in-memory and immediately destroyed | Ephemeral Memory | **Working & Verified** (Zero token leak architectural invariant) |
| **Multi-Device Cloud Synchronization** | `/api/sync/push`, `/api/sync/pull`, `/api/sync/migrate` with Lamport timestamp conflict resolution | **YES** (`DATABASE_URL`, `CLERK_SECRET_KEY`) | Neon Serverless PostgreSQL instances (`sync_operations`, `sync_devices`) | Vercel Serverless + Neon | **Working & Verified** (Tested in `conflictResolver.test.ts` & `offlineResilience.test.ts`) |
| **Hosting & Global Delivery** | Vercel Edge CDN + Serverless Node.js 20+ Runtime | Vercel Account | `vercel.json` rewrites and HTTPS security headers | Global Edge Cloud | **Working & Verified** (`npm run build` bundles all endpoints) |

---

## 2. Invariant & Architecture Highlights

1. **Zero External Dependence for Core Health Evaluation:**
   A user can download the PWA, go completely offline into airplane mode, scan a barcode from our 500-SKU catalog or enter nutrition numbers manually, and receive instant 0–100 health scoring, allergen conflict warnings, and kitchen inventory updates without touching a single cloud server.

2. **Zero-Cash Expenditure (INR 0.00 Target):**
   - **Clerk:** Free up to 10,000 monthly active users (MAU).
   - **Neon:** Free 0.5 GiB serverless compute and storage with auto-suspend.
   - **Vercel:** Free Hobby tier with unlimited edge bandwidth for personal and startup usage.
   - **Open Food Facts:** Free open-source food database.
   - **ZXing / OCR:** Free on-device open-source libraries.
