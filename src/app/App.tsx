import { useState, useEffect, useMemo } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Navbar } from "../components/navigation/Navbar";
import { Footer } from "../components/navigation/Footer";
import { GuestHome } from "../features/home/GuestHome";
import { AuthenticatedDashboard } from "../features/home/AuthenticatedDashboard";
import { SmartScan } from "../features/smartscan/SmartScan";
import { InternetProductSearch } from "../features/search/InternetProductSearch";
import { UserCatalogueView } from "../features/catalog/UserCatalogueView";
import { CatalogView } from "../features/catalog/CatalogView";
import { Kitchen } from "../features/kitchen/Kitchen";
import { Reminders } from "../features/reminders/Reminders";
import { ShoppingList } from "../features/shopping/ShoppingList";
import { ProfileView } from "../features/profile/ProfileView";
import { Privacy } from "../features/privacy/Privacy";
import { TermsOfService } from "../features/legal/TermsOfService";
import { HouseholdManager } from "../features/household/HouseholdManager";
import { HouseholdInviteModal } from "../features/household/HouseholdInviteModal";
import { AuthGateView } from "../features/auth/AuthGateView";
import { OnboardingWizard } from "../features/onboarding/OnboardingWizard";
import { HouseholdOnboardingModal } from "../features/onboarding/HouseholdOnboardingModal";
import { InvitationAcceptView } from "../features/household/InvitationAcceptView";
import { RecipeDiscoveryView } from "../features/recipes/RecipeDiscoveryView";
import { ReceiptScannerView } from "../features/receipts/ReceiptScannerView";
import { LanguageProvider } from "../i18n";
import { OnboardingApiClient } from "../services/onboardingApiClient";
import { syncCoordinator } from "../sync/engine/syncCoordinator";
import { getAllRecords } from "../adapters/storage/database";
import type { PantryEvent } from "../domain/entities/pantry";
import type { VerifiedFoodProduct } from "../domain/entities/catalogData";
import type { HouseholdRecord } from "../server/database/repositories/household.repository";
import { Search } from "lucide-react";

export type ActiveTab =
  | "home"
  | "scan"
  | "search"
  | "kitchen"
  | "reminders"
  | "shopping"
  | "catalog"
  | "profile"
  | "privacy"
  | "terms"
  | "household"
  | "recipes"
  | "receipts";

const PROTECTED_TABS: ActiveTab[] = [
  "scan",
  "search",
  "kitchen",
  "reminders",
  "shopping",
  "catalog",
  "profile",
  "household",
  "recipes",
  "receipts"
];

function getFeatureDisplayName(tab: ActiveTab): string {
  switch (tab) {
    case "kitchen":
      return "My Kitchen & Pantry Inventory";
    case "scan":
      return "SmartScan Barcode Scanner";
    case "shopping":
      return "Smart Shopping List";
    case "search":
      return "Food Product Search & Intelligence";
    case "reminders":
      return "Expiry Reminders & Notifications";
    case "catalog":
      return "Personal Food Catalogue";
    case "profile":
      return "Personal Profile & Preferences";
    case "household":
      return "Household Collaboration";
    case "recipes":
      return "Smart Recipe & Meal Suggestions";
    case "receipts":
      return "Supermarket Bill & Receipt Scanner";
    default:
      return "Protected Features";
  }
}

function CloudSyncBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      syncCoordinator.initialize(async () => getToken());
    }
  }, [isSignedIn, getToken]);

  return null;
}

export function App() {
  const [tab, setTab] = useState<ActiveTab>(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === "/privacy") return "privacy";
      if (pathname === "/terms") return "terms";
      if (pathname === "/kitchen" || pathname === "/pantry") return "kitchen";
      if (pathname === "/scan") return "scan";
      if (pathname === "/shopping" || pathname === "/shopping-list") return "shopping";
      if (pathname === "/search" || pathname === "/explore") return "search";
      if (pathname === "/reminders" || pathname === "/notifications") return "reminders";
      if (pathname === "/catalog" || pathname === "/products") return "catalog";
      if (pathname === "/profile" || pathname === "/settings") return "profile";
      if (pathname === "/household") return "household";
      if (pathname === "/recipes" || pathname === "/meals") return "recipes";
      if (pathname === "/receipts" || pathname === "/receipt-scanner") return "receipts";
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as ActiveTab;
      if (tabParam) return tabParam;
    } catch {
      // fallback
    }
    return "home";
  });

  const [selectedGtinForScan, setSelectedGtinForScan] = useState<string>("");
  const [calmModeActive, setCalmModeActive] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<ActiveTab | null>(null);

  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  // Create API Client with authenticated token getter
  const apiClient = useMemo(() => {
    return new OnboardingApiClient(async () => {
      try {
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });
  }, [getToken]);

  // Onboarding state
  const [onboardingStage, setOnboardingStage] = useState<"checking" | "wizard" | "household" | "completed">("completed");
  const [activeHousehold, setActiveHousehold] = useState<HouseholdRecord | null>(null);

  // Invite Token URL Parameter (e.g. /invite/:token or ?invite=token)
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qToken = params.get("invite");
      if (qToken) return qToken;
      if (window.location.pathname.startsWith("/invite/")) {
        return window.location.pathname.replace("/invite/", "").trim();
      }
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    // Seed verified offline FMCG catalog in background without blocking UI
    import("../domain/services/fmcgCatalogManager").then(({ fmcgCatalog }) => {
      fmcgCatalog.seedCatalogIfRequired().catch(() => {
        // Fallback silently remains active
      });
    });
  }, []);

  // Compute urgent notification count from local pantry
  useEffect(() => {
    getAllRecords<PantryEvent>("pantryEvents")
      .then((events) => {
        const now = new Date();
        let urgent = 0;
        for (const ev of events) {
          if (ev.dateValue && ev.eventType === "add") {
            const d = new Date(ev.dateValue);
            const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
              urgent++;
            }
          }
        }
        setNotificationCount(urgent);
      })
      .catch(() => {});
  }, [tab]);

  // Track target destination when unauthenticated visitor attempts protected feature
  useEffect(() => {
    if (!isSignedIn && PROTECTED_TABS.includes(tab)) {
      setRedirectAfterAuth(tab);
    }
  }, [isSignedIn, tab]);

  // Restore preserved destination after successful authentication
  useEffect(() => {
    if (isSignedIn && redirectAfterAuth && onboardingStage === "completed") {
      setTab(redirectAfterAuth);
      setRedirectAfterAuth(null);
    }
  }, [isSignedIn, redirectAfterAuth, onboardingStage]);

  // Check onboarding status and active household when user signs in
  useEffect(() => {
    if (!isSignedIn) {
      setOnboardingStage("completed");
      setActiveHousehold(null);
      return;
    }

    let mounted = true;

    async function checkUserOnboarding() {
      try {
        const bundle = await apiClient.getProfile();
        if (!mounted) return;

        if (bundle.onboardingStatus === "PROFILE_PENDING") {
          setOnboardingStage("wizard");
        } else if (bundle.onboardingStatus === "PROFILE_COMPLETED" || bundle.onboardingStatus === "HOUSEHOLD_SETUP_PENDING") {
          setOnboardingStage("household");
        } else {
          setOnboardingStage("completed");
        }

        // Fetch user households
        const userHouseholds = await apiClient.listHouseholds();
        if (mounted && userHouseholds.length > 0) {
          setActiveHousehold(userHouseholds[0] || null);
        }
      } catch {
        // If server is temporarily unreachable or offline, default to completed to avoid blocking
        if (mounted) setOnboardingStage("completed");
      }
    }

    checkUserOnboarding();

    return () => {
      mounted = false;
    };
  }, [isSignedIn, apiClient]);

  const hasClerkKey = Boolean(
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );

  function handleSelectProductForScan(gtin: string) {
    setSelectedGtinForScan(gtin);
    setTab("scan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAddProductDirectToKitchen(prod: VerifiedFoodProduct) {
    setSelectedGtinForScan(prod.gtin);
    setTab("scan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <LanguageProvider>
      <div className={`app-shell ${calmModeActive ? "calm-mode" : ""}`}>
        {hasClerkKey && <CloudSyncBridge />}

        {/* Redesigned Sticky Topbar with Separate Public & Authenticated Navbars */}
        <Navbar
          activeTab={tab}
          onSelectTab={setTab}
          onOpenInviteModal={() => setShowInviteModal(true)}
          notificationCount={notificationCount}
        />

      {/* Direct Invitation Acceptance Modal (if ?invite=token or /invite/:token in URL) */}
      {inviteToken && (
        <div className="modal-backdrop">
          <div className="modal-dialog-large">
            <InvitationAcceptView
              token={inviteToken}
              apiClient={apiClient}
              onAccepted={(householdId) => {
                setInviteToken(null);
                // Clear URL query or path
                window.history.replaceState({}, document.title, window.location.pathname.startsWith("/invite/") ? "/" : window.location.pathname);
                apiClient.getHouseholdDetails(householdId).then((d) => {
                  setActiveHousehold(d.household);
                  setTab("household");
                }).catch(() => {
                  setTab("home");
                });
              }}
              onCancel={() => {
                setInviteToken(null);
                window.history.replaceState({}, document.title, window.location.pathname.startsWith("/invite/") ? "/" : window.location.pathname);
                setTab("home");
              }}
            />
          </div>
        </div>
      )}

      {/* Household Invitation Modal (Triggered by Invite button next to Profile) */}
      <HouseholdInviteModal
        apiClient={apiClient}
        currentHousehold={activeHousehold}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onHouseholdCreated={(createdHh) => {
          setActiveHousehold(createdHh);
        }}
      />

      {/* Stage 3: Personal Profile Creation Wizard */}
      {isSignedIn && onboardingStage === "wizard" && (
        <div className="modal-backdrop z-onboarding">
          <OnboardingWizard
            apiClient={apiClient}
            initialName={user?.fullName || ""}
            initialEmail={user?.primaryEmailAddress?.emailAddress || ""}
            initialAvatar={user?.imageUrl}
            onProfileCompleted={(_bundle) => {
              setOnboardingStage("household");
            }}
          />
        </div>
      )}

      {/* Stage 4: Household Creation & Invitation Onboarding Modal */}
      {isSignedIn && onboardingStage === "household" && (
        <HouseholdOnboardingModal
          apiClient={apiClient}
          onComplete={(createdHh) => {
            if (createdHh) {
              setActiveHousehold(createdHh);
            }
            setOnboardingStage("completed");
            setTab("home");
          }}
        />
      )}

      {/* Main Content Area */}
      <main className="main-content-layout" id="main-content">
        {/* Enforce Mandatory Authentication: If unauthenticated visitor attempts protected feature */}
        {!isSignedIn && PROTECTED_TABS.includes(tab) ? (
          <AuthGateView
            targetFeatureName={getFeatureDisplayName(tab)}
            onReturnHome={() => setTab("home")}
          />
        ) : (
          <>
            {/* Tab 1: Home (Guest Landing vs Authenticated Dashboard) */}
            {tab === "home" && (
              isSignedIn ? (
                <AuthenticatedDashboard
                  apiClient={apiClient}
                  currentHousehold={activeHousehold}
                  onNavigateToScan={() => setTab("scan")}
                  onNavigateToSearch={() => setTab("search")}
                  onNavigateToKitchen={() => setTab("kitchen")}
                  onNavigateToCatalogue={() => setTab("catalog")}
                  onNavigateToProfile={() => setTab("profile")}
                  onNavigateToReminders={() => setTab("reminders")}
                  onNavigateToShopping={() => setTab("shopping")}
                  onNavigateToHousehold={() => setTab("household")}
                  onNavigateToRecipes={() => setTab("recipes")}
                  onNavigateToReceipts={() => setTab("receipts")}
                />
              ) : (
                <GuestHome
                  onRequireAuthPrompt={(featureName) => {
                    if (featureName === "SmartScan") setTab("scan");
                    else if (featureName === "Kitchen Inventory") setTab("kitchen");
                    else if (featureName === "Shopping Lists") setTab("shopping");
                    else if (featureName === "Expiry Tracking") setTab("reminders");
                    else setTab("profile");
                  }}
                />
              )
            )}

            {/* Tab 2: SmartScan Camera & Barcode Input */}
            {tab === "scan" && (
              <SmartScan
                initialGtin={selectedGtinForScan}
                onAddedToKitchen={() => setTab("kitchen")}
              />
            )}

            {/* Tab 3: Internet & Food Database Search / Explore */}
            {tab === "search" && (
              <section className="panel" aria-labelledby="internet-search-heading">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">GLOBAL & FMCG FOOD SEARCH</p>
                    <h2 id="internet-search-heading" className="panel-title-with-icon">
                      <Search className="title-icon text-brand-green" aria-hidden="true" />
                      Search Packaged Foods Across the Internet
                    </h2>
                  </div>
                </div>
                <p className="muted">
                  Search by brand, product name, or barcode. Retrieves nutritional facts, ingredient analysis, and transparent food health scores from verified databases.
                </p>
                <InternetProductSearch
                  userId={user?.id || "guest"}
                  onSelectProductForKitchen={() => setTab("kitchen")}
                  onRequireAuthPrompt={() => setTab("profile")}
                />
              </section>
            )}

            {/* Tab 4: My Kitchen Pantry Inventory */}
            {tab === "kitchen" && (
              <Kitchen onOpenSmartScan={() => setTab("scan")} />
            )}

            {/* Tab 5: Expiry Reminders */}
            {tab === "reminders" && (
              <Reminders onNavigateToKitchen={() => setTab("kitchen")} />
            )}

            {/* Tab 6: Smart Shopping List */}
            {tab === "shopping" && (
              <ShoppingList />
            )}

            {/* Tab 7: Catalogue (User-Specific when signed in, Public Catalog when guest) */}
            {tab === "catalog" && (
              isSignedIn ? (
                <UserCatalogueView
                  userId={user?.id}
                  onNavigateToSearch={() => setTab("search")}
                  onNavigateToScan={() => setTab("scan")}
                  onAddProductToKitchen={() => setTab("kitchen")}
                  onRequireAuthPrompt={() => setTab("profile")}
                />
              ) : (
                <CatalogView
                  onSelectProductForScan={handleSelectProductForScan}
                  onAddProductToKitchen={handleAddProductDirectToKitchen}
                />
              )
            )}

            {/* Tab 8: Profile, Allergies & Settings */}
            {tab === "profile" && (
              <ProfileView
                apiClient={apiClient}
                currentHousehold={activeHousehold}
                onNavigateToDashboard={() => setTab("home")}
                onNavigateToHousehold={() => setTab("household")}
                onNavigateToPrivacy={() => setTab("privacy")}
                onProfileChange={(prof) => setCalmModeActive(prof.calmMode)}
              />
            )}

            {/* Tab 9: Privacy & Local Data Management */}
            {tab === "privacy" && (
              <Privacy onDataRestored={() => setTab("kitchen")} />
            )}

            {/* Tab 10: Terms of Service */}
            {tab === "terms" && (
              <TermsOfService onBack={() => setTab("home")} />
            )}

            {/* Tab 11: Household Management & Shared Kitchen Workspace */}
            {tab === "household" && (
              <section className="panel" aria-labelledby="household-manager-heading">
                <HouseholdManager
                  apiClient={apiClient}
                  currentHousehold={activeHousehold}
                  onSelectHousehold={(hh) => setActiveHousehold(hh)}
                  onClose={() => setTab("home")}
                />
              </section>
            )}

            {/* Tab 12: Recipes & Meal Suggestions */}
            {tab === "recipes" && (
              <RecipeDiscoveryView
                onNavigateToKitchen={() => setTab("kitchen")}
                onNavigateToShopping={() => setTab("shopping")}
              />
            )}

            {/* Tab 13: Supermarket Bill & Receipt Scanner */}
            {tab === "receipts" && (
              <ReceiptScannerView
                onItemsAddedToKitchen={() => setTab("kitchen")}
              />
            )}
          </>
        )}
      </main>

      {/* Redesigned Footers (Public 4-Column Footer vs Authenticated Compact Footer) */}
      <Footer onSelectTab={setTab} />
    </div>
    </LanguageProvider>
  );
}
