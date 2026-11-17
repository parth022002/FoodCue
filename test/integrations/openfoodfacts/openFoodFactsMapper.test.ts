/**
 * OpenFoodFacts Mapper Test Suite
 * Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 */

import { describe, expect, it } from "vitest";
import {
  mapToOpenFoodFactsCandidate,
  mapToProductCandidate,
  mapToComparisonProduct,
} from "../../../src/integrations/openfoodfacts/openFoodFactsMapper";
import type { RawOpenFoodFactsResponse } from "../../../src/integrations/openfoodfacts/openFoodFactsTypes";

describe("OpenFoodFacts Mapper", () => {
  const sampleResponse: RawOpenFoodFactsResponse = {
    status: 1,
    code: "8901058852332",
    product: {
      code: "8901058852332",
      product_name: "Maggi 2-Minute Noodles",
      brands: "Nestle India",
      quantity: "70 g",
      categories: "Snacks, Instant Noodles",
      ingredients_text: "Wheat flour, palm oil, salt, mineral (calcium carbonate)",
      allergens_tags: ["en:gluten", "en:wheat"],
      nutriments: {
        "energy-kcal_100g": 427,
        proteins_100g: 8.0,
        carbohydrates_100g: 63.5,
        sugars_100g: 2.2,
        fat_100g: 15.7,
        sodium_100g: 1.16,
      },
      last_modified_t: 1700000000,
    },
  };

  it("maps raw response into strongly typed OpenFoodFactsProductCandidate", () => {
    const candidate = mapToOpenFoodFactsCandidate(sampleResponse);

    expect(candidate.source).toBe("openfoodfacts");
    expect(candidate.gtin).toBe("8901058852332");
    expect(candidate.productName).toBe("Maggi 2-Minute Noodles");
    expect(candidate.brand).toBe("Nestle India");
    expect(candidate.packSize).toBe("70 g");
    expect(candidate.category).toBe("Snacks & Instant");
    expect(candidate.allergensDeclared).toContain("Gluten");
    expect(candidate.allergensDeclared).toContain("Wheat");
    expect(candidate.verificationStatus).toBe("unverified");
    expect(candidate.identityStatus).toBe("candidate");
    expect(candidate.nutritionPer100g.energyKcal).toBe(427);
    expect(candidate.nutritionPer100g.sodiumMg).toBe(1160);
  });

  it("maps OpenFoodFacts candidate to FoodCue domain ProductCandidate", () => {
    const offCandidate = mapToOpenFoodFactsCandidate(sampleResponse);
    const domainCandidate = mapToProductCandidate(offCandidate);

    expect(domainCandidate.identifier).toBe("8901058852332");
    expect(domainCandidate.identifierType).toBe("gtin");
    expect(domainCandidate.status).toBe("candidate");
    expect(domainCandidate.provenance[0]).toContain("OpenFoodFacts external fallback");
    expect(domainCandidate.displayName).toContain("Nestle India - Maggi 2-Minute Noodles");
  });

  it("maps OpenFoodFacts candidate to VerifiedFoodProduct shape with unverified markers", () => {
    const offCandidate = mapToOpenFoodFactsCandidate(sampleResponse);
    const compProduct = mapToComparisonProduct(offCandidate);

    expect(compProduct.gtin).toBe("8901058852332");
    expect(compProduct.brand).toBe("Nestle India");
    expect(compProduct.fssaiLicence).toContain("Not Verified");
    expect(compProduct.sourceReference).toContain("OpenFoodFacts (ODbL)");
    expect(compProduct.parsedIngredients.length).toBeGreaterThan(0);
  });

  it("handles missing optional fields with graceful fallbacks", () => {
    const sparseResponse: RawOpenFoodFactsResponse = {
      status: 1,
      code: "8901262010046",
      product: {
        code: "8901262010046",
        // missing product_name, brands, nutriments, ingredients
      },
    };

    const candidate = mapToOpenFoodFactsCandidate(sparseResponse);
    expect(candidate.productName).toBe("Packaged Food Item");
    expect(candidate.brand).toBe("External Manufacturer");
    expect(candidate.packSize).toBe("Standard Pack");
    expect(candidate.allergensDeclared).toEqual([]);
    expect(candidate.nutritionPer100g).toEqual({});
  });
});
