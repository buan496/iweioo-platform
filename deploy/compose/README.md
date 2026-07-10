# Compose profiles

`identity.compose.yml` is the Stage 2 local identity profile. It contains
Keycloak, its dedicated PostgreSQL database, and Mailpit for intercepted test
email. It is not the single-server production profile from ADR 0005.

Local safeguards:

- Keycloak and Mailpit UI ports bind to `127.0.0.1` only;
- PostgreSQL and SMTP have no host port;
- the identity network has no external route;
- images use explicit patch versions;
- passwords are required from an ignored local env file;
- the PostgreSQL 18 volume uses `/var/lib/postgresql`, matching the official
  image's version-specific data layout.

See [`deploy/keycloak/README.md`](../keycloak/README.md) for lifecycle commands,
verification, reset behavior, and limitations.
