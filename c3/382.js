'use strict';
/* Fokusdex – Kyogre (382) i 3D: det åpne havet over Seafloor Cavern i uvær. Bare hav: tunge dønninger, regn, lyn, sjøstakker i disen og en kjempebølge som reiser seg.
   Lastes først når et raid med Kyogre viser seg (G3C.load i raid3c.js, der verktøykassa står; motoren og stilen er raid3d.js). Reglene bak hvert valg: work/RAIDS3D.md.
   Groudon (c3/383.js) er standarden og mønsteret; denne fila er bygget etter oppskriften der, med havet (K.ground('sea')) som stedets grunnstoff.
   Fila gir 'c3:382' (introen), 'c3:382p' (Primal Reversion ved raseriet), 'c3:382a' og 'c3:382b' (arenaen uten og med 3D-figuren). */
(() => {
  const K = G3D.K, C = CINE.kit, X = G3C, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, hit, rnd, hex } = K, kf = C.kf, { lerpC, sq } = X;
  /* Stedets lys: kjølig kantlys fra himmelen, blått lys nedenfra fra havet, blågrå dis, og blåsvart blekk i konturen (ikke kraterets varme). */
  const ENV = { rim: '#cfe6ff', glow: '#2f8fd0', fog: '#2c3e50', glowH: 6, y: 0, ink: '#0a1420' };
  /* MODELLENE (pakken, 3d/): 'kyogre' og 'kyogre_primal' er Jazz sine nedlastinger fra Omega Ruby. Begge er flate og brede (15 og 25 enheter mellom finnetuppene,
     10 og 20 lange) og vender mot +Z. De røde tegnene ligger i hudteksturen; over dem ligger linjemasker (BodyAInc, BodyBInc, EyeInc) som er LYSET i tegnene: de tegnes
     som lys oppå (mask), hver med sin tekstur, og styres med marks(). Primal har lysende flater (BodyBInc, BodyBInc2: de gule ovalene) og en maske over kroppen.
     Aksene (g3d/scripts/akser.js): Spine y+ løfter forkroppen · Neck og Head y+ løfter hodet · Jaw y− åpner kjeften · *Shoulder x+ løfter finnene, og Arm, ForeArm og
     Hand z+ bøyer dem opp utover · Tail1–2 y+ løfter halen. Roten dreies i rekkefølgen YXZ (kurs, så stamp, så rull): up = nesa opp. */
  const RULES = [[/^Eye1$/, { eye: 1 }], [/^BodyAInc/, { mask: 1, key: 'mA' }], [/^BodyBInc/, { mask: 1, key: 'mB' }], [/^EyeInc/, { mask: 1, key: 'mE' }], [/./, { seamOn: 0 }]];
  const PRULES = [[/^Eye1$/, { eye: 1 }], [/Mask/, { mask: 1 }], [/^BodyBInc/, { seamOn: 0, emis: 1 }], [/./, { seamOn: 0 }]];
  const mkFig = (n, rules, o) => { const g = K.figure(K.model(n), Object.assign({ rules }, o)); g.root.rotation.order = 'YXZ'; g.set('uGl', 0.55); return g; };
  const fig = o => mkFig('kyogre', RULES, o), pfig = o => { const p = mkFig('kyogre_primal', PRULES, o); if (p.mats.BodyA1) p.mats.BodyA1.uniforms.uMul.value.setRGB(1.3, 1.32, 1.4); return p; };   /* Primal sin hud er mørkere blå: løftet, så den ikke blir svart i uværslyset */
  const put = (g, x, y, z, yaw, up, roll) => { g.root.position.set(x, y, z); g.root.rotation.set(-(up || 0), yaw || 0, roll || 0); };
  /* Tegnene: v = hvor sterkt lyset i dem er (0 = bare den røde fargen i huden, 1 = fullt, over = blusser), k = hvor hvitt (0–1). */
  const marks = (g, v, k, a, b) => { g.set('uCrack', v); for (const m in g.mats) { const u = g.mats[m].uniforms.uCrackC; if (u) lerpC(u, a || '#ff3a1c', b || '#ffc08a', k || 0); } };
  const mc = (u, a, b, k, c, k2) => { const x = hex(a), y = hex(b), z = c ? hex(c) : null, r = [0, 1, 2].map(i => { const v = mix(x[i], y[i], k); return z ? mix(v, z[i], k2) : v; }); u.value.setRGB(r[0], r[1], r[2]); };
  /* Brølet: kjeften vidt opp MOT kameraet (ikke hodet kastet bakover: da ser man bare haka), finnene slått opp og ut som vinger, halen løftet. */
  const ROAR = { Spine: [0, 0.06, 0], Neck: [0, 0.08, 0], Head: [0, 0.1, 0], Jaw: [0, -0.85, 0], '*Shoulder': [0.42, 0, 0], '*Arm': [0, 0, 0.2], '*ForeArm': [0, 0, 0.18], '*Hand': [0, 0, 0.22], Tail1: [0, 0.3, 0], Tail2: [0, 0.25, 0] };
  const DUCK = { Spine: [0, -0.12, 0], Neck: [0, -0.14, 0], Head: [0, -0.1, 0], '*Shoulder': [-0.28, 0, 0], '*Arm': [0, 0, -0.12], Tail1: [0, -0.15, 0] };
  const LEAP = { Spine: [0, 0.12, 0], '*Shoulder': [0.7, 0, 0], '*Arm': [0, 0, 0.3], '*ForeArm': [0, 0, 0.25], '*Hand': [0, 0, 0.2], Tail1: [0, -0.25, 0], Tail2: [0, -0.2, 0] };   /* finnene løftet høyt (samler kraft) */
  /* Spranget ut av bølgen: som en hval som bryter flaten. Kroppen står nesten loddrett med buken mot oss (roten stamper), ryggen i bue, finnene bredt ut og halen krøllet. */
  const BREACH = { Spine: [0, -0.16, 0], Neck: [0, -0.1, 0], Head: [0, -0.06, 0], Jaw: [0, -0.7, 0], '*Shoulder': [0.16, 0, 0], '*Arm': [0, 0, 0.1], '*Hand': [0, 0, 0.14], Tail1: [0, 0.3, 0], Tail2: [0, 0.3, 0], Tail3: [0, 0.2, 0] };
  /* Slik den ligger i sjøen: finnene løftet i en slak V over vannet, og halefinnene opp av sjøen bak. */
  const STAND = { '*Shoulder': [0.2, 0, 0], '*Arm': [0, 0, 0.1], '*Hand': [0, 0, 0.14], Tail1: [0, 0.16, 0], Tail2: [0, 0.2, 0], Jaw: [0, -0.1, 0] };
  const PSTAND = { '*Shoulder': [0.05, 0, 0], '*Hand': [0, 0, 0.1], Tail1: [0, 0.12, 0], Tail2: [0, 0.16, 0], Jaw: [0, -0.14, 0] };   /* Primal i kampen: finnene lavere (de er lange og skjuler ellers ansiktet) */
  /* Svømmetaket: en bølge som går ut gjennom finnene og bakover gjennom halen. ph = fasen, a = hvor store tak. */
  const swim = (g, ph, a) => g.add({ '*Shoulder': [0.3 * sin(ph), 0, 0], '*Arm': [0, 0, 0.2 * sin(ph - 0.7)], '*ForeArm': [0, 0, 0.17 * sin(ph - 1.3)], '*Hand': [0, 0, 0.16 * sin(ph - 1.9)],
    Spine: [0, 0.04 * sin(ph + 0.4), 0], Tail1: [0, 0.14 * sin(ph - 1.1), 0], Tail2: [0, 0.17 * sin(ph - 1.8), 0], Tail3: [0, 0.14 * sin(ph - 2.5), 0] }, a);
  const EYE = { shut: 0.5, nar: 0.25 };   /* øyeatlaset (v): 0 åpent · nar smalt · shut lukket */
  const eyeAt = (g, T) => { let c = null; g.root.traverse(q => { if (!q.isMesh || g.eyes.indexOf(q.material) < 0) return; const p = q.geometry.attributes.position, v = new T.Vector3(), s = new T.Vector3(); let n = 0;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(q.matrixWorld); if (v.x > 0) { s.add(v); n++; } } if (n) c = s.divideScalar(n).toArray(); }); return c || [1.6, 0.6, 2.6]; };

  /* ---------- Vannet som står: bølgeveggen, vannsøylene og skypumpene ----------
     Det som er stort i bildet, bygges i 3D (RAIDS3D.md tema 1; hos Groudon er det vulkanen). Her er det vann som reiser seg: ett materiale (artens eget, K.shader) for
     alt som står loddrett. Vannet dras oppover flaten i striper, toppen er tynn og lysere, og skummet sitter i toppen, i årer nedover og i foten.
     uWv = (striper bortover, hvor høyt skummet i toppen begynner, fart bortover: skypumpa snurrer, fart oppover) · uSw = svai (x, z, takt, fase). */
  const VS_W = `varying vec3 vW, vN; varying vec2 vUv; uniform float uTime; uniform vec4 uSw;
void main(){ vUv = uv; vec3 p = position; float v = uv.y; p.x += uSw.x * sin(v * 3.1 + uTime * uSw.z + uSw.w) * v; p.z += uSw.y * cos(v * 2.3 + uTime * uSw.z * .8 + uSw.w) * v;
  vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FS_W = `varying vec3 vW, vN; varying vec2 vUv; uniform vec3 uDeep, uShal, uFoamC, uSkyA; uniform vec4 uWv; uniform float uBri;
${K.GLSL.COMMON}
void main(){ vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 V = normalize(cameraPosition - vW); float v = vUv.y, t = uTime;
  float s1 = fbm(vec2(vUv.x * uWv.x + t * uWv.z, v * 5. - t * uWv.w)), s2 = fbm(vec2(vUv.x * uWv.x * 2.6 + 3. + t * uWv.z * 1.4, v * 11. - t * uWv.w * 1.7));
  float thin = smoothstep(.4, 1., v), d = dot(N, uKey) * .5 + .5;
  vec3 body = mix(uDeep, uShal, thin * (.5 + .55 * s1)) * (.62 + .5 * smoothstep(.2, .9, d));
  float fr = pow(1. - max(dot(N, V), 0.), 3.); body = mix(body, uSkyA, fr * .45);
  float crest = smoothstep(uWv.y - .12 * s2, uWv.y + .08, v), veins = smoothstep(.6, .78, s2) * smoothstep(.2, .9, v) * .55, foot = (1. - smoothstep(0., .12, v)) * smoothstep(.35, .6, s1);
  vec3 col = mix(body, uFoamC * (.68 + .32 * d), clamp(max(crest, max(veins, foot)), 0., 1.)) * uBri;
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.); }`;
  const waterMat = (T, o) => { o = o || {}; return K.shader(VS_W, FS_W, { uDeep: K.uv(K.u3(o.deep || '#052234')), uShal: K.uv(K.u3(o.shal || '#2c93a8')), uFoamC: K.uv(K.u3('#e6f3f9')), uSkyA: K.uv(K.u3('#7f97aa')),
    uWv: K.uv(new T.Vector4(o.sx || 46, o.top == null ? 0.86 : o.top, o.spin || 0, o.up == null ? 1.1 : o.up)), uSw: K.uv(new T.Vector4(...(o.sway || [0, 0, 0, 0]))), uBri: K.uv(1) }, { side: T.DoubleSide }); };
  /* Bølgeveggen: en lang bue (W bred, H høy på midten), hul i flaten og med en topp som krøller seg mot kameraet. Høyden settes med scale.y. */
  const WALL = { W: 560, H: 50, D: 24, z: -96 };
  const wallGeo = (T, W, H, D, n, m, sd) => { const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= n; i++) { const u = i / n, x = (u - 0.5) * W, hk = (0.3 + 0.7 * Math.pow(sin(u * PI), 0.7)) * (0.94 + 0.07 * sin(u * 23 + sd) + 0.05 * sin(u * 57 + 2) + 0.03 * sin(u * 131));
      for (let j = 0; j <= m; j++) { const v = j / m, c = max(0, (v - 0.6) / 0.4); pos.push(x, H * hk * v, -x * x / (W * 1.1) + D * ((1 - v) * (1 - v) + 0.6 * c * c)); uvs.push(u, v); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const p = i * (m + 1) + j, q = p + m + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g; };

  /* ---------- Stedet: det åpne havet ----------
     Nesten bare vann (Jazz: «vann over hele banen, enorme dønninger/bølger, masse regn»), og Kyogre ligger i det. Havet er arenaens materiale i 3D (K.ground('sea')):
     flaten flytter seg, så dønningene skjuler og vannlinja følger sjøen. Rundt står sjøstakker av mørk, våt basalt i disen, og bak reiser bølgeveggen seg.
     Himmelen, lynet og regnet tegnes i 2D (backdrop og rain under). */
  function ocean(T) {
    const S = { scene: new T.Scene(), figs: [] }, sc = S.scene, add = (m, x, y, z, ry) => { m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; sc.add(m); return m; };
    S.sea = add(K.ground('sea', { seg: 200, swell: 1.5, chop: 1, foam: 0.8, rain: 0.5, wind: [0.22, 1, 1] }));
    const rm = S.rm = K.rockMat({ a: '#10161c', b: '#28333e', str: 0.16, sm: 0.6, lv: 0, hot: 0.01, tint: [0.08, 0.1, 0.13], top: 0.25 });
    /* Sjøstakker: tinder og skjær i en vid bue bak og til sidene, så havet får dybde. Ingen der Kyogre ligger eller der kameraene står. */
    for (let i = 0; i < 16; i++) { const a = PI * (1.02 + 0.96 * (i + rnd(i, 21) * 0.8) / 16), r = 110 + rnd(i, 22) * 150, h = 14 + rnd(i, 23) * 34, w = 5 + rnd(i, 24) * 9;
      add(K.boulder(w, 30 + i, { j: 0.3, flat: 1, sx: 1, sy: h / w, sz: 0.8 + rnd(i, 25) * 0.5, mat: rm }), cos(a) * r, h * 0.2, sin(a) * r, rnd(i, 26) * 6);
      if (i % 2) add(K.boulder(w * 0.6, 60 + i, { j: 0.3, flat: 1, sy: h * 0.4 / w, mat: rm }), cos(a) * r + w * 1.3, h * 0.05, sin(a) * r + w * 0.6, rnd(i, 27) * 6); }
    for (const [x, z, w, h, sd] of [[-34, -22, 5, 9, 81], [-41, -17, 3, 4, 82], [40, -40, 6, 13, 83], [47, -34, 3.5, 5, 84], [-60, 18, 4, 6, 85], [58, 10, 4.5, 7, 86]]) add(K.boulder(w, sd, { j: 0.28, flat: 1, sy: h / w, mat: rm }), x, h * 0.15, z, rnd(sd, 3) * 6);
    /* Bølgeveggen, med skumrøyken vinden river av toppen. Skjult til den trengs (S.wall.visible, scale.y = hvor høy). */
    S.wm = waterMat(T, {}); S.wall = add(new T.Mesh(wallGeo(T, WALL.W, WALL.H, WALL.D, 96, 14, 7), S.wm), 0, -2.5, WALL.z); S.wall.frustumCulled = false; S.wall.visible = false;
    S.crest = K.pts(260, i => { const u = 0.08 + 0.84 * rnd(i, 41), x = (u - 0.5) * WALL.W, hk = 0.3 + 0.7 * Math.pow(sin(u * PI), 0.7); return { p: [x, WALL.H * hk * (0.95 + 0.07 * rnd(i, 42)), -x * x / (WALL.W * 1.1) + WALL.D * 0.55], v: [3 + rnd(i, 43) * 5, 1 + rnd(i, 44) * 4, -5 - rnd(i, 45) * 8], b: rnd(i, 46) * 2.4, l: 2.4, z: 5 + rnd(i, 47) * 7 }; },
      { loop: 1, shade: 1, drag: 0.6, sz0: 0.6, sz1: 2.4, px: 150, c: ['#eef8fd', '#b9d2e2', '#7493aa'], a: 0.42, fade: 0.3 }); S.wall.add(S.crest);
    /* Lufta: skodde som driver lavt over sjøen, og sprut. Utbrudd startes med S.fx(...). */
    S.mist = add(K.pts(40, i => ({ p: [-110 + rnd(i, 1) * 220, 1.5 + rnd(i, 2) * 8, -105 + rnd(i, 3) * 80], v: [3 + rnd(i, 4) * 3, 0.1, 0.4], b: rnd(i, 5) * 12, l: 12, z: 26 + rnd(i, 6) * 34 }), { loop: 1, shade: 1, px: 60, sz0: 0.8, sz1: 1.5, near: 14, c: ['#94a8ba', '#647c90', '#3e5266'], a: 0.3, fade: 0.6 }));   /* bare langt ute: en dott nær et lavt kamera blir et hvitt slør over halve bildet */
    S.spl = [0, 1, 2, 3].map(k => add(K.pts(54, i => { const a = rnd(i, 80 + k) * TAU, v = 2 + rnd(i, 81 + k) * 7; return { p: [cos(a) * 2.6, 0.1, sin(a) * 2], v: [cos(a) * v, 7 + rnd(i, 82 + k) * 10, sin(a) * v], b: rnd(i, 83) * 0.18, l: 1 + rnd(i, 84) * 0.6, z: 1.6 + rnd(i, 85) * 2.6 }; }, { t0: -1e5, shade: 1, g: 24, px: 60, sz0: 0.7, sz1: 1.5, c: ['#ffffff', '#d4e8f4', '#8fb4cc'], floor: -0.5, a: 0.9, fade: 0.6 })));
    S.ring = add(K.light(0, '#d8f0ff'));
    S.fx = (pts, t0, x, y, z) => { pts.position.set(x, y, z); pts.material.uniforms.uT0.value = t0; };
    return S;
  }
  /* Været for dette bildet: st = hvor mye uvær (0 stille skumring · 1 full storm · over 1 Primordial Sea), fl = lynets styrke akkurat nå (0–1).
     Setter havet (dønninger, skum, regnringer, farger), lyset på figurene og disen. Bølgeveggen og vannsøylene følger lynet. */
  const weather = (S, st, fl, o) => { o = o || {}; const U = K.U(), su = S.sea.material.uniforms, s1 = c01(st), s2 = c01(st - 1);
    su.uSea.value.set(o.swell == null ? mix(0.7, 1.7, s1) + 0.9 * s2 : o.swell, mix(0.6, 1.2, s1), o.foam == null ? mix(0.35, 0.95, s1) + 0.3 * s2 : o.foam, mix(0, 0.8, s1)); su.uWind.value.z = mix(0.6, 1.15, s1) + 0.3 * s2;
    mc(su.uSkyA, '#93a4b4', '#566c80', s1, '#d8e8f6', 0.7 * fl); mc(su.uSkyB, '#27344a', '#0c141f', s1, '#5a7088', 0.5 * fl); mc(su.uDeep, '#082234', '#04121e', s1); mc(su.uShal, '#2a7c90', '#176078', s1); su.uBri.value = (o.bri || 1) * (1 + 0.4 * fl);
    mc(U.uKeyC, '#dcd6dc', '#bccad8', s1, '#ffffff', 0.85 * fl); mc(U.uShC, '#22283c', '#111d30', s1, '#30496a', 0.5 * fl); U.uRimK.value = 0.75 + 0.5 * fl; U.uGlow.value = 0.5 + 0.3 * fl;
    U.uFog.value.set(mix(70, 46, s1) - 12 * s2, mix(420, 250, s1) - 60 * s2, mix(0.7, 0.86, s1) + 0.06 * s2);
    const w = S.wm.uniforms; mc(w.uSkyA, '#93a4b4', '#566c80', s1, '#d8e8f6', 0.7 * fl); w.uBri.value = 1 + 0.5 * fl;
    S.mist.material.uniforms.uA.value = 0.08 + 0.2 * s1; S.storm = st; S.fl = fl; S.uw = 0; };
  /* Under vann (kameraet under flaten): blått lys ovenfra, tett blå dis, ingen kontur av himmelen. Havflaten synes ikke nedenfra, så bakteppet tegner alt. */
  const under = (S, fl) => { const U = K.U(); U.uKeyC.value.setRGB(0.5 + 0.3 * fl, 0.72 + 0.2 * fl, 0.94); U.uShC.value.setRGB(0.03, 0.12, 0.3); U.uRimK.value = 0.9; U.uGlow.value = 0.25; U.uFogC.value.setRGB(0.03, 0.2, 0.42); U.uFog.value.set(10, 70, 0.92); S.uw = 1; S.fl = fl; };
  const UW = -70;   /* scenen under vann ligger dypt under flaten (ingenting annet er der) */

  /* Bakteppet i 2D, festet til 3D-kameraet (G3D.view) som hos Groudon: skumringshimmel som mørkner, uværsskyer lyst opp av lynet, lynet selv ned i havet, og
     regnvegger i det fjerne. Under vann: lyset ovenfra og mørket nedover. Gir horisonten (hz) og lynets plass på skjermen. */
  const UR = 560, wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  const backdrop = (S, t) => {
    const g = C.g, v = G3D.view(), k = v.ppr / UR, bl = C.blend, st = c01(S.storm == null ? 1 : S.storm), s2 = c01((S.storm || 0) - 1), fl = S.fl || 0;
    if (S.uw) { const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, bl('#3f9fd8', '#d4f0ff', 0.5 * fl)); gr.addColorStop(0.4, '#0f5590'); gr.addColorStop(1, '#03122a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
      for (let i = 0; i < 8; i++) { const x = 40 + rnd(i, 3) * 440 + 22 * sin(t * (0.5 + rnd(i, 4)) + i), w = 16 + rnd(i, 5) * 30; C.blob(x, 60, w, '#aee4ff', (0.1 + 0.08 * sin(t * 1.7 + i * 2)) * (1 + fl), 1, 9); }
      C.blob(256, -30, 300, '#c8f0ff', 0.3 + 0.4 * fl, 1, 0.45); return { hz: -40, x: 256, y: 0, uw: 1 }; }
    g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
    const gr = g.createLinearGradient(0, -UR * 1.05, 0, 6); gr.addColorStop(0, bl(bl('#0b1220', '#04070c', st), '#56677c', 0.5 * fl)); gr.addColorStop(0.6, bl(bl('#28364c', '#111a26', st), '#8ea2ba', 0.6 * fl)); gr.addColorStop(0.9, bl(bl('#7c8494', '#35465a', st), '#c2d2e2', 0.6 * fl)); gr.addColorStop(1, bl(bl('#c8b4a8', '#4d6176', st), '#dce8f4', 0.6 * fl));
    g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 4008); g.fillStyle = bl('#31455a', '#1c2c3c', st); g.fillRect(-4000, 6, 8000, 4000);
    /* Lynet: en gren fra skyene ned i havet, og skyene rundt lyser. S.fla = hvor (vinkelen rundt horisonten), S.fls = hvilket lyn (frø). */
    const lx = wrap((S.fla == null ? PI : S.fla) - v.yaw) * UR; let sx = lx, sy = -40;
    if (fl > 0.04) { C.blob(lx, -150, 330, '#b9d0ff', 0.5 * fl, 1, 0.6); C.bolt(lx + (rnd(S.fls || 0, 41) - 0.5) * 150, -330, lx, 4, { seed: (S.fls || 0) * 5 + floor(t * 22) % 3, col: '#a8c8ff', core: '#ffffff', w: 2.4, a: fl, br: 4, depth: 5 }); C.blob(lx, 2, 90, '#e0ecff', 0.7 * fl, 1, 0.3); }
    /* Skyene: tunge dotter som driver, lavere og tettere jo mer uvær; undersiden lysner i lynet. */
    for (let i = 0; i < 26; i++) { const x = wrap(rnd(i, 3) * TAU + t * (0.006 + rnd(i, 4) * 0.008) * (0.4 + st) - v.yaw) * UR, y = -(34 + rnd(i, 5) * 300) * (1.25 - 0.3 * st), r = 80 + rnd(i, 6) * 110, a = (i < 9 ? 0.5 : st) * 0.9; if (abs(x) > 780 || a < 0.03) continue;
      C.blob(x, y, r, bl(bl('#3a4658', '#0d131c', st), '#7388a2', 0.55 * fl), a, 0, 0.44); C.blob(x + 6, y + r * 0.24, r * 0.8, bl('#8a94a6', '#c8d8ee', fl), (0.1 + 0.5 * fl) * a, 1, 0.22); }
    /* Regnveggene langt ute: lyse slør som henger ned fra skyene. */
    if (st > 0.3) for (let i = 0; i < 7; i++) { const x = wrap(rnd(i, 13) * TAU + t * 0.004 - v.yaw) * UR; if (abs(x) > 700) continue; C.blob(x, -70, 60 + rnd(i, 14) * 70, '#8fa6bc', 0.2 * (st - 0.3) * (1 + s2), 0, 2.2); }
    g.restore(); const ca = cos(v.ang), sa = sin(v.ang);
    return { hz: v.y, x: v.x + k * (sx * ca - sy * sa), y: v.y + k * (sx * sa + sy * ca) };
  };
  /* Regnet foran linsa og dråpene på den (RAIDS.md nr. 41: «regn på linsa»), tegnet oppå 3D-bildet før etterbehandlingen. r = hvor mye (0–1,5). */
  const rain = (S, r, wet) => { if (S.uw) { C.parts('bubble', { n: 26, seed: 5, cols: ['#bfe8ff'], a: 0.5, spd: 1.6, z: [0.2, 1] }); return; }
    if (r > 0.02) { C.parts('rain', { n: 70 + floor(60 * min(1, r)), seed: 2, cols: ['#8fb0c8', '#c2d6e4'], a: 0.5 * min(1.3, r), spd: 1.3, wind: -0.75, z: [0.05, 0.6] }); C.parts('rain', { n: 46, seed: 12, cols: ['#a8c4d8', '#dcebf4'], a: 0.6 * min(1.3, r), spd: 1.4, wind: -0.75, z: [0.6, 1] }); }
    if (wet > 0.02) C.lensShine(C.lensDrops({ n: 16, a: 12, size: 8, wet: min(1, wet), run: 0.4 }), { a: 0.85 }); };
  /* Stedets etterbehandling: kjølig tone, glød i skum og lyn, mørke kanter. Stråler fra lynet når det slår ned. */
  const look = (S, t, P, q, sn) => { const fl = S.fl || 0;
    P.bloom = 0.3 + 0.25 * fl + 0.1 * (S.rw || 0); P.bloomT = S.uw ? 0.78 : 0.7; P.vig = 0.4 + 0.4 * q.vig; P.vigc = '#01060c'; P.grain = 0.035; P.grade = { tint: [0.95, 1, 1.05], con: 1.08, sat: 1.08, exp: 1.06 + 0.12 * fl };
    if (S.uw) P.rays = { x: 256, y: -20, a: 0.5, len: 0.9 }; else if (fl > 0.3 && sn && sn.y > -200 && sn.y < 300) P.rays = { x: sn.x, y: sn.y, a: 0.5 * (fl - 0.3), len: 0.7 }; };
  /* Navneskiltet tegnes ETTER regnet (regnet faller bak skiltet): G3D.text slik reg gjør det, i figurens oppløsning og med havets blekk. */
  const plateOn = fn => { if (G3D.out > 0.3) return; const g = C.g; g.imageSmoothingEnabled = false; g.drawImage(G3D.text(fn, 1, X.SKIN.sea.ink), 0, 0, 512, 384); g.imageSmoothingEnabled = true; };
  /* Lynene i en film: [[tid, styrke, hvor (vinkel), varighet]]. Gir styrken nå, og setter hvor og hvilket. */
  const bolts = (S, t, L) => { let f = 0; for (let i = 0; i < L.length; i++) { const q = L[i], d = t - q[0], len = q[3] || 0.5; if (d < 0 || d > len) continue; const a = q[1] * (1 - d / len) * (0.6 + 0.4 * sin(d * 58)); if (a > f) { f = a; S.fla = q[2]; S.fls = i + 1; } } return max(0, f); };

  /* ---------- Kyogre våkner (introen før raidet): Primordial Sea ----------
     RAIDS.md nr. 41, og videoene i fanart/kyogre/ for bevegelsen (svømmetaket under vann, og at den bryter flaten i et hvitt blink).
     Én sammenhengende handling: en enorm skygge med lysende tegn glir under flaten i skumringen (tegnene slår på de tre dempede slagene) → uværet bryter løs, og
     havet reiser seg til en vegg med lyset fra tegnene inne i seg → øyet (de tre raske slagene) → Kyogre bryter ut av bølgeveggen i et brøl der låta løfter seg →
     den stuper over oss, og bildet er under vann én takt → Origin Pulse der den ligger i kampen → det siste brølet med navnet.
     Låta er den samme som Groudon sin («Primal Kyogre & Groudon»; Jazz 18.11: «Bare ta samme låt»), men den starter 1,1 s inne (Groudon 2,48), så de dempede slagene
     i åpningen er med, og uværet bryter løs der orkesteret smeller inn (5,26). Filmens tid = låtas tid − A0. */
  const A0 = 1.1, mb = x => Math.round((x - A0) * 100) / 100;
  const KB = [1.56, 2.79, 4.01].map(mb), KS = mb(5.26), KL = [6.49, 7.72].map(mb), KT = [8.46, 8.93, 9.54].map(mb), KC = mb(10.16), KD = mb(11.40), KU = mb(12.63), KA = mb(13.87), KP = mb(15.05), KW = mb(16.30), KX = mb(18.76);
  const HOME = [0, 1.5, 2.8], UP0 = 0.2;   /* der den ligger i kampen: høyt i sjøen, så hodet og finnene er over vannet og buken, finnetuppene og halen i det */
  /* Origin Pulse: lyskuler stiger opp av havet rundt den (KA), og på KP skyter de ned i sjøen på rekke mot kameraet: en vannsøyle for hver, den siste rett foran linsa. */
  const NB = 7, pulse = i => { const k = i / (NB - 1); return { x: mix(1.5, 4.9, k) + (i % 2 ? 1 : -1) * 3.6 * (1 - k), z: mix(9.5, 26.3, k), h: 5 + i * 0.9, r: 1 + i * 0.1, t: KP + 0.06 + i * 0.16, ox: (i - 3) * 3.4, oy: 6.5 + 2 * sin(i * 1.9), oz: -1.5 - 1.2 * cos(i * 1.3) }; };
  const pulseSh = t => { let s = 0; for (let i = 0; i < NB; i++) s += (0.7 + 2.4 * i / (NB - 1)) * hit(t, pulse(i).t, 0.22); return s + 6 * hit(t, pulse(NB - 1).t, 0.8); };
  const BOLTS = [[KS, 1, PI * 0.92, 0.7], [KL[0], 0.8, PI * 1.12, 0.5], [KL[1], 0.9, PI * 0.96, 0.5], [KC, 1, PI * 1.05, 0.6], [KU, 0.7, PI * 0.9, 0.45], [KP, 0.9, PI * 1.08, 0.5], [KX, 1, PI * 0.95, 0.7], [KX + 2.9, 0.5, PI * 1.2, 0.4]];
  G3D.def('c3:382', {
    len: mb(20.6), hold: 1, R: KX, at: A0, models: ['kyogre'], env: ENV, edge: 'sea',
    make(K, T) {
      const S = ocean(T), g = S.gr = fig(); S.scene.add(g.root); S.figs.push(g); S.spc = '#e4f2ff';
      /* Øyekameraet: øyet og kameraplassen målt i hvilestillingen og festet til hodebenet, så nærbildet følger hodet. */
      g.clear(); g.apply(); const e = eyeAt(g, T), loc = (b, x, y, z) => g.bones[b].worldToLocal(new T.Vector3(x, y, z));
      S.A = { eye: loc('Head', e[0] - 0.5, e[1], e[2] - 0.3), eyeCam: loc('Head', e[0] + 3.4, e[1] + 1.1, e[2] + 5) }; S.W = (b, v) => g.bones[b].localToWorld(v.clone());
      /* Lyset fra tegnene inne i bølgen. */
      S.wglow = K.light(1, '#ff3a22', { depth: false }); S.wglow.renderOrder = 6; S.scene.add(S.wglow);
      /* Vannet som sprenges ut når den bryter gjennom: klumper av vann i figurens piksler (noen få store, mange små), og skumrøyk. */
      const B = [0, 22, WALL.z + 24];
      S.burst = K.shards(84, i => { const a = rnd(i, 3) * TAU, el = (rnd(i, 4) - 0.25) * 1.9, v = 12 + rnd(i, 5) * 30, big = i % 7 === 3; return { p: [B[0] + cos(a) * 5, B[1] + sin(el) * 5, B[2]], v: [cos(a) * cos(el) * v, sin(el) * v + 9, 14 + rnd(i, 6) * 46], r: [(rnd(i, 7) - 0.5) * 9, (rnd(i, 8) - 0.5) * 9, (rnd(i, 9) - 0.5) * 9], s: rnd(i, 10), b: rnd(i, 11) * 0.12, l: 3, z: big ? 1.6 + rnd(i, 12) * 1.2 : 0.5 + rnd(i, 13) * 0.8 }; }, { c: '#e4f4ff', grey: 0, em: 0.55, sy: 0.7, id: 202 }); S.scene.add(S.burst);
      S.puff = K.pts(70, i => { const a = rnd(i, 21) * TAU, el = (rnd(i, 22) - 0.3) * 1.8, v = 8 + rnd(i, 23) * 22; return { p: [B[0] + cos(a) * 6, B[1] + sin(el) * 6, B[2]], v: [cos(a) * cos(el) * v, sin(el) * v + 4, 10 + rnd(i, 24) * 26], b: rnd(i, 25) * 0.2, l: 1.8 + rnd(i, 26), z: 16 + rnd(i, 27) * 22 }; }, { t0: -1e5, shade: 1, drag: 1.2, g: 9, sz0: 0.5, sz1: 2, px: 150, c: ['#ffffff', '#cfe6f2', '#86aac2'], a: 0.6, fade: 0.4 }); S.scene.add(S.puff);
      /* Under vann: bobler som river seg løs fra den. */
      S.bub = K.pts(90, i => ({ p: [(rnd(i, 31) - 0.5) * 12, (rnd(i, 32) - 0.5) * 3, (rnd(i, 33) - 0.5) * 9], v: [(rnd(i, 34) - 0.5) * 1.5, 3 + rnd(i, 35) * 5, (rnd(i, 36) - 0.5) * 1.5], b: rnd(i, 37) * 1.2, l: 1.2, z: 0.5 + rnd(i, 38) * 1.4 }), { loop: 1, add: 1, px: 60, sway: 0.6, c: ['#ffffff', '#bfe8ff', '#5aa8e0'], fade: 0.8 }); S.scene.add(S.bub);
      /* Origin Pulse: lyskulene, vannsøylene de reiser, og spruten fra hver. */
      S.orbs = []; for (let i = 0; i < NB; i++) { const o = K.light(1, '#8fdcff'); S.scene.add(o); S.orbs.push(o); }
      /* Søylene er sprut, ikke faste former (en dreid søyle så ut som plast): en tett stråle av skum som skytes rett opp og faller sammen, og sprut ut til sidene. */
      S.pcol = K.pts(NB * 30, i => { const j = floor(i / 30), b = pulse(j), a = rnd(i, 13) * TAU, q = rnd(i, 14), v = (11 + 9 * rnd(i, 15)) * (0.78 + 0.07 * j); return { p: [b.x + cos(a) * b.r * 0.5 * q, 0.1, b.z + sin(a) * b.r * 0.5 * q], v: [cos(a) * (0.3 + 2 * q), v, sin(a) * (0.3 + 2 * q)], b: b.t - KP + rnd(i, 17) * 0.3, l: 1.2 + rnd(i, 18) * 0.5, z: (2.2 + rnd(i, 19) * 3) * (1 + 0.08 * j) }; }, { t0: KP, shade: 1, g: 24, px: 60, sz0: 0.6, sz1: 1.6, c: ['#ffffff', '#d4ecf8', '#86b4d0'], floor: -0.5, a: 0.95, fade: 0.55 }); S.scene.add(S.pcol);
      S.pspl = K.pts(NB * 10, i => { const b = pulse(floor(i / 10)), a = rnd(i, 3) * TAU; return { p: [b.x + cos(a) * b.r, 0.2, b.z + sin(a) * b.r], v: [cos(a) * (2 + rnd(i, 4) * 6), 8 + rnd(i, 5) * 10, sin(a) * (2 + rnd(i, 6) * 6)], b: b.t - KP + rnd(i, 7) * 0.08, l: 1 + rnd(i, 8) * 0.5, z: 1.6 + rnd(i, 9) * 2.4 }; }, { t0: KP, shade: 1, g: 26, px: 60, sz0: 0.7, sz1: 1.5, c: ['#ffffff', '#d4ecf8', '#8fbcd4'], floor: -0.5, a: 0.9, fade: 0.7 }); S.scene.add(S.pspl);
      return S;
    },
    /* Skuespillet. o.out (0..1) = spilleren har trykket Continue. */
    act(S, t, o) {
      const g = S.gr, su = S.sea.material.uniforms, out = o.out || 0; S.cur = o;
      const fl = bolts(S, t, BOLTS), st = t < KS ? mix(0.1, 0.45, seg(t, 0, KS)) + 0.3 * ei(seg(t, KS - 0.4, KS)) : 1;
      weather(S, st, fl);
      const uw = (t >= KT[0] - 0.4 && t < KC - 0.035) || (t >= KD - 0.03 && t < KU - 0.03); if (uw) under(S, fl * 0.5);
      /* Bølgeveggen: reiser seg fra uværet bryter løs, står høyest når Kyogre bryter gjennom, og faller sammen når den stuper. */
      const wk = t < KS ? 0 : t < KC ? mix(0.2, 1, eo(seg(t, KS, KC - 0.2))) : 1 - 0.9 * io(seg(t, KD - 0.1, KU + 0.6)); S.wall.visible = wk > 0.01 && t < KU + 1; S.wall.scale.y = max(0.01, wk); S.wall.position.z = WALL.z + 10 * seg(t, KS, KD); S.wk = wk;
      const sh = n => K.seaH(su, n[0], n[2], t);
      for (const r of su.uRing.value) r.w = 0; const ring = (i, x, z, t0, v, d, a) => su.uRing.value[i].set(x, z, 1.5 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
      let glow = 0.25, hot = 0, rw = 0, wade = 0; g.root.visible = true; S.wglow.visible = false; g.set('uFlK', 0);
      if (t < KS) {
        /* 1 Skyggen: den glir under flaten mot kameraet og inn under det, med rolige svømmetak. Tegnene slår på de tre dempede slagene, og en ring brer seg på flaten. */
        const zz = u => mix(-10, 15.5, u), xx = u => 2.2 * sin(u * 2.1), u = t / KS, pu = max(hit(t, KB[0], 0.6), hit(t, KB[1], 0.6), hit(t, KB[2], 0.6));
        put(g, xx(u), -2.7, zz(u), 0.05 * sin(u * 3), 0, 0.03 * sin(t * 1.3)); swim(g, t * 2.2, 0.45); glow = 1 + 1.4 * pu; hot = 0.5 * pu;
        const bi = t >= KB[2] ? 2 : t >= KB[1] ? 1 : 0, bu = KB[bi] / KS; ring(0, xx(bu), zz(bu), KB[bi], 13, 1.3, t >= KB[0] ? 0.9 : 0);
      } else if (t < KT[0] - 0.4) {
        /* 2 Inne i bølgeveggen: lyset fra tegnene skimtes gjennom vannet, større for hvert lyn. */
        const u = seg(t, KS, KT[0]), pu = max(hit(t, KL[0], 0.6), hit(t, KL[1], 0.6)); put(g, 3, 4 + 15 * wk, S.wall.position.z + 3, 0, 0.5, 0); swim(g, t * 3, 0.7); glow = 0.9 + 0.8 * pu; hot = 0.3 + 0.5 * u;
        S.wglow.visible = true; S.wglow.position.set(3, 5 + 15 * wk, S.wall.position.z + 12); K.face(S.wglow); S.wglow.scale.setScalar(26 + 16 * u + 12 * pu); S.wglow.material.uniforms.uA.value = 0.16 + 0.2 * u + 0.3 * pu;
      } else if (t < KC - 0.035) {
        /* 3 Øyet (under vann, inne i bølgen): mørkt og halvt lukket, åpner seg på det første slaget, tegnene blusser på det andre, og det smalner på det tredje. */
        put(g, 0, UW, 0, 0, 0.1, 0); swim(g, t * 2.2, 0.5); glow = t < KT[0] ? 0.2 : 0.55 + 0.6 * max(hit(t, KT[0], 0.4), hit(t, KT[1], 0.4), hit(t, KT[2], 0.5)); hot = 0.15;
      } else if (t < KD - 0.03) {
        /* 4 Gjennombruddet: ut av bølgeveggen som en hval som bryter flaten, nesten loddrett med buken mot oss og kjeften åpen. Den henger over oss og velter så fram over kameraet. */
        const u = eo(seg(t, KC - 0.06, KC + 0.5)), dv = ei(seg(t, KD - 0.36, KD)), hg = seg(t, KC + 0.5, KD - 0.36); rw = back(seg(t, KC, KC + 0.3), 2.2) * (1 - 0.6 * dv);
        put(g, mix(1, 0.4, u), mix(20, 11, u) + 2.2 * sin(u * PI) + 0.6 * hg - 6.5 * dv, mix(WALL.z + 26, 12.5, u) + 0.8 * hg + 7 * dv, 0.12 * (1 - u), mix(1.35, 1.2, u) - 0.12 * hg - 1.25 * dv, 0.04 * sin(t * 6));
        g.add(BREACH, 1 - 0.4 * dv); g.add({ Jaw: [0, -0.12 * rw, 0] }, 1); g.rot('Jaw', 0, 0.04 * sin(t * 57) * rw, 0); glow = 1.5; hot = 0.85;
      } else if (t < KU - 0.03) {
        /* 5 Under vann én takt: den skyter forbi og ned i det blå med lange svømmetak, og boblene river seg løs. */
        const u = seg(t, KD, KU); put(g, mix(-9, 7, u), UW + mix(5, -3.5, u), mix(7, -15, io(u)), PI + mix(0.9, 0.35, u), mix(-0.35, -0.1, u), mix(0.5, 0.1, u)); swim(g, t * 9, 1.1); glow = 1.2; hot = 0.6;
      } else {
        /* 6 og 7 Der den ligger i kampen: den bryter flaten (for høyt, og faller i leiet), samler lyskulene (KA), slår dem ned (KP: en søyle av sprut for hver), og brøler til slutt (KX). */
        const up = back(seg(t, KU, KU + 0.5), 2), rise = kf(t, [[KA, 0], [KP - 0.2, 1, io], [KP - 0.02, 1.2, io], [KP + 0.12, -0.5, eo], [KP + 0.8, 0, io]]), rd = kf(t, [[KW + 0.5, 0], [KX - 0.75, 0.7, io], [KX - 0.3, 1, io], [KX - 0.03, 1.4, ei], [KX + 0.1, 0, eo]]) * (1 - out);
        rw = t < KX ? 0 : back(seg(t, KX, KX + 0.3), 2.5) * (1 - io(seg(t, KX + 1.5, KX + 2.3)));
        const y = mix(-4, HOME[1], up) + 0.5 * sq(t, KU + 0.5, 9, 4) + 1.5 * max(0, rise) - 0.6 * rd + 1.5 * rw + 0.3 * sin(t * 1.5);
        put(g, HOME[0], y + 0.35 * sh(HOME), HOME[2], 0, UP0 + 0.3 * (1 - up) + 0.16 * max(0, rise) - 0.12 * rd + 0.1 * rw, 0.03 * sin(t * 1.1));
        g.add(STAND, 1 - 0.6 * rw); swim(g, t * 2.6, 0.4 * (1 - rw) * (1 - max(0, rise))); g.add(LEAP, 0.8 * max(0, rise)); g.add(DUCK, max(0, -rise) * 1.6 + rd); g.add(ROAR, rw); g.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); g.rot('Head', 0, 0, 0.02 * sin(t * 43) * rw);
        glow = 0.45 + 0.9 * max(0, rise) + 0.8 * rw + 0.5 * hit(t, KU, 0.8); hot = c01(0.7 * max(0, rise) + 0.6 * rw); wade = 0.45 + 0.4 * hit(t, KU, 1.2) + 0.4 * hit(t, KP, 1) + 0.3 * rw;
        ring(0, HOME[0], HOME[2], t < KP ? KU : t < KX ? KP : KX, t < KX ? 22 : 30, 1.6, 1);
        /* Søylene: de siste tre får ring i sjøen (uRing har fire plasser). */
        for (let j = 0; j < 3; j++) { const b = pulse(NB - 1 - j); ring(1 + j, b.x, b.z, b.t, 16, 1.1, 1); }
      }
      marks(g, glow * (0.85 + 0.15 * sin(t * 5.1)), hot); S.rw = rw; S.mouth = null;
      /* Øynene: halvt lukket til det første av de tre slagene, åpne, og smale (sinte) fra det tredje, i spranget og i brølene. Blunker mens den venter. */
      const nar = (t >= KT[2] && t < KD) || (t > KA + 0.3 && t < KW) || (t > KX - 0.8 && t < KX + 3.2) || out;
      g.eye(0, t < KT[0] || (t > KX + 4 && (t - KX) % 4.4 < 0.12) ? EYE.shut : t < KT[0] + 0.07 || nar ? EYE.nar : 0, t < KT[0] ? 0.05 : 0.2 + 0.25 * max(hit(t, KT[0], 0.4), hit(t, KT[1], 0.4), hit(t, KT[2], 0.5)));
      su.uWade.value.set(HOME[0], HOME[2] + 1, 9, wade);
      /* Gjennombruddet: vannet sprenges ut av veggen. */
      S.burst.at(t, KC - 0.02, { g: 16, floor: 0 }); S.puff.material.uniforms.uT0.value = KC - 0.02;
      S.bub.visible = uw; if (uw) S.bub.position.copy(g.root.position);
      /* Origin Pulse: kulene stiger opp av sjøen rundt den én etter én, svever og pulserer, og skyter så ned; søylene skyter opp og faller sammen. */
      for (let i = 0; i < NB; i++) { const b = pulse(i), ob = S.orbs[i], ta = KA + 0.05 + i * 0.1, a = t < ta || t > b.t ? 0 : 1, fly = ei(seg(t, b.t - 0.14, b.t)), up = eo(seg(t, ta, ta + 0.45));
        const bl = t >= b.t ? hit(t, b.t, 0.3) : 0; ob.visible = a > 0 || bl > 0;
        if (a) { ob.position.set(mix(HOME[0] + b.ox, b.x, fly), mix(mix(0.3, b.oy, up) + 0.3 * sin(t * 5 + i), 0.5, fly), mix(HOME[2] + b.oz, b.z, fly)); K.face(ob); ob.scale.setScalar((2.2 + 1.6 * up + 0.5 * sin(t * 9 + i * 2)) * (1 + fly)); ob.material.uniforms.uA.value = 0.75 * up; }
        else if (bl > 0) { ob.position.set(b.x, 1.6, b.z); K.face(ob); ob.scale.setScalar(7 + 9 * (1 - bl)); ob.material.uniforms.uA.value = 0.8 * bl; } }   /* glimtet der kula slår ned */
      S.fx(S.spl[0], KU, HOME[0], 0, HOME[2] + 2); S.fx(S.spl[1], KP + 0.02, HOME[0], 0, HOME[2] + 3); S.fx(S.spl[2], KX, HOME[0], 0, HOME[2] + 3);
      const rt0 = t >= KX ? KX : t >= KP ? KP : KU, ra = t >= KU ? hit(t, rt0, 0.9) : 0; S.ring.position.set(HOME[0], 0.5, HOME[2] + 2); S.ring.scale.setScalar(3 + (t - rt0) * 40); S.ring.material.uniforms.uA.value = 0.8 * ra; S.ring.visible = ra > 0;
      S.rain = t < KS ? 0.5 * seg(t, 0.6, KS) * seg(t, 0.6, KS) + 0.5 * ei(seg(t, KS - 0.4, KS)) : 1; S.wet = t < KS ? 0.3 * seg(t, 0.9, KS) : 0.85;
    },
    shots: [
      /* 1 Skyggen: havet i skumringen sett ovenfra og utover, mens skyene samler seg. Den enorme skyggen med de lysende tegnene glir under flaten mot oss. */
      [0, (S, u, a, t) => { const e = io(u), z = S.gr.root.position.z; K.cam(mix(4.5, 2.5, e), mix(10.5, 9, e), mix(25, 26.5, e), mix(0, 1, e), 0, z * 0.55 + 3, 46); S.post.sub = 0.62; S.post.subf = 0.07; S.post.subg = 1.7; S.post.subc = '#2f6088'; S.post.fade = 1 - seg(t, 0, 0.8);
        S.post.sh = 1 * (hit(t, KB[0], 0.3) + hit(t, KB[1], 0.3) + hit(t, KB[2], 0.3)) + 2 * seg(t, KS - 0.34, KS); S.post.vig = 0.6; }],
      /* 2 Primordial Sea: lynet slår ned, regnet står ned, og langt ute reiser havet seg til en vegg. Langt objektiv fra like over sjøen; lyset fra tegnene inne i bølgen. */
      [KS - 0.04, (S, u, a, t) => { const e = io(u), su = S.sea.material.uniforms; K.cam(-5 + 2 * e, 2.2 + K.seaH(su, -5, 40, t) * 0.6, 40, 2, mix(9, 17, e), -60, mix(31, 27, e)); S.post.sub = 0.75; S.post.subf = 0.05; S.post.subg = 1.2; S.post.subc = '#5a9cc8';
        S.post.fl = max(0.8 * hit(t, KS, 0.14), 0.4 * hit(t, KL[0], 0.1), 0.4 * hit(t, KL[1], 0.1)); S.post.flc = '#e8f2ff'; S.post.sh = 4 * hit(t, KS, 0.7) + 1.6 * (hit(t, KL[0], 0.4) + hit(t, KL[1], 0.4)) + 1.2 * u; }],
      /* 3 Øyet, nært, under vann. */
      [KT[0] - 0.4, (S, u, a, t) => { const e = S.W('Head', S.A.eye), c = S.W('Head', S.A.eyeCam); K.cam(mix(c.x, e.x, 0.12 * u), c.y, mix(c.z, e.z, 0.12 * u), e.x, e.y, e.z, 30);
        S.post.fl = max(0.5 * hit(t, KT[0], 0.16), 0.75 * seg(t, KC - 0.16, KC)); S.post.flc = '#e6f6ff'; S.post.sh = 1.5 * hit(t, KT[0], 0.3) + 1.2 * hit(t, KT[1], 0.25) + 2.2 * hit(t, KT[2], 0.6); S.post.vig = 0.9; }],
      /* 4 Gjennombruddet, sett nedenfra: den kommer ut av veggen i et brøl og henger over oss. */
      [KC - 0.035, (S, u, a, t) => { const p = S.gr.root.position; K.cam(4.2 - u, 1.5, 27 + u * 1.5, p.x * 0.7, p.y + 2.2, p.z * 0.8, 54, -0.06); S.post.sh = 5 * hit(t, KC, 0.8) + 0.6 * S.rw + 3 * seg(t, KD - 0.3, KD); S.post.fl = max(t < KC ? 0.75 : hit(t, KC, 0.1), seg(t, KD - 0.12, KD)); S.post.flc = '#f2faff'; X.mouth(S, S.gr, KC, t, 1.2); }],
      /* 5 Under vann: stille og blått et slag. Den skyter forbi og ned. */
      [KD - 0.03, (S, u, a, t) => { K.cam(0, UW + 0.5, 12, mix(-2, 2.5, u), UW + mix(2, -1.5, u), 0, 52, 0.05); S.post.fl = max(1 - seg(t, KD, KD + 0.22), seg(t, KU - 0.14, KU)); S.post.flc = '#e6f6ff'; S.post.vig = 0.7; }],
      /* 6 Origin Pulse: vidt og lavt forfra. Den bryter flaten, samler lyskulene, og søylene skyter opp på rekke mot oss; den siste rett foran linsa. */
      [KU - 0.03, (S, u, a, t) => { const e = io(u), su = S.sea.material.uniforms; K.cam(mix(7, 5.6, e), 2.2 + 0.5 * K.seaH(su, 6, 31, t), mix(23, 31.5, ei(e)), mix(0, 1.6, e), mix(3.2, 4.8, e), 4, 48, -0.03);
        S.post.fl = max(1 - seg(t, KU, KU + 0.2), 0.3 * hit(t, KP, 0.12), seg(t, KW - 0.16, KW - 0.02)); S.post.flc = '#f2faff'; S.post.sh = 3 * hit(t, KU, 0.6) + 3 * hit(t, KP, 0.5) + pulseSh(t); }],
      /* 7 Det siste brølet i ett langt, lavt bilde: den trekker seg sammen og brøler mens navnet kommer opp, og kameraet glir sakte mens den venter på Continue. */
      [KW, (S, u, a, t) => { const k = io(seg(t, KW, KX)), w = 0.05 * sin(max(0, t - KX) * 0.21), su = S.sea.material.uniforms; K.cam(mix(4.6, 3.2, k) + sin(w) * 2, 2.3 + 0.4 * K.seaH(su, 4, 20, t), mix(23, 19.5, k), -0.6, mix(3.2, 4.2, k), 2.8, 50, -0.04);
        S.post.fl = max(1 - seg(t, KW, KW + 0.25), 0.3 * hit(t, KX, 0.15)); S.post.flc = '#f2faff'; S.post.sh = 4 * hit(t, KX, 1.2) + 0.7 * S.rw + 5 * hit(t, pulse(NB - 1).t, 0.8); X.mouth(S, S.gr, KX, t); }],
    ],
  });
  X.reg('c3:382', { spid: 382, skin: 'sea', back: backdrop, look, roar: t => t < KX ? KC : KX,
    cues: [[0.9, 'rain', 3.2], [KB[0], 'thud'], [KB[1], 'thud'], [KB[2], 'thud'], [KS, 'thunder', 1], [KS + 0.1, 'wave', KC - KS], [KL[0], 'thunder', 0.6], [KL[1], 'thunder', 0.7], [KT[0], 'thud'], [KT[2], 'thud'], [KC, 'cry'], [KC + 0.02, 'breach'], [KD, 'dive'], [KU, 'surface'],
      [KA, 'orbs', KP - KA], [KP, 'slam'], [KX, 'cry'], [KX + 0.05, 'thunder', 0.8]].concat(Array.from({ length: NB }, (_, i) => [pulse(i).t, 'spout', i / (NB - 1)])),
    fx(S, t, P) { rain(S, S.rain, S.wet); const o = S.cur || {}; plateOn(x => X.plate(x, t - (KX + 0.6), { name: o.name, lv: o.lv, cap: o.cap, skin: 'sea' })); } });

  /* ---------- Lydene som er Kyogres egne (signalene i cues; de felles står i C3SND i bui.js) ----------
     Pakken først (lydene fra spillene, lagt dypere eller kortere), og en innebygd reserve uten pakken. Hver gir mønsteret til vibrasjonen. */
  { const pk = (n, v, o) => typeof PACK !== 'undefined' && PACK.sfx(n, v, Object.assign({ keep: 1 }, o)), sy = typeof tone === 'function' && typeof noise === 'function' && typeof swellN === 'function';
    const T1 = (...a) => sy && tone(...a), N1 = (...a) => sy && noise(...a), SW = (...a) => sy && swell(...a), SN = (...a) => sy && swellN(...a);
    X.sfx.push('Thunder', 'Surf', 'Waterfall', 'Dive', 'Splash', 'Water Pulse', 'Water Spout', 'Hydro Cannon', 'Rain Dance');
    Object.assign(X.snd, {
      /* Regnet som kommer (d sekunder): et sus som vokser. */
      rain: d => { SN(0, d || 3, 0.05, 5200, 7600, 0.7); return 0; },
      /* Lynet (k = hvor nært): et skarpt smell og torden som ruller etter. */
      thunder: k => { k = k == null ? 1 : k; if (!pk('Thunder', 0.75 * k, { trim: 1, len: 2.2 })) { N1(0, 0.09, 0.4 * k, 6500, 1400); N1(0.05, 1.5, 0.22 * k, 420, 60); } T1(52, 0.04, 1.6, 0.14 * k, 'sine', 30); return [40, 30, 160]; },
      /* Havet reiser seg til en vegg (d sekunder): brenningen fra pakken lagt dypt, og en rumling som stiger. */
      wave: d => { d = d || 4.8; if (!pk('Surf', 0.5, { rate: 0.62, len: d })) SN(0, d, 0.2, 180, 900, 0.5); SW(38, 0, d, 0.1, 'sine', 62); SN(d * 0.4, d * 0.6, 0.1, 700, 2600); return [20, 60, 20, 60, 20, 60, 20, 60]; },
      /* Ut av bølgeveggen: fossen som sprenges, og et dypt drønn. */
      breach: () => { if (!pk('Waterfall', 0.9, { trim: 1, len: 1.6 })) N1(0, 1.1, 0.4, 5200, 500); pk('Hydro Cannon', 0.6, { trim: 1, rate: 0.8, len: 1.2 }); T1(70, 0, 1.2, 0.3, 'sine', 28); N1(0, 0.3, 0.2, 6800, 1800); return [120, 40, 260]; },
      /* Den slår ned over oss, og alt blir dempet under vann. */
      dive: () => { if (!pk('Dive', 0.9, { trim: 1, len: 1.5 })) { N1(0, 0.35, 0.4, 3600, 300); N1(0.2, 1, 0.14, 260, 120); } T1(60, 0, 0.9, 0.3, 'sine', 30); SW(110, 0.25, 0.95, 0.05, 'sine', 70); return [140, 60, 200]; },
      /* Den bryter flaten der den ligger i kampen. */
      surface: () => { if (!pk('Splash', 0.8, { trim: 1, len: 1.1 })) N1(0, 0.7, 0.3, 4800, 700); T1(84, 0, 0.6, 0.18, 'sine', 36); return [90, 50, 160]; },
      /* Lyskulene stiger opp av havet (d sekunder): et lyst, stigende sus (pakken: Water Pulse). */
      orbs: d => { d = d || 1.2; if (!pk('Water Pulse', 0.6, { trim: 1, len: d + 0.2 })) SN(0, d, 0.14, 1200, 5200); SW(330, 0, d, 0.045, 'triangle', 880); SW(55, 0, d, 0.09, 'sine', 80); return [20, 50, 20, 40, 20, 30, 20]; },
      /* Én vannsøyle (k 0–1 ut i rekka: de siste er nærmest og størst): et vått smell (pakken: Water Spout, dypere og sterkere for hver) og et dunk under. Den siste er det store. */
      spout: k => { k = max(0, min(1, k || 0)); const g = Math.pow(10, k * 6 / 20);
        if (!pk('Water Spout', 0.3 * g, { rate: 1.15 - 0.3 * k, off: 0.25, len: 0.22 + 0.1 * k, fade: 0.1 })) { N1(0, 0.14 + 0.06 * k, 0.3 * g, 5200 - 1800 * k, 700); }
        T1(120 - 44 * k, 0, 0.2 + 0.1 * k, 0.07 + 0.13 * k, 'sine', 40); N1(0, 0.2, 0.1 * g, 900, 160);
        if (k >= 1) { if (!pk('Hydro Cannon', 0.9, { trim: 1, len: 1.5 })) N1(0, 1, 0.4, 4200, 300); T1(70, 0, 1.5, 0.36, 'sine', 25); SN(0, 1.3, 0.26, 800, 60, 0.02); }
        return k >= 1 ? [120, 40, 300] : [30 + Math.round(40 * k)]; },
      /* Primordial Sea (forvandlingen): havet og himmelen bryter løs samtidig. */
      sea: () => { if (!pk('Surf', 0.95, { rate: 0.75, len: 2.6 })) SN(0, 2.4, 0.3, 300, 2400, 0.3); pk('Thunder', 0.8, { trim: 1, at: 0.12, len: 2.4 }); T1(46, 0, 2.2, 0.3, 'sine', 26); N1(0, 0.12, 0.3, 6500, 1500); return [140, 40, 140, 40, 300]; },
    }); }

  /* ---------- Primal Reversion (raseriet ved halv HP), som i Alpha Sapphire (fanart/kyogre/as_primal_kyogre) ----------
     Samme form som hos Groudon, i blått: lyset samler seg om den og stivner til en blå krystall, krystallen mørkner, α-tegnet tennes på den og den slår sprekker, og så
     knuses den: Primal Kyogre ligger der med lysende tegn. Et langt nærbilde fra finnen med de lysende ovalene og inn over kroppen til ansiktet, og så brølet i et vidt
     bilde. STEDETS STØRSTE ØYEBLIKK hører hjemme her (som utbruddet hos Groudon): Primordial Sea. I brølet revner himmelen i lyn, regnet står ned som en vegg,
     havet reiser seg bak den, og skypumper skrur seg opp av sjøen. Den følger ikke slagene i låta, venter ikke på Continue, og ender i et hvitt blink tilbake til kampen. */
  const PT = { G0: 1.0, G1: 1.75, D0: 3.0, D1: 3.8, O: 4.05, K: 4.9, S: 6.0, C: 6.55, Q: 8.2, R: 9.3, P: 9.9, F: 13.05, E: 13.5 };
  const PHOME = [0, 2.3, 2.8], GEM = [0, 4.4, 2.9], GEMR = 8;
  const PBOLTS = [[PT.O, 0.5, PI * 1.12, 0.4], [PT.S, 1, PI * 0.94, 0.6], [PT.R, 1, PI * 1.03, 0.8], [PT.R + 0.7, 0.9, PI * 0.86, 0.5], [PT.R + 1.5, 0.8, PI * 1.14, 0.5], [PT.R + 2.3, 0.9, PI * 0.98, 0.5], [PT.R + 3.1, 0.7, PI * 1.08, 0.5]];
  /* Tegnene til Primal: de gule flatene lyser selv (BodyBInc, BodyBInc2), og masken over kroppen legger lys oppå. v = styrken (rundt 1 = fullt), k = hvor hvitt. */
  const pmarks = (p, v, k) => { for (const n of ['BodyBInc', 'BodyBInc2']) if (p.mats[n]) { const w = 0.45 + 0.42 * min(v, 1.9); p.mats[n].uniforms.uMul.value.setRGB(w, w, w * (0.85 + 0.4 * (k || 0))); } marks(p, 0.42 * v, k, '#6ad0ff', '#f0fbff'); };
  /* Skypumpene: søyler av vann og skodde som skrur seg opp fra sjøen til skyene langt ute. Skjult til forvandlingen (spoutAct: k = hvor langt de er kommet). */
  const spouts = (S, T) => { S.spouts = [[-78, -190, 8, 150, 1], [44, -235, 11, 175, 2], [128, -165, 7, 140, 3]].map(([x, z, r, h, sd]) => { const pr = [[2.8, 0], [1.2, 0.04], [0.62, 0.2], [0.5, 0.5], [0.8, 0.78], [2.2, 0.94], [3.6, 1]];
      const m = new T.Mesh(new T.LatheGeometry(pr.map(q => new T.Vector2(q[0] * r, q[1] * h)), 14), waterMat(T, { sx: 4, top: 2, spin: 0.55, up: 1.3, deep: '#152434', shal: '#7892a8', sway: [7, 5, 0.6, sd * 2.1] })); m.position.set(x, -1, z); m.frustumCulled = false; m.visible = false; S.scene.add(m); return m; }); };
  const spoutAct = (S, k) => S.spouts.forEach((m, i) => { const q = c01(k * 1.3 - i * 0.15); m.visible = q > 0.01; m.scale.y = max(0.01, eo(q)); });
  G3D.def('c3:382p', {
    len: PT.E, R: PT.R, at: 0, models: ['kyogre', 'kyogre_primal'], env: ENV, edge: 'sea',
    make(K, T) {
      const S = ocean(T), g = S.gr = fig(), p = S.pg = pfig(); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.spc = '#e4f2ff'; spouts(S, T);
      S.gem = K.gem({ a: '#1a58c8', b: '#a6e0ff', d: '#060a18', crk: '#c8f2ff' }); S.gem.position.set(GEM[0], GEM[1], GEM[2]); S.scene.add(S.gem);
      /* Lyset som samler seg: blå gnister som strømmer inn mot den fra alle kanter, og en glød rundt den. */
      S.motes = K.pts(110, i => { const a = rnd(i, 61) * TAU, el = (rnd(i, 62) - 0.2) * 1.5, R = 20 + rnd(i, 63) * 18, l = 0.6 + rnd(i, 64) * 0.5, d = [cos(a) * cos(el), sin(el), sin(a) * cos(el)]; return { p: [d[0] * R, d[1] * R, d[2] * R], v: [-d[0] * R / l, -d[1] * R / l, -d[2] * R / l], b: rnd(i, 65) * 1.1, l, z: 1.1 + rnd(i, 66) * 1.7 }; }, { loop: 1, add: 1, px: 60, sz0: 1.3, sz1: 0.45, c: ['#e8f8ff', '#5ab8ff', '#1c5cd8'], fade: 0.92 }); S.motes.position.set(GEM[0], GEM[1], GEM[2]); S.scene.add(S.motes);
      S.aura = K.light(1, '#4aa8ff'); S.scene.add(S.aura); S.flash = K.light(1, '#e6f6ff', { depth: false }); S.flash.renderOrder = 7; S.scene.add(S.flash);
      /* Krystallen som knuses: mørke skår med blå innside, slynget rett ut fra midten, og et blått støv. */
      const sh = (n, c, em, sd) => K.shards(n, i => { const a = rnd(i, sd) * TAU, el = (rnd(i, sd + 1) - 0.3) * 2.2, d = [cos(a) * cos(el), sin(el), sin(a) * cos(el)], v = 10 + rnd(i, sd + 2) * 20, big = i % 6 === 0;
        return { p: [GEM[0] + d[0] * GEMR * 0.85, GEM[1] + d[1] * GEMR * 0.85, GEM[2] + d[2] * GEMR * 0.85], v: [d[0] * v, d[1] * v + 5, d[2] * v], r: [(rnd(i, sd + 3) - 0.5) * 12, (rnd(i, sd + 4) - 0.5) * 12, (rnd(i, sd + 5) - 0.5) * 12], s: rnd(i, sd + 6), b: rnd(i, sd + 7) * 0.06, l: 2.8, z: big ? 0.9 + rnd(i, sd + 8) * 0.7 : 0.28 + rnd(i, sd + 9) * 0.5 }; }, { c, em, grey: 0, sy: 0.5, id: 202 });
      S.sh1 = sh(54, '#101c4a', 0.25, 71); S.sh2 = sh(34, '#7ad0ff', 0.75, 91); S.scene.add(S.sh1); S.scene.add(S.sh2);
      S.puff = K.pts(48, i => { const a = rnd(i, 21) * TAU, el = (rnd(i, 22) - 0.3) * 2, v = 3 + rnd(i, 23) * 7; return { p: [GEM[0] + cos(a) * cos(el) * 6, GEM[1] + sin(el) * 6, GEM[2] + sin(a) * cos(el) * 6], v: [cos(a) * cos(el) * v, sin(el) * v + 1, sin(a) * cos(el) * v], b: rnd(i, 24) * 0.2, l: 1.4 + rnd(i, 25) * 1, z: 4 + rnd(i, 26) * 5 }; }, { t0: -1e5, shade: 1, drag: 1.5, sz0: 0.4, sz1: 2, px: 60, c: ['#e0f4ff', '#6aa4dc', '#1c2c5a'], a: 0.5, fade: 0.25 }); S.scene.add(S.puff);
      return S;
    },
    act(S, t, o) {
      const g = S.gr, p = S.pg, su = S.sea.material.uniforms, pre = t < PT.S, gm = S.gem.material.uniforms, R1 = t >= PT.R; S.cur = o;
      const fl = bolts(S, t, PBOLTS), big = R1 ? eo(seg(t, PT.R, PT.R + 1.3)) : 0; weather(S, 1.15 + 0.1 * seg(t, PT.O, PT.S) + 0.55 * big, fl, { swell: 1.05 + 0.55 * big, foam: 0.62 + 0.3 * big });   /* roligere sjø enn i introen til brølet: kameraene står lavt og nært */
      for (const r of su.uRing.value) r.w = 0; const ring = (i, x, z, t0, v, d, a) => su.uRing.value[i].set(x, z, 1.5 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0), sh0 = 0.35 * K.seaH(su, HOME[0], HOME[2], t);
      g.root.visible = t < PT.G1 - 0.03; p.root.visible = !pre;
      /* 1 Kyogre (vanlig form): rasende, sammentrukket og skjelvende, mens det blå lyset samler seg om den og den blir til lys. */
      const str = io(seg(t, 0, 0.9)); put(g, HOME[0] + 0.04 * sin(t * 61) * str, HOME[1] + sh0, HOME[2], 0, UP0, 0);
      g.add(STAND, 1); g.add(DUCK, 0.8 * str); g.add({ Jaw: [0, -0.3, 0] }, str); g.rot('Jaw', 0, 0.03 * sin(t * 48) * str, 0); g.eye(0, EYE.nar, 0.4); marks(g, 0.6 + 0.8 * str, 0.4 * str);
      g.set('uFlC', '#c4e6ff'); g.set('uFlK', 0.92 * io(seg(t, 0.3, PT.G0 + 0.3)) + 0.08 * seg(t, PT.G0, PT.G1));
      /* 2 Krystallen: står der ut av lyset (G1), dreier sakte, mørkner (D0–D1) og slår sprekker av lys fra K til den knuses på S. */
      const gk = seg(t, PT.G1 - 0.03, PT.G1 + 0.3), spin = 0.22 * (t - PT.G1); S.gem.visible = t >= PT.G1 - 0.03 && pre; S.gem.scale.setScalar(GEMR * (pre ? mix(0.8, 1, back(gk, 1.6)) + 0.012 * sin(t * 40) * seg(t, PT.K, PT.S) : 1)); S.gem.rotation.set(0.08 * sin(spin * 1.3), spin, 0);
      gm.uAl.value = 1; gm.uDark.value = io(seg(t, PT.D0, PT.D1)) * 0.96; gm.uCrk.value = t >= PT.K ? 1 : 0; gm.uCrkR.value = 2.3 * eo(seg(t, PT.K, PT.S - 0.1)); lerpC(gm.uCrkC, '#7fd8ff', '#f2fcff', seg(t, PT.S - 0.5, PT.S));
      S.motes.visible = t < PT.G1 + 0.2; S.motes.material.uniforms.uA.value = seg(t, 0.1, 0.5) * (1 - seg(t, PT.G1 - 0.2, PT.G1 + 0.2));
      K.face(S.aura); S.aura.position.set(GEM[0], GEM[1], GEM[2] - 1); S.aura.scale.setScalar(17 + 10 * seg(t, 0, PT.G1) + 5 * ei(seg(t, PT.G0, PT.G1))); S.aura.material.uniforms.uA.value = t < PT.D1 ? (0.55 * io(seg(t, 0.2, PT.G0 + 0.4)) + 0.4 * ei(seg(t, PT.G0, PT.G1)) * (t < PT.G1 ? 1 : 0)) * (1 - 0.85 * seg(t, PT.D0, PT.D1)) + 0.5 * hit(t, PT.G1, 0.4) : 0; S.aura.visible = t < PT.D1;
      S.om = t >= PT.O && pre ? min(1, (t - PT.O) / 0.25) * (0.82 + 0.18 * sin((t - PT.O) * (5 + 9 * seg(t, PT.K, PT.S)))) : 0;
      /* 3 Krystallen knuses (S): skår og støv, et lysglimt, og Primal Kyogre ligger der. Den løfter seg av sjøen, og så lader den opp (Q til R): synker sammen, skjelver mer
         og mer, tegnene blusser i takt og sjøen rundt den koker, før brølet. */
      S.sh1.at(t, PT.S, { g: 16, floor: 0 }); S.sh2.at(t, PT.S, { g: 16, floor: 0 }); S.puff.material.uniforms.uT0.value = PT.S;
      K.face(S.flash); S.flash.position.set(GEM[0], GEM[1], GEM[2]); S.flash.scale.setScalar(pre ? 12 + 18 * seg(t, PT.S - 0.35, PT.S) : 30 + 76 * eo(seg(t, PT.S, PT.S + 0.5))); S.flash.material.uniforms.uA.value = pre ? 0.8 * ei(seg(t, PT.S - 0.4, PT.S)) : 0.7 * hit(t, PT.S, 0.28); S.flash.visible = t > PT.S - 0.4 && t < PT.S + 0.3;
      const rise = io(seg(t, PT.S + 0.2, PT.Q - 0.3)), chg = t < PT.R ? seg(t, PT.Q, PT.R) : 0, rw = t < PT.R ? 0 : back(seg(t, PT.R, PT.R + 0.3), 2.6) * (1 - 0.35 * io(seg(t, PT.R + 2.2, PT.E))), chp = (t - PT.Q) * (9 + 7 * chg);
      put(p, PHOME[0] + 0.05 * sin(t * 53) * chg * chg, PHOME[1] - 1.7 * (1 - rise) + 0.6 * sq(t, PT.S, 11, 4) - 0.9 * io(chg) + 2 * rw + sh0, PHOME[2], 0, UP0 + 0.08 * rise - 0.12 * chg + 0.12 * rw, 0.02 * sin(t * 1.3));
      p.add(STAND, 1 - 0.6 * rw); swim(p, t * 2.3, 0.4 * (1 - rw) * (1 - chg)); p.add(DUCK, (1 - rise) * 0.6 + kf(t, [[PT.Q, 0], [PT.R - 0.5, 0.75, io], [PT.R - 0.16, 0.98, io], [PT.R - 0.03, 1.25, ei], [PT.R + 0.1, 0, eo]]));
      p.add(ROAR, rw); p.rot('Jaw', 0, 0.045 * sin(t * 57) * rw, 0); p.rot('Head', 0, 0, 0.02 * sin(t * 43) * rw); S.rw = rw; S.chg = chg; S.mouth = null; p.eye(0, t > PT.R - 0.6 ? EYE.nar : 0, 0.5);
      pmarks(p, pre ? 0 : 0.9 + 0.2 * sin(t * 4.2) + 0.5 * rw + 0.6 * hit(t, PT.S, 0.8) + chg * (0.35 + 0.3 * sin(chp)), c01(0.3 * rw + hit(t, PT.S, 0.7) + hit(t, PT.R, 0.6)));
      p.set('uFlC', '#eaf8ff'); p.set('uFlK', pre ? 0 : 0.9 * (1 - eo(seg(t, PT.S, PT.S + 0.4))));
      /* Stedet: krystallen farger lyset blått; i brølet bryter Primordial Sea løs. */
      if (pre) { const U = K.U(), q = c01(seg(t, 0.2, PT.G1) - 0.5 * seg(t, PT.D0, PT.D1)); U.uKeyC.value.lerp(K.u3('#bfe0ff'), 0.5 * q); }
      ring(0, GEM[0], GEM[2], t < PT.O ? PT.G1 : t < PT.S ? PT.O : t < PT.Q + 0.25 ? PT.S : PT.Q + 0.25, t < PT.S ? 12 : t < PT.Q + 0.25 ? 26 : 9, t < PT.Q + 0.25 ? 1.6 : 1.1, 1); ring(1, PHOME[0], PHOME[2], PT.R, 30, 1.7, 1); ring(2, PHOME[0], PHOME[2], PT.R + 0.7, 26, 1.6, 0.8);
      su.uWade.value.set(PHOME[0], PHOME[2] + 1, pre ? 8 : 10, 0.22 + 0.4 * hit(t, PT.S, 1.2) + 0.25 * chg);
      S.fx(S.spl[0], PT.S, GEM[0], 0, GEM[2] + 2); S.fx(S.spl[1], PT.R, -7, 0, PHOME[2] + 5); S.fx(S.spl[2], PT.R + 0.05, 7, 0, PHOME[2] + 5); S.fx(S.spl[3], PT.R + 0.1, 0, 0, PHOME[2] + 8);
      S.ring.position.set(GEM[0], 0.5, GEM[2]); const rt0 = R1 ? PT.R : PT.S, ra = t >= PT.S ? hit(t, rt0, 1) : 0; S.ring.scale.setScalar(3 + (t - rt0) * 46); S.ring.material.uniforms.uA.value = 0.8 * ra; S.ring.visible = ra > 0;
      /* Primordial Sea: havet reiser seg bak den, og skypumpene skrur seg opp. */
      S.wall.visible = R1; S.wall.scale.y = max(0.01, 0.95 * eo(seg(t, PT.R, PT.R + 1.8))); S.wall.position.z = WALL.z - 26 + 8 * seg(t, PT.R, PT.E); spoutAct(S, R1 ? seg(t, PT.R + 0.15, PT.R + 2) : 0);
      S.rain = 1 + 0.5 * big; S.wet = 0.9;
    },
    shots: [
      /* 1 Lyset samler seg om den (lavt, forfra). */
      [0, (S, u, a, t) => { const e = io(u); K.cam(mix(5, 4, e), 3, mix(25, 22, e), -0.4, 3.2, 2.6, 46, -0.03); S.post.fl = max(1 - seg(t, 0, 0.35), 0.85 * seg(t, PT.G1 - 0.14, PT.G1)); S.post.flc = t < 1 ? '#ffffff' : '#d6ecff'; S.post.sh = 1.2 * seg(t, 0, 0.6); }],
      /* 2 Krystallen: kameraet glir sakte inn fra siden. Den mørkner, α-tegnet tennes, sprekkene brer seg, og den knuses. */
      [PT.G1 - 0.03, (S, u, a, t) => { const e = io(seg(t, PT.G1, PT.S)); K.cam(mix(-6.5, -5, e), mix(3, 3.6, e), mix(28, 23, e), mix(-1.6, -0.6, e), mix(5.4, 5, e), mix(3.8, 0, e), 46, 0.03);
        S.post.fl = max(t < PT.G1 ? 0.85 : 0.85 * hit(t, PT.G1, 0.3), 0.5 * hit(t, PT.O, 0.22), t < PT.S ? ei(seg(t, PT.S - 0.2, PT.S)) * 0.8 : 0.9 * hit(t, PT.S, 0.1)); S.post.flc = t < PT.D0 ? '#d6ecff' : '#eaf6ff';
        S.post.sh = 1.5 * hit(t, PT.O, 0.5) + 2.6 * seg(t, PT.K, PT.S) * (t < PT.S ? 1 : 0) + 6 * hit(t, PT.S, 0.6); }],
      /* 3 Primal Kyogre i ett langt nærbilde: fra finnen med de lysende ovalene og inn over kroppen til ansiktet, mens tegnene gløder og den løfter seg av sjøen. */
      [PT.C, (S, u, a, t) => { const e = io(u); K.cam(mix(15, 6.5, e), mix(3.6, 5, e), mix(12, 19.5, e), mix(9.5, 0.6, e), mix(2.4, 3.6, e), mix(4.5, 8.2, e), mix(40, 42, e), -0.05); S.post.sh = 0.8; S.post.vig = 0.7; }],
      /* 4 Oppladningen og brølet, vidt og lavt: den synker sammen og skjelver, tegnene blusser, og så brølet mens Primordial Sea bryter løs bak den. Navnet kommer opp, og bildet går i hvitt. */
      [PT.Q + 0.05, (S, u, a, t) => { const e = eo(u), w = 0.04 * sin(t * 0.5); K.cam(mix(8.4, 7.4, e) + w * 3, 4, mix(25.5, 23.5, e), 0.4, mix(5, 5.8, e), 0.2, 54, -0.05);
        S.post.fl = max(0.5 * hit(t, PT.R, 0.16), seg(t, PT.F, PT.E - 0.05)); S.post.flc = '#f2faff'; S.post.sh = 7 * hit(t, PT.R, 1.2) + 5 * hit(t, PT.R + 0.7, 1) + 2.2 * hit(t, PT.R + 0.3, 2.4) + 0.8 * S.rw + 1.6 * S.chg * S.chg; X.mouth(S, S.pg, PT.R, t, 2.6); }],
    ],
  });
  /* α-tegnet tegnes i figurens oppløsning på krystallen (midt på den, sett fra kameraet), og stråler ut fra det. Ingen virvel ut (swirl: 0). */
  const gemAt = () => { const c = K.proj(GEM[0], GEM[1], GEM[2]), e = K.proj(GEM[0], GEM[1] + GEMR, GEM[2]); return { x: c.x / 2, y: c.y / 2, r: abs(c.y - e.y) / 2, z: c.z }; };
  X.reg('c3:382p', { spid: 382, swirl: 0, skin: 'sea', back: backdrop, look, roar: () => PT.R,
    cues: [[0, 'gather', PT.G1], [PT.G1, 'gem'], [PT.D0, 'dark', PT.D1 - PT.D0], [PT.O, 'sign'], [PT.K, 'crack', PT.S - PT.K], [PT.S, 'shatter'], [PT.S + 0.1, 'surface'], [PT.Q, 'charge', PT.R - PT.Q], [PT.R, 'cry'], [PT.R + 0.05, 'sea'], [PT.R + 0.7, 'thunder', 0.9], [PT.R + 1.5, 'thunder', 0.7], [PT.R + 2.3, 'thunder', 0.8]],
    fx(S, t, P) { const om = S.shot === 1 ? S.om : 0, q = om > 0 ? gemAt() : null, on = q && q.z < 1;
      if (on) { P.rays = { x: q.x * 2, y: q.y * 2, a: 1.5 * om * (0.5 + 0.5 * seg(t, PT.O, PT.S)), len: 0.7 }; P.bloom += 0.2 * om; } if (t >= PT.S && t < PT.S + 0.5) P.bloom += 0.25 * hit(t, PT.S, 0.5);
      rain(S, S.rain, S.wet); const o = S.cur || {};
      plateOn(x => { if (on && (t - PT.O > 0.22 || floor(t * 30) % 2)) X.alpha(x, Math.round(q.x), Math.round(q.y + q.r * 0.04), q.r * 0.6 * (0.94 + 0.06 * om), om); X.plate(x, t - PT.P, { name: o.name, cap: 'Primal Reversion', sign: X.alpha, skin: 'sea' }); }); } });

  /* ---------- Arenaen i kampen: samme sted som cutscenene ----------
     Hele banen er havflaten. Kyogre ligger i sjøen der den lå i introen, og din Pokémon står på et skjær nær kameraet. Uværet går hele kampen: dønninger, regn, lyn
     i ny og ne, skodde. Raseriet gjør sjøen grovere og lynet tettere; ETTER forvandlingen står stedet slik cutscenen sluttet (Primordial Sea): regnet som en vegg,
     skypumpene ute i havet, og lyn hele tiden. Når stedet slår til, kaster sjøen en søyle av sprut opp ved skjæret ditt. Rammeverket er G3C.arena i raid3c.js. */
  const AFOE = [377, 166], AME = [190, 370], FME = [132, 452], FSC = 0.84, PSC = 0.6, PSY = 2.1;   /* vannlinja på Gen 5-bildet uten 3D-figuren; i kampen er figuren litt mindre enn i filmene (FSC: luft rundt finnene), og Primal, som er 1,66 ganger så bred, krympes så formene er like store (PSC) */
  /* Lynet i kampen: av og til (oftere i raseriet, hele tiden etter forvandlingen). Gir styrken nå og setter hvor. */
  const kbolt = (S, t, k) => { const per = mix(5.6, 2.2, c01(k)), q = floor(t / per), t0 = q * per + rnd(q, 31) * (per - 0.7), d = t - t0; if (rnd(q, 32) < 0.3 * (1 - c01(k)) || d < 0 || d > 0.5) return 0; S.fla = PI * (0.78 + 0.5 * rnd(q, 33)); S.fls = q % 97; return max(0, (1 - d / 0.5) * (0.55 + 0.45 * sin(d * 58))); };
  X.arena(382, {
    home: [HOME[0], 0, HOME[2]], foe: AFOE, me: AME, env: ENV, edge: 'sea',
    /* Kameraet står høyere enn hos Groudon (dønningene går forbi det), ellers samme oppstilling: med figuren i 3D tett på og lavt, så den fyller høyre halvdel. */
    cam: f => f ? { fv: 52, cp: [-6.2, 3.1, 19.9], kq: 18.2 / 394, tg: [HOME[0] - 5, 3, HOME[2]] } : { fv: 50, cp: [-8.2, 3.4, 24.7], kq: 23.4 / 412, tg: [HOME[0] - 5, 3, HOME[2]] },
    place(K, T, f) { const S = ocean(T); spouts(S, T); return S; },
    dress(S, K, T, f, m) {
      /* Skjæret din Pokémon står på: mørk, våt basalt med flat topp som stikker så vidt opp av sjøen (toppen 1,5 over, og sjøen går roligere i kampen enn i filmene, så dønningene slår rundt det og ikke over føttene). */
      const am = f ? FME : AME, top = 1.5, q = K.ray(am[0], am[1], top), cm = K.rockMat({ a: '#141b22', b: '#34424e', str: 0.2, top: 0.6, sm: 0.12, lv: 0, hot: 0.01, rough: 0.28, ck: 0, sc: 3.2, tint: [0.08, 0.1, 0.13] });   /* som plattformen hos Groudon (runde 16): fasetter, svakt korn, ingen sprekker */
      S.rock = K.boulder(f ? 2.3 : 2.1, 77, { flat: 1, sx: 1.2, sy: 0.7, sz: 1, cap: 0.42, j: 0.3, d: 2, mat: cm }); S.rock.position.set(q.x + 0.1, top - 0.42, q.z - (f ? 0.9 : 0.45)); S.rock.rotation.y = 0.5; S.scene.add(S.rock); S.mq = [q.x, q.z];
      for (const [dx, dz, r, sd] of [[4, -2.4, 1.3, 81], [-3.4, -3, 0.9, 83], [2.2, 2.2, 0.8, 85]]) { const b = K.boulder(r, sd, { flat: 1, sy: 0.6, cap: 0.4, j: 0.26, mat: cm }); b.position.set(q.x + dx, 0.25, q.z + dz); S.scene.add(b); }
      /* Søylen av sprut når stedet slår til, ved skjæret. */
      S.geys = K.pts(60, i => { const a = rnd(i, 13) * TAU, w = rnd(i, 14); return { p: [cos(a) * 0.8 * w, 0.1, sin(a) * 0.8 * w], v: [cos(a) * (0.4 + 2.4 * w), 13 + 11 * rnd(i, 15), sin(a) * (0.4 + 2.4 * w)], b: rnd(i, 17) * 0.35, l: 1.3 + rnd(i, 18) * 0.5, z: 2 + rnd(i, 19) * 3 }; }, { t0: -1e5, shade: 1, g: 24, px: 60, sz0: 0.6, sz1: 1.6, c: ['#ffffff', '#d4ecf8', '#86b4d0'], floor: -0.5, a: 0.95, fade: 0.55 }); S.geys.position.set(q.x + 4, 0, q.z - 2.4); S.scene.add(S.geys);
    },
    state(S, t, o, st) {
      const su = S.sea.material.uniforms, { p2, eT, fT, rT, pT, pr, pk } = st, fl = max(kbolt(S, t, 0.2 + 0.5 * p2 + 0.8 * pk), hit(rT, 0.5, 0.5));
      weather(S, 1 + 0.2 * p2 + 0.5 * pk, fl, { swell: 0.62 + 0.14 * p2 + 0.2 * pk, foam: 0.8 + 0.2 * pk });
      const ring = (i, x, z, age, v, d, a) => su.uRing.value[i].set(x, z, 1.5 + age * v, age >= 0 && age < d ? a * (1 - age / d) : 0);
      ring(0, HOME[0], HOME[2], eT, 20, 1.6, 0.9); ring(1, S.mq[0] + 4, S.mq[1] - 2.4, fT - 0.38, 14, 1.2, 1); ring(2, HOME[0], HOME[2], rT - 0.5, 26, 1.8, 1); const h = o.hit; ring(3, h ? h[0] : 0, h ? h[1] : 0, h ? h[2] : -1, 12, 0.9, 0.8);
      su.uWade.value.set(HOME[0], HOME[2] + 1, 8.5, 0.34 + 0.16 * p2 + 0.4 * hit(rT, 0.5, 1.5));
      for (const q of S.spl) q.material.uniforms.uT0.value = -1e5; S.ring.visible = false; S.wall.visible = false;
      S.geys.material.uniforms.uT0.value = fT < 3 ? t - fT + 0.38 : -1e5;
      spoutAct(S, pk); S.pk = pk; S.rain = 0.8 + 0.2 * p2 + 0.5 * pk; S.rw = 0;
    },
    back: (S, t) => backdrop(S, t),
    scene(A, S, sn, q) {
      const P = q.P, p2 = A.p2, fl = S.fl || 0, pk = S.pk || 0, bl = C.blend, glw = 0.16 + 0.5 * p2;
      /* Lyset på figurene (som arenaen fra steg 2): kjølig og dempet som uværet, himmelen svakt ovenfra, hardt kantlys i lynet, og blått lys nedenfra fra sjøen. */
      C.lightSet({ amb: bl('#8499a8', '#c4d6e2', fl * 0.8), sat: 0.84, lift: bl('#0c1a24', '#1c3442', fl),
        lights: [{ col: '#cfe2f0', a: 0.16 + 0.55 * fl, h: 0.55, top: 1 }, { col: '#2aa8e0', a: min(0.7, 0.18 + 0.5 * glw), h: 0.6 }], rim: [{ col: '#d8eafa', dx: 1, dy: 1, a: 0.3 + 0.65 * fl }],
        glow: { mask: 'red', col: '#ff6a4a', a: (0.3 + 0.6 * p2 + 0.5 * hit(A.since('rage'), 0.5, 2.5)) * (0.75 + 0.25 * sin(A.t * 3.1)) },
        me: { amb: bl('#7c8f9d', '#c0d2de', fl * 0.8), lights: [{ col: '#cfe2f0', a: 0.2 + 0.55 * fl, h: 0.5, top: 1 }], rim: [{ col: '#d8eafa', dx: 0, dy: 1, a: 0.35 + 0.6 * fl }] } });
      if (C.cur.sps.me) C.monShadow(A.me[0], A.me[1] - 3, 1.6 * A.mk, { id: 'me', a: 0.4, len: 0.08, skew: -0.4, ft: A.ftm, col: '#02070b' }); C.contact(A.me[0], A.me[1] - 4, 58 * A.mk, { a: 0.85, col: '#02070b', sy: 0.2 });
      rain(S, S.rain * 0.85, 0.5 + 0.3 * pk); A.drops = null;
      P.bloom = 0.28 + 0.22 * fl; P.bloomT = 0.72; P.grain = 0.035; P.vig = 0.46 + 0.1 * p2; P.vigc = '#01060b'; P.grade = { tint: [0.96, 1, 1.04], con: 1.08, sat: 1.08, exp: 1.1 + 0.1 * fl };
      if (q.fT < 1.5) P.sh = (P.sh || 0) + hit(q.fT, 0.4, 0.5) * 6;
    },
    /* Mellom figurene (uten 3D-figuren): sjøen legges over den nederste delen av Gen 5-bildet, under en bølget vannlinje med skum. */
    mid(S, mid0) { const t = S.t, x0 = S.foe[0] - 130, x1 = S.foe[0] + 130, y = AFOE[1] + 1, line = [];
      for (let x = x0; x <= x1; x += 6) line.push([x, y + 2.2 * sin(x * 0.07 + t * 1.9) + 1.3 * sin(x * 0.19 - t * 2.7)]);
      if (S.back) C.seaOver(S.back, line, S.foe[1] + 60);
      for (let i = 0; i < 18; i++) { const u = (i + 0.5) / 18 - 0.5, fq = 0.5 + 0.5 * sin(t * (2 + rnd(i, 5) * 3) + i * 2.1); C.blob(S.foe[0] + u * 150 * S.fk + sin(t * 2 + i) * 2, y + 1, (5 + rnd(i, 6) * 6) * (0.7 + 0.3 * fq), '#e4f2f8', 0.3 + 0.3 * fq, 0, 0.5); } },
    fig: { models: ['kyogre', 'kyogre_primal'], at: [362, 236], me: FME,
      make(S, K, T) { const g = S.gr = fig({ mip: 1 }), p = S.pg = pfig({ mip: 1 }); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.forms = [g, p]; g.root.scale.setScalar(FSC); p.root.scale.setScalar(PSC); g.root.rotation.x = -UP0; p.root.rotation.x = -UP0; },
      form: (S, pr) => pr ? { f: S.pg, y: PSY, stand: [PSTAND, 1], duck: DUCK, roar: ROAR, rk: 0.45 } : { f: S.gr, y: HOME[1], stand: [STAND, 1], duck: DUCK, roar: ROAR, rk: 0.5 },
      idle(f, t) { swim(f, t * 2.4, f.model === 'kyogre_primal' ? 0.2 : 0.4); f.add({ Neck: [0, 0.03 * sin(t * 0.9 + 1), 0.05 * sin(t * 0.55)], Head: [0, 0.02 * sin(t * 1.3), 0.03 * sin(t * 0.55 + 0.6)], Jaw: [0, -0.05 - 0.04 * sin(t * 2.4), 0] }, 1); },
      glow(S, f, t, st, pr) { if (pr) pmarks(f, 0.95 + 0.2 * sin(t * 4.2), 0); else marks(f, 0.3 + 0.25 * st.p2 + 0.1 * sin(t * 3.1), 0); },
      sink: 7, ink2: S => 0.9 },
  });
})();
