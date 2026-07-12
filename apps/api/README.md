# iweioo platform API

This FastAPI modular monolith owns the platform user projection, profile, and
versioned consent evidence. Credentials remain in Keycloak. The account BFF
calls these endpoints with an audience-restricted access token; unsigned user
headers and browser bearer tokens are not accepted.

```bash
python -m pip install -e "apps/api[dev]"
alembic -c apps/api/alembic.ini upgrade head
iweioo-api sync-applications --manifest-dir contracts/applications
iweioo-api
```

Required runtime variables are documented in `apps/api/.env.example`. Outside
tests, `PLATFORM_DATABASE_URL` must use `postgresql+asyncpg`. HTTP issuer/JWKS
URLs are allowed only on non-production loopback. Migrations are explicit and
never run from an API request or application startup.

Implemented account operations:

- `GET /v1/users/me`
- `PATCH /v1/users/me/profile`
- `GET /v1/users/me/applications`
- `GET /v1/users/me/consents`
- `PUT /v1/users/me/consents/{purpose}`

Consent writes require an idempotency key and the registered current policy
version. Current state is stored separately from append-only evidence, and
audit metadata records field names rather than profile values.

Application manifests are validated and synchronized explicitly after
migrations. The importer canonicalizes each manifest, records its SHA-256
checksum and full validated snapshot, serializes concurrent PostgreSQL syncs,
and never deletes registrations merely because an input file is missing. The
user endpoint separates operational availability from per-user state; a
missing state is returned as `not_started`, never inferred from login.

Liveness reports only process health. Readiness executes a database query and
returns a `503` problem response when PostgreSQL is unavailable.
