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
  function volcano(S, T, big) {
    const at = m => { m.position.set(VOL.x, VOL.h, VOL.z); S.scene.add(m); return m; }, hot = ['#fff2a8', '#ffa020', '#c83008'];
    S.vol = K.volcano({ r: VOL.r, h: VOL.h, seed: 5 }); S.vol.position.set(VOL.x, -2, VOL.z); S.scene.add(S.vol);
    S.vspat = at(K.pts(54, i => { const a = rnd(i, 41) * TAU, q = rnd(i, 42); return { p: [cos(a) * 7 * q, -5, sin(a) * 7 * q], v: [cos(a) * (3 + 15 * q), 24 + rnd(i, 43) * 30, sin(a) * (3 + 15 * q)], b: (i % 2) * 2.6 + rnd(i, 44) * 0.35, l: 5.2, z: 4 + rnd(i, 45) * 5 }; }, { loop: 1, add: 1, g: 28, px: 150, floor: -7, c: hot, fade: 0.45 }));
    S.vflash = at(K.light(1, '#ffd890', { depth: false })); S.vflash.renderOrder = 6;
    if (!big) return;
    S.vfnt = at(K.pts(120, i => { const a = rnd(i, 11) * TAU, q = rnd(i, 12); return { p: [cos(a) * 8 * q, -4, sin(a) * 8 * q], v: [cos(a) * (6 + 38 * q), 40 + rnd(i, 14) * 62, sin(a) * (6 + 38 * q)], b: rnd(i, 16) * 3.6, l: 2.8 + rnd(i, 17) * 1.4, z: 5 + rnd(i, 18) * 7 }; }, { loop: 1, add: 1, g: 30, px: 150, c: hot, fade: 0.8 }));
    S.vboom = at(K.pts(190, i => { const a = rnd(i, 21) * TAU, q = 0.25 + rnd(i, 22) * 0.75, el = 0.35 + rnd(i, 23) * 1.1; return { p: [cos(a) * 10, -3, sin(a) * 10], v: [cos(a) * cos(el) * 160 * q, sin(el) * 185 * q, sin(a) * cos(el) * 160 * q], b: rnd(i, 24) * 0.3, l: 3.6 + rnd(i, 25) * 1.8, z: 7 + rnd(i, 26) * 12 }; }, { t0: -1e5, add: 1, g: 34, px: 150, sz0: 1.2, sz1: 0.5, c: ['#fffbe0', '#ffb030', '#b82a08'], fade: 0.75 }));
    S.vash = at(K.pts(110, i => { const a = rnd(i, 31) * TAU, q = 0.2 + rnd(i, 32) * 0.8, el = 0.25 + rnd(i, 33) * 1.2; return { p: [cos(a) * 14, 0, sin(a) * 14], v: [cos(a) * cos(el) * 66 * q, sin(el) * 70 * q + 10, sin(a) * cos(el) * 66 * q], b: rnd(i, 34) * 0.9, l: 7 + rnd(i, 35) * 4, z: 55 + rnd(i, 36) * 80 }; }, { t0: -1e5, shade: 1, drag: 1.5, sz0: 0.35, sz1: 1.8, px: 150, c: ['#ffa850', '#5a2c20', '#170d0f'], a: 0.85, fade: 0.55 }));
    /* Lavabomber som regner ned over sjøen etter eksplosjonen: glødende klumper med hale, fra høyt oppe bak og inn mot kameraet. */
    S.vrain = K.pts(70, i => { const x = (rnd(i, 51) - 0.5) * 150, z = -70 + rnd(i, 52) * 110; return { p: [x - 12, 95 + rnd(i, 53) * 50, z - 42], v: [5 + rnd(i, 54) * 9, -34 - rnd(i, 55) * 18, 16 + rnd(i, 56) * 12], b: 0.8 + rnd(i, 57) * 5.5, l: 3.4, z: 2.2 + rnd(i, 58) * 3.4 }; }, { t0: -1e5, add: 1, g: 9, px: 110, floor: 0, sz0: 1, sz1: 1.25, c: ['#fff6c8', '#ffb234', '#e84a0c'], fade: 0.97 }); S.scene.add(S.vrain);
  }
  function volcAct(S, t, er, tb) {
    const b = tb >= 0 && t >= tb, k = min(1.6, er);
    S.er = er; S.boom = b ? hit(t, tb, 3.4) : 0; S.vol.material.uniforms.uEr.value = er;
    S.vspat.material.uniforms.uPx.value = 300 * (0.5 + 0.5 * k); S.vspat.material.uniforms.uA.value = c01(0.2 + er * 0.9);
    K.face(S.vflash); const fl = b ? 0.8 * hit(t, tb, 1.4) : 0.22 * max(0, er - 0.3) * (0.7 + 0.3 * sin(t * 2.3)); S.vflash.scale.setScalar(b ? 60 + 300 * eo(seg(t, tb, tb + 0.25)) : 46 + 30 * k); S.vflash.material.uniforms.uA.value = fl; S.vflash.visible = fl > 0.01;
    if (!S.vfnt) return;
    const f = b ? c01((t - tb) / 0.5) : 0; S.vfnt.visible = f > 0; S.vfnt.material.uniforms.uPx.value = 300 * (0.5 + 0.6 * k); S.vfnt.material.uniforms.uA.value = f;
    for (const q of [S.vboom, S.vash, S.vrain]) q.material.uniforms.uT0.value = b ? tb : -1e5;
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
      g.set('uGl', 0.5); g.set('uStoneC', '#9a909e');         /* han skal være RØD når steinen er borte, ikke gul av gløden nedenfra */
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
      L.uWade.value.set(X.x, X.z + 0.5, 8, 0.4 + 0.32 * hot);
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
  const UR = 560, wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  const backdrop = (S, t) => {
    const g = C.g, v = G3D.view(), k = v.ppr / UR, er = S.er, lit = S.lit, sun = S.sun, bl = C.blend;
    g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
    const gr = g.createLinearGradient(0, -UR * 1.05, 0, 10); gr.addColorStop(0, '#050203'); gr.addColorStop(0.55, bl('#0e0506', '#1d0807', lit)); gr.addColorStop(0.84, bl('#1a0706', '#571607', lit)); gr.addColorStop(1, bl('#3a0e06', '#c8480e', lit * (0.75 + 0.25 * min(1, er))));
    g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 4012); g.fillStyle = bl('#3a0e06', '#b03c0c', lit * 0.8); g.fillRect(-4000, 10, 8000, 4000);
    const dx = VOL.x - v.cx, dz = VOL.z - v.cz, d = Math.hypot(dx, dz), X = wrap(Math.atan2(dx, -dz) - v.yaw) * UR, e0 = Math.atan2(-v.cy, d), yb = -e0 * UR, hh = (Math.atan2(VOL.h - v.cy, d) - e0) * UR, ww = 2 * Math.atan2(VOL.r, d) * UR, sx = X + ww * 0.3, sy = yb - hh * 1.3;
    if (sun > 0.01) { C.blob(sx, sy, 130 + 40 * sun, '#ff8a2a', 0.3 * sun, 1); C.blob(sx, sy, 46, '#ffe9b0', 0.7 * sun, 1); C.blob(sx, sy, 15, '#ffffff', sun, 1); C.blob(sx, sy, 210, '#ffd9a0', 0.3 * sun, 1, 0.035); }
    for (let i = 0; i < 18; i++) { const x = wrap(rnd(i, 3) * TAU + t * (0.004 + rnd(i, 4) * 0.004) - v.yaw) * UR, y = -(36 + rnd(i, 5) * 250), r = 70 + rnd(i, 6) * 90; if (abs(x) > 760) continue; C.blob(x, y, r, bl('#120a0b', '#241517', lit), 0.86, 0, 0.42); C.blob(x + 8, y + r * 0.26, r * 0.86, '#c8400c', (0.16 + 0.24 * min(1.2, er)) * lit, 1, 0.24); }
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
      if (S.boom > 0.02 && sn.cq > 0.05) P.rays = { x: sn.cx, y: sn.cy, a: 0.9 * S.boom, len: 0.9 }; else if (S.sun > 0.3 && sn.y > -80 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.7 * (S.sun - 0.3), len: 0.85 };
      if (d.fx) d.fx(S, t, P, q, sn); } }); };
  reg('c3:383', { spid: 383, over: plate, cues: [[GL[0], 'thud'], [GL[1], 'thud'], [GT[0], 'thud'], [GT[2], 'thud'], [GC, 'cry'], [GC + 0.05, 'boom'], [GP, 'boom'], [GX, 'cry']], roar: t => t < GX ? GC : GX,
    /* Mens lyset i steinen stiger: mer glød, og stråler ut fra brystet (lyset siver ut av sprekkene, som i Omega Ruby). */
    fx(S, t, P) { const h = S.heat || 0; if (h <= 0) return; P.bloom += 0.34 * h * h + 0.1 * (S.pul || 0) * h;
      if (h > 0.25 && S.shot === 1) { const c = S.gr.at('Spine3'), m = K.proj(c.x, c.y, c.z); if (m.z < 1) P.rays = { x: m.x, y: m.y, a: 2.6 * (h - 0.25) / 0.75 + 0.5 * (S.pul || 0), len: 0.6 }; } } });
})();
