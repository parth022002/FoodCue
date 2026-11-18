import { useState, useEffect } from "react";
import {
  Utensils,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShoppingCart,
  ChefHat,
  Filter,
  ShieldCheck,
  Flame,
  ArrowRight
} from "lucide-react";
import type { EnrichedPantryItem } from "../kitchen/Kitchen";
import { getAllRecords } from "../../adapters/storage/database";
import { projectBalances } from "../../domain/services/pantryLedger";
import { CURATED_RECIPES, matchRecipesWithPantry } from "../../domain/services/recipeEngine";
import type { RecipeMatchResult } from "../../domain/entities/recipe";
import { shoppingStorage } from "../../adapters/storage/shoppingStorage";
import { useTranslation } from "../../i18n";
import type { PantryEvent } from "../../domain/entities/pantry";

export function RecipeDiscoveryView({
  userAllergies = [],
  userDietary = [],
  onNavigateToKitchen,
  onNavigateToShopping
}: {
  userAllergies?: string[];
  userDietary?: string[];
  onNavigateToKitchen?: () => void;
  onNavigateToShopping?: () => void;
}) {
  const { t } = useTranslation();
  const [pantryItems, setPantryItems] = useState<EnrichedPantryItem[]>([]);
  const [filterType, setFilterType] = useState<"all" | "expiring" | "ready" | "quick">("all");
  const [selectedRecipeResult, setSelectedRecipeResult] = useState<RecipeMatchResult | null>(null);
  const [shoppingNotice, setShoppingNotice] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadPantry() {
      try {
        const events = (await getAllRecords("pantryEvents")) as PantryEvent[];
        const balances = projectBalances(events);
        const enriched: EnrichedPantryItem[] = balances
          .filter((b) => b.quantity > 0)
          .map((b) => {
            // Find latest event for expiry estimation
            const itemEvents = events.filter((e) => e.itemId === b.itemId);
            const latest = itemEvents[itemEvents.length - 1];
            const dateValue = latest?.dateValue || (new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] ?? "");
            const diffDays = Math.ceil((new Date(dateValue).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return {
              itemId: b.itemId,
              displayName: b.itemId,
              quantity: b.quantity,
              unit: b.unit,
              location: "Pantry",
              dateType: "expiry",
              dateValue,
              daysRemaining: diffDays,
              isOpened: false
            };
          });

        if (mounted) {
          setPantryItems(enriched);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    loadPantry();
    return () => {
      mounted = false;
    };
  }, []);

  const matchResults = matchRecipesWithPantry(
    CURATED_RECIPES,
    pantryItems,
    userAllergies,
    userDietary
  );

  const filteredResults = matchResults.filter((res) => {
    if (filterType === "expiring") return res.usesExpiringIngredients;
    if (filterType === "ready") return res.matchScore === 100;
    if (filterType === "quick") return (res.recipe.prepTimeMinutes + res.recipe.cookTimeMinutes) <= 20;
    return true;
  });

  const expiringCount = matchResults.filter((r) => r.usesExpiringIngredients).length;

  async function handleAddMissingToShopping(res: RecipeMatchResult) {
    if (res.missingIngredients.length === 0) return;

    for (const item of res.missingIngredients) {
      await shoppingStorage.addItem({
        name: item.name,
        quantity: item.requiredQty,
        unit: item.unit,
        category: "Groceries",
        isBought: false
      });
    }

    setShoppingNotice(t.recipes.addedToShoppingSuccess);
    setTimeout(() => setShoppingNotice(""), 4000);
  }

  return (
    <div className="recipes-feature-root" aria-labelledby="recipes-page-title">
      {/* Page Header */}
      <div className="panel-header-block mb-4">
        <div className="flex items-center gap-3">
          <div className="header-icon-box bg-emerald-100 text-emerald-800 p-2 rounded-lg">
            <Utensils size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="section-eyebrow">CULINARY INTELLIGENCE & MEAL PLANNING</p>
            <h1 id="recipes-page-title" className="text-2xl font-bold text-gray-900">
              {t.recipes.title}
            </h1>
          </div>
        </div>
        <p className="text-gray-600 mt-2 text-sm leading-relaxed max-w-3xl">
          {t.recipes.subtitle}
        </p>
      </div>

      {/* Food Waste Prevention Alert Banner if expiring ingredients exist */}
      {expiringCount > 0 && (
        <div className="expiring-recipes-alert-card mb-4" role="alert">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-600 shrink-0" size={20} aria-hidden="true" />
            <div className="flex-1">
              <strong className="text-amber-900 block font-semibold text-sm">
                Food Waste Prevention Opportunity
              </strong>
              <p className="text-amber-800 text-xs mt-0.5">
                We found <strong>{expiringCount} recipe suggestions</strong> that utilize ingredients approaching their expiration date in your kitchen.
              </p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition"
              onClick={() => setFilterType("expiring")}
            >
              View Expiring Recipes
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="recipes-filter-row mb-6 flex flex-wrap gap-2 items-center" role="tablist" aria-label="Recipe filters">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mr-2">
          <Filter size={14} /> Filter:
        </span>
        <button
          type="button"
          role="tab"
          aria-selected={filterType === "all"}
          className={`filter-pill-btn ${filterType === "all" ? "active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          {t.recipes.allRecipes} ({matchResults.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterType === "expiring"}
          className={`filter-pill-btn ${filterType === "expiring" ? "active" : ""}`}
          onClick={() => setFilterType("expiring")}
        >
          🔥 Uses Expiring Items ({expiringCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterType === "ready"}
          className={`filter-pill-btn ${filterType === "ready" ? "active" : ""}`}
          onClick={() => setFilterType("ready")}
        >
          ✅ 100% Ready to Cook
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterType === "quick"}
          className={`filter-pill-btn ${filterType === "quick" ? "active" : ""}`}
          onClick={() => setFilterType("quick")}
        >
          ⚡ Quick (≤ 20 mins)
        </button>
      </div>

      {/* Shopping List Feedback Toast */}
      {shoppingNotice && (
        <div className="shopping-added-toast mb-4" role="status">
          <CheckCircle2 size={18} className="text-emerald-700" />
          <span>{shoppingNotice}</span>
          {onNavigateToShopping && (
            <button
              type="button"
              className="ml-auto underline text-xs font-semibold text-emerald-800 hover:text-emerald-950"
              onClick={onNavigateToShopping}
            >
              Open Shopping List
            </button>
          )}
        </div>
      )}

      {/* Recipes Grid */}
      {loading ? (
        <div className="p-8 text-center text-gray-500">{t.common.loading}</div>
      ) : filteredResults.length === 0 ? (
        <div className="empty-recipes-state panel text-center p-8">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">{t.recipes.noRecipesFound}</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Try checking "All Suggestions" or stocking more kitchen essentials like lentils, rice, spices, or fresh vegetables.
          </p>
          {onNavigateToKitchen && (
            <button
              type="button"
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded font-medium text-sm hover:bg-emerald-700 transition"
              onClick={onNavigateToKitchen}
            >
              Go to My Kitchen
            </button>
          )}
        </div>
      ) : (
        <div className="recipes-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((res) => {
            const { recipe, matchScore, usesExpiringIngredients, expiringIngredientsNames, containsAllergenConflict } = res;
            const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

            return (
              <div
                key={recipe.id}
                className={`recipe-card ${usesExpiringIngredients ? "border-amber-400 shadow-amber-50" : ""}`}
                onClick={() => setSelectedRecipeResult(res)}
                tabIndex={0}
                role="button"
                aria-label={`View recipe for ${recipe.name}`}
              >
                {/* Card Top Row Badges */}
                <div className="recipe-card-header flex items-start justify-between gap-2 mb-2">
                  <span className="recipe-cuisine-pill text-xs font-semibold text-gray-500">
                    {recipe.cuisine} • {recipe.mealCategory}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {usesExpiringIngredients && (
                      <span className="badge-expiring-priority" title={`Uses expiring items: ${expiringIngredientsNames.join(", ")}`}>
                        🔥 Uses Expiring
                      </span>
                    )}
                    <span className={`badge-match-score ${matchScore === 100 ? "score-100" : matchScore >= 50 ? "score-50" : "score-low"}`}>
                      {matchScore}% {t.recipes.matchPercentage}
                    </span>
                  </div>
                </div>

                {/* Recipe Title & Description */}
                <h3 className="recipe-title text-lg font-bold text-gray-900 group-hover:text-emerald-700">
                  {recipe.name}
                </h3>
                <p className="recipe-desc text-xs text-gray-600 line-clamp-2 mt-1 mb-3">
                  {recipe.description}
                </p>

                {/* Quick Meta Row */}
                <div className="recipe-meta-row flex items-center justify-between text-xs text-gray-500 border-t border-b border-gray-100 py-2 my-2">
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-gray-400" />
                    {totalTime} mins
                  </span>
                  <span>
                    <strong>{recipe.difficulty}</strong>
                  </span>
                  <span>{recipe.servings} Servings</span>
                  {recipe.calories && (
                    <span className="flex items-center gap-0.5">
                      <Flame size={14} className="text-amber-500" />
                      {recipe.calories} kcal
                    </span>
                  )}
                </div>

                {/* Dietary Tags */}
                <div className="recipe-tags-row flex flex-wrap gap-1 mt-2">
                  {recipe.dietaryTags.map((tag) => (
                    <span key={tag} className="recipe-tag-pill">
                      {tag}
                    </span>
                  ))}
                  {containsAllergenConflict && (
                    <span className="recipe-allergen-alert-tag text-xs text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle size={12} /> Allergen Warning
                    </span>
                  )}
                </div>

                {/* Footer Action */}
                <div className="recipe-card-footer mt-4 pt-2 flex items-center justify-between text-emerald-700 text-xs font-semibold">
                  <span>
                    {res.availableIngredients.length} of {recipe.ingredients.length} ingredients ready
                  </span>
                  <span className="flex items-center gap-1">
                    View Recipe <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipeResult && (
        <div className="modal-backdrop z-modal" role="dialog" aria-modal="true" aria-labelledby="modal-recipe-title">
          <div className="modal-dialog-large max-w-2xl bg-white rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between border-b pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  {selectedRecipeResult.recipe.cuisine} • {selectedRecipeResult.recipe.mealCategory}
                </span>
                <h2 id="modal-recipe-title" className="text-2xl font-bold text-gray-900 mt-1">
                  {selectedRecipeResult.recipe.name}
                </h2>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
                onClick={() => setSelectedRecipeResult(null)}
                aria-label="Close recipe details"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              {selectedRecipeResult.recipe.description}
            </p>

            {/* Timing & Meta Banner */}
            <div className="grid grid-cols-4 gap-2 bg-gray-50 rounded-lg p-3 text-center text-xs text-gray-600 mb-4">
              <div>
                <span className="block text-gray-400">Prep Time</span>
                <strong className="text-sm text-gray-800">{selectedRecipeResult.recipe.prepTimeMinutes}m</strong>
              </div>
              <div>
                <span className="block text-gray-400">Cook Time</span>
                <strong className="text-sm text-gray-800">{selectedRecipeResult.recipe.cookTimeMinutes}m</strong>
              </div>
              <div>
                <span className="block text-gray-400">Servings</span>
                <strong className="text-sm text-gray-800">{selectedRecipeResult.recipe.servings}</strong>
              </div>
              <div>
                <span className="block text-gray-400">Difficulty</span>
                <strong className="text-sm text-gray-800">{selectedRecipeResult.recipe.difficulty}</strong>
              </div>
            </div>

            {/* Allergen Warning Banner if applicable */}
            {selectedRecipeResult.containsAllergenConflict && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                <div>
                  <strong>Allergen Caution:</strong> This recipe contains <em>{selectedRecipeResult.conflictingAllergens.join(", ")}</em> which may conflict with your saved household allergy profile.
                </div>
              </div>
            )}

            {/* Ingredients Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                  {t.recipes.ingredientsList} ({selectedRecipeResult.recipe.ingredients.length})
                </h4>
                {selectedRecipeResult.missingIngredients.length > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition"
                    onClick={() => handleAddMissingToShopping(selectedRecipeResult)}
                  >
                    <ShoppingCart size={14} />
                    {t.recipes.addMissingToShopping} ({selectedRecipeResult.missingIngredients.length})
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
                {/* Available Ingredients */}
                {selectedRecipeResult.availableIngredients.map((ing) => (
                  <div key={ing.name} className="flex items-center justify-between p-2.5 bg-emerald-50/50 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-medium text-gray-800">{ing.name}</span>
                      <span className="text-gray-500">({ing.requiredQty} {ing.unit})</span>
                    </div>
                    <div>
                      {ing.isExpiringSoon && (
                        <span className="badge-expiring-priority text-[10px]">
                          Expires in {ing.daysRemaining}d
                        </span>
                      )}
                      <span className="text-emerald-700 font-semibold ml-2 text-[11px]">In Kitchen</span>
                    </div>
                  </div>
                ))}

                {/* Missing Ingredients */}
                {selectedRecipeResult.missingIngredients.map((ing) => (
                  <div key={ing.name} className="flex items-center justify-between p-2.5 bg-amber-50/30 text-xs">
                    <div className="flex items-center gap-2">
                      <Plus size={16} className="text-amber-600 shrink-0" />
                      <span className="font-medium text-gray-800">{ing.name}</span>
                      <span className="text-gray-500">({ing.requiredQty} {ing.unit})</span>
                    </div>
                    <span className="text-amber-700 font-semibold text-[11px]">Missing</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions Section */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
                {t.recipes.instructions}
              </h4>
              <ol className="space-y-2.5 text-xs text-gray-700">
                {selectedRecipeResult.recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="bg-emerald-100 text-emerald-800 rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Medical / Packaging Disclaimer */}
            <div className="border-t pt-4 text-[11px] text-gray-500 flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <strong>Culinary Transparency:</strong> {t.recipes.medicalDisclaimer} Always inspect physical packaged food labels before preparation.
              </p>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                onClick={() => setSelectedRecipeResult(null)}
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
