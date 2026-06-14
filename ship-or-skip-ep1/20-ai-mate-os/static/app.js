/* AI Mate OS — frontend. Vanilla JS + hand-rolled animated SVG charts. */
"use strict";

const SVG = "http://www.w3.org/2000/svg";
let STORE = null;
let RANGE = 12; // months; 0 = all
let VIDEO_SORT = { key: "views", dir: -1 };

/* ── helpers ──────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

function fmtCompact(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}
const fmtComma = (n) => (Number(n) || 0).toLocaleString("en-US");
const fmtMonth = (d) => { const [y, m] = String(d).split("-"); return ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m] + " '" + y.slice(2); };

function clipRange(series) {
  if (!series || !series.length) return [];
  if (!RANGE || RANGE >= series.length) return series;
  return series.slice(-RANGE);
}

/* ── count-up ─────────────────────────────────────────── */
function countUp(node, to, { money = false, compact = true } = {}) {
  const dur = 950, t0 = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const p = Math.min(1, (now - t0) / dur);
    const v = to * ease(p);
    node.textContent = (money ? "$" : "") + (compact ? fmtCompact(v) : fmtComma(Math.round(v)));
    if (p < 1) requestAnimationFrame(frame);
    else node.textContent = (money ? "$" : "") + (compact ? fmtCompact(to) : fmtComma(to));
  }
  requestAnimationFrame(frame);
}

/* ── tooltip ──────────────────────────────────────────── */
const tip = $("#tooltip");
function showTip(x, y, html) { tip.innerHTML = html; tip.style.opacity = "1"; tip.style.left = x + 14 + "px"; tip.style.top = y - 10 + "px"; }
function hideTip() { tip.style.opacity = "0"; }

/* ── SVG area chart ───────────────────────────────────── */
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function areaChart(container, series, color, opts = {}) {
  container.innerHTML = "";
  const data = clipRange(series).filter((d) => d && isFinite(d.value));
  const W = container.clientWidth || 480, H = container.clientHeight || 200;
  if (data.length < 2) { container.innerHTML = `<div class="muted" style="padding:30px;text-align:center;font-size:13px">No data yet</div>`; return; }
  const padX = 6, padT = 18, padB = 22;
  const vals = data.map((d) => d.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  min = opts.zeroBase ? Math.min(0, min) : min - (max - min) * 0.12;
  const innerW = W - padX * 2, innerH = H - padT - padB;
  const x = (i) => padX + (innerW * i) / (data.length - 1);
  const y = (v) => padT + innerH - (innerH * (v - min)) / (max - min);
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value), d }));

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const uid = "g" + Math.random().toString(36).slice(2, 8);
  svg.innerHTML = `<defs>
    <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>`;

  // baseline gridlines
  for (let g = 0; g <= 2; g++) {
    const gy = padT + (innerH * g) / 2;
    const ln = document.createElementNS(SVG, "line");
    ln.setAttribute("x1", padX); ln.setAttribute("x2", W - padX);
    ln.setAttribute("y1", gy); ln.setAttribute("y2", gy);
    ln.setAttribute("stroke", "rgba(255,255,255,0.05)"); ln.setAttribute("stroke-width", "1");
    svg.appendChild(ln);
  }

  const line = smoothPath(pts);
  const area = document.createElementNS(SVG, "path");
  area.setAttribute("d", `${line} L${pts[pts.length - 1].x},${padT + innerH} L${pts[0].x},${padT + innerH} Z`);
  area.setAttribute("fill", `url(#${uid})`); area.setAttribute("class", "area-fill");
  svg.appendChild(area);

  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", line); path.setAttribute("fill", "none");
  path.setAttribute("stroke", color); path.setAttribute("stroke-width", "2.4");
  path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("class", "chart-path");
  svg.appendChild(path);
  const len = path.getTotalLength ? 1600 : 0;
  path.style.setProperty("--len", len);
  path.style.strokeDasharray = len; path.style.strokeDashoffset = len;

  // last-value marker + label
  const last = pts[pts.length - 1];
  const dot = document.createElementNS(SVG, "circle");
  dot.setAttribute("cx", last.x); dot.setAttribute("cy", last.y); dot.setAttribute("r", "3.5");
  dot.setAttribute("fill", color); svg.appendChild(dot);
  const lbl = document.createElementNS(SVG, "text");
  lbl.setAttribute("x", last.x); lbl.setAttribute("y", Math.max(last.y - 9, 12));
  lbl.setAttribute("text-anchor", "end"); lbl.setAttribute("fill", color);
  lbl.setAttribute("font-size", "12"); lbl.setAttribute("font-weight", "700");
  lbl.textContent = (opts.money ? "$" : "") + fmtCompact(last.d.value);
  svg.appendChild(lbl);

  // x labels (first / mid / last)
  [0, Math.floor(data.length / 2), data.length - 1].forEach((i) => {
    const tx = document.createElementNS(SVG, "text");
    tx.setAttribute("x", x(i)); tx.setAttribute("y", H - 6);
    tx.setAttribute("text-anchor", i === 0 ? "start" : i === data.length - 1 ? "end" : "middle");
    tx.setAttribute("fill", "var(--faint)"); tx.setAttribute("font-size", "10.5");
    tx.textContent = fmtMonth(data[i].date); svg.appendChild(tx);
  });

  // hover layer
  const guide = document.createElementNS(SVG, "line");
  guide.setAttribute("stroke", "rgba(255,255,255,0.18)"); guide.setAttribute("stroke-width", "1");
  guide.setAttribute("y1", padT); guide.setAttribute("y2", padT + innerH); guide.style.opacity = "0";
  svg.appendChild(guide);
  const hdot = document.createElementNS(SVG, "circle");
  hdot.setAttribute("r", "4"); hdot.setAttribute("fill", "#fff"); hdot.setAttribute("stroke", color);
  hdot.setAttribute("stroke-width", "2"); hdot.style.opacity = "0"; svg.appendChild(hdot);
  const hit = document.createElementNS(SVG, "rect");
  hit.setAttribute("x", 0); hit.setAttribute("y", 0); hit.setAttribute("width", W); hit.setAttribute("height", H);
  hit.setAttribute("fill", "transparent"); svg.appendChild(hit);
  hit.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    let bi = 0, bd = 1e9;
    pts.forEach((p, i) => { const dd = Math.abs(p.x - mx); if (dd < bd) { bd = dd; bi = i; } });
    const p = pts[bi];
    guide.setAttribute("x1", p.x); guide.setAttribute("x2", p.x); guide.style.opacity = "1";
    hdot.setAttribute("cx", p.x); hdot.setAttribute("cy", p.y); hdot.style.opacity = "1";
    showTip(e.clientX, e.clientY, `<b>${(opts.money ? "$" : "") + fmtComma(p.d.value)}</b><br><span style="color:var(--muted)">${fmtMonth(p.d.date)}</span>`);
  });
  hit.addEventListener("mouseleave", () => { guide.style.opacity = "0"; hdot.style.opacity = "0"; hideTip(); });

  container.appendChild(svg);
}

/* ── mini sparkline ───────────────────────────────────── */
function sparkline(container, series, color, { fill = true } = {}) {
  container.innerHTML = "";
  const data = (series || []).filter((d) => d && isFinite(d.value));
  const W = container.clientWidth || 200, H = container.clientHeight || 50;
  if (data.length < 2) { container.innerHTML = `<div class="muted" style="font-size:11px">—</div>`; return; }
  const vals = data.map((d) => d.value);
  let min = Math.min(...vals), max = Math.max(...vals); if (min === max) { min -= 1; max += 1; }
  const x = (i) => (W * i) / (data.length - 1);
  const y = (v) => H - 4 - (H - 8) * (v - min) / (max - min);
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("preserveAspectRatio", "none");
  const uid = "s" + Math.random().toString(36).slice(2, 8);
  const d = smoothPath(pts);
  svg.innerHTML = `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${color}" stop-opacity="0.30"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  if (fill) {
    const a = document.createElementNS(SVG, "path");
    a.setAttribute("d", `${d} L${W},${H} L0,${H} Z`); a.setAttribute("fill", `url(#${uid})`);
    svg.appendChild(a);
  }
  const p = document.createElementNS(SVG, "path");
  p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", color);
  p.setAttribute("stroke-width", "2"); p.setAttribute("stroke-linecap", "round"); svg.appendChild(p);
  container.appendChild(svg);
}

/* ── hero ─────────────────────────────────────────────── */
function renderHero() {
  const h = STORE.hero || {};
  const last = (s) => (s && s.length ? s[s.length - 1].value : 0);
  const tiles = [
    { label: "YouTube Views", ico: "▶", color: "var(--red)", val: h.youtubeViews, foot: `+${fmtCompact(last(STORE.youtube?.viewsOverTime))} this month` },
    { label: "Subscribers", ico: "◈", color: "var(--violet)", val: h.subscribers, foot: `+${fmtCompact(last(STORE.youtube?.subsGainedOverTime))}/mo` },
    { label: "MRR", ico: "$", color: "var(--gold)", val: h.mrr, money: true, foot: "monthly recurring" },
    { label: "Skool Members", ico: "✦", color: "var(--cyan)", val: h.skoolMembers, foot: `${(STORE.revenue?.memberBreakdown?.Paid) || 0} paid · ${(STORE.revenue?.memberBreakdown?.Legacy) || 0} legacy` },
    { label: "GitHub Stars", ico: "★", color: "var(--green)", val: h.githubStars, foot: `across ${STORE.github?.repos?.length || 0} repos` },
    { label: "Social Reach", ico: "◎", color: "var(--pink)", val: h.socialReach, foot: "IG + FB all-time" },
  ];
  const hero = $("#hero"); hero.innerHTML = "";
  tiles.forEach((t) => {
    const tile = el("div", "tile");
    tile.innerHTML = `
      <div class="tile-glow" style="background:${t.color}"></div>
      <div class="tile-label"><span class="tile-ico" style="color:${t.color}">${t.ico}</span>${t.label}</div>
      <div class="tile-value">0</div>
      <div class="tile-foot">${t.foot}</div>`;
    hero.appendChild(tile);
    countUp($(".tile-value", tile), Number(t.val) || 0, { money: t.money });
  });
}

/* ── charts ───────────────────────────────────────────── */
function renderCharts() {
  const y = STORE.youtube || {}, r = STORE.revenue || {};
  areaChart($("#chartViews"), y.viewsOverTime, "var(--red)", { zeroBase: true });
  areaChart($("#chartSubs"), y.subsOverTime, "var(--violet)");
  areaChart($("#chartMrr"), r.mrrOverTime, "var(--gold)", { zeroBase: true, money: true });
  areaChart($("#chartMembers"), r.membersOverTime, "var(--cyan)", { zeroBase: true });
}

/* ── member mix ───────────────────────────────────────── */
function renderMemberMix() {
  const box = $("#memberMix"); box.innerHTML = "";
  const b = STORE.revenue?.memberBreakdown || {};
  const order = [["Paid", "var(--green)"], ["Legacy", "var(--cyan)"], ["Free", "var(--violet)"], ["Cancelled", "var(--red)"]];
  const max = Math.max(1, ...order.map(([k]) => b[k] || 0));
  if (!Object.keys(b).length) { box.innerHTML = `<div class="muted" style="padding:24px 0;font-size:13px">No live member data</div>`; return; }
  order.forEach(([k, c]) => {
    const v = b[k] || 0;
    const row = el("div", "mix-row");
    row.innerHTML = `<div class="mix-label">${k}</div><div class="mix-bar"><div class="mix-fill" style="width:0;background:${c}"></div></div><div class="mix-val">${v}</div>`;
    box.appendChild(row);
    requestAnimationFrame(() => { $(".mix-fill", row).style.width = (100 * v / max) + "%"; });
  });
}

/* ── cohort heatmap ───────────────────────────────────── */
function cohortColor(v) {
  if (v == null) return "rgba(255,255,255,0.03)";
  const t = Math.max(0, Math.min(100, v)) / 100;
  // red(low) → gold → green(high)
  const c = t < 0.5
    ? [255, Math.round(77 + (203 - 77) * t * 2), Math.round(109 - (109 - 71) * t * 2)]
    : [Math.round(255 - (255 - 94) * (t - 0.5) * 2), Math.round(203 + (229 - 203) * (t - 0.5) * 2), Math.round(71 + (154 - 71) * (t - 0.5) * 2)];
  return `rgba(${c[0]},${c[1]},${c[2]},${0.18 + 0.62 * t})`;
}
function renderCohorts() {
  const box = $("#cohorts"); box.innerHTML = "";
  const co = STORE.revenue?.cohorts || {};
  const rows = co.by_cohort || [];
  if (!rows.length) { box.innerHTML = `<div class="muted" style="padding:24px 0;font-size:13px">No cohort data</div>`; return; }
  const grid = el("div", "cohort-grid");
  const maxLen = Math.max(...rows.map((r) => r.retention.length));
  rows.slice(-10).forEach((r) => {
    const row = el("div", "cohort-row");
    row.appendChild(el("div", "cohort-month", fmtMonth(r.month)));
    for (let i = 0; i < maxLen; i++) {
      const v = r.retention[i];
      const cell = el("div", "cohort-cell", v != null ? Math.round(v) : "");
      cell.style.background = cohortColor(v);
      if (v != null) cell.title = `${fmtMonth(r.month)} · month ${i}: ${v}% retained`;
      row.appendChild(cell);
    }
    grid.appendChild(row);
  });
  box.appendChild(grid);
}

/* ── reach small-multiples ────────────────────────────── */
function renderReach() {
  const grid = $("#reachGrid"); grid.innerHTML = "";
  const reach = STORE.reach || {};
  const plats = [
    { key: "youtube", name: "YouTube", color: "var(--red)" },
    { key: "instagram", name: "Instagram", color: "var(--pink)" },
    { key: "facebook", name: "Facebook", color: "var(--blue)" },
  ];
  plats.forEach((p) => {
    const series = clipRange(reach[p.key] || []);
    const total = (reach[p.key] || []).reduce((a, d) => a + (d.value || 0), 0);
    const card = el("div", "reach-card");
    card.innerHTML = `<div class="reach-top"><span class="reach-plat" style="color:${p.color}">${p.name}</span><span class="reach-total">${fmtCompact(total)}</span></div><div class="muted" style="font-size:11px">total views tracked</div><div class="reach-spark"></div>`;
    grid.appendChild(card);
    sparkline($(".reach-spark", card), series, p.color);
  });
}

/* ── video table ──────────────────────────────────────── */
function renderVideos() {
  const y = STORE.youtube || {};
  const videos = (y.videos || []).slice();
  $("#videoMeta").textContent = videos.length ? `${videos.length} videos · median ${fmtCompact(y.median)} views` : "";
  const { key, dir } = VIDEO_SORT;
  videos.sort((a, b) => {
    let av = a[key], bv = b[key];
    if (key === "title" || key === "publishedAt") return String(av).localeCompare(String(bv)) * dir;
    return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
  });
  const tb = $("#videoTable tbody"); tb.innerHTML = "";
  if (!videos.length) { tb.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:28px">No video data — hit Refresh</td></tr>`; return; }
  videos.forEach((v) => {
    const tr = el("tr");
    const hot = v.outlier >= 3 ? "hot" : v.outlier < 1 ? "cold" : "";
    tr.innerHTML = `
      <td class="vid"><div class="vid-cell">
        <img class="vid-thumb" loading="lazy" src="${v.thumb}" onerror="this.style.visibility='hidden'"/>
        <div class="vid-title"><a href="${v.url}" target="_blank" rel="noopener">${v.title}</a>
          ${v.tier ? `<span class="tier tier-${v.tier}">${v.tier}</span>` : ""}</div>
      </div></td>
      <td>${fmtComma(v.views)}</td>
      <td><span class="badge-out ${hot}">${v.outlier}×</span></td>
      <td>${v.ctr ? v.ctr.toFixed(1) + "%" : "—"}</td>
      <td>${v.rpm ? "$" + v.rpm.toFixed(1) : "—"}</td>
      <td>${fmtComma(v.watchHours)}</td>
      <td class="muted">${v.publishedAt || "—"}</td>`;
    tb.appendChild(tr);
  });
  $$("#videoTable thead th").forEach((th) => th.classList.toggle("active", th.dataset.sort === key));
}

/* ── websites ─────────────────────────────────────────── */
function renderWebsites() {
  const box = $("#websites"); box.innerHTML = "";
  (STORE.websites || []).forEach((s) => {
    const off = s.status !== "ok";
    const card = el("div", "site-card" + (off ? " off" : ""));
    if (off) {
      card.innerHTML = `<div class="site-top"><span class="site-domain">${s.domain}</span><span class="site-off-tag">${s.status === "not_connected" ? "add zone id" : "error"}</span></div><div class="site-visitors muted">—</div><div class="site-sub">not connected</div>`;
    } else {
      const cc = (s.topCountries || []).map((c) => `<span class="cc">${c.country} ${fmtCompact(c.requests)}</span>`).join("");
      const sub = s.note ? s.note : `${fmtComma(s.pageViews)} pageviews · 30d`;
      card.innerHTML = `<div class="site-top"><span class="site-domain">${s.domain}</span><span class="dot dot-cyan"></span></div>
        <div class="site-visitors">${fmtComma(s.visitors)}</div>
        <div class="site-sub">${sub}</div>
        <div class="site-spark"></div><div class="site-countries">${cc}</div>`;
    }
    box.appendChild(card);
    if (!off) sparkline($(".site-spark", card), s.sparkline, "var(--cyan)");
  });
}

/* ── github ───────────────────────────────────────────── */
function renderGithub() {
  const box = $("#github"); box.innerHTML = "";
  const g = STORE.github || { total: 0, repos: [] };
  box.appendChild(el("div", "gh-total", `${fmtComma(g.total)} <span>total stars</span>`));
  const repos = (g.repos || []).filter((r) => r.stars > 0).slice(0, 8);
  const max = Math.max(1, ...repos.map((r) => r.stars));
  if (!repos.length) { box.appendChild(el("div", "muted", "No starred public repos yet")); return; }
  repos.forEach((r) => {
    const row = el("div", "gh-row");
    row.innerHTML = `<div class="gh-name"><a href="${r.url}" target="_blank" rel="noopener">${r.name}</a></div><div class="gh-bar"><div class="gh-fill" style="width:0"></div></div><div class="gh-stars">${r.stars}</div>`;
    box.appendChild(row);
    requestAnimationFrame(() => { $(".gh-fill", row).style.width = (100 * r.stars / max) + "%"; });
  });
}

/* ── source health + meta ─────────────────────────────── */
function renderSources() {
  const box = $("#sources"); box.innerHTML = "";
  const s = STORE.sources || {};
  Object.entries(s).forEach(([k, v]) => {
    const d = el("div", "src-dot " + v);
    d.dataset.label = `${k}: ${v}`;
    box.appendChild(d);
  });
  const r = $("#refreshed");
  if (STORE.generatedAt) {
    const ago = Math.round((Date.now() - new Date(STORE.generatedAt)) / 60000);
    r.textContent = ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
  } else r.textContent = STORE.stale ? "cached backbone" : "—";
}

/* ── orchestration ────────────────────────────────────── */
function renderAll() {
  if (!STORE) return;
  renderSources();
  renderHero();
  renderCharts();
  renderMemberMix();
  renderCohorts();
  renderReach();
  renderVideos();
  renderWebsites();
  renderGithub();
}

function rerenderCharts() { renderCharts(); renderReach(); renderWebsites(); }

async function loadStats() {
  const res = await fetch("/api/stats");
  STORE = await res.json();
  renderAll();
}

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

async function doRefresh() {
  const btn = $("#refreshBtn");
  btn.classList.add("loading");
  toast("Pulling every source…");
  try {
    const res = await fetch("/api/refresh", { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    STORE = await res.json();
    renderAll();
    toast("Refreshed ✓");
  } catch (e) {
    toast("Refresh failed: " + e.message);
  } finally {
    btn.classList.remove("loading");
  }
}

/* ── events ───────────────────────────────────────────── */
$("#refreshBtn").addEventListener("click", doRefresh);
$("#rangeToggle").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  RANGE = Number(b.dataset.range);
  $$("#rangeToggle button").forEach((x) => x.classList.toggle("active", x === b));
  rerenderCharts();
});
$$("#videoTable thead th").forEach((th) => th.addEventListener("click", () => {
  const k = th.dataset.sort;
  VIDEO_SORT = { key: k, dir: VIDEO_SORT.key === k ? -VIDEO_SORT.dir : (k === "title" ? 1 : -1) };
  renderVideos();
}));
let rz;
window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(rerenderCharts, 180); });

loadStats();
