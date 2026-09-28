import { neon } from "@neondatabase/serverless";

export type PayoutStatus = "queued" | "pending" | "success" | "failed" | "reversed";

interface PayoutRow {
  id: string;
  payroll_run_id: string;
  payroll_item_id: string;
  employee_id: string;
  employee_name: string;
  bank_account_id: string;
  provider: string;
  provider_recipient_code: string;
  provider_reference: string;
  provider_transfer_code: string | null;
  amount: string;
  currency: string;
  status: PayoutStatus;
  failure_reason: string | null;
  initiated_at: string | null;
  settled_at: string | null;
  failed_at: string | null;
  reversed_at: string | null;
}

function mapPayout(row: PayoutRow) {
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    payrollItemId: row.payroll_item_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    bankAccountId: row.bank_account_id,
    provider: row.provider,
    providerRecipientCode: row.provider_recipient_code,
    providerReference: row.provider_reference,
    providerTransferCode: row.provider_transfer_code,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    failureReason: row.failure_reason,
    initiatedAt: row.initiated_at,
    settledAt: row.settled_at,
    failedAt: row.failed_at,
    reversedAt: row.reversed_at,
  };
}

export function createNeonPayoutStore(databaseUrl: string) {
  const sql = neon(databaseUrl);

  const list = async (input: { workspaceId: string; payrollRunId: string }) => {
    const rows = (await sql`
      select
        pp.id::text,
        pp.payroll_run_id::text,
        pp.payroll_item_id::text,
        pp.employee_id::text,
        pi.employee_name,
        pp.bank_account_id::text,
        pp.provider,
        pp.provider_recipient_code,
        pp.provider_reference,
        pp.provider_transfer_code,
        pp.amount::text,
        pp.currency,
        pp.status,
        pp.failure_reason,
        pp.initiated_at::text,
        pp.settled_at::text,
        pp.failed_at::text,
        pp.reversed_at::text
      from public.payroll_payouts pp
      join public.payroll_items pi on pi.id = pp.payroll_item_id
      where pp.workspace_id = ${input.workspaceId}::uuid
        and pp.payroll_run_id = ${input.payrollRunId}::uuid
      order by pi.employee_name asc
    `) as PayoutRow[];

    return rows.map(mapPayout);
  };

  const recalculateRun = async (payrollRunId: string) => {
    await sql`
      with summary as (
        select
          count(*)::int as total_count,
          count(*) filter (where status = 'success')::int as success_count,
          count(*) filter (where status in ('queued','pending'))::int as open_count,
          count(*) filter (where status in ('failed','reversed'))::int as failed_count
        from public.payroll_payouts
        where payroll_run_id = ${payrollRunId}::uuid
      )
      update public.payroll_runs pr
      set
        status = case
          when s.total_count > 0 and s.success_count = s.total_count then 'SETTLED'
          when s.success_count > 0 and s.failed_count > 0 then 'PARTIALLY_PAID'
          when s.failed_count = s.total_count and s.total_count > 0 then 'FAILED'
          when s.open_count > 0 then 'PROCESSING'
          else pr.status
        end,
        updated_at = now()
      from summary s
      where pr.id = ${payrollRunId}::uuid
    `;
  };

  return {
    async approvePayroll(input: {
      workspaceId: string;
      payrollRunId: string;
      actorAuthUserId: string;
      requestId: string;
    }) {
      const resultRows = (await sql`
        with target as (
          select id, status, included_count
          from public.payroll_runs
          where id = ${input.payrollRunId}::uuid
            and workspace_id = ${input.workspaceId}::uuid
          for update
        ), blockers as (
          select count(*)::int as count
          from public.payroll_items pi
          left join public.employee_bank_accounts b on b.id = pi.bank_account_id
          where pi.payroll_run_id = ${input.payrollRunId}::uuid
            and pi.workspace_id = ${input.workspaceId}::uuid
            and pi.included
            and (
              pi.readiness_status <> 'ready'
              or b.id is null
              or b.verification_status <> 'verified'
              or b.provider_recipient_code is null
              or b.provider_recipient_code = ''
            )
        ), approved as (
          update public.payroll_runs pr
          set
            status = 'APPROVED',
            approved_at = now(),
            approved_by = ${input.actorAuthUserId}::uuid,
            locked_at = now(),
            updated_at = now()
          from target t, blockers b
          where pr.id = t.id
            and t.status = 'FUNDED'
            and t.included_count > 0
            and b.count = 0
          returning pr.id
        ), payouts as (
          insert into public.payroll_payouts (
            workspace_id,
            payroll_run_id,
            payroll_item_id,
            employee_id,
            bank_account_id,
            provider,
            provider_recipient_code,
            provider_reference,
            amount,
            currency,
            status
          )
          select
            pi.workspace_id,
            pi.payroll_run_id,
            pi.id,
            pi.employee_id,
            b.id,
            'paystack',
            b.provider_recipient_code,
            'IGHO-PAY-' || uuidv7()::text,
            pi.net_pay,
            pi.currency,
            'queued'
          from public.payroll_items pi
          join public.employee_bank_accounts b on b.id = pi.bank_account_id
          join approved a on a.id = pi.payroll_run_id
          where pi.included
          on conflict (payroll_item_id) do nothing
          returning id
        ), audit as (
          insert into public.audit_events (
            workspace_id,
            actor_auth_user_id,
            action,
            resource_type,
            resource_id,
            outcome,
            request_id,
            metadata
          )
          select
            ${input.workspaceId}::uuid,
            ${input.actorAuthUserId}::uuid,
            'payroll.approved',
            'payroll_run',
            a.id,
            'success',
            ${input.requestId},
            jsonb_build_object('payout_count', (select count(*) from payouts))
          from approved a
        )
        select
          exists(select 1 from target) as found,
          coalesce((select status from target limit 1), '') as previous_status,
          coalesce((select count from blockers limit 1), 0)::int as blocker_count,
          exists(select 1 from approved) as approved
      `) as {
        found: boolean;
        previous_status: string;
        blocker_count: number;
        approved: boolean;
      }[];

      const result = resultRows[0] ?? {
        found: false,
        previous_status: "",
        blocker_count: 0,
        approved: false,
      };
      return {
        found: result.found,
        previousStatus: result.previous_status,
        blockerCount: result.blocker_count,
        approved: result.approved,
        payouts: result.approved ? await list(input) : [],
      };
    },

    async beginProcessing(input: {
      workspaceId: string;
      payrollRunId: string;
      actorAuthUserId: string;
      requestId: string;
    }) {
      const rows = (await sql`
        with target as (
          select id, status
          from public.payroll_runs
          where id = ${input.payrollRunId}::uuid
            and workspace_id = ${input.workspaceId}::uuid
          for update
        ), processing as (
          update public.payroll_runs pr
          set status = 'PROCESSING', updated_at = now()
          from target t
          where pr.id = t.id
            and t.status in ('APPROVED','PROCESSING')
          returning pr.id
        ), audit as (
          insert into public.audit_events (
            workspace_id,
            actor_auth_user_id,
            action,
            resource_type,
            resource_id,
            outcome,
            request_id
          )
          select
            ${input.workspaceId}::uuid,
            ${input.actorAuthUserId}::uuid,
            'payroll.payment.started',
            'payroll_run',
            p.id,
            'success',
            ${input.requestId}
          from processing p
          where (select status from target limit 1) = 'APPROVED'
        )
        select
          exists(select 1 from target) as found,
          exists(select 1 from processing) as processable
      `) as { found: boolean; processable: boolean }[];

      const result = rows[0] ?? { found: false, processable: false };
      return {
        ...result,
        payouts: result.processable ? await list(input) : [],
      };
    },

    async markInitiated(input: {
      providerReference: string;
      transferCode?: string | null;
      providerStatus: string;
      providerPayload?: unknown;
      actorAuthUserId: string;
    }) {
      const payload = input.providerPayload == null ? null : JSON.stringify(input.providerPayload);
      const providerStatus = input.providerStatus.toLowerCase();
      const status: PayoutStatus =
        providerStatus === "success"
          ? "success"
          : providerStatus === "failed"
            ? "failed"
            : providerStatus === "reversed"
              ? "reversed"
              : "pending";

      const rows = (await sql`
        update public.payroll_payouts
        set
          status = ${status},
          provider_transfer_code = coalesce(${input.transferCode ?? null}::text, provider_transfer_code),
          initiated_by = coalesce(initiated_by, ${input.actorAuthUserId}::uuid),
          initiated_at = coalesce(initiated_at, now()),
          settled_at = case when ${status} = 'success' then coalesce(settled_at, now()) else settled_at end,
          failed_at = case when ${status} = 'failed' then coalesce(failed_at, now()) else failed_at end,
          reversed_at = case when ${status} = 'reversed' then coalesce(reversed_at, now()) else reversed_at end,
          provider_payload = coalesce(${payload}::jsonb, provider_payload),
          updated_at = now()
        where provider_reference = ${input.providerReference}
          and status in ('queued','pending')
        returning payroll_run_id::text
      `) as { payroll_run_id: string }[];

      const runId = rows[0]?.payroll_run_id;
      if (runId) await recalculateRun(runId);
      return Boolean(runId);
    },

    async applyProviderResult(input: {
      providerReference: string;
      status: PayoutStatus;
      amountMinor?: number | null;
      currency?: string | null;
      transferCode?: string | null;
      failureReason?: string | null;
      providerPayload?: unknown;
    }) {
      const targetRows = (await sql`
        select payroll_run_id::text, amount::text, currency, status
        from public.payroll_payouts
        where provider_reference = ${input.providerReference}
        limit 1
      `) as {
        payroll_run_id: string;
        amount: string;
        currency: string;
        status: PayoutStatus;
      }[];

      const target = targetRows[0];
      if (!target) return { found: false, valid: false };
      if (input.amountMinor != null && Number(target.amount) !== input.amountMinor / 100) {
        return { found: true, valid: false };
      }
      if (input.currency && target.currency !== input.currency) {
        return { found: true, valid: false };
      }

      const payload = input.providerPayload == null ? null : JSON.stringify(input.providerPayload);
      await sql`
        update public.payroll_payouts
        set
          status = ${input.status},
          provider_transfer_code = coalesce(${input.transferCode ?? null}::text, provider_transfer_code),
          failure_reason = ${input.failureReason ?? null}::text,
          settled_at = case when ${input.status} = 'success' then coalesce(settled_at, now()) else settled_at end,
          failed_at = case when ${input.status} = 'failed' then coalesce(failed_at, now()) else failed_at end,
          reversed_at = case when ${input.status} = 'reversed' then coalesce(reversed_at, now()) else reversed_at end,
          provider_payload = coalesce(${payload}::jsonb, provider_payload),
          updated_at = now()
        where provider_reference = ${input.providerReference}
      `;
      await recalculateRun(target.payroll_run_id);
      return { found: true, valid: true };
    },

    async listPayouts(input: { workspaceId: string; payrollRunId: string }) {
      return list(input);
    },
  };
}
