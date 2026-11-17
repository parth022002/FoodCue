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
    entry: "src/server/endpoints/syncPush.ts",
    outfile: "api/sync/push.js"
  },
  {
    entry: "src/server/endpoints/syncPull.ts",
    outfile: "api/sync/pull.js"
  },
  {
    entry: "src/server/endpoints/syncMigrate.ts",
    outfile: "api/sync/migrate.js"
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

  console.log("All Vercel serverless API handlers bundled successfully!");
}

bundleAll().catch((err) => {
  console.error("API bundling failed:", err);
  process.exit(1);
});
