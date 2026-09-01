# Igho Architecture and Provider Model

_Last updated: 2026-09-02_

## Principle

Igho is the payroll orchestration layer. It must not become a Paystack-specific frontend.

V1 uses Paystack operationally, but the payroll domain model remains provider-agnostic so another funding or payout provider can be introduced later without redesigning payroll.

## Provider boundary

Core payroll logic calls provider interfaces rather than Paystack directly.

```text
Igho payroll domain
        |
        v
Payment provider adapter
        |
        +-- Paystack (V1)
        +-- Future provider
```

Funding and payout providers should remain separately configurable even when both use Paystack initially.

```text
FundingProvider
  +-- PaystackFundingProvider
  +-- FutureFundingProvider

PayoutProvider
  +-- PaystackPayoutProvider
  +-- FuturePayoutProvider
```

V1 configuration:

```text
Funding provider: Paystack
Payout provider: Paystack
```

## Provider interface capabilities

The provider layer should expose domain-oriented operations such as:

- listBanks()
- verifyBankAccount()
- createRecipient()
- initializeFunding()
- verifyFundingTransaction()
- getBalance()
- createTransfer()
- createBulkTransfer()
- getTransferStatus()
- verifyWebhook()

## Paystack mapping

### Transfer recipient

Igho data maps to Paystack concepts including:

- recipient type: `nuban` for Nigerian bank accounts
- employee/recipient name
- account number
- bank code
- currency
- returned recipient code

Store the reusable recipient reference because future payroll runs should not recreate a recipient unnecessarily.

### Transfer

Paystack-facing transfer data includes:

- source: balance
- amount in subunit/kobo
- recipient
- unique reference
- reason/narration
- currency

Bulk payroll execution should use the provider's bulk-transfer capability where appropriate.

### Funding

Funding via Paystack Checkout requires provider-facing values such as:

- email
- amount
- currency
- unique reference
- callback URL where used
- channels where configured
- metadata

Igho must preserve the distinction between provider transaction success and payroll funds being available for payout.

## Generic provider fields

Prefer generic integration fields such as:

```text
provider
provider_recipient_id
provider_transaction_id
provider_transfer_id
provider_reference
provider_status
provider_payload
```

Avoid making Paystack-specific field names part of the core domain unless there is a strong reason.

Provider-specific values can be stored in structured provider metadata.

Example:

```json
{
  "provider": "paystack",
  "provider_recipient_id": "RCP_xxxxx",
  "provider_metadata": {
    "recipient_code": "RCP_xxxxx"
  }
}
```

## Proposed domain tables

- users
- workspaces
- workspace_memberships
- employees
- bank_accounts
- payroll_runs
- payroll_items
- funding_transactions
- payments
- payslips
- audit_events
- notification_events
- notification_deliveries
- workspace_settings

## Key architectural rules

1. Payroll domain state is authoritative for Igho workflow.
2. Provider state is stored separately and reconciled into domain state.
3. Webhooks are treated as authoritative provider events where appropriate.
4. Every externally initiated transaction uses an idempotency/reference strategy.
5. Payment retries act on the failed payroll item, not the entire payroll run.
6. Provider payloads may be retained for diagnostics, but sensitive data must be minimised and protected.
7. Bank name is display/cache data; provider bank code is the integration identifier.
8. Full account numbers should not be exposed broadly after verification.

## Future portability

The architecture should allow a future flow such as:

```text
UK funding source
      |
      v
Provider A
      |
      v
Igho payroll orchestration
      |
      v
Provider B
      |
      v
Nigerian employees
```

without changing payroll-run, approval or employee-domain logic.
