'use strict';
/* Fokusdex – det mørkeste i spillet: Darkrai (film, sted og luft) og forvandlingen Dark Mewtwo går gjennom midt i kampen.
   Motoren og tegneverktøyene ligger i raid.js (CINE.kit), motivene i raidf.js (CINE.M) og stedsverktøyene i raidx.js (CINE.stage).

   DARKRAI. Låta er Darkrai-temaet fra Legends Z-A, og filmen følger den fra første sekund: nesten stille i fem sekunder, takten setter inn på 4,98,
   og derfra går det 184,6 slag i minuttet (ett slag 0,325 s, første slag 5,15; takter på 6,45 · 7,75 · 9,05 · 10,35 · 11,65). De to sterkeste slagene
   ligger på 9,71 og 10,03, og fra 10,35 er låta på sitt høyeste.
   Filmen er et mareritt: du sovner, månen slukkes, øyne åpner seg i mørket ett etter ett, og så er det bare ett øye igjen. På 4,98 står den der.
   Stedet i kampen er nymånenatten: en svart måne med rød rand, døde trær, øyne som ser på fra mørket, og armer av skygge som strekker seg inn fra kantene.
   Alt er tegnet med kode. Aldri mer enn tre store blink i sekundet, og ingen mettet rød flate som blinker.

   DARK MEWTWO. Når den første låta i kampen er slutt, forvandles den (dkShift i bui.js). 'ev:sin' er bildene, lagt på låta som tar over («Where Is
   Your God Now», startet SIN.at sekunder inn): slag på 0,18 og 3,61, et svakere på 7,10, nesten stille fra 9,9, og utbruddet på 13,84 (SIN.drop).
   Etterpå blir skyen stående bak den (lufta til 'dk150' leser K.cur.o.sin), og øynene lyser (to merker oppå figuren i kampskjermen, plassert etter SIN.eye:
   piksler i bildet av Mewtwo, regnet fra midten nederst). */
(() => {
  if (typeof CINE === 'undefined' || !CINE.kit) return;
  const K = CINE.kit, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, seg, hit, io, eo, ei, rnd, fill, lin, glow, im, tintArt, strip, spr, aura, bolt, rays, ring, wave, poly, rect, dust, fog, txt, vig, card, film, fx } = K;
  const M = CINE.M || {}, ST = CINE.stage || null, hits = M.hits, eye = M.eye, F = CINE.FILM, HZ = ST ? ST.HZ : 146;
  const env = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));
  const disc = (x, y, r, col, a) => { if (r <= 0) return; const X = K.g; X.save(); X.globalAlpha = c01(a == null ? 1 : a); X.fillStyle = col; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); X.restore(); };
  /* Svart røyk: røykbildet fra pakken farget svart, eller myke svarte skyer uten pakke. */
  const soot = () => tintArt('smoke', '#040104') || '';
  /* Tåkebåndet fra pakken er blått. Her brukes det farget mørkerødt, eller myke skyer uten pakke. */
  const mist = (y, ox, a) => { const n = tintArt('darkfog', '#1c0410'); return n ? strip(n, y, ox, { a }) : false; };

  /* ================= DARKRAI ================= */
  /* To øyne som ser på fra mørket. w = bredden på ett øye, op = hvor åpne de er. */
  const watcher = (x, y, w, op, col, a) => {
    if (op <= 0.03) return; const X = K.g, h = max(0.5, w * 0.4 * op), A = c01(a == null ? 1 : a);
    for (const s of [-1, 1]) {
      const ex = x + s * w * 1.25;
      glow(ex, y, w * 2.6, col, 0.45 * op * A, 1);
      X.save(); X.translate(ex, y); X.rotate(s * 0.2); X.globalAlpha = c01(op * 1.4) * A; X.fillStyle = col; X.beginPath(); X.ellipse(0, 0, w, h, 0, 0, TAU); X.fill();
      X.fillStyle = '#000'; X.beginPath(); X.ellipse(0, 0, max(0.5, w * 0.16), h * 0.92, 0, 0, TAU); X.fill(); X.restore();
    }
  };
  /* Døde trær langs horisonten. De står stille, så de tegnes én gang på et eget lerret. */
  let TREE = null;
  const trees = () => {
    if (TREE) return TREE; TREE = document.createElement('canvas'); TREE.width = W; TREE.height = H; const X = TREE.getContext('2d'); X.strokeStyle = '#020103'; X.lineCap = 'round';
    const br = (x0, y0, an, len, w, d, seed) => {
      const x1 = x0 + cos(an) * len, y1 = y0 + sin(an) * len, bend = (rnd(d * 3 + 1, seed) - 0.5) * len * 0.35;
      X.lineWidth = w; X.beginPath(); X.moveTo(x0, y0); X.quadraticCurveTo((x0 + x1) / 2 - sin(an) * bend, (y0 + y1) / 2 + cos(an) * bend, x1, y1); X.stroke();
      if (d <= 0 || w < 0.9) return; const n = rnd(d, seed + 3) > 0.55 ? 3 : 2;
      for (let i = 0; i < n; i++) br(x1, y1, an + (i - (n - 1) / 2) * 0.62 + (rnd(i + d * 7, seed + 5) - 0.5) * 0.5, len * (0.56 + rnd(i + d * 5, seed + 6) * 0.22), w * 0.58, d - 1, seed + i * 11 + d);
    };
    for (const [x, h, s] of [[22, 128, 3], [78, 92, 8], [140, 70, 5], [236, 56, 13], [300, 64, 21], [452, 104, 17], [500, 138, 9]]) br(x, HZ + 3, -PI / 2 + (rnd(1, s) - 0.5) * 0.24, h * 0.44, max(2.2, h * 0.058), 4, s);
    return TREE;
  };
  /* En arm av skygge som strekker seg inn og ender i tre fingre. k = hvor langt den har strukket seg. */
  const arm = (x0, y0, ang, len, k, seed, w0, a) => {
    if (k <= 0.01 || a <= 0.01) return; const N = 12, L = [], R2 = [], t = K.T, nx = -sin(ang), ny = cos(ang); let px = x0, py = y0, qx = x0, qy = y0;
    for (let i = 0; i <= N; i++) { const s = i / N, d = s * len * k, wob = sin(s * 3.6 + t * 0.9 + seed * 3) * 16 * s + sin(s * 8 + t * 1.6 + seed) * 5 * s, hw = (w0 || 14) * (1 - s * 0.8) + 1.4; qx = px; qy = py; px = x0 + cos(ang) * d + nx * wob; py = y0 + sin(ang) * d + ny * wob; L.push([px + nx * hw, py + ny * hw]); R2.push([px - nx * hw, py - ny * hw]); }
    const ta = Math.atan2(py - qy, px - qx), body = L.concat(R2.reverse()), X = K.g;
    X.save(); X.globalAlpha = c01(a * 0.75); X.strokeStyle = '#5a0a1c'; X.lineWidth = 2.4; X.lineJoin = 'round'; X.beginPath(); body.forEach((q, i) => i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1])); X.closePath(); X.stroke(); X.restore();
    poly(body, '#010002', a);
    for (let f = -1; f <= 1; f++) { const fa = ta + f * 0.44 + sin(t * 1.3 + seed + f) * 0.14, fl = (f ? 17 : 25) * min(1, k * 1.4), mx = -sin(fa) * 2.4, my = cos(fa) * 2.4; const tip = [[px + mx, py + my], [px + cos(fa) * fl, py + sin(fa) * fl], [px - mx, py - my]]; X.save(); X.globalAlpha = c01(a * 0.75); X.strokeStyle = '#5a0a1c'; X.lineWidth = 1.6; X.beginPath(); tip.forEach((q, i) => i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1])); X.stroke(); X.restore(); poly(tip, '#010002', a); }
  };
  /* DKR = når den viser seg. DB = ett slag, D0 = første slag, DBAR = taktene. EX, EY = øyet i bildet av Darkrai (andel av figuren, fra midten). */
  const DKR = 4.98, DB = 0.325, D0 = 5.15, DBAR = [6.45, 7.75, 9.05, 10.35, 11.65], EX = 0.46 - 0.5, EY = 0.49 - 0.5;
  const ARMS = [[-10, 120, 0.25], [-10, 300, -0.2], [522, 90, -0.25], [522, 280, 0.2], [130, -10, 0.2], [400, -10, -0.2], [90, 394, -0.15], [430, 394, 0.15]];
  const LINES = [[0.7, 2.3, 'You are asleep.'], [2.75, 3.75, "You can't wake up."]];
  /* Marerittet: den svarte månen med rød rand, og øyne overalt i mørket. */
  const night = (t, heat) => {
    lin(['#000000', '#10000a', '#2a0212', '#040002']);
    glow(256, 150, 330, '#7a0a22', 0.45 + heat * 0.2, 1); disc(256, 150, 118, '#ff2a4a', 0.55 + heat * 0.25); disc(256, 150, 114, '#13010a', 1);
    im('redswirl', 256, 150, { s: 1.7, r: -t * 0.25, a: 0.4, add: 1 });
    for (let i = 0; i < 14; i++) { const P0 = 3.1 + rnd(i, 81) * 2.6, ph = ((t + rnd(i, 82) * P0) % P0) / P0, op = ph < 0.55 ? sin(ph / 0.55 * PI) : 0, x = 20 + rnd(i, 83) * 472, y = 26 + rnd(i, 84) * 250; if (abs(x - 256) < 110 && abs(y - 190) < 110) continue; watcher(x, y, 3 + rnd(i, 85) * 4, op, '#7fe6ff', 0.8); }
  };
  film(491, { len: 12.7, at: 0, R: DKR, outc: '#000', use: ['smoke', 'darkfog', 'redswirl'],
    cues: [[1.0, 'beat'], [2.0, 'beat'], [2.9, 'beat'], [3.6, 'beat'], [4.15, 'beat'], [DKR, 'boom'], [DKR, 'cry'], [6.45, 'thud'], [7.75, 'thud'], [9.05, 'thud'], [9.71, 'thud'], [10.03, 'thud'], [10.35, 'boom'], [11.65, 'thud']],
    draw(t, P, c) {
      const cx = 256, sp = c.sp, X = K.g, bw = sp ? sp.bw : 72, bh = sp ? sp.bh : 66;
      if (t < DKR) {
        /* Søvnen: månen slukkes, øynene åpner seg ett etter ett, og så er det bare ett igjen. */
        const pk = hits(t, [1.0, 2.0, 2.9, 3.6, 4.15], 0.3), mo = 1 - io(seg(t, 0.3, 2.5)), out = seg(t, 3.78, 3.9), big = eo(seg(t, 4.12, 4.7));
        P.bars = 1;
        lin(['#010208', '#060a18', '#0a0c1c', '#010104'], 0.25 + 0.75 * mo);
        glow(cx, 108, 160, '#aab8e8', 0.34 * mo, 1); disc(cx, 108, 40, '#dfe6ff', 0.92 * mo); disc(cx + (1 - io(seg(t, 0.3, 2.3))) * 92, 108, 41.5, '#020208', 1);
        X.save(); X.globalAlpha = 0.92; X.drawImage(trees(), 0, 0); X.restore(); rect(0, HZ + 2, W, H - HZ - 2, '#010103', 0.92);
        mist(262, t * 10, 0.6 * seg(t, 0.3, 2.5)) || fog('', { n: 6, seed: 3, a: 0.5 * seg(t, 0.3, 2.5), spd: 10, s: 1.5, y0: 280, y1: 400, col: '#06040c' });
        for (let i = 0; i < 13; i++) { const t0 = 1.1 + i * 0.2 + rnd(i, 61) * 0.2, bl = rnd(floor(t * 2.6 + i * 1.7), i + 3) > 0.14 ? 1 : 0.08; watcher(36 + rnd(i, 62) * 440, 50 + rnd(i, 63) * 236, 5 + rnd(i, 64) * 7, eo(seg(t, t0, t0 + 0.4)) * (1 - out) * bl, '#7fe6ff'); }
        for (const [a, b, s] of LINES) { const n = floor(seg(t, a, a + 0.8) * s.length), al = (1 - seg(t, b - 0.25, b)) * (rnd(floor(t * 18), 9) > 0.12 ? 1 : 0.35); if (n > 0) txt(s.slice(0, n), cx, 326, { size: 21, ls: 2, col: '#b4bedc', a: al, sh: 0 }); }
        fill('#000', out);
        if (big > 0 && eye) eye(cx, 186, 34 + big * 112, min(1, big * 1.25) * (1 - hit(t, 4.6, 0.12) * 0.92), 0, '#39d8ff', '#e8ffff');
        vig(0.85, '#000');
        P.sh = pk * 2.5 + seg(t, 4.55, DKR) * 5; P.z = 1 + seg(t, 0, DKR) * 0.08 + big * 0.14 + pk * 0.02; P.zy = 186; P.wav = seg(t, 2.6, DKR) * 2.4; P.rgb = pk * 2 + big * 2.5;
        return;
      }
      const bt = hits(t, DBAR, 0.5), fr = (((t - D0) / DB) % 1 + 1) % 1, b4 = t > D0 ? max(0, 1 - fr * 2.4) : 0;
      /* Den selv: armene inn fra kantene, skyggene av den som glir ut til sidene, og det ene øyet som lyser. */
      const body = (y, s, heat, grow) => {
        night(t, heat);
        ARMS.forEach((q, i) => arm(q[0], q[1], Math.atan2(y - 20 - q[1], cx - q[0]) + q[2], Math.hypot(cx - q[0], y - q[1]) * 0.8, grow * (0.86 + 0.14 * sin(t * 1.1 + i)), i * 1.7, 17, 0.97));
        mist(262, t * 20, 0.75); fog(soot(), { n: 8, seed: 5, a: 0.75, spd: 22, s: 2.2, y0: 214, y1: 392, col: '#040208' });
        for (let i = 0; i < 4; i++) { const ph = (t * 0.5 + i / 4) % 1, d = (i % 2 ? 1 : -1) * (36 + ph * 150); spr(cx + d, y + sin(t * 2 + i) * 6, s * (1 - ph * 0.12), { col: '#000', a: (1 - ph) * 0.6 }); }
        glow(cx, y, 190, '#ff1a3a', 0.18 + heat * 0.22, 1); aura(cx, y, s, '#ff2a4a', 3 + heat * 4, 0.26 + heat * 0.28); spr(cx, y, s);
        glow(cx + EX * bw * s, y + EY * bh * s, 4 * s + heat * 8, '#39d8ff', 0.95, 1); glow(cx + EX * bw * s, y + EY * bh * s, 1.2 * s, '#fff', 1, 1);
        dust('ash', { n: 60, seed: 4, cols: ['#0a0408', '#2a0a16'], a: 0.8, spd: 1.4 }); dust('ember', { n: 30, seed: 3, cols: ['#ff2a4a', '#7a0a22'], a: 0.7, spd: 1.2 });
      };
      if (t < 9.71) {
        const y = 194 + sin(t * 1.3) * 5;
        body(y, 3.2, bt + b4 * 0.12, 0.3 + 0.7 * eo(seg(t, DKR, 9.05)));
        wave(DKR, cx, 190, { col: '#dfe6ff', r: 600, d: 0.7, w: 18 }); wave(DKR + 0.2, cx, 190, { col: '#ff2a4a', r: 600, d: 0.9, w: 10 }); DBAR.slice(0, 3).forEach(q => wave(q, cx, y, { col: '#ff2a4a', r: 520, d: 0.7, w: 8 }));
        vig(0.72 + bt * 0.12, '#000'); card(6.45, { col: '#ff2a4a', cap: 'Pitch-Black Pokémon' });
        P.sh = hit(t, DKR, 0.9) * 14 + bt * 4 + b4 * 0.8; P.inv = t < DKR + 0.1 ? 1 : 0; P.rgb = hit(t, DKR, 0.7) * 8 + bt * 3; P.gl = hit(t, DKR, 0.5) * 0.7 + (rnd(floor(t * 7), 4) > 0.88 ? 0.2 : 0);
        P.z = 1 + hit(t, DKR, 0.4) * 0.16 + bt * 0.04 + b4 * 0.012 + seg(t, DKR, 9.71) * 0.05; P.zy = 190; P.wav = 1.1;
        return;
      }
      if (t < 10.03) {
        /* Øyet, helt nær. */
        fill('#000');
        for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + 0.4; bolt(cx + cos(an) * 340, 192 + sin(an) * 260, cx + cos(an) * 150, 192 + sin(an) * 62, { seed: i * 13 + 2, col: '#ff1a3a', core: '#ff9aa8', w: 1.4, a: 0.75, jag: 0.22 }); }
        if (eye) eye(cx, 192, 205, 0.96, 0, '#39d8ff', '#e8ffff'); vig(0.8, '#000');
        P.bars = 1; P.sh = hit(t, 9.71, 0.3) * 10; P.z = 1.04 + (t - 9.71) * 0.5; P.zy = 192; P.rgb = 5;
        return;
      }
      if (t < 10.35) {
        /* Et lyn: det står fem av dem der. */
        fill('#aeb8cc');
        for (let i = 0; i < 5; i++) { const d = i - 2; spr(cx + d * 96, 214 + abs(d) * 8, 2.9 - abs(d) * 0.35, { col: '#000' }); }
        ARMS.forEach((q, i) => arm(q[0], q[1], Math.atan2(190 - q[1], cx - q[0]) + q[2], Math.hypot(cx - q[0], 190 - q[1]) * 0.7, 1, i * 1.7, 15, 1));
        rect(0, 300, W, 84, '#000'); vig(0.9, '#000');
        P.bars = 1; P.sh = hit(t, 10.03, 0.3) * 9; P.z = 1.02; P.rgb = 3;
        return;
      }
      /* Den kommer nærmere, og mørket tar bildet. Det siste som slukner, er øyet. */
      const l3 = t - 10.35, gz = ei(seg(l3, 0, 1.95)), s = 3.2 + gz * 3.6, y = 198 + gz * 64, dk = seg(l3, 1.35, 1.85), ex = cx + EX * bw * s, ey = y + EY * bh * s;
      body(y, s, 0.6 + hits(t, [10.35, 11.65], 0.5) * 0.4, 1);
      const sl = 'S L E E P', n = floor(seg(t, 10.9, 11.5) * sl.length); if (n > 0) txt(sl.slice(0, n), cx, 362, { size: 23, ls: 4, col: '#d4dcf0', a: 1 - dk, sh: '#000' });
      wave(10.35, cx, 200, { col: '#ff2a4a', r: 600, d: 0.8, w: 14 }); wave(11.65, cx, 200, { col: '#ff2a4a', r: 600, d: 0.8, w: 9 });
      fill('#000', dk); if (dk > 0) { const cl = 1 - seg(t, 12.25, 12.5); glow(ex, ey, (18 + gz * 30) * cl, '#39d8ff', dk * cl, 1); glow(ex, ey, 6 * cl, '#fff', dk * cl, 1); }
      vig(0.78 + gz * 0.2, '#000');
      P.sh = hit(t, 10.35, 0.6) * 10 + hit(t, 11.65, 0.4) * 6 + gz * 2; P.z = 1 + gz * 0.08; P.zy = 200; P.rgb = 2 + gz * 4; P.gl = rnd(floor(t * 8), 5) > 0.85 ? 0.25 : 0; P.wav = 1.1 + gz * 2; P.fade = seg(t, 12.4, 12.65);
    },
    /* Lufta i kampen: mørket puster, armene strekker seg inn, og omtrent hvert trettende sekund lukker mørket seg et øyeblikk – med øyne i. */
    air(t, k) {
      const kk = min(1.25, k), bp = t % 13, bo = bp > 10.2 ? sin((bp - 10.2) / 2.8 * PI) : 0;
      fill('#030006', 0.3 * kk); fill('#000', (0.07 + 0.06 * sin(t * 0.8)) * kk + 0.4 * bo * kk);
      if (bo > 0.06) { const q = floor(t / 13); for (let i = 0; i < 5; i++) watcher(30 + rnd(i, q + 41) * 250, 30 + rnd(i, q + 42) * 110, 3.5 + rnd(i, q + 43) * 3.5, min(1, bo * 1.5) * (rnd(floor(t * 3 + i), i) > 0.15 ? 1 : 0.1), '#7fe6ff', 0.9); }
      const g = 0.42 + 0.14 * sin(t * 0.45) + bo * 0.28 + (k - 1) * 0.5;
      arm(-10, 150, 0.12, 200, g, 2, 13, 0.9); arm(W + 10, 286, PI - 0.14, 210, g * 0.9, 5, 13, 0.9); arm(150, -10, PI / 2 + 0.22, 130, g, 8, 11, 0.85); arm(W + 10, 40, PI + 0.3, 150, g * 0.8, 11, 11, 0.85);
      fog(soot(), { n: 7, seed: 3, a: 0.85 * kk, spd: 12, s: 1.5, y0: 300, y1: 400, col: '#050208' });
      dust('ash', { n: 46, seed: 5, cols: ['#0a0408', '#2a0a16'], a: 0.85 * kk, spd: 0.8 }); dust('ember', { n: 14, seed: 3, cols: ['#ff2a4a', '#7a0a22'], a: 0.5 * kk, spd: 0.7 });
      if (k > 1.2) fill('#3a0010', 0.08 + 0.05 * sin(t * 2.2));
      vig(0.74 * kk, '#010002');
    }
  });
  /* Stedet: nymånenatten. Av og til åpner et øye seg i den svarte månen. */
  if (ST) ST.set(491, ['#5c1c34', '#1a0812', '#030103'], ['darkfog', 'smoke'], [0.6, '#020003'], t => {
    const X = K.g, ep = t % 19, op = ep > 14.5 ? sin((ep - 14.5) / 4.5 * PI) : 0;
    lin(['#000002', '#05010a', '#14030c', '#040104']);
    glow(377, 62, 150, '#7a0a22', 0.3 + 0.06 * sin(t * 0.7), 1); disc(377, 62, 46, '#ff2a4a', 0.55); disc(377, 62, 44.4, '#030104', 1);
    if (op > 0.03 && eye) eye(377, 62, 30, min(1, op * 1.7), 0, '#39d8ff', '#e8ffff');
    lin([[0, 'rgba(90,10,28,0)'], [0.6, 'rgba(90,10,28,.5)'], [1, 'rgba(120,16,36,.72)']], 1, HZ - 70, HZ + 3); rect(0, HZ + 3, W, H - HZ - 3, '#000');
    X.drawImage(trees(), 0, 0);
    ST.ground(HZ, '#10050a', '#010001', '#b03060', 0.16);
    for (let i = 0; i < 7; i++) { const P0 = 8 + rnd(i, 51) * 9, ph = (t + rnd(i, 52) * P0) % P0, o2 = ph < 2.6 ? sin(ph / 2.6 * PI) * (abs(ph - 1.3) < 0.07 ? 0.1 : 1) : 0; watcher([30, 100, 170, 250, 300, 440, 490][i] + rnd(i, 53) * 20, HZ - 6 - rnd(i, 54) * 34, 2.2 + rnd(i, 55) * 1.6, o2, '#7fe6ff', 0.85); }
    mist(258, t * 9, 0.7) || fog('', { n: 6, seed: 3, a: 0.6, spd: 10, s: 1.5, y0: 280, y1: 400, col: '#07030c' });
  });

  /* Entréen er den samme som for tomrommet (riften i bakken og det ene øyet er Darkrai sin variant der). */
  if (CINE.FXS['in:void']) fx('in:night', CINE.FXS['in:void']);
  /* Marerittet (domenet): mørket lukker seg om din Pokémon, øyne åpner seg rundt den, armene griper – og så slipper det. */
  fx('ev:night', { len: 1.6, cues: [[0, 'rumble'], [0.8, 'hit'], [0.8, 'sfx', 'Nightmare']],
    draw(t, o) {
      const x = o.mx, y = o.my - 46, a = env(t, 0, 0.25, 1.2, 1.6), h = hit(t, 0.8, 0.5), gr = eo(seg(t, 0.15, 0.8)) * (1 - seg(t, 1.15, 1.55));
      fill('#000', 0.74 * a);
      for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + 0.5, R = 158 - 30 * seg(t, 0.2, 0.8); watcher(x + cos(an) * R * 1.4, y + sin(an) * R * 0.86, 5 + (i % 3) * 2, eo(seg(t, 0.1 + i * 0.06, 0.45 + i * 0.05)) * (1 - seg(t, 1.05, 1.35)) * (rnd(floor(t * 9 + i), i) > 0.12 ? 1 : 0.15), '#7fe6ff', 1); }
      [[-250, -40, 0.1], [250, -70, PI - 0.15], [-160, 170, -0.5], [180, 180, PI + 0.55]].forEach((q, i) => arm(x + q[0], y + q[1], q[2], Math.hypot(q[0], q[1]) * 0.86, gr, i * 2.3, 12, 0.96));
      if (h > 0) { glow(x, y, 130, '#b03060', h * 0.7, 1); fill('#200010', h * 0.25); }
      wave(0.8, x, y, { col: '#ff2a4a', r: 220, d: 0.6, w: 9 }); wave(0.9, x, y, { col: '#7fe6ff', r: 160, d: 0.5, w: 3 });
      vig(0.5 * a, '#000');
    } });

  /* ================= DARK MEWTWO FORVANDLES ================= */
  CINE.SIN = { eye: [[-0.4, -63.4], [-4.8, -62.4]], at: 20.4, drop: 13.84, loop: 34.22 };
  const SA = 0.18, SB = 3.61, SC = 7.1, SQ = 9.9, SD = 13.84;
  /* Skyen rundt den: svarte skyer som går i ring, stråler og rødt lys innenfra, og lyn inne i skyen. r = hvor stor, a = hvor tett, heat = gløden, out = hvor
     langt skyene er slengt utover (utbruddet). */
  const cloud = (t, x, y, r, a, heat, out) => {
    if (a <= 0.01) return; const sm = soot(), sr = tintArt('smoke', '#4a0512') || '', o2 = out || 0;
    rays(x, y, { n: 16, rot: t * 0.16, col: '#c00a18', a: 0.34 * a * (0.6 + heat * 0.4), r0: r * 0.25, r1: r * 2.5, wid: 0.3 }); rays(x, y, { n: 9, rot: -t * 0.11, col: '#ff5a2a', a: 0.16 * a * heat, r0: r * 0.25, r1: r * 1.9, wid: 0.18 });
    glow(x, y, r * 1.5, '#a00818', (0.3 + heat * 0.25) * a, 1); im('redswirl', x, y, { s: r / 150, r: t * 0.5, a: 0.5 * a * (0.5 + heat * 0.5), add: 1 });
    for (let i = 0; i < 11; i++) { const an = i / 11 * TAU + t * (0.22 + (i % 3) * 0.05) * (i % 2 ? 1 : -1), R = r * (0.72 + 0.2 * sin(t * 0.9 + i * 2.1)) * (1 + o2 * 2.2), px = x + cos(an) * R, py = y + sin(an) * R * 0.78, al = 0.9 * a * (1 - o2), n = i % 3 === 1 ? sr : sm; glow(px, py, r * 0.7, '#8a0a18', 0.22 * al * (0.6 + heat * 0.4), 1); if (!n || !im(n, px, py, { s: r / 120 * (0.8 + rnd(i, 7) * 0.5), a: al, r: an + t * 0.2 })) glow(px, py, r * 0.62, i % 3 === 1 ? '#3a0410' : '#040003', al); }
    for (let i = 0; i < 3; i++) { const q = floor(t * 5 + i * 2.3), an = rnd(q, i) * TAU; if (rnd(q, i + 9) < 0.35 + heat * 0.3) bolt(x + cos(an) * r * 0.2, y + sin(an) * r * 0.2, x + cos(an) * r * 1.15, y + sin(an) * r * 0.9, { seed: q * 7 + i, col: '#ff1a2a', core: '#ffc0b0', w: 1.6, a: 0.85 * a * (1 - o2), depth: 4, br: 1 }); }
  };
  /* Øynene som lyser. k = styrken. */
  const sinEyes = (o, k, s) => { if (k <= 0.01) return; const fl = 0.85 + 0.15 * sin(K.T * 23); glow(o.ex, o.ey, 6.5 * s * fl * (0.6 + k * 0.4), '#ff4a1a', 0.95 * k, 1); glow(o.ex, o.ey, 2.2 * s, '#fff2d0', k, 1); if (o.ex2 != null) { glow(o.ex2, o.ey2, 4.2 * s * fl * (0.6 + k * 0.4), '#ff4a1a', 0.8 * k, 1); glow(o.ex2, o.ey2, 1.4 * s, '#fff2d0', 0.9 * k, 1); } };
  fx('ev:sin', { len: 16, use: ['smoke', 'redswirl', 'cracks'],
    cues: [[SA, 'boom'], [1.85, 'rumble'], [SB, 'boom'], [SB, 'cry'], [SC, 'hit'], [10.5, 'beat'], [11.5, 'beat'], [12.4, 'beat'], [13.1, 'beat'], [SD, 'boom'], [SD, 'sfx', 'Psystrike'], [SD, 'sin']],
    draw(t, o) {
      const s = o.s || 2, x = o.x, cy = o.y - 46 * s, R = 58 * s, pre = t < SD, after = t - SD;
      if (o.ex == null) { o.ex = x - 0.4 * s; o.ey = o.y - 63.4 * s; }
      /* Mørket: tettere for hvert slag, nesten helt i stillheten, og så slipper det. */
      const dk = pre ? 0.3 * seg(t, 0, SA) + 0.22 * seg(t, SA, SB) + 0.14 * seg(t, SC, SQ) + 0.2 * seg(t, SQ, SQ + 1.6) : 0.62 * (1 - seg(t, SD + 0.15, 15.8));
      fill('#020003', dk);
      /* Bakken sprekker under den (det dype drønnet på 1,85). */
      const ck = pre ? seg(t, 1.85, 2.5) : 1 - seg(t, SD + 0.6, 15.6);
      if (ck > 0.01 && !im('cracks', x, o.y + 4, { s: 0.42 * s, sy: 0.4, a: ck * (0.7 + 0.3 * sin(t * 6)), add: 1 })) for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + 0.3; bolt(x, o.y + 4, x + cos(an) * 70 * s, o.y + 4 + sin(an) * 22 * s, { seed: i * 7 + 3, col: '#ff1a2a', core: '#ffb0a0', w: 1.4, a: ck * 0.8, depth: 4, jag: 0.3 }); }
      /* Skyen samler seg for hvert slag, trekker seg sammen i stillheten, og slenges utover i utbruddet. */
      const gather = pre ? 0.25 * eo(seg(t, SA, SA + 1.2)) + 0.35 * eo(seg(t, SB, SB + 1.2)) + 0.4 * eo(seg(t, SC, SC + 1.4)) : 1, pull = pre ? io(seg(t, SQ, SD - 0.25)) : 0, out = pre ? 0 : eo(seg(after, 0, 0.55));
      const heat = pre ? 0.3 + 0.3 * hits(t, [SA, SB], 1.2) + 0.4 * seg(t, SC, SD) : 1 - seg(after, 0.4, 2);
      cloud(t, x, cy, R * (0.75 + 0.85 * gather) * (1 - 0.6 * pull), gather, heat, out);
      /* Slagene. */
      wave(SA, x, cy, { col: '#ff1a2a', r: 430, d: 0.9, w: 12 }); wave(SB, x, cy, { col: '#ff1a2a', r: 470, d: 0.9, w: 14 }); wave(SB + 0.16, x, cy, { col: '#ffb0a0', r: 380, d: 0.8, w: 5 }); wave(SC, x, cy, { col: '#ff6a2a', r: 300, d: 0.8, w: 8 });
      /* Stillheten: alt trekkes inn mot den, og bare øynene er igjen. */
      const q = env(t, SQ, SQ + 0.6, SD - 0.3, SD);
      if (q > 0.01) for (let i = 0; i < 3; i++) { const k = ((t - SQ) * 0.8 + i / 3) % 1; ring(x, cy, (1 - k) * 320 + 14, { col: '#ff1a2a', w: 1 + k * 2.5, a: k * 0.75 * q }); }
      const bt = pre ? hits(t, [10.5, 11.5, 12.4, 13.1], 0.45) : 0;
      sinEyes(o, pre ? seg(t, SC, SC + 0.3) * (1 + bt * 0.5) : 1 - seg(after, 1.2, 2.1), s);
      /* Utbruddet. */
      const sw = pre ? ei(seg(t, 13.2, SD)) : 0; if (sw > 0) { glow(x, cy, 14 + sw * 70, '#ff6a3a', sw, 1); glow(x, cy, 6 + sw * 22, '#fff', sw, 1); }
      if (!pre) {
        const h = hit(t, SD, 1.7);
        rays(x, cy, { n: 22, rot: t * 0.5, col: '#ff2a2a', a: h * 0.85, r1: 640, wid: 0.36 }); rays(x, cy, { n: 11, rot: -t * 0.8, col: '#ffd0a0', a: h * 0.5, r1: 640, wid: 0.2 });
        for (let i = 0; i < 6; i++) { const qq = floor(t * 12 + i * 2), an = rnd(qq, i) * TAU; bolt(x + cos(an) * 26, cy + sin(an) * 26, x + cos(an) * (190 + rnd(qq, i + 3) * 150), cy + sin(an) * (140 + rnd(qq, i + 4) * 110), { seed: qq * 3 + i, col: '#ff1a2a', core: '#fff2d0', w: 2, a: hit(t, SD, 1.1), br: 2 }); }
        fill('#ffd0b0', hit(t, SD, 0.14) * 0.5);
        wave(SD, x, cy, { col: '#fff', r: 620, d: 0.8, w: 20 }); wave(SD + 0.15, x, cy, { col: '#ff1a2a', r: 620, d: 0.95, w: 12 }); wave(SD + 0.4, x, cy, { col: '#ff1a2a', r: 620, d: 1.0, w: 6 });
        dust('ember', { n: 70, seed: 7, cols: ['#ff2a1a', '#ffb060', '#7a0010'], a: 1 - seg(after, 0.8, 2.1), spd: 2.6 });
      }
      vig(0.55 * dk + (pre ? 0 : 0.3 * (1 - seg(after, 0, 2))), '#1a0004');
    } });
  /* Etter forvandlingen står skyen bak den resten av kampen. Stedet er K.cur.o.sin = { x, y (midt på figuren), r, fy (føttene) }, i banens egne piksler. */
  const dk = F.dk150;
  if (dk && dk.air) {
    const air0 = dk.air; dk.use = (dk.use || []).concat(['smoke', 'redswirl', 'cracks'].filter(n => !(dk.use || []).includes(n)));
    dk.air = function (t, k, cc) {
      const o = (K.cur && K.cur.o) || {}, sn = o.sin;
      if (sn) { fill('#0a0002', 0.24); im('cracks', sn.x, sn.fy + 3, { s: sn.r / 150, sy: 0.4, a: 0.6 + 0.25 * sin(t * 5), add: 1 }); cloud(t, sn.x, sn.y, sn.r * 1.5, 1, 0.6 + 0.4 * sin(t * 1.7), 0); }
      air0.call(this, t, k, cc);
      if (sn) vig(0.3, '#1a0004');
    };
  }
})();
