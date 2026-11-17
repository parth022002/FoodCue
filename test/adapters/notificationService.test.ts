import { beforeEach, describe, expect, it } from "vitest";
import { clearFoodCueData } from "../../src/adapters/storage/database";
import {
  calculateDaysRemaining,
  evaluateExpiringPantryItems,
  getNotificationPreferences,
  isWithinQuietHours,
  saveNotificationPreferences,
  type ExpiringFoodItem,
  type NotificationPreferences
} from "../../src/adapters/notifications/notificationService";

describe("Milestone 4: Web Push & In-App Expiry Notification Service", () => {
  beforeEach(async () => {
    await clearFoodCueData();
  });

  it("retrieves default notification preferences when none are saved", async () => {
    const prefs = await getNotificationPreferences();
    expect(prefs.enabled).toBe(false);
    expect(prefs.thresholdDays).toBe(2);
    expect(prefs.channel).toBe("in_app");
    expect(prefs.quietHours.enabled).toBe(true);
    expect(prefs.quietHours.start).toBe("22:00");
    expect(prefs.quietHours.end).toBe("08:00");
  });

  it("saves and updates notification preferences in IndexedDB", async () => {
    const updated = await saveNotificationPreferences({
      enabled: true,
      thresholdDays: 3,
      channel: "both"
    });

    expect(updated.enabled).toBe(true);
    expect(updated.thresholdDays).toBe(3);
    expect(updated.channel).toBe("both");

    const reloaded = await getNotificationPreferences();
    expect(reloaded.enabled).toBe(true);
    expect(reloaded.thresholdDays).toBe(3);
    expect(reloaded.channel).toBe("both");
  });

  it("accurately detects overnight and same-day quiet hours", () => {
    // 23:30 is inside 22:00 -> 08:00 overnight range
    const lateNight = new Date("2026-11-17T23:30:00");
    expect(isWithinQuietHours(lateNight, "22:00", "08:00")).toBe(true);

    // 04:15 is inside 22:00 -> 08:00 overnight range
    const earlyMorning = new Date("2026-11-17T04:15:00");
    expect(isWithinQuietHours(earlyMorning, "22:00", "08:00")).toBe(true);

    // 14:00 is outside 22:00 -> 08:00 overnight range
    const afternoon = new Date("2026-11-17T14:00:00");
    expect(isWithinQuietHours(afternoon, "22:00", "08:00")).toBe(false);

    // Same-day afternoon quiet hours (e.g. 13:00 -> 15:00)
    expect(isWithinQuietHours(afternoon, "13:00", "15:00")).toBe(true);
    expect(isWithinQuietHours(earlyMorning, "13:00", "15:00")).toBe(false);
  });

  it("calculates exact calendar days remaining until expiry", () => {
    const ref = new Date("2026-11-17T10:00:00");

    // Same day expiry
    expect(calculateDaysRemaining("2026-11-17", ref)).toBe(0);

    // Tomorrow expiry
    expect(calculateDaysRemaining("2026-11-18", ref)).toBe(1);

    // 3 days later
    expect(calculateDaysRemaining("2026-11-20", ref)).toBe(3);

    // Expired yesterday
    expect(calculateDaysRemaining("2026-11-16", ref)).toBe(-1);
  });

  it("evaluates expiring pantry items and generates structured alerts within warning threshold", () => {
    const ref = new Date("2026-11-17T12:00:00"); // 12 PM (outside quiet hours)

    const pantryItems: ExpiringFoodItem[] = [
      { id: "item-1", name: "Amul Taaza Milk", brand: "Amul", expiryDate: "2026-11-18" }, // 1 day
      { id: "item-2", name: "Mother Dairy Paneer", brand: "Mother Dairy", expiryDate: "2026-11-19" }, // 2 days
      { id: "item-3", name: "Aashirvaad Atta", brand: "Aashirvaad", expiryDate: "2026-12-30" }, // 43 days
      { id: "item-4", name: "Yogurt Cup", brand: "Epigamia", expiryDate: "2026-11-16" } // expired -1 day
    ];

    const prefs: NotificationPreferences = {
      enabled: true,
      thresholdDays: 2,
      channel: "in_app",
      quietHours: { enabled: true, start: "22:00", end: "08:00" }
    };

    const alerts = evaluateExpiringPantryItems(pantryItems, prefs, ref);

    // Items within threshold: item-4 (-1 day), item-1 (1 day), item-2 (2 days)
    // Item-3 is 43 days away -> excluded
    expect(alerts.length).toBe(3);

    // Sorted by urgency: most urgent first
    expect(alerts[0].itemId).toBe("item-4");
    expect(alerts[0].severity).toBe("critical");
    expect(alerts[0].dueText).toContain("Expired");

    expect(alerts[1].itemId).toBe("item-1");
    expect(alerts[1].severity).toBe("warning");
    expect(alerts[1].dueText).toBe("Expires tomorrow");

    expect(alerts[2].itemId).toBe("item-2");
    expect(alerts[2].severity).toBe("advisory");
    expect(alerts[2].dueText).toBe("Expires in 2 days");
  });

  it("suppresses alerts during quiet hours to avoid disruptive notifications", () => {
    const quietTime = new Date("2026-11-17T23:30:00"); // 11:30 PM (inside quiet hours)

    const pantryItems: ExpiringFoodItem[] = [
      { id: "item-1", name: "Amul Taaza Milk", expiryDate: "2026-11-18" }
    ];

    const prefs: NotificationPreferences = {
      enabled: true,
      thresholdDays: 2,
      channel: "both",
      quietHours: { enabled: true, start: "22:00", end: "08:00" }
    };

    const alerts = evaluateExpiringPantryItems(pantryItems, prefs, quietTime);
    expect(alerts.length).toBe(0);
  });

  it("returns zero alerts when notification master switch is disabled", () => {
    const dayTime = new Date("2026-11-17T12:00:00");
    const pantryItems: ExpiringFoodItem[] = [
      { id: "item-1", name: "Amul Taaza Milk", expiryDate: "2026-11-17" }
    ];

    const prefs: NotificationPreferences = {
      enabled: false,
      thresholdDays: 2,
      channel: "in_app",
      quietHours: { enabled: false, start: "22:00", end: "08:00" }
    };

    const alerts = evaluateExpiringPantryItems(pantryItems, prefs, dayTime);
    expect(alerts.length).toBe(0);
  });
});
