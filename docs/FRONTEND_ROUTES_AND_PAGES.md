# FoodCue Frontend Routes, Navigation & Pages Specification

```text
========================================================================================
PROJECT:               FoodCue (Packaged Food Intelligence & Kitchen Management PWA)
DOCUMENT TITLE:        Frontend Routes, Navigation Mapping & Page Purpose Register
DOCUMENT VERSION:      v1.0 (Production Redesign)
DATE:                  17 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5
STATUS:                Production Complete & Verified
========================================================================================
```

---

## 1. Application Routing Overview

FoodCue operates as a high-performance Single Page Progressive Web Application (PWA). Primary feature routing is managed by state-synchronized view controllers with full browser history support, deep-link capabilities, and offline Service Worker routing.

```
                  ┌──────────────────────────────────────────────┐
                  │              FoodCue App Shell               │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌──────────────┬─────────────────┼────────────────┬──────────────┐
        │              │                 │                │              │
        ▼              ▼                 ▼                ▼              ▼
   [SmartScan]    [My Kitchen]      [Reminders]     [Shopping List]  [Catalogue]
    (Scan/OCR)    (Ledger Pantry)   (Date Tracker)   (Checklist)     (OFF DB)
                                         │
                                         ├───────────────────────────────┐
                                         ▼                               ▼
                                   [My Profile]                   [Privacy & Data]
                                 (Household/Dietary)               (8 Sections)
```

---

## 2. Page Directory & Implementation Register

### 2.1 SmartScan (`tab === "scan"`)
- **Route / Trigger:** Default View (`/` or `SmartScan` nav tab)
- **Component File:** `src/features/smartscan/SmartScan.tsx`
- **Purpose:** Primary multi-modal packaged-food capture and intelligence intake workflow.
- **Modes Supported:**
  1. *Scan with Camera:* Live viewfinder with animated laser reticle, flashlight toggle, camera switching, and auto-barcode detection (`@sec-ant/zxing-wasm`).
  2. *Upload Photo:* Drag-and-drop or gallery file picker with client-side OCR parsing via Web Worker.
  3. *Enter Manually:* GTIN barcode numbers, GS1 Digital Link URLs, or product names with instant Mod-10 check-digit validation.
- **Packaged Presets:** 6 verified Indian packaged food presets (Tata Salt, Parle-G, Amul Butter, Maggi 2-Min Noodles, Quaker Oats, Epigamia Greek Yogurt).
- **Physical Pack Gate:** Strict distinction between *ProductCandidate* and *ConfirmedLabel*. Requires explicit physical pack verification before entering deterministic food intelligence.
- **Auth Requirement:** Completely optional. Works 100% offline and anonymously.

---

### 2.2 My Kitchen (`tab === "kitchen"`)
- **Route / Trigger:** `My Kitchen` nav tab
- **Component File:** `src/features/kitchen/Kitchen.tsx`
- **Purpose:** Household pantry and refrigerator inventory management.
- **Architecture:** Append-only event ledger (`pantryEvents` IndexedDB store) preventing destructive balance overwrites.
- **Event Types:** `add`, `consume`, `adjust`, `move`, `discard`, and compensating `correction` (Undo).
- **Locations:** Filterable by `All`, `Pantry`, `Fridge`, `Freezer`, and `Use Soon`.
- **Household Sharing:** Integrates Clerk Organization Switcher to toggle between personal kitchen and shared family household.
- **Auth Requirement:** Optional for local storage. Clerk account required for multi-member family kitchen sharing.

---

### 2.3 Reminders (`tab === "reminders"`)
- **Route / Trigger:** `Reminders` nav tab
- **Component File:** `src/features/reminders/Reminders.tsx`
- **Purpose:** Date-driven planning and food waste reduction.
- **Date Semantics:** Clearly distinguishes printed expiry dates, best-before dates, and user opened-on dates.
- **Actions:** Mark as consumed, discard, or snooze planning reminders by `+2 days`.
- **Auth Requirement:** Completely optional (stored in local IndexedDB).

---

### 2.4 Shopping List (`tab === "shopping"`)
- **Route / Trigger:** `Shopping List` nav tab
- **Component File:** `src/features/shopping/ShoppingList.tsx`
- **Purpose:** Interactive household grocery shopping list.
- **Features:** Check off items in real-time, manual item addition with quantity and notes, "Add Depleted Items" helper importing stock running low in My Kitchen.
- **Exporting:** Portable export via WhatsApp sharing or CSV file download.
- **Auth Requirement:** Completely optional.

---

### 2.5 Catalogue (`tab === "catalog"`)
- **Route / Trigger:** `Catalogue` nav tab
- **Component File:** `src/features/catalog/CatalogView.tsx`
- **Purpose:** Search and explore verified Indian packaged food products with FSSAI license details, nutrition facts, and mandatory allergen declarations.
- **Action Links:** "Scan This Product" (pre-populates SmartScan) and "Add to Kitchen" (direct inventory entry).
- **Auth Requirement:** Completely optional.

---

### 2.6 Dedicated Privacy Page (`tab === "privacy"`)
- **Route / Trigger:** Accessible via right-side Navbar `Privacy` button, mobile drawer, footer link, and direct settings navigation.
- **Component File:** `src/features/privacy/Privacy.tsx`
- **Mandatory 8 Sections:**
  1. *Privacy at FoodCue:* Local-first and privacy-by-default architecture baseline.
  2. *Local-First Storage:* Browser IndexedDB persistence, storage quota gauge (MB and % used), and browser cache eviction notices.
  3. *Optional Accounts:* Explanation of why accounts are never forced, and that signing in does not silently upload data.
  4. *Multi-Device Cloud Sync:* Transparent disclosure of Neon PostgreSQL in AWS Singapore (`ap-southeast-1`), with manual connection test and sync buttons.
  5. *Camera & Image Privacy:* On-demand webcam permissions; frames decoded locally on-device via WebAssembly; zero photos sent to the cloud.
  6. *External Services:* Full audit of third-party infrastructure (Clerk, Neon, Open Food Facts, Vercel).
  7. *Data Management:* Portable JSON backup export, backup restoration with format validation, and two-step permanent data wipe.
  8. *Contact & Developer Information:* Lead Developer: **Parth Ahuja**.
- **Auth Requirement:** Completely optional.

---

### 2.7 My Profile & Household (`tab === "profile"`)
- **Route / Trigger:** Profile avatar dropdown in Navbar (when signed in) or Mobile Drawer.
- **Component File:** `src/features/profile/ProfileView.tsx`
- **Sections:**
  1. *Account Identity Card:* Displays Clerk avatar, display name, verified email address, and authentication status.
  2. *Household & Family Sharing Card:* Live Clerk `<OrganizationSwitcher />`, active household members counter, and family invitation link.
  3. *Dietary Avoid-List:* Toggleable chip selectors for FSSAI mandatory allergens (Wheat, Milk, Peanuts, Tree Nuts, Soy, Egg, Fish, Shellfish, Sulphites, Mustard) and ingredients to flag (Palm Oil, Added Sugars, MSG, Trans Fats).
  4. *Calm Visual Mode:* Toggle that suppresses bright red danger badges in favour of calm, neutral visual indicators to alleviate food anxiety.
  5. *Sign Out Control:* Secure Clerk session invalidation returning user cleanly to local mode.
- **Auth Requirement:** Available in guest mode (preferences saved to `localStorage`) and authenticated mode (linked with Clerk identity).
