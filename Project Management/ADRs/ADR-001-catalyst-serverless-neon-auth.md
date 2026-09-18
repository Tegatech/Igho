# ADR-001 — Catalyst serverless runtime + Neon Auth

Date: 2026-09-18
Status: Approved

## Context

M1 briefly introduced a Next.js server runtime because Neon provides a first-party Next.js adapter. Igho does not need AppSail and The24thGroup's preferred deployment model is serverless Catalyst infrastructure.

## Decision

Use:

- Catalyst Slate for the browser application
- Catalyst API Gateway as the public Igho API boundary
- one Catalyst Advanced I/O Function, `igho-api`, as the initial API/runtime
- Neon PostgreSQL as the application database
- Neon Managed Better Auth as identity provider
- Paystack adapters for funding/payout in later milestones
- Catalyst Email, Queue, Cache and File Storage where those capabilities are introduced

## Authentication model

Slate authenticates directly against Neon Managed Better Auth using the Neon browser SDK / REST API.

Neon returns an access JWT. The browser sends that JWT as a Bearer token to the Catalyst API.

`igho-api` verifies the JWT against Neon's JWKS endpoint, reads `sub` and `email`, then applies Igho workspace membership and RBAC.

This means:

- Catalyst Authentication is not Igho's identity provider
- passwords never pass through Igho's Function
- `NEON_AUTH_COOKIE_SECRET` is not required
- no auth token is persisted in localStorage by Igho
- the Function remains stateless
- Neon Auth and Igho application authorization remain separate concerns

## Function topology

Start with one Advanced I/O Function instead of one function per route.

Split the function later only for clear operational reasons such as independent scaling, asynchronous workloads, provider isolation or security boundaries.

## Boundaries

- `packages/core`: domain/RBAC policy
- `packages/providers`: external adapters
- `functions/igho-api`: HTTP transport/composition
- `client`: Slate frontend
- `infrastructure`: migrations and deployment documentation

## Consequences

The previous Next.js/AppSail implementation is removed before M1 acceptance.

The production M1 database migration remains valid and unchanged.
