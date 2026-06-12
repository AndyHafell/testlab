/* ============================================================
   IDEA SWIPE — Tinder for video ideas
   Right swipe → content calendar · Left swipe → archive
   Deck empty → weekly filming schedule with drag-to-reorder
   ============================================================ */

'use strict';

const STORAGE_KEY = 'idea-swipe-v1';
const SWIPE_DISTANCE = 120;      // px of drag that commits a swipe
const SWIPE_VELOCITY = 700;      // px/s of fling that commits a swipe
const STAMP_DISTANCE = 90;       // px at which a verdict stamp is fully opaque

// ---------- State ----------

const state = {
  ideas: [],          // [{key, title, thumbnail, score, source}]
  decisions: {},      // key -> 'like' | 'archive'
  history: [],        // [key] in swipe order, for undo
  schedule: null,     // [{date: 'YYYY-MM-DD', items: [key]}]
  muted: false,
  animating: false,
};

const byKey = {};

// ---------- Persistence ----------

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    decisions: state.decisions,
    history: state.history,
    schedule: state.schedule,
    muted: state.muted,
  }));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.decisions = data.decisions || {};
    state.history = data.history || [];
    state.schedule = data.schedule || null;
    state.muted = !!data.muted;
  } catch {
    /* corrupted storage: start fresh */
  }
}

// ---------- Sound (WebAudio bleeps, no assets) ----------

let audioCtx = null;

function bleep(notes, dur = 0.07) {
  if (state.muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach((freq, i) => {
      const t0 = audioCtx.currentTime + i * dur;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    });
  } catch { /* audio unavailable */ }
}

const sfx = {
  like: () => bleep([523, 784]),
  archive: () => bleep([330, 196]),
  undo: () => bleep([392, 523], 0.05),
  drop: () => bleep([660], 0.05),
  fanfare: () => bleep([523, 659, 784, 1047], 0.09),
};

// ---------- Pixel-art placeholder thumbnails ----------
// Some backlog items have missing or relative thumbnail URLs; render a
// deterministic 16-bit placeholder so the deck never shows a broken image.

const thumbCache = {};

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pixelThumb(seedText) {
  if (thumbCache[seedText]) return thumbCache[seedText];
  const palettes = [
    ['#29366f', '#3b5dc9', '#41a6f6', '#73eff7'],
    ['#5d275d', '#b13e53', '#ef7d57', '#ffcd75'],
    ['#257179', '#38b764', '#a7f070', '#ffcd75'],
    ['#333c57', '#566c86', '#94b0c2', '#f4f4f4'],
  ];
  let seed = hashString(seedText);
  const rnd = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
  };
  const pal = palettes[seed % palettes.length];
  const W = 32, H = 18;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(0, 0, W, H);
  // blocky terrain noise
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = rnd();
      if (v > 0.62) {
        ctx.fillStyle = pal[Math.floor(rnd() * pal.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // dark letterbox bands
  ctx.fillStyle = 'rgba(13,14,22,0.8)';
  ctx.fillRect(0, 0, W, 2);
  ctx.fillRect(0, H - 2, W, 2);
  // centered play button
  ctx.fillStyle = '#0d0e16';
  ctx.fillRect(12, 5, 8, 8);
  ctx.fillStyle = '#f4f4f4';
  for (let i = 0; i < 4; i++) ctx.fillRect(14 + i, 6 + i, 1, 6 - i * 2);
  const url = c.toDataURL();
  thumbCache[seedText] = url;
  return url;
}

function setThumb(img, idea) {
  const src = (idea.thumbnail || '').trim();
  const usable = /^https?:\/\//.test(src);
  img.src = usable ? src : pixelThumb(idea.title);
  img.onerror = () => {
    img.onerror = null;
    img.src = pixelThumb(idea.title);
  };
}

// ---------- DOM helpers ----------

const $ = (sel) => document.querySelector(sel);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showView(id) {
  ['deck-view', 'splash-view', 'calendar-view', 'status-view'].forEach((v) => {
    $('#' + v).hidden = v !== id;
  });
}

let toastTimer = null;

function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = el('div', 'toast', msg);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}

// ---------- Deck ----------

function remainingIdeas() {
  return state.ideas.filter((i) => !state.decisions[i.key]);
}

function updateCounters() {
  const decided = Object.values(state.decisions);
  $('#count-deck').textContent = state.ideas.length - decided.length;
  $('#count-liked').textContent = decided.filter((d) => d === 'like').length;
  $('#count-archived').textContent = decided.filter((d) => d === 'archive').length;
}

function buildCard(idea, depth) {
  const card = el('article', `card depth-${depth}`);
  card.dataset.key = idea.key;

  const thumbWrap = el('div', 'card-thumb-wrap');
  const img = el('img', 'card-thumb');
  img.alt = idea.title;
  img.draggable = false;
  setThumb(img, idea);
  const score = el('div', 'card-score' + (idea.score >= 1 ? ' hot' : ''), `SCORE ${idea.score}`);
  thumbWrap.append(img, score);

  const body = el('div', 'card-body');
  const title = el('h2', 'card-title', idea.title);
  const meta = el('div', 'card-meta');
  const source = el('span', 'card-source', `via ${idea.source || 'unknown'}`);
  const pos = state.ideas.indexOf(idea) + 1;
  const index = el('span', 'card-index', `#${String(pos).padStart(2, '0')}`);
  meta.append(source, index);
  body.append(title, meta);

  const stampLike = el('div', 'stamp stamp-like', 'FILM IT');
  const stampNope = el('div', 'stamp stamp-nope', 'ARCHIVE');

  card.append(thumbWrap, body, stampLike, stampNope);
  return card;
}

function renderDeck() {
  const deck = $('#deck');
  deck.innerHTML = '';
  const remaining = remainingIdeas();
  // Append back-to-front so the top card is last in the DOM.
  remaining.slice(0, 3).reverse().forEach((idea, i, arr) => {
    const depth = arr.length - 1 - i;
    deck.appendChild(buildCard(idea, depth));
  });
  const top = deck.querySelector('.card.depth-0');
  if (top) attachSwipe(top);
  updateCounters();
  $('#btn-undo').disabled = state.history.length === 0;
}

// ---------- Swipe physics ----------
// Drag with rotation + verdict stamps; release uses a velocity check.
// Weak release springs back (damped spring integrator); a committed
// swipe keeps the fling's momentum and flies off screen.

function attachSwipe(card) {
  const stampLike = card.querySelector('.stamp-like');
  const stampNope = card.querySelector('.stamp-nope');
  let x = 0, y = 0;
  let startX = 0, startY = 0;
  let dragging = false;
  let raf = null;
  let samples = []; // recent {t, x} for velocity estimation

  function apply() {
    card.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.045}deg)`;
    stampLike.style.opacity = Math.min(Math.max(x / STAMP_DISTANCE, 0), 1);
    stampNope.style.opacity = Math.min(Math.max(-x / STAMP_DISTANCE, 0), 1);
    const fadeStart = window.innerWidth * 0.45;
    card.style.opacity = Math.abs(x) > fadeStart
      ? Math.max(1 - (Math.abs(x) - fadeStart) / (window.innerWidth * 0.3), 0)
      : 1;
  }

  function velocity() {
    const now = performance.now();
    const recent = samples.filter((s) => now - s.t < 120);
    if (recent.length < 2) return 0;
    const a = recent[0];
    const b = recent[recent.length - 1];
    return ((b.x - a.x) / (b.t - a.t)) * 1000; // px/s
  }

  function onDown(e) {
    if (state.animating) return;
    dragging = true;
    startX = e.clientX - x;
    startY = e.clientY - y;
    samples = [{ t: performance.now(), x }];
    card.setPointerCapture(e.pointerId);
    cancelAnimationFrame(raf);
  }

  function onMove(e) {
    if (!dragging) return;
    x = e.clientX - startX;
    y = e.clientY - startY;
    samples.push({ t: performance.now(), x });
    if (samples.length > 12) samples.shift();
    apply();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    const vx = velocity();
    if (x > SWIPE_DISTANCE || vx > SWIPE_VELOCITY) {
      flyOut(1, vx);
    } else if (x < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY) {
      flyOut(-1, vx);
    } else {
      springBack(vx);
    }
  }

  function springBack(vx0) {
    state.animating = true;
    let vx = vx0, vy = 0;
    let last = performance.now();
    const STIFFNESS = 320, DAMPING = 22;
    function step(now) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      vx += (-STIFFNESS * x - DAMPING * vx) * dt;
      vy += (-STIFFNESS * y - DAMPING * vy) * dt;
      x += vx * dt;
      y += vy * dt;
      apply();
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5 && Math.abs(vx) < 8 && Math.abs(vy) < 8) {
        x = 0; y = 0;
        apply();
        state.animating = false;
        return;
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }

  function flyOut(dir, vx0) {
    state.animating = true;
    const vx = dir * Math.max(Math.abs(vx0), 1500);
    const vy = y * 2.2;
    const exitX = window.innerWidth * 0.75;
    let last = performance.now();
    function step(now) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      x += vx * dt;
      y += vy * dt;
      apply();
      if (Math.abs(x) >= exitX) {
        state.animating = false;
        commitSwipe(card.dataset.key, dir > 0 ? 'like' : 'archive');
        return;
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }

  card.addEventListener('pointerdown', onDown);
  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerup', onUp);
  card.addEventListener('pointercancel', onUp);

  // Programmatic swipe (arrow keys / buttons) reuses the same fly-out.
  card._swipe = (dir) => {
    if (state.animating || dragging) return;
    flyOut(dir, dir * 1600);
  };
}

function commitSwipe(key, dir) {
  state.decisions[key] = dir;
  state.history.push(key);
  state.schedule = null; // any saved schedule is stale now
  save();
  sfx[dir]();

  const remaining = remainingIdeas();
  if (remaining.length === 0) {
    updateCounters();
    deckCleared();
    return;
  }

  // Promote the cards behind with a stepped settle animation.
  const deck = $('#deck');
  const old = deck.querySelector(`.card[data-key="${key}"]`);
  if (old) old.remove();
  deck.querySelectorAll('.card').forEach((c) => {
    c.classList.add('settling');
    c.classList.replace('depth-1', 'depth-0') || c.classList.replace('depth-2', 'depth-1');
  });
  if (remaining[2]) {
    const tail = buildCard(remaining[2], 2);
    deck.insertBefore(tail, deck.firstChild);
  }
  const top = deck.querySelector('.card.depth-0');
  if (top) {
    setTimeout(() => top.classList.remove('settling'), 260);
    attachSwipe(top);
  }
  updateCounters();
  $('#btn-undo').disabled = state.history.length === 0;
}

function swipeTop(dir) {
  const top = $('#deck .card.depth-0');
  if (top && top._swipe) top._swipe(dir);
}

function undoSwipe() {
  if (!state.history.length || state.animating) return;
  const key = state.history.pop();
  delete state.decisions[key];
  state.schedule = null;
  save();
  sfx.undo();
  showView('deck-view');
  renderDeck();
  toast('UNDONE: BACK IN THE DECK');
}

// ---------- Deck cleared → schedule ----------

function deckCleared() {
  showView('splash-view');
  sfx.fanfare();
  setTimeout(() => {
    buildScheduleIfNeeded();
    renderCalendar();
    showView('calendar-view');
  }, 1400);
}

// ---------- Weekly schedule ----------

function nextSevenDays() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    days.push(d);
  }
  return days;
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildScheduleIfNeeded() {
  if (state.schedule) return;
  const liked = state.ideas
    .filter((i) => state.decisions[i.key] === 'like')
    .sort((a, b) => b.score - a.score);
  const days = nextSevenDays().map((d) => ({ date: isoDate(d), items: [] }));
  // Round-robin by descending score: best ideas get the earliest slots,
  // and shoots spread evenly across the week.
  liked.forEach((idea, i) => days[i % 7].items.push(idea.key));
  state.schedule = days;
  save();
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function dayLabel(iso) {
  const [yy, mm, dd] = iso.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd);
  return { week: WEEKDAYS[d.getDay()], date: `${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

function buildSchedCard(idea) {
  const card = el('div', 'sched-card');
  card.dataset.key = idea.key;
  card.draggable = true;

  const img = el('img', 'sched-thumb');
  img.alt = idea.title;
  img.draggable = false;
  setThumb(img, idea);

  const body = el('div', 'sched-body');
  const title = el('div', 'sched-title', idea.title);
  const meta = el('div', 'sched-meta');
  meta.append(
    el('span', 'sched-score', `*${idea.score}`),
    el('span', '', idea.source || ''),
  );
  body.append(title, meta);
  card.append(img, body);

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idea.key);
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.day-col.drag-over').forEach((c) => c.classList.remove('drag-over'));
    persistScheduleFromDom();
  });
  return card;
}

function renderCalendar() {
  const cal = $('#calendar');
  cal.innerHTML = '';
  const anyLiked = state.schedule.some((d) => d.items.length > 0);
  $('#calendar-empty').hidden = anyLiked;
  cal.hidden = !anyLiked;
  $('#btn-copy').disabled = !anyLiked;
  if (!anyLiked) return;

  const todayIso = isoDate(new Date());
  state.schedule.forEach((day) => {
    const col = el('div', 'day-col' + (day.date === todayIso ? ' today' : ''));
    col.dataset.date = day.date;
    const label = dayLabel(day.date);
    const head = el('div', 'day-head');
    head.append(el('b', '', label.week), document.createTextNode(label.date));

    const list = el('div', 'day-items');
    day.items.forEach((key) => {
      const idea = byKey[key];
      if (idea) list.appendChild(buildSchedCard(idea));
    });
    if (!day.items.length) list.appendChild(el('div', 'day-empty', 'REST DAY'));

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
      const dragged = document.querySelector('.sched-card.dragging');
      if (!dragged) return;
      list.querySelector('.day-empty')?.remove();
      const after = insertionPoint(list, e.clientY);
      if (after) list.insertBefore(dragged, after);
      else list.appendChild(dragged);
    });
    list.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      sfx.drop();
      persistScheduleFromDom();
    });

    col.append(head, list);
    cal.appendChild(col);
  });
}

function insertionPoint(list, clientY) {
  const cards = [...list.querySelectorAll('.sched-card:not(.dragging)')];
  return cards.find((c) => {
    const r = c.getBoundingClientRect();
    return clientY < r.top + r.height / 2;
  }) || null;
}

function persistScheduleFromDom() {
  const cols = document.querySelectorAll('#calendar .day-col');
  if (!cols.length) return;
  state.schedule = [...cols].map((col) => ({
    date: col.dataset.date,
    items: [...col.querySelectorAll('.sched-card')].map((c) => c.dataset.key),
  }));
  save();
  // Re-render so empty days regain their REST DAY tag.
  renderCalendar();
}

function scheduleAsMarkdown() {
  const lines = ['# Filming schedule'];
  state.schedule.forEach((day) => {
    if (!day.items.length) return;
    const label = dayLabel(day.date);
    lines.push('', `## ${label.week} ${label.date}`);
    day.items.forEach((key) => {
      const idea = byKey[key];
      lines.push(`- [${idea.score}] ${idea.title} (via ${idea.source})`);
    });
  });
  return lines.join('\n');
}

// ---------- Top-level wiring ----------

function applyMuteLabel() {
  $('#btn-mute').textContent = state.muted ? 'SND OFF' : 'SND ON';
}

function resetAll() {
  if (!confirm('Reset all swipes and the schedule?')) return;
  state.decisions = {};
  state.history = [];
  state.schedule = null;
  save();
  showView('deck-view');
  renderDeck();
}

function route() {
  if (remainingIdeas().length > 0) {
    showView('deck-view');
    renderDeck();
  } else {
    buildScheduleIfNeeded();
    renderCalendar();
    updateCounters();
    showView('calendar-view');
  }
}

async function init() {
  load();
  applyMuteLabel();

  try {
    const res = await fetch('./ideas.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    state.ideas = raw.map((idea, i) => ({
      key: `i${i}`,
      title: idea.title || 'Untitled idea',
      thumbnail: idea.thumbnail || '',
      score: typeof idea.score === 'number' ? idea.score : 0,
      source: idea.source || '',
    }));
    state.ideas.forEach((i) => { byKey[i.key] = i; });
  } catch (err) {
    $('#status-text').textContent = `COULD NOT LOAD ideas.json (${err.message}) — serve this folder over HTTP, e.g. node server.js`;
    return;
  }

  // Drop stale decisions if ideas.json shrank since last visit.
  Object.keys(state.decisions).forEach((k) => {
    if (!byKey[k]) delete state.decisions[k];
  });
  state.history = state.history.filter((k) => byKey[k]);

  $('#btn-like').addEventListener('click', () => swipeTop(1));
  $('#btn-archive').addEventListener('click', () => swipeTop(-1));
  $('#btn-undo').addEventListener('click', undoSwipe);
  $('#btn-back').addEventListener('click', undoSwipe);
  $('#btn-reset').addEventListener('click', resetAll);
  $('#btn-mute').addEventListener('click', () => {
    state.muted = !state.muted;
    save();
    applyMuteLabel();
  });
  $('#btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(scheduleAsMarkdown());
      toast('SCHEDULE COPIED AS MARKDOWN');
    } catch {
      toast('CLIPBOARD BLOCKED — SEE CONSOLE');
      console.log(scheduleAsMarkdown());
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    const deckVisible = !$('#deck-view').hidden;
    if (e.key === 'ArrowRight' && deckVisible) { e.preventDefault(); swipeTop(1); }
    else if (e.key === 'ArrowLeft' && deckVisible) { e.preventDefault(); swipeTop(-1); }
    else if (e.key === 'z' || e.key === 'Z') undoSwipe();
  });

  route();
}

init();
