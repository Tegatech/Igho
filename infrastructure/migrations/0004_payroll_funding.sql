-- Igho M4 — Payroll funding
-- Additive funding-attempt ledger for provider-backed payroll funding.

create table public.payroll_funding_attempts (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete restrict,
  provider text not null default 'paystack',
  provider_reference text not null unique,
  funding_method text not null check (funding_method in ('card','bank_transfer')),
  amount numeric(16,2) not null check (amount > 0),
  currency char(3) not null default 'NGN',
  status text not null default 'initialized'
    check (status in ('initialized','pending','settled','failed','cancelled')),
  authorization_url text,
  access_code text,
  provider_channel text,
  provider_transaction_id text,
  initiated_by uuid references neon_auth."user"(id) on delete set null,
  initiated_at timestamptz not null default now(),
  settled_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payroll_funding_attempts_run
  on public.payroll_funding_attempts (payroll_run_id, created_at desc);

create index idx_payroll_funding_attempts_workspace_status
  on public.payroll_funding_attempts (workspace_id, status, created_at desc);
