'use strict';

/*
 * Claude Code Mission Control — zero-dependency local server.
 *
 *   node server.js          → http://localhost:4242
 *
 * Reads real session transcripts from ~/.claude/projects (JSONL), serves a
 * live dashboard, and pushes change events over SSE via fs.watch.
 */

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const {
  PROJECTS_DIR,
  scanProjects,
  parseTranscript,
  cachedParse,
  costOfUsageByModel,
  totalsOfUsageByModel,
  dayKey,
} = require('./lib/scan');

const PORT = Number(process.env.PORT) || 4242;
const PUBLIC_DIR = path.join(__dirname, 'public');

const parseCache = new Map();

const ACTIVE_MS = 2 * 60 * 1000;
const RECENT_MS = 30 * 60 * 1000;

function statusFor(mtimeMs, now) {
  const age = now - mtimeMs;
  if (age < ACTIVE_MS) return 'active';
  if (age < RECENT_MS) return 'recent';
  return 'done';
}

function primaryModel(usageByModel) {
  let best = null;
  let bestOut = -1;
  for (const [model, u] of Object.entries(usageByModel || {})) {
    if (u.output > bestOut) {
      bestOut = u.output;
      best = model;
    }
  }
  return best;
}

function agentPayload(entry, now) {
  const s = entry.summary;
  const usage = totalsOfUsageByModel(s.usageByModel);
  return {
    id: entry.id,
    file: entry.file,
    status: statusFor(entry.mtimeMs, now),
    mtimeMs: entry.mtimeMs,
    title: s.title || null,
    firstPrompt: s.firstPrompt || null,
    lastText: s.lastAssistantText || null,
    lastEvent: s.lastEvent || null,
    model: primaryModel(s.usageByModel),
    models: Object.keys(s.usageByModel),
    gitBranch: s.gitBranch || null,
    cwd: s.cwd || null,
    usage,
    cost: costOfUsageByModel(s.usageByModel),
    counts: {
      userMessages: s.userMessages,
      assistantTurns: s.assistantTurns,
      toolUses: Object.values(s.toolCounts).reduce((a, b) => a + b, 0),
      filesEdited: s.filesEdited.length,
    },
    firstTs: s.firstTs,
    lastTs: s.lastTs,
  };
}

async function buildFleet() {
  const { sessions } = await scanProjects(parseCache);
  const now = Date.now();
  const today = dayKey(now);

  const agents = [];
  const stats = {
    today,
    sessionsToday: 0,
    subagentsToday: 0,
    costToday: 0,
    outputTokensToday: 0,
    inputTokensToday: 0,
    filesTouchedToday: 0,
    activeNow: 0,
    busiestProject: null,
    totalSessions: sessions.length,
    totalCost: 0,
  };

  const filesToday = new Set();
  const projectToday = new Map(); // name -> {cost, msgs}

  const bumpToday = (projectName, dayStats, isSubagent) => {
    if (!dayStats) return false;
    const dayCost = costOfUsageByModel(dayStats.models);
    const dayTotals = totalsOfUsageByModel(dayStats.models);
    stats.costToday += dayCost;
    stats.outputTokensToday += dayTotals.output;
    stats.inputTokensToday += dayTotals.input + dayTotals.cacheRead + dayTotals.cacheWrite5m + dayTotals.cacheWrite1h;
    for (const f of dayStats.edits || []) filesToday.add(f);
    const p = projectToday.get(projectName) || { cost: 0, msgs: 0 };
    p.cost += dayCost;
    p.msgs += dayStats.msgs || 0;
    projectToday.set(projectName, p);
    if (isSubagent) stats.subagentsToday++;
    else stats.sessionsToday++;
    return true;
  };

  for (const session of sessions) {
    const payload = agentPayload(session, now);
    payload.project = session.projectName;
    payload.projectDir = session.projectDir;
    payload.subagents = session.subagents.map((sub) => {
      const sp = agentPayload(sub, now);
      sp.isSubagent = true;
      return sp;
    });

    stats.totalCost += payload.cost;
    for (const sub of payload.subagents) stats.totalCost += sub.cost;
    if (payload.status === 'active') stats.activeNow++;
    for (const sub of payload.subagents) if (sub.status === 'active') stats.activeNow++;

    bumpToday(session.projectName, session.summary.days[today], false);
    for (const sub of session.subagents) {
      bumpToday(session.projectName, sub.summary.days[today], true);
    }

    agents.push(payload);
  }

  stats.filesTouchedToday = filesToday.size;
  let busiest = null;
  for (const [name, p] of projectToday) {
    if (!busiest || p.cost > busiest.cost) busiest = { name, ...p };
  }
  stats.busiestProject = busiest;

  return { projectsDir: PROJECTS_DIR, generatedAt: now, stats, agents };
}

async function buildReport(date) {
  const { sessions } = await scanProjects(parseCache);
  const now = Date.now();
  const projects = new Map();
  const totals = {
    sessions: 0,
    subagents: 0,
    cost: 0,
    outputTokens: 0,
    inputTokens: 0,
    msgs: 0,
    files: new Set(),
  };

  const collect = (session, entry, isSubagent) => {
    const day = entry.summary.days[date];
    if (!day) return;
    const cost = costOfUsageByModel(day.models);
    const t = totalsOfUsageByModel(day.models);
    totals.cost += cost;
    totals.outputTokens += t.output;
    totals.inputTokens += t.input + t.cacheRead + t.cacheWrite5m + t.cacheWrite1h;
    totals.msgs += day.msgs;
    for (const f of day.edits || []) totals.files.add(f);
    if (isSubagent) totals.subagents++;
    else totals.sessions++;

    if (!projects.has(session.projectName)) {
      projects.set(session.projectName, { name: session.projectName, cost: 0, sessions: [] });
    }
    const proj = projects.get(session.projectName);
    proj.cost += cost;
    proj.sessions.push({
      id: entry.id,
      file: entry.file,
      isSubagent,
      status: statusFor(entry.mtimeMs, now),
      title: entry.summary.title || null,
      firstPrompt: entry.summary.firstPrompt || null,
      lastText: entry.summary.lastAssistantText || null,
      model: primaryModel(entry.summary.usageByModel),
      msgs: day.msgs,
      outputTokens: t.output,
      cost,
      filesEdited: day.edits || [],
      firstTs: entry.summary.firstTs,
      lastTs: entry.summary.lastTs,
    });
  };

  for (const session of sessions) {
    collect(session, session, false);
    for (const sub of session.subagents) collect(session, sub, true);
  }

  const projectList = [...projects.values()].sort((a, b) => b.cost - a.cost);
  for (const p of projectList) p.sessions.sort((a, b) => b.cost - a.cost);

  return {
    date,
    generatedAt: now,
    totals: {
      sessions: totals.sessions,
      subagents: totals.subagents,
      cost: totals.cost,
      outputTokens: totals.outputTokens,
      inputTokens: totals.inputTokens,
      msgs: totals.msgs,
      filesTouched: totals.files.size,
      files: [...totals.files],
    },
    projects: projectList,
  };
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                       */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function serveStatic(res, urlPath) {
  let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const abs = path.resolve(PUBLIC_DIR, rel);
  if (!abs.startsWith(PUBLIC_DIR + path.sep) && abs !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  try {
    const data = await fsp.readFile(abs);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}

// Resolve a ?file= param safely inside the projects dir.
function resolveTranscriptPath(rel) {
  if (!rel || typeof rel !== 'string') return null;
  const abs = path.resolve(PROJECTS_DIR, rel);
  if (!abs.startsWith(PROJECTS_DIR + path.sep)) return null;
  if (!abs.endsWith('.jsonl')) return null;
  return abs;
}

/* SSE */
const sseClients = new Set();
let watchDebounce = null;

function broadcastChange() {
  const msg = `data: ${JSON.stringify({ type: 'change', at: Date.now() })}\n\n`;
  for (const res of sseClients) res.write(msg);
}

function startWatcher() {
  try {
    fs.watch(PROJECTS_DIR, { recursive: true }, () => {
      clearTimeout(watchDebounce);
      watchDebounce = setTimeout(broadcastChange, 400);
    });
  } catch (err) {
    console.error('fs.watch failed (live updates disabled):', err.message);
  }
  // Heartbeat keeps proxies/browsers from closing idle SSE connections.
  setInterval(() => {
    for (const res of sseClients) res.write(': ping\n\n');
  }, 30000).unref();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/api/fleet') {
      return sendJSON(res, 200, await buildFleet());
    }

    if (url.pathname === '/api/session') {
      const abs = resolveTranscriptPath(url.searchParams.get('file'));
      if (!abs) return sendJSON(res, 400, { error: 'bad file param' });
      const rel = path.relative(PROJECTS_DIR, abs);
      const cached = await cachedParse(parseCache, abs, rel);
      if (!cached) return sendJSON(res, 404, { error: 'transcript not found' });
      const transcript = await parseTranscript(abs);
      const s = cached.summary;
      return sendJSON(res, 200, {
        file: rel,
        meta: {
          title: s.title,
          firstPrompt: s.firstPrompt,
          cwd: s.cwd,
          gitBranch: s.gitBranch,
          models: Object.keys(s.usageByModel),
          usage: totalsOfUsageByModel(s.usageByModel),
          cost: costOfUsageByModel(s.usageByModel),
          firstTs: s.firstTs,
          lastTs: s.lastTs,
          status: statusFor(cached.mtimeMs, Date.now()),
          counts: {
            userMessages: s.userMessages,
            assistantTurns: s.assistantTurns,
            filesEdited: s.filesEdited.length,
          },
        },
        events: transcript.events,
        sidechainSkipped: transcript.sidechainSkipped,
      });
    }

    if (url.pathname === '/api/report') {
      const date = url.searchParams.get('date') || dayKey(Date.now());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJSON(res, 400, { error: 'bad date param, expected YYYY-MM-DD' });
      }
      return sendJSON(res, 200, await buildReport(date));
    }

    if (url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      return sendJSON(res, 404, { error: 'unknown endpoint' });
    }

    return serveStatic(res, url.pathname);
  } catch (err) {
    console.error('request failed:', req.url, err);
    if (!res.headersSent) sendJSON(res, 500, { error: String(err.message || err) });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`◉ Mission Control → http://localhost:${PORT}`);
  console.log(`  watching ${PROJECTS_DIR}`);
  startWatcher();
  // Warm the parse cache so the first page load is instant-ish.
  buildFleet()
    .then((f) =>
      console.log(
        `  indexed ${f.stats.totalSessions} sessions (${f.stats.activeNow} active now)`
      )
    )
    .catch((err) => console.error('initial scan failed:', err));
});
