# M1 — Auth, Workspace & Access Model QA

Status: In progress
Date started: 2026-09-18

## Tasks

- [ ] M1-T001 — Integrate Neon Auth / Better Auth
- [ ] M1-T002 — Implement users, workspaces and workspace_memberships
- [ ] M1-T003 — Implement roles, permissions and policy map
- [ ] M1-T004 — Implement invite, sign-in, session and account recovery flows
- [ ] M1-T005 — Implement employee subject-scoped /me access and auth tests

## Evidence so far

- Neon Auth confirmed active on production branch using Better Auth.
- Auth base URL and JWKS are present.
- Email/password auth is enabled; localhost is allowed.
- M1 schema migration prepared on temporary branch `br-quiet-recipe-zaybz3sx`.
- Temporary migration verification: 8 Igho public tables created; 4 system roles seeded; 27 permissions seeded; The24thGroup workspace seeded.
- Code implementation staged in GitHub pending CI and production migration approval.

## Pending before closure

- Hosted CI/quality gate result
- production migration approval/application
- production schema verification
- trusted production application domain once production app hosting URL is known
- first owner bootstrap using an authenticated account

## Security notes

Neon Auth currently allows email/password sign-up without mandatory email verification. Orphan auth accounts receive no Igho workspace access. Invitation acceptance additionally requires the authenticated email to match the pending invitation email. Email verification tightening remains recommended before external commercial rollout.
