import { useState, useEffect } from "react";
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
import { syncCoordinator } from "../sync/engine/syncCoordinator";
import type { VerifiedFoodProduct } from "../domain/entities/catalogData";
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
  | "privacy";

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

  useEffect(() => {
    // Seed verified offline FMCG catalog in background without blocking UI
    import("../domain/services/fmcgCatalogManager").then(({ fmcgCatalog }) => {
      fmcgCatalog.seedCatalogIfRequired().catch(() => {
        // Fallback silently remains active
      });
    });
  }, []);

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

      {/* Main Content Area */}
      <main className="main-content-layout" id="main-content">
        {/* Tab 1: Home (Guest Landing vs Authenticated Dashboard) */}
        {tab === "home" && (
          isSignedIn ? (
            <AuthenticatedDashboard
              onNavigateToScan={() => setTab("scan")}
              onNavigateToSearch={() => setTab("search")}
              onNavigateToKitchen={() => setTab("kitchen")}
              onNavigateToCatalogue={() => setTab("catalog")}
              onNavigateToProfile={() => setTab("profile")}
              onNavigateToReminders={() => setTab("reminders")}
              onNavigateToShopping={() => setTab("shopping")}
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

        {/* Tab 8: Profile, Allergies, Household & Settings */}
        {tab === "profile" && (
          <ProfileView
            onProfileChange={(prof) => setCalmModeActive(prof.calmMode)}
            onNavigateToPrivacy={() => setTab("privacy")}
          />
        )}

        {/* Tab 9: Privacy & Local Data Management */}
        {tab === "privacy" && (
          <Privacy onDataRestored={() => setTab("kitchen")} />
        )}
      </main>

      {/* Redesigned 4-Column Professional Consumer Footer */}
      <Footer onSelectTab={setTab} />
    </div>
  );
}
