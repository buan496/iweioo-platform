# Local identity development profile

## Scope

This profile exercises the accepted OIDC and verified-email baseline without
contacting a real mail provider. It runs:

- Keycloak `26.6.4` at `http://localhost:8080`;
- PostgreSQL `18.4` on the private Compose network;
- Mailpit `1.30.0` at `http://localhost:8025`;
- Redis `8.4.4` at `127.0.0.1:6379` for ephemeral BFF transactions and sessions.

PostgreSQL stays on the internal network. Keycloak, Mailpit, and Redis join a
local edge network required for host loopback port publishing. PostgreSQL port
5432 and SMTP port 1025 are not published. Redis is password protected,
loopback only, and deliberately non-persistent because it is not an
authoritative user-data store.

The Keycloak image uses `start-dev`. Do not deploy this profile to staging or
production.

CI starts the complete profile from an empty volume, verifies OIDC discovery
and PKCE `S256`, checks Mailpit and authenticated Redis health, and always
deletes the ephemeral data.

## First start

From the repository root in PowerShell:

```powershell
Copy-Item deploy/compose/.env.identity.example deploy/compose/.env.identity.local
```

Edit `.env.identity.local` and set all three blank password values with unique,
URL-safe values from a password generator. The local file is ignored by Git.
Then run:

```powershell
docker compose --env-file deploy/compose/.env.identity.local `
  --file deploy/compose/identity.compose.yml up --detach
```

Validate discovery after Keycloak is ready:

```powershell
Invoke-RestMethod `
  http://localhost:8080/realms/iweioo/.well-known/openid-configuration |
  Select-Object issuer, authorization_endpoint, token_endpoint
```

Open the Keycloak administration console at `http://localhost:8080/admin/` and
Mailpit at `http://localhost:8025/`.

## Connect the portal BFF

In the administration console, open **iweioo → Clients → iweioo-portal →
Credentials** and copy the generated client secret. Never paste it into a
tracked file.

Create the ignored portal environment file:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

Set `OIDC_CLIENT_SECRET` to the generated client secret and set
`BFF_REDIS_URL` to the local Redis connection using the same URL-safe password
from `IDENTITY_REDIS_PASSWORD`:

```dotenv
BFF_REDIS_URL=redis://:<local-redis-password>@127.0.0.1:6379/0
```

Run `npm run dev`, open `http://localhost:3000/zh/`, and use the portal's
Register or Sign in control. Verification and recovery messages remain inside
Mailpit. The portal uses `prompt=create` for registration and the exact
`http://localhost:3000/auth/callback` redirect URI.

## Imported contract

`realm/iweioo-realm.json` defines:

- email-as-username registration, mandatory verification, and recovery;
- password, token lifetime, brute-force, event, and audit baselines;
- the five accepted platform roles without assigning privileged users;
- confidential Portal, Account, Interview, and Defense BFF clients;
- exact localhost callback/logout origins and mandatory PKCE `S256`;
- per-client audience mappers;
- Mailpit-only SMTP with no authentication or external delivery.

Client credentials are generated and stored by local Keycloak, never in the
realm JSON. The portal reads its credential only from the ignored runtime
environment.

The portal BFF stores one-time PKCE transactions and OIDC tokens in Redis. The
browser receives only host-only opaque `HttpOnly`, `SameSite=Lax` cookies.
Production HTTPS changes their names to the `__Host-` form and enables the
`Secure` attribute. Logout is a same-origin, CSRF-checked POST that deletes the
local record, attempts refresh-token revocation, and performs RP-initiated
logout. Transactions expire after ten minutes. Sessions default to the
Keycloak 30-minute idle window and are further bounded by the issued refresh
token lifetime.

## Stop and reset

Stop containers without deleting the local realm database:

```powershell
docker compose --env-file deploy/compose/.env.identity.local `
  --file deploy/compose/identity.compose.yml down
```

Startup import skips an existing realm. To reapply a changed realm JSON, reset
the local identity volume. This permanently deletes local-only users, sessions,
and configuration:

```powershell
docker compose --env-file deploy/compose/.env.identity.local `
  --file deploy/compose/identity.compose.yml down --volumes
```

Run the first-start command again after the reset.

## Deliberate non-goals

This slice does not implement production TLS and proxy headers, real SMTP,
administrator MFA enforcement, Redis high availability, production secrets,
access-token refresh on product API calls, or multi-device session management.
Those controls remain release gates.

References:

- <https://www.keycloak.org/server/containers>
- <https://www.keycloak.org/server/importExport>
