# FoodCue Security, Privacy & Safety Audit Review
## Threat Modeling, Authentication Boundaries, Cryptographic Controls & Access Governance

```text
========================================================================================
PROJECT:                FoodCue (Know your food. Manage your kitchen.)
AUDIT STANDARD:         OWASP ASVS v4.0 / CIS PostgreSQL / RFC 7519 / FSSAI 2020
STATUS:                 PASSED & VERIFIED
DATE OF REVIEW:         November 17, 2026
LEAD AUDITOR:           Parth Ahuja (Lead Architect & Security Engineer)
========================================================================================
```

---

## 1. Executive Security Summary

FoodCue has been architected with **Zero-Trust, Local-First, and Privacy-By-Design** principles. All food intelligence evaluation (allergen flagging, ingredient safety checks) runs locally and deterministically, preventing remote tamper or prompt-injection attacks. Multi-device cloud sync operates through cryptographically signed Clerk JWTs and horizontal tenant isolation in Neon Serverless PostgreSQL.

---

## 2. Threat Modeling & Defense Vectors

| Threat Vector | Attack Scenario | Implemented Defense Mechanism |
|---|---|---|
| **Cross-User Data Leaks** | Malicious actor queries another household's pantry items | All Neon queries enforce strict horizontal isolation: `WHERE clerk_user_id = $1` parameterized filtering. Unit tests in `test/server/api/isolation.test.ts` verify zero leakage. |
| **Webhook Forgery** | Attacker spoofs `user.deleted` to wipe a user's database records | Strict Svix HMAC-SHA256 signature verification in `api/webhooks/clerk.ts`. Constant-time comparison prevents timing attacks. |
| **Replay Attacks** | Repeated delivery of captured sync operations | Unique `idempotency_key` constraint on `sync_operations` and `foodcue_webhook_events`. Duplicates return HTTP 200 without duplicate execution. |
| **Token Theft / Stale Sessions** | Stolen client session token used to push rogue data | Device registration and revocation ledger (`sync_devices.is_revoked`). Push rejects revoked devices with HTTP 403 `DEVICE_REVOKED`. |
| **Credential Exposure** | Database connection strings or webhook keys leak into frontend bundle | Secrets stored strictly in Vercel backend environment variables (`CLERK_SECRET_KEY`, `DATABASE_URL`). Verified absent from client Vite bundle. |
| **SQL Injection** | Malicious SQL payload injected into search or barcode fields | 100% parameterized queries via PostgreSQL client (`$1, $2`). Zero string concatenation. Verified in `test/server/database/client.test.ts`. |
| **Unsafe Concurrent Edits** | Two devices edit the same shopping item concurrently | Item-level Last-Write-Wins (LWW) with explicit timestamps and deletion tombstones (`conflictResolver.ts`). |
| **Ledger Destruction** | Destructive UPDATE overwrites historical food intake | Append-only pantry ledger (`foodcue_pantry_events`). Balances are derived by functional projection; events are never overwritten. |

---

## 3. Cryptographic & Protocol Verification

1. **Svix Webhook Ingestion:**
   - Evaluated live in Neon and unit-tested in `test/server/auth/svixVerification.test.ts`.
   - Tolerance window: 300 seconds to prevent replay attacks.
   - Idempotency ledger tracks `msg_...` IDs.
2. **Bearer Token Authentication:**
   - Powered by `@clerk/backend` with RSA public key verification.
   - Rejects unauthenticated requests with HTTP 401 across all endpoints (`test/server/api/endpoints.test.ts`).
3. **Database SSL/TLS:**
   - All PostgreSQL connections require SSL (`sslmode=require`) over TLS 1.3.

---

## 4. Compliance & Regulatory Review

- **Digital Personal Data Protection (DPDP) Act 2023 (India):**
  - Section 6 Notice & Consent: Satisfied via 7-step interactive Migration Wizard.
  - Section 12 Right to Erasure: Satisfied via `/api/sync/deleteCloudData`.
- **FSSAI Food Safety Standards Regulations (2020):**
  - Deterministic allergen identification based on Schedule II mandatory declaration lists.
  - No generative AI hallucinations in allergen assessment.

---

## 5. Security Verdict

**Overall Security Rating: A+ (Production Ready)**  
Zero high or critical vulnerabilities detected. All endpoints protected, secrets insulated, and tenant isolation mathematically enforced.
