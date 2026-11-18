# FoodCue — Product Requirements Document (PRD)

**Product Name:** FoodCue  
**Tagline:** *Know your food. Manage your kitchen.*  
**Architecture:** Local-first Progressive Web App (PWA) with optional Neon Serverless PostgreSQL sync and Clerk Authentication  
**Budget Baseline:** INR 0.00 cash expenditure (all features run within free/open tiers)  
**Primary Market:** Indian urban and semi-urban households  

---

## 1. Executive Summary & Vision

Packaged food consumption in India is growing rapidly, but consumers face two major challenges:
1. **Opaque Nutrition & Allergen Information:** Microscopic ingredient lists, misleading health claims on front-of-pack labels, and unclear additive codes.
2. **Kitchen Grocery Waste & Disorganization:** Over-purchasing, forgotten pantry items, expired groceries, and lack of coordination between household members.

**FoodCue solves both:**
- **Instant Product Intelligence:** Scan a barcode or food packaging to see a transparent 0–100 Health Score, clean nutrient breakdowns per 100g/serving, flagged ultra-processed additives, and personalized allergen conflict warnings.
- **Smart Kitchen & Pantry Management:** Track refrigerator and pantry inventory, log expiration dates, receive proactive web push warnings before food spoils, and share live inventory and shopping lists across family members in a single Household.

---

## 2. Core Product Principles

### 2.1 Local-First & Zero-Account Guarantee
- Any user opening FoodCue can scan barcodes, run camera OCR, search 500+ Indian FMCG products, calculate health scores, and maintain a personal pantry entirely in client-side **IndexedDB (Dexie)** without signing in or providing personal information.
- Sign-in via Clerk is **100% optional** and only required for multi-device cloud synchronization and family household sharing.

### 2.2 Deterministic Food Safety (Fail-Closed)
- Nutrition information must never be hallucinated or guessed by LLMs.
- If a nutrient (e.g. sodium or added sugar) is not declared on the package or database, it is preserved strictly as `null` with clear UI provenance (`"Not declared on packaging"`), rather than assumed as 0.
- When an ingredient matches a user's avoid-list (allergens or dietary preferences), FoodCue triggers a high-visibility warning banner that cannot be bypassed silently.

### 2.3 Zero Camera Image Retention
- Camera stream frames and packaging photos captured in SmartScan are processed in-memory via temporary HTML5 Canvas elements.
- **Images are never uploaded, stored on servers, or retained in persistent storage.** Only extracted text strings and barcode GTINs are processed locally.

### 2.4 INR 0.00 Financial Target
- The application architecture relies strictly on free/open-source tiers:
  - Frontend: Vercel Free Hobby Tier
  - Cloud Database: Neon PostgreSQL Free Tier (0.5 GiB storage, serverless compute)
  - Authentication: Clerk Free Tier (10,000 MAUs)
  - Barcode Data: Local verified Indian FMCG dataset (500+ items) + Open Food Facts (ODbL open data)
  - AI Inference: Groq Cloud Free Tier & OpenRouter Free Tier models
  - Web Search: Tavily API Free Tier

---

## 3. User Personas

| Persona | Description | Primary Needs |
|---|---|---|
| **Health-Conscious Shopper (25–40)** | Buys packaged snacks for themselves and family; reads labels but struggles with hidden sugars and INS additives. | Instant health scores, simple traffic light warnings, additive explanations, sugar-to-calorie ratio. |
| **Allergy-Vulnerable Consumer (10–70)** | Suffering from lactose intolerance, gluten allergy, nut allergy, or following Jain / vegan diets. | Fail-closed allergen warnings, automatic ingredient cross-checking against personal avoid-lists. |
| **Household Kitchen Manager (30–65)** | Manages kitchen inventory, grocery buying, and cooking for a multi-member family. | Expiration alerts before food spoils, collaborative shopping lists, shared household pantry ledger. |

---

## 4. Key Functional Modules

```text
+---------------------------------------------------------------------------------+
|                                    FOODCUE PWA                                  |
+------------------------+-------------------------------+------------------------+
| 1. Product Intelligence| 2. Kitchen Management         | 3. Household Sharing   |
| - Barcode Scanner      | - Pantry Event Ledger         | - Multi-tenant scoping |
| - On-Device Tesseract  | - Expiration Date Tracking    | - Shared pantry view   |
| - 0-100 Health Score   | - Web Push Spoiled Alerts     | - Family avoid-list    |
| - Allergen Matching    | - Replenishment Shopping List | - Live Cloud Sync      |
+------------------------+-------------------------------+------------------------+
```

### Module 1: Product Scanning & Intelligence
- **SmartScan Viewfinder:** Mobile camera interface featuring torch toggle, optical/digital zoom slider, camera switcher (rear/front), and tap-to-focus indicator.
- **Barcode Engine:** ZXing-Wasm scanning standard EAN-13, EAN-8, UPC-A, and GS1-128 barcodes in sub-100ms.
- **On-Device OCR Web Worker:** Tesseract.js running in a non-blocking background worker with adaptive binarization, CLAHE contrast enhancement, and noise filtering.
- **Multi-Tier Product Resolver:**
  1. Local Verified Indian FMCG Catalog (`fmcgCatalogManager.ts` — 500+ items).
  2. Open Food Facts API (Global open database with Indian mirror).
  3. Tavily AI Web Search (Real-time web search fallback for Indian grocery products).
  4. User Custom Food Entry (User can edit, save, and confirm labels).

### Module 2: Health & Safety Engine
- **Health Score Algorithm (0–100):** Deterministic nutritional scoring penalizing high energy density, saturated fats, sugars, and sodium, while rewarding dietary fiber, proteins, and micronutrients.
- **Allergen & Avoid-List Engine:** Automatic text matching against top 14 allergens (Peanuts, Tree nuts, Milk, Gluten, Soy, Eggs, Fish, Shellfish, etc.) and dietary filters (Vegetarian, Vegan, Jain, Halal).

### Module 3: Kitchen & Pantry Management
- **Event-Sourced Pantry Ledger:** Tracks items through append-only events: `ITEM_ADDED`, `ITEM_CONSUMED`, `ITEM_DISCARDED`, `ITEM_EXPIRED`, `ITEM_UPDATED`.
- **Expiration Warning Engine:** Classifies inventory into `Fresh`, `Expiring Soon` ($\le 3$ days), and `Expired`.
- **Web Push Notifications:** Service Worker background notifications alerting users when pantry food is near expiration.
- **Replenishment Shopping List:** Automatically suggests items to buy when consumed or expired.

### Module 4: Cloud Sync & Multi-Device Sharing
- **Offline Sync Queue:** Client-side queue buffers operations during network outages and replays them upon reconnection.
- **Vector Clock & LWW Conflict Resolution:** Deterministic merge resolves concurrent edits between devices.
- **Household Organizations:** Clerk Organizations map to shared households in Neon PostgreSQL with row-level tenant isolation.
