# ADR 0001: Federated applications on subdomains

- Status: Accepted
- Date: 2026-07-10

## Context

The portal, interview product, and thesis-defense product have independent
frontends and release histories. Future products must be independently
deployable while presenting one iweioo brand and one login.

## Decision

Keep each product in its own repository and deploy it on an iweioo subdomain.
Share identity, platform contracts, `iweioo-ui`, and `iweioo-sdk`; do not use
runtime micro-frontends or merge all products into one repository.

## Consequences

Products can release and scale independently. Cross-product consistency depends
on versioned packages and contract tests. Single sign-on uses OIDC redirects,
not a shared parent-domain cookie.
