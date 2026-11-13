'use strict';
/* Fokusdex – angrepsanimasjoner. Alt er tegnet med kode: ingen bilder fra spillene ligger i appen.
   Lerretet har spillskjermens oppløsning (256 × 192) og forstørres med harde piksler, så effektene får samme grove pikselpreg som Pokémonene.
   Hver type har sin palett og sin partikkel, og hvert angrep får en bevegelse ut fra hva slags angrep det er (slag, klør, stråle, bølge, lyn osv.). */
const FX = (() => {
  const TAU = 6.2832, R = Math.random, px = Math.round;
  /* Lys, hovedfarge og mørk per type (samme rekkefølge som typene). */
  const PAL = [['#fffdf2', '#d9d2bd', '#8f8a78'], ['#ffc27a', '#e8603c', '#8f2a1c'], ['#f1f6ff', '#a9c4f5', '#6f8fd1'], ['#e7b4f7', '#a45bc7', '#5e2f7a'], ['#f3e2ad', '#c9a45c', '#7d6234'], ['#dccba2', '#a08a5c', '#5f5138'],
    ['#e2f58d', '#9ab82e', '#566b12'], ['#c9b9f7', '#7458c2', '#35245f'], ['#f6f8fc', '#b4c0d2', '#6e7c93'], ['#fff2a6', '#ffa23a', '#e2481f'], ['#dcf3ff', '#62b4f5', '#2767c9'], ['#dcf7a8', '#6fcf5a', '#2e8a3c'],
    ['#fffbd0', '#ffe14a', '#e0a012'], ['#ffd6ec', '#f76fa8', '#b02f6c'], ['#f2fdff', '#9fe6f2', '#4fb0cf'], ['#cdbfff', '#7a5cf0', '#3a2aa0'], ['#a79bab', '#4b3f52', '#1d1722'], ['#ffe6f4', '#f7a3cf', '#d0649f']];
  /* Partikkelen som følger typen i strømmer og nedslag. */
  const KP = { 9: 'fl', 15: 'fl', 10: 'dr', 11: 'lf', 14: 'di', 3: 'bb', 4: 'rk', 5: 'rk', 6: 'ln', 7: 'ci', 16: 'ci', 13: 'ri', 2: 'ln' };
  let cv = null, g = null, parts = [], jobs = [], raf = 0, last = 0, clock = 0, inFrame = false, holdT = 0;
  const F = { hooks: {}, speed: 1 };
  const col = (p, f) => Array.isArray(p.c) ? p.c[Math.min(p.c.length - 1, Math.floor(f * p.c.length))] : p.c;
  const SH = {
    sq: (p, s) => g.fillRect(px(p.x - s / 2), px(p.y - s / 2), Math.max(1, px(s)), Math.max(1, px(s))),
    ci: (p, s) => { g.beginPath(); g.arc(px(p.x), px(p.y), Math.max(0.6, s / 2), 0, TAU); g.fill(); },
    ri: (p, s) => { g.lineWidth = p.w || 2; g.beginPath(); g.arc(px(p.x), px(p.y), Math.max(0.6, s / 2), p.a0 || 0, p.a1 || TAU); g.stroke(); },
    sp: (p, s) => { const a = Math.max(1, px(s / 2)), b = Math.max(1, px(s / 5)); g.fillRect(px(p.x) - a, px(p.y - b / 2), a * 2, b); g.fillRect(px(p.x - b / 2), px(p.y) - a, b, a * 2); },
    di: (p, s) => poly(p, [[0, -s / 2], [s * 0.3, 0], [0, s / 2], [-s * 0.3, 0]]),
    lf: (p, s) => poly(p, [[0, -s / 2], [s * 0.34, -s * 0.1], [0, s / 2], [-s * 0.34, -s * 0.1]]),
    rk: (p, s) => { poly(p, [[-s * 0.5, -s * 0.2], [-s * 0.1, -s * 0.5], [s * 0.45, -s * 0.3], [s * 0.5, s * 0.25], [0, s * 0.5], [-s * 0.45, s * 0.3]]); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px(p.x - s * 0.1), px(p.y), Math.max(1, px(s * 0.45)), Math.max(1, px(s * 0.3))); },
    fl: (p, s) => { g.beginPath(); g.arc(px(p.x), px(p.y), s / 2, 0, Math.PI); g.lineTo(px(p.x), px(p.y - s * 1.1)); g.closePath(); g.fill(); },
    dr: (p, s) => { g.beginPath(); g.arc(px(p.x), px(p.y), s / 2, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(px(p.x - s * 0.25), px(p.y - s * 0.3), 1, 1); },
    bb: (p, s) => { g.lineWidth = 1; g.beginPath(); g.arc(px(p.x), px(p.y), s / 2, 0, TAU); g.stroke(); g.fillStyle = '#fff'; g.fillRect(px(p.x - s * 0.2), px(p.y - s * 0.25), 1, 1); },
    ln: p => { g.lineWidth = p.w || 1; g.beginPath(); g.moveTo(px(p.x), px(p.y)); g.lineTo(px(p.x - p.vx * (p.len || 0.05)), px(p.y - p.vy * (p.len || 0.05))); g.stroke(); },
    bo: p => { g.lineWidth = p.w || 2; g.beginPath(); p.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); },
    /* Klo eller sverdhugg: en strek som trekkes fra det ene hjørnet til det andre. */
    sl: (p, s, f) => { const k = Math.min(1, f * 2.2), x1 = p.x + p.dx * s, y1 = p.y - s, x2 = x1 - p.dx * s * 2 * k, y2 = y1 + s * 2 * k; g.lineWidth = p.w || 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(px(x1), px(y1)); g.lineTo(px(x2), px(y2)); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); },
    bm: (p, s, f) => { const w = (p.w || 6) * (0.7 + 0.3 * Math.sin(f * 40)); g.lineCap = 'round'; g.lineWidth = w; g.beginPath(); g.moveTo(px(p.x), px(p.y)); g.lineTo(px(p.x2), px(p.y2)); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, w * 0.4); g.stroke(); },
    fg: (p, s) => poly(p, [[-s * 0.35, 0], [s * 0.35, 0], [0, s * (p.dir || 1)]]),
    ar: (p, s) => { g.lineWidth = 2; g.beginPath(); g.moveTo(px(p.x - s / 2), px(p.y + (p.dir || 1) * s / 2)); g.lineTo(px(p.x), px(p.y)); g.lineTo(px(p.x + s / 2), px(p.y + (p.dir || 1) * s / 2)); g.stroke(); },
    hx: (p, s) => { g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.52; g[i ? 'lineTo' : 'moveTo'](px(p.x + Math.cos(a) * s / 2), px(p.y + Math.sin(a) * s / 2)); } g.closePath(); g.stroke(); g.globalAlpha *= 0.25; g.fill(); },
    tx: (p, s) => { g.font = `bold ${Math.max(6, px(s))}px monospace`; g.textAlign = 'center'; g.fillText(p.txt, px(p.x), px(p.y)); },
    nt: (p, s) => { g.beginPath(); g.arc(px(p.x), px(p.y), s * 0.3, 0, TAU); g.fill(); g.fillRect(px(p.x + s * 0.2), px(p.y - s), 1, px(s)); g.fillRect(px(p.x + s * 0.2), px(p.y - s), px(s * 0.4), 2); },
    fs: p => g.fillRect(0, 0, 256, 192),
    pl: (p, s) => g.fillRect(px(p.x - s / 2), 0, px(s), px(p.y))
  };
  function poly(p, pts) { const c = Math.cos(p.r || 0), s = Math.sin(p.r || 0); g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](px(p.x + x * c - y * s), px(p.y + x * s + y * c))); g.closePath(); g.fill(); }
  function add(p) { p.t = 0; p.life = p.life || 0.4; p.s = p.s || 3; p.vx = p.vx || 0; p.vy = p.vy || 0; parts.push(p); kick(); return p; }
  function at(ms, fn) { jobs.push({ t: clock + ms, fn }); kick(); }
  /* Bare én tegnesløyfe om gangen: partikler som lages mens et bilde tegnes, må ikke starte en ny sløyfe. */
  function kick() { if (!raf && !inFrame && g) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(ts) {
    raf = 0;
    if (!g || !cv.isConnected) { parts = []; jobs = []; return; }
    inFrame = true;
    try { draw(ts); } finally { inFrame = false; }
    if (parts.length || jobs.length) raf = requestAnimationFrame(frame);
  }
  /* Partiklene som lyser (ild, stråler, lyn, gnister) får et lysskjær rundt seg, så angrepene gløder mot den dempede banen. */
  const GLOW = { ci: 1, fl: 1, sp: 1, di: 1, dr: 1, sl: 1, bm: 2, bo: 3 };
  function draw(ts) {
    const dt = ts < holdT ? 0 : Math.min(0.05, Math.max(0, ts - last) / 1000) * F.speed; last = ts; clock += dt * 1000;
    const due = jobs.filter(j => j.t <= clock); jobs = jobs.filter(j => j.t > clock); due.forEach(j => j.fn());
    g.clearRect(0, 0, 256, 192);
    parts = parts.filter(p => (p.t += dt) < p.life);
    for (const p of parts) { p.vx += (p.ax || 0) * dt; p.vy += (p.ay || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.r = (p.r || 0) + p.vr * dt; if (p.up) p.up(p, dt); }
    const al = (p, f) => (p.a == null ? 1 : p.a) * (p.hold ? 1 : f < 0.65 ? 1 : (1 - f) / 0.35);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const p of parts) {
      const gk = GLOW[p.k || 'sq']; if (!gk || p.ng) continue;
      const f = p.t / p.life, s = Math.max(0.5, p.s + (p.gs || 0) * p.t), c = col(p, f);
      g.globalAlpha = 0.17 * al(p, f); g.fillStyle = c; g.strokeStyle = c;
      if (gk === 2) { g.lineWidth = (p.w || 6) * 2.4; g.beginPath(); g.moveTo(px(p.x), px(p.y)); g.lineTo(px(p.x2), px(p.y2)); g.stroke(); }
      else if (gk === 3) { g.lineWidth = (p.w || 2) * 3; g.beginPath(); p.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); }
      else { g.beginPath(); g.arc(px(p.x), px(p.y), s * 1.1 + 2, 0, TAU); g.fill(); }
    }
    g.globalCompositeOperation = 'source-over';
    for (const p of parts) {
      const f = p.t / p.life, s = Math.max(0.5, p.s + (p.gs || 0) * p.t), c = col(p, f);
      g.globalAlpha = al(p, f);
      g.fillStyle = c; g.strokeStyle = c; g.lineCap = 'butt';
      SH[p.k || 'sq'](p, s, f);
    }
    g.globalAlpha = 1;
    if (parts.length > 900) parts.splice(0, parts.length - 900);
  }
  /* ---------- Byggeklosser ---------- */
  const burst = (x, y, c, n, v = 60, k = 'sq', s = 3, life = 0.4, ay = 60) => { for (let i = 0; i < n; i++) { const a = R() * TAU, sp = v * (0.35 + R() * 0.85); add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay, life: life * (0.6 + R() * 0.7), s: s * (0.6 + R() * 0.8), c, k, r: R() * TAU, vr: 6 - R() * 12 }); } };
  const ring = (x, y, c, s0, s1, life = 0.3, w = 2) => add({ x, y, s: s0, gs: (s1 - s0) / life, life, c, k: 'ri', w });
  const flash = (c, life = 0.12, a = 0.55) => add({ k: 'fs', c, life, a, x: 0, y: 0 });
  /* Stråler rett ut fra et punkt: korte streker som skyter utover og dør raskt. */
  const rays = (x, y, c, n, r0, r1, life = 0.2, w = 1) => { for (let i = 0; i < n; i++) { const an = (i + R() * 0.7) / n * TAU, v = (r1 - r0) / life; add({ x: x + Math.cos(an) * r0, y: y + Math.sin(an) * r0, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life, c, k: 'ln', len: 0.06, w }); } };
  /* Fartsstriper fra a mot b: viser hvor angrepet kommer fra. */
  const streaks = (a, b, c, n, ms = 120) => { const an = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(an), ny = Math.cos(an), v = Math.hypot(b.x - a.x, b.y - a.y) / (ms / 1000); for (let i = 0; i < n; i++) { const off = (R() - 0.5) * 26, f = R() * 0.3; add({ x: a.x + (b.x - a.x) * f + nx * off, y: a.y + (b.y - a.y) * f + ny * off, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life: ms / 1000 * (0.6 + R() * 0.5), c, k: 'ln', len: 0.05 + R() * 0.04, w: 1 }); } };
  /* Smellet der et angrep treffer. n = 0–3: hvor voldsomt det er. */
  const impact = (b, P, n) => {
    n = n === true ? 2 : n || 0;
    ring(b.x, b.y, '#fff', 4, 30 + n * 12, 0.24 + n * 0.02, n > 1 ? 3 : 2); ring(b.x, b.y, P[1], 2, 22 + n * 10, 0.32, 2);
    if (n >= 2) ring(b.x, b.y, P[0], 8, 70 + n * 14, 0.4, 1);
    burst(b.x, b.y, P, 8 + n * 5, 70 + n * 22, 'sp', 4 + n, 0.38);
    rays(b.x, b.y, ['#fff', P[0]], 6 + n * 3, 5, 26 + n * 10, 0.16 + n * 0.02, n > 2 ? 2 : 1);
    add({ x: b.x, y: b.y, s: 14 + n * 5, gs: -50, life: 0.14 + n * 0.02, c: '#fff', k: 'di', r: 0.78 });
    add({ x: b.x, y: b.y, s: 12 + n * 5, gs: -40, life: 0.12, c: '#fff', k: 'ci' });
  };
  /* KRAFTTREFFET til de sterkeste angrepene (t = 2 eller 3), oppå det vanlige smellet. */
  const power = (b, P, t) => {
    const big = t >= 3, n = big ? 20 : 10, L = big ? 150 : 84;
    if (big) { flash('#06070c', 0.07, 0.34); at(60, () => flash('#fff', 0.16, 0.42)); }
    ring(b.x, b.y, P[0], 8, 104 + t * 16, 0.42, big ? 3 : 2); if (big) at(90, () => ring(b.x, b.y, '#fff', 14, 196, 0.5, 2));
    for (let i = 0; i < n; i++) { const an = (i + R() * 0.8) / n * TAU, r0 = 14 + R() * 12, v = L / 0.22; add({ x: b.x + Math.cos(an) * r0, y: b.y + Math.sin(an) * r0, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life: 0.22 + R() * 0.06, c: i % 3 ? [P[0], P[1]] : '#fff', k: 'ln', len: big ? 0.1 : 0.07, w: big ? 2 : 1 }); }
    burst(b.x, b.y, [P[0], P[1], '#fff'], big ? 22 : 12, big ? 160 : 120, 'sp', 5, 0.5, 40);
    if (big) for (let i = 0; i < 12; i++) at(140 + i * 45, () => add({ x: b.x + (R() - 0.5) * 56, y: b.y + (R() - 0.5) * 36, vy: -26 - R() * 34, life: 0.7, s: 3 + R() * 3, c: [P[0], '#fff'], k: 'sp' }));
  };
  /* En partikkel som flyr fra a til b på ms millisekunder, med valgfri bue (arc = piksler opp). */
  const fly = (a, b, ms, o) => { const T = ms / 1000, arc = o.arc || 0; return add(Object.assign({ x: a.x, y: a.y, vx: (b.x - a.x) / T, vy: (b.y - a.y) / T - 4 * arc / T, ay: 8 * arc / (T * T), life: T, hold: 1 }, o)); };
  const jit = (p, d) => ({ x: p.x + (R() - 0.5) * d, y: p.y + (R() - 0.5) * d });
  /* Skjermen rister: varighet og styrke i spillpiksler. kind 1 = lang rumling (jordskjelv), ellers et rykk som dør ut. */
  const shake = (ms, amp, kind) => F.hooks.shake && F.hooks.shake(ms / F.speed, amp || 3, kind || 0);
  /* Etterspillet til et treff følger typen: flammer som slikker opp, vannsprut, gnister som knitrer, is som fryser til og splintres … n = 0–3. */
  const AFT = {
    0: (b, P, n) => { for (let i = 0; i < 3 + n; i++) at(i * 40, () => add({ x: b.x + (R() - 0.5) * 30, y: b.y + (R() - 0.5) * 24, s: 7 + R() * 4, gs: -12, life: 0.3, c: '#fff', k: 'sp' })); },
    1: (b, P, n) => { for (let i = 0; i < 3 + n; i++) at(i * 45, () => { const q = jit(b, 30); add({ x: q.x, y: q.y, s: 8 + R() * 5, gs: -16, life: 0.26, c: [P[0], P[1]], k: 'sp' }); ring(q.x, q.y, P[1], 2, 14, 0.2, 1); }); },
    2: (b, P, n) => { for (let i = 0; i < 6 + n * 3; i++) at(i * 22, () => add({ x: b.x - 26 + R() * 10, y: b.y + (R() - 0.5) * 36, vx: 200 + R() * 120, vy: -30 + R() * 20, life: 0.28, c: P[R() < 0.5 ? 0 : 1], k: 'ln', len: 0.06 })); },
    3: (b, P, n) => { for (let i = 0; i < 6 + n * 3; i++) at(i * 40, () => add({ x: b.x + (R() - 0.5) * 32, y: b.y + 10, vy: -40 - R() * 40, life: 0.55, s: 4 + R() * 4, c: P, k: 'bb' })); },
    4: (b, P, n) => { for (let i = 0; i < 5 + n * 2; i++) at(i * 30, () => add({ x: b.x + (R() - 0.5) * 44, y: b.y + 14 + R() * 4, vx: (R() - 0.5) * 30, vy: -14 - R() * 16, s: 5, gs: 16, life: 0.5, c: [P[0], P[1]], k: 'ci', a: 0.6, ng: 1 })); },
    5: (b, P, n) => burst(b.x, b.y + 4, [P[1], P[2]], 5 + n * 3, 90, 'rk', 5, 0.5, 320),
    6: (b, P, n) => { for (let i = 0; i < 8 + n * 4; i++) add({ x: b.x, y: b.y, life: 0.5, s: 2, c: P, k: 'sq', ph: R() * TAU, rr: 6 + R() * 22, up: (p, dt) => { p.ph += dt * 11; p.x = b.x + Math.cos(p.ph) * p.rr; p.y = b.y + Math.sin(p.ph * 1.3) * p.rr * 0.6; } }); },
    7: (b, P, n) => { for (let i = 0; i < 4 + n * 2; i++) at(i * 60, () => add({ x: b.x + (R() - 0.5) * 30, y: b.y + 10, vy: -46 - R() * 30, life: 0.6, s: 6 + R() * 4, gs: -6, c: [P[0], P[1], P[2]], k: 'ci', ph: R() * TAU, up: (p, dt) => { p.ph += dt * 9; p.x += Math.sin(p.ph) * 0.8; } })); },
    8: (b, P, n) => { rays(b.x, b.y, ['#fff', '#ffe9a0'], 8 + n * 4, 2, 30 + n * 8, 0.18, 1); add({ x: b.x - 12, y: b.y - 12, vx: 160, vy: 160, life: 0.15, c: '#fff', k: 'ln', len: 0.1, w: 2 }); },
    9: (b, P, n) => { for (let i = 0; i < 7 + n * 4; i++) at(i * 30, () => add({ x: b.x + (R() - 0.5) * 30, y: b.y + 8 + R() * 8, vx: (R() - 0.5) * 24, vy: -70 - R() * 60, life: 0.5, s: 6 + R() * 5, gs: -8, c: P, k: 'fl' })); },
    10: (b, P, n) => { burst(b.x, b.y, P, 9 + n * 4, 100, 'dr', 4, 0.55, 380); ring(b.x, b.y + 12, P[0], 6, 44 + n * 8, 0.4, 1); },
    11: (b, P, n) => { const c = 6 + n * 3; for (let i = 0; i < c; i++) add({ x: b.x, y: b.y, life: 0.6, s: 6, c: P, k: 'lf', ph: i / c * TAU, rr: 8, r: R() * TAU, vr: 9, up: (p, dt) => { p.ph += dt * 7; p.rr += dt * 34; p.x = b.x + Math.cos(p.ph) * p.rr; p.y = b.y + Math.sin(p.ph) * p.rr * 0.6; } }); },
    12: (b, P, n) => { for (let i = 0; i < 3 + n; i++) at(i * 70, () => { const q = jit(b, 34), pts = [[q.x, q.y]]; for (let j = 0; j < 3; j++) { const l = pts[pts.length - 1]; pts.push([l[0] + (R() - 0.5) * 16, l[1] + (R() - 0.5) * 16]); } add({ x: 0, y: 0, pts, life: 0.09, c: P[1], k: 'bo', w: 2, hold: 1 }); }); },
    13: (b, P, n) => { ring(b.x, b.y, P[0], 50 + n * 8, 6, 0.36, 1); for (let i = 0; i < 4 + n; i++) add({ x: b.x, y: b.y, life: 0.5, s: 4, c: P, k: 'di', ph: i / (4 + n) * TAU, up: (p, dt) => { p.ph += dt * 8; p.x = b.x + Math.cos(p.ph) * 20; p.y = b.y + Math.sin(p.ph) * 11; } }); },
    14: (b, P, n) => { for (let i = 0; i < 5 + n * 2; i++) { const q = jit(b, 34); add({ x: q.x, y: q.y, s: 2, gs: 40, life: 0.24, c: P, k: 'di', r: R() * TAU, hold: 1 }); at(240, () => burst(q.x, q.y, [P[0], '#fff'], 3, 70, 'di', 3, 0.3, 200)); } },
    15: (b, P, n) => { for (let i = 0; i < 7 + n * 4; i++) at(i * 30, () => add({ x: b.x + (R() - 0.5) * 30, y: b.y + 10, vx: (R() - 0.5) * 30, vy: -80 - R() * 50, life: 0.5, s: 6 + R() * 4, gs: -8, c: [P[0], P[1], P[2]], k: 'fl' })); },
    16: (b, P, n) => { add({ x: b.x, y: b.y, s: 18 + n * 3, dx: 1, life: 0.26, c: P[2], k: 'sl', w: 4, ng: 1 }); add({ x: b.x, y: b.y, s: 18 + n * 3, dx: -1, life: 0.26, c: P[1], k: 'sl', w: 3, ng: 1 }); },
    17: (b, P, n) => { for (let i = 0; i < 7 + n * 3; i++) at(i * 40, () => add({ x: b.x + (R() - 0.5) * 40, y: b.y + (R() - 0.5) * 30, vy: -20, s: 5 + R() * 4, life: 0.4, c: ['#fff', P[1]], k: 'sp' })); }
  };
  const after = (b, ty, n) => (AFT[ty] || AFT[0])(b, PAL[ty] || PAL[0], n || 0);
  /* ---------- Angrepene ----------
     Hvert program tegner angrepet fra a til b og gir varigheten i millisekunder. o.hit settes til øyeblikket angrepet treffer:
     da tar kampskjermen over med treff-stopp, risting og HP-linja, mens resten av effekten spiller ferdig.
     o.tier (0–3) er hvor voldsomt angrepet er: flere partikler, bredere stråler, lengre risting. */
  const PROG = {
    /* Takling og vanlige slag: fartsstriper og et smell. */
    strike: (a, b, P, o) => { streaks(a, b, [P[0], '#fff'], 5 + o.tier * 2); at(130, () => { impact(b, P, o.tier); after(b, o.ty, o.tier); }); o.hit = 130; return 560; },
    /* Klør og sverd: to eller tre hugg på rad, det siste hardest. */
    slash: (a, b, P, o) => {
      const n = o.tier >= 2 ? 3 : 2, T = 120, last = T + (n - 1) * 120;
      for (let i = 0; i < n; i++) at(T + i * 120, () => { const x = b.x + (i - (n - 1) / 2) * 10; add({ x, y: b.y, s: 20 + o.tier * 3 + (i === n - 1 ? 4 : 0), dx: i % 2 ? -1 : 1, life: 0.3, c: P[1], k: 'sl', w: o.tier > 1 ? 4 : 3 }); burst(x, b.y, P, 4, 70, 'sp', 4, 0.25); if (i < n - 1) shake(70, 1.5); });
      at(last, () => { rays(b.x, b.y, ['#fff', P[0]], 8, 4, 30, 0.18); after(b, o.ty, o.tier); });
      o.hit = last; return last + 420;
    },
    /* Knyttneve og spark: en kule av kraft som smeller inn, med sjokkbølge. */
    punch: (a, b, P, o) => { streaks(a, b, [P[0], '#fff'], 6 + o.tier * 2); at(130, () => { add({ x: b.x, y: b.y, s: 26 + o.tier * 5, gs: -90, life: 0.22, c: ['#fff', P[0], P[1]], k: 'ci' }); impact(b, P, Math.min(3, o.tier + 1)); after(b, o.ty, o.tier); }); o.hit = 130; return 600; },
    /* Bitt: to kjever som smeller igjen rundt målet. */
    bite: (a, b, P, o) => {
      for (let i = -2; i <= 2; i++) { add({ x: b.x + i * 7, y: b.y - 30, vy: 150, life: 0.4, s: 9 + o.tier, c: '#fff', k: 'fg', dir: 1, hold: 1, up: p => { if (p.y > b.y - 9) { p.vy = 0; p.y = b.y - 9; } } }); add({ x: b.x + i * 7 + 3, y: b.y + 30, vy: -150, life: 0.4, s: 9 + o.tier, c: '#fff', k: 'fg', dir: -1, hold: 1, up: p => { if (p.y < b.y + 9) { p.vy = 0; p.y = b.y + 9; } } }); }
      at(150, () => { burst(b.x, b.y, P, 9 + o.tier * 3, 80, 'sp', 4); ring(b.x, b.y, P[1], 4, 30 + o.tier * 6, 0.25); rays(b.x, b.y, ['#fff', P[0]], 8, 4, 28, 0.16); after(b, o.ty, o.tier); });
      o.hit = 150; return 600;
    },
    /* Kule som kastes: flyr med hale og sprenges mot målet. */
    ball: (a, b, P, o) => {
      const T = 360 - o.tier * 20;
      fly(a, b, T, { s: 9 + o.tier * 2, c: P[1], k: 'ci', up: p => { if (R() < 0.7) add({ x: p.x, y: p.y, s: p.s * 0.7, gs: -14, life: 0.24, c: P, k: 'ci' }); } }); fly(a, b, T, { s: 4 + o.tier, c: '#fff', k: 'ci' });
      at(T, () => { impact(b, P, o.tier); after(b, o.ty, o.tier); if (o.tier >= 2) flash(P[0], 0.1, 0.3); });
      o.hit = T; return T + 480;
    },
    /* Stråle: holder en stund, skjelver og kaster gnister, og ender i et smell. De sterkeste er brede og får banen til å riste hele veien. */
    beam: (a, b, P, o) => {
      const w = 5 + o.tier * 2.5, D = 420 + o.tier * 130, n = Math.round(D / 26);
      ring(a.x, a.y, P[0], 4, 26, 0.2);
      add({ x: a.x, y: a.y, x2: b.x, y2: b.y, life: D / 1000, c: P[1], k: 'bm', w, hold: 1 });
      if (o.tier >= 2) add({ x: a.x, y: a.y, x2: b.x, y2: b.y, life: D / 1000, c: P[0], k: 'bm', w: w * 1.8, a: 0.3, hold: 1, ng: 1 });
      for (let i = 0; i < n; i++) at(i * 26, () => { const f = R(); add({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, vx: (R() - 0.5) * 70, vy: (R() - 0.5) * 70, s: 3, life: 0.25, c: P, k: 'sp' }); burst(b.x, b.y, P, 2, 90, 'sp', 4, 0.3); });
      shake(D, 1 + o.tier * 0.9, 1);
      at(D, () => { impact(b, P, o.tier); after(b, o.ty, o.tier); if (o.tier >= 2) flash('#fff', 0.14, 0.5); });
      o.hit = D; return D + 480;
    },
    /* Strøm av typens egne partikler (ild, vann, blader, is …) som spruter mot målet. */
    stream: (a, b, P, o) => {
      const k = KP[o.ty] || 'sp', D = 480 + o.tier * 110, n = 22 + o.tier * 9, m = 4 + o.tier;
      for (let i = 0; i < n; i++) at(i * D / n, () => { const p = fly(jit(a, 8), jit(b, 22), 280 + R() * 90, { s: k === 'ln' ? 1 : 5 + R() * 4 + o.tier, c: P, k, w: 2, len: 0.04, r: R() * TAU, vr: 8, arc: (R() - 0.3) * 14 }); p.hold = 0; });
      for (let i = 0; i < m; i++) at(300 + i * (D - 200) / m, () => burst(b.x, b.y, P, 4, 60, k === 'ln' ? 'sp' : k, 4, 0.35));
      if (o.tier >= 2) shake(D, 1 + o.tier * 0.5, 1);
      at(D + 160, () => { impact(b, P, Math.max(0, o.tier - 1)); after(b, o.ty, o.tier); });
      o.hit = D + 160; return D + 640;
    },
    /* Lyn: flere nedslag på rad. Skjermen blinker for hvert, og det siste smeller hardest. */
    bolt: (a, b, P, o) => {
      const n = 2 + (o.tier >= 2 ? 1 : 0) + (o.tier >= 3 ? 1 : 0), gap = 140, T = 60 + (n - 1) * gap;
      const one = big => { const pts = [[b.x + (R() - 0.5) * 30, 0]]; while (pts[pts.length - 1][1] < b.y - 8) { const q = pts[pts.length - 1]; pts.push([q[0] + (b.x - q[0]) * 0.35 + (R() - 0.5) * 22, q[1] + 10 + R() * 14]); } pts.push([b.x, b.y]); add({ x: 0, y: 0, pts, life: big ? 0.2 : 0.13, c: P[1], k: 'bo', w: big ? 4 : 3, hold: 1 }); flash(P[0], 0.07, big ? 0.55 : 0.38); burst(b.x, b.y, P, 5, 90, 'sp', 4, 0.25); if (!big) shake(90, 2); };
      for (let i = 0; i < n; i++) at(60 + i * gap, () => one(i === n - 1));
      at(T, () => { impact(b, P, o.tier); after(b, 12, o.tier); });
      o.hit = T; return T + 480;
    },
    /* Stein og is som faller: hver som lander gir et rykk i skjermen. */
    fall: (a, b, P, o) => {
      const k = KP[o.ty] === 'di' ? 'di' : 'rk', n = 5 + o.tier * 2;
      for (let i = 0; i < n; i++) at(i * 80, () => { const x = b.x + (R() - 0.5) * 44, y = b.y + 6 + R() * 8, T = (y + 12) / 520; add({ x, y: -12, vy: 520, life: T, s: 9 + R() * 6 + o.tier, c: P[1], k, r: R() * TAU, vr: 5, hold: 1 }); at(T * 1000, () => { burst(x, y, [P[0], P[2]], 5, 60, 'sq', 3, 0.3); ring(x, y + 4, P[0], 4, 22, 0.2, 1); shake(90, 1.6 + o.tier * 0.5); }); });
      const T = Math.round(n * 0.6) * 80 + 180;
      at(T, () => after(b, o.ty, o.tier));
      o.hit = T; return n * 80 + 560;
    },
    /* Jordskjelv: bakken slår sprekker, stein spruter opp langs hele bakken og skjermen rister lenge. */
    quake: (a, b, P, o) => {
      const D = 720 + o.tier * 170, n = Math.round(D / 50), pts = [[a.x, a.y + 14]];
      shake(D, 3.6 + o.tier * 1.6, 1);
      for (let i = 1; i <= 7; i++) pts.push([a.x + (b.x - a.x) * i / 7 + (R() - 0.5) * 12, a.y + 14 + (b.y - a.y) * i / 7 + (R() - 0.5) * 8]);
      for (let i = 2; i <= 8; i++) at(i * 40, () => add({ x: 0, y: 0, pts: pts.slice(0, i), life: (D - i * 40) / 1000 + 0.15, c: P[2], k: 'bo', w: 3, ng: 1 }));
      for (let i = 0; i < n; i++) at(i * 50, () => { const x = b.x + (R() - 0.5) * 80; burst(x, b.y + 16, [P[0], P[1], P[2]], 4, 50, 'sq', 4, 0.4, 160); add({ x, y: b.y + 16, vy: -150 - R() * 80, ay: 520, life: 0.5, s: 6 + R() * 5 + o.tier, c: P[2], k: 'rk', r: R() * TAU, vr: 6 }); if (i % 3 === 0) ring(x, b.y + 18, P[0], 4, 30, 0.25, 1); });
      at(360, () => { impact({ x: b.x, y: b.y + 10 }, P, o.tier); after(b, o.ty, o.tier); });
      o.hit = 360; return D + 260;
    },
    /* Bølge: vann velter inn fra angriperens side og skyller over målet. */
    wave: (a, b, P, o) => {
      const dir = b.x > a.x ? 1 : -1, n = 46 + o.tier * 12;
      for (let i = 0; i < n; i++) at(i * 9, () => { const y0 = a.y + (b.y - a.y) * R(); add({ x: dir > 0 ? -8 : 264, y: y0 + (R() - 0.5) * 50, vx: dir * (330 + R() * 120), vy: (b.y - a.y) * 0.9 + (R() - 0.5) * 40, life: 0.75, s: 5 + R() * 6 + o.tier, c: P, k: R() < 0.3 ? 'bb' : 'dr' }); });
      shake(520 + o.tier * 80, 1.6 + o.tier * 0.7, 1);
      at(400, () => { ring(b.x, b.y, P[0], 6, 48 + o.tier * 8, 0.3, 3); burst(b.x, b.y, P, 12 + o.tier * 4, 90, 'dr', 5); after(b, 10, o.tier); });
      o.hit = 400; return 900;
    },
    /* Tankekraft: ringer som trekker seg sammen om målet mens det vrir seg. */
    psy: (a, b, P, o) => {
      const n = 3 + o.tier, T = 130 * (n - 1) + 100;
      for (let i = 0; i < n; i++) at(i * 130, () => { ring(b.x, b.y, P[i % 2], 46 + o.tier * 6, 6, 0.34, 2); ring(b.x, b.y, P[1], 4, 40, 0.34, 1); });
      for (let i = 0; i < 6; i++) add({ x: b.x, y: b.y, life: T / 1000 + 0.2, s: 4, c: P, k: 'di', ph: i / 6 * TAU, up: p => { p.ph += 0.2; p.x = b.x + Math.cos(p.ph) * 22; p.y = b.y + Math.sin(p.ph) * 12; } });
      if (o.wobble) o.wobble(T + 100);
      if (o.tier >= 2) flash(P[1], 0.3, 0.22);
      at(T, () => { impact(b, P, Math.max(0, o.tier - 1)); after(b, o.ty, o.tier); });
      o.hit = T; return T + 420;
    },
    /* Sug: kuler av liv som trekkes fra målet og tilbake til angriperen. */
    drain: (a, b, P, o) => { ring(b.x, b.y, P[1], 6, 30, 0.25); for (let i = 0; i < 10 + o.tier * 3; i++) at(100 + i * 45, () => fly(jit(b, 16), jit(a, 8), 340, { s: 5, c: [P[1], P[0], '#fff'], k: 'ci', arc: 14 * (R() - 0.2) })); at(620, () => ring(a.x, a.y, P[0], 30, 6, 0.25)); o.hit = 140; return 820; },
    /* Lyd: buer som brer seg mot målet, og noter som svever. */
    sound: (a, b, P, o) => { const an = Math.atan2(b.y - a.y, b.x - a.x), n = 4 + o.tier; for (let i = 0; i < n; i++) at(i * 90, () => add({ x: a.x + Math.cos(an) * 14, y: a.y + Math.sin(an) * 14, vx: Math.cos(an) * 230, vy: Math.sin(an) * 230, s: 12, gs: 70 + o.tier * 14, life: 0.5, c: P[i % 2], k: 'ri', w: 2, a0: an - 0.9, a1: an + 0.9 })); for (let i = 0; i < 3; i++) at(60 + i * 120, () => add({ x: a.x + (R() - 0.5) * 16, y: a.y - 12, vx: Math.cos(an) * 60, vy: -30, life: 0.6, s: 7, c: P[1], k: 'nt' })); if (o.pow) { shake(n * 90, 1 + o.tier * 0.6, 1); at(420, () => after(b, o.ty, o.tier)); } o.hit = 420; return 460 + n * 80; },
    powder: (a, b, P) => { for (let i = 0; i < 34; i++) at(i * 16, () => add({ x: b.x + (R() - 0.5) * 48, y: b.y - 30 - R() * 14, vy: 40 + R() * 30, life: 0.75, s: 2 + R() * 2, c: P, k: 'sq', ph: R() * TAU, up: (p, dt) => { p.ph += dt * 8; p.x += Math.sin(p.ph) * 0.6; } })); return 900; },
    buff: (a, b, P) => { ring(a.x, a.y, P[0], 54, 8, 0.4, 2); at(200, () => ring(a.x, a.y, '#fff', 44, 6, 0.36, 1)); for (let i = 0; i < 16; i++) at(i * 34, () => add({ x: a.x + (R() - 0.5) * 36, y: a.y + 16, vy: -90 - R() * 50, life: 0.5, s: 4 + R() * 3, c: [P[0], '#fff', P[1]], k: 'sp' })); return 760; },
    heal: (a, b, P) => { const G = ['#eaffd8', '#8be07a', '#3aa85a']; ring(a.x, a.y, G[1], 8, 44, 0.4, 2); at(220, () => ring(a.x, a.y, G[0], 6, 36, 0.4, 1)); for (let i = 0; i < 14; i++) at(i * 40, () => add({ x: a.x + (R() - 0.5) * 34, y: a.y + 12, vy: -70 - R() * 40, life: 0.6, s: 5, c: G, k: 'sp' })); return 780; },
    shield: (a, b, P) => { const x = a.x + (b.x > a.x ? 16 : -16), y = a.y - (b.y < a.y ? 8 : -8); add({ x, y, s: 10, gs: 150, life: 0.2, c: '#fff', k: 'hx' }); at(120, () => add({ x, y, s: 40, life: 0.55, c: P[0], k: 'hx' })); at(200, () => rays(x, y, ['#fff', P[0]], 8, 18, 30, 0.2)); return 720; },
    weather: (a, b, P, o) => { const k = o.name; if (/Rain|Water Sport/.test(k)) for (let i = 0; i < 80; i++) at(i * 10, () => add({ x: R() * 300, y: -6, vx: -90, vy: 420, life: 0.5, c: '#bfe3ff', k: 'ln', len: 0.03 })); else if (/Sunny/.test(k)) { flash('#fff3b0', 0.6, 0.45); for (let i = 0; i < 9; i++) add({ x: 256, y: 0, vx: -260 - i * 14, vy: 120 + i * 30, life: 0.7, c: '#ffe680', k: 'ln', len: 0.5, w: 2 }); } else if (/Hail/.test(k)) for (let i = 0; i < 54; i++) at(i * 13, () => add({ x: R() * 280, y: -6, vx: -50, vy: 300, life: 0.7, s: 3 + R() * 2, c: '#f2fdff', k: 'sq' })); else if (/Sand|Mud/.test(k)) for (let i = 0; i < 80; i++) at(i * 9, () => add({ x: 262, y: R() * 192, vx: -480, vy: 40, life: 0.6, c: ['#ecd9a0', '#c9a45c'], k: 'ln', len: 0.04, w: 2 })); else { flash(P[1], 0.4, 0.3); ring(128, 96, P[0], 10, 260, 0.6, 3); } return 980; },
    /* Eksplosjon: hvitt lys, ildkuler i flere bølger og en skjerm som rister kraftig. */
    boom: (a, b, P, o) => {
      const c = o.self ? a : b, E = ['#fff', '#fff2a6', '#ffa23a', '#e2481f', '#5a2a1a'];
      flash('#fff', 0.2, 0.85); shake(900, 7 + o.tier, 1);
      for (let i = 0; i < 5; i++) at(i * 90, () => { ring(c.x, c.y, i % 2 ? P[1] : '#fff', 8, 90 + i * 24, 0.42, 4); burst(c.x + (R() - 0.5) * 26, c.y + (R() - 0.5) * 20, E, 14, 140, 'ci', 9, 0.5, 0); rays(c.x, c.y, ['#fff', '#fff2a6'], 10, 8, 70 + i * 10, 0.22, 2); });
      at(140, () => after(b, o.ty, 3));
      o.hit = 140; return 1000;
    },
    /* Rulling: en stein som blir større for hvert treff på rad. */
    roll: (a, b, P, o) => { const s = 12 + 4 * (o.roll || 0), dir = b.x > a.x ? 1 : -1; fly({ x: a.x, y: a.y + 8 }, { x: b.x, y: b.y + 6 }, 380, { s, c: P[1], k: 'rk', vr: dir * 22, up: p => { if (R() < 0.5) add({ x: p.x, y: p.y + s / 2, vx: -dir * 30, vy: -20, life: 0.25, s: 3, c: P[0], k: 'sq' }); } }); at(380, () => { impact(b, P, Math.min(3, o.roll || 0)); burst(b.x, b.y, [P[1], P[2]], 6 + 2 * (o.roll || 0), 90, 'rk', 5, 0.4, 300); }); o.hit = 380; return 760; },
    seed: (a, b, P) => { for (let i = 0; i < 3; i++) at(i * 90, () => fly(a, jit(b, 18), 420, { s: 4, c: ['#8a5a2a', '#c9a45c'], k: 'ci', arc: 26 })); at(620, () => { for (let i = 0; i < 8; i++) add({ x: b.x + (R() - 0.5) * 30, y: b.y + 12, vy: -60 - R() * 50, life: 0.5, s: 7, c: P, k: 'lf', r: (R() - 0.5), vr: 3 }); }); return 1100; },
    /* Vind: virvler rundt målet og striper som blåser forbi. Banen svaier med de sterkeste. */
    wind: (a, b, P, o) => { const n = 5 + o.tier * 2; for (let i = 0; i < n; i++) at(i * 70, () => add({ x: b.x, y: b.y + 14 - (i % 6) * 7, s: 44 - (i % 6) * 6 + o.tier * 4, life: 0.4, c: P[i % 2], k: 'ri', w: 2, a0: 0, a1: 2.2, up: (p, dt) => { p.a0 += dt * 16; p.a1 += dt * 16; } })); for (let i = 0; i < 14 + o.tier * 8; i++) at(i * 26, () => add({ x: b.x - 60 + R() * 20, y: b.y + (R() - 0.5) * 50, vx: 320, vy: -40, life: 0.3, c: P[0], k: 'ln', len: 0.06 })); if (o.tier >= 1) shake(n * 70, 1 + o.tier * 0.8, 2); at(360, () => after(b, o.ty, o.tier)); o.hit = 360; return 420 + n * 70; },
    wisp: (a, b, P) => { const W = ['#e8f6ff', '#8fd0ff', '#5b7cf0']; for (let i = 0; i < 3; i++) at(i * 80, () => fly(a, jit(b, 10), 440, { s: 7, c: W, k: 'fl', ph: i * 2, up: (p, dt) => { p.ph += dt * 14; p.y += Math.sin(p.ph) * 1.2; } })); at(540, () => burst(b.x, b.y, W, 9, 50, 'fl', 5, 0.4, -40)); return 860; },
    hazard: (a, b, P) => { for (let i = 0; i < 7; i++) at(i * 50, () => { const x = b.x + (R() - 0.5) * 60, y = b.y + 14 + R() * 8; add({ x, y, s: 2, gs: 30, life: 0.5, c: P[1], k: 'fg', dir: -1 }); }); return 760; },
    /* Nåler og skudd: tynne, raske prosjektiler på rekke og rad. */
    needle: (a, b, P, o) => { const n = 4 + o.tier * 2; for (let i = 0; i < n; i++) at(i * 55, () => { const q = jit(b, 12), an = Math.atan2(q.y - a.y, q.x - a.x), T = 0.17, v = Math.hypot(q.x - a.x, q.y - a.y) / T; add({ x: a.x, y: a.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life: T, c: i % 2 ? '#fff' : P[1], k: 'ln', len: 0.06, w: 2, hold: 1 }); at(T * 1000, () => burst(q.x, q.y, P, 3, 60, 'sp', 3, 0.2)); }); at(190, () => after(b, o.ty, o.tier)); o.hit = 190; return 300 + n * 55; },
    /* Stikk og raske slag: korte støt som hagler mot målet, og et smell til slutt. */
    jab: (a, b, P, o) => { const n = 2 + o.tier, an = Math.atan2(b.y - a.y, b.x - a.x), T = 110 + (n - 1) * 70; streaks(a, b, [P[0], '#fff'], 6); for (let i = 0; i < n; i++) at(110 + i * 70, () => { const q = jit(b, 12); add({ x: q.x - Math.cos(an) * 16, y: q.y - Math.sin(an) * 16, vx: Math.cos(an) * 260, vy: Math.sin(an) * 260, life: 0.07, c: i % 2 ? '#fff' : P[1], k: 'ln', len: 0.06, w: 2, hold: 1 }); burst(q.x, q.y, P, 3, 60, 'sp', 3, 0.2); ring(q.x, q.y, '#fff', 2, 14, 0.14, 1); }); at(T, () => { impact(b, P, o.tier); after(b, o.ty, o.tier); }); o.hit = T; return T + 440; },
    /* Snurr: angriperen omgis av ringer som roterer før den braser inn. */
    spin: (a, b, P, o) => { for (let i = 0; i < 3; i++) add({ x: a.x, y: a.y + 6 - i * 6, s: 30 - i * 4, life: 0.26, c: P[i % 2], k: 'ri', w: 2, a0: i * 2, a1: i * 2 + 2.4, up: (p, dt) => { p.a0 += dt * 26; p.a1 += dt * 26; } }); streaks(a, b, [P[0], '#fff'], 8); at(170, () => { impact(b, P, o.tier); for (let i = 0; i < 2; i++) add({ x: b.x, y: b.y + 4 - i * 8, s: 34, life: 0.3, c: P[i], k: 'ri', w: 2, a0: i * 3, a1: i * 3 + 2.6, up: (p, dt) => { p.a0 += dt * 22; p.a1 += dt * 22; } }); after(b, o.ty, o.tier); }); o.hit = 170; return 640; }
  };
  /* Hvilken bevegelse et angrep får. Først etter navnet, så etter klasse og type. */
  const BY = [
    [/Leech Seed|Worry Seed/, 'seed'], [/Rollout|Ice Ball/, 'roll'], [/Pin Missile|Poison Sting|Bullet Seed|Icicle Spear|Spike Cannon|Barrage|Bonemerang|Rock Blast|Ice Shard|Vacuum Wave|Swift|Magical Leaf|Razor Leaf/, 'needle'], [/Fury Attack|Peck|Drill Peck|Horn Attack|Megahorn|Poison Jab|Needle Arm|Twineedle|Arm Thrust|Bone Club|Bone Rush|Quick Attack|Extreme Speed|Aqua Jet|Bullet Punch|Mach Punch|Feint|Fake Out|Sucker Punch|Shadow Sneak|Pursuit|Horn Drill|Double Kick|Double Hit|Dual Chop|Comet Punch|Tail Slap|Gear Grind|Triple Kick/, 'jab'], [/Rapid Spin|Gyro Ball|Flame Wheel|Volt Tackle|Wild Charge|Flare Blitz|Brave Bird|Double-Edge|Take Down|Head Charge|Giga Impact|Skull Bash|Wood Hammer|Dragon Rush|Zen Headbutt|Iron Head|Heavy Slam|Heat Crash|Steamroller|Drill Run/, 'spin'], [/Will-O-Wisp|Confuse Ray|Hex$/, 'wisp'], [/Spikes|Stealth Rock/, 'hazard'],
    [/Rain Dance|Sunny Day|Sandstorm|Hail|Trick Room|Gravity|Water Sport|Mud Sport/, 'weather'],
    [/Explosion|Self-Destruct|Eruption|Overheat|Blast Burn|Fire Blast|Draco Meteor|Giga Impact|Egg Bomb|Searing Shot|Blue Flare|V-create|Final Gambit|Judgment|Lava Plume/, 'boom'],
    [/Mud-Slap|Sand Attack|Powder|Spore|Sweet Scent|Smokescreen|Haze|^Mist$|Poison Gas|Smog|Cotton|String Shot|Spider Web|^Toxic$|^Flash$/, 'powder'],
    [/Bite|Crunch|Fang|Jaw/, 'bite'],
    [/Punch|Chop|Brick Break|Force Palm|Arm Thrust|Hammer|Close Combat|Superpower|Revenge|Slap|Pound|Uppercut|Rock Smash|Vital Throw|Seismic Toss|Submission|Circle Throw|Storm Throw|Low Sweep|Kick|Stomp|Counter|Reversal|Drain Punch|Strength|Slam|Headbutt|Body/, 'punch'],
    [/Scratch|Slash|^Cut$|Claw|Fury Swipes|X-Scissor|Leaf Blade|Psycho Cut|Air Slash|Aerial Ace|False Swipe|Fury Cutter|Cross Poison|Razor Shell|Sacred Sword|Air Cutter|Razor Wind|Whip|Razor Leaf|Guillotine|Horn/, 'slash'],
    [/Earthquake|Magnitude|Bulldoze|Earth Power|Fissure|^Dig$|Drill Run|Sand Tomb/, 'quake'],
    [/Rock Slide|Rock Tomb|Stone Edge|Ancient Power|Rock Throw|Rock Blast|Smack Down|Avalanche|Icicle Crash|Rock Wrecker|Head Smash/, 'fall'],
    [/Thunder|Shock|Spark|Discharge|Zap|Volt|Bolt|Wild Charge/, 'bolt'],
    [/Surf|Muddy Water|Waterfall|Whirlpool|^Dive$|Aqua Tail|Hydro Cannon/, 'wave'],
    [/[Bb]eam|Hydro Pump|Flash Cannon|Dragon Pulse|Tri Attack|Luster Purge|Techno Blast|Hyper Voice|Dark Pulse|Water Pulse|Aura Sphere/, 'beam'],
    [/Absorb|Drain|Leech Life|Dream Eater|Horn Leech|Pain Split/, 'drain'],
    [/Gust|Whirlwind|Twister|Hurricane|Silver Wind|Ominous Wind|Icy Wind|Tailwind|Defog|Leaf Tornado|Blizzard|Heat Wave/, 'wind'],
    [/Growl|Roar|Screech|Sing|Supersonic|Uproar|Snore|Bug Buzz|Chatter|Round|Echoed Voice|Metal Sound|Grass Whistle|Perish Song|Snarl|Howl|Heal Bell|Relic Song|Yawn/, 'sound'],
    [/Recover|Soft-Boiled|Roost|Synthesis|Moonlight|Morning Sun|^Rest$|Milk Drink|Slack Off|Aromatherapy|Wish|Refresh|Aqua Ring|Ingrain|Swallow|Heal Pulse|Heal Order/, 'heal'],
    [/Protect|Detect|Endure|Reflect|Light Screen|Safeguard|Barrier|Substitute|Lucky Chant|Magnet Rise|Iron Defense|Harden|Withdraw|Defense Curl|Acid Armor|Cosmic Power/, 'shield'],
    [/Shadow Ball|Energy Ball|Focus Blast|Electro Ball|Sludge Bomb|Mud Bomb|Zap Cannon|Weather Ball|Mist Ball|Seed Bomb|Octazooka|Gunk Shot|Magnet Bomb|Sludge Wave|Night Daze|Shadow Sneak/, 'ball']
  ];
  const CONTACT = new Set(['bite', 'punch', 'slash', 'strike', 'spin', 'roll', 'jab']);
  function kindOf(m) {
    for (const [re, k] of BY) if (re.test(m[0]) && !(m[4] === 0 && CONTACT.has(k)) && !(m[4] > 0 && (k === 'heal' || k === 'shield'))) return k;
    if (m[4] === 1) return 'strike';
    if (m[4] === 2) return [9, 10, 11, 14, 3, 4, 5, 6, 2, 15, 17].includes(m[1]) ? 'stream' : m[1] === 12 ? 'bolt' : m[1] === 13 ? 'psy' : 'ball';
    return m[17] === 1 || (m[12].length && m[12][0][1] > 0) ? 'buff' : 'psy';
  }
  /* ---------- Det skjermen kaller ---------- */
  const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms) / F.speed));
  F.attach = c => { cv = c; g = c ? c.getContext('2d') : null; parts = []; jobs = []; holdT = 0; if (g) g.imageSmoothingEnabled = false; };
  F.count = () => parts.length + jobs.length;
  F.kindOf = kindOf; F.contact = m => m[4] === 1 && CONTACT.has(kindOf(m));
  /* Treff-stopp: alt på lerretet fryser i ms millisekunder, så smellet står stille et øyeblikk. */
  F.hold = ms => { holdT = performance.now() + ms; kick(); };
  /* Spiller et angrep fra a til b. Gir { hit, ms }: når angrepet treffer, og når hele effekten er ferdig (millisekunder ved vanlig fart). */
  F.move = (m, a, b, o = {}) => { if (!g) return { hit: 200, ms: 320 }; const k = kindOf(m), q = Object.assign({ ty: m[1], pow: m[2] || 0, name: m[0], tier: 0 }, o), ms = PROG[k](a, b, PAL[q.pal != null ? q.pal : m[1]] || PAL[0], q); return { hit: q.hit == null ? Math.round(ms * 0.6) : q.hit, ms }; };
  /* Oppladningen før et angrep: lys og kraft som samler seg hos angriperen. Sterkere angrep samler mer. cls = 1 fysisk, 2 spesial, 0 status. */
  F.charge = (a, ty, tier, ms, cls) => {
    if (!g) return;
    const P = PAL[ty] || PAL[0], n = 6 + tier * 5, T = ms / 1000;
    for (let i = 0; i < n; i++) at(i * ms * 0.55 / n, () => { const an = R() * TAU, r = 26 + R() * 18 + tier * 5; fly({ x: a.x + Math.cos(an) * r, y: a.y + Math.sin(an) * r * 0.8 }, a, ms * 0.4 + 60, { s: 2 + R() * 2, c: [P[0], P[1]], k: cls === 1 ? 'sq' : 'sp' }); });
    ring(a.x, a.y, P[1], 40 + tier * 8, 6, T * 0.9, 1);
    if (tier >= 2) at(ms * 0.35, () => ring(a.x, a.y, P[0], 56, 4, T * 0.6, 2));
    if (cls === 2) add({ x: a.x, y: a.y, s: 2, gs: (9 + tier * 4) / T, life: T, c: ['#fff', P[0]], k: 'ci', hold: 1 });
    else if (cls === 1) for (let i = 0; i < 3 + tier; i++) at(i * 50, () => add({ x: a.x + (R() - 0.5) * 24, y: a.y + 14, vx: (R() - 0.5) * 20, vy: -50 - R() * 40, life: 0.35, s: 3, c: [P[0], '#fff'], k: 'sq' }));
    if (tier >= 3) at(ms * 0.75, () => flash(P[0], 0.12, 0.3));
  };
  /* Første runde av et angrep som tar to: lys som samles, vind, jord som spruter eller vann som plasker, etter hva angrepet gjør. */
  F.gather = (name, a, ty) => {
    if (!g) return 500;
    const P = PAL[ty] || PAL[0];
    if (/Solar|Sky Attack/.test(name)) { for (let i = 0; i < 30; i++) at(i * 22, () => { const an = R() * TAU, r = 50 + R() * 40; fly({ x: a.x + Math.cos(an) * r, y: a.y + Math.sin(an) * r * 0.7 }, a, 380, { s: 3, c: ['#fff', P[0], P[1]], k: 'sp' }); }); add({ x: a.x, y: a.y, s: 3, gs: 22, life: 0.9, c: ['#fff', P[0]], k: 'ci', hold: 1 }); at(700, () => { ring(a.x, a.y, '#fff', 6, 60, 0.3, 2); flash(P[0], 0.14, 0.3); }); return 950; }
    if (/Dig/.test(name)) { for (let i = 0; i < 5; i++) at(i * 70, () => burst(a.x + (R() - 0.5) * 20, a.y + 14, PAL[4], 6, 80, 'rk', 5, 0.45, 300)); shake(380, 2, 1); return 560; }
    if (/Dive/.test(name)) { for (let i = 0; i < 4; i++) at(i * 60, () => burst(a.x, a.y + 10, PAL[10], 8, 100, 'dr', 4, 0.5, 340)); ring(a.x, a.y + 12, PAL[10][0], 6, 50, 0.4, 2); return 520; }
    if (/Fly|Bounce/.test(name)) { for (let i = 0; i < 16; i++) at(i * 22, () => add({ x: a.x + (R() - 0.5) * 30, y: a.y + 16, vy: -260 - R() * 120, life: 0.3, c: ['#fff', P[0]], k: 'ln', len: 0.07 })); ring(a.x, a.y + 14, '#fff', 6, 46, 0.3, 1); return 480; }
    if (/Shadow/.test(name)) { flash('#000', 0.3, 0.5); ring(a.x, a.y, P[1], 50, 4, 0.35, 2); burst(a.x, a.y, P, 12, 70, 'ci', 5, 0.4, 0); return 520; }
    if (/Razor Wind/.test(name)) { for (let i = 0; i < 6; i++) at(i * 70, () => add({ x: a.x, y: a.y + 12 - i * 5, s: 40 - i * 4, life: 0.4, c: P[i % 2], k: 'ri', w: 2, a0: 0, a1: 2.2, up: (p, dt) => { p.a0 += dt * 16; p.a1 += dt * 16; } })); return 720; }
    ring(a.x, a.y, P[0], 50, 6, 0.4, 2); for (let i = 0; i < 10; i++) at(i * 40, () => add({ x: a.x + (R() - 0.5) * 30, y: a.y + 14, vy: -70 - R() * 40, life: 0.4, s: 3, c: [P[0], '#fff'], k: 'sq' })); return 620;
  };
  /* Smellet når et treff lander. e = hvor effektivt (over 1 = super, under 1 = lite), tier = hvor voldsomt angrepet var, n = hvilket treff i rekka. */
  F.hit = (b, ty, e, crit, tier, n) => {
    if (!g) return;
    const P = PAL[ty] || PAL[0], t = tier || 0;
    if (e < 1) { burst(b.x, b.y, [P[2], '#8a8a92'], 5, 40, 'sq', 3, 0.3); ring(b.x, b.y, '#9a9aa2', 3, 16, 0.2, 1); return; }
    if (n) { burst(b.x, b.y, P, 6, 80, 'sp', 4, 0.3); ring(b.x, b.y, '#fff', 3, 22, 0.18, 2); rays(b.x, b.y, ['#fff', P[0]], 5, 4, 20, 0.14); }
    else if (e > 1) { impact(b, P, Math.min(3, t + 1)); flash('#fff', 0.1, 0.42); ring(b.x, b.y, P[0], 10, 96 + t * 12, 0.36, 2); for (let i = 0; i < 4; i++) add({ x: b.x, y: b.y, vx: [1, -1, 0, 0][i] * 300, vy: [0, 0, 1, -1][i] * 300, life: 0.16, c: '#fff', k: 'ln', len: 0.12, w: 2 }); }
    else { burst(b.x, b.y, P, 6 + t * 2, 70 + t * 10, 'sp', 4, 0.3); ring(b.x, b.y, '#fff', 3, 20 + t * 5, 0.18, 2); }
    if (F.intensity >= 4 && e >= 1) burst(b.x, b.y, [P[0], '#fff'], F.intensity, 110, 'sp', 4, 0.35, 0);
    if (crit) { ring(b.x, b.y, '#ffe14a', 6, 64, 0.3, 3); rays(b.x, b.y, ['#fff', '#ffe14a'], 10, 6, 48, 0.2, 2); }
    if (t >= 2 && !n) power(b, P, t);
  };
  F.status = (k, b) => {
    if (!g) return;
    if (k === 'slp') for (let i = 0; i < 3; i++) at(i * 160, () => add({ x: b.x + 8 + i * 5, y: b.y - 14, vx: 10, vy: -26, life: 0.7, s: 8 + i * 2, c: '#e8ecff', k: 'tx', txt: 'Z' }));
    else if (k === 'par') for (let i = 0; i < 3; i++) at(i * 90, () => burst(b.x + (R() - 0.5) * 24, b.y + (R() - 0.5) * 20, PAL[12], 4, 60, 'sp', 5, 0.2, 0));
    else if (k === 'psn') for (let i = 0; i < 8; i++) at(i * 50, () => add({ x: b.x + (R() - 0.5) * 30, y: b.y + 8, vy: -50 - R() * 30, life: 0.6, s: 5 + R() * 3, c: PAL[3], k: 'bb' }));
    else if (k === 'brn') for (let i = 0; i < 8; i++) at(i * 45, () => add({ x: b.x + (R() - 0.5) * 30, y: b.y + 12, vy: -60 - R() * 40, life: 0.5, s: 6, c: PAL[9], k: 'fl' }));
    else if (k === 'frz') { ring(b.x, b.y, PAL[14][1], 44, 8, 0.4, 2); for (let i = 0; i < 9; i++) add({ x: b.x + (R() - 0.5) * 36, y: b.y + (R() - 0.5) * 30, life: 0.6, s: 8, c: PAL[14], k: 'di', r: R() * TAU }); }
    else if (k === 'conf') for (let i = 0; i < 3; i++) add({ x: b.x, y: b.y - 22, life: 0.9, s: 6, c: PAL[12], k: 'sp', ph: i / 3 * TAU, up: (p, dt) => { p.ph += dt * 9; p.x = b.x + Math.cos(p.ph) * 16; p.y = b.y - 22 + Math.sin(p.ph) * 5; } });
    else if (k === 'seed') for (let i = 0; i < 6; i++) add({ x: b.x + (R() - 0.5) * 30, y: b.y + 12, vy: -50 - R() * 30, life: 0.5, s: 6, c: PAL[11], k: 'lf', r: R() - 0.5 });
  };
  F.stat = (b, up) => { if (!g) return; const c = up ? ['#fff3b0', '#ffc94a', '#e08a12'] : ['#cfe0ff', '#6b8dff', '#3a4fb0']; for (let i = 0; i < 7; i++) at(i * 45, () => add({ x: b.x + (R() - 0.5) * 34, y: b.y + (up ? 16 : -16), vy: up ? -110 : 110, life: 0.42, s: 8, c, k: 'ar', dir: up ? 1 : -1 })); };
  F.heal = b => { if (g) PROG.heal(b, b, PAL[11], {}); };
  F.open = (b, c) => { if (!g) return; flash('#fff', 0.1, 0.35); ring(b.x, b.y, '#fff', 4, 54, 0.3, 3); burst(b.x, b.y, ['#fff', c || '#ffd9d0'], 12, 90, 'sp', 5, 0.35, 0); };
  F.weather = k => { if (g && k) PROG.weather({ x: 128, y: 96 }, { x: 128, y: 96 }, PAL[0], { name: { rain: 'Rain', sun: 'Sunny', sand: 'Sand', hail: 'Hail' }[k] }); };
  /* Inngangen til bossenes ess: lyssøyle, ringer og gnister i trenerens farge. Klasse 9 (gull) og de onde (rødt) får lyn i tillegg. */
  F.ace = (b, ty, o = {}) => {
    if (!g) return wait(900);
    const gold = o.gold || o.th === 'evil', P = o.gold ? ['#fff7cf', '#ffd45a', '#c98a12'] : o.th === 'evil' ? ['#ff8a7a', '#e02020', '#5a0a0a'] : o.cc ? ['#ffffff', o.cc, o.cc] : PAL[ty] || PAL[0];
    add({ k: 'fs', c: '#000', life: 1.25, a: 0.55, x: 0, y: 0 });
    at(150, () => { add({ x: b.x, y: b.y + 18, s: 4, gs: 110, life: 0.9, c: [P[0], P[1]], k: 'pl', a: 0.75 }); add({ x: b.x, y: b.y + 18, s: 2, gs: 36, life: 0.9, c: '#fff', k: 'pl' }); shake(700, 4, 1); });
    for (let i = 0; i < 4; i++) at(250 + i * 150, () => { ring(b.x, b.y + 14, P[i % 2], 8, 120, 0.5, 3); for (let j = 0; j < 8; j++) add({ x: b.x + (R() - 0.5) * 50, y: b.y + 18, vy: -160 - R() * 120, life: 0.6, s: 5, c: [P[0], '#fff', P[1]], k: 'sp' }); });
    if (gold) for (let i = 0; i < 4; i++) at(300 + i * 140, () => PROG.bolt(b, { x: b.x + (R() - 0.5) * 70, y: b.y + 16 }, P, { pow: 0, tier: 0 }));
    at(900, () => { flash('#fff', 0.2, 0.7); ring(b.x, b.y, '#fff', 10, 200, 0.45, 4); });
    return wait(1250);
  };
  /* Bakgrunnsshowet: jo høyere klasse motstanderen har, jo mer skjer bak Pokémonene. Det tegnes på et eget lerret bak spritene (256 × 192), rundt 30 ganger i sekundet.
     Nivå 1: lysbånd · 2: svevende gnister · 4: puls bak motstanderen · 6: fartsstriper · 7: lyn · 8: nordlys.
     o.th = tema: 'evil' (mørkt, rød puls som hjerteslag, aske, røde lyn og forstyrrelser), mesternes egne ('snow', 'bubble', 'flame', 'shard', 'petal', 'spark', 'meteor', rolige og i deres farge o.cc),
     og o.gold (bare klasse 9: gull, nordlys og lyn). */
  let showId = 0;
  F.intensity = 0;
  const TPN = { snow: 46, bubble: 20, flame: 30, shard: 16, petal: 22, spark: 26, meteor: 18, evil: 38 };
  F.show = (c, lvl, ty, o = {}) => {
    cancelAnimationFrame(showId); showId = 0; F.intensity = lvl || 0;
    if (!c || !lvl) return;
    const x = c.getContext('2d'), th = o.th || '', evil = th === 'evil', calm = !!th && !evil;
    const P = o.gold ? ['#fff7cf', '#ffd45a', '#c98a12'] : evil ? ['#ff8a7a', '#e02020', '#5a0a0a'] : o.cc ? ['#ffffff', o.cc, o.cc] : PAL[ty] || PAL[0];
    const motes = Array.from({ length: lvl >= 2 && !th ? Math.min(46, 6 + lvl * 5) : 0 }, () => ({ x: R() * 256, y: R() * 192, v: (6 + R() * 14) * (1 + lvl / 4), s: R() < 0.3 ? 2 : 1, p: R() * TAU }));
    const lines = Array.from({ length: lvl >= 6 && !calm ? 6 + (lvl - 6) * 4 : 0 }, () => ({ x: R() * 256, y: R() < 0.5 ? R() * 34 : 158 + R() * 34, v: 160 + R() * 220, w: 14 + R() * 30 }));
    const tp = Array.from({ length: TPN[th] || 0 }, () => ({ x: R() * 256, y: R() * 192, v: 0.4 + R(), p: R() * TAU, s: R() < 0.3 ? 2 : 1 }));
    let t0 = 0, bolt = null, nextBolt = 1.2, glitch = 0, nextGl = 2;
    const step = ts => {
      if (!c.isConnected) { showId = 0; return; }
      showId = requestAnimationFrame(step);
      if (ts - t0 < 32) return;
      const dt = Math.min(0.1, (ts - t0) / 1000), T = ts / 1000; t0 = ts;
      x.clearRect(0, 0, 256, 192);
      /* De onde: banen mørkner, og kantene pulserer rødt i to slag som et hjerte. */
      let beat = 0;
      if (evil) { const ph = (T % 1.15) / 1.15; beat = Math.max(Math.exp(-Math.pow(ph - 0.06, 2) / 0.0016), 0.7 * Math.exp(-Math.pow(ph - 0.26, 2) / 0.003)); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, 0, 256, 192); }
      x.globalCompositeOperation = 'lighter';
      const bands = calm ? 2 : 2 + Math.floor(lvl / 3);
      for (let i = 0; i < bands; i++) { const bx = ((T * (10 + lvl * 3) + i * 320 / bands) % 320) - 32; x.globalAlpha = (0.04 + 0.007 * lvl) * (evil ? 0.5 : 1); x.fillStyle = P[i % 2]; x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx + 12, 0); x.lineTo(bx - 36, 192); x.lineTo(bx - 48, 192); x.fill(); }
      if (lvl >= 4) { const k = evil ? beat : 0.5 + 0.5 * Math.sin(T * (2 + lvl * 0.35)), r = 34 + lvl * 3 + k * 10, gr = x.createRadialGradient(189, 74, 4, 189, 74, r); gr.addColorStop(0, P[1]); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 0.14 + 0.03 * lvl + 0.1 * k; x.fillStyle = gr; x.fillRect(189 - r, 74 - r, r * 2, r * 2); }
      if (lvl >= 8 && !th) for (let j = 0; j < 3; j++) { x.globalAlpha = 0.1; x.fillStyle = [P[0], P[1], '#fff'][j]; x.beginPath(); x.moveTo(0, 0); for (let i = 0; i <= 256; i += 16) x.lineTo(i, 24 + j * 9 + Math.sin(i / 40 + T * (0.8 + j * 0.3) + j) * 10); x.lineTo(256, 0); x.fill(); }
      x.globalAlpha = 0.35; x.fillStyle = P[0];
      for (const l of lines) { l.x -= l.v * dt; if (l.x < -l.w) { l.x = 256 + R() * 60; l.y = R() < 0.5 ? R() * 34 : 158 + R() * 34; } x.fillRect(px(l.x), px(l.y), px(l.w), 1); }
      for (const m of motes) { m.y -= m.v * dt; m.x += Math.sin(T * 1.3 + m.p) * 6 * dt; if (m.y < -2) { m.y = 194; m.x = R() * 256; } x.globalAlpha = 0.35 + 0.3 * Math.sin(T * 3 + m.p); x.fillStyle = m.s > 1 ? P[0] : P[1]; x.fillRect(px(m.x), px(m.y), m.s, m.s); }
      /* Temaene: snø som faller, bobler som stiger, flammer fra bunnen, krystaller som glimter, blader som driver, gnister som blinker, og aske og glør hos de onde. */
      for (const q of tp) {
        if (th === 'snow') { q.y += (12 + 20 * q.v) * dt; q.x += (Math.sin(T + q.p) * 8 - 6) * dt; x.globalAlpha = 0.75; x.fillStyle = '#fff'; x.fillRect(px(q.x), px(q.y), q.s, q.s); }
        else if (th === 'bubble') { q.y -= (10 + 16 * q.v) * dt; q.x += Math.sin(T * 1.6 + q.p) * 7 * dt; x.globalAlpha = 0.55; x.strokeStyle = P[q.s > 1 ? 0 : 1]; x.lineWidth = 1; x.beginPath(); x.arc(px(q.x), px(q.y), 1.5 + q.s * 1.5, 0, TAU); x.stroke(); }
        else if (th === 'flame') { q.y -= (36 + 50 * q.v) * dt; q.x += Math.sin(T * 5 + q.p) * 10 * dt; const h = Math.max(0, q.y / 192); x.globalAlpha = 0.7 * h; x.fillStyle = h > 0.7 ? '#fff2a6' : h > 0.4 ? P[1] : '#e2481f'; x.fillRect(px(q.x), px(q.y), q.s, 2 + q.s); }
        else if (th === 'shard') { const a = Math.sin(T * 1.8 + q.p); if (a > 0) { x.globalAlpha = a * 0.8; x.fillStyle = q.s > 1 ? '#fff' : P[1]; const s = 1 + q.s; x.fillRect(px(q.x) - s, px(q.y), s * 2 + 1, 1); x.fillRect(px(q.x), px(q.y) - s, 1, s * 2 + 1); } }
        else if (th === 'petal') { q.x += (14 + 14 * q.v) * dt; q.y += (8 + Math.sin(T * 2 + q.p) * 10) * dt; x.globalAlpha = 0.7; x.fillStyle = q.s > 1 ? '#ffe9b0' : P[1]; x.fillRect(px(q.x), px(q.y), 2, 1); x.fillRect(px(q.x) + 1, px(q.y) + 1, 2, 1); }
        else if (th === 'meteor') { const v = 60 + 90 * q.v; q.x -= v * 0.55 * dt; q.y += v * dt; x.fillStyle = q.s > 1 ? '#fff' : P[1]; for (let j = 0; j < 4 + q.s * 2; j++) { x.globalAlpha = 0.85 * (1 - j / (4 + q.s * 2)); x.fillRect(px(q.x + j * 0.55 * q.s), px(q.y - j * q.s), q.s, q.s); } }
        else if (th === 'spark') { if (Math.sin(T * 5 + q.p) > 0.86) { x.globalAlpha = 0.9; x.fillStyle = q.s > 1 ? '#fff' : P[1]; x.fillRect(px(q.x) - 1, px(q.y), 3, 1); x.fillRect(px(q.x), px(q.y) - 1, 1, 3); } else if (R() < 0.01) { q.x = R() * 256; q.y = R() * 192; } }
        else if (evil) { if (q.s > 1) { q.y -= (10 + 14 * q.v) * dt; x.globalAlpha = 0.5 + 0.4 * Math.sin(T * 4 + q.p); x.fillStyle = '#ff5a3a'; } else { q.y += (9 + 12 * q.v) * dt; q.x += Math.sin(T + q.p) * 5 * dt; x.globalAlpha = 0.5; x.fillStyle = '#6a5a5c'; } x.fillRect(px(q.x), px(q.y), q.s, q.s); }
        if (q.y > 194) { q.y = -2; q.x = R() * 256; } else if (q.y < -3) { q.y = 194; q.x = R() * 256; } if (q.x > 258) q.x = -2; else if (q.x < -3) q.x = 257;
      }
      if ((lvl >= 7 && !calm) || evil) {
        nextBolt -= dt;
        if (nextBolt <= 0) { nextBolt = (lvl >= 8 ? 1.1 : evil ? 1.6 : 2.2) + R() * 2; let bx = 20 + R() * 216, by = 0; const pts = [[bx, by]], end = 60 + R() * 60; while (by < end) { bx += (R() - 0.5) * 26; by += 8 + R() * 12; pts.push([bx, by]); } bolt = { pts, t: 0.22 }; }
        if (bolt) { bolt.t -= dt; x.globalAlpha = Math.max(0, bolt.t / 0.22) * 0.8; x.strokeStyle = P[evil ? 1 : 0]; x.lineWidth = 2; x.beginPath(); bolt.pts.forEach((q, i) => i ? x.lineTo(px(q[0]), px(q[1])) : x.moveTo(px(q[0]), px(q[1]))); x.stroke(); x.strokeStyle = evil ? '#ffd0c8' : '#fff'; x.lineWidth = 1; x.stroke(); if (bolt.t <= 0) bolt = null; }
      }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      if (evil) {
        const gr = x.createRadialGradient(128, 100, 50, 128, 100, 165); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(${Math.round(60 + 150 * beat)},0,0,${(0.42 + 0.3 * beat).toFixed(2)})`); x.fillStyle = gr; x.fillRect(0, 0, 256, 192);
        /* Forstyrrelser: noen striper som rykker til, og banen rister med (kroken hooks.glitch). */
        nextGl -= dt; if (nextGl <= 0) { nextGl = 2.2 + R() * 3.5; glitch = 0.14; if (F.hooks.glitch) F.hooks.glitch(150); }
        if (glitch > 0) { glitch -= dt; for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? 'rgba(255,20,60,.3)' : 'rgba(0,240,255,.16)'; x.fillRect(px((R() - 0.5) * 30), px(R() * 192), 256, 1 + px(R() * 5)); } }
      } else if (lvl >= 6 && !calm) { const k = 0.5 + 0.5 * Math.sin(T * 1.7), gr = x.createRadialGradient(128, 100, 60, 128, 100, 170); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${(0.28 + 0.12 * k).toFixed(2)})`); x.fillStyle = gr; x.fillRect(0, 0, 256, 192); }
    };
    showId = requestAnimationFrame(step);
  };
  return F;
})();
