"""Shared credential loader for the creator-packaging skill.

Secrets live in ~/.creatorgrowth/credentials as simple KEY=VALUE lines.
Environment variables of the same name override the file. The skill writes the
file on first run after the creator pastes their token(s) into Claude Code, so
subsequent runs "just work".

Keys:
  CG_API_TOKEN          — the cg_ token from CreatorGrowth → Settings → API Access
  GOOGLE_AI_STUDIO_KEY  — a Google AI Studio (Gemini) key for image generation
  CG_BASE_URL           — optional; defaults to https://creatorgrowth.com
"""
import os
from pathlib import Path

CREDS_PATH = Path.home() / ".creatorgrowth" / "credentials"
DEFAULT_BASE_URL = "https://creatorgrowth.com"


def load_creds() -> dict:
    creds = {}
    if CREDS_PATH.exists():
        for line in CREDS_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            creds[k.strip()] = v.strip()
    # Env always wins.
    for k in ("CG_API_TOKEN", "GOOGLE_AI_STUDIO_KEY", "CG_BASE_URL"):
        if os.environ.get(k):
            creds[k] = os.environ[k]
    creds.setdefault("CG_BASE_URL", DEFAULT_BASE_URL)
    return creds


def save_creds(updates: dict) -> None:
    """Merge `updates` into the creds file (chmod 600). Used by the skill after
    the creator pastes a token."""
    CREDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = {}
    if CREDS_PATH.exists():
        for line in CREDS_PATH.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                existing[k.strip()] = v.strip()
    existing.update({k: v for k, v in updates.items() if v})
    body = "".join(f"{k}={v}\n" for k, v in existing.items())
    CREDS_PATH.write_text(body)
    try:
        os.chmod(CREDS_PATH, 0o600)
    except OSError:
        pass


def require(creds: dict, key: str, how: str) -> str:
    val = creds.get(key)
    if not val:
        raise SystemExit(
            f"MISSING_CREDENTIAL:{key}\n{how}"
        )
    return val


if __name__ == "__main__":
    # `python3 _creds.py status` → which creds are present (never prints values).
    import sys
    c = load_creds()
    if len(sys.argv) > 1 and sys.argv[1] == "status":
        print("CG_API_TOKEN:", "set" if c.get("CG_API_TOKEN") else "MISSING")
        print("GOOGLE_AI_STUDIO_KEY:", "set" if c.get("GOOGLE_AI_STUDIO_KEY") else "MISSING")
        print("CG_BASE_URL:", c.get("CG_BASE_URL"))
    elif len(sys.argv) > 2 and sys.argv[1] == "save":
        # python3 _creds.py save KEY=VALUE [KEY=VALUE ...]
        ups = {}
        for pair in sys.argv[2:]:
            if "=" in pair:
                k, v = pair.split("=", 1)
                ups[k.strip()] = v.strip()
        save_creds(ups)
        print("saved:", ", ".join(ups.keys()))
