import React, { useState, useEffect } from "react";
import {
  clearFoodCueData,
  getAllRecords,
  storageInfo,
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
  Activity
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
        const usedMB = Math.round((est.usage || 0) / (1024 * 1024) * 10) / 10;
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
        setMessage(`Connected to Neon Postgres (${res.serverVersion}, ${res.latencyMs}ms latency).`);
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
      setMessage("All FoodCue IndexedDB stores and local settings were wiped cleanly.");
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

      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: "application/json" });
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const neonInfo = parseNeonHost((import.meta as any).env?.VITE_NEON_DATABASE_URL || null);

  return (
    <section className="panel" aria-labelledby="privacy-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">DATA SOVEREIGNTY & PRIVACY</p>
          <h2 id="privacy-heading" className="panel-title-with-icon">
            <Shield className="title-icon text-brand-green" aria-hidden="true" />
            Privacy, Storage & Neon Cloud Sync
          </h2>
        </div>
        <span className="local-pill">
          <span className="dot" /> Local-First Architecture
        </span>
      </div>

      <p className="muted">
        Your food intelligence and kitchen records are processed and stored on this device by default. Optional Neon Lakebase Postgres cloud backup keeps your inventory safely synchronized.
      </p>

      {message && <div className="alert info" role="status">{message}</div>}
      {errorMsg && <div className="alert error" role="alert">{errorMsg}</div>}

      {/* Local Storage Stats */}
      <div className="two-col-cards">
        <div className="stat-card">
          <div className="stat-header">
            <Database className="card-icon text-brand-green" />
            <h3>Local IndexedDB Storage</h3>
          </div>
          <div className="stat-numbers">
            <div className="stat-item">
              <strong>{stats.pantryEvents}</strong>
              <span>Ledger Events</span>
            </div>
            <div className="stat-item">
              <strong>{stats.confirmedLabels}</strong>
              <span>Confirmed Packs</span>
            </div>
            <div className="stat-item">
              <strong>{stats.candidates}</strong>
              <span>Candidates</span>
            </div>
          </div>
          <p className="tiny text-muted mt-8">
            Database: <code>{storageInfo.databaseName}</code> (Schema v{storageInfo.version})
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <Activity className="card-icon text-info" />
            <h3>Storage Quota & Eviction Canary</h3>
          </div>
          <div className="quota-meter-box">
            <div className="quota-bar-wrapper">
              <div className="quota-bar-fill" style={{ width: `${Math.max(4, quota.percent)}%` }} />
            </div>
            <div className="quota-labels">
              <span>{quota.usedMB} MB used</span>
              <span>{quota.totalMB > 0 ? `${quota.totalMB} MB quota` : "Unlimited local"}</span>
            </div>
          </div>
          <p className="tiny text-muted mt-8">
            ✓ Eviction canary healthy. Persistent storage active on modern browser profile.
          </p>
        </div>
      </div>

      {/* Neon Cloud Database Section */}
      <div className="neon-sync-card mt-24">
        <div className="neon-sync-header">
          <div className="neon-title-group">
            <Cloud className="neon-logo-icon" aria-hidden="true" />
            <div>
              <h3>Neon Lakebase Postgres Cloud Integration</h3>
              <p className="tiny">
                Serverless connection to Southeast Asia (Singapore) Postgres Pooler
              </p>
            </div>
          </div>
          <span className={`connection-badge ${neonStatus.connected ? "connected" : "disconnected"}`}>
            {neonStatus.connected ? "● Connected" : "○ Disconnected"}
          </span>
        </div>

        <div className="neon-details-grid">
          <div className="detail-row">
            <Server className="tiny-icon text-muted" />
            <span>Host: <code>{neonInfo.host}</code></span>
          </div>
          <div className="detail-row">
            <Database className="tiny-icon text-muted" />
            <span>Database: <code>{neonInfo.database}</code></span>
          </div>
          {neonStatus.serverVersion && (
            <div className="detail-row">
              <CheckCircle2 className="tiny-icon text-brand-green" />
              <span>Version: <strong>{neonStatus.serverVersion}</strong> ({neonStatus.latencyMs}ms)</span>
            </div>
          )}
          {typeof neonStatus.tablesCount === "number" && (
            <div className="detail-row">
              <Database className="tiny-icon text-brand-green" />
              <span>Cloud Schema: <strong>{neonStatus.tablesCount} tables ready</strong></span>
            </div>
          )}
        </div>

        <div className="neon-action-buttons mt-16">
          <button
            className="secondary-button compact-btn"
            onClick={handleTestNeon}
            disabled={isTestingNeon}
          >
            <RefreshCw className={`btn-icon ${isTestingNeon ? "spin" : ""}`} />
            {isTestingNeon ? "Testing..." : "Test Connection"}
          </button>
          <button
            className="secondary-button compact-btn"
            onClick={handleInitSchema}
            disabled={isSyncingNeon}
          >
            Initialize Cloud Tables
          </button>
          <button
            className="primary-button compact-btn"
            onClick={handleSyncToNeon}
            disabled={isSyncingNeon}
          >
            <Cloud className="btn-icon" />
            {isSyncingNeon ? "Syncing..." : "Sync Local Pantry to Neon"}
          </button>
          <button
            className="secondary-button compact-btn"
            onClick={handleRestoreFromNeon}
            disabled={isSyncingNeon}
          >
            <Download className="btn-icon" /> Restore from Neon
          </button>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="backup-section mt-24">
        <h3 className="section-title">Data Backup, Export & Portability</h3>
        <p className="tiny text-muted">
          Download a complete offline copy of your food data. You own your kitchen ledger.
        </p>

        <div className="backup-buttons-row mt-12">
          <button className="secondary-button" onClick={handleExportJson}>
            <Download className="btn-icon" /> Export JSON Backup
          </button>
          <label className="secondary-button file-upload-label">
            <Upload className="btn-icon" /> Import JSON Backup
            <input type="file" accept=".json,application/json" onChange={handleImportJson} hidden />
          </label>
        </div>
      </div>

      {/* Danger Zone: Clear Data */}
      <div className="danger-zone-card mt-32">
        <div className="danger-zone-header">
          <Trash2 className="danger-icon" />
          <div>
            <h4>Clear Local FoodCue Data</h4>
            <p className="tiny text-muted">
              Permanently wipes all IndexedDB stores, local scans, preferences, and cached labels.
            </p>
          </div>
        </div>

        {!confirmClear ? (
          <button className="danger-button compact-btn" onClick={() => setConfirmClear(true)}>
            Clear Local Data...
          </button>
        ) : (
          <div className="confirm-wipe-box">
            <p className="alert error">
              Are you sure? This will delete all local records on this device.
            </p>
            <div className="confirm-buttons">
              <button className="danger-button" onClick={handleClearData}>
                Yes, Delete All Local Records
              </button>
              <button className="secondary-button" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
