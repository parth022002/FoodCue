import React from "react";
import { FoodCueLogo } from "../brand/FoodCueLogo";
import type { ActiveTab } from "../../app/App";
import { Shield, FileText, HelpCircle } from "lucide-react";

interface AuthenticatedFooterProps {
  onSelectTab: (tab: ActiveTab) => void;
}

export const AuthenticatedFooter: React.FC<AuthenticatedFooterProps> = ({ onSelectTab }) => {
  const currentYear = new Date().getFullYear();

  function handleTabClick(tab: ActiveTab) {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="footer-auth-compact" role="contentinfo" aria-label="Application Workspace Footer">
      <div className="auth-footer-container">
        {/* Left: Brand & Copyright */}
        <div className="auth-footer-left">
          <FoodCueLogo size={20} />
          <span className="auth-footer-brand">FoodCue</span>
          <span className="auth-footer-sep">•</span>
          <span className="auth-footer-copy">&copy; {currentYear} FoodCue. All rights reserved.</span>
        </div>

        {/* Right: Utility & Legal Links */}
        <div className="auth-footer-links">
          <button
            type="button"
            className="auth-footer-link"
            onClick={() => handleTabClick("privacy")}
            title="View Privacy Policy and local storage controls"
          >
            <Shield className="tiny-icon" aria-hidden="true" />
            <span>Privacy</span>
          </button>

          <span className="auth-footer-sep">•</span>

          <button
            type="button"
            className="auth-footer-link"
            onClick={() => handleTabClick("terms")}
            title="View Terms of Service"
          >
            <FileText className="tiny-icon" aria-hidden="true" />
            <span>Terms</span>
          </button>

          <span className="auth-footer-sep">•</span>

          <a
            href="mailto:support@foodcue.app?subject=FoodCue%20Feedback%20or%20Help"
            className="auth-footer-link"
            title="Contact FoodCue Support or share feedback"
          >
            <HelpCircle className="tiny-icon" aria-hidden="true" />
            <span>Help & Feedback</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
