import { requirePermission, type RoleKey } from "@igho/core";
import { requireAccess, failure, success } from "@/lib/api";
import { workspaceStore } from "@/lib/workspace-store";

const allowedRoles = new Set<RoleKey>(["PAYROLL_ADMIN", "APPROVER", "EMPLOYEE"]);

export async function POST(request: Request) {
  const access = await requireAccess(request);
  if (access instanceof Response) return access;
  try {
    requirePermission(access.context, "users.manage");
  } catch {
    return failure(access.id, 403, "AUTH_004", "Permission denied");
  }

  const body = (await request.json()) as { email?: string; role?: RoleKey };
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  if (!email || !role || !allowedRoles.has(role)) {
    return failure(access.id, 422, "INVITE_001", "A valid email and invite role are required");
  }

  const invitation = await workspaceStore.createInvitation({
    workspaceId: access.context.workspaceId,
    actorAuthUserId: access.context.authUserId,
    email,
    role: role as Exclude<RoleKey, "OWNER">,
    requestId: access.id,
  });
  if (!invitation) return failure(access.id, 500, "INVITE_002", "Could not create invitation");

  return success(access.id, {
    invitation_id: invitation.invitationId,
    activation_token: invitation.token,
    expires_at: invitation.expiresAt,
  }, 201);
}
