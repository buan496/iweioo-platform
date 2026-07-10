# Compose launch profile

The first real profile will follow ADR 0005 and expose only the edge proxy on
ports 80 and 443. Keycloak administration, databases, Redis, Qdrant,
observability, platform services, product APIs, and agents stay private.

The Compose file is intentionally deferred until Stage 2 can include identity
and secret boundaries. A partial file here would look deployable while omitting
required security controls.
