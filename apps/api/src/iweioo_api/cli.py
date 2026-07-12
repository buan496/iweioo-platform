from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path

import uvicorn
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from iweioo_api.modules.applications.manifest import load_application_manifests
from iweioo_api.modules.applications.service import sync_application_manifests


def main() -> None:
    parser = argparse.ArgumentParser(prog="iweioo-api")
    subcommands = parser.add_subparsers(dest="command")
    sync_parser = subcommands.add_parser(
        "sync-applications",
        help="validate and synchronize application manifests",
    )
    sync_parser.add_argument(
        "--manifest-dir",
        type=Path,
        default=Path("contracts/applications"),
    )
    arguments = parser.parse_args()
    if arguments.command == "sync-applications":
        asyncio.run(_sync_applications(arguments.manifest_dir))
        return
    uvicorn.run("iweioo_api.main:app", host="127.0.0.1", port=8000)


async def _sync_applications(manifest_dir: Path) -> None:
    database_url = os.environ.get("PLATFORM_DATABASE_URL")
    if not database_url:
        raise SystemExit("PLATFORM_DATABASE_URL is required")
    parsed_url = make_url(database_url)
    if parsed_url.drivername != "postgresql+asyncpg":
        raise SystemExit("application manifests require a postgresql+asyncpg database")

    manifests = load_application_manifests(manifest_dir)
    engine = create_async_engine(database_url, pool_pre_ping=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions.begin() as session:
            result = await sync_application_manifests(session, manifests)
    finally:
        await engine.dispose()
    print(
        "Application manifests synchronized: "
        f"created={result.created} updated={result.updated} unchanged={result.unchanged}"
    )
