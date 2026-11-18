# FoodCue — Developer Workstation Setup Guide

This guide provides step-by-step instructions for configuring a local FoodCue development environment.

---

## 1. Prerequisites

Before setting up the project, ensure your environment meets the following requirements:

- **Node.js:** v20.x or v22.x LTS (`node -v`)
- **npm:** v10.x+ (`npm -v`)
- **Git:** v2.30+ (`git -v`)
- **Operating System:** macOS, Linux, or Windows (PowerShell / WSL)

---

## 2. Installation Steps

### Step 1: Clone the Repository
```bash
git clone https://github.com/parth022002/FoodCue.git
cd FoodCue
```

### Step 2: Install Node Dependencies
```bash
npm ci
```

### Step 3: Configure Environment Variables
Copy the example environment template:
```bash
cp .env.example .env.local
```

For local offline development, FoodCue functions immediately with mock/offline credentials. To connect cloud features, populate `.env.local` using the instructions in [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

### Step 4: Verify Database Connectivity & Run Migrations
If using a live Neon PostgreSQL database:
```bash
npm run db:migrate
```

### Step 5: Start the Development Server
```bash
npm run dev
```
Open your browser to `http://localhost:5173`.

---

## 3. Verification Commands

Run the complete validation suite to confirm your installation:

```bash
# Typecheck TypeScript files
npm run typecheck

# Lint source files
npm run lint

# Run all 43 automated test suites (240 tests)
npm test

# Verify production build and serverless API bundling
npm run build
```

---

## 4. Common Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `EPERM: operation not permitted` on Windows | Antivirus or sandbox file lock on node_modules | Exclude project directory from active scanning or rerun in elevated shell. |
| `Cannot find module jsdom` during `npm test` | Incomplete devDependencies installation | Run `npm ci` to cleanly install all locked package versions. |
| `DATABASE_URL is not set` | Missing database configuration | Verify `.env` or `.env.local` exists in the project root directory. |
| Camera viewfinder is black in desktop browser | Missing webcam permissions or unsecure HTTP origin | Open via `http://localhost:5173` (localhost is treated as secure context) and grant camera permissions. |
