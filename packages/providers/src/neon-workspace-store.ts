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

interface PayrollSettingsRow {
  pay_day: number;
  preparation_days: number;
  cutoff_days: number;
  currency: string;
}

interface PayrollRunRow {
  id: string;
  period_year: number;
  period_month: number;
  pay_date: string;
  preparation_date: string;
  cutoff_date: string;
  currency: string;
  status: string;
  employee_count: number;
  included_count: number;
  total_base_pay: string;
  total_adjustments: string;
  total_net_pay: string;
  prepared_at: string;
}

interface PayrollItemDetailRow {
  id: string;
  employee_id: string;
  employee_name: string;
  job_title: string;
  base_pay: string;
  adjustment_total: string;
  net_pay: string;
  currency: string;
  included: boolean;
  readiness_status: "ready" | "action_required" | "excluded";
  readiness_reason: string | null;
  bank_verification_status: "action_required" | "pending" | "verified" | "failed" | null;
  bank_name: string | null;
  account_number_last4: string | null;
}

interface PayrollAdjustmentRow {
  id: string;
  payroll_item_id: string;
  adjustment_type: string;
  amount: string;
  reason: string;
  reference: string | null;
  created_at: string;
}

interface EmployeePayRow {
  payroll_run_id: string;
  payroll_item_id: string;
  period_year: number;
  period_month: number;
  pay_date: string;
  cutoff_date: string;
  payroll_status: string;
  included: boolean;
  readiness_status: string;
  readiness_reason: string | null;
  base_pay: string;
  adjustment_total: string;
  net_pay: string;
  currency: string;
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function payrollDate(year: number, month: number, payDay: number): Date {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(payDay, lastDay)));
}

function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

function mapPayrollRun(row: PayrollRunRow) {
  return {
    id: row.id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    payDate: row.pay_date,
    preparationDate: row.preparation_date,
    cutoffDate: row.cutoff_date,
    currency: row.currency,
    status: row.status,
    employeeCount: row.employee_count,
    includedCount: row.included_count,
    totalBasePay: Number(row.total_base_pay),
    totalAdjustments: Number(row.total_adjustments),
    totalNetPay: Number(row.total_net_pay),
    preparedAt: row.prepared_at,
  };
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
        select wi.id::text, wi.workspace_id::text, wi.email, wi.role_id::text, wi.employee_id::text
        from public.workspace_invitations wi
        join neon_auth."user" u
          on u.id = ${input.authUserId}::uuid
         and lower(u.email) = lower(wi.email)
        where wi.token_hash = ${tokenHash}
          and wi.status = 'pending'
          and wi.deleted_at is null
          and wi.expires_at > now()
        limit 1
      `) as InvitationRow[];
      const invite = invites[0];
      if (!invite) return null;

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
          where public.employees.id = ${invite.employee_id}::uuid
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

    async getPayrollSettings(workspaceId: string) {
      const rows = (await sql`
        select pay_day, preparation_days, cutoff_days, currency
        from public.payroll_settings
        where workspace_id = ${workspaceId}::uuid
        limit 1
      `) as PayrollSettingsRow[];
      return rows[0] ?? null;
    },

    async getCurrentPayrollRun(workspaceId: string) {
      const rows = (await sql`
        select
          id::text,
          period_year,
          period_month,
          pay_date::text,
          preparation_date::text,
          cutoff_date::text,
          currency,
          status,
          employee_count,
          included_count,
          total_base_pay::text,
          total_adjustments::text,
          total_net_pay::text,
          prepared_at::text
        from public.payroll_runs
        where workspace_id = ${workspaceId}::uuid
          and status <> 'CANCELLED'
        order by
          case when pay_date >= current_date then 0 else 1 end,
          case when pay_date >= current_date then pay_date end asc,
          case when pay_date < current_date then pay_date end desc,
          created_at desc
        limit 1
      `) as PayrollRunRow[];
      const row = rows[0];
      return row ? mapPayrollRun(row) : null;
    },

    async preparePayrollRun(input: {
      workspaceId: string;
      actorAuthUserId: string;
      requestId: string;
      period?: string;
    }) {
      const settingsRows = (await sql`
        select pay_day, preparation_days, cutoff_days, currency
        from public.payroll_settings
        where workspace_id = ${input.workspaceId}::uuid
        limit 1
      `) as PayrollSettingsRow[];
      const settings = settingsRows[0];
      if (!settings) return null;

      let year: number;
      let month: number;
      if (input.period) {
        const match = /^(\d{4})-(\d{2})$/.exec(input.period);
        if (!match) throw new Error("INVALID_PAYROLL_PERIOD");
        year = Number(match[1]);
        month = Number(match[2]);
        if (month < 1 || month > 12) throw new Error("INVALID_PAYROLL_PERIOD");
      } else {
        const now = new Date();
        year = now.getUTCFullYear();
        month = now.getUTCMonth() + 1;
        const thisPayDate = payrollDate(year, month, settings.pay_day);
        const today = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate()));
        if (today.getTime() > thisPayDate.getTime()) {
          month += 1;
          if (month === 13) {
            month = 1;
            year += 1;
          }
        }
      }

      const payDate = payrollDate(year, month, settings.pay_day);
      const preparationDate = subtractDays(payDate, settings.preparation_days);
      const cutoffDate = subtractDays(payDate, settings.cutoff_days);
      const periodKey = `${String(year)}-${String(month).padStart(2, "0")}`;

      const existingRows = (await sql`
        select
          id::text,
          period_year,
          period_month,
          pay_date::text,
          preparation_date::text,
          cutoff_date::text,
          currency,
          status,
          employee_count,
          included_count,
          total_base_pay::text,
          total_adjustments::text,
          total_net_pay::text,
          prepared_at::text
        from public.payroll_runs
        where workspace_id = ${input.workspaceId}::uuid
          and period_year = ${year}
          and period_month = ${month}
        limit 1
      `) as PayrollRunRow[];
      if (existingRows[0]) return mapPayrollRun(existingRows[0]);

      const rows = (await sql`
        with run as (
          insert into public.payroll_runs (
            workspace_id, period_year, period_month, pay_date, preparation_date,
            cutoff_date, currency, prepared_by
          )
          values (
            ${input.workspaceId}::uuid,
            ${year},
            ${month},
            ${dateString(payDate)}::date,
            ${dateString(preparationDate)}::date,
            ${dateString(cutoffDate)}::date,
            ${settings.currency},
            ${input.actorAuthUserId}::uuid
          )
          returning *
        ), items as (
          insert into public.payroll_items (
            payroll_run_id, workspace_id, employee_id, bank_account_id,
            employee_name, job_title, employment_start_date, base_pay,
            adjustment_total, net_pay, currency, included, readiness_status,
            readiness_reason, bank_verification_status
          )
          select
            r.id,
            e.workspace_id,
            e.id,
            b.id,
            e.full_name,
            e.job_title,
            e.employment_start_date,
            e.monthly_pay_amount,
            0,
            e.monthly_pay_amount,
            e.currency,
            true,
            case when b.verification_status = 'verified' then 'ready' else 'action_required' end,
            case
              when b.id is null then 'Bank account required'
              when b.verification_status <> 'verified' then 'Bank account must be verified'
              else null
            end,
            coalesce(b.verification_status, 'action_required')
          from run r
          join public.employees e
            on e.workspace_id = r.workspace_id
           and e.status = 'active'
           and e.deleted_at is null
          left join public.employee_bank_accounts b
            on b.employee_id = e.id
           and b.deleted_at is null
          returning *
        ), summary as (
          update public.payroll_runs pr
          set
            employee_count = coalesce(s.employee_count, 0),
            included_count = coalesce(s.included_count, 0),
            total_base_pay = coalesce(s.total_base_pay, 0),
            total_adjustments = coalesce(s.total_adjustments, 0),
            total_net_pay = coalesce(s.total_net_pay, 0),
            status = case
              when coalesce(s.included_count, 0) > 0 and coalesce(s.not_ready_count, 0) = 0 then 'READY'
              else 'DRAFT'
            end,
            updated_at = now()
          from (
            select
              payroll_run_id,
              count(*)::int as employee_count,
              count(*) filter (where included)::int as included_count,
              count(*) filter (where included and readiness_status <> 'ready')::int as not_ready_count,
              sum(base_pay) filter (where included) as total_base_pay,
              sum(adjustment_total) filter (where included) as total_adjustments,
              sum(net_pay) filter (where included) as total_net_pay
            from items
            group by payroll_run_id
          ) s
          where pr.id = s.payroll_run_id
          returning pr.*
        ), audit as (
          insert into public.audit_events (
            workspace_id, actor_auth_user_id, action, resource_type,
            resource_id, outcome, request_id, metadata
          )
          select
            r.workspace_id,
            ${input.actorAuthUserId}::uuid,
            'payroll.prepared',
            'payroll_run',
            r.id,
            'success',
            ${input.requestId},
            jsonb_build_object('period', ${periodKey}::text)
          from run r
        )
        select
          id::text,
          period_year,
          period_month,
          pay_date::text,
          preparation_date::text,
          cutoff_date::text,
          currency,
          status,
          employee_count,
          included_count,
          total_base_pay::text,
          total_adjustments::text,
          total_net_pay::text,
          prepared_at::text
        from summary
      `) as PayrollRunRow[];

      const row = rows[0];
      if (row) return mapPayrollRun(row);

      const emptyRows = (await sql`
        select
          id::text,
          period_year,
          period_month,
          pay_date::text,
          preparation_date::text,
          cutoff_date::text,
          currency,
          status,
          employee_count,
          included_count,
          total_base_pay::text,
          total_adjustments::text,
          total_net_pay::text,
          prepared_at::text
        from public.payroll_runs
        where workspace_id = ${input.workspaceId}::uuid
          and period_year = ${year}
          and period_month = ${month}
        limit 1
      `) as PayrollRunRow[];
      return emptyRows[0] ? mapPayrollRun(emptyRows[0]) : null;
    },

    async listPayrollRuns(workspaceId: string) {
      const rows = (await sql`
        select
          id::text,
          period_year,
          period_month,
          pay_date::text,
          preparation_date::text,
          cutoff_date::text,
          currency,
          status,
          employee_count,
          included_count,
          total_base_pay::text,
          total_adjustments::text,
          total_net_pay::text,
          prepared_at::text
        from public.payroll_runs
        where workspace_id = ${workspaceId}::uuid
        order by pay_date desc, created_at desc
      `) as PayrollRunRow[];
      return rows.map(mapPayrollRun);
    },

    async getPayrollRunDetail(input: { workspaceId: string; payrollRunId: string }) {
      const runRows = (await sql`
        select
          id::text,
          period_year,
          period_month,
          pay_date::text,
          preparation_date::text,
          cutoff_date::text,
          currency,
          status,
          employee_count,
          included_count,
          total_base_pay::text,
          total_adjustments::text,
          total_net_pay::text,
          prepared_at::text
        from public.payroll_runs
        where id = ${input.payrollRunId}::uuid
          and workspace_id = ${input.workspaceId}::uuid
        limit 1
      `) as PayrollRunRow[];
      const run = runRows[0];
      if (!run) return null;

      const itemRows = (await sql`
        select
          pi.id::text,
          pi.employee_id::text,
          pi.employee_name,
          pi.job_title,
          pi.base_pay::text,
          pi.adjustment_total::text,
          pi.net_pay::text,
          pi.currency,
          pi.included,
          pi.readiness_status,
          pi.readiness_reason,
          pi.bank_verification_status,
          b.bank_name,
          b.account_number_last4
        from public.payroll_items pi
        left join public.employee_bank_accounts b on b.id = pi.bank_account_id
        where pi.payroll_run_id = ${input.payrollRunId}::uuid
          and pi.workspace_id = ${input.workspaceId}::uuid
        order by pi.employee_name asc
      `) as PayrollItemDetailRow[];

      const adjustmentRows = (await sql`
        select
          pa.id::text,
          pa.payroll_item_id::text,
          pa.adjustment_type,
          pa.amount::text,
          pa.reason,
          pa.reference,
          pa.created_at::text
        from public.payroll_adjustments pa
        where pa.payroll_run_id = ${input.payrollRunId}::uuid
          and pa.workspace_id = ${input.workspaceId}::uuid
        order by pa.created_at asc
      `) as PayrollAdjustmentRow[];

      const adjustmentsByItem = new Map<string, PayrollAdjustmentRow[]>();
      for (const row of adjustmentRows) {
        const existing = adjustmentsByItem.get(row.payroll_item_id) ?? [];
        existing.push(row);
        adjustmentsByItem.set(row.payroll_item_id, existing);
      }

      return {
        ...mapPayrollRun(run),
        items: itemRows.map((row) => ({
          id: row.id,
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          jobTitle: row.job_title,
          basePay: Number(row.base_pay),
          adjustmentTotal: Number(row.adjustment_total),
          netPay: Number(row.net_pay),
          currency: row.currency,
          included: row.included,
          readinessStatus: row.readiness_status,
          readinessReason: row.readiness_reason,
          bankVerificationStatus: row.bank_verification_status,
          bankName: row.bank_name,
          accountNumberLast4: row.account_number_last4,
          adjustments: (adjustmentsByItem.get(row.id) ?? []).map((adjustment) => ({
            id: adjustment.id,
            type: adjustment.adjustment_type,
            amount: Number(adjustment.amount),
            reason: adjustment.reason,
            reference: adjustment.reference,
            createdAt: adjustment.created_at,
          })),
        })),
      };
    },

    async setPayrollItemIncluded(input: {
      workspaceId: string;
      payrollRunId: string;
      payrollItemId: string;
      included: boolean;
      actorAuthUserId: string;
      requestId: string;
    }) {
      const rows = (await sql`
        with target as (
          select pi.id, pi.readiness_status, pr.status, pr.cutoff_date
          from public.payroll_items pi
          join public.payroll_runs pr on pr.id = pi.payroll_run_id
          where pi.id = ${input.payrollItemId}::uuid
            and pi.payroll_run_id = ${input.payrollRunId}::uuid
            and pi.workspace_id = ${input.workspaceId}::uuid
            and pr.workspace_id = ${input.workspaceId}::uuid
          for update
        ), allowed as (
          select *
          from target
          where status in ('DRAFT','READY')
            and current_date <= cutoff_date
        ), item_update as (
          update public.payroll_items pi
          set
            included = ${input.included},
            readiness_status = case
              when not ${input.included} then 'excluded'
              when pi.bank_verification_status = 'verified' then 'ready'
              else 'action_required'
            end,
            readiness_reason = case
              when not ${input.included} then 'Excluded from this payroll run'
              when pi.bank_verification_status = 'verified' then null
              else 'Bank account must be verified'
            end,
            updated_at = now()
          from allowed a
          where pi.id = a.id
          returning pi.id
        ), summary as (
          select
            count(*)::int as employee_count,
            count(*) filter (where included)::int as included_count,
            count(*) filter (where included and readiness_status <> 'ready')::int as not_ready_count,
            coalesce(sum(base_pay) filter (where included),0) as total_base_pay,
            coalesce(sum(adjustment_total) filter (where included),0) as total_adjustments,
            coalesce(sum(net_pay) filter (where included),0) as total_net_pay
          from public.payroll_items
          where payroll_run_id = ${input.payrollRunId}::uuid
            and workspace_id = ${input.workspaceId}::uuid
          having exists (select 1 from item_update)
        ), run_update as (
          update public.payroll_runs pr
          set
            employee_count = s.employee_count,
            included_count = s.included_count,
            total_base_pay = s.total_base_pay,
            total_adjustments = s.total_adjustments,
            total_net_pay = s.total_net_pay,
            status = case when s.included_count > 0 and s.not_ready_count = 0 then 'READY' else 'DRAFT' end,
            updated_at = now()
          from summary s
          where pr.id = ${input.payrollRunId}::uuid
            and pr.workspace_id = ${input.workspaceId}::uuid
          returning pr.id
        ), audit as (
          insert into public.audit_events (
            workspace_id, actor_auth_user_id, action, resource_type,
            resource_id, outcome, request_id, metadata
          )
          select
            ${input.workspaceId}::uuid,
            ${input.actorAuthUserId}::uuid,
            case when ${input.included} then 'payroll.item.included' else 'payroll.item.excluded' end,
            'payroll_item',
            iu.id,
            'success',
            ${input.requestId},
            jsonb_build_object('payroll_run_id', ${input.payrollRunId}::text)
          from item_update iu
        )
        select
          exists(select 1 from target) as found,
          exists(select 1 from allowed) as editable,
          exists(select 1 from item_update) as updated
      `) as { found: boolean; editable: boolean; updated: boolean }[];
      return rows[0] ?? { found: false, editable: false, updated: false };
    },

    async addPayrollAdjustment(input: {
      workspaceId: string;
      payrollRunId: string;
      payrollItemId: string;
      type: string;
      amount: number;
      reason: string;
      reference?: string;
      actorAuthUserId: string;
      requestId: string;
    }) {
      const rows = (await sql`
        with target as (
          select pi.id, pi.net_pay, pr.status, pr.cutoff_date
          from public.payroll_items pi
          join public.payroll_runs pr on pr.id = pi.payroll_run_id
          where pi.id = ${input.payrollItemId}::uuid
            and pi.payroll_run_id = ${input.payrollRunId}::uuid
            and pi.workspace_id = ${input.workspaceId}::uuid
            and pr.workspace_id = ${input.workspaceId}::uuid
          for update
        ), allowed as (
          select *
          from target
          where status in ('DRAFT','READY')
            and current_date <= cutoff_date
            and net_pay + ${input.amount} >= 0
        ), adjustment as (
          insert into public.payroll_adjustments (
            workspace_id, payroll_run_id, payroll_item_id, adjustment_type,
            amount, reason, reference, created_by
          )
          select
            ${input.workspaceId}::uuid,
            ${input.payrollRunId}::uuid,
            a.id,
            ${input.type},
            ${input.amount},
            ${input.reason},
            ${input.reference ?? null},
            ${input.actorAuthUserId}::uuid
          from allowed a
          returning id, payroll_item_id
        ), item_update as (
          update public.payroll_items pi
          set
            adjustment_total = pi.adjustment_total + ${input.amount},
            net_pay = pi.net_pay + ${input.amount},
            updated_at = now()
          from adjustment a
          where pi.id = a.payroll_item_id
          returning pi.id
        ), summary as (
          select
            count(*)::int as employee_count,
            count(*) filter (where included)::int as included_count,
            count(*) filter (where included and readiness_status <> 'ready')::int as not_ready_count,
            coalesce(sum(base_pay) filter (where included),0) as total_base_pay,
            coalesce(sum(adjustment_total) filter (where included),0) as total_adjustments,
            coalesce(sum(net_pay) filter (where included),0) as total_net_pay
          from public.payroll_items
          where payroll_run_id = ${input.payrollRunId}::uuid
            and workspace_id = ${input.workspaceId}::uuid
          having exists (select 1 from item_update)
        ), run_update as (
          update public.payroll_runs pr
          set
            employee_count = s.employee_count,
            included_count = s.included_count,
            total_base_pay = s.total_base_pay,
            total_adjustments = s.total_adjustments,
            total_net_pay = s.total_net_pay,
            status = case when s.included_count > 0 and s.not_ready_count = 0 then 'READY' else 'DRAFT' end,
            updated_at = now()
          from summary s
          where pr.id = ${input.payrollRunId}::uuid
            and pr.workspace_id = ${input.workspaceId}::uuid
          returning pr.id
        ), audit as (
          insert into public.audit_events (
            workspace_id, actor_auth_user_id, action, resource_type,
            resource_id, outcome, request_id, metadata
          )
          select
            ${input.workspaceId}::uuid,
            ${input.actorAuthUserId}::uuid,
            'payroll.adjustment.added',
            'payroll_item',
            a.payroll_item_id,
            'success',
            ${input.requestId},
            jsonb_build_object(
              'payroll_run_id', ${input.payrollRunId}::text,
              'adjustment_id', a.id::text,
              'type', ${input.type},
              'amount', ${input.amount}
            )
          from adjustment a
        )
        select
          exists(select 1 from target) as found,
          exists(select 1 from allowed) as editable,
          exists(select 1 from adjustment) as created
      `) as { found: boolean; editable: boolean; created: boolean }[];
      return rows[0] ?? { found: false, editable: false, created: false };
    },

    async getEmployeeUpcomingPay(input: { workspaceId: string; membershipId: string }) {
      const rows = (await sql`
        select
          pr.id::text as payroll_run_id,
          pi.id::text as payroll_item_id,
          pr.period_year,
          pr.period_month,
          pr.pay_date::text,
          pr.cutoff_date::text,
          pr.status as payroll_status,
          pi.included,
          pi.readiness_status,
          pi.readiness_reason,
          pi.base_pay::text,
          pi.adjustment_total::text,
          pi.net_pay::text,
          pi.currency
        from public.employees e
        join public.payroll_items pi on pi.employee_id = e.id
        join public.payroll_runs pr on pr.id = pi.payroll_run_id
        where e.workspace_id = ${input.workspaceId}::uuid
          and e.membership_id = ${input.membershipId}::uuid
          and e.deleted_at is null
          and pr.status <> 'CANCELLED'
          and pr.pay_date >= current_date
        order by pr.pay_date asc
        limit 1
      `) as EmployeePayRow[];
      const row = rows[0];
      if (!row) return null;
      return {
        payrollRunId: row.payroll_run_id,
        payrollItemId: row.payroll_item_id,
        periodYear: row.period_year,
        periodMonth: row.period_month,
        payDate: row.pay_date,
        cutoffDate: row.cutoff_date,
        payrollStatus: row.payroll_status,
        included: row.included,
        readinessStatus: row.readiness_status,
        readinessReason: row.readiness_reason,
        basePay: Number(row.base_pay),
        adjustmentTotal: Number(row.adjustment_total),
        netPay: Number(row.net_pay),
        currency: row.currency,
      };
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
