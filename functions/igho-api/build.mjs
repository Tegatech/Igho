import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "index.js",
  sourcemap: false,
  minify: false,
  external: ["express", "jose", "@neondatabase/serverless"],
});
