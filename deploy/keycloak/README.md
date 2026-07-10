# Local identity development profile

## Scope

This profile exercises the accepted OIDC and verified-email baseline without
contacting a real mail provider. It runs:

- Keycloak `26.6.4` at `http://localhost:8080`;
- PostgreSQL `18.4` on the private Compose network;
- Mailpit `1.30.0` at `http://localhost:8025`.

PostgreSQL stays on the internal network. Keycloak and Mailpit additionally
join a local edge network required for host loopback port publishing; neither
database port 5432 nor SMTP port 1025 is published.

The Keycloak image uses `start-dev`. Do not deploy this profile to staging or
production.

CI starts the complete profile from an empty volume, verifies OIDC discovery
and PKCE `S256`, checks the Mailpit API, and always deletes the ephemeral data.

## First start

From the repository root in PowerShell:

```powershell
Copy-Item deploy/compose/.env.identity.example deploy/compose/.env.identity.local
```

Edit `.env.identity.local` and set both blank password values with unique local
values from a password generator. The local file is ignored by Git. Then run:

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
Mailpit at `http://localhost:8025/`. Register through the realm account console
at `http://localhost:8080/realms/iweioo/account/`; verification and recovery
messages remain inside Mailpit.

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
realm JSON. Application integration will retrieve them into an ignored local
secret store in a later PR.

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

This slice does not implement application BFF sessions, production TLS and
proxy headers, real SMTP, administrator MFA enforcement, backup/restore,
high availability, or production secrets. Those controls remain release gates.

References:

- <https://www.keycloak.org/server/containers>
- <https://www.keycloak.org/server/importExport>
