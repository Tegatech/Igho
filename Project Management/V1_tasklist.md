# Igho V1 Tasklist

Date: 2026-09-18
Status: Active
Execution mirror: Asana project "Igho"

## Milestones

- [x] M0 — Foundation & standards alignment
- [ ] M1 — Auth, workspace & access model
- [ ] M2 — People & bank readiness
- [ ] M3 — Payroll engine
- [ ] M4 — Funding
- [ ] M5 — Approval & payouts
- [ ] M6 — Payslips
- [ ] M7 — Notifications
- [ ] M8 — Reconciliation, audit & operational safety
- [ ] M9 — Employee portal productionisation
- [ ] M10 — Admin UI productionisation
- [ ] M11 — Security, privacy & release hardening
- [ ] M12 — Internal V1 acceptance

## M0 tasks

- [x] M0-T001 — Create Igho implementation rule and source-of-truth order
- [x] M0-T002 — Create Igho architecture & technical standards baseline
- [x] M0-T003 — Create build log, change request, risk/dependency and blocker logs
- [x] M0-T004 — Lock repo structure, TypeScript strict mode, lint/format and CI gates
- [x] M0-T005 — Create milestone QA templates and Definition of Done

## M0 outcome

Production scaffolding now exists alongside the static demo:
- npm workspaces
- `apps/web`
- `packages/core`
- `packages/providers`
- `packages/ui`
- `infrastructure/migrations`
- `infrastructure/scripts`
- TypeScript strict configuration
- ESLint strict type-aware rules
- Prettier source/config checks
- GitHub Actions quality gate

M1 is now the active implementation milestone.
