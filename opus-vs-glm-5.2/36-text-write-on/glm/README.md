# Word-synced write-on (Remotion + ElevenLabs Scribe)

Turns a spoken sentence into a word-synced write-on animation: each word wipes
in left-to-right across its own spoken window, in sync with the audio, on a
dark-navy background with white text. Renders to MP4.

## Files

- `src/Root.jsx` — registers the `WriteOn` composition; computes duration from
  `transcript.json` (audio length + 0.6s tail).
- `src/WriteOn.jsx` — the animation. Lays the sentence out once (stable
  layout), then per word applies a left-to-right `clip-path` wipe driven by the
  word's `[start, end]` timestamps from Scribe.
- `src/index.jsx` — Remotion entry (`registerRoot`).
- `scripts/transcribe.mjs` — calls ElevenLabs Scribe using
  `ELEVENLABS_API_KEY` and writes Scribe-format JSON (word-level timestamps).
- `public/sample.mp3` — the sample clip, played as the video's audio track.
- `transcript.json` — the staged Scribe word-timestamp transcript the render
  uses.
- `out/write-on.mp4` — the rendered video.

## Render (off the staged transcript)

```
npm install
npx remotion render src/index.jsx WriteOn out/write-on.mp4
```

1280×720, 30fps, ~4.7s, H.264 + AAC (audio = the spoken sample.mp3).

## Re-transcribe a different clip with Scribe

```
export ELEVENLABS_API_KEY=...
node scripts/transcribe.mjs path/to/audio.mp3 transcript.json
# then put the audio at public/sample.mp3 (or update WriteOn.jsx) and render
```

## Preview

```
npx remotion studio src/index.jsx
```
