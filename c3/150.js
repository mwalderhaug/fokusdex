'use strict';
/* Fokusdex – Shadow Mewtwo (Dark Mewtwo i lagringen, S.raid.dk) i 3D (steg 3.2, bygget av Fable 26.11 fra skisse 6). Hentes av G3C.load(150); vanlige Mewtwo
   (4.6) får sin intro 'c3:150' her senere og arver hula. To filmer:
   'c3:dk150'  overgangen, én sammenhengende film fra Mewtwo faller til brølet: kampkameraet, øynene lukkes, dødsbildet og tre sekunder stillhet, knuset rett til
               svart (7,6 = Villain's Ascent 0:00, med takten 0:07,22–0:09,62 to ganger ekstra: filmen = 7,6 + låta, + 4,8 etter 0:09,62), rommet der han kneler
               og bare synes i oransje ladninger mens hullet spiser stjernene, full styrke 31,61 (0:19,21), brølet og navnet.
   'c3:dk150p' fase 2 på Where Is Your God Now fra 0:20,4 (filmen = låta − 20,4): alle stjernene eksploderer sammen, det rosa støvet går inn i hullet, hullet
               eksploderer, alt samles til en stråle langt borte som raser mot ham bakfra mens han stiger og bakken brekker, øynene tennes 0:32,4, treffet 0:34,26.
   Tidene, rekkefølgen, posene (Jazz sine) og det låste: work/raids3d/shadow-mewtwo/til_fable.md. Det som er bygget og det som er åpent: …/fable.md.
   1 enhet = 1 m. Øya i hula: sentrum (0, 0, 0), toppen y = 0; han står i sentrum, vendt mot +z. Hullet står bak ham, litt til venstre (HAZ, BEL). */
(() => {
  const K = G3D.K, C = CINE.kit, X = G3C, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, hit, rnd } = K, kf = C.kf;
  const FALL = 0.25, TXT = 0.7, WIN = 2.35, DIE = 3.45, SIL = 4.6, S0 = 15.0, VA = x => S0 + x;
  /* FRA KAMPEN I 2D (darkRise, rettet etter kontrollen 26.11): kampen har vist fallet og «The wild Mewtwo fainted!», så filmen starter på kortet (WIN, def.mus.j2d) i
     nærbildet, uten kampkameraet (Mewtwo-kampen er ikke i 3D før 4.6), HUD-en og teksten. C.cur.x = { j2d, mlv, xp, coins } fra legendIntro; uten (Sandbox → Films, live)
     er filmen som før, fra 0 med kampkameraet og skissens tall. */
  const XC = () => { const c = C.cur; return (c && c.x) || {}; }, J2D = () => !!XC().j2d, NUM = (v, d) => (v == null ? d : v).toLocaleString('en-US');
  const P1 = VA(4.81), P2 = VA(6.61), P3 = VA(8.41), DRUM = VA(9.61), NAME = DRUM + 1.3, LEN = NAME + 3.0;
  const HM = 2.5, LD = (() => { const v = [0.4, -1, -0.7], l = Math.hypot(...v); return v.map(x => x / l); })();
  const SKIN = { bg: '#0b0706', top: '#ff9a3c', bot: '#4a200c', cap: '#ffc890', grad: ['#fff0dc', '#ff9a3c', '#a8401a'], lv: '#ffe2c4', ink: [12, 6, 4] };
  const hx = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const u3s = (u, h) => { const c = hx(h); u.value.setRGB(c[0], c[1], c[2]); };
  /* ---------- Hula (grovt: Fable lager den ordentlig, og den er også arenaen til Mewtwo): øya, innsjøen, veggene, istappene av stein, krystallene, lyssøylen ---------- */
  const RV = `varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const RVI = `varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const RF = `varying vec3 vW, vN; uniform vec3 uA1, uA2, uN1, uN2, uUpC, uPoolC; uniform float uNeg, uUp, uTop, uDark, uPool;
${K.GLSL.COMMON}
void main(){ vec3 N = normalize(vN); float n = fbm(vW.xz * .35 + vW.y * .2) * .7 + fbm(vec2(vW.x + vW.z, vW.y) * 1.3) * .3;
  vec3 b = mix(mix(uA1, uA2, n), mix(uN1, uN2, n), uNeg); float l = .45 + .55 * tone3(dot(N, normalize(vec3(.3, 1., .5))), -.1, .45);
  vec3 c = b * l + uUpC * uUp * clamp(-N.y * .5 + .6, 0., 1.) * (1. - smoothstep(0., 9., vW.y));
  c = mix(c, b * 1.2, uTop * step(.8, N.y));
  float pool = uPool * (1. - smoothstep(2.0, 6.8, length(vW.xz))) * step(.8, N.y); c = mix(c, mix(uPoolC, vec3(.16, .08, .04), uNeg) * (.75 + .25 * n), pool * .78); c *= 1. - uDark; gl_FragColor = vec4(mix(c, uFogC, fogK(vW) * .9), 1.); }`;
  const LF = `varying vec3 vW, vN; uniform float uNeg, uGl, uDark, uOr; uniform vec3 uC1, uC2, uN1, uN2, uO;
${K.GLSL.COMMON}
void main(){ float r = length(vW.xz); vec2 p = vW.xz * .18 + vec2(uTime * .03, -uTime * .02); float n = fbm(p) * .6 + fbm(p * 2.7 + uTime * .05) * .4;
  float rip = smoothstep(.55, .75, fbm(vW.xz * .9 + vec2(uTime * .1, 0.)));
  vec3 a = mix(uC1, uC2, (1. - smoothstep(6., 26., r)) * uGl) * (.75 + .5 * n) + uC2 * rip * .25 * uGl, b = mix(uN1, uN2, n) + uN2 * rip * .5;
  vec3 c = mix(a, b, uNeg) + uO * uOr * (.25 + .75 * rip) * (1. - smoothstep(4., 30., r)); c *= 1. - uDark; gl_FragColor = vec4(mix(c, uFogC, fogK(vW) * .8), 1.); }`;
  const XV = `attribute vec4 aI; varying vec3 vW, vN; varying vec4 vI; void main(){ vI = aI; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const XF = `varying vec3 vW, vN; varying vec4 vI; uniform float uNeg, uMode, uDark, uEmb; uniform vec3 uB, uO;
${K.GLSL.COMMON}
void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = pow(1. - abs(dot(N, V)), 2.);
  float dr = uMode > .5 ? smoothstep(vI.y, vI.y + .35, uTime) : 0.;
  float fl = uMode > .5 ? smoothstep(vI.z, vI.z + .12, uTime) * (.55 + 1.6 * exp(-max(0., uTime - vI.z) * 3.)) : 0.;
  vec3 blue = uB * (.5 + .5 * f) + vec3(.85, .95, 1.) * f * .6, neg = vec3(.08, .015, .01) + vec3(.9, .25, .05) * f * .8, dark = vec3(.015, .015, .02) + uO * f * .25 * uEmb;
  vec3 c = mix(mix(blue, neg, uNeg), dark, dr) + uO * fl * (.55 + .6 * f); c *= 1. - uDark; gl_FragColor = vec4(mix(c, uFogC, fogK(vW) * .7), 1.); }`;
  const BF = `varying vec3 vW, vN; uniform float uA; uniform vec3 uC; void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = abs(dot(N, V));
  gl_FragColor = vec4(uC * uA * f * f * ((1. - smoothstep(2., 28., vW.y)) * .6 + .4), 1.); }`;
  const rockU = () => ({ uA1: K.uv(K.u3('#0c1220')), uA2: K.uv(K.u3('#22304a')), uN1: K.uv(K.u3('#b9a283')), uN2: K.uv(K.u3('#efe0c6')), uUpC: K.uv(K.u3('#3a9ad8')), uPoolC: K.uv(K.u3('#c4e6ff')), uNeg: K.uv(0), uUp: K.uv(1), uTop: K.uv(0), uDark: K.uv(0), uPool: K.uv(0) });
  const CRY = (() => { const L = [], ring = (n, r0, r1, y0, h0, h1, k) => { for (let i = 0; i < n; i++) { const a = rnd(i, 3 + k * 7) * TAU, r = r0 + (r1 - r0) * rnd(i, 4 + k * 7);
    L.push({ x: cos(a) * r, z: sin(a) * r, y: y0, h: h0 + (h1 - h0) * rnd(i, 5 + k * 7), rx: (rnd(i, 6 + k * 7) - 0.5) * 0.7, rz: (rnd(i, 8 + k * 7) - 0.5) * 0.7, ring: k, s: rnd(i, 9 + k * 7) }); } };
    ring(14, 6.0, 7.2, -0.2, 0.7, 1.8, 0); ring(30, 11, 17, -0.6, 1.2, 3.2, 1); ring(46, 22, 34, -0.6, 2.0, 4.8, 2); return L; })();
  const cave = (T, S) => { const g = new T.Group();
    const isl = new T.Mesh(new T.CylinderGeometry(7.4, 8.6, 3, 40, 1), K.shader(RV, RF, Object.assign(rockU(), { uTop: K.uv(1) }))); isl.position.y = -1.5; g.add(isl);
    const lake = new T.Mesh(new T.CircleGeometry(60, 64), K.shader(RV, LF, { uNeg: K.uv(0), uGl: K.uv(1), uDark: K.uv(0), uOr: K.uv(0), uC1: K.uv(K.u3('#04101e')), uC2: K.uv(K.u3('#1c6aa4')),
      uN1: K.uv(K.u3('#2a0f08')), uN2: K.uv(K.u3('#7a3416')), uO: K.uv(K.u3('#ff8a2a')) })); lake.rotation.x = -PI / 2; lake.position.y = -0.35; g.add(lake);
    const wall = new T.Mesh(new T.CylinderGeometry(42, 46, 40, 48, 4, true), K.shader(RV, RF, rockU(), { side: T.BackSide })); wall.position.y = 14; g.add(wall);
    const roof = new T.Mesh(new T.SphereGeometry(44, 32, 12, 0, TAU, 0, PI / 2), K.shader(RV, RF, rockU(), { side: T.BackSide })); roof.scale.y = 0.35; roof.position.y = 33; g.add(roof);
    const st = new T.InstancedMesh(new T.ConeGeometry(1, 1, 7), K.shader(RVI, RF, rockU()), 70), o = new T.Object3D();
    for (let i = 0; i < 70; i++) { const a = rnd(i, 21) * TAU, r = 9 + 30 * rnd(i, 22), L = 2 + 7 * rnd(i, 23); o.position.set(cos(a) * r, 33 - L / 2 - 2 * rnd(i, 24), sin(a) * r); o.rotation.set(PI, 0, 0); o.scale.set(0.5 + 0.9 * rnd(i, 25), L, 0.5 + 0.9 * rnd(i, 25)); o.updateMatrix(); st.setMatrixAt(i, o.matrix); }
    st.frustumCulled = false; g.add(st);
    const fl = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), K.shader(RVI, RF, rockU()), 8); fl.frustumCulled = false; S.fl = fl; g.add(fl);
    const cg = new T.OctahedronGeometry(0.5, 0), n = CRY.length, aI = new Float32Array(n * 4);
    CRY.forEach((q, i) => { const r = Math.hypot(q.x, q.z); aI.set([q.ring, 6.3 + (1 - c01((r - 6) / 30)) * 2.7 + q.s * 0.25, [P3, P2, P1][q.ring] + q.s * 0.18, q.s], i * 4); });
    cg.setAttribute('aI', new T.InstancedBufferAttribute(aI, 4));
    const cr = new T.InstancedMesh(cg, K.shader(XV, XF, { uNeg: K.uv(0), uMode: K.uv(0), uDark: K.uv(0), uEmb: K.uv(0), uB: K.uv(K.u3('#3ab0ff')), uO: K.uv(K.u3('#ff8a2a')) }), n);
    CRY.forEach((q, i) => { o.position.set(q.x, q.y + q.h * 0.45, q.z); o.rotation.set(q.rx, q.s * TAU, q.rz); o.scale.set(0.55 + 0.4 * q.s, q.h, 0.55 + 0.4 * q.s); o.updateMatrix(); cr.setMatrixAt(i, o.matrix); });
    cr.frustumCulled = false; g.add(cr);
    const col = new T.Mesh(new T.CylinderGeometry(2.6, 3.4, 34, 32, 1, true), K.shader(RV, BF, { uA: K.uv(0.5), uC: K.uv(K.u3('#9fd8ff')) }, Object.assign(K.blend.add(), { side: T.DoubleSide, depthWrite: false })));
    col.position.y = 17; g.add(col);
    S.scene.add(g); S.cv = { isl, lake, wall, roof, st, fl, cr, col, rocks: [isl, wall, roof, st, fl] }; };
  /* Hulas tilstand: neg (negativ, A), up (lyset fra innsjøen), gl (innsjøens glød), dark (alt slukner), col (lyssøylen), mode 1 = B (tappet krystall), emb (glør), or (oransje gjenskinn). */
  const caveSet = (S, t, q) => { const c = S.cv;
    for (const m of c.rocks) { const u = m.material.uniforms; u.uNeg.value = q.neg || 0; u.uUp.value = q.up == null ? 1 : q.up; u.uDark.value = q.dark || 0; u3s(u.uUpC, q.upc || '#3a9ad8'); }
    const lu = c.lake.material.uniforms; lu.uNeg.value = q.neg || 0; lu.uGl.value = q.gl == null ? 1 : q.gl; lu.uDark.value = q.dark || 0; lu.uOr.value = q.or || 0;
    const cu = c.cr.material.uniforms; cu.uNeg.value = q.neg || 0; cu.uMode.value = q.mode || 0; cu.uDark.value = (q.dark || 0) * 0.85; cu.uEmb.value = q.emb || 0;
    c.col.material.uniforms.uA.value = q.col == null ? 0.12 : q.col; c.isl.material.uniforms.uPool.value = c.col.material.uniforms.uA.value / 0.12 + (q.neg || 0); c.col.visible = c.col.material.uniforms.uA.value > 0.003;
    const o = new S.T.Object3D(); for (let i = 0; i < 8; i++) { const a = rnd(i, 41) * TAU, r = 10 + 9 * rnd(i, 42); o.position.set(cos(a) * r, 3.5 + 5 * rnd(i, 43) + 0.4 * sin(t * 0.6 + i), sin(a) * r);
      o.rotation.set(t * 0.1 + i, t * 0.07, i); o.scale.setScalar(0.35 + 0.5 * rnd(i, 44)); o.updateMatrix(); c.fl.setMatrixAt(i, o.matrix); } c.fl.instanceMatrix.needsUpdate = true; };

  /* Størrelsen: fra føttene til toppen av hodet = HM, målt på punktene som synes (Switch-modellens hale henger 0,7 m under føttene i hvilestillingen, og LOD-ene er skjult). */
  const fit = (T, g, pose) => { g.clear(); if (pose) g.add(pose, 1); g.apply(); g.root.scale.setScalar(1); g.root.position.set(0, 0, 0); g.root.rotation.set(0, 0, 0); g.root.updateMatrixWorld(true);
    const v = new T.Vector3(), P = [], vis = o => { for (let q = o; q && q !== g.root; q = q.parent) if (!q.visible) return false; return true; };
    g.root.traverse(o => { if (!o.isMesh || !vis(o) || !o.geometry.attributes.position) return; const n = o.geometry.attributes.position.count; for (let i = 0; i < n; i += 2) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); P.push(v.y, v.z); } });
    let y0 = 1e9, y1 = -1e9; for (let i = 0; i < P.length; i += 2) { y0 = min(y0, P[i]); y1 = max(y1, P[i]); } const zt = -0.14 * (y1 - y0); let ft = 1e9; for (let i = 0; i < P.length; i += 2) if (P[i + 1] > zt) ft = min(ft, P[i]);
    const k = HM / (y1 - ft); g.k = k; g.fy = -ft * k; g.root.scale.setScalar(k); };
  const setMouth = (g, n) => g.root.traverse(q => { if (q.isMesh && /_O_OBJ_/.test(q.name)) q.visible = q.name.indexOf(n) >= 0; });
  /* Stillingene (målt i skissen: L_Arm y− senker armen, R_Arm y+ speilet; Head x+ bøyer hodet ned; Spine1 x+ fram). */
  const DOWN = { L_Arm: [0, -1.15, 0], R_Arm: [0, 1.15, 0] };
  /* Mewtwo (Switch): bennavnene har tallet sitt (left_arm_01); left_shoulder z− senker armen, tail_01 y+ løfter halen (z svinger den til siden) (målt i skissen). */
  const MPOSE = { left_shoulder: [0, 0, -0.55], right_shoulder: [0, 0, 0.55], left_arm_01: [0, 0, -0.45], right_arm_01: [0, 0, 0.45], tail_01: [0, 0.35, 0] };
  const poseD = (g, P) => { g.add(DOWN, 1); g.add({ Spine1: [0.04 * sin(P.t * 1.4) + 0.18 * P.bow - 0.22 * P.roar, 0, 0], Head: [0.35 * P.bow - 0.45 * P.roar + 0.12 * P.look, 0.25 * P.turn, 0] }, 1);
    if (P.arm) g.add({ L_Arm: [0, 0.75 * P.arm, -0.4 * P.arm] }, 1); if (P.roar) g.add({ L_Arm: [0, 0.35 * P.roar, -0.25 * P.roar], R_Arm: [0, -0.35 * P.roar, -0.25 * P.roar] }, 1); };
  const P0 = t => ({ t, bow: 0, roar: 0, look: 0, turn: 0, arm: 0 });
  /* ---------- POSENE fra Jazz (chat 10, 21.11; bildene: fanart/dark-mewtwo/jazz_21-11_poser_ark.jpg). Målt på Pokkén-modellen (tools/legprobe.js, armprobe.js):
     beina: *_UpLeg z− fører låret fram og opp, z+ bakover; *_Leg z+ bøyer kneet (leggen bakover); *_Foot z+ peker tærne ned. z er IKKE speilet (samme fortegn på begge sider);
     *_UpLeg y: venstre y− ut til siden, høyre y+ ut (speilet). Armene: *_Arm z+ fram (ikke speilet), L_Arm y− ned og R_Arm y+ ned (speilet); *_ForeArm z− bøyer albuen (hånda fram og opp).
     Spine1 og Spine2 x+ bøyer overkroppen fram; Head x+ bøyer hodet ned. ---------- */
  /* Fase 1 (introen): superhelt-landingen fra bilde 1: på høyre kne, venstre fot plantet foran, høyre hånd flatt i bakken, venstre neve løftet ved skulderen, hodet ned mot bakken. */
  /* Armene er korte mot kroppen: med ryggen bøyd fram (Spine1 0,55) når fingertuppene bakken ved siden av og litt foran kneet, ikke håndflata (målt med tools/sweep.js:
     håndleddet står 0,3 over). Neven står litt under og foran venstre skulder. */
  const KNEEL = { L_UpLeg: [0, -0.2, -1.62], L_Leg: [0, 0, 1.5], L_Foot: [0, 0, 0.12], R_UpLeg: [0, 0.12, 0.1], R_Leg: [0, 0, 1.78],
    Spine1: [0.55, 0, 0], Spine2: [0.25, 0, 0], Neck: [0.15, 0, 0], Head: [0.3, 0, 0], R_Arm: [0, 1.4, 0.45], R_ForeArm: [0, 0, -0.1], L_Arm: [0, -0.6, 0.35], L_ForeArm: [0, 0, -2.3] };
  /* Fase 2: han stiger sakte (bilde 2): armene ut og ned, åpne hender, brystet fram, beina henger med tærne ned. */
  const RISE = { L_Arm: [0, -0.62, 0.18], R_Arm: [0, 0.62, 0.18], L_ForeArm: [0, 0.18, -0.12], R_ForeArm: [0, -0.18, -0.12], Spine1: [-0.14, 0, 0], Spine2: [-0.1, 0, 0],
    L_UpLeg: [0, -0.04, -0.14], R_UpLeg: [0, 0.04, -0.04], L_Leg: [0, 0, 0.4], R_Leg: [0, 0, 0.18], L_Foot: [0, 0, 0.55], R_Foot: [0, 0, 0.5] };
  /* Halen (SWG_Tail01–10__swing; målt: z− ned, z+ opp, x+ mot hans venstre side, y vrir): i hvilestillingen står den 2,1 m rett bakover. Når han kneler, legger den seg på bakken
     og krummer seg rundt mot venstre; når han stiger, henger den ned. */
  const tailP = (a, b) => { const P = { SWG_Tail01__swing: a }; for (let i = 2; i <= 10; i++) P['SWG_Tail' + (i < 10 ? '0' : '') + i + '__swing'] = b(i); return P; };
  const TAILK = tailP([0.25, 0, -0.32], i => [0.24, 0, i < 4 ? 0.12 : 0]), TAILR = tailP([0.1, 0, -1.05], i => [0.04, 0, i < 6 ? 0.16 : 0.05]);
  Object.assign(KNEEL, TAILK); Object.assign(RISE, TAILR);
  /* Posen: k = kneling (0–1), r = stigningen (0–1); resten som poseD (bow, look, roar). Roten legges så kneet står i bakken når han kneler (gr = y der bakken er). */
  const poseKR = (g, P, k, r) => { const s = max(0, 1 - k - r); g.add(DOWN, s); g.add(KNEEL, k); g.add(RISE, r);
    g.add({ Spine1: [0.04 * sin(P.t * 1.4) * s - 0.22 * P.roar, 0, 0], Head: [0.35 * P.bow - 0.45 * P.roar + 0.12 * P.look, 0.25 * P.turn, 0] }, 1);
    if (P.roar) g.add({ L_Arm: [0, 0.35 * P.roar * s, -0.25 * P.roar], R_Arm: [0, -0.35 * P.roar * s, -0.25 * P.roar] }, 1); };
  const kneelY = g => { g.root.position.set(0, g.fy, 0); g.apply(); return g.fy - min(g.at('R_Leg').y - 0.08, g.at('L_Foot').y - 0.16); };
  /* Mewtwo faller: stiv, sidelengs mot venstre i bildet (rundt føttene), med et lite sprett. */
  const fallM = (S, t, t0) => { const k = t < t0 ? 0 : kf(t, [[t0, 0], [t0 + 0.75, 1.06, x => x * x], [t0 + 0.95, 0.97, eo], [t0 + 1.12, 1, io]]); const r = S.M.root; S.M.add(MPOSE, 1);
    r.position.set(0, S.M.fy + 0.33 * min(1, k), 0); r.rotation.set(0, 0, PI / 2 * k + 0.08 * hit(t, t0 - 0.2, 0.3)); return k; };
  const eyesW = (S, g) => { const h = g.at('Head'), f = g.k / S.D.k; return [[h.x - 0.09 * f, h.y + 0.17, h.z + 0.16], [h.x + 0.09 * f, h.y + 0.17, h.z + 0.16]]; };

  /* ---------- 2D oppå filmen: kampens HUD, teksten, resultatkortet, sprekkene, skårene, øynene, glitchen ---------- */
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const font = (g, px, w) => { const f = C.fontN(); g.font = `${w || f[1]}${px}px ${f[0]}`; };
  const hud = (g, t) => { const a = 1 - seg(t, WIN - 0.2, WIN + 0.2); if (a <= 0 || J2D()) return; g.save(); g.globalAlpha = a; rr(g, 14, 16, 196, 48, 8); g.fillStyle = 'rgba(14,14,20,.84)'; g.fill();
    font(g, 15, '600 '); g.fillStyle = '#fff'; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText('Mewtwo', 26, 24); g.textAlign = 'right'; g.fillText('Lv' + (XC().mlv || 70), 198, 24);
    const hp = 0.16 * (1 - seg(t, 0, FALL)); g.fillStyle = '#333'; g.fillRect(26, 46, 172, 7); g.fillStyle = hp > 0.2 ? '#5cd46a' : '#f04b3c'; g.fillRect(26, 46, 172 * hp, 7); g.restore(); };
  const textBox = (g, t) => { if (t < TXT || J2D()) return; const a = 1 - seg(t, WIN + 0.1, WIN + 0.5); if (a <= 0) return; const s = 'The wild Mewtwo fainted!', n = min(s.length, floor((t - TXT) * 30));
    g.save(); g.globalAlpha = a; rr(g, 10, 306, 492, 66, 8); g.fillStyle = 'rgba(14,14,20,.9)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.stroke();
    font(g, 17, '600 '); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s.slice(0, n), 28, 339); g.restore(); };
  /* Kortet: glir inn fra 2,35 og fryser på vei inn (3,45), som platen som dør. */
  const cardY = t => { if (t < WIN) return 999; const k = io(c01((min(t, DIE) - WIN) / 2.0)); return mix(470, 222, k); };
  const card = (g, cx, cy, gl, t) => { g.save(); g.translate(cx, cy); rr(g, -150, -82, 300, 164, 12); g.fillStyle = 'rgba(18,16,22,.95)'; g.fill(); g.strokeStyle = 'rgba(255,214,120,.55)'; g.lineWidth = 1.5; g.stroke();
    const j = (k, s) => gl > 0 ? (rnd(floor(t * 24) + k, s) - 0.5) * 10 * gl : 0;
    font(g, 24, '700 '); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd25a'; g.fillText('VICTORY!', j(1, 1), -50 + j(2, 1) * 0.3);
    font(g, 14, '600 '); g.fillStyle = '#e8e2d6'; const x = XC(); g.fillText('Mewtwo fainted · Lv ' + (x.mlv || 70), j(3, 2), -18); g.fillStyle = '#b8b2a6'; g.fillText('+' + NUM(x.xp, 1240) + ' XP   ·   +' + NUM(x.coins, 380) + ' coins', j(4, 3), 8);
    rr(g, -60, 34, 120, 30, 15); g.fillStyle = 'rgba(255,214,120,.18)'; g.fill(); g.fillStyle = '#ffe2a0'; g.fillText('Continue', 0, 49); g.restore(); };
  const eyes2 = (g, pts, k, t) => { if (k <= 0) return; for (const p of pts) { const q = K.proj(...p); if (q.z > 1) continue; const r = 2.6 + 1.4 * k + 0.5 * sin(t * 17 + p[0]);
    const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 2.4); gr.addColorStop(0, `rgba(255,236,200,${k})`); gr.addColorStop(0.25, `rgba(255,150,50,${0.9 * k})`); gr.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = gr; g.fillRect(q.x - r * 2.4, q.y - r * 2.4, r * 4.8, r * 4.8); } };
  /* Glitch (signaturen: korrupsjonen): RGB-splitt og et bånd som renner nedover (pikselsortering i grovt). */
  const glitch = (g, k, t) => { if (k <= 0.02) return; const y0 = floor(60 + rnd(floor(t * 20), 81) * 260), h = floor(20 + 50 * k), d = g.getImageData(0, y0, 512, h), s = d.data, o = new Uint8ClampedArray(s), sh = floor(4 + 10 * k);
    for (let y = 0; y < h; y++) for (let x = 0; x < 512; x++) { const i = (y * 512 + x) * 4, ir = (y * 512 + min(511, x + sh)) * 4, ib = (y * 512 + max(0, x - sh)) * 4; s[i] = o[ir]; s[i + 2] = o[ib + 2]; }
    for (let x = 0; x < 512; x += 2) { if (rnd(x, floor(t * 15)) > 0.55 * k) continue; let best = 0; for (let y = 0; y < h; y++) { const i = (y * 512 + x) * 4, l = s[i] + s[i + 1] + s[i + 2]; if (l > best) best = l; else { const j = ((y - 1) * 512 + x) * 4; s[i] = s[j]; s[i + 1] = s[j + 1]; s[i + 2] = s[j + 2]; } } }
    g.putImageData(d, 0, y0); };
  /* Skårene: knuset på S0. Cellene rundt et treffpunkt; innerst først, noen mot kamera. Innholdet er glasset slik det var: svart, kortet, sprekkene. */
  const SHC = [256, 226], SH = (() => { const A = [], R = [0, 46, 110, 200, 620]; for (let i = 0; i < 15; i++) A.push(i / 15 * TAU + (rnd(i, 90) - 0.5) * 0.3); const L = [];
    for (let i = 0; i < 15; i++) for (let j = 0; j < 4; j++) { const a0 = A[i], a1 = A[(i + 1) % 15] + (i === 14 ? TAU : 0), r0 = R[j], r1 = R[j + 1], q = [];
      q.push([cos(a0) * r0, sin(a0) * r0]); if (r0 > 0) q.push([cos(a1) * r0, sin(a1) * r0]); q.push([cos(a1) * r1, sin(a1) * r1]); q.push([cos(a0) * r1, sin(a0) * r1]);
      const am = (a0 + a1) / 2, rm = (r0 + r1) / 2; L.push({ q, c: [cos(am) * rm, sin(am) * rm], j, d: 0.025 * j + 0.05 * rnd(i * 4 + j, 91), w: (rnd(i * 4 + j, 92) - 0.5) * 5, z: rnd(i * 4 + j, 93) > 0.7 ? 1.1 : 0.12, v: 60 + 160 * rnd(i * 4 + j, 94) }); } return L; })();
  const drawCell = (g, p, dx, dy, rot, sc, glass, a, edge, tw) => { g.save(); g.globalAlpha = a == null ? 1 : a; g.translate(SHC[0] + p.c[0] + dx, SHC[1] + p.c[1] + dy); g.rotate(rot); if (tw) { const ax = p.w * 1.3; g.rotate(ax); g.scale(1, max(0.06, abs(cos(tw)))); g.rotate(-ax); } g.scale(sc, sc); g.translate(-p.c[0], -p.c[1]);
    g.beginPath(); p.q.forEach((v, i) => i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1])); g.closePath(); g.save(); g.clip(); g.translate(-SHC[0], -SHC[1]); glass(g); g.restore();
    if (tw) { const sh = max(0, 1 - abs(cos(tw)) * 3.2); if (sh > 0) { g.fillStyle = `rgba(255,214,170,${0.7 * sh})`; g.fill(); } g.strokeStyle = 'rgba(8,5,4,.9)'; g.lineWidth = 3.2; g.stroke(); }
    g.strokeStyle = edge || 'rgba(255,255,255,.75)'; g.lineWidth = 1.4; g.stroke(); g.restore(); };
  const lightCave = (U, q) => { U.uKeyC.value.setRGB(...hx(q.key || '#d8ecff')); U.uShC.value.setRGB(...hx(q.sh || '#16243a')); U.uRimK.value = q.rim == null ? 0.7 : q.rim; U.uGlow.value = q.glow == null ? 0.35 : q.glow;
    U.uFog.value.set(40, 110, q.fogK == null ? 0.75 : q.fogK); U.uFogC.value.setRGB(...hx(q.fog || '#030710')); if (q.rimc) U.uRimC.value.setRGB(...hx(q.rimc)); if (q.glowc) U.uLavaC.value.setRGB(...hx(q.glowc)); };
  const CU5 = (S, u) => { const p = S.M.at('head'); K.cam(p.x - 0.05, p.y + 0.75, p.z + mix(1.6, 1.35, u), p.x - 0.18, p.y + 0.05, p.z + 0.12, 28); };   /* nærbildet av hodet */
  const BCAM = (S, u, a, t) => { K.cam(-3.4, 3.5, 10.2, -1.9, 0.45, 0, 38); };   /* kampkameraet: Mewtwo oppe til høyre, som fienden i en Gen 5-kamp (bakken og skyggen over kortet) */
  const T3 = { CU: DIE - 0.05, EYC: [DIE, DIE + 1.1], C2: 5.2, MOVE: 6.0, PEEL: [7.0, 8.4], C3: 8.4, ARM: [8.5, 9.2], DR: [8.6, 10.6], DIM: [10.3, 10.9],
    C4: 10.95, SP: [11.05, 12.3], C5: 12.4, RISE: [12.5, 13.4], SN: [13.55, 13.9, 14.25], EY: 14.5, WAVE: [14.6, 15.0] };
  const TX1 = VA(0.5), TX2 = VA(2.0), TXO = VA(6.3), TX3 = [VA(9.9), VA(12.6)], LOOK = [VA(17.9), VA(18.75)], PUSH = VA(16.81), EXP = VA(19.21), NAME3 = EXP + 1.4, LEN3 = NAME3 + 3.0;
  const TGT = [0.05, 1.45, 0.12], BEL = 0.2, HAZ = PI + 0.215, sph = (az, el, R) => [sin(az) * Math.cos(el) * R, Math.sin(el) * R, cos(az) * Math.cos(el) * R];
  /* Øynene lukkes (målt i skissen: de øvre lokkene y −2,6, det nedre y +0,9; begge sider like). */
  const EYELID = k => { const P = {}; for (const s of ['left', 'right']) { for (const b of ['a', 'b', 'c', 'd_01', 'd_02', 'e']) P[s + '_upper_eyelid_' + b] = [0, -2.6 * k, 0]; P[s + '_lower_eyelid'] = [0, 0.9 * k, 0]; } return P; };
  const makeFigs = (T, S) => {
    const gm = K.model('mewtwo'); const M = S.M = K.figure(gm, { hide: /_lod[12]/, map: { Head: 'head', Neck: 'neck', Spine1: 'spine_01' } }); fit(T, M, MPOSE); S.scene.add(M.root); S.figs.push(M);
    const D = S.D = K.figure(K.model('mewtwo_dark'), { rules: [[/expressions/, { cut: 0.5 }], [/smewtwo_eye/, { eye: 1, mul: '#ffb36a' }]] }); fit(T, D); S.scene.add(D.root); S.figs.push(D); setMouth(D, 'normal_');
    /* Øynene ligger som utklipp i teksturen: alfatest i skyggeleggeren til akkurat disse materialene (motoren er urørt). */
    for (const n in D.mats) { const m = D.mats[n], k = 'vec4 tx = texture2D(map, vUv);'; if (/expressions/.test(n) && m.fragmentShader && m.fragmentShader.indexOf(k) >= 0) { m.fragmentShader = m.fragmentShader.replace(k, k + ' if (tx.a < .5) discard;'); m.needsUpdate = true; } } };
  /* Fargene på Shadow Mewtwo per del: kroppen (body, farge), krystallen (stone: hvor sterkt den gløder oransje; stoneC gir en annen farge), øynene (eye: 1 = svarte). */
  const dMats = (S, q) => { for (const n in S.D.mats) { const u = S.D.mats[n].uniforms;
    if (/stone/.test(n)) { u.uFlK.value = min(1, q.stoneC ? 1 : q.stone || 0); u.uFlC.value.setRGB(...hx(q.stoneC || '#ff9a3c')); u.uEmis.value = q.stoneC ? 0 : min(1, q.stone || 0); }
    else if (/eye|expression/.test(n)) { u.uFlK.value = q.eye || 0; u.uFlC.value.setRGB(0, 0, 0); } else { u.uFlK.value = q.body || 0; u.uFlC.value.setRGB(...hx(q.bodyC || '#000000')); } } };
  const lerpHex = (a, b, k) => { const A = hx(a), B = hx(b); return [0, 1, 2].map(i => floor(255 * mix(A[i], B[i], k))); };
  const aura = (g, S, t) => { const a = 1 - seg(t, DIE, DIE + 1.1); if (a <= 0 || t >= SIL) return; const fr = t < T3.CU && !J2D(), p = S.M.at(fr ? 'spine_02' : 'head'), c = K.proj(p.x, p.y, p.z); if (c.z > 1) return;
    const r = fr ? 46 : 150; g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    gr.addColorStop(0, `rgba(190,120,255,${(fr ? 0.2 : 0.3) * a})`); gr.addColorStop(1, 'rgba(120,60,220,0)'); g.fillStyle = gr; g.fillRect(c.x - r, c.y - r, 2 * r, 2 * r); g.restore(); };
  /* Sprekkene er lynet (valgt i melding 6): oransje kjerne, lilla kant. */
  const chestW = S => { const a = S.D.at('Spine2'), b = S.D.at('L_Shoulder'); return [mix(a.x, b.x, 0.55), mix(a.y, b.y, 0.55) + 0.05, mix(a.z, b.z, 0.55) + 0.12]; };
  const BOOM = Array.from({ length: 16 }, (_, i) => ({ a: rnd(i, 130) * TAU, v: 90 + 220 * rnd(i, 131), r: 14 + 26 * rnd(i, 132), d: 0.05 * rnd(i, 133) }));
  const SMOKE = Array.from({ length: 12 }, (_, i) => ({ a: rnd(i, 140) * TAU, v: 25 + 55 * rnd(i, 141), r: 30 + 40 * rnd(i, 142) }));
  const bolt = (g, x0, y0, x1, y1, seed, w, col) => { const n = 9; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i <= n; i++) { const u = i / n, j = i < n ? (rnd(i, seed) - 0.5) * 46 : 0; g.lineTo(mix(x0, x1, u) + j * 0.4, mix(y0, y1, u) + j); } g.stroke(); };
  /* Eksplosjonen på 0:19,21: klumper av oransje lys som sprer seg (ikke en hvit ball), røyk, stråler og lyn på tvers av bildet. */
  const boom = (g, S, t) => { const s = t - EXP; if (s < 0 || s > 4) return; const c = K.proj(...chestW(S)); g.save();
    for (const q of SMOKE) { const a = 0.45 * (1 - s / 3.5) * seg(s, 0.05, 0.3); if (a <= 0) continue; const x = c.x + cos(q.a) * q.v * s * 0.9, y = c.y + sin(q.a) * q.v * s * 0.5 + 10, r = q.r * (0.6 + s);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(60,25,12,${a})`); gr.addColorStop(1, 'rgba(30,12,6,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    g.globalCompositeOperation = 'lighter';
    for (const q of BOOM) { const u = s - q.d; if (u < 0 || u > 1.4) continue; const k = u / 1.4, e = 1 - (1 - k) ** 2, x = c.x + cos(q.a) * q.v * e * 1.1, y = c.y + sin(q.a) * q.v * e * 0.7, r = q.r * (0.6 + 1.6 * k), a = (1 - k) ** 1.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,220,160,${0.9 * a})`); gr.addColorStop(0.45, `rgba(255,120,40,${0.6 * a})`); gr.addColorStop(1, 'rgba(160,40,10,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    if (s < 0.9) { const a = 1 - s / 0.9; g.strokeStyle = `rgba(255,170,90,${0.5 * a})`; g.lineWidth = 2; for (let i = 0; i < 20; i++) { const an = i / 20 * TAU + 0.2 * rnd(i, 150), L0 = 20 + 260 * min(1, s * 3);
      g.beginPath(); g.moveTo(c.x + cos(an) * 12, c.y + sin(an) * 12); g.lineTo(c.x + cos(an) * L0, c.y + sin(an) * L0); g.stroke(); } }
    if (s < 0.75) { const fr = floor(t * 16); for (let k = 0; k < 4; k++) { const sd = fr * 7 + k * 31, side = k % 2, y0 = 40 + 300 * rnd(k, 160 + fr % 3), y1 = 40 + 300 * rnd(k, 170 + fr % 3), x0 = side ? 520 : -8, x1 = side ? -8 : 520;
      bolt(g, x0, y0, x1, y1, sd, 6, 'rgba(255,84,20,.4)'); bolt(g, x0, y0, x1, y1, sd, 2, 'rgba(255,190,110,.95)'); } }
    g.restore(); };
  const S5 = 7.6, EXT = 4.8, U5 = u => S5 + u, SH5 = 1.6, COS5 = S5 + SH5;
  const T5 = { CU: DIE - 0.05, EYC: [DIE, DIE + 1.1], WIDE: 5.6 };
  const TXA = U5(0.5), TXB = U5(2.0), TXC = U5(6.3), TX5 = [U5(11.6), U5(14.9)], LOOK5 = [U5(22.7), U5(23.55)], PUSH5 = U5(21.61), EXP5 = U5(24.01), NAME5 = EXP5 + 1.4, LEN5 = NAME5 + 3.0;
  /* Supernovaene: [u, størrelse, avstand (0 nær, 1 langt borte), tiden stoffet bruker inn i hullet]. Synlig størrelse og lyd følger begge (app = størrelse × nærhet). */
  const NV5 = [[8.41, 0.5, 0.85, 3.0], [10.81, 0.7, 0.6, 2.8], [13.21, 0.9, 0.45, 2.6],
    [14.41, 1.1, 0.15, 2.4], [15.61, 0.6, 0.7, 2.2], [16.81, 0.9, 0.35, 2.1], [18.01, 0.7, 0.55, 2.0],
    [19.21, 1.0, 0.25, 1.8], [19.81, 0.5, 0.8, 1.7], [20.41, 0.8, 0.4, 1.6], [21.01, 0.6, 0.65, 1.5], [21.61, 1.2, 0.1, 1.45],
    [21.91, 0.5, 0.75, 1.3], [22.21, 0.9, 0.3, 1.3], [22.51, 0.45, 0.85, 1.25], [22.81, 1.0, 0.3, 1.2], [23.11, 0.6, 0.6, 1.0], [23.41, 1.3, 0.05, 0.6]];
  const NVX5 = Array.from({ length: 12 }, (_, i) => [18.5 + 4.8 * rnd(i, 280), 0.3 + 0.25 * rnd(i, 281), 0.75 + 0.25 * rnd(i, 282), 1.4]);
  const NOVA5 = NV5.concat(NVX5).map(([u, sz, di, ti], i) => { let az = PI + (-0.35 + 0.87 * rnd(i, 283)), el = -0.12 + 0.6 * rnd(i, 284);
    const dx = az - HAZ, dy = el - BEL, d = Math.hypot(dx, dy); if (d < 0.13) { az = HAZ + dx / (d || 1) * 0.13; el = BEL + dy / (d || 1) * 0.13; }
    const t = U5(u), a = min(t + ti, EXP5 - 0.02), app = sz * (1 - 0.65 * di); return { i, t, sz, di, app, k: app, a, ti: a - t, p: sph(az, el, 300) }; });
  const ARR0 = min(...NOVA5.map(q => q.a));
  const HS0 = 0.005 ** 2, HC5 = (0.16 ** 2 - HS0) / NOVA5.reduce((s, q) => s + q.app, 0);
  const holeAng5 = t => { if (t < U5(4.75)) return 0; let A = HS0; for (const q of NOVA5) A += HC5 * q.app * io(seg(t, q.a - 0.1, q.a + 0.7)); return Math.sqrt(A); };
  const glow5 = t => { let g = 0; for (const q of NOVA5) { if (t < q.a) continue; const s = t - q.a, pr = seg(q.a, ARR0, EXP5);
      g += (0.4 + 0.9 * q.app) * (0.7 + 0.7 * pr) * c01(s / 0.06) * Math.exp(-s / (0.22 + 0.55 * q.app)); }
    return min(2.4, g + 1.0 * seg(t, EXP5 - 1.2, EXP5) ** 2); };
  const words5 = (g, t) => { const L = [[TXA, TXC, 'Mewtwo is dead.', 24, 158], [TXB, TXC + 0.2, 'Its death has fueled', 17, 204], [TXB + 0.35, TXC + 0.2, 'something far more powerful.', 17, 228]];
    for (const [a, b, s, px, y] of L) { const k = seg(t, a, a + 0.5) * (1 - seg(t, b, b + 0.6)); if (k <= 0) continue; g.save(); g.globalAlpha = k; font(g, px, '700 '); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,60,40,.55)'; g.fillText(s, 257.5, y); g.fillStyle = 'rgba(60,140,255,.45)'; g.fillText(s, 254.5, y); g.fillStyle = '#f2ece4'; g.fillText(s, 256, y); g.restore(); }
    const k3 = seg(t, TX5[0], TX5[0] + 0.5) * (1 - seg(t, TX5[1], TX5[1] + 0.6)); if (k3 > 0) { g.save(); g.globalAlpha = k3; font(g, 16, '700 '); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd2a8'; g.fillText('Now it devours the stars.', 256, 346); g.restore(); } };
  /* Knuset: dødsbildet (slik det står på skjermen) blir glass som knuses rett til svart. */
  const shards5 = (g, t) => { const s = t - S5; if (s < 0 || s > SH5) return; const cv = g.canvas, off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
    off.getContext('2d').drawImage(cv, 0, 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); g.restore();
    const glass = gg => gg.drawImage(off, 0, 0, 512, 384);
    for (const p of SH) { const age = s - p.d; if (age < 0) { drawCell(g, p, 0, 0, 0, 1, glass); continue; }
      const L = Math.hypot(p.c[0], p.c[1]) || 1, dx = p.c[0] / L * p.v * age, dy = p.c[1] / L * p.v * age + 520 * age * age, sc = 1 + p.z * age * 1.4, a = 1 - seg(age, 0.55, 1.15);
      if (a > 0) drawCell(g, p, dx, dy, p.w * age, sc, glass, a, 'rgba(255,150,60,.85)', age * (3 + 2.2 * abs(p.w))); } };
  const label5 = (x, t, o) => X.plate(x, t - NAME5, Object.assign({ lv: 75 }, o, { name: 'Shadow Mewtwo', cap: 'Shadow Pokémon', skin: SKIN }));   /* navnet er Shadow Mewtwo (appen sier fortsatt Dark Mewtwo i DARK.n) */
  /* =====================================================================================================================================================
     ROMMET I 3D (Fable, 26.11): himmelen er en kule rundt kameraet i filmens fulle oppløsning (stjernene, tåken, det svarte hullet med linse og skive, og
     stjernene som dør), stoffet som går i spiral inn i hullet er punkter på himmelen, og strålene er bånd i verden. Alt er en ren funksjon av tiden.
     Hullet (research/tid_rom_forvridning.md 12–14, mork_energi.md): en svart skygge med en skarp, lys ring; stjernene bak linses (β = θ − θE² / θ, skyggen ved
     0,7 · θE); skivas bakre del synes som en bue over og en tynn bue under skyggen, den fremre delen går foran; symmetrisk, uten Doppler. Hullet er et hull
     i noe som lyser (skiva og stoffet rundt), aldri en mørk flekk på svart.
     ===================================================================================================================================================== */
  const NN = 30, V3n = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const HD = V3n(sph(HAZ, BEL, 1)), HDX = V3n(crs(HD, [0, 1, 0])), HDY = crs(HDX, HD), dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const SKYV = `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + position, 1.); gl_Position = p; }`;
  const SKYF = `varying vec3 vD; uniform vec3 uH, uHx, uHy, uOn, uCl; uniform vec4 uNv[${NN}], uNw[${NN}]; uniform float uR, uHa, uFeed, uRing, uStar, uNeb, uLit; uniform vec2 uAllX; uniform vec4 uBh;
${K.GLSL.COMMON}
float sq(float x){ return x * x; }
vec3 hue(float k, float w){ vec3 a = k < .5 ? vec3(1., .43, .78) : k < 1.5 ? vec3(1., .78, .35) : k < 2.5 ? vec3(.72, .5, 1.) : vec3(1., .42, .3);
  vec3 b = k < .5 ? vec3(.43, .63, 1.) : k < 1.5 ? vec3(.3, .9, .85) : k < 2.5 ? vec3(.75, .88, 1.) : vec3(.35, .85, 1.); return mix(a, b, w); }
/* Stjernene: én per celle i to lag (store og få, små og mange). Hver tennes med sin gruppe (uOn) og blinker; i fase 2 eksploderer alle sammen (uAllX). */
vec3 stars(vec3 d){ vec2 p = vec2(atan(d.x, -d.z), asin(clamp(d.y, -1., 1.))); vec3 col = vec3(0.);
  for (int L = 0; L < 2; L++) { float fl = float(L), sc = L == 0 ? 24. : 58.; vec2 g = p * sc + fl * 7.3, id = floor(g), f = fract(g), h = h22(id + fl * 31.); float h3 = h21(id + 5.7 + fl * 13.), thr = L == 0 ? .42 : .55;
    if (h3 > thr) continue; vec2 c = .22 + .56 * h; float b = pow(h3 / thr, L == 0 ? 2.2 : 3.), r = length(f - c), s = L == 0 ? .03 + .05 * b : .045;
    float core = exp(-r * r / (s * s)), halo = L == 0 ? b * b * .22 * exp(-r / .08) : 0.;
    float on = (h.x < .34 ? uOn.x : h.x < .67 ? uOn.y : uOn.z) + h.y * .6, k = smoothstep(on, on + .4, uTime) * (1. + 1.6 * exp(-max(0., uTime - on) * 4.));
    float tw = .78 + .22 * sin(uTime * (2. + 3. * h.y) + h3 * 50.), I = (L == 0 ? .4 + 1.2 * b : .2 + .35 * b) * (core + halo) * k * tw;
    vec3 sc3 = mix(vec3(.8, .88, 1.), vec3(1., .86, .7), step(.8, h.y));
    float x = uTime - (uAllX.x + uAllX.y * pow(h.y, 1.3));
    if (x > -.25) { if (x < 0.) I *= 1. + 1.5 * smoothstep(-.25, 0., x); else { float e = exp(-x * 4.5) * (L == 0 ? .6 + b : .35); I = 0.;
      col += vec3(1., .6, .86) * e * 1.7 * exp(-r * r / (s * s * (3. + 9. * min(x * 3., 1.)))) + vec3(1.) * e * exp(-r * r / (s * s)); } }
    col += sc3 * I; }
  return col; }
void main(){ vec3 d = normalize(vD); float hz = dot(d, uH), R = max(uR, 1e-4); vec2 q = vec2(dot(d, uHx), dot(d, uHy)) / max(hz, .2); float r = length(q) + 1e-5, a = uHa * smoothstep(.3, .5, hz);
  vec3 dl = d; float inner = 1.;
  if (a > 0.) { float RE = R * 1.43, k = mix(1., 1. - RE * RE / (r * r), a); vec2 ql = q * k; dl = normalize(uH + ql.x * uHx + ql.y * uHy); inner = mix(1., smoothstep(R, R * 1.35, r), a); }
  vec3 col = stars(dl) * uStar * inner;
  float nb = smoothstep(.45, .85, fbm(dl.xy * 2.6 + vec2(dl.z * 1.7, 0.) + 3.)); col += vec3(.03, .045, .085) * nb * uNeb * inner;
  if (a > 0.) { vec2 qr = vec2(q.x * .995 + q.y * .0998, -q.x * .0998 + q.y * .995); float x = qr.x / R, y = qr.y / R, rr = r / R, th = atan(y, x), lr = log(max(rr, 1.)), out1 = step(1., rr);
    /* Stoffet rundt: armer som går i spiral innover, oransje innerst og fiolett ytterst; lyser med matingen. */
    float a2 = th + 1.7 * lr, n = fbm(vec2(cos(a2), sin(a2)) * 1.6 + lr * vec2(1.9, -1.3) - uTime * vec2(.22, .17)), arms = smoothstep(.42, .78, n) * exp(-lr * 1.05) * out1;
    vec3 hc = mix(vec3(1., .5, .14), vec3(.5, .3, .85), smoothstep(.3, 2.2, lr)) * arms * (.16 + .55 * uFeed);
    hc += vec3(1., .45, .12) * exp(-(rr - 1.) * 1.3) * out1 * (.09 + .24 * uFeed);
    /* Skivas bakre del, bøyd over toppen og under skyggen. */
    float sy = y / max(rr, 1e-3), t2 = th - uTime * .5, tex = .65 + .5 * vn(vec2(cos(t2), sin(t2)) * 4.);
    float I = (exp(-sq((rr - 1.24) / .085)) * smoothstep(-.2, .45, sy) + exp(-sq((rr - 1.09) / .04)) * (1. - smoothstep(-.5, .1, sy)) * .55) * tex;
    hc += (vec3(1., .5, .13) * I + vec3(1., .92, .72) * I * I * .8) * (.35 + .9 * uFeed);
    col = (col + hc * a) * mix(1., smoothstep(.97, 1.01, rr), a);
    /* Skivas fremre del (foran skyggen) og ringen. */
    float ey = y / .17, re = length(vec2(x, ey)), band = smoothstep(1.3, 1.5, re) * (1. - smoothstep(1.7, 3.6, re)), t3 = atan(ey, x) - uTime * 2.6 / pow(max(re, 1.), 1.5);
    float st = vn(vec2(cos(t3), sin(t3)) * 3.2 + re * 2.3), dI = band * pow(1.5 / max(re, 1.5), 1.6) * (.45 + .9 * st * st), vis = y < 0. ? 1. : smoothstep(.97, 1.01, rr);
    col += ((vec3(1., .5, .13) * dI + vec3(1., .93, .75) * dI * dI) * (.4 + uFeed) * vis + vec3(1., .86, .62) * exp(-sq((rr - 1.02) / .014)) * (.25 + 1.2 * uRing)) * a; }
  /* Fase 2: hullet eksploderer (uCl: sky, radius, blink): en sky av oransje støv med svarte årer. */
  if (uCl.x > 0. || uCl.z > 0.) { float cr = r / max(uCl.y, 1e-3), fr = smoothstep(.1, .4, hz), cloud = exp(-cr * cr * 1.3) * fr, tc = atan(q.y, q.x), n2 = fbm(vec2(cos(tc), sin(tc)) * 2.6 + cr * vec2(1.1, .7) + 7.), n3 = fbm(vec2(cos(tc * 2.), sin(tc * 2.)) * 3.1 - cr * 2.3 - 3.);
    col *= 1. - .9 * cloud * smoothstep(.42, .7, n3) * min(1., uCl.x * 2.);
    col += (vec3(1., .46, .13) * smoothstep(.25, .8, n2) + vec3(1., .8, .5) * smoothstep(.6, .9, n2) * .5) * cloud * (1. - .8 * smoothstep(.45, .7, n3)) * uCl.x * (.55 + .45 * exp(-cr * 2.));
    col += (vec3(1., .95, .85) * exp(-cr * cr * 3.) + vec3(1., .6, .25) * exp(-cr * 1.5) * .5) * uCl.z * fr; }
  /* Stjernene som dør: blafrer og sveller, trekker seg sammen, et blink med kors, to skall i artens to farger med tråder, og en sky som blir igjen. */
  for (int i = 0; i < ${NN}; i++) { vec4 A = uNv[i], B = uNw[i]; if (B.x <= 0.) continue; float s = uTime - A.w; if (s < -1.8 || s > B.y + 1.2) continue; if (dot(d, A.xyz) < .93) continue;
    vec3 tx = normalize(cross(vec3(0., 1., 0.), A.xyz)), ty = cross(A.xyz, tx); vec2 v = vec2(dot(d, tx), dot(d, ty)); float rr = length(v), app = B.x, sd = B.z;
    vec3 c1 = hue(B.w, 0.), c2 = hue(B.w, 1.), cs = mix(vec3(.85, .92, 1.), c1, .25);
    if (s < 0.) { float vv = 1. + s / 1.8, sw = smoothstep(-.45, -.07, s), shr = smoothstep(-.07, 0., s), fl = .75 + .25 * sin(uTime * (20. + 40. * vv) + sd * 30.) * vv;
      float rad = (.0022 + .0065 * app * sw) * (1. - .7 * shr), I = (.35 + .65 * app) * (.25 + .75 * vv) * fl;
      col += cs * I * (exp(-rr * rr / (rad * rad)) * 1.6 + .35 * (.3 + sw) * exp(-rr / (rad * 2.5)));
    } else { float fl = exp(-s * 5.) * min(1., .45 + app), fr = .016 + .085 * app, sw = .0011 + .0022 * app;
      float sp = exp(-abs(v.y) / sw) * exp(-abs(v.x) / (.06 + .26 * app)) + .7 * exp(-abs(v.x) / sw) * exp(-abs(v.y) / (.04 + .16 * app));
      col += (vec3(1.) * exp(-rr * rr / (fr * fr * .25)) + mix(vec3(1.), c2, .5) * exp(-rr / fr) * .8 + vec3(.95, .97, 1.) * sp * .9) * fl * 1.5;
      float sl = min(3.2, B.y + .9), u = clamp(s / sl, 0., 1.);
      if (u < 1.) { float ca = cos(sd * 6.), sa = sin(sd * 6.); vec2 w = vec2(v.x * ca + v.y * sa, (-v.x * sa + v.y * ca) / .66); float dd = length(w), an = atan(w.y, w.x);
        float R1 = (.012 + .15 * app) * (1. - pow(1. - u, 2.4)), al = pow(1. - u, 1.25) * min(1., .5 + app), fn = .55 + .9 * vn(vec2(cos(an), sin(an)) * 3.5 + sd * 17. + dd * 40.);
        float g1 = exp(-sq((dd - R1) / (R1 * .12 + .0015))), g2 = exp(-sq((dd - R1 * .78) / (R1 * .16 + .0015))), g3 = exp(-sq(dd / (R1 * .6 + .002))) * (.35 + .65 * vn(w * 160. + sd * 9.));
        col += (c1 * g1 * fn * 1.25 + c2 * g2 * fn * .8 + mix(c2, vec3(1.), .5) * g3 * .5 * (1. - u)) * al; } } }
  /* Lyset fra strålens hode (fase 2): en glød på himmelen rundt det, med en vannrett stripe som fra linsa. */
  if (uBh.w > 0.) { vec3 e = d - uBh.xyz; float a2 = dot(e, e); col += (vec3(1., .46, .16) * exp(-a2 * 9.) * .22 + vec3(1., .6, .5) * exp(-a2 * 90.) * .5 + vec3(1., .95, .88) * exp(-a2 * 1400.) + vec3(1., .7, .45) * exp(-abs(e.y) * 70.) * exp(-abs(e.x) * 3.5) * .35) * uBh.w; }
  gl_FragColor = vec4(col * uLit, 1.); }`;
  /* Punkter som JS setter for hvert bilde: plass, farge og størrelse i piksler. uSky = 1: plassen er en retning fra kameraet (himmelen). uDark = 1: mørke korn med
     oransje rand i alfablanding (de synes bare foran noe som lyser). */
  const PTV = `attribute vec4 aC; varying vec4 vC; uniform float uSky, uPs; void main(){ vC = aC; vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition * uSky, 1.); gl_Position = p; gl_PointSize = aC.w * uPs; }`;
  const PTF = `varying vec4 vC; uniform float uDark; void main(){ float r = length(gl_PointCoord - .5) * 2.; if (r > 1.) discard; float a = 1. - smoothstep(.25, 1., r);
  if (uDark > .5) { float rim = smoothstep(.45, .8, r) * (1. - smoothstep(.8, 1., r)), al = 1. - smoothstep(.7, 1., r); gl_FragColor = vec4(vec3(1., .5, .16) * rim * vC.r, al * .96 * vC.r); }
  else gl_FragColor = vec4(vC.rgb * a, 0.); }`;
  const mkPts = (T, S, n, sky, dark) => { const g = new T.BufferGeometry(), P = new Float32Array(n * 3), Cc = new Float32Array(n * 4); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aC', new T.BufferAttribute(Cc, 4));
    const m = new T.Points(g, K.shader(PTV, PTF, { uSky: K.uv(sky ? 1 : 0), uDark: K.uv(dark ? 1 : 0) }, dark ? K.blend.soft() : K.blend.add())); m.frustumCulled = false; m.renderOrder = dark ? 6 : 5; S.scene.add(m);
    const o = { m, n, k: 0, P, C: Cc, put(x, y, z, r, gg, b, sz) { if (o.k >= n) return; const i = o.k++; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; Cc[i * 4] = r; Cc[i * 4 + 1] = gg; Cc[i * 4 + 2] = b; Cc[i * 4 + 3] = sz; },
      end() { g.setDrawRange(0, o.k); g.attributes.position.needsUpdate = true; g.attributes.aC.needsUpdate = true; m.visible = o.k > 0; o.k = 0; } }; return o; };
  /* Et bånd i verden som vender mot kameraet (strålene). Fargeprofilen på tvers: uMode 0 = ladningen (tynn kjerne, oransje glød), 1 = strålen i fase 2 (fire lag). */
  const RBV = `attribute vec3 aQ; varying vec3 vQ; void main(){ vQ = aQ; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }`;
  const RBF = `varying vec3 vQ; uniform float uMode;
${K.GLSL.COMMON}
void main(){ float x = abs(vQ.x), v = vQ.y, a = vQ.z, st = .7 + .3 * vn(vec2(v * 36. - uTime * 30., 2.)); vec3 c;
  if (uMode < .5) c = (vec3(1., .86, .66) * exp(-x * x * 60.) + vec3(1., .42, .1) * exp(-x * x * 5.) * .45 * st) * (1. - x * x);
  else { float hd = smoothstep(.8, 1., v); c = (vec3(1., .43, .16) * .13 * exp(-x * x * 3.5) + vec3(1., .55, .78) * .26 * exp(-x * x * 14.) + vec3(1., .8, .59) * .7 * exp(-x * x * 90.) * st + vec3(1., .98, .94) * exp(-x * x * 700.)) * (.7 + .3 * v) * (1. + 1.2 * hd); }
  gl_FragColor = vec4(c * a, 0.); }`;
  const mkRibbon = (T, S, n, mode) => { const g = new T.BufferGeometry(), P = new Float32Array((n + 1) * 6), Q = new Float32Array((n + 1) * 6), ix = []; for (let i = 0; i < n; i++) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aQ', new T.BufferAttribute(Q, 3)); g.setIndex(ix);
    const m = new T.Mesh(g, K.shader(RBV, RBF, { uMode: K.uv(mode) }, Object.assign(K.blend.add(), { side: T.DoubleSide }))); m.frustumCulled = false; m.renderOrder = 4; m.visible = false; S.scene.add(m);
    /* pts(i) → [x, y, z], w(i) → halve bredden i meter, al(i) → styrken; cam = kameraets plass nå. */
    return { m, set(cam, pts, w, al) { let pv = pts(0); for (let i = 0; i <= n; i++) { const p = pts(i), nx = pts(min(n, i + 1)), dr = i < n ? [nx[0] - p[0], nx[1] - p[1], nx[2] - p[2]] : [p[0] - pv[0], p[1] - pv[1], p[2] - pv[2]];
        const sd = V3n(crs(dr, [cam.x - p[0], cam.y - p[1], cam.z - p[2]])), ww = w(i, p), a = al(i), k = i * 6;
        P[k] = p[0] - sd[0] * ww; P[k + 1] = p[1] - sd[1] * ww; P[k + 2] = p[2] - sd[2] * ww; P[k + 3] = p[0] + sd[0] * ww; P[k + 4] = p[1] + sd[1] * ww; P[k + 5] = p[2] + sd[2] * ww;
        Q[k] = -1; Q[k + 1] = i / n; Q[k + 2] = a; Q[k + 3] = 1; Q[k + 4] = i / n; Q[k + 5] = a; pv = p; }
      g.attributes.position.needsUpdate = true; g.attributes.aQ.needsUpdate = true; m.visible = true; } }; };
  /* Glasspissene som skyter opp av bakken i fase 2 (svart glass med oransje kant, i 3D så de står riktig foran og bak ham). */
  const GLF = `varying vec3 vW, vN; uniform vec3 uO; void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = pow(1. - abs(dot(N, V)), 2.5), sp = pow(max(0., dot(reflect(-V, N), normalize(vec3(-.25, .55, -.8)))), 22.);
  gl_FragColor = vec4(vec3(.012, .011, .016) + uO * (f * .55 + sp * .9) + vec3(1., .9, .8) * sp * sp * .5, 1.); }`;
  const cosmosMake = (T, S, ph2) => { const V = a => new T.Vector3(a[0], a[1], a[2]), nv = [], nw = []; for (let i = 0; i < NN; i++) { nv.push(new T.Vector4(0, 0, -1, 1e9)); nw.push(new T.Vector4(0, 0, 0, 0)); }
    const u = S.su = { uH: K.uv(V(HD)), uHx: K.uv(V(HDX)), uHy: K.uv(V(HDY)), uOn: K.uv(new T.Vector3(-100, -100, -100)), uCl: K.uv(new T.Vector3(0, 0.1, 0)), uNv: K.uv(nv), uNw: K.uv(nw), uR: K.uv(0), uHa: K.uv(0), uFeed: K.uv(0),
      uRing: K.uv(0), uStar: K.uv(1), uNeb: K.uv(0), uLit: K.uv(1), uAllX: K.uv(new T.Vector2(1e9, 0)), uBh: K.uv(new T.Vector4(0, 0, -1, 0)) };
    const sky = new T.Mesh(new T.SphereGeometry(500, 32, 20), K.shader(SKYV, SKYF, u, { side: T.BackSide, depthWrite: false })); sky.frustumCulled = false; sky.renderOrder = -10; S.scene.add(sky); S.sky = sky;
    const L = ph2 ? STAR6.filter(q => q.big).slice(0, NN).map((q, i) => ({ p: q.p, t: q.ex, app: 0.42 + 0.3 * rnd(i, 601), ti: 2.2, hue: i % 3 ? 0 : 2 })) : NOVA5.map(q => ({ p: q.p, t: q.t, app: q.app, ti: q.ti, hue: NHUE(q.i) }));
    L.forEach((q, i) => { const d = V3n(q.p); nv[i].set(d[0], d[1], d[2], q.t); nw[i].set(q.app, q.ti, rnd(i, 602), q.hue); });
    S.pS = mkPts(T, S, 9000, 1, 0); S.pW = mkPts(T, S, 4200, 0, 0); S.pK = mkPts(T, S, 1700, 0, 1); S.rb = mkRibbon(T, S, ph2 ? 40 : 16, ph2 ? 1 : 0); };
  /* Stjernens farger (to og to: rosa og blå, gull og turkis, fiolett og hvit, rød og cyan), så hver dør i sin egen farge. */
  const NHUE = i => [0, 1, 2, 0, 3, 1, 0, 2, 3, 1, 0, 2][i % 12], HUEC = [[[1, 0.43, 0.78], [0.43, 0.63, 1]], [[1, 0.78, 0.35], [0.3, 0.9, 0.85]], [[0.72, 0.5, 1], [0.75, 0.88, 1]], [[1, 0.42, 0.3], [0.35, 0.85, 1]]];
  const skyDir = (x, y, R) => { const d = V3n([HD[0] + x * HDX[0] + y * HDY[0], HD[1] + x * HDX[1] + y * HDY[1], HD[2] + x * HDX[2] + y * HDY[2]]); return [d[0] * R, d[1] * R, d[2] * R]; };
  const tan2 = p => { const d = V3n(p), z = dot3(d, HD); return [dot3(d, HDX) / z, dot3(d, HDY) / z]; };
  /* Introen: hullet, matingen og stoffet fra hver stjerne i spiral inn (blir oransje på veien). Matingen (feed) løfter skiva for hver stjerne som når fram. */
  const feed5 = t => { let f = 0, rg = 0; for (const q of NOVA5) { if (t < q.a) continue; const s = t - q.a; f += (0.35 + 0.8 * q.app) * Math.exp(-s / 0.55); rg += (0.4 + q.app) * Math.exp(-s * 5); } return [min(1.1, f + 0.25 * seg(t, ARR0, EXP5)), min(1.5, rg)]; };
  const cosmos5 = (S, t) => { const u = S.su, on = t >= COS5, ex = t >= EXP5; S.sky.visible = on; if (!on) { S.pS.end(); S.pW.end(); S.pK.end(); S.rb.m.visible = false; return; }
    const R = holeAng5(t), fd = feed5(t); u.uOn.value.set(U5(4.81), U5(6.61), U5(8.41)); u.uR.value = R; u.uHa.value = seg(t, U5(4.75), U5(6.0));
    u.uFeed.value = ex ? 1.0 + 0.5 * hit(t, EXP5, 1.6) : 0.12 * seg(t, U5(4.75), U5(7.5)) + fd[0]; u.uRing.value = ex ? 0.5 + hit(t, EXP5, 1.2) : fd[1]; u.uNeb.value = 0.7 * seg(t, U5(4.75), U5(10)); u.uLit.value = 1;
    const ps = S.pS; for (const q of NOVA5) { const s = t - q.t; if (s < 0 || s > q.ti + 0.1) continue; const s0 = min(0.6, q.ti * 0.25), n = floor(40 + 150 * q.app), P = tan2(q.p), a0 = Math.atan2(P[1], P[0]), d0 = Math.hypot(P[0], P[1]), hc = HUEC[NHUE(q.i)];
      for (let i = 0; i < n; i++) { const st = s0 + (q.ti - s0) * 0.4 * rnd(i, 220 + q.i), c = hc[rnd(i, 223) > 0.5 ? 0 : 1], big = rnd(i, 224) > 0.72 && q.app > 0.5;
        for (let j = 0; j < 3; j++) { const uu = (s - 0.035 * j - st) / (q.ti - st); if (uu <= 0 || uu >= 1) continue; const e = uu * uu, an = a0 + (rnd(i, 221) - 0.5) * 0.6 + e * 2.4 * (q.i % 2 ? -1 : 1), d = mix(d0 * (0.85 + 0.35 * rnd(i, 222)), R * 1.12, e);
          const pp = skyDir(cos(an) * d, sin(an) * d * mix(1, 0.3, e), 450), k = c01(e * 1.4), br = (0.95 - 0.4 * uu) * [1, 0.5, 0.25][j] * min(1, uu * 12);
          ps.put(pp[0], pp[1], pp[2], mix(c[0], 1, k) * br, mix(c[1], 0.6, k) * br, mix(c[2], 0.24, k) * br, big ? 3.2 : 2.2); } } }
    ps.end(); S.pW.end(); S.pK.end(); };
  /* Etter kameraet (bildet er en ren funksjon av tiden): strålen fra hullet inn i brystet for hver ladning. */
  const late5 = (S, t) => { S.rb.m.visible = false; if (t < COS5 || t >= EXP5 + 0.4 || !S.D.root.visible) return; let a = 0, ap = 0; for (const q of NOVA5) { const s = t - q.a; if (s < 0 || s > 0.45) continue; a += Math.exp(-s * 6) * (0.35 + 0.65 * q.app); ap = max(ap, q.app); }
    a = min(1.3, a + 0.9 * seg(t, EXP5 - 0.5, EXP5) * (1 - seg(t, EXP5, EXP5 + 0.4))); if (a < 0.03) return; const cam = K.camPos(), c = chestW(S), far = [cam.x + HD[0] * 420, cam.y + HD[1] * 420, cam.z + HD[2] * 420];
    S.rb.set(cam, i => { const k = i / 16, e = 1 - (1 - k) ** 3; return [mix(far[0], c[0], e), mix(far[1], c[1], e), mix(far[2], c[2] - 0.25, e)]; }, (i, p) => Math.hypot(cam.x - p[0], cam.y - p[1], cam.z - p[2]) * 0.013 * (0.6 + 0.6 * ap), i => a * (0.35 + 0.65 * (i / 16))); };
  /* Fase 2: alle stjernene eksploderer (himmelen), det rosa støvet går i spiral inn, hullet eksploderer til en sky, og kornene samler seg til strålen. */
  const cosmosP = (S, t) => { const u = S.su; let eaten = 0; for (const q of PINK6) if (t >= q.ar) eaten++; const R = HR0 * (1 + 0.32 * eaten / PINK6.length) * (1 + 0.18 * seg(t, HX6 - 0.18, HX6)), x = t - HX6;
    u.uAllX.value.set(SX6, 0.22); u.uR.value = R; u.uHa.value = 1 - seg(t, HX6 - 0.03, HX6 + 0.04); u.uFeed.value = 0.8 + 0.7 * seg(t, SX6 + 0.4, HX6); u.uRing.value = 0.4 + 1.1 * seg(t, HX6 - 0.5, HX6) + 0.6 * hit(t, SX6, 0.8); u.uNeb.value = 0.7; u.uLit.value = 1;
    u.uCl.value.set(x < 0 ? 0 : 0.85 * seg(x, 0.1, 1.2) * (1 - seg(t, BM6, RUN6 + 0.6)), R * (1.6 + 5 * min(1, x * 1.1) + 0.5 * max(0, x)), x < 0 ? 0 : Math.exp(-x * 3.5));
    const ps = S.pS; if (t >= SX6 && t < HX6) for (const q of PINK6) { if (t < q.st || t >= q.ar) continue; const P = tan2(q.s.p), c = q.c === '#ff7ac8' ? [1, 0.48, 0.78] : [1, 0.76, 0.9];
      for (let j = 0; j < 3; j++) { const tt = t - 0.035 * j; if (tt < q.st) continue; const uu = (tt - q.st) / (q.ar - q.st), e = uu ** 1.5, puff = min(1, (tt - q.st) * 2.5) * (1 - e), sx = P[0] + q.off[0] * 0.02 * puff, sy = P[1] + q.off[1] * 0.015 * puff;
        const an = Math.atan2(sy, sx) + e * q.sp, d = mix(Math.hypot(sx, sy), R * 1.05, e), pp = skyDir(cos(an) * d, sin(an) * d * mix(1, 0.32, e), 450), br = (0.55 + 0.45 * e) * [1, 0.5, 0.25][j];
        ps.put(pp[0], pp[1], pp[2], c[0] * br, c[1] * br, c[2] * br, q.z > 1 ? 3 : 2.2); } }
    ps.end(); };
  const lateP = (S, t) => { const cam = K.camPos(), F = beamFr6(S), pw = S.pW, pk = S.pK, fade = 1 - seg(t, HIT6 + 0.2, HIT6 + 0.75);
    if (t >= HX6 && t < HIT6 + 0.75) for (const q of DUST6) { for (let j = 0; j < (q.col === 'k' ? 1 : 3); j++) { const p = dustPos6(q, t - 0.035 * j, F), br = fade * [0.95, 0.5, 0.25][j];
        if (q.col === 'k') pk.put(p[0], p[1], p[2], fade, 0, 0, q.z + 1.5); else if (q.col === '#ff9a3c') pw.put(p[0], p[1], p[2], br, 0.6 * br, 0.24 * br, q.z); else pw.put(p[0], p[1], p[2], br, 0.48 * br, 0.78 * br, q.z); } }
    pw.end(); pk.end();
    const lh = headL6(t), lt = tailL6(t), on = seg(t, BM6, RUN6) * (1 - seg(t, HIT6 + 0.4, HIT6 + 0.75)); S.rb.m.visible = false;
    { const hp = onBeam6(F, lh, 0, 0), hd = V3n([hp[0] - cam.x, hp[1] - cam.y, hp[2] - cam.z]); S.su.uBh.value.set(hd[0], hd[1], hd[2], t >= BM6 - 0.05 && t < HIT6 + 0.4 ? on * (0.35 + 2.2 * lh * lh) * (1 - seg(t, HIT6, HIT6 + 0.4)) : 0); }
    if (t >= BM6 - 0.05 && t < HIT6 + 0.75 && lh > lt && on > 0.01) S.rb.set(cam, i => onBeam6(F, mix(lt, lh, i / 40), 0, 0), i => 8 * (1 + 0.7 * io(seg(i / 40, 0.86, 1))) * (1 - 0.6 * seg(i / 40, 0.97, 1)) * (0.92 + 0.08 * sin(t * 23)), i => on * min(1, i / 3)); };

  const burst = (S, t0, y) => { const dir = i => { const a = rnd(i, 701) * TAU, e = -0.25 + 1.3 * rnd(i, 702), c = cos(e); return [cos(a) * c, sin(e), sin(a) * c]; };
    S.scene.add(K.pts(170, i => { const d = dir(i), v = 4 + 13 * rnd(i, 703) ** 1.5; return { p: [d[0] * 0.3, y + d[1] * 0.3, d[2] * 0.3], v: [d[0] * v, d[1] * v + 2, d[2] * v], b: 0.1 * rnd(i, 704), l: 0.8 + 1.8 * rnd(i, 705), z: 0.09 + 0.2 * rnd(i, 706) ** 2 }; },
      { t0, add: 1, g: 5, drag: 1.3, px: 70, c: ['#fff2d8', '#ff9a3c', '#b02a08'], fade: 0.7 }));
    S.scene.add(K.pts(16, i => { const d = dir(i + 400), v = 1.5 + 4 * rnd(i, 707); return { p: [d[0] * 0.5, y + d[1] * 0.4, d[2] * 0.5], v: [d[0] * v, abs(d[1]) * v * 0.6 + 0.6, d[2] * v], b: 0.05 + 0.25 * rnd(i, 708), l: 1.6 + 1.6 * rnd(i, 709), z: 0.5 + 0.7 * rnd(i, 710) }; },
      { t0, g: -0.6, drag: 1.5, px: 220, sz0: 0.5, sz1: 2.2, c: ['#4a2210', '#201008', '#0a0504'], fade: 0.5, a: 0.4 })); };
  const late = fn => L => L.map(([t0, f]) => [t0, (S, u, a, t) => { f(S, u, a, t); fn(S, t); }]);
  const backBlk = (S, t) => { const g = C.g; g.fillStyle = '#000'; g.fillRect(0, 0, 512, 384); return { hz: 192 }; };
  /* Gløden i brystet på hver ladning (2D oppå figuren: figuren ligger over omgivelsene i sammensettingen). */
  const chestGlow5 = (g, S, t) => { const G = glow5(t); if (G <= 0.02 || t >= EXP5 + 1.5 || !S.D.root.visible) return; const c = K.proj(...chestW(S)), r = 16 + 36 * min(1.5, G), gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, r); g.save(); g.globalCompositeOperation = 'lighter';
    gr.addColorStop(0, `rgba(255,225,180,${min(0.9, 0.55 * G)})`); gr.addColorStop(0.3, `rgba(255,140,50,${min(0.6, 0.34 * G)})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(c.x - r, c.y - r, 2 * r, 2 * r); g.restore(); };
  const UP6 = [EXP5 - 0.03, EXP5 + 0.5], COIL6 = [LOOK5[1], EXP5 - 0.03];
  const CRK6 = Array.from({ length: 12 }, (_, i) => { const a = (i / 12 + 0.08 * rnd(i, 401)) * TAU, L = 0.35 + 0.75 * rnd(i, 402), pts = [[0, 0]];
    let x = 0, z = 0, d = a; for (let j = 1; j <= 4; j++) { d += (rnd(i * 7 + j, 403) - 0.5) * 0.9; x += cos(d) * L / 4; z += sin(d) * L / 4 * 0.8; pts.push([x, z]); } return pts; });
  const cracks6 = (g, S, t) => { if (!S.hand) return; const G = S.G || 0, ex = t >= EXP5, k = ex ? 0.9 * (1 - seg(t, EXP5 + 0.3, EXP5 + 2.0)) : min(0.55, 0.32 * G); if (k <= 0.01) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const c of CRK6) { const P = c.map(([x, z]) => K.proj(S.hand[0] + x, 0.02, S.hand[2] + z)); if (P.some(q => q.z > 1)) continue;
      for (const [w, col] of [[3.2, `rgba(255,110,30,${0.35 * k})`], [1.1, `rgba(255,205,150,${0.9 * k})`]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); P.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); } }
    g.restore(); };
  G3D.def('c3:dk150', {
    len: LEN5, hold: 1, R: EXP5 + 0.1, at: 0,
    /* Villain's Ascent på filmens klokke (bui.js, legendIntro): låta fra knuset, takten 0:07,22–0:09,62 to ganger ekstra (pre: [filmens tid, hvor i låta, slutt]),
       og låta selv kaldt inn 22,02 s ut, 9,62 s inn i seg selv (cold). Lydsengen (bed) følger samme klokke. */
    /* Rettet etter kontrollen 26.11: den andre gjentakelsen av takten ER låta selv (kaldt inn 19,62 s ut, 7,22 s inn: samme lyd som før, én skjøt mindre og uten hullet
       ved 22,02), og skjøtene krysstones med lik styrke over 20 ms (xf). j2d: der filmen starter når kampen foran var i 2D (darkRise). */
    mus: { cold: [S5 + 12.02, 7.22], pre: [[S5, 0, S5 + 9.62], [S5 + 9.62, 7.22, S5 + 12.02]], xf: 0.02, j2d: WIN, bed: 'sfx/natur/smewtwo_intro.mp3' }, fig: 2, models: ['mewtwo', 'mewtwo_dark'], edge: null, env: { rim: '#9ad8ff', glow: '#3a8fd8', fog: '#030710', glowH: 6 },
    make(K, T) { const S = { scene: new T.Scene(), figs: [] }; S.T = T; cave(T, S); makeFigs(T, S); cosmosMake(T, S, 0); burst(S, EXP5, 1.5);
      const tw = new T.Mesh(new T.CylinderGeometry(42, 46, 40, 48, 4, true, PI + PI / 3, PI * 4 / 3), S.cv.wall.material); tw.position.y = 14; tw.visible = false; S.scene.add(tw); S.tw = tw;
      const aI = S.cv.cr.geometry.attributes.aI; CRY.forEach((q, i) => { aI.array[i * 4 + 1] = S5 + 1.1; aI.array[i * 4 + 2] = EXP5 + 0.07 * q.ring + q.s * 0.06; }); aI.needsUpdate = true;
      return S; },
    act(S, t, o) { const U = K.U(), cosm = t >= COS5, ex = t >= EXP5, G = cosm && !ex ? glow5(t) : 0, cu = (t >= T5.CU || J2D()) && t < T5.WIDE;
      const BLACK = { key: '#000000', sh: '#000000', fog: '#000000', fogK: 0.9, rim: 0, glow: 0 };
      if (!cosm) lightCave(U, cu ? { key: '#9fb4cc', sh: '#1c2a40', rim: 0.5, glow: 0.15 } : {});
      else if (!ex) lightCave(U, Object.assign({}, BLACK, { rim: 2.0 * min(1, G), rimc: '#ff8a3a' }));
      else lightCave(U, { key: '#ffb070', sh: '#2a1208', fog: '#0a0402', fogK: 0.6, rim: 1.0, rimc: '#ffd0a0', glowc: '#ff7a2a', glow: 0.45 });
      caveSet(S, t, !cosm ? { mode: 1, dark: 0, up: 1, upc: '#3a9ad8', gl: 1, col: cu ? 0.02 : 0.12, emb: 0 }
        : !ex ? { mode: 1, dark: 1, up: 0, gl: 0, col: 0 } : { mode: 1, dark: 0, up: 1.3, upc: '#ff7a2a', gl: 0, col: 0, emb: 1, or: 1 });
      const c = S.cv; c.wall.visible = c.roof.visible = c.st.visible = !cosm; S.tw.visible = cosm;
      fallM(S, t, FALL); S.M.add(EYELID(io(seg(t, T5.EYC[0], T5.EYC[1]))), 1); S.M.root.visible = !(cosm && !ex);
      /* Shadow Mewtwo: kneler (k) til han reiser seg i eksplosjonen; hodet ned, så opp mot deg; krummer seg sammen før smellet. */
      const D = S.D, P = P0(t); D.root.visible = ex || (cosm && G > 0.04);
      const k = 1 - eo(seg(t, UP6[0], UP6[1])), lu = io(seg(t, LOOK5[0], LOOK5[1])), coil = io(seg(t, COIL6[0], COIL6[1])) * (1 - seg(t, UP6[0], UP6[0] + 0.12));
      P.bow = 0.6 * (1 - lu) * k; P.roar = t < EXP5 + 0.1 ? 0 : kf(t, [[EXP5 + 0.1, 0], [EXP5 + 0.4, 1, eo], [NAME5 + 0.6, 1], [NAME5 + 1.6, 0.25, io]]);
      poseKR(D, P, k, 0); D.add({ Neck: [-0.4 * lu * k, 0, 0], Head: [-0.7 * lu * k, 0, 0], Spine1: [0.12 * coil, 0, 0], L_ForeArm: [0, 0, -0.25 * coil] }, 1);
      setMouth(D, t >= EXP5 + 0.1 ? 'attack_strong_' : 'normal_');
      const yk = k > 0 ? kneelY(D) : 0, ov = kf(t, [[UP6[0], 0], [UP6[1], 1, eo], [UP6[1] + 0.45, 0.82, io]]) || 0;
      D.root.position.set(0, mix(yk, D.fy + 0.35 + 0.04 * sin(t * 1.5) + 0.35 * (ov > 0.82 ? ov - 0.82 : 0) / 0.18, 1 - k), 0); D.root.rotation.set(0, 0, 0);
      if (!ex) { dMats(S, { body: 0.16 * min(1, G), bodyC: '#ff7a2a', stone: min(1, G), eye: 1 }); D.eye(0, 0, 0); }
      else { dMats(S, { body: 0.25 * (1 - seg(t, EXP5, EXP5 + 2)), bodyC: '#ff9a3c', stone: 0.85, eye: 1 }); D.eye(0, 0, 0); }
      S.rw = P.roar; S.G = G; S.eyes = null;
      if (k > 0.5) { D.apply(); const h = D.at('R_Middle3'); S.hand = [h.x, 0, h.z + 0.05]; }
      cosmos5(S, t);
    },
    shots: late(late5)([
      /* 1 Kampkameraet; fra kampen i 2D er det nærbildet fra kortet (WIN), og skyvet inn går over hele 2,35–5,6. 2 Nærbildet: øynene lukkes. */
      [0, (S, u, a, t) => J2D() ? CU5(S, c01((t - WIN) / (T5.WIDE - WIN))) : BCAM(S, u, a, t)],
      [T5.CU, (S, u, a, t) => CU5(S, J2D() ? c01((t - WIN) / (T5.WIDE - WIN)) : u)],
      [T5.WIDE, (S, u, a, t) => { const k = io(c01((t - T5.WIDE) / (S5 - T5.WIDE))); K.cam(mix(-8.5, -7.2, k), mix(5.8, 4.9, k), mix(13.5, 11.2, k), -0.9, 0.3, 0, 40);
        S.post.sh = X.hk(S, t, S5, 0.9, 2.2); S.post.fl = 0.5 * hit(t, S5, 0.1); S.post.flc = '#ffb070'; }],
      /* 4 Rommet bak ham: svart, teksten, stjernene, hullet; han kneler og synes bare i ladningene (målet litt lavere enn i skisse 5: han er lavere). */
      [COS5, (S, u, a, t) => { const k = io(c01((t - COS5) / (PUSH5 - COS5))); K.cam(mix(0.9, 0.6, k), mix(0.8, 0.9, k), mix(9.0, 8.0, k), 0, 2.05, 0, 42);
        S.post.sh = NOVA5.reduce((s, q) => s + X.hk(S, t, q.t, 0.5, 0.45 * q.app * (1 - q.di), 'e'), 0); }],
      /* 5 Skyv inn til ansiktet; han løfter hodet og ser på deg. */
      [PUSH5, (S, u, a, t) => { const k = io(c01((t - PUSH5) / (EXP5 - PUSH5))), h = S.D.at('Head');
        K.cam(mix(0.6, 0.14, k), mix(0.9, h.y + 0.05, k), mix(8.0, 2.5, k), 0, mix(2.05, h.y + 0.12, k), 0, mix(42, 34, k)); S.post.sh = NOVA5.reduce((s, q) => s + X.hk(S, t, q.t, 0.5, 0.45 * q.app * (1 - q.di), 'e'), 0) + X.rk(S, 0.6 * seg(t, EXP5 - 0.5, EXP5), 2.2); }],
      /* 6 Full styrke: han reiser seg i eksplosjonen (lavere og nærmere enn i skisse 5, så han er større enn smellet og vi ser ham reise seg; kameraet følger ham opp);
         krystallene tennes oransje; liket ved føttene; hullet bak; brølet og navnet. */
      [EXP5, (S, u, a, t) => { const r = eo(seg(t, UP6[0], UP6[1] + 0.3)); K.cam(mix(0.6, 0.4, u), mix(0.55, 0.85, r), mix(6.0, 5.4, io(u)), -0.1, mix(1.25, 1.95, r), 0, 50);
        S.post.sh = X.hk(S, t, EXP5, 1.2, 2.8, 'e'); S.post.fl = 0.85 * hit(t, EXP5, 0.1); S.post.flc = '#ffc890'; }],
    ]),
  });
  X.reg('c3:dk150', { spid: 150, skin: SKIN, back: backBlk, cues: [[EXP5 + 0.1, 'cry']], roar: () => EXP5 + 0.1,
    look(S, t, P) { P.bloom = t >= COS5 ? 0.4 : 0.32; P.bloomT = 0.66; P.vig = 0.45; P.grain = 0.035; P.ink = t >= S5 && t < EXP5 ? 0 : 1; },
    over: label5, fx(S, t, P) { const g = C.g; hud(g, t); textBox(g, t); aura(g, S, t);
      if (t >= WIN && t < S5 + SH5) card(g, 256, cardY(t), t > DIE ? 0.25 + 0.75 * hit(t, DIE, 1.2) : 0, t);
      shards5(g, t);
      if (t >= COS5 && t < EXP5 + 2.2) cracks6(g, S, t);
      chestGlow5(g, S, t);
      boom(g, S, t - EXP5 + EXP);
      glitch(g, 0.8 * hit(t, DIE, 0.5) + 1.2 * hit(t, S5, 0.25) + 0.6 * hit(t, EXP5, 0.2), t);
      words5(g, t); } });
  const W0 = 20.4, WG = x => x - W0, HB = WG(20.53), SB = WG(23.97), FAR = WG(27.50), QU = [WG(28.4), WG(33.9)], BR = WG(34.26), EYE2 = WG(32.4), LENP = BR + 3.2;
  const HP0 = sph(HAZ, BEL, 300), HR0 = 0.16;
  const SPK = Array.from({ length: 16 }, (_, i) => { const a = rnd(i, 330) * TAU, r = 2.2 + 7 * rnd(i, 331); return { x: cos(a) * r, z: sin(a) * r * 0.7 + 1.5, h: 1.2 + 2.8 * rnd(i, 332), w: 0.25 + 0.3 * rnd(i, 333), d: 0.12 * rnd(i, 334), lean: (rnd(i, 335) - 0.5) * 0.5 }; });
  /* Skårene som blir hengende og sveve rundt banen resten av kampen (B): skjermen knuses på utbruddet, og bitene stopper og svever i kanten av bildet. */
  const hover = (g, t) => { const s = t - BR - 0.05; if (s < 0) return; const cv = g.canvas, off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height; off.getContext('2d').drawImage(cv, 0, 0);
    if (s < 0.9) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.6 * (1 - s / 0.9); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); g.restore(); }
    const glass = gg => gg.drawImage(off, 0, 0, 512, 384);
    for (const p of SH) { if (p.j < 2) continue; const L = Math.hypot(p.c[0], p.c[1]) || 1, k = 1 - Math.exp(-s * 3), dx = p.c[0] / L * 70 * k + 4 * sin(t * 0.8 + p.w), dy = p.c[1] / L * 50 * k + 5 * sin(t * 0.6 + p.v);
      drawCell(g, p, dx, dy, p.w * 0.06 * k + 0.03 * sin(t * 0.7 + p.v), 1 + 0.06 * k, glass, 0.55 + 0.45 * (1 - k), 'rgba(255,150,60,.7)'); } };
  const SX6 = WG(20.53), HX6 = WG(23.97), BM6 = WG(27.50), RUN6 = WG(28.4), EYE6 = WG(32.4), HIT6 = WG(34.26), LEN6 = HIT6 + 3.3;
  const C6 = { HOLE: HX6 - 0.1, FAR: BM6 - 0.05, SIDE: WG(29.35), BACK: WG(30.95), FACE: WG(31.9) };
  const O6 = sph(HAZ, BEL, 300);
  /* Stjernene: lyser til de eksploderer, alle innenfor 0,22 s fra 0:20,53 («alle stjernene eksploderer sammen»). Hver tiende er stor og får et skall. */
  const STAR6 = (() => { const L = []; for (let i = 0; i < 330; i++) { const az = PI + (rnd(i, 501) - 0.5) * 3.0, el = -0.06 + rnd(i, 502) * 0.85;
      if (Math.hypot(az - HAZ, el - BEL) < 0.3) continue; L.push({ i, p: sph(az, el, 300), az, el, b: 0.25 + 0.75 * rnd(i, 503) ** 2, tw: rnd(i, 504) * TAU, ex: SX6 + 0.22 * rnd(i, 505) ** 1.3, big: rnd(i, 506) > 0.9 }); } return L; })();
  /* Det rosa støvet: åtte korn per stjerne, ut i en sky og så i spiral inn i hullet; alt er inne før hullet eksploderer. */
  const PINK6 = []; STAR6.forEach(s => { for (let j = 0; j < 7; j++) { const k = s.i * 7 + j, st = s.ex + 0.12 + 0.35 * rnd(k, 511); PINK6.push({ s, st, ar: min(HX6 - 0.12, st + 1.5 + 1.7 * rnd(k, 512)),
    off: [(rnd(k, 513) - 0.5) * 2, (rnd(k, 514) - 0.5) * 2], sp: (1.4 + 1.4 * rnd(k, 515)) * (k % 2 ? 1 : -1), c: rnd(k, 516) > 0.3 ? '#ff7ac8' : '#ffc2e4', z: rnd(k, 517) > 0.8 ? 2 : 1 }); } });
  /* Støvet i hullet når det eksploderer, i 3D rundt O: svart (40 %), oransje (40 %) og rosa fra stjernene det spiste (20 %). Det samler seg til strålen og rir på den. */
  const DUST6 = Array.from({ length: 1300 }, (_, i) => { let x = rnd(i, 521) * 2 - 1, y = rnd(i, 522) * 2 - 1, z = rnd(i, 523) * 2 - 1; const l = Math.hypot(x, y, z) || 1, c = rnd(i, 524);
    return { i, dir: [x / l, y / l * 0.7, z / l], D: 25 + 100 * rnd(i, 525) ** 0.7, col: c < 0.4 ? 'k' : c < 0.8 ? '#ff9a3c' : '#ff7ac8', lr: rnd(i, 526), ph: rnd(i, 527) * TAU, rr: 0.35 + 0.9 * rnd(i, 528),
      g: 0.35 * rnd(i, 529), z: rnd(i, 530) > 0.7 ? 4 : rnd(i, 530) > 0.3 ? 3 : 2, w: (rnd(i, 531) > 0.5 ? 1 : -1) * (5 + 5 * rnd(i, 532)) }; });
  /* Strålen: hodet og halen som andeler av veien fra O til målet i ryggen hans (λ). Hodet formes langt borte (0:27,50), raser fra 0:28,4 og treffer på 0:34,26; halen slippes fra 0:31,4
     og er inne 0,6 s etter treffet. */
  const headL6 = t => t < BM6 ? 0 : t < RUN6 ? 0.1 * io(seg(t, BM6, RUN6)) : 0.1 + 0.9 * c01((t - RUN6) / (HIT6 - RUN6)) ** 1.8;
  const tailL6 = t => c01((t - WG(31.4)) / (HIT6 + 0.6 - WG(31.4))) ** 2.2;
  const beamFr6 = S => { const T = chestW(S), d = [T[0] - O6[0], T[1] - O6[1], T[2] - O6[2]], L = Math.hypot(...d), u = d.map(v => v / L), a = [-u[2], 0, u[0]], la = Math.hypot(...a), u1 = a.map(v => v / la),
      u2 = [u1[1] * u[2] - u1[2] * u[1], u1[2] * u[0] - u1[0] * u[2], u1[0] * u[1] - u1[1] * u[0]]; return { T, d, u, u1, u2 }; };
  const onBeam6 = (F, l, ph, r) => [O6[0] + F.d[0] * l + (F.u1[0] * cos(ph) + F.u2[0] * sin(ph)) * r, O6[1] + F.d[1] * l + (F.u1[1] * cos(ph) + F.u2[1] * sin(ph)) * r, O6[2] + F.d[2] * l + (F.u1[2] * cos(ph) + F.u2[2] * sin(ph)) * r];
  /* Hvor et korn fra hullet er: skya som brer seg (fra 0:23,97), samlingen til strålen (0:27,50) og strålen (fra 0:28,4: kornene flyter mot hodet i en spiral). */
  const dustPos6 = (q, t, F) => { const u = c01((t - HX6) / 3.2), cl = 1 - (1 - u) ** 3, sw = 0.12 * max(0, t - HX6 - 1.5) * (q.w > 0 ? 1 : -1), cs = cos(sw), sn = sin(sw);
    const dx = q.dir[0] * cs - q.dir[2] * sn, dz = q.dir[0] * sn + q.dir[2] * cs, cp = [O6[0] + dx * q.D * cl, O6[1] + q.dir[1] * q.D * cl, O6[2] + dz * q.D * cl];
    if (t < BM6 + q.g) return cp; const lt = tailL6(t), lh = headL6(t), lr = (q.lr + 0.24 * max(0, t - RUN6)) % 1, l = mix(lt, max(lt + 0.002, lh), lr), wid = 1 + 1.8 * io(seg(lr, 0.82, 1));
    const bp = onBeam6(F, l, q.ph + q.w * t * 0.3 + 25 * l, q.rr * 1.5 * wid), k = io(c01((t - BM6 - q.g) / 0.9)); return [mix(cp[0], bp[0], k), mix(cp[1], bp[1], k), mix(cp[2], bp[2], k)]; };
  /* Bakken brekker under ham: sprekker som gløder sterkere jo nærmere strålen er, og flak som løsner og svever (bilde 2); på treffet slynges de ut. */
  const CRK6B = Array.from({ length: 16 }, (_, i) => { const a = (i / 16 + 0.06 * rnd(i, 541)) * TAU, L = 0.9 + 1.8 * rnd(i, 542), pts = [[0, 0]]; let x = 0, z = 0, d = a;
    for (let j = 1; j <= 5; j++) { d += (rnd(i * 9 + j, 543) - 0.5) * 0.8; x += cos(d) * L / 5; z += sin(d) * L / 5; pts.push([x, z]); } return pts; });
  const FLK6 = Array.from({ length: 20 }, (_, i) => { const a = rnd(i, 551) * TAU, r = 0.6 + 2.2 * rnd(i, 552); return { x: cos(a) * r, z: sin(a) * r + 0.2, s: 0.18 + 0.32 * rnd(i, 553), h: 0.3 + 1.6 * rnd(i, 554),
    t0: RUN6 + 0.5 + 3.4 * rnd(i, 555), sp: (rnd(i, 556) - 0.5) * 0.8, a, v: 1.5 + 2.5 * rnd(i, 557) }; });   /* ikke helt fram til kameraet: et flak tett på linsa ble en gul klump */
  /* Glasspissene som i fase 2-skissen, men ikke de som står nærmere kameraet enn 4 m (de dekket hele bildet fra den nye vinkelen). */
  const spikes6 = (g, S, t) => { const s = t - HIT6; if (s < 0 || !S.camP) return; for (const q of SPK) { if (Math.hypot(q.x - S.camP[0], q.z - S.camP[2]) < 4) continue; const u = io(c01((s - q.d) / 0.18)); if (u <= 0) continue;
      const b0 = K.proj(q.x - q.w, 0, q.z), b1 = K.proj(q.x + q.w, 0, q.z), tp = K.proj(q.x + q.lean * q.h, q.h * u, q.z); if (b0.z > 1 || tp.z > 1) continue;
      g.beginPath(); g.moveTo(b0.x, b0.y); g.lineTo(tp.x, tp.y); g.lineTo(b1.x, b1.y); g.closePath(); g.fillStyle = 'rgba(8,6,8,.95)'; g.fill(); g.strokeStyle = 'rgba(255,150,60,.8)'; g.lineWidth = 1.2; g.stroke(); } };
  const cracksP6 = (g, S, t) => { const k = t < HIT6 ? 0.55 * seg(t, RUN6, HIT6) ** 1.3 + 0.12 * seg(t, RUN6, RUN6 + 0.4) : 1.2 * (1 - seg(t, HIT6 + 0.2, HIT6 + 2.4)); if (k <= 0.01) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const cr of CRK6B) { const P = cr.map(([x, z]) => K.proj(x, 0.02, z + 0.2)); if (P.some(q => q.z > 1)) continue;
      for (const [w, col] of [[4, `rgba(255,100,30,${0.3 * k})`], [1.3, `rgba(255,210,150,${0.85 * k})`]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); P.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); } }
    g.restore(); };

  G3D.def('c3:dk150p', {
    len: LEN6, hold: 0, R: HIT6 + 0.1, at: 0, mus: { bed: 'sfx/natur/smewtwo_fase2.mp3' }, fig: 2, models: ['mewtwo', 'mewtwo_dark'], edge: null, env: { rim: '#ffd0a0', glow: '#ff7a2a', fog: '#0a0402', glowH: 6 },
    make(K, T) { const S = { scene: new T.Scene(), figs: [] }; S.T = T; cave(T, S); makeFigs(T, S); cosmosMake(T, S, 1); burst(S, HIT6, 3.0);
      const tw = new T.Mesh(new T.CylinderGeometry(42, 46, 40, 48, 4, true, PI + PI / 3, PI * 4 / 3), S.cv.wall.material); tw.position.y = 14; S.scene.add(tw); S.tw = tw;
      const aI = S.cv.cr.geometry.attributes.aI; CRY.forEach((q, i) => { aI.array[i * 4 + 1] = -10; aI.array[i * 4 + 2] = -10 + q.s; }); aI.needsUpdate = true;
      /* Flakene av bakken (samme stein som øya). */
      const fk = new T.InstancedMesh(new T.CylinderGeometry(1, 0.8, 0.22, 6), K.shader(RVI, RF, rockU()), FLK6.length); fk.frustumCulled = false; S.scene.add(fk); S.fk = fk; S.cv.rocks.push(fk);
      S.o3 = new T.Object3D(); return S; },
    act(S, t, o) { const U = K.U(), qk = seg(t, QU[0], QU[0] + 1.5) * (1 - seg(t, HIT6, HIT6 + 0.4)), br = t >= HIT6;
      { const bk = io(seg(t, RUN6 + 0.6, EYE6 - 0.3)) * (1 - seg(t, HIT6, HIT6 + 0.25)), lc = lerpHex('#ffb070', '#4a2410', bk), ls = lerpHex('#2a1208', '#0c0503', bk), h2 = c => '#' + c.map(v => (v < 16 ? '0' : '') + v.toString(16)).join('');   /* lyset flytter seg bak ham når strålen nærmer seg: han blir en mørk skikkelse med lys kant, og øynene tennes i mørket */
        lightCave(U, { key: h2(lc), sh: h2(ls), fog: '#0a0402', fogK: 0.6, rim: 1.0 + 1.5 * qk + 1.6 * seg(t, EYE6 - 1.5, HIT6), rimc: '#ffd0a0', glowc: '#ff7a2a', glow: 0.45 * (1 - 0.6 * qk) }); }
      caveSet(S, t, { mode: 1, dark: 0.55 * qk, up: 1.3 * (1 - 0.5 * qk) + 1.5 * hit(t, HIT6, 1.2), upc: '#ff7a2a', gl: 0, col: 0, emb: 1, or: 1 });
      const c = S.cv; c.wall.visible = c.roof.visible = c.st.visible = false; S.tw.visible = true; S.fk.material.uniforms.uUp.value = 0.45;   /* flakene holder seg mørke (de ble gule flater i lyset fra treffet) */
      fallM(S, 99, FALL); S.M.add(EYELID(1), 1); S.M.root.visible = true;
      /* Han står (som i kampen) og stiger sakte fra 0:28,4 med armene ut; strålen treffer ham i ryggen og kaster ham litt fram og opp; brølet. */
      const D = S.D, P = P0(t); D.root.visible = true; const r = io(seg(t, RUN6, RUN6 + 2.6));
      P.bow = 0.2 * seg(t, SX6, SX6 + 0.8) * (1 - r); P.roar = t < HIT6 + 0.1 ? 0 : kf(t, [[HIT6 + 0.1, 0], [HIT6 + 0.4, 1, eo], [HIT6 + 2.4, 1], [HIT6 + 3.1, 0.3, io]]);
      poseKR(D, P, 0, r); setMouth(D, t >= HIT6 + 0.1 ? 'attack_strong_' : 'normal_');
      const jolt = kf(t, [[HIT6, 0], [HIT6 + 0.12, 1, eo], [HIT6 + 0.9, 0.55, io]]) || 0;
      D.root.position.set(0, D.fy + 0.35 + 0.04 * sin(t * 1.5) + 1.1 * io(seg(t, RUN6, HIT6)) + 0.3 * jolt, 0.25 * jolt); D.root.rotation.set(-0.12 * jolt, 0, 0);
      const ey = seg(t, EYE6, EYE6 + 0.3); dMats(S, { body: 0.12 + 0.4 * hit(t, HIT6, 2.0), bodyC: '#ff9a3c', stone: 0.85 + 0.15 * hit(t, HIT6, 2), eye: ey > 0 ? 0 : 1 }); D.eye(0, 0, 1.8 * ey);
      S.rw = P.roar; S.eyes = ey > 0 ? eyesW(S, D) : null; S.eyK = ey * (1 + 0.4 * hit(t, HIT6, 1.5));
      /* Flakene: løsner fra bakken etter tur, stiger sakte og vrir seg; på treffet slynges de utover og opp. */
      const ob = S.o3; FLK6.forEach((q, i) => { const u = io(seg(t, q.t0, q.t0 + 3.2)), b = max(0, t - HIT6), up = q.h * u + 0.08 * sin(t * 1.3 + i), out = b > 0 ? q.v * (1 - Math.exp(-b * 1.6)) : 0;
        ob.position.set(q.x + cos(q.a) * out, -0.14 + up + 0.4 * out, q.z + sin(q.a) * out); ob.rotation.set(q.sp * u + 0.3 * b, q.a + 0.25 * t * q.sp, 0.5 * q.sp * u + 0.4 * b);
        ob.scale.set(q.s, 1, q.s * 0.8); ob.updateMatrix(); S.fk.setMatrixAt(i, ob.matrix); }); S.fk.instanceMatrix.needsUpdate = true;
      cosmosP(S, t);
    },
    shots: late(lateP)([
      /* 1 Kampens vinkel: han står i den revne hula med hullet bak; «Something is happening…»; 0:20,53 eksploderer alle stjernene; det rosa støvet går i spiral inn i hullet. */
      [0, (S, u, a, t) => { K.cam(mix(-2.6, -3.4, u), mix(1.4, 1.1, u), mix(10.5, 11.8, u), mix(-0.6, -1.2, u), mix(2.6, 3.6, u), -4, mix(46, 54, u)); S.post.sh = X.hk(S, t, SX6, 0.9, 1.6); S.post.fl = 0.45 * hit(t, SX6, 0.12); S.post.flc = '#ffe0f0'; }],
      /* 2 Vidt og lavt mot hullet: det eksploderer på 0:23,97, svart og oransje støv. */
      [C6.HOLE, (S, u, a, t) => { K.cam(mix(4.5, 3.8, u), 0.6, mix(13, 12.2, u), -1.5, 6, -10, 58); S.post.sh = X.hk(S, t, HX6, 1.0, 2.2); S.post.fl = 0.4 * hit(t, HX6, 0.1); S.post.flc = '#ffd0a0'; }],
      /* 3 Langt ute, ved siden av veien: skya samler seg til en stråle (0:27,50) som peker mot ham, og så raser den av gårde (0:28,4). */
      [C6.FAR, (S, u, a, t) => { const F = beamFr6(S), A = onBeam6(F, 0.17, 0, 0), B = onBeam6(F, 0.11 + 0.08 * io(u), 0, 0); K.cam(A[0] - F.u1[0] * 150 + 18 * u, A[1] + 26, A[2] - F.u1[2] * 150, B[0], B[1], B[2], 50); }],
      /* 4 Fra siden, midt på veien: strålen raser mot og forbi oss. */
      [C6.SIDE, (S, u, a, t) => { const F = beamFr6(S), A = onBeam6(F, 0.34, 0, 0), B = onBeam6(F, 0.12, 0, 0); S.post.spd = 0.55 * seg(u, 0.25, 0.8); S.post.spx = 128; S.post.spy = 96; S.post.spc = '#ffb070'; K.cam(A[0] - F.u1[0] * 16 + F.u2[0] * 5, A[1] - F.u1[1] * 16 + 5, A[2] - F.u1[2] * 16, B[0], B[1], B[2], 58); S.post.sh = X.rk(S, 0.8 * seg(t, C6.SIDE + 0.9, C6.SIDE + 1.4), 2.2); }],
      /* 5 Forfra og lavt: han stiger med armene ut, bakken brekker i flak; bak ham kommer strålen. */
      [C6.BACK, (S, u, a, t) => { K.cam(mix(5.4, 4.8, u), 0.9, mix(9.8, 8.9, u), -3.2, 4.6, -8, 56); S.post.sh = X.rk(S, 0.3 * u, 2.0); }],
      /* 6 Nært forfra: øynene tennes for første gang (0:32,4); lyset bak ham vokser. */
      [C6.FACE, (S, u, a, t) => { const h = S.D.at('Head'), F = beamFr6(S), d = mix(3.9, 3.1, io(u)); K.cam(F.T[0] + F.u[0] * d, F.T[1] + F.u[1] * d + 0.35, F.T[2] + F.u[2] * d, h.x, h.y - 0.05, h.z, 40);
        S.post.sh = X.rk(S, 0.4 * u + 1.0 * seg(t, HIT6 - 0.5, HIT6), 2.2); }],
      /* 7 0:34,26: strålen treffer ham i ryggen; blinket fra brystet; brølet; glasspisser; skjermen knuses og skårene blir hengende. */
      [HIT6 - 0.02, (S, u, a, t) => { K.cam(mix(5.0, 4.4, u), mix(1.3, 1.5, u), mix(7.6, 6.8, io(u)), -0.6, 2.7, -1, 50); S.camP = [mix(5.0, 4.4, u), 1.4, mix(7.6, 6.8, io(u))]; S.post.sh = X.hk(S, t, HIT6, 1.4, 3.0, 'e'); S.post.fl = 0.8 * hit(t, HIT6, 0.1); S.post.flc = '#ffd8b0'; }],
    ]),
  });
  X.reg('c3:dk150p', { spid: 150, skin: SKIN, back: backBlk, cues: [[HIT6 + 0.1, 'cry']], roar: () => HIT6 + 0.1, swirl: 0,
    look(S, t, P) { P.bloom = 0.42; P.bloomT = 0.62; P.vig = 0.45; P.grain = 0.035; P.ink = 1; },
    fx(S, t, P) { const g = C.g;
      if (t < 1.6) { const a = 1 - seg(t, 1.2, 1.6); g.save(); g.globalAlpha = a; rr(g, 10, 306, 492, 66, 8); g.fillStyle = 'rgba(14,14,20,.9)'; g.fill(); font(g, 17, '600 '); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
        g.fillText('Something is happening…'.slice(0, max(0, floor(t * 34))), 28, 339); g.restore(); }
      if (t >= RUN6 && t < HIT6 + 2.6) cracksP6(g, S, t);
      if (S.eyes) eyes2(g, S.eyes, S.eyK, t);
      if (t >= HIT6 - 0.15 && t < HIT6 + 0.5) { const c = K.proj(...chestW(S)), k = seg(t, HIT6 - 0.15, HIT6) * (1 - seg(t, HIT6 + 0.1, HIT6 + 0.5)); g.save(); g.globalCompositeOperation = 'lighter'; const r = 40 + 200 * seg(t, HIT6 - 0.15, HIT6 + 0.3), gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
        gr.addColorStop(0, `rgba(255,240,220,${k})`); gr.addColorStop(0.3, `rgba(255,150,60,${0.7 * k})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(c.x - r, c.y - r, 2 * r, 2 * r); g.restore(); }
      spikes6(g, S, t); boom(g, S, t - HIT6 + EXP);
      glitch(g, 0.6 * hit(t, SX6, 0.2) + 0.6 * hit(t, HX6, 0.2) + 1.0 * hit(t, HIT6, 0.25), t);
      hover(g, t - HIT6 + BR); } });
})();