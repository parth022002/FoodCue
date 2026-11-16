# FoodCue Clerk Authentication & Identity Specification
**Step 3 & Step 4: Server-Side Token Verification, User Identity Mapping & Household Sharing**

```text
========================================================================================
PROJECT:               FoodCue
DOCUMENT:              Clerk Authentication Specification
CLERK APP ID:          app_3MC7IlXNBCw4NVWOxhqO29cod7r
CLERK INSTANCE ID:     ins_3MC7Ikqni5AxVC7jGmzwBrcAWQW
DOCUMENT VERSION:      v2.0
STATUS:                Production Approved & Implemented
DATE:                  16 November 2026
========================================================================================
```

---

## 1. Core Principle: Zero Mandatory Accounts

FoodCue is designed from the ground up to **protect consumer privacy and operate locally by default**.

- **Anonymous Operation:** When a user opens FoodCue, they are never prompted or forced to sign up. They can immediately scan packaging barcodes, OCR ingredient labels, evaluate allergens against a local avoid-list, and manage pantry items in browser IndexedDB.
- **Explicit User Consent:** Cloud synchronisation and Clerk authentication are only engaged when the user explicitly clicks:
  > *"Sign In / Sign Up"* or *"Enable Household Multi-Device Sync"*
- **Offline Resilience:** If network connectivity drops or the user signs out, all local records, catalog caches, and pantry stock remain fully functional on device.

---

## 2. Clerk Configuration & Environment Variables

| Variable | Scope | Purpose | Secret / Public? | Example Value |
|---|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Client | Initializes `<ClerkProvider>` in `src/main.tsx` | **Public** (Frontend) | `pk_test_d2FybS1tYX...` |
| `CLERK_SECRET_KEY` | Serverless Backend | Verifies session tokens via `@clerk/backend` | **Strictly Secret** (Server-only) | `sk_test_p8vtXbEc...` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Serverless Backend | Validates webhook signatures in Phase 5 | **Strictly Secret** (Server-only) | Pending owner configuration |

---

## 3. Server-Side Session Verification Architecture

```text
[ Browser Client ]
       |
       |  1. Obtains session token: const token = await window.Clerk.session.getToken();
       |  2. Sends request with header: Authorization: Bearer <token>
       v
[ FoodCue Backend: /api/me ]
       |
       |  3. authorization.ts: extractBearerToken(req.headers)
       |  4. clerk.ts: verifyClerkSessionToken(token, secretKey)
       v
[ @clerk/backend ]
       |
       |  5. Cryptographically verifies JWT signature against Clerk JWKS
       |  6. Validates expiration timestamp (exp), audience, and issuer
       |  7. Returns verified claims payload with sub = "user_2test..."
       v
[ FoodCue Backend: UserService ]
       |
       |  8. Derives user identity exclusively from payload.sub
       |  9. Reconciles with Neon PostgreSQL: UserRepository.findByClerkUserId(sub)
       v
[ JSON Response ]
```

---

## 4. User Identity Mapping & Data Model

FoodCue decouples external authentication from internal database IDs:

| Field | Source | Purpose |
|---|---|---|
| `id` | Generated UUID (`gen_random_uuid()`) | Permanent internal FoodCue identifier |
| `clerk_user_id` | Verified Clerk claim (`sub`) | Stable external identity anchor (`user_...`) |
| `email` | Optional Clerk primary email | Communication & account recovery (optional) |
| `display_name` | Derived from firstName + lastName | Friendly kitchen greeting in app |
| `username` | Optional Clerk username | Handle for household invitations |
| `deleted_at` | Internal Soft-Delete Timestamp | Deactivation flag |

### Why Email is NOT the Primary Key
1. **Apple Private Relay:** Apple sign-in frequently masks emails with randomized relay addresses.
2. **Email Changes:** Users may update their email address in Clerk without wishing to lose their pantry ledger or historical scans.
3. **Identity Stability:** The Clerk User ID (`user_2...`) is globally immutable and guaranteed unique by Clerk.

---

## 5. Clerk Organizations for Household Kitchen Sharing

FoodCue implements Clerk Organizations to provide collaborative pantry and meal management:

- **Household Representation:** Each Clerk Organization corresponds to a shared household (e.g., *"The Sharma Family Kitchen"*).
- **Multi-Tenancy:**
  - Active organization context is retrieved via `useOrganization()`.
  - When in household mode, queries to Neon PostgreSQL filter by `household_id = organization.id`.
  - Inventory updates and consumption events committed by any family member replicate to all other members in real time.
- **Personal Mode:** When a user is not in an organization, items are saved under personal user scope (`household_id IS NULL`), maintaining individual privacy.

---

## 6. Security & Anti-Spoofing Rules

1. **Never Trust Client-Submitted Identity:** The backend ignores any `x-user-id`, `userId`, or `clerkUserId` fields submitted in query strings or request bodies. Identity is accepted **strictly** from the cryptographic `sub` claim of the verified Bearer token.
2. **Fail Closed:** If a Bearer token is missing, malformed, expired, or signed with an invalid key, the API immediately halts and returns HTTP 401 Unauthorized (`UNAUTHORIZED`).
3. **Deactivated Account Enforcement:** If `deleted_at IS NOT NULL` in the database, the API returns HTTP 403 Forbidden (`FORBIDDEN`).
