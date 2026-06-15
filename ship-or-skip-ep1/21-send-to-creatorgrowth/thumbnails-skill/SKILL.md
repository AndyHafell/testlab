---
name: creator-thumbnails
description: Generate YouTube thumbnails in your locked brand style using Nano Banana 2 on fal.ai. Give it a video topic or title and it designs a thumbnail concept + short hook and renders it in your style. Triggers — "make me a thumbnail for X", "thumbnail this video", "design a thumbnail for my Black Dahlia video", "give me 3 thumbnail options". Thumbnails only — no titles, no uploading.
---

# Creator Thumbnails (your style, via fal.ai Nano Banana 2)

Generate thumbnails in the creator's **locked brand style** from a video topic.
The look is fixed in a style file; only the scene + a short hook change per video.

**Style file for this install:** `styles/example_truecrime.md` — read it now. It
defines the locked palette, the layout patterns, the prompt template, and the
guards. (Override with `STYLE_FILE` to use a different creator's file.)

**Renderer:** Nano Banana 2 on fal.ai (`fal-ai/nano-banana-2`) via fal's REST
API — stdlib only, **no pip install needed**.

## Step 0 — Credential (once)

```bash
python3 bin/_creds.py status
```

If `FAL_KEY` is `MISSING`, ask the creator:
> "Paste your fal.ai key (from https://fal.ai/dashboard/keys) so I can render
> your thumbnails."

Then save it (writes `~/.creatorgrowth/credentials`, chmod 600):

```bash
python3 bin/_creds.py save FAL_KEY=xxxxxxxx
```

It won't ask again.

## Step 1 — Design the thumbnail(s)

From the video topic/title the creator gives you:

1. Name the single most literal visual that is the **proof / stakes** of the
   video (the evidence, not the title's words).
2. Write a SHORT **hook** (≤3–4 words) that ADDS to the topic — a stakes word, a
   number, a question. **NEVER the title itself.** (See the style file's
   never-restate guard — the thumbnail is the proof, not a caption.)
3. Pick the best-fit **layout pattern** from the style file.
4. Fill the style file's **Locked Prompt Template** (`[HOOK TEXT]`,
   `[LAYOUT BLOCK]`, `[SCENE / HERO]`) — keep the rest verbatim, it's the
   creator's signature.

Default to **3 distinct options** for one video (different scene + hook each) so
the creator can pick — unless they ask for a specific count.

## Step 2 — Render

Write a spec JSON and render all options in parallel:

```json
{
  "out_dir": "<abs out dir>",
  "model": "fal-ai/nano-banana-2",
  "aspect_ratio": "16:9",
  "resolution": "2K",
  "slots": [
    {"slot": 0, "name": "v1_<short>.png", "prompt": "<full filled prompt>"},
    {"slot": 1, "name": "v2_<short>.png", "prompt": "<full filled prompt>"}
  ]
}
```

```bash
python3 bin/render_fal.py /abs/spec.json
```

## Step 3 — Guard, then deliver

**Read every rendered PNG.** Regenerate any that:
- rendered a long title instead of the short hook (the #1 mistake),
- invented a word / wrong text / a second stray headline,
- echo the topic's words instead of proving it,
- are unreadable at small (mobile) size.

Then give the creator the file paths (and open them if they like). Thumbnails
only — this skill does not write titles or upload anywhere.

## Onboarding another creator

Copy `styles/example_truecrime.md` → `styles/<creator>.md`, swap the style block /
layout patterns / prompt template for their brand, and point `STYLE_FILE` at it.

## Where things live

| What | Where |
|------|-------|
| Style block (per creator) | `styles/<creator>.md` |
| Credential loader | `bin/_creds.py` → `~/.creatorgrowth/credentials` |
| Renderer (fal Nano Banana 2) | `bin/render_fal.py` |
