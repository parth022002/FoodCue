# FoodCue — Phase 11 Personal Action Checklist (Project Owner Master Guide)

This document is your **personal roadmap of tasks** that must be performed by you outside the codebase to achieve a successful Closed Beta and Public Launch.

---

## Task 1: Generate Live Production Keys in Clerk
* **What you need to do:** Switch your Clerk application to Production mode and copy the live publishable and secret keys.
* **Why it is necessary:** The current keys are development test keys (`pk_test_...` and `sk_test_...`). Production keys remove the development banner, support real users, and enable custom email deliverability.
* **Website / Dashboard:** [https://dashboard.clerk.com](https://dashboard.clerk.com)
* **Exact Steps:**
  1. Log in to Clerk Dashboard and select your FoodCue app.
  2. Click **"Deploy to Production"** or switch to your Production instance.
  3. Navigate to **API Keys**.
  4. Copy `Publishable key` (starts with `pk_live_...`) and `Secret key` (starts with `sk_live_...`).
  5. Add these keys to your **Vercel Project Settings -> Environment Variables**.
* **Expected Result:** App runs in production mode without development watermarks.
* **How to verify completion:** Run `node --env-file=.env scripts/verify-deployment-config.mjs` and verify it reports `Clerk Environment Mode: PRODUCTION (Live keys)`.

---

## Task 2: Configure Clerk Production Webhook
* **What you need to do:** Add your Vercel production webhook endpoint in Clerk.
* **Why it is necessary:** Enables automatic account creation and deletion synchronization between Clerk and your Neon PostgreSQL database.
* **Website / Dashboard:** [https://dashboard.clerk.com](https://dashboard.clerk.com) -> Configure -> Webhooks
* **Exact Steps:**
  1. Click **Add Endpoint**.
  2. URL: `https://<your-vercel-domain>/api/webhooks/clerk`.
  3. Check events: `user.created`, `user.updated`, `user.deleted`.
  4. Click **Create** and copy the **Signing Secret** (`whsec_...`).
  5. In Vercel Environment Variables, set `CLERK_WEBHOOK_SIGNING_SECRET=whsec_...`.
* **Expected Result:** Webhook delivery shows green checkmarks.
* **How to verify completion:** In Clerk Webhook dashboard, click **Testing** -> Send `user.created` -> Verify HTTP 200 response.

---

## Task 3: Deploy to Vercel Production
* **What you need to do:** Link your GitHub repository to Vercel and trigger the production build.
* **Why it is necessary:** Makes FoodCue accessible worldwide on HTTPS with edge performance.
* **Website / Dashboard:** [https://vercel.com/new](https://vercel.com/new)
* **Exact Steps:**
  1. Import `parth022002/FoodCue` into Vercel.
  2. Select framework **Vite**, build command `npm run build`, output directory `dist`.
  3. Ensure all environment variables from `ENV_VARIABLES_REFERENCE.md` are added.
  4. Click **Deploy**.
* **Expected Result:** Vercel deploys the application and provides a live HTTPS URL.
* **How to verify completion:** Open the URL on your mobile phone or computer.

---

## Task 4: Connect Custom Domain (Optional)
* **What you need to do:** Map your custom domain (e.g. `foodcue.in`) to Vercel.
* **Why it is necessary:** Professional branding and easy access for Indian beta users.
* **Website / Dashboard:** Vercel Dashboard -> Settings -> Domains
* **Exact Steps:**
  1. In Vercel Domains, type your domain name.
  2. In your domain registrar (GoDaddy, Namecheap, Cloudflare), add:
     - `A` Record: `@` -> `76.76.21.21`
     - `CNAME` Record: `www` -> `cname.vercel-dns.com`
  3. Wait 2–5 minutes for automated SSL provisioning.
* **Expected Result:** App loads securely at `https://foodcue.in`.
* **How to verify completion:** Visit your domain and verify the SSL padlock icon.

---

## Task 5: Capture Physical Food Packaging Photographs (Phase 11.4 Validation)
* **What you need to do:** Photograph 10–20 real food items from your pantry or grocery store across the 10 food categories.
* **Why it is necessary:** To replace tabular assertions with empirical physical camera validation (Gate P5).
* **Exact Steps:**
  1. Pick products across: Dairy, Biscuits, Snacks, Instant food, Cereals, Beverages, Oils, Spices, Staples, and Sweets.
  2. Take clear phone photos of: Front label, Ingredient list, Allergen box, and Nutrition/FSSAI panel.
  3. Save photos into `data/physical-packs/photos/`.
  4. Record the ground truth values into `data/physical-packs/benchmark-records.json` using the template in `PHASE_11_REAL_WORLD_PACKAGING_VALIDATION.md`.
  5. Run `node scripts/benchmark-data-entry.mjs` to compute your physical accuracy metrics.
* **Expected Result:** Benchmark tool outputs your real-world Character Error Rate (CER), Word Error Rate (WER), and allergen recall.
* **How to verify completion:** Confirm allergen recall is 100% on your real packaging photos.

---

## Task 6: Recruit and Onboard 10–20 Beta Households (Phase 11.7)
* **What you need to do:** Invite 10–20 friends, family, or colleagues in India to test FoodCue for 3 weeks.
* **Why it is necessary:** Validates real-world household utility, kitchen grocery habits, and usability on diverse Android and iPhone devices.
* **Exact Steps:**
  1. Send the invitation template from `PHASE_11_CLOSED_BETA_OPERATIONAL_PLAN.md` to candidate households.
  2. Guide them to add FoodCue to their smartphone home screen (PWA).
  3. Distribute the Weekly Feedback Questionnaire at the end of Week 1, Week 2, and Week 3.
  4. Log feedback into the tracking sheet schema.
* **Expected Result:** 10+ active households logging grocery items and scanning barcodes.
* **How to verify completion:** Check Clerk user list and Neon `sync_operations` table to confirm active multi-household usage.

---

## Task 7: Review Feedback & Give Final Launch Approval
* **What you need to do:** Conduct a final review of the closed-beta KPI results against the targets in `PHASE_11_CLOSED_BETA_OPERATIONAL_PLAN.md`.
* **Why it is necessary:** To make an evidence-driven decision for public marketing launch.
* **Exact Steps:**
  1. Review CSAT rating ($\ge 4.2/5$), barcode scan success ($\ge 95\%$), and confirmed bug count ($0$ critical).
  2. If all criteria pass, approve Gate P8 and P10.
  3. Announce FoodCue publicly!
* **Expected Result:** Safe, confident, and reliable public product release.
