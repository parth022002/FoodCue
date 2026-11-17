/**
 * FoodCue Modular AI Nutrition Agents & Intelligence Engine
 * Controlling Baseline: Master Development Prompt Section 4 (AI Agent Architecture)
 *
 * Implements 6 specialized agents:
 * - Agent 1: Product Identification Agent
 * - Agent 2: Internet Research Agent
 * - Agent 3: Nutrition Analysis Agent
 * - Agent 4: Ingredient Analysis Agent
 * - Agent 5: Food Health Evaluation Agent
 * - Agent 6: Personalized Recommendation Agent
 */

import type {
  ComprehensiveNutrition,
  NutrientValue,
  SimplifiedIngredient,
  FoodHealthAssessment,
  HealthCategory,
  IntelligentProductReport,
  DataProvenanceStatus
} from "../entities/nutritionalProfile";
import { VERIFIED_INDIAN_CATALOG, type VerifiedFoodProduct } from "../entities/catalogData";
import { normaliseGtin } from "../rules/gtin";

// ----------------------------------------------------------------------------
// Agent 1: Product Identification Agent
// ----------------------------------------------------------------------------
export class ProductIdentificationAgent {
  /**
   * Resolves raw inputs (barcode, GS1, OCR text, query string) to product candidates.
   */
  identifyFromInput(raw: string): {
    gtin?: string;
    searchTerm: string;
    isBarcode: boolean;
  } {
    const clean = raw.trim();
    const gtin = normaliseGtin(clean);
    if (gtin) {
      return { gtin, searchTerm: gtin, isBarcode: true };
    }
    return { searchTerm: clean, isBarcode: false };
  }
}

// ----------------------------------------------------------------------------
// Agent 2: Internet Research Agent
// ----------------------------------------------------------------------------
export class InternetResearchAgent {
  private readonly userAgent = "FoodCue-PWA/2.0 (contact: parth022002@github.com)";
  private readonly searchTimeoutMs = 6000;

  /**
   * Queries multiple sources: internal verified catalog, Open Food Facts Indian mirror, and World mirror.
   */
  async searchProduct(query: string): Promise<IntelligentProductReport[]> {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const results: IntelligentProductReport[] = [];
    const seenCodes = new Set<string>();

    // 1. Search local verified Indian FMCG Catalog first (instant, guaranteed)
    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);
    for (const prod of VERIFIED_INDIAN_CATALOG) {
      const fullText = `${prod.productName} ${prod.brand} ${prod.category} ${prod.gtin}`.toLowerCase();
      const matchTokens = queryTokens.length > 0 && queryTokens.every((token) => fullText.includes(token));
      const matchExact = fullText.includes(cleanQuery);

      if (matchTokens || matchExact) {
        seenCodes.add(prod.gtin);
        results.push(this.transformVerifiedProductToReport(prod));
      }
    }

    // 2. Query Open Food Facts Search API (in.openfoodfacts.org / world)
    try {
      const offProducts = await this.queryOpenFoodFactsSearch(query);
      for (const off of offProducts) {
        const code = String(off.code || off._id || "");
        if (code && seenCodes.has(code)) continue;
        if (code) seenCodes.add(code);

        const report = this.transformOpenFoodFactsToReport(off);
        if (report) {
          results.push(report);
        }
      }
    } catch {
      // Graceful fallback to verified catalog results
    }

    return results;
  }

  /**
   * Fetch single product by barcode GTIN from Open Food Facts API
   */
  async fetchByGtin(gtin: string): Promise<IntelligentProductReport | null> {
    // 1. Check local catalog first
    const local = VERIFIED_INDIAN_CATALOG.find((p) => p.gtin === gtin);
    if (local) {
      return this.transformVerifiedProductToReport(local);
    }

    // 2. Query external API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.searchTimeoutMs);

      const url = `https://world.openfoodfacts.org/api/v2/product/${gtin}.json`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json"
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          return this.transformOpenFoodFactsToReport(data.product);
        }
      }
    } catch {
      // Network or timeout error
    }

    return null;
  }

  private async queryOpenFoodFactsSearch(query: string): Promise<Record<string, unknown>[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.searchTimeoutMs);

    const endpoints = [
      `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`,
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": this.userAgent,
            Accept: "application/json"
          },
          signal: controller.signal
        });

        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (Array.isArray(data.products) && data.products.length > 0) {
              clearTimeout(timeout);
              return data.products;
            }
          }
        }
      } catch {
        // Try next endpoint
      }
    }

    clearTimeout(timeout);
    return [];
  }

  private transformVerifiedProductToReport(prod: VerifiedFoodProduct): IntelligentProductReport {
    const nutritionAgent = new NutritionAnalysisAgent();
    const ingredientAgent = new IngredientAnalysisAgent();
    const evaluationAgent = new FoodHealthEvaluationAgent();

    const nutrition = nutritionAgent.analyzeNutritionFromVerified(prod.nutritionPer100g, prod.servingSize);
    const parsedIngredients = ingredientAgent.analyzeIngredients(prod.parsedIngredients);
    const healthAssessment = evaluationAgent.evaluate(nutrition, parsedIngredients, prod.category);

    return {
      id: prod.id,
      gtin: prod.gtin,
      productName: prod.productName,
      brand: prod.brand,
      category: prod.category,
      variant: prod.variant,
      packSize: prod.packSize,
      imageUrl: undefined,
      source: {
        sourceName: "FoodCue Verified Indian FMCG Catalogue (FSSAI Audited)",
        sourceUrl: "https://www.fssai.gov.in/",
        retrievalTimestamp: new Date().toISOString(),
        confidence: 0.98
      },
      isVegetarian: !prod.allergensDeclared.some((a) =>
        ["fish", "egg", "meat", "crustacean", "chicken"].some((nonVeg) => a.toLowerCase().includes(nonVeg))
      ),
      allergensDeclared: prod.allergensDeclared,
      allergensMayContain: prod.allergensMayContain,
      nutritionPer100g: nutrition,
      ingredientsText: prod.ingredientsText,
      parsedIngredients,
      healthAssessment
    };
  }

  private transformOpenFoodFactsToReport(p: Record<string, unknown>): IntelligentProductReport | null {
    const productName = (p.product_name as string) || (p.product_name_en as string);
    if (!productName) return null;

    const brand = (p.brands as string) || (p.brand_owner as string) || "Brand Unknown";
    const gtin = (p.code as string) || undefined;
    const category = (p.categories as string)?.split(",")?.[0]?.trim() || "Packaged Food";
    const imageUrl = (p.image_front_url as string) || (p.image_url as string) || undefined;
    const ingredientsText = (p.ingredients_text as string) || (p.ingredients_text_en as string) || "";
    const allergensTags = (p.allergens_tags as string[]) || [];
    const allergens = allergensTags.map((t) => t.replace("en:", "").replace(/-/g, " "));

    const nutritionAgent = new NutritionAnalysisAgent();
    const ingredientAgent = new IngredientAnalysisAgent();
    const evaluationAgent = new FoodHealthEvaluationAgent();

    const nutriments = (p.nutriments as Record<string, unknown>) || {};
    const nutrition = nutritionAgent.analyzeNutritionFromNutriments(nutriments, (p.serving_size as string) || undefined);
    const parsedIngredients = ingredientAgent.analyzeFromText(ingredientsText);
    const healthAssessment = evaluationAgent.evaluate(nutrition, parsedIngredients, category);

    const labels = ((p.labels_tags as string[]) || []).join(" ").toLowerCase();
    const isVeg = labels.includes("vegetarian") || labels.includes("green-dot")
      ? true
      : labels.includes("non-vegetarian") || labels.includes("brown-dot")
      ? false
      : null;

    return {
      id: `off-${gtin || Math.random().toString(36).slice(2, 9)}`,
      gtin,
      productName,
      brand,
      category,
      imageUrl,
      source: {
        sourceName: "Open Food Facts Open Database (ODbL)",
        sourceUrl: gtin ? `https://world.openfoodfacts.org/product/${gtin}` : undefined,
        retrievalTimestamp: new Date().toISOString(),
        confidence: 0.85
      },
      isVegetarian: isVeg,
      allergensDeclared: allergens,
      allergensMayContain: [],
      nutritionPer100g: nutrition,
      ingredientsText,
      parsedIngredients,
      healthAssessment
    };
  }
}

// ----------------------------------------------------------------------------
// Agent 3: Nutrition Analysis Agent
// ----------------------------------------------------------------------------
export class NutritionAnalysisAgent {
  private createNutrient(
    val: unknown,
    unit: NutrientValue["unit"],
    provenance: DataProvenanceStatus = "database_reported"
  ): NutrientValue {
    if (val === null || val === undefined || val === "" || Number.isNaN(Number(val))) {
      return { value: null, unit, provenance: "unavailable" };
    }
    const num = Math.round(Number(val) * 100) / 100;
    return { value: num, unit, provenance };
  }

  analyzeNutritionFromVerified(
    data: {
      energyKcal: number;
      proteinG: number;
      carbohydratesG: number;
      totalSugarsG: number;
      addedSugarsG: number;
      totalFatG: number;
      saturatedFatG: number;
      transFatG: number;
      sodiumMg: number;
    },
    servingSize?: string
  ): ComprehensiveNutrition {
    return {
      energyKcal: this.createNutrient(data.energyKcal, "kcal", "verified_pack"),
      totalFat: this.createNutrient(data.totalFatG, "g", "verified_pack"),
      saturatedFat: this.createNutrient(data.saturatedFatG, "g", "verified_pack"),
      transFat: this.createNutrient(data.transFatG, "g", "verified_pack"),
      cholesterol: this.createNutrient(null, "mg", "unavailable"),
      carbohydrates: this.createNutrient(data.carbohydratesG, "g", "verified_pack"),
      totalSugars: this.createNutrient(data.totalSugarsG, "g", "verified_pack"),
      addedSugars: this.createNutrient(data.addedSugarsG, "g", "verified_pack"),
      dietaryFibre: this.createNutrient(null, "g", "unavailable"),
      protein: this.createNutrient(data.proteinG, "g", "verified_pack"),
      sodium: this.createNutrient(data.sodiumMg, "mg", "verified_pack"),
      salt: this.createNutrient(data.sodiumMg ? Math.round((data.sodiumMg * 2.5) / 10) / 100 : null, "g", "verified_pack"),
      calcium: this.createNutrient(null, "mg", "unavailable"),
      iron: this.createNutrient(null, "mg", "unavailable"),
      potassium: this.createNutrient(null, "mg", "unavailable"),
      vitaminA: this.createNutrient(null, "mcg", "unavailable"),
      vitaminC: this.createNutrient(null, "mg", "unavailable"),
      vitaminD: this.createNutrient(null, "mcg", "unavailable"),
      vitaminB12: this.createNutrient(null, "mcg", "unavailable"),
      servingSize
    };
  }

  analyzeNutritionFromNutriments(
    n: Record<string, unknown>,
    servingSize?: string
  ): ComprehensiveNutrition {
    const prov: DataProvenanceStatus = "database_reported";

    return {
      energyKcal: this.createNutrient(n["energy-kcal_100g"] ?? n["energy-kcal"], "kcal", prov),
      totalFat: this.createNutrient(n["fat_100g"] ?? n.fat, "g", prov),
      saturatedFat: this.createNutrient(n["saturated-fat_100g"] ?? n["saturated-fat"], "g", prov),
      transFat: this.createNutrient(n["trans-fat_100g"] ?? n["trans-fat"], "g", prov),
      cholesterol: this.createNutrient(n["cholesterol_100g"] ?? n.cholesterol, "mg", prov),
      carbohydrates: this.createNutrient(n["carbohydrates_100g"] ?? n.carbohydrates, "g", prov),
      totalSugars: this.createNutrient(n["sugars_100g"] ?? n.sugars, "g", prov),
      addedSugars: this.createNutrient(n["added-sugars_100g"] ?? n["added-sugars"], "g", prov),
      dietaryFibre: this.createNutrient(n["fiber_100g"] ?? n.fiber, "g", prov),
      protein: this.createNutrient(n["proteins_100g"] ?? n.proteins, "g", prov),
      sodium: this.createNutrient(
        n["sodium_100g"] !== undefined
          ? Math.round(Number(n["sodium_100g"]) * 1000)
          : undefined,
        "mg",
        prov
      ),
      salt: this.createNutrient(n["salt_100g"] ?? n.salt, "g", prov),
      calcium: this.createNutrient(n["calcium_100g"] ?? n.calcium, "mg", prov),
      iron: this.createNutrient(n["iron_100g"] ?? n.iron, "mg", prov),
      potassium: this.createNutrient(n["potassium_100g"] ?? n.potassium, "mg", prov),
      vitaminA: this.createNutrient(n["vitamin-a_100g"] ?? n["vitamin-a"], "mcg", prov),
      vitaminC: this.createNutrient(n["vitamin-c_100g"] ?? n["vitamin-c"], "mg", prov),
      vitaminD: this.createNutrient(n["vitamin-d_100g"] ?? n["vitamin-d"], "mcg", prov),
      vitaminB12: this.createNutrient(n["vitamin-b12_100g"] ?? n["vitamin-b12"], "mcg", prov),
      servingSize
    };
  }
}

// ----------------------------------------------------------------------------
// Agent 4: Ingredient Analysis Agent
// ----------------------------------------------------------------------------
export class IngredientAnalysisAgent {
  private readonly additiveDictionary: Record<
    string,
    { category: SimplifiedIngredient["category"]; simple: string; safety: string }
  > = {
    "INS 322": {
      category: "emulsifier_stabilizer",
      simple: "Lecithin — helps blend oil and water smoothly so the food doesn't separate.",
      safety: "Widely used, natural component derived from soy or sunflower."
    },
    "INS 500": {
      category: "emulsifier_stabilizer",
      simple: "Baking Soda (Sodium Bicarbonate) — creates tiny air bubbles so snacks are light and crispy.",
      safety: "Safe, traditional kitchen baking ingredient."
    },
    "INS 503": {
      category: "emulsifier_stabilizer",
      simple: "Ammonium Bicarbonate — a baker's raising agent that evaporates completely during baking.",
      safety: "Safe, standard baking compound used worldwide."
    },
    "INS 223": {
      category: "preservative",
      simple: "Sodium Metabisulphite — keeps dough fresh and prevents biscuits from turning stale.",
      safety: "Contains sulphites; people sensitive to sulphites should take note."
    },
    "INS 319": {
      category: "preservative",
      simple: "TBHQ — an antioxidant that stops edible oils from becoming rancid or smelling bad.",
      safety: "Approved by food safety authorities within strictly regulated low limits."
    },
    "INS 621": {
      category: "flavour_enhancer",
      simple: "MSG (Monosodium Glutamate) — brings out a rich, savoury umami taste naturally found in tomatoes and cheese.",
      safety: "Safe for the general population; some individuals prefer lower intake."
    },
    "INS 102": {
      category: "artificial_colour",
      simple: "Tartrazine — a bright yellow food colour.",
      safety: "Approved colour; excessive intake of artificial dyes is best minimized."
    },
    "INS 110": {
      category: "artificial_colour",
      simple: "Sunset Yellow — gives an orange-yellow colour to foods and drinks.",
      safety: "Approved colour; moderation is recommended."
    },
    "INS 150D": {
      category: "artificial_colour",
      simple: "Caramel IV — gives a deep brown colour, like in colas and rich gravies.",
      safety: "Widely used standard colouring agent."
    },
    "INS 955": {
      category: "sweetener",
      simple: "Sucralose — a zero-calorie sweetener made from sugar.",
      safety: "Helps reduce sugar intake; approved non-nutritive sweetener."
    },
    "INS 960": {
      category: "sweetener",
      simple: "Stevia — a natural zero-calorie sweet plant extract.",
      safety: "Natural plant-based sugar alternative."
    },
    "INS 412": {
      category: "emulsifier_stabilizer",
      simple: "Guar Gum — a natural fibre powder from guar beans that gives foods a smooth texture.",
      safety: "Natural, plant-derived dietary fibre."
    },
    "INS 415": {
      category: "emulsifier_stabilizer",
      simple: "Xanthan Gum — a natural thickener that keeps sauces and dressings thick and uniform.",
      safety: "Safe, natural fermented carbohydrate."
    }
  };

  analyzeIngredients(parsedList: string[]): SimplifiedIngredient[] {
    return parsedList.map((item) => this.classifySingleIngredient(item));
  }

  analyzeFromText(text: string): SimplifiedIngredient[] {
    if (!text) return [];
    // Split by commas, semicolons, brackets
    const rawTokens = text.split(/[,;•\n]/).map((s) => s.trim()).filter(Boolean);
    return rawTokens.map((t) => this.classifySingleIngredient(t));
  }

  private classifySingleIngredient(name: string): SimplifiedIngredient {
    const upper = name.toUpperCase();
    const lower = name.toLowerCase();

    // Check known INS additives
    for (const [code, info] of Object.entries(this.additiveDictionary)) {
      if (upper.includes(code)) {
        return {
          name,
          category: info.category,
          insNumber: code,
          simpleExplanation: info.simple,
          safetyNote: info.safety
        };
      }
    }

    // Sugars
    if (
      lower.includes("sugar") ||
      lower.includes("syrup") ||
      lower.includes("glucose") ||
      lower.includes("fructose") ||
      lower.includes("dextrose") ||
      lower.includes("jaggery")
    ) {
      return {
        name,
        category: "added_sugar",
        simpleExplanation: "Added Sweetener — gives sweetness and energy, but should be eaten in moderation.",
        safetyNote: "High intake of added sugars is linked to tooth decay and weight gain."
      };
    }

    // Refined Oils / Fats
    if (lower.includes("palm oil") || lower.includes("vegetable oil") || lower.includes("fat") || lower.includes("ghee")) {
      return {
        name,
        category: "refined_oil_fat",
        simpleExplanation: "Cooking Oil / Fat — provides richness and texture.",
        safetyNote: "Saturated fats should be balanced with active daily habits."
      };
    }

    // Flours / Grains
    if (lower.includes("wheat") || lower.includes("maida") || lower.includes("atta") || lower.includes("rice") || lower.includes("corn")) {
      return {
        name,
        category: "main_ingredient",
        simpleExplanation: "Base Grain / Flour — the primary food substance giving calories and body to this product."
      };
    }

    // Dairy
    if (lower.includes("milk") || lower.includes("cheese") || lower.includes("butter") || lower.includes("whey")) {
      return {
        name,
        category: "main_ingredient",
        potentialAllergen: "Milk / Dairy",
        simpleExplanation: "Dairy Product — provides natural calcium, protein, and creamy flavour."
      };
    }

    return {
      name,
      category: "other",
      simpleExplanation: "Standard food ingredient used to build texture, flavour, or freshness."
    };
  }
}

// ----------------------------------------------------------------------------
// Agent 5: Food Health Evaluation Agent
// ----------------------------------------------------------------------------
export class FoodHealthEvaluationAgent {
  /**
   * Transparent, scientifically defensible health scoring out of 100.
   * Categories:
   * 80-100: Excellent
   * 65-79: Good
   * 50-64: Moderate
   * 35-49: Poor
   * 0-34: Very Poor
   */
  evaluate(
    nutrition: ComprehensiveNutrition,
    ingredients: SimplifiedIngredient[],
    productCategory: string
  ): FoodHealthAssessment {
    let score = 70; // Neutral starting baseline
    const strengths: string[] = [];
    const concerns: string[] = [];
    const attentionIngredients: string[] = [];
    const whatThisMeans: string[] = [];

    let availableCount = 0;
    const trackedKeys = [
      nutrition.energyKcal,
      nutrition.totalFat,
      nutrition.saturatedFat,
      nutrition.carbohydrates,
      nutrition.totalSugars,
      nutrition.protein,
      nutrition.sodium
    ];
    trackedKeys.forEach((k) => {
      if (k.value !== null) availableCount++;
    });
    const dataCompleteness = Math.round((availableCount / trackedKeys.length) * 100);

    // 1. Protein evaluation (per 100g)
    const protein = nutrition.protein.value;
    if (protein !== null) {
      if (protein >= 15) {
        score += 15;
        strengths.push(`Rich in protein (${protein}g / 100g) — helps muscles and keeps you full`);
        whatThisMeans.push("This product provides a hearty amount of protein to sustain your energy.");
      } else if (protein >= 8) {
        score += 8;
        strengths.push(`Good source of protein (${protein}g / 100g)`);
      }
    }

    // 2. Fibre evaluation
    const fibre = nutrition.dietaryFibre.value;
    if (fibre !== null) {
      if (fibre >= 6) {
        score += 12;
        strengths.push(`High in dietary fibre (${fibre}g / 100g) — supports good digestion`);
        whatThisMeans.push("Contains valuable dietary fibre for healthy gut digestion.");
      } else if (fibre >= 3) {
        score += 6;
        strengths.push(`Provides dietary fibre (${fibre}g / 100g)`);
      }
    }

    // 3. Added Sugars / Total Sugars evaluation
    const sugars = nutrition.addedSugars.value ?? nutrition.totalSugars.value;
    if (sugars !== null) {
      if (sugars >= 25) {
        score -= 25;
        concerns.push(`High sugar content (${sugars}g / 100g) — more than 1/4th of the product is sugar`);
        attentionIngredients.push("Added Sugar / Sweetener");
        whatThisMeans.push("This product is very sweet. Treat it as an occasional snack rather than a daily meal.");
      } else if (sugars >= 12) {
        score -= 12;
        concerns.push(`Moderate sugar content (${sugars}g / 100g)`);
        whatThisMeans.push("Consider checking portion sizes if you are watching your daily sugar intake.");
      } else if (sugars <= 3) {
        score += 8;
        strengths.push("Low in sugar — great for mindful eating");
      }
    }

    // 4. Saturated & Trans Fat evaluation
    const satFat = nutrition.saturatedFat.value;
    if (satFat !== null) {
      if (satFat >= 10) {
        score -= 15;
        concerns.push(`High saturated fat (${satFat}g / 100g)`);
        attentionIngredients.push("Saturated Fats / Palm Oils");
      } else if (satFat <= 1.5) {
        score += 6;
        strengths.push("Low saturated fat");
      }
    }

    const transFat = nutrition.transFat.value;
    if (transFat !== null && transFat > 0.2) {
      score -= 15;
      concerns.push(`Contains trans fats (${transFat}g / 100g)`);
      attentionIngredients.push("Trans Fats / Hydrogenated Oils");
    }

    // 5. Sodium evaluation (mg per 100g)
    const sodium = nutrition.sodium.value;
    if (sodium !== null) {
      if (sodium >= 800) {
        score -= 18;
        concerns.push(`High sodium (${sodium}mg / 100g) — elevated salt content`);
        whatThisMeans.push("High in sodium. Drink plenty of water and balance with fresh fruits or vegetables.");
      } else if (sodium <= 120) {
        score += 6;
        strengths.push("Low sodium / salt");
      }
    }

    // 6. Additives & Processing evaluation
    const artificialColours = ingredients.filter((i) => i.category === "artificial_colour");
    if (artificialColours.length > 0) {
      score -= 8;
      concerns.push(`Contains synthetic food colours (${artificialColours.map((c) => c.name).join(", ")})`);
      attentionIngredients.push("Artificial Colours");
    }

    // Normalize score to 0..100
    score = Math.max(10, Math.min(98, score));

    // Category determination
    let category: HealthCategory = "Moderate";
    if (score >= 80) category = "Excellent";
    else if (score >= 65) category = "Good";
    else if (score >= 50) category = "Moderate";
    else if (score >= 35) category = "Poor";
    else category = "Very Poor";

    // Recommended frequency
    let recommendedFrequency = "Enjoy in moderation as part of a balanced diet";
    if (category === "Excellent") recommendedFrequency = "Healthy staple suitable for regular daily consumption";
    else if (category === "Good") recommendedFrequency = "Wholesome food for frequent consumption";
    else if (category === "Moderate") recommendedFrequency = "Balanced food; enjoy in reasonable portions";
    else if (category === "Poor") recommendedFrequency = "Limit consumption; consider healthier alternatives";
    else if (category === "Very Poor") recommendedFrequency = "Occasional treat only; not recommended as a staple";

    if (whatThisMeans.length === 0) {
      whatThisMeans.push("A standard packaged food product. Review ingredients to suit your family's preferences.");
    }

    // Suggested alternatives based on category
    const healthierAlternatives: FoodHealthAssessment["healthierAlternatives"] = [];
    if (score < 65) {
      if (productCategory.toLowerCase().includes("biscuit") || productCategory.toLowerCase().includes("bakery")) {
        healthierAlternatives.push({
          name: "Rolled Oats / Multi-Grain Crackers",
          brand: "Bagrry's / True Elements",
          reason: "Significantly higher in dietary fibre with lower added sugar."
        });
      } else if (productCategory.toLowerCase().includes("snack") || productCategory.toLowerCase().includes("noodle")) {
        healthierAlternatives.push({
          name: "Roasted Makhana (Fox Nuts) / Millet Noodles",
          brand: "Farmley / Slurrp Farm",
          reason: "Zero palm oil, lower sodium, and naturally gluten-friendly."
        });
      } else if (productCategory.toLowerCase().includes("sweet") || productCategory.toLowerCase().includes("spread")) {
        healthierAlternatives.push({
          name: "100% Roasted Peanut Butter (Unsweetened)",
          brand: "Pintola / The Whole Truth",
          reason: "Packed with 30% protein, healthy fats, and zero added sugar or hydrogenated oils."
        });
      }
    }

    return {
      score,
      category,
      strengths: strengths.length > 0 ? strengths : ["Standard food energy source"],
      concerns: concerns.length > 0 ? concerns : ["No major nutritional concerns identified"],
      attentionIngredients,
      recommendedFrequency,
      whatThisMeansForYou: whatThisMeans,
      healthierAlternatives,
      dataCompletenessPercentage: dataCompleteness
    };
  }
}

// ----------------------------------------------------------------------------
// Agent 6: Personalized Recommendation Agent
// ----------------------------------------------------------------------------
export class PersonalizedRecommendationAgent {
  /**
   * Applies user-specific profile (allergies, diet) to product report.
   */
  personalizeReport(
    report: IntelligentProductReport,
    userProfile: {
      avoidAllergens: string[];
      avoidIngredients: string[];
      dietaryPreference?: string;
    }
  ): IntelligentProductReport {
    const conflictingAllergens: string[] = [];

    // Check allergen conflicts
    for (const userAllergen of userProfile.avoidAllergens) {
      const uLower = userAllergen.toLowerCase();
      // Check declared
      const hitDeclared = report.allergensDeclared.some((d) => d.toLowerCase().includes(uLower));
      // Check ingredients text
      const hitText = report.ingredientsText.toLowerCase().includes(uLower);

      if (hitDeclared || hitText) {
        conflictingAllergens.push(userAllergen);
      }
    }

    // Check vegetarian / dietary suitability
    let dietarySuitability: "suitable" | "unsuitable" | "unknown" = "suitable";
    let dietaryNote: string | undefined;

    const diet = (userProfile.dietaryPreference || "standard").toLowerCase();
    if (diet === "vegetarian" && report.isVegetarian === false) {
      dietarySuitability = "unsuitable";
      dietaryNote = "This product is marked as Non-Vegetarian.";
    } else if (diet === "vegan") {
      const hasDairy = report.allergensDeclared.some((a) => a.toLowerCase().includes("milk"));
      if (hasDairy || report.isVegetarian === false) {
        dietarySuitability = "unsuitable";
        dietaryNote = "Contains animal or dairy ingredients, unsuitable for a strict vegan diet.";
      }
    }

    return {
      ...report,
      personalizedAlerts: {
        hasAllergyConflict: conflictingAllergens.length > 0,
        conflictingAllergens,
        dietarySuitability,
        dietaryNote
      }
    };
  }
}
