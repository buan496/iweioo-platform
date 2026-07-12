import re
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import FastAPI, Request, Response

from iweioo_api import __version__
from iweioo_api.errors import install_problem_handlers
from iweioo_api.modules.account.router import router as account_router
from iweioo_api.modules.health.router import router as health_router

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,64}$")


async def request_context_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    candidate = request.headers.get("x-request-id", "")
    request_id = candidate if REQUEST_ID_PATTERN.fullmatch(candidate) else str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    if request.url.path.startswith("/v1/users/"):
        response.headers["Cache-Control"] = "no-store"
    return response


def create_app() -> FastAPI:
    application = FastAPI(
        title="iweioo Platform API",
        version=__version__,
        docs_url="/docs",
        redoc_url=None,
    )
    application.middleware("http")(request_context_middleware)
    install_problem_handlers(application)
    application.include_router(health_router, prefix="/v1")
    application.include_router(account_router, prefix="/v1")
    return application


app = create_app()
