import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Navbar } from "../components/navigation/Navbar";
import { Footer } from "../components/navigation/Footer";
import { SmartScan } from "../features/smartscan/SmartScan";
import { Kitchen } from "../features/kitchen/Kitchen";
import { Reminders } from "../features/reminders/Reminders";
import { ShoppingList } from "../features/shopping/ShoppingList";
import { CatalogView } from "../features/catalog/CatalogView";
import { ProfileView } from "../features/profile/ProfileView";
import { Privacy } from "../features/privacy/Privacy";
import { syncCoordinator } from "../sync/engine/syncCoordinator";
import type { VerifiedFoodProduct } from "../domain/entities/catalogData";

export type ActiveTab =
  | "scan"
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
  const [tab, setTab] = useState<ActiveTab>("scan");
  const [selectedGtinForScan, setSelectedGtinForScan] = useState<string>("");
  const [calmModeActive, setCalmModeActive] = useState<boolean>(false);

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

      {/* Redesigned Sticky Topbar with Left Brand, Center Nav & Right Profile/Auth */}
      <Navbar
        activeTab={tab}
        onSelectTab={setTab}
      />

      {/* Main Content Area */}
      <main className="main-content-layout" id="main-content">
        {tab === "scan" && (
          <SmartScan
            initialGtin={selectedGtinForScan}
            onAddedToKitchen={() => setTab("kitchen")}
          />
        )}

        {tab === "kitchen" && (
          <Kitchen onOpenSmartScan={() => setTab("scan")} />
        )}

        {tab === "reminders" && (
          <Reminders onNavigateToKitchen={() => setTab("kitchen")} />
        )}

        {tab === "shopping" && (
          <ShoppingList />
        )}

        {tab === "catalog" && (
          <CatalogView
            onSelectProductForScan={handleSelectProductForScan}
            onAddProductToKitchen={handleAddProductDirectToKitchen}
          />
        )}

        {tab === "profile" && (
          <ProfileView
            onProfileChange={(prof) => setCalmModeActive(prof.calmMode)}
            onNavigateToPrivacy={() => setTab("privacy")}
          />
        )}

        {tab === "privacy" && (
          <Privacy onDataRestored={() => setTab("kitchen")} />
        )}
      </main>

      {/* Redesigned 4-Column Professional Consumer Footer */}
      <Footer onSelectTab={setTab} />
    </div>
  );
}
