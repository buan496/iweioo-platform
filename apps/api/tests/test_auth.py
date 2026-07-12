from __future__ import annotations

import asyncio
import time
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from iweioo_api.config import Settings
from iweioo_api.main import create_app
from iweioo_api.modules.auth.jwks import JwksCache, TokenValidationError, TokenVerifier


class StaticKeyProvider:
    def __init__(self, key: jwt.PyJWK) -> None:
        self.key = key

    async def get_key(self, key_id: str) -> jwt.PyJWK:
        if key_id != "test-key":
            raise TokenValidationError("unknown key")
        return self.key


def test_account_endpoint_requires_bearer_auth_before_runtime_configuration() -> None:
    response = TestClient(create_app()).get("/v1/users/me")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["code"] == "authentication_required"


def settings() -> Settings:
    return Settings(
        environment="test",
        database_url="sqlite+aiosqlite:///:memory:",
        oidc_issuer="http://localhost:8080/realms/iweioo",
        oidc_audience="iweioo-platform-api",
        oidc_allowed_azp="iweioo-account",
    )


def signed_token(**overrides: Any) -> tuple[str, jwt.PyJWK]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    public_jwk.update({"kid": "test-key", "alg": "RS256", "use": "sig"})
    now = int(time.time())
    claims: dict[str, Any] = {
        "sub": "11111111-1111-4111-8111-111111111111",
        "iss": "http://localhost:8080/realms/iweioo",
        "aud": ["iweioo-account", "iweioo-platform-api"],
        "azp": "iweioo-account",
        "email": "student@example.com",
        "email_verified": True,
        "scope": "openid profile email",
        "iat": now,
        "exp": now + 300,
    }
    claims.update(overrides)
    token = jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": "test-key"})
    return token, jwt.PyJWK.from_dict(public_jwk, algorithm="RS256")


def test_token_verifier_accepts_only_the_platform_audience_and_verified_subject() -> None:
    token, key = signed_token()
    claims = asyncio.run(TokenVerifier(settings(), StaticKeyProvider(key)).verify(token))
    assert str(claims.platform_user_id) == "11111111-1111-4111-8111-111111111111"
    assert claims.email_verified is True


@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "iweioo-account"},
        {"azp": "iweioo-portal"},
        {"email_verified": False},
        {"scope": "openid profile"},
        {"sub": "not-a-uuid"},
    ],
)
def test_token_verifier_rejects_invalid_identity_boundaries(overrides: dict[str, Any]) -> None:
    token, key = signed_token(**overrides)
    with pytest.raises(TokenValidationError):
        asyncio.run(TokenVerifier(settings(), StaticKeyProvider(key)).verify(token))


def test_token_verifier_rejects_non_rs256_tokens_before_key_lookup() -> None:
    token = jwt.encode(
        {"sub": "11111111-1111-4111-8111-111111111111"},
        "test-secret-with-at-least-32-bytes",
        algorithm="HS256",
        headers={"kid": "test-key"},
    )
    _, key = signed_token()
    with pytest.raises(TokenValidationError):
        asyncio.run(TokenVerifier(settings(), StaticKeyProvider(key)).verify(token))


def test_jwks_cache_throttles_repeated_unknown_key_refreshes() -> None:
    _, key = signed_token()

    class CountingJwksCache(JwksCache):
        def __init__(self) -> None:
            super().__init__(settings())
            self.refreshes = 0

        async def _refresh(self) -> None:
            self.refreshes += 1
            now = time.monotonic()
            self._keys = {"test-key": key}
            self._expires_at = now + 600
            self._next_unknown_kid_refresh_at = now + 30

    cache = CountingJwksCache()
    for _ in range(2):
        with pytest.raises(TokenValidationError):
            asyncio.run(cache.get_key("attacker-controlled-kid"))
    assert cache.refreshes == 1
