# Send-to-CreatorGrowth — packaging push (Ship or Skip #21)

The brainstorm-first prompt, as given to Claude Opus 4.8 — it asked clarifying questions, then built:

```
Build a packaging skill so I can say "package this and send it to my CreatorGrowth" in Claude Code and it pushes a thumbnail + title card into my account via API. Brainstorm the flow first, then build.
```

**What you get:** a card-push endpoint + flow so that, from your own Claude Code, you can package a thumbnail + title and push it straight into your CreatorGrowth account over the API — no copy-paste, no browser.

**Built into a private production SaaS (CreatorGrowth)**, so it ships as a patch of the endpoint the model wrote (plus its tests) — apply it to your own app rather than getting full source. See `send-to-creatorgrowth.patch`.
