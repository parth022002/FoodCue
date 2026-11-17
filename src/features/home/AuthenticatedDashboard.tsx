import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  Sparkles,
  Camera,
  Search,
  Refrigerator,
  BookOpen,
  ShieldCheck,
  Bell,
  ArrowRight,
  AlertTriangle,
  ShoppingBag
} from "lucide-react";
import { getAllRecords } from "../../adapters/storage/database";
import { projectBalances } from "../../domain/services/pantryLedger";
import type { PantryEvent } from "../../domain/entities/pantry";
import { userCatalogueService } from "../../domain/services/userCatalogueService";
import type { UserCatalogueItem } from "../../domain/entities/nutritionalProfile";
import { InternetProductSearch } from "../search/InternetProductSearch";

interface AuthenticatedDashboardProps {
  onNavigateToScan: () => void;
  onNavigateToSearch: () => void;
  onNavigateToKitchen: () => void;
  onNavigateToCatalogue: () => void;
  onNavigateToProfile: () => void;
  onNavigateToReminders: () => void;
  onNavigateToShopping: () => void;
}

export function AuthenticatedDashboard({
  onNavigateToScan,
  onNavigateToSearch,
  onNavigateToKitchen,
  onNavigateToCatalogue,
  onNavigateToProfile,
  onNavigateToReminders,
  onNavigateToShopping
}: AuthenticatedDashboardProps) {
  const { user } = useUser();
  const [kitchenCount, setKitchenCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [catalogueItems, setCatalogueItems] = useState<UserCatalogueItem[]>([]);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const [dietaryPattern, setDietaryPattern] = useState<string>("Standard");

  const userName = user?.firstName || user?.fullName || "there";
  const userId = user?.id || "local-user";

  useEffect(() => {
    // 1. Load kitchen inventory counts
    getAllRecords<PantryEvent>("pantryEvents").then((events) => {
      const balances = projectBalances(events);
      const active = balances.filter((b) => b.quantity > 0);
      setKitchenCount(active.length);

      // Check items expiring in next 3 days
      const now = new Date();
      let expiringCount = 0;
      for (const ev of events) {
        if (ev.dateValue && ev.eventType === "add") {
          const d = new Date(ev.dateValue);
          const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3) {
            expiringCount++;
          }
        }
      }
      setExpiringSoonCount(expiringCount);
    }).catch(() => {});

    // 2. Load user's personal catalogue
    if (user?.id) {
      userCatalogueService.getUserCatalogue(user.id).then((items) => {
        setCatalogueItems(items);
      }).catch(() => {});
    }

    // 3. Load user profile preferences from localStorage
    try {
      const storedProfile = localStorage.getItem("foodcue_user_profile");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setUserAllergens(parsed.avoidAllergens || []);
        setDietaryPattern(parsed.dietaryPattern || "Standard");
      }
    } catch {
      // fallback
    }
  }, [user]);

  return (
    <div className="authenticated-dashboard-container">
      {/* Personalized Welcome Header */}
      <section className="dashboard-hero-header">
        <div className="welcome-headline-row">
          <div>
            <p className="eyebrow">YOUR KITCHEN & HEALTH DASHBOARD</p>
            <h1 className="welcome-user-title">
              Welcome back, <span className="text-brand-green">{userName}</span>!
            </h1>
            <p className="welcome-subtitle">
              Here is your family's kitchen overview, allergy protection status, and personalized food intelligence.
            </p>
          </div>

          <div className="quick-action-buttons">
            <button
              type="button"
              className="quick-scan-primary-btn"
              onClick={onNavigateToScan}
            >
              <Camera className="tiny-icon" aria-hidden="true" />
              <span>SmartScan</span>
            </button>
            <button
              type="button"
              className="quick-search-btn"
              onClick={onNavigateToSearch}
            >
              <Search className="tiny-icon" aria-hidden="true" />
              <span>Search Database</span>
            </button>
          </div>
        </div>

        {/* Allergy & Dietary Guard Active Banner */}
        <div className="profile-active-guard-bar">
          <div className="guard-status-side">
            <ShieldCheck className="guard-icon text-brand-green" aria-hidden="true" />
            <div className="guard-details">
              <span className="guard-title">Active Personal Guard:</span>
              <span className="guard-chips">
                Diet: <strong>{dietaryPattern}</strong>
                {userAllergens.length > 0 ? (
                  <> • Avoiding: <strong>{userAllergens.join(", ")}</strong></>
                ) : (
                  <> • No allergens flagged</>
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="edit-guard-link"
            onClick={onNavigateToProfile}
          >
            Edit Preferences →
          </button>
        </div>
      </section>

      {/* 4 Core Summary Cards Grid */}
      <section className="dashboard-cards-grid">
        {/* Card 1: My Kitchen Pantry */}
        <div className="dashboard-summary-card">
          <div className="card-header-icon-row">
            <div className="card-icon-bubble kitchen-bubble">
              <Refrigerator className="summary-icon" aria-hidden="true" />
            </div>
            {expiringSoonCount > 0 && (
              <span className="urgency-badge pulse-warning">
                <AlertTriangle className="tiny-icon" /> {expiringSoonCount} Expiring Soon
              </span>
            )}
          </div>
          <h3 className="card-metric-number">{kitchenCount}</h3>
          <h4 className="card-title">Kitchen Pantry Items</h4>
          <p className="card-description">
            Active food packages in your kitchen. Monitored for freshness and expiration.
          </p>
          <div className="card-footer-action">
            <button
              type="button"
              className="card-action-btn"
              onClick={onNavigateToKitchen}
            >
              <span>Manage Kitchen</span>
              <ArrowRight className="tiny-icon" />
            </button>
          </div>
        </div>

        {/* Card 2: My Personal Catalogue */}
        <div className="dashboard-summary-card">
          <div className="card-header-icon-row">
            <div className="card-icon-bubble catalogue-bubble">
              <BookOpen className="summary-icon" aria-hidden="true" />
            </div>
            <span className="status-pill text-brand-green">Private to You</span>
          </div>
          <h3 className="card-metric-number">{catalogueItems.length}</h3>
          <h4 className="card-title">Saved Catalogue Products</h4>
          <p className="card-description">
            Your personal collection of reviewed packaged foods with full nutritional reports.
          </p>
          <div className="card-footer-action">
            <button
              type="button"
              className="card-action-btn"
              onClick={onNavigateToCatalogue}
            >
              <span>View My Catalogue</span>
              <ArrowRight className="tiny-icon" />
            </button>
          </div>
        </div>

        {/* Card 3: Expiry Reminders */}
        <div className="dashboard-summary-card">
          <div className="card-header-icon-row">
            <div className="card-icon-bubble reminders-bubble">
              <Bell className="summary-icon" aria-hidden="true" />
            </div>
          </div>
          <h3 className="card-metric-number">{expiringSoonCount > 0 ? expiringSoonCount : "0"}</h3>
          <h4 className="card-title">Urgent Expiry Reminders</h4>
          <p className="card-description">
            Timely reminders to consume open items before they spoil. Zero kitchen food waste.
          </p>
          <div className="card-footer-action">
            <button
              type="button"
              className="card-action-btn"
              onClick={onNavigateToReminders}
            >
              <span>View Reminders</span>
              <ArrowRight className="tiny-icon" />
            </button>
          </div>
        </div>

        {/* Card 4: Smart Shopping List */}
        <div className="dashboard-summary-card">
          <div className="card-header-icon-row">
            <div className="card-icon-bubble shopping-bubble">
              <ShoppingBag className="summary-icon" aria-hidden="true" />
            </div>
          </div>
          <h3 className="card-metric-number">Auto</h3>
          <h4 className="card-title">Smart Shopping List</h4>
          <p className="card-description">
            Automatically replenishes depleted pantry essentials and lets you plan weekly grocery runs.
          </p>
          <div className="card-footer-action">
            <button
              type="button"
              className="card-action-btn"
              onClick={onNavigateToShopping}
            >
              <span>Open Shopping List</span>
              <ArrowRight className="tiny-icon" />
            </button>
          </div>
        </div>
      </section>

      {/* Quick In-Dashboard Food Search */}
      <section className="dashboard-search-section panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">QUICK SCAN & RESEARCH</p>
            <h2 className="panel-title-with-icon">
              <Sparkles className="title-icon text-brand-green" aria-hidden="true" />
              Search or Scan Any Product
            </h2>
          </div>
        </div>
        <p className="muted">
          Type any product name or brand to inspect its health rating, nutritional breakdown, and click "Add to My Catalogue" to save it.
        </p>

        <InternetProductSearch
          userId={userId}
          onSelectProductForKitchen={() => onNavigateToKitchen()}
          onRequireAuthPrompt={onNavigateToProfile}
        />
      </section>
    </div>
  );
}
