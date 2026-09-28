import { neon } from "@neondatabase/serverless";

interface PayrollFundingAttemptRow {
  id: string;
  workspace_id: string;
  payroll_run_id: string;
  provider: string;
  provider_reference: string;
  funding_method: "card" | "bank_transfer";
  amount: string;
  currency: string;
  status: "initialized" | "pending" | "settled" | "failed" | "cancelled";
  authorization_url: string | null;
  access_code: string | null;
  provider_channel: string | null;
  provider_transaction_id: string | null;
  initiated_by: string | null;
  initiated_at: string;
  settled_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

function mapFundingAttempt(row: PayrollFundingAttemptRow) {
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    provider: row.provider,
    providerReference: row.provider_reference,
    method: row.funding_method,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    authorizationUrl: row.authorization_url,
    accessCode: row.access_code,
    providerChannel: row.provider_channel,
    providerTransactionId: row.provider_transaction_id,
    initiatedAt: row.initiated_at,
    settledAt: row.settled_at,
    failedAt: row.failed_at,
    failureReason: row.failure_reason,
  };
}

export function createNeonFundingStore(databaseUrl: string) {
  const sql = neon(databaseUrl);

  return {
    async createFundingIntent(input: {
      workspaceId: string;
      payrollRunId: string;
      providerReference: string;
      method: "card" | "bank_transfer";
      actorAuthUserId: string;
      requestId: string;
    }) {
      const rows = (await sql`
        with target as (
          select id, total_net_pay, currency, status
          from public.payroll_runs
          where id = ${input.payrollRunId}::uuid
            and workspace_id = ${input.workspaceId}::uuid
          for update
        ), allowed as (
          select *
          from target
          where status = 'READY' and total_net_pay > 0
        ), attempt as (
          insert into public.payroll_funding_attempts (
            workspace_id, payroll_run_id, provider, provider_reference,
            funding_method, amount, currency, status, initiated_by
          )
          select
            ${input.workspaceId}::uuid,
            a.id,
            'paystack',
            ${input.providerReference}::text,
            ${input.method}::text,
            a.total_net_pay,
            a.currency,
            'initialized',
            ${input.actorAuthUserId}::uuid
          from allowed a
          returning *
        ), run_update as (
          update public.payroll_runs pr
          set status = 'AWAITING_FUNDING', updated_at = now()
          from attempt a
          where pr.id = a.payroll_run_id
          returning pr.id
        ), audit as (
          insert into public.audit_events (
            workspace_id, actor_auth_user_id, action, resource_type,
            resource_id, outcome, request_id, metadata
          )
          select
            ${input.workspaceId}::uuid,
            ${input.actorAuthUserId}::uuid,
            'payroll.funding.started',
            'payroll_run',
            a.payroll_run_id,
            'success',
            ${input.requestId},
            jsonb_build_object(
              'funding_attempt_id', a.id::text,
              'provider', a.provider,
              'method', a.funding_method,
              'amount', a.amount,
              'currency', a.currency
            )
          from attempt a
        )
        select
          id::text,
          workspace_id::text,
          payroll_run_id::text,
          provider,
          provider_reference,
          funding_method,
          amount::text,
          currency,
          status,
          authorization_url,
          access_code,
          provider_channel,
          provider_transaction_id,
          initiated_by::text,
          initiated_at::text,
          settled_at::text,
          failed_at::text,
          failure_reason
        from attempt
      `) as PayrollFundingAttemptRow[];

      return rows[0] ? mapFundingAttempt(rows[0]) : null;
    },

    async markPending(input: {
      workspaceId: string;
      providerReference: string;
      authorizationUrl: string;
      accessCode: string;
    }) {
      const rows = (await sql`
        with attempt as (
          update public.payroll_funding_attempts
          set
            status = 'pending',
            authorization_url = ${input.authorizationUrl},
            access_code = ${input.accessCode},
            updated_at = now()
          where workspace_id = ${input.workspaceId}::uuid
            and provider_reference = ${input.providerReference}
            and status = 'initialized'
          returning *
        ), run_update as (
          update public.payroll_runs pr
          set status = 'FUNDING_PENDING', updated_at = now()
          from attempt a
          where pr.id = a.payroll_run_id
            and pr.status = 'AWAITING_FUNDING'
          returning pr.id
        )
        select
          id::text,
          workspace_id::text,
          payroll_run_id::text,
          provider,
          provider_reference,
          funding_method,
          amount::text,
          currency,
          status,
          authorization_url,
          access_code,
          provider_channel,
          provider_transaction_id,
          initiated_by::text,
          initiated_at::text,
          settled_at::text,
          failed_at::text,
          failure_reason
        from attempt
      `) as PayrollFundingAttemptRow[];

      return rows[0] ? mapFundingAttempt(rows[0]) : null;
    },

    async markFailed(input: {
      providerReference: string;
      reason: string;
      providerPayload?: unknown;
    }) {
      const payload = input.providerPayload == null ? null : JSON.stringify(input.providerPayload);
      const rows = (await sql`
        with attempt as (
          update public.payroll_funding_attempts
          set
            status = 'failed',
            failed_at = now(),
            failure_reason = ${input.reason}::text,
            provider_payload = coalesce(${payload}::jsonb, provider_payload),
            updated_at = now()
          where provider_reference = ${input.providerReference}
            and status in ('initialized', 'pending')
          returning *
        ), run_update as (
          update public.payroll_runs pr
          set status = 'READY', updated_at = now()
          from attempt a
          where pr.id = a.payroll_run_id
            and pr.status in ('AWAITING_FUNDING', 'FUNDING_PENDING')
          returning pr.id
        )
        select
          id::text,
          workspace_id::text,
          payroll_run_id::text,
          provider,
          provider_reference,
          funding_method,
          amount::text,
          currency,
          status,
          authorization_url,
          access_code,
          provider_channel,
          provider_transaction_id,
          initiated_by::text,
          initiated_at::text,
          settled_at::text,
          failed_at::text,
          failure_reason
        from attempt
      `) as PayrollFundingAttemptRow[];

      return rows[0] ? mapFundingAttempt(rows[0]) : null;
    },

    async settle(input: {
      providerReference: string;
      amountMinor: number;
      currency: string;
      channel?: string | null;
      transactionId?: string | null;
      paidAt?: string | null;
      providerPayload?: unknown;
      requestId: string;
    }) {
      const expectedAmount = input.amountMinor / 100;
      const payload = input.providerPayload == null ? null : JSON.stringify(input.providerPayload);

      const targetRows = (await sql`
        select
          id::text,
          workspace_id::text,
          payroll_run_id::text,
          provider,
          provider_reference,
          funding_method,
          amount::text,
          currency,
          status,
          authorization_url,
          access_code,
          provider_channel,
          provider_transaction_id,
          initiated_by::text,
          initiated_at::text,
          settled_at::text,
          failed_at::text,
          failure_reason
        from public.payroll_funding_attempts
        where provider_reference = ${input.providerReference}
        limit 1
      `) as PayrollFundingAttemptRow[];

      const target = targetRows[0];
      if (!target) {
        return { found: false, valid: false, funding: null };
      }
      if (target.status === "settled") {
        return { found: true, valid: true, funding: mapFundingAttempt(target) };
      }
      if (Number(target.amount) !== expectedAmount || target.currency !== input.currency) {
        return {
          found: true,
          valid: false,
          funding: mapFundingAttempt(target),
        };
      }

      const rows = (await sql`
        with attempt as (
          update public.payroll_funding_attempts
          set
            status = 'settled',
            provider_channel = ${input.channel ?? null}::text,
            provider_transaction_id = ${input.transactionId ?? null}::text,
            settled_at = coalesce(${input.paidAt ?? null}::timestamptz, now()),
            provider_payload = coalesce(${payload}::jsonb, provider_payload),
            updated_at = now()
          where provider_reference = ${input.providerReference}
            and status in ('initialized', 'pending')
          returning *
        ), run_update as (
          update public.payroll_runs pr
          set status = 'FUNDED', updated_at = now()
          from attempt a
          where pr.id = a.payroll_run_id
            and pr.status in ('AWAITING_FUNDING', 'FUNDING_PENDING', 'READY')
          returning pr.id
        ), audit as (
          insert into public.audit_events (
            workspace_id, actor_auth_user_id, action, resource_type,
            resource_id, outcome, request_id, metadata
          )
          select
            a.workspace_id,
            a.initiated_by,
            'payroll.funding.settled',
            'payroll_run',
            a.payroll_run_id,
            'success',
            ${input.requestId},
            jsonb_build_object(
              'funding_attempt_id', a.id::text,
              'provider_reference', a.provider_reference,
              'amount', a.amount,
              'currency', a.currency
            )
          from attempt a
        )
        select
          id::text,
          workspace_id::text,
          payroll_run_id::text,
          provider,
          provider_reference,
          funding_method,
          amount::text,
          currency,
          status,
          authorization_url,
          access_code,
          provider_channel,
          provider_transaction_id,
          initiated_by::text,
          initiated_at::text,
          settled_at::text,
          failed_at::text,
          failure_reason
        from attempt
      `) as PayrollFundingAttemptRow[];

      const row = rows[0];
      return {
        found: true,
        valid: true,
        funding: row ? mapFundingAttempt(row) : mapFundingAttempt(target),
      };
    },

    async getLatest(input: { workspaceId: string; payrollRunId: string }) {
      const rows = (await sql`
        select
          id::text,
          workspace_id::text,
          payroll_run_id::text,
          provider,
          provider_reference,
          funding_method,
          amount::text,
          currency,
          status,
          authorization_url,
          access_code,
          provider_channel,
          provider_transaction_id,
          initiated_by::text,
          initiated_at::text,
          settled_at::text,
          failed_at::text,
          failure_reason
        from public.payroll_funding_attempts
        where workspace_id = ${input.workspaceId}::uuid
          and payroll_run_id = ${input.payrollRunId}::uuid
        order by created_at desc
        limit 1
      `) as PayrollFundingAttemptRow[];

      return rows[0] ? mapFundingAttempt(rows[0]) : null;
    },
  };
}
