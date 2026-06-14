"""
GitHub stars — per repo + total. No API key needed: uses the authenticated
`gh` CLI when available, falling back to the public REST API.
"""

import json
import shutil
import subprocess

import requests

import config


def _via_gh() -> list | None:
    if not shutil.which("gh"):
        return None
    try:
        out = subprocess.run(
            ["gh", "api", "--paginate",
             f"users/{config.GITHUB_USER}/repos?per_page=100&type=owner&sort=updated"],
            capture_output=True, text=True, timeout=40,
        )
        if out.returncode != 0:
            return None
        # --paginate concatenates JSON arrays; gh emits them as separate arrays.
        repos = []
        decoder = json.JSONDecoder()
        buf = out.stdout.strip()
        idx = 0
        while idx < len(buf):
            while idx < len(buf) and buf[idx] in " \n\r\t":
                idx += 1
            if idx >= len(buf):
                break
            obj, end = decoder.raw_decode(buf, idx)
            if isinstance(obj, list):
                repos.extend(obj)
            idx = end
        return repos
    except (subprocess.SubprocessError, ValueError):
        return None


def _via_rest() -> list | None:
    repos, page = [], 1
    try:
        while page <= 5:
            r = requests.get(
                f"https://api.github.com/users/{config.GITHUB_USER}/repos",
                params={"per_page": 100, "page": page, "type": "owner", "sort": "updated"},
                headers={"Accept": "application/vnd.github+json"},
                timeout=30,
            )
            if r.status_code != 200:
                return repos or None
            batch = r.json()
            if not batch:
                break
            repos.extend(batch)
            page += 1
        return repos
    except requests.RequestException:
        return repos or None


def fetch() -> dict:
    """Return {status, total, repos:[{name, stars, url, language}]}. Never raises."""
    raw = _via_gh()
    if raw is None:
        raw = _via_rest()
    if not raw:
        return {"status": "error", "total": 0, "repos": []}

    repos = []
    for r in raw:
        if r.get("fork"):
            continue
        repos.append({
            "name": r.get("name", ""),
            "stars": int(r.get("stargazers_count") or 0),
            "url": r.get("html_url", ""),
            "language": r.get("language") or "",
        })
    repos.sort(key=lambda x: x["stars"], reverse=True)
    total = sum(x["stars"] for x in repos)
    return {"status": "ok", "total": total, "repos": repos}
