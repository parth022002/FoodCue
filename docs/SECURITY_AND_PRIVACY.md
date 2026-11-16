# FoodCue Security, Privacy and Safety Controls — v2.0
**A Concrete Technical Specification of Security Boundaries, Threat Mitigations, and Privacy Controls**

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
DOCUMENT TITLE:        Security, Privacy and Safety Requirements & Controls
DOCUMENT VERSION:      v2.0 (Postgres Cloud Ready & Production Frontend Complete)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 (Final Controlled Baseline)
PRODUCT SPECIFICATION: FoodCue Product Development Requirements Document (PRD) v1.3
SECURITY BASELINE:     FoodCue Security, Privacy and Safety Requirements v1.0
STATUS:                Production Security Controls Verified & Active
========================================================================================
```

---

## 1. Core Principles

1. **Local-First Privacy:** All user data (pantry contents, dietary avoidances, consumption logs, and shopping lists) is created and stored in local browser IndexedDB by default.
2. **Zero Client Secrets:** Private API keys, database administrative credentials, and secret signing tokens are **never** bundled into public frontend code.
3. **No Automatic Network Side Effects:** Decoded QR codes and scanned URLs **never** trigger automatic navigation, fetching, redirects, or short-link expansions.
4. **Deterministic Safety Authority:** No AI model or large language model may generate or override food safety, allergen, or health conclusions.

---

## 2. Threat Mitigations & Technical Controls

### 2.1 QR Code & Barcode Security
- **Anti-Auto-Navigation:** Scanned QR payloads are treated as untrusted text strings. `src/domain/rules/payloadClassifier.ts` classifies payloads into GS1 Digital Link, standard HTTPS, plain text, and unsafe schemes.
- **Protocol Whitelist:** Unsafe protocols (`javascript:`, `data:`, `file:`, `blob:`, `vbscript:`) are rejected and flagged as `unsafe_scheme`.
- **Domain Verification:** External HTTPS links display a safe origin preview with punycode resolution to prevent IDN homograph phishing. The user must click explicitly to open an external link in a new browser tab with `rel="noopener noreferrer"`.

### 2.2 Client-Side Image Privacy & Memory Lifecycle
- **Memory-Only Processing:** Video frames and uploaded photos exist strictly in volatile browser memory (`ArrayBuffer` / `Blob`).
- **Zero Cloud Image Uploads:** Camera frames and packaging photos are processed exclusively on the client device via Canvas and WebAssembly. No photos are transmitted to any cloud server.
- **Stream Cleanup:** Active webcam tracks are stopped and detached via `MediaStreamTrack.stop()` immediately when the user navigates away from the scanner.

### 2.3 Zero-Secret Client Bundle Architecture
- **Public Environment Variables Only:** Only public configuration variables prefixed with `VITE_` (`VITE_APP_NAME`, `VITE_NEON_DATABASE_URL` pooler) are present in the build bundle.
- **Serverless Secret Proxying:** Phase 2 external AI endpoints (OpenRouter, Groq) and Clerk secret keys must route through Vercel Serverless/Edge Functions where secrets reside in encrypted server environment variables.
- **Git Hygiene:** `.env` and `.env.*` are excluded in `.gitignore`. A sanitized `.env.example` template is provided.

### 2.4 Browser Storage Lifecycle & Eviction Mitigation
- **Storage Quota Monitoring:** `Privacy.tsx` integrates `navigator.storage.estimate()` to meter local storage usage against browser quotas.
- **Storage Eviction Canary:** FoodCue requests `navigator.storage.persist()` on supported browsers to safeguard local IndexedDB data against aggressive operating system cache sweeps.
- **One-Click Factory Reset:** A dedicated data wipe function (`clearFoodCueData()`) deletes all records across all IndexedDB stores, clears local caches, and resets application state.
- **Portable Backups:** Users can export their complete pantry ledger and confirmed packs to an offline, versioned JSON file at any time.

### 2.5 Cloud Database Security (Neon PostgreSQL)
- **Transport Security:** Connection to Neon requires strict TLS encryption (`sslmode=require&channel_binding=require`).
- **Connection Pooling:** Uses `@neondatabase/serverless` over HTTP/WebSocket connection pooling to avoid exposing long-lived direct TCP connections.
- **Tamper-Evident Audit Log:** A dedicated table `foodcue_audit_log` records cloud backup events, schema initializations, and data wipe events with anonymized IP hashes.

### 2.6 Production Security Headers (`_headers` and `vercel.json`)
The following HTTP security headers are enforced across all production deployments:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), geolocation=(), microphone=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.neon.tech https://world.openfoodfacts.org; img-src 'self' data: blob: https:; worker-src 'self' blob:;
```

---

```text
========================================================================================
END OF FOODCUE SECURITY, PRIVACY AND SAFETY CONTROLS (v2.0)
========================================================================================
```
