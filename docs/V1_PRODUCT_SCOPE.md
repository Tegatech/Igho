# Igho V1 Product Scope

_Last updated: 2026-09-02_

## Purpose

Igho V1 is an internal payroll product for The24thGroup. The immediate job is simple:

> Pay a small team reliably every month from the UK, with one funding action, one approval flow, clear payment status, and a permanent record of what happened.

The first production acceptance target is:

> 3 employees -> 1 payroll -> 1 funding action -> 1 approval -> 3 transfers -> 3 payslips.

Igho is not an HRIS, production management suite, tax engine, accounting package, or generic payments dashboard.

## V1 capabilities

### People
- Add and manage employees.
- Store name, email, phone, role, salary, start date, employment status and pay settings.
- Employee bank-account onboarding.
- Bank account verification where supported by the active payment provider.
- Reusable payout-recipient reference stored after verification.
- Employee can maintain their own bank details through the employee portal.

### Payroll
- Automatically prepare monthly payroll.
- Include active employees by default.
- Calculate total payroll.
- Show pay date and individual net amounts.
- Allow employee exclusion from a specific run.
- Block payment readiness when required bank details are missing or unverified.
- Require explicit approval before payment execution.

### Funding
- One Fund Payroll action.
- Initial funding provider: Paystack.
- International-card funding where enabled.
- Incoming funding transaction linked to a payroll run.
- Funding status must distinguish payment receipt from funds becoming available for payout.

Funding lifecycle:

`NOT_FUNDED -> PAYMENT_PENDING -> PAYMENT_RECEIVED -> SETTLEMENT_PENDING -> AVAILABLE`

A successful card charge does not automatically mean the payroll is funded for payout purposes.

### Approval
- Payroll requires explicit approval before payout.
- Record approver and approval timestamp.
- Lock payroll amounts after approval.
- Reopening an approved payroll requires a specific permission and creates an audit event.

### Payments
- Initial payout provider: Paystack.
- Create and reuse transfer recipients.
- Prefer bulk transfer capability for payroll execution.
- Track each employee transfer independently.
- Support processing, settled, failed and reversed states.
- Retry a failed employee payment without rerunning the full payroll.

### Payslips
- Generate a payslip after successful payment.
- Employee can view their own payslips.
- Store payroll period, pay values, generated timestamp and document reference.

### Audit
Audit all sensitive lifecycle events including:
- employee creation and status changes
- salary changes
- bank-account changes
- payroll creation/preparation
- funding events
- approval/reopen events
- payment attempts
- payment success/failure/reversal
- payslip generation

## Core payroll lifecycle

`Readiness -> Funding -> Approval -> Payment`

Suggested payroll states:

- DRAFT
- READY
- AWAITING_FUNDING
- FUNDING_PENDING
- FUNDED
- AWAITING_APPROVAL
- APPROVED
- PROCESSING
- PARTIALLY_PAID
- SETTLED
- FAILED
- CANCELLED

## Admin navigation

- Overview
- People
- Payroll
- Payments
- Payslips
- Activity
- Settings

The Overview should primarily answer: **what needs to happen next?**

## Employee portal

The employee portal is intentionally small and mobile-first.

Navigation:
- My Pay
- Bank Account
- Payslips

Employee capabilities:
- complete onboarding
- maintain own bank account
- view upcoming pay
- view recent payment status
- view/download payslips

The employee portal must not become a general HR portal in V1.

## Explicitly out of scope for V1

- PAYE calculations
- pension calculations
- statutory Nigerian payroll engine
- expenses
- leave management
- timesheets
- attendance
- performance management
- recruitment
- production budgeting
- invoicing
- project management
- contractor marketplace
- multi-currency payroll
- salary advances
- benefits
- analytics suite
- accounting integrations
- AI features

## Success criteria

Igho V1 succeeds when the monthly salary process can be completed without manually initiating separate external transfers for every employee, while maintaining clear state, approval, auditability and employee records.
