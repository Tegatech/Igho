import { requireAccess, success } from "@/lib/api";

export async function GET(request: Request) {
  const access = await requireAccess(request);
  if (access instanceof Response) return access;
  return success(access.id, {
    auth_user_id: access.context.authUserId,
    email: access.context.email,
    workspace_id: access.context.workspaceId,
    membership_id: access.context.membershipId,
    roles: access.context.roles,
  });
}
