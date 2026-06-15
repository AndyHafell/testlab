#!/usr/bin/env python3
"""
OpenRouter A/B test harness
===========================

Sends the SAME prompt to two models via the OpenRouter API and captures, for each:
  - the full response text
  - token usage (prompt / completion / total)
  - cost (USD, reported inline by OpenRouter)
  - latency (wall-clock seconds)
  - any returned ``` code blocks ``` saved to files

Models compared (override with --models):
  1. openrouter/fusion          - OpenRouter's multi-model composite (panel + web search + synthesis)
  2. anthropic/claude-opus-4.8  - a single frontier model

The API key is read from OPENROUTER_API_KEY: a `.env` file next to this script,
then the environment. If the key is missing, the harness still builds all output artifacts (a "pending"
results.js the viewer can render) and skips the network call gracefully, so it
runs end-to-end the instant the key lands.

Usage:
    python3 ab_test.py                          # default prompt
    python3 ab_test.py "your prompt here"       # inline prompt
    python3 ab_test.py --prompt-file brief.md   # prompt from a file
    python3 ab_test.py --models openrouter/fusion,anthropic/claude-opus-4.8
    python3 ab_test.py --max-tokens 16000

Only the Python standard library is used - no pip install required.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

# Looks for a `.env` next to this script; falls back to the environment.
ENV_PATH = Path(__file__).resolve().parent / ".env"
ENV_KEY = "OPENROUTER_API_KEY"

API_URL = "https://openrouter.ai/api/v1/chat/completions"
GENERATION_URL = "https://openrouter.ai/api/v1/generation"

HERE = Path(__file__).resolve().parent
RESULTS_JSON = HERE / "results.json"
RESULTS_JS = HERE / "results.js"       # consumed by viewer.html via <script>
CODE_DIR = HERE / "extracted_code"

# (id, human label) - kept side by side, in order, in the viewer.
DEFAULT_MODELS = [
    ("openrouter/fusion", "OpenRouter Fusion"),
    ("anthropic/claude-opus-4.8", "Claude Opus 4.8"),
]

DEFAULT_PROMPT = (
    "Create a polished, single-file HTML page (HTML + CSS + JavaScript, no external "
    "dependencies or CDNs) featuring an interactive particle constellation: dozens of "
    "points drift across a dark canvas, lines connect nearby points, and the network "
    "gently reacts to mouse movement. Make it genuinely beautiful and self-contained so "
    "it runs by simply opening the file. Return the complete HTML in a single code block, "
    "then briefly explain the key techniques you used."
)

LANG_EXT = {
    "python": "py", "py": "py",
    "javascript": "js", "js": "js", "jsx": "jsx",
    "typescript": "ts", "ts": "ts", "tsx": "tsx",
    "html": "html", "xml": "xml",
    "css": "css", "scss": "scss",
    "bash": "sh", "sh": "sh", "shell": "sh", "zsh": "sh",
    "json": "json", "yaml": "yaml", "yml": "yaml", "toml": "toml",
    "java": "java", "kotlin": "kt",
    "c": "c", "cpp": "cpp", "c++": "cpp", "h": "h",
    "csharp": "cs", "cs": "cs",
    "go": "go", "rust": "rs", "rs": "rs",
    "ruby": "rb", "rb": "rb", "php": "php",
    "sql": "sql", "swift": "swift", "r": "r",
    "markdown": "md", "md": "md", "text": "txt", "": "txt",
}

CODE_FENCE_RE = re.compile(r"```([^\n`]*)\n(.*?)```", re.DOTALL)
# First fenced block in a testlab PROMPT.md is the canonical prompt.
PROMPT_FENCE_RE = re.compile(r"```[^\n]*\n(.*?)```", re.DOTALL)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def load_api_key() -> str | None:
    """Read OPENROUTER_API_KEY from the .env file (falls back to the environment)."""
    import os

    if ENV_PATH.exists():
        try:
            for raw in ENV_PATH.read_text(encoding="utf-8", errors="replace").splitlines():
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("export "):
                    line = line[len("export "):].strip()
                if "=" not in line:
                    continue
                key, _, val = line.partition("=")
                if key.strip() != ENV_KEY:
                    continue
                val = val.strip().strip('"').strip("'").strip()
                if val:
                    return val
        except OSError as exc:
            print(f"  ! Could not read {ENV_PATH}: {exc}", file=sys.stderr)

    return os.environ.get(ENV_KEY) or None


def slugify(model_id: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", model_id.lower()).strip("-")


def extract_prompt_from_file(text: str) -> str:
    """If the file is a testlab PROMPT.md, return the fenced prompt; else the text."""
    m = PROMPT_FENCE_RE.search(text)
    return (m.group(1).strip() if m else text.strip())


def parse_openrouter_body(raw: str) -> dict:
    """Parse an OpenRouter chat-completions response into the standard shape.

    Handles three wire formats: a plain JSON object; JSON wrapped in SSE keepalive
    comment lines (": OPENROUTER PROCESSING"); and a full SSE stream of `data:`
    frames, which we reassemble (concatenating streamed deltas) into one message.
    """
    s = raw.lstrip()
    # 1) Plain JSON object.
    if s.startswith("{"):
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            pass
    # 2) Drop SSE comment / keepalive lines, then retry as one JSON object.
    body = "\n".join(ln for ln in raw.splitlines()
                     if ln.strip() and not ln.lstrip().startswith(":"))
    if body.lstrip().startswith("{"):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            pass
    # 3) SSE stream of `data:` frames -> reassemble.
    objs = []
    for ln in raw.splitlines():
        ln = ln.strip()
        if not ln.startswith("data:"):
            continue
        payload = ln[len("data:"):].strip()
        if not payload or payload == "[DONE]":
            continue
        try:
            objs.append(json.loads(payload))
        except json.JSONDecodeError:
            continue
    if objs:
        # Some providers send a full message in one frame (non-delta).
        for o in reversed(objs):
            ch = (o.get("choices") or [{}])[0]
            if (ch.get("message") or {}).get("content"):
                return o
        # Otherwise concatenate streamed deltas.
        parts, finish, usage, model_id, resp_id = [], None, None, None, None
        for o in objs:
            resp_id = o.get("id", resp_id)
            model_id = o.get("model", model_id)
            if o.get("usage"):
                usage = o["usage"]
            ch = (o.get("choices") or [{}])[0]
            delta = ch.get("delta") or {}
            if delta.get("content"):
                parts.append(delta["content"])
            if ch.get("finish_reason"):
                finish = ch["finish_reason"]
        return {
            "id": resp_id, "model": model_id, "usage": usage,
            "choices": [{
                "message": {"role": "assistant", "content": "".join(parts)},
                "finish_reason": finish,
            }],
        }
    raise ValueError("unrecognized OpenRouter response format")


def _extract_raw_html(text: str) -> str | None:
    """Find a full HTML document in text that isn't wrapped in a markdown fence."""
    low = text.lower()
    i = low.find("<!doctype html")
    if i == -1:
        i = low.find("<html")
    j = low.rfind("</html>")
    if i != -1 and j != -1 and j > i:
        return text[i:j + len("</html>")]
    return None


def extract_and_save_code(model_id: str, text: str, test_slug: str | None = None) -> list[dict]:
    """Pull every fenced code block out of `text` and write each to extracted_code/.

    When `test_slug` is set, files are namespaced under extracted_code/<test_slug>/
    so multiple tests don't collide on filenames.
    """
    blocks: list[dict] = []
    out_dir = CODE_DIR / test_slug if test_slug else CODE_DIR
    slug = slugify(model_id)

    matches = list(CODE_FENCE_RE.finditer(text or ""))
    if not matches:
        # Fallback: some models (notably Fusion's synthesizer) return raw HTML with
        # no markdown fence. Save it if the response is a full HTML document.
        raw_html = _extract_raw_html(text or "")
        if raw_html:
            out_dir.mkdir(parents=True, exist_ok=True)
            filename = f"{slug}_block1.html"
            href = f"extracted_code/{test_slug}/{filename}" if test_slug else f"extracted_code/{filename}"
            try:
                (out_dir / filename).write_text(raw_html, encoding="utf-8")
                blocks.append({"index": 1, "language": "html", "filename": filename,
                               "href": href, "path": str(out_dir / filename),
                               "lines": raw_html.count("\n") + 1, "chars": len(raw_html)})
            except OSError as exc:
                print(f"  ! Could not write {out_dir / filename}: {exc}", file=sys.stderr)
        return blocks

    out_dir.mkdir(parents=True, exist_ok=True)
    for i, m in enumerate(matches, start=1):
        lang = (m.group(1) or "").strip().lower()
        # A fence info-string can be e.g. "html" or "python title=foo" - take the first token.
        lang = lang.split()[0] if lang else ""
        body = m.group(2)
        ext = LANG_EXT.get(lang, "txt")
        filename = f"{slug}_block{i}.{ext}"
        path = out_dir / filename
        # Path relative to the harness dir, for the viewer's file-chip links.
        href = f"extracted_code/{test_slug}/{filename}" if test_slug else f"extracted_code/{filename}"
        try:
            path.write_text(body, encoding="utf-8")
        except OSError as exc:
            print(f"  ! Could not write {path}: {exc}", file=sys.stderr)
            continue
        blocks.append(
            {
                "index": i,
                "language": lang or "text",
                "filename": filename,
                "href": href,
                "path": str(path),
                "lines": body.count("\n") + 1,
                "chars": len(body),
            }
        )
    return blocks


def fetch_cost_fallback(api_key: str, generation_id: str) -> float | None:
    """If the inline usage didn't include cost, query the generation endpoint."""
    if not generation_id:
        return None
    url = f"{GENERATION_URL}?id={urllib.parse.quote(generation_id)}"
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {api_key}"}, method="GET"
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            row = data.get("data", data) or {}
            cost = row.get("total_cost")
            if cost is not None:
                return float(cost)
        except (urllib.error.URLError, ValueError, KeyError):
            pass
        time.sleep(1.0 + attempt)  # generation rows can lag a moment
    return None


def call_model(model_id: str, label: str, prompt: str, api_key: str,
               max_tokens: int | None, timeout: float,
               test_slug: str | None = None) -> dict:
    """POST one request to OpenRouter and shape the result for the viewer."""
    result: dict = {
        "id": model_id,
        "label": label,
        "ok": False,
        "status": "error",
        "error": None,
        "response": "",
        "model_returned": None,
        "generation_id": None,
        "latency_s": None,
        "usage": None,
        "cost_usd": None,
        "code_blocks": [],
        "finish_reason": None,
    }

    body: dict = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        # Stream so long requests (Fusion fans out to a panel) keep the
        # connection alive and big builds can't hit an idle timeout.
        "stream": True,
        # Ask OpenRouter to report token accounting *and* cost (final SSE frame).
        "usage": {"include": True},
    }
    if max_tokens:
        body["max_tokens"] = max_tokens

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Optional attribution headers OpenRouter uses for ranking.
            "HTTP-Referer": "https://localhost/fusion-ab-test",
            "X-Title": "Fusion vs Opus A/B Test",
        },
        method="POST",
    )

    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
        result["latency_s"] = round(time.perf_counter() - start, 3)
    except urllib.error.HTTPError as exc:
        result["latency_s"] = round(time.perf_counter() - start, 3)
        detail = ""
        try:
            detail = exc.read().decode("utf-8")
        except Exception:
            pass
        result["error"] = f"HTTP {exc.code} {exc.reason}: {detail[:500]}"
        return result
    except urllib.error.URLError as exc:
        result["latency_s"] = round(time.perf_counter() - start, 3)
        result["error"] = f"Network error: {exc.reason}"
        return result

    try:
        payload = parse_openrouter_body(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        # Save the raw body so the format can be inspected, then bail.
        note = ""
        try:
            (HERE / "runs").mkdir(exist_ok=True)
            dbg = HERE / "runs" / f"{(test_slug or 'noslug')}__{slugify(model_id)}_raw.txt"
            dbg.write_text(raw, encoding="utf-8")
            note = f" (raw saved to runs/{dbg.name})"
        except OSError:
            pass
        result["error"] = f"Could not parse response JSON: {exc}{note}"
        return result

    # OpenRouter mirrors the OpenAI error envelope on logical failures.
    if isinstance(payload.get("error"), dict):
        err = payload["error"]
        result["error"] = f"{err.get('code', '')} {err.get('message', '')}".strip()
        return result

    choices = payload.get("choices") or []
    if not choices:
        result["error"] = "No choices returned."
        result["raw_keys"] = list(payload.keys())
        return result

    message = choices[0].get("message") or {}
    content = message.get("content")
    # Some providers return content as a list of parts; normalise to text.
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        )
    result["response"] = content or ""
    result["finish_reason"] = choices[0].get("finish_reason")
    result["model_returned"] = payload.get("model")
    result["generation_id"] = payload.get("id")

    usage = payload.get("usage") or {}
    result["usage"] = usage
    cost = usage.get("cost")
    if cost is None:
        cost = fetch_cost_fallback(api_key, result["generation_id"])
    result["cost_usd"] = float(cost) if cost is not None else None

    result["code_blocks"] = extract_and_save_code(model_id, result["response"], test_slug)
    # If a request "succeeds" but yields no build (e.g. a Fusion "I'll convene the
    # panel..." stub), save the raw SSE body so the stream can be inspected.
    if not result["code_blocks"]:
        try:
            (HERE / "runs").mkdir(exist_ok=True)
            (HERE / "runs" / f"{(test_slug or 'noslug')}__{slugify(model_id)}_raw.txt").write_text(
                raw, encoding="utf-8")
        except OSError:
            pass
    result["ok"] = True
    result["status"] = "ok"
    return result


def pending_model(model_id: str, label: str) -> dict:
    """Placeholder entry used when the API key isn't available yet."""
    return {
        "id": model_id,
        "label": label,
        "ok": None,
        "status": "pending",
        "error": None,
        "response": "",
        "model_returned": None,
        "generation_id": None,
        "latency_s": None,
        "usage": None,
        "cost_usd": None,
        "code_blocks": [],
        "finish_reason": None,
    }


def write_outputs(report: dict) -> None:
    RESULTS_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    # results.js lets viewer.html load data with a plain <script> tag,
    # which works over file:// (a fetch() would be blocked by CORS).
    RESULTS_JS.write_text(
        "// Auto-generated by ab_test.py - do not edit by hand.\n"
        "window.AB_RESULTS = " + json.dumps(report, indent=2) + ";\n",
        encoding="utf-8",
    )


def write_run_outputs(report: dict, slug: str) -> None:
    """Multi-test mode: each test writes its own file under runs/ so parallel
    runs never clobber each other. The viewer loads runs/<slug>.js per test.

    If a prior report exists, merge by model id so a subset re-run (e.g. only
    Fusion) preserves the other model's earlier result."""
    runs = HERE / "runs"
    runs.mkdir(exist_ok=True)
    jf = runs / f"{slug}.json"
    if jf.exists():
        try:
            prev = json.loads(jf.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            prev = None
        if prev and prev.get("models"):
            order = [m["id"] for m in prev["models"]]
            by_id = {m["id"]: m for m in prev["models"]}
            for m in report["models"]:
                if m["id"] not in by_id:
                    order.append(m["id"])
                by_id[m["id"]] = m
            report = dict(report)
            report["models"] = [by_id[i] for i in order]
    jf.write_text(json.dumps(report, indent=2), encoding="utf-8")
    (runs / f"{slug}.js").write_text(
        "// Auto-generated by ab_test.py - do not edit by hand.\n"
        "window.AB_RUNS = window.AB_RUNS || {};\n"
        f"window.AB_RUNS[{json.dumps(slug)}] = " + json.dumps(report, indent=2) + ";\n",
        encoding="utf-8",
    )


def fmt_cost(v: float | None) -> str:
    return f"${v:.6f}" if isinstance(v, (int, float)) else "  -   "


def fmt_latency(v: float | None) -> str:
    return f"{v:.2f}s" if isinstance(v, (int, float)) else "  -  "


def print_summary(report: dict) -> None:
    print("\n" + "=" * 64)
    print("  A/B RESULTS")
    print("=" * 64)
    rows = report["models"]
    name_w = max((len(m["label"]) for m in rows), default=10)
    for m in rows:
        if m["status"] == "pending":
            line = f"  {m['label']:<{name_w}}  PENDING (waiting for API key)"
        elif m["status"] == "ok":
            usage = m.get("usage") or {}
            toks = usage.get("total_tokens", "?")
            line = (
                f"  {m['label']:<{name_w}}  "
                f"latency {fmt_latency(m['latency_s'])}  "
                f"cost {fmt_cost(m['cost_usd'])}  "
                f"tokens {toks}  "
                f"code-blocks {len(m['code_blocks'])}"
            )
        else:
            line = f"  {m['label']:<{name_w}}  ERROR: {m['error']}"
        print(line)

    ok = [m for m in rows if m["status"] == "ok"]
    if len(ok) >= 2:
        priced = [m for m in ok if isinstance(m["cost_usd"], (int, float))]
        timed = [m for m in ok if isinstance(m["latency_s"], (int, float))]
        if priced:
            cheapest = min(priced, key=lambda m: m["cost_usd"])
            print(f"\n  Cheapest : {cheapest['label']} ({fmt_cost(cheapest['cost_usd'])})")
        if timed:
            fastest = min(timed, key=lambda m: m["latency_s"])
            print(f"  Fastest  : {fastest['label']} ({fmt_latency(fastest['latency_s'])})")
    print("=" * 64)
    if report.get("slug"):
        print(f"  Wrote runs/{report['slug']}.json and runs/{report['slug']}.js")
    else:
        print(f"  Wrote {RESULTS_JSON.name} and {RESULTS_JS.name}")
    print(f"  Open  viewer.html in a browser to compare side by side.")
    print("=" * 64 + "\n")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="OpenRouter A/B test harness")
    p.add_argument("prompt", nargs="?", help="Prompt text (inline).")
    p.add_argument("--prompt-file", help="Read the prompt from a file.")
    p.add_argument(
        "--models",
        help="Comma-separated model ids "
        "(default: openrouter/fusion,anthropic/claude-opus-4.8).",
    )
    p.add_argument("--max-tokens", type=int, default=None,
                   help="Optional max_tokens cap (omitted by default).")
    p.add_argument("--timeout", type=float, default=300.0,
                   help="Per-request timeout in seconds (default 300).")
    p.add_argument("--slug", default=None,
                   help="Test slug. When set, writes runs/<slug>.{json,js} "
                        "(multi-test mode) instead of results.{json,js}.")
    p.add_argument("--label", default=None,
                   help="Human-readable test name shown in the viewer tab.")
    return p.parse_args(argv)


def resolve_models(arg: str | None) -> list[tuple[str, str]]:
    if not arg:
        return list(DEFAULT_MODELS)
    labels = dict(DEFAULT_MODELS)
    out: list[tuple[str, str]] = []
    for mid in (s.strip() for s in arg.split(",") if s.strip()):
        out.append((mid, labels.get(mid, mid)))
    return out or list(DEFAULT_MODELS)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    if args.prompt_file:
        # Works with a raw prompt file or a testlab PROMPT.md (fenced block extracted).
        prompt = extract_prompt_from_file(Path(args.prompt_file).read_text(encoding="utf-8"))
    elif args.prompt:
        prompt = args.prompt
    else:
        prompt = DEFAULT_PROMPT

    models = resolve_models(args.models)
    api_key = load_api_key()
    now = datetime.now(timezone.utc).isoformat()
    slug = args.slug
    label = args.label or (slug or "Test")

    def persist(report: dict) -> None:
        report["slug"] = slug
        report["label"] = label
        if slug:
            write_run_outputs(report, slug)
        else:
            write_outputs(report)

    if not api_key:
        print(f"\n  {ENV_KEY} not found in {ENV_PATH}")
        print("  Building artifacts in PENDING state and skipping the API call.")
        print("  Re-run this script once the key lands and it will fill in.\n")
        report = {
            "generated_at": now,
            "status": "pending",
            "prompt": prompt,
            "models": [pending_model(mid, mlabel) for mid, mlabel in models],
        }
        persist(report)
        print_summary(report)
        return 0

    print(f"\n  Prompt ({len(prompt)} chars):")
    preview = prompt.strip().replace("\n", " ")
    print(f'    "{preview[:140]}{"..." if len(preview) > 140 else ""}"\n')

    results = []
    for mid, mlabel in models:
        print(f"  -> {mlabel}  ({mid}) ...", flush=True)
        res = call_model(mid, mlabel, prompt, api_key, args.max_tokens, args.timeout, slug)
        if res["status"] == "ok":
            print(
                f"     done in {fmt_latency(res['latency_s'])}, "
                f"cost {fmt_cost(res['cost_usd'])}, "
                f"{len(res['code_blocks'])} code block(s)"
            )
        else:
            print(f"     FAILED: {res['error']}")
        results.append(res)

    report = {
        "generated_at": now,
        "status": "complete",
        "prompt": prompt,
        "models": results,
    }
    persist(report)
    print_summary(report)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
