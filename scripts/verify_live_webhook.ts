import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

const dbUrl = process.env.DATABASE_URL;
const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET || "whsec_3FK0OeRhQ7MX/r8gKZ7vppSbCDgln34o";

console.log("Database URL configured:", !!dbUrl);
console.log("Webhook secret configured:", secret.substring(0, 10) + "...");

const sql = neon(dbUrl);

function generateSvixSignature(rawBody, id, timestamp, secretKey) {
  const cleanedSecret = secretKey.startsWith("whsec_") ? secretKey.substring(6) : secretKey;
  const keyBytes = Buffer.from(cleanedSecret, "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const sig = crypto.createHmac("sha256", keyBytes).update(signedContent).digest("base64");
  return `v1,${sig}`;
}

async function run() {
  const { default: webhookHandler } = await import("../api/webhooks/clerk");

  const testUserId = `user_live_verify_${Date.now()}`;
  const testEmail = `webhook_tester_${Date.now()}@foodcue.local`;

  const payload = {
    data: {
      birthday: "",
      created_at: Date.now(),
      email_addresses: [
        {
          email_address: testEmail,
          id: `idn_${Date.now()}`,
          linked_to: [],
          object: "email_address",
          verification: { status: "verified", strategy: "ticket" }
        }
      ],
      first_name: "Live",
      last_name: "Verification User",
      id: testUserId,
      object: "user",
      primary_email_address_id: `idn_${Date.now()}`,
      username: `verifier_${Date.now()}`
    },
    object: "event",
    type: "user.created"
  };

  const rawBody = JSON.stringify(payload);
  const msgId = `msg_live_delivery_${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSvixSignature(rawBody, msgId, timestamp, secret);

  console.log(`\n1. Delivering live Svix-signed webhook for user: ${testUserId}...`);
  console.log(`   Message ID: ${msgId}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Signature: ${signature.substring(0, 20)}...`);

  const request1 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": msgId,
      "svix-timestamp": timestamp,
      "svix-signature": signature
    },
    body: rawBody
  });

  const response1 = await webhookHandler(request1);
  console.log(`   Response Status: ${response1.status}`);
  const result1 = await response1.json();
  console.log("   Response Body:", result1);

  if (response1.status !== 200 || !result1.received) {
    throw new Error(`Webhook delivery failed with status ${response1.status}`);
  }

  console.log("\n2. Verifying user record in Neon PostgreSQL...");
  const userRows = await sql`
    SELECT id, user_id, clerk_user_id, email, display_name, username, created_at
    FROM foodcue_users
    WHERE clerk_user_id = ${testUserId};
  `;

  console.log("   Found user rows in Neon:", userRows);
  if (userRows.length === 0) {
    throw new Error(`User ${testUserId} NOT found in foodcue_users!`);
  }

  const user = userRows[0];
  if (user.clerk_user_id !== testUserId) {
    throw new Error(`clerk_user_id mismatch! Expected ${testUserId}, got ${user.clerk_user_id}`);
  }
  if (user.user_id !== testUserId) {
    throw new Error(`user_id mismatch! Expected ${testUserId}, got ${user.user_id}`);
  }
  console.log("   ✅ User record correctly verified in Neon!");

  console.log("\n3. Verifying webhook idempotency ledger in Neon...");
  const eventRows = await sql`
    SELECT event_id, event_type, status, error, received_at
    FROM foodcue_webhook_events
    WHERE event_id = ${msgId};
  `;
  console.log("   Found event row:", eventRows);
  if (eventRows.length === 0 || eventRows[0].status !== "processed") {
    throw new Error(`Event status not processed in foodcue_webhook_events!`);
  }
  console.log("   ✅ Webhook event status is 'processed'!");

  console.log("\n4. Testing duplicate delivery attempt (Idempotency check)...");
  const request2 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": msgId,
      "svix-timestamp": timestamp,
      "svix-signature": signature
    },
    body: rawBody
  });

  const response2 = await webhookHandler(request2);
  console.log(`   Response Status: ${response2.status}`);
  const result2 = await response2.json();
  console.log("   Response Body:", result2);

  if (response2.status !== 200 || !result2.deduplicated) {
    throw new Error(`Expected deduplicated response, got ${JSON.stringify(result2)}`);
  }

  const userCountRows = await sql`
    SELECT count(*) as count
    FROM foodcue_users
    WHERE clerk_user_id = ${testUserId};
  `;
  console.log(`   User count after duplicate delivery: ${userCountRows[0].count}`);
  if (Number(userCountRows[0].count) !== 1) {
    throw new Error(`Duplicate user created! Count: ${userCountRows[0].count}`);
  }
  console.log("   ✅ Idempotency strictly verified! No duplicate users created.");

  console.log("\n5. Testing user.updated event...");
  const updatePayload = {
    data: {
      ...payload.data,
      first_name: "UpdatedFirst",
      last_name: "UpdatedLast"
    },
    object: "event",
    type: "user.updated"
  };
  const updateBody = JSON.stringify(updatePayload);
  const updateMsgId = `msg_live_update_${Date.now()}`;
  const updateTimestamp = Math.floor(Date.now() / 1000).toString();
  const updateSignature = generateSvixSignature(updateBody, updateMsgId, updateTimestamp, secret);

  const request3 = new Request("https://food-cue.vercel.app/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": updateMsgId,
      "svix-timestamp": updateTimestamp,
      "svix-signature": updateSignature
    },
    body: updateBody
  });

  const response3 = await webhookHandler(request3);
  const result3 = await response3.json();
  console.log("   Response Status:", response3.status, result3);

  const updatedUserRows = await sql`
    SELECT display_name FROM foodcue_users WHERE clerk_user_id = ${testUserId};
  `;
  console.log("   Updated display name in Neon:", updatedUserRows[0].display_name);
  if (updatedUserRows[0].display_name !== "UpdatedFirst UpdatedLast") {
    throw new Error(`Display name not updated! Got: ${updatedUserRows[0].display_name}`);
  }
  console.log("   ✅ user.updated verified in Neon!");

  console.log("\n6. Cleaning up verification test records from Neon...");
  await sql`DELETE FROM foodcue_users WHERE clerk_user_id = ${testUserId};`;
  await sql`DELETE FROM foodcue_webhook_events WHERE event_id IN (${msgId}, ${updateMsgId});`;
  console.log("   ✅ Cleaned up successfully.");

  console.log("\n🎉 ALL LIVE VERIFICATION CHECKS PASSED!");
}

run().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
