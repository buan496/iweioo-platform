# Deployment adapters

This directory contains local and future production deployment adapters. Stage
2 currently has two deliberately local-only profiles:

- `compose/identity.compose.yml` runs Keycloak, its PostgreSQL database,
  Mailpit, and ephemeral Redis-backed BFF sessions;
- `compose/platform-data.compose.yml` runs the separate PostgreSQL system of
  record for Platform API account profiles and consent evidence.

The single-server, staging, and production profiles remain deferred until
identity, databases, secrets, backups, edge routing, and observability can be
configured together. These local profiles are development and CI adapters, not
production deployment guidance.
