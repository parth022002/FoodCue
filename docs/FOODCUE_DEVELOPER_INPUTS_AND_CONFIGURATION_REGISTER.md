# FOODCUE DEVELOPER INPUTS AND CONFIGURATION REGISTER
**A Definitive Technical Reference for Project Owner Inputs, Credentials, Assets, and System Configuration**

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
DOCUMENT TITLE:        FoodCue Developer Inputs and Configuration Register
DOCUMENT VERSION:      v2.0 (Postgres Cloud Ready & Master Services Register)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT SPECIFICATION: FoodCue Product Development Requirements Document (PRD) v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
BRAND AUTHORITY:       FoodCue Brand Guidelines & Web Design System v1.0
CONTROLLING BUDGET:    INR 0 Cash Target (Zero-Cash Development Baseline)
STATUS:                Approved Production Register — Elimination of Developer Uncertainty
========================================================================================
```

---

## Executive Principle: The Zero-Cash, Zero-Server Baseline & Dual Cloud Pattern

> **ARCHITECTURAL SUMMARY:**  
> FoodCue is intentionally architected as a **local-first Progressive Web Application (PWA)** that runs entirely in the user's browser. Barcode decoding, OCR, candidate matching, deterministic food-intelligence rules, the append-only pantry ledger, and data persistence operate primarily on the client device using browser-native APIs, WebAssembly, and IndexedDB.
>
> In addition, FoodCue incorporates a **Dual-Storage Cloud Architecture**:
> - **Primary Storage:** In-browser IndexedDB (100% offline, zero-latency, private, zero-cost).
> - **Cloud Backup & Multi-Device Sync:** Neon Lakebase Serverless PostgreSQL accessed securely over HTTP/WebSocket connection pooling (`@neondatabase/serverless`).
> - **Zero Mandatory Accounts:** Users can use FoodCue anonymously out-of-the-box without sign-up. Optional account creation (Clerk) and cloud backup (Neon) remain user-initiated.

---

# Section A: Master Services & API Keys Register

The table below catalogs all core and optional APIs, keys, and cloud configurations required for development, testing, and production deployment.

| Service / API | Provider | Purpose / Module | Necessity | Environment Variable | Secret / Public? | Configuration Location | Status |
|---|---|---|---|---|---|---|---|
| **Neon PostgreSQL** | Neon Lakebase (`neon.tech`) | Cloud database backup & multi-device sync (10 tables) | **Active & Connected** | `VITE_NEON_DATABASE_URL` | Public Pooler Endpoint | `.env`, Vercel Dashboard | **Configured & Migrated (10 Tables Active)** |
| **GitHub API & Repo** | GitHub | Version control, CI/CD Actions, collaborative source | **Required** | `GITHUB_TOKEN` | Secret (CI runner only) | `.github/workflows/ci.yml` | **Configured (`parth022002/FoodCue.git`)** |
| **OpenRouter API** | OpenRouter (`openrouter.ai`) | Assistive vision/OCR fallback for damaged Indian labels | **Optional (Phase 2)** | `OPENROUTER_API_KEY` | **Strictly Secret** (Edge proxy only) | `.env`, `.env.local`, Vercel Secrets | **Configured & Key Saved in .env** |
| **Clerk API** | Clerk (`clerk.com`) | Optional user authentication & cross-device identity | **Optional (Phase 2)** | `VITE_CLERK_PUBLISHABLE_KEY`<br>`CLERK_SECRET_KEY` | Publishable in frontend; Secret on Edge | `.env`, `.env.local`, Vercel Secrets | **Configured & Active (App: `app_3MC7...` in .env)** |
| **Groq API** | Groq (`groq.com`) | Ultra-fast Whisper voice intake for pantry unpack mode | **Optional (Phase 2)** | `GROQ_API_KEY` | **Strictly Secret** (Edge proxy only) | `.env`, `.env.local`, Vercel Secrets | **Configured & Key Saved in .env** |
| **OpenFoodFacts API** | Open Food Facts | Crowdsourced GTIN metadata fallback lookup | **Optional (Baseline)** | None (Public API) | Public (Requires User-Agent) | `src/adapters/catalogue/` | User-initiated only; compliant User-Agent |
| **Vercel CLI / Token** | Vercel (`vercel.com`) | Edge CDN deployment, CI/CD preview environments | **Required (Hosting)** | `VERCEL_TOKEN` | Secret (CI/CD only) | GitHub Secrets / Vercel CLI | **Configured (`vercel.json` deployed)** |
| **PostHog / Sentry** | Sentry / PostHog | Opt-in error reporting & diagnostic crash telemetry | **Optional (Phase 3)** | `VITE_SENTRY_DSN` | Public Client DSN | `.env` | Scrubbed PII only; disabled by default |

---

# Section B: Deep-Dive API Specifications & Credentials

### 1. Neon Lakebase PostgreSQL Connection
- **Endpoint:** `ep-snowy-mode-b3jn52y5-pooler.c-4.ap-southeast-1.aws.neon.tech`
- **Region:** Southeast Asia (AWS Singapore `ap-southeast-1`) — Optimized for sub-50ms latency across India.
- **Protocol:** Serverless WebSocket / HTTP connection pooler (`sslmode=require&channel_binding=require`).
- **Database Driver:** `@neondatabase/serverless` (v0.10.4 / v1.2.1) — Executes queries over stateless HTTP fetch; zero raw TCP socket blocks on mobile networks or corporate firewalls.
- **Client Configuration:**
  ```env
  VITE_NEON_DATABASE_URL="postgresql://neondb_owner:npg_cKRineBy5q8d@ep-snowy-mode-b3jn52y5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  VITE_ENABLE_NEON_SYNC="true"
  ```
- **Live Active Schema (10 Tables Ready):**
  1. `foodcue_users` (Local & Clerk authenticated users)
  2. `foodcue_profiles` (Allergen avoid-lists, diet preferences, Calm Mode)
  3. `foodcue_catalog` (Verified packaged food catalog with FSSAI licenses)
  4. `foodcue_confirmed_labels` (Physical pack verification records & hashes)
  5. `foodcue_pantry_items` (Projected stock inventory)
  6. `foodcue_pantry_events` (Append-only immutable event ledger)
  7. `foodcue_reminders` (Expiry dates, best-before, opened-on alerts)
  8. `foodcue_shopping_list` (Replenishment items & depleted stock)
  9. `foodcue_intelligence_rules` (Deterministic rule definitions & mappings)
  10. `foodcue_audit_log` (Tamper-evident privacy & security ledger)

---

### 2. GitHub API & Repository Configuration
- **Repository URL:** `https://github.com/parth022002/FoodCue.git`
- **Branch Strategy:**
  - `main`: Production release branch deployed directly to Vercel.
  - `preview/*` or PR branches: Vercel automatic preview deployments with isolated database branching.
- **Personal Access Token (PAT) Scopes (for CI/CD):**
  - `repo` (Full control of private repositories)
  - `workflow` (Update GitHub Action workflows)
  - `read:packages` (Download dependencies if hosted)
- **CI/CD Workflow (`.github/workflows/ci.yml`):**
  - Triggers on every pull request and push to `main`.
  - Runs `npm run typecheck`, `npm test`, and `npm run build`.

---

### 3. OpenRouter API (Phase 2 Assistive AI / Vision Fallback)
- **Status:** **Active & Key Saved** (Configured securely in gitignored `.env` and `.env.local`).
- **Purpose:** Fallback transcription of low-contrast or physically damaged packaging panels (e.g., curved foil pouches, faint dot-matrix inkjet expiration stamps).
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Recommended Free & Low-Cost Vision Models:**
  - `google/gemini-2.0-flash-exp:free` (0 cost, ultra-high OCR accuracy)
  - `meta-llama/llama-3.2-11b-vision-instruct:free` (Open source, fast transcription)
  - `qwen/qwen-2.5-vl-72b-instruct` (High performance on multilingual Indian packaging)
- **Security & Safety Directive:**
  - **Never expose `OPENROUTER_API_KEY` in public frontend source code or git commits.**
  - Stored in gitignored `.env` / `.env.local` and deployed to Vercel Environment Variables.
  - Calls must route through a Vercel Serverless/Edge Function (`/api/ocr-assist`).
  - **Prompt Sandbox:** The system prompt must enforce strictly structured JSON output:
    ```text
    "Transcribe the printed text in this packaging image verbatim. Do NOT make food safety claims. Do NOT classify allergen safety. Return only { raw_text: string, confidence: number }."
    ```

---

### 4. Clerk API (User Authentication & Multi-Device Sync)
- **Status:** **Active & Integrated** (Application: `app_3MC7IlXNBCw4NVWOxhqO29cod7r`).
- **Purpose:** Optional user accounts for household sharing and cross-device sync.
- **Zero-Account Guarantee:** FoodCue operates 100% locally by default without requiring an account. Users only encounter Clerk if they explicitly click *"Sign In"* or *"Enable Multi-Device Cloud Sync"*.
- **Key Configuration:**
  - `VITE_CLERK_PUBLISHABLE_KEY`: `pk_test_...` (Exposed to client for `<ClerkProvider>`)
  - `CLERK_SECRET_KEY`: `sk_test_...` (Server/Edge Function only for token verification)
  - `CLERK_WEBHOOK_SECRET`: `whsec_...` (Synchronizes user creation to `foodcue_users` table in Neon)
- **Client Integration:**
  - Package: `@clerk/react` (Core 3)
  - Global wrapper: `<ClerkProvider publishableKey={...}>` in `src/main.tsx`
  - Auth Controls: `<Show when="signed-out"><SignInButton /></Show>` and `<Show when="signed-in"><UserButton /></Show>` in topbar and Profile view.

---

### 5. Groq API (High-Speed Kitchen Audio & OCR Post-Processing)
- **Status:** **Active & Key Saved** (Configured securely in gitignored `.env` and `.env.local`).
- **Purpose:**
  1. **Hands-free Kitchen Voice Intake:** Whisper large turbo parses natural speech while cooking: *"FoodCue, unpack 2 liters of milk and 1 loaf of bread into the fridge."*
  2. **Instant Additive Regex Mapping:** Sub-50ms regex parsing of multi-line ingredient statements.
- **Endpoint:** `https://api.groq.com/openai/v1`
- **Models:**
  - `whisper-large-v3-turbo` (Speech-to-text; ~$0.04 / hour of audio)
  - `llama-3.3-70b-versatile` (Fast inference at 250+ tokens/sec)
- **Environment Variable:** `GROQ_API_KEY` (Stored in gitignored `.env`, `.env.local`, and Vercel Edge Secrets).

---

### 6. OpenFoodFacts API (GTIN Metadata Fallback)
- **Purpose:** User-initiated product candidate lookup when a physical barcode is scanned but not found in the local verified Indian catalog.
- **Endpoint:** `https://world.openfoodfacts.org/api/v2/product/{gtin}.json`
- **Authentication:** None required (100% Free / Open Database).
- **Mandatory Compliance Header:**
  ```http
  User-Agent: FoodCue-PWA/1.0 (contact: parth022002@github.com)
  ```
- **Privacy Rule:** Only the numerical GTIN (e.g. `8901058852331`) is transmitted. Photos, user location, pantry inventory, and avoid-lists are **NEVER** sent to OpenFoodFacts.

---

# Section C: Deployment Strategy — Vercel vs Render vs Cloudflare

### Definitive Recommendation: **Deploy on Vercel ONLY**

| Evaluation Criteria | Vercel (Recommended) | Render | Cloudflare Pages |
|---|---|---|---|
| **Fit for FoodCue Architecture** | **10/10 (Perfect)** — Native Vite/React SPA + Edge Serverless + Neon Serverless HTTP | **5/10 (Sub-optimal)** — Designed for long-running Docker/Express daemons | **9/10 (Strong)** — Excellent static CDN |
| **Zero-Cash Free Tier** | **Generous**: 100 GB bandwidth, unlimited preview branches, instant Git deploys | **Restricted**: Free web services spin down after 15 min of inactivity (50s cold start) | **Generous**: Unlimited bandwidth, fast builds |
| **Neon Postgres Compatibility** | **Native Integration**: Neon Vercel integration, zero-latency serverless edge queries | Requires persistent pooling or Docker env | Works via Workers / Serverless |
| **Edge Functions for Secret APIs** | Built-in `/api/*` serverless edge functions for OpenRouter / Groq / Clerk | Requires spinning up a separate Express/FastAPI Node container | Cloudflare Workers required |
| **PWA & SPA Routing** | Handled natively by `vercel.json` rewrites (`/(.*) -> /index.html`) | Requires custom static routing or express catch-all | Requires `_redirects` file |
| **Operational Overhead** | **Zero**: Connect GitHub repo `parth022002/FoodCue` and click Deploy | High: Dockerfiles, port binding, container memory limits | Low: Connect repo |

### Why NOT Render for the Baseline?
1. **Cold Start Latency:** Render's free tier spins down services after 15 minutes. When a user opens FoodCue at the grocery store to scan a barcode, a 50-second cold-start delay is completely unacceptable for mobile UX.
2. **Unnecessary Daemon:** FoodCue has no continuous backend server daemon. Its database connection is serverless HTTP via `@neondatabase/serverless`. Paying for or managing a 24/7 Node server on Render adds complexity with zero architectural benefit.
3. **Verdict:** Deploy to **Vercel** as the primary host. If a heavy Python machine-learning model (e.g. custom PyTorch OCR/YOLO) is ever developed in Phase 3, Render can host that dedicated microservice while Vercel serves the user-facing PWA.

---

# Section D: Production Database Architecture (10 Tables)

The complete relational schema has been compiled into `docs/schema.sql` and deployed to the active Neon PostgreSQL database.

```mermaid
erDiagram
    foodcue_users ||--o{ foodcue_profiles : has
    foodcue_users ||--o{ foodcue_pantry_items : owns
    foodcue_users ||--o{ foodcue_pantry_events : logs
    foodcue_users ||--o{ foodcue_reminders : receives
    foodcue_users ||--o{ foodcue_shopping_list : maintains
    foodcue_catalog ||--o{ foodcue_pantry_items : references
    foodcue_catalog ||--o{ foodcue_confirmed_labels : verifies
    foodcue_pantry_items ||--o{ foodcue_pantry_events : mutates
    foodcue_pantry_items ||--o{ foodcue_reminders : triggers
```

### Table 1: `foodcue_users`
- Primary user identity table supporting both local anonymous sessions and authenticated Clerk accounts.
- Columns: `user_id` (PK), `clerk_id` (UNIQUE), `email`, `display_name`, `is_anonymous` (BOOLEAN), `device_fingerprint`, `created_at`, `last_active_at`.

### Table 2: `foodcue_profiles`
- User health, dietary, and UI configuration.
- Columns: `profile_id` (PK), `user_id` (FK), `allergens_to_avoid` (TEXT[]), `ingredients_to_avoid` (TEXT[]), `dietary_preference` (VARCHAR), `calm_mode` (BOOLEAN), `theme` (VARCHAR), `emergency_contact_number` (VARCHAR, default '112'), `enable_cloud_backup` (BOOLEAN), `updated_at`.

### Table 3: `foodcue_catalog`
- Verified packaged food master registry with FSSAI licenses and complete nutritional profiles.
- Columns: `catalog_id` (PK), `gtin` (VARCHAR(14) UNIQUE), `brand`, `product_name`, `variant`, `pack_size`, `category`, `fssai_licence`, `ingredients_text`, `allergen_declaration`, `cross_contact_statement`, `serving_size`, `servings_per_pack`, `nutrition_facts` (JSONB), `ins_additives` (TEXT[]), `image_front_url`, `image_back_url`, `verified` (BOOLEAN), `verified_by`.

### Table 4: `foodcue_confirmed_labels`
- Audit trail of user-verified physical packaging captures from SmartScan.
- Columns: `label_id` (PK), `candidate_id`, `gtin`, `user_id`, `physical_identity`, `label_version`, `lot_number`, `date_marking_type`, `date_marking_value`, `panels` (JSONB), `raw_ocr_evidence` (JSONB), `field_states` (JSONB), `content_hash`, `confirmed_at`.

### Table 5: `foodcue_pantry_items`
- Current projected kitchen inventory balances.
- Columns: `item_id` (PK), `user_id`, `catalog_id` (FK), `gtin`, `product_name`, `brand`, `current_quantity`, `unit`, `location` (pantry/fridge/freezer/use_soon), `storage_condition`, `lot_number`, `date_type`, `date_value`, `opened_at`, `status` (active/depleted/discarded), `updated_at`.

### Table 6: `foodcue_pantry_events`
- **Append-only immutable event ledger.** Primary source of truth for all inventory changes.
- Columns: `event_id` (PK), `item_id`, `user_id`, `event_type` (intake/consume/discard/move/adjust/undo), `quantity_delta`, `unit`, `location`, `date_type`, `date_value`, `note`, `compensating_event_id`, `source`, `occurred_at`, `created_at`.

### Table 7: `foodcue_reminders`
- Date tracking for best-before dates, use-by dates, and opened shelf life.
- Columns: `reminder_id` (PK), `item_id`, `user_id`, `title`, `reminder_type`, `target_date`, `snooze_count`, `last_snoozed_at`, `status` (pending/snoozed/actioned/dismissed).

### Table 8: `foodcue_shopping_list`
- Replenishment list generated automatically from depleted kitchen stock or manual entry.
- Columns: `list_item_id` (PK), `user_id`, `gtin`, `product_name`, `brand`, `category`, `requested_quantity`, `unit`, `checked` (BOOLEAN), `source` (manual/depleted_stock), `notes`, `updated_at`.

### Table 9: `foodcue_intelligence_rules`
- Deterministic rules and additive mappings versioned for compliance.
- Columns: `rule_id` (PK), `rule_name`, `category` (allergen/additive/nutrition/claim), `pattern_regex`, `consequence_level` (info/advisory/warning/critical), `legal_reference` (e.g. FSSAI FSSR 2020), `explanation_template`, `version`, `active`.

### Table 10: `foodcue_audit_log`
- Tamper-evident privacy and security log tracking data export, cloud sync, and wipe events.
- Columns: `audit_id` (PK), `user_id`, `action`, `resource_type`, `resource_id`, `details` (JSONB), `ip_hash`, `created_at`.

---

# Section E: Vercel Deployment Configuration (`vercel.json`)

The following `vercel.json` is deployed in the root directory to ensure seamless SPA routing, cache optimization, and security headers:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), geolocation=(), microphone=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

```text
========================================================================================
END OF FOODCUE DEVELOPER INPUTS AND CONFIGURATION REGISTER (v2.0)
========================================================================================
```
