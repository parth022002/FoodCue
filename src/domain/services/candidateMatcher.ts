/**
 * FoodCue Candidate Matcher & Ranking Engine (S2 Baseline)
 * Controlling Specification: Master Specification v13.5 §6.5 & Architecture Diagram
 *
 * Implements:
 * - Candidate Ranking Score: Q = S * min(1, E / 0.70)
 * - Approved field similarity weights:
 *     Brand: 0.30
 *     Product Name: 0.25
 *     Variant: 0.15
 *     Pack Size: 0.15
 *     FSSAI License: 0.10
 *     Manufacturer / Reference: 0.05
 * - Hard mismatch detection (conflicts block silent promotion)
 * - ConfirmedLabel gate validation
 */

import type { VerifiedFoodProduct } from "../entities/catalogData";
import type { ResolvedEvidenceState } from "./evidenceResolver";

export interface FieldMatchBreakdown {
  field: string;
  weight: number;
  matched: boolean;
  observedValue?: string;
  candidateValue?: string;
}

export interface RankedCandidate {
  candidate: VerifiedFoodProduct;
  score: number; // Candidate ranking score Q (0.00 to 1.00)
  similarityScore: number; // S (0.00 to 1.00)
  evidenceCoverage: number; // E (0.00 to 1.00)
  fieldBreakdowns: FieldMatchBreakdown[];
  isBlockedByConflict: boolean;
  hardMismatchReasons: string[];
}

export interface ConfirmedLabelGateResult {
  eligible: boolean;
  reasons: string[];
}

/**
 * Normalizes strings for tolerant comparison (whitespace, punctuation, case)
 */
function clean(str?: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Computes Candidate Ranking Score Q = S * min(1, E / 0.70)
 */
export function rankCandidates(
  evidence: ResolvedEvidenceState,
  catalog: VerifiedFoodProduct[]
): RankedCandidate[] {
  const { resolvedFields, evidenceCoverage, hasHardConflicts, conflicts } = evidence;
  const coverageRatio = Math.min(1, evidenceCoverage / 0.70);

  const results: RankedCandidate[] = [];

  for (const product of catalog) {
    const fieldBreakdowns: FieldMatchBreakdown[] = [];
    const hardMismatchReasons: string[] = [];
    let similarityScore = 0;

    // 1. GTIN Matching: Direct match provides immediate strong anchor
    let gtinMatched = false;
    if (resolvedFields.gtin) {
      if (clean(resolvedFields.gtin) === clean(product.gtin)) {
        gtinMatched = true;
      } else {
        // Hard GTIN mismatch if both are known and different
        hardMismatchReasons.push(
          `Observed GTIN '${resolvedFields.gtin}' does not match candidate GTIN '${product.gtin}'.`
        );
      }
    }

    // 2. Brand (Weight: 0.30)
    let brandMatched = false;
    if (resolvedFields.brand) {
      const obsBrand = clean(resolvedFields.brand);
      const candBrand = clean(product.brand);
      if (obsBrand.includes(candBrand) || candBrand.includes(obsBrand)) {
        brandMatched = true;
        similarityScore += 0.30;
      } else {
        hardMismatchReasons.push(`Observed brand '${resolvedFields.brand}' contradicts '${product.brand}'.`);
      }
    } else if (gtinMatched) {
      // Inherited from GTIN anchor
      brandMatched = true;
      similarityScore += 0.30;
    }
    fieldBreakdowns.push({
      field: "brand",
      weight: 0.30,
      matched: brandMatched,
      observedValue: resolvedFields.brand,
      candidateValue: product.brand,
    });

    // 3. Product Name (Weight: 0.25)
    let nameMatched = false;
    if (resolvedFields.productName) {
      const obsName = clean(resolvedFields.productName);
      const candName = clean(product.productName);
      if (obsName.includes(candName) || candName.includes(obsName)) {
        nameMatched = true;
        similarityScore += 0.25;
      }
    } else if (gtinMatched) {
      nameMatched = true;
      similarityScore += 0.25;
    }
    fieldBreakdowns.push({
      field: "productName",
      weight: 0.25,
      matched: nameMatched,
      observedValue: resolvedFields.productName,
      candidateValue: product.productName,
    });

    // 4. Variant (Weight: 0.15)
    let variantMatched = false;
    if (resolvedFields.variant) {
      const obsVar = clean(resolvedFields.variant);
      const candVar = clean(product.variant);
      if (obsVar.includes(candVar) || candVar.includes(obsVar)) {
        variantMatched = true;
        similarityScore += 0.15;
      }
    } else if (gtinMatched) {
      variantMatched = true;
      similarityScore += 0.15;
    }
    fieldBreakdowns.push({
      field: "variant",
      weight: 0.15,
      matched: variantMatched,
      observedValue: resolvedFields.variant,
      candidateValue: product.variant,
    });

    // 5. Pack Size (Weight: 0.15)
    let sizeMatched = false;
    if (resolvedFields.packSize) {
      const obsSize = clean(resolvedFields.packSize);
      const candSize = clean(product.packSize);
      if (obsSize.includes(candSize) || candSize.includes(obsSize)) {
        sizeMatched = true;
        similarityScore += 0.15;
      }
    } else if (gtinMatched) {
      sizeMatched = true;
      similarityScore += 0.15;
    }
    fieldBreakdowns.push({
      field: "packSize",
      weight: 0.15,
      matched: sizeMatched,
      observedValue: resolvedFields.packSize,
      candidateValue: product.packSize,
    });

    // 6. FSSAI License (Weight: 0.10)
    let fssaiMatched = false;
    if (resolvedFields.fssaiLicense) {
      if (clean(resolvedFields.fssaiLicense) === clean(product.fssaiLicence)) {
        fssaiMatched = true;
        similarityScore += 0.10;
      } else {
        hardMismatchReasons.push(
          `Observed FSSAI licence '${resolvedFields.fssaiLicense}' differs from candidate licence '${product.fssaiLicence}'.`
        );
      }
    } else if (gtinMatched) {
      fssaiMatched = true;
      similarityScore += 0.10;
    }
    fieldBreakdowns.push({
      field: "fssaiLicense",
      weight: 0.10,
      matched: fssaiMatched,
      observedValue: resolvedFields.fssaiLicense,
      candidateValue: product.fssaiLicence,
    });

    // 7. Manufacturer / Reference (Weight: 0.05)
    let refMatched = false;
    if (gtinMatched || brandMatched) {
      refMatched = true;
      similarityScore += 0.05;
    }
    fieldBreakdowns.push({
      field: "manufacturerReference",
      weight: 0.05,
      matched: refMatched,
      candidateValue: product.sourceReference,
    });

    const roundedSimilarity = Math.round(similarityScore * 100) / 100;
    const finalScore = Math.round(roundedSimilarity * coverageRatio * 100) / 100;

    const isBlockedByConflict =
      hasHardConflicts || hardMismatchReasons.length > 0;

    results.push({
      candidate: product,
      score: isBlockedByConflict && !gtinMatched ? 0 : finalScore,
      similarityScore: roundedSimilarity,
      evidenceCoverage,
      fieldBreakdowns,
      isBlockedByConflict,
      hardMismatchReasons: [
        ...hardMismatchReasons,
        ...conflicts.filter((c) => c.severity === "hard").map((c) => c.explanation),
      ],
    });
  }

  // Sort descending by score Q
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Validates ConfirmedLabel Gate according to Master Spec v13.5 §6.5
 */
export function validateConfirmedLabelGate(
  candidate: RankedCandidate,
  evidence: ResolvedEvidenceState,
  userConfirmedPhysicalPack: boolean
): ConfirmedLabelGateResult {
  const reasons: string[] = [];

  // Rule 1: Physical pack review is strictly mandatory
  if (!userConfirmedPhysicalPack) {
    reasons.push("Physical pack confirmation by user is required before promotion.");
  }

  // Rule 2: Unresolved hard conflicts block promotion
  if (candidate.isBlockedByConflict) {
    reasons.push("Candidate has unresolved hard conflicts across observed panels.");
    reasons.push(...candidate.hardMismatchReasons);
  }

  // Rule 3: Evidence coverage must satisfy critical threshold
  if (candidate.score < 0.35 && !evidence.resolvedFields.gtin) {
    reasons.push(`Candidate ranking score (${candidate.score}) is below the minimum threshold (0.35).`);
  }

  // Rule 4: Critical panels check
  const hasIngredients =
    evidence.capturedPanels.includes("ocr_ingredients") ||
    evidence.capturedPanels.includes("barcode") ||
    evidence.resolvedFields.ingredients.length > 0;

  if (!hasIngredients) {
    reasons.push("Ingredients / Allergen panel has not been captured or observed.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}
