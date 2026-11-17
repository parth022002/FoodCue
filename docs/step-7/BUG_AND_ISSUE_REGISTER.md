# FoodCue Step 7 Bug and Issue Register

**Document Version:** 1.0.0  
**Project:** FoodCue (Packaged Food Intelligence & Kitchen Management PWA)  
**Classification Standard:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low)  
**Status:** **ALL P0 & P1 DEFECTS RESOLVED — NO BLOCKING DEFECTS REMAIN**

---

## 1. Defect Classification & Remediation Log

| Defect ID | Priority | Description | Root Cause | Remediation Applied | Status |
|---|---|---|---|---|---|
| `DEF-001` | **P0** | Webhook handler crashed with `null value in column "user_id" of relation "foodcue_users" violates not-null constraint`. | `foodcue_users.user_id` was marked `NOT NULL` without default; insert omitted it. | Set `user_id = clerkUserId` in upsert query; added migration `001_initial_users.sql`. | **FIXED & VERIFIED** |
| `DEF-002` | **P0** | Clerk Svix signature mismatch on Vercel deployment causing 401 on valid webhooks. | Vercel's default `bodyParser: true` consumed raw HTTP stream, modifying byte encoding before HMAC hashing. | Added `export const config = { api: { bodyParser: false } }` and raw stream reconstructor. | **FIXED & VERIFIED** |
| `DEF-003` | **P1** | Vite build warning: monolithic bundle chunks exceeded 500 kB limit. | Clerk and Neon SDKs bundled into single main vendor chunk. | Added Rollup `manualChunks` split in `vite.config.ts`, dividing vendor libraries into 5 small chunks (<242 kB each). | **FIXED & VERIFIED** |
| `DEF-004` | **P1** | Unbounded batch size on `/api/sync/push` allowed arbitrary payload bloat. | Missing array length validation on serverless endpoint. | Added strict boundary check rejecting batches exceeding 100 operations with HTTP 400 `BATCH_SIZE_EXCEEDED`. | **FIXED & VERIFIED** |
| `DEF-005` | **P1** | Modal dialogs lacked Escape key dismissal, violating WCAG 2.1.2. | `MigrationWizard.tsx` and `ConnectedDevicesView.tsx` lacked keyboard event listeners. | Added `Escape` key event listener in `useEffect` and `role="dialog"` accessibility attributes. | **FIXED & VERIFIED** |
| `DEF-006` | **P1** | Sparse webhook updates could overwrite valid existing fields with null. | Direct column assignments overwrote fields if omitted in webhook data. | Updated upsert query to use `COALESCE(EXCLUDED.field, foodcue_users.field)` for email, display name, and username. | **FIXED & VERIFIED** |
| `DEF-007` | **P2** | Local change queue item ordering had race condition when enqueued in same millisecond. | `createdAt` timestamps tied at identical millisecond. | Implemented monotonic timestamp generator `getMonotonicIso()` in `localChangeQueue.ts`. | **FIXED & VERIFIED** |
| `DEF-008` | **P2** | Limited INS additive coverage in food intelligence engine. | Hardcoded registry contained only 13 additives. | Expanded `COMMON_ADDITIVES` to 30 common Indian FMCG additives with human-readable purposes. | **FIXED & VERIFIED** |

---

## 2. Issue Disposition Summary
- **Total Issues Logged:** 8
- **P0 Critical Issues Resolved:** 2 / 2 (100%)
- **P1 High Issues Resolved:** 4 / 4 (100%)
- **P2 Medium Issues Resolved:** 2 / 2 (100%)
- **Open Unresolved Blocking Defects:** 0
