#!/usr/bin/env python3
"""
AI Mate OS — Flask server.

  python app.py            # → http://127.0.0.1:5055

Serves the premium dark dashboard and the cached stats. The page reads
data/store.json (instant, offline-safe); the Refresh button triggers a live
pull of every source. If the cache is missing, falls back to the kpi.py backbone
so the dashboard still renders something real on first run.
"""

import json
import threading

from flask import Flask, jsonify, render_template

import config
import refresh
from sources import kpi

app = Flask(__name__)
_refresh_lock = threading.Lock()


def load_store() -> dict:
    """Serve the cache; if absent, build a lightweight store from the backbone."""
    try:
        return json.loads(config.STORE_PATH.read_text())
    except (OSError, ValueError):
        pass
    backbone = kpi.fetch()
    if not backbone.get("available"):
        return {"empty": True, "hero": {}, "sources": {"kpi": "missing"}}
    cur = backbone.get("current", {})
    return {
        "generatedAt": None,
        "stale": True,
        "sources": {"kpi": "ok"},
        "hero": {
            "youtubeViews": cur.get("totalViews", 0),
            "subscribers": cur.get("subscribers", 0),
            "mrr": cur.get("mrr", 0),
            "skoolMembers": cur.get("skoolMembers", 0),
            "githubStars": 0,
            "socialReach": 0,
        },
        "youtube": {**backbone.get("youtube", {}), "videos": [], "totalVideos": 0},
        "revenue": backbone.get("revenue", {}),
        "reach": backbone.get("reach", {}),
        "websites": [],
        "github": {"total": 0, "repos": []},
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/stats")
def api_stats():
    return jsonify(load_store())


@app.route("/api/refresh", methods=["POST"])
def api_refresh():
    if not _refresh_lock.acquire(blocking=False):
        return jsonify({"error": "refresh already in progress"}), 409
    try:
        store = refresh.build_store()
        refresh.write_store(store)
        return jsonify(store)
    except Exception as e:  # never 500 the UI — report and keep the old cache
        return jsonify({"error": str(e)}), 500
    finally:
        _refresh_lock.release()


if __name__ == "__main__":
    print(f"\n  AI Mate OS → http://127.0.0.1:{config.PORT}\n")
    app.run(host="127.0.0.1", port=config.PORT, debug=False)
