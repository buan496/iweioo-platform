from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from iweioo_api import __version__

router = APIRouter(prefix="/health", tags=["Health"])


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
def get_readiness() -> HealthResponse:
    return health_response()
