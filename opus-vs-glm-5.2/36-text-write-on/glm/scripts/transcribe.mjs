#!/usr/bin/env node
// ElevenLabs Scribe transcription -> Scribe-format JSON with word-level timestamps.
//
//   node scripts/transcribe.mjs [audioFile=sample.mp3] [out=transcript.json]
//
// Requires ELEVENLABS_API_KEY in the environment. The output JSON matches the
// shape Remotion reads in src/Root.jsx (words[] with text/start/end/type,
// plus audio_duration_secs). If the key is not set the project renders off the
// staged transcript.json instead.

import fs from 'node:fs';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
const [audioArg = 'sample.mp3', outArg = 'transcript.json'] = process.argv.slice(2);

if (!apiKey) {
  console.error(
    'ELEVENLABS_API_KEY is not set. Export it and re-run, or render off the staged transcript.json.'
  );
  process.exit(1);
}

const audioPath = path.resolve(audioArg);
if (!fs.existsSync(audioPath)) {
  console.error(`Audio file not found: ${audioPath}`);
  process.exit(1);
}

const form = new FormData();
form.append(
  'file',
  new Blob([fs.readFileSync(audioPath)], {type: 'audio/mpeg'}),
  path.basename(audioPath)
);
form.append('model_id', 'scribe_v1');

const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
  method: 'POST',
  headers: {'xi-api-key': apiKey},
  body: form,
});

if (!res.ok) {
  console.error(`Scribe request failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const data = await res.json();
const outPath = path.resolve(outArg);
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

const wordCount = (data.words || []).filter((w) => w.type === 'word').length;
console.log(`Wrote ${outPath} — ${wordCount} words, ${data.audio_duration_secs}s`);
