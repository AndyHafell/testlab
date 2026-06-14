#!/usr/bin/env python3
"""
AI Mate OS — refresh. Pull every source, merge into data/store.json, and append
a dated snapshot to data/history/ so short-retention metrics (Cloudflare) build
long-term history.

  python refresh.py            # pull everything, write the cache

Each source is isolated: one dead token never blanks the dashboard — the merge
keeps the kpi.py backbone and flags the failed source so the UI can show it.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import config
from sources import airtable, cloudflare, github, kpi, meta, sites_custom, youtube


def _history_sparkline(domain: str) -> list:
    """Build a visitor sparkline for a domain from accumulated daily snapshots."""
    points = {}
    if not config.HISTORY_DIR.exists():
        return []
    for f in sorted(config.HISTORY_DIR.glob("*.json")):
        try:
            snap = json.loads(f.read_text())
        except (OSError, ValueError):
            continue
        for s in snap.get("websites", []):
            if s.get("domain") == domain and s.get("status") == "ok":
                points[snap.get("date", f.stem)] = s.get("visitors", 0)
    return [{"date": d, "value": v} for d, v in sorted(points.items())]


def _merge_sites(cf_sites: list) -> list:
    """Bring custom (non-Cloudflare) domains online; give flat-count sites a
    sparkline from history so they trend over time."""
    sites = []
    for s in cf_sites:
        if s.get("status") != "ok":
            custom = sites_custom.fetch_one(s["domain"])
            if custom:
                s = custom
        # If a site has no time-series of its own, synthesize one from history.
        if s.get("status") == "ok" and not s.get("sparkline"):
            hist = _history_sparkline(s["domain"])
            s["sparkline"] = hist + [{"date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                                      "value": s.get("visitors", 0)}]
        sites.append(s)
    return sites


def build_store() -> dict:
    kpi_d = kpi.fetch()
    yt_d = youtube.fetch()
    gh_d = github.fetch()
    meta_d = meta.fetch()
    cf_d = cloudflare.fetch()
    videos_d = airtable.fetch_videos()
    members_d = airtable.fetch_members()
    subs_daily_d = airtable.fetch_daily_subs()

    backbone = kpi_d if kpi_d.get("available") else {}
    cur = backbone.get("current", {})
    yt_series = backbone.get("youtube", {})
    rev = backbone.get("revenue", {})
    reach = backbone.get("reach", {"instagram": [], "facebook": [], "youtube": []})

    # Live overrides on top of the historical backbone.
    subscribers = yt_d.get("subscribers") if yt_d.get("status") == "ok" else cur.get("subscribers", 0)
    total_views = yt_d.get("totalViews") if yt_d.get("status") == "ok" else cur.get("totalViews", 0)
    total_videos = yt_d.get("totalVideos") or videos_d.get("totalVideos", 0)
    members_active = members_d.get("active", 0) if members_d.get("status") == "ok" else 0
    skool_members = members_active or cur.get("skoolMembers", 0)

    # Reach: current-month overrides from Meta where available.
    if meta_d.get("status") in ("ok", "partial"):
        if meta_d.get("instagramMonth") and reach.get("instagram"):
            reach["instagram"][-1]["value"] = meta_d["instagramMonth"]
        if meta_d.get("facebookMonth") and reach.get("facebook"):
            reach["facebook"][-1]["value"] = meta_d["facebookMonth"]
    # Hero "Social Reach" = all-time IG + FB views (distinct from YouTube).
    social_reach = (sum(p["value"] for p in reach.get("instagram", []))
                    + sum(p["value"] for p in reach.get("facebook", [])))

    store = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "kpi": kpi_d.get("status", "missing"),
            "youtube": yt_d.get("status", "error"),
            "github": gh_d.get("status", "error"),
            "meta": meta_d.get("status", "missing"),
            "cloudflare": cf_d.get("status", "error"),
            "airtable": videos_d.get("status", "error"),
        },
        "hero": {
            "youtubeViews": total_views,
            "subscribers": subscribers,
            "mrr": cur.get("mrr", 0),
            "skoolMembers": skool_members,
            "githubStars": gh_d.get("total", 0),
            "socialReach": social_reach,
        },
        "youtube": {
            "viewsOverTime": yt_series.get("viewsOverTime", []),
            "subsOverTime": yt_series.get("subsOverTime", []),
            "subsGainedOverTime": yt_series.get("subsGainedOverTime", []),
            "subsDaily": subs_daily_d.get("subsDaily", []),
            "totalVideos": total_videos,
            "videos": videos_d.get("videos", []),
            "median": videos_d.get("median", 0),
        },
        "revenue": {
            "mrrOverTime": rev.get("mrrOverTime", []),
            "membersOverTime": rev.get("membersOverTime", []),
            "memberBreakdown": members_d.get("breakdown", {}),
            "cohorts": rev.get("cohorts", {}),
        },
        "reach": {
            "youtube": reach.get("youtube", []),
            "instagram": reach.get("instagram", []),
            "facebook": reach.get("facebook", []),
        },
        "websites": _merge_sites(cf_d.get("sites", [])),
        "github": {"total": gh_d.get("total", 0), "repos": gh_d.get("repos", [])},
    }
    return store


def write_store(store: dict) -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    config.HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    config.STORE_PATH.write_text(json.dumps(store, indent=2))

    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snapshot = {
        "date": day,
        "hero": store["hero"],
        "websites": [{"domain": s["domain"], "visitors": s.get("visitors", 0),
                      "pageViews": s.get("pageViews", 0), "status": s.get("status")}
                     for s in store["websites"]],
    }
    (config.HISTORY_DIR / f"{day}.json").write_text(json.dumps(snapshot, indent=2))


def main() -> None:
    print("AI Mate OS — refreshing all sources…")
    store = build_store()
    write_store(store)
    s = store["sources"]
    print("  sources:", ", ".join(f"{k}={v}" for k, v in s.items()))
    h = store["hero"]
    print(f"  hero: {h['subscribers']:,} subs · {h['youtubeViews']:,} views · "
          f"${h['mrr']:,} MRR · {h['skoolMembers']} members · {h['githubStars']} stars")
    print(f"  wrote {config.STORE_PATH}")


if __name__ == "__main__":
    main()
