from iweioo_worker.main import health_snapshot


def test_worker_health_snapshot_is_stable() -> None:
    assert health_snapshot().status == "ok"
    assert health_snapshot().service == "iweioo-platform-worker"
    assert health_snapshot().version == "0.1.0"
