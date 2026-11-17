/**
 * FoodCue Expiry Reminder Settings Component (Milestone 4)
 * Allows users to configure local and Web Push expiry reminders,
 * timing thresholds, quiet hours, and channel preferences with WCAG 2.2 AA compliance.
 */

import React, { useState, useEffect } from "react";
import { Bell, BellOff, Moon, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import {
  type ExpiryAlertThreshold,
  type NotificationPreferences,
  type NotificationPermissionState,
  getNotificationPermission,
  getNotificationPreferences,
  isPushSupported,
  requestNotificationPermission,
  saveNotificationPreferences,
  subscribeToPush,
  unsubscribeFromPush
} from "../../adapters/notifications/notificationService";

interface ExpiryReminderSettingsProps {
  onClose?: () => void;
  onPreferencesUpdated?: (prefs: NotificationPreferences) => void;
}

export const ExpiryReminderSettings: React.FC<ExpiryReminderSettingsProps> = ({
  onClose,
  onPreferencesUpdated
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    thresholdDays: 2,
    channel: "in_app",
    quietHours: { enabled: true, start: "22:00", end: "08:00" }
  });

  const [pushSupported, setPushSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>("default");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [testAlertPreview, setTestAlertPreview] = useState<string | null>(null);

  useEffect(() => {
    setPushSupported(isPushSupported());
    setPermissionState(getNotificationPermission());

    getNotificationPreferences().then((prefs) => {
      setPreferences(prefs);
    });
  }, []);

  async function handleToggleEnabled(nextEnabled: boolean) {
    if (nextEnabled && preferences.channel !== "in_app" && pushSupported) {
      if (permissionState === "default") {
        const granted = await requestNotificationPermission();
        setPermissionState(granted);
        if (granted === "granted") {
          await subscribeToPush();
        }
      }
    }

    const updated = await saveNotificationPreferences({ enabled: nextEnabled });
    setPreferences(updated);
    onPreferencesUpdated?.(updated);
    setStatusMessage(nextEnabled ? "Reminders enabled" : "Reminders paused");
  }

  async function handleThresholdChange(threshold: ExpiryAlertThreshold) {
    const updated = await saveNotificationPreferences({ thresholdDays: threshold });
    setPreferences(updated);
    onPreferencesUpdated?.(updated);
  }

  async function handleChannelChange(channel: "push" | "in_app" | "both") {
    if ((channel === "push" || channel === "both") && pushSupported && permissionState !== "granted") {
      const result = await requestNotificationPermission();
      setPermissionState(result);
      if (result === "granted") {
        await subscribeToPush();
      }
    }

    const updated = await saveNotificationPreferences({ channel });
    setPreferences(updated);
    onPreferencesUpdated?.(updated);
  }

  async function handleQuietHoursToggle(enabled: boolean) {
    const updated = await saveNotificationPreferences({
      quietHours: { ...preferences.quietHours, enabled }
    });
    setPreferences(updated);
    onPreferencesUpdated?.(updated);
  }

  async function handleTimeChange(field: "start" | "end", value: string) {
    const updated = await saveNotificationPreferences({
      quietHours: { ...preferences.quietHours, [field]: value }
    });
    setPreferences(updated);
    onPreferencesUpdated?.(updated);
  }

  async function handleTestAlert() {
    setIsSaving(true);
    setTestAlertPreview(
      `Sample Alert: Amul Taaza Toned Milk (500 ml) expires in ${preferences.thresholdDays} days. Used with gentle, non-spam delivery.`
    );
    setTimeout(() => {
      setIsSaving(false);
    }, 400);
  }

  return (
    <div
      className="expiry-reminder-settings bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm space-y-6 max-w-lg mx-auto"
      role="region"
      aria-label="Food Expiry Notification Preferences"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
            <Bell className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Expiry Reminders
            </h3>
            <p className="text-xs text-stone-500">
              Gentle notifications to prevent domestic food waste
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm font-medium px-2 py-1"
            aria-label="Close notification settings"
          >
            Done
          </button>
        )}
      </div>

      {/* Main Enable Switch */}
      <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
        <div className="space-y-0.5">
          <label htmlFor="reminder-master-switch" className="text-sm font-medium text-stone-900 dark:text-stone-100 cursor-pointer">
            Activate Expiry Alerts
          </label>
          <p className="text-xs text-stone-500">
            Monitor approaching Use-By and Best-Before dates
          </p>
        </div>

        <button
          id="reminder-master-switch"
          role="switch"
          aria-checked={preferences.enabled}
          aria-label="Activate expiry alerts"
          onClick={() => handleToggleEnabled(!preferences.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            preferences.enabled ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {preferences.enabled && (
        <>
          {/* Alert Timing Threshold */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              Advance Warning Window
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Advance Warning Days">
              {([1, 2, 3] as ExpiryAlertThreshold[]).map((days) => (
                <button
                  key={days}
                  role="radio"
                  aria-checked={preferences.thresholdDays === days}
                  onClick={() => handleThresholdChange(days)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                    preferences.thresholdDays === days
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  {days} day{days > 1 ? "s" : ""} prior
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              Delivery Channels
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleChannelChange("in_app")}
                className={`p-2.5 text-xs rounded-lg border text-left flex flex-col justify-between ${
                  preferences.channel === "in_app"
                    ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                    : "border-stone-200 dark:border-stone-800 text-stone-600"
                }`}
              >
                <span className="font-medium">In-App Banner</span>
                <span className="text-[10px] text-stone-400 mt-1">Zero permissions</span>
              </button>

              <button
                type="button"
                onClick={() => handleChannelChange("push")}
                disabled={!pushSupported}
                className={`p-2.5 text-xs rounded-lg border text-left flex flex-col justify-between ${
                  preferences.channel === "push"
                    ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                    : "border-stone-200 dark:border-stone-800 text-stone-600"
                } ${!pushSupported ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="font-medium">Web Push</span>
                <span className="text-[10px] text-stone-400 mt-1">
                  {pushSupported ? "Device lockscreen" : "Unsupported"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleChannelChange("both")}
                disabled={!pushSupported}
                className={`p-2.5 text-xs rounded-lg border text-left flex flex-col justify-between ${
                  preferences.channel === "both"
                    ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                    : "border-stone-200 dark:border-stone-800 text-stone-600"
                } ${!pushSupported ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="font-medium">Both</span>
                <span className="text-[10px] text-stone-400 mt-1">Dual reminder</span>
              </button>
            </div>

            {preferences.channel !== "in_app" && permissionState === "denied" && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs rounded-lg border border-amber-200 dark:border-amber-800/50">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span>Web notifications are blocked in your browser settings. In-app alerts remain active.</span>
              </div>
            )}
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Moon className="w-4 h-4 text-stone-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Quiet Hours (No Disturb)
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.quietHours.enabled}
                onChange={(e) => handleQuietHoursToggle(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                aria-label="Enable quiet hours"
              />
            </div>

            {preferences.quietHours.enabled && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="quiet-start" className="block text-[11px] text-stone-500 mb-1">
                    Sleep Start
                  </label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => handleTimeChange("start", e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="quiet-end" className="block text-[11px] text-stone-500 mb-1">
                    Wake End
                  </label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => handleTimeChange("end", e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Alert Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={isSaving}
              className="w-full py-2 px-3 text-xs font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
            >
              Preview Sample Alert
            </button>

            {testAlertPreview && (
              <div className="mt-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                {testAlertPreview}
              </div>
            )}
          </div>
        </>
      )}

      {statusMessage && (
        <div className="text-center text-xs text-stone-500 dark:text-stone-400" role="status">
          {statusMessage}
        </div>
      )}
    </div>
  );
};
