import type { Recipe, RecipeMatchResult, MatchedIngredient } from "../entities/recipe";
import type { EnrichedPantryItem } from "../../features/kitchen/Kitchen";

export const CURATED_RECIPES: Recipe[] = [
  {
    id: "rec_dal_tadka",
    name: "Yellow Dal Tadka",
    description: "Comforting spiced yellow lentil curry tempered with cumin, garlic, and ghee. A staple Indian comfort dish.",
    mealCategory: "Dinner",
    cuisine: "North Indian",
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    difficulty: "Easy",
    servings: 4,
    calories: 220,
    dietaryTags: ["Vegetarian", "Gluten-Free"],
    potentialAllergens: ["Dairy"],
    ingredients: [
      { name: "Toor Dal", quantity: 1, unit: "cup" },
      { name: "Tomato", quantity: 2, unit: "pcs" },
      { name: "Onion", quantity: 1, unit: "pcs" },
      { name: "Ghee", quantity: 2, unit: "tbsp" },
      { name: "Turmeric", quantity: 1, unit: "tsp" },
      { name: "Cumin Seeds", quantity: 1, unit: "tsp" },
      { name: "Salt", quantity: 1, unit: "tsp" }
    ],
    instructions: [
      "Pressure cook toor dal with water, turmeric, and salt for 3-4 whistles until soft.",
      "In a pan, heat ghee and add cumin seeds until they sizzle.",
      "Add chopped onion and cook until golden brown, then add chopped tomatoes until softened.",
      "Pour the tempering (tadka) over the cooked dal and simmer for 5 minutes.",
      "Garnish with fresh coriander and serve hot with steamed rice or roti."
    ]
  },
  {
    id: "rec_paneer_bhurji",
    name: "Spiced Paneer Bhurji",
    description: "Quick, protein-rich scrambled cottage cheese cooked with onions, tomatoes, and aromatic Indian spices.",
    mealCategory: "Quick Meal",
    cuisine: "Indian",
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    difficulty: "Easy",
    servings: 2,
    calories: 310,
    dietaryTags: ["Vegetarian", "Gluten-Free", "Keto"],
    potentialAllergens: ["Dairy"],
    ingredients: [
      { name: "Paneer", quantity: 200, unit: "g" },
      { name: "Onion", quantity: 1, unit: "pcs" },
      { name: "Tomato", quantity: 1, unit: "pcs" },
      { name: "Green Chilli", quantity: 1, unit: "pcs" },
      { name: "Turmeric", quantity: 0.5, unit: "tsp" },
      { name: "Garam Masala", quantity: 0.5, unit: "tsp" },
      { name: "Cooking Oil", quantity: 1, unit: "tbsp" }
    ],
    instructions: [
      "Crumble fresh paneer by hand into small uneven curds.",
      "Heat oil in a skillet, sauté finely chopped onions and green chillies until translucent.",
      "Add chopped tomatoes, turmeric, and garam masala, cooking until oil separates.",
      "Fold in the crumbled paneer gently and toss on medium heat for 2-3 minutes. Do not overcook.",
      "Serve warm with toasted whole wheat bread or parathas."
    ]
  },
  {
    id: "rec_masala_khichdi",
    name: "Wholesome Moong Dal Khichdi",
    description: "Nourishing, easily digestible one-pot meal of rice and split moong lentils tempered with mild spices.",
    mealCategory: "Dinner",
    cuisine: "Indian",
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    difficulty: "Easy",
    servings: 3,
    calories: 260,
    dietaryTags: ["Vegetarian", "Gluten-Free", "Jain"],
    potentialAllergens: ["Dairy"],
    ingredients: [
      { name: "Rice", quantity: 1, unit: "cup" },
      { name: "Moong Dal", quantity: 0.5, unit: "cup" },
      { name: "Ghee", quantity: 1.5, unit: "tbsp" },
      { name: "Cumin Seeds", quantity: 1, unit: "tsp" },
      { name: "Turmeric", quantity: 0.5, unit: "tsp" },
      { name: "Salt", quantity: 1, unit: "tsp" }
    ],
    instructions: [
      "Wash rice and moong dal together and soak in water for 15 minutes.",
      "Heat ghee in a pressure cooker and splutter cumin seeds.",
      "Add drained rice and dal, add turmeric and salt, and sauté for 1 minute.",
      "Add 4 cups of water, cover, and pressure cook for 4 whistles on medium heat.",
      "Serve hot with a spoonful of fresh ghee and curd or pickle."
    ]
  },
  {
    id: "rec_masala_oats",
    name: "Savory Vegetable Masala Oats",
    description: "Hearty, high-fiber breakfast oats simmered with mixed vegetables and aromatic spices.",
    mealCategory: "Breakfast",
    cuisine: "Fusion Indian",
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    difficulty: "Easy",
    servings: 2,
    calories: 190,
    dietaryTags: ["Vegetarian", "Vegan"],
    potentialAllergens: ["Gluten"],
    ingredients: [
      { name: "Rolled Oats", quantity: 1, unit: "cup" },
      { name: "Carrot", quantity: 1, unit: "pcs" },
      { name: "Green Peas", quantity: 0.25, unit: "cup" },
      { name: "Onion", quantity: 1, unit: "pcs" },
      { name: "Cooking Oil", quantity: 1, unit: "tsp" },
      { name: "Turmeric", quantity: 0.5, unit: "tsp" }
    ],
    instructions: [
      "Heat oil in a pan, add chopped onions, carrots, and green peas.",
      "Sauté vegetables for 3 minutes until tender-crisp.",
      "Add 2.5 cups of water, salt, and turmeric, bringing to a rolling boil.",
      "Stir in rolled oats and cook for 3 to 4 minutes until thick and porridge-like.",
      "Serve warm as an energizing, fiber-rich morning meal."
    ]
  },
  {
    id: "rec_aloo_gobi",
    name: "Classic Aloo Gobi Matar",
    description: "Homestyle dry vegetable curry made with potatoes, cauliflower florets, and green peas.",
    mealCategory: "Lunch",
    cuisine: "North Indian",
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    difficulty: "Medium",
    servings: 4,
    calories: 210,
    dietaryTags: ["Vegetarian", "Vegan", "Gluten-Free"],
    potentialAllergens: [],
    ingredients: [
      { name: "Potato", quantity: 2, unit: "pcs" },
      { name: "Cauliflower", quantity: 1, unit: "pcs" },
      { name: "Green Peas", quantity: 0.5, unit: "cup" },
      { name: "Tomato", quantity: 2, unit: "pcs" },
      { name: "Cumin Seeds", quantity: 1, unit: "tsp" },
      { name: "Turmeric", quantity: 0.5, unit: "tsp" },
      { name: "Cooking Oil", quantity: 2, unit: "tbsp" }
    ],
    instructions: [
      "Cut potatoes into cubes and cauliflower into medium florets.",
      "Heat oil, crackle cumin seeds, then add potatoes and cauliflower.",
      "Cover and cook on low heat for 10 minutes until half-done.",
      "Add green peas, chopped tomatoes, turmeric, and salt.",
      "Cover and simmer for another 8-10 minutes until tender. Serve with chapati."
    ]
  },
  {
    id: "rec_curd_rice",
    name: "South Indian Curd Rice (Thayir Sadam)",
    description: "Cooling, probiotic-rich tempered yogurt rice finished with mustard seeds, curry leaves, and ginger.",
    mealCategory: "Lunch",
    cuisine: "South Indian",
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    difficulty: "Easy",
    servings: 2,
    calories: 240,
    dietaryTags: ["Vegetarian", "Gluten-Free"],
    potentialAllergens: ["Dairy"],
    ingredients: [
      { name: "Cooked Rice", quantity: 1.5, unit: "cup" },
      { name: "Curd", quantity: 1, unit: "cup" },
      { name: "Milk", quantity: 0.25, unit: "cup" },
      { name: "Mustard Seeds", quantity: 0.5, unit: "tsp" },
      { name: "Cooking Oil", quantity: 1, unit: "tsp" },
      { name: "Salt", quantity: 0.5, unit: "tsp" }
    ],
    instructions: [
      "Mash soft cooked rice slightly with a fork or potato masher.",
      "Mix in fresh curd, a splash of milk, and salt until creamy.",
      "In a small tadka pan, heat oil and crackle mustard seeds.",
      "Pour the tempering into the rice mixture and fold thoroughly.",
      "Serve chilled or at room temperature."
    ]
  },
  {
    id: "rec_chickpea_salad",
    name: "Protein-Packed Chickpea Salad",
    description: "Refreshing salad with boiled chickpeas, diced cucumbers, tomatoes, and tangy lemon dressing.",
    mealCategory: "Quick Meal",
    cuisine: "Mediterranean / Indian",
    prepTimeMinutes: 10,
    cookTimeMinutes: 0,
    difficulty: "Easy",
    servings: 2,
    calories: 220,
    dietaryTags: ["Vegetarian", "Vegan", "Gluten-Free"],
    potentialAllergens: [],
    ingredients: [
      { name: "Chickpeas", quantity: 1, unit: "cup" },
      { name: "Cucumber", quantity: 1, unit: "pcs" },
      { name: "Tomato", quantity: 1, unit: "pcs" },
      { name: "Onion", quantity: 0.5, unit: "pcs" },
      { name: "Lemon", quantity: 1, unit: "pcs" },
      { name: "Olive Oil", quantity: 1, unit: "tbsp" },
      { name: "Salt", quantity: 0.5, unit: "tsp" }
    ],
    instructions: [
      "Drain and rinse boiled chickpeas and place in a mixing bowl.",
      "Dice cucumber, tomato, and red onion into uniform bite-sized pieces.",
      "Toss diced vegetables with chickpeas.",
      "Drizzle extra virgin olive oil and squeeze fresh lemon juice over the top.",
      "Season with salt and crushed black pepper, mix well, and serve chilled."
    ]
  }
];

function isFuzzyIngredientMatch(recipeIngName: string, pantryItemName: string): boolean {
  const normRecipe = recipeIngName.toLowerCase().trim();
  const normPantry = pantryItemName.toLowerCase().trim();

  if (normPantry.includes(normRecipe) || normRecipe.includes(normPantry)) {
    return true;
  }

  // Common Indian ingredient synonyms
  const synonyms: Record<string, string[]> = {
    "toor dal": ["arhar dal", "tuvar dal", "yellow dal", "lentil"],
    "moong dal": ["mung dal", "split moong", "yellow moong"],
    "paneer": ["cottage cheese", "amul paneer"],
    "curd": ["dahi", "yogurt", "yoghurt"],
    "ghee": ["clarified butter", "cow ghee", "desi ghee"],
    "rice": ["basmati", "kolam", "sona masoori", "chawal"],
    "cooking oil": ["sunflower oil", "mustard oil", "groundnut oil", "vegetable oil", "oil"],
    "chickpeas": ["chana", "kabuli chana", "garbanzo"]
  };

  for (const [key, aliases] of Object.entries(synonyms)) {
    if (normRecipe.includes(key)) {
      if (aliases.some((a) => normPantry.includes(a))) return true;
    }
    if (aliases.some((a) => normRecipe.includes(a))) {
      if (normPantry.includes(key)) return true;
    }
  }

  return false;
}

export function matchRecipesWithPantry(
  recipes: Recipe[],
  pantryItems: EnrichedPantryItem[],
  userAllergies: string[] = [],
  userDietary: string[] = []
): RecipeMatchResult[] {
  const normalizedUserAllergies = userAllergies.map((a) => a.toLowerCase().trim());
  const normalizedUserDietary = userDietary.map((d) => d.toLowerCase().trim());

  const results: RecipeMatchResult[] = [];

  for (const recipe of recipes) {
    // 1. Check for allergen conflict
    const conflictingAllergens = recipe.potentialAllergens.filter((allergen) =>
      normalizedUserAllergies.some((userAllergy) =>
        userAllergy.length > 0 && (allergen.toLowerCase().includes(userAllergy) || userAllergy.includes(allergen.toLowerCase()))
      )
    );

    const containsAllergenConflict = conflictingAllergens.length > 0;

    // 2. Check for dietary preference matching (if user is Vegan, exclude non-Vegan)
    if (normalizedUserDietary.includes("vegan") && !recipe.dietaryTags.includes("Vegan")) {
      continue;
    }
    if (normalizedUserDietary.includes("vegetarian") && !recipe.dietaryTags.includes("Vegetarian")) {
      continue;
    }
    if (normalizedUserDietary.includes("jain") && !recipe.dietaryTags.includes("Jain")) {
      continue;
    }

    // 3. Match ingredients against current pantry stock
    const availableIngredients: MatchedIngredient[] = [];
    const missingIngredients: MatchedIngredient[] = [];
    const expiringIngredientsNames: string[] = [];

    for (const ing of recipe.ingredients) {
      const matchingPantryItem = pantryItems.find((p) =>
        isFuzzyIngredientMatch(ing.name, p.displayName)
      );

      if (matchingPantryItem && matchingPantryItem.quantity > 0) {
        const isExpiringSoon = matchingPantryItem.daysRemaining <= 3 && matchingPantryItem.daysRemaining >= 0;
        const isExpired = matchingPantryItem.daysRemaining < 0;

        if (isExpiringSoon) {
          expiringIngredientsNames.push(matchingPantryItem.displayName);
        }

        availableIngredients.push({
          name: ing.name,
          requiredQty: ing.quantity,
          unit: ing.unit,
          isAvailable: true,
          pantryItemId: matchingPantryItem.itemId,
          daysRemaining: matchingPantryItem.daysRemaining,
          isExpiringSoon,
          isExpired
        });
      } else {
        missingIngredients.push({
          name: ing.name,
          requiredQty: ing.quantity,
          unit: ing.unit,
          isAvailable: false
        });
      }
    }

    const totalIngredients = recipe.ingredients.length;
    const matchScore = totalIngredients > 0
      ? Math.round((availableIngredients.length / totalIngredients) * 100)
      : 0;

    results.push({
      recipe,
      matchScore,
      availableIngredients,
      missingIngredients,
      usesExpiringIngredients: expiringIngredientsNames.length > 0,
      expiringIngredientsNames,
      containsAllergenConflict,
      conflictingAllergens
    });
  }

  // Sort results:
  // 1. Recipes without allergen conflict first
  // 2. Recipes using ingredients nearing expiry (waste reduction priority!)
  // 3. Recipes with highest matchScore
  return results.sort((a, b) => {
    if (a.containsAllergenConflict !== b.containsAllergenConflict) {
      return a.containsAllergenConflict ? 1 : -1;
    }
    if (a.usesExpiringIngredients !== b.usesExpiringIngredients) {
      return a.usesExpiringIngredients ? -1 : 1;
    }
    return b.matchScore - a.matchScore;
  });
}
