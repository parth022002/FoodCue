import { describe, it, expect } from "vitest";
import { checkDatabaseHealth, query } from "../../../src/server/database/client";

describe("Database Client & Neon Connection Health", () => {
  it("executes SELECT 1 against Neon and returns connected status with latency", async () => {
    const health = await checkDatabaseHealth();
    expect(health).toHaveProperty("connected");
    expect(health).toHaveProperty("latencyMs");
    expect(typeof health.latencyMs).toBe("number");
    expect(health.latencyMs).toBeGreaterThan(0);

    // If connection succeeds, connected should be true and error undefined
    if (health.connected) {
      expect(health.error).toBeUndefined();
    }
  });

  it("safely queries parameterized data without sql injection vulnerabilities", async () => {
    const rows = await query<{ val: number }>("SELECT $1::int AS val;", [42]);
    expect(rows).toBeDefined();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(1);
    expect(Number(rows[0]?.val)).toBe(42);
  });

  it("handles database query failures safely without leaking connection secrets", async () => {
    try {
      // Intentionally invalid table to trigger database error
      await query("SELECT * FROM non_existent_foodcue_table_xyz;");
      expect.fail("Query should have failed");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("Database query failed");
      expect(msg).not.toMatch(/postgres(ql)?:\/\/[^:]+:[^@]+@/);
    }
  });
});
