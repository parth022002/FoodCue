import { describe, expect, it } from "vitest";
import { evaluateConfirmedFoodLabel } from "./foodIntelligenceEngine";
import { createConfirmedLabel } from "../contracts/confirmedLabel";
import { findProductByGtin, VERIFIED_INDIAN_CATALOG } from "../entities/catalogData";
import type { ProductCandidate } from "../entities/food";

describe("Food Intelligence Engine", () => {
  it("evaluates a confirmed Parle-G label and detects wheat and milk allergens", () => {
    const product = findProductByGtin("8901719101037")!;
    expect(product).toBeDefined();

    const candidate: ProductCandidate = {
      candidateId: product.id,
      identifier: product.gtin,
      identifierType: "gtin",
      displayName: product.productName,
      status: "candidate",
      provenance: ["manual"],
      observedAt: new Date().toISOString(),
      conflicts: []
    };

    const label = createConfirmedLabel({
      candidate,
      physicalIdentity: product.productName,
      labelVersion: "2026 Batch",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed"
      },
      evidenceReferences: ["local-test"]
    });

    const analysis = evaluateConfirmedFoodLabel(label, product);
    expect(analysis.state).toBe("reviewed_deterministic");
    expect(analysis.productName).toBe(product.productName);

    // Gluten and Milk must be positive
    const gluten = analysis.allergens.find((a) => a.allergenName.includes("Gluten"));
    expect(gluten?.state).toBe("declared_contains");

    const milk = analysis.allergens.find((a) => a.allergenName.includes("Milk"));
    expect(milk?.state).toBe("declared_contains");

    // Sulphites should be listed in ingredients due to INS 223
    const sulphites = analysis.allergens.find((a) => a.allergenName.includes("Sulphites"));
    expect(sulphites?.state).toBe("listed_in_ingredients");

    // Emergency guidance must be present
    expect(analysis.emergencyGuidance?.isTriggered).toBe(true);
    expect(analysis.emergencyGuidance?.emergencyNumber).toContain("112");
  });

  it("evaluates Tata Salt with 0 allergens and 38700mg sodium", () => {
    const product = findProductByGtin("8901058852738")!;
    expect(product).toBeDefined();

    const candidate: ProductCandidate = {
      candidateId: product.id,
      identifier: product.gtin,
      identifierType: "gtin",
      displayName: product.productName,
      status: "candidate",
      provenance: ["manual"],
      observedAt: new Date().toISOString(),
      conflicts: []
    };

    const label = createConfirmedLabel({
      candidate,
      physicalIdentity: product.productName,
      labelVersion: "2026 Batch",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed"
      },
      evidenceReferences: ["local-test"]
    });

    const analysis = evaluateConfirmedFoodLabel(label, product);
    expect(analysis.nutritionPer100g["sodiumMg"]).toBe(38700);

    // All allergens should be not_detected_in_extracted_text
    const allNotDetected = analysis.allergens.every(
      (a) => a.state === "not_detected_in_extracted_text"
    );
    expect(allNotDetected).toBe(true);
  });

  it("contains all 8 verified catalogue products", () => {
    expect(VERIFIED_INDIAN_CATALOG.length).toBeGreaterThanOrEqual(8);
  });

  it("identifies expanded INS food additives with explicit purpose and human-readable names", () => {
    const product = findProductByGtin("8901719101037")!; // Parle-G has INS 500(ii), 503(ii), 223
    const candidate: ProductCandidate = {
      candidateId: product.id,
      identifier: product.gtin,
      identifierType: "gtin",
      displayName: product.productName,
      status: "candidate",
      provenance: ["manual"],
      observedAt: new Date().toISOString(),
      conflicts: []
    };

    const label = createConfirmedLabel({
      candidate,
      physicalIdentity: product.productName,
      labelVersion: "2026 Batch",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed"
      },
      evidenceReferences: ["test"]
    });

    const analysis = evaluateConfirmedFoodLabel(label, product);
    const additives = analysis.ingredients.filter((i) => i.isAdditive);
    expect(additives.length).toBeGreaterThan(0);
    const ins500 = additives.find((a) => a.insNumber?.includes("500"));
    expect(ins500).toBeDefined();
    expect(ins500?.purpose?.toLowerCase()).toContain("raising agent");
  });
});
