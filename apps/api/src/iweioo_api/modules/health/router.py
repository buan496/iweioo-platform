from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from iweioo_api import __version__
from iweioo_api.database import get_session
from iweioo_api.errors import ProblemError

router = APIRouter(prefix="/health", tags=["Health"])
Session = Annotated[AsyncSession, Depends(get_session)]


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "degraded"]
    service: str
    version: str


def health_response() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="iweioo-platform-api",
        version=__version__,
    )


@router.get("/live", response_model=HealthResponse, operation_id="getLiveness")
def get_liveness() -> HealthResponse:
    return health_response()


@router.get("/ready", response_model=HealthResponse, operation_id="getReadiness")
async def get_readiness(session: Session) -> HealthResponse:
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise ProblemError(
            status=503,
            code="dependency_unavailable",
            title="A required service dependency is unavailable",
        ) from error
    return health_response()
