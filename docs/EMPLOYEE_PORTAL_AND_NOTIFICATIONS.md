# Igho Employee Portal and Notifications

_Last updated: 2026-09-02_

## Employee portal

The employee portal is a small, mobile-first product surface.

Navigation:

- My Pay
- Bank Account
- Payslips

### My Pay

Show:
- upcoming salary amount
- pay date
- current payment status
- most recent completed payment

Example:

```text
September salary
₦175,000
Pay date: 28 September
Status: Scheduled
```

### Bank Account

Show masked verified account details, for example:

```text
GTBank
•••• 4382
Verified
```

The employee can update their bank account. Any change returns the account to a verification-required state until verified by the configured payout provider.

### Payslips

Show historical payslips with period, amount and View/Download actions.

## Employee onboarding

Preferred onboarding flow:

```text
Admin adds employee
        -> Igho sends invite
        -> Employee activates account/signs in
        -> Employee enters bank details
        -> Provider verifies bank account
        -> Employee becomes payroll-ready
```

This avoids administrators collecting sensitive bank information through informal channels where possible.

## Notifications

V1 notifications are event-driven. Do not build a generic campaign or messaging product.

### Employee-facing events

- employee invited
- bank details required
- bank details changed
- bank account verified
- salary payment sent
- salary payment failed
- payslip available

### Admin/approver events

- payroll prepared
- payroll needs attention
- funding received
- funding available
- payroll awaiting approval
- payroll approved
- transfer failure/reversal

## Notification architecture

```text
Payroll/payment/domain event
        -> Notification service
            -> Email provider (V1)
            -> WhatsApp provider (future)
            -> SMS provider (future)
```

V1 uses email first.

Suggested tables:

```text
notification_events
notification_deliveries
```

Delivery records should include:

```text
event_type
recipient_user_id
recipient_email
channel
provider
status
provider_message_id
sent_at
failed_at
```

## Preferences

Keep V1 preferences simple:

- Payroll alerts
- Payment alerts
- Payslip alerts

Do not build per-event preference complexity yet.

## Portal boundary

The employee portal is not an HRIS. V1 excludes leave, performance, timesheets, attendance, employee directory, benefits and recruitment.
