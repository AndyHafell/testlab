"""Push a packaged bench (titles + thumbnail PNGs) into the creator's own
CreatorGrowth tenant via POST /api/cards/push-bench.

The skill writes a bench JSON, then runs:
    python3 push_to_cg.py bench.json

bench.json:
{
  "card_title": "optional, defaults to titles[0]",
  "status": "packaging",
  "slots": [
    {"title": "The Black Dahlia Murder", "thumb": "/abs/path/slot0.png"},
    {"title": "Buried Alive",            "thumb": "/abs/path/slot1.png"},
    {"title": "Title with no thumb yet", "thumb": null}
  ]
}

Slots are pushed in order (slot i = title i + thumb i). A null/missing thumb
pushes that title with an empty slot (title-only). Auth uses the cached
CG_API_TOKEN. Prints the CG response.
"""
import base64
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _creds import load_creds, require


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: push_to_cg.py bench.json")
    bench = json.loads(Path(sys.argv[1]).read_text())
    slots = bench["slots"][:9]

    creds = load_creds()
    token = require(
        creds, "CG_API_TOKEN",
        "In CreatorGrowth: Settings -> API Access -> Generate, copy the cg_ token, "
        "and paste it when the skill asks.",
    )
    base = creds["CG_BASE_URL"].rstrip("/")

    titles, thumbs = [], []
    for s in slots:
        titles.append((s.get("title") or "").strip())
        tp = s.get("thumb")
        if tp and Path(tp).exists():
            thumbs.append(base64.b64encode(Path(tp).read_bytes()).decode("ascii"))
        else:
            thumbs.append("")

    payload = {
        "card_title": bench.get("card_title") or next((t for t in titles if t), ""),
        "status": bench.get("status") or "packaging",
        "titles": titles,
        "thumbnails": thumbs,
        # append=True NEVER overwrites existing slots — it fills below the last
        # used one. Set it whenever you're adding to a card that already has a
        # bench (e.g. extending 6 → 15). Omit/false only for the first push.
        "append": bool(bench.get("append")),
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/api/cards/push-bench",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # CG sits behind Cloudflare; a custom UA avoids edge UA blocks.
            "User-Agent": "creator-packaging-skill/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"PUSH FAILED ({e.code}): {body}")
    except urllib.error.URLError as e:
        raise SystemExit(f"PUSH FAILED (network): {e}")

    filled = body.get("slots_filled", 0)
    card = body.get("card", {})
    print(json.dumps({
        "ok": body.get("ok"),
        "card_title": card.get("title"),
        "video_id": card.get("video_id"),
        "slots_filled": filled,
        "titles_pushed": sum(1 for t in titles if t),
        "open_at": f"{base}/  (Packaging tab)",
    }, indent=2))


if __name__ == "__main__":
    main()
