# Igho

Igho is The24thGroup's payroll orchestration platform.

This repository contains the existing interactive product demo in `client/` and the production foundation in `apps/`, `packages/` and `infrastructure/`.

## Project management

Build governance lives in `Project Management/`. Start with:

1. `Project Management/V1_tasklist.md`
2. `Project Management/Standards/V1_IMPLEMENTATION_BASELINE.md`
3. `Project Management/implementation_rule.md`

The active execution plan is mirrored in Asana.

## Production structure

```text
apps/
  web/
packages/
  core/
  providers/
  ui/
infrastructure/
  migrations/
  scripts/
Project Management/
docs/
client/
```

The static demo is a product/visual reference, not the production architecture.

## Quality gates

Node.js 22+ is required.

```bash
npm install
npm run quality
```

The quality workflow runs on pushes and pull requests to `main` and enforces Prettier, ESLint and TypeScript strict mode.

## Platform baseline

- Database: Neon PostgreSQL 18
- Auth: Neon Auth / Better Auth
- Funding provider: Paystack (V1)
- Payout provider: Paystack (V1)
- Demo hosting: Zoho Catalyst Slate

## Demo deployment

The existing demo remains deployable through Catalyst Slate with branch `main`, root `/`, Static / Plain HTML, and no install/build command.
