from fastapi.testclient import TestClient

from iweioo_api.main import create_app


def test_health_endpoints_match_the_public_contract() -> None:
    client = TestClient(create_app())

    for endpoint in ("/v1/health/live", "/v1/health/ready"):
        response = client.get(endpoint)
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok",
            "service": "iweioo-platform-api",
            "version": "0.1.0",
        }


def test_health_operations_keep_stable_identifiers() -> None:
    openapi = create_app().openapi()

    assert openapi["paths"]["/v1/health/live"]["get"]["operationId"] == "getLiveness"
    assert openapi["paths"]["/v1/health/ready"]["get"]["operationId"] == "getReadiness"
