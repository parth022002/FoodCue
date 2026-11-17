import { useState, useEffect } from "react";
import { Navbar } from "../components/navigation/Navbar";
import { Footer } from "../components/navigation/Footer";
import { SmartScan } from "../features/smartscan/SmartScan";
import { Kitchen } from "../features/kitchen/Kitchen";
import { Reminders } from "../features/reminders/Reminders";
import { ShoppingList } from "../features/shopping/ShoppingList";
import { CatalogView } from "../features/catalog/CatalogView";
import { ProfileView } from "../features/profile/ProfileView";
import { Privacy } from "../features/privacy/Privacy";
import { testNeonConnection } from "../adapters/storage/neonDatabase";
import type { VerifiedFoodProduct } from "../domain/entities/catalogData";

export type ActiveTab =
  | "scan"
  | "kitchen"
  | "reminders"
  | "shopping"
  | "catalog"
  | "profile"
  | "privacy";

export function App() {
  const [tab, setTab] = useState<ActiveTab>("scan");
  const [selectedGtinForScan, setSelectedGtinForScan] = useState<string>("");
  const [neonConnected, setNeonConnected] = useState<boolean>(false);
  const [calmModeActive, setCalmModeActive] = useState<boolean>(false);

  useEffect(() => {
    // Check Neon database connection status on mount
    testNeonConnection()
      .then((res) => setNeonConnected(res.connected))
      .catch(() => setNeonConnected(false));
  }, []);

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
      {/* Redesigned Sticky Topbar with Left Brand, Center Nav & Right Profile/Auth */}
      <Navbar
        activeTab={tab}
        onSelectTab={setTab}
        syncActive={neonConnected}
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
          <ProfileView onProfileChange={(prof) => setCalmModeActive(prof.calmMode)} />
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
