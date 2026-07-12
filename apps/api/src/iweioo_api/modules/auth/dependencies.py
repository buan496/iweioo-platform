from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from iweioo_api.config import get_settings
from iweioo_api.errors import ProblemError
from iweioo_api.modules.auth.jwks import JwksCache, TokenValidationError, TokenVerifier
from iweioo_api.modules.auth.models import IdentityClaims

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_token_verifier() -> TokenVerifier:
    settings = get_settings()
    return TokenVerifier(settings, JwksCache(settings))


async def get_current_identity(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> IdentityClaims:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise ProblemError(
            status=401,
            code="authentication_required",
            title="A valid bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return await get_token_verifier().verify(credentials.credentials)
    except TokenValidationError as error:
        raise ProblemError(
            status=401,
            code="invalid_access_token",
            title="The access token is invalid or expired",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from error


CurrentIdentity = Annotated[IdentityClaims, Depends(get_current_identity)]
