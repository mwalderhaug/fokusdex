'use strict';
/* Fokusdex – Articuno (144): cutscenen i 3D før raidet ('c3:144') og arenaen i kampen ('c3:144a', Articuno som Gen 5-bilde lyst av stedet).
   Hentes først når et raid med Articuno viser seg (G3C.load i raid3c.js). Motoren og stilen: raid3d.js. Verktøykassa, riggen og flyriggen: raid3c.js.
   Bygget av Fable 24.11 (steg 2b.4) fra skisse 2 i sparringen (work/raids3d/articuno/): retning A «Frysingen». Det Jazz har låst, står: en kald start på to takter,
   den kommer over trærne på fanfaren 0:00 og stuper mot vannet, flyr lavt og fort mens vannet fryser bak den (0:05,58), sett ovenfra (0:09,75), ett tungt vingeslag
   på aksenten 0:13,91 som fryser hele innsjøen (og et skrik langt borte), en vingeover over skogen med en full rull (0:16,68), Ice Beam som en lang feiing mot
   kameraet (0:22,23 · 0:23,62 · 0:25,00), den står i lufta over plassen fra 0:26,39 (lander ikke), brølet 0:27,78 og navnet 0:29,17. Ingen ettersyn, ingen isspir.
   Filmens tid t = tiden i låta s + CO (den kalde starten er to takter uten musikk: def.at er negativ, se pack.js). 1 enhet = 1 m. Innsjøen har sentrum i origo og
   radius RL; −Z er nord. Sola har nettopp gått ned i nord-nordvest, så himmelen der er fersken og rosa, og motsatt side har jordskyggen med et rosa belte over. */
(() => {
  const K = G3D.K, C = CINE.kit, X = G3C, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, hit, rnd } = K, kf = C.kf, bk = K.back, hyp = Math.hypot;
  const CO = 2.774, F = s => s + CO;                               /* kald start: to takter (2 × 1,387 s) */
  const B0 = 0.036, BT = 0.3468, HP = 2 * BT;                      /* første slag, slaget, og vingeslaget (annethvert slag, 1,44 Hz) */
  const L = { riff: 5.584, top: 9.745, acc: 13.906, up: 16.68, back: 22.23, sw: 23.617, cam: 25.004, hov: 26.391, roar: 27.778, name: 29.165 };
  const RL = 140, SC = 1.3, GR = 9.81, W = 512, Hh = 384;
  const H = [2, 7.4, -30], HYAW = -0.15;                           /* der den står i lufta til slutt (kampens plass), og vendt mot din Pokémon */
  const TN = Math.floor(F(L.name) * 30) / 30, LEN = F(L.name) + 3.2,   /* TN: navnet og klippet til kampens bilde, på filmens bilderute (30 i sekundet) */ SUN = [-0.272, 0.05, -0.961];       /* retningen mot sola (like under horisonten i nord-nordvest) */
  const CAMB = { cp: [-4.2, 4.4, 17], tg: [-1.6, 0.9, -30], fv: 42 };   /* kampens kamera: filmen ender i det (tg stilles inn av X.arena; samme regning i camEnd) */

  /* ---------- Banen: en glatt kurve gjennom knutene (tiden i låta → plassen) ----------
     En naturlig kubisk spline per akse, så både farten og akselerasjonen er sammenhengende: kroppen krenger etter akselerasjonen, og et sprang der ville blitt et rykk.
     Farten ligger i avstanden mellom knutene: over trærne rundt 17 m/s, stupet 29, lavt over vannet 21, toppen av vingeoveren under 10, og null der den står. */
  const KN = [[-3, 6, 12, 226], [-1.4, 4, 18, 200], [0, 2, 37, 178], [1.0, 0.5, 42, 162], [1.8, 0, 39, 150], [3.0, 0, 15, 124], [3.7, 0.8, 6.6, 106], [4.5, 2, 5.4, 86], [5.2, 2.6, 5.6, 70], [5.584, 3, 5.2, 61.5],
    [7.6, 1.5, 4.8, 18], [9.745, -1, 5, -28], [11.8, -3, 5.3, -68], [13.906, -4, 6, -104], [15.2, -9, 15.5, -124], [16.4, -17, 26.5, -137], [17.4, -26, 34.5, -144], [18.2, -34, 38.5, -146], [18.9, -40, 39, -143],
    [19.6, -45, 36.5, -137], [20.4, -48, 29.5, -124], [21.3, -44, 22.5, -106], [22.23, -36, 18, -88], [23.617, -21, 13, -62], [25.004, -7, 10.6, -40], [25.7, -1.5, 8.6, -33.2], [26.391, H[0], H[1], H[2]]];
  const TS = KN.map(k => k[0]), NK = TS.length, TE = TS[NK - 1];
  const spl = ys => { const n = NK, h = [], al = [], l = [1], mu = [0], z = [0], M = new Array(n).fill(0); for (let i = 0; i < n - 1; i++) h.push(TS[i + 1] - TS[i]);
    for (let i = 1; i < n - 1; i++) { al[i] = 6 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1]); l[i] = 2 * (TS[i + 1] - TS[i - 1]) - h[i - 1] * mu[i - 1]; mu[i] = h[i] / l[i]; z[i] = (al[i] - h[i - 1] * z[i - 1]) / l[i]; }
    l[n - 1] = 2 * h[n - 2] - h[n - 2] * mu[n - 2]; M[n - 1] = (6 * (0 - (ys[n - 1] - ys[n - 2]) / h[n - 2]) - h[n - 2] * z[n - 2]) / l[n - 1];   /* den står stille i siste knute */
    for (let i = n - 2; i >= 0; i--) M[i] = z[i] - mu[i] * M[i + 1]; return M; };
  const YS = [1, 2, 3].map(j => KN.map(k => k[j])), MS = YS.map(spl);
  /* Plassen, farten og akselerasjonen på tiden s. */
  const pva = s => { if (s >= TE) return { p: H.slice(), v: [0, 0, 0], a: [0, 0, 0] }; const s0 = max(s, TS[0]); let i = 0; while (i < NK - 2 && s0 > TS[i + 1]) i++;
    const h = TS[i + 1] - TS[i], b = (s0 - TS[i]) / h, a = 1 - b, p = [], v = [], ac = [];
    for (let j = 0; j < 3; j++) { const y0 = YS[j][i], y1 = YS[j][i + 1], m0 = MS[j][i], m1 = MS[j][i + 1]; v[j] = (y1 - y0) / h - (3 * a * a - 1) * h * m0 / 6 + (3 * b * b - 1) * h * m1 / 6;
      p[j] = a * y0 + b * y1 + ((a * a * a - a) * m0 + (b * b * b - b) * m1) * h * h / 6 + (s < TS[0] ? v[j] * (s - TS[0]) : 0); ac[j] = a * m0 + b * m1; }
    return { p, v, a: ac }; };
  const path = s => pva(s).p;

  /* ---------- Skuespillet i tall (tiden i låta) ---------- */
  const UF = s => s < 25.05 ? 0 : s >= 26.6 ? 1 : io(seg(s, 25.05, 26.5));                          /* 0 i flukt, 1 når den står oppreist i lufta */
  /* Vingeslagets utslag (radianer i skulderen). Bunnen av nedslaget treffer annethvert slag (B0 + k · HP): 0:00 over trærne, riffet, aksenten og bremseslagene. */
  const AMP = s => kf(s, [[-3, 0.6], [-0.45, 0.62], [-0.15, 0.86, io], [0.45, 0.86], [1.0, 0, io], [3.9, 0], [4.25, 0.55, io], [9.9, 0.56], [10.9, 0.5], [11.45, 0.04, io], [12.6, 0.04], [13.3, 1.0, io], [14.15, 1.0],
    [14.7, 0.72, io], [17.0, 0.72], [17.8, 0.05, io], [21.6, 0.05], [22.0, 0.13, io], [24.6, 0.13], [24.95, 0.95, io], [26.1, 0.85], [26.7, 0.12, io], [27.1, 0.12], [27.4, 0, io]]);
  const FOLD = s => kf(s, [[-3, 0.85], [1, 0.85], [4, 0.55], [13.2, 0.55], [13.5, 0.9], [17.2, 0.85], [22, 0.5], [24.8, 0.5], [25, 0.95], [26.3, 0.9], [26.8, 0.4]]);
  const TUCK = s => kf(s, [[1.25, 0], [1.95, 0.82, io], [3.0, 0.82], [3.55, 0, io], [19.3, 0], [20.2, 0.3, io], [20.45, 0.6, io], [21.0, 0.6], [21.5, 0, io]]);
  const HOV = s => kf(s, [[25.6, 0], [26.5, 0.34, io], [27.05, 0.34], [27.35, 0, io], [F0E - 0.2, 0], [F0E + 0.9, 0.3, io]]);   /* slaget i den oppreiste stillingen */
  const F0E = 29.7;                                                                                 /* her tar de rolige slagene over etter brølet (ett per takt) */
  const MANT = s => kf(s, [[27.12, 0], [27.62, 1, io], [27.74, 1], [27.86, 0, eo]]);                 /* forvarselet: vingene trekkes fram rundt kroppen før brølet */
  const OPEN = s => s < L.roar - 0.06 ? 0 : kf(s, [[L.roar - 0.06, 0], [L.roar + 0.16, 1, k => bk(k, 2.6)], [L.name + 0.2, 1], [F0E + 0.6, 0, io]]);   /* brølet: vingene helt ut */
  const ROLL = s => TAU * io(seg(s, 20.42, 21.19));                                                 /* en full rull, ferdig på slaget 21,19 */
  const PH = s => s <= 27.2 ? (s - B0) / HP + 0.56 : s < F0E ? (27.2 - B0) / HP + 0.56 : (s - F0E) / (2 * HP);   /* slagets fase: 0 = toppen, 0,56 = bunnen */
  /* Ice Beam («Lang feiing», tidene i låta): takta 22,23 treffer strålen isen under plassen, takta 23,62 begynner den å feie mot kameraet, takta 25,00 er den ved siden
     av kameraet (UC av veien) og ute av bildet, og den slukker like etter. Sporet går fra BA til BB på isen (x, z). */
  const BM = { on: L.back, sw: L.sw, cam: L.cam, end: L.cam + 0.4, off: L.cam + 0.52 }, BA = [H[0], H[2]], BB = [-2.4, 46], UC = 0.684, BLEN = hyp(BB[0] - BA[0], BB[1] - BA[1]);
  const bmU = s => s < BM.sw ? 0 : s < BM.cam ? UC * Math.pow((s - BM.sw) / (BM.cam - BM.sw), 1.6) : min(1, UC + (s - BM.cam) * 60 / BLEN);
  const bmT = u => u <= 0 ? BM.on : u <= UC ? BM.sw + Math.pow(u / UC, 1 / 1.6) * (BM.cam - BM.sw) : BM.cam + (u - UC) * BLEN / 60;   /* når strålen passerer u */
  const bmP = u => [mix(BA[0], BB[0], u), mix(BA[1], BB[1], u)];
  const EF = s => s < L.riff ? 0 : s < L.top ? 1 : s < L.acc ? 0.4 : 0.4 * (1 - c01((s - L.acc) / 0.6));   /* farten som effekt: full ved siden av, under halvparten ovenfra */

  /* ---------- Flyriggens tall for Articuno (målt på modellen: den står oppreist i hvile, med vingene i en V og en hale på 19 ledd) ----------
     fw, di og tw er per segment innenfra og ut (Shoulder, Arm, ForeArm1, ForeArm2, Hand1, Hand2), i grader: se X.bird i raid3c.js. */
  const TAIL = Array.from({ length: 19 }, (_, i) => 'Tail' + (i + 1));
  const BIRD = { fwd: [0, 1, 0], up: [0, 0, -1], mid: [0, 2.35, -0.02], wing: ['Shoulder', 'Arm', 'ForeArm1', 'ForeArm2', 'Hand1', 'Hand2'], tail: TAIL,
    neck: [['Spine2', 0.18], ['Neck', 0.45], ['Head', 0.37]], keep: [['FeelerB1', 0.56]], leg: [['Thigh', 42], ['Leg', 28], ['Foot', 35]],   /* brystfjærene (FeelerB1–3) henger på nakken: holdes inntil kroppen */
    poses: { glide: { fw: [10, 10, 6, -6, -20, -32], di: [3, 6, 4, 0, -4, -6], tw: [0, 2, 2, 0, -3, -6] },          /* glidestillingen: armen litt fram, hånda feid bakover */
      tuck: { fw: [-20, -50, 35, -65, -80, -85], di: [0, 4, 8, 2, 0, 0], tw: [0, 0, 0, 0, 0, 0] },                  /* stupet: vingene lagt bakover langs kroppen */
      open: { fw: [15, 30, 38, 36, 30, 26], di: [0, -4, -6, -6, -4, -2], tw: [0, 0, 0, 0, 0, 0] },                  /* brølet: vingene helt ut og høyt */
      mant: { fw: [8, 6, 26, -8, -36, -48], di: [-6, -20, -30, -38, -40, -40], tw: [0, 4, 8, 12, 14, 14] } },       /* forvarselet: trukket fram rundt kroppen */
    lag: [0, 0.01, 0.05, 0.1, 0.135, 0.19], fa: [0.5, 1, 1.06, 1.14, 1.22, 1.32], fm: [0.06, 0.14, 0.14, 0.1, 0.06, 0],
    fs: [0.14, 0.28, 0.28, 0.28, 0.28, 0.28], ft: [0.05, 0.1, 0.18, 0.28, 0.4, 0.5],
    ff: [0, -18, 14, -30, -48, -58], fd: [0, 0, 3, -6, -12, -16], fq: [0, 0, -4, -8, -14, -18],
    ha: [0.5, 1, 1.05, 1.15, 1.25, 1.4], hd: [0.1, 0.25, 0.3, 0.35, 0.4, 0.45], ht: [0, 0.05, 0.1, 0.2, 0.3, 0.4] };
  X.birds = X.birds || {}; X.birds[144] = BIRD; BIRD.path = s => pva(s); BIRD.perf = (s, T) => perf(s, T);   /* til verktøyene (posearkene) og til de neste som flyr */

  /* Rykket i brølet: starter i null (ikke et sprang), slår ut på fire bilder, svinger og faller til ro. */
  const kick = a => a <= 0 ? 0 : (1 - Math.exp(-16 * a)) * (0.3 + 0.7 * Math.exp(-3 * a) * cos(8 * a));
  /* Kroppen på tiden s: midtpunktet, hodets og ryggens retning, og alt vingene, nakken, beina og halen trenger. V = en ny T.Vector3. */
  const perf = (s, T) => { const V = (x, y, z) => new T.Vector3(x, y, z), q = pva(s), sp = hyp(q.v[0], q.v[1], q.v[2]), uf = UF(s), Y = V(0, 1, 0);
    /* I flukt: fram langs farten, opp langs løftet (akselerasjonen pluss tyngden), så den krenger i svingene og legger seg rundt i vingeoveren av seg selv. */
    const fh = V(sin(HYAW), 0, cos(HYAW)), f = sp > 0.8 ? V(q.v[0], q.v[1], q.v[2]).multiplyScalar(1 / sp) : fh.clone();
    const lf = V(q.a[0], max(q.a[1] + GR + 3.5, 3), q.a[2]); lf.addScaledVector(f, -lf.dot(f));   /* løftet peker aldri ned: over toppen av stupet letter den, den ruller ikke rundt */ if (lf.length() < 0.5) lf.copy(Y).addScaledVector(f, -f.y); const u = lf.normalize();
    const ro = ROLL(s); if (ro > 0 && ro < TAU) u.applyAxisAngle(f, ro);
    const left = V(0, 0, 0).crossVectors(u, f), aoa = 0.03 + 5 / (sp * sp + 30); f.applyAxisAngle(left, -aoa); u.applyAxisAngle(left, -aoa);   /* nesen litt opp, mest når det går sakte */
    /* Oppreist: hodet opp og litt fram mot din Pokémon; den reiser seg forbi og faller til ro (overskudd). */
    const E = 1.25 + 0.22 * sin(PI * c01((s - 25.5) / 0.9)) * (s < 26.4 ? 1 : 0), hf = V(sin(HYAW) * cos(E), sin(E), cos(HYAW) * cos(E)), hu = V(-sin(HYAW) * sin(E), cos(E), -cos(HYAW) * sin(E));
    if (uf > 0) { const m = new T.Matrix4(), qa = new T.Quaternion().setFromRotationMatrix(m.makeBasis(V(0, 0, 0).crossVectors(u, f), u, f)), qb = new T.Quaternion().setFromRotationMatrix(m.makeBasis(V(0, 0, 0).crossVectors(hu, hf), hu, hf));
      qa.slerp(qb, uf); f.set(0, 0, 1).applyQuaternion(qa); u.set(0, 1, 0).applyQuaternion(qa); }
    const ph = PH(s), us = X.bird.warp(ph, 0.56), A = AMP(s), Ah = HOV(s), tk = TUCK(s) * (1 - uf), mt = MANT(s), op = OPEN(s), rest = uf * (1 - op) * (1 - mt);
    const st = { u: us, A, Ah, fold: FOLD(s), w: { glide: (1 - uf) * (1 - tk / max(1 - uf, 1e-3)), tuck: tk, rest, mant: uf * mt * (1 - op), open: uf * op },
      ex: { di: 0.3 * sin(PI * c01((s - 3.1) / 0.9)) * (s < 4 ? 1 : 0) + 0.12 * sin(PI * c01((s - 18.0) / 1.6)) } };   /* vingene bøyes opp av lasten når den retter seg opp etter stupet */
    /* Løftet i vingeslaget, og et lite rykk fram på hvert nedslag der det går fort. */
    const hv = -cos(TAU * (us - 0.12)) * (A * 0.42 + Ah * 0.55), P = V(q.p[0], q.p[1], q.p[2]).addScaledVector(V(0, 0, 0).copy(u).lerp(Y, uf).normalize(), hv).addScaledVector(f, 0.3 * A * sin(TAU * (us - 0.3)) * (1 - uf));
    /* Brølet: den kaster seg litt opp og fram, og faller til ro. */
    const rr = s < L.roar ? 0 : kf(s, [[L.roar, 0], [L.roar + 0.25, 1, eo], [L.name + 0.3, 1], [L.name + 1.3, 0.2, io]]); P.y += 0.6 * kick(s - L.roar) - 0.35 * mt;
    /* Hodet: ser dit den flyr og holdes vannrett i svingene; under Ice Beam sikter det på punktet strålen treffer; i brølet løftes det. */
    const up0 = Y.clone().addScaledVector(f, -f.y).normalize(), l0 = V(0, 0, 0).crossVectors(up0, f), bank = Math.atan2(-u.dot(l0), u.dot(up0)), inRoll = ro > 0.05 && ro < TAU - 0.05 ? 1 : 0;
    let np = 1.36 * (1 - uf) + 0.12 * uf, nr = -bank * 0.82 * (1 - inRoll) * (1 - uf), ny = 0; const bw = kf(s, [[BM.on - 0.5, 0], [BM.on - 0.05, 1, io], [BM.end, 1], [BM.off + 0.5, 0, io]]);
    const bu = bmU(s), bp = bmP(bu), aim = V(bp[0], 0.2, bp[1]);
    if (bw > 0) { const d = aim.clone().sub(P).normalize(), lft = V(0, 0, 0).crossVectors(u, f), th = Math.atan2(d.dot(f), -d.dot(u)), psi = Math.asin(max(-1, min(1, d.dot(lft)))); np = mix(np, th, bw); ny = psi * bw * 0.9; nr *= 1 - bw; }
    np += -0.14 * rr - 0.3 * mt;   /* i brølet skytes hodet fram mot oss (ansiktet skal synes, ikke haka); i forvarselet trekkes det ned */
    return { s, P, f, u, sp, uf, st, np, nr, ny, lg: 1 - uf - 0.35 * sin(PI * c01((s - 25.2) / 1.1)), jaw: max(0.42 * (bw > 0.6 ? 1 : 0) * (s < BM.off ? 1 : 0), 0.52 * rr), rr, aim, bw, A, Ah, us, mt }; };
  /* Halen: et bånd som følger banen den nettopp fløy (hvert ledd peker dit kroppen var litt før), med en bølge fra vingeslagene som går utover; når den står, henger
     den som i hvilestillingen og svaier. Retningene er i verden. */
  const tailDirs = (q, T, bd, t) => { const D = [], s = q.s, sp = max(q.sp, 7), hang = max(q.uf, 1 - c01(q.sp / 6)), R = bd.rig, Qr = bd.q0, left = new T.Vector3().crossVectors(q.u, q.f);
    for (let k = 0; k < 19; k++) { const w = k / 18, t0 = 0.07 + k * 0.94 / sp, t1 = 0.07 + (k + 1) * 0.94 / sp, a = path(s - t0), b = path(s - t1), d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (d.length() < 1e-3) d.copy(q.f).negate(); d.normalize(); d.y -= 0.16 * w * w; d.addScaledVector(q.u, (0.5 * q.A + 0.06) * w * sin(TAU * (q.us - 0.3 - k * 0.055))).addScaledVector(left, 0.17 * w * sin(2.3 * t - k * 0.42));
      if (hang > 0) { const r = (k < 18 ? R.seg(TAIL[k], TAIL[k + 1]) : R.seg(TAIL[17], TAIL[18])).applyQuaternion(Qr); r.addScaledVector(left, 0.2 * w * sin(1.25 * t - k * 0.42)).addScaledVector(q.f, (0.1 + 0.5 * q.Ah) * w * sin(TAU * (q.us - 0.2) - k * 0.33) - 0.9 * w * q.rr * kick(q.s - L.roar)); d.lerp(r.normalize(), hang); }
      D.push(d.normalize()); }
    return D; };
  const pose = (g, bd, q, T, t) => { bd.begin().place(q.P, q.f, q.u, SC); bd.q0 = g.root.quaternion.clone(); bd.flap(q.st).neck(q.np, q.nr, q.ny).legs(q.lg).tail(tailDirs(q, T, bd, t).map(v => bd.local(v)));
    g.add({ Jaw: [0, -q.jaw, 0] }, 1); g.eye(0, q.rr > 0.4 ? 0.75 : (t % 3.7 < 0.1 ? 0.5 : 0)); };
  /* Vingespissene på tiden s uten å stille figuren (til glitteret og strekene): kroppen pluss vingens vinkel i slaget. */
  const tipAt = (s, sd) => { const q = pva(s), sp = hyp(q.v[0], q.v[1], q.v[2]) || 1, fx = q.v[0] / sp, fz = q.v[2] / sp, an = AMP(s) * (1.3 * cos(TAU * (X.bird.warp(PH(s), 0.56) - 0.19))), r = 5.9;
    return [q.p[0] + sd * fz * r * cos(an), q.p[1] + r * sin(an) - 0.3, q.p[2] - sd * fx * r * cos(an)]; };

  /* ---------- GLSL: himmelen (delt av kuppelen og speilingen i vann og is), fjellryggen og bregnefrosten ---------- */
  const SKY = `uniform vec3 uSun; uniform vec4 uSkyK;
vec3 skyC(vec3 d){ float e = max(d.y, 0.), sw = smoothstep(-.55, .95, dot(normalize(d.xz + 1e-5), normalize(uSun.xz)));
  vec3 a = mix(vec3(1., .77, .64), vec3(.91, .54, .63), smoothstep(0., .13, e)); a = mix(a, vec3(.6, .36, .6), smoothstep(.09, .3, e)); a = mix(a, vec3(.227, .184, .455), smoothstep(.24, .58, e)); a = mix(a, vec3(.059, .063, .21), smoothstep(.5, 1., e));
  vec3 b = mix(vec3(.32, .32, .54), vec3(.86, .55, .68), smoothstep(.03, .2, e)); b = mix(b, vec3(.52, .37, .64), smoothstep(.2, .38, e)); b = mix(b, vec3(.2, .17, .43), smoothstep(.32, .62, e)); b = mix(b, vec3(.05, .055, .19), smoothstep(.55, 1., e));
  vec3 c = mix(b, a, sw); float sd = max(dot(normalize(d), normalize(uSun)), 0.); return min(c + vec3(1., .72, .55) * (pow(sd, 6.) * .1 + pow(sd, 70.) * .1), vec3(.96, .8, .74)); }
float ridgeH(float a){ return 52. + 96. * abs(sin(a * 2. + .3)) * (.55 + .45 * sin(a * 5. + 1.7)) + 36. * abs(sin(a * 7. + 2.1)) + 14. * abs(sin(a * 17. + .7)); }
`;
  const ridge = a => 52 + 96 * abs(sin(a * 2 + 0.3)) * (0.55 + 0.45 * sin(a * 5 + 1.7)) + 36 * abs(sin(a * 7 + 2.1)) + 14 * abs(sin(a * 17 + 0.7));
  const DOME_V = `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.); gl_Position = p.xyww; }`;
  const DOME_F = `varying vec3 vD;
${K.GLSL.COMMON}
${SKY}
void main(){ vec3 d = normalize(vD); vec3 c = skyC(d); float e = d.y, ca = dot(normalize(d.xz + 1e-5), normalize(uSun.xz));
  /* Lange skyer lavt på himmelen, lyst nedenfra der sola gikk ned. */
  vec2 p = d.xz / (abs(e) + .2); float n = fbm(p * vec2(1.1, 3.4) + vec2(uTime * .003, 0.)) + .28 * fbm(p * vec2(2.7, 7.) + 9.);
  float cl = smoothstep(.56, .82, n) * smoothstep(.0, .05, e) * (1. - smoothstep(.22, .5, e));
  c = mix(c, mix(vec3(.3, .23, .47), vec3(.96, .58, .56), smoothstep(-.3, 1., ca) * (1. - smoothstep(.0, .26, e))), cl * .7);
  /* De første stjernene, og lyssøylen over sola (iskrystaller i lufta). */
  vec3 q = d * 150., iq = floor(q); float h = fract(sin(dot(iq, vec3(12.9898, 78.233, 37.719))) * 43758.5453), st = step(.994, h) * (1. - smoothstep(.0, .42, length(fract(q) - .5)));
  c += vec3(.9, .92, 1.) * st * smoothstep(.16, .5, e) * (1. - cl) * (.55 + .45 * sin(uTime * (1. + h * 40.) + h * 90.)) * uSkyK.y;
  float sa = d.x * uSun.z - d.z * uSun.x; c += vec3(.5, .34, .26) * exp(-sa * sa * 5200.) * step(0., ca) * smoothstep(-.005, .03, e) * (1. - smoothstep(.03, .26, e)) * uSkyK.x;
  gl_FragColor = vec4(min(c, vec3(1., .88, .84)), 1.); }`;

  /* Innsjøen: åpent, svart vann som speiler himmelen, skogen og fjellene, og is der den har frosset. Frysingen er en avstand til fronten (frz):
     · sporet etter Articuno (uTrk: punkter på banen med tiden den passerte): tre tynne linjer under vingespissene og halen som vokser sammen til en hvit kile
     · ringen på aksenten (uFR), isen langs land fra start, og uAll = alt er frosset (arenaen)
     Fronten har fingre etter bregnefrosten (tFern: skarpe bregner i r, et mykt felt i g), og bregnene vokser fram i den nye isen og blir liggende som rim.
     uBA/uBK = Ice Beam-sporet (fra–til, hvor langt, styrke, hvor ferskt), uMark = snøkrystallen under plassen. */
  const NT = 10;
  const LAKE_F = `varying vec3 vW; uniform sampler2D tFern; uniform vec4 uTrk[${NT}]; uniform vec4 uFR, uBA, uMark, uStar, uRing[4]; uniform vec3 uBK, uDeep, uShal, uFoamC; uniform vec2 uBeat; uniform float uAll, uRL, uBri, uMir;
${K.GLSL.COMMON}
${SKY}
vec3 refl(vec2 w, vec3 R){ vec3 c = skyC(R); vec2 rh = R.xz; float a = dot(rh, rh) + 1e-6, b = dot(w, rh), cc = dot(w, w);
  float k = (-b + sqrt(max(b * b - a * (cc - 739600.), 0.))) / a; vec2 p = w + rh * k; float mh = ridgeH(atan(p.y, p.x)) * .9;
  c = mix(c, mix(vec3(.34, .31, .6), uFogC, .5), smoothstep(mh + 5., mh - 5., k * R.y));
  float rt = uRL + 16.; k = (-b + sqrt(max(b * b - a * (cc - rt * rt), 0.))) / a; p = w + rh * k; float an = atan(p.y, p.x), th = 14. + 9. * vn(vec2(an * 46., 3.)) + 6. * vn(vec2(an * 150., 7.));
  float fk = clamp((k - uFog.x) / (uFog.y - uFog.x), 0., 1.) * uFog.z, lt = smoothstep(.1, -.8, dot(normalize(rh + 1e-5), normalize(uSun.xz))) * (.35 + .65 * vn(vec2(an * 90., k * R.y * .5)));
  return mix(c, mix(mix(vec3(.05, .06, .14), vec3(.5, .45, .68), lt * .8), uFogC, fk), smoothstep(th + 1.5, th - 1.5, k * R.y)); }
float frz(vec2 w, out float ag){ float d = -1e3; ag = 0.;
  for (int i = 0; i < ${NT - 1}; i++) { vec4 A = uTrk[i], B = uTrk[i + 1]; vec2 ab = B.xy - A.xy, aw = w - A.xy; float h = clamp(dot(aw, ab) / dot(ab, ab), 0., 1.), a = uTime - mix(A.z, B.z, h); if (a <= 0.) continue;
    vec2 pq = aw - ab * h; float dl = length(pq), lat = abs(dot(pq, normalize(vec2(-ab.y, ab.x)))), pen = (dl - lat) * 2.;
    /* Hodet på sporet er tre streker: halen (hel), og vingespissene der de stryker vannet i bunnen av hvert nedslag (uBeat: slagets fase i filmens tid). De vokser sammen til kilen. */
    float tch = exp(-pow((fract((mix(A.z, B.z, h) - uBeat.x) * uBeat.y + .56) - .56) / .19, 2.));
    float q = max(max((.45 + a * 5.) - lat, (-1.4 + 2.2 * tch + a * 6.) - abs(lat - 5.4)) - pen, min(36., a * 13. - 3.5) - dl); if (q > d) { d = q; ag = q / 12.; } }
  if (uFR.w > 0.) { float q = uFR.z - length(w - uFR.xy); if (q > d) { d = q; ag = q / 55.; } }
  float sh = length(w) - (uRL - 10.); if (sh > d) { d = sh; ag = 9.; }
  if (uAll > .5) { d = 99.; ag = 9.; }
  return d; }
void main(){ vec2 w = vW.xz; float t = uTime, fw = max(length(dFdx(w)), length(dFdy(w))), lod = 1. - smoothstep(.2, 1.2, fw), ag;
  vec4 fn = texture2D(tFern, w / 30.); float fd = frz(w, ag); fd += ((fbm(w * .11) - .5) * 7. * clamp(.1 + ag * .6, 0., 1.) + (fn.g - .06) * 4.5) * (1. - uAll);
  vec3 V = normalize(cameraPosition - vW), col; float rl = length(w);
  if (fd < 0.) {
    vec3 N = normalize(vec3((vn(w * 1.1 + vec2(t * .5, t * .2)) - .5) * .07 + (vn(w * 3.7 - t * .6) - .5) * .035 * lod, 1., (vn(w * 1.1 + 5. - vec2(t * .3, t * .45)) - .5) * .07 + (vn(w * 3.7 + 9. + t * .5) - .5) * .035 * lod));
    float fr = pow(1. - max(dot(N, V), 0.), 4.) * .92 + .05; vec3 R = reflect(-V, N); R.y = abs(R.y) + .002;
    col = mix(vec3(.02, .036, .072), refl(w, R), fr);
    col = mix(col, uFoamC * .9, max((1. - smoothstep(0., 1.1, -fd)) * .45, fn.r * (1. - smoothstep(.5, 6., -fd)) * .9) * (1. - smoothstep(.6, 2.6, fw)));
  } else {
    vec3 N = normalize(vec3((fbm(w * .5) - .5) * .12, 1., (fbm(w * .5 + 7.) - .5) * .12));
    float fr = pow(1. - max(dot(N, V), 0.), 3.) * .8 + .1; vec3 R = reflect(-V, N); R.y = abs(R.y) + .002;
    float depth = fbm(w * .07 + 3.), vein = abs(fbm(w * .11 + 11.) - .5);
    col = mix(mix(uDeep, uShal, smoothstep(.3, .75, depth)), refl(w, R), fr * uMir);
    col += uShal * (1. - smoothstep(.0, .03, vein)) * .2 * lod;
    vec3 c1 = voro(w * .16 + (vec2(vn(w * .05), vn(w * .05 + 4.)) - .5) * 1.2), c2 = voro(w * .55 + 3.7);
    float k1 = (1. - smoothstep(.0, .02 + fw * .3, c1.y - c1.x)) * (1. - smoothstep(.3, 1.2, fw)), k2 = (1. - smoothstep(.0, .03 + fw * .9, c2.y - c2.x)) * lod * .5;
    col += uFoamC * max(k1, k2) * .13;
    float rime = smoothstep(.56, .84, fbm(w * .2 + 3.)) * .3; col = mix(col, mix(uShal, uFoamC, .6) * (.86 + .14 * fbm(w * 2.4)), rime * .5);
    /* Bregnefrosten: vokser fram i den nye isen (fra stammene og utover), hvit mens isen er fersk, og blir liggende som svakt rim. */
    float fresh = 1. - smoothstep(0., 2.6, ag), grow = smoothstep(0., 1., ag * 2.4 - (1. - fn.g) * .9), far = 1. - smoothstep(.5, 2.4, fw);
    col = mix(col, uFoamC * .98, fn.r * grow * (.2 + .7 * fresh) * far);
    col = mix(col, uFoamC * .98, fresh * (1. - smoothstep(0., 12., fd)) * (.3 + .6 * smoothstep(.05, .5, fn.g)));
    float gl = step(.985, h21(floor(w * 9.) + floor(t * 3.) * .37)) * (rime + fresh * .8 + fn.r * .5) * lod; col += vec3(1.) * gl * .6;
  }
  /* Ice Beam-sporet: en hvit stripe av bregnefrost der strålen har gått, og et blått lys i det ferskeste. */
  if (uBK.y > 0.) { vec2 a = uBA.xy, b = mix(uBA.xy, uBA.zw, uBK.x), ab = b - a; float h = clamp(dot(w - a, ab) / max(dot(ab, ab), 1e-4), 0., 1.), bd = length(w - a - ab * h) + (fbm(w * .45) - .5) * 1.6 - fn.g * 1.8;
    float bd0 = length(w - a - ab * h); col = mix(col, uFoamC * .96, max((1. - smoothstep(.15, 1.5, bd)) * .6, fn.r * (1. - smoothstep(1.2, 6.5, bd0)) * .5) * uBK.y); col += vec3(.35, .7, 1.) * exp(-bd0 * bd0 * .9) * uBK.z * (1. - smoothstep(0., 9., length(w - b))) * .6; }
  /* Snøkrystallen under plassen: seks armer med grener, som vokser ut fra midten. */
  if (uMark.w > 0.) { vec2 dv = w - uMark.xy; float Lm = length(dv), an = atan(dv.y, dv.x), sa = abs(fract(an * .95493 + .5) - .5) * 1.0472, u = Lm * cos(sa), la = Lm * sin(sa);
    float arm = (1. - smoothstep(.1, .34, la)), br = (1. - smoothstep(.06, .22, abs(la - fract(u * .55) * 1.25))) * step(la, u * .34) * step(1.2, u);
    float in1 = 1. - smoothstep(uMark.z * .92, uMark.z, Lm); col = mix(col, uFoamC * .97, max(arm, br * .8) * in1 * uMark.w * .8 * (1. - smoothstep(1., 3., fw)));
    col = mix(col, uFoamC * .97, (1. - smoothstep(.0, 1.3, Lm)) * uMark.w * .8); }
  if (uStar.w > 0.) { vec2 dv = w - uStar.xy; float Ls = length(dv), an = atan(dv.y, dv.x), ray = pow(abs(sin(an * 3.5 + vn(vec2(Ls * .6, an * 2.)) * 2.5)), 40.); col += uFoamC * ray * (1. - smoothstep(uStar.z * .9, uStar.z, Ls)) * uStar.w * lod; }
  float rg = 0.; for (int i = 0; i < 4; i++) { vec4 g = uRing[i]; if (g.w > 0.) rg = max(rg, g.w * (1. - smoothstep(0., .5 + g.z * .05, abs(length(w - g.xy) - g.z)))); } col += uFoamC * rg * .4;
  col = mix(col, uFoamC * (.8 + .14 * fbm(w * .2)), smoothstep(uRL - 5., uRL + 1., rl + (fbm(w * .2 + 2.) - .5) * 5.));
  gl_FragColor = vec4(mix(col * uBri, uFogC, fogK(vW)), 1.); }`;
  const TERR_F = `varying vec3 vW, vN; uniform vec3 uSun;
${K.GLSL.COMMON}
void main(){ vec3 N = normalize(vN); float tn = smoothstep(-.12, .5, dot(N, normalize(uSun + vec3(0., .42, 0.))));
  vec3 c = mix(vec3(.4, .4, .7), vec3(.88, .8, .93), tn) * (.93 + .12 * fbm(vW.xz * .08));
  c += vec3(1.) * step(.992, h21(floor(vW.xz * 6.) + floor(uTime * 2.5) * .31)) * .16 * tn * (1. - smoothstep(60., 160., length(cameraPosition - vW)));
  gl_FragColor = vec4(mix(c, uFogC, fogK(vW)), 1.); }`;
  const TREE_V = `attribute float aT; varying vec3 vW; varying float vH, vT; void main(){ vH = position.y; vT = aT; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  /* Granene: snøen ligger øverst på hver krans (vT: 1 i toppen av kransen, 0 ytterst på grenene, under 0 = undersiden), med mørke grenspisser og mørk underside.
     Fargene er arenaens: mørk blåfiolett bar og lavendel snø, litt varmere der det siste lyset treffer. */
  const TREE_F = `varying vec3 vW; varying float vH, vT; uniform vec3 uSun;
${K.GLSL.COMMON}
void main(){ vec3 N = normalize(cross(dFdx(vW), dFdy(vW))); float tn = smoothstep(-.3, .6, dot(N, normalize(uSun + vec3(0., .5, 0.))));
  float sn = smoothstep(.2, .34, vT + (vn(vW.xz * .9 + vW.y * .7) - .5) * .3) * step(0., vT);
  vec3 dark = mix(vec3(.05, .06, .15), vec3(.1, .11, .26), vH) * mix(vec3(.9, .9, 1.25), vec3(1.5, 1.2, 1.35), tn), c = mix(dark, mix(vec3(.46, .46, .77), vec3(.86, .76, .9), tn) * mix(1., .72, smoothstep(.62, 1., vT)), sn);
  gl_FragColor = vec4(mix(c, uFogC, fogK(vW)), 1.); }`;
  const MNT_F = `varying vec3 vW; varying vec2 vUv; uniform vec3 uSun; uniform float uHz;
${K.GLSL.COMMON}
void main(){ vec3 N = normalize(cross(dFdx(vW), dFdy(vW))); float tn = smoothstep(-.1, .45, dot(N, normalize(uSun + vec3(0., .35, 0.))));
  float sn = smoothstep(.22, .6, vUv.y + (fbm(vW.xz * .012 + vW.y * .02) - .5) * .5);
  vec3 c = mix(mix(vec3(.2, .18, .4), vec3(.48, .35, .54), tn), mix(vec3(.5, .47, .78), vec3(.94, .78, .84), tn), sn);
  gl_FragColor = vec4(mix(c, uFogC, clamp(uHz * (1. - vUv.y * .5), 0., 1.)), 1.); }`;
  /* Speilbildet av Articuno i vannet og isen: en kopi av figuren speilet om flaten, myk og i omgivelsenes oppløsning (ikke piksler: det er vann). */
  const REFL_V = `#include <common>
#include <skinning_pars_vertex>
varying vec3 vW; varying vec2 vUv; uniform float uTime, uWob;
void main(){ vUv = uv;
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 w = modelMatrix * vec4(transformed, 1.); w.x += sin(w.y * 1.9 + uTime * 2.3 + w.z * .6) * uWob * min(-w.y, 6.) * .05; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const REFL_F = `varying vec3 vW; varying vec2 vUv; uniform sampler2D map; uniform vec3 uTint; uniform float uA, uRL;
void main(){ if (vW.y > -.02 || length(vW.xz) > uRL - 3.) discard; float a = uA * (1. - smoothstep(5., 30., -vW.y)); gl_FragColor = vec4(texture2D(map, vUv).rgb * uTint * a, a); }`;
  /* Strålen: tre sylindre lagt oppå som lys (kjerne, glød, dis), fra nebbet til isen. Svakere tett på kameraet, så den ikke blir en hvit flate. */
  const BEAM_V = `varying vec3 vW, vN; varying float vY; void main(){ vY = position.y; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const BEAM_F = `varying vec3 vW, vN; varying float vY; uniform vec3 uC; uniform float uA, uL, uP, uE, uTime;
void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float k = pow(abs(dot(N, V)), uE);
  float pu = .7 + .3 * sin(vY * uL * 1.3 - uTime * 44.), ends = smoothstep(0., .015, vY) * (1. - smoothstep(.985, 1., vY)), nr = .1 + .9 * smoothstep(6., 30., length(vW - cameraPosition));
  gl_FragColor = vec4(uC * k * uA * mix(1., pu, uP) * ends * nr, 0.); }`;

  /* ---------- Bregnefrosten som bilde (lages én gang): skarpe bregner i rødt, et mykt felt rundt dem i grønt. Går i ett med seg selv i kantene. ---------- */
  const fernTo = (x, x0, y0, an, Ln, w, d, sd, al) => { if (Ln < 4 || d > 2) return; const x1 = x0 + cos(an) * Ln, y1 = y0 + sin(an) * Ln; x.strokeStyle = `rgba(255,255,255,${al * (0.5 + 0.25 * (2 - d))})`; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0);
    x.quadraticCurveTo(mix(x0, x1, 0.5) + sin(an) * Ln * 0.06, mix(y0, y1, 0.5) - cos(an) * Ln * 0.06, x1, y1); x.stroke();
    const n = floor(Ln / (5 + d * 3)); for (let i = 1; i < n; i++) { const u = i / n, bl = Ln * 0.38 * (1 - u * 0.75) * (0.65 + 0.6 * rnd(i, sd + d * 7)); fernTo(x, mix(x0, x1, u), mix(y0, y1, u), an + 0.95, bl, w * 0.62, d + 1, sd + i, al); fernTo(x, mix(x0, x1, u), mix(y0, y1, u), an - 0.95, bl, w * 0.62, d + 1, sd + i + 50, al); } };
  let fernCv = null;
  const fernTex = T => { if (!fernCv) { const N = 512, a = document.createElement('canvas'); a.width = a.height = N * 2; const xa = a.getContext('2d'); xa.lineCap = 'round';
      for (let i = 0; i < 34; i++) fernTo(xa, N / 2 + rnd(i, 1) * N, N / 2 + rnd(i, 2) * N, rnd(i, 3) * TAU, 60 + rnd(i, 4) * 110, 2.2, 0, i * 13, 1);
      const b = document.createElement('canvas'); b.width = b.height = N; const xb = b.getContext('2d'); xb.fillStyle = '#000'; xb.fillRect(0, 0, N, N); xb.globalCompositeOperation = 'lighter'; for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) xb.drawImage(a, -N / 2 + dx, -N / 2 + dy);
      const s = document.createElement('canvas'); s.width = s.height = 192; const xs = s.getContext('2d'); xs.imageSmoothingEnabled = true; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) xs.drawImage(b, i * 64, j * 64, 64, 64);
      const c = document.createElement('canvas'); c.width = c.height = N; const xc = c.getContext('2d'); xc.imageSmoothingEnabled = true; xc.drawImage(s, 64, 64, 64, 64, 0, 0, N, N);   /* det myke feltet: bildet krympet (ni fliser, så kantene møtes) og blåst opp igjen */
      const A = xb.getImageData(0, 0, N, N), Bm = xc.getImageData(0, 0, N, N), d = A.data, e = Bm.data; for (let i = 0; i < d.length; i += 4) { d[i + 1] = min(255, e[i] * 2.6); d[i + 2] = 0; d[i + 3] = 255; } xb.putImageData(A, 0, 0); fernCv = b; }
    const tx = new T.CanvasTexture(fernCv); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.colorSpace = T.NoColorSpace; tx.minFilter = T.LinearMipmapLinearFilter; tx.generateMipmaps = true; tx.needsUpdate = true; return tx; };

  /* ---------- Stedet: innsjøen, snølandet rundt, granskogen, fjellene og himmelen. Bygges likt for filmen og arenaen. ---------- */
  const terrH = (x, z) => { const r = hyp(x, z), a = Math.atan2(z, x), e = max(0, r - RL); return io(c01(e / 70)) * (5 + 3.5 * sin(a * 3 + 1) + 2.5 * sin(a * 5.3 + 2)) + Math.pow(max(0, e - 30) / 420, 1.35) * (26 + 12 * sin(a * 2.2 + 0.5) + 8 * sin(a * 4.7 + 3)) + (sin(x * 0.045 + 1.3) * sin(z * 0.052 + 0.4) + 0.5 * sin(x * 0.11 + z * 0.07)) * 1.6 * c01(e / 25); };
  const cloneSk = src => { const sl = new Map(), cl = new Map(), c = src.clone(true);   /* en kopi av modellen med sitt eget skjelett (til speilbildet) */
    const walk = (a, b) => { sl.set(b, a); cl.set(a, b); for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]); }; walk(src, c);
    c.traverse(n => { if (!n.isSkinnedMesh) return; const s0 = sl.get(n); n.skeleton = s0.skeleton.clone(); n.bindMatrix.copy(s0.bindMatrix); n.skeleton.bones = s0.skeleton.bones.map(b => cl.get(b)); n.bind(n.skeleton, n.bindMatrix); });
    return c; };
  const place = (K, T, S, o) => { o = o || {}; const us = S.us = { uSun: K.uv(new T.Vector3(SUN[0], SUN[1], SUN[2]).normalize()), uSkyK: K.uv(new T.Vector4(0.35, 1, 0, 0)) }, add = m => { m.frustumCulled = false; S.scene.add(m); return m; };
    /* Himmelen: en kuppel som alltid står rundt kameraet, bak alt annet. */
    S.dome = add(new T.Mesh(new T.SphereGeometry(1, 40, 20), K.shader(DOME_V, DOME_F, Object.assign({}, us), { side: T.BackSide, depthWrite: false }))); S.dome.renderOrder = -10;
    /* Innsjøen. Den skriver ikke dybde: bare speilbildet ligger under flaten. */
    S.lake = add(new T.Mesh(new T.CircleGeometry(RL + 2, 96).rotateX(-PI / 2), K.shader(null, LAKE_F, Object.assign({}, us, { tFern: K.uv(fernTex(T)), uTrk: K.uv(Array.from({ length: NT }, () => new T.Vector4(0, 0, 1e9, 0))), uFR: K.uv(new T.Vector4()),
      uBA: K.uv(new T.Vector4(BA[0], BA[1], BB[0], BB[1])), uBK: K.uv(new T.Vector3()), uMark: K.uv(new T.Vector4(BA[0], BA[1], 0, 0)), uStar: K.uv(new T.Vector4()), uRing: K.uv([0, 1, 2, 3].map(() => new T.Vector4())),
      uDeep: K.uv(K.u3('#23286a')), uShal: K.uv(K.u3('#5f74c8')), uFoamC: K.uv(K.u3('#eef0ff')), uAll: K.uv(o.all ? 1 : 0), uRL: K.uv(RL), uBri: K.uv(1), uMir: K.uv(0.85), uBeat: K.uv(new T.Vector2(CO + B0 + 0.05, 1 / HP)) }), { depthWrite: false }))); S.lake.renderOrder = -5;
    /* Snølandet: en ring fra bredden og opp i åsene, med samme høyde som trærne står på. */
    { const RR = [0, 3, 8, 16, 28, 44, 64, 90, 120, 160, 210, 270, 340, 420, 520, 640].map(e => RL + e), N = 144, pos = [], idx = [];
      for (let j = 0; j < RR.length; j++) for (let i = 0; i <= N; i++) { const a = (i % N) / N * TAU, x = cos(a) * RR[j], z = sin(a) * RR[j]; pos.push(x, terrH(x, z) + 0.03, z); }
      for (let j = 0; j < RR.length - 1; j++) for (let i = 0; i < N; i++) { const p = j * (N + 1) + i, q = p + N + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); add(new T.Mesh(g, K.shader(null, TERR_F, Object.assign({}, us), { side: T.DoubleSide }))); }
    /* Granskogen: ett tre (fem kranser med ujevn kant) tegnet mange ganger. Tettest ved bredden, og en høy klynge i sør der den kommer over toppene på 0:00. */
    { const pos = [], at = [], tier = (r, h, y0, n, sd) => { for (let i = 0; i < n; i++) { const j = (i + 1) % n, a0 = i / n * TAU, a1 = (i + 1) / n * TAU, r0 = r * (i % 2 ? 0.7 : 1) * (0.88 + 0.24 * rnd(i, sd)), r1 = r * (j % 2 ? 0.7 : 1) * (0.88 + 0.24 * rnd(j, sd)), d0 = y0 - (i % 2 ? 0 : 0.035), d1 = y0 - (j % 2 ? 0 : 0.035);
          pos.push(0, y0 + h, 0, cos(a0) * r0, d0, sin(a0) * r0, cos(a1) * r1, d1, sin(a1) * r1, 0, y0 + h * 0.2, 0, cos(a1) * r1, d1, sin(a1) * r1, cos(a0) * r0, d0, sin(a0) * r0); at.push(1, 0, 0, -1, -1, -1); } };
      [[0.3, 0.34, 0.1], [0.25, 0.3, 0.29], [0.195, 0.27, 0.47], [0.14, 0.24, 0.64], [0.085, 0.2, 0.8]].forEach(([r, h, y], k) => tier(r, h, y, 10, 40 + k)); tier(0.035, 0.14, 0, 5, 50);
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('aT', new T.Float32BufferAttribute(at, 1)); const tr = [];
      for (let i = 0; i < 1250; i++) { const a = rnd(i, 51) * TAU, r = RL + 7 + Math.pow(rnd(i, 52), 1.45) * 330; tr.push([cos(a) * r, sin(a) * r, 10 + rnd(i, 53) * 11 - min(4, (r - RL) * 0.01)]); }
      for (let i = 0; i < 46; i++) tr.push([(rnd(i, 61) - 0.5) * 60, 150 + rnd(i, 62) * 44, 23 + rnd(i, 63) * 8]);
      const m = add(new T.InstancedMesh(geo, K.shader(TREE_V, TREE_F, Object.assign({}, us), { side: T.DoubleSide }), tr.length)), ob = new T.Object3D();
      tr.forEach(([x, z, h], i) => { ob.position.set(x, terrH(x, z) - 0.4, z); ob.scale.set(h * (0.9 + 0.3 * rnd(i, 72)), h, h * (0.9 + 0.3 * rnd(i, 73))); ob.rotation.y = rnd(i, 71) * 6; ob.updateMatrix(); m.setMatrixAt(i, ob.matrix); }); }
    /* Fjellene: to ringer med store flater, langt borte i disen. */
    for (const [r0, hk, off, hz] of [[860, 0.92, 0, 0.5], [1500, 1.9, 1.1, 0.74]]) { const N = 200, M = 4, pos = [], uvs = [], idx = [];
      for (let i = 0; i <= N; i++) { const a = (i % N) / N * TAU, hh = ridge(a + off) * hk * (0.9 + 0.2 * rnd(i % N, 80 + r0)); for (let j = 0; j <= M; j++) { const v = j / M, rr = r0 - (1 - v) * r0 * 0.24 + (rnd((i % N) * 7 + j, 81) - 0.5) * 26 * (j > 0 && j < M ? 1 : 0); pos.push(cos(a) * rr, -12 + Math.pow(v, 1.15) * hh, sin(a) * rr); uvs.push(i / N, v); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j, q = p + M + 1; idx.push(p, p + 1, q, q, p + 1, q + 1); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
      add(new T.Mesh(g, K.shader(null, MNT_F, Object.assign({}, us, { uHz: K.uv(hz) }), { side: T.DoubleSide }))); }
    /* Snøfall, og diamantstøv (iskrystaller som glitrer i lufta). */
    S.snow = add(K.pts(700, i => ({ p: [(rnd(i, 41) - 0.5) * 320, rnd(i, 42) * 60, (rnd(i, 43) - 0.5) * 320], v: [-0.4, -0.9 - rnd(i, 44) * 0.5, 0.15], b: rnd(i, 45) * 60, l: 60, z: 0.7 + rnd(i, 46) * 0.8 }),
      { loop: 1, px: 30, sway: 0.5, c: ['#ffffff', '#eef2ff', '#dfe6ff'], fade: 0.95, a: 0.7 }));
    S.dust = add(K.pts(800, i => { const a = rnd(i, 11) * TAU, r = Math.sqrt(rnd(i, 12)) * 150; return { p: [cos(a) * r, 0.5 + rnd(i, 13) * 24, sin(a) * r], v: [0.1, -0.12 - rnd(i, 14) * 0.1, 0.05], b: rnd(i, 15) * 20, l: 20, z: 0.5 + rnd(i, 16) * 0.8 }; },
      { loop: 1, add: 1, px: 34, sway: 0.3, c: ['#ffffff', '#dff0ff', '#ffe0f0'], fade: 0.85, a: 0 }));
    return S; };
  /* Stedets lys for dette bildet. back = kameraet ser mot sola (da lyses forsiden av himmelen, og sola gir kantlys). */
  const light = (S, T, back, k) => { const U = K.U(); U.uRim.value.set(SUN[0], 0.3, SUN[2]).normalize();
    if (back) { U.uKey.value.set(0.25, 0.72, 0.64).normalize(); U.uKeyC.value.setRGB(0.92, 0.88, 1.04); U.uShC.value.setRGB(0.36, 0.35, 0.6); }
    else { U.uKey.value.set(SUN[0] * 0.8, 0.5, SUN[2] * 0.8).normalize(); U.uKeyC.value.setRGB(1.06, 0.9, 0.93); U.uShC.value.setRGB(0.33, 0.33, 0.58); }
    U.uRimK.value = 0.95; U.uGlow.value = 0.34 * (k == null ? 1 : k); U.uFog.value.set(140, 1100, 0.82); U.uFogC.value.setRGB(0.6, 0.47, 0.68); };

  /* ---------- Frosten på linsa (2D, grepet fra steg 2): fjærformede krystaller som raser inn fra hjørnene ---------- */
  let frostCv = null, splatCv = null;
  const frostMake = () => { const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'); x.lineCap = 'round';
    [[0, 0, 0.78], [W, 0, 2.36], [0, Hh, -0.78], [W, Hh, -2.36]].forEach(([cx, cy, a0], q) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, 210); gr.addColorStop(0, 'rgba(232,244,255,.26)'); gr.addColorStop(0.5, 'rgba(232,244,255,.08)'); gr.addColorStop(1, 'rgba(232,244,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
      for (let i = 0; i < 11; i++) fernTo(x, cx + (rnd(i, q * 9 + 1) - 0.5) * 60, cy + (rnd(i, q * 9 + 2) - 0.5) * 50, a0 + (rnd(i, q * 9 + 3) - 0.5) * 1.5, 50 + rnd(i, q * 9 + 4) * 120, 1.7, 0, q * 100 + i * 7, 0.62); });
    return c; };
  const lensFrost = (k, a) => { if (a <= 0.004 || k <= 0.004) return; if (!frostCv) frostCv = frostMake(); const g = C.g, R = k * 270; g.save(); g.globalAlpha = c01(a); g.beginPath();
    for (const [cx, cy] of [[0, 0], [W, 0], [0, Hh], [W, Hh]]) { g.moveTo(cx, cy); g.arc(cx, cy, R, 0, TAU); } g.clip(); g.drawImage(frostCv, 0, 0); g.restore(); };
  /* Rim som spruter mot linsa når strålen feier forbi kameraet (25,00): små stjerner nede til høyre, der strålen gikk. */
  const SPL = [[402, 292, 30], [455, 330, 40], [372, 352, 22], [488, 262, 26], [430, 372, 30], [344, 312, 16], [496, 360, 20]];
  const splatMake = () => { const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'); x.lineCap = 'round';
    SPL.forEach(([cx, cy, r], q) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3); gr.addColorStop(0, 'rgba(236,247,255,.35)'); gr.addColorStop(1, 'rgba(236,247,255,0)'); x.fillStyle = gr; x.fillRect(cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8);
      for (let i = 0; i < 6; i++) fernTo(x, cx, cy, i / 6 * TAU + rnd(q, 7), r * (0.7 + 0.4 * rnd(i, q + 3)), 1.3, 0, q * 50 + i * 5, 0.62); });
    return c; };
  const splatFx = s => { const a = s - BM.cam - 0.03; if (a < 0) return; if (!splatCv) splatCv = splatMake(); const g = C.g, k = eo(c01(a / 0.18)), al = 0.95 * (1 - 0.6 * c01((a - 0.3) / 1.2)) * (1 - seg(s, L.roar - 0.3, L.roar + 0.2));
    if (al <= 0.01) return; g.save(); g.globalAlpha = al; g.beginPath(); for (const [cx, cy, r] of SPL) { g.moveTo(cx, cy); g.arc(cx, cy, r * 1.25 * k, 0, TAU); } g.clip(); g.drawImage(splatCv, 0, 0); g.restore(); };
  /* Farten i 2D oppå bildet (bare der Jazz ba om det: mest ved siden av, mindre ovenfra): tynne fartsstreker rundt den, strekene etter vingespissene, og snø som
     suser forbi tett på linsa. Retningen er fartsretningen sett fra kameraet. Ingen ettersyn. */
  const speedFx = (S, s, t) => { const e = EF(s); if (e < 0.01 || !S.q) return; const g = C.g, p = S.q.P, v = pva(s).v, a = K.proj(p.x, p.y, p.z), b = K.proj(p.x + v[0] * 0.06, p.y + v[1] * 0.06, p.z + v[2] * 0.06); if (a.z >= 1) return;
    let dx = b.x - a.x, dy = b.y - a.y; const dl = hyp(dx, dy); if (dl < 0.5) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; } const nx = -dy, ny = dx, R = 70;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 30; i++) { const off = (rnd(i, 3) - 0.5) * 2 * (R * 0.5 + 170 * rnd(i, 4)), sp = 1300 + 1700 * rnd(i, 5), Lc = 1200, len = 40 + 150 * rnd(i, 6), al = ((rnd(i, 7) * Lc - sp * t) % Lc + Lc) % Lc - Lc * 0.75;
      if (al > -R * 0.3 || (abs(off) < R * 0.5 && al > -R * 1.4)) continue; const x0 = a.x + dx * al + nx * off, y0 = a.y + dy * al + ny * off, fa = c01(1.2 - abs(al) / (Lc * 0.75));
      g.strokeStyle = `rgba(226,242,255,${(0.1 + 0.22 * rnd(i, 8)) * e * fa})`; g.lineWidth = 0.6 + 0.9 * rnd(i, 9); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - dx * len, y0 - dy * len); g.stroke(); }
    for (const sd of ['L', 'R']) { const h1 = S.gr.at(sd + 'Hand1'), h2 = S.gr.at(sd + 'Hand2'), tp = h2.clone().add(h2.clone().sub(h1).multiplyScalar(1.1)), q0 = K.proj(tp.x, tp.y, tp.z), q1 = K.proj(tp.x - v[0] * 0.2, tp.y - v[1] * 0.2 + 0.15, tp.z - v[2] * 0.2); if (q0.z >= 1 || q1.z >= 1) continue;
      const gr = g.createLinearGradient(q0.x, q0.y, q1.x, q1.y); gr.addColorStop(0, `rgba(226,246,255,${0.6 * e})`); gr.addColorStop(1, 'rgba(160,214,255,0)'); g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(q0.x, q0.y); g.lineTo(q1.x, q1.y); g.stroke(); }
    for (let i = 0; i < 40; i++) { const q = rnd(i, 21), sp = (900 + 2800 * q) * e, Lc = 1400, al = ((rnd(i, 22) * Lc - sp * t) % Lc + Lc) % Lc - Lc / 2, off = (rnd(i, 23) - 0.5) * 820, x0 = 256 + dx * al + nx * off, y0 = 192 + dy * al + ny * off, ln = sp * 0.026 + 3;
      if (x0 < -60 || x0 > 572 || y0 < -60 || y0 > 444) continue; g.strokeStyle = `rgba(255,255,255,${(0.16 + 0.5 * q) * e})`; g.lineWidth = 0.7 + 2.2 * q * q; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + dx * ln, y0 + dy * ln); g.stroke(); }
    g.restore(); };

  /* Kameraet (med lang sikt: fjellene står 1500 m unna), og kampens kamera slik X.arena stiller det inn (siktet dreies til plassen treffer (377, 198)). */
  const cam = (px, py, pz, tx, ty, tz, fov, roll) => { K.far(3200); K.cam(px, py, pz, tx, ty, tz, fov, roll); };
  let endTg = null;
  const camEnd = () => { if (!endTg) { const tg = CAMB.tg.slice(), cp = CAMB.cp; for (let i = 0; i < 14; i++) { K.cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv); const q = K.proj(H[0], 0, H[2]); tg[0] -= (370 - q.x) * 0.1; tg[1] += (198 - q.y) * 0.1; } endTg = tg; } return endTg; };   /* 370, ikke 377: vingespissene skal være innenfor en smal skjerm (x under 448) */

  G3D.def('c3:144', {
    len: LEN, hold: 1, R: F(L.roar), at: -CO, mus: { bed: 'sfx/natur/articuno_intro.mp3' },   /* lydsengen følger filmens klokke (work/raids3d/articuno/lyd/bed.py) */ fig: 2, models: ['articuno'], edge: null, env: { rim: '#ffd0e6', glow: '#a8d0ff', fog: '#9978ad', glowH: 9, ink: '#141a3a' },
    make(K, T) { const S = { scene: new T.Scene(), figs: [], T }; place(K, T, S);
      const gl = K.model('articuno'), src2 = cloneSk(gl.scene);   /* kopien til speilbildet, før figuren tar over modellen */
      const g = S.gr = K.figure(gl); g.root.scale.setScalar(SC); S.scene.add(g.root); S.figs.push(g); S.bd = X.bird(g, BIRD);
      /* Speilbildet: samme skuespill, speilet om flaten (en gruppe med y = −1), i omgivelsenes lag. */
      { const f = S.rf = K.figure({ scene: src2, model: 'articuno' }), un = { uTint: K.uv(new T.Vector3(0.62, 0.62, 0.8)), uA: K.uv(0.8), uRL: K.uv(RL), uWob: K.uv(1) }; S.rfU = un;
        f.root.traverse(q => { if (!q.isMesh) return; const mp = q.material.uniforms && q.material.uniforms.map ? q.material.uniforms.map.value : null; q.material = K.shader(REFL_V, REFL_F, Object.assign({ map: K.uv(mp) }, un), Object.assign(K.blend.soft(), { depthWrite: true, side: T.DoubleSide })); q.layers.set(0); q.renderOrder = -3; q.frustumCulled = false; });
        f.root.scale.setScalar(SC); S.mir = new T.Group(); S.mir.scale.y = -1; S.mir.add(f.root); S.scene.add(S.mir); S.figs.push(f); S.rbd = X.bird(f, BIRD); }
      /* Sporet der vannet fryser: banen fra den retter seg opp lavt over vannet til aksenten. */
      { const tk = [3.9, 4.5, 5.2, 6.2, 7.4, 8.6, 9.8, 11.1, 12.5, L.acc]; S.lake.material.uniforms.uTrk.value.forEach((v, i) => { const p = path(tk[i]); v.set(p[0], p[2], F(tk[i]) + 0.05, 0); }); }
      /* Strålen (kjerne, glød, dis), og lyset i nebbet og der den treffer isen. */
      S.beam = [[0.12, '#ffffff', 1.2, 3, 0.25], [0.4, '#86ccff', 0.55, 1.6, 0.6], [0.9, '#4a8ee0', 0.2, 1, 0.3]].map(([r, c, a, e, p]) => { const geo = new T.CylinderGeometry(1, 1, 1, 18, 1, true); geo.translate(0, 0.5, 0);
        const m = new T.Mesh(geo, K.shader(BEAM_V, BEAM_F, { uC: K.uv(K.u3(c)), uA: K.uv(a), uL: K.uv(30), uP: K.uv(p), uE: K.uv(e) }, Object.assign(K.blend.add(), { side: T.DoubleSide })));
        m.userData.r = r; m.userData.a0 = a; m.frustumCulled = false; m.visible = false; S.scene.add(m); return m; });
      const glo = (c, nr) => { const m = K.pts(3, i => ({ p: [0, 0, 0], v: [0, 0, 0], b: 0, l: 1e9, z: [3.4, 1.7, 0.75][i] }), { add: 1, px: 120, c: [c, c, c], fade: 0.99, a: 0, near: nr }); S.scene.add(m); return m; };
      S.gMz = glo('#cfeeff', 0); S.gIm = glo('#bfe6ff', 14);
      /* Isrusk og frostrøyk langs sporet der strålen går, og det som spruter mot kameraet når den feier forbi (25,00). */
      { const SP = [], dx = BB[0] - BA[0], dz = BB[1] - BA[1], px = -dz / BLEN, pz = dx / BLEN;
        for (let k = 0; k < 520; k++) { const u = k < 90 ? 0 : rnd(k, 81), bp = bmP(u), sd = rnd(k, 82) > 0.5 ? 1 : -1, o = rnd(k, 83) * (k < 90 ? 3 : 1.2); SP.push({ p: [bp[0] + px * sd * o, 0.3, bp[1] + pz * sd * o], v: [px * sd * (2 + rnd(k, 84) * 6) + (rnd(k, 85) - 0.5) * 2, 2.5 + rnd(k, 86) * 7, pz * sd * (2 + rnd(k, 84) * 6) + (rnd(k, 87) - 0.5) * 2], b: bmT(u) - BM.on + rnd(k, 88) * (k < 90 ? 1.3 : 0.08), l: 0.6 + rnd(k, 89) * 0.8, z: 0.12 + rnd(k, 90) * 0.3 }); }
        const cp = bmP(UC); for (let k = 0; k < 60; k++) SP.push({ p: [cp[0] + (rnd(k, 91) - 0.5) * 2, 0.6 + rnd(k, 92) * 2, cp[1] + (rnd(k, 93) - 0.5) * 3], v: [-5 - rnd(k, 94) * 8, 1.5 + rnd(k, 95) * 5, -2 + rnd(k, 96) * 8], b: BM.cam - BM.on + rnd(k, 97) * 0.1, l: 0.5 + rnd(k, 98) * 0.5, z: 0.06 + rnd(k, 99) * 0.14 });
        S.spray = K.pts(SP.length, i => SP[i], { t0: F(BM.on), g: 9.8, drag: 0.4, add: 1, px: 80, c: ['#ffffff', '#dff2ff', '#a8d0f0'], fade: 0.45, a: 0.8, near: 3 }); S.spray.frustumCulled = false; S.scene.add(S.spray);
        S.bmist = K.pts(150, k => { const u = rnd(k, 101), bp = bmP(u); return { p: [bp[0] + (rnd(k, 102) - 0.5) * 3, 0.4, bp[1] + (rnd(k, 103) - 0.5) * 3], v: [(rnd(k, 104) - 0.5) * 2.4, 0.5 + rnd(k, 105) * 1.2, (rnd(k, 106) - 0.5) * 2.4], b: bmT(u) - BM.on + rnd(k, 107) * 0.15, l: 2.2 + rnd(k, 108) * 2, z: 3 + rnd(k, 109) * 3 }; },
          { t0: F(BM.on), px: 110, sway: 0.4, c: ['#f4f0ff', '#e2dcf4', '#cfc8ea'], fade: 0.25, a: 0.06, sz0: 0.5, sz1: 2.4, near: 14 }); S.scene.add(S.bmist); }
      /* Frostrøyken over det åpne vannet (faller sammen på aksenten), glitteret etter vingene, snøen som raser av tretoppene på 0:00, og isstøvet bremseslagene blåser utover. */
      S.smoke = K.pts(1100, i => { const a = rnd(i, 1) * TAU, r = Math.sqrt(rnd(i, 2)) * 122, sz = i % 3 ? [(rnd(i, 10) - 0.5) * 130, 20 + rnd(i, 17) * 100] : [cos(a) * r, sin(a) * r]; return { p: [sz[0], 0.15 + rnd(i, 3) * 0.7, sz[1]], v: [0.6 + rnd(i, 4) * 0.8, 0.25 + rnd(i, 5) * 0.55, -0.3 + rnd(i, 6) * 0.6], b: rnd(i, 7) * 9, l: 6 + rnd(i, 8) * 5, z: 1.6 + rnd(i, 9) * 3.2 }; },
        { loop: 1, px: 120, sway: 0.9, c: ['#f6dcea', '#e2d2ee', '#c4bae2'], fade: 0.3, a: 0.2, sz0: 0.45, sz1: 2.6, near: 6 }); S.scene.add(S.smoke);
      { const T0 = 3.5, T1 = 26.4, NTr = 1300; S.trail = K.pts(NTr, i => { const s0 = T0 + (T1 - T0) * (i / NTr), w = tipAt(s0, i % 2 ? 1 : -1), c = path(s0), k = i % 5 === 0 ? 0 : 1;
          return { p: [mix(c[0], w[0], k) + (rnd(i, 21) - 0.5) * 1.6, mix(c[1], w[1], k) + (rnd(i, 22) - 0.5), mix(c[2], w[2], k) + (rnd(i, 23) - 0.5) * 1.6], v: [(rnd(i, 24) - 0.5) * 0.9, -0.3 - rnd(i, 25) * 0.4, (rnd(i, 26) - 0.5) * 0.9], b: s0 - T0, l: 2 + rnd(i, 27) * 2.4, z: 0.5 + rnd(i, 28) * 0.9 }; },
          { t0: F(T0), add: 1, px: 42, c: ['#ffffff', '#e2f2ff', '#bcd8ff'], fade: 0.45, a: 0.9 }); S.scene.add(S.trail); }
      S.burst = K.pts(380, i => { const big = i % 3 === 0, x = (rnd(i, 31) - 0.5) * 44, z = 152 + rnd(i, 32) * 36, y = terrH(x, z) + 19 + rnd(i, 33) * 11; return { p: [x, y, z], v: [(rnd(i, 34) - 0.5) * 8, 1.5 + rnd(i, 35) * 6, (rnd(i, 36) - 0.5) * 6 - 4.5], b: rnd(i, 37) * 0.35 + max(0, (182 - z) / 60) * 0.5, l: 2.8 + rnd(i, 38) * 2.4, z: big ? 12 + rnd(i, 39) * 16 : 2 + rnd(i, 39) * 5 }; },
        { t0: F(-0.42), g: 4.5, drag: 0.6, px: 96, c: ['#fff4fa', '#f0dcee', '#cabfe6'], fade: 0.25, a: 0.34, sz0: 0.45, sz1: 2.2 }); S.scene.add(S.burst);   /* snøen fra tretoppene: store, myke skyer (bildet har lang linse) og små klumper */
      S.blast = K.pts(260, i => { const a = rnd(i, 111) * TAU, r = 1 + rnd(i, 112) * 4, sp = 9 + rnd(i, 113) * 15, bt = [0, 0.69, 1.39][i % 3]; return { p: [H[0] + cos(a) * r, 0.3 + rnd(i, 114) * 0.6, H[2] + sin(a) * r], v: [cos(a) * sp, 0.4 + rnd(i, 115) * 1.6, sin(a) * sp], b: bt + rnd(i, 116) * 0.12, l: 1.5 + rnd(i, 117) * 1.4, z: 2.4 + rnd(i, 118) * 3 }; },
        { t0: F(L.cam - 0.02), drag: 1.5, px: 150, sway: 0.3, c: ['#f4f0ff', '#e2dcf6', '#c8c0e6'], fade: 0.2, a: 0.1, sz0: 0.6, sz1: 2.6, near: 10 }); S.scene.add(S.blast);
      S.rdust = K.pts(240, i => { const a = rnd(i, 121) * TAU, e = (rnd(i, 122) - 0.3) * 1.6, sp = 5 + rnd(i, 123) * 13; return { p: [H[0], H[1] + 1.5, H[2]], v: [cos(a) * cos(e) * sp, sin(e) * sp * 0.7 + 1, sin(a) * cos(e) * sp], b: rnd(i, 124) * 0.25, l: 1.4 + rnd(i, 125) * 1.6, z: 0.5 + rnd(i, 126) * 0.9 }; },
        { t0: F(L.roar), drag: 1.2, add: 1, px: 46, c: ['#ffffff', '#dff2ff', '#b8d8ff'], fade: 0.4, a: 0.95 }); S.scene.add(S.rdust);
      return S; },
    act(S, t, o) { const s = t - CO, T = S.T, lu = S.lake.material.uniforms, q = S.q = perf(s, T);
      light(S, T, s >= L.top);
      pose(S.gr, S.bd, q, T, t); pose(S.rf, S.rbd, q, T, t); S.rf.root.position.copy(S.gr.root.position); S.rf.root.quaternion.copy(S.gr.root.quaternion);
      S.gr.apply(); S.rw = q.rr; S.spc = '#d8f0ff';
      /* Speilbildet: klart i det svarte vannet, svakere og roligere i isen. */
      const ice = seg(s, L.acc, L.acc + 2.2); S.rfU.uA.value = mix(0.8, 0.4, ice); S.rfU.uWob.value = 1 - ice; S.rfU.uTint.value.set(mix(0.62, 0.7, ice), mix(0.62, 0.74, ice), mix(0.8, 0.95, ice));
      /* Ringen på aksenten: frosten skyter over hele innsjøen (2,9 s). Røyken faller sammen, og diamantstøvet tennes. */
      const rA = s - L.acc, c0 = path(L.acc); lu.uFR.value.set(c0[0], c0[2], rA > 0 ? 265 * Math.pow(c01(rA / 2.9), 1.08) : 0, rA > 0 ? 1 : 0);
      S.smoke.material.uniforms.uA.value = 0.2 * (1 - seg(s, L.acc, L.acc + 2.4)); S.dust.material.uniforms.uA.value = 0.14 + 0.16 * seg(s, -1.6, 0) + 0.6 * seg(s, L.acc, L.acc + 1.6);
      S.us.uSkyK.value.x = 0.3 + 0.4 * seg(s, L.acc, L.roar);
      /* Ice Beam: fra nebbet (forbi kjeven, i retningen fra hodet) til isen. */
      const bu = bmU(s), ba = s >= BM.on && s < BM.off ? eo(seg(s, BM.on, BM.on + 0.06)) * (1 - seg(s, BM.end, BM.off)) : 0, jw = S.gr.at('Jaw'), hd = S.gr.at('Head'), O = jw.clone().add(jw.clone().sub(hd).multiplyScalar(0.7)), I = q.aim.clone(); I.x += 0.22 * sin(t * 37); I.z += 0.22 * cos(t * 29);
      for (const m of S.beam) { m.visible = ba > 0.01; if (!m.visible) continue; const d = I.clone().sub(O), Ln = d.length(), r = m.userData.r * (0.85 + 0.15 * sin(t * 53 + m.userData.r * 9));
        m.position.copy(O); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.scale.set(r, Ln, r); m.material.uniforms.uL.value = Ln; m.material.uniforms.uA.value = m.userData.a0 * ba; }
      S.gMz.position.copy(O); S.gMz.material.uniforms.uA.value = 0.9 * ba; S.gIm.position.copy(I); S.gIm.material.uniforms.uA.value = 1.1 * ba;
      lu.uBK.value.set(max(0.001, bu), s >= BM.sw ? 1 : 0, ba); const ra = s - BM.on;
      lu.uMark.value.set(BA[0], BA[1], ra > 0 ? 1.5 + 9.5 * eo(c01(ra / 1.3)) : 0, ra > 0 ? 1 : 0);
      lu.uRing.value[0].set(BA[0], BA[1], ra > 0 ? 2 + 18 * eo(c01(ra / 0.8)) : 0, ra > 0 ? 1 - c01(ra / 1.0) : 0);
      /* Bremseslagene og brølet slår ringer i isen under den. */
      [L.cam + 0.69, L.hov, L.roar].forEach((b, i) => { const a = s - b; lu.uRing.value[i + 1].set(H[0], H[2], a > 0 ? 3 + (i === 2 ? 60 : 30) * eo(c01(a / 1.1)) : 0, a > 0 ? (i === 2 ? 1 : 0.6) * (1 - c01(a / 1.1)) : 0); });
    },
    shots: [
      /* 1 Kald start: lavt over det svarte, rykende vannet, mot skogen i sør og det rosa beltet over jordskyggen. Kameraet glir sakte fram. */
      [0, (S, u, a, t) => { cam(7, mix(2.4, 2.6, u), mix(52, 46, u), 2, mix(17, 19, u), 172, 40); light(S, S.T, 0); S.post.fade = 1 - seg(t, 0, 0.9); }],
      /* 2 Fanfaren: den kommer over tretoppene (lang linse, snøen raser), stuper mot vannet og retter seg opp, og stryker over kameraet mens vannet fryser under den. */
      [F(0) - 0.03, (S, u, a, t) => { const s = t - CO, p = path(s + 0.08), cz = mix(86, 63.5, io(u)), cy = mix(2.8, 3.1, u), tz = max(p[2], cz + 17), ty = min(p[1] - 2.6 * (1 - seg(s, 0.6, 2.4)), cy + (tz - cz) * mix(1.2, 0.36, seg(s, 3.3, 4.7)));   /* siktet følger den, men vipper aldri over 20°: den stryker ut over bildekanten */
        cam(mix(8, 5.5, io(u)), cy, cz, p[0], ty, tz, kf(s, [[0, 10], [1.2, 11.5], [2.2, 13, io], [3.0, 17, io], [3.8, 27, io], [4.5, 38, io], [5.5, 48]]));
        S.post.sh = 0.5 * hit(s, 0, 0.8) + 0.7 * hit(s, 5.15, 0.5); S.post.fl = 0.22 * hit(s, 0, 0.1); S.post.flc = '#ffe6f0'; }],
      /* 3 Riffet: kameraet flyr lavt over vannet, først skrått foran den og så ved siden av, mens vannet fryser bak vingespissene og halen. */
      [F(L.riff), (S, u, a, t) => { const s = t - CO, p = path(s), e = EF(s), k = io(u); cam(p[0] + mix(-9, -15.5, k), mix(2.5, 3.1, k), p[2] + mix(-13.5, -3.5, k), p[0] + mix(0.5, 1, k), p[1] - mix(0.2, 0.7, k), p[2] + mix(1.5, 2.5, k), mix(40, 43, k), -0.03 * e); S.post.sh = 0.4 * e; }],
      /* 4 Høyt bak den: den hvite kilen over den svarte innsjøen. På aksenten skyter frosten ut til land, og kameraet løfter seg så hele innsjøen synes. */
      [F(L.top), (S, u, a, t) => { const s = t - CO, sf = s < L.acc ? s : L.acc + 0.8 * (1 - Math.exp(-(s - L.acc) / 0.8)), p = path(sf), e = eo(seg(s, L.acc, L.acc + 2.4)); cam(p[0] + mix(16, 5, u), p[1] + 42 + 46 * e, p[2] + 88 + 44 * e, p[0] - 1, p[1] - 3, p[2] + 20 + 16 * e, mix(31, 46, e)); S.post.sh = 1.4 * hit(s, L.acc, 0.8) + 0.2 * EF(s); S.post.fl = 0.22 * hit(s, L.acc, 0.12); S.post.flc = '#dff0ff'; }],
      /* 5 Fra den nye isen: den stiger bratt mot himmelen der sola gikk ned, vender på vingespissen, faller inn i svingen med en full rull og kommer mot oss. */
      [F(L.up), (S, u, a, t) => { const s = t - CO, p = path(s); cam(mix(-3, -1.5, u), 2.2, mix(4, 9, u), p[0], p[1] - mix(1.2, 0, seg(s, 20.6, 22.2)), p[2], kf(s, [[L.up, 13], [18.6, 8.6, io], [20.4, 9.6], [22.2, 19, io]])); }],   /* lang linse: fuglen stor mot fjellene og lyssøylen */
      /* 6 Ice Beam og bremsen, i ett bilde: strålen treffer isen under plassen, feier mot oss og forbi (25,00), og den reiser seg med store slag og står i lufta
         der den står i kampen. Kameraet glir fra lang linse til kampens bilde. */
      [F(L.back), (S, u, a, t) => { const s = t - CO, p = S.q.P, k = io(seg(s, 23.4, 26.3)), tg = camEnd(), cp = CAMB.cp, w = io(seg(s, 22.4, 24.6));
        cam(mix(-7.5, cp[0], k), mix(2.8, cp[1], k), mix(31, cp[2], k), mix(mix(p.x, mix(p.x, BA[0], 0.5), w), tg[0], k), mix(mix(p.y, p.y * 0.42, w), tg[1], k), mix(mix(p.z, mix(p.z, BA[1], 0.5), w), tg[2], k), mix(25, CAMB.fv, k));
        S.post.sh = 0.5 * hit(s, BM.on, 0.5) + 0.25 * (s > BM.sw && s < BM.cam ? 1 : 0) + 2.4 * hit(s, BM.cam, 0.7) + 0.8 * hit(s, L.cam + 0.69, 0.4) + 1.0 * hit(s, L.hov, 0.5); S.post.fl = 0.3 * hit(s, BM.cam, 0.1); S.post.flc = '#e2f4ff'; }],
      /* 7 Brølet, tett på: lavt og skrått forfra, vingene ut over hele bildet, og frosten raser inn over linsa. */
      [F(L.roar), (S, u, a, t) => { const s = t - CO, e = eo(u); cam(mix(-4.6, -4.1, e), mix(6.6, 7.0, e), mix(-9, -11.5, e), H[0] - 0.2, H[1] + 2.0, H[2], 36); X.mouth(S, S.gr, F(L.roar), t); S.post.sh = 2.2 * hit(s, L.roar, 1.2); S.post.fl = 0.35 * hit(s, L.roar, 0.1); S.post.flc = '#e8f4ff'; }],
      /* 8 Navnet: kampens bilde. Den står i lufta og slår rolig med vingene mens den venter. */
      [TN, (S, u, a, t) => { const tg = camEnd(), cp = CAMB.cp; cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv); X.mouth(S, S.gr, F(L.roar), t); S.post.fl = 0.3 * hit(t, TN, 0.1); S.post.flc = '#e8f4ff'; }],
    ],
  });
  /* Lydene: naturlydene ligger i lydsengen. Brølet er artens eget (signalet 'cry'). Skriket langt borte på aksenten (Jazz 20.11: «Et skrik fra articuno hørt fra distanse
     og litt reverb når han fryser hele "lake"») er det samme skriket, svakt, uten diskant og med etterklang (tre forsinkelser som mates tilbake). */
  X.snd.afar = (v, sh) => { try { if (typeof S === 'undefined' || !S.sound || !S.cries || typeof cryBuf !== 'function' || !ac()) return [20];
      cryBuf(144).then(buf => { const a = ac(), src = a.createBufferSource(), lp = a.createBiquadFilter(), hp = a.createBiquadFilter(), g = a.createGain(), Lq = typeof loudOf === 'function' ? loudOf(buf) : -18;
        src.buffer = buf; src.playbackRate.value = 0.92; hp.type = 'highpass'; hp.frequency.value = 320; lp.type = 'lowpass'; lp.frequency.value = 2300;
        g.gain.value = Math.min(0.5, 0.11 * (Lq > -90 ? Math.max(0.12, Math.min(2, Math.pow(10, (-18 - Lq) / 20))) : 0.4) * Math.pow((S.cvol == null ? 70 : S.cvol) / 100, 1.6) * 4.27);
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect((typeof fxBus === 'function' && fxBus()) || a.destination);
        for (const [d, fb, w] of [[0.21, 0.5, 0.55], [0.34, 0.46, 0.42], [0.53, 0.4, 0.34]]) { const dl = a.createDelay(1), f = a.createGain(), wg = a.createGain(); dl.delayTime.value = d; f.gain.value = fb; wg.gain.value = w; lp.connect(dl); dl.connect(f); f.connect(dl); dl.connect(wg); wg.connect(g); }
        src.start(a.currentTime + (sh || 0)); }).catch(() => {}); } catch (_) {} return [20, 60, 20]; };   /* sh: bare lydsporverktøyet (når i sporet signalet kommer) */
  X.reg('c3:144', { spid: 144, skin: 'ice', cues: [[F(L.acc) + 0.3, 'afar'], [F(L.roar), 'cry']], roar: () => F(L.roar),
    look(S, t, P) { const s = t - CO; P.bloom = 0.24; P.bloomT = 0.8; P.vig = 0.34; P.vigc = '#0c0a26'; P.grain = 0.03; P.grade = { tint: [1.02, 0.98, 1.05], con: 1.05, sat: 1.06, exp: 1 }; },
    over: (x, t, o) => X.plate(x, t - TN, Object.assign({ name: 'Articuno', lv: 60, skin: 'ice' }, o)),
    fx(S, t, P) { const s = t - CO; speedFx(S, s, t); splatFx(s);
      lensFrost(eo(seg(s, L.roar - 0.04, L.roar + 1.0)) * 0.7 * (1 - 0.14 * seg(s, L.name, L.name + 1.5)), 0.92 * seg(s, L.roar - 0.06, L.roar + 0.2) * (1 - 0.45 * seg(s, L.name + 0.4, L.name + 2.4))); } });
})();
