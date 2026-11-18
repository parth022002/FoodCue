# FoodCue — Environment Variables & Configuration Register

This document provides the definitive configuration register for FoodCue across local development (`.env`, `.env.local`) and production hosting (Vercel Environment Variables).

---

## 1. Master Configuration Matrix

| Variable Name | Required Scope | Client/Server | Purpose | Example Value |
|---|:---:|:---:|---|---|
| `DATABASE_URL` | Cloud Sync | Server Only | Neon PostgreSQL Pooled Connection (pgBouncer) | `postgresql://neondb_owner:***@ep-***-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Migrations | Server Only | Neon PostgreSQL Direct Compute (Port 5432) | `postgresql://neondb_owner:***@ep-***.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Auth | Client & Server | Clerk Frontend Publishable Key | `pk_test_...` (Dev) / `pk_live_...` (Prod) |
| `CLERK_SECRET_KEY` | Auth | Server Only | Clerk Backend Secret Key | `sk_test_...` (Dev) / `sk_live_...` (Prod) |
| `CLERK_WEBHOOK_SIGNING_SECRET`| Auth | Server Only | Svix Webhook Signing Secret | `whsec_...` |
| `VITE_VAPID_PUBLIC_KEY` | Notifications | Client & Server | Web Push Application Server Key | Base64 URL-safe public key |
| `VAPID_PRIVATE_KEY` | Notifications | Server Only | Web Push Private Signing Key | Private key string |
| `VAPID_SUBJECT` | Notifications | Server Only | Contact email for push notification services | `mailto:admin@foodcue.in` |
| `GROQ_API_KEY` | Assistive AI | Server Only | Groq Cloud Key (Whisper transcription & fast LLM) | `gsk_...` |
| `OPENROUTER_API_KEY` | Assistive AI | Server Only | OpenRouter Key (Multimodal Vision OCR fallback) | `sk-or-v1-...` |
| `TAVILY_API_KEY` | Search | Server Only | Tavily Search Key (Web product intelligence) | `tvly-...` |

---

## 2. Security Directives

1. **Never Commit Secrets:** `.env` and `.env.local` are strictly included in `.gitignore`. Never hardcode secrets in source files or push them to Git repositories.
2. **Client Isolation:** Only environment variables prefixed with `VITE_` (e.g. `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY`) are exposed to the client bundle. All other variables (`CLERK_SECRET_KEY`, `DATABASE_URL`, API keys) must remain server-side only.

---

## 3. Automated Validation

To test and verify that all configured keys are valid, active, and returning HTTP 200 responses:
```bash
node --env-file=.env scripts/test-all-api-keys.mjs
```

To verify production deployment readiness:
```bash
node --env-file=.env scripts/verify-deployment-config.mjs
```
