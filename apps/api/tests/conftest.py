from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from iweioo_api.config import Settings, get_settings
from iweioo_api.database import get_session
from iweioo_api.main import create_app
from iweioo_api.models import Base
from iweioo_api.modules.auth.dependencies import get_current_identity
from iweioo_api.modules.auth.models import IdentityClaims


def identity(user_id: str, email: str, name: str) -> IdentityClaims:
    return IdentityClaims(
        sub=UUID(user_id),
        iss="http://localhost:8080/realms/iweioo",
        email=email,
        email_verified=True,
        azp="iweioo-account",
        scope="openid profile email",
        exp=2_000_000_000,
        iat=1_900_000_000,
        name=name,
    )


IDENTITY_A = identity(
    "11111111-1111-4111-8111-111111111111",
    "student-a@example.com",
    "Student A",
)
IDENTITY_B = identity(
    "22222222-2222-4222-8222-222222222222",
    "student-b@example.com",
    "Student B",
)


@dataclass
class ApiHarness:
    app: FastAPI
    client: TestClient
    sessions: async_sessionmaker[AsyncSession]
    active_identity: dict[str, IdentityClaims]

    def use_identity(self, value: IdentityClaims) -> None:
        self.active_identity["value"] = value

    def scalar(self, statement: Any) -> Any:
        async def execute() -> Any:
            async with self.sessions() as session:
                return await session.scalar(statement)

        return asyncio.run(execute())


@pytest.fixture
def api_harness(tmp_path: Path) -> Iterator[ApiHarness]:
    database_path = (tmp_path / "platform-test.sqlite3").as_posix()
    database_url = f"sqlite+aiosqlite:///{database_path}"
    engine = create_async_engine(database_url, poolclass=NullPool)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def create_schema() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(create_schema())
    settings = Settings(
        environment="test",
        database_url=database_url,
        oidc_issuer="http://localhost:8080/realms/iweioo",
        oidc_audience="iweioo-platform-api",
        oidc_allowed_azp="iweioo-account",
    )
    active_identity = {"value": IDENTITY_A}

    async def override_session() -> AsyncIterator[AsyncSession]:
        async with sessions() as session:
            yield session

    async def override_identity() -> IdentityClaims:
        return active_identity["value"]

    def override_settings() -> Settings:
        return settings

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_current_identity] = override_identity
    application.dependency_overrides[get_settings] = override_settings
    with TestClient(application) as client:
        yield ApiHarness(application, client, sessions, active_identity)

    async def cleanup() -> None:
        await engine.dispose()

    asyncio.run(cleanup())
