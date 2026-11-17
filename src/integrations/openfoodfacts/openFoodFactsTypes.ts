/**
 * FoodCue OpenFoodFacts Integration - Type Definitions
 * Controlling Authority: FoodCue Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 *
 * Privacy Invariant:
 * Only validated numerical GTINs are sent to OpenFoodFacts.
 * Zero user data, photos, OCR text, or account tokens are ever transmitted.
 */

export interface OpenFoodFactsClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export interface RawOpenFoodFactsNutriments {
  "energy-kcal_100g"?: number;
  "energy_100g"?: number;
  "proteins_100g"?: number;
  "carbohydrates_100g"?: number;
  "sugars_100g"?: number;
  "fat_100g"?: number;
  "saturated-fat_100g"?: number;
  "sodium_100g"?: number;
  "salt_100g"?: number;
  "fiber_100g"?: number;
  [key: string]: unknown;
}

export interface RawOpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  brands_tags?: string[];
  quantity?: string;
  categories?: string;
  categories_tags?: string[];
  packaging?: string;
  countries?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens?: string;
  allergens_tags?: string[];
  nutriments?: RawOpenFoodFactsNutriments;
  last_modified_t?: number;
  image_front_url?: string;
  image_front_small_url?: string;
  [key: string]: unknown;
}

export interface RawOpenFoodFactsResponse {
  status: number;
  status_verbose?: string;
  code?: string;
  product?: RawOpenFoodFactsProduct;
  [key: string]: unknown;
}

export interface OpenFoodFactsProductCandidate {
  source: "openfoodfacts";
  gtin: string;
  productName: string;
  brand: string;
  packSize: string;
  category: string;
  ingredientsText: string;
  allergensDeclared: string[];
  allergensMayContain: string[];
  nutritionPer100g: Record<string, number | string>;
  lastModifiedDate?: string;
  retrievedAt: string;
  verificationStatus: "unverified";
  identityStatus: "candidate";
  labelVersionStatus: "unknown";
  sourceAttribution: string;
  imageUrl?: string;
}
