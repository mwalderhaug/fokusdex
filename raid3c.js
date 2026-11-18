'use strict';
/* Fokusdex – cutscenene i 3D (motoren og stilen står i raid3d.js). Spilles bare når ressurspakken har 3D-filene; ellers går sprite-filmen som før.
   Hver cutscene er ett sted bygget i 3D, ett sammenhengende skuespill (act) og en liste med kameraer som klipper mellom bilder av det (shots).
   Groudon (383): krateret ved Terra Cave. Lavasjø med skorpeflak, fjellvegger med hyller, røde krystaller og vulkanen bak kanten, som arenaen i raid2.js.
   Tyngden i bevegelsene: forvarsel (han trekker seg sammen før han slår ut), overskudd (back, forbi målet og tilbake), en dempet fjær etter hvert
   nedslag (sq), og støv, sprut og risting i det foten treffer. */
(() => {
  if (typeof G3D === 'undefined' || typeof CINE === 'undefined') return;
  const K = G3D.K, C = CINE.kit, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, hit, rnd, hex } = K, kf = C.kf;
  const lerpC = (u, a, b, k) => { const x = hex(a), y = hex(b); u.value.setRGB(mix(x[0], y[0], k), mix(x[1], y[1], k), mix(x[2], y[2], k)); };

  /* ---------- Stedet: krateret ----------
     Nesten bare lava (Jazz 18.11: «bakken er for lite lava», og han skal stå i den): lavasjøen er arenaens materiale i 3D, med noen få skorpeflak langt ute,
     fjellvegger med hyller og røde krystaller. Himmelen og vulkanen tegnes i 2D bak (backdrop under). */
  function crater(T) {
    const S = { scene: new T.Scene(), figs: [] }, sc = S.scene, add = (m, x, y, z, ry) => { m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; sc.add(m); return m; };
    S.lava = add(K.lava({ cw: 0.06 }));
    /* Veggene: en indre ring med hyller og en høyere ytre. Mot vulkanen (−Z) er begge lavere, så krateret åpner seg mot den. */
    const dip = a => 1 - 0.6 * Math.exp(-Math.pow((((a - PI * 1.5) % TAU + TAU + PI) % TAU - PI) / 0.7, 2));
    add(K.cliff({ r: 76, h: 27, y0: -2, rough: 7, back: 15, steps: 3, ledge: 2.6, seed: 3, n: 64, m: 8, hf: dip, mat: K.rockMat({ a: '#2a1616', b: '#4a2a22', str: 0.14, sm: 0.85 }) }));
    add(K.cliff({ r: 134, h: 52, y0: -2, rough: 13, back: 24, steps: 2, seed: 8, n: 44, m: 7, hf: a => 0.3 + 0.7 * dip(a), mat: K.rockMat({ a: '#1e1113', b: '#30191a', str: 0.08, sm: 0.85 }) }));
    const fm = K.rockMat({ a: '#1c0f0e', b: '#30181a', str: 0.5, top: 1, sm: 0.5 });
    for (let i = 0; i < 10; i++) { const a = rnd(i, 31) * TAU, r = 30 + rnd(i, 32) * 36, s = 3 + rnd(i, 33) * 4.5; if (abs(cos(a) * r) < 17 && sin(a) * r > -12) continue; add(K.boulder(s, 40 + i, { flat: 1, sy: 0.1 + rnd(i, 34) * 0.06, cap: 0.45, j: 0.2, mat: fm }), cos(a) * r, 0.05, sin(a) * r, rnd(i, 35) * 6); }
    /* Stein og krystaller langs veggen og noen ute i lavaen. */
    const bm = K.rockMat({ a: '#261516', b: '#42261f', str: 0.3 }), cm = K.cryMat({}), cm2 = K.cryMat({ a: '#8a1838', b: '#ff86a0' }); S.cry = [cm, cm2];
    const cluster = (x, z, s, seed) => { for (let i = 0; i < 5; i++) { const m = K.spike(s * (0.55 + rnd(i, seed) * 0.8), s * (0.13 + rnd(i, seed + 1) * 0.07), seed + i, { crystal: 1, n: 6, mat: i % 2 ? cm : cm2 }); m.position.set(x + (rnd(i, seed + 2) - 0.5) * s * 0.7, 0.2, z + (rnd(i, seed + 3) - 0.5) * s * 0.7); m.rotation.set((rnd(i, seed + 4) - 0.5) * 0.9, rnd(i, seed + 5) * 6, (rnd(i, seed + 6) - 0.5) * 0.9); sc.add(m); } };
    for (let i = 0; i < 13; i++) { const a = (i + rnd(i, 51) * 0.7) / 13 * TAU, r = 62 + rnd(i, 52) * 9; add(K.boulder(5 + rnd(i, 53) * 6, 60 + i, { j: 0.24, sy: 0.8, mat: bm }), cos(a) * r, 0.5, sin(a) * r, rnd(i, 54) * 6); if (i % 3 !== 1) cluster(cos(a) * (r - 4), sin(a) * (r - 4), 7 + rnd(i, 55) * 6, 100 + i * 9); }
    for (const [x, z, s, sd] of [[-17, -11, 6.5, 300], [21, -19, 8, 320], [-27, 15, 5, 340], [17, 23, 4.5, 360]]) { cluster(x, z, s, sd); add(K.boulder(s * 0.62, sd + 1, { j: 0.22, sy: 0.7, mat: bm }), x - 0.5, 0, z - 0.5); }
    /* Lufta: glør over hele sjøen. Damp, lavasprut og drypp er utbrudd som startes med S.fx(...); steinflakene som faller av ham, er piksler som ham. */
    S.embers = add(K.pts(200, i => ({ p: [(rnd(i, 1) - 0.5) * 130, rnd(i, 2) * 3, (rnd(i, 3) - 0.5) * 130], v: [(rnd(i, 4) - 0.5) * 1.6, 2.2 + rnd(i, 5) * 3.4, (rnd(i, 6) - 0.5) * 1.6], b: rnd(i, 7) * 9, l: 5 + rnd(i, 8) * 4, z: 1.1 + rnd(i, 9) * 1.4 }), { loop: 1, add: 1, px: 60, sway: 0.9, c: ['#fff0a0', '#ff9a20', '#c0300a'], fade: 0.8 }));
    S.dust = [0, 1, 2].map(k => add(K.pts(22, i => { const a = rnd(i, 60 + k) * TAU, v = 1.6 + rnd(i, 61 + k) * 3.2; return { p: [cos(a) * 1.5, 0.3, sin(a) * 1.5], v: [cos(a) * v, 1.6 + rnd(i, 62 + k) * 3, sin(a) * v], b: rnd(i, 63) * 0.1, l: 1 + rnd(i, 64) * 0.8, z: 3 + rnd(i, 65) * 3 }; }, { t0: -1e5, shade: 1, drag: 1.4, sz0: 0.5, sz1: 2, px: 60, c: ['#ffb470', '#8a4026', '#2c1816'], a: 0.55, fade: 0.35 })));
    S.deb = [0, 1, 2].map(k => add(K.pts(34, i => ({ p: [(rnd(i, 70 + k) - 0.5) * 5.5, rnd(i, 71 + k) * 5, (rnd(i, 72 + k) - 0.5) * 5], v: [(rnd(i, 73 + k) - 0.5) * 11, 2 + rnd(i, 74 + k) * 7, (rnd(i, 75 + k) - 0.5) * 9 + 2], b: rnd(i, 76) * 0.22, l: 1.1 + rnd(i, 77) * 0.7, z: 0.4 + rnd(i, 78) * 0.75 }), { t0: -1e5, pix: 1, g: 24, px: 60, c: ['#9a8aa2', '#74627e', '#4c3c56'], id: 201, floor: 0.05, fade: 0.92 })));
    S.spl = [0, 1, 2, 3].map(k => add(K.pts(46, i => { const a = rnd(i, 80 + k) * TAU, v = 2 + rnd(i, 81 + k) * 6; return { p: [cos(a) * (k ? 1.4 : 3.4), 0.1, sin(a) * (k ? 1.4 : 3)], v: [cos(a) * v, 6 + rnd(i, 82 + k) * 9, sin(a) * v], b: rnd(i, 83) * 0.2, l: 0.9 + rnd(i, 84) * 0.6, z: 0.8 + rnd(i, 85) * 1.1 }; }, { t0: -1e5, add: 1, g: 26, px: 60, c: ['#fff0a0', '#ff9a20', '#d83a0a'], floor: 0, fade: 0.85 })));
    S.drip = add(K.pts(40, i => ({ p: [(rnd(i, 90) - 0.5) * 5.4, 1.2 + rnd(i, 91) * 4.6, (rnd(i, 92) - 0.5) * 4.4], v: [0, -0.6, 0], b: rnd(i, 93) * 1.2, l: 0.6 + rnd(i, 94) * 0.5, z: 0.5 + rnd(i, 95) * 0.5 }), { loop: 1, add: 1, g: 20, px: 60, c: ['#ffe070', '#ff8a18', '#d83a0a'], floor: 0, fade: 0.95 }));
    S.ring = add(K.light(0, '#ffd070'));
    S.fx = (pts, t0, x, y, z) => { pts.position.set(x, y, z); pts.material.uniforms.uT0.value = t0; };
    return S;
  }

  /* ---------- Groudon våkner (introen før raidet) ----------
     Slagene i låta (Primal Kyogre & Groudon fra 0 s; de samme som sprite-filmen i raid2.js bruker, og videre): det rolige forspillet har fire slag (GB),
     bandet kommer inn på GE, tre raske slag (GT), og så hver andre takt: stegene (S1, S2), vulkanen (GV), slaget (GP) og brølet (GX). En takt er 1,23 s. */
  const GB = [0.31, 1.56, 2.79, 4.01], GE = 5.26, GU = 6.49, GT = [8.46, 8.93, 9.54], S1 = 10.16, S2 = 11.40, GV = 12.63, GA = 13.87, GP = 15.05, GW = 16.30, GD = 17.53, GI = 18.76, GX = 19.97;
  const CURL = { Spine1: [0, -0.26, 0], Spine2: [0, -0.28, 0], Spine3: [0, -0.26, 0], Neck1: [0, -0.36, 0], Neck2: [0, -0.3, 0], Head: [0, -0.24, 0], '*Arm': [0.25, -0.5, 0.35], '*Hand': [0, 0, 0.5], Tail1: [0, 0, 0.3], Tail2: [0, 0, 0.36], Tail3: [0, 0, 0.36], Tail4: [0, 0, 0.36], Tail5: [0, 0, 0.3] };
  const ROAR = { Neck1: [0, 0.28, 0], Neck2: [0, 0.2, 0], Head: [0, 0.15, 0], Jaw: [0, -0.82, 0], Spine2: [0, 0.1, 0], Spine3: [0, 0.06, 0], Tail2: [0, 0.12, 0], Tail3: [0, 0.12, 0], Tail4: [0, 0.12, 0], '*Arm': [0, 0.25, -0.65], '*Hand': [0.4, 0, 0] };
  const DUCK = { Neck1: [0, -0.2, 0], Neck2: [0, -0.1, 0], Head: [0, -0.14, 0], Spine2: [0, -0.1, 0], Spine3: [0, -0.06, 0], '*Arm': [0, -0.3, 0.2] };
  const RAISE = { '*Arm': [-0.9, 0.3, -0.3], Spine2: [0, 0.12, 0], Spine3: [0, 0.1, 0], Neck1: [0, 0.14, 0], Head: [0, 0.1, 0], Jaw: [0, -0.25, 0] };
  const SLAM = { '*Arm': [0.5, 0, 0.3], Spine1: [0, -0.14, 0], Spine2: [0, -0.2, 0], Spine3: [0, -0.16, 0], Neck1: [0, -0.1, 0], Head: [0, 0.12, 0], Jaw: [0, -0.4, 0] };
  const FLEX = { '*Arm': [-0.2, 0.55, -0.45], '*Hand': [0.7, 0, -0.2] };
  const sq = (t, t0, f, d) => { const a = t - t0; return a < 0 ? 0 : Math.exp(-(d || 6) * a) * cos((f || 13) * a); };   /* fjæringen etter et nedslag */
  const NB = 10, blade = i => ({ x: (i % 2 ? 1 : -1) * (5.6 + i * 0.55), z: 15 + i * 4, h: 6.5 + i * 1.15, r: 1 + i * 0.09, t: GP + 0.07 + i * 0.105 });

  G3D.def('c3:383', {
    len: 21.7, hold: 1, R: GX, at: 0, models: ['groudon'],
    make(K, T) {
      const S = crater(T), g = S.gr = K.figure(K.model('groudon')); S.scene.add(g.root); S.figs.push(g);
      /* Hodekameraet: øyet og kameraplassen målt i hvilestillingen og festet til hodebenet, så nærbildet følger hodet uansett pose. */
      g.clear(); g.apply(); const loc = (b, x, y, z) => g.bones[b].worldToLocal(new T.Vector3(x, y, z));
      g.set('uSeam', 0.22); g.set('uHead', [2.2, 4.2, 1]);   /* aldri lys i hodet: en gul strek over øyet fikk ham til å se trist ut (Jazz 18.11) */
      S.A = { eye: loc('Head', 0.9, 6.02, 4.75), eyeCam: loc('Head', 3.5, 6.5, 6.9), jaw: loc('Jaw', 0, 5.5, 5.1), jawCam: loc('Jaw', 2.3, 4.5, 9.4) };
      S.W = (b, v) => g.bones[b].localToWorld(v.clone());
      const sm = K.rockMat({ a: '#2a1a1a', b: '#4a302a', str: 0.4, sm: 0.35 });
      S.blades = []; for (let i = 0; i < NB; i++) { const b = blade(i), m = K.spike(b.h, b.r, 500 + i, { n: 7, mat: sm }); m.rotation.set(-0.12 - rnd(i, 7) * 0.1, rnd(i, 8) * 6, (i % 2 ? -1 : 1) * 0.14); S.scene.add(m); S.blades.push(m); }
      S.bspl = K.pts(NB * 9, i => { const b = blade(floor(i / 9)), a = rnd(i, 3) * TAU; return { p: [b.x + cos(a) * b.r, 0.1, b.z + sin(a) * b.r], v: [cos(a) * (2 + rnd(i, 4) * 5), 7 + rnd(i, 5) * 9, sin(a) * (2 + rnd(i, 6) * 5)], b: b.t - GP + rnd(i, 7) * 0.08, l: 0.8 + rnd(i, 8) * 0.5, z: 0.9 + rnd(i, 9) * 1.1 }; }, { t0: GP, add: 1, g: 28, px: 60, c: ['#fff0a0', '#ff9a20', '#d83a0a'], floor: 0, fade: 0.9 }); S.scene.add(S.bspl);
      return S;
    },
    /* Skuespillet: én sammenhengende handling fra han ligger som en stein til han brøler. o.out (0..1) = spilleren har trykket Continue. */
    act(S, t, o) {
      const g = S.gr, U = K.U(), L = S.lava.material.uniforms, out = o.out || 0;
      /* Hvor han er: ligger halvt nede i lavaen, reiser seg (GU), og går to tunge steg opp på flaket (S1, S2). */
      const up = t < GU ? 0 : back(seg(t, GU + 0.12, GU + 1.05), 1.3), st1 = io(seg(t, 9.6, S1)), st2 = io(seg(t, 11.02, S2 + 0.05));
      const sink = -0.22 * sin(seg(t, GU - 0.3, GU + 0.12) * PI);                                     /* forvarsel: synker litt før han reiser seg */
      const ry = mix(-2.6, -1.6, up) + sink + 0.45 * st1 + 0.35 * st2 - 0.3 * sq(t, S1, 12, 5.5) - 0.34 * sq(t, S2, 11, 5) - 0.4 * sq(t, GP, 12, 5) + 0.12 * sq(t, GX, 14, 4);
      g.root.position.set((t < GU ? 0.035 * sin(t * 53) * (hit(t, GB[1], 0.5) + hit(t, GB[3], 0.4) + hit(t, GE, 0.5)) : 0), ry, 1.4 * st1 + 1.4 * st2);
      const curl = 1 - io(seg(t, GU + 0.1, GU + 1.2));
      g.add(CURL, curl + 0.1 * sin(seg(t, GU - 0.3, GU + 0.12) * PI));
      const br = t < GU ? 0.014 * sin(t * 1.5) : 0.024 * sin(t * 2.7); g.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0] }, 1);
      /* De tre raske slagene: klørne slår ut, halen pisker, kjeften knurrer. */
      g.add(FLEX, kf(t, [[GT[0] - 0.12, 0], [GT[0] + 0.06, 1, x => back(x, 2.4)], [GT[0] + 0.5, 0.25, io], [GT[1] + 0.3, 0]]) + 0.4 * hit(t, GB[3], 0.3) * (t < GE ? 1 : 0));
      const whip = sq(t, GT[1], 15, 3.2), sway = 1 - curl;
      for (let i = 1; i <= 5; i++) g.rot('Tail' + i, 0, 0.1 * whip, sway * 0.05 * sin(t * 2.1 + i * 0.55) + 0.34 * whip * sin(i * 0.9));
      const growl = kf(t, [[GT[2] - 0.12, 0], [GT[2] + 0.05, 1, x => back(x, 2)], [GT[2] + 0.36, 0.5], [S1 + 0.2, 0]]);
      g.add({ Jaw: [0, -0.36, 0], Head: [0, 0.1, 0], Neck2: [0, 0.06, 0] }, growl); g.rot('Jaw', 0, 0.03 * sin(t * 48) * growl, 0);
      /* Stegene: høyre fot løftes høyt og settes på flaket på S1; så dras kroppen opp over den mens venstre følger og lander på S2. */
      const rl = kf(t, [[9.5, 0], [9.9, 1.3, io], [S1, 1, ei], [11.02, 1], [S2, 0, io]]), ll = kf(t, [[10.92, 0], [11.2, 1.2, io], [S2, 0, ei]]);
      g.add({ RThigh: [0.62, 0, 0], RLeg: [0, -0.5, 0], RFoot: [0, -0.7, 0], Hips: [0, 0, 0.07], Spine2: [0, 0, -0.05] }, rl).add({ LThigh: [-0.62, 0, 0], LLeg: [0, -0.5, 0], LFoot: [0, -0.7, 0], Hips: [0, 0, -0.07], Spine2: [0, 0, 0.05] }, ll);
      const nod = 0.5 * sq(t, S1, 12, 5.5) + 0.7 * sq(t, S2, 11, 5); g.add({ Spine1: [0, -0.07, 0], Neck1: [0, -0.07, 0], Head: [0, -0.06, 0], '*Arm': [0.14, 0, 0.12] }, nod);
      /* Slaget (Precipice Blades): armene løftes sakte (forvarsel), litt til helt på slutten, og smeller ned på GP. */
      g.add(RAISE, kf(t, [[GV + 0.5, 0], [GA + 0.7, 1, io], [GP - 0.12, 1.14, io], [GP + 0.02, 0, ei]]));
      g.add(SLAM, kf(t, [[GP - 0.1, 0], [GP + 0.07, 1.15, eo], [GP + 0.5, 0.9, io], [GW + 0.2, 0.5, io], [GD, 0, io]]));
      /* Brølet: han dukker og trekker pusten, mer og mer, og kaster hodet opp forbi målet før det faller på plass. Kjeften dirrer mens han brøler. */
      g.add(DUCK, kf(t, [[GD, 0], [GD + 0.9, 0.75, io], [GI, 0.85], [GX - 0.3, 1.3, io], [GX - 0.03, 1.5, ei], [GX + 0.1, 0, eo]]) * (1 - out));
      const rw = max(t < GX ? 0 : back(seg(t, GX, GX + 0.3), 2.6) * (1 - 0.92 * io(seg(t, GX + 2.5, GX + 3.5))), out ? back(seg(out, 0, 0.3), 2.2) : 0);
      g.add(ROAR, rw); g.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); g.rot('Head', 0, 0, 0.022 * sin(t * 43) * rw); S.rw = rw;
      /* Øynene: lukket til GE, så åpne. Smale når han samler seg og brøler. Blunker mens han venter. */
      const bl = t > GX + 4 && (t - GX) % 4.4 < 0.12, eye = t < GE ? [0, 0.5] : t < GE + 0.07 || bl ? [0, 0.75] : (t > GD && t < GX + 3.2) || (t > GA + 0.5 && t < GW) || out ? [0, 0.75] : [0, 0];
      g.mats.Eye1.uniforms.uUvOff.value.set(eye[0], eye[1]); g.mats.Eye1.uniforms.uEmis.value = t < GE ? 0.15 : 0.55 + 0.45 * hit(t, GE, 1.4);
      /* Steinhuden og sømmene: lyset sprekker fram langs sømmene fra GB[2], huden slipper i flak når han reiser seg, og sømmene gløder igjen i brølet. */
      g.set('uStone', 1 - io(seg(t, GU + 0.25, GT[2]))); g.mats.Eye1.uniforms.uStone.value = 0;
      g.set('uCrack', max(t < GB[2] ? 0 : kf(t, [[GB[2], 0], [GB[2] + 0.08, 1], [GT[0], 1], [S1, 0]]), 0.85 * rw, 0.8 * hit(t, GP, 1.1)));
      g.set('uCrackR', t > S1 ? 40 : kf(t, [[GB[2], 0], [GB[3], 4.5, eo], [GE, 8.5, eo], [GU + 0.3, 30, io]])); g.set('uCrackO', [0, 6.4, -0.6]); g.set('uVor', t < GT[2] ? 1 : 0);
      /* Stedet lever med: lavaen blir varmere når han våkner, ringer i lavaen ved hvert nedslag, og lyset stiger. */
      const wake = seg(t, GE, GU + 1.2), X = g.root.position;
      L.uHeat.value = 0.9 + 0.28 * wake + 0.2 * hit(t, GX, 1.6) + 0.22 * hit(t, GP, 0.9) + 0.1 * out; U.uGlow.value = 0.7 + 0.4 * wake + 0.3 * rw;
      lerpC(U.uKeyC, '#a89488', '#fff0dc', wake); lerpC(U.uShC, '#3a2230', '#3c1a22', wake); U.uRimK.value = 0.75 + 0.25 * wake;
      const ring = (i, x, z, t0, v, d, a) => L.uRing.value[i].set(x, z, 1.5 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
      ring(0, 0, 0, t < GB[3] ? GB[1] : GB[3], 9, 1.5, 0.75); ring(1, 0, 0.5, t < S1 ? GU + 0.2 : S1, 16, 1.4, 1); ring(2, 0, 2, t < GP ? S2 : GP, 20, 1.5, 1); ring(3, X.x, X.z, GX, 30, 1.8, 1);
      L.uWade.value.set(X.x, X.z + 0.5, 8, t < GE ? 0.35 : 0.72);
      /* Støv, stein og sprut på nedslagene. */
      S.fx(S.spl[0], GU + 0.18, 0, 0, 0.6); S.fx(S.deb[0], GU + 0.3, 0, ry + 1, 0.4); S.fx(S.deb[1], GU + 0.85, 0, ry + 1.5, 0.6); S.fx(S.deb[2], GT[0], 0, ry + 2.5, 1.2);
      S.fx(S.dust[0], S1, -2.9, 0.2, 2.3); S.fx(S.dust[1], S2, 2.9, 0.2, 3.6); S.fx(S.dust[2], GP, 0, 0.2, 5.2); S.fx(S.spl[1], S1, -2.9, 0, 2.3); S.fx(S.spl[2], S2, 2.9, 0, 3.6); S.fx(S.spl[3], GP, 0, 0, 6.5);
      S.drip.position.set(X.x, ry, X.z); S.drip.visible = t > GU + 0.2 && t < S2; S.drip.material.uniforms.uPx.value = 60 * (1 - seg(t, GT[2], S2));
      for (let i = 0; i < NB; i++) { const b = blade(i), k = t < b.t ? 0 : back(seg(t, b.t, b.t + 0.17), 2); S.blades[i].position.set(b.x, -(b.h + 1) * (1 - k), b.z); S.blades[i].visible = k > 0; }
      const rt0 = t >= GX ? GX : GP, ra = t >= rt0 ? hit(t, rt0, t >= GX ? 1 : 0.7) : 0; S.ring.position.set(X.x, 1.1, X.z + 2); S.ring.scale.setScalar(3 + (t - rt0) * (t >= GX ? 42 : 30)); S.ring.material.uniforms.uA.value = ra; S.ring.visible = ra > 0;
      /* Til bakteppet: hvor sterkt utbruddet er, hvor lyst det er, og sola gjennom røyken (Drought) fra han våkner. */
      S.er = 0.3 + 0.4 * wake + 1.1 * hit(t, GV, 3) + 0.5 * hit(t, GP, 1.6) + 0.7 * hit(t, GX, 3) + 0.4 * out; S.lit = 0.55 + 0.45 * wake; S.sun = 0.45 * seg(t, GU, GV); S.wake = wake;
    },
    shots: [
      /* 1 Det vide bildet: krateret, vulkanen bak, og en grå stein midt i lavaen. Rolig innkjøring. */
      [0, (S, u, a, t) => { const e = io(u); K.cam(mix(-15, -7, e), mix(23, 18, e), mix(64, 50, e), 0, mix(13, 9, e), -40, 46); S.post.fade = 1 - seg(t, 0, 0.7); S.post.sh = 1.4 * hit(t, GB[1], 0.4); }],
      /* 2 Steinhuden på ryggen: lyset sprekker fram langs sømmene. */
      [GB[2], (S, u, a, t) => { const p = S.gr.at('Spine3'); K.cam(p.x - 5.6 + u * 1.6, p.y + 4.2, p.z - 5.4, p.x + 0.4, p.y + 0.3, p.z + 0.4, 34, 0.08); S.post.sh = 1 * hit(t, GB[2], 0.3); }],
      /* 3 Klørne: lyset løper ned armen, og en klo rykker til. */
      [GB[3], (S, u, a, t) => { const p = S.gr.at('LFingerB'); K.cam(p.x + 3.6, p.y + 1.1 - u * 0.4, p.z + 3.8, p.x - 0.2, p.y + 0.1, p.z, 30, -0.05); S.post.sh = 1 * hit(t, GB[3], 0.3); }],
      /* 4 Øyet åpner seg (helt nært). */
      [GE - 0.34, (S, u, a, t) => { const e = S.W('Head', S.A.eye), c = S.W('Head', S.A.eyeCam); K.cam(mix(c.x, e.x, 0.12 * u), c.y, mix(c.z, e.z, 0.12 * u), e.x, e.y, e.z, 24); S.post.fl = 0.75 * hit(t, GE, 0.22); S.post.flc = '#ffe890'; S.post.sh = 2 * hit(t, GE, 0.35); S.post.vig = 0.9; }],
      /* 5 Han reiser seg (nedenfra): steinhuden sprekker av, lavaen renner. */
      [GU, (S, u, a, t) => { const p = S.gr.root.position; K.cam(5.2 - u * 1.2, 1.3, 12.8 - u, 0, p.y + 5.6 + u * 0.8, 0.4, 54, -0.07); S.post.sh = 2.2 * hit(t, GU + 0.2, 0.9) + 1 * hit(t, GU + 0.85, 0.5); S.post.heat = 1; S.post.heatY = 50; }],
      /* 6–8 Tre raske: klørne, halen, kjeften. */
      [GT[0] - 0.05, (S, u, a, t) => { const p = S.gr.at('RFingerB'); K.cam(p.x - 2.6, p.y - 0.9, p.z + 4.8, p.x + 0.7, p.y + 0.5, p.z, 36, 0.1); S.post.sh = 1.6 * hit(t, GT[0], 0.3); }],
      [GT[1] - 0.05, (S, u, a, t) => { const p = S.gr.at('Tail3'); K.cam(p.x - 7.4, p.y + 1.6, p.z - 6.2, p.x, p.y + 0.5, p.z + 1, 40, -0.08); S.post.sh = 1.6 * hit(t, GT[1], 0.3); }],
      [GT[2] - 0.05, (S, u, a, t) => { const e = S.W('Jaw', S.A.jaw), c = S.W('Jaw', S.A.jawCam); K.cam(c.x, c.y, c.z, e.x, e.y, e.z, 30, 0.06); S.post.sh = 1.4 * hit(t, GT[2], 0.3); }],
      /* 9 Første steg: foten kommer ned på flaket (på slaget). Støv, risting. */
      [9.94, (S, u, a, t) => { K.cam(-7.6 + u * 0.5, 1.1, 6.6, -2.9, 1 - 0.2 * u, 1.9, 36, 0.04); S.post.sh = 3 * hit(t, S1, 0.5); }],
      /* 10 Andre steg, nedenfra: hele kroppen heves opp på flaket og fjærer. */
      [11.0, (S, u, a, t) => { const p = S.gr.root.position; K.cam(2.8, 1.35, 14.4 - u * 0.8, 0, p.y + 4.9, 3, 50, 0.05); S.post.sh = 3 * hit(t, S2, 0.55); }],
      /* 11 Motlys: lavt og langt foran, med vulkanen som får utbrudd rett bak ham. */
      [GV, (S, u, a, t) => { K.cam(2 - u * 2, 1.6, 32 - u * 2.5, -1.5, 9, 0, 44); S.post.sh = 1.8 * hit(t, GV, 0.8); S.post.fl = 0.25 * hit(t, GV, 0.4); S.post.flc = '#ffb050'; }],
      /* 12 Armene løftes (forvarsel). */
      [GA, (S, u) => { const p = S.gr.root.position; K.cam(-8.2 + u, 1.6, 12.2, 0, p.y + 5.9, 3.4, 42, -0.06); }],
      /* 13 Slaget: steinspydene skyter opp mot kameraet, ett for ett. */
      [GP - 0.04, (S, u, a, t) => { K.cam(0.7, 1.5, 53.2, 0, 5, 3, 50, 0.04); S.post.sh = 3.5 * hit(t, GP, 0.5) + 1.6 * hit(t, GP + 0.5, 0.6); S.post.fl = seg(t, GW - 0.16, GW - 0.02); S.post.flc = '#fff4d0'; S.post.spd = hit(t, GP, 0.45); S.post.spx = 128; S.post.spy = 110; }],
      /* 14 Det andre vide bildet: spydene står i en vifte, og vulkanen raser. */
      [GW, (S, u, a, t) => { K.cam(34 - u * 3, 27, 46, 0, 5, 14, 46); S.post.fl = 1 - seg(t, GW, GW + 0.25); S.post.flc = '#fff4d0'; S.post.sh = 1.2 * hit(t, GW, 0.6); }],
      /* 15 Ansiktet: øynene smalner, han dukker. */
      [GD, (S, u) => { const e = S.W('Head', S.A.eye), c = S.W('Head', S.A.eyeCam); K.cam(mix(c.x, e.x, -0.5) + 0.6, c.y + 0.2, mix(c.z, e.z, -0.5), e.x - 0.5, e.y - 0.3, e.z, 34, -0.05); }],
      /* 16 Han trekker pusten (nedenfra, kameraet kjører inn). */
      [GI, (S, u) => { const h = S.gr.at('Head'), e = ei(u); K.cam(-3.6 + e, 1.1, 13.4 - e * 2.4, h.x, h.y - 0.6, h.z, 46 - e * 6, 0.07); S.post.sh = 0.8 * e; }],
      /* 17 Brølet. */
      [GX, (S, u, a, t) => { const h = S.gr.at('Head'); K.cam(4.6, 1.15, 13.2, h.x * 0.5, h.y - 1.4, h.z - 1.5, 52, -0.09); S.post.sh = 4 * hit(t, GX, 1.1) + 0.8; S.post.spd = 0.9 * hit(t, GX, 0.9); S.post.spx = 118; S.post.spy = 62; S.post.spr = 0.36; S.post.fl = 0.6 * hit(t, GX, 0.18); S.post.flc = '#fff0c0'; S.post.heat = 1; S.post.heatY = 70; }],
      /* 18 Navnet og nivået: halvnært, kameraet glir sakte rundt ham mens han venter. */
      [GX + 1.25, (S, u, a, t) => { const w = 0.34 + 0.1 * sin(a * 0.23); K.cam(sin(w) * 14, 2.4 + 0.3 * sin(a * 0.31), 2.8 + cos(w) * 14, 0, 4.9, 3.4, 42, -0.02); S.post.sh = 0.8 * S.rw; }],
    ],
  });

  /* Navnet og nivået, i samme lave oppløsning (256 × 192). Det viktige ligger innenfor x 32–224, som er det en smal skjerm viser. */
  const plate = (x, t, o) => {
    const a = t - (GX + 0.6); if (a < 0) return false;
    const f = C.fontN(), nm = String(o.name || 'Groudon').toUpperCase(), k = eo(c01(a / 0.2)), w = Math.round(256 * k), jolt = a < 0.3 ? Math.round(2 * (1 - a / 0.3) * (floor(a * 60) % 2 ? 1 : -1)) : 0;
    x.fillStyle = '#170709'; x.fillRect(0, 141, w, 42); x.fillStyle = '#ff8a1a'; x.fillRect(0, 140, w, 1); x.fillStyle = '#7a1c0a'; x.fillRect(0, 183, w, 1);
    if (a < 0.1) return true;
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.font = `${f[1]}8px ${f[0]}`; x.fillStyle = '#ffb060'; x.fillText(String(o.cap || 'Legendary Pokémon').toUpperCase(), 36, 151 + jolt);
    const gr = x.createLinearGradient(0, 157, 0, 179); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.42, '#fff2b0'); gr.addColorStop(0.43, '#ffa828'); gr.addColorStop(0.74, '#ffa828'); gr.addColorStop(0.75, '#f0541a'); gr.addColorStop(1, '#f0541a');
    x.font = `${f[1]}32px ${f[0]}`; x.fillStyle = a < 0.16 ? '#ffffff' : gr; x.fillText(nm, 35, 179 + jolt); x.font = `${f[1]}16px ${f[0]}`;
    if (o.lv && a > 0.42) { x.textAlign = 'right'; x.fillStyle = a < 0.5 ? '#ffffff' : '#ffe8c0'; x.fillText('Lv.' + o.lv, 222, 178); }
    return true;
  };

  /* Bakteppet, tegnet i 2D med verktøykassa fra steg 2 (de samme tegnerne som arenaen i raid2.js): nattehimmel som gløder nedenfra, askeskyer lyst opp av
     lavaen, sola som en hard skive gjennom røyken (Drought), og vulkanen med elver, utbrudd og askesky. Det tegnes i vinkelmål rundt horisonten (UR enheter per
     radian) og festes til 3D-kameraet (G3D.view), så det følger alle kamerabevegelser. Gir solas plass på skjermen (til lysstrålene). */
  const VOL = { x: -40, z: -330, r: 290, h: 150 }, UR = 560, wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  const backdrop = (S, t) => {
    const g = C.g, v = G3D.view(), k = v.ppr / UR, er = S.er, lit = S.lit, sun = S.sun, bl = C.blend;
    g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
    const gr = g.createLinearGradient(0, -UR * 1.05, 0, 10); gr.addColorStop(0, '#050203'); gr.addColorStop(0.55, bl('#0e0506', '#1d0807', lit)); gr.addColorStop(0.84, bl('#1a0706', '#571607', lit)); gr.addColorStop(1, bl('#3a0e06', '#c8480e', lit * (0.75 + 0.25 * min(1, er))));
    g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 4012); g.fillStyle = bl('#3a0e06', '#b03c0c', lit * 0.8); g.fillRect(-4000, 10, 8000, 4000);
    const dx = VOL.x - v.cx, dz = VOL.z - v.cz, d = Math.hypot(dx, dz), X = wrap(Math.atan2(dx, -dz) - v.yaw) * UR, e0 = Math.atan2(-v.cy, d), yb = -e0 * UR, hh = (Math.atan2(VOL.h - v.cy, d) - e0) * UR, ww = 2 * Math.atan2(VOL.r, d) * UR, sx = X + ww * 0.3, sy = yb - hh * 1.3;
    if (sun > 0.01) { C.blob(sx, sy, 130 + 40 * sun, '#ff8a2a', 0.3 * sun, 1); C.blob(sx, sy, 46, '#ffe9b0', 0.7 * sun, 1); C.blob(sx, sy, 15, '#ffffff', sun, 1); C.blob(sx, sy, 210, '#ffd9a0', 0.3 * sun, 1, 0.035); }
    for (let i = 0; i < 18; i++) { const x = wrap(rnd(i, 3) * TAU + t * (0.004 + rnd(i, 4) * 0.004) - v.yaw) * UR, y = -(36 + rnd(i, 5) * 250), r = 70 + rnd(i, 6) * 90; if (abs(x) > 760) continue; C.blob(x, y, r, bl('#120a0b', '#241517', lit), 0.86, 0, 0.42); C.blob(x + 8, y + r * 0.26, r * 0.86, '#c8400c', (0.16 + 0.24 * min(1.2, er)) * lit, 1, 0.24); }
    if (abs(X) < 1000) { const q = hh / 92;
      C.blob(X, yb - hh * 0.85, hh * 1.6, '#ff4a10', (0.08 + 0.12 * min(1.3, er)) * lit, 1, 0.8);
      const cr = C.volcano(X, yb + 3, ww, hh, { seed: 7, c0: bl('#0c0607', '#2a1413', lit), c1: bl('#070405', '#120809', lit), lava: 0.35 + 0.65 * min(1, er * 1.3), er, t, rivers: 5 });
      C.plume(cr.x, cr.y + 2, { n: 38, h: 210 * q, w0: 11 * q, w1: 92 * q, wind: 0.62 + 0.2 * er, seed: 5, spd: 0.04 + 0.035 * er, c: bl('#1a1112', '#3d2c29', lit), top: '#0c0708', hot: er > 0.2 ? '#f0540e' : '#6a1c08', ha: 0.5 + 0.5 * min(1, er), a: 0.66 + 0.34 * min(1, er * 1.4), t });
      C.erupt(cr.x, cr.y + 4, er, { n: 30 + floor(30 * min(1.4, er)), hgt: 96 * q, t }); }
    g.restore();
    const ca = cos(v.ang), sa = sin(v.ang); return { x: v.x + k * (sx * ca - sy * sa), y: v.y + k * (sx * sa + sy * ca), hz: v.y };
  };

  /* Filmene i CINE: samme grensesnitt som sprite-filmene (CINE.still, CINE.play), så verktøyene og avspilleren virker likt. gl: 1 = bildet går gjennom
     etterbehandlingen i fxgl.js (glød, varmeflimmer, lysstråler, fargetone, vignett), som filmene og arenaene fra steg 2. */
  const reg = (id, over) => { const inf = G3D.info(id); C.film(id, { len: inf.len, R: inf.R, at: inf.at, hold: inf.hold, c3: 1, gl: 1, spid: 383, outc: '#ffffff', cues: [[inf.R, 'cry'], [S1, 'thud'], [S2, 'thud'], [GP, 'boom']], pre: () => G3D.ready(id),
    draw(t, P, cur) { const g = C.g, c = G3D.isReady(id) ? G3D.frame(id, t, cur, CINE._.rs()) : null; if (!c) { CINE.err = 'g3d: ' + (G3D.err || 'not ready'); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 384); return; } if (G3D.err) CINE.err = G3D.err;
      const S = G3D.S(id), q = G3D.post(id), sn = backdrop(S, t);
      g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, 512, 384);
      if (over && !(G3D.out > 0.3)) { g.imageSmoothingEnabled = false; g.drawImage(G3D.text(x => over(x, t, cur)), 0, 0, 512, 384); g.imageSmoothingEnabled = true; }
      P.sh = q.sh * 2; P.fl = q.fl; P.fc = q.flc; P.fade = q.fade; P.fadec = q.fadec;
      P.bloom = 0.4 + 0.1 * S.wake + 0.14 * (S.rw || 0); P.bloomT = 0.74; P.heat = 1.3 + 1.3 * S.wake + 2.2 * q.heat; P.heatY = sn.hz; P.heatUp = 100; P.heatDn = 170;
      P.vig = 0.34 + 0.4 * q.vig; P.vigc = '#140402'; P.grain = 0.035; P.grade = { tint: [1.04, 0.985, 0.93], con: 1.07, sat: 1.05, exp: 1.02 };
      if (S.sun > 0.3 && sn.y > -80 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.7 * (S.sun - 0.3), len: 0.85 }; } }); };
  reg('c3:383', plate);
})();
