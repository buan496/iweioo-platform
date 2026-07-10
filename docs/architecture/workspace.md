# Platform workspace foundation

## Purpose

The repository workspace separates deployable processes from shared build-time
packages while preserving the federated-product decision. It is a modular
monorepo for the customer-facing platform, not a monorepo for every iweioo
product or agent.

## Ownership map

| Path | Owner and responsibility | Deployment boundary |
| --- | --- | --- |
| `apps/web` | Portal, content, future account BFF | `iweioo.com` |
| `apps/api` | Platform profile, consent, credits, usage, and lifecycle modules | private `platform-api` service |
| `apps/worker` | Outbox, lifecycle, and notification jobs | private worker process |
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
7. `packages/ui` and `packages/sdk` are incubation locations. They can be
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

## Migration and rollback

The Web move is mechanical: the former root application now lives under
`apps/web`, and root npm scripts delegate to that workspace. No content URL is
changed. Static output moves from `out/` to `apps/web/out/`.

Before merge, rollback is deleting the feature branch. After merge, a rollback
reverts the workspace PR as one unit; do not manually copy generated or build
output back to the repository root. No persistent data migration is involved.
