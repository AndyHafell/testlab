"""
AI Mate OS — central config.

Secrets are READ FROM EXISTING env files in place. Nothing is copied into this
repo and nothing is committed. Paths can be overridden with environment vars so
the app is portable, but the defaults point at Andy's machine.

  AIMATE_ENV_FILE       → main .env (Airtable, Meta, YouTube key, AWS, …)
  AIMATE_MINDFLOW_ENV   → ~/.mindflow.env (Cloudflare token + zone for mindflow)
  AIMATE_YT_TOKEN       → youtube_token.pickle (YouTube OAuth)
  AIMATE_KPI_DATA       → analyticsmate/kpi_data.json (Skool cohort history)
"""

import os
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
HOME = Path.home()
PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
HISTORY_DIR = DATA_DIR / "history"
STORE_PATH = DATA_DIR / "store.json"
SEED_PATH = DATA_DIR / "seed.json"

CLAUDE_FOLDER = Path(
    os.environ.get("AIMATE_CLAUDE_FOLDER", HOME / "Documents" / "Claude Folder")
)
ENV_FILE = Path(os.environ.get("AIMATE_ENV_FILE", CLAUDE_FOLDER / ".env"))
MINDFLOW_ENV_FILE = Path(os.environ.get("AIMATE_MINDFLOW_ENV", HOME / ".mindflow.env"))
YT_TOKEN_PATH = Path(
    os.environ.get("AIMATE_YT_TOKEN", CLAUDE_FOLDER / "youtube_token.pickle")
)
KPI_DATA_PATH = Path(
    os.environ.get(
        "AIMATE_KPI_DATA",
        CLAUDE_FOLDER / "projects" / "analyticsmate" / "kpi_data.json",
    )
)

# ── Env loading (tolerates `export KEY=val`, quotes, comments) ─────────────────
def parse_env_file(path: Path) -> dict:
    env = {}
    try:
        text = Path(path).read_text()
    except OSError:
        return env
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            env[key] = val
    return env


# Merge: main .env first, then mindflow (mindflow keys win for CF), then real
# process environment (so an operator can override anything at runtime).
ENV: dict = {}
ENV.update(parse_env_file(ENV_FILE))
ENV.update(parse_env_file(MINDFLOW_ENV_FILE))
ENV.update({k: v for k, v in os.environ.items() if k in ENV or k.startswith("AIMATE_")})


def env(key: str, default: str = "") -> str:
    return ENV.get(key, os.environ.get(key, default))


# ── Airtable ──────────────────────────────────────────────────────────────────
AIRTABLE_TOKEN = env("AIRTABLE_PERSONAL_ACCESS_TOKEN")

# Base: "📈 Analytics Mate v1.6" — time-series snapshots
AM_BASE = "appilViGQ4Nej1hqH"
AM_TABLES = {
    "yt_main": "tblYSdspMS5jxKilH",   # Subscribers, Total Views, Total Videos, Date, gains
    "yt_shorts": "tblOqsMFLYPL8aSRy",
    "ig": "tblE1hNUxC8WvyCrr",         # Followers, Total Media, Date, gains
    "x": "tblsgv0CVZETjcCrI",          # Followers, Favorites, Date, gains
    "kpi": "tblrbEhC2oE5fmnWI",        # Month, Skool Income, Paid Members, Cash, Churn, …
}

# Base: "🎯 AI Mate OS — Andy (v0.2)"
OS_BASE = "appghTjP5qs7AyO4z"
OS_TABLES = {
    "auto_tracker": "tblWigVAZ5BlzS59r",   # Skool members (Status, JoinedDate, Price)
    "yt_videos": "tbl598uTPdtC7cNZz",       # per-video performance
    "subs": "tblU6ITgua05UoSAA",            # daily subscriber tracker
    "sales": "tbl7zagKOkTUqKWwp",           # cash / revenue
    "channels": "tbl51RfGhA1UzDIC4",
}

# ── YouTube ───────────────────────────────────────────────────────────────────
YT_MAIN_CHANNEL_ID = "UCn2RJFAA1ndipnVJsYAwWOw"
YT_DATA_KEY = env("Youtube_data_key")

# ── Meta (Facebook + Instagram) ───────────────────────────────────────────────
META_TOKEN = env("META_ACCESS_TOKEN")
META_IG_ID = env("META_IG_ACCOUNT_ID", "17841455357129006")
META_FB_PAGE_ID = env("META_FB_PAGE_ID", "1512666705493261")
META_API_VERSION = "v25.0"

# ── GitHub ────────────────────────────────────────────────────────────────────
GITHUB_USER = os.environ.get("AIMATE_GITHUB_USER", "AndyHafell")

# ── Cloudflare websites ───────────────────────────────────────────────────────
# mindflow.fyi works now via ~/.mindflow.env. Drop the other zone IDs in here
# (and an account-scoped token in CLOUDFLARE_API_TOKEN) to bring them live.
CLOUDFLARE_TOKEN = env("CLOUDFLARE_API_TOKEN")
WEBSITES = [
    {"domain": "mindflow.fyi", "zone_id": env("CLOUDFLARE_ZONE_ID")},
    {"domain": "agentflow.net", "zone_id": os.environ.get("AIMATE_ZONE_AGENTFLOW", "")},
    {"domain": "creatorgrowth.com", "zone_id": os.environ.get("AIMATE_ZONE_CREATORGROWTH", "")},
    {"domain": "screenpost.io", "zone_id": os.environ.get("AIMATE_ZONE_SCREENPOST", "")},
]

# ── App ───────────────────────────────────────────────────────────────────────
PORT = int(os.environ.get("AIMATE_PORT", "5055"))
