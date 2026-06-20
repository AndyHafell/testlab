// server.js — Video Factory local proxy.
// Faithful replica of the CM2.2 n8n pipeline, run locally with ffmpeg.
//   twitterapi.io -> OpenAI script -> ElevenLabs TTS -> Replicate lipsync
//   -> ffmpeg combine + Scribe captions -> vertical MP4.
import "dotenv/config";
import express from "express";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { buildAss } from "./lib/ass.js";
import {
  probeDuration, hasAudio, download, extractAudioSlice,
  combineVertical, transformX9x16, combineMusic, burnCaptions, makeAvatarSegment,
} from "./lib/ffmpeg.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const MEDIA = path.join(ROOT, "media");
const CACHE = path.join(ROOT, "cache");
const PUBLIC = path.join(ROOT, "public");
const IDEAS_FILE = path.join(ROOT, "x_ideas.json");
await mkdir(MEDIA, { recursive: true });
await mkdir(CACHE, { recursive: true });

const {
  ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID = "YOUR_ELEVENLABS_VOICE_ID",
  TWITTERAPI_KEY, REPLICATE_API_TOKEN, OPENAI_API_KEY,
  AVATAR_URL = "https://drive.google.com/uc?id=1xkFv4authcSs-uRs1Hw-XuFMOq9jHYMy&export=download",
  MUSIC_PATH = path.join(process.env.HOME || "", "Downloads", "BananaCake.mp3"),
  PORT = 8124,
} = process.env;

const KEYS = {
  elevenlabs: !!ELEVENLABS_API_KEY,
  twitter: !!TWITTERAPI_KEY,
  replicate: !!REPLICATE_API_TOKEN,
  openai: !!OPENAI_API_KEY,
};

/* ----------------------------- helpers ----------------------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function exists(p){ try { await stat(p); return true; } catch { return false; } }

/** Download a Google Drive file, handling the virus-scan confirmation redirect. */
async function driveDownload(fileId, dest) {
  const base = "https://drive.usercontent.google.com/download";
  let url = `${base}?id=${fileId}&export=download&authuser=0`;
  let res = await fetch(url, { redirect: "follow" });
  let buf = Buffer.from(await res.arrayBuffer());
  // If Drive returned an HTML confirmation page, pull the confirm token and retry.
  const text = buf.slice(0, 2000).toString("utf8");
  const tok = text.match(/confirm=([0-9A-Za-z_]+)/);
  if (tok && (buf.length < 100000 || text.includes("download_warning"))) {
    url = `${base}?id=${fileId}&export=download&confirm=${tok[1]}&authuser=0`;
    res = await fetch(url, { redirect: "follow" });
    buf = Buffer.from(await res.arrayBuffer());
  }
  await writeFile(dest, buf);
  return dest;
}
function driveFileId(url){ const m = String(url).match(/[?&]id=([^&]+)/) || String(url).match(/\/d\/([^/]+)/); return m ? m[1] : null; }

/* ----------------------------- twitterapi.io ----------------------------- */
function normalizeTweet(t) {
  const media = t?.extendedEntities?.media?.[0] || t?.entities?.media?.[0];
  let video_url = null, thumbnail = null, duration = null;
  if (media) {
    thumbnail = media.media_url || media.previewImageUrl || null;
    const vi = media.video_info || media?.videoInfo;
    if (vi) {
      duration = vi.duration_millis ? vi.duration_millis / 1000 : (vi.duration ? vi.duration/1000 : null);
      const variants = (vi.variants || []).filter(v => /\.mp4$/i.test(v.url || v.content?.url || ""));
      if (variants.length) {
        variants.sort((a,b) => (b.bitrate||0) - (a.bitrate||0));
        video_url = variants[0].url || variants[0].content?.url;
      }
    }
  }
  return {
    id: t.id || t.rest_id || randomUUID(),
    handle: t.author?.userName || t.author?.screen_name || "unknown",
    author: t.author?.name || t.author?.userName || "Unknown",
    text: t.text || "",
    video_url, thumbnail,
    views: t.viewCount ?? t.views ?? 0,
    likes: t.likeCount ?? t.likes ?? 0,
    retweets: t.retweetCount ?? t.retweets ?? 0,
    duration,
    url: t.url || (t.id ? `https://x.com/i/status/${t.id}` : null),
    source: "twitter",
  };
}
async function twitterSearch(query) {
  if (!TWITTERAPI_KEY) throw new Error("TWITTERAPI_KEY not set");
  const url = new URL("https://api.twitterapi.io/twitter/tweet/search");
  url.searchParams.set("query", query || "min_faves:5000 has:video");
  url.searchParams.set("queryType", "Top");
  const r = await fetch(url, { headers: { "X-API-Key": TWITTERAPI_KEY } });
  if (!r.ok) throw new Error(`twitterapi.io ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const tweets = j.tweets || j.data?.tweets || [];
  return tweets.map(normalizeTweet).filter(t => t.video_url);
}

/* ----------------------------- ElevenLabs ----------------------------- */
async function elevenTTS(text, voiceId, dest) {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    { method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text, model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.9, similarity_boost: 0.3, style: 1, use_speaker_boost: true, speed: 1 },
      }) });
  if (!r.ok) throw new Error(`ElevenLabs TTS ${r.status}: ${await r.text()}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf);
  return dest;
}
async function elevenScribe(audioPath) {
  const buf = await readFile(audioPath);
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "en");
  form.append("speaker_diarization", "true");
  form.append("tag_audio_events", "true");
  form.append("file", new Blob([buf]), "voice.mp3");
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST", headers: { "xi-api-key": ELEVENLABS_API_KEY }, body: form });
  if (!r.ok) throw new Error(`ElevenLabs Scribe ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.words || j.data?.[0]?.words || [];
}

/* ----------------------------- Replicate (pixverse/lipsync) ----------------------------- */
async function replicateLipsync(audioPath, videoUrl) {
  // Replicate accepts data: URIs as model inputs. The avatar is passed as its
  // public Drive URL (how CM2.2 did it); the 3s voice (local) goes as base64.
  const audioB64 = (await readFile(audioPath)).toString("base64");
  const audioUri = `data:audio/mpeg;base64,${audioB64}`;
  const create = await fetch("https://api.replicate.com/v1/models/pixverse/lipsync/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: { audio: audioUri, video: videoUrl } }) });
  if (!create.ok) throw new Error(`Replicate create ${create.status}: ${await create.text()}`);
  const pred = await create.json();
  const getUrl = pred.urls?.get;
  let status = pred.status, result = pred;
  for (let i = 0; i < 120; i++) {
    if (status === "succeeded") break;
    if (status === "failed" || status === "canceled") throw new Error(`Replicate lipsync ${status}: ${result.error||""}`);
    await sleep(5000);
    const p = await fetch(getUrl, { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } });
    result = await p.json(); status = result.status;
  }
  if (status !== "succeeded") throw new Error(`Replicate lipsync timed out (${status})`);
  const out = result.output;
  const url = Array.isArray(out) ? out[0] : out;
  if (!url) throw new Error("Replicate lipsync returned no output");
  return url;
}

/* ----------------------------- OpenAI script ----------------------------- */
const SCRIPT_SYS = `You are a viral YouTube Shorts scriptwriter.
• Output one script only, no pre/post text. Compute WORD_BUDGET = floor(seconds * WPS) (default WPS = 2.4). Never exceed WORD_BUDGET. 6th-grade reading level.
• Hook: Start direct, no preamble. Feel like a secret, not corporate news.
  Core Idea: A specific, named tool/product grants you an unprecedented, effortless, interactive, and truly magical power that physically transforms your real-world environment or devices, or creates a profoundly immersive, visually stunning, and actively interactive sensory experience. It does something FOR you, solving a major, mundane, personal, everyday frustration in a fundamentally new, surprising, interactive way. The magic must be zero-effort, playful, and dynamically responsive. Avoid corporate-speak; benefit immediate, personal.
  Pattern: "[Specific Tool/Product] just [magically transforms your physical world/device in a tangible, unprecedented way AND solves a real problem] OR [effortlessly grants you an immersive, tangible, magical new power that solves a real problem]".
  PROHIBITIONS: NEVER feature abstract digital agents, non-visual automation, conceptual outcomes. NEVER involve niche technical specs, minor digital conveniences, generic digital organization. NEVER act as a handyman/repair service, design/manufacture physical objects, find replacement parts, or improve existing conventional products. NEVER use generic AI model names unless a specific branded application with a tangible, interactive, personal outcome. The outcome MUST be a new physical state, tangible transformation, or profoundly interactive, visually immersive sensory experience. Passive visuals or information retrieval are NOT enough.
• Details: Elaborate with specific, verifiable facts. Paint a vivid before/after, tangible experiential impact, how the problem is solved. Explain simple, visualizable, magical steps highlighting zero effort and fundamentally new capabilities.
• Tone: Energetic, conversational, slightly hyperbolic, grounded in relatable benefits. Never make misleading claims.
• Conclusion: Deliver a shocking/profound implication — a powerful unexpected twist or personally relevant statement highlighting the tangible scale of the problem solved or future impact.`;

async function openaiResearch(text, author) {
  if (!OPENAI_API_KEY) return "";
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [{ role: "user", content:
          `find out more information about:\n${text}\n\nPosted by ${author} on x.\nThey may have announced something or an update?\nFind as many facts and information about it as possible.\nCome back with at least 500 words` }],
      }) });
    if (!r.ok) return "";
    const j = await r.json();
    return j.choices?.[0]?.message?.content || "";
  } catch { return ""; }
}
async function openaiScript({ postText, research, seconds, wps=2.4 }) {
  if (!OPENAI_API_KEY) return postText.replace(/\s+/g, " ").trim();
  const user = `The hook of the intro is usually found in this text, which is the viral X post we're using as inspiration:\n${postText}\n\nSource Text body:\n${research || "(no research)"}\n\nTarget length: seconds: ${seconds}\nNote: Never go over 45 Seconds\n(Optional) Speaking rate override: ${wps} words per second.`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "o3",
      messages: [{ role: "system", content: SCRIPT_SYS }, { role: "user", content: user }],
    }) });
  if (!r.ok) throw new Error(`OpenAI script ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() || postText;
}

/* ----------------------------- avatar cache ----------------------------- */
let _avatarCache = null;
async function getAvatarPath(job) {
  if (_avatarCache && await exists(_avatarCache)) return _avatarCache;
  const dest = path.join(CACHE, "avatar.mp4");
  job?.log(`Downloading avatar from Drive…`);
  const fid = driveFileId(AVATAR_URL);
  if (fid) { try { await driveDownload(fid, dest); _avatarCache = dest; return dest; } catch (e) { job?.log(`Drive download failed: ${e.message}; trying direct URL`); } }
  await download(AVATAR_URL, dest);
  _avatarCache = dest;
  return dest;
}

/* ----------------------------- jobs / produce ----------------------------- */
const jobs = new Map();
function newJob() {
  const id = randomUUID().slice(0, 8);
  const dir = path.join(MEDIA, id);
  const job = { id, dir, status: "queued", progress: 0, logs: [], videoUrl: null, error: null, started: Date.now() };
  jobs.set(id, job);
  return job;
}
async function produce(job, input) {
  const { idea, script, voice = ELEVENLABS_VOICE_ID, musicPath = MUSIC_PATH, cropTop = 0 } = input;
  const d = job.dir; await mkdir(d, { recursive: true });
  const log = (m) => { job.logs.push(m); console.log(`[${job.id}] ${m}`); };
  const set = (p, m) => { job.progress = p; if (m) log(m); };
  try {
    job.status = "running";
    set(2, "Downloading source X video…");
    const xvideo = path.join(d, "xvideo.mp4");
    await download(idea.video_url, xvideo);

    set(10, "Generating voiceover (ElevenLabs TTS)…");
    const voiceFull = path.join(d, "voice_full.mp3");
    await elevenTTS(script, voice, voiceFull);
    const voiceDur = await probeDuration(voiceFull);

    set(30, "Transcribing voiceover (ElevenLabs Scribe)…");
    let words = [];
    try { words = await elevenScribe(voiceFull); }
    catch (e) { log(`Scribe failed (${e.message}); using even-spread captions`); }

    // Avatar segment: Replicate lip-sync if available, else static.
    let clone = path.join(d, "clone.mp4");
    if (REPLICATE_API_TOKEN) {
      set(45, "Extracting 3s voice for lip-sync…");
      const voice3 = path.join(d, "voice3.mp3");
      await extractAudioSlice(voiceFull, voice3, 3);
      const avatar = await getAvatarPath({ log });
      set(50, "Running Replicate pixverse/lipsync (this can take ~1 min)…");
      try {
        const lipsyncUrl = await replicateLipsync(voice3, AVATAR_URL);
        await download(lipsyncUrl, clone);
      } catch (e) {
        log(`Lip-sync failed (${e.message}); using static avatar overlay`);
        await makeAvatarSegment({ avatar, output: clone, seconds: 3 });
      }
    } else {
      set(45, "No Replicate key — using static avatar overlay");
      const avatar = await getAvatarPath({ log });
      await makeAvatarSegment({ avatar, output: clone, seconds: 3 });
    }

    set(70, "Combining vertical (avatar segment)…");
    const vertical = path.join(d, "output_vertical.mp4");
    await combineVertical({ xvideo, clone, output: vertical, cropTop });

    set(80, "Laying X video + voiceover (9x16)…");
    const x916 = path.join(d, "xvideo_9x16.mp4");
    await transformX9x16({ xvideo, voice: voiceFull, output: x916 });

    set(88, "Overlaying avatar + music…");
    const videoOnly = path.join(d, "video_only.mp4");
    await combineMusic({ base: x916, overlay: vertical, music: musicPath, output: videoOnly });

    set(93, "Building cyan word captions…");
    let ass;
    if (words.length) {
      ass = buildAss(words, { wordsToShow: 3 });
    } else {
      // even-spread fallback: one token per equal slice of voiceDur
      const ws = script.replace(/\s+/g, " ").trim().split(" ").filter(Boolean)
        .map((w, i, a) => ({ word: w, start: (i / a.length) * voiceDur, end: ((i + 1) / a.length) * voiceDur }));
      ass = buildAss(ws, { wordsToShow: 3 });
    }
    await writeFile(path.join(d, "subs.ass"), ass);

    set(97, "Burning captions…");
    const out = path.join(d, "output.mp4");
    await burnCaptions({ video: videoOnly, ass: path.join(d, "subs.ass"), output: out, cwd: d });

    job.videoUrl = `/media/${job.id}/output.mp4`;
    job.status = "done"; job.progress = 100;
    log("Done.");
  } catch (e) {
    job.status = "error"; job.error = e.message; log("ERROR: " + e.message);
    console.error(e);
  }
}

/* ----------------------------- express ----------------------------- */
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(PUBLIC));
app.use("/media", express.static(MEDIA));

app.get("/api/config", (req, res) => {
  res.json({
    voice: ELEVENLABS_VOICE_ID,
    avatarUrl: AVATAR_URL,
    musicPath: MUSIC_PATH, musicAvailable: existsSync(MUSIC_PATH),
    keys: KEYS,
  });
});

app.get("/api/ideas", async (req, res) => {
  try {
    const raw = JSON.parse(await readFile(IDEAS_FILE, "utf8"));
    const ideas = raw.map(i => ({
      id: i.url || i.handle, handle: i.handle, author: i.author, text: i.text,
      video_url: i.video_url, thumbnail: i.thumbnail,
      views: i.views, likes: i.likes, retweets: i.retweets,
      duration: i.duration || null, url: i.url, score: i.score, source: "local",
    }));
    res.json({ ideas });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/twitter/search", async (req, res) => {
  try { res.json({ ideas: await twitterSearch(req.query.q) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/script", async (req, res) => {
  try {
    const { text, author, handle, duration=30, wps=2.4 } = req.body || {};
    const seconds = Math.min(45, Math.max(5, Math.round(duration || 30)));
    const research = await openaiResearch(text || "", author || handle || "");
    const script = await openaiScript({ postText: text || "", research, seconds, wps });
    res.json({ script, research, seconds });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/produce", async (req, res) => {
  const job = newJob();
  res.json({ jobId: job.id });
  produce(job, req.body || {}).catch(e => { job.status = "error"; job.error = e.message; });
});
app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "no such job" });
  res.json({
    id: job.id, status: job.status, progress: job.progress,
    logs: job.logs.slice(-40), videoUrl: job.videoUrl, error: job.error,
  });
});

app.listen(PORT, () => {
  console.log(`Video Factory on http://localhost:${PORT}`);
  console.log("Keys:", KEYS);
  console.log("Music:", MUSIC_PATH, existsSync(MUSIC_PATH) ? "(found)" : "(MISSING)");
});
