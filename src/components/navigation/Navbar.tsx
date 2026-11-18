import { useState, useEffect, useRef } from "react";
import {
  Show,
  SignInButton,
  SignUpButton,
  SignOutButton,
  OrganizationSwitcher,
  useUser,
  useOrganization
} from "@clerk/react";
import { FoodCueLogo } from "../brand/FoodCueLogo";
import type { ActiveTab } from "../../app/App";
import { syncStatus } from "../../sync/state/syncStatus";
import { syncCoordinator } from "../../sync/engine/syncCoordinator";
import { MigrationWizard } from "../../features/sync/MigrationWizard";
import {
  Home,
  Search,
  Sparkles,
  Refrigerator,
  Bell,
  ShoppingBag,
  BookOpen,
  User,
  Shield,
  Menu,
  X,
  ChevronDown,
  Users,
  LogOut,
  LogIn,
  UserPlus,
  Cloud,
  RefreshCw
} from "lucide-react";

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  syncActive?: boolean;
}

export function Navbar({ activeTab, onSelectTab }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);
  const [syncState, setSyncState] = useState(syncStatus.getState());
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { user } = useUser();
  const { organization } = useOrganization();

  useEffect(() => {
    const unsub = syncStatus.subscribe((s) => setSyncState(s));
    return () => unsub();
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer on ESC or tab selection
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleTabClick(tab: ActiveTab) {
    onSelectTab(tab);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const userDisplayName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Account";

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") ||
    userDisplayName[0]?.toUpperCase() ||
    "U";

  // Public Landing Page Navbar (Guest on Home Tab):
  // Clean, minimal navbar with ONLY Logo on left, and Sign In & Sign Up on right.
  const isPublicLanding = !user && activeTab === "home";

  if (isPublicLanding) {
    return (
      <header className="navbar-header public-landing-header" role="banner">
        <div className="navbar-container public-landing-navbar-container">
          {/* Left: Brand & Tagline */}
          <a
            className="navbar-brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleTabClick("home");
            }}
            aria-label="FoodCue — Know your food. Manage your kitchen."
          >
            <FoodCueLogo size={36} />
            <div className="brand-text-block">
              <span className="brand-name">FoodCue</span>
              <span className="brand-tagline">Know your food. Manage your kitchen.</span>
            </div>
          </a>

          {/* Right: Only Sign In & Sign Up options */}
          <div className="landing-navbar-auth-actions" aria-label="Account actions">
            <SignInButton mode="modal">
              <button
                type="button"
                className="landing-nav-signin-btn"
                aria-label="Sign In"
              >
                <LogIn className="auth-btn-icon" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button
                type="button"
                className="landing-nav-signup-btn"
                aria-label="Sign Up"
              >
                <UserPlus className="auth-btn-icon" aria-hidden="true" />
                <span>Sign Up</span>
              </button>
            </SignUpButton>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="navbar-header" role="banner">
        <div className="navbar-container">
          {/* Left: Brand & Tagline */}
          <a
            className="navbar-brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleTabClick("home");
            }}
            aria-label="FoodCue Home — Return to Dashboard"
          >
            <FoodCueLogo size={36} />
            <div className="brand-text-block">
              <span className="brand-name">FoodCue</span>
              <span className="brand-tagline">Know your food. Manage your kitchen.</span>
            </div>
          </a>

          {/* Center: Main Navigation Links */}
          <nav className="navbar-center-nav" aria-label="Main application navigation">
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "home" ? "active" : ""}`}
              onClick={() => handleTabClick("home")}
              aria-current={activeTab === "home" ? "page" : undefined}
            >
              <Home className="nav-icon" aria-hidden="true" />
              <span>{user ? "Dashboard" : "Home"}</span>
            </button>

            <button
              type="button"
              className={`nav-link-btn ${activeTab === "scan" ? "active" : ""}`}
              onClick={() => handleTabClick("scan")}
              aria-current={activeTab === "scan" ? "page" : undefined}
            >
              <Sparkles className="nav-icon" aria-hidden="true" />
              <span>SmartScan</span>
            </button>

            <button
              type="button"
              className={`nav-link-btn ${activeTab === "search" ? "active" : ""}`}
              onClick={() => handleTabClick("search")}
              aria-current={activeTab === "search" ? "page" : undefined}
            >
              <Search className="nav-icon" aria-hidden="true" />
              <span>Search</span>
            </button>

            <button
              type="button"
              className={`nav-link-btn ${activeTab === "kitchen" ? "active" : ""}`}
              onClick={() => handleTabClick("kitchen")}
              aria-current={activeTab === "kitchen" ? "page" : undefined}
            >
              <Refrigerator className="nav-icon" aria-hidden="true" />
              <span>My Kitchen</span>
            </button>

            <button
              type="button"
              className={`nav-link-btn ${activeTab === "reminders" ? "active" : ""}`}
              onClick={() => handleTabClick("reminders")}
              aria-current={activeTab === "reminders" ? "page" : undefined}
            >
              <Bell className="nav-icon" aria-hidden="true" />
              <span>Reminders</span>
            </button>

            <button
              type="button"
              className={`nav-link-btn ${activeTab === "shopping" ? "active" : ""}`}
              onClick={() => handleTabClick("shopping")}
              aria-current={activeTab === "shopping" ? "page" : undefined}
            >
              <ShoppingBag className="nav-icon" aria-hidden="true" />
              <span>Shopping List</span>
            </button>

            <button
              type="button"
              className={`nav-link-btn ${activeTab === "catalog" ? "active" : ""}`}
              onClick={() => handleTabClick("catalog")}
              aria-current={activeTab === "catalog" ? "page" : undefined}
            >
              <BookOpen className="nav-icon" aria-hidden="true" />
              <span>Catalogue</span>
            </button>
          </nav>

          {/* Right: Account, Status & Privacy Controls */}
          <div className="navbar-right-actions">
            {/* Storage / Cloud Sync Status Indicator — Links to Privacy & Cloud (Section 20) */}
            {syncState.isCloudEnabled ? (
              <button
                type="button"
                className={`sync-status-badge ${syncStatus.getConsumerLabel().variant}`}
                onClick={() => handleTabClick("privacy")}
                title={`${syncStatus.getConsumerLabel().text} — Click to view Privacy & Cloud`}
                aria-label={`Sync Status: ${syncStatus.getConsumerLabel().text}. Open Privacy & Cloud`}
              >
                <span className={`sync-status-dot ${syncStatus.getConsumerLabel().variant}`} aria-hidden="true" />
                <span className="sync-status-text">{syncStatus.getConsumerLabel().text}</span>
              </button>
            ) : (
              <button
                type="button"
                className="local-status-badge"
                onClick={() => handleTabClick("privacy")}
                title="Stored on this device — Click to view Privacy & Cloud"
                aria-label="Storage Status: Stored on this device. Open Privacy & Cloud"
              >
                <span className="local-status-dot" aria-hidden="true" />
                <span className="local-status-text">Stored on this device</span>
              </button>
            )}

            {/* Privacy Shortcut */}
            <button
              type="button"
              className={`navbar-privacy-btn ${activeTab === "privacy" ? "active" : ""}`}
              onClick={() => handleTabClick("privacy")}
              title="Privacy Policy and Local Data Controls"
              aria-label="Privacy and Local Data Controls"
            >
              <Shield className="privacy-btn-icon" aria-hidden="true" />
              <span className="privacy-btn-text">Privacy</span>
            </button>

            {/* Authentication Controls */}
            <div className="navbar-auth-controls">
              {/* Signed Out View: Sign In & Sign Up */}
              <Show when="signed-out">
                <div className="signed-out-actions">
                  <SignInButton mode="modal">
                    <button type="button" className="btn-auth-signin">
                      <LogIn className="auth-btn-icon" aria-hidden="true" />
                      <span>Sign In</span>
                    </button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <button type="button" className="btn-auth-signup">
                      <UserPlus className="auth-btn-icon" aria-hidden="true" />
                      <span>Sign Up</span>
                    </button>
                  </SignUpButton>
                </div>
              </Show>

              {/* Signed In View: Household Organization & Profile Dropdown */}
              <Show when="signed-in">
                <div className="signed-in-actions">
                  {/* Household Organization Switcher */}
                  <div className="navbar-org-switcher" title="Switch Household / Personal Pantry">
                    <OrganizationSwitcher hidePersonal={false} />
                  </div>

                  {/* Profile Dropdown Trigger */}
                  <div className="profile-dropdown-container" ref={dropdownRef}>
                    <button
                      type="button"
                      className={`profile-avatar-trigger ${profileDropdownOpen ? "open" : ""}`}
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      aria-expanded={profileDropdownOpen}
                      aria-haspopup="menu"
                      aria-label="User Account Menu"
                    >
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={userDisplayName}
                          className="user-avatar-image"
                        />
                      ) : (
                        <div className="user-avatar-initials" aria-hidden="true">
                          {userInitials}
                        </div>
                      )}
                      <span className="user-display-name-short">{userDisplayName}</span>
                      <ChevronDown className="avatar-dropdown-chevron" aria-hidden="true" />
                    </button>

                    {/* Dropdown Menu */}
                    {profileDropdownOpen && (
                      <div className="profile-dropdown-menu" role="menu">
                        <div className="dropdown-user-header">
                          <div className="dropdown-avatar-large">
                            {user?.imageUrl ? (
                              <img src={user.imageUrl} alt="" className="user-avatar-image" />
                            ) : (
                              <div className="user-avatar-initials">{userInitials}</div>
                            )}
                          </div>
                          <div className="dropdown-user-info">
                            <span className="dropdown-user-name">{userDisplayName}</span>
                            {userEmail && <span className="dropdown-user-email">{userEmail}</span>}
                            {organization && (
                              <span className="dropdown-household-badge">
                                <Users className="badge-icon-xs" />
                                {organization.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="dropdown-divider" role="separator" />

                        <div className="dropdown-menu-items">
                          <button
                            type="button"
                            className="dropdown-item-btn"
                            role="menuitem"
                            onClick={() => handleTabClick("profile")}
                          >
                            <User className="dropdown-item-icon" />
                            <span>My Profile & Preferences</span>
                          </button>

                          <button
                            type="button"
                            className="dropdown-item-btn"
                            role="menuitem"
                            onClick={() => handleTabClick("household")}
                          >
                            <Users className="dropdown-item-icon text-indigo-600" />
                            <span>Household Management & Sharing</span>
                          </button>

                          <button
                            type="button"
                            className="dropdown-item-btn"
                            role="menuitem"
                            onClick={() => handleTabClick("privacy")}
                          >
                            <Shield className="dropdown-item-icon" />
                            <span>Privacy & Local Data</span>
                          </button>

                          {syncState.isCloudEnabled ? (
                            <button
                              type="button"
                              className="dropdown-item-btn"
                              role="menuitem"
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                syncCoordinator.triggerSync();
                              }}
                            >
                              <RefreshCw className="dropdown-item-icon text-brand" />
                              <span>Sync Kitchen Now</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="dropdown-item-btn"
                              role="menuitem"
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                setShowMigrationWizard(true);
                              }}
                            >
                              <Cloud className="dropdown-item-icon text-brand" />
                              <span>Connect Kitchen to Cloud</span>
                            </button>
                          )}
                        </div>

                        <div className="dropdown-divider" role="separator" />

                        <div className="dropdown-footer">
                          <SignOutButton>
                            <button type="button" className="dropdown-signout-btn" role="menuitem">
                              <LogOut className="dropdown-item-icon text-danger" />
                              <span>Sign Out</span>
                            </button>
                          </SignOutButton>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Show>
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="mobile-toggle-icon" />
              ) : (
                <Menu className="mobile-toggle-icon" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="mobile-drawer-content"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              <div className="mobile-drawer-header">
                <FoodCueLogo size={32} showText />
                <button
                  type="button"
                  className="mobile-drawer-close"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="close-icon" />
                </button>
              </div>

              {/* Mobile Auth Bar */}
              <div className="mobile-auth-section">
                <Show when="signed-out">
                  <div className="mobile-auth-grid">
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        className="mobile-btn-signin"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LogIn className="auth-btn-icon" />
                        <span>Sign In</span>
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button
                        type="button"
                        className="mobile-btn-signup"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <UserPlus className="auth-btn-icon" />
                        <span>Sign Up</span>
                      </button>
                    </SignUpButton>
                  </div>
                </Show>

                <Show when="signed-in">
                  <div className="mobile-user-card">
                    <div className="mobile-user-avatar">
                      {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="" className="user-avatar-image" />
                      ) : (
                        <div className="user-avatar-initials">{userInitials}</div>
                      )}
                    </div>
                    <div className="mobile-user-meta">
                      <span className="mobile-user-name">{userDisplayName}</span>
                      {userEmail && <span className="mobile-user-email">{userEmail}</span>}
                    </div>
                  </div>
                </Show>
              </div>

              {/* Mobile Nav Links */}
              <div className="mobile-nav-links">
                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "home" ? "active" : ""}`}
                  onClick={() => handleTabClick("home")}
                >
                  <Home className="mobile-item-icon" />
                  <span>{user ? "Dashboard" : "Home"}</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "scan" ? "active" : ""}`}
                  onClick={() => handleTabClick("scan")}
                >
                  <Sparkles className="mobile-item-icon" />
                  <span>SmartScan</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "search" ? "active" : ""}`}
                  onClick={() => handleTabClick("search")}
                >
                  <Search className="mobile-item-icon" />
                  <span>Search Products</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "kitchen" ? "active" : ""}`}
                  onClick={() => handleTabClick("kitchen")}
                >
                  <Refrigerator className="mobile-item-icon" />
                  <span>My Kitchen</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "reminders" ? "active" : ""}`}
                  onClick={() => handleTabClick("reminders")}
                >
                  <Bell className="mobile-item-icon" />
                  <span>Reminders</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "shopping" ? "active" : ""}`}
                  onClick={() => handleTabClick("shopping")}
                >
                  <ShoppingBag className="mobile-item-icon" />
                  <span>Shopping List</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "catalog" ? "active" : ""}`}
                  onClick={() => handleTabClick("catalog")}
                >
                  <BookOpen className="mobile-item-icon" />
                  <span>Catalogue</span>
                </button>

                <button
                  type="button"
                  className={`mobile-nav-item ${activeTab === "privacy" ? "active" : ""}`}
                  onClick={() => handleTabClick("privacy")}
                >
                  <Shield className="mobile-item-icon" />
                  <span>Privacy & Local Data</span>
                </button>

                <Show when="signed-in">
                  <button
                    type="button"
                    className={`mobile-nav-item ${activeTab === "profile" ? "active" : ""}`}
                    onClick={() => handleTabClick("profile")}
                  >
                    <User className="mobile-item-icon" />
                    <span>My Profile & Preferences</span>
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-item ${activeTab === "household" ? "active" : ""}`}
                    onClick={() => handleTabClick("household")}
                  >
                    <Users className="mobile-item-icon text-indigo-600" />
                    <span>Household Management</span>
                  </button>

                  <div className="mobile-signout-wrapper">
                    <SignOutButton>
                      <button
                        type="button"
                        className="mobile-signout-btn"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LogOut className="mobile-item-icon text-danger" />
                        <span>Sign Out</span>
                      </button>
                    </SignOutButton>
                  </div>
                </Show>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="mobile-drawer-footer">
                <span className="drawer-footer-text">
                  FoodCue is 100% local-first and private by default.
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (SmartScan, Kitchen, Reminders, Shopping, More) */}
      <nav className="mobile-bottom-bar" aria-label="Quick mobile navigation">
        <button
          type="button"
          className={`bottom-bar-btn ${activeTab === "scan" ? "active" : ""}`}
          onClick={() => handleTabClick("scan")}
        >
          <Sparkles className="bottom-bar-icon" />
          <span>Scan</span>
        </button>

        <button
          type="button"
          className={`bottom-bar-btn ${activeTab === "kitchen" ? "active" : ""}`}
          onClick={() => handleTabClick("kitchen")}
        >
          <Refrigerator className="bottom-bar-icon" />
          <span>Kitchen</span>
        </button>

        <button
          type="button"
          className={`bottom-bar-btn ${activeTab === "reminders" ? "active" : ""}`}
          onClick={() => handleTabClick("reminders")}
        >
          <Bell className="bottom-bar-icon" />
          <span>Remind</span>
        </button>

        <button
          type="button"
          className={`bottom-bar-btn ${activeTab === "shopping" ? "active" : ""}`}
          onClick={() => handleTabClick("shopping")}
        >
          <ShoppingBag className="bottom-bar-icon" />
          <span>Shop</span>
        </button>

        <button
          type="button"
          className={`bottom-bar-btn ${activeTab === "privacy" || activeTab === "profile" || activeTab === "catalog" ? "active" : ""}`}
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="bottom-bar-icon" />
          <span>More</span>
        </button>
      </nav>

      {/* Migration Wizard Modal */}
      <MigrationWizard
        isOpen={showMigrationWizard}
        onClose={() => setShowMigrationWizard(false)}
        onComplete={() => setShowMigrationWizard(false)}
      />
    </>
  );
}
