# FoodCue Cloud Privacy, Data Minimization & Consent Policy
## Legal Baseline, Data Minimization Guarantees & Reversible User Rights

```text
========================================================================================
PROJECT:                FoodCue (Know your food. Manage your kitchen.)
FRAMEWORK:              DPDP Act (India 2023) / GDPR (EU 2016/679) / CCPA
STATUS:                 Approved & Enforced Baseline
CONTROLLING SPEC:       FoodCue Master Specification v13.5 §13 & §18
========================================================================================
```

---

## 1. Core Privacy Philosophy

FoodCue adheres to the principle that **kitchen management and nutrition intelligence must never compromise consumer privacy**. Unlike commercial grocery apps, FoodCue is entirely free of ad-tracking networks, behavior profiling beacons, and commercial data monetization.

---

## 2. Strict Data Minimization & Classification

FoodCue categorizes all application data into two strictly partitioned tiers:

### Tier 1: Cloud-Synchronized (Only With Explicit Consent)
- **Pantry Ledger Events:** Numerical quantities, unit types, event timestamps, locations (e.g. `Fridge`, `Pantry`).
- **Confirmed Packaging Labels:** Verified GTIN numbers, physical product brand/title, ingredient text, allergen declarations.
- **Shopping List Items:** Item name, requested quantity, purchased toggle state.
- **Dietary Avoid-Lists:** Allergen/ingredient tokens flagged for avoidance.

### Tier 2: Kept Strictly Local on Device (NEVER UPLOADED)
- **Camera Frames & Live Video:** Processed in-memory on-device via WebAssembly (ZXing). Never streamed or persisted.
- **Photo Panels & Label Images:** High-resolution label captures remain strictly in local IndexedDB.
- **Temporary OCR Caches:** Text segmentations and optical bounding boxes.
- **Hardware Identifiers:** No MAC addresses, IMEI, or device hardware serials are captured.

---

## 3. Explicit Decoupled Consent Model

Under FoodCue Master Specification §5, **authentication and cloud synchronisation are strictly decoupled**.

1. **Signing In is NOT Consent:** Creating an account or signing in via Clerk allows identity verification but does not initiate data uploads.
2. **7-Step Interactive Consent Flow:** Cloud sync can only be activated by completing the explicit 7-step Migration Wizard.
3. **Audit Trail Record:** Consent is recorded with:
   - User ID (Clerk subject)
   - Consent version (`v1.0-phase2`)
   - Explicit Timestamp (ISO 8601)
   - Scope (`pantry_events,confirmed_labels,shopping_items,preferences`)
   - Device ID (UUID)

---

## 4. Reversible User Rights & Controls

### A. Disable Cloud Sync
Users can pause cloud synchronization at any time in `Profile → Privacy & Cloud`:
- Disabling sync stops all outbound operations.
- Local data remains completely intact and fully functional offline.
- Existing cloud records remain safely archived unless the user separately elects to delete them.

### B. Complete Cloud Data Erasure (Right to Erasure)
Users can invoke `/api/sync/deleteCloudData` to permanently purge all cloud records from Neon PostgreSQL (`foodcue_pantry_events`, `foodcue_confirmed_labels`, `foodcue_shopping_list`, `sync_operations`, and `sync_devices`).

### C. Local Data Export
Users can export an unencrypted, open-standard JSON snapshot of their local records at any time.

### D. Local Storage Wipe
Users can execute a local reset in `Privacy & Cloud`, which safely erases all IndexedDB object stores and local caches.
