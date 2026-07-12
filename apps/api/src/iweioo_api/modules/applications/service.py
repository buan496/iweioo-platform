from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from iweioo_api.models import ApplicationRegistration, UserApplicationState, utc_now
from iweioo_api.modules.applications.manifest import ApplicationManifest
from iweioo_api.modules.applications.schemas import ApplicationSummary


@dataclass(frozen=True, slots=True)
class ManifestSyncResult:
    created: int
    unchanged: int
    updated: int


async def sync_application_manifests(
    session: AsyncSession,
    manifests: list[ApplicationManifest],
) -> ManifestSyncResult:
    if session.get_bind().dialect.name == "postgresql":
        await session.execute(
            text("SELECT pg_advisory_xact_lock(45494745494)")
        )
    created = 0
    unchanged = 0
    updated = 0
    now = utc_now()
    for manifest in manifests:
        registration = await session.scalar(
            select(ApplicationRegistration)
            .where(ApplicationRegistration.app_id == manifest.app_id)
            .with_for_update()
        )
        values = {
            "display_name": manifest.display_name,
            "status": manifest.status,
            "public_base_url": str(manifest.public_base_url),
            "manifest_schema_version": manifest.schema_version,
            "manifest_checksum": manifest.checksum,
            "manifest_payload": manifest.canonical_payload,
        }
        if registration is None:
            session.add(
                ApplicationRegistration(
                    app_id=manifest.app_id,
                    **values,
                    version=1,
                    created_at=now,
                    updated_at=now,
                )
            )
            created += 1
        elif registration.manifest_checksum == manifest.checksum:
            unchanged += 1
        else:
            for field, value in values.items():
                setattr(registration, field, value)
            registration.version += 1
            registration.updated_at = now
            updated += 1
    await session.flush()
    return ManifestSyncResult(created=created, unchanged=unchanged, updated=updated)


async def list_user_applications(
    session: AsyncSession,
    user_id: UUID,
) -> list[ApplicationSummary]:
    records = (
        await session.execute(
            select(ApplicationRegistration, UserApplicationState)
            .outerjoin(
                UserApplicationState,
                (UserApplicationState.app_id == ApplicationRegistration.app_id)
                & (UserApplicationState.user_id == user_id),
            )
            .where(ApplicationRegistration.status != "disabled")
            .order_by(ApplicationRegistration.app_id)
        )
    ).all()
    return [
        ApplicationSummary(
            app_id=registration.app_id,
            name=registration.display_name,
            url=registration.public_base_url,
            availability=registration.status,
            user_state=state.state if state is not None else "not_started",
            first_used_at=_aware(state.first_used_at) if state is not None else None,
            last_used_at=_aware(state.last_used_at) if state is not None else None,
        )
        for registration, state in records
    ]


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
