"""Render a bench of thumbnails locally with Gemini (Google AI Studio).

The skill writes a spec JSON, then runs:
    python3 render_thumbs.py spec.json

spec.json:
{
  "out_dir": "/abs/path/to/output",
  "model": "gemini-3.1-flash-image-preview",   # optional
  "style_ref": "/abs/path/to/style_ref.png",   # optional pasted-as-is reference
  "slots": [
    {"slot": 0, "name": "slot0_black_dahlia.png", "prompt": "full prompt text..."},
    ...
  ]
}

Generation is parallel. Each result is reported as JSON on stdout so the skill
knows which slots rendered (and can Read each PNG to guard against title-leak
gibberish before pushing).
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Ensure _creds (same bin/ dir) is importable regardless of caller CWD.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _creds import load_creds, require

DEFAULT_MODEL = "gemini-3.1-flash-image-preview"  # Nano Banana 2


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: render_thumbs.py spec.json")
    spec = json.loads(Path(sys.argv[1]).read_text())
    out_dir = Path(spec["out_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    model = spec.get("model") or DEFAULT_MODEL
    slots = spec["slots"]

    creds = load_creds()
    api_key = require(
        creds, "GOOGLE_AI_STUDIO_KEY",
        "Get a free key at https://aistudio.google.com/apikey and paste it when the skill asks.",
    )

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    style_ref_bytes = None
    if spec.get("style_ref") and Path(spec["style_ref"]).exists():
        style_ref_bytes = Path(spec["style_ref"]).read_bytes()

    def gen(slot):
        out = out_dir / slot["name"]
        parts = []
        if style_ref_bytes is not None:
            parts.append(types.Part.from_bytes(data=style_ref_bytes, mime_type="image/png"))
        parts.append(slot["prompt"])
        try:
            resp = client.models.generate_content(
                model=model,
                contents=parts,
                config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
            )
            for part in resp.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    out.write_bytes(part.inline_data.data)
                    return {"slot": slot["slot"], "name": slot["name"], "path": str(out), "ok": True}
            return {"slot": slot["slot"], "name": slot["name"], "ok": False, "error": "no image in response"}
        except Exception as e:  # one bad slot must not kill the bench
            return {"slot": slot["slot"], "name": slot["name"], "ok": False, "error": str(e)[:300]}

    with ThreadPoolExecutor(max_workers=4) as ex:
        results = list(ex.map(gen, slots))

    results.sort(key=lambda r: r["slot"])
    print(json.dumps({"out_dir": str(out_dir), "model": model, "results": results}, indent=2))


if __name__ == "__main__":
    main()
