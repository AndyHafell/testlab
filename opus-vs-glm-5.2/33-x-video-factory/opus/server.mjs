// Video Factory — local CM2.2 pipeline helper (zero external deps; Node 22 + ffmpeg)
// Serves index.html and runs: TwitterAPI.io -> OpenAI search+o3 -> ElevenLabs TTS
// -> Replicate lipsync -> ffmpeg composite -> ElevenLabs STT -> burned cyan captions -> MP4.

import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const WORK = path.join(ROOT, 'work');

/* ---------------- env ---------------- */
function parseEnv(txt){ const o={}; for(const line of txt.split(/\r?\n/)){ const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if(m) o[m[1]]=m[2].replace(/^["']|["']$/g,''); } return o; }
const ENV = existsSync(path.join(ROOT,'.env')) ? parseEnv(readFileSync(path.join(ROOT,'.env'),'utf8')) : {};
function env(k, d=''){ return (process.env[k] || ENV[k] || d); }
// ElevenLabs key: fall back to the salesagent .env if not set here.
let ELEVEN_KEY = env('ELEVENLABS_API_KEY');
if(!ELEVEN_KEY){
  const alt = path.join(os.homedir(),'FableTests/sos-ep1/1_salesagent/.env');
  if(existsSync(alt)){ ELEVEN_KEY = parseEnv(readFileSync(alt,'utf8')).ELEVENLABS_API_KEY || ''; }
}
const CFG = {
  openai: env('OPENAI_API_KEY'),
  replicate: env('REPLICATE_API_TOKEN'),
  twitter: env('TWITTERAPI_KEY'),
  eleven: ELEVEN_KEY,
  voiceId: env('ELEVENLABS_VOICE_ID','YOUR_ELEVENLABS_VOICE_ID'),
  scriptModel: env('OPENAI_SCRIPT_MODEL','o3'),
  searchModel: env('OPENAI_SEARCH_MODEL','gpt-4o-mini-search-preview'),
  ttsModel: env('ELEVENLABS_TTS_MODEL','eleven_multilingual_v2'),
  avatar: path.join(ROOT, env('AVATAR_PATH','avatar.mp4')),
  music: path.join(ROOT, env('MUSIC_PATH','music.mp3')),
  port: +env('PORT','8000'),
};

/* ---------------- shell / ffmpeg helpers ---------------- */
function run(cmd, args, { onErr } = {}){
  return new Promise((resolve, reject)=>{
    const p = spawn(cmd, args);
    let out='', err='';
    p.stdout.on('data', d=> out+=d);
    p.stderr.on('data', d=>{ err+=d; if(onErr) onErr(d.toString()); });
    p.on('error', reject);
    p.on('close', code => code===0 ? resolve({out,err}) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-1200)}`)));
  });
}
async function ffprobeDuration(file){
  const { out } = await run('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', file]);
  return parseFloat(out.trim()) || 0;
}
async function download(url, dest){
  const r = await fetch(url, { headers:{ 'User-Agent':'Mozilla/5.0' } });
  if(!r.ok) throw new Error(`download ${r.status} ${url.slice(0,80)}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf);
  return dest;
}

/* ---------------- external APIs ---------------- */
async function twitterFetch(tweetUrl){
  if(!CFG.twitter) throw new Error('TWITTERAPI_KEY not set');
  const id = (tweetUrl.match(/status\/(\d+)/)||[])[1];
  if(!id) throw new Error('could not parse tweet id from url');
  const r = await fetch(`https://api.twitterapi.io/twitter/tweets?tweet_ids=${id}`, { headers:{ 'X-API-Key': CFG.twitter } });
  const j = await r.json();
  if(!r.ok) throw new Error('twitterapi.io: '+JSON.stringify(j).slice(0,300));
  const t = (j.tweets||[])[0];
  if(!t) throw new Error('twitterapi.io returned no tweet');
  const variants = (((t.extendedEntities||t.extended_entities||{}).media||[])[0]||{}).video_info?.variants || [];
  const mp4s = variants.filter(v=>/mp4/.test(v.content_type||'') && v.url).sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
  const durMs = (((t.extendedEntities||t.extended_entities||{}).media||[])[0]||{}).video_info?.duration_millis || 0;
  return {
    text: t.text||'', author: t.author?.name||t.author?.userName||'', handle: t.author?.userName||'',
    views: t.viewCount||t.view_count||0, videoUrl: mp4s[0]?.url || '', durationSec: durMs? durMs/1000 : 0,
  };
}

const SCRIPT_SYSTEM = `======You are a viral YouTube Shorts scriptwriter.
• Output one script only, no pre/post text. Compute WORD_BUDGET = floor(seconds * WPS) (default WPS = 2.4). Never exceed WORD_BUDGET. 6th-grade reading level.
• **Hook:** Start direct, no preamble. Feel like a secret, not corporate news.
    *   **Core Idea:** A *specific, named tool/product* grants *you* an *unprecedented, effortless, interactive, and truly magical power* that *physically transforms your real-world environment or devices*, or creates a *profoundly immersive, visually stunning, and actively interactive sensory experience*. It *does something FOR you*, solving a *major, mundane, personal, everyday physical or digital frustration* (e.g., boredom, disorganization, information overload) in a *fundamentally new, surprising, and interactive way, far beyond conventional technology*. The magic must be *zero-effort*, *playful*, and *dynamically responsive*. Avoid corporate-speak; benefit immediate, personal.
    *   **Pattern:** "[Specific Tool/Product] just [magically transforms *your* physical world/device in a tangible, unprecedented way AND solves a real problem] OR [effortlessly grants *you* an immersive, tangible, magical new power that solves a real problem]" — e.g. "Your phone camera just turned every selfie into a 3D memory you can walk through." OR "This 99-buck fridge cam just restocks your groceries for you." OR "Gemma 4 just taught your MacBook to watch any video and name every object." OR "MarioGlass just turns every loading bar into live Super Mario." OR "Toyota's CUE7 robot just nails every free-throw for you."
    *   **CRITICAL PROHIBITIONS (STRICTLY ADHERE - common reasons for low views/rejection):**
        *   **NEVER** feature abstract digital agents, non-visual automation, *conceptual outcomes* (e.g., 'AI sitting through Zoom calls', *paying bills*, *managing finances*, *building apps*, *optimizing workflows*, *medical diagnostics*, *creating a recreational space like a roller rink*).
        *   **NEVER** involve *niche technical specs*, *minor digital conveniences*, *generic digital organization* (unless the *outcome* is a *profoundly interactive, visually stunning, and actively transformative sensory experience*).
        *   **NEVER** act as a *handyman* or *repair service*, *design/manufacture physical objects* (e.g., *rebuilding snapped gadgets, 3D printing parts, door handles*), *find replacement parts/information* (e.g., *TileMatch app*), or *improve existing conventional products* (e.g., *better AC, projector, fixing a jam*).
        *   **NEVER** use generic AI model names (e.g., GPT, Claude, Gemini, Grok, Runway) unless it's a specific, branded *application* with a *physically or visually tangible, interactive, personal* outcome (e.g., "Gemma 4" for object recognition, "MarioGlass" for loading bars).
        *   **The outcome MUST be a *new physical state, tangible transformation, or a profoundly interactive, visually immersive, and physically real sensory experience*. Passive visuals, mere digital organization, or information retrieval are NOT enough. The visual experience must be *actively interactive, dynamically responsive, and transformative*, not just a passive display, minor aesthetic change, or *non-interactive projection* (e.g., custom wall art, static holograms). The transformation must be *effortless, magical, and playful*, not requiring user design or complex interaction. It must solve a clear, everyday problem in a *significant, unexpected, and beyond conventional solutions* way.**
        *   **AVOID** concepts that are too subtle, niche, or primarily about *digital archiving/viewing* (e.g., 3D photos from old pictures). Focus on *active, dynamic, and universally exciting transformations*.
• **Details:** Elaborate with specific, verifiable facts. Paint a vivid *before and after* picture, showing *tangible, experiential impact* and *how the problem is solved*. Explain simple, *visualizable, magical steps/mechanisms* that highlight the *zero effort* required and the *fundamentally new, interactive, dynamically responsive, or transformative* capabilities, emphasizing *novelty, surprise, playfulness, active manipulation*, and *effortless execution* of *physically or visually tangible, transformative* powers.
• **Tone:** Energetic, conversational, slightly hyperbolic, but grounded in relatable benefits. **Never make misleading claims.**
• **Conclusion:** Deliver a shocking/profound implication. A powerful, unexpected twist or *personally relevant* statement highlighting the *tangible scale of the problem solved* or *future impact* of this new, *effortless, magical* power.`;

async function openaiChat(model, messages){
  if(!CFG.openai) throw new Error('OPENAI_API_KEY not set');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${CFG.openai}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model, messages }),
  });
  const j = await r.json();
  if(!r.ok) throw new Error('openai: '+JSON.stringify(j.error||j).slice(0,400));
  return j.choices?.[0]?.message?.content?.trim() || '';
}
async function generateScript({ text, author, handle, durationSec }){
  let research = '';
  try {
    research = await openaiChat(CFG.searchModel, [{ role:'user', content:
      `find out more information about: \n${text}\n\nPosted by ${author||handle} on x. \n\nThey may have annoucned something or an update?\nI want you to find as many facts and information about it.\n\nCome back with at least 500 words` }]);
  } catch(e){ research = '(search step skipped: '+e.message+')'; }
  const seconds = Math.min(45, Math.max(8, Math.round(durationSec||30)));
  const user = `The hook of the intro is usually found in this text, which is the viral X post we're using as inspiration: \n${text}\n\n\nSource Text body:\n${research}\n\nTarget length: seconds: ${seconds}\n\nNote: Never go over 45 Seconds \n\n(Optional) Speaking rate override: 2.4 words per second. `;
  return await openaiChat(CFG.scriptModel, [{ role:'system', content: SCRIPT_SYSTEM }, { role:'user', content: user }]);
}

async function elevenTTS(text, dest){
  if(!CFG.eleven) throw new Error('ELEVENLABS_API_KEY not available');
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${CFG.voiceId}?output_format=mp3_44100_128`;
  const r = await fetch(url, { method:'POST',
    headers:{ 'xi-api-key': CFG.eleven, 'Content-Type':'application/json', 'accept':'audio/mpeg' },
    body: JSON.stringify({ text: text.replace(/\r?\n/g,' '), model_id: CFG.ttsModel,
      voice_settings:{ stability:0.9, similarity_boost:0.3, style:1, use_speaker_boost:true, speed:1 } }) });
  if(!r.ok) throw new Error('elevenlabs tts: '+(await r.text()).slice(0,300));
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
  return dest;
}
async function elevenSTT(file){
  const fd = new FormData();
  fd.set('model_id','scribe_v1'); fd.set('language_code','en'); fd.set('tag_audio_events','true');
  fd.set('file', new Blob([readFileSync(file)], { type:'audio/mpeg' }), path.basename(file));
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method:'POST',
    headers:{ 'xi-api-key': CFG.eleven, 'accept':'application/json' }, body: fd });
  const j = await r.json();
  if(!r.ok) throw new Error('elevenlabs stt: '+JSON.stringify(j).slice(0,300));
  return j;
}
async function replicateUpload(file, type){
  const fd = new FormData();
  fd.set('content', new Blob([readFileSync(file)], { type }), path.basename(file));
  const r = await fetch('https://api.replicate.com/v1/files', { method:'POST',
    headers:{ 'Authorization':`Bearer ${CFG.replicate}` }, body: fd });
  const j = await r.json();
  if(!r.ok) throw new Error('replicate upload: '+JSON.stringify(j).slice(0,300));
  return j.urls?.get || j.urls?.download;
}
async function replicateLipsync(audioFile, videoFile, emit){
  const [audioUrl, videoUrl] = await Promise.all([ replicateUpload(audioFile,'audio/mpeg'), replicateUpload(videoFile,'video/mp4') ]);
  const r = await fetch('https://api.replicate.com/v1/models/pixverse/lipsync/predictions', { method:'POST',
    headers:{ 'Authorization':`Bearer ${CFG.replicate}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ input:{ audio: audioUrl, video: videoUrl } }) });
  let pred = await r.json();
  if(!r.ok) throw new Error('replicate create: '+JSON.stringify(pred).slice(0,300));
  const getUrl = pred.urls?.get;
  for(let i=0;i<120;i++){
    if(['succeeded','failed','canceled'].includes(pred.status)) break;
    await new Promise(s=>setTimeout(s,3000));
    emit && emit({ stage:'lipsync', msg:`lipsync ${pred.status}… (${i*3}s)`, pct: 45 });
    pred = await (await fetch(getUrl, { headers:{ 'Authorization':`Bearer ${CFG.replicate}` } })).json();
  }
  if(pred.status!=='succeeded') throw new Error('lipsync '+pred.status+': '+(pred.error||''));
  const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  return out;
}

/* ---------------- ASS captions (ported from CM2.2 Code node) ---------------- */
function buildAss(stt, { width=1080, height=1920 } = {}){
  const C = { wordsToShow:3, fontName:'Arial', fontSize:50, fontColor:'FFFFFF', outlineColor:'000000',
    backgroundColor:'000000', highlightFontSize:50, highlightColor:'00FFFF', bold:10, borderStyle:1,
    outline:3, shadow:2, alignment:8, marginL:10, marginR:10, marginV:1270, minWordDurSec:0.08,
    holdLastLine:true, maxHoldGapSec:0.6 };
  const esc = t => String(t||'').replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').toUpperCase().replace(/[{}]/g,m=>m==='{'?'\\{':'\\}').replace(/`/g,"'");
  const csS = s => Math.max(0, Math.floor((Number(s)||0)*100));
  const csE = s => Math.max(0, Math.ceil((Number(s)||0)*100));
  const fmt = cs => { cs=Math.max(0,Math.floor(cs)); const h=Math.floor(cs/360000);cs%=360000;const m=Math.floor(cs/6000);cs%=6000;const s=Math.floor(cs/100);const c=cs%100; return h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(c).padStart(2,'0'); };

  let words = [];
  const src = (Array.isArray(stt.data) && stt.data[0]) ? stt.data[0] : stt;
  for(const w of (src.words||[])){
    if('type' in w && String(w.type).toLowerCase()!=='word') continue;
    words.push({ word:String(w.text ?? w.word ?? ''), start:Number(w.start||0), end:Number(w.end||0) });
  }
  words = words.filter(w=>w.word.trim().length);
  words.sort((a,b)=>a.start-b.start||a.end-b.end);
  for(const w of words){ if(!(w.end>w.start)) w.end=w.start+C.minWordDurSec; }
  // monotonic guard
  for(let i=1;i<words.length;i++){ if(words[i].start<words[i-1].end) words[i].start=words[i-1].end; if(!(words[i].end>words[i].start)) words[i].end=words[i].start+C.minWordDurSec; }

  // groups (break on sentence end or limit)
  const groups=[]; let cur=[];
  for(let i=0;i<words.length;i++){ cur.push(words[i]); const txt=words[i].word.trim();
    if(cur.length>=C.wordsToShow || /[.!?]$/.test(txt) || i===words.length-1){ groups.push(cur); cur=[]; } }

  const line = (g,hi)=>{ let s=''; for(let i=0;i<g.length;i++){ if(i>0)s+=' '; const tok=esc(g[i].word).trim();
    s += i===hi ? `{\\fs${C.highlightFontSize}\\c&H${C.highlightColor}&}${tok}{\\r}` : tok; } return s; };

  const raw=[];
  for(const g of groups){ for(let i=0;i<g.length;i++){ raw.push({ text:line(g,i), s:csS(g[i].start), e:csE(g[i].end) }); } }
  const minDur=Math.max(1,Math.round(C.minWordDurSec*100));
  for(const L of raw){ if(L.e<L.s+minDur) L.e=L.s+minDur; }
  for(let i=0;i<raw.length-1;i++){ const a=raw[i],b=raw[i+1]; if(a.e>b.s) a.e=b.s; if(a.e<a.s+minDur) a.e=a.s+minDur; }
  if(C.holdLastLine){ const maxHold=Math.round(C.maxHoldGapSec*100);
    for(let i=0;i<raw.length-1;i++){ const gap=raw[i+1].s-raw[i].e; if(gap>0&&gap<=maxHold) raw[i].e=raw[i+1].s; } }

  let ass='[Script Info]\nScriptType: v4.00+\nPlayResX: '+width+'\nPlayResY: '+height+'\n\n[V4+ Styles]\n';
  ass+='Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
  ass+=`Style: Default,${C.fontName},${C.fontSize},&H${C.fontColor},&H${C.outlineColor},&H${C.outlineColor},&H${C.backgroundColor},${C.bold},0,0,0,100,100,0,0,${C.borderStyle},${C.outline},${C.shadow},${C.alignment},${C.marginL},${C.marginR},${C.marginV},1\n\n`;
  ass+='[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
  for(const L of raw){ ass+=`Dialogue: 0,${fmt(L.s)},${fmt(L.e)},Default,,0,0,0,,${L.text}\n`; }
  return ass;
}

/* ---------------- the produce pipeline ---------------- */
async function produce(params, emit){
  const id = (params.id || ('rec'+Date.now())).replace(/[^a-zA-Z0-9_]/g,'');
  const f = name => path.join(WORK, `${id}_${name}`);
  await mkdir(WORK,{recursive:true});

  // 1) source video + duration (TwitterAPI.io if available, else provided videoUrl)
  let videoUrl = params.videoUrl, durationSec = params.durationSec||0, tweetText = params.text||'';
  if(CFG.twitter && params.tweetUrl){
    emit({ stage:'twitter', msg:'TwitterAPI.io: fetching freshest video…', pct:5 });
    try{ const t = await twitterFetch(params.tweetUrl); videoUrl = t.videoUrl||videoUrl; durationSec = t.durationSec||durationSec; tweetText = t.text||tweetText; }
    catch(e){ emit({ stage:'twitter', msg:'twitter fetch failed, using provided url: '+e.message, pct:5 }); }
  }
  if(!videoUrl) throw new Error('no source video url');
  emit({ stage:'download', msg:'Downloading source X video…', pct:10 });
  await download(videoUrl, f('xvideo.mp4'));

  // 2) ElevenLabs TTS (full voiceover)
  emit({ stage:'tts', msg:'ElevenLabs: generating voiceover…', pct:20 });
  await elevenTTS(params.script, f('voice_full.mp3'));
  const voiceDur = await ffprobeDuration(f('voice_full.mp3'));

  // 3) 3s voice slice for lipsync
  emit({ stage:'voice3s', msg:'Slicing 3s voice for avatar…', pct:30 });
  await run('ffmpeg',['-y','-ss','0','-t','3','-i',f('voice_full.mp3'),'-acodec','copy',f('3s_voice.mp3')]);

  // 4) Avatar (Replicate lipsync, or fallback to the raw avatar)
  if(CFG.replicate){
    emit({ stage:'lipsync', msg:'Replicate pixverse/lipsync: animating avatar…', pct:40 });
    const cloneUrl = await replicateLipsync(f('3s_voice.mp3'), CFG.avatar, emit);
    emit({ stage:'lipsync', msg:'Downloading lipsynced avatar…', pct:55 });
    await download(cloneUrl, f('clone.mp4'));
  } else {
    emit({ stage:'lipsync', msg:'No REPLICATE_API_TOKEN — using avatar without lipsync.', pct:55 });
    await writeFile(f('clone.mp4'), readFileSync(CFG.avatar));
  }
  const cloneDur = await ffprobeDuration(f('clone.mp4')) || 3;

  // 5) X video -> 1080x1920 with full voice (Transform X to 9x16)
  emit({ stage:'compose', msg:'ffmpeg: X video → 9:16 with voiceover…', pct:62 });
  await run('ffmpeg',['-y','-i',f('xvideo.mp4'),'-i',f('voice_full.mp3'),
    '-filter_complex','color=c=black:s=1080x1920:d=999[bg];[0:v]scale=1080:-2[vid];[bg][vid]overlay=(W-w)/2:(H-h)/2:eval=init,format=yuv420p[v]',
    '-map','[v]','-map','1:a','-c:v','libx264','-c:a','aac','-pix_fmt','yuv420p','-shortest','-movflags','+faststart',f('xvideo_9x16.mp4')]);

  // 6) avatar intro split (Combine Videos1) — X top (608) + avatar bottom, length = clone
  emit({ stage:'compose', msg:'ffmpeg: building avatar intro overlay…', pct:70 });
  const TOP_H=608, BOTTOM_H=1920-(TOP_H+1+0), BOT_Y=TOP_H+1; const CROP_TOP=0;
  await run('ffmpeg',['-y','-i',f('xvideo.mp4'),'-i',f('clone.mp4'),
    '-filter_complex',`color=c=black:size=1080x1920:d=360[bg];[0:v]scale=1080:${TOP_H}:flags=bicubic[top];[1:v]scale=1080:-2[vs];[vs]crop=w=1080:h=${BOTTOM_H}:x=0:y=${CROP_TOP}[bot];[bg][top]overlay=x=0:y=0[tmp];[tmp][bot]overlay=x=0:y=${BOT_Y}[v];[1:a]volume=1.5[a]`,
    '-map','[v]','-map','[a]','-t',String(cloneDur),'-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','veryfast','-c:a','aac','-movflags','+faststart',f('output_vertical.mp4')]);

  // 7) combine base + 3s avatar overlay + music (Combine vids and music)
  emit({ stage:'compose', msg:'ffmpeg: overlay avatar (first 3s) + mix music…', pct:78 });
  await run('ffmpeg',['-y','-i',f('xvideo_9x16.mp4'),'-i',f('output_vertical.mp4'),'-i',CFG.music,
    '-filter_complex',"[1:v]trim=0:3,setpts=PTS-STARTPTS,scale=iw*1:-1,fade=t=out:st=2.5:d=0.5:alpha=1[ov];[0:v]setpts=PTS-STARTPTS[base];[base][ov]overlay=(W-w)/2:(H-h)/2:enable='between(t,0,3)'[vout];[0:a]volume=1.5[a0];[2:a]volume=0.1[a2];[a0][a2]amix=inputs=2:duration=first:dropout_transition=3[aout]",
    '-map','[vout]','-map','[aout]','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',f('video_only.mp4')]);

  // 8) captions: ElevenLabs STT -> .ass -> burn
  emit({ stage:'captions', msg:'ElevenLabs STT: word timestamps…', pct:85 });
  const stt = await elevenSTT(f('voice_full.mp3'));
  await writeFile(f('subtitles.ass'), buildAss(stt));
  emit({ stage:'captions', msg:'ffmpeg: burning cyan karaoke captions…', pct:92 });
  await run('ffmpeg',['-y','-i',f('video_only.mp4'),'-vf',`subtitles=${f('subtitles.ass')}`,'-c:v','libx264','-c:a','copy',f('output.mp4')]);

  emit({ stage:'done', msg:'Done', pct:100, outputUrl:`/work/${id}_output.mp4`, durationSec: voiceDur });
}

/* ---------------- HTTP ---------------- */
const TYPES = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.mp4':'video/mp4','.mp3':'audio/mpeg','.css':'text/css','.ass':'text/plain' };
function body(req){ return new Promise(res=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>res(d)); }); }
async function serveFile(req,res,file){
  const s = await stat(file); const type = TYPES[path.extname(file)]||'application/octet-stream';
  const range = req.headers.range;
  if(range && /^bytes=/.test(range)){
    const [a,b] = range.replace('bytes=','').split('-'); const start=parseInt(a,10)||0; const end=b?parseInt(b,10):s.size-1;
    res.writeHead(206,{ 'Content-Range':`bytes ${start}-${end}/${s.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1,'Content-Type':type });
    createReadStream(file,{start,end}).pipe(res);
  } else {
    res.writeHead(200,{ 'Content-Length':s.size,'Content-Type':type,'Accept-Ranges':'bytes' });
    createReadStream(file).pipe(res);
  }
}
const server = http.createServer(async (req,res)=>{
  try{
    const u = new URL(req.url,'http://x'); const p = decodeURIComponent(u.pathname);
    if(p==='/api/health'){
      return json(res,200,{ openai:!!CFG.openai, replicate:!!CFG.replicate, twitter:!!CFG.twitter, eleven:!!CFG.eleven, voiceId:CFG.voiceId, hasAvatar:existsSync(CFG.avatar), hasMusic:existsSync(CFG.music) });
    }
    if(p==='/api/tweet' && req.method==='POST'){
      const b = JSON.parse(await body(req)||'{}');
      try{ return json(res,200,await twitterFetch(b.url)); } catch(e){ return json(res,400,{ error:e.message }); }
    }
    if(p==='/api/script' && req.method==='POST'){
      const b = JSON.parse(await body(req)||'{}');
      try{ return json(res,200,{ script: await generateScript(b) }); } catch(e){ return json(res,400,{ error:e.message }); }
    }
    if(p==='/api/produce' && req.method==='POST'){
      const b = JSON.parse(await body(req)||'{}');
      res.writeHead(200,{ 'Content-Type':'application/x-ndjson','Cache-Control':'no-cache' });
      const emit = o => { res.write(JSON.stringify(o)+'\n'); };
      try{ await produce(b, emit); } catch(e){ emit({ stage:'error', error:e.message }); }
      return res.end();
    }
    // static
    let file = path.join(ROOT, p==='/'?'/index.html':p);
    if(!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
    if(existsSync(file) && (await stat(file)).isFile()) return serveFile(req,res,file);
    res.writeHead(404); res.end('not found');
  }catch(e){ res.writeHead(500); res.end(String(e&&e.message||e)); }
});
function json(res,code,obj){ res.writeHead(code,{ 'Content-Type':'application/json' }); res.end(JSON.stringify(obj)); }
server.listen(CFG.port, ()=>{
  console.log(`\n  🎬 Video Factory helper on http://localhost:${CFG.port}`);
  console.log(`  keys → openai:${!!CFG.openai} replicate:${!!CFG.replicate} twitter:${!!CFG.twitter} eleven:${!!CFG.eleven}`);
  console.log(`  voice:${CFG.voiceId}  ffmpeg pipeline ready\n`);
});
