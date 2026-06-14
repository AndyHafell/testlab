# ◆ AI Mate OS

A standalone, premium **dark dashboard** that pulls **every business number** into one page:
YouTube, Skool/MRR, Instagram, Facebook, GitHub stars, and website visitors — big animated hero
tiles, animated time-series, a sortable per-video results table. One runnable app for **aimateos.com**.

## Run

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python refresh.py     # pull every source → data/store.json
python app.py         # → http://127.0.0.1:5055
```

The page reads the cached `data/store.json` (instant, offline-safe). The **Refresh** button (or
`python refresh.py`) re-pulls everything live and re-caches, appending a dated snapshot to
`data/history/` so short-retention sources (Cloudflare = 30 days) build long-term history.

## Where the numbers come from

| Number | Source | Live? |
|---|---|---|
| YouTube subs / total views / videos | YouTube Data API (OAuth token) + monthly backbone | ✅ |
| YouTube views / subs over time, MRR, members, reach, cohorts | `analyticsmate/kpi_data.json` (17 months) | ✅ |
| Per-video results (CTR, RPM, watch hrs, outlier ×) | Airtable · *AI Mate OS › 📈 YT Main* | ✅ |
| Skool member mix (Paid/Legacy/Free/Cancelled) | Airtable · *✔︎ Auto Tracker* | ✅ |
| Instagram / Facebook reach | `kpi_data.json` history + Meta Graph (current month) | ✅ |
| GitHub stars per repo + total | `gh` CLI / GitHub REST (`AndyHafell`) | ✅ |
| Website visitors | Cloudflare GraphQL (auto-discovers zones) + per-site endpoints | ✅ mindflow.fyi, agentflow.net (CF); creatorgrowth.com (its `/api/visitors`); screenpost.io parked |

**Secrets are read from existing env files in place** — nothing is copied into this repo or committed:
- `~/Documents/Claude Folder/.env` (Airtable, Meta, YouTube key)
- `~/.mindflow.env` (Cloudflare token + zone)
- `~/Documents/Claude Folder/youtube_token.pickle` (YouTube OAuth)

Override any path with env vars (`AIMATE_ENV_FILE`, `AIMATE_KPI_DATA`, `AIMATE_PORT`, …) — see `config.py`.

## Websites

- **mindflow.fyi** + **agentflow.net** — pulled via Cloudflare GraphQL. The source
  auto-discovers each zone ID from your account, so any domain you add to Cloudflare
  just appears on the next refresh (no config needed).
- **creatorgrowth.com** — not on Cloudflare (Namecheap DNS, gunicorn). Pulled from its own
  public `/api/visitors` endpoint (all-time unique visitors). See `sources/sites_custom.py`
  to add more self-hosted domains the same way.
- **screenpost.io** — currently parked (resolves to a Namecheap holding IP, not serving).
  It will connect automatically once it's live on Cloudflare or exposes a visitor endpoint.

Flat-count sites (like creatorgrowth) get a sparkline built from `data/history/` — it grows a
real trend line as you refresh over time.

## Architecture

```
app.py            Flask: / , /api/stats (serve cache), /api/refresh (live pull)
refresh.py        orchestrates all sources → store.json (+ history), graceful per-source failure
sources/          airtable · youtube · meta · github · cloudflare · kpi (monthly backbone)
config.py         paths + base/table/zone IDs (secrets read from existing .env files)
templates/ static/  one premium dark page, vanilla JS + hand-rolled animated SVG charts
```

No build step. Zero frontend dependencies. Each source fails independently — a dead token never
blanks the dashboard.
