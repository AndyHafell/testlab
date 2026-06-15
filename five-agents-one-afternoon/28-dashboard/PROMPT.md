# Creator Intelligence Dashboard (#28)

A patch-style build: one agent, one isolated worktree, the same one-shot brief
pointed at a private production SaaS. Point this prompt at **your own** app — the
patch below is the proof of exactly what the model wrote.

The one-shot prompt:

```
Add a "Creator Intelligence" dashboard to my app — one dark, premium,
auto-refreshing page showing every key creator-business stat in one place, all
from real data (no placeholders):

- Hero tiles: subscribers, total views, MRR, community members, retention %,
  videos shipped this month — each with a month-over-month delta.
- An MRR + members trajectory chart over the last ~18 months.
- Per-video YouTube performance (top videos, outlier scores) pulled from my real
  video data.
- Cross-platform reach (Instagram / Facebook views) and website-visitor stats
  with 30 / 90 / all-time windows (source = Cloudflare, but persist to my own DB
  so I keep history beyond what Cloudflare retains).
- A content-pipeline view (what's in each stage) and GitHub stars.

Read the business KPIs live from a JSON file on every refresh, and the per-video
+ pipeline data from my existing SQLite DB via the DB helper I already have.
Gate the whole page behind my existing admin check; unauthenticated hits get 401.
Charts must be hand-rolled inline SVG with CSS animation — no CDN, works offline.
The page should poll for fresh data every ~45s and re-render. Don't touch my
existing main template; add a new route + template. Ship it with the data
aggregator endpoint and make every section degrade gracefully if a source is
missing.
```

**What you get:** `dashboard.patch` — a `git diff` of **only** the dashboard
feature against the app's main branch: the new `/dashboard` route + `/api/dashboard`
aggregator in `app.py`, and the new `dashboard.html` template. The app is a
private SaaS, so the server side ships as a patch, not full source — apply the
same idea to your own app.

> Internal account IDs (Airtable base/table, Meta IG account) were the agent's
> real values; they're replaced with `PLACEHOLDER_*` here. They're read from env
> vars — set your own.
