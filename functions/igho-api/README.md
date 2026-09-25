# igho-api

Igho's production API is a single Catalyst Advanced I/O Function.

## Runtime

- Catalyst Node.js 22
- Express
- Neon PostgreSQL
- Neon Managed Better Auth JWT verification
- API Gateway in front of the function

## Authentication flow

The hosted web client authenticates directly with Neon Managed Better Auth. Neon returns the session/JWT to the browser. Requests to Igho's protected API include:

```http
Authorization: Bearer <session.access_token>
```

The Function verifies the JWT against Neon's JWKS endpoint and then resolves Igho workspace membership/RBAC from Neon PostgreSQL.

The Function does not receive or store the user's password.

## Environment variables

Required:

- `DATABASE_URL` — Neon production database connection string
- `NEON_AUTH_BASE_URL` — Managed Better Auth base URL
- `BOOTSTRAP_OWNER_EMAIL` — email allowed to perform the one-time first Owner bootstrap

Recommended:

- `IGHO_PUBLIC_ORIGIN` — exact Web Client Hosting origin allowed by CORS

`NEON_AUTH_COOKIE_SECRET` is **not used** in this architecture. It was required only by the discarded Next.js server adapter.

## Routes

Public:
- `GET /api/v1/health`

Authenticated:
- `POST /api/v1/bootstrap`
- `GET /api/v1/me`
- `GET /api/v1/me/pay`
- `GET /api/v1/me/bank-account`
- `GET /api/v1/me/payslips`
- `POST /api/v1/workspace-invitations`
- `POST /api/v1/workspace-invitations/accept`

## Build

```bash
npm run build --workspace @igho/igho-api
```

The build bundles Igho workspace packages into `index.js`, while keeping deployment dependencies external for Catalyst.
