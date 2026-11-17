# FoodCue — Phase 11.9 Operations, Incident Readiness & Recovery Guide

**Role:** DevOps Engineer & Site Reliability Specialist  
**Target Systems:** Vercel Serverless Platform, Neon PostgreSQL, Clerk Auth, Web Push Services  
**Audience:** Project Owner & Operations Team

---

## 1. Database Backup & Point-in-Time Recovery (PITR)

Neon PostgreSQL automatically manages durability and point-in-time history via its copy-on-write storage architecture.

### Automatic Neon Point-in-Time Recovery:
1. Open the [Neon Console](https://console.neon.tech) and select the `ep-snowy-mode-...` project.
2. In the left navigation, click **Branches**.
3. Click **Create Branch** and select **Point in time**.
4. Choose the exact timestamp (down to the second) prior to the data corruption or accidental deletion incident.
5. Neon will instantly spin up a restore branch with identical schemas and data without altering the active branch.
6. To switch production to the restored branch, promote it or update the connection string in Vercel.

### Manual SQL Dump Backup (Recommended Weekly):
To create an offline standalone PostgreSQL dump:
```bash
pg_dump "YOUR_DATABASE_URL_UNPOOLED" --clean --if-exists -f foodcue_backup_$(date +%Y%m%d).sql
```

---

## 2. Vercel Instant Deployment Rollback Procedure

If a bad commit or deployment causes runtime crashes:
1. Go to [Vercel Dashboard](https://vercel.com) -> Select `FoodCue`.
2. Click the **Deployments** tab.
3. Locate the last known good deployment (e.g., Commit `27945c0` or `ff8bf5b`).
4. Click the three dots (`...`) on the right of that deployment and select **Instant Rollback**.
5. Vercel will instantly switch edge traffic back to that build in less than 5 seconds with zero build delay.

---

## 3. Failed Webhook Monitoring & Manual Replay

When Clerk sends a webhook (e.g. `user.created` or `user.deleted`), if the endpoint returns an error:
1. In [Clerk Dashboard](https://dashboard.clerk.com), navigate to **Configure -> Webhooks**.
2. Click your webhook endpoint (`/api/webhooks/clerk`).
3. View the **Message Attempts** ledger.
4. Any failed delivery shows a red `Failed` badge with the exact HTTP status code and response body.
5. Click the circular **Replay** button (🔄) next to the failed message to trigger immediate redelivery.
6. Because FoodCue's endpoint is completely idempotent (ledgered in `foodcue_webhook_events`), replaying a webhook will never create duplicate accounts or corrupt state.

---

## 4. Production Zero-Leak Incident Logging Standard

FoodCue strictly prohibits printing credentials or sensitive personal information in logs:
- **Database URLs:** Stored connection strings in errors are passed through `sanitizeErrorMessage` in `src/server/database/client.ts`, replacing passwords with `[REDACTED]`.
- **User Medical / Allergy Data:** User avoid-lists are processed in client memory and are never echoed into cloud access logs.
- **Serverless Logs:** Viewable in real-time under **Vercel Dashboard -> Logs**. Filters: `status:500` or `path:/api/sync/*`.

---

## 5. Triage Runbook for Common Incidents

| Incident Symptom | Root Cause Diagnosis | Immediate Remediation Action |
| :--- | :--- | :--- |
| **Users see "Database offline" banner** | Neon compute auto-suspend wake delay or connection limit exceeded | Open Neon Console -> Check compute state. If inactive, send a health ping to `/api/health` to trigger auto-wake. |
| **Sign-in succeeds but dashboard is blank** | Missing Clerk Webhook delivery (`user.created` not processed) | Check Clerk Webhook dashboard. If failed, verify `CLERK_WEBHOOK_SIGNING_SECRET` matches Vercel environment variables. Replay event. |
| **Camera shows black screen on phone** | Non-HTTPS origin or denied camera permission | Confirm the site is loaded over `https://` (not `http://`). In browser settings, toggle Camera permission to "Allow". |
| **Search returns 503 error** | Open Food Facts upstream server throttle | No action required. FoodCue's built-in fallback automatically serves the 500-SKU verified Indian catalog. |
