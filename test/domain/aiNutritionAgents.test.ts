import { describe, it, expect } from "vitest";
import {
  ProductIdentificationAgent,
  InternetResearchAgent,
  NutritionAnalysisAgent,
  IngredientAnalysisAgent,
  FoodHealthEvaluationAgent,
  PersonalizedRecommendationAgent
} from "../../src/domain/services/aiNutritionAgents";

describe("AI Nutrition Agents & Intelligence Engine", () => {
  describe("Agent 1: Product Identification Agent", () => {
    const idAgent = new ProductIdentificationAgent();

    it("identifies valid 13-digit EAN-13 barcodes", () => {
      const res = idAgent.identifyFromInput("8901058852738");
      expect(res.isBarcode).toBe(true);
      expect(res.gtin).toBe("8901058852738");
      expect(res.searchTerm).toBe("8901058852738");
    });

    it("identifies plain product name query strings as search terms", () => {
      const res = idAgent.identifyFromInput("Amul Taaza Milk 1L");
      expect(res.isBarcode).toBe(false);
      expect(res.gtin).toBeUndefined();
      expect(res.searchTerm).toBe("Amul Taaza Milk 1L");
    });
  });

  describe("Agent 2: Internet Research Agent", () => {
    it("finds products from local verified Indian FMCG catalog", async () => {
      const researchAgent = new InternetResearchAgent();
      const results = await researchAgent.searchProduct("Tata");
      expect(results.length).toBeGreaterThan(0);
      const tataSalt = results.find((r) => r.productName.toLowerCase().includes("salt"));
      expect(tataSalt).toBeDefined();
      expect(tataSalt?.brand).toBe("Tata");
      expect(tataSalt?.source.sourceName).toContain("Verified Indian FMCG");
    });

    it("fetches single product by GTIN from verified catalog", async () => {
      const researchAgent = new InternetResearchAgent();
      // Tata Salt GTIN
      const res = await researchAgent.fetchByGtin("8901058852738");
      expect(res).not.toBeNull();
      expect(res?.productName).toContain("Salt");
      expect(res?.brand).toBe("Tata");
    });
  });

  describe("Agent 3: Nutrition Analysis Agent", () => {
    const nutAgent = new NutritionAnalysisAgent();

    it("standardizes units and extracts all 18+ components", () => {
      const nutrition = nutAgent.analyzeNutritionFromNutriments({
        "energy-kcal_100g": 450,
        "fat_100g": 18.5,
        "saturated-fat_100g": 8.0,
        "trans-fat_100g": 0.1,
        "cholesterol_100g": 5,
        "carbohydrates_100g": 65,
        "sugars_100g": 24,
        "added-sugars_100g": 20,
        "fiber_100g": 4.5,
        "proteins_100g": 7.2,
        "sodium_100g": 0.4, // in grams in OFF, should convert to 400mg
        "salt_100g": 1.0,
        "calcium_100g": 120,
        "iron_100g": 2.5,
        "potassium_100g": 250,
        "vitamin-a_100g": 150,
        "vitamin-c_100g": 12,
        "vitamin-d_100g": 2.5,
        "vitamin-b12_100g": 0.8
      });

      expect(nutrition.energyKcal.value).toBe(450);
      expect(nutrition.totalFat.value).toBe(18.5);
      expect(nutrition.saturatedFat.value).toBe(8.0);
      expect(nutrition.transFat.value).toBe(0.1);
      expect(nutrition.cholesterol.value).toBe(5);
      expect(nutrition.carbohydrates.value).toBe(65);
      expect(nutrition.totalSugars.value).toBe(24);
      expect(nutrition.addedSugars.value).toBe(20);
      expect(nutrition.dietaryFibre.value).toBe(4.5);
      expect(nutrition.protein.value).toBe(7.2);
      expect(nutrition.sodium.value).toBe(400); // 0.4g * 1000 = 400mg
      expect(nutrition.salt.value).toBe(1.0);
      expect(nutrition.calcium.value).toBe(120);
      expect(nutrition.iron.value).toBe(2.5);
      expect(nutrition.potassium.value).toBe(250);
      expect(nutrition.vitaminA.value).toBe(150);
      expect(nutrition.vitaminC.value).toBe(12);
      expect(nutrition.vitaminD.value).toBe(2.5);
      expect(nutrition.vitaminB12.value).toBe(0.8);
    });

    it("marks missing nutritional values as unavailable and never fabricates numbers", () => {
      const nutrition = nutAgent.analyzeNutritionFromNutriments({});
      expect(nutrition.energyKcal.value).toBeNull();
      expect(nutrition.energyKcal.provenance).toBe("unavailable");
      expect(nutrition.vitaminD.value).toBeNull();
      expect(nutrition.vitaminD.provenance).toBe("unavailable");
      expect(nutrition.addedSugars.value).toBeNull();
    });
  });

  describe("Agent 4: Ingredient Analysis Agent", () => {
    const ingAgent = new IngredientAnalysisAgent();

    it("identifies FSSAI INS numbers and provides simple, plain-language explanations", () => {
      const text = "Wheat flour (maida), Sugar, Refined Palm Oil, Emulsifier (INS 322), Raising Agent (INS 500), Salt";
      const parsed = ingAgent.analyzeFromText(text);

      const ins322 = parsed.find((p) => p.insNumber === "INS 322");
      expect(ins322).toBeDefined();
      expect(ins322?.category).toBe("emulsifier_stabilizer");
      expect(ins322?.simpleExplanation).toContain("Lecithin");

      const ins500 = parsed.find((p) => p.insNumber === "INS 500");
      expect(ins500).toBeDefined();
      expect(ins500?.simpleExplanation).toContain("Baking Soda");

      const sugar = parsed.find((p) => p.category === "added_sugar");
      expect(sugar).toBeDefined();
      expect(sugar?.simpleExplanation).toContain("Added Sweetener");
    });
  });

  describe("Agent 5: Food Health Evaluation Agent", () => {
    const evalAgent = new FoodHealthEvaluationAgent();
    const nutAgent = new NutritionAnalysisAgent();

    it("calculates high score for healthy protein and fibre rich food", () => {
      const nutrition = nutAgent.analyzeNutritionFromNutriments({
        "energy-kcal_100g": 380,
        "fat_100g": 4.0,
        "saturated-fat_100g": 0.8,
        "proteins_100g": 16.0,
        "fiber_100g": 10.0,
        "sugars_100g": 1.5,
        "sodium_100g": 0.05
      });

      const assessment = evalAgent.evaluate(nutrition, [], "Breakfast Cereals");
      expect(assessment.score).toBeGreaterThanOrEqual(80);
      expect(assessment.category).toBe("Excellent");
      expect(assessment.strengths.some((s) => s.includes("protein"))).toBe(true);
      expect(assessment.strengths.some((s) => s.includes("fibre"))).toBe(true);
      expect(assessment.whatThisMeansForYou.length).toBeGreaterThan(0);
    });

    it("calculates lower score for ultra-processed high sugar and high fat products", () => {
      const nutrition = nutAgent.analyzeNutritionFromNutriments({
        "energy-kcal_100g": 520,
        "fat_100g": 28.0,
        "saturated-fat_100g": 14.0,
        "proteins_100g": 3.0,
        "sugars_100g": 42.0,
        "sodium_100g": 0.9
      });

      const assessment = evalAgent.evaluate(nutrition, [], "Biscuits & Bakery");
      expect(assessment.score).toBeLessThanOrEqual(50);
      expect(assessment.category).toMatch(/Poor|Very Poor|Moderate/);
      expect(assessment.concerns.some((c) => c.includes("sugar"))).toBe(true);
      expect(assessment.healthierAlternatives.length).toBeGreaterThan(0);
    });
  });

  describe("Agent 6: Personalized Recommendation Agent", () => {
    const recAgent = new PersonalizedRecommendationAgent();
    const nutAgent = new NutritionAnalysisAgent();
    const evalAgent = new FoodHealthEvaluationAgent();

    it("flags allergy conflicts when product contains user's avoided allergen", () => {
      const nutrition = nutAgent.analyzeNutritionFromNutriments({});
      const assessment = evalAgent.evaluate(nutrition, [], "Dairy");

      const report = {
        id: "test-milk-prod",
        productName: "Amul Full Cream Milk",
        brand: "Amul",
        category: "Dairy",
        source: {
          sourceName: "Verified",
          retrievalTimestamp: new Date().toISOString(),
          confidence: 1.0
        },
        isVegetarian: true,
        allergensDeclared: ["Milk and Milk Products"],
        allergensMayContain: [],
        nutritionPer100g: nutrition,
        ingredientsText: "Pasteurized Milk",
        parsedIngredients: [],
        healthAssessment: assessment
      };

      const personalized = recAgent.personalizeReport(report, {
        avoidAllergens: ["Milk", "Peanuts"],
        avoidIngredients: []
      });

      expect(personalized.personalizedAlerts?.hasAllergyConflict).toBe(true);
      expect(personalized.personalizedAlerts?.conflictingAllergens).toContain("Milk");
    });
  });
});
