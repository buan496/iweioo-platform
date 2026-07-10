# Security, privacy, and operations

## Security boundaries

The platform uses defense in depth. No control is described as making the
service impossible to compromise.

- Public edge: TLS, host allowlist, request size limits, rate limits, bot and
  abuse controls, strict forwarded-header sanitization.
- Application: OIDC, least-privilege authorization, ownership filters,
  idempotency, input validation, output encoding, and safe error responses.
- Data: separate database roles, encrypted transport, off-host encrypted
  backups, lifecycle jobs, and minimal analytics.
- Supply chain: pinned dependencies, lock files, secret scanning, SCA, SBOM,
  container scanning, signed release provenance when introduced.
- Management: private tunnel, MFA, audited actions, no public database or
  observability ports.

## Browser security baseline

- host-only secure session cookies;
- CSRF protection on state-changing browser requests;
- exact CORS origins without credentialed wildcards;
- Content Security Policy introduced in report-only mode before enforcement;
- HSTS after HTTPS and subdomains are verified;
- frame, referrer, MIME-sniffing, and permissions policies;
- no access or refresh tokens in local storage;
- no sensitive information in URL parameters or analytics.

## Secrets

Repositories contain examples only. Production secrets are injected at deploy
time, scoped to one service and environment, rotated, and excluded from logs,
traces, backups where possible, support bundles, and model prompts.

The platform maintains an inventory for identity keys, email credentials,
database roles, object-storage credentials, model-provider keys, webhook
secrets, and service accounts. Rotation and emergency revocation are tested.

## Audit

Audit events cover authentication, privilege changes, administrative reads,
credit adjustments, pricing changes, consent, export/deletion, deployments,
backup restore, security blocks, and agent actions.

An audit record includes actor, effective role, action, target type and ID,
decision, reason, time, request and trace IDs, and a minimized network context.
It does not include credentials or raw sensitive content.

## Agent action policy

The DevSecOps Agent may automatically rate-limit, temporarily block clearly
malicious sources, and isolate an abnormal job. Restart, production rollback,
firewall modification, backup restore, and deletion require human approval.

Agent commands are typed, allowlisted, idempotent, time bounded, and recorded.
There is a global emergency stop. Agent credentials cannot grant more access
than the action policy allows.

## Backup and recovery

The launch target is RPO 1 hour and RTO 4 hours.

- PostgreSQL uses frequent backups or WAL archiving to off-host object storage.
- Qdrant uses scheduled snapshots with collection inventory.
- User objects use bucket versioning and lifecycle rules.
- Redis is not the sole copy of authoritative business data.
- Restore drills use an isolated environment and verify application behavior,
  not only file checksums.
- Restored data is reconciled with deletions and revoked credentials before it
  can serve production traffic.

## Observability

Every request and job carries a trace or correlation ID. Services emit
structured logs, Prometheus metrics, and traces with redaction applied before
export.

Required signals include:

- availability, latency, error rate, and saturation;
- login and verification failures;
- rate-limit and abuse decisions;
- queue depth, age, retries, and dead letters;
- model calls, fallback, latency, tokens, and cost;
- credit hold age and settlement mismatch;
- backup age, restore verification, disk usage, and certificate expiry;
- export and deletion workflow age;
- agent action and approval outcomes.

Alerts route to email and Feishu with deduplication, grouping, escalation,
silence, acknowledgement, and recovery notification. External uptime checks and
the public status page run outside the monitored server.

## Release gate

Merge to `main` deploys staging automatically. Production requires human
approval after CI, security scans, migrations, smoke/E2E tests, agent
evaluations, backup verification, release notes, and rollback evidence pass.

Production deployment is progressive where the component supports it. Failed
health or error-budget checks stop or roll back the release.
