# FoodCue — Local Project Setup & Developer Guide

**Project:** FoodCue (Health Application)  
**Repository:** [github.com/parth022002/FoodCue](https://github.com/parth022002/FoodCue)  
**Primary Tech Stack:** React 18, TypeScript 5.7, Vite 6, Neon PostgreSQL, Clerk Authentication, WebAssembly ZXing

---

## 1. Prerequisites

Before installing FoodCue on your development machine, ensure you have the following installed:

1. **Node.js:** Version 20.x or 22.x LTS (Recommended: Node.js 22 LTS). Check with:
   ```bash
   node -v
   ```
2. **npm:** Version 10.x or higher (comes bundled with Node.js).
3. **Git:** Installed and configured. Check with:
   ```bash
   git --version
   ```
4. **Modern Web Browser:** Chrome, Edge, Safari, or Firefox with camera support.

---

## 2. Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/parth022002/FoodCue.git
cd FoodCue
```

### Step 2: Install Node Dependencies
Install all required runtime and development packages:
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a local environment file by copying `.env.example`:
```bash
cp .env.example .env.local
```
Open `.env.local` in your editor and fill in your keys:
- **`VITE_CLERK_PUBLISHABLE_KEY`**: Your Clerk Publishable Key (`pk_test_...`).
- **`CLERK_SECRET_KEY`**: Your Clerk Secret Key (`sk_test_...`).
- **`DATABASE_URL`**: Your Neon Pooled Connection URL.
- **`DATABASE_URL_UNPOOLED`**: Your Neon Direct Unpooled Connection URL.
- **`CLERK_WEBHOOK_SIGNING_SECRET`**: Your Svix Webhook Signing Secret (`whsec_...`).

*(Note: For immediate local testing, you can copy the values from `.env` if already provisioned).*

### Step 4: Run Database Migrations
Initialize the Neon PostgreSQL database with all 15 required tables and indexes:
```bash
npm run db:migrate
```
Expected output:
```
Connecting to Neon PostgreSQL direct/unpooled endpoint for migrations...
✓ Table foodcue_schema_migrations ready
- Migration 001_initial_users.sql already applied
- Migration 002_sync_engine_and_devices.sql already applied
Migration execution finished successfully.
```

### Step 5: Start the Development Server
Launch the Vite local development server:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 3. Verification & Quality Commands

Always run these commands before submitting changes or creating pull requests:

| Command | Purpose | Expected Result |
| :--- | :--- | :--- |
| `npm run typecheck` | Validates TypeScript types across the entire project | Exits with code 0 and 0 errors |
| `npm test` | Runs the full Vitest suite (42 test suites, 235+ tests) | All 42 suites pass with 100% success |
| `npm run build` | Builds the client bundle and bundles Vercel serverless handlers | Generates `dist/` and `api/` output without errors |
| `npm run lint` | ESLint static code quality analysis | Zero critical errors |

---

## 4. Key Local Feature Testing Walkthrough

1. **Test Instant Product Search:**
   - In the navigation bar, click **Search**.
   - Type `"Tata Salt"` or click one of the popular suggestion chips (e.g. `Amul Butter`, `Maggi 2-Minute Noodles`).
   - Click **View Food Intelligence** to open the comprehensive modal with health gauge, nutrition table, and plain-English takeaways.

2. **Test Barcode & OCR Scanner:**
   - Click **SmartScan**.
   - Grant camera permissions when prompted by your browser.
   - Point your camera at any FMCG barcode or ingredient label.
   - The scanner instantly decodes the barcode locally using WebAssembly.

3. **Test Guest vs. Authenticated Mode:**
   - As an unauthenticated guest: Explore the landing page, search foods, and evaluate health scores. Click **Save to Catalogue** to observe the sign-in modal.
   - Sign in via Clerk: Observe the **Authenticated Dashboard**, your active allergy guard, and add items to your private catalogue.
