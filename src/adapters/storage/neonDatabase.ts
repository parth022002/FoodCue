import { neon } from "@neondatabase/serverless";
import type { PantryEvent } from "../../domain/entities/pantry";
import type { ConfirmedLabel } from "../../domain/entities/food";

export interface NeonConnectionStatus {
  connected: boolean;
  host: string;
  database: string;
  serverVersion?: string;
  latencyMs?: number;
  lastSyncAt?: string;
  error?: string;
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
 * Checks connection health and latency to Neon Lakebase Postgres
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
    const rows = await queryNeon<{ version: string }>("SELECT version();");
    const latency = Math.round(performance.now() - start);
    return {
      connected: true,
      host: info.host,
      database: info.database,
      serverVersion: rows[0]?.version?.split(" ")?.[0] ?? "PostgreSQL (Neon)",
      latencyMs: latency,
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
 * Initializes tables in Neon for FoodCue cloud sync:
 * - foodcue_catalog (verified Indian packaged foods)
 * - foodcue_pantry_events (append-only ledger backup)
 * - foodcue_confirmed_labels (pack memory cloud sync)
 */
export async function initializeNeonSchema(): Promise<{ success: boolean; message: string }> {
  try {
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_catalog (
        id VARCHAR(64) PRIMARY KEY,
        gtin VARCHAR(14) UNIQUE,
        brand VARCHAR(128) NOT NULL,
        product_name VARCHAR(256) NOT NULL,
        variant VARCHAR(128),
        pack_size VARCHAR(64),
        fssai_licence VARCHAR(32),
        ingredients TEXT,
        allergen_declaration TEXT,
        nutrition_facts JSONB,
        category VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_pantry_events (
        event_id VARCHAR(64) PRIMARY KEY,
        item_id VARCHAR(128) NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        quantity_delta NUMERIC(10, 2) NOT NULL,
        unit VARCHAR(32) NOT NULL,
        location VARCHAR(32),
        date_type VARCHAR(32),
        date_value VARCHAR(64),
        note TEXT,
        occurred_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryNeon(`
      CREATE TABLE IF NOT EXISTS foodcue_confirmed_labels (
        label_id VARCHAR(64) PRIMARY KEY,
        candidate_id VARCHAR(64) NOT NULL,
        physical_identity VARCHAR(256) NOT NULL,
        label_version VARCHAR(128) NOT NULL,
        panels JSONB,
        field_states JSONB,
        confirmed_at TIMESTAMPTZ NOT NULL
      );
    `);

    return { success: true, message: "Neon Postgres tables initialized successfully." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to initialize Neon schema"
    };
  }
}

/**
 * Syncs local pantry events to Neon Postgres append-only ledger table
 */
export async function syncPantryEventsToNeon(events: PantryEvent[]): Promise<number> {
  if (events.length === 0) return 0;
  await initializeNeonSchema();

  let syncedCount = 0;
  for (const event of events) {
    await queryNeon(
      `
      INSERT INTO foodcue_pantry_events (
        event_id, item_id, event_type, quantity_delta, unit, note, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (event_id) DO NOTHING;
    `,
      [
        event.eventId,
        event.itemId,
        event.eventType,
        event.quantityDelta,
        event.unit,
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
export async function fetchPantryEventsFromNeon(): Promise<PantryEvent[]> {
  await initializeNeonSchema();
  const rows = await queryNeon<{
    event_id: string;
    item_id: string;
    event_type: string;
    quantity_delta: string;
    unit: string;
    note: string | null;
    occurred_at: string;
    created_at: string;
  }>(`SELECT * FROM foodcue_pantry_events ORDER BY occurred_at ASC;`);

  return rows.map((r) => ({
    eventId: r.event_id,
    itemId: r.item_id,
    eventType: r.event_type as PantryEvent["eventType"],
    quantityDelta: Number(r.quantity_delta),
    unit: r.unit,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
    source: "import" as const,
    confirmation: true,
    note: r.note ?? undefined,
    schemaVersion: 1
  }));
}

/**
 * Syncs a confirmed label to Neon
 */
export async function syncConfirmedLabelToNeon(label: ConfirmedLabel): Promise<void> {
  await initializeNeonSchema();
  await queryNeon(
    `
    INSERT INTO foodcue_confirmed_labels (
      label_id, candidate_id, physical_identity, label_version, panels, field_states, confirmed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (label_id) DO UPDATE SET
      physical_identity = EXCLUDED.physical_identity,
      label_version = EXCLUDED.label_version,
      panels = EXCLUDED.panels,
      field_states = EXCLUDED.field_states;
  `,
    [
      label.confirmedLabelId,
      label.candidateId,
      label.confirmedPhysicalIdentity,
      label.labelVersion,
      JSON.stringify(label.panels),
      JSON.stringify(label.fieldConfirmationStates),
      label.confirmedAt
    ]
  );
}
