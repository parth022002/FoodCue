import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { FoodCueLogo } from "../brand/FoodCueLogo";
import type { ActiveTab } from "../../app/App";
import {
  Sparkles,
  Refrigerator,
  Bell,
  ShoppingBag,
  BookOpen,
  User,
  Shield,
  Code2,
  Lock,
  Database
} from "lucide-react";

interface FooterProps {
  onSelectTab: (tab: ActiveTab) => void;
}

export function Footer({ onSelectTab }: FooterProps) {
  const currentYear = new Date().getFullYear();

  function handleTabClick(tab: ActiveTab) {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="footer-redesigned" role="contentinfo">
      <div className="footer-container">
        {/* Main 4-Column Grid */}
        <div className="footer-grid">
          {/* Column 1: Brand & Developer Attribution */}
          <div className="footer-column brand-column">
            <a
              href="/"
              className="footer-brand-link"
              onClick={(e) => {
                e.preventDefault();
                handleTabClick("scan");
              }}
            >
              <FoodCueLogo size={32} />
              <div className="brand-text-block">
                <span className="footer-brand-name">FoodCue</span>
                <span className="footer-brand-tagline">Know your food. Manage your kitchen.</span>
              </div>
            </a>

            <p className="footer-brand-desc">
              FoodCue helps you understand packaged-food labels and organise your kitchen with privacy-first tools.
            </p>

            <div className="developer-badge">
              <Code2 className="dev-icon" aria-hidden="true" />
              <span>Developed by <strong>Parth Ahuja</strong></span>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="footer-column">
            <h4 className="footer-col-title">Explore Features</h4>
            <ul className="footer-link-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("scan")}
                >
                  <Sparkles className="footer-link-icon" />
                  <span>SmartScan Intelligence</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("kitchen")}
                >
                  <Refrigerator className="footer-link-icon" />
                  <span>My Kitchen & Pantry</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("reminders")}
                >
                  <Bell className="footer-link-icon" />
                  <span>Expiry & Use-Soon Reminders</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("shopping")}
                >
                  <ShoppingBag className="footer-link-icon" />
                  <span>Smart Shopping List</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("catalog")}
                >
                  <BookOpen className="footer-link-icon" />
                  <span>Packaged Food Catalogue</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Account & Household Sharing */}
          <div className="footer-column">
            <h4 className="footer-col-title">Account & Household</h4>
            <ul className="footer-link-list">
              <Show when="signed-out">
                <li>
                  <SignInButton mode="modal">
                    <button type="button" className="footer-link-btn">
                      <span>Sign In to Your Account</span>
                    </button>
                  </SignInButton>
                </li>
                <li>
                  <SignUpButton mode="modal">
                    <button type="button" className="footer-link-btn">
                      <span>Create Free Account</span>
                    </button>
                  </SignUpButton>
                </li>
              </Show>

              <Show when="signed-in">
                <li>
                  <button
                    type="button"
                    className="footer-link-btn"
                    onClick={() => handleTabClick("profile")}
                  >
                    <User className="footer-link-icon" />
                    <span>My Profile & Household</span>
                  </button>
                </li>
              </Show>

              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("profile")}
                >
                  <span>Household & Family Sharing</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("privacy")}
                >
                  <span>Multi-Device Cloud Sync</span>
                </button>
              </li>
              <li>
                <span className="footer-static-note">
                  <Database className="note-icon" /> Offline by default in IndexedDB
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Privacy & Information */}
          <div className="footer-column">
            <h4 className="footer-col-title">Privacy & Information</h4>
            <ul className="footer-link-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn font-medium"
                  onClick={() => handleTabClick("privacy")}
                >
                  <Shield className="footer-link-icon text-brand" />
                  <span>Privacy Policy & Local Data</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("privacy")}
                >
                  <Lock className="footer-link-icon" />
                  <span>Zero Silent Cloud Uploads</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("privacy")}
                >
                  <span>Export & Backup Your Data</span>
                </button>
              </li>
              <li>
                <span className="footer-static-note">
                  FSSAI Labelling Amendment 6 Baseline
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="footer-divider" />

        {/* Bottom Section: Disclaimer & Copyright */}
        <div className="footer-bottom">
          <p className="footer-disclaimer">
            <strong>Important Safety Notice:</strong> FoodCue is a food-label understanding and kitchen-organisation aid. It does not guarantee product safety, authenticity or medical suitability. Always check the actual packaging and follow relevant food-safety guidance.
          </p>

          <div className="footer-bottom-meta">
            <span className="footer-copyright">
              © {currentYear} FoodCue. All rights reserved.
            </span>
            <span className="footer-principles">
              Local-First PWA • Private by Default • Zero-Cash Baseline
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
