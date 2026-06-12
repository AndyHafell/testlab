# ◉ Mission Control — Claude Code fleet dashboard

A zero-dependency local dashboard that watches your real Claude Code session
transcripts (`~/.claude/projects/**/*.jsonl`) and shows every agent live.

## Run

```sh
node server.js          # → http://localhost:4242
```

No install, no build step. Node ≥ 18. `PORT=8080 node server.js` to change port.

## What you get

- **Fleet view** — every session grouped by project: live status (● working /
  ◐ recent / ○ done), the task it's on, the last thing it said, tokens burned,
  estimated cost, files edited, git branch. Subagents nest under their parent.
- **Fleet stats** — sessions today, estimated cost today, output/input tokens,
  files touched, busiest project, agents active right now.
- **Session replay** — click any agent to replay its transcript as a chat:
  user/assistant bubbles, collapsible tool calls with inputs + results,
  thinking blocks. Live sessions tail in real time.
- **Daily report** — "What did my agents do" button compiles a per-project
  report for any date, with markdown export.
- **Live** — `fs.watch` + Server-Sent Events; the dashboard updates the moment
  a transcript changes on disk.

## How it works

- `lib/scan.js` — streaming JSONL parser. Token usage is deduped by
  `requestId` (Claude Code repeats the same usage object on every
  content-block line of one API response). Usage is bucketed per day so
  "today" stats are accurate even for long-running sessions. Per-file parse
  cache keyed by mtime+size keeps rescans instant.
- `server.js` — zero-dep HTTP server: `/api/fleet`, `/api/session`,
  `/api/report`, `/api/events` (SSE), static files.
- `public/` — vanilla JS frontend, no frameworks.

Cost estimates use standard API pricing per MTok (Fable $10/$50,
Opus $5/$25, Sonnet $3/$15, Haiku $1/$5) including cache writes
(1.25× input for 5m TTL, 2× for 1h) and cache reads (0.1× input).
