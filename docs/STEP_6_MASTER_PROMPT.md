<USER_REQUEST>
done with the step 5

# FOODCUE — STEP 6 MASTER IMPLEMENTATION PROMPT
## Cloud Synchronisation, Multi-Device Architecture, Local-to-Cloud Migration, Backend Integration and Complete Frontend Redesign

**Project:** FoodCue  
**Tagline:** Know your food. Manage your kitchen.  
**Phase:** Step 6 — Cloud Sync and Multi-Device Integration  
**Primary Objective:** Transform FoodCue into a fully integrated, privacy-first, offline-capable, cloud-connected consumer application.

---

# 1. YOUR ROLE

Act as a Principal Software Architect, Senior Full-Stack Developer, Cloud Database Engineer, Distributed Systems Engineer, Security Engineer, Product Designer, Frontend Architect, DevOps Engineer and QA Lead.

You are responsible for implementing Step 6 of FoodCue.

You must work directly inside the existing FoodCue repository.

This is not a request to create a new application or a frontend demonstration.

You must inspect the existing codebase, understand the current architecture, reuse working components and implement a complete cloud-connected product.

The final application must support:

- Local-first operation.
- Optional account-based access.
- Explicitly enabled cloud synchronisation.
- Neon PostgreSQL persistence.
- Clerk authentication.
- Multi-device access.
- Bidirectional synchronisation.
- Offline changes.
- Persistent sync queues.
- Conflict detection and resolution.
- Local-to-cloud migration.
- Cloud data management.
- Account and device management.
- Professional consumer-facing frontend.
- Complete privacy and security controls.

**Do not stop after connecting Neon or implementing a few API routes. Complete the end-to-end functionality.**

---

# 2. PROJECT CONTEXT AND EXISTING FOUNDATION

FoodCue is a packaged-food label understanding and household kitchen-management application.

Its main capabilities include:

1. SmartScan.
2. Product identification.
3. Barcode and QR processing.
4. Label confirmation.
5. Ingredient understanding.
6. Allergen declaration review.
7. Nutrition information.
8. My Kitchen and pantry management.
9. Product date management.
10. Reminders.
11. Shopping List.
12. Catalogue.
13. User Profile.
14. Privacy and Cloud settings.

The current application already has a local-first foundation.

Expected technologies include:

| Layer | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build tool | Vite |
| Authentication | Clerk |
| Cloud database | Neon PostgreSQL |
| Local database | IndexedDB |
| Hosting | Vercel |
| Styling | Existing FoodCue design system |

The project owner has already configured:

- Clerk application.
- Clerk Publishable Key.
- Clerk Secret Key.
- Email authentication.
- Username authentication.
- Google authentication.
- Apple authentication.
- Neon PostgreSQL project.
- Pooled connection string.
- Unpooled/direct connection string.
- Initial backend and database integration.
- Clerk webhook integration work.

Treat these as reported configuration states, not proof that each integration is complete.

Audit the actual implementation before changing it.

Do not ask the owner to recreate resources that already exist.

Do not expose or request real secret values.

---

# 3. MANDATORY DOCUMENT AND REPOSITORY AUDIT

Before coding, inspect every available FoodCue reference document and the entire repository.

Priority documents:

1. Latest approved FoodCue Master Specification.
2. FoodCue Product Development Requirements.
3. FoodCue Security, Privacy and Safety Requirements.
4. FoodCue Brand Guidelines.
5. FoodCue Validation Workbook.
6. Existing development roadmap.
7. Existing implementation checklist.
8. Existing architecture documentation.
9. Existing database schema and migrations.
10. Existing Clerk integration documentation.
11. Existing user journey and architecture diagrams.
12. Existing logos, icons, favicon and other brand assets.

Inspect:

- All frontend routes.
- Navigation and layout.
- SmartScan.
- My Kitchen.
- Reminders.
- Shopping List.
- Catalogue.
- Profile.
- Privacy and Cloud.
- IndexedDB repositories.
- Domain entities.
- Pantry event ledger.
- Database schema.
- Database migrations.
- API routes.
- Clerk integration.
- Webhook endpoint.
- Environment variables.
- Error handling.
- Existing tests.
- Deployment configuration.

## 3.1 Specification control

The uploaded Master Specification v13.4 states that accounts, synchronisation, household sharing and server services are Phase 2 capabilities requiring a separate business case, data-flow and rights review, and a new release gate.

Implement this task as an explicitly authorised Phase 2 extension.

Create a formal change record documenting:

- Scope being added.
- Reason for the change.
- Data categories affected.
- New external services.
- New privacy risks.
- Security requirements.
- Operating costs and free-tier constraints.
- Validation requirements.
- Release-gate implications.

Do not silently change the original baseline or claim that its original release gates have been satisfied.

If another formally approved master specification is present in the repository, use the latest approved version and document the source-of-truth decision.

## 3.2 Initial audit deliverable

Create:

`docs/STEP_6_INITIAL_AUDIT.md`

Include:

- Existing architecture.
- Working integrations.
- Incomplete integrations.
- Existing database tables.
- Existing API endpoints.
- Existing IndexedDB stores.
- Existing authentication flow.
- Existing webhook status.
- Existing frontend screens.
- Existing design problems.
- Missing sync functionality.
- Security risks.
- Required implementation changes.

Do not replace functioning architecture without a justified reason.

---

# 4. TARGET ARCHITECTURE — LOCAL + CLOUD HYBRID

FoodCue must retain its local-first foundation.

Do not replace IndexedDB with a cloud-only database.

The application must continue to work without signing in and without an internet connection.

## 4.1 Architecture

Implement the following architecture, adapting it to the actual repository.

```text
                    FOODCUE APPLICATION
                            |
                    React + TypeScript
                            |
                  Presentation / Domain
                            |
                 Local Repository Layer
                            |
                     IndexedDB
                            |
                 Persistent Sync Queue
                            |
                    Sync Coordinator
                            |
                   Network Availability
                            |
                   Clerk Authentication
                            |
                    FoodCue Backend
                            |
                  Session Verification
                            |
                   Authorisation Layer
                            |
                   Validation Services
                            |
                    Sync API Layer
                            |
                    Neon PostgreSQL
                            |
                User-Owned Cloud Records
```

## 4.2 Responsibilities

### IndexedDB

- Local working database.
- Offline access.
- Local mutations.
- Persistent sync queue.
- Temporary pending operations.
- Local cache of cloud records.

### Clerk

- Authentication.
- User identity.
- Session management.
- Sign-in and sign-up.
- Google and Apple authentication.
- Username and email authentication.

### FoodCue backend

- Clerk session verification.
- User identification.
- Authorisation.
- Data validation.
- Database operations.
- Sync processing.
- Conflict detection.
- Device management.
- Migration processing.

### Neon

- Cloud persistence.
- User-owned records.
- Sync operations.
- Revision information.
- Device registrations.
- Conflict records where necessary.

Do not allow the browser to connect directly to Neon.

All privileged database operations must go through the backend.

---

# 5. CORE PRODUCT RULE — AUTHENTICATION AND CLOUD SYNC ARE SEPARATE

FoodCue must preserve two independent user decisions.

## Decision 1: Account creation

A user may create an account to access account-based features.

## Decision 2: Cloud synchronisation

A user must separately choose whether to upload their local FoodCue information to the cloud.

Signing in must not automatically upload IndexedDB contents.

Account creation must not force cloud sync.

Cloud sync must be optional and reversible.

## 5.1 User modes

Support these modes:

### Mode A — Local-only user

- No account required.
- IndexedDB is used.
- SmartScan remains available.
- Kitchen operations remain available.
- Local reminders remain available.
- Local shopping lists remain available.
- Local export and deletion remain available.
- No personal application data is uploaded.

### Mode B — Signed-in user, cloud sync disabled

- Clerk authentication is available.
- Local data continues working.
- No pantry, label, reminder or shopping-list data is uploaded.
- The user may enable sync later.

### Mode C — Signed-in user, cloud sync enabled

- Local IndexedDB remains active.
- Permitted data is synchronised to Neon.
- Multiple devices can share the user's synchronised data.
- Offline changes are queued.
- Sync is incremental.
- User can disable sync.

Do not collapse these three modes into one boolean without a clear state model.

---

# 6. BACKEND IMPLEMENTATION

Audit the existing backend and implement the missing capabilities.

Use the repository's existing routing conventions.

If Vercel serverless functions are already used, continue with that architecture unless there is a demonstrated reason to change.

Do not introduce microservices unnecessarily.

## 6.1 Authentication middleware

Implement a reusable server-side authentication middleware.

It must:

1. Read the supported Clerk session credential.
2. Verify the session using the official Clerk backend SDK.
3. Reject invalid or expired credentials.
4. Resolve the Clerk user ID.
5. Resolve the corresponding FoodCue user record.
6. Attach the verified identity to the request context.
7. Prevent browser-supplied user IDs from being trusted.

Every cloud data API must use this middleware.

Never accept `userId` from a request body as proof of ownership.

## 6.2 User identity

Use the stable Clerk user ID to associate Clerk identity with FoodCue's internal user record.

Maintain a clear distinction between:

- Clerk user ID.
- FoodCue internal user ID.
- Device ID.
- Household or workspace ID, if later approved.

Preserve existing identifiers where possible.

Do not create duplicate FoodCue user records.

## 6.3 API standards

All endpoints must implement:

- Runtime request validation.
- Authentication.
- Authorisation.
- Consistent response structures.
- Appropriate HTTP status codes.
- Request-size limits.
- Safe error handling.
- Idempotency where applicable.
- Operational logging without sensitive data.

Suggested error structure:

```json
{
  "success": false,
  "error": {
    "code": "SYNC_VALIDATION_FAILED",
    "message": "Some changes could not be synchronised."
  },
  "requestId": "request-id"
}
```

Never expose SQL statements, stack traces, tokens or database connection details.

---

# 7. NEON DATABASE ARCHITECTURE

Inspect the existing Neon database before creating migrations.

Do not drop tables, reset the database or overwrite existing user records.

Create version-controlled migrations.

## 7.1 Core logical entities

Evaluate the existing schema and implement the required structures.

Potential entities:

### User and preferences

- `foodcue_users`
- `user_preferences`
- `user_sync_settings`

### Product and label

- `product_candidates`
- `confirmed_products`
- `confirmed_labels`
- `label_versions`

### Pantry

- `pantry_items`
- `pantry_events`
- `pantry_locations`

### Reminders

- `reminders`
- `product_date_records`

### Shopping

- `shopping_lists`
- `shopping_list_items`

### Sync

- `sync_devices`
- `sync_operations`
- `sync_cursors`
- `sync_conflicts`

### System

- `webhook_events`
- Existing migration framework tables.

These are logical design candidates, not mandatory duplicate tables.

Reuse existing structures where appropriate.

## 7.2 Database requirements

Use:

- UUIDs for suitable internal IDs.
- Foreign keys.
- Unique constraints.
- Appropriate indexes.
- `TIMESTAMPTZ`.
- Explicit nullability.
- Revision/version fields.
- Transactional operations.
- Idempotency constraints.
- Appropriate cascade/restrict rules.
- Soft deletion or tombstones where needed.

Use the pooled Neon connection for normal application requests when appropriate.

Use the direct/unpooled connection for migrations or operations requiring a direct connection, according to the chosen driver and migration tooling.

Never expose either connection string in the frontend.

## 7.3 Ownership

Every user-owned record must have an enforced ownership relationship.

Verify ownership on every read, update and delete.

Create automated tests proving that one user cannot access another user's records.

## 7.4 Pantry ledger

Preserve the FoodCue append-only pantry event ledger.

Never overwrite historical pantry events to represent a correction.

Use compensating events.

Pantry balances must be derived from the event history.

Every event must have a stable unique identifier.

Repeated sync operations must not create duplicate events.

---

# 8. PERSISTENT SYNCHRONISATION ENGINE

Build a dedicated sync module.

Do not place the core sync implementation inside React components.

Suggested structure:

```text
src/
  sync/
    engine/
      syncCoordinator.ts
      syncRunner.ts
      syncScheduler.ts

    queue/
      localChangeQueue.ts
      queueProcessor.ts

    transport/
      syncApiClient.ts

    reconciliation/
      conflictResolver.ts
      mergeStrategies.ts

    state/
      syncStatus.ts

    validation/
      syncValidator.ts

    migration/
      migrationPlanner.ts
      migrationRunner.ts
      migrationVerifier.ts

    devices/
      deviceManager.ts

    types/
      syncContracts.ts
```

Adapt the structure to the existing codebase.

## 8.1 Persistent sync queue

Every eligible local change must generate a persistent sync operation.

Support:

- Create.
- Update.
- Append event.
- Delete/tombstone.
- Retry.
- Failure state.
- Attempt count.
- Last attempt.
- Idempotency key.
- Server acknowledgement.

The queue must survive:

- Browser refresh.
- Browser restart.
- Temporary network failure.
- Application closure.

Do not rely exclusively on React state or in-memory arrays.

## 8.2 Sync operation contract

Each operation should include fields equivalent to:

- `operationId`
- `entityType`
- `entityId`
- `operationType`
- `schemaVersion`
- `baseRevision`
- `payload`
- `createdAt`
- `status`
- `attemptCount`

Use stable operation IDs generated once and reused for retries.

Do not use a newly generated idempotency key for every retry.

Validate payloads on the client and again on the server.

## 8.3 Sync states

Implement:

- `local_only`
- `sync_disabled`
- `pending`
- `syncing`
- `synced`
- `sync_failed`
- `conflict`
- `authentication_required`
- `offline`

Provide typed state transitions.

Only show a state supported by actual sync-engine data.

## 8.4 Sync triggers

Support:

- Explicit user-initiated sync.
- Application start when sync is enabled.
- Local changes.
- Network reconnection.
- Successful authentication when sync is enabled.
- Controlled background retry.

Avoid aggressive polling.

Use browser background capabilities only where supported.

Do not promise that synchronisation will happen when the application is closed unless the relevant platform mechanism is implemented and tested.

## 8.5 Incremental sync

Implement:

- Local-to-cloud upload.
- Cloud-to-local download.
- Incremental cursors.
- Per-operation acknowledgement.
- Batch processing.
- Retry.
- Partial-failure recovery.

Do not download the entire cloud database on every page load.

Do not advance a sync cursor until all changes in the relevant batch have been safely applied locally.

Use server-controlled ordering or revision values rather than relying exclusively on device timestamps.

---

# 9. CLOUD SYNC API IMPLEMENTATION

Implement secure APIs based on the existing backend structure.

Suggested responsibilities:

| API | Responsibility |
|---|---|
| `GET /api/sync/bootstrap` | Obtain initial sync state |
| `POST /api/sync/push` | Submit local operations |
| `GET /api/sync/pull` | Fetch changes after a cursor |
| `POST /api/sync/ack` | Acknowledge accepted operations |
| `GET /api/sync/status` | Obtain real sync status |
| `GET /api/sync/devices` | List registered devices |
| `DELETE /api/sync/devices/:id` | Revoke device access |
| `POST /api/sync/enable` | Record explicit sync enablement |
| `POST /api/sync/disable` | Disable further cloud sync |

Adjust route naming to the existing architecture.

## 9.1 Push

The push endpoint must:

1. Authenticate the user.
2. Verify sync is enabled.
3. Validate batch size.
4. Validate each operation.
5. Verify ownership.
6. Check idempotency.
7. Check base revision.
8. Apply valid operations transactionally.
9. Record server revisions.
10. Return per-operation results.

A batch must support partial acceptance without falsely acknowledging failed operations.

## 9.2 Pull

The pull endpoint must:

1. Authenticate the user.
2. Verify sync permission.
3. Validate the cursor.
4. Retrieve changes after the cursor.
5. Restrict records to the authenticated user.
6. Return stable revisions.
7. Return tombstones where applicable.
8. Return a new cursor only when the response is safely complete.

## 9.3 Status

The status API should return information such as:

- Sync enabled.
- Last successful sync.
- Pending operation count.
- Failed operation count.
- Current cursor.
- Conflict count.
- Last error category.
- Device registration state.

Do not return database connection information.

---

# 10. LOCAL-TO-CLOUD MIGRATION

Implement a first-time migration workflow for existing local users.

This is a critical data-integrity requirement.

## 10.1 Consent

Before migration:

- Explain cloud sync.
- Explain what data is transferred.
- Explain where it is stored.
- Explain which services are involved.
- Explain how sync can be disabled.
- Ask for explicit consent.

Signing in must not trigger migration.

## 10.2 Migration preview

Read the actual IndexedDB records.

Display:

- Pantry items.
- Pantry events.
- Shopping lists.
- Shopping-list items.
- Reminders.
- Confirmed product records.
- Confirmed label records.
- Other approved syncable data.
- Unsupported records.
- Invalid records.
- Duplicate candidates.

Never use hardcoded counts.

## 10.3 Data validation

Validate:

- Schema version.
- Required fields.
- IDs.
- Relationships.
- Timestamps.
- Quantities.
- Units.
- Event types.
- Revision values.
- Data size.
- User confirmation state.

Do not upload temporary scan images or OCR data by default.

Do not silently upload personal avoid-lists, preferences or notes without a separately approved data scope and explicit user consent.

## 10.4 Migration execution

Implement:

- Safe batch processing.
- Idempotent writes.
- Stable operation IDs.
- Retry.
- Partial failure handling.
- Progress tracking.
- Final verification.
- Recovery.

Do not delete local records after upload.

## 10.5 Migration states

Support:

- `not_started`
- `awaiting_consent`
- `ready`
- `in_progress`
- `completed`
- `completed_with_warnings`
- `failed`
- `needs_attention`

Show accurate migration results.

---

# 11. CONFLICT RESOLUTION

Implement explicit conflict handling.

## 11.1 Revision tracking

Use server-controlled revision numbers or equivalent concurrency control.

Every mutable cloud record must support safe revision checking.

## 11.2 Domain-specific strategies

### Pantry events

Append-only.

Never overwrite existing events.

Use stable event IDs and idempotency.

### Pantry balances

Recalculate projections from the ledger.

Never directly overwrite the balance to resolve a sync conflict.

### Product records

Preserve provenance and source information.

### Confirmed labels

Preserve physical label-version history.

Do not silently replace an older confirmed label with a different formulation.

### Shopping lists

Use item-level reconciliation where appropriate.

Do not overwrite an entire list when only one item changed.

### Preferences

A documented last-write or field-level merge may be used for non-sensitive preferences where appropriate.

### Deletion

Use tombstones or an equivalent mechanism.

Prevent deleted records from reappearing unexpectedly.

## 11.3 User-visible conflicts

When automatic resolution is unsafe:

- Show the affected record.
- Explain the difference.
- Preserve both versions.
- Offer a clear resolution choice.
- Record the resolution.

Create:

`docs/SYNC_CONFLICT_RESOLUTION.md`

---

# 12. MULTI-DEVICE MANAGEMENT

Implement device registration.

Each device should have:

- Stable generated device ID.
- Associated user ID.
- Optional user-defined display name.
- Creation timestamp.
- Last successful sync.
- Revocation status.

Avoid unnecessary device fingerprinting.

Allow users to:

- View connected devices.
- View last sync.
- Revoke a device.
- Understand what revocation means.

A revoked device must be denied future sync requests.

Do not claim that revocation remotely deletes all local information stored on that device.

Document local-data handling after sign-out and device revocation.

---

# 13. DATA CATEGORIES AND PRIVACY CONTROLS

Implement an explicit sync allow-list.

Initial approved candidates:

| Data category | Default treatment |
|---|---|
| Pantry items | Eligible after sync consent |
| Pantry events | Eligible after sync consent |
| Shopping lists | Eligible after sync consent |
| Shopping-list items | Eligible after sync consent |
| Reminders | Eligible after sync consent |
| Confirmed product records | Eligible after scope review |
| Confirmed label records | Eligible after scope review |
| Temporary scan images | Local only |
| OCR text | Local only by default |
| Personal notes | Separate scope approval |
| Avoid-lists | Do not sync without explicit approval and privacy review |
| Health-related information | Excluded |

Do not sync every IndexedDB store automatically.

Document the exact fields sent to Neon.

Minimise stored data.

Never send pantry data to external catalogue services, AI providers or analytics services merely because cloud sync has been enabled.

---

# 14. FRONTEND REDESIGN — COMPLETE CONSUMER EXPERIENCE

The existing FoodCue frontend must be upgraded to match the new cloud-connected product.

Do not add a technical dashboard.

The frontend must look like a polished consumer application.

Preserve the existing brand and logo.

Remove development-only UI.

## 14.1 Global design principles

- Clean, modern, premium consumer experience.
- Mobile-first responsive design.
- Clear visual hierarchy.
- Calm, trustworthy appearance.
- Consistent spacing.
- Accessible colour contrast.
- Professional typography.
- Restrained animations.
- Clear empty states.
- Helpful loading states.
- Meaningful success and error feedback.

Use the FoodCue design system.

### Brand colours

- Primary Green: `#075A35`
- Dark Green: `#06452B`
- Lime: `#72C900`
- Dark Lime: `#4E9F00`
- Ink: `#12231B`
- Muted: `#64736B`
- Canvas: `#FFFFFF`
- Surface: `#F5FAF5`
- Border: `#DCE8DE`
- Information: `#149BE8`

### Typography

- Plus Jakarta Sans for headings.
- Inter for body text.

Use existing local assets or approved fonts.

Do not add unnecessary third-party runtime dependencies.

Target WCAG 2.2 AA.

---

# 15. GLOBAL NAVIGATION REDESIGN

Review the current navbar and make it consistent across the application.

Suggested desktop navigation:

```text
[FoodCue Logo]                          [Account / Sync]

 SmartScan | My Kitchen | Reminders | Shopping List | Catalogue

                                      [Profile] [Settings]
```

Requirements:

- Keep the FoodCue logo and tagline in the header.
- Keep primary product navigation visible and consistent.
- Move Profile to the right side.
- Provide an account control on the right.
- Support signed-out and signed-in states.
- Add a clear sign-in action.
- Add a sign-up action.
- Avoid exposing backend or database status.
- Ensure navigation remains responsive.

On mobile:

- Use a compact top header.
- Provide a suitable bottom navigation or accessible mobile menu.
- Keep SmartScan easy to reach.
- Avoid horizontal overflow.
- Provide clear active states.

Do not duplicate account controls unnecessarily.

---

# 16. SIGN-IN AND SIGN-UP EXPERIENCE

Use Clerk's existing configuration.

Support the already configured methods:

- Email.
- Username.
- Google.
- Apple.

Do not rebuild authentication using custom passwords.

## Signed-out state

Display:

- Sign in.
- Create account.
- Continue using FoodCue locally.

The local-only experience must remain accessible.

## Signed-in state

Display:

- User identity.
- Account menu.
- Profile.
- Privacy and Cloud.
- Connected devices.
- Sign out.

## Authentication transitions

Test:

- Sign-in.
- Sign-up.
- Sign-out.
- Session expiry.
- Page refresh.
- Protected route handling.
- Offline mode.
- Provider authentication failures.

Do not let a Clerk session failure erase local records.

---

# 17. PROFILE PAGE REDESIGN

Create a professional Profile page.

Suggested layout:

### Profile header

- Avatar or initials.
- Display name.
- Email or username.
- Account status.

### Account information

- Name.
- Username.
- Email.
- Connected authentication methods, where supported.
- Account management.

### Preferences

- Display preferences.
- Language preference if supported.
- Appearance settings if implemented.
- Relevant FoodCue preferences.

### Security

- Sign-in and account management.
- Connected devices.
- Sign-out.

### Data and privacy

- Privacy & Cloud settings.
- Export.
- Delete data.
- Account deletion.

Do not display sensitive account metadata unnecessarily.

---

# 18. PRIVACY & CLOUD PAGE — MAJOR NEW FRONTEND FEATURE

Create a dedicated, fully functional page:

`Profile → Privacy & Cloud`

This is the primary interface for cloud-sync control.

It must not resemble a developer settings page.

## 18.1 Page header

Title:

**Privacy & Cloud**

Description:

"Choose how FoodCue stores your kitchen information. Your data stays on this device unless you choose to enable cloud sync."

## 18.2 Storage overview

Display two clear sections.

### On this device

- Local data availability.
- Local storage information where supported.
- Pending local changes.
- Last export date, if available.
- Export data.
- Clear local data.

### Cloud

- Cloud sync status.
- Cloud sync consent.
- Last successful sync.
- Pending changes.
- Sync errors.
- Manage connected devices.
- Disable sync.

Do not claim cloud backup is active if no verified cloud copy exists.

## 18.3 Sync status card

Support:

**Cloud sync is off**

"Your information remains on this device."

Action: Enable Cloud Sync.

**Syncing your kitchen**

"FoodCue is securely synchronising your changes."

Show real progress if measurable.

**Your kitchen is up to date**

"Your latest changes are synchronised."

Show last successful sync.

**Changes waiting to sync**

"Your changes are saved on this device and will sync when you're connected."

**Sync needs attention**

"Some changes could not be synchronised. Your local information is still available."

Provide Retry and View details actions.

## 18.4 Enable cloud sync flow

Create a polished multi-step flow.

### Screen 1 — Introduction

Title:

"Keep your kitchen in sync."

Description:

"Access your FoodCue kitchen information across your devices."

Actions:

- Enable Cloud Sync.
- Continue Locally.

### Screen 2 — Data explanation

Clearly explain which categories will be synchronised.

Show the data categories and their respective treatment.

### Screen 3 — Consent

Require explicit confirmation.

Record:

- User ID.
- Consent version.
- Timestamp.
- Data scope.
- Device ID.

Do not infer consent from authentication.

### Screen 4 — Migration preview

Show actual local record counts and validation results.

### Screen 5 — Confirmation

Explain that local records will remain available.

Require an explicit action to begin migration.

### Screen 6 — Progress

Show actual migration progress.

### Screen 7 — Result

Display:

- Records uploaded.
- Records skipped.
- Records failed.
- Remaining pending records.
- Whether verification succeeded.

Never show success before the backend confirms persistence.

## 18.5 Disable sync flow

When disabling sync:

- Explain that new local changes will no longer upload.
- Explain that existing cloud records remain unless the user separately deletes them.
- Explain that local data remains available.
- Handle pending operations safely.
- Ask for confirmation.
- Update the sync preference.
- Stop new cloud uploads.
- Preserve enough state to resume safely if re-enabled.

Do not silently delete cloud records when sync is disabled.

---

# 19. CONNECTED DEVICES PAGE

Create:

`Profile → Privacy & Cloud → Connected Devices`

Display:

- Device name.
- Device type where reasonably known.
- Last successful sync.
- Connected status.
- Revocation action.

Provide:

- Revoke this device.
- Confirmation dialog.
- Clear success/error feedback.

Do not expose device fingerprints.

Explain that revoking a device prevents future cloud synchronisation but cannot guarantee deletion of local copies already on that device.

---

# 20. CLOUD SYNC UX ACROSS THE APPLICATION

The user should understand when data is local, pending or synchronised without seeing technical implementation details.

Replace:

- `Neon: Ready`
- `Database Connected`
- `PostgreSQL Connected`
- `Backend Healthy`
- `API Connected`
- `Development Mode`
- Internal sync diagnostics.

Use:

| State | User-facing wording |
|---|---|
| Local-only | Stored on this device |
| Sync disabled | Cloud sync is off |
| Pending | Changes waiting to sync |
| Syncing | Syncing your kitchen |
| Successful | Your kitchen is up to date |
| Offline | You're offline. Your changes are saved here. |
| Authentication expired | Sign in to continue syncing |
| Failed | Sync needs attention |
| Conflict | Review changes |

Use a subtle status indicator.

Do not display technical status on every page if it adds unnecessary visual noise.

The status indicator must link to Privacy & Cloud.

---

# 21. EXISTING PAGE INTEGRATION

Cloud sync must work with the actual application features.

## 21.1 SmartScan

- Preserve existing scan workflow.
- Keep camera and gallery processing local.
- Do not upload photos automatically.
- Save approved product and label records according to consent.
- Preserve product candidate versus ConfirmedLabel distinction.
- Keep safety analysis deterministic.

## 21.2 My Kitchen

- Display local pantry information.
- Display synchronised cloud data after successful reconciliation.
- Preserve event-ledger operations.
- Support offline stock changes.
- Support multi-device changes.
- Avoid duplicate pantry events.

## 21.3 Reminders

- Synchronise permitted reminder records.
- Preserve date type and source.
- Avoid duplicate reminders.
- Keep printed dates separate from estimates.
- Do not promise notification delivery unless actually implemented.

## 21.4 Shopping List

- Support local and cloud records.
- Synchronise item-level changes.
- Preserve list identity.
- Handle concurrent updates.

## 21.5 Catalogue

- Keep catalogue candidates distinct from user-confirmed physical products.
- Preserve source and provenance.
- Do not treat cloud catalogue records as physical-pack verification.

## 21.6 Privacy

- Provide local export.
- Provide cloud export where implemented.
- Provide local clear-data.
- Provide cloud deletion controls.
- Provide account deletion information.

---

# 22. LOCAL-TO-CLOUD MIGRATION USER EXPERIENCE

Migration must be safe and transparent.

Do not perform migration in the background without confirmation.

The user must be able to review:

- What will be uploaded.
- What will remain local.
- What cannot be uploaded.
- Whether duplicates were detected.
- Whether validation errors exist.

Do not delete local data after migration.

Do not treat a successful HTTP request as proof that every record has been saved.

Use server acknowledgement and verification.

Create a migration history or clear result summary.

---

# 23. SECURITY REQUIREMENTS

## Authentication

- Verify Clerk sessions server-side.
- Reject unauthenticated requests.
- Reject expired sessions.
- Never trust browser-supplied identity.

## Authorisation

- Enforce record ownership.
- Prevent cross-user access.
- Enforce sync-enabled state.
- Enforce device revocation.

## Webhook

- Verify webhook signatures.
- Maintain idempotent processing.
- Handle retries.
- Avoid logging sensitive payloads.

## Database

- Keep credentials server-side.
- Use least privilege where practical.
- Use parameterised queries.
- Use transactions.
- Validate ownership.
- Restrict database access.

## API

- Validate request payloads.
- Apply request-size limits.
- Rate-limit appropriate endpoints.
- Protect against replay and duplicate operations.
- Handle malformed requests.
- Do not leak stack traces.

## Privacy

- Document data categories.
- Record explicit consent.
- Support disabling sync.
- Support export.
- Support deletion.
- Do not upload scan images or OCR text automatically.
- Do not sync excluded sensitive data.

## Account deletion

Implement a documented process covering:

- Clerk account.
- FoodCue user.
- Cloud records.
- Sync queues.
- Device registrations.
- Retention requirements.

Explain that remote account deletion cannot guarantee removal of data already retained locally on offline devices.

---

# 24. FAILURE AND RECOVERY HANDLING

Test and handle:

- No internet.
- Neon unavailable.
- Backend unavailable.
- Clerk session expired.
- Clerk webhook failure.
- Partial batch failure.
- Duplicate operation.
- Interrupted migration.
- Browser refresh during sync.
- Concurrent device updates.
- Storage quota exceeded.
- IndexedDB corruption.
- Invalid cloud response.
- Revoked device.
- Deleted account.
- Invalid cursor.
- Stale revision.

A cloud failure must not destroy valid local data.

A sync failure must not mark operations as successfully synchronised.

Provide clear recovery actions.

---

# 25. PERFORMANCE AND COST CONTROL

Maintain the INR 0 cash development target.

Use the existing Clerk, Neon and Vercel resources.

Do not introduce paid services without explicit owner approval.

Review:

- Neon compute and storage limits.
- Connection pooling.
- Database query performance.
- Vercel function execution limits.
- API payload sizes.
- Sync batch sizes.
- Clerk plan limits.
- Deployment limits.

Do not assume free-tier usage is unlimited.

Optimise:

- Incremental sync.
- Batch processing.
- Query indexing.
- Frontend bundle size.
- IndexedDB reads.
- Network requests.
- Rendering.

Do not implement aggressive polling.

Do not introduce unnecessary infrastructure.

---

# 26. TESTING AND QUALITY ASSURANCE

Testing is mandatory.

## 26.1 Unit tests

Test:

- Sync queue.
- Operation validation.
- Idempotency.
- Cursor management.
- Revision checks.
- Conflict resolution.
- Pantry ledger.
- Migration validation.
- Consent state.
- Device revocation.

## 26.2 Backend tests

Test:

- Clerk authentication.
- User ownership.
- Cloud write.
- Cloud read.
- Cloud deletion.
- Sync push.
- Sync pull.
- Partial batch failure.
- Duplicate operations.
- Invalid cursor.
- Invalid revision.
- Device revocation.

## 26.3 Migration tests

Test:

- Empty IndexedDB.
- Existing local records.
- Large datasets.
- Duplicate records.
- Invalid records.
- Interrupted upload.
- Repeated migration.
- Partial failure.
- Recovery.
- Verification.

## 26.4 Multi-device tests

Use two independent browsers or devices.

Test:

1. Sign in on Device A.
2. Enable cloud sync.
3. Add a pantry item.
4. Verify it in Neon.
5. Sign in on Device B.
6. Download the change.
7. Verify the pantry item.
8. Update a shopping list on Device B.
9. Verify the update appears on Device A.
10. Test simultaneous changes.
11. Test offline changes.
12. Reconnect.
13. Verify no missing or duplicate events.

## 26.5 Cross-user tests

Create two independent test users.

Verify that neither can read, update or delete the other's records.

## 26.6 Frontend tests

Test:

- Desktop navigation.
- Mobile navigation.
- Signed-out view.
- Signed-in view.
- Profile.
- Privacy & Cloud.
- Sync onboarding.
- Migration preview.
- Migration progress.
- Connected devices.
- Error states.
- Empty states.
- Accessibility.

## 26.7 Quality commands

Run applicable commands:

```bash
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
```

Run browser tests where configured.

Run security and dependency checks.

Tie test results to a commit and test run.

Do not fabricate results.

---

# 27. DOCUMENTATION DELIVERABLES

Create or update:

1. `docs/STEP_6_INITIAL_AUDIT.md`
2. `docs/PHASE_2_SCOPE_CHANGE.md`
3. `docs/CLOUD_ARCHITECTURE.md`
4. `docs/NEON_DATABASE_ARCHITECTURE.md`
5. `docs/CLERK_AUTHENTICATION.md`
6. `docs/SYNC_ENGINE.md`
7. `docs/LOCAL_TO_CLOUD_MIGRATION.md`
8. `docs/SYNC_CONFLICT_RESOLUTION.md`
9. `docs/MULTI_DEVICE_MANAGEMENT.md`
10. `docs/CLOUD_PRIVACY_AND_CONSENT.md`
11. `docs/API_REFERENCE.md`
12. `docs/SECURITY_REVIEW.md`
13. `docs/STEP_6_TEST_REPORT.md`
14. `docs/IMPLEMENTATION_STATUS.md`
15. `docs/RELEASE_READINESS_REPORT.md`

Update:

- README.
- Development checklist.
- Architecture diagrams if necessary.
- Database schema documentation.
- Environment variable template.
- Validation workbook.

Never include real credentials in documentation.

---

# 28. ENVIRONMENT VARIABLE MANAGEMENT

Audit the existing environment configuration.

Preserve existing variable names where already correct.

Expected categories may include:

### Frontend

- `VITE_CLERK_PUBLISHABLE_KEY`

### Backend

- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`

Do not assume these names without checking the actual repository.

Do not add unnecessary credentials.

Create or update `.env.example` with placeholders only.

Never expose:

- Clerk Secret Key.
- Webhook signing secret.
- Neon connection strings.

No secret may be included in a frontend bundle.

---

# 29. ACCEPTANCE CRITERIA

The phase is complete only when the following requirements are implemented and supported by test evidence.

## Local-first

- [ ] Application works without sign-in.
- [ ] Local data persists.
- [ ] Core local functionality works offline.
- [ ] Local export and deletion remain available.

## Authentication

- [ ] Clerk sign-in works.
- [ ] Clerk sign-up works.
- [ ] Email and username work.
- [ ] Google works.
- [ ] Apple works.
- [ ] Session handling works.
- [ ] Local data survives sign-out.

## Cloud

- [ ] Neon schema is version-controlled.
- [ ] Backend authentication is verified.
- [ ] User ownership is enforced.
- [ ] Cloud writes work.
- [ ] Cloud reads work.
- [ ] Cloud deletion is controlled.

## Migration

- [ ] Sync is separately enabled.
- [ ] Explicit consent is captured.
- [ ] Migration preview uses actual data.
- [ ] Invalid records are handled.
- [ ] Migration is idempotent.
- [ ] Interrupted migration recovers.
- [ ] Local records remain available.

## Synchronisation

- [ ] Persistent queue works.
- [ ] Local-to-cloud works.
- [ ] Cloud-to-local works.
- [ ] Incremental sync works.
- [ ] Offline queueing works.
- [ ] Retry works.
- [ ] Duplicate operations are prevented.
- [ ] Conflicts are detected.
- [ ] Conflicts are resolved safely.

## Multi-device

- [ ] Device registration works.
- [ ] Multiple devices access the same account data.
- [ ] Changes propagate between devices.
- [ ] Device revocation works.
- [ ] Revoked devices cannot sync.

## Frontend

- [ ] Navbar is redesigned.
- [ ] Profile is on the right side.
- [ ] Sign-in and sign-up are accessible.
- [ ] Profile page is complete.
- [ ] Privacy & Cloud page is complete.
- [ ] Sync onboarding is complete.
- [ ] Migration preview and progress are complete.
- [ ] Connected Devices page is complete.
- [ ] No development-only indicators remain.
- [ ] Mobile layout works.
- [ ] Accessibility has been reviewed.

## Security and quality

- [ ] Cross-user access is rejected.
- [ ] Secrets remain server-side.
- [ ] Webhook signature verification is retained.
- [ ] Sync consent is enforced.
- [ ] Data deletion is documented.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] Build succeeds.
- [ ] Documentation is updated.

A requirement must not be marked complete without implementation and appropriate evidence.

---

# 30. IMPLEMENTATION ORDER

Execute in this order.

### Stage 1 — Audit

Inspect the repository, specifications, schema and frontend.

Create the audit report.

### Stage 2 — Architecture and database

Finalise the hybrid architecture.

Review and implement required migrations.

### Stage 3 — Authentication and secure API

Complete reusable Clerk session verification and ownership enforcement.

### Stage 4 — Persistent sync queue

Implement local change capture and persistent operations.

### Stage 5 — Cloud push and pull

Implement authenticated incremental synchronisation.

### Stage 6 — Migration

Implement consent, preview, validation, batch migration, retry and verification.

### Stage 7 — Conflict resolution

Implement revision control and domain-specific merge strategies.

### Stage 8 — Multi-device

Implement device registration and revocation.

### Stage 9 — Frontend redesign

Redesign navigation, Profile, Privacy & Cloud, sync onboarding, migration and device management.

### Stage 10 — Feature integration

Connect SmartScan, My Kitchen, Reminders, Shopping List and Catalogue.

### Stage 11 — Security and QA

Perform unit, integration, cross-user, offline, migration and multi-device testing.

### Stage 12 — Documentation and release assessment

Update documentation, checklist and release-readiness report.

Do not skip stages or mark a stage complete based only on code generation.

---

# 31. FINAL DELIVERABLES

Deliver:

1. Updated FoodCue source code.
2. Updated frontend.
3. Updated navigation and account experience.
4. Profile page.
5. Privacy & Cloud page.
6. Cloud sync onboarding.
7. Migration preview and progress experience.
8. Connected Devices management.
9. Secure backend APIs.
10. Updated Neon schema.
11. Versioned database migrations.
12. Persistent sync queue.
13. Incremental upload/download.
14. Conflict-resolution implementation.
15. Device registration and revocation.
16. Updated IndexedDB integration.
17. Automated tests.
18. Updated documentation.
19. Updated development checklist.
20. Release-readiness report.

Create a final archive:

`FoodCue_Step_6_Cloud_Sync_Multi_Device_v1_0.zip`

Include:

- Source code.
- Public assets.
- Database migrations.
- Tests.
- Documentation.
- Environment template.
- Updated README.

Exclude:

- `node_modules`.
- Build caches.
- Real `.env` files.
- API secrets.
- Database credentials.
- User data.
- Temporary files.

Verify ZIP integrity.

---

# 32. FINAL IMPLEMENTATION REPORT

At the end, provide:

1. Initial audit findings.
2. Architecture implemented.
3. Database changes.
4. API endpoints implemented.
5. Authentication and authorisation implementation.
6. Sync queue design.
7. Migration process.
8. Conflict-resolution implementation.
9. Multi-device implementation.
10. Frontend redesign.
11. Privacy and security controls.
12. Tests executed.
13. Test results.
14. Build result.
15. Known limitations.
16. Outstanding issues.
17. Cost and free-tier assessment.
18. Beta readiness.
19. Release-gate status.
20. Final ZIP location.

Clearly distinguish:

- Implemented and tested.
- Implemented but not tested.
- Blocked.
- Not implemented.

Never claim that an external provider, database, authentication method or multi-device workflow is working unless it has actually been tested.

---

# FINAL EXECUTION DIRECTIVE

Complete FoodCue Step 6 as a full product-engineering implementation.

Transform the existing local application into a hybrid local-plus-cloud application.

Preserve IndexedDB and offline functionality.

Use Clerk for secure authentication.

Use Neon for cloud persistence.

Implement a persistent, reliable, incremental, bidirectional sync engine.

Implement explicit local-to-cloud migration.

Implement safe conflict resolution.

Support multiple devices.

Redesign the complete frontend experience around the new cloud functionality.

Remove all development-only infrastructure indicators from the consumer-facing interface.

Preserve the FoodCue brand, logo, product identity, privacy principles and deterministic food-intelligence safeguards.

Keep cloud sync optional and consent-based.

Do not upload personal data automatically.

Do not compromise the append-only pantry ledger.

Do not introduce paid services without approval.

Do not treat a successful build as proof of market readiness.

**The final outcome must be a fully integrated FoodCue consumer application—not a prototype, not a technical dashboard and not a collection of disconnected cloud APIs.**

Work in the existing repository. Audit, implement, integrate, test, document and verify every deliverable.


</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-17T14:02:25+05:30.

The user's current state is as follows:
Active Document: c:\Users\parth\OneDrive\Desktop\FoodCue\foodcue Code\.env.vercel (LANGUAGE_UNSPECIFIED)
Cursor is on line: 20

The user has uploaded 1 image(s):
- C:/Users/parth/.gemini/antigravity/brain/1f351ad9-7596-48c3-a628-a669a69bd568/.user_uploaded/media_1794904329517_e96fcde0.png
You can embed this image in an artifact if you need the USER to review it.
</ADDITIONAL_METADATA>