import os
import sqlite3

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def _connect(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(path):
    with open(SCHEMA_PATH) as f:
        schema = f.read()
    conn = _connect(path)
    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()


def insert_event(path, session_id, event_type, meta=None, created_at=None):
    conn = _connect(path)
    try:
        if created_at:
            conn.execute(
                "INSERT INTO events (session_id, type, meta, created_at) VALUES (?, ?, ?, ?)",
                (session_id, event_type, meta, created_at),
            )
        else:
            conn.execute(
                "INSERT INTO events (session_id, type, meta) VALUES (?, ?, ?)",
                (session_id, event_type, meta),
            )
        conn.commit()
    finally:
        conn.close()


def _rate(conversions, chats):
    return round((conversions / chats) * 100, 1) if chats else 0.0


def get_stats(path):
    conn = _connect(path)
    try:
        counts = {"chat_start": 0, "conversion": 0}
        for row in conn.execute("SELECT type, COUNT(*) c FROM events GROUP BY type"):
            counts[row["type"]] = row["c"]

        daily = {}
        for row in conn.execute(
            "SELECT date(created_at) d, type, COUNT(*) c FROM events GROUP BY d, type"
        ):
            entry = daily.setdefault(row["d"], {"chat_start": 0, "conversion": 0})
            entry[row["type"]] = row["c"]

        series = []
        for d in sorted(daily):
            chats = daily[d]["chat_start"]
            conversions = daily[d]["conversion"]
            series.append(
                {"date": d, "chats": chats, "conversions": conversions,
                 "rate": _rate(conversions, chats)}
            )

        recent = [
            {"session_id": row["session_id"], "created_at": row["created_at"]}
            for row in conn.execute(
                "SELECT session_id, created_at FROM events "
                "WHERE type='conversion' ORDER BY id DESC LIMIT 20"
            )
        ]

        chats = counts["chat_start"]
        conversions = counts["conversion"]
        return {
            "totals": {"chats": chats, "conversions": conversions,
                       "rate": _rate(conversions, chats)},
            "series": series,
            "recent": recent,
        }
    finally:
        conn.close()
