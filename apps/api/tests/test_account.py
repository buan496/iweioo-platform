from __future__ import annotations

from conftest import IDENTITY_A, IDENTITY_B, ApiHarness
from sqlalchemy import func, select

from iweioo_api.models import AuditEvent, ConsentEvent


def test_profile_and_consent_are_persistent_idempotent_and_subject_isolated(
    api_harness: ApiHarness,
) -> None:
    first = api_harness.client.get("/v1/users/me", headers={"X-Request-ID": "request-initial-a"})
    assert first.status_code == 200
    assert first.headers["cache-control"] == "no-store"
    assert first.json()["profile"] == {
        "display_name": "Student A",
        "locale": "zh-CN",
        "timezone": "Asia/Shanghai",
        "school": None,
        "major": None,
        "graduation_year": None,
        "career_goal": None,
    }

    profile = {
        "display_name": "Student Alpha",
        "locale": "en",
        "timezone": "Asia/Shanghai",
        "school": "iweioo University",
        "major": "Computer Science",
        "graduation_year": 2027,
        "career_goal": "Backend engineer",
    }
    updated = api_harness.client.patch(
        "/v1/users/me/profile",
        json=profile,
        headers={"X-Request-ID": "request-profile-a"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json() == profile

    consent_headers = {
        "Idempotency-Key": "consent-command-a-0001",
        "X-Request-ID": "request-consent-a",
    }
    consent_body = {"status": "granted", "policy_version": "beta-2026-07-10"}
    granted = api_harness.client.put(
        "/v1/users/me/consents/growth_profile",
        json=consent_body,
        headers=consent_headers,
    )
    assert granted.status_code == 200
    assert granted.json()["status"] == "granted"

    replay = api_harness.client.put(
        "/v1/users/me/consents/growth_profile",
        json=consent_body,
        headers=consent_headers,
    )
    assert replay.status_code == 200
    assert api_harness.scalar(select(func.count()).select_from(ConsentEvent)) == 1

    conflict = api_harness.client.put(
        "/v1/users/me/consents/agent_memory",
        json=consent_body,
        headers=consent_headers,
    )
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "idempotency_conflict"

    revoked = api_harness.client.put(
        "/v1/users/me/consents/growth_profile",
        json={"status": "revoked", "policy_version": "beta-2026-07-10"},
        headers={
            "Idempotency-Key": "consent-command-a-0004",
            "X-Request-ID": "request-consent-revoke-a",
        },
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"

    original_replay = api_harness.client.put(
        "/v1/users/me/consents/growth_profile",
        json=consent_body,
        headers=consent_headers,
    )
    assert original_replay.status_code == 200
    assert original_replay.json()["status"] == "granted"
    assert api_harness.scalar(select(func.count()).select_from(ConsentEvent)) == 2

    api_harness.use_identity(IDENTITY_B)
    second = api_harness.client.get("/v1/users/me")
    assert second.status_code == 200
    assert second.json()["profile"]["display_name"] == "Student B"
    assert api_harness.client.get("/v1/users/me/consents").json() == []

    api_harness.use_identity(IDENTITY_A)
    persisted = api_harness.client.get("/v1/users/me")
    assert persisted.json()["profile"] == profile
    consent_list = api_harness.client.get("/v1/users/me/consents")
    assert consent_list.status_code == 200
    assert len(consent_list.json()) == 1
    assert consent_list.json()[0]["purpose"] == "growth_profile"
    assert consent_list.json()[0]["status"] == "revoked"

    audit = api_harness.scalar(
        select(AuditEvent).where(AuditEvent.action == "account.profile.updated")
    )
    assert audit.changed_fields == sorted(set(profile) - {"timezone"})
    assert "Student Alpha" not in str(audit.changed_fields)


def test_profile_and_consent_validation_fail_closed(api_harness: ApiHarness) -> None:
    assert api_harness.client.patch("/v1/users/me/profile", json={}).status_code == 400
    assert (
        api_harness.client.patch(
            "/v1/users/me/profile",
            json={"display_name": "   "},
        ).status_code
        == 400
    )
    assert (
        api_harness.client.patch(
            "/v1/users/me/profile",
            json={"timezone": "Mars/Olympus"},
        ).status_code
        == 400
    )
    assert (
        api_harness.client.put(
            "/v1/users/me/consents/growth_profile",
            json={"status": "granted", "policy_version": "old-policy"},
            headers={"Idempotency-Key": "consent-command-a-0002"},
        ).status_code
        == 409
    )
    unknown = api_harness.client.put(
        "/v1/users/me/consents/unregistered_purpose",
        json={"status": "granted", "policy_version": "beta-2026-07-10"},
        headers={"Idempotency-Key": "consent-command-a-0003"},
    )
    assert unknown.status_code == 400
    assert unknown.json()["code"] == "unknown_consent_purpose"
    assert (
        api_harness.client.put(
            "/v1/users/me/consents/growth_profile",
            json={"status": "granted", "policy_version": "beta-2026-07-10"},
        ).status_code
        == 400
    )
