# FoodCue — API Keys, External Services & Integration Requirements

**Controlling Project:** FoodCue (Health Application)  
**Architecture:** Local-first Progressive Web App (PWA) with optional Neon Serverless PostgreSQL sync and Clerk Authentication  
**Cash Expenditure Baseline:** INR 0.00 (All core features operate on free/open tiers)  
**Audit Date:** November 2026

---

## 1. Executive Architecture Overview

FoodCue is engineered with a **local-first, privacy-by-design architecture**. This means that unlike traditional cloud-heavy applications:
- **Barcode detection, OCR, ingredient parsing, and nutritional intelligence run directly on the user's device** in WebAssembly and Web Workers.
- **No paid API subscriptions are mandatory** to run the complete product scanner, nutritional evaluation, kitchen management, or personalized allergy guard.
- Cloud services (**Clerk** and **Neon PostgreSQL**) are utilized strictly for user authentication, encrypted backup, multi-device synchronization, and household collaboration.

Below is the definitive catalog of every external service, API key, and cloud integration evaluated against the active codebase.

---

## 2. Comprehensive Service & API Registry

### Category A: AI & LLM Services

| Service | Role in FoodCue | Mandatory / Optional | Free Tier / Pricing | Environment Variable | Status in Codebase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Deterministic AI Engine (Built-in)** | 6-agent system (`aiNutritionAgents.ts`) for identification, nutrition analysis, additive translation, scoring, and allergen matching | **Core / Active** | **Free forever (INR 0.00)** Runs locally in TypeScript | None required | **Fully Implemented & Verified** |
| **Groq API** | Ultra-low latency LLM inference for optional natural language voice transcription and conversational queries | **Optional Enhancement** | **Free Tier Available** (Generous rate limits on Llama 3 / Mixtral models, no credit card required) | `GROQ_API_KEY`<br>`VITE_GROQ_API_KEY` | Key verified live (`200 OK`); available in `.env` |
| **OpenRouter API** | Multi-model fallback gateway for advanced multimodal vision / OCR parsing if packaging text is severely damaged | **Optional Enhancement** | **Free & Pay-as-you-go** (Includes free models such as `meta-llama/llama-3-8b-instruct:free`) | `OPENROUTER_API_KEY`<br>`VITE_OPENROUTER_API_KEY` | Key verified live (`200 OK`); available in `.env` |
| **Google Gemini API** | Multimodal reasoning for label photo interpretation | **Optional Alternative** | **Free Tier Available** (Gemini 1.5 Flash: 15 RPM, 1M TPM, 1,500 RPD free in Google AI Studio) | `GEMINI_API_KEY` | Compatible alternative to OpenRouter |
| **OpenAI API** | GPT-4o / GPT-4o-mini inference | **Optional Alternative** | **Paid only** (Requires credit card funding, minimum $5 USD) | `OPENAI_API_KEY` | Not recommended for INR 0.00 baseline |
| **Hugging Face Inference API** | Open-source model hosting | **Optional Alternative** | Free rate-limited tier available | `HF_TOKEN` | Not required |

#### Setup Instructions for Recommended AI Enhancement (Groq — Free):
1. **Official Portal:** Visit [https://console.groq.com/keys](https://console.groq.com/keys).
2. **Account Creation:** Sign up using GitHub or Google.
3. **Generate Key:** Click **Create API Key**, name it `FoodCue-App`, and copy the `gsk_...` key.
4. **Configuration:** Add to `.env.local` and Vercel Project Settings as `GROQ_API_KEY` and `VITE_GROQ_API_KEY`.
5. **Testing:** Run `node --env-file=.env -e "fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: 'Bearer ' + process.env.GROQ_API_KEY } }).then(r => console.log('Groq status:', r.status))"`.

---

### Category B: Product & Nutritional Information APIs

| Source | Role in FoodCue | Mandatory / Optional | Authentication / Key Required | Rate Limits & Terms | Status in Codebase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Verified Indian FMCG Catalog** | 500+ curated Indian packaged food items (`catalogData.ts`) covering top brands (Amul, Maggi, Parle-G, Tata Salt, Dabur, Britannia, etc.) | **Core / Active** | **None** (Embedded offline database) | Unlimited, zero latency, 100% offline | **Fully Implemented & Verified** |
| **Open Food Facts API** | Live crowd-sourced and manufacturer database (>3 million products globally, Indian mirror at `in.openfoodfacts.org`) | **Core / Active** | **No API Key Required** (Public REST API; requires descriptive `User-Agent` header) | ~100 requests/minute. Commercial usage permitted under Open Database License (ODbL). | **Active (`200 OK` verified)** |
| **USDA FoodData Central** | US packaged and generic foods reference | **Optional Fallback** | Optional API Key (Free registration at [https://fdc.nal.usda.gov/api-guide.html](https://fdc.nal.usda.gov/api-guide.html)) | 1,000 requests/hour with free API key | Not required for Indian FMCG baseline |
| **FSSAI Food Safety Repository** | Indian regulatory thresholds for allergens, salt, sugar, trans-fats, and 14-digit license validation | **Core / Active** | **None** (Integrated as deterministic rule engine in `localOcrAdapter.ts` and `aiNutritionAgents.ts`) | Unlimited offline execution | **Fully Implemented & Verified** |

#### Open Food Facts Usage & Configuration:
- **Endpoints Used:**
  - `https://in.openfoodfacts.org/cgi/search.pl?search_terms={query}&search_simple=1&action=process&json=1&page_size=8`
  - `https://world.openfoodfacts.org/api/v2/product/{gtin}.json`
- **Required Header:** `User-Agent: FoodCue-PWA/2.0 (contact: parth022002@github.com)` (Configured in `aiNutritionAgents.ts` and `openFoodFactsClient.ts`).
- **Registration:** None needed. Free to use for both non-commercial and commercial apps complying with ODbL attribution.

---

### Category C: Internet Search APIs

| Service | Suitability for FoodCue | API Key Required | Free Tier | Setup URL |
| :--- | :--- | :--- | :--- | :--- |
| **Built-in Multi-Source Search (Current)** | Searches verified local catalog + Open Food Facts API with tokenized matching | **No Key Needed** | **Free forever (INR 0.00)** | Built-in |
| **Tavily AI Search (Recommended if web crawling is added)** | Returns clean, AI-optimized text without web scraping boilerplates or ads; ideal for crawling food manufacturer nutrition tables | Yes (`TAVILY_API_KEY`) | **1,000 free searches/month** (No credit card required) | [https://tavily.com](https://tavily.com) |
| **Brave Search API** | Independent search index with high privacy guarantees | Yes (`BRAVE_API_KEY`) | **2,000 free searches/month** | [https://brave.com/search/api/](https://brave.com/search/api/) |
| **Google Custom Search Engine (CSE)** | Searches specified domains (e.g. `amul.com`, `nestle.in`, `bigbasket.com`) | Yes (API Key + Search Engine ID `cx`) | **100 free queries/day** | [https://developers.google.com/custom-search](https://developers.google.com/custom-search) |
| **SerpAPI** | Scrapes Google Search results | Yes | 100 free searches/month (Credit card may be requested) | [https://serpapi.com](https://serpapi.com) |

*Recommendation:* The current built-in search engine resolves branded and generic food queries with zero latency. If you decide to add live general web scraping for unindexed foods, **Tavily** is the most cost-effective and clean solution.

---

### Category D: Barcode Scanning, Camera & OCR

| Component | Technical Implementation | External API Key Needed? | Platform Requirements |
| :--- | :--- | :--- | :--- |
| **Barcode Detection** | WebAssembly port of ZXing (`@sec-ant/zxing-wasm`) with fallback to browser native `BarcodeDetector` API | **NO** (100% on-device) | Requires browser camera permission (`getUserMedia`). Must be served over **HTTPS** (or `localhost`). |
| **Optical Character Recognition (OCR)** | Client-side Web Worker with canvas pre-processing (luminance grayscale, contrast stretching, noise reduction) | **NO** (100% on-device) | Standard Web Worker support in mobile and desktop browsers. Zero data sent to external servers. |
| **Ingredient & Allergen Extraction** | Regex and token dictionary aligned with FSSAI regulations | **NO** (100% on-device) | Instant CPU execution. |

---

### Category E: Authentication & User Management (Clerk)

| Variable | Location | Description |
| :--- | :--- | :--- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (`.env`, Vercel) | Public key for Clerk React SDK (`pk_test_...` in dev, `pk_live_...` in prod) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Frontend alias (`.env`, Vercel) | Compatibility alias for Next/Vite frameworks |
| `CLERK_SECRET_KEY` | Backend Serverless (`.env`, Vercel) | Secret key for token verification and user API calls (`sk_test_...` or `sk_live_...`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Backend Serverless (`.env`, Vercel) | Svix cryptographic secret for `/api/webhooks/clerk` (`whsec_...`) |

#### Clerk Dashboard Configuration Steps:
1. **Portal:** [https://dashboard.clerk.com](https://dashboard.clerk.com).
2. **Application Creation:** Create a new application named `FoodCue`.
3. **Authentication Methods:** Enable **Email (Verification Code)** and optionally **Google OAuth** (toggle with 1 click).
4. **Authorized Domains & Redirects:**
   - Development: `http://localhost:5173`
   - Production: `https://<your-vercel-domain>.vercel.app` and your custom domain (e.g. `https://foodcue.in`).
5. **Webhooks Setup:**
   - Navigate to **Configure -> Webhooks -> Add Endpoint**.
   - URL: `https://<your-deployment-url>/api/webhooks/clerk`.
   - Subscribed Events: `user.created`, `user.updated`, `user.deleted`.
   - Copy the generated **Signing Secret** (`whsec_...`) and save as `CLERK_WEBHOOK_SIGNING_SECRET`.

---

### Category F: Database & Cloud Persistence (Neon PostgreSQL)

| Variable | Connection Type | Target Service |
| :--- | :--- | :--- |
| `DATABASE_URL` | Pooled (`-pooler.c-4...aws.neon.tech`) | Serverless edge queries and API endpoints via `@neondatabase/serverless` |
| `VITE_NEON_DATABASE_URL` | Pooled alias | Client synchronization gateway |
| `DATABASE_URL_UNPOOLED` | Direct (`ep-...aws.neon.tech`) | DDL migrations (`npm run db:migrate`) and transactional schema modifications |
| `NEON_DATABASE_URL_UNPOOLED`| Direct alias | Compatibility fallback for migrations runner |

#### Neon Dashboard Configuration Steps:
1. **Portal:** [https://console.neon.tech](https://console.neon.tech).
2. **Project:** Ensure your project (e.g., `ep-snowy-mode-...`) is active.
3. **Pricing Tier:** Free Tier ($0/month) provides 0.5 GiB storage, which easily stores millions of food ledger operations.
4. **Migrations:** Run `npm run db:migrate` locally or during CI/CD to ensure all 15 relational tables are initialized.

---

### Category G: Email, Notifications & Storage

| Service Category | Provider / Approach | Configuration Required | Cost |
| :--- | :--- | :--- | :--- |
| **Authentication Emails** | Handled natively by Clerk | None required; Clerk delivers verification and password reset emails automatically | **Free (Included in Clerk Free Tier)** |
| **Expiry Reminders** | W3C Web Notifications API + Local IndexedDB | Browser notification permission prompt (`Notification.requestPermission()`) | **Free (Native browser feature)** |
| **Web Push (Cross-Device)** | Service Worker PushManager via `/api/notifications/subscribe` | VAPID key pair (optional for remote push; in-app alerts work offline) | **Free** |
| **Image Storage** | **Zero-Retention Policy** | **None.** Scanned images are processed in-memory in browser canvas and immediately garbage collected to protect user privacy. | **Free (INR 0.00)** |

---

### Category H: Deployment & Hosting (Vercel)

| Service | Configuration File | Requirements | Cost |
| :--- | :--- | :--- | :--- |
| **Vercel Hosting** | `vercel.json` | - GitHub repository connected<br>- Framework preset: `Vite`<br>- Build command: `npm run build`<br>- Output directory: `dist`<br>- Environment variables added in Project Settings | **Free (Vercel Hobby Tier)** |
| **Custom Domain & SSL** | Vercel Domains Console | Add CNAME / A records in your DNS registrar (GoDaddy, Namecheap, Cloudflare) | Free SSL included automatically |
