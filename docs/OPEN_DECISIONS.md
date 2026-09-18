# Igho V1 Open Decisions

_Last updated: 2026-09-18_

This document tracks remaining V1 implementation decisions and records resolved product decisions.

## 1. Authentication and account recovery

Status: PARTIALLY RESOLVED

Resolved:
- database: Neon PostgreSQL
- authentication platform: Neon Auth / Better Auth
- first-party web sessions use secure HttpOnly cookies
- auth tokens must not be stored in browser localStorage

Still decide/implement in M1:
- employee invite activation flow
- admin invite flow
- password reset/recovery UX
- exact session duration, idle timeout and revocation behaviour
- MFA timing for Owner/Approver / money-moving permissions

Recommendation:
- require MFA for users who can fund, approve or execute payroll before external commercial use.

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

Supported adjustment types:
- bonus
- reimbursement
- allowance
- deduction
- salary correction
- other

Each adjustment records type, amount, reason, created_by, created_at and optional attachment/reference.

V1 does not include a statutory tax, pension or automatic prorating engine.

## 4. Payslip specification

Status: PARTIALLY RESOLVED

Goal: simple payslips useful for proof-of-income and proof-of-employment.

V1 fields include employer/workspace identity, employee identity/reference/job title/start date, payroll period, pay date, base salary, itemised adjustments/deductions, net pay, currency, payment status/reference and document reference.

Still decide:
- PDF generation technology
- document storage location
- payslip numbering format
- whether employer address/company registration number are mandatory or optional in first internal release

## 5. Webhooks, idempotency and duplicate protection

Status: OPEN — BUILD BLOCKER BEFORE LIVE PAYOUTS

Specify:
- provider webhook verification
- webhook event deduplication
- unique funding references
- unique transfer references
- idempotent retry strategy
- duplicate transfer protection
- replay handling

## 6. Reconciliation

Status: OPEN

Minimum:
- funding transaction verification
- available-balance check where supported
- transfer status verification
- scheduled reconciliation for unresolved transactions
- admin-visible mismatch state

## 7. Failure and retry rules

Status: OPEN

Define card funding failure, settlement delay, insufficient provider balance, recipient creation failure, account verification failure, individual transfer failure, reversal, provider timeout and webhook delay.

A failed employee transfer must be independently retryable.

## 8. Data protection and retention

Status: OPEN

Define:
- stored bank data
- masking rules
- encryption expectations
- audit retention
- provider payload retention
- payslip retention
- employee deletion/deactivation
- data export expectations

Never put full historical account numbers or secrets into logs/audit metadata.

## 9. Notifications

Status: OPEN AT IMPLEMENTATION LEVEL

Product direction:
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
- retry policy

## 10. Secrets and environments

Status: PARTIALLY RESOLVED

Environments:
- development
- production

Still define:
- secret names
- environment ownership
- callback/webhook URLs
- provider test/live separation
- deployment promotion process

Never store provider secrets in frontend code or repository files.

## 11. Observability and operational support

Status: OPEN

Minimum V1 observability:
- provider request failures
- webhook failures
- unresolved payments
- failed notifications
- failed scheduled payroll preparation
- audit trail for administrative actions

Define alert vs Activity-only events.

## 12. Legal/statutory boundary

Status: RESOLVED FOR INTERNAL V1

V1 is initially an internal The24thGroup payroll orchestration and payment administration tool.

It is not yet a statutory Nigerian payroll/tax calculation engine, PAYE service, pension calculation engine or payroll compliance service for external customers.

Before external commercialisation, separately verify employment records, statutory deductions, payroll documentation, payments regulation and data protection requirements.

## Recommended specification order

1. M1 authentication/onboarding/session rules
2. payslip implementation details
3. webhook/idempotency rules
4. failure/retry and reconciliation
5. data/security
6. notifications implementation
7. environment/operations
