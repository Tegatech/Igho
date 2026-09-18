-- Destructive rollback for pre-production only. Production rollback should prefer restore/forward-fix after data exists.
drop table if exists public.audit_events;
drop table if exists public.workspace_invitations;
drop table if exists public.membership_role_assignments;
drop table if exists public.workspace_memberships;
drop table if exists public.role_permissions;
drop table if exists public.permissions;
drop table if exists public.roles;
drop table if exists public.workspaces;
drop table if exists public.user_profiles;
