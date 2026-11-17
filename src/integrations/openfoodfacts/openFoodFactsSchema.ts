/**
 * FoodCue OpenFoodFacts Integration - Zod Validation Schemas
 * Controlling Authority: FoodCue Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 */

import { z } from "zod";

export const rawNutrimentsSchema = z
  .object({
    "energy-kcal_100g": z.number().optional(),
    energy_100g: z.number().optional(),
    proteins_100g: z.number().optional(),
    carbohydrates_100g: z.number().optional(),
    sugars_100g: z.number().optional(),
    fat_100g: z.number().optional(),
    "saturated-fat_100g": z.number().optional(),
    sodium_100g: z.number().optional(),
    salt_100g: z.number().optional(),
    fiber_100g: z.number().optional(),
  })
  .passthrough();

export const rawProductSchema = z
  .object({
    code: z.string().optional(),
    product_name: z.string().optional(),
    product_name_en: z.string().optional(),
    generic_name: z.string().optional(),
    brands: z.string().optional(),
    brands_tags: z.array(z.string()).optional(),
    quantity: z.string().optional(),
    categories: z.string().optional(),
    categories_tags: z.array(z.string()).optional(),
    packaging: z.string().optional(),
    countries: z.string().optional(),
    ingredients_text: z.string().optional(),
    ingredients_text_en: z.string().optional(),
    allergens: z.string().optional(),
    allergens_tags: z.array(z.string()).optional(),
    nutriments: rawNutrimentsSchema.optional(),
    last_modified_t: z.number().optional(),
    image_front_url: z.string().url().optional(),
    image_front_small_url: z.string().url().optional(),
  })
  .passthrough();

export const rawOpenFoodFactsResponseSchema = z
  .object({
    status: z.number(),
    status_verbose: z.string().optional(),
    code: z.string().optional(),
    product: rawProductSchema.optional(),
  })
  .passthrough();
