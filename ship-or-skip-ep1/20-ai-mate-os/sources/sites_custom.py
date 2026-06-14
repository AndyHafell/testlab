"""
Custom website sources — for domains not behind Cloudflare that expose their own
visitor endpoint. creatorgrowth.com is your own Flask app and serves an all-time
unique-visitor count at /api/visitors (public, no auth).

Cloudflare gives 30-day windows + sparklines; these give a single live count, so
refresh.py builds their sparkline from our accumulating data/history/ snapshots.
"""

import requests

# domain → how to pull its visitor count
CUSTOM = {
    "creatorgrowth.com": {
        "url": "https://creatorgrowth.com/api/visitors",
        "field": "visitors",
        "note": "all-time uniques",
    },
}


def fetch_one(domain: str) -> dict | None:
    """Return a website-card dict for a known custom domain, or None."""
    spec = CUSTOM.get(domain)
    if not spec:
        return None
    try:
        r = requests.get(spec["url"], timeout=20)
        if r.status_code != 200:
            return None
        n = int(r.json().get(spec["field"], 0))
    except (requests.RequestException, ValueError, TypeError):
        return None
    return {
        "domain": domain, "status": "ok", "visitors": n, "pageViews": 0,
        "sparkline": [], "topCountries": [], "note": spec["note"],
    }
