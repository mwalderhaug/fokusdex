'use strict';
/* Fokusdex – de vanlige legendariske (klasse 1): arenaen og introen til hver av dem, bygget med verktøykassa (fxgl.js, raidk.js) og arenarammeverket (arena.js).
   Planen for hver art står i work/RAIDS.md avsnitt 5. Budsjettet er lavt med vilje: 6–8 sekunder, ett grep som bare denne arten har, et eget sted
   i tre lag og ett levende element. Alle tider er sekunder fra filmen starter (filmen starter låta i «at»), lagt på slagene i musikken. */
(() => {
  if (typeof ARENA === 'undefined') return;
  const C = CINE, K = C.kit, { W, H, TAU, PI, sin, cos, abs, max, floor, c01, mix, seg, hit, pulse, io, eo, rnd, blend } = K;
  const hits = (t, l, d) => l.reduce((m, q) => max(m, hit(t, q, d)), 0), Z4 = [0, 0, 0, 0];

  /* ================= ARTICUNO =================
     Låta («Galarian Legendary Birds», felles for fugletrioen) er jevn, med slag hvert 0,35 s. Filmen starter 9,72 s ut i låta, så det sterke slaget på 13,89
     er der fjæra treffer isen (4,17 i filmen) og det neste på 14,23 er der Articuno viser seg (4,51).
     Arenaen: en frossen innsjø i en snøskog i skumring. Snødekte grantrær, fjell bak, rosa og fiolett himmel, fint snøfall, og is som er blank nok til
     å speile himmelen, trærne og de to som står der.
     Grepet bare denne har: frost på linsa. Den kryper inn fra hjørnene i filmen og ligger svakt igjen i kampen.
     Filmen (7,3 s): (1) frosten kryper inn over linsa på de tre første slagene. (2) Én blå fjær daler sakte ned, vugger på slagene og treffer isen, som
     sprekker i en stjerne. (3) Articuno ses først som et speilbilde i isen under stjernen, og så daler den ned med vingene ut. */
  const AB = [0.01, 0.36, 0.71], AT = 4.17, AR = 4.51, AL = 5.56, ALEN = 7.3;
  /* Frosten på linsa: fjærformede krystaller som vokser inn fra hjørnene (tegnet én gang og gjenbrukt). k = hvor langt den har vokst (0–1), a = styrken. */
  let frostCv = null;
  const frostMake = () => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.lineCap = 'round';
    const fern = (x0, y0, an, L, w, d, sd) => { if (L < 4 || d > 2) return; const x1 = x0 + cos(an) * L, y1 = y0 + sin(an) * L; x.strokeStyle = `rgba(236,247,255,${0.26 + 0.2 * (2 - d)})`; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(mix(x0, x1, 0.5) + sin(an) * L * 0.06, mix(y0, y1, 0.5) - cos(an) * L * 0.06, x1, y1); x.stroke();
      const n = floor(L / (4.5 + d * 2.5)); for (let i = 1; i < n; i++) { const u = i / n, bl = L * 0.38 * (1 - u * 0.75) * (0.65 + 0.6 * rnd(i, sd + d * 7)); fern(mix(x0, x1, u), mix(y0, y1, u), an + 0.95, bl, w * 0.62, d + 1, sd + i); fern(mix(x0, x1, u), mix(y0, y1, u), an - 0.95, bl, w * 0.62, d + 1, sd + i + 50); } };
    [[0, 0, 0.78], [W, 0, 2.36], [0, H, -0.78], [W, H, -2.36]].forEach(([cx, cy, a0], q) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, 210); gr.addColorStop(0, 'rgba(232,244,255,.26)'); gr.addColorStop(0.5, 'rgba(232,244,255,.08)'); gr.addColorStop(1, 'rgba(232,244,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 11; i++) fern(cx + (rnd(i, q * 9 + 1) - 0.5) * 60, cy + (rnd(i, q * 9 + 2) - 0.5) * 50, a0 + (rnd(i, q * 9 + 3) - 0.5) * 1.5, 50 + rnd(i, q * 9 + 4) * 120, 1.7, 0, q * 100 + i * 7); });
    return c;
  };
  const frost = (k, a) => { if (a <= 0.004 || k <= 0.004) return; if (!frostCv) frostCv = frostMake(); const g = K.g, R = k * 270; g.save(); g.globalAlpha = c01(a); g.beginPath(); for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) { g.moveTo(cx, cy); g.arc(cx, cy, R, 0, TAU); } g.clip(); g.imageSmoothingEnabled = true; g.drawImage(frostCv, 0, 0, W, H); g.restore(); };
  /* Fjæra: blå med lys kant og et lite skjær rundt. s = størrelsen, r = hellingen. */
  const feather = (x, y, s, r, a) => { if (a <= 0.01) return; const g = K.g; K.blob(x, y, 15 * s, '#9fd8ff', 0.4 * a, 1); g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s); g.globalAlpha = c01(a);
    const gr = g.createLinearGradient(0, -12, 0, 10); gr.addColorStop(0, '#eaf8ff'); gr.addColorStop(0.5, '#8fd0ff'); gr.addColorStop(1, '#4a8fe0'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(6, -4, 3.6, 7); g.lineTo(0.6, 10); g.lineTo(-0.6, 10); g.lineTo(-3.6, 7); g.quadraticCurveTo(-6, -4, 0, -12); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 14); for (let i = 0; i < 5; i++) { g.moveTo(0, -6 + i * 3.2); g.lineTo(3.6 - i * 0.2, -8.5 + i * 3.2); g.moveTo(0, -6 + i * 3.2); g.lineTo(-3.6 + i * 0.2, -8.5 + i * 3.2); } g.stroke(); g.restore(); };
  const aScene = S => {
    const g = K.g, P = K.P, t = S.t, st = K.st, YH = st.YH, p2 = S.p2, star = S.star || null, dim = S.dim || 0;
    /* Lyset på figurene: skumringen. Rosa lys fra himmelen bak og fra venstre, blått skjær nedenfra fra isen, og blåfiolette skygger. */
    K.lightSet({ amb: blend('#b4a6cc', '#7a7aa8', dim), sat: 0.92, lift: '#221c40', lights: [{ col: '#ffc4d4', a: 0.26 * (1 - dim), h: 0.5, top: 1 }, { col: '#9fd0ff', a: 0.3, h: 0.45 }],
      rim: [{ col: '#ffd0dc', dx: 1, dy: 1, a: 0.55 * (1 - dim) }], me: { amb: blend('#a99cc4', '#74749e', dim), rim: [{ col: '#ffd0dc', dx: -1, dy: 1, a: 0.5 * (1 - dim) }] } });
    /* Himmelen: fiolett øverst, rosa og fersken mot horisonten der sola har gått ned, med de første stjernene og noen lange skyer. */
    K.layer(Infinity, () => {
      const gr = g.createLinearGradient(0, -220, 0, YH + 4); gr.addColorStop(0, '#0f1036'); gr.addColorStop(0.55, '#3a2f74'); gr.addColorStop(0.8, '#9a5c98'); gr.addColorStop(0.93, '#e88aa0'); gr.addColorStop(1, '#ffc4a4'); g.fillStyle = gr; g.fillRect(-300, -300, W + 600, YH + 320);
      for (let i = 0; i < 34; i++) { const tw = 0.5 + 0.5 * sin(t * (0.8 + rnd(i, 3) * 2) + i * 3); K.rect(rnd(i, 1) * 620 - 50, -60 + rnd(i, 2) * (YH - 10), 1 + (i % 7 === 0), 1 + (i % 7 === 0), '#ffffff', (0.3 + 0.6 * tw) * (1 - rnd(i, 2)), 1); }
      K.blob(150, YH + 4, 230, '#ffb088', 0.5, 1, 0.42); K.blob(150, YH + 2, 90, '#fff0d8', 0.5, 1, 0.3);
      for (let i = 0; i < 6; i++) { const x = ((rnd(i, 5) * 760 + t * (1.2 + rnd(i, 6))) % 760) - 120, y = YH - 26 - rnd(i, 7) * 70; K.blob(x, y, 110 + rnd(i, 8) * 80, i % 2 ? '#5a3f86' : '#d07a9c', 0.5, 0, 0.1); K.blob(x + 10, y + 5, 90, '#ffb8a8', 0.22, 1, 0.07); }
    });
    /* Fjellene bak, skogen i to lag, og store graner på hver side av banen. */
    K.layer(7000, () => { K.ridge({ y: YH + 3, h: 78, seed: 9, f: 0.009, c0: '#a59ad8', c1: '#6a5fa8', rim: '#ffd0dc', ra: 0.28 }); K.ridge({ y: YH + 3, h: 40, seed: 14, f: 0.016, c0: '#6d66ac', c1: '#4c4788' }); });
    K.layer(3000, () => K.pines({ y: YH + 3, n: 40, seed: 5, h: 26, col: '#2a2a5e', snow: '#b9b8ea', dy: 3 }));
    K.layer(1700, () => { K.pines({ y: YH + 4, n: 8, seed: 11, h: 64, col: '#16183c', snow: '#d4d4f8', x0: -70, x1: 170, dy: 4 }); K.pines({ y: YH + 4, n: 7, seed: 17, h: 70, col: '#16183c', snow: '#d4d4f8', x0: 396, x1: W + 80, dy: 4 }); K.pines({ y: YH + 4, n: 12, seed: 23, h: 36, col: '#1e2050', snow: '#c6c6f2', x0: 150, x1: 410, dy: 2 }); });
    /* Isen (materialet): speiler himmelen og trærne, med rim og fine sprekker. Stjernen der fjæra traff, og et treff, slår sprekker. */
    const hs = S.hits.find(h => t - h.t < 1.2), sp = K.spots(), q = hs ? (hs.side === 'me' ? sp.me : sp.foe) : null;
    K.ground('ice', [[0.8, 0.3 + 0.2 * p2, 0.34, 1], [0.3, 0.42, 0.68, 0], [0.8, 0.66, 0.8, 0.00075], star || (q ? [q.X, q.Z, 20 + (t - hs.t) * 120, 0.5 * (1 - (t - hs.t) / 1.2)] : Z4)], { soft: 2 });
    /* Snøkanten langs bredden, speilbildene og skyggene til de to på isen (i kampen), og frostrøyk lavt over isen. */
    K.fogBand(st.yh + 2, { h: 6, col: '#ece8fa', a: 0.95, seed: 3, spd: 0, n: 11 });
    if (!S.film) { if (K.cur.sp) K.monRefl(S.foe[0], S.foe[1] + 1, 1.6 * S.fk, { box: 1, ft: S.ft, a: 0.3, len: 0.72, hq: 1 }); K.contact(S.foe[0], S.foe[1] + 2, 60 * S.fk, { a: 0.5, col: '#1a1840', sy: 0.14 });
      if (K.cur.sps.me) K.monRefl(S.me[0], S.me[1] - 2, 1.6 * S.mk, { id: 'me', ft: S.ftm, a: 0.22, len: 0.4, hq: 1 }); K.contact(S.me[0], S.me[1] - 3, 64 * S.mk, { a: 0.7, col: '#14123a', sy: 0.2 }); }
    K.fogBand(st.yh + 22, { h: 24, col: '#d8d0f0', a: 0.2 + 0.1 * p2, seed: 61, spd: 5, n: 5 });
    K.parts('snow', { n: 70 + floor(60 * p2), seed: 4, cols: ['#ffffff', '#e6e8ff'], a: 0.85, spd: 0.7 + 0.9 * p2, z: [0, 0.6], wind: -0.2 - 0.7 * p2 });
    K.parts('spark', { n: 14, seed: 9, cols: ['#ffffff', '#cfe8ff'], a: 0.55, spd: 0.5, z: [0, 0.5], y0: st.yh + 6, y1: H });
    P.bloom = 0.34; P.bloomT = 0.72; P.grain = 0.03; P.vig = 0.42 + 0.12 * p2; P.vigc = '#0c0a26'; P.grade = { tint: [1.02, 0.98, 1.05], con: 1.04, sat: 1.06, exp: 1 - 0.08 * p2 };
  };
  const aFront = S => {
    const t = S.t, p2 = S.p2, fT = S.since('field');
    /* Stedet slår til (Blizzard): et snødrev feier over bildet fra høyre. */
    if (fT < 1.5) { const k = pulse(fT, 0, 1.5); K.parts('snow', { n: 150, seed: 31, cols: ['#ffffff'], a: k, spd: 5, z: [0.3, 1], wind: -3.2, size: 1.2 }); K.blob(S.me[0] + 30, S.me[1] - 70, 200, '#eef6ff', 0.4 * k, 1, 0.6); for (let i = 0; i < 5; i++) K.blob(((1 - fT / 1.5) * 900 - 200 + i * 120) % 900 - 100, 120 + i * 50, 170, '#ffffff', 0.16 * k, 0, 0.3); }
    K.parts('snow', { n: 26 + floor(24 * p2), seed: 14, cols: ['#ffffff', '#eef0ff'], a: 0.8, spd: 0.8 + 1 * p2, z: [0.62, 1], wind: -0.3 - 0.8 * p2 });
    /* Frosten på linsa ligger svakt igjen hele kampen (sterkere når det blåser opp). */
    frost(S.fk1 == null ? 0.62 + 0.2 * p2 : S.fk1, S.fa == null ? 0.42 + 0.2 * p2 + 0.3 * pulse(fT, 0, 1.5) : S.fa);
  };
  ARENA.def(144, {
    yh: 150, use: [], pose: { cz: 1.092, k: 1.094, km: 1.9 }, scene: aScene, front: aFront,
    ev: { enter: { len: 0.6, cues: [[0, 'tick']] }, field: { len: 1.5, cues: [[0, 'rumble'], [0.5, 'hit'], [0.5, 'sfx', 'Blizzard']] }, rage: { len: 1.5, cues: [[0, 'rumble'], [0.5, 'cry']] } },
    film: { len: ALEN, R: AR, at: 9.72, outc: '#e8f2ff',
      cues: [[0.01, 'tick'], [0.36, 'tick'], [0.71, 'tick'], [AT, 'thud'], [AR, 'cry'], [AL, 'thud']],
      draw(t, P, c) {
        const pose = ARENA.fit(c.pose || { cz: 1.092, k: 1.094 }, c.sp), kf = K.kf, A = c.sp && c.sp.ani, tot = A ? A.total : 5.2, sp = K.spots(), FX = 121, FZ = 400, ks0 = 1.6 * pose.k;
        /* Kameraet: stille over isen mens frosten kryper inn, følger så fjæra ned mot isen, vipper opp når Articuno kommer, og ender i kampvinkelen. */
        const cam = { x: kf(t, [[0, 60], [1.7, 60], [AT, 96], [AR + 0.25, 70, eo], [6.4, 0]]), z: kf(t, [[0, -60], [1.7, -40], [AT, 150], [AR + 0.25, 90, eo], [6.4, 0]]), h: kf(t, [[0, 0.8], [AT, 0.62], [AR + 0.25, 0.8, eo], [6.4, 1]]),
          tilt: kf(t, [[0, 20], [1.7, 26], [AT, -52], [AR + 0.3, 44, eo], [6.4, 0]]), zoom: kf(t, [[1.7, 1], [AT, 1.12], [AR + 0.3, 1], [6.4, 1]]) };
        /* Stjernen i isen der fjæra treffer. */
        const sr = t >= AT ? [FX, FZ, eo(seg(t, AT, AT + 0.5)) * 150, kf(t, [[AT, 1.2], [AR + 0.6, 0.9], [6.6, 0]])] : null;
        const S = ARENA.state(t, { film: true, cc: c.cc, cam, star: sr, dim: 0.5 * (1 - seg(t, AR - 0.1, AR + 0.5)), fk1: kf(t, [[0, 0], [0.3, 0.42, eo], [0.36, 0.44], [0.62, 0.78, eo], [0.71, 0.8], [1.05, 1, eo], [AR, 1], [6.6, 0.62]]), fa: kf(t, [[0, 0.85], [AR, 0.85], [AR + 0.5, 0.7], [6.8, 0.42]]) });
        ARENA.scene(144, S);
        const fp = K.gp(FX, FZ);
        /* Fjæra daler: en bue fra side til side for hvert slag, og så ligger den på isen. */
        if (t >= 1.7 && fp) { const k = seg(t, 1.7, AT), sw = sin((t - 1.7) / 0.35 * PI) * (1 - k) * 54, fy = mix(-40, fp.y - 5, k * k * 0.35 + k * 0.65), on = t >= AT;
          feather(fp.x + (on ? 0 : sw), on ? fp.y - 3 : fy, (0.9 + 0.8 * k) * fp.s * 1.3, on ? 1.35 : cos((t - 1.7) / 0.35 * PI) * 0.7 * (1 - k * 0.6), on ? 1 - seg(t, AR, AR + 0.4) : seg(t, 1.7, 2.1));
          if (!on) for (let j = 1; j < 5; j++) { const tt = t - j * 0.07, kk = seg(tt, 1.7, AT); K.blob(fp.x + sin((tt - 1.7) / 0.35 * PI) * (1 - kk) * 54, mix(-40, fp.y - 5, kk * kk * 0.35 + kk * 0.65), 2.5, '#cfeaff', 0.4 - j * 0.08, 1); } }
        /* Sprekkene fra stjernen, og glitteret som spruter når isen slår sprekker. */
        if (t >= AT) { const a = kf(t, [[AT, 1], [AR + 0.8, 0.9], [6.7, 0]]); for (let i = 0; i < 5; i++) { const an = i / 5 * TAU + 0.4, L = 120 + rnd(i, 3) * 70; K.crack(FX, FZ, FX + cos(an) * L * 1.3, FZ + sin(an) * L, { seed: 7 + i, cell: 46, w: 5, k: eo(seg(t, AT, AT + 0.45)), hot: 0, fl: 0, a, cap: 3, cols: ['#0e1c44', '#6fa8e0', '#cfeaff', '#ffffff', '#ffffff'] }); }
          if (fp) for (let i = 0; i < 22; i++) { const ph = (t - AT) / 0.9, an = -PI / 2 + (rnd(i, 11) - 0.5) * 2.6, r = ph * (40 + rnd(i, 12) * 110) * fp.s; if (ph < 1) K.blob(fp.x + cos(an) * r * 1.3, fp.y + sin(an) * r * 0.6 + ph * ph * 40 * fp.s, 2 + rnd(i, 13) * 2.5, i % 2 ? '#ffffff' : '#bfe6ff', 1 - ph, 1); } }
        /* Articuno: først speilbildet i isen under stjernen (4,17), så daler den ned på 4,51 med vingene ut, bremser, og står i lufta over isen. */
        const act = K.act(t, { breath: 1, bp: 2.4, roar: [[AR + 0.2, 0.7, 0.7]], land: [{ t: AL, a: 0.5 }], amp: 1 - seg(t, 7, 7.25) });
        if (fp && t >= AT) {
          const s = ks0 * fp.s, drop = kf(t, [[AR - 0.05, 330], [AL - 0.1, -14, eo], [AL + 0.28, 4], [6.4, 0]]) * fp.s, ft = t < AL ? K.pp(t - AR, 0.2, 1.2, 0.5) : K.clip(t, [[AL, 4.2], [7.25, tot - 0.01]]), ra = seg(t, AT, AT + 0.22) * 0.7 * (1 - 0.55 * seg(t, AR + 0.4, 6.4));
          K.monRefl(fp.x, fp.y + 1 + drop * 0.5, s * (1 + drop / (500 * fp.s)), { box: 1, ft, a: ra, len: 0.72 }); K.blob(fp.x, fp.y + 34 * fp.s, 90 * fp.s, '#9fd8ff', 0.22 * ra, 1, 0.3);
          if (t >= AR - 0.05) { const y = fp.y - drop + act.dy * s;
            if (t < AL + 0.4) K.echo(4, 0.05, (tt, k) => K.mon(fp.x, fp.y - kf(tt, [[AR - 0.05, 330], [AL - 0.1, -14, eo], [AL + 0.28, 4], [6.4, 0]]) * fp.s, s, { box: 1, ft, col: '#bfe6ff', a: 0.16 * k, add: 1 }));
            K.contact(fp.x, fp.y + 2, 60 * fp.s * pose.k, { a: 0.5 * seg(t, AR + 0.3, AL), col: '#1a1840', sy: 0.14 });
            K.mon(fp.x + act.dx * s, y, s, { box: 1, ft, sx: act.sx, sy: act.sy, r: act.r });
            /* Isglitteret som henger igjen etter vingene, og snøen den virvler opp når den bremser. */
            for (let i = 0; i < 30; i++) { const ph = ((t - AR) * (0.5 + rnd(i, 21) * 0.5) + rnd(i, 22)) % 1, x = fp.x + (rnd(i, 23) - 0.5) * 190 * fp.s, yy = y - (20 + rnd(i, 24) * 110) * fp.s + ph * 46 * fp.s; K.blob(x, yy, 1.6 + rnd(i, 25) * 2, i % 3 ? '#ffffff' : '#9fd8ff', (1 - ph) * 0.9 * (1 - seg(t, AL, 6.6)), 1); }
            const bl = hit(t, AL - 0.15, 0.9); if (bl > 0) for (let i = 0; i < 16; i++) { const an = PI + (i / 15) * PI, r = (1 - bl) * (60 + rnd(i, 31) * 110) * fp.s; K.blob(fp.x + cos(an) * r * 1.5, fp.y + 4 - abs(sin(an)) * r * 0.25, (12 + rnd(i, 32) * 16) * fp.s, '#eef2ff', bl * 0.5, 0, 0.6); } }
        }
        ARENA.front(144, S);
        P.bars = 1 - seg(t, AR - 0.1, AR + 0.25);
        P.sh = hits(t, AB, 0.25) * 1.5 + hit(t, AT, 0.4) * 4 + hit(t, AR, 0.7) * 7 + hit(t, AL, 0.4) * 3 + (t >= AR ? act.sh * 0.6 : 0);
        P.fl = max(hit(t, AT, 0.2) * 0.3, hit(t, AR, 0.32) * 0.5); P.fc = '#eef6ff'; P.fade = 1 - seg(t, 0, 0.5);
        if (fp && t >= AT && t < AT + 0.7) P.shock = [{ x: fp.x, y: fp.y, r: (t - AT) * 330 * fp.s, w: 16, a: 8 * (1 - seg(t, AT, AT + 0.7)), sy: 0.3 }];
        P.z = mix(1, pose.cz, io(seg(t, 5.9, 6.6))); P.zx = 230.4; P.zy = 307.2;
        K.plate(AL, { mat: 'frost', col: '#8ad0ff' });
      }
    }
  });
})();
