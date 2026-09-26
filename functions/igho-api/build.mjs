import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// npm packages ship in the function's own node_modules; workspace packages are bundled.
const external = ["express", "jose", "@neondatabase/serverless"];

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "index.js",
  sourcemap: false,
  minify: false,
  external,
});

// npm workspaces hoist dependencies to the repo root, so install the externals
// outside the workspace and copy them in for Catalyst to upload.
const { dependencies } = JSON.parse(readFileSync("package.json", "utf8"));
const staging = mkdtempSync(join(tmpdir(), "igho-api-deps-"));

try {
  writeFileSync(
    join(staging, "package.json"),
    JSON.stringify({
      private: true,
      dependencies: Object.fromEntries(external.map((name) => [name, dependencies[name]])),
    }),
  );
  execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
    cwd: staging,
    stdio: "inherit",
  });
  rmSync("node_modules", { recursive: true, force: true });
  cpSync(join(staging, "node_modules"), "node_modules", { recursive: true });
} finally {
  rmSync(staging, { recursive: true, force: true });
}
