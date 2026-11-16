import { useState, useEffect } from "react";
import { Show, SignInButton, UserButton, OrganizationSwitcher } from "@clerk/react";
import { SmartScan } from "../features/smartscan/SmartScan";
import { Kitchen } from "../features/kitchen/Kitchen";
import { Reminders } from "../features/reminders/Reminders";
import { ShoppingList } from "../features/shopping/ShoppingList";
import { CatalogView } from "../features/catalog/CatalogView";
import { ProfileView } from "../features/profile/ProfileView";
import { Privacy } from "../features/privacy/Privacy";
import { testNeonConnection } from "../adapters/storage/neonDatabase";
import type { VerifiedFoodProduct } from "../domain/entities/catalogData";
import {
  Sparkles,
  Refrigerator,
  Bell,
  ShoppingBag,
  BookOpen,
  User,
  Shield,
  Cloud,
  LogIn
} from "lucide-react";

export type ActiveTab =
  | "scan"
  | "kitchen"
  | "reminders"
  | "shopping"
  | "catalog"
  | "profile"
  | "privacy";

const hasClerkKey = Boolean(
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

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
  }

  function handleAddProductDirectToKitchen(prod: VerifiedFoodProduct) {
    // Prefill scan or switch to kitchen
    setSelectedGtinForScan(prod.gtin);
    setTab("scan");
  }

  return (
    <div className={`app-shell ${calmModeActive ? "calm-mode" : ""}`}>
      {/* Top Header */}
      <header className="topbar">
        <a className="brand" href="/" aria-label="FoodCue home" onClick={(e) => { e.preventDefault(); setTab("scan"); }}>
          <div className="brand-logo-icon">
            <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="22" fill="#075A35" />
              <path d="M25 45H75L68 76H32L25 45Z" fill="#72C900" />
              <rect x="36" y="52" width="6" height="16" rx="3" fill="#075A35" />
              <rect x="47" y="52" width="6" height="16" rx="3" fill="#075A35" />
              <rect x="58" y="52" width="6" height="16" rx="3" fill="#075A35" />
              <circle cx="68" cy="40" r="12" fill="#F39A1E" />
              <circle cx="45" cy="35" r="14" fill="#E53935" />
              <path d="M22 28C22 24.6863 24.6863 22 28 22H36" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
              <path d="M78 28C78 24.6863 75.3137 22 72 22H64" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
              <path d="M22 72C22 75.3137 24.6863 78 28 78H36" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
              <path d="M78 72C78 75.3137 75.3137 78 72 78H64" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="brand-text-block">
            <span className="brand-name">FoodCue</span>
            <span className="brand-tagline">Know your food. Manage your kitchen.</span>
          </div>
        </a>

        <div className="header-badges">
          <span className="local-pill" title="Local browser storage active">
            <span className="dot" /> Stored locally
          </span>
          <span
            className={`neon-pill ${neonConnected ? "online" : "offline"}`}
            title={neonConnected ? "Neon Lakebase Postgres Connected" : "Neon Offline"}
            onClick={() => setTab("privacy")}
          >
            <Cloud className="pill-cloud-icon" /> {neonConnected ? "Neon Sync: Live" : "Neon: Ready"}
          </span>

          {hasClerkKey && (
            <div className="clerk-auth-slot">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="auth-pill" title="Sign in with Clerk">
                    <LogIn className="pill-icon" /> Sign In
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <div className="clerk-org-slot" title="Switch Household / Personal Kitchen">
                  <OrganizationSwitcher hidePersonal={false} />
                </div>
                <div className="clerk-user-avatar">
                  <UserButton />
                </div>
              </Show>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {/* Navigation Tabs Bar */}
        <nav className="tabs-nav" aria-label="Main navigation">
          <button
            className={`nav-tab ${tab === "scan" ? "active" : ""}`}
            onClick={() => setTab("scan")}
          >
            <Sparkles className="tab-icon" /> SmartScan
          </button>
          <button
            className={`nav-tab ${tab === "kitchen" ? "active" : ""}`}
            onClick={() => setTab("kitchen")}
          >
            <Refrigerator className="tab-icon" /> My Kitchen
          </button>
          <button
            className={`nav-tab ${tab === "reminders" ? "active" : ""}`}
            onClick={() => setTab("reminders")}
          >
            <Bell className="tab-icon" /> Reminders
          </button>
          <button
            className={`nav-tab ${tab === "shopping" ? "active" : ""}`}
            onClick={() => setTab("shopping")}
          >
            <ShoppingBag className="tab-icon" /> Shopping List
          </button>
          <button
            className={`nav-tab ${tab === "catalog" ? "active" : ""}`}
            onClick={() => setTab("catalog")}
          >
            <BookOpen className="tab-icon" /> Catalogue
          </button>
          <button
            className={`nav-tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <User className="tab-icon" /> Profile
          </button>
          <button
            className={`nav-tab ${tab === "privacy" ? "active" : ""}`}
            onClick={() => setTab("privacy")}
          >
            <Shield className="tab-icon" /> Privacy & Cloud
          </button>
        </nav>

        {/* Tab Content Views */}
        {tab === "scan" && (
          <SmartScan
            initialGtin={selectedGtinForScan}
            onAddedToKitchen={() => setTab("kitchen")}
          />
        )}
        {tab === "kitchen" && <Kitchen onOpenSmartScan={() => setTab("scan")} />}
        {tab === "reminders" && <Reminders onNavigateToKitchen={() => setTab("kitchen")} />}
        {tab === "shopping" && <ShoppingList />}
        {tab === "catalog" && (
          <CatalogView
            onSelectProductForScan={handleSelectProductForScan}
            onAddProductToKitchen={handleAddProductDirectToKitchen}
          />
        )}
        {tab === "profile" && (
          <ProfileView onProfileChange={(prof) => setCalmModeActive(prof.calmMode)} />
        )}
        {tab === "privacy" && <Privacy onDataRestored={() => setTab("kitchen")} />}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          FoodCue is a label-understanding and kitchen-organisation aid, not a guarantee of product safety or medical suitability.
        </p>
        <p className="tiny">
          Local-First Progressive Web App • Neon Lakebase Postgres Integration • Zero-Cash Architecture
        </p>
      </footer>
    </div>
  );
}
