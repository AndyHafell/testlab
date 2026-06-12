"""Feedback Lab: A/B test tracker + Studio-screenshot check-ins.

Uses the shared conftest harness (fresh temp DB per test, Flask test client,
seed_user/login_as). Gemini vision is monkeypatched — no network."""
import io
import json


def _mk_test(client, **over):
    body = {
        "video_title": "I Gave Fable 5 Six Impossible Prompts",
        "published": "2026-06-11",
        "variants": [
            {"label": "A", "title": "Title A", "thumb_desc": "desc A",
             "watch_time_share_pct": 32.0},
            {"label": "B", "title": "Title B", "thumb_desc": "desc B",
             "watch_time_share_pct": 37.2, "leading": True},
        ],
    }
    body.update(over)
    return client.post("/api/feedback/ab-tests", json=body)


def test_ab_test_crud_roundtrip(app_module, client, seed_user, login_as):
    app_module.FEEDBACK_LAB_OPEN = True
    seed_user("a@x.com", "a")
    login_as("a@x.com")
    r = _mk_test(client)
    assert r.status_code == 201
    tid = r.get_json()["test"]["id"]

    lab = client.get("/api/feedback/lab").get_json()
    assert len(lab["tests"]) == 1
    t = lab["tests"][0]
    assert t["video_title"].startswith("I Gave Fable 5")
    assert t["status"] == "running"
    assert [v["label"] for v in t["variants"]] == ["A", "B"]
    assert t["checkins"] == []

    # Crown B → status complete; reopen flips back.
    r = client.post(f"/api/feedback/ab-tests/{tid}", json={"winner_label": "B"})
    assert r.status_code == 200
    t = r.get_json()["test"]
    assert t["status"] == "complete" and t["winner_label"] == "B"
    r = client.post(f"/api/feedback/ab-tests/{tid}",
                    json={"status": "running", "winner_label": ""})
    assert r.get_json()["test"]["status"] == "running"

    # Update a variant share via full-variants update.
    vs = t["variants"]
    vs[0]["watch_time_share_pct"] = 40.0
    r = client.post(f"/api/feedback/ab-tests/{tid}", json={"variants": vs})
    assert r.get_json()["test"]["variants"][0]["watch_time_share_pct"] == 40.0

    assert client.delete(f"/api/feedback/ab-tests/{tid}").status_code == 200
    assert client.get("/api/feedback/lab").get_json()["tests"] == []


def test_ab_test_validation(app_module, client, seed_user, login_as):
    app_module.FEEDBACK_LAB_OPEN = True
    seed_user("a@x.com", "a")
    login_as("a@x.com")
    assert _mk_test(client, video_title="").status_code == 400
    r = client.post("/api/feedback/ab-tests/999999", json={"status": "complete"})
    assert r.status_code == 404
    # winner_label must match a variant label
    tid = _mk_test(client).get_json()["test"]["id"]
    r = client.post(f"/api/feedback/ab-tests/{tid}", json={"winner_label": "Z"})
    assert r.status_code == 400


def test_ab_test_tenant_isolation(app_module, client, seed_user, login_as):
    app_module.FEEDBACK_LAB_OPEN = True
    seed_user("a@x.com", "a")
    seed_user("b@x.com", "b")
    login_as("a@x.com")
    tid = _mk_test(client).get_json()["test"]["id"]
    login_as("b@x.com")
    assert client.get("/api/feedback/lab").get_json()["tests"] == []
    assert client.post(f"/api/feedback/ab-tests/{tid}",
                       json={"status": "complete"}).status_code == 404
    assert client.delete(f"/api/feedback/ab-tests/{tid}").status_code == 404


# ── data/ab_test_*.json lazy import (admin only) ──────────────────────────

EP1 = {
    "video": "I Gave Fable 5 Six Impossible Prompts (One Shot Each)",
    "published": "2026-06-11", "test_type": "title_and_thumbnail",
    "status": "running", "snapshot_at": "2026-06-12",
    "variants": [
        {"label": "A", "title": "TA", "thumb_desc": "DA", "watch_time_share_pct": 32.0},
        {"label": "B", "title": "TB", "thumb_desc": "DB", "watch_time_share_pct": 37.2,
         "leading": True},
    ],
    "first_24h": {"views": 2206, "typical_band": [460, 690], "ctr_pct": 9.7,
                  "avd": "3:08", "video_length": "12:15", "ranking": "1 of 10",
                  "likes": 59, "comments": 9},
}


def _write_ep1(tmp_path):
    d = tmp_path / "data"
    d.mkdir(exist_ok=True)
    (d / "ab_test_ep1.json").write_text(json.dumps(EP1))
    (d / "ab_test_bad.json").write_text("{not json")  # must be skipped, not 500
    return d


def test_admin_lazy_import(app_module, client, seed_user, login_as, tmp_path):
    app_module.DATA_DIR = _write_ep1(tmp_path)
    seed_user("andhaf94@gmail.com", "andy")   # default ADMIN_EMAILS
    login_as("andhaf94@gmail.com")
    lab = client.get("/api/feedback/lab").get_json()
    assert len(lab["tests"]) == 1
    t = lab["tests"][0]
    assert t["source_file"] == "ab_test_ep1.json"
    assert t["video_title"] == EP1["video"]
    assert t["variants"][1]["leading"] is True
    # first_24h seeds check-in day 1
    assert len(t["checkins"]) == 1
    c = t["checkins"][0]
    assert (c["day_index"], c["views"], c["typical_low"], c["typical_high"]) == (1, 2206, 460, 690)
    assert c["ctr_pct"] == 9.7 and c["ranking"] == "1 of 10" and c["avd"] == "3:08"
    # Idempotent: second GET doesn't duplicate; local edits survive re-import.
    client.post(f"/api/feedback/ab-tests/{t['id']}", json={"winner_label": "B"})
    lab2 = client.get("/api/feedback/lab").get_json()
    assert len(lab2["tests"]) == 1 and len(lab2["tests"][0]["checkins"]) == 1
    assert lab2["tests"][0]["status"] == "complete"


def test_non_admin_no_import(app_module, client, seed_user, login_as, tmp_path):
    app_module.FEEDBACK_LAB_OPEN = True
    app_module.DATA_DIR = _write_ep1(tmp_path)
    seed_user("b@x.com", "b")
    login_as("b@x.com")
    assert client.get("/api/feedback/lab").get_json()["tests"] == []


# ── Check-ins: screenshot upload + vision extraction ──────────────────────

GOOD_EXTRACT = {"views": 2206, "typical_low": 460, "typical_high": 690,
                "ctr_pct": 9.7, "avd": "3:08", "video_length": "12:15",
                "ranking": "1 of 10", "likes": 59, "comments": 9}


def _png():
    return (io.BytesIO(b"\x89PNG fake"), "shot.png")


def test_checkin_upload_extracts(app_module, client, seed_user, login_as, db, monkeypatch):
    app_module.FEEDBACK_LAB_OPEN = True
    uid = seed_user("a@x.com", "a")
    login_as("a@x.com")
    tid = _mk_test(client).get_json()["test"]["id"]
    monkeypatch.setattr(app_module, "_gemini_score_json",
                        lambda *a, **k: dict(GOOD_EXTRACT))
    monkeypatch.setattr(app_module, "_user_gemini_key", lambda u: "k")
    r = client.post(f"/api/feedback/ab-tests/{tid}/checkin",
                    data={"file": _png()}, content_type="multipart/form-data")
    assert r.status_code == 201
    c = r.get_json()["checkin"]
    assert c["views"] == 2206 and c["ranking"] == "1 of 10" and c["day_index"] == 1
    assert c["screenshot_url"].startswith("/static/uploads/checkins/")
    assert not c["extract_error"]
    # Day index increments
    r2 = client.post(f"/api/feedback/ab-tests/{tid}/checkin",
                     data={"file": _png()}, content_type="multipart/form-data")
    assert r2.get_json()["checkin"]["day_index"] == 2
    # Budget spent twice (checkin_extract = 2¢ each)
    used = db.execute("SELECT usage_cents FROM users WHERE id=?", (uid,)).fetchone()[0]
    assert used == 4


def test_checkin_extract_failure_keeps_screenshot(app_module, client, seed_user,
                                                  login_as, monkeypatch):
    app_module.FEEDBACK_LAB_OPEN = True
    seed_user("a@x.com", "a")
    login_as("a@x.com")
    tid = _mk_test(client).get_json()["test"]["id"]
    monkeypatch.setattr(app_module, "_user_gemini_key", lambda u: "k")

    def boom(*a, **k):
        raise RuntimeError("gemini down")
    monkeypatch.setattr(app_module, "_gemini_score_json", boom)
    r = client.post(f"/api/feedback/ab-tests/{tid}/checkin",
                    data={"file": _png()}, content_type="multipart/form-data")
    assert r.status_code == 201
    c = r.get_json()["checkin"]
    assert c["extract_error"] and c["views"] is None and c["screenshot_url"]
    # Re-extract succeeds once Gemini is back
    monkeypatch.setattr(app_module, "_gemini_score_json",
                        lambda *a, **k: dict(GOOD_EXTRACT))
    monkeypatch.setattr(app_module, "_load_image_for_gemini",
                        lambda url: (b"img", "image/png"))
    r = client.post(f"/api/feedback/checkins/{c['id']}/extract")
    assert r.status_code == 200
    c2 = r.get_json()["checkin"]
    assert c2["views"] == 2206 and not c2["extract_error"]


def test_checkin_budget_gate(app_module, client, seed_user, login_as, db, monkeypatch):
    app_module.FEEDBACK_LAB_OPEN = True
    uid = seed_user("a@x.com", "a")
    login_as("a@x.com")
    tid = _mk_test(client).get_json()["test"]["id"]
    monkeypatch.setattr(app_module, "_user_gemini_key", lambda u: "k")
    db.execute("UPDATE users SET usage_cents=100, usage_period=strftime('%Y-%m','now') "
               "WHERE id=?", (uid,))
    db.commit()
    r = client.post(f"/api/feedback/ab-tests/{tid}/checkin",
                    data={"file": _png()}, content_type="multipart/form-data")
    assert r.status_code == 402
    assert r.get_json()["error"] == "budget_exhausted"


def test_checkin_delete_and_isolation(app_module, client, seed_user, login_as, monkeypatch):
    app_module.FEEDBACK_LAB_OPEN = True
    seed_user("a@x.com", "a")
    seed_user("b@x.com", "b")
    login_as("a@x.com")
    tid = _mk_test(client).get_json()["test"]["id"]
    monkeypatch.setattr(app_module, "_gemini_score_json",
                        lambda *a, **k: dict(GOOD_EXTRACT))
    monkeypatch.setattr(app_module, "_user_gemini_key", lambda u: "k")
    cid = client.post(f"/api/feedback/ab-tests/{tid}/checkin",
                      data={"file": _png()},
                      content_type="multipart/form-data").get_json()["checkin"]["id"]
    login_as("b@x.com")
    assert client.delete(f"/api/feedback/checkins/{cid}").status_code == 404
    assert client.post(f"/api/feedback/checkins/{cid}/extract").status_code == 404
    login_as("a@x.com")
    assert client.delete(f"/api/feedback/checkins/{cid}").status_code == 200


# ── Learnings digest → AI Final Review ────────────────────────────────────

def test_feedback_learnings_digest(app_module, client, seed_user, login_as, monkeypatch):
    app_module.FEEDBACK_LAB_OPEN = True
    seed_user("a@x.com", "a")
    login_as("a@x.com")
    tid = _mk_test(client).get_json()["test"]["id"]
    client.post(f"/api/feedback/ab-tests/{tid}", json={"winner_label": "B"})
    monkeypatch.setattr(app_module, "_gemini_score_json",
                        lambda *a, **k: dict(GOOD_EXTRACT))
    monkeypatch.setattr(app_module, "_user_gemini_key", lambda u: "k")
    client.post(f"/api/feedback/ab-tests/{tid}/checkin",
                data={"file": _png()}, content_type="multipart/form-data")
    conn = app_module.get_db()
    uid = conn.execute("SELECT id FROM users WHERE email='a@x.com'").fetchone()["id"]
    fl = app_module._feedback_learnings(conn, uid)
    conn.close()
    assert fl["ab_tests"] == 1 and fl["checkins"] == 1
    assert "Title B" in fl["text"] and "WINNER" in fl["text"]
    assert "2,206" in fl["text"] and "1 of 10" in fl["text"]
    # Empty lab → empty text (prompts unchanged)
    conn = app_module.get_db()
    assert app_module._feedback_learnings(conn, 999999)["text"] == ""
    conn.close()


def test_ai_score_informed_by_lab(app_module, client, seed_user, login_as, db, monkeypatch):
    app_module.FEEDBACK_LAB_OPEN = True
    uid = seed_user("a@x.com", "a")
    login_as("a@x.com")
    tid = _mk_test(client).get_json()["test"]["id"]
    client.post(f"/api/feedback/ab-tests/{tid}", json={"winner_label": "B"})
    # A card owned by the user, with a thumbnail + transcript so packaging+story run.
    db.execute("INSERT INTO videos (video_id, title, status, user_id, thumbnail_url) "
               "VALUES ('v1', 'My new video', 'review', ?, '/static/x.png')", (uid,))
    vid = db.execute("SELECT id FROM videos WHERE video_id='v1'").fetchone()["id"]
    db.execute("INSERT INTO video_details (video_id, meta) VALUES (?, ?)",
               (vid, json.dumps({"transcript": "hello world"})))
    db.commit()

    seen_prompts = []

    def fake_score(api_key, prompt, *a, **k):
        seen_prompts.append(prompt)
        if '"rank"' in prompt:   # only the prediction prompt asks for a rank key
            return {"rank": 1, "of": 10, "reasoning": "r"}
        return {"score": 8, "feedback": "f"}
    monkeypatch.setattr(app_module, "_gemini_score_json", fake_score)
    monkeypatch.setattr(app_module, "_user_gemini_key", lambda u: "k")
    monkeypatch.setattr(app_module, "_load_image_for_gemini",
                        lambda url: (b"img", "image/png"))
    monkeypatch.setattr(app_module, "_recent_channel_videos",
                        lambda conn, n=10, exclude_video_id=None:
                        [{"title": f"t{i}", "views": 100 * i, "published_at": ""}
                         for i in range(1, 11)])
    r = client.post(f"/api/videos/{vid}/ai-score")
    d = r.get_json()
    assert d["informed_by"] == {"ab_tests": 1, "checkins": 0}
    # The learnings block actually reached the prompts.
    assert any("ACTUALLY BEEN WINNING" in p for p in seen_prompts)


# ── Soft-launch gate: admin-only until FEEDBACK_LAB_OPEN=1 ────────────────

def test_feedback_gate_admin_only_by_default(app_module, client, seed_user, login_as):
    assert app_module.FEEDBACK_LAB_OPEN is False  # default env: closed
    seed_user("user@x.com", "u")
    login_as("user@x.com")
    assert client.get("/api/feedback/lab").status_code == 403
    assert _mk_test(client).status_code == 403
    assert client.post("/api/feedback/ab-tests/1", json={}).status_code == 403
    assert client.delete("/api/feedback/ab-tests/1").status_code == 403
    assert client.post("/api/feedback/ab-tests/1/checkin").status_code == 403
    assert client.post("/api/feedback/checkins/1/extract").status_code == 403
    assert client.delete("/api/feedback/checkins/1").status_code == 403
    assert client.get("/api/auth-status").get_json()["feedback_lab_enabled"] is False
    # Admin passes the gate (and the nav-button flag flips on).
    seed_user("andhaf94@gmail.com", "andy")
    login_as("andhaf94@gmail.com")
    assert client.get("/api/auth-status").get_json()["feedback_lab_enabled"] is True
    assert _mk_test(client).status_code == 201


def test_feedback_gate_open_flag(app_module, client, seed_user, login_as):
    app_module.FEEDBACK_LAB_OPEN = True
    seed_user("user@x.com", "u")
    login_as("user@x.com")
    assert client.get("/api/feedback/lab").status_code == 200
    assert client.get("/api/auth-status").get_json()["feedback_lab_enabled"] is True
