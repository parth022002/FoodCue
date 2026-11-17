# FoodCue Technical Report: Web Push Notifications for Expiring Food (Milestone 4)

**Project:** FoodCue  
**Tagline:** Know your food. Manage your kitchen.  
**Phase:** Step 7-10 Master Product Completion  
**Milestone:** 4 — Web Push Notifications & In-App Expiry Reminders  
**Status:** Implemented, Integrated, and Verified  
**Date:** 2026-11-17  

---

## 1. Executive Summary

Milestone 4 delivers an intelligent, non-intrusive expiry notification system for FoodCue. Designed under privacy-first and INR 0 financial constraints, the solution pairs browser-native **Web Push Notifications** (via Service Worker `PushManager` and VAPID) with a resilient **In-App Gentle Alert Fallback**. Domestic consumers receive actionable, timely warnings before perishable food reaches its expiry date without exposing their pantry contents or identity to third-party ad networks.

---

## 2. Notification Architecture

```
                                 [ FoodCue Kitchen Items ]
                                            │
                                            ▼
                           ┌──────────────────────────────────┐
                           │   Notification Service Engine    │
                           │  - Quiet Hours Evaluator         │
                           │  - Threshold Filter (1/2/3 days) │
                           │  - Severity Scoring              │
                           └──────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
        [ Web Push Permitted? ]                         [ In-App Fallback ]
                     │                                             │
           YES ──────┴────── NO                                    │
            │                 │                                    │
            ▼                 ▼                                    ▼
    ┌───────────────┐  ┌───────────────┐                   ┌───────────────┐
    │ PushManager   │  │ Browser Alert │                   │ Calm Banner   │
    │ Registration  │  │ Suppressed    │                   │ & Badge UI    │
    └───────────────┘  └───────────────┘                   └───────────────┘
            │
            ▼
    ┌───────────────┐
    │ Service Worker│
    │  (public/sw)  │ ──> showNotification() ──> [ Lockscreen / Notification Centre ]
    └───────────────┘
```

---

## 3. Core Components

### 3.1 Service Worker (`public/sw.js`)
- **`push` Listener:** Parses incoming push payloads containing `title`, `body`, `icon`, `tag`, and `data.url`. Configures `renotify: true` and fallback messaging.
- **`notificationclick` Listener:** Closes notification, queries existing client windows, focuses the active FoodCue instance, or navigates cleanly to the item view via `clients.openWindow()`.

### 3.2 Notification Service (`src/adapters/notifications/notificationService.ts`)
- **Permission & Capability Probing:** Determines support across `Notification`, `PushManager`, and `serviceWorker`.
- **Calendar-Day Calculation:** `calculateDaysRemaining()` normalizes reference and target dates to midnight for exact integer day difference.
- **Quiet Hours Enforcement:** `isWithinQuietHours()` supports both overnight windows (e.g., `22:00` to `08:00`) and daytime windows (e.g., `13:00` to `15:00`), suppressing audio/visual alerts during rest hours.
- **Urgency Scoring:**
  - `days < 0`: `critical` ("Expired $N$ days ago")
  - `days == 0`: `critical` ("Expires today")
  - `days == 1`: `warning` ("Expires tomorrow")
  - `days >= 2`: `advisory` ("Expires in $N$ days")
- **Zero-Leak Persistence:** Stores user preferences (`thresholdDays`, `quietHours`, `channel`) locally in IndexedDB `settings` store under `notification_preferences`.

### 3.3 Serverless Subscription Management (`api/notifications/subscribe.js`)
- Authored in `src/server/endpoints/notificationsSubscribe.ts` and bundled with esbuild.
- `POST /api/notifications/subscribe`: Accepts and validates browser push endpoint and cryptographic keys (`p256dh`, `auth`).
- Persists subscription in Neon PostgreSQL `foodcue_push_subscriptions` with optional Clerk user ID mapping or anonymous tenant key.
- `DELETE /api/notifications/subscribe`: Cleans up revoked push endpoints.

### 3.4 Accessible UI Controls (`src/features/pantry/ExpiryReminderSettings.tsx`)
- **Master Toggle:** Custom accessible toggle with `role="switch"` and `aria-checked`.
- **Warning Window Selector:** Radio group offering 1, 2, or 3 days advance warning.
- **Delivery Channel Selection:** Allows user to select between In-App Banner, Web Push, or Both.
- **Quiet Hours Time Pickers:** Accessible inputs for start and end times.
- **Sample Alert Preview:** Instant visual preview of how notifications will render.

---

## 4. Privacy, Safety, and Financial Guarantees

1. **INR 0 Cash Expenditure:** Built entirely on standard W3C Push API and VAPID. Zero third-party paid notification services (e.g., OneSignal, Twilio) required.
2. **Local Evaluation:** In-app alerts are evaluated directly inside the browser using IndexedDB pantry ledger events. Expiry dates are never transmitted to external telemetry servers.
3. **No Intrusive Spam:** Default threshold is locked at 2 days prior to expiry with compulsory quiet hours.

---

## 5. Verification Evidence

- `test/adapters/notificationService.test.ts`:
  - `retrieves default notification preferences when none are saved`: **PASSED**
  - `saves and updates notification preferences in IndexedDB`: **PASSED**
  - `accurately detects overnight and same-day quiet hours`: **PASSED**
  - `calculates exact calendar days remaining until expiry`: **PASSED**
  - `evaluates expiring pantry items and generates structured alerts within warning threshold`: **PASSED**
  - `suppresses alerts during quiet hours to avoid disruptive notifications`: **PASSED**
  - `returns zero alerts when notification master switch is disabled`: **PASSED**
- Total passing tests: **208 automated tests passing**, 0 errors.
