import { useState, useEffect } from "react";
import { User, ShieldAlert, Sparkles, Check, Trash2 } from "lucide-react";

export interface UserFoodProfile {
  avoidAllergens: string[];
  avoidIngredients: string[];
  calmMode: boolean;
  dietaryPattern: string;
}

const COMMON_AVOID_ALLERGENS = [
  "Gluten / Wheat",
  "Milk / Dairy",
  "Peanuts",
  "Tree Nuts (Almonds, Cashews, Walnuts)",
  "Soy / Soybeans",
  "Egg",
  "Fish",
  "Crustaceans / Shellfish",
  "Sulphites (INS 220-223)",
  "Mustard"
];

const COMMON_AVOID_INGREDIENTS = [
  "Refined Palm Oil",
  "Added Sugars / High Fructose Corn Syrup",
  "Artificial Colours (INS 102, 110, 122)",
  "High Sodium / Salt",
  "Monosodium Glutamate (MSG / INS 621)",
  "Hydrogenated Vegetable Oils (Trans Fats)"
];

export function ProfileView({
  onProfileChange
}: {
  onProfileChange: (profile: UserFoodProfile) => void;
}) {
  const [profile, setProfile] = useState<UserFoodProfile>(() => {
    try {
      const saved = localStorage.getItem("foodcue_profile");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      avoidAllergens: ["Peanuts"],
      avoidIngredients: ["Refined Palm Oil"],
      calmMode: false,
      dietaryPattern: "Standard"
    };
  });

  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    localStorage.setItem("foodcue_profile", JSON.stringify(profile));
    onProfileChange(profile);
  }, [profile, onProfileChange]);

  function toggleAllergen(name: string) {
    setProfile((prev) => ({
      ...prev,
      avoidAllergens: prev.avoidAllergens.includes(name)
        ? prev.avoidAllergens.filter((a) => a !== name)
        : [...prev.avoidAllergens, name]
    }));
    triggerNotice();
  }

  function toggleIngredient(name: string) {
    setProfile((prev) => ({
      ...prev,
      avoidIngredients: prev.avoidIngredients.includes(name)
        ? prev.avoidIngredients.filter((i) => i !== name)
        : [...prev.avoidIngredients, name]
    }));
    triggerNotice();
  }

  function triggerNotice() {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  function clearAllPreferences() {
    setProfile({
      avoidAllergens: [],
      avoidIngredients: [],
      calmMode: false,
      dietaryPattern: "Standard"
    });
    triggerNotice();
  }

  return (
    <section className="panel" aria-labelledby="profile-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PERSONALISATION (LOCAL-ONLY)</p>
          <h2 id="profile-heading" className="panel-title-with-icon">
            <User className="title-icon text-brand-green" aria-hidden="true" />
            Food Profile & Dietary Avoid-List
          </h2>
        </div>
        <span className="local-pill">
          <span className="dot" /> Stored 100% on this Device
        </span>
      </div>

      <p className="muted">
        Configure personal dietary preferences and ingredient avoidances. When you scan a product, FoodCue will cross-reference label evidence against your local avoid-list.
      </p>

      {savedNotice && (
        <div className="alert info" role="status">
          ✓ Profile preferences updated in local browser storage.
        </div>
      )}

      {/* Mandatory Safety Notice */}
      <div className="notice mb-20">
        <strong>Self-Reported Allergy & Preference Guardrail:</strong>
        <p>
          Preferences entered here are self-reported and do not constitute a clinical diagnosis or medical prescription. FoodCue highlights matched label evidence but cannot certify individual medical safety.
        </p>
      </div>

      {/* Calm Mode Switch */}
      <div className="setting-card">
        <div className="setting-info">
          <div className="setting-title-row">
            <Sparkles className="btn-icon text-brand-lime" aria-hidden="true" />
            <h3>Calm Mode</h3>
          </div>
          <p className="tiny">
            Reduces visual animations, motion, and intense badges. Critical food-safety and allergen warnings always remain visible.
          </p>
        </div>
        <label className="switch-toggle" aria-label="Toggle Calm Mode">
          <input
            type="checkbox"
            checked={profile.calmMode}
            onChange={(e) => {
              setProfile((prev) => ({ ...prev, calmMode: e.target.checked }));
              triggerNotice();
            }}
          />
          <span className="slider round" />
        </label>
      </div>

      {/* Allergens Avoid List */}
      <div className="profile-section">
        <div className="section-header-row">
          <ShieldAlert className="section-icon text-danger" aria-hidden="true" />
          <div>
            <h3>Allergen Avoidance List</h3>
            <p className="tiny text-muted">Select ingredients or allergens you want flagged on every scan:</p>
          </div>
        </div>

        <div className="chips-grid">
          {COMMON_AVOID_ALLERGENS.map((allergen) => {
            const isSelected = profile.avoidAllergens.includes(allergen);
            return (
              <button
                key={allergen}
                className={`preference-chip ${isSelected ? "selected-chip" : ""}`}
                onClick={() => toggleAllergen(allergen)}
                aria-pressed={isSelected}
              >
                {isSelected && <Check className="chip-check-icon" aria-hidden="true" />}
                <span>{allergen}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ingredients Avoid List */}
      <div className="profile-section mt-24">
        <div className="section-header-row">
          <Sparkles className="section-icon text-warning" aria-hidden="true" />
          <div>
            <h3>Ingredient & Additive Preferences</h3>
            <p className="tiny text-muted">Flag specific oils, sugars, or additives in scanned products:</p>
          </div>
        </div>

        <div className="chips-grid">
          {COMMON_AVOID_INGREDIENTS.map((ing) => {
            const isSelected = profile.avoidIngredients.includes(ing);
            return (
              <button
                key={ing}
                className={`preference-chip ${isSelected ? "selected-chip" : ""}`}
                onClick={() => toggleIngredient(ing)}
                aria-pressed={isSelected}
              >
                {isSelected && <Check className="chip-check-icon" aria-hidden="true" />}
                <span>{ing}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset Section */}
      <div className="profile-footer-actions mt-32">
        <button className="secondary-button compact-btn text-danger" onClick={clearAllPreferences}>
          <Trash2 className="btn-icon" aria-hidden="true" /> Reset All Preferences
        </button>
      </div>
    </section>
  );
}
