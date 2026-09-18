# ADR-001 — Next.js 16 + Neon Managed Better Auth

Date: 2026-09-18
Status: Approved for M1

## Decision

Use Next.js 16 App Router in `apps/web` for the production web/API application and Neon Managed Better Auth through `@neondatabase/auth`.

## Why

- Neon documents and supports a first-party Next.js server adapter.
- The server adapter provides HttpOnly signed session caching, route handlers, middleware and server-side session lookup.
- Next.js aligns with The24thGroup clean architecture standard when presentation/API code remains outside domain packages.
- The existing Slate demo can remain untouched while production routes are built in parallel.

## Boundaries

- `packages/core`: domain policy and authorization logic only.
- `packages/providers`: Neon and other external adapters.
- `apps/web`: presentation, auth proxy, API transport and composition.
- No provider SDK imports in `packages/core`.

## Session baseline

- HttpOnly signed session-data cookie via Neon Auth SDK.
- SameSite=Strict.
- 5-minute session-data cache TTL.
- Neon Auth remains authoritative for the underlying session lifecycle and revocation.
- The previously discussed 2h idle / 24h rolling / 7d absolute policy remains a target to enforce/configure before external commercial release if Neon exposes the required controls; it is not falsely claimed as implemented in M1.

## Package versions selected

- Next.js 16.3.5
- React 19.3.0
- @neondatabase/auth 0.5.0-beta
- @neondatabase/auth-ui 0.3.0-beta
- @neondatabase/serverless 1.1.0

These were current package versions when M1 was implemented.
