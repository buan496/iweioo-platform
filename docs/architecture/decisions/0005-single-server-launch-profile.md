# ADR 0005: Single-server launch profile

- Status: Accepted
- Date: 2026-07-10

## Context

The first release expects little traffic and has a cost-minimal Tencent Cloud
deployment. The architecture must still support backups, monitoring, security,
and later scaling.

## Decision

Deploy application components with Docker Compose on one Linux server. Keep
logical isolation, store backups and user objects off host, and run uptime and
status checks outside the server. Target RPO 1 hour and RTO 4 hours.

## Consequences

The first release has a documented single point of failure and cannot claim
high availability. Database, worker, and application nodes can be separated
later without changing public URLs or contracts.
