# FoodCue — External Integrations Technical Guide

FoodCue interfaces with several external APIs and services to deliver offline-first nutritional intelligence, packaging OCR fallback, and multi-device cloud synchronization.

---

## 1. Open Food Facts (GTIN Metadata Fallback)

### 1.1 Purpose & Role
When a scanned barcode (EAN-13, EAN-8, UPC-A) is not found in FoodCue's local curated Indian FMCG database (Tier 1), the system queries the **Open Food Facts** global open database (Tier 2).

### 1.2 Endpoint & Licensing Compliance
- **Endpoint:** `https://world.openfoodfacts.org/api/v2/product/{gtin}.json`
- **Authentication:** None required (Public Open Database).
- **Mandatory User-Agent:**
  ```http
  User-Agent: FoodCue-PWA/1.0 (contact: parth022002@github.com)
  ```
- **License Compliance (ODbL):** Product data retrieved from Open Food Facts is licensed under the Open Database License (ODbL). Any crowd-sourced nutritional corrections submitted by users to the public commons remain ODbL compliant.

### 1.3 Field Mapping & Schema Normalization
Defined in `src/integrations/openfoodfacts/openFoodFactsMapper.ts`:
- `product.product_name` $\rightarrow$ `productName`
- `product.brands` $\rightarrow$ `brand`
- `product.nutriments['energy-kcal_100g']` $\rightarrow$ `nutrients.energy`
- `product.nutriments.proteins_100g` $\rightarrow$ `nutrients.protein`
- `product.nutriments.carbohydrates_100g` $\rightarrow$ `nutrients.carbs`
- `product.nutriments.sugars_100g` $\rightarrow$ `nutrients.sugar`
- `product.nutriments['saturated-fat_100g']` $\rightarrow$ `nutrients.saturatedFat`
- `product.nutriments.sodium_100g` $\rightarrow$ `nutrients.sodium`
- `product.ingredients_text` $\rightarrow$ `ingredients`
- `product.allergens_tags` $\rightarrow$ `allergens`

Missing nutrients are preserved strictly as `null` (never assumed as 0).

---

## 2. Tavily AI Search (Web Product Intelligence)

### 2.1 Purpose & Role
Acts as **Tier 3 Fallback** when both the local FMCG catalog and Open Food Facts lack data for an Indian packaged grocery item.

### 2.2 Integration Details
- **Endpoint:** `https://api.tavily.com/search`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer process.env.TAVILY_API_KEY`
- **Implementation:** `src/domain/services/aiNutritionAgents.ts` (`searchWebIntelligence(query)`).
- **Features:** Clean, ad-free search optimized for AI agents. Extracts published nutritional panels and ingredient statements from manufacturer websites and verified Indian grocery portals.

---

## 3. Groq Cloud AI (High-Speed Inference & Audio Transcription)

### 3.1 Purpose & Role
Provides sub-second voice transcription for hands-free kitchen pantry logging and rapid conversational nutrition intelligence.

### 3.2 Integration Details
- **Base URL:** `https://api.groq.com/openai/v1`
- **Authentication:** `Bearer process.env.GROQ_API_KEY`
- **Adapter:** `src/adapters/ai/groqService.ts`
- **Active Models:**
  - `whisper-large-v3-turbo`: Audio transcription for kitchen voice commands.
  - `openai/gpt-oss-20b`: High-speed text processing and additive classification ($>250\text{ tokens/sec}$).

---

## 4. OpenRouter Multimodal AI Gateway (Vision OCR Fallback)

### 4.1 Purpose & Role
Provides visual OCR fallback when on-device Tesseract OCR confidence is $<60\%$ due to packaging glare, crumpled foil pouches, or curved bottle labels.

### 4.2 Integration Details
- **Base URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Authentication:** `Bearer process.env.OPENROUTER_API_KEY`
- **Adapter:** `src/adapters/ai/openRouterService.ts`
- **Active Model:** `meta-llama/llama-3.2-11b-vision-instruct:free`
- **Prompt Sandbox:** Strictly instructed to transcribe visible printed text verbatim into JSON without fabricating nutrient estimates or making food safety claims.

---

## 5. Web Push Notification Service (VAPID)

### 5.1 Purpose & Role
Delivers proactive expiration warnings to users before pantry food items spoil.

### 5.2 Integration Details
- **Protocol:** RFC 8291 / RFC 8292 (Web Push VAPID).
- **Client Service Worker:** `public/sw.js`.
- **Serverless Handler:** `src/server/endpoints/notificationsSubscribe.ts`.
- **Keys:** `VITE_VAPID_PUBLIC_KEY` (Client) and `VAPID_PRIVATE_KEY` (Server).
- **Payload:** Encrypted push notification with title, body, item icon, and deep link URL.
