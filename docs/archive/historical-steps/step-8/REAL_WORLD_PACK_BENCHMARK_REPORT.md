# FoodCue — Step 8: Real-World Pack Benchmark Report
**Controlling Authority:** FoodCue Master Specification v13.5 §19.2, §21.1; Validation Workbook v13.5 `Benchmark`  
**Scope:** Pack Sampling Methodology, Reference Catalog Datasets & Release-Set Criteria  
**Status:** BENCHMARK PROTOCOL READY; REAL-WORLD FIELD BENCHMARK PENDING

---

## 1. Benchmark Requirements (Master Spec §19.2)

To satisfy Gate G4 (Technical and Safety Validation), FoodCue requires:
1. **Minimum Sample:** At least **100 complete, verified physical packaged food products** sampled across major Indian FMCG categories.
2. **Locked Release Set:** At least **40 locked evaluation cases** that are strictly separated from development datasets and never used to tune OCR or regex patterns.
3. **Safety Invariants:**
   - **Zero (0) false high-confidence product matches** in the locked release set.
   - **Zero (0) critical allergen misses** presented as reassuring.
   - At least 30 critical code tests passing on the release candidate.

---

## 2. Current Reference Dataset in Repository

The codebase currently contains 10 verified golden reference food products modeled in `src/domain/entities/catalogData.ts`:

1. `8901719101037`: **Parle-G Original Gluco Biscuits** (Parle Products, 250g)
2. `8901058852332`: **Maggi 2-Minute Masala Noodles** (Nestle India, 70g)
3. `8901030028753`: **Tata Salt Vacuum Evaporated Iodised** (Tata Consumer Products, 1kg)
4. `8901262010046`: **Amul Butter Pasteurized Salted** (GCMMF Amul, 100g)
5. `8901725181221`: **Aashirvaad Shudh Chakki Atta** (ITC Limited, 5kg)
6. `8901063142287`: **Britannia Good Day Butter Cookies** (Britannia Industries, 200g)
7. `8901030825345`: **Tata Tea Premium Desh Ki Chai** (Tata Consumer Products, 500g)
8. `8901499008144`: **Haldiram's Nagpur Bhujia Sev** (Haldiram Foods, 150g)
9. `8901063013228`: **Kissan Fresh Tomato Ketchup** (Hindustan Unilever, 500g)
10. `8901058849417`: **Nestle Everyday Dairy Whitener** (Nestle India, 400g)

Each product contains complete verified ingredients text, declared allergens, precautionary allergens, nutritional panels per 100g, FSSAI licence numbers, and packaging dimensions.

---

## 3. Real-World Pack Verification Gap Analysis

| Metric | Master Spec Requirement | Current In-Repo Status | Gap / Disposition |
| :--- | :---: | :---: | :--- |
| **Total Verified Packs** | >= 100 complete packs | 10 verified seeds | **Needs 90 additional verified physical packs** |
| **Locked Release Set** | >= 40 locked cases | 0 locked cases in workbook | **Needs 40 real-world camera captures** |
| **False High-Confidence Matches** | 0 allowed | 0 observed in automated tests | Compliant in code; pending field capture |
| **Critical Allergen Misses** | 0 allowed | 0 observed in automated tests | Compliant in code; pending field capture |

---

## 4. Field Benchmark Protocol for Beta Eligibility

To collect the remaining 90 packs and 40 locked cases without violating the INR 0 cash constraint:
1. **Sampling Frame:** Standard pantry audits across 5 retail categories (Biscuits & Snacks, Grains & Flours, Dairy & Fats, Condiments & Sauces, Beverages).
2. **Capture Protocol:**
   - 4 orthogonal photos per pack: Front display panel, Barcode/GTIN panel, Ingredients & Allergen declaration panel, Nutritional facts panel.
   - Lighting variations: 50% daylight, 30% warm indoor artificial light, 20% low-light shadow conditions.
   - Physical conditions: Pristine box, curved cylinder (cans/bottles), folded/wrinkled plastic pouches.
3. **Recording:** Data must be populated into `FoodCue_Validation_Workbook_v13_5_Final_Controlled_Baseline.xlsx` (Sheet `Benchmark`, columns A through AF).

**Status:** The technical pipeline (`SmartScan -> OCR -> CandidateMatcher -> ConfirmedLabel -> FoodIntelligence`) is fully tested and ready to ingest the 100-pack dataset once physically photographed.
