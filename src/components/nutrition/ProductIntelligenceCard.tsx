import { useState } from "react";
import type { IntelligentProductReport } from "../../domain/entities/nutritionalProfile";
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Check,
  BookmarkPlus,
  BookmarkCheck,
  Refrigerator,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Apple,
  Clock,
  HeartPulse
} from "lucide-react";

interface ProductIntelligenceCardProps {
  report: IntelligentProductReport;
  isSavedInCatalogue?: boolean;
  onSaveToCatalogue?: () => void;
  onAddToKitchen?: () => void;
  onClose?: () => void;
  showSaveButton?: boolean;
}

export function ProductIntelligenceCard({
  report,
  isSavedInCatalogue = false,
  onSaveToCatalogue,
  onAddToKitchen,
  onClose,
  showSaveButton = true
}: ProductIntelligenceCardProps) {
  const [showFullNutrition, setShowFullNutrition] = useState(false);
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  const { healthAssessment, nutritionPer100g, parsedIngredients, personalizedAlerts } = report;

  // Category colour styling
  const scoreBadgeClass =
    healthAssessment.category === "Excellent"
      ? "score-excellent"
      : healthAssessment.category === "Good"
      ? "score-good"
      : healthAssessment.category === "Moderate"
      ? "score-moderate"
      : healthAssessment.category === "Poor"
      ? "score-poor"
      : "score-very-poor";

  return (
    <div className="product-intelligence-card" role="region" aria-label={`Food intelligence for ${report.productName}`}>
      {/* Header bar */}
      <div className="intelligence-card-header">
        <div className="product-identity-meta">
          <span className="source-provenance-tag">
            <Info className="tiny-icon" aria-hidden="true" />
            {report.source.sourceName}
          </span>
          {report.isVegetarian !== null && (
            <span className={`veg-badge ${report.isVegetarian ? "veg" : "non-veg"}`}>
              <span className="veg-dot" />
              {report.isVegetarian ? "Vegetarian" : "Non-Vegetarian"}
            </span>
          )}
        </div>
        {onClose && (
          <button className="close-card-btn" onClick={onClose} aria-label="Close product card">
            ✕
          </button>
        )}
      </div>

      {/* Main Product Info & Score Block */}
      <div className="product-overview-hero">
        <div className="product-image-container">
          {report.imageUrl ? (
            <img src={report.imageUrl} alt={report.productName} className="product-preview-thumb" />
          ) : (
            <div className="product-placeholder-thumb">
              <Apple className="thumb-placeholder-icon" />
            </div>
          )}
        </div>

        <div className="product-title-block">
          <p className="product-brand-line">{report.brand}</p>
          <h2 className="product-heading-title">{report.productName}</h2>
          <p className="product-category-text">
            {report.category} {report.packSize ? `• ${report.packSize}` : ""}
          </p>
          {report.gtin && <span className="barcode-chip">Barcode: {report.gtin}</span>}
        </div>

        {/* Big Health Score Badge */}
        <div className={`health-score-gauge ${scoreBadgeClass}`}>
          <div className="score-number-display">
            <span className="score-val">{healthAssessment.score}</span>
            <span className="score-max">/100</span>
          </div>
          <span className="score-category-label">{healthAssessment.category}</span>
        </div>
      </div>

      {/* Personalized Allergy Alert (if conflict detected) */}
      {personalizedAlerts?.hasAllergyConflict && (
        <div className="allergy-alert-banner" role="alert">
          <ShieldAlert className="alert-icon" aria-hidden="true" />
          <div>
            <h4 className="alert-title">Allergy Warning for Your Profile</h4>
            <p className="alert-desc">
              This product contains <strong>{personalizedAlerts.conflictingAllergens.join(", ")}</strong>, which you have flagged to avoid!
            </p>
          </div>
        </div>
      )}

      {/* "What Does This Mean For You?" - Child & Senior Friendly Plain Language */}
      <div className="what-this-means-box">
        <div className="means-title-row">
          <HeartPulse className="means-icon" aria-hidden="true" />
          <h3 className="means-heading">What does this mean for you?</h3>
        </div>
        <ul className="means-list">
          {healthAssessment.whatThisMeansForYou.map((point, idx) => (
            <li key={idx} className="means-item">
              <Check className="check-bullet" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="frequency-guidance-pill">
          <Clock className="tiny-icon" aria-hidden="true" />
          <span>{healthAssessment.recommendedFrequency}</span>
        </div>
      </div>

      {/* Strengths & Concerns Grid */}
      <div className="strengths-concerns-grid">
        <div className="factor-box strengths-box">
          <h4 className="factor-title text-success">
            <ShieldCheck className="tiny-icon" aria-hidden="true" /> Nutritional Strengths
          </h4>
          <ul className="factor-list">
            {healthAssessment.strengths.map((str, idx) => (
              <li key={idx} className="factor-item">{str}</li>
            ))}
          </ul>
        </div>

        <div className="factor-box concerns-box">
          <h4 className="factor-title text-warning">
            <AlertTriangle className="tiny-icon" aria-hidden="true" /> Points to Consider
          </h4>
          <ul className="factor-list">
            {healthAssessment.concerns.map((con, idx) => (
              <li key={idx} className="factor-item">{con}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Core Nutrients Quick Snapshot */}
      <div className="quick-nutrients-row">
        <div className="nutrient-chip">
          <span className="nutrient-label">Energy</span>
          <span className="nutrient-value">
            {nutritionPer100g.energyKcal.value !== null ? `${nutritionPer100g.energyKcal.value} kcal` : "—"}
          </span>
        </div>
        <div className="nutrient-chip">
          <span className="nutrient-label">Protein</span>
          <span className="nutrient-value">
            {nutritionPer100g.protein.value !== null ? `${nutritionPer100g.protein.value} g` : "—"}
          </span>
        </div>
        <div className="nutrient-chip">
          <span className="nutrient-label">Total Sugar</span>
          <span className="nutrient-value">
            {nutritionPer100g.totalSugars.value !== null ? `${nutritionPer100g.totalSugars.value} g` : "—"}
          </span>
        </div>
        <div className="nutrient-chip">
          <span className="nutrient-label">Total Fat</span>
          <span className="nutrient-value">
            {nutritionPer100g.totalFat.value !== null ? `${nutritionPer100g.totalFat.value} g` : "—"}
          </span>
        </div>
        <div className="nutrient-chip">
          <span className="nutrient-label">Sodium</span>
          <span className="nutrient-value">
            {nutritionPer100g.sodium.value !== null ? `${nutritionPer100g.sodium.value} mg` : "—"}
          </span>
        </div>
      </div>

      {/* Accordion: Full 18+ Nutritional Components Table */}
      <div className="expandable-section">
        <button
          type="button"
          className="accordion-toggle-btn"
          onClick={() => setShowFullNutrition(!showFullNutrition)}
          aria-expanded={showFullNutrition}
        >
          <span>Complete Nutrition Facts (Per 100g)</span>
          {showFullNutrition ? <ChevronUp className="tiny-icon" /> : <ChevronDown className="tiny-icon" />}
        </button>

        {showFullNutrition && (
          <div className="nutrition-table-wrapper">
            <table className="nutrition-breakdown-table">
              <thead>
                <tr>
                  <th>Nutritional Component</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Calories / Energy</td>
                  <td><strong>{nutritionPer100g.energyKcal.value !== null ? `${nutritionPer100g.energyKcal.value} kcal` : "—"}</strong></td>
                  <td><span className="provenance-pill">{nutritionPer100g.energyKcal.provenance}</span></td>
                </tr>
                <tr>
                  <td>Total Fat</td>
                  <td>{nutritionPer100g.totalFat.value !== null ? `${nutritionPer100g.totalFat.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.totalFat.provenance}</span></td>
                </tr>
                <tr>
                  <td>— Saturated Fat</td>
                  <td>{nutritionPer100g.saturatedFat.value !== null ? `${nutritionPer100g.saturatedFat.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.saturatedFat.provenance}</span></td>
                </tr>
                <tr>
                  <td>— Trans Fat</td>
                  <td>{nutritionPer100g.transFat.value !== null ? `${nutritionPer100g.transFat.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.transFat.provenance}</span></td>
                </tr>
                <tr>
                  <td>Cholesterol</td>
                  <td>{nutritionPer100g.cholesterol.value !== null ? `${nutritionPer100g.cholesterol.value} mg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.cholesterol.provenance}</span></td>
                </tr>
                <tr>
                  <td>Carbohydrates</td>
                  <td>{nutritionPer100g.carbohydrates.value !== null ? `${nutritionPer100g.carbohydrates.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.carbohydrates.provenance}</span></td>
                </tr>
                <tr>
                  <td>— Total Sugars</td>
                  <td>{nutritionPer100g.totalSugars.value !== null ? `${nutritionPer100g.totalSugars.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.totalSugars.provenance}</span></td>
                </tr>
                <tr>
                  <td>— Added Sugars</td>
                  <td>{nutritionPer100g.addedSugars.value !== null ? `${nutritionPer100g.addedSugars.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.addedSugars.provenance}</span></td>
                </tr>
                <tr>
                  <td>Dietary Fibre</td>
                  <td>{nutritionPer100g.dietaryFibre.value !== null ? `${nutritionPer100g.dietaryFibre.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.dietaryFibre.provenance}</span></td>
                </tr>
                <tr>
                  <td>Protein</td>
                  <td><strong>{nutritionPer100g.protein.value !== null ? `${nutritionPer100g.protein.value} g` : "—"}</strong></td>
                  <td><span className="provenance-pill">{nutritionPer100g.protein.provenance}</span></td>
                </tr>
                <tr>
                  <td>Sodium</td>
                  <td>{nutritionPer100g.sodium.value !== null ? `${nutritionPer100g.sodium.value} mg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.sodium.provenance}</span></td>
                </tr>
                <tr>
                  <td>Salt</td>
                  <td>{nutritionPer100g.salt.value !== null ? `${nutritionPer100g.salt.value} g` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.salt.provenance}</span></td>
                </tr>
                <tr>
                  <td>Calcium</td>
                  <td>{nutritionPer100g.calcium.value !== null ? `${nutritionPer100g.calcium.value} mg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.calcium.provenance}</span></td>
                </tr>
                <tr>
                  <td>Iron</td>
                  <td>{nutritionPer100g.iron.value !== null ? `${nutritionPer100g.iron.value} mg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.iron.provenance}</span></td>
                </tr>
                <tr>
                  <td>Potassium</td>
                  <td>{nutritionPer100g.potassium.value !== null ? `${nutritionPer100g.potassium.value} mg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.potassium.provenance}</span></td>
                </tr>
                <tr>
                  <td>Vitamin A</td>
                  <td>{nutritionPer100g.vitaminA.value !== null ? `${nutritionPer100g.vitaminA.value} mcg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.vitaminA.provenance}</span></td>
                </tr>
                <tr>
                  <td>Vitamin C</td>
                  <td>{nutritionPer100g.vitaminC.value !== null ? `${nutritionPer100g.vitaminC.value} mg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.vitaminC.provenance}</span></td>
                </tr>
                <tr>
                  <td>Vitamin D</td>
                  <td>{nutritionPer100g.vitaminD.value !== null ? `${nutritionPer100g.vitaminD.value} mcg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.vitaminD.provenance}</span></td>
                </tr>
                <tr>
                  <td>Vitamin B12</td>
                  <td>{nutritionPer100g.vitaminB12.value !== null ? `${nutritionPer100g.vitaminB12.value} mcg` : "—"}</td>
                  <td><span className="provenance-pill">{nutritionPer100g.vitaminB12.provenance}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accordion: Ingredient Intelligence (Simple Explanation) */}
      <div className="expandable-section">
        <button
          type="button"
          className="accordion-toggle-btn"
          onClick={() => setShowAllIngredients(!showAllIngredients)}
          aria-expanded={showAllIngredients}
        >
          <span>Ingredient Intelligence ({parsedIngredients.length} ingredients)</span>
          {showAllIngredients ? <ChevronUp className="tiny-icon" /> : <ChevronDown className="tiny-icon" />}
        </button>

        {showAllIngredients && (
          <div className="ingredients-intelligence-wrapper">
            <p className="ingredients-raw-preview">
              <strong>Declared on pack:</strong> {report.ingredientsText || "Ingredients not listed."}
            </p>

            <div className="ingredients-cards-list">
              {parsedIngredients.map((ing, idx) => (
                <div key={idx} className="ingredient-detail-row">
                  <div className="ing-title-line">
                    <span className="ing-name"><strong>{ing.name}</strong></span>
                    {ing.insNumber && <span className="ins-badge">{ing.insNumber}</span>}
                    <span className="category-pill">{ing.category.replace(/_/g, " ")}</span>
                  </div>
                  <p className="ing-explanation">{ing.simpleExplanation}</p>
                  {ing.safetyNote && <p className="ing-safety-note">{ing.safetyNote}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Healthier Alternatives (if available) */}
      {healthAssessment.healthierAlternatives.length > 0 && (
        <div className="alternatives-section">
          <h4 className="alternatives-heading">
            <Sparkles className="tiny-icon text-brand-green" aria-hidden="true" /> Healthier Alternatives to Consider
          </h4>
          <div className="alternatives-grid">
            {healthAssessment.healthierAlternatives.map((alt, idx) => (
              <div key={idx} className="alternative-card">
                <strong>{alt.name}</strong> ({alt.brand})
                <p className="alt-reason">{alt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card Action Buttons */}
      <div className="intelligence-card-actions">
        {showSaveButton && onSaveToCatalogue && (
          <button
            type="button"
            className={`save-catalogue-btn ${isSavedInCatalogue ? "saved" : ""}`}
            onClick={onSaveToCatalogue}
          >
            {isSavedInCatalogue ? (
              <>
                <BookmarkCheck className="action-icon" aria-hidden="true" />
                <span>Saved in My Catalogue</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="action-icon" aria-hidden="true" />
                <span>Add to My Catalogue</span>
              </>
            )}
          </button>
        )}

        {onAddToKitchen && (
          <button
            type="button"
            className="add-kitchen-btn"
            onClick={onAddToKitchen}
          >
            <Refrigerator className="action-icon" aria-hidden="true" />
            <span>Add to My Kitchen</span>
          </button>
        )}
      </div>
    </div>
  );
}
