# FoodCue Neon PostgreSQL Database Setup & Operations Guide
**Step 3 & Step 4: Database Connection, Connection Pooling & Migration Procedures**

```text
========================================================================================
PROJECT:               FoodCue
DATABASE:              Neon Lakebase Serverless PostgreSQL (Project: foodcue)
AWS REGION:            Singapore (ap-southeast-1) — Optimized for India low latency
STATUS:                Connected, Migrated & Live (11 Tables Active)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 §10
========================================================================================
```

---

## 1. Dual-Endpoint Connection Architecture

Neon provides two distinct connection modes. FoodCue leverages both for operational security and performance:

### 1.1 Pooled Connection (`DATABASE_URL`)
- **Endpoint Pattern:** `ep-...-pooler.c-4.ap-southeast-1.aws.neon.tech`
- **Port:** `5432` / WebSocket / HTTP
- **Driver:** `@neondatabase/serverless`
- **Purpose:** Used by serverless API handlers (`/api/*`), runtime user queries, and edge compute.
- **Why Pooling Matters:** Serverless functions scale to thousands of ephemeral invocations. Connection pooling prevents connection starvation and exhausting PostgreSQL max connections.

### 1.2 Direct / Unpooled Connection (`DATABASE_URL_UNPOOLED`)
- **Endpoint Pattern:** `ep-...c-4.ap-southeast-1.aws.neon.tech` (without `-pooler`)
- **Port:** `5432` (Direct TCP)
- **Purpose:** Schema migrations, DDL statements (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`), and administrative scripts.
- **Why Direct Matters:** PgBouncer transaction pooling restricts certain multi-statement DDL and lock-holding operations. Direct connections execute complete administrative scripts reliably.

---

## 2. Environment Variables Configuration

In `.env` and `.env.local`:

```env
# Neon PostgreSQL - Pooled (Serverless API & Runtime)
DATABASE_URL="postgresql://neondb_owner:YOUR_SECRET_PASSWORD@ep-snowy-mode-b3jn52y5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
VITE_NEON_DATABASE_URL="postgresql://neondb_owner:YOUR_SECRET_PASSWORD@ep-snowy-mode-b3jn52y5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Neon PostgreSQL - Direct / Unpooled (Migrations & DDL)
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:YOUR_SECRET_PASSWORD@ep-snowy-mode-b3jn52y5.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEON_DATABASE_URL_UNPOOLED="postgresql://neondb_owner:YOUR_SECRET_PASSWORD@ep-snowy-mode-b3jn52y5.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

> **IMPORTANT:** Never commit credentials to version control. Maintain placeholders only in `.env.example`.

---

## 3. Database Migration Procedures

FoodCue uses version-controlled, idempotent SQL migrations located in `src/server/database/migrations/`.

### How to Run Migrations
Run the automated migration runner:
```bash
npm run db:migrate
```

### Migration Ledger Table (`foodcue_schema_migrations`)
The migration runner automatically creates and updates `foodcue_schema_migrations` in Neon:
```sql
CREATE TABLE IF NOT EXISTS foodcue_schema_migrations (
  migration_name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64)
);
```
- Each `.sql` file in `src/server/database/migrations/` is executed exactly once.
- Subsequent runs detect existing entries and skip them automatically.
- Checksums verify file integrity and prevent silent drift.

---

## 4. Connection Verification & Health Checks

### Programmatic Health Check via Code
```typescript
import { checkDatabaseHealth } from "./src/server/database/client";

const health = await checkDatabaseHealth();
console.log(health);
// Output: { connected: true, latencyMs: 28 }
```

### Via HTTP Endpoint
```bash
curl -X GET https://your-foodcue-deployment.vercel.app/api/health
```
Response:
```json
{
  "status": "ok",
  "application": "foodcue",
  "database": "connected"
}
```

---

## 5. Troubleshooting & FAQ

### Issue: `cannot insert multiple commands into a prepared statement`
- **Cause:** Using `sql.query()` with a multi-statement script containing semicolons.
- **Solution:** The FoodCue migration runner in `scripts/run-migrations.mjs` safely splits multi-statement SQL files into individual commands while preserving `DO $$ ... END $$;` blocks.

### Issue: Connection timeout on cellular or strict networks
- **Cause:** Standard PostgreSQL TCP port 5432 is blocked by corporate firewall or mobile ISP.
- **Solution:** `@neondatabase/serverless` automatically routes queries over HTTP `fetch` (port 443), bypassing port 5432 restrictions entirely.

### Issue: Database credentials leaked in terminal or test logs
- **Remedy:** All client errors in `src/server/database/client.ts` are automatically sanitized via `sanitizeErrorMessage()` to scrub connection strings before re-throwing `DatabaseError`.
