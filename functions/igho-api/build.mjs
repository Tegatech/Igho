import { build } from "esbuild";

await build({
  entryPoints: ["functions/igho-api/src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "functions/igho-api/index.js",
  sourcemap: false,
  minify: false,
  external: ["express", "jose", "@neondatabase/serverless"],
});
