import React, { useState, useEffect } from "react";
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
  ShoppingBag,
  Users,
  Clock,
  UserPlus
} from "lucide-react";
import { getAllRecords } from "../../adapters/storage/database";
import { projectBalances } from "../../domain/services/pantryLedger";
import type { PantryEvent } from "../../domain/entities/pantry";
import { userCatalogueService } from "../../domain/services/userCatalogueService";
import type { UserCatalogueItem } from "../../domain/entities/nutritionalProfile";
import { InternetProductSearch } from "../search/InternetProductSearch";
import type { HouseholdRecord } from "../../server/database/repositories/household.repository";
import type { OnboardingApiClient } from "../../services/onboardingApiClient";

interface AuthenticatedDashboardProps {
  apiClient?: OnboardingApiClient;
  currentHousehold?: HouseholdRecord | null;
  onNavigateToScan: () => void;
  onNavigateToSearch: () => void;
  onNavigateToKitchen: () => void;
  onNavigateToCatalogue: () => void;
  onNavigateToProfile: () => void;
  onNavigateToReminders: () => void;
  onNavigateToShopping: () => void;
  onNavigateToHousehold?: () => void;
}

export const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({
  apiClient: _apiClient,
  currentHousehold,
  onNavigateToScan,
  onNavigateToSearch,
  onNavigateToKitchen,
  onNavigateToCatalogue,
  onNavigateToProfile,
  onNavigateToReminders,
  onNavigateToShopping,
  onNavigateToHousehold
}) => {
  const { user } = useUser();
  const [kitchenCount, setKitchenCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [catalogueItems, setCatalogueItems] = useState<UserCatalogueItem[]>([]);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const [dietaryPattern, setDietaryPattern] = useState<string>("Standard");

  const userName = user?.firstName || user?.fullName || "there";
  const userId = user?.id || "local-user";

  // Compute time-of-day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    // 1. Load kitchen inventory counts
    getAllRecords<PantryEvent>("pantryEvents").then((events) => {
      const balances = projectBalances(events);
      const active = balances.filter((b) => b.quantity > 0);
      setKitchenCount(active.length);

      // Check items expiring in next 3 days
      const now = new Date();
      let expiringCount = 0;
      let expired = 0;
      for (const ev of events) {
        if (ev.dateValue && ev.eventType === "add") {
          const d = new Date(ev.dateValue);
          const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            expired++;
          } else if (diffDays <= 3) {
            expiringCount++;
          }
        }
      }
      setExpiringSoonCount(expiringCount);
      setExpiredCount(expired);
    }).catch(() => {});

    // 2. Load user's personal catalogue
    if (user?.id) {
      userCatalogueService.getUserCatalogue(user.id).then((items) => {
        setCatalogueItems(items);
      }).catch(() => {});
    }

    // 3. Load user profile preferences from localStorage or API
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
      <section className="dashboard-hero-header" aria-labelledby="dashboard-welcome-heading">
        <div className="welcome-headline-row">
          <div>
            <div className="eyebrow flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-brand-green" aria-hidden="true" />
              <span>YOUR KITCHEN & HEALTH DASHBOARD</span>
            </div>
            <h1 id="dashboard-welcome-heading" className="welcome-user-title">
              {greeting}, <span className="text-brand-green">{userName}</span>!
            </h1>
            <p className="welcome-subtitle">
              Here's what's happening in your kitchen today.
            </p>
          </div>

          <div className="quick-action-buttons">
            <button
              type="button"
              className="quick-scan-primary-btn"
              onClick={onNavigateToScan}
              aria-label="SmartScan Food Product"
            >
              <Camera className="tiny-icon" aria-hidden="true" />
              <span>SmartScan</span>
            </button>
            <button
              type="button"
              className="quick-search-btn"
              onClick={onNavigateToSearch}
              aria-label="Search Food Database"
            >
              <Search className="tiny-icon" aria-hidden="true" />
              <span>Search Database</span>
            </button>
          </div>
        </div>

        {/* Active Mode & Personal Guard Bar */}
        <div className="profile-active-guard-bar">
          <div className="guard-status-side">
            <ShieldCheck className="guard-icon text-brand-green" aria-hidden="true" />
            <div className="guard-details">
              <span className="guard-title">
                {currentHousehold ? (
                  <>Household Mode: <strong>{currentHousehold.name}</strong></>
                ) : (
                  <>Personal Kitchen Mode (Private)</>
                )}
              </span>
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

          <div className="flex items-center gap-2">
            {onNavigateToHousehold && (
              <button
                type="button"
                className="edit-guard-link"
                onClick={onNavigateToHousehold}
              >
                {currentHousehold ? "Manage Household →" : "Invite Family →"}
              </button>
            )}
            <button
              type="button"
              className="edit-guard-link"
              onClick={onNavigateToProfile}
            >
              Edit Preferences →
            </button>
          </div>
        </div>
      </section>

      {/* Core Summary Cards Grid */}
      <section className="dashboard-cards-grid" aria-label="Kitchen Summary Cards">
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

        {/* Card 2: Expiry Overview */}
        <div className="dashboard-summary-card">
          <div className="card-header-icon-row">
            <div className="card-icon-bubble reminders-bubble">
              <Bell className="summary-icon" aria-hidden="true" />
            </div>
            {expiredCount > 0 && (
              <span className="urgency-badge text-danger">
                {expiredCount} Expired
              </span>
            )}
          </div>
          <h3 className="card-metric-number">{expiringSoonCount > 0 ? expiringSoonCount : "0"}</h3>
          <h4 className="card-title">Urgent Expiry Alerts</h4>
          <p className="card-description">
            Items approaching recommended consumption dates. Reduce food waste and save grocery costs.
          </p>
          <div className="card-footer-action">
            <button
              type="button"
              className="card-action-btn"
              onClick={onNavigateToReminders}
            >
              <span>View Expiry List</span>
              <ArrowRight className="tiny-icon" />
            </button>
          </div>
        </div>

        {/* Card 3: Smart Shopping List */}
        <div className="dashboard-summary-card">
          <div className="card-header-icon-row">
            <div className="card-icon-bubble shopping-bubble">
              <ShoppingBag className="summary-icon" aria-hidden="true" />
            </div>
          </div>
          <h3 className="card-metric-number">Auto</h3>
          <h4 className="card-title">Smart Shopping List</h4>
          <p className="card-description">
            Plan your grocery trips and automatically restock depleted kitchen pantry essentials.
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

        {/* Card 4: Household Collaboration & Members */}
        <div className="dashboard-summary-card">
          <div className="card-header-icon-row">
            <div className="card-icon-bubble bg-indigo-50 text-indigo-700">
              <Users className="summary-icon" aria-hidden="true" />
            </div>
            <span className="status-pill text-indigo-600">
              {currentHousehold ? "Collaborative" : "Solo Mode"}
            </span>
          </div>
          <h3 className="card-metric-number">
            {currentHousehold ? currentHousehold.name : "Personal"}
          </h3>
          <h4 className="card-title">
            {currentHousehold ? "Household Sharing Active" : "Family Kitchen Sharing"}
          </h4>
          <p className="card-description">
            {currentHousehold
              ? `Syncing shared inventory and grocery lists across household members.`
              : "Invite family members or roommates to synchronize your kitchen and avoid duplicate buys."}
          </p>
          <div className="card-footer-action">
            <button
              type="button"
              className="card-action-btn"
              onClick={onNavigateToHousehold || onNavigateToProfile}
            >
              {currentHousehold ? (
                <>
                  <span>Manage Members</span>
                  <ArrowRight className="tiny-icon" />
                </>
              ) : (
                <>
                  <UserPlus className="tiny-icon mr-1" />
                  <span>Invite Family</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 5: Saved Catalogue Products */}
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
      </section>

      {/* Quick In-Dashboard Food Search */}
      <section className="dashboard-search-section panel" aria-labelledby="in-dash-search-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">QUICK SCAN & RESEARCH</p>
            <h2 id="in-dash-search-heading" className="panel-title-with-icon">
              <Sparkles className="title-icon text-brand-green" aria-hidden="true" />
              Search or Scan Any Packaged Food
            </h2>
          </div>
        </div>
        <p className="muted">
          Type any product name or brand to inspect its health rating, nutritional breakdown, and allergen alerts.
        </p>

        <InternetProductSearch
          userId={userId}
          onSelectProductForKitchen={() => onNavigateToKitchen()}
          onRequireAuthPrompt={onNavigateToProfile}
        />
      </section>
    </div>
  );
};
