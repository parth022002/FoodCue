# FoodCue — Environment Variables Reference & Configuration Register

**Document Version:** 1.0.0  
**Security Classification:** Configuration Guide (No plaintext secrets contained)  
**Controlling Specifications:** FoodCue Master Specification v13.5 & Vercel Serverless Architecture

---

## 1. Master Environment Variable Register

The following register defines every environment variable recognized, validated, or read across the FoodCue application.

| Variable Name | Purpose & Function | Associated Service | Required? | Source / Where to Obtain | Configuration Target | Target Environment | Current Status in Repo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Pooled connection string for serverless API endpoints and cloud sync queries | Neon PostgreSQL (Pooled) | **Mandatory** | Neon Console -> Connection Details -> "Pooled connection" | `.env.local`, Vercel Dashboard | Development & Production | **Configured & Verified (`200 OK`)** |
| `DATABASE_URL_UNPOOLED` | Direct unpooled connection string for running DDL schema migrations (`db:migrate`) | Neon PostgreSQL (Direct) | **Mandatory for Migrations** | Neon Console -> Connection Details -> Uncheck "Connection pooling" | `.env.local`, Vercel Dashboard | Development & CI/CD | **Configured & Verified (`200 OK`)** |
| `VITE_NEON_DATABASE_URL` | Client-accessible connection string for browser sync client | Neon PostgreSQL | **Mandatory** | Same as `DATABASE_URL` | `.env.local`, Vercel Dashboard | Development & Production | **Configured & Verified** |
| `CLERK_SECRET_KEY` | Server-only secret key for verifying JWT session tokens and managing user accounts | Clerk Authentication | **Mandatory** | Clerk Dashboard -> API Keys -> Secret keys (`sk_test_...` or `sk_live_...`) | `.env.local`, Vercel Dashboard | Serverless API (Never expose in browser) | **Configured & Verified (`200 OK`)** |
| `VITE_CLERK_PUBLISHABLE_KEY` | Public key initializing Clerk React Provider in the browser | Clerk Authentication | **Mandatory** | Clerk Dashboard -> API Keys -> Publishable key (`pk_test_...` or `pk_live_...`) | `.env.local`, Vercel Dashboard | Development & Production (Browser) | **Configured & Verified** |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Secret key used by `/api/webhooks/clerk` to cryptographically verify incoming Svix HMAC signatures | Clerk Webhooks / Svix | **Mandatory for Webhooks** | Clerk Dashboard -> Webhooks -> Select Endpoint -> "Signing Secret" (`whsec_...`) | `.env.local`, Vercel Dashboard | Serverless API | **Configured & Verified (Events Succeeded)** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Framework compatibility fallback alias for `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Authentication | Optional Alias | Same as `VITE_CLERK_PUBLISHABLE_KEY` | `.env.local`, Vercel Dashboard | Development & Production | **Configured** |
| `NEON_DATABASE_URL_POOLED` | Fallback alias for pooled Neon database connection | Neon PostgreSQL | Optional Alias | Same as `DATABASE_URL` | `.env.local` | Development | **Configured** |
| `NEON_DATABASE_URL_UNPOOLED` | Fallback alias for unpooled Neon database connection | Neon PostgreSQL | Optional Alias | Same as `DATABASE_URL_UNPOOLED` | `.env.local` | Development | **Configured** |
| `VITE_ENABLE_NEON_SYNC` | Feature toggle enabling or disabling cloud sync capabilities (`"true"` or `"false"`) | FoodCue Sync Engine | Optional | Set to `"true"` or `"false"` | `.env.local`, Vercel Dashboard | Development & Production | **Configured (`"true"`)** |
| `VITE_OPENFOODFACTS_LOOKUP` | Feature toggle controlling remote Open Food Facts queries | FoodCue Product Engine | Optional | Set to `"true"` or `"false"` | `.env.local`, Vercel Dashboard | Development & Production | **Configured** |
| `VITE_APP_NAME` | Display name of the application | UI Branding | Optional | Default: `"FoodCue"` | `.env.local`, Vercel Dashboard | All | **Configured (`"FoodCue"`)** |
| `VITE_APP_TAGLINE` | Tagline rendered in metadata and header | UI Branding | Optional | Default: `"Know your food. Manage your kitchen."` | `.env.local`, Vercel Dashboard | All | **Configured** |
| `GROQ_API_KEY` | High-speed LLM inference key for optional voice and conversational assistance | Groq Cloud | Optional | [console.groq.com](https://console.groq.com) -> API Keys (`gsk_...`) | `.env.local`, Vercel Dashboard | Serverless & Dev | **Configured & Verified (`200 OK`)** |
| `VITE_GROQ_API_KEY` | Client-accessible alias for Groq key | Groq Cloud | Optional | Same as `GROQ_API_KEY` | `.env.local`, Vercel Dashboard | Development | **Configured** |
| `OPENROUTER_API_KEY` | Multi-model LLM inference gateway for vision / OCR fallback | OpenRouter AI | Optional | [openrouter.ai/keys](https://openrouter.ai/keys) (`sk-or-v1-...`) | `.env.local`, Vercel Dashboard | Serverless & Dev | **Configured & Verified (`200 OK`)** |
| `VITE_OPENROUTER_API_KEY` | Client-accessible alias for OpenRouter key | OpenRouter AI | Optional | Same as `OPENROUTER_API_KEY` | `.env.local`, Vercel Dashboard | Development | **Configured** |
| `NODE_ENV` | Runtime environment mode | Node.js Runtime | Optional | Auto-set by Vercel/Vite (`"development"`, `"test"`, `"production"`) | System | All | **Managed Automatically** |

---

## 2. Alias Resolution & Invariant Deduplication

The FoodCue backend and build scripts employ defensive environment parsing (`src/server/config/environment.ts` and `api/webhooks/clerk.ts`):

1. **Database URL Fallbacks:**
   - The runtime inspects: `DATABASE_URL` || `NEON_DATABASE_URL_POOLED` || `VITE_NEON_DATABASE_URL`.
   - The migration script inspects: `DATABASE_URL_UNPOOLED` || `NEON_DATABASE_URL_UNPOOLED` || `DATABASE_URL`.
   - *Best Practice:* In production on Vercel, set `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

2. **Clerk Webhook Signing Secret:**
   - The endpoint checks: `CLERK_WEBHOOK_SIGNING_SECRET` || `CLERK_WEBHOOK_SECRET` || `WEBHOOK_SECRET`.
   - *Best Practice:* Use `CLERK_WEBHOOK_SIGNING_SECRET` across all environments for consistency.

3. **Clerk Publishable Key:**
   - Both `VITE_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are provided to support Vite and any cross-framework tools.

---

## 3. Strict Security Rules for Environment Configuration

> [!CAUTION]
> **Zero Plaintext Secrets in Version Control:**
> Never commit `.env`, `.env.local`, `.env.production`, or `.env.vercel` to GitHub. The repository's `.gitignore` contains rules blocking these files. Only `.env.example` (containing sanitized template placeholders like `pk_test_REPLACE_ME`) should be checked into Git.

> [!IMPORTANT]
> **Frontend vs. Backend Exposure Boundary:**
> - Variables prefixed with `VITE_` or `NEXT_PUBLIC_` **are compiled directly into the client-side JavaScript bundle** and can be viewed by any user using browser developer tools.
> - **NEVER** prefix `CLERK_SECRET_KEY`, `DATABASE_URL` (with password), or `CLERK_WEBHOOK_SIGNING_SECRET` with `VITE_`! Keep server secrets strictly non-prefixed so they remain inside secure Vercel Serverless Function runtimes.
