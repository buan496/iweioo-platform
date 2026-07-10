# iweioo platform worker

This process owns asynchronous platform work such as outbox relay, privacy
lifecycle jobs, and notifications. Stage 1 supplies process lifecycle and
health behavior only; no queue or database is selected by fake defaults.

Use `iweioo-worker --healthcheck` for a one-shot process health probe.
