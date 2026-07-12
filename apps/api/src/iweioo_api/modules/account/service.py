from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from iweioo_api.errors import ProblemError
from iweioo_api.models import (
    AuditEvent,
    Consent,
    ConsentEvent,
    IdentityLink,
    User,
    UserProfile,
    utc_now,
)
from iweioo_api.modules.account.schemas import (
    ConsentResponse,
    ConsentUpdate,
    CurrentUserResponse,
    ProfilePatch,
    UserProfileResponse,
)
from iweioo_api.modules.auth.models import IdentityClaims


async def _insert_if_absent(
    session: AsyncSession,
    model: type[Any],
    values: dict[str, Any],
    conflict_columns: list[str],
) -> None:
    dialect = session.get_bind().dialect.name
    if dialect == "postgresql":
        await session.execute(
            postgresql_insert(model).values(**values).on_conflict_do_nothing(
                index_elements=conflict_columns
            )
        )
    elif dialect == "sqlite":
        await session.execute(
            sqlite_insert(model).values(**values).on_conflict_do_nothing(
                index_elements=conflict_columns
            )
        )
    else:
        raise RuntimeError(f"unsupported database dialect: {dialect}")


async def ensure_user_projection(
    session: AsyncSession,
    identity: IdentityClaims,
) -> tuple[User, UserProfile]:
    now = utc_now()
    user_id = identity.platform_user_id
    await _insert_if_absent(
        session,
        User,
        {
            "id": user_id,
            "status": "active",
            "email": str(identity.email),
            "email_verified": True,
            "version": 1,
            "created_at": now,
            "updated_at": now,
        },
        ["id"],
    )
    await _insert_if_absent(
        session,
        IdentityLink,
        {
            "user_id": user_id,
            "issuer": identity.iss,
            "subject": str(identity.sub),
            "created_at": now,
        },
        ["issuer", "subject"],
    )
    await _insert_if_absent(
        session,
        UserProfile,
        {
            "user_id": user_id,
            "display_name": identity.display_name[:80],
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "version": 1,
            "created_at": now,
            "updated_at": now,
        },
        ["user_id"],
    )

    user = await session.get(User, user_id)
    profile = await session.get(UserProfile, user_id)
    if user is None or profile is None:
        raise RuntimeError("user projection could not be loaded after creation")

    if user.email != str(identity.email) or not user.email_verified:
        user.email = str(identity.email)
        user.email_verified = True
        user.version += 1
        user.updated_at = now
    return user, profile


def profile_response(profile: UserProfile) -> UserProfileResponse:
    return UserProfileResponse.model_validate(profile)


def current_user_response(user: User, profile: UserProfile) -> CurrentUserResponse:
    return CurrentUserResponse(
        user_id=user.id,
        status=user.status,  # type: ignore[arg-type]
        email=user.email,
        email_verified=user.email_verified,
        profile=profile_response(profile),
        created_at=_aware(user.created_at),
    )


def consent_response(consent: Consent) -> ConsentResponse:
    return ConsentResponse(
        purpose=consent.purpose,
        status=consent.status,  # type: ignore[arg-type]
        policy_version=consent.policy_version,
        updated_at=_aware(consent.updated_at),
    )


async def apply_profile_patch(
    session: AsyncSession,
    user: User,
    profile: UserProfile,
    patch: ProfilePatch,
    request_id: str,
) -> UserProfileResponse:
    _require_mutable_user(user)
    locked_profile = await session.scalar(
        select(UserProfile).where(UserProfile.user_id == profile.user_id).with_for_update()
    )
    if locked_profile is None:
        raise RuntimeError("user profile disappeared during update")
    changed_fields: list[str] = []
    for field in patch.model_fields_set:
        value = getattr(patch, field)
        if getattr(locked_profile, field) != value:
            setattr(locked_profile, field, value)
            changed_fields.append(field)

    if changed_fields:
        locked_profile.version += 1
        locked_profile.updated_at = utc_now()
        session.add(
            AuditEvent(
                actor_user_id=user.id,
                action="account.profile.updated",
                target_type="user_profile",
                target_reference=str(user.id),
                changed_fields=sorted(changed_fields),
                request_id=request_id,
            )
        )
        await session.flush()
    return profile_response(locked_profile)


async def list_consents(session: AsyncSession, user_id: UUID) -> list[ConsentResponse]:
    records = (
        await session.scalars(
            select(Consent).where(Consent.user_id == user_id).order_by(Consent.purpose)
        )
    ).all()
    return [consent_response(record) for record in records]


async def set_consent(
    session: AsyncSession,
    user: User,
    purpose: str,
    update: ConsentUpdate,
    expected_policy_version: str,
    idempotency_key: str,
    source_application: str,
    request_id: str,
) -> ConsentResponse:
    _require_mutable_user(user)
    if update.policy_version != expected_policy_version:
        raise ProblemError(
            status=409,
            code="consent_policy_changed",
            title="The consent policy version has changed",
        )

    locked_user = await session.scalar(select(User).where(User.id == user.id).with_for_update())
    if locked_user is None:
        raise RuntimeError("user disappeared during consent update")

    prior_event = await session.scalar(
        select(ConsentEvent).where(
            ConsentEvent.user_id == user.id,
            ConsentEvent.idempotency_key == idempotency_key,
        )
    )
    if prior_event is not None:
        if (
            prior_event.purpose != purpose
            or prior_event.status != update.status
            or prior_event.policy_version != update.policy_version
        ):
            raise ProblemError(
                status=409,
                code="idempotency_conflict",
                title="The idempotency key was already used for another consent command",
            )
        return ConsentResponse(
            purpose=prior_event.purpose,
            status=prior_event.status,
            policy_version=prior_event.policy_version,
            updated_at=_aware(prior_event.occurred_at),
        )

    now = utc_now()
    current = await session.get(Consent, (user.id, purpose))
    if current is None:
        current = Consent(
            user_id=user.id,
            purpose=purpose,
            status=update.status,
            policy_version=update.policy_version,
            version=1,
            updated_at=now,
        )
        session.add(current)
    else:
        current.status = update.status
        current.policy_version = update.policy_version
        current.version += 1
        current.updated_at = now

    session.add_all(
        [
            ConsentEvent(
                user_id=user.id,
                purpose=purpose,
                status=update.status,
                policy_version=update.policy_version,
                source_application=source_application,
                idempotency_key=idempotency_key,
                occurred_at=now,
            ),
            AuditEvent(
                actor_user_id=user.id,
                action=f"account.consent.{update.status}",
                target_type="consent",
                target_reference=purpose,
                changed_fields=["policy_version", "status"],
                request_id=request_id,
                occurred_at=now,
            ),
        ]
    )
    await session.flush()
    return consent_response(current)


def _require_mutable_user(user: User) -> None:
    if user.status != "active":
        raise ProblemError(
            status=403,
            code="account_not_mutable",
            title="The account cannot currently be changed",
        )


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
