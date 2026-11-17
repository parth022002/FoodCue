import { useState } from "react";
import {
  Camera,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  HeartPulse,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { InternetProductSearch } from "../search/InternetProductSearch";
import { ProductIntelligenceCard } from "../../components/nutrition/ProductIntelligenceCard";
import type { IntelligentProductReport } from "../../domain/entities/nutritionalProfile";

interface GuestHomeProps {
  onOpenScan: () => void;
  onOpenSearch: () => void;
  onRequireAuthPrompt: () => void;
}

export function GuestHome({
  onOpenScan,
  onOpenSearch,
  onRequireAuthPrompt
}: GuestHomeProps) {
  const [selectedDemoProduct, setSelectedDemoProduct] = useState<IntelligentProductReport | null>(null);

  return (
    <div className="guest-home-container">
      {/* Hero Section */}
      <section className="guest-hero-section">
        <div className="hero-content">
          <div className="hero-eyebrow-pill">
            <Sparkles className="tiny-icon text-brand-green" aria-hidden="true" />
            <span>AI-Powered Food Intelligence & Packaged Food Scanner</span>
          </div>

          <h1 className="hero-main-title">
            Know What You Eat.<br />
            <span className="text-brand-green">Make Better Choices.</span>
          </h1>

          <p className="hero-subtitle">
            Scan any packaged food, understand its ingredients in simple words, explore its nutritional health score, and discover healthier alternatives for your family.
          </p>

          <div className="hero-cta-buttons">
            <button
              type="button"
              className="hero-primary-btn"
              onClick={onOpenScan}
            >
              <Camera className="btn-icon" aria-hidden="true" />
              <span>Scan a Food Product</span>
            </button>

            <button
              type="button"
              className="hero-secondary-btn"
              onClick={onOpenSearch}
            >
              <Search className="btn-icon" aria-hidden="true" />
              <span>Search by Name or Brand</span>
            </button>
          </div>

          <div className="hero-trust-chips">
            <span className="trust-chip">
              <ShieldCheck className="tiny-icon text-success" /> 100% Free & Private
            </span>
            <span className="trust-chip">
              <CheckCircle2 className="tiny-icon text-success" /> No Sign-up Required to Scan
            </span>
            <span className="trust-chip">
              <HeartPulse className="tiny-icon text-success" /> Easy for Ages 10 to 70
            </span>
          </div>
        </div>
      </section>

      {/* Embedded Live Search on Home Page */}
      <section className="guest-search-section panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">INSTANT FOOD LOOKUP</p>
            <h2 className="panel-title-with-icon">
              <Search className="title-icon text-brand-green" aria-hidden="true" />
              Search & Understand Any Food Instantly
            </h2>
          </div>
        </div>
        <p className="muted">
          Type any product name or brand to fetch verified nutritional facts, ingredient explanations, and health scores from the internet.
        </p>

        <InternetProductSearch
          userId="guest"
          onRequireAuthPrompt={onRequireAuthPrompt}
        />
      </section>

      {/* How It Works (Simple 3 Steps for Everyone) */}
      <section className="how-it-works-section">
        <div className="section-header-center">
          <p className="eyebrow">EFFORTLESS FOOD CLARITY</p>
          <h2 className="section-title">How FoodCue Works</h2>
          <p className="section-subtitle">
            No complex scientific formulas or confusing medical jargon. Designed to be immediately understood by anyone from a 10-year-old child to a 70-year-old grandparent.
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number-bubble">1</div>
            <div className="step-icon-box">
              <Camera className="step-icon text-brand-green" aria-hidden="true" />
            </div>
            <h3 className="step-card-title">Scan or Search</h3>
            <p className="step-card-text">
              Hold your phone camera over a barcode, upload a packaging photo, or simply type the food name (e.g. "Amul Butter", "Maggi").
            </p>
          </div>

          <div className="step-card">
            <div className="step-number-bubble">2</div>
            <div className="step-icon-box">
              <HeartPulse className="step-icon text-brand-green" aria-hidden="true" />
            </div>
            <h3 className="step-card-title">Clear Health Score</h3>
            <p className="step-card-text">
              See a transparent 0–100 score, understand sugar and protein in plain language, and read "What does this mean for you?".
            </p>
          </div>

          <div className="step-card">
            <div className="step-number-bubble">3</div>
            <div className="step-icon-box">
              <BookOpen className="step-icon text-brand-green" aria-hidden="true" />
            </div>
            <h3 className="step-card-title">Personalize & Save</h3>
            <p className="step-card-text">
              Create a free account anytime to save your favorite foods to your personal catalogue, track kitchen expiry dates, and set allergy alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Personalized Benefits Callout (Login prompt) */}
      <section className="guest-signup-banner-card">
        <div className="banner-text-side">
          <span className="banner-tag">UNLOCK FULL PERSONALIZATION</span>
          <h2 className="banner-title">Take Control of Your Family's Kitchen</h2>
          <ul className="banner-perks-list">
            <li>✓ <strong>Personal Product Catalogue:</strong> Save foods unique to your household.</li>
            <li>✓ <strong>My Kitchen Inventory:</strong> Track expiry dates and avoid throwing away food.</li>
            <li>✓ <strong>Family Allergy Protection:</strong> Receive automatic warnings for peanuts, milk, gluten, and more.</li>
            <li>✓ <strong>Cross-Device Sync:</strong> Access your kitchen from your phone, tablet, or laptop.</li>
          </ul>
        </div>
        <div className="banner-action-side">
          <button
            type="button"
            className="banner-signup-btn"
            onClick={onRequireAuthPrompt}
          >
            <span>Create Your Free Account</span>
            <ArrowRight className="tiny-icon" aria-hidden="true" />
          </button>
          <p className="banner-login-subtext">
            Already have an account? <button type="button" className="link-button" onClick={onRequireAuthPrompt}>Sign in here</button>
          </p>
        </div>
      </section>

      {/* Demo Modal */}
      {selectedDemoProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedDemoProduct(null)}>
          <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <ProductIntelligenceCard
              report={selectedDemoProduct}
              isSavedInCatalogue={false}
              showSaveButton={false}
              onClose={() => setSelectedDemoProduct(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
