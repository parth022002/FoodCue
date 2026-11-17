import { useState, useEffect } from "react";
import { Search, Sparkles, X, Loader2, ArrowRight, BookOpen, AlertCircle } from "lucide-react";
import { InternetResearchAgent, ProductIdentificationAgent } from "../../domain/services/aiNutritionAgents";
import type { IntelligentProductReport } from "../../domain/entities/nutritionalProfile";
import { ProductIntelligenceCard } from "../../components/nutrition/ProductIntelligenceCard";
import { userCatalogueService } from "../../domain/services/userCatalogueService";

interface InternetProductSearchProps {
  userId?: string;
  onSelectProductForKitchen?: (report: IntelligentProductReport) => void;
  onRequireAuthPrompt?: () => void;
}

const POPULAR_SEARCH_CHIPS = [
  "Amul Butter",
  "Maggi 2-Minute Noodles",
  "Parle-G Biscuits",
  "Tata Salt",
  "Dabur Honey",
  "Nutella Hazelnut Spread",
  "Kellogg's Corn Flakes",
  "Britannia Good Day"
];

export function InternetProductSearch({
  userId,
  onSelectProductForKitchen,
  onRequireAuthPrompt
}: InternetProductSearchProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<IntelligentProductReport[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<IntelligentProductReport | null>(null);
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const researchAgent = new InternetResearchAgent();
  const idAgent = new ProductIdentificationAgent();

  // Load user's saved items to show saved status
  useEffect(() => {
    if (userId && userId !== "guest") {
      userCatalogueService.getUserCatalogue(userId).then((items) => {
        const ids = new Set(items.map((i) => i.gtin || i.id));
        setSavedProductIds(ids);
      });
    }
  }, [userId]);

  async function handleSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const identification = idAgent.identifyFromInput(trimmed);
      let searchOutput: IntelligentProductReport[] = [];

      if (identification.isBarcode && identification.gtin) {
        const single = await researchAgent.fetchByGtin(identification.gtin);
        if (single) searchOutput = [single];
      }

      if (searchOutput.length === 0) {
        searchOutput = await researchAgent.searchProduct(identification.searchTerm);
      }

      setResults(searchOutput);
      if (searchOutput.length === 0) {
        setErrorMessage(`No products found for "${trimmed}". Try searching by popular brand name (e.g. Amul, Britannia, Tata).`);
      }
    } catch {
      setErrorMessage("Unable to search internet food database. Showing offline catalog items if available.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleChipClick(chip: string) {
    setQuery(chip);
    handleSearch(chip);
  }

  async function handleToggleSaveToCatalogue(prod: IntelligentProductReport) {
    if (!userId || userId === "guest") {
      if (onRequireAuthPrompt) onRequireAuthPrompt();
      return;
    }

    const key = prod.gtin || prod.id;
    if (savedProductIds.has(key)) {
      // Remove
      const items = await userCatalogueService.getUserCatalogue(userId);
      const match = items.find((i) => (prod.gtin && i.gtin === prod.gtin) || i.id === prod.id);
      if (match) {
        await userCatalogueService.removeProduct(userId, match.id);
        setSavedProductIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    } else {
      // Save
      const res = await userCatalogueService.saveProduct(userId, prod);
      if (res.success) {
        setSavedProductIds((prev) => new Set(prev).add(key));
      }
    }
  }

  return (
    <div className="search-feature-container">
      {/* Search Bar Input */}
      <div className="main-search-box">
        <Search className="search-prefix-icon text-muted" aria-hidden="true" />
        <input
          type="text"
          className="search-field-input"
          placeholder="Search by product name, brand (e.g. Amul, Maggi, Tata), or barcode..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch(query);
          }}
          aria-label="Search packaged foods by name or barcode"
        />
        {query && (
          <button
            type="button"
            className="clear-search-button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            aria-label="Clear search"
          >
            <X className="tiny-icon" />
          </button>
        )}
        <button
          type="button"
          className="execute-search-button"
          onClick={() => handleSearch(query)}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <Loader2 className="spinning-icon" aria-hidden="true" />
          ) : (
            <>
              <span>Search</span>
              <ArrowRight className="tiny-icon" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      {/* Popular Chips */}
      <div className="popular-chips-bar" role="group" aria-label="Suggested search terms">
        <span className="chips-label">Popular in India:</span>
        {POPULAR_SEARCH_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="suggestion-chip-btn"
            onClick={() => handleChipClick(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="search-loading-state" role="status">
          <Loader2 className="loading-spinner-large text-brand-green" aria-hidden="true" />
          <p className="loading-text">
            Searching Indian & international food databases (Open Food Facts & Verified FMCG)...
          </p>
        </div>
      )}

      {/* Error message */}
      {errorMessage && !isLoading && (
        <div className="search-empty-notice" role="alert">
          <AlertCircle className="notice-icon text-amber" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Search Results List */}
      {!isLoading && results.length > 0 && (
        <div className="search-results-section">
          <h3 className="results-count-heading">
            Found {results.length} matching product{results.length > 1 ? "s" : ""}
          </h3>

          <div className="search-results-grid">
            {results.map((prod) => {
              const isSaved = savedProductIds.has(prod.gtin || prod.id);
              const scoreClass =
                prod.healthAssessment.category === "Excellent"
                  ? "score-excellent"
                  : prod.healthAssessment.category === "Good"
                  ? "score-good"
                  : prod.healthAssessment.category === "Moderate"
                  ? "score-moderate"
                  : prod.healthAssessment.category === "Poor"
                  ? "score-poor"
                  : "score-very-poor";

              return (
                <div key={prod.id} className="search-result-card">
                  <div className="card-top-header">
                    <span className="product-brand-chip">{prod.brand}</span>
                    <span className={`score-badge-mini ${scoreClass}`}>
                      {prod.healthAssessment.score}/100 • {prod.healthAssessment.category}
                    </span>
                  </div>

                  <h4 className="result-product-title">{prod.productName}</h4>
                  <p className="result-category-sub">{prod.category} {prod.packSize ? `• ${prod.packSize}` : ""}</p>

                  <div className="result-quick-nutrition">
                    <span className="mini-nut-pill">
                      ⚡ {prod.nutritionPer100g.energyKcal.value !== null ? `${prod.nutritionPer100g.energyKcal.value} kcal` : "—"}
                    </span>
                    <span className="mini-nut-pill">
                      💪 {prod.nutritionPer100g.protein.value !== null ? `${prod.nutritionPer100g.protein.value}g protein` : "—"}
                    </span>
                    <span className="mini-nut-pill">
                      🍬 {prod.nutritionPer100g.totalSugars.value !== null ? `${prod.nutritionPer100g.totalSugars.value}g sugar` : "—"}
                    </span>
                  </div>

                  <div className="result-card-actions">
                    <button
                      type="button"
                      className="view-details-action-btn"
                      onClick={() => setSelectedProduct(prod)}
                    >
                      <Sparkles className="tiny-icon" aria-hidden="true" />
                      <span>View Food Intelligence</span>
                    </button>

                    <button
                      type="button"
                      className={`quick-save-btn ${isSaved ? "saved" : ""}`}
                      onClick={() => handleToggleSaveToCatalogue(prod)}
                      title={isSaved ? "Saved in your catalogue" : "Add to your personal catalogue"}
                    >
                      <BookOpen className="tiny-icon" aria-hidden="true" />
                      <span>{isSaved ? "Saved" : "Save"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Product Modal / Drawer */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <ProductIntelligenceCard
              report={selectedProduct}
              isSavedInCatalogue={savedProductIds.has(selectedProduct.gtin || selectedProduct.id)}
              onSaveToCatalogue={() => handleToggleSaveToCatalogue(selectedProduct)}
              onAddToKitchen={() => {
                if (onSelectProductForKitchen) onSelectProductForKitchen(selectedProduct);
                setSelectedProduct(null);
              }}
              onClose={() => setSelectedProduct(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
