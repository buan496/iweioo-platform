from __future__ import annotations

import pytest
from pydantic import ValidationError

from iweioo_api.config import Settings


def test_production_requires_postgresql_and_https_identity() -> None:
    with pytest.raises(ValidationError, match=r"postgresql\+asyncpg"):
        Settings(
            environment="production",
            database_url="sqlite+aiosqlite:///:memory:",
            oidc_issuer="https://auth.iweioo.com/realms/iweioo",
        )

    with pytest.raises(ValidationError, match="HTTPS"):
        Settings(
            environment="production",
            database_url=(
                "postgresql+asyncpg://iweioo_platform:password@db.internal/iweioo_platform"
            ),
            oidc_issuer="http://auth.iweioo.com/realms/iweioo",
        )


def test_development_allows_only_loopback_http_identity() -> None:
    settings = Settings(
        environment="development",
        database_url=(
            "postgresql+asyncpg://iweioo_platform:password@127.0.0.1:5433/iweioo_platform"
        ),
        oidc_issuer="http://localhost:8080/realms/iweioo/",
    )
    assert settings.oidc_issuer == "http://localhost:8080/realms/iweioo"
    assert settings.jwks_url.endswith("/protocol/openid-connect/certs")
