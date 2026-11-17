# FoodCue — Closed-Beta Incident & Feedback Register
**Controlling Authority:** FoodCue Master Specification v13.5 §21.2, §25; PRD v1.2 §9  
**Document ID:** `INCIDENT-BETA-20261117-01`  
**Operational Status:** ACTIVE REGISTER — S0/S1 MONITORING ENABLED  
**Active Incidents:** 0 OPEN S0/S1 DEFECTS  

---

## 1. Incident Classification Scheme

Any operational, safety, security, or usability failure reported during internal testing or closed beta must be categorized according to the project severity standard:

| Severity Level | Definition | Mandatory SLA | Action Required |
| :---: | :--- | :---: | :--- |
| **S0 (Critical)** | Allergen false reassurance, security breach, privacy leak, or data destruction. | **2 Hours** | Stop affected feature immediately. Pause beta if participant safety or privacy is at risk. |
| **S1 (High)** | Core workflow broken without workaround (e.g. scanner crashes on valid barcode). | **12 Hours** | Emergency patch deployed within 48 hours. |
| **S2 (Medium)** | Usability defect, confusing wording, or non-critical styling bug with workaround. | **Weekly** | Prioritized in next sprint release. |
| **S3 (Low)** | Minor cosmetic issue, visual polish, or feature request. | **Backlog** | Added to backlog. |

---

## 2. Beta Incident Log

| Incident ID | Date | Reported By | Severity | Description | Root Cause | Status | Resolution / Commit | Retest Result |
| :---: | :---: | :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **INC-001** | 2026-11-17 | Quality Audit | S2 | Modal keyboard trap: Migration Wizard dialog did not close on Escape key. | Missing keydown listener in React modal component. | **CLOSED** | Added global `Escape` key event listener in `MigrationWizard.tsx`. | **PASS** |
| **INC-002** | 2026-11-17 | Security Audit | S2 | API push batch endpoint accepted unbounded operation arrays. | Missing array length guard in `syncPush.ts`. | **CLOSED** | Added strict boundary check `operations.length > 100` (HTTP 400). | **PASS** |
| **INC-003** | 2026-11-17 | Food Intelligence | S2 | Common Indian additives (e.g. INS 102 Tartrazine) unmapped. | Additive dictionary limited to 13 initial entries. | **CLOSED** | Expanded dictionary in `foodIntelligenceEngine.ts` to 30 INS codes. | **PASS** |
| **INC-004** | 2026-11-17 | Sync Engine | S2 | Rapid queue enqueues tied on millisecond timestamp. | Millisecond clock tie in `Date.now()`. | **CLOSED** | Implemented `getMonotonicIso()` in `localChangeQueue.ts`. | **PASS** |

---

## 3. Incident Summary
- **Open S0 Incidents:** **0**
- **Open S1 Incidents:** **0**
- **Total Closed Incidents:** **4**
- **Safety Violation Incidents:** **0**
