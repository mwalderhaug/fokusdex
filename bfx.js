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
  let cv = null, g = null, parts = [], jobs = [], raf = 0, last = 0, clock = 0, inFrame = false;
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
  function draw(ts) {
    const dt = Math.min(0.05, Math.max(0, ts - last) / 1000) * F.speed; last = ts; clock += dt * 1000;
    const due = jobs.filter(j => j.t <= clock); jobs = jobs.filter(j => j.t > clock); due.forEach(j => j.fn());
    g.clearRect(0, 0, 256, 192);
    parts = parts.filter(p => (p.t += dt) < p.life);
    for (const p of parts) {
      p.vx += (p.ax || 0) * dt; p.vy += (p.ay || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.r = (p.r || 0) + p.vr * dt; if (p.up) p.up(p, dt);
      const f = p.t / p.life, s = Math.max(0.5, p.s + (p.gs || 0) * p.t), c = col(p, f);
      g.globalAlpha = (p.a == null ? 1 : p.a) * (p.hold ? 1 : f < 0.65 ? 1 : (1 - f) / 0.35);
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
  const impact = (b, pal, big) => { ring(b.x, b.y, '#fff', 4, big ? 54 : 32, 0.26, big ? 3 : 2); ring(b.x, b.y, pal[1], 2, big ? 40 : 24, 0.32, 2); burst(b.x, b.y, pal, big ? 18 : 9, big ? 110 : 70, 'sp', big ? 6 : 4, 0.38); add({ x: b.x, y: b.y, s: big ? 22 : 14, gs: -40, life: 0.14, c: '#fff', k: 'di', r: 0.78 }); };
  /* En partikkel som flyr fra a til b på ms millisekunder, med valgfri bue (arc = piksler opp). */
  const fly = (a, b, ms, o) => { const T = ms / 1000, arc = o.arc || 0; return add(Object.assign({ x: a.x, y: a.y, vx: (b.x - a.x) / T, vy: (b.y - a.y) / T - 4 * arc / T, ay: 8 * arc / (T * T), life: T, hold: 1 }, o)); };
  const jit = (p, d) => ({ x: p.x + (R() - 0.5) * d, y: p.y + (R() - 0.5) * d });
  const shake = ms => F.hooks.shake && F.hooks.shake(ms / F.speed);
  /* ---------- Angrepene: hver gir varigheten i millisekunder ---------- */
  const PROG = {
    strike: (a, b, P) => { at(120, () => impact(b, P)); return 380; },
    slash: (a, b, P, o) => { const n = o.pow >= 90 ? 3 : 2; for (let i = 0; i < n; i++) at(i * 90, () => add({ x: b.x + (i - (n - 1) / 2) * 9, y: b.y, s: 20, dx: i % 2 ? -1 : 1, life: 0.26, c: P[1], k: 'sl', w: 3 })); at(n * 90, () => burst(b.x, b.y, P, 8, 70, 'sp', 4)); return 300 + n * 90; },
    punch: (a, b, P) => { at(110, () => { add({ x: b.x, y: b.y, s: 26, gs: -90, life: 0.2, c: ['#fff', P[0], P[1]], k: 'ci' }); ring(b.x, b.y, P[1], 6, 44, 0.3, 3); ring(b.x, b.y, '#fff', 2, 30, 0.22); burst(b.x, b.y, P, 10, 100, 'sp', 5); shake(160); }); return 420; },
    bite: (a, b, P) => { for (let i = -2; i <= 2; i++) { add({ x: b.x + i * 7, y: b.y - 28, vy: 150, life: 0.34, s: 9, c: '#fff', k: 'fg', dir: 1, hold: 1, up: p => { if (p.y > b.y - 9) { p.vy = 0; p.y = b.y - 9; } } }); add({ x: b.x + i * 7 + 3, y: b.y + 28, vy: -150, life: 0.34, s: 9, c: '#fff', k: 'fg', dir: -1, hold: 1, up: p => { if (p.y < b.y + 9) { p.vy = 0; p.y = b.y + 9; } } }); } at(170, () => { burst(b.x, b.y, P, 9, 80, 'sp', 4); ring(b.x, b.y, P[1], 4, 30, 0.25); }); return 460; },
    ball: (a, b, P, o) => { const big = o.pow >= 100; fly(a, b, 320, { s: big ? 13 : 9, c: P[1], k: 'ci', up: p => { if (R() < 0.6) add({ x: p.x, y: p.y, s: p.s * 0.7, gs: -14, life: 0.22, c: P, k: 'ci' }); } }); fly(a, b, 320, { s: big ? 6 : 4, c: '#fff', k: 'ci' }); at(320, () => { impact(b, P, big); if (big) flash(P[0], 0.1, 0.35); }); return 580; },
    beam: (a, b, P, o) => { const big = o.pow >= 110, w = big ? 11 : 6; ring(a.x, a.y, P[0], 4, 22, 0.2); at(80, () => { add({ x: a.x, y: a.y, x2: b.x, y2: b.y, life: 0.42, c: P[1], k: 'bm', w, hold: 1 }); for (let i = 0; i < 14; i++) at(i * 26, () => { const f = R(); add({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, vx: (R() - 0.5) * 60, vy: (R() - 0.5) * 60, s: 3, life: 0.25, c: P, k: 'sp' }); burst(b.x, b.y, P, 2, 80, 'sp', 4, 0.3); }); }); at(480, () => { impact(b, P, big); if (big) { flash('#fff', 0.14, 0.5); shake(260); } }); return 700; },
    stream: (a, b, P, o) => { const k = KP[o.ty] || 'sp', n = o.pow >= 90 ? 34 : 24; for (let i = 0; i < n; i++) at(i * 420 / n, () => { const q = jit(b, 22), p = fly(jit(a, 8), q, 300 + R() * 80, { s: k === 'ln' ? 1 : 5 + R() * 4, c: P, k, w: 2, len: 0.04, r: R() * TAU, vr: 8, arc: (R() - 0.3) * 14 }); p.hold = 0; }); at(360, () => burst(b.x, b.y, P, 6, 50, k === 'ln' ? 'sp' : k, 4, 0.35)); at(520, () => burst(b.x, b.y, P, 8, 70, 'sp', 4)); return 720; },
    bolt: (a, b, P, o) => { const n = o.pow >= 90 || !o.pow ? 3 : 2, one = () => { const pts = [[b.x + (R() - 0.5) * 30, 0]]; while (pts[pts.length - 1][1] < b.y - 8) { const q = pts[pts.length - 1]; pts.push([q[0] + (b.x - q[0]) * 0.35 + (R() - 0.5) * 22, q[1] + 10 + R() * 14]); } pts.push([b.x, b.y]); add({ x: 0, y: 0, pts, life: 0.13, c: P[1], k: 'bo', w: 3, hold: 1 }); flash(P[0], 0.07, 0.4); burst(b.x, b.y, P, 5, 90, 'sp', 4, 0.25); }; for (let i = 0; i < n; i++) at(i * 120, one); at(n * 120, () => { ring(b.x, b.y, P[1], 4, 36, 0.25); if (o.pow >= 100) shake(200); }); return 260 + n * 120; },
    fall: (a, b, P, o) => { const k = KP[o.ty] === 'di' ? 'di' : 'rk'; for (let i = 0; i < 6; i++) at(i * 70, () => { const x = b.x + (R() - 0.5) * 44, y = b.y + 6 + R() * 8; add({ x, y: -12, vy: 520, life: (y + 12) / 520, s: 9 + R() * 6, c: P[1], k, r: R() * TAU, vr: 5, hold: 1 }); at((y + 12) / 520 * 1000, () => { burst(x, y, [P[0], P[2]], 5, 60, 'sq', 3, 0.3); shake(90); }); }); return 820; },
    quake: (a, b, P) => { shake(560); for (let i = 0; i < 8; i++) at(i * 60, () => { const x = b.x + (R() - 0.5) * 60; burst(x, b.y + 16, [P[0], P[1], P[2]], 4, 50, 'sq', 4, 0.4, 160); add({ x, y: b.y + 16, vy: -150 - R() * 60, ay: 520, life: 0.5, s: 6 + R() * 5, c: P[2], k: 'rk', r: R() * TAU, vr: 6 }); }); return 660; },
    wave: (a, b, P) => { const dir = b.x > a.x ? 1 : -1; for (let i = 0; i < 46; i++) at(i * 9, () => { const y0 = a.y + (b.y - a.y) * R(); add({ x: dir > 0 ? -8 : 264, y: y0 + (R() - 0.5) * 50, vx: dir * (330 + R() * 120), vy: (b.y - a.y) * 0.9 + (R() - 0.5) * 40, life: 0.75, s: 5 + R() * 6, c: P, k: R() < 0.3 ? 'bb' : 'dr' }); }); at(380, () => { ring(b.x, b.y, P[0], 6, 48, 0.3, 3); burst(b.x, b.y, P, 12, 90, 'dr', 5); }); return 760; },
    psy: (a, b, P, o) => { for (let i = 0; i < 3; i++) at(i * 130, () => { ring(b.x, b.y, P[i % 2], 46, 6, 0.34, 2); ring(b.x, b.y, P[1], 4, 40, 0.34, 1); }); for (let i = 0; i < 6; i++) add({ x: b.x, y: b.y, life: 0.6, s: 4, c: P, k: 'di', ph: i / 6 * TAU, up: p => { p.ph += 0.2; p.x = b.x + Math.cos(p.ph) * 22; p.y = b.y + Math.sin(p.ph) * 12; } }); if (o.wobble) o.wobble(600); return 660; },
    drain: (a, b, P) => { for (let i = 0; i < 10; i++) at(i * 45, () => fly(jit(b, 16), jit(a, 8), 340, { s: 5, c: [P[1], P[0], '#fff'], k: 'ci', arc: 14 * (R() - 0.2) })); at(460, () => ring(a.x, a.y, P[0], 30, 6, 0.25)); return 640; },
    sound: (a, b, P) => { const an = Math.atan2(b.y - a.y, b.x - a.x); for (let i = 0; i < 4; i++) at(i * 90, () => add({ x: a.x + Math.cos(an) * 14, y: a.y + Math.sin(an) * 14, vx: Math.cos(an) * 230, vy: Math.sin(an) * 230, s: 12, gs: 70, life: 0.5, c: P[i % 2], k: 'ri', w: 2, a0: an - 0.9, a1: an + 0.9 })); for (let i = 0; i < 3; i++) at(60 + i * 120, () => add({ x: a.x + (R() - 0.5) * 16, y: a.y - 12, vx: Math.cos(an) * 60, vy: -30, life: 0.6, s: 7, c: P[1], k: 'nt' })); return 620; },
    powder: (a, b, P) => { for (let i = 0; i < 30; i++) at(i * 14, () => add({ x: b.x + (R() - 0.5) * 48, y: b.y - 30 - R() * 14, vy: 40 + R() * 30, life: 0.75, s: 2 + R() * 2, c: P, k: 'sq', ph: R() * TAU, up: (p, dt) => { p.ph += dt * 8; p.x += Math.sin(p.ph) * 0.6; } })); return 780; },
    buff: (a, b, P) => { ring(a.x, a.y, P[0], 50, 8, 0.36, 2); for (let i = 0; i < 12; i++) at(i * 30, () => add({ x: a.x + (R() - 0.5) * 36, y: a.y + 16, vy: -90 - R() * 50, life: 0.5, s: 4 + R() * 3, c: [P[0], '#fff', P[1]], k: 'sp' })); return 540; },
    heal: (a, b, P) => { const G = ['#eaffd8', '#8be07a', '#3aa85a']; ring(a.x, a.y, G[1], 8, 44, 0.4, 2); for (let i = 0; i < 12; i++) at(i * 34, () => add({ x: a.x + (R() - 0.5) * 34, y: a.y + 12, vy: -70 - R() * 40, life: 0.6, s: 5, c: G, k: 'sp' })); return 600; },
    shield: (a, b, P) => { const x = a.x + (b.x > a.x ? 16 : -16), y = a.y - (b.y < a.y ? 8 : -8); add({ x, y, s: 10, gs: 150, life: 0.2, c: '#fff', k: 'hx' }); at(120, () => add({ x, y, s: 40, life: 0.42, c: P[0], k: 'hx' })); return 560; },
    weather: (a, b, P, o) => { const k = o.name; if (/Rain|Water Sport/.test(k)) for (let i = 0; i < 70; i++) at(i * 9, () => add({ x: R() * 300, y: -6, vx: -90, vy: 420, life: 0.5, c: '#bfe3ff', k: 'ln', len: 0.03 })); else if (/Sunny/.test(k)) { flash('#fff3b0', 0.5, 0.45); for (let i = 0; i < 9; i++) add({ x: 256, y: 0, vx: -260 - i * 14, vy: 120 + i * 30, life: 0.6, c: '#ffe680', k: 'ln', len: 0.5, w: 2 }); } else if (/Hail/.test(k)) for (let i = 0; i < 46; i++) at(i * 12, () => add({ x: R() * 280, y: -6, vx: -50, vy: 300, life: 0.7, s: 3 + R() * 2, c: '#f2fdff', k: 'sq' })); else if (/Sand|Mud/.test(k)) for (let i = 0; i < 70; i++) at(i * 8, () => add({ x: 262, y: R() * 192, vx: -480, vy: 40, life: 0.6, c: ['#ecd9a0', '#c9a45c'], k: 'ln', len: 0.04, w: 2 })); else { flash(P[1], 0.4, 0.3); ring(128, 96, P[0], 10, 260, 0.6, 3); } return 820; },
    boom: (a, b, P, o) => { const c = o.self ? a : b, E = ['#fff', '#fff2a6', '#ffa23a', '#e2481f', '#5a2a1a']; flash('#fff', 0.16, 0.8); shake(520); for (let i = 0; i < 3; i++) at(i * 90, () => { ring(c.x, c.y, i ? P[1] : '#fff', 8, 90 + i * 20, 0.4, 4); burst(c.x + (R() - 0.5) * 20, c.y + (R() - 0.5) * 16, E, 14, 130, 'ci', 9, 0.5, 0); }); return 760; },
    roll: (a, b, P, o) => { const s = 12 + 4 * (o.roll || 0), dir = b.x > a.x ? 1 : -1; fly({ x: a.x, y: a.y + 8 }, { x: b.x, y: b.y + 6 }, 380, { s, c: P[1], k: 'rk', vr: dir * 22, up: p => { if (R() < 0.5) add({ x: p.x, y: p.y + s / 2, vx: -dir * 30, vy: -20, life: 0.25, s: 3, c: P[0], k: 'sq' }); } }); at(380, () => { impact(b, P, (o.roll || 0) >= 2); shake(120 + 60 * (o.roll || 0)); burst(b.x, b.y, [P[1], P[2]], 6 + 2 * (o.roll || 0), 90, 'rk', 5, 0.4, 300); }); return 640; },
    seed: (a, b, P) => { for (let i = 0; i < 3; i++) at(i * 90, () => fly(a, jit(b, 18), 420, { s: 4, c: ['#8a5a2a', '#c9a45c'], k: 'ci', arc: 26 })); at(620, () => { for (let i = 0; i < 8; i++) add({ x: b.x + (R() - 0.5) * 30, y: b.y + 12, vy: -60 - R() * 50, life: 0.5, s: 7, c: P, k: 'lf', r: (R() - 0.5), vr: 3 }); }); return 1040; },
    wind: (a, b, P) => { for (let i = 0; i < 5; i++) at(i * 70, () => add({ x: b.x, y: b.y + 14 - i * 7, s: 44 - i * 6, life: 0.4, c: P[i % 2], k: 'ri', w: 2, a0: 0, a1: 2.2, up: (p, dt) => { p.a0 += dt * 16; p.a1 += dt * 16; } })); for (let i = 0; i < 14; i++) at(i * 30, () => add({ x: b.x - 40, y: b.y + (R() - 0.5) * 40, vx: 300, vy: -40, life: 0.3, c: P[0], k: 'ln', len: 0.06 })); return 660; },
    wisp: (a, b, P) => { const W = ['#e8f6ff', '#8fd0ff', '#5b7cf0']; for (let i = 0; i < 3; i++) at(i * 80, () => fly(a, jit(b, 10), 440, { s: 7, c: W, k: 'fl', ph: i * 2, up: (p, dt) => { p.ph += dt * 14; p.y += Math.sin(p.ph) * 1.2; } })); at(540, () => burst(b.x, b.y, W, 9, 50, 'fl', 5, 0.4, -40)); return 780; },
    hazard: (a, b, P) => { for (let i = 0; i < 7; i++) at(i * 50, () => { const x = b.x + (R() - 0.5) * 60, y = b.y + 14 + R() * 8; add({ x, y, s: 2, gs: 30, life: 0.5, c: P[1], k: 'fg', dir: -1 }); }); return 620; }
  };
  /* Hvilken bevegelse et angrep får. Først etter navnet, så etter klasse og type. */
  const BY = [
    [/Leech Seed|Worry Seed/, 'seed'], [/Rollout|Ice Ball/, 'roll'], [/Will-O-Wisp|Confuse Ray|Hex$/, 'wisp'], [/Spikes|Stealth Rock/, 'hazard'],
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
    [/Beam|Hydro Pump|Flash Cannon|Dragon Pulse|Tri Attack|Luster Purge|Techno Blast|Hyper Voice|Dark Pulse|Water Pulse|Aura Sphere/, 'beam'],
    [/Absorb|Drain|Leech Life|Dream Eater|Horn Leech|Pain Split/, 'drain'],
    [/Gust|Whirlwind|Twister|Hurricane|Silver Wind|Ominous Wind|Icy Wind|Tailwind|Defog|Leaf Tornado|Blizzard|Heat Wave/, 'wind'],
    [/Growl|Roar|Screech|Sing|Supersonic|Uproar|Snore|Bug Buzz|Chatter|Round|Echoed Voice|Metal Sound|Grass Whistle|Perish Song|Snarl|Howl|Heal Bell|Relic Song|Yawn/, 'sound'],
    [/Recover|Soft-Boiled|Roost|Synthesis|Moonlight|Morning Sun|^Rest$|Milk Drink|Slack Off|Aromatherapy|Wish|Refresh|Aqua Ring|Ingrain|Swallow|Heal Pulse|Heal Order/, 'heal'],
    [/Protect|Detect|Endure|Reflect|Light Screen|Safeguard|Barrier|Substitute|Lucky Chant|Magnet Rise|Iron Defense|Harden|Withdraw|Defense Curl|Acid Armor|Cosmic Power/, 'shield'],
    [/Shadow Ball|Energy Ball|Focus Blast|Electro Ball|Sludge Bomb|Mud Bomb|Zap Cannon|Weather Ball|Mist Ball|Seed Bomb|Octazooka|Gunk Shot|Magnet Bomb|Sludge Wave|Night Daze|Shadow Sneak/, 'ball']
  ];
  const CONTACT = new Set(['bite', 'punch', 'slash', 'strike']);
  function kindOf(m) {
    for (const [re, k] of BY) if (re.test(m[0]) && !(m[4] === 0 && CONTACT.has(k)) && !(m[4] > 0 && (k === 'heal' || k === 'shield'))) return k;
    if (m[4] === 1) return 'strike';
    if (m[4] === 2) return [9, 10, 11, 14, 3, 4, 5, 6, 2, 15, 17].includes(m[1]) ? 'stream' : m[1] === 12 ? 'bolt' : m[1] === 13 ? 'psy' : 'ball';
    return m[17] === 1 || (m[12].length && m[12][0][1] > 0) ? 'buff' : 'psy';
  }
  /* ---------- Det skjermen kaller ---------- */
  const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms) / F.speed));
  F.attach = c => { cv = c; g = c ? c.getContext('2d') : null; parts = []; jobs = []; if (g) g.imageSmoothingEnabled = false; };
  F.count = () => parts.length + jobs.length;
  F.kindOf = kindOf; F.contact = m => m[4] === 1 && CONTACT.has(kindOf(m));
  /* Spiller et angrep fra a til b. Gir et løfte som holder til animasjonen er ferdig. */
  F.move = (m, a, b, o = {}) => { if (!g) return wait(300); const k = kindOf(m), ms = PROG[k](a, b, PAL[m[1]] || PAL[0], Object.assign({ ty: m[1], pow: m[2] || 0, name: m[0] }, o)); return wait(ms); };
  F.hit = (b, ty, e, crit) => { if (!g) return; const P = PAL[ty] || PAL[0]; if (F.intensity >= 4 && e >= 1) burst(b.x, b.y, [P[0], '#fff'], F.intensity, 110, 'sp', 4, 0.35, 0); if (e > 1) { impact(b, P, true); flash('#fff', 0.1, 0.4); } else if (e < 1) burst(b.x, b.y, [P[2], '#888'], 4, 40, 'sq', 3, 0.3); else burst(b.x, b.y, P, 6, 70, 'sp', 4, 0.3); if (crit) ring(b.x, b.y, '#ffe14a', 6, 60, 0.3, 3); };
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
  F.heal = b => { if (g) PROG.heal(b, b, PAL[11]); };
  F.open = (b, c) => { if (!g) return; flash('#fff', 0.1, 0.35); ring(b.x, b.y, '#fff', 4, 54, 0.3, 3); burst(b.x, b.y, ['#fff', c || '#ffd9d0'], 12, 90, 'sp', 5, 0.35, 0); };
  F.weather = k => { if (g && k) PROG.weather({ x: 128, y: 96 }, { x: 128, y: 96 }, PAL[0], { name: { rain: 'Rain', sun: 'Sunny', sand: 'Sand', hail: 'Hail' }[k] }); };
  /* Inngangen til bossenes ess: lyssøyle, ringer og gnister i trenerens farge. De legendariske får lyn i tillegg. */
  F.ace = (b, ty, gold) => {
    if (!g) return wait(900);
    const P = gold ? ['#fff7cf', '#ffd45a', '#c98a12'] : PAL[ty] || PAL[0];
    add({ k: 'fs', c: '#000', life: 1.25, a: 0.55, x: 0, y: 0 });
    at(150, () => { add({ x: b.x, y: b.y + 18, s: 4, gs: 110, life: 0.9, c: [P[0], P[1]], k: 'pl', a: 0.75 }); add({ x: b.x, y: b.y + 18, s: 2, gs: 36, life: 0.9, c: '#fff', k: 'pl' }); shake(700); });
    for (let i = 0; i < 4; i++) at(250 + i * 150, () => { ring(b.x, b.y + 14, P[i % 2], 8, 120, 0.5, 3); for (let j = 0; j < 8; j++) add({ x: b.x + (R() - 0.5) * 50, y: b.y + 18, vy: -160 - R() * 120, life: 0.6, s: 5, c: [P[0], '#fff', P[1]], k: 'sp' }); });
    if (gold) for (let i = 0; i < 4; i++) at(300 + i * 140, () => PROG.bolt(b, { x: b.x + (R() - 0.5) * 70, y: b.y + 16 }, P, { pow: 0 }));
    at(900, () => { flash('#fff', 0.2, 0.7); ring(b.x, b.y, '#fff', 10, 200, 0.45, 4); });
    return wait(1250);
  };
  /* Bakgrunnsshowet: jo høyere klasse motstanderen har, jo mer skjer bak Pokémonene. Det tegnes på et eget lerret bak spritene (256 × 192), rundt 30 ganger i sekundet.
     Nivå 1: lysbånd · 2: svevende gnister · 4: puls bak motstanderen · 6: fartsstriper og mørke kanter som puster · 7: lyn · 8: nordlys. gold = gullpalett (de aller største). */
  let showId = 0;
  F.intensity = 0;
  F.show = (c, lvl, ty, gold) => {
    cancelAnimationFrame(showId); showId = 0; F.intensity = lvl || 0;
    if (!c || !lvl) return;
    const x = c.getContext('2d'), P = gold ? ['#fff7cf', '#ffd45a', '#c98a12'] : PAL[ty] || PAL[0];
    const motes = Array.from({ length: lvl >= 2 ? Math.min(46, 6 + lvl * 5) : 0 }, () => ({ x: R() * 256, y: R() * 192, v: (6 + R() * 14) * (1 + lvl / 4), s: R() < 0.3 ? 2 : 1, p: R() * TAU }));
    const lines = Array.from({ length: lvl >= 6 ? 6 + (lvl - 6) * 4 : 0 }, () => ({ x: R() * 256, y: R() < 0.5 ? R() * 34 : 158 + R() * 34, v: 160 + R() * 220, w: 14 + R() * 30 }));
    let t0 = 0, bolt = null, nextBolt = 1.2;
    const step = ts => {
      if (!c.isConnected) { showId = 0; return; }
      showId = requestAnimationFrame(step);
      if (ts - t0 < 32) return;
      const dt = Math.min(0.1, (ts - t0) / 1000), T = ts / 1000; t0 = ts;
      x.clearRect(0, 0, 256, 192); x.globalCompositeOperation = 'lighter';
      const bands = 2 + Math.floor(lvl / 3);
      for (let i = 0; i < bands; i++) { const bx = ((T * (10 + lvl * 3) + i * 320 / bands) % 320) - 32; x.globalAlpha = 0.04 + 0.007 * lvl; x.fillStyle = P[i % 2]; x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx + 12, 0); x.lineTo(bx - 36, 192); x.lineTo(bx - 48, 192); x.fill(); }
      if (lvl >= 4) { const k = 0.5 + 0.5 * Math.sin(T * (2 + lvl * 0.35)), r = 34 + lvl * 3 + k * 10, gr = x.createRadialGradient(189, 74, 4, 189, 74, r); gr.addColorStop(0, P[1]); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 0.14 + 0.03 * lvl + 0.1 * k; x.fillStyle = gr; x.fillRect(189 - r, 74 - r, r * 2, r * 2); }
      if (lvl >= 8) for (let j = 0; j < 3; j++) { x.globalAlpha = 0.1; x.fillStyle = [P[0], P[1], '#fff'][j]; x.beginPath(); x.moveTo(0, 0); for (let i = 0; i <= 256; i += 16) x.lineTo(i, 24 + j * 9 + Math.sin(i / 40 + T * (0.8 + j * 0.3) + j) * 10); x.lineTo(256, 0); x.fill(); }
      x.globalAlpha = 0.35; x.fillStyle = P[0];
      for (const l of lines) { l.x -= l.v * dt; if (l.x < -l.w) { l.x = 256 + R() * 60; l.y = R() < 0.5 ? R() * 34 : 158 + R() * 34; } x.fillRect(px(l.x), px(l.y), px(l.w), 1); }
      for (const m of motes) { m.y -= m.v * dt; m.x += Math.sin(T * 1.3 + m.p) * 6 * dt; if (m.y < -2) { m.y = 194; m.x = R() * 256; } x.globalAlpha = 0.35 + 0.3 * Math.sin(T * 3 + m.p); x.fillStyle = m.s > 1 ? P[0] : P[1]; x.fillRect(px(m.x), px(m.y), m.s, m.s); }
      if (lvl >= 7) {
        nextBolt -= dt;
        if (nextBolt <= 0) { nextBolt = (lvl >= 8 ? 1.1 : 2.2) + R() * 2; let bx = 20 + R() * 216, by = 0; const pts = [[bx, by]], end = 60 + R() * 60; while (by < end) { bx += (R() - 0.5) * 26; by += 8 + R() * 12; pts.push([bx, by]); } bolt = { pts, t: 0.22 }; }
        if (bolt) { bolt.t -= dt; x.globalAlpha = Math.max(0, bolt.t / 0.22) * 0.8; x.strokeStyle = P[0]; x.lineWidth = 2; x.beginPath(); bolt.pts.forEach((q, i) => i ? x.lineTo(px(q[0]), px(q[1])) : x.moveTo(px(q[0]), px(q[1]))); x.stroke(); x.strokeStyle = '#fff'; x.lineWidth = 1; x.stroke(); if (bolt.t <= 0) bolt = null; }
      }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      if (lvl >= 6) { const k = 0.5 + 0.5 * Math.sin(T * 1.7), gr = x.createRadialGradient(128, 100, 60, 128, 100, 170); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${(0.28 + 0.12 * k).toFixed(2)})`); x.fillStyle = gr; x.fillRect(0, 0, 256, 192); }
    };
    showId = requestAnimationFrame(step);
  };
  return F;
})();
