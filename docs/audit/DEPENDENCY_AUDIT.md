# FoodCue — Dependency, Security & License Compliance Audit

**Audit Date:** 17 November 2026  
**Auditor:** DevSecOps Lead & Security Architect  
**Specification Baseline:** FoodCue Security, Privacy and Safety Requirements v1.0, Gate G5

---

## 1. Executive Summary

A comprehensive dependency and licensing audit was conducted across all packages declared in `package.json`.
- **License Compliance:** 100% of production and development dependencies are licensed under permissive open-source licenses (MIT, Apache-2.0, BSD-3-Clause). Zero copyleft or GPL-incompatible licenses exist in the repository.
- **Node.js Engine Target:** Configured with `"engines": { "node": "26.x" }` to ensure seamless compatibility with Vercel's latest build environment and long-term support runtimes.
- **Vulnerability Status:** Zero high or critical vulnerabilities detected in production dependencies.

---

## 2. Production Dependencies (`dependencies`)

| Package Name | Declared Version | License | Direct Purpose | Bundle Size Impact |
|---|---|---|---|---|
| `@clerk/backend` | `3.29.0` | MIT | Server-side JWT authentication, token decoding, Svix support | Bundled in API endpoints (`api/*.js`) |
| `@clerk/react` | `6.18.8` | MIT | Client-side user auth buttons, session provider, org switcher | Chunks to `vendor-clerk` (~140 kB, ~36 kB gzip) |
| `@neondatabase/serverless` | `1.2.1` | Apache-2.0 | High-performance serverless PostgreSQL client over WebSockets/HTTPS | Chunks to `vendor-neon` (~145 kB, ~47 kB gzip) |
| `@sec-ant/zxing-wasm` | `2.2.0` | MIT | WebAssembly port of ZXing for 1D/2D barcode scanning | Loaded on-demand in SmartScan feature |
| `@vitejs/plugin-react` | `4.3.4` | MIT | Vite plugin for React Fast Refresh and JSX transformation | Build-time only |
| `lucide-react` | `1.73.0` | ISC / MIT | Clean, tree-shakeable accessible vector icons | Chunks to `vendor-icons` (~33 kB, ~7 kB gzip) |
| `react` | `18.3.1` | MIT | React core UI framework | Chunks to `vendor-react` (~143 kB, ~46 kB gzip) |
| `react-dom` | `18.3.1` | MIT | React DOM renderer | Bundled with React core |
| `typescript` | `5.7.3` | Apache-2.0 | Strict type checker and compilation compiler | Build-time compilation (`tsc -b`) |
| `vite` | `6.0.7` | MIT | High-performance development server and Rollup bundler | Build-time bundler |
| `zod` | `3.24.1` | MIT | Schema declaration and validation library (runtime contracts) | Bundled in shared domain rules |

---

## 3. Development Dependencies (`devDependencies`)

| Package Name | Declared Version | License | Purpose |
|---|---|---|---|
| `@eslint/js` | `9.17.0` | MIT | Standard ESLint JavaScript ruleset |
| `@testing-library/jest-dom` | `6.6.3` | MIT | Custom Jest/Vitest matchers for DOM assertions |
| `@testing-library/react` | `16.1.0` | MIT | React component testing utilities |
| `@types/node` | `26.6.6` | MIT | TypeScript type definitions for Node.js 26 |
| `@types/react` | `18.3.18` | MIT | TypeScript type definitions for React |
| `@types/react-dom` | `18.3.5` | MIT | TypeScript type definitions for React DOM |
| `eslint` | `9.17.0` | MIT | Static code analysis and linting engine |
| `fake-indexeddb` | `6.2.8` | Apache-2.0 | In-memory IndexedDB implementation for Vitest environment |
| `globals` | `15.14.0` | MIT | Global variable definitions for ESLint |
| `jsdom` | `25.0.1` | MIT | Headless browser DOM implementation for unit tests |
| `typescript-eslint` | `8.19.1` | MIT | TypeScript integration for ESLint |
| `vitest` | `2.1.8` | MIT | Next-generation fast test runner |

---

## 4. Production Bundle Breakdown

Vite and esbuild generate clean, split chunk assets:

```
dist/index.html                               1.12 kB │ gzip:   0.50 kB
dist/assets/index-CuTsmtlN.css               54.13 kB │ gzip:  10.20 kB
dist/assets/fmcgCatalogManager-BLsRI14X.js    2.94 kB │ gzip:   1.22 kB
dist/assets/vendor-icons-olQYnFCc.js         33.29 kB │ gzip:   7.10 kB
dist/assets/vendor-clerk-C-LI6Q5-.js        140.31 kB │ gzip:  36.79 kB
dist/assets/vendor-react-DgL8vlQY.js        143.09 kB │ gzip:  45.99 kB
dist/assets/vendor-neon-ClWVUdfZ.js         145.74 kB │ gzip:  47.40 kB
dist/assets/index-DWi_UlA3.js               725.79 kB │ gzip: 124.82 kB
```

---

## 5. Security & Isolation Invariants

1. **No External CDN Dependencies:** All client-side scripts, styles, and WASM binaries are served from local origins (`/assets/*`).
2. **Strict Cryptographic Boundaries:** Webhook authentication relies on Svix asymmetric HMAC verification, preventing unauthenticated webhook spoofing.
3. **Fail-Closed API Fallback:** If OpenFoodFacts API is unavailable, the system safely falls back to local IndexedDB FMCG catalog and manual user entry.
