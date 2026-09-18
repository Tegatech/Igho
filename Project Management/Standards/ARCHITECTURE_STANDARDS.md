# Igho Architecture Standards

Date: 2026-09-18
Status: Active

## 1. Architecture model

Igho follows clean architecture with hexagonal ports/adapters.

Layers:
1. Presentation: web UI, API route handlers
2. Application: use-cases and orchestration
3. Domain: payroll entities, value objects, state rules
4. Infrastructure: Neon, Paystack, email, file storage and operational adapters

Inner layers must not depend on outer layers.

## 2. Required provider boundaries

At minimum:
- AuthProvider / session integration boundary
- BankVerificationProvider
- FundingProvider
- PayoutProvider
- EmailProvider
- FileStorageProvider
- SecretsProvider
- ClockProvider for deterministic payroll/date tests

Provider interfaces must expose typed errors and health where operationally useful.

## 3. Domain ownership

Igho domain state is authoritative for workflow.
Provider state is stored separately and reconciled into domain state.

No provider identifier should become the primary domain identity.

## 4. Workspace architecture

Every business resource is workspace-scoped unless explicitly global.

Authorization chain:
`user -> workspace_membership -> permissions -> resource/subject scope -> workflow state -> action`

Employee access is subject-scoped through `/me/*` use-cases.

## 5. Financial safety

- Every external financial mutation has a unique idempotency/reference key.
- Webhooks are signature-verified and replay-safe.
- Bulk payout state is tracked per recipient.
- Retrying one failed transfer must not rerun successful transfers.
- Funding receipt, provider settlement and payout availability are distinct states.

## 6. Operational readiness

Production services expose:
- version/build metadata
- aggregate health
- provider health where safe
- structured JSON logging
- request correlation IDs
- actor/workspace context where available

## 7. Target repository shape

The current static demo may remain during migration, but production code should converge on:

```text
apps/
  web/
packages/
  core/
  providers/
  ui/
infrastructure/
  migrations/
  scripts/
Project Management/
docs/
client/                  # legacy/demo until production UI migration completes
```

The final framework/runtime choice for `apps/web` must be recorded before M1 implementation if not already established.

## 8. Deviation rule

Any deliberate deviation from these standards requires an ADR and Product + Engineering sign-off.
