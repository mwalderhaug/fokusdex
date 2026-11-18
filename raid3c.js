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
    S.embers = add(K.pts(200, i => ({ p: [(rnd(i, 1) - 0.5) * 130, rnd(i, 2) * 3, (rnd(i, 3) - 0.5) * 130], v: [(rnd(i, 4) - 0.5) * 1.6, 2.2 + rnd(i, 5) * 3.4, (rnd(i, 6) - 0.5) * 1.6], b: rnd(i, 7) * 9, l: 5 + rnd(i, 8) * 4, z: 1.1 + rnd(i, 9) * 1.4 }), { loop: 1, add: 1, px: 60, sway: 0.9, near: 7, c: ['#fff0a0', '#ff9a20', '#c0300a'], fade: 0.8 }));
    S.dust = [0, 1, 2].map(k => add(K.pts(22, i => { const a = rnd(i, 60 + k) * TAU, v = 1.6 + rnd(i, 61 + k) * 3.2; return { p: [cos(a) * 1.5, 0.3, sin(a) * 1.5], v: [cos(a) * v, 1.6 + rnd(i, 62 + k) * 3, sin(a) * v], b: rnd(i, 63) * 0.1, l: 1 + rnd(i, 64) * 0.8, z: 3 + rnd(i, 65) * 3 }; }, { t0: -1e5, shade: 1, drag: 1.4, sz0: 0.5, sz1: 2, px: 60, c: ['#ffb470', '#8a4026', '#2c1816'], a: 0.55, fade: 0.35 })));
    S.deb = [0, 1, 2].map(k => add(K.pts(34, i => ({ p: [(rnd(i, 70 + k) - 0.5) * 5.5, rnd(i, 71 + k) * 5, (rnd(i, 72 + k) - 0.5) * 5], v: [(rnd(i, 73 + k) - 0.5) * 11, 2 + rnd(i, 74 + k) * 7, (rnd(i, 75 + k) - 0.5) * 9 + 2], b: rnd(i, 76) * 0.22, l: 1.1 + rnd(i, 77) * 0.7, z: 0.4 + rnd(i, 78) * 0.75 }), { t0: -1e5, pix: 1, g: 24, px: 60, c: ['#9a8aa2', '#74627e', '#4c3c56'], id: 201, floor: 0.05, fade: 0.92 })));
    S.spl = [0, 1, 2, 3].map(k => add(K.pts(46, i => { const a = rnd(i, 80 + k) * TAU, v = 2 + rnd(i, 81 + k) * 6; return { p: [cos(a) * (k ? 1.4 : 3.4), 0.1, sin(a) * (k ? 1.4 : 3)], v: [cos(a) * v, 6 + rnd(i, 82 + k) * 9, sin(a) * v], b: rnd(i, 83) * 0.2, l: 0.9 + rnd(i, 84) * 0.6, z: 0.8 + rnd(i, 85) * 1.1 }; }, { t0: -1e5, add: 1, g: 26, px: 60, c: ['#fff0a0', '#ff9a20', '#d83a0a'], floor: 0, fade: 0.85 })));
    S.drip = add(K.pts(40, i => ({ p: [(rnd(i, 90) - 0.5) * 5.4, 1.2 + rnd(i, 91) * 4.6, (rnd(i, 92) - 0.5) * 4.4], v: [0, -0.6, 0], b: rnd(i, 93) * 1.2, l: 0.6 + rnd(i, 94) * 0.5, z: 0.5 + rnd(i, 95) * 0.5 }), { loop: 1, add: 1, g: 20, px: 60, c: ['#ffe070', '#ff8a18', '#d83a0a'], floor: 0, fade: 0.95 }));
    S.ring = add(K.light(0, '#ffd070'));
    S.fx = (pts, t0, x, y, z) => { pts.position.set(x, y, z); pts.material.uniforms.uT0.value = t0; };
    return S;
  }

  /* ---------- Vulkanen bak kraterkanten (felles for introen og Primal-forvandlingen) ----------
     Fjellet i 3D med lavaelver, glør som kastes opp av krateret i små støt (spat), og til utbruddet: fontenen (fnt), blokkene (boom), askeskyen (ash), blinket (flash)
     og lavabomber som regner ned over sjøen (rain). Røyksøylen tegnes i 2D bak (backdrop). volcAct(S, t, er, tb): er = hvor aktiv den er (0,3 ryker · 0,6 urolig ·
     1 og over er utbrudd), tb = tidspunktet den eksploderer (eller −1). Jazz 18.11 (runde 4): i introen ryker den og ser aktiv ut; utbruddet hører til Primal-forvandlingen. */
  const VOL = { x: -40, z: -330, r: 250, h: 138 }, HOME = [0, -1, 2.8];
  function volcano(S, T, big, V) {
    V = S.V = V || VOL; const at = m => { m.position.set(V.x, V.h, V.z); S.scene.add(m); return m; }, hot = ['#fff2a8', '#ffa020', '#c83008'];
    S.vol = K.volcano({ r: V.r, h: V.h, seed: 5 }); S.vol.position.set(V.x, -2, V.z); S.scene.add(S.vol);
    S.vspat = at(K.pts(54, i => { const a = rnd(i, 41) * TAU, q = rnd(i, 42); return { p: [cos(a) * 7 * q, -5, sin(a) * 7 * q], v: [cos(a) * (3 + 15 * q), 24 + rnd(i, 43) * 30, sin(a) * (3 + 15 * q)], b: (i % 2) * 2.6 + rnd(i, 44) * 0.35, l: 5.2, z: 4 + rnd(i, 45) * 5 }; }, { loop: 1, add: 1, g: 28, px: 150, floor: -7, c: hot, fade: 0.45 }));
    S.vflash = at(K.light(1, '#ffd890', { depth: false })); S.vflash.renderOrder = 6;
    if (!big) return;
    S.vfnt = at(K.pts(180, i => { const a = rnd(i, 11) * TAU, q = rnd(i, 12); return { p: [cos(a) * 8 * q, -4, sin(a) * 8 * q], v: [cos(a) * (9 + 52 * q), 54 + rnd(i, 14) * 86, sin(a) * (9 + 52 * q)], b: rnd(i, 16) * 3.6, l: 2.8 + rnd(i, 17) * 1.4, z: 2.6 + rnd(i, 18) * 4 }; }, { loop: 1, add: 1, g: 30, px: 150, c: hot, fade: 0.8 }));
    S.vboom = at(K.pts(250, i => { const a = rnd(i, 21) * TAU, q = 0.25 + rnd(i, 22) * 0.75, el = 0.35 + rnd(i, 23) * 1.1; return { p: [cos(a) * 10, -3, sin(a) * 10], v: [cos(a) * cos(el) * 160 * q, sin(el) * 185 * q, sin(a) * cos(el) * 160 * q], b: rnd(i, 24) * 0.3, l: 3.6 + rnd(i, 25) * 1.8, z: 3.5 + rnd(i, 26) * 7 }; }, { t0: -1e5, add: 1, g: 34, px: 150, sz0: 1.2, sz1: 0.5, c: ['#fffbe0', '#ffb030', '#b82a08'], fade: 0.75 }));
    S.vboom2 = at(K.pts(160, i => { const a = rnd(i, 121) * TAU, q = 0.3 + rnd(i, 122) * 0.7, el = 0.2 + rnd(i, 123) * 1.0; return { p: [cos(a) * 12, -2, sin(a) * 12], v: [cos(a) * cos(el) * 210 * q, sin(el) * 150 * q, sin(a) * cos(el) * 210 * q], b: rnd(i, 124) * 0.25, l: 3.2 + rnd(i, 125) * 1.6, z: 3.5 + rnd(i, 126) * 7 }; }, { t0: -1e5, add: 1, g: 34, px: 150, sz0: 1.2, sz1: 0.5, c: ['#fffbe0', '#ffb030', '#b82a08'], fade: 0.75 }));
    S.vash = at(K.pts(160, i => { const a = rnd(i, 31) * TAU, q = 0.2 + rnd(i, 32) * 0.8, el = 0.2 + rnd(i, 33) * 1.25; return { p: [cos(a) * 14, 0, sin(a) * 14], v: [cos(a) * cos(el) * 84 * q, sin(el) * 86 * q + 12, sin(a) * cos(el) * 84 * q], b: rnd(i, 34) * 1.4, l: 8 + rnd(i, 35) * 5, z: 70 + rnd(i, 36) * 100 }; }, { t0: -1e5, shade: 1, drag: 1.5, sz0: 0.35, sz1: 1.8, px: 150, c: ['#ffa850', '#5a2c20', '#170d0f'], a: 0.85, fade: 0.55 }));
    /* Lavabomber som regner ned over sjøen etter eksplosjonen: glødende klumper med hale, fra høyt oppe bak og inn mot kameraet. */
    S.vrain = K.pts(110, i => { const x = (rnd(i, 51) - 0.5) * 150, z = -70 + rnd(i, 52) * 110; return { p: [x - 12, 95 + rnd(i, 53) * 50, z - 42], v: [5 + rnd(i, 54) * 9, -34 - rnd(i, 55) * 18, 16 + rnd(i, 56) * 12], b: 0.8 + rnd(i, 57) * 5.5, l: 3.4, z: 2.2 + rnd(i, 58) * 3.4 }; }, { t0: -1e5, add: 1, g: 9, px: 110, floor: 0, sz0: 1, sz1: 1.25, c: ['#fff6c8', '#ffb234', '#e84a0c'], fade: 0.97 }); S.scene.add(S.vrain);
  }
  function volcAct(S, t, er, tb, tf) {
    const b = tb >= 0 && t >= tb, k = min(1.6, er);
    S.er = er; S.boom = b ? hit(t, tb, 3.4) : 0; S.vol.material.uniforms.uEr.value = er;
    S.vspat.material.uniforms.uPx.value = 300 * (0.5 + 0.5 * k); S.vspat.material.uniforms.uA.value = c01(0.2 + er * 0.9);
    K.face(S.vflash); const fl = max(b ? 0.75 * hit(t, tb, 0.45) : 0, 0.22 * max(0, min(er, 1.2) - 0.3) * (0.7 + 0.3 * sin(t * 2.3))); S.vflash.scale.setScalar(b && t < tb + 0.45 ? 60 + 260 * eo(seg(t, tb, tb + 0.25)) : 46 + 30 * k); S.vflash.material.uniforms.uA.value = fl; S.vflash.visible = fl > 0.01;
    if (!S.vfnt) return;
    const f0 = tf == null ? tb : tf, f = t >= f0 ? c01((t - f0) / 0.5) : 0; S.vfnt.visible = f > 0; S.vfnt.material.uniforms.uPx.value = 300 * (0.5 + 0.6 * k); S.vfnt.material.uniforms.uA.value = f * 0.85;
    for (const q of [S.vboom, S.vash, S.vrain]) q.material.uniforms.uT0.value = b ? tb : -1e5; S.vboom2.material.uniforms.uT0.value = b ? tb + 0.7 : -1e5;
  }

  /* ---------- Groudon våkner (introen før raidet) ----------
     Jazz 18.11 (fjerde runde), som i Omega Ruby: han står allerede, HELT grå og stiv. Det gule lyset tennes i steinen og gløder sterkere og sterkere, øyet åpner seg,
     og så knuses alt med én gang: steinhuden sprenges av i brølet, og han er rød fra første bilde. Ingen bevegelse før det (armene som rykket til, så rare ut).
     Vulkanen ryker og er urolig, men bryter ikke ut her: utbruddet er spart til Primal-forvandlingen. Åpningen er kortere enn før: låta starter 2,48 s inne (A0).
     Slagene i låta (Primal Kyogre & Groudon, en takt er 1,23 s; filmens tid = låtas tid − A0): lyset tennes og brer seg på fire slag (GL; bandet kommer inn på det
     andre), øyet på de tre raske (GT), steinen sprenges der låta løfter seg (GC), så motlyset (GV), slaget (GP) og det siste brølet (GX). */
  const A0 = 2.48, mb = x => Math.round((x - A0) * 100) / 100;
  const GL = [4.01, 5.26, 6.49, 7.72].map(mb), GT = [8.46, 8.93, 9.54].map(mb), GC = mb(10.16), GV = mb(12.63), GA = mb(13.87), GP = mb(15.05), GW = mb(16.30), GD = mb(17.53), GX = mb(19.97);
  const STAT = { Neck1: [0, -0.16, 0], Neck2: [0, -0.06, 0], Head: [0, -0.12, 0], Spine2: [0, -0.05, 0], '*Arm': [0.12, -0.25, 0.18] };                 /* statuen: hodet senket, armene inntil */
  /* Brølet (Jazz sitt referanseark 18.11): brystet fram, ryggen i bue, skuldrene bakover, armene ut med åpne klør, kjeften helt opp, beina plantet. */
  const ROAR = { Neck1: [0, 0.28, 0], Neck2: [0, 0.2, 0], Head: [0, 0.15, 0], Jaw: [0, -0.82, 0], Spine1: [0, 0.06, 0], Spine2: [0, 0.14, 0], Spine3: [0, 0.1, 0], Hips: [0, -0.05, 0], Tail2: [0, 0.12, 0], Tail3: [0, 0.12, 0], Tail4: [0, 0.12, 0], '*Arm': [0.25, 0.35, -0.8], '*Hand': [0.55, 0, -0.15] };
  const DUCK = { Neck1: [0, -0.2, 0], Neck2: [0, -0.1, 0], Head: [0, -0.14, 0], Spine2: [0, -0.1, 0], Spine3: [0, -0.06, 0], '*Arm': [0, -0.3, 0.2] };
  const RAISE = { '*Arm': [-0.9, 0.3, -0.3], Spine2: [0, 0.12, 0], Spine3: [0, 0.1, 0], Neck1: [0, 0.14, 0], Head: [0, 0.1, 0], Jaw: [0, -0.25, 0] };
  const SLAM = { '*Arm': [0.5, 0, 0.3], Spine1: [0, -0.14, 0], Spine2: [0, -0.2, 0], Spine3: [0, -0.16, 0], Neck1: [0, -0.1, 0], Head: [0, 0.12, 0], Jaw: [0, -0.4, 0] };
  const sq = (t, t0, f, d) => { const a = t - t0; return a < 0 ? 0 : Math.exp(-(d || 6) * a) * cos((f || 13) * a); };   /* fjæringen etter et nedslag */
  const NB = 10, blade = i => ({ x: (i % 2 ? 1 : -1) * (5.6 + i * 0.55), z: 15 + i * 4, h: 6.5 + i * 1.15, r: 1 + i * 0.09, t: GP + 0.07 + i * 0.105 });
  const col3 = (u, k, a, b, c) => { if (k < 0.5) lerpC(u, a, b, k * 2); else lerpC(u, b, c, k * 2 - 2 + 1); };
  /* Brølets effekt (Jazz 18.11: «ikke tykke streker»): tynne gnister ut fra kjeften, lydbølger som brer seg fra den (forvrengningsringer i fxgl.js) og et rykk i bildet. */
  const mouth = (S, t0, t) => { const j = S.gr.at('Jaw'), m = K.proj(j.x, j.y, j.z); S.post.spx = m.x / 2; S.post.spy = m.y / 2; S.post.spr = 0.1; S.post.spd = 0.9 * S.rw * hit(t, t0, 2.4); S.mouth = m; };
  const roarFx = (S, t, P, t0) => { const a = t - t0, m = S.mouth; if (a < 0 || a > 2.9 || !m || m.z >= 1 || !(S.rw > 0.05)) return; const sk = P.shock || (P.shock = []);
    for (let i = 0; i < 3; i++) { const ph = (a / 0.72 + i / 3) % 1; if (a - ph * 0.72 < -0.01) continue; sk.push({ x: m.x, y: m.y, r: 14 + ph * 300, w: 26, a: 20 * (1 - ph) * S.rw }); }
    P.bulge = { x: m.x, y: m.y, r: 210, a: 0.2 * hit(t, t0, 0.3) }; };
  /* Hvor på kroppen steinhuden sitter: benene i en gitt stilling, i verden. Brukes til å la flak og støv starte på kroppen. */
  const SHELL = ['Head', 'Head', 'Neck1', 'Spine3', 'Spine3', 'Spine2', 'Spine2', 'Spine1', 'Hips', 'LArm', 'RArm', 'LHand', 'RHand', 'LThigh', 'RThigh', 'LLeg', 'RLeg', 'Tail1', 'Tail2', 'Tail3'];
  const bodyPts = (g, pose) => { g.clear(); if (pose) g.add(pose, 1); g.root.position.set(HOME[0], HOME[1], HOME[2]); g.apply(); const r = SHELL.filter(n => g.bones[n]).map(n => g.at(n).toArray()); g.clear(); g.apply(); return r; };

  G3D.def('c3:383', {
    len: mb(21.7), hold: 1, R: GX, at: A0, models: ['groudon'],
    make(K, T) {
      const S = crater(T), g = S.gr = K.figure(K.model('groudon')); S.scene.add(g.root); S.figs.push(g);
      /* Hodekameraet: øyet og kameraplassen målt i hvilestillingen og festet til hodebenet, så nærbildet følger hodet uansett pose. */
      g.clear(); g.apply(); const loc = (b, x, y, z) => g.bones[b].worldToLocal(new T.Vector3(x, y, z));
      g.set('uSeam', 0.22); g.set('uHead', [2.2, 4.2, 1]);   /* aldri lys i hodet: en gul strek over øyet fikk ham til å se trist ut (Jazz 18.11) */
      g.set('uGl', 0.5); g.set('uStoneC', '#9a909e'); g.set('uWk', 0.7);         /* han skal være RØD når steinen er borte, ikke gul av gløden nedenfra */
      S.A = { eye: loc('Head', 0.9, 6.02, 4.75), eyeCam: loc('Head', 3.5, 6.5, 6.9) }; S.W = (b, v) => g.bones[b].localToWorld(v.clone());
      const sm = K.rockMat({ a: '#2a1a1a', b: '#4a302a', str: 0.4, sm: 0.35 });
      S.blades = []; for (let i = 0; i < NB; i++) { const b = blade(i), m = K.spike(b.h, b.r, 500 + i, { n: 7, mat: sm }); m.rotation.set(-0.12 - rnd(i, 7) * 0.1, rnd(i, 8) * 6, (i % 2 ? -1 : 1) * 0.14); S.scene.add(m); S.blades.push(m); }
      S.bspl = K.pts(NB * 9, i => { const b = blade(floor(i / 9)), a = rnd(i, 3) * TAU; return { p: [b.x + cos(a) * b.r, 0.1, b.z + sin(a) * b.r], v: [cos(a) * (2 + rnd(i, 4) * 5), 7 + rnd(i, 5) * 9, sin(a) * (2 + rnd(i, 6) * 5)], b: b.t - GP + rnd(i, 7) * 0.08, l: 0.8 + rnd(i, 8) * 0.5, z: 0.9 + rnd(i, 9) * 1.1 }; }, { t0: GP, add: 1, g: 28, px: 60, c: ['#fff0a0', '#ff9a20', '#d83a0a'], floor: 0, fade: 0.9 }); S.scene.add(S.bspl);
      /* Steinhuden som sprenges av: ekte biter i 3D (piksler som ham) fra hele kroppen, slynget ut fra kroppens akse, opp og mot kameraet. Noen få store, mange små,
         og et gråbrunt støv som blir hengende rundt ham et øyeblikk (som i Omega Ruby). */
      const B = bodyPts(g, STAT);
      S.shell = K.shards(72, i => { const c = B[i % B.length], a = rnd(i, 3) * TAU, big = i % 8 === 3, el = 0.1 + rnd(i, 4) * 1.05, v = (big ? 6 : 8) + rnd(i, 5) * 13, dx = c[0] - HOME[0], dz = c[2] - HOME[2], dl = Math.hypot(dx, dz), ux = (dl > 0.6 ? dx / dl : 0) * 0.55 + cos(a) * 0.8, uz = (dl > 0.6 ? dz / dl : 0) * 0.55 + sin(a) * 0.8;
        return { p: [c[0] + ux * 0.9, c[1] + (rnd(i, 6) - 0.3) * 1.3, c[2] + uz * 0.9], v: [ux * v * cos(el) * (big || c[1] > 4.6 ? 1.5 : 1), 3 + sin(el) * v, c[1] > 4.6 ? -abs(uz) * v * cos(el) * 0.7 - 2 : uz * v * cos(el) + (big ? -1 : 2.5)], r: [(rnd(i, 7) - 0.5) * 13, (rnd(i, 8) - 0.5) * 13, (rnd(i, 9) - 0.5) * 13], s: rnd(i, 10), b: rnd(i, 11) * (i % 4 === 0 ? 0.4 : 0.07), l: 2.6, z: big ? 0.55 + rnd(i, 12) * 0.4 : 0.2 + rnd(i, 13) * 0.38 }; }, { c: '#b6acba' }); S.scene.add(S.shell);
      S.aura = K.light(1, '#ffc23a'); S.scene.add(S.aura);   /* gløden rundt ham mens lyset i steinen stiger */
      S.puff = K.pts(52, i => { const c = B[i % B.length], a = rnd(i, 21) * TAU, v = 2 + rnd(i, 22) * 5.5; return { p: [c[0] + cos(a) * 0.8, c[1], c[2] + sin(a) * 0.8], v: [cos(a) * v, 0.6 + rnd(i, 23) * 2.8, sin(a) * v + 1], b: rnd(i, 24) * 0.25, l: 1.3 + rnd(i, 25) * 1, z: 3.2 + rnd(i, 26) * 4.2 }; }, { t0: -1e5, shade: 1, drag: 1.5, sz0: 0.4, sz1: 1.9, px: 60, c: ['#d2c8d0', '#8e8290', '#4c4250'], a: 0.5, fade: 0.25 }); S.scene.add(S.puff);
      volcano(S, T, 0);
      return S;
    },
    /* Skuespillet: én sammenhengende handling. Han står hele tiden på samme sted, med lavaen til leggene. o.out (0..1) = spilleren har trykket Continue. */
    act(S, t, o) {
      const g = S.gr, U = K.U(), L = S.lava.material.uniforms, out = o.out || 0, live = io(seg(t, GC + 0.3, GC + 1.8));
      /* Lyset i steinen (heat 0–1): tennes på GL[0], tar et trinn opp på hvert slag, og er hvitglødende når steinen sprenges. pul = et blaff på hvert slag. */
      const pul = max(hit(t, GL[0], 0.5), hit(t, GL[1], 0.5), hit(t, GL[2], 0.5), hit(t, GL[3], 0.5), hit(t, GT[0], 0.3), hit(t, GT[1], 0.3), hit(t, GT[2], 0.5));
      const heat = t < GL[0] || t >= GC ? 0 : kf(t, [[GL[0], 0.1], [GL[0] + 0.3, 0.26, eo], [GL[1], 0.32], [GL[1] + 0.3, 0.5, eo], [GL[2], 0.56], [GL[2] + 0.3, 0.72, eo], [GL[3], 0.76], [GL[3] + 0.3, 0.88, eo], [GT[2], 0.92], [GC, 1, ei]]);
      const ry = HOME[1] - 0.34 * sq(t, GC, 12, 5) - 0.4 * sq(t, GP, 12, 5) + 0.12 * sq(t, GX, 14, 4), jolt = t < GC ? 0.5 * (hit(t, GT[0], 0.2) + hit(t, GT[1], 0.2)) + hit(t, GT[2], 0.3) + seg(t, GC - 0.35, GC) : 0;
      g.root.position.set(HOME[0] + 0.025 * sin(t * 61) * jolt, ry, HOME[2]);
      /* 1 Statuen: helt stiv til steinen sprenges (ingen pust, ingen rykk i armene). Etterpå puster han, og halen lever. */
      g.add(STAT, t < GC ? 1 : 1 - 0.8 * eo(seg(t, GC, GC + 0.22)));
      const br = 0.024 * sin(t * 2.7) * live; g.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0] }, 1);
      for (let i = 1; i <= 5; i++) g.rot('Tail' + i, 0, 0, live * 0.045 * sin(t * 2.1 + i * 0.55));
      /* 2 Steinen sprenges i et brøl (GC): hodet kastes opp forbi målet og faller på plass, armene slås ut. */
      const r1 = t < GC ? 0 : back(seg(t, GC, GC + 0.3), 2.6) * (1 - io(seg(t, GC + 1.5, GC + 2.3)));
      /* 3 Slaget (Precipice Blades): armene løftes sakte (forvarsel), litt til helt på slutten, og smeller ned på GP. */
      g.add(RAISE, kf(t, [[GV + 0.3, 0], [GA + 0.6, 1, io], [GP - 0.12, 1.14, io], [GP + 0.02, 0, ei]]));
      g.add(SLAM, kf(t, [[GP - 0.1, 0], [GP + 0.07, 1.15, eo], [GP + 0.5, 0.9, io], [GW + 0.4, 0.5, io], [GD, 0, io]]));
      /* 4 Det siste brølet (GX): han dukker og trekker pusten, mer og mer, og brøler mens navnet kommer opp. */
      g.add(DUCK, kf(t, [[GD, 0], [GD + 0.9, 0.75, io], [GX - 0.7, 0.9], [GX - 0.3, 1.3, io], [GX - 0.03, 1.5, ei], [GX + 0.1, 0, eo]]) * (1 - out));
      const r2 = t < GX ? 0 : back(seg(t, GX, GX + 0.3), 2.6) * (1 - 0.92 * io(seg(t, GX + 2.6, GX + 3.6))), rw = max(r1, r2, out ? back(seg(out, 0, 0.3), 2.2) : 0);
      S.mouth = null; g.add(ROAR, rw); g.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); g.rot('Head', 0, 0, 0.022 * sin(t * 43) * rw); S.rw = rw;
      /* Øynene: lukket (stein) til det første av de tre slagene, så åpne, og smale (sinte) fra det tredje og gjennom brølet. Blunker mens han venter. */
      const nar = (t >= GT[2] && t < GC + 2.3) || (t > GA + 0.4 && t < GW) || (t > GD && t < GX + 3.4) || out, eye = t < GT[0] ? [0, 0.5] : t < GT[0] + 0.07 || (t > GX + 4 && (t - GX) % 4.4 < 0.12) || nar ? [0, 0.75] : [0, 0], E = g.mats.Eye1.uniforms;
      E.uUvOff.value.set(eye[0], eye[1]); E.uEmis.value = t < GT[0] ? 0 : 0.5 + 0.5 * max(hit(t, GT[0], 0.5), hit(t, GT[1], 0.4), hit(t, GT[2], 0.6));
      /* Steinhuden: helt grå til GC. Der sprenges den av: det meste er borte i første bilde, og de siste flekkene slipper på under et halvt sekund. */
      g.set('uStone', t < GC ? 1 : 0.4 * (1 - eo(seg(t, GC, GC + 0.42)))); E.uStone.value = t < GT[0] ? 1 : 0;
      g.set('uCrack', t < GL[0] ? 0 : t < GC ? min(1, 0.45 + 0.55 * heat + 0.25 * pul) : 1 - seg(t, GC, GC + 0.3));
      g.set('uCrackR', t >= GC ? 40 : kf(t, [[GL[0], 0], [GL[0] + 0.9, 2.7, eo], [GL[1], 3.1], [GL[1] + 1, 6.2, eo], [GL[2], 6.6], [GL[2] + 0.9, 11, eo], [GL[3], 11.5], [GL[3] + 0.5, 40, io]])); g.set('uCrackO', [0, 5.6, 1.2]); g.set('uVor', t < GC + 0.3 ? 1 : 0);
      const hk = c01(heat * 1.05 + 0.22 * pul), cu = g.mats; for (const m in cu) if (cu[m].uniforms.uCrackC) col3(cu[m].uniforms.uCrackC, hk, '#ff7a14', '#ffd630', '#fff2a6');
      g.set('uSeam', 0.21); g.set('uCw', 0.65 + 1.25 * heat + 0.3 * pul); g.set('uSpill', 0.04 * heat * heat);
      /* Stedet lever med: mens lyset i steinen stiger, mørkner alt rundt (så gløden bærer bildet). Når han er fri, er lyset varmt og lavaen varmere. */
      const X = g.root.position, hot = t < GC ? 0.4 * heat : mix(0.7, 1, seg(t, GC, GC + 0.4)), dim = t < GC ? heat : 0; S.heat = heat; S.pul = pul; S.wake = hot;
      L.uHeat.value = 0.86 + 0.32 * hot + 0.14 * hit(t, GX, 1.6) + 0.22 * hit(t, GP, 0.9) + 0.25 * hit(t, GC, 1.2) + 0.1 * out; L.uBri.value = 0.95 - 0.17 * dim; U.uGlow.value = 0.7 + 0.4 * hot + 0.3 * rw;
      if (t < GC) { lerpC(U.uKeyC, '#d6ccd4', '#a2969e', dim); lerpC(U.uShC, '#40323e', '#30252f', dim); } else { lerpC(U.uKeyC, '#e8d8d0', '#fff0dc', seg(t, GC, GC + 0.3)); lerpC(U.uShC, '#3a2230', '#3c1a22', 1); } U.uRimK.value = t < GC ? 0.7 : 1;
      const ring = (i, x, z, t0, v, d, a) => L.uRing.value[i].set(x, z, 1.5 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
      ring(0, X.x, X.z, t < GL[1] ? GL[0] : t < GL[2] ? GL[1] : t < GL[3] ? GL[2] : t < GT[2] ? GL[3] : GT[2], 9, 1.2, 0.6); ring(1, X.x, X.z, GC, 22, 1.6, 1); ring(2, 0, 6, GP, 20, 1.5, 1); ring(3, X.x, X.z, GX, 30, 1.6, 1);
      L.uWade.value.set(X.x, X.z + 0.3, 9.5, 0.85 + 0.25 * hot + 0.5 * hit(t, GC, 1.2));
      const ch = g.at('Spine2'); S.aura.position.set(ch.x, ch.y + 0.4, ch.z - 0.6); K.face(S.aura); S.aura.scale.setScalar(13 + 7 * heat + 2 * pul); S.aura.material.uniforms.uA.value = t < GC ? 0.8 * heat * heat + 0.15 * pul * heat : 0.6 * hit(t, GC, 0.35); S.aura.visible = t >= GL[0] && t < GC + 0.4;
      /* Steinflak, støv og sprut: alt slipper på GC. */
      S.shell.at(t, GC, { g: 21 }); S.puff.material.uniforms.uT0.value = GC;
      S.fx(S.dust[0], GC, X.x, 0.2, X.z + 1); S.fx(S.dust[1], GP, 0, 0.2, 6); S.fx(S.spl[0], GC, X.x, 0, X.z + 0.6); S.fx(S.spl[3], GP, 0, 0, 6.5);
      S.drip.position.set(X.x, ry, X.z); S.drip.visible = t > GC + 0.2 && t < GC + 3.2; S.drip.material.uniforms.uPx.value = 120 * (1 - seg(t, GC + 1.6, GC + 3.2));
      for (let i = 0; i < NB; i++) { const b = blade(i), k = t < b.t ? 0 : back(seg(t, b.t, b.t + 0.17), 2); S.blades[i].position.set(b.x, -(b.h + 1) * (1 - k), b.z); S.blades[i].visible = k > 0; }
      const rt0 = t >= GX ? GX : t >= GP ? GP : GC, ra = t >= rt0 ? hit(t, rt0, rt0 === GP ? 0.7 : 1) : 0; S.ring.position.set(X.x, 0.6, X.z + (rt0 === GP ? 3 : 1)); S.ring.scale.setScalar(3 + (t - rt0) * (rt0 === GP ? 30 : 42)); S.ring.material.uniforms.uA.value = ra; S.ring.visible = ra > 0;
      /* Vulkanen: ryker og er urolig hele veien, og svarer med et kast når steinen sprenges og når han brøler. Den bryter ikke ut her. */
      volcAct(S, t, 0.34 + 0.12 * heat + (t >= GC ? 0.12 : 0) + 0.34 * hit(t, GC, 2.6) + 0.2 * hit(t, GP, 1.6) + 0.36 * hit(t, GX, 3) + 0.2 * out, -1);
      S.lit = t < GC ? 0.62 - 0.2 * dim : 0.55 + 0.45 * hot; S.sun = 0.42 * seg(t, GC + 0.6, GV + 1);
    },
    shots: [
      /* 1 Statuen: han står i lavaen, grå og stiv, med vulkanen som ryker bak. Kameraet kjører sakte inn; den første streken av lys tennes på GL[0]. */
      [0, (S, u, a, t) => { const e = io(u); K.cam(mix(9.5, 7.4, e), mix(1.9, 2.7, e), mix(27, 21, e), 0, mix(5.6, 4.3, e), 2.8, mix(43, 40, e), -0.03); S.post.fade = 1 - seg(t, 0, 0.8); S.post.sh = 1.3 * hit(t, GL[0], 0.4); }],
      /* 2 Lyset brer seg: tett på kroppen fra siden, og så en sakte bue ut og rundt mens strekene løper over steinen og gløder sterkere for hvert slag. */
      [GL[1] - 0.04, (S, u, a, t) => { const e = io(u), w = mix(-0.95, 0.2, e), r = mix(9.2, 13.8, e); K.cam(sin(w) * r, mix(2.5, 1.5, e), 2.8 + cos(w) * r, 0, mix(3.9, 4.4, e), 3, mix(40, 46, e), 0.04); S.post.sh = 1.2 * (hit(t, GL[1], 0.3) + hit(t, GL[2], 0.3) + hit(t, GL[3], 0.3)); S.post.vig = 0.5 + 0.3 * S.heat; }],
      /* 3 Øyet (helt nært): lukket og grått, åpner seg på det første av de tre slagene, blusser på det andre og smalner på det tredje. */
      [GT[0] - 0.4, (S, u, a, t) => { const e = S.W('Head', S.A.eye), c = S.W('Head', S.A.eyeCam); K.cam(mix(c.x, e.x, 0.14 * u), c.y, mix(c.z, e.z, 0.14 * u), e.x, e.y, e.z, 24); S.post.fl = max(0.6 * hit(t, GT[0], 0.2), 0.75 * seg(t, GC - 0.16, GC)); S.post.flc = '#ffe890'; S.post.sh = 1.6 * hit(t, GT[0], 0.3) + 1.2 * hit(t, GT[1], 0.25) + 2.2 * hit(t, GT[2], 0.6); S.post.vig = 0.9; }],
      /* 4 Alt knuses: steinhuden sprenges av i brølet, sett nedenfra. Han er rød fra første bilde. */
      [GC - 0.035, (S, u, a, t) => { const h = S.gr.at('Head'); K.cam(4.4 - u * 0.9, 1.2, 13.4 + u * 1.4, h.x * 0.5, h.y - 1.6, h.z - 1.5, 52, -0.08); S.post.sh = 5 * hit(t, GC, 0.8) + 0.6 * S.rw; S.post.fl = t < GC ? 0.75 : hit(t, GC, 0.1); S.post.flc = '#fff6d8'; mouth(S, GC, t); S.post.heat = 1; }],
      /* 5 Motlys: lavt og langt foran, med vulkanen bak ham. Armene løftes (forvarsel). */
      [GV, (S, u) => { K.cam(2 - u * 2, 1.6, 31 - u * 5, -1.5, 8.2 - u, 0, 44); }],
      /* 6 Slaget: steinspydene skyter opp mot kameraet, ett for ett, og det siste rett foran linsa. */
      [GP - 0.04, (S, u, a, t) => { K.cam(0.7, 1.5, 53.2, 0, 5, 3, 50, 0.04); S.post.sh = 3.5 * hit(t, GP, 0.5) + 1.6 * hit(t, GP + 0.5, 0.6); S.post.fl = seg(t, GW - 0.16, GW - 0.02); S.post.flc = '#fff4d0'; S.post.spd = hit(t, GP, 0.45); S.post.spx = 128; S.post.spy = 110; }],
      /* 7 Det siste brølet, i ett langt bilde nedenfra: han trekker pusten og brøler, navnet og nivået kommer opp, og kameraet glir sakte mens han venter på Continue. */
      [GW, (S, u, a, t) => { const k = io(seg(t, GW, GX)), w = 0.05 * sin(max(0, t - GX) * 0.21); K.cam(mix(2.8, 1.8, k) + sin(w) * 2, 1.3, mix(21, 16.5, k), -1.6, mix(5, 6.9, k), 2.5, 50, -0.04);
        S.post.fl = max(1 - seg(t, GW, GW + 0.25), 0.3 * hit(t, GX, 0.15)); S.post.flc = '#fff4d0'; S.post.sh = 4 * hit(t, GX, 1.2) + 0.7 * S.rw; mouth(S, GX, t); S.post.heat = 0.6 + 0.6 * S.rw; }],
    ],
  });

  /* ---------- Primal Reversion (raseriet ved halv HP), som i Omega Ruby ----------
     Jazz 18.11: en kort cutscene midt i kampen (krystallen, Ω-tegnet, den knuses), og det er HER vulkanen bryter ut, med masse røyk, lava og lavapartikler.
     Lyset samler seg om ham og stivner til en rosa krystall, krystallen mørkner, Ω-tegnet tennes på den og den slår sprekker, og så knuses den: Primal Groudon
     står der med glødende årer mens vulkanen bryter ut bak ham. Et langt nærbilde oppover kroppen, og så brølet i et vidt bilde der vulkanen eksploderer.
     Den følger ikke slagene i låta (kamplåta går videre under), og den venter ikke på Continue: den ender i et hvitt blink og går rett tilbake til kampen. */
  const PT = { G0: 1.0, G1: 1.75, D0: 3.0, D1: 3.8, O: 4.05, K: 4.9, S: 6.0, C: 6.55, R: 8.35, P: 8.95, F: 12.1, E: 12.55 };
  const PHOME = [0, -1.2, 2.8], GEM = [0, 5, 2.9], GEMR = 6.7;
  const PROAR = { Neck1: [0, 0.17, 0], Neck2: [0, 0.13, 0], Neck3: [0, 0.09, 0], Head: [0, 0.1, 0], Jaw: [0, -0.85, 0], Spine1: [0, 0.08, 0], Spine2: [0, 0.14, 0], Hips: [0, -0.05, 0], Tail2: [0, 0.1, 0], Tail3: [0, 0.1, 0], '*Arm': [-0.35, 0.15, 0.75], '*Hand': [0.3, 0, 0] };
  const PDUCK = { Neck1: [0, -0.18, 0], Neck2: [0, -0.1, 0], Neck3: [0, -0.06, 0], Head: [0, -0.12, 0], Spine2: [0, -0.08, 0], '*Arm': [0, -0.25, -0.2] };
  const BOMBS = [[1.2, -15, 9], [1.55, 13, -2], [1.95, -5, 17], [2.35, 17, 12], [2.8, -20, -4], [3.25, 6, 20]];   /* lavabomber som slår ned i sjøen etter eksplosjonen: [sekunder etter brølet, x, z] */
  G3D.def('c3:383p', {
    len: PT.E, R: PT.R, at: 0, models: ['groudon', 'groudon_primal'],
    make(K, T) {
      const S = crater(T), g = S.gr = K.figure(K.model('groudon')), p = S.pg = K.figure(K.model('groudon_primal'), { hide: /MagmaLayer[12]/ }); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p);
      g.set('uGl', 0.5); p.set('uGl', 0.8); g.set('uWk', 0.7); p.set('uWk', 0.7);
      S.gem = K.gem({}); S.gem.position.set(GEM[0], GEM[1], GEM[2]); S.scene.add(S.gem);
      /* Lyset som samler seg: rosa gnister som strømmer inn mot ham fra alle kanter, og en glød rundt ham. */
      S.motes = K.pts(110, i => { const a = rnd(i, 61) * TAU, el = (rnd(i, 62) - 0.2) * 1.5, R = 18 + rnd(i, 63) * 16, l = 0.6 + rnd(i, 64) * 0.5, d = [cos(a) * cos(el), sin(el), sin(a) * cos(el)]; return { p: [d[0] * R, d[1] * R, d[2] * R], v: [-d[0] * R / l, -d[1] * R / l, -d[2] * R / l], b: rnd(i, 65) * 1.1, l, z: 1.1 + rnd(i, 66) * 1.7 }; }, { loop: 1, add: 1, px: 60, sz0: 1.3, sz1: 0.45, c: ['#ffe0f6', '#ff6ac8', '#c81e8c'], fade: 0.92 }); S.motes.position.set(GEM[0], GEM[1], GEM[2]); S.scene.add(S.motes);
      S.aura = K.light(1, '#ff58c0'); S.scene.add(S.aura); S.burst = K.light(1, '#fff0b0', { depth: false }); S.burst.renderOrder = 7; S.scene.add(S.burst);
      /* Krystallen som knuses: mørke skår med rosa innside, slynget rett ut fra midten, og et rosa støv. */
      const sh = (n, c, em, sd) => K.shards(n, i => { const a = rnd(i, sd) * TAU, el = (rnd(i, sd + 1) - 0.3) * 2.2, d = [cos(a) * cos(el), sin(el), sin(a) * cos(el)], v = 9 + rnd(i, sd + 2) * 19, big = i % 6 === 0;
        return { p: [GEM[0] + d[0] * GEMR * 0.85, GEM[1] + d[1] * GEMR * 0.85, GEM[2] + d[2] * GEMR * 0.85], v: [d[0] * v, d[1] * v + 5, d[2] * v], r: [(rnd(i, sd + 3) - 0.5) * 12, (rnd(i, sd + 4) - 0.5) * 12, (rnd(i, sd + 5) - 0.5) * 12], s: rnd(i, sd + 6), b: rnd(i, sd + 7) * 0.06, l: 2.8, z: big ? 0.8 + rnd(i, sd + 8) * 0.6 : 0.25 + rnd(i, sd + 9) * 0.45 }; }, { c, em, grey: 0, sy: 0.5, id: 202 });
      S.sh1 = sh(54, '#3c1a40', 0.25, 71); S.sh2 = sh(34, '#ff7ad0', 0.75, 91); S.scene.add(S.sh1); S.scene.add(S.sh2);
      S.puff = K.pts(48, i => { const a = rnd(i, 21) * TAU, el = (rnd(i, 22) - 0.3) * 2, v = 3 + rnd(i, 23) * 7; return { p: [GEM[0] + cos(a) * cos(el) * 5, GEM[1] + sin(el) * 5, GEM[2] + sin(a) * cos(el) * 5], v: [cos(a) * cos(el) * v, sin(el) * v + 1, sin(a) * cos(el) * v], b: rnd(i, 24) * 0.2, l: 1.4 + rnd(i, 25) * 1, z: 4 + rnd(i, 26) * 5 }; }, { t0: -1e5, shade: 1, drag: 1.5, sz0: 0.4, sz1: 2, px: 60, c: ['#ffd0f0', '#b05a9c', '#3a1c3c'], a: 0.5, fade: 0.25 }); S.scene.add(S.puff);
      volcano(S, T, 1);
      return S;
    },
    act(S, t, o) {
      const g = S.gr, p = S.pg, U = K.U(), L = S.lava.material.uniforms, pre = t < PT.S, gm = S.gem.material.uniforms;
      g.root.visible = t < PT.G1 + 0.4; p.root.visible = !pre;
      /* 1 Groudon (vanlig form): rasende, sammentrukket og skjelvende, mens det rosa lyset samler seg om ham og han blir til lys. */
      const str = io(seg(t, 0, 0.9)); g.root.position.set(HOME[0] + 0.03 * sin(t * 61) * str, HOME[1], HOME[2]);
      g.add(STAT, 0.2); g.add(DUCK, 0.9 * str); g.add({ Jaw: [0, -0.3, 0] }, str); g.rot('Jaw', 0, 0.03 * sin(t * 48) * str, 0);
      g.mats.Eye1.uniforms.uUvOff.value.set(0, 0.75); g.set('uStone', 0); g.set('uCrack', 0); g.set('uFlC', '#ffb4e6'); g.set('uFlK', 0.92 * io(seg(t, 0.3, PT.G0 + 0.3)));
      /* 2 Krystallen: vokser fram rastrert (han skimtes inni), lukker seg på G1, dreier sakte, mørkner (D0–D1) og slår sprekker av lys fra K til den knuses på S. */
      const gk = seg(t, PT.G0, PT.G1), spin = 0.22 * (t - PT.G1); S.gem.visible = t >= PT.G0 && pre; S.gem.scale.setScalar(GEMR * (pre ? mix(0.72, 1, back(gk, 1.6)) + 0.012 * sin(t * 40) * seg(t, PT.K, PT.S) : 1)); S.gem.rotation.set(0.08 * sin(spin * 1.3), spin, 0);
      gm.uAl.value = t < PT.G1 ? 0.15 + 0.85 * gk * gk : 1; gm.uDark.value = io(seg(t, PT.D0, PT.D1)) * 0.96; gm.uCrk.value = t >= PT.K ? 1 : 0; gm.uCrkR.value = 2.3 * eo(seg(t, PT.K, PT.S - 0.1)); lerpC(gm.uCrkC, '#ffc21e', '#fff6c0', seg(t, PT.S - 0.5, PT.S));
      S.motes.visible = t < PT.G1 + 0.2; S.motes.material.uniforms.uA.value = seg(t, 0.1, 0.5) * (1 - seg(t, PT.G1 - 0.2, PT.G1 + 0.2));
      K.face(S.aura); S.aura.position.set(GEM[0], GEM[1], GEM[2] - 1); S.aura.scale.setScalar(15 + 9 * seg(t, 0, PT.G1)); S.aura.material.uniforms.uA.value = t < PT.D1 ? 0.55 * io(seg(t, 0.2, PT.G0 + 0.4)) * (1 - 0.85 * seg(t, PT.D0, PT.D1)) + 0.5 * hit(t, PT.G1, 0.4) : 0; S.aura.visible = t < PT.D1;
      const om = t >= PT.O && pre ? min(1, (t - PT.O) / 0.25) * (0.82 + 0.18 * sin((t - PT.O) * (5 + 9 * seg(t, PT.K, PT.S)))) : 0; S.om = om;
      /* 3 Krystallen knuses (S): skår og støv, et lysglimt, og Primal Groudon står der. Han kommer ut av lyset, reiser seg sakte, trekker seg sammen og brøler (R). */
      S.sh1.at(t, PT.S, { g: 16 }); S.sh2.at(t, PT.S, { g: 16 }); S.puff.material.uniforms.uT0.value = PT.S;
      K.face(S.burst); S.burst.position.set(GEM[0], GEM[1], GEM[2]); S.burst.scale.setScalar(pre ? 10 + 16 * seg(t, PT.S - 0.35, PT.S) : 26 + 70 * eo(seg(t, PT.S, PT.S + 0.5))); S.burst.material.uniforms.uA.value = pre ? 0.8 * ei(seg(t, PT.S - 0.4, PT.S)) : 0.7 * hit(t, PT.S, 0.28); S.burst.visible = t > PT.S - 0.4 && t < PT.S + 0.3;
      const rise = io(seg(t, PT.S + 0.2, PT.R - 0.7)), rw = t < PT.R ? 0 : back(seg(t, PT.R, PT.R + 0.3), 2.6) * (1 - 0.35 * io(seg(t, PT.R + 2.2, PT.E))), ry = PHOME[1] - 0.4 * sq(t, PT.S, 11, 4) + 0.14 * sq(t, PT.R, 14, 4);
      p.root.position.set(PHOME[0], ry, PHOME[2]);
      p.add(PDUCK, (1 - 0.8 * rise) + kf(t, [[PT.R - 0.42, 0], [PT.R - 0.16, 0.8, io], [PT.R - 0.03, 1.1, ei], [PT.R + 0.1, 0, eo]]));
      const br = 0.03 * sin(t * 3.1) * (!pre ? 1 : 0); p.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0], Jaw: [0, -0.16 * rise * (1 - rw), 0] }, 1); for (let i = 1; i <= 5; i++) p.rot('Tail' + i, 0, 0, 0.05 * sin(t * 2.1 + i * 0.55));
      p.add(PROAR, rw); p.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); p.rot('Head', 0, 0, 0.022 * sin(t * 43) * rw); S.rw = rw; S.mouth = null;
      p.mats.Eye1.uniforms.uUvOff.value.set(0, t > PT.R - 0.6 ? 0.75 : 0); p.mats.Eye1.uniforms.uEmis.value = 0.6;
      /* Årene av magma: gløder fra han kommer fram, pulserer som et hjerte, og blusser i brølet. */
      p.set('uCrack', pre ? 0 : 0.95 + 0.22 * sin(t * 4.2) + 0.5 * rw + 0.6 * hit(t, PT.S, 0.8)); for (const m in p.mats) if (p.mats[m].uniforms.uCrackC) lerpC(p.mats[m].uniforms.uCrackC, '#ffc626', '#fff2a8', c01(0.3 * rw + hit(t, PT.S, 0.7) + hit(t, PT.R, 0.6)));
      p.set('uFlC', '#fff4c8'); p.set('uFlK', pre ? 0 : 0.9 * (1 - eo(seg(t, PT.S, PT.S + 0.4))));
      /* Stedet: lavaen blir varmere for hvert trinn, og lyset skifter fra rosa (krystallen) til hvitglødende. */
      const post = pre ? 0 : 1, hot = 0.75 + 0.1 * seg(t, PT.O, PT.S) + 0.15 * post; S.wake = hot; S.heat = 0;
      L.uHeat.value = 1 + 0.12 * seg(t, PT.O, PT.S) + 0.22 * post + 0.25 * hit(t, PT.S, 1.2) + 0.2 * hit(t, PT.R, 1.6); L.uBri.value = 0.95 - 0.12 * seg(t, PT.D0, PT.D1) * (1 - post); U.uGlow.value = 1 + 0.2 * post + 0.25 * rw;
      if (pre) { col3(U.uKeyC, c01(seg(t, 0.2, PT.G1) - seg(t, PT.D0, PT.D1) * 0.5), '#fff0dc', '#ffdcee', '#ffc8ea'); lerpC(U.uShC, '#3c1a22', '#3a1830', seg(t, 0.2, PT.G1)); } else { lerpC(U.uKeyC, '#fff8e0', '#fff0d2', seg(t, PT.S, PT.S + 0.6)); lerpC(U.uShC, '#3c1a22', '#42181a', 1); } U.uRimK.value = 1;
      const ring = (i, x, z, t0, v, d, a) => L.uRing.value[i].set(x, z, 1.5 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
      const bi = BOMBS.map(b => t >= PT.R + b[0]), bn = bi.lastIndexOf(true), bb = bn >= 0 ? BOMBS[bn] : null;
      ring(0, GEM[0], GEM[2], t < PT.O ? PT.G1 : t < PT.S ? PT.O : PT.S, t < PT.S ? 12 : 26, 1.6, 1); ring(1, PHOME[0], PHOME[2], PT.R, 30, 1.7, 1); ring(2, bb ? bb[1] : 0, bb ? bb[2] : 0, bb ? PT.R + bb[0] : 1e5, 15, 1.5, 1); ring(3, bn > 0 ? BOMBS[bn - 1][1] : 0, bn > 0 ? BOMBS[bn - 1][2] : 0, bn > 0 ? PT.R + BOMBS[bn - 1][0] : 1e5, 15, 1.5, 1);
      L.uWade.value.set(PHOME[0], PHOME[2] + 0.3, pre ? 9.5 : 11, 0.95 + 0.25 * post + 0.5 * hit(t, PT.S, 1.2));
      S.fx(S.spl[0], PT.S, GEM[0], 0, GEM[2] + 1); S.fx(S.dust[0], PT.S, GEM[0], 0.2, GEM[2] + 1);
      const k0 = max(0, min(BOMBS.length - 3, bn - 2)); for (let i = 0; i < 3; i++) { const b = BOMBS[k0 + i]; S.fx(S.spl[i + 1], PT.R + b[0], b[1], 0, b[2]); }
      S.drip.position.set(PHOME[0], ry + 1, PHOME[2]); S.drip.visible = !pre && t < PT.S + 3; S.drip.material.uniforms.uPx.value = 150 * (1 - seg(t, PT.S + 1.6, PT.S + 3));
      S.ring.position.set(GEM[0], 0.6, GEM[2]); const rt0 = t >= PT.R ? PT.R : PT.S, ra = t >= PT.S ? hit(t, rt0, 1) : 0; S.ring.scale.setScalar(3 + (t - rt0) * 46); S.ring.material.uniforms.uA.value = ra; S.ring.visible = ra > 0;
      S.embers.material.uniforms.uPx.value = 120 * (1 + 0.9 * post);
      /* Vulkanen (Jazz 18.11, runde 6): utbruddet starter IKKE før brølet. Fram til da ryker den bare tyngre. I brølet eksploderer toppen, en ny eksplosjon følger like etter,
         fontenen står opp, askeskyen velter ut over himmelen, og det regner lavabomber over sjøen. */
      const R1 = t >= PT.R; volcAct(S, t, 0.42 + 0.1 * seg(t, PT.G1, PT.D1) + 0.12 * seg(t, PT.O, PT.S) + (R1 ? 1.3 + 0.5 * hit(t, PT.R, 2.5) : 0), PT.R, PT.R);
      S.erupt = R1 ? 1.7 * eo(seg(t, PT.R, PT.R + 1.4)) : 0.12 * seg(t, PT.O, PT.S); S.smoke = R1 ? 0.8 * seg(t, PT.R + 0.6, PT.R + 3) : 0; S.lit = pre ? 0.7 - 0.2 * seg(t, PT.D0, PT.D1) + 0.15 * seg(t, PT.K, PT.S) : R1 ? 1 : 0.8; S.sun = R1 ? 0.75 * seg(t, PT.R + 0.3, PT.R + 1.3) : 0;
    },
    shots: [
      /* 1 Lyset samler seg om ham, og krystallen vokser fram (lavt, forfra). */
      [0, (S, u, a, t) => { const e = io(u); K.cam(mix(4.4, 3.4, e), 1.7, mix(22, 19, e), -0.4, 5, 2.6, 46, -0.03); S.post.fl = max(1 - seg(t, 0, 0.35), 0.85 * seg(t, PT.G1 - 0.14, PT.G1)); S.post.flc = t < 1 ? '#ffffff' : '#ffd6f2'; S.post.sh = 1.2 * seg(t, 0, 0.6); }],
      /* 2 Krystallen: kameraet glir sakte inn fra siden, med vulkanen bak. Den mørkner, Ω-tegnet tennes, sprekkene brer seg, og den knuses mens vulkanen bryter ut. */
      [PT.G1 - 0.03, (S, u, a, t) => { const e = io(seg(t, PT.G1, PT.S)); K.cam(mix(-6, -4.5, e), mix(2, 2.7, e), mix(23.5, 18.5, e), mix(-2.3, -0.85, e), mix(6.6, 6.2, e), mix(3.8, -1.2, e), 46, 0.03);   /* krystallen og vulkanen ligger begge innenfor x 64–448 (smal skjerm) */
        S.post.fl = max(0.85 * hit(t, PT.G1, 0.3), 0.5 * hit(t, PT.O, 0.22), t < PT.S ? ei(seg(t, PT.S - 0.2, PT.S)) * 0.8 : 0.9 * hit(t, PT.S, 0.1)); S.post.flc = t < PT.D0 ? '#ffd6f2' : '#fff2b8';
        S.post.sh = 1.5 * hit(t, PT.O, 0.5) + 2.6 * seg(t, PT.K, PT.S) * (t < PT.S ? 1 : 0) + 6 * hit(t, PT.S, 0.6); S.post.heat = 0.6; }],
      /* 3 Primal Groudon i ett langt nærbilde: fra kneet med Ω-merket og oppover kroppen til ansiktet, mens årene gløder og han reiser seg. */
      [PT.C, (S, u, a, t) => { const e = io(u); K.cam(mix(8.4, 4.4, e), mix(1.3, 4.9, e), mix(10.8, 16.5, e), mix(3.3, 0.2, e), mix(1.9, 8.4, e), mix(2.6, 6.4, e), mix(40, 42, e), -0.05); S.post.sh = 0.8; S.post.heat = 1; S.post.vig = 0.7; }],
      /* 4 Brølet, vidt og nedenfra: armene ut, årene blusser, og bak ham eksploderer vulkanen. Navnet kommer opp, lavabomber slår ned i sjøen, og bildet går i hvitt. */
      [PT.R - 0.12, (S, u, a, t) => { const e = eo(u), w = 0.04 * sin(t * 0.5); K.cam(mix(10.6, 9.8, e) + w * 3, 1.25, mix(19.4, 18, e), 1.9, mix(7.4, 7.9, e), 0.2, 54, -0.05);   /* han til venstre for midten og vulkanen til høyre, begge innenfor x 64–448 */
        S.post.fl = max(0.5 * hit(t, PT.R, 0.16), seg(t, PT.F, PT.E - 0.05)); S.post.flc = '#fff6dc'; S.post.sh = 7 * hit(t, PT.R, 1.2) + 5 * hit(t, PT.R + 0.7, 1) + 2.2 * hit(t, PT.R + 0.3, 2.4) + 0.8 * S.rw + BOMBS.reduce((q, b) => q + 2 * hit(t, PT.R + b[0], 0.4), 0);
        const j = S.pg.at('Jaw'), m = K.proj(j.x, j.y, j.z); S.post.spx = m.x / 2; S.post.spy = m.y / 2; S.post.spr = 0.1; S.post.spd = 0.9 * S.rw * hit(t, PT.R, 2.6); S.mouth = m; S.post.heat = 0.8 + 0.6 * S.rw; }],
    ],
  });

  /* Navnet og nivået, i samme lave oppløsning (256 × 192). Det viktige ligger innenfor x 32–224, som er det en smal skjerm viser.
     a = sekunder siden skiltet startet. o.om: Ω-merket i stedet for nivået (Primal Reversion). */
  const omega = (x, cx, cy, r, k) => {
    const R = r * 0.62, c = -r * 0.14, a0 = 0.66, ex = R * sin(a0), ey = c + R * cos(a0), fy = r * 0.66, f0 = r * 0.2, f1 = r * 0.84;
    const path = (w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'miter'; x.lineCap = 'butt'; x.beginPath(); x.moveTo(cx - f1, cy + fy); x.lineTo(cx - f0, cy + fy); x.lineTo(cx - ex, cy + ey); x.arc(cx, cy + c, R, PI / 2 + a0, PI / 2 - a0 + TAU); x.lineTo(cx + f0, cy + fy); x.lineTo(cx + f1, cy + fy); x.stroke(); };
    path(r * 0.36, '#c4480a'); path(r * 0.25, k > 0.5 ? '#ffc81e' : '#f08a14'); if (k > 0.75) path(r * 0.09, '#fff4a8');
  };
  const plate = (x, a, o) => {
    if (a < 0) return false;
    const f = C.fontN(), nm = String(o.name || 'Groudon').toUpperCase(), k = eo(c01(a / 0.2)), w = Math.round(256 * k), jolt = a < 0.3 ? Math.round(2 * (1 - a / 0.3) * (floor(a * 60) % 2 ? 1 : -1)) : 0;
    x.fillStyle = '#170709'; x.fillRect(0, 141, w, 42); x.fillStyle = '#ff8a1a'; x.fillRect(0, 140, w, 1); x.fillStyle = '#7a1c0a'; x.fillRect(0, 183, w, 1);
    if (a < 0.1) return true;
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.font = `${f[1]}8px ${f[0]}`; x.fillStyle = '#ffb060'; x.fillText(String(o.cap || 'Legendary Pokémon').toUpperCase(), 36, 151 + jolt);
    const gr = x.createLinearGradient(0, 157, 0, 179); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.42, '#fff2b0'); gr.addColorStop(0.43, '#ffa828'); gr.addColorStop(0.74, '#ffa828'); gr.addColorStop(0.75, '#f0541a'); gr.addColorStop(1, '#f0541a');
    x.font = `${f[1]}32px ${f[0]}`; x.fillStyle = a < 0.16 ? '#ffffff' : gr; x.fillText(nm, 35, 179 + jolt); x.font = `${f[1]}16px ${f[0]}`;
    if (o.om) { if (a > 0.42) omega(x, 206, 162, 15, a < 0.5 ? 0.6 : 1); }
    else if (o.lv && a > 0.42) { x.textAlign = 'right'; x.fillStyle = a < 0.5 ? '#ffffff' : '#ffe8c0'; x.fillText('Lv.' + o.lv, 222, 178); }
    return true;
  };

  /* Bakteppet, tegnet i 2D med verktøykassa fra steg 2 (de samme tegnerne som arenaen i raid2.js): nattehimmel som gløder nedenfra, askeskyer lyst opp av
     lavaen, sola som en hard skive gjennom røyken (Drought), og vulkanen med elver, utbrudd og askesky. Det tegnes i vinkelmål rundt horisonten (UR enheter per
     radian) og festes til 3D-kameraet (G3D.view), så det følger alle kamerabevegelser. Gir solas plass på skjermen (til lysstrålene). */
  const VOL0 = VOL, UR = 560, wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  const backdrop = (S, t) => {
    const g = C.g, v = G3D.view(), k = v.ppr / UR, er = S.er, lit = S.lit, sun = S.sun, bl = C.blend, VOL = S.V || VOL0;
    g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
    const gr = g.createLinearGradient(0, -UR * 1.05, 0, 10); gr.addColorStop(0, '#050203'); gr.addColorStop(0.55, bl('#0e0506', '#1d0807', lit)); gr.addColorStop(0.84, bl('#1a0706', '#571607', lit)); gr.addColorStop(1, bl('#3a0e06', '#c8480e', lit * (0.75 + 0.25 * min(1, er))));
    g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 4012); g.fillStyle = bl('#3a0e06', '#b03c0c', lit * 0.8); g.fillRect(-4000, 10, 8000, 4000);
    const dx = VOL.x - v.cx, dz = VOL.z - v.cz, d = Math.hypot(dx, dz), X = wrap(Math.atan2(dx, -dz) - v.yaw) * UR, e0 = Math.atan2(-v.cy, d), yb = -e0 * UR, hh = (Math.atan2(VOL.h - v.cy, d) - e0) * UR, ww = 2 * Math.atan2(VOL.r, d) * UR, sx = X + ww * 0.3, sy = yb - hh * 1.3;
    if (sun > 0.01) { C.blob(sx, sy, 130 + 40 * sun, '#ff8a2a', 0.3 * sun, 1); C.blob(sx, sy, 46, '#ffe9b0', 0.7 * sun, 1); C.blob(sx, sy, 15, '#ffffff', sun, 1); C.blob(sx, sy, 210, '#ffd9a0', 0.3 * sun, 1, 0.035); }
    for (let i = 0; i < 18; i++) { const x = wrap(rnd(i, 3) * TAU + t * (0.004 + rnd(i, 4) * 0.004) - v.yaw) * UR, y = -(36 + rnd(i, 5) * 250), r = 70 + rnd(i, 6) * 90; if (abs(x) > 760) continue; C.blob(x, y, r, bl('#120a0b', '#241517', lit), 0.86, 0, 0.42); C.blob(x + 8, y + r * 0.26, r * 0.86, '#c8400c', (0.16 + 0.24 * min(1.2, er)) * lit, 1, 0.24); }
    /* Røyken etter utbruddet: tunge, mørke skyer som driver over hele himmelen, lyst opp nedenfra. */
    const smk = S.smoke || 0; if (smk > 0.02) for (let i = 0; i < 14; i++) { const x = wrap(rnd(i, 13) * TAU + t * (0.006 + rnd(i, 14) * 0.006) - v.yaw) * UR, y = -(16 + rnd(i, 15) * 210), r = 110 + rnd(i, 16) * 130; if (abs(x) > 840) continue; C.blob(x, y, r, bl('#1a100f', '#3c2621', lit), 0.62 * smk, 0, 0.5); C.blob(x + 10, y + r * 0.3, r * 0.8, '#b8380c', 0.17 * smk * lit, 1, 0.3); }
    g.restore();
    const ca = cos(v.ang), sa = sin(v.ang), cr = K.proj(VOL.x, VOL.h - 3, VOL.z), bs = K.proj(VOL.x, 0, VOL.z), q = abs(bs.y - cr.y) / 92;
    /* Røyken: en bred, lys søyle som velter opp av krateret og legger seg med vinden, lyst opp nedenfra av gløden. I utbruddet (S.boom) vokser den og blir mørkere av aske. */
    if (cr.z < 1 && q > 0.05) { const ek = min(1.6, er), bm = S.boom || 0, big = S.erupt || 0;
      C.blob(cr.x, cr.y - 10 * q, (150 + 90 * big) * q, '#ff4a10', (0.1 + 0.16 * ek) * lit, 1, 0.8);
      C.plume(cr.x + 26 * q, cr.y - 30 * q, { n: 22, h: (250 + 120 * big) * q, w0: 30 * q, w1: (120 + 60 * big) * q, wind: 0.75, seed: 9, spd: 0.022 + 0.02 * ek, c: bl('#221a1c', '#4a3b3a', lit), top: '#120c0e', hot: '#b8400e', ha: 0.35 * min(1, ek), a: 0.5 + 0.3 * min(1, ek), t });
      C.plume(cr.x, cr.y + 2, { n: 40, h: (215 + 90 * big) * q * (1 + 0.5 * bm), w0: (13 + 8 * big) * q, w1: (96 + 50 * big) * q * (1 + 0.6 * bm), wind: 0.62 + 0.2 * min(1, er), seed: 5, spd: 0.04 + 0.035 * min(1.5, er), c: bl('#2a2022', bl('#6e5a54', '#4a3936', big), lit), top: '#150e10', hot: er > 0.2 ? '#f0540e' : '#6a1c08', ha: 0.5 + 0.5 * min(1, er), a: 0.8 + 0.2 * min(1, er * 1.4), t }); }
    return { x: v.x + k * (sx * ca - sy * sa), y: v.y + k * (sx * sa + sy * ca), hz: v.y, cx: cr.x, cy: cr.y, cq: q };
  };

  /* Filmene i CINE: samme grensesnitt som sprite-filmene (CINE.still, CINE.play), så verktøyene og avspilleren virker likt. gl: 1 = bildet går gjennom
     etterbehandlingen i fxgl.js (glød, varmeflimmer, lysstråler, fargetone, vignett), som filmene og arenaene fra steg 2.
     d = { spid, over (navnet tegnet i figurens oppløsning), cues, roar: t → tidspunktet brølet startet, fx(S, t, P, q, sn): cutscenens egne tillegg }. */
  const reg = (id, d) => { const inf = G3D.info(id); C.film(id, { len: inf.len, R: inf.R, at: inf.at, hold: inf.hold, c3: 1, gl: 1, spid: d.spid, outc: '#ffffff', cues: d.cues, pre: () => G3D.ready(id),
    draw(t, P, cur) { const g = C.g, c = G3D.isReady(id) ? G3D.frame(id, t, cur, CINE._.rs()) : null; if (!c) { CINE.err = 'g3d: ' + (G3D.err || 'not ready'); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 384); return; } if (G3D.err) CINE.err = G3D.err;
      const S = G3D.S(id), q = G3D.post(id), sn = backdrop(S, t);
      g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, 512, 384);
      if (d.over && !(G3D.out > 0.3)) { g.imageSmoothingEnabled = false; g.drawImage(G3D.text(x => d.over(x, t, cur)), 0, 0, 512, 384); g.imageSmoothingEnabled = true; }
      P.sh = q.sh * 2; P.fl = q.fl; P.fc = q.flc; P.fade = q.fade; P.fadec = q.fadec;
      P.bloom = 0.4 + 0.1 * S.wake + 0.14 * (S.rw || 0); P.bloomT = 0.74; P.heat = 1.3 + 1.3 * S.wake + 2.2 * q.heat; P.heatY = sn.hz; P.heatUp = 100; P.heatDn = 170;
      P.vig = 0.34 + 0.4 * q.vig; P.vigc = '#140402'; P.grain = 0.035; P.grade = { tint: [1.04, 0.985, 0.93], con: 1.07, sat: 1.05, exp: 1.02 };
      if (d.roar) roarFx(S, t, P, d.roar(t));
      if (S.boom > 0.02 && sn.cq > 0.05) P.rays = { x: sn.cx, y: sn.cy, a: 0.55 * S.boom, len: 0.9 }; else if (S.sun > 0.3 && sn.y > -80 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.7 * (S.sun - 0.3), len: 0.85 };
      if (d.fx) d.fx(S, t, P, q, sn); } }); };
  reg('c3:383', { spid: 383, over: (x, t, o) => plate(x, t - (GX + 0.6), o), cues: [[GL[0], 'thud'], [GL[1], 'thud'], [GT[0], 'thud'], [GT[2], 'thud'], [GC, 'cry'], [GC + 0.05, 'boom'], [GP, 'boom'], [GX, 'cry']], roar: t => t < GX ? GC : GX,
    /* Mens lyset i steinen stiger: mer glød, og stråler ut fra brystet (lyset siver ut av sprekkene, som i Omega Ruby). */
    fx(S, t, P) { const h = S.heat || 0; if (h <= 0) return; P.bloom += 0.34 * h * h + 0.1 * (S.pul || 0) * h;
      if (h > 0.25 && S.shot === 1) { const c = S.gr.at('Spine3'), m = K.proj(c.x, c.y, c.z); if (m.z < 1) P.rays = { x: m.x, y: m.y, a: 2.6 * (h - 0.25) / 0.75 + 0.5 * (S.pul || 0), len: 0.6 }; } } });
  /* Primal-forvandlingen: Ω-tegnet tegnes i figurens oppløsning på krystallen (midt på den, sett fra kameraet), og stråler ut fra det. Ingen virvel ut (swirl: 0). */
  const gemAt = () => { const c = K.proj(GEM[0], GEM[1], GEM[2]), e = K.proj(GEM[0], GEM[1] + GEMR, GEM[2]); return { x: c.x / 2, y: c.y / 2, r: abs(c.y - e.y) / 2, z: c.z }; };
  reg('c3:383p', { spid: 383, swirl: 0, cues: [[0, 'rumble'], [PT.G1, 'thud'], [PT.O, 'boom'], [PT.K, 'rumble'], [PT.S, 'boom'], [PT.S + 0.1, 'hit'], [PT.R, 'cry'], [PT.R + 0.05, 'boom'], [PT.R + 0.7, 'boom']].concat(BOMBS.map(b => [PT.R + b[0], 'thud'])), roar: () => PT.R,
    over(x, t, o) { const S = G3D.S('c3:383p'); let on = false;
      if (S.om > 0 && S.shot === 1) { const q = gemAt(); if (q.z < 1 && (t - PT.O > 0.22 || floor(t * 30) % 2)) { omega(x, Math.round(q.x), Math.round(q.y + q.r * 0.04), q.r * 0.6 * (0.94 + 0.06 * S.om), S.om); on = true; } }
      return plate(x, t - PT.P, { name: o.name, cap: 'Primal Reversion', om: 1 }) || on; },
    fx(S, t, P) { if (S.om > 0 && S.shot === 1) { const q = gemAt(); if (q.z < 1) P.rays = { x: q.x * 2, y: q.y * 2, a: 1.6 * S.om * (0.5 + 0.5 * seg(t, PT.O, PT.S)), len: 0.7 }; P.bloom += 0.2 * S.om; }
      if (t >= PT.S && t < PT.S + 0.5) P.bloom += 0.25 * hit(t, PT.S, 0.5);
      if (t > PT.R + 0.6) C.parts('ash', { n: 80, seed: 8, cols: ['#3a2c2a', '#57423c', '#1c1414'], a: 0.9 * seg(t, PT.R + 0.6, PT.R + 2.2), spd: 1.5, z: [0, 1], wind: 0.55 }); } });

  /* ---------- Arenaen i kampen: samme sted som cutscenene ----------
     Jazz 18.11 (runde 5): kamparenaen fra steg 2 (den flate lavasletta) så «fryktelig unaturlig» ut etter cutscenen og «må ha samme layout som introen med steinene».
     Når pakken har 3D-filene, tegnes derfor bakgrunnen i kampen av det samme krateret (fjellveggene, steinene, krystallene, lavasjøen og vulkanen), sett fra et
     fast kamera: Groudon står i lavaen der han sto i introen (lavaen legges over føttene på figuren i mid), og din Pokémon står på et flak nær kameraet.
     Figurene er Gen 5-bildene som før, med scenens lys. Fase 2 (raseriet): vulkanen er i utbrudd, og det regner lavabomber. Uten 3D i pakken: arenaen fra steg 2. */
  const AID = 'c3:383a', AIDF = 'c3:383b', AFOE = [377, 182], AFIG = [352, 240], AME = [190, 370];   /* lavakanten på Groudon (16 piksler over føttene) og føttene til din egen, i arenaens piksler */
  /* fig = 1: PRØVE (Jazz 18.11, runde 6: Gen 5-bildet «føles så sykt malplassert»): den legendariske står i arenaen som samme 3D-figur som i cutscenene, i lavaen,
     med scenens lys, og den rører seg (puster, ser seg om, blunker, brøler når den kommer og når den forvandles, rykker til når den blir truffet). Bare i filmverkstedet
     (G3D.fig3): kampskjermen er ikke koblet på ennå (treff, angrep og besvimelse eies av bildet i kampen). */
  const arenaDef = fig => ({
    len: 1e9, models: fig ? ['groudon', 'groudon_primal'] : [],
    make(K, T) {
      const S = crater(T); volcano(S, T, 1, fig ? null : { x: -52, z: -410, r: 205, h: 92 });
      /* Kameraet: lavt (2 over lavaen) og 23 enheter fra Groudon, så han (7 enheter over lavaen) blir rundt 125 piksler høy og får plass under toppen av bildet,
         og himmelen og vulkanen får plass over ham. Dreid til plassen hans treffer AFOE.
         Flaket til din Pokémon legges der strålen gjennom AME treffer (tett på kameraet). Vulkanen står litt lenger unna enn i cutscenene, så hele fjellet og røyken synes. */
      /* MED FIGUREN I 3D (fig, Jazz 18.11 runde 6, etter kampbildet fra Omega Ruby): kameraet står tett på (15 enheter), lavt og vannrett, så han fyller
         høyre halvdel av bildet og føles stor, mens himmelen og vulkanen fra cutscenene står bak ham. Lavakanten hans ligger på AFIG. */
      const FV = fig ? 52 : 50, cp = fig ? [-5.3, 1.6, 17.4] : [-8.2, 2.05, 24.7], aim = fig ? AFIG : AFOE, kq = fig ? 15.5 / 394 : 23.4 / 412, tg = [HOME[0] - 5, 3, HOME[2]];
      for (let i = 0; i < 14; i++) { K.cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], FV); const q = K.proj(HOME[0], 0, HOME[2]); tg[0] -= (aim[0] - q.x) * kq; tg[1] += (aim[1] - q.y) * kq; }
      S.cp = cp; S.tg = tg; S.fv = FV; K.cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], FV); const m = K.ray(AME[0], AME[1], 0.5); S.me = [m.x, 0.5, m.z];
      const rm = K.rockMat({ a: '#150b0c', b: '#2c1a19', str: 0.9, top: 0.5, sm: 0.4, hot: 0.16 });
      S.rock = K.boulder(2.1, 77, { flat: 1, sy: 0.26, cap: 0.45, j: 0.22, d: 3, mat: rm }); S.rock.position.set(m.x + 0.15, 0.05, m.z - 0.45); S.scene.add(S.rock);
      for (const [dx, dz, r, sd] of [[3.4, -2.6, 1.1, 81], [-3.2, -3.4, 0.8, 83]]) { const b = K.boulder(r, sd, { flat: 1, sy: 0.14, cap: 0.3, j: 0.24, mat: rm }); b.position.set(m.x + dx, 0.02, m.z + dz); S.scene.add(b); }
      /* Røyken som ligger over sjøen etter utbruddet: store, mørke dotter som driver med vinden, lyst opp nedenfra. */
      S.haze = K.pts(46, i => ({ p: [-70 + rnd(i, 141) * 150, 3 + rnd(i, 142) * 16, -64 + rnd(i, 143) * 74], v: [2.2 + rnd(i, 144) * 2.6, 0.25 + rnd(i, 145) * 0.5, 0.5], b: rnd(i, 146) * 14, l: 14, z: 30 + rnd(i, 147) * 44 }), { loop: 1, shade: 1, px: 60, sz0: 0.8, sz1: 1.5, near: 9, c: ['#6a3a26', '#3a221c', '#1c1211'], a: 0, fade: 0.6 }); S.scene.add(S.haze);
      if (fig) { const g = S.gr = K.figure(K.model('groudon')), p = S.pg = K.figure(K.model('groudon_primal'), { hide: /MagmaLayer[12]/ }); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p);
        g.set('uGl', 0.5); p.set('uGl', 0.8); g.set('uWk', 0.7); p.set('uWk', 0.7); p.root.scale.setScalar(0.66);   /* Primal er 1,56 ganger så høy: krympet her, ellers går hodet ut av bildet */
        S.face = Math.atan2(cp[0] - HOME[0], cp[2] - HOME[2]) - 0.62; }   /* på skrå som i Omega Ruby: dreid mot venstre i bildet, så vi ser ham trekvart forfra */
      return S;
    },
    /* o = arenaens tilstand: { p2 (raseriet, 0–1), eT, fT, rT, pT (sekunder siden kampen startet, stedet slo til, raseriet, Primal-forvandlingen var over),
       hit: [x, z, alder] (ringen i lavaen), fh (sekunder siden den legendariske ble truffet) }. Raseriet gjør stedet varmere og vulkanen urolig; UTBRUDDET og røyken
       kommer først når forvandlingen er over (pT), så arenaen står slik cutscenen sluttet. */
    act(S, t, o) {
      const U = K.U(), L = S.lava.material.uniforms, p2 = o.p2 || 0, eT = o.eT == null ? 99 : o.eT, fT = o.fT == null ? 99 : o.fT, rT = o.rT == null ? 99 : o.rT, pT = o.pT == null ? 1e9 : o.pT, pr = pT < 1e8, pk = pr ? eo(c01((pT + 2) / 3)) : 0, heat = 0.5 + 0.4 * p2 + 0.3 * pk;
      L.uHeat.value = 0.62 + 0.24 * p2 + 0.2 * pk + 0.2 * hit(rT, 0.5, 1.5); L.uBri.value = 0.8 + 0.1 * p2; U.uGlow.value = 0.9 + 0.3 * p2; lerpC(U.uKeyC, '#f4e2d4', '#f0d2bc', pk); lerpC(U.uShC, '#3a1c24', '#42181a', p2); U.uRimK.value = 1;
      const ring = (i, x, z, age, v, d, a) => L.uRing.value[i].set(x, z, 1.5 + age * v, age >= 0 && age < d ? a * (1 - age / d) : 0);
      ring(0, HOME[0], HOME[2], eT, 20, 1.6, 0.9); ring(1, S.me[0] + 3.4, S.me[2] - 2.6, fT - 0.38, 14, 1.2, 1); ring(2, HOME[0], HOME[2], rT - 0.5, 26, 1.8, 1); const h = o.hit; ring(3, h ? h[0] : 0, h ? h[1] : 0, h ? h[2] : -1, 12, 0.9, 0.8);
      L.uWade.value.set(HOME[0], HOME[2] + 0.3, 9.5, 0.95 + 0.2 * p2 + 0.4 * hit(rT, 0.5, 1.5));
      S.embers.material.uniforms.uPx.value = 120 * (1 + 0.5 * p2 + 0.5 * pk);
      for (const q of S.dust.concat(S.deb, S.spl)) q.material.uniforms.uT0.value = -1e5; S.drip.visible = false; S.ring.visible = false;
      /* Vulkanen: ryker og er urolig (mer i raseriet). Etter Primal: fontenen står, toppen har nettopp eksplodert, og det regner lavabomber i bølger. */
      const tb = pr ? t - pT - 2 : -1; volcAct(S, t, 0.36 + 0.26 * p2 + 1.1 * pk + 0.06 * sin(t * 0.7), tb, tb);
      if (pr && pT > 4) S.vrain.material.uniforms.uT0.value = floor((t - 1) / 6.4) * 6.4 + 1;
      /* Røyklagt etter Primal: disen ligger tettere og nærmere, røykdotter driver over sjøen, og himmelen er dekket. */
      U.uFog.value.set(60 - 34 * pk, 300 - 110 * pk, 0.8 + 0.14 * pk); S.haze.material.uniforms.uA.value = 0.7 * pk; S.haze.visible = pk > 0.02;
      S.erupt = 0.25 * p2 + 1.3 * pk; S.smoke = pk; S.lit = 0.72 + 0.12 * p2 + 0.1 * pk; S.sun = 0.38 + 0.12 * p2 - 0.2 * pk; S.wake = heat; S.heat = 0; S.rw = 0; S.pk = pk;
      if (!S.gr) return;
      /* Figuren i 3D (prøven): den vanlige formen til forvandlingen er over, så Primal. Den puster, halen går, hodet følger rolig med, den blunker,
         brøler når kampen starter og når den er forvandlet, og rykker til når den blir truffet. */
      const f = pr ? S.pg : S.gr, fh = o.fh == null ? 99 : o.fh, fl = Math.exp(-5 * fh) * (fh < 99 ? 1 : 0), rt = pr ? pT : eT, rw = rt < 0 || rt > 3 ? 0 : back(seg(rt, 0.15, 0.45), 2.4) * (1 - io(seg(rt, 1.6, 2.5)));
      S.gr.root.visible = !pr; S.pg.root.visible = pr;
      f.root.position.set(HOME[0] + 0.05 * sin(t * 47) * fl, (pr ? -0.9 : HOME[1]) - 0.3 * sq(fh, 0, 13, 5) * (fh < 99 ? 1 : 0), HOME[2] - 0.5 * fl); f.root.rotation.y = S.face + 0.05 * sin(t * 0.37);
      if (!pr) f.add(STAT, 0.2); const br = 0.028 * sin(t * 2.4); f.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0], Neck1: [0, 0.03 * sin(t * 0.9 + 1), 0.06 * sin(t * 0.55)], Head: [0, 0.02 * sin(t * 1.3), 0.03 * sin(t * 0.55 + 0.6)], Jaw: [0, -0.06 - 0.04 * sin(t * 2.4), 0], '*Arm': [0.03 * sin(t * 2.4 + 0.5), 0, 0] }, 1);
      for (let i = 1; i <= 5; i++) f.rot('Tail' + i, 0, 0, 0.055 * sin(t * 1.9 + i * 0.55));
      f.add(pr ? PDUCK : DUCK, 0.8 * fl + kf(rt, [[-0.2, 0], [0.08, 0.9, io], [0.18, 0, eo]]) * (rt < 3 ? 1 : 0)); f.add(pr ? PROAR : ROAR, 0.75 * rw); f.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0);
      const E = f.mats.Eye1.uniforms; E.uUvOff.value.set(0, t % 4.6 < 0.12 ? 0.5 : rw > 0.2 || fl > 0.3 ? 0.75 : 0); E.uEmis.value = 0.5;
      f.set('uStone', 0); f.set('uFlK', 0.5 * fl * (floor(t * 30) % 2)); f.set('uFlC', '#ffffff');
      f.set('uCrack', pr ? 0.95 + 0.2 * sin(t * 4.2) + 0.5 * rw : 0); if (pr) for (const m in f.mats) if (f.mats[m].uniforms.uCrackC) lerpC(f.mats[m].uniforms.uCrackC, '#ffc626', '#fff2a8', 0.4 * rw);
    },
    shots: [[0, S => { K.cam(S.cp[0], S.cp[1], S.cp[2], S.tg[0], S.tg[1], S.tg[2], S.fv); S.post.vig = 0; }]],
  });
  G3D.def(AID, arenaDef(0)); G3D.def(AIDF, arenaDef(1));
  if (typeof ARENA !== 'undefined' && ARENA.defs[383]) {
    const d = ARENA.defs[383], sc0 = d.scene, mid0 = d.mid, fr0 = d.front, bl = C.blend; let on3 = false, lastT = 1e18;
    const aid = () => G3D.fig3 && G3D.isReady(AIDF) ? AIDF : AID;
    const scene3 = S => {
      const g = C.g, P = C.P, t = S.t, p2 = S.p2, id = aid(), pT = S.since('primal'), fT = S.since('field'), A = G3D.S(id), fh = G3D.fhAt != null ? (t >= G3D.fhAt ? t - G3D.fhAt : 99) : S.hits.filter(q => q.side !== 'me').map(q => t - q.t).filter(q => q >= 0).sort((a, b) => a - b)[0];   /* G3D.fhAt: filmverkstedet setter tidspunktet for et treff */
      const hs = S.hits.length ? S.hits[S.hits.length - 1] : null, hit3 = hs && A ? (hs.side === 'me' ? [A.me[0], A.me[2] - 3, t - hs.t] : [HOME[0], HOME[2] + 3, t - hs.t]) : null;
      const c = G3D.frame(id, t, { p2, eT: S.since('enter'), fT, rT: S.since('rage'), pT, hit: hit3, fh }, CINE._.rs()); if (!c) return sc0(S);
      const pk = A.pk || 0, heat = 0.5 + 0.4 * p2 + 0.3 * pk, sun = A.sun, sn = backdrop(A, t); g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, 512, 384);
      if (id === AIDF) C.cur.sp = null;   /* prøven: figuren står i 3D-bildet, så Gen 5-bildet tegnes ikke */
      /* Røyklagt etter Primal: røyk i lag over sjøen, tettest ved horisonten. */
      if (pk > 0.02) { C.fogBand(sn.hz + 2, { h: 44, col: '#3a1d16', a: 0.6 * pk, seed: 41, spd: 6, n: 7 }); C.fogBand(sn.hz + 52, { h: 60, col: '#24110e', a: 0.42 * pk, seed: 43, spd: 10, n: 5 }); }
      /* Lyset på figurene: som i arenaen fra steg 2 (varmt og mørkt, lavaen lyser nedenfra, kantlys fra sola og vulkanen). */
      C.lightSet({ amb: bl('#b8826c', '#d09a80', 0.5 * sun), sat: 0.84, lift: '#34140e',
        lights: [{ col: '#ff6a1c', a: min(0.85, 0.34 + 0.3 * min(1.3, heat)), h: 0.72 }], rim: [{ col: '#ffb060', dx: 1, dy: 1, a: 0.3 + 0.55 * sun }, { col: '#ff7a24', dx: 0, dy: -1, a: 0.5 + 0.25 * min(1, heat) }],
        glow: { mask: 'seam', col: '#ff9a2c', a: (0.5 * p2 + 0.5 * hit(S.since('rage'), 0.5, 2.5)) * (0.8 + 0.2 * sin(t * 6)) },
        me: { amb: '#c48e76', sat: 0.92, lights: [{ col: '#ff6a1c', a: min(0.8, 0.4 + 0.3 * min(1.3, heat)), h: 0.5 }], rim: [{ col: '#ffa050', dx: -1, dy: 1, a: 0.35 + 0.4 * sun }, { col: '#ff7a24', dx: 0, dy: -1, a: 0.6 }] } });
      /* Din Pokémon på flaket: skyggen kastet framover og kontaktskyggen under føttene. */
      if (C.cur.sps.me) C.monShadow(S.me[0], S.me[1] - 3, 1.6 * S.mk, { id: 'me', a: 0.45, len: 0.1, skew: -0.4, ft: S.ftm, col: '#0b0304' }); C.contact(S.me[0], S.me[1] - 4, 60 * S.mk, { a: 0.85, col: '#0b0304', sy: 0.22 });
      /* Stedet slår til: en søyle av lava spruter opp av sjøen ved flaket ditt. */
      if (fT < 1.4 && A) { const q = K.proj(A.me[0] + 3.4, 0, A.me[2] - 2.6), k = hit(fT, 0.38, 0.9); if (k > 0) { for (let j = 0; j < 9; j++) { const u = j / 8, fl = 0.7 + 0.3 * sin(t * (19 + j * 3) + j); C.blob(q.x + sin(t * 9 + j * 2) * 3 * j, q.y - u * 230 * (1 - (1 - k) * (1 - k)), (32 - u * 17) * (0.5 + 0.5 * k) * fl, u < 0.35 ? '#fff2c8' : u < 0.7 ? '#ffc050' : '#ff7a20', k * (0.9 - u * 0.4), 1, 1.5); } C.blob(q.x, q.y, 110 * k, '#ff7a2a', k, 1, 0.5); } }
      P.heat = 1.3 + 1.5 * min(1.3, heat) + 1.6 * sun; P.heatY = sn.hz; P.heatUp = 90 + 120 * sun; P.heatDn = 110 + 160 * sun;
      P.bloom = 0.42 + 0.14 * sun; P.bloomT = 0.74; P.grain = 0.035; P.vig = 0.5 - 0.15 * sun + 0.12 * pk; P.vigc = '#0a0102'; P.grade = { tint: [1.04, 0.985 - 0.02 * pk, 0.93 - 0.04 * pk], con: 1.07, sat: 1.05 - 0.08 * pk, exp: 1.02 - 0.05 * pk };
      if (A && A.boom > 0.02 && sn.cq > 0.05) P.rays = { x: sn.cx, y: sn.cy, a: 0.5 * A.boom, len: 0.9 }; else if (sun > 0.3 && sn.y > -80 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.6 * (sun - 0.3), len: 0.85 };
    };
    /* Mellom figurene: lavaen han står i legges over føttene (bildet bak figurene, under en bølget kant), med glød og småsprut i kanten, og varmedisen fra før. */
    const mid3 = S => { const t = S.t, x0 = S.foe[0] - 120, x1 = S.foe[0] + 120, y = AFOE[1] + 1, line = [];
      for (let x = x0; x <= x1; x += 6) line.push([x, y + 1.6 * sin(x * 0.11 + t * 2.3) + 1.1 * sin(x * 0.27 - t * 3.1)]);
      if (S.back) C.seaOver(S.back, line, S.foe[1] + 40);
      const w = 62 * S.fk; C.blob(S.foe[0], y + 3, w * 1.5, '#ff6a1c', 0.4, 1, 0.14);
      for (let i = 0; i < 16; i++) { const u = (i + 0.5) / 16 - 0.5, fl = 0.5 + 0.5 * sin(t * (7 + rnd(i, 5) * 9) + i * 2.1), r = (4 + rnd(i, 6) * 7) * (0.6 + 0.4 * fl); C.blob(S.foe[0] + u * w * 2.3 + sin(t * 3 + i) * 2, y + 1 - r * 0.3 * fl, r, i % 3 ? '#ffb040' : '#fff2c8', 0.45 + 0.4 * fl, 1, 0.55); }
      mid0(S); };
    d.scene = S => { if (S.film) return sc0(S); if (S.t < lastT || !on3) on3 = G3D.isReady(AID); lastT = S.t; return on3 ? scene3(S) : sc0(S); };
    d.ev.primal = { len: 0.1, cues: [] };
    d.mid = S => !on3 || S.film ? mid0(S) : aid() === AIDF ? null : mid3(S); d.front = S => fr0(S);
  }
})();
