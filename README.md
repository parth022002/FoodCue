# FoodCue — Know your food. Manage your kitchen.

```text
========================================================================================
PROJECT:               FoodCue
VERSION:               v5.2.0 (Phase 11 Production Baseline)
DEVELOPER:             Parth Ahuja
REPOSITORY:            https://github.com/parth022002/FoodCue.git
ARCHITECTURE:          Local-First Progressive Web App (PWA) + Neon PostgreSQL + Clerk
CONTROLLING BUDGET:    INR 0.00 Cash Expenditure (All core services within free tiers)
STATUS:                240/240 Tests Passing (43 Suites) | 0 TypeScript Errors | Clean Build
========================================================================================
```

FoodCue is a **local-first, privacy-conscious packaged-food intelligence and kitchen-management Progressive Web Application (PWA)**. It helps households understand packaged-food labels, identify ingredients and allergens, interpret nutritional information, manage kitchen inventory, track expiration dates, and organize pantry stock.

---

## 🚀 Key Capabilities

- **Local-First & Zero Mandatory Accounts:** 100% operational offline using client-side IndexedDB (Dexie). Barcode scanning, OCR packaging analysis, pantry logging, and avoid-list checks require zero sign-in.
- **Universal SmartScan Pipeline:**
  - Real-time camera viewfinder with hardware controls (torch/flashlight, zoom slider, camera switcher, tap-to-focus).
  - Universal 1D/2D barcode decoding powered by `@sec-ant/zxing-wasm` (EAN-13, EAN-8, UPC-A, UPC-E, QR Code, GS1 Digital Link) in $<100\text{ms}$.
  - Background Web Worker OCR with adaptive binarization, CLAHE contrast enhancement, and noise filtering.
- **Multi-Tier Product Resolution:**
  - **Tier 1:** Curated offline Indian FMCG catalog (500+ top SKUs: Amul, Britannia, Parle, Nestle, Tata, Haldiram's, Dabur, Mother Dairy, MDH).
  - **Tier 2:** Open Food Facts global open database with compliant ODbL attribution.
  - **Tier 3:** Tavily AI Web Search for real-time verified Indian grocery product intelligence.
- **Deterministic Food Safety & 0–100 Health Scoring:**
  - Mathematical health score formula penalizing energy density, saturated fats, sugars, sodium, and ultra-processed INS additives.
  - Fail-closed allergen matching against personal and household avoid-lists.
  - Missing nutrients strictly preserved as `null` (never falsely assumed as 0).
- **Append-Only Pantry Event Ledger:**
  - Resilient event-sourcing design with vector clocks and deterministic Last-Write-Wins (LWW) conflict resolution.
- **Multi-Tenant Household Sharing:**
  - Family kitchen inventory collaboration powered by Clerk Organizations with row-level tenant isolation in Neon PostgreSQL.
- **Web Push Notifications:**
  - VAPID background notifications alerting users before perishable pantry food items expire.

---

## 📚 Canonical Documentation Index

All project documentation is structured authoritatively in `docs/`:

```text
docs/
├── product/
│   ├── PRODUCT_REQUIREMENTS.md       # Full PRD, core principles & target audience
│   ├── FEATURES_AND_USER_JOURNEYS.md # Complete user journeys (A–E) & route map
│   └── PRODUCT_ROADMAP.md            # Milestones 1–5 history & release gate progression
├── architecture/
│   ├── SYSTEM_ARCHITECTURE.md        # Authoritative system blueprint & data flow
│   ├── DATABASE_SCHEMA.md            # Client IndexedDB & Neon PostgreSQL (15 tables)
│   └── TECHNICAL_DECISIONS.md        # Architecture Decision Records (ADRs)
├── development/
│   ├── PROJECT_SETUP.md              # Workstation setup & prerequisites
│   ├── DEVELOPMENT_GUIDE.md          # Code standards, patterns & project structure
│   ├── API_DOCUMENTATION.md          # Serverless endpoints reference & schemas
│   └── ENVIRONMENT_VARIABLES.md      # Master configuration matrix & key reference
├── security/
│   ├── SECURITY_PRIVACY_AND_SAFETY.md # Zero image retention, OWASP & food safety
│   └── AUTHENTICATION_AND_AUTHORIZATION.md # Clerk auth, roles & Svix webhooks
├── integrations/
│   └── EXTERNAL_INTEGRATIONS.md      # OpenFoodFacts, Tavily, Groq, OpenRouter & Push
├── deployment/
│   ├── PRODUCTION_DEPLOYMENT.md      # Vercel, Neon & Clerk deployment guide
│   ├── OPERATIONS_AND_RECOVERY_GUIDE.md # Backup, PITR, rollback & incident SLAs
│   └── OWNER_ACTION_CHECKLIST.md     # Personal action checklist for project owner
├── testing/
│   ├── TESTING_AND_QUALITY_ASSURANCE.md # Vitest test suites, benchmarks & WCAG 2.2 AA
│   └── CLOSED_BETA_OPERATIONAL_PLAN.md  # 3-week 10–20 household beta kit & surveys
└── archive/
    ├── validation/                   # Historical Gate G1–G6 validation reports
    └── phase-11/                     # Phase 11 baseline & launch readiness reports
```

---

## 🛠️ Development & Validation Commands

All commands can be executed using standard `npm`:

```bash
# 1. Install dependencies
npm ci

# 2. Start local development server
npm run dev

# 3. Typecheck TypeScript
npm run typecheck

# 4. Lint codebase
npm run lint

# 5. Run all 43 automated test suites (240 tests)
npm test

# 6. Verify production build & bundle serverless functions
npm run build

# 7. Audit all external API keys live
node --env-file=.env scripts/test-all-api-keys.mjs

# 8. Run physical packaging benchmark CLI
node scripts/benchmark-data-entry.mjs
```

---

## ⚖️ License & Attribution

- **Dependencies & Licenses:** Detailed in [LICENSE-DEPENDENCIES.md](LICENSE-DEPENDENCIES.md).
- **Product Data:** Open Food Facts data licensed under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
- **Contributions:** Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.
