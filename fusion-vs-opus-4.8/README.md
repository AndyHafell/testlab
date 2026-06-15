# fusion vs opus 4.8 — Same 6 Prompts, Two Models, Head to Head

**Watch: (video coming — link lands here at publish)**

A different format: instead of one model, the same six one-shot prompts are
fired at **two** models at once and judged side by side —

- **`openrouter/fusion`** — OpenRouter's multi-model composite: it fans the
  prompt out to a panel of models plus web search, then synthesizes one answer.
- **`anthropic/claude-opus-4.8`** — a single frontier model.

Same prompt, no follow-ups, no retries. Each model's full response, token usage,
**cost**, and **latency** are captured, and the returned HTML is saved so you can
open both builds and compare. All six are self-contained, single-file builds
(CDN libraries allowed where noted; no bundled asset files).

| # | Prompt | What it is |
|---|--------|------------|
| 22 | [GTA v2](22-gta-v2/PROMPT.md) | top-down open-world game **with weapons**, one HTML file |
| 23 | [The internet in 1999](23-internet-1999/PROMPT.md) | dial-up boot + a browsable '90s web, one HTML file |
| 24 | [Pixel Synth](24-pixel-synth/PROMPT.md) | FL Studio-style 8-bit chiptune looper, Web Audio |
| 25 | [Flight Sim](25-flight-sim/PROMPT.md) | 3D jet + air combat, one HTML file (CDN three.js ok) |
| 26 | [Destruction Sandbox](26-destruction-sandbox/PROMPT.md) | physics mayhem playground (CDN Matter.js ok) |
| 27 | [Productivity Hub](27-productivity-hub/PROMPT.md) | Kanban + calendar + to-do + Pomodoro, one HTML file |

**Run it yourself:** the A/B harness that fires these at both models (and the
dark side-by-side viewer) lives outside this repo. Copy any prompt above and run
it on whatever models exist when you're reading this — that's the whole point.
