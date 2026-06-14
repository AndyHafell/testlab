"""
KPI backbone — the cleanest monthly time-series on disk.

Reads analyticsmate/kpi_data.json (17 months through May-2026 + cohort retention)
and normalizes it into the shapes the dashboard consumes. This is the source of
record for monthly history; live APIs only refresh "as of now" numbers on top.
"""

import json
from pathlib import Path

import config


def _load_raw() -> dict:
    try:
        return json.loads(Path(config.KPI_DATA_PATH).read_text())
    except (OSError, ValueError):
        return {}


def _sorted_months(raw: dict) -> list:
    months = [m for m in raw.get("months", []) if m.get("sort_key")]
    months.sort(key=lambda m: m["sort_key"])  # oldest → newest
    return months


def fetch() -> dict:
    """Return monthly series + current totals + cohorts. Never raises."""
    raw = _load_raw()
    if not raw:
        return {"status": "missing", "available": False}

    months = _sorted_months(raw)
    current_subs = int(raw.get("current_subs") or 0)

    views_over_time, mrr_over_time, members_over_time = [], [], []
    ig_reach, fb_reach, yt_reach = [], [], []
    subs_gained = []
    for m in months:
        d = m["sort_key"]
        views_over_time.append({"date": d, "value": int(m.get("yt_views") or 0)})
        mrr_over_time.append({"date": d, "value": int(m.get("mrr") or 0)})
        members_over_time.append({"date": d, "value": int(m.get("skool_members") or 0)})
        ig_reach.append({"date": d, "value": int(m.get("ig_views") or 0)})
        fb_reach.append({"date": d, "value": int(m.get("fb_views") or 0)})
        yt_reach.append({"date": d, "value": int(m.get("yt_views") or 0)})
        subs_gained.append({"date": d, "value": int(m.get("yt_subs_gained") or 0)})

    # Reconstruct subscriber count at the end of each month, anchored to the
    # known current total: subs(M) = current_subs - sum(gained after M).
    subs_over_time = []
    if current_subs:
        trailing = 0
        running = []
        for m in reversed(months):  # newest → oldest
            end_of_month = current_subs - trailing
            running.append({"date": m["sort_key"], "value": max(end_of_month, 0)})
            trailing += int(m.get("yt_subs_gained") or 0)
        subs_over_time = list(reversed(running))

    latest = months[-1] if months else {}

    return {
        "status": "ok",
        "available": True,
        "current": {
            "subscribers": current_subs,
            "totalViews": int(raw.get("current_total_views") or 0),
            "mrr": int(latest.get("mrr") or 0),
            "skoolMembers": int(latest.get("skool_members") or 0),
            "pulledAt": raw.get("pulled_at"),
        },
        "youtube": {
            "viewsOverTime": views_over_time,
            "subsOverTime": subs_over_time,
            "subsGainedOverTime": subs_gained,
        },
        "revenue": {
            "mrrOverTime": mrr_over_time,
            "membersOverTime": members_over_time,
            "cohorts": raw.get("cohorts", {}),
        },
        "reach": {"instagram": ig_reach, "facebook": fb_reach, "youtube": yt_reach},
    }
