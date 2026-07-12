from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from conftest import IDENTITY_A, IDENTITY_B, ApiHarness
from sqlalchemy import func, select

from iweioo_api.models import (
    ApplicationRegistration,
    UserApplicationState,
    utc_now,
)
from iweioo_api.modules.applications.manifest import load_application_manifests
from iweioo_api.modules.applications.service import sync_application_manifests


def test_manifest_sync_is_validated_deterministic_and_idempotent(
    api_harness: ApiHarness,
) -> None:
    manifests = load_application_manifests(Path("contracts/applications"))
    assert [manifest.app_id for manifest in manifests] == ["defense", "interview"]
    assert all(len(manifest.checksum) == 64 for manifest in manifests)

    async def synchronize() -> tuple[object, object, object]:
        async with api_harness.sessions.begin() as session:
            first = await sync_application_manifests(session, manifests)
        async with api_harness.sessions.begin() as session:
            second = await sync_application_manifests(session, manifests)
        changed = manifests[0].model_copy(update={"status": "staging"})
        async with api_harness.sessions.begin() as session:
            third = await sync_application_manifests(session, [changed, *manifests[1:]])
        return first, second, third

    first, second, third = asyncio.run(synchronize())
    assert (first.created, first.updated, first.unchanged) == (2, 0, 0)
    assert (second.created, second.updated, second.unchanged) == (0, 0, 2)
    assert (third.created, third.updated, third.unchanged) == (0, 1, 1)
    assert api_harness.scalar(select(func.count()).select_from(ApplicationRegistration)) == 2
    changed_registration = api_harness.scalar(
        select(ApplicationRegistration).where(ApplicationRegistration.app_id == "defense")
    )
    assert changed_registration.status == "staging"
    assert changed_registration.version == 2


def test_manifest_loader_rejects_duplicate_json_keys(tmp_path: Path) -> None:
    (tmp_path / "invalid.json").write_text(
        '{"schema_version":"1.0","app_id":"one","app_id":"two"}',
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="invalid application manifest"):
        load_application_manifests(tmp_path)


def test_manifest_loader_rejects_unsafe_product_urls(tmp_path: Path) -> None:
    source = Path("contracts/applications/interview.json").read_text(encoding="utf-8")
    (tmp_path / "interview.json").write_text(
        source.replace(
            "https://interview.iweioo.com\"",
            "https://interview.iweioo.com:444\"",
            1,
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="invalid application manifest"):
        load_application_manifests(tmp_path)


def test_manifest_loader_rejects_duplicate_application_ids(tmp_path: Path) -> None:
    source = Path("contracts/applications/interview.json").read_text(encoding="utf-8")
    (tmp_path / "one.json").write_text(source, encoding="utf-8")
    (tmp_path / "two.json").write_text(source, encoding="utf-8")
    with pytest.raises(ValueError, match="duplicate application ID: interview"):
        load_application_manifests(tmp_path)


def test_application_list_is_truthful_hidden_and_subject_isolated(
    api_harness: ApiHarness,
) -> None:
    manifests = load_application_manifests(Path("contracts/applications"))

    async def seed_registry() -> None:
        async with api_harness.sessions.begin() as session:
            await sync_application_manifests(session, manifests)
            defense = await session.get(ApplicationRegistration, "defense")
            interview = await session.get(ApplicationRegistration, "interview")
            assert defense is not None
            assert interview is not None
            defense.status = "disabled"
            interview.status = "available"

    asyncio.run(seed_registry())
    initial = api_harness.client.get("/v1/users/me/applications")
    assert initial.status_code == 200
    assert initial.json() == [
        {
            "app_id": "interview",
            "name": "iweioo Interview",
            "url": "https://interview.iweioo.com/",
            "availability": "available",
            "user_state": "not_started",
            "first_used_at": None,
            "last_used_at": None,
        }
    ]

    now = utc_now()

    async def activate_for_first_user() -> None:
        async with api_harness.sessions.begin() as session:
            session.add(
                UserApplicationState(
                    user_id=IDENTITY_A.platform_user_id,
                    app_id="interview",
                    state="active",
                    first_used_at=now,
                    last_used_at=now,
                )
            )

    asyncio.run(activate_for_first_user())
    active = api_harness.client.get("/v1/users/me/applications").json()
    assert active[0]["user_state"] == "active"
    assert active[0]["first_used_at"] is not None

    api_harness.use_identity(IDENTITY_B)
    isolated = api_harness.client.get("/v1/users/me/applications").json()
    assert isolated[0]["user_state"] == "not_started"
