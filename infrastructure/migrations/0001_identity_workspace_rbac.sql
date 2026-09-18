-- M1-T002 / M1-T003
-- Identity, workspace, RBAC, invitations and audit foundation.
-- Prepared and verified on a temporary Neon branch before production application.

create table public.user_profiles (
  id uuid primary key default uuidv7(),
  auth_user_id uuid not null unique references neon_auth."user"(id) on delete restrict,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references neon_auth."user"(id) on delete set null,
  updated_by uuid references neon_auth."user"(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references neon_auth."user"(id) on delete set null
);

create table public.workspaces (
  id uuid primary key default uuidv7(),
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references neon_auth."user"(id) on delete set null,
  updated_by uuid references neon_auth."user"(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references neon_auth."user"(id) on delete set null,
  constraint uq_workspaces_slug unique (slug)
);

create table public.roles (
  id uuid primary key default uuidv7(),
  role_key text not null,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_roles_role_key unique (role_key)
);

create table public.permissions (
  id uuid primary key default uuidv7(),
  permission_key text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint uq_permissions_permission_key unique (permission_key)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.workspace_memberships (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  auth_user_id uuid not null references neon_auth."user"(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references neon_auth."user"(id) on delete set null,
  updated_by uuid references neon_auth."user"(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references neon_auth."user"(id) on delete set null
);

create unique index uq_workspace_memberships_workspace_user_active
  on public.workspace_memberships (workspace_id, auth_user_id) where deleted_at is null;
create index idx_workspace_memberships_auth_user_id
  on public.workspace_memberships (auth_user_id) where deleted_at is null;
create index idx_workspace_memberships_workspace_id
  on public.workspace_memberships (workspace_id) where deleted_at is null;

create table public.membership_role_assignments (
  membership_id uuid not null references public.workspace_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references neon_auth."user"(id) on delete set null,
  primary key (membership_id, role_id)
);

create index idx_membership_role_assignments_role_id
  on public.membership_role_assignments (role_id);

create table public.workspace_invitations (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  email text not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid references neon_auth."user"(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references neon_auth."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references neon_auth."user"(id) on delete set null
);

create unique index uq_workspace_invitations_pending_email
  on public.workspace_invitations (workspace_id, lower(email))
  where status = 'pending' and deleted_at is null;
create index idx_workspace_invitations_token_hash
  on public.workspace_invitations (token_hash)
  where status = 'pending' and deleted_at is null;

create table public.audit_events (
  id uuid primary key default uuidv7(),
  workspace_id uuid references public.workspaces(id) on delete restrict,
  actor_auth_user_id uuid references neon_auth."user"(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  outcome text not null check (outcome in ('success', 'failure', 'denied')),
  request_id text,
  reason_code text,
  note text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_events_workspace_created_at on public.audit_events (workspace_id, created_at desc);
create index idx_audit_events_actor_created_at on public.audit_events (actor_auth_user_id, created_at desc);
create index idx_audit_events_resource on public.audit_events (resource_type, resource_id, created_at desc);

insert into public.permissions (permission_key, description) values
  ('people.view','View people in the workspace'),
  ('people.create','Create or invite people'),
  ('people.edit','Edit people'),
  ('people.deactivate','Deactivate people'),
  ('compensation.view','View compensation'),
  ('compensation.edit','Edit compensation'),
  ('bank_accounts.view_masked','View masked bank account information'),
  ('bank_accounts.view_full','View full bank account information'),
  ('bank_accounts.edit','Edit bank account information'),
  ('bank_accounts.verify','Verify bank accounts'),
  ('payroll.view','View payroll runs'),
  ('payroll.create','Create and prepare payroll runs'),
  ('payroll.edit','Edit payroll runs before lock'),
  ('payroll.approve','Approve payroll runs'),
  ('payroll.reopen','Reopen an approved payroll run'),
  ('funding.view','View payroll funding state'),
  ('funding.initiate','Initiate payroll funding'),
  ('payments.view','View payout state'),
  ('payments.execute','Execute payouts'),
  ('payments.retry','Retry failed payouts'),
  ('payslips.view_all','View all workspace payslips'),
  ('payslips.generate','Generate payslips'),
  ('audit.view','View workspace audit activity'),
  ('settings.view','View workspace settings'),
  ('settings.manage','Manage workspace settings'),
  ('users.view','View workspace users'),
  ('users.manage','Manage workspace users');

insert into public.roles (role_key, name, description) values
  ('OWNER','Owner','Full workspace authority, including funding, approval and payout execution'),
  ('PAYROLL_ADMIN','Payroll Admin','People, compensation, payroll preparation and payslips without approval or payout execution by default'),
  ('APPROVER','Approver','Payroll review and approval without people, bank or payout mutation by default'),
  ('EMPLOYEE','Employee','Subject-scoped access to own payroll-facing information');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.role_key = 'OWNER';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.permission_key in (
  'people.view','people.create','people.edit','people.deactivate','compensation.view','compensation.edit',
  'bank_accounts.view_masked','bank_accounts.edit','bank_accounts.verify',
  'payroll.view','payroll.create','payroll.edit','funding.view','payments.view',
  'payslips.view_all','payslips.generate','settings.view','users.view'
) where r.role_key = 'PAYROLL_ADMIN';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.permission_key in (
  'payroll.view','payroll.approve','funding.view','payments.view','settings.view'
) where r.role_key = 'APPROVER';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.permission_key in (
  'bank_accounts.view_masked','bank_accounts.edit'
) where r.role_key = 'EMPLOYEE';

insert into public.workspaces (name, slug) values ('The24thGroup', 'the24thgroup');
