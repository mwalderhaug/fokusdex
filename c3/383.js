'use strict';
/* Fokusdex – Groudon (383) i 3D: krateret ved Terra Cave. Lavasjø med skorpeflak, fjellvegger med hyller, røde krystaller og vulkanen bak kanten.
   Lastes først når et raid med Groudon viser seg (G3C.load i raid3c.js, der verktøykassa står; motoren og stilen er raid3d.js). Reglene bak hvert valg: work/RAIDS3D.md.
   GROUDON ER STANDARDEN (Jazz 18.11: «Ferdig med Groudon nå»): cutscenen, Primal-cutscenen, arenaen og 3D-figuren i kampen endres ikke uten at han ber om det.
   Sjekk bilde mot bilde etter hver endring i motoren eller verktøykassa: work/g3d/scripts/bildemot.js og bildemot.py.
   «Bevegelse etter Fable» (Opus 25.11): den nye bevegelsen fra knuset og i hele Primal-filmen; den godkjente ligger bak bryteren G3D.alt[383] = 'stiv' («BEVEGELSEN» under).
   Fila gir 'c3:383' (introen på introlåta), 'c3:383p' (Primal Reversion på kamplåta: kyStorm i bui.js styrer låta og raseriet), 'c3:383a' og 'c3:383b' (arenaen
   uten og med 3D-figuren; etter Primal brenner himmelen der også). */
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
  /* Arenaen med 3D-figuren og Primal-filmen står foran FILMENS fjell (introens: 192 × 72 med raviner, innervegg og elver med skorpe), så kampen står foran det
     samme fjellet som introen sluttet ved (Jazz 24.11, valgt mot K.volcano alene; arenaen uten figur har fjellet i en annen størrelse og bruker fortsatt K.volcano).
     filmVol settes av introblokka nederst i fila og bytter masken og materialet på S.vol fra volcano(). */
  let filmVol = null;
  function volcano(S, T, big, V) {
    V = S.V = V || VOL; const at = m => { m.position.set(V.x, V.h, V.z); S.scene.add(m); return m; }, hot = ['#fff2a8', '#ffa020', '#c83008'];
    S.vol = K.volcano({ r: V.r, h: V.h, seed: 5 }); S.vol.position.set(V.x, -2, V.z); S.scene.add(S.vol); S.vgn = VGN; S.vgm = VGM; S.vgi = 0;
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
    for (const q of [S.vboom, S.vash, S.vrain]) q.material.uniforms.uT0.value = b ? tb : -1e5; S.vboom2.material.uniforms.uT0.value = b ? tb + (S.boom2 || 0.7) : -1e5;
  }

  /* ---------- Himmelen brenner (2b.2: Primal på kamplåta, og arenaen etter forvandlingen) ----------
     Jazz 19.11: i introen blør jorda, i Primal brenner himmelen. Byggeklossene her deles av cutscenen (c3:383p) og arenaen etter forvandlingen, så arenaen står
     slik filmen sluttet:
     · toppen av fjellet er sprengt bort (topSet): masken er kuttet lavere, med en flenge mot krateret hans og en hakket, glødende kant
     · askeskyen som lukker himmelen (S.roof): et tak av valker i 3D som brer seg ut fra søylen over fjellet og inn over oss. Det er mørkt, lyst opp nedenfra av
       ilden (rødglødende underside), og lynet går inne i skyen (de tynne stedene mellom valkene lyser, valkene står mørke mot lyset). Aldri regn.
     · askesøylen fra flenga opp i taket (S.col), glødende skred som velter ned fjellsidene (S.flow: unge valker gløder, gamle er mørk aske) og lavabomber med
       røykhale som slår ned i sjøen (bombs)
     burn(S, T) bygger dem etter volcano(S, T, 1); burnAct(S, t, B) setter dem for hvert bilde (B = { top, roofR, roofA, hot, col, flow: [starttider], L: lyn }). */
  const VGN = 96, VGM = 30, BRA = 1.43, wrapA = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };   /* BRA: retningen fra fjellet mot krateret hans (radianer rundt fjellet) */
  /* Et punkt på fjellets flate (verden), lest fra masken (P = punktene, hel eller sprengt): au = rundt fjellet (0–1), v = høyden (0–1), out = så langt ut fra flaten. */
  const volP = (S, P, au, v, out) => { const V = S.V, GN = S.vgn, GM = S.vgm; au = ((au % 1) + 1) % 1; v = c01(v); const fi = au * GN, i0 = floor(fi), f = fi - i0, fj = v * GM, j0 = min(GM - 1, floor(fj)), g = fj - j0,
      at = (j, i, k) => P[(j * (GN + 1) + i) * 3 + k], q = k => mix(mix(at(j0, i0, k), at(j0, i0 + 1, k), f), mix(at(j0 + 1, i0, k), at(j0 + 1, i0 + 1, k), f), g), x = q(0), z = q(2), r = Math.hypot(x, z) || 1, o = out || 0;
    return [V.x + x * (1 + o / r), q(1) - 2, V.z + z * (1 + o / r)]; };
  /* Der toppen er kuttet: lavest mot krateret hans. ia = kolonnen i scenens rutenett; taggene i kanten er de samme uansett oppløsning (lest i 96-deler og jevnet mellom). */
  const cutV = (S, ia) => { const GN = S.vgn, a = ia / GN * TAU, d = wrapA(a - BRA), x = ia * VGN / GN, i0 = floor(x), f = x - i0, jag = f > 0 ? mix(rnd(i0 % VGN, 71), rnd((i0 + 1) % VGN, 71), f) : rnd(i0 % VGN, 71);
    return 0.86 - 0.1 * Math.exp(-Math.pow(d / 0.55, 2)) + (jag - 0.5) * 0.036 + 0.018 * sin(a * 9 + 1); };
  const FS_ROOF = `varying vec3 vW; uniform vec3 uV, uLc; uniform float uR, uA, uHot, uFk; uniform vec4 uL[4];
${K.GLSL.COMMON}
/* En valk per celle: rund og høyest i midten, med mørke søkk mellom cellene. */
float bil(vec2 q){ q += (vec2(vn(q * .7 + 3.), vn(q * .7 + 9.)) - .5) * .85; vec3 v = voro(q); return (1. - smoothstep(0., .95, v.x)) * (.7 + .3 * v.z); }
/* Skyens underside: store valker med mindre valker på, som driver fra fjellet og inn over oss (to lag i ulik fart, så det koker). */
float cl(vec2 p){ vec2 d = vec2(.35, 1.) * uTime; return bil(p * .0105 - d * .11) * .68 + bil(p * .027 - d * .2 + 7.) * .32; }
void main(){
  vec2 p = vW.xz - uV.xz; float r = length(p); vec2 dir = p / max(r, 1.);
  float h = cl(p), hd = cl(p - dir * 13.), face = clamp((h - hd) * 6., -1., 1.);   /* face > 0: flaten vender mot søylen (ilden) */
  /* Fronten: valkene i kanten stikker lenger fram, så kanten er klumper og ikke en rett strek. */
  float e = r - uR + (1. - h) * 130. - 40., a = (1. - smoothstep(-46., 0., e)) * uA;
  if (a < .004) discard;
  float near = exp(-r / 170.);
  vec3 col = mix(vec3(.016, .011, .014), vec3(.085, .052, .048), h);
  /* Ilden nedenfra: valkene som henger lavest, gløder rødt, og sidene som vender mot søylen, er oransje; i søkkene er det mørkt. */
  col += vec3(.8, .15, .03) * uHot * (.13 + .55 * near) * h * h;
  col += vec3(1., .42, .09) * uHot * (.1 + 1.7 * near) * max(face, 0.) * (.25 + .75 * h);
  col += vec3(1., .5, .14) * .34 * uHot * smoothstep(-90., -8., e) * (.4 + .6 * h);   /* fronten er tynn og lyst opp av horisonten */
  /* Lyn inne i skyen: søkkene mellom valkene lyser, og valkene står mørke mot lyset. */
  for (int i = 0; i < 4; i++) { vec4 g = uL[i]; if (g.w > 0.) { float d = length(p - g.xy) / g.z; col += uLc * g.w * exp(-d * d) * (.25 + 1.3 * (1. - h) * (1. - h)); } }
  col = mix(col, uFogC * .8, fogK(vW) * uFk);
  gl_FragColor = vec4(col * a, a);
}`;
  /* Fargeskalaen for lava (temperatur 0–1,3: skorpe, rød, oransje, gul, hvitglødende), og en fontene av lava: rennende lava oppover en søyle, varmest nederst,
     med fillete omriss (kanten mot kameraet kastes) og en fillete topp som blafrer. uOn = hvor høyt den står (0–1 og litt over). */
  const LRAMP = `vec3 ramp(float x){ vec3 c = vec3(.028, .006, .002); c = mix(c, vec3(.4, .028, .0), smoothstep(0., .3, x)); c = mix(c, vec3(.98, .24, .02), smoothstep(.24, .6, x)); c = mix(c, vec3(1., .66, .14), smoothstep(.56, .92, x)); return mix(c, vec3(1., .95, .72), smoothstep(.9, 1.35, x)); }`;
  const FS_FNT = `varying vec3 vW, vN; varying vec2 vUv; uniform float uSd, uOn;
${K.GLSL.COMMON}
${LRAMP}
void main(){ float y = vUv.y, x = vUv.x * 6.2832; vec2 c = vec2(cos(x), sin(x));
  float top = uOn * (.74 + .26 * fbm(c * 1.6 + vec2(uSd, uTime * 1.9))); if (y > top) discard;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = abs(dot(N, V));
  float n = fbm(c * 2.2 + vec2(uSd, y * 3. - uTime * 3.6)), n2 = fbm(c * 5. + vec2(uSd * 3., y * 7. - uTime * 6.5));
  if (f < .2 + .3 * n2 * (.4 + y)) discard;
  float k = y / max(top, .01), temp = 1.1 - .5 * k + .34 * (n - .5) + .2 * (n2 - .5) - .16 * (1. - f);
  gl_FragColor = vec4(ramp(temp), 1.); }`;
  /* Lavabomber: glødende klumper i kast fra toppen, med en hale av røyk som blir hengende i banen, og et sprut av klumper der de slår ned. L = [[når den kastes
     (s etter t0), flytid, x, z, størrelse], …]. Banen er et rent kast (tyngden GB), så hodet og halen regnes ut fra tiden. m.at(t0) starter en salve. */
  const GB = 120;
  function bombs(S, L, sd) {
    const V = S.V, hot = ['#fff6c8', '#ffb234', '#ff7a14'], P0 = L.map((q, i) => [V.x + (rnd(i, sd) - 0.5) * 18, V.h * 0.82 + 4, V.z + (rnd(i, sd + 1) - 0.5) * 18]),
      V0 = L.map((q, i) => [(q[2] - P0[i][0]) / q[1], -P0[i][1] / q[1] + 0.5 * GB * q[1], (q[3] - P0[i][2]) / q[1]]), pos = (i, a) => [P0[i][0] + V0[i][0] * a, P0[i][1] + V0[i][1] * a - 0.5 * GB * a * a, P0[i][2] + V0[i][2] * a], NT = 18;
    const head = K.pts(L.length, i => ({ p: P0[i], v: V0[i], b: L[i][0], l: L[i][1] + 0.03, z: 1.1 * L[i][4] }), { t0: -1e5, add: 1, g: GB, px: 110, floor: 0, min: 2, near: 12, c: hot, fade: 0.995 });
    const trail = K.pts(L.length * NT, k => { const i = floor(k / NT), a = L[i][1] * ((k % NT) + 0.6) / NT, p = pos(i, a); return { p, v: [V0[i][0] * 0.03 + (rnd(k, sd + 2) - 0.5) * 1.5, 1.2 + rnd(k, sd + 3) * 1.6, V0[i][2] * 0.03 + (rnd(k, sd + 4) - 0.5) * 1.5], b: L[i][0] + a, l: 1.0 + rnd(k, sd + 5) * 0.7, z: (1.7 + rnd(k, sd + 6) * 1.7) * L[i][4] }; },
      { t0: -1e5, shade: 1, drag: 0.6, sz0: 0.45, sz1: 1.7, px: 110, near: 9, c: ['#c06a30', '#4a2a22', '#181012'], a: 0.5, fade: 0.3 });
    const NS = 30, spl = K.pts(L.length * NS, k => { const i = floor(k / NS), a = rnd(k, sd + 7) * TAU, q = rnd(k, sd + 8), s = L[i][4]; return { p: [L[i][2] + cos(a) * 0.7 * s, 0.1, L[i][3] + sin(a) * 0.7 * s], v: [cos(a) * (1.5 + 6 * q) * s, (7 + rnd(k, sd + 9) * 13) * Math.sqrt(s), sin(a) * (1.5 + 6 * q) * s], b: L[i][0] + L[i][1] + rnd(k, sd + 10) * 0.08, l: 1.6, z: (0.9 + rnd(k, sd + 11) * 1.5) * s }; },
      { t0: -1e5, shade: 1, g: 26, px: 60, floor: 0, near: 5, c: ['#ffd070', '#ff7a18', '#a82806'], fade: 0.92 });
    for (const m of [head, trail, spl]) S.scene.add(m);
    return { L, at: t0 => { for (const m of [head, trail, spl]) m.material.uniforms.uT0.value = t0; }, show: on => { for (const m of [head, trail, spl]) m.visible = on; } };
  }
  function burn(S, T, o) {
    o = o || {}; const ROOFH = S.roofH = o.roofH || 190, V = S.V, g = S.vol.geometry, PA = g.attributes.position, NA = g.attributes.normal, P0 = PA.array.slice(), N0 = NA.array.slice(), P1 = P0.slice(), GN = S.vgn, GM = S.vgm, GI = S.vgi || 0, rAt = (P, j, i) => Math.hypot(P[(j * (GN + 1) + i) * 3], P[(j * (GN + 1) + i) * 3 + 2]);
    /* Toppen sprengt bort: radene over kuttet legges som en smal, hakket leppe i kuttets høyde (de øverste radene gløder i fjellets materiale, så leppa gløder). */
    for (let i = 0; i <= GN; i++) { const ia = i % GN, a = ia / GN * TAU, vb = cutV(S, ia), fj = vb * GM, j0 = min(GM - 1, floor(fj)), rb = mix(rAt(P0, j0, i), rAt(P0, j0 + 1, i), fj - j0);
      for (let j = 0; j <= GM; j++) { const v = j / GM; if (v <= vb) continue; const e = (v - vb) / (1 - vb), k = (j * (GN + 1) + i) * 3, rr = rb * (1 - 0.16 * e); P1[k] = cos(a) * rr; P1[k + 1] = V.h * (vb + 0.012 * e - 0.03 * e * e); P1[k + 2] = sin(a) * rr; }
      /* Filmens fjell har en innervegg øverst (GI rader): etter smellet er den en grunn gryte innenfor leppa, med lavaen i bunnen. */
      for (let j = GM + 1; j <= GM + GI; j++) { const e = (j - GM) / GI, k = (j * (GN + 1) + i) * 3, rr = rb * 0.84 * (1 - 0.7 * e); P1[k] = cos(a) * rr; P1[k + 1] = V.h * (vb - 0.018 - 0.07 * e * (2 - e)); P1[k + 2] = sin(a) * rr; } }
    PA.array.set(P1); g.computeVertexNormals(); const N1 = NA.array.slice(); PA.array.set(P0); NA.array.set(N0); PA.needsUpdate = NA.needsUpdate = true; S.top = { P0, N0, P1, N1 }; S.topOn = 0;
    /* Askeskyen: taket. */
    S.roof = new T.Mesh(new T.CircleGeometry(1500, 40).rotateX(PI / 2), K.shader(K.GLSL.VS, FS_ROOF, { uV: K.uv(new T.Vector3(V.x, ROOFH, V.z)), uR: K.uv(0), uA: K.uv(0), uHot: K.uv(1), uFk: K.uv(o.fog == null ? 0.42 : o.fog), uLc: K.uv(K.u3('#c8a0ff')), uL: K.uv([0, 1, 2, 3].map(() => new T.Vector4())) }, Object.assign(K.blend.soft(), { side: T.DoubleSide })));
    S.roof.position.set(V.x, ROOFH, V.z); S.roof.frustumCulled = false; S.roof.renderOrder = -2; S.roof.visible = false; S.scene.add(S.roof);
    /* Askesøylen fra flenga opp i taket: lyst opp nedenfra av ilden, mørk øverst. */
    const top = V.h * 0.8;
    S.col = K.pts(84, i => { const a = rnd(i, 1601) * TAU, q = rnd(i, 1602); return { p: [V.x + cos(a) * 13 * q, top - 4, V.z + sin(a) * 13 * q], v: [cos(a) * (2 + 5 * q) + 1.5, 19 + rnd(i, 1603) * 9, sin(a) * (2 + 5 * q)], b: rnd(i, 1604) * 5.6, l: 5.6, z: 62 + rnd(i, 1605) * 70 }; },
      { loop: 1, shade: 1, drag: 0.5, sz0: 0.45, sz1: 1.75, px: 150, c: ['#ffa850', '#6a3428', '#191012'], a: 0, fade: 0.7 }); S.col.renderOrder = -1; S.scene.add(S.col);
    /* Glødende skred ned fjellsidene, fra flenga og på hver side av den: [hvor rundt fjellet (fra flenga), forsinkelse, fart]. Punktene følger fjellets flate; hver valk
       fødes idet fronten når stedet sitt, så de unge (glødende) ligger i fronten og de gamle (mørk aske) henger igjen bak og over. */
    const FLOW = [[-0.03, 0, 62], [-0.085, 0.3, 56], [0.055, 0.55, 52], [-0.14, 0.8, 48]], NP = 40;
    S.flow = FLOW.map(([da, dl, sp], k) => { const au0 = BRA / TAU + da, v0 = cutV(S, Math.round(au0 * S.vgn) % S.vgn) - 0.01, pts = [], len = [0];
      for (let m = 0; m <= NP; m++) { const v = mix(v0, 0.015, m / NP); pts.push(volP(S, P1, au0 + 0.011 * sin(v * 8 + k * 2.1) * (1 - v), v, 2.5)); if (m) len.push(len[m - 1] + Math.hypot(pts[m][0] - pts[m - 1][0], pts[m][1] - pts[m - 1][1], pts[m][2] - pts[m - 1][2])); }
      const Lt = len[NP], at = s => { let m = 0; while (m < NP - 1 && len[m + 1] < s) m++; const u = c01((s - len[m]) / (len[m + 1] - len[m])), a = pts[m], b = pts[m + 1], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dl2 = Math.hypot(d[0], d[1], d[2]) || 1; return { p: a.map((x, q) => mix(x, b[q], u)), d: d.map(x => x / dl2) }; };
      const side = (q, w) => { const hl = Math.hypot(q.d[0], q.d[2]) || 1; return [-q.d[2] / hl * w, q.d[0] / hl * w]; };
      const ash = K.pts(78, i => { const s = Lt * (i + rnd(i, 1700 + k)) / 78, q = at(s), sw = side(q, (rnd(i, 1701 + k) - 0.5) * (14 + 0.11 * s)), vd = 5 + rnd(i, 1702 + k) * 8; return { p: [q.p[0] + sw[0], q.p[1] + 3 + rnd(i, 1703 + k) * 4, q.p[2] + sw[1]], v: [q.d[0] * vd + sw[0] * 0.12, 6 + rnd(i, 1704 + k) * 9 + q.d[1] * vd * 0.4, q.d[2] * vd + sw[1] * 0.12], b: dl + s / sp + 0.25 + rnd(i, 1705 + k) * 0.3, l: 4.4 + rnd(i, 1706 + k) * 2.8, z: 30 + 0.13 * s + rnd(i, 1707 + k) * 24 }; },
        { t0: -1e5, shade: 1, drag: 1.15, sz0: 0.3, sz1: 2.1, px: 150, c: ['#7a3a22', '#2c1614', '#0c090a'], a: 0.94, fade: 0.55 });
      const hot = K.pts(60, i => { const s = Lt * (i + rnd(i, 1710 + k)) / 60, q = at(s), sw = side(q, (rnd(i, 1711 + k) - 0.5) * (10 + 0.07 * s)), vd = 10 + rnd(i, 1712 + k) * 10; return { p: [q.p[0] + sw[0], q.p[1] + 1.5, q.p[2] + sw[1]], v: [q.d[0] * vd, 2.5 + rnd(i, 1713 + k) * 4 + q.d[1] * vd, q.d[2] * vd], b: dl + s / sp - 0.06 + rnd(i, 1714 + k) * 0.15, l: 1.1 + rnd(i, 1715 + k) * 0.7, z: 15 + 0.06 * s + rnd(i, 1716 + k) * 12 }; },
        { t0: -1e5, shade: 1, drag: 0.8, px: 150, sz0: 0.5, sz1: 1.5, c: ['#ffc060', '#f0561a', '#52180e'], a: 0.95, fade: 0.6 }); hot.renderOrder = 1;
      S.scene.add(ash); S.scene.add(hot); return { ash, hot, len: Lt, sp, dl, head: s => at(min(Lt, max(0, s))).p }; });
  }
  /* Lynet tegnet over 3D-bildet (fiolett, vulkansk, uten regn): en kort gren langs undersiden av skyen der den lyser, og (radius 0) et lyn i selve askesøylen.
     LT = [[når, styrke, x, z (fra fjellets akse), radius], …]. */
  const skyBolts = (S, t, P, LT) => { const V = S.V; for (let j = 0; j < LT.length; j++) { const q = LT[j], a = t - q[0]; if (a < 0 || a > 0.5) continue; const k = lflick(a) * q[1]; if (k < 0.04) continue;
      const ROOFH = S.roofH, col = !q[4], an = rnd(j, 811) * TAU, ln = col ? 0 : q[4] * 0.8, A = col ? K.proj(V.x + q[2], ROOFH - 10, V.z + q[3]) : K.proj(V.x + q[2] - cos(an) * ln, ROOFH - 3, V.z + q[3] - sin(an) * ln), B = col ? K.proj(V.x - 6 + (rnd(j, 812) - 0.5) * 20, V.h * 0.8 + 12, V.z) : K.proj(V.x + q[2] + cos(an) * ln, ROOFH - 3, V.z + q[3] + sin(an) * ln);
      if (A.z > 1 || B.z > 1) continue; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, sz = max(40, Math.hypot(A.x - B.x, A.y - B.y));
      C.blob(mx, my, sz * (col ? 1.1 : 0.8), '#8a4ce8', 0.3 * k, 1); C.bolt(A.x, A.y, B.x, B.y, { seed: 31 + j * 7 + (a > 0.12 ? 1 : 0), w: col ? 2.4 : 1.7, col: '#b060ff', core: '#ffeaff', a: k, br: col ? 3 : 2, jag: 0.32, depth: col ? 5 : 4 }); P.bloom += 0.12 * k; } };
  const topSet = (S, on) => { on = on ? 1 : 0; if (S.topOn === on) return; S.topOn = on; const g = S.vol.geometry, Q = S.top; g.attributes.position.array.set(on ? Q.P1 : Q.P0); g.attributes.normal.array.set(on ? Q.N1 : Q.N0); g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true; const tu = S.vol.material.uniforms.uTop; if (tu) tu.value = on; };
  /* Lynet inne i skyen: L = [[alder (s), styrke, x, z (fra fjellets akse), radius], …]. Det blinker to–tre ganger som ekte lyn. */
  const lflick = d => d < 0 ? 0 : d < 0.05 ? 1 : d < 0.1 ? 0.3 : d < 0.17 ? 0.85 : d < 0.24 ? 0.25 : max(0, 1 - (d - 0.24) / 0.3) * 0.5;
  function burnAct(S, t, B) {
    topSet(S, B.top); const ru = S.roof.material.uniforms, on = B.roofA > 0.005 && B.roofR > 1; S.roof.visible = on; ru.uR.value = B.roofR; ru.uA.value = B.roofA; ru.uHot.value = B.hot == null ? 1 : B.hot;
    let lit = 0; for (let i = 0; i < 4; i++) { const q = (B.L || [])[i], k = q ? lflick(q[0]) * q[1] : 0; ru.uL.value[i].set(q ? q[2] : 0, q ? q[3] : 0, q ? q[4] : 1, k); lit = max(lit, k); } S.rlit = on ? lit : 0;
    S.col.visible = B.col > 0.01; S.col.material.uniforms.uA.value = 0.9 * (B.col || 0);
    S.flow.forEach((f, k) => { const t0 = B.flow && B.flow[k] != null ? B.flow[k] : -1e5; f.ash.material.uniforms.uT0.value = f.hot.material.uniforms.uT0.value = t0; f.ash.visible = f.hot.visible = t0 > -1e4; });
  }


  /* ---------- Posene ---------- */
  const STAT = { Neck1: [0, -0.16, 0], Neck2: [0, -0.06, 0], Head: [0, -0.12, 0], Spine2: [0, -0.05, 0], '*Arm': [0.12, -0.25, 0.18] };                 /* statuen: hodet senket, armene inntil */
  /* Brølet (Jazz sitt referanseark 18.11): brystet fram, ryggen i bue, skuldrene bakover, armene ut med åpne klør, kjeften helt opp, beina plantet. */
  const ROAR = { Neck1: [0, 0.28, 0], Neck2: [0, 0.2, 0], Head: [0, 0.15, 0], Jaw: [0, -0.82, 0], Spine1: [0, 0.06, 0], Spine2: [0, 0.14, 0], Spine3: [0, 0.1, 0], Hips: [0, -0.05, 0], Tail2: [0, 0.12, 0], Tail3: [0, 0.12, 0], Tail4: [0, 0.12, 0], '*Arm': [0.25, 0.35, -0.8], '*Hand': [0.55, 0, -0.15] };
  const DUCK = { Neck1: [0, -0.2, 0], Neck2: [0, -0.1, 0], Head: [0, -0.14, 0], Spine2: [0, -0.1, 0], Spine3: [0, -0.06, 0], '*Arm': [0, -0.3, 0.2] };
  /* Hvor på kroppen steinhuden sitter: benene i en gitt stilling, i verden. Brukes til å la flak og støv starte på kroppen. */
  const SHELL = ['Head', 'Head', 'Neck1', 'Spine3', 'Spine3', 'Spine2', 'Spine2', 'Spine1', 'Hips', 'LArm', 'RArm', 'LHand', 'RHand', 'LThigh', 'RThigh', 'LLeg', 'RLeg', 'Tail1', 'Tail2', 'Tail3'];
  const bodyPts = (g, pose) => { g.clear(); if (pose) g.add(pose, 1); g.root.position.set(HOME[0], HOME[1], HOME[2]); g.apply(); const r = SHELL.filter(n => g.bones[n]).map(n => g.at(n).toArray()); g.clear(); g.apply(); return r; };

  /* ---------- BEVEGELSEN etter Fable (Opus 25.11; reglene: work/RAIDS3D.md, «Bevegelse»; posene: work/raids3d/groudon/bevegelse/poser.jpg) ----------
     Fra knuset og ut i introen (han står stiv og grå til knuset: godkjent, urørt) og hele Primal-filmen. Posene er nøkler, og motoren lager bevegelsen mellom dem:
     målet for hver gruppe av ben glir mellom posene (io), og en fjær per gruppe (X.follow) gir tyngden, etterslepet og overskuddet. I brølene er fjærene stive (followV:
     kastet slippes på lyden, kjeven halvåpen innen 0,1 s) og ellers myke (rolige bevegelser glattes); retting etter kontrollen 25.11. Gruppene starter etter tur: i et
     kast (brølet, reisingen) leder brystet, så kommer nakken, hodet og armene, og klørne sist; når han senker seg (kjeften lukkes ved navnet), leder hodet. Halen henger
     etter kroppen (X.chain), aldri en halepisk for seg. Skjelvet er støy (X.noise), ikke rene sinuser; pusten er langsom og litt ujevn (en stor kropp), og blikket
     går i små vendinger: hodet først, nakken etter. Kameraene har liv (camLive). Ingenting rører seg i bildene etter knuset (til skriket) og smellet (frosne bilder ved nedslag).
     Bryteren: G3D.alt[383] = 'stiv' (eller 'gammel') gir bevegelsen og kameraene slik de var (Fable 23.11) i begge filmene (live: &gammel=stiv; gjennomgangssiden: &alt=stiv;
     verktøyene: PRE='G3D.alt={383:"stiv"}'). G3D.dbgKey = 1: posene uten fjærene (posearket, work/g3d/scripts/poser.js; aldri satt i appen).
     Nye poser har egne navn: STAT, ROAR, DUCK, PROAR og PDUCK er også kampfigurens (form i arenaen), og STAT steinflakenes (bodyPts). */
  const altv = () => String((G3D.alt && G3D.alt[383]) || ''), STIV = () => /stiv|gammel/.test(altv());   /* 'gammel' også: live.html sin &gammel=1 gir 'gammel' (retting 25.11) */
  /* En pose som vektor for en gruppe av ben (roller som i posene): PV(G, [[pose, vekt], …]); putV legger vektoren på figuren. */
  const PV = (G, L) => { const v = new Array(G.length * 3).fill(0); for (const [po, w] of L) G.forEach((k, i) => { const a = po[k]; if (a) for (let c = 0; c < 3; c++) v[3 * i + c] += (a[c] || 0) * w; }); return v; };
  const putV = (f, G, v, w) => { w = w == null ? 1 : w; G.forEach((k, i) => { if (v[3 * i] || v[3 * i + 1] || v[3 * i + 2]) f.add({ [k]: [v[3 * i], v[3 * i + 1], v[3 * i + 2]] }, w); }); };
  /* Nøklene [[tid, vektor eller tall, (kurve)], …]: målet glir mellom dem (io, eller nøkkelens egen kurve inn til den), og står før den første og etter den siste. */
  const keyAt = (L, t) => { if (t <= L[0][0]) return L[0][1]; for (let i = 1; i < L.length; i++) if (t < L[i][0]) { const a = L[i - 1], b = L[i], u = (b[2] || io)((t - a[0]) / (b[0] - a[0]));
      return typeof a[1] === 'number' ? a[1] + (b[1] - a[1]) * u : a[1].map((x, j) => x + (b[1][j] - x) * u); } return L[L.length - 1][1]; };
  /* Én gruppe: nøklene følges av en fjær (f i Hz: lavere = tyngre; z: 0,45 = tydelig overskudd, 0,7 = lite) fra t0. Med G3D.dbgKey: målet selv (posene uten fjærene). */
  const fjaer = (L, f, z, t0) => { const sp = X.follow(t => keyAt(L, t), { f, z, t0 }); return t => G3D.dbgKey ? keyAt(L, t) : sp(t); };
  /* Pusten: 0 → 1 (inn, 40 % av perioden) → 0 (ut), myk i begge ender. Perioden og dybden glir litt fra pust til pust (støy), så den ikke går som en klokke.
     Femtegradskurven (sm5: farten og akselerasjonen er null i vendepunktene): med io hoppet akselerasjonen i hver vending, og kjevens stavelser i brølet ga rykk (kontrollen 25.11). */
  const sm5 = x => x * x * x * (x * (6 * x - 15) + 10);
  const pust = (t, t0, P, sd) => { if (t < t0) return 0; const u = ((t - t0) / P + 0.05 * X.noise(t, sd, 0.07)) % 1, a = 0.4, b = u < a ? sm5(u / a) : 1 - sm5((u - a) / (1 - a)); return b * (1 + 0.15 * X.noise(t, sd + 3, 0.09)); };
  /* Kameraet med liv: banen følges med en fjær (etterslep) og får svak støy (som X.handheld), tonet inn fra tIn; fra tEnd står det nøyaktig på banen (der bildet må stå:
     kampens bilde). Ett per klipp (t0 = klippets start, der banen står i ro). src(t) → [px, py, pz, tx, ty, tz, fov, roll]; gir det samme til K.cam.
     o.ut: hvor lenge (s) etterslepet tones ut før tEnd (1). Over en lang bue som bremser: 2 eller mer, ellers tar kameraet igjen banen synlig det siste sekundet (kontrollen 25.11). */
  const camLive0 = (src, o) => { const lag = X.follow(t => src(t).slice(0, 6), { f: o.f || 1.6, z: o.z == null ? 0.8 : o.z, t0: o.t0 }), A = o.amp || [0.04, 0.025];
    return t => { const v = src(t), c = lag(t), w = o.tIn != null ? io(seg(t, o.tIn, o.tIn + 0.6)) : 1, e = o.tEnd != null ? 1 - io(seg(t, o.tEnd - (o.ut || 1), o.tEnd)) : 1;
      for (let i = 0; i < 6; i++) c[i] = v[i] + (c[i] - v[i]) * e + X.noise(t, (o.seed || 1) + i * 17, o.hz || 0.6) * A[i < 3 ? 0 : 1] * w * e;
      return c.concat([v[6], v[7] || 0]); }; };
  /* G3D.alt.kam = 'ny' (REGLER del 4 «Kameraets liv», 26.11 morgen): samme baner, men livet i grader ganget med linsa og fjæra med målfart (X.camLiv). */
  const camLive = (src, o) => X.kamVelg(camLive0(src, o), X.camLiv(src, o));
  const camV = v => K.cam(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7]);
  /* Lys og glød som skal stå mot kameraet (K.face), og ting som plasseres etter figuren (g.at), regnes i act, før stillingen og kameraet for bildet er satt: de fikk
     forrige bildes kamera og stilling, så bildet avhenget av hvilket bilde som ble tegnet før (funnet 25.11 med gjennomgangssidens løkskinn; også i den godkjente filmen,
     der det står). I den nye bevegelsen rettes de etter klippets kamera: vendt(def, fn) kaller fn(S, t) etter hvert klipp (bak bryteren 'stiv' som før). */
  const vendt = (d, fn) => Object.assign(d, { shots: d.shots.map(([s0, f]) => [s0, (S, u, a, t) => { f(S, u, a, t); if (!STIV()) fn(S, t); }]) });
  /* Benene i gruppene: den vanlige formen og Primal (Primal har ikke Spine3, men Neck3; Hips er hoftene med beina på Primal, så den står: ellers sklir føttene). */
  const BENV = { ch: ['Spine1', 'Spine2', 'Spine3'], nk: ['Neck1', 'Neck2'], hd: ['Head'], jw: ['Jaw'], ar: ['*Arm'], hn: ['*Hand'], hp: ['Hips'] }, HALEV = ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5'];   /* på den vanlige formen er Hips bare halens rot (beina er egne røtter) */
  const BENP = { ch: ['Spine1', 'Spine2'], nk: ['Neck1', 'Neck2', 'Neck3'], hd: ['Head'], jw: ['Jaw'], ar: ['*Arm'], hn: ['*Hand'] }, HALEP = ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5'];
  /* Nøklene for alle gruppene: K = { gruppe: [[tid, [[pose, vekt], …]], …] } → { gruppe: fjær }, med fjærene F = { gruppe: [f, z] }. */
  /* En fjær der stivheten endres med tiden (fz(t) → [f, z]): myk i lange, rolige bevegelser (fjæren glatter kurven og gir tyngden) og stiv i et kast på en lyd (følger
     de korte nøklene tett, så brølet kommer på slaget). Ren funksjon av tiden som X.follow: faste steg på 1/240 s fra t0, tilstanden lagret hvert kvarte sekund (kontrollen 25.11). */
  const followV = (src, fz, t0) => { const dt = 1 / 240, M = 60, n = src(t0).length, marks = [], s = new Float64Array(2 * n); let at = -1;
    const st = k => { if (at < 0 || at > k) { if (!marks.length) { const v = src(t0), s0 = new Float64Array(2 * n); for (let j = 0; j < n; j++) s0[j] = v[j]; marks.push(s0); } const m = min(floor(k / M), marks.length - 1); s.set(marks[m]); at = m * M; }
      while (at < k) { const tt = t0 + at * dt, v = src(tt), q = fz(tt), w = TAU * q[0], z = q[1]; for (let j = 0; j < n; j++) { s[n + j] += (w * w * (v[j] - s[j]) - 2 * z * w * s[n + j]) * dt; s[j] += s[n + j] * dt; }
        at++; if (at % M === 0 && at / M === marks.length) marks.push(Float64Array.from(s)); } return s; };
    return t => t <= t0 ? Array.from(src(t)) : Array.from(st(max(0, Math.round((t - t0) / dt))).subarray(0, n)); };
  /* Alle gruppene: F = { gruppe: [f, z] } eller [f, z, f2]: med kast(t) (0–1) glir stivheten fra f til f2 der kast er 1 (brølet), og tilbake. */
  const fjaerer = (B, Kk, F, t0, kast) => { const r = {}; for (const g in Kk) { const L = Kk[g].map(([tt, P, ez]) => [tt, PV(B[g], P), ez]), q = F[g];
      if (kast && q[2]) { const sp = followV(t => keyAt(L, t), t => [mix(q[0], q[2], kast(t)), q[1]], t0); r[g] = t => G3D.dbgKey ? keyAt(L, t) : sp(t); }
      else r[g] = fjaer(L, q[0], q[1], t0); } return r; };
  /* Halen som kjede: posen per ledd fra nøklene (vektoren for hele halen), og ankeret (drive) er det kroppen gjør med halens rot. Gir [[rx, ry, rz], …] per ledd.
     o.dk: nøklene kommer så mange sekunder senere per ledd utover (roten først, tuppen sist: lederen kommer av nøklene, og kjeden gir tyngden; kontrollen 25.11). */
  const haleK = (H, L, drive, o) => { const ks = L.map(([tt, P]) => [tt, PV(H, P)]), dk = (o && o.dk) || 0, pose = (t, i) => keyAt(ks, t - i * dk), pz = (t, i) => { const v = pose(t, i); return [v[3 * i], v[3 * i + 1], v[3 * i + 2]]; }, ch = X.chain(Object.assign({ bones: H, drive, pose: pz }, o));
    return t => { const d = G3D.dbgKey ? null : ch.at(t); return H.map((_, i) => { const p = pz(t, i); return [0, 1, 2].map(c => p[c] + (d ? d[i][c] : 0)); }); }; };

  /* ---------- Primal Reversion på kamplåta (2b.2, Fable 23.11; planen er låst av Jazz i sparringen 19.11, RAIDS.md nr. 42) ----------
     Som i Omega Ruby (krystallen, Ω-tegnet, den knuses), men nå på låtas klokke, som Kyogre sin: kamplåta er «War Lord» (pakken), og filmen starter på de to
     taktene med trommer før bruddet (tl.pre, 2:48,1 i sløyfa; primalCut i bui.js hopper dit under halv HP, og ved det andre bruddet er låta der av seg selv).
       0,00  lyset samler seg om ham, i støt på trommeslagene (0,53 · 1,04 · 1,16 · 1,28 · 1,53 · 1,65 · 1,78), til han er bare lys
       1,97  et rosa blink, og krystallen står der hel (ting kommer til syne ut av LYS, aldri rastrert) og faller på plass
       3,03  virvelen (åtte sekstendedeler): lyset i krystallen dør i åtte trinn, og stedet mørkner med den
       4,00  MUSIKKEN FALLER UT (sløyfa hopper til 0:50,1): helt stille, krystallen er svart. Ω tennes (4,50), sprekker av lys brer seg fra tegnet (fra 4,95),
             og lyset presser på i suget før slaget (5,75)
       5,98  SMELLET (0:52,08): krystallen knuses mot kameraet, og Primal Groudon står der. Han reiser seg sakte (nærbildet fra kneet og opp), og lader opp (9,00)
       9,98  BRØLET på cymbalslaget (0:56,08), og fjellet svarer: toppen sprenges (ny eksplosjon 10,48), askesøylen står opp, og HIMMELEN BRENNER: askeskyen
             brer seg inn over oss og lukker himmelen, rødglødende på undersiden, med lyn inne i skyen; glødende skred velter ned sidene; navnet 10,98
      11,98  trykket fra fjellet når fram (en bølge i lavaen), og lavasjøen rundt føttene hans bryter ut i fontener: utbruddet kommer til ham. Lavabomber slår ned
      13,98  hvitt på taktslaget (1:00,08), og rett tilbake til kampen. Arenaen står slik filmen sluttet (burn).
     Reglene som gjelder (RAIDS3D.md): utbruddet starter ikke før brølet · hver ting har en grunn (brølet → fjellet → trykket → fontenene) · store ting går langsomt
     (skredene og skyen er underveis når det blir hvitt, og arenaen tar over) · utbrudd er klumper, ikke hvite baller · blink er korte og står på begge sider av et klipp.
     Tidene er sekunder i filmen. sP og sL gjør låtas sekunder om: før bruddet (2:48,1 = 0) og etter (0:50,1 = 4,0). */
  const sP = x => Math.round((x - 168.1) * 100) / 100, sL = x => Math.round((x - 46.1) * 100) / 100;
  const PT = { H: [168.63, 169.14, 169.26, 169.38, 169.63, 169.75, 169.88].map(sP), G1: sP(170.07), GL: sP(170.63), D: [171.13, 171.26, 171.38, 171.51, 171.63, 171.76, 171.88, 172.01].map(sP), C: 4, O: sL(50.6), K: sL(51.05), SW: sL(51.85), S: sL(52.08),
    CU: sL(52.63), W: sL(54.6), Q: sL(55.1), R: sL(56.08), B2: sL(56.58), P: sL(57.08), FN: sL(58.08), F: sL(59.74), WH: sL(60.08), E: sL(60.4) };
  const PHOME = [0, -1.2, 2.8], GEM = [0, 5, 2.9], GEMR = 6.7, CYAW = 0.06;   /* CYAW: retningen til kameraet i stillheten (krystallens forside vender dit, så sprekkene brer seg fra tegnet) */
  const PROAR = { Neck1: [0, 0.17, 0], Neck2: [0, 0.13, 0], Neck3: [0, 0.09, 0], Head: [0, 0.1, 0], Jaw: [0, -0.85, 0], Spine1: [0, 0.08, 0], Spine2: [0, 0.14, 0], Hips: [0, -0.05, 0], Tail2: [0, 0.1, 0], Tail3: [0, 0.1, 0], '*Arm': [-0.35, 0.15, 0.75], '*Hand': [0.3, 0, 0] };
  const PDUCK = { Neck1: [0, -0.18, 0], Neck2: [0, -0.1, 0], Neck3: [0, -0.06, 0], Head: [0, -0.12, 0], Spine2: [0, -0.08, 0], '*Arm': [0, -0.25, -0.2] };
  /* Lavabombene i filmen: [kastes (s etter brølet), flytid, x, z, størrelse]. De slår ned på slagene i låta (0:58,58 · 58,83 · 59,08 · 59,33 · 59,58). */
  const PBOMB = [[0.12, 2.38, 13, -8, 1.3], [0.3, 2.45, -24, -30, 1], [0.5, 2.5, 26, -34, 1.05], [0.62, 2.63, -10, -17, 1.1], [0.8, 2.7, 20, -15, 1.15]];
  /* Fontenene i lavasjøen rundt ham: [x, z, høyde, forsinkelse]. Trykket kommer fra fjellet, så de bakerste bryter ut først. */
  const PFNT = [[14, -16, 1.25, 0], [-24, -8, 1.1, 0.06], [8.5, -1, 1.15, 0.14], [-9, 4, 1, 0.2]];
  /* Lynet inne i skyen, på slagene: [når, styrke, x, z (fra fjellets akse), radius]. */
  const PLT = [[PT.B2, 1, 26, 46, 70], [sL(57.33), 0.8, -84, 96, 80], [sL(57.58), 0.9, 96, 118, 76], [sL(58.58), 1, -34, 186, 92], [sL(59.33), 0.85, 128, 74, 80], [sL(59.58), 0.7, -110, 150, 84]];
  const pdbg = S => { if (window.SKCAM) K.cam(...window.SKCAM); if (window.HOOK) window.HOOK(S); };   /* kroken til prøveverktøyet (eget kamera, egen kode etter act); gjør ingenting i appen */
  /* ---------- BEVEGELSEN i Primal-filmen (Opus 25.11; se «BEVEGELSEN» over). Nøkkelposene (arket: work/raids3d/groudon/bevegelse/poser.jpg):
     P1 kampstillingen (STAT 0,2: filmen starter i kampen) · P2 rasende og sammentrukket (DUCK), og han krymper seg på hvert trommeslag mens lyset slår inn i ham ·
     P3 Primal i lyset (PDUCK; tre frosne bilder i smellet 5,98) · P4 han reiser seg tungt, synker litt først (dykket, 10 %) og samler krefter (roten og brystet leder, så armene, nakken og hodet, som ser opp, snur seg litt mot kameraet og faller på plass) ·
     P5 står (PDUCK 0,2) · P6 oppladningen (synker sammen mer og mer, skjelver) · P7 krøket (PDUCK 1,28: forvarselet, nesten i ro før slaget) · P8 brølet på
     cymbalslaget 9,98 (PBROL: kjeven og brystet først, hodet kastes forbi, armene ut, klørne sist; alt slippes på slaget) · P9 holdet (brølet slakker 30 % mot slutten, som før). */
  const PBROL = { Neck1: [0, 0.17, 0], Neck2: [0, 0.13, 0], Neck3: [0, 0.09, 0], Head: [0, 0.1, 0], Jaw: [0, -0.85, 0], Spine1: [0, 0.08, 0], Spine2: [0, 0.14, 0], '*Arm': [-0.35, 0.15, 0.75], '*Hand': [0.3, 0, 0] };   /* PROAR uten Hips: på Primal er Hips hoftene med beina, og føttene skled 0,25 i brølet */
  const PKROK = { Spine1: [0, -0.03, 0.02] }, PVRI = { Spine1: [0, 0, -0.025], Spine2: [0, 0, -0.02], Neck1: [0, 0, -0.03] }, PHALE = { Tail1: [0, 0.04, 0], Tail2: [0, 0.1, 0], Tail3: [0, 0.1, 0] };   /* krøket lener seg litt til siden; PVRI: overkroppen og hodet vris litt mot kameraet etter kastet (sporet blir en bue) */
  /* Ned i krøket: sakte først, så fortere, og mykt inn i bunnen (han dukker mer og mer, og er nesten i ro før slaget). */
  const leanP = t => Math.pow(sin(PI * seg(t, PT.Q + 0.35, PT.R - 0.05)), 2);   /* vekten i nedturen i krøket: størst midt i den raske delen av dykket (Primal, poseP og halen) */
  const dyk = u => { const v = Math.pow(c01(u), 1.7); return v * v * (3 - 2 * v); }, opp = u => { const v = Math.pow(c01(u), 1.5); return v * v * (3 - 2 * v); }, opp2 = u => { const v = Math.pow(c01(u), 1.25); return v * v * (3 - 2 * v); };   /* opp2: reisingen etter dykket (dykket samler kreftene, så kurven er mindre skjev og han reiser seg like sakte som før) */   /* opp: reisingen samler krefter først, så den ikke går med lik fart */
  /* Den vanlige formen (0–1,97): sammentrukket (DUCK) med en myk start, og et støt inn på hvert trommeslag; brystet først, så armene, nakken og hodet (litt etter
     hverandre), halen henger etter (kjede), og skjelvet sitter i overkroppen og kjeven (støy), ikke i roten. */
  const MVG = (() => { const bump = a => a < 0 ? 0 : a < 0.09 ? sm5(a / 0.09) : 1 - sm5(c01((a - 0.09) / 0.25)), dk = t => 0.9 * sm5(seg(t, 0.05, 0.75)) + PT.H.reduce((s, h) => s + 0.16 * bump(t - h), 0);   /* sm5: akselerasjonen starter og slutter i null (med io: rykk 0,78 og 0,88, kontrollen 25.11) */
    const grp = { ch: ['Spine2', 'Spine3'], nk: ['Neck1', 'Neck2'], hd: ['Head'], ar: ['*Arm'], hn: ['*Hand'] }, lag = { ch: 0, ar: 0.03, nk: 0.04, hd: 0.07, hn: 0.08 }, P = {}, sp = {}, KLO = { '*Hand': [-0.2, 0, 0.06] };   /* klørne knyttes og krummer seg på trommeslagene, sist (før sto hendene helt stille) */
    for (const k in grp) { P[k] = {}; for (const b of grp[k]) P[k][b] = DUCK[b] || KLO[b]; }
    for (const [k, f, z] of [['ch', 2.4, 0.5], ['nk', 2.1, 0.5], ['hd', 1.8, 0.45], ['ar', 1.9, 0.5], ['hn', 1.7, 0.5]]) sp[k] = X.follow(t => dk(t - lag[k]), { f, z, t0: 0 });
    const jw = X.follow(t => -0.3 * io(seg(t, 0.05, 0.6)), { f: 2.5, z: 0.6, t0: 0 });
    const tail = X.chain({ bones: HALEV, drive: t => [0, -0.12 * sp.ch(t), 0.03 * X.noise(t, 69, 0.3)], f: 1.2, fo: 0.85, z: 0.5, lim: 0.25, t0: 0 });
    return { dk, P, sp, jw, tail, lag }; })();
  const poseG = (g, t, nh) => { const A = MVG, str = io(seg(t, 0, 0.7)), dbg = G3D.dbgKey, tl = dbg ? null : A.tail.at(t);
    g.root.position.set(HOME[0], HOME[1], HOME[2]);
    g.add(STAT, 0.2); for (const k in A.P) g.add(A.P[k], dbg ? A.dk(t - A.lag[k]) : A.sp[k](t)); if (tl) tl.forEach((r, i) => g.add({ [HALEV[i]]: r }, 1));
    g.add({ Jaw: [0, dbg ? -0.3 * io(seg(t, 0.05, 0.6)) : A.jw(t), 0] }, 1);
    if (!dbg) g.add({ Spine2: [0.017 * X.noise(t, 63, 2.8), 0, 0.014 * X.noise(t, 64, 2.4)], Jaw: [0, 0.04 * X.noise(t, 61, 2.9), 0], Head: [0, 0, 0.014 * X.noise(t, 67, 2.2)] }, str * (0.6 + 0.4 * nh)); };   /* skjelvet: sterkere jo mer lys han har tatt inn; under 3 Hz (X.noise har et lag på 2,17 × farten: over det ble det flimmer og rykk i 30 bilder/s, kontrollen 25.11), litt større utslag så det fortsatt synes */
  /* Primal: nøklene per gruppe, roten (opp og ned) og halen. */
  const MVP = (() => { const S = PT.S, W = PT.W, Qc = PT.Q, R = PT.R, E = PT.E, J = v => ({ Jaw: [0, v, 0] }), pd = [[PDUCK, 1]], sta = [[PDUCK, 0.2], [J(-0.16), 1]],
      kr = [[PDUCK, 1.28], [PKROK, 1], [J(-0.24), 1]], ser = [[PDUCK, 0.08], [{ Head: [0, 0, -0.05] }, 1]], ses = [[PDUCK, 0.2], [J(-0.16), 1], [{ Head: [0, 0, -0.04] }, 1]], sen = [[PDUCK, 0.2], [{ Neck1: [0, 0, -0.03] }, 1]], pb = k => [[PDUCK, 0.2], [PBROL, k]], pv = k => [[PDUCK, 0.2], [PBROL, k], [PVRI, 1]], ende = [[PDUCK, 0.2], [PBROL, 0.7], [PVRI, 1], [J(-0.048), 1]];
    /* Retting etter kontrollen 25.11: brølet kom 0,2–0,45 s etter cymbalslaget (kjeven halvåpen først 10,22, armene ute først 10,5). Nå: krøket er forvarselet, og alt
       slippes på slaget med korte nøkler og stivere fjærer: kjeven åpner seg fra 9,88 og er halvåpen rundt 10,03, brystet halvveis 10,06, armene 10,07, nakken 10,09, hodet 10,11, klørne sist;
       toppen 0,05–0,15 s senere enn den gamle back(), og overskuddet fra fjærene. Reisingen fikk et lite dykk før (10 %, 0,27 s) og går litt forbi når han er oppe. */
    const kn = [[PDUCK, 1], [{ '*Hand': [-0.16, 0, 0] }, 1]], ko = [[PDUCK, 0.2], [{ '*Hand': [0.07, 0, 0] }, 1]], dd = [[PDUCK, 1.1]], up = k => [[PDUCK, k], [J(-0.16), 1]], upn = k => [[PDUCK, k], [{ Neck1: [0, 0, -0.03] }, 1]];
    const G = fjaerer(BENP, {
      ch: [[S + 0.1, pd], [S + 0.13, pd], [S + 0.4, dd], [W - 0.4, up(0.13), opp2], [W - 0.05, sta], [Qc, sta], [R - 0.34, kr, dyk], [R - 0.06, kr], [R + 0.07, pb(1)], [R + 0.32, pv(1)], [R + 1.3, pv(1.04)], [R + 2.6, pv(1)], [E, ende]],
      nk: [[S + 0.1, pd], [S + 0.16, pd], [S + 0.44, dd], [W - 0.3, upn(0.13), opp], [W + 0.05, sen], [Qc + 0.03, sen], [R - 0.31, kr, dyk], [R - 0.04, kr], [R + 0.1, pb(1)], [R + 0.36, pv(1)], [R + 1.35, pv(1.06)], [R + 2.6, pv(1)], [E, ende]],
      hd: [[S + 0.1, pd], [S + 0.2, pd], [S + 0.48, dd], [W - 0.25, ser, opp], [W + 0.08, ses], [Qc + 0.06, ses], [R - 0.28, kr, dyk], [R - 0.025, kr], [R + 0.12, pb(1.06)], [R + 0.5, pv(1)], [R + 1.4, pv(1.05)], [R + 2.6, pv(1)], [E, ende]],
      jw: [[S + 0.6, pd], [W - 0.45, pd], [W + 0.05, sta, opp], [Qc, sta], [R - 0.4, kr, dyk], [R - 0.1, kr], [R + 0.04, pb(1)], [R + 2.6, pb(1)], [E, ende]],   /* kjeven knurrer i krøket og åpner seg fra 0,1 s før slaget (halvåpen rundt 10,03) */
      ar: [[S + 0.1, pd], [S + 0.15, pd], [S + 0.42, dd], [W - 0.35, up(0.13), opp2], [W, sta], [Qc + 0.04, sta], [R - 0.3, kr, dyk], [R - 0.05, kr], [R + 0.09, pb(1)], [R + 2.6, pb(1)], [E, ende]],
      hn: [[S + 0.15, pd], [S + 0.5, kn], [W - 1.1, kn], [W - 0.4, ko], [W + 0.15, sta], [R - 0.02, sta],   /* klørne knyttes i dykket og åpner seg litt når han er oppe (før sto hendene stille hele reisingen) */ [R + 0.15, pb(1)], [R + 2.6, pb(1)], [E, ende]] },
      { ch: [1.4, 0.55, 2.8], nk: [1.3, 0.5, 2.6], hd: [1.2, 0.47, 2.4], jw: [2.1, 0.55, 2.8], ar: [1.1, 0.5, 2.8], hn: [0.95, 0.5, 2.4] }, S,
      t => io(seg(t, R - 0.14, R - 0.04)) * (1 - io(seg(t, R + 0.45, R + 0.9))));   /* stive fjærer i kastet (slutten av krøket og brølet), myke ellers (reisingen, nedturen i krøket og holdet) */
    const ry = fjaer([[S + 0.06, 0], [S + 0.36, -0.035], [W - 0.4, 0.065, opp2], [W - 0.05, 0.05], [Qc, 0.05], [R - 0.24, -0.13, dyk], [R - 0.05, -0.13], [R + 0.2, 0.06], [R + 0.9, 0.02]], 2.0, 0.55, S);
    const pitch = t => { const v = G.ch(t); return v[1] + v[4]; };
    const tail = haleK(HALEP, [[S, []], [R - 0.02, []], [R + 0.5, [[PHALE, 1]]], [E, [[PHALE, 0.7]]]], t => [0, 0.2 * pitch(t) - 0.3 * ry(t), 0.04 * X.noise(t, 83, 0.16) - 0.05 * leanP(t)], { f: 1.0, fo: 0.85, z: 0.6, lim: 0.25, t0: S, dk: 0.04 });   /* halen svinger litt mot vekten som motvekt */
    return t => { const tl = tail(t); return { g: { ch: G.ch(t), nk: G.nk(t), hd: G.hd(t), jw: G.jw(t), ar: G.ar(t), hn: G.hn(t) }, y: ry(t), tail: tl }; }; })();
  /* Stillingen til Primal i den nye bevegelsen: gruppene, halen, pusten (holdt i oppladningen og brølet), skjelvet i oppladningen og i brølet (støy i overkroppen,
     kjeven og klørne; langsomt, for en stor kropp dirrer sakte; aldri i roten, så føttene står), og nakken som presser i skriket. Gir roten sin x (0: føttene står). */
  const poseP = (p, A, t) => { const B = BENP, q = A.g; for (const k in B) putV(p, B[k], q[k]); A.tail.forEach((r, i) => p.add({ [HALEP[i]]: r }, 1));
    p.add({ Tail1: [0, 0, 0.04 * X.noise(t, 83, 0.16)] }, G3D.dbgKey ? 0 : 1);   /* halens rot svinger latt med ankeret */
    if (G3D.dbgKey) return 0;
    const R = PT.R, c2 = Math.pow(io(seg(t, PT.Q, R)), 2) * (1 - sm5(seg(t, R - 0.04, R + 0.16))), op = c01((-q.jw[1] - 0.24) / 0.61);   /* uten knekk ved slaget (før: skjelvet stoppet med et sprang i farten, og holdets støy kom inn med 28 % på R) */
    if (c2 > 0.001) p.add({ Spine1: [0.017 * X.noise(t, 84, 2.8), 0, 0.014 * X.noise(t, 85, 2.6)], Head: [0, 0.009 * X.noise(t, 86, 2.5), 0.016 * X.noise(t, 87, 2.3)], Jaw: [0, 0.028 * X.noise(t, 88, 2.9), 0], '*Hand': [0.034 * X.noise(t, 89, 2.1), 0, 0] }, c2);   /* skjelvet i oppladningen under 3 Hz (før 4–5,5 Hz: rykk i hender og kjeve, kontrollen 25.11) */
    if (op > 0.001) p.add({ Jaw: [0, 0.03 * X.noise(t, 51, 2.6) - 0.05 * pust(t, PT.R, 0.85, 99), 0], Head: [0, 0.008 * X.noise(t, 55, 1.8), 0.014 * X.noise(t, 53, 2.0)], Neck1: [0, 0.02 * X.noise(t, 47, 1.2), 0.006 * X.noise(t, 57, 2.0) + 0.014 * X.noise(t, 49, 0.9)], Neck2: [0, 0.012 * X.noise(t, 48, 1.2), 0], '*Hand': [0.012 * X.noise(t, 59, 2.6), 0, 0] }, op);
    const b = pust(t, PT.S + 0.1, 3.0, 77) * (1 - io(seg(t, PT.Q, PT.Q + 0.4))), b2 = pust(t - 0.5, PT.S + 0.1, 3.0, 77) * (1 - io(seg(t, PT.Q, PT.Q + 0.4)));   /* b2: nakken retter hodet etter brystet; pusten fra S + 0,1, så han står tre bilder i smellet (før fem) */
    if (b > 0.001 || b2 > 0.001) p.add({ Spine1: [0, 0.03 * b, 0], Spine2: [0, 0.018 * b, 0], Neck1: [0, -0.014 * b2, 0], '*Arm': [0, 0.02 * b, 0], Jaw: [0, -0.025 * b, 0] }, 1);   /* kjeven følger pusten (før gled den med lik fart mens han reiste seg) */
    { const u = seg(t, PT.S + 0.3, PT.W - 0.3), l = Math.pow(sin(PI * u), 2); if (l > 0.001) p.add({ Spine1: [0.022 * l, 0, 0] }, 1); }   /* vekten over på den ene siden mens han reiser seg (en bue, ikke en strek) */
    { const l = leanP(t); if (l > 0.001) p.add({ Spine1: [0.018 * l, 0, 0.022 * l] }, 1); }   /* nedturen i krøket: vekten går litt over på den ene siden og tilbake, så hodet synker i en bue (før en rett strek) */
    { const v = seg(t, PT.S + 0.78, PT.W - 0.2), w = seg(t, PT.S + 0.98, PT.W), l = Math.pow(sin(PI * v), 2), l2 = Math.pow(sin(PI * w), 2);   /* og en liten vridning mot oss 0,2 s etter at reisingen starter, nakken 0,2 s etter brystet: hodet går i bue (før nesten rett, kontrollen 25.11) */
      if (l > 0.001 || l2 > 0.001) p.add({ Spine1: [0, 0, -0.026 * l], Neck1: [0, 0, -0.03 * l2] }, 1); }
    return 0; };
  /* Kameraene med liv (camLive), ett per klipp; banene er de samme som før. */
  const CAMP = [
    camLive(t => { const e = io(c01(t / (PT.G1 - 0.03))); return [mix(4.4, 3.4, e), 1.7, mix(22, 19, e), -0.4, 5, 2.6, 46, -0.03]; }, { t0: 0, tIn: 0, amp: [0.04, 0.025], seed: 21 }),
    camLive(t => { const e = io(c01((t - PT.G1 + 0.03) / (PT.C - PT.G1 + 0.03))); return [mix(-6, -5.2, e), mix(2, 2.35, e), mix(23.5, 21, e), mix(-2.3, -1.6, e), mix(6.6, 6.4, e), mix(3.8, 1.3, e), 46, 0.03]; }, { t0: PT.G1 - 0.03, tIn: PT.G1 - 0.03, amp: [0.04, 0.025], seed: 22 }),
    camLive(t => { const e = io(seg(t, PT.C, PT.S)), d = mix(25.5, 23.6, e); return [GEM[0] + sin(CYAW) * d, mix(3.1, 3.3, e), GEM[2] + cos(CYAW) * d, GEM[0], mix(5.9, 5.7, e), GEM[2], 46, 0]; }, { t0: PT.C, tIn: PT.C, amp: [0.02, 0.012], seed: 23 }),
    camLive(t => { const e = io(c01((t - PT.CU) / (PT.W - PT.CU))); return [mix(8.4, 4.4, e), mix(1.3, 4.9, e), mix(10.8, 16.5, e), mix(3.3, 0.2, e), mix(1.9, 8.4, e), mix(2.6, 6.4, e), mix(40, 42, e), -0.05]; }, { t0: PT.CU, tIn: PT.CU, amp: [0.025, 0.018], seed: 24 }),
    camLive(t => { const e = io(c01((t - PT.W) / (PT.E - PT.W))), k = seg(t, PT.R + 0.1, PT.R + 2.9), e2 = k * k * k * (k * (k * 6 - 15) + 10), w = 0.04 * sin(t * 0.5);
      return [10 + 0.1 * e + 0.4 * e2 + w * 3, 1.45 + 0.15 * e, 19.3 + 0.5 * e + 3 * e2, 1.7 + 0.3 * e + 0.9 * e2, 5.35 - 0.15 * e2, 0.2, 58 + 3 * e + 9 * e2, -0.045]; }, { t0: PT.W, tIn: PT.W, amp: [0.05, 0.03], seed: 25 })];
  G3D.def('c3:383p', vendt({
    len: PT.E, R: PT.R, at: 168.1, models: ['groudon', 'groudon_primal'],   /* at: låta står på tl.pre når filmen starter (verktøyene spiller låta derfra, med sløyfa) */
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
      volcano(S, T, 1); filmVol(S, T, 1); burn(S, T); S.boom2 = PT.B2 - PT.R;
      S.bomb = bombs(S, PBOMB, 1800);
      /* Smellet i fjellet (filmens eget; volcano sine gnister er lys oppå lys og blir en hvit ball): en smal stråle av lava fra flenga (pjet), blokker som
         kastes ut (pblk), og en sky av aske som velter opp og ut, glødende innenfra og mørk utenpå (pcau). */
      { const V = S.V, VT = [V.x, V.h * 0.8, V.z], hc = ['#fff2a8', '#ffa020', '#c83008'], d2 = PT.B2 - PT.R, add = m => { S.scene.add(m); return m; };
        S.pjet = add(K.pts(70, i => { const a = rnd(i, 2101) * TAU, q = rnd(i, 2102); return { p: [VT[0] + cos(a) * 5 * q, VT[1], VT[2] + sin(a) * 5 * q], v: [cos(a) * (3 + 9 * q) + 2, 46 + rnd(i, 2103) * 52, sin(a) * (3 + 9 * q)], b: rnd(i, 2104) * 2.6, l: 2.6, z: 3 + rnd(i, 2105) * 3.5 }; }, { loop: 1, add: 1, g: 34, px: 150, sz0: 1.1, sz1: 0.6, c: hc, a: 0, fade: 0.6 }));
        S.pblk = add(K.pts(22, i => { const a = rnd(i, 2111) * TAU, el = 0.5 + rnd(i, 2112) * 0.9, v = 70 + rnd(i, 2113) * 80; return { p: [VT[0], VT[1] + 4, VT[2]], v: [cos(a) * cos(el) * v, sin(el) * v, sin(a) * cos(el) * v], b: rnd(i, 2114) * 0.12 + (i % 3 === 0 ? d2 : 0), l: 3 + rnd(i, 2115) * 1.5, z: 3.2 + rnd(i, 2116) * 3 }; }, { t0: -1e5, add: 1, g: 38, px: 150, sz0: 1.15, sz1: 0.6, c: ['#fff6d0', '#ffa830', '#b82a08'], fade: 0.8 }));
        S.pfire = add(K.pts(44, i => { const a = rnd(i, 2131) * TAU, el = 0.1 + rnd(i, 2132) * 1.3, v = 34 + rnd(i, 2133) * 44; return { p: [VT[0] + cos(a) * 5, VT[1] + 3, VT[2] + sin(a) * 5], v: [cos(a) * cos(el) * v, sin(el) * v + 10, sin(a) * cos(el) * v], b: rnd(i, 2134) * 0.1 + (i % 3 === 0 ? d2 : 0), l: 1.6 + rnd(i, 2135) * 1.0, z: 44 + rnd(i, 2136) * 44 }; }, { t0: -1e5, shade: 1, drag: 1.7, sz0: 0.3, sz1: 1.7, px: 150, c: ['#ffb44a', '#e04a16', '#2a100e'], a: 0.96, fade: 0.7 }));
        S.pcau = add(K.pts(56, i => { const a = rnd(i, 2121) * TAU, el = 0.25 + rnd(i, 2122) * 1.2, v = 46 + rnd(i, 2123) * 50; return { p: [VT[0] + cos(a) * 8, VT[1] + 2, VT[2] + sin(a) * 8], v: [cos(a) * cos(el) * v, sin(el) * v * 1.25 + 14, sin(a) * cos(el) * v], b: 0.15 + rnd(i, 2124) * 0.3 + (i % 4 === 0 ? d2 : 0), l: 4 + rnd(i, 2125) * 2, z: 46 + rnd(i, 2126) * 60 }; }, { t0: -1e5, shade: 1, drag: 1.6, sz0: 0.3, sz1: 1.9, px: 150, c: ['#a04a22', '#341a17', '#100b0c'], a: 0.95, fade: 0.6 })); S.pcau.renderOrder = -1;
        /* Blokkene som kastes ut til alle kanter, med røykhale (bombs): de tegner utbruddet som stråler fra toppen. */
        S.parc = bombs(S, [[0, 3.2, -260, -250, 1.6], [0.05, 3.6, 150, -200, 1.7], [0.1, 3, -150, -420, 1.4], [0.12, 3.4, 60, -520, 1.5], [0.5, 3.3, -330, -330, 1.6], [0.55, 3.5, 230, -320, 1.7], [0.6, 2.9, -90, -160, 1.5], [0.62, 3.1, 40, -150, 1.5]], 2200); }
      /* Fontenene i lavasjøen: en søyle av rennende lava med fillete kanter og topp (en maske, så den er en form og ikke lys oppå lys), klumper som kastes av toppen
         og faller rundt den, noen gnister, og et lys ved foten. */
      const hot = ['#ffe9a0', '#ff8a1c', '#a82a06'], fg = new T.LatheGeometry([[1, 0], [0.66, 0.22], [0.52, 0.5], [0.6, 0.76], [0.92, 0.94], [1.1, 1]].map(q => new T.Vector2(q[0], q[1])), 16);
      S.fnt = PFNT.map(([x, z, hs, dl], k) => { const H = 11.5 * hs, R = 1.7 * Math.sqrt(hs), m = new T.Mesh(fg, K.shader(K.GLSL.VS, FS_FNT, { uSd: K.uv(k * 3.7 + 1), uOn: K.uv(0) }, { side: T.DoubleSide })); m.position.set(x, -0.1, z); m.scale.set(R, H, R); m.visible = false; S.scene.add(m);
        const mk = (n, sd, o, f) => { const q = K.pts(n, f, Object.assign({ g: 30, px: 60, floor: 0, near: 5, c: hot, fade: 0.97 }, o)); q.position.set(x, 0, z); S.scene.add(q); return q; };
        const clot = mk(26, 1950 + k * 9, { loop: 1, shade: 1, a: 0 }, i => { const a = rnd(i, 1951 + k) * TAU, w = 1.4 + rnd(i, 1952 + k) * 3.4, v = 6 + rnd(i, 1953 + k) * 9; return { p: [cos(a) * R * 0.7, H * (0.72 + rnd(i, 1954 + k) * 0.22), sin(a) * R * 0.7], v: [cos(a) * w, v, sin(a) * w], b: rnd(i, 1955 + k) * 2.4, l: (v + Math.sqrt(v * v + 60 * H * 0.8)) / 30, z: 0.9 + rnd(i, 1956 + k) * 1.1 }; });
        const one = mk(30, 1910 + k * 9, { t0: -1e5, shade: 1 }, i => { const a = rnd(i, 1911 + k) * TAU, w = 1 + rnd(i, 1912 + k) * 4.5, v = (20 + rnd(i, 1913 + k) * 12) * Math.sqrt(hs); return { p: [cos(a) * R * 0.5, 0.2, sin(a) * R * 0.5], v: [cos(a) * w, v, sin(a) * w], b: rnd(i, 1914 + k) * 0.1, l: 2 * v / 30 + 0.05, z: 1 + rnd(i, 1915 + k) * 1.3 }; });
        const sp = mk(18, 1990 + k * 9, { t0: -1e5, add: 1 }, i => { const a = rnd(i, 1991 + k) * TAU, w = 2 + rnd(i, 1992 + k) * 6, v = (22 + rnd(i, 1993 + k) * 16) * Math.sqrt(hs); return { p: [0, 0.3, 0], v: [cos(a) * w, v, sin(a) * w], b: rnd(i, 1994 + k) * 0.08, l: 2 * v / 30, z: 0.35 + rnd(i, 1995 + k) * 0.4 }; });
        const lt = K.light(1, '#ff8a2a'); lt.position.set(x, 1.6, z); S.scene.add(lt);
        return { m, clot, one, sp, lt, x, z, hs, dl, H }; });
      return S;
    },
    act(S, t, o) {
      const g = S.gr, p = S.pg, U = K.U(), L = S.lava.material.uniforms, pre = t < PT.S, gm = S.gem.material.uniforms, R1 = t >= PT.R, V = S.V;
      g.root.visible = t < PT.G1 - 0.03; p.root.visible = !pre;
      /* 1 Groudon (vanlig form): rasende, sammentrukket og skjelvende. Lyset samler seg om ham i støt på trommeslagene: for hvert slag er han mer lys, til han er bare lys. */
      const pul = PT.H.reduce((s, h) => max(s, hit(t, h, 0.26)), 0), nh = PT.H.filter(h => t >= h).length / PT.H.length, lastH = PT.H.reduce((s, h) => t >= h ? h : s, -9);
      if (STIV()) { const str = io(seg(t, 0, 0.7)); g.root.position.set(HOME[0] + 0.03 * sin(t * 61) * str, HOME[1], HOME[2]);
        g.add(STAT, 0.2); g.add(DUCK, 0.9 * str); g.add({ Jaw: [0, -0.3, 0] }, str); g.rot('Jaw', 0, 0.03 * sin(t * 48) * str, 0); }
      else poseG(g, t, nh);   /* den nye bevegelsen (Opus 25.11) */
      g.mats.Eye1.uniforms.uUvOff.value.set(0, 0.75); g.set('uStone', 0); g.set('uCrack', 0); g.set('uFlC', '#ffb4e6'); g.set('uFlK', min(1, 0.22 * io(seg(t, 0.12, 0.5)) + 0.66 * nh + 0.2 * pul + 0.2 * seg(t, PT.G1 - 0.2, PT.G1)));
      /* 2 Krystallen: står der hel i blinket (G1) og faller på plass, dreier sakte, og lyset i den dør i åtte trinn på virvelen. I stillheten står den svart og helt i ro
         med forsiden mot kameraet: Ω tennes (O), sprekkene brer seg fra tegnet (K), den skjelver, og lyset presser på i suget før slaget (SW). */
      const gk = seg(t, PT.G1 - 0.03, PT.G1 + 0.3), nd = PT.D.reduce((s, h) => s + eo(seg(t, h - 0.02, h + 0.05)), 0) / PT.D.length, spin = CYAW - 0.22 * max(0, PT.C - t);
      S.gem.visible = t >= PT.G1 - 0.03 && pre; S.gem.scale.setScalar(GEMR * (pre ? mix(0.8, 1, back(gk, 1.6)) + 0.012 * sin(t * 40) * seg(t, PT.K, PT.S) : 1)); S.gem.rotation.set(0.08 * sin((spin - CYAW) * 1.3), spin, 0);
      gm.uAl.value = 1; gm.uDark.value = 0.96 * nd; gm.uCrk.value = t >= PT.K ? 1 : 0; gm.uCrkR.value = 2.3 * (0.6 * eo(seg(t, PT.K, PT.SW)) + 0.4 * ei(seg(t, PT.SW, PT.S - 0.04))); lerpC(gm.uCrkC, '#ffc21e', '#fff6c0', seg(t, PT.SW, PT.S));
      S.motes.visible = t < PT.G1 + 0.2; S.motes.material.uniforms.uA.value = seg(t, 0.1, 0.5) * (1 - seg(t, PT.G1 - 0.2, PT.G1 + 0.2)) * (0.75 + 0.5 * pul);
      K.face(S.aura); S.aura.position.set(GEM[0], GEM[1], GEM[2] - 1); S.aura.scale.setScalar(15 + 9 * seg(t, 0, PT.G1) + 5 * pul); S.aura.visible = t < PT.C;
      S.aura.material.uniforms.uA.value = t < PT.G1 ? 0.25 * io(seg(t, 0.1, 0.5)) + 0.45 * nh + 0.25 * pul : (0.1 + 0.5 * hit(t, PT.G1, 0.4) + 0.2 * hit(t, PT.GL, 0.3)) * (1 - nd);
      const om = t >= PT.O && pre ? min(1, (t - PT.O) / 0.25) * (0.82 + 0.18 * sin((t - PT.O) * (5 + 9 * seg(t, PT.K, PT.S)))) : 0; S.om = om;
      /* 3 Krystallen knuses (S): skår og støv, et lysglimt, og Primal Groudon står der. Han kommer ut av lyset, reiser seg sakte, og lader opp (Q til R): synker sammen,
         skjelver mer og mer, årene blusser i takt, og lavaen rundt ham koker, før brølet. */
      S.sh1.at(t, PT.S, { g: 16 }); S.sh2.at(t, PT.S, { g: 16 }); S.puff.material.uniforms.uT0.value = PT.S;
      K.face(S.burst); S.burst.position.set(GEM[0], GEM[1], GEM[2]); S.burst.scale.setScalar(pre ? 10 + 16 * seg(t, PT.SW, PT.S) : 26 + 70 * eo(seg(t, PT.S, PT.S + 0.5))); S.burst.material.uniforms.uA.value = pre ? 0.8 * ei(seg(t, PT.SW, PT.S)) : 0.7 * hit(t, PT.S, 0.28); S.burst.visible = t > PT.SW && t < PT.S + 0.3;
      const chg = t < PT.R ? seg(t, PT.Q, PT.R) : 0, chp = (t - PT.Q) * (9 + 7 * chg); let rw, ry;
      if (STIV()) { const rise = io(seg(t, PT.S + 0.25, PT.W)); rw = t < PT.R ? 0 : back(seg(t, PT.R, PT.R + 0.3), 2.6) * (1 - 0.3 * io(seg(t, PT.R + 2.6, PT.E))); ry = PHOME[1] - 0.4 * sq(t, PT.S, 11, 4) + 0.14 * sq(t, PT.R, 14, 4) - 0.12 * io(chg);
        p.root.position.set(PHOME[0] + 0.03 * sin(t * 53) * chg * chg, ry, PHOME[2]);
        p.add(PDUCK, (1 - 0.8 * rise) + kf(t, [[PT.Q, 0], [PT.R - 0.5, 0.75, io], [PT.R - 0.16, 0.98, io], [PT.R - 0.03, 1.22, ei], [PT.R + 0.1, 0, eo]])); S.chg = chg;
        const br = 0.03 * sin(t * 3.1) * (!pre ? 1 : 0); p.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0], Jaw: [0, -0.16 * rise * (1 - rw), 0] }, 1); for (let i = 1; i <= 5; i++) p.rot('Tail' + i, 0, 0, 0.05 * sin(t * 2.1 + i * 0.55));
        p.add(PROAR, rw); p.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); p.rot('Head', 0, 0, 0.022 * sin(t * 43) * rw); S.rw = rw; S.mouth = null; }
      else { const A = MVP(t); ry = PHOME[1] + A.y; const sx = poseP(p, A, t); p.root.position.set(PHOME[0] + sx, ry, PHOME[2]); S.chg = chg;   /* den nye bevegelsen (Opus 25.11) */
        rw = S.rw = min(1.25, max(0, (-A.g.jw[1] - 0.24) / 0.61)); S.mouth = null; }   /* hvor åpen kjeften er i brølet (fra knurret 0,24 til helt oppe), til gløden og gnistene; kjeven åpner seg fra 0,1 s før slaget, og rw følger den uten sprang, også forbi 1 når kjeven går forbi (som back() før: gnistene topper som i dag) */
      p.eye(0, t > PT.R - 0.6 ? 0.75 : 0, 0.6);
      /* Årene av magma: gløder fra han kommer fram, pulserer som et hjerte, og blusser i brølet. */
      veins(p, pre ? 0 : 0.95 + 0.22 * sin(t * 4.2) + 0.5 * rw + 0.6 * hit(t, PT.S, 0.8) + chg * (0.35 + 0.3 * sin(chp)), c01(0.3 * rw + hit(t, PT.S, 0.7) + hit(t, PT.R, 0.6)));
      p.set('uFlC', '#fff4c8'); p.set('uFlK', pre ? 0 : 0.9 * (1 - eo(seg(t, PT.S, PT.S + 0.4))));
      /* Himmelen brenner (fra brølet): toppen er borte, søylen står, taket av aske brer seg inn over oss (rk), skredene går, og lynet går inne i skyen på slagene. */
      const ra = t - PT.R - 0.35, rk = seg(t, PT.R + 0.8, PT.R + 3.4), lt = PLT.filter(q => t >= q[0] && t < q[0] + 0.6).slice(-4).map(q => [t - q[0], q[1], q[2], q[3], q[4]]);
      burnAct(S, t, { top: t >= PT.R + 0.04, roofR: ra > 0 ? 36 + 190 * Math.pow(ra, 0.67) : 0, roofA: seg(t, PT.R + 0.35, PT.R + 0.8), hot: 1 + 0.6 * hit(t, PT.R, 3), col: seg(t, PT.R + 0.25, PT.R + 1.1), flow: R1 ? [PT.R + 0.2, PT.R + 0.2, PT.R + 0.2, PT.R + 0.2] : null, L: lt });
      S.bomb.at(R1 ? PT.R : -1e5); S.bomb.show(R1);
      /* Stedet: lavaen blir varmere for hvert trinn, og lyset skifter fra rosa (krystallen) til hvitglødende. Mens lyset i krystallen dør, mørkner alt (det mørke
         rommet), og i stillheten står stedet nesten svart. Når taket lukker seg, forsvinner lyset ovenfra, og bare ilden nedenfra er igjen. */
      const post = pre ? 0 : 1, dk = pre ? nd : 0, hot = 0.75 + 0.1 * seg(t, PT.O, PT.S) + 0.15 * post; S.wake = hot * (1 - 0.5 * dk); S.heat = 0; S.dk = dk; S.rk = rk;
      L.uHeat.value = min(1.42, 1 + 0.12 * seg(t, PT.O, PT.S) + 0.22 * post + 0.2 * hit(t, PT.S, 1.2) + 0.12 * hit(t, PT.R, 1.6) + 0.14 * chg + 0.12 * hit(t, PT.FN, 1.5)) - 0.25 * dk; L.uBri.value = 0.95 - 0.5 * dk - 0.14 * rk; U.uGlow.value = (1 + 0.2 * post + 0.25 * rw + 0.25 * rk) * (1 - 0.55 * dk);
      if (pre) { col3(U.uKeyC, c01(seg(t, 0.2, PT.G1)), '#fff0dc', '#ffdcee', '#ffc8ea'); lerpC(U.uShC, '#3c1a22', '#3a1830', seg(t, 0.2, PT.G1)); U.uKeyC.value.multiplyScalar(1 - 0.62 * dk); U.uShC.value.multiplyScalar(1 - 0.5 * dk); }
      else { lerpC(U.uKeyC, '#fff8e0', '#fff0d2', seg(t, PT.S, PT.S + 0.6)); lerpC(U.uShC, '#3c1a22', '#42181a', 1); if (rk > 0) { lerpC(U.uKeyC, '#fff0d2', '#d8a080', rk); lerpC(U.uShC, '#42181a', '#2e0f11', rk); } if (S.rlit > 0.02) { const c = U.uKeyC.value, k = 0.3 * min(1, S.rlit); c.setRGB(mix(c.r, 0.86, k), mix(c.g, 0.78, k), mix(c.b, 1, k)); } }
      U.uRimK.value = 1; U.uFog.value.set(60 - 16 * rk, 300 - 50 * rk, 0.8 + 0.08 * rk);
      for (const m of S.cry) m.uniforms.uPulse.value = 0.5 * (1 - 0.7 * dk);
      /* Ringene i lavaen: lyset som trekkes inn mot ham på slagene, krystallen, tegnet, knuset, brølet, og trykkbølgen fra fjellet som når ham på FN. */
      const ring = (i, x, z, r, a) => L.uRing.value[i].set(x, z, r, a), age = t - lastH;
      if (t < PT.G1) ring(0, GEM[0], GEM[2], 17 - 14 * eo(c01(age / 0.26)), age >= 0 && age < 0.3 ? 0.8 * (1 - age / 0.3) : 0);
      else { const t0 = t < PT.O ? PT.G1 : t < PT.S ? PT.O : PT.S; ring(0, GEM[0], GEM[2], 1.5 + (t - t0) * (t < PT.O ? 12 : t < PT.S ? 5 : 26), (t < PT.O ? 1 - nd : t < PT.S ? 1 : 0.55) * hit(t, t0, 1.6)); }
      ring(1, PHOME[0], PHOME[2], 1.5 + (t - PT.R) * 30, R1 ? 0.55 * hit(t, PT.R, 1.7) : 0);
      { const dv = Math.hypot(PHOME[0] - V.x, PHOME[2] - V.z), v = dv / (PT.FN - PT.R); ring(2, V.x, V.z, max(1, (t - PT.R) * v), R1 && t < PT.FN + 0.5 ? 0.85 * seg(t, PT.R + 0.6, PT.R + 1.4) * (1 - seg(t, PT.FN, PT.FN + 0.5)) : 0); }
      ring(3, PHOME[0], PHOME[2], 5 + (t - PT.FN) * 16, t >= PT.FN ? hit(t, PT.FN, 1.5) : 0);
      L.uWade.value.set(PHOME[0], PHOME[2] + 0.3, pre ? 9.5 : 11, (0.95 + 0.2 * post + 0.25 * hit(t, PT.S, 1.2)) * (1 - 0.5 * dk));
      S.fx(S.spl[0], PT.S, GEM[0], 0, GEM[2] + 1); S.fx(S.dust[0], PT.S, GEM[0], 0.2, GEM[2] + 1);
      S.drip.position.set(PHOME[0], ry + 1, PHOME[2]); S.drip.visible = !pre && t < PT.S + 3; S.drip.material.uniforms.uPx.value = 150 * (1 - seg(t, PT.S + 1.6, PT.S + 3));
      S.ring.position.set(GEM[0], 0.6, GEM[2]); const rt0 = PT.S, ra2 = t >= PT.S ? 0.4 * hit(t, rt0, 0.8) : 0; S.ring.scale.setScalar(3 + (t - rt0) * 46); S.ring.material.uniforms.uA.value = ra2; S.ring.visible = ra2 > 0;
      S.embers.material.uniforms.uPx.value = 120 * (1 + 0.4 * post + 0.2 * rk); S.embers.material.uniforms.uA.value = 1 - 0.6 * dk;
      /* Fontenene: det første kastet idet trykket når dem; søylen skyter opp forbi høyden sin og faller på plass, og den puster. */
      for (const f of S.fnt) { const t0 = PT.FN + f.dl, a = t - t0, on = a >= 0, up = back(seg(a, 0, 0.42), 2.2) * (0.92 + 0.08 * sin(t * 6.3 + f.x));
        f.m.visible = on; f.m.material.uniforms.uOn.value = up; f.one.material.uniforms.uT0.value = f.sp.material.uniforms.uT0.value = on ? t0 : -1e5; f.one.visible = f.sp.visible = on && a < 2.4; f.clot.visible = a > 0.3; f.clot.material.uniforms.uA.value = seg(a, 0.3, 0.7);
        K.face(f.lt); f.lt.scale.setScalar(8 + 6 * hit(a, 0, 0.5)); f.lt.material.uniforms.uA.value = on ? 0.26 + 0.4 * hit(a, 0, 0.4) : 0; f.lt.visible = on; }
      /* Vulkanen (Jazz 18.11, runde 6): utbruddet starter IKKE før brølet. Fram til da ryker den bare tyngre, og i stillheten holder også den pusten. */
      volcAct(S, t, (0.42 + 0.1 * seg(t, 0, PT.G1) + 0.2 * (S.chg || 0)) * (1 - 0.45 * dk) + 0.12 * seg(t, PT.S, PT.Q) + (R1 ? 1.3 + 0.5 * hit(t, PT.R, 2.5) : 0), PT.R, PT.R);
      for (const q of [S.vboom, S.vboom2, S.vfnt, S.vash, S.vrain]) q.visible = !R1; S.vspat.visible = t < PT.R + 0.3;
      for (const q of [S.pblk, S.pcau, S.pfire]) { q.material.uniforms.uT0.value = R1 ? PT.R : -1e5; q.visible = R1; } S.parc.at(R1 ? PT.R : -1e5); S.parc.show(R1); S.pjet.visible = R1; S.pjet.material.uniforms.uA.value = 0.5 * seg(t, PT.R, PT.R + 0.3);
      if (R1) { const a = t - PT.R; S.vflash.scale.setScalar(a < 0.25 ? 50 + 120 * eo(c01(a / 0.2)) : 60); S.vflash.material.uniforms.uA.value = max(0.6 * hit(t, PT.R, 0.16), 0.4 * hit(t, PT.B2, 0.14), 0.1); S.vflash.visible = true; S.boom = 0.8 * hit(t, PT.R, 0.7); }   /* blinket er kort (to–fire bilder) */
      S.erupt = R1 ? 1.7 * eo(seg(t, PT.R, PT.R + 1.4)) : 0; S.smoke = R1 ? 0.5 * seg(t, PT.R + 0.6, PT.R + 3) : 0; S.lit = pre ? 0.72 - 0.42 * dk : R1 ? 1 - 0.25 * rk : 0.82; S.sun = 0; S.roofK = R1 ? seg(t, PT.R + 0.4, PT.R + 1.6) : 0;
    },
    shots: [
      /* 1 Lyset samler seg om ham (lavt, forfra); kameraet siger inn, og bildet rykker på trommeslagene. */
      [0, (S, u, a, t) => { const e = io(u), pul = PT.H.reduce((s, h) => max(s, hit(t, h, 0.2)), 0); if (STIV()) K.cam(mix(4.4, 3.4, e), 1.7, mix(22, 19, e), -0.4, 5, 2.6, 46, -0.03); else camV(CAMP[0](t)); S.post.fl = max(1 - seg(t, 0, 0.35), 0.85 * seg(t, PT.G1 - 0.14, PT.G1)); S.post.flc = t < 1 ? '#ffffff' : '#ffd6f2'; S.post.sh = X.rk(S, 1.2 * seg(t, 0, 0.6), 1.6) + X.tatt(S, 1.6 * pul); PT.H.forEach(h => X.ev(S, 'f', t - h, 1.4));  pdbg(S); }],
      /* 2 Krystallen: fra siden, med vulkanen bak. Kameraet glir sakte inn mens lyset i den dør på virvelen. */
      [PT.G1 - 0.03, (S, u, a, t) => { const e = io(u); if (STIV()) K.cam(mix(-6, -5.2, e), mix(2, 2.35, e), mix(23.5, 21, e), mix(-2.3, -1.6, e), mix(6.6, 6.4, e), mix(3.8, 1.3, e), 46, 0.03); else camV(CAMP[1](t));   /* krystallen og vulkanen ligger begge innenfor x 64–448 (smal skjerm) */
        S.post.fl = max(t < PT.G1 ? 0.85 : 0.85 * hit(t, PT.G1, 0.3), 0.28 * hit(t, PT.GL, 0.14)); S.post.flc = '#ffd6f2'; S.post.sh = X.hk(S, t, PT.G1, 0.5, 1.4) + X.hk(S, t, PT.GL, 0.3, 0.9) + PT.D.reduce((s, h) => s + X.hk(S, t, h, 0.1, 0.7, 'p'), 0); S.post.heat = 0.6;  pdbg(S); }],
      /* 3 STILLHETEN: klipp rett forfra idet musikken faller ut. Den svarte krystallen fyller bildet, og kameraet siger nesten umerkelig inn. Ω tennes, sprekkene brer
         seg, og på smellet knuses den mot oss. Primal Groudon står der i lyset. */
      [PT.C, (S, u, a, t) => { const e = io(seg(t, PT.C, PT.S)), d = mix(25.5, 23.6, e); if (STIV()) K.cam(GEM[0] + sin(CYAW) * d, mix(3.1, 3.3, e), GEM[2] + cos(CYAW) * d, GEM[0], mix(5.9, 5.7, e), GEM[2], 46); else camV(CAMP[2](t));
        S.post.fl = max(0.45 * hit(t, PT.O, 0.2), t < PT.S ? ei(seg(t, PT.S - 0.2, PT.S)) * 0.8 : 0.9 * hit(t, PT.S, 0.1)); S.post.flc = '#fff2b8';
        S.post.sh = X.hk(S, t, PT.O, 0.4, 1.2) + X.rk(S, 2.4 * ei(seg(t, PT.K, PT.S)) * (t < PT.S ? 1 : 0), 2.3) + X.hk(S, t, PT.S, 0.6, 6, 'e'); S.post.heat = 0.3; S.post.vig = 0.5 + 0.3 * (S.dk || 0);  pdbg(S); }],
      /* 4 Primal Groudon i ett langt nærbilde: fra kneet med Ω-merket og oppover kroppen til ansiktet, mens årene gløder og han reiser seg. */
      [PT.CU, (S, u, a, t) => { const e = io(u); if (STIV()) K.cam(mix(8.4, 4.4, e), mix(1.3, 4.9, e), mix(10.8, 16.5, e), mix(3.3, 0.2, e), mix(1.9, 8.4, e), mix(2.6, 6.4, e), mix(40, 42, e), -0.05); else camV(CAMP[3](t)); S.post.sh = X.rk(S, 0.8, 1.6); S.post.heat = 1; S.post.vig = 0.7;  pdbg(S); }],
      /* 5 Oppladningen og brølet, vidt og lavt (runde 9: oppladningen går i dette bildet): han til venstre, fjellet til høyre. Han synker sammen og skjelver, og så
         brølet med armene ut: toppen av fjellet sprenges bak ham, taket av aske brer seg inn over oss, trykket når fram og lavasjøen bryter ut i fontener rundt ham,
         lavabomber slår ned, og bildet går i hvitt på taktslaget. Horisonten ligger over navneskiltet, så sjøen synes hele veien. Én jevn bevegelse, ingen skjøt. */
      [PT.W, (S, u, a, t) => { const e = io(u), k = seg(t, PT.R + 0.1, PT.R + 2.9), e2 = k * k * k * (k * (k * 6 - 15) + 10), w = 0.04 * sin(t * 0.5);
        if (STIV()) K.cam(10 + 0.1 * e + 0.4 * e2 + w * 3, 1.45 + 0.15 * e, 19.3 + 0.5 * e + 3 * e2, 1.7 + 0.3 * e + 0.9 * e2, 5.35 - 0.15 * e2, 0.2, 58 + 3 * e + 9 * e2, -0.045); else camV(CAMP[4](t));   /* alt går samme vei hele bildet (ut og litt til høyre), så farten aldri snur */
        S.post.fl = max(0.5 * hit(t, PT.R, 0.16), seg(t, PT.F, PT.WH)); S.post.flc = '#fff6dc';
        S.post.sh = X.hk(S, t, PT.R, 1.2, 7, 'b') + X.hk(S, t, PT.B2, 1, 5, 'e') + X.hk(S, t, PT.R + 0.3, 2.4, 2.2, 'p') + X.rk(S, 0.8 * S.rw, 2.3) + X.rk(S, 1.6 * (S.chg || 0) * (S.chg || 0), 2.3) + X.hk(S, t, PT.FN, 0.7, 3.2, 'e') + PBOMB.reduce((q, b) => q + X.hk(S, t, PT.R + b[0] + b[1], 0.4, 1.8 * b[4], 'e', [b[2], 0, b[3]]), 0);
        X.mouth(S, S.pg, PT.R, t, 2.6); S.post.heat = 0.8 + 0.6 * S.rw;  pdbg(S); }],
    ],
  }, S => { K.face(S.aura); K.face(S.burst); for (const f of S.fnt) K.face(f.lt); K.face(S.vflash); }));


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
    if (cr.z < 1 && q > 0.05) { const ek = min(1.6, er), bm = S.boom || 0, big = S.erupt || 0, rfk = S.roofK || 0;   /* rfk: askeskyen står som et tak (Primal), og søylen går rett opp i det */
      C.blob(cr.x, cr.y - 10 * q, (150 + 90 * big) * q, '#ff4a10', (0.1 + 0.16 * ek) * lit, 1, 0.8);
      C.plume(cr.x + 26 * q * (1 - rfk), cr.y - 30 * q, { n: 22, h: (250 + 120 * big) * q * (1 - 0.6 * rfk), w0: 30 * q, w1: (120 + 60 * big) * q, wind: 0.75 * (1 - 0.8 * rfk), seed: 9, spd: 0.022 + 0.02 * ek, c: bl('#221a1c', '#4a3b3a', lit), top: '#120c0e', hot: '#b8400e', ha: 0.35 * min(1, ek), a: 0.5 + 0.3 * min(1, ek), t });
      C.plume(cr.x, cr.y + 2, { n: 40, h: (215 + 90 * big) * q * (1 + 0.5 * bm) * (1 - 0.6 * rfk), w0: (13 + 8 * big) * q, w1: (96 + 50 * big) * q * (1 + 0.6 * bm), wind: (0.62 + 0.2 * min(1, er)) * (1 - 0.8 * rfk), seed: 5, spd: 0.04 + 0.035 * min(1.5, er), c: bl('#2a2022', bl('#6e5a54', '#4a3936', big), lit), top: '#150e10', hot: er > 0.2 ? '#f0540e' : '#6a1c08', ha: 0.5 + 0.5 * min(1, er), a: 0.8 + 0.2 * min(1, er * 1.4), t }); }
    return { x: v.x + k * (sx * ca - sy * sa), y: v.y + k * (sx * sa + sy * ca), hz: v.y, cx: cr.x, cy: cr.y, cq: q };
  };


  /* Stedets etterbehandling (begge filmene): glød, varmeflimmer fra horisonten, vignett og en varm fargetone; stråler fra vulkanen når den eksploderer, ellers fra sola. */
  const look = (S, t, P, q, sn) => {
    P.bloom = 0.4 + 0.1 * S.wake + 0.14 * (S.rw || 0); P.bloomT = 0.74; P.heat = 1.3 + 1.3 * S.wake + 2.2 * q.heat; P.heatY = sn.hz; P.heatUp = 100; P.heatDn = 170;
    P.vig = 0.34 + 0.4 * q.vig; P.vigc = '#140402'; P.grain = 0.035; P.grade = { tint: [1.04, 0.985, 0.93], con: 1.07, sat: 1.05, exp: 1.02 };
    if (S.boom > 0.02 && sn.cq > 0.05) P.rays = { x: sn.cx, y: sn.cy, a: 0.55 * S.boom, len: 0.9 }; else if (S.sun > 0.3 && sn.y > -80 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.7 * (S.sun - 0.3), len: 0.85 }; };
  /* Primal-forvandlingen: Ω-tegnet tegnes i figurens oppløsning på krystallen (midt på den, sett fra kameraet), og stråler ut fra det. Ingen virvel ut (swirl: 0). */
  const gemAt = () => { const c = K.proj(GEM[0], GEM[1], GEM[2]), e = K.proj(GEM[0], GEM[1] + GEMR, GEM[2]); return { x: c.x / 2, y: c.y / 2, r: abs(c.y - e.y) / 2, z: c.z }; };
  /* Lydene til Primal (2b.2): naturlydene Jazz skaffet 20.11 (pakken, sfx/natur: klippet av raids3d/groudon/lyd/primal.py), lagt mykt under låta, og de innebygde
     lydene (C3SND i bui.js) som reserve for en pakke uten dem. Klippene starter en tidel før smellet sitt, så signalene ligger like før slaget i låta og smellet
     treffer PÅ det. I stillheten (4,0–5,98) er det bare tegnet (en dempet gongong) og en svak knitring som dør inn i låtas eget sug. */
  const pks = (n, v, o) => typeof c3p === 'function' && c3p(n, v, o), old = (n, v) => typeof C3SND !== 'undefined' && C3SND[n] ? C3SND[n](v) : [30], hasT = () => typeof tone === 'function';
  X.snd.psign = () => { pks('Rock Polish', 0.28, { off: 0.62, len: 0.8 }); if (hasT()) { tone(55, 0, 1.35, 0.07, 'sine', 52); tone(110, 0, 1.1, 0.045, 'sine', 108); tone(165, 0, 0.9, 0.022, 'triangle', 162); } return [80, 40, 160]; };   /* dempet: det er stille rundt den (målt uvektet: bassen bærer langt) */
  X.snd.pcrack = d => { d = d || 0.8; if (hasT()) { for (let i = 0; i < 10; i++) { const u = 1 - Math.pow(1 - i / 9, 1.7), a = u * (d - 0.05); noise(a, 0.03, 0.03 + 0.05 * u, 5200 + 1800 * rnd(i, 3), 2400); } swellN(0, d, 0.06, 500, 3600); } return [15, 50, 15, 40, 15, 30, 15]; };
  X.snd.pshatter = () => { if (!pks('Primal Shatter', 1, { len: 2.5, fade: 0.7 })) return old('shatter'); if (hasT()) { tone(66, 0.1, 1.3, 0.3, 'sine', 27); swellN(0.1, 1.1, 0.2, 900, 60, 0.02); } return [120, 40, 90, 40, 260]; };
  X.snd.pblast = () => { const a = pks('Primal Blast', 0.85, { len: 3.4, fade: 1.8 }); pks('Primal Erupt', 0.32, { rate: 0.85, len: 3.4, fade: 1.4 }); if (!a) return old('blast'); if (hasT()) tone(52, 0.08, 1.6, 0.26, 'sine', 24); return [140, 40, 320]; };
  X.snd.pblast2 = () => { if (!pks('Primal Blast', 0.5, { rate: 1.16, len: 2.2, fade: 0.9 }) && hasT()) tone(60, 0, 0.5, 0.1, 'sine', 30); return [90, 40, 160]; };
  X.snd.pflow = d => { pks('Primal Flow', 0.2, { rate: 0.9, len: d || 3.2, fade: 1.3 }); return [20, 40, 20, 40, 20, 40]; };
  X.snd.pthunder = k => { k = k == null ? 0.6 : k; if (!pks('Ash Thunder', 0.18 + 0.22 * k, { rate: 0.9 + 0.2 * k, len: 1.1, fade: 0.5 }) && typeof noise === 'function') noise(0.15, 0.5, 0.1, 600, 60); return [30, 30, 60]; };
  X.snd.pgeyser = () => { if (!pks('Primal Geyser', 0.5, { len: 2.0, fade: 0.9 }) && typeof noise === 'function') noise(0.15, 1.2, 0.16, 1600, 200); if (hasT()) tone(70, 0.15, 0.6, 0.14, 'sine', 40); return [60, 40, 60, 40, 140]; };
  X.snd.pbomb = k => { if (!(k ? pks('Primal Bomb Near', 0.4, { len: 1.2, fade: 0.5 }) : pks('Primal Bomb', 0.14, { len: 0.9, fade: 0.45 }))) return old('slam'); return k ? [100, 40, 180] : [45]; };
  X.sfx.push('Primal Shatter', 'Primal Blast', 'Primal Erupt', 'Primal Flow', 'Primal Bomb', 'Primal Bomb Near', 'Primal Geyser', 'Ash Thunder');
  X.reg('c3:383p', { spid: 383, swirl: 0, skin: 'lava', back: backdrop, look, roar: () => PT.R,
    cues: [[0, 'gather', PT.G1], [PT.G1, 'gem'], [PT.D[0], 'dark', 0.2], [PT.O, 'psign'], [PT.K, 'pcrack', PT.SW - PT.K], [PT.S - 0.1, 'pshatter'], [PT.Q, 'charge', PT.R - PT.Q], [PT.R, 'cry'], [PT.R - 0.08, 'pblast'], [PT.B2 - 0.08, 'pblast2'],
      [PT.R + 0.5, 'pflow', 2.9], [sL(57.33) - 0.15, 'pthunder', 0.6], [sL(59.33) - 0.15, 'pthunder', 0.4], [PT.FN - 0.15, 'pgeyser']].concat(PBOMB.map((b, i) => [PT.R + b[0] + b[1] - 0.12, 'pbomb', i ? 0 : 1])),
    over(x, t, o) { const S = G3D.S('c3:383p'); let on = false;
      if (S.om > 0 && S.shot === 2) { const q = gemAt(); if (q.z < 1 && (t - PT.O > 0.22 || floor(t * 30) % 2)) { X.omega(x, Math.round(q.x), Math.round(q.y + q.r * 0.04), q.r * 0.6 * (0.94 + 0.06 * S.om), S.om); on = true; } }
      return X.plate(x, t - PT.P, { name: o.name, cap: 'Primal Reversion', sign: X.omega }) || on; },
    fx(S, t, P) { if (S.om > 0 && S.shot === 2) { const q = gemAt(); if (q.z < 1) P.rays = { x: q.x * 2, y: q.y * 2, a: 1.6 * S.om * (0.5 + 0.5 * seg(t, PT.O, PT.S)), len: 0.7 }; P.bloom += 0.2 * S.om; }
      if (t >= PT.S && t < PT.S + 0.5) P.bloom += 0.25 * hit(t, PT.S, 0.5);
      skyBolts(S, t, P, PLT.concat([[PT.R + 0.1, 1.2, 14, 4, 0]]));
      if (t > PT.R + 0.6) C.parts('ash', { n: 80, seed: 8, cols: ['#3a2c2a', '#57423c', '#1c1414'], a: 0.9 * seg(t, PT.R + 0.6, PT.R + 2.2), spd: 1.5, z: [0, 1], wind: 0.55 }); } });

  /* ---------- Arenaen i kampen: samme sted som cutscenene ----------
     Jazz 18.11 (runde 5): kamparenaen fra steg 2 (den flate lavasletta) så «fryktelig unaturlig» ut etter cutscenen og «må ha samme layout som introen med steinene».
     Bakgrunnen i kampen tegnes derfor av det samme krateret (fjellveggene, steinene, krystallene, lavasjøen og vulkanen), sett fra et fast kamera: Groudon står i lavaen
     der han sto i introen, og din Pokémon står på en plattform nær kameraet. Fase 2 (raseriet): vulkanen er urolig; etter Primal er den i utbrudd, det regner lavabomber,
     og stedet er røyklagt. Rammeverket (kameraet, hendelsene, skuespillet i kampen, koblingen på ARENA) er G3C.arena i raid3c.js. Uten 3D: arenaen fra steg 2. */
  /* Kampstillingen til Primal (runde 12, «truende»), lagt oppå modellens egen stilling. Den vanlige formen står som før (Jazz 18.11: «Holdningen på vanlig groudon var bedre før»). */
  const PSTAND = { Spine1: [0, 0.048, 0], Spine2: [0, 0.084, 0], Hips: [0, -0.03, 0], Tail2: [0, 0.06, 0], Tail3: [0, 0.06, 0], '*Arm': [-0.21, 0.09, 0.45], '*Hand': [0.18, 0, 0], Neck1: [0, -0.1, 0], Head: [0, -0.06, 0], Jaw: [0, -0.14, 0] };
  /* Lavabombene i arenaen etter Primal, i to bølger med ulik takt (9,6 og 13,7 s), ut i sjøen der de synes: [kastes, flytid, x, z, størrelse]. Ikke der han står og ikke ved steinen din. */
  const ABOMB = [[[0, 2.6, -24, -26, 1.1], [1.1, 2.8, 22, -38, 1], [2.3, 2.5, -38, -14, 1]], [[0.4, 2.7, -14, -44, 1], [1.9, 2.6, 30, -22, 1.05], [3.4, 2.9, -48, -40, 1]]];
  /* Hvor i kamplåta vi er (bare når den har Groudons kart): [sekunder i fila, kartet], ellers null. */
  const songAt = () => { try { const tl = typeof PACK !== 'undefined' && PACK.tlOf ? PACK.tlOf(PACK.track()) : null, p = tl && tl.leg === 383 ? PACK.pos() : -1; return p >= 0 ? [p, tl] : null; } catch (_) { return null; } };
  const AFOE = [377, 182], PSC = 0.69, PSY = -0.85;   /* lavakanten på Groudon uten 3D-figuren (16 piksler over føttene); Primal er 1,56 ganger så høy og krympes (PSC), og står så dypt (PSY) */
  X.arena(383, {
    home: HOME, foe: AFOE, me: [190, 370],
    /* Uten 3D-figuren: kameraet lavt (2 over lavaen) og 23 enheter fra Groudon, så Gen 5-bildet får plass under toppen av bildet og himmelen og vulkanen over.
       MED FIGUREN I 3D (runde 6, etter kampbildet fra Omega Ruby): tett på, lavt og vannrett, så han fyller høyre halvdel og føles stor, med himmelen og vulkanen bak. */
    cam: fig => fig ? { fv: 52, cp: [-6.2, 1.65, 19.9], kq: 18.2 / 394, tg: [HOME[0] - 5, 3, HOME[2]] } : { fv: 50, cp: [-8.2, 2.05, 24.7], kq: 23.4 / 412, tg: [HOME[0] - 5, 3, HOME[2]] },
    place(K, T, fig) { const S = crater(T); volcano(S, T, 1, fig ? null : { x: -52, z: -410, r: 205, h: 92 }); if (fig) filmVol(S, T, 1); burn(S, T, { roofH: 150, fog: 0.3 }); S.ab = [bombs(S, ABOMB[0], 2300), bombs(S, ABOMB[1], 2400)]; return S; },   /* taket lavere enn i filmen: kameraet står lavt og vannrett og ser det langt borte */   /* uten figuren står vulkanen litt lenger unna, så hele fjellet og røyken synes */
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
      S.embers.material.uniforms.uPx.value = 120 * (1 + 0.5 * p2 + 0.7 * pk);
      for (const q of S.dust.concat(S.deb, S.spl)) q.material.uniforms.uT0.value = -1e5; S.drip.visible = false; S.ring.visible = false;
      /* Vulkanen: ryker og er urolig (mer i raseriet). */
      const tb = pr ? t - pT - 2 : -1; volcAct(S, t, 0.36 + 0.26 * p2 + 1.1 * pk + 0.06 * sin(t * 0.7), tb, tb);
      /* ETTER PRIMAL (2b.2: himmelen brenner, og arenaen står slik filmen sluttet): toppen er sprengt bort, askeskyen ligger som et tak over alt med rødglødende
         underside, lynet går inne i skyen (på de tunge taktslagene når låta spiller), glødende skred velter ned fjellsidene nå og da (de fra filmen går videre når
         kampen kommer tilbake; siden på smellet og den store inngangen i låta, uten låt hvert 45. sekund), og lavabomber med røykhale slår ned i sjøen i bølger. */
      for (const q of [S.vboom, S.vboom2, S.vash, S.vrain]) q.visible = !pr; if (pr) S.vfnt.material.uniforms.uA.value *= 0.5;   /* filmens smell er over: lys oppå lys holdes nede */
      const mt = pr ? songAt() : null, mp = mt ? mt[0] : -1, tl = mt ? mt[1] : null, LL = [];
      if (pr && tl && mp >= tl.b0) { const n = floor((mp - tl.b0) / tl.ph), a = mp - tl.b0 - n * tl.ph; LL.push([a, 0.75 + 0.25 * rnd(n, 31), (rnd(n, 32) - 0.5) * 360, 70 - rnd(n, 33) * 300, 80 + rnd(n, 34) * 40]); if (a > tl.ph / 2) LL.push([a - tl.ph / 2, 0.5, (rnd(n, 35) - 0.5) * 380, 60 - rnd(n, 36) * 280, 70]); }
      else if (pr && !tl) { const n = floor(t / 3.7), a = t - n * 3.7; if (rnd(n, 37) > 0.25) LL.push([a, 0.6 + 0.4 * rnd(n, 31), (rnd(n, 32) - 0.5) * 360, 70 - rnd(n, 33) * 300, 90]); }
      let fl = null; if (pr) { let t0 = t - pT - 4.1, set = [0, 1, 2, 3];
        if (pT > 9) { t0 = -1e5; if (tl) (tl.big || []).forEach((b, i) => { const a = mp - b; if (a >= 0 && a < 12) { t0 = t - a + 0.2; set = i ? [2, 0] : [0, 1, 3]; } }); else { const n = floor((t - 6) / 45); if (t - n * 45 - 6 < 12) { t0 = n * 45 + 6; set = n % 2 ? [2, 0] : [0, 1, 3]; } } }
        fl = [0, 1, 2, 3].map(k => set.indexOf(k) >= 0 && t0 > -1e4 ? t0 : null); }
      burnAct(S, t, { top: pr, roofR: pr ? 520 + 600 * min(pT, 3) : 0, roofA: pk, hot: 1 + 0.12 * sin(t * 0.9), col: pk, flow: fl, L: LL }); S.LL = LL;
      S.ab.forEach((b, i) => { const per = i ? 13.7 : 9.6, on = pr && pT > 2.5; b.show(on); b.at(on ? floor((t - 1) / per) * per + 1 : -1e5); });
      /* Mørkere etter Primal: taket tar lyset ovenfra, og ilden nedenfra er igjen. Disen er lettere enn før (da den var himmelen), så taket og skredene synes. */
      U.uFog.value.set(60 - 12 * pk, 300 - 30 * pk, 0.8 + 0.05 * pk); S.haze.material.uniforms.uA.value = 0.32 * pk; S.haze.visible = pk > 0.02;
      if (pk > 0) { lerpC(U.uKeyC, '#f4e2d4', '#dcb8a0', pk); U.uGlow.value += 0.15 * pk; L.uBri.value -= 0.06 * pk; }
      S.erupt = 0.25 * p2 + 1.3 * pk; S.smoke = 0.45 * pk; S.lit = 0.72 + 0.12 * p2 - 0.1 * pk; S.sun = (0.38 + 0.12 * p2) * (1 - pk); S.roofK = pk; S.wake = heat; S.heat = 0; S.rw = 0; S.pk = pk;
    },
    back: (S, t) => backdrop(S, t),
    scene(S, A, sn, q) {
      const g = C.g, P = q.P, t = S.t, p2 = S.p2, fT = q.fT, bl = C.blend, pk = A.pk || 0, heat = 0.5 + 0.4 * p2 + 0.3 * pk, sun = A.sun;
      /* Røyklagt etter Primal: røyk i lag over sjøen, tettest ved horisonten. */
      const rl = A.rlit || 0; if (pk > 0.02) { C.fogBand(sn.hz + 2, { h: 44, col: '#3a1d16', a: 0.36 * pk, seed: 41, spd: 6, n: 7 }); C.fogBand(sn.hz + 52, { h: 60, col: '#24110e', a: 0.26 * pk, seed: 43, spd: 10, n: 5 });
        skyBolts(A, t, P, (A.LL || []).map(L => [t - L[0], L[1], L[2], L[3], L[4]])); C.parts('ash', { n: 54, seed: 8, cols: ['#3a2c2a', '#57423c', '#1c1414'], a: 0.75 * pk, spd: 1.3, z: [0, 1], wind: 0.5 }); }   /* 2b.2: lyn inne i skyen og aske som faller */
      /* Lyset på figurene: som i arenaen fra steg 2 (varmt og mørkt, lavaen lyser nedenfra, kantlys fra sola og vulkanen). */
      C.lightSet({ amb: bl('#b8826c', '#d09a80', 0.5 * sun), sat: 0.84, lift: '#34140e',
        lights: [{ col: '#ff6a1c', a: min(0.85, 0.34 + 0.3 * min(1.3, heat)), h: 0.72 }], rim: [{ col: '#ffb060', dx: 1, dy: 1, a: 0.3 + 0.55 * sun }, { col: '#ff7a24', dx: 0, dy: -1, a: 0.5 + 0.25 * min(1, heat) }].concat(rl > 0.05 ? [{ col: '#d8c8ff', dx: 0.3, dy: 1, a: 0.45 * min(1, rl) }] : []),
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
    const FS_VOLC_T = `varying vec3 vW, vN, vO; varying vec2 vUv; uniform vec3 uA, uB; uniform float uEr, uFlow, uFlowA, uLvB, uAr, uTop; uniform vec4 uRiv[11];
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
  float river = (1. - smoothstep(w, w * 2.8, ch)) * smoothstep(.1 + .42 * (1. - min(uEr, 1. - .35 * uAr)), 1., v + (fbm(c * 2.3 + 5.) - .5) * .9 + .2) * (1. - ik);
  if (river > .002) { float x = ch / (w * 2.8), hot = clamp(.05 + .8 * v + .18 * er, 0., 1.);
    float tp = mix(.5 + .3 * hot, flowT(x, d, a, rr, 4.6 + 3.2 * fbm(c * 2.), a * 11., hot, px), lod);
    col = mix(col, ramp(tp - .34 * fg * uAr * smoothstep(.55, 1., tp)) * (.62 + .5 * min(er, 1.6 - .7 * uAr)) * uLvB * (1. - fg * .45), river); }
  /* Kanten rundt krateret gløder ujevnt (lyset fra sjøen), og blafrer litt. */
  float rimG = smoothstep(.86, 1., v) * (1. - ik) * (.5 + .5 * fbm(c * 16. + vec2(v * 9., uTime * .35))) * (.88 + .12 * sin(uTime * 2.1 + a * 3.));
  col += vec3(1., .42, .08) * rimG * (.3 + .6 * er) * uLvB;
  /* I KAMPEN OG PRIMAL (uAr, uTop; begge 0 i introen, som da er urørt): lava sett gjennom arenaens tette dis blir rødere i stedet for mørk gul (som ser grønnlig ut),
     elvene fra krateret flommer ikke over hele flanken når fjellet raser, og når toppen er sprengt bort (uTop), gløder den hakkede leppa: radene over kuttet
     ligger lavere enn høyden sin (v · 138 − vO.y er hvor mye de har sunket), flanken like under kuttet (vb, som cutV uten taggene) gløder med, med en tynn, varm
     strek helt i kanten, og elvene som renner fra flenga er litt varmere. */
  if (uTop > 0.) { float dA = mod(a - 1.43 + 3.14159265, 6.2831853) - 3.14159265, vb = .86 - .1 * exp(-(dA / .55) * (dA / .55)) + .018 * sin(a * 9. + 1.);
    float lip = smoothstep(.3, 2.2, v * 138. - vO.y), edge = max(lip, smoothstep(vb - .13, vb - .002, v)), line = max(lip, smoothstep(vb - .024, vb - .003, v)), nz = fbm(c * 30. + vec2(v * 26., uTime * .45));
    col = mix(col, ramp(.5 + .42 * edge * edge + .22 * line + .2 * (nz - .5)) * (.94 + .06 * sin(uTime * 3. + a * 7.)), max(pow(edge, 1.6) * (.7 + .3 * nz), line * .95) * (1. - ik) * uTop); }
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
      col = mix(col, ramp(min(tp, 1.02) + .04 * uTop - .34 * fg * uAr * smoothstep(.55, 1., tp)) * (.95 + .15 * head + .3 * uTop) * (1. - fg * .3) * uLvB, on * (1. - smoothstep(.55, 1., x) * .5)); } }
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

    /* FLYTUREN ER ÉN JEVN BANE (Jazz 23.11, på første utgave: «Plutselig endring i kameravinkel på sekund 18–19 cirka er unaturlig og må kuttes ut»). Før var den
       satt sammen av to baner som møttes på 18,9: der hoppet farten fra 53 til 91 enheter i sekundet, dreiningen fra 38 til 91 grader i sekundet, og krengingen slo fra
       +11° til −17° på to tideler. Nå finnes det ingen skjøt: plassen, farten, retningen, siktet, synsvinkelen og krengingen er alle jevne funksjoner av tiden.
       · Til FT0: en sentripetal Catmull-Rom gjennom punktene (mkPath), tatt ut etter lengden langs banen, så farten styres for seg: marsjfart, og så stupet ned
         fjellsiden. Marsjfarten er regnet ut så kameraet er over kraterkanten når takten kommer inn (TK).
       · Fra FT0: en spiral rundt ham i polarkoordinater (avstand, vinkel og høyde som jevne kurver i tiden, med samme fart og retning som banen har der): den bremser
         som en fugl og stopper lavt foran det bøyde hodet på FACE. Vinkelen går som en S-kurve, så dreiningen stiger og faller mykt (høyst rundt 55 grader i sekundet).
       · Krengingen følger dreiningen (en myk bue inn i svingen og ut igjen), og siktet glir fra fjellet til ham i én bevegelse. */
    const mkPath = (W, n) => { const D = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), P = [W[0].map((v, k) => 2 * v - W[1][k])].concat(W, [W[W.length - 1].map((v, k) => 2 * v - W[W.length - 2][k])]), pts = [], len = [0];
      for (let i = 1; i < P.length - 2; i++) { const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2], t1 = Math.sqrt(D(p0, p1)), t2 = t1 + Math.sqrt(D(p1, p2)), t3 = t2 + Math.sqrt(D(p2, p3));
        for (let j = i === 1 ? 0 : 1; j <= n; j++) { const t = mix(t1, t2, j / n), L = (a, b, ta, tb) => a.map((v, k) => ((tb - t) * v + (t - ta) * b[k]) / (tb - ta)), A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), C = L(L(A1, A2, 0, t2), L(A2, A3, t1, t3), t1, t2);
          if (pts.length) len.push(len[len.length - 1] + D(C, pts[pts.length - 1])); pts.push(C); } }
      return { len: len[len.length - 1], upto: i => len[min(len.length - 1, i * n)], at: d => { d = max(0, min(len[len.length - 1], d)); let lo = 0, hi = len.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] <= d) lo = m; else hi = m; } const u = (d - len[lo]) / max(1e-9, len[hi] - len[lo]); return pts[lo].map((v, k) => mix(v, pts[hi][k], u)); } }; };
    const FLYP = mkPath([[-190, 292, -1000], [-175, 285, -960], [-122, 245, -700], [-70, 205, -455], [-56, 178, -372], [-36, 131, -253], [-12, 77, -130], [4, 40, -62]], 24), FT0 = 15.6, FV2 = 76, FEND = [11.95, 0.16, 2.3];   /* FEND: avstanden, vinkelen og høyden der den stopper */
    const flyD = (() => { const fa = t => io(seg(t, 11.5, 15.5)), dt = 1 / 120, n = Math.ceil((FT0 + 0.5) / dt), A = [0], B = [0]; for (let i = 1; i <= n; i++) { const t = (i - 0.5) * dt; A.push(A[i - 1] + (1 - fa(t)) * dt); B.push(B[i - 1] + fa(t) * dt); }
      const k = Math.round(Q.TK / dt), v1 = (FLYP.upto(4) - FV2 * B[k]) / A[k]; return t => { const f = max(0, min(n, t / dt)), i = min(n - 1, floor(f)), u = f - i; return v1 * mix(A[i], A[i + 1], u) + FV2 * mix(B[i], B[i + 1], u); }; })();
    const FLY0 = (() => { const h = 0.02, pol = q => [Math.hypot(q[0], q[2] - 2.8), Math.atan2(q[0], q[2] - 2.8), q[1]], a = pol(FLYP.at(flyD(FT0 - h))), b = pol(FLYP.at(flyD(FT0 + h))), p = pol(FLYP.at(flyD(FT0))); let d = b[1] - a[1]; while (d > PI) d -= TAU; while (d < -PI) d += TAU;
      return { r: p[0], th: p[1] < FEND[1] ? p[1] + TAU : p[1], y: p[2], dr: (b[0] - a[0]) / (2 * h), dth: d / (2 * h), dy: (b[2] - a[2]) / (2 * h) }; })();
    /* Fra p0 med farten v0 til p1 i ro, uten rykk i noen ende (femtegradskurve: farten OG akselerasjonen er sammenhengende, så bremsen og svingen kommer mykt). */
    const quint = (k, p0, v0, p1) => { const d = p1 - p0, k3 = k * k * k; return p0 + v0 * k + (10 * d - 6 * v0) * k3 + (8 * v0 - 15 * d) * k3 * k + (6 * d - 3 * v0) * k3 * k * k; };
    const flyPos = t => { if (t <= FT0) return FLYP.at(flyD(t)); const D = Q.FACE - FT0, k = seg(t, FT0, Q.FACE), r = quint(k, FLY0.r, FLY0.dr * D, FEND[0]), th = quint(k, FLY0.th, FLY0.dth * D, FEND[1]); return [sin(th) * r, quint(k, FLY0.y, FLY0.dy * D, FEND[2]), 2.8 + cos(th) * r]; };
    const flyAt = t => { const kh = io(seg(t, 17.6, Q.FACE)), w = io(seg(t, 12.4, 17.8)), Mv = [-40 - 2 * io(seg(t, 6, Q.TK)), mix(100, 125, io(seg(t, 0, Q.TK))), -330 + 8 * io(seg(t, 10.5, Q.TK))], Mh = [0.1 * kh, mix(4.6, 4.55, kh), mix(2, 6.2, kh)];
      return [flyPos(t), Mv.map((v, i) => mix(v, Mh[i], w)), mix(50, 40, kh)]; };
    const bankAt = t => { const k = seg(t, FT0, Q.FACE), s = 4 * k * (1 - k); return -0.14 * s * s; };   /* samme form som dreiningen */
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
    /* FILMENS FJELL som byggekloss (Fable 24.11): fjellet i høyere oppløsning (192 × 72), med en indre vegg ned til lavasjøen i krateret (skissen var åpen innvendig), og
       lava som renner NEDOVER og lever (FS_VOLC_T). Bytter masken og materialet på S.vol fra volcano(). Introen, arenaen med 3D-figuren og Primal-filmen bruker den; de to
       siste med full = 1: elvene har rent helt ned, som da introen sluttet, og lavaen er i arenamodus (uAr). */
    filmVol = (S, T, full) => { const pos = [], uvs = [], idx = [], N = VN, M = VM, IW = 8, rimY = a => VOL.h - VOL.h * 0.035 * max(0, sin(a * 2 + 1.1)) + (fbm2(cos(a) * 3 + 4, sin(a) * 3 + 1) - 0.5) * VOL.h * 0.035;
      for (let j = 0; j <= M + IW; j++) for (let i = 0; i <= N; i++) { const a = (i % N) / N * TAU; let rr, y, vv;
        if (j <= M) { const v = j / M; rr = VRR[j][i]; y = j === M ? rimY(a) : v * VOL.h; vv = v; }
        else { const k = (j - M) / IW, y0 = rimY(a); rr = mix(VRR[M][i], 15.4, Math.pow(k, 0.6)); y = mix(y0, VOL.h - 7.6, io(k)); vv = 1 + 0.1 * k; }
        pos.push(cos(a) * rr, y, sin(a) * rr); uvs.push(i / N, vv); }
      for (let j = 0; j < M + IW; j++) for (let i = 0; i < N; i++) { const p = j * (N + 1) + i, q = p + N + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); gg.setIndex(idx); gg.computeVertexNormals(); gg.computeBoundingSphere();
      const u0 = S.vol.material.uniforms; S.vol.geometry.dispose(); S.vol.geometry = gg;
      S.vol.material = K.shader(K.GLSL.VS, FS_VOLC_T, { uA: K.uv(u0.uA.value), uB: K.uv(u0.uB.value), uEr: K.uv(0.3), uFlow: K.uv(0), uFlowA: K.uv(0.2308), uRiv: K.uv(Array.from({ length: 11 }, () => new T.Vector4())), uLvB: K.uv(1), uAr: K.uv(0), uTop: K.uv(0) }, { side: T.DoubleSide });
      S.vgn = N; S.vgm = M; S.vgi = IW;   /* rutenettet, til dem som leser fjellets flate (burn, volP og skredene i «Himmelen brenner») */
      if (full) { RIV.forEach((r, i) => S.vol.material.uniforms.uRiv.value[i].set(r[0], r[1], r[2], r[3])); S.vol.material.uniforms.uFlow.value = 6; S.vol.material.uniforms.uAr.value = 1; } };
    /* ---------- BEVEGELSEN i introen fra knuset (Opus 25.11; se «BEVEGELSEN» øverst i fila). Nøkkelposene (arket: work/raids3d/groudon/bevegelse/poser.jpg):
       I1 statuen (STAT, godkjent: hodet senket og armene inntil; den er forvarselet, sammen med lyset og ladingen, for et ekstra dykk etter knuset ville komme etter det
       godkjente brølet 1:24,57; frosne bilder i knuset til skriket: 1:24,47–1:24,53 står, og kjeven og brystet rører seg i bildet med skriket) · I2 brølet (BROL: brystet fram, ryggen i bue, armene ut med åpne klør, kjeften helt opp;
       brystet leder, hodet kastes forbi og faller på plass) · I3 holdet (TOM: skriket tømmer lungene, brystet synker litt; kjeven og hodet dirrer) · I4 hodet senkes når
       navnet står (hodet leder, så nakken, brystet og armene; kjeften lukkes 1:26,2–1:27,0) · I5 kampstillingen (STAT 0,2, godkjent) med liv: den første dype pusten,
       så rolig pust, blikket som glir og halen som henger etter. */
    const BROL = { Spine1: [0, 0.06, 0], Spine2: [0, 0.14, 0], Spine3: [0, 0.1, 0], Neck1: [0, 0.24, -0.05], Neck2: [0, 0.18, -0.03], Head: [0, 0.06, 0], Jaw: [0, -0.85, 0], '*Arm': [0.85, 0.28, -0.12], '*Hand': [0.6, 0, -0.05] };   /* oppå STAT 0,2: ROAR (godkjent) med armene ut til sidene (fra kameraet i klipp 9 står klørne 60–80 px utenfor skuldrene; før 10–50 px foran buken), hodet litt mindre bakover i holdet og litt dreid mot kameraet, så ansiktet synes (kastet går forbi dit, og sporet blir en bue) */
    const TOM = { Spine1: [0, -0.015, 0], Spine2: [0, -0.025, 0], Neck1: [0, -0.015, 0], Head: [0, 0.012, 0], '*Arm': [-0.06, -0.05, 0.02] }, BHALE = { Hips: [0, -0.05, 0], Tail2: [0, 0.12, 0.03], Tail3: [0, 0.12, 0.03], Tail4: [0, 0.12, 0.02] }, VRI = { Spine2: [0, 0, -0.03], Spine3: [0, 0, -0.025] }, BHZ = { Tail2: [0, 0, 0.04], Tail3: [0, 0, 0.05], Tail4: [0, 0, 0.04] };   /* halen løftes som i ROAR, med en liten bue til siden; VRI: overkroppen vris litt mot kameraet, etter kastet (sporet blir en bue) */
    const MVI = (() => { const C = Q.CLX, R = Q.ROAR, N = Q.NAME, st = [[STAT, 1]], br = [[STAT, 0.2], [BROL, 1]], bo = k => [[STAT, 0.2], [BROL, k]], ho = [[STAT, 0.2], [BROL, 1], [TOM, 1]], brv = [[STAT, 0.2], [BROL, 1], [VRI, 1]], bpv = [[STAT, 0.2], [BROL, 1.04], [VRI, 1]], hov = [[STAT, 0.2], [BROL, 1], [TOM, 1], [VRI, 1]], brv6 = [[STAT, 0.2], [BROL, 1], [VRI, 0.6]], bpn = [[STAT, 0.2], [BROL, 1.06], [{ Neck1: [0, 0, -0.03] }, 1]], ka = [[STAT, 0.2]], kv = [[STAT, 0.2], [VRI, 0.5]],
        kn = [[STAT, 0.2], [{ Neck1: [0, -0.025, -0.03], Neck2: [0, -0.012, -0.02] }, 1]];   /* bpv: brystet presser på igjen med skriket; kv og kn: på vei ned går nakken litt forbi og er fortsatt litt dreid, så den faller på plass og retter seg (en bue) */
      /* Retting etter kontrollen 25.11: brølet kom 0,15–0,4 s etter skriket (kjeven halvåpen først 1:24,77, nakken og hodet halvveis 1:24,9, armene 1:25,0). Nå: statuen er
         forvarselet, og alt slippes på skriket med korte nøkler og stivere fjærer: kjeven halvåpen rundt 1:24,65 (den starter ett bilde før lyden, som munnen i en tegnefilm),
         brystet 1:24,66, nakken 1:24,70, hodet 1:24,72, armene 1:24,74 og klørne 1:24,78; toppen 0,05–0,15 s senere enn den gamle back(), og overskuddet fra fjærene.
         kj: kjeften lukkes med kjeven et hårstrå åpen, så fjæren aldri går forbi lukket (tennene; før −0,33° på 1:27,13). */
      const kj = [[STAT, 0.2], [{ Jaw: [0, -0.015, 0] }, 1]];
      const G = fjaerer(BENV, {
        ch: [[R - 0.045, st], [R + 0.08, br], [R + 0.2, brv6], [R + 0.4, brv], [R + 1.08, bpv], [N + 0.15, hov], [N + 0.5, hov], [N + 1.15, kv], [N + 1.6, ka]],
        nk: [[R - 0.025, st], [R + 0.11, br], [R + 0.72, br], [R + 1.08, bpn], [N + 0.15, ho], [N + 0.38, ho], [N + 1.15, kn], [N + 1.6, ka]],
        hd: [[R - 0.005, st], [R + 0.14, bo(1.03)], [R + 0.5, br], [R + 1.2, bo(1.04)], [N + 0.15, ho], [N + 0.26, ho], [N + 1.05, ka]],
        jw: [[R - 0.05, st], [R + 0.04, br], [N + 0.32, br], [N + 1.12, kj]],   /* kjeven åpner seg med skriket */
        ar: [[R, st], [R + 0.16, br], [N + 0.15, ho], [N + 0.48, ho], [N + 1.35, ka]],
        hn: [[R + 0.03, st], [R + 0.2, br], [N + 0.52, br], [N + 1.42, ka]],
        hp: [[R + 0.06, st], [R + 0.4, [[BHALE, 1]]], [N + 0.6, [[BHALE, 1]]], [N + 1.6, ka]] },
        { ch: [1.8, 0.55, 2.8], nk: [1.6, 0.55, 2.6], hd: [1.5, 0.47, 2.4], jw: [2.4, 0.55, 2.6], ar: [1.3, 0.5, 2.4], hn: [1.1, 0.52, 2.0], hp: [0.9, 0.7, 1.4] }, C,
        t => io(seg(t, R - 0.2, R - 0.06)) * (1 - io(seg(t, R + 0.45, R + 0.9))));   /* stive fjærer i kastet, myke i holdet, ved navnet og i livet (som før) */
      const ry = fjaer([[R - 0.045, 0], [R + 0.22, 0.05], [R + 1.2, 0], [N + 0.4, -0.02], [N + 1.3, 0]], 2.0, 0.55, C);
      const lv = t => io(seg(t, N + 1.0, N + 2.6)), life = t => io(seg(t, N + 0.6, N + 1.8)), pitch = t => { const v = G.ch(t); return v[1] + v[4] + v[7]; };
      /* Livet: pusten (den første dyp) og vektskiftet (langsom støy), som også driver halen. Halens anker svinger latt (støy rundt 0,33 Hz, ±0,06 rad) med vektskiftet,
         og løftes litt med pusten, så tuppen henger etter og svinger (før svingte tuppen 12 ganger mindre enn i dag: kontrollen 25.11). */
      const puI = t => pust(t, N + 0.8, 3.4, 71) * (1 + 0.7 * hit(t, N + 0.8, 3.4)), ws = t => X.noise(t, 75, 0.12), sway = t => (0.058 * sin(TAU * 0.27 * t + 1.3) + 0.032 * sin(TAU * 0.43 * t + 0.4) + 0.03 * ws(t)) * life(t);   /* svingen: en pendel (to langsomme sinuser), ikke støy: X.noise gir lange strekk med lik fart; som en pendel løftes tuppen litt i hver ende (sin², drive y), så den går i bue */
      const pitchT = X.follow(t => pitch(t), { f: 1.6, z: 0.8, t0: C }), ryT = X.follow(t => ry(t), { f: 1.6, z: 0.8, t0: C });   /* vippen og roten halen henger etter, glattet: brystet kastes nå på 0,1 s, og halens rot fikk rykk av det */
      /* Blikket glir (han ser seg sakte om): målet er langsom støy; hodet følger raskt og nakken sakte, så hodet leder og nakken kommer etter. */
      const GL = [[N + 1.0, 0, 0]]; for (let i = 0, tt = N + 1.6; tt < 120; i++) { GL.push([tt, 0.14 * (rnd(i, 95) * 2 - 1), 0.055 * (rnd(i, 96) * 2 - 1)]); tt += 1.6 + 2.2 * rnd(i, 97); }   /* blikket: et nytt punkt hvert 1,6–3,8 s (litt større og oftere enn før: livet var mye stivere enn i den godkjente filmen, kontrollen 25.11) */
      const BL = GL.slice(1).filter((_, i) => rnd(i, 98) < 0.75).map(q => q[0] - 0.04);   /* øyet blunker som regel idet hodet snur seg mot et nytt punkt (før som et urverk hver 4,4 s) */
      const gT = t => { let i = 0; while (i < GL.length - 1 && t >= GL[i + 1][0]) i++; const a = GL[i], p = GL[max(0, i - 1)], k = lv(t), w = io(seg(t, a[0], a[0] + 0.5));
        return [(mix(p[1], a[1], w) + 0.035 * sin(TAU * 0.09 * t + 0.6)) * k, (mix(p[2], a[2], w) + 0.025 * sin(TAU * 0.14 * t + 1)) * k]; }, gN = X.follow(gT, { f: 0.35, z: 0.85, t0: C }), gH = X.follow(gT, { f: 1.0, z: 0.75, t0: C });   /* og en langsom drift, så hodet aldri står helt stille */   /* hodet snur seg raskt mot punktet og holder; nakken kommer sakte etter (hodet leder) */
      /* Halen: posen fra nøklene, og ankeret er det kroppen gjør (brystet som kastes bakover, roten opp og ned) pluss en lat, langsom sving når han står. */
      const tail = haleK(HALEV, [[R + 0.02, []], [R + 0.5, [[BHALE, 1]]], [R + 1.1, [[BHALE, 1], [BHZ, 1]]], [N + 0.6, [[BHALE, 1], [BHZ, 1]]], [N + 1.6, []]], t => [0, 0.2 * pitchT(t) - 0.3 * ryT(t) + (0.02 * puI(t) + 0.02 * Math.pow(sin(TAU * 0.27 * t + 1.3), 2)) * life(t), sway(t)], { f: 0.9, fo: 0.85, z: 0.5, lim: 0.25, t0: C, dk: 0.05 });   /* dk: løftet kommer fra roten og ut, ett og et halvt bilde per ledd */
      return t => { const tl = tail(t); return { g: { ch: G.ch(t), nk: G.nk(t), hd: G.hd(t), jw: G.jw(t), ar: G.ar(t), hn: G.hn(t), hp: G.hp(t) }, y: ry(t), tail: tl, gN: gN(t), gH: gH(t), lv: lv(t), life: life(t), puI, ws: ws(t), sway: sway(t), bl: BL.some(b => t >= b && t < b + 0.12) }; }; })();
    /* Stillingen i den nye bevegelsen: gruppene, halen, skjelvet i brølet (støy, sterkest med kjeften helt oppe, borte når den lukkes), pusten og blikket. Gir S.rw (hvor åpen kjeften er). */
    const poseI = (g, A, t) => { const B = BENV, q = A.g; for (const k in B) putV(g, B[k], q[k]); A.tail.forEach((r, i) => g.add({ [HALEV[i]]: r }, 1));
      const op = c01(-q.jw[1] / 0.85); if (G3D.dbgKey) return op;
      { const u = seg(t, Q.ROAR - 0.03, Q.ROAR + 0.4), k = u < 0.3 ? sm5(u / 0.3) : 1 - sm5((u - 0.3) / 0.7); if (k > 0.001) g.add({ Spine1: [0, 0, -0.018 * k] }, 1); }   /* kastet går i en bue: brystet vris litt mot kameraet midt i kastet og tilbake (før en rett strek, kontrollen 25.11) */
      { const k = Math.pow(sin(PI * seg(t, Q.NAME + 0.45, Q.NAME + 1.3)), 2); if (k > 0.001) g.add({ Spine1: [0, 0, 0.022 * k] }, 1); }   /* og nedturen ved navnet: vekten går litt til siden og tilbake, så nakken synker i en bue */
      const e = op * (1 - io(seg(t, Q.NAME + 0.25, Q.NAME + 0.95)));
      if (e > 0.001) g.add({ Jaw: [0, 0.03 * X.noise(t, 51, 2.6) - 0.07 * pust(t, Q.ROAR, 0.62, 99), 0], Head: [0, 0.007 * X.noise(t, 55, 1.8), 0.012 * X.noise(t, 53, 2.0)], Neck1: [0, 0.02 * X.noise(t, 47, 1.2), 0.006 * X.noise(t, 57, 2.0) + 0.014 * X.noise(t, 49, 0.9)], Neck2: [0, 0.012 * X.noise(t, 48, 1.2), 0], '*Hand': [0.012 * X.noise(t, 59, 2.6), 0, 0] }, e);   /* kjeven former skriket (langsomt opp og ned) og dirrer, og nakken presser; skjelvet er langsomt (en stor kjeve dirrer sakte; X.noise har et lag på 2,17 × farten, så over rundt 3 Hz blir det flimmer i 30 bilder i sekundet) */
      /* Pusten etter holdet: brystet hever seg og skuldrene følger, mens hodet holdes nesten i ro; den første pusten etter brølet er dyp. Kjeven følger pusten. */
      const b = A.puI(t), b3 = A.puI(t - 0.3), b2 = A.puI(t - 0.6);   /* pusten går oppover ryggen (b3), og nakken retter hodet etter (b2): sporet blir en ellipse, ikke en strek */
      if (A.life > 0.001) g.add({ Spine1: [0.02 * A.ws, 0.016 * b, 0.008 * A.ws], Spine2: [0, 0.02 * b, 0], Spine3: [0, 0.014 * b3, 0], Neck1: [0, -0.018 * b2, 0], '*Arm': [0.02 * b + 0.024 * sin(TAU * 0.19 * t + 0.7) + 0.014 * sin(TAU * 0.31 * t + 2.1), 0.04 * b + 0.01 * sin(TAU * 0.13 * t + 1.1), 0], '*Hand': [0.03 * sin(TAU * 0.23 * t + 1.9) + 0.012 * sin(TAU * 0.37 * t), 0, 0.012 * sin(TAU * 0.17 * t + 0.3)] }, A.life);   /* og vekten flytter seg (Spine1 x og litt z: før 0,008, nesten ingenting); armene og klørne lever (langsomme sinuser: X.noise gir lange strekk med lik fart) */
      if (A.lv > 0.001) g.add({ Jaw: [0, -0.05 - 0.03 * (1 - min(1, b)), 0] }, A.lv);
      /* Halens rot svinger latt med (ankeret halen henger etter), og blikket: nakken tar 60 % av dreiningen, sakte; hodet resten, og leder. */
      g.add({ Hips: [0, 0, A.sway] }, 1);
      g.add({ Neck1: [0, 0.3 * A.gN[1], 0.35 * A.gN[0]], Neck2: [0, 0.2 * A.gN[1], 0.25 * A.gN[0]], Head: [0, A.gH[1] - 0.5 * A.gN[1], A.gH[0] - 0.6 * A.gN[0]] }, 1);
      return min(1.25, max(0, -q.jw[1] / 0.85)); };   /* S.rw: også forbi 1 når kjeven går forbi (som back() før), så gnistene og gløden topper som i dag */
    /* Kameraet i klipp 9 med liv (camLive): samme bane som før, med etterslep og svak støy fra klippet, tonet ut til banen står i kampens bilde (1:29,67). Etterslepet tones
       ut over de siste 2,2 s av buen (før 1 s: kameraet tok igjen banen synlig og bremset brattere til slutt, kontrollen 25.11). */
    const CAM9 = camLive(t => { const k = io(seg(t, Q.CLX + 0.7, Q.CLX + 5.2)), w = 0.04 * sin(max(0, t - Q.CLX - 5.2) * 0.23);
      return [mix(3.4, -6.2, k) + sin(w) * 1.6, mix(0.85, 1.65, k), mix(13.6, 19.9, k), mix(-0.6, -3.5, k), mix(5.9, 4.6, k), mix(2.5, 2.8, k), mix(58, 52, k), -0.04 * (1 - k)]; },
      { t0: Q.CLX - 0.035, tIn: Q.CLX - 0.035, tEnd: Q.CLX + 5.2, ut: 2.2, f: 2.0, z: 0.85, amp: [0.04, 0.025], seed: 9 });
    G3D.def('c3:383', vendt({
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
        filmVol(S, T);   /* filmens fjell (over) */
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
        const jolt = pre ? 0.6 * hit(t, Q.UB, 0.3) + 0.6 * hit(t, Q.R2, 0.3) + 0.4 * hit(t, Q.BRO, 0.3) + 0.4 * hit(t, Q.HIT, 0.4) : 0; let ry, rw;
        if (pre || STIV()) {   /* til knuset (godkjent, urørt) og bak bryteren 'stiv': slik det var (Fable 23.11) */
          ry = HOME[1] - (pre ? 0 : 0.3 * sq(t, Q.CLX, 12, 5));
          g.root.position.set(HOME[0] + 0.02 * sin(t * 61) * jolt, ry, HOME[2]);
          g.add(STAT, pre ? 1 : 1 - 0.8 * eo(seg(t, Q.CLX, Q.CLX + 0.3)));
          const live = pre ? 0 : io(seg(t, Q.CLX + 0.4, Q.CLX + 2)), br = 0.024 * sin(t * 2.7) * live; g.add({ Spine1: [0, br, 0], Spine2: [0, br * 0.6, 0] }, 1);
          for (let i = 1; i <= 5; i++) g.rot('Tail' + i, 0, 0, live * 0.045 * sin(t * 2.1 + i * 0.55));
          /* Mens han venter på Continue, lever han som i kampen: ser seg sakte om, og kjeven følger pusten. */
          { const lv = io(seg(t, Q.NAME + 1.2, Q.NAME + 3.2)); g.add({ Neck1: [0, 0.03 * sin(t * 0.9 + 1), 0.06 * sin(t * 0.55)], Head: [0, 0.02 * sin(t * 1.3), 0.03 * sin(t * 0.55 + 0.6)], Jaw: [0, -0.06 - 0.04 * sin(t * 2.4), 0], '*Arm': [0.03 * sin(t * 2.4 + 0.5), 0, 0] }, lv); }
          /* 2 Brølet: lyden starter inne i steinen (GRL), og på klimakset bryter kjeven løs og alt knuses. Han brøler lenger før navnet enn i skisse 1, og kjeften lukkes idet
             navnet kommer (regelen: brølet er over når navnet står der). */
          rw = t < Q.ROAR ? 0 : back(seg(t, Q.ROAR, Q.ROAR + 0.36), 2.4) * (1 - io(seg(t, Q.NAME + 0.3, Q.NAME + 1.0)));   /* skisse 3: brølet 0,1 s etter slaget */
          S.mouth = null; g.add(ROAR, rw); g.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); g.rot('Head', 0, 0, 0.022 * sin(t * 43) * rw); S.rw = rw;
        } else { const A = MVI(t); ry = HOME[1] + A.y; g.root.position.set(HOME[0], ry, HOME[2]); rw = S.rw = poseI(g, A, t); S.mouth = null; S.blink = A.bl; }   /* den nye bevegelsen fra knuset (Opus 25.11, «BEVEGELSEN» over) */
        /* Øyet: lukket stein til EYE, så åpent, smalt fra rett før klimakset; blunker mens han venter. */
        const E = g.mats.Eye1.uniforms, nar = (t >= Q.CLX - 0.35 && t < Q.CLX + 3.4), eye = t < Q.EYE ? [0, 0.5] : t < Q.EYE + 0.07 || (pre || STIV() ? t > Q.CLX + 4 && (t - Q.CLX) % 4.4 < 0.12 : S.blink) || nar ? [0, 0.75] : [0, 0];
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
          S.post.fade = 1 - seg(t, Q.B0, Q.B0 + 1.4); S.post.sh = X.hk(S, t, Q.TK, 0.6, 0.8); S.post.vig = 0.62; dbg(); }],
        /* 2 UNDER DEN LILLE BROA (0:21,56, bass-slaget): lavt i bekkeleiet like sør for buen. Gjennom buen: stien, toriien og han, grå og enorm bak alt som er i
           menneskestørrelse. Støv drysser fra buen på slagene, og kameraet siger sakte inn. */
        [Q.UB - 0.03, (S, u, a, t) => { const e = io(u); K.cam(-2.5, 0.22, mix(25.4, 24.9, e), mix(-0.3, -0.1, e), mix(3.75, 3.95, e), 2.8, mix(44, 46, e), 0.012);
          S.post.sh = X.hk(S, t, Q.UB, 0.7, 2.4) + X.hk(S, t, Q.R2, 0.7, 2.4) + X.hks(S, t, [23.07, 24.04], 0.4, 0.6); S.post.vig = 0.7; dbg(); }],
        /* 3 DET KOMMER (0:26,96–0:35,4): fra stien vest for broa, mellom steinlyktene, mot fjellet. Gløden stiger i krateret, røyken pulserer, bakken rister på
           slagene, og en lykt velter (0:32,6). Kameraet zoomer sakte inn. */
        [Q.S3, (S, u, a, t) => { K.far(1200); const e = io(u); K.cam(mix(-7.2, -7.0, e), 0.7, mix(26.4, 26.0, e), -40, mix(58, 70, e), -330, mix(36, 27, e));
          S.post.sh = X.rk(S, 0.4 * seg(t, Q.S3, Q.OV), 2.0) + X.hks(S, t, [29.78, 32.6, 34.54], 0.5, 1.5, 'e'); S.post.vig = 0.6; dbg(); }],
        /* 4 ILDFONTENENE (0:35,42–0:49,5): fjellet tett på med lang linse. Gardinet av ildfontener sprekker opp på slaget, lava spruter ned sidene og elvene raser,
           lyn i askeskyen (0:39,64), og så sakte ut til han står som en svart silhuett foran fjellet (0:46,7; «Tøft med vulkanen»). */
        [Q.OV, (S, u, a, t) => { K.far(1400); const z = io(seg(t, 40.4, 48.6)), fov = 15 * Math.pow(50 / 15, z), M = [mix(-40, -1.0, z), mix(150, 9, z * z * 0.4 + z * 0.6), mix(-330, -20, z)];
          K.cam(mix(11, 1.45, z), mix(1.8, 0.9, z), mix(24, 16.0, z), M[0], M[1], M[2], fov, -0.03 * z); S.post.sh = X.hk(S, t, Q.OV, 1.0, 1.6, 'e') + X.hk(S, t, Q.LY, 0.6, 1.2, 'e') + X.hk(S, t, 40.75, 0.5, 1.0, 'e'); S.post.fl = 0.25 * hit(t, Q.OV, 0.15); S.post.flc = '#ffd890'; dbg(); }],
        /* 5 FLOMMEN, kilden først (Jazz 20.11: «det føles ut som det kommer fra ingen plass»): dronen følger fronten på den midterste elva ned fjellsiden mot
           krateret hans (0:49,52), og så et nærbilde der fronten velter forbi (0:53,77). */
        [Q.S5, (S, u, a, t) => { K.far(1100); const P = rivFront(5, t), dx = P[0] - VOL.x, dz = P[2] - VOL.z, dl = Math.hypot(dx, dz), fx = dx / dl, fz = dz / dl, k = io(seg(t, Q.S5, 53.77));
          K.cam(P[0] - fx * mix(26, 15, k) - fz * 7, P[1] + mix(19, 9, k), P[2] - fz * mix(26, 15, k) + fx * 7, P[0] + fx * 40, P[1] - mix(8, 6, k), P[2] + fz * 40, 52, 0.05 * sin(t * 0.7));
          S.post.sh = X.hk(S, t, Q.S5, 0.6, 0.5) + X.hk(S, t, Q.FALL, 0.5, 0.9, 'e') + X.rk(S, 0.25); dbg(); }],
        [53.77, (S, u, a, t) => { const P0 = rivFront(5, Q.WALL + 0.2), P = rivFront(5, t), dx = P0[0] - VOL.x, dz = P0[2] - VOL.z, dl = Math.hypot(dx, dz), fx = dx / dl, fz = dz / dl;
          K.cam(P0[0] + fx * 9 + fz * 4.5, P0[1] + 2.2, P0[2] + fz * 9 - fx * 4.5, P[0], P[1] + 0.6, P[2], 46); S.post.sh = X.hk(S, t, 53.77, 0.5, 0.6, 'e') + X.rk(S, 0.35); dbg(); }],
        /* Det vide bildet (0:55,16): høyt over krateret. Lavafallet står over den høye veggen til venstre, lunta raser ned bekkeleiet, og veggen av lava kommer ut
           under fjellets skjørt bak ham. */
        [Q.WALL - 0.03, (S, u, a, t) => { const e = io(seg(t, Q.WALL, 57.4)); K.cam(mix(15, 11, e), mix(11, 8.5, e), mix(46, 41, e), mix(-16, -11, e), mix(2, 1.5, e), mix(-10, -6, e), 52); S.post.sh = X.hk(S, t, Q.WALL, 0.8, 1.4, 'e') + X.rk(S, 0.3); dbg(); }],
        /* Broa (0:57,3): samme sted som bilde 2, lavt i bekken. Lunta kommer mot oss gjennom buen og knuser den på slaget (0:57,98); steinene kastes mot kameraet. */
        [57.3, (S, u, a, t) => { const e = seg(t, 57.3, 59.0); K.cam(-2.6, mix(0.3, 0.7, e), mix(25.2, 26.4, e), -2.3, mix(1.4, 1.7, e), 16, 46, -0.02); S.post.sh = X.rk(S, 0.5, 2.0) + X.hk(S, t, Q.BRO, 0.9, 3.4); S.post.fl = 0.3 * hit(t, Q.BRO, 0.12); S.post.flc = '#ffd890'; dbg(); }],
        /* Krystallene (0:59,0): lavt foran veggen av lava der den ruller over sletta. Krystallene i veien velter, lyser opp og går under. */
        [59.0, (S, u, a, t) => { const zf = wallZ(16.5, t), e = seg(t, 59.0, Q.S6); K.cam(16.2, mix(0.7, 0.95, e), zf + mix(7.6, 6.2, e), 16.9, mix(2.4, 2.0, e), zf - 3, 58, 0.03); S.post.sh = X.rk(S, 1.0 + 0.8 * e, 2.0); dbg(); }],
        /* 6 VEGGEN MOT HÆLENE (1:00,8–1:03,6): lavt foran veggen ved hans venstre side; den slår inn i hælene og halen på 1:03,62, der låta går ned et hakk. */
        [Q.S6, (S, u, a, t) => { const zf = wallZ(3, t), k = seg(t, Q.S6, Q.HIT); K.cam(mix(11, 9.5, k), mix(1.2, 0.9, k), min(zf + 9, 4.0), mix(2, 2.6, k), mix(1.2, 0.9, k), mix(zf - 6, 0.6, io(k)), 50); S.post.sh = X.rk(S, 0.6 + 1.2 * k, 2.2); dbg(); }],
        /* 7 LYSET, del 1 (1:03,62–1:12,08): bak ham, lavt ved hælen der lavaen traff. Lyset tennes i lavalinja og klatrer jevnt opp beinet, halen og ryggen. */
        [Q.HIT, (S, u, a, t) => { const e = io(u); K.cam(mix(6.6, 5.4, e), mix(0.7, 3.8, e), mix(-3.2, -5.4, e), mix(2.6, 0.6, e), mix(0.9, 4.2, e), mix(1.0, 0.2, e), 48); S.post.sh = X.hk(S, t, Q.HIT, 0.5, 1.4); dbg(); }],
        /* 8 LYSET, del 2 (1:12,08–1:21,0): vidt bakfra i det mørke rommet, så hele ryggen står og gløder; fra løftet (1:17,72) går kameraet rundt og opp over
           skulderen mens lyset når toppen av hodet. */
        [Q.QUIET, (S, u, a, t) => { const P = crs([[Q.QUIET, [9.5, 3.0, -9.5]], [Q.LIFT, [11, 3.6, -5.5]], [79.8, [10.4, 5.2, 3.2]], [81.0, [9.6, 5.6, 6.4]], [82, [9, 5.8, 8]]], t), M = crs([[Q.QUIET, [0, 4.0, 0.8]], [Q.LIFT, [0, 4.4, 1.4]], [79.8, [0.3, 4.9, 4.2]], [81.0, [0.4, 5.0, 5.4]], [82, [0.4, 5, 5.6]]], t);
          K.cam(P[0], P[1], P[2], M[0], M[1], M[2], 46); S.post.vig = 0.6 + 0.2 * seg(t, Q.LIFT, 81); S.post.sh = X.tatt(S, 0.3 * (hit(t, 72.11, 0.4) + hit(t, Q.LIFT, 0.5))); X.ev(S, 's', t - 72.11, 0.3); X.ev(S, 's', t - Q.LIFT, 0.3); dbg(); }],
        /* 8b ØYET (1:21,0–1:24,47): helt nært. Det åpner seg på bass-slaget 1:21,89 med et blaff, og holdes. De siste 0,35 s står alt stille: bare låta. */
        [81.0, (S, u, a, t) => { const e = S.W('Head', S.A.eye), c = S.W('Head', S.A.eyeCam), k = io(seg(t, 81.0, Q.CLX)); K.cam(mix(c.x, e.x, 0.16 * k), c.y, mix(c.z, e.z, 0.16 * k), e.x, e.y, e.z, 26);
          S.post.vig = 0.9; S.post.fl = 0.55 * hit(t, Q.EYE, 0.2); S.post.flc = '#ffe890'; S.post.sh = t < Q.STILL ? X.hk(S, t, Q.EYE, 0.6, 3.2) + X.rk(S, 1.1 * seg(t, Q.EYE + 0.5, Q.STILL), 2.2) : 0; dbg(); }],
        /* 9 HAN EKSPLODERER PÅ SLAGET (1:24,47): klipp til det lave, vide bildet forfra. Alt knuses på slaget, han er rød med en gang, brølet kommer 0,1 s etter
           med lyn i askeskyen, navnet på 1:25,9, og scenen lever videre til Continue eller 1:48. */
        [Q.CLX - 0.035, (S, u, a, t) => { const k = io(seg(t, Q.CLX + 0.7, Q.CLX + 5.2)), w = 0.04 * sin(max(0, t - Q.CLX - 5.2) * 0.23);   /* tett og lavt på slaget, så i en bue ut til bildet kampen starter fra */
          if (STIV()) K.cam(mix(3.4, -6.2, k) + sin(w) * 1.6, mix(0.85, 1.65, k), mix(13.6, 19.9, k), mix(-0.6, -3.5, k), mix(5.9, 4.6, k), mix(2.5, 2.8, k), mix(58, 52, k), -0.04 * (1 - k)); else camV(CAM9(t));
          S.post.fl = t < Q.CLX ? 0.7 : hit(t, Q.CLX, 0.09) * 0.9; S.post.flc = '#fff0b8'; S.post.sh = X.hk(S, t, Q.CLX, 1.0, 5) + X.hk(S, t, Q.ROAR, 0.6, 2.5, 'b') + X.rk(S, 0.7 * S.rw, 2.3); X.mouth(S, S.gr, Q.ROAR, t); S.post.heat = 0.6 + 0.6 * S.rw; dbg(); }],
      ],
    }, (S, t) => { if (t < Q.CLX) return; const ch = S.gr.at('Spine2'); S.aura.position.set(ch.x, ch.y + 0.4, ch.z - 0.6); K.face(S.aura); K.face(S.vflash); }));   /* fra knuset: lyset ved brystet etter dette bildets stilling og kamera */
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
