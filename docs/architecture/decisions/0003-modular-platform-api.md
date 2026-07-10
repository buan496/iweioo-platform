# ADR 0003: Modular FastAPI platform API

- Status: Accepted
- Date: 2026-07-10

## Context

The platform requires profiles, consent, credits, usage, app registry, growth
summaries, privacy jobs, and administration. A service per capability would be
costly for one developer and one server.

## Decision

Implement these capabilities as modules in one FastAPI deployable with explicit
module boundaries and one worker deployable. Modules own their tables and may
interact through application services and outbox events, not arbitrary imports.

## Consequences

Transactions and local development remain simple. High-load modules such as the
LLM gateway and usage worker can be extracted later without changing contracts.
