# FoodCue — Production Deployment Checklist & Launch Protocol

**Target Hosting Platform:** Vercel (Edge & Serverless Node.js Runtime)  
**Database:** Neon Serverless PostgreSQL (ap-southeast-1 Singapore AWS)  
**Authentication & Identity:** Clerk Production Environment  
**HTTPS / SSL Enforcement:** Mandatory (Camera permissions require secure origin)

---

## 1. Pre-Deployment Stage: Service Preparation

- [ ] **1. Clerk Production Instance Provisioning**
  - Log in to [Clerk Dashboard](https://dashboard.clerk.com).
  - Switch from **Development** to **Production** (or click "Go to production").
  - Obtain your **Live Production Keys**:
    - Publishable Key: Starts with `pk_live_...`
    - Secret Key: Starts with `sk_live_...`
  - Configure **Authentication Settings**:
    - Under *Email, Phone, Username*, ensure **Email address** is enabled.
    - Set verification strategy to **Email code** (recommended for friction-free sign-in).

- [ ] **2. Clerk Allowed Redirects & Origins**
  - Add your production Vercel URL (e.g. `https://foodcue.vercel.app`).
  - Add your custom domain if applicable (e.g. `https://foodcue.in` and `https://www.foodcue.in`).

- [ ] **3. Neon PostgreSQL Readiness**
  - Log in to [Neon Console](https://console.neon.tech).
  - Confirm database status is **Active**.
  - Execute `npm run db:migrate` against your production database so all 15 tables and indexes exist.
  - Ensure you have both the **Pooled connection string** (contains `-pooler` in hostname) and the **Direct unpooled connection string**.

---

## 2. Vercel Hosting Configuration

- [ ] **1. Link GitHub Repository to Vercel**
  - Open [Vercel Dashboard](https://vercel.com) and click **Add New -> Project**.
  - Import the `parth022002/FoodCue` repository.
  - Framework Preset: **Vite**.
  - Root Directory: `./`.
  - Build Command: `npm run build` (Builds Vite bundle and runs `scripts/bundle-api.mjs`).
  - Output Directory: `dist`.

- [ ] **2. Populate Environment Variables in Vercel Dashboard**
  Navigate to **Settings -> Environment Variables** in your Vercel project and add the following for **Production**:

  | Key | Environment | Example Value Format | Notes |
  | :--- | :--- | :--- | :--- |
  | `DATABASE_URL` | Production | `postgresql://user:pass@...-pooler...neon.tech/neondb?sslmode=require` | Pooled endpoint |
  | `DATABASE_URL_UNPOOLED` | Production | `postgresql://user:pass@...neon.tech/neondb?sslmode=require` | Direct endpoint |
  | `VITE_NEON_DATABASE_URL` | Production | Same as `DATABASE_URL` | Browser sync URL |
  | `CLERK_SECRET_KEY` | Production | `sk_live_...` | Server-only secret |
  | `VITE_CLERK_PUBLISHABLE_KEY` | Production | `pk_live_...` | Browser public key |
  | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production | `pk_live_...` | Compatibility alias |
  | `CLERK_WEBHOOK_SIGNING_SECRET` | Production | `whsec_...` | Generated in Step 3 below |
  | `VITE_ENABLE_NEON_SYNC` | Production | `true` | Cloud sync toggle |
  | `VITE_OPENFOODFACTS_LOOKUP` | Production | `false` | Enable fallback queries |
  | `VITE_APP_NAME` | Production | `FoodCue` | Brand name |
  | `VITE_APP_TAGLINE` | Production | `Know your food. Manage your kitchen.` | Brand tagline |

- [ ] **3. Trigger Initial Production Deployment**
  - Click **Deploy**. Vercel will clone, build, and deploy the application.
  - Note your live deployment URL (e.g., `https://foodcue-parth.vercel.app`).

---

## 3. Post-Deployment Stage: Webhook & DNS Linking

- [ ] **1. Configure Clerk Production Webhook**
  - In Clerk Dashboard, go to **Configure -> Webhooks -> Add Endpoint**.
  - **Endpoint URL:** `https://<YOUR-VERCEL-DOMAIN>/api/webhooks/clerk` (e.g. `https://foodcue.vercel.app/api/webhooks/clerk`).
  - **Subscribe to Events:**
    - `user.created`
    - `user.updated`
    - `user.deleted`
  - Click **Create**.
  - Copy the **Signing Secret** (`whsec_...`).
  - Go back to Vercel -> Project Settings -> Environment Variables, update `CLERK_WEBHOOK_SIGNING_SECRET` with this value, and redeploy or trigger a new deployment.

- [ ] **2. Test Webhook Delivery**
  - In the Clerk Webhook endpoint page, click the **Testing** tab.
  - Send a test `user.created` event.
  - Verify that Clerk reports **HTTP 200 / Succeeded**.

- [ ] **3. Custom Domain & SSL (Optional)**
  - In Vercel -> Settings -> Domains, enter your custom domain (e.g. `foodcue.in`).
  - In your DNS provider (e.g., Cloudflare, GoDaddy), create the required records:
    - `A` record pointing `@` to `76.76.21.21`
    - `CNAME` record pointing `www` to `cname.vercel-dns.com`
  - Wait 2–5 minutes for Vercel to issue a free Let's Encrypt SSL certificate.

---

## 4. Production Smoke Testing Verification

After deployment, perform these 5 verification tests on a live mobile phone or computer:

1. **HTTPS Security & Camera Test:**
   - Open the live URL on a smartphone.
   - Navigate to **SmartScan** and confirm the browser displays the camera permission dialog.
   - Scan a physical food barcode and verify instant decoding.

2. **Instant Search Test:**
   - Navigate to **Search**.
   - Search for `"Amul Butter"` or `"Tata Salt"`.
   - Confirm search results render with health score badges and nutrition values.

3. **Authentication & Webhook Ingestion Test:**
   - Sign up with a new email address.
   - Confirm verification code email arrives in inbox.
   - Verify that upon signing in, the user record is automatically created in Neon PostgreSQL (`foodcue_users` table).

4. **Tenant-Isolated Catalogue Test:**
   - In Search or SmartScan, click **Add to My Catalogue**.
   - Navigate to **My Catalogue** tab and confirm the item appears.
   - Sign out or open another browser; verify the catalogue is isolated to that specific user.

5. **Offline PWA Test:**
   - Turn off Wi-Fi/Mobile Data or set Chrome DevTools to Offline.
   - Refresh the page; verify the application continues to load and operate seamlessly from service worker cache.
