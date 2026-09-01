# Igho V1 Open Decisions

_Last updated: 2026-09-02_

These are the remaining decisions worth resolving before calling V1 build-ready.

## 1. Authentication and account recovery

Decide:
- authentication provider
- employee invite activation flow
- admin invite flow
- password reset/recovery
- MFA requirements for Owner/Approver
- session duration and revocation

Recommendation: require MFA for users who can fund, approve or execute payroll before external commercial use.

## 2. Payroll calendar and cutoffs

Define:
- default pay date
- what happens on weekends/bank holidays
- payroll preparation date
- employee-change cutoff date
- salary-change cutoff behaviour
- whether late changes move to the next payroll by default

## 3. Adjustments

Even a small internal payroll will eventually need one-off changes.

Decide V1 support for:
- bonus
- reimbursement
- deduction
- salary correction
- one-off allowance

Recommendation: support simple labelled positive/negative adjustments without building a tax engine.

## 4. Payslip specification

Define exactly what appears on a V1 payslip:
- company/workspace name
- employee name
- payroll period
- base salary
- adjustments
- deductions
- net amount
- payment date
- payment reference
- document/reference number

Also decide PDF generation/storage strategy.

## 5. Webhooks, idempotency and duplicate protection

Before live money movement, specify:
- provider webhook verification
- webhook event deduplication
- unique funding references
- unique transfer references
- idempotent retry strategy
- duplicate transfer protection
- replay handling

This is a build blocker for real payouts.

## 6. Reconciliation

Define how Igho proves its internal state matches provider state.

Minimum requirements:
- funding transaction verification
- available-balance check where supported
- transfer status verification
- scheduled reconciliation for unresolved transactions
- admin-visible mismatch state

## 7. Failure and retry rules

Define behaviour for:
- card funding failure
- funding settlement delay
- insufficient provider balance
- recipient creation failure
- account verification failure
- individual transfer failure
- transfer reversal
- provider timeout
- webhook delay

A failed employee transfer must be independently retryable.

## 8. Data protection and retention

Define:
- which bank details are stored
- masking rules
- encryption expectations
- audit retention period
- provider payload retention
- payslip retention
- employee deletion/deactivation behaviour
- data export expectations

Avoid putting full historical account numbers or secrets into logs/audit metadata.

## 9. Notifications

Decide:
- V1 email provider
- sender domain/address
- invitation template
- payroll-ready template
- payment success/failure templates
- payslip-ready template
- retry policy for failed email delivery

## 10. Secrets and environments

Define Development and Production from the start.

Never store provider secrets in frontend code or repository files.

Document:
- secret names
- environment ownership
- callback/webhook URLs
- provider test/live mode separation
- deployment promotion process

## 11. Observability and operational support

Minimum V1 observability:
- provider request failures
- webhook failures
- unresolved payments
- failed notifications
- failed scheduled payroll preparation
- audit trail for administrative actions

Define what should alert an Owner versus simply appear in Activity.

## 12. Legal/statutory boundary

V1 is payroll orchestration and payment administration, not yet a statutory Nigerian payroll/tax calculation engine.

Before external commercialisation, separately verify requirements around employment records, statutory deductions, payroll documentation, payments regulation and data protection.

## Recommended next specification order

1. Payroll calendar and adjustments
2. Authentication/onboarding
3. Payslip format
4. Webhook/idempotency rules
5. Failure/retry and reconciliation
6. Data/security
7. Notifications
8. Environment/operations

Once those are resolved, V1 is sufficiently specified to move from interactive frontend into production backend implementation.
