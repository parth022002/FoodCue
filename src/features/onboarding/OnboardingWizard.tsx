import React, { useState } from "react";
import {
  User,
  Utensils,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  AlertTriangle,
  Info
} from "lucide-react";
import type { OnboardingApiClient } from "../../services/onboardingApiClient";
import type { FullUserProfileBundle, AllergyStatus } from "../../server/database/repositories/profile.repository";

interface OnboardingWizardProps {
  apiClient: OnboardingApiClient;
  initialName?: string;
  initialEmail?: string;
  initialAvatar?: string;
  onProfileCompleted: (bundle: FullUserProfileBundle) => void;
}

const DIETARY_OPTIONS = [
  { id: "Vegetarian", label: "Vegetarian", desc: "Plant foods and dairy; no meat or eggs" },
  { id: "Vegan", label: "Vegan", desc: "100% plant-based; no animal products" },
  { id: "Eggetarian", label: "Eggetarian", desc: "Vegetarian plus eggs" },
  { id: "Non-vegetarian", label: "Non-Vegetarian", desc: "Omnivorous; includes poultry, seafood & meat" },
  { id: "Jain", label: "Jain", desc: "Strict vegetarian without root vegetables (onions, garlic, potatoes)" },
  { id: "No specific preference", label: "No Specific Preference", desc: "Flexible; no dietary pattern restrictions" }
];

const COMMON_CUISINES = [
  "North Indian",
  "South Indian",
  "Gujarati / Rajasthani",
  "Maharashtrian",
  "Bengali",
  "Continental / Western",
  "Asian / Chinese",
  "Mediterranean / Italian"
];

const COMMON_AVOID_INGREDIENTS = [
  "Refined Palm Oil",
  "Added Sugars / High Fructose Syrup",
  "High Sodium / Salt",
  "Artificial Food Colours (INS 102, 110, 122)",
  "Monosodium Glutamate (MSG / INS 621)",
  "Hydrogenated Vegetable Oils (Trans Fats)"
];

const FSSAI_COMMON_ALLERGENS = [
  "Peanuts",
  "Tree Nuts (Almonds, Cashews, Walnuts)",
  "Milk / Dairy",
  "Egg",
  "Soy / Soybeans",
  "Gluten / Wheat",
  "Fish",
  "Crustaceans / Shellfish",
  "Sesame",
  "Mustard",
  "Sulphites (INS 220-223)"
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  apiClient,
  initialName = "",
  initialEmail = "",
  initialAvatar,
  onProfileCompleted
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Basic Information
  const [fullName, setFullName] = useState(initialName);
  const [country, setCountry] = useState("India");
  const [city, setCity] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");

  // Step 2: Food Preferences
  const [dietaryPattern, setDietaryPattern] = useState("Vegetarian");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(["North Indian"]);
  const [avoidIngredients, setAvoidIngredients] = useState<string[]>(["Refined Palm Oil"]);

  // Step 3: Allergies & Restrictions
  const [allergyChoice, setAllergyChoice] = useState<"none" | "specified" | "undecided">("undecided");
  const [selectedAllergens, setSelectedAllergens] = useState<Array<{ name: string; severity: "mild" | "moderate" | "severe" }>>([]);
  const [customAllergenInput, setCustomAllergenInput] = useState("");
  const [allergyConsent, setAllergyConsent] = useState(false);

  // Loading & error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleCuisine(c: string) {
    setSelectedCuisines((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  }

  function toggleAvoidIngredient(ing: string) {
    setAvoidIngredients((prev) =>
      prev.includes(ing) ? prev.filter((item) => item !== ing) : [...prev, ing]
    );
  }

  function toggleAllergen(name: string) {
    setSelectedAllergens((prev) => {
      const exists = prev.find((a) => a.name === name);
      if (exists) {
        return prev.filter((a) => a.name !== name);
      }
      return [...prev, { name, severity: "moderate" }];
    });
  }

  function addCustomAllergen() {
    const val = customAllergenInput.trim();
    if (!val) return;
    if (!selectedAllergens.find((a) => a.name.toLowerCase() === val.toLowerCase())) {
      setSelectedAllergens((prev) => [...prev, { name: val, severity: "moderate" }]);
    }
    setCustomAllergenInput("");
  }

  async function handleCompleteProfile() {
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Build preferences list
      const preferencesPayload: Array<{ type: string; value: string }> = [
        { type: "dietary_pattern", value: dietaryPattern }
      ];
      for (const cuisine of selectedCuisines) {
        preferencesPayload.push({ type: "favorite_cuisine", value: cuisine });
      }
      for (const ing of avoidIngredients) {
        preferencesPayload.push({ type: "avoid_ingredient", value: ing });
      }

      // Determine allergy status
      let status: AllergyStatus = "NOT_PROVIDED";
      if (allergyChoice === "none") {
        status = "CONFIRMED_NO_ALLERGIES";
      } else if (allergyChoice === "specified" && selectedAllergens.length > 0) {
        status = "ALLERGIES_SPECIFIED";
      }

      const bundle = await apiClient.saveProfile({
        profile: {
          fullName: fullName.trim(),
          profileImageUrl: initialAvatar || null,
          country,
          city: city.trim() || null,
          preferredLanguage,
          onboardingStatus: "PROFILE_COMPLETED"
        },
        preferences: preferencesPayload,
        allergies: allergyChoice === "specified" ? selectedAllergens : [],
        allergyStatus: status,
        onboardingStatus: "PROFILE_COMPLETED"
      });

      // Save locally for instant offline synchronization
      localStorage.setItem("foodcue_user_profile", JSON.stringify({
        fullName: fullName.trim(),
        dietaryPattern,
        avoidAllergens: allergyChoice === "specified" ? selectedAllergens.map((a) => a.name) : [],
        avoidIngredients
      }));

      onProfileCompleted(bundle);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="onboarding-wizard-container">
      <div className="onboarding-wizard-card">
        {/* Header with Progress Steps */}
        <div className="onboarding-header">
          <div className="onboarding-brand-badge">
            <Sparkles className="brand-icon text-brand-green" aria-hidden="true" />
            <span>Welcome to FoodCue</span>
          </div>
          <h2 className="onboarding-title">Let’s Personalize Your Food Experience</h2>
          <p className="onboarding-subtitle">
            Tell us a little about your kitchen and dietary preferences so we can tailor ingredient alerts and nutritional scores.
          </p>

          {/* Stepper Indicator */}
          <div className="onboarding-stepper" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={4}>
            <div className={`step-item ${step >= 1 ? "active" : ""}`}>
              <div className="step-circle">{step > 1 ? <Check className="check-icon" /> : "1"}</div>
              <span className="step-label">Basic Info</span>
            </div>
            <div className={`step-connector ${step >= 2 ? "active" : ""}`} />
            <div className={`step-item ${step >= 2 ? "active" : ""}`}>
              <div className="step-circle">{step > 2 ? <Check className="check-icon" /> : "2"}</div>
              <span className="step-label">Diet & Taste</span>
            </div>
            <div className={`step-connector ${step >= 3 ? "active" : ""}`} />
            <div className={`step-item ${step >= 3 ? "active" : ""}`}>
              <div className="step-circle">{step > 3 ? <Check className="check-icon" /> : "3"}</div>
              <span className="step-label">Allergies</span>
            </div>
            <div className={`step-connector ${step >= 4 ? "active" : ""}`} />
            <div className={`step-item ${step >= 4 ? "active" : ""}`}>
              <div className="step-circle">4</div>
              <span className="step-label">Review</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="onboarding-alert-error" role="alert">
            <AlertTriangle className="alert-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: BASIC INFORMATION */}
        {step === 1 && (
          <section className="onboarding-step-body" aria-labelledby="step1-heading">
            <div className="step-intro">
              <div className="step-intro-icon bg-emerald-50 text-brand-green">
                <User className="icon-md" />
              </div>
              <div>
                <h3 id="step1-heading" className="step-heading">Personal Information</h3>
                <p className="step-text">Used for personalized greetings and localized food databases.</p>
              </div>
            </div>

            <div className="form-group-grid mt-16">
              <div className="form-field full-width">
                <label htmlFor="input-fullname" className="field-label required">Full Name</label>
                <input
                  id="input-fullname"
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-text"
                />
              </div>

              <div className="form-field">
                <label htmlFor="input-country" className="field-label">Country</label>
                <input
                  id="input-country"
                  type="text"
                  placeholder="India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="input-text"
                />
              </div>

              <div className="form-field">
                <label htmlFor="input-city" className="field-label">City (Optional)</label>
                <input
                  id="input-city"
                  type="text"
                  placeholder="e.g. Mumbai, Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-text"
                />
              </div>

              <div className="form-field full-width">
                <label htmlFor="input-language" className="field-label">Preferred Interface Language</label>
                <select
                  id="input-language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="input-select"
                >
                  <option value="en">English (Default)</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="gu">Gujarati (ગુજરાતી)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                </select>
              </div>
            </div>

            <div className="step-navigation-footer">
              <div className="optional-note">
                <Info className="tiny-icon" />
                <span>We never share your personal information without explicit consent.</span>
              </div>
              <button
                type="button"
                className="btn-primary-next"
                onClick={() => {
                  if (!fullName.trim()) {
                    setErrorMessage("Please enter your name.");
                    return;
                  }
                  setErrorMessage(null);
                  setStep(2);
                }}
              >
                <span>Continue to Diet & Taste</span>
                <ArrowRight className="btn-icon" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: FOOD PREFERENCES */}
        {step === 2 && (
          <section className="onboarding-step-body" aria-labelledby="step2-heading">
            <div className="step-intro">
              <div className="step-intro-icon bg-lime-50 text-lime-700">
                <Utensils className="icon-md" />
              </div>
              <div>
                <h3 id="step2-heading" className="step-heading">Dietary & Food Preferences</h3>
                <p className="step-text">Choose your dietary pattern and ingredients you prefer to flag on packaging.</p>
              </div>
            </div>

            {/* Dietary Patterns */}
            <div className="section-block mt-16">
              <label className="block-label">Select Your Dietary Pattern:</label>
              <div className="dietary-cards-grid">
                {DIETARY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`dietary-card ${dietaryPattern === opt.id ? "selected" : ""}`}
                    onClick={() => setDietaryPattern(opt.id)}
                  >
                    <div className="dietary-card-header">
                      <span className="dietary-name">{opt.label}</span>
                      {dietaryPattern === opt.id && <Check className="check-pill" />}
                    </div>
                    <p className="dietary-desc">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients to Avoid */}
            <div className="section-block mt-20">
              <label className="block-label">Ingredients You Prefer to Flag / Avoid:</label>
              <div className="chips-wrap mt-8">
                {COMMON_AVOID_INGREDIENTS.map((ing) => {
                  const isChecked = avoidIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      className={`chip-button ${isChecked ? "active" : ""}`}
                      onClick={() => toggleAvoidIngredient(ing)}
                    >
                      {isChecked && <Check className="chip-check" />}
                      <span>{ing}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cuisines */}
            <div className="section-block mt-20">
              <label className="block-label">Favorite Cuisines:</label>
              <div className="chips-wrap mt-8">
                {COMMON_CUISINES.map((c) => {
                  const isChecked = selectedCuisines.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`chip-button ${isChecked ? "active" : ""}`}
                      onClick={() => toggleCuisine(c)}
                    >
                      {isChecked && <Check className="chip-check" />}
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="step-navigation-footer">
              <button
                type="button"
                className="btn-secondary-back"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="btn-icon" />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-next"
                onClick={() => setStep(3)}
              >
                <span>Continue to Allergies</span>
                <ArrowRight className="btn-icon" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: ALLERGIES & RESTRICTIONS */}
        {step === 3 && (
          <section className="onboarding-step-body" aria-labelledby="step3-heading">
            <div className="step-intro">
              <div className="step-intro-icon bg-amber-50 text-amber-700">
                <ShieldAlert className="icon-md" />
              </div>
              <div>
                <h3 id="step3-heading" className="step-heading">Allergies & Food Restrictions</h3>
                <p className="step-text">Sensitive health information. Kept strictly private by default.</p>
              </div>
            </div>

            {/* Status Radio Choice */}
            <div className="allergy-choice-group mt-16" role="radiogroup" aria-label="Food Allergy Declaration">
              <label className={`allergy-choice-card ${allergyChoice === "none" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="allergyChoice"
                  checked={allergyChoice === "none"}
                  onChange={() => {
                    setAllergyChoice("none");
                    setSelectedAllergens([]);
                  }}
                />
                <div>
                  <strong>I have NO known food allergies</strong>
                  <p className="tiny-desc">You do not have any declared food allergies or medical dietary restrictions.</p>
                </div>
              </label>

              <label className={`allergy-choice-card ${allergyChoice === "specified" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="allergyChoice"
                  checked={allergyChoice === "specified"}
                  onChange={() => setAllergyChoice("specified")}
                />
                <div>
                  <strong>I have specific food allergies to flag</strong>
                  <p className="tiny-desc">FoodCue will prominently highlight products containing these ingredients.</p>
                </div>
              </label>

              <label className={`allergy-choice-card ${allergyChoice === "undecided" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="allergyChoice"
                  checked={allergyChoice === "undecided"}
                  onChange={() => {
                    setAllergyChoice("undecided");
                    setSelectedAllergens([]);
                  }}
                />
                <div>
                  <strong>Skip for now (Not provided)</strong>
                  <p className="tiny-desc">You can configure your allergy filters later in your profile settings.</p>
                </div>
              </label>
            </div>

            {/* If specified allergies */}
            {allergyChoice === "specified" && (
              <div className="allergy-selection-panel mt-20">
                <label className="block-label">Select Mandatory FSSAI / Global Allergens to Flag:</label>
                <div className="chips-wrap mt-8">
                  {FSSAI_COMMON_ALLERGENS.map((allergen) => {
                    const isChecked = Boolean(selectedAllergens.find((a) => a.name === allergen));
                    return (
                      <button
                        key={allergen}
                        type="button"
                        className={`chip-button allergen-chip ${isChecked ? "active" : ""}`}
                        onClick={() => toggleAllergen(allergen)}
                      >
                        {isChecked && <Check className="chip-check" />}
                        <span>{allergen}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Allergen Entry */}
                <div className="custom-allergen-row mt-16">
                  <input
                    type="text"
                    placeholder="Enter custom allergen (e.g. Pine nuts, Kiwi)"
                    value={customAllergenInput}
                    onChange={(e) => setCustomAllergenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomAllergen();
                      }
                    }}
                    className="input-text compact"
                  />
                  <button
                    type="button"
                    onClick={addCustomAllergen}
                    className="btn-secondary-sm"
                  >
                    Add
                  </button>
                </div>

                {/* Explicit Consent & Medical Disclaimer */}
                <div className="allergy-consent-box mt-20">
                  <label className="consent-checkbox-row">
                    <input
                      type="checkbox"
                      checked={allergyConsent}
                      onChange={(e) => setAllergyConsent(e.target.checked)}
                      required
                    />
                    <span className="consent-text">
                      <strong>Explicit Consent & Safety Acknowledgment:</strong> I consent to FoodCue storing these allergy declarations for my account. I understand that FoodCue provides automated educational label guidance and does not replace official product packaging or medical advice.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="step-navigation-footer">
              <button
                type="button"
                className="btn-secondary-back"
                onClick={() => setStep(2)}
              >
                <ArrowLeft className="btn-icon" />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-next"
                disabled={allergyChoice === "specified" && (!allergyConsent || selectedAllergens.length === 0)}
                onClick={() => {
                  if (allergyChoice === "specified" && !allergyConsent) {
                    setErrorMessage("Please check the consent checkbox to save allergy declarations.");
                    return;
                  }
                  setErrorMessage(null);
                  setStep(4);
                }}
              >
                <span>Review Profile</span>
                <ArrowRight className="btn-icon" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {step === 4 && (
          <section className="onboarding-step-body" aria-labelledby="step4-heading">
            <div className="step-intro">
              <div className="step-intro-icon bg-emerald-50 text-brand-green">
                <CheckCircle2 className="icon-md" />
              </div>
              <div>
                <h3 id="step4-heading" className="step-heading">Review & Confirm Profile</h3>
                <p className="step-text">Verify your details before launching into household setup and your kitchen.</p>
              </div>
            </div>

            <div className="review-summary-container mt-16">
              {/* Summary 1: Basic Info */}
              <div className="review-section-card">
                <div className="card-top-row">
                  <span className="section-title">Personal Information</span>
                  <button type="button" className="edit-btn" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="review-items-grid">
                  <div><span className="lbl">Name:</span> <strong>{fullName}</strong></div>
                  <div><span className="lbl">Email:</span> <strong>{initialEmail || "Verified Session"}</strong></div>
                  <div><span className="lbl">Location:</span> <strong>{city ? `${city}, ${country}` : country}</strong></div>
                  <div><span className="lbl">Language:</span> <strong>{preferredLanguage.toUpperCase()}</strong></div>
                </div>
              </div>

              {/* Summary 2: Food Preferences */}
              <div className="review-section-card">
                <div className="card-top-row">
                  <span className="section-title">Food & Dietary Preferences</span>
                  <button type="button" className="edit-btn" onClick={() => setStep(2)}>Edit</button>
                </div>
                <div className="review-items-grid">
                  <div><span className="lbl">Diet:</span> <strong>{dietaryPattern}</strong></div>
                  <div><span className="lbl">Avoid:</span> <strong>{avoidIngredients.join(", ") || "None"}</strong></div>
                  <div className="full-width"><span className="lbl">Favorite Cuisines:</span> <strong>{selectedCuisines.join(", ") || "All"}</strong></div>
                </div>
              </div>

              {/* Summary 3: Allergies */}
              <div className="review-section-card">
                <div className="card-top-row">
                  <span className="section-title">Allergies & Food Restrictions</span>
                  <button type="button" className="edit-btn" onClick={() => setStep(3)}>Edit</button>
                </div>
                <div className="review-items-grid">
                  <div className="full-width">
                    <span className="lbl">Status:</span>{" "}
                    <strong>
                      {allergyChoice === "none" && "Confirmed no known food allergies"}
                      {allergyChoice === "specified" && `${selectedAllergens.length} Allergens Flagged: ${selectedAllergens.map((a) => a.name).join(", ")}`}
                      {allergyChoice === "undecided" && "Not provided (Skipped)"}
                    </strong>
                  </div>
                  {allergyChoice === "specified" && (
                    <div className="full-width text-xs text-muted mt-4">
                      Allergy sharing is disabled by default. You can explicitly share this with household members in household settings.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="step-navigation-footer">
              <button
                type="button"
                className="btn-secondary-back"
                onClick={() => setStep(3)}
                disabled={isSubmitting}
              >
                <ArrowLeft className="btn-icon" />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-confirm"
                onClick={handleCompleteProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Saving Profile...</span>
                ) : (
                  <>
                    <span>Confirm & Continue to Household Setup</span>
                    <ArrowRight className="btn-icon" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
