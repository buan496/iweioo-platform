# ADR 0006: Stage TypeScript 7 by workspace

- Status: Accepted
- Date: 2026-07-10

## Context

TypeScript 7 replaces the JavaScript compiler with a native implementation and
does not expose the legacy stable programmatic API. The portal, account,
authentication, and UI workspaces use the compiler through its command-line
interface, while Next.js and the SDK generation tool import the TypeScript API.

An all-workspace upgrade proved that the web and UI lint, typecheck, and tests
can run on TypeScript 7 after removing obsolete compiler options. SDK generation
failed because `openapi-typescript@7.13.0` requires TypeScript 5 and calls the
legacy factory API. A direct TypeScript 7 package in the web workspace also
caused the Next.js production build to attempt to reinstall TypeScript because
the expected API was unavailable.

## Decision

- `@iweioo/web` and `@iweioo/account` use the TypeScript 7 CLI through the
  `typescript-7` npm alias and expose the official TypeScript 6 compatibility
  package as `typescript` for Next.js and other API consumers. Their typecheck
  scripts use the repository runner, which resolves the aliased compiler
  explicitly instead of relying on the shared `.bin/tsc` path.
- `@iweioo/auth-bff` uses TypeScript 7 directly because it does not invoke the
  Next.js compiler API.
- `@iweioo/ui` uses TypeScript 7 directly.
- `@iweioo/sdk` keeps TypeScript `5.9.3` pinned exactly until its generator
  supports TypeScript 7.
- Compiler versions remain owned by each workspace. Do not use a root override
  to force one TypeScript version across the monorepo.
- The lock file must resolve TypeScript 5 inside the SDK workspace, the
  TypeScript 6 compatibility API and TypeScript 7 CLI inside both Next.js
  applications, and TypeScript 7 inside Auth BFF and UI.
- CI must typecheck every workspace, regenerate the SDK without a diff, and run
  both production Next.js builds before merge.

## Consequences

The repository intentionally carries multiple TypeScript packages during the
transition. Dependency updates and debugging must identify the affected
workspace and execution path instead of assuming a single repository-wide
compiler. The contract suite guards this boundary.

The SDK can move to TypeScript 7 when its generator declares compatible peer
support, generation succeeds without changes, and the full CI chain passes.
The Web compatibility package can be removed when Next.js and its lint/type
tooling no longer import the legacy API. A new ADR will supersede this decision
when the repository can return to a single compiler package.
