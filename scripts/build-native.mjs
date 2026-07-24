// Native (Capacitor) build: produces a fully static out/ bundle to ship inside
// the app, so the UI opens with no network and does not depend on Vercel being
// reachable.
//
// Why the shuffle: /api/* route handlers are server-only (e.g. the health
// canary declares `dynamic = "force-dynamic"`), and Next refuses to run
// `output: export` while they are present. Those routes belong to the Vercel
// deployment, not to the packaged app — the app calls them over the network via
// src/lib/api.ts. So we move them aside for the duration of this build only.
//
// Safety: the move is always reversed in a finally block, on SIGINT, and — if a
// previous run was killed hard — recovered on the next startup. The repo must
// never be left in a half-moved state.

import { spawnSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(root, "src", "app", "api");
const PARKED = join(root, ".api-parked-during-native-build");

function restore() {
  if (existsSync(PARKED) && !existsSync(API_DIR)) {
    renameSync(PARKED, API_DIR);
    console.log("[build:native] restored src/app/api");
  }
}

// Recover from a previous run that was killed before it could restore.
if (existsSync(PARKED)) {
  if (existsSync(API_DIR)) {
    // Both exist: the parked copy is a leftover duplicate, drop it.
    rmSync(PARKED, { recursive: true, force: true });
    console.log("[build:native] removed stale parked copy");
  } else {
    console.log("[build:native] recovering from an interrupted previous run");
    restore();
  }
}

if (!existsSync(API_DIR)) {
  console.error("[build:native] src/app/api not found — aborting rather than guessing");
  process.exit(1);
}

process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

let code = 1;
try {
  renameSync(API_DIR, PARKED);
  console.log("[build:native] parked src/app/api, building static export...");

  const result = spawnSync("npm", ["run", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, BUILD_TARGET: "capacitor" },
  });
  code = result.status ?? 1;
} finally {
  restore();
}

if (code === 0) {
  console.log("[build:native] done — static bundle is in out/");
} else {
  console.error(`[build:native] build failed (exit ${code})`);
}
process.exit(code);
