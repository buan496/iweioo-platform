from __future__ import annotations

from functools import lru_cache
from typing import Literal
from urllib.parse import ParseResult, urlparse

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
        populate_by_name=True,
    )

    environment: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias="IWEIOO_ENVIRONMENT",
    )
    database_url: str = Field(validation_alias="PLATFORM_DATABASE_URL")
    oidc_issuer: str = Field(validation_alias="PLATFORM_OIDC_ISSUER")
    oidc_audience: str = Field(
        default="iweioo-platform-api",
        validation_alias="PLATFORM_OIDC_AUDIENCE",
    )
    oidc_allowed_azp: str = Field(
        default="iweioo-account",
        validation_alias="PLATFORM_OIDC_ALLOWED_AZP",
    )
    oidc_jwks_url: str | None = Field(
        default=None,
        validation_alias="PLATFORM_OIDC_JWKS_URL",
    )
    jwks_cache_seconds: int = Field(
        default=600,
        ge=60,
        le=3600,
        validation_alias="PLATFORM_JWKS_CACHE_SECONDS",
    )
    consent_policy_growth_profile: str = Field(
        default="beta-2026-07-10",
        validation_alias="CONSENT_POLICY_GROWTH_PROFILE",
    )
    consent_policy_agent_memory: str = Field(
        default="beta-2026-07-10",
        validation_alias="CONSENT_POLICY_AGENT_MEMORY",
    )

    @model_validator(mode="after")
    def validate_runtime_boundaries(self) -> Settings:
        database = make_url(self.database_url)
        if self.environment == "test":
            if database.drivername not in {"sqlite+aiosqlite", "postgresql+asyncpg"}:
                raise ValueError("test database must use sqlite+aiosqlite or postgresql+asyncpg")
        elif database.drivername != "postgresql+asyncpg":
            raise ValueError("Platform API requires postgresql+asyncpg outside tests")

        issuer = self._validate_service_url(self.oidc_issuer, "PLATFORM_OIDC_ISSUER")
        if issuer.path in {"", "/"}:
            raise ValueError("PLATFORM_OIDC_ISSUER must include the realm path")
        self.oidc_issuer = self.oidc_issuer.rstrip("/")

        if self.oidc_jwks_url is not None:
            self._validate_service_url(self.oidc_jwks_url, "PLATFORM_OIDC_JWKS_URL")

        for value, name in (
            (self.oidc_audience, "PLATFORM_OIDC_AUDIENCE"),
            (self.oidc_allowed_azp, "PLATFORM_OIDC_ALLOWED_AZP"),
        ):
            if not value or len(value) > 128:
                raise ValueError(f"{name} must contain 1 to 128 characters")

        for value, name in (
            (self.consent_policy_growth_profile, "CONSENT_POLICY_GROWTH_PROFILE"),
            (self.consent_policy_agent_memory, "CONSENT_POLICY_AGENT_MEMORY"),
        ):
            if not value or len(value) > 40:
                raise ValueError(f"{name} must contain 1 to 40 characters")
        return self

    def _validate_service_url(self, value: str, name: str) -> ParseResult:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError(f"{name} must be an absolute HTTP(S) URL")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError(f"{name} must not include credentials, query, or fragment")
        loopback = parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        if parsed.scheme != "https" and not (self.environment != "production" and loopback):
            raise ValueError(f"{name} must use HTTPS except on non-production loopback")
        return parsed

    @property
    def jwks_url(self) -> str:
        return self.oidc_jwks_url or f"{self.oidc_issuer}/protocol/openid-connect/certs"

    @property
    def consent_policies(self) -> dict[str, str]:
        return {
            "growth_profile": self.consent_policy_growth_profile,
            "agent_memory": self.consent_policy_agent_memory,
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
