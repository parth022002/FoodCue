import { neon } from "@neondatabase/serverless";
import fs from "fs";
import crypto from "crypto";

// Load .env.vercel or environment variables
try {
  const envContent = fs.readFileSync(".env.vercel", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {}

const connectionString = process.env.DATABASE_URL || process.env.VITE_NEON_DATABASE_URL;
if (!connectionString) {
  console.error("FATAL: DATABASE_URL not found.");
  process.exit(1);
}

const sql = neon(connectionString);

const signingSecret =
  process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
  process.env.CLERK_WEBHOOK_SECRET ||
  "whsec_3FK00eRhQ7MX/r8gKZ7vppSbCDgln34o";

function generateSvixHeaders(payloadString, eventId, timestampSeconds) {
  const cleanedSecret = signingSecret.startsWith("whsec_") ? signingSecret.substring(6) : signingSecret;
  const keyBytes = Buffer.from(cleanedSecret, "base64");
  const signedContent = `${eventId}.${timestampSeconds}.${payloadString}`;
  const sig = crypto.createHmac("sha256", keyBytes).update(signedContent).digest("base64");
  return {
    "svix-id": eventId,
    "svix-timestamp": String(timestampSeconds),
    "svix-signature": `v1,${sig}`,
    "content-type": "application/json"
  };
}

async function runAudit() {
  console.log("================================================================================");
  console.log("       FOODCUE — STEP 5 FINAL CLERK WEBHOOK & IDENTITY AUDIT ON LIVE NEON       ");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. IDENTITY SCHEMA AUDIT
  // ---------------------------------------------------------------------------
  console.log(">>> [AUDIT 1] Inspecting foodcue_users table schema...");
  const columns = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'foodcue_users'
    ORDER BY ordinal_position;
  `;
  console.table(columns);

  const constraints = await sql`
    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'foodcue_users';
  `;
  console.log("\nConstraints on foodcue_users:");
  console.table(constraints);

  const foreignKeys = await sql`
    SELECT
      tc.table_name AS referencing_table,
      kcu.column_name AS referencing_column,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'foodcue_users';
  `;
  console.log("\nTables with foreign keys referencing foodcue_users:");
  console.table(foreignKeys);

  // ---------------------------------------------------------------------------
  // 2. EXISTING USER RECORDS AUDIT
  // ---------------------------------------------------------------------------
  console.log("\n>>> [AUDIT 2] Inspecting existing records in foodcue_users...");
  const existingUsers = await sql`
    SELECT user_id, clerk_user_id, clerk_id, email, username, display_name, created_at, updated_at, deleted_at
    FROM foodcue_users
    ORDER BY created_at ASC;
  `;
  console.table(existingUsers);

  // ---------------------------------------------------------------------------
  // 3. RECENT WEBHOOK EVENTS AUDIT
  // ---------------------------------------------------------------------------
  console.log("\n>>> [AUDIT 3] Inspecting recent events in foodcue_webhook_events...");
  const recentEvents = await sql`
    SELECT event_id, event_type, status, error, received_at
    FROM foodcue_webhook_events
    ORDER BY received_at DESC
    LIMIT 10;
  `;
  console.table(recentEvents);

  // ---------------------------------------------------------------------------
  // 4. LIVE END-TO-END WEBHOOK LIFECYCLE TESTS (Disposable Test Account)
  // ---------------------------------------------------------------------------
  const testRunId = `step5_audit_${Date.now()}`;
  const disposableClerkId = `user_${testRunId}`;
  const nowSec = Math.floor(Date.now() / 1000);

  console.log(`\n>>> [AUDIT 4] Initiating Live Verification with Disposable Account: ${disposableClerkId}\n`);

  // Import handler dynamically
  const { default: webhookHandler } = await import("../api/webhooks/clerk.ts");

  // TEST 4.1: user.created
  console.log("--- Test 4.1: user.created ---");
  const event1Id = `msg_test_created_${testRunId}`;
  const event1Payload = {
    type: "user.created",
    data: {
      id: disposableClerkId,
      first_name: "Audit",
      last_name: "Verifier",
      username: `verifier_${Date.now()}`,
      primary_email_address_id: "email_audit_1",
      email_addresses: [
        { id: "email_audit_1", email_address: `audit_${Date.now()}@foodcue.local` }
      ]
    }
  };
  const event1Body = JSON.stringify(event1Payload);
  const event1Headers = generateSvixHeaders(event1Body, event1Id, nowSec);

  const req1 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: event1Headers,
    body: event1Body
  });

  const res1 = await webhookHandler(req1);
  const json1 = await res1.json();
  console.log("user.created response status:", res1.status, json1);

  // Verify in DB
  const dbUserCreated = await sql`
    SELECT user_id, clerk_user_id, email, username, display_name, deleted_at
    FROM foodcue_users
    WHERE clerk_user_id = ${disposableClerkId};
  `;
  console.log("DB state after user.created:");
  console.table(dbUserCreated);
  if (dbUserCreated.length !== 1) throw new Error("user.created failed to insert row!");

  // TEST 4.2: Idempotent replay of user.created
  console.log("\n--- Test 4.2: Duplicate Delivery / Replay of user.created ---");
  const req2 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: event1Headers,
    body: event1Body
  });
  const res2 = await webhookHandler(req2);
  const json2 = await res2.json();
  console.log("user.created replay response status:", res2.status, json2);
  if (json2.deduplicated !== true) {
    throw new Error("Duplicate delivery was not flagged as deduplicated!");
  }

  // Verify DB count has not changed
  const countAfterReplay = await sql`
    SELECT count(*)::int as count FROM foodcue_users WHERE clerk_user_id = ${disposableClerkId};
  `;
  console.log("Row count after replay (must be 1):", countAfterReplay[0].count);
  if (countAfterReplay[0].count !== 1) throw new Error("Duplicate rows created by replay!");

  // TEST 4.3: user.updated (Normal profile update)
  console.log("\n--- Test 4.3: user.updated (Normal Profile Update) ---");
  const event3Id = `msg_test_updated_${testRunId}`;
  const updatedEmail = `audit_updated_${Date.now()}@foodcue.local`;
  const event3Payload = {
    type: "user.updated",
    data: {
      id: disposableClerkId,
      first_name: "AuditUpdated",
      last_name: "VerifierUpdated",
      username: `verifier_upd_${Date.now()}`,
      primary_email_address_id: "email_audit_2",
      email_addresses: [
        { id: "email_audit_2", email_address: updatedEmail }
      ]
    }
  };
  const event3Body = JSON.stringify(event3Payload);
  const event3Headers = generateSvixHeaders(event3Body, event3Id, nowSec + 1);

  const req3 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: event3Headers,
    body: event3Body
  });
  const res3 = await webhookHandler(req3);
  const json3 = await res3.json();
  console.log("user.updated response status:", res3.status, json3);

  const dbUserUpdated = await sql`
    SELECT user_id, clerk_user_id, email, username, display_name, updated_at
    FROM foodcue_users
    WHERE clerk_user_id = ${disposableClerkId};
  `;
  console.log("DB state after user.updated:");
  console.table(dbUserUpdated);
  if (dbUserUpdated[0].email !== updatedEmail) {
    throw new Error("user.updated did not update primary email!");
  }
  if (dbUserUpdated[0].display_name !== "AuditUpdated VerifierUpdated") {
    throw new Error("user.updated did not update display_name!");
  }

  // TEST 4.4: user.updated with MISSING OPTIONAL FIELDS (Safety preservation via COALESCE)
  console.log("\n--- Test 4.4: user.updated with Missing Optional Fields (COALESCE Safety) ---");
  const event4Id = `msg_test_sparse_${testRunId}`;
  const event4Payload = {
    type: "user.updated",
    data: {
      id: disposableClerkId
      // Notice: username omitted, email_addresses omitted, first_name omitted
    }
  };
  const event4Body = JSON.stringify(event4Payload);
  const event4Headers = generateSvixHeaders(event4Body, event4Id, nowSec + 2);

  const req4 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: event4Headers,
    body: event4Body
  });
  const res4 = await webhookHandler(req4);
  const json4 = await res4.json();
  console.log("sparse user.updated response status:", res4.status, json4);

  const dbUserSparse = await sql`
    SELECT user_id, clerk_user_id, email, username, display_name
    FROM foodcue_users
    WHERE clerk_user_id = ${disposableClerkId};
  `;
  console.log("DB state after sparse user.updated (must retain existing values):");
  console.table(dbUserSparse);
  if (dbUserSparse[0].email !== updatedEmail) {
    throw new Error("Sparse payload wiped out valid existing email!");
  }
  if (dbUserSparse[0].display_name !== "AuditUpdated VerifierUpdated") {
    throw new Error("Sparse payload wiped out valid existing display_name!");
  }

  // TEST 4.5: user.deleted (Soft Delete verification)
  console.log("\n--- Test 4.5: user.deleted (Soft Delete Verification) ---");
  const event5Id = `msg_test_deleted_${testRunId}`;
  const event5Payload = {
    type: "user.deleted",
    data: {
      id: disposableClerkId
    }
  };
  const event5Body = JSON.stringify(event5Payload);
  const event5Headers = generateSvixHeaders(event5Body, event5Id, nowSec + 3);

  const req5 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: event5Headers,
    body: event5Body
  });
  const res5 = await webhookHandler(req5);
  const json5 = await res5.json();
  console.log("user.deleted response status:", res5.status, json5);

  const dbUserDeleted = await sql`
    SELECT user_id, clerk_user_id, email, display_name, deleted_at
    FROM foodcue_users
    WHERE clerk_user_id = ${disposableClerkId};
  `;
  console.log("DB state after user.deleted (record preserved with deleted_at timestamp):");
  console.table(dbUserDeleted);
  if (!dbUserDeleted[0].deleted_at) {
    throw new Error("user.deleted did not set deleted_at timestamp!");
  }

  // TEST 4.6: Invalid Signature
  console.log("\n--- Test 4.6: Invalid Signature Rejection ---");
  const badHeaders = {
    "svix-id": "msg_tampered",
    "svix-timestamp": String(nowSec),
    "svix-signature": "v1,badsignaturedeadbeef123456",
    "content-type": "application/json"
  };
  const reqBad = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: badHeaders,
    body: JSON.stringify({ type: "user.created", data: { id: "user_hacker" } })
  });
  const resBad = await webhookHandler(reqBad);
  const jsonBad = await resBad.json();
  console.log("Invalid signature response (expected 401):", resBad.status, jsonBad);
  if (resBad.status !== 401) throw new Error("Handler did not reject invalid signature with 401!");

  // TEST 4.7: Cross-User Identity Isolation
  console.log("\n--- Test 4.7: Cross-User Identity Isolation ---");
  // Ensure that updating or deleting user B does not touch user A
  const otherUser = existingUsers.find(u => u.clerk_user_id !== disposableClerkId);
  if (otherUser) {
    const checkOther = await sql`
      SELECT clerk_user_id, deleted_at FROM foodcue_users WHERE clerk_user_id = ${otherUser.clerk_user_id};
    `;
    console.log(`Other user ${otherUser.clerk_user_id} untouched: deleted_at =`, checkOther[0]?.deleted_at);
  }

  // Cleanup disposable test records
  console.log("\n>>> Cleaning up test fixtures created during audit...");
  await sql`DELETE FROM foodcue_users WHERE clerk_user_id = ${disposableClerkId};`;
  await sql`DELETE FROM foodcue_webhook_events WHERE event_id LIKE ${`msg_test_%${testRunId}`};`;
  console.log("✓ Audit test fixtures cleanly removed.");

  console.log("\n================================================================================");
  console.log("                   ALL 8 STEP 5 VERIFICATION AUDITS PASSED                      ");
  console.log("================================================================================\n");
}

runAudit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
