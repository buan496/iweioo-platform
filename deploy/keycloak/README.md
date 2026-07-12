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
and PKCE `S256`, checks Mailpit and authenticated Redis health, exercises the
cross-application session registry and revocation paths, and always deletes the
ephemeral data.

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

## Connect the portal and account BFFs

In the administration console, open the `iweioo-portal` and `iweioo-account`
clients and copy each generated credential from its **Credentials** tab. Never
paste either secret into a tracked file.

Create the ignored application environment files:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/account/.env.example apps/account/.env.local
```

Set each file's `OIDC_CLIENT_SECRET` to its own generated client secret. Set
`BFF_REDIS_URL` in both files to the local Redis connection using the same
URL-safe password from `IDENTITY_REDIS_PASSWORD`:

```dotenv
BFF_REDIS_URL=redis://:<local-redis-password>@127.0.0.1:6379/0
```

Keep `AUTH_MAX_SESSIONS_PER_USER` identical across applications; the default is
20 and the allowed range is 2 through 50. Global BFF session inventory requires
every participating application to use the same approved Redis database.

Run `npm run dev` for the portal and `npm run dev:account` in a second terminal.
Open `http://localhost:3000/zh/`, then use Register or Sign in. Verification and
recovery messages remain inside Mailpit. After authentication, opening
`http://localhost:3001/auth/login?locale=zh&return_to=%2Fzh%2F` reuses the
Keycloak SSO session and creates a separate account BFF session without asking
for credentials again. Registration uses `prompt=create`; callbacks remain the
exact `http://localhost:3000/auth/callback` and
`http://localhost:3001/auth/callback` URIs.

## Imported contract

`realm/iweioo-realm.json` defines:

- email-as-username registration, mandatory verification, and recovery;
- password, token lifetime, brute-force, event, and audit baselines;
- the five accepted platform roles without assigning privileged users;
- confidential Portal, Account, Interview, and Defense BFF clients;
- a bearer-only `iweioo-platform-api` audience;
- exact localhost callback/logout origins and mandatory PKCE `S256`;
- per-client audience mappers, with the Account access token additionally
  scoped for the Platform API;
- Mailpit-only SMTP with no authentication or external delivery.

Client credentials are generated and stored by local Keycloak, never in the
realm JSON. Each application reads only its own credential from its ignored
runtime environment.

The shared BFF package stores one-time PKCE transactions and OIDC tokens in
app-scoped Redis namespaces. A subject-scoped index contains random session IDs
and safe application/device/timestamp metadata; record locators are stored
separately and never returned to the browser. The browser receives only
host-only opaque `HttpOnly`, `SameSite=Lax` cookies. Local portal and account cookie names are
also app-scoped because localhost ports do not isolate browser cookies.
Production HTTPS changes their names to the `__Host-` form and enables the
`Secure` attribute. Logout is a same-origin, CSRF-checked POST that deletes the
local record, attempts refresh-token revocation, and performs RP-initiated
logout. Transactions expire after ten minutes. Sessions default to the
Keycloak 30-minute idle window and are further bounded by the issued refresh
token lifetime.

The account center can list sessions from every participating iweioo BFF,
revoke a remote session, or delete all indexed BFF sessions. Logout-all then
performs RP-initiated Keycloak logout for the current browser. It intentionally
does not require a realm-management credential, so it cannot force-delete the
Keycloak SSO browser cookie on a different device; its iweioo BFF records are
still removed. This boundary is stated in the UI.

The account BFF refreshes short-lived access tokens under an app-scoped Redis
lock before calling the Platform API. It forwards the bearer token only over
the server-side Platform API boundary; the browser still receives only safe
account JSON. The Platform API verifies RS256, issuer, audience, authorized
party, expiry, required scopes, verified email, and UUID subject against cached
JWKS.

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
privileged remote Keycloak browser-session termination, or product-subdomain
token refresh.
Those controls remain release gates.

References:

- <https://www.keycloak.org/server/containers>
- <https://www.keycloak.org/server/importExport>
