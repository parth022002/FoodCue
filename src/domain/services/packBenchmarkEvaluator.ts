/**
 * FoodCue Physical Pack Ground Truth Benchmark Evaluator
 * Controlling Specification: Master Specification v13.5 §14 (Gate G4)
 * Standard: Food Safety and Standards (Labelling and Display) Regulations, 2020
 */

export interface PhysicalPackBenchmarkRecord {
  packId: string;
  designation: "dev_tuning" | "locked_release";
  brand: string;
  productName: string;
  manufacturer: string;
  category:
    | "Staples"
    | "Dairy"
    | "Biscuits & Bakery"
    | "Snacks & Instant"
    | "Breakfast & Cereals"
    | "Condiments"
    | "Beverages";
  gtin: string;
  packSize: string;
  labelVersion: string;
  captureMetadata: {
    deviceModel: string;
    cameraResolution: string;
    lightingCondition: "good_daylight" | "low_kitchen_light" | "glare_specular" | "shadows_uneven";
    packagingSubstrate: "plastic_pouch" | "corrugated_box" | "curved_bottle" | "foil_laminate" | "metal_can";
    primaryLanguage: "English" | "Bilingual_Hindi_English";
  };
  expected: {
    barcodeValue: string;
    fssaiLicense: string;
    ingredientsText: string;
    declaredAllergens: string[];
    mayContainAllergens?: string[];
    nutritionPer100g?: Record<string, number>;
  };
  observed: {
    decodedBarcode?: string;
    extractedFssai?: string;
    ocrRawText?: string;
    extractedIngredients?: string[];
    extractedAllergens?: string[];
    candidateMatchConfidence?: number;
    candidateMatchedSku?: string;
  };
}

export interface PackEvaluationResult {
  packId: string;
  designation: "dev_tuning" | "locked_release";
  barcodeMatched: boolean;
  fssaiMatched: boolean;
  cer: number; // Character error rate (0.00 to 1.00)
  wer: number; // Word error rate (0.00 to 1.00)
  allergenPrecision: number;
  allergenRecall: number;
  hasFalseHighConfidenceMatch: boolean;
  hasCriticalAllergenMiss: boolean;
}

export interface BenchmarkDatasetSummary {
  totalPacks: number;
  devPacksCount: number;
  lockedPacksCount: number;
  barcodeAccuracy: number;
  fssaiAccuracy: number;
  meanCer: number;
  meanWer: number;
  meanAllergenPrecision: number;
  meanAllergenRecall: number;
  meanAllergenF1: number;
  lockedSetSafetyPass: boolean;
  lockedSetFalseHighConfidenceMatches: number;
  lockedSetCriticalAllergenMisses: number;
  results: PackEvaluationResult[];
}

/**
 * Computes Levenshtein edit distance between two strings
 */
export function computeLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const stride = n + 1;
  const dp: number[] = new Array((m + 1) * stride).fill(0);

  for (let i = 0; i <= m; i++) dp[i * stride] = i;
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i * stride + j] = dp[(i - 1) * stride + (j - 1)] ?? 0;
      } else {
        const del = (dp[(i - 1) * stride + j] ?? 0) + 1;
        const ins = (dp[i * stride + (j - 1)] ?? 0) + 1;
        const sub = (dp[(i - 1) * stride + (j - 1)] ?? 0) + 1;
        dp[i * stride + j] = Math.min(del, ins, sub);
      }
    }
  }

  return dp[m * stride + n] ?? 0;
}

/**
 * Computes Character Error Rate (CER) = Levenshtein(expected, observed) / max(1, length(expected))
 */
export function computeCer(expected: string, observed: string): number {
  const cleanExp = expected.trim().toLowerCase();
  const cleanObs = observed.trim().toLowerCase();
  if (cleanExp.length === 0) return cleanObs.length === 0 ? 0 : 1;
  const dist = computeLevenshteinDistance(cleanExp, cleanObs);
  return Math.min(1, Math.round((dist / cleanExp.length) * 1000) / 1000);
}

/**
 * Computes Word Error Rate (WER) = WordEditDistance(expectedWords, observedWords) / max(1, length(expectedWords))
 */
export function computeWer(expected: string, observed: string): number {
  const wordsExp = expected.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const wordsObs = observed.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (wordsExp.length === 0) return wordsObs.length === 0 ? 0 : 1;

  const m = wordsExp.length;
  const n = wordsObs.length;
  const stride = n + 1;
  const dp: number[] = new Array((m + 1) * stride).fill(0);

  for (let i = 0; i <= m; i++) dp[i * stride] = i;
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (wordsExp[i - 1] === wordsObs[j - 1]) {
        dp[i * stride + j] = dp[(i - 1) * stride + (j - 1)] ?? 0;
      } else {
        const del = (dp[(i - 1) * stride + j] ?? 0) + 1;
        const ins = (dp[i * stride + (j - 1)] ?? 0) + 1;
        const sub = (dp[(i - 1) * stride + (j - 1)] ?? 0) + 1;
        dp[i * stride + j] = Math.min(del, ins, sub);
      }
    }
  }

  const dist = dp[m * stride + n] ?? 0;
  return Math.min(1, Math.round((dist / wordsExp.length) * 1000) / 1000);
}

/**
 * Evaluates an individual packaging benchmark record
 */
export function evaluateBenchmarkPack(pack: PhysicalPackBenchmarkRecord): PackEvaluationResult {
  const barcodeMatched =
    Boolean(pack.observed.decodedBarcode) &&
    pack.observed.decodedBarcode!.trim() === pack.expected.barcodeValue.trim();

  const cleanExpFssai = pack.expected.fssaiLicense.replace(/[^0-9]/g, "");
  const cleanObsFssai = (pack.observed.extractedFssai || "").replace(/[^0-9]/g, "");
  const fssaiMatched = cleanExpFssai.length > 0 && cleanObsFssai === cleanExpFssai;

  const cer = computeCer(pack.expected.ingredientsText, pack.observed.ocrRawText || "");
  const wer = computeWer(pack.expected.ingredientsText, pack.observed.ocrRawText || "");

  const expectedAllergens = new Set(pack.expected.declaredAllergens.map((a) => a.trim().toLowerCase()));
  const observedAllergens = new Set((pack.observed.extractedAllergens || []).map((a) => a.trim().toLowerCase()));

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const exp of expectedAllergens) {
    if (observedAllergens.has(exp)) {
      truePositives++;
    } else {
      falseNegatives++;
    }
  }

  for (const obs of observedAllergens) {
    if (!expectedAllergens.has(obs)) {
      falsePositives++;
    }
  }

  const allergenPrecision =
    truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1.0;
  const allergenRecall =
    truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1.0;

  // Food Safety Non-Waivable Invariants
  // 1. False High-Confidence Match: matched to wrong SKU with confidence >= 0.85
  const hasFalseHighConfidenceMatch =
    Boolean(pack.observed.candidateMatchedSku) &&
    pack.observed.candidateMatchedSku !== pack.expected.barcodeValue &&
    (pack.observed.candidateMatchConfidence || 0) >= 0.85;

  // 2. Critical Allergen Miss: expected declared allergens, but zero allergens reported (false negative)
  const hasCriticalAllergenMiss = expectedAllergens.size > 0 && falseNegatives === expectedAllergens.size;

  return {
    packId: pack.packId,
    designation: pack.designation,
    barcodeMatched,
    fssaiMatched,
    cer,
    wer,
    allergenPrecision: Math.round(allergenPrecision * 100) / 100,
    allergenRecall: Math.round(allergenRecall * 100) / 100,
    hasFalseHighConfidenceMatch,
    hasCriticalAllergenMiss,
  };
}

/**
 * Evaluates full benchmark dataset and verifies locked release set safety conditions
 */
export function evaluateBenchmarkDataset(dataset: PhysicalPackBenchmarkRecord[]): BenchmarkDatasetSummary {
  const results = dataset.map(evaluateBenchmarkPack);
  const totalPacks = results.length;

  const devResults = results.filter((r) => r.designation === "dev_tuning");
  const lockedResults = results.filter((r) => r.designation === "locked_release");

  const barcodeMatchedCount = results.filter((r) => r.barcodeMatched).length;
  const fssaiMatchedCount = results.filter((r) => r.fssaiMatched).length;

  const meanCer = totalPacks > 0 ? results.reduce((acc, r) => acc + r.cer, 0) / totalPacks : 0;
  const meanWer = totalPacks > 0 ? results.reduce((acc, r) => acc + r.wer, 0) / totalPacks : 0;
  const meanPrecision = totalPacks > 0 ? results.reduce((acc, r) => acc + r.allergenPrecision, 0) / totalPacks : 1;
  const meanRecall = totalPacks > 0 ? results.reduce((acc, r) => acc + r.allergenRecall, 0) / totalPacks : 1;

  const meanF1 =
    meanPrecision + meanRecall > 0
      ? (2 * (meanPrecision * meanRecall)) / (meanPrecision + meanRecall)
      : 1;

  const lockedFalseHighConf = lockedResults.filter((r) => r.hasFalseHighConfidenceMatch).length;
  const lockedCriticalMisses = lockedResults.filter((r) => r.hasCriticalAllergenMiss).length;
  const lockedSetSafetyPass = lockedFalseHighConf === 0 && lockedCriticalMisses === 0;

  return {
    totalPacks,
    devPacksCount: devResults.length,
    lockedPacksCount: lockedResults.length,
    barcodeAccuracy: Math.round((barcodeMatchedCount / totalPacks) * 1000) / 10,
    fssaiAccuracy: Math.round((fssaiMatchedCount / totalPacks) * 1000) / 10,
    meanCer: Math.round(meanCer * 1000) / 1000,
    meanWer: Math.round(meanWer * 1000) / 1000,
    meanAllergenPrecision: Math.round(meanPrecision * 1000) / 1000,
    meanAllergenRecall: Math.round(meanRecall * 1000) / 1000,
    meanAllergenF1: Math.round(meanF1 * 1000) / 1000,
    lockedSetSafetyPass,
    lockedSetFalseHighConfidenceMatches: lockedFalseHighConf,
    lockedSetCriticalAllergenMisses: lockedCriticalMisses,
    results,
  };
}
