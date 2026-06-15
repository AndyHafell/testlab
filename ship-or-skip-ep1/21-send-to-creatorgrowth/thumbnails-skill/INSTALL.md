# Creator Thumbnails — install & use

A Claude Code skill that makes **thumbnails in your true-crime style**. Give it a
video topic and it designs a thumbnail (dark cinematic illustration, red/white
hook, your investigation-board / silhouette / spotlight look) and renders it with
**Nano Banana 2 on fal.ai**.

Thumbnails only — it doesn't write titles or upload anything.

## 1. Install (under a minute)

Drop this whole `creator-thumbnails` folder into your Claude Code skills folder:
```
~/.claude/skills/creator-thumbnails/
```
(so the file lands at `~/.claude/skills/creator-thumbnails/SKILL.md`).

**No `pip install` needed** — it uses only Python 3's built-in libraries.

## 2. First run — paste your fal key (once)

The first time, it asks for one thing and remembers it (saved only on your
computer, in `~/.creatorgrowth/credentials`):

- **Your fal.ai key** — get it at https://fal.ai/dashboard/keys, copy, paste when
  asked.

That's it — it won't ask again.

## 3. Use it

In Claude Code, just say:

> make me 3 thumbnails for my Black Dahlia video

It will:
1. Design a thumbnail **concept + short hook** for the video (the hook is a punchy
   word/number — never the full title; the image is the proof).
2. Render the options with **Nano Banana 2 on fal.ai**, in your locked style.
3. Save the PNGs and show you the files.

Pick the one you like and upload it wherever you want.

## Your style

Your look is locked in `styles/example_truecrime.md` — palette, red/white
headlines, and the four layouts (subject portrait, cinematic scene, investigation
board, spotlight reveal). Edit that one file if you ever want to tweak the style.

## Notes

- It generates 16:9 PNGs at 2K. Change `resolution`/`aspect_ratio` in the skill if
  you want.
- Your fal key stays on your machine; nothing is sent anywhere except fal.ai to
  render the images.
