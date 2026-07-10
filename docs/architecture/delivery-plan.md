# Repository evolution and delivery plan

## Repository scope

`iweioo-platform` contains the customer-facing platform only. It does not absorb
the interview, thesis-defense, or internal agent codebases.

Target layout:

```text
apps/
  web/                 Next.js portal, account BFF, blog
  api/                 FastAPI platform modular monolith
  worker/              Outbox, lifecycle, notification jobs
contracts/
  openapi/             Platform HTTP contracts
  events/              Integration event schemas and examples
deploy/
  compose/             Single-server and staging deployment
  migrations/          Deployment coordination, not application SQL
docs/
  architecture/        Architecture source of truth
tests/
  contract/            Cross-runtime contract checks
```

The current Next.js blog remains at the repository root in `v0.1.0`. Moving it
to `apps/web` is a dedicated mechanical PR after workspace tooling and rollback
instructions are ready. The architecture PR does not mix that move with design
or behavior changes.

Separate repositories remain or will be created for:

- `interview-agent`
- `thesis-defense-agent`
- `iweioo-ui`
- `iweioo-sdk`
- `iweioo-agent-platform`
- `iweioo-ops-agent`
- `iweioo-growth-agent`
- `iweioo-content-agent`
- `iweioo-product-agent`

Customer support is initially a platform module. Data analysis and quality
assurance are shared agent capabilities, not independent products.

## Delivery stages

### Stage 0: architecture and governance

- approve architecture decisions and contracts;
- resolve dependency-update PRs;
- add contract validation and architecture review ownership;
- define issue templates, labels, milestones, and release evidence.

Exit: architecture PR merged and no unresolved blocking decision.

### Stage 1: repository and design foundations

- create the platform workspace layout;
- move the existing web application without visual changes;
- create `iweioo-ui` and consume its first version;
- create `iweioo-sdk` contract-generation skeleton;
- add FastAPI and worker application skeletons.

Exit: local and CI builds reproduce the `v0.1.0` site and platform service
health checks.

### Stage 2: identity and account

- add Keycloak development profile and hardened configuration templates;
- implement email/password verification and recovery;
- implement OIDC BFF sessions and global logout;
- create profile, consent, app registry, and account center;
- enforce administrator MFA and private access.

Exit: one verified user can sign in once and enter all staging subdomains
without shared parent-domain cookies.

### Stage 3: credits, usage, and product contracts

- implement append-only ledger, Beta grants, hold, settlement, and release;
- implement pricing versions and budget guardrails;
- build the LLM gateway platform boundary;
- publish SDK clients and contract tests;
- migrate the interview product to OIDC and platform metering.

Exit: interview end-to-end flow has traceable, idempotent usage and no direct
model secret outside the gateway configuration.

### Stage 4: thesis-defense integration and growth profile

- add the unified product-style frontend to the defense subdomain;
- integrate OIDC and strict user ownership;
- integrate file lifecycle, export, and deletion;
- use Qdrant as the production vector path while retaining Milvus adapters;
- emit consented growth observations and account summaries.

Exit: both products pass privacy, isolation, usage, and cross-product overview
tests.

### Stage 5: production operations

- purchase the qualifying Tencent Cloud server and start ICP filing;
- deploy staging with Docker Compose and private management access;
- add off-host backups, external uptime, public status, email and Feishu alerts;
- integrate the DevSecOps Agent with approval boundaries;
- run load, abuse, rollback, restore, and incident exercises.

Exit: RPO/RTO drill evidence, release evidence, and public-Beta readiness gate
all pass.

### Stage 6: public release and growth systems

- enable public verified-email registration and one-time Beta grants;
- monitor real usage, cost, errors, and feedback;
- expand customer support, data analysis, and QA agents;
- build product-manager, growth-operations, and content-production agents;
- add approved manual publishing packages for Douyin and Xiaohongshu.

## Pull request rules

Every stage is delivered through small reviewable PRs. A PR changes one primary
concern, includes migration and rollback notes, and links an approved issue.
Architecture changes update an ADR and machine-readable contract in the same PR.

Merging does not imply production deployment. `main` deploys staging; production
requires release evidence and explicit human approval.
