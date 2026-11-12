'use strict';
/* Fokusdex – filmene når en legendarisk Pokémon viser seg, og lufta rundt den i kampen etterpå.
   Hver film er en funksjon av tiden (sekunder fra låta starter): bildet tegnes helt på nytt for hvert tidspunkt, uten egen tilstand, så filmen kan spoles,
   hoppes over og holdes i takt med musikken. Bildet tegnes på et lerret på 512 × 384 og går så gjennom «kameraet» (risting, zoom, blink, forstyrrelser,
   fargesplitt, svarte bånd). Kunsten (bakgrunner, lys, røyk, silhuetter) kommer fra ressurspakken når den finnes. Alt har en kodetegnet reserve, så filmene
   virker også uten pakke. Selve Pokémonen tegnes fra samme bilde som ellers i appen.
   Aldri mer enn tre store blink i sekundet, og med «redusert bevegelse» på enheten vises bare et stillbilde. */
const CINE = (() => {
  const W = 512, H = 384, TAU = Math.PI * 2, C = { W, H }, sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs, max = Math.max, min = Math.min, floor = Math.floor;
  const c01 = x => x < 0 ? 0 : x > 1 ? 1 : x, mix = (a, b, k) => a + (b - a) * k;
  /* seg: 0 → 1 mellom a og b. hit: 1 → 0 over d sekunder etter t0 (et slag). pulse: 0 → 1 → 0 mellom a og b. */
  const seg = (t, a, b) => c01((t - a) / (b - a)), hit = (t, t0, d) => t < t0 ? 0 : max(0, 1 - (t - t0) / (d || 0.4)), pulse = (t, a, b) => t < a || t > b ? 0 : sin((t - a) / (b - a) * PI);
  const io = k => k * k * (3 - 2 * k), eo = k => 1 - (1 - k) * (1 - k) * (1 - k), ei = k => k * k * k, back = k => { k -= 1; return k * k * (2.70158 * k + 1.70158) + 1; };
  const rnd = (i, s) => { const x = sin(i * 127.1 + (s || 0) * 311.7 + 0.5) * 43758.5453; return x - floor(x); };
  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgba = (h, a) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const blend = (h1, h2, k) => { const a = hex(h1), b = hex(h2); return '#' + [0, 1, 2].map(i => Math.round(mix(a[i], b[i], c01(k))).toString(16).padStart(2, '0')).join(''); };

  /* ---------- Kunsten fra pakken ----------
     C.source settes av pakkelasteren og gir { idx: navn → [bredde, høyde, start, lengde], blob } eller null. Bildene pakkes ut når en film trenger dem. */
  const art = new Map(); let artIdx = null, artBlob = null, artJob = null;
  C.source = null;
  const loadIdx = () => artJob || (artJob = Promise.resolve(C.source ? C.source() : null).then(r => { if (r && r.idx && r.blob) { artIdx = r.idx; artBlob = r.blob; } else artJob = null; }).catch(() => { artJob = null; }));
  async function need(names) {
    await loadIdx(); if (!artIdx) return;
    await Promise.all(names.filter(n => !art.has(n) && artIdx[n]).map(async n => {
      const e = artIdx[n], b = artBlob.slice(e[2], e[2] + e[3], 'image/webp');
      try { if (typeof createImageBitmap === 'function') { art.set(n, await createImageBitmap(b)); return; } } catch (_) {}
      const u = URL.createObjectURL(b), i = new Image(); i.src = u; try { await i.decode(); art.set(n, i); } catch (_) {} URL.revokeObjectURL(u);
    }));
  }
  /* ---------- Pokémonen ----------
     Bildet hentes med lov til å lese pikslene (da kan det beskjæres til selve figuren). Går ikke det, brukes hele ruta. */
  const sprs = new Map();
  C.spriteUrl = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  /* Den mørke varianten (Dark Mewtwo): lilla blir oransje og resten blir nesten svart. d = pikslene (RGBA), endres på stedet. */
  C.darken = d => {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue; const r = d[i], g2 = d[i + 1], b = d[i + 2], mx = max(r, g2, b), mn = min(r, g2, b), v = mx / 255, sat = mx ? (mx - mn) / mx : 0;
      let h = 0; if (mx !== mn) { h = mx === r ? ((g2 - b) / (mx - mn)) % 6 : mx === g2 ? (b - r) / (mx - mn) + 2 : (r - g2) / (mx - mn) + 4; h *= 60; if (h < 0) h += 360; }
      if (sat > 0.25 && v > 0.3 && h >= 250 && h <= 335) { const v2 = min(1, v * 1.25 + 0.14), s2 = min(1, sat * 1.5 + 0.3); d[i] = 255 * v2; d[i + 1] = 255 * v2 * (1 - s2 * 0.62); d[i + 2] = 255 * v2 * (1 - s2 * 0.94); }
      else { const v2 = max(0.03, v * 0.34); d[i] = 255 * v2 * 0.94; d[i + 1] = 255 * v2 * 0.86; d[i + 2] = 255 * v2 * 1.04; }
    }
  };
  /* id = artens nummer, eller 'dk' + nummeret for den mørke varianten. */
  function loadSprite(id) {
    if (sprs.has(id)) return sprs.get(id);
    const dk = typeof id === 'string' && id.indexOf('dk') === 0, base = dk ? +id.slice(2) : id;
    const j = new Promise(res => {
      const done = (i, clean) => {
        const cv = document.createElement('canvas'), x = cv.getContext('2d'); let bx = 0, by = 0, bw = i.naturalWidth || 96, bh = i.naturalHeight || 96;
        cv.width = bw; cv.height = bh; x.drawImage(i, 0, 0);
        if (clean) try {
          const d = x.getImageData(0, 0, bw, bh).data; let x0 = bw, y0 = bh, x1 = -1, y1 = -1;
          for (let y = 0; y < bh; y++) for (let xx = 0; xx < bw; xx++) if (d[(y * bw + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          if (x1 >= x0) { bx = x0; by = y0; bw = x1 - x0 + 1; bh = y1 - y0 + 1; }
        } catch (_) { clean = false; }
        if (dk) { let done2 = false; if (clean) try { const im2 = x.getImageData(0, 0, cv.width, cv.height); C.darken(im2.data); x.putImageData(im2, 0, 0); done2 = true; } catch (_) {} if (!done2) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(8,5,14,.74)'; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'source-over'; } }
        res({ cv, bx, by, bw, bh, clean, tint: new Map() });
      };
      const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => done(i, true);
      i.onerror = () => { const i2 = new Image(); i2.onload = () => done(i2, false); i2.onerror = () => res(null); i2.src = C.spriteUrl(base); };
      const u = C.spriteUrl(base); i.src = u + (u.indexOf('githubusercontent') > 0 ? '?c=1' : '');
    });
    sprs.set(id, j); return j;
  }
  /* Figuren i én farge (silhuett). */
  function tinted(sp, col) {
    let t = sp.tint.get(col); if (t) return t;
    t = document.createElement('canvas'); t.width = sp.cv.width; t.height = sp.cv.height; const x = t.getContext('2d');
    x.drawImage(sp.cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, t.width, t.height);
    if (sp.tint.size > 24) sp.tint.clear(); sp.tint.set(col, t); return t;
  }

  /* ---------- Tegneverktøy ---------- g = lerretet det tegnes på nå, T = tiden i filmen, P = kameraet for dette bildet, cur = filmen som spilles. */
  let g = null, T = 0, P = null, cur = null, frameNo = 0;
  const fill = (col, a) => { g.globalAlpha = a == null ? 1 : c01(a); g.fillStyle = col; g.fillRect(0, 0, W, H); g.globalAlpha = 1; };
  /* Loddrett fargeovergang over hele bildet. stops = farger (jevnt fordelt) eller [plass, farge]. */
  const lin = (stops, a, y0, y1) => { const gr = g.createLinearGradient(0, y0 || 0, 0, y1 == null ? H : y1); stops.forEach((s, i) => gr.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s)); g.globalAlpha = a == null ? 1 : c01(a); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = 1; };
  /* Mykt lys: en sirkel som toner ut. add = legges oppå som lys. */
  const glow = (x, y, r, col, a, add) => { if (r <= 0 || a <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(0.5, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0)); g.save(); g.globalAlpha = c01(a == null ? 1 : a); if (add) g.globalCompositeOperation = add === 1 ? 'lighter' : add; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); };
  /* Et bilde fra pakken, sentrert i (x, y). o = { s, sx, sy, r, a, add, flip, ax, ay, px }. Gir false hvis bildet ikke finnes (da tegner filmen reserven). */
  const im = (n, x, y, o) => {
    const i = art.get(n); if (!i) return false; o = o || {};
    const a = o.a == null ? 1 : c01(o.a); if (a < 0.004) return true;
    const w = i.width * (o.s || 1) * (o.sx || 1), h = i.height * (o.s || 1) * (o.sy || 1);
    g.save(); g.globalAlpha = a; if (o.add) g.globalCompositeOperation = o.add === 1 ? 'lighter' : o.add; g.imageSmoothingEnabled = !o.px;
    g.translate(x, y); if (o.r) g.rotate(o.r); if (o.flip) g.scale(-1, 1);
    g.drawImage(i, -w * (o.ax == null ? 0.5 : o.ax), -h * (o.ay == null ? 0.5 : o.ay), w, h); g.restore(); return true;
  };
  const has = n => art.has(n);
  /* Et bilde fra pakken i én farge (silhuett). Gir navnet det kan tegnes med, eller '' hvis bildet ikke finnes. */
  const tintArt = (n, col) => { const k = n + '|' + col; if (art.has(k)) return k; const i = art.get(n); if (!i) return ''; const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); art.set(k, c); return k; };
  /* Et bilde fra pakken farget gjennom en farge (lyse deler får fargen, svart blir svart). */
  const mulArt = (n, col) => { const k = n + '*' + col; if (art.has(k)) return k; const i = art.get(n); if (!i) return ''; const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(i, 0, 0); art.set(k, c); return k; };
  /* Et bilde som dekker hele lerretet (stedsbildene), med zoom og panorering. z = 1 dekker akkurat. px, py = −1..1. */
  const cover = (n, o) => { const i = art.get(n); if (!i) return false; o = o || {}; const s = max(W / i.width, H / i.height) * (o.z || 1), mx = (i.width * s - W) / 2, my = (i.height * s - H) / 2; return im(n, W / 2 - (o.px || 0) * mx, H / 2 - (o.py || 0) * my, { s, a: o.a, add: o.add, px: 1 }); };
  /* Et bånd som gjentas bortover (tåke), forskjøvet ox piksler. */
  const strip = (n, y, ox, o) => { const i = art.get(n); if (!i) return false; o = o || {}; const s = o.s || 1, w = i.width * s, h = i.height * s * (o.sy || 1); let x = -(((ox % w) + w) % w); g.save(); g.globalAlpha = c01(o.a == null ? 1 : o.a); if (o.add) g.globalCompositeOperation = o.add === 1 ? 'lighter' : o.add; for (; x < W; x += w) g.drawImage(i, x, y, w + 1, h); g.restore(); return true; };
  /* Pokémonen. o = { id (en annen form), col (silhuett i den fargen), a, add, r, flip, ay }. s = forstørrelse (3 = stor). */
  const spr = (x, y, s, o) => {
    o = o || {}; const sp = o.id ? cur.sps[o.id] : cur.sp; if (!sp) return; const a = o.a == null ? 1 : c01(o.a); if (a < 0.004) return;
    const src = o.col ? tinted(sp, o.col) : sp.cv, w = sp.bw * s, h = sp.bh * s;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = a; if (o.add) g.globalCompositeOperation = o.add === 1 ? 'lighter' : o.add;
    g.translate(Math.round(x), Math.round(y)); if (o.r) g.rotate(o.r); if (o.flip) g.scale(-1, 1); if (o.sy) g.scale(1, o.sy);
    g.drawImage(src, sp.bx, sp.by, sp.bw, sp.bh, -w / 2, -h * (o.ay == null ? 0.5 : o.ay), w, h); g.restore();
  };
  /* Omriss som gløder rundt figuren: silhuetten i fargen, stemplet i en ring rundt. */
  const aura = (x, y, s, col, r, a, o) => { for (let i = 0; i < 8; i++) spr(x + cos(i * PI / 4) * r, y + sin(i * PI / 4) * r, s, Object.assign({}, o, { col, a: a == null ? 0.5 : a, add: 1 })); };
  const sprH = s => cur.sp ? cur.sp.bh * s : 80 * s;
  /* Lyn fra (x0, y0) til (x1, y1): en knekket linje med glød. o = { seed, w, col, jag, depth, br (greiner), a }. Samme seed gir samme lyn. */
  const boltPts = (x0, y0, x1, y1, seed, jag, depth) => { const p = [[x0, y0], [x1, y1]]; for (let d = 0; d < depth; d++) for (let i = p.length - 1; i > 0; i--) { const a = p[i - 1], b = p[i], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, k = (rnd(i * 7 + d * 97, seed) - 0.5) * jag * len; p.splice(i, 0, [(a[0] + b[0]) / 2 - dy / len * k, (a[1] + b[1]) / 2 + dx / len * k]); } return p; };
  const bolt = (x0, y0, x1, y1, o) => {
    o = o || {}; const seed = o.seed || 0, w = o.w || 2, a = o.a == null ? 1 : c01(o.a); if (a <= 0.01) return;
    const p = boltPts(x0, y0, x1, y1, seed, o.jag == null ? 0.26 : o.jag, o.depth || 5), path = () => { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); };
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.strokeStyle = o.col || '#9fd0ff'; g.globalAlpha = a * 0.28; g.lineWidth = w * 5; g.stroke(); g.globalAlpha = a * 0.6; g.lineWidth = w * 2.2; g.stroke(); g.strokeStyle = o.core || '#fff'; g.globalAlpha = a; g.lineWidth = w; g.stroke(); g.restore();
    for (let b = 0; b < (o.br || 0); b++) { const q = p[1 + floor(rnd(b, seed + 5) * (p.length - 2))], an = Math.atan2(y1 - y0, x1 - x0) + (rnd(b, seed + 6) - 0.5) * 1.6, L = Math.hypot(x1 - x0, y1 - y0) * (0.18 + rnd(b, seed + 7) * 0.3); bolt(q[0], q[1], q[0] + cos(an) * L, q[1] + sin(an) * L, { seed: seed + 11 + b, w: w * 0.6, col: o.col, core: o.core, jag: o.jag, depth: 4, a: a * 0.8 }); }
  };
  /* Stråler ut fra et punkt (sol, dom). o = { n, rot, r0, r1, col, a, wid (andel av sektoren), add }. */
  const rays = (x, y, o) => {
    const n = o.n || 12, wid = o.wid == null ? 0.5 : o.wid, r0 = o.r0 || 0, r1 = o.r1 || 420, gr = g.createRadialGradient(x, y, r0, x, y, r1); gr.addColorStop(0, o.col); gr.addColorStop(1, rgba(o.col, 0));
    g.save(); g.globalAlpha = c01(o.a == null ? 1 : o.a); if (o.add !== 0) g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath();
    for (let i = 0; i < n; i++) { const a0 = (o.rot || 0) + i / n * TAU, a1 = a0 + TAU / n * wid; g.moveTo(x + cos(a0) * r0, y + sin(a0) * r0); g.lineTo(x + cos(a0) * r1, y + sin(a0) * r1); g.lineTo(x + cos(a1) * r1, y + sin(a1) * r1); g.lineTo(x + cos(a1) * r0, y + sin(a1) * r0); }
    g.fill(); g.restore();
  };
  const ring = (x, y, r, o) => { o = o || {}; const a = o.a == null ? 1 : c01(o.a); if (r <= 0 || a <= 0.004) return; g.save(); g.globalAlpha = a; if (o.add !== 0) g.globalCompositeOperation = 'lighter'; g.strokeStyle = o.col || '#fff'; g.lineWidth = o.w || 3; g.beginPath(); g.ellipse(x, y, r, r * (o.sy || 1), 0, 0, TAU); g.stroke(); g.restore(); };
  /* En sjokkbølge som starter i t0: en ring som vokser og toner ut. */
  const wave = (t0, x, y, o) => { o = o || {}; const k = seg(T, t0, t0 + (o.d || 0.9)); if (k <= 0 || k >= 1) return; ring(x, y, eo(k) * (o.r || 420), { col: o.col, w: (o.w || 10) * (1 - k) + 1, a: (1 - k) * (o.a || 0.9), sy: o.sy }); };
  const poly = (pts, col, a, add) => { g.save(); g.globalAlpha = c01(a == null ? 1 : a); if (add) g.globalCompositeOperation = 'lighter'; g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); g.restore(); };
  const rect = (x, y, w, h, col, a, add) => { g.save(); g.globalAlpha = c01(a == null ? 1 : a); if (add) g.globalCompositeOperation = 'lighter'; g.fillStyle = col; g.fillRect(x, y, w, h); g.restore(); };
  /* En loddrett lysstråle med myke kanter, fra y0 til y1. */
  const beam = (x, w, y0, y1, col, a, core) => { if (a <= 0.004 || w <= 0) return; const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.35, rgba(col, 0.55)); gr.addColorStop(0.5, core || '#fff'); gr.addColorStop(0.65, rgba(col, 0.55)); gr.addColorStop(1, rgba(col, 0)); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = c01(a); g.fillStyle = gr; g.fillRect(x - w, y0, w * 2, y1 - y0); g.restore(); };
  /* Stjerner. o = { n, seed, a, col, warp (0..1: de strekker seg ut fra midten som i fart), cx, cy, spd }. */
  const stars = o => {
    const n = o.n || 80, seed = o.seed || 1, cx = o.cx == null ? W / 2 : o.cx, cy = o.cy == null ? H / 2 : o.cy, wp = o.warp || 0; g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = rnd(i, seed), b = rnd(i, seed + 1), c = rnd(i, seed + 2), col = o.cols ? o.cols[i % o.cols.length] : o.col || '#fff';
      if (wp > 0) { const an = a * TAU, ph = (b + T * (o.spd || 0.5) * (0.4 + c)) % 1, r = ph * ph * 340, len = 2 + wp * 60 * ph; g.globalAlpha = c01((o.a == null ? 1 : o.a) * min(1, ph * 3)); g.strokeStyle = col; g.lineWidth = 1 + c * wp * 2; g.beginPath(); g.moveTo(cx + cos(an) * r, cy + sin(an) * r); g.lineTo(cx + cos(an) * (r + len), cy + sin(an) * (r + len)); g.stroke(); }
      else { const tw = 0.55 + 0.45 * sin(T * (1 + c * 3) + a * 40), s = c > 0.85 ? 3 : c > 0.5 ? 2 : 1; g.globalAlpha = c01((o.a == null ? 1 : o.a) * tw); g.fillStyle = col; g.fillRect(floor(a * W), floor(b * H), s, s); if (s === 3 && tw > 0.8) { g.fillRect(floor(a * W) - 2, floor(b * H) + 1, 7, 1); g.fillRect(floor(a * W) + 1, floor(b * H) - 2, 1, 7); } }
    }
    g.restore();
  };
  /* Det som svever i lufta. kind: 'ember' (glør som stiger), 'snow', 'rain', 'bubble', 'mote' (lysprikker som blinker), 'leaf' (blader som driver), 'ash', 'spark' (kryss som blinker), 'up' (lysstriper oppover).
     o = { n, seed, cols, a, spd, y0, y1 (området), wind, size }. */
  const dust = (kind, o) => {
    o = o || {}; const n = o.n || 40, seed = o.seed || 3, A = o.a == null ? 1 : o.a, cols = o.cols || ['#fff'], spd = o.spd || 1, y0 = o.y0 || 0, y1 = o.y1 == null ? H : o.y1, hh = y1 - y0, wind = o.wind || 0;
    if (A <= 0.004) return; g.save(); if (kind !== 'ash' && kind !== 'leaf' && kind !== 'snow' && kind !== 'rain') g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = rnd(i, seed), b = rnd(i, seed + 1), c = rnd(i, seed + 2), d = rnd(i, seed + 3), col = cols[i % cols.length]; g.fillStyle = col; g.strokeStyle = col;
      if (kind === 'ember' || kind === 'bubble' || kind === 'up') {
        const ph = (b + T * spd * (0.12 + c * 0.2)) % 1, x = (((a * W + sin(T * (1 + d * 2) + a * 30) * (kind === 'up' ? 2 : 12) + wind * ph * 200) % W) + W) % W, y = y1 - ph * hh, k = sin(ph * PI);
        g.globalAlpha = c01(A * k);
        if (kind === 'bubble') { g.lineWidth = 1; g.beginPath(); g.arc(x, y, 2 + d * 4, 0, TAU); g.stroke(); g.fillRect(x - 1, y - 2 - d * 2, 1, 1); }
        else if (kind === 'up') g.fillRect(floor(x), floor(y), 1 + (d > 0.7), 6 + d * 22);
        else { const s = (o.size || 1) * (d > 0.75 ? 3 : 2); g.fillRect(floor(x), floor(y), s, s); }
      } else if (kind === 'snow' || kind === 'ash') {
        const ph = (b + T * spd * (0.06 + c * 0.1)) % 1, x = (((a * W + sin(T * (0.6 + d) + a * 20) * 18 + wind * T * 60 * (0.5 + c)) % W) + W) % W; g.globalAlpha = c01(A * (0.5 + 0.5 * d)); const s = (o.size || 1) * (d > 0.7 ? 3 : 2); g.fillRect(floor(x), floor(y0 + ph * hh), s, s);
      } else if (kind === 'rain') {
        const ph = (b + T * spd * (1.2 + c * 0.9)) % 1, x = (((a * (W + 160) - 80 + wind * ph * 140) % (W + 160)) + W + 160) % (W + 160) - 80, y = y0 + ph * hh, L = 14 + d * 22; g.globalAlpha = c01(A * (0.35 + 0.5 * d)); g.lineWidth = 1 + (d > 0.8); g.beginPath(); g.moveTo(x, y); g.lineTo(x + wind * L * 0.45, y + L); g.stroke();
      } else if (kind === 'mote') {
        const x = a * W + sin(T * 0.3 * spd + c * 30) * 16, y = y0 + b * hh + cos(T * 0.25 * spd + d * 30) * 12, k = 0.5 + 0.5 * sin(T * (1 + c * 2.5) * spd + d * 40); g.globalAlpha = c01(A * k * k); const s = d > 0.8 ? 3 : 2; g.fillRect(floor(x), floor(y), s, s);
      } else if (kind === 'spark') {
        const k = sin(T * (2 + c * 4) * spd + d * 50); if (k > 0.55) { const x = floor(a * W), y = floor(y0 + b * hh), s = (o.size || 1) * (2 + floor(d * 3)); g.globalAlpha = c01(A * (k - 0.55) * 2.2); g.fillRect(x - s, y, s * 2 + 1, 1); g.fillRect(x, y - s, 1, s * 2 + 1); }
      } else if (kind === 'leaf') {
        const ph = (b + T * spd * (0.07 + c * 0.08)) % 1, x = ((a * (W + 80) - 40 + ph * 150 * (wind || 1) + sin(T * 1.5 + d * 20) * 16) % (W + 80) + W + 80) % (W + 80) - 40, y = y0 + ph * hh + sin(T * 2 + a * 20) * 8, r = T * (1 + d * 2) + a * 9, s = (o.size || 1) * (4 + d * 5);
        g.globalAlpha = c01(A * min(1, sin(ph * PI) * 3)); g.save(); g.translate(x, y); g.rotate(r); g.scale(1, 0.45 + 0.4 * sin(T * 3 + d * 9)); g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.8, s, 0); g.quadraticCurveTo(0, s * 0.8, -s, 0); g.fill(); g.restore();
      }
    }
    g.restore();
  };
  /* Tåke og røyk: store myke skyer som driver. Bruker bildet når det finnes. */
  const fog = (n, o) => { o = o || {}; const A = o.a == null ? 1 : o.a; if (A <= 0.004) return; for (let i = 0; i < (o.n || 6); i++) { const a = rnd(i, o.seed || 9), b = rnd(i, (o.seed || 9) + 1), c = rnd(i, (o.seed || 9) + 2), x = ((a * (W + 300) + T * (o.spd || 14) * (0.4 + c)) % (W + 300)) - 150, y = (o.y0 || 0) + b * ((o.y1 == null ? H : o.y1) - (o.y0 || 0)), s = (o.s || 1.6) * (0.7 + c * 0.8); if (!im(n, x, y, { s, a: A * (0.4 + 0.6 * c), r: a * 6 + T * 0.03 * (c - 0.5), add: o.add })) glow(x, y, 90 * s, o.col || '#20202a', A * 0.5 * (0.4 + 0.6 * c), o.add); } };
  /* Tekst i DS-skriften (når den er lastet), ellers en fast systemskrift. o = { size, col, al ('l','c','r'), sh (skyggefarge, 0 = ingen), sd, ls (bokstavavstand), a }. */
  const fontN = () => { try { if (document.fonts && document.fonts.check('20px FdxDS')) return ['FdxDS', '']; } catch (_) {} return ['ui-monospace,Menlo,Consolas,monospace', 'bold ']; };
  const txt = (s, x, y, o) => {
    o = o || {}; const f = fontN(), size = (o.size || 26) * (f[1] ? 0.74 : 1), ls = o.ls || 0, A = o.a == null ? 1 : c01(o.a); if (A <= 0.004) return 0;
    g.save(); g.font = `${f[1]}${size}px ${f[0]}`; g.textBaseline = 'alphabetic'; const ch = [...s], ws = ch.map(q => g.measureText(q).width), w = ws.reduce((p, q) => p + q, 0) + ls * (ch.length - 1), x0 = o.al === 'l' ? x : o.al === 'r' ? x - w : x - w / 2;
    const put = (dx, dy, col, a) => { g.globalAlpha = A * a; g.fillStyle = col; if (!ls) g.fillText(s, x0 + dx, y + dy); else { let xx = x0 + dx; ch.forEach((q, i) => { g.fillText(q, xx, y + dy); xx += ws[i] + ls; }); } };
    if (o.sh !== 0) put(o.sd || 2, o.sd || 2, o.sh || '#000', 0.9); put(0, 0, o.col || '#fff', 1); g.restore(); return w;
  };
  /* Mørke kanter rundt bildet. */
  const vig = (a, col) => { if (a <= 0.004) return; const gr = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 330); gr.addColorStop(0, rgba(col || '#000', 0)); gr.addColorStop(1, col || '#000'); g.save(); g.globalAlpha = c01(a); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); };
  /* Navnet: et svart penselstrøk feier inn nederst, og navnet slår ned i det. Starter i t0. o = { col, y, cap, dark }. */
  const card = (t0, o) => {
    const k = seg(T, t0, t0 + 0.3); if (k <= 0) return; o = o || {};
    const y = o.y || 316, col = o.col || cur.cc, e = eo(k), slam = seg(T, t0 + 0.12, t0 + 0.34), z = mix(2.4, 1, eo(slam));
    if (!im('paint', 256 - (1 - e) * 620, y - 18, { s: 1.16, sy: 0.92, a: 0.94 * e })) poly([[-20 - (1 - e) * 600, y - 62], [540 - (1 - e) * 600, y - 54], [530 - (1 - e) * 600, y + 26], [-20 - (1 - e) * 600, y + 20]], '#000', 0.88 * e);
    rect(0, y - 63, W * e, 2, col, 0.9 * e);
    txt((o.cap || cur.cap || '').toUpperCase(), 256, y - 38, { size: 18, ls: 5, col, a: seg(T, t0 + 0.1, t0 + 0.4) });
    if (slam > 0) { g.save(); g.translate(256, y); g.scale(z, z); txt((cur.name || '').toUpperCase(), 0, 0, { size: 52, ls: 3, col: '#fff', sh: col, sd: 3, a: slam }); g.restore(); }
    if (cur.lv) txt('Lv ' + cur.lv, 256, y + 26, { size: 20, ls: 2, col: '#fff', a: seg(T, t0 + 0.3, t0 + 0.55) });
    if (slam > 0 && slam < 1) rect(0, y - 44, W, 52, '#fff', (1 - slam) * 0.5, 1);
  };
  /* Bildet deles i skår som flyr utover fra (cx, cy) og avslører det som er tegnet under. old = lerretet med bildet som knuses, k = 0..1. */
  const shatter = (old, k, cx, cy, seed) => {
    if (k >= 1) return; if (k <= 0) { g.drawImage(old, 0, 0); return; }
    const N = 13, M = 3, e = eo(k);
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a0 = (i + rnd(i, seed) * 0.5) / N * TAU, a1 = (i + 1 + rnd(i + 1 === N ? 0 : i + 1, seed) * 0.5) / N * TAU + (i + 1 === N ? TAU : 0), r0 = j === 0 ? 0 : (60 + 90 * (j - 1)) * (0.8 + rnd(i * 9 + j, seed + 1) * 0.5), r1 = j === M - 1 ? 700 : (60 + 90 * j) * (0.8 + rnd(i * 9 + j + 1, seed + 1) * 0.5);
      const am = (a0 + a1) / 2, rm = (r0 + min(r1, 420)) / 2, mx = cx + cos(am) * rm, my = cy + sin(am) * rm, d = e * (140 + rm * 1.3) * (0.6 + rnd(i * 5 + j, seed + 2)), rot = (rnd(i * 3 + j, seed + 3) - 0.5) * 2.4 * e, sc = 1 - e * 0.35;
      g.save(); g.globalAlpha = c01(1.25 - k * 1.25); g.translate(mx + cos(am) * d, my + sin(am) * d + e * e * 60); g.rotate(rot); g.scale(sc, sc); g.translate(-mx, -my);
      g.beginPath(); g.moveTo(cx + cos(a0) * r0, cy + sin(a0) * r0); g.lineTo(cx + cos(a0) * r1, cy + sin(a0) * r1); g.lineTo(cx + cos(a1) * r1, cy + sin(a1) * r1); g.lineTo(cx + cos(a1) * r0, cy + sin(a1) * r0); g.closePath(); g.clip(); g.drawImage(old, 0, 0);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.stroke(); g.restore();
    }
  };
  /* Tegner noe på et eget lerret (til skår, speiling og lignende) og gir lerretet. */
  const auxs = [];
  const onAux = (k, fn) => { let a = auxs[k]; if (!a) { a = auxs[k] = document.createElement('canvas'); a.width = W; a.height = H; } const og = g, x = a.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H); g = x; try { fn(); } finally { g = og; } return a; };

  /* ---------- Kameraet ---------- Filmen setter feltene i P for hvert bilde:
     sh risting (piksler) · z, zx, zy zoom mot et punkt · rot · fl, fc blink · inv negativ · gl forstyrrelser · rgb fargesplitt · wav bølger · bars svarte bånd (0..1) · fade, fadec toning · scan linjer. */
  const newP = () => ({ sh: 0, z: 1, zx: W / 2, zy: H / 2, rot: 0, fl: 0, fc: '#fff', inv: 0, gl: 0, rgb: 0, wav: 0, bars: 0, fade: 0, fadec: '#000', scan: 0 });
  let tmpA = null, tmpB = null;
  function present(out, B) {
    const o = out.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.imageSmoothingEnabled = false; o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
    const sx = P.sh ? (rnd(frameNo, 1) - 0.5) * 2 * P.sh : 0, sy = P.sh ? (rnd(frameNo, 2) - 0.5) * 2 * P.sh : 0;
    const cam = () => { o.translate(P.zx + sx, P.zy + sy); if (P.rot) o.rotate(P.rot); o.scale(P.z, P.z); o.translate(-P.zx, -P.zy); };
    const blit = (src, dx) => { o.save(); cam(); if (P.wav) { for (let y = 0; y < H; y += 3) o.drawImage(src, 0, y, W, 3, (dx || 0) + sin(y * 0.045 + T * 7) * P.wav, y, W, 3); } else o.drawImage(src, dx || 0, 0); o.restore(); };
    if (P.rgb > 0.3) {
      /* Fargesplitt: det røde bildet forskyves én vei og det blågrønne den andre. */
      if (!tmpA) { tmpA = document.createElement('canvas'); tmpB = document.createElement('canvas'); tmpA.width = tmpB.width = W; tmpA.height = tmpB.height = H; }
      for (const [cv, col] of [[tmpA, '#ff0000'], [tmpB, '#00ffff']]) { const x = cv.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.drawImage(B, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H); }
      blit(tmpA, -P.rgb); o.globalCompositeOperation = 'lighter'; blit(tmpB, P.rgb); o.globalCompositeOperation = 'source-over';
    } else blit(B, 0);
    if (P.gl > 0.01) { const n = 2 + floor(P.gl * 9); for (let i = 0; i < n; i++) { const y = floor(rnd(i, frameNo) * H), h = 2 + floor(rnd(i, frameNo + 1) * 26 * P.gl + 2), dx = (rnd(i, frameNo + 2) - 0.5) * 120 * P.gl; o.drawImage(B, 0, y, W, h, dx, y, W, h); if (i % 3 === 0) { o.globalAlpha = 0.35 * P.gl; o.fillStyle = i % 2 ? '#ff2040' : '#20f0ff'; o.fillRect(0, y, W, 1 + (h >> 3)); o.globalAlpha = 1; } } }
    if (P.inv > 0.01) { o.globalCompositeOperation = 'difference'; o.globalAlpha = c01(P.inv); o.fillStyle = '#fff'; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; }
    if (P.scan > 0.01) { o.globalAlpha = c01(P.scan); o.fillStyle = '#000'; for (let y = 0; y < H; y += 4) o.fillRect(0, y, W, 2); o.globalAlpha = 1; }
    if (P.fl > 0.01) { o.globalAlpha = c01(P.fl); o.fillStyle = P.fc; o.fillRect(0, 0, W, H); o.globalAlpha = 1; }
    if (P.bars > 0.01) { const b = Math.round(34 * c01(P.bars)); o.fillStyle = '#000'; o.fillRect(0, 0, W, b); o.fillRect(0, H - b, W, b); }
    if (P.fade > 0.01) { o.globalAlpha = c01(P.fade); o.fillStyle = P.fadec; o.fillRect(0, 0, W, H); o.globalAlpha = 1; }
  }

  /* ---------- Filmene ---------- FILM[art] = { len, at (hvor i låta filmen starter), R (når den viser seg), use (bilder), sps (andre former), spid (bildet som brukes i stedet for artens vanlige, f.eks. Giratina i Origin Forme), draw(), air(k) }. */
  const FILM = {};
  const film = (ids, def) => { (Array.isArray(ids) ? ids : [ids]).forEach(id => { FILM[id] = def; }); };
  C.FILM = FILM;
  const filmOf = id => FILM[id] || (C.calmFilm ? C.calmFilm(id) : null);
  C.has = id => !!filmOf(id);
  C.info = id => { const f = filmOf(id); return f ? { len: f.len, at: f.at || 0, R: f.R, bg: !!f.bg, plat: f.plat || null, omen: f.omen || 0 } : null; };
  /* Henter det filmen trenger. Venter ikke lenger enn ms. */
  C.prep = async (id, ms, extra) => {
    const f = filmOf(id); if (!f) return false;
    const jobs = Promise.all([need((f.use || []).concat(['paint'])), (typeof id === 'number' || /^dk/.test(id)) ? loadSprite(f.spid || id) : 0].concat((f.sps || []).concat(extra || []).map(loadSprite)));
    await Promise.race([jobs, new Promise(r => setTimeout(r, ms || 4000))]); return true;
  };
  let B = null;
  async function setCur(id, o) {
    const f = filmOf(id); o = o || {}; const sps = {};
    /* o.team = laget som møter (bossfilmene viser det som skygger): bildene hentes sammen med filmens egne. */
    for (const s of (f.sps || []).concat(o.team || [])) if (!(s in sps)) sps[s] = await Promise.race([loadSprite(s), new Promise(r => setTimeout(() => r(null), 30))]);
    cur = { id, f, sp: await Promise.race([loadSprite(f.spid || id), new Promise(r => setTimeout(() => r(null), 30))]), sps, cc: o.cc || '#ffffff', name: o.name || '', cap: o.cap || 'Legendary Pokémon', lv: o.lv || 0, team: o.team || null };
    if (!B) { B = document.createElement('canvas'); B.width = W; B.height = H; }
  }
  /* Tegner ett bilde av filmen på lerretet out. */
  function frame(out, t) {
    T = t; frameNo = floor(t * 60); P = newP(); g = B.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    try { cur.f.draw(T, P, cur); } catch (e) { C.err = String(e && e.stack || e); }
    present(out, B);
  }
  /* Til testing: ett bilde på et bestemt tidspunkt. */
  C.still = async (out, id, t, o) => { await C.prep(id, 8000); await setCur(id, o); frame(out, t); return C.err || ''; };
  /* Spiller filmen på lerretet. o = { name, cap, lv, cc, clock() (sekunder siden låta startet, eller −1), cue(navn) (lyd og rystelse i mobilen), fast }.
     Gir { done (løftet holder når filmen er over eller hoppet over), skip() }. */
  C.play = (out, id, o) => {
    o = o || {}; let raf = 0, over = false, skipAt = -1, fin; const done = new Promise(r => { fin = r; });
    const f = filmOf(id), t0 = performance.now(), cues = (f.cues || [[f.R, 'cry']]).map(q => ({ t: q[0], n: q[1], on: false }));
    const end = () => { if (over) return; over = true; cancelAnimationFrame(raf); fin(); };
    setCur(id, o).then(() => {
      const step = () => {
        if (over) return; if (!out.isConnected) return end();
        let t = (performance.now() - t0) / 1000; const ck = o.clock ? o.clock() : -1; if (ck >= 0 && abs(ck - t) < 1.5) t = ck;
        if (skipAt >= 0) { const k = (performance.now() - skipAt) / 280; frame(out, min(t, f.len - 0.02)); const x = out.getContext('2d'); x.globalAlpha = c01(k); x.fillStyle = f.outc || '#fff'; x.fillRect(0, 0, W, H); x.globalAlpha = 1; if (k >= 1) return end(); raf = requestAnimationFrame(step); return; }
        if (t >= f.len) { frame(out, f.len); return end(); }
        frame(out, t);
        for (const q of cues) if (!q.on && t >= q.t) { q.on = true; if (o.cue) try { o.cue(q.n); } catch (_) {} }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    return { done, skip: () => { if (skipAt < 0 && !over) skipAt = performance.now(); }, stop: end };
  };
  /* Lufta i kampen: filmens egen stemning (tåke, lyn, glør, regn) tegnet gjennomsiktig over banen, i sløyfe. k = styrken. */
  C.air = (out, id, o) => {
    const f = filmOf(id); if (!f || !f.air || !out) return () => {}; o = o || {}; let raf = 0, last = 0, on = true, n = 0; const t0 = performance.now(), bgc = f.bg && o.bg ? o.bg : null;
    need(f.use || []);
    const step = ts => {
      if (!on || !out.isConnected) return; raf = requestAnimationFrame(step); if (ts - last < 30) return; last = ts;
      T = (ts - t0) / 1000 + 100; frameNo = floor(T * 60); P = newP(); cur = { id, f, sp: null, sps: {}, cc: o.cc || '#fff' };
      /* Stedet bak (ugjennomsiktig, bak plattformene) tegnes annenhver gang: det beveger seg sakte. */
      if (bgc && n++ % 2 === 0) { g = bgc.getContext('2d'); g.setTransform(bgc.width / W, 0, 0, bgc.height / H, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; try { f.bg(T, o.k == null ? 1 : o.k, cur.cc); } catch (e) { C.err = String(e && e.stack || e); } }
      g = out.getContext('2d'); g.setTransform(out.width / W, 0, 0, out.height / H, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
      try { f.air(T, o.k == null ? 1 : o.k, cur.cc); } catch (e) { C.err = String(e && e.stack || e); }
    };
    raf = requestAnimationFrame(step);
    return () => { on = false; cancelAnimationFrame(raf); };
  };
  /* Til testing: stedet bak (bg) på ett tidspunkt. */
  C.bgStill = async (out, id, t, o) => { const f = filmOf(id); if (!f || !f.bg) return 'no bg'; await need(f.use || []); T = t; frameNo = floor(T * 60); P = newP(); cur = { id, f, sp: null, sps: {}, cc: (o && o.cc) || '#fff' }; g = out.getContext('2d'); g.setTransform(out.width / W, 0, 0, out.height / H, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); C.err = ''; try { f.bg(T, (o && o.k) || 1, cur.cc); } catch (e) { C.err = String(e && e.stack || e); } return C.err; };

  /* ---------- Korte effekter i kampen ----------
     Entréen til den legendariske og hendelsene fra stedet (lyn, ras, bølger, raseri): tegnes gjennomsiktig over banen. FXS[navn] = { len, R (når den viser seg), use, cues, draw(t, o) }.
     o = { x, y (føttene til den legendariske), mx, my (føttene til din Pokémon), cc, id (arten, til silhuetter), s (størrelsen på figuren), cue(navn, verdi) }. */
  const FXS = {};
  const fx = (names, def) => { (Array.isArray(names) ? names : [names]).forEach(n => { FXS[n] = def; }); };
  C.FXS = FXS;
  C.fxInfo = n => FXS[n] ? { len: FXS[n].len, R: FXS[n].R || 0 } : null;
  C.fxPrep = (n, id) => { const E = FXS[n]; if (!E) return Promise.resolve(false); return Promise.race([Promise.all([need(E.use || []), id ? loadSprite(id) : 0]).then(() => true), new Promise(r => setTimeout(() => r(false), 1500))]); };
  const fxFrame = (out, E, t, o, sp) => {
    T = t; frameNo = floor(t * 60); P = newP(); cur = { id: o.id || 0, f: E, sp, sps: {}, cc: o.cc || '#ffffff' };
    g = out.getContext('2d'); g.setTransform(out.width / W, 0, 0, out.height / H, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.clearRect(0, 0, W, H);
    if (t < E.len) { try { E.draw(t, o); } catch (e) { C.err = String(e && e.stack || e); } }
  };
  /* Spiller effekten på lerretet. Løftet holder når den er over. */
  C.fx = (out, n, o) => new Promise(res => {
    const E = FXS[n]; if (!E || !out) return res(false); o = o || {};
    const t0 = performance.now(), cues = (E.cues || []).map(q => ({ t: q[0], n: q[1], v: q[2], on: false })); let sp = null;
    if (o.id) loadSprite(o.id).then(s => { sp = s; });
    const step = () => {
      if (!out.isConnected) return res(false);
      const t = (performance.now() - t0) / 1000;
      fxFrame(out, E, t, o, sp);
      for (const q of cues) if (!q.on && t >= q.t) { q.on = true; if (o.cue) try { o.cue(q.n, q.v); } catch (_) {} }
      if (t >= E.len) return res(true);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  /* Til testing: ett bilde av effekten. */
  C.fxStill = async (out, n, t, o) => { const E = FXS[n]; if (!E) return 'no fx ' + n; o = o || {}; await need(E.use || []); const sp = o.id ? await loadSprite(o.id) : null; C.err = ''; fxFrame(out, E, t, o, sp); return C.err; };

  C.airStill = (out, id, t, o) => { const f = filmOf(id); if (!f || !f.air) return; T = t; frameNo = floor(T * 60); P = newP(); cur = { id, f, sp: null, sps: {}, cc: (o && o.cc) || '#fff' }; g = out.getContext('2d'); g.setTransform(out.width / W, 0, 0, out.height / H, 0, 0); g.clearRect(0, 0, W, H); f.air(T, (o && o.k) || 1, cur.cc); };

  /* Verktøyene filmene bruker (filmene ligger i raidf.js). */
  C.kit = { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, pulse, io, eo, ei, back, rnd, rgba, blend, fill, lin, glow, im, has, tintArt, mulArt, cover, strip, spr, aura, sprH, bolt, rays, ring, wave, poly, rect, beam, stars, dust, fog, txt, vig, card, shatter, onAux, film, fx,
    get T() { return T; }, get P() { return P; }, get g() { return g; }, get cur() { return cur; } };
  return C;
})();
