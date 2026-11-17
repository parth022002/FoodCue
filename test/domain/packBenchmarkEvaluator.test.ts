import { describe, it, expect } from "vitest";
import {
  computeLevenshteinDistance,
  computeCer,
  computeWer,
  evaluateBenchmarkPack,
  evaluateBenchmarkDataset,
  type PhysicalPackBenchmarkRecord,
} from "../../src/domain/services/packBenchmarkEvaluator";

describe("Physical Pack Ground Truth Benchmark Evaluator", () => {
  describe("Levenshtein Distance, CER, and WER Math", () => {
    it("computes exact match as zero distance, CER 0 and WER 0", () => {
      const s = "Edible Common Salt, Potassium Iodate";
      expect(computeLevenshteinDistance(s, s)).toBe(0);
      expect(computeCer(s, s)).toBe(0);
      expect(computeWer(s, s)).toBe(0);
    });

    it("computes single-character substitution correctly", () => {
      const exp = "Amul Butter";
      const obs = "Amul Bitter"; // 'u' replaced by 'i'
      expect(computeLevenshteinDistance(exp, obs)).toBe(1);
      expect(computeCer(exp, obs)).toBeCloseTo(1 / exp.length, 2);
    });

    it("computes word edit distance accurately", () => {
      const exp = "Contains Wheat Milk and Soy";
      const obs = "Contains Wheat and Soy"; // 'Milk' deleted (1 word op)
      expect(computeWer(exp, obs)).toBe(0.2); // 1 deletion / 5 words = 0.2
    });
  });

  describe("Individual Pack Evaluation", () => {
    const sampleRecord: PhysicalPackBenchmarkRecord = {
      packId: "PK-DEV-001",
      designation: "dev_tuning",
      brand: "Britannia",
      productName: "Good Day Butter Cookies",
      manufacturer: "Britannia Industries Ltd",
      category: "Biscuits & Bakery",
      gtin: "8901063012059",
      packSize: "120 g",
      labelVersion: "Batch 2026",
      captureMetadata: {
        deviceModel: "Android Chrome (Redmi Note 12)",
        cameraResolution: "12 MP",
        lightingCondition: "good_daylight",
        packagingSubstrate: "plastic_pouch",
        primaryLanguage: "English",
      },
      expected: {
        barcodeValue: "8901063012059",
        fssaiLicense: "10015043001129",
        ingredientsText: "Refined Wheat Flour (Maida), Sugar, Butter, Edible Vegetable Oil",
        declaredAllergens: ["Wheat", "Milk"],
      },
      observed: {
        decodedBarcode: "8901063012059",
        extractedFssai: "10015043001129",
        ocrRawText: "Refined Wheat Flour (Maida), Sugar, Butter, Edible Vegetable Oil",
        extractedAllergens: ["Wheat", "Milk"],
        candidateMatchConfidence: 0.95,
        candidateMatchedSku: "8901063012059",
      },
    };

    it("evaluates a perfect pack match with 100% precision and recall", () => {
      const result = evaluateBenchmarkPack(sampleRecord);
      expect(result.barcodeMatched).toBe(true);
      expect(result.fssaiMatched).toBe(true);
      expect(result.cer).toBe(0);
      expect(result.wer).toBe(0);
      expect(result.allergenPrecision).toBe(1.0);
      expect(result.allergenRecall).toBe(1.0);
      expect(result.hasFalseHighConfidenceMatch).toBe(false);
      expect(result.hasCriticalAllergenMiss).toBe(false);
    });

    it("flags critical allergen miss when declared allergens are completely absent in observed", () => {
      const recordWithMiss: PhysicalPackBenchmarkRecord = {
        ...sampleRecord,
        observed: {
          ...sampleRecord.observed,
          extractedAllergens: [], // Missed all allergens!
        },
      };
      const result = evaluateBenchmarkPack(recordWithMiss);
      expect(result.allergenRecall).toBe(0);
      expect(result.hasCriticalAllergenMiss).toBe(true);
    });

    it("flags false high-confidence match when matched to wrong SKU with >= 0.85 confidence", () => {
      const recordWithFalseMatch: PhysicalPackBenchmarkRecord = {
        ...sampleRecord,
        observed: {
          ...sampleRecord.observed,
          candidateMatchedSku: "8901000000000", // Wrong SKU
          candidateMatchConfidence: 0.92, // High confidence!
        },
      };
      const result = evaluateBenchmarkPack(recordWithFalseMatch);
      expect(result.hasFalseHighConfidenceMatch).toBe(true);
    });
  });

  describe("Locked Release Set Gate Enforcement", () => {
    it("certifies lockedSetSafetyPass = true when locked packs have zero false matches and zero misses", () => {
      const dataset: PhysicalPackBenchmarkRecord[] = [
        {
          packId: "PK-DEV-001",
          designation: "dev_tuning",
          brand: "Tata",
          productName: "Salt",
          manufacturer: "Tata",
          category: "Staples",
          gtin: "8901058852738",
          packSize: "1 kg",
          labelVersion: "2026",
          captureMetadata: {
            deviceModel: "Pixel 7",
            cameraResolution: "12MP",
            lightingCondition: "good_daylight",
            packagingSubstrate: "plastic_pouch",
            primaryLanguage: "English",
          },
          expected: {
            barcodeValue: "8901058852738",
            fssaiLicense: "10014022002759",
            ingredientsText: "Iodised Salt",
            declaredAllergens: [],
          },
          observed: {
            decodedBarcode: "8901058852738",
            extractedFssai: "10014022002759",
            ocrRawText: "Iodised Salt",
            extractedAllergens: [],
          },
        },
        {
          packId: "PK-LCK-001",
          designation: "locked_release",
          brand: "Amul",
          productName: "Butter",
          manufacturer: "GCMMF",
          category: "Dairy",
          gtin: "8901262150055",
          packSize: "500 g",
          labelVersion: "2026",
          captureMetadata: {
            deviceModel: "iPhone 14",
            cameraResolution: "12MP",
            lightingCondition: "good_daylight",
            packagingSubstrate: "foil_laminate",
            primaryLanguage: "English",
          },
          expected: {
            barcodeValue: "8901262150055",
            fssaiLicense: "10012021000071",
            ingredientsText: "Butter, Common Salt",
            declaredAllergens: ["Milk"],
          },
          observed: {
            decodedBarcode: "8901262150055",
            extractedFssai: "10012021000071",
            ocrRawText: "Butter, Common Salt",
            extractedAllergens: ["Milk"],
            candidateMatchConfidence: 0.98,
            candidateMatchedSku: "8901262150055",
          },
        },
      ];

      const summary = evaluateBenchmarkDataset(dataset);
      expect(summary.totalPacks).toBe(2);
      expect(summary.devPacksCount).toBe(1);
      expect(summary.lockedPacksCount).toBe(1);
      expect(summary.barcodeAccuracy).toBe(100);
      expect(summary.lockedSetSafetyPass).toBe(true);
      expect(summary.lockedSetFalseHighConfidenceMatches).toBe(0);
      expect(summary.lockedSetCriticalAllergenMisses).toBe(0);
    });

    it("fails lockedSetSafetyPass if any locked pack has a critical allergen miss", () => {
      const dataset: PhysicalPackBenchmarkRecord[] = [
        {
          packId: "PK-LCK-002",
          designation: "locked_release",
          brand: "Haldiram's",
          productName: "Aloo Bhujia",
          manufacturer: "Haldiram",
          category: "Snacks & Instant",
          gtin: "8904004401225",
          packSize: "150 g",
          labelVersion: "2026",
          captureMetadata: {
            deviceModel: "Samsung Galaxy M34",
            cameraResolution: "12MP",
            lightingCondition: "low_kitchen_light",
            packagingSubstrate: "foil_laminate",
            primaryLanguage: "English",
          },
          expected: {
            barcodeValue: "8904004401225",
            fssaiLicense: "10012011000263",
            ingredientsText: "Potatoes, Edible Vegetable Oil, Gram Flour, Peanut Oil",
            declaredAllergens: ["Peanut"],
          },
          observed: {
            decodedBarcode: "8904004401225",
            extractedFssai: "10012011000263",
            ocrRawText: "Potatoes, Edible Vegetable Oil, Gram Flour, Peanut Oil",
            extractedAllergens: [], // Critical allergen miss on locked set!
          },
        },
      ];

      const summary = evaluateBenchmarkDataset(dataset);
      expect(summary.lockedSetSafetyPass).toBe(false);
      expect(summary.lockedSetCriticalAllergenMisses).toBe(1);
    });
  });
});
