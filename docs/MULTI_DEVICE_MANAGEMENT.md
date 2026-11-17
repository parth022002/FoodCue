# FoodCue Multi-Device Fleet Management & Revocation Specification

```text
========================================================================================
MODULE:                Client Device Identity & Session Revocation
SPECIFICATION:         FoodCue Security, Privacy and Safety Requirements v1.0 §8
COMPONENTS:            api/devices/index.ts | src/sync/state/syncMetadata.ts
DATABASE TABLE:        sync_devices (Neon PostgreSQL)
========================================================================================
```

---

## 1. Device Registration & Persistent Identity

Each browser or PWA instance generates a persistent client UUID upon initial startup, stored securely in IndexedDB (`syncState.device_meta`).

```sql
CREATE TABLE IF NOT EXISTS sync_devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  client_version TEXT DEFAULT '1.0.0',
  user_agent TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

When synchronization runs, the device sends a heartbeat registration payload to `POST /api/devices` containing:
- `deviceId`: Stable UUID identifier.
- `deviceName`: Human-readable description (e.g. "Chrome on Windows", "Safari on iOS").
- `clientVersion`: SemVer version string of the client build.
- `userAgent`: Browser platform string.

---

## 2. Remote Device Revocation Protocol

Users can review their active device fleet under **My Profile & Preferences → Multi-Device Synchronisation**:
1. Active devices are listed with their last synced timestamp and device name.
2. The current device is labeled with a **"(This Device)"** badge.
3. For all other active devices, a **"Revoke Access"** button is available.
4. Clicking Revoke executes:
   `DELETE /api/devices?deviceId=<UUID>`
5. On Neon PostgreSQL, `sync_devices` updates `is_revoked = TRUE` for that device under the authenticated user.
6. The next time the revoked device attempts to push or pull changes via `/api/sync/push` or `/api/sync/pull`, the API responds with:
   ```json
   {
     "error": "This device has been revoked. Re-authenticate to resume syncing.",
     "code": "DEVICE_REVOKED"
   }
   ```
   with `HTTP 403 Forbidden`, blocking any further data transfer.
