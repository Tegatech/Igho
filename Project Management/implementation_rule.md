# Igho Implementation Rule

Date created: 2026-09-18
Status: Active

## 1. Read before implementation

Work must be implemented against the source-of-truth order in `Project Management/README.md`.

Every code change must reference an active task ID from `V1_tasklist.md` / Asana.

## 2. Mandatory update rule

When behaviour, scope, state models, integrations or security rules change, update the impacted source documents in the same change:

- V1 implementation baseline
- product scope / open decisions where applicable
- task status
- Build Log with verification evidence
- Change Requests when approved scope changes
- Risks and Dependencies when the risk profile changes
- Blocker Log when execution is blocked
- milestone QA artefact when closing a milestone

No implementation is complete until documentation and evidence are current.

## 3. Milestone execution

- Work milestone-by-milestone.
- Do not start a future milestone while the current milestone has unresolved P0 blockers unless explicitly approved.
- Every milestone closes with functional verification, edge-case checks, tests, docs, evidence, blocker/risk review and Product sign-off.

## 4. Architecture rule

- Use clean / hexagonal architecture.
- Domain and application logic depend on ports/interfaces, not provider SDKs.
- Neon, Paystack, email, file storage and other external capabilities must sit behind adapters.
- Provider choice must be configuration-driven where practical.
- Direct provider SDK calls in domain/use-case code are prohibited.

## 5. API and data rule

- Canonical API prefix: `/api/v1`.
- Resource paths: plural nouns, kebab-case.
- JSON fields: snake_case.
- PostgreSQL business tables: plural snake_case.
- Primary keys: UUIDv7 unless an approved exception is documented.
- Financial writes and provider callbacks must be idempotent.
- Sensitive/state-changing actions must emit audit records.

## 6. Security rule

- First-party web auth uses secure HttpOnly cookies.
- Auth tokens must not be stored in browser localStorage.
- Every protected action validates authentication, workspace membership, permission, subject/resource scope and workflow state.
- Financial permissions remain separate: funding, approval and payout execution.
- No secrets or full bank-account data in logs or audit metadata.

## 7. Testing and evidence

Minimum quality gate:
- TypeScript strict mode
- lint / format pass
- unit tests
- integration tests
- E2E smoke for critical flows
- >=80% coverage for changed business logic
- 100% path coverage for critical auth, RBAC, payment/idempotency and payroll-state logic where reasonably measurable

Evidence may include command outputs, API checks, screenshots, test summaries and known limitations.

## 8. Change control

Approved V1 scope changes are logged in `Change Requests.md` before implementation. Unapproved scope changes remain pending.

## 9. Communication

Implementation updates should report:
- what changed
- why
- what remains open
- task IDs
- evidence location
