"""
Cloudflare GraphQL Analytics — website visitors per domain (same pattern as
mindflow/stats.sh). Cloudflare only retains ~30 days, so refresh.py appends each
pull to data/history/ to build long-term history the dashboard can chart.

mindflow.fyi is live via ~/.mindflow.env. The other domains render as
"not connected" until their zone_id (and an account-scoped token) are configured.
"""

from datetime import datetime, timedelta, timezone

import requests

import config

ENDPOINT = "https://api.cloudflare.com/client/v4/graphql"
ZONES_ENDPOINT = "https://api.cloudflare.com/client/v4/zones"

QUERY = """
query ($zone: String!, $start: String!, $end: String!) {
  viewer {
    zones(filter: {zoneTag: $zone}) {
      httpRequests1dGroups(limit: 60, orderBy: [date_ASC],
        filter: {date_geq: $start, date_leq: $end}) {
        dimensions { date }
        sum { requests pageViews countryMap { clientCountryName requests } }
        uniq { uniques }
      }
    }
  }
}
"""


def _zone_map(token: str) -> dict:
    """Map {domain: zone_id} for every zone the token can see (account-wide)."""
    try:
        r = requests.get(ZONES_ENDPOINT, headers={"Authorization": f"Bearer {token}"},
                         params={"per_page": 50}, timeout=20)
        data = r.json()
        if not data.get("success"):
            return {}
        return {z["name"]: z["id"] for z in data.get("result", [])}
    except (requests.RequestException, KeyError, TypeError, ValueError):
        return {}


def _fetch_zone(zone_id: str, token: str, days: int = 30) -> dict | None:
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    try:
        r = requests.post(
            ENDPOINT,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"query": QUERY, "variables": {
                "zone": zone_id, "start": start.isoformat(), "end": end.isoformat()}},
            timeout=30,
        )
        data = r.json()
        if not data.get("data") or data.get("errors"):
            return None
        zones = data["data"]["viewer"]["zones"]
        if not zones:
            return None
        return zones[0]["httpRequests1dGroups"]
    except (requests.RequestException, KeyError, TypeError, ValueError):
        return None


def fetch() -> dict:
    """Return {status, sites:[{domain, visitors, pageViews, sparkline, topCountries, status}]}."""
    token = config.CLOUDFLARE_TOKEN
    zone_map = _zone_map(token) if token else {}
    sites, any_ok = [], False
    for site in config.WEBSITES:
        domain = site["domain"]
        # Prefer an explicit override, else auto-resolve the zone from the account.
        zone_id = site.get("zone_id") or zone_map.get(domain, "")
        if not zone_id or not token:
            sites.append({"domain": domain, "status": "not_connected",
                          "visitors": 0, "pageViews": 0, "sparkline": [], "topCountries": []})
            continue
        groups = _fetch_zone(zone_id, token)
        if groups is None:
            sites.append({"domain": domain, "status": "error",
                          "visitors": 0, "pageViews": 0, "sparkline": [], "topCountries": []})
            continue
        any_ok = True
        visitors = page_views = 0
        sparkline, countries = [], {}
        for g in groups:
            uniq = int(g.get("uniq", {}).get("uniques") or 0)
            pv = int(g.get("sum", {}).get("pageViews") or 0)
            visitors += uniq
            page_views += pv
            sparkline.append({"date": g.get("dimensions", {}).get("date", ""), "value": uniq})
            for c in g.get("sum", {}).get("countryMap", []):
                name = c.get("clientCountryName", "??")
                countries[name] = countries.get(name, 0) + int(c.get("requests") or 0)
        top = sorted(countries.items(), key=lambda kv: kv[1], reverse=True)[:5]
        sites.append({
            "domain": domain, "status": "ok",
            "visitors": visitors, "pageViews": page_views,
            "sparkline": sparkline,
            "topCountries": [{"country": k, "requests": v} for k, v in top],
        })
    return {"status": "ok" if any_ok else "partial", "sites": sites}
