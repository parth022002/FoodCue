# FoodCue — Outstanding Work & Maintenance Backlog
**Controlling Authority:** FoodCue Master Specification v13.5 §23; PRD v1.2 §12  
**Document ID:** `BACKLOG-20261117-01`  
**Date:** 17 November 2026  
**Status:** ACTIONABLE FIELDWORK & FUTURE MAINTENANCE ROADMAP  

---

## 1. Immediate Actionable Fieldwork (Next Milestones)

The following 4 tasks constitute the immediate operational roadmap to advance FoodCue from internal technical completion to live household closed beta:

### Task 1: Physical Pack Benchmark Capture (Gate G4)
- **Objective:** Collect and photograph 90 additional Indian FMCG packaged food items across 5 core categories.
- **Deliverables:**
  - 4 photos per item (Front, Barcode, Ingredients/Allergens, Nutrition).
  - Populate sheet `Benchmark` in `FoodCue_Validation_Workbook_v13_5_Final_Controlled_Baseline.xlsx`.
  - Designate 40 locked release-set cases.
- **Estimated Founder Effort:** 12 to 16 hours.

### Task 2: Consumer Problem Interviews (Gate G1)
- **Objective:** Conduct 20 qualitative interviews with household grocery decision-makers on food label confusion, allergy concerns, and pantry expiry waste.
- **Deliverables:**
  - Record summaries in sheet `Interviews`.
  - Verify top job share >= 35% and best segment cell >= 8.
- **Estimated Founder Effort:** 10 hours.

### Task 3: Consumer Discovery Survey (Gate G1)
- **Objective:** Collect 100 usable survey responses using free survey tools (Google Forms).
- **Deliverables:**
  - Populate sheet `Survey_Responses`.
- **Estimated Effort:** 4 hours setup + distribution.

### Task 4: Execute 4-Week Closed Beta (Step 9)
- **Objective:** Distribute private beta link `https://food-cue.vercel.app` to 10–20 opt-in households.
- **Deliverables:**
  - Execute weekly review touchpoints using `WEEKLY_BETA_REVIEW_TEMPLATE_AND_RECORDS.md`.
  - Maintain local-first data privacy boundary.
  - Calculate Week 4 retention (target >= 30%).

---

## 2. Maintenance & Phase 2 Deferred Backlog

| Item ID | Category | Description | Priority | Scheduling |
| :---: | :--- | :--- | :---: | :---: |
| **MNT-01** | OCR | Evaluate on-device Hindi / Devanagari OCR script recognition. | P2 | Phase 2 (Post-Launch) |
| **MNT-02** | External Data | Integrate official FSSAI Food Safety Compliance System (FoSCoS) verified registry. | P2 | Post-Beta (Subject to licensing) |
| **MNT-03** | Cloud Sync | WebSocket live multi-tab synchronization indicator. | P3 | Post-Beta |
| **MNT-04** | AI / Vision | Generative vision fallback for highly degraded, crumpled packaging labels. | P3 | Phase 2 (Requires funded unit economics) |
| **MNT-05** | Performance | WebAssembly multi-threading for faster image decoding on multi-core mobile CPUs. | P3 | Future Maintenance |

---

## 3. Maintenance Sign-Off
All software defects in Steps 1 through 7 are completely remediated. The codebase is fully stable, tested, and ready for physical benchmark execution.
