'use strict';
/* Fokusdex – filmene til de to helt spesielle i ligaens finale: Ghetsis (Champions Edition) og Cynthia. Motoren og tegneverktøyene ligger i raid.js (CINE.kit).
   Alle tider er sekunder fra låta starter, lagt på slagene i musikken (B2W2-låta til Ghetsis: 152 slag i minuttet, første slag 1,28 s, en takt 1,579 s;
   pianotemaet til Cynthia: tonene 0,26 · 0,86 · 1,46 · 1,76 · 2,07 · 2,35, og neste frase fra 6,8 s). Uten låt går filmene på sin egen klokke.
   Bildene av Pokémonene og treneren er de samme som ellers i appen (hentes når filmen trenger dem); alt annet er tegnet med kode.
   Aldri mer enn tre store blink i sekundet. Med «redusert bevegelse» vises bare et stillbilde (se bossFilm i bui.js). */
(() => {
  if (typeof CINE === 'undefined' || !CINE.kit) return;
  const K = CINE.kit, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, pulse, io, eo, ei, back, rnd, rgba, blend, fill, lin, glow, spr, aura, bolt, rays, ring, wave, poly, rect, beam, stars, dust, fog, txt, vig, shatter, onAux, film } = K;
  const hits = (t, list, d) => list.reduce((m, q) => max(m, hit(t, q, d)), 0);
  /* Trenerbildet lastes som en figur i filmen ('tr:' + navnet): fra pakken når det finnes der, ellers samme adresse som resten av appen bruker. */
  const su = CINE.spriteUrl;
  CINE.spriteUrl = id => typeof id === 'string' && id.indexOf('tr:') === 0 ? ((typeof PACK !== 'undefined' && PACK.portrait(id.slice(3))) || `https://play.pokemonshowdown.com/sprites/trainers/${id.slice(3)}.png`) : su(id);
  /* Skrå fartsstriper over hele bildet (kuttene i kampscenene). */
  const speed = (col, a, ang, seed, t) => { const X = K.g; X.save(); X.translate(W / 2, H / 2); X.rotate(ang); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const y = (rnd(i, seed) - 0.5) * 520, L = 120 + rnd(i, seed + 1) * 360, x = ((rnd(i, seed + 2) * 900 + t * (900 + rnd(i, seed + 3) * 900)) % 1100) - 550; X.globalAlpha = c01(a * (0.25 + rnd(i, seed + 4) * 0.6)); X.fillStyle = i % 3 ? col : '#fff'; X.fillRect(x, y, L, 1 + rnd(i, seed + 5) * 3); } X.restore(); };
  /* Isskår som vokser inn fra kantene. k = 0..1. */
  const frost = (k, col, a, seed) => { if (k <= 0 || a <= 0) return; for (let i = 0; i < 22; i++) { const side = i % 4, u = rnd(i, seed), L = (70 + rnd(i, seed + 1) * 150) * k, w = 14 + rnd(i, seed + 2) * 30, x = side === 0 ? u * W : side === 1 ? W : side === 2 ? u * W : 0, y = side === 0 ? 0 : side === 1 ? u * H : side === 2 ? H : u * H, an = Math.atan2(H / 2 - y, W / 2 - x) + (rnd(i, seed + 3) - 0.5) * 0.9, px = cos(an + PI / 2) * w, py = sin(an + PI / 2) * w; poly([[x - px, y - py], [x + px, y + py], [x + cos(an) * L, y + sin(an) * L]], i % 3 ? col : '#ffffff', a * (0.35 + rnd(i, seed + 4) * 0.5), 1); } };
  /* Tekst som slår ned: stor først, så på plass. */
  const slam = (s, x, y, size, t, t0, o) => { const k = seg(t, t0, t0 + 0.16); if (k <= 0) return; txt(s, x, y + (1 - eo(k)) * -6, Object.assign({ size: size * (1 + (1 - eo(k)) * 1.4), a: k }, o || {})); };

  /* ================= GHETSIS · CHAMPIONS EDITION =================
     Mørket våkner og slår sprekker · isen og dragen han tvang til å lyde · fire kutt der laget hans slår til, ett på hvert annet slag · Kyurem fryser bildet
     og det knuses · Hydreigon reiser seg og brøler · virvelen, lyn, og Ghetsis selv · navnet. */
  const B0 = 1.28, BAR = 1.579, bar = n => B0 + n * BAR, RED = '#c8102e', ICE = '#9fd8ff', DEEP = '#16030a';
  const CUT = [[563, '#d9b24a', '#7a3cc8', -1], [604, '#ffe14a', '#fff7b0', 1], [609, '#b07cff', '#ff7ad9', -1], [625, '#ff3b4a', '#ffffff', 1]], CUT0 = bar(2), CUTD = BAR / 2;
  /* Ett kutt: figuren kommer inn fra siden, slår til, og bildet får fargen dens. k = sekunder inn i kuttet. */
  function cut(i, k, t) {
    const [id, col, c2, dir] = CUT[i], inn = back(seg(k, 0, 0.18)), x = 256 + dir * (1 - inn) * 520, y = 232, im = hit(k, 0.18, 0.5), s = 4.2 + im * 0.5;
    fill('#000'); lin([[0, blend(col, '#000000', 0.86)], [1, '#000000']], 1);
    speed(col, 0.5 + im * 0.5, dir * 0.32, 20 + i * 9, t);
    glow(256, 200, 260, col, 0.12 + im * 0.5, 1);
    for (let g = 3; g >= 1; g--) spr(x - dir * g * 46 * (1 - inn * 0.7), y, s, { id, col, a: 0.16 * (1 - seg(k, 0.2, 0.5)), ay: 0.62 });
    spr(x, y, s, { id, col: k < 0.14 ? '#ffffff' : null, ay: 0.62 });
    if (k >= 0.18) {
      if (i === 0) for (let j = 0; j < 4; j++) { const an = -2.6 + j * 0.62; bolt(256, 200, 256 + cos(an) * 330, 200 + sin(an) * 250, { seed: 40 + j, col: c2, core: '#1a0626', w: 5, jag: 0.4, a: im, depth: 4 }); }
      if (i === 1) for (let j = 0; j < 6; j++) bolt(rnd(j, 5) * W, -10, rnd(j, 6) * W, H + 10, { seed: 60 + j + floor(t * 24), col, core: '#fff', w: 2.4, a: im, br: 2 });
      if (i === 2) { dust('ember', { n: 70, seed: 12, cols: [col, c2, '#ffffff'], a: im, spd: 3.4 }); for (let j = 0; j < 3; j++) ring(256, 210, 40 + (k - 0.18) * 420 + j * 50, { col: j % 2 ? c2 : col, w: 6, a: im * 0.7 }); }
      if (i === 3) for (let j = 0; j < 3; j++) { const q = seg(k, 0.18 + j * 0.07, 0.28 + j * 0.07); if (q > 0) { const X = K.g; X.save(); X.translate(256, 196); X.rotate(-0.7 + j * 0.7); X.globalCompositeOperation = 'lighter'; X.globalAlpha = c01(im + 0.15); X.fillStyle = j % 2 ? col : '#fff'; X.fillRect(-380 * q, -3 + j * 2, 760 * q, 5); X.globalAlpha = c01(im) * 0.35; X.fillRect(-380 * q, -12, 760 * q, 24); X.restore(); } }
      fill(col, hit(k, 0.18, 0.12) * 0.75);
    }
    txt(D(id)[0].toUpperCase(), dir > 0 ? 26 : W - 26, H - 62, { size: 20, al: dir > 0 ? 'l' : 'r', ls: 4, col: '#fff', sh: col, a: seg(k, 0.2, 0.3) * (1 - seg(k, 0.66, 0.78)) });
  }
  /* Kyurem fryser alt. */
  function freeze(t) {
    const t0 = bar(4), k = seg(t, t0, t0 + 0.7), cr = hit(t, bar(4) + BAR / 2, 0.6);
    lin([[0, '#041420'], [0.6, '#0b2a40'], [1, '#02060c']], 1);
    stars({ n: 50, seed: 8, a: 0.5, col: ICE });
    glow(256, 190, 280, ICE, 0.25 + 0.2 * sin(t * 5), 1);
    aura(256, 250, 4.6, ICE, 5, 0.22, { id: 646, ay: 0.66 });
    spr(256, 250, 4.6, { id: 646, ay: 0.66 });
    frost(eo(k), ICE, 0.8, 5);
    dust('snow', { n: 80, seed: 3, a: 0.9, spd: 2.2, wind: 2 });
    for (let j = 0; j < 7; j++) { const an = rnd(j, 31) * TAU; bolt(256, 200, 256 + cos(an) * 330, 200 + sin(an) * 250, { seed: 80 + j, col: ICE, core: '#fff', w: 1.6, a: cr, depth: 4, jag: 0.18 }); }
    fill('#dff4ff', hit(t, t0, 0.22) * 0.85);
    txt('KYUREM', W - 26, H - 62, { size: 20, al: 'r', ls: 4, col: '#fff', sh: ICE, a: seg(t, t0 + 0.25, t0 + 0.4) });
  }
  /* Virvelen bak Hydreigon og Ghetsis: mørke stråler som roterer, glør og røde lyn. */
  function vortex(t, a, cx, cy) {
    fill('#000'); lin([[0, '#050003'], [0.5, DEEP], [1, '#000000']], 1);
    rays(cx, cy, { n: 16, rot: t * 0.5, col: '#5a0812', a: 0.55 * a, r1: 620, wid: 0.5 });
    rays(cx, cy, { n: 9, rot: -t * 0.8 + 1, col: RED, a: 0.22 * a, r1: 520, wid: 0.28 });
    glow(cx, cy, 190 + 20 * sin(t * 6), RED, 0.35 * a, 1);
    for (let j = 0; j < 4; j++) { const q = floor(t * 9 + j * 3); if (rnd(q, j) > 0.55) { const an = rnd(q, j + 1) * TAU; bolt(cx + cos(an) * 40, cy + sin(an) * 30, cx + cos(an) * 420, cy + sin(an) * 320, { seed: q * 5 + j, col: RED, core: '#ffd0d0', w: 2, a: 0.8 * a, br: 1 }); } }
    dust('ash', { n: 60, seed: 4, a: 0.7 * a, spd: 1.2, cols: ['#2a0a0e', '#000000'] }); dust('ember', { n: 40, seed: 9, a: 0.8 * a, spd: 1.6, cols: [RED, '#ff7a4a'] });
  }
  film('b:ghetsis', { len: 15.4, at: 0, R: 11.4, outc: '#000', spid: 635, sps: [635, 563, 604, 609, 625, 646, 'tr:ghetsis'],
    cues: [[0.25, 'beat'], [0.9, 'beat'], [B0, 'boom'], [B0 + BAR / 2, 'tick'], [bar(1), 'boom'], [bar(2), 'hit'], [bar(2) + CUTD, 'hit'], [bar(3), 'hit'], [bar(3) + CUTD, 'hit'], [bar(4), 'boom'], [bar(4) + BAR / 2, 'thud'], [bar(5), 'rumble'], [bar(5) + BAR / 2, 'cry'], [bar(6), 'rumble'], [bar(6) + BAR / 2, 'hit'], [bar(7), 'boom'], [bar(7) + BAR / 2, 'thud'], [bar(8), 'thud']],
    draw(t, P, cur) {
      const TR = cur.sps['tr:ghetsis'];
      if (t < bar(1)) {
        /* Mørket våkner: hjerteslag, navnet på laget flimrer, og med første slag slår bildet sprekker. */
        const hb = hits(t, [0.25, 0.9], 0.45), h1 = hit(t, B0, 0.9), gr = eo(seg(t, B0, B0 + 0.35));
        fill('#000'); vig(0.4 + hb * 0.5 + h1 * 0.4, DEEP); glow(256, 192, 100 + hb * 160 + h1 * 260, RED, 0.06 + hb * 0.16 + h1 * 0.3, 1);
        for (let j = 0; j < 12; j++) { const an = rnd(j, 4) * TAU, r0 = 360, r1 = 360 - gr * (200 + rnd(j, 6) * 110); bolt(256 + cos(an) * r0, 192 + sin(an) * r0 * 0.78, 256 + cos(an) * r1, 192 + sin(an) * r1 * 0.78, { seed: 7 + j, col: RED, core: '#ff9aa0', w: 1.6, a: gr * (0.55 + 0.45 * hit(t, B0 + BAR / 2, 0.5)), depth: 5 }); }
        const fl = rnd(floor(t * 16), 3) > 0.28 ? 1 : 0.25;
        txt('NEO TEAM PLASMA', 256, 198, { size: 22, ls: 7, col: '#dfe9ff', sh: '#2a3a8a', a: seg(t, 0.15, 0.5) * fl * (1 - seg(t, bar(1) - 0.3, bar(1))) });
        for (let j = 0; j < 4; j++) { const q = floor(t * 12 + j * 3); if (rnd(q, j) > 0.74) rect(0, rnd(q, j + 1) * H, W, 2 + rnd(q, j + 2) * 5, j % 2 ? RED : '#fff', 0.16, 1); }
        P.sh = h1 * 5; P.gl = hit(t, B0 + BAR / 2, 0.3) * 0.8; P.rgb = h1 * 3 + P.gl * 3; P.bars = 0.1; P.scan = 0.25;
      } else if (t < bar(2)) {
        /* Isen kommer, og bak den dragen han tvang til å lyde. */
        const t0 = bar(1), k = seg(t, t0, t0 + 0.6), up = eo(seg(t, t0 + 0.2, t0 + 1.2));
        lin([[0, '#02040a'], [0.7, '#07182a'], [1, '#000000']], 1);
        glow(256, 170, 260, ICE, 0.16 * up, 1);
        aura(256, 300 - up * 40, 5.4, ICE, 5, 0.2 * up, { id: 646, ay: 0.7 }); spr(256, 300 - up * 40, 5.4, { id: 646, col: '#06121e', ay: 0.7, a: up });
        fog('', { a: 0.5, n: 7, y0: 200, seed: 5, spd: 22 });
        frost(eo(k), ICE, 0.75, 9); dust('snow', { n: 60, seed: 2, a: 0.8, spd: 1.6, wind: 1.5 });
        fill('#bfe6ff', hit(t, t0, 0.2) * 0.8);
        P.sh = hit(t, t0, 0.5) * 4; P.bars = 0.1; P.z = 1 + 0.05 * up; P.zy = 170;
      } else if (t < bar(4)) {
        /* Fire kutt, ett på hvert annet slag: laget hans slår til. */
        const i = min(3, floor((t - CUT0) / CUTD)), k = t - CUT0 - i * CUTD;
        cut(i, k, t);
        const im = hit(k, 0.18, 0.4); P.sh = im * 7; P.rgb = im * 4; P.bars = 0.13; P.z = 1 + im * 0.04;
      } else if (t < bar(5)) {
        /* Kyurem fryser bildet. Mot slutten knuses det, og bak ligger virvelen. */
        const br = seg(t, bar(5) - 0.42, bar(5));
        if (br > 0) { const old = onAux(0, () => freeze(bar(5) - 0.43)); vortex(t, 1, 256, 200); shatter(old, ei(br), 256, 200, 3); } else freeze(t);
        P.sh = hit(t, bar(4), 0.5) * 6 + hit(t, bar(4) + BAR / 2, 0.4) * 4 + br * 5; P.bars = 0.13; P.rgb = br * 3;
      } else if (t < bar(6)) {
        /* Hydreigon reiser seg av mørket, og brøler på tredje slag. */
        const t0 = bar(5), up = eo(seg(t, t0, t0 + 0.7)), rr = bar(5) + BAR / 2, roar = hit(t, rr, 0.7), y = 330 - up * 86;
        vortex(t, 0.6 + roar * 0.4, 256, 200);
        aura(256, y, 5, RED, 5 + roar * 6, 0.25 + roar * 0.3, { id: 635, ay: 0.66 });
        spr(256, y, 5, { id: 635, ay: 0.66, col: t < rr ? '#07020a' : null }); if (t >= rr) spr(256, y, 5, { id: 635, ay: 0.66, col: '#07020a', a: 1 - seg(t, rr, rr + 0.25) });
        for (let j = 0; j < 3; j++) wave(rr + j * 0.16, 256, 200, { col: j % 2 ? '#000000' : RED, r: 480, d: 0.8, w: 16 - j * 4 });
        fill(RED, hit(t, rr, 0.14) * 0.6);
        txt('HYDREIGON', 26, H - 62, { size: 20, al: 'l', ls: 4, col: '#fff', sh: RED, a: seg(t, rr, rr + 0.15) });
        P.sh = roar * 9; P.z = 1 + 0.12 * up + roar * 0.05; P.zy = 200; P.rgb = roar * 5; P.bars = 0.13;
      } else if (t < bar(7)) {
        /* Ghetsis: laget i skygge bak ham, og han selv stiger opp i midten. På tredje slag slår lynet ned. */
        const t0 = bar(6), up = eo(seg(t, t0, t0 + 1.0)), st = t0 + BAR / 2, sk = hit(t, st, 0.6);
        vortex(t, 1, 256, 180);
        [563, 604, 609, 625, 646, 635].forEach((id, j) => { const side = j % 2 ? 1 : -1, n = floor(j / 2), x = 256 + side * (96 + n * 62), y = 262 - n * 16 + sin(t * 2 + j) * 3, a = seg(t, t0 + j * 0.09, t0 + 0.3 + j * 0.09); aura(x, y, 1.9, RED, 2, 0.14 * a, { id, ay: 1, flip: side > 0 }); spr(x, y, 1.9, { id, col: '#0a0306', ay: 1, a, flip: side > 0 }); });
        if (TR) { aura(256, 420 - up * 110, 3.5, RED, 4, 0.3 * up, { id: 'tr:ghetsis', ay: 1 }); spr(256, 420 - up * 110, 3.5, { id: 'tr:ghetsis', col: '#040103', ay: 1 }); }
        else { beam(256, 60, 420 - up * 300, H, '#000000', up, '#000000'); glow(256, 250, 120, RED, 0.35 * up, 1); }
        beam(256, 20 + sk * 50, -10, 330, RED, sk, '#fff'); if (sk > 0) for (let j = 0; j < 3; j++) bolt(256, -10, 256 + (j - 1) * 30, 330, { seed: 90 + j + floor(t * 30), col: RED, core: '#fff', w: 3, a: sk, br: 2 });
        wave(st, 256, 330, { col: RED, r: 420, d: 0.7, w: 12, sy: 0.3 }); fill('#fff', hit(t, st, 0.12) * 0.7);
        P.sh = sk * 8; P.z = 1 + 0.06 * up; P.zy = 240; P.bars = 0.13; P.rgb = sk * 4;
      } else {
        /* Navnet. */
        const t0 = bar(7), h = hit(t, t0, 0.8), t1 = t0 + BAR / 2, t2 = bar(8), out = seg(t, 15.0, 15.4);
        vortex(t, 0.9, 256, 150);
        if (TR) { aura(256, 330, 3.7, RED, 5, 0.3, { id: 'tr:ghetsis', ay: 1 }); spr(256, 330, 3.7, { id: 'tr:ghetsis', ay: 1 }); spr(256, 330, 3.7, { id: 'tr:ghetsis', ay: 1, col: '#040103', a: 1 - seg(t, t0, t0 + 0.3) }); }
        else spr(256, 300, 4.4, { id: 635, ay: 0.8 });
        lin([[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,.82)'], [1, '#000000']], 1);
        slam('GHETSIS', 256, 336, 54, t, t0, { ls: 8, col: '#fff', sh: RED, sd: 4 });
        const X = K.g; X.save(); X.globalAlpha = c01(seg(t, t1 - 0.1, t1 + 0.1)); X.fillStyle = RED; X.fillRect(256 - 150 * eo(seg(t, t1 - 0.1, t1 + 0.25)), 346, 300 * eo(seg(t, t1 - 0.1, t1 + 0.25)), 2); X.restore();
        slam('CHAMPIONS EDITION', 256, 366, 16, t, t1, { ls: 6, col: '#f2d48a', sh: '#3a0a0e' });
        txt('NO MERCY.', 256, 60, { size: 18, ls: 9, col: '#fff', sh: RED, a: seg(t, t2, t2 + 0.12) * (rnd(floor(t * 14), 5) > 0.2 ? 1 : 0.4) });
        fill('#fff', hit(t, t0, 0.14) * 0.9);
        P.sh = h * 9 + hit(t, t1, 0.3) * 3 + hit(t, t2, 0.3) * 3; P.inv = hit(t, t0 + 0.06, 0.08) > 0 ? 1 : 0; P.rgb = h * 5; P.bars = 0.13 + out * 0.4; P.fade = out; P.z = 1 + 0.03 * seg(t, t0, 15.4); P.zy = 200;
      }
    } });

  /* ================= CYNTHIA =================
     Natt, stjerner og måne. Tre toner tenner tre lys · på løpet feier Garchomp over bildet · hun står i motlys med laget sitt bak seg · lyset snur, navnet
     kommer, og Garchomp lander ved siden av henne. Rolig og stort, ikke kaos. */
  const GOLD = '#f0d68a', NIGHT = '#0b1030', NOTES = [0.26, 0.86, 1.46], RUN = 2.35, TURN = 6.8, LAND = 8.59;
  function night(t, a) {
    lin([[0, '#03040d'], [0.55, NIGHT], [1, '#1c1640']], 1);
    stars({ n: 110, seed: 6, a: 0.9 * a, cols: ['#fff', GOLD, '#bcd0ff'] });
    glow(410, 80, 150, '#fff3cf', 0.5 * a, 1); glow(410, 80, 46, '#fffbe8', 0.9 * a, 1);
    fog('', { a: 0.35 * a, n: 6, y0: 250, seed: 7, spd: 9 });
    dust('mote', { n: 46, seed: 5, a: 0.8 * a, cols: [GOLD, '#fff'], spd: 0.6 });
  }
  film('b:cynthia', { len: 10.4, at: 0, R: 7.0, outc: '#fff7e0', spid: 445, sps: [445, 442, 448, 350, 407, 468, 'tr:cynthia'],
    cues: [[0.26, 'chime'], [0.86, 'chime'], [1.46, 'chime'], [RUN, 'boom'], [TURN, 'chime'], [LAND, 'thud'], [LAND, 'cry']],
    draw(t, P, cur) {
      const TR = cur.sps['tr:cynthia'], lit = seg(t, TURN, TURN + 0.5), sw = seg(t, RUN, RUN + 0.75), fin = seg(t, 9.9, 10.4);
      night(t, 1);
      /* Tre toner, tre lys. */
      NOTES.forEach((q, j) => { const h = hit(t, q, 1.6), x = 150 + j * 106; beam(x, 26 + h * 20, -10, 300, GOLD, h * 0.7, '#fff'); glow(x, 290, 70, GOLD, h * 0.6, 1); });
      [1.76, 2.07, RUN].forEach((q, j) => wave(q, 256, 230, { col: j === 2 ? '#fff' : GOLD, r: 300 + j * 110, d: 0.9, w: 5 + j * 3, sy: 0.35 }));
      /* Laget bak henne, ett om gangen. */
      [442, 448, 350, 407, 468].forEach((id, j) => { const a = seg(t, 3.3 + j * 0.6, 3.9 + j * 0.6) * (1 - lit * 0.35), x = [50, 118, 186, 318, 464][j], y = 238 + [10, 0, 8, 2, 12][j] + sin(t * 1.3 + j) * 3; aura(x, y, 1.7, GOLD, 2, 0.1 * a, { id, ay: 1 }); spr(x, y, 1.7, { id, col: lit > 0 ? null : '#0a0c22', ay: 1, a }); if (lit > 0 && lit < 1) spr(x, y, 1.7, { id, col: '#0a0c22', ay: 1, a: a * (1 - lit) }); });
      /* Garchomp feier over bildet på løpet … */
      if (sw > 0 && sw < 1) { const x = -160 + sw * 840, y = 170 - sin(sw * PI) * 40; for (let g = 3; g >= 1; g--) spr(x - g * 60, y + g * 4, 4.4, { id: 445, col: GOLD, a: 0.14, ay: 0.6 }); spr(x, y, 4.4, { id: 445, col: '#06081a', ay: 0.6 }); speed(GOLD, 0.5 * sin(sw * PI), -0.08, 14, t); }
      /* … og hun står i motlys, til lyset snur. */
      const up = eo(seg(t, 2.9, 4.4));
      glow(240, 250, 210, GOLD, 0.3 * up + 0.25 * lit, 1); rays(240, 240, { n: 12, rot: t * 0.12, col: GOLD, a: 0.16 * up + 0.14 * lit, r1: 460, wid: 0.4 });
      if (TR) { aura(240, 344, 3.6, GOLD, 4, 0.25 * up, { id: 'tr:cynthia', ay: 1 }); if (lit > 0) spr(240, 344, 3.6, { id: 'tr:cynthia', ay: 1 }); if (lit < 1) spr(240, 344, 3.6, { id: 'tr:cynthia', ay: 1, col: '#05061a', a: up * (1 - lit) }); }
      /* Garchomp lander ved siden av henne. */
      const dr = seg(t, LAND - 0.22, LAND); if (dr > 0) { const y = 330 - (1 - ei(dr)) * 420; spr(408, y, 3.0, { id: 445, ay: 1, flip: true }); if (t >= LAND) { wave(LAND, 408, 330, { col: GOLD, r: 230, d: 0.6, w: 8, sy: 0.25 }); dust('mote', { n: 24, seed: 21, a: hit(t, LAND, 1.2), cols: [GOLD], spd: 2 }); } }
      lin([[0, 'rgba(0,0,0,0)'], [0.66, 'rgba(0,0,0,0)'], [0.84, 'rgba(3,4,13,.8)'], [1, '#03040d']], 1);
      slam('CYNTHIA', 256, 346, 50, t, 7.41, { ls: 8, col: '#fff', sh: '#8a6a1c', sd: 3 });
      txt('SINNOH CHAMPION', 256, 370, { size: 15, ls: 7, col: GOLD, sh: '#1a1440', a: seg(t, 7.99, 8.25) });
      fill('#fff7e0', hit(t, RUN, 0.2) * 0.6 + hit(t, TURN, 0.3) * 0.35 + fin);
      P.sh = hit(t, RUN, 0.4) * 3 + hit(t, LAND, 0.35) * 5; P.z = 1 + 0.05 * seg(t, 2.9, 10.4); P.zy = 230; P.bars = 0.1;
    } });
})();
