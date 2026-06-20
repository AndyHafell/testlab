# Word-synced typewriter write-on (Remotion)

Turns a spoken sentence into a character-by-character "write-on" animation, synced to
ElevenLabs Scribe word-level timestamps. Dark navy background, white monospace text, blinking
caret. Renders to MP4.

A sample clip and its transcript are included so you can render immediately, with no API key.

## Layout

```
public/sample.mp3        # audio (served by Remotion)
public/transcript.json   # ElevenLabs Scribe word-level timestamps (what the render reads)
sample.mp3, transcript.json   # the original staged inputs (kept as-is)
src/transcript.ts        # timing model: transcript -> per-character reveal times (unit-tested)
src/Typewriter.tsx       # the composition: navy bg, audio, typewriter reveal + caret
src/Root.tsx             # registers the WriteOn composition, computes duration
scripts/transcribe.mjs   # (re)generate public/transcript.json via ElevenLabs Scribe
out/write-on.mp4         # render output
```

## Setup

```bash
npm install
```

## Render the MP4 (no API key needed)

```bash
npm run render          # -> out/write-on.mp4
```

The render reads the committed `public/transcript.json`, so it works offline.

## Preview interactively

```bash
npm run dev             # opens Remotion Studio
```

## Re-transcribe the audio (needs an API key)

Word-level timestamps come from ElevenLabs Scribe. Set your key and run:

```bash
export ELEVENLABS_API_KEY=sk_...   # or XI_API_KEY
npm run transcribe                 # overwrites public/transcript.json from public/sample.mp3
```

## Test the timing model

```bash
npm test
```

## Swapping in your own clip

1. Replace `public/sample.mp3`.
2. `npm run transcribe` to regenerate `public/transcript.json`.
3. `npm run render`.

Duration, wrapping, and per-word typing speed all derive from the transcript automatically.
