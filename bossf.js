'use strict';
/* Fokusdex – filmene til de to helt spesielle i ligaens finale, Ghetsis (Champions Edition) og Cynthia, og stedet kampen mot Ghetsis står på.
   Motoren og tegneverktøyene ligger i raid.js (CINE.kit), motivene i raidf.js (CINE.M) og stedsverktøyene i raidx.js (CINE.stage).
   Ingen av filmene viser Pokémonene: laget som møter (cur.team, i den rekkefølgen det sendes ut) er bare svarte skygger i bakgrunnen, uten navn og uten lyd.
   Filmene hinter i stedet til regionen de kommer fra: Unova (slottet som reiser seg, byen som fryser, dragen i lenker) og Sinnoh (fjellet, søylene, de tre sjøene).
   Alle tider er sekunder fra låta starter, lagt på slagene i musikken:
   Ghetsis (Black/White-låta): to paukeslag 0,60 og 1,56 (virvel til 1,88), stillhet til 4,36, så 95 slag i minuttet (ett slag 0,632 s, pauke på 1 og 3),
   oppbygging i takt 3 og 4 med markeringer på 10,05 · 11,31 · 12,58 · 13,84, og hovedtemaet fra 14,47.
   Cynthia (pianotemaet): tonene 0,26 · 0,86 · 1,46 · 1,76 · 2,07 · 2,35, og neste frase fra 6,8 s. Uten låt går filmene på sin egen klokke.
   Trenerbildet er det samme som ellers i appen; alt annet er tegnet med kode. Aldri mer enn tre store blink i sekundet. Med «redusert bevegelse» vises
   bare et stillbilde (se bossFilm i bui.js). */
(() => {
  if (typeof CINE === 'undefined' || !CINE.kit) return;
  const K = CINE.kit, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, pulse, io, eo, ei, back, rnd, rgba, blend, fill, lin, glow, spr, aura, bolt, rays, ring, wave, poly, rect, beam, stars, dust, fog, txt, vig, shatter, onAux, film } = K;
  const M = CINE.M || {}, ST = CINE.stage || null;
  const hits = (t, list, d) => list.reduce((m, q) => max(m, hit(t, q, d)), 0);
  /* Trenerbildet lastes som en figur i filmen ('tr:' + navnet): fra pakken når det finnes der, ellers samme adresse som resten av appen bruker. */
  const su = CINE.spriteUrl;
  CINE.spriteUrl = id => typeof id === 'string' && id.indexOf('tr:') === 0 ? ((typeof PACK !== 'undefined' && PACK.portrait(id.slice(3))) || `https://play.pokemonshowdown.com/sprites/trainers/${id.slice(3)}.png`) : su(id);
  /* Skrå fartsstriper over hele bildet. */
  const speed = (col, a, ang, seed, t) => { const X = K.g; X.save(); X.translate(W / 2, H / 2); X.rotate(ang); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const y = (rnd(i, seed) - 0.5) * 520, L = 120 + rnd(i, seed + 1) * 360, x = ((rnd(i, seed + 2) * 900 + t * (900 + rnd(i, seed + 3) * 900)) % 1100) - 550; X.globalAlpha = c01(a * (0.25 + rnd(i, seed + 4) * 0.6)); X.fillStyle = i % 3 ? col : '#fff'; X.fillRect(x, y, L, 1 + rnd(i, seed + 5) * 3); } X.restore(); };
  /* Isskår som vokser inn fra kantene. k = 0..1. */
  const frost = (k, col, a, seed) => { if (k <= 0 || a <= 0) return; for (let i = 0; i < 22; i++) { const side = i % 4, u = rnd(i, seed), L = (70 + rnd(i, seed + 1) * 150) * k, w = 14 + rnd(i, seed + 2) * 30, x = side === 0 ? u * W : side === 1 ? W : side === 2 ? u * W : 0, y = side === 0 ? 0 : side === 1 ? u * H : side === 2 ? H : u * H, an = Math.atan2(H / 2 - y, W / 2 - x) + (rnd(i, seed + 3) - 0.5) * 0.9, px = cos(an + PI / 2) * w, py = sin(an + PI / 2) * w; poly([[x - px, y - py], [x + px, y + py], [x + cos(an) * L, y + sin(an) * L]], i % 3 ? col : '#ffffff', a * (0.35 + rnd(i, seed + 4) * 0.5), 1); } };
  /* Tekst som slår ned: stor først, så på plass. */
  const slam = (s, x, y, size, t, t0, o) => { const k = seg(t, t0, t0 + 0.16); if (k <= 0) return; txt(s, x, y + (1 - eo(k)) * -6, Object.assign({ size: size * (1 + (1 - eo(k)) * 1.4), a: k }, o || {})); };
  const disc = (x, y, r, col, a) => { if (r <= 0) return; const X = K.g; X.save(); X.globalAlpha = c01(a == null ? 1 : a); X.fillStyle = col; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); X.restore(); };
  /* En spiss (istapp) fra (x0, y0) i retningen ang. */
  const spike = (x0, y0, ang, len, w, c0, c1, a) => { if (a <= 0.01 || len <= 1) return; const tx = x0 + cos(ang) * len, ty = y0 + sin(ang) * len, nx = -sin(ang) * w, ny = cos(ang) * w; poly([[x0 + nx, y0 + ny], [tx, ty], [x0 - nx, y0 - ny]], c0, a); poly([[x0 + nx, y0 + ny], [tx, ty], [x0, y0]], c1, a * 0.75); };
  /* Forstørrelsen som gir figuren høyden hp (og høyst bredden wp) i piksler. 0 hvis bildet ikke er lastet. */
  const fit = (id, hp, wp) => { const sp = K.cur.sps[id]; return sp ? min(hp / sp.bh, (wp || 1e9) / sp.bw) : 0; };
  /* Laget som møter, i den rekkefølgen det sendes ut (esset sist). def = standardlaget, når filmen spilles uten kamp. */
  const teamOf = (cur, def) => (cur.team && cur.team.length ? cur.team : def).filter(id => cur.sps[id]);
  /* På smale skjermer vises bare den midterste firkanten av filmen (x fra 64 til 448): alt som må ses, holder seg der.
     Stedsnavnet nede til venstre, mellom a og b. */
  const cap = (s, t, a, b) => txt(s, 80, H - 52, { size: 12, al: 'l', ls: 5, col: '#fff', sh: '#000', a: seg(t, a, a + 0.2) * (1 - seg(t, b - 0.2, b)) * 0.85 });

  /* ================= GHETSIS · CHAMPIONS EDITION =================
     1. Mørket slår sprekker på de to paukeslagene, og knuses.   2. Bak det: slottet reiser seg av bakken under en rød måne, og lysene nedenfor slukner.
     «He promised to set them free.» – «He lied.»                3. Takt 1: byen fryser. Is skyter opp på hvert paukeslag.
     4. Takt 2: dragen i avgrunnen, bare en svart skygge, og lenkene som slår inn og strammes.
     5. Takt 3 og 4: han stiger opp foran virvelen. For hver markering slår lynet ned bak to av de seks skyggene, og til slutt i ham.
     6. Hovedtemaet: navnet. */
  const H1 = 0.6, H2 = 1.56, BRK = 1.88, G0 = 4.36, BT = 0.632, beat = n => G0 + n * BT, bar = n => G0 + n * 4 * BT, DROP = bar(4), LEN = 17.3;
  const RED = '#c8102e', ICE = '#9fd8ff', DEEP = '#16030a', INK = '#040103', GDEF = [248, 94, 609, 649, 646, 635];
  /* Et tårn med spir: står på yb, bredde w, høyde h, spir sh. win = lys i vinduene (0..1). */
  const tower = (x, yb, w, h, sh, col, a, win) => {
    poly([[x - w / 2, yb], [x - w / 2, yb - h], [x - w * 0.64, yb - h], [x - w * 0.64, yb - h - w * 0.16], [x - w * 0.3, yb - h - w * 0.16], [x, yb - h - sh], [x + w * 0.3, yb - h - w * 0.16], [x + w * 0.64, yb - h - w * 0.16], [x + w * 0.64, yb - h], [x + w / 2, yb - h], [x + w / 2, yb]], col, a);
    if (win > 0) for (let j = 0; j < 3; j++) rect(x - 1, yb - h * (0.9 - j * 0.24), max(1, w * 0.06), max(2, w * 0.2), RED, 0.75 * win * a, 1);
  };
  /* Slottet: [x, bredde, høyde, spir, forsinkelse]. Bakerste rekke først. */
  const TWB = [[60, 40, 150, 50, 0.3], [124, 44, 205, 60, 0.18], [222, 40, 170, 50, 0.4], [292, 40, 185, 56, 0.1], [398, 46, 220, 64, 0.24], [462, 40, 150, 50, 0.46]];
  const TWF = [[256, 78, 236, 84, 0], [196, 44, 176, 60, 0.12], [316, 46, 190, 64, 0.2], [146, 34, 118, 44, 0.34], [370, 36, 130, 48, 0.28], [92, 30, 90, 36, 0.5], [424, 30, 98, 40, 0.44], [36, 26, 64, 30, 0.62], [478, 28, 72, 34, 0.56]];
  /* k = hvor langt det har reist seg (0..1), yb = bakken, sc = størrelse, cx = midten. */
  function castle(k, yb, a, sc, win, cx) {
    const one = (L, col) => L.forEach(([x, w, h, sh, dl]) => { const r = eo(c01((k - dl * 0.55) / 0.45)); if (r <= 0) return; tower((cx == null ? 256 : cx) + (x - 256) * sc, yb + (1 - r) * (h + sh + 16) * sc, w * sc, h * sc, sh * sc, col, a, win); });
    one(TWB, '#1c050a'); one(TWF, INK);
  }
  /* En lenke fra (x0, y0) til (x1, y1). k = hvor langt den har skutt ut, sag = hvor mye den henger. */
  const chain = (x0, y0, x1, y1, k, col, a, sag) => {
    const n = floor(Math.hypot(x1 - x0, y1 - y0) / 12), an = Math.atan2(y1 - y0, x1 - x0), X = K.g; if (k <= 0 || a <= 0.01) return;
    X.save(); X.globalAlpha = c01(a); X.strokeStyle = col; X.lineWidth = 3;
    for (let i = 0; i < n * c01(k); i++) { const u = (i + 0.5) / n; X.save(); X.translate(mix(x0, x1, u), mix(y0, y1, u) + sin(u * PI) * (sag || 0)); X.rotate(an); X.beginPath(); X.ellipse(0, 0, 8, i % 2 ? 2.2 : 5, 0, 0, TAU); X.stroke(); X.restore(); }
    X.restore();
  };
  /* Virvelen bak ham: mørke stråler som roterer, glør og røde lyn. */
  function vortex(t, a, cx, cy) {
    fill('#000'); lin([[0, '#050003'], [0.5, DEEP], [1, '#000000']], 1);
    rays(cx, cy, { n: 16, rot: t * 0.5, col: '#5a0812', a: 0.55 * a, r1: 620, wid: 0.5 });
    rays(cx, cy, { n: 9, rot: -t * 0.8 + 1, col: RED, a: 0.22 * a, r1: 520, wid: 0.28 });
    glow(cx, cy, 190 + 20 * sin(t * 6), RED, 0.35 * a, 1);
    for (let j = 0; j < 4; j++) { const q = floor(t * 9 + j * 3); if (rnd(q, j) > 0.55) { const an = rnd(q, j + 1) * TAU; bolt(cx + cos(an) * 40, cy + sin(an) * 30, cx + cos(an) * 420, cy + sin(an) * 320, { seed: q * 5 + j, col: RED, core: '#ffd0d0', w: 2, a: 0.8 * a, br: 1 }); } }
    dust('ash', { n: 60, seed: 4, a: 0.7 * a, spd: 1.2, cols: ['#2a0a0e', '#000000'] }); dust('ember', { n: 40, seed: 9, a: 0.8 * a, spd: 1.6, cols: [RED, '#ff7a4a'] });
  }
  /* 1. Mørket slår sprekker. */
  function crack(t) {
    const h1 = hit(t, H1, 0.9), g1 = eo(seg(t, H1, H1 + 0.12)), g2 = eo(seg(t, H2, BRK)), pu = 0.5 + 0.5 * sin(t * 9);
    fill('#000'); dust('ash', { n: 30, seed: 4, a: 0.3, spd: 0.6, cols: ['#2a0a0e'] });
    if (g1 <= 0) return;
    glow(256, 192, 60 + h1 * 200 + g2 * 240, RED, 0.1 + h1 * 0.3 + g2 * 0.25, 1);
    const X = K.g; X.save(); X.beginPath(); X.rect(0, 192 - 200 * g1, W, 400 * g1); X.clip();
    bolt(262, -10, 250, 394, { seed: 11, col: RED, core: '#ffd0d0', w: 2.2 + g2 * 2.6, a: 0.75 + 0.25 * pu, jag: 0.22, depth: 6 });
    X.restore();
    if (g2 > 0) for (let j = 0; j < 14; j++) { const an = rnd(j, 4) * TAU, r = (120 + rnd(j, 6) * 240) * g2, y0 = 192 + (rnd(j, 8) - 0.5) * 300, x0 = 256 + (rnd(j, 9) - 0.5) * 16; bolt(x0, y0, x0 + cos(an) * r, y0 + sin(an) * r * 0.8, { seed: 30 + j, col: RED, core: '#ff9aa0', w: 1.5, a: g2 * (0.6 + 0.4 * pu), depth: 5 }); }
    fill(RED, hit(t, H1, 0.16) * 0.55); fill('#fff', hit(t, H2, 0.1) * 0.45);
  }
  /* 2. Slottet reiser seg. */
  function rise(t) {
    const k = seg(t, BRK, G0 - 0.3), act = sin(c01(k) * PI);
    lin([[0, '#050003'], [0.5, '#2a0409'], [0.74, '#8a0f1c'], [0.8, '#3a060c'], [1, '#000000']], 1);
    glow(256, 196, 240, RED, 0.45, 1); disc(256, 196, 94, '#d83a48', 0.92); glow(236, 176, 70, '#ffb0a0', 0.22, 1);
    fog('', { a: 0.6, n: 7, y0: 30, y1: 190, seed: 5, spd: 10, col: '#1a0408' });
    { const q = floor(t * 2.2), ph = (t * 2.2) % 1; if (ph < 0.22 && rnd(q, 3) > 0.45) bolt(40 + rnd(q, 1) * 430, -10, 60 + rnd(q, 2) * 400, 150, { seed: q * 3, col: RED, core: '#ffc0c0', w: 1.2, a: (1 - ph / 0.22) * 0.7, br: 2 }); }
    castle(k, 300, 1, 0.88, seg(t, BRK + 1.3, BRK + 2.1));
    glow(256, 312, 300, '#5a0812', 0.55 * act, 1);
    if (M.mRock) for (let i = 0; i < 14 * act; i++) { const ph = (rnd(i, 21) + t * (0.5 + rnd(i, 22) * 0.6)) % 1; M.mRock(24 + rnd(i, 23) * 464, 300 - ph * (50 + rnd(i, 24) * 130), 3 + rnd(i, 25) * 7, i + 9, '#0a0204'); }
    poly([[0, 300], [40, 296], [90, 302], [150, 294], [210, 300], [256, 296], [310, 301], [370, 295], [430, 302], [480, 296], [512, 300], [512, 384], [0, 384]], '#000');
    /* Lysene i byen nedenfor slukner, ett etter ett. */
    for (let i = 0; i < 18; i++) { const q = BRK + 0.5 + rnd(i, 31) * 1.5; rect(130 + rnd(i, 32) * 252, 306 + rnd(i, 33) * 12, 2, 2, '#ffd070', 0.85 * (1 - seg(t, q, q + 0.12)), 1); }
    dust('ash', { n: 50, seed: 4, a: 0.7, spd: 1, cols: ['#2a0a0e', '#000000'] }); dust('ember', { n: 34, seed: 9, a: 0.25 + 0.6 * act, spd: 1.2, cols: [RED, '#ff7a4a'] });
    vig(0.55, '#000');
    txt('HE PROMISED TO SET THEM FREE.', 256, 58, { size: 14, ls: 3, col: '#f1e6e6', sh: '#3a0a0e', a: seg(t, BRK + 0.4, BRK + 0.75) * (1 - seg(t, 3.34, 3.44)) });
    slam('HE LIED.', 256, 64, 26, t, 3.52, { ls: 8, col: '#fff', sh: RED, sd: 3 });
    cap('UNOVA · POKÉMON LEAGUE', t, BRK + 0.5, G0 - 0.05);
  }
  /* 3. Byen fryser. */
  function ice(t) {
    const a0 = beat(0), a1 = beat(2), k0 = t - a0, k1 = t - a1;
    lin([[0, '#01060e'], [0.45, '#062034'], [0.66, '#0f3c5c'], [0.7, '#041420'], [1, '#01040a']], 1);
    glow(256, 250, 210, '#7a0c18', 0.4, 1); castle(1, 266, 0.92, 0.4, 1);
    for (let i = 0; i < 34; i++) { const x = i * 16 - 6 + rnd(i, 3) * 6, h = 10 + rnd(i, 4) * 34; rect(x, 270 - h, 12 + rnd(i, 5) * 6, h, '#03101c'); if (rnd(i, 6) > 0.4) rect(x + 3, 270 - h + 4, 2, 2, '#bfe6ff', 0.6, 1); }
    rect(0, 270, W, H - 270, '#020a12'); rect(0, 269, W, 2, '#9fd8ff', 0.25, 1);
    for (let i = 0; i < 11; i++) { const g = back(c01((k0 - i * 0.035) / 0.16)); if (g <= 0) continue; spike(20 + i * 47 + rnd(i, 7) * 14, 274, -PI / 2 + (rnd(i, 9) - 0.5) * 0.7, (70 + rnd(i, 8) * 130) * g, 9 + rnd(i, 10) * 10, '#cfeeff', '#5aa8d8', 0.95); }
    for (let i = 0; i < 6; i++) { const g = back(c01((k1 - i * 0.04) / 0.18)); if (g <= 0) continue; spike([40, 150, 250, 350, 450, 500][i] + rnd(i, 11) * 20 - 10, 404, -PI / 2 + [-0.45, 0.2, -0.1, 0.3, -0.25, 0.5][i], (240 + rnd(i, 12) * 150) * g, 30 + rnd(i, 13) * 34, '#eaf8ff', '#7cc4ee', 0.96); }
    frost(eo(seg(t, a1, a1 + 0.5)), ICE, 0.8, 5);
    dust('snow', { n: 110, seed: 3, a: 0.9, spd: 3.4, wind: 2.4 });
    [beat(1), beat(3)].forEach((q, j) => { const h = hit(t, q, 0.3); if (h > 0) bolt(0, 300 + j * 30, W, 290 + j * 40, { seed: 50 + j, col: ICE, core: '#fff', w: 1.4, a: h, jag: 0.12, depth: 5 }); });
    fill('#dff4ff', hit(t, a0, 0.2) * 0.85 + hit(t, a1, 0.2) * 0.8);
    cap('OPELUCID CITY', t, a0 + 0.15, bar(1) - 0.1);
  }
  /* 4. Dragen i lenker: bare en svart skygge. */
  function chains(t) {
    const a0 = beat(4), a1 = beat(6), sh0 = c01((t - a0) / 0.14), taut = eo(seg(t, a1, a1 + 0.14)), red = seg(t, a1, a1 + 0.3), h0 = hit(t, a0, 0.6), h1 = hit(t, a1, 0.8), up = eo(seg(t, a0, a1 + 1));
    lin([[0, '#00020a'], [0.55, '#051426'], [1, '#000000']], 1);
    for (let i = 0; i < 12; i++) spike(i * 46 + rnd(i, 3) * 20, -4, PI / 2 + (rnd(i, 4) - 0.5) * 0.3, 40 + rnd(i, 5) * 80, 8 + rnd(i, 6) * 10, '#12304a', '#0a1c2e', 0.9);
    fog('', { a: 0.6, n: 7, y0: 220, seed: 5, spd: 16, col: '#0a1a2a' });
    const s = fit(646, 318, 470), jx = h1 * (rnd(floor(t * 40), 3) - 0.5) * 10, x = 256 + jx, y = 222 - up * 10;
    glow(256, 200, 280, red > 0 ? RED : ICE, 0.1 + h0 * 0.2 + h1 * 0.25, 1);
    if (s) { aura(x, y, s, blend(ICE, RED, red), 3 + h1 * 4, 0.09 + h0 * 0.3 + h1 * 0.3, { id: 646 }); spr(x, y, s, { id: 646, col: '#010309' }); }
    [[-10, -10, 150, 150], [522, -10, 362, 150], [-10, 394, 160, 290], [522, 394, 352, 290], [130, -10, 226, 96], [382, -10, 286, 96]].forEach(([x0, y0, x1, y1], i) => {
      chain(x0, y0, x1 + jx, y1, sh0, blend('#5a6672', '#ff5a5a', red * 0.7), 1, 26 * (1 - taut) * (i < 4 ? 1 : 0.5));
      if (red > 0) bolt(x0, y0, x1 + jx, y1, { seed: 70 + i + floor(t * 20), col: RED, core: '#ffd0d0', w: 1.6, a: red * (0.45 + 0.55 * h1), jag: 0.06, depth: 4 });
      if (sh0 >= 1) glow(x1 + jx, y1, 16 + (h0 + h1) * 30, red > 0 ? RED : '#ffffff', 0.5 * h0 + 0.5 * h1, 1);
    });
    for (let j = 0; j < 3; j++) wave(a1 + j * 0.14, 256, 210, { col: j % 2 ? '#000000' : RED, r: 460, d: 0.8, w: 14 - j * 4 });
    dust('snow', { n: 50, seed: 2, a: 0.7, spd: 1.2, wind: 0.8 });
    fill('#bfe6ff', hit(t, a0, 0.16) * 0.7); fill(RED, hit(t, a1, 0.16) * 0.6);
    cap('GIANT CHASM', t, a0 + 0.15, bar(2) - 0.1);
  }
  /* De seks skyggene: to og to, lengst bak først. q[j] = når paret kommer, a = hvor tydelige. */
  const SLOT = [[-146, 206, 84], [146, 206, 84], [-158, 276, 104], [158, 276, 104], [-116, 336, 140], [116, 336, 140]];
  function six(t, cur, q, a) {
    const team = teamOf(cur, GDEF);
    SLOT.forEach(([dx, y, hp], j) => {
      const id = team[j], t0 = q[floor(j / 2)]; if (id == null || t < t0) return;
      const h = hit(t, t0, 0.5), x = 256 + dx, s = fit(id, hp, hp * 1.5); if (!s) return;
      glow(x, y - hp * 0.5, hp * (0.9 + h), h > 0.5 ? '#ffffff' : RED, (0.2 + h * 0.75) * a, 1);
      if (h > 0) bolt(x + (rnd(j, 3) - 0.5) * 30, -10, x, y - hp * 0.2, { seed: 90 + j + floor(t * 30), col: RED, core: '#fff', w: 2.6, a: h * a, br: 2 });
      aura(x, y, s, RED, 2, (0.12 + 0.08 * sin(t * 5 + j)) * a, { id, ay: 1, flip: dx > 0 }); spr(x, y, s, { id, col: INK, ay: 1, a, flip: dx > 0 });
    });
  }
  /* 5. Han stiger opp foran virvelen. */
  function throne(t, cur) {
    const t0 = bar(2), up = eo(seg(t, t0, t0 + 1.1)), AC = [beat(9), beat(11), beat(13), beat(15)], rs = seg(t, t0, DROP), TR = cur.sps['tr:ghetsis'], fin = AC[3], sk = hit(t, fin, 0.63);
    vortex(t * (1 + rs * 0.8), 0.7 + rs * 0.3, 256, 170);
    six(t, cur, AC, 1);
    if (TR) { const y = 440 - up * 106; aura(256, y, 3.5, RED, 4 + sk * 5, 0.28 * up + sk * 0.3, { id: 'tr:ghetsis', ay: 1 }); spr(256, y, 3.5, { id: 'tr:ghetsis', col: '#030102', ay: 1 }); }
    else { poly([[222, 384], [234, 384 - up * 200], [256, 384 - up * 246], [278, 384 - up * 200], [290, 384]], '#030102'); glow(256, 240, 120, RED, 0.3 * up, 1); }
    beam(256, 20 + sk * 60, -10, 340, RED, sk, '#fff'); if (sk > 0) for (let j = 0; j < 3; j++) bolt(256, -10, 256 + (j - 1) * 36, 340, { seed: 120 + j + floor(t * 30), col: RED, core: '#fff', w: 3, a: sk, br: 2 });
    wave(fin, 256, 330, { col: RED, r: 460, d: 0.63, w: 14, sy: 0.3 });
    lin([[0, 'rgba(0,0,0,.55)'], [0.22, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.8)']], 1);
    [['NO LIBERATION.', 0], ['NO TRUCE.', 1], ['NO SECOND CHANCE.', 2]].forEach(([s, j]) => { if (t >= AC[j] && t < AC[j + 1]) slam(s, 256, 352, 22, t, AC[j], { ls: 7, col: '#fff', sh: RED, sd: 3 }); });
    fill('#fff', (hit(t, AC[0], 0.1) + hit(t, AC[1], 0.1) + hit(t, AC[2], 0.1)) * 0.5 + hit(t, fin, 0.12) * 0.8);
    fill('#000', seg(t, DROP - 0.16, DROP - 0.02));
  }
  /* 6. Navnet. */
  function named(t, cur) {
    const t0 = DROP, t1 = beat(17), t2 = beat(18), TR = cur.sps['tr:ghetsis'];
    vortex(t, 0.95, 256, 150);
    six(t, cur, [0, 0, 0], 0.85);
    if (TR) { aura(256, 330, 3.7, RED, 5, 0.3, { id: 'tr:ghetsis', ay: 1 }); spr(256, 330, 3.7, { id: 'tr:ghetsis', ay: 1 }); spr(256, 330, 3.7, { id: 'tr:ghetsis', ay: 1, col: '#040103', a: 1 - seg(t, t0, t0 + 0.25) }); }
    else { poly([[222, 384], [234, 184], [256, 138], [278, 184], [290, 384]], '#030102'); glow(256, 240, 130, RED, 0.35, 1); }
    for (let j = 0; j < 3; j++) wave(t2 + j * 0.12, 256, 250, { col: j % 2 ? '#000000' : RED, r: 520, d: 0.9, w: 16 - j * 4 });
    lin([[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,.82)'], [1, '#000000']], 1);
    slam('GHETSIS', 256, 336, 54, t, t0, { ls: 8, col: '#fff', sh: RED, sd: 4 });
    const X = K.g, lk = eo(seg(t, t1 - 0.1, t1 + 0.25)); X.save(); X.globalAlpha = c01(seg(t, t1 - 0.1, t1 + 0.1)); X.fillStyle = RED; X.fillRect(256 - 150 * lk, 346, 300 * lk, 2); X.restore();
    slam('CHAMPIONS EDITION', 256, 366, 16, t, t1, { ls: 6, col: '#f2d48a', sh: '#3a0a0e' });
    fill('#fff', hit(t, t0, 0.14) * 0.9);
  }
  film('b:ghetsis', { len: LEN, at: 0, R: DROP, outc: '#000', spid: 646, sps: GDEF.concat(['tr:ghetsis']),
    cues: [[H1, 'boom'], [H2, 'boom'], [BRK, 'hit'], [3.52, 'thud'], [beat(0), 'boom'], [beat(1), 'tick'], [beat(2), 'boom'], [beat(3), 'tick'], [beat(4), 'hit'], [beat(5), 'tick'], [beat(6), 'boom'], [beat(7), 'rumble'], [beat(8), 'beat'], [beat(9), 'hit'], [beat(10), 'beat'], [beat(11), 'hit'], [beat(12), 'beat'], [beat(13), 'hit'], [beat(14), 'beat'], [beat(15), 'boom'], [DROP, 'boom'], [beat(17), 'thud'], [beat(18), 'hit']],
    draw(t, P, cur) {
      if (t < BRK + 0.5) {
        /* Mørket slår sprekker, og knuses. Bak det ligger slottet. */
        if (t < BRK) crack(t); else { const old = onAux(0, () => crack(BRK - 0.01)); rise(t); shatter(old, ei(seg(t, BRK, BRK + 0.5)), 256, 192, 7); }
        const h1 = hit(t, H1, 0.5), h2 = hit(t, H2, 0.5), br = hit(t, BRK, 0.5);
        P.sh = h1 * 6 + h2 * 5 + seg(t, H2, BRK) * 6 * (t < BRK ? 1 : 0) + br * 8; P.rgb = h1 * 4 + br * 4; P.bars = 0.13; P.scan = 0.2 * (1 - seg(t, BRK, BRK + 0.4)); P.z = 1 + br * 0.06;
      } else if (t < G0) {
        rise(t);
        const k = seg(t, BRK, G0 - 0.3), hl = hit(t, 3.52, 0.5);
        P.sh = sin(c01(k) * PI) * 2.2 + hl * 4; P.z = 1 + 0.07 * seg(t, BRK, G0); P.zy = 230; P.bars = 0.13; P.rgb = hl * 3; P.gl = hit(t, G0 - 0.12, 0.12) * 0.8;
      } else if (t < bar(1)) {
        ice(t);
        const h = hits(t, [beat(0), beat(2)], 0.5), w = hits(t, [beat(1), beat(3)], 0.3);
        P.sh = h * 9 + w * 3; P.z = 1 + h * 0.06 + 0.04 * seg(t, G0, bar(1)); P.zy = 250; P.rgb = h * 4; P.bars = 0.13;
      } else if (t < bar(2)) {
        chains(t);
        const h = hits(t, [beat(4), beat(6)], 0.6), w = hits(t, [beat(5), beat(7)], 0.3);
        P.sh = h * 8 + w * 2; P.z = 1 + 0.1 * seg(t, bar(1), bar(2)) + h * 0.04; P.zy = 200; P.rgb = h * 4 + seg(t, beat(6), bar(2)) * 1.5; P.bars = 0.13; P.gl = hit(t, bar(2) - 0.1, 0.1) * 0.7;
      } else if (t < DROP) {
        throne(t, cur);
        const AC = [beat(9), beat(11), beat(13)], h = hits(t, AC, 0.5), f = hit(t, beat(15), 0.63), rs = seg(t, bar(2), DROP), b = hits(t, [beat(8), beat(10), beat(12), beat(14)], 0.25);
        P.sh = h * 7 + f * 10 + b * 2 + rs * 2; P.z = 1 + 0.1 * rs + f * 0.08 + seg(t, DROP - 0.3, DROP) * 0.5; P.zy = 230; P.rgb = h * 4 + f * 5 + rs * 1.5; P.bars = 0.13; P.gl = seg(t, DROP - 0.2, DROP) * 0.6;
      } else {
        named(t, cur);
        const h = hit(t, DROP, 0.8), t1 = beat(17), t2 = beat(18), out = seg(t, LEN - 0.4, LEN);
        P.sh = h * 10 + hit(t, t1, 0.3) * 3 + hit(t, t2, 0.4) * 5; P.inv = hit(t, DROP + 0.06, 0.08) > 0 ? 1 : 0; P.rgb = h * 5 + hit(t, t2, 0.3) * 3; P.bars = 0.13 + out * 0.4; P.fade = out; P.z = 1 + 0.03 * seg(t, DROP, LEN); P.zy = 200;
      }
    } });

  /* ================= STEDET TIL GHETSIS =================
     Tronsalen i slottet som har reist seg, åpen mot en rød storm: slottets tårn i horisonten under den røde månen, sprekker i gulvet som gløder i takt,
     og is som bryter gjennom langs kantene. Lufta over (air): virvelen bak ham, røde lyn, stein som løftes, aske og glør. */
  film('s:Ghetsis', { use: [], air(t, k) {
    const ph = (t % 1.264) / 1.264, bt = max(Math.exp(-Math.pow(ph - 0.05, 2) / 0.0016), 0.6 * Math.exp(-Math.pow(ph - 0.5, 2) / 0.004));
    rays(378, 150, { n: 14, rot: t * 0.35, col: '#5a0812', a: 0.5 * k, r1: 360, wid: 0.5 }); rays(378, 150, { n: 8, rot: -t * 0.6 + 1, col: RED, a: 0.16 * k, r1: 300, wid: 0.26 }); glow(378, 150, 120 + 14 * bt, RED, (0.16 + 0.14 * bt) * k, 1);
    { const q = floor(t * 0.9), p2 = (t * 0.9) % 1; if (p2 < 0.2 && rnd(q, 3) > 0.25) { const x = rnd(q, 1) * W; bolt(x, -10, x + (rnd(q, 2) - 0.5) * 160, 150 + rnd(q, 4) * 60, { seed: q * 3 + floor(p2 * 12), col: RED, core: '#ffd0d0', w: 2.2, a: (1 - p2 / 0.2) * k, br: 3 }); fill(RED, (0.2 - p2) * 0.45 * k); } }
    if (M.mRock) for (let i = 0; i < 12; i++) { const p3 = (rnd(i, 21) + t * (0.05 + rnd(i, 22) * 0.07)) % 1; M.mRock(rnd(i, 23) * W, 400 - p3 * 470, 3 + rnd(i, 25) * 8, i + 9, '#0a0204'); }
    dust('ash', { n: 70, seed: 4, a: 0.7 * k, spd: 1.2, cols: ['#2a0a0e', '#000000'] }); dust('ember', { n: 70, seed: 9, a: 0.9 * k, spd: 1.5, cols: [RED, '#ff7a4a', '#ffd0a0'] });
    dust('snow', { n: 26, seed: 2, a: 0.45 * k, spd: 1, wind: 1.2, cols: ['#bfe6ff'] });
    vig((0.42 + 0.25 * bt) * k, '#1a0004');
  } });
  if (ST) ST.set('s:Ghetsis', ['#c23a48', '#4a0e16', '#0c0204'], [], [0.42, '#0a0002'], t => {
    const HZ = ST.HZ, ph = (t % 1.264) / 1.264, bt = max(Math.exp(-Math.pow(ph - 0.05, 2) / 0.0016), 0.6 * Math.exp(-Math.pow(ph - 0.5, 2) / 0.004));
    lin(['#050003', '#2a0409', '#7a0c18', '#c0283a'], 1, 0, HZ + 6);
    glow(377, 66, 190, RED, 0.5, 1); disc(377, 66, 56, '#e0505a', 0.92); glow(362, 52, 40, '#ffb0a0', 0.2, 1);
    fog('', { a: 0.55, n: 6, y0: 10, y1: 110, seed: 5, spd: 8, col: '#1a0408' });
    castle(1, HZ + 3, 1, 0.5, 0.6 + 0.4 * bt, 377);
    ST.ground(HZ, '#4a0c14', '#0a0204', RED, 0.26); rect(0, HZ - 2, W, 3, '#000000', 0.9); rect(0, HZ + 1, W, 1, RED, 0.35 + 0.3 * bt, 1);
    for (let i = 0; i < 8; i++) { const x = rnd(i, 41) * 560 - 24, y = HZ + 16 + rnd(i, 42) * (H - HZ - 30); bolt(x, y, x + (rnd(i, 43) - 0.5) * 240, y + (rnd(i, 44) - 0.3) * 70, { seed: i * 7 + 3, col: RED, core: '#ff9a8a', w: 1.6 + rnd(i, 45) * 1.6, a: 0.45 + 0.5 * bt, jag: 0.3, depth: 4, br: 1 }); }
    for (const [x, y, an, L, w] of [[14, 250, -1.2, 150, 26], [60, 300, -1.45, 110, 20], [-6, 340, -0.9, 170, 34], [498, 240, -1.95, 130, 22], [520, 320, -2.2, 180, 34], [450, 372, -1.7, 90, 20]]) spike(x, y, an, L, w, '#dff4ff', '#6ab0e0', 0.9);
    glow(256, 384, 320, '#7a0c18', 0.3 + 0.1 * bt, 1);
  });

  /* ================= CYNTHIA =================
     Natt over Sinnoh: stjerner, måne, fjellet med de brukne søylene på toppen. Tre toner tenner tre lys – ett for hver av de tre sjøene · på løpet feier
     en skygge over bildet · hun står i motlys med laget sitt bak seg, bare som skygger · lyset snur, navnet kommer, og skyggen lander ved siden av henne.
     Rolig og stort, ikke kaos. */
  const GOLD = '#f0d68a', NIGHT = '#0b1030', SHADE = '#070920', NOTES = [0.26, 0.86, 1.46], LAKE = ['#ffe27a', '#ff9ac8', '#8ac8ff'], RUN = 2.35, TURN = 6.8, LAND = 8.59, CDEF = [442, 448, 350, 407, 468, 445];
  /* En brukket søyle. */
  const pillar = (x, yb, w, h, col) => { rect(x - w / 2, yb - h, w, h, col); rect(x - w * 0.7, yb - 6, w * 1.4, 6, col); poly([[x - w / 2, yb - h], [x - w * 0.2, yb - h - w * 0.5], [x + w * 0.1, yb - h - w * 0.15], [x + w / 2, yb - h - w * 0.7], [x + w / 2, yb - h]], col); for (let i = 1; i < 4; i++) rect(x - w / 2 + i * w / 4, yb - h, 1, h, '#000000', 0.25); };
  function night(t, a) {
    lin([[0, '#03040d'], [0.55, NIGHT], [1, '#1c1640']], 1);
    stars({ n: 110, seed: 6, a: 0.9 * a, cols: ['#fff', GOLD, '#bcd0ff'] });
    glow(410, 80, 150, '#fff3cf', 0.5 * a, 1); glow(410, 80, 46, '#fffbe8', 0.9 * a, 1);
    /* Fjellet midt i Sinnoh, og søylene på toppen. */
    poly([[-10, 300], [70, 236], [128, 252], [196, 168], [232, 190], [262, 132], [300, 186], [336, 172], [404, 244], [452, 228], [522, 290], [522, 384], [-10, 384]], '#080b24', 0.96 * a);
    poly([[262, 132], [300, 186], [284, 182], [270, 160], [254, 176], [240, 172]], '#c8d4f0', 0.16 * a);
    [[222, 192, 8, 36], [242, 174, 7, 28], [284, 166, 7, 32], [304, 188, 8, 24]].forEach(([x, y, w, h]) => { pillar(x, y, w, h, '#1c2454'); rect(x + w / 2 - 1.5, y - h, 1.5, h, '#aab6ee', 0.5 * a); });
    fog('', { a: 0.35 * a, n: 6, y0: 250, seed: 7, spd: 9 });
    dust('snow', { n: 26, seed: 8, a: 0.35 * a, spd: 0.7, wind: 0.3 });
    dust('mote', { n: 46, seed: 5, a: 0.8 * a, cols: [GOLD, '#fff'], spd: 0.6 });
  }
  film('b:cynthia', { len: 10.4, at: 0, R: 7.0, outc: '#fff7e0', spid: 445, sps: CDEF.concat(['tr:cynthia']),
    cues: [[0.26, 'chime'], [0.86, 'chime'], [1.46, 'chime'], [RUN, 'boom'], [TURN, 'chime'], [LAND, 'thud'], [LAND, 'hit']],
    draw(t, P, cur) {
      const TR = cur.sps['tr:cynthia'], lit = seg(t, TURN, TURN + 0.5), sw = seg(t, RUN, RUN + 0.75), fin = seg(t, 9.9, 10.4), team = teamOf(cur, CDEF), ace = team[team.length - 1];
      night(t, 1);
      /* Tre toner, tre lys: ett for hver sjø. */
      NOTES.forEach((q, j) => { const h = hit(t, q, 1.6), x = 150 + j * 106; beam(x, 26 + h * 20, -10, 300, LAKE[j], h * 0.7, '#fff'); glow(x, 290, 70, LAKE[j], h * 0.6, 1); glow(x, 290, 16, '#ffffff', hit(t, q, 2.6) * 0.5, 1); });
      [1.76, 2.07, RUN].forEach((q, j) => wave(q, 256, 230, { col: j === 2 ? '#fff' : GOLD, r: 300 + j * 110, d: 0.9, w: 5 + j * 3, sy: 0.35 }));
      /* Laget bak henne, ett om gangen: bare skygger, også når lyset snur. */
      team.slice(0, -1).forEach((id, j) => { const a = seg(t, 3.3 + j * 0.6, 3.9 + j * 0.6), x = [92, 140, 190, 330, 376][j], y = 250 + [12, 0, 9, 2, 12][j] + sin(t * 1.3 + j) * 3, s = fit(id, 84, 112); if (!s || x == null) return; aura(x, y, s, GOLD, 2, (0.1 + 0.1 * lit) * a, { id, ay: 1 }); spr(x, y, s, { id, col: SHADE, ay: 1, a }); });
      /* En skygge feier over bildet på løpet … */
      if (ace && sw > 0 && sw < 1) { const x = -160 + sw * 840, y = 170 - sin(sw * PI) * 40, s = fit(ace, 300, 420); for (let g = 3; g >= 1; g--) spr(x - g * 60, y + g * 4, s, { id: ace, col: GOLD, a: 0.14, ay: 0.6 }); spr(x, y, s, { id: ace, col: '#06081a', ay: 0.6 }); speed(GOLD, 0.5 * sin(sw * PI), -0.08, 14, t); }
      /* … og hun står i motlys, til lyset snur. */
      const up = eo(seg(t, 2.9, 4.4));
      glow(240, 250, 210, GOLD, 0.3 * up + 0.25 * lit, 1); rays(240, 240, { n: 12, rot: t * 0.12, col: GOLD, a: 0.16 * up + 0.14 * lit, r1: 460, wid: 0.4 });
      if (TR) { aura(240, 344, 3.6, GOLD, 4, 0.25 * up, { id: 'tr:cynthia', ay: 1 }); if (lit > 0) spr(240, 344, 3.6, { id: 'tr:cynthia', ay: 1 }); if (lit < 1) spr(240, 344, 3.6, { id: 'tr:cynthia', ay: 1, col: '#05061a', a: up * (1 - lit) }); }
      /* Skyggen lander ved siden av henne. */
      const dr = seg(t, LAND - 0.22, LAND); if (ace && dr > 0) { const y = 336 - (1 - ei(dr)) * 420, s = fit(ace, 200, 230); aura(408, y, s, GOLD, 3, 0.3 * hit(t, LAND, 1.4) + 0.12, { id: ace, ay: 1, flip: true }); spr(408, y, s, { id: ace, col: SHADE, ay: 1, flip: true }); if (t >= LAND) { wave(LAND, 408, 336, { col: GOLD, r: 230, d: 0.6, w: 8, sy: 0.25 }); dust('mote', { n: 24, seed: 21, a: hit(t, LAND, 1.2), cols: [GOLD], spd: 2 }); } }
      lin([[0, 'rgba(0,0,0,0)'], [0.66, 'rgba(0,0,0,0)'], [0.84, 'rgba(3,4,13,.8)'], [1, '#03040d']], 1);
      slam('CYNTHIA', 256, 346, 50, t, 7.41, { ls: 8, col: '#fff', sh: '#8a6a1c', sd: 3 });
      txt('SINNOH CHAMPION', 256, 370, { size: 15, ls: 7, col: GOLD, sh: '#1a1440', a: seg(t, 7.99, 8.25) });
      fill('#fff7e0', hit(t, RUN, 0.2) * 0.6 + hit(t, TURN, 0.3) * 0.35 + fin);
      P.sh = hit(t, RUN, 0.4) * 3 + hit(t, LAND, 0.35) * 5; P.z = 1 + 0.05 * seg(t, 2.9, 10.4); P.zy = 230; P.bars = 0.1;
    } });
})();
