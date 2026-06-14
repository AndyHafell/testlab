"""
Meta Graph — current-month Facebook + Instagram reach.

Facebook reach is NOT tracked in Airtable, so this is its source of record; the
monthly history still comes from the kpi.py backbone. Best-effort: any failure
returns zeros + an error status and the dashboard falls back to history.
"""

from datetime import datetime

import requests

import config

GRAPH = f"https://graph.facebook.com/{config.META_API_VERSION}"


def _month_bounds() -> tuple[str, str]:
    now = datetime.now()
    return now.replace(day=1).strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d")


def _instagram(token: str) -> int | None:
    since, until = _month_bounds()
    try:
        r = requests.get(
            f"{GRAPH}/{config.META_IG_ID}/insights",
            params={"metric": "views", "period": "day", "since": since,
                    "until": until, "access_token": token},
            timeout=30,
        )
        data = r.json()
        return sum(v["value"] for v in data["data"][0]["values"])
    except (requests.RequestException, KeyError, IndexError, TypeError):
        return None


def _facebook(token: str) -> int | None:
    current_ym = datetime.now().strftime("%Y-%m")
    try:
        pr = requests.get(
            f"{GRAPH}/{config.META_FB_PAGE_ID}",
            params={"fields": "access_token", "access_token": token}, timeout=20,
        ).json()
        page_token = pr.get("access_token") or token
        r = requests.get(
            f"{GRAPH}/{config.META_FB_PAGE_ID}/video_reels",
            params={"fields": "id,created_time,views", "limit": 100,
                    "access_token": page_token}, timeout=30,
        ).json()
        total = 0
        for reel in r.get("data", []):
            if reel.get("created_time", "")[:7] == current_ym:
                total += reel.get("views", 0)
        return total
    except (requests.RequestException, KeyError, TypeError):
        return None


def fetch() -> dict:
    """Return {status, instagramMonth, facebookMonth}. Never raises."""
    token = config.META_TOKEN
    if not token:
        return {"status": "missing"}
    ig = _instagram(token)
    fb = _facebook(token)
    if ig is None and fb is None:
        return {"status": "error"}
    return {
        "status": "ok" if (ig is not None and fb is not None) else "partial",
        "instagramMonth": ig or 0,
        "facebookMonth": fb or 0,
    }
