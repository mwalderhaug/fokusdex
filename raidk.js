'use strict';
/* Fokusdex – verktøykassa til raidfilmene og arenaene (del 2; del 1 er etterbehandlingen i fxgl.js, motoren er raid.js).
   Alt her er felles verktøy med parametere, så hver legendarisk bare blir data og noen linjer (work/RAIDS.md avsnitt 4):
   1. Pokémonen: Black/White-animasjonen som enkeltbilder (egen GIF-leser), lys fra stedet, kantlys, silhuett, skygge, speilbilde, oppløsning i biter, tunge steg.
   2. Scenen i dybden: et kamera som kan kjøre inn, panorere og tilte over en bakke i ekte perspektiv, med lag i ulik avstand (K.stage, K.camTo, K.layer, K.gp).
   3. Bakken som materiale (lava, hav, is) i fxgl.js, med en tegnet reserve her når WebGL mangler (K.ground).
   4. Lagmaler tegnet fra frø: fjellrygger, vulkan, grantrær, hulevegg, tåkebånd og røyksøyler.
   5. Partikler med dybde (nære er store og uskarpe, fjerne små og skarpe), lysstråler og regnbue.
   6. Navneplakaten i stedets materiale (K.plate), skalabildet (K.trainer) og treffbildet (K.impact).
   Alt er funksjoner av tiden, uten egen tilstand, som resten av filmene. Verktøyene legges i CINE.kit. */
(() => {
  if (typeof CINE === 'undefined' || !CINE.kit) return;
  const C = CINE, K = C.kit, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, io, eo, ei, rnd, hex, rgba, blend } = K;
  const n1 = (x, s) => { const i = floor(x), f = x - i, u = f * f * (3 - 2 * f); return mix(rnd(i, s), rnd(i + 1, s), u); };
  /* Jevn støy langs en linje, 0..1. oct = hvor mange lag med detaljer. */
  const fbm1 = (x, s, oct) => { let a = 0.5, v = 0, n = 0; for (let i = 0; i < (oct || 4); i++) { v += a * n1(x, s + i * 13); n += a; x = x * 2.07 + 5.3; a *= 0.5; } return v / n; };
  K.n1 = n1; K.fbm1 = fbm1;
  /* Nøkkelpunkter: verdien på tidspunktet t ut fra [[tid, verdi, overgang?], …]. Overgangen (io når ikke annet står) gjelder fram til punktet den står på. */
  K.kf = (t, pts, ez) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const a = pts[i - 1], b = pts[i]; return mix(a[1], b[1], (b[2] || ez || io)((t - a[0]) / (b[0] - a[0]))); } return pts[pts.length - 1][1]; };
  K.gl = () => typeof FXGL !== 'undefined' && FXGL.ok();

  /* ================= 1. POKÉMONEN =================
     GIF-leseren: et lerret spiller ikke av en GIF, så fila leses her og deles i bilder. Formatet: en fargetabell, og for hvert bilde et utsnitt med
     LZW-pakkede fargenumre, en ventetid og en regel for hva som skal stå igjen til neste bilde. */
  function lzw(mcs, data, n) {
    const out = new Uint8Array(n), clear = 1 << mcs, eoi = clear + 1, pre = new Int16Array(4096), suf = new Uint8Array(4096), stack = new Uint8Array(4097);
    let size = mcs + 1, next = eoi + 1, bits = 0, acc = 0, o = 0, prev = -1, first = 0, top = 0, p = 0;
    for (let i = 0; i < clear; i++) suf[i] = i;
    while (o < n) {
      while (bits < size && p < data.length) { acc |= data[p++] << bits; bits += 8; }
      if (bits < size) break;
      const code = acc & ((1 << size) - 1); acc >>= size; bits -= size;
      if (code === clear) { size = mcs + 1; next = eoi + 1; prev = -1; continue; }
      if (code === eoi) break;
      if (prev === -1) { out[o++] = suf[code]; prev = code; first = code; continue; }
      let c = code; if (code >= next) { stack[top++] = first; c = prev; }
      while (c > clear) { stack[top++] = suf[c]; c = pre[c]; }
      first = suf[c]; stack[top++] = first;
      if (next < 4096) { pre[next] = prev; suf[next] = first; next++; if (next === (1 << size) && size < 12) size++; }
      prev = code; while (top > 0 && o < n) out[o++] = stack[--top]; top = 0;
    }
    return out;
  }
  function gif(buf) {
    const d = new Uint8Array(buf); let p = 6; const u16 = () => { const v = d[p] | d[p + 1] << 8; p += 2; return v; };
    if (d[0] !== 71 || d[1] !== 73 || d[2] !== 70) throw new Error('gif');
    const w = u16(), h = u16(), fl = d[p++]; p += 2; const pal = n => { const t = d.subarray(p, p + 3 * n); p += 3 * n; return t; }, gct = fl & 0x80 ? pal(2 << (fl & 7)) : null, frames = [];
    let ctl = { delay: 100, disp: 0, tr: -1 };
    while (p < d.length) {
      const b = d[p++];
      if (b === 0x21) { const lab = d[p++]; if (lab === 0xF9) { p++; const f = d[p++], dl = u16() * 10; ctl = { delay: dl <= 10 ? 100 : dl, disp: (f >> 2) & 7, tr: f & 1 ? d[p] : -1 }; p += 2; } else { for (let n; (n = d[p++]);) p += n; } }
      else if (b === 0x2C) {
        const x = u16(), y = u16(), fw = u16(), fh = u16(), f = d[p++], lct = f & 0x80 ? pal(2 << (f & 7)) : null, mcs = d[p++]; let len = 0, q = p, n;
        while ((n = d[q])) { len += n; q += n + 1; } const data = new Uint8Array(len); let o = 0; while ((n = d[p++])) { data.set(d.subarray(p, p + n), o); o += n; p += n; }
        let pix = lzw(mcs, data, fw * fh);
        if (f & 0x40) { const src = pix, rows = []; for (const [st, sp] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let r = st; r < fh; r += sp) rows.push(r); pix = new Uint8Array(fw * fh); rows.forEach((r, i) => pix.set(src.subarray(i * fw, i * fw + fw), r * fw)); }
        frames.push({ x, y, w: fw, h: fh, pix, pal: lct || gct, delay: ctl.delay, disp: ctl.disp, tr: ctl.tr }); ctl = { delay: 100, disp: 0, tr: -1 };
      } else break;
    }
    return { w, h, frames };
  }
  /* Bildene settes sammen, beskjæres til det figuren bruker på tvers av alle bildene (så føttene står stille), og legges i ett ark. */
  function sheetOf(Gf, dk) {
    const { w, h, frames } = Gf, n = frames.length, full = new Uint8ClampedArray(w * h * 4), comp = [], t = []; let x0 = w, y0 = h, x1 = -1, y1 = -1, tot = 0;
    for (const f of frames) {
      const keep = f.disp === 3 ? full.slice() : null;
      for (let y = 0; y < f.h; y++) { const yy = f.y + y; if (yy >= h) break; for (let x = 0; x < f.w; x++) { const ix = f.pix[y * f.w + x], xx = f.x + x; if (ix === f.tr || xx >= w) continue; const o = (yy * w + xx) * 4; full[o] = f.pal[ix * 3]; full[o + 1] = f.pal[ix * 3 + 1]; full[o + 2] = f.pal[ix * 3 + 2]; full[o + 3] = 255; } }
      const img = full.slice(); comp.push(img); tot += f.delay / 1000; t.push(tot);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (img[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (f.disp === 2) { for (let y = f.y; y < min(h, f.y + f.h); y++) full.fill(0, (y * w + f.x) * 4, (y * w + min(w, f.x + f.w)) * 4); } else if (keep) full.set(keep);
    }
    if (x1 < x0) throw new Error('empty');
    const m = 2, bw = x1 - x0 + 1, bh = y1 - y0 + 1, cw = bw + 2 * m, ch = bh + 2 * m, cols = Math.ceil(Math.sqrt(n * ch / cw)), sheet = document.createElement('canvas'); sheet.width = cols * cw; sheet.height = Math.ceil(n / cols) * ch;
    const X = sheet.getContext('2d');
    comp.forEach((img, i) => { const id = X.createImageData(cw, ch); for (let y = 0; y < bh; y++) id.data.set(img.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4), ((y + m) * cw + m) * 4); if (dk) C.darken(id.data); X.putImageData(id, (i % cols) * cw, floor(i / cols) * ch); });
    return { sheet, n, cols, cw, ch, m, bw, bh, gw: w, gh: h, x0, y0, t, total: tot };
  }
  C.gif = gif;
  C.aniUrl = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
  const aniJobs = new Map();
  /* Henter animasjonen til en art og legger den på bildet (sp.ani). Går det ikke, står sp.ani som 0 og stillbildet brukes. */
  C.loadAni = (id, sp) => {
    if (sp.ani != null) return Promise.resolve(sp.ani); if (aniJobs.has(id)) return aniJobs.get(id);
    const dk = typeof id === 'string' && id.indexOf('dk') === 0, base = dk ? +id.slice(2) : id;
    const j = fetch(C.aniUrl(base), { mode: 'cors' }).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => (sp.ani = sheetOf(gif(b), dk))).catch(() => (sp.ani = 0));
    aniJobs.set(id, j); return j;
  };
  /* Masker: et utvalg av figurens piksler som eget bilde, til å tegne dem lysende (o.mask i K.mon). f(r, g, b) velger pikslene; inner = hvor mange
     piksler inn fra omrisset de må ligge (så bare strekene inne i kroppen blir med, ikke omrisset). */
  K.MASK = { ink: { f: (r, g, b) => r + g + b < 70 }, seam: { f: (r, g, b) => r + g + b < 70, inner: 2 } };
  const maskOf = (sp, A, name) => {
    const hold = A || sp, key = 'mask_' + name; if (hold[key] !== undefined) return hold[key]; const src = A ? A.sheet : sp.cv, c = document.createElement('canvas'), w = c.width = src.width, h = c.height = src.height, x = c.getContext('2d'), M = K.MASK[name]; x.drawImage(src, 0, 0);
    try { const im = x.getImageData(0, 0, w, h), d = im.data, al = new Uint8Array(w * h), n = M.inner || 0; for (let i = 0; i < w * h; i++) al[i] = d[i * 4 + 3] > 40 ? 1 : 0;
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const i = y * w + xx, o = i * 4; let ok = al[i] && M.f(d[o], d[o + 1], d[o + 2]); if (ok && n) ok = xx >= n && xx < w - n && y >= n && y < h - n && al[i - n] && al[i + n] && al[i - n * w] && al[i + n * w]; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = ok ? 255 : 0; }
      x.putImageData(im, 0, 0); hold[key] = c; } catch (_) { hold[key] = null; }
    return hold[key];
  };
  const frameAt = (A, t) => { const tt = ((t % A.total) + A.total) % A.total; let i = 0; while (i < A.n - 1 && A.t[i] <= tt) i++; return i; };
  let sA = null, sB = null;
  const small = (w, h, b) => { let c = b ? sB : sA; if (!c) { c = document.createElement('canvas'); c.width = 128; c.height = 128; if (b) sB = c; else sA = c; } if (c.width < w || c.height < h) { c.width = max(c.width, w); c.height = max(c.height, h); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false; return x; };
  /* Pokémonen, med føttene i (x, y). s = forstørrelsen. Gir målene { w, h, top } (eller null uten bilde).
     o = { id (en annen form), ft (tid i animasjonen, ellers filmens tid), fi (bildenummer), still (stillbildet), box (stå som i kampen: hele GIF-ruta),
           a, add, flip, r, sx, sy, tf [a, b, c, d] (egen matrise, til skygge og speilbilde), mask (bare disse pikslene, se K.MASK: brukes med col og add),
           col (silhuett), dark (0–1 mørklegging, darkc fargen), lit [{ col, a, h (andel av høyden), top }] (lys nedenfra eller ovenfra),
           rim { col, dx, dy, a } (kantlys: dx, dy er retningen lyset går), cut (alt under denne linja i bildet skjules: lava, vann, tåke),
           fx(X, w, h, ax, ay, m) (egen tegning i figurens egne piksler, m = forstørringen), hq (1, 2 eller 4: forstørring med EPX; ellers velges den etter størrelsen) }.
     Lys og kanter regnes i figurens egne piksler, så de følger pikseltegningen. */
  /* Forstørring av pikseltegninger uten grove klosser (EPX): hver piksel blir fire, og hjørnene mot en skrå kant får nabofargen, så skrå linjer blir
     jevnere uten at tegningen blir uskarp. Brukes når figuren tegnes stort (nærbilder i filmene). To runder gir fire ganger størrelsen. */
  const epx = (src, w, h) => {
    const sv = new Uint32Array(src.data.buffer), out = new ImageData(w * 2, h * 2), d = new Uint32Array(out.data.buffer), w2 = w * 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, p = sv[i], A = y > 0 ? sv[i - w] : p, D = y < h - 1 ? sv[i + w] : p, Cc = x > 0 ? sv[i - 1] : p, B = x < w - 1 ? sv[i + 1] : p, o = y * 2 * w2 + x * 2;
      d[o] = Cc === A && Cc !== D && A !== B ? A : p; d[o + 1] = A === B && A !== Cc && B !== D ? B : p; d[o + w2] = D === Cc && D !== B && Cc !== A ? Cc : p; d[o + w2 + 1] = B === D && B !== A && D !== Cc ? D : p; }
    return out;
  };
  let sR = null; const hqC = new Map();
  const hqOf = (key, src, sx, sy, sw, sh, n) => {
    let d = hqC.get(key); if (d !== undefined) return d;
    try { if (!sR) { sR = document.createElement('canvas'); sR.width = sR.height = 160; } if (sR.width < sw || sR.height < sh) { sR.width = max(sR.width, sw); sR.height = max(sR.height, sh); } const x = sR.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, sw, sh); x.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh); d = x.getImageData(0, 0, sw, sh); d = epx(d, sw, sh); if (n >= 4) d = epx(d, sw * 2, sh * 2); } catch (_) { d = null; }
    if (hqC.size > 5) hqC.delete(hqC.keys().next().value); hqC.set(key, d); return d;
  };
  const mon = (x, y, s, o) => {
    o = o || {}; const cur = K.cur, sp = o.id ? cur.sps[o.id] : cur.sp; if (!sp) return null;
    const a = o.a == null ? 1 : c01(o.a), A = sp.ani && !o.still ? sp.ani : null, ky = s * (o.sy || 1); let src, sx, sy, sw, sh, ax, ay, fi = -1;
    if (A) { fi = o.fi != null ? ((floor(o.fi) % A.n) + A.n) % A.n : frameAt(A, o.ft == null ? K.T : o.ft); src = A.sheet; sx = (fi % A.cols) * A.cw; sy = floor(fi / A.cols) * A.ch; sw = A.cw; sh = A.ch; ax = o.box ? A.m + A.gw / 2 - A.x0 : A.m + A.bw / 2; ay = o.box ? A.m + A.gh - A.y0 : A.m + A.bh; }
    else { src = sp.cv; sx = sp.bx; sy = sp.by; sw = sp.bw; sh = sp.bh; ax = sw / 2; ay = sh; }
    const M = { w: sw * s, h: ay * ky, top: y - ay * ky, sw, sh, ax, ay }; if (a < 0.004) return M;
    if (o.mask) { src = maskOf(sp, A, o.mask); if (!src) return M; }
    /* Tegnes figuren stort, forstørres pikseltegningen først (to eller fire ganger), og lys og kanter regnes i den forstørrede. */
    const big = s * C._.rs(), want = o.hq != null ? o.hq : sp.clean === false ? 1 : big >= 3.1 ? 4 : big >= 2.3 ? 2 : 1, hd = want > 1 ? hqOf(`${o.id || cur.id}|${fi}|${o.mask || ''}|${want}`, src, sx, sy, sw, sh, want) : null, m = hd ? want : 1;
    let img = src, ix = sx, iy = sy;
    if (m > 1 || o.col || o.lit || o.rim || o.dark || o.cut != null || o.fx) {
      const X = small(sw * m, sh * m, 0), w2 = sw * m, h2 = sh * m; if (hd) X.putImageData(hd, 0, 0); else X.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh); X.globalCompositeOperation = 'source-atop';
      if (o.col) { X.fillStyle = o.col; X.fillRect(0, 0, w2, h2); }
      if (o.dark) { X.globalAlpha = c01(o.dark); X.fillStyle = o.darkc || '#000'; X.fillRect(0, 0, w2, h2); X.globalAlpha = 1; }
      for (const L of [].concat(o.lit || [])) { const hh = ay * (L.h || 0.6) * m, gr = X.createLinearGradient(0, L.top ? 0 : ay * m, 0, L.top ? hh : ay * m - hh); gr.addColorStop(0, rgba(L.col, L.a == null ? 0.5 : L.a)); gr.addColorStop(1, rgba(L.col, 0)); X.fillStyle = gr; X.fillRect(0, 0, w2, h2); }
      if (o.rim) { const r = o.rim, Y = small(w2, h2, 1); Y.drawImage(sA, 0, 0, w2, h2, 0, 0, w2, h2); Y.globalCompositeOperation = 'source-in'; Y.fillStyle = r.col; Y.fillRect(0, 0, w2, h2); Y.globalCompositeOperation = 'destination-out'; Y.drawImage(sA, 0, 0, w2, h2, (r.dx || 0) * m, (r.dy == null ? 1 : r.dy) * m, w2, h2); X.globalAlpha = c01(r.a == null ? 0.9 : r.a); X.drawImage(sB, 0, 0, w2, h2, 0, 0, w2, h2); X.globalAlpha = 1; }
      if (o.fx) { X.save(); o.fx(X, w2, h2, ax * m, ay * m, m); X.restore(); }
      if (o.cut != null) { const row = (ay - (y - o.cut) / ky) * m; if (row < h2) { X.globalCompositeOperation = 'destination-out'; X.globalAlpha = 1; X.fillStyle = '#000'; X.fillRect(0, max(0, row), w2, h2); } }
      img = sA; ix = 0; iy = 0;
    }
    const g = K.g; g.save(); g.imageSmoothingEnabled = m > 1; g.globalAlpha = a; if (o.add) g.globalCompositeOperation = o.add === 1 ? 'lighter' : o.add;
    g.translate(Math.round(x), Math.round(y)); if (o.tf) g.transform(o.tf[0], o.tf[1], o.tf[2], o.tf[3], 0, 0); if (o.r) g.rotate(o.r); g.scale((o.flip ? -1 : 1) * s * (o.sx || 1), ky);
    g.drawImage(img, ix, iy, sw * m, sh * m, -ax, -ay, sw, sh); g.restore(); return M;
  };
  K.mon = mon;
  /* Glød rundt figuren: silhuetten i fargen, stemplet i en ring rundt. */
  K.monGlow = (x, y, s, col, r, a, o) => { for (let i = 0; i < 8; i++) mon(x + cos(i * PI / 4) * r, y + sin(i * PI / 4) * r, s, Object.assign({}, o, { col, a: a == null ? 0.5 : a, add: 1, lit: null, rim: null, dark: 0 })); };
  /* Skyggen på bakken: silhuetten lagt ned mot kameraet. len = lengden (andel av høyden), skew = hvor skrått den faller. */
  K.monShadow = (x, y, s, o) => { o = o || {}; mon(x, y, s, Object.assign({}, o, { col: o.col || '#000', a: o.a == null ? 0.4 : o.a, tf: [1, 0, o.skew || 0, -(o.len || 0.28)], lit: null, rim: null, dark: 0, cut: null, add: 0 })); };
  /* Speilbildet i vann, is eller blankt gulv: figuren opp ned under føttene. */
  K.monRefl = (x, y, s, o) => { o = o || {}; mon(x, y, s, Object.assign({}, o, { a: o.a == null ? 0.3 : o.a, tf: [1, 0, 0, -(o.len || 0.8)], cut: null })); };
  /* Figuren bygges av biter som samler seg (k 0 → 1), eller løses opp (k 1 → 0). o = { spread, seed, col, sz }. */
  const bitsOf = (sp, A) => { const key = A ? 'bitsA' : 'bitsS'; if (sp[key]) return sp[key]; const src = A ? A.sheet : sp.cv, sx = A ? 0 : sp.bx, sy = A ? 0 : sp.by, sw = A ? A.cw : sp.bw, sh = A ? A.ch : sp.bh, X = small(sw, sh, 0); X.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh); let d; try { d = X.getImageData(0, 0, sw, sh).data; } catch (_) { return (sp[key] = []); } const l = []; for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) { const o = (y * sw + x) * 4; if (d[o + 3] > 40) l.push([x, y, `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`]); } return (sp[key] = l); };
  K.monBits = (x, y, s, k, o) => {
    o = o || {}; const cur = K.cur, sp = o.id ? cur.sps[o.id] : cur.sp; if (!sp) return; if (k >= 1) { mon(x, y, s, o); return; } if (k <= 0) return;
    const A = sp.ani || null, l = bitsOf(sp, A), ax = A ? A.m + A.bw / 2 : sp.bw / 2, ay = A ? A.m + A.bh : sp.bh, g = K.g, sd = o.seed || 5, spr = o.spread || 260, sz = (o.sz || 2) * s;
    g.save(); g.globalAlpha = c01(o.a == null ? 1 : o.a);
    for (let i = 0; i < l.length; i++) { const q = l[i], d = rnd(i, sd), kk = c01((k - d * 0.5) / 0.5), e = 1 - eo(kk), an = rnd(i, sd + 1) * TAU, R2 = spr * (0.4 + rnd(i, sd + 2)) * e; if (kk <= 0) continue; g.fillStyle = o.col && kk < 0.9 ? o.col : q[2]; g.fillRect(Math.round(x + (q[0] - ax) * s + cos(an + e * 3) * R2), Math.round(y + (q[1] - ay) * s + sin(an + e * 3) * R2 * 0.7), sz, sz); }
    g.restore();
  };
  /* Myke former som bølger, slår med vingene eller klemmes sammen: figuren tegnes i striper som forskyves hver for seg.
     o.fn(v, fi) gir [dx, dy, bredde] for stripa i høyden v (0 = toppen, 1 = føttene), i figurens egne piksler. o.n = antall striper. Virker dårlig på bein. */
  K.monWarp = (x, y, s, o) => {
    o = o || {}; const cur = K.cur, sp = o.id ? cur.sps[o.id] : cur.sp; if (!sp) return; const A = sp.ani || null, g = K.g, n = o.n || 24; let src, sx, sy, sw, sh, ax, ay;
    if (A) { const fi = o.fi != null ? ((floor(o.fi) % A.n) + A.n) % A.n : frameAt(A, o.ft == null ? K.T : o.ft); src = A.sheet; sx = (fi % A.cols) * A.cw; sy = floor(fi / A.cols) * A.ch; sw = A.cw; sh = A.ch; ax = A.m + A.bw / 2; ay = A.m + A.bh; } else { src = sp.cv; sx = sp.bx; sy = sp.by; sw = sp.bw; sh = sp.bh; ax = sw / 2; ay = sh; }
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = c01(o.a == null ? 1 : o.a); g.translate(Math.round(x), Math.round(y)); g.scale((o.flip ? -1 : 1) * s, s);
    for (let i = 0; i < n; i++) { const y0 = floor(i * sh / n), y1 = floor((i + 1) * sh / n), q = o.fn((i + 0.5) / n, i) || [0, 0, 1], w = sw * (q[2] == null ? 1 : q[2]); g.drawImage(src, sx, sy + y0, sw, y1 - y0, -ax * (q[2] == null ? 1 : q[2]) + q[0], -ay + y0 + q[1], w, y1 - y0 + 0.5); }
    g.restore();
  };
  /* Ettersynsbilder: fn(tid, styrke) kalles for n tidligere øyeblikk (eldst først), så en figur i fart får et spor etter seg. */
  K.echo = (n, dt, fn) => { for (let i = n; i >= 1; i--) fn(K.T - i * dt, 1 - i / (n + 1)); };
  /* Tunge steg: kroppen løftes før hvert steg og faller på det. times = når føttene treffer. Gir { y (løft i piksler), sq (klem 0–1), k (0–1 siden forrige steg), i, hit }. */
  K.stomp = (t, times, o) => {
    o = o || {}; const lift = o.lift == null ? 7 : o.lift, pre = o.pre || 0.42; let y = 0, sq = 0, i = -1, k = 1, ht = 0;
    times.forEach((q, j) => { if (t >= q - pre && t < q) y = max(y, sin(c01((t - (q - pre)) / pre) * PI) * lift); if (t >= q) { i = j; k = c01((t - q) / (o.len || 0.5)); ht = hit(t, q, o.len || 0.5); } });
    if (i >= 0) sq = hit(t, times[i], 0.22); return { y: -y, sq, k, i, hit: ht };
  };

  /* ================= 2. SCENEN I DYBDEN =================
     Bakken er et plan sett fra et kamera litt over det. Kampvinkelen er utgangspunktet: horisonten i YH, den legendariske står i (377, 198) og din egen i
     (190, 372). Verdensenheten er én piksel der den legendariske står (Z = 400). Kameraet kan flyttes (x, z), løftes (h), tiltes (tilt) og zoomes (zoom),
     og lag i ulik avstand flytter seg ulikt (parallakse). Lagene tegnes i kampvinkelens piksler og flyttes av K.layer. */
  const ST = { F: 400, YH: 146, HC: 52, x0: 256, yh: 146, f: 400, hc: 52, cx: 0, cz: 0 };
  K.st = ST;
  K.stage = o => { o = o || {}; ST.YH = o.yh == null ? 146 : o.yh; ST.HC = 198 - ST.YH; K.camTo(); };
  K.camTo = o => { o = o || {}; ST.cx = o.x || 0; ST.cz = o.z || 0; ST.f = ST.F * (o.zoom || 1); ST.hc = ST.HC * (o.h || 1); ST.yh = ST.YH + (o.tilt || 0); ST.x0 = 256 + (o.px || 0); };
  /* Et punkt på bakken (X, Z) – eller Y over bakken – til skjermen: { x, y, s (piksler per enhet) }. null bak kameraet. */
  K.gp = (X, Z, Y) => { const d = Z - ST.cz; if (d < 6) return null; const s = ST.f / d; return { x: ST.x0 + (X - ST.cx) * s, y: ST.yh + (ST.hc - (Y || 0)) * s, s }; };
  /* Fra et punkt i kampvinkelens bilde til bakken: { X, Z }. */
  K.unp = (x, y) => { const Z = ST.F * ST.HC / max(1, y - ST.YH); return { X: (x - 256) * Z / ST.F, Z }; };
  /* Plassene i kampen på bakken. */
  K.spots = () => ({ foe: K.unp(377, 198), me: K.unp(190, 372) });
  /* Et lag i avstanden Z (Infinity = himmelen): fn tegner i kampvinkelens piksler. */
  K.layer = (Z, fn) => { const g = K.g, inf = Z === Infinity, d = Z - ST.cz; if (!inf && d < 6) return; const k = inf ? ST.f / ST.F : ST.f * Z / (ST.F * d), tx = ST.x0 - 256 * k - (inf ? 0 : ST.f * ST.cx / d), ty = ST.yh - ST.YH * k + (inf ? 0 : ST.f * (ST.hc - ST.HC) / d); g.save(); g.transform(k, 0, 0, k, tx, ty); try { fn(k); } finally { g.restore(); } };
  /* Et punkt i et lag (kampvinkelens piksler, avstand Z) til skjermen slik kameraet står nå. */
  K.lp = (Z, xs, ys) => { const inf = Z === Infinity, d = Z - ST.cz, k = inf ? ST.f / ST.F : ST.f * Z / (ST.F * d); return { x: ST.x0 - 256 * k - (inf ? 0 : ST.f * ST.cx / d) + xs * k, y: ST.yh - ST.YH * k + (inf ? 0 : ST.f * (ST.hc - ST.HC) / d) + ys * k, s: k }; };
  /* Bakken som materiale: alt under horisonten gjøres gjennomsiktig, og shaderen i fxgl.js tegner der. u = materialets tall (se fxgl.js).
     Uten WebGL tegnes en enklere bakke her. o = { t (materialets egen tid), soft (myk overgang i horisonten, piksler) }. */
  K.ground = (kind, u, o) => {
    o = o || {}; const g = K.g, P = K.P, yh = ST.yh; P.mat = { k: kind, g: [ST.x0, yh, ST.f, ST.hc], c: [ST.cx, ST.cz], t: o.t, u };
    const rs = C._.rs(); g.save(); g.setTransform(rs, 0, 0, rs, 0, 0);
    if (K.gl()) { g.globalCompositeOperation = 'destination-out'; const sf = o.soft || 0; if (sf) { const gr = g.createLinearGradient(0, yh - sf, 0, yh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, yh - sf, W, sf); } g.fillStyle = '#000'; g.fillRect(0, yh, W, H - yh + 2); }
    else if (GND[kind]) GND[kind](g, yh, u, o.t == null ? K.T : o.t);
    g.restore();
  };
  /* Reservene: bakken tegnet i 2D. Sprekkene og dønningene ligger i samme perspektiv som resten. */
  const cells = (cell, far, fn) => { const zn = ST.cz + ST.f * ST.hc / (H - ST.yh + 40), z0 = floor(zn / cell) - 1, z1 = floor((ST.cz + far) / cell); for (let j = z0; j <= z1; j++) { const Z = j * cell, d = max(20, Z + cell - ST.cz), half = 300 * d / ST.f + cell, i0 = floor((ST.cx - half) / cell), i1 = floor((ST.cx + half) / cell); for (let i = i0; i <= i1; i++) fn(i, j); } };
  const GND = {
    lava(g, yh, u, t) {
      const heat = u[0][0], cell = u[0][2] || 90, gr = g.createLinearGradient(0, yh, 0, H); gr.addColorStop(0, heat > 0.9 ? '#ff7a1c' : '#d8480c'); gr.addColorStop(0.07, '#5a1404'); gr.addColorStop(0.3, '#1c0a06'); gr.addColorStop(1, '#120807'); g.fillStyle = gr; g.fillRect(0, yh, W, H - yh);
      const pt = (i, j) => K.gp((i + rnd(i * 7 + j * 13, 3) * 0.8) * cell, (j + rnd(i * 5 + j * 11, 4) * 0.8) * cell);
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (const [lw, col, al] of [[5, '#ff4a10', 0.22], [1.6, '#ffb44a', 0.85]]) { g.beginPath(); cells(cell, 1100, (i, j) => { const a = pt(i, j), b = pt(i + 1, j), c = pt(i, j + 1); if (!a) return; if (b) { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); } if (c && rnd(i * 3 + j, 9) > 0.25) { g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); } }); g.strokeStyle = col; g.globalAlpha = al * (0.75 + 0.25 * sin(t * 1.6)) * min(1.3, 0.7 + heat * 0.5); g.lineWidth = lw; g.stroke(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    },
    water(g, yh, u, t) {
      const deep = u[1], c = `rgb(${deep.slice(0, 3).map(q => Math.round(c01(q) * 255)).join(',')})`, gr = g.createLinearGradient(0, yh, 0, H); gr.addColorStop(0, blend(c, '#9fb8c8', 0.45)); gr.addColorStop(0.2, c); gr.addColorStop(1, blend(c, '#000000', 0.45)); g.fillStyle = gr; g.fillRect(0, yh, W, H - yh);
      g.strokeStyle = 'rgba(225,240,255,.5)'; for (let j = 0; j < 12; j++) { const jj = j + 1 - ((t * 0.5) % 1), p = K.gp(0, ST.cz + 30 + jj * jj * 9); if (!p || p.y > H + 4) continue; g.lineWidth = max(0.6, p.s * 2.2); g.globalAlpha = c01(0.5 - j * 0.03); g.beginPath(); for (let x = -8; x <= W + 8; x += 12) { const yy = p.y + sin(x * 0.02 / max(0.3, p.s) + t * 1.3 + j) * 5 * p.s * (u[0][0] || 1); x < 0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
      g.globalAlpha = 1;
    },
    ice(g, yh, u) {
      const c = u[1], col = `rgb(${c.slice(0, 3).map(q => Math.round(c01(q) * 255)).join(',')})`, gr = g.createLinearGradient(0, yh, 0, H); gr.addColorStop(0, blend(col, '#ffffff', 0.5)); gr.addColorStop(0.3, col); gr.addColorStop(1, blend(col, '#0a1830', 0.35)); g.fillStyle = gr; g.fillRect(0, yh, W, H - yh);
      try { g.save(); g.globalAlpha = 0.35 * (u[0][0] || 1); g.translate(0, 2 * yh); g.scale(1, -1); g.drawImage(g.canvas, 0, max(0, yh - 150), W, min(150, yh), 0, max(0, yh - 150), W, min(150, yh)); g.restore(); } catch (_) { g.restore(); }
    }
  };
  K.GND = GND;

  /* ================= 3. LAGMALER =================
     Myke flekker (til røyk, tåke og uskarpe partikler) tegnes én gang per farge og gjenbrukes: det er mye raskere enn en fargeovergang per flekk. */
  const softs = new Map();
  const soft = col => { let c = softs.get(col); if (c) return c; c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(0.35, rgba(col, 0.62)); gr.addColorStop(0.7, rgba(col, 0.2)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); if (softs.size > 80) softs.clear(); softs.set(col, c); return c; };
  K.blob = (x, y, r, col, a, add, sy) => { if (a <= 0.004 || r <= 0) return; const g = K.g; g.save(); g.globalAlpha = c01(a); if (add) g.globalCompositeOperation = add === 1 ? 'lighter' : add; g.imageSmoothingEnabled = true; g.drawImage(soft(col), x - r, y - r * (sy || 1), r * 2, r * 2 * (sy || 1)); g.restore(); };
  /* Fjellrygg fra frø. o = { y (foten), h, seed, f (hvor urolig), oct, c0 (toppen), c1 (foten), rim, ra, x0, x1, step, cone [x, halv bredde, høyde] (en topp som stikker opp) }.
     Gir punktene langs toppen. */
  K.ridge = o => {
    const g = K.g, x0 = o.x0 == null ? -60 : o.x0, x1 = o.x1 == null ? W + 60 : o.x1, st = o.step || 6, pts = [];
    for (let x = x0; x <= x1 + st; x += st) { let hh = fbm1(x * (o.f || 0.012), o.seed || 1, o.oct) * o.h; if (o.cone) { const d = abs(x - o.cone[0]) / o.cone[1]; if (d < 1) hh = max(hh, o.cone[2] * Math.pow(1 - d, 1.25) + hh * 0.25); } pts.push([x, o.y - hh]); }
    const gr = g.createLinearGradient(0, o.y - o.h * (o.cone ? max(1, o.cone[2] / o.h) : 1), 0, o.y); gr.addColorStop(0, o.c0); gr.addColorStop(1, o.c1 || o.c0);
    g.save(); g.fillStyle = gr; g.beginPath(); g.moveTo(x0, o.y + 2); pts.forEach(q => g.lineTo(q[0], q[1])); g.lineTo(x1 + st, o.y + 2); g.closePath(); g.fill();
    if (o.rim) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = c01(o.ra == null ? 0.5 : o.ra); g.strokeStyle = o.rim; g.lineWidth = 1.5; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); }
    g.restore(); return pts;
  };
  /* Vulkan: et fjell med lange, hule sider, en skulder, og et krater med en kant som er brutt ned mot oss, så gløden syns. Ryggene og rennene nedover
     sidene er skygget, og lavaen renner i myke strømmer som følger rennene, bredest øverst. er = utbruddet (0 = ulmer, 1 = fullt utbrudd).
     o = { seed, c0 (øverst), c1 (foten), glow (lysfargen), lava (0–1 hvor mye strømmene lyser), er, t, rivers, haze (disfargen ved foten) }. Gir krateret { x, y, w }. */
  K.volcano = (x, y, w, h, o) => {
    o = o || {}; const g = K.g, t = o.t == null ? K.T : o.t, sd = o.seed || 7, cw = w * 0.085, top = y - h, er = o.er || 0, lv = o.lava == null ? 1 : o.lava, gl = o.glow || '#ff4a10', N = 44;
    /* Omrisset: venstre side lengre og slakere enn høyre, med en skulder til høyre. u = 0 i krateret, 1 ved foten. */
    const prof = (dir, u) => { const half = w * (dir < 0 ? 0.56 : 0.46), base = Math.pow(u, dir < 0 ? 1.7 : 1.5), sh = dir > 0 ? 0.06 * Math.exp(-Math.pow((u - 0.46) / 0.13, 2)) : 0; return [x + dir * (cw + (half - cw) * (base + (fbm1(u * 5 + dir * 9, sd, 3) - 0.5) * 0.05 * u)), top + h * (u - sh) + (dir < 0 ? 0 : h * 0.05 * (1 - u))]; };
    const L = [], Rr = []; for (let i = 0; i <= N; i++) { L.push(prof(-1, i / N)); Rr.push(prof(1, i / N)); }
    const rim = []; for (let i = 0; i <= 8; i++) { const k = i / 8; rim.push([mix(L[0][0], Rr[0][0], k), mix(L[0][1], Rr[0][1], k) + sin(k * PI) * h * 0.075 + (rnd(i, sd) - 0.5) * 1.6]); }
    const outline = () => { g.beginPath(); g.moveTo(L[N][0], y + 3); for (let i = N; i >= 0; i--) g.lineTo(L[i][0], L[i][1]); rim.forEach(q => g.lineTo(q[0], q[1])); for (let i = 0; i <= N; i++) g.lineTo(Rr[i][0], Rr[i][1]); g.lineTo(Rr[N][0], y + 3); g.closePath(); };
    g.save(); const gr = g.createLinearGradient(0, top, 0, y); gr.addColorStop(0, o.c0 || '#1c0d0c'); gr.addColorStop(0.7, o.c1 || '#0c0607'); gr.addColorStop(1, blend(o.c1 || '#0c0607', o.haze || '#3a1008', 0.5)); g.fillStyle = gr; outline(); g.fill();
    g.clip();
    /* Rygger og renner: striper fra toppen og ned, vekselvis i skygge og lys fra gløden. */
    for (let i = 0; i < 30; i++) { const a = (i + rnd(i, sd + 1) * 0.7) / 30, dir = a < 0.5 ? -1 : 1, sp = Math.abs(a - 0.5) * 2, x0 = x + dir * cw * sp * 0.9, x1 = x + dir * w * 0.56 * Math.pow(sp, 0.8) + (rnd(i, sd + 2) - 0.5) * 14, wd = 2 + rnd(i, sd + 3) * 7, litS = i % 2 === 0;
      g.globalAlpha = litS ? 0.07 + 0.1 * lv : 0.3; g.fillStyle = litS ? gl : '#040203'; g.beginPath(); g.moveTo(x0, top + 3); g.quadraticCurveTo(mix(x0, x1, 0.4) + dir * 6, top + h * 0.5, x1 - wd, y + 2); g.lineTo(x1 + wd, y + 2); g.quadraticCurveTo(mix(x0, x1, 0.4) + dir * 6 + wd * 0.4, top + h * 0.5, x0 + 1, top + 3); g.closePath(); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
    /* Gløden fra krateret nedover toppen. */
    K.blob(x, top + h * 0.08, w * 0.3, gl, (0.26 + 0.2 * min(1.3, er)) * lv, 1, 0.7); K.blob(x, top + h * 0.05, cw * 1.8, '#ffb040', (0.3 + 0.25 * min(1, er)) * lv, 1, 0.6);
    /* Lavastrømmene: myke kurver, brede og hvitgule øverst, smalere og rødere nedover, med lys som renner. */
    const nR = o.rivers || 4;
    for (let r = 0; r < nR; r++) {
      const dir = r % 2 ? 1 : -1, sp = 0.1 + rnd(r, sd + 3) * 0.72, len = (0.5 + rnd(r, sd + 4) * 0.5) * min(1, 0.5 + lv * 0.5 + er * 0.3), pts = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12 * len; pts.push([x + dir * (cw * 0.3 + (w * 0.5 - cw) * Math.pow(k, 1.5) * sp) + (fbm1(k * 3.2 + r * 5, sd + 5, 2) - 0.5) * w * 0.1 * k, top + h * 0.06 + h * k * 0.97]); }
      const curve = (i0, i1) => { g.beginPath(); g.moveTo(pts[i0][0], pts[i0][1]); for (let i = i0 + 1; i < i1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); g.lineTo(pts[i1][0], pts[i1][1]); };
      g.lineCap = 'round'; g.lineJoin = 'round'; const pu = 0.82 + 0.18 * sin(t * 2 + r);
      g.strokeStyle = gl; g.globalAlpha = c01(0.16 * lv * pu); g.lineWidth = 9; curve(0, 12); g.stroke();
      for (let sgm = 0; sgm < 4; sgm++) { const i0 = sgm * 3, k = sgm / 3; g.strokeStyle = blend('#ffd98a', '#ff5a14', k); g.globalAlpha = c01((0.85 - k * 0.3) * lv * pu); g.lineWidth = 3.4 - k * 1.8; curve(i0, i0 + 3); g.stroke(); if (k < 0.5) { g.strokeStyle = '#fff6d8'; g.globalAlpha = c01(0.8 * lv * (1 - k * 1.6)); g.lineWidth = 1.2; curve(i0, i0 + 3); g.stroke(); } }
      for (let d = 0; d < 3; d++) { const ph = (t * (0.14 + 0.04 * r) + d / 3 + r * 0.37) % 1, q = pts[min(12, floor(ph * 12))]; K.blob(q[0], q[1], 5.5, '#ffe9a8', (1 - ph) * lv * 0.8, 1); }
    }
    g.restore();
    /* Kanten mot himmelen får et svakt lys fra utbruddet, og foten glir over i disen. */
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = gl; g.lineWidth = 1.6; g.globalAlpha = c01((0.1 + 0.25 * min(1, er)) * lv); g.beginPath(); for (let i = 16; i >= 0; i--) i === 16 ? g.moveTo(L[i][0], L[i][1]) : g.lineTo(L[i][0], L[i][1]); rim.forEach(q => g.lineTo(q[0], q[1])); for (let i = 0; i <= 16; i++) g.lineTo(Rr[i][0], Rr[i][1]); g.stroke(); g.restore();
    return { x, y: top + h * 0.05, w: cw * 2 };
  };
  /* Det som kastes ut av et krater: en fontene av lava og glødende klumper som faller i buer, hver med en hale. er = styrken (0–1,5). o = { n, seed, hgt, wide, t }. */
  K.erupt = (x, y, er, o) => {
    if (er <= 0.01) return; o = o || {}; const g = K.g, t = o.t == null ? K.T : o.t, n = o.n || 46, sd = o.seed || 11, hg = (o.hgt || 120) * (0.5 + 0.5 * min(1.4, er)), wd = o.wide || 1, e1 = min(1, er * 1.2);
    K.blob(x, y - 6, 22 + 18 * er, '#ff5a14', 0.45 * min(1, er), 1);
    for (let j = 0; j < 10; j++) { const u = j / 9, fl = 0.72 + 0.28 * sin(t * (17 + j * 3.1) + j * 2), yy = y - hg * 0.66 * u * (0.55 + 0.45 * min(1.4, er)) * (0.9 + 0.1 * sin(t * 6 + j)); K.blob(x + sin(t * 8 + j * 1.7) * (1 + j * 0.9) * wd, yy, (9.5 - u * 4.5) * (0.7 + 0.4 * min(1.3, er)) * fl, u < 0.25 ? '#fff6d0' : u < 0.6 ? '#ffd070' : '#ff8a24', (0.8 - u * 0.35) * e1, 1, 1.7); }
    for (let i = 0; i < n; i++) {
      const a = rnd(i, sd), b = rnd(i, sd + 1), c = rnd(i, sd + 2), life = 1.1 + c * 1.5, ph = ((t / life + b) % 1), vx = (a - 0.5) * 2 * (20 + 70 * c) * wd, vy = -(1.2 + 1.4 * rnd(i, sd + 3)) * hg, gy = 1.9 * hg, k = 1 - ph, sz = (1.2 + c * 2) * (0.6 + 0.5 * er);
      for (let q = 0; q < 4; q++) { const tt = ph * life - q * 0.035, px = x + vx * tt, py = y + vy * tt + 0.5 * gy * tt * tt; if (tt < 0 || py > y + 30) continue; K.blob(px, py, sz * (2.3 - q * 0.45), q === 0 ? (k > 0.55 ? '#fff0c0' : '#ffb040') : k > 0.4 ? '#ff8a24' : '#d83a0c', c01(k * 1.5 * e1) * (1 - q * 0.22), 1); }
    }
  };
  /* Røyksøyle som velter opp. o = { n, h, w0, w1, wind, seed, spd, hot (fargen nederst, lyst opp av gløden), ha (hvor sterkt), c (røykfargen), top (skyggen øverst på hver sky), a, t, sy }. */
  K.plume = (x, y, o) => {
    o = o || {}; const g = K.g, t = o.t == null ? K.T : o.t, n = o.n || 26, sd = o.seed || 5, hh = o.h || 150, A = o.a == null ? 1 : o.a, l = [];
    if (A <= 0.004) return;
    for (let i = 0; i < n; i++) l.push([(i / n + t * (o.spd || 0.05) * (0.8 + 0.4 * rnd(i, sd))) % 1, i]);
    l.sort((p, q) => q[0] - p[0]);
    for (const [ph, i] of l) { const r = (o.w0 || 12) + ((o.w1 || 70) - (o.w0 || 12)) * Math.pow(ph, 0.8) * (0.7 + 0.6 * rnd(i, sd + 1)), px = x + (o.wind || 0) * ph * ph * hh + sin(i * 2.4 + t * 0.4) * r * 0.5 + (rnd(i, sd + 2) - 0.5) * r * 0.8, py = y - ph * hh, al = A * min(1, ph * 7) * (1 - ei(ph)) * 0.8;
      K.blob(px, py, r, blend(o.c || '#1a1214', o.hot || '#b8340c', Math.pow(1 - ph, 2.4) * 0.9), al, 0, o.sy || 0.85); if (o.hot && ph < 0.6) K.blob(px - r * 0.15, py + r * 0.42, r * 0.72, o.hot, al * (0.6 - ph) * (o.ha == null ? 0.9 : o.ha), 1, 0.55); if (o.top) K.blob(px + r * 0.2, py - r * 0.34, r * 0.6, o.top, al * 0.5, 0, 0.7); }
  };
  /* Ruiner: en søyle med rifler (fra stedsverktøyene i raidx.js). K.column(x, yb, bredde, høyde, lys, mørk, brukket). */
  if (C.stage && C.stage.column) K.column = C.stage.column;
  /* Tåkebånd mellom lagene: et bånd som driver sidelengs. o = { h, col, a, seed, spd, n, add }. */
  K.fogBand = (y, o) => { o = o || {}; const t = K.T, hh = o.h || 40, n = o.n || 7, sd = o.seed || 21, A = o.a == null ? 0.6 : o.a; for (let i = 0; i < n; i++) { const wv = 150 + rnd(i, sd) * 170, x = ((rnd(i, sd + 1) * (W + 400) + t * (o.spd == null ? 8 : o.spd) * (0.5 + rnd(i, sd + 2))) % (W + 400)) - 200; K.blob(x, y + (rnd(i, sd + 3) - 0.5) * hh * 0.6, wv, o.col || '#20202a', A * (0.5 + 0.5 * rnd(i, sd + 4)), o.add, hh / wv * (0.6 + 0.5 * rnd(i, sd + 5))); } };
  /* Grantrær i en rekke. o = { y, n, seed, h, col, snow, x0, x1, jit }. */
  K.pines = o => { const g = K.g, n = o.n || 12, sd = o.seed || 31, x0 = o.x0 == null ? -20 : o.x0, x1 = o.x1 == null ? W + 20 : o.x1; g.save(); for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + rnd(i, sd) * (o.jit == null ? 0.8 : o.jit)) / n, hh = o.h * (0.6 + 0.6 * rnd(i, sd + 1)), wv = hh * 0.34, y = o.y + (rnd(i, sd + 2) - 0.5) * (o.dy || 0); g.fillStyle = o.col; g.fillRect(x - 1.2, y - hh * 0.16, 2.4, hh * 0.16); for (let k = 0; k < 4; k++) { const yy = y - hh * (0.12 + k * 0.2), ww = wv * (1 - k * 0.2); g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x, yy - hh * 0.36); g.lineTo(x + ww, yy); g.closePath(); g.fillStyle = o.col; g.fill(); if (o.snow) { g.beginPath(); g.moveTo(x - ww * 0.62, yy - hh * 0.12); g.lineTo(x, yy - hh * 0.36); g.lineTo(x + ww * 0.3, yy - hh * 0.2); g.lineTo(x - ww * 0.1, yy - hh * 0.15); g.closePath(); g.fillStyle = o.snow; g.fill(); } } } g.restore(); };
  /* Hulevegg: tak med dryppsteiner og vegger på sidene, som en ramme rundt bildet. o = { col, c1, seed, n, depth, side }. */
  K.cave = o => { o = o || {}; const g = K.g, sd = o.seed || 41, n = o.n || 14, dp = o.depth || 70, gr = g.createLinearGradient(0, 0, 0, dp * 1.6); gr.addColorStop(0, o.col || '#0a0606'); gr.addColorStop(1, o.c1 || o.col || '#160c0a'); g.save(); g.fillStyle = gr; g.beginPath(); g.moveTo(-10, -10); g.lineTo(-10, dp * 0.5); for (let i = 0; i <= n; i++) { const x = i / n * (W + 20) - 10, base = dp * (0.25 + 0.35 * fbm1(i * 0.7, sd, 3)), tip = base + dp * (0.2 + 1.1 * Math.pow(rnd(i, sd + 1), 2)); g.lineTo(x - W / n * 0.32, base); g.lineTo(x + (rnd(i, sd + 2) - 0.5) * 5, tip); g.lineTo(x + W / n * 0.32, base); } g.lineTo(W + 10, -10); g.closePath(); g.fill(); const sw = o.side || 0; if (sw) for (const dir of [0, 1]) { g.beginPath(); g.moveTo(dir ? W + 10 : -10, -10); for (let i = 0; i <= 12; i++) { const y = i / 12 * (H + 20) - 10, xx = sw * (0.4 + 0.9 * fbm1(i * 0.6 + dir * 7, sd + 5, 3)); g.lineTo(dir ? W - xx : xx, y); } g.lineTo(dir ? W + 10 : -10, H + 10); g.closePath(); g.fill(); } g.restore(); };

  /* ================= 4. PARTIKLER MED DYBDE, OG LYS =================
     kind: 'ember' (glør som stiger), 'spark' (gnister i lange spor), 'ash' (aske som daler), 'snow', 'rain', 'leaf', 'petal', 'bubble', 'mote'.
     Hver partikkel har en dybde z (0 = langt borte: liten, skarp og treg · 1 = rett foran linsa: stor, uskarp og rask).
     o = { n, seed, cols, a, spd, y0, y1, wind, size, z [fra, til], px (kameraets sideforskyvning: de nære flytter seg mest) }. */
  K.parts = (kind, o) => {
    o = o || {}; const g = K.g, T = K.T, n = o.n || 40, sd = o.seed || 3, A = o.a == null ? 1 : o.a, cols = o.cols || ['#fff'], spd = o.spd || 1, y0 = o.y0 || 0, y1 = o.y1 == null ? H : o.y1, hh = y1 - y0, wind = o.wind || 0, zr = o.z || [0, 1], px = o.px || 0, WW = W + 120;
    if (A <= 0.004) return; const wrap = x => ((x % WW) + WW) % WW - 60, add = kind === 'ember' || kind === 'spark' || kind === 'mote' || kind === 'bubble';
    g.save(); if (add) g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = rnd(i, sd), b = rnd(i, sd + 1), c = rnd(i, sd + 2), d = rnd(i, sd + 3), z = mix(zr[0], zr[1], c), zz = z * z, sz = (o.size || 1) * (1 + zz * 4.5), near = z > 0.7, pz = px * (0.15 + zz * 1.6);
      if (kind === 'ember' || kind === 'spark') {
        const v = spd * (0.07 + 0.2 * zz + 0.08 * d) * (kind === 'spark' ? 2.2 : 1), ph = (b + T * v) % 1, sway = sin(T * (1 + d * 2) + a * 30) * (5 + 16 * zz), x = wrap(a * WW + sway + wind * ph * (90 + 260 * zz) + pz), y = y1 - ph * hh * (0.55 + 0.45 * d);
        const life = Math.pow(sin(ph * PI), 0.6), fl = 0.65 + 0.35 * sin(T * (9 + d * 8) + a * 50), col = cols[min(cols.length - 1, floor(ph * 1.15 * cols.length))], al = c01(A * life * fl * (near ? 0.75 : 1));
        if (kind === 'spark') { const L = (10 + 34 * zz) * (0.6 + d); g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = max(1, sz * 0.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x - wind * L * 0.5 - cos(T * (1 + d * 2) + a * 30) * 3, y + L); g.stroke(); }
        else if (near) { g.globalAlpha = al; g.drawImage(soft(col), x - sz * 1.7, y - sz * 1.7, sz * 3.4, sz * 3.4); }
        else { g.globalAlpha = al; g.fillStyle = col; const q = max(1, Math.round(sz)); g.fillRect(floor(x), floor(y), q, q); }
      } else if (kind === 'ash' || kind === 'snow') {
        const v = spd * (0.03 + 0.09 * zz + 0.03 * d), ph = (b + T * v) % 1, x = wrap(a * WW + sin(T * (0.5 + d) + a * 20) * (8 + 22 * zz) + wind * T * (20 + 70 * zz) + pz), y = y0 + ph * hh, col = cols[i % cols.length], al = c01(A * (0.45 + 0.5 * d) * min(1, sin(ph * PI) * 4));
        g.globalAlpha = al * (near ? 0.6 : 1);
        if (near || kind === 'snow' && z > 0.45) g.drawImage(soft(col), x - sz * 1.4, y - sz * 1.4, sz * 2.8, sz * 2.8);
        else { g.fillStyle = col; const q = max(1, Math.round(sz)); g.fillRect(floor(x), floor(y), q, kind === 'ash' ? max(1, Math.round(q * (0.4 + 0.6 * abs(sin(T * (2 + d * 3) + a * 9))))) : q); }
      } else if (kind === 'rain') {
        const v = spd * (0.9 + 1.5 * zz + 0.4 * d), ph = (b + T * v) % 1, L = (8 + 46 * zz) * (0.7 + 0.5 * d), x = wrap(a * WW + wind * ph * (60 + 220 * zz) + pz), y = y0 - L + ph * (hh + L * 2);
        g.globalAlpha = c01(A * (0.2 + 0.5 * z) * (0.6 + 0.4 * d)); g.strokeStyle = cols[i % cols.length]; g.lineWidth = 0.7 + zz * 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + wind * L * 0.42, y + L); g.stroke();
      } else if (kind === 'leaf' || kind === 'petal') {
        const v = spd * (0.05 + 0.1 * zz + 0.03 * d), ph = (b + T * v) % 1, x = wrap(a * WW + ph * (120 + 300 * zz) * (wind || 1) + sin(T * 1.5 + d * 20) * (10 + 20 * zz) + pz), y = y0 + ph * hh + sin(T * 2 + a * 20) * 8, s = sz * (kind === 'petal' ? 2.2 : 3) * (0.7 + 0.6 * d);
        g.globalAlpha = c01(A * min(1, sin(ph * PI) * 3) * (near ? 0.7 : 1)); g.fillStyle = cols[i % cols.length]; g.save(); g.translate(x, y); g.rotate(T * (1 + d * 2) + a * 9); g.scale(1, 0.4 + 0.45 * sin(T * 3 + d * 9)); g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * (kind === 'petal' ? 1.1 : 0.8), s, 0); g.quadraticCurveTo(0, s * (kind === 'petal' ? 0.5 : 0.8), -s, 0); g.fill(); g.restore();
      } else if (kind === 'bubble') {
        const ph = (b + T * spd * (0.08 + 0.16 * zz)) % 1, x = wrap(a * WW + sin(T * (1 + d * 2) + a * 30) * (6 + 10 * zz) + pz), y = y1 - ph * hh, r = sz * (1.2 + d * 1.6); g.globalAlpha = c01(A * sin(ph * PI) * (0.5 + 0.4 * z)); g.strokeStyle = cols[i % cols.length]; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.fillStyle = '#fff'; g.fillRect(x - r * 0.4, y - r * 0.5, max(1, r * 0.3), max(1, r * 0.3));
      } else {
        const x = wrap(a * WW + sin(T * 0.3 * spd + c * 30) * (10 + 20 * zz) + pz), y = y0 + b * hh + cos(T * 0.25 * spd + d * 30) * (8 + 12 * zz), k = 0.5 + 0.5 * sin(T * (1 + c * 2.5) * spd + d * 40), col = cols[i % cols.length]; g.globalAlpha = c01(A * k * k * (near ? 0.6 : 1));
        if (z > 0.5) g.drawImage(soft(col), x - sz * 1.5, y - sz * 1.5, sz * 3, sz * 3); else { g.fillStyle = col; const q = max(1, Math.round(sz)); g.fillRect(floor(x), floor(y), q, q); }
      }
    }
    g.restore();
  };
  /* Sprut der regnet treffer en flate (vann, is, stein): små ringer i bakkens perspektiv. o = { n, seed, col, a, zmax }. */
  K.splash = o => { o = o || {}; const g = K.g, T = K.T, n = o.n || 30, sd = o.seed || 61; g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = o.col || '#cfe8ff'; g.lineWidth = 1; for (let i = 0; i < n; i++) { const life = 0.35 + rnd(i, sd) * 0.3, q = floor(T / life + rnd(i, sd + 1)), ph = (T / life + rnd(i, sd + 1)) % 1, Z = ST.cz + 40 + Math.pow(rnd(i * 3 + q, sd + 2), 1.6) * (o.zmax || 700), p = K.gp(ST.cx + (rnd(i * 5 + q, sd + 3) - 0.5) * 560 * (Z - ST.cz) / ST.f, Z); if (!p || p.y > H) continue; const r = (2 + ph * 9) * min(2.2, p.s); g.globalAlpha = c01((o.a == null ? 0.6 : o.a) * (1 - ph)); g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.3, 0, 0, TAU); g.stroke(); if (ph < 0.3) g.fillRect(p.x, p.y - (0.3 - ph) * 16 * min(2, p.s), 1, 2); } g.restore(); };
  /* Dråper på «linsa»: et forvrengningskart (P.warp) der hver dråpe bryter bildet som en liten linse. Dråpene lander, blir sittende litt og siger nedover.
     o = { n, seed, a (styrke i piksler), size, life }. Kalles én gang per bilde; kartet tegnes på et lite lerret og lastes opp av fxgl.js. */
  let dropSpr = null, dropMap = null;
  K.lensDrops = o => {
    o = o || {}; const T = K.T, n = o.n || 14, sd = o.seed || 71;
    if (!dropSpr) { dropSpr = document.createElement('canvas'); dropSpr.width = dropSpr.height = 48; const x = dropSpr.getContext('2d'), im = x.createImageData(48, 48); for (let y = 0; y < 48; y++) for (let xx = 0; xx < 48; xx++) { const dx = (xx - 23.5) / 24, dy = (y - 23.5) / 24, r = Math.hypot(dx, dy), k = r < 1 ? Math.pow(r, 1.5) : 0, i = (y * 48 + xx) * 4; im.data[i] = 128 + dx / (r || 1) * k * 127; im.data[i + 1] = 128 + dy / (r || 1) * k * 127; im.data[i + 2] = 0; im.data[i + 3] = r < 1 ? 255 * min(1, (1 - r) * 5) : 0; } x.putImageData(im, 0, 0); }
    if (!dropMap) { dropMap = document.createElement('canvas'); dropMap.width = 256; dropMap.height = 192; dropMap._v = 0; }
    const x = dropMap.getContext('2d'); x.globalCompositeOperation = 'copy'; x.fillStyle = 'rgb(128,128,0)'; x.fillRect(0, 0, 256, 192); x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = true;
    for (let i = 0; i < n; i++) { const life = (o.life || 2.4) * (0.6 + rnd(i, sd)), q = floor(T / life + rnd(i, sd + 1)), ph = (T / life + rnd(i, sd + 1)) % 1, r = (o.size || 9) * (0.5 + rnd(i * 3 + q, sd + 2)), px = rnd(i * 5 + q, sd + 3) * 256, py = rnd(i * 7 + q, sd + 4) * 170 + ph * ph * 30; x.globalAlpha = c01(min(1, ph * 12) * (1 - ei(ph))); x.drawImage(dropSpr, px - r, py - r * 1.15, r * 2, r * 2.3); }
    x.globalAlpha = 1; dropMap._v++; K.P.warp = { map: dropMap, a: o.a == null ? 9 : o.a }; return dropMap;
  };
  /* En lysstråle fra (x, y) i retningen ang (0 = rett ned), len lang, w0 bred ved kilden og w1 i enden. */
  K.shaft = (x, y, ang, len, w0, w1, col, a) => { if (a <= 0.004) return; const g = K.g; g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(ang); const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, rgba(col, c01(a))); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; for (const k of [1, 0.55]) { g.globalAlpha = k === 1 ? 0.5 : 1; g.beginPath(); g.moveTo(-w0 * k / 2, 0); g.lineTo(w0 * k / 2, 0); g.lineTo(w1 * k / 2, len); g.lineTo(-w1 * k / 2, len); g.closePath(); g.fill(); } g.restore(); };
  /* Regnbue: en bue med sju bånd. k = hvor mye av buen som er tegnet (0–1). */
  K.rainbow = (x, y, r, o) => { o = o || {}; const g = K.g, cols = o.cols || ['#ff4a4a', '#ff9a3a', '#ffe14a', '#5ad85a', '#4aa8ff', '#5a5aff', '#b05aff'], w = o.w || r * 0.012 + 2, k = o.k == null ? 1 : c01(o.k); g.save(); g.globalCompositeOperation = o.add === 0 ? 'source-over' : 'lighter'; g.lineWidth = w + 0.5; cols.forEach((c, i) => { g.globalAlpha = c01(o.a == null ? 0.5 : o.a); g.strokeStyle = c; g.beginPath(); g.arc(x, y, r - i * w, PI, PI + PI * k); g.stroke(); }); g.restore(); };

  /* ================= 5. PLAKATEN, SKALABILDET OG TREFFBILDET =================
     Navneplakaten har samme plass og lesbarhet for alle (undertittel, navn, nivå), men er laget av stedets materiale. Starter i t0.
     o = { mat ('stone', 'water', 'frost' … eller ingenting = penselstrøket fra før), col, y }. Alt viktig ligger innenfor x 64–448. */
  const PLATE = {};
  K.PLATE = PLATE;
  K.plate = (t0, o) => { o = o || {}; const T = K.T; if (T < t0) return; const m = PLATE[o.mat]; if (!m) return K.card(t0, o); const cur = K.cur; m({ t: T - t0, y: o.y || 316, col: o.col || cur.cc, name: (cur.name || '').toUpperCase(), cap: (o.cap || cur.cap || '').toUpperCase(), lv: cur.lv ? 'Lv ' + cur.lv : '', o }); };
  /* Tekst fylt med et mønster eller en fargeovergang (fill = det som settes som fillStyle), med bokstavavstand. Gir bredden. */
  const txtW = (s, size, ls) => { const g = K.g, f = K.fontN(); g.save(); g.font = `${f[1]}${size * (f[1] ? 0.74 : 1)}px ${f[0]}`; let w = 0; for (const ch of s) w += g.measureText(ch).width + ls; g.restore(); return w - ls; };
  const txtF = (s, x, y, size, ls, fill, a) => { const g = K.g, f = K.fontN(); g.save(); g.font = `${f[1]}${size * (f[1] ? 0.74 : 1)}px ${f[0]}`; g.textBaseline = 'alphabetic'; g.globalAlpha = c01(a == null ? 1 : a); g.fillStyle = fill; let xx = x - txtW(s, size, ls) / 2; for (const ch of s) { g.fillText(ch, xx, y); xx += g.measureText(ch).width + ls; } g.restore(); };
  K.txtF = txtF; K.txtW = txtW;
  /* STEIN MED LAVA INNI: en basalthelle slår ned, navnet er sprekker fylt av lava som gløder hvitt i slaget og kjølner til oransje, og sprekker brer seg fra bokstavene. */
  PLATE.stone = ({ t, y, col, name, cap, lv }) => {
    const g = K.g, e = eo(seg(t, 0, 0.26)), slam = seg(t, 0.1, 0.32), cool = seg(t, 0.3, 1.7), top = y - 60, bot = y + 36, dy = (1 - e) * 90, hot = 1 - cool * 0.6, nw = txtW(name, 52, 3) / 2 + 14;
    g.save(); g.translate(0, dy); g.globalAlpha = c01(e * 1.4);
    const edge = (yy, sd, amp) => { const p = []; for (let x = 40; x <= 472; x += 12) p.push([x, yy + (fbm1(x * 0.05, sd, 3) - 0.5) * amp]); return p; }, up = edge(top, 71, 9), dn = edge(bot, 73, 8).reverse(), path = (dx, ddy) => { g.beginPath(); up.concat(dn).forEach((q, i) => i ? g.lineTo(q[0] + dx, q[1] + ddy) : g.moveTo(q[0] + dx, q[1] + ddy)); g.closePath(); };
    const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, '#332726'); gr.addColorStop(0.3, '#1d1516'); gr.addColorStop(1, '#0d090a');
    g.fillStyle = 'rgba(0,0,0,.5)'; path(3, 6); g.fill(); g.fillStyle = gr; path(0, 0); g.fill(); g.save(); g.clip();
    for (let i = 0; i < 50; i++) { g.globalAlpha = 0.1 + rnd(i, 5) * 0.14; g.fillStyle = i % 3 ? '#000' : '#5a4642'; g.fillRect(40 + rnd(i, 6) * 432, top - 6 + rnd(i, 7) * 104, 6 + rnd(i, 8) * 30, 1 + rnd(i, 9) * 2); }
    g.globalAlpha = 0.55; g.strokeStyle = '#6a5550'; g.lineWidth = 1; g.beginPath(); up.forEach((q, i) => i ? g.lineTo(q[0], q[1] + 1.5) : g.moveTo(q[0], q[1] + 1.5)); g.stroke();
    /* Sprekkene åpner seg etter slaget, fra kantene av navnet og utover mot endene av hella. De krysser aldri bokstavene. */
    const n = floor(seg(t, 0.16, 0.7) * 8); g.globalAlpha = 1;
    for (let i = 0; i < n; i++) { const dir = i % 2 ? 1 : -1, x0 = 256 + dir * (nw + 2), y0 = y - 34 + rnd(i, 21) * 34, L = 30 + rnd(i, 23) * (190 - nw) * 0.9; K.bolt(x0, y0, x0 + dir * L, y0 + (rnd(i, 25) - 0.5) * 44, { seed: i * 7 + 3, col: '#ff4a10', core: blend('#ff9a3a', '#ffe9b0', hot), w: 1, a: 0.5 * hot + 0.22, depth: 4, jag: 0.3 }); }
    g.restore();
    txtF(cap, 256, y - 37, 17, 5, '#000', 0.8 * seg(t, 0.1, 0.4)); txtF(cap, 256, y - 38, 17, 5, blend('#b89a86', col, 0.4), seg(t, 0.1, 0.4));
    if (slam > 0) {
      const z = mix(2.2, 1, eo(slam)), lg = g.createLinearGradient(0, -40, 0, 6); lg.addColorStop(0, blend('#ffe9a8', '#ffffff', hot)); lg.addColorStop(0.6, blend('#ffb23c', '#fff2c0', hot * 0.8)); lg.addColorStop(1, blend('#f0661a', '#ffc45a', hot * 0.7));
      g.save(); g.translate(256, y); g.scale(z, z);
      for (const [dx, ddy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [3, 4]]) txtF(name, dx, ddy, 52, 3, '#090304', 0.9 * slam);
      txtF(name, 0, 0, 52, 3, lg, slam); g.restore();
    }
    if (lv) { txtF(lv, 256, y + 27, 19, 2, '#000', 0.8 * seg(t, 0.3, 0.55)); txtF(lv, 256, y + 26, 19, 2, '#ecd2b8', seg(t, 0.3, 0.55)); }
    g.restore();
    if (t > 0.1 && t < 0.7) { K.blob(256, y - 14, 230, '#ff6a1c', (1 - seg(t, 0.1, 0.5)) * 0.3, 1, 0.22); for (let i = 0; i < 14; i++) { const k = seg(t, 0.12, 0.7), an = -PI * (0.1 + 0.8 * rnd(i, 31)), d = k * (40 + rnd(i, 32) * 70); K.blob(60 + rnd(i, 33) * 392 + cos(an) * d * 0.4, bot + sin(an) * d * 0.5, 10 + k * 16, '#3a2a26', (1 - k) * 0.5); } }
  };
  /* VANN: skriften ligger i overflaten, med krusninger som går ut fra den og drypp fra bokstavene. */
  PLATE.water = ({ t, y, col, name, cap, lv }) => {
    const g = K.g, e = eo(seg(t, 0, 0.4)), slam = seg(t, 0.12, 0.4), T = K.T;
    g.save(); g.globalAlpha = e; const gr = g.createLinearGradient(0, y - 66, 0, y + 40); gr.addColorStop(0, 'rgba(4,20,40,0)'); gr.addColorStop(0.25, 'rgba(4,20,40,.72)'); gr.addColorStop(0.8, 'rgba(4,20,40,.72)'); gr.addColorStop(1, 'rgba(4,20,40,0)'); g.fillStyle = gr; g.fillRect(0, y - 66, W, 106); g.restore();
    for (let i = 0; i < 4; i++) { const k = ((t * 0.5 + i / 4) % 1); K.ring(256, y - 12, 40 + k * 250, { col: blend(col, '#ffffff', 0.5), w: 1.5, a: (1 - k) * 0.4 * e, sy: 0.16 }); }
    txtF(cap, 256, y - 38, 17, 5, blend(col, '#ffffff', 0.55), seg(t, 0.1, 0.45));
    if (slam > 0) { const w = txtW(name, 52, 3); for (let x = 0; x < 14; x++) { const xx = 256 - w / 2 + rnd(x, 81) * w, ph = (T * (0.5 + rnd(x, 82) * 0.6) + rnd(x, 83)) % 1; K.rect(xx, y + 2 + ph * 24, 1.5, 3 + ph * 5, '#cfe8ff', (1 - ph) * 0.8 * slam, 1); }
      g.save(); g.translate(256, y + sin(T * 1.7) * 1.2); const lg = g.createLinearGradient(0, -40, 0, 6); lg.addColorStop(0, '#ffffff'); lg.addColorStop(1, blend(col, '#ffffff', 0.35)); txtF(name, 2, 3, 52, 3, 'rgba(0,10,24,.85)', slam); txtF(name, 0, 0, 52, 3, lg, slam); g.restore(); }
    if (lv) txtF(lv, 256, y + 26, 19, 2, '#dff0ff', seg(t, 0.3, 0.6));
  };
  /* RIM: skriften fryser fram, med iskrystaller som vokser ut fra kantene på plakaten. */
  PLATE.frost = ({ t, y, col, name, cap, lv }) => {
    const g = K.g, e = eo(seg(t, 0, 0.5)), slam = seg(t, 0.15, 0.5);
    g.save(); g.globalAlpha = e; const gr = g.createLinearGradient(0, y - 66, 0, y + 40); gr.addColorStop(0, 'rgba(210,235,255,0)'); gr.addColorStop(0.25, 'rgba(14,34,62,.74)'); gr.addColorStop(0.8, 'rgba(14,34,62,.74)'); gr.addColorStop(1, 'rgba(210,235,255,0)'); g.fillStyle = gr; g.fillRect(0, y - 66, W, 106); g.restore();
    for (let i = 0; i < 26; i++) { const sd = i % 2, x0 = sd ? 470 - rnd(i, 91) * 20 : 42 + rnd(i, 91) * 20, yy = y - 58 + rnd(i, 92) * 90, L = (20 + rnd(i, 93) * 70) * eo(seg(t, 0.05 + rnd(i, 94) * 0.3, 0.9)), an = (sd ? PI : 0) + (rnd(i, 95) - 0.5) * 0.9; if (L > 1) K.bolt(x0, yy, x0 + cos(an) * L, yy + sin(an) * L, { seed: i * 5 + 1, col: '#bfe6ff', core: '#ffffff', w: 0.9, a: 0.7, depth: 3, jag: 0.22, br: 2 }); }
    txtF(cap, 256, y - 38, 17, 5, blend(col, '#ffffff', 0.6), seg(t, 0.1, 0.45));
    if (slam > 0) { const lg = g.createLinearGradient(0, y - 40, 0, y + 6); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.6, '#d8f0ff'); lg.addColorStop(1, '#8ac4f0'); txtF(name, 258, y + 3, 52, 3, 'rgba(4,16,40,.85)', slam); txtF(name, 256, y, 52, 3, lg, slam); }
    if (lv) txtF(lv, 256, y + 26, 19, 2, '#e8f8ff', seg(t, 0.3, 0.6));
  };
  /* Skalabildet: en liten trener sett bakfra, i silhuett, som viser hvor stor den legendariske er. (x, y) = føttene, h = høyden.
     o = { col, rim (lysfargen på kanten mot lyset), ra, wind (−1..1: skjerfet), lean (helning), flip }. */
  K.trainer = (x, y, h, o) => {
    o = o || {}; const g = K.g, u = h / 24, t = K.T, c = o.col || '#06060a', w = o.wind || 0;
    g.save(); g.translate(Math.round(x), Math.round(y)); if (o.flip) g.scale(-1, 1); if (o.lean) g.rotate(o.lean); g.scale(u, u); g.globalAlpha = c01(o.a == null ? 1 : o.a);
    /* Tegnet i 24 enheter fra føttene (0) til toppen av hodet (−24): bein litt fra hverandre, jakke, sekk, armer ut fra kroppen, hode med hårtust, og et skjerf i vinden. */
    const body = () => {
      g.beginPath(); g.moveTo(-3.4, 0); g.lineTo(-2.9, -9.4); g.lineTo(-0.3, -9.4); g.lineTo(-0.9, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(0.9, 0); g.lineTo(0.3, -9.4); g.lineTo(2.9, -9.4); g.lineTo(3.4, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-3.2, -9); g.lineTo(-3.9, -16.6); g.quadraticCurveTo(0, -18.6, 3.9, -16.6); g.lineTo(3.2, -9); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-3.8, -16.4); g.lineTo(-5.6, -10.4); g.lineTo(-4.5, -10); g.lineTo(-2.9, -15); g.closePath(); g.fill(); g.beginPath(); g.moveTo(3.8, -16.4); g.lineTo(5.6, -10.4); g.lineTo(4.5, -10); g.lineTo(2.9, -15); g.closePath(); g.fill();
      g.fillRect(-2.5, -16, 5, 5.6); g.beginPath(); g.arc(0, -20.2, 2.9, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-2.6, -21.6); g.quadraticCurveTo(-0.4, -25.2, 3.1, -22.4); g.lineTo(2.6, -20.6); g.closePath(); g.fill();
      const sw = sin(t * 5) * 0.7; g.beginPath(); g.moveTo(-1.6, -17.9); g.quadraticCurveTo(w * 4, -18.6 + sw, w * 8, -16.8 + sw * 1.6); g.lineTo(w * 7.4, -15.4 + sw * 1.4); g.quadraticCurveTo(w * 3.4, -16.8 + sw, -1.6, -16.4); g.closePath(); g.fill();
    };
    if (o.rim) { g.fillStyle = o.rim; g.save(); g.translate(0.8, -0.5); g.globalAlpha *= c01(o.ra == null ? 0.9 : o.ra); body(); g.restore(); }
    g.fillStyle = c; body(); g.restore();
  };
  /* Fartsstreker ut fra et punkt (til treffbildet og store slag). o = { n, seed, col, r0, a, w }. */
  K.speed = (x, y, o) => { o = o || {}; const g = K.g, n = o.n || 46, sd = o.seed || 77; g.save(); g.globalAlpha = c01(o.a == null ? 1 : o.a); g.fillStyle = o.col || '#fff'; g.beginPath(); for (let i = 0; i < n; i++) { const an = (i + rnd(i, sd) * 0.8) / n * TAU, wd = (0.004 + rnd(i, sd + 1) * 0.02) * (o.w || 1), r0 = (o.r0 || 70) * (0.7 + rnd(i, sd + 2) * 1.1), r1 = 760; g.moveTo(x + cos(an) * r0, y + sin(an) * r0); g.lineTo(x + cos(an - wd) * r1, y + sin(an - wd) * r1); g.lineTo(x + cos(an + wd) * r1, y + sin(an + wd) * r1); g.closePath(); } g.fill(); g.restore(); };
  /* Treffbildet: i det et stort slag treffer, to–tre bilder i ren svart og hvitt med fartsstreker ut fra treffpunktet, og så tilbake til farger.
     Kalles sist i filmens tegning. Gir true mens det varer. o = { len (sekunder, standard 0,13), r0, seed }. */
  K.impact = (t0, x, y, o) => {
    o = o || {}; const T = K.T, P = K.P, len = o.len || 0.13, k = (T - t0) / len; if (k < 0 || k >= 1) return false;
    const ph = floor(k * 3); P.mono = 1; P.monoT = o.thr == null ? 0.4 : o.thr; P.inv = ph === 1 ? 1 : 0; P.bloom = 0; P.grain = 0; P.heat = 0;
    K.speed(x, y, { col: '#fff', r0: (o.r0 || 60) * (1 + ph * 0.5), seed: (o.seed || 7) + ph * 3, n: 40 + ph * 8 }); K.speed(x, y, { col: '#000', r0: (o.r0 || 60) * (1.6 + ph * 0.5), seed: (o.seed || 7) + 20 + ph * 3, n: 26, w: 0.7 });
    return true;
  };
})();
