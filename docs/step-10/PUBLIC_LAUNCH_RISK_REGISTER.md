# FoodCue — Step 10: Public-Launch Risk Register
**Controlling Authority:** FoodCue Master Specification v13.5 §25; PRD v1.2  
**Document ID:** `RISK-REG-20261117-01`  
**Assessment Date:** 17 November 2026  
**Status:** ACTIVE RISK REGISTER — GATED MITIGATIONS DOCUMENTED  

---

## 1. Risk Matrix Overview

This register documents potential technical, safety, operational, regulatory, and market risks prior to public launch, establishing required controls and gating ownership.

---

## 2. Risk Register

| Risk ID | Category | Risk Description | Severity | Probability | Impact | Mitigation / Control | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **RSK-01** | Safety | Consumer treats absence of allergen statement as guarantee of total absence. | High | Medium | High | Mandatory disclaimer on all scans: *"Not detected in extracted text; check physical label. This is not proof of total absence."* | **CONTROLLED** |
| **RSK-02** | Legal | FSSAI regulatory change alters mandatory allergen or additive rules. | Medium | Low | High | Regulatory monitoring protocol (§16.1) with versioned food-intelligence rules. | **CONTROLLED** |
| **RSK-03** | Technical | Browser camera permissions blocked or WebAssembly unsupported on legacy phone. | Medium | Medium | Medium | Graceful fallback to gallery photo upload and manual pack review workflow. | **CONTROLLED** |
| **RSK-04** | Security | Malicious QR code on counterfeit packaging attempting phishing or drive-by exploit. | High | Low | High | SEC-01 inert payload classification: zero auto-navigation, zero auto-fetch, escaped text only. | **CONTROLLED** |
| **RSK-05** | Privacy | Unintentional cloud upload of private household dietary patterns. | Critical | Low | Critical | PRV-01 local-first invariant: explicit opt-in consent required before sync can be activated. | **CONTROLLED** |
| **RSK-06** | Financial | Unexpected infrastructure bills upon sudden consumer viral traffic spike. | High | Low | High | Zero-cash invariant: all providers configured with hard spending caps and auto-pausing. | **CONTROLLED** |
| **RSK-07** | Operational | Premature public launch before completing 500-pack benchmark and closed beta. | Critical | High | Critical | Gate G6 release blocker: public release blocked until G1–G6 and Step 9 are evidenced. | **ACTIVE BLOCKER** |

---

## 3. Active Release Blockers
Risk **RSK-07** represents the current controlling operational blocker. The software is technically validated, but launching publicly without completing the real-world 500-pack benchmark and 4-week closed beta violates project controls.
