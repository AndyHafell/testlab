# Text Write-On Animation

The exact one-shot prompt, fired at both `anthropic/claude-opus-4.8` and `z-ai/glm-5.2` — same prompt, no follow-ups, no retries:

```
Build a Remotion project turning a spoken sentence into a word-synced write-on animation. Must: (1) ElevenLabs Scribe transcribes audio to word-level timestamps (API key from env var), (2) each word animates in sync on dark navy bg + white text, (3) renders to MP4 with a sample clip + transcript JSON included.
```
