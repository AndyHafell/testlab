import json
import pytest
import app as app_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = str(tmp_path / "t.db")
    monkeypatch.setenv("DASHBOARD_TOKEN", "secret")
    monkeypatch.setenv("SKOOL_JOIN_URL", "https://skool.test/join")
    test_app = app_module.create_app(db_path=db_path)
    test_app.config["TESTING"] = True
    return test_app.test_client()


def test_landing_page_ok(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"Start your free 7-day trial" in resp.data


def test_dashboard_requires_token(client):
    assert client.get("/dashboard").status_code == 403
    assert client.get("/dashboard?token=wrong").status_code == 403
    assert client.get("/dashboard?token=secret").status_code == 200


def test_stats_requires_token(client):
    assert client.get("/api/stats").status_code == 403
    ok = client.get("/api/stats?token=secret")
    assert ok.status_code == 200
    assert ok.get_json()["totals"]["chats"] == 0


def test_event_json_chat_start(client):
    resp = client.post("/api/event", json={"type": "chat_start", "session_id": "s1"})
    assert resp.status_code == 204
    stats = client.get("/api/stats?token=secret").get_json()
    assert stats["totals"]["chats"] == 1


def test_event_beacon_text_plain_body(client):
    # sendBeacon often sends a text/plain body containing JSON
    resp = client.post(
        "/api/event",
        data=json.dumps({"type": "conversion", "session_id": "s1"}),
        content_type="text/plain;charset=UTF-8",
    )
    assert resp.status_code == 204
    stats = client.get("/api/stats?token=secret").get_json()
    assert stats["totals"]["conversions"] == 1


def test_event_rejects_unknown_type(client):
    resp = client.post("/api/event", json={"type": "hack", "session_id": "s1"})
    assert resp.status_code == 400


def test_event_requires_session_id(client):
    resp = client.post("/api/event", json={"type": "chat_start"})
    assert resp.status_code == 400


def test_signed_url_returns_url(client, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "KEY")
    monkeypatch.setenv("ELEVENLABS_AGENT_ID", "agent_abc")
    monkeypatch.setattr(app_module.elevenlabs_client, "get_signed_url",
                        lambda key, agent_id: "wss://signed")
    resp = client.get("/api/signed-url")
    assert resp.status_code == 200
    assert resp.get_json()["signedUrl"] == "wss://signed"


def test_signed_url_500_when_unconfigured(client, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("ELEVENLABS_AGENT_ID", raising=False)
    resp = client.get("/api/signed-url")
    assert resp.status_code == 500


def test_event_empty_text_body_is_400(client):
    resp = client.post("/api/event", data=b"", content_type="text/plain")
    assert resp.status_code == 400


def test_event_non_object_json_is_400(client):
    resp = client.post("/api/event", data="42", content_type="text/plain")
    assert resp.status_code == 400


def test_event_cross_origin_rejected(client):
    resp = client.post(
        "/api/event",
        json={"type": "conversion", "session_id": "s1"},
        headers={"Origin": "http://evil.example"},
    )
    assert resp.status_code == 403


def test_event_same_origin_allowed(client):
    resp = client.post(
        "/api/event",
        json={"type": "chat_start", "session_id": "s1"},
        headers={"Origin": "http://localhost"},
    )
    assert resp.status_code == 204


def test_event_long_session_id_is_400(client):
    resp = client.post(
        "/api/event", json={"type": "chat_start", "session_id": "x" * 500})
    assert resp.status_code == 400


def test_event_oversized_meta_is_400(client):
    resp = client.post("/api/event", json={
        "type": "chat_start", "session_id": "s1", "meta": "y" * 5000})
    assert resp.status_code == 400
