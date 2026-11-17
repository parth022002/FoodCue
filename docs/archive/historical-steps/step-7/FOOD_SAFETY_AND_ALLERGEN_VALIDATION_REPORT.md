# FoodCue — Food Safety & Allergen Validation Report
**Controlling Authority:** FoodCue Master Specification v13.5 §4, §8; PRD v1.2 §5  
**Evaluation Scope:** Food Intelligence Engine, 6 Canonical Allergen States, Additive Recognition & Prohibited Claims Defense  
**Run ID:** `RUN-SAFETY-ALLERGEN-20261117-01`  
**Git Commit Hash:** `4b94ae3`  
**Status:** PASS (Deterministic Invariants & Safety Controls Fully Verified)

---

## 1. Executive Summary

FoodCue enforces strict deterministic food safety analysis. It **NEVER** uses generative AI models, hallucinated summaries, or unvalidated scoring algorithms to produce food safety or allergen declarations.

This report evaluates:
1. Canonical allergen state assignment across the 8 mandatory Indian FMCG allergen classes.
2. The expanded Indian FMCG additive dictionary (30 common additives).
3. The absolute prohibition of universal health/safety scores.
4. Handling of unreadable, missing, or contradictory label evidence.

---

## 2. Six Canonical Allergen States

In accordance with Master Specification §8.2, every monitored allergen is evaluated into exactly one of six mutually exclusive, deterministic states:

| Canonical State | Definition | UI Presentation Rule |
| :--- | :--- | :--- |
| **`declared_contains`** | Explicitly stated in the manufacturer's allergen declaration panel (e.g. *"Contains Wheat, Milk"*). | High visibility alert: Confirmed Present. |
| **`listed_in_ingredients`** | Ingredient name or direct derivative matched in the ingredients list (e.g. *"clarified butter"*, *"casein"*). | Clear alert: Present in Ingredients. |
| **`derived_contains`** | Inferred from unambiguous chemical synonym or additive carrier. | Informational notice: Derived ingredient. |
| **`declared_may_contain`** | Precautionary Allergen Labelling (PAL) by manufacturer (e.g. *"May contain traces of nuts"*). | Warning notice: Cross-contact risk. |
| **`uncertain`** | OCR text is smudged, low-contrast, folded, or partially obscured. | Amber warning: Unreadable; inspect physically. |
| **`not_detected_in_extracted_text`** | No matching keywords found in extracted text. | **MANDATORY NOTICE:** *"Not detected in extracted text; check physical label. This is not proof of total absence."* |

### Critical Allergen Safety Invariant (SAF-02)
- Absence of evidence is **never** presented as evidence of absence.
- Missing text, empty allergen panels, or unreadable fields **never** produce a reassuring "Allergen Free" label.
- Evaluated and verified in `test/safety/foodSafetyAdversarial.test.ts`.

---

## 3. Indian FMCG Additive Dictionary Expansion

The deterministic additive dictionary in `src/domain/rules/foodIntelligenceEngine.ts` maps International Numbering System (INS) codes to their standardized names and technological purposes:

- **Preservatives:** INS 211 (Sodium Benzoate), INS 223 (Sodium Metabisulphite), INS 202 (Potassium Sorbate).
- **Acidity Regulators & Raising Agents:** INS 330 (Citric Acid), INS 500(ii) (Sodium Bicarbonate), INS 503(ii) (Ammonium Bicarbonate), INS 450 (Diphosphates).
- **Emulsifiers & Stabilizers:** INS 322 (Lecithin / Soy), INS 412 (Guar Gum), INS 415 (Xanthan Gum), INS 471 (Mono- and Diglycerides), INS 407 (Carrageenan), INS 452 (Polyphosphates).
- **Flavor Enhancers:** INS 621 (Monosodium Glutamate), INS 627 (Disodium Guanylate), INS 631 (Disodium Inosinate).
- **Antioxidants:** INS 300 (Ascorbic Acid), INS 319 (TBHQ), INS 320 (BHA).
- **Sweeteners:** INS 955 (Sucralose), INS 950 (Acesulfame K), INS 960 (Stevia), INS 951 (Aspartame).
- **Synthetic Food Colours:** INS 102 (Tartrazine), INS 110 (Sunset Yellow), INS 122 (Carmoisine), INS 133 (Brilliant Blue).
- **Anti-foaming / Anti-caking:** INS 900a (Polydimethylsiloxane), INS 551 (Silicon Dioxide).

---

## 4. Prohibited Product Claims Audit (Master Spec §4.1)

FoodCue strictly prohibits misleading claims. An automated code and contract audit confirms:
1. **Zero Universal Health Scores:** No Nutri-Score, aggregate grade (A to F), or 1-to-100 index is calculated or displayed on `DetailedFoodAnalysis`.
2. **Zero Medical Diagnoses:** No recommendations regarding disease treatment, diabetes curing, or allergy desensitization.
3. **Transparent Fact Presentation:** Nutrients are reported per 100g or per serving exactly as declared on the packaging label without normative judgment.

---

## 5. Verification Test Matrix

| Test ID | Suite | Result | Key Assertion |
| :--- | :--- | :---: | :--- |
| **TEST-SAFE-01** | `foodIntelligenceEngine.test.ts` | **PASS** | Parle-G label detects wheat, milk, and sulphite INS 223 |
| **TEST-SAFE-02** | `foodIntelligenceEngine.test.ts` | **PASS** | Maggi Noodles label evaluates noodles, tastemaker, palm oil |
| **TEST-SAFE-03** | `foodIntelligenceEngine.test.ts` | **PASS** | Expanded additive recognition across 30 INS codes |
| **TEST-SAFE-04** | `foodSafetyAdversarial.test.ts` | **PASS** | Candidate with missing panels throws `ConfirmationError` |
| **TEST-SAFE-05** | `foodSafetyAdversarial.test.ts` | **PASS** | Candidate with unresolved conflict throws `ConfirmationError` |
| **TEST-SAFE-06** | `foodSafetyAdversarial.test.ts` | **PASS** | Empty allergen text attaches mandatory caveat notice |
| **TEST-SAFE-07** | `foodSafetyAdversarial.test.ts` | **PASS** | DetailedFoodAnalysis contains no health scores |
| **TEST-SAFE-08** | `foodSafetyAdversarial.test.ts` | **PASS** | Multilingual transliterations (gram flour, soan papdi) detected |

**Conclusion:** The food intelligence engine operates deterministically with zero unvalidated claims.
