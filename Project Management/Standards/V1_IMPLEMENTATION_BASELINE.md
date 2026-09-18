# Igho V1 Implementation Baseline

Date: 2026-09-18
Status: Approved baseline for build execution

## Product boundary

Igho V1 is internal payroll orchestration for The24thGroup.

Acceptance target:
`3 employees -> 1 payroll -> 1 funding action -> 1 approval -> 3 transfers -> 3 payslips`.

Out of scope remains defined in `docs/V1_PRODUCT_SCOPE.md`.

## Platform baseline

- Database: Neon PostgreSQL 18
- Production branch: `production`
- Auth: Neon Auth / Better Auth
- Funding provider: Paystack
- Payout provider: Paystack
- Frontend demo/deployment today: Catalyst Slate
- API: `/api/v1/*`
- Initial currency: NGN

## V1 roles

- OWNER
- PAYROLL_ADMIN
- APPROVER
- EMPLOYEE

Roles are permission bundles. Server-side authorization is permission- and state-based.

## Locked payroll rules

- Default payday: 1st of the month
- Workspace may configure another calendar day
- Payroll prepares 7 days before payday
- Salary, employee and bank-detail cutoff: 7 days before payday
- Changes after cutoff apply to the next run
- Configured payday is not automatically shifted for weekends or bank holidays
- Approved payroll requires reopen permission to change
- Once payout processing begins, the payroll run is immutable

## Locked V1 adjustments

- bonus
- reimbursement
- allowance
- deduction
- salary correction
- other

Each adjustment requires amount, reason, actor and timestamp.

## Lifecycle

Primary workflow:
`Readiness -> Funding -> Approval -> Payment -> Payslip`

Funding must distinguish:
`not_funded -> payment_pending -> payment_received -> settlement_pending -> available`

Provider payment receipt is not sufficient to mark payroll funded.

## Build sequence

M0 Foundation and standards
M1 Auth, workspace and access
M2 People and bank readiness
M3 Payroll engine
M4 Funding
M5 Approval and payouts
M6 Payslips
M7 Notifications
M8 Reconciliation, audit and operations
M9 Employee portal productionisation
M10 Admin UI productionisation
M11 Security/privacy/release hardening
M12 Internal V1 acceptance

## Build blockers before live money movement

The following must be resolved before a live payout:
- verified webhook signature flow
- idempotency and duplicate protection
- provider reconciliation rules
- failure/retry rules
- secrets/environment separation
- bank-data protection strategy
- financial audit trail
