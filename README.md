# Igho

Igho is The24thGroup's payroll orchestration platform.

## Production architecture

```text
Catalyst Slate
      |
      | Neon Auth session/JWT
      v
Catalyst API Gateway
      |
      v
Catalyst Advanced I/O Function: igho-api
      |
      +-- Neon PostgreSQL
      +-- Neon Auth JWKS verification
      +-- Paystack (later milestone)
      +-- Catalyst Email / Queue / Cache / File Storage (as introduced)
```

The existing `client/` application remains the product/visual reference while backend milestones are completed.

## Repository structure

```text
client/
functions/
  igho-api/
packages/
  core/
  providers/
  ui/
infrastructure/
Project Management/
docs/
```

## Quality

Node.js 22+ is required.

```bash
npm install
npm run quality
```

Quality checks formatting, ESLint, strict TypeScript, tests and the deployable Catalyst Function build.

## Catalyst

Project: Igho

- Catalyst project ID: `8644000000692021`
- server runtime: Advanced I/O Function
- function: `igho-api`
- frontend: Slate
- public API routing: API Gateway

The Function must be built before Catalyst deployment so `functions/igho-api/index.js` exists.

## Project management

Build governance lives in `Project Management/`.
