# testlab

**The impossible-prompts library.** Every episode I throw a batch of one-shot
prompts at the newest AI model — no follow-ups, no retries... or sometimes... 
But it's all transparent for you to watch — so everything lands here: the exact prompt, and the unedited code it produced. 
Copy any prompt, (Yoink that shit) run it on whatever model exists when you're reading this, and compare.

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

### Ship or Skip ep1 — I Built 6 AI Tools for My Business
**Watch: (video coming — link lands here at publish)**

A different format from the impossible-prompts episodes: six real tools for my
own business, each one brief-brainstormed with the agent first (Claude Opus
4.8), built live, then judged **ship or skip**. Two were built into a private
production SaaS and ship as a patch / prompt-only — point the same prompt at
your own codebase.

| # | Prompt | What you get | Run it |
|---|--------|--------------|--------|
| 16 | [AI voice sales agent](ship-or-skip-ep1/16-sales-agent/PROMPT.md) | Flask app + ElevenLabs agent + conversion dashboard | `pip install -r requirements.txt && python app.py` |
| 17 | [ScreenPost (web + Electron)](ship-or-skip-ep1/17-screenpost-web/PROMPT.md) | Electron app + full Vitest suite | `npm install && npm run dev` |
| 18 | [ScreenPost.io landing page](ship-or-skip-ep1/18-screenpost-site/PROMPT.md) | Next.js 16 + Tailwind v4 site | `npm install && npm run dev` |
| 19 | [Feedback Lab — picture mode](ship-or-skip-ep1/19-feedback-lab-pictures/PROMPT.md) | prompt only (private SaaS) | apply to your own app |
| 20 | [AI Mate OS dashboard](ship-or-skip-ep1/20-ai-mate-os/PROMPT.md) | Flask everything-dashboard | `pip install -r requirements.txt && python app.py` |
| 21 | [Send-to-CreatorGrowth](ship-or-skip-ep1/21-send-to-creatorgrowth/PROMPT.md) | patch + tests (private SaaS) | apply to your own app |

### fusion vs opus 4.8 — Same 6 Prompts, Two Models, Head to Head
**Watch: (video coming — link lands here at publish)**

Same six one-shot prompts fired at **two** models at once — `openrouter/fusion`
(a multi-model composite: panel of models + web search, then synthesized) vs
`anthropic/claude-opus-4.8` (a single frontier model) — captured with cost,
latency, and the unedited builds, then judged side by side. All self-contained,
single-file builds.

| # | Prompt | What it is |
|---|--------|------------|
| 22 | [GTA v2](fusion-vs-opus-4.8/22-gta-v2/PROMPT.md) | top-down open-world game **with weapons**, one HTML file |
| 23 | [The internet in 1999](fusion-vs-opus-4.8/23-internet-1999/PROMPT.md) | dial-up boot + a browsable '90s web, one HTML file |
| 24 | [Pixel Synth](fusion-vs-opus-4.8/24-pixel-synth/PROMPT.md) | FL Studio-style 8-bit chiptune looper, Web Audio |
| 25 | [Flight Sim](fusion-vs-opus-4.8/25-flight-sim/PROMPT.md) | 3D jet + air combat, one HTML file (CDN three.js ok) |
| 26 | [Destruction Sandbox](fusion-vs-opus-4.8/26-destruction-sandbox/PROMPT.md) | physics mayhem playground (CDN Matter.js ok) |
| 27 | [Productivity Hub](fusion-vs-opus-4.8/27-productivity-hub/PROMPT.md) | Kanban + calendar + to-do + Pomodoro, one HTML file |

This episode ships **both** builds per prompt — `opus/index.html` and
`fusion/index.html` in each folder — plus the A/B harness (`ab_test.py` +
`viewer.html`) used to fire and compare them.

### five-agents-one-afternoon — Five Agents, One Codebase, One Afternoon
**Watch: (link at publish)**

Five coding agents run **in parallel on the same private SaaS** — one git
worktree per agent, one one-shot brief each — then the good branches get merged.
The gift is [`SWARM_SETUP.md`](five-agents-one-afternoon/SWARM_SETUP.md): the
isolated-worktree-per-agent pattern, so you can run your own swarm on one repo.
Each feature ships as a **patch of only that agent's work** (private SaaS — the
prompt is the product, the patch is the proof). Point the same prompt at your own
codebase.

| # | Prompt | What you get | Run it |
|---|--------|--------------|--------|
| 28 | [Creator Intelligence dashboard](five-agents-one-afternoon/28-dashboard/PROMPT.md) | patch (route + aggregator + dark SVG dashboard) | apply to your own app |
| 29 | [Token budget + tiers + access gate](five-agents-one-afternoon/29-billing/PROMPT.md) | patch + full test suite (metering, 402 enforcement, allowlist gate) | apply to your own app |
| 30 | [X Inspiration](five-agents-one-afternoon/30-x-inspo/PROMPT.md) | clean single-feature patch + tests (twitterapi.io → idea cards, Pillow card image) | apply to your own app |

### opus 4.8 vs glm 5.2 — Same 6 Builds, Paid Frontier vs Free Open Model
**Watch: (video coming — link lands here at publish)**

The same six one-shot prompts fired at **two** models at once — `anthropic/claude-opus-4.8`
(the paid frontier, on a Max subscription) vs **`z-ai/glm-5.2`** (a free open-weight model,
run inside Claude Code by pointing it at z.ai). Same prompt, same harness, one shot each.
Each folder ships **both** builds — `opus/` and `glm/`. Real receipts: the whole **GLM day
cost $11.70**; Opus would've been **~$55** at metered API rates (it ran free on Max). GLM
matched or beat Opus on speed/lines on most — and hit its wall on the heaviest build (the
video factory).

| # | Prompt | What it is |
|---|--------|------------|
| 31 | [3D Anatomy Explorer](opus-vs-glm-5.2/31-anatomy-explorer/PROMPT.md) | rotatable muscular figure, hover-to-name, one HTML file (three.js) |
| 32 | [FIFA Football](opus-vs-glm-5.2/32-fifa-football/PROMPT.md) | top-down football + real AI opponent, first to 3, one HTML file |
| 33 | [X Video Factory](opus-vs-glm-5.2/33-x-video-factory/PROMPT.md) | Tinder-swipe X feed → composited short-form preview (Node + ffmpeg) |
| 34 | [Seiko 7S26 Movement](opus-vs-glm-5.2/34-seiko-7s26/PROMPT.md) | interactive 3D watch movement + assemble/explode slider (three.js) |
| 35 | [AI Minecraft](opus-vs-glm-5.2/35-ai-minecraft/PROMPT.md) | voxel world — mine, chop a tree, craft a sword, kill a pig (three.js) |
| 36 | [Text Write-On Animation](opus-vs-glm-5.2/36-text-write-on/PROMPT.md) | Remotion word-synced kinetic typography from a spoken line (bring your own audio) |

## Rules every episode runs under

- **One shot each** — no back-and-forth, no retries.
- All prompts in an episode fire **at the same time** into parallel agents.
- Libraries from a CDN allowed; bundled asset files not.
- Builds into private codebases ship as **patches of every line the model
  wrote** — the prompt is the product, the patch is the proof.
- Model is logged per episode (ep1–ep2: `claude-fable-5`; ship-or-skip-ep1 + five-agents-one-afternoon: `claude-opus-4-8`; fusion-vs-opus-4.8: `openrouter/fusion` vs `anthropic/claude-opus-4.8`; opus-vs-glm-5.2: `anthropic/claude-opus-4-8` vs `z-ai/glm-5.2`).
- The **Ship or Skip** series is the exception to "one shot each": each build is brainstormed with the agent first, then built — the take-home prompt is the brainstorm-first brief.

MIT licensed. Yoink anything.
