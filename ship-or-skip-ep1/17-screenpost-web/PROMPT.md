# ScreenPost — Web + Electron rebuild (Ship or Skip #17)

The brainstorm-first prompt, as given to Claude Opus 4.8 — it asked clarifying questions, then built:

```
Rebuild my screenshot-to-tweet tool as a web app + Electron: an always-on listener that watches my work and auto-writes an insightful tweet about what I'm building every hour. Brainstorm first, then build.
```

**What you get:** an Electron desktop app that watches your screen, clipboard, and dev activity every hour, uses Claude to decide whether the last hour was worth sharing, and — when it is — drafts a multi-platform social post (X / LinkedIn / Threads / Instagram / Facebook) into an approval queue you review and post via the Blotato API. System-tray controls + a full Vitest suite (no Electron needed to run tests).

**Run it:**
```bash
npm install
npm test        # full suite, no Electron required
npm run dev     # launch the app
```
