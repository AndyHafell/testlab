# YouTube Factory (build-on-established · real data)

The exact one-shot prompt, as given to Claude Fable 5 — no follow-ups, no retries:

```
Build a Factorio-style factory game, but the factory is a YouTube channel.

- Inputs (the "ore"): two source nodes spawn raw ideas onto belts — a Newsletter node (daily AI newsletter ideas) and an Ideas Dashboard node (trending video ideas). Plus a feedback loop: every video that ships re-injects its winning format upstream to bias future ideas (the "best" recycle back in).
- Production line: ideas ride belts through machines — Format Selector, Script Writer, Thumbnail Maker, Publisher. Each machine takes time and transforms the item; place more to parallelize.
- Output = views: when a video reaches the Publisher it ships and scores simulated views from the format + thumbnail + title combo. Points = total views.
- The twist, it builds itself: an auto-optimizer keeps adding and upgrading machines and rebalancing belts to maximize views per minute. You watch the score climb on its own.
- Ground it in real data: I'll feed you a CSV of my actual videos (title, format, thumbnail style, views, outlier score) — fit a scoring function off it so the view numbers feel real.
- Look: top-down Factorio style — belts, machines, items moving, a live views-per-minute counter and a total-views score. One runnable HTML file.
```
