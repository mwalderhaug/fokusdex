'use strict';
/* Fokusdex – Groudon (383) i 3D: krateret ved Terra Cave. Lavasjø med skorpeflak, fjellvegger med hyller, røde krystaller og vulkanen bak kanten.
   Lastes først når et raid med Groudon viser seg (G3C.load i raid3c.js, der verktøykassa står; motoren og stilen er raid3d.js). Reglene bak hvert valg: work/RAIDS3D.md.
   GROUDON ER STANDARDEN (Jazz 18.11: «Ferdig med Groudon nå»): cutscenen, Primal-cutscenen, arenaen og 3D-figuren i kampen endres ikke uten at han ber om det.
   Sjekk bilde mot bilde etter hver endring i motoren eller verktøykassa: work/g3d/scripts/bildemot.js og bildemot.py.
   Fila gir 'c3:383' (introen), 'c3:383p' (Primal Reversion ved raseriet), 'c3:383a' og 'c3:383b' (arenaen uten og med 3D-figuren). */
(() => {
  const K = G3D.K, C = CINE.kit, X = G3C, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, hit, rnd, hex } = K, kf = C.kf, { lerpC, col3, sq } = X;
  /* MODELLENE (pakken, 3d/): 'groudon' er Jazz sin nedlasting fra Omega Ruby. 'groudon_primal' er Switch-modellen fra det åpne arkivet, lagt i pakken: Jazz valgte
     den 18.11 («likte endringen på Groudon så behold den. Rad 3», raids3d/2b1_primal_pakke_arkiv.jpg). Den har samme skjelett og samme poser som 3DS-modellen, men
     årene er egne flater (BodyBInc00) med en matt, lys tekstur i stedet for en linjemaske: de lyser selv i årenes farge (veins), kroppen farges ned til en mørkere
     rød (AMUL), øyet er en annen tekstur enn 3DS-atlaset og får bare eget lys, og sømmer brukes ikke (teksturens mørke streker er ikke årer).
     3DS-MODELLEN AV PRIMAL (pack/3d/src/groudon/GroudonPrimal_OpenCollada.DAE) virker fortsatt hvis den legges i pakken som 'groudon_primal' (figuren kjennes på
     materialene). Runde 21 («hull i magen») gjelder den: kroppen har åpninger langs årene, og MagmaLayer1 er lappen som tetter dem. Den tegnes som en del av figuren,
     farget mørk som glør (FILL), og det lyse kommer fra linjemasken (lag 3) som gløder oppå. Lag 2 er en kopi og står skjult. */
  const FILL = '#4f1f1c', AMUL = '#bd99bd', AVN = [1.75, 1.5, 0.62];
  const primalFig = o => { const p = K.figure(K.model('groudon_primal'), Object.assign({ hide: /MagmaLayer2/, rules: [[/^Eye$/, { eye: 1, atlas: 0 }], [/^BodyBInc\d/, { seamOn: 0, emis: 1 }], [/^BodyEnv/, { seamOn: 0, mul: AMUL }]] }, o));
    p.ark = p.mats.BodyBInc00 || null; if (p.ark) for (const e of p.eyes) e.uniforms.uMul.value.setRGB(1.5, 1.3, 0.35);   /* øyet gult som årene, ikke rødt */
    const m = p.mats.BodyBInc; if (m) m.uniforms.uMul.value.setRGB(...hex(FILL)); return p; };
  /* Årene av magma: v = hvor sterkt de gløder (0 = mørke som glør, rundt 1 = fullt, over = blusser), k = hvor hvite (0–1). */
  const veins = (p, v, k) => {
    if (p.ark) { const g = c01(v), w = 0.72 + 0.28 * min(v, 1.8), D = [0.42, 0.2, 0.17]; p.ark.uniforms.uMul.value.setRGB(mix(D[0], AVN[0] * w, g), mix(D[1], AVN[1] * w * (1 + 0.08 * k), g), mix(D[2], AVN[2] * w * (1 + 1.3 * k), g)); return; }
    p.set('uCrack', v); for (const m in p.mats) if (p.mats[m].uniforms.uCrackC) lerpC(p.mats[m].uniforms.uCrackC, '#ffc626', '#fff2a8', k); };

  /* ---------- Stedet: krateret ----------
     Nesten bare lava (Jazz 18.11: «bakken er for lite lava», og han skal stå i den): lavasjøen er arenaens materiale i 3D, med noen få skorpeflak langt ute,
     fjellvegger med hyller og røde krystaller. Himmelen og vulkanen tegnes i 2D bak (backdrop under). */
  function crater(T) {
    const S = { scene: new T.Scene(), figs: [] }, sc = S.scene, add = (m, x, y, z, ry) => { m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; sc.add(m); return m; };
    S.lava = add(K.lava({ cw: 0.06 }));
    /* Veggene: en indre ring med hyller og en høyere ytre. Mot vulkanen (−Z) er begge lavere, så krateret åpner seg mot den. */
    const dip = a => 1 - 0.6 * Math.exp(-Math.pow((((a - PI * 1.5) % TAU + TAU + PI) % TAU - PI) / 0.7, 2));
    add(K.cliff({ r: 76, h: 27, y0: -2, rough: 7, back: 15, steps: 3, ledge: 2.6, seed: 3, n: 64, m: 8, hf: dip, mat: K.rockMat({ a: '#2a1616', b: '#4a2a22', str: 0.14, sm: 0.85, far: 1 }) }));
    add(K.cliff({ r: 134, h: 52, y0: -2, rough: 13, back: 24, steps: 2, seed: 8, n: 44, m: 7, hf: a => 0.3 + 0.7 * dip(a), mat: K.rockMat({ a: '#1e1113', b: '#30191a', str: 0.08, sm: 0.85, far: 1 }) }));
    const fm = K.rockMat({ a: '#1c0f0e', b: '#30181a', str: 0.5, top: 1, sm: 0.5, hot: 0.14 });   /* runde 9: tynne flak gløder bare i kanten mot lavaen, så de står mørke mot den */
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
    /* Lavaen bobler (Jazz 18.11, runde 8: «lavapartikler som hopper opp ulike plasser i ny og ne»): tolv steder ute i sjøen, hvert med sin takt (5–11 s) og fase.
       Der gløder lavaen opp like før, og sju klumper spretter opp og faller tilbake i den (de forsvinner når de når overflaten). Ikke der han står, og ikke ved steinen din. */
    const POP = []; for (let i = 0; POP.length < 12 && i < 300; i++) { const x = (rnd(i, 401) - 0.5) * 76, z = -36 + rnd(i, 402) * 56; if ((abs(x) < 8 && z > -5 && z < 11) || (x < -1 && x > -18 && z > 9)) continue; POP.push([x, z, 5 + rnd(i, 403) * 6, rnd(i, 404) * 11]); }
    S.lava.material.uniforms.uPop.value.forEach((v, i) => { const q = POP[i]; if (q) v.set(q[0], q[1], q[2], q[3]); });
    S.pop = add(K.pts(POP.length * 7, i => { const q = POP[floor(i / 7)], a = rnd(i, 411) * TAU, h = 0.4 + rnd(i, 412) * 2.2; return { p: [q[0] + cos(a) * 0.35, 0.1, q[1] + sin(a) * 0.35], v: [cos(a) * h, 5 + rnd(i, 413) * 5, sin(a) * h], b: q[3], l: q[2], z: 0.8 + rnd(i, 414) * 1.3 }; },
      { loop: 1, add: 1, g: 22, px: 60, floor: 0, near: 6, c: ['#ffc860', '#ff6a14', '#a82806'], fade: 0.97 }));
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


  /* ---------- Posene ---------- */
  const STAT = { Neck1: [0, -0.16, 0], Neck2: [0, -0.06, 0], Head: [0, -0.12, 0], Spine2: [0, -0.05, 0], '*Arm': [0.12, -0.25, 0.18] };                 /* statuen: hodet senket, armene inntil */
  /* Brølet (Jazz sitt referanseark 18.11): brystet fram, ryggen i bue, skuldrene bakover, armene ut med åpne klør, kjeften helt opp, beina plantet. */
  const ROAR = { Neck1: [0, 0.28, 0], Neck2: [0, 0.2, 0], Head: [0, 0.15, 0], Jaw: [0, -0.82, 0], Spine1: [0, 0.06, 0], Spine2: [0, 0.14, 0], Spine3: [0, 0.1, 0], Hips: [0, -0.05, 0], Tail2: [0, 0.12, 0], Tail3: [0, 0.12, 0], Tail4: [0, 0.12, 0], '*Arm': [0.25, 0.35, -0.8], '*Hand': [0.55, 0, -0.15] };
  const DUCK = { Neck1: [0, -0.2, 0], Neck2: [0, -0.1, 0], Head: [0, -0.14, 0], Spine2: [0, -0.1, 0], Spine3: [0, -0.06, 0], '*Arm': [0, -0.3, 0.2] };
  /* Hvor på kroppen steinhuden sitter: benene i en gitt stilling, i verden. Brukes til å la flak og støv starte på kroppen. */
  const SHELL = ['Head', 'Head', 'Neck1', 'Spine3', 'Spine3', 'Spine2', 'Spine2', 'Spine1', 'Hips', 'LArm', 'RArm', 'LHand', 'RHand', 'LThigh', 'RThigh', 'LLeg', 'RLeg', 'Tail1', 'Tail2', 'Tail3'];
  const bodyPts = (g, pose) => { g.clear(); if (pose) g.add(pose, 1); g.root.position.set(HOME[0], HOME[1], HOME[2]); g.apply(); const r = SHELL.filter(n => g.bones[n]).map(n => g.at(n).toArray()); g.clear(); g.apply(); return r; };

  /* ---------- Primal Reversion (raseriet ved halv HP), som i Omega Ruby ----------
     Jazz 18.11: en kort cutscene midt i kampen (krystallen, Ω-tegnet, den knuses), og det er HER vulkanen bryter ut, med masse røyk, lava og lavapartikler.
     Lyset samler seg om ham og stivner til en rosa krystall, krystallen mørkner, Ω-tegnet tennes på den og den slår sprekker, og så knuses den: Primal Groudon
     står der med glødende årer mens vulkanen bryter ut bak ham. Et langt nærbilde oppover kroppen, og så brølet i et vidt bilde der vulkanen eksploderer.
     Den følger ikke slagene i låta (kamplåta går videre under), og den venter ikke på Continue: den ender i et hvitt blink og går rett tilbake til kampen. */
  /* Runde 9: «Etter forvandlingen til Primal: litt lengre oppladning før brølet.» Brølet kommer 0,95 s senere (før: R 8,35, lengden 12,55 s), og oppladningen (Q) går i det vide bildet. */
  const PT = { G0: 1.0, G1: 1.75, D0: 3.0, D1: 3.8, O: 4.05, K: 4.9, S: 6.0, C: 6.55, Q: 8.2, R: 9.3, P: 9.9, F: 13.05, E: 13.5 };
  const PHOME = [0, -1.2, 2.8], GEM = [0, 5, 2.9], GEMR = 6.7;
  const PROAR = { Neck1: [0, 0.17, 0], Neck2: [0, 0.13, 0], Neck3: [0, 0.09, 0], Head: [0, 0.1, 0], Jaw: [0, -0.85, 0], Spine1: [0, 0.08, 0], Spine2: [0, 0.14, 0], Hips: [0, -0.05, 0], Tail2: [0, 0.1, 0], Tail3: [0, 0.1, 0], '*Arm': [-0.35, 0.15, 0.75], '*Hand': [0.3, 0, 0] };
  const PDUCK = { Neck1: [0, -0.18, 0], Neck2: [0, -0.1, 0], Neck3: [0, -0.06, 0], Head: [0, -0.12, 0], Spine2: [0, -0.08, 0], '*Arm': [0, -0.25, -0.2] };
  const BOMBS = [[1.2, -15, 9], [1.55, 13, -2], [1.95, -5, 17], [2.35, 17, 12], [2.8, -20, -4], [3.25, 6, 20]];   /* lavabomber som slår ned i sjøen etter eksplosjonen: [sekunder etter brølet, x, z] */
  G3D.def('c3:383p', {
    len: PT.E, R: PT.R, at: 0, models: ['groudon', 'groudon_primal'],
    make(K, T) {
      const S = crater(T), g = S.gr = K.figure(K.model('groudon')), p = S.pg = primalFig(); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p);
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
      g.root.visible = t < PT.G1 - 0.03; p.root.visible = !pre;
      /* 1 Groudon (vanlig form): rasende, sammentrukket og skjelvende, mens det rosa lyset samler seg om ham og han blir til lys. */
      const str = io(seg(t, 0, 0.9)); g.root.position.set(HOME[0] + 0.03 * sin(t * 61) * str, HOME[1], HOME[2]);
      g.add(STAT, 0.2); g.add(DUCK, 0.9 * str); g.add({ Jaw: [0, -0.3, 0] }, str); g.rot('Jaw', 0, 0.03 * sin(t * 48) * str, 0);
      g.mats.Eye1.uniforms.uUvOff.value.set(0, 0.75); g.set('uStone', 0); g.set('uCrack', 0); g.set('uFlC', '#ffb4e6'); g.set('uFlK', 0.92 * io(seg(t, 0.3, PT.G0 + 0.3)) + 0.08 * seg(t, PT.G0, PT.G1));
      /* 2 Krystallen: vokser fram rastrert (han skimtes inni), lukker seg på G1, dreier sakte, mørkner (D0–D1) og slår sprekker av lys fra K til den knuses på S. */
      const gk = seg(t, PT.G1 - 0.03, PT.G1 + 0.3), spin = 0.22 * (t - PT.G1); S.gem.visible = t >= PT.G1 - 0.03 && pre; S.gem.scale.setScalar(GEMR * (pre ? mix(0.8, 1, back(gk, 1.6)) + 0.012 * sin(t * 40) * seg(t, PT.K, PT.S) : 1)); S.gem.rotation.set(0.08 * sin(spin * 1.3), spin, 0);
      gm.uAl.value = 1; gm.uDark.value = io(seg(t, PT.D0, PT.D1)) * 0.96; gm.uCrk.value = t >= PT.K ? 1 : 0; gm.uCrkR.value = 2.3 * eo(seg(t, PT.K, PT.S - 0.1)); lerpC(gm.uCrkC, '#ffc21e', '#fff6c0', seg(t, PT.S - 0.5, PT.S));
      S.motes.visible = t < PT.G1 + 0.2; S.motes.material.uniforms.uA.value = seg(t, 0.1, 0.5) * (1 - seg(t, PT.G1 - 0.2, PT.G1 + 0.2));
      K.face(S.aura); S.aura.position.set(GEM[0], GEM[1], GEM[2] - 1); S.aura.scale.setScalar(15 + 9 * seg(t, 0, PT.G1) + 5 * ei(seg(t, PT.G0, PT.G1))); S.aura.material.uniforms.uA.value = t < PT.D1 ? (0.55 * io(seg(t, 0.2, PT.G0 + 0.4)) + 0.4 * ei(seg(t, PT.G0, PT.G1)) * (t < PT.G1 ? 1 : 0)) * (1 - 0.85 * seg(t, PT.D0, PT.D1)) + 0.5 * hit(t, PT.G1, 0.4) : 0; S.aura.visible = t < PT.D1;
      const om = t >= PT.O && pre ? min(1, (t - PT.O) / 0.25) * (0.82 + 0.18 * sin((t - PT.O) * (5 + 9 * seg(t, PT.K, PT.S)))) : 0; S.om = om;
      /* 3 Krystallen knuses (S): skår og støv, et lysglimt, og Primal Groudon står der. Han kommer ut av lyset, reiser seg sakte, trekker seg sammen og brøler (R). */
      S.sh1.at(t, PT.S, { g: 16 }); S.sh2.at(t, PT.S, { g: 16 }); S.puff.material.uniforms.uT0.value = PT.S;
      K.face(S.burst); S.burst.position.set(GEM[0], GEM[1], GEM[2]); S.burst.scale.setScalar(pre ? 10 + 16 * seg(t, PT.S - 0.35, PT.S) : 26 + 70 * eo(seg(t, PT.S, PT.S + 0.5))); S.burst.material.uniforms.uA.value = pre ? 0.8 * ei(seg(t, PT.S - 0.4, PT.S)) : 0.7 * hit(t, PT.S, 0.28); S.burst.visible = t > PT.S - 0.4 && t < PT.S + 0.3;
      /* Han reiser seg, og så lader han opp (Q til R): synker sammen, skjelver mer og mer, årene blusser i takt, og lavaen rundt ham koker, før brølet. */
      const rise = io(seg(t, PT.S + 0.2, PT.Q - 0.3)), chg = t < PT.R ? seg(t, PT.Q, PT.R) : 0, rw = t < PT.R ? 0 : back(seg(t, PT.R, PT.R + 0.3), 2.6) * (1 - 0.35 * io(seg(t, PT.R + 2.2, PT.E))), ry = PHOME[1] - 0.4 * sq(t, PT.S, 11, 4) + 0.14 * sq(t, PT.R, 14, 4) - 0.12 * io(chg), chp = (t - PT.Q) * (9 + 7 * chg);
      p.root.position.set(PHOME[0] + 0.03 * sin(t * 53) * chg * chg, ry, PHOME[2]);
      p.add(PDUCK, (1 - 0.8 * rise) + kf(t, [[PT.Q, 0], [PT.R - 0.5, 0.75, io], [PT.R - 0.16, 0.98, io], [PT.R - 0.03, 1.22, ei], [PT.R + 0.1, 0, eo]])); S.chg = chg;
      const br = 0.03 * sin(t * 3.1) * (!pre ? 1 : 0); p.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0], Jaw: [0, -0.16 * rise * (1 - rw), 0] }, 1); for (let i = 1; i <= 5; i++) p.rot('Tail' + i, 0, 0, 0.05 * sin(t * 2.1 + i * 0.55));
      p.add(PROAR, rw); p.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); p.rot('Head', 0, 0, 0.022 * sin(t * 43) * rw); S.rw = rw; S.mouth = null;
      p.eye(0, t > PT.R - 0.6 ? 0.75 : 0, 0.6);
      /* Årene av magma: gløder fra han kommer fram, pulserer som et hjerte, og blusser i brølet. */
      veins(p, pre ? 0 : 0.95 + 0.22 * sin(t * 4.2) + 0.5 * rw + 0.6 * hit(t, PT.S, 0.8) + chg * (0.35 + 0.3 * sin(chp)), c01(0.3 * rw + hit(t, PT.S, 0.7) + hit(t, PT.R, 0.6)));
      p.set('uFlC', '#fff4c8'); p.set('uFlK', pre ? 0 : 0.9 * (1 - eo(seg(t, PT.S, PT.S + 0.4))));
      /* Stedet: lavaen blir varmere for hvert trinn, og lyset skifter fra rosa (krystallen) til hvitglødende. */
      const post = pre ? 0 : 1, hot = 0.75 + 0.1 * seg(t, PT.O, PT.S) + 0.15 * post; S.wake = hot; S.heat = 0;
      L.uHeat.value = 1 + 0.12 * seg(t, PT.O, PT.S) + 0.22 * post + 0.25 * hit(t, PT.S, 1.2) + 0.2 * hit(t, PT.R, 1.6) + 0.25 * chg; L.uBri.value = 0.95 - 0.12 * seg(t, PT.D0, PT.D1) * (1 - post); U.uGlow.value = 1 + 0.2 * post + 0.25 * rw;
      if (pre) { col3(U.uKeyC, c01(seg(t, 0.2, PT.G1) - seg(t, PT.D0, PT.D1) * 0.5), '#fff0dc', '#ffdcee', '#ffc8ea'); lerpC(U.uShC, '#3c1a22', '#3a1830', seg(t, 0.2, PT.G1)); } else { lerpC(U.uKeyC, '#fff8e0', '#fff0d2', seg(t, PT.S, PT.S + 0.6)); lerpC(U.uShC, '#3c1a22', '#42181a', 1); } U.uRimK.value = 1;
      const ring = (i, x, z, t0, v, d, a) => L.uRing.value[i].set(x, z, 1.5 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
      const bi = BOMBS.map(b => t >= PT.R + b[0]), bn = bi.lastIndexOf(true), bb = bn >= 0 ? BOMBS[bn] : null;
      ring(0, GEM[0], GEM[2], t < PT.O ? PT.G1 : t < PT.S ? PT.O : t < PT.Q + 0.25 ? PT.S : PT.Q + 0.25, t < PT.S ? 12 : t < PT.Q + 0.25 ? 26 : 9, t < PT.Q + 0.25 ? 1.6 : 1.1, 1); ring(1, PHOME[0], PHOME[2], PT.R, 30, 1.7, 1); ring(2, bb ? bb[1] : 0, bb ? bb[2] : 0, bb ? PT.R + bb[0] : 1e5, 15, 1.5, 1); ring(3, bn > 0 ? BOMBS[bn - 1][1] : 0, bn > 0 ? BOMBS[bn - 1][2] : 0, bn > 0 ? PT.R + BOMBS[bn - 1][0] : 1e5, 15, 1.5, 1);
      L.uWade.value.set(PHOME[0], PHOME[2] + 0.3, pre ? 9.5 : 11, 0.95 + 0.25 * post + 0.5 * hit(t, PT.S, 1.2));
      S.fx(S.spl[0], PT.S, GEM[0], 0, GEM[2] + 1); S.fx(S.dust[0], PT.S, GEM[0], 0.2, GEM[2] + 1);
      const k0 = max(0, min(BOMBS.length - 3, bn - 2)); for (let i = 0; i < 3; i++) { const b = BOMBS[k0 + i]; S.fx(S.spl[i + 1], PT.R + b[0], b[1], 0, b[2]); }
      S.drip.position.set(PHOME[0], ry + 1, PHOME[2]); S.drip.visible = !pre && t < PT.S + 3; S.drip.material.uniforms.uPx.value = 150 * (1 - seg(t, PT.S + 1.6, PT.S + 3));
      S.ring.position.set(GEM[0], 0.6, GEM[2]); const rt0 = t >= PT.R ? PT.R : PT.S, ra = t >= PT.S ? hit(t, rt0, 1) : 0; S.ring.scale.setScalar(3 + (t - rt0) * 46); S.ring.material.uniforms.uA.value = ra; S.ring.visible = ra > 0;
      S.embers.material.uniforms.uPx.value = 120 * (1 + 0.9 * post);
      /* Vulkanen (Jazz 18.11, runde 6): utbruddet starter IKKE før brølet. Fram til da ryker den bare tyngre. I brølet eksploderer toppen, en ny eksplosjon følger like etter,
         fontenen står opp, askeskyen velter ut over himmelen, og det regner lavabomber over sjøen. */
      const R1 = t >= PT.R; volcAct(S, t, 0.42 + 0.1 * seg(t, PT.G1, PT.D1) + 0.12 * seg(t, PT.O, PT.S) + 0.2 * (S.chg || 0) + (R1 ? 1.3 + 0.5 * hit(t, PT.R, 2.5) : 0), PT.R, PT.R);
      S.erupt = R1 ? 1.7 * eo(seg(t, PT.R, PT.R + 1.4)) : 0.12 * seg(t, PT.O, PT.S); S.smoke = R1 ? 0.8 * seg(t, PT.R + 0.6, PT.R + 3) : 0; S.lit = pre ? 0.7 - 0.2 * seg(t, PT.D0, PT.D1) + 0.15 * seg(t, PT.K, PT.S) : R1 ? 1 : 0.8; S.sun = R1 ? 0.75 * seg(t, PT.R + 0.3, PT.R + 1.3) : 0;
    },
    shots: [
      /* 1 Lyset samler seg om ham, og krystallen vokser fram (lavt, forfra). */
      [0, (S, u, a, t) => { const e = io(u); K.cam(mix(4.4, 3.4, e), 1.7, mix(22, 19, e), -0.4, 5, 2.6, 46, -0.03); S.post.fl = max(1 - seg(t, 0, 0.35), 0.85 * seg(t, PT.G1 - 0.14, PT.G1)); S.post.flc = t < 1 ? '#ffffff' : '#ffd6f2'; S.post.sh = 1.2 * seg(t, 0, 0.6); }],
      /* 2 Krystallen: kameraet glir sakte inn fra siden, med vulkanen bak. Den mørkner, Ω-tegnet tennes, sprekkene brer seg, og den knuses mens vulkanen bryter ut. */
      [PT.G1 - 0.03, (S, u, a, t) => { const e = io(seg(t, PT.G1, PT.S)); K.cam(mix(-6, -4.5, e), mix(2, 2.7, e), mix(23.5, 18.5, e), mix(-2.3, -0.85, e), mix(6.6, 6.2, e), mix(3.8, -1.2, e), 46, 0.03);   /* krystallen og vulkanen ligger begge innenfor x 64–448 (smal skjerm) */
        S.post.fl = max(t < PT.G1 ? 0.85 : 0.85 * hit(t, PT.G1, 0.3), 0.5 * hit(t, PT.O, 0.22), t < PT.S ? ei(seg(t, PT.S - 0.2, PT.S)) * 0.8 : 0.9 * hit(t, PT.S, 0.1)); S.post.flc = t < PT.D0 ? '#ffd6f2' : '#fff2b8';
        S.post.sh = 1.5 * hit(t, PT.O, 0.5) + 2.6 * seg(t, PT.K, PT.S) * (t < PT.S ? 1 : 0) + 6 * hit(t, PT.S, 0.6); S.post.heat = 0.6; }],
      /* 3 Primal Groudon i ett langt nærbilde: fra kneet med Ω-merket og oppover kroppen til ansiktet, mens årene gløder og han reiser seg. */
      [PT.C, (S, u, a, t) => { const e = io(u); K.cam(mix(8.4, 4.4, e), mix(1.3, 4.9, e), mix(10.8, 16.5, e), mix(3.3, 0.2, e), mix(1.9, 8.4, e), mix(2.6, 6.4, e), mix(40, 42, e), -0.05); S.post.sh = 0.8; S.post.heat = 1; S.post.vig = 0.7; }],
      /* 4 Oppladningen og brølet, vidt og nedenfra (runde 9: oppladningen er lengre og går i dette bildet): han synker sammen og skjelver, årene blusser, og så brølet med armene ut,
         mens vulkanen eksploderer bak ham. Navnet kommer opp, lavabomber slår ned i sjøen, og bildet går i hvitt. */
      [PT.Q + 0.05, (S, u, a, t) => { const e = eo(u), w = 0.04 * sin(t * 0.5); K.cam(mix(10.6, 9.8, e) + w * 3, 1.25, mix(19.4, 18, e), 1.9, mix(7.4, 7.9, e), 0.2, 54, -0.05);   /* han til venstre for midten og vulkanen til høyre, begge innenfor x 64–448 */
        S.post.fl = max(0.5 * hit(t, PT.R, 0.16), seg(t, PT.F, PT.E - 0.05)); S.post.flc = '#fff6dc'; S.post.sh = 7 * hit(t, PT.R, 1.2) + 5 * hit(t, PT.R + 0.7, 1) + 2.2 * hit(t, PT.R + 0.3, 2.4) + 0.8 * S.rw + 1.6 * (S.chg || 0) * (S.chg || 0) + BOMBS.reduce((q, b) => q + 2 * hit(t, PT.R + b[0], 0.4), 0);
        const j = S.pg.at('Jaw'), m = K.proj(j.x, j.y, j.z); S.post.spx = m.x / 2; S.post.spy = m.y / 2; S.post.spr = 0.1; S.post.spd = 0.9 * S.rw * hit(t, PT.R, 2.6); S.mouth = m; S.post.heat = 0.8 + 0.6 * S.rw; }],
    ],
  });


  /* Bakteppet, tegnet i 2D med verktøykassa fra steg 2 (de samme tegnerne som arenaen i raid2.js): nattehimmel som gløder nedenfra, askeskyer lyst opp av
     lavaen, sola som en hard skive gjennom røyken (Drought), og vulkanen med elver, utbrudd og askesky. Det tegnes i vinkelmål rundt horisonten (UR enheter per
     radian) og festes til 3D-kameraet (G3D.view), så det følger alle kamerabevegelser. Gir solas plass på skjermen (til lysstrålene). */
  const VOL0 = VOL, UR = 560, wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  const backdrop = (S, t) => {
    const g = C.g, v = G3D.view(), k = v.ppr / UR, er = S.er, lit = S.lit, sun = S.sun, bl = C.blend, VOL = S.V || VOL0;
    g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
    /* S.sky (introen): himmelens farger følger fargemanuset ({ g: [topp, høyt, lavt, horisont, under], cl: skyene, hot: gløden under dem }). Uten: kraterets røde natt. */
    const sk = S.sky || null, gr = g.createLinearGradient(0, -UR * 1.05, 0, 10); gr.addColorStop(0, sk ? sk.g[0] : '#050203'); gr.addColorStop(0.55, sk ? sk.g[1] : bl('#0e0506', '#1d0807', lit)); gr.addColorStop(0.84, sk ? sk.g[2] : bl('#1a0706', '#571607', lit)); gr.addColorStop(1, sk ? sk.g[3] : bl('#3a0e06', '#c8480e', lit * (0.75 + 0.25 * min(1, er))));
    g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 4012); g.fillStyle = sk ? sk.g[4] : bl('#3a0e06', '#b03c0c', lit * 0.8); g.fillRect(-4000, 10, 8000, 4000);
    const dx = VOL.x - v.cx, dz = VOL.z - v.cz, d = Math.hypot(dx, dz), X = wrap(Math.atan2(dx, -dz) - v.yaw) * UR, e0 = Math.atan2(-v.cy, d), yb = -e0 * UR, hh = (Math.atan2(VOL.h - v.cy, d) - e0) * UR, ww = 2 * Math.atan2(VOL.r, d) * UR, sx = X + ww * 0.3, sy = yb - hh * 1.3;
    if (sun > 0.01) { C.blob(sx, sy, 130 + 40 * sun, '#ff8a2a', 0.3 * sun, 1); C.blob(sx, sy, 46, '#ffe9b0', 0.7 * sun, 1); C.blob(sx, sy, 15, '#ffffff', sun, 1); C.blob(sx, sy, 210, '#ffd9a0', 0.3 * sun, 1, 0.035); }
    for (let i = 0; i < 18; i++) { const x = wrap(rnd(i, 3) * TAU + t * (0.004 + rnd(i, 4) * 0.004) - v.yaw) * UR, y = -(36 + rnd(i, 5) * 250), r = 70 + rnd(i, 6) * 90; if (abs(x) > 760) continue; C.blob(x, y, r, sk ? sk.cl : bl('#120a0b', '#241517', lit), 0.86, 0, 0.42); C.blob(x + 8, y + r * 0.26, r * 0.86, '#c8400c', (0.16 + 0.24 * min(1.2, er)) * lit * (sk ? sk.hot : 1), 1, 0.24); }
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


  /* Stedets etterbehandling (begge filmene): glød, varmeflimmer fra horisonten, vignett og en varm fargetone; stråler fra vulkanen når den eksploderer, ellers fra sola. */
  const look = (S, t, P, q, sn) => {
    P.bloom = 0.4 + 0.1 * S.wake + 0.14 * (S.rw || 0); P.bloomT = 0.74; P.heat = 1.3 + 1.3 * S.wake + 2.2 * q.heat; P.heatY = sn.hz; P.heatUp = 100; P.heatDn = 170;
    P.vig = 0.34 + 0.4 * q.vig; P.vigc = '#140402'; P.grain = 0.035; P.grade = { tint: [1.04, 0.985, 0.93], con: 1.07, sat: 1.05, exp: 1.02 };
    if (S.boom > 0.02 && sn.cq > 0.05) P.rays = { x: sn.cx, y: sn.cy, a: 0.55 * S.boom, len: 0.9 }; else if (S.sun > 0.3 && sn.y > -80 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.7 * (S.sun - 0.3), len: 0.85 }; };
  /* Primal-forvandlingen: Ω-tegnet tegnes i figurens oppløsning på krystallen (midt på den, sett fra kameraet), og stråler ut fra det. Ingen virvel ut (swirl: 0). */
  const gemAt = () => { const c = K.proj(GEM[0], GEM[1], GEM[2]), e = K.proj(GEM[0], GEM[1] + GEMR, GEM[2]); return { x: c.x / 2, y: c.y / 2, r: abs(c.y - e.y) / 2, z: c.z }; };
  X.reg('c3:383p', { spid: 383, swirl: 0, skin: 'lava', back: backdrop, look, cues: [[0, 'gather', PT.G1], [PT.G1, 'gem'], [PT.D0, 'dark', PT.D1 - PT.D0], [PT.O, 'sign'], [PT.K, 'crack', PT.S - PT.K], [PT.S, 'shatter'], [PT.Q, 'charge', PT.R - PT.Q], [PT.R, 'cry'], [PT.R + 0.05, 'boom'], [PT.R + 0.7, 'boom']].concat(BOMBS.map(b => [PT.R + b[0], 'thud'])), roar: () => PT.R,
    over(x, t, o) { const S = G3D.S('c3:383p'); let on = false;
      if (S.om > 0 && S.shot === 1) { const q = gemAt(); if (q.z < 1 && (t - PT.O > 0.22 || floor(t * 30) % 2)) { X.omega(x, Math.round(q.x), Math.round(q.y + q.r * 0.04), q.r * 0.6 * (0.94 + 0.06 * S.om), S.om); on = true; } }
      return X.plate(x, t - PT.P, { name: o.name, cap: 'Primal Reversion', sign: X.omega }) || on; },
    fx(S, t, P) { if (S.om > 0 && S.shot === 1) { const q = gemAt(); if (q.z < 1) P.rays = { x: q.x * 2, y: q.y * 2, a: 1.6 * S.om * (0.5 + 0.5 * seg(t, PT.O, PT.S)), len: 0.7 }; P.bloom += 0.2 * S.om; }
      if (t >= PT.S && t < PT.S + 0.5) P.bloom += 0.25 * hit(t, PT.S, 0.5);
      if (t > PT.R + 0.6) C.parts('ash', { n: 80, seed: 8, cols: ['#3a2c2a', '#57423c', '#1c1414'], a: 0.9 * seg(t, PT.R + 0.6, PT.R + 2.2), spd: 1.5, z: [0, 1], wind: 0.55 }); } });


  /* ---------- Arenaen i kampen: samme sted som cutscenene ----------
     Jazz 18.11 (runde 5): kamparenaen fra steg 2 (den flate lavasletta) så «fryktelig unaturlig» ut etter cutscenen og «må ha samme layout som introen med steinene».
     Bakgrunnen i kampen tegnes derfor av det samme krateret (fjellveggene, steinene, krystallene, lavasjøen og vulkanen), sett fra et fast kamera: Groudon står i lavaen
     der han sto i introen, og din Pokémon står på en plattform nær kameraet. Fase 2 (raseriet): vulkanen er urolig; etter Primal er den i utbrudd, det regner lavabomber,
     og stedet er røyklagt. Rammeverket (kameraet, hendelsene, skuespillet i kampen, koblingen på ARENA) er G3C.arena i raid3c.js. Uten 3D: arenaen fra steg 2. */
  /* Kampstillingen til Primal (runde 12, «truende»), lagt oppå modellens egen stilling. Den vanlige formen står som før (Jazz 18.11: «Holdningen på vanlig groudon var bedre før»). */
  const PSTAND = { Spine1: [0, 0.048, 0], Spine2: [0, 0.084, 0], Hips: [0, -0.03, 0], Tail2: [0, 0.06, 0], Tail3: [0, 0.06, 0], '*Arm': [-0.21, 0.09, 0.45], '*Hand': [0.18, 0, 0], Neck1: [0, -0.1, 0], Head: [0, -0.06, 0], Jaw: [0, -0.14, 0] };
  const AFOE = [377, 182], PSC = 0.69, PSY = -0.85;   /* lavakanten på Groudon uten 3D-figuren (16 piksler over føttene); Primal er 1,56 ganger så høy og krympes (PSC), og står så dypt (PSY) */
  X.arena(383, {
    home: HOME, foe: AFOE, me: [190, 370],
    /* Uten 3D-figuren: kameraet lavt (2 over lavaen) og 23 enheter fra Groudon, så Gen 5-bildet får plass under toppen av bildet og himmelen og vulkanen over.
       MED FIGUREN I 3D (runde 6, etter kampbildet fra Omega Ruby): tett på, lavt og vannrett, så han fyller høyre halvdel og føles stor, med himmelen og vulkanen bak. */
    cam: fig => fig ? { fv: 52, cp: [-6.2, 1.65, 19.9], kq: 18.2 / 394, tg: [HOME[0] - 5, 3, HOME[2]] } : { fv: 50, cp: [-8.2, 2.05, 24.7], kq: 23.4 / 412, tg: [HOME[0] - 5, 3, HOME[2]] },
    place(K, T, fig) { const S = crater(T); volcano(S, T, 1, fig ? null : { x: -52, z: -410, r: 205, h: 92 }); return S; },   /* uten figuren står vulkanen litt lenger unna, så hele fjellet og røyken synes */
    dress(S, K, T, fig, m) {
      /* Runde 18 (Jazz 18.11: lavaen «mer levende», uten mer skorpe; enig i «C som grunnlag, med driften fra B i lavere styrke»): i kampen bobler lavaen. 16 store bobler
         (7 av dem foran kameraet, mellom deg og ham; takt 4–9 s) vokser opp, sprekker med en ring i lavaen og 12 små dråper som spretter opp og faller tilbake, og 22 småbobler
         (2,6–6,5 s) uten sprut. Nær kameraet er de mindre og spruter lavere. Ikke der han står (7 enheter), ikke ved steinen din (5) og ikke bak din Pokémon i bildet.
         uLive = 1: lavaen renner litt fortere og skorpen driver med (bare i kampen; cutscenene har lavaen sin som før). Stedene fra crater() (tolv over hele sjøen) byttes ut. */
      if (fig) { const cp = S.cp, tg = S.tg, dx = tg[0] - cp[0], dz = tg[2] - cp[2], dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl, P2 = [], P3 = [], NP = 12, LU = S.lava.material.uniforms; LU.uLive.value = 1;
        const spot = (i, s, d0, d1) => { const dd = d0 + rnd(i, s) * (d1 - d0), la = (rnd(i, s + 1) - 0.5) * 1.1 * dd, x = cp[0] + ux * dd - uz * la, z = cp[2] + uz * dd + ux * la, pq = K.proj(x, 0, z);
          return Math.hypot(x - HOME[0], z - HOME[2]) < 7 || Math.hypot(x - m.x, z - m.z) < 5 || Math.hypot(x, z) > 58 || (pq.x < 250 && pq.y > 235) ? null : [x, z, dd]; };
        for (let i = 0; P2.length < 16 && i < 900; i++) { const nr = P2.length < 7, q = spot(i, 421, nr ? 7 : 15, nr ? 15 : 38); if (q) P2.push([q[0], q[1], 4 + rnd(i, 423) * 5, rnd(i, 424) * 11, q[2] < 16 ? 0.5 : q[2] < 24 ? 0.75 : 1, (0.34 + rnd(i, 425) * 0.3) * Math.min(1, Math.max(0.55, q[2] / 20))]); }
        for (let i = 0; P3.length < 22 && i < 900; i++) { const nr = P3.length < 12, q = spot(i, 431, nr ? 6 : 15, nr ? 15 : 34); if (q) P3.push([q[0], q[1], 2.6 + rnd(i, 433) * 3.9, rnd(i, 434) * 9, (0.13 + rnd(i, 435) * 0.15) * Math.min(1, Math.max(0.6, q[2] / 16)), 0.8]); }
        LU.uPop.value.forEach((v, i) => { const q = P2[i]; if (q) v.set(q[0], q[1], q[2], q[3]); else v.set(0, 0, 0, 0); });
        S.dome = K.domes(P2.map(q => [q[0], q[1], q[2], q[3], q[5], 1.25]).concat(P3)); S.scene.add(S.dome);
        S.scene.remove(S.pop); S.pop = K.pts(P2.length * NP, i => { const q = P2[Math.floor(i / NP)], a = rnd(i, 411) * TAU, h = 0.4 + rnd(i, 412) * 2.4, r0 = 0.1 + rnd(i, 415) * 0.4; return { p: [q[0] + cos(a) * r0, 0.15, q[1] + sin(a) * r0], v: [cos(a) * h, (5.5 + rnd(i, 413) * 7) * q[4], sin(a) * h], b: q[3] - rnd(i, 416) * 0.12, l: q[2], z: (0.34 + rnd(i, 414) * 0.5) * (q[4] < 0.6 ? 0.7 : 1) }; },
          { loop: 1, shade: 1, g: 22, px: 60, floor: 0, near: 5, c: ['#ffc24e', '#ff7616', '#b83208'], fade: 0.97 }); S.scene.add(S.pop); }
      /* Runde 9: din Pokémon står på et flak av gråsvart lavastein, glatt som før, så den skilles fra lavaen (Jazz 18.11: «Dette er for mye og for teksturert ... Mer mot slik
         det var før, bare tydelig at det er stein som man står på som skilles fra lavaen. Gjerne litt mer grå/svart da lavastein ser mer slik ut»). Ingen sprekker med glød, bare
         en svak ruhet; lavaen lyser opp sidene og foten. Med figuren i 3D (der din Pokémon står nede til venstre og føttene er utenfor bildet) er flaket stort og flatt,
         så det synes bak den nederste delen av spriten (størrelsen Jazz likte); ellers steinen fra før. */
      const cm = K.rockMat({ a: '#1c1214', b: '#3c2823', str: 0.2, top: 0.6, sm: 0.12, hot: 0.1, rough: 0.28, ck: 0, sc: 3.2 });   /* runde 16: fasetter som krystallene, svakt fint korn, ingen sprekker */   /* kjølig grå: lyset og fargetonen i arenaen gjør den varmere */
      if (fig) { S.rock = K.boulder(2.5, 77, { flat: 1, sx: 1.2, sy: 0.2, sz: 1, cap: 0.42, j: 0.3, d: 2, mat: cm }); S.rock.position.set(m.x + 0.1, 0.05, m.z - 1.0); S.rock.rotation.y = 0.5; }   /* runde 14: liten plattform rett under din Pokémon (før: stort flatt flak, «alt for dårlig lagt») */
      else { S.rock = K.boulder(2.1, 77, { flat: 1, sy: 0.26, cap: 0.45, j: 0.22, d: 3, mat: cm }); S.rock.position.set(m.x + 0.15, 0.05, m.z - 0.45); } S.scene.add(S.rock);
      for (const [dx, dz, r, sd] of [[3.4, -2.6, 1.1, 81], [-3.2, -3.4, 0.8, 83]]) { const b = K.boulder(r, sd, { flat: 1, sy: 0.14, cap: 0.3, j: 0.24, mat: cm }); b.position.set(m.x + dx, 0.02, m.z + dz); S.scene.add(b); }
      /* Røyken som ligger over sjøen etter utbruddet: store, mørke dotter som driver med vinden, lyst opp nedenfra. */
      S.haze = K.pts(46, i => ({ p: [-70 + rnd(i, 141) * 150, 3 + rnd(i, 142) * 16, -64 + rnd(i, 143) * 74], v: [2.2 + rnd(i, 144) * 2.6, 0.25 + rnd(i, 145) * 0.5, 0.5], b: rnd(i, 146) * 14, l: 14, z: 30 + rnd(i, 147) * 44 }), { loop: 1, shade: 1, px: 60, sz0: 0.8, sz1: 1.5, near: 9, c: ['#6a3a26', '#3a221c', '#1c1211'], a: 0, fade: 0.6 }); S.scene.add(S.haze);
    },
    /* Raseriet gjør stedet varmere og vulkanen urolig; UTBRUDDET og røyken kommer først når forvandlingen er over (pT), så arenaen står slik cutscenen sluttet. */
    state(S, t, o, st) {
      const U = K.U(), L = S.lava.material.uniforms, { p2, eT, fT, rT, pT, pr, pk } = st, heat = 0.5 + 0.4 * p2 + 0.3 * pk;
      L.uHeat.value = 0.62 + 0.24 * p2 + 0.2 * pk + 0.2 * hit(rT, 0.5, 1.5); L.uBri.value = 0.8 + 0.1 * p2; U.uGlow.value = 0.9 + 0.3 * p2; lerpC(U.uKeyC, '#f4e2d4', '#f0d2bc', pk); lerpC(U.uShC, '#3a1c24', '#42181a', p2); U.uRimK.value = 1;
      const ring = (i, x, z, age, v, d, a) => L.uRing.value[i].set(x, z, 1.5 + age * v, age >= 0 && age < d ? a * (1 - age / d) : 0);
      ring(0, HOME[0], HOME[2], eT, 20, 1.6, 0.9); ring(1, S.me[0] + 3.4, S.me[2] - 2.6, fT - 0.38, 14, 1.2, 1); ring(2, HOME[0], HOME[2], rT - 0.5, 26, 1.8, 1); const h = o.hit; ring(3, h ? h[0] : 0, h ? h[1] : 0, h ? h[2] : -1, 12, 0.9, 0.8);
      L.uWade.value.set(HOME[0], HOME[2] + 0.3, 9.5, (S.gr ? 0.45 : 0.95) + 0.2 * p2 + 0.4 * hit(rT, 0.5, 1.5));   /* med figuren som sprite: kulpen svakere, gløden ved beina er i spritens piksler */
      S.embers.material.uniforms.uPx.value = 120 * (1 + 0.5 * p2 + 0.5 * pk);
      for (const q of S.dust.concat(S.deb, S.spl)) q.material.uniforms.uT0.value = -1e5; S.drip.visible = false; S.ring.visible = false;
      /* Vulkanen: ryker og er urolig (mer i raseriet). Etter Primal: fontenen står, toppen har nettopp eksplodert, og det regner lavabomber i bølger. */
      const tb = pr ? t - pT - 2 : -1; volcAct(S, t, 0.36 + 0.26 * p2 + 1.1 * pk + 0.06 * sin(t * 0.7), tb, tb);
      if (pr && pT > 4) S.vrain.material.uniforms.uT0.value = floor((t - 1) / 6.4) * 6.4 + 1;
      /* Røyklagt etter Primal: disen ligger tettere og nærmere, røykdotter driver over sjøen, og himmelen er dekket. */
      U.uFog.value.set(60 - 34 * pk, 300 - 110 * pk, 0.8 + 0.14 * pk); S.haze.material.uniforms.uA.value = 0.7 * pk; S.haze.visible = pk > 0.02;
      S.erupt = 0.25 * p2 + 1.3 * pk; S.smoke = pk; S.lit = 0.72 + 0.12 * p2 + 0.1 * pk; S.sun = 0.38 + 0.12 * p2 - 0.2 * pk; S.wake = heat; S.heat = 0; S.rw = 0; S.pk = pk;
    },
    back: (S, t) => backdrop(S, t),
    scene(S, A, sn, q) {
      const g = C.g, P = q.P, t = S.t, p2 = S.p2, fT = q.fT, bl = C.blend, pk = A.pk || 0, heat = 0.5 + 0.4 * p2 + 0.3 * pk, sun = A.sun;
      /* Røyklagt etter Primal: røyk i lag over sjøen, tettest ved horisonten. */
      if (pk > 0.02) { C.fogBand(sn.hz + 2, { h: 44, col: '#3a1d16', a: 0.6 * pk, seed: 41, spd: 6, n: 7 }); C.fogBand(sn.hz + 52, { h: 60, col: '#24110e', a: 0.42 * pk, seed: 43, spd: 10, n: 5 }); }
      /* Lyset på figurene: som i arenaen fra steg 2 (varmt og mørkt, lavaen lyser nedenfra, kantlys fra sola og vulkanen). */
      C.lightSet({ amb: bl('#b8826c', '#d09a80', 0.5 * sun), sat: 0.84, lift: '#34140e',
        lights: [{ col: '#ff6a1c', a: min(0.85, 0.34 + 0.3 * min(1.3, heat)), h: 0.72 }], rim: [{ col: '#ffb060', dx: 1, dy: 1, a: 0.3 + 0.55 * sun }, { col: '#ff7a24', dx: 0, dy: -1, a: 0.5 + 0.25 * min(1, heat) }],
        glow: { mask: 'seam', col: '#ff9a2c', a: (0.5 * p2 + 0.5 * hit(S.since('rage'), 0.5, 2.5)) * (0.8 + 0.2 * sin(t * 6)) },
        /* Din Pokémon (runde 9: «La lavaen gi den kantlys i stedet for å farge hele spriten oransje»): nøytralt grunnlys, bare litt varme nederst, og kantlys fra lavaen nedenfra og fra siden. */
        me: { amb: '#d4c6bc', sat: 0.97, lights: [{ col: '#ff6a1c', a: 0.16 + 0.08 * min(1.3, heat), h: 0.18 }], rim: [{ col: '#ffb060', dx: -1, dy: 1, a: 0.35 + 0.4 * sun }, { col: '#ff7a24', dx: 0, dy: -1, a: 0.9 }, { col: '#ff8c30', dx: -1, dy: -0.3, a: 0.55 }] } });
      /* Din Pokémon på flaket: skyggen kastet framover og kontaktskyggen under føttene. */
      if (C.cur.sps.me) C.monShadow(S.me[0], S.me[1] - 3, 1.6 * S.mk, { id: 'me', a: 0.45, len: 0.1, skew: -0.4, ft: S.ftm, col: '#0b0304' }); C.contact(S.me[0], S.me[1] - 4, 60 * S.mk, { a: 0.85, col: '#0b0304', sy: 0.22 });
      /* Stedet slår til: en søyle av lava spruter opp av sjøen ved flaket ditt. */
      if (fT < 1.4 && A) { const q = K.proj(A.me[0] + 3.4, 0, A.me[2] - 2.6), k = hit(fT, 0.38, 0.9); if (k > 0) { for (let j = 0; j < 9; j++) { const u = j / 8, fl = 0.7 + 0.3 * sin(t * (19 + j * 3) + j); C.blob(q.x + sin(t * 9 + j * 2) * 3 * j, q.y - u * 230 * (1 - (1 - k) * (1 - k)), (32 - u * 17) * (0.5 + 0.5 * k) * fl, u < 0.35 ? '#fff2c8' : u < 0.7 ? '#ffc050' : '#ff7a20', k * (0.9 - u * 0.4), 1, 1.5); } C.blob(q.x, q.y, 110 * k, '#ff7a2a', k, 1, 0.5); } }
      P.heat = 1.3 + 1.5 * min(1.3, heat) + 1.6 * sun; P.heatY = sn.hz; P.heatUp = 90 + 120 * sun; P.heatDn = 110 + 160 * sun;
      P.bloom = 0.3 + 0.1 * sun; P.bloomT = 0.78; P.grain = 0.035;   /* runde 9: mindre glød, så lavaen ikke blir tåke */ P.vig = 0.5 - 0.15 * sun + 0.12 * pk; P.vigc = '#0a0102'; P.grade = { tint: [1.04, 0.985 - 0.02 * pk, 0.93 - 0.04 * pk], con: 1.07, sat: 1.05 - 0.08 * pk, exp: 1.02 - 0.05 * pk };
      if (A && A.boom > 0.02 && sn.cq > 0.05) P.rays = { x: sn.cx, y: sn.cy, a: 0.5 * A.boom, len: 0.9 }; else if (sun > 0.3 && sn.y > -80 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.6 * (sun - 0.3), len: 0.85 };
    },
    /* Mellom figurene (uten 3D-figuren): lavaen han står i legges over føttene (bildet bak figurene, under en bølget kant), med glød og småsprut i kanten, og varmedisen fra før. */
    mid(S, mid0) { const t = S.t, x0 = S.foe[0] - 120, x1 = S.foe[0] + 120, y = AFOE[1] + 1, line = [];
      for (let x = x0; x <= x1; x += 6) line.push([x, y + 1.6 * sin(x * 0.11 + t * 2.3) + 1.1 * sin(x * 0.27 - t * 3.1)]);
      if (S.back) C.seaOver(S.back, line, S.foe[1] + 40);
      const w = 62 * S.fk; C.blob(S.foe[0], y + 3, w * 1.5, '#ff6a1c', 0.4, 1, 0.14);
      for (let i = 0; i < 16; i++) { const u = (i + 0.5) / 16 - 0.5, fl = 0.5 + 0.5 * sin(t * (7 + rnd(i, 5) * 9) + i * 2.1), r = (4 + rnd(i, 6) * 7) * (0.6 + 0.4 * fl); C.blob(S.foe[0] + u * w * 2.3 + sin(t * 3 + i) * 2, y + 1 - r * 0.3 * fl, r, i % 3 ? '#ffb040' : '#fff2c8', 0.45 + 0.4 * fl, 1, 0.55); }
      mid0(S); },
    fig: { models: ['groudon', 'groudon_primal'], at: [362, 228], me: [132, 452],   /* lavakanten hans og føttene til din egen med 3D-figuren (oppstillingen fra Black/White) */
      make(S, K, T) { const g = S.gr = K.figure(K.model('groudon'), { mip: 1 }), p = S.pg = primalFig({ mip: 1 }); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.forms = [g, p];
        g.set('uGl', 0.5); p.set('uGl', 0.8); g.set('uWk', 0); p.set('uWk', 0); p.root.scale.setScalar(PSC); },   /* runde 9: ikke det glatte varmebåndet over beina; lavaen ved beina tegnes i spritens piksler (FS_SPR) */
      /* Den vanlige formen står som modellen står (STAT 0,2: «Holdningen på vanlig groudon var bedre før»); Primal har kampstillingen PSTAND. */
      form: (S, pr) => pr ? { f: S.pg, y: PSY, stand: [PSTAND, 1], duck: PDUCK, roar: PROAR, rk: 0.4 } : { f: S.gr, y: HOME[1], stand: [STAT, 0.2], duck: DUCK, roar: ROAR, rk: 0.5 },
      idle(f, t) { const br = 0.028 * sin(t * 2.4); f.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0], Neck1: [0, 0.03 * sin(t * 0.9 + 1), 0.06 * sin(t * 0.55)], Head: [0, 0.02 * sin(t * 1.3), 0.03 * sin(t * 0.55 + 0.6)], Jaw: [0, -0.06 - 0.04 * sin(t * 2.4), 0], '*Arm': [0.03 * sin(t * 2.4 + 0.5), 0, 0] }, 1);
        for (let i = 1; i <= 5; i++) f.rot('Tail' + i, 0, 0, 0.055 * sin(t * 1.9 + i * 0.55)); },
      glow(S, f, t, st, pr) { if (pr) veins(f, 0.95 + 0.2 * sin(t * 4.2), 0); else f.set('uCrack', 0); },
      ink2: S => S.pg.root.visible ? 0.55 : 0.9,
      after(S, K, T, m) {
        /* Runde 9: ingen glør rett ved føttene hans (en myk lysklump i høy oppløsning ved spritekanten): de som starter nærmere enn 8 enheter, flyttes ut (runde 10: 5 var for lite, de driver inn til ham). */
        const ea = S.embers.geometry.attributes.position; for (let i = 0; i < ea.count; i++) { const x = ea.getX(i) - HOME[0], z = ea.getZ(i) - HOME[2], d = Math.hypot(x, z); if (d < 8) { const k = 8 / Math.max(d, 0.1); ea.setX(i, HOME[0] + x * k); ea.setZ(i, HOME[2] + z * k); } } ea.needsUpdate = true;   /* trekvart forfra, dreid mot din Pokémon nede til venstre (som motstanderne i Black/White) */   /* på skrå som i Omega Ruby: dreid mot venstre i bildet, så vi ser ham trekvart forfra */
      } },
  });
  /* ===================== SKISSE 4 (Opus 21.11) – den nye Groudon-introen på introlåta (Epikus), 0:00–1:48: utgangspunktet for Fable =====================
     Bare i en midlertidig kopi av appen (lag.sh). Skisse 3 (20.11) med hele filmen forbedret, og det Jazz har låst (rekkefølgen, tidene, hva som skjer) står.
     Jazz 21.11: «Er det ikke bedre at Fable får denne versjonen heller enn den jeg hadde tidligere?», så «Ja lagre, men og at lyset kan også kommer mer og opp op hodet også».
     Det som er nytt mot skisse 3 (README.md i denne mappa, og kommentarene merket «Skisse 4» under):
     · Lavaen rant OPPOVER vulkanen i skisse 3 (FS_VOLC i raid3d.js og overløpet i motor.diff: sin(v · k − tid) flytter seg mot toppen). Her renner den nedover.
     · Vulkanen i 192 × 72 med raviner, en indre kratervegg ned til en sjø som lever (FS_POOL), elver med skorpe og varme bølger (FS_VOLC_T), lava i landskapet som
       renner bort fra vulkanen (FS_LLAVA), en tyngre lavafontene, fjellfoten mørkere med store former, kraterbunnen uten flisemønster, bekken mørk under broa.
     · Flommen: dronebildet langs lavaen (0:49,52), nærbildet av fronten (0:53,77), det vide bildet fra 0:55,16. Lavaveggen ruller med skorpeflak. Lavafallet tar slutt.
     · Lyset etter regelen 21.11 (RAIDS3D.md): sprekker i 3D (uK3 i motoren), mørkt rom, støv, stråler, jevn klatring, opp på hodet men ikke rundt øynene (uK3e).
     · Øynene 1:22,72 (lenger før droppet), knuset uten lilla flekk over hele bildet. */
  {
    /* Slagene i introlåta (målt 19.11). Taktstrekene før klimakset: 12,86 + 2,82k. Klimakset 84,47 er et slag FØR taktstreken 84,82; etterpå 87,64 · 90,46 … */
    const Q = { B0: 1.0, TK: 12.86, FACE: 21.32, UB: 21.56, R2: 25.8, S3: 26.96, OV: 35.42, LY: 39.64, SIL: 46.7, S5: 49.52, FALL: 50.94, WALL: 55.16, BRO: 57.98, S6: 60.80,
      HIT: 63.62, QUIET: 72.08, LIFT: 77.72, EYE: 81.89, STILL: 84.12, CH: 1e5, GRL: 1e5, CLX: 84.47, ROAR: 84.57, NAME: 85.9, END: 108 };
    /* Lyset i steinen: et trinn på slagene i det stille partiet og løftet (målt), litt mindre trinn mot slutten, og et blaff når øyet åpner seg. */
    /* Skisse 3: lyset får rundt 20 s (Jazz 19.11: «lyse mer før øynene åpner. Mer den oppladningseffekten»): fra hælene på 63,62, trinn på slagene i C, en holdt pust i det
       stille partiet (72,1–77,7: det pulserer), fort fra løftet, og et blaff når øynene åpner seg (83,26). Kameraet viser ryggen, så det gule synes. */
    const LS = [[63.65, 0.16], [64.55, 0.2], [66.49, 0.27], [68.58, 0.32], [70.0, 0.36], [72.11, 0.4], [74.40, 0.44], [76.61, 0.48], [77.79, 0.56], [79.74, 0.65], [81.89, 0.75], [83.26, 0.95]];
    const LR = [[63.65, 1.4], [64.55, 1.9], [66.49, 2.6], [68.58, 3.2], [70.0, 3.8], [72.11, 4.4], [74.40, 4.9], [76.61, 5.4], [77.79, 6.4], [79.74, 7.6], [81.89, 9.0], [83.26, 14]];
    /* Fontenene i krateret på vulkanen: de sterke slagene i det fulle partiet (målt). */
    const FB = [35.42, 36.2, 39.64, 40.75, 42.47, 45.29, 48.11, 50.94, 53.77, 56.59, 59.41, 62.24];
    const smooth = (a, b, x) => { const k = c01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
    const hh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const vn2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hh(xi, yi), b = hh(xi + 1, yi), c = hh(xi, yi + 1), d = hh(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    const fbm2 = (x, y) => { let s = 0, a = 0.5; for (let i = 0; i < 5; i++) { s += a * vn2(x, y); x = x * 2.03 + 17.3; y = y * 2.03 + 9.1; a *= 0.5; } return s; };
    const last = (L, t) => { let r = -1e5; for (const x of L) if (t >= x) r = x; return r; };
    /* Kameraets bane: Catmull-Rom gjennom [tid, [x, y, z]]. */
    const crs = (L, t) => { let i = 0; while (i < L.length - 2 && t > L[i + 1][0]) i++; const p0 = L[max(0, i - 1)][1], p1 = L[i][1], p2 = L[i + 1][1], p3 = L[min(L.length - 1, i + 2)][1], u = c01((t - L[i][0]) / (L[i + 1][0] - L[i][0])), u2 = u * u, u3 = u2 * u;
      return [0, 1, 2].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3)); };

    /* Bekkeleiet (skisse 2): fra senkingen i veggen mot vulkanen, langs ham på høyre side, og i en bue FORAN ham mot kameraet. Broa står over bekken foran føttene hans,
       så buen rammer ham inn sett fra bekken (klippet under broa), og lunta passerer foran ham før den tar broa. */
    const CH = [[0, -84], [-2.5, -58], [-7.5, -34], [-10.8, -14], [-10.4, -2], [-7.6, 7.0], [-3.6, 12.6], [-2.4, 18.6], [-2.9, 27], [-6, 42], [-12, 60]];
    const chAt = (x, z) => { let best = 1e9, bs = 0, acc = 0; for (let i = 0; i < CH.length - 1; i++) { const [ax, az] = CH[i], [bx, bz] = CH[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, L = Math.sqrt(L2), k = c01(((x - ax) * dx + (z - az) * dz) / L2), d = Math.hypot(x - ax - dx * k, z - az - dz * k); if (d < best) { best = d; bs = acc + k * L; } acc += L; } return [best, bs]; };
    const chPt = s => { let acc = 0; for (let i = 0; i < CH.length - 1; i++) { const [ax, az] = CH[i], [bx, bz] = CH[i + 1], L = Math.hypot(bx - ax, bz - az); if (s <= acc + L) { const k = (s - acc) / L; return [mix(ax, bx, k), mix(az, bz, k)]; } acc += L; } return CH[CH.length - 1]; };
    /* Vulkanens skjørt når langt inn i krateret der Groudon står (ved x 0 helt til z ≈ −30). Høyden regnes på maskens egne punkter (K.volcano: 96 rundt, 30 opp). */
    /* Skisse 4: fjellet i 192 × 72 (skissen: 96 × 30, der foldene ble store, jevne fasetter tett på) med raviner som slynger seg (støy rundt fjellet), ikke 31 og 57 like folder. */
    const VN = 192, VM = 72, VRR = Array.from({ length: VM + 1 }, (_, j) => { const v = j / VM; return Array.from({ length: VN + 1 }, (_, i) => { const a = (i % VN) / VN * TAU, lobes = 1 + 0.16 * sin(a * 3 + 5) + 0.1 * sin(a * 7 + 5 * 2.3) + 0.06 * sin(a * 13 + 1.7), ca = Math.cos(a), sa = Math.sin(a),
      rav = (fbm2(ca * 2.4 + 7.3, sa * 2.4 + v * 1.4 + 2.1) - 0.5) * 0.12 * (1 - v) + (fbm2(ca * 7 + 3.1, sa * 7 + v * 4 + 9.7) - 0.5) * 0.07 * (1 - v * 0.7); return (VOL.r * Math.pow(1 - v, 1.65) * lobes + VOL.r * 0.07) * (1 + rav); }); });
    const skirtH = (x, z) => { const dx = x - VOL.x, dz = z - VOL.z, d = Math.hypot(dx, dz); let a = Math.atan2(dz, dx); if (a < 0) a += TAU; const fi = a / TAU * VN, i0 = Math.floor(fi), f = fi - i0, R = j => VRR[j][i0] * (1 - f) + VRR[j][i0 + 1] * f;
      if (d > R(0)) return -99; for (let j = 0; j < VM; j++) { const r0 = R(j), r1 = R(j + 1); if (d <= r0 && d > r1) return (j + (r0 - d) / (r0 - r1)) / VM * VOL.h - 2; } return VOL.h - 2; };
    const ZE = {}; for (let x = -90; x <= 90; x += 2) { let z = 10; while (z > -95 && skirtH(x, z) < 0.25) z -= 0.5; ZE[x] = z; }
    const zEdge = x => { const k = Math.max(-90, Math.min(88, Math.floor(x / 2) * 2)), f = (x - k) / 2; return ZE[k] * (1 - f) + ZE[k + 2] * f; };
    /* Et punkt på vulkanens overflate: au = rundt fjellet (uv, 0–1), v = høyden (0–1). Brukes til steinene i elvene og elvenes fronter. */
    const volPt = (au, v, out) => { au = ((au % 1) + 1) % 1; v = c01(v); const fi = au * VN, i0 = Math.floor(fi), f = fi - i0, fj = v * VM, j0 = Math.min(VM - 1, Math.floor(fj)), g = fj - j0, R = j => VRR[j][i0] * (1 - f) + VRR[j][i0 + 1] * f, r = mix(R(j0), R(j0 + 1), g) + (out || 0), a = au * TAU;
      return [VOL.x + cos(a) * r, v * VOL.h - 2, VOL.z + sin(a) * r]; };
    const BR = { x: -2.48, z: 20.0, ry: -0.06 }, SB = chAt(BR.x, BR.z)[1];
    /* Elvene på vulkanen (skissens motor: uRiv = forskyvning rundt fjellet, fart, forsinkelse, halv bredde). De tre midt mot krateret hans er langsomme og når bunnen rundt
       WALL (det er dem veggen kommer av); de på sidene raser ned. Fronten: v = 1 − pr · 1,02, pr = flow · fart − forsinkelse, flow = (t − OV) / 13,5. */
    const FA0 = 0.2308, RIV = Array.from({ length: 11 }, (_, i) => { const mid = Math.abs(i - 5) <= 1; return [(i - 5) * 0.021 + (rnd(i, 901) - 0.5) * 0.01, mid ? 0.5 + rnd(i, 902) * 0.04 : 0.92 + rnd(i, 902) * 0.38, mid ? 0 : rnd(i, 903) * 0.1, 1.7 + rnd(i, 904) * 1.6]; });
    const flowAt = t => max(0, (t - Q.OV) / 11.5), rivPr = (i, t) => c01(flowAt(t) * RIV[i][1] - RIV[i][2]), rivAu = (i, v) => FA0 + RIV[i][0] + 0.012 * sin(v * 7 + i * 2.1) + 0.005 * sin(v * 19 + i);
    const rivReach = (i, v) => Q.OV + 11.5 * ((1 - v) / 1.02 + RIV[i][2]) / RIV[i][1];
    const rivFront = (i, t) => { const v = Math.max(0.005, 1 - rivPr(i, t) * 1.02); return volPt(rivAu(i, v), v, 0.6); };
    /* Steinene i elvene der lavaen spruter som bølger mot stein (Jazz 19.11): [elv, høyde]. */
    const RK = [[1, 0.52], [3, 0.36], [5, 0.66], [7, 0.44], [9, 0.6], [2, 0.24]];

    /* Flommen: lunta raser ned bekkeleiet og tar broa på BRO; lavafallet over den høye veggen til venstre fyller et basseng som brer seg fra foten; veggen av lava kommer
       ut under vulkanens skjørt på WALL og når hælene hans på HIT (raskere og senere enn i skisse 1: rundt 2,8 enheter i sekundet mot 1,6). */
    const TCH0 = Q.S5 + 1.5, VCH = SB / (Q.BRO - 0.6 - TCH0);
    const FCOL = 34, FAZ = FCOL / 64 * TAU, FOOT = { x: cos(FAZ) * 73, z: sin(FAZ) * 73 }, TF1 = Q.FALL + 1.05, VF = 2.4;
    const TSH0 = Q.WALL, VSH = (1.4 - zEdge(2.87)) / (Q.HIT - TSH0);
    const lob = (x, z) => 2.4 * (fbm2(x * 0.07 + 3, z * 0.02) - 0.5) * (1 - Math.exp(-x * x / 60));
    let SHEET = 0; const arrive = (x, z) => { const [d, s] = chAt(x, z), tc = TCH0 + s / VCH; let T = d < 2.4 ? tc + d * 0.15 : tc + 1.5 + (d - 2.4) * 3.5; SHEET = 0;
      const tf = TF1 + Math.hypot(x - FOOT.x, z - FOOT.z) / VF + 1.4 * (fbm2(x * 0.1, z * 0.1) - 0.5); if (tf < T) T = tf;
      let ts = TSH0 + max(0, z - zEdge(x)) / VSH + lob(x, z); if (ts > Q.HIT + 0.3) ts = Q.HIT + 0.3 + (ts - Q.HIT - 0.3) * 0.12; if (ts < T) { T = ts; SHEET = 1; } if (Math.hypot(x, z) > 74) T = min(T, TSH0 + 4); return T; };
    /* Fronten på veggen: z ved x i tiden t. */
    const wallZ = (x, t) => { const z0 = zEdge(x) + (t - TSH0) * VSH; return zEdge(x) + (t - TSH0 - lob(x, z0)) * VSH; };

    const VS_FLOOR = `attribute float aT, aB; varying vec3 vW; varying float vAge; uniform float uTime;
void main(){ float age = uTime - aT; vAge = age; vec3 p = position; p.y += aB * exp(-(age + .15) * (age + .15) / .09) - 2.4 * smoothstep(0., 1.2, age); vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
    const FS_FLOOR = `varying vec3 vW; varying float vAge; uniform float uCk;
${K.GLSL.COMMON}
void main(){ vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
  /* Skisse 4: kraterbunnen i store former (aske, basalt) og sprekker som ikke er et nett av fliser: sterkt vridd, ulik bredde, og bare noen av kantene er sprekker. */
  float n = fbm(vW.xz * .07), m = fbm(vW.xz * .45 + 3.), ash = smoothstep(.55, .82, fbm(vW.xz * .033 + 9.));
  vec3 base = mix(vec3(.1, .085, .09), vec3(.25, .21, .21), smoothstep(.3, .75, n)) * (.8 + .35 * m); base = mix(base, vec3(.4, .37, .38), ash * .6);
  vec3 col = base * mix(uShC, uKeyC, smoothstep(.15, .95, dot(N, uKey) * .5 + .5));
  vec2 wq = vW.xz * .21 + (vec2(fbm(vW.xz * .05), fbm(vW.xz * .05 + 7.)) - .5) * 4.2;
  vec3 v = voro(wq); float ce = v.y - v.x, fw = length(fwidth(wq)), wv = .015 + .04 * smoothstep(.4, .9, fbm(vW.xz * .1 + 4.));
  float crk = (1. - smoothstep(wv * .4, wv + max(.03, fw * 1.6), ce)) * (1. - smoothstep(.15, .4, fw)) * smoothstep(.3, .62, fbm(vW.xz * .085 + v.z * 3.));
  float pre = smoothstep(-1.1, 0., vAge), hotc = clamp(uCk * (.55 + .45 * sin(uTime * 1.3 + v.z * 20.)) + pre, 0., 1.);
  col = mix(col, vec3(1., .42, .08) * (.55 + .6 * hotc), crk * hotc);
  col += vec3(1., .36, .06) * pre * pre * .6;
  col += uLavaC * (1. - smoothstep(0., .5, vW.y - uLavaY)) * uGlow * .5 * smoothstep(-1.5, 0., vAge);
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.); }`;
    /* Veggen av lava: en stripe langs fronten med et tverrsnitt som en rullende bølge. vQ.x = 0 bak (lavt) … 1 ved foten foran, vQ.y = langs fronten. Skorpe som brekker opp
       oppå og bak, glødende forside, glør og røyk over (egne partikler). */
    const VS_WALL = `attribute vec2 aQ; varying vec3 vW; varying vec2 vQ; void main(){ vQ = aQ; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
    const RAMP = `vec3 ramp(float x){ vec3 c = vec3(.028, .006, .002); c = mix(c, vec3(.4, .028, .0), smoothstep(0., .3, x)); c = mix(c, vec3(.98, .24, .02), smoothstep(.24, .6, x)); c = mix(c, vec3(1., .66, .14), smoothstep(.56, .92, x)); return mix(c, vec3(1., .95, .72), smoothstep(.9, 1.35, x)); }`;
    const FS_WALL = `varying vec3 vW; varying vec2 vQ; uniform float uHot;
${K.GLSL.COMMON}
${RAMP}
void main(){ float s = vQ.x, face = smoothstep(.55, .72, s), crest = smoothstep(.36, .52, s) * (1. - smoothstep(.62, .78, s));
  /* Forsiden: glødende lava som velter nedover, med mørke skorpeflak som rives med og brekker opp, og lysest nederst der den slår i bakken. */
  vec2 pf = vec2(vW.x * .55, vW.y * .8 + uTime * 2.6); float fl = fbm(pf), fl2 = fbm(pf * 2.3 + 7.);
  vec2 pr = vec2(vW.x * .66, vW.y * .85 + uTime * 2.4); pr += (vec2(vn(pr * .5), vn(pr * .5 + 5.)) - .5) * 1.1; vec3 vf = voro(pr);
  float raft = smoothstep(.4, .66, vf.z + .3 * (fl - .5)) * smoothstep(.02, .12, vf.y - vf.x);
  float tf = .6 + .34 * (fl - .5) + .2 * (fl2 - .5); tf = mix(tf, .09 + .12 * vf.z, raft * .92) + .3 * (1. - smoothstep(0., 1.1, vW.y)) * (1. - raft);
  /* Toppen og baksiden: skorpeflak som brekker opp og ruller over kanten, med glød i sprekkene. */
  vec2 pq = vec2(vW.x * .34, vW.z * .34 - uTime * 1.5 * (.3 + s)); pq += (vec2(vn(pq * .4), vn(pq * .4 + 7.)) - .5) * 1.3;
  vec3 v = voro(pq); float ce = v.y - v.x, gap = 1. - smoothstep(.04, .16, ce), plate = smoothstep(.2, .55, v.z + .3 * (fl - .5));
  float tc = mix(.5 + .2 * fl2, .08 + .1 * v.z, plate * (1. - gap)); tc = max(tc, gap * (.7 + .25 * crest));
  float temp = (mix(tc, tf, face) + .1 * crest) * uHot;
  gl_FragColor = vec4(mix(ramp(temp), uFogC, fogK(vW) * .55), 1.); }`;
    /* Tunga foran i hver lavaelv på fjellet (nærbildet der lavaen renner nedover): en rullende klump med skorpe oppå, så fronten har form og ikke bare er en stripe. */
    const FS_LOBE = `varying vec3 vW, vN;
${K.GLSL.COMMON}
${RAMP}
void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = 1. - max(dot(N, V), 0.), n = fbm(vW.xz * .9 + vec2(uTime * 1.1, uTime * 2.2)), n2 = fbm(vW.xy * 1.7 - uTime * 1.3);
  float crust = smoothstep(.45, .7, n + .4 * N.y - .12), temp = mix(.92 + .2 * (n2 - .5), .12 + .5 * (1. - smoothstep(.3, .6, n)), crust) - .22 * f * f;
  gl_FragColor = vec4(mix(ramp(temp), uFogC, fogK(vW) * .5), 1.); }`;
    /* Lavafallet: en stripe som følger veggen nedover terrassene. vQ.x = på tvers (0–1), vQ.y = nedover (0 ved kanten). uFall = hvor langt ned fronten er (0–1). */
    const FS_FALL = `varying vec3 vW; varying vec2 vQ; uniform float uFall;
${K.GLSL.COMMON}
${RAMP}
uniform float uEnd;
void main(){ float x = vQ.x, y = vQ.y, e = abs(x - .5) * 2.;
  float rag = .78 + .18 * fbm(vec2(y * 9. - uTime * 3., x * 3.)); if (e > rag || y > uFall + .02 * fbm(vec2(x * 9., uTime)) || y < uEnd - .02 * fbm(vec2(x * 7., uTime))) discard;
  float st = fbm(vec2(x * 14., y * 5. - uTime * 6.)), st2 = fbm(vec2(x * 31. + 4., y * 9. - uTime * 9.));
  float temp = .62 + .45 * st + .2 * st2 - .35 * smoothstep(.55, 1., e) + .25 * (1. - smoothstep(0., .06, uFall - y));
  gl_FragColor = vec4(mix(ramp(temp), uFogC, fogK(vW) * .5), 1.); }`;

    /* ======== Skisse 4 (Opus 21.11): vulkanen og lavaen ========
       Feilen over vulkanen: lavaen rant OPPOVER fjellet. Mønsteret i elvene var sin(v · k − tid) (v = høyden, 0 nede og 1 oppe), og et mønster med fast fase der
       v · k − tid er konstant, flytter seg mot større v når tiden går: opp mot krateret. Det gjaldt både vulkanens egne elver (raid3d.js, FS_VOLC: flow) og overløpet i
       skissen (fl2 og fbm). Lavaen i landskapet rant også mot vulkanen (lavaflatens drift går mot +Z, og flyturen ser mot +Z). Her regnes alt i enheter nedover
       fra krateret (d), og mønsteret flytter seg med d − tid · fart: nedover.
       Mer levende: skorpeflak som glir nedover og brekker opp (glødende sprekker mellom), varme bølger som går ned elvene, lys kjerne og mørkere kanter, gul og fersk nær
       krateret og mer skorpe lenger ned, og en sjø i krateret som velter opp i midten, driver utover og bobler. flowT gir temperaturen (ramp) i en lavaelv. */
    const FLOWT = `
float flowT(float x, float d, float an, float rr, float sp, float ph, float hot, float px){
  float s = d - uTime * sp, lp = 1. - smoothstep(.3, .9, px);
  vec2 cq = vec2(an * rr * .2, s * .09); cq += (vec2(vn(cq * .31 + 3.), vn(cq * .31 + 9.)) - .5) * 1.5;
  vec3 cv = voro(cq); float ce = cv.y - cv.x;
  float surge = pow(.5 + .5 * sin(s * .13 + ph), 3.), surge2 = pow(.5 + .5 * sin(s * .047 + ph * 1.7 + 1.), 5.);
  float crustK = smoothstep(.4, .95, 1.12 - hot + .3 * (cv.z - .5) + .55 * x * x) * lp + (1. - lp) * .35 * (1. - hot);
  float crack = (1. - smoothstep(.015, .07 + px * 1.5, ce)) * lp;
  float rip = fbm(vec2(an * rr * .8, s * .4));
  float core = 1. - smoothstep(.1, .95, x);
  float temp = .32 + .3 * hot + .2 * core + .24 * surge * (.35 + .65 * hot) + .2 * surge2 + .16 * (rip - .5);
  float ct = .07 + .07 * cv.z + (.45 + .4 * hot) * crack;
  return mix(temp, ct, crustK * (1. - .6 * max(surge * .7, surge2)));
}`;
    const FS_VOLC_T = `varying vec3 vW, vN; varying vec2 vUv; uniform vec3 uA, uB; uniform float uEr, uFlow, uFlowA, uLvB; uniform vec4 uRiv[11];
${K.GLSL.COMMON}
float fbm3(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn3(p); p = p * 2.03 + vec3(17.3, 9.1, 4.7); a *= .5; } return s; }
${RAMP}
${FLOWT}
void main(){
  float a = vUv.x * 6.2832, vr = vUv.y, v = min(vr, 1.), ik = clamp((vr - 1.) / .1, 0., 1.); vec2 c = vec2(cos(a), sin(a));
  vec3 Nf = normalize(cross(dFdx(vW), dFdy(vW))), Ns = normalize(vN); if (dot(Ns, Nf) < 0.) Ns = -Ns; vec3 N = normalize(mix(Nf, Ns, .7));
  float g1 = fbm(c * 9. + vec2(v * 1.3, 0.)), g2 = fbm(c * 24. + v * 2.), streak = fbm(vec2(c.x * 16. + g1 * 2. + v * 3., c.y * 16. + v * 5.5));
  float fa = length(vec2(dFdx(vUv.x), dFdy(vUv.x))) * 6.2832, lf = 1. - smoothstep(.2, .45, fa * 60.);
  vec3 q = vec3(c * 13., v * 7.);
  float rg = smoothstep(.5, .95, 1. - abs(fbm3(q) * 2. - 1.)), rg2 = fbm3(q * vec3(2.6, 2.6, 2.2) + 7.);
  float h = rg * .55 + (rg2 - .5) * .32 * lf;
  vec3 dpx = dFdx(vW), dpy = dFdy(vW), r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
  vec3 Nb = normalize(abs(det) * N - sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * 3.5); if (dot(Nb, N) < .35) Nb = N;
  float k1 = abs(fbm3(vec3(c * 14., v * 6.) + 3.) - .5);
  float crack = (1. - smoothstep(.006, .03, k1)) * (1. - smoothstep(.3, .6, fa * 24.));
  float sk = abs(fbm3(vec3(c * 15., v * 4.2) + 5.) - .5);
  float lstr = (1. - smoothstep(.008, .04, sk)) * smoothstep(.3, .5, fbm3(vec3(c * 5., v * .8) + 2.)) * smoothstep(.05, .5, v) * (1. - smoothstep(.3, .6, fa * 34.));
  float pa = fbm3(vec3(c * 6., v * 2.) + 4.);
  vec3 base = mix(uA, uB, smoothstep(.35, .7, streak * .6 + g2 * .4)) * (.7 + .6 * g1); base = mix(base, uB * 1.3, smoothstep(.5, .95, v) * .45);
  float lb = smoothstep(.2, .9, dot(Nb, uKey) * .5 + .5), l0 = smoothstep(.2, .9, dot(N, uKey) * .5 + .5);
  float tx = (.8 + .45 * h) * (1. - .35 * crack) * (.82 + .36 * smoothstep(.3, .7, pa)) * (1. + 1.1 * (lb - l0));
  float kf = mix(.3, 1., smoothstep(.04, .5, v));
  vec3 col = base * mix(uShC, uKeyC, l0 * kf);
  col += uRimC * pow(1. - max(dot(N, normalize(cameraPosition - vW)), 0.), 2.5) * (dot(N, uRim) * .5 + .5) * .35;
  float fg = fogK(vW); col = mix(col, uFogC, fg);
  col *= mix(1., tx, .5 - .1 * fg);
  float dt = (rg - .5) * 1.1 + (rg2 - .5) * 1.1 * lf + 1.6 * (lb - l0) * kf;
  col += vec3(.2, .09, .065) * clamp(dt, -.6, 1.) * (.22 - .07 * fg);
  /* Fjellfoten går inn i krateret der han står (skjørtet når z ≈ −30) og var en glatt, lys flate tett på. Nå: gamle lavatunger i store former og mørkere basalt nederst. */
  float foot = 1. - smoothstep(.04, .42, v);
  if (foot > 0.) { vec2 wq = vW.xz * .042; float lbb = fbm(wq + (vec2(fbm(wq * .4 + 2.), fbm(wq * .4 + 6.)) - .5) * 2.4), rdg = 1. - abs(lbb * 2. - 1.);
    vec3 bv = voro(vW.xz * .14 + lbb * 2.5); float blk = smoothstep(.0, .14, bv.y - bv.x), lit = smoothstep(.2, .85, rdg);
    col *= mix(1., mix(.32, .95, lit) * mix(.72, 1., blk) * (.85 + .3 * bv.z), foot * (1. - fg * .6)); }
  float er = min(uEr, 1.6);
  col += vec3(.62, .14, .03) * lstr * (.26 + .3 * min(uEr, 1.)) * (1. - .4 * fg) * (.6 + .5 * pa) + vec3(.55, .12, .03) * crack * .08 * (1. - .5 * fg);
  col = mix(col, uFogC, .12);
  /* Innerveggen i krateret: mørk stein lyst opp nedenfra av sjøen, med en glødende rand der lavaen slikker veggen. */
  if (ik > 0.) { float fl = .75 + .25 * sin(uTime * 2.7 + a * 5.) * sin(uTime * 1.3 + a * 2.); col = mix(col, vec3(.05, .025, .02) * (.8 + .5 * g1) + vec3(1., .36, .06) * (.12 + 1.1 * ik * ik) * fl * (.7 + .5 * fbm(c * 20. + vec2(ik * 3., uTime * .4))), smoothstep(0., .25, ik));
    col = mix(col, ramp(.95 + .2 * fbm(c * 30. + uTime * .3)), smoothstep(.86, 1., ik) * .9); }
  /* Elvene fra krateret (samme leie som før), med lava som renner nedover: d = enheter nedover fra kanten, rr = radien i denne høyden. */
  float d = (1. - v) * 138. + 250. * pow(1. - v, 1.65), rr = 250. * (pow(1. - v, 1.65) + .07), px = length(fwidth(vW)) * .3, lod = 1. - smoothstep(.25, .7, px);
  float ch = abs(fbm(c * 3.1 + vec2(v * 1.5 + 2., v * 1.1)) - .5), w = .011 + .016 * v + .006 * fbm(c * 7. + v * 3.);
  float river = (1. - smoothstep(w, w * 2.8, ch)) * smoothstep(.1 + .42 * (1. - min(uEr, 1.)), 1., v + (fbm(c * 2.3 + 5.) - .5) * .9 + .2) * (1. - ik);
  if (river > .002) { float x = ch / (w * 2.8), hot = clamp(.05 + .8 * v + .18 * er, 0., 1.);
    float tp = mix(.5 + .3 * hot, flowT(x, d, a, rr, 4.6 + 3.2 * fbm(c * 2.), a * 11., hot, px), lod);
    col = mix(col, ramp(tp) * (.62 + .5 * er) * uLvB * (1. - fg * .45), river); }
  /* Kanten rundt krateret gløder ujevnt (lyset fra sjøen), og blafrer litt. */
  float rimG = smoothstep(.86, 1., v) * (1. - ik) * (.5 + .5 * fbm(c * 16. + vec2(v * 9., uTime * .35))) * (.88 + .12 * sin(uTime * 2.1 + a * 3.));
  col += vec3(1., .42, .08) * rimG * (.3 + .6 * er) * uLvB;
  /* Overløpet (skissens elver, uRiv): samme lava, med en lys front. */
  if (uFlow > 0.) { float rr2 = (pow(max(1. - v, 0.), 1.65) + .07) * 250.;
    for (int i = 0; i < 11; i++) { vec4 qq = uRiv[i]; float fi = float(i);
      float ca = uFlowA + qq.x + .012 * sin(v * 7. + fi * 2.1) + .005 * sin(v * 19. + fi);
      float du = abs(fract(vUv.x - ca + .5) - .5) * 6.2832 * rr2, wd = qq.w * (1. + .5 * (1. - v));
      float pr = clamp(uFlow * qq.y - qq.z, 0., 1.), ed = 1. - pr * 1.02;
      float on = (1. - smoothstep(wd * .55, wd, du)) * smoothstep(ed - .005, ed + .005, v) * step(.001, pr) * (1. - ik);
      if (on <= 0.) continue;
      float head = 1. - smoothstep(0., .05, v - ed), x = du / wd, hot = clamp(.25 + .6 * v + .3 * head, 0., 1.);
      float tp = mix(.6, flowT(x, d, a, rr2, 6. + 3. * qq.y, fi * 1.7, hot, px), lod) + .16 * head;
      col = mix(col, ramp(min(tp, 1.02)) * (.95 + .15 * head) * (1. - fg * .3) * uLvB, on * (1. - smoothstep(.55, 1., x) * .5)); } }
  gl_FragColor = vec4(col, 1.);
}`;
    /* Sjøen i krateret: lavaen velter opp i midten og driver utover (to faser som blandes, så mønsteret kan flytte seg uten å rive), flak av skorpe som blir eldre og
       mørkere mot kanten med glødende sprekker mellom, og seks bobler som sveller og sprekker i hver sin takt. uHeat = hvor varm (skissen: 1,35 og opp). */
    const FS_POOL = `varying vec3 vW; uniform vec3 uC; uniform float uHeat;
${K.GLSL.COMMON}
${RAMP}
float lakeT(vec2 q, float r, float px){
  vec2 w = q * .3 + (vec2(fbm(q * .21 + 3.), fbm(q * .21 + 8.)) - .5) * 1.1;
  vec3 cv = voro(w); float ce = cv.y - cv.x, age = smoothstep(1.5, 13.5, r);
  float crustK = smoothstep(.22, .7, age + .45 * (cv.z - .5) + .25 * (fbm(q * .4 + 2.) - .5));
  float far = smoothstep(.12, .5, px), crack = (1. - smoothstep(.01, .035 + min(px, .04), ce)) * (1. - far);
  float temp = .84 - .2 * age + .16 * (fbm(q * 1.4 + uTime * .35) - .5);
  return mix(temp, .1 + .09 * cv.z + .8 * crack + .16 * far, crustK);   /* sett høyt ovenfra: mørk skorpe med glød i midten, ikke et nett */
}
void main(){
  vec2 p = vW.xz - uC.xz; float r = length(p), t = uTime, px = length(fwidth(vW.xz)) * .62; vec2 dir = p / max(r, 1e-3);
  float P = 7., sp = 1.25, f0 = fract(t / P), f1 = fract(t / P + .5), wa = 1. - abs(2. * f0 - 1.);
  float temp = mix(lakeT(p - dir * f1 * P * sp + vec2(31., 7.), r, px), lakeT(p - dir * f0 * P * sp + vec2(3., 17.), r, px), wa);
  temp += .14 * (1. - smoothstep(0., 3.2, r)) * (.8 + .2 * sin(t * 1.7));
  for (int i = 0; i < 6; i++) { float fi = float(i), per = 2.6 + 2.2 * hs(fi * 3.1 + .5), ph = mod(t + hs(fi * 7.7) * per, per);
    vec2 bp = (vec2(hs(fi * 1.37 + .2), hs(fi * 2.91 + .8)) - .5) * 19.; float dd = length(p - bp);
    temp += .45 * smoothstep(per - 1.3, per - .05, ph) * (1. - smoothstep(0., 1.5, dd)) + (ph < .7 ? (1. - ph / .7) * (.55 * (1. - smoothstep(0., .3, abs(dd - .3 - ph * 3.2))) + .5 * max(0., 1. - ph / .25) * (1. - smoothstep(0., 1., dd))) : 0.); }
  temp += .12 * smoothstep(13., 16., r) * (.6 + .4 * sin(t * 2.3 + atan(p.y, p.x) * 6.));
  temp += .22 * (uHeat - 1.35);
  vec3 col = ramp(temp) * (.92 + .2 * (uHeat - 1.35));
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.);
}`;
    /* Lavaen i landskapet (flyturen): renner bort fra vulkanen, mest skorpe med glødende sprekker, varmere nær fjellet. */
    const FS_LLAVA = `varying vec3 vW; uniform vec2 uV;
${K.GLSL.COMMON}
${RAMP}
void main(){
  vec2 p = vW.xz - uV; float r = length(p), an = atan(p.y, p.x), t = uTime, px = length(fwidth(vW.xz)) * .12, lod = 1. - smoothstep(.12, .5, px);
  float s = r - t * 2.4; vec2 q = vec2(an * r * .1, s * .12); q += (vec2(vn(q * .3), vn(q * .3 + 5.)) - .5) * 1.6;
  vec3 cv = voro(q); float ce = cv.y - cv.x;
  float crustK = clamp(.5 + .35 * smoothstep(260., 900., r) + .25 * (cv.z - .5), 0., 1.), crack = 1. - smoothstep(.02, .09 + px, ce);
  float temp = .66 + .16 * (fbm(vec2(an * r * .03, s * .05)) - .5) - .22 * smoothstep(300., 1100., r) + .12 * pow(.5 + .5 * sin(s * .03 + an * 7.), 4.);
  temp = mix(temp, mix(.48, .1 + .55 * crack, lod), crustK);
  gl_FragColor = vec4(mix(ramp(temp), uFogC, fogK(vW)), 1.);
}`;

    /* Landskapet rundt (flyturen): sletter med et nett av lavaelver, mørke tinder langt ute, lavt rundt vulkanen og under krateret. */
    const LAND = (x, z) => { const r0 = Math.hypot(x, z), rv = Math.hypot(x - VOL.x, z - VOL.z);
      let h = 1.5 + 2.5 * fbm2(x * 0.012, z * 0.012); const m = c01((rv - 430) / 220) * c01((r0 - 240) / 120), rid = 1 - Math.abs(2 * fbm2(x * 0.0045 + 3.1, z * 0.0045 + 7.7) - 1);
      h += m * Math.pow(rid, 3.2) * 175 + m * 22 * fbm2(x * 0.02, z * 0.02);
      const cw = Math.abs(fbm2(x * 0.0065 + 11, z * 0.0065 + 4) - 0.5), river = (1 - smooth(0.011, 0.028, cw)) * (1 - c01(m * 1.6)) * c01((rv - 275) / 60) * c01((r0 - 165) / 40);
      h = mix(h, -1.4, river);
      if (rv < 255) h = mix(-3, h, c01((rv - 225) / 30));
      if (r0 < 160) h = r0 < 84 ? -9 : mix(2.5, h, c01((r0 - 140) / 20));
      return h; };

    /* Flyturen: Catmull-Rom over vulkanen og ned, så en bue rundt ham (fra bak til venstre for ham og rundt til forsiden) som bremser og stopper foran ansiktet på FACE. */
    const A0 = 18.9, ARC = t => { const k = seg(t, A0, Q.FACE), e = sin(k * PI / 2), ph = mix(2.62, 0.16, e), r = mix(52, 11.95, e), y = mix(30, 2.3, eo(k)); return [sin(ph) * r, y, 2.8 + cos(ph) * r]; };
    const FLY = [[0, [-190, 292, -1000]], [1.0, [-175, 285, -960]], [6.0, [-122, 245, -700]], [10.5, [-70, 205, -455]], [Q.TK, [-56, 178, -372]], [15.6, [-34, 130, -252]], [17.4, [-12, 76, -128]], [A0, ARC(A0)], [19.6, ARC(19.6)]];
    const FLYM = [[0, [-40, 100, -330]], [1.0, [-40, 102, -330]], [6.0, [-40, 108, -330]], [10.5, [-42, 126, -335]], [Q.TK, [-42, 124, -322]], [15.6, [-18, 40, -122]], [17.4, [-2, 6, -10]], [A0, [0, 4.6, 2]], [19.6, [0.1, 4.9, 2.6]]];

    /* Flyturen: banen, siktet og synsvinkelen ved t, og krengingen (kameraet legger seg inn i svingene som en fugl, og retter seg opp før det stopper). */
    const flyAt = t => { if (t < A0) return [crs(FLY, t), crs(FLYM, t), 50]; const e = sin(seg(t, A0, Q.FACE) * PI / 2); return [ARC(t), [mix(0, 0.1, e), mix(4.6, 4.55, e), mix(2, 6.2, e)], mix(50, 40, io(seg(t, A0, Q.FACE)))]; };
    const bankAt = t => { const p0 = flyAt(t - 0.2)[0], p1 = flyAt(t)[0], p2 = flyAt(t + 0.2)[0]; let d = Math.atan2(p2[0] - p1[0], p2[2] - p1[2]) - Math.atan2(p1[0] - p0[0], p1[2] - p0[2]); while (d > PI) d -= TAU; while (d < -PI) d += TAU; return max(-0.3, min(0.3, d / 0.2 * 0.2)) * (1 - io(seg(t, 19.9, Q.FACE))); };
    const dbg = () => { if (window.SKCAM) { K.far(1600); K.cam(...window.SKCAM); } };
    /* FARGEMANUSET (Fable 23.11): lyset forteller. ASKE: verden er kald og askegrå, og bare lavaen langt borte er varm. ILD: det oransje tar over når fjellet
       flyter over. MØRKT: mens lyset klatrer i steinen, slukner alt annet. RØDT: han sprenger seg fri, og stedet står som arenaen i kampen.
       key og sh = lyset og skyggen på alt, fog = disen (og fargen det fjerne går mot), rim = kantlyset bakfra, sky = himmelen (topp, høyt, lavt, horisont, under),
       cl = skyene, hot = gløden under dem, lit = hvor opplyst røyken er. To oppføringer tett i tid = et klipp. */
    const mixH = (a, b, k) => { const x = hex(a), y = hex(b); return '#' + [0, 1, 2].map(i => Math.round(255 * mix(x[i], y[i], k)).toString(16).padStart(2, '0')).join(''); };
    const mixP = (A, B, k) => { const o = {}; for (const f of ['key', 'sh', 'fog', 'rim', 'cl']) o[f] = mixH(A[f], B[f], k); o.sky = A.sky.map((c, i) => mixH(c, B.sky[i], k)); o.hot = mix(A.hot, B.hot, k); o.lit = mix(A.lit, B.lit, k); return o; };
    const P_ASH = { key: '#b4b2ca', sh: '#262236', fog: '#3f2836', rim: '#c79a86', sky: ['#05040a', '#110d1c', '#2a1a2b', '#5a3034', '#2a1820'], cl: '#17121c', hot: 0.4, lit: 0.5 };
    const P_FIRE = { key: '#dccabf', sh: '#3a2630', fog: '#6a1c08', rim: '#ffb040', sky: ['#050203', '#1b0807', '#551607', '#c8480e', '#b03c0c'], cl: '#221416', hot: 1, lit: 0.78 };
    const P_SIL = Object.assign({}, P_FIRE, { key: '#463a40', sh: '#20171e' });
    const P_DARK = { key: '#4c4048', sh: '#18111a', fog: '#220804', rim: '#8a4a26', sky: ['#020101', '#090303', '#190604', '#3e1208', '#260a05'], cl: '#0d0808', hot: 0.3, lit: 0.2 };
    const P_RED = { key: '#fff0dc', sh: '#3c1a22', fog: '#6a1c08', rim: '#ffb040', sky: P_FIRE.sky, cl: '#241517', hot: 1, lit: 1 };
    const PAL = [[0, P_ASH], [Q.S3, P_ASH], [Q.OV, mixP(P_ASH, P_FIRE, 0.55)], [39.2, P_FIRE], [43.5, P_FIRE], [Q.SIL, P_SIL], [Q.S5 - 0.02, P_SIL], [Q.S5, P_FIRE], [Q.HIT, P_FIRE], [79.5, P_DARK], [Q.CLX - 0.04, P_DARK], [Q.CLX, P_RED], [1e4, P_RED]];
    const palAt = t => { let i = 0; while (i < PAL.length - 2 && t >= PAL[i + 1][0]) i++; return mixP(PAL[i][1], PAL[i + 1][1], io(seg(t, PAL[i][0], PAL[i + 1][0]))); };
    G3D.def('c3:383', {
      /* Filmen går på introlåta (Epikus) fra 0:00. Continue kommer når navnet står (len), og scenen lever videre til spilleren trykker eller låta er ute (1:48). */
      len: Q.NAME + 0.7, hold: 1, R: Q.ROAR, at: 0, models: ['groudon'],
      mus: { song: 'Epikus', bed: 'sfx/natur/groudon_intro.mp3', auto: 107.8, bar: [84.82, 2.82], next: { fade: 0.6, gap: 0.5, at: 1.6, hit: 2.1 } },
      make(K, T) {
        const S = crater(T), g = S.gr = K.figure(K.model('groudon')); S.scene.add(g.root); S.figs.push(g);
        g.clear(); g.apply(); const loc = (b, x, y, z) => g.bones[b].worldToLocal(new T.Vector3(x, y, z));
        g.set('uSeam', 0.22); g.set('uHead', [2.2, 4.2, 1]); g.set('uGl', 0.15); g.set('uStoneC', '#9a909e'); g.set('uWk', 0);
        S.A = { eye: loc('Head', 0.9, 6.02, 4.75), eyeCam: loc('Head', 3.5, 6.5, 6.9) }; S.W = (b, v) => g.bones[b].localToWorld(v.clone());
        const B = bodyPts(g, STAT), CHEST = [0, 4.4, 3.4];
        /* Knuset (skisse 2): steinhuden sprenges av i en bølge fra brystet og utover, og noen store flak slipper litt senere, så det ikke skjer i ett bilde. */
        S.shell = K.shards(72, i => { const c = B[i % B.length], a = rnd(i, 3) * TAU, big = i % 8 === 3, el = 0.1 + rnd(i, 4) * 1.05, v = (big ? 6 : 8) + rnd(i, 5) * 13, dx = c[0] - HOME[0], dz = c[2] - HOME[2], dl = Math.hypot(dx, dz), ux = (dl > 0.6 ? dx / dl : 0) * 0.55 + cos(a) * 0.8, uz = (dl > 0.6 ? dz / dl : 0) * 0.55 + sin(a) * 0.8, dc = Math.hypot(c[0] - CHEST[0], c[1] - CHEST[1], c[2] - CHEST[2]);
          return { p: [c[0] + ux * 0.9, c[1] + (rnd(i, 6) - 0.3) * 1.3, c[2] + uz * 0.9], v: [ux * v * cos(el) * (big || c[1] > 4.6 ? 1.5 : 1), 3 + sin(el) * v, c[1] > 4.6 ? -abs(uz) * v * cos(el) * 0.7 - 2 : uz * v * cos(el) + (big ? -1 : 2.5)], r: [(rnd(i, 7) - 0.5) * 13, (rnd(i, 8) - 0.5) * 13, (rnd(i, 9) - 0.5) * 13], s: rnd(i, 10), b: 0.01 + dc * 0.04 + rnd(i, 11) * 0.05 + (i % 4 === 0 ? 0.18 + rnd(i, 14) * 0.32 : 0), l: 2.6, z: big ? 0.55 + rnd(i, 12) * 0.4 : 0.2 + rnd(i, 13) * 0.38 }; }, { c: '#b6acba' }); S.scene.add(S.shell);
        /* Oppladningen: steinen knaker og drysser (små flak som løsner og faller), og støv blåses av hodet når øyet åpner seg. */
        S.crumb = K.shards(30, i => { const c = B[(i * 7) % B.length], a = rnd(i, 31) * TAU; return { p: [c[0] + cos(a) * 1.1, c[1] + (rnd(i, 32) - 0.3) * 1.2, c[2] + sin(a) * 1.1], v: [cos(a) * (0.6 + rnd(i, 33)), 0.4 + rnd(i, 34) * 1.4, sin(a) * (0.6 + rnd(i, 33)) + 0.6], r: [(rnd(i, 35) - 0.5) * 8, (rnd(i, 36) - 0.5) * 8, (rnd(i, 37) - 0.5) * 8], s: rnd(i, 38), b: rnd(i, 39) * 1.35, l: 2, z: 0.18 + rnd(i, 40) * 0.24 }; }, { c: '#b6acba' }); S.scene.add(S.crumb);
        S.hpuff = K.pts(26, i => { const a = rnd(i, 41) * TAU, v = 1.2 + rnd(i, 42) * 3; return { p: [cos(a) * 0.6, (rnd(i, 43) - 0.5) * 0.8, sin(a) * 0.6], v: [cos(a) * v, 0.4 + rnd(i, 44) * 1.6, sin(a) * v + 0.8], b: rnd(i, 45) * 0.1, l: 1 + rnd(i, 46) * 0.6, z: 1.4 + rnd(i, 47) * 1.6 }; }, { t0: -1e5, shade: 1, drag: 1.6, sz0: 0.4, sz1: 1.8, px: 60, c: ['#d2c8d0', '#8e8290', '#4c4250'], a: 0.55, fade: 0.3 }); S.scene.add(S.hpuff);
        S.aura = K.light(1, '#ffc23a'); S.scene.add(S.aura);
        S.mote = K.pts(320, i => { const a = rnd(i, 1401) * TAU, r = 2.2 + rnd(i, 1402) * 5.5; return { p: [cos(a) * r, rnd(i, 1403) * 9, sin(a) * r * 0.9 - 0.6], v: [(rnd(i, 1404) - 0.5) * 0.3, 0.12 + rnd(i, 1405) * 0.3, (rnd(i, 1406) - 0.5) * 0.3], b: rnd(i, 1407) * 9, l: 6 + rnd(i, 1408) * 4, z: 0.04 + rnd(i, 1409) * 0.07 }; },
          { loop: 1, add: 1, sway: 0.35, px: 60, near: 1.2, c: ['#fff4c8', '#ffc45a', '#ff7a1e'], fade: 0.75, a: 0 }); S.scene.add(S.mote);
        S.puff = K.pts(52, i => { const c = B[i % B.length], a = rnd(i, 21) * TAU, v = 2 + rnd(i, 22) * 5.5; return { p: [c[0] + cos(a) * 0.8, c[1], c[2] + sin(a) * 0.8], v: [cos(a) * v, 0.6 + rnd(i, 23) * 2.8, sin(a) * v + 1], b: rnd(i, 24) * 0.25, l: 1.3 + rnd(i, 25) * 1, z: 3.2 + rnd(i, 26) * 4.2 }; }, { t0: -1e5, shade: 1, drag: 1.5, sz0: 0.4, sz1: 1.9, px: 60, c: ['#d2c8d0', '#8e8290', '#4c4250'], a: 0.5, fade: 0.25 }); S.scene.add(S.puff);
        /* Lysstrålene (Jazz 21.11: «kraftig lys som slipper fra sprekkene i et mørkt rom (støv og aske så kan man se lysstrålene)»): smale stråler som står ut fra
           kroppen der sprekkene er, og som tennes etter hvert som fronten når dem (samme regning som i figuren: avstanden fra hælen eller halen). */
        { const O1 = [2.87, -6, -1.3], O2 = [0, 1.0, -14.4];
          S.beam = K.beams(34, i => { const c = B[(i * 7 + 3) % B.length], vo = [c[0] - HOME[0], c[1] - HOME[1], c[2] - HOME[2]], dist = min(Math.hypot(vo[0] - O1[0], vo[1] - O1[1], vo[2] - O1[2]), Math.hypot(vo[0] - O2[0], vo[1] - O2[1], vo[2] - O2[2]));
            const a = rnd(i, 1601) * TAU, dx = c[0] - HOME[0], dz = c[2] - 2.2, dl = Math.hypot(dx, dz) || 1, d = [dx / dl * 0.9 + cos(a) * 0.7, 0.25 + rnd(i, 1602) * 1.1, dz / dl * 0.9 + sin(a) * 0.7];
            return { p: [c[0] + d[0] * 0.5, c[1] + 0.2, c[2] + d[2] * 0.5], d, l: 3.5 + rnd(i, 1603) * 4.5, w: 0.1 + rnd(i, 1604) * 0.16, w1: 0.5 + rnd(i, 1605) * 0.7, b: Q.HIT + max(0, dist - 7) / 0.511 + 0.4 + rnd(i, 1606) * 1.2, s: rnd(i, 1607) }; }, { t0: 0, rise: 1.6, c: '#ffbe3c', core: 0.7, a: 0 }); S.scene.add(S.beam); }
        /* Lavaen koker rundt ham i oppladningen (bobler og sprut rundt føttene). */
        S.boil = K.pts(60, i => { const a = rnd(i, 51) * TAU, r = 2.6 + rnd(i, 52) * 3.6; return { p: [cos(a) * r, 0.05, sin(a) * r * 0.8], v: [cos(a) * (0.5 + rnd(i, 53)), 2.5 + rnd(i, 54) * 4.5, sin(a) * (0.5 + rnd(i, 53))], b: rnd(i, 55) * 0.6, l: 0.6 + rnd(i, 56) * 0.3, z: 0.35 + rnd(i, 57) * 0.5 }; }, { loop: 1, add: 1, g: 24, px: 60, floor: 0, c: ['#ffe070', '#ff8a18', '#d83a0a'], fade: 0.9 }); S.scene.add(S.boil);
        volcano(S, T, 0);
        /* Skisse 4: fjellet i høyere oppløsning, med en indre vegg ned til lavasjøen i krateret (skissen var åpen innvendig), og lava som renner NEDOVER og lever (FS_VOLC_T). */
        { const pos = [], uvs = [], idx = [], N = VN, M = VM, IW = 8, rimY = a => VOL.h - VOL.h * 0.035 * max(0, sin(a * 2 + 1.1)) + (fbm2(cos(a) * 3 + 4, sin(a) * 3 + 1) - 0.5) * VOL.h * 0.035;
          for (let j = 0; j <= M + IW; j++) for (let i = 0; i <= N; i++) { const a = (i % N) / N * TAU; let rr, y, vv;
            if (j <= M) { const v = j / M; rr = VRR[j][i]; y = j === M ? rimY(a) : v * VOL.h; vv = v; }
            else { const k = (j - M) / IW, y0 = rimY(a); rr = mix(VRR[M][i], 15.4, Math.pow(k, 0.6)); y = mix(y0, VOL.h - 7.6, io(k)); vv = 1 + 0.1 * k; }
            pos.push(cos(a) * rr, y, sin(a) * rr); uvs.push(i / N, vv); }
          for (let j = 0; j < M + IW; j++) for (let i = 0; i < N; i++) { const p = j * (N + 1) + i, q = p + N + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
          const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); gg.setIndex(idx); gg.computeVertexNormals(); gg.computeBoundingSphere();
          const u0 = S.vol.material.uniforms; S.vol.geometry.dispose(); S.vol.geometry = gg;
          S.vol.material = K.shader(K.GLSL.VS, FS_VOLC_T, { uA: K.uv(u0.uA.value), uB: K.uv(u0.uB.value), uEr: K.uv(0.3), uFlow: K.uv(0), uFlowA: K.uv(0.2308), uRiv: K.uv(Array.from({ length: 11 }, () => new T.Vector4())), uLvB: K.uv(1) }, { side: T.DoubleSide }); }
        /* Lavaen under alt: stor nok til hele landskapet (elvene i nettet er den som synes mellom bakken). */
        /* Skisse 4: lavasjøen i krateret er en skive (den rant mot +Z over hele landskapet, altså opp mot vulkanen sett fra flyturen); lavaen i landskapet er en egen flate
           som renner bort fra vulkanen, med skorpe og glødende sprekker (FS_LLAVA). */
        S.lava.geometry = new T.CircleGeometry(112, 72).rotateX(-PI / 2);
        S.llava = new T.Mesh(new T.RingGeometry(100, 1500, 120, 10).rotateX(-PI / 2), K.shader(K.GLSL.VS, FS_LLAVA, { uV: K.uv(new T.Vector2(VOL.x, VOL.z)) })); S.llava.position.y = -0.05; S.llava.frustumCulled = false; S.scene.add(S.llava);
        /* Landskapet. */
        const lg = new T.PlaneGeometry(2400, 2400, 240, 240).rotateX(-PI / 2), lp = lg.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), z = lp.getZ(i) - 300; lp.setY(i, LAND(x, z)); } lg.computeVertexNormals();
        S.land = new T.Mesh(lg, K.rockMat({ a: '#150c0d', b: '#2c1b19', str: 0.1, sm: 0, lv: 1, hot: 0.7, ck: 0.5, sc: 0.3 })); S.land.position.z = -300; S.scene.add(S.land);
        /* Kraterbunnen: tørr slette med sprekker, bekkeleiet med en tynn lavabekk i midten og lave voller på sidene. Synker under lavaen der flommen har nådd (aT). */
        const fg = new T.PlaneGeometry(172, 172, 172, 172).rotateX(-PI / 2), fp = fg.attributes.position, AT = new Float32Array(fp.count), AB = new Float32Array(fp.count);
        const POOLS = [[5.5, 25.5, 1.6], [-8.2, 11.6, 1.3], [7.4, 3.2, 1.2], [-5, -7, 1.8], [13, -11, 2.0], [-15, 2, 1.5], [11, 21, 1.1], [-12, 19, 1.2]];   /* skisse 3: hint av lava på bakken alt før flommen */
        for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), d = chAt(x, z)[0]; let y = 0.2 + 0.1 * (fbm2(x * 0.15, z * 0.15) - 0.5); for (const [px, pz, pr] of POOLS) y -= 0.5 * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (pr * pr)); y += 0.55 * Math.exp(-Math.pow((d - 3.4) / 1.0, 2)); y -= 0.13 * (1 - smooth(0.4, 2.2, d));   /* bekkeleiet er tørt til lunta kommer (bunnen ligger over lavaflaten, og synker når fronten er der) */ fp.setY(i, y); AT[i] = arrive(x, z); AB[i] = SHEET ? 0.25 : d < 3 ? 0.55 : 0.18; }
        fg.setAttribute('aT', new T.BufferAttribute(AT, 1)); fg.setAttribute('aB', new T.BufferAttribute(AB, 1));
        S.floorM = K.shader(VS_FLOOR, FS_FLOOR, { uCk: K.uv(0) }); S.floor = new T.Mesh(fg, S.floorM); S.scene.add(S.floor);
        /* Den gamle gangbroa over bekken i pilegrimsstien (Jazz 19.11: «Broa må være mer naturlig del av noe. Og gjøre mindre»): en liten steinbue i menneskestørrelse,
           bygget av skiver på tvers (hver sin stein, så den kan rase stein for stein) med lave rekkverksteiner oppå. Midten raser først når lunta tar den (BRO). */
        const rough = (geo, amt, sd) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.round(x * 53.1) * 3 + Math.round(y * 71.3) * 7 + Math.round(z * 37.9) * 13; p.setXYZ(i, x + (rnd(h, sd) - 0.5) * amt, y + (rnd(h, sd + 1) - 0.5) * amt, z + (rnd(h, sd + 2) - 0.5) * amt); } geo.computeVertexNormals(); return geo; };
        const bm = K.rockMat({ a: '#3c3a3c', b: '#7c7672', str: 0.5, sm: 0.25, lv: 1, hot: 0.45, ck: 0.25, rough: 0.8, sc: 2.4, top: 0.7 }), grp = new T.Group(); S.bparts = [];
        { const BW = 1.6, RA = 2.2, CY = -0.2, HL = 3.9, NS = 13, top = x => 0.5 + 1.85 * (1 - (x / HL) * (x / HL)), bot = x => abs(x) < RA ? CY + Math.sqrt(RA * RA - x * x) : -0.7;
          for (let i = 0; i < NS; i++) { const x0 = -HL + 2 * HL * i / NS, x1 = x0 + 2 * HL / NS, sh = new T.Shape(), cx = (x0 + x1) / 2, cy = (top(cx) + max(bot(cx), 0)) / 2;
            sh.moveTo(x0 - cx, bot(x0) - cy); for (let k = 1; k <= 4; k++) { const x = mix(x0, x1, k / 4); sh.lineTo(x - cx, bot(x) - cy); } for (let k = 4; k >= 0; k--) { const x = mix(x0, x1, k / 4); sh.lineTo(x - cx, top(x) - cy); }
            const geo = new T.ExtrudeGeometry(sh, { depth: BW, bevelEnabled: false }); geo.translate(0, 0, -BW / 2);
            const m = new T.Mesh(rough(geo, 0.05, 632 + i), bm); m.position.set(cx, cy, 0); grp.add(m);
            for (const zz of [-1, 1]) { if (rnd(i * 2 + zz, 633) < 0.28) continue; const ps = new T.Mesh(rough(new T.BoxGeometry(2 * HL / NS * 0.9, 0.2 + rnd(i + zz, 634) * 0.08, 0.2), 0.03, 640 + i), bm); ps.position.set(0, top(cx) - cy + 0.1, zz * (BW / 2 - 0.1)); ps.rotation.z = Math.atan(-3.7 * cx / (HL * HL)); m.add(ps); }
            S.bparts.push({ m, p: [cx, cy, 0], r: 0, keep: abs(cx) > RA + 0.25, i }); } }
        grp.position.set(BR.x, 0, BR.z); grp.rotation.y = BR.ry; S.scene.add(grp); S.bridge = grp;
        S.bdust = K.pts(40, i => ({ p: [(rnd(i, 501) - 0.5) * 3.4, 1.85 - 0.6 * abs(rnd(i, 501) - 0.5), (rnd(i, 502) - 0.5) * 1.4], v: [(rnd(i, 503) - 0.5) * 0.3, -0.15 - rnd(i, 504) * 0.4, (rnd(i, 505) - 0.5) * 0.3], b: rnd(i, 506) * 0.5, l: 1.6 + rnd(i, 507), z: 0.3 + rnd(i, 508) * 0.3 }), { t0: -1e5, shade: 1, g: 1.5, px: 60, c: ['#b8b0b0', '#7a7276', '#4a4448'], a: 0.6, fade: 0.4 }); grp.add(S.bdust);
        S.peb = K.pts(26, i => ({ p: [(rnd(i, 511) - 0.5) * 3.2, 1.8 - 0.6 * abs(rnd(i, 511) - 0.5), (rnd(i, 512) - 0.5) * 1.3], v: [(rnd(i, 513) - 0.5) * 0.3, -0.1, (rnd(i, 514) - 0.5) * 0.3], b: rnd(i, 515) * 0.7, l: 1.2, z: 0.05 + rnd(i, 516) * 0.05 }), { t0: -1e5, pix: 1, g: 5, px: 60, c: ['#9a9296', '#6e666a', '#3a3438'], id: 201, floor: -0.3, fade: 0.95 }); grp.add(S.peb);
        /* Steinene som raser fra klippene på bass-slagene (under broa). */
        const rm = K.rockMat({ a: '#5a4a48', b: '#8e7a72', str: 0.3, lv: 0 }); S.rocks = [-2.2, -1.36, -2.08, -1.28, -2.28, -2.14, -1.4, -2.24, -1.32, -2.02].map((a, i) => { const m = K.boulder(2.4 + rnd(i, 601) * 2.2, 610 + i, { j: 0.25, mat: rm }); S.scene.add(m); return { m, a, t0: (i < 5 ? Q.UB : Q.R2) + rnd(i, 602) * 0.45 }; });
        S.rdust = S.rocks.map((r, k) => { const d = K.pts(26, i => { const a = rnd(i, 650 + k) * TAU, v = 3 + rnd(i, 651 + k) * 6; return { p: [cos(a) * 2, 0.5, sin(a) * 2], v: [cos(a) * v, 2 + rnd(i, 652 + k) * 4, sin(a) * v], b: rnd(i, 653) * 0.15, l: 1.8 + rnd(i, 654) * 1.2, z: 9 + rnd(i, 655) * 9 }; }, { t0: -1e5, shade: 1, drag: 1.4, sz0: 0.5, sz1: 2.2, px: 60, c: ['#d8c0b0', '#8a7068', '#3c2c2a'], a: 0.75, fade: 0.3 }); S.scene.add(d); return d; });
        /* Lava i krateret på vulkanen (synes fra flyturen), og en røyksøyle i 3D (bakteppets søyle er 2D og synes ikke ovenfra). */
        /* Skisse 4: lavasjøen i krateret lever: den velter opp i midten, flak av skorpe driver utover og brekker opp, og bobler sveller og sprekker (FS_POOL). */
        S.pool = new T.Mesh(new T.CircleGeometry(16.2, 72).rotateX(-PI / 2), K.shader(K.GLSL.VS, FS_POOL, { uC: K.uv(new T.Vector3(VOL.x, VOL.h - 9, VOL.z)), uHeat: K.uv(1.35) })); S.pool.position.set(VOL.x, VOL.h - 9, VOL.z); S.scene.add(S.pool);
        S.plume = K.pts(160, i => ({ p: [(rnd(i, 701) - 0.5) * 10, 0, (rnd(i, 702) - 0.5) * 10], v: [(rnd(i, 703) - 0.5) * 3, 13 + rnd(i, 704) * 9, (rnd(i, 705) - 0.5) * 3], b: rnd(i, 706) * 16, l: 16, z: 40 + rnd(i, 707) * 45 }),
          { loop: 1, shade: 1, drag: 0.9, sz0: 0.45, sz1: 2.4, px: 150, wind: [0.075, 0, 0.025], c: ['#c06a40', '#4c302c', '#1a1214'], a: 0.8, fade: 0.6, near: 34 }); S.plume.position.set(VOL.x, VOL.h - 4, VOL.z); S.scene.add(S.plume);
        /* Overløpet (skisse 2): elvene, fontenene i krateret på slagene, en lav fontene hele tiden, glør ved hver elvs front, og steinene der lavaen spruter. */
        RIV.forEach((r, i) => S.vol.material.uniforms.uRiv.value[i].set(r[0], r[1], r[2], r[3]));
        S.vspat.material.uniforms.uNear.value = 22;
        const CR = [VOL.x, VOL.h - 7, VOL.z], hot = ['#fff2a8', '#ffa020', '#c83008'];
        S.fnt = [0, 1, 2].map(k => { const m = K.pts(130, i => { const a = rnd(i, 930 + k) * TAU, q = rnd(i, 931 + k); return { p: [cos(a) * 7 * q, 0, sin(a) * 7 * q], v: [cos(a) * (3 + 12 * q) + 2, 32 + rnd(i, 932 + k) * 36, sin(a) * (3 + 12 * q)], b: rnd(i, 933 + k) * 0.22, l: 2.8 + rnd(i, 934 + k) * 1.2, z: 4.5 + rnd(i, 935 + k) * 6 }; }, { t0: -1e5, add: 1, g: 26, px: 150, c: hot, fade: 0.7 }); m.position.set(...CR); S.scene.add(m); return m; });
        /* Skisse 4: lavafontenen har masse: en tett søyle av store, myke klumper som stiger og faller tilbake (skissen: små gnister, som fyrverkeri). */
        S.jet = K.pts(340, i => { const a = rnd(i, 1501) * TAU, q = Math.pow(rnd(i, 1502), 1.6); return { p: [cos(a) * 3.2 * q, 0, sin(a) * 3.2 * q], v: [cos(a) * (1 + 7 * q) + 1, 34 + rnd(i, 1503) * 30, sin(a) * (1 + 7 * q)], b: rnd(i, 1504) * 3, l: 3, z: 9 + rnd(i, 1505) * 10 }; },
          { loop: 1, add: 1, g: 26, px: 150, sz0: 1.2, sz1: 0.55, c: ['#ffd070', '#ff8a1c', '#a82406'], a: 0, fade: 0.6, near: 30 }); S.jet.position.set(VOL.x, VOL.h - 8, VOL.z); S.scene.add(S.jet);
        S.fntC = K.pts(140, i => { const a = rnd(i, 940) * TAU, q = rnd(i, 941); return { p: [cos(a) * 6 * q, 0, sin(a) * 6 * q], v: [cos(a) * (2 + 6 * q), 16 + rnd(i, 942) * 16, sin(a) * (2 + 6 * q)], b: rnd(i, 943) * 2.4, l: 2.4, z: 3.2 + rnd(i, 944) * 4 }; }, { loop: 1, add: 1, g: 26, px: 150, c: hot, fade: 0.7 }); S.fntC.position.set(...CR); S.scene.add(S.fntC);
        S.heads = RIV.map((r, i) => { const m = K.pts(22, j => { const a = rnd(j, 950 + i) * TAU; return { p: [cos(a) * 1.5, 0.5, sin(a) * 1.5], v: [cos(a) * (2 + rnd(j, 951) * 4), 5 + rnd(j, 952) * 8, sin(a) * (2 + rnd(j, 951) * 4)], b: rnd(j, 953) * 0.9, l: 0.9, z: 0.5 + rnd(j, 954) * 0.7 }; }, { loop: 1, add: 1, g: 14, px: 150, c: hot, fade: 0.75, near: 9 }); S.scene.add(m); return m; });
        S.lobes = RIV.map((r, i) => { const m = new T.Mesh(new T.SphereGeometry(1, 20, 12), K.shader(K.GLSL.VS, FS_LOBE, {})); m.scale.set(r[3] * 1.35, 1.25, 4.2); m.visible = false; S.scene.add(m); return m; });
        const vrm = K.rockMat({ a: '#1a1012', b: '#3a2622', str: 0.3, lv: 1, hot: 0.8 });
        S.vrk = RK.map(([ri, v], k) => { const p = volPt(rivAu(ri, v), v, 1.2), m = K.boulder(3.6 + rnd(k, 960) * 2.4, 970 + k, { j: 0.28, sy: 0.75, mat: vrm }); m.position.set(...p); S.scene.add(m);
          const ou = [cos(rivAu(ri, v) * TAU), sin(rivAu(ri, v) * TAU)], sp = K.pts(30, i => { const a = (rnd(i, 980 + k) - 0.5) * 2.4; return { p: [-ou[0] * 2, 1.5, -ou[1] * 2], v: [ou[0] * (2 + rnd(i, 981) * 4) + cos(a) * 3, 7 + rnd(i, 982) * 7, ou[1] * (2 + rnd(i, 981) * 4) + sin(a) * 3], b: rnd(i, 983) * 0.12 + (i % 2) * 0.62, l: 1.24, z: 1.4 + rnd(i, 984) * 1.8 }; }, { loop: 1, add: 1, g: 22, px: 150, c: hot, fade: 0.85 });
          sp.position.set(...p); S.scene.add(sp); return { sp, t: rivReach(ri, v) }; });
        /* Lavafallet over den høye veggen til venstre: en stripe som følger veggens terrasser ned (profilen til kolonnen FCOL i K.cliff, litt foran steinen). */
        { const dip = a => 1 - 0.6 * Math.exp(-Math.pow((((a - PI * 1.5) % TAU + TAU + PI) % TAU - PI) / 0.7, 2)), o = { r: 76, h: 27, y0: -2, rough: 7, back: 15, steps: 3, ledge: 2.6, seed: 3, m: 8 };
          const prof = ia => { const a = ia / 64 * TAU, hhh = o.h * dip(a) * (0.72 + 0.5 * rnd(ia, o.seed + 1) + 0.25 * sin(a * 3 + o.seed)); return Array.from({ length: o.m + 1 }, (_, j) => { const v = j / o.m, st = floor(v * o.steps) / o.steps; return [o.r + (rnd(ia * 13 + j, o.seed) - 0.5) * o.rough + st * o.back + (j % 2 ? o.ledge : 0) + sin(a * 5 + j) * o.rough * 0.4, o.y0 + v * hhh + (j === o.m ? rnd(ia, o.seed + 5) * o.h * 0.18 : 0)]; }); };
          const P0 = prof(FCOL), NR = 32, NC = 6, W = 9, pos = new Float32Array((NR + 1) * (NC + 1) * 3), q = new Float32Array((NR + 1) * (NC + 1) * 2), idx = [];
          const rAt = y => { let r = P0[0][0]; for (let j = 0; j < P0.length - 1; j++) if (y >= P0[j][1] && y <= P0[j + 1][1]) r = mix(P0[j][0], P0[j + 1][0], (y - P0[j][1]) / (P0[j + 1][1] - P0[j][1])); return r; };
          const yTop = P0[o.m][1] - 0.6; S.fallTop = yTop;
          for (let j = 0; j <= NR; j++) { const y = mix(yTop, -0.6, j / NR), r = min(rAt(y), rAt(y + 1.2), rAt(y - 1.2)) - 1.3; for (let i = 0; i <= NC; i++) { const off = (i / NC - 0.5) * W, a = FAZ + off / r, k = j * (NC + 1) + i; pos.set([cos(a) * r, y, sin(a) * r], k * 3); q.set([i / NC, j / NR], k * 2); } }
          for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) { const p = j * (NC + 1) + i, p2 = p + NC + 1; idx.push(p, p2, p + 1, p2, p2 + 1, p + 1); }
          const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(pos, 3)); gg.setAttribute('aQ', new T.BufferAttribute(q, 2)); gg.setIndex(idx);
          S.fallM = K.shader(VS_WALL, FS_FALL, { uFall: K.uv(0), uEnd: K.uv(0) }, { side: T.DoubleSide }); S.fall = new T.Mesh(gg, S.fallM); S.fall.frustumCulled = false; S.scene.add(S.fall);
          S.fspl = K.pts(60, i => { const a = rnd(i, 991) * TAU, v = 2 + rnd(i, 992) * 5; return { p: [cos(a) * 2.5, 0.2, sin(a) * 2.5], v: [cos(a) * v, 5 + rnd(i, 993) * 8, sin(a) * v], b: rnd(i, 994) * 1.1, l: 1.1, z: 0.9 + rnd(i, 995) * 1.3 }; }, { loop: 1, add: 1, g: 22, px: 60, floor: -0.2, c: hot, fade: 0.85 });
          S.fspl.position.set(FOOT.x, 0, FOOT.z); S.scene.add(S.fspl);
          S.fsmk = K.pts(40, i => ({ p: [(rnd(i, 996) - 0.5) * 6, 0.5, (rnd(i, 997) - 0.5) * 6], v: [(rnd(i, 998) - 0.5) * 1.5, 3 + rnd(i, 999) * 3, (rnd(i, 1000) - 0.5) * 1.5], b: rnd(i, 1001) * 3, l: 3, z: 5 + rnd(i, 1002) * 5 }), { loop: 1, shade: 1, drag: 0.8, sz0: 0.5, sz1: 2.2, px: 60, c: ['#b06040', '#4c302c', '#1a1214'], a: 0.6, fade: 0.5 });
          S.fsmk.position.set(FOOT.x, 0, FOOT.z); S.scene.add(S.fsmk);
          S.fglow = K.light(1, '#ff8a2a'); S.fglow.position.set(FOOT.x * 0.98, 4, FOOT.z * 0.98); S.scene.add(S.fglow); }
        /* MÅLESTOKKEN (Jazz 19.11: «Broa må være mer naturlig del av noe. Og gjøre mindre … ødelagte trær, brente trær, steinruiner»): en gammel pilegrimssti med en
           helligdom i ruiner ved føttene hans. Fra vest kommer stien med steinlykter over den lille broa, gjennom en torii av stein, opp en trapp til forgården med alteret
           og knekte søyler, rett under hodet hans. Alt er i menneskestørrelse (en lykt 0,9, toriien 2,6, et tre rundt 3; han er rundt 8,5), i forvitret, lys stein under
           aske, og med svidde, døde trær rundt. Flommen tar alt: det tipper og synker der lavaen kommer (S.ruin). */
        const gm = K.rockMat({ a: '#48464a', b: '#8a8582', str: 0.5, sm: 0.3, lv: 1, hot: 0.5, ck: 0.2, rough: 0.7, sc: 2.6, top: 0.8 }), gm2 = K.rockMat({ a: '#333034', b: '#625d5c', str: 0.5, sm: 0.3, lv: 1, hot: 0.5, ck: 0.28, rough: 0.8, sc: 2.6, top: 0.6 });
        const wood = K.rockMat({ a: '#0b0707', b: '#231815', str: 0.9, sm: 0.5, lv: 1, hot: 1.2, ck: 0.5, sc: 5 });
        S.ruin = []; const put = (m, x, y, z, ry, h, tilt) => { m.position.set(x, y, z); m.rotation.y = ry || 0; S.scene.add(m); S.ruin.push({ m, y0: y, h: h || 1, tilt: tilt == null ? 0.5 : tilt, x, z, T: 0 }); return m; };
        const BX = (w, h, d, mat, sd) => new T.Mesh(rough(new T.BoxGeometry(w, h, d, 2, 1, 2), min(w, h, d) * 0.1, sd || 1), mat || gm), CYL = (r0, r1, h, n, mat, sd) => new T.Mesh(rough(new T.CylinderGeometry(r0, r1, h, n || 8, 2), min(r0 + r1, h) * 0.05, sd || 2), mat || gm);
        const flags = (PT, n, sd) => { const at = k => { const f = k * (PT.length - 1), i = min(PT.length - 2, floor(f)), u = f - i; return [mix(PT[i][0], PT[i + 1][0], u), mix(PT[i][1], PT[i + 1][1], u)]; };
          for (let i = 0; i < n; i++) { if (rnd(i, sd) < 0.16) continue; const [x, z] = at(i / (n - 1)); put(BX(0.8 + rnd(i, sd + 1) * 0.35, 0.08, 0.36, gm2, sd + 2 + i), x + (rnd(i, sd + 3) - 0.5) * 0.35, 0.21, z, (rnd(i, sd + 4) - 0.5) * 0.5 + Math.atan2(PT[PT.length - 1][0] - PT[0][0], PT[PT.length - 1][1] - PT[0][1]) + PI / 2, 0.2, 0.1); } return at; };
        const pathAt = flags([[1.7, 20.1], [1.6, 17.8], [1.35, 15.4], [1.0, 13.95]], 18, 1210), westAt = flags([[-6.7, 20.2], [-8.4, 21.4], [-10.0, 23.3], [-11.5, 25.9], [-13.5, 29.5]], 22, 1260);
        /* Toriien av stein over stien: to søyler som heller litt innover, tverrbjelken, og overliggeren med oppbøyde ender. Den står på skakke. */
        { const m = new T.Group(), H = 2.35, W = 1.25; for (const sd of [-1, 1]) { const p = CYL(0.13, 0.16, H, 8, gm, 1300 + sd); p.position.set(sd * W, H / 2, 0); p.rotation.z = sd * 0.035; m.add(p); const b = BX(0.42, 0.16, 0.42, gm2, 1302 + sd); b.position.set(sd * (W + 0.04), 0.08, 0); m.add(b);
            const e = BX(0.56, 0.18, 0.3, gm, 1307 + sd); e.position.set(sd * (W + 0.78), H + 0.15, 0); e.rotation.z = sd * 0.2; m.add(e); }
          const nuki = BX(2 * W + 0.5, 0.15, 0.17, gm, 1305); nuki.position.y = H * 0.78; m.add(nuki); const ka = BX(2 * W + 1.1, 0.2, 0.3, gm, 1306); ka.position.y = H + 0.08; m.add(ka);
          const st = BX(0.14, H * 0.2, 0.12, gm, 1309); st.position.y = H * 0.89; m.add(st); m.rotation.z = 0.035; S.torii = put(m, 1.5, 0.18, 16.6, 0.05, 2.7, 0.9); }
        /* Trappa og forgården (en lav, rund plattform) rett under hodet hans, med alteret og en skål. */
        const FC = { x: 0.9, z: 9.9 };
        for (let k = 0; k < 4; k++) put(BX(3.4 - k * 0.12, 0.13, 0.42, gm2, 1320 + k), FC.x + 0.05, 0.2 + k * 0.11, 13.75 - k * 0.36, 0.02, 0.3, 0.08);
        put(new T.Mesh(rough(new T.CylinderGeometry(3.25, 3.4, 0.5, 24, 1), 0.06, 1325), gm2), FC.x, 0.38, FC.z, 0, 0.6, 0.05);
        put(BX(1.3, 0.5, 0.7, gm, 1330), FC.x, 0.88, FC.z - 0.9, 0.04, 0.7, 0.3); put(CYL(0.27, 0.15, 0.18, 10, gm2, 1331), FC.x + 0.05, 1.22, FC.z - 0.9, 0, 0.3, 0.4);
        for (let i = 0; i < 6; i++) { const a = -0.5 + i * (PI + 1.0) / 5, h = i === 2 ? 0.5 : 0.9 + rnd(i, 1201) * 1.5, m = new T.Group(), sh = CYL(0.2, 0.23, h, 9, gm, 1340 + i); sh.position.y = h / 2; m.add(sh); const base = BX(0.62, 0.16, 0.62, gm2, 1346 + i); base.position.y = 0.06; m.add(base);
          if (rnd(i, 1202) > 0.5 && i !== 2) { const cap = BX(0.56, 0.16, 0.56, gm, 1352 + i); cap.position.y = h + 0.07; cap.rotation.z = 0.06; m.add(cap); } m.rotation.z = (rnd(i, 1203) - 0.5) * 0.14; put(m, FC.x + cos(a) * 2.95, 0.6, FC.z + sin(a) * 2.95 * 0.92, rnd(i, 1204) * 3, h + 0.6, 0.6); }
        { const m = CYL(0.2, 0.2, 1.7, 9, gm, 1360); m.rotation.z = PI / 2; put(m, FC.x - 2.3, 0.82, FC.z + 2.2, 0.7, 0.5, 0.2); }
        /* Steinlyktene langs stien: fot, stolpe, plate, lyskammer, tak og knapp. De har ikke brent på evigheter. */
        const lantern = sd => { const m = new T.Group(), add = (q, y) => { q.position.y = y; m.add(q); return q; };
          add(BX(0.36, 0.1, 0.36, gm2, sd), 0.05); add(CYL(0.07, 0.09, 0.34, 7, gm, sd + 1), 0.27); add(BX(0.32, 0.07, 0.32, gm2, sd + 2), 0.47); add(BX(0.22, 0.2, 0.22, gm, sd + 3), 0.6);
          add(new T.Mesh(rough(new T.ConeGeometry(0.31, 0.17, 4, 1), 0.02, sd + 4), gm2), 0.78).rotation.y = PI / 4; add(new T.Mesh(new T.SphereGeometry(0.05, 6, 4), gm), 0.9); m.rotation.z = (rnd(sd, 5) - 0.5) * 0.12; return m; };
        S.lan = []; [0.06, 0.36, 0.66, 0.96].forEach((k, i) => { const [x, z] = pathAt(k); for (const sd of [-1, 1]) S.lan.push(put(lantern(1370 + i * 9 + sd), x + sd * 1.05, 0.2, z, rnd(i, 1220 + sd) * 0.6, 0.95, 0.9)); });
        [0.04, 0.24, 0.44, 0.64, 0.86].forEach((k, i) => { const [x, z] = westAt(k); for (const sd of [-1, 1]) { if ((i * 2 + (sd > 0 ? 1 : 0)) % 5 === 3) continue; S.lan.push(put(lantern(1420 + i * 9 + sd), x + sd * 0.62, 0.2, z + sd * 0.74, rnd(i, 1230 + sd), 0.95, 0.9)); } });
        S.lanF = S.lan.slice().sort((p, q) => Math.hypot(p.position.x + 8.6, p.position.z - 23.7) - Math.hypot(q.position.x + 8.6, q.position.z - 23.7))[0];   /* lykta som velter i «Det kommer»: den nærmeste i bildet */
        /* Svidde, døde trær: en knekt stamme og noen få nakne greiner. */
        const tree = (h, sd) => { const m = new T.Group(), s1 = CYL(0.1, 0.17, h * 0.55, 6, wood, sd); s1.position.y = h * 0.275; m.add(s1);
          const tp = new T.Group(); tp.position.y = h * 0.54; tp.rotation.z = (rnd(sd, 1) - 0.5) * 0.6; tp.rotation.x = (rnd(sd, 2) - 0.5) * 0.3; const s2 = CYL(0.035, 0.1, h * 0.5, 6, wood, sd + 1); s2.position.y = h * 0.25; tp.add(s2); m.add(tp);
          for (let j = 0; j < 5; j++) { const bl = h * (0.2 + rnd(j, sd) * 0.26), br = CYL(0.012, 0.045, bl, 5, wood, sd + 2 + j), y = j < 2 ? h * (0.3 + 0.2 * rnd(j, sd + 1)) : h * (0.08 + 0.3 * rnd(j, sd + 1)), a = rnd(j, sd + 2) * TAU, e = 0.6 + rnd(j, sd + 3) * 0.7;
            br.position.set(cos(a) * sin(e) * bl / 2, y + cos(e) * bl / 2, sin(a) * sin(e) * bl / 2); br.rotation.set(sin(a) * e, 0, -cos(a) * e); (j < 2 ? m : tp).add(br); }
          m.rotation.z = (rnd(sd, 1240) - 0.5) * 0.2; return m; };
        [[-6.2, 23.4, 3.2], [3.8, 23.0, 2.6], [-7.6, 14.8, 3.5], [6.4, 12.4, 2.9], [-9.2, 8.6, 3.1], [8.4, 17.8, 3.4], [-4.6, 27.5, 2.8], [10.2, 6.2, 3.0], [5.2, 27.8, 3.3], [-12.5, 22.6, 3.6], [15, -3, 3.2], [9.5, -9, 2.8], [18, 4, 3.4], [-14.6, 27.2, 2.9], [-10.6, 30.4, 3.3], [-16.5, 17, 3.0], [-4.4, 17.2, 2.4]].forEach(([x, z, h], i) => put(tree(h, 1500 + i * 17), x, 0.12, z, rnd(i, 1251) * 6, h, 0.7));
        S.ruin.forEach(r => { r.T = arrive(r.x, r.z); });
        S.tsmk = [[-7.6, 14.8], [6.4, 12.4], [3.8, 23.0]].map(([x, z], k) => { const m = K.pts(14, i => ({ p: [(rnd(i, 1260 + k) - 0.5) * 0.5, 1.2 + rnd(i, 1261) * 1.4, (rnd(i, 1262 + k) - 0.5) * 0.5], v: [0.2, 0.7 + rnd(i, 1263) * 0.6, 0.1], b: rnd(i, 1264) * 4, l: 4, z: 0.6 + rnd(i, 1265) * 0.6 }), { loop: 1, shade: 1, drag: 0.4, sz0: 0.4, sz1: 1.8, px: 60, c: ['#8a7a72', '#4a3e3c', '#1a1414'], a: 0.45, fade: 0.5 }); m.position.set(x, 0, z); S.scene.add(m); return m; });
        /* Skisse 3: gardinet av ildfontener langs kraterkanten (0:35,42) og lava som kastes ut over kanten og faller nedover sidene (Jazz: «se at det kommer og spruter mye lava ned»). */
        S.curt = Array.from({ length: 7 }, (_, k) => { const a = FA0 * TAU + (k - 3) * 0.36, m = K.pts(70, i => { const q = rnd(i, 1300 + k), b = (rnd(i, 1301 + k) - 0.5) * 0.8; return { p: [Math.cos(a + b * 0.3) * 2, 0, Math.sin(a + b * 0.3) * 2], v: [Math.cos(a) * (2 + 8 * q) + (rnd(i, 1302) - 0.5) * 6, 26 + rnd(i, 1303 + k) * 30, Math.sin(a) * (2 + 8 * q) + (rnd(i, 1304) - 0.5) * 6], b: rnd(i, 1305 + k) * 1.6, l: 1.6 + rnd(i, 1306) * 0.8, z: 3.2 + rnd(i, 1307) * 4 }; }, { loop: 1, add: 1, g: 26, px: 150, c: hot, fade: 0.7 });
          m.position.set(VOL.x + Math.cos(a) * 14, VOL.h - 5, VOL.z + Math.sin(a) * 14); S.scene.add(m); return m; });
        S.spill = K.pts(160, i => { const a = FA0 * TAU + (rnd(i, 1310) - 0.5) * 2.6, v = 10 + rnd(i, 1311) * 14; return { p: [Math.cos(a) * 15, 0, Math.sin(a) * 15], v: [Math.cos(a) * v, 8 + rnd(i, 1312) * 14, Math.sin(a) * v], b: rnd(i, 1313) * 3, l: 3, z: 2.2 + rnd(i, 1314) * 3 }; }, { loop: 1, add: 1, g: 22, px: 150, c: hot, fade: 0.85 }); S.spill.position.set(VOL.x, VOL.h - 4, VOL.z); S.scene.add(S.spill);
        /* Lunta: sprut og glør ved fronten i bekkeleiet. */
        S.fuse = K.pts(60, i => { const a = rnd(i, 1011) * TAU, v = 1 + rnd(i, 1012) * 4; return { p: [cos(a) * 1.0, 0.2, sin(a) * 1.0], v: [cos(a) * v, 4 + rnd(i, 1013) * 7, sin(a) * v], b: rnd(i, 1014) * 0.7, l: 0.7, z: 0.8 + rnd(i, 1015) * 1.2 }; }, { loop: 1, add: 1, g: 22, px: 60, floor: -0.2, c: hot, fade: 0.85 }); S.scene.add(S.fuse);
        S.fuseL = K.light(1, '#ffb040'); S.scene.add(S.fuseL);
        /* Ingen lyskuler nær kameraet (§2): sprut og glør som kommer tett på linsa, tones bort. */
        for (const q of [S.fuse, S.spl[1], S.spl[0], S.fspl]) q.material.uniforms.uNear.value = 6;
        /* Veggen av lava (skisse 2): stripen langs fronten, røyk og glør over den, små fontener i sprekkene foran den, og krystaller som går under. */
        { const WX = 97, PRO = S.PRO = [[-5.5, -0.1], [-3.8, 0.9], [-2.2, 1.9], [-1.0, 2.6], [-0.1, 2.95], [0.55, 2.9], [1.0, 2.45], [1.15, 1.7], [1.0, 0.9], [0.7, 0.0]], WM = PRO.length;   /* tverrsnittet: en rullende bølge som henger litt over foran */
          const pos = new Float32Array(WX * WM * 3), q = new Float32Array(WX * WM * 2), idx = []; for (let i = 0; i < WX; i++) for (let j = 0; j < WM; j++) q.set([j / (WM - 1), i / (WX - 1)], (i * WM + j) * 2);
          for (let i = 0; i < WX - 1; i++) for (let j = 0; j < WM - 1; j++) { const p = i * WM + j, p2 = p + WM; idx.push(p, p2, p + 1, p2, p2 + 1, p + 1); }
          const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(pos, 3)); gg.setAttribute('aQ', new T.BufferAttribute(q, 2)); gg.setIndex(idx);
          S.wall = new T.Mesh(gg, K.shader(VS_WALL, FS_WALL, { uHot: K.uv(1) }, { side: T.DoubleSide })); S.wall.frustumCulled = false; S.scene.add(S.wall); S.WX = WX; }
        S.wsmk = [-44, -28, -12, 4, 20, 36, 52].map((x, k) => { const m = K.pts(34, i => ({ p: [(rnd(i, 1020 + k) - 0.5) * 14, 2.2, (rnd(i, 1021 + k) - 0.5) * 1.6], v: [(rnd(i, 1022) - 0.5) * 1.2, 2.5 + rnd(i, 1023) * 2.5, -1.5 - rnd(i, 1024) * 1.2], b: rnd(i, 1025) * 1.6, l: 1.6, z: 3 + rnd(i, 1026) * 4 }), { loop: 1, shade: 1, drag: 0.9, sz0: 0.5, sz1: 2.0, px: 60, c: ['#c06a40', '#4c302c', '#1a1214'], a: 0.55, fade: 0.5 }); S.scene.add(m);
          const e = K.pts(24, i => ({ p: [(rnd(i, 1030 + k) - 0.5) * 14, 2.3, (rnd(i, 1031 + k) - 0.5) * 1.2], v: [(rnd(i, 1032) - 0.5) * 2, 4 + rnd(i, 1033) * 5, 1 + rnd(i, 1034) * 2], b: rnd(i, 1035) * 1, l: 1, z: 0.4 + rnd(i, 1036) * 0.5 }), { loop: 1, add: 1, g: 10, px: 60, c: hot, fade: 0.8 }); S.scene.add(e); return { m, e, x }; });
        S.cfnt = Array.from({ length: 16 }, (_, k) => { let x, z, n = 0; do { x = (rnd(k + n * 17, 1040) - 0.5) * 70; z = mix(zEdge(x) + 4, 2 - abs(x) * 0.05, rnd(k + n * 17, 1041)); n++; } while (n < 20 && (Math.hypot(x, z - 2.8) < 7 || chAt(x, z)[0] < 4));
          const m = K.pts(22, i => { const a = rnd(i, 1042 + k) * TAU, v = 0.6 + rnd(i, 1043) * 1.6; return { p: [cos(a) * 0.3, 0.1, sin(a) * 0.3], v: [cos(a) * v, 6 + rnd(i, 1044) * 6, sin(a) * v], b: rnd(i, 1045) * 0.25, l: 1.2, z: 0.45 + rnd(i, 1046) * 0.55 }; }, { t0: -1e5, add: 1, g: 24, px: 60, floor: -0.2, c: hot, fade: 0.85 });
          m.position.set(x, 0.2, z); S.scene.add(m); return { m, t: arrive(x, z) - 1.1 }; });
        const CRY2 = [[4, -18, 3.6, 1100], [-7, -22, 4.2, 1120], [19, -11, 3.0, 1140], [-12, -6, 2.8, 1160], [25, -3, 3.4, 1180]];
        S.cry2 = CRY2.map(([x, z, s, sd]) => { const mat = K.cryMat({ a: '#8a1838', b: '#ff86a0' }), grp2 = new T.Group();
          for (let i = 0; i < 4; i++) { const m = K.spike(s * (0.6 + rnd(i, sd) * 0.8), s * (0.13 + rnd(i, sd + 1) * 0.07), sd + i, { crystal: 1, n: 6, mat }); m.position.set((rnd(i, sd + 2) - 0.5) * s * 0.7, 0.2, (rnd(i, sd + 3) - 0.5) * s * 0.7); m.rotation.set((rnd(i, sd + 4) - 0.5) * 0.9, rnd(i, sd + 5) * 6, (rnd(i, sd + 6) - 0.5) * 0.9); grp2.add(m); }
          grp2.position.set(x, 0, z); S.scene.add(grp2);
          const sh = K.shards(14, i => { const a = rnd(i, sd + 20) * TAU; return { p: [x + cos(a) * s * 0.3, s * (0.3 + rnd(i, sd + 21) * 0.5), z + sin(a) * s * 0.3], v: [cos(a) * (2 + rnd(i, sd + 22) * 4), 3 + rnd(i, sd + 23) * 5, sin(a) * (2 + rnd(i, sd + 22) * 4) + 2], r: [(rnd(i, sd + 24) - 0.5) * 12, (rnd(i, sd + 25) - 0.5) * 12, 0], s: rnd(i, sd + 26), b: rnd(i, sd + 27) * 0.3, l: 1.6, z: 0.15 + rnd(i, sd + 28) * 0.25 }; }, { c: '#ff86a0', grey: 0, em: 0.6 }); S.scene.add(sh);
          return { grp: grp2, mat, sh, s, t: arrive(x, z) }; });
        S.cryC = S.cry.map(m => [m.uniforms.uA.value.clone(), m.uniforms.uB.value.clone()]);
        return S;
      },
      act(S, t, o) {
        const g = S.gr, U = K.U(), L = S.lava.material.uniforms, out = o.out || 0, pre = t < Q.CLX;
        /* Flyturen ser langt; tynnere dis også mens vulkanen er tett på. Kraterbunnen er tørr til flommen, så det lyser ikke nedenfra før lavaen er der. */
        if (t < 20.2) { const k = seg(t, 17.6, 20.2); U.uFog.value.set(mix(220, 60, k), mix(1300, 300, k), 0.68 + 0.12 * k); } else if (t >= Q.OV && t < Q.S5) U.uFog.value.set(140, 1100, 0.55);
        else if (t >= Q.UB - 0.03 && t < Q.S3) U.uFog.value.set(7, 64, 0.78);   /* under broa: disen ligger mellom buen og ham, så han står langt borte og er enorm */
        else if (t >= Q.S3 && t < Q.OV) U.uFog.value.set(120, 900, 0.5);   /* Skisse 4: «Det kommer» med tynnere dis (skissen: fjellfoten ble en flat, beige flate) */
        U.uLavaY.value = t < 16.4 ? 0 : t < Q.S5 ? -6 * io(seg(t, 16.4, 18.6)) : mix(-6, 0, c01((t - Q.S5) / 8));
        S.floorM.uniforms.uCk.value = t < 12.5 ? 0 : 0.36 * c01((t - 12.5) / 3) * (t < Q.S5 + 4 ? 1 : 0);   /* glødende sprekker i kraterbunnen: de tegner stedet sett ovenfra, og er hintet av lava før flommen */   /* skisse 3: glødende sprekker (hint av lava) så snart vi er i krateret */
        /* 1 Statuen: helt stiv og grå til klimakset. Bakken rister på bass-slagene, når broa raser, og mer og mer i oppladningen. */
        const jolt = pre ? 0.6 * hit(t, Q.UB, 0.3) + 0.6 * hit(t, Q.R2, 0.3) + 0.4 * hit(t, Q.BRO, 0.3) + 0.4 * hit(t, Q.HIT, 0.4) : 0, ry = HOME[1] - (pre ? 0 : 0.3 * sq(t, Q.CLX, 12, 5));
        g.root.position.set(HOME[0] + 0.02 * sin(t * 61) * jolt, ry, HOME[2]);
        g.add(STAT, pre ? 1 : 1 - 0.8 * eo(seg(t, Q.CLX, Q.CLX + 0.3)));
        const live = pre ? 0 : io(seg(t, Q.CLX + 0.4, Q.CLX + 2)), br = 0.024 * sin(t * 2.7) * live; g.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0] }, 1);
        for (let i = 1; i <= 5; i++) g.rot('Tail' + i, 0, 0, live * 0.045 * sin(t * 2.1 + i * 0.55));
        /* Mens han venter på Continue, lever han som i kampen: ser seg sakte om, og kjeven følger pusten. */
        { const lv = io(seg(t, Q.NAME + 1.2, Q.NAME + 3.2)); g.add({ Neck1: [0, 0.03 * sin(t * 0.9 + 1), 0.06 * sin(t * 0.55)], Head: [0, 0.02 * sin(t * 1.3), 0.03 * sin(t * 0.55 + 0.6)], Jaw: [0, -0.06 - 0.04 * sin(t * 2.4), 0], '*Arm': [0.03 * sin(t * 2.4 + 0.5), 0, 0] }, lv); }
        /* 2 Brølet: lyden starter inne i steinen (GRL), og på klimakset bryter kjeven løs og alt knuses. Han brøler lenger før navnet enn i skisse 1, og kjeften lukkes idet
           navnet kommer (regelen: brølet er over når navnet står der). */
        const rw = t < Q.ROAR ? 0 : back(seg(t, Q.ROAR, Q.ROAR + 0.36), 2.4) * (1 - io(seg(t, Q.NAME + 0.3, Q.NAME + 1.0)));   /* skisse 3: brølet 0,1 s etter slaget */
        S.mouth = null; g.add(ROAR, rw); g.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); g.rot('Head', 0, 0, 0.022 * sin(t * 43) * rw); S.rw = rw;
        /* Øyet: lukket stein til EYE, så åpent, smalt fra rett før klimakset; blunker mens han venter. */
        const E = g.mats.Eye1.uniforms, nar = (t >= Q.CLX - 0.35 && t < Q.CLX + 3.4), eye = t < Q.EYE ? [0, 0.5] : t < Q.EYE + 0.07 || (t > Q.CLX + 4 && (t - Q.CLX) % 4.4 < 0.12) || nar ? [0, 0.75] : [0, 0];
        E.uUvOff.value.set(eye[0], eye[1]); E.uEmis.value = t < Q.EYE ? 0 : 0.6 + 0.6 * hit(t, Q.EYE, 0.8); E.uStone.value = t < Q.EYE ? 1 : 0;
        /* Lyset i steinen (skisse 2): synes med en gang lavaen treffer (HIT), et dempet trinn på slagene, blaff når øyet åpner seg, så oppladningen: gløden pulser fortere og
           fortere, sprekkene dekker hele kroppen og stråler ut, steinen drysser, bakken rister og lavaen koker rundt ham. */
        const step = L2 => { let v = 0; for (let i = 0; i < L2.length; i++) { const [t0, h] = L2[i]; if (t < t0) break; const prev = i ? L2[i - 1][1] : 0; v = mix(prev, h, eo(seg(t, t0, t0 + 0.55))); } return v; };
        /* Skisse 4, lyset etter regelen 21.11 (RAIDS3D.md, «Groudon, ny intro»): tynne sprekker i 3D (uK3 i motoren), en stram glød i to harde trinn, hvitglødende front med
           klumper som flyter oppover. Fronten er en kule fra 6 enheter under hælen som vokser 0,626 enheter i sekundet fra 63,62 (når hodet rundt 1:16–1:18 og resten
           før øynene). Styrken G stiger jevnt helt til lyden stopper (84,12): ingen trinn, ingen puls, ingen holdt pust. D = det mørke rommet rundt ham. */
        /* Fronten: en kule fra 7 enheter under hælen (da står lyset i lavalinja på slaget) som vokser 0,51 enheter i sekundet og når toppen av hodet på løftet (1:17,7).
           Halen har sitt eget utgangspunkt (uK3o) like langt bak halespissen: veggen når hælene og halen samtidig, og de to frontene klatrer mot kroppen. */
        const chg = seg(t, Q.EYE, Q.CLX), R3 = t < Q.HIT ? 0 : 7 + 0.511 * (t - Q.HIT);
        const G = t < Q.HIT ? 0 : pre ? 0.28 + 0.72 * io(seg(t, Q.HIT, 84.12)) : 1 - seg(t, Q.CLX, Q.CLX + 0.18);
        const heat = t < Q.HIT ? 0 : pre ? G : 0;
        S.heat = heat; S.chg = pre ? chg : 0; S.pul = 0; S.G = G; S.D = pre ? io(seg(t, Q.HIT, 79.5)) : 0;
        g.set('uStone', pre ? 1 : 0.3 * (1 - eo(seg(t, Q.CLX, Q.CLX + 0.3))));   /* fri = egen farge med én gang (§2) */
        g.set('uCrack', 0); g.set('uVor', 0); g.set('uSpill', 0); g.set('uCrackO', [2.87, -6, -1.3]);
        E.uStone.value = t < Q.EYE ? 1 : 0; E.uEmis.value = t < Q.EYE ? 0 : 0.75 + 0.5 * hit(t, Q.EYE, 0.8);   /* øyet er det første som får farge: gult og levende i den grå steinen */
        g.set('uK3', [t < Q.CLX + 0.18 ? 1 : 0, 1.2, pre ? R3 : 60, 0.55]); g.set('uK3g', [G, 1.15 + 0.35 * G, 2.0 + 0.5 * G, 0.6]); g.set('uK3e', [0.9, 6.15, 4.7, 1.05]); g.set('uK3o', [0, 1.0, -14.4, 0]);
        /* Statuen har stått her i evigheter: aske på alt som vender opp, og sprekkene er der hele tiden som mørke hårstrek. Det er dem lyset fyller. */
        g.set('uK3h', pre ? 0.72 : 0); g.set('uAsh', pre ? 0.85 : 0);
        const hk = c01(0.3 + 0.7 * G), cu = g.mats; for (const m in cu) if (cu[m].uniforms.uCrackC) col3(cu[m].uniforms.uCrackC, hk, '#ffb21c', '#ffd630', '#fff2a6');
        g.set('uSeam', 0.21);
        const wet = t < Q.HIT ? 0 : c01((t - Q.HIT) / 1.5); g.set('uWk', 0.7 * wet); g.set('uGl', mix(0.15, 0.5, wet) * (1 - 0.6 * S.D));
        /* Lyset på stedet: dempet til forgrunnen er en silhuett mot vulkanen i bilde 4; mørkner litt mens lyset i steinen stiger; varmt når han er fri. */
        const dim = pre ? heat : 0, PL = S.pl = palAt(t);
        for (const [u, k] of [[U.uKeyC, 'key'], [U.uShC, 'sh'], [U.uFogC, 'fog'], [U.uRimC, 'rim']]) u.value.setRGB(...hex(PL[k])); S.sky = { g: PL.sky, cl: PL.cl, hot: PL.hot };
        U.uRimK.value = pre ? 0.7 : 1;
        const X0 = g.root.position, hot = pre ? 0.3 + 0.3 * heat : mix(0.7, 1, seg(t, Q.CLX, Q.CLX + 0.5)); S.wake = hot;
        L.uHeat.value = 0.9 + 0.3 * (pre ? 0 : 1) + 0.25 * hit(t, Q.CLX, 1.2) + 0.1 * out + 0.2 * chg - 0.3 * S.D; L.uBri.value = 0.95 * (1 - 0.66 * S.D);
        /* Før flommen er lavaen i bekken og pyttene gammel og stivnet (uCool): mørk skorpe med glød i sprekkene. Den smelter opp når lunta kommer. */
        L.uCool.value = 1 - io(seg(t, Q.S5 + 1.2, Q.S5 + 4.5));
        if (t < Q.BRO) { const k = io(seg(t, Q.S5 + 2, Q.BRO)); L.uHeat.value = mix(0.8, L.uHeat.value, k); L.uBri.value = mix(0.7, 0.95, k); }
        /* Krystallene er matte under asken, lyser opp når lavaen når dem, og dempes med alt annet i det mørke rommet. */
        for (const m of S.cry) m.uniforms.uPulse.value = pre ? mix(0.1, 0.5, io(seg(t, Q.WALL, Q.HIT))) * (1 - 0.7 * S.D) : 0.5;
        /* Gløden nedenfra finnes ikke før lavaen er der: i askeakten er det bare et svakt skjær fra sprekkene i bakken. */
        const lavaIn = io(seg(t, Q.S5 + 1.5, Q.HIT)); S.lavaIn = lavaIn;
        U.uGlow.value = (0.7 + 0.4 * hot + 0.3 * rw + 0.3 * chg) * (1 - 0.55 * S.D) * (pre ? mix(0.2, 1, lavaIn) : 1);
        if (t < Q.S5 + 1.2) L.uBri.value = 0.5;
        S.cry.forEach((m, i) => { const k = pre ? mix(0.34, 1, io(seg(t, Q.WALL, Q.HIT))) * (1 - 0.45 * S.D) : 1; m.uniforms.uA.value.copy(S.cryC[i][0]).multiplyScalar(k); m.uniforms.uB.value.copy(S.cryC[i][1]).multiplyScalar(k); });
        const ring = (i, x, z, t0, v, d, a) => L.uRing.value[i].set(x, z, 1.5 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0), rb = last([Q.EYE, Q.EYE + 0.5, Q.CH, Q.CH + 0.35, Q.CH + 0.62, Q.GRL, Q.GRL + 0.18], t);
        ring(0, X0.x, X0.z, Q.HIT, 6, 2, 0.8); ring(1, X0.x, X0.z, Q.CLX, 22, 1.6, 1); ring(2, BR.x, BR.z, Q.BRO + 0.3, 14, 1.5, 1); ring(3, X0.x, X0.z, rb, 10, 0.5, pre ? 0.8 : 0);
        L.uWade.value.set(X0.x, X0.z + 0.3, 9.5, wet * (0.6 + 0.3 * hot + 0.5 * hit(t, Q.CLX, 1.2) + 0.4 * chg));
        const ch = g.at('Spine2'); S.aura.position.set(ch.x, ch.y + 0.4, ch.z - 0.6); K.face(S.aura); S.aura.scale.setScalar(13 + 7 * heat + 5 * chg + 6 * hit(t, Q.EYE, 0.5)); S.aura.material.uniforms.uA.value = pre ? 0.2 * heat * heat + 0.3 * hit(t, Q.EYE, 0.6) : 0.6 * hit(t, Q.CLX, 0.35); S.aura.visible = t >= Q.HIT && t < Q.CLX + 0.4;
        S.shell.at(t, Q.CLX, { g: 21 }); S.puff.material.uniforms.uT0.value = Q.CLX; S.crumb.at(t, Q.EYE, { g: 18 });
        const hd = g.at('Head'); S.fx(S.hpuff, Q.EYE, hd.x, hd.y, hd.z + 0.6);
        S.boil.position.set(X0.x, 0, X0.z + 0.6); S.boil.visible = chg > 0 && pre; S.boil.material.uniforms.uA.value = 0.3 + 0.7 * chg;
        S.fx(S.dust[0], Q.CLX, X0.x, 0.2, X0.z + 1); S.fx(S.spl[0], Q.CLX, X0.x, 0, X0.z + 0.6);
        S.drip.position.set(X0.x, ry, X0.z); S.drip.visible = t > Q.CLX + 0.2 && t < Q.CLX + 3.2; S.drip.material.uniforms.uPx.value = 120 * (1 - seg(t, Q.CLX + 1.6, Q.CLX + 3.2));
        S.ring.visible = t >= Q.CLX && t < Q.CLX + 1; if (S.ring.visible) { S.ring.position.set(X0.x, 0.6, X0.z + 1); S.ring.scale.setScalar(3 + (t - Q.CLX) * 42); S.ring.material.uniforms.uA.value = hit(t, Q.CLX, 1); }
        /* Skisse 3: helligdommen og trærne rister mens det kommer (bass-slagene), en lykt velter på 32,6, og alt tipper og synker der lavaen kommer. */
        { const qk = t >= Q.S3 - 0.5 && t < Q.OV + 1.2 ? 0.05 * (hit(t, 29.78, 0.5) + hit(t, 32.6, 0.5) + hit(t, 34.54, 0.5) + hit(t, Q.OV, 0.8)) + 0.015 * seg(t, Q.S3, Q.OV) : 0;
          S.ruin.forEach((r, i) => { const a = t - r.T; r.m.position.y = r.y0 - r.h * 1.15 * (a > 0 ? io(seg(a, 0.05, 2.4)) : 0) + qk * sin(t * 53 + i * 7) * 0.5; r.m.rotation.x = r.tilt * io(seg(a, -0.2, 1.1)) + qk * sin(t * 41 + i * 3) * 0.6; r.m.visible = a < 2.6; });
          if (S.lanF) S.lanF.rotation.z = 1.4 * back(seg(t, 32.6, 33.3), 1.2);
          S.tsmk.forEach(m => { m.visible = t > 17 && t < Q.HIT; }); }
        /* Glør og bobler bare når det er lava. */
        S.embers.material.uniforms.uA.value = (t < 17.4 ? 0.6 : t < Q.S5 ? 0.2 : mix(0.2, 1, c01((t - Q.S5) / 20))) * (1 - 0.7 * S.D); S.pop.visible = t > Q.HIT + 2;
        /* Støvet rundt ham lyser opp av lyset fra sprekkene (det mørke rommet: «støv og aske så kan man se lysstrålene»). */
        S.beam.visible = pre && t > Q.HIT; S.beam.material.uniforms.uA.value = 0.6 * (0.2 + 0.8 * S.D);
        S.mote.visible = pre && t > Q.HIT; S.mote.material.uniforms.uA.value = 0.95 * G * (0.35 + 0.65 * S.D); S.mote.position.set(HOME[0], 0, HOME[2]);
        /* Steinene som raser fra klippene på bass-slagene, og støv der de lander. */
        S.rocks.forEach((r, i) => { const a = t - r.t0, c0 = cos(r.a), s0 = sin(r.a), y0 = 10.5 + rnd(i, 620) * 3; if (a < 0) { r.m.visible = false; return; } r.m.visible = true; const tl = Math.sqrt(2 * (y0 - 0.6) / 24), q = min(a, tl), rr = 84 - 13 * q, y = a < tl ? y0 + 2 * q - 12 * q * q : 0.6 - (t > Q.S5 ? 2 * c01((t - arrive(c0 * rr, s0 * rr)) / 2) : 0);
          r.m.position.set(c0 * rr, y, s0 * rr); r.m.rotation.set(q * 4 + i, q * 2.5, q * 3); });
        S.rocks.forEach((r, k) => S.fx(S.rdust[k], r.t0 + 0.95, cos(r.a) * 71.5, 0.3, sin(r.a) * 71.5)); S.fx(S.dust[2], Q.BRO, BR.x, 0.3, BR.z);
        /* Broa: støv og småstein drysser av buen på slagene (under broa og i skalaen); den raser på BRO (midten først), og landkarene synker når lavaen sveller over. */
        S.bdust.material.uniforms.uT0.value = last([Q.UB, 23.07, 24.04, Q.R2, 26.97, 29.78, 32.6, 34.54], t); S.peb.material.uniforms.uT0.value = last([Q.UB, Q.R2, 29.78], t);
        for (const q of S.bparts) { const d = Q.BRO + (q.keep ? 3.2 + rnd(q.i, 640) : 0.05 * abs(q.p[0]) + rnd(q.i, 641) * 0.15), a = t - d; if (a <= 0) { q.m.position.set(q.p[0], q.p[1], q.p[2]); q.m.rotation.set(0, 0, q.r); q.m.visible = true; continue; }
          if (q.keep) { q.m.position.set(q.p[0], q.p[1] - 0.5 * a, q.p[2]); q.m.rotation.set(0.05 * a, 0, q.r + 0.04 * a * Math.sign(q.p[0])); q.m.visible = q.m.position.y > -3; continue; }
          q.m.position.set(q.p[0] * (1 + 0.05 * a), q.p[1] + 1.5 * a - 2.6 * a * a, q.p[2] + 2.4 * a); q.m.rotation.set((rnd(q.i, 642) - 0.5) * 3 * a, (rnd(q.i, 643) - 0.5) * 2 * a, q.r + (rnd(q.i, 644) - 0.5) * 4 * a); q.m.visible = q.m.position.y > -3; }
        S.fx(S.spl[1], Q.BRO + 0.35, BR.x, 0, BR.z + 0.5);
        /* Lunta i bekkeleiet: sprut ved fronten fra den kommer inn i krateret til den tar broa. */
        { const s = (t - TCH0) * VCH, on = s > 60 && s < SB + 4; S.fuse.visible = S.fuseL.visible = on; if (on) { const p = chPt(s); S.fuse.position.set(p[0], 0, p[1]); S.fuseL.position.set(p[0], 1.2, p[1]); K.face(S.fuseL); S.fuseL.scale.setScalar(9); S.fuseL.material.uniforms.uA.value = 0.55; } }
        /* Vulkanen: ryker og er urolig; krateret flyter over på OV i mange smale elver (uFlow), fontener av lava på de sterke slagene, glør ved elvenes fronter, og sprut der
           elvene treffer steinene. Den store eksplosjonen er spart til Primal. */
        const bt = hit(t, 29.78, 1.2) + hit(t, 32.6, 1.2) + hit(t, 34.54, 1), er = (t < Q.OV ? 0.22 + 0.1 * c01((t - 18.5) / 8) + 0.26 * seg(t, Q.S3, Q.OV) + 0.12 * bt : mix(0.5, 0.62, io(seg(t, Q.OV, Q.OV + 9)))) + 0.35 * hit(t, Q.OV, 2) + 0.2 * hit(t, Q.LY, 1.5) + 0.36 * hit(t, Q.CLX, 3);
        /* Fjellet har tømt seg når flommen er ute (fo): fontenene dør hen, og etter knuset ryker det og renner som i kampen. Det store utbruddet er Primal sitt. */
        const fo = 1 - io(seg(t, 61, 71));
        volcAct(S, t, er, -1); S.vspat.material.uniforms.uPx.value = 300 * (0.6 + 0.6 * min(1.4, er));
        S.vol.material.uniforms.uFlow.value = flowAt(t);
        S.fnt.forEach((m, k) => { const b = last(FB.filter((_, i) => i % 3 === k), t); m.material.uniforms.uT0.value = b; m.visible = b > 0 && t - b < 4.2; });
        { const fb = last(FB, t), kick = t > Q.OV ? hit(t, fb, 1.6) : 0; S.jet.visible = t > Q.OV - 0.1; S.jet.material.uniforms.uA.value = (0.13 + 0.2 * kick) * c01((t - Q.OV) / 0.8) * (t < Q.S5 + 8 ? 1 : 0.6) * fo; S.jet.visible = S.jet.visible && fo > 0.01; }
        S.fntC.visible = t > Q.OV && fo > 0.01; S.fntC.material.uniforms.uA.value = 0.7 * c01((t - Q.OV) / 1.5) * fo;
        S.heads.forEach((m, i) => { const pr = rivPr(i, t), on = pr > 0.01 && pr < 0.995, lb = S.lobes[i]; m.visible = lb.visible = on; if (on) { const v = 1 - pr * 1.02, p = volPt(rivAu(i, v), v, 0.5), q = volPt(rivAu(i, v + 0.012), v + 0.012, 0.5); m.position.set(p[0], p[1] + 0.4, p[2]); lb.position.set(p[0], p[1], p[2]); lb.lookAt(q[0], q[1], q[2]); } });
        S.vrk.forEach(r => { r.sp.visible = t > r.t; r.sp.material.uniforms.uA.value = c01((t - r.t) / 0.6); });
        S.plume.material.uniforms.uA.value = t < 18.5 ? 0.8 : 0.35 + 0.3 * seg(t, Q.S3, Q.OV) + 0.2 * bt; S.pool.material.uniforms.uHeat.value = 1.35 + 0.7 * seg(t, Q.S3, Q.OV) + 0.3 * bt;
        S.curt.forEach(m => { m.visible = t > Q.OV && fo > 0.01; m.material.uniforms.uT0.value = Q.OV; m.material.uniforms.uA.value = fo; }); S.spill.visible = t > Q.OV + 0.2 && fo > 0.01; S.spill.material.uniforms.uT0.value = Q.OV + 0.2; S.spill.material.uniforms.uA.value = fo;
        /* Lavafallet: fronten faller ned veggen fra FALL, så renner det hele tiden; sprut, damp og glød ved foten. */
        S.fall.visible = t > Q.FALL && t < 68.6; S.fallM.uniforms.uFall.value = io(seg(t, Q.FALL, Q.FALL + 1.05)) * 1.02; S.fallM.uniforms.uEnd.value = ei(seg(t, 64.6, 68.4)) * 1.05;
        const fon = t > TF1 - 0.05 && t < 69.2; S.fspl.visible = fon; S.fsmk.visible = fon && t < 68; S.fglow.visible = t > Q.FALL && t < 69.5; K.face(S.fglow); S.fglow.scale.setScalar(26 + 6 * sin(t * 3)); S.fglow.material.uniforms.uA.value = 0.5 * seg(t, Q.FALL, TF1 + 0.4) * (1 - seg(t, 66, 69.4));
        /* Veggen av lava: stripen følger fronten (wallZ), høyest midt i krateret, lavere ved veggene, og den flater ut idet den har nådd hælene hans. */
        { const P = S.wall.geometry.attributes.position, A = P.array, PRO = S.PRO, WM = PRO.length; let any = 0;
          for (let i = 0; i < S.WX; i++) { const x = -72 + 144 * i / (S.WX - 1), zf = wallZ(x, t), ze = zEdge(x), out2 = zf - ze;
            const h = 4.2 * c01((68 - abs(x)) / 12) * c01(out2 / 2.5) * (1 - smooth(0.0, 5.5, zf)) * (0.82 + 0.36 * fbm2(x * 0.08, t * 0.3)); if (h > 0.02) any = 1;   /* en vegg på halve høyden hans */
            for (let j = 0; j < WM; j++) { const k = (i * WM + j) * 3; A[k] = x; A[k + 1] = h > 0.02 ? PRO[j][1] * h / 2.95 : -4; A[k + 2] = zf + PRO[j][0] * (0.55 + 0.45 * h / 4.2); } }
          P.needsUpdate = true; S.wall.visible = t > TSH0 && any > 0; S.wall.material.uniforms.uHot.value = 1 + 0.12 * sin(t * 5); }
        S.wsmk.forEach(w => { const zf = wallZ(w.x, t), on = t > TSH0 + 0.4 && zf - zEdge(w.x) > 2 && zf < 4; w.m.visible = w.e.visible = on; if (on) { w.m.position.set(w.x, 1.6, zf); w.e.position.set(w.x, 1.6, zf); } });
        S.cfnt.forEach(c => { c.m.material.uniforms.uT0.value = c.t; c.m.visible = t > c.t && t < c.t + 1.6; });
        S.cry2.forEach(c => { const a = t - c.t; c.grp.visible = a < 2.6; c.grp.rotation.x = 0.75 * io(seg(a, -0.25, 0.9)); c.grp.position.y = -c.s * 1.2 * io(seg(a, 0.1, 2.4)); c.mat.uniforms.uPulse.value = 0.1 + 1.5 * c01(a / 0.4) * (1 - seg(a, 1.2, 2.5)); const ck = mix(0.34, 1, c01((a + 2.5) / 2.5)); c.mat.uniforms.uA.value.setRGB(...hex('#8a1838')).multiplyScalar(ck); c.mat.uniforms.uB.value.setRGB(...hex('#ff86a0')).multiplyScalar(ck); c.sh.at(t, c.t + 0.15, { g: 20 }); });
        S.lit = pre ? PL.lit : 0.55 + 0.45 * hot; S.sun = pre ? 0 : 0.38 * seg(t, Q.CLX + 0.6, Q.CLX + 3.4);
      },
      shots: [
        /* 1 FLYTUREN (0:01–0:21,3; låst: «At den flyr over vulkanen er tøft»): ut av svart høyt over askelandet, mot fjellet, over kraterkanten når takten kommer inn
           (0:12,86), ned den andre siden og i en bue rundt ham som bremser og stopper lavt foran det bøyde hodet. Kameraet krenger i svingene. */
        [0, (S, u, a, t) => { K.far(1600); const [P, M, fv] = flyAt(t); K.cam(P[0], P[1], P[2], M[0], M[1], M[2], fv, bankAt(t));
          S.post.fade = 1 - seg(t, Q.B0, Q.B0 + 1.4); S.post.sh = 0.8 * hit(t, Q.TK, 0.6); S.post.vig = 0.62; dbg(); }],
        /* 2 UNDER DEN LILLE BROA (0:21,56, bass-slaget): lavt i bekkeleiet like sør for buen. Gjennom buen: stien, toriien og han, grå og enorm bak alt som er i
           menneskestørrelse. Støv drysser fra buen på slagene, og kameraet siger sakte inn. */
        [Q.UB - 0.03, (S, u, a, t) => { const e = io(u); K.cam(-2.5, 0.22, mix(25.4, 24.9, e), mix(-0.3, -0.1, e), mix(3.75, 3.95, e), 2.8, mix(44, 46, e), 0.012);
          S.post.sh = 2.4 * hit(t, Q.UB, 0.7) + 2.4 * hit(t, Q.R2, 0.7) + 0.6 * (hit(t, 23.07, 0.4) + hit(t, 24.04, 0.4)); S.post.vig = 0.7; dbg(); }],
        /* 3 DET KOMMER (0:26,96–0:35,4): fra stien vest for broa, mellom steinlyktene, mot fjellet. Gløden stiger i krateret, røyken pulserer, bakken rister på
           slagene, og en lykt velter (0:32,6). Kameraet zoomer sakte inn. */
        [Q.S3, (S, u, a, t) => { K.far(1200); const e = io(u); K.cam(mix(-7.2, -7.0, e), 0.7, mix(26.4, 26.0, e), -40, mix(58, 70, e), -330, mix(36, 27, e));
          S.post.sh = 0.4 * seg(t, Q.S3, Q.OV) + 1.5 * (hit(t, 29.78, 0.5) + hit(t, 32.6, 0.5) + hit(t, 34.54, 0.5)); S.post.vig = 0.6; dbg(); }],
        /* 4 ILDFONTENENE (0:35,42–0:49,5): fjellet tett på med lang linse. Gardinet av ildfontener sprekker opp på slaget, lava spruter ned sidene og elvene raser,
           lyn i askeskyen (0:39,64), og så sakte ut til han står som en svart silhuett foran fjellet (0:46,7; «Tøft med vulkanen»). */
        [Q.OV, (S, u, a, t) => { K.far(1400); const z = io(seg(t, 40.4, 48.6)), fov = 15 * Math.pow(50 / 15, z), M = [mix(-40, -1.0, z), mix(150, 9, z * z * 0.4 + z * 0.6), mix(-330, -20, z)];
          K.cam(mix(11, 1.45, z), mix(1.8, 0.9, z), mix(24, 16.0, z), M[0], M[1], M[2], fov, -0.03 * z); S.post.sh = 1.6 * hit(t, Q.OV, 1.0) + 1.2 * hit(t, Q.LY, 0.6) + 1.0 * hit(t, 40.75, 0.5); S.post.fl = 0.25 * hit(t, Q.OV, 0.15); S.post.flc = '#ffd890'; dbg(); }],
        /* 5 FLOMMEN, kilden først (Jazz 20.11: «det føles ut som det kommer fra ingen plass»): dronen følger fronten på den midterste elva ned fjellsiden mot
           krateret hans (0:49,52), og så et nærbilde der fronten velter forbi (0:53,77). */
        [Q.S5, (S, u, a, t) => { K.far(1100); const P = rivFront(5, t), dx = P[0] - VOL.x, dz = P[2] - VOL.z, dl = Math.hypot(dx, dz), fx = dx / dl, fz = dz / dl, k = io(seg(t, Q.S5, 53.77));
          K.cam(P[0] - fx * mix(26, 15, k) - fz * 7, P[1] + mix(19, 9, k), P[2] - fz * mix(26, 15, k) + fx * 7, P[0] + fx * 40, P[1] - mix(8, 6, k), P[2] + fz * 40, 52, 0.05 * sin(t * 0.7));
          S.post.sh = 0.5 * hit(t, Q.S5, 0.6) + 0.9 * hit(t, Q.FALL, 0.5) + 0.25; dbg(); }],
        [53.77, (S, u, a, t) => { const P0 = rivFront(5, Q.WALL + 0.2), P = rivFront(5, t), dx = P0[0] - VOL.x, dz = P0[2] - VOL.z, dl = Math.hypot(dx, dz), fx = dx / dl, fz = dz / dl;
          K.cam(P0[0] + fx * 9 + fz * 4.5, P0[1] + 2.2, P0[2] + fz * 9 - fx * 4.5, P[0], P[1] + 0.6, P[2], 46); S.post.sh = 0.6 * hit(t, 53.77, 0.5) + 0.35; dbg(); }],
        /* Det vide bildet (0:55,16): høyt over krateret. Lavafallet står over den høye veggen til venstre, lunta raser ned bekkeleiet, og veggen av lava kommer ut
           under fjellets skjørt bak ham. */
        [Q.WALL - 0.03, (S, u, a, t) => { const e = io(seg(t, Q.WALL, 57.4)); K.cam(mix(15, 11, e), mix(11, 8.5, e), mix(46, 41, e), mix(-16, -11, e), mix(2, 1.5, e), mix(-10, -6, e), 52); S.post.sh = 1.4 * hit(t, Q.WALL, 0.8) + 0.3; dbg(); }],
        /* Broa (0:57,3): samme sted som bilde 2, lavt i bekken. Lunta kommer mot oss gjennom buen og knuser den på slaget (0:57,98); steinene kastes mot kameraet. */
        [57.3, (S, u, a, t) => { const e = seg(t, 57.3, 59.0); K.cam(-2.6, mix(0.3, 0.7, e), mix(25.2, 26.4, e), -2.3, mix(1.4, 1.7, e), 16, 46, -0.02); S.post.sh = 0.5 + 3.4 * hit(t, Q.BRO, 0.9); S.post.fl = 0.3 * hit(t, Q.BRO, 0.12); S.post.flc = '#ffd890'; dbg(); }],
        /* Krystallene (0:59,0): lavt foran veggen av lava der den ruller over sletta. Krystallene i veien velter, lyser opp og går under. */
        [59.0, (S, u, a, t) => { const zf = wallZ(16.5, t), e = seg(t, 59.0, Q.S6); K.cam(16.2, mix(0.7, 0.95, e), zf + mix(7.6, 6.2, e), 16.9, mix(2.4, 2.0, e), zf - 3, 58, 0.03); S.post.sh = 1.0 + 0.8 * e; dbg(); }],
        /* 6 VEGGEN MOT HÆLENE (1:00,8–1:03,6): lavt foran veggen ved hans venstre side; den slår inn i hælene og halen på 1:03,62, der låta går ned et hakk. */
        [Q.S6, (S, u, a, t) => { const zf = wallZ(3, t), k = seg(t, Q.S6, Q.HIT); K.cam(mix(11, 9.5, k), mix(1.2, 0.9, k), min(zf + 9, 4.0), mix(2, 2.6, k), mix(1.2, 0.9, k), mix(zf - 6, 0.6, io(k)), 50); S.post.sh = 0.6 + 1.2 * k; dbg(); }],
        /* 7 LYSET, del 1 (1:03,62–1:12,08): bak ham, lavt ved hælen der lavaen traff. Lyset tennes i lavalinja og klatrer jevnt opp beinet, halen og ryggen. */
        [Q.HIT, (S, u, a, t) => { const e = io(u); K.cam(mix(6.6, 5.4, e), mix(0.7, 3.8, e), mix(-3.2, -5.4, e), mix(2.6, 0.6, e), mix(0.9, 4.2, e), mix(1.0, 0.2, e), 48); S.post.sh = 1.4 * hit(t, Q.HIT, 0.5); dbg(); }],
        /* 8 LYSET, del 2 (1:12,08–1:21,0): vidt bakfra i det mørke rommet, så hele ryggen står og gløder; fra løftet (1:17,72) går kameraet rundt og opp over
           skulderen mens lyset når toppen av hodet. */
        [Q.QUIET, (S, u, a, t) => { const P = crs([[Q.QUIET, [9.5, 3.0, -9.5]], [Q.LIFT, [11, 3.6, -5.5]], [79.8, [10.4, 5.2, 3.2]], [81.0, [9.6, 5.6, 6.4]], [82, [9, 5.8, 8]]], t), M = crs([[Q.QUIET, [0, 4.0, 0.8]], [Q.LIFT, [0, 4.4, 1.4]], [79.8, [0.3, 4.9, 4.2]], [81.0, [0.4, 5.0, 5.4]], [82, [0.4, 5, 5.6]]], t);
          K.cam(P[0], P[1], P[2], M[0], M[1], M[2], 46); S.post.vig = 0.6 + 0.2 * seg(t, Q.LIFT, 81); S.post.sh = 0.3 * (hit(t, 72.11, 0.4) + hit(t, Q.LIFT, 0.5)); dbg(); }],
        /* 8b ØYET (1:21,0–1:24,47): helt nært. Det åpner seg på bass-slaget 1:21,89 med et blaff, og holdes. De siste 0,35 s står alt stille: bare låta. */
        [81.0, (S, u, a, t) => { const e = S.W('Head', S.A.eye), c = S.W('Head', S.A.eyeCam), k = io(seg(t, 81.0, Q.CLX)); K.cam(mix(c.x, e.x, 0.16 * k), c.y, mix(c.z, e.z, 0.16 * k), e.x, e.y, e.z, 26);
          S.post.vig = 0.9; S.post.fl = 0.55 * hit(t, Q.EYE, 0.2); S.post.flc = '#ffe890'; S.post.sh = t < Q.STILL ? 3.2 * hit(t, Q.EYE, 0.6) + 1.1 * seg(t, Q.EYE + 0.5, Q.STILL) : 0; dbg(); }],
        /* 9 HAN EKSPLODERER PÅ SLAGET (1:24,47): klipp til det lave, vide bildet forfra. Alt knuses på slaget, han er rød med en gang, brølet kommer 0,1 s etter
           med lyn i askeskyen, navnet på 1:25,9, og scenen lever videre til Continue eller 1:48. */
        [Q.CLX - 0.035, (S, u, a, t) => { const k = io(seg(t, Q.CLX + 0.7, Q.CLX + 5.2)), w = 0.04 * sin(max(0, t - Q.CLX - 5.2) * 0.23);   /* tett og lavt på slaget, så i en bue ut til bildet kampen starter fra */
          K.cam(mix(3.4, -6.2, k) + sin(w) * 1.6, mix(0.85, 1.65, k), mix(13.6, 19.9, k), mix(-0.6, -3.5, k), mix(5.9, 4.6, k), mix(2.5, 2.8, k), mix(58, 52, k), -0.04 * (1 - k));
          S.post.fl = t < Q.CLX ? 0.7 : hit(t, Q.CLX, 0.09) * 0.9; S.post.flc = '#fff0b8'; S.post.sh = 5 * hit(t, Q.CLX, 1.0) + 2.5 * hit(t, Q.ROAR, 0.6) + 0.7 * S.rw; X.mouth(S, S.gr, Q.ROAR, t); S.post.heat = 0.6 + 0.6 * S.rw; dbg(); }],
      ],
    });
    /* Lyn inne i askeskyen (vulkansk, fiolett-rødlig, uten regn): på de sterke slagene i bilde 4 og noen flere, tegnet over 3D-bildet der søylen står. */
    const LT = [[8.58, 0.5], [11.4, 0.7], [Q.LY, 1], [40.75, 0.8], [43.88, 0.5], [46.7, 0.7], [48.13, 0.5], [Q.ROAR, 1.4], [Q.ROAR + 0.2, 0.9], [87.64, 0.7], [93.28, 0.5], [98.92, 0.6], [101.76, 0.7], [104.58, 0.6]];
    X.reg('c3:383', { spid: 383, skin: 'lava', back: backdrop, look, over: (x, t, o) => X.plate(x, t - Q.NAME, o), cues: [[Q.ROAR, 'cry']], roar: () => Q.ROAR,
      fx(S, t, P) { for (let j = 0; j < LT.length; j++) { const [t0, s] = LT[j], a = t - t0; if (a < 0 || a > 0.32) continue; const k = s * (a < 0.06 ? 1 : a < 0.12 ? 0.3 : a < 0.2 ? 0.85 : 1 - (a - 0.2) / 0.12);
        const top = K.proj(VOL.x + 30 + (rnd(j, 801) - 0.5) * 80, VOL.h + 150 + rnd(j, 802) * 60, VOL.z), bot = K.proj(VOL.x + 10 + (rnd(j, 803) - 0.5) * 40, VOL.h + 28, VOL.z); if (top.z > 1 || bot.z > 1) continue;
        C.blob((top.x + bot.x) / 2, (top.y + bot.y) / 2, 130 * s * (s > 1.2 ? 1.15 : 1), '#8a4ce8', 0.28 * k * (s > 1.2 ? 0.8 : 1), 1); C.bolt(top.x, top.y, bot.x, bot.y, { seed: 31 + j * 7, w: 2.4, col: '#b060ff', core: '#ffeaff', a: k, br: 3, jag: 0.32, depth: 5 }); P.bloom += 0.15 * k; }
        /* Oppladningen: mer glød og stråler ut fra brystet (lyset siver ut av sprekkene). */
        const h = S.heat || 0, c = S.chg || 0; if (h > 0 && t < 81.0) {   /* ikke i nærbildet av øyet: ansiktet er hellig, ingen stråler over det */ P.bloom += 0.13 * h * h + 0.1 * c; const q = S.gr.at('Spine2'), m = K.proj(q.x, q.y + 0.6, q.z); if (m.z < 1) P.rays = { x: m.x, y: m.y, a: 0.3 + 1.1 * h * h + 0.35 * c, len: 0.72 }; } } });
  }
})();
