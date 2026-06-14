# ScreenPost

ScreenPost is an Electron desktop app that watches your screen, clipboard, and development activity every hour, uses Claude (claude-sonnet-4-6) to decide whether the last hour produced anything worth sharing, and—when it does—generates a multi-platform social post (X/Twitter, LinkedIn, Threads, Instagram, Facebook) and queues it for your approval. You review drafts in the Approval Queue, edit inline if needed, and hit "Approve & post" to publish via the Blotato API. A system-tray menu lets you trigger a pass immediately, pause the hourly timer, or quit without opening the window.

## Run the tests

```bash
npm test
```

Runs the full suite (74 tests) using Vitest on Node's ABI for `better-sqlite3`. No Electron required.

## Run the app

Because `better-sqlite3` is a native module it must be compiled against the correct ABI. The test suite uses Node's ABI; the Electron dev server requires Electron's ABI.

**One-time rebuild** (only needed before first `npm run dev`, or after switching from `npm test`):

```bash
npm run rebuild
```

Then start the dev server:

```bash
npm run dev
```

> **Note:** After `npm run rebuild`, the Node test suite will fail because `better-sqlite3` is now compiled for Electron's ABI. Switch it back before running tests again:
>
> ```bash
> npm rebuild better-sqlite3
> npm test
> ```

## Required API keys

Set keys in the app's **Settings** screen — they are stored encrypted in the OS keychain via Electron `safeStorage`, never in plain text on disk.

| Key | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Claude claude-sonnet-4-6 — powers the interest filter and post generator |
| `Blotato_API_KEY` | Blotato publishing API — required for "Approve & post" to reach social platforms |

Per-platform **account IDs** (Twitter/X, LinkedIn, etc.) are also configured in Settings under the Blotato section.

Without keys the hourly pass still runs: the generator returns "not interesting" for every window (so no drafts are queued), and the "Approve & post" button will fail gracefully with a per-platform error shown in History.

## Build

Produce a production bundle in `out/`:

```bash
npm run build
```

Output directories: `out/main`, `out/preload`, `out/renderer`.
