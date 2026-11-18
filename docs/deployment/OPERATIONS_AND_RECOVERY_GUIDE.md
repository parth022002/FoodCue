# FoodCue — Operations, Incident Readiness & Recovery Guide

This runbook defines backup procedures, disaster recovery protocols, deployment rollbacks, and incident escalation matrices for FoodCue.

---

## 1. Backup & Disaster Recovery Architecture

### 1.1 Neon Point-in-Time Recovery (PITR)
- **Continuous WAL Archiving:** Neon automatically captures Write-Ahead Logs (WAL) continuously.
- **Retention Period:** 7 days on free tier, up to 30 days on standard tiers.
- **Recovery Procedure:**
  1. Open [Neon Console](https://console.neon.tech).
  2. Navigate to your project $\rightarrow$ **Branches**.
  3. Click **New Branch** $\rightarrow$ select **Restore from Point in Time**.
  4. Specify the exact timestamp prior to data corruption or accidental table drop.
  5. Update `DATABASE_URL` in Vercel to point to the restored branch endpoint.

### 1.2 Client-Side Data Export (Self-Sovereign Backup)
- Users can export their complete local IndexedDB database (pantry items, event ledger, avoid-list) as a standard JSON file from the **Profile** view.
- Provides immediate client-side data portability independent of cloud infrastructure.

---

## 2. Deployment Rollback Procedures

### 2.1 Instant Vercel Rollback
If a newly deployed release introduces a regression:
1. Open the **Vercel Dashboard** $\rightarrow$ Deployments.
2. Locate the previous stable deployment hash.
3. Click the three dots menu $\rightarrow$ **Instant Rollback**.
4. Edge CDN traffic shifts to the previous build in $<10\text{ seconds}$ without rebuilding.

---

## 3. Incident Severity Matrix & Response SLAs

| Severity | Definition | Target Resolution | Escalation Path |
|---|---|:---:|---|
| **SEV-1 (Critical)** | Core scanning or avoid-list warnings failing; data loss or tenant leak. | $< 1\text{ hour}$ | Immediate Vercel rollback; lead architect page. |
| **SEV-2 (Major)** | Cloud sync down (local scanning still operational); Clerk auth outage. | $< 4\text{ hours}$ | Check Neon status or Clerk status; verify pooler connections. |
| **SEV-3 (Minor)** | External search fallback latency high (Tavily/OpenFoodFacts slow). | $< 24\text{ hours}$ | Local FMCG catalog serves queries; report to external vendor. |
| **SEV-4 (Cosmetic)**| Non-critical UI glitch or localized typography error. | Next Sprint | Log to issue tracker. |
