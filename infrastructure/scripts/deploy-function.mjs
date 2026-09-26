// Deploys igho-api with its environment variables.
//
// `catalyst deploy` replaces the function's environment variables with the
// `env_variables` in catalyst-config.json, which is committed empty. This script
// fills them in for the deploy only and always restores the committed file.
//
// Values come from the process environment (Catalyst Pipelines) or, locally,
// from the gitignored .env. If any required value is missing it exits before
// deploying, so a deploy can never wipe the function's variables.
//
// Extra arguments (e.g. --token) are passed through to `catalyst deploy`.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CONFIG_PATH = "functions/igho-api/catalyst-config.json";
const REQUIRED = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "BOOTSTRAP_OWNER_EMAIL"];
const OPTIONAL = ["IGHO_PUBLIC_ORIGIN"];

const dotenv = {};
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && match[2]) dotenv[match[1]] = match[2];
  }
}

const variables = {};
for (const name of [...REQUIRED, ...OPTIONAL]) {
  const value = (process.env[name] || dotenv[name])?.trim();
  // An undefined pipeline variable can arrive as its literal `<< env.X >>` placeholder.
  if (value && !value.includes("<<")) variables[name] = value;
}

const missing = REQUIRED.filter((name) => !variables[name]);
if (missing.length) {
  console.error(`Not deploying igho-api: missing ${missing.join(", ")}.`);
  console.error("Set them as pipeline variables, or in .env locally (see .env.example).");
  process.exit(1);
}

const org = process.env.CATALYST_ORG || "758593152";
const project = process.env.PROJECT_ID || "8644000000692021";

const original = readFileSync(CONFIG_PATH, "utf8");
const config = JSON.parse(original);
config.deployment.env_variables = variables;

try {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  execFileSync(
    "catalyst",
    [
      "deploy",
      "--org",
      org,
      "--project",
      project,
      "--only",
      "functions:igho-api",
      ...process.argv.slice(2),
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
} finally {
  writeFileSync(CONFIG_PATH, original);
}
console.log(`Deployed igho-api with variables: ${Object.keys(variables).join(", ")}`);
