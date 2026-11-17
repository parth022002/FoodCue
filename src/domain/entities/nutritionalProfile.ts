/**
 * FoodCue Nutritional Profile & AI Product Intelligence Types
 * Controlling Baseline: Master Development Prompt - Food Intelligence & Nutrition Scoring
 */

export type DataProvenanceStatus =
  | "verified_pack"       // Physical pack audited or official manufacturer packaging
  | "database_reported"   // OpenFoodFacts / ICMR-NIN verified record
  | "manufacturer_reported" // Manufacturer website or public spec
  | "ai_estimated"        // Calculated from standard food category averages
  | "unavailable";        // Data not reported on packaging or in database (never fabricated!)

export interface NutrientValue {
  value: number | null; // null if unavailable
  unit: "g" | "mg" | "mcg" | "kcal" | "IU";
  provenance: DataProvenanceStatus;
  percentageDailyValue?: number; // based on standard 2000 kcal diet / FSSAI RDA
}

export interface ComprehensiveNutrition {
  // Core Macronutrients & Energy
  energyKcal: NutrientValue;
  totalFat: NutrientValue;
  saturatedFat: NutrientValue;
  transFat: NutrientValue;
  cholesterol: NutrientValue;
  carbohydrates: NutrientValue;
  totalSugars: NutrientValue;
  addedSugars: NutrientValue;
  dietaryFibre: NutrientValue;
  protein: NutrientValue;
  sodium: NutrientValue;
  salt: NutrientValue;

  // Micronutrients & Minerals
  calcium: NutrientValue;
  iron: NutrientValue;
  potassium: NutrientValue;
  vitaminA: NutrientValue;
  vitaminC: NutrientValue;
  vitaminD: NutrientValue;
  vitaminB12: NutrientValue;

  // Serving information
  servingSize?: string;
  servingsPerContainer?: number;
  perServingKcal?: number;
}

export interface SimplifiedIngredient {
  name: string;
  category:
    | "main_ingredient"
    | "added_sugar"
    | "sweetener"
    | "preservative"
    | "artificial_colour"
    | "flavour_enhancer"
    | "emulsifier_stabilizer"
    | "refined_oil_fat"
    | "spice_flavour"
    | "other";
  insNumber?: string;
  simpleExplanation: string; // Plain-English for ages 10 to 70
  potentialAllergen?: string;
  safetyNote?: string; // Balanced, evidence-based context
}

export type HealthCategory =
  | "Excellent"
  | "Good"
  | "Moderate"
  | "Poor"
  | "Very Poor";

export interface FoodHealthAssessment {
  score: number; // 0 to 100
  category: HealthCategory;
  strengths: string[];
  concerns: string[];
  attentionIngredients: string[];
  recommendedFrequency: string; // e.g. "Suitable for daily consumption", "Enjoy in moderation"
  whatThisMeansForYou: string[]; // Simple bullet points for 10-70 year olds
  healthierAlternatives: Array<{
    name: string;
    brand: string;
    reason: string;
    gtin?: string;
  }>;
  dataCompletenessPercentage: number;
}

export interface IntelligentProductReport {
  id: string;
  gtin?: string;
  productName: string;
  brand: string;
  category: string;
  variant?: string;
  packSize?: string;
  imageUrl?: string;
  source: {
    sourceName: string;
    sourceUrl?: string;
    retrievalTimestamp: string;
    confidence: number;
  };
  isVegetarian: boolean | null; // null if unverified
  allergensDeclared: string[];
  allergensMayContain: string[];
  nutritionPer100g: ComprehensiveNutrition;
  ingredientsText: string;
  parsedIngredients: SimplifiedIngredient[];
  healthAssessment: FoodHealthAssessment;
  personalizedAlerts?: {
    hasAllergyConflict: boolean;
    conflictingAllergens: string[];
    dietarySuitability: "suitable" | "unsuitable" | "unknown";
    dietaryNote?: string;
  };
}

export interface UserCatalogueItem {
  id: string;
  userId: string;
  gtin?: string;
  productName: string;
  brand: string;
  category: string;
  imageUrl?: string;
  healthScore: number;
  healthCategory: HealthCategory;
  savedAt: string;
  lastViewedAt?: string;
  productReport: IntelligentProductReport;
}
