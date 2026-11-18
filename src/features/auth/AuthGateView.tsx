import React from "react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { Lock, LogIn, UserPlus, ArrowLeft, ShieldCheck, Check } from "lucide-react";

interface AuthGateViewProps {
  targetFeatureName?: string;
  onReturnHome: () => void;
}

export const AuthGateView: React.FC<AuthGateViewProps> = ({
  targetFeatureName = "this application feature",
  onReturnHome
}) => {
  return (
    <div className="auth-gate-page-container">
      <div className="auth-gate-card" role="region" aria-labelledby="auth-gate-title">
        {/* Lock Icon Bubble */}
        <div className="auth-gate-icon-bubble">
          <Lock className="w-8 h-8 text-brand-green" aria-hidden="true" />
        </div>

        <p className="eyebrow text-brand-green">AUTHENTICATION REQUIRED</p>
        <h1 id="auth-gate-title" className="auth-gate-title">
          Sign In to Access {targetFeatureName}
        </h1>

        <p className="auth-gate-description">
          Access to FoodCue’s digital kitchen management, smart barcode scanning, shared grocery lists,
          and food intelligence requires an authenticated personal or household account.
        </p>

        {/* Value Proposition Highlights */}
        <div className="auth-gate-benefits-box">
          <div className="benefit-row">
            <Check className="benefit-icon text-brand-green" aria-hidden="true" />
            <span>Secure, multi-tenant inventory for your private kitchen or shared household</span>
          </div>
          <div className="benefit-row">
            <Check className="benefit-icon text-brand-green" aria-hidden="true" />
            <span>Personalized allergen warnings and custom dietary restriction filtering</span>
          </div>
          <div className="benefit-row">
            <Check className="benefit-icon text-brand-green" aria-hidden="true" />
            <span>Proactive food waste and expiration reminders across devices</span>
          </div>
        </div>

        {/* Actions: Sign In & Create Account */}
        <div className="auth-gate-actions">
          <SignInButton mode="modal">
            <button
              type="button"
              className="auth-gate-primary-btn"
              aria-label="Sign in to your FoodCue account"
            >
              <LogIn className="btn-icon" aria-hidden="true" />
              <span>Sign In to Your Account</span>
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button
              type="button"
              className="auth-gate-secondary-btn"
              aria-label="Create a free FoodCue account"
            >
              <UserPlus className="btn-icon" aria-hidden="true" />
              <span>Create Free Account</span>
            </button>
          </SignUpButton>
        </div>

        {/* Return to Public Home */}
        <div className="auth-gate-footer">
          <button
            type="button"
            className="auth-gate-back-btn"
            onClick={onReturnHome}
            aria-label="Return to public landing page"
          >
            <ArrowLeft className="tiny-icon" aria-hidden="true" />
            <span>Return to Public Homepage</span>
          </button>
        </div>

        <div className="auth-gate-security-note">
          <ShieldCheck className="tiny-icon text-brand-green" aria-hidden="true" />
          <span>Protected with industry-standard cryptographic sessions powered by Clerk</span>
        </div>
      </div>
    </div>
  );
};
