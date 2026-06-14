"""
Airtable — per-video results table (AI Mate OS › 📈 YT Main), live Skool member
breakdown (✔︎ Auto Tracker), and daily subscriber history (Subscriber Tracker).

The monthly business backbone comes from kpi.py; Airtable adds the granular,
per-record data the dashboard tables and sparklines need.
"""

import statistics

import requests

import config

API = "https://api.airtable.com/v0"


def _records(base: str, table: str, fields=None, sort=None, max_records=None) -> list:
    """Fetch all (paginated) records from a table. Returns [] on any failure."""
    if not config.AIRTABLE_TOKEN:
        return []
    headers = {"Authorization": f"Bearer {config.AIRTABLE_TOKEN}"}
    params = {"pageSize": 100}
    if fields:
        params["fields[]"] = fields
    if sort:
        params["sort[0][field]"] = sort[0]
        params["sort[0][direction]"] = sort[1]
    out, offset = [], None
    try:
        while True:
            if offset:
                params["offset"] = offset
            r = requests.get(f"{API}/{base}/{table}", headers=headers, params=params, timeout=30)
            if r.status_code != 200:
                break
            data = r.json()
            out.extend(data.get("records", []))
            offset = data.get("offset")
            if not offset or (max_records and len(out) >= max_records):
                break
        return out
    except requests.RequestException:
        return out


def _yt_thumb(video_id: str) -> str:
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" if video_id else ""


def fetch_videos(limit: int = 60) -> dict:
    """Per-video results table with outlier score vs the channel median."""
    recs = _records(config.OS_BASE, config.OS_TABLES["yt_videos"],
                    sort=("Views", "desc"), max_records=400)
    videos = []
    for r in recs:
        f = r.get("fields", {})
        vid = f.get("Content", "")
        views = int(f.get("Views") or 0)
        if not f.get("Video title"):
            continue
        videos.append({
            "id": vid,
            "title": f.get("Video title", ""),
            "views": views,
            "ctr": float(f.get("CTR (%)") or 0),
            "rpm": float(f.get("RPM (USD)") or 0),
            "impressions": int(f.get("Impressions") or 0),
            "avgViewDuration": int(f.get("Average view duration") or 0),
            "watchHours": round(float(f.get("Watch time (hours)") or 0)),
            "tier": f.get("Performance Tier", ""),
            "publishedAt": (f.get("Video publish time") or "")[:10],
            "thumb": _yt_thumb(vid),
            "url": f"https://youtu.be/{vid}" if vid else "",
            "status": "Published",
        })
    if not videos:
        return {"status": "error", "videos": [], "median": 0}

    median = statistics.median([v["views"] for v in videos]) or 1
    for v in videos:
        v["outlier"] = round(v["views"] / median, 1)
    videos.sort(key=lambda v: v["views"], reverse=True)
    return {"status": "ok", "videos": videos[:limit], "median": int(median),
            "totalVideos": len(videos)}


def fetch_members() -> dict:
    """Live Skool member breakdown by status (Paid / Legacy / Free / Cancelled)."""
    recs = _records(config.OS_BASE, config.OS_TABLES["auto_tracker"], fields=["Status"])
    if not recs:
        return {"status": "error", "breakdown": {}, "active": 0}
    breakdown = {}
    for r in recs:
        s = r.get("fields", {}).get("Status", "Unknown")
        breakdown[s] = breakdown.get(s, 0) + 1
    active = breakdown.get("Paid", 0) + breakdown.get("Legacy", 0)
    return {"status": "ok", "breakdown": breakdown, "active": active}


def fetch_daily_subs(limit: int = 120) -> dict:
    """Recent daily subscriber history for a sparkline."""
    recs = _records(config.OS_BASE, config.OS_TABLES["subs"],
                    fields=["Date", "Subscribers"], sort=("Date", "desc"),
                    max_records=limit)
    points = []
    for r in recs:
        f = r.get("fields", {})
        if f.get("Date") and f.get("Subscribers"):
            points.append({"date": f["Date"][:10], "value": int(f["Subscribers"])})
    points.reverse()  # oldest → newest
    return {"status": "ok" if points else "error", "subsDaily": points}
