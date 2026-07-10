# Platform workspace foundation

## Purpose

The repository workspace separates deployable processes from shared build-time
packages while preserving the federated-product decision. It is a modular
monorepo for the customer-facing platform, not a monorepo for every iweioo
product or agent.

## Ownership map

| Path | Owner and responsibility | Deployment boundary |
| --- | --- | --- |
| `apps/web` | Portal, public content, and portal-local OIDC routes | `iweioo.com` |
| `apps/account` | Account center and its host-local OIDC routes | `account.iweioo.com` |
| `apps/api` | Platform profile, consent, credits, usage, and lifecycle modules | private `platform-api` service |
| `apps/worker` | Outbox, lifecycle, and notification jobs | private worker process |
| `packages/auth-bff` | Reusable server-only OIDC BFF handlers and safe session contract | build-time package |
| `packages/ui` | Incubating brand primitives shared by platform surfaces | build-time package |
| `packages/sdk` | Generated contract types and integration helpers | build-time package |
| `contracts/applications` | Product identity, billing, privacy, and observability declarations | source contract |

The interview and defense source repositories remain independent. Their Stage
1 representation here is a strict onboarding manifest and a portal catalog
entry, not a placeholder implementation or runtime proxy.

Application manifests store stable internal callback paths only. Each
environment's private service registry owns the corresponding base URL, so
container hostnames and ports do not leak into portable product contracts.

## Workspace rules

1. Root scripts are the stable developer and CI entrypoints.
2. Builds are deterministic and do not update tracked inputs from remote APIs.
   Repository metadata sync is an explicit, reviewable operation.
3. Each deployable owns its runtime dependencies and tests.
4. The OpenAPI document is authoritative; generated SDK output is checked in
   and CI verifies reproducibility.
5. Shared packages cannot import from an application.
6. Applications may consume packages, but may not reach into another
   application's source tree.
7. `packages/auth-bff` is server-only. Applications may delegate route
   handlers to it, but browser components may import only its token-free public
   session validator and types.
8. `packages/ui` and `packages/sdk` are incubation locations. They can be
   published or extracted into the approved standalone repositories after
   their contracts stabilize.

## Stage 1 behavior

The Web application adds a truthful product catalog while retaining the blog,
about, and open-source project pages. Planned subdomains do not receive active
portal links until their manifest status becomes `available` after release
gates pass.

The API implements only contract-aligned liveness and readiness. The worker
implements process lifecycle and a one-shot health probe. Identity, credit,
usage, database, and queue behavior are intentionally deferred rather than
represented by unsafe in-memory substitutes.

## Current Stage 2 behavior

The portal and account center are separate Next.js processes. Both delegate
their authorization-code, callback, session, and logout routes to
`packages/auth-bff`, while retaining separate OIDC clients, Redis namespaces,
and host-only cookies. Local development cookie names are app-scoped because
browser cookies do not distinguish ports. Production uses identical `__Host-`
names safely because `iweioo.com` and `account.iweioo.com` are separate hosts.

The account center currently presents verified identity, current-session, and
explicit profile/consent readiness states. Profile and consent mutations stay
disabled until the Platform API and PostgreSQL ownership model are implemented;
the UI does not simulate durable writes in browser storage.

## Migration and rollback

The original Web move was mechanical: the former root application now lives
under `apps/web`. Root npm scripts now build both portal and account workspaces.
No existing content URL is changed. Each Next.js Node build is written to its
own `.next/` directory; public routes remain prerendered while OIDC BFF routes
execute on demand.

Before merge, rollback is deleting the feature branch. After merge, a rollback
reverts the workspace PR as one unit; do not manually copy generated or build
output back to the repository root. No persistent data migration is involved.
