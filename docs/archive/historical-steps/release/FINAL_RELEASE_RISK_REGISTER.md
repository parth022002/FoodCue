# FoodCue — Final Release Risk Register & Threat Mitigation Matrix
**Controlling Document:** FoodCue Master Specification v13.5 §16  
**Document Version:** 1.0.0 (Release Baseline)  
**Date of Audit:** November 2026  
**Review Status:** **ALL RISKS MITIGATED / RESIDUAL RISKS ACCEPTABLE**  

---

## 1. Risk Governance & Severity Scale

Risks are classified according to Impact (1–5) and Likelihood (1–5), yielding a Composite Risk Score ($R = I \times L$ from 1 to 25).
- **Extreme (20–25):** Release blocker. Must be fully mitigated before deployment.
- **High (15–19):** Requires formal architectural mitigation and automated verification.
- **Medium (8–14):** Requires operational procedures, timeouts, or defensive fallbacks.
- **Low (1–7):** Monitored in operational backlog.

---

## 2. Comprehensive Risk Register

| Risk ID | Category | Threat / Risk Scenario | Pre-Mitigation Score ($I \times L$) | Architectural Mitigation Strategy | Post-Mitigation Score ($I \times L$) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Food Safety | Formulation mismatch: Barcode unchanged but manufacturer altered recipe/allergens. | $5 \times 4 = 20$ (Extreme) | Mandatory physical pack confirmation gate (`validateConfirmedLabelGate`); promotion blocked until user checks pack. | $5 \times 1 = 5$ (Low) | **MITIGATED** |
| **RSK-02** | Food Safety | False negative on declared allergen causing severe allergic reaction. | $5 \times 3 = 15$ (High) | 6-state deterministic evidence engine; 100% recall verified across 100-pack and 500-pack physical benchmarks. | $5 \times 1 = 5$ (Low) | **MITIGATED** |
| **RSK-03** | Security | Phishing or malicious URL execution via scanned QR codes. | $4 \times 4 = 16$ (High) | Anti-phishing payload classifier; FoodCue never automatically browses or crawls decoded URLs. Domain preview only. | $4 \times 1 = 4$ (Low) | **MITIGATED** |
| **RSK-04** | Privacy | Secret or user token leakage to external APIs (OpenFoodFacts). | $4 \times 3 = 12$ (Medium) | `credentials: "omit"`; zero auth headers; strictly GTIN transmitted in URL path. Verified by automated tests. | $4 \times 1 = 4$ (Low) | **MITIGATED** |
| **RSK-05** | Security | Webhook forgery or replay attack compromising user database. | $4 \times 3 = 12$ (Medium) | Cryptographic Svix signature validation with 300s timestamp tolerance and database message ID deduplication. | $4 \times 1 = 4$ (Low) | **MITIGATED** |
| **RSK-06** | Data Integrity | Offline data loss or sync overwrites during concurrent multi-device use. | $4 \times 3 = 12$ (Medium) | Last-Write-Wins (LWW) conflict resolver with vector clocks; persistent IndexedDB sync queue; safe retry backoff. | $4 \times 1 = 4$ (Low) | **MITIGATED** |
| **RSK-07** | Operational | Unexpected cloud bills exceeding INR 0 budget mandate. | $3 \times 4 = 12$ (Medium) | Zero payment methods attached; auto-suspending Neon database; client-side WASM OCR execution; free-tier limits enforced. | $3 \times 1 = 3$ (Low) | **MITIGATED** |
| **RSK-08** | Reliability | External OpenFoodFacts API outage, rate limiting (429), or timeout. | $3 \times 4 = 12$ (Medium) | 8,000ms AbortController timeout; 429 backoff extraction; immediate fallback to manual pack entry. | $3 \times 1 = 3$ (Low) | **MITIGATED** |
| **RSK-09** | Privacy | User privacy violation upon cloud sync enablement. | $4 \times 3 = 12$ (Medium) | Local-first by default; explicit two-step user consent dialog required before local data is migrated to cloud. | $4 \times 1 = 4$ (Low) | **MITIGATED** |
| **RSK-10** | Usability | Inability to decode barcodes under low-light or wrinkled packaging. | $3 \times 3 = 9$ (Medium) | In-app torch/flashlight toggle; multi-modal photo upload fallback; manual typing fallback. | $3 \times 1 = 3$ (Low) | **MITIGATED** |

---

## 3. Residual Risk Assessment & Monitoring Plan

All 10 identified risks have been reduced to **Low (Residual Score $\le 5$)**.
- Continuous automated tests run in CI for every commit.
- In-flight alerts monitor webhook delivery failures and sync queue retries.
- The risk register is reviewed bi-weekly by the Release Engineering Lead.
