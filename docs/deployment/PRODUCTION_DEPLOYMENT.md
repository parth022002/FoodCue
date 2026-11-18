# FoodCue — Production Deployment Guide

This guide details the procedure for deploying FoodCue to production on **Vercel**, **Neon PostgreSQL**, and **Clerk**.

---

## 1. Architecture Overview

- **Frontend:** Single Page Application (SPA) built with Vite and React, served globally over Vercel Edge CDN.
- **Backend API:** Standalone serverless handlers compiled to Node.js format in `api/` via `scripts/bundle-api.mjs`.
- **Database:** Neon Serverless PostgreSQL with pgBouncer pooling for serverless handlers.
- **Authentication:** Clerk Production Instance.

---

## 2. Step-by-Step Deployment Procedure

### Step 1: Push Code to GitHub
Ensure the target release branch (e.g. `main` or `phase-11-production-validation`) is pushed to `https://github.com/parth022002/FoodCue`.

### Step 2: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com/new).
2. Click **Add New Project** and select `parth022002/FoodCue`.
3. Configure Build Settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`

### Step 3: Populate Vercel Environment Variables
Add all production environment variables in Vercel Project Settings $\rightarrow$ Environment Variables:

```env
DATABASE_URL=postgresql://neondb_owner:***@ep-***-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:***@ep-***.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
VITE_CLERK_PUBLISHABLE_KEY=pk_live_***
CLERK_SECRET_KEY=sk_live_***
CLERK_WEBHOOK_SIGNING_SECRET=whsec_***
VITE_VAPID_PUBLIC_KEY=***
VAPID_PRIVATE_KEY=***
VAPID_SUBJECT=mailto:admin@foodcue.in
GROQ_API_KEY=gsk_***
OPENROUTER_API_KEY=sk-or-v1-***
TAVILY_API_KEY=tvly-***
```

### Step 4: Run Database Migrations
Before deploying the client, verify all 15 relational tables exist on your production Neon instance:
```bash
node scripts/run-migrations.mjs
```

### Step 5: Trigger Production Deploy
Click **Deploy** in Vercel. Upon build completion, Vercel will provide your live HTTPS URL (e.g., `https://foodcue.vercel.app`).

### Step 6: Configure Clerk Production Webhook
1. Open [Clerk Dashboard](https://dashboard.clerk.com) $\rightarrow$ Configure $\rightarrow$ Webhooks.
2. Click **Add Endpoint**.
3. Endpoint URL: `https://<your-vercel-domain>/api/webhooks/clerk`.
4. Subscribed Events: `user.created`, `user.updated`, `user.deleted`.
5. Copy the Signing Secret (`whsec_...`) and update `CLERK_WEBHOOK_SIGNING_SECRET` in Vercel if newly generated.

---

## 3. Post-Deployment Verification

Verify live functionality:
1. Open `https://<your-vercel-domain>/api/health` $\rightarrow$ should return `{"status":"ok","database":{"connected":true}}`.
2. Open the frontend in desktop Chrome and mobile Safari $\rightarrow$ verify PWA install prompt.
3. Test guest barcode scan $\rightarrow$ verify $<100\text{ms}$ local response.
4. Sign in with a test account $\rightarrow$ verify Clerk modal appears without development watermarks.
