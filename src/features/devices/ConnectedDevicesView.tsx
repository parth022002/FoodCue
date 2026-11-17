import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import {
  Smartphone,
  Laptop,
  Monitor,
  Shield,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowLeft,
  Info
} from "lucide-react";
import { SyncApiClient } from "../../sync/transport/syncApiClient";
import { syncMetadata } from "../../sync/state/syncMetadata";
import type { SyncDeviceRecord } from "../../sync/types/syncContracts";

interface ConnectedDevicesViewProps {
  onBack?: () => void;
}

export function ConnectedDevicesView({ onBack }: ConnectedDevicesViewProps) {
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();

  const [devices, setDevices] = useState<SyncDeviceRecord[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deviceToRevoke, setDeviceToRevoke] = useState<SyncDeviceRecord | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [isSignedIn, getToken]);

  async function loadDevices() {
    setLoading(true);
    setActionError(null);
    try {
      const meta = await syncMetadata.get();
      setCurrentDeviceId(meta.deviceId);

      if (isSignedIn) {
        const client = new SyncApiClient(async () => getToken());
        const list = await client.listDevices();
        setDevices(list);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to load connected devices");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmRevoke() {
    if (!deviceToRevoke) return;
    setIsRevoking(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const client = new SyncApiClient(async () => getToken());
      const ok = await client.revokeDevice(deviceToRevoke.deviceId);
      if (ok) {
        setActionSuccess(`Device "${deviceToRevoke.deviceName}" revoked successfully. It can no longer sync with your account.`);
        setDevices((prev) => prev.filter((d) => d.deviceId !== deviceToRevoke.deviceId));
        setDeviceToRevoke(null);
      } else {
        setActionError("Could not revoke device. Please try again.");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to revoke device session.");
    } finally {
      setIsRevoking(false);
    }
  }

  function getDeviceIcon(name: string, userAgent?: string) {
    const ua = (userAgent || name).toLowerCase();
    if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
      return <Smartphone size={22} className="text-brand" />;
    }
    if (ua.includes("mac") || ua.includes("win") || ua.includes("laptop")) {
      return <Laptop size={22} className="text-emerald" />;
    }
    return <Monitor size={22} className="text-blue" />;
  }

  return (
    <div className="connected-devices-view" aria-labelledby="devices-view-title">
      {/* Header */}
      <div className="devices-header-bar mb-20">
        {onBack && (
          <button
            type="button"
            className="btn-back-link mb-8"
            onClick={onBack}
            aria-label="Back to Privacy & Cloud"
          >
            <ArrowLeft size={16} />
            <span>Back to Privacy & Cloud</span>
          </button>
        )}
        <div className="devices-title-row">
          <div>
            <h2 id="devices-view-title" className="section-card-title text-xl">
              Connected Devices
            </h2>
            <p className="text-sm text-muted">
              Manage the phones, tablets, and computers authorized to synchronize with your FoodCue kitchen.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={loadDevices}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="alert-banner alert-success mb-16" role="alert">
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
          <button type="button" className="alert-close-btn" onClick={() => setActionSuccess(null)}>✕</button>
        </div>
      )}

      {actionError && (
        <div className="alert-banner alert-danger mb-16" role="alert">
          <AlertTriangle size={18} />
          <span>{actionError}</span>
          <button type="button" className="alert-close-btn" onClick={() => setActionError(null)}>✕</button>
        </div>
      )}

      {/* Device List Card */}
      <div className="profile-section-card">
        {loading ? (
          <div className="py-24 text-center text-muted">
            <RefreshCw size={24} className="spin mx-auto mb-8 text-emerald" />
            <p>Loading registered devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-24 text-center text-muted">
            <Shield size={32} className="mx-auto mb-8 text-muted" />
            <p className="font-semibold">No Cloud Devices Registered</p>
            <p className="text-xs mt-4">Enable Cloud Sync to register this device and access your kitchen anywhere.</p>
          </div>
        ) : (
          <div className="device-cards-grid">
            {devices.map((device) => {
              const isCurrent = device.deviceId === currentDeviceId;
              return (
                <div key={device.deviceId} className={`device-card-item ${isCurrent ? "current-device" : ""}`}>
                  <div className="device-card-left">
                    <div className="device-icon-bubble">
                      {getDeviceIcon(device.deviceName, device.userAgent)}
                    </div>
                    <div className="device-details">
                      <div className="device-name-heading">
                        <strong className="text-sm">{device.deviceName}</strong>
                        {isCurrent && (
                          <span className="current-device-tag">This Device</span>
                        )}
                        {device.isRevoked && (
                          <span className="revoked-device-tag">Revoked</span>
                        )}
                      </div>
                      <div className="device-meta-text text-xs text-muted">
                        <span>Last sync: {new Date(device.lastSyncAt).toLocaleString()}</span>
                        <span>• App v{device.clientVersion}</span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && !device.isRevoked && (
                    <button
                      type="button"
                      className="btn-danger-outline-sm"
                      onClick={() => setDeviceToRevoke(device)}
                      aria-label={`Revoke access for ${device.deviceName}`}
                    >
                      <Trash2 size={14} />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Security Notice */}
        <div className="security-notice-box mt-20">
          <Info size={16} className="text-brand shrink-0" />
          <p className="tiny text-muted">
            <strong>Revocation Security Note:</strong> Revoking a device immediately invalidates its authentication token and blocks any future cloud synchronisation. However, data previously saved in that device&apos;s local browser IndexedDB remains on that physical hardware until cleared by the user.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {deviceToRevoke && (
        <div className="migration-modal-overlay" role="dialog" aria-modal="true">
          <div className="migration-modal-card">
            <button
              type="button"
              className="migration-close-btn"
              onClick={() => setDeviceToRevoke(null)}
              aria-label="Cancel revocation"
            >
              <X size={20} />
            </button>

            <div className="revocation-modal-body text-center">
              <div className="warning-icon-pill mx-auto mb-16">
                <AlertTriangle size={36} className="text-danger" />
              </div>

              <h3 className="section-card-title text-lg mb-8">
                Revoke Device Access?
              </h3>

              <p className="text-sm text-muted mb-16">
                Are you sure you want to revoke cloud access for <strong>&quot;{deviceToRevoke.deviceName}&quot;</strong>?
                This device will no longer be able to push or pull kitchen updates.
              </p>

              <div className="btn-group-sm justify-center">
                <button
                  type="button"
                  className="btn-danger-sm"
                  onClick={handleConfirmRevoke}
                  disabled={isRevoking}
                >
                  {isRevoking ? "Revoking..." : "Confirm Revoke"}
                </button>
                <button
                  type="button"
                  className="btn-secondary-ghost"
                  onClick={() => setDeviceToRevoke(null)}
                  disabled={isRevoking}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
