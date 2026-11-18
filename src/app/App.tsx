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
import { HouseholdManager } from "../features/household/HouseholdManager";
import { OnboardingWizard } from "../features/onboarding/OnboardingWizard";
import { HouseholdOnboardingModal } from "../features/onboarding/HouseholdOnboardingModal";
import { InvitationAcceptView } from "../features/household/InvitationAcceptView";
import { OnboardingApiClient } from "../services/onboardingApiClient";
import { syncCoordinator } from "../sync/engine/syncCoordinator";
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
  | "household";

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
  const [tab, setTab] = useState<ActiveTab>("home");
  const [selectedGtinForScan, setSelectedGtinForScan] = useState<string>("");
  const [calmModeActive, setCalmModeActive] = useState<boolean>(false);

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

  // Invite Token URL Parameter
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

  // Check onboarding status and active household when user signs in
  useEffect(() => {
    if (!isSignedIn) {
      setOnboardingStage("completed");
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
    <div className={`app-shell ${calmModeActive ? "calm-mode" : ""}`}>
      {hasClerkKey && <CloudSyncBridge />}

      {/* Redesigned Sticky Topbar with Brand, Center Nav & Right Profile/Auth */}
      <Navbar
        activeTab={tab}
        onSelectTab={setTab}
      />

      {/* Direct Invitation Acceptance Modal (if ?invite=token in URL) */}
      {inviteToken && (
        <div className="modal-backdrop">
          <div className="modal-dialog-large">
            <InvitationAcceptView
              token={inviteToken}
              apiClient={apiClient}
              onAccepted={(householdId) => {
                setInviteToken(null);
                // Clear URL query
                window.history.replaceState({}, document.title, window.location.pathname);
                apiClient.getHouseholdDetails(householdId).then((d) => {
                  setActiveHousehold(d.household);
                  setTab("household");
                }).catch(() => {
                  setTab("home");
                });
              }}
              onCancel={() => {
                setInviteToken(null);
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
            />
          </div>
        </div>
      )}

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
            />
          ) : (
            <GuestHome
              onOpenScan={() => setTab("scan")}
              onOpenSearch={() => setTab("search")}
              onRequireAuthPrompt={() => setTab("profile")}
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

        {/* Tab 3: Internet & Food Database Search */}
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

        {/* Tab 10: Household Management & Shared Kitchen Workspace */}
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
      </main>

      {/* Redesigned 4-Column Professional Consumer Footer */}
      <Footer onSelectTab={setTab} />
    </div>
  );
}
