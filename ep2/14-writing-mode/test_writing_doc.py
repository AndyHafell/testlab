"""Writing Mode: per-video rich-text docs (writing_doc column) + image upload.

The Google-Docs-style editor autosaves HTML into videos.writing_doc via
GET/POST /api/videos/<vid>/writing-doc. Private admin surface: gated by
_testing_lab_admin (identity_email in ADMIN_EMAILS) → invisible 404 for
everyone else, stacked with video_owner_required for per-video scoping."""

import io

import pytest


@pytest.fixture
def as_admin(app_module, monkeypatch):
    """Returns a factory: as_admin('a@x.com', ...) adds emails to ADMIN_EMAILS."""
    def _grant(*emails):
        monkeypatch.setattr(
            app_module, "ADMIN_EMAILS",
            app_module.ADMIN_EMAILS | {e.lower() for e in emails},
        )
    return _grant


def _seed_video(db, uid, video_id="vid_W", title="Writing video"):
    cur = db.execute(
        "INSERT INTO videos (video_id, title, user_id) VALUES (?, ?, ?)",
        (video_id, title, uid),
    )
    db.commit()
    return cur.lastrowid


def test_writing_doc_invisible_to_non_admin_even_on_own_video(client, seed_user, login_as, db):
    uid = seed_user("bob@example.com", "bob-handle")
    login_as("bob@example.com")
    vid = _seed_video(db, uid)

    r = client.get(f"/api/videos/{vid}/writing-doc")
    assert r.status_code == 404
    r = client.post(f"/api/videos/{vid}/writing-doc", json={"writing_doc": "<p>x</p>"})
    assert r.status_code == 404

    row = db.execute("SELECT writing_doc FROM videos WHERE id = ?", (vid,)).fetchone()
    assert row["writing_doc"] is None


def test_writing_doc_defaults_empty(client, seed_user, login_as, db, as_admin):
    uid = seed_user("alice@example.com", "alice-handle")
    as_admin("alice@example.com")
    login_as("alice@example.com")
    vid = _seed_video(db, uid)

    r = client.get(f"/api/videos/{vid}/writing-doc")
    assert r.status_code == 200
    assert r.get_json() == {"writing_doc": ""}


def test_writing_doc_save_and_load_roundtrip(client, seed_user, login_as, db, as_admin):
    uid = seed_user("alice@example.com", "alice-handle")
    as_admin("alice@example.com")
    login_as("alice@example.com")
    vid = _seed_video(db, uid)

    html = '<h1>Hook</h1><p>This is <b>bold</b> and <i>italic</i>.</p><ul><li>beat 1</li></ul>'
    r = client.post(f"/api/videos/{vid}/writing-doc", json={"writing_doc": html})
    assert r.status_code == 200
    assert r.get_json() == {"ok": True}

    r = client.get(f"/api/videos/{vid}/writing-doc")
    assert r.status_code == 200
    assert r.get_json()["writing_doc"] == html

    # Persisted in the existing DB, on the videos row itself
    row = db.execute("SELECT writing_doc FROM videos WHERE id = ?", (vid,)).fetchone()
    assert row["writing_doc"] == html


def test_writing_doc_overwrite_keeps_latest(client, seed_user, login_as, db, as_admin):
    uid = seed_user("alice@example.com", "alice-handle")
    as_admin("alice@example.com")
    login_as("alice@example.com")
    vid = _seed_video(db, uid)

    client.post(f"/api/videos/{vid}/writing-doc", json={"writing_doc": "<p>v1</p>"})
    client.post(f"/api/videos/{vid}/writing-doc", json={"writing_doc": "<p>v2</p>"})

    r = client.get(f"/api/videos/{vid}/writing-doc")
    assert r.get_json()["writing_doc"] == "<p>v2</p>"


def test_writing_doc_scoped_to_owner(client, seed_user, login_as, db, as_admin):
    uid_a = seed_user("alice@example.com", "alice-handle")
    seed_user("bob@example.com", "bob-handle")
    as_admin("alice@example.com", "bob@example.com")
    vid = _seed_video(db, uid_a)

    login_as("alice@example.com")
    client.post(f"/api/videos/{vid}/writing-doc", json={"writing_doc": "<p>alice secret</p>"})

    login_as("bob@example.com")
    r = client.get(f"/api/videos/{vid}/writing-doc")
    assert r.status_code == 404
    r = client.post(f"/api/videos/{vid}/writing-doc", json={"writing_doc": "<p>bob was here</p>"})
    assert r.status_code == 404

    # Alice's doc untouched by Bob's attempted write
    row = db.execute("SELECT writing_doc FROM videos WHERE id = ?", (vid,)).fetchone()
    assert row["writing_doc"] == "<p>alice secret</p>"


def test_writing_doc_unauthenticated_401(client, seed_user, db):
    uid = seed_user("alice@example.com", "alice-handle")
    vid = _seed_video(db, uid)

    r = client.get(f"/api/videos/{vid}/writing-doc")
    assert r.status_code == 401
    r = client.post(f"/api/videos/{vid}/writing-doc", json={"writing_doc": "<p>x</p>"})
    assert r.status_code == 401


# --- image upload for the editor ---

PNG_1PX = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
def tmp_uploads(app_module, tmp_path, monkeypatch):
    up = tmp_path / "uploads"
    up.mkdir()
    monkeypatch.setattr(app_module, "UPLOAD_DIR", up)
    return up


def test_writing_image_upload(client, seed_user, login_as, db, tmp_uploads, as_admin):
    uid = seed_user("alice@example.com", "alice-handle")
    as_admin("alice@example.com")
    login_as("alice@example.com")
    vid = _seed_video(db, uid)

    r = client.post(
        f"/api/videos/{vid}/writing-doc/image",
        data={"file": (io.BytesIO(PNG_1PX), "shot.png")},
        content_type="multipart/form-data",
    )
    assert r.status_code == 200
    url = r.get_json()["url"]
    assert url.startswith(f"/static/uploads/writing/{vid}/")
    assert url.endswith(".png")

    # File landed under UPLOAD_DIR/writing/<vid>/
    fname = url.rsplit("/", 1)[1]
    assert (tmp_uploads / "writing" / str(vid) / fname).read_bytes() == PNG_1PX


def test_writing_image_upload_requires_file(client, seed_user, login_as, db, tmp_uploads, as_admin):
    uid = seed_user("alice@example.com", "alice-handle")
    as_admin("alice@example.com")
    login_as("alice@example.com")
    vid = _seed_video(db, uid)

    r = client.post(f"/api/videos/{vid}/writing-doc/image", data={})
    assert r.status_code == 400


def test_writing_image_upload_rejects_non_image(client, seed_user, login_as, db, tmp_uploads, as_admin):
    uid = seed_user("alice@example.com", "alice-handle")
    as_admin("alice@example.com")
    login_as("alice@example.com")
    vid = _seed_video(db, uid)

    r = client.post(
        f"/api/videos/{vid}/writing-doc/image",
        data={"file": (io.BytesIO(b"#!/bin/sh"), "evil.sh")},
        content_type="multipart/form-data",
    )
    assert r.status_code == 400


def test_writing_image_upload_scoped_to_owner(client, seed_user, login_as, db, tmp_uploads, as_admin):
    uid_a = seed_user("alice@example.com", "alice-handle")
    seed_user("bob@example.com", "bob-handle")
    as_admin("alice@example.com", "bob@example.com")
    vid = _seed_video(db, uid_a)

    login_as("bob@example.com")
    r = client.post(
        f"/api/videos/{vid}/writing-doc/image",
        data={"file": (io.BytesIO(PNG_1PX), "shot.png")},
        content_type="multipart/form-data",
    )
    assert r.status_code == 404
