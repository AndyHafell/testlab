import db


def make_db(tmp_path):
    path = tmp_path / "test.db"
    db.init_db(str(path))
    return str(path)


def test_insert_and_count_chat_start(tmp_path):
    path = make_db(tmp_path)
    db.insert_event(path, "sess-1", "chat_start")
    db.insert_event(path, "sess-2", "chat_start")
    stats = db.get_stats(path)
    assert stats["totals"]["chats"] == 2
    assert stats["totals"]["conversions"] == 0
    assert stats["totals"]["rate"] == 0.0


def test_conversion_rate(tmp_path):
    path = make_db(tmp_path)
    for i in range(4):
        db.insert_event(path, f"s{i}", "chat_start")
    db.insert_event(path, "s0", "conversion")
    stats = db.get_stats(path)
    assert stats["totals"]["chats"] == 4
    assert stats["totals"]["conversions"] == 1
    assert stats["totals"]["rate"] == 25.0


def test_timeseries_buckets_by_day(tmp_path):
    path = make_db(tmp_path)
    db.insert_event(path, "s1", "chat_start", created_at="2026-06-10 09:00:00")
    db.insert_event(path, "s1", "conversion", created_at="2026-06-10 09:05:00")
    db.insert_event(path, "s2", "chat_start", created_at="2026-06-11 10:00:00")
    series = db.get_stats(path)["series"]
    by_date = {row["date"]: row for row in series}
    assert by_date["2026-06-10"]["chats"] == 1
    assert by_date["2026-06-10"]["conversions"] == 1
    assert by_date["2026-06-10"]["rate"] == 100.0
    assert by_date["2026-06-11"]["chats"] == 1
    assert by_date["2026-06-11"]["conversions"] == 0


def test_recent_conversions(tmp_path):
    path = make_db(tmp_path)
    db.insert_event(path, "s1", "conversion", created_at="2026-06-10 09:00:00")
    db.insert_event(path, "s2", "conversion", created_at="2026-06-11 09:00:00")
    recent = db.get_stats(path)["recent"]
    assert recent[0]["session_id"] == "s2"  # newest first
    assert len(recent) == 2


def test_empty_db(tmp_path):
    path = make_db(tmp_path)
    stats = db.get_stats(path)
    assert stats["totals"] == {"chats": 0, "conversions": 0, "rate": 0.0}
    assert stats["series"] == []
    assert stats["recent"] == []
