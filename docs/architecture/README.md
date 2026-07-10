# iweioo platform architecture baseline

- Status: accepted baseline for implementation planning
- Version: 0.1
- Last updated: 2026-07-10

This directory is the architecture source of truth for the first production
version of `iweioo.com`. It records decisions that apply across the platform,
the interview product, the thesis-defense product, and future agent projects.

## Scope

The first production release contains:

- the public product portal at `iweioo.com`;
- centralized identity and single sign-on at `auth.iweioo.com`;
- the account and cross-product overview at `account.iweioo.com`;
- independent interview and thesis-defense applications on subdomains;
- usage metering, beta credit grants, privacy controls, and growth summaries;
- private administration, observability, and release controls;
- an integration contract for current and future applications.

Operations, content production, growth operations, and product-manager agents
are separate projects. They consume platform contracts but do not block the
first production release unless a release-gate document explicitly promotes a
capability into the launch scope.

## Documents

- [System architecture](system-architecture.md)
- [Identity and access](identity-and-access.md)
- [Data model and ownership](data-model.md)
- [Application integration contract](application-integration.md)
- [Platform workspace foundation](workspace.md)
- [Security, privacy, and operations](security-privacy-operations.md)
- [Repository evolution and delivery plan](delivery-plan.md)
- [Architecture decisions](decisions/README.md)
- [Machine-readable contracts](../../contracts/README.md)

## Invariants

The following rules require a new architecture decision record to change:

1. A user signs in once through a standards-based identity provider.
2. Each product owns its business data and never reads another service's
   database directly.
3. The platform owns identity projection, consent, credit ledger, usage,
   application registry, and cross-product summaries.
4. Raw thesis, resume, answer, transcript, and prompt content never enters the
   analytics event stream.
5. Monetary and credit calculations use integer micro-units, never floating
   point values.
6. Every externally retried write is idempotent and every asynchronous event
   consumer tolerates at-least-once delivery.
7. Production changes pass through a pull request, staging evidence, and a
   human production approval.
8. The single-server launch profile is not described as highly available.

## References

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- [OAuth 2.0 Security Best Current Practice, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)
- [Keycloak production configuration](https://www.keycloak.org/server/configuration-production)
- [OpenAPI Specification](https://spec.openapis.org/oas/)
