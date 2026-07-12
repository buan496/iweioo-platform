from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    display_name: str = Field(min_length=1, max_length=80)
    locale: Literal["zh-CN", "en"]
    timezone: str = Field(max_length=64)
    school: str | None = Field(default=None, max_length=120)
    major: str | None = Field(default=None, max_length=120)
    graduation_year: int | None = Field(default=None, ge=2000, le=2200)
    career_goal: str | None = Field(default=None, max_length=200)


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    status: Literal["active", "restricted", "deletion_pending"]
    email: EmailStr
    email_verified: bool
    profile: UserProfileResponse
    created_at: datetime


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    locale: Literal["zh-CN", "en"] | None = None
    timezone: str | None = Field(default=None, max_length=64)
    school: str | None = Field(default=None, max_length=120)
    major: str | None = Field(default=None, max_length=120)
    graduation_year: int | None = Field(default=None, ge=2000, le=2200)
    career_goal: str | None = Field(default=None, max_length=200)

    @model_validator(mode="before")
    @classmethod
    def reject_null_required_fields(cls, value: Any) -> Any:
        if isinstance(value, dict):
            for field in ("display_name", "locale", "timezone"):
                if field in value and value[field] is None:
                    raise ValueError(f"{field} cannot be null")
        return value

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> ProfilePatch:
        if not self.model_fields_set:
            raise ValueError("profile patch must contain at least one field")
        return self

    @field_validator("display_name", "timezone")
    @classmethod
    def normalize_required_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("value cannot be blank")
        return normalized

    @field_validator("school", "major", "career_goal")
    @classmethod
    def normalize_optional_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("timezone")
    @classmethod
    def require_known_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise ValueError("timezone must be a recognized IANA timezone") from error
        return value


class ConsentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    purpose: str = Field(max_length=64)
    status: Literal["granted", "revoked"]
    policy_version: str = Field(max_length=40)
    updated_at: datetime


class ConsentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["granted", "revoked"]
    policy_version: str = Field(min_length=1, max_length=40)

    @field_validator("policy_version")
    @classmethod
    def normalize_policy_version(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("policy_version cannot be blank")
        return normalized
