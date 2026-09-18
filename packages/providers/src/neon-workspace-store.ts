import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { permissionsForRoles, type AccessContext, type RoleKey } from "@igho/core";

interface MembershipRow { membership_id: string; workspace_id: string; role_key: RoleKey; }
interface InvitationRow { id: string; workspace_id: string; email: string; role_id: string; }

export function createNeonWorkspaceStore(databaseUrl: string) {
  const sql = neon(databaseUrl);

  return {
    async resolveAccess(input: { authUserId: string; email: string }): Promise<AccessContext | null> {
      const rows = await sql<MembershipRow[]>`
        select wm.id::text as membership_id, wm.workspace_id::text as workspace_id, r.role_key
        from public.workspace_memberships wm
        join public.membership_role_assignments mra on mra.membership_id = wm.id
        join public.roles r on r.id = mra.role_id
        where wm.auth_user_id = ${input.authUserId}::uuid
          and wm.status = 'active' and wm.deleted_at is null
        order by wm.created_at asc, r.role_key asc
      `;
      const first = rows[0];
      if (!first) return null;
      const roles = rows.filter((row) => row.workspace_id === first.workspace_id).map((row) => row.role_key);
      return { authUserId: input.authUserId, email: input.email, workspaceId: first.workspace_id, membershipId: first.membership_id, roles, permissions: permissionsForRoles(roles) };
    },

    async activeMembershipCount(): Promise<number> {
      const rows = await sql<{ count: number }[]>`select count(*)::int as count from public.workspace_memberships where deleted_at is null`;
      return rows[0]?.count ?? 0;
    },

    async bootstrapOwner(input: { authUserId: string; email: string; displayName: string; requestId: string }): Promise<string | null> {
      const rows = await sql<{ membership_id: string }[]>`
        with profile as (
          insert into public.user_profiles (auth_user_id, display_name, created_by)
          values (${input.authUserId}::uuid, ${input.displayName}, ${input.authUserId}::uuid)
          on conflict (auth_user_id) do update set display_name = excluded.display_name, updated_at = now()
        ), membership as (
          insert into public.workspace_memberships (workspace_id, auth_user_id, created_by)
          select w.id, ${input.authUserId}::uuid, ${input.authUserId}::uuid
          from public.workspaces w where w.slug = 'the24thgroup'
          returning id, workspace_id
        ), assignment as (
          insert into public.membership_role_assignments (membership_id, role_id, assigned_by)
          select m.id, r.id, ${input.authUserId}::uuid from membership m join public.roles r on r.role_key = 'OWNER'
        ), audit as (
          insert into public.audit_events (workspace_id, actor_auth_user_id, action, resource_type, resource_id, outcome, request_id)
          select m.workspace_id, ${input.authUserId}::uuid, 'workspace.bootstrap', 'workspace_membership', m.id, 'success', ${input.requestId}
          from membership m
        )
        select id::text as membership_id from membership
      `;
      return rows[0]?.membership_id ?? null;
    },

    async createInvitation(input: { workspaceId: string; actorAuthUserId: string; email: string; role: Exclude<RoleKey, "OWNER">; requestId: string }): Promise<{ invitationId: string; token: string; expiresAt: string } | null> {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const rows = await sql<{ id: string }[]>`
        with invitation as (
          insert into public.workspace_invitations (workspace_id, email, role_id, token_hash, invited_by, expires_at)
          select ${input.workspaceId}::uuid, ${input.email}, r.id, ${tokenHash}, ${input.actorAuthUserId}::uuid, ${expiresAt}::timestamptz
          from public.roles r where r.role_key = ${input.role}
          returning id
        ), audit as (
          insert into public.audit_events (workspace_id, actor_auth_user_id, action, resource_type, resource_id, outcome, request_id, metadata)
          select ${input.workspaceId}::uuid, ${input.actorAuthUserId}::uuid, 'workspace.invitation.created', 'workspace_invitation', i.id, 'success', ${input.requestId}, jsonb_build_object('role', ${input.role})
          from invitation i
        )
        select id::text from invitation
      `;
      const id = rows[0]?.id;
      return id ? { invitationId: id, token, expiresAt } : null;
    },

    async acceptInvitation(input: { authUserId: string; email: string; displayName: string; token: string; requestId: string }): Promise<{ workspaceId: string; membershipId: string } | null> {
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const invites = await sql<InvitationRow[]>`
        select id::text, workspace_id::text, email, role_id::text
        from public.workspace_invitations
        where token_hash = ${tokenHash} and status = 'pending' and deleted_at is null and expires_at > now()
        limit 1
      `;
      const invite = invites[0];
      if (!invite || invite.email.toLowerCase() !== input.email.toLowerCase()) return null;

      const rows = await sql<{ workspace_id: string; membership_id: string }[]>`
        with profile as (
          insert into public.user_profiles (auth_user_id, display_name, created_by)
          values (${input.authUserId}::uuid, ${input.displayName}, ${input.authUserId}::uuid)
          on conflict (auth_user_id) do update set display_name = excluded.display_name, updated_at = now()
        ), membership as (
          insert into public.workspace_memberships (workspace_id, auth_user_id, created_by)
          values (${invite.workspace_id}::uuid, ${input.authUserId}::uuid, ${input.authUserId}::uuid)
          returning id, workspace_id
        ), assignment as (
          insert into public.membership_role_assignments (membership_id, role_id, assigned_by)
          select m.id, ${invite.role_id}::uuid, ${input.authUserId}::uuid from membership m
        ), invitation_update as (
          update public.workspace_invitations set status='accepted', accepted_at=now(), accepted_by=${input.authUserId}::uuid, updated_at=now()
          where id=${invite.id}::uuid
        ), audit as (
          insert into public.audit_events (workspace_id, actor_auth_user_id, action, resource_type, resource_id, outcome, request_id)
          select m.workspace_id, ${input.authUserId}::uuid, 'workspace.invitation.accepted', 'workspace_membership', m.id, 'success', ${input.requestId}
          from membership m
        )
        select workspace_id::text, id::text as membership_id from membership
      `;
      return rows[0] ?? null;
    },
  };
}
