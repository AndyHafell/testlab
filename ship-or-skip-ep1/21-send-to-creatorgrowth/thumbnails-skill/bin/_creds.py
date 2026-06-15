"""Credential loader for the creator-thumbnails skill.

Secrets live in ~/.creatorgrowth/credentials as simple KEY=VALUE lines.
Environment variables of the same name override the file. The skill writes the
file on first run after the creator pastes their key, so later runs just work.

Keys:
  FAL_KEY  — your fal.ai key (https://fal.ai/dashboard/keys), used to generate
             thumbnails with Nano Banana 2 (fal-ai/nano-banana-2).
"""
import os
from pathlib import Path

CREDS_PATH = Path.home() / ".creatorgrowth" / "credentials"


def load_creds() -> dict:
    creds = {}
    if CREDS_PATH.exists():
        for line in CREDS_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            creds[k.strip()] = v.strip()
    for k in ("FAL_KEY",):
        if os.environ.get(k):
            creds[k] = os.environ[k]
    return creds


def save_creds(updates: dict) -> None:
    """Merge `updates` into the creds file (chmod 600)."""
    CREDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = {}
    if CREDS_PATH.exists():
        for line in CREDS_PATH.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                existing[k.strip()] = v.strip()
    existing.update({k: v for k, v in updates.items() if v})
    CREDS_PATH.write_text("".join(f"{k}={v}\n" for k, v in existing.items()))
    try:
        os.chmod(CREDS_PATH, 0o600)
    except OSError:
        pass


def require(creds: dict, key: str, how: str) -> str:
    val = creds.get(key)
    if not val:
        raise SystemExit(f"MISSING_CREDENTIAL:{key}\n{how}")
    return val


if __name__ == "__main__":
    import sys
    c = load_creds()
    if len(sys.argv) > 1 and sys.argv[1] == "status":
        print("FAL_KEY:", "set" if c.get("FAL_KEY") else "MISSING")
    elif len(sys.argv) > 2 and sys.argv[1] == "save":
        ups = {}
        for pair in sys.argv[2:]:
            if "=" in pair:
                k, v = pair.split("=", 1)
                ups[k.strip()] = v.strip()
        save_creds(ups)
        print("saved:", ", ".join(ups.keys()))
