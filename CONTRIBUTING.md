# Contributing to FoodCue

Thank you for your interest in contributing to **FoodCue** (*Know your food. Manage your kitchen.*)!

FoodCue is built with a **local-first, privacy-first, and food-safety-first** philosophy. We welcome contributions that maintain these principles, improve code quality, enhance barcode/packaging OCR recognition, or improve accessibility.

---

## 1. Development Principles

1. **Local-First & Zero-Account Guarantee:** Core scanning, local pantry logging, health scoring, and avoid-list checks must function 100% offline in IndexedDB without requiring user sign-in.
2. **Deterministic Food Safety:** Never fabricate, hallucinate, or guess nutrient values. Missing nutrients must remain `null`. Allergen alerts must fail-closed.
3. **Zero Image Retention:** Pack photos and video stream frames must only be processed in ephemeral canvas memory. Never upload or persist camera images to any server.
4. **INR 0.00 Development Budget:** All core dependencies, databases, authentication, and external services must stay within free/open tiers.

---

## 2. Getting Started

### Prerequisites
- **Node.js:** v20.x or v22.x (LTS)
- **npm:** v10.x+
- **Git**

### Installation
```bash
# Clone the repository
git clone https://github.com/parth022002/FoodCue.git
cd FoodCue

# Install dependencies
npm ci

# Start the local development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 3. Quality Assurance & Verification

Before submitting a Pull Request, all automated checks must pass:

```bash
# 1. Typecheck TypeScript
npm run typecheck

# 2. Run linter
npm run lint

# 3. Run all unit and integration tests (Vitest)
npm test

# 4. Verify production bundle and serverless API build
npm run build
```

---

## 4. Branching & Commit Conventions

- Create a feature or fix branch from `main`:
  - `feat/feature-name`
  - `fix/bug-description`
  - `docs/documentation-update`
  - `chore/maintenance-task`
- Follow Conventional Commits:
  - `feat: add camera torch toggle support`
  - `fix: resolve allergen regex match on case variants`
  - `test: add unit tests for sync conflict resolver`

---

## 5. Documentation

Refer to the canonical documentation in `docs/`:
- **Architecture:** [SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md)
- **Database Model:** [DATABASE_SCHEMA.md](docs/architecture/DATABASE_SCHEMA.md)
- **Environment Variables:** [ENVIRONMENT_VARIABLES.md](docs/development/ENVIRONMENT_VARIABLES.md)
- **Testing Guide:** [TESTING_AND_QUALITY_ASSURANCE.md](docs/testing/TESTING_AND_QUALITY_ASSURANCE.md)
