"""
YouTube — current channel stats "as of right now".

Preferred: OAuth token pickle → Data API v3 (exact subs + total views).
Fallback: the public Data API key in .env.
If neither works, refresh.py keeps the kpi.py backbone numbers.
"""

import pickle

import requests

import config


def _via_oauth() -> dict | None:
    try:
        from googleapiclient.discovery import build
        from google.auth.transport.requests import Request

        with open(config.YT_TOKEN_PATH, "rb") as f:
            creds = pickle.load(f)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
        yt = build("youtube", "v3", credentials=creds)
        resp = yt.channels().list(part="statistics", id=config.YT_MAIN_CHANNEL_ID).execute()
        stats = resp["items"][0]["statistics"]
        return {
            "subscribers": int(stats["subscriberCount"]),
            "totalViews": int(stats["viewCount"]),
            "totalVideos": int(stats.get("videoCount") or 0),
        }
    except Exception:
        return None


def _via_key() -> dict | None:
    if not config.YT_DATA_KEY:
        return None
    try:
        r = requests.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "statistics", "id": config.YT_MAIN_CHANNEL_ID,
                    "key": config.YT_DATA_KEY},
            timeout=20,
        )
        if r.status_code != 200:
            return None
        stats = r.json()["items"][0]["statistics"]
        return {
            "subscribers": int(stats["subscriberCount"]),
            "totalViews": int(stats["viewCount"]),
            "totalVideos": int(stats.get("videoCount") or 0),
        }
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return None


def fetch() -> dict:
    """Return current channel stats. Never raises."""
    data = _via_oauth() or _via_key()
    if not data:
        return {"status": "error"}
    data["status"] = "ok"
    return data
