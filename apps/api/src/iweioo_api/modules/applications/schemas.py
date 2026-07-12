from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


class ApplicationSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_id: str = Field(pattern=r"^[a-z][a-z0-9-]{1,31}$")
    name: str = Field(min_length=1, max_length=80)
    url: AnyHttpUrl
    availability: Literal["planned", "staging", "available", "maintenance"]
    user_state: Literal["not_started", "active", "archived"]
    first_used_at: datetime | None = None
    last_used_at: datetime | None = None
