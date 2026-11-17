# FoodCue Serverless API Reference
## Edge Runtime Specifications, Authentication Contracts & Payload Schemas

```text
========================================================================================
PROJECT:                FoodCue (Know your food. Manage your kitchen.)
RUNTIME:                Vercel Serverless Functions (Node.js 26 ESM)
DATABASE:               Neon Serverless PostgreSQL (Dual-Pool WebSockets)
AUTH PLATFORM:          Clerk (JWT Bearer Verification via @clerk/backend)
CONTROLLING SPEC:       FoodCue Master Specification v13.5 §6 & §9
========================================================================================
```

---

## 1. Global Standards & Error Codes

All protected endpoints require an `Authorization: Bearer <clerk_session_token>` header. Responses return standard JSON with RFC 7807 error envelopes.

### Error Envelope
```json
{
  "error": "Human readable error message",
  "code": "UNAUTHORIZED | INVALID_PAYLOAD | DEVICE_REVOKED | METHOD_NOT_ALLOWED"
}
```

---

## 2. API Endpoint Directory

### 2.1 Health Check
- **Endpoint:** `GET /api/health`
- **Auth:** Public (Unauthenticated)
- **Response (200 OK):**
```json
{
  "status": "ok",
  "application": "foodcue",
  "database": "connected",
  "latencyMs": 34,
  "timestamp": "2026-11-17T09:20:00.000Z"
}
```

---

### 2.2 User Profile Context
- **Endpoint:** `GET /api/me`
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
  "user": {
    "userId": "usr_abc123",
    "clerkId": "user_xyz789",
    "email": "user@example.com",
    "displayName": "Parth Ahuja"
  }
}
```

---

### 2.3 Device Session Management
- **Endpoint:** `GET /api/devices`
  - **Auth:** Bearer Token
  - **Description:** Lists all registered devices for the authenticated user.
  - **Response (200 OK):**
```json
{
  "devices": [
    {
      "deviceId": "550e8400-e29b-41d4-a716-446655440000",
      "deviceName": "Chrome on Windows",
      "clientVersion": "1.0.0",
      "lastSyncAt": "2026-11-17T09:20:00.000Z",
      "isRevoked": false
    }
  ]
}
```

- **Endpoint:** `POST /api/devices`
  - **Auth:** Bearer Token
  - **Payload:**
```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": "Chrome on Windows",
  "clientVersion": "1.0.0"
}
```
  - **Response (200 OK):** `{"registered": true, "isRevoked": false}`

- **Endpoint:** `DELETE /api/devices?deviceId=<UUID>`
  - **Auth:** Bearer Token
  - **Description:** Revokes a device session. Blocked from future sync cycles.

---

### 2.4 Cloud Sync Engine

- **Endpoint:** `POST /api/sync/push`
  - **Auth:** Bearer Token
  - **Description:** Ingests a batch of queued operations from client `syncQueue`. Idempotent by `idempotencyKey`.
  - **Payload:**
```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": "Chrome on Windows",
  "clientVersion": "1.0.0",
  "operations": [
    {
      "idempotencyKey": "pantry_event_ev123_179490000",
      "entityType": "pantry_event",
      "entityId": "ev123",
      "operationType": "append_event",
      "payload": { "eventId": "ev123", "itemId": "item_milk", "eventType": "intake", "quantityDelta": 1 },
      "clientTimestamp": "2026-11-17T09:20:00.000Z"
    }
  ]
}
```
  - **Response (200 OK):**
```json
{
  "success": true,
  "processedCount": 1,
  "duplicateCount": 0,
  "serverTimestamp": "2026-11-17T09:20:01.000Z"
}
```

- **Endpoint:** `GET /api/sync/pull?since=<ISO_TIMESTAMP>`
  - **Auth:** Bearer Token
  - **Description:** Fetches incremental delta operations created after the cursor timestamp.
  - **Response (200 OK):**
```json
{
  "serverTimestamp": "2026-11-17T09:20:05.000Z",
  "operations": [],
  "hasMore": false
}
```

- **Endpoint:** `GET /api/sync/status`
  - **Auth:** Bearer Token
  - **Description:** Returns non-technical sync metrics for the user. Never exposes database credentials.
  - **Response (200 OK):**
```json
{
  "syncEnabled": true,
  "activeDevicesCount": 1,
  "lastSuccessfulSync": "2026-11-17T09:20:00.000Z",
  "currentCursor": "2026-11-17T09:20:00.000Z",
  "totalOperations": 4,
  "cloudRecordCounts": { "pantryEvents": 2, "confirmedLabels": 1, "shoppingItems": 1 },
  "conflictCount": 0
}
```

- **Endpoint:** `POST /api/sync/migrate`
  - **Auth:** Bearer Token
  - **Description:** Atomically uploads local snapshot during initial Migration Wizard consent.

- **Endpoint:** `POST /api/sync/deleteCloudData`
  - **Auth:** Bearer Token
  - **Description:** Permanently wipes all cloud records under the authenticated user's ID.

---

### 2.5 Webhooks
- **Endpoint:** `POST /api/webhooks/clerk`
  - **Auth:** Cryptographic Svix signature (`svix-id`, `svix-timestamp`, `svix-signature`).
  - **Description:** Ingests Clerk events (`user.created`, `user.updated`, `user.deleted`) with idempotency ledger.
