'use strict';
/* Fokusdex – Kyogre (382) i 3D: stormhavet over Seafloor Cavern. Jazz 19.11: «kraken-vibe»: et enormt undervannsmonster, store bølger rundt i arenaen, lyn og storm
   i bakgrunnen, vann som spruter med bølger mot klippene, og enda sterkere storm som Primal. Låta er «All-Devouring Narwhal» (pakken), og den styrer alt:
   introen går på åpningen av låta, Primal-forvandlingen går på oppbyggingen og dropet ved 3:43 (kuttet, slaget, stillheten og phase 2 som smeller inn), og
   arenaen slår til med lyn på dubstep-dropet i phase 2 (4:26) og på smellet hver gang sløyfa begynner på nytt (kyStorm i bui.js styrer låta og raseriet).
   Lastes først når et raid med Kyogre viser seg (G3C.load). Verktøykassa står i raid3c.js, motoren og stilen i raid3d.js, reglene i work/RAIDS3D.md.
   Fila gir 'c3:382' (introen), 'c3:382p' (Primal Reversion på låta), 'c3:382a' og 'c3:382b' (arenaen uten og med 3D-figuren).
   Referansene (Jazz 19.11, fanart/kyogre/): stormhimmel med lyn over havet, en hyllesky, malte bølger med lyn, hai og orca som breacher, lys fra dypet, en enorm
   skygge under en båt, og videoene: knølhvalen som hopper (Our Planet), orcaen som er i lufta i 1,6 s, og Subnautica (lysende kropp som stiger ut av mørket). */
(() => {
  const K = G3D.K, C = CINE.kit, X = G3C, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, hit, rnd } = K, kf = C.kf, { lerpC, sq } = X;
  /* Låtas kart (manifestet, tl; bui.js leser det samme). Tidene er sekunder i fila. */
  const TL = { pre: 195.7, cut: 223.72, stab: 224.55, gap: 225.42, slam: 226.15, riser: 264.2, drop: 266.1, b0: 226.15, pulse: 0.8, end: 293.32, hole: [280.54, 281.06] };
  /* Hvor i låta vi er (kampen): låta som spiller, ellers filmverkstedets klokke (G3D.mus), ellers −1. */
  const musNow = t => { if (typeof G3D.mus === 'function') return G3D.mus(t); try { return typeof PACK !== 'undefined' && PACK.tlOf(PACK.track()) ? PACK.pos() : -1; } catch (_) { return -1; } };

  /* ---------- Figurene ----------
     'kyogre' er Jazz sin nedlasting fra Omega Ruby / Alpha Sapphire (3DS). Den har to lag med linjer som gløder (BodyAInc, BodyBInc): de tegnes som
     linjemasker oppå (røde linjer, sterkere når den er sint), ellers ble finnene svarte.
     'kyogre_primal' er Switch-modellen fra arkivet (Jazz 19.11 kveld: «Switch på kyogre», som Primal Groudon i 2b.1). Samme skjelett, akser og mål som 3DS-modellen
     (akseprøven), så posene er de samme. Linjene ligger i kroppens tekstur (de lyseblå feltene i BodyBlue) og gløder som en maske oppå (glow, LINE), kjernene
     (CoreRed, CoreYellow) er ensfargede og lyser selv, og øyet er ikke 3DS-atlaset (atlas: 0). 3DS-modellen virker fortsatt hvis den legges i pakken
     (`node scripts/conv.js kyogre:primal`): linjemasken BodyCMask og flekkene BodyBInc og BodyBInc2. Primal er 1,66 ganger så stor som den vanlige formen. */
  const KS = 1.45, PS = 0.62;   /* skalaen (Kyogre skal føles enorm) og hvor mye Primal krympes i kampen, så formene er like store der (regelen fra Groudon) */
  /* Linjene lyser opp som på 3DS-modellen (Jazz 19.11 kveld: «Liker at de lyser opp i primal form hos 3DS versjonene - vil ha det»; han valgte Switch fordi
     3DS-modellene har hull). LINE: de lyseblå linjene i BodyBlue (12 % av teksturen). URA: det blanke laget BodyUra ligger oppå kroppen i 3D (linjene er rygger),
     med mønsteret i alfa (0,2–1): det tetteste (over 0,6) gløder, sterkere jo tettere. Uten forskyvning (polygonOffset: false), ellers ble hele skallet dratt fram
     foran kroppen og hodet lyste hvitt. Masken gløder i lines()-fargen: lyseblå ved 1, hvit ved 2. Sammenlignet med 3DS-utgaven ved glød 1,3 og 2 (views.js). */
  const LINE = (r, g, b) => g - r > 0.3 && b > 0.75, URA = (r, g, b, a) => a > 0.6 ? a : 0;
  const kyFig = o => { const f = K.figure(K.model('kyogre'), Object.assign({ rules: [[/Inc$/, { mask: 1 }]] }, o)); f.root.rotation.order = 'YXZ'; f.root.scale.setScalar(KS); lines(f, 0.7, 0); return f; };
  const kypFig = o => { const f = K.figure(K.model('kyogre_primal'), Object.assign({ rules: [[/^Eye$/, { eye: 1, atlas: 0 }], [/^Core/, { emis: 0.85, seamOn: 0 }], [/^BodyBInc/, { emis: 0.85 }]], glow: [[/^BodyBlue$/, LINE], [/^BodyUra$/, URA, { polygonOffset: false }]] }, o));
    f.root.rotation.order = 'YXZ'; f.root.scale.setScalar(KS); lines(f, 1, 1); return f; };
  /* Linjene: v = hvor sterkt (0,7 = som teksturen, over 1 = gløder), p = Primal (lyseblå) eller vanlig (rød). */
  const lines = (f, v, p) => { const m = f.mats.mask; if (!m) return; m.uniforms.uCrack.value = v; if (p) m.uniforms.uCrackC.value.setRGB(mix(0.42, 0.75, c01(v - 1)), mix(0.86, 1, c01(v - 1)), 1); else m.uniforms.uCrackC.value.setRGB(mix(0.82, 1, c01(v - 0.8)), mix(0.16, 0.45, c01(v - 1.2)), mix(0.2, 0.3, c01(v - 1))); };
  /* Posene (akseprøven 19.11: Jaw y− åpner, Neck/Head y− løfter hodet, '*Shoulder' z+ løfter finnene og z− senker dem, Hips y− løfter halen, Tail1 y+ løfter halefinnene).
     Rettet 24.11 (målt på figuren i filmen, nakke.js): Neck/Head y+ LØFTER snuten og y− senker den. ROAR senker altså snuten (mot det lave kameraet i introen, så
     ansiktet og gapet synes), og DUCK løfter den. Posene er ikke endret: de står slik Jazz har godkjent dem. */
  const ROAR = { Neck: [0, -0.32, 0], Head: [0, -0.22, 0], Jaw: [0, -0.9, 0], '*Shoulder': [0, 0, 0.32], '*Arm': [0.25, 0, 0.1], Hips: [0, 0.12, 0], Tail1: [0, -0.15, 0] };
  const DUCK = { Neck: [0, 0.2, 0], Head: [0, 0.14, 0], Jaw: [0, -0.15, 0], '*Shoulder': [0, 0, -0.25], Hips: [0, -0.1, 0] };
  const DIVE = { Neck: [0, 0.3, 0], Head: [0, 0.2, 0], '*Shoulder': [0, 0, -0.35], '*Arm': [0, 0, -0.15], Hips: [0, -0.55, 0], Tail1: [0, 0.35, 0], Tail2: [0, 0.3, 0] };
  const SWIM = (f, t, k, sp) => { const w = t * (sp || 2.2); f.add({ '*Shoulder': [0, 0, 0.32 * sin(w) * k], '*Arm': [0, 0, 0.14 * sin(w - 0.6) * k], Hips: [0, 0.1 * sin(w + 1.2) * k, 0], Tail1: [0, 0.16 * sin(w + 0.4) * k, 0], Tail2: [0, 0.16 * sin(w - 0.3) * k, 0] }, 1); };
  const BREACH = { Neck: [0, -0.2, 0], Head: [0, -0.12, 0], '*Shoulder': [0, 0, 0.42], '*Arm': [0.35, 0, 0.12], Hips: [0, 0.18, 0], Tail1: [0, -0.2, 0], Tail2: [0, -0.2, 0] };

  /* ---------- BEVEGELSEN etter Fable (Opus 25.11; reglene: work/RAIDS3D.md, «Bevegelse»; posene: work/raids3d/kyogre/bevegelse/poser.jpg) ----------
     Fra finnene bryter flaten i introen (0:28,36) og ut, og i hele Primal-filmen (dykket, breachen, pangen og brølet). Posene er nøkler, og motoren lager bevegelsen mellom
     dem: målet for hver gruppe av ben glir mellom posene, og en fjær per gruppe (followV) gir tyngden, etterslepet og overskuddet; fjærene er stive i et kast som er låst til
     låta (slaget, brølet) og myke ellers. Det som henger på kroppen (finnene, halen og halefinnene) er kjeder (kjede): de henger etter skulderen, hoftene og kroppens bevegelse
     (vannet holder igjen), og slår forbi når den stanser; ingen fast forsinkelse per ledd. Kameraene har en tenkt rigg (camLive): på havet en båt som vugger sakte (under
     0,2 Hz) og rir på dønningene, høyt oppe et helikopter eller en drone som glir. Bryteren: G3D.alt[382] = 'stiv' (eller 'gammel') gir bevegelsen og kameraene slik de var
     (godkjent 24.11) i begge filmene (live: &gammel=stiv; gjennomgangssiden: &alt=stiv; verktøyene: PRE='G3D.alt={382:"stiv"}'). G3D.dbgKey = 1: posene uten fjærene (posearket).
     Nye poser og kurver har egne navn: ROAR, DUCK og SWIM er også kampfigurens (form og idle i arenaen). */
  const altv = () => String((G3D.alt && G3D.alt[382]) || ''), STIV = () => /stiv|gammel/.test(altv());
  const sm5 = x => { x = c01(x); return x * x * x * (x * (6 * x - 15) + 10); };
  /* Nøklene [[tid, vektor eller tall, (kurve)], …]: målet glir mellom dem (io, eller nøkkelens egen kurve inn til den), og står før den første og etter den siste. */
  const keyAt = (L, t) => { if (t <= L[0][0]) return L[0][1]; for (let i = 1; i < L.length; i++) if (t < L[i][0]) { const a = L[i - 1], b = L[i], u = (b[2] || io)((t - a[0]) / (b[0] - a[0]));
      return typeof a[1] === 'number' ? a[1] + (b[1] - a[1]) * u : a[1].map((x, j) => x + (b[1][j] - x) * u); } return L[L.length - 1][1]; };
  /* En fjær der stivheten endres med tiden (fz(t) → [f, z]): myk i lange, rolige bevegelser og stiv i et kast på en lyd (fra Groudon, c3/383.js). Ren funksjon av tiden:
     faste steg på 1/240 s fra t0, tilstanden lagret hvert kvarte sekund, så filmen kan spoles og hoppes i. */
  const followV = (src, fz, t0) => { const dt = 1 / 240, M = 60, n = src(t0).length, marks = [], s = new Float64Array(2 * n); let at = -1;
    const st = k => { if (at < 0 || at > k) { if (!marks.length) { const v = src(t0), s0 = new Float64Array(2 * n); for (let j = 0; j < n; j++) s0[j] = v[j]; marks.push(s0); } const m = min(floor(k / M), marks.length - 1); s.set(marks[m]); at = m * M; }
      while (at < k) { const tt = t0 + at * dt, v = src(tt), q = fz(tt), w = TAU * q[0], z = q[1]; for (let j = 0; j < n; j++) { s[n + j] += (w * w * (v[j] - s[j]) - 2 * z * w * s[n + j]) * dt; s[j] += s[n + j] * dt; }
        at++; if (at % M === 0 && at / M === marks.length) marks.push(Float64Array.from(s)); } return s; };
    return t => t <= t0 ? Array.from(src(t)) : Array.from(st(max(0, Math.round((t - t0) / dt))).subarray(0, n)); };
  /* En kjede som X.chain (raid3c.js), men med stivheten som en funksjon av tiden (fz(t) → [f i leddet innerst, z]; fo: frekvensen ganges med dette per ledd utover).
     drive(t) → [rx, ry, rz]: ankeret (skulderen, hoftene; kroppens løft og stamp tas med som en vinkel), pose(t, i) → leddets egen stive pose. Gir avviket fra posen per ledd. */
  const kjede = o => { const n = o.n, t0 = o.t0, fo = o.fo == null ? 0.8 : o.fo, lim = o.lim || 0, N = 3 * n, dt = 1 / 240, M = 60, marks = [], s = new Float64Array(2 * N), Z3 = [0, 0, 0]; let at = -1;
    const pz = (t, i) => o.pose ? o.pose(t, i) || Z3 : Z3, FO = Array.from({ length: n }, (_, i) => Math.pow(fo, i));
    const st = k => { if (at < 0 || at > k) { if (!marks.length) { const a = o.drive(t0), s0 = new Float64Array(2 * N); for (let c = 0; c < 3; c++) { let p = a[c] || 0; for (let i = 0; i < n; i++) { p += pz(t0, i)[c] || 0; s0[3 * i + c] = p; } } marks.push(s0); }
        const m = min(floor(k / M), marks.length - 1); s.set(marks[m]); at = m * M; }
      while (at < k) { const tt = t0 + at * dt, a = o.drive(tt), q = o.fz(tt), z = q[1];
        for (let i = 0; i < n; i++) { const p = pz(tt, i), w = TAU * q[0] * FO[i]; for (let c = 0; c < 3; c++) { const j = 3 * i + c, tg = (i ? s[j - 3] : a[c] || 0) + (p[c] || 0); s[N + j] += (w * w * (tg - s[j]) - 2 * z * w * s[N + j]) * dt; s[j] += s[N + j] * dt; } }
        at++; if (at % M === 0 && at / M === marks.length) marks.push(Float64Array.from(s)); } return s; };
    return t => { const out = []; if (t <= t0) { for (let i = 0; i < n; i++) out.push([0, 0, 0]); return out; } const k = max(0, Math.round((t - t0) / dt)), s = st(k), tk = t0 + k * dt, a = o.drive(tk);
      for (let i = 0; i < n; i++) { const p = pz(tk, i), r = [0, 0, 0]; for (let c = 0; c < 3; c++) { const j = 3 * i + c; let d = s[j] - (i ? s[j - 3] : a[c] || 0) - (p[c] || 0); if (lim) d = lim * Math.tanh(d / lim); r[c] = d; } out.push(r); }
      return out; }; };
  /* Pusten: 0 → 1 (inn, 40 % av perioden) → 0 (ut), myk i begge ender (sm5); perioden og dybden glir litt (støy), så den ikke går som en klokke. */
  const pust = (t, t0, P, sd) => { if (t < t0) return 0; const u = ((t - t0) / P + 0.05 * X.noise(t, sd, 0.07)) % 1, a = 0.4, b = u < a ? sm5(u / a) : 1 - sm5((u - a) / (1 - a)); return b * (1 + 0.15 * X.noise(t, sd + 3, 0.09)); };
  /* Kameraet med en tenkt rigg (camLive): banen følges med en fjær (etterslep, f 2,0 og z 0,8), og støyen er en VINKEL (grader, så skjelvet er likt på skjermen uansett avstand:
     research «rask_bevegelse» 21), ganget med linsa (fov/45). rig: 'baat' = en båt som vugger sakte (krenging og stamp på 0,12–0,16 Hz, under kvalmebåndet 0,2–0,4 Hz) og
     et lite skjelv; 'heli' = helikopter eller drone som glir (svak drift på 0,1 Hz). tIn: støyen tones inn; tEnd: fra da står kameraet nøyaktig på banen. src(t) → K.cam-argumentene. */
  const camLive = (src, o) => { const lag = X.follow(t => src(t).slice(0, 6), { f: o.f || 2.0, z: o.z == null ? 0.8 : o.z, t0: o.t0 }), sd = o.seed || 1, baat = o.rig === 'baat', A = o.amp == null ? 1 : o.amp;
    return t => { const v = src(t), c = G3D.dbgKey ? v.slice(0, 6) : lag(t), w = (o.tIn != null ? io(c01((t - o.tIn) / 0.6)) : 1) * (o.tEnd != null ? 1 - io(c01((t - (o.tEnd - (o.ut || 1))) / (o.ut || 1))) : 1);
      const dx = v[3] - v[0], dy = v[4] - v[1], dz = v[5] - v[2], d = Math.hypot(dx, dy, dz) || 1, fk = (v[6] || 40) / 45, D2R = PI / 180;
      const yaw = (baat ? 0.1 * X.noise(t, sd, 0.55) + 0.06 * X.noise(t, sd + 5, 0.13) : 0.05 * X.noise(t, sd, 0.1) + 0.025 * X.noise(t, sd + 5, 0.45)) * fk * A * w * D2R;
      const pit = (baat ? 0.32 * sin(TAU * 0.137 * t + sd) + 0.08 * X.noise(t, sd + 9, 0.55) : 0.04 * X.noise(t, sd + 9, 0.1) + 0.02 * X.noise(t, sd + 13, 0.45)) * fk * A * w * D2R;
      const rol = baat ? (0.45 * sin(TAU * 0.121 * t + 2 * sd) + 0.06 * X.noise(t, sd + 17, 0.5)) * A * w * D2R : 0.03 * X.noise(t, sd + 17, 0.12) * A * w * D2R;
      const e = o.tEnd != null ? 1 - io(c01((t - (o.tEnd - (o.ut || 1))) / (o.ut || 1))) : 1;
      for (let i = 0; i < 6; i++) c[i] = v[i] + (c[i] - v[i]) * e;
      const hx = -dz / Math.hypot(dx, dz), hz = dx / Math.hypot(dx, dz);   /* vannrett, på tvers av synslinja */
      c[3] += hx * yaw * d; c[5] += hz * yaw * d; c[4] += pit * d;
      return c.concat([v[6], (v[7] || 0) + rol]); }; };
  /* Kjeven går aldri forbi lukket (tennene): et mykt stopp et hårstrå åpent (−0,004), ikke en hard grense (den ga et rykk når kjeften lukket seg). */
  const kj = j => { const o = -j - 0.004; return -0.004 - 0.5 * (o + Math.sqrt(o * o + 0.0004)); };
  const camV = v => K.cam(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7]);

  /* ---------- Stedet: stormhavet ----------
     Havet er arenaens materiale (K.ground('sea')): dønninger med skum på toppene, vindstriper og regnringer. En kystlinje av mørke klipper bak, sjøstakker ute i havet der
     bølgene slår inn og spruter opp (hver gang en topp når steinen), og himmelen bak er stormhimmelen (skyQ). k = stormen (1 = storm, 2 = Primordial Sea). */
  const STACKS = [[-46, -38, 5.5, 15, 3], [-70, -8, 4.2, 11, 7], [58, -52, 6.5, 19, 11], [84, -14, 3.6, 9, 13], [-24, -96, 8, 24, 17], [30, -118, 9, 26, 19]];
  const seaPar = { swell: 1.15, chop: 1.3, foam: 0.95, rain: 0.8, wind: [0.35, 1, 1.05], deep: '#020f18', shal: '#0d4a58', skyA: '#4a6274', skyB: '#0a121e', foamC: '#e2eef4', seg: 200 };
  /* Når toppen av den store dønningen sist var ved (x, z): samme regning som SEA_H (raid3d.js), bare det største leddet. */
  const crestAt = (u, x, z, t) => { const W = u.uWind.value, dl = Math.hypot(W.x + 1e-4, W.y) || 1, dx = (W.x + 1e-4) / dl, dz = W.y / dl, a = x * dx + z * dz, b = -x * dz + z * dx, sp = W.z,
    ph = a * 0.085 + b * 0.021 - t * 0.62 * sp + 1.3 * sin(b * 0.017 + t * 0.13), d = ((PI / 2 - ph) % TAU + TAU) % TAU; return t - d / (0.62 * sp); };
  /* ---------- Sprut som former (2b.3, Fable) ----------
     Regelen fra Groudon: effekter som blir hvite flater, klumper eller prikker, byttes til former. Et plask er her en KRONE av vann: en maske (en åpen sylinder) som
     skyggeleggeren former. Den stiger som et kast (toppen etter uShape.w sekunder, så faller den), randen er fillete og ulik høy rundt, vannet renner i striper
     oppover og så nedover, og det rives opp i fingre og hull jo høyere og eldre det er. Tykt vann nederst er mørkt og grønnlig, tynt vann øverst er lyst, og lyset
     er scenens (lynet lyser det opp). uDir gir en retning: bølgen som slår mot en stein kaster vannet én vei. Dråpene rundt er små punkter (K.pts), disen store og svake.
     uShape = (radius ved foten, hvor langt randen slår ut, høyde, sekunder til toppen) · uDir = (retning x, z, bue: −2 hele veien rundt, ellers cos til halve buen, helling). */
  const VS_CROWN = `uniform float uAge, uSd; uniform vec4 uShape, uDir; varying vec2 vUv; varying vec3 vW; varying float vK, vM, vY;
${K.GLSL.COMMON}
void main(){ float th = uv.x * 6.2832, v = uv.y, tn = uAge / uShape.w; vec2 c = vec2(cos(th), sin(th));
  float rise = tn < 1. ? 1. - (1. - tn) * (1. - tn) : 1. - .22 * (tn - 1.) * (tn - 1.);
  float jag = .5 + .5 * vn(c * 2.3 + uSd) + .4 * (vn(c * 6.1 + uSd * 3.) - .5);
  float m = uDir.z > -1.5 ? smoothstep(uDir.z, min(1., uDir.z + .6), dot(c, uDir.xy)) : 1.;
  float h = uShape.z * max(rise, 0.) * (.4 + .8 * jag) * (.2 + .8 * m), sp = min(tn, 3.);
  float r = uShape.x * (1. + .12 * sp) + uShape.y * sp * (.2 + .8 * pow(v, 1.4)) * (.65 + .6 * jag);
  vec3 p = vec3(c.x * r, v * h - 1.6 * (1. - v), c.y * r); p.xz += uDir.xy * uDir.w * v * v * sp;   /* foten står under havflaten, så bølgene skjærer den */
  vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; vUv = vec2(th, v); vK = tn; vM = m; vY = p.y; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FS_CROWN = `uniform vec3 uC0, uC1, uC2; uniform float uSd, uA; varying vec2 vUv; varying vec3 vW; varying float vK, vM, vY;
${K.GLSL.COMMON}
void main(){ float th = vUv.x, v = vUv.y, tn = vK; vec2 c = vec2(cos(th), sin(th)), q = vec2(c.x * 3.2 + uSd, c.y * 3.2);
  float sc = tn < 1. ? -tn * 1.7 : -1.7 + (tn - 1.) * 1.2, wv = fbm(q * .9 + vec2(0., v * .8 + sc * .5));
  float s1 = fbm(q * 1.5 + vec2(wv * 1.6, v * 1.3 + sc)), s2 = fbm(vec2(th * 9. + uSd * 2. + wv * 3., v * 3.2 + sc * 2.1)), s = .55 * s1 + .45 * s2;
  float er = pow(v, .8) * .6 + max(0., tn - .55) * .3, a = smoothstep(er, er + .2, s + .2), rim = v + .55 * (fbm(q * 2.4 + vec2(3.1, sc * .3)) - .5) + .2 * (s2 - .5);
  a *= smoothstep(1., .78, rim) * smoothstep(-.3, 1.3, vY) * vM   /* tones inn fra havflaten, så foten ikke står som en kant */ * (1. - smoothstep(2.1, 3., tn)) * uA; if (a < .012) discard;
  float li = .6 * smoothstep(.25, .8, s1) + .4 * smoothstep(.3, .7, s2), side = .5 + .5 * dot(c, normalize(uKey.xz + vec2(1e-4, 0.)));
  vec3 col = mix(uC2, mix(uC1, uC0, li), smoothstep(0., .55, v + .3 * li)); col = mix(col, uC0, .55 * smoothstep(.22, 0., v) * smoothstep(.3, .6, s2));   /* hvitt vann ved foten */
  col *= (.68 + .32 * side) * (gl_FrontFacing ? .62 : 1.) * (.5 + .62 * min(uKeyC, vec3(.66)));   /* innsiden (den bakre halvdelen) ligger i skygge */
  float fk = fogK(vW); a *= 1. - .6 * fk; gl_FragColor = vec4(mix(col, uFogC * 1.6 + vec3(.04, .05, .06), fk) * a, a); }`;   /* sprut langt borte blir lys dis, ikke mørke flekker mot himmelen */
  const crown = (S, T, o) => { o = o || {}; const g = crown.g || (crown.g = new T.CylinderGeometry(1, 1, 1, 56, 10, true)), up = o.up || 1;
    const u = { uAge: K.uv(-1), uShape: K.uv(new T.Vector4(o.r || 3, o.out == null ? 2 : o.out, o.h || 8, up)), uDir: K.uv(new T.Vector4(o.dir ? o.dir[0] : 1, o.dir ? o.dir[1] : 0, o.dir ? (o.arc == null ? 0 : o.arc) : -2, o.lean || 0)), uSd: K.uv(o.sd || 1), uA: K.uv(o.a == null ? 0.92 : o.a),
      uC0: K.uv(K.u3(o.c0 || '#d0dee8')), uC1: K.uv(K.u3(o.c1 || '#8aa2b3')), uC2: K.uv(K.u3(o.c2 || '#2f5766')) };
    const m = new T.Mesh(g, K.shader(VS_CROWN, FS_CROWN, u, Object.assign({ side: T.DoubleSide, depthTest: true }, K.blend.soft()))); m.frustumCulled = false; m.renderOrder = o.ro || 5; m.visible = false; S.scene.add(m);
    m.at = (t, t0, x, y, z) => { const a = t - t0; m.visible = a >= 0 && a < up * 3.05; if (!m.visible) return; if (x != null) m.position.set(x, y, z); u.uAge.value = a; };
    return m; };
  /* Rettelse 3 (Jazz 24.11: «Det ser ikke naturlig ut det vannet som splasher opp»): et plask i stor målestokk er en sky av hvitt vann som skytes opp og ut og faller
     ned igjen, ikke et rør. plume(S, T, o): mange myke, skyggelagte dotter (hvitt vann: lyse øverst, grå i skyggen, mørkere når de faller) og et lag med fine dråper
     ytterst; tyngden er sterkere enn den virkelige (PG), så plasket står og faller i noen få sekunder. o: r (skiva det skytes fra), h (høyden), out (hvor
     langt ut), dir [x, z] (en retning: en bølge som slår mot en stein), n, px, a, sd. .at(t, t0, x, y, z). */
  const PG = 3.4;   /* tyngden i plaskene: sterkere enn den virkelige i filmens målestokk (prøvd 1,3: plasket hang i luft i 6–7 s og ble en tåkering; 2,6: steg som dotter) */
  /* Tre lag, som et ekte stort plask: en tett søyle midt i (45 %), et skjørt som slår ut (35 %), og en fot av skum som velter utover (20 %); pluss fine dråper fra toppen. */
  const plume = (S, T, o) => { o = o || {}; const n = o.n || 240, r = o.r || 2, h = o.h || 8, out = o.out || 3, sd = o.sd || 1, dir = o.dir, v0 = Math.sqrt(2 * PG * h), life = 2 * v0 / PG;
    const mk = (cnt, fine) => K.pts(cnt, i => { const a = rnd(i, sd + (fine ? 50 : 0)) * TAU, ca = cos(a), sa = sin(a), u = rnd(i, sd + 9), lay = fine ? 0 : u < 0.45 ? 0 : u < 0.8 ? 1 : 2;
        const q = fine ? 0.4 * Math.sqrt(rnd(i, sd + 1)) : lay === 0 ? 0.5 * Math.sqrt(rnd(i, sd + 1)) : 0.5 + 0.5 * rnd(i, sd + 1);
        const up = fine ? 0.85 + 0.35 * rnd(i, sd + 2) : lay === 0 ? 0.7 + 0.35 * rnd(i, sd + 2) : lay === 1 ? 0.35 + 0.35 * rnd(i, sd + 2) : 0.08 + 0.22 * rnd(i, sd + 2);
        const sp = fine ? 0.5 : lay === 0 ? 0.25 : lay === 1 ? 0.7 : 1.1;
        let vx = ca * out * (0.4 + 0.6 * rnd(i, sd + 8)) * sp, vz = sa * out * (0.4 + 0.6 * rnd(i, sd + 8)) * sp;
        if (dir) { const k = 0.5 + 0.9 * rnd(i, sd + 3); vx = vx * 0.4 + dir[0] * out * 0.6 * k; vz = vz * 0.4 + dir[1] * out * 0.6 * k; }
        const vy = v0 * up; return { p: [ca * r * q, 0.1 + rnd(i, sd + 7) * 0.5, sa * r * q], v: [vx, vy, vz], b: rnd(i, sd + 4) * (fine ? 0.15 : 0.22), l: (2 * vy / PG) * (0.85 + 0.2 * rnd(i, sd + 5)) + 0.25, z: fine ? 0.4 + rnd(i, sd + 6) * 0.6 : lay === 2 ? 1.2 + rnd(i, sd + 6) * 1.2 : 0.8 + rnd(i, sd + 6) * 1.1 }; },
      fine ? { t0: -1e5, shade: 1, g: PG, drag: 0.15, px: 28, sz0: 0.8, sz1: 1.0, c: ['#f4faff', '#c8d8e4', '#7890a0'], a: 0.32, fade: 0.45, floor: -0.3 }
           : { t0: -1e5, shade: 0, g: PG, drag: 0.06, px: o.px || 120, sz0: 0.7, sz1: 1.25, c: o.c || ['#eef5fa', '#b9cad6', '#6c8494'], a: o.a == null ? 0.3 : o.a, fade: 0.4, floor: -0.3 });   /* små og flate dotter i mengder: vann, ikke bomull (store, skyggelagte dotter ble skyer) */
    const gr = new T.Group(), A = mk(n * 2, 0), B = mk(o.nf || Math.round(n * 0.8), 1); gr.add(A, B); gr.visible = false; S.scene.add(gr);
    gr.at = (t, t0, x, y, z) => { const a = t - t0; gr.visible = a >= -0.05 && a < life + 1.2; if (x != null) gr.position.set(x, y, z); A.material.uniforms.uT0.value = B.material.uniforms.uT0.value = t0; };
    gr.A = A; return gr; };
  /* Dis rundt et plask: få, store og svake dotter som stiger og driver med vinden. */
  const mistP = (n, r, h, sd, o) => K.pts(n, i => { const a = rnd(i, sd) * TAU, q = Math.sqrt(rnd(i, sd + 1)); return { p: [cos(a) * r * q, 0.4 + rnd(i, sd + 2) * h * 0.25, sin(a) * r * q], v: [cos(a) * (0.4 + q) + 0.5, h * (0.18 + 0.3 * rnd(i, sd + 3)), sin(a) * (0.4 + q) + 0.8], b: rnd(i, sd + 4) * 0.5, l: 2.6 + rnd(i, sd + 5) * 1.6, z: 1.6 + rnd(i, sd + 6) * 2 }; },
    Object.assign({ t0: -1e5, shade: 1, g: 1.2, drag: 0.9, px: 190, sz0: 0.5, sz1: 2.3, c: ['#c9d8e2', '#93a9b8', '#5c7282'], a: 0.13, fade: 0.25, floor: -1 }, o || {}));
  function storm(T, o) {
    o = o || {}; const S = { scene: new T.Scene(), figs: [] }, sc = S.scene, add = (m, x, y, z, ry) => { m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; sc.add(m); return m; };
    S.sea = add(K.ground('sea', seaPar));
    /* Kysten: høye, mørke klipper bak (mot −Z), lavere ut mot sidene og åpent hav mot kameraet. */
    const bk = a => { const d = (((a - PI * 1.5) % TAU) + TAU + PI) % TAU - PI; return 0.08 + 0.92 * Math.exp(-Math.pow(d / 1.05, 2)); };
    const wet = K.rockMat({ a: '#0b1218', b: '#222e37', str: 0.32, sm: 0.6, hot: 0, lv: 0, tint: [0.07, 0.09, 0.11], top: 0.25, rough: 0.9 });
    add(K.cliff({ r: 250, h: 70, y0: -6, rough: 18, back: 30, steps: 3, ledge: 4, seed: 21, n: 72, m: 8, hf: bk, mat: K.rockMat({ a: '#0a1016', b: '#1a242c', str: 0.18, sm: 0.8, hot: 0, lv: 0, far: 1, tint: [0.06, 0.08, 0.1] }) }));
    S.stacks = STACKS.map(([x, z, r, h, sd]) => { const m = add(K.boulder(r, sd, { sy: h / r, j: 0.32, d: 2, mat: wet }), x, h * 0.32 - 2, z, rnd(sd, 3) * 6); m.userData.h = h; return m; });
    /* Sprut der bølgene slår mot steinene: et utbrudd hver gang en topp når en stein (crestAt), mest opp og bort fra bølgen, og et slør av fint sprut som henger. */
    const spray = (n, r, up, sd) => K.pts(n, i => { const a = rnd(i, sd) * TAU, q = rnd(i, sd + 1), v = up * (0.45 + 0.75 * q); return { p: [cos(a) * r * 0.8, 0.5 + rnd(i, sd + 2) * 2, sin(a) * r * 0.8], v: [cos(a) * (2 + 5 * (1 - q)) - 1.5, v, sin(a) * (2 + 5 * (1 - q)) + 2], b: rnd(i, sd + 3) * 0.35, l: 1.5 + rnd(i, sd + 4) * 1.1, z: 0.5 + rnd(i, sd + 5) * 1.4 }; },
      { t0: -1e5, shade: 1, g: 16, drag: 0.6, px: 28, sz0: 0.5, sz1: 1.6, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.7, fade: 0.55, floor: -1 });
    S.sprays = S.stacks.map((m, i) => add(spray(90, STACKS[i][2], 9 + STACKS[i][3] * 0.9, 40 + i * 7), m.position.x, 0, m.position.z));
    /* 2b.3: selve plasket er en krone av vann på den siden bølgen kommer fra (bølgene går med vinden, mot +Z); prikkene over er bare dråpene rundt */
    S.scr = STACKS.map(([x, z, r, h], i) => { const c = crown(S, T, { r: r * 0.9, out: r * 0.7, h: 7 + h * 0.55, up: 1.5, dir: [0.33, 0.94], arc: -0.3, lean: 2, sd: 3 + i * 1.7, a: 0.72, c2: '#6c8595' });   /* lyst også nederst: disse står langt borte mot himmelen (mørkt vann nederst ble mørke klør) */ c.position.set(x - 0.33 * r * 0.6, 0, z - 0.94 * r * 0.6); return c; });
    /* Lyset fra lynet i 3D: et blink over havet der det slår ned (lys som legges oppå). */
    S.flash = add(K.light(1, '#cfe2ff', { depth: false })); S.flash.renderOrder = 6; S.flash.visible = false;
    S.fx = (pts, t0, x, y, z) => { if (x != null) pts.position.set(x, y, z); pts.material.uniforms.uT0.value = t0; };
    return S;
  }
  /* Havet for hvert bilde: stormen (k), lynet (fl: 0–1, hvor hele himmelen lyser) og sprutet ved steinene. */
  const seaAct = (S, t, k, fl) => {
    const u = S.sea.material.uniforms, kk = max(0, k - 1); u.uSea.value.set((1.15 + 0.62 * kk) * (S.calm || 1), 1.3 + 0.7 * kk, 0.95 + 0.4 * kk, min(1, 0.8 + 0.25 * kk)); u.uWind.value.set(0.35, 1, 1.05 + 0.4 * kk, 0);
    lerpC(u.uSkyA, '#4a6274', '#d2e4ff', fl); lerpC(u.uSkyB, '#0a121e', '#40557a', fl); lerpC(u.uDeep, '#020f18', '#0a2a3a', fl * 0.6); u.uBri.value = 1 + 0.35 * fl;
    S.stacks.forEach((m, i) => { const t0 = crestAt(u, m.position.x, m.position.z, t); S.fx(S.sprays[i], t0); S.sprays[i].material.uniforms.uPx.value = 28 * (0.8 + 0.35 * kk); S.scr[i].at(t, t0); });
  };
  /* Lynene: [når, styrke, retning i verden (radianer fra −Z), frø]. rate = lyn per sekund. Et lyn blinker to–tre ganger (som ekte lyn). */
  const strikes = (t, rate, sd, span) => { const per = 1 / max(0.02, rate), q = floor(t / per), out = []; for (let j = q - 2; j <= q; j++) { if (rnd(j, sd) < 0.18) continue; out.push([j * per + rnd(j, sd + 1) * per * 0.85, 0.55 + 0.45 * rnd(j, sd + 2), (rnd(j, sd + 3) - 0.5) * (span || 2.4), j * 7 + sd]); } return out; };
  const flick = d => d < 0 ? 0 : d < 0.05 ? 1 : d < 0.1 ? 0.3 : d < 0.17 ? 0.9 : d < 0.24 ? 0.25 : max(0, 1 - (d - 0.24) / 0.4) * 0.55;
  const flashOf = L => L.reduce((s, q) => max(s, flick(q.d) * q.k), 0);

  /* ---------- Himmelen ----------
     Himmelen bak 3D-bildet er skyQ (under «Stormen i 3D»): den tegnes i vinkelmål rundt horisonten (UR enheter per radian) og festes til 3D-kameraet (G3D.view).
     Den gamle himmelen i 2D (backdrop: mørke klumper, en flat hyllesky og regnslør) ble tatt ut i 2b.3; den ligger i historikken (01de9d3). */
  const UR = 560, wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  /* Stedets etterbehandling: kjølig, mørkt og vått, med glød i skum og lyn. */
  const look = (S, t, P, q, sn) => {
    const fl = S.fl || 0, u = S.under || 0; P.bloom = 0.32 + 0.3 * fl + 0.25 * (S.glo || 0); P.bloomT = 0.7; P.grain = 0.04; P.vig = 0.42 + 0.3 * q.vig + 0.2 * u; P.vigc = u ? '#000710' : '#01050a';
    P.grade = { tint: u ? [0.85, 1, 1.12] : [0.95, 1, 1.05], con: 1.1, sat: 1.06, exp: 1.06 + 0.22 * fl };
    if (S.rays) P.rays = S.rays;
  };
  /* Regn foran kameraet (2D, på skrå med vinden) og lynet nær kameraet, oppå 3D-bildet. */
  const rainFx = (S, t, k, a) => { if (a <= 0.01) return; C.parts('rain', { n: floor(40 + 50 * k), seed: 12, cols: ['#a8c4d8', '#dcebf4'], a: 0.55 * a, spd: 1.2 + 0.4 * k, wind: -0.7 - 0.35 * k, z: [0.45, 1] }); };
  const nearBolt = (x, yTop, x1, y1, a, sd, w) => { if (a <= 0.03) return; C.bolt(x, yTop, x1, y1, { seed: sd, col: '#b8d4ff', core: '#ffffff', w: (w || 3) * 0.8, a, br: 4, depth: 6 }); C.blob(x1, y1, 110, '#c4d8f4', 0.26 * a, 1, 0.1); C.blob(x1, y1 - 2, 20, '#e8f2ff', 0.4 * a, 1, 0.5); };   /* 2b.3: et flatt skjær langs horisonten der det slår ned (før: en hvit ball på 160 px) */

  const HOME = [0, 0, 0];   /* der Kyogre ligger i havet (roten) */
  const DEEP = [0, -140, -10];   /* lyset langt nede */

  /* Lydene: naturlydene ligger i lydsengene (def.mus.bed, raids3d/kyogre/lyd/bed.py), og brølet er artens eget (signalet 'cry'). Signallydene til de gamle
     filmene (kydive, kybreach …) og oppvarmingen av pakkelydene deres ble tatt ut i 2b.3. */

  /* ---------- Stormen i 3D (2b.3): den samme i introen, i Primal og i arenaen ----------
     Som bildene Jazz sendte (fanart/kyogre/IMG_6597 og IMG_6596): en hyllesky med lys, bulende overside og mørk underside, regnsøyler som fosser ned i havet under den
     (lysere enn skyen bak), lyn inne i regnet, og havet under stormen mørkt og grovt med skum, mens havet utenfor er roligere og grått (uStm i havet). Fronten går
     langs x og kommer fra det åpne havet (+Z). Dottene og søylene ligger i forhold til fronten (z' bak den), og fronten flyttes (S.zf). Inne i stormen (S.zf under −500)
     er skyen et grått tak (himmelen skyQ), og regnsøylene står i en ring langt rundt oss. */
  /* Dottene: x, y, z' (bak fronten), størrelse, flathet, variant (0–3), lys (0 mørk … 1 lys), dekning. */
  const PUFFS = (() => { const L = [];
    for (let i = 0; i < 110; i++) { const big = rnd(i, 807) > 0.8; L.push([-420 + i * 7.6 + (rnd(i, 801) - 0.5) * 17, 23.5 + rnd(i, 802) * 5 + (big ? 3 : 0), -9 + rnd(i, 803) * 10, (big ? 34 : 18) + rnd(i, 804) * 16, 0.5 + 0.2 * rnd(i, 808), floor(rnd(i, 805) * 3), 0.72 + 0.28 * rnd(i, 806), 0.96]); }   /* leppa: en sammenhengende rull langs fronten (hyllesky) */
    for (let i = 0; i < 70; i++) L.push([-420 + rnd(i, 841) * 840, 29 + rnd(i, 842) * 3, 2 + rnd(i, 843) * 10, 28 + rnd(i, 844) * 16, 0.6, floor(rnd(i, 845) * 3), 0.3 + 0.2 * rnd(i, 846), 0.96]);   /* et mørkere lag rett bak leppa */
    for (let i = 0; i < 190; i++) { const zz = 6 + Math.pow(rnd(i, 812), 0.85) * 95, y = 34 + zz * 0.55 + rnd(i, 813) * 24 * (0.4 + zz / 95); L.push([-420 + rnd(i, 811) * 840, y, zz, 30 + rnd(i, 814) * 30, 0.8, floor(rnd(i, 815) * 3), 0.25 + 0.6 * Math.pow(c01((y - 30) / 80), 1.3), 0.96]); }   /* kroppen: bulende, mørk, lysere øverst */
    for (let i = 0; i < 70; i++) { const big = rnd(i, 827) > 0.75; L.push([-440 + rnd(i, 821) * 880, 80 + rnd(i, 823) * 80 + (big ? 25 : 0), 90 + rnd(i, 822) * 120, (big ? 90 : 50) + rnd(i, 824) * 40, 0.95, floor(rnd(i, 825) * 3), 0.55 + 0.45 * rnd(i, 826), 0.96]); }   /* tårnene bak, noen enorme */
    for (let i = 0; i < 90; i++) { const zz = 4 + rnd(i, 832) * 110; L.push([-420 + rnd(i, 831) * 840, 27 + zz * 0.04 + rnd(i, 833) * 2, zz, 30 + rnd(i, 834) * 16, 0.35, floor(rnd(i, 835) * 3), 0.05, 0.96]); }   /* undersiden: mørkt tak over regnet */
    return L; })();
  /* Regnsøylene: x, z' (bak fronten), bredde, høyde (skybasen), tetthet, frø. Noen få tette kjerner (som søyla i IMG_6597), resten tynnere. */
  const SHAFTS = (() => { const L = [];
    for (let i = 0; i < 34; i++) { const core = i % 6 === 0, zz = 6 + Math.pow(rnd(i, 852), 1.3) * 36; L.push([-360 + rnd(i, 851) * 720, zz, core ? 28 + rnd(i, 853) * 16 : 16 + rnd(i, 853) * 24, 27 + zz * 0.05, core ? 1 : 0.45 + 0.45 * rnd(i, 854), rnd(i, 855) * 10]); }   /* foran: søyler med tette kjerner */
    for (let i = 0; i < 40; i++) { const zz = 40 + rnd(i, 862) * 110; L.push([-400 + rnd(i, 861) * 800, zz, 45 + rnd(i, 863) * 35, 28 + zz * 0.04, 0.6 + 0.3 * rnd(i, 864), rnd(i, 865) * 10]); }   /* bak: et sammenhengende slør av regn under hele skyen */
    return L; })();
  /* Teksturen til dottene, laget én gang: rød = dekning (bulende kant), grønn = lyset (hver bule lys øverst, mørk nederst). Fire varianter i et 2 × 2-ark. */
  /* Teksturen til dottene, laget én gang: rød = dekning, grønn = lyset (lys topp, mørk bunn). Variant 0–2: bulende haug (blomkål); 3: lag på lag som i en hyllesky
     (IMG_6596: den lagdelte forkanten). 2 × 2-ark. */
  const puffTex = T => {
    const N = 512, H = 256, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, N, N); return [c, g]; };
    const [A, ga] = mk(), [B, gb] = mk(), [O, go] = mk(), [A2, ga2] = mk(), [B2, gb2] = mk();
    const lit = (X, Y, R) => { const rb = gb.createRadialGradient(X - R * 0.25, Y - R * 1.15, R * 0.3, X - R * 0.25, Y - R * 1.15, R * 2.35); rb.addColorStop(0, '#ffffff'); rb.addColorStop(0.42, '#d6d6d6'); rb.addColorStop(0.72, '#5e5e5e'); rb.addColorStop(1, '#161616'); return rb; };
    const ball = (X, Y, R) => { const ra = ga.createRadialGradient(X, Y, 0, X, Y, R); ra.addColorStop(0, 'rgba(255,255,255,1)'); ra.addColorStop(0.62, 'rgba(255,255,255,.95)'); ra.addColorStop(1, 'rgba(255,255,255,0)');
      ga.fillStyle = ra; ga.beginPath(); ga.arc(X, Y, R, 0, TAU); ga.fill(); gb.fillStyle = lit(X, Y, R); gb.beginPath(); gb.arc(X, Y, R * 0.98, 0, TAU); gb.fill(); };
    const layer = (X, Y, RX, RY) => { ga.save(); ga.translate(X, Y); ga.scale(1, RY / RX); const ra = ga.createRadialGradient(0, 0, 0, 0, 0, RX); ra.addColorStop(0, 'rgba(255,255,255,1)'); ra.addColorStop(0.7, 'rgba(255,255,255,.92)'); ra.addColorStop(1, 'rgba(255,255,255,0)');
      ga.fillStyle = ra; ga.beginPath(); ga.arc(0, 0, RX, 0, TAU); ga.fill(); ga.restore();
      gb.save(); gb.translate(X, Y); gb.scale(1, RY / RX); const rb = gb.createLinearGradient(0, -RX, 0, RX); rb.addColorStop(0, '#ffffff'); rb.addColorStop(0.35, '#bdbdbd'); rb.addColorStop(0.6, '#4a4a4a'); rb.addColorStop(1, '#121212');
      gb.fillStyle = rb; gb.beginPath(); gb.arc(0, 0, RX * 0.97, 0, TAU); gb.fill(); gb.restore(); };
    for (let v = 0; v < 4; v++) { const ox = (v % 2) * H, oy = floor(v / 2) * H;
      if (v === 3) { for (let i = 0; i < 9; i++) { const y = 0.36 + i * 0.045, w = 0.38 - abs(i - 4) * 0.025 + rnd(i, 940) * 0.04; layer(ox + (0.5 + (rnd(i, 941) - 0.5) * 0.08) * H, oy + y * H, w * H, (0.05 + 0.02 * rnd(i, 942)) * H); } continue; }
      const bs = [];
      for (let i = 0; i < 18; i++) { const a = rnd(i, 900 + v * 13) * TAU, rr = Math.sqrt(rnd(i, 901 + v * 13)), r = 0.1 + 0.09 * rnd(i, 902 + v * 13) * (1.3 - 0.6 * rr);
        bs.push([0.5 + cos(a) * rr * 0.22, min(0.54 + sin(a) * rr * 0.15, 0.72 - r * 0.7), r]); }
      for (let i = 0; i < 24; i++) { const a = -PI * (0.1 + 0.8 * rnd(i, 960 + v)), r = 0.03 + 0.035 * rnd(i, 961 + v); bs.push([0.5 + cos(a) * 0.27, 0.5 + sin(a) * 0.22 + 0.03, r]); }   /* små buler langs toppen */
      bs.sort((p, q) => q[1] - p[1]);
      for (const [x, y, r] of bs) ball(ox + x * H, oy + y * H, r * H); }
    ga2.filter = 'blur(3px)'; ga2.drawImage(A, 0, 0); gb2.filter = 'blur(5px)'; gb2.drawImage(B, 0, 0);
    const da = ga2.getImageData(0, 0, N, N).data, db = gb2.getImageData(0, 0, N, N).data, od = go.createImageData(N, N);
    for (let i = 0; i < N * N; i++) { od.data[i * 4] = da[i * 4]; od.data[i * 4 + 1] = db[i * 4]; od.data[i * 4 + 2] = 0; od.data[i * 4 + 3] = 255; }
    go.putImageData(od, 0, 0); const tx = new T.CanvasTexture(O); tx.colorSpace = T.NoColorSpace; tx.minFilter = tx.magFilter = T.LinearFilter; tx.generateMipmaps = false; tx.needsUpdate = true; return tx; };
  const VS_PUFF = `attribute vec4 aC, aP; varying vec2 vUv; varying vec4 vP; varying vec3 vW;
void main(){ vec3 cr = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), cu = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 w = aC.xyz + cr * position.x * aC.w + cu * position.y * aC.w * aP.z; vW = w; vUv = position.xy + .5; vP = aP; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`;
  const FS_PUFF = `uniform sampler2D tP; uniform vec3 uCL, uCD, uCB, uCF; uniform vec4 uLit; uniform vec2 uH; uniform float uFk, uAl; varying vec2 vUv; varying vec4 vP; varying vec3 vW;
${K.GLSL.COMMON}
void main(){ vec2 uv = vec2(mod(vP.x, 2.) * .5, .5 - floor(vP.x / 2.) * .5) + clamp(vUv, .004, .996) * .5; vec4 tx = texture2D(tP, uv);
  float a = tx.r * vP.w * uAl; if (a < .004) discard;
  /* 2b.3: lyset følger høyden i verden (uH: skybasen og toppen), og bulene i hver dott er bare relieff. Før hadde hver dott sin egen mørke bunn, og skyen ble rader av baller. */
  float hk = smoothstep(uH.x, uH.y, vW.y), bul = mix(.5, tx.g, .62), li = clamp(hk * .6 + vP.y * .35 + (bul - .5) * .62, 0., 1.);
  vec3 c = mix(uCD, uCL, li); c = mix(uCB, c, smoothstep(-.1, .3, hk + .25 * vP.y + (tx.g - .5) * .25));
  float d = length(vW - uLit.xyz); c += uCF * uLit.w * exp(-d * d / 3500.) * (.3 + .5 * (1. - tx.g));
  c = mix(c, uFogC, fogK(vW) * uFk); gl_FragColor = vec4(c * a, a); }`;
  /* Regnsøylene: står loddrett og snur seg mot kameraet, bredere nederst og skrå med vinden; striper som fosser ned, store flak, og dis der det treffer havet. */
  const VS_RAIN = `attribute vec4 aR, aQ; uniform float uTall; varying vec2 vUv; varying vec4 vQ; varying vec3 vW;
void main(){ vec3 b = vec3(aR.x, 0., aR.y), tc = cameraPosition - b; tc.y = 0.; vec3 rt = normalize(vec3(tc.z, 0., -tc.x) + vec3(1e-4, 0., 0.));
  float k = position.y + .5, wd = aR.z * (1. + .4 * (1. - k)); vec3 w = b + rt * position.x * wd + vec3(.15, 0., -1.) * aQ.z * (1. - k) * aR.z; w.y = mix(-1., aR.w * (1. + 1.6 * uTall), k);
  vW = w; vUv = vec2(position.x + .5, k); vQ = aQ; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`;
  const FS_RAIN = `uniform vec3 uCR, uCF; uniform vec4 uLit; uniform float uFk, uAl, uTall; varying vec2 vUv; varying vec4 vQ; varying vec3 vW;
${K.GLSL.COMMON}
void main(){ float x = vUv.x - .5, y = vUv.y, sd = vQ.y;
  float prof = exp(-x * x / (.028 + .04 * (1. - y))) * (.75 + .5 * vn(vec2(vUv.x * 9. + sd, y * .8)));
  float br = fbm(vec2(vUv.x * 2.4 + sd, y * 1.1 - uTime * .25));
  float st = vn(vec2(vUv.x * 70. + sd * 7., y * 3. + uTime * 3.2)) * .55 + vn(vec2(vUv.x * 190. + sd * 3., y * 7. + uTime * 8.)) * .45;
  /* 2b.3: slør som faller på skrå (sh) bærer formen, og stripene er bare korn i dem (før: grove striper). Toppen løser seg opp i skybasen i stedet for en rett kant. */
  float sh = fbm(vec2(vUv.x * 4.5 + sd + y * 1.4, y * 1.7 + uTime * .9));
  /* uTall (rettelse 3, introen): ingen topp (søyla tones gradvis ut oppover i himmelen), tydeligere striper og litt svakere; ellers så den ut som et fjell med flat topp */
  float top = mix(smoothstep(1., .62 + .2 * br, y), (1. - smoothstep(.08, .95, y)) * (.6 + .4 * br), uTall), bot = 1. + 1.1 * smoothstep(.15, 0., y);
  float a = prof * (mix(.72, .45, uTall) + mix(.28, .55, uTall) * smoothstep(.3, .8, st)) * (.45 + .6 * br + .55 * smoothstep(.35, .75, sh)) * top * bot * vQ.x * uAl * (1. - .3 * uTall); if (a < .004) discard;
  vec3 c = uCR * (.84 + .16 * st + .2 * smoothstep(.4, .8, sh) + .22 * smoothstep(.2, 0., y)); float d = length(vW - uLit.xyz); c += uCF * uLit.w * exp(-d * d / 2200.) * .28;
  c = mix(c, uFogC, fogK(vW) * uFk); a = min(a, .92); gl_FragColor = vec4(c * a, a); }`;
  const mkStorm = (S, K, T) => {
    const inst = (n, attrs, vs, fs, un, ro) => { const q = new T.PlaneGeometry(1, 1), g = new T.InstancedBufferGeometry(); g.index = q.index; g.setAttribute('position', q.attributes.position); g.instanceCount = n;
      const A = {}; for (const [nm, sz] of attrs) { A[nm] = new T.InstancedBufferAttribute(new Float32Array(n * sz), sz); A[nm].setUsage(T.DynamicDrawUsage); g.setAttribute(nm, A[nm]); }
      const m = new T.Mesh(g, K.shader(vs, fs, un, Object.assign({ depthTest: true, side: T.DoubleSide }, K.blend.soft()))); m.frustumCulled = false; m.renderOrder = ro; S.scene.add(m); return { m, A, n }; };
    const v3 = () => K.uv(K.u3('#000000'));   /* farger (lerpC bruker setRGB) */
    S.puff = inst(PUFFS.length, [['aC', 4], ['aP', 4]], VS_PUFF, FS_PUFF, { tP: K.uv(puffTex(T)), uCL: v3(), uCD: v3(), uCB: v3(), uCF: K.uv(new T.Vector3(0.7, 0.82, 1)), uLit: K.uv(new T.Vector4()), uH: K.uv(new T.Vector2(22, 110)), uFk: K.uv(0.75), uAl: K.uv(1) }, 4);
    S.rain = inst(SHAFTS.length, [['aR', 4], ['aQ', 4]], VS_RAIN, FS_RAIN, { uCR: v3(), uCF: K.uv(new T.Vector3(0.7, 0.82, 1)), uLit: K.uv(new T.Vector4()), uFk: K.uv(0.75), uAl: K.uv(1), uTall: K.uv(0) }, 5); };
  /* Hvert bilde: dottene og søylene sorteres bakfra (etter kameraet i dette bildet), og fronten flyttes. Inne i stormen (etter dronen) står søylene i en ring langt rundt oss. */
  const stormSort = (S, t) => {
    const zf = S.zf, cp = K.camPos(), P = S.puff, R = S.rain, inside = zf < -500, sy = S.sy || 1, ss = S.ss || 1; P.m.visible = !inside && S.stormOn;
    if (P.m.visible) { const C4 = P.A.aC.array, P4 = P.A.aP.array; P.m.material.uniforms.uH.value.set(22 * sy, 112 * sy);
      PUFFS.map((q, i) => [i, (q[0] - cp.x) ** 2 + (q[1] * sy - cp.y) ** 2 + (q[2] + zf - cp.z) ** 2]).sort((a, b) => b[1] - a[1]).forEach(([i], j) => { const q = PUFFS[i]; C4.set([q[0], q[1] * sy, q[2] + zf, q[3] * ss], j * 4); P4.set([q[5], q[6], q[4], q[7]], j * 4); });
      P.A.aC.needsUpdate = P.A.aP.needsUpdate = true; }
    R.m.visible = S.stormOn; if (!R.m.visible) return;
    const nR = min(SHAFTS.length, S.rn || SHAFTS.length); R.m.geometry.instanceCount = nR;   /* S.rn: færre søyler (arenaen tegnes hele kampen, også på telefonen) */
    const pos = SHAFTS.slice(0, nR).map((q, i) => inside ? [HOME[0] + sin(i * 2.4 + q[5]) * (95 + q[1] * 1.5), HOME[2] + cos(i * 2.4 + q[5]) * (95 + q[1] * 1.5)] : [q[0], q[1] + zf]), R4 = R.A.aR.array, Q4 = R.A.aQ.array;
    pos.map((p, i) => [i, (p[0] - cp.x) ** 2 + (p[1] - cp.z) ** 2]).sort((a, b) => b[1] - a[1]).forEach(([i], j) => { const q = SHAFTS[i], p = pos[i]; R4.set([p[0], p[1], q[2] * (inside ? 1.6 : 1) * ss, q[3] * sy], j * 4); Q4.set([q[4], q[5], 0.22, 0], j * 4); });
    R.A.aR.needsUpdate = R.A.aQ.needsUpdate = true; };
  /* Himmelen (2D bak): utenfor stormen et lysere, grått overskyet tak med lys horisont (som høyre side av IMG_6597), mørkere mot stormen (S.sa); inne i stormen mørkt grått
     (Jazz: «veldig grått og mye regn»). ov = hvor mye vi er inne i stormen (0–1). */
  const skyQ = (S, t) => {
    const g = C.g, v = G3D.view(), k = v.ppr / UR, bl = C.blend, fl = S.fl || 0, ov = S.ov || 0;
    g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
    const top = bl(bl('#2e3944', '#12181e', ov), '#5a7090', fl * 0.5), mid = bl(bl('#55626e', '#262f37', ov), '#7890ac', fl * 0.5), hz = bl(bl('#8d9aa5', '#3c4751', ov), '#a8bcd4', fl * 0.5);
    const gr = g.createLinearGradient(0, -UR * 0.95, 0, 4); gr.addColorStop(0, top); gr.addColorStop(0.72, mid); gr.addColorStop(1, hz);
    g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 4004); g.fillStyle = hz; g.fillRect(-4000, 4, 8000, 4000);
    if ((S.sd || 0) > 0) { const cx = wrap(S.sa - v.yaw) * UR, rg = g.createRadialGradient(cx, -UR * 0.1, 0, cx, -UR * 0.1, UR * 1.5);
      rg.addColorStop(0, `rgba(16,21,27,${0.9 * S.sd})`); rg.addColorStop(0.45, `rgba(22,28,34,${0.6 * S.sd})`); rg.addColorStop(1, 'rgba(22,28,34,0)'); g.fillStyle = rg; g.fillRect(-4000, -4000, 8000, 4004); }
    for (let i = 0; i < 30; i++) { const x = wrap(rnd(i, 703) * TAU + t * (0.003 + 0.004 * rnd(i, 708)) - v.yaw) * UR, y = -(26 + Math.pow(rnd(i, 704), 1.3) * 380), r = 110 + rnd(i, 705) * 200; if (abs(x) > 1100) continue;
      const lt = rnd(i, 706) > 0.45; C.blob(x, y, r, lt ? bl(bl('#7a8793', '#36414b', ov), '#b4c6de', fl * 0.55) : bl('#28313a', '#0e1419', ov), (lt ? 0.3 + 0.2 * fl : 0.4 + 0.12 * fl) + 0.2 * rnd(i, 707), 0, 0.26); }   /* 2b.3: i et lyn lyser de lyse skymassene opp og de mørke står igjen, så himmelen får form */
    g.restore();
    /* 2b.3: lynene i det fjerne (S.fb): fra skybasen ned mot horisonten, bak klipper og stakker, og skyen lyser der det slår ned. Aldri en hvit ball ved foten. */
    if (S.fb) for (const q of S.L || []) { const a = flick(q.d) * q.k, B = q.big ? 1 : 0; if (a < 0.05 || q.near) continue; const X0 = q.sx != null ? 256 + q.sx : v.x + wrap(q.a - v.yaw) * v.ppr; if (X0 < -60 || X0 > 572) continue;
      /* big: det store lynet bak ham i brølet. Det tegnes i bakteppet, så kroppen hans og stakkene står foran det (aldri oppå ham), og himmelen lyser opp bak ham. */
      const top = B ? -14 : v.y - (q.lo ? 0.075 : 0.34) * v.ppr, bot = v.y + 1; C.blob(X0, B ? v.y - 110 : q.lo ? top - 8 : top + 26, B ? 250 : q.lo ? 80 : 130, '#7f9fd8', (B ? 0.26 : 0.22) * a, 1, B ? 0.7 : 0.5);   /* lo: stormen står langt borte, og lynet går bare fra skybasen ned i havet, inne i regnet */
      C.bolt(X0 + (rnd(q.s, 41) - 0.5) * (B ? 80 : 44), top, X0, bot, { seed: q.s * 3 + (q.d > 0.12 ? 1 : 0), col: '#9fc0ff', core: '#ffffff', w: B ? 3 : 1.5, a, br: B ? 4 : 3, depth: B ? 6 : 5 }); C.blob(X0, bot, B ? 120 : 70, '#c4d8f4', (B ? 0.42 : 0.3) * a, 1, 0.12); }
    return { hz: v.y }; };

  /* ---------- Arenaen i kampen: samme hav som cutscenene ----------
     Kyogre ligger i havet foran deg (oppe til høyre), stor, med bølgene som slår over ryggen og skum rundt kroppen; din Pokémon står på en våt klippe nede til venstre.
     Sjøstakker og kysten bak, der bølgene spruter opp, og lyn i bakgrunnen. Raseriet: mer storm. Etter Primal: Primordial Sea (større bølger, styrtregn og lyn hele tiden).
     Låta: på dubstep-dropet (4:26) og hver gang sløyfa begynner på nytt (smellet, 3:46) slår lynet ned i takt med låta (Jazz 19.11: «masse lys»). */
  const AFOE = [377, 196];
  const drop = (mus, tl) => { if (mus < 0 || !tl) return { on: 0, hk: 0, rs: 0, sl: 0 };
    const hole = tl.hole || TL.hole, inD = mus >= tl.drop - 0.05 && mus < (tl.end || TL.end) && !(mus >= hole[0] && mus < hole[1]), h = (mus - tl.b0) / tl.pulse, f = h - floor(h);
    const rs = mus >= tl.riser && mus < tl.drop ? seg(mus, tl.riser, tl.drop) : 0, sl = mus >= tl.slam && mus < tl.slam + 1 ? 1 - (mus - tl.slam) : 0;
    return { on: inD ? 1 : 0, hk: inD ? Math.exp(-f * 5) : 0, n: floor(h), rs, sl, f }; };
  X.arena(382, {
    home: HOME, foe: AFOE, me: [190, 372], env: { rim: '#a8c8ff', glow: '#2a8acc', fog: '#16222e', glowH: 3 }, edge: 'sea',
    cam: fig => fig ? { fv: 50, cp: [-12, 6.2, 34], kq: 30 / 400, tg: [HOME[0] - 6, 1.5, HOME[2]] } : { fv: 48, cp: [-12, 5.5, 38], kq: 34 / 400, tg: [HOME[0] - 6, 2, HOME[2]] },
    place(K, T, fig) { const S = storm(T); S.calm = 0.62; S.T = T; mkStorm(S, K, T); S.rn = 40; return S; },   /* 2b.3: stormen fra filmene (regnsøylene i en ring rundt oss, den grå himmelen) */
    dress(S, K, T, fig, m) {
      /* Klippa din: våt, mørk stein som så vidt stikker opp, med skum og sprut rundt foten når bølgene slår inn. */
      const cm = K.rockMat({ a: '#0c1319', b: '#26323b', str: 0.3, top: 0.5, sm: 0.4, hot: 0, lv: 0, tint: [0.07, 0.09, 0.11], rough: 0.8, sc: 2.4 });
      S.rock = K.boulder(3.6, 91, { flat: 1, sx: 1.25, sy: 0.55, sz: 1, cap: 1.4, j: 0.3, d: 2, mat: cm }); S.rock.position.set(m.x + 0.3, -0.3, m.z - 1.2); S.rock.rotation.y = 0.4; S.scene.add(S.rock);
      for (const [dx, dz, r, sd] of [[4.4, -2.6, 1.3, 93], [-3.8, -3.6, 1.1, 95], [2.2, 3.4, 0.9, 97]]) { const b = K.boulder(r, sd, { sy: 0.9, j: 0.3, mat: cm }); b.position.set(m.x + dx, -0.2, m.z + dz); S.scene.add(b); }
      S.mspray = K.pts(80, i => { const a = rnd(i, 101) * TAU, q = rnd(i, 102); return { p: [cos(a) * 3.2, 0.3, sin(a) * 2.6], v: [cos(a) * (2 + 4 * q) - 1, 5 + rnd(i, 103) * 8, sin(a) * (2 + 4 * q) + 1], b: rnd(i, 104) * 0.3, l: 1.2 + rnd(i, 105) * 0.7, z: 0.8 + rnd(i, 106) * 1.6 }; }, { t0: -1e5, shade: 1, g: 16, drag: 0.6, px: 26, near: 5, sz0: 0.7, sz1: 1.8, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.8, fade: 0.55, floor: -1 });
      /* 2b.3: plaskene som former (crown): bak klippa di når en topp slår inn, og veggen av vann når stedet slår til. Prikkene er bare dråpene rundt. */
      S.mcr = crown(S, S.T, { r: 3.0, out: 1.4, h: 3.4, up: 0.8, dir: [0.25, -0.97], arc: 0.1, lean: 0.8, sd: 31, a: 0.75 }); S.bcr2 = crown(S, S.T, { r: 5.5, out: 3.5, h: 14, up: 0.85, dir: [0.2, -0.98], arc: -0.6, lean: 1.5, sd: 33, a: 1, c0: '#e2edf3', c1: '#a9bfcc', c2: '#55808f' });
      S.mspray.position.set(m.x, 0, m.z - 1); S.scene.add(S.mspray); S.mp = [m.x, m.z];
      /* Stedet slår til (Raging Tide: «A great wave crashes over …»): en vegg av sprut over klippa di. */
      S.big = K.pts(200, i => { const a = rnd(i, 111) * TAU, q = rnd(i, 112); return { p: [cos(a) * 5, 0.4, -3 + sin(a) * 3], v: [cos(a) * (3 + 7 * q), 10 + rnd(i, 113) * 16, 2 + sin(a) * 4], b: rnd(i, 114) * 0.3, l: 1.8 + rnd(i, 115) * 0.8, z: 1.4 + rnd(i, 116) * 3 }; }, { t0: -1e5, shade: 1, g: 15, drag: 0.6, px: 28, near: 5, sz0: 0.8, sz1: 2.4, c: ['#f8fdff', '#c8dcea', '#647e90'], a: 0.8, fade: 0.5, floor: -1 });
      S.big.position.set(m.x, 0, m.z); S.scene.add(S.big);
    },
    state(S, t, o, st) {
      const U = K.U(), su = S.sea.material.uniforms, { p2, fT, rT, pk } = st, mus = musNow(t), D = drop(mus, (typeof PACK !== 'undefined' && PACK.tlOf && PACK.tlOf(PACK.track())) || (G3D.mus ? TL : null));
      const k = 1 + 0.3 * p2 + 0.75 * pk, L = [];
      for (const q of strikes(t, 0.16 + 0.14 * p2 + 0.42 * pk, 91, 2.2)) L.push({ d: t - q[0], k: q[1] * (0.8 + 0.2 * pk), a: q[2], s: q[3] });
      /* Låta: smellet (stort lyn), riseren (blafring som tetner), og dropet: et lyn på hvert slag, flere og flere. */
      if (D.sl > 0) L.push({ d: 1 - D.sl, k: 1, a: 0.1, s: 501 });
      if (D.rs > 0) { const n = floor(D.rs * D.rs * 14); for (let i = 0; i < 2; i++) L.push({ d: ((mus * (2 + 10 * D.rs * D.rs) + i * 0.37) % 1) * 0.5, k: 0.25 + 0.6 * D.rs, a: (rnd(n + i, 77) - 0.5) * 2.2, s: 600 + n * 3 + i }); }
      if (D.on) for (let i = 0; i < 3; i++) L.push({ d: D.f * 0.8 - i * 0.07, k: 1 - i * 0.2, a: (rnd(D.n * 3 + i, 79) - 0.5) * 2.4, s: 700 + D.n * 5 + i });
      S.L = L; const fl = flashOf(L); S.fl = fl; S.drop = D; seaAct(S, t, k, fl);
      /* Klippa di: sprut når en topp slår inn, og veggen av sprut når stedet slår til. */
      const tc = crestAt(su, S.mp[0], S.mp[1] - 6, t); S.fx(S.mspray, tc); S.fx(S.big, fT < 98 ? t - fT + 0.45 : -1e5); S.mcr.at(t, tc, S.mp[0], 0, S.mp[1] - 1.5); S.bcr2.at(t, fT < 98 ? t - fT + 0.3 : -1e5, S.mp[0], 0, S.mp[1] - 1);
      /* 2b.3: samme storm som filmene. Vi er inne i den (regnsøylene i en ring rundt oss, grå himmel, stormhav med småskum), og den er sterkere etter Primal. */
      { const ru = S.rain.m.material.uniforms, inn = 0.62 + 0.12 * p2 + 0.26 * pk; S.zf = -1000; S.stormOn = true; S.sy = 1; S.ss = 1; S.ov = inn; S.sd = 0; S.sa = PI; S.fb = true; S.grey = 0.5 * inn; S.inn = inn;
        su.uStm.value.set(-1000, 5, 0.55 + 0.45 * pk, 0.35 + 0.15 * p2 + 0.5 * pk); lerpC(ru.uCR, C.blend('#3a4652', '#4e5b66', inn), '#c8dcf4', (S.fl || 0) * 0.25); ru.uFk.value = 0.75; ru.uAl.value = 0.45 + 0.2 * p2 + 0.35 * pk; ru.uLit.value.set(0, 20, 0, 0); stormSort(S, t); }
      /* Rundt Kyogre: skum der kroppen bryter flaten, den mørke kroppen under, og lyset under vannet som Primal. */
      su.uWade.value.set(HOME[0], HOME[2], 10, 0.55 + 0.2 * pk); su.uBody.value.set(HOME[0], HOME[2], 11, 0.55); su.uBodyD.value.set(sin(S.face || 0), cos(S.face || 0), 5.5, 1);
      su.uGlo.value.set(HOME[0], HOME[2], 13, (0.2 + 0.3 * sin(t * 2.1)) * pk + 0.25 * hit(st.pT, 0, 2)); su.uGloC.value.set(0.25, 0.75, 1);
      const ring = (i, x, z, age, v, d, a) => su.uRing.value[i].set(x, z, 1.5 + age * v, age >= 0 && age < d ? a * (1 - age / d) : 0), h = o.hit;
      ring(0, S.mp[0], S.mp[1] - 1, t - tc, 6, 1.6, 0.9); ring(1, HOME[0], HOME[2], rT - 0.4, 20, 1.8, 1); ring(2, S.mp[0], S.mp[1], fT - 0.4, 14, 1.5, 1); ring(3, h ? h[0] : 0, h ? h[1] : 0, h ? h[2] : -1, 12, 0.9, 0.8);
      lerpC(U.uKeyC, '#7a8ca0', '#eef6ff', fl); lerpC(U.uShC, '#0e1a26', '#3e5270', fl); U.uRimK.value = 0.9; U.uGlow.value = 0.3 + 0.5 * pk; U.uFog.value.set(46 - 10 * pk, 330 - 80 * pk, 0.86); lerpC(U.uFogC, '#222c36', '#4a5f7e', fl);   /* 2b.3: disen er regnets grå (før nesten svart, så sprut langt borte ble mørkt mot himmelen) */
      S.k = k; S.pk = pk; S.rw = 0; S.glo = 0.3 * pk;
    },
    back: (S, t) => skyQ(S, t),   /* 2b.3: filmens stormhimmel (før: backdrop, mørke klumper i 2D) */
    scene(S, A, sn, q) {
      const P = q.P, t = S.t, p2 = S.p2, pk = A.pk || 0, fl = A.fl || 0, k = A.k || 1;
      /* Lyset på figurene: kaldt og dempet som uværet; lynet gir hardt kantlys, og lyset under vannet når opp nedenfra som Primal. */
      C.lightSet({ amb: C.blend('#7f93a6', '#d4e2f0', fl * 0.8), sat: 0.86, lift: C.blend('#0a1622', '#1c3448', fl),
        lights: [{ col: '#cfe2f0', a: 0.18 + 0.55 * fl, h: 0.55, top: 1 }, { col: '#2aa8e0', a: min(0.7, 0.15 + 0.4 * pk), h: 0.6 }], rim: [{ col: '#d8eafa', dx: 1, dy: 1, a: 0.3 + 0.65 * fl }],
        me: { amb: C.blend('#7c8f9d', '#c8d8e6', fl * 0.8), lights: [{ col: '#cfe2f0', a: 0.2 + 0.55 * fl, h: 0.5, top: 1 }], rim: [{ col: '#d8eafa', dx: -1, dy: 1, a: 0.35 + 0.6 * fl }, { col: '#7ac8e8', dx: 0, dy: -1, a: 0.3 + 0.3 * pk }] } });
      if (C.cur.sps.me) C.monShadow(S.me[0], S.me[1] - 3, 1.6 * S.mk, { id: 'me', a: 0.4, len: 0.1, skew: -0.4, ft: S.ftm, col: '#02070b' }); C.contact(S.me[0], S.me[1] - 4, 58 * S.mk, { a: 0.85, col: '#02070b', sy: 0.2 });
      /* Lynet nær: på dropet og smellet slår det ned i havet foran kysten. */
      for (const L of A.L || []) if (L.s >= 500) { const a = flick(L.d) * L.k; if (a > 0.08) { const x = 256 + L.a * 210; C.bolt(x + (rnd(L.s, 3) - 0.5) * 70, -10, x, 150 + 30 * rnd(L.s, 4), { seed: L.s, col: '#b8d4ff', core: '#ffffff', w: 2.6, a, br: 3, depth: 6 }); } }
      rainFx(A, t, k, 0.75 + 0.25 * pk); if (pk > 0.02) C.parts('rain', { n: 70, seed: 31, cols: ['#9fb4c6', '#d4e2ee'], a: 0.42 * pk, spd: 2.2, wind: -1.1, z: [0.2, 0.6] });   /* høljregn etter Primal, som i filmen */
      P.bloom = 0.3 + 0.25 * fl + 0.12 * pk; P.bloomT = 0.72; P.grain = 0.04; P.vig = 0.48 + 0.12 * p2 + 0.1 * pk; P.vigc = '#01050a';
      P.grade = { tint: [0.95, 1, 1.05], con: 1.1, sat: 1.04 - 0.06 * pk, exp: 1.05 + 0.2 * fl - 0.05 * pk };
      if (A.drop && A.drop.on) P.sh = (P.sh || 0) + 1.6 * A.drop.hk; if (A.drop && A.drop.sl > 0) P.sh = (P.sh || 0) + 3 * A.drop.sl * A.drop.sl;
    },
    fig: { models: ['kyogre', 'kyogre_primal'], at: [362, 228], me: [132, 452],   /* vannlinja hans og føttene til din egen med 3D-figuren (oppstillingen fra Black/White); at er der
      kampskjermen setter boksen (.arena.fig3 .bs.foe i style.css ved --cz 1, som Groudon), så treffene og effektene lander på figuren */
      make(S, K, T) { const g = S.gr = kyFig({ mip: 1 }), p = S.pg = kypFig({ mip: 1 }); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.forms = [g, p]; p.root.scale.setScalar(KS * PS); },
      /* 2b.3 (Jazz 20.11: «Bølgene dekker også til han så han må flyte høyere opp», gjelder også arenaen): han ligger høyere i vannet, så ingen bølge skjuler ham (før: y 0,15 og 0,1) */
      form: (S, pr) => pr ? { f: S.pg, y: 0.62, stand: [{ Neck: [0, -0.08, 0], '*Shoulder': [0, 0, 0.1] }, 1], duck: DUCK, roar: ROAR, rk: 0.45 } : { f: S.gr, y: 0.8, stand: [{ Neck: [0, -0.06, 0] }, 1], duck: DUCK, roar: ROAR, rk: 0.5 },
      idle(f, t) { SWIM(f, t, 0.35, 1.3); f.add({ Neck: [0, 0.03 * sin(t * 0.8), 0.05 * sin(t * 0.45)], Jaw: [0, -0.04 - 0.03 * sin(t * 2), 0] }, 1); },
      glow(S, f, t, st, pr) { if (pr) lines(f, 1.3 + 0.3 * sin(t * 3.1) + 0.6 * (S.drop && S.drop.hk || 0), 1); else lines(f, 0.75 + 0.5 * st.p2 * (0.6 + 0.4 * sin(t * 4)), 0); },
      ink2: () => 0.85, turn: 0.4 },
  });
  /* ===================== Filmene: introen 'c3:382' og Primal 'c3:382p' =====================
     Fra sparringen 20.11 (skisse 2 av introen og skisse 4 av Primal: rekkefølgen, tidene i låta og hva som skjer er låst av Jazz, work/raids3d/kyogre/ideer.md og
     RAIDS.md nr. 41), bygget ut av Fable i 2b.3 (stormen, havet, sprutet, lyset, tråleren og brølet: work/RAIDS3D.md, «Bygget av Fable natt til 24.11»).
     'c3:382' er introen: filmens tid = tiden i låta (fra 0:00), brølet på 0:41,52 og navnet 1,4 s etter.
     'c3:382p' er Primal: filmens tid = låta − 195,7 (fra narhval-tonen 3:15,7); kameraet står over vannet hele tiden (Jazz 20.11).
     Ringbølgene (uRH), stormsonen (uStm) og lyset i dypet (uDL) er havets egne valg i raid3d.js. */
  {
    const lookS = (S, t, P, q, sn) => { look(S, t, P, q, sn); const gr = S.grey || 0; P.grade.sat *= 1 - 0.4 * gr; P.grade.con *= 1 - 0.06 * gr; };

    /* ---------- Introen (skisse 2 fra sparringen; Jazz 20.11, rettelsene på skisse 1) ----------
       «store ting beveger seg mer langsomt og voldsomt med stor kraft»: havet har sin egen, langsommere tid (TS), så dønningene er riktige for en enhet på rundt 8 m
       (en tråler på 21 m er 2,6 enheter, Kyogre rundt 150 m), og sprutet stiger like høyt, men bruker nesten tre ganger så lang tid (SLOW).
       1 Stormen filmes · 2 skyggen kommer inn, glir under båten og er helt ute før klippet · 3 noe stort kommer nedenfra · 4 finnene bryter flaten på hver side av båten,
       ryggen hever seg som en øy, og båten glir av og velter · 5–6 ringbølgene · 7 forvarselet og brølet med lyn bak ham (låst), bare havet foran ham. */
    /* Rettelse 3 (Jazz 24.11 kl. 17:12): ny rekkefølge. CW: klippet til bølgen mot klippen, CL–CL3: den knuser; PASS: skyggen kommer inn under båten, MID: midten under
       båten (farten i bildet som før), LY: lynet viser ham; B6: noe stort kommer; UP: finnene; HIT: båten i vannet; SLAM: slaget med finnene. */
    const QI = { LY0: 1.51, CW: 4.57, CL: 7.66, CL2: 9.08, CL3: 10.73, PASS: 13.2, MID: 16.29, LY: 16.9, W1: 17.9, W2: 19.11, OUT: 19.6, B6: 20.06, W3: 23.03, W4: 25.12,
      UP: 28.36, LIFT: 29.03, HIT: 31.91, BH: 33.59, S5: 34.6, SLAM: 35.51, DK: 39.24, RO: 41.52, NM: 42.92, END: 46 };
    const TS = 0.48, SLOW = 0.35;   /* havets tid og tiden i sprutet (se over) */
    const KYH = 0.9;                /* hvor høyt han ligger når han er oppe (skisse 1: 0,25). Han rir på dønningene, og ingen bølge skal skjule ham (Jazz 20.11) */
    const BT = [0, 2.5];            /* båten (x, z): rett over hodet hans, mellom finnene (han kommer opp med hodet mot kameraet, +Z). Hodet løfter den høyest */
    /* Skyggen under båten går jevnt i bildet (Jazz 24.11: «gjør også at kyogre svømmer jevnt fart under båten i klippet»). Kameraet i bilde 2 (CAM2) står 7° skrått,
       så en jevn fart i havet (før: 8 enheter i sekundet) gikk 134 px/s nederst i bildet og 106 px/s øverst. Nå går midten av skyggen jevnt i bildet (128 px/s):
       snuten (11,5 foran midten) kommer inn nederst på slaget 0:04,57, midten er under båten i lynet 0:07,66 som før, kroppen er ute øverst 0:10,28 og halen
       rundt 0:10,8, før vinduet slutter 0:11,33 (før forsvant halen brått der).
       ndc(z) = høyden i bildet (−1 nederst, 1 øverst) for et punkt i havet under kameraet, zAt(n) = det motsatte. */
    const CAM2 = [BT[0] + 0.6, 26, BT[1] + 3.6, BT[0] + 0.6, 0, BT[1] + 0.4, 52];
    const PASSZ = (() => { const [, cy, cz, , ty, tz, fov] = CAM2, L = Math.hypot(ty - cy, tz - cz), fy = (ty - cy) / L, fz = (tz - cz) / L, k = Math.tan(fov * PI / 360);
      const ndc = z => (cy * fz + (z - cz) * fy) / (k * ((z - cz) * fz - cy * fy)), zAt = n => cz + cy * (fz + n * k * fy) / (n * k * fz - fy);
      const n0 = ndc(2.9), v = (n0 - ndc(zAt(-1) + 11.5)) / (QI.MID - QI.PASS);
      return t => zAt(n0 + v * (t - QI.MID)); })();   /* rettelse 3: inn 0:13,2, midten under båten 0:16,29, halen ute rundt 0:19,4 (før klippet 0:20,06) */
    const RK = [[-17, -7, 3.6, 8, 41], [21, -13, 4.4, 11, 43], [-27, 10, 3, 6, 47]];   /* sjøstakkene nær ham: x, z, r, h, frø */
    /* Ringbølgene: [start, stakken den knuser mot (−1: ingen), når den knuser, høyde]. Hver større og raskere (lange bølger går fortere). */
    const RINGS = [[QI.SLAM, 1, 38.53, 1.6], [QI.RO + 0.05, -1, QI.RO + 5, 1.9]];   /* rettelse 3: ett slag (før tre ringer) */
    const ringAt = (i, t) => { const [t0, rk, tc, A] = RINGS[i]; if (t < t0) return null; const d = rk >= 0 ? Math.hypot(RK[rk][0], RK[rk][1]) - RK[rk][2] * 0.6 : 34, r0 = rk >= 0 ? 8 : 12, R = r0 + (t - t0) * (d - r0) / (tc - t0);   /* rettelse 2: starter ved finnene (8) og utenfor hodet i brølet (12); før 4, og brølets ring løftet havet over hodet */
      return { R, a: A * min(1, (t - t0) / 0.9) * Math.sqrt(9 / max(9, R)) * (1 - seg(R, 40, 58)) }; };
    /* ---------- Rettelse 2 (Jazz 24.11 om 0:25–0:46) ----------
       «Syns bevegelsene her også er veldig stive», «det skjer ingenting etter det, han bare står der. Det må skje noe» og «Når han brøler så forsvinner også hode ned
       under vann litt». Fra 0:23,03 er han en tung, levende kropp. Alt går gjennom nøklene i en glatt kurve (hs: farten går gjennom hver nøkkel); før stanset kf med io
       ved hver nøkkel, og det var det stive. Han ruller båten av seg, og hver ringpuls er et slag med finnene (SL): de løftes mens vannet fosser av dem og kroppen synker
       litt, og slås ned i havet på pulsen; kroppen kastes opp av slaget og gynger seg til ro. 0:28,36 begge, 0:31,91 den venstre med kroppen rullet over på siden (som
       en knølhval som slår med brystfinnen), 0:35,51 begge med brystet løftet og halen som vipper opp etterpå: hver større. Mellom slagene snur han seg mot oss.
       Finnene er bøyelige: hvert ledd henger FD sekunder etter det forrige (FK av forskjellen), så tuppen følger etter og slår ned sist. Tidene er låtas (ringene er låst).
       hs(t, [[t, v, fart?], …]): en glatt kurve gjennom nøklene; farten i en nøkkel er snittet av naboene, 0 i endene, eller den som står (slagene: fart inn i vannet). */
    const hs = (t, P) => { const n = P.length; if (t <= P[0][0]) return P[0][1]; if (t >= P[n - 1][0]) return P[n - 1][1]; let i = 0; while (t > P[i + 1][0]) i++;
      const m = j => P[j][2] != null ? P[j][2] : j === 0 || j === n - 1 ? 0 : (P[j + 1][1] - P[j - 1][1]) / (P[j + 1][0] - P[j - 1][0]);
      const a = P[i], b = P[i + 1], d = b[0] - a[0], u = (t - a[0]) / d, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * a[1] + (u3 - 2 * u2 + u) * m(i) * d + (3 * u2 - 2 * u3) * b[1] + (u3 - u2) * m(i + 1) * d; };
    /* Kroppen: KD hvor høyt over flytehøyden (KYH + havet), KP snuten (+ ned), KR rullen (+ løfter venstre side, +x), KY dreiningen. Finnene: KFL og KFR ('*Shoulder' z:
       + opp; 0,12 ligger på vannet). KN nakken (+ LØFTER hodet på denne modellen, målt 24.11 med nakke.js; kommentaren ved posene under sier det motsatte), KHP hoftene
       (− løfter halefinnene). */
    /* Rettelse 3 (Jazz om v7): «Fortsatt veldig stivt, og man ser bare at figuren er på skrå for å få av båten, det trengs ikke, ønsker bare at vingene er mer naturlig.
       Samme når den slår.» Kroppen ligger rett (ingen rull: KR er tom, bare gyngingen fra havet), snuten nesten i ro; bevegelsen er i finnene. Nye tider: finnene bryter
       flaten 0:28,36, båten sklir av og treffer vannet 0:31,91, og ett slag 0:35,51 (finnene løftes høyt med tuppene hengende etter og slås ned). */
    const KD = [[QI.UP, -7.5], [QI.UP + 0.97, -4.75], [QI.UP + 1.97, -2.3], [QI.UP + 2.67, -0.55], [QI.UP + 3.27, 0.38], [QI.UP + 3.9, 0.3], [QI.UP + 4.7, 0.0], [34.2, -0.06],
      [35.1, -0.18], [35.51, -0.12], [35.9, 0.32], [36.6, 0.06], [37.4, -0.04], [38.5, 0.1], [39.3, 0.12], [40.3, 0.08], [41.3, 0.06], [41.52, 0.12], [41.9, 1.55], [42.4, 1.45],
      [43.0, 1.32], [44.2, 0.98], [46, 0.75]];
    const KP = [[QI.UP, 0], [QI.UP + 1.4, -0.05], [QI.UP + 2.6, -0.02], [QI.UP + 3.6, 0.01], [QI.UP + 4.6, 0], [35.51, 0], [35.9, -0.02], [36.8, 0], [41.52, -0.02],
      [41.9, -0.17], [43.0, -0.14], [44.5, -0.09], [46, -0.07]];
    const KR = [[QI.UP, 0], [46, 0]];
    const KY = [[QI.UP, 0], [33.4, 0], [34.2, -0.04], [35.2, -0.08], [36.4, -0.24], [37.6, -0.38], [38.45, -0.4]];
    const KFL = [[QI.UP, 0.75], [QI.UP + 0.6, 0.82], [QI.UP + 1.4, 0.84], [QI.UP + 2.0, 0.6], [QI.UP + 2.7, 0.28], [QI.HIT, 0.12], [32.7, 0.2], [33.5, 0.1],
      [34.1, 0.28], [34.65, 0.66], [35.05, 0.88], [35.2, 0.9, 0], [35.51, -0.1, -5], [35.66, -0.2], [36.1, 0.0], [36.9, 0.13], [37.8, 0.15], [38.6, 0.12]];
    const KFR = [[QI.UP, 0.75], [QI.UP + 0.65, 0.8], [QI.UP + 1.45, 0.82], [QI.UP + 2.1, 0.62], [QI.UP + 2.8, 0.3], [QI.HIT + 0.05, 0.13], [32.8, 0.18], [33.6, 0.1],
      [34.15, 0.26], [34.7, 0.62], [35.08, 0.84], [35.22, 0.86, 0], [35.53, -0.08, -5], [35.68, -0.18], [36.12, 0.0], [36.9, 0.12], [37.8, 0.14], [38.6, 0.12]];
    const KN = [[QI.UP, 0], [QI.UP + 0.9, 0.06], [QI.UP + 2.0, 0.1], [QI.UP + 3.0, -0.02], [QI.UP + 3.8, -0.05], [QI.UP + 5.0, 0.02], [34.6, 0.06], [35.51, -0.08],
      [36.2, -0.02], [37.2, 0.02], [38.4, 0]];
    const KHP = [[QI.UP, 0], [35.0, 0], [35.51, 0.06], [35.95, -0.22], [36.5, -0.04], [37.3, 0.02], [38.2, 0]];
    const FD = 0.11, FK = 0.95;   /* finneleddene: hvert ledd FD sekunder etter det forrige (rettelse 3: før 0,06 og 0,8, «fortsatt veldig stivt»: nå krummer hele finnen seg) */
    const KYM = t => ({ dy: hs(t, KD), pit: hs(t, KP), roll: hs(t, KR) + 0.03 * sin(t * 0.37) * seg(t, QI.HIT, QI.HIT + 1.5), yaw: hs(t, KY) + 0.05 * sin(t * 0.3) });
    /* Benene fra 0:23,03: svømmingen fra før tones ut, finnene med etterslep og en svak bølge ut mot tuppen, nakken og hodet (hodet litt etter), halen i et langsomt slag. */
    const KYB = (g, t) => { const fo = 1 - io(seg(t, QI.UP, QI.UP + 0.7)); if (fo > 0) SWIM(g, t, 0.8 * fo, 1.1);
      const w = c01((t - QI.UP) / 1.5), sw = 0.6 * c01((t - QI.UP) / 2);
      for (const [s, P, sg, ph] of [['L', KFL, 1, 0], ['R', KFR, -1, 1.7]]) { const a = [0, 1, 2, 3].map(k => hs(t - k * FD, P)), fl = k => 0.11 * w * sin(t * 1.6 + ph - k * 0.95) - 0.13 * w * c01(a[0] / 0.8);   /* en langsom bølge ut mot tuppen hele tiden, og tuppen henger under sin egen tyngde når finnen er løftet */
        g.add({ [s + 'Shoulder']: [0, 0, sg * a[0]], [s + 'Arm']: [0, 0, sg * (FK * (a[1] - a[0]) + fl(1))], [s + 'ForeArm']: [0, 0, sg * (FK * (a[2] - a[1]) + fl(2))], [s + 'Hand']: [0, 0, sg * (FK * (a[3] - a[2]) + fl(3))] }, 1); }
      const nk = hs(t, KN), nk2 = hs(t - 0.14, KN);
      g.add({ Neck: [0, nk, 0], Head: [0, 0.55 * nk2, 0], Hips: [0, hs(t, KHP) + 0.07 * sin(t * 0.95 + 1.2) * sw, 0], Tail1: [0, 0.13 * sin(t * 0.95 + 0.4) * sw, 0], Tail2: [0, 0.15 * sin(t * 0.95 - 0.4) * sw, 0] }, 1); };
    /* ---------- BEVEGELSEN i introen etter Fable (Opus 25.11; se «BEVEGELSEN» øverst i fila) ----------
       Nøkkelposene (arket: work/raids3d/kyogre/bevegelse/poser.jpg): I1 finnene bryter flaten (løftet, tuppene henger etter i vannet) · I2 ryggen hever seg som en øy
       (brystet og snuten leder, finnene sprer seg og synker) · I3 oppe (litt forbi, og et lite nikk når oppdriften snur) · I4 opptrekket til slaget (finnene høyt, tuppene
       henger, kroppen synker litt) · I5 slaget 0:35,51 (finnene slås ned med roten først og tuppene etter, to frosne bilder, kroppen kastes opp, halen etter) · I6 forvarselet
       0:39,24 (et lite dykk motsatt vei, så samler han seg: snuten opp, finnene ned, kroppen synker) · I7 brølet 0:41,52 (kjeven først, så brystet, nakken, hodet, finnene og
       halen; stive fjærer i kastet) · I8 holdet (kjeven former skriket i stavelser, skjelv under 3 Hz) · I9 navnet (hodet leder ned, kjeften lukkes uten å gå forbi) · I10 livet
       (pusten, finnene flyter på dønningene, halen svinger sakte, blikket i små vendinger). Roten (KYM) er dagens til 0:33,7, så båten (boatSim) og lydsengen står. */
    const MVI = (() => {
      const UP = QI.UP, RO = QI.RO, T0 = UP - 1.0, Z3 = [0, 0, 0], RJ = 33.7;   /* T0: fjærene starter under vann (han synes fra 0:28,36), så de alt er i gang når han kommer opp */
      /* Roten: dagens til RJ (båten ligger på ham til 0:33,59), så nye nøkler som starter med dagens fart (hs med fart i den første nøkkelen). */
      const v0 = (P, t) => [t, hs(t, P), (hs(t + 0.001, P) - hs(t - 0.001, P)) / 0.002];
      const KD2 = [v0(KD, RJ), [34.35, -0.07], [35.1, -0.17], [35.5, -0.15], [35.93, 0.3], [36.6, 0.08], [37.4, -0.03], [38.45, 0.1], [38.95, 0.084, 0], [39.75, 0.19], [40.7, 0.16], [41.1, 0.13], [41.3, -0.02, 0],
        [41.46, 0.12], [41.6, 0.86], [41.76, 1.52], [42.1, 1.58], [42.5, 1.54], [43.0, 1.43], [44.2, 1.05], [46, 0.82]];
      const KP2 = [v0(KP, RJ), [34.4, 0.005], [35.15, 0.025], [35.5, 0.02], [35.85, -0.045], [36.5, 0.012], [37.3, -0.004], [38.45, 0], [38.95, 0.012, 0], [39.7, -0.035], [41.3, -0.05], [41.44, -0.045, 0],
        [41.62, -0.15], [41.8, -0.18], [42.5, -0.15], [43.0, -0.14], [44.5, -0.09], [46, -0.07]];
      /* Litt fram og tilbake (z): slaget skyver ham bakover og han glir tilbake, og i brølet kaster han seg litt fram mot oss (en bue, ikke en loddrett strek). */
      const KZ2 = [[RJ, 0], [35.2, 0], [35.55, -0.05], [36.2, -0.22], [37.4, -0.05], [38.45, 0], [38.95, 0.03], [39.9, -0.12], [41.3, -0.16, 0], [41.7, 0.3], [42.3, 0.38], [43.2, 0.3], [45, 0.1], [46.5, 0]];
      const kastR = t => io(c01((t - 41.25) / 0.08)) * (1 - io(c01((t - (RO + 0.55)) / 0.4)));   /* roten er stiv i brølet (skiftes mens han står i bunnen av krøket), myk ellers */
      const dyF = followV(t => [t < RJ ? hs(t, KD) : hs(t, KD2), t < RJ ? hs(t, KP) : hs(t, KP2), t < RJ ? 0 : hs(t, KZ2)], t => [mix(1.3, 3.4, kastR(t)), 0.62], RJ);
      const lv = t => c01((t - 43.2) / 1.6), lv0 = t => c01((t - 30.6) / 1.6);   /* livet etter navnet; og pusten, finnene og halen fra han er oppe */
      const KYM2 = t => { const yw = 0.045 * sin(PI * sm5(seg(t, UP + 0.3, UP + 3.9)));   /* han dreier seg litt mens han stiger og retter seg ut igjen (snuten går i en bue; båten merker ikke dreiningen); finnene bryter flaten som i dag */
        if (t < RJ) { const m = KYM(t); return { dy: m.dy, pit: m.pit, roll: m.roll, yaw: m.yaw + yw, z: 0 }; }
        const q = G3D.dbgKey ? [hs(t, KD2), hs(t, KP2), hs(t, KZ2)] : dyF(t), l = lv(t);
        return { dy: q[0] + 0.05 * l * sin(TAU * 0.09 * t + 0.4), pit: q[1] + 0.012 * l * sin(TAU * 0.09 * t - 0.9), roll: hs(t, KR) + 0.03 * sin(t * 0.37) * seg(t, QI.HIT, QI.HIT + 1.5) + 0.01 * sin(TAU * 0.07 * t + 1.1) * c01((t - 36) / 2), yaw: hs(t, KY) + 0.05 * sin(t * 0.3), z: q[2] }; };
      /* Stivheten i fjærene: stiv i slaget og brølet (følger de korte nøklene tett, så det kommer på slaget), litt stivere i forvarselet, myk ellers. Skiftes der målet
         står stille: i toppen av opptrekket (0:35,2), i bunnen av det lille dykket før forvarselet (0:38,95) og i krøket før brølet (0:41,3–0:41,44). */
      const win = (t, a, b, ui) => io(c01((t - a) / 0.1)) * (1 - io(c01((t - b) / ui)));
      const kastS = t => win(t, 35.08, 35.85, 0.4), kastB = t => max(win(t, 41.32, RO + 0.5, 0.45), 0.45 * win(t, 38.9, 39.6, 0.45)), kast = t => max(kastS(t), kastB(t));
      /* Gruppene: brystet (Spine: x rull, y snuten opp, z vri), nakken og hodet (y: + løfter snuten, z: blikket), kjeven (y: − åpner), skuldrene i felles pose (z: + løfter
         finnene; hver side har i tillegg sin egen kurve), armene (ROAR sin vri) og hoftene (y: + senker halen). Nøklene per gruppe er forskjøvet 1–3 bilder: den som leder,
         først (i brølet kjeven og roten → brystet → nakken → skuldrene → hodet → armene → hoftene; i forvarselet og ved navnet hodet først). */
      const J = v => [0, v, 0], DK = DUCK, RR = ROAR;
      const nk = (d, r) => [0, d * DK.Neck[1] + r * RR.Neck[1], 0], hd = (d, r) => [0, d * DK.Head[1] + r * RR.Head[1], 0], sh = (d, r) => [0, 0, d * DK['*Shoulder'][2] + r * RR['*Shoulder'][2]], ar = k => RR['*Arm'].map(x => x * k);
      const G = {
        ch: [[T0, Z3], [29.5, [0.012, 0.026, 0]], [30.9, [-0.01, 0.012, 0]], [31.75, [0.006, -0.018, 0]], [32.9, [0, 0.006, 0]], [33.8, Z3], [34.35, [0, -0.015, 0]], [35.12, [0.01, 0.045, 0]], [35.42, [0.008, 0.035, 0]],
          [35.58, [-0.012, -0.045, 0]], [36.15, [0.004, 0.016, 0]], [36.9, [0, -0.006, 0]], [37.9, Z3], [38.95, [0, -0.012, 0]], [39.5, [0, 0.04, 0]], [41.3, [0.006, 0.055, 0]], [41.48, [0.006, 0.055, 0]],
          [41.62, [-0.01, -0.02, 0]], [42.3, [-0.012, -0.026, 0]], [42.92, [-0.008, -0.02, 0]], [43.3, [-0.006, -0.016, 0]], [44.3, [0.002, -0.004, 0]], [45.4, Z3]],
        nk: [[T0, Z3], [29.2, [0, 0.05, 0]], [30.4, [0, 0.09, 0]], [31.4, [0, -0.02, 0]], [32.2, [0, -0.045, 0]], [33.4, [0, 0.02, 0]], [34.6, [0, 0.035, 0]], [35.47, [0, 0.025, 0]], [35.72, [0, -0.025, 0]], [36.4, [0, -0.008, 0]],
          [37.2, [0, 0.015, 0]], [38.5, Z3], [38.97, nk(-0.15, 0)], [39.55, nk(0.75, 0)], [41.3, nk(1, 0)], [41.46, nk(1, 0)], [41.66, nk(0, 1.1)], [41.98, nk(0, 1)], [42.45, nk(0, 1)], [42.72, nk(0, 1.04)], [42.92, nk(0, 1.02)],
          [43.42, nk(0, 0.93)], [44.25, nk(0, 0.06)], [45.2, Z3]],
        hd: [[T0, Z3], [29.15, [0, 0.03, 0]], [30.35, [0, 0.05, 0]], [31.35, [0, -0.012, 0]], [32.15, [0, -0.03, 0]], [33.3, [0, 0.012, 0]], [34.5, [0, 0.022, 0]], [35.5, [0, 0.015, 0]], [35.74, [0, -0.018, 0]],
          [36.4, [0, -0.006, 0]], [37.3, [0, 0.01, 0]], [38.45, Z3], [38.94, hd(-0.15, 0)], [39.5, hd(0.75, 0)], [41.3, hd(1, 0)], [41.48, hd(1, 0)], [41.7, hd(0, 1.12)], [42.02, hd(0, 1.02)], [42.47, hd(0, 1.02)], [42.75, hd(0, 1.05)],
          [42.92, hd(0, 1.03)], [43.22, hd(0, 0.7)], [43.95, hd(0, 0.05)], [44.9, Z3]],
        jw: [[T0, J(-0.004)], [31.95, J(-0.004)], [32.35, J(-0.07)], [32.9, J(-0.004)], [35.3, J(-0.004)], [35.5, J(-0.05)], [35.9, J(-0.004)], [38.95, J(-0.004)], [39.6, J(-0.15 * 0.75)], [41.3, J(-0.15)],
          [41.41, J(-0.15)], [41.58, J(-0.92)], [42.92, J(-0.9)], [43.18, J(-0.86)], [43.95, J(-0.004)]],
        sh: [[T0, Z3], [38.6, Z3], [38.97, sh(-0.15, 0)], [39.6, sh(0.75, 0)], [41.3, sh(1, 0)], [41.46, sh(1, 0)], [41.66, sh(0, 1.12)], [41.98, sh(0, 1)], [42.92, sh(0, 1)], [43.35, sh(0, 0.9)], [44.4, Z3]],
        ar: [[T0, Z3], [41.49, Z3], [41.68, ar(1)], [42.92, ar(1)], [43.45, ar(0.8)], [44.5, Z3]],
        hp: [[T0, Z3], [35.0, Z3], [35.42, [0, 0.06, 0]], [35.82, [0, -0.22, 0]], [36.4, [0, -0.04, 0]], [37.3, [0, 0.02, 0]], [38.5, Z3], [38.99, [0, 0.015, 0]], [39.65, [0, DK.Hips[1] * 0.75, 0]],
          [41.3, [0, DK.Hips[1], 0]], [41.54, [0, DK.Hips[1], 0]], [41.76, [0, RR.Hips[1], 0]], [42.92, [0, RR.Hips[1], 0]], [43.65, [0, 0.6 * RR.Hips[1], 0]], [44.8, Z3]] };
      const F = { ch: [1.2, 0.66, 2.8, 2.0], nk: [1.25, 0.7, 2.9, 1.6], hd: [1.4, 0.68, 3.0, 1.7], jw: [2.0, 0.64, 3.3, 2.2], sh: [1.1, 0.62, 2.9, 2.7], ar: [1.0, 0.62, 2.4, 2.0], hp: [0.95, 0.72, 2.2, 2.2] };   /* [myk, z, stiv i brølet, stiv i slaget] */
      const S = {}; for (const k in G) { const L = G[k], q = F[k], sp = followV(t => keyAt(L, t), t => [mix(mix(q[0], q[3], kastS(t)), q[2], kastB(t)), q[1]], T0); S[k] = t => G3D.dbgKey ? keyAt(L, t) : sp(t); }
      /* Finnene: skulderen følger dagens kurve (KFL/KFR, med slaget 0,035 s tidligere: fjæren henger litt etter, så finnene treffer vannet på 0:35,51) gjennom en fjær (myk,
         stiv i slaget), og finnen er en kjede (Arm, ForeArm, Hand) som henger etter skulderen og etter kroppen når den løftes (vannet holder igjen tuppene), slår forbi når
         den stanser, og henger under sin egen tyngde når den er løftet. Fingrene følger hånda. */
      const tidlig = P => P.map(q => q[0] > 34 && q[0] < 36.2 ? [q[0] - 0.035].concat(q.slice(1)) : q), KL2 = tidlig(KFL), KR2 = tidlig(KFR);
      const swim = t => { const fo = 1 - io(c01((t - UP) / 0.7)); return fo > 0 ? 0.8 * fo * 0.32 * sin(t * 1.1) : 0; };
      const kastF = t => max(win(t, 35.05, 35.9, 0.45), 0.6 * win(t, 41.32, RO + 0.6, 0.5), 0.5 * (1 - io(c01((t - (UP + 0.5)) / 0.6))));   /* stivere i de første bildene: finnene bryter flaten som i dag */
      const shF = P => followV(t => [hs(t, P) + swim(t)], t => [mix(1.6, 4.0, kastF(t)), 0.7], T0);
      const SL2 = shF(KL2), SR2 = shF(KR2);
      const shZ = (P, t) => (G3D.dbgKey ? hs(t, P) + swim(t) : (P === KL2 ? SL2 : SR2)(t)[0]) + S.sh(t)[2] + 0.03 * pust(t, 30.6, 4.6, 61) * lv0(t);
      const sagOf = (P, t) => -0.12 * c01((hs(t, P) + swim(t) - 0.18) / 0.6) * c01((t - UP) / 1.5) + 0.05 * (1 - sm5((t - UP - 0.4) / 0.9));   /* tyngden i tuppene kommer når finnen er ute av vannet (som i dag: finnene bryter flaten rette) */
      const bump = (t, a0, a1, b0, b1) => sm5((t - a0) / (a1 - a0)) * (1 - sm5((t - b0) / (b1 - b0)));
      const rest = t => bump(t, 31.6, 32.4, 33.9, 34.3) + bump(t, 36.3, 37.1, 38.5, 38.95) + sm5((t - 43.3) / 1.0);   /* han ligger stille: finnene og halen er myke og bølger (som dagens levende bølge, men fra kjeden) */
      const dyR = t => t < RJ ? hs(t, KD) : hs(t, KD2);
      const fin = (P, ph, fk) => kjede({ n: 3, t0: T0, fo: 0.86, lim: 0.7, fz: t => [fk * mix(mix(0.95, 0.5, rest(t)), 1.7, kastF(t)), mix(0.58, 0.45, rest(t))],
        drive: t => [0, 0, shZ(P, t) + 0.05 * dyR(t) + (0.1 * sin(TAU * 0.24 * t + ph) + 0.04 * sin(TAU * 0.11 * t + 2 * ph)) * rest(t)],
        pose: (t, i) => [0, 0, sagOf(P, t) * (0.7 + 0.15 * i)] });
      const FL = fin(KL2, 0, 1), FR = fin(KR2, 1.9, 0.93);
      /* Halen: en kjede fra roten og ut (Tail1, Tail2 og halefinnene), som henger etter hoftene, kroppens stamp og løftet, og svinger sakte når han ligger stille. */
      const life = t => c01((t - 32.6) / 2) * (1 - 0.6 * kastR(t));
      const kastT = t => max(win(t, 35.05, 35.9, 0.45), 0.6 * io(c01((t - 40.9) / 0.45)) * (1 - io(c01((t - (RO + 0.6)) / 0.6))));   /* halen skifter stivhet langsomt (den svinger hele tiden) */
      const tail = kjede({ n: 5, t0: T0, fo: 0.86, lim: 0.6, fz: t => [mix(mix(0.8, 0.45, rest(t)), 1.6, kastT(t)), 0.62],
        drive: t => { const r = t < RJ ? KYM(t) : { dy: hs(t, KD2), pit: hs(t, KP2) }, h = G3D.dbgKey ? keyAt(G.hp, t)[1] : S.hp(t)[1];
          return [0, -h + 0.06 * r.dy + 0.6 * r.pit + (0.08 * sin(TAU * 0.15 * t + 2.1) + 0.03 * sin(TAU * 0.07 * t)) * max(life(t), rest(t)), 0.06 * sin(TAU * 0.085 * t + 0.7) * life(t)]; } });
      /* Blikket: hodet snur seg i små vendinger mot nye punkter (hver 2,6–3,6 s), og nakken kommer etter (Groudon: «blikket i små vendinger»): når han ligger og venter
         etter slaget (0:36,9–0:38,6) og etter navnet. */
      const gz = t => { const u = (t - 36.6) / 2.4; if (u <= 0) return 0; const k = floor(u), f = u - k, val = j => j < 1 ? 0 : 0.07 * (rnd(j, 51) - 0.5) * 2; return mix(val(k), val(k + 1), sm5(f / 0.42)) + 0.012 * sin(TAU * 0.13 * t + 0.8); };
      const gw = t => c01((t - 36.7) / 0.6) * (1 - c01((t - 38.55) / 0.4)) + lv(t) * c01((t - 43.9) / 0.6);
      const ZZ = () => [Z3, Z3, Z3, Z3, Z3];
      return {
        KYM: KYM2, kast,
        /* Stillingen: gruppene, finnene (begge sider) og halen, pluss holdet (stavelser og skjelv) og livet (pusten, blikket). fl = { L, R }: finnene flyter på dønningene
           (vinkelen fra havet, regnet i act). Gir hvor åpen kjeften er (0 lukket, 1 brølet, også forbi 1) til gnistene, øynene og linjene. */
        pose(g, t, fl) { const q = {}; for (const k in S) q[k] = S[k](t); const dbg = G3D.dbgKey;
          const op = -min(0, q.jw[1]) / 0.9, hold = dbg ? 0 : c01((op - 0.55) / 0.3) * (1 - c01((t - 43.05) / 0.3)), l = dbg ? 0 : max(lv(t), 0.6 * lv0(t) * (1 - c01((t - 38.6) / 0.5))), b = dbg ? 0 : pust(t, 30.6, 4.6, 61);
          const syl = hold * 0.06 * (0.5 - pust(t, RO + 0.22, 0.74, 41)), w = dbg ? 0 : gw(t), g1 = w * gz(t), g2 = w * gz(t - 0.32);
          g.add({ Spine: [q.ch[0], q.ch[1] + 0.014 * b * l, q.ch[2]], Neck: [0, q.nk[1] + 0.012 * hold * X.noise(t, 47, 1.2) + 0.009 * b * l, q.nk[2] + 0.6 * g2],
            Head: [0, q.hd[1] + 0.01 * hold * X.noise(t, 55, 2.4), q.hd[2] + 0.014 * hold * X.noise(t, 53, 2.1) + g1], Jaw: [0, kj(q.jw[1] + syl + 0.022 * hold * X.noise(t, 51, 2.6) - 0.015 * b * l), 0],
            '*Arm': q.ar, Hips: q.hp }, 1);
          for (const [s, P, C, sg] of [['L', KL2, FL, 1], ['R', KR2, FR, -1]]) { const d = dbg ? [Z3, Z3, Z3] : C(t), sag = sagOf(P, t), fz = fl ? fl[s] || 0 : 0;
            g.add({ [s + 'Shoulder']: [0, 0, sg * shZ(P, t)], [s + 'Arm']: [0, 0, sg * (d[0][2] + 0.7 * sag + fz)], [s + 'ForeArm']: [0, 0, sg * (d[1][2] + 0.85 * sag + fz)], [s + 'Hand']: [0, 0, sg * (d[2][2] + sag)] }, 1);
            for (const [k, f] of [['FingerA', 0.55], ['FingerB', 0.7], ['FingerC', 0.6], ['FingerD', 0.45]]) g.add({ [s + k]: [0, 0, sg * f * d[2][2]] }, 1); }
          const tl = dbg ? ZZ() : tail(t);
          g.add({ Tail1: [0, tl[0][1], tl[0][2]], Tail2: [0, tl[1][1], tl[1][2]], Tail3: [0, 0.5 * tl[2][1], 0], '*FeelerB1': [0, tl[2][1], 0], '*FeelerB2': [0, tl[3][1], 0], '*FeelerB3': [0, tl[4][1], 0], '*FeelerB4': [0, 0.6 * tl[4][1], 0], '*FeelerC1': [0, 0.6 * tl[3][1], 0] }, 1);
          return { rw: op, dk: c01(keyAt([[38.95, 0], [39.6, 0.75], [41.3, 1], [41.52, 0]], t)) }; } };
    })();
    /* Slagene: [tid, side (1 venstre, +x; −1 høyre), størrelse]. Kronen står der finnen treffer (8 ut fra midten, 1,5 fram), dreid med ham i treffet. */
    const SL = [[QI.SLAM, 1, 2], [QI.SLAM + 0.02, -1, 2]];   /* rettelse 3: ett slag med begge finnene (før tre) */
    const SLZ = [{ r: 2.4, out: 2.6, h: 8, up: 1.4 }, { r: 2.9, out: 3.2, h: 10, up: 1.5 }, { r: 3.1, out: 3.4, h: 11.5, up: 1.6 }];
    const slXZ = (s, t0, lx, lz) => { const yw = KYM(t0).yaw; lx = lx == null ? 8 * s : lx; lz = lz == null ? 1.5 : lz; return [lx * cos(yw) + lz * sin(yw), -lx * sin(yw) + lz * cos(yw)]; };
    /* Båten sklir av skrått framover (rettelse 2): fra hodet (BT) til foran venstre finne, der den lander (BL), kantrer og flyter med kjølen opp til den første
       ringbølgen skyller over den. */
    const BL = [4.57, 7.9];   /* rettelse 4: der boatSim lander (før BT + (5,6, 4,6)) */
    /* Rettelse 3: bølgen mot klippen (0:04,57–0:13,2). Den høyeste stakken i kysten (STACKS[5]); en dønning ruller inn fra venstre i stillheten i låta og knuser mot den
       på 0:07,66 med lynet bak (og igjen 0:09,08 og 0:10,73). Dønningen er en ringbølge (uRH, plass 3) fra et punkt 50 enheter ute, så fronten er nesten rett. Den
       kommer inn fra det åpne havet (+Z) mot kysten og treffer forsiden av stakken, der kameraet står. */
    const CS = STACKS[5], CWD = [-0.2, -0.98], CWC = [CS[0] - CWD[0] * 50, CS[1] - CWD[1] * 50], CWF = [CS[0] - CWD[0] * CS[2] * 0.7, CS[1] - CWD[1] * CS[2] * 0.7];
    const CWT = [QI.CL, QI.CL2, QI.CL3, QI.CW + 0.05], CWR = Math.hypot(CWF[0] - CWC[0], CWF[1] - CWC[1]);
    const cwAt = t => { if (t < QI.CW - 0.3 || t > QI.PASS) return null; const R = 22 + (t - QI.CW + 0.04) * (CWR - 22) / (QI.CL - QI.CW + 0.04);
      return { R, a: 4 * io(seg(t, QI.CW - 0.3, QI.CL - 0.6)) * (1 - 0.7 * seg(t, QI.CL, QI.CL + 2.5)) * (1 - seg(t, QI.PASS - 0.6, QI.PASS)) }; };
    /* Sprut i stor målestokk: samme bane, men tiden går SLOW ganger så fort (farten × s, tyngden × s², levetiden og forsinkelsen ÷ s). */
    const slowP = (n, init, o, s) => K.pts(n, i => { const q = init(i); return Object.assign({}, q, { v: q.v.map(v => v * s), b: (q.b || 0) / s, l: (q.l || 1) / s }); }, Object.assign({}, o, { g: (o.g || 0) * s * s }));
    const slowIn = (p, s) => { const g = p.geometry, V = g.attributes.aV, A = g.attributes.aS; for (let i = 0; i < V.count; i++) { V.setXYZ(i, V.getX(i) * s, V.getY(i) * s, V.getZ(i) * s); A.setY(i, A.getY(i) / s); A.setZ(i, A.getZ(i) / s); }
      V.needsUpdate = A.needsUpdate = true; p.material.uniforms.uG.value *= s * s; };
    /* Ryggen hans, målt på figuren med stråler ovenfra (q.js, 20.11): høyden over roten langs kroppen (lz: fram mot hodet) og hvor bred den er (rundt 3,6 til hver side).
       Han kommer opp med hodet mot +Z (yaw 0), så lz = z og lx = x. Båten ligger på ryggen når han kommer opp. */
    const PROF = [[-9, -0.6], [-6, 0.36], [-3, 1.31], [0, 2.19], [3, 2.4], [6, 1.6], [9, -0.5]];
    const backTop = (ry, x, z, rl, pt) => { const lz = z, lx = x; if (lz <= -9 || lz >= 9) return -1e9; let i = 0; while (PROF[i + 1][0] < lz) i++; const [z0, h0] = PROF[i], [z1, h1] = PROF[i + 1];
      const w = 1 - Math.pow(abs(lx) / 3.6, 6); return w <= 0 ? -1e9 : ry + mix(h0, h1, (lz - z0) / (z1 - z0)) * Math.sqrt(w) * cos(rl || 0) * cos(pt || 0) + lx * sin(rl || 0) - lz * sin(pt || 0); };   /* rettelse 2: med rullen og snuten (små vinkler) */
    /* Rettelse 4 (Jazz om v8): «se på hvordan båten detter av kyogre og hvor raskt og fysikken bak det. Per nå er det ikke naturlig ras fra høyde og måten den sklir
       ut i vannet og i vannet etterpå ser ut som en lekebåt». Før fulgte båten flanken ned (3 enheter på 0,15 s) og stoppet på ett bilde i vannet. Nå er den et tungt
       legeme: den flyter til ryggen når den, løftes med ham, sklir på våt hud (BMU) med vannet som fosser av ryggen (BPUSH), kastes av når ryggen bremser raskere enn
       tyngden (BG, filmens tyngde for faste ting: tregere enn plaskene, PG, så den er stor), tipper over kanten og faller fritt. Regnet én gang (240 steg i sekundet)
       fra 0:28,36 til den treffer vannet; i vannet: se båten i act. th er helningen (opp-pila vippet mot (x, z), vinkelen er lengden), yw dreiningen. */
    const BG = 3.0, BMU = 0.08, BPUSH = [1.56, 2.08];
    const boatSim = (su, KM) => { KM = KM || KYM;
      const dt = 1 / 240, sea = (x, z, t) => K.seaH(su, x, z, t * TS);
      const top = (x, z, t) => { const m = KM(t); return backTop(KYH + 0.8 * sea(0, 0, t) * io(seg(t, QI.UP, QI.UP + 2.57)) + m.dy, x, z, m.roll, m.pit); };
      const fl = (x, z, t) => sea(x, z, t) - 0.08 + 0.6 * io(seg(t, QI.UP, QI.LIFT));   /* vannet hever seg over ryggen hans før han bryter flaten */
      const gr = (f, x, z, t) => { const e = 0.12; return [(f(x + e, z, t) - f(x - e, z, t)) / (2 * e), (f(x, z + e, t) - f(x, z - e, t)) / (2 * e)]; };
      const tilt = g => { const G = Math.hypot(g[0], g[1]); return G < 1e-6 ? [0, 0] : [-g[0] * Math.atan(G) / G, -g[1] * Math.atan(G) / G]; };
      let t = QI.UP, x = BT[0], z = BT[1], y = fl(x, z, t), vx = 0, vy = 0, vz = 0, md = 0, ta = -1, tc = -1, yw = 0.55, ywr = 0, lg = [0, 0];
      const th = [0, 0], om = [0, 0], A = [], spring = (tg, k) => { for (let i = 0; i < 2; i++) om[i] += (k * k * (tg[i] - th[i]) - 2 * k * om[i]) * dt; };
      while (t < QI.SLAM) {
        A.push(t, x, y, z, th[0], th[1], yw);
        if (md === 0) { spring(tilt(gr(fl, x, z, t)), 4); const yf = fl(x, z, t + dt); if (top(x, z, t + dt) > yf) { md = 1; tc = t; } else { vy = (yf - y) / dt; y = yf; } }
        if (md === 1) { let g = gr(top, x, z, t); if (!g.every(v => isFinite(v) && abs(v) < 40)) g = lg; lg = g; const G2 = g[0] * g[0] + g[1] * g[1], N = BG / Math.sqrt(1 + G2), pu = c01((t - tc) / 0.3) * (1 - seg(t - tc, 2.4, 3.0));
          let ax = -BG * g[0] / (1 + G2) + BPUSH[0] * pu, az = -BG * g[1] / (1 + G2) + BPUSH[1] * pu; const sp = Math.hypot(vx, vz);
          if (sp > 0.02) { ax -= BMU * N * vx / sp; az -= BMU * N * vz / sp; } else if (Math.hypot(ax, az) < BMU * N * 1.5) ax = az = 0;   /* står til kraften er større enn heftet */
          vx += ax * dt; vz += az * dt; const nx = x + vx * dt, nz = z + vz * dt, tn = top(nx, nz, t + dt), yb = y + vy * dt - 0.5 * BG * dt * dt;
          spring(tilt(g), 9); ywr += (0.16 * sp - ywr) * 2 * dt; x = nx; z = nz;   /* akterenden henger igjen, så den svinger litt mens den sklir */
          if (tn > -1e8 && tn >= yb - 1e-4) { vy = (tn - y) / dt; y = tn; } else { md = 2; ta = t; y = yb; vy -= BG * dt; } }
        else if (md === 2) { vy -= BG * dt; x += vx * dt; y += vy * dt; z += vz * dt; const sp = Math.hypot(vx, vz);
          if (t - ta < 0.35 && sp > 0.05) { om[0] += 1.8 * vx / sp * dt; om[1] += 1.8 * vz / sp * dt; }   /* tyngdepunktet går over kanten: den tipper dit den faller */
          const tn = top(x, z, t + dt); if (tn > y) { md = 1; y = tn; } }
        th[0] += om[0] * dt; th[1] += om[1] * dt; yw += ywr * dt; t += dt;
        if (md !== 0 && y <= sea(x, z, t) && top(x, z, t) < sea(x, z, t) + 0.05) break;
      }
      return { A, dt, tL: t, L: { x, y, z, vx, vy, vz, th: th.slice(), om: om.slice(), yw, ywr },
        at(t) { const n = A.length / 7, f = min(n - 1.001, max(0, (t - QI.UP) / dt)), i = floor(f), u = f - i, q = k => mix(A[i * 7 + k], A[i * 7 + 7 + k], u); return [q(1), q(2), q(3), [q(4), q(5)], q(6)]; } };
    };

    /* Tråleren (Jazz 20.11: «en større båt, ikke lekebåt»): skrog med baug, dekk, styrehus forut med lys i vinduene, mast med topplys, utriggere, galge og nettrommel akter. */
    const mkBoat2 = (K, T) => {
      const M = (a, b, o) => K.rockMat(Object.assign({ a, b, str: 0.2, sm: 0.6, hot: 0, lv: 0, tint: [0.08, 0.07, 0.06] }, o || {})), g = new T.Group(),
        hullM = M('#2a0e0c', '#6e2419'), blk = M('#0b0c0e', '#26282c'), wh = M('#77776f', '#d2d2c8', { tint: [0.12, 0.12, 0.12] }), deck = M('#3a3026', '#7a6a52'), grn = M('#14281c', '#355a40'), org = M('#7a2c08', '#e06a1c', { tint: [0.16, 0.08, 0.03] });
      const BX = (w, h, d, m, x, y, z, ry) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; g.add(o); return o; };
      const CY = (r0, r1, h, m, x, y, z, rx, rz) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 6), m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (rz) o.rotation.z = rz; g.add(o); return o; };
      /* skroget: rødbrunt med svart vannlinje og en lys rekke, spiss baug med bakk, og skansekledning akter */
      BX(0.86, 0.44, 2.0, hullM, 0, 0, -0.14); BX(0.87, 0.07, 2.0, blk, 0, -0.2, -0.14); BX(0.61, 0.44, 0.61, hullM, 0, 0, 0.86, PI / 4); BX(0.84, 0.18, 0.5, hullM, 0, 0.3, 0.8);
      BX(0.88, 0.045, 2.02, wh, 0, 0.165, -0.14); BX(0.63, 0.045, 0.63, wh, 0, 0.165, 0.86, PI / 4); BX(0.86, 0.14, 0.05, hullM, 0, 0.3, -1.13); BX(0.05, 0.12, 0.9, hullM, 0.415, 0.3, -0.68); BX(0.05, 0.12, 0.9, hullM, -0.415, 0.3, -0.68);
      BX(0.8, 0.05, 1.9, deck, 0, 0.24, -0.12);
      /* styrehuset i to høyder (2b.3): nedre hus med et mørkt vindusbånd, brua oppå med vinduer hele veien rundt, tak, skorstein med rød stripe, radarbøyle og mast */
      BX(0.62, 0.5, 0.62, wh, 0, 0.5, 0.18); BX(0.64, 0.11, 0.64, blk, 0, 0.6, 0.18); BX(0.7, 0.05, 0.7, blk, 0, 0.77, 0.18);
      BX(0.48, 0.26, 0.42, wh, 0, 0.92, 0.22); BX(0.5, 0.1, 0.44, blk, 0, 0.95, 0.22); BX(0.56, 0.04, 0.5, blk, 0, 1.07, 0.22);
      CY(0.085, 0.1, 0.34, blk, 0, 0.96, -0.1); CY(0.09, 0.09, 0.07, org, 0, 1.02, -0.1); BX(0.34, 0.03, 0.05, blk, 0, 1.3, 0.22);
      CY(0.03, 0.04, 1.05, blk, 0, 1.6, 0.22); CY(0.018, 0.018, 1.5, blk, 0.42, 1.05, -0.25, 0, -0.75); CY(0.018, 0.018, 1.5, blk, -0.42, 1.05, -0.25, 0, 0.75);
      /* arbeidsdekket: galge, nettrommel, vinsj, tråldører akter og to oransje blåser ved rekka */
      CY(0.025, 0.025, 0.9, blk, 0.32, 0.68, -1.0); CY(0.025, 0.025, 0.9, blk, -0.32, 0.68, -1.0); BX(0.7, 0.05, 0.05, blk, 0, 1.12, -1.0); CY(0.16, 0.16, 0.6, grn, 0, 0.42, -0.66, 0, PI / 2);
      BX(0.3, 0.16, 0.2, blk, 0, 0.35, -0.3); BX(0.04, 0.34, 0.26, blk, 0.46, 0.46, -0.98); BX(0.04, 0.34, 0.26, blk, -0.46, 0.46, -0.98);
      BX(0.1, 0.1, 0.1, org, 0.4, 0.34, -0.42, 0.6); BX(0.1, 0.1, 0.1, org, -0.4, 0.34, 0.5, 0.3);
      g.scale.setScalar(1.2); g.rotation.order = 'YXZ'; return g; };
    /* Lysene på båten (vender mot kameraet): to vinduer, topplyset og lykta akter. Lokale punkter i båten. */
    const LAMPS = [[-0.14, 0.6, 0.5, 0.36, '#ffd27a'], [0.14, 0.6, 0.5, 0.36, '#ffd27a'], [0, 2.16, 0.22, 0.5, '#fff0c8'], [0, 1.15, -1.05, 0.6, '#ffcf70'], [0, 0.95, 0.44, 0.3, '#ffe2a0']];   /* to vinduer, topplyset, lykta akter, og lyset i brua (2b.3) */

    /* Lynene i introen (en ren funksjon av tiden; act og den nye fargen på skyen og regnet bruker den samme). Lynene slår ned et stykke unna, bak og rundt ham, aldri på ham
       (Jazz 20.11). Bare lynet i brølet står nær, bak ham, som i skisse 1 («Det passet»). */
    const lynI = t => { const L = []; for (const q of strikes(t, 0.12 + 0.3 * seg(t, 0, QI.RO), 61)) L.push({ d: t - q[0], k: q[1] * 0.7, a: q[2] * 0.5, s: q[3] });
      for (const [tb, kk2, a, near] of [[QI.LY0, 0.7, 0.05, 0], [QI.CW, 0.55, 0.4, 0], [QI.CL2, 0.6, 1.4, 0], [QI.PASS, 0.6, -0.9, 0], [QI.LY, 1, 0.6, 0], [QI.W2, 0.75, -0.8, 0], [QI.W3, 0.8, 1.1, 0], [QI.W4, 0.9, -1.2, 0]])
        L.push({ d: t - tb, k: kk2, a, s: floor(tb * 31), near: !!near });
      for (const [tb, kb, sx, big] of [[QI.CL, 1, -34, 1], [QI.RO, 1, 62, 1], [QI.RO + 0.38, 0.85, -196, 0], [QI.RO + 0.74, 0.8, 214, 0]]) L.push({ d: t - tb, k: kb, a: 0, sx, big, s: floor(tb * 31) });   /* 2b.3: brølet. Det store lynet står bak ham (bak ryggen), i bakteppet */
      if (t < QI.CW - 0.02) for (const [tb, kb, a] of [[QI.LY0, 0.9, PI - 0.1], [2.62, 0.55, PI + 0.16], [3.45, 0.8, PI + 0.05]]) L.push({ d: t - tb, k: kb, a, s: floor(tb * 29), lo: 1 });   /* 2b.3: lyn inne i regnet under stormen langt ute */
      return L; };
    /* Ringbølgene i havet for tiden t (uRH: ringen fra slaget og brølet, og dønningen mot klippen). Den nye bevegelsen setter dem før havet leses i act. */
    const setRH = (su, t) => { for (let i = 0; i < 4; i++) { const r = i < RINGS.length ? ringAt(i, t) : null; su.uRH.value[i].set(0, 0, r ? r.R : 0, r ? r.a : 0); }
      { const cw = cwAt(t); if (cw) su.uRH.value[3].set(CWC[0], CWC[1], cw.R, cw.a); } };
    /* Båten i den nye bevegelsen: boatSim regnet med havet slik act setter det mens båten ligger på ham (0:28,36–0:35,51: stormen k = 1,65, ingen ringbølger), så den er en
       ren funksjon av tiden uansett hvilket bilde som tegnes først (før: havet slik det sto i det første bildet etter 0:28,36). Roten er dagens til 0:33,7, så banen er den samme. */
    const boatSimP = su => { const kq = 1 + 0.2 * seg(QI.UP, 0, QI.B6) + 0.45 * io(seg(QI.UP, QI.B6, QI.UP)) + 0.1 * seg(QI.UP, QI.RO, QI.RO + 0.6), kk = kq - 1, a = su.uSea.value.clone(), w = su.uWind.value.clone(), rh = su.uRH.value.map(v => v.clone());
      su.uSea.value.set(1.15 + 0.5 * kk, 1.3 + 0.5 * kk, 0.22 + 0.08 * kk, min(1, 0.8 + 0.25 * kk)); su.uWind.value.set(0.35, 1, 1.05, 0); for (const v of su.uRH.value) v.set(0, 0, 0, 0);
      try { return boatSim(su, MVI.KYM); } finally { su.uSea.value.copy(a); su.uWind.value.copy(w); su.uRH.value.forEach((v, i) => v.copy(rh[i])); } };
    /* Finnene flyter på dønningene når de ligger på vannet: vinkelen fra roten til tuppen etter havet under dem (regnet med havet i dette bildet), fordelt på to ledd. */
    const finFlyt = (su, ts, t, yaw, ry) => { const o = {}; for (const [s, P, sx] of [['L', KFL, 1], ['R', KFR, -1]]) { const w = 1 - c01((hs(t, P) - 0.15) / 0.35); if (w <= 0) { o[s] = 0; continue; }
        const at = (lx, lz) => K.seaH(su, lx * cos(yaw) + lz * sin(yaw), -lx * sin(yaw) + lz * cos(yaw), ts), hb = at(2.4 * sx, 2.6), ht = at(9.3 * sx, 4.0);
        o[s] = 0.5 * 0.8 * w * Math.atan2(ht - hb, 7) * c01((t - QI.UP - 2.6) / 1.2); }
      return o; };
    /* Kameraene med en tenkt rigg (camLive; Opus 25.11), ett per klipp: banene er de samme som før, men uten havet; havet legges på etterpå med havet i DETTE bildet
       (camRid: kameraet rir på dønningene som før, kh av høyden på kameraet og kt på siktet), så fjæren ikke leser havet i et annet bilde. Lavt over havet en båt som vugger
       sakte, høyt oppe et helikopter eller en drone. Klippet ovenfra (2) har bare en svak drift: farten i bildet er målt for det faste kameraet (PASSZ). */
    const camRid = (S, c, t, kh, kt) => { const h = K.seaH(S.sea.material.uniforms, c[0], c[2], t * TS); c[1] += kh * h; c[4] += kt * h; camV(c); };
    const uOf = (t, a, b) => c01((t - a) / max(1e-6, b - a));
    const CAMI = [
      camLive(t => { const e = io(uOf(t, 0, QI.CW - 0.04)); return [mix(5, 4, e), 2.6, mix(-21, -18, e), mix(1.5, 1, e), 4, 160, 44, 0.02]; }, { t0: 0, rig: 'baat', seed: 31 }),
      camLive(t => { const e = io(uOf(t, QI.CW - 0.04, QI.PASS - 0.04)); return [mix(-17, -13, e), 11, mix(-88, -91, e), CS[0], mix(8, 9.5, e), CS[1] + 4, 40, 0.015]; }, { t0: QI.CW - 0.04, rig: 'heli', seed: 32 }),
      camLive(() => CAM2.concat([0]), { t0: QI.PASS - 0.04, rig: 'heli', seed: 33, amp: 0.5 }),
      camLive(t => { const e = io(uOf(t, QI.B6, QI.UP - 0.05)); return [mix(6.4, 5.2, e), 2.5, mix(10.8, 9.2, e), -2.5, 1.4, -10, 48, -0.02]; }, { t0: QI.B6, rig: 'baat', seed: 34 }),
      camLive(t => { const e = io(seg(t, QI.UP, QI.HIT)), e2 = io(seg(t, QI.HIT, QI.S5)); return [mix(5, 6, e), mix(11.2, 11.8, e), 54, mix(0, 2.2, e) + 1.6 * e2, mix(1.4, 2.6, e), BT[1], mix(23, 26, e), 0.01]; }, { t0: QI.UP - 0.05, rig: 'heli', seed: 35 }),
      camLive(t => { const e = io(uOf(t, QI.S5, 38.45)); return [mix(26, 24, e), mix(12, 11, e), mix(25, 23, e), -2, 1, -4, 46, -0.01]; }, { t0: QI.S5, rig: 'heli', seed: 36 }),
      camLive(t => { const k2 = io(seg(t, 38.45, QI.RO)), w = 0.05 * sin(max(0, t - QI.RO) * 0.25);
        return [mix(8.5, 5.5, k2) + w * 4, mix(5.4, 4.3, k2), mix(31, 24.5, k2), -0.9, mix(2.6, 4.1, k2), 0, 50 - 5 * eo(seg(t, QI.RO, QI.RO + 0.3)) + 2 * io(seg(t, QI.NM, QI.NM + 1.5)), -0.03]; }, { t0: 38.45, rig: 'baat', seed: 37 })];
    G3D.def('c3:382', {
      len: QI.END, hold: 1, R: QI.RO, at: 0, mus: { bed: 'sfx/natur/kyogre_intro.mp3' },   /* lydsengen følger kamplåta (raids3d/kyogre/lyd/bed.py) */ models: ['kyogre'], edge: 'sea', env: { rim: '#a8c8ff', glow: '#2a6c9a', fog: '#16222e', glowH: 3 },
      make(K, T) { const S = storm(T), g = S.gr = kyFig(); S.T = T; S.scene.add(g.root); S.figs.push(g); S.v3 = new T.Vector3();
        const su = S.sea.material.uniforms; su.uTime = { value: 0 };            /* havets egen tid (TS), se over */
        S.sprays.forEach(p => { slowIn(p, SLOW); p.material.uniforms.uA.value = 0.3; });   /* langsomt sprut som henger, ser ut som snø: dråpene er svake, kronen bærer plasket */
        S.boat = mkBoat2(K, T); S.scene.add(S.boat);
        S.lamps = LAMPS.map(q => { const m = K.light(1, q[4], { depth: true }); m.renderOrder = 7; S.scene.add(m); return m; });
        const wet = K.rockMat({ a: '#0b1218', b: '#222e37', str: 0.32, sm: 0.6, hot: 0, lv: 0, tint: [0.07, 0.09, 0.11], top: 0.25, rough: 0.9 });
        S.rk = RK.map(([x, z, r, h, sd]) => { const m = K.boulder(r, sd, { sy: h / r, j: 0.32, d: 2, mat: wet }); m.position.set(x, h * 0.3 - 1.5, z); S.scene.add(m); return m; });
        const SP = { t0: -1e5, shade: 1, g: 16, drag: 0.6, px: 30, sz0: 0.6, sz1: 2.1, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.7, fade: 0.5, floor: -1 };   /* dråpene: små (2b.3; før px 80, prikker) */
        /* Sprut mot stakkene når en bølge knuser: mest opp og bort fra ham (han ligger i origo). */
        S.rsp = RK.map(([x, z, r, h], i) => { const ox = -x / Math.hypot(x, z), oz = -z / Math.hypot(x, z), p = slowP(520, j => { const a = rnd(j, 60 + i) * TAU, q = rnd(j, 61 + i);
          return { p: [cos(a) * r * 0.8 + ox * r, 0.5 + rnd(j, 62 + i) * 2, sin(a) * r * 0.8 + oz * r], v: [cos(a) * (2 + 6 * (1 - q)) - ox * 6, 12 + 16 * q + h * 0.6, sin(a) * (2 + 6 * (1 - q)) - oz * 6], b: rnd(j, 63 + i) * 0.35, l: 1.8 + rnd(j, 64 + i), z: 1.0 + rnd(j, 65 + i) * 2.6 }; }, Object.assign({}, SP, { a: 0.38, px: 24, fade: 0.3 }), SLOW);
          p.position.set(x, 0, z); S.scene.add(p); return p; });
        /* 2b.3: plaskene som former (crown): mot stakkene (bort fra ham), der finnene bryter flaten, og der båten slår i vannet; og litt dis. */
        S.rcr = RK.map(([x, z, r, h, sd]) => { const d = Math.hypot(x, z), ox = x / d, oz = z / d, c = crown(S, T, { r: r * 1.05, out: r * 0.9, h: 6 + h * 0.7, up: 1.5, dir: [ox, oz], arc: -0.35, lean: 2.5, sd }); c.position.set(x - ox * r * 0.7, 0, z - oz * r * 0.7); return c; });
        S.fcr = [-1, 1].map(sd => crown(S, T, { r: 1.7, out: 1.7, h: 5.5, up: 1.1, sd: 5 + sd }));
        S.ccr = crown(S, T, { r: 1.5, out: 2.6, h: 6, up: 1.2, sd: 9 }); S.roc = crown(S, T, { r: 12, out: 12, h: 3.6, up: 0.7, dir: [-0.47, -0.88], arc: -0.55, sd: 41, a: 0.8 }); S.spc = '#bfe4ff';   /* trykket i brølet slår vannet ut i en lav, vid krone bak og rundt ham (åpen mot kameraet: ingenting skjuler ham) */ S.cmist = mistP(40, 3.5, 10, 301); S.scene.add(S.cmist);
        /* Vannet som fosser av ryggen og finnene når han kommer opp (Godzilla 2:12–2:22). */
        S.casc = slowP(520, i => { const a = rnd(i, 71) * TAU, rr = Math.sqrt(rnd(i, 72)); return { p: [cos(a) * 5 * rr, 2.6 + rnd(i, 73) * 1.4, sin(a) * 9 * rr], v: [cos(a) * (1.5 + 3 * rr), -0.6 - rnd(i, 74) * 2, sin(a) * (1 + 2 * rr)], b: rnd(i, 75) * 4, l: 1.1 + rnd(i, 76) * 0.8, z: 0.6 + rnd(i, 77) * 1.5 }; },
          { loop: 1, shade: 1, g: 14, px: 75, c: ['#eaf6ff', '#a8c4d8', '#5a7486'], a: 0.85, fade: 0.7, floor: -1 }, SLOW); S.scene.add(S.casc);
        S.fsp = [-1, 1].map(sd => { const p = slowP(260, i => { const q = rnd(i, 81 + sd); return { p: [(rnd(i, 82 + sd) - 0.5) * 3, 2 + q * 5, (rnd(i, 83 + sd) - 0.5) * 2], v: [(rnd(i, 84 + sd) - 0.5) * 2 + sd * 1.2, 2 + 5 * rnd(i, 85 + sd), (rnd(i, 86 + sd) - 0.5) * 2], b: rnd(i, 87 + sd) * 1.6, l: 1.6 + rnd(i, 88 + sd), z: 0.6 + rnd(i, 89 + sd) * 1.6 }; },
          Object.assign({}, SP, { a: 0.8 }), SLOW); S.scene.add(p); return p; });
        /* Sprut fra baugen (0:10,73) og når båten treffer vannet (0:26,02). */
        S.bow = slowP(140, i => { const a = (rnd(i, 91) - 0.5) * 2.2, q = rnd(i, 92); return { p: [(rnd(i, 93) - 0.5) * 0.8, 0.2, 0.9], v: [sin(a) * (2 + 2.5 * q), 3 + 4 * q, 2 + 2.5 * cos(a) * q], b: rnd(i, 94) * 0.2, l: 1.4 + rnd(i, 95) * 0.6, z: 0.3 + rnd(i, 96) * 0.6 }; }, SP, SLOW); S.scene.add(S.bow);
        S.cap = slowP(420, i => { const a = rnd(i, 101) * TAU, q = rnd(i, 102); return { p: [cos(a) * 1.6, 0.3, sin(a) * 1.6], v: [cos(a) * (2 + 6 * q), 8 + 13 * (1 - q), sin(a) * (2 + 6 * q)], b: rnd(i, 103) * 0.3, l: 1.8 + rnd(i, 104), z: 1.6 + rnd(i, 105) * 3 }; }, Object.assign({}, SP, { px: 26, a: 0.4, fade: 0.3 }), SLOW); S.scene.add(S.cap);
        /* Rettelse 2: slagene med finnene. En krone der finnen treffer, sprut langs hele finnen (dreid med ham) og dis; vannet som fosser av de løftede finnene
           (tre strømmer per finne, ved leddene); og halefinnene som slår ned etter det siste slaget. */
        S.slc = SL.map(([, , k], i) => crown(S, T, Object.assign({ sd: 61 + i * 3, a: 0.35 }, SLZ[k], { h: SLZ[k].h * 0.45 })));   /* rettelse 3: bare en svak fot; plumen bærer plasket */
        S.slp = SL.map(([, , k], i) => plume(S, T, { r: 2.6 + 0.4 * k, h: SLZ[k].h * 0.85, out: 3.2 + 0.6 * k, n: 220 + 40 * k, sd: 171 + i * 11 }));
        S.sls = SL.map(([, s, k], i) => { const p = slowP(300, j => { const q = rnd(j, 131 + i); return { p: [s * (2.5 + 8 * rnd(j, 132 + i)), 0.3 + rnd(j, 133 + i) * 1.5, 1.5 + (rnd(j, 134 + i) - 0.5) * 3.2], v: [s * (0.5 + 2.5 * rnd(j, 135 + i)), (7 + 10 * q) * (1 + 0.2 * k), (rnd(j, 136 + i) - 0.4) * 3], b: rnd(j, 137 + i) * 0.35, l: 0.8 + 0.5 * rnd(j, 138 + i), z: 0.8 + rnd(j, 139 + i) * 2 }; },
          Object.assign({}, SP, { a: 0.42, fade: 0.35 }), SLOW);   /* kort liv: sprut som henger, ser ut som snø */ S.scene.add(p); return p; });
        S.slm = SL.map((q, i) => { const p = mistP(36, 4.5, 11, 401 + i * 9); S.scene.add(p); return p; });
        S.pour = []; for (const s of ['L', 'R']) for (const bn of ['Arm', 'ForeArm', 'Hand']) { const sd = S.pour.length * 7 + 151, p = slowP(80, j => ({ p: [(rnd(j, sd) - 0.5) * 1.6, -0.2, (rnd(j, sd + 1) - 0.5) * 2.2], v: [(rnd(j, sd + 2) - 0.5) * 0.8, -0.4 - rnd(j, sd + 3) * 1.6, (rnd(j, sd + 4) - 0.5) * 0.8], b: rnd(j, sd + 5) * 1.3, l: 0.9 + rnd(j, sd + 6) * 0.5, z: 0.5 + rnd(j, sd + 6) * 1.1 }),
          { loop: 1, shade: 1, g: 13, px: 46, c: ['#eaf6ff', '#a8c4d8', '#5a7486'], a: 0, fade: 0.6, floor: -1 }, SLOW); p.userData.bn = s + bn; p.userData.s = s; S.scene.add(p); S.pour.push(p); }
        S.tcr = crown(S, T, { r: 2.2, out: 2.4, h: 6.5, up: 1.3, sd: 77, a: 0.85 });
        /* Rettelse 3: plumes for alle plaskene i introen (kronene ble grå rør: Jazz «Det ser ikke naturlig ut det vannet som splasher opp»). Kronene står, men tegnes ikke. */
        S.fcp = [-1, 1].map(sd => plume(S, T, { r: 1.8, h: 5, out: 2.2, n: 150, sd: 201 + sd * 3 }));
        S.ccp = plume(S, T, { r: 1.6, h: 6.5, out: 2.6, n: 170, sd: 211 }); S.tcp = plume(S, T, { r: 2, h: 5.5, out: 2.4, n: 150, sd: 221 });
        S.rcp = RK.map(([x, z, r, h], i) => { const d = Math.hypot(x, z), ox = x / d, oz = z / d, p = plume(S, T, { r, h: 6 + h * 0.7, out: r * 0.9, dir: [ox, oz], n: 200, sd: 231 + i * 7 }); p.position.set(x - ox * r * 0.7, 0, z - oz * r * 0.7); return p; });
        S.scp = STACKS.map(([x, z, r, h], i) => { const p = plume(S, T, { r: r * 0.9, h: 7 + h * 0.55, out: r * 0.7, dir: CWD, n: 140, sd: 251 + i * 7 }); p.position.set(x - 0.33 * r * 0.6, 0, z - 0.94 * r * 0.6); return p; });
        S.cwp = [[22, 5, 7, 420], [13, 4, 5, 260], [9, 3.2, 4, 220], [7, 3, 4, 200]].map(([h, r, out, n], i) => plume(S, T, { r, h, out, n, dir: CWD.map(v => -v), sd: 301 + i * 13, px: i ? 150 : 175, a: i ? 0.38 : 0.44 }));   /* vannet kastes opp og tilbake fra steinen */
        mkStorm(S, K, T);   /* 2b.3 (Fable): stormen i det første bildet er den samme i 3D som i Primal, ikke den flate veggen (Jazz 20.11: «Noter at stormen må forbedres både på intro og til primal») */
        return S; },
      act(S, t, o) {
        const ny = !STIV();   /* den nye bevegelsen (Opus 25.11); 'stiv' = slik den var */
        const tsea = t >= QI.PASS - 0.02 && t < QI.B6 - 0.02 ? t - (QI.PASS - 4.57) : t;   /* rettelse 3: havet i bildet ovenfra går på den gamle tiden (samme hav som Jazz godkjente) */
        const g = S.gr, U = K.U(), su = S.sea.material.uniforms, ts = tsea * TS; su.uTime.value = ts;
        const H = (x, z) => K.seaH(su, x, z, ts);
        if (ny) setRH(su, t);   /* ny: ringbølgene for DETTE bildet før havet leses (før: forrige bildes, så han og båten avhang av bildet før) */
        /* Stormen kommer nærmere gjennom hele introen. Dønningene blir høyere (ikke raskere) fra 0:13,2. */
        const k = 1 + 0.2 * seg(t, 0, QI.B6) + 0.45 * io(seg(t, QI.B6, QI.UP)) + 0.1 * seg(t, QI.RO, QI.RO + 0.6), kk = k - 1;
        su.uSea.value.set(1.15 + 0.5 * kk, 1.3 + 0.5 * kk, 0.22 + 0.08 * kk, min(1, 0.8 + 0.25 * kk)); su.uWind.value.set(0.35, 1, 1.05, 0);
        /* 2b.3 (Fable): stormen er den samme i 3D i hele introen (mkStorm, stormSort, himmelen skyQ), ikke den flate veggen i 2D (Jazz 20.11: «Noter at stormen må
           forbedres både på intro og til primal»). Bilde 1: langt ute over det åpne havet. Ovenfra: ingen himmel. Fra 0:13,2: stadig lenger inne i den (inn 0–1):
           grått, regnsøyler rundt oss, stormhav med småskum overalt, og lyn i det fjerne (S.fb). Kysten er skjult i bilde 1 (stormen kommer fra det åpne havet). */
        { const far = t < QI.CW - 0.02, top = t >= QI.PASS - 0.02 && t < QI.B6 - 0.02, inn = far ? 0 : top ? 0.3 : t < QI.PASS ? 0.15 : 0.4 + 0.6 * io(seg(t, QI.B6, QI.UP + 2)), pu = S.puff.m.material.uniforms, ru = S.rain.m.material.uniforms, sf = ny ? flashOf(lynI(t)) : S.fl || 0, bl = C.blend;   /* ny: lynet i DETTE bildet (før: forrige bildes, så skyen og regnet avhang av bildet før) */
          S.inn = inn; S.far = far; S.sky3 = true; S.st = 0; S.sta = PI; S.fb = !top; S.stormOn = !top; S.ov = far ? 0.1 : inn; S.sd = far ? 0.15 : 0; S.sa = PI; S.ss = 1; S.sy = far ? 0.58 : 1; S.zf = far ? mix(212, 186, t / QI.CW) : -1000;   /* lav nok til at himmelen over stormen synes: den står som en egen, mørk masse i horisonten */ S.grey = 0.5 * S.ov;
          su.uStm.value.set(far ? S.zf + 4 : -1000, 5, far ? 1 : inn, far ? 1 : 0.55 * inn);
          lerpC(pu.uCL, far ? '#6f7d8a' : '#4e5963', '#c8dcf4', sf * 0.3); lerpC(pu.uCD, far ? '#232c35' : '#1b2229', '#5a6f88', sf * 0.3); lerpC(pu.uCB, '#0f1418', '#3e5068', sf * 0.3);
          lerpC(ru.uCR, far ? '#44505c' : bl('#3a4652', '#4e5b66', inn), '#c8dcf4', sf * 0.25); ru.uFk.value = far ? 0.3 : 0.75; ru.uTall.value = far ? 0 : 1; pu.uFk.value = far ? 0.5 : 0.75; ru.uAl.value = far ? 1 : 0.35 + 0.65 * inn; for (const q of [pu, ru]) q.uLit.value.set(0, 20, 0, 0);
          S.cliff = S.cliff || S.scene.children[1]; S.cliff.visible = !far;
        }
        /* Lynene slår ned et stykke unna, bak og rundt ham, aldri på ham (Jazz 20.11). Bare lynet i brølet står nær, bak ham, som i skisse 1 («Det passet»). */
        const L = lynI(t);
        S.L = L; const fl = flashOf(L); S.fl = fl;
        lerpC(su.uSkyA, '#2c3c4a', '#8fa6c6', fl); lerpC(su.uSkyB, '#0a121e', '#34486a', fl); lerpC(su.uDeep, '#020f18', '#0a2a3a', fl * 0.6); su.uBri.value = 1 + 0.16 * fl;   /* 2b.3: lynet viser bølgene, det bleker dem ikke (før '#b8cce8' og 1,3) */
        /* Bilde 2 ovenfra (0:04,57–0:13,2) er slik det var før 2b.3 (Jazz 24.11: «Vannet ble for lyst nå kyogre svømte under båten. Likte bedre fargen og at du så
           skyggen av den. Skyggen var også dårligere under vann hos fable. Kan du bytte om det tilbake bare den scenen slik den var før fable byttet?»): det mørke havet,
           lynet, skummet, gråtonen og disen fra 5ea1b7e, ingen stormsone, og havet fra før s2b_23 (uSk: skyggen med runde finner og en bred halevifte, regnringene i ruter; Jazz: «Halen er borte nå. Fiks opp i det så er den godkjent etterpå» og «Halen er rar»). Fable hadde gjort
           havet mørkt blågrønt her (01de9d3) og gitt skyggen hans omriss (s2b_23); det står i resten av filmen. uShal settes i hvert bilde (før ble den stående fra bilde 2
           og ut filmen): '#0d4a58' til og med bilde 2 og '#1a6274' etter, som i filmen Jazz godkjente 24.11. */
        const ovf = S.ovf = t >= QI.PASS - 0.02 && t < QI.B6 - 0.02, st0 = 0.32 + 0.3 * seg(t, 0, QI.UP); if (su.uSk) su.uSk.value = ovf ? 1 : 0;
        if (ovf) { lerpC(su.uSkyA, '#2c3c4a', '#b8cce8', fl); lerpC(su.uSkyB, '#0a121e', '#40557a', fl); su.uBri.value = 1 + 0.3 * fl; su.uSea.value.z = 0.3 + 0.1 * kk; su.uStm.value.set(0, 4, 0, 0); S.grey = 0.5 * st0; }
        { const c = t < QI.B6 - 0.02 ? '#0d4a58' : '#1a6274'; lerpC(su.uShal, c, c, 0); }
        /* De fjerne stakkene i kysten: sprut når en topp når dem (i havets tid, gjort om til filmens). Rettelse 3: plumes, og den høyeste stakken (bølgen mot klippen)
           får bare den store bølgen mens det bildet står. */
        S.stacks.forEach((m, i) => { const t0 = crestAt(su, m.position.x, m.position.z, ts) / TS, cw = i === 5 && t >= QI.CW - 0.3 && t < QI.PASS + 1; S.fx(S.sprays[i], cw ? -1e5 : t0); S.scp[i].at(t, cw ? -1e5 : t0); });

        /* Kyogre: forbi under båten (0:04,57–0:12,5), opp fra dypet under den (0:13,2–0:23), finnene først (0:23,03), ryggen som en øy, så ligger han høyt og rir på dønningene. */
        let x = 0, y = -40, z = 0, yaw = 0, pit = 0, sh = 0, fin = 0, gl = 0, mv = null;
        const tf = ny ? X.freeze(t, [QI.SLAM], 3, 0.3) : t;   /* figurens tid: to frosne bilder når finnene treffer vannet i slaget (låta, kameraet og vannet går videre) */
        if (ny && tf !== t) setRH(su, tf);   /* ny: i de frosne bildene flyter han på havet slik det var i nedslaget (ringen fra slaget står), så ingenting av ham rører seg */
        if (t >= QI.PASS - 0.3 && t < QI.B6 - 0.02) {
          z = t < QI.PASS - 0.04 ? 2.9 - 8 * (t - QI.MID) : PASSZ(t);   /* jevn fart i bildet, han stopper aldri (Jazz 20.11 og 24.11): inn på 0:04,57, midt under båten i lynet 0:07,66, halen ute rundt 0:10,8 (PASSZ). Før klippet (bilde 1, der han synes svakt langt ute) som før */ x = BT[0] + 0.4; y = -7; yaw = PI; sh = 0.8; gl = 0.12; }
        else if (t >= QI.B6 && t < QI.UP) { const u = seg(t, QI.B6, QI.UP); y = mix(-30, -6.6, io(u)); yaw = 0; sh = 0.25 + 0.65 * u; gl = 0.06 + 0.4 * u * u; fin = 0.75 * seg(t, QI.B6 + 4, QI.UP - 1.5); }
        else if (t >= QI.UP) { const m = ny ? MVI.KYM(tf) : KYM(t), h0 = ny ? K.seaH(su, 0, 0, tf * TS) : H(0, 0); y = KYH + 0.8 * h0 * io(seg(ny ? tf : t, QI.UP, QI.UP + 2.57)) + m.dy; if (ny) z = m.z; pit = m.pit; yaw = m.yaw; S.krl = m.roll; sh = 0.6 * (1 - seg(t, QI.UP, QI.UP + 1.57)); }   /* rettelse 2: se KYM */
        g.root.visible = y > -32; g.root.position.set(x, y, z); g.root.rotation.set(pit, yaw, t >= QI.UP ? S.krl : 0);
        if (ny && t >= QI.UP - 0.06) { mv = MVI.pose(g, tf, finFlyt(su, tf * TS, tf, yaw, y)); if (tf !== t) setRH(su, t); } else if (t < QI.UP) { SWIM(g, t, 0.8, 1.1); g.add({ '*Shoulder': [0, 0, 1] }, fin); } else KYB(g, t);   /* ny: figurens tid (frosne bilder i slaget), også havet han flyter på */
        /* Pulsene er slagene (SL): linjene blusser på slaget og lader seg opp mens finnene løftes. Forvarselet 0:39,24 og brølet 0:41,52. */
        let pul = 0; for (const tp of [QI.SLAM]) pul = max(pul, hit(t, tp, 1.6));
        const lad = t > QI.HIT + 1.5 && t < QI.SLAM + 0.5 ? 0.4 * c01((max(hs(t, KFL), hs(t, KFR)) - 0.5) / 0.6) : 0;
        const dk = kf(t, [[QI.DK - 0.7, 0], [QI.DK, 0.75, io], [QI.RO - 0.12, 1, io], [QI.RO + 0.04, 0, eo]]), r2 = t < QI.RO ? 0 : back(seg(t, QI.RO, QI.RO + 0.3), 2.4) * (1 - io(seg(t, QI.NM + 0.2, QI.NM + 0.9)));
        if (mv) { S.rw = mv.rw; S.mouth = null; g.eye(0, mv.rw > 0.25 ? 0.75 : 0, 0.6); }
        else { g.add(DUCK, dk); g.add(ROAR, r2); g.rot('Jaw', 0, 0.04 * sin(t * 57) * r2, 0); S.rw = r2; S.mouth = null;
        g.eye(0, r2 > 0.2 ? 0.75 : 0, 0.6); }   /* øynene er åpne hele tiden: øyne som åpner seg er Groudon sitt (Jazz 20.11) */
        lines(g, 0.85 + 0.5 * (y < -1 ? 1 : 0) * (0.6 + 0.4 * sin(t * 2.2)) + 0.9 * pul + lad + 0.5 * (mv ? mv.dk : dk) + 0.5 * (mv ? min(1.2, mv.rw) : r2), 0);
        /* Skyggen og det røde skjæret i havet; lynet 0:07,66 gjør hele kroppen tydelig. */
        su.uBody.value.set(x, z, 12, y < -1 ? min(1, sh * (0.85 + 1.2 * fl)) : 0); su.uBodyD.value.set(sin(yaw), cos(yaw), 6, 1);
        su.uGlo.value.set(x, z, 5.5 + 3 * seg(t, QI.B6, QI.UP), y < -1 && y > -32 ? gl + 0.22 * fl : 0); su.uGloC.value.set(0.9, 0.12, 0.14);   /* bare når han er der (før lyste et rødt skjær opp ved båten i lynene i bilde 1, før han kom) */

        /* Båten: flyter tungt på dønningene, krenger i kjølvannet (0:09,08) og stamper i en topp (0:10,73); løftes av ryggen, han ruller den av seg skrått framover
           (0:24,9–0:26,02), den velter og flyter med kjølen opp til den første ringbølgen skyller over den (rettelse 2: før sank den alene og var borte 0:27,8). */
        const dB = Math.hypot(BL[0] + 0.6, BL[1] + 0.5) + 0.8, tSw = QI.SLAM + (dB - 8) / ((Math.hypot(RK[1][0], RK[1][1]) - RK[1][2] * 0.6 - 8) / (38.53 - QI.SLAM));   /* rettelse 3: ringen fra slaget */
        const b = S.boat; let bx = BT[0], bz = BT[1], by, pitch, roll, alive = t < tSw + 0.8;
        const sea = (xx, zz) => H(xx, zz), yawB = 0.55;
        const fw = [sin(yawB), cos(yawB)], sd = [cos(yawB), -sin(yawB)];
        if (t < QI.UP) { by = sea(bx, bz) - 0.08; pitch = Math.atan2(sea(bx - fw[0] * 1.2, bz - fw[1] * 1.2) - sea(bx + fw[0] * 1.2, bz + fw[1] * 1.2), 2.4) * 0.9; roll = Math.atan2(sea(bx - sd[0] * 0.5, bz - sd[1] * 0.5) - sea(bx + sd[0] * 0.5, bz + sd[1] * 0.5), 1.0) * 0.6;
          const wk = t > QI.W1 ? Math.exp(-(t - QI.W1) / 1.6) * sin((t - QI.W1) * 2.1) : 0; roll += 0.42 * wk; by += 0.25 * wk;
          pitch -= 0.22 * (t > QI.W2 ? Math.exp(-(t - QI.W2) / 0.9) * sin((t - QI.W2) * 2.6) : 0); b.rotation.set(pitch, yawB, roll); }
        else {   /* rettelse 4: boatSim til den treffer vannet, så tungt i vannet */
          const bs = ny ? S.bs2 || (S.bs2 = boatSimP(su)) : S.bs || (S.bs = boatSim(su)); let th, yw;
          if (t < bs.tL) { [bx, by, bz, th, yw] = bs.at(t); }
          else { const L = bs.L, tau = t - bs.tL, Td = 0.45, TL = Math.hypot(L.th[0], L.th[1]), ux = TL > 1e-4 ? L.th[0] / TL : 1, uz = TL > 1e-4 ? L.th[1] / TL : 0;
            /* farten bremses av vannet på et halvt sekund, så driver den sakte bort fra ham */
            bx = L.x + L.vx * Td * (1 - Math.exp(-tau / Td)) + 0.09 * tau; bz = L.z + L.vz * Td * (1 - Math.exp(-tau / Td)) + 0.075 * tau;
            /* den dykker etter farten den traff med (tung: lang periode, sterk demping), kommer sakte opp og ligger lavere når den tar inn vann */
            const w = 2.3, Av = min(2.2, max(0, -L.vy) * 0.42), pl = -(Av / w) * Math.exp(-tau / 0.9) * sin(w * tau);
            by = sea(bx, bz) - 0.1 - 0.22 * io(seg(tau, 0.6, 3.5)) + pl - 3.2 * ei(seg(t, tSw, tSw + 0.8));
            /* kantrer langsomt (tung overbygning) hvis den lander på siden, ellers retter den seg opp; vippes av bølgene, og ringen fra slaget legger den over */
            const cap = TL > 0.75, k = 1.0, e = Math.exp(-k * tau), sw = 0.5 * io(seg(t, tSw - 0.2, tSw + 0.8)), g = 0.25 * c01(tau / 1.5), e2 = 0.6;
            const sx = (sea(bx - e2, bz) - sea(bx + e2, bz)) / (2 * e2), sz = (sea(bx, bz - e2) - sea(bx, bz + e2)) / (2 * e2);
            th = [0, 1].map(i => { const c = cap ? (i ? uz : ux) * PI * 0.94 : 0, d0 = L.th[i] - c; return c + (d0 + (L.om[i] + k * d0) * tau) * e + (i ? uz : ux) * sw + g * (i ? sz : sx); });
            yw = L.yw + L.ywr * 0.8 * (1 - Math.exp(-tau / 0.8)); }
          const a = Math.hypot(th[0], th[1]), v = S.v3; b.quaternion.setFromAxisAngle(a > 1e-6 ? v.set(th[1] / a, 0, -th[0] / a) : v.set(1, 0, 0), a);
          S.qy = S.qy || new S.T.Quaternion(); b.quaternion.multiply(S.qy.setFromAxisAngle(v.set(0, 1, 0), yw)); }
        b.visible = alive; b.position.set(bx, by, bz); b.updateMatrixWorld(true);
        const on = t < QI.BH ? 1 : t < QI.BH + 0.25 ? (sin(t * 90) > 0 ? 0.6 : 0) : 0;   /* lysene slukner når båten treffer vannet */
        S.lamps.forEach((m, i) => { const q = LAMPS[i]; m.visible = alive && on > 0; m.position.copy(S.v3.set(q[0], q[1], q[2]).applyMatrix4(b.matrixWorld)); K.face(m); m.scale.setScalar(q[3] * (S.ovf ? 2.2 : 1) * (0.8 + 0.1 * sin(t * 11 + i)));
          m.material.uniforms.uA.value = on * (i === 3 ? 0.8 + 0.2 * sin(t * 13.3) * sin(t * 7.1) : 0.9); });
        S.fx(S.bow, QI.W2 - 0.05, bx, by, bz); S.bow.rotation.y = yawB; S.fx(S.cap, QI.BH, BL[0], 0, BL[1]); S.cap.visible = t < QI.BH + 1.9;

        /* Ringbølgene (0:28,36 · 0:31,91 · 0:35,51, og brølet): havet løfter seg (uRH, motor.py) med skum på toppen, og de knuser mot stakkene i tungt, langsomt sprut. */
        setRH(su, t);
        const ring = (i, xx, zz, R, a) => su.uRing.value[i].set(xx, zz, R, a);
        if (t < QI.SLAM) { ring(0, -9.5, 2, 1.5 + (t - QI.UP) * 2.2, t >= QI.UP ? hit(t, QI.UP, 3.5) : 0); ring(1, 9.5, 2, 1.5 + (t - QI.UP) * 2.2, t >= QI.UP ? hit(t, QI.UP, 3.5) : 0);
          ring(2, BL[0], BL[1], 1 + (t - QI.BH) * 3.5, t >= QI.BH ? hit(t, QI.BH, 2.5) : 0); const cw = cwAt(t); ring(3, CWC[0], CWC[1], cw ? cw.R - 0.6 : 0, cw ? 0.8 * c01(cw.a / 1.2) : 0); }
        else for (let i = 0; i < 4; i++) { const r = i < RINGS.length ? ringAt(i, t) : null; ring(i, 0, 0, r ? r.R - 0.6 : 0, r ? 0.75 * c01(r.a / 0.5) : 0); }
        const HITS = [[QI.W3, 0], [QI.W4, 1], [38.53, 1]];
        S.rk.forEach((m, i) => { const hs = HITS.filter(q => q[1] === i && t >= q[0]), t0 = hs.length ? hs[hs.length - 1][0] : -1e5; S.fx(S.rsp[i], t0); S.rcp[i].at(t, t0); });
        S.cwp.forEach((p, i) => p.at(t, CWT[i] - 0.05, CWF[0], 0, CWF[1]));   /* rettelse 3: bølgen knuser mot klippen */
        S.casc.position.set(0, y - KYH, 0); S.casc.visible = t >= QI.LIFT && t < QI.HIT + 3.5; S.casc.material.uniforms.uA.value = 0.85 * seg(t, QI.LIFT, QI.LIFT + 0.6) * (1 - seg(t, QI.HIT + 1.5, QI.HIT + 3.5));
        S.fsp.forEach((p, i) => { S.fx(p, QI.UP + 0.2, (i ? 9.5 : -9.5), 0, 2); S.fcp[i].at(t, QI.UP + 0.1, (i ? 9.5 : -9.5), 0, 2); });
        S.ccp.at(t, QI.BH - 0.03, BL[0], 0, BL[1]); S.fx(S.cmist, t >= QI.RO - 0.2 ? QI.RO : QI.BH, t >= QI.RO - 0.2 ? 0 : BL[0], 0, t >= QI.RO - 0.2 ? 0 : BL[1]); S.roc.at(t, QI.RO + 0.02, 0, 0, 0);
        /* Rettelse 2: slagene (kronen der finnen treffer, sprut langs finnen, dis), vannet som fosser av finnene mens de er løftet, og halefinnene etter det siste slaget. */
        SL.forEach(([t0, s], i) => { const [cx, cz] = slXZ(s, t0); S.slp[i].at(t, t0 - 0.02, cx, 0, cz); S.fx(S.sls[i], t0 - 0.02, 0, 0, 0); S.sls[i].rotation.y = KYM(t0).yaw; S.sls[i].visible = t > t0 - 0.1 && t < t0 + 4;
          S.fx(S.slm[i], t0 + 0.15, cx, 0, cz); S.slm[i].visible = t > t0 && t < t0 + 7; });
        g.apply();   /* benene for dette bildet (motoren gjør det etter act), så strømmene står ved finnene nå */
        for (const p of S.pour) { const th = t >= QI.UP ? hs(t, p.userData.s === 'L' ? KFL : KFR) : 0, a = t >= QI.UP && t < 38 ? 0.75 * c01((th - 0.3) / 0.35) : 0; p.visible = a > 0.01;
          if (p.visible) { p.position.copy(g.at(p.userData.bn)); p.material.uniforms.uA.value = a; } }
        { const tt = QI.SLAM + 1.04, [tx, tz] = slXZ(1, tt, 0, -8.2); S.tcp.at(t, tt, tx, 0, tz); }
        su.uWade.value.set(t >= QI.UP ? 0 : bx, t >= QI.UP ? 0 : bz, t >= QI.UP ? 9 : 1.7, t >= QI.UP ? 0.7 * seg(t, QI.UP + 0.6, QI.UP + 2.97) : 0.6);
        /* Lyset: kaldt og mørkt, gråere og tettere dis jo nærmere stormen er; lynet lyser opp alt. */
        lerpC(U.uKeyC, '#5a6c80', '#e8f2ff', fl); lerpC(U.uShC, '#0a141e', '#3a4c66', fl); U.uRimK.value = 0.85; U.uGlow.value = 0.25;
        /* 2b.3: i bilde 1 er det skumring, ikke natt: disen er lysere enn skyen, så stormen står mørk og tydelig mot himmelen («man skal se hva som er storm og hva som ikke er det») */
        if (S.far) { U.uFog.value.set(40, 500, 0.8); lerpC(U.uFogC, '#46535f', '#5d7290', fl); } else if (S.ovf) { U.uFog.value.set(40 - 14 * st0, 320 - 120 * st0, 0.88); lerpC(U.uFogC, '#121c26', '#5a7090', fl); } else { U.uFog.value.set(mix(40, 24, S.inn), mix(320, 200, S.inn), 0.88); lerpC(U.uFogC, C.blend('#121c26', '#222c36', S.inn), '#4a5f7e', fl); }
        S.k = k; S.glo = 0;
      },
      shots: [
        /* 1 Stormen filmes: lavt over havet mot veggskyen; tråleren klatrer sakte over dønningene. */
        [0, (S, u, a, t) => { const e = io(u), x = mix(5, 4, e), z = mix(-21, -18, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); if (STIV()) K.cam(x, h + 2.6, z, mix(1.5, 1, e), 4 + 0.4 * h, 160, 44, 0.02); else camRid(S, CAMI[0](t), t, 1, 0.4); S.post.fade = 1 - seg(t, 0.9, 1.9); }],
        /* 1b (rettelse 3) Bølgen mot klippen: lavt fra siden mot den høyeste stakken; dønningen ruller inn fra venstre i stillheten i låta og knuser mot den på 0:07,66
           med lynet bak, og igjen 0:09,08 og 0:10,73. Kameraet glir sakte nærmere. */
        [QI.CW - 0.04, (S, u, a, t) => { const e = io(u), x = mix(-17, -13, e), z = mix(-88, -91, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); if (STIV()) K.cam(x, 11 + 0.2 * h, z, CS[0], mix(8, 9.5, e), CS[1] + 4, 40, 0.015); else camRid(S, CAMI[1](t), t, 0.2, 0);
          S.post.sh = 1.5 * hit(t, QI.CL, 1.3) + 0.6 * hit(t, QI.CL2, 0.8) + 0.5 * hit(t, QI.CL3, 0.8); S.post.fl = 0.32 * hit(t, QI.CL, 0.12); S.post.flc = '#e8f2ff'; }],
        /* 2 Ovenfra: båten alene; skyggen kommer inn nedenfra på 0:04,57, glir under båten i stillheten, lynet viser hele kroppen, og den er ute før klippet. */
        [QI.PASS - 0.04, (S, u, a, t) => { if (STIV()) K.cam(...CAM2, 0); else camV(CAMI[2](t)); S.post.fl = 0.35 * hit(t, QI.LY, 0.12); S.post.flc = '#e8f2ff'; S.post.sh = 0.6 * hit(t, QI.W1, 0.8); }],
        /* 3 Noe stort kommer: lavt ved båten mot stakkene; det røde skjæret vokser under den. */
        [QI.B6, (S, u, a, t) => { const e = io(u), x = mix(6.4, 5.2, e), z = mix(10.8, 9.2, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); if (STIV()) K.cam(x, h + 2.5, z, -2.5, 1.4, -10, 48, -0.02); else camRid(S, CAMI[3](t), t, 1, 0);   /* 2b.3: nærmere og lavere (før 14 enheter unna), så tråleren er stor og tung i bildet */ S.post.sh = 0.7 * hit(t, QI.W3, 0.6) + 0.8 * hit(t, QI.W4, 0.6) + 0.25 * seg(t, QI.B6, QI.UP); }],
        /* 4 Finnene først: lavt og rett forfra; båten midt i bildet mellom finnene. Ryggen løfter den, den glir av og velter. */
        [QI.UP - 0.05, (S, u, a, t) => { const e = io(seg(t, QI.UP, QI.HIT)), e2 = io(seg(t, QI.HIT, QI.S5)), x = mix(5, 6, e), z = 54, h = K.seaH(S.sea.material.uniforms, x, z, t * TS); if (STIV()) K.cam(x, h * 0.2 + mix(11.2, 11.8, e), z, mix(0, 2.2, e) + 1.6 * e2, mix(1.4, 2.6, e), BT[1], mix(23, 26, e), 0.01); else camRid(S, CAMI[4](t), t, 0.2, 0); S.post.sh = 1.6 * hit(t, QI.UP, 1.6) + 0.5 * hit(t, QI.HIT, 1.0) + 1.3 * hit(t, QI.BH, 1.2); }],
        /* 5 Ringbølgene, litt ovenfra: han ligger høyt i vannet, og ringene ruller ut mot stakkene. */
        [QI.S5, (S, u, a, t) => { const e = io(u); if (STIV()) K.cam(mix(26, 24, e), mix(12, 11, e), mix(25, 23, e), -2, 1, -4, 46, -0.01); else camV(CAMI[5](t)); S.post.sh = 1.1 * hit(t, QI.SLAM, 1.0); }],   /* rettelse 3: slaget (før ringbølgene 0:27,9) */
        /* 6 Lavt ved stakken: ringen ruller mot kameraet og knuser mot stakken (0:35,51). */
        /* 7 Vidt og lavt for forvarselet og brølet (som i skisse 1, uten båten); kameraet høyt nok til at ingen bølge skjuler ham. */
        [38.45, (S, u, a, t) => { const k2 = io(seg(t, 38.45, QI.RO)), w = 0.05 * sin(max(0, t - QI.RO) * 0.25), x = mix(8.5, 5.5, k2) + w * 4, z = mix(31, 24.5, k2), h = K.seaH(S.sea.material.uniforms, x, z, t * TS);
          /* 2b.3 (Fable): «et sted mellom skisse 1 og 2». Lavere (4,3 over sjøen; skisse 1: 2,2, skisse 2: 6,2), nærmere, og skrått forfra (rundt 35° fra retningen
             hans; skisse 2: 48°), så hodet, øyet og gapet synes («i brølet synes ansiktet, ikke bare haka»; rett forfra er hodet hans en blank kuppel: prøvd).
             Utsnittet rykker inn i brølet (samme bane, ingen skjøt). */
          if (STIV()) K.cam(x, h * 0.5 + mix(5.4, 4.3, k2), z, -0.9, mix(2.6, 4.1, k2), 0, 50 - 5 * eo(seg(t, QI.RO, QI.RO + 0.3)) + 2 * io(seg(t, QI.NM, QI.NM + 1.5)), -0.03); else camRid(S, CAMI[6](t), t, 0.5, 0);
          S.post.fl = max(0.3 * hit(t, QI.RO, 0.1), 0.2 * hit(t, QI.RO + 0.35, 0.08)); S.post.flc = '#eef6ff'; S.post.sh = 1.0 * hit(t, 38.53, 0.8) + 4 * hit(t, QI.RO, 1.2) + 0.6 * S.rw; if (t >= QI.RO) X.mouth(S, S.gr, QI.RO, t); }],
      ].map(([t0, f]) => [t0, (S, u, a, t) => { f(S, u, a, t); if (!STIV()) S.lamps.forEach(m => K.face(m)); stormSort(S, t); }]),   /* ny: lysene på båten mot DETTE bildets kamera (før: forrige bildes) */
    });
    X.reg('c3:382', { spid: 382, skin: 'sea', back: skyQ, look: lookS, roar: () => QI.RO, cues: [[QI.RO, 'cry']],   /* naturlydene ligger i lydsengen; brølet er artens eget */
      over: (x, t, o) => X.plate(x, t - QI.NM, Object.assign({ skin: 'sea' }, o)),
      fx(S, t, P) { rainFx(S, t, S.k || 1, 0.4 + 0.6 * seg(t, 0, QI.UP));
        if (S.shot === 6) { const hz = G3D.view().y; for (const q of S.L || []) if (q.near) { const a = flick(q.d) * q.k; if (a > 0.05) { const x = 256 + q.a * 220; nearBolt(x + (rnd(q.s, 3) - 0.5) * 60, -10, x, hz + 6, a, q.s * 5 + (q.d > 0.12 ? 2 : 0), 3.2); } } } } });   /* lynet i brølet ender i horisonten ved siden av ham, bak ham (Jazz 20.11: aldri på ham) */

    /* ---------- Primal (skisse 4 fra sparringen, på låtas klokke fra 3:15,7; Jazz 20.11, chat 3) ----------
       Endret fra skisse 3 (Jazz: «Han skal være opp på 3:43 akkurat, da er det første slaget», «Forstatt ingen lys ned i vannet», «fortsatt er han synlig hele tiden hvor han
       bare venter», og «stormen er aaalt for dårlig … Det skal forsse nedover med vann som også gjør det lettere å skille. Du har masse bilder å gå etter»):
       1 stormen langt borte (i 3D: hyllesky, regnsøyler som fosser ned, lyn inne i regnet; himmelen over oss er lysere) · 2 dronen langs fronten (vinkelen fra skisse 3, som
       var bedre): stormen til venstre presser inn mot arenaen, havet under den er mørkt og grovt, utenfor grått og roligere; han er ikke med · 3 han stuper (3:29,1) ·
       4 vannet lukker seg · 5 et lys langt nede (3:34,9): lite og svakt, og det stiger hele tiden · 6 sterkere (3:39,8), og dritfort opp på riseren (3:42,45) · 7 han er oppe på
       det første slaget 3:42,96 (sub-slaget, låtas rutenett på 0,8 s) med lyn på begge sider og stiger videre til det blir svart 3:43,90 · 8 pangen 3:44,55 lenger borte ·
       9 svart · 10 smellet 3:46,15: han er alt oppe foran oss og brøler. Havet og sprutet går i stor målestokk (TS, SLOW). */
    const QP = { DR: 5.44, ARR: 11.84, DV: 13.43, CL: 16.6, DEEP: 19.2, SH: 24.1, UP: 26.75, C: 27.26, B1: 28.2, S: 28.85, B2: 29.82, L: 30.45, N: 31.15, F: 32.5, E: 32.82 };
    const GL = [HOME[0], HOME[2] + 4];   /* der lyset og Primal kommer opp */
    /* Finpuss (Jazz 24.11 kveld: «siste finpuss på bevegelsen når kyogre dukker ned i havet i primal overgangen og finpuss i vannet»): dykket som en hval.
       DVK: nøklene etter QP.DV (s): TH snuten ned (+), V farten langs snuten, SH finnene opp (+) og ned, AY finnene bakover langs kroppen (+), HP hofta (+ senker halen,
       målt), NK nakken (+ løfter hodet). Banen er integralet av farten langs snuten, så kroppen følger snuten gjennom det samme hullet i flaten. */
    const DVK = { TH: [[0, -0.03], [0.45, -0.1], [1.3, 0.6], [2.2, 1.2], [3.0, 1.45], [3.4, 1.5]], V: [[0, 0.5], [0.4, 0.8], [1.2, 3.0], [2.2, 4.5], [3.4, 5.0]],
      SH: [[0, 0], [0.35, 0.38], [0.85, -0.42], [1.4, -0.25], [2.2, -0.3], [3.4, -0.3]], AY: [[0, 0], [0.7, 0.05], [1.5, 0.55], [2.4, 0.75], [3.4, 0.75]],
      HP: [[0, 0], [0.5, -0.06], [1.2, 0.1], [1.7, -0.2], [2.3, -0.7], [2.9, -0.45], [3.4, -0.2]], NK: [[0, 0], [0.45, 0.1], [1.3, -0.18], [2.4, -0.1], [3.4, -0.05]] };
    const DVT = 2.2, DVZ = 3.5;   /* når og hvor halen går under (målt med dvPath og benene) */
    const dvPath = s => { let y = 0, z = 0; const n = Math.ceil(max(0, s) * 90), h = n ? s / n : 0; for (let i = 0; i < n; i++) { const q = (i + 0.5) * h, th = hs(q, DVK.TH), v = hs(q, DVK.V); y -= v * sin(th) * h; z += v * cos(th) * h; } return [y, z]; };
    /* ---------- BEVEGELSEN i Primal-filmen etter Fable (Opus 25.11; se «BEVEGELSEN» øverst i fila). Nøkkelposene (arket: work/raids3d/kyogre/bevegelse/poser.jpg):
       P1 dykket (godkjent: banen, formen og tidene står; finnene og halen er kjeder som henger etter, hodet leder ned) · P2 breachen 3:42,96 (han er halvveis ute på klippet;
       finnene ligger bakover og svinger ut og opp når han bremser, kroppen ruller litt som en knølhval, halen og halefinnene henger etter) · P3 pangen 3:44,55 (han faller med
       snuten først; finnene og halen henger igjen oppover, finnene legges bakover) · P4 brølet på smellet 3:46,15 (kjeven først, så nakken, skuldrene, hodet og armene; stive
       fjærer i kastet; holdet med stavelser og skjelv under 3 Hz; slakker mot slutten som før). Klippene til breachen, pangen og brølet starter med fart: fjærene starter
       0,3–0,6 s før i det svarte, så finnene og halen alt henger etter når bildet kommer. */
    const MVP = (() => {
      const Z3 = [0, 0, 0], dbg = () => G3D.dbgKey;
      /* Dykket: nøklene i DVK står (godkjent). Finnene: kjeder etter skulderen (SH) og sveipet bakover (AY); halen: en kjede etter hoftene (HP) med en langsom halebølge
         i ankeret (før: sin per ledd med fast fase). Hodet og nakken som fjærer (hodet raskere, så det leder ned). */
      const D0 = QP.DV - 0.06, sOf = t => max(0, t - QP.DV);
      const dFin = ph => kjede({ n: 3, t0: D0, fo: 0.86, lim: 0.8, fz: () => [1.1, 0.48],
        drive: t => { const s = sOf(t); return [0, hs(s, DVK.AY) * 0.6, hs(s, DVK.SH) + 0.08 * hs(s, DVK.TH)]; }, pose: (t, i) => [0, i === 1 ? 0.15 * hs(sOf(t), DVK.AY) : 0, 0] });
      const dFL = dFin(0), dFR = dFin(1);
      const dTail = kjede({ n: 4, t0: D0, fo: 0.88, lim: 0.7, fz: () => [0.9, 0.42],
        drive: t => { const s = sOf(t); return [0, -hs(s, DVK.HP) + 0.35 * hs(s, DVK.TH) + 0.1 * sin(t * 1.5) * c01(s / 0.8), 0]; },
        pose: (t, i) => [0, i === 0 ? 0.35 * hs(sOf(t), DVK.HP) : i === 1 ? 0.25 * hs(sOf(t), DVK.HP) : 0, 0] });
      const dNk = followV(t => [hs(sOf(t), DVK.NK)], () => [1.5, 0.55], D0), dHd = followV(t => [0.5 * hs(sOf(t) + 0.04, DVK.NK)], () => [2.0, 0.5], D0);
      const dive = (g, t) => { const s = sOf(t), a0 = hs(s, DVK.SH), ay = hs(s, DVK.AY), d = dbg() ? null : [dFL(t), dFR(t)], tl = dbg() ? null : dTail(t);
        g.add({ '*Shoulder': [0, 0, a0], '*Arm': [0, ay, 0], '*ForeArm': [0, 0.15 * ay, 0], Neck: [0, dbg() ? hs(s, DVK.NK) : dNk(t)[0], 0], Head: [0, dbg() ? 0.5 * hs(s, DVK.NK) : dHd(t)[0], 0], Hips: [0, hs(s, DVK.HP), 0],
          Tail1: [0, 0.35 * hs(s, DVK.HP), 0], Tail2: [0, 0.25 * hs(s, DVK.HP), 0] }, 1);
        if (!d) return; [['L', 0], ['R', 1]].forEach(([sd, k]) => { const q = d[k], sg = sd === 'L' ? 1 : -1;
          g.add({ [sd + 'Arm']: [0, q[0][1], sg * q[0][2]], [sd + 'ForeArm']: [0, q[1][1], sg * q[1][2]], [sd + 'Hand']: [0, q[2][1], sg * q[2][2]] }, 1);
          for (const [f, w] of [['FingerA', 0.5], ['FingerB', 0.65], ['FingerC', 0.55], ['FingerD', 0.4]]) g.add({ [sd + f]: [0, 0, sg * w * q[2][2]] }, 1); });
        g.add({ Tail1: [0, tl[0][1], 0], Tail2: [0, tl[1][1], 0], '*FeelerB1': [0, tl[2][1], 0], '*FeelerB2': [0, tl[3][1], 0], '*FeelerC1': [0, 0.7 * tl[3][1], 0] }, 1); };
      /* Primal: finnene, halen og halefinnene (de lange flikene C og D) som kjeder. drive: skulderens løft og sveip, og kroppens løft og stamp som vinkler (vannet og lufta holder
         igjen: han stiger → tuppene henger ned; han bremser → de svinger forbi). */
      const BR0 = QP.C - 0.6, ub = t => (t - (QP.C - 0.02)) / (QP.B1 + 0.6 - (QP.C - 0.02));
      const brY = t => { const u = ub(t); return u >= 0 ? mix(2.5, 15.5, eo(c01(u))) : 2.5 + 13 * 3 * u; };   /* breachens løft (som i dag), og før klippet med samme fart (i det svarte) */
      const brP = t => mix(-1.38, -1.12, io(c01(ub(t))));
      const bShK = [[BR0, [0, 0.55, 0.05]], [QP.C - 0.05, [0, 0.5, 0.1]], [QP.C + 0.3, [0, 0.12, 0.48]], [QP.C + 0.62, [0, -0.05, 0.62]], [QP.B1, [0, 0, 0.58]]];   /* [_, sveip bakover (Arm y), løft (Shoulder z)] */
      const bSh = followV(t => keyAt(bShK, t), () => [1.6, 0.5], BR0);
      const brFin = ph => kjede({ n: 3, t0: BR0, fo: 0.86, lim: 0.8, fz: () => [1.25, 0.54],
        drive: t => { const q = dbg() ? keyAt(bShK, t) : bSh(t); return [0, q[1], q[2] + 0.035 * brY(t) + 0.02 * sin(TAU * 0.9 * t + ph)]; } });
      const bFL = brFin(0), bFR = brFin(1.3);
      const brTail = kjede({ n: 6, t0: BR0, fo: 0.88, lim: 0.6, fz: () => [1.0, 0.7], drive: t => [0, 0.035 * brY(t) - 0.25 * brP(t) + 0.04 * sin(TAU * 0.7 * t + 0.4), 0], pose: (t, i) => [0, i < 2 ? -0.12 : 0, 0] });
      const brN = followV(t => keyAt([[BR0, [0, 0.05, 0]], [QP.C, [0, 0, 0]], [QP.C + 0.4, [0, -0.2, -0.03]], [QP.B1, [0, -0.24, -0.04]]], t), () => [1.5, 0.5], BR0);
      /* Pangen: han har falt siden toppen i det svarte (8 enheter i sekundet ned, så tyngden). Finnene legges bakover og henger igjen oppover; halen henger igjen. */
      const PA0 = QP.S - 0.5, pY = t => { const s = t - QP.S; return 10 - 8 * s - 0.5 * PG * s * s; }, pR = t => 0.45 + 0.85 * (t - QP.S);
      const pShK = [[PA0, [0, 0.05, 0.4]], [QP.S, [0, 0.2, 0.3]], [QP.S + 0.5, [0, 0.55, 0.12]], [QP.B2, [0, 0.7, 0.05]]];
      const pSh = followV(t => keyAt(pShK, t), () => [1.4, 0.62], PA0);
      const paFin = ph => kjede({ n: 3, t0: PA0, fo: 0.86, lim: 0.8, fz: () => [1.2, 0.54],
        drive: t => { const q = dbg() ? keyAt(pShK, t) : pSh(t); return [0, q[1], q[2] + 0.04 * pY(t) + 0.02 * sin(TAU * 1.1 * t + ph)]; } });
      const pFL = paFin(0), pFR = paFin(1.1);
      const paTail = kjede({ n: 6, t0: PA0, fo: 0.88, lim: 0.6, fz: () => [1.0, 0.5], drive: t => [0, 0.04 * pY(t) + 0.3 * pR(t), 0] });
      const paN = followV(t => keyAt([[PA0, [0, -0.04, 0]], [QP.S, [0, -0.08, 0]], [QP.S + 0.55, [0, -0.2, 0.02]], [QP.B2, [0, -0.26, 0.03]]], t), () => [1.4, 0.55], PA0);   /* snuten leder ned i stupet */
      /* Brølet på smellet: nøkler per gruppe som i introen, fjærene starter 0,3 s før klippet (i det svarte) i krøket, så kastet er i gang når bildet kommer. */
      const L0 = QP.L - 0.45, Lq = QP.L, DK = DUCK, RR = ROAR, J = v => [0, v, 0];
      const nk = (d, r) => [0, d * DK.Neck[1] + r * RR.Neck[1], 0], hd = (d, r) => [0, d * DK.Head[1] + r * RR.Head[1], 0], sh = (d, r) => [0, 0, d * DK['*Shoulder'][2] + r * RR['*Shoulder'][2]], ar = k => RR['*Arm'].map(x => x * k);
      const E = QP.E, sl = k => 1 - 0.5 * k;   /* holdet slakker mot slutten (som i dag: 1 − 0,5 · io) */
      const Gr = {
        ch: [[L0, [0, 0.05, 0]], [Lq - 0.17, [0, 0.05, 0]], [Lq - 0.01, [-0.01, -0.02, 0]], [Lq + 1.0, [-0.012, -0.03, 0]], [Lq + 1.6, [-0.01, -0.025, 0]], [E, [-0.006, -0.012, 0]]],
        nk: [[L0, nk(1, 0)], [Lq - 0.15, nk(1, 0)], [Lq + 0.02, nk(0, 1.08)], [Lq + 0.3, nk(0, 1)], [Lq + 0.8, nk(0, 1.03)], [Lq + 1.6, nk(0, 1)], [E, nk(0, sl(0.8))]],
        hd: [[L0, hd(1, 0)], [Lq - 0.13, hd(1, 0)], [Lq + 0.05, hd(0, 1.1)], [Lq + 0.35, hd(0, 1.03)], [Lq + 0.85, hd(0, 1.05)], [Lq + 1.6, hd(0, 1)], [E, hd(0, sl(0.8))]],
        jw: [[L0, J(-0.12)], [Lq - 0.2, J(-0.15)], [Lq - 0.03, J(-0.95)], [Lq + 0.25, J(-0.92)], [Lq + 1.6, J(-0.9)], [E, J(-0.9 * sl(0.8))]],
        sh: [[L0, sh(1, 0)], [Lq - 0.15, sh(1, 0)], [Lq + 0.03, sh(0, 1.1)], [Lq + 0.3, sh(0, 1.02)], [Lq + 1.6, sh(0, 1)], [E, sh(0, sl(0.8))]],
        ar: [[L0, Z3], [Lq - 0.12, Z3], [Lq + 0.07, ar(1)], [Lq + 1.6, ar(1)], [E, ar(sl(0.8))]],
        hp: [[L0, [0, DK.Hips[1], 0]], [Lq - 0.1, [0, DK.Hips[1], 0]], [Lq + 0.12, [0, RR.Hips[1], 0]], [E, [0, RR.Hips[1] * sl(0.8), 0]]] };
      const Fr = { ch: [2.6, 0.6], nk: [2.8, 0.55], hd: [2.9, 0.5], jw: [3.2, 0.62], sh: [2.7, 0.55], ar: [2.4, 0.55], hp: [2.2, 0.55] };
      const soft = t => io(c01((t - (Lq + 0.5)) / 0.45));   /* stiv i kastet, myk i holdet */
      const RS = {}; for (const k in Gr) { const L = Gr[k], q = Fr[k], sp = followV(t => keyAt(L, t), t => [mix(q[0], q[0] * 0.5, soft(t)), q[1]], L0); RS[k] = t => dbg() ? keyAt(L, t) : sp(t); }
      const rRy = t => 1.8 * (1 - eo(c01((t - Lq) / 1.1)));   /* han synker på plass på smellet (som i dag) */
      const roFin = (ph, fk) => kjede({ n: 3, t0: L0, fo: 0.86, lim: 0.7, fz: t => [fk * mix(1.7, 1.0, soft(t)), 0.55],
        drive: t => [0, 0, (dbg() ? keyAt(Gr.sh, t)[2] : RS.sh(t)[2]) + 0.06 * rRy(t) + 0.02 * sin(TAU * 0.6 * t + ph) * c01((t - Lq - 0.6) / 0.6)] });
      const rFL = roFin(0, 1), rFR = roFin(1.6, 0.92);
      const roTail = kjede({ n: 6, t0: L0, fo: 0.88, lim: 0.6, fz: () => [1.0, 0.66], drive: t => [0, -(dbg() ? keyAt(Gr.hp, t)[1] : RS.hp(t)[1]) + 0.06 * rRy(t) + 0.04 * sin(TAU * 0.35 * t), 0] });
      /* Halen i Primal: Tail1, Tail2, halefinnene B1–B2 og den lange fliken C1–C4 som én kjede; fliken D følger C. */
      const tailP = (p, tl) => { if (!tl) return; p.add({ Tail1: [0, tl[0][1], 0], Tail2: [0, tl[1][1], 0], Tail3: [0, 0.5 * tl[2][1], 0], '*FeelerB1': [0, tl[2][1], 0], '*FeelerB2': [0, tl[3][1], 0], '*FeelerC1': [0, tl[4][1], 0], '*FeelerC2': [0, tl[5][1], 0],
        '*FeelerC3': [0, 0.8 * tl[5][1], 0], '*FeelerD1': [0, 0.8 * tl[4][1], 0], '*FeelerD2': [0, 0.8 * tl[5][1], 0], '*FeelerD3': [0, 0.6 * tl[5][1], 0] }, 1); };
      const finP = (p, dL, dR, sw) => { [['L', dL, 1], ['R', dR, -1]].forEach(([s, q, sg]) => { if (!q) return; p.add({ [s + 'Arm']: [0, q[0][1] - sw, sg * q[0][2]], [s + 'ForeArm']: [0, q[1][1], sg * q[1][2]], [s + 'Hand']: [0, q[2][1], sg * q[2][2]] }, 1);
        for (const [f, w] of [['FingerA', 0.5], ['FingerB', 0.65], ['FingerC', 0.55], ['FingerD', 0.4]]) p.add({ [s + f]: [0, 0, sg * w * q[2][2]] }, 1); }); };
      return { dive,
        breach(p, t) { const q = dbg() ? keyAt(bShK, t) : bSh(t), n = dbg() ? keyAt([[BR0, [0, 0.05, 0]], [QP.C, Z3], [QP.C + 0.4, [0, -0.2, -0.03]], [QP.B1, [0, -0.24, -0.04]]], t) : brN(t);
          p.add({ '*Shoulder': [0, 0, q[2]], Neck: n, Head: [0, 0.6 * n[1], 0], Jaw: [0, -0.22 * sm5((t - QP.C) / 0.6), 0], Hips: [0, 0.12, 0] }, 1);
          finP(p, dbg() ? null : bFL(t), dbg() ? null : bFR(t), 0); p.add({ '*Arm': [0.35, q[1], 0.12], Tail1: [0, -0.12, 0], Tail2: [0, -0.12, 0] }, 1); tailP(p, dbg() ? null : brTail(t));
          return 0.1 + 0.24 * sm5((t - QP.C) / 0.9); },   /* rullen (z), som en knølhval som ruller over */
        pang(p, t) { const q = dbg() ? keyAt(pShK, t) : pSh(t), u = io(c01((t - QP.S) / (QP.B2 - QP.S))), n = dbg() ? [0, -0.1, 0] : paN(t); p.add({ '*Shoulder': [0, 0, q[2]], '*Arm': [0.35 * (1 - u), q[1], 0.12 * (1 - u)], Neck: n, Head: [0, 0.6 * n[1], 0] }, 1);
          finP(p, dbg() ? null : pFL(t), dbg() ? null : pFR(t), 0); tailP(p, dbg() ? null : paTail(t)); },
        roar(p, t) { const q = {}; for (const k in RS) q[k] = RS[k](t); const op = -min(0, q.jw[1]) / 0.9, hold = dbg() ? 0 : c01((op - 0.55) / 0.3) * (1 - 0.6 * c01((t - Lq - 1.6) / 0.6));
          const syl = hold * 0.06 * (0.5 - pust(t, Lq + 0.2, 0.72, 43)), b = dbg() ? 0 : pust(t, Lq + 0.4, 1.6, 71) * c01((t - Lq - 0.6) / 0.5);   /* han puster tungt etter brølet */
          p.add({ Spine: [q.ch[0], q.ch[1] + 0.012 * b, q.ch[2]], Neck: [0, q.nk[1] + 0.012 * hold * X.noise(t, 37, 1.2), 0], Head: [0, q.hd[1] + 0.01 * hold * X.noise(t, 39, 2.4), 0.014 * hold * X.noise(t, 41, 2.1)],
            Jaw: [0, kj(q.jw[1] + syl + 0.022 * hold * X.noise(t, 45, 2.6)), 0], '*Shoulder': q.sh, '*Arm': q.ar, Hips: q.hp }, 1);
          finP(p, dbg() ? null : rFL(t), dbg() ? null : rFR(t), 0); tailP(p, dbg() ? null : roTail(t)); return op; } };
    })();

    /* ---------- Stormen i 3D (bare i skissen; Fable lager den ordentlig) ----------
       Som bildene Jazz sendte (fanart/kyogre/IMG_6597 og IMG_6596): en hyllesky med lys, bulende overside og mørk underside, regnsøyler som fosser ned i havet under den (lysere
       enn skyen bak), lyn inne i regnet, og havet under stormen er mørkt og grovt med skum, mens havet utenfor er roligere og grått (motor.py: uStm). Fronten går langs x og kommer
       fra det åpne havet (+Z) mot arenaen. Dottene og søylene ligger i forhold til fronten (z' bak den), og fronten flyttes (zfAt). */
    const zfAt = t => t < QP.DR ? mix(205, 188, t / QP.DR) : t < QP.DV ? mix(26, -6, (t - QP.DR) / (QP.DV - QP.DR)) : -1000;   /* forbi arenaen (z = 0) på 3:27,54 */
    /* Lynene inne i stormen (1 og 2): fra skybasen ned i havet inne i regnet, og skyene lyser opp innenfra der det slår ned. [når, styrke, x, z'] */
    const BOLTS = (() => { const L = []; let tb = 0.35; for (let i = 0; tb < QP.DV - 0.2; i++) { const dr = tb >= QP.DR;
      L.push([tb, 0.65 + 0.35 * rnd(i, 871), dr ? -40 - rnd(i, 872) * 170 : -210 + rnd(i, 872) * 220, 12 + rnd(i, 873) * 45]);   /* i bildet: dronen ser mot vest, bilde 1 skrått mot venstre */ tb += 0.55 + rnd(i, 874) * 0.75; if (tb > QP.DR - 0.3 && tb < QP.DR) tb = QP.DR + 0.15; } return L; })();

    const lookQ = (S, t, P, q, sn) => { look(S, t, P, q, sn); const ov = S.ov || 0; P.grade.sat *= 0.8 - 0.25 * ov; P.grade.con *= 1.02; P.bloom += 0.04 * (S.dlk || 0); };

    /* Lyset langt nede (Jazz: «bare en lysskilde langt nede», «primal lysene ser du også småt helt i starten … veldig svakt fordi han er langt nede … sterkere lysstyrke
       når han svømmer oppover»): en blå glød i havet (uDL) og oppå (glød og små, uskarpe striper av linjene hans, som om han kommer rett opp mot oss), skarpere og større jo
       høyere han er. Ingen kropp (Jazz: «fortsatt er han synlig hele tiden»). S.dl = { dep: dybden (62 … 0), k: styrken }. */
    const LIGHTS = [[-PI / 2, 0.12, 0.62, 1.3], [PI / 2, 0.15, 0.5, 1], [-0.22, 0.28, 1.15, 1.1], [PI + 0.22, 0.28, 1.15, 1.1], [0.38, 0.22, 0.85, 0.8], [PI - 0.38, 0.22, 0.85, 0.8], [-PI / 2 - 0.55, 0.38, 0.78, 0.7], [-PI / 2 + 0.55, 0.38, 0.78, 0.7]];
    const deepLight = (S, t) => {
      const D = S.dl; if (!D || D.k <= 0.01) return; const g = C.g, q = K.proj(GL[0], -0.2, GL[1]); if (q.z > 1) return;
      const dep = max(0.3, D.dep), sz = min(36, 640 / (dep + 14)), bl = min(10, 0.15 * dep + 0.5), k = D.k, wb = dep / 25;
      const cx = q.x + (1.8 * sin(t * 2.3) + 0.9 * sin(t * 4.1)) * wb, cy = q.y + 1.2 * cos(t * 1.9) * wb;
      C.blob(cx, cy, sz * 3.4, '#2a90ff', min(0.2, 0.2 * k), 1, 0.5); C.blob(cx, cy, sz * 1.6, '#58b8ff', min(0.2, 0.22 * k), 1, 0.55); C.blob(cx, cy, sz * 0.55, '#c8ecff', min(0.22, 0.3 * k * c01(1.5 - dep / 50)), 1, 0.65);   /* 2b.3: taket på styrken gjør at lyset aldri blir en hvit skive; formen (linjene) bærer det */
      g.save(); g.globalCompositeOperation = 'lighter'; g.filter = `blur(${bl.toFixed(1)}px)`; g.lineCap = 'round';
      for (let i = 0; i < LIGHTS.length; i++) { const [a0, r0, r1, w] = LIGHTS[i], a = a0 + 0.05 * sin(t * 2.6 + i);
        g.strokeStyle = `rgba(150,222,255,${min(0.8, 0.6 * k * (0.75 + 0.25 * sin(t * 5 + i * 1.7))).toFixed(3)})`; g.lineWidth = max(1.2, w * sz * 0.09);
        g.beginPath(); g.moveTo(cx + cos(a) * r0 * sz, cy + sin(a) * r0 * sz * 0.75); g.lineTo(cx + cos(a) * r1 * sz, cy + sin(a) * r1 * sz * 0.75); g.stroke(); }
      g.restore(); };

    /* Kameraene i Primal med en tenkt rigg (camLive; se kameraene i introen): banene er de samme som før, havet legges på etterpå (camRid). */
    const CAMQ = [
      camLive(t => { const e = io(uOf(t, 0, QP.DR - 0.02)); return [mix(34, 30, e), 4.6, mix(36, 40, e), mix(-150, -140, e), 12, 320, 42, 0.02]; }, { t0: 0, rig: 'baat', seed: 41 }),
      camLive(t => { const e = io(uOf(t, QP.DR - 0.02, QP.DV - 0.05)), cx = mix(66, 44, e), cy = mix(19, 15.5, e), cz = zfAt(t) - 30; return [cx, cy, cz, cx - 80, 9, cz + 9, 52, 0.02]; }, { t0: QP.DR, rig: 'heli', seed: 42 }),   /* t0 på DR: banen følger stormfronten, som hopper der (zfAt) */
      camLive(t => { const e = io(seg(t, QP.DV, QP.DV + 2.2)); return [-1.6, 2.6, -13, 0, mix(2.4, 3.6, e), mix(-2, 2, e), 70, 0.03]; }, { t0: QP.DV - 0.05, rig: 'baat', seed: 43 }),
      camLive(t => { const e = io(uOf(t, QP.CL, QP.DEEP - 0.03)); return [7, mix(7, 9, e), -14, 0, 0, 3, 50, 0]; }, { t0: QP.CL, rig: 'heli', seed: 44 }),
      camLive(t => { const e = io(uOf(t, QP.DEEP - 0.03, QP.SH - 0.03)); return [GL[0] + mix(7, 6, e), mix(9, 8.5, e), GL[1] + mix(27, 24, e), GL[0], 0, GL[1] - 5, 46, 0.02]; }, { t0: QP.DEEP - 0.03, rig: 'heli', seed: 45 }),
      camLive(t => { const e = io(seg(t, QP.SH, QP.UP)), e2 = ei(seg(t, QP.UP, QP.C)); return [GL[0] + mix(4.5, 3.5, e), mix(9.5, 8.5, e) - 1.2 * e2, GL[1] + mix(16, 13, e) - 2 * e2, GL[0], 0, GL[1] - 1, mix(50, 54, e2), 0.02]; }, { t0: QP.SH - 0.03, rig: 'heli', seed: 46 }),
      camLive(t => [23, 1.3, 54, 0, mix(7.5, 9.5, io(uOf(t, QP.C - 0.02, QP.B1))), 4, 48, -0.04], { t0: QP.C - 0.02, rig: 'baat', seed: 47 }),
      camLive(t => { const u = uOf(t, QP.S - 0.01, QP.B2); return [mix(58, 55, u), 7, mix(104, 100, u), 0, mix(9, 5, u), 4, 27, -0.02]; }, { t0: QP.S - 0.01, rig: 'heli', seed: 48 }),
      camLive(t => { const e = io(seg(t, QP.L, QP.E)); return [mix(15, 12.5, e), mix(5.1, 4.5, e), mix(30, 26, e), -0.5, mix(4.5, 4.1, e), 2, 50, -0.03]; }, { t0: QP.L - 0.01, rig: 'baat', seed: 49 })];
    G3D.def('c3:382p', {
      len: QP.E, R: QP.L, at: 195.7, mus: { bed: 'sfx/natur/kyogre_primal.mp3' }, models: ['kyogre', 'kyogre_primal'], edge: 'sea', env: { rim: '#a8c8ff', glow: '#2a8acc', fog: '#16222e', glowH: 3 },
      make(K, T) { const S = storm(T), g = S.gr = kyFig(), p = S.pg = kypFig(); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.T = T;
        S.sea.material.uniforms.uTime = { value: 0 }; S.sprays.forEach(q => { slowIn(q, SLOW); q.material.uniforms.uA.value = 0.3; }); mkStorm(S, K, T); S.cliff = S.scene.children[1];
        const pts = (n, f, o) => { const q = slowP(n, f, o, SLOW); S.scene.add(q); return q; };
        S.dsp = slowP(460, i => { const a = rnd(i, 11) * TAU, q = rnd(i, 12); return { p: [cos(a) * 5, 0.3, sin(a) * 4], v: [cos(a) * (3 + 9 * q), 8 + rnd(i, 13) * 16, sin(a) * (3 + 9 * q) - 5], b: rnd(i, 14) * 0.6, l: 1.4 + rnd(i, 15) * 0.6, z: 0.5 + rnd(i, 16) * 1.4 }; }, { t0: -1e5, shade: 1, g: 14, drag: 0.6, px: 30, near: 7, sz0: 0.6, sz1: 2.2, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.7, fade: 0.6, floor: -1 }, 0.6); S.scene.add(S.dsp);
        S.col = pts(620, i => { const a = rnd(i, 21) * TAU, q = rnd(i, 22), r = 3 + q * 6; return { p: [cos(a) * r, 0.5 + rnd(i, 23) * 3, sin(a) * r * 0.8], v: [cos(a) * (2 + 6 * q), 18 + rnd(i, 24) * 22 * (1 - 0.5 * q), sin(a) * (2 + 6 * q)], b: rnd(i, 25) * 0.55, l: 2.4 + rnd(i, 26), z: 1.2 + rnd(i, 27) * 2.6 }; }, { t0: -1e5, shade: 1, g: 16, drag: 0.5, px: 36, sz0: 0.6, sz1: 2.2, c: ['#f6fcff', '#c8dcea', '#708ea2'], a: 0.75, fade: 0.5, floor: -1 });
        S.brk = pts(520, i => { const a = rnd(i, 51) * TAU, q = rnd(i, 52); return { p: [cos(a) * 3 * q, 0.3, sin(a) * 3 * q], v: [cos(a) * (3 + 9 * q), 16 + 20 * rnd(i, 53), sin(a) * (3 + 9 * q)], b: rnd(i, 54) * 0.1, l: 1.8 + rnd(i, 55), z: 0.9 + rnd(i, 56) * 2.2 }; }, { t0: -1e5, shade: 1, g: 16, drag: 0.5, px: 32, c: ['#f6fcff', '#c8dcea', '#708ea2'], a: 0.85, fade: 0.5, floor: -1 });
        S.sheet = pts(220, i => { const a = rnd(i, 31) * TAU; return { p: [(rnd(i, 32) - 0.5) * 8, 4 + rnd(i, 33) * 14, (rnd(i, 34) - 0.5) * 6], v: [cos(a) * 2, -2 - rnd(i, 35) * 3, sin(a) * 2], b: rnd(i, 36) * 1.2, l: 1.1 + rnd(i, 37) * 0.6, z: 0.5 + rnd(i, 38) * 0.9 }; }, { t0: -1e5, shade: 1, g: 22, px: 26, c: ['#f0f8ff', '#a8c4d8', '#5a7486'], a: 0.85, fade: 0.8, floor: -1 });
        S.wallp = pts(380, i => { const a = rnd(i, 41) * TAU, q = rnd(i, 42), r = 5 + q * 12; return { p: [cos(a) * r, 0.5, sin(a) * r * 0.5], v: [cos(a) * (6 + 14 * q), 22 + rnd(i, 43) * 34 * (1 - 0.6 * q), sin(a) * (6 + 14 * q) * 0.35], b: rnd(i, 44) * 0.4, l: 2.8 + rnd(i, 45) * 1.2, z: 0.8 + rnd(i, 46) * 2.4 }; }, { t0: -1e5, shade: 1, g: 15, drag: 0.7, px: 26, near: 8, sz0: 0.6, sz1: 2.4, c: ['#eef8ff', '#b8d0e0', '#5a7486'], a: 0.12, fade: 0.6, floor: -1 });
        /* 2b.3: plaskene som former (crown, øverst i fila): der han stuper, der han bryter flaten, der han stuper ned igjen langt borte, og veggen av vann bak ham i brølet. */
        /* Finpuss 24.11 kveld: plaskene er hvitt vann (plume, som i introen), ikke kroner: finnene og snuten der han dykker, halen der den går under, breachen og pangen. */
        S.dcr = plume(S, T, { r: 3, h: 9, out: 3, n: 300, sd: 401 }); S.dfp = [-1, 1].map(sd => plume(S, T, { r: 1.8, h: 5, out: 2.2, n: 150, sd: 411 + sd * 3 })); S.dnp = plume(S, T, { r: 2.4, h: 6, out: 2.6, n: 200, sd: 421 });
        S.bcr = plume(S, T, { r: 6, h: 14, out: 5, n: 420, sd: 431, px: 160, a: 0.4 }); S.ecr = plume(S, T, { r: 5.5, h: 16, out: 6, n: 420, sd: 441, px: 175, a: 0.44 });
        S.wcr = crown(S, T, { r: 9, out: 9, h: 22, up: 1.3, dir: [-0.47, -0.88], arc: -0.25, lean: 3, sd: 27, a: 0.78, c0: '#b9c9d4', c1: '#73899a' });   /* mørkere enn de andre: den står rett bak ham i lynet og skal ikke bli en hvit vegg */ S.pmist = mistP(46, 9, 16, 321); S.scene.add(S.pmist);
        return S; },
      act(S, t, o) {
        const ny = !STIV();   /* den nye bevegelsen (Opus 25.11); 'stiv' = slik den var */
        const g = S.gr, p = S.pg, U = K.U(), su = S.sea.material.uniforms, ts = t * TS; su.uTime.value = ts; S.under = 0;
        const black = (t >= QP.B1 && t < QP.S) || (t >= QP.B2 && t < QP.L); S.black = black;
        const drone = t >= QP.DR - 0.02 && t < QP.DV - 0.05, outside = t < QP.DV - 0.05;
        /* Stormen: langt borte (1), langs dronen (2), så er vi inne i den (Jazz: «helt til det høljer ned, er veldig grått»). */
        S.zf = zfAt(t); S.stormOn = !black; S.cliff.visible = t >= QP.DR - 0.02; S.sy = t < QP.DR - 0.02 ? 0.55 : 1; S.ss = 1; S.sa = PI; S.ov = outside ? (drone ? 0.12 * seg(t, QP.ARR - 1, QP.DV) : 0) : 1; S.sd = outside ? (drone ? 0.6 : 0.2) : 0;
        S.st = outside ? 0.35 : 1; S.grey = S.ov; S.fb = !outside;
        const k = outside ? 1 : 1.5 + 0.3 * seg(t, QP.L, QP.L + 0.6), kk = k - 1;
        if (outside) { su.uSea.value.set(1.0, 0.7, 0.08, 0.06); su.uStm.value.set(S.zf + 4, 5, 1, 1); }
        else { su.uSea.value.set(1.15 + 0.6 * kk, 1.3 + 0.5 * kk, 0.06 + 0.1 * seg(t, QP.L, QP.L + 1), 1); su.uStm.value.set(-1000, 5, 1, 1); }   /* lite skum på toppene (store grå flater nært), småskum overalt (uStm) */
        su.uWind.value.set(0.35, 1, 1.05, 0);
        /* Lynene. Ute (1, 2): inne i regnet i stormen (BOLTS, i 3D); inne i stormen: masse, men aldri på ham (Jazz 20.11). De nære står ved kantene og ender i horisonten. */
        const L = [], BL = []; let lit = null;
        if (!black && outside) for (const [tb, kb, x, zz] of BOLTS) { const d = t - tb; if (d < 0 || d > 0.7) continue; const a = flick(d) * kb; BL.push({ d, k: kb, x, z: S.zf + zz, s: floor(tb * 41) });
          if (!lit || a > lit.a) lit = { a, x, z: S.zf + zz }; L.push({ d, k: kb * 0.3, a: PI, s: floor(tb * 41) }); }
        if (!black && !outside) { for (const q of strikes(t, t < QP.DEEP ? 0.9 : t < QP.L ? 0.3 : 2.6, 81)) L.push({ d: t - q[0], k: q[1] * 0.8, a: q[2], s: q[3], near: false });
          for (const [tb, kk2, a, nr] of [[QP.DV, 1, -1.35, 0], [QP.DEEP, 0.9, -0.2, 0], [QP.SH, 1, 0.25, 0], [QP.UP + 0.2, 0.8, -0.6, 0],
              [QP.C - 0.01, 1, -0.42, 1], [QP.C + 0.02, 0.95, 0.45, 1], [QP.C + 0.45, 0.9, -0.5, 1], [QP.C + 0.5, 0.85, 0.55, 1], [QP.S, 0.9, 0.7, 0],
              [QP.L, 1, -0.8, 1], [QP.L + 0.15, 0.95, 0.85, 1], [QP.L + 0.4, 0.85, -0.65, 1], [QP.L + 0.7, 0.85, 0.95, 1], [QP.L + 1.0, 0.85, -0.95, 1], [QP.L + 1.35, 0.8, 0.7, 1], [QP.L + 1.7, 0.8, -0.75, 1]])
            L.push({ d: t - tb, k: kk2, a, s: floor(tb * 37 + 3), near: !!nr }); }
        S.L = L; S.BL = BL; const fl = black ? 0 : flashOf(L); S.fl = fl;
        const ov = S.ov, bl = C.blend;
        /* Fargene: utenfor stormen lyst og grått, inne i den mørkt grått; lynet lyser opp. */
        const pu = S.puff.m.material.uniforms, ru = S.rain.m.material.uniforms;
        lerpC(pu.uCL, bl('#727f8b', '#4e5963', ov), '#c8dcf4', fl * 0.3); lerpC(pu.uCD, bl('#232c35', '#1b2229', ov), '#5a6f88', fl * 0.3); lerpC(pu.uCB, bl('#10151a', '#0f1418', ov), '#3e5068', fl * 0.3);
        lerpC(ru.uCR, drone ? bl('#8494a2', '#4e5b66', ov) : '#44505c', '#c8dcf4', fl * 0.25); ru.uFk.value = drone || !outside ? 0.75 : 0.3; pu.uFk.value = drone || !outside ? 0.75 : 0.5;
        const la = lit ? lit.a * 0.9 : 0; for (const u of [pu, ru]) u.uLit.value.set(lit ? lit.x : 0, 20, lit ? lit.z : 0, la);
        lerpC(su.uSkyA, bl('#7d8a95', '#2c3843', ov), '#b8cce8', fl * (outside ? 1 : 0.45)); lerpC(su.uSkyB, bl('#3a4651', '#0c131a', ov), '#40557a', fl); lerpC(su.uDeep, bl('#06141c', '#020f18', ov), '#0a2a3a', fl * 0.6);
        lerpC(su.uShal, bl('#1a3a44', '#0d4a58', ov), '#2a6a7a', fl * 0.4); su.uBri.value = 1 + 0.3 * fl;
        S.stacks.forEach((m, i) => { const t0 = crestAt(su, m.position.x, m.position.z, ts) / TS; S.fx(S.sprays[i], t0); S.scr[i].at(t, t0); });
        /* Vanlig form: ligger høyt i havet og stuper fram og ned på 3:29,1. Han er ikke med før han stuper (Jazz: «fortsatt er han synlig hele tiden hvor han bare venter»). */
        const dv = io(seg(t, QP.DV, QP.DV + 1.5)), sea0 = K.seaH(su, HOME[0], HOME[2], ts);
        g.root.visible = !black && t >= QP.DV - 0.05 && t < QP.DV + 3.3;
        if (g.root.visible) { const s = max(0, t - QP.DV), [py, pz] = dvPath(s), dl = 0.14;   /* finpuss: dykket som en hval (DVK) */
          g.root.position.set(HOME[0], (KYH * 0.7 + 0.8 * sea0) * (1 - io(seg(s, 0, 1.2))) + py, HOME[2] + pz); g.root.rotation.set(hs(s, DVK.TH), 0, 0);
          const a0 = hs(s, DVK.SH), a1 = hs(s - dl, DVK.SH), a2 = hs(s - 2 * dl, DVK.SH), ay = hs(s, DVK.AY);   /* finnen bøyer seg: hvert ledd henger etter det forrige */
          if (ny) MVP.dive(g, t); else g.add({ '*Shoulder': [0, 0, a0], '*Arm': [0, ay, 0.9 * (a1 - a0)], '*ForeArm': [0, 0.3 * ay, 0.9 * (a2 - a1)], Neck: [0, hs(s, DVK.NK), 0], Head: [0, 0.5 * hs(s - 0.12, DVK.NK), 0],
            Hips: [0, hs(s, DVK.HP), 0], Tail1: [0, 0.6 * hs(s - 0.15, DVK.HP) + 0.1 * sin(t * 1.5), 0], Tail2: [0, 0.5 * hs(s - 0.3, DVK.HP) + 0.12 * sin(t * 1.5 - 0.7), 0] }, 1);
          lines(g, 0.8 + 0.3 * dv, 0); g.eye(0, 0, 0.3); }
        /* Lyset langt nede fra 3:34,9: dybden 62 → 44 til suget (3:39,8), 44 → 24 til riseren (3:42,45), så dritfort opp til flaten på slaget (3:42,96). */
        const dep = t < QP.SH ? mix(62, 44, seg(t, QP.DEEP, QP.SH)) : t < QP.UP ? mix(44, 24, io(seg(t, QP.SH, QP.UP))) : mix(24, 0, ei(seg(t, QP.UP, QP.C)));
        const dlk = t >= QP.DEEP && t < QP.C ? (0.95 + 0.2 * seg(t, QP.DEEP, QP.SH) + 0.4 * seg(t, QP.SH, QP.UP) + 1.1 * ei(seg(t, QP.UP, QP.C))) * seg(t, QP.DEEP, QP.DEEP + 0.6) : 0;
        S.dl = { dep, k: dlk }; S.dlk = dlk;
        su.uDL.value.set(GL[0], GL[1], 4 + 10 * (1 - dep / 62), dlk > 0 ? min(0.8, dlk * (0.4 + 0.45 * (1 - dep / 62))) : 0);   /* 2b.3: tak på styrken, så lyset blir blått i vannet og ikke en hvit skive (før opp til 1,4) */ su.uGloC.value.set(0.12, 0.55, 1);
        /* Primal: under vann tegnes han ikke. Oppe på slaget 3:42,96 (halvveis ute når bildet kommer) og stiger videre uten å stoppe til det blir svart 3:43,90;
           lenger borte på 3:44,55 og stuper ned igjen; alt oppe foran oss på smellet 3:46,15. */
        p.root.visible = !black && t >= QP.C - 0.02; let glo = 0; S.rw = 0; S.glo = 0;
        if (t >= QP.C - 0.02 && t < QP.B1) { const u = seg(t, QP.C - 0.02, QP.B1 + 0.6); p.root.position.set(GL[0], mix(2.5, 15.5, eo(u)), GL[1]);   /* godt oppe allerede på slaget */ p.root.rotation.set(mix(-1.38, -1.12, io(u)), -0.3, 0.1);
          if (ny) p.root.rotation.z = MVP.breach(p, t); else p.add(BREACH, 1); glo = 1.22; lines(p, glo, 1); S.glo = 0.4; }   /* 2b.3: over rundt 1,25 brenner linjene ut til hvitt (figurens maske ganger fargen med 1,2 × styrken); før 2,6 */
        else if (t >= QP.S && t < QP.B2) { const u = seg(t, QP.S, QP.B2), s = t - QP.S;   /* finpuss: faller med tyngde og jevn rotasjon (før en ease-in fra 15 enheter) */
          p.root.position.set(HOME[0], 10 - 8 * s - 0.5 * PG * s * s, HOME[2] + 2 + 4.2 * s); p.root.rotation.set(0.45 + 0.85 * s, -0.3, 0.06 * sin(s * 3));   /* han har falt siden toppen i det svarte: 8 enheter i sekundet ned, og tyngden videre */
          if (ny) MVP.pang(p, t); else { p.add(BREACH, 1 - io(u)); p.add({ '*Arm': [0, 0.6 * io(u), 0], '*Shoulder': [0, 0, -0.2 * io(u)] }, 1); SWIM(p, t, 0.3, 1.4); } glo = 1.18; lines(p, glo, 1); S.glo = 0.35; }
        else if (t >= QP.L) { const tq = t - QP.L, ry = KYH + 2.2 + 0.8 * sea0 + 1.8 * (1 - eo(seg(tq, 0, 1.1)));   /* finpuss 2: 2,2 høyere, så hodet og kjeven er over vannet i brølet */
          p.root.position.set(HOME[0], ry + (ny ? 0.22 : 0), HOME[2] + 2); p.root.rotation.set(mix(-0.32, 0, eo(seg(tq, 0, 1.0))),   /* ny: litt høyere, så kjeven står i flaten som i dag også når hodet kastes forbi */ mix(0.1, -0.4, io(seg(tq, 0, QP.E - QP.L))), 0);
          let rw; if (ny) rw = MVP.roar(p, t); else { rw = back(seg(tq, 0, 0.35), 2.2) * (1 - 0.5 * io(seg(tq, 1.6, QP.E - QP.L))); p.add(ROAR, rw); p.rot('Jaw', 0, 0.04 * sin(t * 55) * rw, 0); } S.rw = rw; S.mouth = null; p.eye(0, rw > (ny ? 0.25 : 0.2) ? 0.75 : 0, 0.7);
          glo = 1.1 + 0.08 * rw + 0.22 * hit(tq, 0, 1); lines(p, glo, 1); S.glo = 0.3 + 0.5 * c01(glo - 1); }   /* 2b.3: linjene lyser, men brenner ikke ut til hvite flater (før 2,2–3,4) */
        S.fx(S.brk, QP.C - 0.12, GL[0], 0, GL[1]); S.fx(S.sheet, QP.C + 0.05, GL[0], 4, GL[1]); S.fx(S.col, QP.S + 0.5, HOME[0], 0, HOME[2] + 8); S.fx(S.wallp, QP.L - 0.32, HOME[0], 0, HOME[2] + 3); S.col.visible = t < QP.B2; S.brk.visible = t < QP.B1;   /* dråpene fra forrige bilde skal ikke henge som snø foran ham i brølet */ S.fx(S.dsp, QP.DV + 1.0, HOME[0], 0, HOME[2] - 7);
        S.dcr.at(t, QP.DV + DVT, HOME[0], 0, HOME[2] + DVZ); S.dfp.forEach((q, i) => q.at(t, QP.DV + 0.75, HOME[0] + (i ? 10 : -10), 0, HOME[2] + 4)); S.dnp.at(t, QP.DV + 0.8, HOME[0], 0, HOME[2] + 7);
        S.bcr.at(t, QP.C - 0.3, GL[0], 0, GL[1]); S.ecr.at(t, QP.S + 0.4, HOME[0], 0, HOME[2] + 7.5); S.wcr.at(t, QP.L - 0.9, HOME[0], 0, HOME[2] + 1);
        S.fx(S.pmist, t >= QP.L - 0.5 ? QP.L - 0.5 : QP.C - 0.2, t >= QP.L - 0.5 ? HOME[0] : GL[0], 0, t >= QP.L - 0.5 ? HOME[2] + 1 : GL[1]);
        if (black) S.dcr.visible = S.bcr.visible = S.ecr.visible = S.wcr.visible = S.dnp.visible = S.dfp[0].visible = S.dfp[1].visible = false; if (t < QP.C - 0.02) S.bcr.visible = false;   /* kronen i breachen hører til bildet fra siden (den er alt oppe når bildet kommer) */
        /* Havet: lyset fra dypet, og flaten buler opp over ham like før han bryter ut (uRH, motor.py). */
        su.uGlo.value.set(GL[0], GL[1], 9, t >= QP.UP && t < QP.B1 ? 0.12 * ei(seg(t, QP.UP, QP.C)) + (t >= QP.C ? 0.2 * (1 - seg(t, QP.C, QP.B1)) : 0) : t >= QP.L ? 0.1 + 0.1 * S.rw : 0); su.uBody.value.set(0, 0, 1, 0);
        su.uRH.value[0].set(GL[0], GL[1], 0, t >= QP.UP && t < QP.C + 0.3 ? 2.4 * ei(seg(t, QP.UP + 0.15, QP.C)) * (1 - seg(t, QP.C, QP.C + 0.3)) : 0);
        su.uWade.value.set(t >= QP.UP && t < QP.B1 ? GL[0] : HOME[0], t >= QP.UP && t < QP.B1 ? GL[1] : HOME[2] + (t >= QP.L ? 2 : 0), t >= QP.UP && t < QP.B1 ? 9 : 11, t >= QP.DV - 0.05 && t < QP.DV + 1.5 ? 0.6 : t >= QP.UP && t < QP.B1 ? (t < QP.C - 0.02 ? 0.3 : 0.9) * seg(t, QP.UP + 0.2, QP.C) : t >= QP.L ? 0.9 : 0);   /* før breachen koker vannet bare halvt, så lyset synes gjennom skummet */
        const ring = (i, x, z, t0, v, d, a) => su.uRing.value[i].set(x, z, 3 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
        if (t < QP.B1) { ring(0, HOME[0], HOME[2] + 2, QP.DV + 1.2, 6, 4, 1); ring(1, HOME[0], HOME[2] + 4, QP.DV + 2.2, 4, 4, 0.8); ring(2, GL[0], GL[1], QP.C - 0.05, 9, 2, 1); ring(3, GL[0], GL[1], QP.UP + 0.3, 3, 1.5, 0.5); }
        else { ring(0, HOME[0], HOME[2] + 8, QP.S + 0.5, 8, 2, 1); ring(1, HOME[0], HOME[2] + 2, QP.L - 0.3, 12, 2.5, 1); ring(2, HOME[0], HOME[2] + 2, QP.L + 0.2, 8, 2.5, 0.8); ring(3, 0, 0, 0, 0, 1, 0); }
        /* Lyset og disen: klar luft utenfor stormen (så stormen synes langt borte), tett og grå inne i den. */
        lerpC(U.uKeyC, bl('#8a98a6', '#5a6c80', ov), '#e8f2ff', fl); lerpC(U.uShC, '#0a141e', '#3a4c66', fl); U.uRimK.value = 0.85; U.uGlow.value = 0.3 + 0.4 * (t >= QP.C ? 1 : 0);
        if (outside) { if (drone) U.uFog.value.set(70, 640, 0.72); else U.uFog.value.set(40, 520, 0.8); lerpC(U.uFogC, '#7d8a95', '#a8bcd4', fl * 0.3); }
        else { if (t >= QP.DEEP && t < QP.C) U.uFog.value.set(16, 125, 0.95); else U.uFog.value.set(22, 190, 0.9); lerpC(U.uFogC, '#2c3741', '#5a7090', fl); }
        S.k = k; S.rays = null; S.dg = t >= QP.DEEP && t < QP.UP ? (0.35 + 0.35 * seg(t, QP.DEEP, QP.SH)) * (1 - seg(t, QP.SH + 1.2, QP.UP)) : 0;
      },
      shots: [
        /* 1 Stormen langt borte (Jazz 20.11: «første klipp kan man heller bare se langt borte at det nærmer seg en forferdelig storm»): lavt over et roligere hav mot det åpne
           havet; himmelen over oss er grå og lys, og stormen står mørk ute i horisonten med regn som fosser ned og lyn inni. Kyogre er ikke med. */
        [0, (S, u, a, t) => { const e = io(u), x = mix(34, 30, e), z = mix(36, 40, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); if (STIV()) K.cam(x, h * 0.5 + 4.6, z, mix(-150, -140, e), 12, 320, 42, 0.02); else camRid(S, CAMQ[0](t), t, 0.5, 0); S.post.fade = 1 - seg(t, 0, 0.5); }],   /* skrått mot fronten, så den forsvinner mot horisonten til venstre (IMG_6596) */
        /* 2 Dronen følger stormen (3:21,14), vinkelen fra skisse 3 (Jazz: «var bedre»): høyt og skrått langs fronten mot vest. Stormen til venstre presser inn mot arenaen foran;
           havet under den er mørkt og grovt, utenfor grått og roligere. Fronten er forbi arenaen på 3:27,54. */
        [QP.DR - 0.02, (S, u, a, t) => { const e = io(u), cx = mix(66, 44, e), cy = mix(19, 15.5, e), cz = S.zf - 30; if (STIV()) K.cam(cx, cy, cz, cx - 80, 9, cz + 9, 52, 0.02); else camV(CAMQ[1](t)); }],
        /* 3 Han stuper (3:29,1): lavt bak ham, halefinnen slår en bue over kameraet, og sprut skyller over. */
        [QP.DV - 0.05, (S, u, a, t) => { const e = io(seg(t, QP.DV, QP.DV + 2.2)), ch = K.seaH(S.sea.material.uniforms, -1.6, -13, t * TS);   /* finpuss 2: over dønningene (Jazz: «man kommer under vannet der. kamera må litt opp») */
          if (STIV()) K.cam(-1.6, 2.6 + ch, -13, 0, mix(2.4, 3.6, e), mix(-2, 2, e), 70, 0.03); else camRid(S, CAMQ[2](t), t, 1, 0); S.post.sh = 2.2 * hit(t, QP.DV + 1.1, 0.8); S.post.fl = 0.35 * hit(t, QP.DV + 1.2, 0.35); S.post.flc = '#dde8ee'; }],
        /* 4 Vannet lukker seg over ham. */
        [QP.CL, (S, u, a, t) => { const e = io(u); if (STIV()) K.cam(7, mix(7, 9, e), -14, 0, 0, 3, 50, 0); else camV(CAMQ[3](t)); }],
        /* 5 Lyset langt nede (3:34,9): skrått over havet i stormen, som Godzilla 1:56–2:03; et lite, svakt lys dypt nede som stiger hele tiden. */
        [QP.DEEP - 0.03, (S, u, a, t) => { const e = io(u); if (STIV()) K.cam(GL[0] + mix(7, 6, e), mix(9, 8.5, e), GL[1] + mix(27, 24, e), GL[0], 0, GL[1] - 5, 46, 0.02); else camV(CAMQ[4](t)); S.post.sh = 0.4 * hit(t, QP.DEEP, 0.8); }],
        /* 6 Sterkere (3:39,8), og dritfort opp på riseren (3:42,45): nærmere og brattere; flaten buler opp og lyser like før han bryter ut. */
        [QP.SH - 0.03, (S, u, a, t) => { const e = io(seg(t, QP.SH, QP.UP)), e2 = ei(seg(t, QP.UP, QP.C)); if (STIV()) K.cam(GL[0] + mix(4.5, 3.5, e), mix(9.5, 8.5, e) - 1.2 * e2, GL[1] + mix(16, 13, e) - 2 * e2, GL[0], 0, GL[1] - 1, mix(50, 54, e2), 0.02); else camV(CAMQ[5](t));
          S.post.sh = 0.25 + 0.4 * e + 2.6 * e2; }],
        /* 7 Det første slaget (3:42,96), som bildet Jazz sendte fra skisse 1: lavt fra siden; han er alt halvveis ute når bildet kommer, med lyn på begge sider, og stiger videre. */
        [QP.C - 0.02, (S, u, a, t) => { if (STIV()) K.cam(23, 1.3, 54, 0, mix(7.5, 9.5, io(u)), 4, 48, -0.04); else camV(CAMQ[6](t)); S.post.fl = 0.32 * hit(t, QP.C, 0.12); S.post.flc = '#e8f4ff'; S.post.sh = 5 * hit(t, QP.C, 0.6); }],
        /* Svart i stillheten (3:43,90–3:44,54). */
        [QP.B1, (S, u, a, t) => { K.cam(0, 200, 0, 0, 0, 1, 40); S.post.fade = 1; }],
        /* 8 Pangen (3:44,55): lenger borte; han er i lufta og stuper ned i vannet igjen. */
        [QP.S - 0.01, (S, u, a, t) => { if (STIV()) K.cam(mix(58, 55, u), 7, mix(104, 100, u), 0, mix(9, 5, u), 4, 27, -0.02); else camV(CAMQ[7](t));   /* 2b.3: utsnittet 32 → 27°, så han ikke er så liten («lenger borte» står) */ S.post.sh = 1.2 * hit(t, QP.S + 0.5, 0.9); S.post.fl = 0.35 * hit(t, QP.S, 0.1); S.post.flc = '#e8f4ff'; }],
        /* Svart og stille (3:45,52–3:46,14). */
        [QP.B2, (S, u, a, t) => { K.cam(0, 200, 0, 0, 0, 1, 40); S.post.fade = 1; }],
        /* 9 Smellet (3:46,15): han er alt oppe foran oss (vannet fosser av ham, en vegg av sprut faller), brøler, lyn rundt ham, kort Primal-tekst; kampen tar til igjen. */
        [QP.L - 0.01, (S, u, a, t) => { const e = io(seg(t, QP.L, QP.E)); if (STIV()) K.cam(mix(15, 12.5, e), mix(5.1, 4.5, e), mix(30, 26, e), -0.5, mix(4.5, 4.1, e), 2, 50, -0.03); else camV(CAMQ[8](t));
          S.post.fl = max(0.3 * hit(t, QP.L, 0.1), 0.2 * hit(t, QP.L + 0.4, 0.08), seg(t, QP.F, QP.E - 0.04)); S.post.flc = '#f2f8ff'; S.post.sh = 6 * hit(t, QP.L, 1.4) + 0.8 * S.rw; S.spc = '#bfe4ff'; X.mouth(S, S.pg, QP.L, t, 2.2); }],
      ].map(([t0, f]) => [t0, (S, u, a, t) => { f(S, u, a, t); stormSort(S, t); }]),
    });
    X.reg('c3:382p', { spid: 382, swirl: 0, skin: 'sea', back: skyQ, look: lookQ, roar: () => QP.L, cues: [[QP.L, 'cry']],
      over(x, t, o) { const S = G3D.S('c3:382p'); let on = false; if (S.black) return false;
        /* α langt nede (Jazz 20.11: svakere, og det skal se ut som det er langt nede under vann): uskarpt, blått, lite, og det blafrer med bølgene. */
        if (S.dg > 0.02) { const q = K.proj(GL[0], -0.2, GL[1]); if (q.z < 1) { const cx = q.x / 2 + 1.6 * sin(t * 2.7) + 0.8 * sin(t * 4.3), cy = q.y / 2 + 1.2 * cos(t * 2.1);
          x.save(); x.filter = 'blur(1.6px)'; x.globalAlpha = c01(S.dg * 0.38); X.alpha(x, Math.round(cx), Math.round(cy), 4 + 2 * S.dg, 0.25 + 0.35 * S.dg);
          x.globalAlpha = c01(S.dg * 0.16); X.alpha(x, Math.round(cx + 1.5 * sin(t * 3.3)), Math.round(cy + 1), 5 + 2 * S.dg, 0.2); x.restore(); on = true; } }
        return X.plate(x, t - QP.N, { name: o.name, cap: 'Primal Reversion', sign: X.alpha, skin: 'sea' }) || on; },
      fx(S, t, P) { if (S.black) return; const outside = t < QP.DV - 0.05, dr = t >= QP.DR - 0.02 && outside;
        /* Lynene inne i stormen (1, 2): fra skybasen ned i havet, inne i regnet. */
        for (const b of S.BL || []) { const a = flick(b.d) * b.k; if (a < 0.05) continue; const q0 = K.proj(b.x, 27 * (S.sy || 1), b.z), q1 = K.proj(b.x + (rnd(b.s, 5) - 0.5) * 14, 0, b.z - 4); if (q0.z > 1 || q1.z > 1) continue;
          C.bolt(q0.x, q0.y, q1.x, q1.y, { seed: b.s * 5 + (b.d > 0.12 ? 2 : 0), col: '#a8c8ff', core: '#ffffff', w: dr ? 2.2 : 1.5, a, br: 4, depth: 6 }); C.blob(q0.x, q0.y, dr ? 80 : 60, '#a8c4f8', 0.24 * a, 1, 0.4); C.blob(q1.x, q1.y, dr ? 40 : 30, '#c8dcff', 0.26 * a, 1, 0.3); }
        deepLight(S, t);
        /* Regn foran kameraet: lite utenfor stormen, høljregn inne i den. */
        if (outside) rainFx(S, t, 0.7, dr ? 0.12 + 0.2 * seg(t, QP.ARR - 1, QP.DV) : 0.1);
        else { rainFx(S, t, (S.k || 1) * 1.3, 1); C.parts('rain', { n: 70, seed: 31, cols: ['#9fb4c6', '#d4e2ee'], a: 0.45, spd: 2.2, wind: -1.1, z: [0.2, 0.6] }); }
        const hz = G3D.view().y;
        for (const q of S.L || []) if (q.near) { const a = flick(q.d) * q.k; if (a > 0.05) { const x = 256 + q.a * 230; nearBolt(x + (rnd(q.s, 3) - 0.5) * 70, -10, x + (rnd(q.s, 5) - 0.5) * 30, hz + 6, a, q.s * 5 + (q.d > 0.12 ? 2 : 0), 3.4); } }
        if (t >= QP.DV + 1.1 && t < QP.DV + 3.2) { const d = C.lensDrops({ n: 22, a: 14, size: 10, wet: 0.9 * (1 - seg(t, QP.DV + 2.2, QP.DV + 3.2)), run: 0.6 }); C.lensShine(d, { a: 0.8 }); }
        if (t >= QP.L) { const d = C.lensDrops({ n: 18, a: 14, size: 9, wet: 0.8 * seg(t, QP.L, QP.L + 0.5), run: 0.5 }); C.lensShine(d, { a: 0.8 }); } } });
  }
})();
