# FoodCue Backend Architecture Specification
**Step 3 & Step 4: Backend Configuration, Neon Database Connection & User Management Foundation**

```text
========================================================================================
PROJECT:               FoodCue
TAGLINE:               Know your food. Manage your kitchen.
DOCUMENT:              Backend Architecture Specification
STATUS:                Production Approved & Implemented (Step 3 & Step 4 Complete)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5
TARGET COST:           INR 0 (Zero-Cash Development Baseline)
========================================================================================
```

---

## 1. Executive Summary & Core Principle: Local-First With Optional Cloud Sync

FoodCue is architected as a **local-first Progressive Web Application (PWA)** that operates primarily inside the user's browser without requiring an account or network connection.

All primary food intelligence functions:
- Barcode decoding (`ZXing-WASM`)
- OCR transcription (Web Worker WASM)
- GS1 Digital Link parsing
- Physical label confirmation gate (`ConfirmedLabel`)
- Deterministic FSSAI allergen and ingredient rule evaluations
- Append-only kitchen pantry event ledger (`PantryEvent`)
- Storage persistence (IndexedDB)

run **100% locally and offline**.

### When Backend Architecture is Invoked
The backend and cloud infrastructure are invoked **strictly when the user explicitly enables Multi-Device Cloud Sync or joins a Household Family Kitchen**:
1. User authenticates via Clerk.
2. The frontend sends the Clerk session Bearer token in the `Authorization` header.
3. The serverless backend verifies the JWT token on the server using `@clerk/backend`.
4. The backend communicates with Neon Lakebase PostgreSQL over connection-pooled serverless HTTP fetch.
5. The browser never accesses the database with privileged credentials and never communicates credentials directly.

---

## 2. Target System Architecture Diagram

```text
                                +-----------------------------+
                                |      FOODCUE CLIENT PWA     |
                                | (Local-first, IndexedDB)    |
                                +--------------+--------------+
                                               |
                               User opts into cloud sync
                                               |
                                               v
                                +-----------------------------+
                                |     CLERK AUTHENTICATION    |
                                |     (Session JWT Token)     |
                                +--------------+--------------+
                                               |
                                Authorization: Bearer <jwt>
                                               |
                                               v
                          +---------------------------------------+
                          |      FOODCUE SERVERLESS API           |
                          | (Vercel Serverless / Edge Functions)  |
                          +--------------------+------------------+
                                               |
                       +-----------------------+-----------------------+
                       |                                               |
                       v                                               v
          +-------------------------+                     +-------------------------+
          |    GET /api/health      |                     |      GET /api/me        |
          |  (Public health probe,  |                     |  (Verified profile,     |
          |   SELECT 1 against DB)  |                     |   idempotent provision) |
          +------------+------------+                     +------------+------------+
                       |                                               |
                       |                                               v
                       |                                  +-------------------------+
                       |                                  |   @clerk/backend        |
                       |                                  |   verifyToken(token)    |
                       |                                  +------------+------------+
                       |                                               |
                       |                                    Extracts verified clerkUserId
                       |                                               |
                       +-----------------------+-----------------------+
                                               |
                                               v
                                +-----------------------------+
                                |    UserRepository & Service |
                                |  (Domain Logic & Filtering) |
                                +--------------+--------------+
                                               |
                                Parameterized Queries ($1, $2)
                                               |
                                               v
                                +-----------------------------+
                                |    NEON LAKEBASE POSTGRES   |
                                |  - Pooled: Runtime queries  |
                                |  - Unpooled: DDL Migrations |
                                +-----------------------------+
```

---

## 3. Technology Stack & Component Allocation

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React + TypeScript + Vite | React 18.3, Vite 6.0 | Client UI & Local-First State |
| **Serverless API Runtime** | Vercel Serverless / Edge Functions | Node.js `>=20.18.0` | Stateless HTTP Handlers (`/api/*`) |
| **Authentication Engine** | `@clerk/backend` & `@clerk/react` | Backend 3.29, React 6.18 | Session Verification & User Management |
| **Database Engine** | Neon Lakebase Serverless PostgreSQL | PostgreSQL 16 (AWS Singapore) | Cloud Backup & Household Multi-Tenancy |
| **Database Driver** | `@neondatabase/serverless` | 1.2.1 | Serverless HTTP/WebSocket Connection Pooler |
| **Validation Library** | `zod` | 3.24.1 | Server Environment & Payload Sanitization |
| **Migration Tooling** | Custom Version-Controlled Runner | Native Node.js ESM | Idempotent DDL Execution against Unpooled Neon |

---

## 4. API Endpoint Specifications

### 4.1 GET `/api/health`
- **Access Level:** Public probe (rate-limited by CDN).
- **Execution:** Executes `SELECT 1 AS ok;` against the pooled Neon connection.
- **Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "application": "foodcue",
    "database": "connected"
  }
  ```
- **Failure Response (503 Service Unavailable):**
  ```json
  {
    "status": "error",
    "application": "foodcue",
    "database": "unavailable"
  }
  ```
- **Security Invariant:** Never outputs connection strings, database passwords, internal hostnames, or system diagnostics.

### 4.2 GET `/api/me`
- **Access Level:** Authenticated only.
- **Requirement:** `Authorization: Bearer <clerk_jwt>` header.
- **Behavior:**
  1. Calls `authenticateRequest(headers)`.
  2. Derives identity exclusively from verified token `sub` claim (`user_...`).
  3. Rejects user ID passed in query strings or body parameters.
  4. Calls `userService.getOrCreateUser(userContext)`.
  5. Returns public user profile.
- **Success Response (200 OK):**
  ```json
  {
    "id": "7f000001-8b22-45e0-8fa3-d89ef1234567",
    "clerkUserId": "user_2testClerkId123",
    "email": "user@example.com",
    "displayName": "User Name",
    "username": "user_kitchen",
    "createdAt": "2026-11-16T12:00:00.000Z"
  }
  ```
- **Failure Response (401 Unauthorized):**
  ```json
  {
    "error": "Authentication required. Missing or invalid Bearer token in Authorization header.",
    "code": "UNAUTHORIZED"
  }
  ```

### 4.3 PATCH `/api/me`
- **Access Level:** Authenticated only.
- **Permitted Fields:** `displayName` (max 100 chars), `username` (alphanumeric, 3-30 chars).
- **Success Response (200 OK):** Returns updated public profile shape.

### 4.4 POST `/api/webhooks/clerk` (Prepared Boundary)
- **Status:** Fail-closed boundary prepared for Phase 5.
- **Behavior:** Returns `503 Service Unavailable` with `WEBHOOK_SECRET_PENDING` until `CLERK_WEBHOOK_SIGNING_SECRET` is configured in the Clerk Dashboard. Refuses to process unverified events.

---

## 5. Security & Isolation Boundaries

1. **Zero Privileged Browser Access:** Neon credentials (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) are server-only environment variables. The browser never connects directly to Neon using master credentials.
2. **Untrusted Identity Prevention:** User identities are extracted strictly from cryptographic JWT verification signatures performed by `@clerk/backend`. Any request body or header containing `x-user-id` is ignored for authentication.
3. **Data Isolation:** Queries in `UserRepository` filter by `WHERE clerk_user_id = $1`. Users can never query or manipulate records belonging to other Clerk IDs.
4. **Soft Deletion Protocol:** Accounts marked deleted via `deleted_at` are blocked from session provisioning with `403 Forbidden` (`FORBIDDEN`).
5. **Sanitized Error Logging:** All database client errors pass through `sanitizeErrorMessage`, which scrubs passwords and connection URIs before throwing `DatabaseError`.

---

## 6. Local Development & Testing Instructions

### Run Automated Tests
```bash
# Execute complete unit and integration suite (85 tests)
npm test -- --run
```

### Run Migrations Locally
```bash
# Execute pending SQL migrations against Neon unpooled direct endpoint
npm run db:migrate
```

### Typecheck & Lint
```bash
npm run typecheck
npm run lint
```
