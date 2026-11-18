import { build } from "esbuild";
import { dirname } from "path";
import { mkdirSync } from "fs";

const targets = [
  {
    entry: "src/server/endpoints/me.ts",
    outfile: "api/me.js"
  },
  {
    entry: "src/server/endpoints/devices.ts",
    outfile: "api/devices/index.js"
  },
  {
    entry: "src/server/endpoints/syncRouter.ts",
    outfile: "api/sync/index.js"
  },
  {
    entry: "src/server/endpoints/notificationsSubscribe.ts",
    outfile: "api/notifications/subscribe.js"
  },
  {
    entry: "src/server/endpoints/profile.ts",
    outfile: "api/profile/index.js"
  },
  {
    entry: "src/server/endpoints/householdsRouter.ts",
    outfile: "api/households/index.js"
  },
  {
    entry: "src/server/endpoints/invitations.ts",
    outfile: "api/invitations/index.js"
  },
  {
    entry: "src/server/endpoints/sharing.ts",
    outfile: "api/sharing/index.js"
  },
  {
    entry: "src/server/endpoints/accountDelete.ts",
    outfile: "api/account/delete.js"
  },
  {
    entry: "src/server/endpoints/health.ts",
    outfile: "api/health.js"
  },
  {
    entry: "src/server/endpoints/clerkWebhook.ts",
    outfile: "api/webhooks/clerk.js"
  }
];

async function bundleAll() {
  console.log("Bundling Vercel serverless API handlers with esbuild...");

  for (const { entry, outfile } of targets) {
    mkdirSync(dirname(outfile), { recursive: true });
    await build({
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node20",
      external: ["@neondatabase/serverless", "@clerk/backend"],
      outfile
    });
    console.log(`✓ Bundled ${entry} -> ${outfile}`);
  }

  console.log("All 11 Vercel serverless API handlers bundled successfully!");
  process.exit(0);
}

bundleAll().catch((err) => {
  console.error("API bundling failed:", err);
  process.exit(1);
});
