-- Igho M5 — Payroll approval and payouts
-- Additive payout ledger for approved payroll transfers.

create table public.payroll_payouts (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete restrict,
  payroll_item_id uuid not null references public.payroll_items(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  bank_account_id uuid not null references public.employee_bank_accounts(id) on delete restrict,
  provider text not null default 'paystack',
  provider_recipient_code text not null,
  provider_reference text not null unique,
  provider_transfer_code text,
  amount numeric(16,2) not null check (amount > 0),
  currency char(3) not null default 'NGN',
  status text not null default 'queued'
    check (status in ('queued','pending','success','failed','reversed')),
  failure_reason text,
  initiated_by uuid references neon_auth."user"(id) on delete set null,
  initiated_at timestamptz,
  settled_at timestamptz,
  failed_at timestamptz,
  reversed_at timestamptz,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payroll_payouts_item unique (payroll_item_id)
);

create index idx_payroll_payouts_run
  on public.payroll_payouts (payroll_run_id, created_at asc);

create index idx_payroll_payouts_workspace_status
  on public.payroll_payouts (workspace_id, status, created_at desc);
