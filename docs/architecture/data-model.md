# Data model and ownership

## Ownership boundaries

| Data | System of record |
| --- | --- |
| Credentials, verification, MFA, identity-provider sessions | Keycloak |
| Platform user projection and profile | Platform API |
| Consent and privacy requests | Platform API |
| Application registry and user application summaries | Platform API |
| Beta credit grants, holds, ledger, and usage settlement | Platform API |
| Cross-product growth observations and user-approved memory | Platform API |
| Interview questions, sessions, answers, reports, and detailed ability data | Interview product |
| Thesis files, chunks, vectors, defense tasks, traces, and detailed reports | Defense product |
| Product analytics events | Platform analytics module, sanitized fields only |
| Operational metrics, logs, and traces | Observability stack |

Services exchange identifiers and summaries, never tables. Product databases
may store a local projection of `platform_user_id`, email-verification state,
and display name, but the projection is disposable and cannot become the source
of truth for credentials or credit balance.

## Core platform aggregates

### Identity and profile

- `users`: global subject, status, locale, timestamps, deletion state.
- `identity_links`: issuer and subject mappings used for migration safety.
- `user_profiles`: display name, timezone, optional education and career goals.
- `consents`: purpose, policy version, grant, revocation, and evidence time.
- `user_app_states`: first use, last use, and summary state per application.

The first account-data slice implements `users`, `identity_links`,
`user_profiles`, and `consents`. A verified OIDC subject is projected
idempotently on its first Platform API request. The current consent row is the
read model; every grant or revocation also creates an append-only
`consent_events` record with its policy version, source application, and
idempotency key. A missing row means that the purpose has never been granted,
not that consent was implied. Profile and consent mutations also create
privacy-safe `audit_events` containing changed field names rather than field
values.

School, major, graduation year, and career goals are optional. The first
release does not implement organizations, classes, or institutional tenants.

### Credit and usage

The Beta balance is a virtual usage asset named `IWEIOO_CREDIT_MICRO`; it is not
represented with floating point numbers.

- `ledger_accounts`: user and platform system accounts.
- `ledger_transactions`: append-only business transactions with a unique
  idempotency key and external reference.
- `ledger_entries`: balanced debit and credit entries in integer micro-units.
- `credit_holds`: temporary reservation before a billable operation.
- `usage_records`: provider, model, pricing version, quantities, provider cost,
  user charge, outcome, and request correlation.
- `beta_grants`: one-time verified-email grant and later campaign grants.

Every transaction balances to zero across ledger entries. Balance is derived
from the ledger; a cached balance can be rebuilt. A failed operation releases
its hold. Settlement and release are idempotent and mutually exclusive.

Real payment, recharge, refund, invoice, and withdrawal models are explicitly
outside the Beta contract. They require a business-entity and compliance review
before implementation.

### Growth profile

- `growth_profiles`: user-controlled sharing and personalization settings.
- `growth_dimensions`: versioned capability taxonomy.
- `growth_observations`: product, dimension, score or level, evidence summary,
  confidence, and source time.
- `memory_items`: user-visible goals and preferences with provenance,
  expiration, and deletion state.
- `growth_snapshots`: reproducible cross-product summaries.

Raw answers, thesis text, resume text, transcripts, and prompts are not growth
observations. Products emit a bounded metric or summary whose schema is
registered and whose purpose is covered by consent.

### Governance

- `audit_events`: append-only actor, action, target, decision, request, and
  security context.
- `data_requests`: export and deletion workflow state.
- `outbox_events`: transactionally recorded integration events.
- `application_registrations`: application ID, URLs, scopes, event schemas, and
  lifecycle contacts.

## Data classification

| Class | Examples | Event-stream rule |
| --- | --- | --- |
| Public | Published blog, product catalog | Allowed |
| Internal | Pricing version, service health | Allowed with minimal fields |
| Personal | Profile, activity, usage | Allowed only for defined purpose |
| Sensitive | Thesis, resume, answer text, transcript, credentials | Never allowed |

Analytics is limited to structured events such as page view, feature action,
task completion, error category, latency, and cost. Screen recording, keystroke
capture, and raw content analytics are prohibited in the first release.

## Retention and deletion

- Product-uploaded sensitive files default to 30-day retention.
- A user can shorten the period or delete immediately.
- Deletion covers the source object, parsed text, vector entries, caches, and
  product references.
- Backups expire deleted material through the documented backup-retention
  window; deleted data is not restored into an active account.
- The account center currently exposes profile and consent controls. Export,
  deletion, and memory-management controls follow in later slices.
- Audit and security data use a separate documented retention policy and never
  store raw sensitive content.

## Database constraints

- UUIDs identify users and externally visible resources.
- Timestamps are UTC with timezone information.
- Money-like values are signed decimal strings at API boundaries and `BIGINT`
  micro-units in PostgreSQL.
- Every mutable record used in concurrent flows has a version or safe locking
  strategy.
- Unique constraints enforce idempotency keys, event IDs, and issuer-subject
  identity links.
- User-owned tables index `platform_user_id` with their primary access path.
- Destructive lifecycle operations use tombstones and asynchronous purge jobs.
