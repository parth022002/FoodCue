# FoodCue — Features & User Journeys Specification

This document details the complete set of user journeys, application routes, and interactive UI views supported by FoodCue.

---

## 1. Application Navigation & Routes

FoodCue is structured around 5 core navigation views accessible from the top navbar and mobile bottom navigation bar:

| Route Path | View Component | Description | Access Mode |
|---|---|---|---|
| `/` | `GuestHome` / `AuthenticatedHome` | Dynamic homepage: Hero search and scan CTA for guests; quick pantry summary and alerts for signed-in users. | Public / Hybrid |
| `/scan` | `SmartScanViewfinder` | Camera viewfinder with barcode detection, OCR text extraction, torch, zoom, and photo fallback. | Public |
| `/search` | `InternetProductSearch` | Search 500+ Indian FMCG catalog items or live OpenFoodFacts/Tavily web database with filter chips. | Public |
| `/kitchen` | `KitchenPantryView` | Active pantry inventory, categorized by storage location (Fridge, Pantry, Freezer) and expiration status. | Public (Local) / Cloud |
| `/shopping` | `ShoppingListView` | Collaborative grocery shopping list with replenishment suggestions and check-off actions. | Public (Local) / Cloud |
| `/catalogue` | `UserCatalogueView` | Personal private product catalogue saved by the user with custom notes and verified nutrition. | Signed-In |
| `/profile` | `ProfileView` | Dietary avoid-list management, allergen settings, household switching, and cloud sync status. | Public (Local) / Cloud |

---

## 2. Core End-to-End User Journeys

### Journey A: Guest Discovery & Instant Scan (Zero-Account)
1. **Entry:** User opens FoodCue on mobile or desktop without an account.
2. **Scan/Search:** User clicks **Scan** to open `SmartScanViewfinder` or searches for `"Amul Butter"` in `InternetProductSearch`.
3. **Instant Intelligence:** Barcode is decoded in $<100\text{ms}$. Health score (e.g. 52/100) and nutritional panel render immediately.
4. **Local Pantry Logging:** User clicks *"Add to My Kitchen"*. Item is stored in local IndexedDB.
5. **Privacy Gate:** The guest user's data remains 100% on their device. No cloud sync requests are triggered.

### Journey B: Registered User, Allergen Avoid-List & Private Catalogue
1. **Sign-In:** User clicks **Sign In** via Clerk (Email, Google, or Phone).
2. **Profile Configuration:** User sets their personal avoid-list (e.g., selects `Peanuts`, `Gluten`, `Artificial Colors`).
3. **Scan with Conflict Warning:** User scans a biscuit pack containing wheat gluten.
4. **Alert:** FoodCue renders an impossible-to-miss red alert banner: `⚠️ ALLERGEN CONFLICT DETECTED: Contains Gluten`.
5. **Private Catalogue:** User marks the product as *"Reviewed"* and adds it to their private saved catalogue with a personal rating and notes.

### Journey C: Kitchen Expiration & Web Push Alerting
1. **Pantry Logging:** User logs a milk carton with expiration date set to 2 days ahead.
2. **Expiration Classification:** Pantry dashboard displays the item in the **Expiring Soon** tab with an amber badge.
3. **Web Push Subscription:** User grants browser notification permissions.
4. **Background Alert:** The VAPID Web Push worker triggers a notification: *"FoodCue Alert: Amul Milk expires in 2 days. Consider consuming or freezing."*
5. **Action:** User taps the notification, opening FoodCue directly to the item, and clicks *"Consumed"*. The pantry ledger updates atomically.

### Journey D: Multi-Member Household Kitchen Sharing
1. **Household Creation:** User creates a Household in Clerk Organizations: *"The Sharma Family Kitchen"*.
2. **Family Member Invite:** User invites their spouse or roommate via email.
3. **Shared Inventory:** Both members switch to the *"Sharma Family"* organization in the topbar dropdown.
4. **Collaborative Action:** Member A marks 1 kg sugar as consumed at home.
5. **Real-Time Sync:** Member B at the supermarket checks the shared Shopping List; sugar is automatically listed under *"Needed Items"*. Member B buys sugar, checks it off, and it returns to the shared pantry.
6. **Multi-Tenant Security:** Household A's items are cryptographically and query-isolated from Household B in Neon PostgreSQL.

### Journey E: Offline PWA Resilience & Conflict Resolution
1. **Offline Grocery Run:** User enters a basement supermarket with zero mobile connectivity.
2. **Offline Detection:** FoodCue displays the amber badge: `Offline Mode — Local Cache Active`.
3. **Offline Scanning:** User scans barcodes against the local 500+ Indian FMCG database. Items are added to the local pantry.
4. **Sync Queue:** Operations are buffered in the Dexie `sync_queue` table.
5. **Reconnection:** Upon exiting the supermarket, connectivity returns. FoodCue automatically replays queued operations to the Neon serverless endpoint (`POST /api/sync/push`) with deterministic vector clock conflict resolution.
