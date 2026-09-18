import type { AccessContext } from "@igho/core";
import { workspaceStore } from "@/lib/workspace-store";

export async function resolveAccessContext(input: { authUserId: string; email: string }): Promise<AccessContext | null> {
  return workspaceStore.resolveAccess(input);
}
