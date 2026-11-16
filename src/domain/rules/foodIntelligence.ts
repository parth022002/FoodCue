import type { ConfirmedLabel, FoodAnalysisResult } from "../entities/food";
import { isConfirmedLabel } from "../contracts/confirmedLabel";

/**
 * Safe placeholder until reviewed, licensed and versioned content/rules are approved.
 * Never replace this with guessed allergen or nutrition logic.
 */
export function analyseConfirmedLabel(label: ConfirmedLabel): FoodAnalysisResult {
  if (!isConfirmedLabel(label)) {
    throw new Error("Food analysis requires a valid ConfirmedLabel.");
  }
  return {
    resultId: crypto.randomUUID(),
    confirmedLabelId: label.confirmedLabelId,
    state: "not_assessed",
    ingredientObservations: [],
    allergenResults: [],
    nutritionValues: [],
    dataCompleteness: "incomplete",
    uncertaintyReasons: [
      "No reviewed food-content rule pack is installed in this development starter.",
      "No verified ingredient, allergen or nutrition panel data has been supplied."
    ],
    sourceReferences: [],
    ruleVersion: "rules-not-approved",
    contentVersion: "content-not-approved",
    analysedAt: new Date().toISOString()
  };
}
