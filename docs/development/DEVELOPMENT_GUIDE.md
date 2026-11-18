# FoodCue — Engineering & Development Guide

This guide outlines code standards, architectural patterns, directory structures, and testing guidelines for FoodCue engineers.

---

## 1. Codebase Structure

```text
FoodCue/
├── api/                      # Bundled Vercel serverless handlers (build output)
├── data/                     # Offline seed data (500+ Indian FMCG catalog items)
├── docs/                     # Canonical documentation directory
├── public/                   # Static assets, icons, manifest.webmanifest, sw.js
├── scripts/                  # Migration, verification, benchmark, and bundling scripts
├── src/
│   ├── adapters/             # External adapters (Storage, AI, OCR, Notifications)
│   │   ├── ai/               # Groq and OpenRouter adapter implementations
│   │   ├── notifications/    # Web Push VAPID subscriber
│   │   ├── ocr/              # Tesseract.js Web Worker and image preprocessors
│   │   └── storage/          # Dexie IndexedDB client and sync conflict resolver
│   ├── components/           # Reusable UI components, Navbar, modals, status banners
│   ├── domain/               # Pure business logic and domain services
│   │   ├── contracts/        # TypeScript interfaces and confirmed label schemas
│   │   ├── rules/            # Health scoring, GTIN validation, allergen rules
│   │   └── services/         # Pantry ledger, FMCG catalog manager, AI nutrition agents
│   ├── features/             # Feature-specific views (SmartScan, Kitchen, Profile)
│   ├── server/               # Serverless backend source (Auth, Database, Endpoints)
│   │   ├── auth/             # Clerk backend client and Svix webhook verifier
│   │   ├── database/         # Neon pooled and unpooled client connection
│   │   └── endpoints/        # Serverless API TypeScript handlers
│   ├── App.tsx               # Root application router and layout
│   └── main.tsx              # Entry point with ClerkProvider and service worker
├── test/                     # Vitest automated test suites
│   ├── adapters/             # OCR, storage, and notification adapter tests
│   ├── domain/               # Business logic and health score tests
│   ├── e2e/                  # End-to-end multi-journey integration tests
│   ├── features/             # UI component and viewfinder tests
│   ├── integrations/         # OpenFoodFacts and external API tests
│   ├── safety/               # Adversarial food safety tests
│   ├── security/             # Security threat and QR injection tests
│   └── server/               # API endpoint and Clerk webhook verification tests
└── package.json              # Dependencies and lifecycle scripts
```

---

## 2. Engineering Conventions

### TypeScript Standards
- **Strict Mode:** Enabled (`strict: true` in `tsconfig.json`).
- **No Any:** Avoid explicit `any`. Model domain entities using interfaces and Zod schemas.
- **Null Safety:** Missing nutritional values must be explicitly typed as `number | null`. Do not convert missing values to `0`.

### State Management
- **Local State:** React hooks (`useState`, `useReducer`, `useMemo`) for component state.
- **Persistent State:** All user data (pantry items, avoid-lists, shopping lists) is committed to Dexie IndexedDB via domain service methods (`pantryLedger`, `userCatalogueService`).
- **Cloud Sync:** Client components interact with local Dexie stores; background synchronization queues handle replication silently.

---

## 3. Serverless API Handler Pattern

Every serverless endpoint in `src/server/endpoints/` follows a standardized structure:
1. **Method Check:** Enforce allowed HTTP methods (e.g. `POST`, `GET`).
2. **Authentication & Tenant Scoping:** Extract Clerk session token and active organization ID.
3. **Zod Validation:** Parse request body through strict Zod schemas with fail-closed errors.
4. **Parameterized SQL:** Execute queries against Neon using the tagged template literal `sql`...`` to eliminate SQL injection risks.
5. **Standardized JSON Response:** Return `{ success: true, data: ... }` or `{ success: false, error: ... }` with appropriate HTTP status codes.

---

## 4. Testing & Continuous Integration

Every pull request must pass the automated CI pipeline:
```bash
npm run typecheck && npm run lint && npm test && npm run build
```

- **Unit Tests:** Placed alongside source files or in `test/domain/`.
- **Integration Tests:** Located in `test/server/` and `test/integrations/`.
- **E2E Journeys:** Located in `test/e2e/phase11UserJourneys.test.ts`.
