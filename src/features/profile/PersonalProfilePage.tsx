import React, { useState, useEffect, useMemo, useRef } from "react";
import { useUser, useAuth, SignInButton, SignOutButton } from "@clerk/react";
import {
  User,
  Mail,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Heart,
  ThumbsDown,
  Utensils,
  Users,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  Camera,
  Trash2,
  Plus,
  X,
  ArrowLeft,
  Loader2,
  Calendar,
  KeyRound,
  Compass,
  FileCheck
} from "lucide-react";
import type { OnboardingApiClient } from "../../services/onboardingApiClient";
import type {
  AllergyStatus
} from "../../server/database/repositories/profile.repository";
import type {
  HouseholdRecord,
  HouseholdMemberRole,
  HouseholdMemberWithProfile
} from "../../server/database/repositories/household.repository";

export interface PersonalProfilePageProps {
  apiClient: OnboardingApiClient;
  currentHousehold?: HouseholdRecord | null;
  onNavigateToDashboard: () => void;
  onNavigateToHousehold?: () => void;
  onNavigateToPrivacy?: () => void;
}

// Common Suggestion Dictionaries
const SUGGESTED_DIETARY_PATTERNS = [
  "Vegetarian",
  "Vegan",
  "Eggetarian",
  "Non-vegetarian",
  "Jain",
  "Halal",
  "Keto",
  "Gluten-Free",
  "No specific preference"
];

const SUGGESTED_FOOD_LIKES = [
  "Fruits",
  "Leafy Vegetables",
  "Dairy / Paneer",
  "Nuts & Seeds",
  "Whole Grains",
  "Lentils / Pulses",
  "Healthy Snacks",
  "Spices",
  "Oats",
  "Berries",
  "Dark Chocolate"
];

const SUGGESTED_FOOD_DISLIKES = [
  "Bitter Gourd (Karela)",
  "Okra (Bhindi)",
  "Cilantro / Coriander",
  "Mushrooms",
  "Eggplant (Brinjal)",
  "Seafood",
  "Added Sugars",
  "Excess Oil / Fried Foods",
  "Artificial Flavours",
  "High Sodium"
];

const SUGGESTED_CUISINES = [
  "Indian",
  "North Indian",
  "South Indian",
  "Gujarati",
  "Punjabi",
  "Rajasthani",
  "Chinese",
  "Italian",
  "Mexican",
  "Continental",
  "Mediterranean"
];

const SUGGESTED_INGREDIENTS = [
  "Oats",
  "Basmati Rice",
  "Whole Wheat",
  "Moong Dal",
  "Paneer",
  "Almonds",
  "Chickpeas",
  "Olive Oil",
  "Curd / Yogurt"
];

const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree Nuts (Almonds, Cashews, Walnuts)",
  "Milk / Dairy",
  "Eggs",
  "Soy / Soybeans",
  "Gluten / Wheat",
  "Fish",
  "Crustaceans / Shellfish",
  "Sesame",
  "Mustard",
  "Sulphites"
];

const COMMON_RESTRICTIONS = [
  "Lactose Intolerance",
  "Gluten Avoidance",
  "Low Sodium / Salt",
  "Refined Palm Oil Avoidance",
  "Trans Fat Avoidance",
  "High Fructose Corn Syrup Avoidance",
  "Artificial Colours Avoidance",
  "MSG Avoidance"
];

export const PersonalProfilePage: React.FC<PersonalProfilePageProps> = ({
  apiClient,
  currentHousehold,
  onNavigateToDashboard,
  onNavigateToHousehold,
  onNavigateToPrivacy
}) => {
  const { user, isSignedIn, isLoaded: isUserLoaded } = useUser();
  const { signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & Global States
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Form Fields - Section 2: Personal Information
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Form Fields - Section 3: Food Preferences
  const [dietaryPatterns, setDietaryPatterns] = useState<string[]>(["Standard"]);
  const [foodLikes, setFoodLikes] = useState<string[]>([]);
  const [foodDislikes, setFoodDislikes] = useState<string[]>([]);
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [preferredIngredients, setPreferredIngredients] = useState<string[]>([]);
  const [foodRestrictions, setFoodRestrictions] = useState<string[]>([]);

  // Custom Input Helpers
  const [customLike, setCustomLike] = useState("");
  const [customDislike, setCustomDislike] = useState("");
  const [customCuisine, setCustomCuisine] = useState("");
  const [customIngredient, setCustomIngredient] = useState("");

  // Form Fields - Section 4: Allergies & Restrictions
  const [allergyStatus, setAllergyStatus] = useState<AllergyStatus>("NOT_PROVIDED");
  const [allergies, setAllergies] = useState<
    Array<{
      name: string;
      category?: string;
      severity?: "mild" | "moderate" | "severe";
      notes?: string;
    }>
  >([]);
  const [customAllergenName, setCustomAllergenName] = useState("");
  const [customAllergenCategory, setCustomAllergenCategory] = useState("food");
  const [customAllergenSeverity, setCustomAllergenSeverity] = useState<"mild" | "moderate" | "severe">("moderate");
  const [customAllergenNotes, setCustomAllergenNotes] = useState("");
  const [safetyConsentAcknowledged, setSafetyConsentAcknowledged] = useState(false);

  // Form Fields - Section 5 & 6: Household & Sharing
  const [userHouseholds, setUserHouseholds] = useState<
    Array<HouseholdRecord & { userRole: HouseholdMemberRole; memberCount: number }>
  >([]);
  const [activeHouseholdMembers, setActiveHouseholdMembers] = useState<HouseholdMemberWithProfile[]>([]);
  const [shareDietary, setShareDietary] = useState(true);
  const [shareAllergies, setShareAllergies] = useState(false);
  const [shareLikesDislikes, setShareLikesDislikes] = useState(false);
  const [shareHealthGoals, setShareHealthGoals] = useState(false);

  // Section 9: Delete Account Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Unsaved Changes Discard Modal State
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  // Initial Snapshot for Dirty-State Detection
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  // Field Level Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Profile and Household Data
  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    async function loadData() {
      try {
        const bundle = await apiClient.getProfile();
        const households = await apiClient.listHouseholds();

        if (!isMounted) return;

        setUserHouseholds(households);

        // Populate Profile Fields
        const prof = bundle.profile;
        const nameVal = prof?.fullName || user?.fullName || user?.firstName || "";
        setFullName(nameVal);
        setAge(prof?.age ?? null);
        setGender(prof?.gender || "");
        setCountry(prof?.country || "India");
        setState(prof?.state || "");
        setCity(prof?.city || "");
        setPreferredLanguage(prof?.preferredLanguage || "en");
        setTimezone(prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
        setProfileImageUrl(prof?.profileImageUrl || user?.imageUrl || null);

        // Group preferences by type
        const diets: string[] = [];
        const likes: string[] = [];
        const dislikes: string[] = [];
        const cuisines: string[] = [];
        const ingredients: string[] = [];
        const restrictions: string[] = [];

        for (const p of bundle.preferences) {
          if (p.preferenceType === "dietary_pattern") diets.push(p.preferenceValue);
          else if (p.preferenceType === "food_like") likes.push(p.preferenceValue);
          else if (p.preferenceType === "food_dislike") dislikes.push(p.preferenceValue);
          else if (p.preferenceType === "preferred_cuisine") cuisines.push(p.preferenceValue);
          else if (p.preferenceType === "preferred_ingredient") ingredients.push(p.preferenceValue);
          else if (p.preferenceType === "food_restriction") restrictions.push(p.preferenceValue);
        }

        setDietaryPatterns(diets.length > 0 ? diets : ["Standard"]);
        setFoodLikes(likes);
        setFoodDislikes(dislikes);
        setPreferredCuisines(cuisines);
        setPreferredIngredients(ingredients);
        setFoodRestrictions(restrictions);

        // Populate Allergies
        setAllergies(
          bundle.allergies.map((a) => ({
            name: a.allergenName,
            category: a.allergenCategory,
            severity: a.severity,
            notes: a.notes || undefined
          }))
        );
        setAllergyStatus(bundle.allergyStatus);
        setSafetyConsentAcknowledged(bundle.allergyStatus !== "NOT_PROVIDED");

        // Load Active Household details if available
        const activeHh = currentHousehold || households[0];
        if (activeHh) {
          try {
            const details = await apiClient.getHouseholdDetails(activeHh.id);
            if (isMounted) setActiveHouseholdMembers(details.members);

            const sharing = await apiClient.getSharingPreferences(activeHh.id);
            if (isMounted) {
              for (const s of sharing) {
                if (s.informationCategory === "dietary_preferences") setShareDietary(s.sharingEnabled);
                if (s.informationCategory === "allergies") setShareAllergies(s.sharingEnabled);
                if (s.informationCategory === "food_likes") setShareLikesDislikes(s.sharingEnabled);
                if (s.informationCategory === "health_goals") setShareHealthGoals(s.sharingEnabled);
              }
            }
          } catch {
            // Non-fatal if household details fail
          }
        }

        // Capture snapshot
        const snapshot = JSON.stringify({
          fullName: nameVal,
          age: prof?.age ?? null,
          gender: prof?.gender || "",
          country: prof?.country || "India",
          state: prof?.state || "",
          city: prof?.city || "",
          preferredLanguage: prof?.preferredLanguage || "en",
          timezone: prof?.timezone || "Asia/Kolkata",
          profileImageUrl: prof?.profileImageUrl || user?.imageUrl || null,
          dietaryPatterns: diets.length > 0 ? diets : ["Standard"],
          foodLikes: likes,
          foodDislikes: dislikes,
          preferredCuisines: cuisines,
          preferredIngredients: ingredients,
          foodRestrictions: restrictions,
          allergies: bundle.allergies.map((a) => ({
            name: a.allergenName,
            category: a.allergenCategory,
            severity: a.severity
          })),
          allergyStatus: bundle.allergyStatus
        });
        setInitialSnapshot(snapshot);
      } catch (err) {
        if (isMounted) {
          setFetchError(err instanceof Error ? err.message : "Failed to load profile data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isSignedIn, apiClient, currentHousehold?.id, user?.id]);

  // Compute Current State JSON for Dirty-State Comparison
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      fullName,
      age,
      gender,
      country,
      state,
      city,
      preferredLanguage,
      timezone,
      profileImageUrl,
      dietaryPatterns,
      foodLikes,
      foodDislikes,
      preferredCuisines,
      preferredIngredients,
      foodRestrictions,
      allergies: allergies.map((a) => ({
        name: a.name,
        category: a.category || "food",
        severity: a.severity || "moderate"
      })),
      allergyStatus
    });
  }, [
    fullName,
    age,
    gender,
    country,
    state,
    city,
    preferredLanguage,
    timezone,
    profileImageUrl,
    dietaryPatterns,
    foodLikes,
    foodDislikes,
    preferredCuisines,
    preferredIngredients,
    foodRestrictions,
    allergies,
    allergyStatus
  ]);

  const isDirty = initialSnapshot !== "" && initialSnapshot !== currentSnapshot;

  // Window beforeunload warning
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Profile Strength Calculation
  const profileCompletionPercentage = useMemo(() => {
    let score = 0;
    if (fullName.trim().length > 1) score += 20;
    if (age !== null && age > 0) score += 10;
    if (gender && gender !== "") score += 10;
    if (city.trim().length > 0 || state.trim().length > 0) score += 10;
    if (dietaryPatterns.length > 0 && dietaryPatterns[0] !== "No specific preference") score += 20;
    if (foodLikes.length > 0 || foodDislikes.length > 0) score += 15;
    if (allergyStatus !== "NOT_PROVIDED") score += 15;
    return Math.min(100, score);
  }, [fullName, age, gender, city, state, dietaryPatterns, foodLikes, foodDislikes, allergyStatus]);

  // Avatar Upload Handler
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      alert("Please upload a valid image file (PNG, JPEG, or WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image file size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setProfileImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setProfileImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Preference Toggle Helpers
  function toggleDietaryPattern(pat: string) {
    if (pat === "No specific preference") {
      setDietaryPatterns(["No specific preference"]);
      return;
    }
    setDietaryPatterns((prev) => {
      const filtered = prev.filter((p) => p !== "No specific preference");
      return filtered.includes(pat) ? filtered.filter((p) => p !== pat) : [...filtered, pat];
    });
  }

  function addFoodLike(item: string) {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (!foodLikes.includes(trimmed)) {
      setFoodLikes((prev) => [...prev, trimmed]);
    }
    setCustomLike("");
  }

  function removeFoodLike(item: string) {
    setFoodLikes((prev) => prev.filter((i) => i !== item));
  }

  function addFoodDislike(item: string) {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (!foodDislikes.includes(trimmed)) {
      setFoodDislikes((prev) => [...prev, trimmed]);
    }
    setCustomDislike("");
  }

  function removeFoodDislike(item: string) {
    setFoodDislikes((prev) => prev.filter((i) => i !== item));
  }

  function addCuisine(c: string) {
    const trimmed = c.trim();
    if (!trimmed) return;
    if (!preferredCuisines.includes(trimmed)) {
      setPreferredCuisines((prev) => [...prev, trimmed]);
    }
    setCustomCuisine("");
  }

  function removeCuisine(c: string) {
    setPreferredCuisines((prev) => prev.filter((item) => item !== c));
  }

  function addIngredient(ing: string) {
    const trimmed = ing.trim();
    if (!trimmed) return;
    if (!preferredIngredients.includes(trimmed)) {
      setPreferredIngredients((prev) => [...prev, trimmed]);
    }
    setCustomIngredient("");
  }

  function removeIngredient(ing: string) {
    setPreferredIngredients((prev) => prev.filter((item) => item !== ing));
  }

  function toggleRestriction(r: string) {
    setFoodRestrictions((prev) => (prev.includes(r) ? prev.filter((i) => i !== r) : [...prev, r]));
  }

  // Allergy Management Helpers
  function toggleCommonAllergen(name: string) {
    setAllergyStatus("ALLERGIES_SPECIFIED");
    const existing = allergies.find((a) => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setAllergies((prev) => prev.filter((a) => a.name.toLowerCase() !== name.toLowerCase()));
    } else {
      setAllergies((prev) => [
        ...prev,
        {
          name,
          category: "food",
          severity: "moderate"
        }
      ]);
    }
  }

  function handleAddCustomAllergen(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customAllergenName.trim();
    if (!trimmed) return;

    setAllergyStatus("ALLERGIES_SPECIFIED");
    if (!allergies.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      setAllergies((prev) => [
        ...prev,
        {
          name: trimmed,
          category: customAllergenCategory,
          severity: customAllergenSeverity,
          notes: customAllergenNotes.trim() || undefined
        }
      ]);
    }
    setCustomAllergenName("");
    setCustomAllergenNotes("");
  }

  function removeAllergy(name: string) {
    setAllergies((prev) => {
      const updated = prev.filter((a) => a.name !== name);
      if (updated.length === 0 && allergyStatus === "ALLERGIES_SPECIFIED") {
        setAllergyStatus("CONFIRMED_NO_ALLERGIES");
      }
      return updated;
    });
  }

  // Save Changes Handler
  async function handleSaveChanges() {
    // Validate inputs
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }
    if (age !== null && (age < 1 || age > 120)) {
      newErrors.age = "Please enter a realistic age between 1 and 120.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaveStatus("error");
      setSaveErrorMessage("Please fix highlighted errors before saving.");
      return;
    }
    setErrors({});

    setSaveStatus("saving");
    setSaveErrorMessage(null);

    try {
      // 1. Compile Preferences Array
      const preferencesPayload: Array<{ type: string; value: string }> = [];
      dietaryPatterns.forEach((dp) => preferencesPayload.push({ type: "dietary_pattern", value: dp }));
      foodLikes.forEach((l) => preferencesPayload.push({ type: "food_like", value: l }));
      foodDislikes.forEach((d) => preferencesPayload.push({ type: "food_dislike", value: d }));
      preferredCuisines.forEach((c) => preferencesPayload.push({ type: "preferred_cuisine", value: c }));
      preferredIngredients.forEach((i) => preferencesPayload.push({ type: "preferred_ingredient", value: i }));
      foodRestrictions.forEach((r) => preferencesPayload.push({ type: "food_restriction", value: r }));

      // 2. Submit Atomic Profile Payload
      await apiClient.saveProfile({
        profile: {
          fullName: fullName.trim(),
          age: age || null,
          gender: gender || null,
          country: country.trim() || "India",
          state: state.trim() || null,
          city: city.trim() || null,
          preferredLanguage: preferredLanguage || "en",
          timezone: timezone || "Asia/Kolkata",
          profileImageUrl: profileImageUrl || null
        },
        preferences: preferencesPayload,
        allergies: allergyStatus === "ALLERGIES_SPECIFIED" ? allergies : [],
        allergyStatus
      });

      // 3. Update Sharing Preferences if user has an active household
      const activeHh = currentHousehold || userHouseholds[0];
      if (activeHh) {
        await Promise.all([
          apiClient.setSharingPreference(activeHh.id, "dietary_preferences", shareDietary),
          apiClient.setSharingPreference(activeHh.id, "allergies", shareAllergies),
          apiClient.setSharingPreference(activeHh.id, "food_likes", shareLikesDislikes),
          apiClient.setSharingPreference(activeHh.id, "health_goals", shareHealthGoals)
        ]);
      }

      // 4. Update initialSnapshot so isDirty resets
      setInitialSnapshot(currentSnapshot);
      setSaveStatus("success");

      setTimeout(() => {
        setSaveStatus("idle");
      }, 3500);
    } catch (err) {
      setSaveStatus("error");
      setSaveErrorMessage(err instanceof Error ? err.message : "Failed to save profile changes.");
    }
  }

  // Account Deletion Handler
  async function handleConfirmDeleteAccount() {
    if (deleteConfirmationText.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Please type "DELETE" exactly to confirm.');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError(null);

    try {
      await apiClient.deleteAccount();

      // Sign out from Clerk
      if (signOut) {
        await signOut();
      }

      // Clear local storage and redirect to dashboard/home
      localStorage.removeItem("foodcue_profile");
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setIsDeletingAccount(false);
    }
  }

  // Handle Back to Dashboard click with dirty check
  function handleBackClick() {
    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      onNavigateToDashboard();
    }
  }

  // Check if current user is owner of any household with other members
  const ownedHouseholdWithMembers = useMemo(() => {
    return userHouseholds.find((h) => h.userRole === "owner" && h.memberCount > 1);
  }, [userHouseholds]);

  // Loading skeleton view
  if (loading || !isUserLoaded) {
    return (
      <div className="profile-page-shell" aria-busy="true">
        <div className="profile-page-skeleton">
          <div className="skeleton-bar header-skeleton" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  // Unauthenticated fallback view
  if (!isSignedIn) {
    return (
      <div className="profile-page-shell">
        <div className="profile-auth-prompt-card panel text-center">
          <User className="w-16 h-16 text-brand-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-deep-leaf mb-2">Sign In to View Your Profile</h2>
          <p className="text-muted max-w-md mx-auto mb-6">
            Please sign in or create an account to customize your personal dietary preferences, allergy alerts, and household kitchen management.
          </p>
          <div className="flex justify-center gap-4">
            <SignInButton mode="modal">
              <button type="button" className="btn-primary">
                Sign In
              </button>
            </SignInButton>
            <button type="button" className="btn-secondary" onClick={onNavigateToDashboard}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") ||
    fullName.slice(0, 2).toUpperCase() ||
    "FC";

  return (
    <div className="profile-page-shell" aria-labelledby="profile-title">
      {/* Top Breadcrumb & Action Row */}
      <div className="profile-top-bar">
        <button
          type="button"
          className="profile-back-link"
          onClick={handleBackClick}
          aria-label="Return to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {isDirty && (
          <div className="unsaved-badge-pill" role="status">
            <span className="dot pulse" />
            <span>Unsaved Changes</span>
          </div>
        )}
      </div>

      {/* Global Error Banner if initial fetch failed */}
      {fetchError && (
        <div className="profile-alert-banner banner-danger mb-6" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <strong>Unable to load complete profile:</strong> {fetchError}
          </div>
          <button
            type="button"
            className="btn-ghost-sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* SECTION 1: PROFILE HEADER */}
      <section className="profile-hero-card mb-8" aria-label="Profile Header">
        <div className="profile-hero-flex">
          {/* Avatar with Upload & Remove Controls */}
          <div className="profile-avatar-control-col">
            <div className="profile-avatar-wrapper large">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={fullName || "User Avatar"}
                  className="hero-avatar-img large"
                />
              ) : (
                <div className="hero-avatar-initials large">{userInitials}</div>
              )}
            </div>

            <div className="avatar-actions-row">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoUpload}
                aria-label="Upload Profile Photo"
              />
              <button
                type="button"
                className="btn-avatar-action"
                onClick={() => fileInputRef.current?.click()}
                title="Upload new profile photo"
              >
                <Camera className="w-3.5 h-3.5 mr-1" />
                <span>Upload</span>
              </button>

              {profileImageUrl && (
                <button
                  type="button"
                  className="btn-avatar-action text-danger"
                  onClick={handleRemovePhoto}
                  title="Remove profile photo"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          {/* User Details & Strength */}
          <div className="profile-hero-info">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="user-status-pill signed-in-pill">
                <span className="dot" />
                Verified Account
              </span>
              {currentHousehold ? (
                <span className="user-status-pill bg-indigo-50 text-indigo-700 border-indigo-200">
                  <Users className="w-3 h-3 mr-1" />
                  Household: {currentHousehold.name}
                </span>
              ) : (
                <span className="user-status-pill bg-slate-100 text-slate-700">
                  Personal Mode (Solo)
                </span>
              )}
            </div>

            <h1 id="profile-title" className="profile-user-name">
              {fullName || "FoodCue Member"}
            </h1>

            <div className="profile-meta-row">
              <span className="profile-meta-item">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{userEmail}</span>
                <span className="verified-badge-mini" title="Verified by Clerk">
                  <CheckCircle className="w-3 h-3 text-emerald-600 inline ml-1" />
                </span>
              </span>

              {user?.createdAt && (
                <span className="profile-meta-item">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </span>
                </span>
              )}
            </div>

            {/* Profile Completion Strength Bar */}
            <div className="profile-strength-widget mt-4">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-600 font-medium">Profile Completeness</span>
                <span className="text-brand-green font-bold">{profileCompletionPercentage}%</span>
              </div>
              <div className="profile-strength-track">
                <div
                  className="profile-strength-fill"
                  style={{ width: `${profileCompletionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: PERSONAL INFORMATION */}
      <section className="profile-section-card mb-8" aria-labelledby="section-personal-info">
        <div className="section-card-header">
          <div className="header-title-group">
            <div className="icon-pill bg-brand-light">
              <User className="pill-icon-svg text-brand" />
            </div>
            <div>
              <h2 id="section-personal-info" className="section-card-title">
                Personal Information
              </h2>
              <p className="tiny text-muted">
                Basic demographics to calibrate portion estimates and regional food regulatory warnings.
              </p>
            </div>
          </div>
        </div>

        <div className="section-card-content mt-6">
          <div className="form-grid-2col">
            {/* Full Name */}
            <div className="form-field-group">
              <label htmlFor="input-full-name" className="form-label required">
                Full Name
              </label>
              <input
                id="input-full-name"
                type="text"
                className={`form-input-text ${errors.fullName ? "input-error" : ""}`}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                required
              />
              {errors.fullName && <p className="field-error-text">{errors.fullName}</p>}
            </div>

            {/* Age */}
            <div className="form-field-group">
              <label htmlFor="input-age" className="form-label">
                Age (Optional)
              </label>
              <input
                id="input-age"
                type="number"
                min="1"
                max="120"
                className={`form-input-text ${errors.age ? "input-error" : ""}`}
                value={age !== null ? age : ""}
                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="e.g. 28"
              />
              {errors.age && <p className="field-error-text">{errors.age}</p>}
              <span className="field-hint">Used strictly for portion size and age-specific caffeine/sugar advice.</span>
            </div>

            {/* Gender */}
            <div className="form-field-group">
              <label htmlFor="select-gender" className="form-label">
                Gender (Optional)
              </label>
              <select
                id="select-gender"
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Country */}
            <div className="form-field-group">
              <label htmlFor="input-country" className="form-label">
                Country
              </label>
              <input
                id="input-country"
                type="text"
                className="form-input-text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. India"
              />
            </div>

            {/* State */}
            <div className="form-field-group">
              <label htmlFor="input-state" className="form-label">
                State / Province (Optional)
              </label>
              <input
                id="input-state"
                type="text"
                className="form-input-text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>

            {/* City */}
            <div className="form-field-group">
              <label htmlFor="input-city" className="form-label">
                City (Optional)
              </label>
              <input
                id="input-city"
                type="text"
                className="form-input-text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
              />
            </div>

            {/* Preferred Language */}
            <div className="form-field-group">
              <label htmlFor="select-language" className="form-label">
                Preferred Language
              </label>
              <select
                id="select-language"
                className="form-select"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="bn">Bengali (বাংলা)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
              </select>
            </div>

            {/* Time Zone */}
            <div className="form-field-group">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="input-timezone" className="form-label mb-0">
                  Time Zone
                </label>
                <button
                  type="button"
                  className="btn-text-action text-xs"
                  onClick={() => {
                    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    if (detected) setTimezone(detected);
                  }}
                >
                  <Compass className="w-3 h-3 inline mr-1" />
                  Auto-Detect
                </button>
              </div>
              <input
                id="input-timezone"
                type="text"
                className="form-input-text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Kolkata"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FOOD PREFERENCES */}
      <section className="profile-section-card mb-8" aria-labelledby="section-food-preferences">
        <div className="section-card-header">
          <div className="header-title-group">
            <div className="icon-pill bg-brand-light">
              <Utensils className="pill-icon-svg text-brand" />
            </div>
            <div>
              <h2 id="section-food-preferences" className="section-card-title">
                Food & Dietary Preferences
              </h2>
              <p className="tiny text-muted">
                Powers your personalized food search, nutritional scores, and recipe restock suggestions.
              </p>
            </div>
          </div>
        </div>

        <div className="section-card-content mt-6">
          {/* A. Dietary Pattern */}
          <div className="preference-group mb-6">
            <h3 className="preference-subheading">A. Dietary Pattern (Multiple Selection Allowed)</h3>
            <div className="chips-container mt-2">
              {SUGGESTED_DIETARY_PATTERNS.map((pat) => {
                const isSelected = dietaryPatterns.includes(pat);
                return (
                  <button
                    key={pat}
                    type="button"
                    className={`preference-chip ${isSelected ? "selected-brand" : ""}`}
                    onClick={() => toggleDietaryPattern(pat)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                    <span>{pat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Food Likes */}
          <div className="preference-group mb-6">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-600" />
              <h3 className="preference-subheading">B. Food Likes (Favourite Foods & Ingredients)</h3>
            </div>
            <p className="tiny text-muted mb-2">
              Add foods and ingredients you love. We highlight these in healthy packaged alternatives.
            </p>

            {/* Active likes tags */}
            <div className="active-tags-row mb-3">
              {foodLikes.map((item) => (
                <span key={item} className="tag-pill tag-like">
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeFoodLike(item)}
                    aria-label={`Remove like: ${item}`}
                    className="tag-remove-btn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {foodLikes.length === 0 && (
                <span className="tiny text-slate-400 italic">No food likes added yet. Select from below or add your own.</span>
              )}
            </div>

            {/* Custom like adder */}
            <div className="tag-input-row mb-3">
              <input
                type="text"
                className="form-input-text tag-input"
                placeholder="Type a favourite food or ingredient..."
                value={customLike}
                onChange={(e) => setCustomLike(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFoodLike(customLike);
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary compact-btn"
                onClick={() => addFoodLike(customLike)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Like
              </button>
            </div>

            {/* Suggestions chips */}
            <div className="quick-suggestions-block">
              <span className="tiny text-slate-500 font-medium mr-2">Suggestions:</span>
              <div className="chips-container inline-flex">
                {SUGGESTED_FOOD_LIKES.filter((item) => !foodLikes.includes(item)).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => addFoodLike(item)}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* C. Food Dislikes */}
          <div className="preference-group mb-6">
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-amber-600" />
              <h3 className="preference-subheading">C. Food Dislikes (Foods You Avoid by Taste)</h3>
            </div>
            <p className="tiny text-muted mb-2">
              Foods you dislike or prefer to avoid. (Medical allergies must be declared in the Allergies section below).
            </p>

            {/* Active dislikes tags */}
            <div className="active-tags-row mb-3">
              {foodDislikes.map((item) => (
                <span key={item} className="tag-pill tag-dislike">
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeFoodDislike(item)}
                    aria-label={`Remove dislike: ${item}`}
                    className="tag-remove-btn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {foodDislikes.length === 0 && (
                <span className="tiny text-slate-400 italic">No dislikes specified.</span>
              )}
            </div>

            {/* Custom dislike adder */}
            <div className="tag-input-row mb-3">
              <input
                type="text"
                className="form-input-text tag-input"
                placeholder="Type an ingredient you dislike..."
                value={customDislike}
                onChange={(e) => setCustomDislike(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFoodDislike(customDislike);
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary compact-btn"
                onClick={() => addFoodDislike(customDislike)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Dislike
              </button>
            </div>

            {/* Suggestions chips */}
            <div className="quick-suggestions-block">
              <span className="tiny text-slate-500 font-medium mr-2">Suggestions:</span>
              <div className="chips-container inline-flex">
                {SUGGESTED_FOOD_DISLIKES.filter((item) => !foodDislikes.includes(item)).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => addFoodDislike(item)}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* D. Preferred Cuisines */}
          <div className="preference-group mb-6">
            <h3 className="preference-subheading">D. Preferred Cuisines</h3>
            <div className="active-tags-row mb-3">
              {preferredCuisines.map((c) => (
                <span key={c} className="tag-pill tag-brand">
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => removeCuisine(c)}
                    aria-label={`Remove cuisine: ${c}`}
                    className="tag-remove-btn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="tag-input-row mb-3">
              <input
                type="text"
                className="form-input-text tag-input"
                placeholder="Add custom cuisine..."
                value={customCuisine}
                onChange={(e) => setCustomCuisine(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCuisine(customCuisine);
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary compact-btn"
                onClick={() => addCuisine(customCuisine)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </button>
            </div>

            <div className="chips-container">
              {SUGGESTED_CUISINES.filter((c) => !preferredCuisines.includes(c)).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => addCuisine(c)}
                >
                  + {c}
                </button>
              ))}
            </div>
          </div>

          {/* E. Preferred Ingredients */}
          <div className="preference-group">
            <h3 className="preference-subheading">E. Preferred Ingredients</h3>
            <div className="active-tags-row mb-3">
              {preferredIngredients.map((ing) => (
                <span key={ing} className="tag-pill tag-brand">
                  <span>{ing}</span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing)}
                    aria-label={`Remove ingredient: ${ing}`}
                    className="tag-remove-btn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="tag-input-row mb-3">
              <input
                type="text"
                className="form-input-text tag-input"
                placeholder="Add frequently preferred ingredient..."
                value={customIngredient}
                onChange={(e) => setCustomIngredient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIngredient(customIngredient);
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary compact-btn"
                onClick={() => addIngredient(customIngredient)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </button>
            </div>

            <div className="chips-container">
              {SUGGESTED_INGREDIENTS.filter((ing) => !preferredIngredients.includes(ing)).map((ing) => (
                <button
                  key={ing}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => addIngredient(ing)}
                >
                  + {ing}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: ALLERGIES AND FOOD RESTRICTIONS (SAFETY CARD) */}
      <section className="profile-section-card safety-card mb-8" aria-labelledby="section-allergies-safety">
        <div className="section-card-header">
          <div className="header-title-group">
            <div className="icon-pill bg-red-100 text-red-700">
              <ShieldAlert className="pill-icon-svg" />
            </div>
            <div>
              <h2 id="section-allergies-safety" className="section-card-title text-red-950">
                Medical Allergies & Critical Food Restrictions
              </h2>
              <p className="tiny text-red-700 font-medium">
                High-priority safety data. Flagged instantly with alerts during barcode SmartScan.
              </p>
            </div>
          </div>

          <span className="safety-private-pill">
            <Lock className="w-3 h-3 mr-1" /> Private by Default
          </span>
        </div>

        <div className="section-card-content mt-6">
          {/* Explicit Allergy Status Distinction */}
          <div className="status-selector-block mb-6">
            <label className="form-label font-semibold text-slate-800 mb-2 block">
              Allergy Declaration Status:
            </label>
            <div className="status-radio-grid">
              <button
                type="button"
                className={`status-radio-card ${allergyStatus === "CONFIRMED_NO_ALLERGIES" ? "selected" : ""}`}
                onClick={() => {
                  setAllergyStatus("CONFIRMED_NO_ALLERGIES");
                  setAllergies([]);
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <strong>Confirmed: No Known Allergies</strong>
                </div>
                <p className="tiny text-muted mt-1">You do not have any known food or chemical allergies.</p>
              </button>

              <button
                type="button"
                className={`status-radio-card ${allergyStatus === "ALLERGIES_SPECIFIED" ? "selected" : ""}`}
                onClick={() => setAllergyStatus("ALLERGIES_SPECIFIED")}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <strong>I Have Allergies to Declare</strong>
                </div>
                <p className="tiny text-muted mt-1">Specify allergen names, reaction severities, and notes.</p>
              </button>

              <button
                type="button"
                className={`status-radio-card ${allergyStatus === "NOT_PROVIDED" ? "selected" : ""}`}
                onClick={() => setAllergyStatus("NOT_PROVIDED")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">•</span>
                  <strong>Not Provided / Prefer not to say</strong>
                </div>
                <p className="tiny text-muted mt-1">Keep allergy detection unconfigured for your profile.</p>
              </button>
            </div>
          </div>

          {/* Conditional Allergen Inputs when ALLERGIES_SPECIFIED */}
          {allergyStatus === "ALLERGIES_SPECIFIED" && (
            <div className="specified-allergies-block mb-6">
              {/* Common Allergens Chips */}
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Quick Select Major FSSAI / FDA Allergens:
                </span>
                <div className="chips-container">
                  {COMMON_ALLERGENS.map((alg) => {
                    const isSelected = allergies.some((a) => a.name.toLowerCase() === alg.toLowerCase());
                    return (
                      <button
                        key={alg}
                        type="button"
                        className={`preference-chip ${isSelected ? "selected-allergen" : ""}`}
                        onClick={() => toggleCommonAllergen(alg)}
                      >
                        {isSelected && <ShieldAlert className="w-3.5 h-3.5 mr-1" />}
                        <span>{alg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Allergies List with Severity Badges */}
              <div className="active-allergies-table mb-4">
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Declared Active Allergens ({allergies.length}):
                </span>
                {allergies.length === 0 ? (
                  <p className="tiny text-slate-400 italic">No allergens selected yet. Choose above or add custom below.</p>
                ) : (
                  <div className="space-y-2">
                    {allergies.map((allergy) => (
                      <div key={allergy.name} className="allergy-item-card">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                          <div>
                            <strong className="text-sm text-slate-800">{allergy.name}</strong>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`severity-badge severity-${allergy.severity || "moderate"}`}>
                                {(allergy.severity || "moderate").toUpperCase()}
                              </span>
                              <span className="tiny text-slate-500">Category: {allergy.category || "food"}</span>
                              {allergy.notes && <span className="tiny text-slate-400 italic">— "{allergy.notes}"</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-ghost-sm text-danger"
                          onClick={() => removeAllergy(allergy.name)}
                          aria-label={`Remove allergy ${allergy.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Allergen Entry Form */}
              <form onSubmit={handleAddCustomAllergen} className="custom-allergen-panel">
                <span className="text-xs font-bold text-slate-700 block mb-2">Add Custom Allergen:</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    className="form-input-text md:col-span-2"
                    placeholder="Allergen Name (e.g. Pine nuts, Tartrazine)"
                    value={customAllergenName}
                    onChange={(e) => setCustomAllergenName(e.target.value)}
                  />
                  <select
                    className="form-select"
                    value={customAllergenCategory}
                    onChange={(e) => setCustomAllergenCategory(e.target.value)}
                    aria-label="Allergen Category"
                  >
                    <option value="food">Food</option>
                    <option value="preservative">Preservative</option>
                    <option value="additive">Additive</option>
                    <option value="chemical">Chemical</option>
                  </select>
                  <select
                    className="form-select"
                    value={customAllergenSeverity}
                    onChange={(e) =>
                      setCustomAllergenSeverity(e.target.value as "mild" | "moderate" | "severe")
                    }
                  >
                    <option value="mild">Mild (Discomfort)</option>
                    <option value="moderate">Moderate (Reaction)</option>
                    <option value="severe">Severe (Anaphylactic)</option>
                  </select>
                  <button type="submit" className="btn-secondary compact-btn">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Allergen
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input-text text-xs"
                  placeholder="Optional reaction notes (e.g. causes rash, requires EpiPen)"
                  value={customAllergenNotes}
                  onChange={(e) => setCustomAllergenNotes(e.target.value)}
                />
              </form>
            </div>
          )}

          {/* General Food Restrictions (Non-Allergy) */}
          <div className="preference-group mb-6">
            <h3 className="preference-subheading">Non-Allergic Food Avoidances & Sensitivities:</h3>
            <p className="tiny text-muted mb-2">
              Common lifestyle, digestive, or religious restrictions flagged during barcode scans:
            </p>
            <div className="chips-container">
              {COMMON_RESTRICTIONS.map((res) => {
                const isSelected = foodRestrictions.includes(res);
                return (
                  <button
                    key={res}
                    type="button"
                    className={`preference-chip ${isSelected ? "selected-ingredient" : ""}`}
                    onClick={() => toggleRestriction(res)}
                  >
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                    <span>{res}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory Safety Notice & Consent */}
          <div className="safety-disclaimer-callout">
            <div className="flex items-start gap-2">
              <FileCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs text-amber-900 block mb-1">
                  Food Safety Disclaimer & Verification Notice:
                </strong>
                <p className="tiny text-amber-800 leading-relaxed mb-2">
                  FoodCue assists consumers by cross-referencing OCR packaging labels with published nutritional datasets.
                  Manufacturers regularly reformulate products and alter cross-contamination warnings without notice.
                  FoodCue does <strong>NOT guarantee 100% allergen-free security</strong>. Always examine physical packaging labels before consuming any packaged food.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetyConsentAcknowledged}
                    onChange={(e) => setSafetyConsentAcknowledged(e.target.checked)}
                    className="safety-checkbox"
                  />
                  <span className="text-xs font-semibold text-amber-950">
                    I acknowledge that I am responsible for verifying physical product ingredient labels.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: HOUSEHOLD MEMBERS & SHARED ACCESS */}
      <section className="profile-section-card mb-8" aria-labelledby="section-household-members">
        <div className="section-card-header">
          <div className="header-title-group">
            <div className="icon-pill bg-indigo-50 text-indigo-700">
              <Users className="pill-icon-svg" />
            </div>
            <div>
              <h2 id="section-household-members" className="section-card-title">
                My Household & Collaborative Kitchen
              </h2>
              <p className="tiny text-muted">
                View connected household members who share access to kitchen inventory and shopping lists.
              </p>
            </div>
          </div>

          {onNavigateToHousehold && (
            <button
              type="button"
              className="btn-ghost-sm text-brand font-medium"
              onClick={onNavigateToHousehold}
            >
              Open Household Manager →
            </button>
          )}
        </div>

        <div className="section-card-content mt-6">
          {userHouseholds.length === 0 ? (
            /* Solo Mode Empty State */
            <div className="household-solo-state-box">
              <div className="solo-icon-bubble">
                <User className="w-6 h-6 text-brand-green" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">You Are in Personal Kitchen Mode (Solo)</h3>
              <p className="text-xs text-muted max-w-lg mb-4">
                Your pantry ledger, private catalogue, and shopping lists belong solely to you. You can invite family members or roommates to collaborate on a single kitchen inventory anytime.
              </p>
              {onNavigateToHousehold && (
                <button
                  type="button"
                  className="btn-primary compact-btn"
                  onClick={onNavigateToHousehold}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create or Join a Household
                </button>
              )}
            </div>
          ) : (
            /* Active Household Member Roster */
            <div>
              <div className="household-meta-banner mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {currentHousehold?.name || userHouseholds[0]?.name}
                  </h3>
                  <span className="tiny text-slate-500">
                    Your Role: <strong className="uppercase text-brand-green">{userHouseholds[0]?.userRole}</strong> • {userHouseholds[0]?.memberCount} Members
                  </span>
                </div>

                <div className="privacy-guarantee-tag">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                  <span>Other Members' Private Profiles & Allergies Are Hidden</span>
                </div>
              </div>

              {/* Member Roster List */}
              <div className="members-roster-table">
                <div className="roster-header-row">
                  <span>Member</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Shared Resource Access</span>
                </div>
                {activeHouseholdMembers.map((m) => (
                  <div key={m.id} className="roster-item-row">
                    <div className="member-name-col">
                      <div className="member-avatar-mini">
                        {m.profileImageUrl ? (
                          <img src={m.profileImageUrl} alt="" className="avatar-img-mini" />
                        ) : (
                          <div className="avatar-initials-mini">
                            {m.fullName?.[0]?.toUpperCase() || "M"}
                          </div>
                        )}
                      </div>
                      <div>
                        <strong className="text-sm text-slate-800">
                          {m.fullName} {m.clerkUserId === user?.id && <span className="text-xs text-slate-400 font-normal">(You)</span>}
                        </strong>
                      </div>
                    </div>

                    <div className="member-role-col">
                      <span className={`role-badge role-${m.role}`}>
                        {m.role.toUpperCase()}
                      </span>
                    </div>

                    <div className="member-status-col">
                      <span className="tiny text-emerald-700 font-medium">Active</span>
                    </div>

                    <div className="member-access-col tiny text-slate-600">
                      {m.role === "viewer"
                        ? "Read-only access to pantry & shopping"
                        : "Full read & write access to pantry & shopping"}
                    </div>
                  </div>
                ))}
              </div>

              {/* What Members Can Access Explainer */}
              <div className="shared-access-explainer-card mt-4">
                <h4 className="text-xs font-bold text-slate-700 mb-1">What Household Members Can Access:</h4>
                <ul className="tiny text-slate-600 space-y-1 list-disc list-inside">
                  <li><strong>Kitchen Inventory:</strong> Synchronised ledger of pantry items, quantities, and storage locations.</li>
                  <li><strong>Shared Shopping List:</strong> Collaborative grocery items updated in real time.</li>
                  <li><strong>Expiry Tracking:</strong> Upcoming product expiration dates to reduce household food waste.</li>
                  <li className="text-slate-400"><em>Personal medical allergies and dietary likes/dislikes remain private unless explicitly opted into below.</em></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6: PRIVACY AND SHARING PREFERENCES */}
      {userHouseholds.length > 0 && (
        <section className="profile-section-card mb-8" aria-labelledby="section-privacy-sharing">
          <div className="section-card-header">
            <div className="header-title-group">
              <div className="icon-pill bg-emerald-50 text-emerald-700">
                <Lock className="pill-icon-svg" />
              </div>
              <div>
                <h2 id="section-privacy-sharing" className="section-card-title">
                  Privacy & Household Sharing Controls
                </h2>
                <p className="tiny text-muted">
                  Control what personal information from your profile is visible to other members of your household.
                </p>
              </div>
            </div>
          </div>

          <div className="section-card-content mt-6 space-y-4">
            {/* Toggle 1: Dietary Preferences */}
            <div className="sharing-toggle-row">
              <div className="sharing-toggle-info">
                <strong className="text-sm text-slate-800">Share Dietary Pattern</strong>
                <p className="tiny text-slate-500">
                  Allows household members to see your dietary choice (e.g. Vegetarian, Jain) when planning group meals.
                </p>
              </div>
              <button
                type="button"
                className={`toggle-switch-btn ${shareDietary ? "active" : ""}`}
                onClick={() => setShareDietary(!shareDietary)}
                role="switch"
                aria-checked={shareDietary}
                aria-label="Toggle Share Dietary Pattern"
              >
                <span className="toggle-switch-slider" />
              </button>
            </div>

            {/* Toggle 2: Allergies (Default OFF) */}
            <div className="sharing-toggle-row">
              <div className="sharing-toggle-info">
                <div className="flex items-center gap-1.5">
                  <strong className="text-sm text-slate-800">Share Allergen Warnings (Sensitive Health Data)</strong>
                  <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-medium">Default: Private</span>
                </div>
                <p className="tiny text-slate-500">
                  When enabled, household members see warnings during shared grocery planning if an item contains your declared allergens.
                </p>
              </div>
              <button
                type="button"
                className={`toggle-switch-btn ${shareAllergies ? "active" : ""}`}
                onClick={() => setShareAllergies(!shareAllergies)}
                role="switch"
                aria-checked={shareAllergies}
                aria-label="Toggle Share Allergen Warnings"
              >
                <span className="toggle-switch-slider" />
              </button>
            </div>

            {/* Toggle 3: Food Likes & Dislikes */}
            <div className="sharing-toggle-row">
              <div className="sharing-toggle-info">
                <strong className="text-sm text-slate-800">Share Food Likes & Dislikes</strong>
                <p className="tiny text-slate-500">
                  Allows household members to see your favourite and avoided foods for shopping suggestions.
                </p>
              </div>
              <button
                type="button"
                className={`toggle-switch-btn ${shareLikesDislikes ? "active" : ""}`}
                onClick={() => setShareLikesDislikes(!shareLikesDislikes)}
                role="switch"
                aria-checked={shareLikesDislikes}
                aria-label="Toggle Share Food Likes & Dislikes"
              >
                <span className="toggle-switch-slider" />
              </button>
            </div>

            {/* Toggle 4: Health Goals */}
            <div className="sharing-toggle-row">
              <div className="sharing-toggle-info">
                <strong className="text-sm text-slate-800">Share Nutritional & Health Goals</strong>
                <p className="tiny text-slate-500">
                  Shares macronutrient targets and low-sodium / low-sugar priorities with household members.
                </p>
              </div>
              <button
                type="button"
                className={`toggle-switch-btn ${shareHealthGoals ? "active" : ""}`}
                onClick={() => setShareHealthGoals(!shareHealthGoals)}
                role="switch"
                aria-checked={shareHealthGoals}
                aria-label="Toggle Share Health Goals"
              >
                <span className="toggle-switch-slider" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 7: ACCOUNT INFORMATION */}
      <section className="profile-section-card mb-8" aria-labelledby="section-account-info">
        <div className="section-card-header">
          <div className="header-title-group">
            <div className="icon-pill bg-slate-100 text-slate-700">
              <KeyRound className="pill-icon-svg" />
            </div>
            <div>
              <h2 id="section-account-info" className="section-card-title">
                Account Information & Security
              </h2>
              <p className="tiny text-muted">
                Identity credentials and session management authenticated via Clerk.
              </p>
            </div>
          </div>
        </div>

        <div className="section-card-content mt-6">
          <div className="account-info-grid">
            <div className="account-info-item">
              <span className="text-xs text-slate-500">Verified Email Address:</span>
              <strong className="text-sm text-slate-800 flex items-center gap-1.5 mt-0.5">
                {userEmail}
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </strong>
            </div>

            <div className="account-info-item">
              <span className="text-xs text-slate-500">Account Status:</span>
              <span className="text-sm text-emerald-700 font-semibold mt-0.5 block">
                Active (Clerk Verified Identity)
              </span>
            </div>

            <div className="account-info-item">
              <span className="text-xs text-slate-500">Authentication Provider:</span>
              <span className="text-sm text-slate-800 font-medium mt-0.5 block">
                Clerk Secure Authentication
              </span>
            </div>

            <div className="account-info-item">
              <span className="text-xs text-slate-500">Cloud Sync & Storage:</span>
              <button
                type="button"
                className="btn-text-action text-sm mt-0.5"
                onClick={onNavigateToPrivacy}
              >
                Manage Storage & Quotas →
              </button>
            </div>
          </div>

          <div className="account-actions-row mt-6 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <span className="tiny text-muted">
              To update your email or password, use Clerk's secure identity management.
            </span>
            <SignOutButton>
              <button type="button" className="btn-secondary compact-btn">
                Sign Out of FoodCue
              </button>
            </SignOutButton>
          </div>
        </div>
      </section>

      {/* SECTION 8: SAVE CHANGES ACTION BAR */}
      <section className="profile-save-action-card mb-8">
        <div className="save-card-inner">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isDirty ? "You Have Unsaved Changes" : "Profile Up to Date"}
            </h3>
            <p className="tiny text-slate-500">
              {isDirty
                ? "Click Save Changes to persist your demographic, dietary, allergy, and sharing updates."
                : "All profile details and dietary preferences are safely synced in Neon PostgreSQL."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus === "success" && (
              <span className="save-status-indicator text-emerald-700 font-semibold text-sm flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Changes Saved!
              </span>
            )}

            {saveStatus === "error" && (
              <span className="save-status-indicator text-red-700 font-semibold text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                {saveErrorMessage || "Could not save"}
              </span>
            )}

            <button
              type="button"
              className={`btn-primary save-btn ${saveStatus === "saving" ? "loading" : ""}`}
              onClick={handleSaveChanges}
              disabled={saveStatus === "saving"}
              aria-label="Save Profile Changes"
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 9: DANGER ZONE - DELETE PROFILE / DELETE ACCOUNT */}
      <section className="profile-danger-card" aria-labelledby="section-danger-zone">
        <div className="section-card-header">
          <div className="header-title-group">
            <div className="icon-pill bg-red-100 text-red-700">
              <Trash2 className="pill-icon-svg" />
            </div>
            <div>
              <h2 id="section-danger-zone" className="section-card-title text-red-800">
                Delete Account
              </h2>
              <p className="tiny text-red-600">
                Permanent account and personal profile erasure. This action cannot be reversed.
              </p>
            </div>
          </div>
        </div>

        <div className="section-card-content mt-4">
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Deleting your FoodCue account permanently removes your personal profile, dietary preferences, food likes/dislikes, allergy declarations, and cloud-synced pantry records. Shared household pantry records will remain intact for other members.
          </p>

          <button
            type="button"
            className="btn-danger-outline"
            onClick={() => {
              setDeleteConfirmationText("");
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            <span>Delete My Account</span>
          </button>
        </div>
      </section>

      {/* MODAL 1: DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="modal-backdrop-blur" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal-content-card danger-modal">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 id="delete-modal-title" className="text-lg font-bold text-red-950">
                  Confirm Account Deletion
                </h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body mt-4">
              {/* Check if user is owner of active household with members */}
              {ownedHouseholdWithMembers ? (
                <div className="blocking-alert-box mb-4">
                  <strong className="text-sm text-red-900 block mb-1">
                    Action Required: Transfer Household Ownership First
                  </strong>
                  <p className="tiny text-red-800 leading-relaxed mb-3">
                    You are the registered Owner of <strong>"{ownedHouseholdWithMembers.name}"</strong>, which currently has {ownedHouseholdWithMembers.memberCount} active members.
                    To protect shared grocery records, you must transfer ownership to another member or dissolve the household before your personal account can be deleted.
                  </p>
                  {onNavigateToHousehold && (
                    <button
                      type="button"
                      className="btn-secondary compact-btn"
                      onClick={() => {
                        setShowDeleteModal(false);
                        onNavigateToHousehold();
                      }}
                    >
                      Manage Household Members →
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                    This action will <strong>permanently erase</strong> your FoodCue profile, food preferences, allergies, and cloud sync history.
                  </p>

                  <ul className="text-xs text-slate-600 space-y-1 mb-4 list-disc list-inside">
                    <li>Your personal pantry records and saved catalogue items will be erased.</li>
                    <li>You will be removed from all connected households.</li>
                    <li>Shared pantry items belonging to household members will remain intact.</li>
                  </ul>

                  <div className="confirmation-challenge-box mb-4">
                    <label htmlFor="confirm-delete-input" className="text-xs font-semibold text-slate-800 block mb-1">
                      Type <strong>DELETE</strong> below to confirm:
                    </label>
                    <input
                      id="confirm-delete-input"
                      type="text"
                      className="form-input-text w-full uppercase"
                      placeholder="DELETE"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    />
                  </div>

                  {deleteError && (
                    <div className="text-xs text-red-700 bg-red-50 p-2 rounded mb-3">
                      {deleteError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="btn-secondary compact-btn"
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isDeletingAccount}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-danger compact-btn"
                      onClick={handleConfirmDeleteAccount}
                      disabled={deleteConfirmationText.trim().toUpperCase() !== "DELETE" || isDeletingAccount}
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Permanently Delete My Account"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UNSAVED CHANGES DISCARD PROMPT */}
      {showDiscardPrompt && (
        <div className="modal-backdrop-blur" role="dialog" aria-modal="true" aria-labelledby="discard-modal-title">
          <div className="modal-content-card">
            <div className="modal-header">
              <h3 id="discard-modal-title" className="text-lg font-bold text-slate-800">
                Discard Unsaved Changes?
              </h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowDiscardPrompt(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body mt-3">
              <p className="text-sm text-slate-600 mb-4">
                You have unsaved changes in your profile. If you leave now, these changes will not be saved to your account.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowDiscardPrompt(false)}
                >
                  Stay & Save
                </button>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => {
                    setShowDiscardPrompt(false);
                    onNavigateToDashboard();
                  }}
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
