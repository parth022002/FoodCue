import { describe, it, expect, beforeEach } from "vitest";
import { userCatalogueService } from "../../src/domain/services/userCatalogueService";
import type { IntelligentProductReport } from "../../src/domain/entities/nutritionalProfile";
import { NutritionAnalysisAgent, FoodHealthEvaluationAgent } from "../../src/domain/services/aiNutritionAgents";

describe("User-Specific Product Catalogue Service", () => {
  const nutAgent = new NutritionAnalysisAgent();
  const evalAgent = new FoodHealthEvaluationAgent();
  const dummyNutrition = nutAgent.analyzeNutritionFromNutriments({ "energy-kcal_100g": 100 });
  const dummyAssessment = evalAgent.evaluate(dummyNutrition, [], "Staples");

  const sampleProductA: IntelligentProductReport = {
    id: "sample-prod-a",
    gtin: "8901058852738",
    productName: "Tata Salt",
    brand: "Tata",
    category: "Staples",
    source: { sourceName: "Catalog", retrievalTimestamp: new Date().toISOString(), confidence: 1.0 },
    isVegetarian: true,
    allergensDeclared: [],
    allergensMayContain: [],
    nutritionPer100g: dummyNutrition,
    ingredientsText: "Edible Common Salt",
    parsedIngredients: [],
    healthAssessment: dummyAssessment
  };

  const sampleProductB: IntelligentProductReport = {
    id: "sample-prod-b",
    gtin: "8901719101037",
    productName: "Parle-G Biscuits",
    brand: "Parle",
    category: "Biscuits & Bakery",
    source: { sourceName: "Catalog", retrievalTimestamp: new Date().toISOString(), confidence: 1.0 },
    isVegetarian: true,
    allergensDeclared: ["Wheat", "Milk"],
    allergensMayContain: [],
    nutritionPer100g: dummyNutrition,
    ingredientsText: "Wheat Flour, Sugar",
    parsedIngredients: [],
    healthAssessment: dummyAssessment
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("strictly isolates User A's catalogue from User B's catalogue", async () => {
    const userA = "user_alpha_123";
    const userB = "user_beta_456";

    // User A saves Product A
    await userCatalogueService.saveProduct(userA, sampleProductA);

    // User B saves Product B
    await userCatalogueService.saveProduct(userB, sampleProductB);

    // Verify User A only sees Product A
    const listA = await userCatalogueService.getUserCatalogue(userA);
    expect(listA.length).toBe(1);
    expect(listA[0]?.productName).toBe("Tata Salt");

    // Verify User B only sees Product B
    const listB = await userCatalogueService.getUserCatalogue(userB);
    expect(listB.length).toBe(1);
    expect(listB[0]?.productName).toBe("Parle-G Biscuits");

    // User A cannot see Product B
    const isBSavedForA = await userCatalogueService.isProductSaved(userA, sampleProductB.gtin!);
    expect(isBSavedForA).toBe(false);
  });

  it("protects guest users from permanent storage", async () => {
    const guestItems = await userCatalogueService.getUserCatalogue("guest");
    expect(guestItems).toEqual([]);

    const saveRes = await userCatalogueService.saveProduct("guest", sampleProductA);
    expect(saveRes.success).toBe(false);
    expect(saveRes.error).toContain("Please sign in");
  });

  it("prevents duplicate entries within the same user catalogue", async () => {
    const userId = "user_gamma_789";

    // Save once
    const res1 = await userCatalogueService.saveProduct(userId, sampleProductA);
    expect(res1.success).toBe(true);

    // Attempt save second time
    const res2 = await userCatalogueService.saveProduct(userId, sampleProductA);
    expect(res2.success).toBe(true);
    expect(res2.error).toContain("already in your catalogue");

    const list = await userCatalogueService.getUserCatalogue(userId);
    expect(list.length).toBe(1);
  });

  it("removes a product from user catalogue", async () => {
    const userId = "user_delta_999";
    const saved = await userCatalogueService.saveProduct(userId, sampleProductA);
    expect(saved.item).toBeDefined();

    const removed = await userCatalogueService.removeProduct(userId, saved.item!.id);
    expect(removed).toBe(true);

    const list = await userCatalogueService.getUserCatalogue(userId);
    expect(list.length).toBe(0);
  });
});
