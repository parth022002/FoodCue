import React, { useEffect, useState } from "react";
import { Cloud, CheckCircle, ShieldCheck, Database, RefreshCw, X } from "lucide-react";
import { getAllRecords } from "../../adapters/storage/database";
import { syncMetadata } from "../../sync/state/syncMetadata";
import { syncStatus } from "../../sync/state/syncStatus";
import { syncCoordinator } from "../../sync/engine/syncCoordinator";
import { useAuth } from "@clerk/react";
import { SyncApiClient } from "../../sync/transport/syncApiClient";

interface MigrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const MigrationWizard: React.FC<MigrationWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { getToken } = useAuth();
  const [step, setStep] = useState<"preview" | "migrating" | "complete" | "error">("preview");
  const [loadingStats, setLoadingStats] = useState(true);
  const [counts, setCounts] = useState({
    pantryEvents: 0,
    confirmedLabels: 0,
    candidates: 0
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingStats(true);

    Promise.all([
      getAllRecords("pantryEvents").catch(() => []),
      getAllRecords("confirmedLabels").catch(() => []),
      getAllRecords("candidates").catch(() => [])
    ]).then(([events, labels, cands]) => {
      if (mounted) {
        setCounts({
          pantryEvents: events.length,
          confirmedLabels: labels.length,
          candidates: cands.length
        });
        setLoadingStats(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    setStep("migrating");
    setErrorMsg(null);

    try {
      const [pantryEvents, confirmedLabels, candidates] = await Promise.all([
        getAllRecords("pantryEvents").catch(() => []),
        getAllRecords("confirmedLabels").catch(() => []),
        getAllRecords("candidates").catch(() => [])
      ]);

      const client = new SyncApiClient(async () => getToken());

      // Upload snapshot to /api/sync/migrate
      await client.migrateLocalData({
        pantryEvents,
        confirmedLabels,
        shoppingItems: [],
        settings: { candidatesCount: candidates.length }
      });

      // Enable cloud sync locally
      await syncMetadata.setCloudSyncEnabled(true);
      syncStatus.updateState({ isCloudEnabled: true });

      // Run immediate initial sync
      await syncCoordinator.triggerSync();

      setStep("complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Migration failed. Please try again.";
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="migration-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="migration-title">
      <div className="migration-modal-card">
        <button
          className="migration-close-btn"
          onClick={onClose}
          aria-label="Close migration wizard"
        >
          <X size={20} />
        </button>

        {step === "preview" && (
          <div className="migration-step-preview">
            <div className="migration-icon-header">
              <div className="migration-badge-icon">
                <Cloud size={28} className="text-emerald" />
              </div>
            </div>

            <h2 id="migration-title" className="migration-title">
              Keep Your Kitchen Synced Across Devices
            </h2>

            <p className="migration-description">
              Your local records stay safely stored on this device. Connecting your account uploads a
              secure, private copy so you can manage your pantry and shopping list from any phone, tablet, or laptop.
            </p>

            <div className="migration-stats-grid">
              <div className="migration-stat-box">
                <span className="stat-value">{loadingStats ? "..." : counts.pantryEvents}</span>
                <span className="stat-label">Pantry Events</span>
              </div>
              <div className="migration-stat-box">
                <span className="stat-value">{loadingStats ? "..." : counts.confirmedLabels}</span>
                <span className="stat-label">Verified Labels</span>
              </div>
              <div className="migration-stat-box">
                <span className="stat-value">{loadingStats ? "..." : counts.candidates}</span>
                <span className="stat-label">Product Scans</span>
              </div>
            </div>

            <div className="migration-safety-note">
              <ShieldCheck size={18} className="text-emerald" />
              <span>
                <strong>Zero data loss guarantee:</strong> All existing data remains on this device even if you go offline.
              </span>
            </div>

            <div className="migration-actions">
              <button
                className="btn-primary-sync"
                onClick={handleStartMigration}
                disabled={loadingStats}
              >
                <Cloud size={18} />
                Sync My Kitchen to Cloud
              </button>
              <button className="btn-secondary-ghost" onClick={onClose}>
                Keep Local Only
              </button>
            </div>
          </div>
        )}

        {step === "migrating" && (
          <div className="migration-step-migrating text-center">
            <div className="migration-spinner-box">
              <RefreshCw size={36} className="animate-spin text-emerald" />
            </div>
            <h3 className="migration-status-title">Uploading Your Kitchen Records...</h3>
            <p className="migration-status-sub">
              Securely syncing your pantry history and verified product packaging to your private cloud storage.
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="migration-step-complete text-center">
            <div className="migration-icon-header">
              <div className="migration-badge-icon success">
                <CheckCircle size={36} className="text-emerald" />
              </div>
            </div>
            <h3 className="migration-status-title">Your Kitchen Is Connected!</h3>
            <p className="migration-status-sub">
              Multi-device synchronization is now active. Any updates you make on this device or any other will automatically stay in sync.
            </p>
            <button className="btn-primary-sync mt-4" onClick={handleFinish}>
              Done
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="migration-step-error text-center">
            <div className="migration-icon-header">
              <div className="migration-badge-icon error">
                <Database size={36} className="text-red-500" />
              </div>
            </div>
            <h3 className="migration-status-title">Sync Setup Interrupted</h3>
            <p className="migration-status-sub text-red-600">
              {errorMsg || "Could not complete cloud setup. Please check your network and try again."}
            </p>
            <div className="migration-actions mt-4">
              <button className="btn-primary-sync" onClick={handleStartMigration}>
                Retry Sync
              </button>
              <button className="btn-secondary-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
