# Igho RBAC and Security

_Last updated: 2026-09-02_

## RBAC model

V1 roles:

- OWNER
- PAYROLL_ADMIN
- APPROVER
- EMPLOYEE

Roles are permission bundles. Core authorization must not rely on role names alone.

## Permissions

Suggested permission set:

```text
people.view
people.create
people.edit
people.deactivate

compensation.view
compensation.edit

bank_accounts.view_masked
bank_accounts.view_full
bank_accounts.edit
bank_accounts.verify

payroll.view
payroll.create
payroll.edit
payroll.approve
payroll.reopen

funding.view
funding.initiate

payments.view
payments.execute
payments.retry

payslips.view_all
payslips.generate

audit.view

settings.view
settings.manage

users.view
users.manage
```

## Default role behaviour

### Owner
Full workspace access, including funding, approval, payment execution, user management, settings and audit.

### Payroll Admin
People management, salary/payroll preparation and payslips. No approval or payment execution by default.

### Approver
Read payroll and approve it. No salary editing, bank changes or payment execution by default.

### Employee
Own profile/pay context only. Own bank account and own payslips.

## Money-action separation

These permissions must remain independent:

```text
funding.initiate
payroll.approve
payments.execute
```

Even if one Owner holds all three permissions initially, the model must support future segregation of duties.

## Workspace-scoped authorization

Authorization model:

```text
user
  -> workspace_membership
      -> role
          -> permissions
```

`workspace_memberships` should contain:

```text
id
workspace_id
user_id
role_id
status
created_at
```

A user may hold different roles in different workspaces.

## Employee scope

Employee access should be subject-scoped rather than broad administrative access.

Preferred employee endpoints/concepts:

```text
/me/pay
/me/bank-account
/me/payslips
```

Employees should not receive generic access to arbitrary employee records.

## Bank-account security

Support distinct permissions for masked/full access.

Most administrative views should show only masked details after verification, for example:

`GTBank •••• 4382`

Bank-account changes must create an audit event, but historical full account numbers must not be written into audit metadata.

## State-based authorization

Permission alone is insufficient. The resource state must also permit the requested action.

Example:

```text
DRAFT       editable
READY       editable
FUNDED      editable until approval
APPROVED    locked
PROCESSING  locked
SETTLED     immutable
```

Reopening an approved payroll requires `payroll.reopen` and must create a prominent audit event.

## Server-side enforcement

Frontend hiding is UX only.

Every protected backend action must validate:

1. authentication
2. workspace membership
3. permission
4. resource scope
5. workflow state
6. requested action

No money-moving action may rely only on client-side checks.
