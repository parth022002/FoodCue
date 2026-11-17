# FoodCue — Phase 11.6 Comprehensive Security & Privacy Audit Report

**Auditor:** Principal Security Engineer & Privacy Architect  
**Specification Baseline:** FoodCue Master Specification v13.5 §16 (Security, Privacy & Data Protection)  
**Standard Frameworks:** OWASP Top 10 (2021), FSSAI Regulatory Privacy, Svix Cryptographic Standards

---

## 1. Executive Security & Privacy Summary

FoodCue has been architected from inception as a **privacy-first, local-first application**. This architectural decision significantly shrinks the application's attack surface:
- Sensitive personal food logs, pantry balances, and camera scans exist primarily in the user's browser (IndexedDB and client memory).
- Scanned product photographs are **never uploaded to or stored on cloud servers** (Zero-Retention Ephemeral Memory Pipeline).
- Serverless cloud operations enforce strict multi-tenant isolation, cryptographic webhook verification, and SQL parameterization.

Below is the exhaustive audit of all 18 security and privacy threat surfaces.

---

## 2. Threat Vector Audit Matrix

| Security Domain | Evaluated Threat Surface | Mitigation & Defense in Code | Verification Status |
| :--- | :--- | :--- | :--- |
| **Authentication Bypass** | Unauthenticated access to private user data or APIs | Handled by `@clerk/backend` and `authenticateRequest` in `src/server/auth/authorization.ts`. Missing/invalid tokens return HTTP 401. | **VERIFIED.** (Tested in `endpoints.test.ts`) |
| **Authorization Bypass** | Authenticated User A accessing User B's resources | Strict tenant query binding: all queries require `WHERE clerk_user_id = $1`. | **VERIFIED.** (Tested in `isolation.test.ts`) |
| **Cross-User Catalogue Leakage** | User A seeing or modifying User B's private saved foods | `userCatalogueService.ts` isolates local storage keys (`foodcue_user_catalog_{userId}`) and Neon records by `clerk_user_id`. | **VERIFIED.** (Tested in `phase11UserJourneys.test.ts`) |
| **Cross-Household Leakage** | Members of Household A viewing items in Household B | Queries in `householdIsolation.test.ts` verify that Household A events are strictly invisible to Household B. | **VERIFIED.** (Tested in `householdIsolation.test.ts`) |
| **SQL Injection (SQLi)** | Malicious SQL payloads injected into search or sync | All database operations in `src/server/database/client.ts` use parameterized SQL queries (`sql.query(sqlText, params)` or tagged template literals). | **VERIFIED.** (Tested in `client.test.ts`) |
| **Cross-Site Scripting (XSS)** | Injected malicious HTML/JS in product titles or ingredients | React JSX auto-escapes string interpolation. Scanned text is treated as raw data strings, never evaluated via `dangerouslySetInnerHTML`. | **VERIFIED.** (Tested in `qrSecurityThreatClasses.test.ts`) |
| **CSRF Protection** | Cross-site forged requests | All mutating API endpoints require `Authorization: Bearer <JWT>` header, which browsers do not automatically attach cross-origin. | **VERIFIED.** (No ambient cookie auth) |
| **Input Validation** | Malformed payloads crashing API or corrupting state | Runtime Zod schemas validate all serverless request bodies (`parseRequest` in `src/server/utils/response.ts`). | **VERIFIED.** (Tested in `openFoodFactsSchema.test.ts`) |
| **Webhook Signature Forgery** | Attacker sending fake `user.created` or `user.deleted` webhooks | `api/webhooks/clerk.ts` validates Svix HMAC-SHA256 signatures with 300s timestamp drift tolerance window using constant-time `crypto.timingSafeEqual`. | **VERIFIED.** (Live checkmarks verified) |
| **Webhook Idempotency & Replay** | Attacker replaying captured valid webhook payloads | `foodcue_webhook_events` table maintains an idempotency ledger; duplicates are safely acknowledged without re-execution. | **VERIFIED.** (Tested in `endpoints.test.ts`) |
| **Secret Exposure** | Leaking database passwords or Clerk secrets in client code or logs | `sanitizeErrorMessage` in `src/server/database/client.ts` strips passwords. Client bundle audits confirm only `VITE_` public variables exist in frontend. | **VERIFIED.** (Tested in `verify-deployment-config.mjs`) |
| **File & Camera Upload Security** | Malicious file payloads, EXIF metadata tracking, server exploitation | **Zero Server Storage.** Camera frames are drawn to local HTML5 canvas, processed in memory, and immediately garbage collected. | **VERIFIED.** (Zero server upload attack surface) |
| **Malicious QR Code Redirection** | QR codes containing phishing URLs, intent schemes, or exploit payloads | `src/domain/rules/payloadClassifier.ts` strictly rejects arbitrary URLs and external protocols. | **VERIFIED.** (Tested in `qrSecurityThreatClasses.test.ts`) |
| **Offline Data Privacy** | Device theft or shared device inspection | Guest data is held only in transient session memory. Signed-in data stored in private IndexedDB database scoped to application origin. | **VERIFIED.** (Tested in `database.test.ts`) |
| **Account Deletion & Data Purge** | GDPR / CCPA right-to-be-forgotten compliance | `user.deleted` webhook triggers complete cascade purge of user records, devices, and sync operations in Neon PostgreSQL. | **VERIFIED.** (Tested in `endpoints.test.ts`) |
| **Cloud Data Purge on Demand** | User disabling cloud sync without deleting account | `/api/sync/deleteCloudData` allows user to wipe cloud records while keeping local offline ledger intact. | **VERIFIED.** (Tested in `endpoints.test.ts`) |
| **Allergy & Health Profile Privacy** | Leaking medical/allergy preferences | Allergen avoid-lists are stored in `foodcue_profiles` and never shared across users or transmitted to analytics trackers. | **VERIFIED.** (Tested in `userJourneys.test.ts`) |
| **Dependency Vulnerabilities** | Outdated or vulnerable third-party packages | `npm audit --omit=dev` identified 0 critical, 2 high (Zod collection memory advisory), 1 moderate (esbuild dev server). | **AUDITED.** (Documented in Section 3) |

---

## 3. Dependency Vulnerability Analysis

A production dependency audit (`npm audit --omit=dev`) yielded:
1. **Zod (`<4.6.6`):** Advisory GHSA-mrhx-c7xc-m3w5 (High). Pertains to potential resource exhaustion when parsing unbounded recursive collections.
   - *Mitigation in FoodCue:* All incoming API request bodies are bounded in size ($< 1\text{MB}$ via Vercel serverless gateway limits) and schemas use explicit max lengths (e.g. `z.string().max(128)`).
   - *Recommendation:* Upgrade to Zod v4 in next major release after validating breaking changes.
2. **esbuild (`<=0.24.2`):** Advisory GHSA-67mh-4wv8-2f99 (Moderate). Pertains to development server CORS binding.
   - *Mitigation in FoodCue:* Production builds compile to static assets served by Vercel Edge CDN; the Vite development server is never exposed in production.
