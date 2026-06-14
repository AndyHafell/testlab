---
name: creator-packaging
description: Package a YouTube video (9 titles + 9 thumbnails) the way a packaging expert would — as a conversation — then push it straight into your own CreatorGrowth as a Packaging card. Triggers — "package this and send it to my CreatorGrowth", "package this video", "make me titles and thumbnails for X", "send a packaging card to CG". Thumbnails are generated locally in your brand style and pushed via your CreatorGrowth API token.
---

# Creator Packaging → Send to CreatorGrowth

Turn a video idea into a **full packaging bench — 9 titles + 9 thumbnails** in
the creator's brand style, then push it into **their own CreatorGrowth** as a
Packaging card via their `cg_` API token. The title engine is universal; the
look comes from a swappable **style file**.

**Style file for this install:** `styles/example_truecrime.md`
(Override by setting `STYLE_FILE` to another file in `styles/`.)

Read the style file now — it defines the locked palette, the layout patterns,
the prompt template, and the guards for this creator.

## Step 0 — Credentials (once)

Generation runs locally and the push needs the creator's CG token, so two
secrets are needed. Check what's present:

```bash
python3 bin/_creds.py status
```

For any that say `MISSING`, ask the creator for it in chat, then save it:

- **CG_API_TOKEN** — "In CreatorGrowth, open **Settings → API Access → Generate**,
  copy the `cg_…` token, and paste it here."
- **GOOGLE_AI_STUDIO_KEY** — "Paste a Google AI Studio key (free at
  https://aistudio.google.com/apikey) so I can render your thumbnails."

Save what they paste (writes `~/.creatorgrowth/credentials`, chmod 600):

```bash
python3 bin/_creds.py save CG_API_TOKEN=cg_xxx GOOGLE_AI_STUDIO_KEY=AIza_xxx
```

After this, future runs just work — don't ask again unless `status` shows MISSING.

## Step 1 — Titles: converse to 9, NEVER batch-generate

**Do not output 9 titles in one message.** Nine titles from one pass are
generic. The good nine are the residue of a real back-and-forth.

The loop:
1. Propose **2–3 titles at a time** across *distinct hooks*. Then **stop** and get
   the creator's reaction. Format each title-first as a blue markdown link, hook
   + rationale on the line below:
   ```

   N. [<the title>](https://creatorgrowth.com)
   <hook label> — <one-line why>
   ```
2. They critique (clickbait? false premise? boring? expectation mismatch?). The
   critique is where the quality comes from.
3. Refine, re-propose, keep only survivors.
4. Repeat until **9 titles** are locked.

**Honest-packaging principles (every title must pass):**
- **Expectations match the video** — don't presuppose an answer the video doesn't give.
- **No false premise** — the hook must be real.
- **Promise + proof, not just proof** — pair the fact with the viewer's gain.
- **Write from the target viewer's seat** — their actual want, not generic curiosity.
- **Lead with the number** — if a title has a number, put it at the FRONT.
- **Use REAL numbers** — a bigger true number beats a smaller invented one.
- **Vary the structure** — never pitch 9 titles in one mold; mix openings.

## Step 2 — One unique thumbnail concept per title

Each of the 9 thumbnails is a **different concept that proves its OWN title**.
Nine different titles ⇒ nine different scenes — never one composition reused.

**THE THUMBNAIL IS NOT THE TITLE.** The single biggest packaging rule: the
thumbnail must be the visual *proof* of the title, never its words echoed back.
The image carries at most a SHORT hook (≤3–4 words) that ADDS to the title — a
stakes word, a number, a question — and the title's own words never appear in
the image. (Title "Father Buried Forever: The Nutty Putty Tragedy" → thumb hook
"BURIED ALIVE".) If you're about to render the title as the headline, stop —
that's the mistake.

For each locked title:
1. Name the single most literal visual that **proves** it (the evidence/stakes).
2. Write a SHORT **hook** (≤3–4 words) distinct from the title — or none, letting
   the scene + small in-scene labels carry it.
3. Pick the best-fit **layout pattern** from the style file for that hook.
4. Fill the style file's **Locked Prompt Template** (`[HOOK TEXT]`,
   `[LAYOUT BLOCK]`, `[SCENE / HERO]`). Keep the rest verbatim — it's the
   creator's signature.

Unlike titles, thumbnails **can** be batched once the 9 titles are locked.

## Step 3 — Render the bench locally

Write a spec JSON and render all slots in parallel:

```json
{
  "out_dir": "<abs out dir, e.g. ./packaging_out/<topic>>",
  "model": "gemini-3.1-flash-image-preview",
  "slots": [
    {"slot": 0, "name": "slot0_<short>.png", "prompt": "<full filled prompt>"},
    {"slot": 1, "name": "slot1_<short>.png", "prompt": "<full filled prompt>"}
  ]
}
```

```bash
python3 bin/render_thumbs.py /abs/spec.json
```

(Letterforms come back mangled? Re-render that slot with
`"model": "gemini-3-pro-image-preview"`.)

## Step 4 — Guard before pushing

**Read every rendered PNG.** Regenerate any that:
- invented a word / wrong channel name / a second stray headline (title-leak),
- rendered the title text wrong or unreadable at small size,
- echo the title's words instead of proving it,
- duplicate another slot's composition.

Only push once the bench is clean. A slot that won't render → push it title-only
(leave its `thumb` null) so the title still lands.

## Step 5 — Push to CreatorGrowth

Write a bench JSON (slot i = title i + its thumb), then push:

```json
{
  "card_title": "<usually title 1>",
  "status": "packaging",
  "slots": [
    {"title": "<title 1>", "thumb": "/abs/out/slot0_*.png"},
    {"title": "<title 2>", "thumb": "/abs/out/slot1_*.png"}
  ]
}
```

```bash
python3 bin/push_to_cg.py /abs/bench.json
```

Re-running with the same `card_title` updates the same card (no duplicates).

**Never overwrite a creator's existing slots.** If the card already has a bench
and you're *adding* more (e.g. extending 6 → 15), set `"append": true` in the
bench JSON — the new titles/thumbs land in the slots *below* the last used one,
leaving everything already there untouched. Only the very first push of a video
omits `append`. Never re-send slots that are already filled just to "preserve"
them — append handles it.

## Step 6 — Confirm

Tell the creator: the card is in their CreatorGrowth **Packaging** tab with the
9 titles + thumbnails in slots — open it, hard-reload if needed, and pick the
A/B test set. Print the count of titles + thumbnails that landed.

## Onboarding another creator

Copy `styles/example_truecrime.md` → `styles/<creator>.md`, swap the style block /
layout patterns / prompt template for their brand, and point `STYLE_FILE` at it.
Nothing else changes — the title engine, render, guards, and push are universal.

## Where things live

| What | Where |
|------|-------|
| Style block (per creator) | `styles/<creator>.md` |
| Credential loader | `bin/_creds.py` → `~/.creatorgrowth/credentials` |
| Local renderer (Gemini) | `bin/render_thumbs.py` |
| Push to CG | `bin/push_to_cg.py` → `POST /api/cards/push-bench` |
