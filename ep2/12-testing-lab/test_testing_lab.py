"""Testing Lab: admin-only AI model comparison board.

The gate must read session['identity_email'] ONLY — never session['email'],
which gets swapped during impersonation / team workspaces. Non-admins get
404 on every /api/lab/* surface (invisible, not forbidden) and a redirect
off the page route.
"""
import io
import json

import pytest

ADMIN = "andhaf94@gmail.com"
BOB = "bob@example.com"


@pytest.fixture
def lab_setup(app_module, monkeypatch, tmp_path):
    """Pin ADMIN_EMAILS and isolate screenshot writes to a temp dir."""
    monkeypatch.setattr(app_module, "ADMIN_EMAILS", {ADMIN})
    monkeypatch.setattr(app_module, "UPLOAD_DIR", tmp_path / "uploads")
    return app_module


def _mk_test(client, prompt="Write a haiku about CI"):
    r = client.post("/api/lab/tests", json={"prompt": prompt})
    assert r.status_code == 201, r.get_json()
    return r.get_json()["test"]


def _mk_run(client, test_id, **fields):
    r = client.post(f"/api/lab/tests/{test_id}/runs", json=fields or {})
    assert r.status_code == 201, r.get_json()
    return r.get_json()["run"]


def _upload_shot(client, run_id, name="shot.png", body=b"\x89PNG fake"):
    return client.post(
        f"/api/lab/runs/{run_id}/screenshots",
        data={"file": (io.BytesIO(body), name)},
        content_type="multipart/form-data",
    )


# ── Gate ──────────────────────────────────────────────────────────────


def test_anonymous_is_rejected(client, lab_setup):
    assert client.get("/api/lab/board").status_code == 401
    assert client.get("/testing-lab").status_code == 401


def test_non_admin_sees_404_on_apis_and_redirect_on_page(
    client, seed_user, login_as, lab_setup
):
    seed_user(BOB, "bob-handle")
    login_as(BOB)
    assert client.get("/api/lab/board").status_code == 404
    assert client.post("/api/lab/tests", json={"prompt": "x"}).status_code == 404
    assert client.post("/api/lab/tests/1/runs", json={}).status_code == 404
    assert client.patch("/api/lab/runs/1", json={}).status_code == 404
    r = client.get("/testing-lab")
    assert r.status_code == 302
    assert r.headers["Location"].endswith("/")


def test_admin_can_load_board_and_page(client, seed_user, login_as, lab_setup):
    seed_user(ADMIN, "andy-handle")
    login_as(ADMIN)
    r = client.get("/api/lab/board")
    assert r.status_code == 200
    assert r.get_json() == {"tests": []}
    assert client.get("/testing-lab").status_code == 200


def test_gate_ignores_plain_email(client, seed_user, login_as, lab_setup):
    """session['email'] == admin must NOT open the Lab when the real logged-in
    human (identity_email) is someone else — e.g. a swapped workspace email."""
    seed_user(BOB, "bob-handle")
    login_as(BOB)
    with client.session_transaction() as s:
        s["email"] = ADMIN  # swapped email; identity_email still bob
    assert client.get("/api/lab/board").status_code == 404
    assert client.get("/testing-lab").status_code == 302


def test_gate_follows_identity_through_email_swap(
    client, seed_user, login_as, lab_setup
):
    """The admin keeps access even when session['email'] drifts elsewhere
    (team-workspace shapes swap email/user_id; identity_email stays the
    real human). The gate must follow identity_email, not email."""
    seed_user(ADMIN, "andy-handle")
    seed_user(BOB, "bob-handle")
    login_as(ADMIN)
    with client.session_transaction() as s:
        s["email"] = BOB
        s["impersonator_email"] = ADMIN  # keeps require_auth's allowlist check happy
    assert client.get("/api/lab/board").status_code == 200


def test_legacy_cookie_without_identity_email_heals_for_admin(
    client, seed_user, login_as, lab_setup
):
    """Long-lived prod cookies minted before identity_email existed carry only
    user_id/email. The gate must recover the real human from the user_id DB
    row (not from the session email string) instead of locking the admin out."""
    seed_user(ADMIN, "andy-handle")
    login_as(ADMIN)
    with client.session_transaction() as s:
        del s["identity_email"]
        s.pop("identity_user_id", None)
    assert client.get("/api/lab/board").status_code == 200
    # ...and the lookup healed the session for subsequent requests.
    with client.session_transaction() as s:
        assert s["identity_email"] == ADMIN


def test_legacy_cookie_heal_uses_db_row_not_session_email(
    client, seed_user, login_as, lab_setup
):
    """A legacy-shaped session whose plain email claims to be the admin must
    still be denied: the heal derives identity from the user_id row (bob's),
    never from the session email string."""
    seed_user(BOB, "bob-handle")
    login_as(BOB)
    with client.session_transaction() as s:
        del s["identity_email"]
        s.pop("identity_user_id", None)
        s["email"] = ADMIN
    assert client.get("/api/lab/board").status_code == 404


def test_lab_hides_while_impersonating(client, seed_user, login_as, lab_setup):
    """Impersonation fully adopts the target's identity (identity_email :=
    target, real admin kept in impersonator_email), so the Lab deliberately
    disappears while the admin walks in a user's shoes — and comes back on
    stop. 'See what they see' includes NOT seeing the Lab."""
    seed_user(ADMIN, "andy-handle")
    seed_user(BOB, "bob-handle")
    login_as(ADMIN)
    assert client.get("/api/lab/board").status_code == 200
    assert client.post("/api/admin/impersonate", json={"email": BOB}).status_code == 200
    assert client.get("/api/lab/board").status_code == 404
    assert client.post("/api/admin/stop-impersonating").status_code == 200
    assert client.get("/api/lab/board").status_code == 200


def test_auth_status_flag_is_identity_gated(client, seed_user, login_as, lab_setup):
    seed_user(ADMIN, "andy-handle")
    seed_user(BOB, "bob-handle")
    login_as(BOB)
    assert client.get("/api/auth-status").get_json()["can_use_testing_lab"] is False
    login_as(ADMIN)
    assert client.get("/api/auth-status").get_json()["can_use_testing_lab"] is True


# ── Tests + runs CRUD ─────────────────────────────────────────────────


@pytest.fixture
def admin_client(client, seed_user, login_as, lab_setup):
    seed_user(ADMIN, "andy-handle")
    login_as(ADMIN)
    return client


def test_create_test_requires_prompt(admin_client):
    assert admin_client.post("/api/lab/tests", json={}).status_code == 400
    assert admin_client.post("/api/lab/tests", json={"prompt": "  "}).status_code == 400


def test_board_round_trip(admin_client):
    t1 = _mk_test(admin_client, "Prompt one")
    t2 = _mk_test(admin_client, "Prompt two")
    r1 = _mk_run(admin_client, t1["id"], model_name="Fable 5")
    r2 = _mk_run(admin_client, t1["id"], model_name="Grok 4", verdict="win")

    board = admin_client.get("/api/lab/board").get_json()["tests"]
    assert [t["prompt"] for t in board] == ["Prompt two", "Prompt one"]  # newest first
    runs = next(t for t in board if t["id"] == t1["id"])["runs"]
    assert [r["model_name"] for r in runs] == ["Fable 5", "Grok 4"]  # oldest first
    assert runs[0]["verdict"] == "pending"
    assert runs[1]["verdict"] == "win"
    assert runs[0]["run_date"]  # defaults to today
    assert next(t for t in board if t["id"] == t2["id"])["runs"] == []
    assert r1["id"] != r2["id"]


def test_edit_prompt_and_run_fields(admin_client):
    t = _mk_test(admin_client)
    r = _mk_run(admin_client, t["id"])

    assert (
        admin_client.patch(f"/api/lab/tests/{t['id']}", json={"prompt": "v2"}).status_code
        == 200
    )
    resp = admin_client.patch(
        f"/api/lab/runs/{r['id']}",
        json={"model_name": "Fable 5", "verdict": "mixed", "notes": "slow but right",
              "run_date": "2026-06-01"},
    )
    assert resp.status_code == 200
    board = admin_client.get("/api/lab/board").get_json()["tests"][0]
    assert board["prompt"] == "v2"
    run = board["runs"][0]
    assert (run["model_name"], run["verdict"], run["notes"], run["run_date"]) == (
        "Fable 5", "mixed", "slow but right", "2026-06-01"
    )


def test_invalid_verdict_rejected(admin_client):
    t = _mk_test(admin_client)
    r = _mk_run(admin_client, t["id"])
    assert (
        admin_client.patch(f"/api/lab/runs/{r['id']}", json={"verdict": "amazing"}).status_code
        == 400
    )
    assert (
        admin_client.post(f"/api/lab/tests/{t['id']}/runs", json={"verdict": "nope"}).status_code
        == 400
    )


def test_run_on_missing_test_404(admin_client):
    assert admin_client.post("/api/lab/tests/999/runs", json={}).status_code == 404
    assert admin_client.patch("/api/lab/runs/999", json={}).status_code == 404


# ── Screenshots ───────────────────────────────────────────────────────


def test_screenshot_upload_and_delete(admin_client, lab_setup):
    t = _mk_test(admin_client)
    r = _mk_run(admin_client, t["id"])

    resp = _upload_shot(admin_client, r["id"])
    assert resp.status_code == 200
    shots = resp.get_json()["screenshots"]
    assert len(shots) == 1
    url = shots[0]
    assert url.startswith("/static/uploads/lab/")
    on_disk = lab_setup.UPLOAD_DIR / "lab" / str(r["id"]) / url.rsplit("/", 1)[1]
    assert on_disk.exists()

    resp = admin_client.delete(f"/api/lab/runs/{r['id']}/screenshots", json={"url": url})
    assert resp.status_code == 200
    assert resp.get_json()["screenshots"] == []
    assert not on_disk.exists()


def test_screenshot_rejects_non_image(admin_client):
    t = _mk_test(admin_client)
    r = _mk_run(admin_client, t["id"])
    assert _upload_shot(admin_client, r["id"], name="notes.txt").status_code == 400


def test_delete_run_removes_files(admin_client, lab_setup):
    t = _mk_test(admin_client)
    r = _mk_run(admin_client, t["id"])
    _upload_shot(admin_client, r["id"])
    run_dir = lab_setup.UPLOAD_DIR / "lab" / str(r["id"])
    assert any(run_dir.iterdir())

    assert admin_client.delete(f"/api/lab/runs/{r['id']}").status_code == 200
    assert not run_dir.exists()
    assert admin_client.get("/api/lab/board").get_json()["tests"][0]["runs"] == []


def test_delete_test_cascades(admin_client, lab_setup, db):
    t = _mk_test(admin_client)
    r1 = _mk_run(admin_client, t["id"])
    r2 = _mk_run(admin_client, t["id"])
    _upload_shot(admin_client, r1["id"])

    assert admin_client.delete(f"/api/lab/tests/{t['id']}").status_code == 200
    assert admin_client.get("/api/lab/board").get_json() == {"tests": []}
    assert db.execute("SELECT COUNT(*) c FROM lab_runs").fetchone()["c"] == 0
    assert not (lab_setup.UPLOAD_DIR / "lab" / str(r1["id"])).exists()
    assert not (lab_setup.UPLOAD_DIR / "lab" / str(r2["id"])).exists()
