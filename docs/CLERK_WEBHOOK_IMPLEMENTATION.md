# FoodCue Clerk Webhook Implementation & Security Architecture

```text
========================================================================================
MODULE:                Clerk Authentication Webhook Integration
SPECIFICATION:         FoodCue Master Specification v13.5 §14.3
SECURITY COMPLIANCE:   FoodCue Security, Privacy and Safety Requirements v1.0 §4.2
STATUS:                Production Ready & Cryptographically Verified (Live Neon Validated)
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
1. `claimEvent` queries `foodcue_webhook_events` for existing status.
2. If status is `'processed'`, the event is recognized as a duplicate and immediately responded to with `HTTP 200 OK` (`{ received: true, deduplicated: true }`), preventing infinite retry storms while guaranteeing single-execution semantics.
3. If the event is new OR previously failed, it is claimed into `received` status and processed.
4. On successful execution, the status updates to `processed`.
5. On failure, the status updates to `failed` with the error reason recorded, allowing safe subsequent delivery attempts to re-execute without being falsely dropped.

---

## 4. Supported Event Matrix

| Event Type | Action Taken | Database Impact |
|---|---|---|
| `user.created` | Upsert `foodcue_users` record | Creates user record with `user_id`, `clerk_user_id`, primary email, display name, and username |
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
   - `POST /api/webhooks/clerk`: Fail-closed 503 when secret is unconfigured
   - `POST /api/webhooks/clerk`: 405 Method Not Allowed on GET/PUT/DELETE
   - `POST /api/webhooks/clerk`: 400 Bad Request on missing Svix headers
   - `POST /api/webhooks/clerk`: 401 Unauthorized on invalid HMAC signature
   - `POST /api/webhooks/clerk`: 400 Bad Request on malformed non-JSON payload
   - `POST /api/webhooks/clerk`: 400 Bad Request on payload missing `data.id`
   - `POST /api/webhooks/clerk`: 500 processing failure handled safely without leaking credentials
   - `POST /api/webhooks/clerk`: Idempotent deduplication of repeated delivery
   - `POST /api/webhooks/clerk`: Node.js stream mode (`(req, res)` with `bodyParser: false`) execution
   - `POST /api/webhooks/clerk`: Valid signature processing of `user.created` event

---

## 6. Incident Investigation & Root Cause Resolution

### Symptom
Clerk Dashboard indicated two failed `user.created` webhook delivery attempts to `https://food-cue.vercel.app/api/webhooks/clerk`.

### Audit Findings & Root Causes Identified

1. **Database Schema Not-Null Constraint Violation (`user_id`):**
   - *Root Cause:* In `foodcue_users`, column `user_id` is defined as `VARCHAR(64) PRIMARY KEY NOT NULL` with no default value. The previous `userRepository.create()` query omitted `user_id` from the column list, inserting only `clerk_user_id`. PostgreSQL threw `null value in column "user_id" of relation "foodcue_users" violates not-null constraint`, crashing every webhook user insertion.
   - *Fix:* Explicitly populated `user_id` alongside `clerk_user_id` and `clerk_id` using the verified Clerk user ID.

2. **PostgreSQL Parameter Type Ambiguity:**
   - *Root Cause:* In the SQL statement, parameter `$1` was simultaneously bound to `user_id` (`varchar`), `clerk_user_id` (`text`), and `clerk_id` (`varchar`). PostgreSQL threw `Database query failed: inconsistent types deduced for parameter $1`.
   - *Fix:* Added explicit type casting in the `VALUES` clause: `($1::varchar, $1::text, $1::varchar, ...)`.

3. **Vercel Serverless Function Stream Corruption:**
   - *Root Cause:* By default, `@vercel/node` parses incoming JSON request bodies into JavaScript objects. When `parseRequest` re-serialized `JSON.stringify(nodeReq.body)`, key ordering, whitespace, and formatting diverged from the byte-for-byte payload Clerk originally signed, causing cryptographic Svix signature verification to fail.
   - *Fix:* Exported `export const config = { api: { bodyParser: false } }` on `/api/webhooks/clerk`, preserving the unconsumed Node readable stream and reading exact raw UTF-8 bytes for HMAC computation.

4. **Vercel Serverless Runtime Response Mismatch (`FUNCTION_INVOCATION_FAILED`):**
   - *Root Cause:* In `@vercel/node`, functions are invoked as `handler(req, res)`. Returning a Web standard `Response` object without invoking `res.status().json()` caused Vercel's Node bridge to hang or fail with `500 FUNCTION_INVOCATION_FAILED`.
   - *Fix:* Implemented universal `sendResponse` dispatcher supporting both Node.js `(req, res)` and Web Fetch `Request => Response` across all API endpoints.

5. **Retry Handling in Webhook Idempotency Ledger:**
   - *Root Cause:* If an event delivery initially failed, the ledger row remained in `'failed'` status. On retry, `claimEvent` treated the record as already existing and skipped re-execution.
   - *Fix:* Updated `claimEvent` to only deduplicate events whose status is `'processed'`. Events that are new or in `'failed'` status are claimed and permitted to re-execute.

### Live Neon Database Verification Evidence

Ran live cryptographic test script `scripts/verify_live_webhook.ts` using the real `whsec_3FK0OeRhQ7MX/r8gKZ7vppSbCDgln34o` secret and live Neon database:

```text
1. Delivering live Svix-signed webhook for user: user_live_verify_1794899267147...
   Message ID: msg_live_delivery_1794899267147
   Timestamp: 1794899267
   Signature: v1,HG0P3u51f9TrhwjbS...
   Response Status: 200
   Response Body: { received: true, event: 'user.created', userId: 'user_live_verify_1794899267147' }

2. Verifying user record in Neon PostgreSQL...
   Found user rows in Neon: [
     {
       id: 'ff21c62c-c46f-496e-92e5-ec2598415b8c',
       user_id: 'user_live_verify_1794899267147',
       clerk_user_id: 'user_live_verify_1794899267147',
       email: 'webhook_tester_1794899267147@foodcue.local',
       display_name: 'Live Verification User',
       username: 'verifier_1794899267147',
       created_at: '2026-11-17T07:07:47.384Z'
     }
   ]
   ✅ User record correctly verified in Neon!

3. Verifying webhook idempotency ledger in Neon...
   Found event row: status = 'processed', error = null
   ✅ Webhook event status is 'processed'!

4. Testing duplicate delivery attempt (Idempotency check)...
   Response Status: 200
   Response Body: { received: true, deduplicated: true }
   User count after duplicate delivery: 1
   ✅ Idempotency strictly verified! No duplicate users created.

5. Testing user.updated event...
   Response Status: 200
   Updated display name in Neon: UpdatedFirst UpdatedLast
   ✅ user.updated verified in Neon!

🎉 ALL LIVE VERIFICATION CHECKS PASSED!
```

---

## 7. Production HTTPS Endpoint Live Verification

Executed real HTTPS delivery directly to the production domain `https://food-cue.vercel.app/api/webhooks/clerk` with cryptographic Svix HMAC signature header verification:

```text
1. Sending HTTPS POST to https://food-cue.vercel.app/api/webhooks/clerk
   User ID: user_live_prod_1794903541783
   Message ID: msg_live_prod_1794903541784
   HTTP Status: 200 OK
   Response Body: {
     received: true,
     event: 'user.created',
     userId: 'user_live_prod_1794903541783',
     eventId: 'msg_live_prod_1794903541784'
   }

2. Verifying user in live Neon PostgreSQL...
   Queried row in Neon: [
     {
       user_id: 'user_live_prod_1794903541783',
       clerk_user_id: 'user_live_prod_1794903541783',
       email: 'live_prod_1794903541783@foodcue.local',
       display_name: 'Production Verified User',
       created_at: 2026-11-17T08:19:02.787Z
     }
   ]
   ✅ User record created in Neon!

3. Testing Idempotent Replay on Production URL...
   Duplicate Status: 200 OK
   Duplicate Body: {
     received: true,
     deduplicated: true,
     eventId: 'msg_live_prod_1794903541784'
   }
   ✅ Replay safely deduplicated!

🎉 PRODUCTION LIVE WEBHOOK VERIFICATION SUCCEEDED!
```
