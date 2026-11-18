import React from "react";
import { FileText, ArrowLeft, AlertCircle } from "lucide-react";

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="legal-page-container">
      <div className="legal-header-bar">
        <button
          type="button"
          className="btn-back-link"
          onClick={onBack}
          aria-label="Back to previous page"
        >
          <ArrowLeft className="tiny-icon" aria-hidden="true" />
          <span>Back</span>
        </button>
      </div>

      <article className="legal-article-card" aria-labelledby="terms-heading">
        <div className="legal-article-header">
          <div className="icon-bubble bg-emerald-50 text-brand-green">
            <FileText className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">LEGAL AGREEMENT</p>
            <h1 id="terms-heading" className="legal-page-title">
              Terms of Service
            </h1>
            <p className="legal-meta">Last updated: November 2026 • Effective immediately</p>
          </div>
        </div>

        <div className="legal-content-body">
          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using FoodCue (“the Service”), you agree to be bound by these Terms of Service.
              If you do not agree with any part of these terms, you may not access or use the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Description of Service</h2>
            <p>
              FoodCue is a food intelligence and kitchen management platform designed to help consumers:
            </p>
            <ul>
              <li>Scan packaged food product barcodes and look up nutritional information.</li>
              <li>Understand ingredient compositions, additives, and allergen warnings.</li>
              <li>Manage digital kitchen and pantry inventory across refrigerators, freezers, and pantries.</li>
              <li>Track product expiration dates and minimize household food waste.</li>
              <li>Coordinate grocery shopping lists with invited household members.</li>
            </ul>
          </section>

          <section className="legal-section callout-section">
            <div className="callout-header">
              <AlertCircle className="callout-icon text-amber-600" aria-hidden="true" />
              <h3>3. Not Medical Advice & Mandatory Packaging Verification</h3>
            </div>
            <p>
              <strong>FoodCue is an informational tool and does not provide medical, diagnostic, or clinical dietary advice.</strong>
            </p>
            <p>
              Food manufacturer formulations, manufacturing lines, and ingredient statements can change at any time without notice.
              You must always physically inspect the product packaging, ingredient list, and allergen cross-contamination statements
              on the actual product before purchasing or consuming any food item, especially if you or any household member has
              diagnosed medical food allergies or severe dietary restrictions.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. User Accounts & Security</h2>
            <p>
              To access kitchen inventory, shopping lists, and food intelligence features, you must register for an account using our
              authentication provider (Clerk). You are responsible for safeguarding your login credentials and for all activities
              under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Household Collaboration & Sharing</h2>
            <p>
              FoodCue allows users to create shared households and invite trusted family members or roommates. By inviting another user
              to your household, you authorize them to view the shared kitchen inventory and shared shopping lists.
              Your personal demographic profile (age, gender, location) and unshared private medical allergies remain strictly confidential
              and are never exposed to other household members.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Privacy & Camera Stream Processing</h2>
            <p>
              Your camera feed during barcode scanning is processed strictly in temporary device memory using client-side WebAssembly.
              No video frames, camera snapshots, or packaging images are ever stored on disk or transmitted to our servers.
              For more details on our data protection practices, please review our Privacy Policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Account Deletion & Termination</h2>
            <p>
              You may terminate your account at any time using the self-service “Delete My Account” action on the Personal Profile page.
              Upon confirmation, your personal profile, dietary preferences, declared allergies, cloud sync data, and household memberships
              will be permanently purged from our database and authentication directory.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Changes to Terms</h2>
            <p>
              We may update these Terms of Service periodically to reflect product changes or legal requirements.
              Continued use of FoodCue following any updates constitutes your acceptance of the revised terms.
            </p>
          </section>
        </div>

        <div className="legal-article-footer">
          <button
            type="button"
            className="btn-primary"
            onClick={onBack}
          >
            <span>Return to Application</span>
          </button>
        </div>
      </article>
    </div>
  );
};
