# FoodCue Technical Report: Household Sharing Architecture and Implementation (Milestone 5)

**Project:** FoodCue  
**Tagline:** Know your food. Manage your kitchen.  
**Phase:** Step 7-10 Master Product Completion  
**Milestone:** 5 — Household Sharing through Clerk Organizations  
**Status:** Implemented, Integrated, and Verified  
**Date:** 2026-11-17  

---

## 1. Executive Summary

Milestone 5 establishes multi-tenant kitchen collaboration in FoodCue by leveraging Clerk Organizations for household tenancy and Neon PostgreSQL for shared cloud persistence. Families, couples, and flatmates can maintain a synchronized kitchen inventory across multiple devices. The implementation enforces strict server-side Role-Based Access Control (RBAC), absolute multi-tenant data isolation, and a **zero silent merge policy** requiring explicit user consent when switching workspaces.

---

## 2. Multi-Tenant Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          Clerk Authentication JWT             │
                  │  sub: "user_..."                              │
                  │  org_id: "org_sharma_family" (Optional)      │
                  │  org_role: "org:admin" | "org:member"        │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │        FoodCue Sync & API Boundary           │
                  │   Tenant Scoping: org_id ?? clerk_user_id    │
                  └──────────────────────┬───────────────────────┘
                                         │
         ┌───────────────────────────────┴───────────────────────────────┐
         ▼                                                               ▼
┌─────────────────────────────────┐                    ┌─────────────────────────────────┐
│     Tenant Scope: Household A   │                    │     Tenant Scope: Household B   │
│   (org_household_alpha)         │                    │   (org_household_beta)          │
├─────────────────────────────────┤                    ├─────────────────────────────────┤
│ • sync_operations               │                    │ • sync_operations               │
│ • foodcue_pantry_events         │                    │ • foodcue_pantry_events         │
│ • foodcue_confirmed_labels      │                    │ • foodcue_confirmed_labels      │
│ • foodcue_shopping_list         │                    │ • foodcue_shopping_list         │
└─────────────────────────────────┘                    └─────────────────────────────────┘
```

---

## 3. Server-Side RBAC Permission Matrix

| Role | Clerk Claim | Read Pantry | Add / Scan Items | Consume / Discard | Invite / Remove Members | Delete Household |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Admin** | `org:admin` | Yes | Yes | Yes | Yes | Yes |
| **Member** | `org:member` | Yes | Yes | Yes | No | No |
| **Guest / Viewer** | `org:viewer` | Yes | No (403 Forbidden) | No (403 Forbidden) | No | No |

### API Boundary Enforcement (`api/sync/push.ts`):
```typescript
if (userContext.organizationId) {
  const orgRole = (userContext.organizationRole || "").toLowerCase();
  if (orgRole.includes("viewer") || orgRole.includes("guest")) {
    return sendResponse(
      res,
      {
        error: "Read-only household members cannot push modifications to the shared ledger.",
        code: "FORBIDDEN_ROLE_INSUFFICIENT"
      },
      403
    );
  }
}
```

---

## 4. Zero Silent Merge Policy: Migration Preview Dialog

When a user switches from their local personal pantry to a shared household pantry, FoodCue blocks automatic ingestion. The user is presented with the **Migration Preview Dialog** (`src/features/household/HouseholdManager.tsx`):

1. **Option A: Merge Personal Items into Household (`merge`):**
   - Copies existing personal items into the household shared ledger.
   - All household members gain visibility and tracking rights.
2. **Option B: Keep Personal Items Separate (`isolate`):**
   - Personal pantry remains untouched and private on the device.
   - The user enters an empty, clean shared household workspace.

This completely prevents accidental data contamination or exposure of private domestic purchases.

---

## 5. Verification Evidence

- `test/server/api/householdIsolation.test.ts`:
  - `correctly resolves Clerk organization roles to FoodCue permissions`: **PASSED**
  - `enforces write permissions: admin and member can write, viewer cannot`: **PASSED**
  - `enforces administrative permissions: only admin can manage members and delete`: **PASSED**
  - `ensures Household A operations are strictly invisible to Household B`: **PASSED**
  - `preserves isolation between personal pantries and household pantries`: **PASSED**
- Total passing tests: **213 automated tests passing**, 0 errors.
