# testlab

**9 impossible one-shot prompts for Claude Fable 5 — and every line of code it built.**

From the AI Andy episode *"I Gave Fable 5 Nine Impossible Prompts"* (one shot each, all nine fired at once). Every folder has the exact `PROMPT.md` and the unedited result. Yoink anything.

| # | Build | What you get | Run it |
|---|-------|--------------|--------|
| 1 | CS:GO-style shooter | one HTML file | open `index.html` |
| 2 | The internet in 1999 | one HTML file | open `index.html` |
| 3 | Feedback Lab | patch + tests + seed data | apply to your own app (see below) |
| 4 | Tinder for video ideas | small web app + my real ideas deck | `node server.js`, or open `index.html` |
| 5 | Cabin restoration game | one HTML file | open `index.html` |
| 6 | Testing Lab | patch + template + tests | apply after #3 |
| 7 | VTuber studio | one HTML file + pixel avatar | open `index.html`, allow webcam |
| 8 | Writing Mode (Google Docs yoink) | patch + tests | apply after #6 |
| 9 | Claude Code Mission Control | node app | `node server.js`, open the printed URL |

## About the three patches (3, 6, 8)

Those prompts told Fable to build **into my real production SaaS** (CreatorGrowth — a Flask app), not a toy. The codebase is private, so what's here is every line Fable wrote, as unified diffs, plus the new files (templates, tests) wholesale.

- They layer: **3 → 6 → 8** (Writing Mode reuses the Testing Lab's admin gate).
- To run the same experiment yourself: point the same prompt at *your* codebase. The prompt is the product — the patch is proof of what one shot produced.

## Rules these were built under

- One shot each — no back-and-forth, no retries.
- All nine prompts fired simultaneously into nine parallel agents.
- Libraries from a CDN allowed; bundled asset files not.
- Model: `claude-fable-5`.

MIT licensed. Go build.
