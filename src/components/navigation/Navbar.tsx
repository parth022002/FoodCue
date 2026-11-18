import React, { useState, useEffect, useRef } from "react";
import {
  SignInButton,
  SignUpButton,
  SignOutButton,
  useUser
} from "@clerk/react";
import { FoodCueLogo } from "../brand/FoodCueLogo";
import type { ActiveTab } from "../../app/App";
import {
  Home,
  Refrigerator,
  Sparkles,
  ShoppingBag,
  Search,
  Bell,
  UserPlus,
  User,
  Heart,
  ShieldAlert,
  Users,
  Shield,
  LogOut,
  ChevronDown,
  Menu,
  X,
  LogIn
} from "lucide-react";

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenInviteModal?: () => void;
  notificationCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenInviteModal,
  notificationCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { isSignedIn, user } = useUser();

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

  // =========================================================================
  // 1. PUBLIC NAVBAR (When unauthenticated)
  // Left: FoodCue logo + brand name
  // Right: Sign In + Sign Up buttons ONLY. No application navigation!
  // =========================================================================
  if (!isSignedIn) {
    return (
      <header className="navbar-header public-landing-header" role="banner" aria-label="Public navigation">
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

  // =========================================================================
  // 2. AUTHENTICATED NAVBAR (When logged in)
  // Left: FoodCue logo + brand name
  // Center: Home | My Kitchen | Scan | Shopping List | Explore
  // Right: Notifications | Invite | Profile (Exact mandatory order!)
  // =========================================================================
  return (
    <>
      <header className="navbar-header authenticated-app-header" role="banner" aria-label="Application navigation">
        <div className="navbar-container authenticated-navbar-container">
          {/* Left: Brand & Logo */}
          <div className="navbar-left-brand-row">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="navbar-mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <a
              className="navbar-brand"
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleTabClick("home");
              }}
              aria-label="FoodCue — Return to Home Dashboard"
            >
              <FoodCueLogo size={36} />
              <div className="brand-text-block">
                <span className="brand-name">FoodCue</span>
                <span className="brand-tagline">Know your food. Manage your kitchen.</span>
              </div>
            </a>
          </div>

          {/* Center: Main Application Navigation Destinations */}
          <nav className="navbar-center-nav" aria-label="Main application destinations">
            {/* 1. Home / Dashboard */}
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "home" ? "active" : ""}`}
              onClick={() => handleTabClick("home")}
              aria-current={activeTab === "home" ? "page" : undefined}
            >
              <Home className="nav-icon" aria-hidden="true" />
              <span>Home</span>
            </button>

            {/* 2. My Kitchen */}
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "kitchen" ? "active" : ""}`}
              onClick={() => handleTabClick("kitchen")}
              aria-current={activeTab === "kitchen" ? "page" : undefined}
            >
              <Refrigerator className="nav-icon" aria-hidden="true" />
              <span>My Kitchen</span>
            </button>

            {/* 3. Scan */}
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "scan" ? "active" : ""}`}
              onClick={() => handleTabClick("scan")}
              aria-current={activeTab === "scan" ? "page" : undefined}
            >
              <Sparkles className="nav-icon" aria-hidden="true" />
              <span>Scan</span>
            </button>

            {/* 4. Shopping List */}
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "shopping" ? "active" : ""}`}
              onClick={() => handleTabClick("shopping")}
              aria-current={activeTab === "shopping" ? "page" : undefined}
            >
              <ShoppingBag className="nav-icon" aria-hidden="true" />
              <span>Shopping List</span>
            </button>

            {/* 5. Explore */}
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "search" || activeTab === "catalog" ? "active" : ""}`}
              onClick={() => handleTabClick("search")}
              aria-current={activeTab === "search" || activeTab === "catalog" ? "page" : undefined}
            >
              <Search className="nav-icon" aria-hidden="true" />
              <span>Explore</span>
            </button>
          </nav>

          {/* Right: Mandatory arrangement: Notifications | Invite | Profile */}
          <div className="navbar-right-actions" aria-label="User actions">
            {/* 1. Notifications Button */}
            <button
              type="button"
              className={`navbar-action-btn ${activeTab === "reminders" ? "active" : ""}`}
              onClick={() => handleTabClick("reminders")}
              aria-label={`Notifications and Expiry Reminders ${notificationCount > 0 ? `(${notificationCount} urgent)` : ""}`}
              title="Notifications & Expiry Reminders"
            >
              <Bell className="nav-action-icon" aria-hidden="true" />
              {notificationCount > 0 && (
                <span className="navbar-notification-badge" aria-hidden="true">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            {/* 2. Invite Button (Immediately next to Profile!) */}
            <button
              type="button"
              className="navbar-invite-btn"
              onClick={onOpenInviteModal}
              aria-label="Invite Family & Friends to Household"
              title="Invite Family & Friends"
            >
              <UserPlus className="invite-btn-icon" aria-hidden="true" />
              <span className="invite-btn-label">Invite</span>
            </button>

            {/* 3. Profile Button & Dropdown */}
            <div className="profile-dropdown-container" ref={dropdownRef}>
              <button
                type="button"
                className={`profile-avatar-trigger ${profileDropdownOpen ? "open" : ""} ${activeTab === "profile" ? "active-route" : ""}`}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="menu"
                aria-label="User Account and Profile Menu"
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

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="profile-dropdown-menu" role="menu" aria-label="Profile navigation options">
                  <div className="dropdown-user-header">
                    <div className="dropdown-avatar-large">
                      {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="" className="user-avatar-image" />
                      ) : (
                        <div className="user-avatar-initials">{userInitials}</div>
                      )}
                    </div>
                    <div className="dropdown-user-info">
                      <strong className="user-name-text">{userDisplayName}</strong>
                      <span className="user-email-text">{userEmail}</span>
                      <span className="user-badge-role">Personal Profile</span>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {/* 1. My Profile */}
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    role="menuitem"
                    onClick={() => handleTabClick("profile")}
                  >
                    <User className="menu-item-icon text-brand-green" aria-hidden="true" />
                    <span>My Profile</span>
                  </button>

                  {/* 2. Food Preferences */}
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    role="menuitem"
                    onClick={() => handleTabClick("profile")}
                  >
                    <Heart className="menu-item-icon text-rose-500" aria-hidden="true" />
                    <span>Food Preferences</span>
                  </button>

                  {/* 3. Allergies & Restrictions */}
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    role="menuitem"
                    onClick={() => handleTabClick("profile")}
                  >
                    <ShieldAlert className="menu-item-icon text-amber-500" aria-hidden="true" />
                    <span>Allergies & Restrictions</span>
                  </button>

                  {/* 4. Household Management */}
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    role="menuitem"
                    onClick={() => handleTabClick("household")}
                  >
                    <Users className="menu-item-icon text-indigo-500" aria-hidden="true" />
                    <span>Household Management</span>
                  </button>

                  {/* 5. Privacy & Local Storage */}
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    role="menuitem"
                    onClick={() => handleTabClick("privacy")}
                  >
                    <Shield className="menu-item-icon text-slate-500" aria-hidden="true" />
                    <span>Privacy & Data Controls</span>
                  </button>

                  <div className="dropdown-divider" />

                  {/* 6. Sign Out */}
                  <SignOutButton>
                    <button
                      type="button"
                      className="dropdown-menu-item sign-out-item"
                      role="menuitem"
                    >
                      <LogOut className="menu-item-icon text-danger" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="navbar-mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-title">Navigation</span>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "home" ? "active" : ""}`}
                onClick={() => handleTabClick("home")}
              >
                <Home className="nav-icon" />
                <span>Home Dashboard</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "kitchen" ? "active" : ""}`}
                onClick={() => handleTabClick("kitchen")}
              >
                <Refrigerator className="nav-icon" />
                <span>My Kitchen</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "scan" ? "active" : ""}`}
                onClick={() => handleTabClick("scan")}
              >
                <Sparkles className="nav-icon" />
                <span>SmartScan Barcodes</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "shopping" ? "active" : ""}`}
                onClick={() => handleTabClick("shopping")}
              >
                <ShoppingBag className="nav-icon" />
                <span>Shopping List</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "search" || activeTab === "catalog" ? "active" : ""}`}
                onClick={() => handleTabClick("search")}
              >
                <Search className="nav-icon" />
                <span>Explore Products</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "reminders" ? "active" : ""}`}
                onClick={() => handleTabClick("reminders")}
              >
                <Bell className="nav-icon" />
                <span>Notifications & Reminders</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "profile" ? "active" : ""}`}
                onClick={() => handleTabClick("profile")}
              >
                <User className="nav-icon" />
                <span>Personal Profile</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-link ${activeTab === "household" ? "active" : ""}`}
                onClick={() => handleTabClick("household")}
              >
                <Users className="nav-icon" />
                <span>Household Management</span>
              </button>
            </nav>

            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="mobile-drawer-invite-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenInviteModal) onOpenInviteModal();
                }}
              >
                <UserPlus className="btn-icon" />
                <span>Invite Family & Friends</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
