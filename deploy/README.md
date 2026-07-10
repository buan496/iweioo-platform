# Deployment adapters

This directory will contain the single-server Compose profile, staging
evidence, and migration coordination. Stage 1 creates the ownership boundary
only. It does not publish an incomplete production topology before identity,
PostgreSQL, Redis, secrets, backups, and observability are configured together.
