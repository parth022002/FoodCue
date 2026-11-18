# FoodCue — Project Owner Action Checklist

This checklist tracks the physical, external dashboard, and real-world actions required by the project owner to achieve public launch.

---

## 1. Cloud & Dashboard Actions

- [ ] **Task 1: Generate Production Keys in Clerk**
  - Open [Clerk Dashboard](https://dashboard.clerk.com).
  - Switch from Development to **Production** mode.
  - Copy `Publishable key` (`pk_live_...`) and `Secret key` (`sk_live_...`).
  - Add keys to Vercel Environment Variables.
- [ ] **Task 2: Configure Clerk Production Webhook**
  - In Clerk Dashboard $\rightarrow$ Webhooks $\rightarrow$ **Add Endpoint**.
  - URL: `https://<your-vercel-domain>/api/webhooks/clerk`.
  - Check events: `user.created`, `user.updated`, `user.deleted`.
  - Copy the Signing Secret (`whsec_...`) into Vercel as `CLERK_WEBHOOK_SIGNING_SECRET`.
- [ ] **Task 3: Deploy to Vercel**
  - Import `parth022002/FoodCue` into [Vercel](https://vercel.com/new).
  - Add all environment variables from `docs/development/ENVIRONMENT_VARIABLES.md`.
  - Click **Deploy**.
- [ ] **Task 4: (Optional) Connect Custom Domain**
  - In Vercel Domains, configure `foodcue.in` or custom domain.

---

## 2. Real-World Physical Validation (Gate P5)

- [ ] **Task 5: Capture 10–20 Real Food Packaging Photos**
  - Pick items across Indian grocery categories (Dairy, Biscuits, Snacks, Instant food, Cereals, Beverages, Oils, Spices, Staples).
  - Photograph front label, ingredients, allergen statement, and nutritional panel.
  - Save photos into `data/physical-packs/photos/`.
  - Run `node scripts/benchmark-data-entry.mjs` to log ground truth values and verify:
    - Character Error Rate ($\text{CER} \le 0.15$).
    - Allergen Recall ($100\%$ on declared allergens).

---

## 3. Closed-Beta Household Execution (Gate P8)

- [ ] **Task 6: Onboard 10–20 Beta Households**
  - Follow the operational kit in `docs/testing/CLOSED_BETA_OPERATIONAL_PLAN.md`.
  - Guide participants to install the PWA ("Add to Home Screen").
  - Collect weekly feedback across the 3-week pilot.
- [ ] **Task 7: Final Public Launch Approval**
  - Verify Beta KPIs: CSAT $\ge 4.2/5$, scan success $\ge 95\%$, 0 critical data loss bugs.
  - Formally approve Gate P10 for open public release.
