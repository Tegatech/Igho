import { createNeonWorkspaceStore } from "@igho/providers";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

export const workspaceStore = createNeonWorkspaceStore(databaseUrl);
