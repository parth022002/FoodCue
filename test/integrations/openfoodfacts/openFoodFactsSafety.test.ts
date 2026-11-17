/**
 * OpenFoodFacts Food-Safety Boundary & ConfirmedLabel Invariant Test Suite
 * Master Specification v13.5 §4, §8, §31.4 & PRD v1.2 §4.5
 *
 * Safety Invariants:
 * 1. OpenFoodFacts metadata creates an unverified candidate ONLY.
 * 2. An OpenFoodFacts candidate CANNOT become a ConfirmedLabel automatically.
 * 3. Incomplete external allergen data cannot produce an allergen-free reassurance.
 * 4. User physical pack review remains mandatory before food safety analysis.
 */

import { describe, expect, it } from "vitest";
import {
  createConfirmedLabel,
  ConfirmationError,
  isConfirmedLabel,
} from "../../../src/domain/contracts/confirmedLabel";
import {
  mapToOpenFoodFactsCandidate,
  mapToProductCandidate,
} from "../../../src/integrations/openfoodfacts/openFoodFactsMapper";
import { evaluateConfirmedFoodLabel } from "../../../src/domain/rules/foodIntelligenceEngine";
import type { RawOpenFoodFactsResponse } from "../../../src/integrations/openfoodfacts/openFoodFactsTypes";

describe("OpenFoodFacts Safety & ConfirmedLabel Boundaries", () => {
  const sampleResponse: RawOpenFoodFactsResponse = {
    status: 1,
    code: "8901058852738",
    product: {
      code: "8901058852738",
      product_name: "Tata Salt",
      brands: "Tata",
      ingredients_text: "Edible common salt, potassium iodate",
      allergens_tags: [], // No allergens tagged externally
    },
  };

  it("requires explicit user physical pack confirmation before creating ConfirmedLabel", () => {
    const offCandidate = mapToOpenFoodFactsCandidate(sampleResponse);
    const domainCandidate = mapToProductCandidate(offCandidate);

    // 1. Candidate starts as unconfirmed candidate
    expect(domainCandidate.status).toBe("candidate");

    // 2. Attempting to create ConfirmedLabel without critical panels throws ConfirmationError
    expect(() =>
      createConfirmedLabel({
        candidate: domainCandidate,
        physicalIdentity: "Tata Salt 1kg",
        labelVersion: "2026 Batch",
        panels: ["ingredients"], // Missing allergen_declaration and nutrition panels!
        fieldStates: {
          physical_identity: "confirmed",
          ingredients_panel: "confirmed",
          allergen_declaration_panel: "unreadable",
          nutrition_panel: "missing",
        },
        evidenceReferences: ["off-candidate-1"],
      })
    ).toThrow(ConfirmationError);

    // 3. User provides complete physical verification -> ConfirmedLabel succeeds
    const confirmed = createConfirmedLabel({
      candidate: domainCandidate,
      physicalIdentity: "Tata Salt 1kg",
      labelVersion: "2026 Batch",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed",
      },
      evidenceReferences: ["off-candidate-1"],
    });

    expect(isConfirmedLabel(confirmed)).toBe(true);
    expect(confirmed.candidateId).toBe(domainCandidate.candidateId);
  });

  it("empty external allergen metadata cannot produce false reassurance ('not_detected_in_extracted_text')", () => {
    const offCandidate = mapToOpenFoodFactsCandidate(sampleResponse);
    const domainCandidate = mapToProductCandidate(offCandidate);

    const confirmed = createConfirmedLabel({
      candidate: domainCandidate,
      physicalIdentity: "Tata Salt 1kg",
      labelVersion: "2026 Batch",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed",
      },
      evidenceReferences: ["off-candidate-1"],
    });

    // Evaluate food safety
    const analysis = evaluateConfirmedFoodLabel(confirmed);

    // Must still attach the mandatory disclaimer notice
    for (const allergen of analysis.allergens) {
      if (allergen.state === "not_detected_in_extracted_text") {
        expect(allergen.warningNotice).toContain("This is not proof of total absence");
      }
    }
  });

  it("unresolved conflicts block ConfirmedLabel generation", () => {
    const offCandidate = mapToOpenFoodFactsCandidate(sampleResponse);
    const domainCandidate = mapToProductCandidate(offCandidate);

    // Simulate conflict: Barcode says Tata Salt, but OCR detected Parle-G
    domainCandidate.conflicts = ["Packaging mismatch between barcode and physical front panel"];

    expect(() =>
      createConfirmedLabel({
        candidate: domainCandidate,
        physicalIdentity: "Tata Salt 1kg",
        labelVersion: "2026 Batch",
        panels: ["ingredients", "allergen_declaration", "nutrition"],
        fieldStates: {
          physical_identity: "confirmed",
          ingredients_panel: "confirmed",
          allergen_declaration_panel: "confirmed",
          nutrition_panel: "confirmed",
        },
        evidenceReferences: ["off-candidate-1"],
      })
    ).toThrow(ConfirmationError);
  });
});
