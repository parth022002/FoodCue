/**
 * FoodCue OpenFoodFacts Integration - Metadata Mapper
 * Controlling Authority: FoodCue Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 *
 * Safety Invariant:
 * External catalogue data is mapped to an UNVERIFIED candidate.
 * It NEVER automatically becomes a ConfirmedLabel or verified physical product.
 */

import type { ProductCandidate } from "../../domain/entities/food";
import type { VerifiedFoodProduct } from "../../domain/entities/catalogData";
import type {
  RawOpenFoodFactsProduct,
  RawOpenFoodFactsResponse,
  OpenFoodFactsProductCandidate,
} from "./openFoodFactsTypes";

/**
 * Maps categories string or tags into FoodCue's recognized category enum
 */
function mapCategory(
  rawCategory?: string,
  categoryTags?: string[]
): VerifiedFoodProduct["category"] {
  const combined = `${rawCategory ?? ""} ${(categoryTags ?? []).join(" ")}`.toLowerCase();

  if (combined.includes("biscuit") || combined.includes("cookie") || combined.includes("bakery")) {
    return "Biscuits & Bakery";
  }
  if (combined.includes("dairy") || combined.includes("milk") || combined.includes("cheese") || combined.includes("butter")) {
    return "Dairy";
  }
  if (combined.includes("cereal") || combined.includes("breakfast") || combined.includes("oat")) {
    return "Breakfast & Cereals";
  }
  if (combined.includes("beverage") || combined.includes("drink") || combined.includes("tea") || combined.includes("coffee") || combined.includes("juice")) {
    return "Beverages";
  }
  if (combined.includes("sauce") || combined.includes("condiment") || combined.includes("ketchup") || combined.includes("paste")) {
    return "Condiments";
  }
  if (combined.includes("flour") || combined.includes("grain") || combined.includes("rice") || combined.includes("pulse") || combined.includes("staple") || combined.includes("salt")) {
    return "Staples";
  }
  return "Snacks & Instant";
}

/**
 * Extracts and cleans allergen tags (e.g. "en:gluten" -> "Gluten")
 */
function cleanAllergenTags(tags?: string[], rawString?: string): string[] {
  const result = new Set<string>();

  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      // Remove language prefix (e.g. "en:milk" -> "Milk")
      const clean = tag.replace(/^[a-z]{2}:/i, "").trim();
      if (clean) {
        result.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
      }
    }
  }

  if (rawString && typeof rawString === "string") {
    const parts = rawString.split(",").map((s) => s.trim());
    for (const p of parts) {
      if (p) {
        result.add(p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
      }
    }
  }

  return Array.from(result);
}

/**
 * Maps raw OpenFoodFacts response into an OpenFoodFactsProductCandidate
 */
export function mapToOpenFoodFactsCandidate(
  response: RawOpenFoodFactsResponse
): OpenFoodFactsProductCandidate {
  const p: RawOpenFoodFactsProduct = response.product ?? {};
  const gtin = p.code || response.code || "unknown";

  const productName = (
    p.product_name ||
    p.product_name_en ||
    p.generic_name ||
    "Packaged Food Item"
  ).trim();

  const brand = ((p.brands || "External Manufacturer").split(",")[0] || "External Manufacturer").trim();
  const packSize = (p.quantity || "Standard Pack").trim();
  const category = mapCategory(p.categories, p.categories_tags);

  const ingredientsText = (p.ingredients_text || p.ingredients_text_en || "").trim();
  const allergensDeclared = cleanAllergenTags(p.allergens_tags, p.allergens);

  const nutriments = p.nutriments || {};
  const nutritionPer100g: Record<string, number | string> = {};

  if (typeof nutriments["energy-kcal_100g"] === "number") {
    nutritionPer100g["energyKcal"] = nutriments["energy-kcal_100g"];
  } else if (typeof nutriments.energy_100g === "number") {
    nutritionPer100g["energyKcal"] = Math.round(nutriments.energy_100g / 4.184);
  }
  if (typeof nutriments.proteins_100g === "number") {
    nutritionPer100g["proteinG"] = nutriments.proteins_100g;
  }
  if (typeof nutriments.carbohydrates_100g === "number") {
    nutritionPer100g["carbohydratesG"] = nutriments.carbohydrates_100g;
  }
  if (typeof nutriments.sugars_100g === "number") {
    nutritionPer100g["totalSugarsG"] = nutriments.sugars_100g;
  }
  if (typeof nutriments.fat_100g === "number") {
    nutritionPer100g["totalFatG"] = nutriments.fat_100g;
  }
  if (typeof nutriments["saturated-fat_100g"] === "number") {
    nutritionPer100g["saturatedFatG"] = nutriments["saturated-fat_100g"];
  }
  if (typeof nutriments.sodium_100g === "number") {
    nutritionPer100g["sodiumMg"] = Math.round(nutriments.sodium_100g * 1000);
  } else if (typeof nutriments.salt_100g === "number") {
    nutritionPer100g["sodiumMg"] = Math.round((nutriments.salt_100g / 2.5) * 1000);
  }

  const lastModifiedDate = p.last_modified_t
    ? new Date(p.last_modified_t * 1000).toISOString()
    : undefined;

  return {
    source: "openfoodfacts",
    gtin,
    productName,
    brand,
    packSize,
    category,
    ingredientsText,
    allergensDeclared,
    allergensMayContain: [],
    nutritionPer100g,
    lastModifiedDate,
    retrievedAt: new Date().toISOString(),
    verificationStatus: "unverified",
    identityStatus: "candidate",
    labelVersionStatus: "unknown",
    sourceAttribution: "OpenFoodFacts (Open Database License ODbL)",
    imageUrl: p.image_front_small_url || p.image_front_url || undefined,
  };
}

/**
 * Adapts an OpenFoodFacts candidate into FoodCue's ProductCandidate entity
 */
export function mapToProductCandidate(
  offCandidate: OpenFoodFactsProductCandidate
): ProductCandidate {
  return {
    candidateId: `off_${offCandidate.gtin}_${Date.now()}`,
    identifier: offCandidate.gtin,
    identifierType: "gtin",
    displayName: `${offCandidate.brand} - ${offCandidate.productName}`,
    status: "candidate",
    provenance: [
      `OpenFoodFacts external fallback (Retrieved: ${offCandidate.retrievedAt})`,
      "External unverified catalogue metadata",
    ],
    observedAt: offCandidate.retrievedAt,
    conflicts: [],
  };
}

/**
 * Converts an OpenFoodFacts candidate into a VerifiedFoodProduct shape
 * for rendering in the candidate comparison view with explicit unverified markers.
 */
export function mapToComparisonProduct(
  offCandidate: OpenFoodFactsProductCandidate
): VerifiedFoodProduct {
  const n = offCandidate.nutritionPer100g;

  return {
    id: `off-${offCandidate.gtin}`,
    gtin: offCandidate.gtin,
    brand: offCandidate.brand,
    productName: offCandidate.productName,
    variant: "External Metadata Match",
    packSize: offCandidate.packSize,
    category: offCandidate.category as VerifiedFoodProduct["category"],
    fssaiLicence: "Not Verified (External Data)",
    ingredientsText: offCandidate.ingredientsText,
    parsedIngredients: offCandidate.ingredientsText
      ? offCandidate.ingredientsText.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    allergensDeclared: offCandidate.allergensDeclared,
    allergensMayContain: [],
    nutritionPer100g: {
      energyKcal: typeof n.energyKcal === "number" ? n.energyKcal : 0,
      proteinG: typeof n.proteinG === "number" ? n.proteinG : 0,
      carbohydratesG: typeof n.carbohydratesG === "number" ? n.carbohydratesG : 0,
      totalSugarsG: typeof n.totalSugarsG === "number" ? n.totalSugarsG : 0,
      addedSugarsG: 0,
      totalFatG: typeof n.totalFatG === "number" ? n.totalFatG : 0,
      saturatedFatG: typeof n.saturatedFatG === "number" ? n.saturatedFatG : 0,
      transFatG: 0,
      sodiumMg: typeof n.sodiumMg === "number" ? n.sodiumMg : 0,
    },
    manufacturerClaims: ["OpenFoodFacts External Match"],
    sourceReference: "OpenFoodFacts (ODbL) — Not independently verified by FoodCue",
    lastVerifiedDate: offCandidate.lastModifiedDate || offCandidate.retrievedAt,
  };
}
