# Igho V1 Open Decisions

_Last updated: 2026-09-02_

This document tracks the remaining decisions before calling V1 build-ready. Resolved items are recorded here so implementation has a clear baseline.

## 1. Authentication and account recovery

Status: OPEN

Current direction:
- Neon is the preferred database direction.
- Authentication provider is still to be selected.
- Zoho Auth is not preferred.

Still decide:
- authentication provider
- employee invite activation flow
- admin invite flow
- password reset/recovery
- MFA requirements for Owner/Approver
- session duration and revocation

Recommendation: require MFA for users who can fund, approve or execute payroll before external commercial use.

## 2. Payroll calendar and cutoffs

Status: RESOLVED FOR V1

V1 rules:
- default pay date: 1st of the month
- workspace can select any pay day
- payroll is prepared 7 days before payday
- employee, bank-account and salary-change cutoff is 7 days before payday
- changes made after the cutoff take effect in the next payroll run
- if payday falls on a weekend or bank holiday, Igho keeps the configured pay date unchanged
- V1 does not automatically move payday forward or backward for weekends or holidays
- if provider timing means manual intervention is required on that date, the Owner handles it manually in V1
- once payroll is approved, changes require reopening the payroll
- once payment processing starts, the run is immutable

Still decide later:
- whether an Owner can override a post-cutoff change for the current run

## 3. Adjustments

Status: RESOLVED FOR V1

Keep adjustments deliberately simple.

Supported V1 adjustment types:
- bonus
- reimbursement
- allowance
- deduction
- salary correction
- other

Each adjustment should record:
- type
- amount
- reason
- created_by
- created_at
- optional attachment/reference

Adjustments can be positive or negative and are applied to the payroll item before net pay is calculated.

V1 does not include a statutory tax, pension or automatic prorating engine.

## 4. Payslip specification

Status: PARTIALLY RESOLVED

Goal: keep payslips simple, but useful enough to support basic proof-of-income and proof-of-employment use cases.

Recommended V1 payslip fields:

Employer / workspace:
- company/workspace name
- employer address or registered office
- employer email/contact
- optional company registration number

Employee:
- employee full name
- employee number/reference
- role/job title
- employment start date

Payroll:
- payroll period
- pay date
- base salary
- adjustments, itemised by label
- deductions, itemised by label
- net pay
- currency
- payment status
- payment reference
- payslip/document reference

Recommended presentation:
- simple branded PDF
- clear employer and employee identity at the top
- payment breakdown in the middle
- net pay prominent
- short footer stating that the document is generated from Igho payroll records

Still decide:
- PDF generation technology
- document storage location
- payslip numbering format
- whether employer address/company registration number are mandatory or optional in the first internal release

## 5. Webhooks, idempotency and duplicate protection

Status: OPEN

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

Status: OPEN

Define how Igho proves its internal state matches provider state.

Minimum requirements:
- funding transaction verification
- available-balance check where supported
- transfer status verification
- scheduled reconciliation for unresolved transactions
- admin-visible mismatch state

## 7. Failure and retry rules

Status: OPEN

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

Status: OPEN

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

Status: OPEN AT IMPLEMENTATION LEVEL

Product direction is already agreed:
- email first for V1
- event-driven notifications
- employee invite
- bank-details-required / changed
- payroll-ready / needs-attention
- payroll funded
- payroll approved
- salary payment success/failure
- payslip available

Still decide:
- V1 email provider
- sender domain/address
- final templates
- retry policy for failed email delivery

## 10. Secrets and environments

Status: OPEN

Define Development and Production from the start.

Never store provider secrets in frontend code or repository files.

Document:
- secret names
- environment ownership
- callback/webhook URLs
- provider test/live mode separation
- deployment promotion process

## 11. Observability and operational support

Status: OPEN

Minimum V1 observability:
- provider request failures
- webhook failures
- unresolved payments
- failed notifications
- failed scheduled payroll preparation
- audit trail for administrative actions

Define what should alert an Owner versus simply appear in Activity.

## 12. Legal/statutory boundary

Status: RESOLVED FOR INTERNAL V1

V1 is initially an internal The24thGroup payroll orchestration and payment administration tool.

It is not yet:
- a statutory Nigerian payroll/tax calculation engine
- a PAYE calculation service
- a pension calculation engine
- a payroll compliance service for external customers

Before external commercialisation, separately verify requirements around employment records, statutory deductions, payroll documentation, payments regulation and data protection.

## Recommended next specification order

1. Authentication/onboarding
2. Payslip implementation details
3. Webhook/idempotency rules
4. Failure/retry and reconciliation
5. Data/security
6. Notifications implementation
7. Environment/operations

Once these are resolved, V1 is sufficiently specified to move from interactive frontend into production backend implementation.
