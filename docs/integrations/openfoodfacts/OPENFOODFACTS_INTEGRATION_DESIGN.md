# FoodCue — OpenFoodFacts Integration Design Document
**Module:** `src/integrations/openfoodfacts/`  
**Controlling Architecture:** Master Specification v13.5 §6.4 & §6.5; Privacy & Safety Architecture  
**Document Version:** 1.0.0  
**Status:** IMPLEMENTED & VERIFIED  
**Date:** November 2026  

---

## 1. Executive Summary & Purpose

FoodCue is a privacy-first, local-first kitchen management and food intelligence application. Its primary source of truth for Indian packaged food products is the curated, audited, and cryptographically checksummed `VERIFIED_INDIAN_CATALOG` stored locally in the application bundle.

However, in real-world retail and household environments across India, consumers frequently encounter packaged food items (imported items, regional specialty brands, and recently launched SKUs) that are not yet present in the local verified Indian catalogue.

To support user utility without compromising FoodCue's strict security, food safety, and privacy posture, FoodCue provides an **optional, user-initiated external metadata fallback** backed by the OpenFoodFacts API v2.

---

## 2. Core Architectural Principles

1. **Strictly User-Initiated:** The application never automatically contacts OpenFoodFacts. If a scanned barcode or manual GTIN produces zero matches in the local verified catalogue, FoodCue presents an explicit choice to query OpenFoodFacts.
2. **Minimalist Data Transmission:** The external HTTPS request transmits **only** the normalized GTIN barcode number (8, 12, 13, or 14 digits) in the request URL path. Absolutely no cookies, Clerk user authentication tokens, device identifiers, camera frames, OCR raw text, pantry contents, or geolocation coordinates are transmitted.
3. **Session-Ephemeral Memory:** Metadata received from OpenFoodFacts is treated as unverified candidate data in React component memory. It is never automatically persisted to the local IndexedDB catalogue or pushed to Neon PostgreSQL unless the user physically confirms the pack and adds it to their kitchen ledger.
4. **Non-Negotiable Physical Pack Confirmation:** Under no circumstances is an OpenFoodFacts response promoted to a `ConfirmedLabel` without the user actively checking the physical packaging and confirming the 3 critical panels (`ingredients`, `allergen_declaration`, `nutrition`) and setting the mandatory confirmation checkbox (`userHasCheckedPack: true`).
5. **Fail-Closed Resilience:** If OpenFoodFacts is unreachable, times out (8,000 ms), returns HTTP 429 (rate-limited), or returns HTTP 404 (not found), the application degrades cleanly to manual pack entry without blocking the user or crashing.

---

## 3. Component Architecture & File Layout

The OpenFoodFacts integration is modularized cleanly under `src/integrations/openfoodfacts/`:

```
src/integrations/openfoodfacts/
├── openFoodFactsTypes.ts      # Pure TypeScript interfaces & raw API response contracts
├── openFoodFactsErrors.ts     # Dedicated, typed error hierarchy (GtinValidationError, etc.)
├── openFoodFactsSchema.ts     # Defensive Zod schemas for runtime schema validation
├── openFoodFactsClient.ts     # HTTP client (fetch, timeout, backoff, User-Agent header)
├── openFoodFactsMapper.ts     # Safe transformer from raw JSON to ProductCandidate & VerifiedFoodProduct
└── index.ts                   # Centralized barrel export
```

### 3.1 Client Design (`openFoodFactsClient.ts`)

- **Base URL:** `https://world.openfoodfacts.org/api/v2/product/{gtin}.json`
- **Fields Filter:** Uses `?fields=code,product_name,product_name_en,generic_name,brands,quantity,categories,categories_tags,ingredients_text,ingredients_text_en,allergens,allergens_tags,nutriments,image_front_url` to request strictly the necessary attributes and minimize bandwidth.
- **Mandatory User-Agent:** Headers include `User-Agent: FoodCue-PWA/1.0 (contact: parth022002@github.com)` in compliance with OpenFoodFacts API Acceptable Use Policy.
- **Credential Isolation:** Outgoing fetch sets `credentials: "omit"` and explicitly forbids passing any authentication or cookie headers.
- **AbortController Timeout:** Requests automatically abort after 8,000 milliseconds to avoid blocking browser event loops on slow 2G/3G Indian cellular connections.
- **Rate-Limit Handling:** Intercepts HTTP 429 responses and extracts `Retry-After` headers where available, throwing a typed `RateLimitError`.

### 3.2 Defensive Schema Validation (`openFoodFactsSchema.ts`)

OpenFoodFacts is a public, crowdsourced wiki database. Responses may contain unexpected types, missing fields, null values, or extraneous properties.
FoodCue runs all incoming JSON through a Zod schema (`rawOpenFoodFactsResponseSchema`) using `.passthrough()`:
- `status`: number (1 = found, 0 = not found).
- `product`: optional object containing strings or arrays.
- `nutriments`: typed record with numeric values validated for energy, proteins, fats, carbohydrates, and sodium.

### 3.3 Normalization & Semantic Mapping (`openFoodFactsMapper.ts`)

- **Category Normalization:** Maps multilingual and taxonomy category tags into FoodCue's approved 7 food categories: `"Staples"`, `"Dairy"`, `"Biscuits & Bakery"`, `"Snacks & Instant"`, `"Breakfast & Cereals"`, `"Condiments"`, `"Beverages"`.
- **Allergen Normalization:** Strips OpenFoodFacts language prefixes (e.g. `"en:milk"` -> `"Milk"`, `"en:gluten"` -> `"Gluten"`), cleans whitespace, and deduplicates allergen names.
- **Energy Conversion:** Normalizes energy values whether reported in `energy-kcal_100g` (direct kcal) or `energy_100g` (kJ, divided by 4.184 to compute kcal).
- **Candidate Presentation:** Produces a `VerifiedFoodProduct` shape with `fssaiLicence: "Not Verified (External Data)"` and `variant: "External Metadata Match"`, clearly alerting the user that this product has not been audited by FoodCue.

---

## 4. UI Integration in `SmartScan.tsx`

The fallback interface in `src/features/smartscan/SmartScan.tsx` operates in two distinct states:

1. **State 2A (No Local Match):**
   - Displays clear yellow status tag `No Local Match`.
   - Explains that the GTIN is not in FoodCue's curated local Indian database.
   - Embeds a green `Privacy Guarantee` badge detailing what data is sent and confirming zero data leakage.
   - Provides a `Search OpenFoodFacts` button with loading spinner and full error feedback.
   - Provides an alternative button to `Enter Pack Details Manually`.

2. **State 2B (Candidate Review with External Badge):**
   - Renders the candidate comparison card.
   - Displays an amber warning banner: `External OpenFoodFacts Metadata (Unverified)`.
   - Provides direct link to `https://world.openfoodfacts.org/product/{gtin}` under ODbL attribution.
   - Requires explicit user checkbox: `I have physically reviewed the pack` and confirmed pack identity before allowing promotion to `ConfirmedLabel`.

---

## 5. Security & Threat Modeling

| Threat Vector | Mitigation Strategy | Verification Evidence |
| :--- | :--- | :--- |
| **Token Leakage:** Auth or session tokens leaked to OpenFoodFacts | Client sets `credentials: "omit"`, omits Authorization header; validated by unit tests | `test/integrations/openfoodfacts/openFoodFactsPrivacy.test.ts` (PASS) |
| **User Surveillance:** Tracking user browsing or diet habits | User-initiated only; requests use encrypted HTTPS; no user ID transmitted | API design & network assertions |
| **Spoofed Nutrition Data:** Inaccurate external data causing allergy/health risks | Unverified marker; physical pack confirmation mandatory; missing panel checks enforced | `test/integrations/openfoodfacts/openFoodFactsSafety.test.ts` (PASS) |
| **DDoS / Rate Limiting:** Spamming external API causing client freezes | 8s timeout, 429 interception, disabled buttons during inflight fetch | `test/integrations/openfoodfacts/openFoodFactsClient.test.ts` (PASS) |
| **Malformed JSON Injection:** XSS or prototype pollution via API response | Zod schema validation; React JSX escaping; strict TypeScript types | `test/integrations/openfoodfacts/openFoodFactsSchema.test.ts` (PASS) |
