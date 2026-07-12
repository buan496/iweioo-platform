from __future__ import annotations

import asyncio
import time
from typing import Any, Protocol

import httpx2
import jwt
from pydantic import BaseModel, ConfigDict

from iweioo_api.config import Settings
from iweioo_api.modules.auth.models import IdentityClaims


class TokenValidationError(Exception):
    pass


class SigningKeyProvider(Protocol):
    async def get_key(self, key_id: str) -> jwt.PyJWK: ...


class JwksDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")

    keys: list[dict[str, Any]]


class JwksCache:
    _unknown_kid_refresh_interval_seconds = 30

    def __init__(self, settings: Settings) -> None:
        self._url = settings.jwks_url
        self._ttl_seconds = settings.jwks_cache_seconds
        self._keys: dict[str, jwt.PyJWK] = {}
        self._expires_at = 0.0
        self._next_unknown_kid_refresh_at = 0.0
        self._lock = asyncio.Lock()

    async def get_key(self, key_id: str) -> jwt.PyJWK:
        now = time.monotonic()
        if self._refresh_required(key_id, now):
            async with self._lock:
                if self._refresh_required(key_id, time.monotonic()):
                    await self._refresh()
        key = self._keys.get(key_id)
        if key is None:
            raise TokenValidationError("token signing key is not registered")
        return key

    def _refresh_required(self, key_id: str, now: float) -> bool:
        return (
            not self._keys
            or now >= self._expires_at
            or (key_id not in self._keys and now >= self._next_unknown_kid_refresh_at)
        )

    async def _refresh(self) -> None:
        try:
            async with httpx2.AsyncClient(
                follow_redirects=False,
                timeout=httpx2.Timeout(5.0),
                trust_env=False,
            ) as client:
                response = await client.get(
                    self._url,
                    headers={"Accept": "application/json"},
                )
            response.raise_for_status()
            if len(response.content) > 1_048_576:
                raise TokenValidationError("JWKS document exceeds the size limit")
            document = JwksDocument.model_validate(response.json())
        except TokenValidationError:
            raise
        except Exception as error:
            raise TokenValidationError("unable to load token signing keys") from error

        keys: dict[str, jwt.PyJWK] = {}
        for raw_key in document.keys:
            key_id = raw_key.get("kid")
            if (
                not isinstance(key_id, str)
                or not key_id
                or raw_key.get("kty") != "RSA"
                or raw_key.get("alg") not in {None, "RS256"}
                or raw_key.get("use") not in {None, "sig"}
            ):
                continue
            try:
                keys[key_id] = jwt.PyJWK.from_dict(raw_key, algorithm="RS256")
            except jwt.PyJWTError:
                continue
        if not keys:
            raise TokenValidationError("JWKS document contains no usable RS256 keys")
        self._keys = keys
        now = time.monotonic()
        self._expires_at = now + self._ttl_seconds
        self._next_unknown_kid_refresh_at = (
            now + self._unknown_kid_refresh_interval_seconds
        )


class TokenVerifier:
    _required_scopes = frozenset({"openid", "profile", "email"})

    def __init__(self, settings: Settings, keys: SigningKeyProvider) -> None:
        self._settings = settings
        self._keys = keys

    async def verify(self, token: str) -> IdentityClaims:
        if not token or len(token) > 16_384:
            raise TokenValidationError("token length is invalid")
        try:
            header = jwt.get_unverified_header(token)
            key_id = header.get("kid")
            if header.get("alg") != "RS256" or not isinstance(key_id, str) or not key_id:
                raise TokenValidationError("token header is not allowed")
            key = await self._keys.get_key(key_id)
            payload = jwt.decode(
                token,
                key=key,
                algorithms=["RS256"],
                audience=self._settings.oidc_audience,
                issuer=self._settings.oidc_issuer,
                leeway=10,
                options={
                    "require": [
                        "aud",
                        "azp",
                        "email",
                        "email_verified",
                        "exp",
                        "iat",
                        "iss",
                        "scope",
                        "sub",
                    ],
                    "verify_signature": True,
                    "verify_aud": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_iss": True,
                    "verify_nbf": True,
                    "verify_sub": True,
                },
            )
            claims = IdentityClaims.model_validate(payload)
        except TokenValidationError:
            raise
        except (jwt.PyJWTError, ValueError) as error:
            raise TokenValidationError("token validation failed") from error

        if claims.azp != self._settings.oidc_allowed_azp:
            raise TokenValidationError("authorized party is not allowed")
        if not self._required_scopes.issubset(claims.scopes):
            raise TokenValidationError("token is missing required scopes")
        if claims.iss != self._settings.oidc_issuer:
            raise TokenValidationError("token issuer does not match")
        return claims
