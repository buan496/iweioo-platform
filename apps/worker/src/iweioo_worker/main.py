import argparse
import json
import logging
import signal
from dataclasses import asdict, dataclass
from threading import Event
from typing import Literal

from iweioo_worker import __version__

logger = logging.getLogger("iweioo.worker")


@dataclass(frozen=True)
class WorkerHealth:
    status: Literal["ok"]
    service: str
    version: str


def health_snapshot() -> WorkerHealth:
    return WorkerHealth(
        status="ok",
        service="iweioo-platform-worker",
        version=__version__,
    )


def run_worker(poll_interval_seconds: float = 5.0) -> None:
    stop = Event()

    def request_stop(_signum: int, _frame: object) -> None:
        stop.set()

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)
    logger.info("worker_started", extra={"version": __version__})
    while not stop.wait(poll_interval_seconds):
        logger.debug("worker_tick")
    logger.info("worker_stopped")


def main() -> None:
    parser = argparse.ArgumentParser(description="iweioo platform worker")
    parser.add_argument("--healthcheck", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    if args.healthcheck:
        print(json.dumps(asdict(health_snapshot()), separators=(",", ":")))
        return
    run_worker()
