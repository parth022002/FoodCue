import React from "react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { FoodCueLogo } from "../brand/FoodCueLogo";
import type { ActiveTab } from "../../app/App";
import {
  Sparkles,
  Refrigerator,
  Bell,
  Search,
  Shield,
  FileText,
  LogIn,
  UserPlus,
  CheckCircle2
} from "lucide-react";

interface PublicFooterProps {
  onSelectTab: (tab: ActiveTab) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onSelectTab }) => {
  const currentYear = new Date().getFullYear();

  function handleTabClick(tab: ActiveTab) {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="footer-public-redesigned" role="contentinfo" aria-label="FoodCue Public Footer">
      <div className="footer-container">
        {/* 4-Column Marketing Grid */}
        <div className="footer-grid">
          {/* Column 1: Brand & Overview */}
          <div className="footer-column brand-column">
            <a
              href="/"
              className="footer-brand-link"
              onClick={(e) => {
                e.preventDefault();
                handleTabClick("home");
              }}
              aria-label="FoodCue — Return to Homepage"
            >
              <FoodCueLogo size={32} />
              <div className="brand-text-block">
                <span className="footer-brand-name">FoodCue</span>
                <span className="footer-brand-tagline">Know your food. Manage your kitchen.</span>
              </div>
            </a>

            <p className="footer-brand-desc">
              FoodCue helps you discover food products, understand available food information,
              and manage your kitchen and household essentials in one privacy-first platform.
            </p>

            <div className="footer-trust-badge">
              <CheckCircle2 className="trust-icon text-brand-green" aria-hidden="true" />
              <span>Camera frames processed strictly in transient device memory</span>
            </div>
          </div>

          {/* Column 2: Product Capabilities */}
          <div className="footer-column">
            <h4 className="footer-col-title">Capabilities</h4>
            <ul className="footer-link-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("home")}
                >
                  <Sparkles className="footer-link-icon" aria-hidden="true" />
                  <span>SmartScan Barcode Decoding</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("home")}
                >
                  <Refrigerator className="footer-link-icon" aria-hidden="true" />
                  <span>Digital Kitchen & Pantry</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("home")}
                >
                  <Bell className="footer-link-icon" aria-hidden="true" />
                  <span>Proactive Expiry Reminders</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("home")}
                >
                  <Search className="footer-link-icon" aria-hidden="true" />
                  <span>Packaged Food Intelligence</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Trust */}
          <div className="footer-column">
            <h4 className="footer-col-title">Legal & Trust</h4>
            <ul className="footer-link-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("privacy")}
                >
                  <Shield className="footer-link-icon" aria-hidden="true" />
                  <span>Privacy Policy & Local Data</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleTabClick("terms")}
                >
                  <FileText className="footer-link-icon" aria-hidden="true" />
                  <span>Terms of Service</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Account & Access */}
          <div className="footer-column">
            <h4 className="footer-col-title">Account & Access</h4>
            <p className="footer-col-text">
              Sign in or create an account to start managing your kitchen pantry and household essentials.
            </p>
            <div className="footer-auth-buttons">
              <SignInButton mode="modal">
                <button type="button" className="footer-btn-signin" aria-label="Sign in to your account">
                  <LogIn className="btn-icon" aria-hidden="true" />
                  <span>Sign In</span>
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button type="button" className="footer-btn-signup" aria-label="Create a free FoodCue account">
                  <UserPlus className="btn-icon" aria-hidden="true" />
                  <span>Create Free Account</span>
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Clean Copyright & Developer Credit */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright-wrap">
            <p className="footer-copyright-text">
              &copy; {currentYear} FoodCue. All rights reserved.
            </p>
            <span className="dot-divider">•</span>
            <span className="footer-dev-credit">
              Developed by <strong className="dev-name">Parth Ahuja</strong>
            </span>
          </div>
          <div className="footer-bottom-links">
            <button
              type="button"
              className="footer-sub-link"
              onClick={() => handleTabClick("privacy")}
            >
              Privacy Policy
            </button>
            <span className="dot-divider">•</span>
            <button
              type="button"
              className="footer-sub-link"
              onClick={() => handleTabClick("terms")}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
