import { auth } from "@/lib/auth/server";
import { failure, requestId, success } from "@/lib/api";
import { workspaceStore } from "@/lib/workspace-store";

export async function POST(request: Request) {
  const id = requestId(request);
  const { data: session } = await auth.getSession();
  if (!session?.user?.id || !session.user.email) return failure(id, 401, "AUTH_001", "Authentication required");

  const body = (await request.json()) as { token?: string };
  if (!body.token) return failure(id, 422, "INVITE_003", "Invitation token is required");

  const accepted = await workspaceStore.acceptInvitation({
    authUserId: session.user.id,
    email: session.user.email,
    displayName: session.user.name ?? session.user.email,
    token: body.token,
    requestId: id,
  });

  if (!accepted) return failure(id, 403, "INVITE_004", "Invitation is invalid, expired, or belongs to another email address");
  return success(id, accepted, 201);
}
