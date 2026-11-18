import { describe, it, expect, beforeEach } from "vitest";
import { CURATED_RECIPES, matchRecipesWithPantry } from "../../src/domain/services/recipeEngine";
import type { EnrichedPantryItem } from "../../src/features/kitchen/Kitchen";
import { shoppingStorage } from "../../src/adapters/storage/shoppingStorage";

describe("Phase 8: Recipe & Meal Suggestions Engine", () => {
  beforeEach(async () => {
    localStorage.clear();
  });

  it("contains curated authentic everyday recipes", () => {
    expect(CURATED_RECIPES.length).toBeGreaterThanOrEqual(5);
    const names = CURATED_RECIPES.map((r) => r.name);
    expect(names).toContain("Yellow Dal Tadka");
    expect(names).toContain("Spiced Paneer Bhurji");
    expect(names).toContain("Wholesome Moong Dal Khichdi");
  });

  it("matches pantry items using fuzzy synonyms (e.g. Toor Dal, Paneer)", () => {
    const mockPantry: EnrichedPantryItem[] = [
      {
        itemId: "Toor Dal (1kg)",
        displayName: "Tata Sampann Toor Dal",
        quantity: 1,
        unit: "pack",
        location: "Pantry",
        dateType: "expiry",
        dateValue: "2027-01-01",
        daysRemaining: 180,
        isOpened: false
      },
      {
        itemId: "Amul Fresh Paneer",
        displayName: "Amul Malai Paneer (200g)",
        quantity: 1,
        unit: "pack",
        location: "Fridge",
        dateType: "expiry",
        dateValue: "2027-01-01",
        daysRemaining: 10,
        isOpened: false
      }
    ];

    const results = matchRecipesWithPantry(CURATED_RECIPES, mockPantry);
    const paneerBhurji = results.find((r) => r.recipe.name === "Spiced Paneer Bhurji");

    expect(paneerBhurji).toBeDefined();
    expect(paneerBhurji!.availableIngredients.some((i) => i.name === "Paneer")).toBe(true);
    expect(paneerBhurji!.matchScore).toBeGreaterThan(0);
  });

  it("prioritizes recipes that use expiring ingredients (waste reduction priority)", () => {
    const mockPantry: EnrichedPantryItem[] = [
      {
        itemId: "fresh-paneer",
        displayName: "Fresh Paneer",
        quantity: 1,
        unit: "pack",
        location: "Fridge",
        dateType: "expiry",
        dateValue: "2026-11-20",
        daysRemaining: 2, // expiring in 2 days!
        isOpened: false
      },
      {
        itemId: "staple-rice",
        displayName: "Basmati Rice",
        quantity: 5,
        unit: "kg",
        location: "Pantry",
        dateType: "expiry",
        dateValue: "2027-11-20",
        daysRemaining: 365,
        isOpened: false
      }
    ];

    const results = matchRecipesWithPantry(CURATED_RECIPES, mockPantry);

    // The top recipe should be one that utilizes the expiring item (Paneer)
    expect(results[0].usesExpiringIngredients).toBe(true);
    expect(results[0].expiringIngredientsNames).toContain("Fresh Paneer");
  });

  it("flags recipes containing allergens declared by the user", () => {
    const mockPantry: EnrichedPantryItem[] = [];
    const userAllergies = ["Dairy"];

    const results = matchRecipesWithPantry(CURATED_RECIPES, mockPantry, userAllergies);

    const dalTadka = results.find((r) => r.recipe.name === "Yellow Dal Tadka");
    const alooGobi = results.find((r) => r.recipe.name === "Classic Aloo Gobi Matar");

    // Dal Tadka contains Ghee (Dairy allergen)
    expect(dalTadka?.containsAllergenConflict).toBe(true);
    expect(dalTadka?.conflictingAllergens).toContain("Dairy");

    // Aloo Gobi is dairy-free
    expect(alooGobi?.containsAllergenConflict).toBe(false);
  });

  it("filters recipes according to dietary pattern (e.g. Vegan)", () => {
    const mockPantry: EnrichedPantryItem[] = [];
    const results = matchRecipesWithPantry(CURATED_RECIPES, mockPantry, [], ["Vegan"]);

    // Must not contain recipes that are not vegan
    for (const r of results) {
      expect(r.recipe.dietaryTags).toContain("Vegan");
    }
  });

  it("integrates with shopping list to add missing ingredients", async () => {
    const mockPantry: EnrichedPantryItem[] = [];
    const results = matchRecipesWithPantry(CURATED_RECIPES, mockPantry);
    const target = results[0];

    const initialItems = await shoppingStorage.loadItems();
    const initialCount = initialItems.length;

    for (const ing of target.missingIngredients.slice(0, 2)) {
      await shoppingStorage.addItem({
        name: ing.name,
        quantity: ing.requiredQty,
        unit: ing.unit,
        category: "Groceries",
        isBought: false
      });
    }

    const updated = await shoppingStorage.loadItems();
    expect(updated).toHaveLength(initialCount + 2);
    expect(updated[0].isBought).toBe(false);
  });
});
