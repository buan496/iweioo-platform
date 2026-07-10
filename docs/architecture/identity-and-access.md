# Identity and access

## Decision

Keycloak is the initial identity provider at `auth.iweioo.com`. Applications
integrate through OpenID Connect rather than Keycloak-specific adapters where a
standards-compliant framework library is available.

This decision replaces the interview application's custom phone-code token and
adds identity to the thesis-defense application. Existing development users do
not require migration.

## User authentication

The first login method is email and password with mandatory first-email
verification and password recovery. Phone and social login are outside the
first release.

Each web application uses OpenID Connect Authorization Code flow with PKCE
`S256`, exact redirect URI matching, `state`, and `nonce`. Implicit flow and the
resource-owner password grant are disabled.

```mermaid
sequenceDiagram
    actor U as User
    participant W as Product Next.js BFF
    participant I as auth.iweioo.com
    participant A as Product FastAPI

    U->>W: Open product
    W-->>U: Redirect with state, nonce, PKCE challenge
    U->>I: Authenticate or reuse SSO session
    I-->>W: Authorization code
    W->>I: Redeem code with PKCE verifier
    I-->>W: ID, access, and rotating refresh token
    W-->>U: Host-only opaque session cookie
    W->>A: Audience-scoped access token
    A-->>W: Authorized product response
```

## Browser session rules

- Refresh and access tokens are held by the server-side BFF, not browser local
  storage.
- Every subdomain uses its own host-only `HttpOnly`, `Secure`, `SameSite=Lax`
  opaque session cookie.
- No authentication cookie is scoped to `.iweioo.com`.
- Single sign-on occurs through the identity-provider session and a short
  redirect, not by sharing application cookies.
- Session identifiers rotate after login and privilege changes.
- Logout revokes the local session and the identity-provider grant.

## Token rules

- Access tokens are short lived and restricted by issuer, audience, scope, and
  authorized party.
- Product APIs validate signature, allowed algorithm, issuer, audience,
  expiration, not-before time, and required scopes against cached JWKS.
- Refresh tokens rotate and replay causes the token family to be revoked.
- User-delegated cross-service calls use token exchange or a separately issued
  audience token; unsigned identity headers are forbidden.
- Background workers use service accounts with least-privilege scopes and an
  explicit subject reference where a user-owned record is affected.
- Keys rotate with overlapping verification windows and an exercised runbook.

## Global user identity

The OIDC `sub` issued by the iweioo realm is the stable global subject for the
first release. Platform and product tables store it as a UUID named
`platform_user_id`. The platform also keeps an identity-link record containing
issuer and subject so a future identity-provider migration can be performed
without rewriting product history.

No product creates a shadow user from an arbitrary request header. A first
authenticated request may create an idempotent local user projection from a
validated token.

## Authorization

Authentication and authorization are separate. Keycloak provides identity and
coarse scopes; each service enforces ownership and business authorization.

Initial roles:

- `user`
- `support_agent`
- `content_operator`
- `auditor`
- `platform_admin`

Administrative roles require MFA and private-network access. A role never
bypasses row ownership checks unless a documented, audited support operation
explicitly grants that access.

## Required controls

- password policy and breached-password screening where the configured
  provider supports it;
- email verification token expiry and one-time use;
- login, registration, recovery, and verification rate limits;
- brute-force detection and progressive lockout;
- session list and remote revocation for the user;
- mandatory MFA for privileged accounts;
- login and privilege-change audit events;
- no production development codes or default credentials.

## Local implementation baseline

The Stage 2 development profile lives under `deploy/keycloak` and
`deploy/compose/identity.compose.yml`. It imports a secret-free realm into a
dedicated local PostgreSQL database and routes email to Mailpit. All published
ports bind to loopback; database and SMTP ports remain private.

The imported Web clients are confidential BFF clients, require Authorization
Code plus PKCE `S256`, use one exact callback URI, disable implicit and direct
password grants, and receive an audience restricted to their client ID. No
client secret or privileged user is committed.

This profile is evidence for local contract development only. `start-dev`,
Mailpit, localhost redirect URIs, and bootstrap administration are prohibited
in staging and production. See the [local identity runbook](../../deploy/keycloak/README.md).

## Standards references

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [Keycloak application security overview](https://www.keycloak.org/securing-apps/overview)
- [Keycloak container production guidance](https://www.keycloak.org/server/containers)
