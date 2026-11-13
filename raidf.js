'use strict';
/* Fokusdex – selve filmene til de legendariske (motoren ligger i raid.js). Alle tider er sekunder fra låta starter, lagt på slagene i musikken.
   Hver film har draw(t, P): hele bildet for tidspunktet t, og kameraet P (risting, zoom, blink …). air(t, k) er stemningen som blir med inn i kampen. */
(() => {
  const K = CINE.kit, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, pulse, io, eo, ei, back, rnd, rgba, blend, fill, lin, glow, im, has, tintArt, mulArt, cover, strip, spr, aura, sprH, bolt, rays, ring, wave, poly, rect, beam, stars, dust, fog, txt, vig, card, shatter, onAux, film } = K;
  /* Flere slag på rad: det sterkeste av dem akkurat nå. */
  const hits = (t, list, d) => list.reduce((m, q) => max(m, hit(t, q, d)), 0);

  /* ---------- Motiver som går igjen ---------- */
  /* En svevende øy av stein: flat på den ene siden, tagget på den andre. up = opp ned. */
  const island = (x, y, w, h, seed, up, col, rim) => {
    const pts = [[x - w, y], [x + w, y]], n = 7;
    for (let i = n; i >= 0; i--) { const k = i / n, d = sin(k * PI) * h * (0.55 + rnd(i, seed) * 0.6); pts.push([x - w + 2 * w * k, y + (up ? -d : d)]); }
    poly(pts, col || '#0a0612'); rect(x - w, y - (up ? 0 : 2), 2 * w, 2, rim || '#3a2a55', 0.9);
  };
  /* Et svart bånd som bukter seg inn fra kanten og ender i en rød pigg (vingene til Giratina). k = hvor langt det har strukket seg. */
  const tendril = (x0, y0, ang, len, k, seed, w0, quick) => {
    if (k <= 0.01) return; const N = 16, L = [], R = [], t = K.T * (quick || 1), nx = -sin(ang), ny = cos(ang); let tip = [x0, y0];
    for (let i = 0; i <= N; i++) { const s = i / N, d = s * len * k, wob = sin(s * 4.5 + t * 1.7 + seed * 3) * 22 * s + sin(s * 9 + t * 2.9 + seed) * 6 * s, px = x0 + cos(ang) * d + nx * wob, py = y0 + sin(ang) * d + ny * wob, hw = (w0 || 17) * (1 - s * 0.82) + 2; L.push([px + nx * hw, py + ny * hw]); R.push([px - nx * hw, py - ny * hw]); tip = [px, py]; }
    const body = L.concat(R.reverse()), X = K.g; X.save(); X.strokeStyle = '#5a0c1c'; X.lineWidth = 3; X.lineJoin = 'round'; X.globalAlpha = 0.85; X.beginPath(); body.forEach((q, i) => i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1])); X.closePath(); X.stroke(); X.restore();
    poly(body, '#040207');
    const a2 = ang + sin(t * 1.7 + seed * 3 + 4.5) * 0.5, tx = tip[0] + cos(a2) * 46 * k, ty = tip[1] + sin(a2) * 46 * k, mx = -sin(a2) * 9, my = cos(a2) * 9;
    glow(tip[0], tip[1], 46, '#ff2030', 0.55 * k, 1); poly([[tip[0] + mx, tip[1] + my], [tx, ty], [tip[0] - mx, tip[1] - my]], '#d8142a'); poly([[tip[0] + mx * 0.4, tip[1] + my * 0.4], [tx, ty], [tip[0] - mx * 0.4, tip[1] - my * 0.4]], '#ff8a7a');
  };
  /* Et øye av lys som åpner seg: en mandel med smal pupill. op = 0..1 åpent. */
  const eye = (x, y, w, op, ang, col, hot) => {
    if (op <= 0.01) return; const X = K.g, h = w * 0.36 * op; X.save(); X.translate(x, y); X.rotate(ang || 0);
    glow(0, 0, w * 1.9, col, 0.6 * op, 1); X.globalCompositeOperation = 'lighter'; X.fillStyle = col; X.beginPath(); X.moveTo(-w, 0); X.quadraticCurveTo(0, -h * 2, w, 0); X.quadraticCurveTo(0, h * 2, -w, 0); X.fill();
    X.fillStyle = hot || '#ffd8c8'; X.beginPath(); X.moveTo(-w * 0.62, 0); X.quadraticCurveTo(0, -h, w * 0.62, 0); X.quadraticCurveTo(0, h, -w * 0.62, 0); X.fill();
    X.globalCompositeOperation = 'source-over'; X.fillStyle = '#000'; X.beginPath(); X.ellipse(0, 0, w * 0.07, h * 0.95, 0, 0, TAU); X.fill(); X.restore();
  };

  /* ================= GIRATINA =================
     Låta smeller i gang på 0.29, ligger og ulmer fra 3.4, slår tre ganger (9.26, 9.60, 9.91) og bryter løs på 10.09.
     Filmen: verden sprekker og vi faller inn i Forvrengningsverdenen. Noe stort passerer i mørket. Lyset dør, de røde piggene lukker seg rundt oss én etter én,
     og to øyne åpner seg. Tre slag, svart – og så knuser den gjennom bildet. Til slutt står den i vår verden, med skyggen av seg selv bak. */
  const GT = [3.9, 4.7, 5.69, 6.66, 7.5, 8.3], GP = [[-10, 300, -0.5, 250], [522, 70, 2.75, 250], [-10, 90, 0.35, 240], [522, 310, -2.7, 250], [150, -10, 1.35, 190], [372, 394, -1.75, 190]];
  const gWorld = t => {
    lin(['#07020e', '#170828', '#200814', '#040106']); im('evilbg', 256, 192, { a: 0.5 });
    im('vortex', 256, 170, { s: 1.25, r: -t * 0.06, a: 0.6, add: 'screen' }) || glow(256, 170, 300, '#1a1040', 0.6, 1);
    im('redswirl', 256, 170, { s: 1.5, r: t * 0.1, a: 0.22, add: 1 });
    /* Fosser som renner oppover, og søyler av blekt lys langt borte. */
    for (let i = 0; i < 4; i++) { const x = 60 + i * 130 + sin(t * 0.2 + i * 2) * 20; rect(x, 0, 14 + i * 3, H, '#5a4aa0', 0.07 + 0.03 * sin(t * 0.7 + i), 1); }
    dust('up', { n: 34, seed: 21, cols: ['#4a3a86', '#6a3a6a', '#8a7ac0'], a: 0.6, spd: 0.9 });
    for (let i = 0; i < 11; i++) { const a = rnd(i, 31), b = rnd(i, 32), c = rnd(i, 33), z = 0.45 + c * 1.5, x = ((a * 760 + t * 12 * z) % 760) - 120, y = 40 + b * 290 + sin(t * 0.5 + i) * 6; island(x, y, 26 * z + 14, 30 * z + 10, i + 40, i % 3 === 0, z > 1.2 ? '#050208' : '#0e0919', z > 1.2 ? '#5a3a72' : '#30204a'); }
    fog('smoke', { n: 5, seed: 12, a: 0.3, spd: 9, s: 1.9, y0: 60, y1: 330 });
    strip('darkfog', 262, t * 16, { a: 0.5 }); strip('darkfog', -50, -t * 10, { a: 0.3 });
  };
  film(487, { len: 14.3, R: 10.09, outc: '#000', spid: 10007, use: ['giratina', 'evilbg', 'vortex', 'darkfog', 'smoke', 'cracks', 'redswirl', 'redglow'],
    cues: [[0.29, 'boom'], [9.26, 'thud'], [9.6, 'thud'], [9.91, 'thud'], [10.09, 'cry'], [10.09, 'boom'], [11.39, 'thud']],
    draw(t, P, c) {
      const sil = tintArt('giratina', '#000'), red = mulArt('giratina', '#ff3a3a');
      if (t < 10.09) {
        P.bars = 1;
        if (t < 0.29) return;
        gWorld(t); P.z = 1 + seg(t, 0.3, 9.9) * 0.14; P.zy = 170;
        /* Sprekkene: de lyser opp i det verden brister, og blir liggende og pulse som et hjerte. */
        const hb = pulse((t * 0.87) % 1, 0, 0.22) * 0.6 + pulse((t * 0.87 + 0.72) % 1, 0, 0.18) * 0.35;
        im('cracks', 256, 192, { a: hit(t, 0.29, 1.4) + 0.2 + hb * 0.25, add: 1 }) || bolt(60, 0, 300, 384, { seed: 3, col: '#ff2030', core: '#ff9080', a: hit(t, 0.29, 1.4) + 0.3, w: 3 });
        /* Noe stort passerer: skyggen feier over bildet to ganger. */
        for (const [t0, dir, y, s] of [[1.7, -1, 150, 1.7], [2.62, 1, 230, 2.3]]) { const k = seg(t, t0, t0 + 0.5); if (k > 0 && k < 1) for (let j = 0; j < 4; j++) { const x = dir < 0 ? mix(820, -380, k) + j * 46 : mix(-380, 820, k) - j * 46; if (sil) im(sil, x, y, { s, a: 0.9 - j * 0.2, flip: dir > 0 }); else glow(x, y, 220 * s, '#000', 0.9 - j * 0.2); } }
        /* Lyset dør. */
        fill('#000', io(seg(t, 3.3, 4.8)) * 0.86); vig(0.9, '#000');
        /* For hvert slag anes den et øyeblikk i mørket, hver gang nærmere. */
        GT.forEach((t0, i) => { const a = hit(t, t0, 0.45) * (0.16 + i * 0.035); if (a > 0 && red) im(red, 256 + (i % 2 ? 60 : -50), 200, { s: 0.9 + i * 0.16, a, ax: 0.37, ay: 0.5, flip: i % 2 === 1 }); });
        /* De røde piggene strekker seg inn, én for hvert slag. */
        GT.forEach((t0, i) => { const p = GP[i]; tendril(p[0], p[1], p[2], p[3], eo(seg(t, t0, t0 + 0.8)), i + 1, 18); });
        vig(hits(t, GT, 0.7) * 0.55, '#6a0010');
        /* Øynene. */
        const op = eo(seg(t, 8.25, 9.0)) * (1 - seg(t, 9.985, 10.03)), fl = hits(t, [9.26, 9.6, 9.91], 0.26);
        if (op > 0) { glow(256, 150, 260, '#3a0008', 0.5 * op + fl * 0.4, 1); eye(190, 152, 44 + fl * 10, op, 0.22, '#ff1428'); eye(322, 152, 44 + fl * 10, op, -0.22, '#ff1428'); }
        if (fl > 0) im('cracks', 256, 192, { a: fl * 0.9, add: 1 });
        fill('#000', seg(t, 9.985, 10.03));
        P.fl = hit(t, 0.29, 0.3) * 0.85; P.fc = '#ff1430'; P.gl = hit(t, 0.29, 0.55) * 0.9 + hits(t, [1.7, 2.62], 0.5) * 0.5 + fl * 0.35 + (rnd(floor(t * 7), 5) > 0.93 ? 0.25 : 0);
        P.sh = hit(t, 0.29, 0.7) * 12 + hits(t, [1.7, 2.62], 0.5) * 7 + hits(t, GT, 0.3) * 5 + fl * 8; P.rgb = hit(t, 0.29, 0.6) * 8 + fl * 7; P.z += fl * 0.05;
        return;
      }
      /* Den bryter gjennom. */
      const k1 = seg(t, 10.09, 10.5), title = t >= 11.39, sc = title ? 1.5 + (t - 11.39) * 0.012 : mix(0.7, 1.22, back(k1)) + (t - 10.09) * 0.11, beat = hits(t, [10.09, 10.74, 11.39, 12.04, 12.7, 13.35, 14.0], 0.4);
      lin(['#1a0004', '#3a0008', '#120002', '#000']); im('evilbg', 256, 192, { a: 0.8 }); im('redswirl', 256, 180, { s: 1.9, r: t * 0.5, a: 0.55, add: 1 });
      rays(256, 175, { n: 18, rot: t * 0.25, col: '#ff2a3a', a: 0.2 + beat * 0.2, r1: 460, wid: 0.36 });
      if (title) {
        if (red) im(red, 256, 160, { s: sc * 0.92, a: 0.5 }); fill('#000', 0.25); strip('darkfog', 250, t * 22, { a: 0.6 }); strip('darkfog', -60, -t * 14, { a: 0.4 });
        GP.forEach((p, i) => tendril(p[0], p[1], p[2], p[3] * 0.62, 1, i + 1, 15, 1.6));
        dust('ember', { n: 46, seed: 5, cols: ['#ff5a3a', '#ff2030', '#ffb090'], a: 0.9, spd: 1.5 });
        const y = 176 + sin(t * 2.2) * 4; glow(256, y, 170, '#ff1428', 0.35 + beat * 0.25, 1); aura(256, y, 3, '#ff2030', 4, 0.3 + beat * 0.3); spr(256, y, 3);
        vig(0.55 + beat * 0.3, '#2a0004'); card(11.45, { col: '#ff2a3a' });
      } else {
        /* Hodet kommer rett mot oss: rødt på svart, med øyet som brenner. */
        const hx = 256 + sin(t * 31) * 3, hy = 190 + cos(t * 27) * 3, ex = hx + (145 - 190) * sc, ey = hy + (208 - 200) * sc;
        if (red) { im(red, hx, hy, { s: sc, ax: 0.37, ay: 0.5 }); im('giratina', hx, hy, { s: sc, ax: 0.37, ay: 0.5, a: 0.28 }); im(red, hx, hy, { s: sc * 1.05, ax: 0.37, ay: 0.5, a: 0.3 * (1 - k1) + beat * 0.25, add: 1 }); glow(ex, ey, 60 * sc, '#ff2030', 0.9, 1); glow(ex, ey, 16 * sc, '#ffe0d0', 1, 1); }
        else { aura(256, 196, 4 * sc, '#ff2030', 6, 0.5); spr(256, 196, 4 * sc); }
        GP.forEach((p, i) => tendril(p[0], p[1], p[2], p[3] * 0.8, eo(seg(t, 10.09, 10.45)), i + 1, 18, 2.2));
        dust('ember', { n: 60, seed: 5, cols: ['#ff5a3a', '#ff2030', '#ffb090'], a: 1, spd: 2.4 }); wave(10.09, 256, 180, { col: '#ff3040', r: 520, d: 0.7, w: 16 }); wave(10.41, 256, 180, { col: '#ff8070', r: 520, d: 0.7 }); wave(10.74, 256, 180, { col: '#ff3040', r: 520, d: 0.8 });
        vig(0.5, '#1a0002');
        /* Det svarte bildet med øynene knuser, og skårene flyr. */
        shatter(onAux(0, () => { fill('#000'); im('cracks', 256, 192, { a: 1, add: 1 }); eye(190, 152, 54, 1, 0.22, '#ff1428'); eye(322, 152, 54, 1, -0.22, '#ff1428'); }), seg(t, 10.09, 10.85), 256, 160, 7);
      }
      P.sh = hit(t, 10.09, 1.1) * 18 + hit(t, 11.39, 0.5) * 9 + beat * 2; P.fl = max(hit(t, 10.09, 0.16), hit(t, 11.39, 0.2) * 0.8); P.fc = t < 11.39 ? '#fff' : '#ff1430';
      P.gl = hit(t, 10.09, 0.8) * 0.9 + hit(t, 11.39, 0.4) * 0.7 + (rnd(floor(t * 8), 3) > 0.88 ? 0.3 : 0); P.rgb = hit(t, 10.09, 0.9) * 10 + beat * 2.5; P.fade = seg(t, 14.0, 14.25);
    },
    air(t, k) {
      const hb = pulse((t * 0.87) % 1, 0, 0.22) * 0.6 + pulse((t * 0.87 + 0.72) % 1, 0, 0.18) * 0.35;
      fill('#0a0010', 0.34 * k); fog('', { n: 7, seed: 3, a: 0.8 * k, spd: 16, s: 1.5, y0: 300, y1: 400, col: '#0a0414' }); fog('', { n: 5, seed: 8, a: 0.6 * k, spd: -10, s: 1.4, y0: -30, y1: 40, col: '#0a0414' });
      dust('up', { n: 18, seed: 21, cols: ['#4a3a7a', '#6a2a4a'], a: 0.5 * k, spd: 0.8 }); dust('ember', { n: 26, seed: 5, cols: ['#ff5a3a', '#ff2030'], a: 0.75 * k, spd: 1.1 });
      tendril(-10, 330, -0.5, 150, 0.8 + 0.2 * sin(t * 0.6), 1, 12); tendril(522, 40, 2.75, 150, 0.8 + 0.2 * sin(t * 0.5 + 2), 2, 12);
      vig((0.5 + hb * 0.3) * k, '#30000a');
    }
  });

  /* ================= ARCEUS =================
     Låta slår på 0.39 og 1.20, åpner seg på 3.60, og går så i tunge slag (6.40, 8.39, 10.00, 11.60, 13.20) fram til to forslag (14.05, 14.44) og utbruddet på 14.80.
     Filmen er skapelsen: et lyspunkt i tomrommet, lyset som sprekker opp og blir til stjerner, de seksten platene som samler seg, lyssøyler som slår ned
     mens hjulet bygges bit for bit rundt skyggen, alt som trekkes inn – og så dommen. */
  const PLATE = ['#f08030', '#6890f0', '#f8d030', '#78c850', '#98d8d8', '#c03028', '#a040a0', '#e0c068', '#a890f0', '#f85888', '#a8b820', '#b8a038', '#705898', '#7038f8', '#705848', '#b8b8d0'], AB = [6.4, 8.39, 10.0, 11.6, 13.2], APX = [112, 404, 188, 330];
  /* Hjulet til Arceus: en gullring med fire pigger og grønne steiner. k = hvor mye av ringen som er bygd (0..1). */
  const wheel = (x, y, r, k, rot, a) => {
    if (k <= 0 || a <= 0) return; const X = K.g; X.save(); X.translate(x, y); X.rotate(rot || 0); X.globalAlpha = c01(a); X.lineCap = 'butt';
    for (const [w, col, rr] of [[r * 0.12, '#8a5a08', r], [r * 0.085, '#f8c830', r], [r * 0.03, '#fff6c0', r * 0.985], [r * 0.022, '#f8c830', r * 0.8]]) { X.strokeStyle = col; X.lineWidth = w; X.beginPath(); X.arc(0, 0, rr, -PI / 2, -PI / 2 + TAU * c01(k)); X.stroke(); }
    for (let i = 0; i < 4; i++) { if (k < (i + 0.5) / 4) continue; const an = -PI / 4 + i * PI / 2; X.save(); X.rotate(an); X.fillStyle = '#f8c830'; X.beginPath(); X.moveTo(r * 0.93, -r * 0.1); X.lineTo(r * 1.36, 0); X.lineTo(r * 0.93, r * 0.1); X.closePath(); X.fill(); X.fillStyle = '#fff6c0'; X.beginPath(); X.moveTo(r * 0.96, -r * 0.035); X.lineTo(r * 1.28, 0); X.lineTo(r * 0.96, r * 0.035); X.closePath(); X.fill(); X.fillStyle = '#30d868'; X.beginPath(); X.arc(r, 0, r * 0.055, 0, TAU); X.fill(); X.fillStyle = '#c8ffd8'; X.beginPath(); X.arc(r - r * 0.015, -r * 0.015, r * 0.02, 0, TAU); X.fill(); X.restore(); }
    X.restore();
  };
  /* En søyle av lys som slår ned i t0 og blir stående og dirre litt. */
  const pillar = (t, t0, x, col, w, y1) => { const k = seg(t, t0, t0 + 0.14), d = hit(t, t0, 1.5); if (k <= 0 || d <= 0) return; const yb = (y1 || H) * eo(k), ww = (w || 26) * (0.35 + 0.65 * d) * (1 + 0.12 * sin(t * 50)); beam(x, ww * 4, 0, yb, col, 0.5 * d); beam(x, ww * 1.3, 0, yb, col, d); if (k >= 1) { glow(x, yb, 90 * d + 30, col, 0.8 * d, 1); ring(x, yb, (1 - d) * 150 + 10, { col, a: d * 0.8, w: 4, sy: 0.3 }); } };
  const aPlates = (t, x, y, R, k, a, spin) => { for (let i = 0; i < 16; i++) { const an = i / 16 * TAU + spin, px = x + cos(an) * R * k, py = y + sin(an) * R * 0.42 * k, z = sin(an), s = 1 + z * 0.25, X = K.g; glow(px, py, 22 * s, PLATE[i], 0.5 * a, 1); X.save(); X.translate(px, py); X.rotate(sin(t * 2 + i) * 0.25); X.globalAlpha = c01(a); X.fillStyle = PLATE[i]; X.fillRect(-6 * s, -9 * s, 12 * s, 18 * s); X.fillStyle = 'rgba(255,255,255,.65)'; X.fillRect(-6 * s, -9 * s, 12 * s, 3 * s); X.fillStyle = 'rgba(0,0,0,.35)'; X.fillRect(-6 * s, 6 * s, 12 * s, 3 * s); X.restore(); } };
  film(493, { len: 19.3, R: 14.8, use: ['space', 'goldvortex', 'shine', 'goldshine', 'burst', 'sparkle', 'glowring', 'ring', 'goldpart', 'shinesoft'],
    cues: [[0.39, 'boom'], [3.6, 'thud'], [6.4, 'thud'], [8.39, 'thud'], [10.0, 'thud'], [11.6, 'thud'], [13.2, 'thud'], [14.8, 'cry'], [14.8, 'boom'], [16.4, 'thud']],
    draw(t, P, c) {
      const cx = 256, cy = 176;
      if (t < 14.8) {
        P.bars = 1; if (t < 0.39) return;
        const open = seg(t, 3.6, 5.2), bh = hits(t, AB, 0.5), n = AB.filter(q => t >= q).length;
        /* Tomrommet, og så stjernene som strømmer ut når lyset sprekker opp. */
        if (open > 0) { im('space', 256, 192, { a: open }) || lin(['#02030c', '#0a1030', '#02030c'], open); glow(cx, cy, 330, '#3a2a80', 0.35 * open, 1); glow(cx, cy, 200, '#f8c830', 0.12 * open + bh * 0.1, 1);
          stars({ n: 120, seed: 4, warp: 1 - seg(t, 3.6, 6.2) * 0.86, spd: 0.9 - seg(t, 3.6, 6.4) * 0.72, a: open, cx, cy, cols: ['#fff', '#ffe9a8', '#b8c8ff'] }); stars({ n: 70, seed: 9, a: open * 0.8, cols: ['#fff', '#ffe9a8'] }); }
        /* Lyspunktet. */
        const orb = t < 3.6 ? 10 + hit(t, 0.39, 1.2) * 26 + hit(t, 1.2, 1.2) * 18 + sin(t * 3) * 2 : 0;
        if (orb) { glow(cx, cy, orb * 5, '#fff2c0', 0.5, 1); glow(cx, cy, orb * 1.6, '#fff', 1, 1); im('sparkle', cx, cy, { s: orb / 18, a: 0.9, add: 1, r: t * 0.3 }); for (const q of [0.39, 1.2, 2.2, 3.0]) wave(q, cx, cy, { col: '#ffe9a8', r: 300, d: 2.2, w: 2, a: 0.5 }); dust('mote', { n: 26, seed: 8, cols: ['#fff', '#ffe9a8'], a: seg(t, 0.5, 2) * 0.7 }); }
        if (t >= 3.6 && t < 5) { const k = seg(t, 3.6, 4.5); rect(cx - 2 - k * 6, cy - eo(k) * 260, 4 + k * 12, eo(k) * 520, '#fff', 1 - k, 1); im('burst', cx, cy, { s: 0.4 + k * 1.5, a: 1 - k, add: 1 }); wave(3.6, cx, cy, { col: '#fff', r: 520, d: 1.1, w: 14 }); }
        /* Platene samler seg i en ring og blinker i tur på hvert slag. */
        if (t >= 6.4) { const k = eo(seg(t, 6.4, 7.3)), inw = ei(seg(t, 13.2, 14.3)), R = mix(215, 0, inw); aPlates(t, cx, cy, R, k, 1 - seg(t, 14.0, 14.3), t * 0.5 + inw * 9); }
        /* Skyggen står fram, og hjulet bygges en bit for hvert slag. */
        if (t >= 6.4) { const s = mix(1.6, 3, seg(t, 6.4, 14.3)), a = seg(t, 6.4, 7.6), wk = c01((n - 1 + eo(seg(t, AB[max(1, n) - 1] || 0, (AB[max(1, n) - 1] || 0) + 0.35))) / 4);
          wheel(cx, cy + 6, 44 * s, n >= 2 ? wk : 0, t * 0.15, 0.95); glow(cx, cy, 80 * s, '#f8c830', 0.25 * a + bh * 0.3, 1); aura(cx, cy, s, '#ffe9a8', 2 + bh * 3, (0.25 + bh * 0.4) * a); spr(cx, cy, s, { col: '#05040a', a: c01(a * 1.6) }); }
        /* Lyssøylene. */
        AB.slice(1).forEach((q, i) => pillar(t, q, APX[i], '#ffe08a', 24));
        if (t >= 6.4 && t < 7.4) wave(6.4, cx, cy, { col: '#ffe9a8', r: 500, d: 1 });
        /* Alt trekkes inn, to forslag, og stillhet. */
        const ch = seg(t, 13.2, 14.4), pk = hits(t, [14.05, 14.44], 0.28);
        if (ch > 0) { glow(cx, cy, 60 + ch * 240, '#fff2c0', 0.3 + ch * 0.5 + pk * 0.3, 1); dust('spark', { n: 40, seed: 2, cols: ['#fff', '#f8c830'], a: ch }); for (let i = 0; i < 26; i++) { const an = rnd(i, 71) * TAU, ph = (rnd(i, 72) + t * 1.6) % 1, r = (1 - ph) * 330; rect(cx + cos(an) * r, cy + sin(an) * r, 3, 3, '#ffe9a8', ph * ch, 1); } }
        fill('#000', seg(t, 14.5, 14.62)); if (t > 14.5) ring(cx, cy, 40 + (t - 14.5) * 60, { col: '#f8c830', w: 2, a: 0.9 });
        P.z = 1 + seg(t, 6.4, 14.4) * 0.12 + pk * 0.03; P.zy = cy; P.sh = hit(t, 0.39, 0.5) * 6 + hit(t, 3.6, 0.6) * 9 + bh * 9 + pk * 5; P.fl = max(hit(t, 3.6, 0.25) * 0.9, hits(t, AB, 0.14) * 0.45); P.fc = '#fff6d8';
        return;
      }
      /* Dommen. */
      const k = seg(t, 14.8, 15.3), bt = hits(t, [14.8, 16.4, 18.0], 0.6), s = 3.2 + (t - 14.8) * 0.02, y = cy + sin(t * 1.4) * 4;
      im('goldvortex', 256, 192, { s: 1.05 + bt * 0.04 }) || lin(['#3a2a04', '#f8c830', '#3a2a04']);
      fill('#120a00', 0.62); rays(cx, cy, { n: 16, rot: t * 0.12, col: '#ffe9a8', a: 0.34 + bt * 0.25, r1: 520, wid: 0.42 }); rays(cx, cy, { n: 16, rot: -t * 0.08 + 0.2, col: '#f8c830', a: 0.3, r1: 520, wid: 0.2 }); vig(0.55, '#0a0600');
      /* Dommens lys faller i bakgrunnen. */
      for (let i = 0; i < 9; i++) { const ph = (rnd(i, 91) + t * (0.5 + rnd(i, 92) * 0.5)) % 1, x = rnd(i, 93) * 640 - 60 - ph * 90, yy = ph * 520 - 60; K.g.save(); K.g.globalCompositeOperation = 'lighter'; K.g.strokeStyle = '#fff6c0'; K.g.globalAlpha = 0.55; K.g.lineWidth = 3; K.g.beginPath(); K.g.moveTo(x + 40, yy - 180); K.g.lineTo(x, yy); K.g.stroke(); K.g.restore(); glow(x, yy, 22, '#fff', 0.9, 1); }
      im('glowring', cx, cy, { s: 1.15 + sin(t) * 0.03, r: t * 0.2, a: 0.45, add: 1 });
      wheel(cx, y + 8, 150, 1, t * 0.2, 0.96); glow(cx, y, 200, '#f8c830', 0.3 + bt * 0.3, 1);
      aura(cx, y, s, '#fff6c0', 4 + bt * 4, 0.35 + bt * 0.3); spr(cx, y, s);
      dust('ember', { n: 70, seed: 6, cols: ['#fff', '#ffe9a8', '#f8c830'], a: 0.95, spd: 1.2 }); dust('spark', { n: 30, seed: 3, cols: ['#fff', '#fff6c0'], a: 0.9, size: 2 });
      wave(14.8, cx, cy, { col: '#fff', r: 560, d: 0.9, w: 18 }); wave(15.1, cx, cy, { col: '#f8c830', r: 560, d: 1 }); wave(16.4, cx, cy, { col: '#fff6c0', r: 560, d: 1 }); wave(18.0, cx, cy, { col: '#fff6c0', r: 560, d: 1 });
      card(16.4, { col: '#f8c830', cap: 'The Original One' });
      P.sh = hit(t, 14.8, 1.2) * 16 + hit(t, 16.4, 0.5) * 8 + hit(t, 18.0, 0.4) * 4; P.fl = max(hit(t, 14.8, 0.5), hit(t, 16.4, 0.2) * 0.6, seg(t, 19.0, 19.25)); P.fc = '#fff8e0'; P.z = 1 + (1 - k) * 0.25 + (t - 14.8) * 0.008; P.zy = cy;
    },
    air(t, k) {
      const bt = 0.5 + 0.5 * sin(t * 1.3); rays(378, 132, { n: 14, rot: t * 0.1, col: '#f8c830', a: (0.12 + bt * 0.06) * k, r1: 380, wid: 0.4 }); glow(378, 132, 170, '#fff2c0', 0.22 * k, 1);
      for (let i = 0; i < 3; i++) { const q = floor(t / 3.1 + i * 0.37), ph = (t / 3.1 + i * 0.37) % 1; if (ph < 0.3) pillar(ph * 3.1, 0, 40 + rnd(q, 5 + i) * 432, '#ffe08a', 12, 250); }
      dust('ember', { n: 34, seed: 6, cols: ['#fff', '#ffe9a8', '#f8c830'], a: 0.8 * k, spd: 0.8 }); dust('spark', { n: 16, seed: 3, cols: ['#fff'], a: 0.7 * k });
      vig(0.35 * k, '#2a1c00');
    }
  });

  /* ================= RAYQUAZA =================
     Fire slag som dør ut (0.31, 1.56, 2.77, 4.01), og så bryter låta løs på 5.24 og går i tunge tak (6.47, 7.69, 8.93, 10.16).
     Filmen: vi stiger gjennom uværet. Hvert lyn viser noe langt som bukter seg i skyene, nærmere for hver gang. Så bryter vi gjennom skydekket,
     og den stuper forbi oss i den grønne himmelen, før den kveiler seg rundt hele bildet og brøler. */
  const RB = [0.31, 1.56, 2.77, 4.01], RP = [5.24, 6.47, 7.69, 8.93, 10.16];
  const storm = (t, spd, dark) => {
    lin(['#0a1a24', '#16343e', '#1c4a48', '#0e2228']);
    for (let L = 0; L < 3; L++) for (let i = 0; i < 6; i++) { const a = rnd(i, 50 + L), b = rnd(i, 60 + L), z = 0.8 + L * 0.55, y = ((a * 620 + t * spd * 80 * z) % 620) - 120, x = b * 620 - 54 + sin(t * 0.4 + i) * 12; im(i % 2 ? 'em_cloudR' : 'em_cloudL', x, y, { s: 2.4 * z, a: 0.55 + L * 0.15, px: 1, flip: i % 3 === 0 }) || glow(x, y, 150 * z, '#3a5258', 0.6); }
    fog('smoke', { n: 6, seed: 4, a: 0.3, spd: 30, s: 2.2 }); fill('#02080c', dark);
  };
  film(384, { len: 12.7, R: 5.24, use: ['em_cloudL', 'em_cloudR', 'em_clouds', 'em_raylong', 'em_raygrey', 'em_raysil', 'em_rayring2', 'em_rayfly', 'em_raytitle', 'em_bolt1', 'em_bolt2', 'smoke', 'speed', 'streaks', 'zstreak', 'sparkle'],
    cues: [[0.31, 'thud'], [1.56, 'thud'], [2.77, 'thud'], [4.01, 'thud'], [5.24, 'boom'], [10.16, 'cry'], [10.16, 'boom']],
    draw(t, P, c) {
      if (t < 5.24) {
        P.bars = 1; if (t < 0.31) return;
        const fl = hits(t, RB, 0.5), n = RB.filter(q => t >= q).length, up = 0.6 + seg(t, 0.3, 5.2) * 2.6;
        storm(t, up, 0.3 - fl * 0.3);
        /* Lynet lyser opp det som er der inne. */
        if (fl > 0) { const q = RB[n - 1], a = c01(fl * 1.6);
          if (n === 1) im('em_raylong', 330 - (t - q) * 60, 120 + (t - q) * 30, { s: 1.6, a: a * 0.8, px: 1, r: 0.3 });
          else if (n === 2) im('em_raygrey', 200 + (t - q) * 50, 160, { s: 2.4, a: a * 0.8, px: 1 });
          else if (n === 3) im('em_raysil', 290 - (t - q) * 40, 180, { s: 3.6, a, px: 1, flip: 1 });
          else { im('em_rayring2', 256, 196, { s: 5.6 + (t - q) * 1.2, a, px: 1 }); }
          const bs = n * 13 + floor((t - q) * 14); bolt(80 + rnd(n, 3) * 350, -10, 120 + rnd(n, 4) * 280, 250 + rnd(n, 6) * 120, { seed: bs, col: '#b8ff8a', core: '#fffff0', w: 2.5, a, br: 3 }); if (n > 1) bolt(420 - rnd(n, 7) * 300, -10, 380 - rnd(n, 8) * 260, 300, { seed: bs + 50, col: '#ffe86a', core: '#fff', w: 2, a: a * 0.8, br: 2 });
          fill('#d8ffc8', fl * 0.16); }
        dust('rain', { n: 110, seed: 2, cols: ['#9ad0c8', '#d8f0e8'], a: 0.6, spd: 1.3, wind: -0.5 });
        vig(0.7); P.sh = fl * 7 + seg(t, 4.0, 5.24) * 4; P.fl = hits(t, RB, 0.12) * 0.7; P.fc = '#eaffd8'; P.z = 1 + seg(t, 4.01, 5.24) * 0.18;
        return;
      }
      /* Over skyene. */
      const bt = hits(t, RP, 0.5), fin = t >= 10.16, coil = seg(t, 7.69, 8.5);
      lin(['#062a6a', '#0a5a8a', '#12a078', '#7ae0a0']); dust('up', { n: 60, seed: 12, cols: ['#c8ffe0', '#fff'], a: 0.5 * (1 - coil * 0.6), spd: 4 });
      im('speed', 256, 192, { s: 1.15, a: 0.35 * (1 - coil), add: 1, r: PI / 2 });
      /* Skydekket vi brøt gjennom synker under oss. */
      const cy2 = 330 + seg(t, 5.24, 7.2) * 150; strip('fog', cy2, t * 40, { s: 1.4, a: 0.9 }) || rect(0, cy2 + 40, W, 200, '#d8f0e8', 0.6);
      /* Den stuper forbi langt borte: hele kroppen, på skrå ned gjennom bildet (bildet følger sin egen lengderetning, så den bukter seg fram). */
      { const k = seg(t, 5.3, 6.4); if (k > 0 && k < 1) for (let j = 4; j >= 0; j--) { const kk = c01(k - j * 0.035), d = mix(-560, 560, kk), sw = sin(kk * 9) * 14, x = 256 - 0.54 * d + 0.84 * sw, y = 192 + 0.84 * d + 0.54 * sw; im('em_raylong', x, y, { s: 2.8 + kk, a: j ? 0.22 : 1, px: 1, add: j ? 1 : 0 }) || spr(x, y, 1.7, { a: j ? 0.22 : 1, add: j ? 1 : 0 }); } }
      /* Så kommer den rett mot oss: hodet inn fra øvre høyre hjørne, og et kast mot kameraet til gapet fyller bildet.
         Bildet av den slutter ved kanten øverst (der kroppen fortsetter), så den kanten holdes hele tiden utenfor. ax, ay = der gapet er på skjermen. */
      if (t >= 6.47 && t < 7.69) { const k1 = eo(seg(t, 6.47, 7.0)), k2 = ei(seg(t, 7.0, 7.62)), s = 3.4 + k2 * 4.1, ax = mix(mix(407, 67, k1), 256, k2), ay = mix(mix(-161, 289, k1), 236, k2) + sin(t * 30) * 3 * k2, x = ax + 51.5 * s, y = ay - 41 * s, tr = 1 - k1 + k2 * 0.3;
        rays(256, 236, { n: 22, rot: t * 0.7, col: '#eafff0', a: k2 * 0.45, r1: 560, wid: 0.2 });
        for (let j = 2; j >= 0; j--) im('em_rayfly', x + j * 26 * tr, y - j * 30 * tr, { s, a: j ? 0.2 : 1, px: 1, add: j ? 1 : 0 }) || spr(mix(mix(560, 256, k1), 256, k2) + j * 26 * tr, mix(mix(-120, 180, k1), 200, k2) - j * 30 * tr, 2.2 + k2 * 6, { a: j ? 0.2 : 1, add: j ? 1 : 0 });
        fill('#eafff0', seg(t, 7.5, 7.69) * 0.9); }
      /* Den kveiler seg rundt hele bildet. */
      if (coil > 0) { fill('#022a3a', coil * 0.72); cover('em_raytitle', { z: 1.04 + (t - 7.69) * 0.012, a: coil * (fin ? 0.5 : 1) }) || glow(256, 192, 300, '#18a060', coil); im('em_rayring2', 256, 200, { s: 5.4, a: hit(t, 8.93, 0.8) * 0.5, add: 1, px: 1 });
        dust('spark', { n: 30, seed: 5, cols: ['#ffe86a', '#fff'], a: coil, size: 2 }); }
      if (fin) { const y = 178 + sin(t * 2) * 5; fill('#011a22', 0.45); rays(256, 180, { n: 14, rot: t * 0.3, col: '#6affb0', a: 0.3 + bt * 0.2, r1: 480, wid: 0.34 }); glow(256, y, 210, '#3fe08a', 0.4 + bt * 0.2, 1);
        for (let i = 0; i < 8; i++) { const ph = (rnd(i, 61) + t * (0.8 + rnd(i, 62))) % 1; im('zstreak', mix(620, -120, ph), 30 + rnd(i, 63) * 320 + ph * 60, { s: 0.9, a: 0.6 * sin(ph * PI), add: 1, r: -0.18 }); }
        aura(256, y, 3.1, '#b8ffd0', 4 + bt * 3, 0.35 + bt * 0.3); spr(256, y, 3.1); dust('ember', { n: 44, seed: 8, cols: ['#b8ffd0', '#ffe86a', '#fff'], a: 0.9, spd: 1.6, wind: -0.3 });
        wave(10.16, 256, 180, { col: '#d8ffe8', r: 560, d: 0.9, w: 16 }); wave(10.45, 256, 180, { col: '#ffe86a', r: 560, d: 1 }); card(10.9, { col: '#3fe08a' }); }
      wave(5.24, 256, 192, { col: '#fff', r: 560, d: 0.8, w: 14 });
      P.sh = hit(t, 5.24, 0.9) * 12 + hit(t, 5.8, 0.5) * 5 + hit(t, 6.47, 0.4) * 5 + seg(t, 7.0, 7.62) * (1 - seg(t, 7.62, 7.9)) * 10 + hit(t, 10.16, 1) * 14 + bt * 2; P.fl = max(hit(t, 5.24, 0.4), hit(t, 7.69, 0.3) * 0.8, hit(t, 10.16, 0.35), seg(t, 12.45, 12.7)); P.fc = '#eafff0'; P.z = 1 + hit(t, 10.16, 0.5) * 0.12; P.rgb = hit(t, 10.16, 0.5) * 5;
    },
    air(t, k) {
      fill('#06202a', 0.2 * k); fog('', { n: 6, seed: 5, a: 0.7 * k, spd: 30, s: 1.6, y0: -40, y1: 50, col: '#1c2c30' }); for (let i = 0; i < 2; i++) im('streaks', ((t * (620 + i * 200) + i * 300) % 1700) - 480, 90 + i * 150, { s: 1.1, a: 0.4 * k, add: 1, flip: 1 });
      dust('rain', { n: 70, seed: 2, cols: ['#9ad0c8', '#d8f0e8'], a: 0.4 * k, spd: 1.2, wind: -0.6 }); dust('ember', { n: 22, seed: 8, cols: ['#b8ffd0', '#ffe86a'], a: 0.7 * k, spd: 1.2, wind: -0.3 });
      const q = floor(t / 2.3), ph = (t / 2.3) % 1; if (ph < 0.12) { bolt(60 + rnd(q, 3) * 400, -10, 100 + rnd(q, 4) * 320, 150 + rnd(q, 5) * 80, { seed: q * 7 + floor(ph * 40), col: '#b8ff8a', core: '#fffff0', w: 2, a: 1 - ph / 0.12, br: 2 }); fill('#d8ffc8', (1 - ph / 0.12) * 0.1 * k); }
      vig(0.4 * k, '#02161a');
    }
  });

  /* ================= MEWTWO =================
     Stille til 1.16. Så går pulsen (0.65 s mellom slagene), to slag på 5.15 og 5.48, fire tunge på 6.94, 7.60, 8.25 og 8.90, og utbruddet på 9.57.
     Filmen: laboratoriet. Noe sover i tanken. Pulsen våkner, øynene åpner seg, glasset sprekker for hvert slag, alt i rommet letter fra gulvet –
     og så sprenger den seg ut og står igjen alene i ruinene, med hele rommet svevende rundt seg. */
  const MH = [6.94, 7.6, 8.25, 8.9], MC = [2.05, 2.7, 3.35, 4.0, 4.65, 5.15, 5.48, 6.13].concat(MH);
  const mRock = (x, y, s, seed, col) => { const pts = []; for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + rnd(i, seed), r = s * (0.6 + rnd(i, seed + 1) * 0.5); pts.push([x + cos(an) * r, y + sin(an) * r * 0.8]); } poly(pts, col || '#1a1a26'); poly([pts[0], pts[1], pts[2]], '#3a3550', 0.7); };
  const mLab = (t, power) => {
    lin(['#03070c', '#07121a', '#04080c']); const X = K.g;
    for (let i = 0; i < 9; i++) rect(i * 64 + 10, 34, 2, 250, '#12303a', 0.5); rect(0, 284, W, 3, '#1c4450', 0.8); lin([[0, 'rgba(0,0,0,0)'], [1, '#06161c']], 1, 284, 384);
    /* Rør og kabler ned i tanken. */
    X.save(); X.strokeStyle = '#16262e'; X.lineWidth = 7; for (const dx of [-70, -36, 40, 78]) { X.beginPath(); X.moveTo(256 + dx * 2.2, 30); X.quadraticCurveTo(256 + dx * 2, 70, 256 + dx * 0.5, 86); X.stroke(); } X.restore();
    /* Tanken: væske som lyser, glass, og lokk i metall. */
    const gx = 256, x0 = gx - 66, w = 132, y0 = 84, h = 206, gr = X.createLinearGradient(x0, 0, x0 + w, 0); gr.addColorStop(0, '#04262a'); gr.addColorStop(0.5, blend('#0c5a58', '#5a2a9a', power)); gr.addColorStop(1, '#04262a');
    X.fillStyle = gr; X.fillRect(x0, y0, w, h); glow(gx, y0 + h * 0.5, 150, blend('#20c0b0', '#a050ff', power), 0.3 + power * 0.35, 1);
    dust('bubble', { n: 22 + floor(power * 30), seed: 4, cols: ['#9af0e0', '#d8c8ff'], a: 0.7, spd: 1 + power * 3, y0: y0 + 6, y1: y0 + h - 4 });
    rect(0, y0, x0, h, '#03070c'); rect(x0 + w, y0, W, h, '#03070c'); for (let i = 0; i < 9; i++) rect(i * 64 + 10, y0, 2, h, '#12303a', 0.5);
    rect(x0, y0, 5, h, '#c8fff0', 0.5, 1); rect(x0 + 14, y0, 3, h, '#c8fff0', 0.2, 1); rect(x0 + w - 6, y0, 4, h, '#c8fff0', 0.35, 1);
    for (const yy of [y0 - 18, y0 + h]) { rect(x0 - 12, yy, w + 24, 18, '#2a3a44'); rect(x0 - 12, yy, w + 24, 4, '#5a7480'); rect(x0 - 12, yy + 14, w + 24, 4, '#141e24'); }
    return { gx, gy: y0 + h * 0.52 };
  };
  film(150, { len: 15.3, R: 9.57, use: ['sphere', 'arcs', 'vortex', 'purpglow', 'burst', 'rings', 'sparkle', 'smoke', 'polyring'],
    cues: [[1.16, 'thud'], [5.15, 'thud'], [6.94, 'boom'], [7.6, 'boom'], [8.25, 'boom'], [8.9, 'boom'], [9.57, 'cry'], [12.84, 'thud']],
    draw(t, P, c) {
      const sp = c.sp, ex = sp ? (0.4 - 0.5) * sp.bw : -6, ey = sp ? (0.13 - 0.5) * sp.bh : -26;
      if (t < 9.0) {
        P.bars = 1; const power = c01(seg(t, 1.16, 8.9)), beat = t > 1.16 ? hit((t - 1.16) % 0.65, 0, 0.3) : 0, hv = hits(t, MH, 0.4), n = MC.filter(q => t >= q).length, lab = mLab(t, power), s = 1.75, by = lab.gy + sin(t * 1.3) * 4;
        /* Den sover i tanken. Så tennes øynene. */
        spr(lab.gx, by, s, { col: blend('#04161a', '#12061f', power) }); const eo2 = eo(seg(t, 1.39, 1.9));
        if (eo2 > 0) { glow(lab.gx + ex * s, by + ey * s, 26 + beat * 10 + hv * 20, '#c070ff', 0.9 * eo2, 1); glow(lab.gx + ex * s, by + ey * s, 6, '#fff', eo2, 1); aura(lab.gx, by, s, '#a050ff', 2 + hv * 4, (0.04 + power * power * 0.3 + hv * 0.3)); }
        /* Glasset sprekker, mer for hvert slag. */
        for (let i = 0; i < n; i++) { const a0 = rnd(i, 81) * TAU, ox = lab.gx + (rnd(i, 82) - 0.5) * 100, oy = 110 + rnd(i, 83) * 160, L = 40 + rnd(i, 84) * 70 + (i > 7 ? 60 : 0); bolt(ox, oy, ox + cos(a0) * L, oy + sin(a0) * L, { seed: i * 9 + 3, col: '#d8f8ff', core: '#fff', w: 1, a: 0.85, jag: 0.34, depth: 4, br: i > 5 ? 2 : 1 }); }
        /* Skjermene: først rolige, så advarsler. */
        const warn = t > 4.0, blink = floor(t * 3.2) % 2 === 0;
        txt('PROJECT  M2', 78, 62, { size: 20, al: 'l', col: '#5ae0c8', a: seg(t, 0.2, 0.5) * 0.9 }); txt(t < 1.16 ? 'STATUS  ASLEEP' : warn ? 'STATUS  AWAKE' : 'STATUS  . . .', 78, 84, { size: 16, al: 'l', col: warn ? '#ff5a6a' : '#5ae0c8', a: seg(t, 0.4, 0.7) * 0.9 });
        if (warn && blink) { txt('WARNING', 434, 62, { size: 20, al: 'r', col: '#ff3a4a' }); txt('CONTAINMENT  FAILING', 434, 84, { size: 16, al: 'r', col: '#ff3a4a' }); }
        const X = K.g; X.save(); X.strokeStyle = warn ? '#ff5a6a' : '#5ae0c8'; X.lineWidth = 2; X.globalAlpha = 0.85; X.beginPath(); for (let x = 0; x <= 120; x += 3) { const ph = ((x / 120) * 2 + t * (1 + power * 2.5)) % 1, y = 104 - (ph > 0.42 && ph < 0.5 ? 16 : ph >= 0.5 && ph < 0.56 ? -9 : 0) * (t > 1.16 ? 1 + power : 0.6); x ? X.lineTo(78 + x, y) : X.moveTo(78 + x, y); } X.stroke(); X.restore();
        if (warn) rect(0, 0, W, H, '#ff1020', (0.05 + 0.07 * (blink ? 1 : 0)), 1);
        /* Alt løst i rommet letter. */
        for (let i = 0; i < 14; i++) { const lift = eo(seg(t, 3.0 + rnd(i, 21) * 3, 8.9)), x = 30 + rnd(i, 22) * 452; if (abs(x - 256) < 84) continue; mRock(x + sin(t + i) * 5, 292 - lift * (60 + rnd(i, 23) * 170), 5 + rnd(i, 24) * 9, i + 30); }
        if (t > 1.16) wave(1.16 + floor((t - 1.16) / 0.65) * 0.65, lab.gx, lab.gy, { col: '#a050ff', r: 120 + power * 260, d: 0.6, w: 3 + power * 4, a: 0.3 + power * 0.5 });
        MH.forEach(q => { wave(q, lab.gx, lab.gy, { col: '#e0c0ff', r: 560, d: 0.6, w: 14 }); });
        vig(0.6); P.sh = beat * power * 3 + hits(t, [5.15, 5.48], 0.3) * 6 + hv * 13; P.fl = hits(t, MH, 0.13) * 0.6; P.fc = '#e8d0ff'; P.z = 1 + power * 0.16 + hv * 0.04; P.zy = lab.gy; P.rgb = hv * 6; P.gl = warn ? (rnd(floor(t * 9), 4) > 0.9 ? 0.3 : 0) + hv * 0.5 : 0;
        return;
      }
      /* Den sprenger seg ut. */
      const bt = hits(t, [9.57, 12.84, 13.49, 14.14], 0.5), k = seg(t, 9.0, 9.57), fin = t >= 9.57, y = 176 + sin(t * 1.6) * 6, s = 3.3;
      lin(['#06020e', '#150a2c', '#0a0418']); im('vortex', 256, 180, { s: 1.3, r: t * 0.12, a: 0.7, add: 'screen' }); im('rings', 256, 180, { s: 1.5 + sin(t) * 0.04, r: -t * 0.3, a: 0.3, add: 1 });
      rect(0, 300, W, 84, '#04020a', 0.7); for (let i = 0; i < 9; i++) rect(i * 64 + 10 + (rnd(i, 3) - 0.5) * 20, 34, 2, 120 + rnd(i, 5) * 120, '#2a1c4a', 0.5);
      /* Rommet svever rundt den. */
      for (let i = 0; i < 20; i++) { const an = rnd(i, 41) * TAU + t * (0.25 + rnd(i, 42) * 0.3), R = 130 + rnd(i, 43) * 150, z = sin(an); if (z < 0) mRock(256 + cos(an) * R, 190 + z * 60 + sin(t * 2 + i) * 5, 6 + rnd(i, 44) * 12, i + 50, '#120c20'); }
      if (fin) { im('sphere', 256, y, { s: 1.15 + sin(t * 3) * 0.03 + bt * 0.08, a: 0.32 + bt * 0.2, add: 1 }); im('arcs', 256, y, { s: 1.05, r: t * 1.4, a: 0.9, add: 1 }); im('arcs', 256, y, { s: 0.78, r: -t * 2, a: 0.7, add: 1 }); glow(256, y, 220, '#a050ff', 0.4 + bt * 0.25, 1);
        for (let i = 0; i < 4; i++) { const q = floor(t * 7 + i * 1.7), an = rnd(q, i) * TAU; bolt(256 + cos(an) * 60, y + sin(an) * 50, 256 + cos(an) * (190 + rnd(q, i + 4) * 120), y + sin(an) * (150 + rnd(q, i + 5) * 90), { seed: q * 5 + i, col: '#c080ff', core: '#fff', w: 1.6, a: 0.85, br: 1 }); }
        aura(256, y, s, '#d0a0ff', 4 + bt * 4, 0.35 + bt * 0.3); spr(256, y, s); glow(256 + ex * s, y + ey * s, 18, '#e0b0ff', 0.9, 1); }
      for (let i = 0; i < 20; i++) { const an = rnd(i, 41) * TAU + t * (0.25 + rnd(i, 42) * 0.3), R = 130 + rnd(i, 43) * 150, z = sin(an); if (z >= 0) mRock(256 + cos(an) * R, 190 + z * 60 + sin(t * 2 + i) * 5, 6 + rnd(i, 44) * 12, i + 50); }
      dust('ember', { n: 50, seed: 7, cols: ['#c080ff', '#fff', '#8a5aff'], a: 0.9, spd: 1.3 });
      /* Glasset og laboratoriet knuser utover. */
      if (t < 10.0) shatter(onAux(0, () => { mLab(8.9, 1); fill('#e8d0ff', 0.35); }), seg(t, 9.0, 9.95), 256, 190, 3);
      im('burst', 256, 186, { s: 0.6 + k * 1.6, a: (1 - seg(t, 9.57, 10.1)) * k, add: 1, r: t });
      wave(9.57, 256, 180, { col: '#fff', r: 560, d: 0.8, w: 18 }); wave(9.9, 256, 180, { col: '#c080ff', r: 560, d: 0.9 }); wave(12.84, 256, 180, { col: '#e0c0ff', r: 560, d: 0.9 });
      vig(0.5, '#0a0218'); card(12.84, { col: '#c79bff' });
      P.sh = hit(t, 9.0, 0.5) * 14 + hit(t, 9.57, 1) * 15 + hit(t, 12.84, 0.5) * 8 + bt * 2; P.fl = max(hit(t, 9.0, 0.3) * 0.9, hit(t, 9.57, 0.4), hit(t, 12.84, 0.2) * 0.6, seg(t, 15.05, 15.3)); P.fc = '#f0e0ff'; P.rgb = hit(t, 9.57, 0.8) * 9 + bt * 2; P.z = 1 + hit(t, 9.57, 0.45) * 0.15; P.zy = 180;
    },
    air(t, k) {
      fill('#0c0420', 0.26 * k); for (let i = 0; i < 12; i++) { const an = rnd(i, 41) * TAU + t * (0.2 + rnd(i, 42) * 0.25), R = 150 + rnd(i, 43) * 140; mRock(378 + cos(an) * R, 150 + sin(an) * 60 + sin(t * 2 + i) * 5, 4 + rnd(i, 44) * 7, i + 50); }
      wave(floor(t / 1.3) * 1.3, 378, 132, { col: '#a050ff', r: 230, d: 1.2, w: 3, a: 0.5 * k }); im('arcs', 378, 132, { s: 0.6, r: t * 1.2, a: 0.5 * k, add: 1 });
      dust('ember', { n: 30, seed: 7, cols: ['#c080ff', '#fff', '#8a5aff'], a: 0.8 * k, spd: 1 }); vig(0.45 * k, '#0a0218');
    }
  });

  /* ================= DARK MEWTWO =================
     Motivene til Dark Mewtwo: svarte krystaller, den svarte sola og tomrommet. Selve filmen ligger i raidx.js. */
  /* En svart krystall som skyter inn fra kanten. k = hvor langt den har vokst. */
  const shard = (x0, y0, ang, len, k, w) => { if (k <= 0.01) return; const L = len * k, nx = -sin(ang) * (w || 16), ny = cos(ang) * (w || 16), tx = x0 + cos(ang) * L, ty = y0 + sin(ang) * L, mx = x0 + cos(ang) * L * 0.3, my = y0 + sin(ang) * L * 0.3;
    poly([[x0 + nx, y0 + ny], [mx + nx * 1.5, my + ny * 1.5], [tx, ty], [mx - nx * 1.5, my - ny * 1.5], [x0 - nx, y0 - ny]], '#07040c'); poly([[x0 + nx, y0 + ny], [mx + nx * 1.5, my + ny * 1.5], [tx, ty], [mx, my]], '#2a1838', 0.9); poly([[mx + nx * 1.5, my + ny * 1.5], [tx, ty], [mx + nx * 1.1, my + ny * 1.1]], '#ff8a2a', 0.8, 1); glow(tx, ty, 14, '#ff8a2a', 0.5 * k, 1); };
  const DSH = Array.from({ length: 14 }, (_, i) => { const e = i % 4, p = rnd(i, 71), x = e === 0 ? p * W : e === 1 ? W + 6 : e === 2 ? p * W : -6, y = e === 0 ? -6 : e === 1 ? p * H : e === 2 ? H + 6 : p * H; return [x, y, Math.atan2(190 - y, 256 - x) + (rnd(i, 72) - 0.5) * 0.5, 110 + rnd(i, 73) * 90, 12 + rnd(i, 74) * 12]; });
  /* Den svarte sola: en skive med en krans av oransje ild. */
  const blackSun = (t, x, y, r, a) => { if (a <= 0) return; rays(x, y, { n: 22, rot: t * 0.2, col: '#ff7a1a', a: 0.45 * a, r0: r * 0.9, r1: r * 3.4, wid: 0.34 }); rays(x, y, { n: 22, rot: -t * 0.13, col: '#ffd070', a: 0.25 * a, r0: r * 0.9, r1: r * 2.4, wid: 0.18 }); glow(x, y, r * 2.2, '#ff5a14', 0.7 * a, 1); ring(x, y, r * 1.04, { col: '#ffd070', w: 5, a }); K.g.save(); K.g.globalAlpha = c01(a); K.g.fillStyle = '#030106'; K.g.beginPath(); K.g.arc(x, y, r, 0, TAU); K.g.fill(); K.g.restore(); };
  const dVoid = (t, heat) => { lin(['#04020a', '#0e0618', '#1a0a14', '#020104']); im('vortex', 256, 180, { s: 1.3, r: -t * 0.1, a: 0.5, add: 'screen' }); im('redswirl', 256, 180, { s: 1.6, r: t * 0.2, a: 0.2 + heat * 0.3, add: 1 }); dust('up', { n: 30, seed: 4, cols: ['#ff8a2a', '#5a3a7a'], a: 0.5 + heat * 0.3, spd: 1 + heat }); };
  /* ================= KYOGRE og GROUDON =================
     Fire dempede slag (0.31, 1.56, 2.79, 4.01), en trommevirvel fra 4.92, utbruddet på 5.26, tre slag (8.46, 8.93, 9.54) og et siste på 10.16.
     Begge begynner som i åpningen av Emerald: en svart kjempe i mørket, med tegn som lyser sterkere og rødere for hvert slag. */
  const KB = [0.31, 1.56, 2.79, 4.01], KH = [8.46, 8.93, 9.54];
  /* Bølger: tre lag med sjø som ruller, med skum på toppene. y = havflaten, amp = hvor høy sjøen er. */
  const sea = (t, y, amp, cols, a) => { const X = K.g; for (let L = 0; L < 3; L++) { const yy = y + L * 26, sp = (1.2 + L * 0.5) * (L % 2 ? -1 : 1); X.save(); X.globalAlpha = c01(a == null ? 1 : a); X.fillStyle = cols[L]; X.beginPath(); X.moveTo(0, H); for (let x = 0; x <= W; x += 8) X.lineTo(x, yy + sin(x * 0.02 + t * sp + L) * amp + sin(x * 0.045 - t * sp * 1.6 + L * 2) * amp * 0.45); X.lineTo(W, H); X.closePath(); X.fill(); X.strokeStyle = 'rgba(230,245,255,.7)'; X.lineWidth = 2; X.beginPath(); for (let x = 0; x <= W; x += 8) { const yv = yy + sin(x * 0.02 + t * sp + L) * amp + sin(x * 0.045 - t * sp * 1.6 + L * 2) * amp * 0.45; x ? X.lineTo(x, yv) : X.moveTo(x, yv); } X.stroke(); X.restore(); } };
  film(382, { len: 12.5, R: 5.26, use: ['em_kyogre0', 'em_kyogre1', 'em_kyogre2', 'em_kyogre3', 'lightA', 'lightB', 'waves1', 'smoke', 'fog', 'sparkle', 'ring'],
    cues: [[0.31, 'thud'], [1.56, 'thud'], [2.79, 'thud'], [4.01, 'thud'], [5.26, 'boom'], [6.0, 'cry'], [10.16, 'thud']],
    draw(t, P, c) {
      if (t < 5.26) {
        P.bars = 1; if (t < 0.31) return;
        const fl = hits(t, KB, 0.7), n = KB.filter(q => t >= q).length, x = mix(600, 250, eo(seg(t, 0.3, 5.2))), y = 188 + sin(t * 0.9) * 10, s = 2.6 + seg(t, 0.3, 5.26) * 1.5;
        lin(['#010814', '#031d3c', '#042a4c', '#010610']);
        for (let i = 0; i < 5; i++) im(i % 2 ? 'lightA' : 'lightB', 70 + i * 100 + sin(t * 0.3 + i) * 24, -10, { s: 2.6, ay: 0, a: 0.1 + 0.05 * sin(t * 0.7 + i * 2), add: 1, r: 0.12 * sin(t * 0.2 + i) });
        dust('bubble', { n: 40, seed: 3, cols: ['#7ad0ff', '#c8f0ff'], a: 0.5, spd: 0.6 }); dust('mote', { n: 50, seed: 9, cols: ['#5a9ad0'], a: 0.5 });
        /* Kjempen glir forbi. Tegnene skifter fra blått til rødt etter hvert som den våkner. */
        const a = seg(t, 0.3, 1.2); im('em_kyogre' + min(3, max(0, n - 1)), x, y, { s, a, px: 1 }); if (fl > 0) im('em_kyogre' + min(3, max(0, n - 1)), x, y, { s: s * 1.02, a: fl * 0.7, add: 1, px: 1 });
        KB.forEach(q => wave(q, x - 40 * s * 0.3, y, { col: ['#3f8cff', '#8a5aff', '#d040a0', '#ff3040'][KB.indexOf(q)], r: 380, d: 1.2, w: 3, a: 0.6 }));
        for (let i = 0; i < 6; i++) { const bx = i * 110 - 40 + rnd(i, 4) * 40, bh = 50 + rnd(i, 5) * 70; poly([[bx, H], [bx + 30, H - bh], [bx + 70, H - bh * 0.7], [bx + 120, H]], '#01040a'); }
        const roll = seg(t, 4.92, 5.26); fill('#bfe6ff', roll * roll * 0.5); vig(0.7, '#00030a');
        P.sh = fl * 4 + roll * 9; P.z = 1 + roll * 0.2; P.zx = x; P.zy = y; return;
      }
      /* Opp gjennom havflaten, ut i uværet. */
      const bt = hits(t, KH.concat([10.16]), 0.5), up = seg(t, 5.26, 6.0), y = mix(330, 168, back(seg(t, 5.85, 6.5))) + sin(t * 1.5) * 5, s = 3.3;
      lin(['#050a14', '#10243a', '#1c3a52', '#16304a']);
      for (let i = 0; i < 4; i++) fog('smoke', { n: 3, seed: 30 + i, a: 0.5, spd: 40, s: 2.4, y0: -20, y1: 120, col: '#20303c' });
      const q = floor(t * 2.2), ph = (t * 2.2) % 1; if (ph < 0.25 || bt > 0.5) { bolt(40 + rnd(q, 2) * 430, -10, 60 + rnd(q, 3) * 400, 190 + rnd(q, 4) * 60, { seed: q * 3 + floor(ph * 30), col: '#9fd0ff', core: '#fff', w: 2.2, a: max(1 - ph * 4, bt), br: 3 }); fill('#cfe6ff', max(0, 0.14 - ph * 0.56) + bt * 0.06); }
      /* Vannsøylen den bryter opp gjennom. */
      const col = seg(t, 5.26, 5.5) * (1 - seg(t, 6.3, 7.4)); if (col > 0) { beam(256, 150 * col, 60, H, '#9fd8ff', 0.5 * col, '#e8f8ff'); for (let i = 0; i < 46; i++) { const ph2 = (rnd(i, 61) + t * (1 + rnd(i, 62))) % 1, an = -PI / 2 + (rnd(i, 63) - 0.5) * 2.2, r = ph2 * 300; rect(256 + cos(an) * r, 300 + sin(an) * r + ph2 * ph2 * 200, 4, 4, '#e8f8ff', (1 - ph2) * col, 1); } }
      if (t >= 5.85) { glow(256, y, 200, '#3f8cff', 0.35 + bt * 0.2, 1); aura(256, y, s, '#9fd8ff', 4 + bt * 3, 0.35 + bt * 0.3); spr(256, y, s); }
      sea(t * 2, 286 - hit(t, 5.26, 2) * 30 - bt * 14, 12 + bt * 8, ['#0c3a66', '#0a2c52', '#061c3a']);
      im('waves1', 256, 192, { a: 0.5, add: 1 });
      dust('rain', { n: 150, seed: 2, cols: ['#9fc8e8', '#e8f4ff'], a: 0.75, spd: 1.5, wind: -0.7 });
      wave(5.26, 256, 300, { col: '#e8f8ff', r: 560, d: 0.9, w: 16, sy: 0.5 }); KH.forEach(q2 => wave(q2, 256, 300, { col: '#9fd8ff', r: 460, d: 0.7, w: 6, sy: 0.4 })); wave(10.16, 256, 180, { col: '#e8f8ff', r: 560, d: 0.9 });
      vig(0.5, '#01060e'); card(10.16, { col: '#5aa8ff' });
      P.sh = hit(t, 5.26, 1.2) * 14 + bt * 6; P.fl = max(hit(t, 5.26, 0.45), hit(t, 10.16, 0.2) * 0.6, seg(t, 12.25, 12.5)); P.fc = '#e8f6ff'; P.z = 1 + (1 - up) * 0.15; P.zy = 240;
    },
    air(t, k) {
      fill('#04101e', 0.25 * k); dust('rain', { n: 90, seed: 2, cols: ['#9fc8e8', '#e8f4ff'], a: 0.55 * k, spd: 1.4, wind: -0.7 });
      const q = floor(t / 2.6), ph = (t / 2.6) % 1; if (ph < 0.1) { bolt(40 + rnd(q, 2) * 430, -10, 60 + rnd(q, 3) * 400, 150 + rnd(q, 4) * 60, { seed: q * 3 + floor(ph * 40), col: '#9fd0ff', core: '#fff', w: 2, a: 1 - ph * 10, br: 2 }); fill('#cfe6ff', (0.1 - ph) * k); }
      sea(t * 1.6, 356, 7, ['#0c3a66', '#0a2c52', '#061c3a'], 0.75 * k); vig(0.4 * k, '#01060e');
    }
  });
  /* Sprekker med lava i bakken: lyn som ligger stille og gløder. n = hvor mange som har åpnet seg. */
  const lava = (n, y0, a, seedo) => { for (let i = 0; i < n; i++) { const x = rnd(i, 11 + (seedo || 0)) * 560 - 24, yy = y0 + rnd(i, 12) * (H - y0 - 6); bolt(x, yy, x + (rnd(i, 13) - 0.5) * 260, yy + (rnd(i, 14) - 0.3) * 60, { seed: i * 7 + 2, col: '#ff5a1a', core: '#ffe08a', w: 2 + rnd(i, 15) * 2, a, jag: 0.3, depth: 4, br: 1 }); } };
  film(383, { len: 12.5, R: 5.26, use: ['em_groudon0', 'em_groudon1', 'em_groudon2', 'em_groudon3', 'em_groudon4', 'groudon', 'sun', 'fireband', 'smoke', 'evilbg', 'cracks', 'curtain1', 'shine2'],
    cues: [[0.31, 'thud'], [1.56, 'thud'], [2.79, 'thud'], [4.01, 'thud'], [5.26, 'boom'], [5.26, 'cry'], [10.16, 'thud']],
    draw(t, P, c) {
      const fire = mulArt('curtain1', '#ff7a1a');
      if (t < 5.26) {
        P.bars = 1; if (t < 0.31) return;
        const fl = hits(t, KB, 0.7), n = KB.filter(q => t >= q).length, x = mix(-120, 262, eo(seg(t, 0.3, 5.2))), s = 2.3 + seg(t, 0.3, 5.26) * 1.0, roll = seg(t, 4.92, 5.26);
        lin(['#050101', '#120302', '#2a0802', '#5a1404']); im('evilbg', 256, 192, { a: 0.5 }); glow(256, 420, 330, '#ff5a1a', 0.5 + fl * 0.3, 1);
        /* Kjempen kommer gående. Hvert steg får bakken til å sprekke. */
        const idx = min(4, max(0, n)), a = seg(t, 0.3, 1.2), y = 212 + abs(sin(t * 2.55)) * -6; im('em_groudon' + idx, x, y, { s, a, px: 1 }); if (fl > 0) im('em_groudon' + idx, x, y, { s: s * 1.02, a: fl * 0.8, add: 1, px: 1 });
        poly([[0, 300], [W, 292], [W, H], [0, H]], '#070202'); lava(2 + n * 4 + floor(roll * 8), 300, 0.75 + fl * 0.25);
        if (fire) im(fire, 256, 392, { s: 1.1, ay: 1, a: 0.25 + n * 0.08 + roll * 0.4, add: 1, sx: 1 + 0.03 * sin(t * 7) });
        dust('ember', { n: 30 + n * 14, seed: 4, cols: ['#ff7a2a', '#ffd070', '#ff3a1a'], a: 0.9, spd: 1 + n * 0.3 }); dust('ash', { n: 30, seed: 8, cols: ['#4a3a34', '#2a2220'], a: fl * 0.9 + 0.2, spd: 2 });
        fill('#ffb060', roll * roll * 0.5); vig(0.65, '#0a0100');
        P.sh = fl * 8 + roll * 10; P.wav = 1.2 + n * 0.5; P.z = 1 + roll * 0.14; P.zy = 230; return;
      }
      /* Utbruddet, og solen som svir. */
      const bt = hits(t, KH.concat([10.16]), 0.5), k = seg(t, 5.26, 5.9), y = 196 + sin(t * 1.3) * 3, s = 3.2, ghost = mulArt('groudon', '#ff5a2a');
      lin(['#fff2c0', '#ffb040', '#e85a14', '#5a1404']); im('fireband', 256, 150, { s: 1.7, a: 0.35, add: 1 });
      const sx = 256, sy = 70; rays(sx, sy, { n: 20, rot: t * 0.1, col: '#fff6d0', a: 0.5, r1: 560, wid: 0.4 }); glow(sx, sy, 260, '#fff6d0', 0.9, 1); im('sun', sx, sy, { s: 3.4, px: 1 }); im('shine2', sx, sy, { s: 3 + sin(t * 2) * 0.2, a: 0.8, add: 1, r: t * 0.2 });
      if (ghost) im(ghost, 256 + 20, 250 - k * 30, { s: 1.25 + (t - 5.26) * 0.01, a: 0.3 * k, add: 1 });
      poly([[0, 290], [120, 276], [300, 284], [W, 270], [W, H], [0, H]], '#120402'); lava(16, 284, 0.95, 3);
      /* Lava som spruter opp for hvert slag. */
      for (const [q, x] of [[5.26, 256], [5.5, 110], [5.7, 410], [8.46, 150], [8.93, 370], [9.54, 256]]) { const d = hit(t, q, 1.1); if (d > 0) { beam(x, 26 * d + 6, 284 - (1 - d * d) * 260, 300, '#ff6a1a', d, '#ffe9a0'); for (let i = 0; i < 16; i++) { const ph = 1 - d, an = -PI / 2 + (rnd(i, q * 9) - 0.5) * 1.6, r = ph * 260; rect(x + cos(an) * r, 284 + sin(an) * r + ph * ph * 200, 5, 5, i % 2 ? '#ffd070' : '#ff5a1a', d, 1); } glow(x, 284, 80 * d, '#ff7a2a', d, 1); } }
      glow(256, y, 190, '#ff5a1a', 0.3 + bt * 0.25, 1); aura(256, y, s, '#ffb060', 4 + bt * 3, 0.35 + bt * 0.3); spr(256, y, s, { ay: 0.56 });
      if (fire) im(fire, 256, 394, { s: 1.15, ay: 1, a: 0.5 + bt * 0.3, add: 1, sx: 1 + 0.03 * sin(t * 7) });
      dust('ember', { n: 80, seed: 4, cols: ['#ff7a2a', '#ffd070', '#ff3a1a'], a: 1, spd: 2 });
      wave(5.26, 256, 284, { col: '#fff2c0', r: 560, d: 0.9, w: 16, sy: 0.5 }); wave(10.16, 256, 200, { col: '#ffd070', r: 560, d: 0.9 });
      vig(0.45, '#2a0600'); card(10.16, { col: '#ff6a2a' });
      P.sh = hit(t, 5.26, 1.3) * 16 + bt * 7; P.fl = max(hit(t, 5.26, 0.5), hit(t, 10.16, 0.2) * 0.6, seg(t, 12.25, 12.5)); P.fc = '#fff2d0'; P.wav = 1.6; P.z = 1 + (1 - k) * 0.12; P.zy = 230;
    },
    air(t, k) {
      const fire = mulArt('curtain1', '#ff7a1a'); fill('#ff7a1a', 0.07 * k, 1); rays(256, -40, { n: 14, rot: t * 0.05, col: '#fff2c0', a: 0.16 * k, r1: 520, wid: 0.4 });
      if (fire) im(fire, 256, 400, { s: 1.1, ay: 1, a: 0.3 * k, add: 1, sx: 1 + 0.03 * sin(t * 7) }); lava(5, 340, 0.6 * k, 3);
      dust('ember', { n: 40, seed: 4, cols: ['#ff7a2a', '#ffd070', '#ff3a1a'], a: 0.85 * k, spd: 1.3 }); vig(0.4 * k, '#2a0600');
    }
  });

  /* ================= DIALGA og PALKIA =================
     Låta braker løs på 0.29 og har tre tydelige tak: 5.46, 6.63 og 8.63 (så 9.29, og 11.63 der kampen starter).
     Dialga er tiden: en klokke så stor som himmelen går fortere og fortere, stanser helt på 5.46, spoler baklengs fra 6.63, og ut av revnen i tiden kommer den.
     Palkia er rommet: selve rommet er et nett som bøyer seg, to hugg (5.46 og 6.63) kløyver bildet i biter, og bak dem står den. */
  /* Urskiven: ringer, streker og to visere. a1, a2 = viserne (radianer). */
  const clock = (x, y, r, a1, a2, col, a) => {
    if (a <= 0.004) return; const X = K.g; X.save(); X.translate(x, y); X.globalCompositeOperation = 'lighter'; X.globalAlpha = c01(a); X.strokeStyle = col; X.fillStyle = col;
    for (const [rr, w] of [[r, 3], [r * 0.9, 1], [r * 0.62, 1.5], [r * 0.3, 1]]) { X.lineWidth = w; X.beginPath(); X.arc(0, 0, rr, 0, TAU); X.stroke(); }
    for (let i = 0; i < 60; i++) { const an = i / 60 * TAU, big = i % 5 === 0; X.lineWidth = big ? 3 : 1; X.beginPath(); X.moveTo(cos(an) * r * (big ? 0.8 : 0.86), sin(an) * r * (big ? 0.8 : 0.86)); X.lineTo(cos(an) * r * 0.9, sin(an) * r * 0.9); X.stroke(); }
    for (const [an, L, w] of [[a1, 0.84, 3], [a2, 0.55, 6]]) { X.save(); X.rotate(an); X.beginPath(); X.moveTo(-w, 0); X.lineTo(0, -r * L); X.lineTo(w, 0); X.lineTo(0, r * 0.12); X.closePath(); X.fill(); X.restore(); }
    X.beginPath(); X.arc(0, 0, r * 0.04, 0, TAU); X.fill(); X.restore();
  };
  const cog = (x, y, r, n, rot, col, a) => { const X = K.g; X.save(); X.translate(x, y); X.rotate(rot); X.globalCompositeOperation = 'lighter'; X.globalAlpha = c01(a); X.strokeStyle = col; X.lineWidth = 3; X.beginPath(); for (let i = 0; i < n * 2; i++) { const an = i / (n * 2) * TAU, rr = i % 2 ? r : r * 0.82; X.lineTo(cos(an - 0.06) * rr, sin(an - 0.06) * rr); X.lineTo(cos(an + 0.06 + PI / n * 0.6) * rr, sin(an + 0.06 + PI / n * 0.6) * rr); } X.closePath(); X.stroke(); X.beginPath(); X.arc(0, 0, r * 0.5, 0, TAU); X.stroke(); X.restore(); };
  /* Tiden i filmen til Dialga: går fortere og fortere, stanser på 5.46, og spoler baklengs fra 6.63. */
  const dTime = t => t < 5.46 ? t + t * t * 0.9 : t < 6.63 ? 5.46 + 5.46 * 5.46 * 0.9 : 5.46 + 5.46 * 5.46 * 0.9 - (t - 6.63) * 22;
  film(483, { len: 11.75, R: 8.63, use: ['space', 'sparkle', 'ring', 'polyring', 'burst', 'shinesoft', 'pillars', 'vacuum'],
    cues: [[0.29, 'boom'], [5.46, 'thud'], [6.63, 'thud'], [8.63, 'cry'], [8.63, 'boom']],
    draw(t, P, c) {
      const tt = dTime(t), cx = 256, cy = 180, froz = t >= 5.46 && t < 6.63, rew = t >= 6.63 && t < 8.63, fin = t >= 8.63, bt = hits(t, [8.63, 9.29, 9.96, 10.62, 11.3], 0.45);
      if (!fin) P.bars = 1; if (t < 0.29) return;
      im('space', 256, 192) || lin(['#02030c', '#0a1238', '#02030c']); glow(cx, cy, 340, '#1a3a9a', 0.35, 1);
      stars({ n: 110, seed: 3, a: 0.9, cols: ['#fff', '#9fd0ff', '#c8b8ff'], warp: froz ? 0 : rew ? 0.9 : c01(t / 5.46) * 0.5, spd: rew ? -1.6 : 0.2 + t * 0.12, cx, cy }); if (froz) stars({ n: 110, seed: 3, a: 0.9, cols: ['#fff', '#9fd0ff'] });
      im('pillars', 256, 384, { s: 1.5, ay: 1, a: 0.5 });
      /* Tannhjulene og urskiven. */
      const ca = fin ? 0.45 : 0.85 * seg(t, 0.29, 0.8);
      cog(70, 70, 86, 12, tt * 0.5, '#4a8aff', ca * 0.5); cog(452, 300, 110, 14, -tt * 0.4, '#4a8aff', ca * 0.5); cog(440, 60, 50, 8, tt * 0.9, '#9fd0ff', ca * 0.5); cog(70, 320, 60, 9, -tt * 0.8, '#9fd0ff', ca * 0.5);
      clock(cx, cy, 168 + bt * 6, tt * 2.2, tt * 0.19, froz ? '#fff' : '#7ab8ff', ca);
      /* Diamantstøv. */
      for (let i = 0; i < 22; i++) { const x = rnd(i, 5) * W, y = ((rnd(i, 6) * 460 + tt * 14 * (0.5 + rnd(i, 7))) % 460 + 460) % 460 - 40, sz = 4 + rnd(i, 8) * 7; poly([[x, y - sz * 1.5], [x + sz, y], [x, y + sz * 1.5], [x - sz, y]], '#9fe0ff', 0.5 + 0.3 * sin(tt * 3 + i), 1); }
      /* Tiden stanser, og en revne av lys åpner seg. */
      const rift = eo(seg(t, 5.46, 6.5)) * (fin ? 1 - seg(t, 8.63, 9.2) : 1);
      if (rift > 0) { beam(cx, 16 + rift * 70, 0, H, '#9fd0ff', rift, '#fff'); glow(cx, cy, 240 * rift, '#bfe0ff', 0.5 * rift, 1); }
      if (rew) { const a = seg(t, 6.63, 7.6), s = 2 + a * 1.1; aura(cx, cy + 6, s, '#9fd0ff', 3, 0.5 * a); spr(cx, cy + 6, s, { col: '#03061a', a }); if (c.sp) glow(cx + (0.4 - 0.5) * c.sp.bw * s, cy + 6 + (0.5 - 0.5) * c.sp.bh * s, 30 + sin(t * 9) * 6, '#7af0ff', a, 1); }
      if (fin) { const y = cy + 2 + sin(t * 1.5) * 4, s = 3.1; rays(cx, cy, { n: 12, rot: -t * 0.3, col: '#7ab8ff', a: 0.3 + bt * 0.2, r1: 480, wid: 0.3 }); im('vacuum', cx, cy, { s: 1.25 + bt * 0.1, a: 0.6, add: 1, r: t }); glow(cx, y, 210, '#4a8aff', 0.4 + bt * 0.2, 1);
        aura(cx, y, s, '#bfe0ff', 4 + bt * 3, 0.35 + bt * 0.3); spr(cx, y, s); dust('spark', { n: 40, seed: 5, cols: ['#fff', '#9fe0ff'], a: 0.9, size: 2 }); dust('ember', { n: 40, seed: 9, cols: ['#9fe0ff', '#fff'], a: 0.8, spd: 1.2 });
        wave(8.63, cx, cy, { col: '#fff', r: 560, d: 0.8, w: 18 }); wave(8.9, cx, cy, { col: '#7ab8ff', r: 560, d: 0.9 }); wave(9.29, cx, cy, { col: '#bfe0ff', r: 560, d: 0.9 }); card(9.29, { col: '#6aa8ff' }); }
      vig(0.5, '#01020a');
      P.sh = hit(t, 0.29, 0.6) * 9 + hit(t, 5.46, 0.4) * 8 + hit(t, 6.63, 0.5) * 8 + (rew ? 2 : 0) + hit(t, 8.63, 1) * 15 + bt * 2; P.fl = max(hit(t, 0.29, 0.3) * 0.8, hit(t, 5.46, 0.2) * 0.7, hit(t, 8.63, 0.45), seg(t, 11.5, 11.75)); P.fc = '#e8f2ff';
      P.inv = froz ? 0.9 * (1 - seg(t, 6.4, 6.63)) : 0; P.gl = rew ? 0.35 + hit(t, 6.63, 0.4) * 0.5 : 0; P.scan = rew ? 0.25 : 0; P.rgb = rew ? 3 : hit(t, 8.63, 0.6) * 8; P.z = 1 + seg(t, 0.3, 5.46) * 0.08 + hit(t, 8.63, 0.4) * 0.14; P.zy = cy;
    },
    air(t, k) {
      clock(378, 132, 150, t * 0.8, t * 0.07, '#7ab8ff', 0.2 * k); cog(60, 60, 70, 12, t * 0.2, '#4a8aff', 0.16 * k); cog(470, 330, 90, 14, -t * 0.15, '#4a8aff', 0.16 * k);
      for (let i = 0; i < 14; i++) { const x = rnd(i, 5) * W, y = ((rnd(i, 6) * 460 + t * 14 * (0.5 + rnd(i, 7))) % 460) - 40, sz = 3 + rnd(i, 8) * 5; poly([[x, y - sz * 1.5], [x + sz, y], [x, y + sz * 1.5], [x - sz, y]], '#9fe0ff', (0.35 + 0.25 * sin(t * 3 + i)) * k, 1); }
      dust('spark', { n: 20, seed: 5, cols: ['#fff', '#9fe0ff'], a: 0.7 * k }); vig(0.4 * k, '#01030f');
    }
  });
  /* Rommet som et nett sett i perspektiv, med en grop i midten som blir dypere. */
  const grid = (t, deep, col, a) => { const X = K.g; X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = c01(a); X.strokeStyle = col; X.lineWidth = 1;
    const pt = (u, v) => { const d = Math.hypot(u, v), dip = deep * 120 * Math.exp(-d * d * 2.2), z = 0.55 + (v + 1) * 0.9, x = 256 + u * 360 / z * 1.2, y = 150 + 150 / z + dip / z + sin(u * 4 + t) * 4 * deep; return [x, y]; };
    for (let i = -8; i <= 8; i++) { X.beginPath(); for (let j = -10; j <= 10; j++) { const q = pt(i / 8, j / 10); j === -10 ? X.moveTo(q[0], q[1]) : X.lineTo(q[0], q[1]); } X.stroke(); X.beginPath(); for (let j = -10; j <= 10; j++) { const q = pt(j / 10, i / 8); j === -10 ? X.moveTo(q[0], q[1]) : X.lineTo(q[0], q[1]); } X.stroke(); } X.restore(); };
  const pScene = (t, deep) => { lin(['#06021a', '#1a0a3a', '#4a1260', '#1a0628']); glow(256, 150, 300, '#ff6ad0', 0.22, 1); stars({ n: 120, seed: 6, a: 0.9, cols: ['#fff', '#ffc0ea', '#c8b8ff'] }); grid(t, deep, '#ff8ad0', 0.55);
    for (let i = 0; i < 9; i++) { const an = i / 9 * TAU + t * 0.3, x = 256 + cos(an) * 200, y = 140 + sin(an) * 60, r = 9 + (i % 3) * 3; glow(x, y, r * 3, '#ffc0ea', 0.5, 1); K.g.save(); K.g.fillStyle = '#fff0fa'; K.g.beginPath(); K.g.arc(x, y, r, 0, TAU); K.g.fill(); K.g.fillStyle = '#ff9ad8'; K.g.beginPath(); K.g.arc(x + r * 0.25, y + r * 0.25, r * 0.7, 0, TAU); K.g.fill(); K.g.fillStyle = '#fff'; K.g.beginPath(); K.g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); K.g.fill(); K.g.restore(); } };
  film(484, { len: 11.75, R: 8.63, use: ['sparkle', 'ring', 'burst', 'shinesoft', 'pillars', 'rings', 'sphere'],
    cues: [[0.29, 'boom'], [5.46, 'boom'], [6.63, 'boom'], [8.63, 'cry'], [8.63, 'boom']],
    draw(t, P, c) {
      const cx = 256, cy = 180, fin = t >= 8.63, bt = hits(t, [8.63, 9.29, 9.96, 10.62, 11.3], 0.45), c1 = eo(seg(t, 5.46, 6.4)), c2 = eo(seg(t, 6.63, 7.6)), s = 3.1, y = cy + sin(t * 1.5) * 4;
      if (!fin) P.bars = 1; if (t < 0.29) return;
      /* Bak rommet: hvitt og rosa lys, og den som står der. */
      lin(['#fff0fa', '#ffb0e0', '#c060c0', '#3a0a4a']); im('rings', cx, cy, { s: 1.6, r: t * 0.4, a: 0.5, add: 1 }); rays(cx, cy, { n: 14, rot: t * 0.2, col: '#fff', a: 0.35 + bt * 0.2, r1: 500, wid: 0.36 });
      if (t >= 6.63) { const a = fin ? 1 : seg(t, 6.63, 7.5); if (fin) { fill('#22042e', 0.52 * seg(t, 8.63, 9.2)); im('sphere', cx, y, { s: 1.3 + bt * 0.08, a: 0.4, add: 1 }); aura(cx, y, s, '#fff', 4 + bt * 3, 0.4 + bt * 0.3); spr(cx, y, s); } else { spr(cx, y, mix(2.2, s, a), { col: '#2a0638', a }); if (c.sp) for (const dx of [-0.3, 0.3]) glow(cx + dx * c.sp.bw * 2.6, y - 0.12 * c.sp.bh * 2.6, 22, '#ff9ad8', a, 1); } }
      /* Rommet kløyves: to hugg, og bitene glir fra hverandre. */
      if (t < 9.3) {
        const old = onAux(0, () => pScene(t, seg(t, 0.3, 5.46)));
        if (t < 5.46) K.g.drawImage(old, 0, 0);
        else if (!fin) { const X = K.g, d1 = c1 * 46 + c2 * 30, d2 = c2 * 50, cuts = [[[0, 0], [W + 120, 0], [-120, H], [0, H]], [[W + 120, 0], [W, 0], [W, H], [-120, H]]];
          cuts.forEach((pl, i) => { for (let h = 0; h < 2; h++) { X.save(); const sg = i ? 1 : -1, sh = h ? 1 : -1; X.translate(sg * d1 * 0.7 + sh * d2 * 0.6, sg * d1 * 0.5 - sh * d2 * 0.75); X.beginPath(); pl.forEach((q, j) => j ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1])); X.closePath(); X.clip(); X.beginPath(); h ? (X.moveTo(-120, -90), X.lineTo(W + 200, H + 150), X.lineTo(W + 200, -90)) : (X.moveTo(-120, -90), X.lineTo(W + 200, H + 150), X.lineTo(-120, H + 150)); X.closePath(); X.clip(); X.drawImage(old, 0, 0); X.restore(); } });
          for (const [q, x0, y0, x1, y1] of [[5.46, 560, -40, -60, 430], [6.63, -60, -40, 580, 430]]) { const k = seg(t, q, q + 0.16), d = hit(t, q, 0.7); if (d > 0) { K.g.save(); K.g.globalCompositeOperation = 'lighter'; K.g.strokeStyle = '#fff'; K.g.lineWidth = 3 + d * 14; K.g.globalAlpha = d; K.g.beginPath(); K.g.moveTo(x0, y0); K.g.lineTo(mix(x0, x1, k), mix(y0, y1, k)); K.g.stroke(); K.g.strokeStyle = '#ff8ad0'; K.g.lineWidth = 20 + d * 30; K.g.globalAlpha = d * 0.4; K.g.stroke(); K.g.restore(); } }
        } else shatter(onAux(1, () => pScene(8.63, 1)), seg(t, 8.63, 9.3), cx, cy, 5);
      }
      if (fin) { dust('spark', { n: 40, seed: 5, cols: ['#fff', '#ffc0ea'], a: 0.9, size: 2 }); dust('ember', { n: 40, seed: 9, cols: ['#ffc0ea', '#fff'], a: 0.8, spd: 1.2 }); wave(8.63, cx, cy, { col: '#fff', r: 560, d: 0.8, w: 18 }); wave(8.9, cx, cy, { col: '#ff8ad0', r: 560, d: 0.9 }); wave(9.29, cx, cy, { col: '#ffc0ea', r: 560, d: 0.9 }); card(9.29, { col: '#ff8ad0' }); vig(0.4, '#2a0630'); } else vig(0.5, '#06021a');
      P.sh = hit(t, 0.29, 0.6) * 9 + hit(t, 5.46, 0.6) * 12 + hit(t, 6.63, 0.6) * 12 + hit(t, 8.63, 1) * 15 + bt * 2; P.fl = max(hit(t, 0.29, 0.3) * 0.8, hits(t, [5.46, 6.63], 0.16) * 0.7, hit(t, 8.63, 0.45), seg(t, 11.5, 11.75)); P.fc = '#fff0fa'; P.rgb = hits(t, [5.46, 6.63], 0.5) * 7 + hit(t, 8.63, 0.6) * 8; P.z = 1 + seg(t, 0.3, 5.46) * 0.08 + hit(t, 8.63, 0.4) * 0.14; P.zy = cy;
    },
    air(t, k) {
      fill('#3a0a4a', 0.16 * k); grid(t, 0.5 + 0.3 * sin(t * 0.5), '#ff8ad0', 0.22 * k); dust('spark', { n: 24, seed: 5, cols: ['#fff', '#ffc0ea'], a: 0.7 * k }); dust('ember', { n: 24, seed: 9, cols: ['#ffc0ea', '#fff'], a: 0.6 * k, spd: 0.9 });
      wave(floor(t / 2.1) * 2.1, 378, 132, { col: '#ff8ad0', r: 260, d: 1.6, w: 3, a: 0.4 * k }); vig(0.4 * k, '#1a0628');
    }
  });

  /* ================= ZEKROM, RESHIRAM og KYUREM =================
     Låta starter på 0.29 og bygger seg opp. Slagene: 6.39 (den viser seg), 7.84 (navnet), 8.58 og 10.29 (kampen starter).
     Zekrom: den mørke steinen henger i et tordenvær, og lynet slår ned i den oftere og oftere til den sprekker i et eneste blått lyn.
     Reshiram: den lyse steinen i mørket, ilden som vokser rundt den til alt står i flammer.
     Kyurem: frosset fast i isen, og isen som kryper inn fra kantene til den brister. */
  const ZR = 6.39;
  /* Steinen: en kule med lys kant og sprekker som åpner seg. */
  const stone = (x, y, r, dark, rim, crack) => { const X = K.g, gr = X.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, dark ? '#3a4660' : '#ffffff'); gr.addColorStop(0.6, dark ? '#0a0e1a' : '#e8e4d8'); gr.addColorStop(1, dark ? '#000' : '#a8a090'); glow(x, y, r * 2.6, rim, 0.5 + crack * 0.4, 1); X.save(); X.fillStyle = gr; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); X.restore(); for (let i = 0; i < floor(crack * 7); i++) { const an = rnd(i, 3) * TAU; bolt(x + cos(an) * r * 0.15, y + sin(an) * r * 0.15, x + cos(an + 0.5) * r * 0.95, y + sin(an + 0.5) * r * 0.95, { seed: i + 4, col: rim, core: '#fff', w: 1.2, jag: 0.4, depth: 3 }); } };
  film(644, { len: 10.5, R: ZR, use: ['vortex', 'em_cloudL', 'em_cloudR', 'smoke', 'hexbolt', 'sparkle', 'ring', 'speed', 'darkarcs', 'polyring'],
    cues: [[0.29, 'thud'], [ZR, 'boom'], [ZR, 'cry'], [7.84, 'thud']],
    draw(t, P, c) {
      const cx = 256, cy = 176, fin = t >= ZR, bt = hits(t, [ZR, 7.84, 8.58, 10.29], 0.45), ch = seg(t, 0.29, ZR);
      if (!fin) P.bars = 1; if (t < 0.29) return;
      lin(['#02040c', '#061230', '#0a1e4a', '#02040c']); im('vortex', cx, cy, { s: 1.35, r: t * (0.2 + ch * 0.6), a: 0.85, add: 'screen' });
      for (let i = 0; i < 6; i++) { const x = (i % 2 ? 470 : 40) + sin(t * 0.5 + i) * 20, y = 30 + (i >> 1) * 130; im(i % 2 ? 'em_cloudR' : 'em_cloudL', x, y, { s: 3, a: 0.5, px: 1 }); }
      fill('#01030a', 0.35);
      /* Lynet: sjelden i starten, hele tiden mot slutten. Hvert nedslag lyser opp alt. */
      let lit = 0; const rate = fin ? 9 : 1.2 + ch * ch * 7, q = floor(t * rate), ph = (t * rate) % 1, nb = fin ? 7 : 1 + floor(ch * 3);
      for (let i = 0; i < nb; i++) { const qq = q + i * 13, an = rnd(qq, 1) * TAU, R = 330, a = fin ? 0.6 + 0.4 * rnd(qq, 9) : c01(1.4 - ph * 1.4); if (fin || ph < 0.75) { const tx = fin ? cx + cos(an) * (40 + rnd(qq, 2) * 60) : cx, ty = fin ? cy + sin(an) * (40 + rnd(qq, 3) * 60) : cy; bolt(cx + cos(an) * R, cy + sin(an) * R * 0.8, tx, ty, { seed: qq * 3 + floor(ph * 3), col: '#4ad0ff', core: '#eaffff', w: fin ? 2.4 : 2 + ch * 1.5, a, br: 2 + floor(ch * 3) }); lit = max(lit, a); } }
      fill('#3aa0ff', lit * (fin ? 0.04 : 0.07));   /* Selve lynene er mange, men lyset over hele bildet holdes svakt, så det ikke blinker hardt. */
      /* Ringen av strøm rundt steinen går fortere og fortere. */
      const spin = t * (2 + ch * 22); for (let i = 0; i < 3; i++) im('darkarcs', cx, cy, { s: (fin ? 2.6 : 0.9 + ch * 0.8) + i * 0.35, r: spin * (i % 2 ? -1 : 1) / (1 + i * 0.4), a: 0.5 + ch * 0.4, add: 1 }) || ring(cx, cy, 60 + i * 30, { col: '#4ad0ff', a: 0.4, w: 2 });
      if (!fin) { stone(cx, cy + sin(t * 2) * 4, 30 + ch * 12, 1, '#4ad0ff', ch * ch); dust('spark', { n: 20 + floor(ch * 40), seed: 4, cols: ['#4ad0ff', '#fff'], a: 0.9, spd: 2, size: 2 }); }
      else { const y = cy + 6 + sin(t * 1.6) * 3, s = 3.0, k = seg(t, ZR, ZR + 0.5);
        beam(cx, 140 * (1 - k) + 30 * hit(t, 7.84, 0.5), 0, H, '#4ad0ff', (1 - k) + hit(t, 7.84, 0.4) * 0.6, '#fff'); im('hexbolt', cx, 192, { s: 1.5, r: PI / 2, a: (1 - k) * 0.9, add: 1 });
        rays(cx, cy, { n: 14, rot: t * 0.4, col: '#4ad0ff', a: 0.25 + bt * 0.2, r1: 480, wid: 0.3 }); glow(cx, y, 220, '#2a8aff', 0.5 + bt * 0.2, 1);
        aura(cx, y, s, '#7ae0ff', 4 + bt * 4, 0.45 + bt * 0.3); spr(cx, y, s); dust('spark', { n: 60, seed: 4, cols: ['#4ad0ff', '#fff'], a: 1, spd: 3, size: 2 });
        wave(ZR, cx, cy, { col: '#eaffff', r: 560, d: 0.8, w: 18 }); wave(ZR + 0.3, cx, cy, { col: '#4ad0ff', r: 560, d: 0.9 }); wave(7.84, cx, cy, { col: '#7ae0ff', r: 560, d: 0.9 }); card(7.84, { col: '#4ad0ff' }); }
      vig(0.55, '#01030a');
      P.sh = (fin ? 0 : lit * (1 + ch * 5)) + hit(t, ZR, 1.1) * 16 + bt * 3; P.fl = max(hit(t, ZR, 0.45), hit(t, 7.84, 0.2) * 0.5, seg(t, 10.25, 10.5)); P.fc = '#eaf8ff'; P.rgb = hit(t, ZR, 0.7) * 9; P.z = 1 + ch * 0.14 * (fin ? 0 : 1) + hit(t, ZR, 0.4) * 0.14; P.zy = cy;
    },
    air(t, k) {
      fill('#030a1c', 0.24 * k); const q = floor(t * 2.4), ph = (t * 2.4) % 1;
      for (let i = 0; i < 2; i++) { const qq = q + i * 7; if (ph < 0.5 && rnd(qq, 8) > 0.35) bolt(rnd(qq, 1) * W, -10, rnd(qq, 2) * W, 120 + rnd(qq, 3) * 140, { seed: qq * 3 + floor(ph * 6), col: '#4ad0ff', core: '#eaffff', w: 2, a: 1 - ph * 2, br: 2 }); }
      im('darkarcs', 378, 132, { s: 1.5, r: t * 3, a: 0.4 * k, add: 1 }); dust('spark', { n: 30, seed: 4, cols: ['#4ad0ff', '#fff'], a: 0.9 * k, spd: 2 }); vig(0.4 * k, '#01040f');
    }
  });
  /* Ild: gardiner av flammer som vokser opp fra bunnen. k = hvor høyt de står (0..1). */
  const flames = (t, k, a, cols) => { const f1 = mulArt('curtain1', cols[0]), f2 = mulArt('curtain2', cols[1]); if (!f1) { for (let i = 0; i < 9; i++) glow(i * 64 + sin(t * 3 + i) * 12, H, 120 + k * 220 + sin(t * 6 + i * 2) * 20, cols[0], a * 0.5, 1); return; }
    im(f2, 256 + sin(t * 1.7) * 14, H + 30, { s: 1.1, sy: 0.5 + k * 1.2, ay: 1, a: a * 0.8, add: 1 }); im(f1, 256 - sin(t * 2.3) * 18, H + 20, { s: 1.15, sy: 0.4 + k * 1.1, ay: 1, a, add: 1, flip: 1 }); im(f1, 256 + sin(t * 3.1 + 1) * 10, H + 10, { s: 1.05, sy: 0.3 + k * 0.8, ay: 1, a: a * 0.9, add: 1 }); };
  film(643, { len: 10.5, R: ZR, use: ['curtain1', 'curtain2', 'firepx', 'smoke', 'sparkle', 'ring', 'burst', 'fireband', 'shine', 'evilbg'],
    cues: [[0.29, 'thud'], [ZR, 'boom'], [ZR, 'cry'], [7.84, 'thud']],
    draw(t, P, c) {
      const cx = 256, cy = 176, fin = t >= ZR, bt = hits(t, [ZR, 7.84, 8.58, 10.29], 0.45), ch = seg(t, 0.29, ZR);
      if (!fin) P.bars = 1; if (t < 0.29) return;
      if (!fin) {
        lin(['#040100', '#120400', '#3a0c02', '#7a2206']); glow(cx, 430, 380, '#ff6a1a', 0.3 + ch * 0.5, 1);
        flames(t, ch * 0.75, 0.35 + ch * 0.65, ['#ff6a1a', '#ffb040']);
        /* Ringen av ild rundt steinen. */
        for (let i = 0; i < 28; i++) { const an = i / 28 * TAU + t * (1.5 + ch * 9), R = 70 + ch * 26 + sin(t * 5 + i) * 4, x = cx + cos(an) * R, y = cy + sin(an) * R * 0.5; glow(x, y, 16 + ch * 12, i % 2 ? '#ffb040' : '#ff5a1a', 0.5 + ch * 0.4, 1); }
        stone(cx, cy + sin(t * 2) * 4, 30 + ch * 12, 0, blend('#ffb040', '#ffffff', ch), ch * ch); if (ch > 0.5) glow(cx, cy, 60 + ch * 50, '#fff6d8', (ch - 0.5) * 1.6, 1);
        dust('ember', { n: 40 + floor(ch * 70), seed: 4, cols: ['#ff7a2a', '#ffd070', '#fff'], a: 1, spd: 1 + ch * 2.5 });
        vig(0.6, '#0a0200'); P.wav = 0.8 + ch * 2; P.sh = ch * ch * 5; P.z = 1 + ch * 0.14; P.zy = cy; return;
      }
      const y = cy + 6 + sin(t * 1.6) * 3, s = 3.0, k = seg(t, ZR, ZR + 0.6);
      lin(['#ffb040', '#e04a10', '#7a1a04', '#2a0600']); im('fireband', 256, 192, { s: 1.7, a: 0.3, add: 1 }); fill('#2a0600', 0.5 * k);
      /* Den blå flammen i midten, og ilden som står rundt. */
      beam(cx, 170 * (1 - k * 0.6), 0, H, '#7ad0ff', 0.9 * (1 - k * 0.7), '#fff'); rays(cx, cy, { n: 16, rot: t * 0.35, col: '#ffe9a8', a: 0.3 + bt * 0.2, r1: 480, wid: 0.34 });
      flames(t * 1.6, 1, 1, ['#ff5a14', '#ffb040']); glow(cx, y, 230, '#ff8a2a', 0.45 + bt * 0.2, 1);
      aura(cx, y, s, '#ffd070', 4 + bt * 4, 0.45 + bt * 0.3); spr(cx, y, s); flames(t * 1.6 + 5, 0.25, 0.8, ['#ff7a1a', '#ffd070']);
      dust('ember', { n: 110, seed: 4, cols: ['#ff7a2a', '#ffd070', '#fff'], a: 1, spd: 3.2 });
      wave(ZR, cx, cy, { col: '#fff', r: 560, d: 0.8, w: 18 }); wave(ZR + 0.3, cx, cy, { col: '#ffb040', r: 560, d: 0.9 }); wave(7.84, cx, cy, { col: '#ffd070', r: 560, d: 0.9 }); card(7.84, { col: '#ff8a2a' });
      vig(0.45, '#2a0600'); P.wav = 1.6; P.sh = hit(t, ZR, 1.1) * 16 + bt * 3; P.fl = max(hit(t, ZR, 0.5), hit(t, 7.84, 0.2) * 0.5, seg(t, 10.25, 10.5)); P.fc = '#fff6e0'; P.z = 1 + hit(t, ZR, 0.4) * 0.14; P.zy = cy;
    },
    air(t, k) { fill('#ff5a14', 0.06 * k, 1); flames(t, 0.22, 0.55 * k, ['#ff6a1a', '#ffb040']); dust('ember', { n: 50, seed: 4, cols: ['#ff7a2a', '#ffd070', '#fff'], a: 0.9 * k, spd: 1.6 }); vig(0.4 * k, '#2a0600'); }
  });
  /* Rim som kryper inn fra kantene: forgrenede krystaller. k = hvor langt de har kommet. */
  const frost = (k, a) => { for (let i = 0; i < 16; i++) { const e = i % 4, p = rnd(i, 7), x0 = e === 0 ? p * W : e === 1 ? W : e === 2 ? p * W : 0, y0 = e === 0 ? 0 : e === 1 ? p * H : e === 2 ? H : p * H, an = Math.atan2(192 - y0, 256 - x0) + (rnd(i, 8) - 0.5) * 0.9, L = (50 + rnd(i, 9) * 90) * k; if (L > 4) bolt(x0, y0, x0 + cos(an) * L, y0 + sin(an) * L, { seed: i * 5 + 1, col: '#9fe8ff', core: '#e8faff', w: 1.3, a: a * 0.8, jag: 0.12, depth: 3, br: 3 }); } };
  film(646, { len: 10.5, R: ZR, use: ['loc_icepath', 'fog', 'cracks', 'sparkle', 'ring', 'shinesoft', 'smoke', 'burst'],
    cues: [[0.29, 'thud'], [ZR, 'boom'], [ZR, 'cry'], [7.84, 'thud']],
    draw(t, P, c) {
      const cx = 256, cy = 180, fin = t >= ZR, bt = hits(t, [ZR, 7.84, 8.58, 10.29], 0.45), ch = seg(t, 0.29, ZR), s = 3.0, ice = tintArt('cracks', '#bff4ff');
      if (!fin) P.bars = 1; if (t < 0.29) return;
      cover('loc_icepath', { z: 1.05 + ch * 0.1 }) || lin(['#0a2a4a', '#6ab8e0', '#e8f8ff']); fill('#04122a', fin ? 0.45 : 0.62 - ch * 0.2);
      strip('fog', 250, t * 30, { s: 1.3, a: 0.6 }); strip('fog', 20, -t * 22, { s: 1.5, a: 0.35 });
      if (!fin) { /* Frosset fast i en blokk av is. */
        const y = cy + 6, w = 120, h = 190; poly([[cx - w, y - h * 0.5], [cx - w * 0.6, y - h * 0.62], [cx + w * 0.7, y - h * 0.58], [cx + w, y - h * 0.4], [cx + w * 0.9, y + h * 0.5], [cx - w * 0.85, y + h * 0.52]], '#9fd8f0', 0.28); spr(cx, y, 2.6, { col: '#0a2038', a: 0.85 }); poly([[cx - w, y - h * 0.5], [cx - w * 0.6, y - h * 0.62], [cx - w * 0.3, y - h * 0.6], [cx - w * 0.7, y + h * 0.5], [cx - w * 0.85, y + h * 0.52]], '#e8f8ff', 0.22, 1);
        if (c.sp) for (const dx of [-0.06, 0.08]) glow(cx + (dx - 0.22) * c.sp.bw * 2.6, y - 0.2 * c.sp.bh * 2.6, 8 + ch * 10, '#ffe86a', seg(t, 2.5, 3.2) * (0.6 + 0.4 * sin(t * 6)), 1);
        if (ice) im(ice, cx, cy, { s: 0.7 + ch * 0.4, a: ch * ch, add: 1 }); frost(eo(ch), 0.9); }
      else { const y = cy + sin(t * 1.5) * 4; rays(cx, cy, { n: 12, rot: t * 0.2, col: '#bff4ff', a: 0.3 + bt * 0.2, r1: 480, wid: 0.3 }); glow(cx, y, 220, '#6ac8ff', 0.45 + bt * 0.2, 1); aura(cx, y, s, '#e8f8ff', 4 + bt * 4, 0.4 + bt * 0.3); spr(cx, y, s); frost(1, 0.5);
        shatter(onAux(0, () => { fill('#bfe8ff', 0.9); frost(1, 1); }), seg(t, ZR, ZR + 0.8), cx, cy, 9);
        wave(ZR, cx, cy, { col: '#fff', r: 560, d: 0.8, w: 18 }); wave(7.84, cx, cy, { col: '#bff4ff', r: 560, d: 0.9 }); card(7.84, { col: '#7ad8ff' }); }
      dust('snow', { n: fin ? 170 : 60 + floor(ch * 60), seed: 3, cols: ['#fff', '#d8f4ff'], a: 0.9, spd: fin ? 5 : 1 + ch * 2, wind: fin ? -2.4 : -0.5 }); dust('spark', { n: 24, seed: 6, cols: ['#fff', '#bff4ff'], a: 0.8, size: 2 });
      vig(0.5, '#020a1a'); P.sh = hit(t, ZR, 1.1) * 15 + bt * 3 + (fin ? 0 : ch * ch * 3); P.fl = max(hit(t, ZR, 0.45), hit(t, 7.84, 0.2) * 0.5, seg(t, 10.25, 10.5)); P.fc = '#f0fbff'; P.z = 1 + hit(t, ZR, 0.4) * 0.14; P.zy = cy;
    },
    air(t, k) { fill('#0a2a4a', 0.16 * k); strip('fog', 300, t * 30, { s: 1.3, a: 0.5 * k }); frost(0.45, 0.5 * k); dust('snow', { n: 110, seed: 3, cols: ['#fff', '#d8f4ff'], a: 0.85 * k, spd: 3.4, wind: -1.8 }); vig(0.4 * k, '#020a1a'); }
  });

  /* ================= LUGIA =================
     Låta har en lang, rolig opptakt, så filmen starter 4.6 sekunder inn. Da løfter musikken seg på 8.3 i filmen (12.9 i låta).
     Filmen: virvlene ved Whirl Islands om natten, ned gjennom vannet, og inn i hula bak fossen. Fem bjeller ringer én etter én, slik danserne kaller den,
     noe stort rører seg bak vannet – og så bryter den ut gjennom fossen. */
  const LB = [4.3, 5.0, 5.7, 6.4, 7.1];
  /* Fossen i bildet fra hula: vann som faller i striper, og skum der den treffer. x, y0, y1 i lerretets piksler. */
  const falls = (t, x, w, y0, y1, a, open) => { const X = K.g; X.save(); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 46; i++) { let u = rnd(i, 3); if (open) u = u < 0.5 ? u * (1 - open) : 1 - (1 - u) * (1 - open); const ph = (rnd(i, 4) + t * (1.1 + rnd(i, 5) * 0.8)) % 1, L = 20 + rnd(i, 6) * 46; X.globalAlpha = c01(a * (0.25 + 0.45 * rnd(i, 7))); X.fillStyle = i % 3 ? '#bfe8ff' : '#fff'; X.fillRect(x + (u - 0.5) * w, y0 + ph * (y1 - y0) - L, 2 + (i % 2), L); } X.restore(); glow(x, y1, w * 0.9, '#e8f8ff', 0.5 * a, 1); };
  film(249, { len: 11.4, at: 4.6, R: 8.3, use: ['loc_whirl', 'loc_tohjo', 'fog', 'lightA', 'lightB', 'vortex', 'sparkle', 'ring', 'burst', 'shinesoft', 'brushring', 'smoke'],
    cues: [[0.2, 'thud'], [4.3, 'bell'], [5.0, 'bell'], [5.7, 'bell'], [6.4, 'bell'], [7.1, 'bell'], [8.3, 'boom'], [8.3, 'cry']],
    draw(t, P, c) {
      const fin = t >= 8.3, bt = hits(t, [8.3, 9.2, 10.4], 0.5), cx = 256;
      if (!fin) P.bars = 1;
      if (t < 3.2) {
        /* Virvlene i havet, i regn og lyn. */
        const z = 1.02 + t * 0.09; cover('loc_whirl', { z, px: -0.2, py: 0.1 }) || lin(['#04264a', '#0a4a7a']); fill('#020a22', 0.42 - hit(t, 1.5, 0.5) * 0.3); im('vortex', 250, 200, { s: 0.9 * z, r: t * 0.8, a: 0.35, add: 'screen' });
        dust('rain', { n: 130, seed: 2, cols: ['#9fc8e8', '#e8f4ff'], a: 0.6, spd: 1.4, wind: -0.6 }); const d = hit(t, 1.5, 0.5); if (d > 0) { bolt(380, -10, 300, 210, { seed: 4 + floor(t * 20), col: '#bfe0ff', core: '#fff', w: 2.4, a: d, br: 3 }); fill('#cfe6ff', d * 0.14); }
        fill('#02122e', seg(t, 2.5, 3.2)); dust('bubble', { n: 50, seed: 3, cols: ['#bfe8ff'], a: seg(t, 2.4, 3.1), spd: 5 });
        vig(0.6, '#000410'); P.fade = max(1 - seg(t, 0, 0.5), 0); P.z = 1 + seg(t, 2.4, 3.2) * 0.3; P.zx = 250; P.zy = 200; P.sh = d * 5; return;
      }
      /* Hula bak fossen. */
      const open = fin ? 1 : eo(seg(t, 7.5, 8.3)), fx = 268, zz = 1.06 + (t - 3.2) * 0.012, lit = fin ? 0.25 : 0.52 - hits(t, LB, 0.6) * 0.14;
      cover('loc_tohjo', { z: zz, px: 0.1 }) || lin(['#04122a', '#0a3a5a', '#04122a']); fill('#020a22', lit);
      for (let i = 0; i < 3; i++) im(i % 2 ? 'lightA' : 'lightB', 150 + i * 110, -10, { s: 2.4, ay: 0, a: 0.1 + 0.04 * sin(t + i * 2), add: 1 });
      /* Skyggen bak vannet, og øynene. */
      if (!fin) { const a = seg(t, 5.6, 7.4), wing = sin(t * 2.1) * 0.06; glow(fx, 170, 150, '#bfe0ff', a * 0.35, 1); spr(fx, 176, 2.5 + a * 0.3, { col: '#02081c', a: a * 0.85, sy: 1 + wing }); if (c.sp) glow(fx - 0.3 * c.sp.bw * 2.6, 176 - 0.02 * c.sp.bh * 2.6, 9, '#ff5a6a', seg(t, 6.8, 7.3), 1); }
      falls(t, fx, 150 * zz, 40, 268, fin ? 0.5 : 0.9, open);
      /* Bjellene. */
      LB.forEach((q, i) => { const a = seg(t, q, q + 0.2) * (fin ? 1 - seg(t, 8.3, 8.8) : 1); if (a <= 0) return; const an = PI + (i + 0.5) / 5 * PI, x = cx + cos(an) * 190, y = 250 + sin(an) * 150; glow(x, y, 26 + hit(t, q, 0.5) * 30, '#ffe08a', a, 1); im('sparkle', x, y, { s: 0.3 + hit(t, q, 0.5) * 0.4, a, add: 1, r: t }); wave(q, x, y, { col: '#ffe9a8', r: 110, d: 1.1, w: 3, a: 0.8 }); });
      strip('fog', 280, t * 26, { s: 1.3, a: 0.7 }); dust('up', { n: 0 }); dust('mote', { n: 40, seed: 8, cols: ['#bfe8ff', '#fff'], a: 0.6 });
      if (fin) { const k = seg(t, 8.3, 8.9), y = mix(230, 170, back(k)) + sin(t * 1.5) * 5, s = mix(2.4, 3.1, eo(k));
        rays(cx, 180, { n: 12, rot: t * 0.15, col: '#e8f4ff', a: 0.3 + bt * 0.2, r1: 480, wid: 0.3 }); glow(cx, y, 230, '#9fd0ff', 0.5 + bt * 0.2, 1); im('brushring', cx, y, { s: 0.7 + k * 0.5, r: t * 0.5, a: 0.7 * (1 - seg(t, 8.3, 9.6)) + 0.2, add: 1 });
        aura(cx, y, s, '#e8f4ff', 4 + bt * 4, 0.4 + bt * 0.3); spr(cx, y, s);
        /* Vannet som sprenges ut, og fjær som daler. */
        for (let i = 0; i < 70; i++) { const ph = seg(t, 8.3, 8.3 + 0.7 + rnd(i, 21) * 0.9), an = rnd(i, 22) * TAU, r = eo(ph) * (120 + rnd(i, 23) * 260); if (ph < 1) rect(fx + cos(an) * r, 180 + sin(an) * r * 0.8 + ph * ph * 120, 4, 4 + rnd(i, 24) * 8, '#e8f8ff', 1 - ph, 1); }
        dust('leaf', { n: 26, seed: 6, cols: ['#fff', '#d8e8ff', '#bfd0f0'], a: seg(t, 8.6, 9.2), spd: 1.6, size: 1.3, wind: 0.5 });
        wave(8.3, cx, 180, { col: '#fff', r: 560, d: 0.9, w: 18 }); wave(8.6, cx, 180, { col: '#9fd0ff', r: 560, d: 1 }); card(9.2, { col: '#9fc8ff' }); }
      vig(0.55, '#000614');
      P.sh = hit(t, 8.3, 1.1) * 14 + bt * 2 + (fin ? 0 : seg(t, 7.4, 8.3) * 4); P.fl = max(hit(t, 8.3, 0.45), seg(t, 11.15, 11.4), 1 - seg(t, 3.2, 3.5)) ; P.fc = t < 4 ? '#02122e' : '#f0f8ff'; P.z = 1 + hit(t, 8.3, 0.4) * 0.12; P.zy = 190;
    },
    air(t, k) { fill('#04163a', 0.2 * k); falls(t, 256, 560, -20, 400, 0.14 * k, 0); strip('fog', 300, t * 26, { s: 1.3, a: 0.55 * k }); dust('leaf', { n: 12, seed: 6, cols: ['#fff', '#d8e8ff'], a: 0.7 * k, spd: 1.2, wind: 0.5 }); dust('mote', { n: 30, seed: 8, cols: ['#bfe8ff', '#fff'], a: 0.6 * k }); vig(0.4 * k, '#000614'); }
  });

  /* ================= HO-OH =================
     Låta åpner på 0.31 og løfter seg på 9.10 (så 10.25 og 12.40).
     Filmen: Bell Tower i Ecruteak, med skjermene malt med fuglen. Lønneblader driver forbi. Skyvedørene glir opp mot kveldssola, pagoden står svart mot himmelen,
     og regnbuen tegner seg over den. Så stiger den ned i ild, foran en sol av røde og gylne stråler. */
  const RAINB = ['#ff4a4a', '#ff9a3a', '#ffe14a', '#5ad85a', '#4aa8ff', '#5a5aff', '#b05aff'];
  /* En pagode i svart: fem tak som blir smalere oppover. */
  const pagoda = (x, y, s, col) => { for (let i = 0; i < 5; i++) { const w = (92 - i * 14) * s, yy = y - i * 44 * s, h = 14 * s; poly([[x - w, yy], [x - w * 1.12, yy + h * 0.2], [x - w * 0.8, yy - h], [x + w * 0.8, yy - h], [x + w * 1.12, yy + h * 0.2], [x + w, yy]], col); rect(x - w * 0.62, yy, w * 1.24, 32 * s, col); } rect(x - 2 * s, y - 5 * 44 * s - 40 * s, 4 * s, 50 * s, col); };
  film(250, { len: 12.6, R: 9.1, use: ['loc_tintower', 'sun', 'rainbow', 'shine2', 'sparkle', 'curtain1', 'curtain2', 'burst', 'goldpart', 'ring', 'skydawn'],
    cues: [[0.31, 'bell'], [3.4, 'bell'], [5.3, 'bell'], [7.2, 'bell'], [9.1, 'boom'], [9.1, 'cry'], [10.25, 'thud']],
    draw(t, P, c) {
      const cx = 256, fin = t >= 9.1, bt = hits(t, [9.1, 10.25, 11.58], 0.5), open = io(seg(t, 3.4, 6.2)), z = 1.04 + seg(t, 0.3, 9.1) * 0.22;
      if (!fin) P.bars = 1; if (t < 0.31) return;
      if (!fin) {
        /* Det som er utenfor: kveldshimmel, sol, pagode og regnbue. */
        if (open > 0) { lin(['#3a0a2a', '#c8301a', '#ff8a2a', '#ffd070']); im('skydawn', 256, 250, { s: 1.5, a: 0.6 }); const sy = 250 - seg(t, 3.4, 9.1) * 70; glow(cx, sy, 230, '#ffe9a8', 0.8, 1); im('sun', cx, sy, { s: 4.2, px: 1 }) || glow(cx, sy, 90, '#fff', 1, 1);
          const X = K.g, rk = seg(t, 4.6, 8.6); X.save(); X.globalAlpha = 0.85; X.lineWidth = 7; RAINB.forEach((col, i) => { X.strokeStyle = col; X.beginPath(); X.arc(cx, 330, 250 - i * 7, PI, PI + PI * rk); X.stroke(); }); X.restore();
          pagoda(cx, 330, 0.8, '#1a0608'); poly([[0, 330], [W, 322], [W, H], [0, H]], '#12040a');
          dust('spark', { n: 30, seed: 4, cols: ['#fff', '#ffe9a8'], a: seg(t, 7.6, 9.1), size: 2 }); fill('#fff6d8', seg(t, 8.5, 9.1) * 0.6); }
        /* Rommet, med skyvedørene som glir fra hverandre. */
        const X = K.g, hall = () => { cover('loc_tintower', { z }) || lin(['#3a2a1a', '#6a5a3a']); }, dx = open * 150 * z;
        if (open <= 0) hall(); else { for (const sg of [-1, 1]) { X.save(); X.beginPath(); X.rect(sg < 0 ? 0 : cx + dx, 0, cx - dx, H); X.clip(); X.translate(sg * dx, 0); hall(); X.restore(); } rect(cx - dx - 4, 0, 8, H, '#1a0e08', 1); rect(cx + dx - 4, 0, 8, H, '#1a0e08', 1); }
        fill('#2a0e00', 0.34 - 0.06 * sin(t * 9) * sin(t * 2.3)); glow(cx, 330, 360, '#ff9a3a', 0.2 + open * 0.2, 1);
        [0.31, 3.4, 5.3, 7.2].forEach(q => wave(q, cx, 190, { col: '#ffe08a', r: 300, d: 1.6, w: 3, a: 0.6 }));
        dust('leaf', { n: 30, seed: 5, cols: ['#e8401a', '#ff7a2a', '#c8301a', '#ffb040'], a: 0.95, spd: 1.2, size: 1.2, wind: 1 }); dust('mote', { n: 30, seed: 7, cols: ['#ffe08a'], a: 0.7 });
        vig(0.6, '#0a0200'); P.z = 1; P.sh = seg(t, 8.4, 9.1) * 4; return;
      }
      /* Den stiger ned. */
      const k = seg(t, 9.1, 9.75), y = mix(-110, 178, eo(k)) + sin(t * 1.5) * 5, s = 3.0;
      lin(['#5a0a14', '#a8201a', '#e0601a', '#f8b040']); im('skydawn', 256, 300, { s: 1.6, a: 0.5 });
      /* Sola bak den, gylne skyer, pagoden langt der nede og regnbuen som åpner seg. */
      rays(cx, 180, { n: 28, rot: t * 0.06, col: '#ffe9a8', a: 0.22 + bt * 0.12, r1: 560, wid: 0.3 }); glow(cx, 180, 330, '#ffd070', 0.55, 1);
      { const X = K.g; X.save(); X.fillStyle = '#ffe08a'; X.globalAlpha = 0.9; X.beginPath(); X.arc(cx, 180, 128 + bt * 6, 0, TAU); X.fill(); X.fillStyle = '#fff2c0'; X.beginPath(); X.arc(cx, 180, 112 + bt * 6, 0, TAU); X.fill(); X.restore(); }
      for (let i = 0; i < 6; i++) { const x = ((rnd(i, 3) * 760 + t * 12 * (0.5 + rnd(i, 4))) % 760) - 120, yy = 50 + rnd(i, 5) * 250, w = 60 + rnd(i, 6) * 50; for (let j = 0; j < 4; j++) { const X = K.g; X.save(); X.fillStyle = j % 2 ? '#ffd070' : '#f8b040'; X.globalAlpha = 0.85; X.beginPath(); X.ellipse(x + (j - 1.5) * w * 0.42, yy - (j % 2) * 8, w * 0.36, 13, 0, 0, TAU); X.fill(); X.restore(); } rect(x - w * 0.95, yy + 6, w * 1.9, 3, '#ffe9a8', 0.9); }
      pagoda(92, 372, 0.42, '#3a0a10'); pagoda(430, 380, 0.3, '#3a0a10');
      im('rainbow', cx, 180, { s: 0.8 + eo(seg(t, 9.1, 10.4)) * 0.75, a: 0.9, add: 1, r: t * 0.1 }) || ring(cx, 180, 200, { col: '#ffe14a', w: 8 });
      flames(t, 0.5, 0.9, ['#ff5a14', '#ffb040']); glow(cx, y, 220, '#ffb040', 0.5 + bt * 0.2, 1);
      aura(cx, y, s, '#ffe9a8', 4 + bt * 4, 0.45 + bt * 0.3); spr(cx, y, s);
      dust('leaf', { n: 30, seed: 9, cols: RAINB, a: 0.9, spd: 1.4, size: 1.2, wind: 0.6 }); dust('ember', { n: 70, seed: 4, cols: ['#ffd070', '#fff', '#ff7a2a'], a: 1, spd: 2 });
      wave(9.1, cx, 180, { col: '#fff', r: 560, d: 0.9, w: 18 }); wave(10.25, cx, 180, { col: '#ffe08a', r: 560, d: 0.9 }); card(10.25, { col: '#ffb23a' });
      vig(0.4, '#2a0200'); P.sh = hit(t, 9.1, 1.1) * 14 + bt * 3; P.fl = max(hit(t, 9.1, 0.5), hit(t, 10.25, 0.2) * 0.5, seg(t, 12.35, 12.6)); P.fc = '#fff6e0'; P.z = 1 + hit(t, 9.1, 0.4) * 0.12; P.zy = 180;
    },
    air(t, k) { rays(256, -60, { n: 14, rot: t * 0.05, col: '#ffd070', a: 0.14 * k, r1: 540, wid: 0.4 }); flames(t, 0.18, 0.4 * k, ['#ff6a1a', '#ffb040']); dust('leaf', { n: 18, seed: 9, cols: RAINB, a: 0.8 * k, spd: 1.1, wind: 0.6 }); dust('ember', { n: 34, seed: 4, cols: ['#ffd070', '#fff', '#ff7a2a'], a: 0.85 * k, spd: 1.3 }); vig(0.35 * k, '#2a0400'); }
  });

  /* ================= DEOXYS =================
     Tre slag (0.23, 1.16, 2.09) og utbruddet på 3.91. Neste tunge slag er 9.10, og da starter kampen.
     Filmen: nordlys over en mørk himmel, og trekanten fra Birth Island. Den flytter seg for hvert slag, større og rødere. En meteor faller.
     Så sprekker trekanten, og den står der – og skifter form fire ganger før den faller til ro. */
  const DX = [0.23, 1.16, 2.09], DF = [[386, 3.91], [10001, 4.9], [10002, 5.55], [10003, 6.2], [386, 6.85]], DTP = [[256, 190, 34], [150, 150, 52], [372, 210, 74], [256, 184, 120]];
  const tri = (x, y, r, red, a, rot) => { const X = K.g, p = [0, 1, 2].map(i => [x + cos(-PI / 2 + i * TAU / 3 + (rot || 0)) * r, y + sin(-PI / 2 + i * TAU / 3 + (rot || 0)) * r]); glow(x, y, r * 2.2, blend('#3a0a5a', '#ff2030', red), 0.5 * a, 1); poly(p, blend('#06030c', '#c0101c', red), a); X.save(); X.globalAlpha = c01(a); X.strokeStyle = blend('#8a5aff', '#ffb0a0', red); X.lineWidth = 3; X.lineJoin = 'round'; X.beginPath(); p.forEach((q, i) => i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1])); X.closePath(); X.stroke(); X.restore(); };
  const aurora = (t, a) => { for (const [n, col, y, sp] of [['curtainblue', '#40ffb0', 150, 0.3], ['curtain1', '#b060ff', 120, -0.22], ['curtain2', '#40d0ff', 100, 0.15]]) { const k = mulArt(n, col); if (k) { K.g.save(); K.g.translate(256, y); K.g.scale(1, -1); im(k, sin(t * sp) * 40, 0, { s: 1.25, sy: 0.75, a: a * 0.5, add: 1 }); K.g.restore(); } else glow(256 + sin(t * sp) * 60, y - 60, 260, col, a * 0.2, 1); } };
  /* DNA: to tråder av prikker som snor seg rundt hverandre. */
  const helix = (t, x, a) => { for (let i = 0; i < 26; i++) { const y = i * 16 - 10, ph = i * 0.42 + t * 2.2, dx = sin(ph) * 22, z = cos(ph); rect(x + dx - 3, y, 6, 6, z > 0 ? '#ff7a4a' : '#40d0c0', a * (0.5 + 0.5 * abs(z)), 1); rect(x - dx - 3, y, 6, 6, z > 0 ? '#40d0c0' : '#ff7a4a', a * (0.5 + 0.5 * abs(z)), 1); if (i % 2 === 0) rect(x - abs(dx), y + 2, abs(dx) * 2, 2, '#c8b8ff', a * 0.3, 1); } };
  film(386, { len: 9.35, R: 3.91, sps: [10001, 10002, 10003], use: ['space', 'curtain1', 'curtain2', 'curtainblue', 'sparkle', 'ring', 'burst', 'polyring', 'purpglow', 'shinesoft'],
    cues: [[0.23, 'thud'], [1.16, 'thud'], [2.09, 'boom'], [3.91, 'boom'], [3.91, 'cry'], [4.9, 'tick'], [5.55, 'tick'], [6.2, 'tick'], [6.85, 'thud']],
    draw(t, P, c) {
      const cx = 256, cy = 180, fin = t >= 3.91, n = DX.filter(q => t >= q).length, bt = hits(t, DF.map(q => q[1]), 0.4);
      if (!fin) P.bars = 1; if (t < 0.23) return;
      im('space', 256, 192) || lin(['#02030c', '#0a1238', '#02030c']); stars({ n: 130, seed: 5, a: 0.9, cols: ['#fff', '#c8b8ff', '#9fe0ff'] }); aurora(t, 0.9 + bt * 0.3);
      helix(t, 86, 0.75); helix(t + 2, 426, 0.75);
      /* Meteoren. */
      const mk = seg(t, 0.6, 2.09); if (mk > 0 && mk < 1) { const mx = mix(540, 330, mk), my = mix(-30, 330, mk); for (let j = 0; j < 9; j++) glow(mx + j * 9, my - j * 15, 16 - j * 1.4, j ? '#ff9a5a' : '#fff', 0.9 - j * 0.09, 1); } if (t >= 2.09) glow(330, 340, 120 * hit(t, 2.09, 1.4) + 40, '#ff7a3a', 0.5 * hit(t, 2.09, 2.5), 1);
      poly([[0, 330], [140, 318], [330, 328], [W, 312], [W, H], [0, H]], '#03020a');
      if (!fin) { /* Trekanten: den flytter seg for hvert slag. */
        const q = DTP[min(3, t >= 3.0 ? 3 : max(0, n - 1))], pq = DTP[max(0, min(3, t >= 3.0 ? 2 : n - 2))], last = t >= 3.0 ? 3.0 : DX[max(0, n - 1)], k = eo(seg(t, last, last + 0.16)), red = c01((t >= 3.0 ? 0.75 + seg(t, 3.0, 3.9) * 0.25 : (n - 1) * 0.3)), pul = t >= 3.0 ? sin(t * 26) * 0.5 + 0.5 : 0;
        for (let j = 1; j <= 3; j++) tri(mix(pq[0], q[0], k - j * 0.12), mix(pq[1], q[1], k - j * 0.12), mix(pq[2], q[2], k), red, (1 - k) * 0.25);
        tri(mix(pq[0], q[0], k), mix(pq[1], q[1], k), mix(pq[2], q[2], k) * (1 + pul * 0.06), red, 1); if (t >= 3.0) { const tp = [0, 1, 2].map(i => [q[0] + cos(-PI / 2 + i * TAU / 3) * q[2], q[1] + sin(-PI / 2 + i * TAU / 3) * q[2]]); for (let i = 0; i < floor(seg(t, 3.0, 3.9) * 6); i++) bolt(q[0], q[1], tp[i % 3][0] * 0.8 + q[0] * 0.2, tp[i % 3][1] * 0.8 + q[1] * 0.2, { seed: i + 2, col: '#ff6a5a', core: '#fff', w: 1.6, jag: 0.4, depth: 3 }); }
        DX.forEach((qq, i) => wave(qq, DTP[i][0], DTP[i][1], { col: '#b060ff', r: 300, d: 0.9, w: 4 }));
      } else {
        /* Den skifter form. Hvert skifte er et klipp, ikke en glidning. */
        const f = DF.filter(q => t >= q[1]).pop(), id = f[0], y = cy + sin(t * 1.7) * 5, s = 3.0, sw = hit(t, f[1], 0.22);
        rays(cx, cy, { n: 3, rot: -PI / 2 + t * 0.4, col: '#ff7a4a', a: 0.3 + bt * 0.2, r1: 480, wid: 0.22 }); rays(cx, cy, { n: 3, rot: PI / 2 - t * 0.3, col: '#40d0c0', a: 0.25, r1: 480, wid: 0.16 });
        im('polyring', cx, y, { s: 1.5 + sin(t * 2) * 0.05, r: t * 0.6, a: 0.7, add: 1 }); im('polyring', cx, y, { s: 2.3, r: -t * 0.4, a: 0.35, add: 1 }); glow(cx, y, 210, '#b060ff', 0.4 + bt * 0.25, 1);
        aura(cx, y, s, id === 386 ? '#ffb0a0' : '#9fe0ff', 4 + bt * 4, 0.4 + bt * 0.3, { id: id === 386 ? 0 : id }); spr(cx + sw * 14 * sin(t * 90), y, s, id === 386 ? {} : { id }); if (sw > 0) spr(cx, y, s * (1 + sw * 0.3), id === 386 ? { col: '#fff', a: sw * 0.8, add: 1 } : { id, col: '#fff', a: sw * 0.8, add: 1 });
        glow(cx, y - 4, 22 + sin(t * 8) * 4, '#c080ff', 0.9, 1);
        dust('spark', { n: 40, seed: 5, cols: ['#fff', '#ff9a7a', '#40d0c0'], a: 0.9, size: 2 });
        if (t < 4.8) { const pts = DTP[3]; for (let i = 0; i < 3; i++) { const an = -PI / 2 + i * TAU / 3 + PI / 3, d = eo(seg(t, 3.91, 4.7)) * 320; tri(pts[0] + cos(an) * d, pts[1] + sin(an) * d, 60 * (1 - seg(t, 3.91, 4.7) * 0.5), 1, 1 - seg(t, 3.91, 4.7), d * 0.01 * (i % 2 ? 1 : -1)); } im('burst', cx, cy, { s: 0.5 + seg(t, 3.91, 4.6) * 1.4, a: 1 - seg(t, 3.91, 4.6), add: 1 }); }
        wave(3.91, cx, cy, { col: '#fff', r: 560, d: 0.8, w: 18 }); DF.slice(1).forEach(q => wave(q[1], cx, cy, { col: q[0] === 386 ? '#ffb0a0' : '#9fe0ff', r: 420, d: 0.6, w: 6 })); card(7.0, { col: '#ff7a4a', cap: 'Mythical Pokémon' });
      }
      vig(0.5, '#02020c');
      P.sh = hits(t, DX, 0.3) * 6 + hit(t, 2.09, 0.5) * 7 + seg(t, 3.0, 3.9) * 5 * (fin ? 0 : 1) + hit(t, 3.91, 1) * 15 + bt * 5; P.fl = max(hit(t, 2.09, 0.2) * 0.5, hit(t, 3.91, 0.45), hits(t, DF.slice(1).map(q => q[1]), 0.1) * 0.45, seg(t, 9.1, 9.35)); P.fc = '#f4ecff'; P.rgb = hit(t, 3.91, 0.6) * 9 + bt * 7; P.gl = bt * 0.5; P.z = 1 + hit(t, 3.91, 0.4) * 0.14; P.zy = cy;
    },
    air(t, k) { aurora(t, 0.7 * k); helix(t, 30, 0.4 * k); helix(t + 2, 482, 0.4 * k); tri(378, 150, 100 + sin(t * 2) * 5, 0.5 + 0.3 * sin(t), 0.1 * k, t * 0.2); dust('spark', { n: 26, seed: 5, cols: ['#fff', '#ff9a7a', '#40d0c0'], a: 0.8 * k }); vig(0.4 * k, '#04020f'); }
  });

  /* ================= DARKRAI =================
     Samme låt som Giratina, men filmen starter 5.4 sekunder inn: da kommer de tre slagene på 3.86, 4.2 og 4.51, og utbruddet på 4.69.
     Roligere enn Giratina, men uhyggelig: månen formørkes, svart tåke kryper inn, ett øye åpner seg. Så det svarte tomrommet. */
  film(491, { len: 8.85, at: 5.4, R: 4.69, outc: '#000', use: ['smoke', 'darkfog', 'splat0', 'splat1', 'splat2', 'purpglow', 'ring', 'vortex', 'darkring', 'swirl', 'skynight'],
    cues: [[3.86, 'thud'], [4.2, 'thud'], [4.51, 'thud'], [4.69, 'boom'], [4.69, 'cry'], [5.99, 'thud']],
    draw(t, P, c) {
      const cx = 256, fin = t >= 4.69, pk = hits(t, [3.86, 4.2, 4.51], 0.24), bt = hits(t, [4.69, 5.34, 5.99, 6.64, 7.3, 7.95], 0.4), ecl = io(seg(t, 0.4, 3.7)), mx = 256, my = 120;
      if (!fin) P.bars = 1;
      lin(fin ? ['#0a0010', '#2a0418', '#3a0620', '#06000a'] : ['#02030c', '#0a1026', '#141a36', '#03040a']); stars({ n: 90, seed: 4, a: 0.8 * (1 - ecl * 0.6), cols: ['#fff', '#c8d0ff'] });
      /* Månen, og skyggen som glir over den. */
      const mr = fin ? 96 : 66; glow(mx, my, mr * 3.2, fin ? '#ff2a5a' : '#c8d8ff', fin ? 0.5 + bt * 0.2 : 0.5 * (1 - ecl * 0.7) + pk * 0.4, 1);
      { const X = K.g; X.save(); X.fillStyle = fin ? '#ff5a7a' : '#eef2ff'; X.beginPath(); X.arc(mx, my, mr, 0, TAU); X.fill(); X.fillStyle = fin ? '#e03a5a' : '#c8d0e8'; for (const [dx, dy, r] of [[-0.3, -0.2, 0.2], [0.25, 0.3, 0.26], [0.3, -0.35, 0.12]]) { X.beginPath(); X.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU); X.fill(); } X.fillStyle = '#020208'; if (!fin) { X.beginPath(); X.arc(mx + (1 - ecl) * mr * 2.1, my, mr * 1.02, 0, TAU); X.fill(); } X.restore(); if (!fin && ecl > 0.9) ring(mx, my, mr * 1.04 + pk * 10, { col: '#c8d8ff', w: 2 + pk * 5, a: 0.7 + pk * 0.3 }); }
      poly([[0, 300], [90, 280], [200, 296], [330, 276], [430, 292], [W, 278], [W, H], [0, H]], '#020106');
      if (!fin) { /* Svart tåke, og øyet. */
        fill('#02020a', 0.3 * ecl); strip('darkfog', 270, t * 14, { a: 0.6 * seg(t, 0.3, 3) }); for (let i = 0; i < 5; i++) im('splat' + (i % 3), 60 + i * 100 + sin(t + i) * 10, 320 + cos(t * 0.7 + i) * 10, { s: 1.6 + seg(t, 1, 4) * 1.2, a: 0.8 * seg(t, 1, 3.4), r: i });
        const a = seg(t, 2.6, 3.4); spr(cx, 206, 2.7, { col: '#030208', a }); if (c.sp) eye(cx + 0.02 * c.sp.bw * 2.7, 206 - 0.2 * c.sp.bh * 2.7, 13 + pk * 5, eo(seg(t, 3.0, 3.6)), 0, '#40e8ff', '#e8ffff');
        fill('#000', seg(t, 4.56, 4.66)); vig(0.75, '#000'); P.sh = pk * 6; P.z = 1 + seg(t, 0.3, 4.6) * 0.12 + pk * 0.03; P.zy = 180; P.rgb = pk * 4; return;
      }
      /* Det svarte tomrommet. */
      const y = 190 + sin(t * 1.4) * 5, s = 3.0;
      im('vortex', cx, 190, { s: 1.3, r: -t * 0.3, a: 0.5, add: 'screen' }); for (let i = 0; i < 6; i++) { const ph = (t * 0.45 + i / 6) % 1, an = i * 1.9, r = ph * 330; im('darkring', cx + cos(an) * r, 190 + sin(an) * r * 0.7, { s: 0.3 + ph * 1.3, a: sin(ph * PI) * 0.95 }) || glow(cx + cos(an) * r, 190 + sin(an) * r * 0.7, 40 + ph * 110, '#000', sin(ph * PI) * 0.9); ring(cx + cos(an) * r, 190 + sin(an) * r * 0.7, 30 + ph * 124, { col: '#b03060', w: 2, a: sin(ph * PI) * 0.6 }); }
      strip('darkfog', 268, t * 18, { a: 0.6 }); fog('smoke', { n: 7, seed: 5, a: 0.6, spd: 18, s: 2.1, y0: 220, y1: 380, col: '#06040c' });
      glow(cx, y, 200, '#b03060', 0.35 + bt * 0.2, 1); aura(cx, y, s, '#ff5a8a', 4 + bt * 3, 0.3 + bt * 0.3); spr(cx, y, s);
      dust('ember', { n: 30, seed: 6, cols: ['#fff', '#e8e0f0'], a: 0.6, spd: 1.6, y0: 0, y1: 150 }); dust('ember', { n: 40, seed: 3, cols: ['#ff5a8a', '#b03060'], a: 0.8, spd: 1.2 });
      wave(4.69, cx, 190, { col: '#ff5a8a', r: 560, d: 0.9, w: 16 }); vig(0.6 + bt * 0.2, '#0a0008'); card(5.99, { col: '#ff4a7a', cap: 'Mythical Pokémon' });
      P.sh = hit(t, 4.69, 0.9) * 11 + bt * 2; P.fl = max(hit(t, 4.69, 0.3) * 0.8, 0); P.fc = '#ff3a6a'; P.rgb = hit(t, 4.69, 0.6) * 6; P.gl = hit(t, 4.69, 0.4) * 0.5; P.fade = seg(t, 8.6, 8.85); P.z = 1 + hit(t, 4.69, 0.4) * 0.12; P.zy = 190;
    },
    air(t, k) { fill('#0a0010', 0.3 * k); fog('', { n: 7, seed: 3, a: 0.85 * k, spd: 14, s: 1.5, y0: 300, y1: 400, col: '#07030c' }); for (let i = 0; i < 3; i++) { const ph = (t * 0.3 + i / 3) % 1, an = i * 2.1 + floor(t * 0.3 + i / 3) * 1.3; ring(378 + cos(an) * ph * 200, 132 + sin(an) * ph * 120, 20 + ph * 70, { col: '#b03060', w: 2, a: sin(ph * PI) * 0.5 * k }); } dust('ember', { n: 34, seed: 3, cols: ['#ff5a8a', '#b03060', '#fff'], a: 0.7 * k, spd: 1 }); vig(0.5 * k, '#0a0008'); }
  });

  /* ================= DE ANDRE =================
     Trioene og de mindre legendariske får roligere filmer, så de store beholder tyngden: et sted (bildene fra HeartGold og SoulSilver), stemningen der,
     skikkelsen som viser seg på sin egen måte, og så navnet. Alle følger samme løp: den viser seg på R (rundt 4.5 sekunder), lagt på et slag i låta.
     Hver rad: sted, mørkning (farge og styrke), stemning, måten den kommer på, hvor i låta filmen starter, og når den viser seg. */
  const TR = { Raikou: [0, 4.16], Lugia: [8.3, 4.6], 'Ho-oh': [4.6, 4.5], Mewtwo: [5.1, 4.47], Heatran: [2.2, 4.49], Rayquaza: [0.9, 4.34], Deoxys: [0, 3.91], Uxie: [1.0, 4.49], Entei: [0.3, 4.61], Reshiram: [1.9, 4.49], Cobalion: [1.4, 4.43] };
  const CALM = {
    144: ['loc_icepath', '#04122a', 0.35, 'ice', 'fall', 'Ho-oh'], 145: ['', '#000', 0, 'bolt', 'fall', 'Ho-oh'], 146: ['loc_mortar', '#2a0600', 0.3, 'fire', 'fall', 'Ho-oh'], 151: ['loc_ilexday', '#1a0a2a', 0.25, 'dream', 'orbit', 'Mewtwo'],
    243: ['loc_burned', '#0a0a04', 0.25, 'bolt', 'dash', 'Entei'], 244: ['loc_burned', '#1a0400', 0.25, 'fire', 'dash', 'Entei'], 245: ['loc_tohjo', '#041a2a', 0.35, 'water', 'dash', 'Entei'], 251: ['loc_ilex', '#000', 0, 'forest', 'orbit', 'Ho-oh'],
    377: ['loc_alph', '#1a0e04', 0.3, 'regi', 'dots', 'Heatran'], 378: ['loc_icepath', '#04122a', 0.5, 'regi', 'dots', 'Heatran'], 379: ['loc_alph', '#0a0e14', 0.45, 'regi', 'dots', 'Heatran'], 486: ['loc_alph', '#14140a', 0.35, 'regi', 'dots', 'Heatran'],
    380: ['loc_dragonsden', '#0a1a3a', 0.3, 'wind', 'dash', 'Rayquaza'], 381: ['loc_dragonsden', '#0a1a3a', 0.3, 'wind', 'dash', 'Rayquaza'], 385: ['', '#000', 0, 'star', 'fall', 'Deoxys'],
    480: ['loc_mortar', '#1a1400', 0.3, 'lake', 'orbit', 'Uxie'], 481: ['loc_mortar', '#2a0618', 0.3, 'lake', 'orbit', 'Uxie'], 482: ['loc_mortar', '#04102a', 0.3, 'lake', 'orbit', 'Uxie'],
    485: ['loc_darkcave', '#3a0800', 0.35, 'fire', 'rise', 'Heatran'], 488: ['loc_national', '#0a0a2a', 0.3, 'moon', 'fall', 'Uxie'], 490: ['loc_whirl', '#041a3a', 0.35, 'water', 'orbit', 'Uxie'], 492: ['loc_ilexday', '#000', 0, 'petal', 'rise', 'Uxie'],
    494: ['loc_victory', '#2a0a00', 0.3, 'fire', 'orbit', 'Reshiram'], 638: ['loc_victory', '#0a1420', 0.3, 'steel', 'dash', 'Cobalion'], 639: ['loc_union', '#1a1004', 0.25, 'rock', 'dash', 'Cobalion'], 640: ['loc_ilexday', '#04140a', 0.15, 'forest', 'dash', 'Cobalion'], 647: ['loc_tohjo', '#041a2a', 0.25, 'water', 'dash', 'Cobalion'],
    641: ['', '#000', 0, 'wind', 'fall', 'Reshiram'], 642: ['', '#000', 0, 'bolt', 'fall', 'Reshiram'], 645: ['loc_mortar', '#1a0e00', 0.3, 'rock', 'fall', 'Reshiram'], 648: ['loc_national', '#0a1a0a', 0.2, 'music', 'orbit', 'Reshiram'], 649: ['', '#000', 0, 'tech', 'rise', 'Reshiram']
  };
  /* Stemningene: det som er i lufta på stedet. t = tiden, k = styrken, cc = fargen til den legendariske. */
  const MOOD = {
    ice: (t, k) => { strip('fog', 280, t * 24, { s: 1.3, a: 0.5 * k }); frost(0.5, 0.5 * k); dust('snow', { n: 90, seed: 3, cols: ['#fff', '#d8f4ff'], a: 0.85 * k, spd: 2.2, wind: -0.8 }); },
    bolt: (t, k, cc) => { const q = floor(t * 1.7), ph = (t * 1.7) % 1; if (ph < 0.3 && rnd(q, 8) > 0.25) { bolt(rnd(q, 1) * W, -10, rnd(q, 2) * W, 150 + rnd(q, 3) * 160, { seed: q * 3 + floor(ph * 10), col: cc, core: '#fff', w: 2.2, a: (1 - ph / 0.3) * k, br: 2 }); fill(cc, (0.3 - ph) * 0.3 * k); } dust('spark', { n: 30, seed: 4, cols: [cc, '#fff'], a: 0.9 * k, spd: 2 }); },
    fire: (t, k) => { flames(t, 0.2, 0.55 * k, ['#ff6a1a', '#ffb040']); dust('ember', { n: 50, seed: 4, cols: ['#ff7a2a', '#ffd070', '#fff'], a: 0.9 * k, spd: 1.5 }); },
    water: (t, k) => { strip('fog', 286, t * 22, { s: 1.3, a: 0.6 * k }); dust('bubble', { n: 20, seed: 3, cols: ['#bfe8ff'], a: 0.5 * k, spd: 0.8 }); dust('mote', { n: 40, seed: 8, cols: ['#bfe8ff', '#fff'], a: 0.7 * k }); for (let i = 0; i < 3; i++) wave(floor(t / 1.6 + i / 3) * 1.6 - i * 0.53, 90 + i * 170, 330, { col: '#bfe8ff', r: 90, d: 1.6, w: 2, a: 0.5 * k, sy: 0.3 }); },
    dream: (t, k, cc) => { dust('bubble', { n: 22, seed: 3, cols: [cc, '#fff'], a: 0.7 * k, spd: 0.7 }); dust('spark', { n: 36, seed: 6, cols: ['#fff', cc], a: 0.9 * k, size: 2 }); },
    forest: (t, k, cc) => { for (let i = 0; i < 4; i++) im(i % 2 ? 'lightA' : 'lightB', 90 + i * 110, -10, { s: 2.4, ay: 0, a: (0.12 + 0.05 * sin(t + i * 2)) * k, add: 1 }); dust('leaf', { n: 22, seed: 5, cols: ['#5ad85a', '#9be07a', '#3a9a4a'], a: 0.9 * k, spd: 1, wind: 0.8 }); dust('mote', { n: 46, seed: 8, cols: [cc, '#eaffd8'], a: 0.8 * k }); },
    petal: (t, k) => { for (let i = 0; i < 4; i++) im(i % 2 ? 'lightA' : 'lightB', 90 + i * 110, -10, { s: 2.4, ay: 0, a: 0.14 * k, add: 1 }); dust('leaf', { n: 34, seed: 5, cols: ['#ff9ac8', '#ffd0e4', '#fff'], a: 0.95 * k, spd: 1.1, wind: 0.9 }); dust('mote', { n: 30, seed: 8, cols: ['#fff', '#ffe0f0'], a: 0.7 * k }); },
    regi: (t, k) => { dust('ash', { n: 26, seed: 4, cols: ['#8a8070', '#5a5448'], a: 0.5 * k, spd: 1 }); dust('mote', { n: 20, seed: 8, cols: ['#fff2c0'], a: 0.5 * k }); },
    wind: (t, k) => { for (let i = 0; i < 3; i++) im('streaks', ((t * (500 + i * 160) + i * 300) % 1500) - 380, 70 + i * 110, { s: 1, a: 0.6 * k, add: 1 }); dust('mote', { n: 30, seed: 8, cols: ['#fff'], a: 0.6 * k }); },
    star: (t, k) => { stars({ n: 120, seed: 5, a: 0.9 * k, cols: ['#fff', '#ffe9a8', '#9fd0ff'] }); for (let i = 0; i < 3; i++) { const ph = ((t * 0.5 + i * 0.37) % 1), q = floor(t * 0.5 + i * 0.37), x = mix(560, -60, ph) + rnd(q, i) * 200 - 100, y = rnd(q, i + 3) * 160 + ph * 150; for (let j = 0; j < 8; j++) glow(x + j * 10, y - j * 6, 10 - j, j ? '#ffe9a8' : '#fff', (0.9 - j * 0.1) * sin(ph * PI) * k, 1); } },
    lake: (t, k, cc) => { for (let i = 0; i < 4; i++) im(i % 2 ? 'lightA' : 'lightB', 100 + i * 100, -10, { s: 2.4, ay: 0, a: (0.14 + 0.05 * sin(t + i * 2)) * k, add: 1 }); dust('mote', { n: 50, seed: 8, cols: [cc, '#fff'], a: 0.8 * k }); for (let i = 0; i < 3; i++) wave(floor(t / 1.8 + i / 3) * 1.8 - i * 0.6, 100 + i * 150, 330, { col: cc, r: 100, d: 1.8, w: 2, a: 0.5 * k, sy: 0.3 }); },
    moon: (t, k, cc) => { aurora(t, 0.7 * k); const X = K.g; glow(410, 70, 110, '#fff2c0', 0.5 * k, 1); X.save(); X.globalAlpha = c01(k); X.fillStyle = '#fff6d8'; X.beginPath(); X.arc(410, 70, 34, 0, TAU); X.clip(); X.beginPath(); X.arc(410, 70, 34, 0, TAU); X.arc(424, 62, 30, 0, TAU); X.fill('evenodd'); X.restore(); dust('spark', { n: 30, seed: 6, cols: ['#fff', cc], a: 0.8 * k, size: 2 }); },
    steel: (t, k, cc) => { dust('spark', { n: 40, seed: 6, cols: ['#fff', cc], a: 0.9 * k, size: 2, spd: 1.5 }); dust('ash', { n: 20, seed: 4, cols: ['#6a7480'], a: 0.4 * k, spd: 1 }); },
    rock: (t, k) => { dust('ash', { n: 50, seed: 4, cols: ['#8a7458', '#5a4a38', '#c8b088'], a: 0.7 * k, spd: 1.6, wind: 0.3 }); strip('fog', 300, t * 18, { s: 1.3, a: 0.35 * k }); },
    music: (t, k, cc) => { for (let i = 0; i < 12; i++) { const ph = (rnd(i, 3) + t * (0.12 + rnd(i, 4) * 0.1)) % 1, x = rnd(i, 5) * W + sin(t * 1.5 + i) * 18; txt(i % 3 ? '♪' : '♫', x, H - ph * (H + 30), { size: 30 + (i % 3) * 8, col: ['#9be07a', '#fff', '#ffb0d0'][i % 3], a: sin(ph * PI) * 0.9 * k, sh: 0 }); } dust('spark', { n: 24, seed: 6, cols: ['#fff', cc], a: 0.8 * k, size: 2 }); },
    tech: (t, k, cc) => { const X = K.g; X.save(); X.globalCompositeOperation = 'lighter'; X.strokeStyle = cc; X.globalAlpha = 0.25 * k; X.lineWidth = 1; for (let i = 0; i <= 16; i++) { X.beginPath(); X.moveTo(i * 32, 0); X.lineTo(i * 32, H); X.stroke(); X.beginPath(); X.moveTo(0, ((i * 32 + t * 30) % H)); X.lineTo(W, ((i * 32 + t * 30) % H)); X.stroke(); } X.restore(); rect(0, (t * 140) % H, W, 3, cc, 0.5 * k, 1); dust('spark', { n: 26, seed: 6, cols: ['#fff', cc], a: 0.8 * k, size: 2 }); }
  };
  /* Bakgrunnen når stedet ikke er et bilde: uvær, stjernehimmel eller maskinrom. */
  const calmBg = (m, t, cc) => { if (m === 'star') { im('space', 256, 192) || lin(['#02030c', '#0a1238', '#02030c']); glow(256, 300, 300, '#3a2a80', 0.3, 1); poly([[0, 330], [140, 318], [330, 328], [W, 312], [W, H], [0, H]], '#03020a'); } else if (m === 'tech') { im('digital', 256, 192, { s: 1.1 + sin(t) * 0.02 }) || lin(['#020a06', '#0a2a1a', '#020a06']); fill('#010604', 0.45); } else storm(t, 0.5, 0.25); };
  const REGD = { 377: [[-2, 0], [-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1], [2, 0]], 378: [[-1.5, -1], [-0.5, -1], [0.5, -1], [1.5, -1], [0, 0], [-1, 1], [1, 1]], 379: [[0, -1.2], [-1.2, -0.4], [1.2, -0.4], [0, 0], [-1.2, 0.8], [1.2, 0.8], [0, 1.4]], 486: [[-1.5, -0.6], [-1.5, 0.6], [0, -0.8], [0, 0.8], [1.5, -0.6], [1.5, 0.6], [0, 0]] };
  const mkCalm = (id, d) => {
    const [bg, tc, ta, mood, way, trk] = d, at = TR[trk][0], R = TR[trk][1], len = R + 3.1;
    return { len, at, R, use: [bg, 'fog', 'lightA', 'lightB', 'streaks', 'sparkle', 'ring', 'curtain1', 'curtain2', 'curtainblue', 'space', 'digital', 'em_cloudL', 'em_cloudR', 'smoke', 'shinesoft', 'brushring'].filter(Boolean), cues: [[R, 'cry'], [R, 'thud']],
      draw(t, P, c) {
        const cc = c.cc, cx = 256, cy = 184, fin = t >= R, bt = hits(t, [R, R + 0.9], 0.5), z = 1.03 + t * 0.014;
        if (!fin) P.bars = 1;
        if (bg) { cover(bg, { z, py: -0.2 }) || lin(['#0a0e18', '#1a2434', '#0a0e18']); fill(tc, ta + (fin ? 0.1 : 0.18)); } else calmBg(mood, t, cc);
        if (bg === 'loc_tohjo') falls(t, 268, 150 * z, 40, 268, 0.7, 0);
        MOOD[mood](t, fin ? 1 : 0.8, cc);
        if (!fin) {
          /* Den viser seg: som en skygge som farer forbi, stiger ned, eller står fram av lys. */
          const a = seg(t, 1.6, 2.6), s = 2.2 + seg(t, 1.6, R) * 0.4; let x = cx, y = cy;
          if (way === 'dash') { for (const [q, dir, yy] of [[0.9, 1, 230], [1.7, -1, 150]]) { const k = seg(t, q, q + 0.42); if (k > 0 && k < 1) for (let j = 0; j < 5; j++) spr(dir > 0 ? mix(-160, 680, k) - j * 34 : mix(680, -160, k) + j * 34, yy, 2.2, { col: j ? cc : '#04060c', a: j ? 0.25 : 0.9, flip: dir > 0, add: j ? 1 : 0 }); } }
          else if (way === 'fall') y = mix(-120, cy, eo(seg(t, 1.2, 2.8)));
          else if (way === 'orbit') { for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * 2.2, r = mix(170, 16, io(seg(t, 0.6, R))); glow(cx + cos(an) * r, cy + sin(an) * r * 0.6, 20, cc, 0.9, 1); im('sparkle', cx + cos(an) * r, cy + sin(an) * r * 0.6, { s: 0.3, a: 0.9, add: 1, r: t * 2 }); } }
          const sa = way === 'dash' ? seg(t, 2.3, 3.1) : way === 'fall' ? seg(t, 1.2, 1.8) : a;
          glow(x, y, 120 + sin(t * 3) * 8, cc, 0.3 * sa, 1); aura(x, y, s, cc, 3, 0.4 * sa * sa); spr(x, y, s, { col: '#04060c', a: c01(sa * 2.2) });
          if (way === 'dots' && REGD[id]) REGD[id].forEach((q, i) => { const on = seg(t, 1.9 + i * 0.3, 2.0 + i * 0.3); if (on > 0) { const dx = x + q[0] * 15, dy = y + q[1] * 15 - 6; glow(dx, dy, 14 + hit(t, 1.9 + i * 0.3, 0.3) * 14, cc, on, 1); rect(dx - 3, dy - 3, 6, 6, '#fff', on, 1); } });
          vig(0.6, '#02030a'); P.fade = 1 - seg(t, 0, 0.6); P.sh = seg(t, R - 0.5, R) * 3; return;
        }
        const y = cy + sin(t * 1.6) * 4, s = 2.9;
        rays(cx, cy, { n: 12, rot: t * 0.15, col: cc, a: 0.22 + bt * 0.15, r1: 460, wid: 0.3 }); glow(cx, y, 200, cc, 0.4 + bt * 0.2, 1); im('brushring', cx, y, { s: 0.6 + seg(t, R, R + 1) * 0.5, r: t * 0.4, a: 0.6 * (1 - seg(t, R, R + 1.4)), add: 1 });
        aura(cx, y, s, cc, 4 + bt * 3, 0.35 + bt * 0.3); spr(cx, y, s);
        wave(R, cx, cy, { col: '#fff', r: 520, d: 0.9, w: 14 }); wave(R + 0.9, cx, cy, { col: cc, r: 520, d: 0.9 }); card(R + 0.7, { col: cc });
        vig(0.5, '#02030a'); P.sh = hit(t, R, 0.8) * 9 + bt * 2; P.fl = max(hit(t, R, 0.4) * 0.9, seg(t, len - 0.25, len)); P.fc = '#fff'; P.z = 1 + hit(t, R, 0.4) * 0.08; P.zy = cy;
      },
      air(t, k, cc) { MOOD[mood](t, 0.75 * k, cc || K.cur.cc); vig(0.35 * k, '#02030a'); },
      /* Stedet i kampen: samme sted som i filmen, som bakvegg over horisonten, med et mørkere gulv foran (plattformene legges på i raidx.js). */
      bg(t, k, cc) { if (bg) { cover(bg, { z: 1.06, py: -0.25 }) || lin(['#0a0e18', '#1a2434', '#0a0e18']); fill(tc, ta + 0.08); if (bg === 'loc_tohjo') falls(t, 268, 159, 40, 268, 0.7, 0); } else calmBg(mood, t, cc || K.cur.cc); lin([[0, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,.62)']], 1, 146, 384); rect(0, 145, W, 2, '#000', 0.3); }
    };
  };
  const calmCache = {};
  CINE.calmFilm = id => CALM[id] ? (calmCache[id] || (calmCache[id] = mkCalm(id, CALM[id]))) : null;

  /* ================= KAMPENE MOT DE ALLER STØRSTE =================
     Klasse 9 har ingen film, men lufta i kampen er deres egen: en stemning som ligger over banen hele kampen. */
  film('s:Red', { use: ['fog', 'streaks', 'lightA', 'lightB', 'mountain', 'curtainblue', 'curtain1'], air(t, k) {   /* Toppen av Mt. Silver: snøstorm, vindkast og nordlys. */
    aurora(t, 0.55 * k); fill('#c8e0ff', 0.08 * k, 1); im('mountain', 256, 150, { s: 1.7, a: 0.35 * k, ay: 1 });
    for (let i = 0; i < 3; i++) im('streaks', ((t * (700 + i * 240) + i * 300) % 1700) - 480, 60 + i * 120, { s: 1.1, a: 0.5 * k, add: 1, flip: 1 });
    strip('fog', 290, -t * 60, { s: 1.4, a: 0.6 * k }); strip('fog', -30, -t * 44, { s: 1.6, a: 0.35 * k });
    dust('snow', { n: 190, seed: 3, cols: ['#fff', '#d8f0ff'], a: 0.9 * k, spd: 4.2, wind: -2.6 }); dust('snow', { n: 40, seed: 9, cols: ['#fff'], a: 0.9 * k, spd: 2, wind: -1.2, size: 2 }); vig(0.4 * k, '#0a1a30'); } });
  film('s:Blue', { use: ['lightA', 'lightB', 'sparkle', 'shine2', 'polyring'], air(t, k) {   /* Stadion: lyskastere som sveiper, blitzlys og konfetti. */
    for (let i = 0; i < 5; i++) { const x = 40 + i * 108, an = sin(t * (0.5 + i * 0.13) + i * 2) * 0.5; im(i % 2 ? 'lightA' : 'lightB', x, -20, { s: 3.4, ay: 0, a: (0.22 + 0.08 * sin(t * 2 + i)) * k, add: 1, r: an }) || beam(x + an * 180, 60, 0, H, '#bfe0ff', 0.2 * k); }
    for (let i = 0; i < 8; i++) { const q = floor(t * 3 + i * 0.37), ph = (t * 3 + i * 0.37) % 1; if (ph < 0.35) im('sparkle', rnd(q, i) * W, 10 + rnd(q, i + 9) * 110, { s: 0.35 + (0.35 - ph), a: (1 - ph / 0.35) * k, add: 1 }) || glow(rnd(q, i) * W, 10 + rnd(q, i + 9) * 110, 18, '#fff', (1 - ph / 0.35) * k, 1); }
    dust('leaf', { n: 46, seed: 5, cols: ['#5aa2ff', '#ffd45a', '#ff6a6a', '#fff', '#7ae08a'], a: 0.95 * k, spd: 1.5, size: 0.8, wind: 0.3 }); im('polyring', 378, 150, { s: 1.5 + sin(t * 2) * 0.05, r: t * 0.5, a: 0.4 * k, add: 1 }); vig(0.35 * k, '#02081a'); } });
  film('s:Cynthia', { use: ['sparkle'], air(t, k) {   /* Svart og gull: søyler av lys, gullstøv, og en glorie bak motstanderen. */
    fill('#060410', 0.34 * k); stars({ n: 60, seed: 7, a: 0.6 * k, cols: ['#fff', '#ffe9a8'] });
    for (let i = 0; i < 6; i++) { const x = 30 + i * 92 + sin(t * 0.3 + i) * 10, a = (0.16 + 0.12 * sin(t * 0.9 + i * 1.7)) * k; beam(x, 18 + (i % 3) * 8, 0, H, '#f8c830', a, '#fff6d0'); }
    ring(378, 150, 108 + sin(t * 1.5) * 3, { col: '#f8c830', a: 0.55 * k, w: 4 }); ring(378, 150, 122 + sin(t * 1.5) * 3, { col: '#fff6d0', a: 0.3 * k, w: 1.5 }); rays(378, 150, { n: 12, rot: t * 0.12, col: '#f8c830', a: 0.2 * k, r1: 320, wid: 0.3 }); glow(378, 150, 160, '#f8c830', 0.2 * k, 1);
    fog('', { n: 7, seed: 3, a: 0.8 * k, spd: 12, s: 1.5, y0: 310, y1: 400, col: '#06040c' }); dust('ember', { n: 60, seed: 4, cols: ['#f8c830', '#fff6d0', '#c98a12'], a: 0.9 * k, spd: 0.8 }); dust('spark', { n: 24, seed: 6, cols: ['#fff', '#ffe9a8'], a: 0.8 * k, size: 2 });
    wave(floor(t / 3.4) * 3.4, 378, 150, { col: '#f8c830', r: 340, d: 1.6, w: 4, a: 0.5 * k }); vig(0.5 * k, '#0a0600'); } });
  film('s:Iris', { use: ['rings', 'sparkle', 'purpglow', 'zstreak', 'arcs'], air(t, k) {   /* Dragenes hall: en virvel bak motstanderen, og meteorer som faller. */
    fill('#1a0630', 0.28 * k); im('rings', 378, 150, { s: 0.95 + sin(t) * 0.03, r: -t * 0.35, a: 0.5 * k, add: 1 }); im('arcs', 378, 150, { s: 0.75, r: t * 0.9, a: 0.5 * k, add: 1 });
    for (let i = 0; i < 6; i++) { const ph = (rnd(i, 3) + t * (0.22 + rnd(i, 4) * 0.2)) % 1, q = floor(rnd(i, 3) + t * (0.22 + rnd(i, 4) * 0.2)), x = mix(620, -80, ph) + rnd(q, i) * 200 - 100, y = mix(-60, 420, ph); for (let j = 0; j < 9; j++) glow(x + j * 9, y - j * 11, 13 - j, j ? (i % 2 ? '#c080ff' : '#ff8ad0') : '#fff', (0.9 - j * 0.09) * k, 1); }
    dust('spark', { n: 40, seed: 6, cols: ['#fff', '#c080ff', '#ff8ad0'], a: 0.9 * k, size: 2 }); dust('ember', { n: 40, seed: 4, cols: ['#c080ff', '#7038f8', '#ff8ad0'], a: 0.8 * k, spd: 1 }); vig(0.45 * k, '#0a0218'); } });
  film('s:Steven', { use: ['lightA', 'lightB', 'sparkle', 'polyring', 'shine2'], air(t, k) {   /* Krystallhula: lys som brytes, krystaller som glimter, og et drag av stål over banen. */
    fill('#04101c', 0.24 * k); for (let i = 0; i < 4; i++) im(i % 2 ? 'lightA' : 'lightB', 80 + i * 120, -10, { s: 2.8, ay: 0, a: (0.16 + 0.06 * sin(t + i * 2)) * k, add: 1 });
    for (let i = 0; i < 16; i++) { const x = rnd(i, 3) * W, y = 20 + rnd(i, 4) * 330, s = 6 + rnd(i, 5) * 12, a = (0.35 + 0.4 * sin(t * (1 + rnd(i, 6) * 2) + i)) * k; poly([[x, y - s * 1.8], [x + s * 0.7, y], [x, y + s * 1.8], [x - s * 0.7, y]], i % 2 ? '#9fc7d8' : '#d8f4ff', a * 0.6, 1); im('sparkle', x, y - s, { s: 0.2 + 0.1 * sin(t * 3 + i), a, add: 1 }); }
    const sw = (t * 0.22) % 1; K.g.save(); K.g.globalCompositeOperation = 'lighter'; K.g.globalAlpha = 0.14 * k; K.g.fillStyle = '#d8f4ff'; K.g.beginPath(); K.g.moveTo(sw * 900 - 200, 0); K.g.lineTo(sw * 900 - 120, 0); K.g.lineTo(sw * 900 - 320, H); K.g.lineTo(sw * 900 - 400, H); K.g.fill(); K.g.restore();
    im('polyring', 378, 150, { s: 1.4, r: t * 0.4, a: 0.45 * k, add: 1 }); dust('spark', { n: 40, seed: 6, cols: ['#fff', '#9fc7d8'], a: 0.9 * k, size: 2 }); vig(0.4 * k, '#02080f'); } });
  film('s:Colress', { use: ['digital', 'sparkle', 'polyring', 'darkarcs'], air(t, k) {   /* Laboratoriet: et nett av lys, måledata som ruller, og plasma som slår mellom polene. */
    fill('#02100c', 0.3 * k); MOOD.tech(t, 0.9 * k, '#40e8c0'); im('darkarcs', 378, 150, { s: 1.6, r: t * 2.4, a: 0.5 * k, add: 1 });
    const q = floor(t * 3), ph = (t * 3) % 1; for (let i = 0; i < 2; i++) if (rnd(q, i + 4) > 0.4) bolt(i ? 20 : 492, 60 + rnd(q, i) * 200, 378 + (rnd(q, i + 2) - 0.5) * 60, 150 + (rnd(q, i + 3) - 0.5) * 50, { seed: q * 5 + i + floor(ph * 4), col: '#4ad0ff', core: '#eaffff', w: 1.8, a: (1 - ph) * k, br: 2 });
    for (let i = 0; i < 5; i++) txt((floor(rnd(i, floor(t * 4)) * 0xffff)).toString(16).toUpperCase().padStart(4, '0') + '  ' + (rnd(i, floor(t * 2) + 9) * 100).toFixed(1), 80, 40 + i * 16, { size: 13, al: 'l', col: '#40e8c0', a: 0.5 * k, sh: 0 });
    vig(0.45 * k, '#010806'); } });
  /* Motivene deles med raidx.js (entréene, hendelsene i kampen og stedene). */
  CINE.M = { hits, island, tendril, eye, gWorld, wheel, pillar, aPlates, PLATE, storm, mRock, mLab, shard, DSH, blackSun, dVoid, sea, lava, clock, cog, grid, pScene, stone, flames, frost, falls, pagoda, tri, aurora, helix, MOOD, calmBg, REGD, CALM };
})();
