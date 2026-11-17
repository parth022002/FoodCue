/**
 * OpenFoodFacts Zod Schema Test Suite
 * Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 */

import { describe, expect, it } from "vitest";
import {
  rawOpenFoodFactsResponseSchema,
  rawProductSchema,
  rawNutrimentsSchema,
} from "../../../src/integrations/openfoodfacts/openFoodFactsSchema";

describe("OpenFoodFacts Zod Schemas", () => {
  it("validates well-formed response", () => {
    const input = {
      status: 1,
      status_verbose: "product found",
      code: "8901058852738",
      product: {
        product_name: "Tata Salt",
        brands: "Tata",
        nutriments: {
          "energy-kcal_100g": 0,
          sodium_100g: 38.7,
        },
      },
    };

    const parsed = rawOpenFoodFactsResponseSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("permits unexpected extra properties (passthrough) without crashing", () => {
    const input = {
      status: 1,
      extra_unexpected_field: "some_data",
      product: {
        product_name: "Good Day",
        custom_manufacturer_meta: [1, 2, 3],
      },
    };

    const parsed = rawOpenFoodFactsResponseSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("fails validation if status is missing or not a number", () => {
    const input = {
      status: "one",
      product: {},
    };

    const parsed = rawOpenFoodFactsResponseSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("validates empty product object", () => {
    const parsed = rawProductSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("validates nutriments with numbers and optional values", () => {
    const nutriments = {
      "energy-kcal_100g": 450,
      proteins_100g: 7.5,
      carbohydrates_100g: 65,
      sugars_100g: 22,
      fat_100g: 18,
    };

    const parsed = rawNutrimentsSchema.safeParse(nutriments);
    expect(parsed.success).toBe(true);
  });
});
