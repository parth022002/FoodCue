export type SupportedLanguage = "en" | "hi" | "mr" | "ta" | "te";

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
];

export interface TranslationDictionary {
  nav: {
    home: string;
    kitchen: string;
    scan: string;
    shopping: string;
    explore: string;
    recipes: string;
    receipts: string;
    reminders: string;
    profile: string;
    household: string;
    invite: string;
    signIn: string;
    signUp: string;
    signOut: string;
  };
  hero: {
    badge: string;
    headlinePart1: string;
    headlinePart2: string;
    description: string;
    getStarted: string;
    signIn: string;
    trustPrivate: string;
    trustZeroCamera: string;
    trustEveryday: string;
  };
  kitchen: {
    title: string;
    subtitle: string;
    filterAll: string;
    filterPantry: string;
    filterFridge: string;
    filterFreezer: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDesc: string;
    statusFresh: string;
    statusExpiringSoon: string;
    statusExpired: string;
    addItem: string;
    whatCanICook: string;
  };
  recipes: {
    title: string;
    subtitle: string;
    allRecipes: string;
    expiringAlert: string;
    expiringPriorityBadge: string;
    matchPercentage: string;
    availableIngredients: string;
    missingIngredients: string;
    addMissingToShopping: string;
    addedToShoppingSuccess: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    difficulty: string;
    difficultyEasy: string;
    difficultyMedium: string;
    difficultyHard: string;
    instructions: string;
    ingredientsList: string;
    allergenWarning: string;
    medicalDisclaimer: string;
    noRecipesFound: string;
  };
  receipts: {
    title: string;
    subtitle: string;
    uploadBill: string;
    takePhoto: string;
    uploadInstructions: string;
    reviewTitle: string;
    reviewSubtitle: string;
    storeName: string;
    purchaseDate: string;
    itemsCount: string;
    grandTotal: string;
    colItem: string;
    colQty: string;
    colPrice: string;
    colLocation: string;
    colAction: string;
    confirmAndAdd: string;
    cancelReview: string;
    zeroRetentionGuarantee: string;
    processingBill: string;
    successMessage: string;
  };
  profile: {
    title: string;
    subtitle: string;
    personalInfo: string;
    dietaryPreferences: string;
    allergies: string;
    foodPreferences: string;
    languageSelection: string;
    householdMembers: string;
    deleteAccount: string;
  };
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    confirm: string;
    loading: string;
    success: string;
    error: string;
    search: string;
    close: string;
    language: string;
  };
}
