# ADR 0002: Central OIDC identity with Keycloak

- Status: Accepted
- Date: 2026-07-10

## Context

The interview product has custom phone-code authentication and the defense
product has no production user identity. Reimplementing an identity provider in
the platform API would create unnecessary credential and protocol risk.

## Decision

Use Keycloak as the initial central identity provider and OpenID Connect as the
application contract. Web applications use Authorization Code with PKCE and a
server-side BFF session. Email/password with email verification is the first
login method.

## Consequences

The single-server profile carries one additional production component and
database. Applications remain provider-portable because they integrate through
OIDC. Keycloak production resource use must be measured before server purchase.
