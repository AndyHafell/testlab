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

**Both builds ship per prompt.** Each prompt folder has the prompt plus *both*
unedited outputs in `opus/index.html` and `fusion/index.html` — open either in a
browser and play. Nothing is trimmed; this is exactly what each model returned.

| # | Prompt | What it is | Builds |
|---|--------|------------|--------|
| 22 | [GTA v2](22-gta-v2/PROMPT.md) | top-down open-world game **with weapons**, one HTML file | [opus](22-gta-v2/opus/index.html) · [fusion](22-gta-v2/fusion/index.html) |
| 23 | [The internet in 1999](23-internet-1999/PROMPT.md) | dial-up boot + a browsable '90s web, one HTML file | [opus](23-internet-1999/opus/index.html) · [fusion](23-internet-1999/fusion/index.html) |
| 24 | [Pixel Synth](24-pixel-synth/PROMPT.md) | FL Studio-style 8-bit chiptune looper, Web Audio | [opus](24-pixel-synth/opus/index.html) · [fusion](24-pixel-synth/fusion/index.html) |
| 25 | [Flight Sim](25-flight-sim/PROMPT.md) | 3D jet + air combat, one HTML file (CDN three.js ok) | [opus](25-flight-sim/opus/index.html) · [fusion](25-flight-sim/fusion/index.html) |
| 26 | [Destruction Sandbox](26-destruction-sandbox/PROMPT.md) | physics mayhem playground (CDN Matter.js ok) | [opus](26-destruction-sandbox/opus/index.html) · [fusion](26-destruction-sandbox/fusion/index.html) |
| 27 | [Productivity Hub](27-productivity-hub/PROMPT.md) | Kanban + calendar + to-do + Pomodoro, one HTML file | [opus](27-productivity-hub/opus/index.html) · [fusion](27-productivity-hub/fusion/index.html) |

## Run it yourself

The A/B harness that fired these at both models ships here too:

- **`ab_test.py`** — sends the same prompt to two OpenRouter models and captures
  the full response, token usage, cost (USD), and latency. Python stdlib only, no
  `pip install`. Reads `OPENROUTER_API_KEY` from a `.env` next to the script (or
  the environment).
- **`viewer.html`** — dark, presentation-style side-by-side viewer with a 6-test
  tab switcher and a winner toggle. Loads per-test results from `runs/*.js` (run
  the harness to generate them; tabs show "not run yet" until then).

```bash
# one test by hand
python3 ab_test.py \
  --prompt-file 22-gta-v2/PROMPT.md \
  --slug gta-v2 --label "GTA v2" --max-tokens 32000 --timeout 600
```

Copy any prompt above and run it on whatever models exist when you're reading
this — that's the whole point.
