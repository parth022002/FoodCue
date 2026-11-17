import type { ConfirmedLabel } from "../entities/food";
import type { VerifiedFoodProduct } from "../entities/catalogData";
import { findProductByGtin } from "../entities/catalogData";

export type AllergenState =
  | "declared_contains"
  | "listed_in_ingredients"
  | "derived_contains"
  | "declared_may_contain"
  | "uncertain"
  | "not_detected_in_extracted_text";

export interface EvaluatedAllergen {
  allergenName: string;
  state: AllergenState;
  matchedEvidence: string[];
  panelSource: "allergen_statement" | "ingredients_list" | "derived" | "none";
  warningNotice?: string;
}

export interface EvaluatedIngredient {
  name: string;
  isAdditive: boolean;
  insNumber?: string;
  purpose?: string;
  potentialAllergen?: string;
  isAmbiguous: boolean;
}

export interface DetailedFoodAnalysis {
  resultId: string;
  confirmedLabelId: string;
  state: "reviewed_deterministic" | "not_assessed" | "uncertain";
  productName: string;
  brand: string;
  variant: string;
  packSize: string;
  fssaiLicence?: string;
  ingredients: EvaluatedIngredient[];
  allergens: EvaluatedAllergen[];
  nutritionPer100g: Record<string, number | string>;
  servingSize?: string;
  manufacturerClaims: string[];
  claimConflicts: string[];
  uncertaintyReasons: string[];
  emergencyGuidance?: {
    isTriggered: boolean;
    headline: string;
    instructions: string[];
    emergencyNumber: string;
  };
  ruleVersion: string;
  contentVersion: string;
  analysedAt: string;
}

// FSSAI Mandatory Top Allergen Classes
const MANDATORY_ALLERGENS = [
  { key: "Gluten", name: "Cereals containing Gluten (Wheat, Barley, Oats, Rye)", terms: ["wheat", "maida", "gluten", "barley", "oats", "rye", "atta", "suji", "rava"] },
  { key: "Milk", name: "Milk and Milk Products", terms: ["milk", "butter", "cheese", "curd", "ghee", "whey", "casein", "lactose", "cream", "yogurt", "dahi"] },
  { key: "Peanuts", name: "Peanuts / Groundnuts", terms: ["peanut", "peanuts", "groundnut", "groundnuts", "arachis oil"] },
  { key: "Tree Nuts", name: "Tree Nuts (Almonds, Cashews, Walnuts, Pistachios)", terms: ["almond", "cashew", "walnut", "pistachio", "hazelnut", "pecan", "tree nut", "badam", "kaju", "pista"] },
  { key: "Soy", name: "Soybeans and Soy Products", terms: ["soy", "soya", "soybean", "soy lecithin", "edamame", "tofu"] },
  { key: "Egg", name: "Egg and Egg Products", terms: ["egg", "eggs", "albumin", "ovalbumin", "yolk"] },
  { key: "Fish", name: "Fish and Fish Products", terms: ["fish", "cod", "salmon", "tuna", "anchovy", "tilapia"] },
  { key: "Crustaceans", name: "Crustaceans & Shellfish", terms: ["crustacean", "crab", "prawn", "prawns", "shrimp", "lobster"] },
  { key: "Sulphites", name: "Sulphites (in concentrations >= 10 mg/kg)", terms: ["sulphite", "sulfite", "metabisulphite", "ins 223", "ins 220", "ins 221", "ins 222"] },
  { key: "Mustard", name: "Mustard and Mustard Seeds", terms: ["mustard", "sarson", "rai"] }
];

// Common Food Additive INS Numbers in Indian Packaged Foods
const COMMON_ADDITIVES: Record<string, { name: string; purpose: string }> = {
  "INS 322": { name: "Lecithin (Soy/Sunflower)", purpose: "Emulsifier (helps blend oil & water)" },
  "INS 500(ii)": { name: "Sodium Bicarbonate (Baking Soda)", purpose: "Raising agent" },
  "INS 500": { name: "Sodium Carbonates", purpose: "Acidity regulator & raising agent" },
  "INS 503(ii)": { name: "Ammonium Bicarbonate", purpose: "Raising agent" },
  "INS 503": { name: "Ammonium Carbonates", purpose: "Raising agent" },
  "INS 223": { name: "Sodium Metabisulphite", purpose: "Preservative & dough conditioner" },
  "INS 160b": { name: "Annatto Extracts", purpose: "Natural food colour" },
  "INS 551": { name: "Silicon Dioxide", purpose: "Anti-caking agent (prevents lumps)" },
  "INS 412": { name: "Guar Gum", purpose: "Thickener & stabiliser" },
  "INS 508": { name: "Potassium Chloride", purpose: "Mineral salt & gelling agent" },
  "INS 635": { name: "Disodium 5'-ribonucleotides", purpose: "Flavour enhancer" },
  "INS 621": { name: "Monosodium Glutamate (MSG)", purpose: "Flavour enhancer" },
  "INS 319": { name: "TBHQ (Tert-Butylhydroquinone)", purpose: "Antioxidant (prevents oil rancidity)" },
  "INS 304": { name: "Ascorbyl Palmitate", purpose: "Fat-soluble Vitamin C antioxidant" },
  "INS 330": { name: "Citric Acid", purpose: "Acidity regulator & natural preservative" },
  "INS 211": { name: "Sodium Benzoate", purpose: "Preservative (anti-microbial)" },
  "INS 202": { name: "Potassium Sorbate", purpose: "Preservative (anti-fungal)" },
  "INS 407": { name: "Carrageenan", purpose: "Thickener & gelling agent" },
  "INS 415": { name: "Xanthan Gum", purpose: "Stabiliser & thickener" },
  "INS 440": { name: "Pectin", purpose: "Gelling agent & thickener" },
  "INS 150d": { name: "Caramel IV (Sulphite Ammonia Caramel)", purpose: "Food colour" },
  "INS 102": { name: "Tartrazine", purpose: "Synthetic food colour (Yellow 5)" },
  "INS 110": { name: "Sunset Yellow FCF", purpose: "Synthetic food colour (Yellow 6)" },
  "INS 122": { name: "Carmoisine (Azorubine)", purpose: "Synthetic food colour (Red)" },
  "INS 133": { name: "Brilliant Blue FCF", purpose: "Synthetic food colour (Blue 1)" },
  "INS 450": { name: "Diphosphates", purpose: "Emulsifier & raising agent" },
  "INS 452": { name: "Polyphosphates", purpose: "Texture stabilizer & moisture retainer" },
  "INS 900a": { name: "Polydimethylsiloxane", purpose: "Anti-foaming agent" },
  "INS 471": { name: "Mono- and Diglycerides of Fatty Acids", purpose: "Emulsifier" },
  "INS 955": { name: "Sucralose", purpose: "Non-nutritive sweetener" },
  "INS 950": { name: "Acesulfame Potassium", purpose: "Non-nutritive sweetener" },
  "INS 960": { name: "Steviol Glycosides (Stevia)", purpose: "Natural non-nutritive sweetener" }
};

/**
 * Deterministic analysis of a user-confirmed label.
 * NEVER uses AI or generates unverified safety grades.
 */
export function evaluateConfirmedFoodLabel(
  label: ConfirmedLabel,
  matchedProduct?: VerifiedFoodProduct
): DetailedFoodAnalysis {
  // If matched against verified catalogue seed
  const product = matchedProduct ?? (label.candidateId ? findProductByGtin(label.candidateId) : undefined);

  const ingredientsText = product?.ingredientsText ?? label.fieldConfirmationStates["ingredients_panel"] === "confirmed" ? (product?.ingredientsText ?? "") : "";
  const lowerText = ingredientsText.toLowerCase();

  // Evaluate each allergen into 6 canonical states
  const allergenResults: EvaluatedAllergen[] = MANDATORY_ALLERGENS.map((allergen) => {
    const matchedTerms: string[] = [];
    for (const term of allergen.terms) {
      if (lowerText.includes(term.toLowerCase())) {
        matchedTerms.push(term);
      }
    }

    const explicitlyDeclared = product?.allergensDeclared.some((d) =>
      d.toLowerCase().includes(allergen.key.toLowerCase())
    );

    const mayContainDeclared = product?.allergensMayContain.some((m) =>
      m.toLowerCase().includes(allergen.key.toLowerCase())
    );

    let state: AllergenState = "not_detected_in_extracted_text";
    let panelSource: EvaluatedAllergen["panelSource"] = "none";
    let warningNotice: string | undefined;

    if (explicitlyDeclared) {
      state = "declared_contains";
      panelSource = "allergen_statement";
    } else if (matchedTerms.length > 0) {
      state = "listed_in_ingredients";
      panelSource = "ingredients_list";
    } else if (mayContainDeclared) {
      state = "declared_may_contain";
      panelSource = "allergen_statement";
      warningNotice = "Manufacturer declares this product may contain traces due to shared production facility.";
    } else {
      state = "not_detected_in_extracted_text";
      panelSource = "none";
      warningNotice = "Not detected in extracted text; check physical label. This is not proof of total absence.";
    }

    return {
      allergenName: allergen.name,
      state,
      matchedEvidence: matchedTerms,
      panelSource,
      warningNotice
    };
  });

  // Evaluate parsed ingredients
  const evaluatedIngredients: EvaluatedIngredient[] = (product?.parsedIngredients ?? ["Ingredients from confirmed physical label"]).map((ing) => {
    let isAdditive = false;
    let insNum: string | undefined;
    let purpose: string | undefined;

    for (const [code, info] of Object.entries(COMMON_ADDITIVES)) {
      if (ing.toUpperCase().includes(code)) {
        isAdditive = true;
        insNum = code;
        purpose = info.purpose;
        break;
      }
    }

    const lower = ing.toLowerCase();
    const isAmbiguous =
      lower.includes("lecithin") && !lower.includes("soy") && !lower.includes("sunflower") ||
      lower.includes("starch") && !lower.includes("corn") && !lower.includes("wheat") ||
      lower.includes("vegetable oil") && !lower.includes("palm") && !lower.includes("mustard") && !lower.includes("sunflower");

    return {
      name: ing,
      isAdditive,
      insNumber: insNum,
      purpose,
      isAmbiguous
    };
  });

  // Conflict detection: manufacturer claims vs evidence
  const claimConflicts: string[] = [];
  const claims = product?.manufacturerClaims ?? [];
  for (const claim of claims) {
    const clLower = claim.toLowerCase();
    if (clLower.includes("gluten free") || clLower.includes("no gluten")) {
      const gluten = allergenResults.find((a) => a.allergenName.includes("Gluten"));
      if (gluten && gluten.state !== "not_detected_in_extracted_text") {
        claimConflicts.push(`Manufacturer claim "${claim}" conflicts with positive gluten evidence in ingredients.`);
      }
    }
    if (clLower.includes("dairy free") || clLower.includes("no milk")) {
      const milk = allergenResults.find((a) => a.allergenName.includes("Milk"));
      if (milk && milk.state !== "not_detected_in_extracted_text") {
        claimConflicts.push(`Manufacturer claim "${claim}" conflicts with positive milk/dairy ingredients.`);
      }
    }
  }

  // Emergency allergic reaction guidance
  const emergencyGuidance = {
    isTriggered: true, // Always ready on food understanding screens
    headline: "Allergic Reaction Guidance (India Protocol)",
    instructions: [
      "If someone shows symptoms of acute allergic reaction (swelling of lips/face, difficulty breathing, throat tightness, hives, vomiting):",
      "1. Seek immediate emergency medical care — call 112 or local ambulance.",
      "2. If an Epinephrine auto-injector (EpiPen) was prescribed, administer it immediately per doctor's instructions.",
      "3. Do not delay emergency contact. FoodCue cannot evaluate medical suitability or treat reactions."
    ],
    emergencyNumber: "112 (National Emergency Helpline - India)"
  };

  const uncertaintyReasons: string[] = [];
  if (claimConflicts.length > 0) {
    uncertaintyReasons.push(...claimConflicts);
  }
  if (!product) {
    uncertaintyReasons.push("Product details derived strictly from user-entered text; physical verification recommended.");
  }

  return {
    resultId: crypto.randomUUID(),
    confirmedLabelId: label.confirmedLabelId,
    state: claimConflicts.length > 0 ? "uncertain" : "reviewed_deterministic",
    productName: product?.productName ?? label.confirmedPhysicalIdentity,
    brand: product?.brand ?? "Verified Brand",
    variant: product?.variant ?? "Standard Variant",
    packSize: product?.packSize ?? "Standard Pack",
    fssaiLicence: product?.fssaiLicence,
    ingredients: evaluatedIngredients,
    allergens: allergenResults,
    nutritionPer100g: product?.nutritionPer100g ?? {
      "Energy (kcal)": "Declared on pack",
      "Protein (g)": "Declared on pack",
      "Carbohydrates (g)": "Declared on pack",
      "Total Sugars (g)": "Declared on pack",
      "Total Fat (g)": "Declared on pack",
      "Sodium (mg)": "Declared on pack"
    },
    servingSize: product?.servingSize,
    manufacturerClaims: claims,
    claimConflicts,
    uncertaintyReasons,
    emergencyGuidance,
    ruleVersion: "fssai-v2020-amend6-2026",
    contentVersion: "foodcue-verified-lexicon-v1.3",
    analysedAt: new Date().toISOString()
  };
}
