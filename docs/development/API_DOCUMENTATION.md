# FoodCue — Serverless API Specification

FoodCue backend services are deployed as standalone Vercel Serverless Functions built from TypeScript handlers in `src/server/endpoints/` and bundled to `api/*.js` via `scripts/bundle-api.mjs`.

---

## 1. Global API Standards

- **Base URL:** `https://<deployment-domain>/api`
- **Protocol:** HTTPS only
- **Authentication:** Bearer token in `Authorization: Bearer <clerk_session_token>`
- **Content-Type:** `application/json`

---

## 2. API Endpoints

### 2.1 System Health
`GET /api/health`
- **Auth:** None (Public)
- **Description:** Returns the runtime health of the serverless function and database connection.
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-18T10:00:00.000Z",
    "database": {
      "connected": true,
      "latencyMs": 42
    }
  }
  ```

---

### 2.2 User Profile & Session
`GET /api/me`
- **Auth:** Required (`Bearer <clerk_session_token>`)
- **Description:** Returns the authenticated user's profile and active household organization membership.
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user_2...",
      "email": "user@example.com",
      "activeHouseholdId": "org_2..."
    }
  }
  ```

---

### 2.3 Multi-Device Management
`GET /api/devices` | `POST /api/devices`
- **Auth:** Required
- **Description:** Lists or registers user devices for multi-device sync and topology tracking.
- **Request Body (POST):**
  ```json
  {
    "deviceId": "dev_mobile_xyz",
    "deviceName": "OnePlus 11 Chrome PWA",
    "platform": "Android"
  }
  ```

---

### 2.4 Cloud Sync: Push Operations
`POST /api/sync/push`
- **Auth:** Required
- **Description:** Pushes a batch of offline pantry ledger events and shopping items to Neon PostgreSQL.
- **Request Body:**
  ```json
  {
    "householdId": "org_2...",
    "events": [
      {
        "eventId": "evt_abc123",
        "itemId": "item_milk_1",
        "eventType": "ITEM_ADDED",
        "payload": { "name": "Amul Taaza Milk", "gtin": "8901262010054", "expiryDate": "2026-11-20" },
        "vectorClock": { "dev_mobile_xyz": 1 }
      }
    ]
  }
  ```

---

### 2.5 Cloud Sync: Pull Operations
`POST /api/sync/pull`
- **Auth:** Required
- **Description:** Retrieves all new events committed to the household ledger since a given sequence number.
- **Request Body:**
  ```json
  {
    "householdId": "org_2...",
    "sinceSeq": 104
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "events": [...],
    "latestSeq": 112
  }
  ```

---

### 2.6 Web Push Subscription
`POST /api/notifications/subscribe`
- **Auth:** Required
- **Description:** Registers a browser Web Push VAPID subscription for expiration alerts.
- **Request Body:**
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNc...",
      "auth": "baZ..."
    }
  }
  ```

---

### 2.7 Clerk Cryptographic Webhook Ingestion
`POST /api/webhooks/clerk`
- **Auth:** Svix Cryptographic Headers (`svix-id`, `svix-timestamp`, `svix-signature`)
- **Description:** Ingests user lifecycle events (`user.created`, `user.updated`, `user.deleted`) from Clerk and synchronizes with `foodcue_users`.
- **Response:** `200 OK`
