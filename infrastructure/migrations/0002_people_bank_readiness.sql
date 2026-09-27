-- Igho M2 — People & bank readiness
-- Forward migration: employee records and bank-readiness storage.
-- Safe additive change for Neon PostgreSQL 18.

create table public.employees (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  membership_id uuid references public.workspace_memberships(id) on delete set null,
  email text not null,
  full_name text not null,
  job_title text not null,
  monthly_pay_amount numeric(14,2) not null check (monthly_pay_amount >= 0),
  currency char(3) not null default 'NGN',
  employment_start_date date,
  status text not null default 'invited'
    check (status in ('invited', 'active', 'inactive')),
  created_by uuid references neon_auth."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references neon_auth."user"(id) on delete set null
);

create unique index uq_employees_workspace_email_active
  on public.employees (workspace_id, lower(email))
  where deleted_at is null;

create unique index uq_employees_membership_active
  on public.employees (membership_id)
  where membership_id is not null and deleted_at is null;

create index idx_employees_workspace_status
  on public.employees (workspace_id, status)
  where deleted_at is null;

create table public.employee_bank_accounts (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  bank_code text,
  bank_name text,
  account_number_last4 char(4),
  account_number_encrypted text,
  account_name text,
  verification_status text not null default 'action_required'
    check (verification_status in ('action_required', 'pending', 'verified', 'failed')),
  verification_provider text,
  provider_recipient_code text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index uq_employee_bank_accounts_employee_active
  on public.employee_bank_accounts (employee_id)
  where deleted_at is null;

create index idx_employee_bank_accounts_workspace_status
  on public.employee_bank_accounts (workspace_id, verification_status)
  where deleted_at is null;

alter table public.workspace_invitations
  add column employee_id uuid references public.employees(id) on delete set null;

create index idx_workspace_invitations_employee_id
  on public.workspace_invitations (employee_id)
  where employee_id is not null and deleted_at is null;
