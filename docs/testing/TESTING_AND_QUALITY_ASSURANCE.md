# FoodCue — Testing, Quality Assurance & Validation Manual

**Document Version:** 2.1 (Authoritative QA Guide)  
**Test Suite Baseline:** Vitest 2.1.8 | 43 Test Files | 240 Passing Tests (100% Pass Rate)  

---

## 1. Test Architecture & Directory Map

```text
test/
├── adapters/                 # OCR worker, image preprocessor, notification service
├── domain/                   # FMCG catalog, health score, candidate matcher, benchmark
├── e2e/                      # End-to-End user journeys (Journeys A through E)
├── features/                 # React UI components, SmartScan viewfinder, home views
├── integrations/             # OpenFoodFacts client, schema, mapper, privacy guard
├── safety/                   # Adversarial food safety and allergen bypass attempts
├── security/                 # OWASP threats, QR injection, auth token validation
└── server/                   # Serverless endpoints, Clerk webhook Svix verification
```

---

## 2. Automated Test Execution Commands

```bash
# Run the complete test suite once
npm test

# Run tests in watch mode during development
npm run test:watch

# Run a specific test suite
npx vitest run test/e2e/phase11UserJourneys.test.ts

# Run with test coverage report
npx vitest run --coverage
```

---

## 3. Physical Packaging Benchmark (Gate P5)

### 3.1 Benchmark Framework
FoodCue includes an automated packaging benchmark evaluation engine in `src/domain/services/packBenchmarkEvaluator.ts`. It deterministically computes:
- **Character Error Rate (CER):** Levenshtein distance on recognized text normalized by ground-truth character length. (Target: $\le 0.15$).
- **Word Error Rate (WER):** Word-level edit distance. (Target: $\le 0.25$).
- **Allergen Recall:** Percentage of declared allergens recognized by the OCR and avoid-list parser. (Target: **100% strict**).

### 3.2 Data Entry & Validation Tool
Run the interactive CLI tool:
```bash
node scripts/benchmark-data-entry.mjs
```
The tool guides logging ground truth labels and compares them against extracted text in `data/physical-packs/benchmark-records.json`.

---

## 4. Performance & Accessibility Standards (WCAG 2.2 AA)

- **Touch Targets:** All interactive buttons, camera toggles, and navigation links have touch target dimensions $\ge 48\text{px} \times 48\text{px}$.
- **Color Contrast:** All text meets or exceeds WCAG 2.2 AA ratios:
  - Normal text ($<18\text{pt}$): Contrast $\ge 4.5:1$ (FoodCue UI achieves $5.14:1$ to $12.6:1$).
  - Large text / Headings: Contrast $\ge 3:1$.
- **Bundle Size:** Compressed initial JavaScript bundle $\sim 139\text{ KB}$ gzip; LCP $< 2.0\text{s}$ on standard 4G mobile connections.

---

## 5. Adversarial Food Safety Test Suite

Located in `test/safety/foodSafetyAdversarial.test.ts`. Specifically validates:
1. **Punctuation Evasion:** Statements like `"Contains: P.E.A.N.U.T.S"` or `"milk-derived"` are correctly matched against avoid-lists.
2. **Hidden Sugars:** Ingredients like `"high fructose corn syrup"`, `"maltodextrin"`, and `"dextrose"` are correctly classified as sugars.
3. **Null Nutrient Preservation:** Unreported nutrients are never asserted as 0, preventing false "zero sodium" or "sugar-free" ratings.
