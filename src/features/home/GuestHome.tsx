import { useState } from "react";
import {
  Camera,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  HeartPulse,
  Refrigerator,
  Bell,
  ShoppingBag,
  Users,
  Database,
  LogIn,
  UserPlus,
  Shield,
  Clock,
  Check
} from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/react";

interface GuestHomeProps {
  onOpenScan: () => void;
  onOpenSearch?: () => void;
  onRequireAuthPrompt?: () => void;
}

type PreviewTab = "scan" | "nutrition" | "kitchen" | "shopping";

export function GuestHome({
  onOpenScan,
  onOpenSearch: _onOpenSearch,
  onRequireAuthPrompt: _onRequireAuthPrompt
}: GuestHomeProps) {
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>("scan");

  return (
    <div className="landing-page-root">
      {/* 1. HERO SECTION */}
      <section className="landing-hero-section" aria-labelledby="landing-hero-title">
        <div className="landing-hero-inner">
          <div className="hero-text-column">
            <div className="hero-pill-badge">
              <Sparkles className="badge-icon" aria-hidden="true" />
              <span>Smart Food Intelligence & Kitchen Management</span>
            </div>

            <h1 id="landing-hero-title" className="hero-headline">
              Know What You Eat.<br />
              <span className="hero-headline-accent">Make Better Choices.</span>
            </h1>

            <p className="hero-subheadline-tagline">
              Know your food. Manage your kitchen with FoodCue.
            </p>

            <p className="hero-description">
              FoodCue helps you understand the food you bring home, track your kitchen inventory,
              monitor expiry dates, explore nutritional information, and manage your household
              food essentials — all in one connected, privacy-first platform.
            </p>

            {/* Primary Conversion Actions: Sign Up & Sign In */}
            <div className="hero-cta-group">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="hero-primary-cta-btn"
                  aria-label="Get started by signing up for FoodCue"
                >
                  <UserPlus className="cta-icon" aria-hidden="true" />
                  <span>Get Started – Sign Up</span>
                </button>
              </SignUpButton>

              <SignInButton mode="modal">
                <button
                  type="button"
                  className="hero-secondary-cta-btn"
                  aria-label="Sign in to your FoodCue account"
                >
                  <LogIn className="cta-icon" aria-hidden="true" />
                  <span>Sign In</span>
                </button>
              </SignInButton>

              <button
                type="button"
                className="hero-tertiary-scan-btn"
                onClick={onOpenScan}
                aria-label="Scan a Food Product"
              >
                <Camera className="cta-icon" aria-hidden="true" />
                <span>Scan a Food Product</span>
              </button>
            </div>

            {/* Trust Badges (No age-range references) */}
            <div className="hero-trust-row" aria-label="Product guarantees">
              <span className="trust-indicator">
                <ShieldCheck className="trust-icon text-success" aria-hidden="true" />
                <span>100% Private by Default</span>
              </span>
              <span className="trust-indicator">
                <CheckCircle2 className="trust-icon text-success" aria-hidden="true" />
                <span>No Mandatory Account to Scan</span>
              </span>
              <span className="trust-indicator">
                <HeartPulse className="trust-icon text-success" aria-hidden="true" />
                <span>Built for Everyday Households</span>
              </span>
            </div>
          </div>

          {/* Hero Visual: Product-Focused UI Showcase Card */}
          <div className="hero-visual-column">
            <div className="hero-product-showcase-card">
              <div className="showcase-card-header">
                <span className="product-category-pill">Packaged Dairy • Indian FMCG</span>
                <span className="product-barcode-code">EAN: 8901262010054</span>
              </div>

              <div className="showcase-product-main">
                <div className="product-info-left">
                  <h3 className="showcase-product-name">Amul Taaza Toned Milk</h3>
                  <p className="showcase-product-meta">Homogenised Toned Milk • 1 Litre Tetra Pak</p>
                </div>
                <div className="showcase-score-dial" title="FoodCue Health Score">
                  <span className="score-number">78</span>
                  <span className="score-total">/100</span>
                  <span className="score-label">Balanced</span>
                </div>
              </div>

              {/* Nutritional Breakdown Snapshot */}
              <div className="showcase-nutrients-grid">
                <div className="nutrient-chip">
                  <span className="nutrient-label">Energy</span>
                  <span className="nutrient-val">58 kcal</span>
                </div>
                <div className="nutrient-chip">
                  <span className="nutrient-label">Protein</span>
                  <span className="nutrient-val highlight">3.2 g</span>
                </div>
                <div className="nutrient-chip">
                  <span className="nutrient-label">Carbs</span>
                  <span className="nutrient-val">4.7 g</span>
                </div>
                <div className="nutrient-chip">
                  <span className="nutrient-label">Added Sugar</span>
                  <span className="nutrient-val text-success">0 g</span>
                </div>
              </div>

              {/* Kitchen & Freshness Status */}
              <div className="showcase-status-banner">
                <div className="status-item">
                  <Clock className="status-icon text-warning" aria-hidden="true" />
                  <span><strong>Fresh</strong> — 3 Days Remaining</span>
                </div>
                <div className="status-item">
                  <Refrigerator className="status-icon text-brand" aria-hidden="true" />
                  <span>Stored in Refrigerator</span>
                </div>
              </div>

              <div className="showcase-footer-note">
                <ShieldCheck className="tiny-icon text-success" aria-hidden="true" />
                <span>Allergen: Contains Milk • Zero Artificial INS Additives</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT INTRODUCTION SECTION */}
      <section className="landing-intro-section" aria-labelledby="intro-heading">
        <div className="section-container">
          <div className="section-header-block">
            <p className="section-eyebrow">A SMARTER WAY FORWARD</p>
            <h2 id="intro-heading" className="section-heading">
              A Smarter Way to Understand and Manage Your Food
            </h2>
            <p className="section-lead-text">
              FoodCue brings food discovery, product information, nutrition insights,
              expiry tracking, and kitchen inventory management together in one connected experience.
            </p>
          </div>

          <div className="intro-pillars-grid">
            <div className="pillar-card">
              <div className="pillar-icon-wrapper bg-green-tint">
                <HeartPulse className="pillar-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="pillar-title">Clear Nutritional Truth</h3>
              <p className="pillar-description">
                Cut through confusing front-of-pack claims and microscopic ingredient lists.
                See clear energy densities, sugars, and transparent 0–100 health ratings.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon-wrapper bg-blue-tint">
                <Refrigerator className="pillar-icon text-info" aria-hidden="true" />
              </div>
              <h3 className="pillar-title">Organized Kitchen Stock</h3>
              <p className="pillar-description">
                Always know what is currently stocked in your refrigerator, pantry, and freezer
                before making unnecessary duplicate purchases at the supermarket.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon-wrapper bg-amber-tint">
                <Bell className="pillar-icon text-warning" aria-hidden="true" />
              </div>
              <h3 className="pillar-title">Reduce Waste & Save Money</h3>
              <p className="pillar-description">
                Keep track of expiration dates with proactive reminders so your groceries
                are enjoyed fresh rather than forgotten and discarded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY FEATURES SECTION (8 Implemented Capabilities) */}
      <section className="landing-features-section" aria-labelledby="features-heading">
        <div className="section-container">
          <div className="section-header-block">
            <p className="section-eyebrow">BUILT FOR EVERYDAY LIFE</p>
            <h2 id="features-heading" className="section-heading">
              Complete Food & Kitchen Capabilities
            </h2>
            <p className="section-lead-text">
              Thoughtfully engineered tools designed to make food label understanding and household pantry management effortless.
            </p>
          </div>

          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Sparkles className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Smart Food Scanning</h3>
              <p className="feature-card-text">
                Scan barcodes in under 100ms with your smartphone camera, supported by live hardware zoom, flashlight torch, and camera switching.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Search className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Product Discovery</h3>
              <p className="feature-card-text">
                Explore a verified offline database of 500+ Indian FMCG products or search live global food databases for instant product intelligence.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <HeartPulse className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Nutrition Insights</h3>
              <p className="feature-card-text">
                Understand calories, added sugars, saturated fats, sodium, and dietary fiber through an objective, deterministic 0–100 health scoring engine.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <ShieldCheck className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Ingredient & Allergen Clarity</h3>
              <p className="feature-card-text">
                Inspect ingredient statements and receive fail-closed alert banners whenever a product conflicts with your personal or family avoid-list.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Bell className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Expiry Date Tracking</h3>
              <p className="feature-card-text">
                Monitor shelf lives with color-coded freshness badges (Fresh, Use Soon, Expired) and opt-in web push reminders before food spoils.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Refrigerator className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Smart Kitchen Inventory</h3>
              <p className="feature-card-text">
                Organize groceries across Fridge, Pantry, and Freezer locations using an append-only event ledger with full audit history.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Users className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Household Collaboration</h3>
              <p className="feature-card-text">
                Share a live kitchen pantry and synchronized replenishment shopping list with your family members with multi-tenant data privacy.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Database className="feature-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="feature-card-title">Offline Access & Privacy</h3>
              <p className="feature-card-text">
                Core scanning and inventory work seamlessly offline in local storage. All camera video frames are processed in-memory and never uploaded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW FOODCUE WORKS (4 Clean Steps) */}
      <section className="landing-how-it-works-section" aria-labelledby="how-it-works-heading">
        <div className="section-container">
          <div className="section-header-block">
            <p className="section-eyebrow">EFFORTLESS FOOD CLARITY</p>
            <h2 id="how-it-works-heading" className="section-heading">How FoodCue Works</h2>
            <p className="section-lead-text">
              Four straightforward steps from grocery aisle discovery to mindful household cooking.
            </p>
          </div>

          <div className="steps-flow-container">
            <div className="step-column">
              <div className="step-badge-number">1</div>
              <div className="step-icon-circle">
                <Camera className="step-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="step-title">Discover Your Food</h3>
              <p className="step-text">
                Scan a packaged food barcode with your phone camera or search any item by brand or product name.
              </p>
            </div>

            <div className="step-column">
              <div className="step-badge-number">2</div>
              <div className="step-icon-circle">
                <HeartPulse className="step-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="step-title">Clear Health Score</h3>
              <p className="step-text">
                Explore an objective 0–100 health score, plain-language nutrient highlights, and automatic allergen conflict warnings.
              </p>
            </div>

            <div className="step-column">
              <div className="step-badge-number">3</div>
              <div className="step-icon-circle">
                <Refrigerator className="step-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="step-title">Organize Your Kitchen</h3>
              <p className="step-text">
                Add groceries to your digital inventory with storage locations (Fridge, Pantry, Freezer) and expiration dates.
              </p>
            </div>

            <div className="step-column">
              <div className="step-badge-number">4</div>
              <div className="step-icon-circle">
                <Bell className="step-icon text-brand-green" aria-hidden="true" />
              </div>
              <h3 className="step-title">Stay Informed</h3>
              <p className="step-text">
                Receive proactive reminders before items spoil and collaborate on a shared replenishment grocery list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY FOODCUE SECTION (Value Propositions) */}
      <section className="landing-why-section" aria-labelledby="why-heading">
        <div className="section-container">
          <div className="section-header-block">
            <p className="section-eyebrow">THE VALUE OF FOODCUE</p>
            <h2 id="why-heading" className="section-heading">
              Everything You Need to Manage Your Food, in One Place.
            </h2>
            <p className="section-lead-text">
              Real household benefits designed to save you time, reduce waste, and bring confidence to everyday eating.
            </p>
          </div>

          <div className="why-benefits-grid">
            <div className="benefit-card">
              <div className="benefit-header">
                <Check className="benefit-check-icon text-brand-green" aria-hidden="true" />
                <h3 className="benefit-title">Better Visibility into Packaged Foods</h3>
              </div>
              <p className="benefit-text">
                Make empowered dietary choices for your household with reliable data instead of relying on front-of-package marketing slogans.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-header">
                <Check className="benefit-check-icon text-brand-green" aria-hidden="true" />
                <h3 className="benefit-title">Fewer Wasted Groceries & Lower Bills</h3>
              </div>
              <p className="benefit-text">
                Keep track of use-by dates so perishable foods are consumed on time. Cut down on forgotten spoiled items in your fridge.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-header">
                <Check className="benefit-check-icon text-brand-green" aria-hidden="true" />
                <h3 className="benefit-title">Connected Family Coordination</h3>
              </div>
              <p className="benefit-text">
                Share a single live pantry view and collaborative shopping list with family members or roommates to avoid duplicate grocery runs.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-header">
                <Check className="benefit-check-icon text-brand-green" aria-hidden="true" />
                <h3 className="benefit-title">Privacy-First Architecture</h3>
              </div>
              <p className="benefit-text">
                Your camera video stream is processed in transient device memory. No photos are ever saved to disk or transmitted to remote servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRODUCT PREVIEW SECTION (Authentic UI Showcase) */}
      <section className="landing-preview-section" aria-labelledby="preview-heading">
        <div className="section-container">
          <div className="section-header-block">
            <p className="section-eyebrow">AUTHENTIC EXPERIENCE</p>
            <h2 id="preview-heading" className="section-heading">
              Designed for Real Kitchens
            </h2>
            <p className="section-lead-text">
              Explore the core views built directly into FoodCue.
            </p>
          </div>

          <div className="preview-showcase-container">
            {/* Interactive Tab Switcher */}
            <div className="preview-nav-tabs" role="tablist" aria-label="Feature previews">
              <button
                type="button"
                role="tab"
                aria-selected={activePreviewTab === "scan"}
                className={`preview-tab-btn ${activePreviewTab === "scan" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("scan")}
              >
                <Camera className="tab-icon" aria-hidden="true" />
                <span>SmartScan</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePreviewTab === "nutrition"}
                className={`preview-tab-btn ${activePreviewTab === "nutrition" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("nutrition")}
              >
                <HeartPulse className="tab-icon" aria-hidden="true" />
                <span>Product Intelligence</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePreviewTab === "kitchen"}
                className={`preview-tab-btn ${activePreviewTab === "kitchen" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("kitchen")}
              >
                <Refrigerator className="tab-icon" aria-hidden="true" />
                <span>Kitchen Inventory</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePreviewTab === "shopping"}
                className={`preview-tab-btn ${activePreviewTab === "shopping" ? "active" : ""}`}
                onClick={() => setActivePreviewTab("shopping")}
              >
                <ShoppingBag className="tab-icon" aria-hidden="true" />
                <span>Shopping List</span>
              </button>
            </div>

            {/* Showcase Stage */}
            <div className="preview-stage-card">
              {activePreviewTab === "scan" && (
                <div className="stage-content-panel">
                  <div className="mock-scanner-frame">
                    <div className="mock-viewfinder-reticle">
                      <div className="reticle-corner top-left" />
                      <div className="reticle-corner top-right" />
                      <div className="reticle-corner bottom-left" />
                      <div className="reticle-corner bottom-right" />
                      <span className="reticle-status-badge">Align barcode in frame</span>
                    </div>
                    <div className="mock-camera-controls">
                      <span className="mock-control-pill">🔦 Torch: Off</span>
                      <span className="mock-control-pill">🔍 Zoom: 1.0x</span>
                      <span className="mock-control-pill">🔄 Switch Camera</span>
                    </div>
                  </div>
                  <div className="stage-explanation">
                    <h4 className="stage-title">Sub-100ms Instant Barcode Decoding</h4>
                    <p className="stage-desc">
                      Leverages client-side WebAssembly to identify EAN-13, EAN-8, and UPC-A codes directly on your device. Works seamlessly offline.
                    </p>
                  </div>
                </div>
              )}

              {activePreviewTab === "nutrition" && (
                <div className="stage-content-panel">
                  <div className="mock-score-display">
                    <div className="mock-dial">
                      <span className="dial-val">84</span>
                      <span className="dial-scale">/100</span>
                      <span className="dial-badge text-success">Excellent Choice</span>
                    </div>
                    <div className="mock-nutrient-bars">
                      <div className="bar-row">
                        <span className="bar-name">Protein</span>
                        <div className="bar-track"><div className="bar-fill bg-success" style={{ width: "75%" }} /></div>
                        <span className="bar-amount">8.5g</span>
                      </div>
                      <div className="bar-row">
                        <span className="bar-name">Added Sugar</span>
                        <div className="bar-track"><div className="bar-fill bg-success" style={{ width: "10%" }} /></div>
                        <span className="bar-amount">1.2g</span>
                      </div>
                      <div className="bar-row">
                        <span className="bar-name">Saturated Fat</span>
                        <div className="bar-track"><div className="bar-fill bg-warning" style={{ width: "40%" }} /></div>
                        <span className="bar-amount">3.4g</span>
                      </div>
                    </div>
                  </div>
                  <div className="stage-explanation">
                    <h4 className="stage-title">Objective 0–100 Health Scoring</h4>
                    <p className="stage-desc">
                      Deterministic mathematical scoring penalizes high sugars, saturated fats, and harmful additives while crediting dietary fiber, protein, and essential micronutrients.
                    </p>
                  </div>
                </div>
              )}

              {activePreviewTab === "kitchen" && (
                <div className="stage-content-panel">
                  <div className="mock-pantry-list">
                    <div className="mock-pantry-item">
                      <span className="item-icon">🥛</span>
                      <div className="item-details">
                        <span className="item-name">Amul Taaza Milk (1L)</span>
                        <span className="item-loc">Refrigerator • Added 2d ago</span>
                      </div>
                      <span className="freshness-badge bg-warning">Expires in 2d</span>
                    </div>
                    <div className="mock-pantry-item">
                      <span className="item-icon">🍞</span>
                      <div className="item-details">
                        <span className="item-name">Whole Wheat Bread</span>
                        <span className="item-loc">Pantry • Added 1d ago</span>
                      </div>
                      <span className="freshness-badge bg-success">Fresh (5d left)</span>
                    </div>
                    <div className="mock-pantry-item">
                      <span className="item-icon">🍚</span>
                      <div className="item-details">
                        <span className="item-name">Basmati Rice (5kg)</span>
                        <span className="item-loc">Pantry • Sealed</span>
                      </div>
                      <span className="freshness-badge bg-muted">Stable (180d)</span>
                    </div>
                  </div>
                  <div className="stage-explanation">
                    <h4 className="stage-title">Categorized Kitchen Inventory</h4>
                    <p className="stage-desc">
                      Track pantry, fridge, and freezer stock with expiration dates and automatic replenishment reminders when items are marked consumed.
                    </p>
                  </div>
                </div>
              )}

              {activePreviewTab === "shopping" && (
                <div className="stage-content-panel">
                  <div className="mock-shopping-list">
                    <div className="mock-shop-item done">
                      <span className="check-box checked">✓</span>
                      <span className="shop-name">Tata Salt (1kg)</span>
                      <span className="shop-qty">1 pack</span>
                    </div>
                    <div className="mock-shop-item">
                      <span className="check-box" />
                      <span className="shop-name">Fortune Sunlite Sunflower Oil (1L)</span>
                      <span className="shop-qty">2 pouches</span>
                    </div>
                    <div className="mock-shop-item">
                      <span className="check-box" />
                      <span className="shop-name">Aashirvaad Shudh Chakki Atta (5kg)</span>
                      <span className="shop-qty">1 bag</span>
                    </div>
                  </div>
                  <div className="stage-explanation">
                    <h4 className="stage-title">Collaborative Household Grocery List</h4>
                    <p className="stage-desc">
                      Keep a unified shopping list shared across household members. Items consumed at home appear under needed items automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. TRUST, TRANSPARENCY & DATA ACCURACY */}
      <section className="landing-transparency-section" aria-labelledby="transparency-heading">
        <div className="section-container">
          <div className="transparency-card">
            <div className="transparency-header">
              <Shield className="transparency-shield-icon text-brand-green" aria-hidden="true" />
              <div>
                <h3 id="transparency-heading" className="transparency-title">
                  Trust, Transparency & Data Accuracy
                </h3>
                <p className="transparency-subtitle">
                  Our commitment to responsible, honest food information.
                </p>
              </div>
            </div>

            <div className="transparency-points-grid">
              <div className="point-item">
                <span className="point-bullet">•</span>
                <p>
                  <strong>Packaging Precedence:</strong> Manufacturer formulations and packaging can change without notice. Always inspect the physical packaging label and allergen warnings before consumption.
                </p>
              </div>
              <div className="point-item">
                <span className="point-bullet">•</span>
                <p>
                  <strong>Verified Data Sources:</strong> Nutritional information is retrieved from verified manufacturer packaging, curated databases, and the Open Food Facts public repository.
                </p>
              </div>
              <div className="point-item">
                <span className="point-bullet">•</span>
                <p>
                  <strong>Non-Medical Information:</strong> FoodCue provides nutritional clarity and kitchen organization tools. It does not provide medical, diagnostic, or clinical dietary prescriptions.
                </p>
              </div>
              <div className="point-item">
                <span className="point-bullet">•</span>
                <p>
                  <strong>Zero Camera Retention:</strong> Video frames and pack photos are processed strictly in temporary device memory. No camera images are ever persisted or uploaded to remote cloud storage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CONVERSION CTA SECTION */}
      <section className="landing-final-cta-section" aria-labelledby="final-cta-heading">
        <div className="section-container">
          <div className="final-cta-card">
            <h2 id="final-cta-heading" className="final-cta-title">
              Take Control of Your Kitchen with FoodCue.
            </h2>
            <p className="final-cta-description">
              Start organizing your food products, exploring clear nutrition insights,
              and managing your kitchen essentials in one place.
            </p>

            <div className="final-cta-buttons">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="final-cta-primary-btn"
                  aria-label="Create your free account on FoodCue"
                >
                  <UserPlus className="btn-icon" aria-hidden="true" />
                  <span>Create Your Free Account</span>
                </button>
              </SignUpButton>

              <SignInButton mode="modal">
                <button
                  type="button"
                  className="final-cta-secondary-link"
                  aria-label="Sign in to your existing FoodCue account"
                >
                  <span>Already have an account? <strong>Sign In</strong></span>
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
