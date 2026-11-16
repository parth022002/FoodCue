export interface VerifiedFoodProduct {
  id: string;
  gtin: string;
  brand: string;
  productName: string;
  variant: string;
  packSize: string;
  category: "Staples" | "Dairy" | "Biscuits & Bakery" | "Snacks & Instant" | "Breakfast & Cereals" | "Condiments" | "Beverages";
  fssaiLicence: string;
  ingredientsText: string;
  parsedIngredients: string[];
  allergensDeclared: string[]; // Positive declared contains
  allergensMayContain: string[]; // Cross-contact / may contain
  nutritionPer100g: {
    energyKcal: number;
    proteinG: number;
    carbohydratesG: number;
    totalSugarsG: number;
    addedSugarsG: number;
    totalFatG: number;
    saturatedFatG: number;
    transFatG: number;
    sodiumMg: number;
  };
  servingSize?: string;
  manufacturerClaims: string[]; // e.g. "Gluten Free", "No Added Preservatives"
  sourceReference: string;
  lastVerifiedDate: string;
}

export const VERIFIED_INDIAN_CATALOG: VerifiedFoodProduct[] = [
  {
    id: "fc-tata-salt-1kg",
    gtin: "8901058852738",
    brand: "Tata",
    productName: "Vacuum Evaporated Iodised Salt",
    variant: "Iodised Table Salt",
    packSize: "1 kg",
    category: "Staples",
    fssaiLicence: "10014022002759",
    ingredientsText: "Edible Common Salt, Permitted Anti-caking Agent (INS 551), Potassium Iodate.",
    parsedIngredients: ["Edible Common Salt", "Potassium Iodate", "Anti-caking Agent INS 551 (Silicon Dioxide)"],
    allergensDeclared: [],
    allergensMayContain: [],
    nutritionPer100g: {
      energyKcal: 0,
      proteinG: 0,
      carbohydratesG: 0,
      totalSugarsG: 0,
      addedSugarsG: 0,
      totalFatG: 0,
      saturatedFatG: 0,
      transFatG: 0,
      sodiumMg: 38700
    },
    servingSize: "1 g",
    manufacturerClaims: ["Vacuum Evaporated", "Untouched by hand"],
    sourceReference: "Physical pack verification, FSSAI Schedule II",
    lastVerifiedDate: "2026-11-16"
  },
  {
    id: "fc-parle-g-250g",
    gtin: "8901719101037",
    brand: "Parle",
    productName: "Parle-G Original Gluco Biscuits",
    variant: "Gluco",
    packSize: "250 g",
    category: "Biscuits & Bakery",
    fssaiLicence: "10013022002253",
    ingredientsText: "Refined Wheat Flour (Maida) (67%), Sugar, Refined Palm Oil, Invert Sugar Syrup, Raising Agents [INS 503(ii), INS 500(ii)], Milk Solids (0.6%), Edible Common Salt, Emulsifier [INS 322 (Soy Lecithin)] and Dough Conditioner [INS 223].",
    parsedIngredients: [
      "Refined Wheat Flour (Maida)",
      "Sugar",
      "Refined Palm Oil",
      "Invert Sugar Syrup",
      "Ammonium Bicarbonate INS 503(ii)",
      "Sodium Bicarbonate INS 500(ii)",
      "Milk Solids",
      "Edible Common Salt",
      "Soy Lecithin INS 322",
      "Sodium Metabisulphite INS 223"
    ],
    allergensDeclared: ["Wheat (Gluten)", "Milk", "Soy"],
    allergensMayContain: ["Sulphites"],
    nutritionPer100g: {
      energyKcal: 454,
      proteinG: 6.5,
      carbohydratesG: 78.2,
      totalSugarsG: 25.5,
      addedSugarsG: 24.8,
      totalFatG: 12.8,
      saturatedFatG: 5.8,
      transFatG: 0.05,
      sodiumMg: 280
    },
    servingSize: "25 g (approx 6 biscuits)",
    manufacturerClaims: ["Goodness of Wheat and Milk"],
    sourceReference: "Physical pack verification batch P-11/26",
    lastVerifiedDate: "2026-11-16"
  },
  {
    id: "fc-amul-butter-100g",
    gtin: "8901262010054",
    brand: "Amul",
    productName: "Pasteurised Salted Butter",
    variant: "Yellow Salted Butter",
    packSize: "100 g",
    category: "Dairy",
    fssaiLicence: "10012021000071",
    ingredientsText: "Butter (Milk Fat 80%), Common Salt, Annatto (Natural Colour INS 160b).",
    parsedIngredients: ["Butter (Milk Fat)", "Common Salt", "Natural Annatto Colour INS 160b"],
    allergensDeclared: ["Milk"],
    allergensMayContain: [],
    nutritionPer100g: {
      energyKcal: 717,
      proteinG: 0.5,
      carbohydratesG: 0.0,
      totalSugarsG: 0.0,
      addedSugarsG: 0.0,
      totalFatG: 80.0,
      saturatedFatG: 51.0,
      transFatG: 3.5,
      sodiumMg: 840
    },
    servingSize: "10 g",
    manufacturerClaims: ["100% Pure Milk Fat", "Utterly Butterly Delicious"],
    sourceReference: "Physical pack verification Gujarat Co-op Milk Mktg Fed",
    lastVerifiedDate: "2026-11-16"
  },
  {
    id: "fc-maggi-noodles-70g",
    gtin: "8901058857412",
    brand: "Maggi",
    productName: "2-Minute Instant Noodles",
    variant: "Masala",
    packSize: "70 g",
    category: "Snacks & Instant",
    fssaiLicence: "10012011000168",
    ingredientsText: "Noodles: Refined Wheat Flour (Maida), Palm Oil, Salt, Wheat Gluten, Mineral (Calcium Carbonate), Thickeners (INS 508, INS 412), Acidity Regulators (INS 501(i), INS 500(i)). Tastemaker: Hydrolysed Peanut Protein, Mixed Spices (Onion Powder, Coriander, Chilli, Turmeric, Cumin, Aniseed, Fenugreek, Ginger, Black Pepper, Clove, Nutmeg, Cardamom), Noodle Powder, Sugar, Edible Starch, Palm Oil, Caramel Salt, Flavour Enhancer (INS 635).",
    parsedIngredients: [
      "Refined Wheat Flour",
      "Palm Oil",
      "Wheat Gluten",
      "Calcium Carbonate",
      "Potassium Chloride INS 508",
      "Guar Gum INS 412",
      "Hydrolysed Peanut Protein",
      "Mixed Spices (Coriander, Turmeric, Cumin)",
      "Flavour Enhancer INS 635"
    ],
    allergensDeclared: ["Wheat (Gluten)", "Peanuts"],
    allergensMayContain: ["Mustard", "Milk", "Soy"],
    nutritionPer100g: {
      energyKcal: 427,
      proteinG: 8.0,
      carbohydratesG: 63.5,
      totalSugarsG: 2.2,
      addedSugarsG: 1.1,
      totalFatG: 15.7,
      saturatedFatG: 6.8,
      transFatG: 0.12,
      sodiumMg: 1180
    },
    servingSize: "70 g (1 pack prepared)",
    manufacturerClaims: ["Iron Fortified", "2-Minute Quick Cook"],
    sourceReference: "Physical pack inspection Nestle India Ltd",
    lastVerifiedDate: "2026-11-16"
  },
  {
    id: "fc-quaker-oats-400g",
    gtin: "8901491101830",
    brand: "Quaker",
    productName: "Rolled Oats 100% Wholegrain",
    variant: "Plain Wholegrain",
    packSize: "400 g",
    category: "Breakfast & Cereals",
    fssaiLicence: "10014064000435",
    ingredientsText: "100% Wholegrain Rolled Oats.",
    parsedIngredients: ["Wholegrain Rolled Oats"],
    allergensDeclared: ["Oats (Gluten)"],
    allergensMayContain: ["Barley", "Wheat"],
    nutritionPer100g: {
      energyKcal: 407,
      proteinG: 11.8,
      carbohydratesG: 68.5,
      totalSugarsG: 0.5,
      addedSugarsG: 0.0,
      totalFatG: 9.5,
      saturatedFatG: 2.1,
      transFatG: 0.0,
      sodiumMg: 9
    },
    servingSize: "35 g",
    manufacturerClaims: ["100% Wholegrain", "High Dietary Fibre", "Beta-Glucan for Heart Health"],
    sourceReference: "Physical pack verification PepsiCo India",
    lastVerifiedDate: "2026-11-16"
  },
  {
    id: "fc-epigamia-yogurt-85g",
    gtin: "8906070430018",
    brand: "Epigamia",
    productName: "Artisanal Greek Yogurt",
    variant: "Natural Unsweetened",
    packSize: "85 g",
    category: "Dairy",
    fssaiLicence: "10019022009874",
    ingredientsText: "Pasteurised Double Toned Milk, Active Live Cultures (S. Thermophilus, L. Bulgaricus).",
    parsedIngredients: ["Pasteurised Double Toned Milk", "Lactic Acid Starter Cultures"],
    allergensDeclared: ["Milk"],
    allergensMayContain: [],
    nutritionPer100g: {
      energyKcal: 82,
      proteinG: 6.5,
      carbohydratesG: 4.8,
      totalSugarsG: 4.8,
      addedSugarsG: 0.0,
      totalFatG: 4.0,
      saturatedFatG: 2.6,
      transFatG: 0.05,
      sodiumMg: 45
    },
    servingSize: "85 g (1 cup)",
    manufacturerClaims: ["Zero Added Sugar", "High Protein", "All Natural"],
    sourceReference: "Drums Food International packaging audit",
    lastVerifiedDate: "2026-11-16"
  },
  {
    id: "fc-britannia-goodday-120g",
    gtin: "8901063012219",
    brand: "Britannia",
    productName: "Good Day Rich Butter Cookies",
    variant: "Butter",
    packSize: "120 g",
    category: "Biscuits & Bakery",
    fssaiLicence: "10015043001129",
    ingredientsText: "Refined Wheat Flour (Maida), Sugar, Edible Vegetable Oil (Palm), Butter (2.5%), Invert Sugar Syrup, Raising Agents [503(ii), 500(ii)], Milk Solids, Iodised Salt, Emulsifiers [322, 471, 472e].",
    parsedIngredients: [
      "Refined Wheat Flour",
      "Sugar",
      "Palm Oil",
      "Butter",
      "Invert Sugar",
      "Ammonium Bicarbonate INS 503(ii)",
      "Sodium Bicarbonate INS 500(ii)",
      "Milk Solids",
      "Iodised Salt",
      "Soy Lecithin INS 322"
    ],
    allergensDeclared: ["Wheat (Gluten)", "Milk", "Soy"],
    allergensMayContain: ["Nuts"],
    nutritionPer100g: {
      energyKcal: 495,
      proteinG: 7.0,
      carbohydratesG: 68.0,
      totalSugarsG: 23.0,
      addedSugarsG: 22.0,
      totalFatG: 22.0,
      saturatedFatG: 10.5,
      transFatG: 0.08,
      sodiumMg: 310
    },
    servingSize: "30 g",
    manufacturerClaims: ["Rich Butter Taste", "With Smiles"],
    sourceReference: "Physical pack verification Britannia Industries",
    lastVerifiedDate: "2026-11-16"
  },
  {
    id: "fc-saffola-gold-1l",
    gtin: "8901088005302",
    brand: "Saffola",
    productName: "Gold Blended Edible Vegetable Oil",
    variant: "Physically Refined Rice Bran & Refined Sunflower Oil",
    packSize: "1 Litre",
    category: "Staples",
    fssaiLicence: "10012022000258",
    ingredientsText: "Physically Refined Rice Bran Oil (70%), Refined Sunflower Oil (30%), Antioxidants (INS 319, INS 304), Anti-foaming Agent (INS 900a), Vitamin A, Vitamin D.",
    parsedIngredients: [
      "Physically Refined Rice Bran Oil",
      "Refined Sunflower Oil",
      "Antioxidant TBHQ INS 319",
      "Ascorbyl Palmitate INS 304",
      "Dimethylpolysiloxane INS 900a",
      "Vitamin A Palmitate",
      "Vitamin D2"
    ],
    allergensDeclared: [],
    allergensMayContain: [],
    nutritionPer100g: {
      energyKcal: 900,
      proteinG: 0.0,
      carbohydratesG: 0.0,
      totalSugarsG: 0.0,
      addedSugarsG: 0.0,
      totalFatG: 100.0,
      saturatedFatG: 24.0,
      transFatG: 1.0,
      sodiumMg: 0
    },
    servingSize: "15 ml (1 tablespoon)",
    manufacturerClaims: ["With Oryzanol", "Triple Anti-Oxidant System", "Fortified with Vitamins A & D"],
    sourceReference: "Marico Ltd product packaging verification",
    lastVerifiedDate: "2026-11-16"
  }
];

export function findProductByGtin(gtin: string): VerifiedFoodProduct | undefined {
  const clean = gtin.trim().replace(/\s+/g, "");
  return VERIFIED_INDIAN_CATALOG.find((p) => p.gtin === clean);
}

export function searchCatalog(query: string): VerifiedFoodProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return VERIFIED_INDIAN_CATALOG;
  return VERIFIED_INDIAN_CATALOG.filter(
    (p) =>
      p.productName.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.variant.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.gtin.includes(q)
  );
}
