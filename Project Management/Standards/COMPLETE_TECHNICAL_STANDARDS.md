# Igho Complete Technical Standards

Date: 2026-09-18
Status: Active baseline

## API

- REST, OpenAPI 3.1 as the contract source of truth
- canonical prefix: `/api/v1`
- plural resource names
- kebab-case paths
- snake_case JSON fields
- pagination required for lists that may exceed 100 rows
- request ID in success and error responses

Success envelope:
```json
{"request_id":"req_...","data":{},"meta":{}}
```

Error envelope:
```json
{"request_id":"req_...","error":{"code":"...","message":"...","hint":"...","details":[]}}
```

Use appropriate 2xx/4xx/5xx semantics; use 409 for idempotency/conflict and 422 for valid requests rejected by business rules.

## Database

- Neon PostgreSQL 18
- tables/columns/indexes/constraints use snake_case
- UUIDv7 primary keys for business tables
- `created_at`, `updated_at`, actor fields where meaningful
- soft delete with `deleted_at` / `deleted_by` for mutable business records where deletion is allowed
- JSONB only for flexible metadata/provider payloads, not query-critical business fields
- forward migrations required; rollback/mitigation notes required
- indexes required for foreign keys and common lookup/filter paths
- financial records should prefer immutable append/update-state models over destructive edits

## Authentication and sessions

- Neon Auth / Better Auth
- first-party web: secure HttpOnly cookies
- Secure in production
- SameSite=Lax or stricter unless a documented flow requires otherwise
- no auth tokens in localStorage
- session revocation supported
- MFA remains required before external commercial release for money-moving privileged users unless explicitly waived

## Authorization

V1 roles: OWNER, PAYROLL_ADMIN, APPROVER, EMPLOYEE.

Authorization is code-first policy plus persisted workspace memberships/role assignment.
Sensitive database tables should use DB-level controls/RLS where it improves defence in depth without duplicating incompatible auth semantics.

## Security and privacy

- no secrets, passwords, tokens or raw sensitive bank data in logs
- mask bank accounts by default
- encrypt sensitive stored fields where required by the approved data-protection design
- provider payload retention must be minimised
- CSRF protection for cookie-authenticated writes
- rate limiting for auth, invite, provider callback and money-moving endpoints
- dependency and secret scanning in CI before production release

## Audit

Sensitive/state-changing actions record:
- actor user ID
- workspace ID
- action
- resource type / ID
- outcome
- request ID
- reason where required
- safe before/after snapshots where appropriate
- timestamp

Audit data is append-only. Full bank account numbers must never be copied into audit metadata.

## Idempotency

Required for:
- funding initialisation/confirmation
- payout recipient creation where provider semantics require it
- transfer execution
- bulk transfer execution
- webhook ingestion
- retry paths
- payslip generation triggers where duplicate documents would be harmful

## Testing

- TypeScript strict
- lint / format
- unit tests for domain/use-cases
- integration tests for adapters, API boundaries and policies
- E2E smoke for critical flows
- >=80% changed business-logic coverage
- critical auth/RBAC/payroll/payment/idempotency paths targeted at 100%

## Observability

- structured JSON logs
- `x-request-id` correlation
- latency and HTTP status metadata
- safe actor/workspace context
- provider error classification
- alerts for unresolved funding/payouts, webhook failures, scheduled payroll failures and repeated notification failures

## Environments

At minimum:
- development
- production

Provider test/live credentials and callback/webhook URLs must be environment-specific.
Secrets never live in frontend code or committed repository files.

## Definition of Done

A task is done only when:
1. acceptance behaviour works
2. edge cases are handled
3. security/state boundaries are enforced
4. tests pass
5. docs are updated
6. evidence is recorded
7. no unresolved P0 blocker remains for that task
