import { neon } from "@neondatabase/serverless";
import type { PantryEvent, PantryItem } from "../../domain/entities/pantry";
import type { ConfirmedLabel } from "../../domain/entities/food";

export interface NeonConnectionStatus {
  connected: boolean;
  host: string;
  database: string;
  serverVersion?: string;
  latencyMs?: number;
  lastSyncAt?: string;
  tablesCount?: number;
  error?: string;
}

export interface CloudUserProfile {
  profileId: string;
  userId: string;
  allergensToAvoid: string[];
  ingredientsToAvoid: string[];
  dietaryPreference: string;
  calmMode: boolean;
  theme: string;
  emergencyContactNumber: string;
  enableCloudBackup: boolean;
  updatedAt: string;
}

export interface CloudReminder {
  reminderId: string;
  itemId: string;
  userId: string;
  title: string;
  reminderType: string;
  targetDate: string;
  snoozeCount: number;
  status: "pending" | "snoozed" | "actioned" | "dismissed";
}

export interface CloudShoppingItem {
  listItemId: string;
  userId: string;
  gtin?: string;
  productName: string;
  brand?: string;
  category: string;
  requestedQuantity: number;
  unit: string;
  checked: boolean;
  source: string;
  notes?: string;
}

export interface CloudCatalogItem {
  id: string;
  gtin: string;
  brand: string;
  product_name: string;
  variant: string;
  pack_size: string;
  fssai_licence: string;
  ingredients: string;
  allergen_declaration: string;
  nutrition_facts: Record<string, number | string>;
  category: string;
  created_at: string;
}

function getDatabaseUrl(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const url = (import.meta as any).env?.VITE_NEON_DATABASE_URL;
  if (!url || typeof url !== "string" || !url.startsWith("postgres")) {
    return null;
  }
  return url;
}

export function parseNeonHost(url: string | null): { host: string; database: string } {
  if (!url) return { host: "Not configured", database: "Not configured" };
  try {
    const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, "https://"));
    return {
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\//, "") || "neondb"
    };
  } catch {
    return { host: "Invalid URL", database: "neondb" };
  }
}

/**
 * Executes a raw SQL query against Neon Lakebase Postgres using @neondatabase/serverless
 */
export async function queryNeon<T = Record<string, unknown>>(
  query: string,
  params: (string | number | boolean | null)[] = []
): Promise<T[]> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    throw new Error("Neon database URL is not configured in VITE_NEON_DATABASE_URL.");
  }

  const sql = neon(dbUrl);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (sql as any)(query, params);
    return result as unknown as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Neon database error";
    throw new Error(`Neon Postgres query failed: ${message}`);
  }
}

/**
 * Checks connection health, latency, and active table count on Neon Lakebase Postgres
 */
export async function testNeonConnection(): Promise<NeonConnectionStatus> {
  const dbUrl = getDatabaseUrl();
  const info = parseNeonHost(dbUrl);

  if (!dbUrl) {
    return {
      connected: false,
      host: info.host,
      database: info.database,
      error: "Neon database URL is not configured."
    };
  }

  const start = performance.now();
  try {
    const versionRows = await queryNeon<{ version: string }>("SELECT version();");
    const tableRows = await queryNeon<{ count: string }>(
      "SELECT count(*)::text as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'foodcue_%';"
    );
    const latency = Math.round(performance.now() - start);

    return {
      connected: true,
      host: info.host,
      database: info.database,
      serverVersion: versionRows[0]?.version?.split(" ")?.[0] ?? "PostgreSQL (Neon)",
      latencyMs: latency,
      tablesCount: Number(tableRows[0]?.count ?? 0),
      lastSyncAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      connected: false,
      host: info.host,
      database: info.database,
      error: err instanceof Error ? err.message : "Connection failed"
    };
  }
}

/**
 * Initializes the full 10-table FoodCue production schema on Neon Postgres
 */
export async function initializeNeonSchema(): Promise<{ success: boolean; message: string; tables: string[] }> {
  try {
    // 1. Users
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_users (
        user_id VARCHAR(64) PRIMARY KEY,
        clerk_id VARCHAR(128) UNIQUE,
        email VARCHAR(255),
        display_name VARCHAR(128),
        is_anonymous BOOLEAN DEFAULT TRUE,
        device_fingerprint VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Profiles
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_profiles (
        profile_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES foodcue_users(user_id) ON DELETE CASCADE,
        allergens_to_avoid TEXT[] DEFAULT '{}',
        ingredients_to_avoid TEXT[] DEFAULT '{}',
        dietary_preference VARCHAR(64) DEFAULT 'standard',
        calm_mode BOOLEAN DEFAULT FALSE,
        theme VARCHAR(16) DEFAULT 'system',
        emergency_contact_number VARCHAR(32) DEFAULT '112',
        enable_cloud_backup BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Catalog
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_catalog (
        catalog_id VARCHAR(64) PRIMARY KEY,
        gtin VARCHAR(14) UNIQUE NOT NULL,
        brand VARCHAR(128) NOT NULL,
        product_name VARCHAR(256) NOT NULL,
        variant VARCHAR(128),
        pack_size VARCHAR(64),
        category VARCHAR(64),
        fssai_licence VARCHAR(32),
        ingredients_text TEXT NOT NULL,
        allergen_declaration TEXT,
        cross_contact_statement TEXT,
        serving_size VARCHAR(64),
        servings_per_pack NUMERIC(6, 2),
        nutrition_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
        ins_additives TEXT[] DEFAULT '{}',
        image_front_url TEXT,
        image_back_url TEXT,
        verified BOOLEAN DEFAULT TRUE,
        verified_by VARCHAR(64) DEFAULT 'curator',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Confirmed Labels
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_confirmed_labels (
        label_id VARCHAR(64) PRIMARY KEY,
        candidate_id VARCHAR(64) NOT NULL,
        gtin VARCHAR(14),
        user_id VARCHAR(64),
        physical_identity VARCHAR(256) NOT NULL,
        label_version VARCHAR(128) NOT NULL,
        lot_number VARCHAR(64),
        date_marking_type VARCHAR(32),
        date_marking_value VARCHAR(64),
        panels JSONB NOT NULL DEFAULT '{}'::jsonb,
        raw_ocr_evidence JSONB DEFAULT '{}'::jsonb,
        field_states JSONB NOT NULL DEFAULT '{}'::jsonb,
        content_hash VARCHAR(64),
        confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Pantry Items
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_pantry_items (
        item_id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) DEFAULT 'local-user',
        catalog_id VARCHAR(64) REFERENCES foodcue_catalog(catalog_id) ON DELETE SET NULL,
        gtin VARCHAR(14),
        product_name VARCHAR(256) NOT NULL,
        brand VARCHAR(128),
        current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
        unit VARCHAR(32) NOT NULL DEFAULT 'pack',
        location VARCHAR(32) NOT NULL DEFAULT 'pantry',
        storage_condition VARCHAR(64) DEFAULT 'ambient',
        lot_number VARCHAR(64),
        date_type VARCHAR(32) DEFAULT 'best_before',
        date_value VARCHAR(64),
        opened_at TIMESTAMPTZ,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Pantry Events (Append-Only Ledger)
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_pantry_events (
        event_id VARCHAR(64) PRIMARY KEY,
        item_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(64) DEFAULT 'local-user',
        event_type VARCHAR(32) NOT NULL,
        quantity_delta NUMERIC(10, 2) NOT NULL,
        unit VARCHAR(32) NOT NULL DEFAULT 'pack',
        location VARCHAR(32),
        date_type VARCHAR(32),
        date_value VARCHAR(64),
        note TEXT,
        compensating_event_id VARCHAR(64),
        source VARCHAR(32) DEFAULT 'user_action',
        occurred_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Reminders
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_reminders (
        reminder_id VARCHAR(64) PRIMARY KEY,
        item_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(64) DEFAULT 'local-user',
        title VARCHAR(256) NOT NULL,
        reminder_type VARCHAR(32) NOT NULL DEFAULT 'expiry',
        target_date TIMESTAMPTZ NOT NULL,
        snooze_count INTEGER DEFAULT 0,
        last_snoozed_at TIMESTAMPTZ,
        status VARCHAR(32) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Shopping List
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_shopping_list (
        list_item_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) DEFAULT 'local-user',
        gtin VARCHAR(14),
        product_name VARCHAR(256) NOT NULL,
        brand VARCHAR(128),
        category VARCHAR(64) DEFAULT 'General',
        requested_quantity NUMERIC(10, 2) DEFAULT 1.00,
        unit VARCHAR(32) DEFAULT 'pack',
        checked BOOLEAN DEFAULT FALSE,
        source VARCHAR(32) DEFAULT 'manual',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Intelligence Rules
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_intelligence_rules (
        rule_id VARCHAR(64) PRIMARY KEY,
        rule_name VARCHAR(128) NOT NULL,
        category VARCHAR(32) NOT NULL,
        pattern_regex TEXT NOT NULL,
        consequence_level VARCHAR(32) NOT NULL,
        legal_reference VARCHAR(128),
        explanation_template TEXT NOT NULL,
        version VARCHAR(16) DEFAULT '1.0',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Audit Log
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_audit_log (
        audit_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) DEFAULT 'local-user',
        action VARCHAR(64) NOT NULL,
        resource_type VARCHAR(64) NOT NULL,
        resource_id VARCHAR(128),
        details JSONB DEFAULT '{}'::jsonb,
        ip_hash VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes
    await queryNeon(`CREATE INDEX IF NOT EXISTS idx_catalog_gtin ON foodcue_catalog(gtin);`);
    await queryNeon(`CREATE INDEX IF NOT EXISTS idx_pantry_items_user ON foodcue_pantry_items(user_id, status);`);
    await queryNeon(`CREATE INDEX IF NOT EXISTS idx_pantry_events_item ON foodcue_pantry_events(item_id, occurred_at);`);
    await queryNeon(`CREATE INDEX IF NOT EXISTS idx_reminders_target ON foodcue_reminders(user_id, status, target_date);`);
    await queryNeon(`CREATE INDEX IF NOT EXISTS idx_shopping_user ON foodcue_shopping_list(user_id, checked);`);

    const tableRows = await queryNeon<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'foodcue_%' ORDER BY table_name;"
    );
    const tables = tableRows.map(r => r.table_name);

    return {
      success: true,
      message: `Complete Neon database schema ready. ${tables.length} tables verified.`,
      tables
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to initialize Neon schema",
      tables: []
    };
  }
}

/**
 * Syncs user profile & preferences to Neon
 */
export async function syncProfileToNeon(profile: CloudUserProfile): Promise<void> {
  await initializeNeonSchema();
  await queryNeon(
    `
    INSERT INTO foodcue_users (user_id, is_anonymous)
    VALUES ($1, TRUE)
    ON CONFLICT (user_id) DO UPDATE SET last_active_at = CURRENT_TIMESTAMP;
  `,
    [profile.userId]
  );

  await queryNeon(
    `
    INSERT INTO foodcue_profiles (
      profile_id, user_id, allergens_to_avoid, ingredients_to_avoid,
      dietary_preference, calm_mode, theme, emergency_contact_number,
      enable_cloud_backup, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    ON CONFLICT (profile_id) DO UPDATE SET
      allergens_to_avoid = EXCLUDED.allergens_to_avoid,
      ingredients_to_avoid = EXCLUDED.ingredients_to_avoid,
      dietary_preference = EXCLUDED.dietary_preference,
      calm_mode = EXCLUDED.calm_mode,
      theme = EXCLUDED.theme,
      emergency_contact_number = EXCLUDED.emergency_contact_number,
      enable_cloud_backup = EXCLUDED.enable_cloud_backup,
      updated_at = CURRENT_TIMESTAMP;
  `,
    [
      profile.profileId,
      profile.userId,
      profile.allergensToAvoid as any,
      profile.ingredientsToAvoid as any,
      profile.dietaryPreference,
      profile.calmMode,
      profile.theme,
      profile.emergencyContactNumber,
      profile.enableCloudBackup
    ]
  );
}

/**
 * Syncs local pantry events to Neon Postgres append-only ledger table
 */
export async function syncPantryEventsToNeon(events: PantryEvent[], userId = "local-user"): Promise<number> {
  if (events.length === 0) return 0;
  await initializeNeonSchema();

  let syncedCount = 0;
  for (const event of events) {
    await queryNeon(
      `
      INSERT INTO foodcue_pantry_events (
        event_id, item_id, user_id, event_type, quantity_delta, unit, location, date_type, date_value, note, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (event_id) DO NOTHING;
    `,
      [
        event.eventId,
        event.itemId,
        userId,
        event.eventType,
        event.quantityDelta,
        event.unit,
        event.location ?? null,
        event.dateType ?? null,
        event.dateValue ?? null,
        event.note ?? null,
        event.occurredAt
      ]
    );
    syncedCount++;
  }
  return syncedCount;
}

/**
 * Fetches all pantry events from Neon Postgres to restore local state
 */
export async function fetchPantryEventsFromNeon(userId = "local-user"): Promise<PantryEvent[]> {
  await initializeNeonSchema();
  const rows = await queryNeon<{
    event_id: string;
    item_id: string;
    event_type: string;
    quantity_delta: string;
    unit: string;
    location: string | null;
    date_type: string | null;
    date_value: string | null;
    note: string | null;
    occurred_at: string;
    created_at: string;
  }>(`SELECT * FROM foodcue_pantry_events WHERE user_id = $1 ORDER BY occurred_at ASC;`, [userId]);

  return rows.map((r) => ({
    eventId: r.event_id,
    itemId: r.item_id,
    eventType: r.event_type as PantryEvent["eventType"],
    quantityDelta: Number(r.quantity_delta),
    unit: r.unit,
    location: (r.location as PantryEvent["location"]) ?? undefined,
    dateType: (r.date_type as PantryEvent["dateType"]) ?? undefined,
    dateValue: r.date_value ?? undefined,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
    source: "import" as const,
    confirmation: true,
    note: r.note ?? undefined,
    schemaVersion: 1
  }));
}

/**
 * Syncs pantry stock items to Neon
 */
export async function syncPantryItemsToNeon(items: PantryItem[], userId = "local-user"): Promise<number> {
  if (items.length === 0) return 0;
  await initializeNeonSchema();

  let count = 0;
  for (const item of items) {
    await queryNeon(
      `
      INSERT INTO foodcue_pantry_items (
        item_id, user_id, product_name, current_quantity, unit, location, date_type, date_value, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (item_id) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        current_quantity = EXCLUDED.current_quantity,
        unit = EXCLUDED.unit,
        location = EXCLUDED.location,
        date_type = EXCLUDED.date_type,
        date_value = EXCLUDED.date_value,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `,
      [
        item.itemId,
        userId,
        item.productName,
        item.currentQuantity,
        item.unit,
        item.location,
        item.dateType ?? null,
        item.dateValue ?? null,
        item.status
      ]
    );
    count++;
  }
  return count;
}

/**
 * Syncs shopping list items to Neon
 */
export async function syncShoppingListToNeon(items: CloudShoppingItem[], userId = "local-user"): Promise<number> {
  if (items.length === 0) return 0;
  await initializeNeonSchema();

  let count = 0;
  for (const it of items) {
    await queryNeon(
      `
      INSERT INTO foodcue_shopping_list (
        list_item_id, user_id, gtin, product_name, brand, category, requested_quantity, unit, checked, source, notes, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (list_item_id) DO UPDATE SET
        checked = EXCLUDED.checked,
        requested_quantity = EXCLUDED.requested_quantity,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP;
    `,
      [
        it.listItemId,
        userId,
        it.gtin ?? null,
        it.productName,
        it.brand ?? null,
        it.category,
        it.requestedQuantity,
        it.unit,
        it.checked,
        it.source,
        it.notes ?? null
      ]
    );
    count++;
  }
  return count;
}

/**
 * Syncs a confirmed label to Neon
 */
export async function syncConfirmedLabelToNeon(label: ConfirmedLabel, userId = "local-user"): Promise<void> {
  await initializeNeonSchema();
  await queryNeon(
    `
    INSERT INTO foodcue_confirmed_labels (
      label_id, candidate_id, user_id, physical_identity, label_version, panels, field_states, confirmed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (label_id) DO UPDATE SET
      physical_identity = EXCLUDED.physical_identity,
      label_version = EXCLUDED.label_version,
      panels = EXCLUDED.panels,
      field_states = EXCLUDED.field_states;
  `,
    [
      label.confirmedLabelId,
      label.candidateId,
      userId,
      label.confirmedPhysicalIdentity,
      label.labelVersion,
      JSON.stringify(label.panels),
      JSON.stringify(label.fieldConfirmationStates),
      label.confirmedAt
    ]
  );
}

/**
 * Logs a privacy/security audit entry to Neon
 */
export async function logAuditEventToNeon(
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {},
  userId = "local-user"
): Promise<void> {
  try {
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await queryNeon(
      `
      INSERT INTO foodcue_audit_log (audit_id, user_id, action, resource_type, resource_id, details)
      VALUES ($1, $2, $3, $4, $5, $6);
    `,
      [auditId, userId, action, resourceType, resourceId, JSON.stringify(details)]
    );
  } catch {
    // Non-blocking for local privacy operations
  }
}
