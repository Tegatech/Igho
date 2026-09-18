import { auth } from "@/lib/auth/server";
import { failure, requestId, success } from "@/lib/api";
import { workspaceStore } from "@/lib/workspace-store";

export async function POST(request: Request) {
  const id = requestId(request);
  const { data: session } = await auth.getSession();
  if (!session?.user?.id || !session.user.email) return failure(id, 401, "AUTH_001", "Authentication required");

  const bootstrapEmail = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  if (!bootstrapEmail || session.user.email.toLowerCase() !== bootstrapEmail) {
    return failure(id, 403, "AUTH_003", "Workspace bootstrap is not available for this account");
  }

  if ((await workspaceStore.activeMembershipCount()) > 0) {
    return failure(id, 409, "WORKSPACE_001", "Workspace bootstrap has already been completed");
  }

  const membershipId = await workspaceStore.bootstrapOwner({
    authUserId: session.user.id,
    email: session.user.email,
    displayName: session.user.name ?? session.user.email,
    requestId: id,
  });

  if (!membershipId) return failure(id, 500, "WORKSPACE_002", "Could not create owner membership");
  return success(id, { workspace_slug: "the24thgroup", membership_id: membershipId, role: "OWNER" }, 201);
}
