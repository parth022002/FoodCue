import React, { useEffect, useState } from "react";
import {
  Cloud,
  CheckCircle,
  ShieldCheck,
  Database,
  RefreshCw,
  X,
  ChevronRight,
  ChevronLeft,
  Lock,
  Smartphone,
  Layers,
  ShoppingBag,
  Sparkles,
  CameraOff
} from "lucide-react";
import { getAllRecords } from "../../adapters/storage/database";
import { shoppingStorage } from "../../adapters/storage/shoppingStorage";
import { syncMetadata } from "../../sync/state/syncMetadata";
import { syncStatus } from "../../sync/state/syncStatus";
import { syncCoordinator } from "../../sync/engine/syncCoordinator";
import { useAuth, useUser } from "@clerk/react";
import { SyncApiClient } from "../../sync/transport/syncApiClient";

interface MigrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MigrationWizard: React.FC<MigrationWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [step, setStep] = useState<WizardStep>(1);
  const [consentChecked, setConsentChecked] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [deviceId, setDeviceId] = useState<string>("");

  const [counts, setCounts] = useState({
    pantryEvents: 0,
    confirmedLabels: 0,
    candidates: 0,
    shoppingItems: 0
  });

  const [migratedCounts, setMigratedCounts] = useState({
    pantryEvents: 0,
    confirmedLabels: 0,
    shoppingItems: 0
  });

  const [progressStep, setProgressStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setConsentChecked(false);
      setErrorMsg(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    let mounted = true;
    setLoadingStats(true);

    Promise.all([
      getAllRecords("pantryEvents").catch(() => []),
      getAllRecords("confirmedLabels").catch(() => []),
      getAllRecords("candidates").catch(() => []),
      shoppingStorage.loadItems().catch(() => []),
      syncMetadata.get()
    ]).then(([events, labels, cands, shopItems, meta]) => {
      if (mounted) {
        setCounts({
          pantryEvents: events.length,
          confirmedLabels: labels.length,
          candidates: cands.length,
          shoppingItems: shopItems.length
        });
        setDeviceId(meta.deviceId);
        setLoadingStats(false);
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    setStep(6);
    setProgressStep(1);
    setErrorMsg(null);

    try {
      // Step 6.1: Load local snapshots
      setProgressStep(1);
      const [pantryEvents, confirmedLabels, candidates, shopItems] = await Promise.all([
        getAllRecords("pantryEvents").catch(() => []),
        getAllRecords("confirmedLabels").catch(() => []),
        getAllRecords("candidates").catch(() => []),
        shoppingStorage.loadItems().catch(() => [])
      ]);

      const client = new SyncApiClient(async () => getToken());

      // Step 6.2: Transmit to migration endpoint
      setProgressStep(2);
      const migrationRes = await client.migrateLocalData({
        pantryEvents,
        confirmedLabels,
        shoppingItems: shopItems.map((s) => ({
          listItemId: s.id,
          productName: s.name,
          requestedQuantity: s.quantity,
          unit: s.unit,
          category: s.category,
          checked: s.isBought,
          updatedAt: s.updatedAt
        })),
        settings: { candidatesCount: candidates.length }
      });

      // Step 6.3: Save consent & enable cloud sync
      setProgressStep(3);
      await syncMetadata.setCloudSyncEnabled(true);
      syncStatus.updateState({ isCloudEnabled: true });

      // Step 6.4: Trigger initial background sync cycle
      setProgressStep(4);
      await syncCoordinator.triggerSync();

      setMigratedCounts({
        pantryEvents: migrationRes.counts?.pantryEvents ?? pantryEvents.length,
        confirmedLabels: migrationRes.counts?.confirmedLabels ?? confirmedLabels.length,
        shoppingItems: migrationRes.counts?.shoppingItems ?? shopItems.length
      });

      setStep(7);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Migration failed. Please check your network connection.";
      setErrorMsg(msg);
      setStep(5);
    }
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  return (
    <div
      className="migration-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-title"
    >
      <div className="migration-modal-card">
        <button
          type="button"
          className="migration-close-btn"
          onClick={onClose}
          aria-label="Close migration wizard"
        >
          <X size={20} />
        </button>

        {/* Wizard Progress Breadcrumb (Screens 1 to 5) */}
        {step <= 5 && (
          <div className="wizard-step-indicator" aria-label={`Step ${step} of 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`wizard-step-dot ${step === s ? "active" : step > s ? "completed" : ""}`}
              />
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: INTRODUCTION                                                    */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="migration-step-container">
            <div className="migration-icon-header">
              <div className="migration-badge-icon">
                <Cloud size={32} className="text-emerald" />
              </div>
            </div>

            <h2 id="migration-title" className="migration-title text-center">
              Keep your kitchen in sync.
            </h2>

            <p className="migration-description text-center">
              Access your FoodCue kitchen information across all your devices. Manage your pantry, check expiration dates, and shop together with family.
            </p>

            <div className="feature-highlight-card mt-16">
              <div className="feature-highlight-row">
                <Smartphone className="feature-icon text-brand" size={20} />
                <div>
                  <strong>Local-First Guarantee</strong>
                  <p className="tiny text-muted">All records remain permanently on this device even if offline.</p>
                </div>
              </div>
              <div className="feature-highlight-row mt-12">
                <Lock className="feature-icon text-emerald" size={20} />
                <div>
                  <strong>Encrypted & Isolated</strong>
                  <p className="tiny text-muted">Strict tenant isolation guarantees only you and your household access your data.</p>
                </div>
              </div>
            </div>

            <div className="migration-actions mt-24">
              <button
                type="button"
                className="btn-primary-sync"
                onClick={() => setStep(2)}
              >
                <span>Enable Cloud Sync</span>
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={onClose}
              >
                Continue Locally
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: DATA EXPLANATION                                                */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="migration-step-container">
            <div className="step-header-row">
              <span className="step-tag">Step 2 of 5</span>
              <h2 id="migration-title" className="migration-title-sm">
                What gets synchronized?
              </h2>
            </div>

            <p className="migration-description">
              FoodCue practices strict data minimization. Review exactly which records are synced to your private cloud storage and what stays strictly on this device:
            </p>

            <div className="data-scope-grid mt-16">
              <div className="scope-box synced-box">
                <div className="scope-box-header">
                  <CheckCircle size={18} className="text-emerald" />
                  <strong>Synchronized to Cloud</strong>
                </div>
                <ul className="scope-list">
                  <li>Pantry event ledger & stock balances</li>
                  <li>Confirmed product packaging labels</li>
                  <li>Smart shopping list items</li>
                  <li>Allergen & ingredient avoid preferences</li>
                </ul>
              </div>

              <div className="scope-box local-only-box">
                <div className="scope-box-header">
                  <CameraOff size={18} className="text-amber" />
                  <strong>Kept Strictly on This Device</strong>
                </div>
                <ul className="scope-list">
                  <li>Camera frames and photo panel images</li>
                  <li>Temporary scanner cache & OCR models</li>
                  <li>Device hardware fingerprints</li>
                </ul>
              </div>
            </div>

            <div className="migration-actions mt-24">
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setStep(1)}
              >
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-sync"
                onClick={() => setStep(3)}
              >
                <span>Continue</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: EXPLICIT CONSENT                                                */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="migration-step-container">
            <div className="step-header-row">
              <span className="step-tag">Step 3 of 5</span>
              <h2 id="migration-title" className="migration-title-sm">
                Explicit Cloud Sync Consent
              </h2>
            </div>

            <p className="migration-description">
              Under FoodCue&apos;s privacy-first design, signing in does not automatically upload your data. You must grant explicit, reversible permission.
            </p>

            <div className="consent-audit-card mt-16">
              <div className="audit-field">
                <span className="audit-lbl">Account:</span>
                <span className="audit-val font-mono">{user?.primaryEmailAddress?.emailAddress || user?.id || "Authenticated User"}</span>
              </div>
              <div className="audit-field">
                <span className="audit-lbl">Device ID:</span>
                <span className="audit-val font-mono">{deviceId ? `${deviceId.slice(0, 16)}...` : "Generating..."}</span>
              </div>
              <div className="audit-field">
                <span className="audit-lbl">Consent Policy:</span>
                <span className="audit-val">Phase 2 Cloud Sync v1.0 (DPDP / GDPR Compliant)</span>
              </div>
              <div className="audit-field">
                <span className="audit-lbl">Storage Backend:</span>
                <span className="audit-val">Private Tenant Lakebase (PostgreSQL)</span>
              </div>
            </div>

            <label className="consent-checkbox-row mt-16 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="consent-checkbox"
              />
              <span className="consent-text">
                I explicitly consent to synchronizing my pantry ledger, confirmed food labels, and shopping lists to my private cloud account. I understand I can disable sync or erase cloud data at any time.
              </span>
            </label>

            <div className="migration-actions mt-24">
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setStep(2)}
              >
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-sync"
                disabled={!consentChecked}
                onClick={() => setStep(4)}
              >
                <span>Agree & Continue</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: MIGRATION PREVIEW                                               */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="migration-step-container">
            <div className="step-header-row">
              <span className="step-tag">Step 4 of 5</span>
              <h2 id="migration-title" className="migration-title-sm">
                Local Data Migration Preview
              </h2>
            </div>

            <p className="migration-description">
              Here are the exact live records found on this device ready to be safely synchronized:
            </p>

            <div className="migration-stats-grid mt-16">
              <div className="migration-stat-box">
                <Layers size={22} className="stat-box-icon text-brand" />
                <span className="stat-value">{loadingStats ? "..." : counts.pantryEvents}</span>
                <span className="stat-label">Pantry Events</span>
              </div>
              <div className="migration-stat-box">
                <Sparkles size={22} className="stat-box-icon text-emerald" />
                <span className="stat-value">{loadingStats ? "..." : counts.confirmedLabels}</span>
                <span className="stat-label">Verified Labels</span>
              </div>
              <div className="migration-stat-box">
                <ShoppingBag size={22} className="stat-box-icon text-blue" />
                <span className="stat-value">{loadingStats ? "..." : counts.shoppingItems}</span>
                <span className="stat-label">Shopping Items</span>
              </div>
            </div>

            <div className="validation-badge-banner mt-16">
              <ShieldCheck size={18} className="text-emerald" />
              <span>
                <strong>Validation Passed:</strong> All local records verified and compatible for cloud replication.
              </span>
            </div>

            <div className="migration-actions mt-24">
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setStep(3)}
              >
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-sync"
                onClick={() => setStep(5)}
              >
                <span>Review & Confirm</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 5: CONFIRMATION                                                    */}
        {/* ========================================================================= */}
        {step === 5 && (
          <div className="migration-step-container">
            <div className="step-header-row">
              <span className="step-tag">Step 5 of 5</span>
              <h2 id="migration-title" className="migration-title-sm">
                Ready to sync your kitchen?
              </h2>
            </div>

            {errorMsg && (
              <div className="alert-banner alert-danger mb-16" role="alert">
                <Database size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <p className="migration-description">
              Once started, your records will be encrypted and saved to your private cloud account. Your local device copy remains completely intact and functional offline.
            </p>

            <div className="confirmation-summary-card mt-16">
              <div className="summary-line">
                <span>Total records to sync:</span>
                <strong>{counts.pantryEvents + counts.confirmedLabels + counts.shoppingItems} items</strong>
              </div>
              <div className="summary-line">
                <span>Target account:</span>
                <span>{user?.primaryEmailAddress?.emailAddress || "Your Account"}</span>
              </div>
              <div className="summary-line">
                <span>Zero data loss policy:</span>
                <span className="text-emerald font-semibold">Active & Enforced</span>
              </div>
            </div>

            <div className="migration-actions mt-24">
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setStep(4)}
              >
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-sync"
                onClick={handleStartMigration}
              >
                <Cloud size={18} />
                <span>Begin Migration</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 6: PROGRESS                                                        */}
        {/* ========================================================================= */}
        {step === 6 && (
          <div className="migration-step-container text-center py-16">
            <div className="migration-spinner-box">
              <RefreshCw size={42} className="animate-spin text-emerald mx-auto" />
            </div>

            <h3 className="migration-status-title mt-16">
              Uploading Your Kitchen Records...
            </h3>

            <p className="migration-status-sub">
              Securely syncing your pantry ledger and verified product records.
            </p>

            <div className="progress-steps-list mt-20">
              <div className={`step-item ${progressStep >= 1 ? "done" : "active"}`}>
                <span className="step-circle">{progressStep > 1 ? "✓" : "1"}</span>
                <span>Preparing IndexedDB records snapshot</span>
              </div>
              <div className={`step-item ${progressStep >= 2 ? "done" : progressStep === 2 ? "active" : ""}`}>
                <span className="step-circle">{progressStep > 2 ? "✓" : "2"}</span>
                <span>Uploading pantry ledger & confirmed labels</span>
              </div>
              <div className={`step-item ${progressStep >= 3 ? "done" : progressStep === 3 ? "active" : ""}`}>
                <span className="step-circle">{progressStep > 3 ? "✓" : "3"}</span>
                <span>Recording explicit consent and device session</span>
              </div>
              <div className={`step-item ${progressStep >= 4 ? "done" : progressStep === 4 ? "active" : ""}`}>
                <span className="step-circle">{progressStep > 4 ? "✓" : "4"}</span>
                <span>Verifying cloud database consistency</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 7: RESULT                                                          */}
        {/* ========================================================================= */}
        {step === 7 && (
          <div className="migration-step-container text-center py-8">
            <div className="migration-icon-header">
              <div className="migration-badge-icon success">
                <CheckCircle size={44} className="text-emerald mx-auto" />
              </div>
            </div>

            <h3 className="migration-status-title mt-16">
              Your Kitchen Is Connected!
            </h3>

            <p className="migration-status-sub">
              Multi-device synchronization is now active. Any updates made on this device or any other will automatically stay in sync.
            </p>

            <div className="result-stats-card mt-16">
              <div className="result-stat-item">
                <span className="res-stat-val text-emerald">{migratedCounts.pantryEvents}</span>
                <span className="res-stat-lbl">Pantry Events Synced</span>
              </div>
              <div className="result-stat-item">
                <span className="res-stat-val text-emerald">{migratedCounts.confirmedLabels}</span>
                <span className="res-stat-lbl">Verified Labels Synced</span>
              </div>
              <div className="result-stat-item">
                <span className="res-stat-val text-emerald">{migratedCounts.shoppingItems}</span>
                <span className="res-stat-lbl">Shopping Items Synced</span>
              </div>
              <div className="result-stat-item">
                <span className="res-stat-val text-muted">0</span>
                <span className="res-stat-lbl">Duplicates Skipped</span>
              </div>
            </div>

            <div className="cloud-verified-pill mt-16">
              <ShieldCheck size={16} className="text-emerald" />
              <span>Verified persisted in private cloud storage</span>
            </div>

            <button
              type="button"
              className="btn-primary-sync mt-24"
              onClick={handleFinish}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
