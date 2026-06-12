'use strict';

/*
 * Scanner + parser for Claude Code session transcripts.
 *
 * Reads ~/.claude/projects/<munged-path>/<session-uuid>.jsonl and
 * <munged-path>/<session-uuid>/subagents/agent-*.jsonl.
 *
 * Transcript lines worth knowing about (observed schema, June 2026):
 *   type: "user" | "assistant" | "ai-title" | "summary" | "attachment" |
 *         "file-history-snapshot" | "mode" | "permission-mode" | "last-prompt" | "system"
 *   assistant lines carry message.usage; the SAME usage object is repeated on
 *   every content-block line of one API response, all sharing one requestId —
 *   so token totals must be deduped by requestId.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const readline = require('readline');

const PROJECTS_DIR =
  process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects');

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

// $/MTok. Cache pricing: 5m write = 1.25x input, 1h write = 2x input, read = 0.1x input.
const PRICING_RULES = [
  { match: /fable|mythos/i, in: 10, out: 50 },
  { match: /opus/i, in: 5, out: 25 },
  { match: /sonnet/i, in: 3, out: 15 },
  { match: /haiku/i, in: 1, out: 5 },
];

function priceFor(model) {
  for (const r of PRICING_RULES) if (r.match.test(model)) return r;
  return { in: 5, out: 25 };
}

function emptyUsage() {
  return { input: 0, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0 };
}

function addUsage(target, u) {
  target.input += u.input;
  target.output += u.output;
  target.cacheWrite5m += u.cacheWrite5m;
  target.cacheWrite1h += u.cacheWrite1h;
  target.cacheRead += u.cacheRead;
}

function costOfUsageByModel(byModel) {
  let cost = 0;
  for (const [model, u] of Object.entries(byModel || {})) {
    const p = priceFor(model);
    cost +=
      (u.input * p.in +
        u.output * p.out +
        u.cacheWrite5m * p.in * 1.25 +
        u.cacheWrite1h * p.in * 2 +
        u.cacheRead * p.in * 0.1) /
      1e6;
  }
  return cost;
}

function totalsOfUsageByModel(byModel) {
  const t = emptyUsage();
  for (const u of Object.values(byModel || {})) addUsage(t, u);
  return t;
}

function dayKey(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function usageFromMessage(u) {
  const cw = u.cache_creation;
  return {
    input: u.input_tokens || 0,
    output: u.output_tokens || 0,
    cacheWrite5m: cw
      ? cw.ephemeral_5m_input_tokens || 0
      : u.cache_creation_input_tokens || 0,
    cacheWrite1h: cw ? cw.ephemeral_1h_input_tokens || 0 : 0,
    cacheRead: u.cache_read_input_tokens || 0,
  };
}

// Pull human-authored text out of a user message's content, ignoring tool
// results, hook noise, and injected <system-reminder> blocks.
function extractUserText(content) {
  let text = null;
  if (typeof content === 'string') text = content;
  else if (Array.isArray(content)) {
    const parts = [];
    for (const b of content) {
      if (b && b.type === 'text' && typeof b.text === 'string') parts.push(b.text);
    }
    if (parts.length) text = parts.join('\n');
  }
  if (!text) return null;
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
  if (!text) return null;
  if (
    text.startsWith('<command-') ||
    text.startsWith('<local-command') ||
    text.startsWith('Caveat:')
  ) {
    return null;
  }
  return text;
}

function hasToolResult(content) {
  return Array.isArray(content) && content.some((b) => b && b.type === 'tool_result');
}

function toolUseSummary(name, input) {
  if (!input || typeof input !== 'object') return '';
  const candidates = [
    input.file_path,
    input.notebook_path,
    input.command,
    input.pattern,
    input.skill,
    input.url,
    input.query,
    input.description,
    input.prompt,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 160);
  }
  return '';
}

/* ------------------------------------------------------------------ */
/* Per-session summary (cheap aggregate used for the fleet view)       */
/* ------------------------------------------------------------------ */

async function parseSessionFile(absPath, opts = {}) {
  // Dedicated subagent transcripts mark every line isSidechain — there, the
  // sidechain IS the main conversation.
  const sidechainIsMain = !!opts.sidechainIsMain;
  const summary = {
    firstTs: null,
    lastTs: null,
    title: null,
    firstPrompt: null,
    lastAssistantText: null,
    lastEvent: null,
    cwd: null,
    gitBranch: null,
    version: null,
    usageByModel: {},
    days: {}, // 'YYYY-MM-DD' -> { models: {model: usage}, msgs, edits: [paths] }
    toolCounts: {},
    filesEdited: [],
    userMessages: 0,
    assistantTurns: 0,
    sidechainLines: 0,
    lineCount: 0,
  };

  const seenRequests = new Set();
  const filesEdited = new Set();
  const dayEdits = {}; // day -> Set

  const dayBucket = (dk) => {
    if (!summary.days[dk]) summary.days[dk] = { models: {}, msgs: 0, edits: [] };
    return summary.days[dk];
  };

  const stream = fs.createReadStream(absPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    summary.lineCount++;
    const ts = o.timestamp || null;
    if (ts) {
      if (!summary.firstTs) summary.firstTs = ts;
      summary.lastTs = ts;
    }
    if (o.cwd && !summary.cwd) summary.cwd = o.cwd;
    if (o.gitBranch) summary.gitBranch = o.gitBranch;
    if (o.version) summary.version = o.version;
    if (o.isSidechain) summary.sidechainLines++;

    if (o.type === 'ai-title') {
      if (o.aiTitle) summary.title = o.aiTitle;
      continue;
    }
    if (o.type === 'summary') {
      if (o.summary && !summary.title) summary.title = o.summary;
      continue;
    }

    if (o.type === 'user') {
      const m = o.message || {};
      if (!o.isSidechain || sidechainIsMain) {
        const text = extractUserText(m.content);
        if (text && !o.isMeta) {
          summary.userMessages++;
          if (!summary.firstPrompt) summary.firstPrompt = text.slice(0, 500);
          summary.lastEvent = 'awaiting reply';
        } else if (hasToolResult(m.content)) {
          summary.lastEvent = 'processing tool result';
        }
      }
      continue;
    }

    if (o.type === 'assistant') {
      const m = o.message || {};
      const model = m.model;
      const reqId = o.requestId || (m.id ? m.id : o.uuid);
      const dk = ts ? dayKey(ts) : null;

      if (m.usage && model && model !== '<synthetic>' && reqId && !seenRequests.has(reqId)) {
        seenRequests.add(reqId);
        summary.assistantTurns++;
        const u = usageFromMessage(m.usage);
        if (!summary.usageByModel[model]) summary.usageByModel[model] = emptyUsage();
        addUsage(summary.usageByModel[model], u);
        if (dk) {
          const b = dayBucket(dk);
          if (!b.models[model]) b.models[model] = emptyUsage();
          addUsage(b.models[model], u);
          b.msgs++;
        }
      }

      for (const block of Array.isArray(m.content) ? m.content : []) {
        if (!block) continue;
        if (block.type === 'text' && block.text && block.text.trim()) {
          if (!o.isSidechain || sidechainIsMain) {
            summary.lastAssistantText = block.text.trim().slice(0, 500);
            summary.lastEvent = 'replied';
          }
        } else if (block.type === 'tool_use' && block.name) {
          summary.toolCounts[block.name] = (summary.toolCounts[block.name] || 0) + 1;
          if (!o.isSidechain || sidechainIsMain) summary.lastEvent = `running ${block.name}`;
          if (EDIT_TOOLS.has(block.name)) {
            const input = block.input || {};
            const fp = input.file_path || input.notebook_path;
            if (typeof fp === 'string' && fp) {
              filesEdited.add(fp);
              if (dk) {
                if (!dayEdits[dk]) dayEdits[dk] = new Set();
                dayEdits[dk].add(fp);
              }
            }
          }
        }
      }
    }
  }

  summary.filesEdited = [...filesEdited];
  for (const [dk, set] of Object.entries(dayEdits)) {
    dayBucket(dk).edits = [...set];
  }
  return summary;
}

/* ------------------------------------------------------------------ */
/* Cached scan of the whole projects tree                              */
/* ------------------------------------------------------------------ */

async function cachedParse(cache, absPath, relPath) {
  let st;
  try {
    st = await fsp.stat(absPath);
  } catch {
    return null;
  }
  if (!st.isFile() || st.size === 0) return null;
  const hit = cache.get(relPath);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;
  let summary;
  try {
    summary = await parseSessionFile(absPath, {
      sidechainIsMain: relPath.includes(`${path.sep}subagents${path.sep}`),
    });
  } catch {
    return null;
  }
  const entry = { mtimeMs: st.mtimeMs, size: st.size, summary };
  cache.set(relPath, entry);
  return entry;
}

// Fallback display name when a transcript never recorded its cwd.
function decodeProjectDir(name) {
  const parts = name.split('-').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : name;
}

async function scanProjects(cache) {
  const sessions = [];
  let dirs;
  try {
    dirs = await fsp.readdir(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return { sessions };
  }

  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dirAbs = path.join(PROJECTS_DIR, d.name);
    let entries;
    try {
      entries = await fsp.readdir(dirAbs, { withFileTypes: true });
    } catch {
      continue;
    }
    const subdirNames = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));

    for (const f of entries) {
      if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
      const abs = path.join(dirAbs, f.name);
      const rel = path.join(d.name, f.name);
      const parsed = await cachedParse(cache, abs, rel);
      if (!parsed || !parsed.summary.firstTs) continue;

      const id = f.name.slice(0, -'.jsonl'.length);
      const session = {
        id,
        projectDir: d.name,
        projectName: parsed.summary.cwd
          ? path.basename(parsed.summary.cwd)
          : decodeProjectDir(d.name),
        file: rel,
        mtimeMs: parsed.mtimeMs,
        size: parsed.size,
        summary: parsed.summary,
        subagents: [],
      };

      if (subdirNames.has(id)) {
        const subDir = path.join(dirAbs, id, 'subagents');
        let subEntries = [];
        try {
          subEntries = await fsp.readdir(subDir, { withFileTypes: true });
        } catch {
          /* no subagents dir */
        }
        for (const s of subEntries) {
          if (!s.isFile() || !s.name.endsWith('.jsonl')) continue;
          const subAbs = path.join(subDir, s.name);
          const subRel = path.join(d.name, id, 'subagents', s.name);
          const subParsed = await cachedParse(cache, subAbs, subRel);
          if (!subParsed || !subParsed.summary.firstTs) continue;
          session.subagents.push({
            id: s.name.slice(0, -'.jsonl'.length),
            file: subRel,
            mtimeMs: subParsed.mtimeMs,
            size: subParsed.size,
            summary: subParsed.summary,
          });
        }
        session.subagents.sort((a, b) => b.mtimeMs - a.mtimeMs);
      }

      sessions.push(session);
    }
  }

  sessions.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return { sessions };
}

/* ------------------------------------------------------------------ */
/* Full transcript parse (replay view)                                 */
/* ------------------------------------------------------------------ */

const TEXT_CAP = 20000;
const TOOL_RESULT_CAP = 2000;
const TOOL_INPUT_CAP = 2000;
const THINKING_CAP = 3000;

function cap(s, n) {
  if (typeof s !== 'string') return s;
  return s.length > n ? s.slice(0, n) + `\n… [truncated, ${s.length.toLocaleString()} chars total]` : s;
}

function toolResultText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
  }
  return '';
}

async function parseTranscript(absPath) {
  const events = [];
  const toolBlocksById = new Map(); // tool_use id -> block (for attaching results)
  const eventsByRequest = new Map(); // requestId -> event (group blocks of one API turn)
  let sidechainSkipped = 0;

  const stream = fs.createReadStream(absPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }

    // Inline sidechain (legacy subagent-in-same-file) events clutter the chat;
    // skip them but report a count. Dedicated subagent files set isSidechain on
    // every line — there, keep everything.
    const ts = o.timestamp || null;

    if (o.type === 'user') {
      const m = o.message || {};
      if (o.isSidechain && !absPath.includes(`${path.sep}subagents${path.sep}`)) {
        sidechainSkipped++;
        continue;
      }
      // Attach tool results to their tool_use blocks.
      if (Array.isArray(m.content)) {
        let attachedAll = true;
        for (const b of m.content) {
          if (b && b.type === 'tool_result') {
            const target = toolBlocksById.get(b.tool_use_id);
            if (target) {
              target.result = cap(toolResultText(b.content), TOOL_RESULT_CAP);
              target.isError = !!b.is_error;
            }
          } else if (b && b.type === 'text') {
            attachedAll = false;
          }
        }
        if (attachedAll && m.content.every((b) => b && b.type === 'tool_result')) continue;
      }
      const text = extractUserText(m.content);
      if (!text || o.isMeta) continue;
      events.push({
        role: 'user',
        ts,
        blocks: [{ type: 'text', text: cap(text, TEXT_CAP) }],
      });
      continue;
    }

    if (o.type === 'assistant') {
      const m = o.message || {};
      if (o.isSidechain && !absPath.includes(`${path.sep}subagents${path.sep}`)) {
        sidechainSkipped++;
        continue;
      }
      const reqId = o.requestId || m.id || o.uuid;
      let event = reqId ? eventsByRequest.get(reqId) : null;
      if (!event) {
        event = { role: 'assistant', ts, model: m.model, blocks: [] };
        if (reqId) eventsByRequest.set(reqId, event);
        events.push(event);
      }
      for (const block of Array.isArray(m.content) ? m.content : []) {
        if (!block) continue;
        if (block.type === 'text' && block.text && block.text.trim()) {
          event.blocks.push({ type: 'text', text: cap(block.text, TEXT_CAP) });
        } else if (block.type === 'thinking' && block.thinking && block.thinking.trim()) {
          event.blocks.push({ type: 'thinking', text: cap(block.thinking, THINKING_CAP) });
        } else if (block.type === 'tool_use') {
          const tb = {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            summary: toolUseSummary(block.name, block.input),
            input: cap(JSON.stringify(block.input || {}, null, 2), TOOL_INPUT_CAP),
            result: null,
            isError: false,
          };
          if (block.id) toolBlocksById.set(block.id, tb);
          event.blocks.push(tb);
        }
      }
      continue;
    }
  }

  return {
    events: events.filter((e) => e.blocks.length > 0),
    sidechainSkipped,
  };
}

module.exports = {
  PROJECTS_DIR,
  scanProjects,
  cachedParse,
  parseSessionFile,
  parseTranscript,
  costOfUsageByModel,
  totalsOfUsageByModel,
  priceFor,
  dayKey,
};
