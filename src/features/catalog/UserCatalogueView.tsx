import { useState, useEffect } from "react";
import { BookOpen, Search, Trash2, Sparkles, Plus, ArrowUpDown, X } from "lucide-react";
import { userCatalogueService } from "../../domain/services/userCatalogueService";
import type { UserCatalogueItem, IntelligentProductReport } from "../../domain/entities/nutritionalProfile";
import { ProductIntelligenceCard } from "../../components/nutrition/ProductIntelligenceCard";

interface UserCatalogueViewProps {
  userId?: string;
  onNavigateToSearch?: () => void;
  onNavigateToScan?: () => void;
  onAddProductToKitchen?: (report: IntelligentProductReport) => void;
  onRequireAuthPrompt?: () => void;
}

export function UserCatalogueView({
  userId,
  onNavigateToSearch,
  onNavigateToScan,
  onAddProductToKitchen,
  onRequireAuthPrompt
}: UserCatalogueViewProps) {
  const [items, setItems] = useState<UserCatalogueItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"score-desc" | "score-asc" | "date-desc">("score-desc");
  const [activeModalProduct, setActiveModalProduct] = useState<IntelligentProductReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isGuest = !userId || userId === "guest";

  useEffect(() => {
    if (!isGuest) {
      loadCatalogue();
    } else {
      setIsLoading(false);
    }
  }, [userId, isGuest]);

  async function loadCatalogue() {
    setIsLoading(true);
    try {
      const data = await userCatalogueService.getUserCatalogue(userId!);
      setItems(data);
    } catch {
      // empty
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId || isGuest) return;
    await userCatalogueService.removeProduct(userId, id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  if (isGuest) {
    return (
      <div className="guest-catalogue-gate panel" role="region" aria-label="Personal Catalogue Access">
        <div className="gate-content-box">
          <BookOpen className="gate-icon text-brand-green" aria-hidden="true" />
          <h2 className="gate-title">Personal Product Catalogue</h2>
          <p className="gate-description">
            Your personal catalogue is saved securely to your account so you can track your family's favorite foods,
            compare nutritional scores, and quickly restock your kitchen pantry.
          </p>
          <div className="gate-actions-row">
            <button
              type="button"
              className="primary-action-btn"
              onClick={() => onRequireAuthPrompt && onRequireAuthPrompt()}
            >
              Sign In to View My Catalogue
            </button>
            {onNavigateToSearch && (
              <button type="button" className="secondary-action-btn" onClick={onNavigateToSearch}>
                Explore Public Food Database
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];

  // Filtering
  const filtered = items.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(query.toLowerCase()) ||
      item.brand.toLowerCase().includes(query.toLowerCase()) ||
      (item.gtin && item.gtin.includes(query));
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === "score-desc") return b.healthScore - a.healthScore;
    if (sortBy === "score-asc") return a.healthScore - b.healthScore;
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });

  return (
    <section className="panel" aria-labelledby="catalogue-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR SAVED PRODUCTS</p>
          <h2 id="catalogue-heading" className="panel-title-with-icon">
            <BookOpen className="title-icon text-brand-green" aria-hidden="true" />
            My Product Catalogue ({items.length})
          </h2>
        </div>
        <div className="catalogue-head-actions">
          {onNavigateToScan && (
            <button type="button" className="header-action-btn" onClick={onNavigateToScan}>
              <Plus className="tiny-icon" /> Scan & Add
            </button>
          )}
          {onNavigateToSearch && (
            <button type="button" className="header-action-btn" onClick={onNavigateToSearch}>
              <Search className="tiny-icon" /> Search Internet
            </button>
          )}
        </div>
      </div>

      <p className="muted">
        Your private list of reviewed packaged foods. Filter by category, sort by health score, and inspect ingredients anytime.
      </p>

      {/* Search and Filters Bar */}
      <div className="catalogue-toolbar">
        <div className="search-bar-box flex-grow">
          <Search className="search-icon text-muted" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search within your saved products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            aria-label="Search your saved products"
          />
          {query && (
            <button className="clear-search-btn" onClick={() => setQuery("")}>
              <X className="tiny-icon" />
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="sort-box">
          <ArrowUpDown className="sort-icon text-muted" aria-hidden="true" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="sort-dropdown"
            aria-label="Sort products by"
          >
            <option value="score-desc">Highest Health Score</option>
            <option value="score-asc">Lowest Health Score</option>
            <option value="date-desc">Recently Saved</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 2 && (
        <div className="pill-filters" role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Items Grid */}
      {items.length === 0 && !isLoading ? (
        <div className="empty-catalogue-card">
          <BookOpen className="empty-icon text-muted" aria-hidden="true" />
          <h3 className="empty-title">Your catalogue is currently empty</h3>
          <p className="empty-text">
            When you scan products or search for foods, click <strong>"Add to My Catalogue"</strong> to save them here for quick access.
          </p>
          <div className="empty-actions">
            {onNavigateToSearch && (
              <button type="button" className="primary-action-btn" onClick={onNavigateToSearch}>
                <Search className="tiny-icon" /> Search Food Database
              </button>
            )}
            {onNavigateToScan && (
              <button type="button" className="secondary-action-btn" onClick={onNavigateToScan}>
                Scan with Camera
              </button>
            )}
          </div>
        </div>
      ) : filtered.length === 0 && !isLoading ? (
        <div className="no-matches-notice">
          <p>No saved products match "{query}".</p>
          <button className="clear-link-btn" onClick={() => { setQuery(""); setSelectedCategory("All"); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="catalogue-cards-grid">
          {filtered.map((item) => {
            const scoreClass =
              item.healthCategory === "Excellent"
                ? "score-excellent"
                : item.healthCategory === "Good"
                ? "score-good"
                : item.healthCategory === "Moderate"
                ? "score-moderate"
                : item.healthCategory === "Poor"
                ? "score-poor"
                : "score-very-poor";

            return (
              <div
                key={item.id}
                className="user-catalogue-item-card"
                onClick={() => setActiveModalProduct(item.productReport)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActiveModalProduct(item.productReport);
                }}
              >
                <div className="card-top-row">
                  <span className="category-badge">{item.category}</span>
                  <span className={`score-badge-mini ${scoreClass}`}>
                    {item.healthScore}/100 • {item.healthCategory}
                  </span>
                </div>

                <h3 className="card-product-name">{item.productName}</h3>
                <p className="card-brand-variant">
                  <strong>{item.brand}</strong> {item.gtin ? `• Barcode: ${item.gtin}` : ""}
                </p>

                <div className="card-quick-strengths">
                  <span className="strength-preview-text">
                    {item.productReport.healthAssessment.strengths[0] || "Standard food energy"}
                  </span>
                </div>

                <div className="card-bottom-actions">
                  <span className="view-link-text">
                    <Sparkles className="tiny-icon" /> View Nutrition
                  </span>
                  <button
                    type="button"
                    className="delete-item-btn"
                    onClick={(e) => handleRemove(item.id, e)}
                    title="Remove from your catalogue"
                    aria-label={`Remove ${item.productName} from your catalogue`}
                  >
                    <Trash2 className="tiny-icon" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {activeModalProduct && (
        <div className="modal-backdrop" onClick={() => setActiveModalProduct(null)}>
          <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <ProductIntelligenceCard
              report={activeModalProduct}
              isSavedInCatalogue={true}
              onSaveToCatalogue={async () => {
                if (userId) {
                  const match = items.find((i) => i.id === activeModalProduct.id || i.gtin === activeModalProduct.gtin);
                  if (match) {
                    await userCatalogueService.removeProduct(userId, match.id);
                    setItems((prev) => prev.filter((i) => i.id !== match.id));
                    setActiveModalProduct(null);
                  }
                }
              }}
              onAddToKitchen={() => {
                if (onAddProductToKitchen) onAddProductToKitchen(activeModalProduct);
                setActiveModalProduct(null);
              }}
              onClose={() => setActiveModalProduct(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
