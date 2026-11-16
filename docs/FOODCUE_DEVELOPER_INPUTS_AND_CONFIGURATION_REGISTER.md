# FOODCUE DEVELOPER INPUTS AND CONFIGURATION REGISTER
**A Definitive Technical Reference for Project Owner Inputs, Credentials, Assets, and System Configuration**

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
DOCUMENT TITLE:        FoodCue Developer Inputs and Configuration Register
DOCUMENT VERSION:      v1.0 (Controlled Release Baseline)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT SPECIFICATION: FoodCue Product Development Requirements Document (PRD) v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
BRAND AUTHORITY:       FoodCue Brand Guidelines & Web Design System v1.0
CONTROLLING BUDGET:    INR 0 Cash Target (Zero-Cash Development Baseline)
STATUS:                Approved Configuration Register — Elimination of Developer Uncertainty
========================================================================================
```

---

## Executive Principle: The Zero-Cash, Zero-Server Baseline

> **CRITICAL ARCHITECTURAL DIRECTIVE:**  
> **No external API keys, paid cloud services, backend servers, third-party authentication providers, cloud databases, or AI model endpoints are required for the FoodCue L0/L1 baseline release.**  
>  
> FoodCue is intentionally architected as a **local-first Progressive Web Application (PWA)** that runs entirely in the user's browser. Image capture, barcode decoding, optical character recognition (OCR), candidate matching, deterministic food-intelligence rules, the append-only pantry ledger, and data persistence operate exclusively on the client device using browser-native APIs, WebAssembly, Web Workers, and IndexedDB.
>
> The developer agent will **never** ask the project owner to purchase subscriptions, generate paid API keys, or create server infrastructure for the baseline implementation.

---

# Section A: Owner Input Summary

| Input Category | Item Description | Current Status | Development Phase | Owner Action Required |
|---|---|---|---|---|
| **Available Now** | Master Specification v13.5 | Available | Phase 0 | Approved canonical authority |
| **Available Now** | Product Requirements Document v1.3 | Available | Phase 0 | Approved product layer |
| **Available Now** | Security, Privacy & Safety Requirements v1.0 | Available | Phase 0 | Approved security baseline |
| **Available Now** | Brand Guidelines & Web Design System v1.0 | Available | Phase 0 | Approved visual identity standard |
| **Available Now** | Master Validation Workbook v13.5 (137 tasks) | Available | Phase 0 | Approved live control instrument |
| **Available Now** | System Architecture Diagram v1.0 | Available | Phase 0 | Approved architectural model |
| **Available Now** | User Journey Diagram v1.0 | Available | Phase 0 | Approved UX flow model |
| **Available Now** | Brand Logo Raster Reference (`Logo.png`) | Available | Phase 1 | Reference raster art provided |
| **Available Now** | Favicon Raster Reference (`Favicon.png`) | Available | Phase 1 | Reference raster art provided |
| **Available Now** | Starter Codebase v0.1.0 (`foodcue Code/`) | Available | Phase 0 | React 18 + TS 5.7 + Vite scaffold |
| **Missing — Needed Now** | Formula_QA Recalculation & Execution | Missing | Phase 0 | Open workbook, recalculate, run Test IDs 29 & 30–39 |
| **Missing — Needed Now** | Clean Vector Master Brand Assets (SVG) | Missing | Phase 1 | Export `foodcue-logo.svg` & `foodcue-icon.svg` |
| **Missing — Needed Now** | Multi-Resolution PWA App Icons | Missing | Phase 1 | Generate 192x192, 512x512, and 180x180 icons |
| **Missing — Needed Later** | 100-Pack Verified Physical Benchmark Set | Missing | Phase 2 | Photograph & transcribe 100 Indian food packs |
| **Missing — Needed Later** | Qualified Allergen Mapping Sign-Off | Missing | Phase 2 | Food scientist review of FSSAI allergen lexicon |
| **Missing — Needed Later** | Static Hosting Platform Selection | Missing | Phase 3 | Create free Cloudflare Pages or GitHub Pages account |
| **Optional — Baseline** | Open Food Facts API Integration | Optional | Phase 2 | Public read-only API; no key required; GTIN only |
| **Optional — Baseline** | Custom Domain Name & DNS | Optional | Phase 3 | Register domain (e.g. `foodcue.app` or `foodcue.in`) |
| **Phase 2 — Deferred** | Generative AI Model Provider API Key | Deferred | Phase 2 | Explicitly excluded from L0/L1 baseline |
| **Phase 2 — Deferred** | Cloud Database / Backend Infrastructure | Deferred | Phase 2 | Explicitly excluded from L0/L1 baseline |
| **Phase 2 — Deferred** | User Authentication Provider (Clerk/Auth0) | Deferred | Phase 2 | Explicitly excluded from L0/L1 baseline |
| **Phase 2 — Deferred** | Push Notification / WhatsApp Messaging | Deferred | Phase 2 | Explicitly excluded from L0/L1 baseline |
| **Not Needed** | Cloud OCR API (Google Vision / AWS Rekognition) | Not Needed | None | Prohibited; replaced by local browser OCR |
| **Not Needed** | Third-Party Analytics SDK (Mixpanel / GA) | Not Needed | None | Prohibited in privacy-first baseline |
| **Not Needed** | Paid Barcode Lookup Subscription | Not Needed | None | Prohibited; zero cash spend target |

---

# Section B: API Keys and External Services Register

This register conducts an exhaustive audit of all potential external services and establishes their precise requirement tier for FoodCue.

| Service Category | Potential Service / Provider | Purpose / Function | Requirement Tier | Current Status | Free Tier Available? | Owner Input Needed | Environment Variable | Config Location | Security & Privacy Notes | Free / Open-Source Alternative | Approval Required |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **OCR Engines** | Google Cloud Vision API | Cloud optical character recognition | **Not Required (Prohibited)** | Not Applicable | Yes (1,000 requests/mo) | None | N/A | N/A | **Prohibited.** Transmits user photos to external servers. Violates zero-cash and local-privacy principles. | **Local PaddleOCR.js / Tesseract.js in Web Worker** | No (Rejected) |
| **OCR Engines** | AWS Rekognition | Cloud image analysis & text detection | **Not Required (Prohibited)** | Not Applicable | Yes (12 months free tier) | None | N/A | N/A | **Prohibited.** Requires cloud credentials and external image transmission. | **Local browser WebAssembly OCR** | No (Rejected) |
| **OCR Engines** | PaddleOCR.js (Local) | In-browser client-side OCR execution | **Required (Primary Candidate)** | Spike Pending | 100% Free / Open Source (Apache-2.0) | None | None | Bundled locally in `public/models/` | Processes images strictly in device memory. Zero network calls. | Built-in browser engine candidate | **Yes (Owner approves spike FD-02)** |
| **OCR Engines** | Tesseract.js (Local) | In-browser WebAssembly OCR fallback | **Required (Comparison Candidate)** | Spike Pending | 100% Free / Open Source (Apache-2.0) | None | None | Bundled locally in `public/models/` | Processes images strictly in device memory. Zero network calls. | Local WebAssembly engine | **Yes (Owner approves spike FD-02)** |
| **Barcode & Codes** | Browser Native BarcodeDetector | Mobile hardware barcode decoding | **Required (Progressive Enhancement)** | Scaffolded (Unwired) | Built-in browser capability | None | None | Browser native API | Local execution. Zero external calls. Limited browser compatibility. | Built-in standard Web API | Pre-approved in v13.5 |
| **Barcode & Codes** | ZXing-WASM (`@sec-ant/zxing-wasm`) | Portable WebAssembly 1D/2D code decoder | **Required (Primary Engine)** | Spike Pending | 100% Free / Open Source (Apache-2.0) | None | None | Bundled locally in app bundle | Decodes EAN-13, EAN-8, UPC-A, UPC-E, QR, DataMatrix in Web Worker. Local only. | Bundled WebAssembly | **Yes (Owner approves spike FD-02)** |
| **Product Data** | Open Food Facts API v3.6 | Candidate product metadata lookup | **Optional (Baseline Candidate)** | Not Connected | 100% Free (ODbL / Database License) | **None (No API Key Required)** | None | `src/adapters/catalogue/` | User-initiated only. Transmits strictly validated GTIN. Discloses IP exposure to user. No photos/OCR sent. | Local offline seed database in IndexedDB | **Yes (Owner approves lookup FD-04)** |
| **Product Data** | BarcodeLookup.com / UPCitemdb | Commercial barcode database | **Not Required (Prohibited)** | Not Applicable | Paid subscriptions ($99+/mo) | None | N/A | N/A | **Prohibited.** Violates INR 0 cash constraint. Paid subscription model. | Open Food Facts public API | No (Rejected) |
| **Standards** | GS1 URI Syntax & Digital Link | GS1 QR 2D code structure validation | **Required (Offline Module)** | Planned | Open Standard (GS1 ref.gs1.org) | None | None | `src/domain/rules/gs1Parser.ts` | Local parser module. Evaluates syntax offline without network calls. | Custom pure TypeScript GS1 parser | Pre-approved in v13.5 |
| **AI & LLM** | OpenAI API (GPT-4o) | Generative explanations & chatbot | **Phase 2 (Deferred)** | Excluded | Paid API ($/token) | None in Baseline | `OPENAI_API_KEY` (Future) | Server-side only (Future) | **Prohibited in Baseline.** AI must never generate or override food safety verdicts. No client keys. | Deterministic reviewed rule packs | **Yes (Future Gate required)** |
| **AI & LLM** | Anthropic API (Claude 3.5) | Text reasoning & label explanation | **Phase 2 (Deferred)** | Excluded | Paid API ($/token) | None in Baseline | `ANTHROPIC_API_KEY` (Future) | Server-side only (Future) | **Prohibited in Baseline.** Cannot set allergen or nutrition states. | Deterministic reviewed rule packs | **Yes (Future Gate required)** |
| **AI & LLM** | Google Gemini API | Multimodal label understanding | **Phase 2 (Deferred)** | Excluded | Free tier (Google AI Studio) | None in Baseline | `GEMINI_API_KEY` (Future) | Server-side only (Future) | **Prohibited in Baseline.** Multimodal inference requires server proxy. Client keys forbidden. | Local browser OCR + deterministic rules | **Yes (Future Gate required)** |
| **RAG & Vectors** | Pinecone / Weaviate / Qdrant | Vector database for food information | **Phase 2 (Deferred)** | Excluded | Limited free tiers | None in Baseline | N/A | Server-side only (Future) | **Prohibited in Baseline.** Unnecessary architectural bloat. | IndexedDB full-text / index search | No (Deferred) |
| **Identity & Auth** | Clerk / Auth0 / Supabase Auth | User registration & authentication | **Not Required (Prohibited)** | Excluded | Free tier (up to 10k MAU) | None | N/A | N/A | **Prohibited in Baseline.** FoodCue enforces "no account before value". App is 100% usable without signup. | Local browser profile in IndexedDB | No (Rejected for L0/L1) |
| **Cloud Database** | Neon / Supabase / Firebase | Hosted SQL / NoSQL database | **Not Required (Prohibited)** | Excluded | Free tier with auto-suspend | None | N/A | N/A | **Prohibited in Baseline.** Violates local-first architecture and creates cloud dependency. | Browser-native IndexedDB | No (Rejected for L0/L1) |
| **Object Storage** | AWS S3 / Cloudflare R2 | Cloud image & file storage | **Not Required (Prohibited)** | Excluded | Free tier (R2: 10GB free) | None | N/A | N/A | **Prohibited in Baseline.** Images remain memory-only or saved to local IndexedDB. No cloud uploads. | IndexedDB Blob storage (Pack Memory) | No (Rejected for L0/L1) |
| **Messaging** | Twilio / Resend / WhatsApp API | SMS, email, WhatsApp reminders | **Not Required (Prohibited)** | Excluded | Paid per message | None | N/A | N/A | **Prohibited in Baseline.** Reminders are delivered in-app on launch. Optional `.ics` calendar export. | In-app reminders / `.ics` export | No (Rejected for L0/L1) |
| **Push Alerts** | OneSignal / Firebase Cloud Messaging | Web push notifications | **Future Enhancement** | Excluded | Free tier available | None in Baseline | N/A | N/A | Unreliable scheduling on mobile iOS PWAs without native app wrapper. Deferred. | In-app reminder dashboard | No (Deferred) |
| **Analytics** | Google Analytics / Mixpanel | User tracking & telemetry | **Not Required (Prohibited)** | Excluded | Free tiers available | None | N/A | N/A | **Prohibited.** Violates privacy-first positioning and DPDP Act data minimisation rules. | Voluntary feedback & closed-beta logs | No (Rejected) |
| **Error Logging** | Sentry / LogRocket | Cloud error tracking | **Optional (Phase 3)** | Excluded | Free tier (5k events/mo) | Free DSN (Optional) | `VITE_SENTRY_DSN` (Optional) | Client bundle | Must scrub all PII, image data, and pack notes if ever integrated. | Local diagnostic error log in IndexedDB | **Yes (Owner must approve)** |
| **Hosting** | Cloudflare Pages | Static site hosting & CDN deployment | **Required (Baseline)** | To Be Configured | 100% Free (Unlimited bandwidth) | Free Cloudflare account | N/A (GitHub integration) | Cloudflare Pages dashboard | Static asset hosting only. Enforces HTTPS, strict CSP, and security headers. Zero server-side compute. | GitHub Pages (Alternative) | **Yes (Owner selects platform)** |
| **Hosting** | Vercel | Static site hosting & preview branches | **Conditional (Non-Commercial)** | To Be Configured | Free (Hobby Plan) | Free Vercel account | N/A (GitHub integration) | Vercel dashboard | **Caution:** Vercel Hobby plan terms strictly restrict use to non-commercial projects. | Cloudflare Pages (Recommended) | **Yes (Owner must review terms)** |

---

# Section C: Environment Variables Register

### Controlling Principle: The Client-Side Exposure Rule
Vite exposes environment variables prefixed with `VITE_` directly into the public client-side JavaScript bundle. Any variable defined with `VITE_` can be read by anyone inspecting browser source code or network traffic.

**Therefore: NEVER store private API keys, database passwords, signing secrets, or administrative tokens in any `VITE_` variable.**

### Baseline Statement
> **No external API keys or server credentials are required for the current local-first FoodCue baseline.**

### Full Environment Variable Specification

| Variable Name | Purpose & Description | Required in Baseline? | Example Placeholder | Secret? (Public vs Private) | Consumed By | Owner Action Required |
|---|---|---|---|---|---|---|
| `VITE_APP_NAME` | Public brand display name | Optional | `FoodCue` | Public (Client Bundle) | `src/app/App.tsx` | Leave default (`FoodCue`) |
| `VITE_APP_VERSION` | Application build version | Optional | `1.0.0` | Public (Client Bundle) | UI footer & diagnostics | Auto-populated from `package.json` |
| `VITE_OFFLINE_MODE` | Forces offline-only mode | Optional | `true` | Public (Client Bundle) | Network adapter switch | Leave default (`false`) |
| `VITE_OPENFOODFACTS_LOOKUP` | Enables optional GTIN candidate lookup | Optional | `false` | Public (Client Bundle) | `src/adapters/catalogue/` | Set `true` only if Open Food Facts lookup approved |
| `VITE_SENTRY_DSN` | Client-side error tracking DSN | Optional (Phase 3) | `https://examplePublicKey@o0.ingest.sentry.io/0` | Public (DSN format) | Diagnostic error handler | Provide only if owner requests Sentry in Phase 3 |
| `PORT` | Local dev server port | Optional | `5173` | Private (Local Dev Only) | `vite.config.ts` | Default is standard Vite port |

### Sample `.env.example` File (To be placed at repository root)

```bash
# ==============================================================================
# FoodCue Environment Configuration Template (.env.example)
# Note: FoodCue is a local-first PWA. No private API keys or secrets are required.
# ==============================================================================

# Application Metadata (Public)
VITE_APP_NAME="FoodCue"
VITE_APP_TAGLINE="Know your food. Manage your kitchen."

# Feature Toggles (Public)
# Enable or disable optional external Open Food Facts GTIN candidate lookup
VITE_OPENFOODFACTS_LOOKUP="false"

# Error Reporting (Optional - Leave blank in local development)
# VITE_SENTRY_DSN=""
```

---

# Section D: Database and Storage Configuration

FoodCue relies strictly on client-side browser storage. No cloud database account, connection pooler, or database credentials are required from the owner.

### 1. Browser-Local IndexedDB Specification (Active Baseline)

| Configuration Parameter | Value in Code | Owner Input Needed | Technical Notes |
|---|---|---|---|
| **Database Engine** | Native Browser IndexedDB | None (Browser built-in) | Zero cost, zero latency, zero cloud transfer |
| **Database Name** | `foodcue-local` | None | Constant in `src/adapters/storage/database.ts` |
| **Current Schema Version** | `1` | None | Incremented via schema migration functions |
| **Object Store: `candidates`** | Keypath: `id` | None | Stores candidate products identified during scans |
| **Object Store: `confirmedLabels`** | Keypath: `id` | None | Stores user-confirmed physical label contracts |
| **Object Store: `analysisResults`** | Keypath: `id` | None | Stores deterministic food analysis outputs |
| **Object Store: `pantryEvents`** | Keypath: `id` | None | Append-only event ledger for all inventory actions |
| **Object Store: `dateRecords`** | Keypath: `id` | None | Stores printed dates vs estimated dates |
| **Object Store: `reminders`** | Keypath: `id` | None | Stores in-app planning reminders |
| **Object Store: `settings`** | Keypath: `id` | None | Stores local preferences & language options |
| **Object Store: `canary`** | Keypath: `id` | None | Non-sensitive record used to detect browser storage eviction |
| **Persistence Request** | `navigator.storage.persist()` | None | Invoked automatically on supported browsers |
| **Quota Monitoring** | `navigator.storage.estimate()` | None | Warns user when storage usage approaches quota |
| **Data Backup / Export** | Versioned JSON & CSV | None | Client-side serialization with EXIF stripping |
| **Data Deletion / Clear** | Full multi-store transactional wipe | None | Verifiable in Privacy view (`clearFoodCueData`) |

### 2. External Cloud Databases (Explicitly Excluded from Baseline)

| Database Technology | Why Often Suggested by Generic Agents | Why Explicitly Excluded from FoodCue Baseline | Owner Action |
|---|---|---|---|
| **Neon PostgreSQL** | Serverless Postgres with branching | Introduces external network dependency, connection latency, cloud hosting costs, authentication requirements, and security attack surface for personal pantry data. | **Do NOT create Neon account** |
| **Supabase** | Backend-as-a-Service with Postgres | Requires managing user accounts, cloud security rules, and database egress costs. Incompatible with INR 0 cash target. | **Do NOT create Supabase account** |
| **Firebase Firestore** | Realtime cloud NoSQL database | Proprietary lock-in, data egress fees, and stores household grocery habits on Google servers without necessity. | **Do NOT create Firebase account** |
| **Self-Hosted PostgreSQL** | Dedicated VPS database | Monthly server costs ($5–$20/mo), database backup administration, patch maintenance, and disaster recovery burden. | **Do NOT purchase VPS hosting** |

---

# Section E: Hosting and Deployment Configuration

FoodCue compiles into a static single-page application (`dist/` containing `index.html`, JavaScript bundles, WebAssembly binaries, CSS, and static assets). It can be hosted on any high-performance static content delivery network (CDN) at zero cash cost.

### Hosting Options Evaluation

| Provider | Recommended Tier | Monthly Cash Cost | Commercial Use Permitted? | Bandwidth & Build Limits | Recommendation Status |
|---|---|---|---|---|---|
| **Cloudflare Pages** | Free Plan | **INR 0** | **Yes** (Commercial use permitted on free plan) | Unlimited bandwidth; 500 builds/month; 20,000 files/deployment | **STRONGLY RECOMMENDED** |
| **GitHub Pages** | Free Plan | **INR 0** | Yes (Subject to GitHub acceptable use) | 100GB bandwidth/month; 1GB site size limit | **Viable Alternative** |
| **Vercel** | Hobby Plan | **INR 0** | **NO** (Hobby plan strictly forbids commercial / business use) | 100GB bandwidth/month; fast global CDN | **Conditional / Not Recommended for Launch** |
| **Netlify** | Free Starter | **INR 0** | Yes (Subject to fair use) | 100GB bandwidth/month; 300 build minutes/month | **Viable Alternative** |

### Required Deployment Information from Owner

| Item | Requirement Level | Current Status | Description & Owner Guidance |
|---|---|---|---|
| **GitHub Repository** | Mandatory | Exists | Private or public GitHub repository containing FoodCue source code. |
| **Hosting Platform Account** | Mandatory | To Be Decided | Owner should create a free Cloudflare account at `dash.cloudflare.com`. Connect GitHub repository to Cloudflare Pages. |
| **Build Command** | Mandatory | Defined | `npm run build` |
| **Build Output Directory** | Mandatory | Defined | `dist` |
| **Node.js Version in CI** | Mandatory | Defined | `20.18.0` (Configured via `NODE_VERSION: "20.18.0"` env variable) |
| **Custom Domain Name** | Optional | Pending Clearance | Optional custom domain (e.g. `foodcue.app`, `foodcue.in`, `foodcue.org`). Free platform subdomain (e.g. `foodcue.pages.dev`) is fully sufficient for beta. |
| **DNS Configuration** | Optional | Pending Domain | If custom domain purchased, point CNAME to Cloudflare Pages host. SSL/TLS certificate is provisioned automatically at zero cost. |
| **Security Headers Config** | Mandatory | Defined | Deploy a `_headers` file in `public/` enforcing HTTPS, HSTS, and Content Security Policy. |

---

# Section F: Branding and Design Assets Register

An audit of the uploaded design assets and documentation in `..\Upload` and `foodcue Code/` establishes the following asset inventory:

| Asset Description | Uploaded in Project? | Current File Location | Intended Usage in App & Web | Required Formats & Dimensions | Production Readiness Status | Owner Action Required |
|---|---|---|---|---|---|---|
| **Primary Horizontal Logo** | Yes (Raster PNG) | `Upload/Logo.png` | Web header, marketing hero, documentation, release notes | Scalable vector SVG; Transparent PNG (1200x400, 600x200) | **Reference Only** (Raster image; pixelates at high DPI) | **Export clean vector SVG (`foodcue-logo.svg`) from Figma/design master** |
| **App Icon / Brand Mark** | Yes (Raster PNG) | `Upload/Favicon.png` | App icon, favicon, PWA home screen icon, compact header mark | Scalable vector SVG; PNG (512x512, 192x192, 48x48, 32x32, 16x16); `.ico` | **Reference Only** (High-res 3D raster 1024x1024; lacks vector source) | **Generate standard multi-size PNG/ICO icon bundle** |
| **PWA Web App Manifest Icon** | Partial | `public/favicon.png` (1.4MB) | Mobile PWA installation icon on Android / Chrome | `icon-192.png` (192x192), `icon-512.png` (512x512 with safe padding) | **Needs Optimization** (Current file is 1.4MB unoptimized raster) | **Compress & generate standardized 192px and 512px WebP/PNG icons** |
| **Apple Touch Icon** | Missing | None | iOS home screen bookmark & safari touch icon | `apple-touch-icon.png` (180x180 png, solid background) | **Missing** | **Generate 180x180 PNG with solid background (no transparency)** |
| **Standard Favicon** | Missing | None | Browser tab favicon | `favicon.ico` (multi-res 16x16, 32x32, 48x48) | **Missing** | **Generate multi-resolution `favicon.ico`** |
| **Open Graph Social Card** | Missing | None | Social media previews (WhatsApp, Twitter, LinkedIn previews) | `og-image.png` (1200x630 png, <300KB) | **Missing** | **Design and export 1200x630 social preview card** |
| **UI System Typography (Inter)** | Yes (Open Source) | System fallback currently | Body copy, tables, buttons, nutrition labels | `.woff2` font files (Weights 400, 500, 600, 700) | **Needs Bundling** | **Download static `.woff2` files into `public/fonts/` for offline caching** |
| **Display Typography (Plus Jakarta Sans)** | Yes (Open Source) | System fallback currently | Marketing headings, title hero, brand wordmark | `.woff2` font files (Weights 700, 800) | **Needs Bundling** | **Download static `.woff2` files into `public/fonts/` for offline caching** |
| **Project Architecture Diagram** | Yes (PNG) | `Upload/FoodCue_Project_Architecture_Diagram_v1_0.png` | Architectural documentation, technical audits, contributor handoff | PNG & SVG | **Complete & Approved** | None (Archived in documentation) |
| **User Journey Diagram** | Yes (PNG) | `Upload/FoodCue_User_Journey_Diagram_v1_0.png` | UX documentation, sprint planning, QA verification | PNG & SVG | **Complete & Approved** | None (Archived in documentation) |

---

# Section G: Accounts and Platform Access Register

The developer agent will only ever request access through sanctioned authorization channels (e.g. GitHub collaborator invites, platform role delegation). **Never provide account passwords, personal recovery codes, or unrestricted master credentials.**

| Account / Service | Is Account Required? | Purpose & Rationale | When Needed | Permissions Level Required | Free Tier Sufficient? | Who Creates the Account? |
|---|---|---|---|---|---|---|
| **GitHub** | **Yes** | Source code version control, CI automated testing, issue tracking | Day 1 | Write / Collaborator access to project repository | Yes (GitHub Free) | Project Owner creates repo, invites developer |
| **Cloudflare Pages** | **Yes** | Static web hosting, automated deployments, edge CDN | Phase 3 (Deployment) | Administrator or Pages Manager | Yes (Cloudflare Free) | Project Owner creates account, connects GitHub |
| **Domain Registrar** (e.g. Namecheap / Cloudflare Registrar) | Optional | Purchasing and managing custom domain (e.g. `foodcue.app`) | Phase 3 (Optional) | DNS Management access only | N/A (Domain purchase ~INR 800–1,200/yr) | Project Owner purchases domain directly |
| **Open Food Facts** | No | Read-only public API queries for GTIN candidate metadata | Phase 2 (Optional) | None (Public API; no account required) | Yes (100% Free / Public Good) | No account needed |
| **Google Cloud Console** | **NO** | Not required for baseline (No cloud OCR, no Firebase, no Maps) | N/A | None | N/A | **DO NOT CREATE** |
| **OpenAI / Anthropic** | **NO** | Not required for baseline (Generative AI is Phase 2 deferred) | N/A | None | N/A | **DO NOT CREATE** |
| **Neon / Supabase** | **NO** | Not required for baseline (App uses local IndexedDB) | N/A | None | N/A | **DO NOT CREATE** |

---

# Section H: Product and Business Decisions Required from Owner

The following formal decisions (designated FD-01 through FD-08 in Master Specification v13.5) require explicit review and sign-off by the Project Owner. Development cannot assume arbitrary answers.

| Decision ID | Decision Topic | Recommended Technical Default | Impact if Undecided / Safe Fallback | Decision Urgency | Owner Sign-Off Required? |
|---|---|---|---|---|---|
| **FD-01** | **Browser & Device Support Matrix** | Support modern mobile browsers: Chrome on Android (v110+), Safari on iOS (v16.4+), and desktop Chromium/Firefox. | Unsupported devices gracefully fallback to manual text entry and file upload. | **High (Sprint 1)** | **Yes (Sign off support matrix)** |
| **FD-02** | **Barcode & OCR Engine Spike Selection** | Barcode: ZXing-WASM with native BarcodeDetector progressive enhancement. OCR: Compare PaddleOCR.js vs Tesseract.js via local spike. | Default to ZXing-WASM for barcodes and Tesseract.js (English-only) for initial OCR testing. | **High (Sprint 1)** | **Yes (Approve spike results)** |
| **FD-03** | **Validation Benchmark Thresholds Freeze** | Freeze thresholds in workbook `Assumptions`: 100 packs (40 locked release set), OCR allergen accuracy >= 95%, OCR ingredient accuracy >= 90%, p95 latency <= 20s, peak memory <= 400MB. | Formulas fail closed as `NOT TESTED` until thresholds are frozen before data collection. | **High (Before Gate G4)** | **Yes (Freeze workbook assumptions)** |
| **FD-04** | **External Source Use Scope Approval** | Open Food Facts: candidate lookup only (attribute, don't trust blindly). ICMR-NIN: strictly link-only (no reproduction). FSSAI DART: link-only. | Unapproved sources are completely excluded from the release build. | **Medium (Sprint 2)** | **Yes (Approve Source Register)** |
| **FD-05** | **Allergen & Nutrition Rule Approval** | Adopt FSSAI 8 mandatory allergen declarations. Require qualified food technologist sign-off on lexicon aliases. Missing nutrition values marked `unknown`. | Analysis engine strictly returns `not_assessed` until lexicon pack is signed off. | **Critical (Before Food Intel)** | **Yes (Qualified reviewer sign-off)** |
| **FD-06** | **Hindi & Regional Language Scope** | English-first for L0/L1 baseline. Defer Hindi OCR and Devanagari UI until fluent native-speaker review of safety copy is completed. | System ships English-only with clear coverage statement. | **Medium (Sprint 2)** | **Yes (Approve language roadmap)** |
| **FD-07** | **Phase 2 AI & Cloud Assistant Scope** | Keep generative AI strictly in Phase 2. AI must never produce safety verdicts or override deterministic rules. | Application operates 100% local-first without AI or cloud backend. | **Low (Post-Beta)** | **Yes (Confirm Phase 2 boundary)** |
| **FD-08** | **Beachhead Customer Segment Selection** | Initial hypothesis: Urban household grocery organiser managing weekly packaged food. | Segment remains conditional until 20+ qualitative interviews are completed. | **Medium (Sprint 1)** | **Yes (Approve G1 interview focus)** |

---

# Section I: AI and RAG Configuration (Future Phase 2 Only)

> **STRICT SAFETY ENFORCEMENT:**  
> All generative AI, Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), and agentic workflows are **strictly excluded from the FoodCue L0/L1 baseline**.  
>  
> The information in this section establishes the **non-negotiable safety guardrails** that must govern any future Phase 2 proposal.

### Mandatory Phase 2 AI Guardrails
1. **Zero Safety Authority**: Generative AI models are strictly prohibited from generating, modifying, or overriding product identity, allergen detection states, nutrition thresholds, date interpretations, pantry ledger balances, emergency routing, or food safety verdicts.
2. **Deterministic Precedence**: All food-safety and allergen conclusions are derived exclusively from deterministic, reviewed, versioned rule packs executing against a valid `ConfirmedLabel`.
3. **No Unverified Data as Pack Truth**: AI must never treat third-party web content or crowd-sourced catalogue data as verified physical label truth.
4. **Mandatory Abstention**: When evidence is missing, conflicting, ambiguous, unreadable, or stale, the AI model must abstain and explicitly output an `Uncertain` or `Not assessed` response. Hallucinated guesses are strictly prohibited.
5. **No Client-Side Secrets**: Any future AI integration must use a secure server-side proxy or edge function. Private API keys (e.g. OpenAI, Anthropic, Gemini) must **never** be embedded in client-side code, bundles, or public repositories.
6. **Explicit Context Minimisation & Consent**: User pantry contents, dietary avoidances, personal profile notes, and unconfirmed photos must **never** be sent to external AI providers without affirmative, granular, user-consented opt-in.
7. **Prompt Injection Defence**: Retrieved web pages, OCR text, and QR payloads must be treated as untrusted data and strictly isolated from system/developer instruction channels.

---

# Section J: Final Owner Action List

To provide immediate clarity and eliminate developer uncertainty, the project owner's responsibilities are divided into three clear operational lists:

### 1. Needed Now (Blocking Immediate Development)
- [ ] **Action 1: Execute Workbook QA Recalculation**  
  Open `FoodCue_Validation_Workbook_v13_5_Final_Controlled_Baseline.xlsx` in Excel, recalculate all formulas, verify that pending Formula_QA Test IDs 29 and 30–39 execute cleanly, and save the updated workbook.
- [ ] **Action 2: Provide Vector Brand Assets (SVG)**  
  Export clean vector SVG files (`foodcue-logo.svg` and `foodcue-icon.svg`) from the master design source to replace the current raster PNGs.
- [ ] **Action 3: Generate Standard PWA Icon Pack**  
  Generate standardized PNG icons (`192x192`, `512x512` with safe margins, and `180x180` Apple touch icon) into `public/icons/`.
- [ ] **Action 4: Formally Approve Decision Register FD-01 through FD-08**  
  Review the recommended defaults in Section H and record formal sign-off in `docs/DECISIONS.md`.

### 2. Needed Later (During Subsequent Slices & Release Gates)
- [ ] **Action 5: Collect 100 Physical Benchmark Packs (Gate G4)**  
  Assemble photographs and ground-truth transcriptions of 100 Indian packaged-food labels (with 40 held-out release packs) for OCR and matching benchmarking.
- [ ] **Action 6: Secure Qualified Food Technologist Review (Sprint 2)**  
  Obtain qualified review and sign-off on the FSSAI allergen lexicon mapping and ingredient alias table before enabling positive allergen detections.
- [ ] **Action 7: Setup Cloudflare Pages Static Hosting (Phase 3)**  
  Create a free Cloudflare account, connect the FoodCue GitHub repository, and configure the production deployment pipeline.
- [ ] **Action 8: Conduct Closed Beta Household Recruitment (Phase 4)**  
  Recruit 10–20 opt-in households for the 4-week local-first closed beta following G1–G6 validation gate passage.

### 3. Not Needed for Current Baseline (Preventing Unnecessary Spending & Accounts)
- ❌ **Do NOT purchase any domain name yet** (Free Cloudflare Pages subdomain `foodcue.pages.dev` is 100% sufficient for development and beta).
- ❌ **Do NOT create paid cloud database accounts** (No Neon, Supabase, Firebase, AWS RDS, or PostgreSQL).
- ❌ **Do NOT purchase paid OCR subscriptions** (No Google Cloud Vision, AWS Rekognition, or Azure Computer Vision).
- ❌ **Do NOT purchase commercial barcode API plans** (No BarcodeLookup, UPCitemdb, or GS1 Data Hub).
- ❌ **Do NOT purchase AI / LLM API credits** (No OpenAI, Anthropic, or paid Gemini API keys in the baseline).
- ❌ **Do NOT register for user authentication services** (No Clerk, Auth0, or Stytch accounts).
- ❌ **Do NOT configure paid messaging or SMS services** (No Twilio, SendGrid, or WhatsApp Business API).
- ❌ **Do NOT install analytics or telemetry trackers** (No Google Analytics, Mixpanel, Segment, or PostHog).

---

```text
========================================================================================
END OF FOODCUE DEVELOPER INPUTS AND CONFIGURATION REGISTER (v1.0)
========================================================================================
```
