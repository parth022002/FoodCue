/**
 * Web Push and In-App Expiry Notification Service
 * FoodCue Phase 7-10 Master Product Completion (Milestone 4)
 *
 * Provides Web Push registration via PushManager, fallback in-app reminder evaluation,
 * quiet hours filtering, and zero-leak local preference storage in IndexedDB.
 */

import { getRecord, putRecord } from "../storage/database";

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";
export type ExpiryAlertThreshold = 1 | 2 | 3; // days before expiry

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // "HH:MM" e.g. "22:00"
  end: string;   // "HH:MM" e.g. "08:00"
}

export interface NotificationPreferences {
  enabled: boolean;
  thresholdDays: ExpiryAlertThreshold;
  channel: "push" | "in_app" | "both";
  quietHours: QuietHoursConfig;
  lastCheckedAt?: string;
}

export interface ExpiringFoodItem {
  id: string;
  name: string;
  brand?: string;
  expiryDate: string; // ISO date string "YYYY-MM-DD"
  quantity?: number;
  unit?: string;
}

export interface ExpiryReminderAlert {
  itemId: string;
  name: string;
  brand?: string;
  daysRemaining: number;
  severity: "critical" | "warning" | "advisory";
  title: string;
  message: string;
  dueText: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  thresholdDays: 2,
  channel: "in_app",
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00"
  }
};

const SETTINGS_KEY = "notification_preferences";

/**
 * Checks whether Web Push and Service Worker PushManager are supported in the current environment
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Returns the current Notification permission status
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Requests browser permission for notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isPushSupported()) {
    return "unsupported";
  }
  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationPermissionState;
  } catch {
    return "denied";
  }
}

/**
 * Subscribes to Web Push using the Service Worker's PushManager
 */
export async function subscribeToPush(vapidPublicKey?: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration.pushManager) {
    return null;
  }

  // Check if subscription already exists
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    return subscription;
  }

  const options: PushSubscriptionOptionsInit = {
    userVisibleOnly: true
  };

  if (vapidPublicKey) {
    options.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  }

  subscription = await registration.pushManager.subscribe(options);
  return subscription;
}

/**
 * Unsubscribes from Web Push
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads notification preferences from IndexedDB settings store
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const rec = await getRecord<{ key: string; value: NotificationPreferences }>("settings", SETTINGS_KEY);
    if (rec?.value) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...rec.value };
    }
  } catch {
    // Fallback to defaults
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Persists notification preferences into IndexedDB settings store
 */
export async function saveNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences();
  const updated: NotificationPreferences = {
    ...current,
    ...prefs,
    quietHours: {
      ...current.quietHours,
      ...(prefs.quietHours || {})
    }
  };

  try {
    await putRecord("settings", {
      key: SETTINGS_KEY,
      value: updated,
      updatedAt: new Date().toISOString()
    });
  } catch {
    // Fallback gracefully
  }

  return updated;
}

/**
 * Tests whether a given timestamp falls inside the configured quiet hours
 */
export function isWithinQuietHours(date: Date, startStr: string, endStr: string): boolean {
  const [startHour = 22, startMin = 0] = startStr.split(":").map((v) => parseInt(v, 10));
  const [endHour = 8, endMin = 0] = endStr.split(":").map((v) => parseInt(v, 10));

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = (startHour ?? 22) * 60 + (startMin || 0);
  const endMinutes = (endHour ?? 8) * 60 + (endMin || 0);

  if (startMinutes > endMinutes) {
    // Overnight quiet hours (e.g. 22:00 to 08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Same-day quiet hours (e.g. 13:00 to 15:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Calculates days remaining from today (at midnight) to expiry date
 */
export function calculateDaysRemaining(expiryDateStr: string, referenceDate: Date = new Date()): number {
  const parts = expiryDateStr.split("-").map((v) => parseInt(v, 10));
  const year = parts[0] ?? referenceDate.getFullYear();
  const month = parts[1] ?? (referenceDate.getMonth() + 1);
  const day = parts[2] ?? referenceDate.getDate();

  const expiryDay = new Date(year, month - 1, day, 0, 0, 0, 0);

  const refDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  );

  const diffMs = expiryDay.getTime() - refDay.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates a list of pantry items against the user's notification preferences
 * Returns high-priority gentle reminders respecting quiet hours
 */
export function evaluateExpiringPantryItems(
  items: ExpiringFoodItem[],
  preferences: NotificationPreferences,
  referenceTime: Date = new Date()
): ExpiryReminderAlert[] {
  if (!preferences.enabled) {
    return [];
  }

  // Check quiet hours
  if (
    preferences.quietHours.enabled &&
    isWithinQuietHours(referenceTime, preferences.quietHours.start, preferences.quietHours.end)
  ) {
    return [];
  }

  const alerts: ExpiryReminderAlert[] = [];

  for (const item of items) {
    if (!item.expiryDate) continue;

    const days = calculateDaysRemaining(item.expiryDate, referenceTime);

    if (days <= preferences.thresholdDays) {
      let severity: ExpiryReminderAlert["severity"] = "advisory";
      let dueText = `Expires in ${days} days`;

      if (days < 0) {
        severity = "critical";
        dueText = `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
      } else if (days === 0) {
        severity = "critical";
        dueText = "Expires today";
      } else if (days === 1) {
        severity = "warning";
        dueText = "Expires tomorrow";
      }

      const title =
        days <= 0
          ? `FoodCue Alert: ${item.name} has reached expiry`
          : `FoodCue Reminder: ${item.name} ${dueText.toLowerCase()}`;

      const message = `${item.brand ? item.brand + " " : ""}${item.name} (${dueText}). Plan your meals or use promptly.`;

      alerts.push({
        itemId: item.id,
        name: item.name,
        brand: item.brand,
        daysRemaining: days,
        severity,
        title,
        message,
        dueText
      });
    }
  }

  // Sort: most urgent first (negative/zero days first)
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Helper to convert URL-safe base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
