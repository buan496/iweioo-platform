# Compose profiles

`identity.compose.yml` is the Stage 2 local identity profile. It contains
Keycloak, its dedicated PostgreSQL database, and Mailpit for intercepted test
email. It is not the single-server production profile from ADR 0005.

Local safeguards:

- Keycloak and Mailpit UI ports bind to `127.0.0.1` only;
- PostgreSQL and SMTP have no host port;
- PostgreSQL joins only the internal network;
- Keycloak and Mailpit also join a local edge network so loopback port
  publishing works on Docker Desktop and GitHub-hosted runners;
- images use explicit patch versions;
- passwords are required from an ignored local env file;
- the PostgreSQL 18 volume uses `/var/lib/postgresql`, matching the official
  image's version-specific data layout.

See [`deploy/keycloak/README.md`](../keycloak/README.md) for lifecycle commands,
verification, reset behavior, and limitations.

## Image update policy

Dependabot remains enabled for npm packages and GitHub Actions. Its Docker
ecosystem does not discover images declared only in Compose files, so it is not
configured for this directory.

Until Renovate is evaluated and adopted for Compose image updates:

1. review upstream image release notes and security advisories at least monthly;
2. update pinned image tags in a dedicated pull request;
3. run `npm run identity:validate` and the `Identity Smoke` CI job before merge;
4. record any migration, rollback, or compatibility notes in that pull request.

Do not replace pinned image tags with floating tags such as `latest`.
