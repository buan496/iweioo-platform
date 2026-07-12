# Platform contracts

This directory contains machine-readable contracts shared by iweioo products
and generated SDKs.

- `openapi/platform-api.json`: Platform API health, current-user profile, and
  versioned consent HTTP contract.
- `applications/application-manifest.schema.json`: product onboarding manifest schema.
- `applications/interview.json` and `applications/defense.json`: planned product boundaries.
- `events/event-envelope.schema.json`: integration event envelope.
- `events/examples/`: valid sanitized example events.

## Contract rules

- A breaking HTTP change creates a new major URL version.
- A breaking event change creates a new event type version.
- Producers add fields without changing their meaning.
- Consumers ignore unknown fields and deduplicate event IDs.
- Sensitive raw content is forbidden in integration events.
- Generated code never replaces the checked-in source contract.
- Application manifests contain identifiers and public/internal routes, never credentials.
- Checked-in manifests are validated and synchronized into the runtime
  application registry as an explicit release step; missing files never imply
  runtime deletion.
- User endpoints require the dedicated Platform API audience and declared
  scopes; browsers call them through an application BFF rather than holding
  bearer tokens.

The contract tests parse every JSON document and check required architecture
invariants. The TypeScript SDK types are generated from the OpenAPI source with
`npm run generate:sdk` and CI rejects generated drift.
