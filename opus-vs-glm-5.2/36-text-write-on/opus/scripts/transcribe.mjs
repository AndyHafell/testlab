#!/usr/bin/env node
// Regenerate public/transcript.json from public/sample.mp3 using ElevenLabs Scribe.
// The render pipeline reads the committed transcript.json, so this script is only
// needed when you want to (re)transcribe — and it's the only step that needs an API key.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const audioPath = join(root, "public", "sample.mp3");
const outPath = join(root, "public", "transcript.json");

const apiKey = process.env.ELEVENLABS_API_KEY ?? process.env.XI_API_KEY;
if (!apiKey) {
  console.error(
    "Missing ElevenLabs API key. Set ELEVENLABS_API_KEY (or XI_API_KEY) and retry.",
  );
  process.exit(1);
}

const audio = await readFile(audioPath);

const form = new FormData();
form.append("model_id", "scribe_v1");
// Word-level timestamps are Scribe's default granularity.
form.append("file", new Blob([audio], { type: "audio/mpeg" }), "sample.mp3");

const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
  method: "POST",
  headers: { "xi-api-key": apiKey },
  body: form,
});

if (!res.ok) {
  const body = await res.text().catch(() => "");
  console.error(
    `ElevenLabs Scribe failed: ${res.status} ${res.statusText}\n${body}`,
  );
  process.exit(1);
}

const data = await res.json();
await writeFile(outPath, JSON.stringify(data, null, 2) + "\n");
console.log(
  `Wrote ${outPath} — ${data.words?.length ?? 0} tokens: "${data.text ?? ""}"`,
);
