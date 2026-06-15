"""Render thumbnails with Nano Banana 2 on fal.ai.

Uses fal's REST queue API over stdlib urllib only — no pip install needed.
The skill writes a spec JSON, then runs:
    python3 render_fal.py spec.json

spec.json:
{
  "out_dir": "/abs/output",
  "model": "fal-ai/nano-banana-2",     # optional (default below)
  "aspect_ratio": "16:9",              # optional
  "resolution": "2K",                  # optional: 0.5K|1K|2K|4K
  "slots": [
    {"slot": 0, "name": "v1_black_dahlia.png", "prompt": "full prompt..."},
    ...
  ]
}

Renders all slots in parallel; prints JSON results so the caller knows which
rendered (and can Read each PNG to guard before using them).
"""
import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _creds import load_creds, require

DEFAULT_MODEL = "fal-ai/nano-banana-2"   # Gemini 3.1 Flash Image, via fal
QUEUE_BASE = "https://queue.fal.run"
POLL_SECONDS = 2
TIMEOUT_SECONDS = 180


def _req(url, key, method="GET", body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Key {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: render_fal.py spec.json")
    spec = json.loads(Path(sys.argv[1]).read_text())
    out_dir = Path(spec["out_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    model = spec.get("model") or DEFAULT_MODEL
    aspect_ratio = spec.get("aspect_ratio") or "16:9"
    resolution = spec.get("resolution") or "2K"
    slots = spec["slots"]

    creds = load_creds()
    key = require(
        creds, "FAL_KEY",
        "Get your fal.ai key at https://fal.ai/dashboard/keys and paste it when the skill asks.",
    )

    submit_url = f"{QUEUE_BASE}/{model}"

    def gen(slot):
        out = out_dir / slot["name"]
        payload = {
            "prompt": slot["prompt"],
            "num_images": 1,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "output_format": "png",
        }
        try:
            sub = _req(submit_url, key, method="POST", body=payload)
            status_url = sub.get("status_url")
            response_url = sub.get("response_url")
            if not status_url or not response_url:
                return {"slot": slot["slot"], "name": slot["name"], "ok": False,
                        "error": f"unexpected submit response: {str(sub)[:200]}"}
            # Poll until COMPLETED.
            deadline = time.monotonic() + TIMEOUT_SECONDS
            while True:
                st = _req(status_url, key)
                status = st.get("status")
                if status == "COMPLETED":
                    break
                if status in ("FAILED", "ERROR"):
                    return {"slot": slot["slot"], "name": slot["name"], "ok": False,
                            "error": f"fal status {status}"}
                if time.monotonic() > deadline:
                    return {"slot": slot["slot"], "name": slot["name"], "ok": False,
                            "error": "timed out waiting for fal"}
                time.sleep(POLL_SECONDS)
            result = _req(response_url, key)
            images = result.get("images") or []
            if not images or not images[0].get("url"):
                return {"slot": slot["slot"], "name": slot["name"], "ok": False,
                        "error": f"no image url in result: {str(result)[:200]}"}
            img_url = images[0]["url"]
            with urllib.request.urlopen(img_url, timeout=60) as imgresp:
                out.write_bytes(imgresp.read())
            return {"slot": slot["slot"], "name": slot["name"], "path": str(out), "ok": True}
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            return {"slot": slot["slot"], "name": slot["name"], "ok": False,
                    "error": f"HTTP {e.code}: {detail}"}
        except Exception as e:
            return {"slot": slot["slot"], "name": slot["name"], "ok": False, "error": str(e)[:300]}

    with ThreadPoolExecutor(max_workers=4) as ex:
        results = list(ex.map(gen, slots))
    results.sort(key=lambda r: r["slot"])
    print(json.dumps({"out_dir": str(out_dir), "model": model, "results": results}, indent=2))


if __name__ == "__main__":
    main()
