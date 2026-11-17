# FoodCue — Phase 11.4 Real-World Physical Food Packaging Validation

**Auditor:** Food Safety Validation Specialist & QA Automation Lead  
**Evaluation Methodology:** Food Safety and Standards (Labelling and Display) Regulations, 2020  
**Evaluator Implementation:** `src/domain/services/packBenchmarkEvaluator.ts`  
**Data Directory:** `data/physical-packs/`  
**Tooling:** `node scripts/benchmark-data-entry.mjs`

---

## 1. Executive Summary & Verification Finding

In Phase 11.1, an audit of the repository revealed that while **tabular metadata for 100 products exists** in `docs/validation/G4_LOCKED_RELEASE_SET_REPORT.md` and 500+ items exist in `src/domain/entities/catalogData.ts`, **actual packaging photographs (.jpg, .png) were never stored in this Git repository** (the repository contains only `public/favicon.png`).

To transition FoodCue from synthetic/tabular assertions to **genuine physical pack validation**, this document establishes:
1. The 10 physical food product categories required for physical validation.
2. The empirical performance metrics (CER, WER, Allergen Recall/Precision, FSSAI license extraction).
3. The zero-tolerance safety requirement for declared allergens.
4. A simple data-entry workflow and template for photographing physical products and entering ground-truth annotations.

---

## 2. 10 Core Physical Packaging Validation Categories

The physical test cohort must sample representative products across the Indian retail packaged food landscape:

| Category # | Category Name | Common Substrates & Challenges | Target Benchmark SKUs |
| :---: | :--- | :--- | :--- |
| **1** | **Dairy Products** | Glossy pouches, refrigerated condensation, curved plastic tubs (e.g. Amul Butter, Mother Dairy Dahi) | 10 Packs |
| **2** | **Biscuits & Bakery** | BOPP metallic foil laminate, crimped edges, reflective packaging (e.g. Parle-G, Britannia Good Day) | 10 Packs |
| **3** | **Snacks** | Nitrogen-flushed pillow pouches, wrinkled foil, warped barcodes (e.g. Lay's, Haldiram's Bhujia) | 10 Packs |
| **4** | **Instant Food** | Multi-pack poly-wraps, high-density small font ingredient tables (e.g. Maggi Noodles, Knorr Soups) | 10 Packs |
| **5** | **Breakfast Cereals** | Matte corrugated cardboard boxes, bilingual Hindi/English labels (e.g. Kellogg's Corn Flakes) | 10 Packs |
| **6** | **Beverages** | Cylindrical PET bottles, metallic aluminum cans, glare (e.g. Frooti, Red Bull, Paper Boat) | 10 Packs |
| **7** | **Edible Oils** | Translucent HDPE cans, oil-stained labels, pouch spouts (e.g. Fortune Sunflower Oil, Saffola Gold) | 10 Packs |
| **8** | **Spices & Seasonings** | Stand-up zippered pouches, small net wt typography, fine print (e.g. Everest Garam Masala, MDH) | 10 Packs |
| **9** | **Packaged Staples** | Heavy poly woven sacks, transparent gusseted bags (e.g. Tata Salt, Aashirvaad Atta, Daawat Rice) | 10 Packs |
| **10** | **Sweets & Confectionery**| Twist-wrapped individual packs, foil cartons, shiny metallic fonts (e.g. Cadbury Dairy Milk, Ferrero) | 10 Packs |

---

## 3. Mathematical Evaluation Criteria & Safety Thresholds

All physical pack evaluations are computed by `src/domain/services/packBenchmarkEvaluator.ts`:

1. **Character Error Rate (CER):**
   $$\text{CER} = \frac{\text{Levenshtein}(T_{\text{expected}}, T_{\text{observed}})}{\max(1, \text{length}(T_{\text{expected}}))}$$
   - *Target Threshold:* $\text{CER} \le 0.15$ (Mean $\le 15\%$ character error across glossy and matte packaging).

2. **Word Error Rate (WER):**
   $$\text{WER} = \frac{\text{WordEditDistance}(W_{\text{expected}}, W_{\text{observed}})}{\max(1, \text{length}(W_{\text{expected}}))}$$
   - *Target Threshold:* $\text{WER} \le 0.25$ on ingredient panel text.

3. **Allergen Recall & Precision (Safety Invariant):**
   - **Declared Allergen Recall: MANDATORY 100% on the locked test set.**
   - Zero tolerance for false negatives ($\text{FN} = 0$). If a declared allergen (e.g., Milk, Wheat, Peanut) is printed on the physical packaging label, FoodCue's scanner must detect it.
   - **Fail-Closed Uncertainty Warning:** If lighting conditions, blur, or glare prevent confident allergen extraction, the application must display an explicit warning:
     > *"⚠️ Camera text is partially obscured or unreadable. Please manually inspect physical packaging for allergen statements."*

4. **14-Digit FSSAI Licence Extraction:**
   - Evaluated using deterministic regex `/\b[12]\d{13}\b/`. Target accuracy: $\ge 90\%$.

---

## 4. Physical Pack Annotation Template & Data Entry Workflow

To record physical pack test results from your smartphone camera:

### Step 1: Photograph the Physical Pack
Capture 4 clear photographs per product:
- `front.jpg` — Product name, brand, net quantity, veg/non-veg logo.
- `ingredients.jpg` — Complete ingredient list and INS numbers.
- `allergens.jpg` — Declared allergen statement (`"Contains..."` or `"May contain..."`).
- `nutrition_fssai.jpg` — Nutrition facts per 100g/serving and 14-digit FSSAI license number.

### Step 2: Record Ground-Truth in `data/physical-packs/benchmark-records.json`
Use the following JSON structure:

```json
{
  "packId": "PK-PHYSICAL-001",
  "category": "Dairy products",
  "brand": "Amul",
  "productName": "Pasteurised Butter",
  "gtin": "8901262150055",
  "packSize": "500 g",
  "photos": {
    "front": "data/physical-packs/photos/PK-001-front.jpg",
    "ingredients": "data/physical-packs/photos/PK-001-ingredients.jpg",
    "allergens": "data/physical-packs/photos/PK-001-allergens.jpg",
    "nutrition": "data/physical-packs/photos/PK-001-nutrition.jpg"
  },
  "expected": {
    "barcodeValue": "8901262150055",
    "fssaiLicense": "10012021000071",
    "ingredientsText": "Butter, Common Salt. Permitted natural color (Annatto).",
    "declaredAllergens": ["Milk"],
    "nutritionPer100g": {
      "energyKcal": 722,
      "totalFat": 80,
      "saturatedFat": 51,
      "transFat": 3.6,
      "cholesterol": 180,
      "protein": 0.5,
      "carbs": 0,
      "sodium": 830
    }
  },
  "observed": {
    "decodedBarcode": "8901262150055",
    "extractedFssai": "10012021000071",
    "ocrRawText": "Butter, Common Salt. Permitted natural color (Annatto). Contains Milk",
    "extractedAllergens": ["Milk"]
  }
}
```

### Step 3: Run Validation Metric Evaluation
Execute the benchmark validator tool:
```bash
node scripts/benchmark-data-entry.mjs
```
The script will compute the overall CER, WER, Barcode detection accuracy, and allergen safety compliance across all physically photographed products.
