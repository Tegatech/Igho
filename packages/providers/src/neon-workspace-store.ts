import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { permissionsForRoles, type AccessContext, type RoleKey } from "@igho/core";

interface MembershipRow {
  membership_id: string;
  workspace_id: string;
  role_key: RoleKey;
}

interface InvitationRow {
  id: string;
  workspace_id: string;
  email: string;
  role_id: string;
  employee_id: string | null;
}

interface EmployeeRow {
  id: string;
  membership_id: string | null;
  email: string;
  full_name: string;
  job_title: string;
  monthly_pay_amount: string;
  currency: string;
  employment_start_date: string | null;
  status: "invited" | "active" | "inactive";
  bank_name: string | null;
  account_number_last4: string | null;
  account_name: string | null;
  verification_status: "action_required" | "pending" | "verified" | "failed";
}

function mapEmployee(row: EmployeeRow) {
  return {
    id: row.id,
    membershipId: row.membership_id,
    email: row.email,
    fullName: row.full_name,
    jobTitle: row.job_title,
    monthlyPayAmount: Number(row.monthly_pay_amount),
    currency: row.currency,
    employmentStartDate: row.employment_start_date,
    status: row.status,
    bankAccount: {
      bankName: row.bank_name,
      accountNumberLast4: row.account_number_last4,
      accountName: row.account_name,
      verificationStatus: row.verification_status,
    },
  };
}

export function createNeonWorkspaceStore(databaseUrl: string) {
  const sql = neon(databaseUrl);

  return {
    async resolveAccess(input: {
      authUserId: string;
      email: string;
    }): Promise<AccessContext | null> {
      const rows = (await sql`
        select wm.id::text as membership_id, wm.workspace_id::text as workspace_id, r.role_key
        from public.workspace_memberships wm
        join public.membership_role_assignments mra on mra.membership_id = wm.id
        join public.roles r on r.id = mra.role_id
        where wm.auth_user_id = ${input.authUserId}::uuid
          and wm.status = 'active' and wm.deleted_at is null
        order by wm.created_at asc, r.role_key asc
      `) as MembershipRow[];
      const first = rows[0];
      if (!first) return null;
      const roles = rows
        .filter((row) => row.workspace_id === first.workspace_id)
        .map((row) => row.role_key);
      return {
        authUserId: input.authUserId,
        email: input.email,
        workspaceId: first.workspace_id,
        membershipId: first.membership_id,
        roles,
        permissions: permissionsForRoles(roles),
      };
    },

    async activeMembershipCount(): Promise<number> {
      const rows =
        (await sql`select count(*)::int as count from public.workspace_memberships where deleted_at is null`) as {
          count: number;
        }[];
      return rows[0]?.count ?? 0;
    },

    async bootstrapOwner(input: {
      authUserId: string;
      email: string;
      displayName: string;
      requestId: string;
    }): Promise<string | null> {
      const rows = (await sql`
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
      `) as { membership_id: string }[];
      return rows[0]?.membership_id ?? null;
    },

    async createInvitation(input: {
      workspaceId: string;
      actorAuthUserId: string;
      email: string;
      role: Exclude<RoleKey, "OWNER">;
      requestId: string;
      employee?: {
        fullName: string;
        jobTitle: string;
        monthlyPayAmount: number;
        currency: string;
        employmentStartDate?: string | null;
      };
    }): Promise<{ invitationId: string; token: string; expiresAt: string } | null> {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      if (input.role === "EMPLOYEE" && input.employee) {
        const rows = (await sql`
          with employee as (
            insert into public.employees (
              workspace_id, email, full_name, job_title, monthly_pay_amount, currency,
              employment_start_date, status, created_by
            )
            values (
              ${input.workspaceId}::uuid,
              ${input.email},
              ${input.employee.fullName},
              ${input.employee.jobTitle},
              ${input.employee.monthlyPayAmount},
              ${input.employee.currency},
              ${input.employee.employmentStartDate ?? null}::date,
              'invited',
              ${input.actorAuthUserId}::uuid
            )
            returning id
          ), invitation as (
            insert into public.workspace_invitations (
              workspace_id, email, role_id, token_hash, invited_by, expires_at, employee_id
            )
            select
              ${input.workspaceId}::uuid,
              ${input.email},
              r.id,
              ${tokenHash},
              ${input.actorAuthUserId}::uuid,
              ${expiresAt}::timestamptz,
              e.id
            from public.roles r cross join employee e
            where r.role_key = ${input.role}
            returning id
          ), audit as (
            insert into public.audit_events (
              workspace_id, actor_auth_user_id, action, resource_type, resource_id,
              outcome, request_id, metadata
            )
            select
              ${input.workspaceId}::uuid,
              ${input.actorAuthUserId}::uuid,
              'workspace.invitation.created',
              'workspace_invitation',
              i.id,
              'success',
              ${input.requestId},
              jsonb_build_object('role', ${input.role}::text, 'employee', true)
            from invitation i
          )
          select id::text from invitation
        `) as { id: string }[];
        const id = rows[0]?.id;
        return id ? { invitationId: id, token, expiresAt } : null;
      }

      const rows = (await sql`
        with invitation as (
          insert into public.workspace_invitations (workspace_id, email, role_id, token_hash, invited_by, expires_at)
          select ${input.workspaceId}::uuid, ${input.email}, r.id, ${tokenHash}, ${input.actorAuthUserId}::uuid, ${expiresAt}::timestamptz
          from public.roles r where r.role_key = ${input.role}
          returning id
        ), audit as (
          insert into public.audit_events (workspace_id, actor_auth_user_id, action, resource_type, resource_id, outcome, request_id, metadata)
          select ${input.workspaceId}::uuid, ${input.actorAuthUserId}::uuid, 'workspace.invitation.created', 'workspace_invitation', i.id, 'success', ${input.requestId}, jsonb_build_object('role', ${input.role}::text)
          from invitation i
        )
        select id::text from invitation
      `) as { id: string }[];
      const id = rows[0]?.id;
      return id ? { invitationId: id, token, expiresAt } : null;
    },

    async acceptInvitation(input: {
      authUserId: string;
      email: string;
      displayName: string;
      token: string;
      requestId: string;
    }): Promise<{ workspaceId: string; membershipId: string } | null> {
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const invites = (await sql`
        select id::text, workspace_id::text, email, role_id::text, employee_id::text
        from public.workspace_invitations
        where token_hash = ${tokenHash} and status = 'pending' and deleted_at is null and expires_at > now()
        limit 1
      `) as InvitationRow[];
      const invite = invites[0];
      if (!invite || invite.email.toLowerCase() !== input.email.toLowerCase()) return null;

      const rows = (await sql`
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
        ), employee_update as (
          update public.employees
          set membership_id = m.id, status = 'active', updated_at = now()
          from membership m
          where id = ${invite.employee_id}::uuid
          returning public.employees.id
        ), invitation_update as (
          update public.workspace_invitations set status='accepted', accepted_at=now(), accepted_by=${input.authUserId}::uuid, updated_at=now()
          where id=${invite.id}::uuid
        ), audit as (
          insert into public.audit_events (workspace_id, actor_auth_user_id, action, resource_type, resource_id, outcome, request_id)
          select m.workspace_id, ${input.authUserId}::uuid, 'workspace.invitation.accepted', 'workspace_membership', m.id, 'success', ${input.requestId}
          from membership m
        )
        select workspace_id::text, id::text as membership_id from membership
      `) as { workspace_id: string; membership_id: string }[];
      const accepted = rows[0];
      return accepted
        ? { workspaceId: accepted.workspace_id, membershipId: accepted.membership_id }
        : null;
    },

    async listEmployees(workspaceId: string) {
      const rows = (await sql`
        select
          e.id::text,
          e.membership_id::text,
          e.email,
          e.full_name,
          e.job_title,
          e.monthly_pay_amount::text,
          e.currency,
          e.employment_start_date::text,
          e.status,
          b.bank_name,
          b.account_number_last4,
          b.account_name,
          coalesce(b.verification_status, 'action_required') as verification_status
        from public.employees e
        left join public.employee_bank_accounts b
          on b.employee_id = e.id and b.deleted_at is null
        where e.workspace_id = ${workspaceId}::uuid
          and e.deleted_at is null
        order by e.created_at desc
      `) as EmployeeRow[];
      return rows.map(mapEmployee);
    },

    async getEmployeeForMembership(input: { workspaceId: string; membershipId: string }) {
      const rows = (await sql`
        select
          e.id::text,
          e.membership_id::text,
          e.email,
          e.full_name,
          e.job_title,
          e.monthly_pay_amount::text,
          e.currency,
          e.employment_start_date::text,
          e.status,
          b.bank_name,
          b.account_number_last4,
          b.account_name,
          coalesce(b.verification_status, 'action_required') as verification_status
        from public.employees e
        left join public.employee_bank_accounts b
          on b.employee_id = e.id and b.deleted_at is null
        where e.workspace_id = ${input.workspaceId}::uuid
          and e.membership_id = ${input.membershipId}::uuid
          and e.deleted_at is null
        limit 1
      `) as EmployeeRow[];
      const row = rows[0];
      return row ? mapEmployee(row) : null;
    },

    async saveVerifiedBankAccount(input: {
      workspaceId: string;
      employeeId: string;
      bankCode: string;
      bankName: string;
      accountNumberLast4: string;
      accountName: string;
      provider: string;
      providerRecipientCode: string;
    }) {
      const rows = (await sql`
        insert into public.employee_bank_accounts (
          workspace_id,
          employee_id,
          bank_code,
          bank_name,
          account_number_last4,
          account_name,
          verification_status,
          verification_provider,
          provider_recipient_code,
          verified_at
        )
        values (
          ${input.workspaceId}::uuid,
          ${input.employeeId}::uuid,
          ${input.bankCode},
          ${input.bankName},
          ${input.accountNumberLast4},
          ${input.accountName},
          'verified',
          ${input.provider},
          ${input.providerRecipientCode},
          now()
        )
        on conflict (employee_id) where deleted_at is null
        do update set
          bank_code = excluded.bank_code,
          bank_name = excluded.bank_name,
          account_number_last4 = excluded.account_number_last4,
          account_name = excluded.account_name,
          verification_status = 'verified',
          verification_provider = excluded.verification_provider,
          provider_recipient_code = excluded.provider_recipient_code,
          verified_at = now(),
          updated_at = now()
        returning id::text
      `) as { id: string }[];
      return rows[0]?.id ?? null;
    },
  };
}
