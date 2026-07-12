from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

AppId = Annotated[str, Field(pattern=r"^[a-z][a-z0-9-]{1,31}$")]
InternalPath = Annotated[str, Field(pattern=r"^/", max_length=200)]


class OidcManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    audience: str = Field(min_length=3, max_length=80)
    redirect_uris: list[AnyHttpUrl] = Field(min_length=1)
    post_logout_redirect_uris: list[AnyHttpUrl] = Field(min_length=1)

    @field_validator("redirect_uris", "post_logout_redirect_uris")
    @classmethod
    def require_unique_https_urls(cls, values: list[AnyHttpUrl]) -> list[AnyHttpUrl]:
        serialized = [str(value) for value in values]
        if len(serialized) != len(set(serialized)):
            raise ValueError("OIDC URI lists must not contain duplicates")
        if any(value.scheme != "https" for value in values):
            raise ValueError("OIDC URIs must use HTTPS")
        if any(
            value.username
            or value.password
            or value.port not in {None, 443}
            or value.query
            or value.fragment
            for value in values
        ):
            raise ValueError("OIDC URIs must not contain credentials, custom ports, or suffixes")
        return values


class BillingManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    billable: bool
    authority: Literal["iweioo-platform-api"]
    service_scopes: list[Literal["usage:write", "events:write"]]

    @field_validator("service_scopes")
    @classmethod
    def require_unique_scopes(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("service scopes must not contain duplicates")
        return values


class PrivacyManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    owned_data_classes: list[
        Annotated[str, Field(pattern=r"^[a-z][a-z0-9_.-]+$")]
    ] = Field(min_length=1)
    lifecycle_callback_path: Annotated[
        str,
        Field(pattern=r"^/internal/", max_length=200),
    ]

    @field_validator("owned_data_classes")
    @classmethod
    def require_unique_data_classes(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("owned data classes must not contain duplicates")
        return values


class ObservabilityManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    health_path: InternalPath
    readiness_path: InternalPath
    metrics_path: InternalPath


class ApplicationManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"]
    app_id: AppId
    display_name: str = Field(min_length=1, max_length=80)
    status: Literal["planned", "staging", "available", "maintenance", "disabled"]
    public_base_url: AnyHttpUrl
    oidc: OidcManifest
    billing: BillingManifest
    privacy: PrivacyManifest
    observability: ObservabilityManifest

    @model_validator(mode="after")
    def require_application_boundaries(self) -> ApplicationManifest:
        expected_host = f"{self.app_id}.iweioo.com"
        if (
            self.public_base_url.scheme != "https"
            or self.public_base_url.host != expected_host
            or self.public_base_url.username
            or self.public_base_url.password
            or self.public_base_url.port not in {None, 443}
            or self.public_base_url.query
            or self.public_base_url.fragment
        ):
            raise ValueError("public_base_url must use the application's iweioo HTTPS subdomain")
        if self.oidc.audience != f"iweioo-{self.app_id}":
            raise ValueError("OIDC audience must match the application ID")
        for uri in [*self.oidc.redirect_uris, *self.oidc.post_logout_redirect_uris]:
            if uri.host != expected_host:
                raise ValueError("OIDC URIs must remain on the application subdomain")
        return self

    @property
    def canonical_payload(self) -> dict[str, Any]:
        return self.model_dump(mode="json")

    @property
    def checksum(self) -> str:
        serialized = json.dumps(
            self.canonical_payload,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()


def load_application_manifests(directory: Path) -> list[ApplicationManifest]:
    resolved = directory.resolve(strict=True)
    if not resolved.is_dir():
        raise ValueError("manifest path must be a directory")

    manifests: list[ApplicationManifest] = []
    app_ids: set[str] = set()
    candidates = sorted(
        path
        for path in resolved.glob("*.json")
        if path.name != "application-manifest.schema.json"
    )
    if not candidates:
        raise ValueError("manifest directory contains no application manifests")

    for path in candidates:
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"manifest must be a regular file: {path.name}")
        raw = path.read_bytes()
        if len(raw) > 65_536:
            raise ValueError(f"manifest exceeds 64 KiB: {path.name}")
        try:
            payload = json.loads(raw, object_pairs_hook=_reject_duplicate_keys)
            manifest = ApplicationManifest.model_validate(payload)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            raise ValueError(f"invalid application manifest: {path.name}") from error
        if manifest.app_id in app_ids:
            raise ValueError(f"duplicate application ID: {manifest.app_id}")
        app_ids.add(manifest.app_id)
        manifests.append(manifest)
    return manifests


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result
