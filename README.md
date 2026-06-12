# testlab

**The impossible-prompts library.** Every episode I throw a batch of one-shot
prompts at the newest AI model — no follow-ups, no retries — and everything
lands here: the exact prompt, and the unedited code it produced. Copy any
prompt, run it on whatever model exists when you're reading this, and compare.

This library grows every episode. Prompts are numbered globally and never
renumbered — `#01` will still be `#01` at prompt `#500`.

## Episodes

### ep1 — I Gave Fable 5 Six Impossible Prompts (One Shot Each)
**Watch: https://youtu.be/hsLi_DgYb-k**

Filmed before this repo existed — the take-home prompts are preserved here;
the builds lived and died on camera.

| # | Prompt | What it is |
|---|--------|------------|
| 01 | [GTA 5 sim](ep1/01-gta-sim/PROMPT.md) | top-down open-world game, one HTML file |
| 02 | [Seiko store](ep1/02-seiko-store/PROMPT.md) | premium watch reseller storefront |
| 03 | [YouTube Factory](ep1/03-youtube-factory/PROMPT.md) | Factorio-style channel sim on real data |
| 04 | [Drum kit](ep1/04-drum-kit/PROMPT.md) | playable kit + beat recorder, Web Audio |
| 05 | [Rally sim](ep1/05-rally-sim/PROMPT.md) | mobile-first dirt-stage racer |
| 06 | [Intelligence Engine](ep1/06-intelligence-engine/PROMPT.md) | creator-business dashboard on real stats |

### ep2 — I Gave Fable 5 Nine Impossible Prompts (Even Harder)
**Watch: (video coming — link lands here at publish)**

Nine prompts fired simultaneously into nine parallel agents. Three of them
(09, 12, 14) were built into my real production SaaS — those ship as patches
of every line the model wrote, plus the new files; point the same prompt at
your own codebase.

| # | Prompt | What you get | Run it |
|---|--------|--------------|--------|
| 07 | [CS:GO-style shooter](ep2/07-shooter/PROMPT.md) | one HTML file | open `index.html` |
| 08 | [The internet in 1999](ep2/08-internet-1999/PROMPT.md) | one HTML file | open `index.html` |
| 09 | [Feedback Lab](ep2/09-feedback-lab/PROMPT.md) | patch + tests + seed data | apply to your own app |
| 10 | [Tinder for video ideas](ep2/10-tinder/PROMPT.md) | web app + my real ideas deck | `node server.js` or open `index.html` |
| 11 | [Cabin restoration game](ep2/11-cabin/PROMPT.md) | one HTML file | open `index.html` |
| 12 | [Testing Lab](ep2/12-testing-lab/PROMPT.md) | patch + template + tests | apply after 09 |
| 13 | [VTuber studio](ep2/13-vtuber/PROMPT.md) | one HTML file + pixel avatar | open `index.html`, allow webcam |
| 14 | [Writing Mode (Google Docs yoink)](ep2/14-writing-mode/PROMPT.md) | patch + tests | apply after 12 |
| 15 | [Claude Code Mission Control](ep2/15-mission-control/PROMPT.md) | node app | `node server.js` |

## Rules every episode runs under

- **One shot each** — no back-and-forth, no retries.
- All prompts in an episode fire **at the same time** into parallel agents.
- Libraries from a CDN allowed; bundled asset files not.
- Builds into private codebases ship as **patches of every line the model
  wrote** — the prompt is the product, the patch is the proof.
- Model is logged per episode (ep1–ep2: `claude-fable-5`).

MIT licensed. Yoink anything.
