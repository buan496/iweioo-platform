from __future__ import annotations

import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import func, inspect, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from iweioo_api.models import AuditEvent, ConsentEvent, User, UserProfile
from iweioo_api.modules.account.schemas import ConsentUpdate, ProfilePatch
from iweioo_api.modules.account.service import (
    apply_profile_patch,
    ensure_user_projection,
    list_consents,
    set_consent,
)
from iweioo_api.modules.auth.models import IdentityClaims

EXPECTED_TABLES = {
    "alembic_version",
    "audit_events",
    "consent_events",
    "consents",
    "identity_links",
    "user_profiles",
    "users",
}


def test_postgres_migration_created_the_account_schema() -> None:
    database_url = os.environ.get("TEST_POSTGRES_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_POSTGRES_DATABASE_URL is required for the PostgreSQL migration smoke")

    async def table_names() -> set[str]:
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as connection:
                names = await connection.run_sync(lambda sync: set(inspect(sync).get_table_names()))
                return names
        finally:
            await engine.dispose()

    assert EXPECTED_TABLES.issubset(asyncio.run(table_names()))


def test_postgres_account_round_trip() -> None:
    database_url = os.environ.get("TEST_POSTGRES_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_POSTGRES_DATABASE_URL is required for the PostgreSQL account smoke")

    async def round_trip() -> None:
        engine = create_async_engine(database_url)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        user_id = uuid4()
        identity = IdentityClaims(
            sub=user_id,
            iss="https://auth.iweioo.com/realms/iweioo",
            email=f"postgres-{user_id}@example.com",
            email_verified=True,
            azp="iweioo-account",
            scope="openid profile email",
            exp=2_000_000_000,
            iat=1_700_000_000,
            name="PostgreSQL Student",
        )
        try:
            async with sessions.begin() as session:
                user, profile = await ensure_user_projection(session, identity)
                updated = await apply_profile_patch(
                    session,
                    user,
                    profile,
                    ProfilePatch(school="iweioo University", career_goal="Platform engineer"),
                    "postgres-profile-smoke",
                )
                assert updated.school == "iweioo University"
                granted = await set_consent(
                    session,
                    user,
                    "growth_profile",
                    ConsentUpdate(status="granted", policy_version="beta-2026-07-10"),
                    "beta-2026-07-10",
                    "postgres-consent-smoke",
                    "iweioo-account",
                    "postgres-consent-request",
                )
                assert granted.status == "granted"

            async with sessions.begin() as session:
                user = await session.get(User, user_id)
                profile = await session.get(UserProfile, user_id)
                assert user is not None
                assert profile is not None
                assert profile.career_goal == "Platform engineer"
                consents = await list_consents(session, user_id)
                assert [(record.purpose, record.status) for record in consents] == [
                    ("growth_profile", "granted")
                ]
                assert await session.scalar(
                    select(func.count()).select_from(ConsentEvent).where(
                        ConsentEvent.user_id == user_id
                    )
                ) == 1
                assert await session.scalar(
                    select(func.count()).select_from(AuditEvent).where(
                        AuditEvent.actor_user_id == user_id
                    )
                ) == 2
        finally:
            await engine.dispose()

    asyncio.run(round_trip())
