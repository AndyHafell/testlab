# Send-to-CreatorGrowth — packaging push (Ship or Skip #21)

The brainstorm-first prompt, as given to Claude Opus 4.8 — it asked clarifying questions, then built:

```
Build a packaging skill so I can say "package this and send it to my CreatorGrowth" in Claude Code and it pushes a thumbnail + title card into my account via API. Brainstorm the flow first, then build.
```

**What you get:**
- **`skill/`** — the full **creator-packaging** Claude Code skill: say "package this and send it to my CreatorGrowth" and it generates a 9-title + 9-thumbnail bench in a swappable brand style (`styles/example_truecrime.md` — copy it per creator) and pushes a Packaging card via your own `cg_` API token. Thumbnails render locally; nothing is hardcoded — your keys live in `~/.creatorgrowth/credentials`.
- **`send-to-creatorgrowth.patch`** — the CreatorGrowth-side endpoint the push talks to. CreatorGrowth is a private SaaS, so the server side ships as a patch (+ tests) — apply it to your own app rather than getting full source.

The client skill is fully usable as-is against any CreatorGrowth that exposes the card-push API.
