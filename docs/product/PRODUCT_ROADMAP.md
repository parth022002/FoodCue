# FoodCue — Product Roadmap & Milestone Release Status

This document records the official progression of FoodCue development milestones, their completion status, and the roadmap leading to public release.

---

## 1. Milestone Execution History

| Milestone | Scope & Deliverable | Status | Verification Evidence |
|:---:|---|:---:|---|
| **M1** | **Physical Pack Ground Truth Benchmark** | **Complete (Math & Tooling)** | `packBenchmarkEvaluator.ts` and `benchmark-data-entry.mjs` verified. |
| **M2** | **On-Device OCR Web Worker Optimisation** | **Complete** | Tesseract.js worker with adaptive binarization, CLAHE, and unit tests passing. |
| **M3** | **SmartScan Mobile Hardware Controls** | **Complete** | Viewfinder camera controls (torch, zoom, switch camera, tap-to-focus) implemented. |
| **M4** | **Web Push Notifications for Expiring Food** | **Complete** | VAPID push protocol, service worker handler, and subscription endpoint verified. |
| **M5** | **Household Sharing via Clerk Organizations** | **Complete** | Multi-tenant pantry and shopping list isolation verified with passing E2E tests. |
| **M6** | **Offline Indian FMCG Barcode Catalogue** | **Complete** | Local curated catalog of 500+ top Indian FMCG products (`fmcgCatalogManager.ts`). |
| **M7** | **OpenFoodFacts GTIN Metadata Fallback** | **Complete** | Full API client, ODbL attribution, privacy guard, and field mapping verified. |
| **M8** | **AI Agent Integrations (Groq, OpenRouter, Tavily)** | **Complete** | Adapters for Whisper audio, Llama vision fallback, and Tavily FMCG search verified live (200 OK). |
| **M9** | **Cloud Persistence & Sync Engine (Neon + Dexie)** | **Complete** | 15 Neon tables, vector clock conflict resolution, and offline sync queue verified. |

---

## 2. Release Gate Progression (P1 to P10)

FoodCue employs 10 strict production release gates prior to open public marketing:

```text
[P1: Build Integrity]  ---> [P2: Production Config] ---> [P3: Auth & DB]
       ✓ PASS                      PARTIAL                     ✓ PASS
                                      |
[P4: E2E User Journeys] ---> [P5: Pack Photo Benchmark] -> [P6: Nutrition Accuracy]
       ✓ PASS                      PARTIAL                     ✓ PASS
                                      |
[P7: Security & Privacy] --> [P8: Closed-Beta Pilot] ---> [P9: Performance & A11y]
       ✓ PASS                      PARTIAL                     ✓ PASS
                                      |
                                [P10: Public Launch]
                                   CONDITIONAL GO
```

- **Gates Fully Passed (7/10):** P1 (Build), P3 (Auth & DB), P4 (E2E Journeys), P6 (Nutrition Accuracy), P7 (Security & Privacy), P9 (Performance & Accessibility), P10 (Backup Runbooks).
- **Gates with Pending External Operations (3/10):**
  - **P2:** Clerk Production Mode switch (`pk_live_...`).
  - **P5:** Capturing 10–20 real smartphone pack photographs.
  - **P8:** Running the 3-week 10–20 household closed-beta cohort.
