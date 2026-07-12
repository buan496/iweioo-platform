from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Path, Request
from sqlalchemy.ext.asyncio import AsyncSession

from iweioo_api.config import Settings, get_settings
from iweioo_api.database import get_session
from iweioo_api.errors import ProblemError
from iweioo_api.modules.account.schemas import (
    ConsentResponse,
    ConsentUpdate,
    CurrentUserResponse,
    ProfilePatch,
    UserProfileResponse,
)
from iweioo_api.modules.account.service import (
    apply_profile_patch,
    current_user_response,
    ensure_user_projection,
    list_consents,
    set_consent,
)
from iweioo_api.modules.auth.dependencies import CurrentIdentity

router = APIRouter(prefix="/users/me", tags=["Account"])
Session = Annotated[AsyncSession, Depends(get_session)]
RuntimeSettings = Annotated[Settings, Depends(get_settings)]


@router.get("", response_model=CurrentUserResponse, operation_id="getCurrentUser")
async def get_current_user(identity: CurrentIdentity, session: Session) -> CurrentUserResponse:
    async with session.begin():
        user, profile = await ensure_user_projection(session, identity)
        return current_user_response(user, profile)


@router.patch(
    "/profile",
    response_model=UserProfileResponse,
    operation_id="updateCurrentUserProfile",
)
async def update_current_user_profile(
    patch: ProfilePatch,
    request: Request,
    identity: CurrentIdentity,
    session: Session,
) -> UserProfileResponse:
    async with session.begin():
        user, profile = await ensure_user_projection(session, identity)
        return await apply_profile_patch(session, user, profile, patch, _request_id(request))


@router.get(
    "/consents",
    response_model=list[ConsentResponse],
    operation_id="listCurrentUserConsents",
    tags=["Consent"],
)
async def list_current_user_consents(
    identity: CurrentIdentity,
    session: Session,
) -> list[ConsentResponse]:
    async with session.begin():
        user, _ = await ensure_user_projection(session, identity)
        return await list_consents(session, user.id)


@router.put(
    "/consents/{purpose}",
    response_model=ConsentResponse,
    operation_id="setCurrentUserConsent",
    tags=["Consent"],
)
async def set_current_user_consent(
    update: ConsentUpdate,
    request: Request,
    identity: CurrentIdentity,
    session: Session,
    settings: RuntimeSettings,
    purpose: Annotated[str, Path(pattern=r"^[a-z][a-z0-9_.-]{2,63}$")],
    idempotency_key: Annotated[
        str,
        Header(
            alias="Idempotency-Key",
            min_length=16,
            max_length=64,
            pattern=r"^[A-Za-z0-9._:-]+$",
        ),
    ],
) -> ConsentResponse:
    if not re.fullmatch(r"[A-Za-z0-9._:-]{16,64}", idempotency_key):
        raise ProblemError(
            status=400,
            code="invalid_idempotency_key",
            title="The idempotency key is invalid",
        )
    policy_version = settings.consent_policies.get(purpose)
    if policy_version is None:
        raise ProblemError(
            status=400,
            code="unknown_consent_purpose",
            title="The consent purpose is not registered",
        )

    async with session.begin():
        user, _ = await ensure_user_projection(session, identity)
        return await set_consent(
            session,
            user,
            purpose,
            update,
            policy_version,
            idempotency_key,
            identity.azp,
            _request_id(request),
        )


def _request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if not isinstance(request_id, str):
        raise RuntimeError("request ID middleware did not run")
    return request_id
