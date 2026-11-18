export type RecipeDifficulty = "Easy" | "Medium" | "Advanced";
export type RecipeMealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snacks" | "Quick Meal";

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  isOptional?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  mealCategory: RecipeMealCategory;
  cuisine: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: RecipeDifficulty;
  servings: number;
  calories?: number;
  dietaryTags: string[]; // e.g. "Vegetarian", "Vegan", "Jain", "Gluten-Free"
  potentialAllergens: string[]; // e.g. "Dairy", "Gluten", "Nuts", "Peanuts", "Soy"
  ingredients: RecipeIngredient[];
  instructions: string[];
}

export interface MatchedIngredient {
  name: string;
  requiredQty: number;
  unit: string;
  isAvailable: boolean;
  pantryItemId?: string;
  daysRemaining?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
}

export interface RecipeMatchResult {
  recipe: Recipe;
  matchScore: number; // 0 to 100 percentage
  availableIngredients: MatchedIngredient[];
  missingIngredients: MatchedIngredient[];
  usesExpiringIngredients: boolean;
  expiringIngredientsNames: string[];
  containsAllergenConflict: boolean;
  conflictingAllergens: string[];
}
