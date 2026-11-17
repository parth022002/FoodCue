# FoodCue — Actionable Remaining Work Roadmap & Launch Playbook

**Status:** POST-COMPLETION ACTION PLAN  
**Auditor:** Principal Architect & Product Lead  
**Audience:** Product Owner, Engineering Team & Beta Testers  
**Classification:** Operational Guide

---

## 1. Where We Stand Right Now

All software development, architecture, API design, database schemas, and automated testing are **100% COMPLETE**:
- **37 test suites, 213 tests passing.**
- **Production build (`npm run build`) compiles with zero errors.**
- **Step 5 Clerk Webhooks verified live** (`user.created`, `user.updated`, `user.deleted` all confirmed in Svix logs).
- **All 8 completion milestones implemented** (Benchmark engine, OCR worker, camera controls, push reminders, household multi-tenant sharing, 500-SKU offline FMCG catalog, OpenFoodFacts fallback, zero token leaks).
- **Redundant documents and scripts cleanly archived.**

The remaining work is divided into 4 clear priorities (P0 through P3). The software does not need rewrites; the remaining tasks are **deployment validation**, **real-world physical pack photography**, and **beta cohort operations**.

---

## 2. Prioritized Work Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│ P0: Closed Beta Deployment & Live Environment Verification             │
│ (Estimated effort: 1–2 hours)                                          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ P1: Physical 100-Pack Ground Truth Benchmark Collection (Field Data)  │
│ (Estimated effort: 1–2 days)                                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ P2: 4-Week Closed Beta Cohort Execution (10–20 Households)             │
│ (Timeline: 4 weeks calendar duration)                                  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ P3: Public Launch Review & Production Domain Cutover                   │
│ (Timeline: 1–2 days)                                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Priority P0: Closed Beta Deployment & Environment Verification
**Target Timeline:** Immediate (1–2 hours)  
**Goal:** Confirm live Vercel deployment with production database and auth.

- [ ] **Task P0.1 — Verify Vercel Production Environment Variables:**
  Ensure the following variables are configured in the Vercel Project Settings:
  - `VITE_CLERK_PUBLISHABLE_KEY`: Live Clerk Publishable Key (`pk_live_...` or `pk_test_...`)
  - `CLERK_SECRET_KEY`: Live Clerk Secret Key (`sk_live_...` or `sk_test_...`)
  - `CLERK_WEBHOOK_SECRET`: Svix Webhook Signing Secret (`whsec_...`) matching Clerk endpoint
  - `DATABASE_URL`: Neon PostgreSQL connection string with SSL (`postgresql://...?sslmode=require`)
  - `VITE_APP_URL`: Production application URL (e.g. `https://foodcue.vercel.app`)

- [ ] **Task P0.2 — Live Production Smoke Test:**
  Open the deployed URL in a mobile browser (Chrome on Android or Safari on iOS):
  1. Open app offline -> Confirm PWA loads and offline barcode lookup works.
  2. Sign in with Clerk -> Confirm user profile loads.
  3. Enable Cloud Sync in Settings -> Confirm `MigrationPreviewDialog` displays accurately.
  4. Scan a barcode (e.g. Maggi or Amul) -> Confirm instant item match.
  5. Add to pantry -> Check pantry tab.

---

### Priority P1: Physical 100-Pack Ground Truth Benchmark (Gate G4)
**Target Timeline:** 1–2 days  
**Goal:** Collect empirical ground-truth accuracy metrics to satisfy release gate G4.

The automated benchmark evaluator is completely built (`src/domain/services/packBenchmarkEvaluator.ts`). It needs real-world photos and annotations:

- [ ] **Task P1.1 — Photograph 100 Indian FMCG Food Packs:**
  Follow the guidelines in `docs/validation/PACK_BENCHMARK_ANNOTATION_GUIDE.md`:
  - 10 distinct categories (dairy, biscuits, noodles, spices, oils, beverages, snacks, grains, sauces, canned).
  - Take photos under diverse lighting (daylight, warm kitchen light, low light, specular glare).
  - Include both pristine and wrinkled/curved flexible pouches.

- [ ] **Task P1.2 — Record Human Ground Truth in Excel:**
  Open `FoodCue_Validation_Workbook_v13_5_Final_Controlled_Baseline.xlsx` (Sheet: `Benchmark`):
  - Enter the exact printed text for Product Name, Brand, Expiry/Best-Before Date, Net Weight, and Allergens.

- [ ] **Task P1.3 — Run the Benchmark Evaluator:**
  Run the benchmark engine with the populated dataset:
  - Target CER <= 5%, WER <= 10%, Expiry Date Recall >= 95%.
  - Save the output scorecard to `docs/validation/G4_PHYSICAL_PACK_BENCHMARK_REPORT.md`.

---

### Priority P2: 4-Week Closed Beta Cohort Execution (Gate G6)
**Target Timeline:** 4 Weeks (10–20 Real-World Households)  
**Goal:** Validate multi-device sync, real-world pantry turnover, and household collaboration.

- [ ] **Task P2.1 — Invite Cohort Households:**
  - Send onboarding instructions and consent form (`docs/validation/G6_RELEASE_CONTROL_REVIEW.md`) to 10–20 households.
  - Instruct primary users to create a Household in the app and invite family members using Clerk Organizations.

- [ ] **Task P2.2 — Weekly Beta Tracking:**
  - **Week 1:** Onboarding, device registration, initial pantry setup.
  - **Week 2:** Daily scanning, barcode recognition feedback, offline usage check.
  - **Week 3:** Household collaboration, multi-user pantry edits, expiry notification triggers.
  - **Week 4:** Final retention survey, data export check, bug triage.

- [ ] **Task P2.3 — Log Incidents in Register:**
  - Record any scan failures, sync retries, or usability issues in the incident register.

---

### Priority P3: Public Launch Review & Cutover (Gate G6 Closure)
**Target Timeline:** 1–2 days post-beta  
**Goal:** Transition from `CLOSED BETA CANDIDATE` to `PUBLIC LAUNCH READY`.

- [ ] **Task P3.1 — Final Security & Dependency Review:**
  - Run `npm audit --omit=dev` and confirm 0 vulnerabilities.
  - Rotate any development API tokens to production restricted keys.

- [ ] **Task P3.2 — Custom Domain & DNS Mapping:**
  - Map custom domain (e.g. `foodcue.app`) in Vercel.
  - Verify SSL certificate generation and DNS propagation.

- [ ] **Task P3.3 — Public Launch Sign-Off:**
  - Confirm INR 0.00 cash expenditure constraint maintained.
  - Mark Gate G6 as `PASS` and release v1.0.0 to public.

---

## 3. How You Can Start Working on It Right Now

If you want to start right now, follow these immediate steps:

1. **Step 1:** Review this roadmap and the updated `README.md`.
2. **Step 2:** Trigger a deployment or verify your Vercel deployment URL.
3. **Step 3:** Start collecting photos of 10–20 food packs from your kitchen pantry to test the SmartScan camera viewfinder and OCR worker!
