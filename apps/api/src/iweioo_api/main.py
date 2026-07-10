from fastapi import FastAPI

from iweioo_api import __version__
from iweioo_api.modules.health.router import router as health_router


def create_app() -> FastAPI:
    application = FastAPI(
        title="iweioo Platform API",
        version=__version__,
        docs_url="/docs",
        redoc_url=None,
    )
    application.include_router(health_router, prefix="/v1")
    return application


app = create_app()
