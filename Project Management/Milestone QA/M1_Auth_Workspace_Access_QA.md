# M1 — Auth, Workspace & Access Model QA

Status: In progress
Date started: 2026-09-18

## Tasks

- [ ] M1-T001 — Integrate Neon Auth / Better Auth
- [x] M1-T002 — Implement users, workspaces and workspace_memberships
- [x] M1-T003 — Implement roles, permissions and policy map
- [ ] M1-T004 — Implement invite, sign-in, session and account recovery flows
- [ ] M1-T005 — Implement employee subject-scoped /me access and auth tests

## Production database evidence

- Neon production migration applied with explicit Product approval.
- Igho application tables are present.
- The24thGroup workspace exists.
- 4 system roles exist.
- 27 permissions exist.
- memberships remain 0 until first Owner bootstrap.

## Runtime decision

The temporary Next.js/AppSail direction has been removed.

Approved architecture:
- Slate
- Catalyst API Gateway
- Catalyst Advanced I/O Function `igho-api`
- Neon Managed Better Auth
- Neon PostgreSQL

## Auth boundary

- Slate authenticates directly with Neon Auth.
- Browser sends Neon JWT as Bearer token to Igho API.
- Function verifies JWT with Neon JWKS.
- Function resolves workspace membership and role permissions from Igho tables.
- Catalyst Auth is not used as Igho identity.
- `NEON_AUTH_COOKIE_SECRET` is no longer required.

## Pending before M1 closure

- CI/quality workflow green
- deploy/configure `igho-api` in Catalyst Development
- configure API Gateway routes
- set Function environment variables
- add Slate origin to Neon trusted domains
- Owner sign-up/sign-in/bootstrap
- verify `/api/v1/me`
- test invite/accept flow with a second account
- test employee access restrictions
- test password recovery/sign-out/session behaviour
- Product hands-on acceptance

M1 intentionally remains open until testing is complete.
