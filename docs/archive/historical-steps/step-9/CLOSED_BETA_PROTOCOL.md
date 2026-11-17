# FoodCue — Step 9: Controlled Closed-Beta Protocol
**Controlling Authority:** FoodCue Master Specification v13.5 §21.2; PRD v1.2 §9  
**Document ID:** `PROTO-BETA-20261117-01`  
**Operational Status:** APPROVED PROTOCOL — RECRUITMENT ON HOLD PENDING G1–G4 GATES  
**Designated Scope:** 10 to 20 Opt-In Households · 4 Weeks Observation · Local-First Data Only  

---

## 1. Purpose & Guiding Principles

The FoodCue Closed Beta is an empirical field evaluation designed to assess real household interaction with FoodCue under actual kitchen conditions.

### Core Principles:
1. **Local-First Privacy:** All product scans, OCR text, and pantry ledger events remain strictly on the participant's physical device. No food images or pantry contents are uploaded to cloud servers.
2. **Safety-First Uncertainty:** Participants are educated that FoodCue is an informational tool that flags uncertainty, not a medical device or legal arbiter.
3. **Voluntary Participation:** Opt-in consent with unconditional right to withdraw at any time and wipe local data with one tap.

---

## 2. Participant Recruitment & Cohort Profile

### 2.1 Eligibility Criteria
- Primary or shared grocery shopper and kitchen manager in an Indian urban/semi-urban household.
- Regularly purchases packaged foods (biscuits, flours, edible oils, spices, snacks, breakfast cereals, sauces).
- Uses a modern smartphone (Android with Chrome or iOS with Safari).
- Willingness to participate in a 15-minute weekly feedback touchpoint for 4 weeks.

### 2.2 Household Allocation (10–20 Households)
- **Cohort Target:** 15 households (with a minimum floor of 10 and cap of 20).
- Pseudonymous Household IDs: `HH-01` through `HH-20`.
- Identities are mapped to household IDs in an offline, encrypted founder-held register. No personal names or addresses appear in the repository or public logs.

---

## 3. Operational Timeline & Weekly Cadence

| Phase | Duration | Core Activities |
| :--- | :---: | :--- |
| **Pre-Beta (Week 0)** | 5 Days | Informed consent signing, web app link distribution, onboarding walkthrough. |
| **Week 1: First Scans** | 7 Days | Household tests SmartScan on 5+ packaged items; tests pantry adding. |
| **Week 2: Kitchen Routine** | 7 Days | Participant tracks kitchen items, tests expiry reminders, tests shopping list. |
| **Week 3: Stress Testing** | 7 Days | Participant scans curved, reflective, or torn packaging; tests offline usage. |
| **Week 4: Evaluation** | 7 Days | Final survey on uncertainty comprehension, feature value, retention assessment. |
| **Post-Beta** | 3 Days | Final feedback synthesis, defect logging, data wipe confirmation. |

---

## 4. Operational Support & Incident Response

### 4.1 Communication Channels
- Dedicated pseudonymous messaging channel (WhatsApp / Signal) for reporting bugs or questions.
- Weekly founder review video call or structured feedback form.

### 4.2 Defect Severity & Response SLAs
- **S0 (Critical Safety / Privacy Defect):** Response within **2 hours**. Immediate instruction to cease affected action. Beta paused if necessary.
- **S1 (High Usability / Data Loss):** Response within **12 hours**. Hotfix within 48 hours.
- **S2 (Medium Usability Issue):** Logged for weekly sprint review.
- **S3 (Minor / Suggestion):** Logged in product backlog.
