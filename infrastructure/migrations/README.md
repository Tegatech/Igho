# Database migrations

Igho database migrations live here.

Rules:
- forward migration required
- rollback or mitigation notes required
- migrations must be safe for Neon PostgreSQL 18
- schema changes must reference the relevant task ID
- destructive production changes require explicit review
