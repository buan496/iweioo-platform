# Platform contracts

This directory contains machine-readable contracts shared by iweioo products
and generated SDKs.

- `openapi/platform-api.json`: platform user and service HTTP contract.
- `events/event-envelope.schema.json`: integration event envelope.
- `events/examples/`: valid sanitized example events.

## Contract rules

- A breaking HTTP change creates a new major URL version.
- A breaking event change creates a new event type version.
- Producers add fields without changing their meaning.
- Consumers ignore unknown fields and deduplicate event IDs.
- Sensitive raw content is forbidden in integration events.
- Generated code never replaces the checked-in source contract.

The contract tests parse every JSON document and check required architecture
invariants. Semantic OpenAPI and JSON Schema linting will be added with the SDK
generation toolchain.
