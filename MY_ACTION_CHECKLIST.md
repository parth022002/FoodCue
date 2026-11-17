# FoodCue — My Personal Action & Setup Checklist

This document is your **single actionable master checklist**. It lists everything you personally need to do outside of the code editor to have FoodCue running 100% perfectly in development and production.

---

## 1. Quick Summary of Your Obligations & Costs

- **Total Cash Expenditure Required:** **INR 0.00** (Zero). All recommended services operate comfortably on free tiers.
- **Credit Card Required?** **NO.** Neither Neon, Clerk (Free Tier), Vercel, nor Open Food Facts require a credit card to get started.
- **External Storage / AWS S3 Required?** **NO.** FoodCue uses a zero-retention memory architecture for camera scans and stores structured data directly in IndexedDB (offline) and Neon PostgreSQL (cloud).
- **Email Server / SendGrid Required?** **NO.** Clerk handles all verification emails automatically for free.

---

## 2. Priority 1: Mandatory Setup Actions (Must Complete)

### [ ] Action 1: Verify / Obtain Clerk Authentication Keys
* **Why:** Enables user sign-in, user profiles, personal catalogues, and multi-device sync.
* **Provider:** Clerk ([https://dashboard.clerk.com](https://dashboard.clerk.com)).
* **Cost:** INR 0.00 (Free up to 10,000 monthly active users).
* **Instructions:**
  1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and log in.
  2. Select your application (e.g. `FoodCue`).
  3. In the left navigation, click **API Keys**.
  4. Copy:
     - **Publishable Key:** (starts with `pk_test_...` for dev or `pk_live_...` for prod).
     - **Secret Key:** (starts with `sk_test_...` for dev or `sk_live_...` for prod).
  5. In your local `.env.local`, set:
     - `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`
     - `CLERK_SECRET_KEY=sk_test_...`

---

### [ ] Action 2: Verify / Obtain Neon PostgreSQL Database Connection
* **Why:** Stores user accounts, sync event logs, and private catalogues in the cloud.
* **Provider:** Neon ([https://console.neon.tech](https://console.neon.tech)).
* **Cost:** INR 0.00 (Free 0.5 GiB serverless storage).
* **Instructions:**
  1. Go to [https://console.neon.tech](https://console.neon.tech) and open your project.
  2. In your dashboard, locate the **Connection Details** widget.
  3. Under connection dropdown, select **Pooled connection**. Copy the URI and set as `DATABASE_URL` and `VITE_NEON_DATABASE_URL`.
  4. Uncheck **Connection pooling** to get the direct endpoint. Copy this URI and set as `DATABASE_URL_UNPOOLED`.
  5. Run migrations from your terminal:
     ```bash
     npm run db:migrate
     ```
     *(Confirmed: All 15 database tables are already initialized in your live Neon instance).*

---

### [ ] Action 3: Configure Clerk Webhook Endpoint
* **Why:** Whenever a user signs up, updates their name, or deletes their account, Clerk notifies FoodCue so Neon PostgreSQL stays synchronized.
* **Instructions:**
  1. In Clerk Dashboard, go to **Configure -> Webhooks**.
  2. Click **Add Endpoint**.
  3. **Endpoint URL:**
     - For production: `https://<your-app>.vercel.app/api/webhooks/clerk`
     - For local testing: Use a tunneling tool like ngrok (`https://<ngrok-id>.ngrok-free.app/api/webhooks/clerk`).
  4. **Events to subscribe:** Check `user.created`, `user.updated`, and `user.deleted`.
  5. Click **Create**.
  6. On the endpoint page, copy the **Signing Secret** (starts with `whsec_...`).
  7. Add to your `.env.local` and Vercel Environment Variables as `CLERK_WEBHOOK_SIGNING_SECRET=whsec_...`.

---

### [ ] Action 4: Deploy to Vercel & Add Environment Variables
* **Why:** Hosts the web application and runs the serverless API handlers.
* **Provider:** Vercel ([https://vercel.com](https://vercel.com)).
* **Cost:** INR 0.00 (Hobby plan is free).
* **Instructions:**
  1. Push your code to GitHub: `git push origin main`.
  2. Go to [https://vercel.com/new](https://vercel.com/new) and import your `FoodCue` repository.
  3. Framework Preset: **Vite**.
  4. Before clicking Deploy, expand **Environment Variables** and add:
     - `DATABASE_URL`
     - `DATABASE_URL_UNPOOLED`
     - `VITE_NEON_DATABASE_URL`
     - `CLERK_SECRET_KEY`
     - `VITE_CLERK_PUBLISHABLE_KEY`
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_WEBHOOK_SIGNING_SECRET`
     - `VITE_ENABLE_NEON_SYNC="true"`
     - `VITE_OPENFOODFACTS_LOOKUP="false"`
     - `VITE_APP_NAME="FoodCue"`
     - `VITE_APP_TAGLINE="Know your food. Manage your kitchen."`
  5. Click **Deploy**.

---

## 3. Priority 2: Device & Browser Permissions (To Grant in Browser)

### [ ] Action 5: Grant Camera Permission on Device
* **Why:** Enables the barcode scanner and OCR label reader in SmartScan.
* **Instructions:**
  - When opening **SmartScan**, your browser will prompt: *"FoodCue wants to use your camera"*.
  - Tap **Allow**.
  - *Note:* The site must be served over **HTTPS** (or `localhost`) for the browser to allow camera access.

### [ ] Action 6: Grant Notification Permission (Optional)
* **Why:** Enables expiry alerts when food in your kitchen is within 1–3 days of expiration.
* **Instructions:**
  - Go to **Reminders** or **Settings** and tap **Enable Expiry Alerts**.
  - Tap **Allow** on the browser notification dialog.

---

## 4. Priority 3: Optional Enhancements (Zero Cash Required)

### [ ] Action 7: Add Google One-Tap / Social Login (Optional)
* **Why:** Allows users to log in with their Google account in one click without typing a password.
* **Instructions:**
  1. In Clerk Dashboard, go to **User & Authentication -> Social Connections**.
  2. Toggle **Google** to **ON**.
  3. Use Clerk's shared development credentials for instant setup, or add your own Google Cloud OAuth Client ID for custom branding.

### [ ] Action 8: Connect a Custom Domain (Optional)
* **Why:** Gives your app a professional URL (e.g. `https://foodcue.in`).
* **Instructions:**
  1. Purchase a domain from any registrar (e.g. Namecheap, GoDaddy).
  2. In Vercel Project Settings -> **Domains**, type your domain.
  3. Follow Vercel's DNS instructions to point the `A` and `CNAME` records.

### [ ] Action 9: Obtain Groq API Key for Voice / Assistive AI (Optional)
* **Why:** Optional ultra-fast voice intake for adding kitchen items by speaking.
* **Cost:** INR 0.00 (Generous free tier).
* **Instructions:**
  1. Visit [https://console.groq.com/keys](https://console.groq.com/keys).
  2. Create an API key (`gsk_...`).
  3. Add as `GROQ_API_KEY` in `.env.local` and Vercel.
