# FoodCue — Physical Packaging Ground Truth Benchmark & Annotation Guide
**Controlling Specification:** Master Specification v13.5 §14 (Gate G4)  
**Standard:** Food Safety and Standards (Labelling and Display) Regulations, 2020  
**Document Version:** 1.0.0  
**Date:** November 2026  
**Audience:** Benchmark Annotators, QA Engineers, Food Safety Auditors  

---

## 1. Overview & Objectives

This guide establishes the standardized, reproducible methodology for collecting, photographing, transcribing, annotating, and reviewing the **FoodCue 100-Pack Physical Ground Truth Benchmark Dataset**.

The dataset consists of:
- **60 Development & Tuning Packs:** Used for iterative algorithm refinement, OCR threshold calibration, and candidate matcher tuning.
- **40 Held-Out Locked Release-Set Packs:** Permanently frozen and isolated. **Never** used for tuning or model training. Used strictly for formal Go/No-Go release gate verification.

---

## 2. Benchmark Record Schema

Each physical benchmark entry is recorded under the following typed schema (`PhysicalPackBenchmarkRecord`):

```typescript
export interface PhysicalPackBenchmarkRecord {
  packId: string;                     // e.g. "PK-DEV-001" or "PK-LCK-001"
  designation: "dev_tuning" | "locked_release";
  brand: string;                      // e.g. "Britannia"
  productName: string;                // e.g. "NutriChoice Digestive High Fibre"
  manufacturer: string;               // e.g. "Britannia Industries Ltd"
  category: "Staples" | "Dairy" | "Biscuits & Bakery" | "Snacks & Instant" | "Breakfast & Cereals" | "Condiments" | "Beverages";
  gtin: string;                       // Normalized 8, 12, 13, or 14-digit GTIN
  packSize: string;                   // e.g. "250 g"
  labelVersion: string;               // e.g. "Batch 2026 / FSSAI 2020 Display"
  captureMetadata: {
    deviceModel: string;              // e.g. "Xiaomi Redmi Note 12", "iPhone 14"
    cameraResolution: string;         // e.g. "12 MP (4000x3000)"
    lightingCondition: "good_daylight" | "low_kitchen_light" | "glare_specular" | "shadows_uneven";
    packagingSubstrate: "plastic_pouch" | "corrugated_box" | "curved_bottle" | "foil_laminate" | "metal_can";
    primaryLanguage: "English" | "Bilingual_Hindi_English";
  };
  expected: {
    barcodeValue: string;
    fssaiLicense: string;
    ingredientsText: string;
    declaredAllergens: string[];
    mayContainAllergens: string[];
    nutritionPer100g: Record<string, number>;
  };
  observed: {
    decodedBarcode?: string;
    extractedFssai?: string;
    ocrRawText?: string;
    extractedIngredients?: string[];
    extractedAllergens?: string[];
  };
  metrics: {
    barcodeMatched: boolean;
    fssaiMatched: boolean;
    cer: number;                      // Character Error Rate (0.00 to 1.00)
    wer: number;                      // Word Error Rate (0.00 to 1.00)
    allergenPrecision: number;
    allergenRecall: number;
    hasFalseHighConfidenceMatch: boolean;
    hasCriticalAllergenMiss: boolean;
  };
  reviewer: string;
  verifiedDate: string;
}
```

---

## 3. Physical Pack Procurement & Multi-Panel Photography Protocol

### 3.1 Procurement Standards
- Items must be purchased from active consumer retail channels in India (Quick-commerce: Blinkit/Zepto/Instamart; Modern retail: DMart/Reliance Fresh; Local kirana).
- Expired or tampered packages must not be used for baseline benchmarking.

### 3.2 Four Orthogonal Capture Panels
For every physical product, photograph the following panels under controlled lighting (250–500 lux):
1. **Panel 1 — Front of Pack (FOP):** Captures brand name, product title, net quantity, and Veg/Non-Veg logo.
2. **Panel 2 — Ingredients Statement:** Full text of the ingredients list, including INS food additive codes.
3. **Panel 3 — Allergen Declaration:** Explicit "Contains..." or "Allergen advice:" statement and cross-contact ("May contain...") warnings.
4. **Panel 4 — Nutrition Facts Table & Batch/Dates:** 100g nutritional column, 14-digit FSSAI licence number, date of manufacture, and expiry/best-before date.

---

## 4. Ground-Truth Annotation Rules

### 4.1 GTIN Verification
- The printed numeral below the 1D/2D barcode stripes must be manually double-checked.
- Validate modulo-10 checksum using GS1 standards (`normaliseGtin()`).

### 4.2 Ingredient & Allergen Normalization
- Transcribe text exactly as printed on the physical packaging, preserving capitalization and punctuation.
- In `declaredAllergens`, list only positively declared allergens mandated under FSSAI 2020 Schedule II (Gluten, Milk, Eggs, Fish, Crustaceans, Peanuts, Tree Nuts, Soybeans, Sulphites $\ge 10\text{mg/kg}$).
- In `mayContainAllergens`, list advisory cross-contact statements.

---

## 5. Metric Calculation Formulas

### Character Error Rate (CER)
$$\text{CER} = \frac{S_c + D_c + I_c}{N_c}$$
Where $S_c$ is substitutions, $D_c$ is deletions, $I_c$ is insertions, and $N_c$ is the total number of characters in the ground-truth string (computed via Levenshtein distance).

### Word Error Rate (WER)
$$\text{WER} = \frac{S_w + D_w + I_w}{N_w}$$
Where $S_w, D_w, I_w$ are word-level edit operations and $N_w$ is the total words in the ground-truth text.

### Allergen Precision & Recall
$$\text{Precision} = \frac{\text{True Positives}}{\text{True Positives} + \text{False Positives}}$$
$$\text{Recall} = \frac{\text{True Positives}}{\text{True Positives} + \text{False Negatives}}$$

---

## 6. Locked Release-Set Integrity Rules (Zero-Tolerance Gate)

1. The 40 locked release-set packs (`PK-LCK-001` through `PK-LCK-040`) are cryptographically sealed.
2. **Non-Waivable Safety Invariant 1:** $\text{False High-Confidence Matches} = 0$. If an algorithm confidently pairs a locked pack with an incorrect SKU, the gate is marked **FAIL**.
3. **Non-Waivable Safety Invariant 2:** $\text{Critical Allergen Misses Presented as Reassuring} = 0$. If a product containing milk or peanuts is displayed as "Allergen-Free" or "Safe", the release is immediately halted (**NO-GO**).
