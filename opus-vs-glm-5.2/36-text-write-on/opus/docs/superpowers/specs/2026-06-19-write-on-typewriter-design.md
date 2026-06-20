# Word-synced typewriter write-on — design

**Date:** 2026-06-19
**Status:** Approved

## Goal

Turn a spoken sentence into a word-synced "write-on" animation rendered to MP4, driven by
ElevenLabs Scribe word-level timestamps. Dark navy background, white text, typewriter
(character-by-character) reveal in sync with the audio.

## Inputs

Canonical assets live in `public/` (Remotion serves static files from there):

- `public/sample.mp3` — 4.128s clip ("GLM now has made it into the top four-").
- `public/transcript.json` — ElevenLabs Scribe output: `words[]` of `{text, start, end, type}`
  where `type ∈ {word, spacing, audio_event}`. Concatenating every token's `text` in order
  reproduces the full sentence (spaces live in `spacing` tokens).

The staged originals in the project root are left untouched; `public/` copies are what the
app consumes.

## Composition

`WriteOn`, 1920×1080, 30 fps. Duration derived from the transcript:
`ceil(totalDurationSec * fps) + 30` (a 1s hold on the finished sentence).
Background `#0B1E33`, text `#F5F7FA`, accent caret `#5BC8FF`, system monospace stack.

## Timing model — `src/transcript.ts` (the pure, tested unit)

- `buildRevealChars(transcript)` flattens every token's characters into an ordered
  `RevealChar[] = {char, revealAt}`. Character *i* of a token of length *L* spanning
  `[start, end]` reveals at `start + (i/L)·(end−start)` — typing speed tracks each word's
  spoken pace. `audio_event` tokens are skipped (non-spoken markers).
- `totalDurationSec(transcript)` = `max(audio_duration_secs, last token end)`.

Reveal times are non-decreasing because tokens are contiguous (`spacing.start == word.end`),
so the visible prefix at time `t` is `chars.slice(0, count)` where `count` = chars with
`revealAt ≤ t`. Unit-tested with `node:test`.

## Renderer — `src/Typewriter.tsx`

- `t = frame/fps`; render the visible prefix plus a caret.
- Caret is solid while actively typing (a char revealed within ~90ms), blinks ~0.94Hz
  when idle/finished.
- `<Audio src={staticFile('sample.mp3')} />` keeps text and audio in sync.

## Transcribe script — `scripts/transcribe.mjs`

`POST https://api.elevenlabs.io/v1/speech-to-text`, multipart `file=public/sample.mp3`,
`model_id=scribe_v1`, header `xi-api-key` from `ELEVENLABS_API_KEY` (fallback `XI_API_KEY`).
Writes `public/transcript.json`. The render never needs the key — it reads the committed JSON.

## Files

`package.json`, `tsconfig.json`, `remotion.config.ts`,
`src/{index.ts, Root.tsx, Typewriter.tsx, transcript.ts, transcript.test.ts}`,
`scripts/transcribe.mjs`, `README.md`. Output: `out/write-on.mp4`.

## Verification

1. `npm test` — timing unit test passes.
2. `npm run render` — `out/write-on.mp4` exists, ~5s, non-trivial size.
