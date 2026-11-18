<div align="center">

# 🥗 FoodCue
### *Know your food. Manage your kitchen.*

A local-first, privacy-conscious packaged food intelligence and kitchen-management Progressive Web Application (PWA).

[![Production Status](https://img.shields.io/badge/Production-Ready-075A35?style=for-the-badge&logo=vercel&logoColor=white)](https://github.com/parth022002/FoodCue)
[![Tests Passing](https://img.shields.io/badge/Tests-290%2F290%20Passing-10B981?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/parth022002/FoodCue)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/parth022002/FoodCue)
[![Vite](https://img.shields.io/badge/Vite-6.0.7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://github.com/parth022002/FoodCue)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech)
[![Clerk](https://img.shields.io/badge/Auth-Clerk%20Identity-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com)
[![License](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)

<br/>

**Architect & Developer:** [Parth Ahuja](https://github.com/parth022002) &bull; **Repository:** [parth022002/FoodCue](https://github.com/parth022002/FoodCue)

<br/>

<img src="docs/screenshots/brand_design_system.png" alt="FoodCue Design System & Product Overview" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />

</div>

---

## 📖 Table of Contents

- [Overview & Problem Statement](#-overview--problem-statement)
- [Key Features & Visual Tour](#-key-features--visual-tour)
  - [1. SmartScan Barcode & Packaging Intelligence](#1-smartscan-barcode--packaging-intelligence)
  - [2. Digital Kitchen & FIFO Expiry Tracking](#2-digital-kitchen--fifo-expiry-tracking)
  - [3. Personalized Authenticated Dashboard](#3-personalized-authenticated-dashboard)
  - [4. Multi-Tenant Household Sharing](#4-multi-tenant-household-sharing)
  - [5. Cloud Sync & Multi-Device Reconciliation](#5-cloud-sync--multi-device-reconciliation)
  - [6. Public Landing & Discovery](#6-public-landing--discovery)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
  - [High-Level Architecture](#high-level-architecture)
  - [SmartScan Processing Pipeline](#smartscan-processing-pipeline)
  - [Multi-Tier Product Resolution](#multi-tier-product-resolution)
- [Deterministic Food Safety & Health Scoring](#-deterministic-food-safety--health-scoring)
- [Security, Privacy & Tenant Isolation](#-security-privacy--tenant-isolation)
- [Tech Stack](#-tech-stack)
- [Project Structure & Canonical Docs](#-project-structure--canonical-docs)
- [Getting Started & Local Development](#-getting-started--local-development)
- [Automated Testing Suite](#-automated-testing-suite)
- [Production Deployment](#-production-deployment)
- [Author & Credits](#-author--credits)

---

## 🌟 Overview & Problem Statement

Modern consumers face complex food packaging, misleading front-of-pack claims, ambiguous E-numbers/INS additives, and rising kitchen food waste. Most existing solutions either force invasive user accounts before basic scanning, upload private camera feeds to third-party cloud servers, or fail completely when offline.

**FoodCue** bridges this gap by providing an **offline-first, zero-mandatory-login kitchen copilot** designed for Indian and international households:

1. **Zero-Friction Offline Access:** 100% functional out of the box with client-side IndexedDB. Scan barcodes, interpret ingredients, and log pantry items without creating an account.
2. **Transient Device Processing:** Camera frames never leave device memory. All barcode detection and OCR happen strictly in-browser via WebAssembly and Web Workers.
3. **Deterministic 0–100 Health Scoring:** Mathematical nutrient profiling penalizing saturated fats, free sugars, sodium, and ultra-processed additives. Missing nutrient data is preserved as `null`—never falsely assumed to be zero.
4. **Collaborative Household Sharing:** Secure family inventory sync with Role-Based Access Control (`admin`, `editor`, `viewer`) and cryptographic link sharing.
5. **Zero-Cash Operational Footprint:** Architected to run entirely on free-tier, production-grade cloud services (Neon Serverless PostgreSQL, Clerk Authentication, Vercel Serverless Functions).

---

## 📸 Key Features & Visual Tour

### 1. SmartScan Barcode & Packaging Intelligence

Scan standard 1D/2D barcodes (EAN-13, EAN-8, UPC-A, UPC-E, QR Code, GS1 Digital Link) in under 100ms. Instantly view nutrient grades, additive warnings, and allergen alerts.

<div align="center">
  <img src="docs/screenshots/smartscan_nutrition_radar.jpg" alt="SmartScan Barcode Scanner & Health Radar" width="90%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

- **Instant Hardware Viewfinder:** Torch/flashlight control, hardware zoom slider, camera switcher, and tap-to-focus.
- **Fail-Closed Allergen Screening:** Cross-references ingredients against user dietary avoid-lists (Gluten, Lactose, Peanuts, Tree Nuts, Soy, Shellfish).
- **INS Additive Explainer:** Demystifies ultra-processed food additives (e.g., INS 621, INS 211, INS 150d) with health risk classifications.

---

### 2. Digital Kitchen & FIFO Expiry Tracking

Track fresh produce, refrigerated items, and packaged groceries with First-In, First-Out (FIFO) consumption tracking.

<div align="center">
  <img src="docs/screenshots/pantry_inventory_view.jpg" alt="Digital Pantry & Inventory Tracking" width="90%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

- **Expiry Urgency Radar:** Color-coded status badges (`Expired`, `Expiring Today`, `Within 3 Days`, `Fresh`).
- **Append-Only Consumption Ledger:** Maintains audit history of purchases, consumptions, and discards.
- **Smart Shopping List:** One-tap movement of depleted items into an interactive shopping checklist.

---

### 3. Personalized Authenticated Dashboard

A unified command center for managing household food supplies, notification preferences, and personalized meal planning.

<div align="center">
  <img src="docs/screenshots/dashboard_authenticated.png" alt="FoodCue Authenticated Workspace Dashboard" width="90%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

- **Summary Metric Cards:** Total stocked items, urgent expiry counts, active shopping items, and shared household members.
- **Quick Action Bar:** Direct access to SmartScan, inventory auditing, recipe discovery, and receipt scanning.
- **Recipe Engine:** Suggests balanced Indian and global recipes matching ingredients currently available in your pantry.

---

### 4. Multi-Tenant Household Sharing

Collaborate with family members, roommates, or household staff in real-time.

<div align="center">
  <img src="docs/screenshots/household_sharing_modal.png" alt="Household Sharing and Member Invitation Flow" width="90%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

- **Role-Based Access Control (RBAC):** Assign granular roles (`Admin`, `Editor`, `Viewer`) to members.
- **Cryptographic Invite Links:** Generate shareable tokens with expiration timestamps, direct clipboard copy, and WhatsApp/SMS share triggers.
- **Multi-Tenant Isolation:** Complete database separation guaranteeing Household A's pantry is strictly invisible to Household B.

---

### 5. Cloud Sync & Multi-Device Reconciliation

Seamlessly synchronize pantry items, shopping lists, and custom labels across laptops, tablets, and smartphones.

<div align="center">
  <img src="docs/screenshots/cloud_sync_devices.png" alt="Cloud Synchronization & Connected Devices Manager" width="90%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

- **Deterministic Last-Write-Wins (LWW):** Vector clocks and timestamps prevent overwrite conflicts during concurrent device edits.
- **Connected Devices Management:** Inspect all logged-in devices, active sessions, and revoke lost devices remotely.
- **Local-to-Cloud Migration Wizard:** Multi-step consumer onboarding that transfers local IndexedDB data safely to Neon PostgreSQL upon sign-in.

---

### 6. Public Landing & Discovery

A clean, responsive public marketing portal highlighting FoodCue's core capabilities, privacy guarantees, and instant sign-in.

<div align="center">
  <img src="docs/screenshots/landing_hero_overview.png" alt="FoodCue Public Landing Page" width="90%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

- **Responsive Viewport Design:** Tested across compact mobile (320px–430px), tablet (768px–1024px), desktop (1440px), and ultrawide (2560px+).
- **Polished Footer:** Simplified navigation, zero-border pill buttons, transparent legal links, and developer attribution.

---

## 🏗️ System Architecture & Data Flow

### High-Level Architecture

FoodCue combines an offline-first client runtime with a serverless edge backend:

<div align="center">
  <img src="docs/screenshots/system_architecture_diagram.png" alt="FoodCue System Architecture Diagram" width="90%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT RUNTIME (PWA)                          │
│                                                                        │
│   React 18 + TypeScript + Vite             IndexedDB (Dexie Storage)   │
│   ┌───────────────────────────────┐        ┌───────────────────────┐   │
│   │ SmartScan (ZXing WASM + OCR)  │        │ • Pantry Items        │   │
│   │ Consumption Event Ledger      │ ◄────► │ • Inventory Events    │   │
│   │ Local Product Cache (500 FMCG)│        │ • Shopping List       │   │
│   │ Conflict Resolution Engine    │        │ • User Preferences    │   │
│   └───────────────────────────────┘        └───────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (Bearer Token Auth)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   VERCEL SERVERLESS EDGE LAYER                         │
│                                                                        │
│   11 Consolidated ESM Handlers (Compliant with Vercel Hobby Quota):    │
│   • /api/health                   • /api/invitations                   │
│   • /api/me                       • /api/sharing                       │
│   • /api/devices                  • /api/account/delete                │
│   • /api/profile                  • /api/notifications/subscribe       │
│   • /api/households (Router)      • /api/sync (Router)                 │
│   • /api/webhooks/clerk (Svix HMAC-SHA256 Cryptographic Ingestion)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Connection Pooling (Neon Serverless)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEON POSTGRESQL DATABASE                        │
│                                                                        │
│   • users                         • sync_operations (Idempotent)       │
│   • user_profiles                 • sync_devices                       │
│   • dietary_preferences           • households                         │
│   • food_allergies                • household_members                  │
│   • food_restrictions             • household_invitations              │
│   • pantry_items                  • foodcue_audit_log                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### SmartScan Processing Pipeline

Camera feed analysis operates completely on-device without streaming video frames to external servers:

<div align="center">
  <img src="docs/screenshots/smartscan_pipeline.png" alt="SmartScan Processing Pipeline" width="85%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

1. **Hardware Capture:** `getUserMedia` stream rendered to an HTML5 `<video>` element with hardware constraints.
2. **Transient Frame Extraction:** Canvas captures video frames in temporary browser memory.
3. **Multi-Format Decoding:** `@sec-ant/zxing-wasm` evaluates barcodes in parallel workers.
4. **Adaptive Preprocessing:** Grayscale conversion, CLAHE contrast enhancement, and adaptive binarization for low-light scanning.

---

### Multi-Tier Product Resolution

When a barcode is decoded, FoodCue queries multiple tiers in order of speed and privacy:

<div align="center">
  <img src="docs/screenshots/multi_tier_resolution.png" alt="Multi-Tier Product Resolution Architecture" width="85%" style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</div>

- **Tier 1 (Instant Offline Catalog):** 500+ curated Indian FMCG products (Amul, Britannia, Parle, Tata, Nestlé, Haldiram's, Dabur) stored locally.
- **Tier 2 (Open Food Facts Database):** Global open-data fallback with compliant attribution.
- **Tier 3 (AI Web Search Engine):** Real-time web retrieval via Tavily for newly launched packaged products.

---

## 🥗 Deterministic Food Safety & Health Scoring

FoodCue computes an objective **0–100 Health Score** based on nutrient densities per 100g/ml:

$$\text{Health Score} = 100 - \left( W_{\text{energy}} \cdot E + W_{\text{satfat}} \cdot SF + W_{\text{sugar}} \cdot S + W_{\text{sodium}} \cdot Na + W_{\text{additives}} \cdot A \right)$$

- **Energy Density Penalty ($E$):** Scaled based on kcal/100g.
- **Saturated Fat Penalty ($SF$):** Penalizes high saturated lipid levels.
- **Free Sugar Penalty ($S$):** Strict penalties for refined added sugars.
- **Sodium Penalty ($Na$):** Highlights high-salt preservation.
- **Ultra-Processed Additive Penalty ($A$):** Deducts points for synthetic emulsifiers, artificial colors, and chemical preservatives.
- **Data Integrity Rule:** If a nutrient value is unlisted on the packaging, it is stored as `null`. It is **never assumed to be zero**, preventing false-positive "healthy" ratings.

---

## 🔒 Security, Privacy & Tenant Isolation

- **Transient Camera Pipeline:** Camera images are never saved to disk, never uploaded to a cloud server, and exist only as temporary pixels in volatile RAM during frame processing.
- **Cryptographic Webhook Validation:** Clerk webhooks (`POST /api/webhooks/clerk`) are authenticated using Svix HMAC-SHA256 signature verification with tolerance replay windows.
- **Multi-Tenant Horizontal Isolation:** Every cloud database operation strictly parameterizes `WHERE clerk_user_id = $1` or `WHERE household_id = $1`. Automated cross-tenant tests verify that User A cannot read or modify User B's inventory.
- **Audit Logging:** Security-critical actions (device authorizations, member revocations, cloud data deletions) are recorded in `foodcue_audit_log`.

---

## 💻 Tech Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript 5.7 | Component architecture & strict type safety |
| **Bundler & Tooling** | Vite 6.0 + esbuild | Fast HMR & optimized production bundling |
| **Local Storage** | IndexedDB via Dexie.js | Offline persistence for pantry & scan ledger |
| **Barcode Engine** | `@sec-ant/zxing-wasm` | Multi-format 1D/2D barcode decoding in WebAssembly |
| **Authentication** | Clerk (`@clerk/react`, `@clerk/backend`) | Session tokens, organizations & user profile |
| **Serverless Backend**| Node.js ESM on Vercel | Consolidated API handlers (11 endpoints) |
| **Cloud Database** | Neon PostgreSQL Serverless | Connection pooling & parameterized persistence |
| **Native Wrappers** | Capacitor Android & iOS | Native camera & mobile packaging |
| **Icons & Styling** | Lucide React & Modern CSS3 | Accessible SVG icons & responsive design system |
| **Testing** | Vitest 2.1 + Testing Library | 290 automated tests covering unit, E2E & security |

---

## 📁 Project Structure & Canonical Docs

```text
FoodCue/
├── api/                             # Compiled Vercel Serverless Function entrypoints (11 ESM)
│   ├── account/delete.js            # Account deletion handler
│   ├── devices/index.js             # Device registration & revocation
│   ├── households/index.js          # Consolidated households & details router
│   ├── sync/index.js                # Consolidated sync (push, pull, migrate, status)
│   ├── health.js                    # Health check & database connection probe
│   ├── me.js                        # Authenticated user profile retrieval
│   ├── notifications/subscribe.js   # Web Push subscription handler
│   ├── profile/index.js             # User profile & dietary preference management
│   ├── sharing/index.js             # Household sharing & access controls
│   ├── invitations/index.js         # Member invitation token validation
│   └── webhooks/clerk.js            # Cryptographic Svix webhook receiver
├── src/
│   ├── adapters/                    # Hardware (camera, OCR, notifications, storage)
│   ├── components/                  # Navigation (Navbar, Footers), Brand (Logo), UI Cards
│   ├── domain/                      # Health scoring, GS1 parsers, safety rules, FMCG catalog
│   ├── features/                    # SmartScan, Pantry, Recipes, Receipts, Devices, Privacy
│   ├── server/                      # TypeScript endpoint implementations, repos, database client
│   └── sync/                        # Local change queue, conflict resolver, transport client
├── docs/
│   ├── screenshots/                 # Product walkthrough images & architecture diagrams
│   ├── architecture/                # System architecture, database schema, technical decisions
│   ├── product/                     # Product requirements, roadmap, user journeys
│   ├── security/                    # Threat modeling, authentication, tenant isolation
│   └── deployment/                  # Production deployment & operations guide
├── test/                            # 51 Vitest test suites (290 tests)
├── vercel.json                      # Vercel deployment & routing configuration
├── vite.config.ts                   # Vite configuration with optimized vendor chunking
└── package.json                     # Dependencies & scripts
```

---

## 🚀 Getting Started & Local Development

### Prerequisites

- **Node.js:** `Node.js >= 20.x` (LTS 20.x or 22.x recommended)
- **Package Manager:** `npm` (included with Node)
- **Database:** Free [Neon](https://neon.tech) PostgreSQL account

### Installation

```bash
# 1. Clone repository
git clone https://github.com/parth022002/FoodCue.git
cd FoodCue

# 2. Install dependencies
npm ci

# 3. Configure environment
cp .env.example .env
```

### Environment Configuration (`.env`)

```env
# Neon PostgreSQL Pooled Connection
DATABASE_URL="postgresql://foodcue_owner:<password>@ep-cool-lake-123456-pooler.us-east-2.aws.neon.tech/foodcue?sslmode=require"

# Clerk Authentication (Get from https://dashboard.clerk.com)
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Web Push Notification VAPID Keys
VITE_VAPID_PUBLIC_KEY="BEl62iUYg..."
VAPID_PRIVATE_KEY="YOUR_VAPID_PRIVATE_KEY"
```

### Running Locally

```bash
# Start local development server (http://127.0.0.1:5173)
npm run dev

# Run full production build (TypeScript + Vite + API bundler)
npm run build

# Preview production build locally
npm run preview
```

---

## 🧪 Automated Testing Suite

FoodCue maintains a comprehensive test suite of **51 test files and 290 individual tests**:

```bash
# Execute full Vitest suite
npm test

# Run tests in watch mode
npm run test:watch

# Execute TypeScript typechecking
npm run typecheck

# Execute ESLint validation
npm run lint
```

```text
✓ test/domain/packBenchmarkEvaluator.test.ts (8 tests)
✓ src/adapters/storage/database.test.ts (8 tests)
✓ test/adapters/notificationService.test.ts (7 tests)
✓ test/server/services/user.service.test.ts (7 tests)
✓ test/safety/foodSafetyAdversarial.test.ts (5 tests)
✓ test/e2e/phase11UserJourneys.test.ts (5 tests)
✓ test/domain/aiNutritionAgents.test.ts (10 tests)
✓ test/server/api/householdIsolation.test.ts (5 tests)
✓ test/server/api/endpoints.test.ts (21 tests)
✓ src/domain/rules/gs1Parser.test.ts (13 tests)
✓ test/features/responsiveDesign.test.tsx (8 tests)
✓ test/features/authAndInviteFlows.test.tsx (6 tests)
...
Test Files: 51 passed (51)
Tests:      290 passed (290)
Result:     100% Passing
```

---

## 🌐 Production Deployment

FoodCue is deployed to [Vercel](https://vercel.com):

1. **Vercel Hobby Plan Compliance:** All serverless routes are packaged into **11 ESM handlers** (well within the 12-function Hobby plan limit).
2. **Fluid Compute Support:** Configured for Active CPU billing with zero deprecated memory overrides.
3. **Automatic Cache Invalidation:** Handled cleanly through `package.json` build scripts.

To deploy your own instance:

```bash
# Push directly to GitHub main branch to trigger Vercel CI/CD
git push origin main
```

---

## 👨‍💻 Author & Credits

- **Creator & Lead Developer:** **Parth Ahuja**
  - **GitHub:** [@parth022002](https://github.com/parth022002)
  - **Email:** [parthahuja021102@gmail.com](mailto:parthahuja021102@gmail.com)
  - **Project:** [FoodCue](https://github.com/parth022002/FoodCue)

---

<div align="center">
  <sub>Built with ❤️ by Parth Ahuja &bull; © 2026 FoodCue. All rights reserved.</sub>
</div>
