# FoodCue Clerk Webhook Implementation & Security Architecture

```text
========================================================================================
MODULE:                Clerk Authentication Webhook Integration
SPECIFICATION:         FoodCue Master Specification v13.5 §14.3
SECURITY COMPLIANCE:   FoodCue Security, Privacy and Safety Requirements v1.0 §4.2
STATUS:                Production Ready & Cryptographically Verified
========================================================================================
```

---

## 1. Overview & Objectives

FoodCue implements an asynchronous user synchronization pipeline connecting Clerk Identity to Neon PostgreSQL. When a user creates an account, modifies their profile, or deletes their account, Clerk dispatches an authenticated HTTP POST webhook to `/api/webhooks/clerk`.

### Key Design Goals:
1. **Zero Unverified Ingestion (Fail Closed):** If `CLERK_WEBHOOK_SIGNING_SECRET` is missing, the endpoint immediately returns `503 Service Unavailable` with `WEBHOOK_SECRET_PENDING`.
2. **Cryptographic Svix HMAC SHA-256 Verification:** Signatures are validated using constant-time comparison against the secret key and the raw incoming request bytes.
3. **Strict Idempotency Ledger:** Incoming `svix-id` tokens are checked against the `foodcue_webhook_events` table before processing, preventing replay attacks and duplicate mutations.
4. **Soft Deletion by Default:** Deletion events (`user.deleted`) mark `deleted_at = CURRENT_TIMESTAMP` to preserve audit records while immediately disassociating access.

---

## 2. Svix Webhook Verification Protocol

Clerk signs each webhook with three mandatory headers:
- `svix-id`: Unique message identifier (e.g. `msg_2X8J0QkQ5t8Lp1m9Nv3R4s7T2w`).
- `svix-timestamp`: Unix epoch seconds timestamp.
- `svix-signature`: Space-delimited version and HMAC signature (e.g. `v1,g0hM9SSRONb3tGGeW+/YxqHpBulk3TMkggeogcmDiA1=`).

### Cryptographic Verification Algorithm (`src/server/auth/svixVerification.ts`)

```typescript
// 1. Replay window check (5 minutes tolerance)
const nowSeconds = Math.floor(Date.now() / 1000);
if (Math.abs(nowSeconds - parseInt(timestamp, 10)) > 300) {
  throw new Error("Webhook signature timestamp is outside tolerance window");
}

// 2. Secret decoding
const cleanedSecret = secret.startsWith("whsec_") ? secret.substring(6) : secret;
const keyBytes = Buffer.from(cleanedSecret, "base64");

// 3. HMAC computation over raw body
const signedContent = `${id}.${timestamp}.${rawBody}`;
const computedSignature = crypto
  .createHmac("sha256", keyBytes)
  .update(signedContent)
  .digest("base64");

// 4. Constant-time comparison
crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computedSignature));
```

---

## 3. Webhook Idempotency Ledger

Table: `foodcue_webhook_events`
```sql
CREATE TABLE IF NOT EXISTS foodcue_webhook_events (
  event_id VARCHAR(128) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'received',
  payload JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

When an event arrives:
1. An atomic `INSERT INTO foodcue_webhook_events ... ON CONFLICT (event_id) DO NOTHING RETURNING event_id` is executed.
2. If zero rows return, the event is recognized as a duplicate and immediately responded to with `HTTP 200 OK` (`{ received: true, deduplicated: true }`), preventing infinite retry storms while guaranteeing single-execution semantics.
3. On successful execution, the status updates to `processed`.
4. On failure, the status updates to `failed` with the error reason recorded.

---

## 4. Supported Event Matrix

| Event Type | Action Taken | Database Impact |
|---|---|---|
| `user.created` | Upsert `foodcue_users` record | Creates user record with `clerk_user_id`, primary email, display name, and username |
| `user.updated` | Update `foodcue_users` record | Updates profile fields and sets `updated_at = CURRENT_TIMESTAMP` |
| `user.deleted` | Soft delete user | Sets `deleted_at = CURRENT_TIMESTAMP`; invalidates future sync requests |
| Other (`session.*`, `organization.*`) | Acknowledged | Returns `HTTP 200 OK` without error |

---

## 5. Verification Test Suite

The implementation is verified by:
1. `test/server/auth/svixVerification.test.ts`:
   - Valid signature verification
   - Tampered signature rejection
   - Tampered payload rejection
   - Timestamp replay rejection (> 300s)
   - Missing headers rejection
2. `test/server/api/endpoints.test.ts`:
   - Fail-closed guardrail when signing secret is missing (503)
   - Missing Svix headers rejection (400)
   - Invalid Svix signature rejection (401)
   - Successful `user.created` event ingestion (200)
