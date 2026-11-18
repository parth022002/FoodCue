# FoodCue — System Architecture Specification

**Document Version:** 2.1 (Authoritative Blueprint)  
**System Type:** Local-First Progressive Web App (PWA) with Hybrid Cloud Synchronization  
**Primary Stack:** React 18, TypeScript 5.7, Vite 6, Tailwind CSS, Dexie (IndexedDB), Neon Serverless PostgreSQL, Clerk Auth, Vercel Serverless  

---

## 1. High-Level Architectural Model

FoodCue employs a **Local-First, Cloud-Assisted Architecture**. All user interactions, product lookups, camera scanning, pantry modifications, and avoid-list evaluations execute immediately against local device state in IndexedDB without waiting for network round-trips.

```text
+---------------------------------------------------------------------------------------+
|                                    CLIENT PWA (BROWSER)                               |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                            Presentation Layer (React 18)                        |  |
|  |  SmartScan Viewfinder | Kitchen View | Shopping List | Search View | Profile    |  |
|  +---------------------------------------+-----------------------------------------+  |
|                                          |                                            |
|  +---------------------------------------v-----------------------------------------+  |
|  |                             Application & Domain Layer                          |  |
|  |  - Health Scoring Algorithm (0-100)       - Allergen & Avoid-List Engine        |  |
|  |  - Barcode Parser (ZXing-Wasm)            - OCR Web Worker (Tesseract.js)       |  |
|  |  - Local FMCG Catalog Manager (500+ packs)- AI Nutrition Agent Orchestration    |  |
|  |  - Event-Sourced Pantry Ledger            - Sync Conflict Resolver (Vector LWW) |  |
|  +---------------------------------------+-----------------------------------------+  |
|                                          |                                            |
|  +---------------------------------------v-----------------------------------------+  |
|  |                          Local Storage Layer (Dexie IndexedDB)                  |  |
|  |  [pantry_items] [pantry_ledger] [fmcg_catalog] [avoid_list] [sync_queue]        |  |
|  +---------------------------------------+-----------------------------------------+  |
+------------------------------------------|--------------------------------------------+
                                           | HTTPS / WebSockets (Optional Cloud Sync)
+------------------------------------------v--------------------------------------------+
|                              SERVERLESS BACKEND & CLOUD (VERCEL)                      |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                         Vercel Serverless API Handlers (Node 20+)               |  |
|  |  /api/health | /api/me | /api/devices | /api/sync/* | /api/notifications/*      |  |
|  +---------------------------------------+-----------------------------------------+  |
|                                          |                                            |
|  +---------------------------------------v-----------------------------------------+  |
|  |                            Authentication & External Services                   |  |
|  |  - Clerk Auth (User & Org tokens)        - Open Food Facts (GTIN API mirror)   |  |
|  |  - Svix Webhook Verification             - Tavily AI Search (Web Intelligence) |  |
|  |  - Groq Cloud (Whisper / Llama)          - OpenRouter (Vision OCR fallback)    |  |
|  +---------------------------------------+-----------------------------------------+  |
|                                          |                                            |
|  +---------------------------------------v-----------------------------------------+  |
|  |                        Relational Cloud Database (Neon PostgreSQL)              |  |
|  |  Serverless Pooled (pgBouncer) & Unpooled Compute | 15 Relational Tables       |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Subsystems

### 2.1 SmartScan & On-Device OCR Pipeline
1. **Camera Stream Capture:** Managed via `SmartScanViewfinder.tsx` using `navigator.mediaDevices.getUserMedia`. Provides hardware torch toggle, optical/digital zoom slider, camera switching, and tap-to-focus indicator.
2. **ZXing-Wasm Barcode Engine:** Detects EAN-13, EAN-8, UPC-A, and GS1-128 codes continuously on a background canvas at $\le 100\text{ms}$ per frame.
3. **Non-Blocking OCR Worker:**
   - Captured packaging image is routed to `ocrWorker.ts` in a dedicated Web Worker.
   - Preprocessing includes grayscale conversion, adaptive Otsu binarization, CLAHE (Contrast Limited Adaptive Histogram Equalization), and noise reduction.
   - Tesseract.js generates recognized text blocks with bounding boxes and confidence scores.
4. **Vision AI Fallback (OpenRouter):** When local OCR confidence is $< 60\%$ (e.g. crumpled foil packaging or faint expiration stamps), the client can invoke `/api/ocr-assist` backed by `meta-llama/llama-3.2-11b-vision-instruct:free` to transcribe text strictly without making safety claims.

### 2.2 Product Resolution Hierarchy
When a barcode or query is scanned:
1. **Tier 1 (Instant Offline):** Looked up in `fmcgCatalogManager.ts` (local IndexedDB cache of 500+ curated Indian FMCG products). Instant hit $< 5\text{ms}$.
2. **Tier 2 (Open Food Facts):** If absent locally, queried against Open Food Facts API (`https://world.openfoodfacts.org/api/v2/product/{gtin}.json`) with a compliant user-agent.
3. **Tier 3 (Tavily AI Search):** If missing from Open Food Facts, queried against Tavily AI Search API for verified Indian grocery packaging data.
4. **Tier 4 (Manual Custom Entry):** User can fill in nutrient details or confirm OCR predictions. Confirmed labels are stored locally and optionally contributed back.

### 2.3 Pantry Event Ledger & Append-Only State
The pantry inventory is not stored as mutable rows; it is maintained as an **append-only event ledger** (`pantryLedger.ts`):
- Events: `ITEM_ADDED`, `ITEM_CONSUMED`, `ITEM_DISCARDED`, `ITEM_EXPIRED`, `ITEM_UPDATED`.
- Each event contains: `eventId`, `itemId`, `userId`, `householdId`, `eventType`, `payload`, `timestamp`, `vectorClock`.
- Current inventory state is computed deterministically by reducing the event stream. This guarantees complete auditability, undo operations, and clean multi-device replication.

### 2.4 Cloud Synchronization & Conflict Resolution
- **Offline Sync Queue:** When offline, any pantry or shopping list action writes to `sync_queue` in Dexie.
- **Push Pipeline (`POST /api/sync/push`):** When connectivity is restored, the queue flushes batches of events to Neon PostgreSQL.
- **Pull Pipeline (`POST /api/sync/pull`):** Fetches changes committed by other household devices since the last known sequence number (`lastSyncedSeq`).
- **Conflict Resolution (Vector Clock + LWW):**
  - If two household devices modify the same item concurrently while partitioned, FoodCue resolves edits using vector clocks.
  - If vector clocks are concurrent (divergent), Last-Write-Wins (LWW) with deterministic tie-breaking (lexicographical sorting of device IDs) ensures all devices converge to the exact same state.

### 2.5 Multi-Tenant Household Collaboration (Clerk Organizations)
- A **Household** in FoodCue maps 1:1 to a Clerk Organization.
- **Data Scoping:** Every synchronized pantry event and shopping list record contains a `household_id` foreign key.
- **Tenant Isolation:** Serverless API queries enforce `WHERE household_id = :authenticated_user_org_id`. Cross-household data leaks are strictly prevented at the database and API authorization boundaries.
- **Avoid-List Aggregation:** In Household Mode, the avoid-list engine merges the allergies and dietary restrictions of **all active household members**, ensuring family meals are safe for everyone in the home.

### 2.6 Web Push Expiration Notification Architecture
- Built on the standard **W3C Web Push Protocol** and **VAPID**.
- Client registers a service worker (`sw.js`) and sends its push subscription object to `POST /api/notifications/subscribe`.
- Nightly cron or client-triggered checks inspect pantry expiration dates.
- Expiring items ($\le 3$ days) trigger push notifications with deep links to the affected items.
