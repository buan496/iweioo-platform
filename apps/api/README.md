# iweioo platform API

This is the FastAPI modular-monolith skeleton. Stage 1 implements only the
versioned liveness and readiness endpoints from the checked-in OpenAPI
contract. Identity, credits, usage, and lifecycle modules are intentionally not
stubbed with fake business behavior.

```bash
python -m pip install -e ".[dev]"
iweioo-api
```
