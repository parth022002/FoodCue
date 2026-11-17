# FoodCue — OpenFoodFacts API Usage & Licensing Review
**Controlling Policies:** OpenFoodFacts Terms of Use · Open Database License (ODbL) 1.0 · Database Contents License (DbCL) 1.0  
**Document Version:** 1.0.0  
**Status:** AUDITED & COMPLIANT  
**Date:** November 2026  

---

## 1. Purpose & Legal Baseline

OpenFoodFacts is a collaborative, open database of food products from around the world. Its data is licensed under the **Open Database License (ODbL) 1.0**, and individual contents of the database are licensed under the **Database Contents License (DbCL) 1.0**.

This document reviews:
1. Technical compliance with OpenFoodFacts API v2 terms of use and acceptable use guidelines.
2. Legal compliance with the ODbL license, attribution requirements, and share-alike implications for FoodCue's local and cloud databases.

---

## 2. API Acceptable Use Policy Compliance

OpenFoodFacts publishes explicit guidelines for API consumers to maintain server stability and prevent abuse:

| Requirement | OpenFoodFacts Policy | FoodCue Implementation | Status |
| :--- | :--- | :--- | :--- |
| **User-Agent Header** | Must include application name, version, and contact URL or email. | `FoodCue-PWA/1.0 (contact: parth022002@github.com)` | **COMPLIANT** |
| **Selective Fields** | Request only the attributes actually used to reduce database load. | Appends `?fields=code,product_name,...` query string. | **COMPLIANT** |
| **Request Rate Limits** | Avoid excessive concurrent requests; respect HTTP 429 headers. | Requests are user-triggered single lookups; 429 backoff parsed. | **COMPLIANT** |
| **Caching** | Cache results locally where appropriate to avoid repeat calls. | Handled via React state and confirmed user entries in IndexedDB. | **COMPLIANT** |
| **API Version** | Use API v2 endpoints (`/api/v2/product/{gtin}.json`). | Configured as primary base endpoint. | **COMPLIANT** |

---

## 3. ODbL Licensing & Intellectual Property Analysis

### 3.1 Attribution Requirement (ODbL §4.3)
Under ODbL §4.3, any Public Use of a Produced Work or Derived Database must include a clear notice attributing OpenFoodFacts as the source of the database.

**FoodCue Implementation:**
1. Whenever OpenFoodFacts metadata is displayed on screen, an explicit amber badge and notice is rendered:
   `Source: OpenFoodFacts (ODbL) — External unverified metadata. Physical verification mandatory.`
2. A direct hyperlink to `https://world.openfoodfacts.org/product/{gtin}` is provided with `rel="noopener noreferrer"` and `target="_blank"`.
3. In the application's global footer and legal attribution view, OpenFoodFacts is formally acknowledged with a link to the Open Database License.

### 3.2 Share-Alike & Derivative Database Boundary (ODbL §4.4)
The ODbL contains a "Share-Alike" provision: if a party creates a Derivative Database and makes it publicly available, that Derivative Database must also be released under the ODbL.

**Legal Isolation Architecture:**
- FoodCue's curated `VERIFIED_INDIAN_CATALOG` is an independent, original work compiled from physical retail packaging audits by the FoodCue engineering team. It does not ingest, merge, or train upon OpenFoodFacts data.
- User pantry records and shopping lists stored in Neon PostgreSQL are private, confidential user personal data and are not a publicly distributed database.
- Metadata fetched from OpenFoodFacts is held strictly in temporary client-side memory for pack confirmation. It does not contaminate FoodCue's core intellectual property.

---

## 4. Financial & Commercial Review

- **Cost to FoodCue:** INR 0. OpenFoodFacts is an open, non-profit API service.
- **Cost to User:** INR 0.
- **Sustainability:** Since lookups occur only when an item is missing from the local catalogue and only when explicitly triggered by the user, FoodCue's outbound call volume to OpenFoodFacts is exceptionally low and well within free public tier limits.
