# Igho Risks and Dependencies

| ID | Area | Risk / dependency | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| R-001 | Payments | Paystack international funding success may not equal immediately transferable balance | Payroll could appear funded before payout capacity exists | Model payment receipt, settlement and availability separately; verify live merchant behaviour before payout | Open |
| R-002 | Payments | Duplicate/replayed webhooks or retries could duplicate money movement | Financial loss | Signature verification, idempotency keys, event dedupe and reconciliation | Open |
| R-003 | Data | Bank data is sensitive | Privacy/security incident | Mask by default, minimise storage, encrypt approved fields, never log raw values | Open |
| R-004 | Auth | Privileged payroll actions need strong session/account controls | Unauthorised money movement | Secure cookie sessions, revocation, RBAC/state checks; MFA before external release | Open |
| R-005 | Architecture | Current UI is a static/localStorage demo | Demo assumptions could leak into production architecture | Treat demo as product reference only; build production domain/API separately | Open |
| D-001 | Database/Auth | Neon project and Neon Auth / Better Auth | M1 dependency | Project connected; production branch exists | Available |
| D-002 | Funding/Payout | Paystack | M2/M4/M5 dependency | Keep behind provider ports; verify merchant capabilities before live execution | Open verification |
| D-003 | Deployment | Current Slate app hosts static demo | Production backend/runtime still needs implementation path | Decide web/API runtime during M0-T004/M1 setup | Open |
