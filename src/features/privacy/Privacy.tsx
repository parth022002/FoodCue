import { useState, useEffect } from "react";
import {
  clearFoodCueData,
  getAllRecords,
  putRecord
} from "../../adapters/storage/database";
import type { PantryEvent } from "../../domain/entities/pantry";
import type { ConfirmedLabel, ProductCandidate } from "../../domain/entities/food";
import { syncStatus } from "../../sync/state/syncStatus";
import { syncCoordinator } from "../../sync/engine/syncCoordinator";
import { MigrationWizard } from "../sync/MigrationWizard";
import {
  Shield,
  Database,
  Cloud,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Camera,
  AlertTriangle,
  Code2,
  UserCheck,
  HardDrive,
  Info,
  Smartphone,
  Server
} from "lucide-react";

export function Privacy({ onDataRestored }: { onDataRestored?: () => void }) {
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);
  const [syncState, setSyncState] = useState(syncStatus.getState());
  const [isSyncing, setIsSyncing] = useState(false);

  const [stats, setStats] = useState({
    candidates: 0,
    confirmedLabels: 0,
    pantryEvents: 0
  });
  const [quota, setQuota] = useState<{ usedMB: number; totalMB: number; percent: number }>({
    usedMB: 0,
    totalMB: 0,
    percent: 0
  });

  useEffect(() => {
    loadLocalStats();
    loadStorageQuota();

    const unsubscribe = syncStatus.subscribe((s) => {
      setSyncState(s);
    });

    return () => unsubscribe();
  }, []);

  async function loadLocalStats() {
    try {
      const c = await getAllRecords<ProductCandidate>("candidates");
      const l = await getAllRecords<ConfirmedLabel>("confirmedLabels");
      const p = await getAllRecords<PantryEvent>("pantryEvents");
      setStats({
        candidates: c.length,
        confirmedLabels: l.length,
        pantryEvents: p.length
      });
    } catch {
      // fallback
    }
  }

  async function loadStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usedMB = Math.round(((est.usage || 0) / (1024 * 1024)) * 10) / 10;
        const totalMB = Math.round((est.quota || 1) / (1024 * 1024));
        const percent = Math.min(100, Math.round((usedMB / (totalMB || 1)) * 100));
        setQuota({ usedMB, totalMB, percent });
      } catch {
        // ignore
      }
    }
  }

  async function handleTriggerSync() {
    setIsSyncing(true);
    setMessage("");
    setErrorMsg("");
    try {
      const success = await syncCoordinator.triggerSync();
      if (success) {
        setMessage("All kitchen records synchronized with your private cloud account.");
      } else {
        setMessage("Sync completed or currently offline. Local changes remain queued.");
      }
      await loadLocalStats();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Sync error occurred");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleClearData() {
    try {
      await clearFoodCueData();
      localStorage.removeItem("foodcue_profile");
      setConfirmClear(false);
      setMessage("All FoodCue local storage and settings have been wiped cleanly.");
      await loadLocalStats();
      await loadStorageQuota();
      if (onDataRestored) onDataRestored();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to clear data.");
    }
  }

  async function handleExportJson() {
    try {
      const c = await getAllRecords("candidates");
      const l = await getAllRecords("confirmedLabels");
      const p = await getAllRecords("pantryEvents");
      const exportBundle = {
        exportedAt: new Date().toISOString(),
        application: "FoodCue",
        version: "1.0.0",
        schemaVersion: 1,
        data: { candidates: c, confirmedLabels: l, pantryEvents: p }
      };

      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foodcue-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Backup exported successfully as JSON.");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Export failed.");
    }
  }

  async function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any = JSON.parse(text);

      if (!parsed.application || parsed.application !== "FoodCue") {
        throw new Error("Invalid FoodCue backup file format.");
      }

      if (parsed.data?.pantryEvents && Array.isArray(parsed.data.pantryEvents)) {
        for (const ev of parsed.data.pantryEvents) {
          await putRecord("pantryEvents", { ...ev, id: ev.eventId });
        }
      }

      setMessage(`Backup restored! Imported ${parsed.data?.pantryEvents?.length || 0} pantry events.`);
      await loadLocalStats();
      if (onDataRestored) onDataRestored();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Import failed. Please select a valid JSON backup.");
    }
  }

  const consumerStatus = syncStatus.getConsumerLabel();

  return (
    <div className="privacy-page-container" aria-labelledby="privacy-page-title">
      {/* Notifications */}
      {message && (
        <div className="alert-banner alert-success" role="alert">
          <CheckCircle2 className="alert-icon" />
          <span>{message}</span>
          <button type="button" className="alert-close-btn" onClick={() => setMessage("")} aria-label="Dismiss alert">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="alert-banner alert-danger" role="alert">
          <AlertTriangle className="alert-icon" />
          <span>{errorMsg}</span>
          <button type="button" className="alert-close-btn" onClick={() => setErrorMsg("")} aria-label="Dismiss alert">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <header className="privacy-header-banner">
        <div className="privacy-header-badge">
          <Shield className="badge-icon-svg" />
          <span>Privacy-By-Design & Local-First Security</span>
        </div>
        <h1 id="privacy-page-title" className="privacy-header-title">Privacy Policy & Data Sovereignty</h1>
        <p className="privacy-header-sub">
          At FoodCue, your food data belongs strictly to you. We operate on a local-first architecture: your scans, pantry inventory, allergen avoid-lists, and dates reside privately inside your browser&apos;s IndexedDB and are never tracked, monetized, or sold.
        </p>
      </header>

      {/* 8 Core Privacy Sections */}
      <div className="privacy-sections-layout">
        {/* Section 1: Privacy at FoodCue */}
        <section className="privacy-card" aria-labelledby="sec-1-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-green-light">
              <Shield className="card-icon text-brand" />
            </div>
            <div>
              <span className="section-number">Section 1</span>
              <h2 id="sec-1-title" className="section-heading">Privacy at FoodCue</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              FoodCue is built with a singular premise: <strong>kitchen intelligence should not require personal surveillance</strong>. We do not run third-party advertising trackers, behavioural cookies, or ad retargeting pixels.
            </p>
            <ul className="bullet-list mt-12">
              <li><strong>Zero Ad Trackers:</strong> No Google Analytics advertising IDs, Facebook Pixels, or cross-site tracking beacons.</li>
              <li><strong>Deterministic Evaluation:</strong> Ingredient evaluations and allergen flags are run locally using embedded deterministic rules based on FSSAI Food Safety Standards (2020).</li>
              <li><strong>Anonymous by Default:</strong> You are free to use FoodCue without creating an account or providing an email address.</li>
            </ul>
          </div>
        </section>

        {/* Section 2: Local-First Storage */}
        <section className="privacy-card" aria-labelledby="sec-2-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-emerald-light">
              <HardDrive className="card-icon text-emerald" />
            </div>
            <div>
              <span className="section-number">Section 2</span>
              <h2 id="sec-2-title" className="section-heading">Local-First Storage (IndexedDB)</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              All application state is saved directly inside your browser using <strong>IndexedDB (v3: foodcue-local)</strong>. This includes your scanned product candidates, confirmed packaging labels, nutrition evaluations, and pantry event log.
            </p>

            <div className="storage-meter-box mt-16">
              <div className="storage-meter-header">
                <span className="font-semibold text-sm">Device Storage Usage</span>
                <span className="text-xs text-muted">
                  Used: {quota.usedMB} MB / {quota.totalMB > 0 ? `${quota.totalMB} MB` : "Quota Dynamic"} ({quota.percent}%)
                </span>
              </div>

              <div className="quota-progress-bar mt-8">
                <div
                  className="quota-progress-fill"
                  style={{ width: `${Math.max(4, quota.percent)}%` }}
                />
              </div>

              <div className="stats-breakdown-grid mt-12">
                <div className="stat-pill">
                  <span className="stat-num">{stats.candidates}</span>
                  <span className="stat-lbl">Product Candidates</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-num">{stats.confirmedLabels}</span>
                  <span className="stat-lbl">Confirmed Labels</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-num">{stats.pantryEvents}</span>
                  <span className="stat-lbl">Pantry Events</span>
                </div>
              </div>
            </div>

            <p className="tiny text-muted mt-12">
              <Info className="inline-icon" /> <em>Browser Storage Retention Notice:</em> If you clear your browser cookies and site data, or browse in an incognito/private window, local IndexedDB records will be reset. Use the Export Data tool below to create permanent offline JSON backups.
            </p>
          </div>
        </section>

        {/* Section 3: Optional Accounts */}
        <section className="privacy-card" aria-labelledby="sec-3-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-blue-light">
              <UserCheck className="card-icon text-blue" />
            </div>
            <div>
              <span className="section-number">Section 3</span>
              <h2 id="sec-3-title" className="section-heading">Optional Accounts</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              Signing up for an account is <strong>entirely optional</strong>. You can scan barcodes, check ingredients for FSSAI allergens, log pantry purchases, and maintain shopping lists indefinitely as an anonymous user.
            </p>
            <p className="mt-8">
              Authentication is powered by <strong>Clerk</strong> for secure identity verification (supporting Email, Username, Google, and Apple OAuth). Signing in enables multi-device access and Household Family Sharing, but <em>does not</em> silently upload your existing local pantry data without explicit consent.
            </p>
          </div>
        </section>

        {/* Section 4: Multi-Device Cloud Sync */}
        <section className="privacy-card" aria-labelledby="sec-4-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-purple-light">
              <Cloud className="card-icon text-purple" />
            </div>
            <div>
              <span className="section-number">Section 4</span>
              <h2 id="sec-4-title" className="section-heading">Multi-Device Cloud Sync</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              When you opt in to multi-device synchronization, FoodCue securely replicates your pantry ledger, shopping list, and confirmed product labels to your private encrypted cloud account.
            </p>

            <div className="neon-status-card mt-12">
              <div className="status-indicator-row">
                <div className="status-flex">
                  <span className={`status-bubble ${consumerStatus.variant === "success" ? "bg-green" : "bg-gray"}`} />
                  <div>
                    <strong className="text-sm">{consumerStatus.text}</strong>
                    <div className="tiny text-muted">
                      {syncState.lastSyncTime
                        ? `Last synced: ${new Date(syncState.lastSyncTime).toLocaleTimeString()}`
                        : "Encrypted delta synchronization"}
                    </div>
                  </div>
                </div>

                <div className="sync-actions-row">
                  {syncState.isCloudEnabled ? (
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={handleTriggerSync}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`btn-icon-xs ${isSyncing ? "spin" : ""}`} />
                      {isSyncing ? "Syncing..." : "Sync Now"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary-sm"
                      onClick={() => setShowMigrationWizard(true)}
                    >
                      <Cloud className="btn-icon-xs" />
                      Enable Cloud Sync
                    </button>
                  )}
                </div>
              </div>

              <div className="features-value-grid mt-16">
                <div className="feature-mini-card">
                  <Smartphone className="mini-card-icon text-brand" />
                  <div>
                    <strong className="text-xs">Offline-First Engine</strong>
                    <p className="tiny text-muted">Mutations queue locally and auto-flush on reconnection.</p>
                  </div>
                </div>
                <div className="feature-mini-card">
                  <Shield className="mini-card-icon text-emerald" />
                  <div>
                    <strong className="text-xs">End-to-End User Isolation</strong>
                    <p className="tiny text-muted">Strict horizontal authorization prevents cross-user access.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="tiny text-muted mt-12">
              <Info className="inline-icon" /> <em>Zero-Lock-in Guarantee:</em> You can disable cloud sync or delete all cloud records at any time. Your local device copy remains fully functional.
            </p>
          </div>
        </section>

        {/* Section 5: Camera & Image Privacy */}
        <section className="privacy-card" aria-labelledby="sec-5-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-amber-light">
              <Camera className="card-icon text-amber" />
            </div>
            <div>
              <span className="section-number">Section 5</span>
              <h2 id="sec-5-title" className="section-heading">Camera & Image Privacy</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              SmartScan uses your device camera solely for local optical barcode recognition and label text recognition:
            </p>
            <ul className="bullet-list mt-12">
              <li><strong>Local Frame Processing:</strong> Camera video frames are processed on-device using WebAssembly (ZXing). No live video stream is transmitted to external servers.</li>
              <li><strong>Physical Confirmation Gate:</strong> Scanned candidates require your physical package verification before being confirmed into your pantry.</li>
              <li><strong>Temporary Storage:</strong> Uploaded photo panels are stored exclusively inside your browser&apos;s local IndexedDB.</li>
            </ul>
          </div>
        </section>

        {/* Section 6: External Services */}
        <section className="privacy-card" aria-labelledby="sec-6-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-cyan-light">
              <Server className="card-icon text-cyan" />
            </div>
            <div>
              <span className="section-number">Section 6</span>
              <h2 id="sec-6-title" className="section-heading">External Services & Infrastructure</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>FoodCue relies on minimal, highly-vetted cloud infrastructure to maintain its Zero-Cash high-availability SLA:</p>
            <ul className="bullet-list mt-12">
              <li><strong>Vercel Serverless Edge:</strong> Static asset delivery, caching, and serverless authentication endpoints.</li>
              <li><strong>Clerk Identity Platform:</strong> Authentication tokens, user sessions, and Household organization access control.</li>
              <li><strong>Neon Serverless PostgreSQL:</strong> Encrypted multi-device synchronization backend with tenant isolation.</li>
              <li><strong>Open Food Facts (Optional Fallback):</strong> Public product catalog queries when an item is not found in our pre-verified database.</li>
            </ul>
          </div>
        </section>

        {/* Section 7: Data Management */}
        <section className="privacy-card" aria-labelledby="sec-7-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-teal-light">
              <Database className="card-icon text-teal" />
            </div>
            <div>
              <span className="section-number">Section 7</span>
              <h2 id="sec-7-title" className="section-heading">Data Management & Offline Backups</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              Take complete control of your kitchen records. Export an unencrypted, open-standard JSON snapshot, import a previous backup, or cleanly erase all stored data from this browser.
            </p>

            <div className="data-management-actions-grid mt-16">
              <div className="action-tile">
                <div className="action-tile-info">
                  <Download className="action-tile-icon text-brand" />
                  <div>
                    <strong className="text-sm">Export Data Backup (JSON)</strong>
                    <p className="tiny text-muted">Download your complete pantry ledger and scanned labels as a standard JSON file.</p>
                  </div>
                </div>
                <button type="button" className="btn-secondary-sm mt-8" onClick={handleExportJson}>
                  <Download className="btn-icon-xs" />
                  Download Backup JSON
                </button>
              </div>

              <div className="action-tile">
                <div className="action-tile-info">
                  <Upload className="action-tile-icon text-blue" />
                  <div>
                    <strong className="text-sm">Import Previous Backup</strong>
                    <p className="tiny text-muted">Restore pantry items and labels from an existing FoodCue JSON backup.</p>
                  </div>
                </div>
                <label className="btn-secondary-sm mt-8 cursor-pointer">
                  <Upload className="btn-icon-xs" />
                  <span>Choose JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden-file-input"
                  />
                </label>
              </div>

              <div className="action-tile danger-tile">
                <div className="action-tile-info">
                  <Trash2 className="action-tile-icon text-danger" />
                  <div>
                    <strong className="text-sm text-danger">Reset Local Storage</strong>
                    <p className="tiny text-muted">Permanently wipes all IndexedDB tables, candidates, confirmed labels, and local settings from this browser.</p>
                  </div>
                </div>
                {confirmClear ? (
                  <div className="confirm-delete-box mt-8">
                    <p className="tiny text-danger font-semibold mb-4">Are you completely sure? This action cannot be undone.</p>
                    <div className="btn-group-sm">
                      <button type="button" className="btn-danger-sm" onClick={handleClearData}>
                        Confirm Reset
                      </button>
                      <button type="button" className="btn-ghost-sm" onClick={() => setConfirmClear(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="btn-danger-sm mt-8" onClick={() => setConfirmClear(true)}>
                    <Trash2 className="btn-icon-xs" />
                    Wipe Local Data
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Developer & Contact Information */}
        <section className="privacy-card developer-card" aria-labelledby="sec-8-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-gray-light">
              <Code2 className="card-icon text-gray-800" />
            </div>
            <div>
              <span className="section-number">Section 8</span>
              <h2 id="sec-8-title" className="section-heading">Developer Information & Attributions</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <div className="developer-profile-box">
              <div className="dev-avatar-initials">PA</div>
              <div className="dev-info-content">
                <h3 className="dev-name">Parth Ahuja</h3>
                <p className="dev-role">Creator, Lead Architect & Full-Stack Engineer of FoodCue</p>
                <p className="text-sm text-muted mt-8">
                  FoodCue is developed with a strict commitment to digital privacy, open standards, and food safety transparency. If you have questions about our data practices or wish to request full account and cloud data deletion, please reach out directly:
                </p>
                <div className="dev-contact-row mt-12">
                  <a href="mailto:parthahuja2002@gmail.com" className="dev-contact-chip">
                    parthahuja2002@gmail.com
                  </a>
                  <a href="https://github.com/parth022002/FoodCue" target="_blank" rel="noopener noreferrer" className="dev-contact-chip">
                    GitHub: parth022002/FoodCue
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Migration Wizard Modal */}
      <MigrationWizard
        isOpen={showMigrationWizard}
        onClose={() => setShowMigrationWizard(false)}
        onComplete={() => {
          setShowMigrationWizard(false);
          setMessage("Multi-device cloud synchronization is now active!");
          loadLocalStats();
        }}
      />
    </div>
  );
}
