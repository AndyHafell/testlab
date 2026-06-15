# X Inspiration (#30)

A patch-style build: one agent in its own worktree, one-shot brief against a
private production SaaS. Point this prompt at **your own** app.

The one-shot prompt:

```
My app already surfaces viral YouTube videos as content-idea cards that flow into
an inspo → brief → content-doc pipeline. Add X (Twitter) as a second source that
folds into the exact same machinery — no separate tab.

- Pull from a third-party X API (key in an env var, single `x-api-key` header):
  keyword "advanced search" for top posts, and "last tweets" for handles I track.
- Map each tweet into the same idea-card shape my YouTube inspiration already
  produces (give it a `video_id = x_<tweet_id>` so the rest of the pipeline —
  card, modal source view, brief, content-doc — just works).
- X posts have no 16:9 thumbnail, so generate a premium "credit-card" tile image
  per post with Pillow: gradient card, avatar + @handle, the tweet snippet,
  like/retweet chips, an outlier badge, and an 𝕏 corner mark. Store it as the
  card's thumbnail so it renders identically to a YouTube card.
- Compute an outlier score from likes ÷ followers (parallel to YouTube's
  views ÷ channel-average), so hot posts surface.
- Add a "tracked X creators" concept mirroring my YouTube channels: a table plus
  routes to add / list / delete a handle and pull one or pull all.
- Dedupe per-user on the tweet id, ingest as idea cards, and gate it behind my
  existing admin check.

Drive it all with TDD — unit-test the pure mapping/scoring logic with the HTTP
calls mocked, and the route auth-gating.
```

**What you get:** `x-inspo.patch` — a `git diff` of **only** the X-Inspiration
feature against the app's main branch: the twitterapi.io wrappers, outlier score,
tweet→card mapping, Pillow card-image generator, the `x_creators` table + routes,
and the ingest logic in `app.py`; the `templates/index.html` card wiring; the
`.env.example` key entry; and `tests/test_x_inspiration.py`. Private SaaS → ships
as a patch, not full source.

> The agent's branch was tangled with two other agents' work (a dashboard and a
> writing-mode feature) from the shared codebase. This patch is the **clean
> isolate** — only the X-Inspiration commit, none of the neighboring features.
> See `../SWARM_SETUP.md` for how the worktree-per-agent pattern keeps these
> separable. Account-ID env defaults are zeroed/placeholdered; set your own.
