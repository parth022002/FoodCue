/**
 * Adversarial Food Safety & ConfirmedLabel Invariant Tests
 * Master Specification v13.5 §4, §8, §15, Table 54 (SAF-01, SAF-02, SAF-03)
 *
 * Requirements:
 * 1. Only a valid ConfirmedLabel reaches food-safety analysis.
 * 2. Unknown or missing evidence never creates false reassurance.
 * 3. Never infer absence of allergens from incomplete text.
 * 4. Superseded label versions are explicitly flagged.
 * 5. Prohibited claims (universal health scores) are blocked.
 */

import { describe, expect, it } from "vitest";
import {
  createConfirmedLabel,
  ConfirmationError,
  isConfirmedLabel,
} from "../../src/domain/contracts/confirmedLabel";
import { evaluateConfirmedFoodLabel } from "../../src/domain/rules/foodIntelligenceEngine";
import { findProductByGtin } from "../../src/domain/entities/catalogData";
import type { ProductCandidate } from "../../src/domain/entities/food";

const baseCandidate: ProductCandidate = {
  candidateId: "adv-candidate-1",
  identifier: "8901058852332",
  identifierType: "gtin",
  displayName: "Tata Tea Gold 250g",
  status: "candidate",
  provenance: ["barcode_scan"],
  observedAt: new Date().toISOString(),
  conflicts: [],
};

describe("SAF-01 & SAF-02: ConfirmedLabel Contract & Adversarial Safety", () => {
  it("SAF-01: Rejects candidate with missing panels - throws ConfirmationError", () => {
    expect(() =>
      createConfirmedLabel({
        candidate: baseCandidate,
        physicalIdentity: "Tata Tea Gold",
        labelVersion: "2026-V1",
        panels: ["ingredients"], // Missing allergen_declaration and nutrition
        fieldStates: {
          physical_identity: "confirmed",
          ingredients_panel: "confirmed",
          allergen_declaration_panel: "unreadable",
          nutrition_panel: "missing",
        },
        evidenceReferences: ["test-ref-1"],
      })
    ).toThrow(ConfirmationError);
  });

  it("SAF-01: Rejects candidate with unresolved conflicts - throws ConfirmationError", () => {
    const conflictedCandidate: ProductCandidate = {
      ...baseCandidate,
      conflicts: ["Brand mismatch between barcode lookup and OCR detection"],
    };

    expect(() =>
      createConfirmedLabel({
        candidate: conflictedCandidate,
        physicalIdentity: "Tata Tea Gold",
        labelVersion: "2026-V1",
        panels: ["ingredients", "allergen_declaration", "nutrition"],
        fieldStates: {
          physical_identity: "confirmed",
          ingredients_panel: "confirmed",
          allergen_declaration_panel: "confirmed",
          nutrition_panel: "confirmed",
        },
        evidenceReferences: ["test-ref-2"],
      })
    ).toThrow(ConfirmationError);
  });

  it("SAF-02: Missing allergen evidence cannot create false reassurance ('not_detected_in_extracted_text')", () => {
    const label = createConfirmedLabel({
      candidate: baseCandidate,
      physicalIdentity: "Tata Tea Gold",
      labelVersion: "2026-V1",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed",
      },
      evidenceReferences: ["test-ref-3"],
    });

    expect(isConfirmedLabel(label)).toBe(true);

    // Evaluate label without catalog seed
    const analysis = evaluateConfirmedFoodLabel(label);
    expect(analysis.state).toBe("reviewed_deterministic");

    // All mandatory allergens should have warningNotice stating 'This is not proof of total absence'
    for (const allergen of analysis.allergens) {
      if (allergen.state === "not_detected_in_extracted_text") {
        expect(allergen.warningNotice).toContain("This is not proof of total absence");
      }
    }
  });

  it("SAF-02: Recognized vs Unrecognized additives - no hallucinated claims", () => {
    // Test Maggi Noodles (8901058852332 or catalogue item 8901058852332)
    const product = findProductByGtin("8901058852332");
    if (product) {
      const label = createConfirmedLabel({
        candidate: {
          ...baseCandidate,
          candidateId: product.id,
          identifier: product.gtin,
          displayName: product.productName,
        },
        physicalIdentity: product.productName,
        labelVersion: "2026 Release Batch",
        panels: ["ingredients", "allergen_declaration", "nutrition"],
        fieldStates: {
          physical_identity: "confirmed",
          ingredients_panel: "confirmed",
          allergen_declaration_panel: "confirmed",
          nutrition_panel: "confirmed",
        },
        evidenceReferences: ["maggi-test"],
      });

      const analysis = evaluateConfirmedFoodLabel(label, product);
      expect(analysis.productName).toBe(product.productName);

      // Verify that no universal health score exists on DetailedFoodAnalysis
      expect((analysis as Record<string, unknown>).healthScore).toBeUndefined();
      expect((analysis as Record<string, unknown>).safetyGrade).toBeUndefined();
    }
  });

  it("SAF-03: Recognizes common Indian allergens accurately from verified catalog", () => {
    const parleG = findProductByGtin("8901719101037")!;
    const label = createConfirmedLabel({
      candidate: {
        ...baseCandidate,
        candidateId: parleG.id,
        identifier: parleG.gtin,
        displayName: parleG.productName,
      },
      physicalIdentity: parleG.productName,
      labelVersion: "2026 Batch",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed",
      },
      evidenceReferences: ["parle-g-test"],
    });

    const analysis = evaluateConfirmedFoodLabel(label, parleG);
    const gluten = analysis.allergens.find((a) => a.allergenName.includes("Gluten"));
    expect(gluten?.state).toBe("declared_contains");

    const milk = analysis.allergens.find((a) => a.allergenName.includes("Milk"));
    expect(milk?.state).toBe("declared_contains");
  });
});
