# Igho Build Log

## 2026-09-18 — M0 foundation completed

M0 established the source-of-truth structure, implementation standards, quality gates, migration locations and production package boundaries.

Evidence:
- standards commit: `39c7b6a11eece43f6a408af840c5bdfeeda35094`
- scaffold commit: `e66386607716da6dc932135ac4f19641e9261241`

## 2026-09-18 — M1 database foundation applied

Production Neon migration applied after explicit Product approval.

Verified in production:
- The24thGroup workspace: 1
- roles: 4
- permissions: 27
- workspace memberships: 0 before Owner bootstrap

M1-T002 and M1-T003 are complete.

## 2026-09-18 — M1 runtime refactored to Catalyst serverless

Decision:
- remove temporary Next.js/AppSail direction
- keep Slate as frontend
- use Catalyst API Gateway + one Advanced I/O Function (`igho-api`)
- keep Neon Managed Better Auth + Neon PostgreSQL

Authentication:
- Slate authenticates directly with Neon Auth
- protected Igho API calls use Neon access JWT Bearer tokens
- `igho-api` validates JWTs via Neon JWKS
- `NEON_AUTH_COOKIE_SECRET` removed from Igho runtime requirements

Database schema and RBAC remain unchanged.

M1 remains open for CI, deployment configuration, Owner bootstrap and Product hands-on testing.
