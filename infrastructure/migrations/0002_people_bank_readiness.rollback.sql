-- Igho M2 rollback / mitigation
-- Destructive rollback: only run after confirming no M2 employee/bank data must be retained.

drop index if exists public.idx_workspace_invitations_employee_id;
alter table public.workspace_invitations drop column if exists employee_id;

drop index if exists public.idx_employee_bank_accounts_workspace_status;
drop index if exists public.uq_employee_bank_accounts_employee_active;
drop table if exists public.employee_bank_accounts;

drop index if exists public.idx_employees_workspace_status;
drop index if exists public.uq_employees_membership_active;
drop index if exists public.uq_employees_workspace_email_active;
drop table if exists public.employees;
