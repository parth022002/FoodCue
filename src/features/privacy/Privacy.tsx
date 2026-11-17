import { useState, useEffect } from "react";
import {
  clearFoodCueData,
  getAllRecords,
  putRecord
} from "../../adapters/storage/database";
import {
  testNeonConnection,
  syncPantryEventsToNeon,
  fetchPantryEventsFromNeon,
  initializeNeonSchema,
  parseNeonHost,
  type NeonConnectionStatus
} from "../../adapters/storage/neonDatabase";
import type { PantryEvent } from "../../domain/entities/pantry";
import type { ConfirmedLabel, ProductCandidate } from "../../domain/entities/food";
import {
  Shield,
  Database,
  Cloud,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Server,
  Camera,
  AlertTriangle,
  Code2,
  UserCheck,
  HardDrive,
  Info
} from "lucide-react";

export function Privacy({ onDataRestored }: { onDataRestored?: () => void }) {
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
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

  // Neon Database State
  const [neonStatus, setNeonStatus] = useState<NeonConnectionStatus>({
    connected: false,
    host: "ep-snowy-mode-b3jn52y5-pooler.c-4.ap-southeast-1.aws.neon.tech",
    database: "neondb"
  });
  const [isTestingNeon, setIsTestingNeon] = useState(false);
  const [isSyncingNeon, setIsSyncingNeon] = useState(false);

  useEffect(() => {
    loadLocalStats();
    loadStorageQuota();
    handleTestNeon();
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

  async function handleTestNeon() {
    setIsTestingNeon(true);
    setErrorMsg("");
    try {
      const res = await testNeonConnection();
      setNeonStatus(res);
      if (res.connected) {
        setMessage(`Connected to Neon Postgres (${res.serverVersion || "v16"}, ${res.latencyMs}ms latency).`);
      } else {
        setErrorMsg(`Neon connection check: ${res.error}`);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setIsTestingNeon(false);
    }
  }

  async function handleSyncToNeon() {
    setIsSyncingNeon(true);
    setMessage("");
    setErrorMsg("");
    try {
      const events = await getAllRecords<PantryEvent>("pantryEvents");
      if (events.length === 0) {
        setMessage("No local pantry events to sync yet. Add items in My Kitchen first.");
        setIsSyncingNeon(false);
        return;
      }
      const count = await syncPantryEventsToNeon(events);
      setMessage(`Successfully synced ${count} pantry ledger event(s) to Neon Postgres.`);
      await handleTestNeon();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to sync to Neon.");
    } finally {
      setIsSyncingNeon(false);
    }
  }

  async function handleRestoreFromNeon() {
    setIsSyncingNeon(true);
    setMessage("");
    setErrorMsg("");
    try {
      const cloudEvents = await fetchPantryEventsFromNeon();
      if (cloudEvents.length === 0) {
        setMessage("No pantry events found in Neon cloud database.");
        setIsSyncingNeon(false);
        return;
      }
      for (const ev of cloudEvents) {
        await putRecord("pantryEvents", { ...ev, id: ev.eventId });
      }
      await loadLocalStats();
      setMessage(`Restored ${cloudEvents.length} event(s) from Neon database into local IndexedDB.`);
      if (onDataRestored) onDataRestored();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Restore from Neon failed.");
    } finally {
      setIsSyncingNeon(false);
    }
  }

  async function handleInitSchema() {
    setIsSyncingNeon(true);
    try {
      const res = await initializeNeonSchema();
      if (res.success) {
        setMessage(res.message);
        await handleTestNeon();
      } else {
        setErrorMsg(res.message);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to initialize schema.");
    } finally {
      setIsSyncingNeon(false);
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

  const neonInfo = parseNeonHost(
    (import.meta as unknown as { env?: { VITE_NEON_DATABASE_URL?: string } }).env?.VITE_NEON_DATABASE_URL || null
  );

  return (
    <div className="privacy-page-container" aria-labelledby="privacy-page-title">
      {/* Notifications */}
      {message && (
        <div className="alert-banner alert-success mb-24" role="status">
          <CheckCircle2 className="alert-icon" />
          <span>{message}</span>
          <button type="button" className="alert-close" onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {errorMsg && (
        <div className="alert-banner alert-danger mb-24" role="alert">
          <AlertTriangle className="alert-icon" />
          <span>{errorMsg}</span>
          <button type="button" className="alert-close" onClick={() => setErrorMsg("")}>×</button>
        </div>
      )}

      {/* Hero Section */}
      <div className="privacy-hero-card mb-24">
        <div className="privacy-hero-content">
          <div className="privacy-hero-badge">
            <Shield className="hero-shield-icon" aria-hidden="true" />
            <span>Privacy & Data Sovereignty</span>
          </div>
          <h1 id="privacy-page-title" className="privacy-hero-title">
            Your food data. Your control.
          </h1>
          <p className="privacy-hero-subtitle">
            FoodCue is built local-first. We believe what you eat and keep in your household pantry is private by default. You can use every core feature without an account, and your data stays on your device unless you explicitly opt in to cloud synchronization.
          </p>
        </div>
      </div>

      {/* 8 Core Privacy Sections */}
      <div className="privacy-sections-grid">
        {/* Section 1: Privacy at FoodCue */}
        <section className="privacy-card" aria-labelledby="sec-1-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-brand-light">
              <Shield className="card-icon text-brand" />
            </div>
            <div>
              <span className="section-number">Section 1</span>
              <h2 id="sec-1-title" className="section-heading">Privacy at FoodCue</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              FoodCue is governed by strict local-first and privacy-by-default architecture principles.
              Unlike typical cloud-based grocery apps, FoodCue executes barcode decoding, optical character recognition (OCR),
              and food-safety intelligence computations directly inside your web browser.
            </p>
            <div className="principles-tags-row mt-12">
              <span className="principle-pill">No Mandatory Accounts</span>
              <span className="principle-pill">No Tracking Cookies</span>
              <span className="principle-pill">Zero Cash Target (INR 0)</span>
            </div>
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
              <h2 id="sec-2-title" className="section-heading">Local-First Storage</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              All product scans, candidate records, pantry inventory items, and shopping lists are saved in your browser&apos;s
              <strong> IndexedDB</strong> engine. No data leaves your machine unless you enable cloud sync.
            </p>

            {/* Storage Quota & Stats Breakdown */}
            <div className="storage-stats-box mt-16">
              <div className="stats-box-header">
                <span className="font-semibold text-sm">IndexedDB Local Persistence State</span>
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
              When explicitly enabled, FoodCue synchronizes your pantry event ledger to a private serverless
              <strong> Neon PostgreSQL</strong> database located in AWS Singapore (<code>ap-southeast-1</code>).
            </p>

            <div className="neon-status-card mt-12">
              <div className="status-indicator-row">
                <div className="status-flex">
                  <span className={`status-bubble ${neonStatus.connected ? "bg-green" : "bg-gray"}`} />
                  <div>
                    <strong className="text-sm">Neon Lakebase PostgreSQL</strong>
                    <div className="tiny text-muted">
                      Host: <code>{neonInfo.host || neonStatus.host}</code>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={handleTestNeon}
                  disabled={isTestingNeon}
                >
                  <RefreshCw className={`btn-icon-xs ${isTestingNeon ? "spin" : ""}`} />
                  {isTestingNeon ? "Testing..." : "Test Connection"}
                </button>
              </div>

              <div className="sync-actions-row mt-12">
                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={handleSyncToNeon}
                  disabled={isSyncingNeon}
                >
                  <Upload className="btn-icon-xs" />
                  {isSyncingNeon ? "Syncing..." : "Sync Local Events to Cloud"}
                </button>

                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={handleRestoreFromNeon}
                  disabled={isSyncingNeon}
                >
                  <Download className="btn-icon-xs" />
                  Restore from Cloud to Local
                </button>

                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={handleInitSchema}
                  title="Run initial SQL migrations on Neon database"
                >
                  Verify DB Schema
                </button>
              </div>
            </div>
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
              SmartScan only accesses your device camera when you explicitly press &quot;Scan with Camera&quot;.
              Camera streams and uploaded package photos are processed <strong>100% locally</strong> on your device
              using WebAssembly barcode decoding (<code>@sec-ant/zxing-wasm</code>) and browser Web Workers.
            </p>
            <p className="mt-8">
              No photos or live camera video frames are ever uploaded, recorded, or transmitted to any external server.
            </p>
          </div>
        </section>

        {/* Section 6: External Services */}
        <section className="privacy-card" aria-labelledby="sec-6-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-slate-light">
              <Server className="card-icon text-slate" />
            </div>
            <div>
              <span className="section-number">Section 6</span>
              <h2 id="sec-6-title" className="section-heading">External Services</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              FoodCue connects exclusively to transparent, sanctioned infrastructure. Here is every service integrated:
            </p>
            <ul className="service-bullet-list mt-8">
              <li>
                <strong>Clerk:</strong> Optional authentication provider (manages session tokens, OAuth, and Household Organizations).
              </li>
              <li>
                <strong>Neon PostgreSQL:</strong> Optional serverless database in AWS Singapore (holds synchronized pantry events and user profiles).
              </li>
              <li>
                <strong>Open Food Facts:</strong> Public product intelligence catalog (queried only when scanning a GTIN not in local cache).
              </li>
              <li>
                <strong>Vercel:</strong> Static Edge PWA hosting and serverless API routing with strict CSP security headers.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 7: Data Management */}
        <section className="privacy-card full-width-card" aria-labelledby="sec-7-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-rose-light">
              <Database className="card-icon text-rose" />
            </div>
            <div>
              <span className="section-number">Section 7</span>
              <h2 id="sec-7-title" className="section-heading">Data Management & Sovereign Controls</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <p>
              You own your data completely. Export portable offline JSON backups, restore them onto any device, or permanently erase all local records.
            </p>

            <div className="data-management-actions mt-16">
              <div className="action-tile">
                <div>
                  <h4 className="font-semibold text-sm">Export Data Backup</h4>
                  <p className="tiny text-muted">Download all candidates, confirmed labels, and pantry events as a validated JSON file.</p>
                </div>
                <button type="button" className="btn-secondary" onClick={handleExportJson}>
                  <Download className="btn-icon" />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="action-tile">
                <div>
                  <h4 className="font-semibold text-sm">Import Data Backup</h4>
                  <p className="tiny text-muted">Restore a previously saved FoodCue backup file into this browser.</p>
                </div>
                <label className="btn-secondary file-picker-label">
                  <Upload className="btn-icon" />
                  <span>Choose JSON</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportJson}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="action-tile danger-tile">
                <div>
                  <h4 className="font-semibold text-sm text-danger">Clear Local Storage</h4>
                  <p className="tiny text-muted">Permanently wipes all IndexedDB tables and preferences from this device.</p>
                </div>
                {confirmClear ? (
                  <div className="confirm-btn-group">
                    <button type="button" className="btn-danger-confirm" onClick={handleClearData}>
                      Confirm Erase
                    </button>
                    <button type="button" className="btn-cancel" onClick={() => setConfirmClear(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn-danger-outline" onClick={() => setConfirmClear(true)}>
                    <Trash2 className="btn-icon" />
                    <span>Clear All Data</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Contact and Developer Information */}
        <section className="privacy-card full-width-card" aria-labelledby="sec-8-title">
          <div className="privacy-card-header">
            <div className="card-icon-pill bg-brand-light">
              <Code2 className="card-icon text-brand" />
            </div>
            <div>
              <span className="section-number">Section 8</span>
              <h2 id="sec-8-title" className="section-heading">Contact & Project Information</h2>
            </div>
          </div>
          <div className="privacy-card-body">
            <div className="developer-contact-box">
              <div className="dev-meta">
                <span className="text-xs uppercase text-muted font-bold tracking-wider">Lead Software Architect & Developer</span>
                <h3 className="dev-name font-bold text-lg text-brand-dark">Parth Ahuja</h3>
                <p className="text-sm text-muted mt-4">
                  Built to empower Indian households with transparent packaged food intelligence, allergen safety awareness, and autonomous kitchen management.
                </p>
              </div>

              <div className="project-specs-meta">
                <div className="spec-badge">
                  <span className="spec-label">Parent Spec</span>
                  <span className="spec-val">FoodCue v13.5</span>
                </div>
                <div className="spec-badge">
                  <span className="spec-label">Security Baseline</span>
                  <span className="spec-val">Security & Privacy v1.0</span>
                </div>
                <div className="spec-badge">
                  <span className="spec-label">Regulatory Authority</span>
                  <span className="spec-val">FSSAI Labelling Amdt 6</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
