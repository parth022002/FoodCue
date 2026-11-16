import { useState } from "react";
import {
  type VerifiedFoodProduct,
  searchCatalog
} from "../../domain/entities/catalogData";
import { BookOpen, Search, ShieldCheck, Plus, Sparkles, ExternalLink, X } from "lucide-react";

export function CatalogView({
  onSelectProductForScan,
  onAddProductToKitchen
}: {
  onSelectProductForScan: (gtin: string) => void;
  onAddProductToKitchen: (product: VerifiedFoodProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeModalProduct, setActiveModalProduct] = useState<VerifiedFoodProduct | null>(null);

  const categories = [
    "All",
    "Staples",
    "Dairy",
    "Biscuits & Bakery",
    "Snacks & Instant",
    "Breakfast & Cereals"
  ];

  const searchResults = searchCatalog(query);
  const filteredProducts = searchResults.filter(
    (p) => selectedCategory === "All" || p.category === selectedCategory
  );

  return (
    <section className="panel" aria-labelledby="catalog-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">VERIFIED DATABASE</p>
          <h2 id="catalog-heading" className="panel-title-with-icon">
            <BookOpen className="title-icon text-brand-green" aria-hidden="true" />
            Packaged Food Catalogue & Pack Memory
          </h2>
        </div>
        <span className="status-tag">Verified Indian SKUs</span>
      </div>

      <p className="muted">
        Inspect physical-pack ground truth: ingredients, mandatory FSSAI allergen declarations, and pack-declared nutrition facts.
      </p>

      {/* Search Bar */}
      <div className="search-bar-box">
        <Search className="search-icon text-muted" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search by brand (e.g. Amul, Tata), product, or barcode (890...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        {query && (
          <button className="clear-search-btn" onClick={() => setQuery("")}>
            <X className="tiny-icon" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="pill-filters" role="group" aria-label="Category filter">
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

      {/* Products Grid */}
      <div className="catalog-grid">
        {filteredProducts.map((prod) => (
          <div key={prod.id} className="product-catalog-card">
            <div className="card-top-row">
              <span className="category-badge">{prod.category}</span>
              <span className="gtin-mono">GTIN: {prod.gtin}</span>
            </div>

            <h3 className="card-product-name">{prod.productName}</h3>
            <p className="card-brand-variant">
              <strong>{prod.brand}</strong> • {prod.variant} ({prod.packSize})
            </p>

            <div className="card-allergens-preview">
              <span className="allergen-summary-label">Allergens:</span>{" "}
              {prod.allergensDeclared.length > 0 ? (
                prod.allergensDeclared.map((alg) => (
                  <span key={alg} className="allergen-chip declared">
                    {alg}
                  </span>
                ))
              ) : (
                <span className="allergen-chip none">None declared</span>
              )}
            </div>

            <div className="card-footer-buttons">
              <button
                className="secondary-button compact-btn flex-1"
                onClick={() => setActiveModalProduct(prod)}
              >
                Inspect Label
              </button>
              <button
                className="secondary-button compact-btn"
                onClick={() => onSelectProductForScan(prod.gtin)}
                title="Scan this barcode"
              >
                <Sparkles className="btn-icon text-brand-green" /> Scan
              </button>
              <button
                className="primary-button compact-btn"
                onClick={() => onAddProductToKitchen(prod)}
                title="Add to kitchen pantry"
              >
                <Plus className="btn-icon" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {activeModalProduct && (
        <div className="modal-backdrop" onClick={() => setActiveModalProduct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="status-tag">Verified Pack Ground Truth</span>
                <h2>{activeModalProduct.productName}</h2>
                <p className="muted">
                  {activeModalProduct.brand} • {activeModalProduct.variant} ({activeModalProduct.packSize})
                </p>
              </div>
              <button className="close-btn" onClick={() => setActiveModalProduct(null)}>
                <X />
              </button>
            </div>

            <div className="modal-body">
              {/* FSSAI Licence & Source */}
              <div className="info-chip-group">
                <div className="info-chip">
                  <ShieldCheck className="chip-icon text-brand-green" />
                  <span>FSSAI Lic: <strong>{activeModalProduct.fssaiLicence}</strong></span>
                </div>
                <div className="info-chip">
                  <span>Source: <strong>{activeModalProduct.sourceReference}</strong></span>
                </div>
              </div>

              {/* Ingredients */}
              <div className="detail-section">
                <h4>Ingredients (As Printed on Packaging)</h4>
                <p className="ingredients-box">{activeModalProduct.ingredientsText}</p>
                <div className="tag-cloud">
                  {activeModalProduct.parsedIngredients.map((ing) => (
                    <span key={ing} className="sub-tag">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Allergens */}
              <div className="detail-section">
                <h4>Mandatory FSSAI Allergen Declaration</h4>
                {activeModalProduct.allergensDeclared.length > 0 ? (
                  <div className="allergen-alert-box declared">
                    <strong>Contains: </strong>
                    {activeModalProduct.allergensDeclared.join(", ")}
                  </div>
                ) : (
                  <p className="notice">No allergens declared in the ingredients list.</p>
                )}
                {activeModalProduct.allergensMayContain.length > 0 && (
                  <div className="allergen-alert-box may-contain">
                    <strong>Cross-contact (May Contain): </strong>
                    {activeModalProduct.allergensMayContain.join(", ")}
                  </div>
                )}
              </div>

              {/* Nutrition Table */}
              <div className="detail-section">
                <h4>Pack-Declared Nutrition Facts (Per 100g / 100ml)</h4>
                <div className="nutrition-table-wrapper">
                  <table className="nutrition-table">
                    <thead>
                      <tr>
                        <th>Nutrient</th>
                        <th>Per 100g</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Energy</td>
                        <td><strong>{activeModalProduct.nutritionPer100g.energyKcal} kcal</strong></td>
                      </tr>
                      <tr>
                        <td>Protein</td>
                        <td>{activeModalProduct.nutritionPer100g.proteinG} g</td>
                      </tr>
                      <tr>
                        <td>Carbohydrates</td>
                        <td>{activeModalProduct.nutritionPer100g.carbohydratesG} g</td>
                      </tr>
                      <tr>
                        <td>— Total Sugars</td>
                        <td>{activeModalProduct.nutritionPer100g.totalSugarsG} g</td>
                      </tr>
                      <tr>
                        <td>— Added Sugars</td>
                        <td>{activeModalProduct.nutritionPer100g.addedSugarsG} g</td>
                      </tr>
                      <tr>
                        <td>Total Fat</td>
                        <td>{activeModalProduct.nutritionPer100g.totalFatG} g</td>
                      </tr>
                      <tr>
                        <td>— Saturated Fat</td>
                        <td>{activeModalProduct.nutritionPer100g.saturatedFatG} g</td>
                      </tr>
                      <tr>
                        <td>— Trans Fat</td>
                        <td>{activeModalProduct.nutritionPer100g.transFatG} g</td>
                      </tr>
                      <tr>
                        <td>Sodium</td>
                        <td>{activeModalProduct.nutritionPer100g.sodiumMg} mg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manufacturer Claims */}
              {activeModalProduct.manufacturerClaims.length > 0 && (
                <div className="detail-section">
                  <h4>Manufacturer Packaging Claims</h4>
                  <ul className="plain-list">
                    {activeModalProduct.manufacturerClaims.map((claim) => (
                      <li key={claim}>✓ {claim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() => {
                  onSelectProductForScan(activeModalProduct.gtin);
                  setActiveModalProduct(null);
                }}
              >
                <ExternalLink className="btn-icon" /> Test SmartScan with this Pack
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  onAddProductToKitchen(activeModalProduct);
                  setActiveModalProduct(null);
                }}
              >
                <Plus className="btn-icon" /> Add to Pantry
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
