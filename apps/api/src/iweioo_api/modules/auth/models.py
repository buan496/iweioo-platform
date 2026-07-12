from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class IdentityClaims(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    sub: UUID
    iss: str
    email: EmailStr
    email_verified: Literal[True]
    azp: str
    scope: str
    exp: int
    iat: int
    name: str | None = Field(default=None, max_length=200)
    preferred_username: str | None = Field(default=None, max_length=320)

    @property
    def platform_user_id(self) -> UUID:
        return self.sub

    @property
    def display_name(self) -> str:
        for candidate in (self.name, self.preferred_username, str(self.email)):
            if candidate and candidate.strip():
                return candidate.strip()
        return str(self.email)

    @property
    def scopes(self) -> frozenset[str]:
        return frozenset(self.scope.split())
