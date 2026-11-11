'use strict';
/* Fokusdex – det som skjer rundt de legendariske i selve kampen (motoren ligger i raid.js, filmene og motivene i raidf.js):
   1. Entréen: hver legendarisk kommer inn på sin egen måte i det kampen starter ('in:<slag>').
   2. Stedet kjemper med: en hendelse hver tredje runde, og raseriet når den er nede i halv HP ('ev:<slag>'). Reglene står i league.js (DOM).
   3. Stedet selv: de store har sitt eget sted tegnet bak plattformene (film.bg), med egne farger på plattformene (film.plat).
   4. Varselet før de aller sjeldneste ('omen'), og filmen til Dark Mewtwo.
   Effektene tegnes gjennomsiktig over banen på 512 × 384. o.x, o.y = føttene til den legendariske, o.mx, o.my = føttene til din Pokémon, o.cc = fargen,
   o.s = størrelsen figuren har på banen. Hver effekt har «cues» som kampskjermen gjør om til lyd, risting og vibrasjon. */
(() => {
  const K = CINE.kit, M = CINE.M, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, pulse, io, eo, ei, rnd, rgba, blend, fill, lin, glow, im, tintArt, cover, strip, spr, aura, bolt, rays, ring, wave, poly, rect, beam, stars, dust, fog, txt, vig, card, shatter, onAux, film, fx } = K;
  const { hits, island, gWorld, wheel, aPlates, storm, mRock, shard, DSH, blackSun, dVoid, sea, lava, clock, cog, grid, pScene, flames, frost, falls, aurora, helix, REGD } = M;
  /* Tones inn mellom a og b, og ut mellom c og d. */
  const env = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));
  /* Skyggen av den legendariske der den skal stå (føttene i o.x, o.y). */
  const sil = (o, col, a, k) => spr(o.x, o.y, (o.s || 1.85) * (k || 1), { col, a, ay: 1 });
  const disc = (x, y, r, col, a) => { if (r <= 0) return; const X = K.g; X.save(); X.globalAlpha = c01(a == null ? 1 : a); X.fillStyle = col; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); X.restore(); };
  /* En spiss (istapp) fra (x0, y0) i retningen ang. */
  const spike = (x0, y0, ang, len, w, c0, c1, a) => { if (a <= 0.01) return; const tx = x0 + cos(ang) * len, ty = y0 + sin(ang) * len, nx = -sin(ang) * w, ny = cos(ang) * w; poly([[x0 + nx, y0 + ny], [tx, ty], [x0 - nx, y0 - ny]], c0, a); poly([[x0 + nx, y0 + ny], [tx, ty], [x0, y0]], c1, a * 0.7); };
  /* Et blad eller kronblad. */
  const leaf = (x, y, s, r, col, a) => { const X = K.g; X.save(); X.translate(x, y); X.rotate(r); X.globalAlpha = c01(a); X.fillStyle = col; X.beginPath(); X.moveTo(-s, 0); X.quadraticCurveTo(0, -s * 0.8, s, 0); X.quadraticCurveTo(0, s * 0.8, -s, 0); X.fill(); X.restore(); };

  /* ================= ENTRÉENE ================= */
  /* Lyn: tre forvarsler i det fjerne, ladningen samler seg, og så slår hovedlynet ned der den står. */
  fx('in:bolt', { len: 2.1, R: 1.1, cues: [[0.2, 'tick'], [0.5, 'tick'], [0.8, 'tick'], [1.1, 'boom'], [1.1, 'sfx', 'Thunder']],
    draw(t, o) {
      const x = o.x, y = o.y, by = y - 56, cc = o.cc, dk = env(t, 0, 0.3, 1.3, 2.05), ch = seg(t, 0.3, 1.1), h = hit(t, 1.1, 0.5);
      fill('#03040e', 0.64 * dk);
      [[0.2, 90], [0.5, 470], [0.8, 250]].forEach(([q, bx], i) => { const f = hit(t, q, 0.22); if (f > 0) { bolt(bx, -10, bx + (i - 1) * 30, 150 + i * 30, { seed: i * 7 + floor(t * 30), col: cc, w: 1.6, a: f, br: 2 }); fill(cc, f * 0.12); } });
      if (t < 1.1) for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * 5, r = mix(120, 14, ei(ch)); glow(x + cos(an) * r, by + sin(an) * r * 0.6, 12, cc, 0.85 * ch, 1); }
      if (h > 0) { for (let i = 0; i < 3; i++) bolt(x + (i - 1) * 46, -10, x, y - 8, { seed: 40 + i + floor(t * 24), col: cc, w: 3.4 - i, a: h, br: 3 }); glow(x, by, 190, '#fff', h * 0.8, 1); fill('#fff', hit(t, 1.1, 0.18) * 0.85); }
      wave(1.1, x, y, { col: cc, r: 300, d: 0.7, w: 10, sy: 0.32 });
      if (t > 1.1) for (let i = 0; i < 4; i++) { const q = floor(t * 14 + i * 3), an = rnd(q, i) * TAU; bolt(x + cos(an) * 20, by + sin(an) * 20, x + cos(an) * (70 + rnd(q, i + 2) * 40), by + sin(an) * (60 + rnd(q, i + 3) * 30), { seed: q + i, col: cc, w: 1.2, a: (1 - seg(t, 1.2, 2.0)) * 0.9, depth: 3 }); }
    } });
  /* Is: snøkav, en krystall som vokser der den skal stå, sprekker i takt, og knuser. */
  fx('in:ice', { len: 2.3, R: 1.3, cues: [[0.15, 'wind'], [0.95, 'tick'], [1.12, 'tick'], [1.3, 'boom'], [1.3, 'sfx', 'Blizzard']],
    draw(t, o) {
      const x = o.x, y = o.y, grow = eo(seg(t, 0.15, 1.15)), dk = env(t, 0, 0.3, 1.4, 2.25), br = seg(t, 1.3, 2.0);
      fill('#06142a', 0.52 * dk); frost(grow * 0.8, 0.7 * dk);
      dust('snow', { n: 120, seed: 3, cols: ['#fff', '#d8f4ff'], a: 0.9 * dk, spd: 4, wind: -2.2 });
      if (t < 1.3) {
        glow(x, y - 60, 130, '#bfe6ff', 0.45 * grow, 1);
        for (let i = 0; i < 5; i++) { const dx = (i - 2) * 22, hh = (150 - abs(i - 2) * 34) * grow * (0.85 + 0.15 * rnd(i, 3)), w = 20 - abs(i - 2) * 3; poly([[x + dx - w, y + 6], [x + dx - w * 0.6, y - hh * 0.8], [x + dx, y - hh], [x + dx + w * 0.6, y - hh * 0.8], [x + dx + w, y + 6]], i % 2 ? '#bfe6ff' : '#e8f8ff', 0.9); poly([[x + dx - w * 0.6, y - hh * 0.8], [x + dx, y - hh], [x + dx, y + 6], [x + dx - w, y + 6]], '#7ab8e8', 0.5); }
        sil(o, '#1c4a7a', 0.55 * seg(t, 0.7, 1.2));
        for (let i = 0; i < floor(seg(t, 0.9, 1.3) * 7); i++) bolt(x + (rnd(i, 5) - 0.5) * 60, y - 20 - rnd(i, 6) * 100, x + (rnd(i, 7) - 0.5) * 90, y - 10 - rnd(i, 8) * 120, { seed: i * 3, col: '#fff', core: '#fff', w: 1, a: 0.9, depth: 3, jag: 0.4 });
        fill('#fff', hits(t, [0.95, 1.12], 0.12) * 0.22);
      } else {
        for (let i = 0; i < 24; i++) { const an = rnd(i, 11) * TAU, d = eo(br) * (60 + rnd(i, 12) * 190), sx = x + cos(an) * d, sy = y - 60 + sin(an) * d * 0.8 + br * br * 60, s = 5 + rnd(i, 13) * 11, r = an + br * 4; poly([[sx + cos(r) * s, sy + sin(r) * s], [sx + cos(r + 2.3) * s * 0.6, sy + sin(r + 2.3) * s * 0.6], [sx + cos(r + 4) * s * 0.7, sy + sin(r + 4) * s * 0.7]], i % 2 ? '#e8f8ff' : '#9fd0ff', 1 - br); }
        fill('#e8f8ff', hit(t, 1.3, 0.25) * 0.8); wave(1.3, x, y - 50, { col: '#e8f8ff', r: 280, d: 0.7, w: 9 });
      }
    } });
  /* Magma: bakken sprekker og gløder, og en søyle av lava bryter opp der den står. */
  fx('in:magma', { len: 2.3, R: 1.2, cues: [[0.2, 'rumble'], [1.2, 'boom'], [1.2, 'sfx', 'Eruption']],
    draw(t, o) {
      const x = o.x, y = o.y, pre = seg(t, 0, 1.2), dk = env(t, 0, 0.3, 1.5, 2.25), er = hit(t, 1.2, 1.0);
      fill('#1a0400', 0.52 * dk);
      glow(x, y, 60 + pre * 110, '#ff5a14', 0.7 * pre * (t < 1.2 ? 1 : er), 1);
      for (let i = 0; i < 7; i++) { const an = (i / 6 - 0.5) * 2.6 + PI / 2, L = (60 + rnd(i, 3) * 90) * eo(seg(t, 0.1 + i * 0.1, 0.5 + i * 0.1)); if (L > 1) bolt(x, y + 4, x + cos(an) * L * 1.7, y + 4 + abs(sin(an)) * L * 0.2, { seed: i * 5 + 2, col: '#ff7a1a', core: '#ffe9a8', w: 2, a: 0.9 * (1 - seg(t, 1.4, 2.2)), depth: 3, jag: 0.3 }); }
      dust('ember', { n: 70, seed: 4, cols: ['#ff7a2a', '#ffd070', '#fff'], a: dk, spd: 2.4, y1: y + 20 });
      if (er > 0) {
        const w = 24 + er * 60; beam(x, w, -10, y + 10, '#ff5a14', er, '#fff2c0'); beam(x, w * 0.5, -10, y + 10, '#ffd070', er * 0.8, '#fff');
        for (let i = 0; i < 10; i++) { const ph = (rnd(i, 21) + t * 2.2) % 1, sx = x + (rnd(i, 22) - 0.5) * w * 1.6; glow(sx, y - ph * 260, 22 * (1 - ph) + 6, i % 2 ? '#ff7a1a' : '#ffd070', er * (1 - ph), 1); }
        fill('#ff8a2a', hit(t, 1.2, 0.2) * 0.6);
      }
      wave(1.2, x, y, { col: '#ffb040', r: 320, d: 0.8, w: 12, sy: 0.32 });
    } });
  /* Hav: regn, ringer i vannet, en vannsøyle som reiser seg og bryter. */
  fx('in:sea', { len: 2.3, R: 1.25, cues: [[0.3, 'rumble'], [1.25, 'boom'], [1.25, 'sfx', 'Surf']],
    draw(t, o) {
      const x = o.x, y = o.y, cc = o.cc, dk = env(t, 0, 0.3, 1.5, 2.25), up = eo(seg(t, 0.35, 1.2)), fall = seg(t, 1.25, 2.0), X = K.g;
      fill('#02101e', 0.52 * dk); dust('rain', { n: 110, seed: 5, cols: ['#bfe8ff'], a: 0.7 * dk, spd: 1.6, wind: -0.5 });
      for (let i = 0; i < 3; i++) wave(0.1 + i * 0.3, x, y, { col: '#bfe8ff', r: 150, d: 0.9, w: 3, a: 0.7, sy: 0.3 });
      const hh = 230 * up * (1 - fall), w = 34 + 6 * sin(t * 20);
      if (hh > 2) {
        const gr = X.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, rgba(cc, 0)); gr.addColorStop(0.25, rgba('#3f8cff', 0.75)); gr.addColorStop(0.5, '#e8f6ff'); gr.addColorStop(0.75, rgba('#3f8cff', 0.75)); gr.addColorStop(1, rgba(cc, 0));
        X.save(); X.fillStyle = gr; X.globalAlpha = 0.95; X.beginPath(); X.moveTo(x - w, y + 6); for (let k = 0; k <= 10; k++) X.lineTo(x - w * (1 - k / 10 * 0.35) + sin(t * 14 + k) * 3, y + 6 - hh * k / 10); for (let k = 10; k >= 0; k--) X.lineTo(x + w * (1 - k / 10 * 0.35) + sin(t * 14 + k + 2) * 3, y + 6 - hh * k / 10); X.closePath(); X.fill(); X.restore();
        glow(x, y - hh, 50, '#e8f6ff', 0.7, 1); sil(o, '#0a2a5a', 0.5 * seg(t, 0.8, 1.2) * (1 - fall));
      }
      if (t >= 1.25) {
        for (let i = 0; i < 26; i++) { const an = -PI / 2 + (rnd(i, 3) - 0.5) * 2.6, v = 120 + rnd(i, 4) * 200; glow(x + cos(an) * v * fall, y - 150 + sin(an) * v * fall + 260 * fall * fall, 5 + rnd(i, 5) * 5, i % 2 ? '#bfe8ff' : '#fff', (1 - fall) * 0.95, 1); }
        fill('#bfe8ff', hit(t, 1.25, 0.2) * 0.6); wave(1.25, x, y, { col: '#e8f6ff', r: 300, d: 0.8, w: 10, sy: 0.32 }); wave(1.45, x, y, { col: cc, r: 300, d: 0.8, w: 6, sy: 0.32 });
      }
    } });
  /* Himmel: vinden river, skyene deler seg, og den stuper ned som en stripe av lys. Ho-Oh får regnbuen med seg. */
  fx('in:sky', { len: 2.2, R: 1.25, cues: [[0.15, 'wind'], [1.25, 'boom'], [1.25, 'sfx', 'Hurricane']],
    draw(t, o) {
      const x = o.x, y = o.y, cc = o.cc, dk = env(t, 0, 0.3, 1.4, 2.15), op = eo(seg(t, 0.2, 1.0)), dv = seg(t, 0.95, 1.25), X = K.g;
      fill('#041226', 0.42 * dk);
      for (let i = 0; i < 9; i++) { const ph = (rnd(i, 3) + t * (1.4 + rnd(i, 4))) % 1; rect(W - ph * (W + 300), 20 + rnd(i, 5) * 300, 80 + rnd(i, 6) * 120, 2, '#fff', 0.5 * dk * sin(ph * PI), 1); }
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) glow(x + s * (50 + i * 44 + op * 230), 40 + (i % 2) * 44 + sin(t * 2 + i) * 4, 96 - i * 8, i % 2 ? '#aab4cc' : '#7c88a6', 0.7 * dk);
      beam(x, 30 + op * 50, -10, y, '#eaf6ff', 0.3 * op * dk, '#fff');
      if (o.id === 250) { X.save(); X.globalCompositeOperation = 'lighter'; X.lineWidth = 7; ['#ff5a5a', '#ffb040', '#ffe94a', '#5ae07a', '#5aa8ff', '#b07aff'].forEach((c, i) => { X.strokeStyle = c; X.globalAlpha = 0.55 * op * dk; X.beginPath(); X.arc(x - 150, y + 60, 250 - i * 7, PI * 1.05, PI * 1.05 + PI * 0.75 * op); X.stroke(); }); X.restore(); }
      if (dv > 0 && dv < 1) { const e = ei(dv), px = mix(x + 190, x, e), py = mix(-60, y - 50, e); for (let j = 0; j < 10; j++) glow(px + j * 9 * (1.2 - e), py - j * 14 * (1.2 - e), 26 - j * 2, j ? cc : '#fff', 0.9 - j * 0.08, 1); spr(px, py + 50, o.s || 1.85, { col: '#fff', a: 0.9, ay: 1 }); }
      if (t >= 1.25) {
        const k = seg(t, 1.25, 2.0); fill('#fff', hit(t, 1.25, 0.16) * 0.7); wave(1.25, x, y, { col: '#fff', r: 340, d: 0.7, w: 12, sy: 0.3 }); wave(1.35, x, y, { col: cc, r: 260, d: 0.8, w: 6, sy: 0.3 });
        for (let i = 0; i < 14; i++) { const s = i % 2 ? 1 : -1, d = eo(k) * (40 + rnd(i, 7) * 150); glow(x + s * d, y - rnd(i, 8) * 26 * sin(k * PI), 16 * (1 - k) + 4, '#d8e4f0', (1 - k) * 0.7); }
      }
    } });
  /* Tomrom: bildet forstyrres, en rift åpner seg der den skal stå, to øyne i mørket – og så står den der. */
  fx('in:void', { len: 2.5, R: 1.45, cues: [[0.25, 'rumble'], [1.05, 'tick'], [1.45, 'boom'], [1.45, 'sfx', 'Psychic']],
    draw(t, o) {
      const x = o.x, y = o.y, by = y - 60, cc = o.cc, dk = env(t, 0, 0.35, 1.7, 2.45), op = eo(seg(t, 0.25, 1.2)), cl = seg(t, 1.45, 2.0), X = K.g;
      fill('#05010c', 0.74 * dk); vig(0.5 * dk, '#12021e');
      for (let i = 0; i < 5; i++) { const q = floor(t * 11 + i * 3); if (rnd(q, i) > 0.62) rect(0, rnd(q, i + 1) * H, W, 2 + rnd(q, i + 2) * 5, i % 2 ? cc : '#fff', 0.22 * dk, 1); }
      const w = (16 + op * 44) * (1 - cl), h = 110 * op * (1 - cl);
      if (h > 1) {
        glow(x, by, 150 * op, cc, 0.55 * (1 - cl), 1);
        X.save(); X.translate(x, by); X.rotate(0.12 * sin(t * 3)); X.fillStyle = cc; X.beginPath(); X.ellipse(0, 0, w + 5, h + 6, 0, 0, TAU); X.fill(); X.fillStyle = '#000'; X.beginPath(); X.ellipse(0, 0, w, h, 0, 0, TAU); X.fill(); X.restore();
        for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * 1.3, L = 50 + op * 90; bolt(x + cos(an) * w * 0.6, by + sin(an) * h * 0.8, x + cos(an) * L * 1.5, by + sin(an) * L, { seed: i * 9 + floor(t * 10), col: cc, core: '#fff', w: 1.4, a: 0.8 * (1 - cl), depth: 4 }); }
        sil(o, '#000', seg(t, 0.9, 1.3) * (1 - cl), 0.5 + 0.5 * seg(t, 0.9, 1.45));
        const e2 = seg(t, 1.05, 1.3); if (e2 > 0 && t < 1.45) { glow(x - 7, by - 12, 10, '#ff3040', e2, 1); glow(x + 8, by - 12, 10, '#ff3040', e2, 1); }
      }
      if (t >= 1.45) { fill('#000', hit(t, 1.45, 0.12)); fill(cc, hit(t, 1.55, 0.3) * 0.55); wave(1.5, x, by, { col: cc, r: 380, d: 0.8, w: 12 }); wave(1.62, x, by, { col: '#fff', r: 300, d: 0.7, w: 4 }); }
      dust('up', { n: 30, seed: 9, cols: [cc, '#5a3a7a'], a: 0.7 * dk, spd: 1.4 });
    } });
  /* Rom: stjernene strekker seg, ringer trekker seg sammen til ett punkt – og punktet sprenger. Deoxys har arvestoffet sitt i bakgrunnen. */
  fx('in:space', { len: 2.3, R: 1.25, cues: [[0.2, 'wind'], [0.9, 'tick'], [1.25, 'boom'], [1.25, 'sfx', 'Cosmic Power']],
    draw(t, o) {
      const x = o.x, by = o.y - 60, cc = o.cc, dk = env(t, 0, 0.3, 1.5, 2.25), pt = seg(t, 0.9, 1.25);
      fill('#030318', 0.72 * dk); stars({ n: 90, seed: 4, a: dk, warp: 0.2 + seg(t, 0.2, 1.2) * 0.8, cx: x, cy: by, spd: 1.4, cols: ['#fff', cc] });
      if (o.id === 386) { helix(t, x - 150, 0.5 * dk); helix(t + 1, x + 110, 0.35 * dk); }
      for (let i = 0; i < 4; i++) { const k = seg(t, 0.15 + i * 0.25, 0.75 + i * 0.25); if (k > 0 && k < 1) ring(x, by, (1 - ei(k)) * 330 + 6, { col: i % 2 ? '#fff' : cc, w: 2 + k * 5, a: k }); }
      if (t < 1.25) { glow(x, by, 90 * pt, cc, 0.7 * pt, 1); glow(x, by, 12 + pt * 40, '#fff', pt, 1); }
      else { const k = seg(t, 1.25, 2.1); rays(x, by, { n: 14, rot: t * 0.9, col: cc, a: (1 - k) * 0.85, r1: 80 + eo(k) * 420, wid: 0.3 }); glow(x, by, 200 * (1 - k) + 30, '#fff', (1 - k) * 0.9, 1); fill('#fff', hit(t, 1.25, 0.2) * 0.85); wave(1.25, x, by, { col: '#fff', r: 400, d: 0.7, w: 12 }); wave(1.4, x, by, { col: cc, r: 400, d: 0.9, w: 6 }); }
    } });
  /* Tid: en urskive bak den, viserne går fortere og fortere, tiden stanser – og skiva knuser. */
  fx('in:time', { len: 2.5, R: 1.45, cues: [[0.3, 'tick'], [0.6, 'tick'], [0.85, 'tick'], [1.05, 'tick'], [1.2, 'thud'], [1.45, 'boom'], [1.45, 'sfx', 'Roar of Time']],
    draw(t, o) {
      const x = o.x, by = o.y - 60, cc = o.cc, dk = env(t, 0, 0.3, 1.7, 2.45), tt = min(t, 1.2), spin = tt * tt * 9, a = seg(t, 0.1, 0.5) * (1 - seg(t, 1.45, 1.6)), fr = env(t, 1.2, 1.22, 1.4, 1.45);
      fill('#020818', 0.72 * dk);
      clock(x, by, 96, spin, spin * 12, cc, a); cog(x - 130, by + 70, 46, 10, spin * 0.6, cc, 0.5 * a); cog(x + 96, by - 96, 34, 8, -spin * 0.9, cc, 0.5 * a);
      fill('#8a94a8', 0.35 * fr); if (fr > 0) for (let i = 0; i < 14; i++) rect(rnd(i, 3) * W, rnd(i, 4) * H, 3, 3, '#fff', 0.8 * fr);
      if (t < 1.45) sil(o, cc, 0.45 * seg(t, 0.8, 1.2));
      else { const k = seg(t, 1.45, 2.2); fill('#fff', hit(t, 1.45, 0.2) * 0.85); for (let i = 0; i < 12; i++) { const an = i / 12 * TAU, d = eo(k) * 260; poly([[x + cos(an) * d, by + sin(an) * d], [x + cos(an + 0.2) * (d + 40), by + sin(an + 0.2) * (d + 40)], [x + cos(an + 0.35) * (d + 8), by + sin(an + 0.35) * (d + 8)]], i % 2 ? cc : '#fff', (1 - k) * 0.9, 1); } wave(1.45, x, by, { col: cc, r: 400, d: 0.8, w: 12 }); }
    } });
  /* Skog: lys mellom trærne, blader som virvler i spiral inn mot ett punkt, og lyset som springer ut. */
  fx('in:forest', { len: 2.1, R: 1.15, use: ['lightA', 'lightB'], cues: [[0.2, 'chime'], [1.15, 'boom'], [1.15, 'sfx', 'Synthesis']],
    draw(t, o) {
      const x = o.x, by = o.y - 56, cc = o.cc, dk = env(t, 0, 0.3, 1.4, 2.05), gr = seg(t, 0.2, 1.15), k2 = seg(t, 1.15, 2.0);
      fill('#041008', 0.42 * dk);
      for (let i = 0; i < 4; i++) im(i % 2 ? 'lightA' : 'lightB', x - 150 + i * 100, -10, { s: 2.6, ay: 0, a: 0.2 * dk, add: 1 }) || beam(x - 150 + i * 100, 40, 0, H, cc, 0.1 * dk);
      for (let i = 0; i < 30; i++) { const ph = seg(t, 0.05 + rnd(i, 3) * 0.5, 0.9 + rnd(i, 3) * 0.3); if (ph <= 0 || ph >= 1) continue; const an = rnd(i, 4) * TAU + ph * 7, r = (1 - io(ph)) * (150 + rnd(i, 5) * 120); leaf(x + cos(an) * r, by + sin(an) * r * 0.7, 5 + rnd(i, 6) * 5, an * 2, i % 3 ? cc : '#fff', 0.95 * sin(ph * PI)); }
      glow(x, by, 30 + gr * 110, cc, 0.75 * gr * (1 - k2), 1); glow(x, by, 14 + gr * 30, '#fff', gr * (1 - k2), 1);
      if (t >= 1.15) { fill('#fff', hit(t, 1.15, 0.25) * 0.6); wave(1.15, x, by, { col: cc, r: 300, d: 0.9, w: 8 }); for (let i = 0; i < 18; i++) { const an = rnd(i, 8) * TAU, d = eo(k2) * (50 + rnd(i, 9) * 140); glow(x + cos(an) * d, by + sin(an) * d * 0.8 - k2 * 30, 7, i % 2 ? cc : '#fff', 1 - k2, 1); } }
    } });
  /* Stein: blokker faller ned og stables, tegnene tennes ett for ett (Regiene har sine egne), og blokkene sprenges bort. */
  fx('in:stone', { len: 2.3, R: 1.3, cues: [[0.37, 'thud'], [0.62, 'thud'], [0.87, 'thud'], [1.12, 'thud'], [1.3, 'boom'], [1.3, 'sfx', 'Rock Slide']],
    draw(t, o) {
      const x = o.x, y = o.y, cc = o.cc, dk = env(t, 0, 0.3, 1.5, 2.25), RK = [[-38, 0.15], [34, 0.4], [-8, 0.65], [14, 0.9]], D = REGD[o.id] || [[0, -1.3], [-1.2, -0.3], [1.2, -0.3], [-0.8, 1], [0.8, 1], [0, 0]];
      fill('#0a0806', 0.52 * dk); dust('ash', { n: 40, seed: 4, cols: ['#8a7458', '#c8b088'], a: 0.7 * dk, spd: 2 });
      RK.forEach(([dx, q]) => wave(q + 0.22, x + dx, y, { col: '#c8b088', r: 120, d: 0.5, w: 5, sy: 0.3, a: 0.7 }));
      if (t < 1.3) {
        RK.forEach(([dx, q], i) => { const f = seg(t, q, q + 0.22); if (f > 0) mRock(x + dx * (1 - i * 0.12), mix(-60, y - 22 - i * 30, ei(f)), 34 - i * 2, i + 3, '#3a3228'); });
        D.forEach((q, i) => { const on = seg(t, 0.95 + i * 0.04, 1.0 + i * 0.04); if (on > 0) { glow(x + q[0] * 16, y - 60 + q[1] * 16, 14 + hit(t, 0.95 + i * 0.04, 0.2) * 12, cc, on, 1); rect(x + q[0] * 16 - 3, y - 63 + q[1] * 16, 6, 6, '#fff', on, 1); } });
      } else {
        const k = seg(t, 1.3, 2.1); for (let i = 0; i < 16; i++) { const an = rnd(i, 5) * TAU, d = eo(k) * (70 + rnd(i, 6) * 220); if (k < 0.96) mRock(x + cos(an) * d, y - 50 + sin(an) * d * 0.7 + k * k * 120, 14 * (1 - k) + 3, i + 9, '#3a3228'); }
        fill(cc, hit(t, 1.3, 0.22) * 0.6); wave(1.3, x, y, { col: cc, r: 340, d: 0.8, w: 12, sy: 0.3 });
      }
    } });
  /* Opphavet (Arceus): alt blir mørkt, lyset faller ned ovenfra, ringen av de seksten platene senker seg rundt den, og hjulet tennes. */
  fx('in:origin', { len: 3.2, R: 2.0, cues: [[0.5, 'chime'], [1.2, 'rumble'], [2.0, 'boom'], [2.0, 'sfx', 'Judgment']],
    draw(t, o) {
      const x = o.x, y = o.y, by = y - 64, dk = env(t, 0, 0.5, 2.4, 3.15), dsc = eo(seg(t, 0.5, 1.9)), k2 = seg(t, 2.0, 3.0), ry = mix(-80, by, dsc);
      fill('#020206', 0.86 * dk); stars({ n: 70, seed: 3, a: 0.8 * dk, cols: ['#fff', '#ffe9a8'] });
      beam(x, 14 + dsc * 70, -10, y + 6, '#ffe9a8', (0.25 + 0.5 * dsc) * (1 - k2) * dk, '#fff');
      rays(x, -20, { n: 9, rot: 0.35 + sin(t) * 0.03, col: '#ffe9a8', a: 0.25 * dsc * (1 - k2), r1: 520, wid: 0.25 });
      if (t < 2.0) { glow(x, by, 60 + dsc * 80, '#ffe9a8', 0.5 * dsc, 1); aPlates(t, x, ry, 100, 1, dsc, t * 2.4); ring(x, ry, 100, { col: '#ffe9a8', w: 2, a: 0.6 * dsc, sy: 0.42 }); wheel(x, by, 64, seg(t, 1.2, 1.9), t * 1.2, 0.8); sil(o, '#fff', seg(t, 1.5, 2.0) * 0.9); }
      else { fill('#fff', hit(t, 2.0, 0.35) * 0.95); aPlates(t, x, by, 100 + eo(k2) * 380, 1, 1 - k2, t * 2.4); wave(2.0, x, by, { col: '#fff', r: 460, d: 0.9, w: 16 }); wave(2.2, x, by, { col: '#ffe9a8', r: 460, d: 1.0, w: 8 }); wave(2.4, x, by, { col: '#ffd070', r: 460, d: 1.0, w: 4 }); rays(x, by, { n: 16, rot: t * 0.5, col: '#ffe9a8', a: (1 - k2) * 0.7, r1: 460, wid: 0.3 }); }
      dust('up', { n: 50, seed: 6, cols: ['#ffe9a8', '#fff'], a: 0.8 * dk, spd: 1.2 });
    } });
  /* Dark Mewtwo: den svarte sola stiger der den skal stå, krystaller av skygge stikker inn fra alle kanter, lynet slår inn i mørket,
     en skikkelse med glødende omriss tar form i sola – og så sprenger den seg ut. */
  fx('in:dark', { len: 3.4, R: 2.3, cues: [[0.5, 'rumble'], [0.6, 'tick'], [0.9, 'tick'], [1.2, 'tick'], [1.5, 'tick'], [1.8, 'tick'], [2.0, 'rumble'], [2.3, 'boom'], [2.3, 'sfx', 'Psystrike']],
    draw(t, o) {
      const x = o.x, y = o.y, by = y - 60, dk = env(t, 0.2, 0.8, 2.7, 3.35), sun = eo(seg(t, 0.5, 2.0)), k2 = seg(t, 2.3, 3.2), eat = seg(t, 0.9, 2.2), imp = seg(t, 2.0, 2.3), out = 1 - seg(t, 2.6, 3.3);
      fill('#030106', 0.8 * dk);
      blackSun(t, x, by - 10, 26 + sun * 52, sun * out);
      DSH.slice(0, 10).forEach((q, i) => shard(q[0], q[1], Math.atan2(by - q[1], x - q[0]), Math.hypot(x - q[0], by - q[1]) * 0.62, eo(seg(t, 0.6 + i * 0.14, 0.82 + i * 0.14)) * out, q[4]));
      if (t > 0.6 && t < 2.3) for (let i = 0; i < 3; i++) { const q = floor(t * 9 + i * 2.3); if (rnd(q, i) > 0.35) bolt(x + (rnd(q, i + 1) - 0.5) * 300, -10, x + (rnd(q, i + 2) - 0.5) * 30, by, { seed: q * 3 + i, col: '#ff8a2a', core: '#fff2d0', w: 2, a: 0.9, br: 1 }); }
      if (t < 2.3 && eat > 0) { aura(x, y, o.s || 1.85, '#ff8a2a', 3, 0.45 * eat, { ay: 1 }); sil(o, '#06030a', eat); glow(x - 4, by - 18, 8 + eat * 10, '#ff8a2a', eat, 1); }
      if (imp > 0 && t < 2.3) { ring(x, by, (1 - imp) * 300 + 8, { col: '#ff8a2a', w: 3, a: 1 }); fill('#000', imp * 0.6); }
      if (t >= 2.3) {
        fill('#ffb060', hit(t, 2.3, 0.3) * 0.95); wave(2.3, x, by, { col: '#fff', r: 480, d: 0.8, w: 18 }); wave(2.45, x, by, { col: '#ff8a2a', r: 480, d: 0.9, w: 10 }); wave(2.7, x, by, { col: '#ff5a14', r: 480, d: 0.9, w: 5 });
        for (let i = 0; i < 5; i++) { const q = floor(t * 10 + i * 1.7), an = rnd(q, i) * TAU; bolt(x + cos(an) * 30, by + sin(an) * 30, x + cos(an) * (150 + rnd(q, i + 4) * 120), by + sin(an) * (110 + rnd(q, i + 5) * 80), { seed: q * 5 + i, col: '#ff8a2a', core: '#fff2d0', w: 1.8, a: 1 - k2, br: 2 }); }
      }
      dust('ember', { n: 80, seed: 7, cols: ['#ff8a2a', '#ffd070', '#ff3a1a'], a: dk, spd: 2.4 });
    } });

  /* ================= STEDET KJEMPER MED =================
     Korte hendelser (rundt ett sekund) som treffer din Pokémon, eller styrker den legendariske. 'hit' er øyeblikket det smeller. */
  const mb = o => o.my - 46;   /* midt på din Pokémon */
  fx('ev:bolt', { len: 1.0, cues: [[0.3, 'hit'], [0.3, 'sfx', 'Thunder']], draw(t, o) { const x = o.mx, y = mb(o), h = hit(t, 0.3, 0.5); fill('#03040e', env(t, 0, 0.15, 0.6, 1.0) * 0.5); if (t < 0.3) glow(x, y - 20, 70 * seg(t, 0, 0.3), o.cc, 0.6, 1); if (h > 0) { for (let i = 0; i < 2; i++) bolt(x + 130 + i * 36, -10, x, y, { seed: 5 + i + floor(t * 24), col: o.cc, w: 3 - i, a: h, br: 3 }); glow(x, y, 150, '#fff', h * 0.7, 1); fill('#fff', hit(t, 0.3, 0.14) * 0.7); } wave(0.3, x, o.my, { col: o.cc, r: 200, d: 0.6, w: 8, sy: 0.3 }); } });
  fx('ev:ice', { len: 1.1, cues: [[0, 'wind'], [0.4, 'hit'], [0.4, 'sfx', 'Blizzard']], draw(t, o) { const x = o.mx, y = mb(o), a = env(t, 0, 0.2, 0.7, 1.1); fill('#bfe6ff', 0.14 * a); dust('snow', { n: 170, seed: 3, cols: ['#fff', '#d8f4ff'], a: a, spd: 7, wind: -3.4 }); for (let i = 0; i < 5; i++) im('streaks', ((t * (900 + i * 200) + i * 300) % 1500) - 400, 150 + i * 46, { s: 1, a: 0.5 * a, add: 1, flip: 1 }) || rect(W - ((t * 1.6 + i * 0.2) % 1) * (W + 200), 150 + i * 46, 160, 2, '#fff', 0.5 * a, 1); for (let i = 0; i < 7; i++) { const k = ei(seg(t, 0.08 + i * 0.03, 0.4)), an = -0.55 + i * 0.2, d = 30 + (1 - k) * 300; spike(x + cos(an) * d, y + sin(an) * d * 0.7, an + PI, 46, 7, '#e8f8ff', '#7ab8e8', env(t, 0.08, 0.2, 0.5, 0.75)); } fill('#fff', hit(t, 0.4, 0.15) * 0.5); wave(0.4, x, y, { col: '#e8f8ff', r: 180, d: 0.6, w: 7 }); } });
  fx('ev:magma', { len: 1.1, cues: [[0, 'rumble'], [0.4, 'hit'], [0.4, 'sfx', 'Eruption']], draw(t, o) { const x = o.mx, y = o.my, pre = seg(t, 0, 0.4), er = hit(t, 0.4, 0.7); fill('#1a0400', env(t, 0, 0.15, 0.7, 1.1) * 0.4); glow(x, y, 50 + pre * 90, '#ff5a14', 0.7 * (t < 0.4 ? pre : er), 1); for (let i = 0; i < 5; i++) { const an = PI + (i / 4 - 0.5) * 2; bolt(x, y, x + cos(an) * 110 * pre, y - abs(sin(an)) * 24 * pre, { seed: i * 5, col: '#ff7a1a', core: '#ffe9a8', w: 2, a: 0.9 * (1 - seg(t, 0.6, 1.0)), depth: 3 }); } if (er > 0) { beam(x, 20 + er * 44, y - 240, y + 10, '#ff5a14', er, '#fff2c0'); for (let i = 0; i < 12; i++) { const an = -PI / 2 + (rnd(i, 3) - 0.5) * 1.8, v = (60 + rnd(i, 4) * 150) * (1 - er); glow(x + cos(an) * v, y - 60 + sin(an) * v + (1 - er) * (1 - er) * 90, 7, i % 2 ? '#ff7a1a' : '#ffd070', er, 1); } fill('#ff8a2a', hit(t, 0.4, 0.15) * 0.5); } wave(0.4, x, y, { col: '#ffb040', r: 200, d: 0.6, w: 8, sy: 0.3 }); } });
  fx('ev:stone', { len: 1.1, cues: [[0.3, 'hit'], [0.3, 'sfx', 'Rock Slide'], [0.45, 'hit'], [0.6, 'hit']], draw(t, o) { const x = o.mx, y = o.my, a = env(t, 0, 0.1, 0.8, 1.1); fill('#0a0806', 0.35 * a); [[-30, 0.08], [26, 0.23], [-4, 0.38]].forEach(([dx, q], i) => { const f = seg(t, q, q + 0.22), k = seg(t, q + 0.22, q + 0.6); if (f > 0 && k < 1) { if (f < 1) mRock(x + dx, mix(-40, y - 46, ei(f)), 38 - i * 4, i + 3, '#3a3228'); else for (let j = 0; j < 6; j++) { const an = -PI / 2 + (rnd(j, i) - 0.5) * 2.4, d = eo(k) * (50 + rnd(j, i + 3) * 80); mRock(x + dx + cos(an) * d, y - 46 + sin(an) * d + k * k * 70, 13 * (1 - k) + 2, j + i * 5, '#4a4032'); } } wave(q + 0.22, x + dx, y, { col: '#c8b088', r: 110, d: 0.45, w: 5, sy: 0.3, a: 0.8 }); }); dust('ash', { n: 50, seed: 4, cols: ['#8a7458', '#c8b088'], a: 0.8 * a, spd: 3 }); } });
  fx('ev:sea', { len: 1.2, cues: [[0, 'rumble'], [0.45, 'hit'], [0.45, 'sfx', 'Surf']], draw(t, o) { const X = K.g, k = seg(t, 0, 1.1), a = env(t, 0, 0.15, 0.85, 1.2), fx0 = mix(W + 80, -260, io(k)); fill('#02101e', 0.3 * a); dust('rain', { n: 90, seed: 5, cols: ['#bfe8ff'], a: 0.6 * a, spd: 2, wind: -0.8 });
      const top = (u, L) => o.my + 24 - 200 * (u < 0.25 ? sin(u / 0.25 * PI / 2) : 1 - (u - 0.25) / 0.75 * 0.7) + sin(u * 9 + t * 12) * 6 + L * 18;
      for (let L = 0; L < 2; L++) { X.save(); X.globalAlpha = (L ? 0.6 : 0.85) * a; X.fillStyle = L ? '#bfe8ff' : '#2a6ad8'; X.beginPath(); X.moveTo(fx0 + L * 26, H); for (let i = 0; i <= 24; i++) X.lineTo(fx0 + L * 26 + i / 24 * 420, top(i / 24, L)); X.lineTo(fx0 + L * 26 + 420, H); X.closePath(); X.fill(); X.restore(); }
      for (let i = 0; i < 16; i++) { const u = 0.05 + rnd(i, 3) * 0.3; glow(fx0 + u * 420 + sin(t * 11 + i) * 6, top(u, 0) - 4 + rnd(i, 4) * 14, 7 + rnd(i, 5) * 8, '#fff', 0.85 * a, 1); } fill('#bfe8ff', hit(t, 0.45, 0.15) * 0.4); } });
  fx('ev:sky', { len: 1.1, cues: [[0, 'wind'], [0.35, 'hit'], [0.35, 'sfx', 'Hurricane']], draw(t, o) { const a = env(t, 0, 0.15, 0.75, 1.1); fill('#d8ecff', 0.1 * a); for (let i = 0; i < 22; i++) { const ph = (rnd(i, 3) + t * (1.6 + rnd(i, 4) * 1.4)) % 1, y = 40 + rnd(i, 5) * 320, L = 90 + rnd(i, 6) * 160; rect(W - ph * (W + 360), y + sin(ph * 6 + i) * 8, L, 2 + (i % 3 === 0), '#fff', 0.65 * a * sin(ph * PI), 1); } for (let i = 0; i < 3; i++) { const k = seg(t, 0.2 + i * 0.1, 0.7 + i * 0.1); if (k > 0 && k < 1) ring(o.mx + 60 - k * 90, mb(o), 30 + k * 60, { col: '#fff', w: 3 * (1 - k) + 1, a: (1 - k) * 0.8, sy: 1.6 }); } dust('leaf', { n: 16, seed: 5, cols: ['#d8ecff', '#fff'], a: 0.8 * a, spd: 6, wind: -3, size: 0.7 }); } });
  fx('ev:void', { len: 1.1, cues: [[0, 'tick'], [0.45, 'hit'], [0.45, 'sfx', 'Psychic']], draw(t, o) { const x = o.mx, y = mb(o), a = env(t, 0, 0.15, 0.8, 1.1), cc = o.cc; fill('#05010c', 0.5 * a); for (let i = 0; i < 6; i++) { const q = floor(t * 14 + i * 3); if (rnd(q, i) > 0.5) rect(0, rnd(q, i + 1) * H, W, 2 + rnd(q, i + 2) * 6, i % 2 ? cc : '#fff', 0.25 * a, 1); } for (let i = 0; i < 3; i++) { const k = seg(t, i * 0.12, 0.45 + i * 0.05); if (k > 0 && k < 1) ring(x, y, (1 - ei(k)) * 220 + 10, { col: i % 2 ? '#fff' : cc, w: 2 + k * 4, a: k }); } const h = hit(t, 0.45, 0.5); if (h > 0) { glow(x, y, 130, cc, h * 0.8, 1); for (let i = 0; i < 4; i++) { const an = i / 4 * TAU + t * 3; bolt(x, y, x + cos(an) * 120, y + sin(an) * 90, { seed: i + floor(t * 16), col: cc, core: '#fff', w: 1.6, a: h, depth: 4 }); } } vig(0.4 * a, '#12021e'); } });
  fx('ev:space', { len: 1.1, cues: [[0, 'wind'], [0.45, 'hit'], [0.45, 'sfx', 'Cosmic Power']], draw(t, o) { const x = o.mx, y = mb(o), a = env(t, 0, 0.15, 0.8, 1.1), cc = o.cc; fill('#030318', 0.5 * a); stars({ n: 60, seed: 4, a: a, warp: 0.8, cx: x, cy: y, spd: 2.2, cols: ['#fff', cc] }); grid(t * 3, 0.6 + 0.4 * sin(t * 9), cc, 0.5 * a); const h = hit(t, 0.45, 0.5); for (let i = 0; i < 3; i++) ring(x, y, 30 + i * 26 + sin(t * 18 + i) * 6, { col: i % 2 ? '#fff' : cc, w: 2, a: 0.7 * a, sy: 0.5 + 0.3 * sin(t * 7 + i) }); glow(x, y, 120, cc, h * 0.7, 1); wave(0.45, x, y, { col: cc, r: 220, d: 0.6, w: 8 }); } });
  fx('ev:time', { len: 1.2, cues: [[0.1, 'tick'], [0.3, 'tick'], [0.5, 'hit'], [0.5, 'sfx', 'Roar of Time']], draw(t, o) { const x = o.mx, y = mb(o), a = env(t, 0, 0.15, 0.9, 1.2), tt = min(t, 0.5), cc = o.cc, fr = env(t, 0.5, 0.52, 0.8, 0.95); fill('#020818', 0.45 * a); clock(x, y, 74, -tt * tt * 30, -tt * tt * 360, cc, a); cog(x + 100, y - 70, 30, 8, tt * 8, cc, 0.5 * a); fill('#8a94a8', 0.4 * fr); if (fr > 0) for (let i = 0; i < 12; i++) rect(rnd(i, 3) * W, rnd(i, 4) * H, 3, 3, '#fff', 0.8 * fr); wave(0.5, x, y, { col: cc, r: 220, d: 0.6, w: 8 }); } });
  fx('ev:forest', { len: 1.2, use: ['lightA', 'lightB'], cues: [[0.2, 'chime'], [0.4, 'sfx', 'Synthesis']], draw(t, o) { const x = o.x, y = o.y, a = env(t, 0, 0.2, 0.9, 1.2), cc = o.cc; for (let i = 0; i < 3; i++) im(i % 2 ? 'lightA' : 'lightB', x - 60 + i * 60, -10, { s: 2.4, ay: 0, a: 0.25 * a, add: 1 }) || beam(x - 60 + i * 60, 30, 0, y, cc, 0.15 * a); glow(x, y - 56, 120, cc, 0.5 * a, 1); for (let i = 0; i < 26; i++) { const ph = (rnd(i, 3) + t * (0.6 + rnd(i, 4))) % 1, an = rnd(i, 5) * TAU, r = 90 * (1 - ph); glow(x + cos(an) * r, y - 20 - ph * 110 + sin(an) * r * 0.3, 5 + rnd(i, 6) * 4, i % 2 ? cc : '#eaffd8', a * sin(ph * PI), 1); } for (let i = 0; i < 8; i++) { const ph = (rnd(i, 7) + t * 0.9) % 1; leaf(x + sin(ph * 6 + i) * 60, y - ph * 130, 6, ph * 8 + i, cc, a * sin(ph * PI)); } wave(0.4, x, y, { col: cc, r: 160, d: 0.7, w: 5, sy: 0.3 }); } });
  fx('ev:origin', { len: 1.3, cues: [[0.1, 'chime'], [0.5, 'hit'], [0.5, 'sfx', 'Judgment']], draw(t, o) { const x = o.mx, y = o.my, a = env(t, 0, 0.2, 1.0, 1.3), h = hit(t, 0.5, 0.7); fill('#020206', 0.5 * a); stars({ n: 40, seed: 3, a: 0.7 * a, cols: ['#fff', '#ffe9a8'] }); wheel(o.x, o.y - 64, 70, 1, t * 3, 0.7 * a); for (let i = 0; i < 5; i++) { const q = 0.3 + i * 0.05, dx = (i - 2) * 46, f = seg(t, q, q + 0.2), d = hit(t, q + 0.2, 0.6); if (f > 0) { glow(mix(o.x, x + dx, f), mix(-20, y - 40 - abs(i - 2) * 10, ei(f)), 16, '#ffe9a8', f < 1 ? 1 : 0, 1); if (f >= 1) { beam(x + dx, 10 + d * 16, -10, y, '#ffe9a8', d, '#fff'); glow(x + dx, y - 20, 50, '#ffe9a8', d * 0.8, 1); } } } fill('#fff', hit(t, 0.5, 0.15) * 0.55); wave(0.5, x, y, { col: '#ffe9a8', r: 240, d: 0.7, w: 9, sy: 0.3 }); glow(x, y - 40, 150, '#ffe9a8', h * 0.4, 1); } });
  fx('ev:dark', { len: 1.2, cues: [[0, 'rumble'], [0.45, 'hit'], [0.45, 'sfx', 'Psystrike']], draw(t, o) { const x = o.mx, y = mb(o), a = env(t, 0, 0.15, 0.9, 1.2), h = hit(t, 0.45, 0.6); fill('#030106', 0.6 * a); blackSun(t, o.x, o.y - 70, 40 + 10 * sin(t * 8), 0.8 * a); for (let i = 0; i < 6; i++) { const an = -1.2 + i * 0.48, k = eo(seg(t, 0.1 + i * 0.05, 0.42)); shard(x + cos(an) * 260, y + sin(an) * 200, an + PI, 190, k * (1 - seg(t, 0.75, 1.1)), 12); } if (h > 0) { for (let i = 0; i < 2; i++) bolt(o.x, o.y - 70, x, y, { seed: 9 + i + floor(t * 20), col: '#ff8a2a', core: '#fff2d0', w: 3 - i, a: h, br: 2 }); glow(x, y, 140, '#ff8a2a', h * 0.8, 1); fill('#ffb060', hit(t, 0.45, 0.14) * 0.6); } wave(0.45, x, y, { col: '#ff8a2a', r: 220, d: 0.6, w: 9 }); dust('ember', { n: 50, seed: 7, cols: ['#ff8a2a', '#ffd070'], a: a, spd: 2.5 }); } });
  /* Raseriet: den legendariske er nede i halv HP. Fargen dens slår ut over hele banen. */
  fx('ev:rage', { len: 1.6, cues: [[0, 'rumble'], [0.5, 'boom'], [0.5, 'cry']], draw(t, o) { const x = o.x, by = o.y - 60, cc = o.cc, a = env(t, 0, 0.2, 1.2, 1.6), pre = seg(t, 0, 0.5), h = hit(t, 0.5, 1.0); fill('#000', 0.55 * a); for (let i = 0; i < 4; i++) { const k = seg(t, i * 0.1, 0.5); if (k > 0 && k < 1) ring(x, by, (1 - ei(k)) * 320 + 8, { col: i % 2 ? '#fff' : cc, w: 2 + k * 4, a: k }); } glow(x, by, 60 + pre * 80, cc, 0.7 * pre * (t < 0.5 ? 1 : a), 1); if (h > 0) { rays(x, by, { n: 18, rot: t * 1.4, col: cc, a: h * 0.8, r1: 520, wid: 0.36 }); for (let i = 0; i < 6; i++) { const q = floor(t * 12 + i * 2), an = rnd(q, i) * TAU; bolt(x + cos(an) * 30, by + sin(an) * 30, x + cos(an) * (170 + rnd(q, i + 3) * 130), by + sin(an) * (120 + rnd(q, i + 4) * 90), { seed: q * 3 + i, col: cc, core: '#fff', w: 2, a: h, br: 2 }); } fill(cc, hit(t, 0.5, 0.25) * 0.7); } wave(0.5, x, by, { col: '#fff', r: 520, d: 0.8, w: 18 }); wave(0.65, x, by, { col: cc, r: 520, d: 0.9, w: 10 }); wave(0.85, x, by, { col: cc, r: 520, d: 0.9, w: 5 }); vig(0.5 * a, cc); } });

  /* Varselet før de aller sjeldneste: mørket puster i fargen dens, bildet slår sprekker, og en tekst skrives fram. o = { cc, txt }. */
  fx('omen', { len: 3.0, use: ['cracks'], cues: [[0.2, 'beat'], [0.95, 'beat'], [1.7, 'beat'], [2.3, 'beat'], [2.7, 'boom']],
    draw(t, o) {
      const cc = o.cc || '#fff', bt = hits(t, [0.2, 0.95, 1.7, 2.3], 0.5), n = [0.2, 0.95, 1.7, 2.3].filter(q => t >= q).length, crk = tintArt('cracks', cc), L = (o.txt || 'Something beyond legend\ndraws near').split('\n'), tot = L.reduce((n, q) => n + q.length, 0); let left = floor(seg(t, 0.4, 2.0) * tot);
      fill('#000'); vig(0.5 + 0.5 * bt, blend(cc, '#000000', 0.6)); glow(256, 192, 120 + bt * 220, cc, 0.08 + bt * 0.2, 1);
      if (crk) im(crk, 256, 192, { a: c01(n * 0.22) * (0.6 + 0.4 * bt), add: 1, s: 1 + n * 0.03 });
      else for (let i = 0; i < n * 3; i++) { const an = rnd(i, 4) * TAU; bolt(256 + cos(an) * 320, 192 + sin(an) * 240, 256 + cos(an) * (150 - n * 20), 192 + sin(an) * (110 - n * 14), { seed: i * 7, col: cc, core: '#fff', w: 1.4, a: 0.7, depth: 4 }); }
      for (let i = 0; i < 4; i++) { const q = floor(t * 12 + i * 3); if (rnd(q, i) > 0.72) rect(0, rnd(q, i + 1) * H, W, 2 + rnd(q, i + 2) * 6, i % 2 ? cc : '#fff', 0.2, 1); }
      L.forEach((q, i) => { txt(q.slice(0, max(0, left)), 256, 201 - (L.length - 1) * 14 + i * 28, { size: 25, col: '#fff', sh: blend(cc, '#000000', 0.4), sd: 2, a: 1 - seg(t, 2.6, 2.8) }); left -= q.length; });
      const X = K.g; X.save(); X.globalAlpha = c01(seg(t, 0.1, 0.4) * (1 - seg(t, 2.6, 2.8))); X.strokeStyle = cc; X.lineWidth = 2; X.beginPath(); X.moveTo(256 - 190, 160); X.lineTo(256 + 190, 160); X.moveTo(256 - 190, 230); X.lineTo(256 + 190, 230); X.stroke(); X.restore();
      fill('#fff', seg(t, 2.7, 3.0));
    } });

  /* ================= STEDENE =================
     Stedet tegnes bak plattformene (føttene til den legendariske står rundt 379, 186 og din rundt 123, 372). Horisonten ligger rundt 200. */
  /* Gulvet: fra horisonten og ned, med linjer som løper mot et forsvinningspunkt. */
  const ground = (yh, c0, c1, line, la, vx) => { const X = K.g, gr = X.createLinearGradient(0, yh, 0, H); gr.addColorStop(0, c0); gr.addColorStop(1, c1); X.fillStyle = gr; X.fillRect(0, yh, W, H - yh); if (!line) return; X.save(); X.globalAlpha = la == null ? 0.35 : la; X.strokeStyle = line; X.lineWidth = 1; X.beginPath(); for (let i = -9; i <= 9; i++) { X.moveTo((vx || 256) + i * 16, yh); X.lineTo((vx || 256) + i * 150, H); } for (let j = 1; j < 7; j++) { const yy = yh + (H - yh) * Math.pow(j / 7, 1.8); X.moveTo(0, yy); X.lineTo(W, yy); } X.stroke(); X.restore(); };
  /* En søyle med rifler. Står på yb. br = brukket topp. */
  const column = (x, yb, w, h, c0, c1, br) => {
    const X = K.g, gr = X.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, c1); gr.addColorStop(0.35, c0); gr.addColorStop(1, c1);
    X.save(); X.fillStyle = gr; X.beginPath(); X.moveTo(x - w / 2, yb); X.lineTo(x - w / 2, yb - h);
    if (br) { X.lineTo(x - w * 0.2, yb - h + w * 0.5); X.lineTo(x + w * 0.1, yb - h + w * 0.15); X.lineTo(x + w / 2, yb - h + w * 0.7); } else X.lineTo(x + w / 2, yb - h);
    X.lineTo(x + w / 2, yb); X.closePath(); X.fill(); X.clip(); X.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < 4; i++) X.fillRect(x - w / 2 + i * w / 4 - 1, yb - h, 2, h); X.restore();
    rect(x - w * 0.68, yb - 8, w * 1.36, 8, c1); rect(x - w * 0.6, yb - 12, w * 1.2, 5, c0);
    if (!br) { rect(x - w * 0.68, yb - h - 8, w * 1.36, 8, c0); rect(x - w * 0.6, yb - h, w * 1.2, 5, c1); }
  };
  const F = CINE.FILM, set = (id, plat, use, bg) => { const f = F[id]; if (!f) return; f.bg = bg; f.plat = plat; f.use = (f.use || []).concat((use || []).filter(n => !(f.use || []).includes(n))); };

  /* Arceus – Opphavets hall, over Spear Pillar: stjernene, hjulet som henger i lufta, lyset ovenfra, og et gulv av lys marmor mellom søylene. */
  set(493, ['#fff6d0', '#e8cc70', '#8a6a18'], ['space', 'goldvortex'], t => {
    im('space', 256, 192) || lin(['#02030c', '#0a1238', '#02030c']); stars({ n: 110, seed: 5, a: 0.9, cols: ['#fff', '#ffe9a8', '#9fd0ff'] });
    im('goldvortex', 379, 118, { s: 1.1, r: t * 0.05, a: 0.45, add: 'screen' }) || glow(379, 118, 230, '#6a5420', 0.6, 1);
    rays(379, 112, { n: 16, rot: t * 0.04, col: '#ffe9a8', a: 0.16 + 0.04 * sin(t * 0.8), r1: 420, wid: 0.28 }); wheel(379, 112, 98, 1, t * 0.12, 0.42 + 0.08 * sin(t));
    ground(198, '#cfc49a', '#4a4230', '#fff6d0', 0.4, 300); rect(0, 196, W, 3, '#fff6d0', 0.9);
    column(40, 250, 34, 210, '#f4ecd0', '#8a7c50'); column(140, 222, 24, 160, '#e8e0c0', '#807248'); column(222, 206, 16, 118, '#d8d0b0', '#786a44', 1); column(486, 262, 38, 230, '#f4ecd0', '#8a7c50');
    beam(379, 60, -10, 198, '#ffe9a8', 0.2 + 0.05 * sin(t * 1.3), '#fff');
    dust('up', { n: 40, seed: 6, cols: ['#ffe9a8', '#fff'], a: 0.7, spd: 0.6 }); vig(0.35, '#0a0600');
  });
  /* Rayquaza – toppen av Sky Pillar: over skyene, med ozonlaget som et grønt bånd på himmelen og tårnets steinheller under føttene. */
  set(384, ['#d8d0b0', '#a89c78', '#5a5240'], ['curtainblue', 'curtain1', 'curtain2'], t => {
    lin(['#020a24', '#0a2c5c', '#2a78a8', '#9fd8e0']); stars({ n: 70, seed: 5, a: 0.6, cols: ['#fff'] }); aurora(t, 0.45);
    glow(379, 50, 220, '#3fe08a', 0.18 + 0.05 * sin(t * 0.7), 1);
    /* Skyhavet under oss. */
    for (let L = 0; L < 3; L++) for (let i = 0; i < 9; i++) { const z = 0.7 + L * 0.3, x = ((rnd(i, 3 + L) * 700 + t * (5 + L * 4)) % 700) - 90; glow(x, 150 + L * 18 + rnd(i, 6 + L) * 14, 70 * z, L === 2 ? '#f4fbff' : '#c8dcea', 0.75); }
    lin([[0, 'rgba(244,251,255,0)'], [1, '#f4fbff']], 0.85, 160, 208);
    ground(204, '#b8ae8a', '#4a4434', '#3a3428', 0.5, 220); rect(0, 202, W, 4, '#e8e0c0', 0.9);
    column(60, 246, 36, 96, '#c8c0a0', '#6a6248', 1); column(470, 232, 30, 150, '#c8c0a0', '#6a6248', 1); column(250, 210, 18, 60, '#b0a888', '#5a5440', 1);
    for (let i = 0; i < 5; i++) { const ph = (rnd(i, 7) + t * (0.5 + rnd(i, 8) * 0.4)) % 1; rect(W - ph * (W + 300), 30 + rnd(i, 9) * 300, 120, 1.5, '#fff', 0.35 * sin(ph * PI), 1); }
    vig(0.3, '#02081a');
  });
  /* Giratina – Forvrengningsverdenen, med en øy av stein under føttene. */
  set(487, ['#3a2a55', '#1a1028', '#07040c'], [], t => { gWorld(t); island(379, 190, 150, 70, 5, 0, '#0c0716', '#5a3a72'); island(110, 362, 210, 60, 8, 0, '#0c0716', '#5a3a72'); vig(0.4, '#05010a'); });
  /* Mewtwo – ruinene av laboratoriet: det som er igjen av rommet svever rundt den. */
  set(150, ['#4a3a6a', '#2a1c4a', '#0e0820'], ['vortex', 'rings'], t => {
    lin(['#06020e', '#150a2c', '#0a0418']); im('vortex', 379, 130, { s: 1.2, r: t * 0.1, a: 0.6, add: 'screen' }) || glow(379, 130, 240, '#3a1a6a', 0.6, 1); im('rings', 379, 130, { s: 1.3, r: -t * 0.25, a: 0.25, add: 1 });
    for (let i = 0; i < 9; i++) rect(i * 64 + 10 + (rnd(i, 3) - 0.5) * 20, 20, 2, 110 + rnd(i, 5) * 110, '#2a1c4a', 0.6);
    ground(200, '#1c1232', '#05030c', '#5a3a9a', 0.3); rect(0, 198, W, 3, '#3a2a6a', 0.9);
    for (let i = 0; i < 16; i++) { const an = rnd(i, 41) * TAU + t * (0.12 + rnd(i, 42) * 0.15), R = 150 + rnd(i, 43) * 150; mRock(379 + cos(an) * R, 120 + sin(an) * 70 + sin(t * 1.4 + i) * 5, 5 + rnd(i, 44) * 12, i + 50, '#120c20'); }
    /* Den knuste tanken. */
    for (const [x, h] of [[60, 120], [86, 70], [112, 150]]) { rect(x, 250 - h, 5, h, '#c8fff0', 0.25, 1); } rect(44, 250, 96, 14, '#2a3a44'); rect(44, 250, 96, 4, '#5a7480');
    glow(92, 240, 80, '#20c0b0', 0.18 + 0.06 * sin(t * 2), 1); dust('ember', { n: 30, seed: 7, cols: ['#c080ff', '#8a5aff'], a: 0.6, spd: 0.7 }); vig(0.45, '#0a0218');
  });
  /* Kyogre – havet i uvær. */
  set(382, ['#7ab0d8', '#3a6a9a', '#12304a'], ['em_cloudL', 'em_cloudR', 'smoke'], t => { storm(t, 0.35, 0.3); sea(t, 196, 9, ['#12304a', '#0e3a6a', '#0a2a50']); lin([[0, 'rgba(2,10,20,0)'], [1, 'rgba(2,10,20,.6)']], 1, 260, 384); const q = floor(t * 0.8), ph = (t * 0.8) % 1; if (ph < 0.18 && rnd(q, 3) > 0.4) { bolt(rnd(q, 1) * W, -10, rnd(q, 2) * W, 190, { seed: q * 3, col: '#9fd0ff', w: 2, a: 1 - ph / 0.18, br: 2 }); fill('#9fd0ff', (0.18 - ph) * 0.8); } });
  /* Groudon – magmakammeret. */
  set(383, ['#6a3a20', '#3a1a0c', '#140602'], ['fireband', 'smoke'], t => {
    lin(['#0a0200', '#2a0800', '#5a1400', '#1a0400']); im('fireband', 256, 196, { s: 1.4, a: 0.6 + 0.2 * sin(t * 1.3), add: 1 }) || glow(256, 200, 300, '#ff5a14', 0.5, 1);
    for (let i = 0; i < 9; i++) { const x = i * 70 - 20 + rnd(i, 3) * 30, h = 60 + rnd(i, 4) * 110; poly([[x - 26, 0], [x + 26, 0], [x + 6, h], [x - 4, h * 0.8]], '#120502'); }
    ground(200, '#3a1206', '#080201'); lava(11, 214, 0.75 + 0.2 * sin(t * 1.7), 0); glow(256, 384, 300, '#ff5a14', 0.3 + 0.08 * sin(t * 2), 1);
    dust('ember', { n: 50, seed: 4, cols: ['#ff7a2a', '#ffd070'], a: 0.8, spd: 1.2 }); fog('smoke', { n: 4, seed: 5, a: 0.25, spd: 10, s: 2, y0: 20, y1: 150 }); vig(0.45, '#140200');
  });
  /* Dialga og Palkia – Spear Pillar: søylene på fjelltoppen, med tiden (urverket) eller rommet (nettet) i himmelen bak. */
  set(483, ['#b8c8e8', '#6a80b0', '#1e2c50'], ['space'], (t, k, cc) => {
    im('space', 256, 192) || lin(['#02030c', '#0a1238', '#02030c']); lin([[0, 'rgba(10,30,90,0)'], [1, 'rgba(60,110,220,.5)']], 1, 60, 200); stars({ n: 90, seed: 6, a: 0.8, cols: ['#fff', '#9fd0ff'] });
    clock(379, 110, 120, t * 0.4, t * 4.8, '#6aa8ff', 0.5); cog(170, 80, 60, 12, t * 0.3, '#6aa8ff', 0.3); cog(96, 150, 34, 8, -t * 0.5, '#6aa8ff', 0.25);
    ground(200, '#8a98b8', '#1e2438', '#d8e4ff', 0.3); rect(0, 198, W, 3, '#d8e4ff', 0.8);
    column(34, 252, 34, 220, '#c8d4f0', '#56648a'); column(132, 224, 24, 150, '#b8c4e0', '#4e5c80', 1); column(486, 264, 38, 250, '#c8d4f0', '#56648a'); column(232, 208, 16, 92, '#a8b4d0', '#465478', 1);
    dust('mote', { n: 30, seed: 8, cols: ['#9fd0ff', '#fff'], a: 0.6 }); vig(0.4, '#02040f');
  });
  set(484, ['#f0c8e4', '#b070a0', '#4a1c48'], ['space'], t => {
    pScene(t, 0.5 + 0.2 * sin(t * 0.6)); ground(206, '#6a3a78', '#160820', '#ffc0ea', 0.3); rect(0, 204, W, 3, '#ffc0ea', 0.8);
    column(34, 252, 34, 220, '#e8c8e8', '#7a4a80'); column(132, 226, 24, 150, '#d8b8d8', '#6e4276', 1); column(486, 264, 38, 250, '#e8c8e8', '#7a4a80'); vig(0.4, '#0a0214');
  });
  /* Lugia – Whirl Islands: hula bak fossen. Ho-Oh – Tin Tower i soloppgangen. */
  set(249, ['#9ac8e0', '#4a7aa0', '#16304a'], ['loc_tohjo', 'fog'], t => { cover('loc_tohjo', { z: 1.06, py: -0.25 }) || lin(['#041a2a', '#0a3a5a', '#041a2a']); fill('#041a3a', 0.35); falls(t, 268, 159, 40, 268, 0.7, 0); strip('fog', 250, t * 16, { s: 1.3, a: 0.5 }); lin([[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,10,20,.55)']], 1, 200, 384); });
  set(250, ['#f8d890', '#c88a30', '#5a2c08'], ['skydawn', 'sun', 'rainbow'], t => {
    lin(['#2a1040', '#b0482a', '#ffb050', '#ffe9a8']); im('skydawn', 256, 130, { s: 1.5, sy: 1.6, a: 0.8 }); im('sun', 379, 150, { s: 0.9, a: 0.7, add: 1, r: t * 0.03 }) || glow(379, 150, 220, '#ffd070', 0.7, 1);
    im('rainbow', 200, 120, { s: 1.2, a: 0.3 + 0.08 * sin(t * 0.5), add: 1 }); M.pagoda(96, 232, 0.72, '#2a1008'); M.pagoda(20, 220, 0.4, '#3a180c');
    ground(204, '#8a4a1c', '#1c0a04', '#ffd070', 0.25); rect(0, 202, W, 3, '#ffd070', 0.7); dust('ember', { n: 34, seed: 4, cols: ['#ffd070', '#fff', '#ff9a3a'], a: 0.7, spd: 0.6 }); vig(0.35, '#1a0600');
  });
  /* Deoxys – krateret der meteoren slo ned, under nordlyset. */
  set(386, ['#6a5a80', '#2e2440', '#0c0816'], ['space', 'curtain1', 'curtain2', 'curtainblue'], t => {
    im('space', 256, 192) || lin(['#02030c', '#0a1238', '#02030c']); stars({ n: 120, seed: 5, a: 0.9, cols: ['#fff', '#ffb0a0', '#9fe8e0'] }); aurora(t, 0.8); helix(t, 60, 0.3); helix(t + 2, 470, 0.3);
    poly([[0, 204], [90, 180], [180, 198], [260, 186], [330, 200], [430, 178], [W, 200], [W, H], [0, H]], '#0c0816'); ground(206, '#241a38', '#06040c', '#ff7a4a', 0.2);
    for (let i = 0; i < 3; i++) ring(256, 300, 150 + i * 60, { col: '#ff7a4a', w: 2, a: 0.14, sy: 0.22 });
    glow(379, 140, 170, '#ff7a4a', 0.12 + 0.05 * sin(t * 1.4), 1); dust('mote', { n: 36, seed: 8, cols: ['#ff7a4a', '#40d0c0', '#fff'], a: 0.7 }); vig(0.4, '#04020c');
  });
  /* Reshiram – flammehavet. Zekrom – uværet. Kyurem – isgrotten. Darkrai – nymånenatten. */
  set(643, ['#f0e0d0', '#c08060', '#4a1c10'], ['curtain1', 'curtain2', 'evilbg'], t => { lin(['#1a0400', '#5a1400', '#c04a14', '#3a0c00']); flames(t, 0.3, 0.8, ['#ff6a1a', '#ffe0b0']); ground(204, '#4a1608', '#0c0200', '#ffb070', 0.25); rect(0, 202, W, 3, '#ffb070', 0.6); dust('ember', { n: 60, seed: 4, cols: ['#ff7a2a', '#ffd070', '#fff'], a: 0.9, spd: 1.5 }); vig(0.4, '#140200'); });
  set(644, ['#7a8aa8', '#3a4660', '#0e1420'], ['em_cloudL', 'em_cloudR', 'smoke'], (t, k, cc) => { storm(t, 0.5, 0.45); const q = floor(t * 1.1), ph = (t * 1.1) % 1; if (ph < 0.2 && rnd(q, 3) > 0.3) { bolt(rnd(q, 1) * W, -10, rnd(q, 2) * W, 200, { seed: q * 3, col: '#5ac8ff', w: 2.4, a: 1 - ph / 0.2, br: 3 }); fill('#5ac8ff', (0.2 - ph) * 0.9); } ground(204, '#1c2434', '#04060a', '#5ac8ff', 0.25); rect(0, 202, W, 3, '#5ac8ff', 0.5); vig(0.45, '#02040a'); });
  set(646, ['#e8f8ff', '#9fd0e8', '#3a6a8a'], ['loc_icepath', 'fog'], t => { cover('loc_icepath', { z: 1.06, py: -0.25 }) || lin(['#bfe6ff', '#e8f8ff', '#7ab8e8']); fill('#04122a', 0.42); frost(0.6, 0.5); strip('fog', 250, t * 20, { s: 1.3, a: 0.5 }); lin([[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,10,30,.5)']], 1, 200, 384); });
  set(491, ['#4a2a4a', '#20101e', '#080408'], ['darkfog', 'smoke'], t => { lin(['#04020a', '#12061c', '#200a20', '#04020a']); stars({ n: 70, seed: 5, a: 0.6, cols: ['#fff', '#ff9ac0'] }); glow(379, 80, 170, '#b03060', 0.25, 1); disc(379, 80, 46, '#f0d8e4', 0.9); disc(396, 72, 42, '#12061c', 1); ground(204, '#160a16', '#020103', '#b03060', 0.2); strip('darkfog', 262, t * 14, { a: 0.5 }) || fog('', { n: 6, seed: 3, a: 0.6, spd: 12, s: 1.5, y0: 280, y1: 400, col: '#07030c' }); vig(0.5, '#0a0008'); });

  /* ================= DARK MEWTWO =================
     Låta er Mewtwo-temaet fra X og Y, og filmen følger den fra første sekund: et støt på 1.07, takter på 1,333 s, to raske slag (7.31, 7.48), fire tunge
     (9.07, 9.74, 10.41, 11.07), hovedtemaet på 11.74, det sterkeste slaget på 15.73 og et til på 17.07.
     Filmen: den begynner som en helt vanlig Mewtwo-raid, med navnet på plass. Så stikker den første krystallen av skygge inn i bildet. For hver takt kommer flere,
     fargen suges ut, navnet går i stykker, og Mewtwo blinker mellom seg selv og noe annet. Fire tunge slag i fire klipp: øyet, den svarte sola, negativet,
     og alt som trekker seg sammen til ett punkt. Så sprenger Dark Mewtwo seg ut, lader en kule av skygge, fyrer den rett mot oss så bildet knuser – og navnet slår ned. */
  const DH = [9.07, 9.74, 10.41, 11.07], DR = 11.74, DSP = [[-10, 250, 3.74], [522, 120, 5.07], [150, -10, 6.4], [380, 394, 6.4], [-10, 80, 7.74], [522, 300, 7.74], [300, -10, 7.74], [120, 394, 7.74]], GL = '#%&?!X/\\';
  film('dk150', { len: 19.6, at: 0, R: DR, outc: '#000', sps: [150], use: ['vortex', 'redswirl', 'cracks', 'arcs', 'burst', 'smoke', 'curtain1', 'curtain2', 'sparkle', 'evilbg', 'rings', 'sphere'],
    cues: [[1.07, 'thud'], [3.74, 'boom'], [5.07, 'boom'], [6.4, 'boom'], [7.31, 'thud'], [7.48, 'thud'], [7.74, 'boom'], [9.07, 'boom'], [9.74, 'boom'], [10.41, 'boom'], [11.07, 'boom'], [DR, 'cry'], [DR, 'boom'], [13.07, 'thud'], [15.73, 'boom'], [17.07, 'boom']],
    draw(t, P, c) {
      const cx = 256, cy = 184, sp = c.sp, ex = sp ? (0.4 - 0.5) * sp.bw : -6, ey = sp ? (0.13 - 0.5) * sp.bh : -26, crk = tintArt('cracks', '#ff8a2a'), X = K.g;
      if (t < DH[0]) {
        /* Mewtwo, og skyggen som tar den. */
        const on = seg(t, 1.07, 1.3), cor = seg(t, 3.74, 9.07), bh = hits(t, [3.74, 5.07, 6.4, 7.74], 0.45), q2 = hits(t, [7.31, 7.48], 0.25), y = cy - 8 + sin(t * 1.5) * 5, s = 3.0, sun = seg(t, 7.74, 9.07);
        const fl = t >= 3.74 && (bh > 0.35 || q2 > 0.3 || rnd(floor(t * 14), 3) < cor * 0.6) ? 1 : 0;
        P.bars = 1; lin([blend('#06020e', '#04020a', cor), blend('#150a2c', '#1a0a14', cor), blend('#0a0418', '#020104', cor)]);
        if (t < 1.07) { dust('mote', { n: 30, seed: 3, cols: ['#c79bff', '#fff'], a: 0.6 * seg(t, 0, 0.5) }); glow(cx, cy, 20 + t * 26, '#a050ff', 0.35 * t, 1); spr(cx, cy, 0.7 + t * 0.5, { id: 150, col: '#0a0418', a: seg(t, 0.3, 1.0) }); P.sh = seg(t, 0.8, 1.07) * 3; return; }
        im('vortex', cx, 180, { s: 1.3, r: t * 0.12, a: 0.7, add: 'screen' }) || glow(cx, 180, 280, blend('#3a1a6a', '#3a0a14', cor), 0.6, 1);
        im('rings', cx, 180, { s: 1.5, r: -t * 0.3, a: 0.3 * (1 - cor), add: 1 }); im('redswirl', cx, 180, { s: 1.6, r: t * 0.2, a: 0.5 * cor, add: 1 });
        blackSun(t, cx, 150, 30 + sun * 70, seg(t, 7.74, 8.5));
        for (let i = 0; i < 14; i++) { const an = rnd(i, 41) * TAU + t * (0.25 + rnd(i, 42) * 0.3), R = 130 + rnd(i, 43) * 150; mRock(cx + cos(an) * R, 190 + sin(an) * 60 + sin(t * 2 + i) * 5, 6 + rnd(i, 44) * 10, i + 50, blend('#1a1430', '#07040c', cor)); }
        DSP.forEach((q, i) => shard(q[0], q[1], Math.atan2(cy - 20 - q[1], cx - q[0]), Math.hypot(cx - q[0], cy - q[1]) * (0.64 + 0.06 * (i % 3)), eo(seg(t, q[2], q[2] + 0.16)), 20 + (i % 3) * 5));
        aura(cx, y, s, fl ? '#ff7a1a' : '#a050ff', 3 + bh * 5, (0.25 + bh * 0.3) * on); spr(cx, y, s, { id: 150, a: on * (1 - fl) }); spr(cx, y, s, { a: on * fl });
        glow(cx + ex * s, y + ey * s, 16 + bh * 16 + q2 * 20, fl || t > 7.31 ? '#ff8a2a' : '#e0b0ff', 0.9 * on, 1); glow(cx + ex * s, y + ey * s, 5, '#fff', on, 1);
        if (fl) for (let i = 0; i < 2; i++) { const q = DSP[(floor(t * 10) + i) % DSP.length]; if (t > q[2] + 0.2) bolt(cx + (q[0] - cx) * 0.36, cy + (q[1] - cy) * 0.36, cx, y, { seed: floor(t * 20) + i, col: '#ff8a2a', core: '#fff2d0', w: 1.8, a: 0.9, br: 1 }); }
        if (crk) im(crk, 256, 192, { a: cor * 0.45 + bh * 0.5, add: 1 });
        wave(1.07, cx, cy, { col: '#e0c0ff', r: 560, d: 0.8, w: 14 }); [3.74, 5.07, 6.4, 7.74].forEach(q => wave(q, cx, cy, { col: '#ff8a2a', r: 560, d: 0.6, w: 12 }));
        /* Navnet: først som i en vanlig raid, så går det i stykker. */
        if (t > 1.35 && t < 8.6) {
          const real = c.name, br = t >= 3.74, mix2 = br && t >= 6.4 && rnd(floor(t * 9), 7) < 0.45, nm = !br ? 'Mewtwo' : mix2 ? 'Dark Mewtwo' : [...'MEWTWO'].map((ch, i) => rnd(floor(t * 12), i) < cor * 0.9 ? GL[floor(rnd(floor(t * 12), i + 9) * GL.length)] : ch).join('');
          const cv = onAux(1, () => { c.name = nm; card(1.35, { col: blend('#c79bff', '#ff8a2a', br ? 0.3 + cor * 0.7 : 0), cap: !br ? 'Legendary Pokémon' : t >= 6.4 ? '? ? ? ? ?' : 'Legendary Pokémon' }); c.name = real; });
          X.save(); X.globalAlpha = 1 - seg(t, 7.74, 8.6); const dx = br ? (rnd(floor(t * 30), 1) - 0.5) * (4 + cor * 16) * (bh > 0.1 ? 2 : 1) : 0; X.drawImage(cv, dx, 0); if (br && rnd(floor(t * 16), 2) < cor) { X.globalCompositeOperation = 'lighter'; X.globalAlpha *= 0.5; X.drawImage(cv, -dx * 2 + 6, 3); } X.restore();
        }
        vig(0.5 + cor * 0.2, '#020106');
        P.sh = hit(t, 1.07, 0.5) * 8 + bh * 13 + q2 * 7 + cor * 1.5; P.fl = max(hit(t, 1.07, 0.3) * 0.8, hits(t, [3.74, 5.07, 6.4, 7.74], 0.12) * 0.5); P.fc = t < 3 ? '#f0e0ff' : '#ffd8a0'; P.rgb = bh * 7 + q2 * 5 + cor * 1.5; P.gl = bh * 0.6 + q2 * 0.4 + (cor > 0.1 && rnd(floor(t * 9), 4) > 0.86 ? 0.2 + cor * 0.3 : 0); P.z = 1 + cor * 0.14 + bh * 0.05 + q2 * 0.08; P.zy = cy;
        return;
      }
      if (t < DR) {
        /* Fire slag, fire klipp. */
        const i = t < DH[1] ? 0 : t < DH[2] ? 1 : t < DH[3] ? 2 : 3, lt = t - DH[i], h = hit(t, DH[i], 0.45);
        P.bars = 1;
        if (i === 0) { const s = 10 + lt * 1.5; fill('#020104'); spr(cx - ex * s, 200 - ey * s, s, {}); glow(cx, 200, 150 + h * 80, '#ff5a14', 0.5, 1); glow(cx, 200, 36 + h * 30, '#ff8a2a', 1, 1); glow(cx, 200, 9, '#fff', 1, 1); for (let k = 0; k < 6; k++) rect(0, rnd(k, floor(t * 20)) * H, W, 2, '#ff8a2a', 0.25, 1); vig(0.8, '#000'); }
        else if (i === 1) { dVoid(t, 1); blackSun(t, cx, 170, 120 + lt * 30, 1); spr(cx, 262, 1.5, { col: '#000' }); glow(cx + ex * 1.5, 262 + ey * 1.5, 8, '#ff8a2a', 1, 1); DSH.forEach(q => shard(q[0], q[1], q[2], q[3], 1, q[4])); vig(0.6, '#000'); }
        else if (i === 2) { fill('#06030a'); for (let k = 0; k < 7; k++) { const q = floor(t * 16 + k * 3), an = rnd(q, k) * TAU; bolt(cx, cy, cx + cos(an) * 400, cy + sin(an) * 300, { seed: q + k, col: '#ff8a2a', core: '#fff', w: 2.5, a: 1, br: 2 }); } aura(cx, cy, 3.6, '#ff8a2a', 6, 0.6); spr(cx, cy, 3.6, {}); if (crk) im(crk, 256, 192, { a: 1, add: 1 }); P.inv = 1 - seg(lt, 0.3, 0.5); }
        else { const m = eo(seg(lt, 0, 0.55)); dVoid(t, 1); blackSun(t, cx, cy - 20, 110 * (1 - m), 1 - m); DSH.forEach(q => shard(q[0], q[1], q[2], q[3] * (1 - m), 1, q[4])); spr(cx, cy, 3.2 * (1 - m * 0.96), {}); for (let k = 0; k < 3; k++) ring(cx, cy, (1 - m) * (300 - k * 80) + 4, { col: '#ff8a2a', w: 3, a: 1 }); fill('#000', seg(lt, 0.25, 0.6)); glow(cx, cy, 12, '#ffd070', seg(lt, 0.3, 0.6), 1); }
        P.sh = h * 16; P.fl = hit(t, DH[i], 0.1) * 0.5; P.fc = '#ffd8a0'; P.rgb = h * 8; P.z = 1 + h * 0.1; P.zy = cy; P.gl = h * 0.5;
        return;
      }
      /* Dark Mewtwo. */
      const hero = (yy, s, bt) => {
        dVoid(t, 1); im('evilbg', 256, 192, { a: 0.4 }); blackSun(t, cx, yy - 34, 104 + bt * 8, 1);
        DSH.forEach((q, i) => shard(q[0], q[1], q[2], q[3] * (0.9 + 0.1 * sin(t * 2 + i)), 1, q[4] * 1.2));
        flames(t * 1.4, 0.45, 0.8, ['#ff5a14', '#7a2a9a']); im('arcs', cx, yy, { s: 1.1, r: t * 1.6, a: 0.6, add: 1 });
        for (let i = 0; i < 6; i++) { const q = floor(t * 8 + i * 1.7), an = rnd(q, i) * TAU; bolt(cx + cos(an) * 50, yy + sin(an) * 40, cx + cos(an) * (200 + rnd(q, i + 4) * 130), yy + sin(an) * (160 + rnd(q, i + 5) * 90), { seed: q * 5 + i, col: '#ff8a2a', core: '#fff2d0', w: 1.8, a: 0.9, br: 2 }); }
        glow(cx, yy, 200, '#ff5a14', 0.3 + bt * 0.25, 1); aura(cx, yy, s, '#ff8a2a', 4 + bt * 5, 0.4 + bt * 0.3); spr(cx, yy, s); glow(cx + ex * s, yy + ey * s, 26 + bt * 12, '#ff8a2a', 1, 1); glow(cx + ex * s, yy + ey * s, 6, '#fff', 1, 1);
        dust('ember', { n: 90, seed: 7, cols: ['#ff8a2a', '#ffd070', '#ff3a1a'], a: 1, spd: 2.2 });
      };
      if (t < 15.73) {
        const bt = hits(t, [DR, 13.07, 14.4], 0.5), y = 182 + sin(t * 1.6) * 6, k = seg(t, DR, DR + 0.55), ch = seg(t, 14.4, 15.73);
        hero(y, 3.5, bt); if (crk) im(crk, 256, 192, { a: hit(t, DR, 1.2) * 0.9 + bt * 0.2, add: 1 });
        /* Kula av skygge lades foran den. */
        if (ch > 0) { const r = 8 + ei(ch) * 64, sy = y + 26; for (let i = 0; i < 3; i++) { const kk = ((t * 1.6 + i / 3) % 1); ring(cx, sy, (1 - kk) * 240 + r, { col: '#ff8a2a', w: 2, a: kk * ch }); } glow(cx, sy, r * 3.2, '#ff5a14', 0.8 * ch, 1); disc(cx, sy, r + 3, '#ffb060', 1); disc(cx, sy, r, '#040106', 1); im('arcs', cx, sy, { s: r / 110, r: -t * 5, a: 0.9, add: 1 }); }
        if (t < DR + 0.6) shatter(onAux(0, () => { fill('#000'); glow(cx, cy, 14, '#ffd070', 1, 1); }), seg(t, DR, DR + 0.55), cx, cy, 5);
        im('burst', cx, y, { s: 0.6 + k * 1.8, a: 1 - k, add: 1, r: t }); wave(DR, cx, y, { col: '#fff', r: 600, d: 0.8, w: 20 }); wave(DR + 0.28, cx, y, { col: '#ff8a2a', r: 600, d: 0.9, w: 12 }); wave(13.07, cx, y, { col: '#ff8a2a', r: 600, d: 0.9 }); wave(14.4, cx, y, { col: '#ffd070', r: 600, d: 0.9 });
        vig(0.6 + bt * 0.2, '#0a0200');
        P.sh = hit(t, DR, 1.4) * 20 + hit(t, 13.07, 0.5) * 9 + hit(t, 14.4, 0.4) * 6 + ch * ch * 7 + bt * 2; P.fl = hit(t, DR, 0.45); P.fc = '#ffe0b0'; P.rgb = hit(t, DR, 0.9) * 10 + bt * 3 + ch * 3; P.gl = hit(t, DR, 0.7) * 0.8 + (rnd(floor(t * 8), 3) > 0.9 ? 0.25 : 0); P.z = 1 + hit(t, DR, 0.45) * 0.18 + ei(ch) * 0.3; P.zy = cy + 20;
      } else if (t < 17.07) {
        /* Den fyrer: kula kommer rett mot oss, og bildet knuser. */
        const lt = t - 15.73, gr = ei(seg(lt, 0, 0.42)), brk = seg(lt, 0.42, 1.34);
        hero(182, 3.5, 1); rays(cx, cy + 20, { n: 24, rot: t * 0.6, col: '#ff8a2a', a: 0.9 * (1 - brk), r1: 560, wid: 0.5 }); rays(cx, cy + 20, { n: 12, rot: -t, col: '#fff2d0', a: 0.7 * (1 - brk), r1: 560, wid: 0.3 });
        glow(cx, cy + 20, 120 + gr * 520, '#ffb060', 1, 1); disc(cx, cy + 20, 70 + gr * 460, '#030106', 1); ring(cx, cy + 20, 72 + gr * 460, { col: '#ffb060', w: 6, a: 1 - gr });
        if (lt >= 0.42) { fill('#030106'); if (crk) { im(crk, 256, 192, { a: 1, add: 1, s: 1 + brk * 0.08 }); im(crk, 256, 192, { a: brk, add: 1, s: 1.3, r: 1.9 }); } else for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + rnd(i, 2); bolt(cx, cy, cx + cos(an) * 420, cy + sin(an) * 320, { seed: i * 9, col: '#ff8a2a', core: '#fff2d0', w: 1.6, a: 0.9, depth: 5, jag: 0.2 }); } glow(cx, cy, 60 + brk * 200, '#ff5a14', 0.3 + brk * 0.4, 1); }
        P.sh = hit(t, 15.73, 0.5) * 14 + hit(t, 16.15, 0.9) * 20; P.fl = max(hit(t, 15.73, 0.25) * 0.7, hit(t, 16.15, 0.2) * 0.9); P.fc = '#ffe0b0'; P.rgb = 9 * (1 - brk) + 2; P.gl = hit(t, 16.15, 0.6); P.z = 1 + gr * 0.2;
      } else {
        /* Bildet faller fra hverandre, og der står den. */
        const lt = t - 17.07, bt = hits(t, [17.07, 18.4], 0.5);
        hero(170 + sin(t * 1.6) * 5, 3.8, bt); vig(0.6, '#0a0200');
        if (lt < 0.7) shatter(onAux(0, () => { fill('#030106'); if (crk) { im(crk, 256, 192, { a: 1, add: 1, s: 1.08 }); im(crk, 256, 192, { a: 1, add: 1, s: 1.3, r: 1.9 }); } }), seg(lt, 0, 0.65), cx, cy, 9);
        wave(17.07, cx, cy, { col: '#fff', r: 600, d: 0.8, w: 20 }); wave(17.3, cx, cy, { col: '#ff8a2a', r: 600, d: 0.9, w: 10 }); wave(18.4, cx, cy, { col: '#ff8a2a', r: 600, d: 0.9 });
        card(17.3, { col: '#ff8a2a', cap: 'Shadow Pokémon' });
        P.sh = hit(t, 17.07, 0.9) * 16 + hit(t, 17.42, 0.4) * 8 + bt * 2; P.fl = max(hit(t, 17.07, 0.3) * 0.8, hit(t, 17.42, 0.2) * 0.5); P.fc = '#ffe0b0'; P.rgb = hit(t, 17.07, 0.8) * 8 + bt * 2; P.z = 1 + hit(t, 17.07, 0.4) * 0.14; P.zy = cy; P.fade = seg(t, 19.3, 19.6);
      }
    },
    /* Stedet i kampen: tomrommet under den svarte sola. */
    plat: ['#3a2030', '#160a12', '#050206'],
    bg(t) {
      dVoid(t, 0.5); im('evilbg', 256, 192, { a: 0.35 }); blackSun(t, 379, 96, 62, 0.9);
      ground(200, '#140a10', '#020103', '#ff8a2a', 0.22); rect(0, 198, W, 2, '#ff8a2a', 0.5);
      DSH.forEach(q => shard(q[0], q[1], q[2], q[3] * 0.6, 1, q[4])); lava(7, 230, 0.5 + 0.2 * sin(t * 2), 3); vig(0.5, '#0a0200');
    },
    air(t, k) {
      fill('#08030e', 0.2 * k);
      const q = floor(t * 1.4), ph = (t * 1.4) % 1; if (ph < 0.2 && rnd(q, 7) > 0.4) bolt(rnd(q, 1) * W, -10, rnd(q, 2) * W, 140 + rnd(q, 3) * 140, { seed: q * 3 + floor(ph * 20), col: '#ff8a2a', core: '#fff2d0', w: 2, a: (1 - ph * 5) * k, br: 2 });
      flames(t, 0.16, 0.4 * k, ['#ff5a14', '#7a2a9a']); dust('ember', { n: 46, seed: 7, cols: ['#ff8a2a', '#ffd070', '#ff3a1a'], a: 0.9 * k, spd: 1.3 }); vig(0.55 * k, '#0a0200');
    }
  });
  /* De aller sjeldneste varsles før filmen starter. */
  for (const id of [493, 386]) if (F[id]) F[id].omen = 1;
})();
