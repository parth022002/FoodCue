# FoodCue — Security, Privacy & Food Safety Controls

**Document Version:** 2.1 (Authoritative Security Specification)  
**Security Level:** Production Grade  
**Compliance Standards:** OWASP Top 10 (2021), India Digital Personal Data Protection Act (DPDPA 2023), GDPR Data Minimization  

---

## 1. Zero Image Retention Policy (Camera Privacy)

1. **In-Memory Frame Processing:**
   - Camera video stream frames and captured photos from `SmartScanViewfinder` are drawn directly to an in-memory HTML5 `<canvas>` element.
   - Text extraction (Tesseract.js OCR) and barcode decoding (ZXing-Wasm) operate strictly on transient `ImageData` buffers in client memory.
2. **Zero Disk & Cloud Storage:**
   - **No packaging photographs or camera images are ever saved to device storage, IndexedDB, or transmitted to any server/cloud database.**
   - Once optical analysis is complete, image buffers are cleared and de-referenced for immediate browser garbage collection.
3. **Legal Compliance:** Complies with Section 4(1) of the India DPDPA and Article 5(1)(c) of GDPR (Strict Purpose Limitation & Data Minimization).

---

## 2. Deterministic Food Safety Principles (Anti-Hallucination)

Food safety calculations directly impact human health. FoodCue enforces three non-negotiable algorithms:

### 2.1 Explicit Null Preservation
- If a nutrient (e.g., sodium, trans-fats, or added sugars) is missing from package labeling or database records, it must **never be assumed to be 0**.
- It is preserved explicitly as `null`, and the UI displays: `⚠️ Value not declared on packaging`.

### 2.2 Mathematical Health Scoring (0–100)
- Health scores are computed deterministically by `foodIntelligenceEngine.ts` using verified mathematical scoring:
  - Base points: $100$
  - Negative penalties: Energy density ($>400\text{ kcal}/100\text{g}$), Saturated fat ($>5\text{g}/100\text{g}$), Total sugar ($>10\text{g}/100\text{g}$), Sodium ($>400\text{mg}/100\text{g}$), and Ultra-processed additives (INS 100–1500 classes).
  - Positive credits: Dietary fiber ($>3\text{g}/100\text{g}$), Protein ($>8\text{g}/100\text{g}$).
- Generative AI is prohibited from modifying or hallucinating the numeric score.

### 2.3 Fail-Closed Allergen Conflict Engine
- When an ingredient text statement matches any item in the user's personal or household avoid-list, FoodCue triggers a red alert banner.
- The alert cannot be silently dismissed; the user must acknowledge the warning before adding the item to the pantry.

---

## 3. Multi-Tenant Household Security & RBAC Isolation

1. **Cryptographic Identity Verification:**
   - Every request to `/api/sync/*` and `/api/devices/*` requires a valid Clerk JWT bearer token.
   - Serverless functions extract the authenticated `user_id` and active `organization_id` (Household).
2. **Query Scoping:**
   - All SQL queries enforce:
     ```sql
     SELECT * FROM foodcue_pantry_ledger_events
     WHERE household_id = :authenticated_user_household_id;
     ```
   - Household A can never read, modify, or infer the contents of Household B's inventory.
3. **RBAC Isolation:**
   - `admin`: Can invite/remove household members, delete household cloud history, and manage settings.
   - `member`: Can view inventory, append ledger events, and manage shopping items.

---

## 4. OWASP Top 10 Threat Mitigations

| Threat Category | Risk in FoodCue | Mitigation Strategy |
|---|---|---|
| **A01: Broken Access Control** | Unauthorized cross-household data access | Strict Clerk organization token checks on every serverless API route. |
| **A02: Cryptographic Failures** | Eavesdropping on transit credentials | Strict HTTPS/TLS 1.3 enforcement; zero client exposure of backend secret keys. |
| **A03: Injection (SQL / QR)** | Malicious SQL in product names or QR code payloads | 100% parameterized queries via Neon `sql`...`` tagged template literals; regex sanitization of all QR strings. |
| **A07: Identification Failures** | Compromised user sessions | Delegated to Clerk with rate limiting, brute-force protection, and multi-factor authentication (MFA). |
| **A08: Software & Data Integrity** | Spoofed Clerk webhook requests | Cryptographic signature verification using Svix (`svix-id`, `svix-timestamp`, `svix-signature`). |

---

## 5. Security Audit Log & Traceability

All security-sensitive operations (device authorizations, household invitations, data deletion requests) are logged immutably in `foodcue_audit_log` with timestamp, actor ID, action type, IP hash, and status.
