-- Igho M3 — Payroll engine foundation
-- Forward migration: payroll settings, runs, employee snapshots and adjustments.
-- Safe additive change for Neon PostgreSQL 18.

create table public.payroll_settings (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null unique references public.workspaces(id) on delete restrict,
  pay_day smallint not null default 1 check (pay_day between 1 and 31),
  preparation_days smallint not null default 7 check (preparation_days between 0 and 31),
  cutoff_days smallint not null default 7 check (cutoff_days between 0 and 31),
  currency char(3) not null default 'NGN',
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references neon_auth."user"(id) on delete set null
);

insert into public.payroll_settings (workspace_id)
select id from public.workspaces
on conflict (workspace_id) do nothing;

create table public.payroll_runs (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  period_year integer not null check (period_year between 2000 and 2200),
  period_month smallint not null check (period_month between 1 and 12),
  pay_date date not null,
  preparation_date date not null,
  cutoff_date date not null,
  currency char(3) not null default 'NGN',
  status text not null default 'DRAFT'
    check (status in (
      'DRAFT','READY','AWAITING_FUNDING','FUNDING_PENDING','FUNDED',
      'AWAITING_APPROVAL','APPROVED','PROCESSING','PARTIALLY_PAID',
      'SETTLED','FAILED','CANCELLED'
    )),
  employee_count integer not null default 0 check (employee_count >= 0),
  included_count integer not null default 0 check (included_count >= 0),
  total_base_pay numeric(16,2) not null default 0 check (total_base_pay >= 0),
  total_adjustments numeric(16,2) not null default 0,
  total_net_pay numeric(16,2) not null default 0 check (total_net_pay >= 0),
  prepared_at timestamptz not null default now(),
  prepared_by uuid references neon_auth."user"(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references neon_auth."user"(id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payroll_runs_workspace_period unique (workspace_id, period_year, period_month)
);

create index idx_payroll_runs_workspace_pay_date
  on public.payroll_runs (workspace_id, pay_date desc);

create index idx_payroll_runs_workspace_status
  on public.payroll_runs (workspace_id, status, pay_date desc);

create table public.payroll_items (
  id uuid primary key default uuidv7(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  bank_account_id uuid references public.employee_bank_accounts(id) on delete set null,
  employee_name text not null,
  job_title text not null,
  employment_start_date date,
  base_pay numeric(14,2) not null check (base_pay >= 0),
  adjustment_total numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null check (net_pay >= 0),
  currency char(3) not null default 'NGN',
  included boolean not null default true,
  readiness_status text not null
    check (readiness_status in ('ready','action_required','excluded')),
  readiness_reason text,
  bank_verification_status text
    check (bank_verification_status is null or bank_verification_status in ('action_required','pending','verified','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payroll_items_run_employee unique (payroll_run_id, employee_id)
);

create index idx_payroll_items_run_readiness
  on public.payroll_items (payroll_run_id, readiness_status);

create index idx_payroll_items_employee
  on public.payroll_items (employee_id, created_at desc);

create table public.payroll_adjustments (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete restrict,
  payroll_item_id uuid not null references public.payroll_items(id) on delete restrict,
  adjustment_type text not null
    check (adjustment_type in ('bonus','reimbursement','allowance','deduction','salary_correction','other')),
  amount numeric(14,2) not null check (amount <> 0),
  reason text not null,
  reference text,
  created_by uuid references neon_auth."user"(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_payroll_adjustments_item
  on public.payroll_adjustments (payroll_item_id, created_at);
