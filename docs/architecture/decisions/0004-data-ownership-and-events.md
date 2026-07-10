# ADR 0004: Service-owned data and outbox events

- Status: Accepted
- Date: 2026-07-10

## Context

Cross-database reads couple releases, bypass authorization, and make deletion
and recovery ambiguous. Cross-product summaries still require reliable events.

## Decision

Every service owns its database and exposes versioned APIs. Durable integration
events use a transactional PostgreSQL outbox and Redis Streams. Delivery is at
least once and consumers are idempotent.

## Consequences

There are no distributed transactions. Consumers may be temporarily stale and
must handle replays. Sensitive raw content is forbidden from the event stream.
