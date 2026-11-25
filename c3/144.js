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
  const CAM6 = { cp: [-7.5, 2.8, 31], tg: [-10, 5, -45], fv: 26 };   /* Ice Beam: kameraet står i ro mens strålen går (fuglen oppe til venstre, treffpunktet nede til høyre) */

  /* ---------- Banen: en glatt kurve gjennom knutene (tiden i låta → plassen) ----------
     En naturlig kubisk spline per akse, så både farten og akselerasjonen er sammenhengende: kroppen krenger etter akselerasjonen, og et sprang der ville blitt et rykk.
     Farten ligger i avstanden mellom knutene: over trærne rundt 17 m/s, stupet 29, lavt over vannet 21, og null der den står. Vingeoveren (Jazz 24.11 om v5: «fly raskere
     lengre bort før barrel roll og gjøre barrel roll lengre unna … fly raskere mot kamera»; om v6: «enda lengre bort … barrel roll i distanse»): klatringen 26-32 m/s,
     toppen 11 m/s 276 m fra kameraet, rullen 210-245 m unna, og stupet mot oss 53 m/s, inn i Ice Beam-bildet med 37 og ned til 18 m/s. Regnet fra en fartsprofil, så farten og krengingen glir (høyst 2 g). */
  const KN = [[-3, 6, 12, 226], [-1.4, 4, 18, 200], [0, 2, 37, 178], [1.0, 0.5, 46.5, 162.5], [1.8, 0, 42.5, 151], [3.0, 0, 14, 124], [3.7, 0.8, 6.6, 106], [4.5, 2, 5.4, 86], [5.2, 2.6, 5.6, 70], [5.584, 3, 5.2, 61.5],
    [7.6, 1.5, 4.8, 18], [9.745, -1, 5, -28], [11.8, -3, 5.3, -68], [13.906, -4, 6, -104], [15.2, -8.6, 15.8, -132.5], [16.4, -17.5, 31, -164.1], [17.3, -31.5, 41, -185.5], [18.1, -46.3, 46.7, -197.8], [18.8, -56.3, 48.6, -200.5],
    [19.4, -61.1, 47.1, -195.3], [20, -62.3, 42.1, -181.8], [20.42, -61.1, 36.9, -167.8], [20.8, -58.2, 31.8, -152.1], [21.19, -53.5, 26.7, -133.5], [21.7, -45.2, 21.4, -108.7], [22.23, -36, 18, -88], [23.617, -19.6, 12.6, -59.8], [25.004, -7, 10.6, -40], [25.7, -1.5, 8.6, -33.2], [26.391, H[0], H[1], H[2]]];
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
  /* Glattet fart og akselerasjon til kroppens retning (Jazz 24.11 om v6: «ingen plutselig hakkete bevegelser … Ofte skjer dette når articuno snur retning»): splinens
     akselerasjon knekker i hver knute, og krengingen følger den, så kroppen skiftet dreiefart brått der (rykk.js: 36 → 69 °/s på 5,2, 102 → 7 på 22,23). Et gaussisk snitt
     regnet som sentrerte differanser av plassen over ±0,22 s (farten snittet over 0,44 s, akselerasjonen med en trekant) gjør dreiningen myk uten prøvesteg; plassen er
     fortsatt splinens egen. */
  const SH = 0.22, sva = s => { const a = pva(s - SH).p, b = pva(s).p, c = pva(s + SH).p, v = [], ac = []; for (let j = 0; j < 3; j++) { v.push((c[j] - a[j]) / (2 * SH)); ac.push((c[j] - 2 * b[j] + a[j]) / (SH * SH)); } return { v, a: ac }; };
  const smax = (x, m) => 0.5 * (x + m + Math.sqrt((x - m) * (x - m) + 4));   /* myk max: ingen knekk når løftet når bunnen */

  /* ---------- Skuespillet i tall (tiden i låta) ---------- */
  const UF = s => s < 25.05 ? 0 : s >= 26.6 ? 1 : io(seg(s, 25.05, 26.5));                          /* 0 i flukt, 1 når den står oppreist i lufta */
  /* Vingeslagets utslag (radianer i skulderen). Bunnen av nedslaget treffer annethvert slag (B0 + k · HP): 0:00 over trærne, riffet, aksenten og bremseslagene. */
  const AMP = s => kf(s, [[-3, 0.6], [-0.45, 0.62], [-0.15, 0.86, io], [0.45, 0.86], [1.0, 0, io], [3.9, 0], [4.25, 0.55, io], [9.9, 0.56], [10.9, 0.5], [11.45, 0.04, io], [12.6, 0.04], [13.3, 1.0, io], [14.15, 1.0],
    [14.7, 0.72, io], [17.0, 0.72], [17.8, 0.05, io], [21.6, 0.05], [22.0, 0.13, io], [24.6, 0.13], [24.95, 0.95, io], [26.1, 0.85], [26.7, 0.12, io], [27.1, 0.12], [27.4, 0, io]]);
  const FOLD = s => kf(s, [[-3, 0.85], [1, 0.85], [4, 0.55], [13.2, 0.55], [13.5, 0.9], [17.2, 0.85], [22, 0.5], [24.8, 0.5], [25, 0.95], [26.3, 0.9], [26.8, 0.4]]);
  /* Stupet (Jazz 24.11 om v6, og vandrefalkens fire vingeformer): glid → kuppet (tuck) → dråpen (STP, vingene lagt inntil kroppen) → M-form i oppretningen (tuck) → glid. */
  const STP = s => kf(s, [[1.45, 0], [1.9, 1, io], [2.8, 1], [3.25, 0, io]]);
  const TUCK = s => kf(s, [[1.0, 0], [1.45, 0.65, io], [1.9, 0, io], [2.8, 0], [3.25, 0.65, io], [3.7, 0, io], [19.3, 0], [20.2, 0.3, io], [20.45, 0.6, io], [21.0, 0.6], [21.5, 0, io]]);
  const HOV = s => kf(s, [[25.6, 0], [26.5, 0.34, io], [27.05, 0.34], [27.35, 0, io], [F0E - 0.2, 0], [F0E + 0.9, 0.3, io]]);   /* slaget i den oppreiste stillingen */
  const F0E = 29.7;                                                                                 /* her tar de rolige slagene over etter brølet (ett per takt) */
  const MANT = s => kf(s, [[27.12, 0], [27.62, 1, io], [27.74, 1], [27.86, 0, io]]);   /* slippes raskt, men uten sprang i farten (rettelse 5) */                 /* forvarselet: vingene trekkes fram rundt kroppen før brølet */
  const OPEN = s => s < L.roar - 0.06 ? 0 : kf(s, [[L.roar - 0.06, 0], [L.roar + 0.16, 1, k => bk(k, 2.6)], [L.name + 0.2, 1], [F0E + 0.6, 0, io]]);   /* brølet: vingene helt ut */
  const sm5 = x => x * x * x * (x * (6 * x - 15) + 10);   /* femtegrads kurve: farten og akselerasjonen starter og slutter i null (rettelse 5: elegante vendinger) */
  const ROLL = s => TAU * sm5(seg(s, 20.42, 21.19));                                                 /* en full rull, ferdig på slaget 21,19 */
  const PH = s => s <= 27.2 ? (s - B0) / HP + 0.56 : s < F0E ? (27.2 - B0) / HP + 0.56 : (s - F0E) / (2 * HP);   /* slagets fase: 0 = toppen, 0,56 = bunnen */
  /* Ice Beam («Lang feiing», tidene i låta): takta 22,23 treffer strålen isen under plassen, takta 23,62 begynner den å feie mot kameraet, takta 25,00 er den ved siden
     av kameraet (UC av veien) og ute av bildet, og den slukker like etter. Sporet går fra BA til BB på isen (x, z). */
  /* Jazz 24.11 om v3: «Den kan starte rett forran skjermen der man står først og gli med en gang forbi»: første treff rett foran kameraet (BA, 23 m foran, nede på midten),
     det står et kvart sekund mens isen spruter (til sw), og glir så ut nede til høyre og forbi kameraet (cam: der det passerer kameraets plan, 3,9 m ved siden av), og slukker. */
  const BM = { on: L.back, sw: L.back + 0.55, cam: L.sw, end: L.sw + 0.05, off: L.sw + 0.19, ch: L.back - 0.4 },   /* Jazz 24.11 om v4: «litt for kort»: forbi kameraet på slaget 23,62 */ BA = [-8, 8], BB = [-3, 34], UC = 0.885, BLEN = hyp(BB[0] - BA[0], BB[1] - BA[1]);
  const BP = 1.7, BV = BP * UC / (BM.cam - BM.sw);   /* glir stadig fortere; holder farten fra kameraets plan til enden */
  const bmU = s => s < BM.sw ? 0 : s < BM.cam ? UC * Math.pow((s - BM.sw) / (BM.cam - BM.sw), BP) : min(1, UC + (s - BM.cam) * BV);
  const bmT = u => u <= 0 ? BM.on : u <= UC ? BM.sw + Math.pow(u / UC, 1 / BP) * (BM.cam - BM.sw) : BM.cam + (u - UC) / BV;   /* når strålen passerer u */
  const bmP = u => [mix(BA[0], BB[0], u), mix(BA[1], BB[1], u)];
  /* Farten som effekt (Jazz 24.11 om v4: «få alt til å se ut som at det går raskere … det er en kunst å få det til å se raskt ut, uten at det faktisk er det»): i stupet, når den
     suser over kameraet, full ved siden av, over halvparten ovenfra, og i fallet etter rullen. Banen og vingeslagene er de samme. */
  const EF = s => kf(s, [[1.5, 0], [2.3, 0.85, io], [3.7, 0.85], [4.4, 1, io], [L.top, 1], [L.top + 0.3, 0.6, io], [L.acc, 0.6], [L.acc + 0.6, 0, io], [16.6, 0], [17.0, 0.55, io], [17.7, 0.5], [18.3, 0, io], [19.5, 0], [20.4, 0.85, io], [21.2, 1, io], [22.2, 1], [22.24, 0]]);   /* vingeoveren (Jazz 24.11 om v5): i klatringen, ikke på toppen, og full når den kommer mot oss */
  const SWP = s => kf(s, [[4.4, 0], [5.4, 0.22, io], [9.6, 0.22], [10.6, 0, io], [16.6, 0], [17.1, 0.2, io], [17.7, 0.2], [18.3, 0, io], [19.8, 0], [20.6, 0.2, io], [22.0, 0.2], [22.6, 0, io]]);   /* vingene litt bakoverstrøket i fart */
  const POFF = 20.497;   /* «poff» i rullen, på slaget (Jazz 24.11) */   /* farten som effekt: full ved siden av, under halvparten ovenfra */

  /* ---------- Flyriggens tall for Articuno (målt på modellen: den står oppreist i hvile, med vingene i en V og en hale på 19 ledd) ----------
     fw, di og tw er per segment innenfra og ut (Shoulder, Arm, ForeArm1, ForeArm2, Hand1, Hand2), i grader: se X.bird i raid3c.js. */
  const TAIL = Array.from({ length: 19 }, (_, i) => 'Tail' + (i + 1));
  /* Nakken (Jazz 24.11: «Hodet går rart, det er så bøyd bakover og ikke naturlig i det hele tatt»): [ben, andel av stigningen, andel av giret]. I flukt strekkes nakken
     FRAM og hodet alene dreies opp (som i Let's Go og filmen), så hodet ligger i linje med kroppen og nebbet peker fram: nakken 14° fra kroppens akse, ikke 72°.
     Spine2 har samme andel i begge, så skuldrene og vingene står likt. Når den står oppreist (uf), glir fordelingen over til den gamle (brølet og forvarselet). */
  const NKF = [['Spine2', 0.18, 0], ['Neck', -0.3, 0.4], ['Head', 1.12, 0.6]], NKU = [['Spine2', 0.18, 0.18], ['Neck', 0.45, 0.45], ['Head', 0.37, 0.37]];
  const neckW = uf => { const k = uf * uf * (3 - 2 * uf); BIRD.neck = NKF.map((a, i) => [a[0], mix(a[1], NKU[i][1], k), mix(a[2], NKU[i][2], k)]); BIRD.keep = [['FeelerB1', mix(-0.11, 0.56, k)]]; };
  const BIRD = { fwd: [0, 1, 0], up: [0, 0, -1], mid: [0, 2.35, -0.02], wing: ['Shoulder', 'Arm', 'ForeArm1', 'ForeArm2', 'Hand1', 'Hand2'], tail: TAIL,
    neck: NKF, keep: [['FeelerB1', -0.11]], leg: [['Thigh', 42], ['Leg', 28], ['Foot', 35]],   /* brystfjærene (FeelerB1–3) henger på nakken: holdes inntil kroppen */
    poses: { glide: { fw: [10, 10, 6, -6, -20, -32], di: [3, 6, 4, 0, -4, -6], tw: [0, 2, 2, 0, -3, -6] },          /* glidestillingen: armen litt fram, hånda feid bakover */
      tuck: { fw: [-20, -50, 35, -65, -80, -85], di: [0, 4, 8, 2, 0, 0], tw: [0, 0, 0, 0, 0, 0] },                  /* kuppet / M-form: vingene feid bakover */
      stoop: { fw: [-35, -75, 55, -80, -88, -92], di: [0, 8, 14, 10, 6, 4], tw: [0, 0, 0, 0, 0, 0] },                /* dråpen: lagt helt inntil kroppen, hånda langs halen */
      open: { fw: [15, 30, 38, 36, 30, 26], di: [0, -4, -6, -6, -4, -2], tw: [0, 0, 0, 0, 0, 0] },                  /* brølet: vingene helt ut og høyt */
      mant: { fw: [8, 6, 26, -8, -36, -48], di: [-6, -20, -30, -38, -40, -40], tw: [0, 4, 8, 12, 14, 14] },        /* forvarselet: trukket fram rundt kroppen */
      brake: { fw: [26, 30, 26, 20, 14, 8], di: [8, 6, 2, -2, -4, -2], tw: [0, 2, 4, 6, 8, 10] } },                  /* bremsen (del 2, ar32): vingene ført fram og spredt helt ut, litt kuppet */
    lag: [0, 0.01, 0.05, 0.1, 0.135, 0.19], fa: [0.5, 1, 1.06, 1.14, 1.22, 1.32], fm: [0.06, 0.14, 0.14, 0.1, 0.06, 0],
    fs: [0.14, 0.28, 0.28, 0.28, 0.28, 0.28], ft: [0.05, 0.1, 0.18, 0.28, 0.4, 0.5],
    ff: [0, -18, 14, -30, -48, -58], fd: [0, 0, 3, -6, -12, -16], fq: [0, 0, -4, -8, -14, -18],
    ha: [0.5, 1, 1.05, 1.15, 1.25, 1.4], hd: [0.1, 0.25, 0.3, 0.35, 0.4, 0.45], ht: [0, 0.05, 0.1, 0.2, 0.3, 0.4] };
  X.birds = X.birds || {}; X.birds[144] = BIRD; BIRD.path = s => pva(s); BIRD.perf = (s, T) => perf(s, T);   /* til verktøyene (posearkene) og til de neste som flyr */
  /* ---------- «Bevegelse etter Fable», del 1 (Opus 25.11): vingeslaget fra flyriggen 2 (X.fly i raid3c.js), bak bryteren ----------
     Bryteren: G3D.alt[144] = 'stiv' (eller 'gammel') gir vingeslaget slik det var, godkjent 24.11 (live: &gammel=stiv; gjennomgangssiden: &alt=stiv; verktøyene:
     PRE='G3D.alt={144:"stiv"}'). Det nye: slaget fra skulderen med lite etterslep, foldingen i oppslaget, lasten som bøyer spissene opp, fjærene som åpnes, slagsett etter
     styrken (ikke ett slag ganget opp), nedslagets andel etter oppgaven, kroppen som gynger mot slaget og hodet som står (nakken tar gyngingen). Banen, tidene, stillingene,
     halen og kameraene er dagens, og bunnen av nedslaget ligger fortsatt på B0 + k · HP. Fuglelaben (work/g3d/www/fuglelab.js) viser hver måte å fly på. */
  const altv = () => String((G3D.alt && G3D.alt[144]) || ''), STIV = () => /stiv|gammel/.test(altv());
  BIRD.fly = { foldMax: 1, hold: { neck: 'Neck', head: 'Head', max: 0.22, g: 0.45 },   /* ar32: foldingen helt ut (før 0,85; Jazz 25.11: «ser ikke forskjell») */
    /* Nakkens form (ar32; X.fly.neck2 og nlim i raid3c.js): ryggleddet foran nakken og nakken fram, hodet i linje med kroppen og nebbet litt ned (i flukt), og nakken fram foran
       brystet med nebbet vannrett når den står oppreist; grensen: nakken aldri over 5° mot ryggen fra kroppens akse (myk fra −5°), hodet aldri over 80° bakover fra nakken. */
    form: { fly: [23, 18, 15], up: [15, 30, 20], hi: 5, knee: 10, hb: 80, hbk: 20 },   /* nakken er kort (0,3 m), så hodet tar rundt halve gyngingen (hold.g) */
    /* Manøveren (ar33; st.man, trn, rol i X.fly): full bøy er Articunos egen M-form (BIRD.poses.tuck over glidet), så man = 1 er hele M-en, med håndleddet litt opp og hånda
       ned (en måkevinge, så bøyen leses også forfra); i en sving bøyes den indre vingen 0,38 mer og den ytre 0,38 mindre og 10° fram, og i rullen vris hendene 12° hver sin vei
       og bøyes 0,2 ulikt. */
    dist: { mf: [-30, -60, 29, -59, -60, -53], md: [-3, 4, 12, 4, -6, -10], mq: [0, -2, -2, 0, 3, 6] }, man: { t: 0.38, r: 0.2, f: 10, q: 12 } };
  const FSETS = X.fly.sets(BIRD.fly.sets);
  /* Styrken (0 glid, 1 svakt, 2 marsj, 3 kraft), lagt etter dagens utslag (AMP): det første slaget etter et glid er sterkest og avtar slag for slag (Berg og Biewener 2010). */
  const KK = X.fly.trk([[-3, 2.1], [-0.45, 2.15], [-0.15, 2.7], [0.45, 2.7], [1.0, 0], [3.9, 0], [4.5, 2.4], [5.6, 2.1], [9.9, 2.05], [10.9, 1.9], [11.45, 0.35], [12.6, 0.35], [13.3, 3.0], [14.15, 3.0],
    [14.7, 2.45], [17.0, 2.4], [17.8, 0.3], [21.6, 0.3], [22.0, 1.0], [24.6, 1.0], [24.95, 2.95], [26.1, 2.7], [26.5, 2.6], [27.05, 2.6], [27.35, 0], [F0E - 0.2, 0], [F0E + 0.9, 2.3]]);
  const LD = X.fly.trk([[24.6, 0], [25.1, 0.8], [26.2, 0.8], [26.8, 0]]);   /* bremsen: spissene opp og fjærene åpne (Carruthers m.fl. 2007) */
  /* Slagene talt fra en bunn (v): hele tall på B0 + k · HP (annethvert slag i låta), som i dag; etter brølet ett slag per takt. Rettet etter kontrollen 25.11: fasen bremses
     mykt til stans (VA0–VA1, mens styrken går til null) og står der dagens fryser (27,2), og den settes i gang mykt igjen før F0E (VB0–VB1, mens styrken ennå er null) og går
     videre fra der den sto, så slagene etter VB1 ligger der de lå. Før: et sprang i fasen på F0E flyttet kroppen 8 cm på ett bilde (0:32,50), og stansen midt i et slag
     på 27,2 (styrken 1,3) ga vingespissen et vipp og kroppen et hakk (0:30,0). Farten i fasen er sammenhengende, og akselerasjonen også (sm5). */
  const sm5I = x => x * x * x * x * (x * (x - 3) + 2.5);   /* ∫ sm5 fra 0 til x (1/2 ved x = 1) */
  const VZ = (27.2 - B0) / HP, VA0 = 27.05, VA1 = 27.35, VB1 = F0E + 0.345, VB0 = F0E - 0.345 - 4 * HP * (1 - (VZ + 0.6) % 1);
  const VB = s => s <= VA0 ? (s - B0) / HP : s < VA1 ? (VA0 - B0 + (VA1 - VA0) * (seg(s, VA0, VA1) - sm5I(seg(s, VA0, VA1)))) / HP : s <= VB0 ? VZ
    : s < VB1 ? VZ + (VB1 - VB0) / (2 * HP) * sm5I(seg(s, VB0, VB1)) : VZ + (VB1 - VB0) / (4 * HP) + (s - VB1) / (2 * HP);
  /* Den frosne fasen fra 27,2 (dagens): ny holder den også etter F0E, til vingeslaget har tatt over (dagens hopper til toppen på F0E, så folden i alle vingeleddene
     hopper i ett bilde på 0:32,47: funnet med selvsjekken, rettet bare i den nye). */
  const UFZ = X.bird.warp((27.2 - B0) / HP + 0.56, 0.56);
  /* Kuppet i stupet (rettet etter kontrollen 25.11): i dagens film har vingene en kupp med hendene ned mellom kuppet og dråpen (0:04,32–0:04,45, låta 1,55–1,7), fordi
     foldingen i X.bird går videre med fasen uten slag. Uten slag har den nye ingen fold, og vingene sto som en strek der: en fast fold (st.cup), uavhengig av styrken. */
  const CUP = s => 0.8 * sm5(seg(s, 1.49, 1.64)) * (1 - sm5(seg(s, 1.68, 1.85)));   /* som dagens fold i hendene der: inn 1,5–1,65, ut 1,7–1,85 */
  const nbeat = (s, sp, uf) => ({ v: VB(s), k: KK(s), hov: uf, spd: sp, load: LD(s), cup: CUP(s) });

  /* ---------- «Bevegelse etter Fable», del 2 (Opus 25.11 natt): hele filmen med flyvingen fra del 1, bak bryteren ----------
     Bryteren: G3D.alt[144] = 'stiv' (eller 'gammel') gir den godkjente filmen, 'del1' gir del 1 (vingeslaget nytt, resten som i dag). Det nye kan slås av del for del
     (dagens utgave av den delen, resten nytt): 'ghale' (halen), 'gkam' (kameraenes liv), 'geff' (tåka, isnålene og ringen rundt sola), 'gblikk' (hodet ser jevnt inn i
     svingene, uten blikkskift), og bare på forsøk '60' (stupet mot kameraet i 60 bilder i sekundet). Live: &gammel=<ord>; gjennomgangssiden: &alt=<ord>; verktøyene:
     PRE='G3D.alt={144:"<ord>"}' (flere ord: 'gkam ghale'). Reglene og kildene: work/RAIDS3D.md, Articuno
     «Bevegelse etter Fable, del 2», og «Fugleflukt» (del 1). Det nye i korte trekk:
     · glid er glid: ingen småflaks (styrken 0), men sjeldne rettelser (vingene felles, et vindkast, ett rykk i én vinge; X.fly.gust med faste hendelser, 0,8 s: √størrelse)
     · svingen i rekkefølge: kroppen ruller 0,22 s før banen bøyer av (krengingen fra akselerasjonen litt fram i tid), og hodet ser inn i svingen før kroppen
     · stupet lever (hendene dirrer under 3 Hz i fartsvinden, og små styringer), rullen drives av vingene (vridningen leder rullefarten), og glidet feies inn med farten
     · aksenten: tre frosne bilder i bunnen av det tunge slaget (vingene og kroppens løft står; banen, halen og isen går videre)
     · Ice Beam: rekylen (nesen opp, kroppen litt bakover, hodet står på målet), vingene spres, og kjeven lukkes mykt
     · bremsen og svevingen: større slag (Jazz: «bremser med store slag»), kroppen går i en ellipse (ikke rett opp og ned), beina og halens sving starter mykt
     · brølet: kjeven og hodet først, så skuldrene, underarmen og hånda ett og to bilder etter (pisken utover, med overskudd), kroppen og halen sist; den lener seg mot oss
     · blikket i korte, myke skift med ro imellom, og små blikk i svevingen etter navnet
     · halen etter farten (research/lange_haler.md), kameraene med liv som vinkler, og is og tåke etter forskningen (REGLER del 4 «Articuno»)
     Etter Jazz sin tilbakemelding 25.11 kveld (ar32; «ser ikke spesielt forskjell … Nakken … bøyd alt for mye bakover … landingen»), også bak bryteren:
     · nakken fram og hodet i linje med kroppen, nebbet vannrett eller litt ned, og en grense i riggen så den aldri knekker bakover (X.fly.neck2 og nlim, BIRD.fly.form)
     · en ekte, tung bremselanding i lufta (KB, FSETSB, BIRD.poses.brake): kroppen reiser seg bratt, vingene fram og helt ut i store bremseslag, halen fram og ned, føttene fram
     · de nye vingene også i forvarselet og brølet (samme rekkefølge og tider), større slag og løft i svevingen, og vingen foldes og spres tydelig (flyriggens sett, spr) */
  const P2 = k => { const a = altv(); return !/stiv|gammel|del1/.test(a) && !(k && a.indexOf('g' + k) >= 0); };
  /* Styrken i del 2: som KK, men glid er glid (0, ikke 0,3–0,35: det ga et jevnt småflaks på ±3° i glidet). */
  const KK2 = X.fly.trk([[-3, 2.1], [-0.45, 2.15], [-0.15, 2.7], [0.45, 2.7], [1.0, 0], [3.9, 0], [4.5, 2.4], [5.6, 2.1], [9.9, 2.05], [10.9, 1.9], [11.45, 0], [12.6, 0], [13.3, 3.0], [14.15, 3.0],
    [14.7, 2.45], [17.0, 2.4], [17.8, 0], [21.6, 0], [22.0, 1.0], [24.6, 1.0], [24.95, 2.95], [26.1, 2.7], [26.5, 2.6], [27.05, 2.6], [27.35, 0], [F0E - 0.2, 0], [F0E + 0.9, 2.3]]);
  /* Slagsettene i del 2: større i kraft og sveving enn standarden for en stor fugl (Jazz 24.11: «bremser med store slag», «raskere og mer intenst»; spissen i bremsen var 7,1 m
     opp–ned i del 1 mot 9,0 i dag). Bare kraft og sveving: marsj og svakt er som i del 1 (store fugler slår smått når de ikke trenger kraften). */
  const FSETS2 = X.fly.sets({ p: { el: 52, em: 7 }, h: { el: 40, hv: 0.36, fold: 0.8, pt: 4.5 } });   /* ar32: svevingen med større slag og et tydelig løft (Jazz 25.11: «ser ikke forskjell»; før ±33° og 0,22 m) */
  /* Bremselandingen i lufta (ar32; Jazz 25.11: «Føler verken landingen til articuno …»; ørn, svane og trane, research/svevende.md og RAIDS3D «Fugleflukt», Brems og landing):
     kroppen reiser seg bratt, vingene føres fram (BIRD.poses.brake og ex.fw) og spres helt ut i store bremseslag som skyver lufta fram (slaget i kroppens ramme i kraft, ax 0,
     og mest langs kroppen når den står, ax 0,7), spissene bøyes opp av lasten og fjærene åpnes i oppslaget, kroppen løftes og senkes med slaget, halen svinger fram og ned og vris flat mot lufta, og føttene
     kommer fram. KB er bremsens vekt (fra Ice Beam slipper til svevingen har tatt over); slagene ligger der de lå (bunnene 25,00 · 25,70 · 26,39 · 27,09). */
  const KB = s => sm5(seg(s, 24.85, 25.3)) * (1 - sm5(seg(s, 26.55, 27.0)));
  const FSETSB = X.fly.sets({ p: { el: 62, em: 12, sw: 30, sp: 0.24, tw: 18, fold: 1, curl: 38, cb: 12, slot: 28, rv: 0.25, ds: 0.58, lag: 0.04, hv: 0.6, pt: 7, sg: 0.32, ax: 0, spr: 26 },
    h: { el: 56, em: 6, sw: 30, sp: 0.26, tw: 18, fold: 0.9, curl: 32, cb: 10, slot: 30, rv: 0.2, ds: 0.6, lag: 0.04, hv: 0.55, pt: 6, sg: 0.1, ax: 0.7, spr: 22 } });
  const setsMix = (A, Bs, x) => { if (x <= 0) return A; const S = {}; for (const k in A) { S[k] = {}; for (const key in A[k]) S[k][key] = mix(A[k][key], Bs[k][key], x); } return S; };
  /* Rettelsene i glid (faste hendelser, [låtas tid, type, styrke]): to små styringer i stupet, et vindkast over innsjøen (sett ovenfra), og vingene felles og ett rykk i
     én vinge i klatringen og vingeoveren. Varigheten 0,8 s (en ørn 0,35 s, ganget med √størrelse). */
  const GUST = [[2.12, 'venstre', 0.35], [2.5, 'høyre', 0.3], [11.6, 'kast', 0.9], [18.3, 'tuck', 0.8], [19.5, 'høyre', 0.6]], gustAt = s => X.fly.gust(s, { ev: GUST, dur: 0.8 });
  /* Rekylen når Ice Beam treffer (22,23): starter i null, nesen opp og kroppen litt bakover, svinger én gang og dør ut. Vingene spres for å holde seg (lasten). */
  const recoil = a => a <= 0 ? 0 : (1 - Math.exp(-(a / 0.09) * (a / 0.09))) * Math.exp(-a / 0.35) * cos(TAU * 1.4 * a);
  const brace = s => 0.45 * Math.pow(sin(PI * c01((s - 22.15) / 0.8)), 2);
  const nbeat2 = (s, sp, uf) => {
    const kb = KB(s), fw = 1 - sm5(seg(s, 26.95, 27.25)) * (1 - sm5(seg(s, F0E - 0.2, F0E + 0.6)));   /* ar32: det siste bremseslaget går rett over i forvarselet uten å foldes (vingene blir liggende fram) */
    const mv = MNV(), mw = mv ? MW(s) : 0;
    return { v: VB(s), k: KK2(s), hov: uf, spd: sp, load: LD(s) + brace(s) + 0.35 * kb + 0.5 * OPEN2(s), cup: CUP(s), gust: mv ? gustAt2(s) : gustAt(s), S: setsMix(FSETS2, FSETSB, kb), kb, fold: fw,
      man: mw * MAN(s) * (1 - uf), trn: mw * TRN(s), rol: mw * ROL(s) }; };   /* ar32: bremsen og brølet spriker med fjærene; ar33: manøveren i vingeoveren og rullen */
  /* Glidet etter farten: hånda feies inn jo raskere det går (en glatt funksjon av farten, oppå dagens nøkler). */
  const SWV = sp => 0.25 * sm5(c01((sp - 12) / 25));
  /* Brølet i del 2: kjeven og hodet starter halvannet bilde før skriket med null fart (sm5), halvåpen 0,05 s etter; vingene ut med null fart i starten og et overskudd på 10 %
     (dagens back() starter med full fart i alle vingeleddene i samme bilde). Hver gruppe får sin egen tid (pd: skuldrene, underarmen +1 bilde, hånda +2). */
  const rr2 = s => s < L.roar - 0.05 ? 0 : kf(s, [[L.roar - 0.05, 0], [L.roar + 0.17, 1, sm5], [L.name + 0.3, 1], [L.name + 1.3, 0.2, io]]);
  const opn = x => x <= 0 ? 0 : x >= 1 ? 1 : sm5(min(1, x / 0.6)) + (x > 0.45 ? 0.1 * Math.pow(sin(PI * (x - 0.45) / 0.55), 2) : 0);
  const OPEN2 = s => s < L.roar - 0.005 ? 0 : s < L.roar + 0.275 ? opn((s - (L.roar - 0.005)) / 0.28) : kf(s, [[L.roar + 0.275, 1], [L.name + 0.2, 1], [F0E + 0.6, 0, io]]);   /* ett bilde etter hodet */
  /* Rykket i kroppen og halen i brølet, med null fart i starten (dagens kick starter med full fart). */
  const kick2 = a => a <= 0 ? 0 : (1 - Math.exp(-(a / 0.07) * (a / 0.07))) * (0.3 + 0.7 * Math.exp(-3 * a) * cos(8 * a));
  /* Den lener seg mot oss etter brølet (len mot målet), og retter seg opp igjen før vingene foldes. */
  const LEAN = s => sm5(seg(s, L.roar + 0.1, L.roar + 0.7)) * (1 - sm5(seg(s, L.name + 0.2, F0E + 0.6)));
  /* Rullen drives av vingene: vridningen (hånda forkant opp på den ene, ned på den andre) følger rulleakselerasjonen, så den kommer før rullefarten. −1…1. */
  const AIL = s => { const x = seg(s, 20.42, 21.19); return x <= 0 || x >= 1 ? 0 : sin(TAU * x) * Math.pow(sin(PI * x), 2) / 0.65; };   /* som rulleakselerasjonen, men null fart i begge ender */
  /* ---------- Vingeoveren og rullen som én manøver (ar33; Jazz 25.11 om v1: «de småjusteringene når den snurrer retningen som barrel roll … ikke vanlig at vingene er helt ute ved
     barrel roll hos fugler eller når de snur rundt sånn … når den svinger rett før barrel roll så er det litt hakkete og unaturlig»), bak bryteren ('gman' gir v1 her) ----------
     · ingen rettelser i glid i svingen og rullen (vindkastet på 18,3 og rykket i én vinge på 19,5 er tatt bort), og vingenes sveip følger manøveren, ikke rullefarten (den skiftet
       fortegn midt i svingen, så vingene byttet form fram og tilbake)
     · vingene bøyes delvis (albuen og håndleddet, hånda inn og bakover: flyriggens man i Articunos M-form) når den trekker opp inn i svingen, mer når den stuper mot rullen og
       mest gjennom rullen, og spres ut igjen når den retter seg opp og kommer mot oss
     · i svingen bøyes den indre (venstre) vingen mer og den ytre strekkes ut og litt fram (trn, én jevn bue); rullen drives av at hendene vris ulikt og bøyes ulikt (rol =
       X.fly.ail, litt foran rullen), og rullen går etter X.fly.rull, så rykket starter og slutter i null og er lavere (sm5 startet og sluttet med et sprang i rykket)
     · hodet ser inn i svingen i én myk bevegelse og holder blikket gjennom den (ingen blikkskift), slipper motrullingen roligere før rullen og tar den igjen roligere etter,
       og halen vris og slynges ut i svingen
     Utenfor vinduet MW (låta 17,45–21,95) er alt som i v1 (ar32). */
  const MNV = () => P2('man');
  const MW = s => sm5(seg(s, 17.45, 17.85)) * (1 - sm5(seg(s, 21.5, 21.95))), MWH = s => sm5(seg(s, 17.45, 17.85)) * (1 - sm5(seg(s, 21.2, 21.65)));   /* vinduet (hodet slipper før Ice Beam-siktet) */
  const MAN = X.fly.trk([[17.45, 0.2], [17.62, 0.21], [18.3, 0.48], [19.3, 0.6], [20.32, 1], [21.15, 1], [21.9, 0.24], [21.95, 0.24]]);   /* bøyen i M-form (0 glid, 1 hele M-en), gjennom nøklene, ikke fra stopp til stopp */
  const TRN = s => -0.85 * Math.pow(sin(PI * c01((s - 17.7) / 2.2)), 2);   /* svingen mot venstre: den indre vingen er venstre (én jevn bue over hele svingen, toppen 18,8) */
  const ROL = s => X.fly.ail(seg(s, 20.36, 21.13));                      /* rullen mot høyre: vridningen 0,06 s foran rullen */
  const ROLLM = s => TAU * X.fly.rull(seg(s, 20.42, 21.19)), ROLLX = s => MNV() ? ROLLM(s) : ROLL(s);   /* samme start og slutt, rykket starter og slutter i null */
  const GUST2 = GUST.filter(g => g[0] < 17 || g[0] > 22), gustAt2 = s => X.fly.gust(s, { ev: GUST2, dur: 0.8 });
  const GH = X.fly.trk([[17.45, 0.07], [17.72, 0.075], [18.32, 0.26], [19.3, 0.28], [20.0, 0.12], [21.7, 0.12]]);   /* blikket: inn i svingen, holdes, ut igjen */
  /* Blikket (del 2; Kress m.fl. 2015): hodet ser inn i svingen i korte, myke skift (0,2 s, sm5) med ro imellom, ikke jevnt med kroppen; målet er 0,45 s fram i tid
     (hodet leder kroppen, som leder banen med 0,22 s). Regnet én gang for hele filmen, så bildet er en ren funksjon av tiden. */
  const lkAt = s => { const g = sva(s), sp = hyp(g.v[0], g.v[1], g.v[2]) || 1, f = [g.v[0] / sp, g.v[1] / sp, g.v[2] / sp], u0 = [-f[0] * f[1], 1 - f[1] * f[1], -f[2] * f[1]], ul = hyp(u0[0], u0[1], u0[2]) || 1;
    const up = [u0[0] / ul, u0[1] / ul, u0[2] / ul], l0 = [up[1] * f[2] - up[2] * f[1], up[2] * f[0] - up[0] * f[2], up[0] * f[1] - up[1] * f[0]], ga = sva(s + 0.45).a;
    return 0.26 * Math.tanh((ga[0] * l0[0] + ga[1] * l0[1] + ga[2] * l0[2]) / 21) * (1 - UF(s)) * (1 - STP(s)); };   /* i stupet holdes hodet rett fram (Tucker 2000) */
  let GZ = null; const GDS = 0.28;
  const gazeTab = () => { if (GZ) return GZ; GZ = [[-1e9, 0, lkAt(-3)]]; let to = GZ[0][2], ts = -1e9;
    for (let i = 0; i < 36 * 60; i++) { const s = -3 + i / 60, tg = lkAt(s); if (s >= ts + GDS + 0.35 && abs(tg - to) > 0.06) { const nt = tg + 0.25 * (tg - to); GZ.push([s, to, nt]); to = nt; ts = s; } }
    return GZ; };
  const gazeLk = s => { const G = gazeTab(); let i = G.length - 1; while (i > 0 && G[i][0] > s) i--; const g = G[i]; return g[1] + (g[2] - g[1]) * sm5(c01((s - g[0]) / GDS)); };
  /* Små blikk mens den svever etter navnet (et levende dyr ser seg om): til siden og tilbake, med et lite nikk. */
  const GLANCE = s => 0.13 * (sm5(seg(s, 29.85, 30.12)) - sm5(seg(s, 30.95, 31.2))) - 0.08 * (sm5(seg(s, 31.55, 31.8)) - sm5(seg(s, 32.0, 32.25)));
  /* Stupet lever: hendene dirrer i fartsvinden (under 3 Hz, to sinuser), mest i hånda; HW = andelen per ledd innenfra og ut. AW = rullens vridning per ledd. */
  const HW = [0, 0, 0.15, 0.55, 0.8, 1], AW = [0, 0.3, 0.5, 0.7, 0.9, 1], DGR = PI / 180;
  /* rt: brølet holdes med vingene helt ut, og kraften i brølet får dem til å dirre (en liten bølge utover, under 3 Hz), i stedet for å stå helt stille i 1,4 s. */
  const RW = [0.3, 0.5, 0.65, 0.8, 0.9, 1];
  const life = (P, k, q) => { const s = q.s, tr = q.trem || 0, ai = q.ail || 0, rt = q.rt || 0; if (!tr && !ai && !rt) return P; const ph = k ? 1.7 : 0;
    for (let i = 0; i < 6; i++) { P.tw[i] += (tr * HW[i] * (0.6 * sin(TAU * 2.3 * s + ph) + 0.4 * sin(TAU * 1.55 * s + 0.9 + ph * 1.7)) + (k ? 1 : -1) * ai * AW[i] + rt * RW[i] * 2.4 * sin(TAU * 2.2 * s - 0.35 * i + ph)) * DGR;   /* ar32: holdet dirrer synlig (før 1,2°) */
      P.di[i] += (tr * HW[i] * 0.6 * sin(TAU * 1.9 * s + 2.1 + ph) + rt * RW[i] * 1.8 * sin(TAU * 1.7 * s + 1.3 - 0.3 * i + ph)) * DGR; }
    return P; };

  /* Bremsens stilling i blandingen (ar32): de andre stillingene ganges ned, og bremsen kommer inn med vekten (summen er fortsatt 1). */
  const brakeW = (w, kb) => { const o = {}; for (const k in w) o[k] = w[k] * (1 - 0.85 * kb); o.brake = 0.85 * kb; return o; };
  /* Rykket i brølet: starter i null (ikke et sprang), slår ut på fire bilder, svinger og faller til ro. */
  const kick = a => a <= 0 ? 0 : (1 - Math.exp(-16 * a)) * (0.3 + 0.7 * Math.exp(-3 * a) * cos(8 * a));
  /* Kroppen på tiden s: midtpunktet, hodets og ryggens retning, og alt vingene, nakken, beina og halen trenger. V = en ny T.Vector3. */
  /* Krengingen (rad, pluss = mot høyre) på tiden s i flukt, med rullen: til rullefarten, som gir vingene asymmetri (rettelse 5). */
  const bankAt = (s, T, ld) => { const g = sva(s), ga = ld ? sva(s + ld).a : g.a, sp = hyp(g.v[0], g.v[1], g.v[2]) || 1, f = new T.Vector3(g.v[0] / sp, g.v[1] / sp, g.v[2] / sp), u = new T.Vector3(ga[0], smax(ga[1] + GR + 3.5, 3), ga[2]);   /* ld: krengingen leder (del 2) */
    u.addScaledVector(f, -u.dot(f)).normalize(); const ro = ROLLX(s); if (ro > 0 && ro < TAU) u.applyAxisAngle(f, ro);
    const up0 = new T.Vector3(0, 1, 0).addScaledVector(f, -f.y).normalize(), l0 = new T.Vector3().crossVectors(up0, f); return Math.atan2(-u.dot(l0), u.dot(up0)); };
  const perf = (s, T, nf) => { const V = (x, y, z) => new T.Vector3(x, y, z), q = pva(s), g = sva(s), sp = hyp(g.v[0], g.v[1], g.v[2]), uf = UF(s), Y = V(0, 1, 0);   /* nf: uten de frosne bildene (del 2) */
    const p2 = P2(), LB = p2 ? 0.22 * (1 - uf) : 0, gb = LB ? sva(s + LB) : g, mw = p2 && MNV() ? MW(s) : 0, km = 1 - mw;   /* del 2: kroppen ruller 0,22 s før banen bøyer av (krengingen fra akselerasjonen litt fram i tid; 0,3 ga 27 % mer vinkelakselerasjon der den stuper); ar33: manøveren (mw) tar over vingenes form i vinduet */
    /* I flukt: fram langs farten, opp langs løftet (akselerasjonen pluss tyngden), så den krenger i svingene og legger seg rundt i vingeoveren av seg selv. */
    const fh = V(sin(HYAW), 0, cos(HYAW)), wv = io(c01((sp - 0.5) / 2.5)), f = V(g.v[0], g.v[1], g.v[2]).multiplyScalar(wv / max(sp, 1e-3)).addScaledVector(fh, 1 - wv).normalize();   /* glir over til hvilestillingens retning når den står */
    const lf = V(gb.a[0], smax(gb.a[1] + GR + 3.5, 3), gb.a[2]); lf.addScaledVector(f, -lf.dot(f));   /* løftet peker aldri ned: over toppen av stupet letter den, den ruller ikke rundt */ if (lf.length() < 0.5) lf.copy(Y).addScaledVector(f, -f.y); const u = lf.normalize();
    const ro = ROLLX(s); if (ro > 0 && ro < TAU) u.applyAxisAngle(f, ro);
    const left = V(0, 0, 0).crossVectors(u, f), aoa = 0.03 + 5 / (sp * sp + 30) + (mw ? 0.13 * mw * TRN(s) / -0.85 : 0); f.applyAxisAngle(left, -aoa); u.applyAxisAngle(left, -aoa);   /* nesen litt opp, mest når det går sakte; ar33: og når den trekker seg rundt i svingen */
    /* Oppreist: hodet opp og litt fram mot din Pokémon; den reiser seg forbi og faller til ro (overskudd). */
    const E = 1.25 + 0.22 * Math.pow(sin(PI * c01((s - 25.5) / 0.9)), 2) - (p2 ? 0.09 * LEAN(s) - 0.16 * Math.pow(sin(PI * c01((s - 25.3) / 1.15)), 2) : 0),   /* sin²: starter og slutter i ro (før en knekk på 25,5 og 26,4); del 2: lener seg mot oss etter brølet */ hf = V(sin(HYAW) * cos(E), sin(E), cos(HYAW) * cos(E)), hu = V(-sin(HYAW) * sin(E), cos(E), -cos(HYAW) * sin(E));
    if (uf > 0) { const m = new T.Matrix4(), qa = new T.Quaternion().setFromRotationMatrix(m.makeBasis(V(0, 0, 0).crossVectors(u, f), u, f)), qb = new T.Quaternion().setFromRotationMatrix(m.makeBasis(V(0, 0, 0).crossVectors(hu, hf), hu, hf));
      qa.slerp(qb, uf); f.set(0, 0, 1).applyQuaternion(qa); u.set(0, 1, 0).applyQuaternion(qa); }
    const bk2 = bankAt(s + 0.05, T, LB) - bankAt(s - 0.05, T, LB), kr = Math.tanh(Math.atan2(sin(bk2), cos(bk2)) / 0.1 / 1.4) * (1 - uf);   /* rullefarten (rundt 0,76 ved 80 °/s mot høyre; myk grense, ingen knekk) */
    const ph = PH(s), us = X.bird.warp(ph, 0.56), A = AMP(s), Ah = HOV(s), tk = max(TUCK(s), SWP(s), p2 ? SWV(sp) : 0) * (1 - uf) * km, sk = STP(s) * (1 - uf), mt = MANT(s), op = p2 ? OPEN2(s) : OPEN(s), rest = uf * (1 - op) * (1 - mt);
    const st = { u: us, A, Ah, fold: FOLD(s), w: { glide: max(0, 1 - uf - tk - sk), tuck: tk, stoop: sk, rest, mant: uf * mt * (1 - op), open: uf * op },
      ex: { di: 0.3 * Math.pow(sin(PI * c01((s - 3.1) / 0.9)), 2) + 0.12 * Math.pow(sin(PI * c01((s - 18.0) / 1.6)), 2) } };   /* sin²: bøyen kommer og går mykt */
    /* Svingen: vingene ruller kroppen. Ruller den mot høyre, strekkes venstre (ytre) vinge fram og litt opp, og høyre (indre) feies bakover og ned. */
    const sL = Object.assign({}, st, { ex: { di: st.ex.di + 0.05 * kr * km, fw: 0.12 * kr * km } }), sR = Object.assign({}, st, { ex: { di: st.ex.di - 0.09 * kr * km, fw: -0.24 * kr * km } });   /* vingene bøyes opp av lasten når den retter seg opp etter stupet */
    /* Løftet i vingeslaget, og et lite rykk fram på hvert nedslag der det går fort. */
    const hv = -cos(TAU * (us - 0.12)) * (A * 0.42 + Ah * 0.55), P = V(q.p[0], q.p[1], q.p[2]).addScaledVector(V(0, 0, 0).copy(u).lerp(Y, uf).normalize(), hv).addScaledVector(f, 0.3 * A * sin(TAU * (us - 0.3)) * (1 - uf));
    /* Det nye vingeslaget (ikke 'stiv'): samme stillinger og samme sving (ex), slaget fra flyriggen 2 og kroppen som gynger mot det. Den ytre vingen slår hardest inn i
       svingen og den indre ut av den: ruller den mot høyre (kr > 0), er venstre den ytre, så asym = −0,55 · kr (fortegnet var snudd før kontrollen 25.11). */
    let nw = null; if (!STIV()) { const n0 = p2 ? nbeat2(s, sp, uf) : nbeat(s, sp, uf), a = -0.55 * kr * km, kb = n0.kb || 0, wb = kb ? brakeW(st.w, kb) : st.w, xf = 0.42 * kb;   /* ar32: bremsen (vingene fram og spredt) */
      const nst = Object.assign(n0, { w: wb, ex: xf ? { di: sL.ex.di, fw: (sL.ex.fw || 0) + xf } : sL.ex, asym: a }), nsr = Object.assign({}, n0, { ex: xf ? { di: sR.ex.di, fw: (sR.ex.fw || 0) + xf } : sR.ex }), b = X.fly.body(nst, p2 ? nst.S : FSETS);
      nw = { st: nst, sR: nsr, b };
      /* del 2, aksenten: tre frosne bilder i bunnen av det tunge slaget: vingene og kroppens løft står (alt vingene får, fra bildet slaget traff), og tar igjen tiden på 0,3 s;
         banen, halen, isen og kameraet går videre */
      const fz = p2 && !nf ? X.freeze(s, [L.acc], 3, 0.3) : s; if (fz !== s) { const qz = perf(fz, T, 1); nw = { st: qz.nw.st, sR: qz.nw.sR, b: qz.nw.b }; }
      const bb = nw.b; P.set(q.p[0], q.p[1], q.p[2]).addScaledVector(V(0, 0, 0).copy(u).lerp(Y, uf).normalize(), bb.hv).addScaledVector(f, bb.sg * (1 - uf));
      /* del 2: rekylen fra Ice Beam (kroppen litt bakover), og i svevingen går kroppen i en ellipse (fram og tilbake i takt med slaget, ikke bare rett opp og ned) */
      if (p2) { const rc = nw.rc = recoil(s - BM.on); P.addScaledVector(f, -0.22 * rc * (1 - uf)).addScaledVector(V(sin(HYAW), 0, cos(HYAW)), 0.1 * uf * (bb.M.hv / 0.22) * sin(TAU * (bb.u - 0.05))); } }
    /* Brølet: den kaster seg litt opp og fram, og faller til ro. */
    const rr = p2 ? rr2(s) : s < L.roar ? 0 : kf(s, [[L.roar, 0], [L.roar + 0.25, 1, eo], [L.name + 0.3, 1], [L.name + 1.3, 0.2, io]]); P.y += 0.6 * (p2 ? kick2(s - L.roar - 0.033) : kick(s - L.roar)) - 0.35 * (p2 ? MANT(s - 0.033) : mt);   /* del 2: kroppen ett bilde etter hodet */
    /* Hodet: ser dit den flyr og holdes vannrett i svingene; under Ice Beam sikter det på punktet strålen treffer; i brølet løftes det. */
    const up0 = Y.clone().addScaledVector(f, -f.y).normalize(), l0 = V(0, 0, 0).crossVectors(up0, f), bank = Math.atan2(-u.dot(l0), u.dot(up0)), inRoll = mw ? sm5(seg(s, 19.95, 20.45)) * (1 - sm5(seg(s, 21.17, 21.72))) : sm5(seg(s, 20.18, 20.47)) * (1 - sm5(seg(s, 21.14, 21.43)));   /* hodets motrulling tones ut før rullen og inn etter (før av og på i ett bilde); ar33: roligere ut og inn */
    const gzN = p2 && P2('blikk'), ga = gzN ? null : sva(s + 0.12).a, lk = gzN ? gazeLk(s) : 0.26 * Math.tanh((ga[0] * l0.x + ga[1] * l0.y + ga[2] * l0.z) / 21) * (1 - uf);   /* hodet ser litt inn i svingen før kroppen (overlapp); del 2: i korte skift */
    let np = 1.25 * (1 - uf) + 0.12 * uf, nr = -bank * 0.82 * (1 - inRoll) * (1 - uf), ny = lk + (gzN ? GLANCE(s) : 0); if (mw) { const mh = MWH(s); ny = ny * (1 - mh) + GH(s) * mh; }   /* ar33: blikket holdes gjennom svingen */ const bw = kf(s, [[BM.on - 0.5, 0], [BM.on - 0.05, 1, io], [BM.end, 1], [BM.off + 0.5, 0, io]]);
    const bu = bmU(s), bp = bmP(bu), aim = V(bp[0], 0.2, bp[1]);
    if (bw > 0) { const d = aim.clone().sub(P).normalize(), lft = V(0, 0, 0).crossVectors(u, f), th = Math.atan2(d.dot(f), -d.dot(u)), psi = Math.asin(max(-1, min(1, d.dot(lft)))); np = mix(np, th, bw); ny = ny * (1 - bw) + psi * bw * 0.9; nr *= 1 - bw; }
    np += -0.14 * rr - 0.3 * mt;   /* i brølet skytes hodet fram mot oss (ansiktet skal synes, ikke haka); i forvarselet trekkes det ned */
    /* del 2: vingenes stilling ett og to bilder før (brølet: skuldrene først, underarmen og hånda etter), dirringen i stupet, rullens vridning og vippen (rekylen og vindkastet) */
    const wAt = (x, xo) => { const ux = UF(x), tx = max(TUCK(x), SWP(x), SWV(sp)) * (1 - ux), sx = STP(x) * (1 - ux), mx = MANT(x), ox = OPEN2(xo); return { glide: max(0, 1 - ux - tx - sx), tuck: tx, stoop: sx, rest: ux * (1 - ox) * (1 - mx), mant: ux * mx * (1 - ox), open: ux * ox }; };
    /* brølet: forvarselet slippes og vingene åpnes gruppe for gruppe (skuldrene ett bilde etter hodet, underarmen to, hånda tre); vinduet starter og slutter der alle gruppene står likt */
    const wD = p2 && s > 27.72 && s < 28.28 ? [wAt(s - 1 / 30, s), wAt(s - 2 / 30, s - 1 / 30), wAt(s - 3 / 30, s - 2 / 30)] : null, gu = nw && nw.st.gust;
    const rt = p2 ? sm5(seg(s, L.roar + 0.3, L.roar + 0.55)) * (1 - sm5(seg(s, L.name - 0.1, L.name + 0.4))) : 0; if (rt) np += 0.02 * rt * sin(TAU * 2.4 * s);   /* hodet dirrer også, litt */
    const xt = p2 ? { p2, wD, rt, trem: 2.0 * STP(s) * c01((sp - 18) / 12) * (1 - uf), ail: mw ? 0 : 8 * AIL(s) * (1 - uf), px: -0.06 * (nw ? nw.rc : 0) + 0.035 * (gu ? gu.nose : 0) } : null;
    return Object.assign({ s, P, f, u, sp, uf, st, sL, sR, kr, np, nr, ny, nw, lg: p2 ? 1 - uf - 1.15 * Math.pow(sin(PI * c01((s - 25.1) / 1.5)), 2) : 1 - uf - 0.35 * sin(PI * c01((s - 25.2) / 1.1)), jaw: max(0.42 * io(seg(s, BM.ch, BM.on)) * (1 - (p2 ? sm5(seg(s, BM.end - 0.02, BM.off + 0.1)) : seg(s, BM.end, BM.off))), 0.52 * rr), rr, aim, bw, A, Ah, us, mt }, xt); };
  /* Halen (Jazz 24.11: «Halen må være bevegelig slik som den er ment å være»): i modellen er den en rett, flat kniv med 19 ledd, og den er ment som et langt bånd
     («streamer») som blafrer og bølger bak den. Hvert ledd får en retning i verden og en vridning:
     · grunnlinja er banen den nettopp fløy (leddet peker dit kroppen var litt før), så halen legger seg i svingene, i stupet og i rullen
     · en loddrett bølge (båndet bøyes over flaten sin, som et flagg) går fra roten og ut i takt med vingeslagene, og en roligere bølge går hele tiden; utslaget vokser utover
     · en langsom sidelengs slyng, og båndet vrir seg langs lengden, så flaten synes også fra siden
     · tyngden drar den ned når det går sakte
     Når den står i lufta, henger halen i en S som i Gen 5-bildet (ned bak den, ut til siden og opp i spissen) og vaier; i bremsen svinger den fram under kroppen, og i brølet pisker den. */
  const tailDirs = (q, T, bd, t) => { const D = [], TW = [], s = q.s, sp = max(q.sp, 7), hang = max(q.uf, 1 - c01(q.sp / 6)), left = new T.Vector3().crossVectors(q.u, q.f), Y = new T.Vector3(0, 1, 0);
    const beat = c01(q.A / 0.5), calm = 1 - 0.55 * max(TUCK(s), STP(s)), phb = TAU * (PH(s) - 0.3), fh = new T.Vector3(sin(HYAW), 0, cos(HYAW)), lf = new T.Vector3(fh.z, 0, -fh.x);   /* fh: dit den vender når den står, lf: til siden (dens venstre, til høyre i bildet) */
    const swing = 0.9 * sin(PI * c01((s - 25.3) / 1.5)) * (s < 26.8 ? 1 : 0), kk = kick(s - L.roar), b = new T.Vector3(), n = new T.Vector3(), sd = new T.Vector3(), h = new T.Vector3();
    for (let k = 0; k < 19; k++) { const w = k / 18, env = Math.pow(w, 0.75) * calm, t0 = 0.07 + k * 0.94 / sp, t1 = 0.07 + (k + 1) * 0.94 / sp, pa = path(s - t0), pb = path(s - t1);
      b.set(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]); if (b.length() < 1e-3) b.copy(q.f).negate(); b.normalize();
      n.copy(q.u).addScaledVector(b, -q.u.dot(b)); if (n.length() < 0.2) n.copy(Y).addScaledVector(b, -b.y); n.normalize(); sd.crossVectors(b, n);
      const th = env * (0.66 * beat * sin(phb - 0.5 * k) + (0.34 + 0.1 * beat) * sin(4.6 * t - 0.42 * k + 1)), ps = env * (0.3 * sin(2.9 * t - 0.33 * k) + 0.13 * sin(6.1 * t - 0.7 * k + 2));
      const d = b.clone().multiplyScalar(cos(th) * cos(ps)).addScaledVector(n, sin(th)).addScaledVector(sd, sin(ps) * cos(th)); d.y -= (0.14 + 0.5 * (1 - c01(q.sp / 20))) * w * w;
      let tw = w * (0.5 + 0.95 * sin(1.25 * t - 2.4 * w)) * (1 - hang);
      if (hang > 0) { const a = 0.44 + 2.25 * Math.pow(w, 1.15) + 0.22 * sin(1.5 * t - 3 * w) + 0.3 * q.Ah * sin(TAU * (q.us - 0.25) - 2.2 * w) * w, sg = 1.0 * cos(PI * w * 1.15) + 0.18 * sin(1.15 * t - 2.6 * w);
        /* Når den står: ned bak den, ut til siden og tilbake igjen, og opp i spissen (en S, som i Gen 5-bildet), med flaten mot oss. */
        h.copy(Y).multiplyScalar(-cos(a)).addScaledVector(fh, -0.75 * sin(a)).addScaledVector(lf, sg * sin(a)).addScaledVector(fh, swing * (1 - w * 0.5) * sin(PI * min(1, w * 1.6)) - 1.1 * kk * w);
        d.lerp(h.normalize(), hang); tw += hang * w * 0.4 * sin(0.9 * t - 2 * w); }
      D.push(d.normalize()); TW.push(tw); }
    return [D, TW]; };
  /* Halen i del 2 (work/raids3d/research/lange_haler.md, REGLER del 4 «Articuno»; bryteren 'ghale' gir dagens). Grunnlinja er fortsatt banen kroppen nettopp fløy, med
     etterslep i meter, men:
     · rotpunktets faktiske bane med løftet i vingeslaget (b.hv), ikke en egen sinus: bølgen fra slaget går bakover med farten, roten følger relativvinden (atan(2π · f · h / U):
       noen grader), og utslaget vokser utover (tuppen rundt 3 × roten). Dagens hadde 38° fast ytterst.
     · tyngden er en rett, skrå linje, θ = atan((8 / U)^1,5), lik for alle ledd forbi roten (32° ved 11 m/s, 13° ved 21, 3° ved 53), ikke en krøll ytterst
     · livet er en langsom bølge som går bakover med 0,72 × farten (fasen per ledd 2π · f · Δs / (0,72 · U), så bølgelengden vokser med farten), mest i langsom flukt; over
       rundt 20 m/s flagrer tuppsonen (de siste 4 m) svakt på 2,4 Hz; i stupet er halen en rett strek som en komet
     · i rullen får hvert ledd kroppens «opp» fra da roten var der, så vridningen går ned halen som en korketrekker (dagens ruller hele båndet med kroppen)
     · i bremsen svinger den fram under kroppen og tilbake som en pendel med myk start (dagens sin(π · x) starter med full fart), og brølets rykk kommer sist (0,07 s etter skriket) */
  let TD2 = null;
  const hvAt = (x, sp, uf) => -X.fly.mix(KK2(x), uf, FSETS2, sp).hv * cos(TAU * (VB(x) + 0.38));   /* kroppens løft som en ren sinus i slaget (fasen uten warpen: vendingenes skift ga knekker ytterst i halen) */
  const upAt = (x, T) => { const g = sva(x), sp = hyp(g.v[0], g.v[1], g.v[2]) || 1, f = new T.Vector3(g.v[0] / sp, g.v[1] / sp, g.v[2] / sp), ld = 0.22 * (1 - UF(x)), ga = ld ? sva(x + ld).a : g.a;
    const u = new T.Vector3(ga[0], smax(ga[1] + GR + 3.5, 3), ga[2]); u.addScaledVector(f, -u.dot(f)); if (u.length() < 1e-3) u.set(0, 1, 0); u.normalize(); const ro = ROLLX(x); if (ro > 0 && ro < TAU) u.applyAxisAngle(f, ro); return u; };
  const tailDirs2 = (q, T, bd, t) => { if (TD2 && TD2.s === q.s) return TD2.r;
    const D = [], TW = [], s = q.s, sp = max(q.sp, 7), U = q.sp, hang = max(q.uf, 1 - c01(q.sp / 6)), Y = new T.Vector3(0, 1, 0), st = STP(s) * (1 - q.uf);
    const calm = 1 - 0.9 * st - 0.35 * TUCK(s) * (1 - q.uf), slow = 1 - 0.6 * c01((U - 10) / 30), fl = sm5(c01((U - 16) / 10)) * (1 - st), gth = Math.atan(Math.pow(8 / max(U, 4), 1.5)) * (1 - hang);
    const fh = new T.Vector3(sin(HYAW), 0, cos(HYAW)), lf = new T.Vector3(fh.z, 0, -fh.x), a2 = 0.72 * 0.72 * U * U, LT = 13.1, rL = Math.sqrt(a2 + 9.81 * LT);
    /* Bølgens fase ut langs halen: c(x) = √((0,72 · U)² + g · x) med x målt fra tuppen (en hengende kjede når det går sakte), integrert fra roten: φ(x0) = 2π · f · (2/g) · (√(a² + g · L) − √(a² + g · (L − x0))).
       Endelig også når den står i lufta, og den endrer seg rolig når farten faller (fasen 2π · f · x0 / (0,72 · U) fór av gårde i bremsen). */
    const phx = x0 => (2 / 9.81) * (rL - Math.sqrt(a2 + 9.81 * max(0, LT - x0)));
    const mt = q.p2 && MNV() ? MW(s) : 0;   /* ar33: manøveren i vingeoveren */
    const kb = KB(s), a8 = s - 26.8, swing = (0.9 + 0.35 * kb) * Math.pow(sin(PI * c01((s - 25.3) / 1.5)), 2) + (a8 > 0 ? 0.2 * sm5(c01(a8 / 0.3)) * Math.exp(-a8) * sin(TAU * 0.42 * a8) : 0), kk = kick2(s - L.roar - 0.07);   /* ar32: i bremsen svinger halen lenger fram og ned */
    const b = new T.Vector3(), b0 = new T.Vector3(), n = new T.Vector3(), sd = new T.Vector3(), h = new T.Vector3(), dn = new T.Vector3();
    const R = x => { const p = path(x), hv = hvAt(x, q.sp, q.uf); return [p[0] + q.u.x * hv, p[1] + q.u.y * hv, p[2] + q.u.z * hv]; };
    let ra = R(s - 0.07); const hu = q.nw ? q.nw.b.u : q.us, ah = q.nw ? 0.34 * c01(KK2(s) / 2.6) * q.uf : q.Ah;   /* når den henger: slaget fra det nye vingeslaget (dagens fase har en knekk i hver bunn) */
    for (let k = 0; k < 19; k++) { const w = k / 18, x0 = k * 0.69, t0 = 0.07 + k * 0.94 / sp, t1 = 0.07 + (k + 1) * 0.94 / sp, pa = path(s - t0), pb = path(s - t1), rb = R(s - t1);
      b0.set(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]); if (b0.length() < 1e-3) b0.copy(q.f).negate(); b0.normalize();
      b.set(rb[0] - ra[0], rb[1] - ra[1], rb[2] - ra[2]); if (b.length() < 1e-3) b.copy(b0); b.normalize(); ra = rb;
      b.sub(b0).multiplyScalar(1 + 2.2 * w).add(b0).normalize();   /* utslaget fra slaget vokser utover */
      const gk = gth * sm5(c01(k / 2)); if (gk > 0) { dn.set(0, -1, 0).addScaledVector(b, b.y); if (dn.length() > 1e-3) { dn.normalize(); b.multiplyScalar(cos(gk)).addScaledVector(dn, sin(gk)).normalize(); } }
      n.copy(upAt(s - t0, T)); n.addScaledVector(b, -n.dot(b)); if (n.length() < 0.2) n.copy(Y).addScaledVector(b, -b.y); n.normalize(); sd.crossVectors(b, n);
      const env = Math.pow(w, 0.75) * calm, pf = TAU * phx(x0), ph = 0.73 * pf, tz = c01((w - 0.68) / 0.32);   /* pf = 2π · (tiden bølgen bruker fra roten hit) */
      const th = env * slow * 0.36 * sin(4.6 * t - ph + 1) + fl * tz * 0.12 * calm * sin(TAU * 2.4 * t - 2.4 * pf + 0.7);
      const tr = mt ? TRN(s - 0.08 - 0.45 * w) : 0;   /* ar33: svingen går ned båndet (roten først, tuppen 0,45 s etter) */
      const ps = env * slow * (0.24 * sin(2.9 * t - 0.63 * ph) + 0.08 * sin(6.1 * t - 1.33 * ph + 2)) + fl * tz * 0.06 * calm * sin(TAU * 1.9 * t - 1.9 * pf + 2.2) + mt * 0.38 * tr * Math.pow(w, 1.2);   /* ar33: slynges ut i svingen */
      const d = b.clone().multiplyScalar(cos(th) * cos(ps)).addScaledVector(n, sin(th)).addScaledVector(sd, sin(ps) * cos(th));
      let tw = w * (0.5 + 0.95 * sin(1.25 * t - 2.4 * w)) * (1 - hang) * (0.55 + 0.45 * slow) * (1 - 0.7 * st) - mt * 1.25 * tr * sm5(c01(w * 1.4));   /* ar33: og vris inn i svingen */
      if (hang > 0) { const a = 0.44 + 2.25 * Math.pow(w, 1.15) + 0.22 * sin(1.5 * t - 3 * w) + 0.3 * ah * sin(TAU * (hu - 0.25) - 2.2 * w) * w, sg = (1.0 + 0.5 * kb) * cos(PI * w * 1.15) + 0.18 * sin(1.15 * t - 2.6 * w);   /* ar32: bremsen sprer båndet ut til siden */
        h.copy(Y).multiplyScalar(-cos(a)).addScaledVector(fh, -0.75 * sin(a)).addScaledVector(lf, sg * sin(a)).addScaledVector(fh, swing * (1 - w * 0.5) * sin(PI * min(1, w * 1.6)) - 1.1 * kk * w);
        d.lerp(h.normalize(), hang); tw += hang * w * (0.4 * sin(0.9 * t - 2 * w) + 1.1 * kb * sm5(c01(w * 1.4))); }   /* ar32: og vrir det flatt mot lufta */
      D.push(d.normalize()); TW.push(tw); }
    TD2 = { s, r: [D, TW] }; return TD2.r; };
  const pose = (g, bd, q, T, t) => { neckW(q.uf);
    if (q.nw) { const b = q.nw.b, lf = new T.Vector3().crossVectors(q.u, q.f), pk = q.p2 ? 1 - 0.2 * q.uf : 1 - 0.5 * q.uf, px = q.px || 0, nose = b.pt * pk + px;   /* ny: kroppen vipper litt i slaget, og hodet står (nakken tar gyngingen); del 2: mer vipp i svevingen, rekylen og vindkastene */
      bd.begin().place(q.P, q.f.clone().applyAxisAngle(lf, -nose), q.u.clone().applyAxisAngle(lf, -nose), SC); bd.q0 = g.root.quaternion.clone();
      /* Forvarselet og brølet (godkjent) er dagens: der slaget står stille (27,2 til F0E), står vingene som i dag, med dagens fold i den frosne fasen (rw tones inn og ut).
         Rettet etter kontrollen 25.11: blandingen går mot dagens faktiske vinger (med dagens siste slag som dør ut, og fasen som stanser mykt) og er ferdig før styrken faller
         (26,9–27,15): det nye slaget foldet seg ut når styrken falt (folden følger styrken), og hånda slo 11–13° fram og tilbake på 0,2 s (0:29,93–0:30,10; dagens ±1,5°). */
      /* Del 2 (ar32; Jazz 25.11: «Føler verken landingen … og noen bevegelser ikke er forskjellig i det hele tatt»): de nye vingene også i forvarselet og brølet (rw = 0), med
         rekkefølgen og tidene som før: skuldrene, underarmen og hånda ett, to og tre bilder etter hodet (q.wD), og liv i holdet (life). */
      const rw = q.p2 ? 0 : sm5(seg(q.s, 26.9, 27.15)) * (1 - sm5(seg(q.s, F0E - 0.2, F0E + 0.6))), wg = k => { const s0 = k ? q.nw.sR : q.nw.st, Pn = bd.beat(s0, k);
        if (q.p2 && q.wD) q.wD.forEach((w, j) => { const Pd = bd.beat(Object.assign({}, s0, { w }), k); for (const c of ['fw', 'di', 'tw']) for (let i = 2 * j; i < 2 * j + 2; i++) Pn[c][i] = Pd[c][i]; });
        if (rw <= 0) return life(Pn, k, q);
        const o0 = k ? q.sR : q.sL, ov = q.s < 27.5 ? { u: q.s < VA1 ? X.bird.warp(VB(q.s) + 0.56, 0.56) : UFZ } : { A: 0, Ah: 0, u: UFZ }, Po = bd.pose(Object.assign({}, o0, ov), k);   /* dagens vinger, med fasen som stanser mykt */
        if (q.wD) q.wD.forEach((w, j) => { const Pd = bd.pose(Object.assign({}, o0, ov, { w }), k); for (const c of ['fw', 'di', 'tw']) for (let i = 2 * j; i < 2 * j + 2; i++) Po[c][i] = Pd[c][i]; });   /* del 2: skuldrene, underarmen og hånda hver sitt bilde */
        for (const c of ['fw', 'di', 'tw']) Pn[c] = Pn[c].map((v, i) => mix(v, Po[c][i], rw)); return life(Pn, k, q); };
      bd.wings(wg(0), wg(1)); (q.p2 ? bd.neck2(q.np, q.nr, q.ny, q.uf, 1 - q.bw) : bd.neck(q.np, q.nr, q.ny)).hold(b, null, SC, q.uf, pk, px); if (q.p2) bd.nlim(); bd.legs(q.lg); }   /* hodet holder vinkelen mot den vippen kroppen faktisk får; del 2 (ar32): nakkens form og grense */
    else { bd.begin().place(q.P, q.f, q.u, SC); bd.q0 = g.root.quaternion.clone(); bd.wings(bd.pose(q.sL, 0), bd.pose(q.sR, 1)).neck(q.np, q.nr, q.ny).legs(q.lg); }
    { const td = q.p2 && P2('hale') ? tailDirs2(q, T, bd, t) : tailDirs(q, T, bd, t); bd.tail(td[0].map(v => bd.local(v)), td[1]); }
    g.add({ Jaw: [0, -q.jaw, 0] }, 1); g.eye(0, q.rr > 0.4 ? 0.75 : (t % 3.7 < 0.1 ? 0.5 : 0)); };
  BIRD.tail2 = (s, T) => { TD2 = null; return tailDirs2(perf(s, T), T, null, s + CO); };   /* til verktøyene: halens retninger i del 2 */
  BIRD.pose = (g, bd, q, T, t) => pose(g, bd, q, T, t); BIRD.neckW = neckW;   /* til fuglelaben (work/g3d/www/fuglelab.js): neckW(uf) setter nakken og brystfjærene som filmen */
  /* Vingespissene på tiden s uten å stille figuren (til glitteret og strekene): kroppen pluss vingens vinkel i slaget. */
  const tipAt = (s, sd) => { const q = pva(s), sp = hyp(q.v[0], q.v[1], q.v[2]) || 1, fx = q.v[0] / sp, fz = q.v[2] / sp, an = AMP(s) * (1.3 * cos(TAU * (X.bird.warp(PH(s), 0.56) - 0.19))), r = 5.9;
    return [q.p[0] + sd * fz * r * cos(an), q.p[1] + r * sin(an) - 0.3, q.p[2] - sd * fx * r * cos(an)]; };
  /* Den nye spissbanen (til glitteret og snømisten): slaget fra skulderen med spissens lille etterslep, lasten som bøyer den opp, og foldingen som trekker den inn i oppslaget. */
  const tipAt2 = (s, sd) => { const q = pva(s), sp = hyp(q.v[0], q.v[1], q.v[2]) || 1, fx = q.v[0] / sp, fz = q.v[2] / sp, st = nbeat(s, sp, UF(s)), u = X.fly.phase(st, FSETS), M = X.fly.mix(st.k, st.hov, FSETS, sp), ul = u - M.lag;
    const an = (M.el * X.fly.E(ul, M.rv) + M.em + M.curl * X.fly.ld(ul)) * PI / 180, r = 5.9 * (1 - 0.3 * min(0.85, M.fold) * X.fly.fb(u));
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
float frz(vec2 w, out float ag, out float sc){ float d = -1e3, sw = 1e-4, ss = 0.; ag = 0.; sc = 1.;
  for (int i = 0; i < ${NT - 1}; i++) { vec4 A = uTrk[i], B = uTrk[i + 1]; if (uTime <= A.z) continue; vec2 ab = B.xy - A.xy, aw = w - A.xy;
    float hm = clamp((uTime - A.z) / (B.z - A.z), 0., 1.), h = clamp(dot(aw, ab) / dot(ab, ab), 0., hm), a = uTime - mix(A.z, B.z, h);   /* sporet ender ved fuglen (ingen rett kant foran den) */
    vec2 pq = aw - ab * h; float dl = length(pq), lat = abs(dot(pq, normalize(vec2(-ab.y, ab.x)))), pen = (dl - lat) * 2.;
    /* Avsmalningen (Jazz 24.11: «en klar strek der det starter»): sporet begynner som et punkt og vider seg ut over de første 26 m langs banen (A.w = lengden fram til A). */
    float al = A.w + h * length(ab), tp = smoothstep(0., 26., al + (vn(w * .19) - .5) * 10.), ga = a * tp * (.55 + .9 * vn(vec2(al * .072, 3.1)));   /* ujevn vekst langs sporet */
    /* Hodet på sporet er tre streker: halen (hel), og vingespissene der de stryker vannet i bunnen av hvert nedslag (uBeat: slagets fase i filmens tid). De vokser sammen til kilen. */
    float tch = exp(-pow((fract((mix(A.z, B.z, h) - uBeat.x) * uBeat.y + .56) - .56) / .19, 2.));
    float q = max(max((.45 + ga * 5.) - lat, (-1.4 + 2.2 * tch + ga * 6.) - abs(lat - 5.4)) - pen, min(36., ga * 13. - 3.5) - dl); if (q > d) { d = q; ag = q / 12.; }
    float wk = exp(clamp(q / 4., -30., 30.)); sw += wk; ss += wk * (.45 + ga * 5.); }   /* sc: et mykt snitt over stykkene, så støyens utslag aldri hopper */
  if (uFR.w > 0.) { float q = uFR.z - length(w - uFR.xy); if (q > d) { d = q; ag = q / 55.; } float wk = exp(clamp(q / 4., -30., 30.)); sw += wk; ss += wk * uFR.z * .3; }
  float sh = length(w) - (uRL - 10.); if (sh > d) { d = sh; ag = 9.; } { float wk = exp(clamp(sh / 4., -30., 30.)); sw += wk; ss += wk * 9.; } sc = ss / sw;
  if (uAll > .5) { d = 99.; ag = 9.; }
  return d; }
void main(){ vec2 w = vW.xz; float t = uTime, fw = max(length(dFdx(w)), length(dFdy(w))), lod = 1. - smoothstep(.2, 1.2, fw), ag;
  vec4 fn = texture2D(tFern, w / 30.); float sc, fd = frz(w, ag, sc);
  /* Fronten bukter seg i store tunger med fliker (domenevridd støy), med utslag etter størrelsen på det som fryser: de ferske strekene står rene, kilen og ringen får tunger. */
  vec2 wq = w + (vec2(fbm(w * .043 + 1.7), fbm(w * .043 + 8.3)) - .47) * 34.; float nz = (fbm(wq * .075) - .47) * 24. + (fbm(w * .17 + 2.) - .47) * 12. + (fbm(w * .52 + 4.) - .47) * 5.;
  fd += (nz * clamp((sc - .45) / 5., .02, 1.) + (fn.g - .06) * 4.5 + fn.r * 2.2 * clamp((sc - .45) / 3., 0., 1.)) * (1. - uAll);   /* rimnålene stikker ut av fronten */
  vec3 V = normalize(cameraPosition - vW), col; float rl = length(w);
  if (fd < 0.) {
    vec3 N = normalize(vec3((vn(w * 1.1 + vec2(t * .5, t * .2)) - .5) * .07 + (vn(w * 3.7 - t * .6) - .5) * .035 * lod, 1., (vn(w * 1.1 + 5. - vec2(t * .3, t * .45)) - .5) * .07 + (vn(w * 3.7 + 9. + t * .5) - .5) * .035 * lod));
    float fr = pow(1. - max(dot(N, V), 0.), 4.) * .92 + .05; vec3 R = reflect(-V, N); R.y = abs(R.y) + .002;
    col = mix(vec3(.02, .036, .072), refl(w, R), fr);
    col = mix(col, uFoamC * .9, max((1. - smoothstep(0., 2.4, -fd)) * .16 * vn(w * .7), fn.r * (1. - smoothstep(.5, 6., -fd)) * .8) * (1. - smoothstep(.6, 2.6, fw)));   /* rimnålene vokser ut i vannet; ingen hvit stripe */
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
    /* Ytterst er isen tynn og nesten svart (vannet synes gjennom), med rimnålene hvite oppå; den blir hvit innover. Så fronten er en overgang, ikke en strek. */
    float thin = (1. - smoothstep(0., 4., fd + (fn.g - .25) * 2.5 + (vn(w * .5) - .5) * 2.)) * (1. - uAll);
    vec3 blk = mix(vec3(.03, .045, .09), refl(w, R), fr * .7) + uShal * .06;
    col = mix(col, mix(blk, uFoamC * .95, fn.r * .75), thin * .72);
  }
  /* Ice Beam-sporet: en hvit stripe av bregnefrost der strålen har gått, og et blått lys i det ferskeste. */
  if (uBK.y > 0.) { vec2 a = uBA.xy, b = mix(uBA.xy, uBA.zw, uBK.x), ab = b - a; float h = clamp(dot(w - a, ab) / max(dot(ab, ab), 1e-4), 0., 1.), bd = length(w - a - ab * h) + (fbm(w * .45) - .5) * 1.6 - fn.g * 1.8;
    float bd0 = length(w - a - ab * h), kc = .35 + .65 * smoothstep(6., 26., length(cameraPosition.xz - w));   /* nær kameraet svakere: ikke en hvit kile når den går forbi */
    col = mix(col, uFoamC * .96, max((1. - smoothstep(.15, 1.5, bd)) * .5, fn.r * (1. - smoothstep(1.2, 6.5, bd0)) * .5) * uBK.y * kc); col += vec3(.35, .7, 1.) * exp(-bd0 * bd0 * .9) * uBK.z * (1. - smoothstep(0., 5., length(w - b))) * .35 * kc; }
  /* Snøkrystallen under plassen: seks armer med grener, som vokser ut fra midten. */
  if (uMark.w > 0.) { vec2 dv = w - uMark.xy; float Lm = length(dv), an = atan(dv.y, dv.x), sa = abs(fract(an * .95493 + .5) - .5) * 1.0472, u = Lm * cos(sa), la = Lm * sin(sa);
    float arm = (1. - smoothstep(.1, .34, la)), br = (1. - smoothstep(.06, .22, abs(la - fract(u * .55) * 1.25))) * step(la, u * .34) * step(1.2, u);
    float in1 = 1. - smoothstep(uMark.z * .92, uMark.z, Lm); col = mix(col, uFoamC * .97, max(arm, br * .8) * in1 * uMark.w * .8 * (1. - smoothstep(1., 3., fw)));
    col = mix(col, uFoamC * .97, (1. - smoothstep(.0, 1.3, Lm)) * uMark.w * .8); }
  if (uStar.w > 0.) { vec2 dv = w - uStar.xy; float Ls = length(dv), an = atan(dv.y, dv.x), ray = pow(abs(sin(an * 3.5 + vn(vec2(Ls * .6, an * 2.)) * 2.5)), 40.); col += uFoamC * ray * (1. - smoothstep(uStar.z * .9, uStar.z, Ls)) * uStar.w * lod; }
  float rg = 0.; for (int i = 0; i < 4; i++) { vec4 g = uRing[i]; if (g.w > 0.) rg = max(rg, g.w * (1. - smoothstep(0., .5 + g.z * .05, abs(length(w - g.xy) - g.z)))); } col += uFoamC * rg * .4;
  col = mix(col, uFoamC * (.8 + .14 * fbm(w * .2)), smoothstep(uRL - 5., uRL + 1., rl + (fbm(w * .2 + 2.) - .5) * 5.));
  gl_FragColor = vec4(mix(col * uBri, uFogC, fogK(vW)), 1.); }`;
  /* ---------- Del 2 (REGLER del 4 «Articuno»; bryteren 'geff' gir dagens): himmelen og innsjøen som egne shadere ved siden av dagens, så dagens er urørt piksel for piksel
     (et ledd som ganges med 0 i samme shader ga avvik på 1–2 nivåer i enkelte piksler: kompilatoren ordner regnestykkene annerledes). Uniformene er de samme. ----------
     · himmelen: en svak 22°-ring rundt sola i den kalde disen (research/is_sno_vind_lyn.md 10), rødlig og skarp innerst, hvitblå og myk utenfor; styrken uSkyK.z
     · innsjøen: nålene først (is_sno_vind_lyn.md 1–3: domenevridd støy leses som blekk, nåler først leses som is): tynne isnåler skyter ut i vannet foran fronten, og fronten bak
       dem har mindre tunger; styrken uSkyK.w */
  const SKY2 = SKY.replace('  vec3 c = mix(b, a, sw); float sd = max(dot(normalize(d), normalize(uSun)), 0.); return min(c + vec3(1., .72, .55) * (pow(sd, 6.) * .1 + pow(sd, 70.) * .1), vec3(.96, .8, .74)); }',
    `  vec3 c = mix(b, a, sw); float sd = max(dot(normalize(d), normalize(uSun)), 0.), ha = acos(clamp(dot(normalize(d), normalize(uSun)), -1., 1.));
  vec3 hl = uSkyK.z * (vec3(1., .78, .66) * exp(-pow((ha - .382) / .006, 2.)) + vec3(.86, .9, 1.) * .55 * exp(-pow((ha - .395) / .016, 2.))) * smoothstep(-.01, .04, e);
  return min(c + vec3(1., .72, .55) * (pow(sd, 6.) * .1 + pow(sd, 70.) * .1) + hl, vec3(.96, .8, .74)); }`);
  const swap = (src, a, b) => { if (src.split(a).length !== 2) throw new Error('c3:144 del 2: fant ikke «' + a.slice(0, 40) + '» én gang'); return src.replace(a, () => b); };
  const DOME_F2 = swap(DOME_F, SKY, SKY2);
  const LAKE_F2 = swap(swap(swap(LAKE_F, SKY, SKY2), '   /* rimnålene stikker ut av fronten */', '   /* rimnålene stikker ut av fronten */\n  fd -= .55 * uSkyK.w * nz * clamp((sc - .45) / 5., .02, 1.) * (1. - uAll);   /* del 2: mindre tunger i fronten */'),
    '   /* rimnålene vokser ut i vannet; ingen hvit stripe */', `   /* rimnålene vokser ut i vannet; ingen hvit stripe */
    /* Del 2 (uSkyK.w; research/is_sno_vind_lyn.md 1–3: domenevridd støy leses som blekk, nåler først leses som is): rette, tynne isnåler skyter ut i vannet foran fronten i
       tre retninger 60° fra hverandre (hver stripe brutt i nåler med hull imellom, hver nål med sin egen rekkevidde), og fronten bak dem har mindre tunger. 0 = dagens. */
    if (uSkyK.w > 0.) { float nd = 0.; for (int k = 0; k < 3; k++) { float a = float(k) * 1.0472 + .35 + .6 * vn(w * .02 + float(k)), ca = cos(a), sa = sin(a); vec2 dr = vec2(ca, sa);
        float p = dot(w, vec2(-sa, ca)) / 1.7, pc = floor(p), r1 = h21(vec2(pc, float(k) * 7.1 + 1.3)), r2 = h21(vec2(pc + 3.3, float(k) * 2.9 + .7)), lp = abs(fract(p) - (.15 + .7 * r1)) * 1.7;
        float al = dot(w, dr) / (3. + 5. * r2) + r1 * 5., sg = fract(al), on = smoothstep(0., .06, sg) * (1. - smoothstep(.55, .62, sg)), reach = 1.5 + 5.5 * fract(r2 * 7.3 + floor(al) * .37);
        nd = max(nd, (1. - smoothstep(.025 + fw * .5, .06 + fw, lp)) * on * (1. - smoothstep(reach * .5, reach, -fd))); }
      col = mix(col, uFoamC * .92, nd * .65 * uSkyK.w * (1. - smoothstep(.5, 2., fw))); }`);
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
  float pu = .82 + .18 * sin(vY * uL * .9 - uTime * 30.), ends = smoothstep(0., .015, vY) * (1. - smoothstep(.985, 1., vY)), nr = .05 + .95 * smoothstep(12., 55., length(vW - cameraPosition));
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
    /* Del 2: himmelen og innsjøen med ringen rundt sola og isnålene (egne shadere med de samme uniformene; act velger etter bryteren). Bare i filmen. */
    if (!o.all) { S.dome2 = add(new T.Mesh(S.dome.geometry, K.shader(DOME_V, DOME_F2, S.dome.material.uniforms, { side: T.BackSide, depthWrite: false }))); S.dome2.renderOrder = -10; S.dome2.visible = false;
      S.lake2 = add(new T.Mesh(S.lake.geometry, K.shader(null, LAKE_F2, S.lake.material.uniforms, { depthWrite: false }))); S.lake2.renderOrder = -5; S.lake2.visible = false; }
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

  /* Ice Beam i 2D oppå bildet (Jazz 24.11: «ikke tydelig nok fra munnen»; filmen Pokémon 2000): små frostlyn som spriker fra munnen fram langs strålen (aldri bakover
     over hodet), og en spiral av rim som går i skrue fra nebbet til isen. Målene følger hvor stor en meter er ved nebbet, så det står i forhold til fuglen. */
  const beamFx = (S, s, t) => { const b = S.bfx; if (!b || b.a < 0.02) return; const g = C.g, O = b.O, I = b.I, o = K.proj(O.x, O.y, O.z), e = K.proj(I.x, I.y, I.z); if (o.z >= 1) return;
    const m1 = K.proj(O.x, O.y + 1, O.z), pm = max(2, hyp(m1.x - o.x, m1.y - o.y)); let dx = e.x - o.x, dy = e.y - o.y; const dl = hyp(dx, dy) || 1; dx /= dl; dy /= dl; const nx = -dy, ny = dx;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    /* Frostlynene: fem takkete streker fra like foran nebbet, innenfor ±45° av strålen; nye ti ganger i sekundet. */
    const A = b.a, sd = floor(t * 10), nk = 5;
    for (let k = 0; k < nk; k++) { const an = Math.atan2(dy, dx) + (rnd(k, sd) - 0.5) * 1.6, len = pm * (1.0 + 2.0 * rnd(k, sd + 7)); let x = o.x + dx * pm * 0.35, y = o.y + dy * pm * 0.35; const pts = [[x, y]];
      for (let j = 1; j <= 5; j++) { const a2 = an + (rnd(k * 9 + j, sd + 3) - 0.5) * 1.5; x += cos(a2) * len / 5; y += sin(a2) * len / 5; pts.push([x, y]); }
      for (const [lw, al] of [[2.6, 0.16], [1.0, 0.75]]) { g.strokeStyle = `rgba(214,240,255,${al * A})`; g.lineWidth = lw; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) g.lineTo(pts[j][0], pts[j][1]); g.stroke(); } }
    /* Spiralen: små glimt i skrue rundt strålen, fra nebbet og utover (forsiden lysere enn baksiden). */
    if (e.z < 1) { const L2 = hyp(e.x - o.x, e.y - o.y);
      for (let k = 0; k < 34; k++) { const u = ((k / 34 + t * 0.8) % 1), ph = u * 6.5 * TAU - t * 13, fr = 0.5 + 0.5 * cos(ph), w = pm * 1.05 * (0.45 + 0.55 * u), x = o.x + dx * L2 * u + nx * w * sin(ph), y = o.y + dy * L2 * u + ny * w * sin(ph);
        if (x < -20 || x > 532 || y < -20 || y > 404) continue; const al = (0.12 + 0.5 * fr) * b.a * c01(u * 8) * (1 - c01((u - 0.85) / 0.15)), hl = (1.5 + 2.5 * fr) * min(2, pm / 6), tx = dx * 0.35 + nx * cos(ph) * 0.94, ty = dy * 0.35 + ny * cos(ph) * 0.94, tl = hyp(tx, ty) || 1;
        g.strokeStyle = `rgba(236,248,255,${al})`; g.lineWidth = 0.5 + 0.8 * fr; g.beginPath(); g.moveTo(x - tx / tl * hl, y - ty / tl * hl); g.lineTo(x + tx / tl * hl, y + ty / tl * hl); g.stroke(); } }   /* korte streker langs skruen, ikke perler */
    /* Is og snø i selve strålen (Jazz 24.11: «ha gjerne mer is, snø osv i selve beam»): iskrystaller og snøfnugg som strømmer fra nebbet mot treffet i 3D-perspektiv (større nær
       kameraet), og frostrøyk som damper av strålen. Punktene regnes i verden langs strålen og projiseres, så de står i strålen også når den peker mot oss. */
    { const D3 = I.clone().sub(O), Ln = D3.length() || 1, dn = D3.clone().multiplyScalar(1 / Ln), n1 = Math.abs(dn.y) < 0.9 ? new S.T.Vector3(0, 1, 0).cross(dn).normalize() : new S.T.Vector3(1, 0, 0).cross(dn).normalize(), n2 = dn.clone().cross(n1), P3 = new S.T.Vector3();
      const at3 = (u, ph, rr) => { P3.copy(O).addScaledVector(D3, u).addScaledVector(n1, cos(ph) * rr).addScaledVector(n2, sin(ph) * rr); const q = K.proj(P3.x, P3.y, P3.z); if (q.z >= 1) return null; const q1 = K.proj(P3.x, P3.y + 1, P3.z); return [q.x, q.y, max(0.5, hyp(q1.x - q.x, q1.y - q.y))]; };
      for (let k = 0; k < 26; k++) { const u = 0.08 + 0.9 * ((rnd(k, 71) + t * 0.12) % 1), q = at3(u, rnd(k, 72) * TAU + t * 0.7, 0.9 + 1.4 * rnd(k, 73)); if (!q) continue; const r = q[2] * (1.1 + 1.6 * rnd(k, 74)); if (r < 1.5 || q[0] < -r || q[0] > 512 + r || q[1] < -r || q[1] > 384 + r) continue;
        const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); gr.addColorStop(0, `rgba(226,236,255,${0.1 * b.a})`); gr.addColorStop(1, 'rgba(226,236,255,0)'); g.fillStyle = gr; g.fillRect(q[0] - r, q[1] - r, r * 2, r * 2); }   /* frostrøyken som damper av strålen */
      for (let k = 0; k < 110; k++) { const sp = 1.2 + 1.3 * rnd(k, 62), u = ((rnd(k, 61) + t * sp) % 1), q = at3(u, rnd(k, 63) * TAU + t * (2 + 3 * rnd(k, 64)), (0.15 + 0.85 * Math.sqrt(rnd(k, 65))) * 0.6 * (0.55 + 0.45 * u)); if (!q) continue;
        const r = q[2] * (0.06 + 0.16 * rnd(k, 66)), al = (0.45 + 0.5 * rnd(k, 67)) * b.a * c01(u * 10); if (r < 0.35 || q[0] < -10 || q[0] > 522 || q[1] < -10 || q[1] > 394) continue;
        if (r > 1.6 && rnd(k, 68) > 0.4) { g.strokeStyle = `rgba(240,250,255,${al})`; g.lineWidth = max(0.6, r * 0.22); g.beginPath(); for (let j = 0; j < 3; j++) { const aa = j * PI / 3 + rnd(k, 69) * 2; g.moveTo(q[0] - cos(aa) * r, q[1] - sin(aa) * r); g.lineTo(q[0] + cos(aa) * r, q[1] + sin(aa) * r); } g.stroke(); }   /* iskrystall */
        else { g.fillStyle = `rgba(244,250,255,${al})`; g.beginPath(); g.arc(q[0], q[1], max(0.5, r * 0.6), 0, TAU); g.fill(); } } }   /* snøfnugg */
    g.restore(); };
  /* Anime-fartsstreker (etterbehandlingens spd) som går ut fra fuglen der den er i bildet, når den kommer mot kameraet. k = styrken. */
  const spdAt = (S, k) => { if (k <= 0.01 || !S.q) return; const P = S.q.P, q = K.proj(P.x, P.y, P.z); if (q.z >= 1) return; S.post.spd = k; S.post.spx = q.x / 2; S.post.spy = q.y / 2; S.post.spr = 0.32; };
  /* Kameraet (med lang sikt: fjellene står 1500 m unna), og kampens kamera slik X.arena stiller det inn (siktet dreies til plassen treffer (377, 198)). */
  const cam = (px, py, pz, tx, ty, tz, fov, roll) => { K.far(3200); K.cam(px, py, pz, tx, ty, tz, fov, roll); };
  /* Kameraets liv i del 2 (research/risting.md og rask_bevegelse.md; bryteren 'gkam' gir dagens): banene, linsene og zoomen er de godkjente; oppå kommer en vinkel i grader
     ganget med linsa (fov/45), så skjelvet er likt på skjermen uansett avstand, med det største utslaget i det tregeste laget (0,1–0,15 Hz) og ingen svaiing over 0,5° i
     kvalmebåndet 0,2–0,4 Hz. Lr = [[grader, Hz], …] etter den tenkte riggen: drone og helikopter glir (drift), en operatør på bakken har tre lag. w tones inn og ut
     (Ice Beam og kampens bilde står helt stille). Kameraet bobber aldri med vingeslaget: banene følger banen, ikke kroppen. */
  const CL = { drone: [[0.22, 0.1], [0.06, 0.45]], hand: [[0.3, 0.15], [0.12, 0.7], [0.04, 1.8]] };
  const camLv = (px, py, pz, tx, ty, tz, fov, roll, t, Lr, sd, w) => { if (!P2('kam') || !(w > 0)) return cam(px, py, pz, tx, ty, tz, fov, roll);
    const k = (fov || 40) / 45 * PI / 180 * w; let yw = 0, pt = 0; Lr.forEach(([a, hz], i) => { pt += a * X.noise(t, sd + 7 * i, hz); yw += 0.7 * a * X.noise(t, sd + 40 + 7 * i, 0.9 * hz); });
    const dx = tx - px, dz = tz - pz, d = hyp(dx, ty - py, dz) || 1, hh = hyp(dx, dz) || 1, sy = Math.tan(yw * k) * d;
    cam(px, py, pz, tx - dz / hh * sy, ty + Math.tan(pt * k) * d, tz + dx / hh * sy, fov, roll); };
  let endTg = null;
  const camEnd = () => { if (!endTg) { const tg = CAMB.tg.slice(), cp = CAMB.cp; for (let i = 0; i < 14; i++) { K.cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv); const q = K.proj(H[0], 0, H[2]); tg[0] -= (370 - q.x) * 0.1; tg[1] += (198 - q.y) * 0.1; } endTg = tg; } return endTg; };   /* 370, ikke 377: vingespissene skal være innenfor en smal skjerm (x under 448) */

  G3D.def('c3:144', {
    len: LEN, hold: 1, R: F(L.roar), at: -CO, fps: t => P2() && altv().indexOf('60') >= 0 && t > F(20.9) && t < F(22.35) ? 60 : 0,   /* del 2, forsøket '60' (research/rask_bevegelse.md 9): stupet mot kameraet i 60 bilder i sekundet (0 = 30, som i dag) */ mus: { bed: 'sfx/natur/articuno_intro.mp3' },   /* lydsengen følger filmens klokke (work/raids3d/articuno/lyd/bed.py) */ fig: 2, models: ['articuno'], edge: null, env: { rim: '#ffd0e6', glow: '#a8d0ff', fog: '#9978ad', glowH: 9, ink: '#141a3a' },
    make(K, T) { const S = { scene: new T.Scene(), figs: [], T }; place(K, T, S);
      const gl = K.model('articuno'), src2 = cloneSk(gl.scene);   /* kopien til speilbildet, før figuren tar over modellen */
      const g = S.gr = K.figure(gl); g.root.scale.setScalar(SC); S.scene.add(g.root); S.figs.push(g); S.bd = X.fly(g, BIRD);
      /* Speilbildet: samme skuespill, speilet om flaten (en gruppe med y = −1), i omgivelsenes lag. */
      { const f = S.rf = K.figure({ scene: src2, model: 'articuno' }), un = { uTint: K.uv(new T.Vector3(0.62, 0.62, 0.8)), uA: K.uv(0.8), uRL: K.uv(RL), uWob: K.uv(1) }; S.rfU = un;
        f.root.traverse(q => { if (!q.isMesh) return; const mp = q.material.uniforms && q.material.uniforms.map ? q.material.uniforms.map.value : null; q.material = K.shader(REFL_V, REFL_F, Object.assign({ map: K.uv(mp) }, un), Object.assign(K.blend.soft(), { depthWrite: true, side: T.DoubleSide })); q.layers.set(0); q.renderOrder = -3; q.frustumCulled = false; });
        f.root.scale.setScalar(SC); S.mir = new T.Group(); S.mir.scale.y = -1; S.mir.add(f.root); S.scene.add(S.mir); S.figs.push(f); S.rbd = X.fly(f, BIRD); }
      /* Sporet der vannet fryser: banen fra den retter seg opp lavt over vannet til aksenten. */
      { const tk = [3.9, 4.5, 5.2, 6.2, 7.4, 8.6, 9.8, 11.1, 12.5, L.acc]; let ln = 0, pp = null; S.lake.material.uniforms.uTrk.value.forEach((v, i) => { const p = path(tk[i]); if (pp) ln += hyp(p[0] - pp[0], p[2] - pp[2]); pp = p; v.set(p[0], p[2], F(tk[i]) + 0.05, ln); }); }   /* w: lengden langs sporet (avsmalningen fra starten) */
      /* Strålen (kjerne, glød, dis), og lyset i nebbet og der den treffer isen. */
      S.beam = [[0.2, '#ffffff', 1.25, 3, 0.12], [0.62, '#8ad0ff', 0.6, 1.6, 0.3], [1.35, '#4a8ee0', 0.16, 1, 0.15]].map(([r, c, a, e, p]) => { const geo = new T.CylinderGeometry(0.72, 0.55, 1, 18, 1, true); geo.translate(0, 0.5, 0);   /* nesten like tykk hele veien: enden er nær kameraet, og perspektivet gjør den bred nok */
        const m = new T.Mesh(geo, K.shader(BEAM_V, BEAM_F, { uC: K.uv(K.u3(c)), uA: K.uv(a), uL: K.uv(30), uP: K.uv(p), uE: K.uv(e) }, Object.assign(K.blend.add(), { side: T.DoubleSide })));
        m.userData.r = r; m.userData.a0 = a; m.frustumCulled = false; m.visible = false; S.scene.add(m); return m; });
      const glo = (c, nr) => { const m = K.pts(3, i => ({ p: [0, 0, 0], v: [0, 0, 0], b: 0, l: 1e9, z: [3.4, 1.7, 0.75][i] }), { add: 1, px: 120, c: [c, c, c], fade: 0.99, a: 0, near: nr }); S.scene.add(m); return m; };
      S.gMz = glo('#cfeeff', 0); S.gIm = glo('#bfe6ff', 14);
      /* Der strålen faktisk treffer (Jazz 24.11: «Frostrøyk og røyk skal også skje der strålen faktisk treffer»): isrusk og snø som spruter, et stort støt i første treff,
         frostrøyk og snømist som velter opp langs sporet etter hvert som den går, og det som spruter mot kameraet når den går forbi. Alt følger banen (bmP/bmT). */
      { const SP = [], dx = BB[0] - BA[0], dz = BB[1] - BA[1], px = -dz / BLEN, pz = dx / BLEN;
        for (let k = 0; k < 760; k++) { const first = k < 220, u = first ? 0 : rnd(k, 81) * UC, bp = bmP(u), sd = rnd(k, 82) > 0.5 ? 1 : -1, o = rnd(k, 83) * (first ? 2.5 : 1.2), a = rnd(k, 80) * TAU, sp = first ? 3 + rnd(k, 84) * 9 : 2 + rnd(k, 84) * 6;
          SP.push({ p: [bp[0] + (first ? cos(a) * o : px * sd * o), 0.3, bp[1] + (first ? sin(a) * o : pz * sd * o)], v: first ? [cos(a) * sp, 3 + rnd(k, 86) * 9, sin(a) * sp] : [px * sd * sp + (rnd(k, 85) - 0.5) * 2, 2.5 + rnd(k, 86) * 7, pz * sd * sp + (rnd(k, 87) - 0.5) * 2],
            b: bmT(u) - BM.on + rnd(k, 88) * (first ? BM.sw - BM.on + 0.1 : 0.08), l: 0.6 + rnd(k, 89) * 0.9, z: 0.12 + rnd(k, 90) * 0.32 }); }
        for (let k = 0; k < 110; k++) { const a = rnd(k, 231) * TAU, o = rnd(k, 232) * 2, sp = 4 + rnd(k, 233) * 11; SP.push({ p: [BA[0] + cos(a) * o, 0.3, BA[1] + sin(a) * o], v: [cos(a) * sp, 4 + rnd(k, 234) * 12, sin(a) * sp], b: rnd(k, 235) * 0.2, l: 0.7 + rnd(k, 236) * 0.9, z: 0.14 + rnd(k, 237) * 0.36 }); }   /* Jazz 24.11 om v5: mer i første treff */
        const cp = bmP(UC - 0.08); for (let k = 0; k < 90; k++) SP.push({ p: [cp[0] + (rnd(k, 91) - 0.5) * 2, 0.6 + rnd(k, 92) * 2, cp[1] + (rnd(k, 93) - 0.5) * 3], v: [2 + rnd(k, 94) * 6, 1.5 + rnd(k, 95) * 5, 3 + rnd(k, 96) * 8], b: BM.cam - BM.on - 0.06 + rnd(k, 97) * 0.1, l: 0.5 + rnd(k, 98) * 0.5, z: 0.06 + rnd(k, 99) * 0.14 });   /* mot kameraet og til høyre, der den går forbi */
        S.spray = K.pts(SP.length, i => SP[i], { t0: F(BM.on), g: 9.8, drag: 0.4, add: 1, px: 80, c: ['#ffffff', '#dff2ff', '#a8d0f0'], fade: 0.45, a: 0.85, near: 3 }); S.spray.frustumCulled = false; S.scene.add(S.spray);
        S.bmist = K.pts(600, k => { const first = k < 150 || k >= 520, u = first ? 0 : rnd(k, 101) * UC, bp = bmP(u), a = rnd(k, 100) * TAU, o = first ? rnd(k, 102) * 3 : 0, sp = first ? 1.5 + rnd(k, 104) * 4.5 : 0;
            return { p: [bp[0] + cos(a) * o + (first ? 0 : (rnd(k, 102) - 0.5) * 3), 0.4 + rnd(k, 110) * 0.8, bp[1] + sin(a) * o + (first ? 0 : (rnd(k, 103) - 0.5) * 3)], v: [cos(a) * sp + (rnd(k, 104) - 0.5) * 2, 0.6 + rnd(k, 105) * 1.6, sin(a) * sp + (rnd(k, 106) - 0.5) * 2],
              b: bmT(u) - BM.on + rnd(k, 107) * (first ? 0.35 : 0.15), l: 2.6 + rnd(k, 108) * 2.4, z: (first ? 2.6 : 2) + rnd(k, 109) * 3.4 + (k >= 520 ? 1 : 0) }; },
          { t0: F(BM.on), drag: 0.5, px: 160, sway: 0.4, c: ['#ebe5f7', '#cbc4e4', '#a69fca'], shade: 1, fade: 0.25, a: 0.11, sz0: 0.5, sz1: 1.9, near: 12 }); S.scene.add(S.bmist); }
      /* Isbiter som slynges opp av første treff (Jazz 24.11 om v5: «litt mer effekter»): 3D-biter i figurens piksler, som det som faller av hos de andre. */
      S.ishard = K.shards(18, i => { const a = rnd(i, 241) * TAU, o = rnd(i, 242) * 0.8, sp = 3 + rnd(i, 243) * 6; return { p: [BA[0] + cos(a) * o, 0.2, BA[1] + sin(a) * o], v: [cos(a) * sp, 4 + rnd(i, 244) * 6, sin(a) * sp],
        r: [(rnd(i, 245) - 0.5) * 18, (rnd(i, 246) - 0.5) * 18, (rnd(i, 247) - 0.5) * 18], s: rnd(i, 248), b: rnd(i, 249) * 0.12, l: 2.4, z: (0.07 + rnd(i, 250) * 0.08) * (i % 5 ? 1 : 1.5) }; }, { c: '#a9c2ef', grey: 0.3, em: 0.2, sy: 0.6, seed: 14 }); S.scene.add(S.ishard);
      /* Frostrøyken over det åpne vannet (faller sammen på aksenten), glitteret etter vingene, snøen som raser av tretoppene på 0:00, og isstøvet bremseslagene blåser utover. */
      S.smoke = K.pts(1100, i => { const a = rnd(i, 1) * TAU, r = Math.sqrt(rnd(i, 2)) * 122, sz = i % 3 ? [(rnd(i, 10) - 0.5) * 130, 20 + rnd(i, 17) * 100] : [cos(a) * r, sin(a) * r]; return { p: [sz[0], 0.15 + rnd(i, 3) * 0.7, sz[1]], v: [0.6 + rnd(i, 4) * 0.8, 0.25 + rnd(i, 5) * 0.55, -0.3 + rnd(i, 6) * 0.6], b: rnd(i, 7) * 9, l: 6 + rnd(i, 8) * 5, z: 1.6 + rnd(i, 9) * 3.2 }; },
        { loop: 1, px: 120, sway: 0.9, c: ['#f6dcea', '#e2d2ee', '#c4bae2'], fade: 0.3, a: 0.2, sz0: 0.45, sz1: 2.6, near: 6 }); S.scene.add(S.smoke);
      /* Glitteret etter vingespissene og snømisten der de stryker vannet: dagens etter dagens spissbane (S.trail, S.wmist), og det nye etter den nye (S.trail2, S.wmist2); bryteren velger i act. */
      for (const [key, tipF] of [['trail', tipAt], ['trail2', tipAt2]]) { const T0 = 3.5, T1 = 26.4, NTr = 1300; S[key] = K.pts(NTr, i => { const s0 = T0 + (T1 - T0) * (i / NTr), w = tipF(s0, i % 2 ? 1 : -1), c = path(s0), k = i % 5 === 0 ? 0 : 1;
          return { p: [mix(c[0], w[0], k) + (rnd(i, 21) - 0.5) * 1.6, mix(c[1], w[1], k) + (rnd(i, 22) - 0.5), mix(c[2], w[2], k) + (rnd(i, 23) - 0.5) * 1.6], v: [(rnd(i, 24) - 0.5) * 0.9, -0.3 - rnd(i, 25) * 0.4, (rnd(i, 26) - 0.5) * 0.9], b: s0 - T0, l: 2 + rnd(i, 27) * 2.4, z: 0.5 + rnd(i, 28) * 0.9 }; },
          { t0: F(T0), add: 1, px: 42, c: ['#ffffff', '#e2f2ff', '#bcd8ff'], fade: 0.45, a: 0.9 }); S.scene.add(S[key]); }
      S.burst = K.pts(380, i => { const big = i % 3 === 0, x = (rnd(i, 31) - 0.5) * 44, z = 152 + rnd(i, 32) * 36, y = terrH(x, z) + 19 + rnd(i, 33) * 11; return { p: [x, y, z], v: [(rnd(i, 34) - 0.5) * 8, 1.5 + rnd(i, 35) * 6, (rnd(i, 36) - 0.5) * 6 - 4.5], b: rnd(i, 37) * 0.35 + max(0, (182 - z) / 60) * 0.5, l: 2.8 + rnd(i, 38) * 2.4, z: big ? 12 + rnd(i, 39) * 16 : 2 + rnd(i, 39) * 5 }; },
        { t0: F(-0.42), g: 4.5, drag: 0.6, px: 96, c: ['#fff4fa', '#f0dcee', '#cabfe6'], fade: 0.25, a: 0.34, sz0: 0.45, sz1: 2.2 }); S.scene.add(S.burst);   /* snøen fra tretoppene: store, myke skyer (bildet har lang linse) og små klumper */
      /* Når innsjøen fryser (Jazz 24.11: «gjerne noe ekstra effekter»): en vegg av frostrøyk som rir på fronten (hver dott tennes når fronten når den) og glimt som
         spretter opp der den går. Fronten er ringen i act: radius 265 · (alder / 2,9)^1,08 fra der den var på aksenten. */
      { const c0 = path(L.acc), at = r => 2.9 * Math.pow(r / 265, 1 / 1.08), spot = (i, k) => { const a = rnd(i, k) * TAU, rr = Math.sqrt(rnd(i, k + 1)) * (RL - 4), x = cos(a) * rr, z = sin(a) * rr, r = max(1, hyp(x - c0[0], z - c0[2])); return [x, z, r, Math.atan2(z - c0[2], x - c0[0])]; };   /* jevnt over hele innsjøen; r = avstanden fra der fronten startet */
        S.fwall = K.pts(460, i => { const [x, z, r, a] = spot(i, 131), sp = 3 + rnd(i, 134) * 4; return { p: [x, 0.5 + rnd(i, 132) * 2, z], v: [cos(a) * sp, 2 + rnd(i, 133) * 3.5, sin(a) * sp], b: at(r) + rnd(i, 135) * 0.08, l: 1.2 + rnd(i, 136) * 1.0, z: 7 + rnd(i, 137) * 9 }; },
          { t0: F(L.acc), drag: 0.8, px: 200, sway: 0.4, c: ['#f6f2ff', '#e4def6', '#cfd6f2'], fade: 0.3, a: 0.3, sz0: 0.5, sz1: 2.0, near: 10 }); S.scene.add(S.fwall);
        S.fglint = K.pts(620, i => { const [x, z, r] = spot(i, 141); return { p: [x, 0.3, z], v: [(rnd(i, 142) - 0.5) * 2, 2 + rnd(i, 143) * 5, (rnd(i, 144) - 0.5) * 2], b: at(r) + rnd(i, 145) * 0.05, l: 0.4 + rnd(i, 146) * 0.6, z: 1.1 + rnd(i, 147) * 1.1 }; },
          { t0: F(L.acc), add: 1, px: 60, c: ['#ffffff', '#e6f6ff', '#c4e4ff'], fade: 0.5, a: 1, near: 4 }); S.scene.add(S.fglint); }
      /* Snømist og frostrøyk når ting skjer (Jazz 24.11: «mye mer snømist flere plasser … når ting skjer så blir det mer snømist», «frostrøyk ulike plasser»):
         · der vingespissene stryker vannet i bunnen av hvert nedslag lavt over sjøen, og frostrøyk som stiger av den ferske isen bak den
         · et stort støt av snømist under den i det tunge vingeslaget på aksenten, og snømist rundt den når den skriker like etter
         · ringen av snømist i brølet; lav frosttåke som driver over sjøen hele tiden (svak over det åpne vannet, tettere når isen har lagt seg) */
      for (const [key, tipF, on, dt] of [['wmist', tipAt, s0 => AMP(s0) >= 0.3, 0], ['wmist2', tipAt2, s0 => KK(s0) >= 1.5, 0.02]]) { const W = []; for (let k = 0; ; k++) { const s0 = B0 + k * HP; if (s0 > 11) break; if (s0 < 4.2 || !on(s0)) continue; for (const sd of [-1, 1]) { const w = tipF(s0 + dt, sd); for (let j = 0; j < 9; j++) W.push([s0, w[0], w[2], j, sd]); } }
        S[key] = K.pts(W.length + 340, i => { if (i < W.length) { const [s0, x, z, j] = W[i], a = rnd(i, 151) * TAU, sp = 1 + rnd(i, 152) * 2.5; return { p: [x + (rnd(i, 153) - 0.5) * 1.5, 0.3, z + (rnd(i, 154) - 0.5) * 1.5], v: [cos(a) * sp, 0.6 + rnd(i, 155) * 1.4, sin(a) * sp], b: s0 + 0.04 * j, l: 1.8 + rnd(i, 156) * 1.6, z: 2.2 + rnd(i, 157) * 3.6 }; }
            const s0 = 4 + rnd(i, 161) * 9.8, c = path(s0); return { p: [c[0] + (rnd(i, 162) - 0.5) * 6, 0.25, c[2] + (rnd(i, 163) - 0.5) * 6], v: [(rnd(i, 164) - 0.5) * 1.2, 0.4 + rnd(i, 165) * 1.1, (rnd(i, 166) - 0.5) * 1.2], b: s0 + 0.15 + rnd(i, 167) * 0.6, l: 2 + rnd(i, 168) * 1.8, z: 2.2 + rnd(i, 169) * 3.4 }; },   /* frostrøyk av den ferske isen */
          { t0: CO, drag: 0.6, px: 140, sway: 0.5, c: ['#ebe5f7', '#cbc4e4', '#a69fca'], shade: 1, fade: 0.3, a: 0.2, sz0: 0.5, sz1: 2.2, near: 6 }); S.scene.add(S[key]); }
      {
        const c0 = path(L.acc), c1 = path(L.acc + 0.35); S.amist = K.pts(380, i => { const a = rnd(i, 171) * TAU, cry = i >= 300, sp = cry ? 1 + rnd(i, 172) * 3 : 8 + rnd(i, 172) * 16, r = cry ? rnd(i, 173) * 3 : 1 + rnd(i, 173) * 4, cc = cry ? c1 : c0;   /* c1: der den er når den skriker */
            return { p: [cc[0] + cos(a) * r, cry ? cc[1] - 1.5 + rnd(i, 174) * 3 : 0.4 + rnd(i, 174) * 0.8, cc[2] + sin(a) * r], v: [cos(a) * sp, cry ? 0.5 + rnd(i, 175) * 1.5 : 0.8 + rnd(i, 175) * 2, sin(a) * sp], b: cry ? 0.3 + rnd(i, 176) * 0.25 : rnd(i, 176) * 0.15, l: 1.8 + rnd(i, 177) * 1.6, z: cry ? 3 + rnd(i, 178) * 4 : 4 + rnd(i, 178) * 7 }; },
          { t0: F(L.acc), drag: 1.3, px: 220, sway: 0.4, c: ['#ebe5f7', '#cbc4e4', '#a69fca'], shade: 1, fade: 0.25, a: 0.17, sz0: 0.5, sz1: 2.3, near: 8 }); S.scene.add(S.amist);   /* vingeslaget på aksenten (ringen på isen) og skriket (rundt den) */
        S.rmist = K.pts(320, i => { const a = rnd(i, 181) * TAU, r = 1 + rnd(i, 182) * 3, sp = 9 + rnd(i, 183) * 14; return { p: [H[0] + cos(a) * r, 0.4 + rnd(i, 184) * 0.8, H[2] + sin(a) * r], v: [cos(a) * sp, 0.6 + rnd(i, 185) * 1.8, sin(a) * sp], b: 0.04 + rnd(i, 186) * 0.18, l: 1.5 + rnd(i, 187) * 1.3, z: 4 + rnd(i, 188) * 6 }; },
          { t0: F(L.roar), drag: 1.4, px: 220, sway: 0.3, c: ['#ebe5f7', '#cbc4e4', '#a69fca'], shade: 1, fade: 0.25, a: 0.13, sz0: 0.6, sz1: 2.2, near: 10 }); S.scene.add(S.rmist);   /* ringen i brølet */
        S.fog = K.pts(170, i => { const a = rnd(i, 191) * TAU, r = Math.sqrt(rnd(i, 192)) * (RL + 10); return { p: [cos(a) * r, 0.4 + rnd(i, 193) * 2.2, sin(a) * r], v: [0.5 + rnd(i, 194) * 0.7, 0.03, -0.25 + rnd(i, 195) * 0.5], b: rnd(i, 196) * 18, l: 18, z: 12 + rnd(i, 197) * 16 }; },
          { loop: 1, px: 260, sway: 0.25, c: ['#efeaff', '#e0daf4', '#cdc8e6'], fade: 0.4, a: 0.05, sz0: 0.8, sz1: 1.3, near: 16 }); S.scene.add(S.fog); }   /* lav frosttåke */
      /* «Poff» i rullen (Jazz 24.11: «snø-ring-eksplosjon med mist rundt og bittebittelitt glitter i snøen»): en ring av snømist som blåses ut på tvers av flukten der den er på
         slaget 20,50 (den flyr ut av ringen), mist rundt, og litt glitter. */
      { const q = pva(POFF), sp0 = hyp(q.v[0], q.v[1], q.v[2]) || 1, f = [q.v[0] / sp0, q.v[1] / sp0, q.v[2] / sp0], a0 = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        const e1 = [a0[1] * f[2] - a0[2] * f[1], a0[2] * f[0] - a0[0] * f[2], a0[0] * f[1] - a0[1] * f[0]], l1 = hyp(e1[0], e1[1], e1[2]); e1[0] /= l1; e1[1] /= l1; e1[2] /= l1;
        const e2 = [f[1] * e1[2] - f[2] * e1[1], f[2] * e1[0] - f[0] * e1[2], f[0] * e1[1] - f[1] * e1[0]], dir = (a, k) => [e1[0] * cos(a) + e2[0] * sin(a) + f[0] * k, e1[1] * cos(a) + e2[1] * sin(a) + f[1] * k, e1[2] * cos(a) + e2[2] * sin(a) + f[2] * k];
        S.pring = K.pts(300, i => { const ring = i < 220, a = (i / 220) * TAU + (rnd(i, 201) - 0.5) * 0.25, d = ring ? dir(a, (rnd(i, 202) - 0.5) * 0.25) : dir(rnd(i, 203) * TAU, (rnd(i, 204) - 0.5) * 1.6), sp = ring ? 15 + rnd(i, 205) * 9 : 3 + rnd(i, 205) * 5, r0 = ring ? 1.6 : rnd(i, 206) * 3;   /* Jazz 24.11 om v5: rullen lengre unna, så ringen er større */
            return { p: [q.p[0] + d[0] * r0, q.p[1] + d[1] * r0, q.p[2] + d[2] * r0], v: [d[0] * sp - f[0] * 2, d[1] * sp - f[1] * 2, d[2] * sp - f[2] * 2], b: rnd(i, 207) * 0.06, l: 1.1 + rnd(i, 208) * 1.1, z: ring ? 3.2 + rnd(i, 209) * 3.4 : 3.6 + rnd(i, 209) * 4.6 }; },
          { t0: F(POFF), drag: 2.4, px: 200, sway: 0.3, c: ['#ffffff', '#e2dcf4', '#a49cc8'], shade: 1, fade: 0.3, a: 0.5, sz0: 0.5, sz1: 2.3, near: 6 });   /* hvit med tydelig skygge: synes mot den lyse himmelen */ S.scene.add(S.pring);
        S.pglint = K.pts(150, i => { const edge = i < 90, d = dir(edge ? (i / 90) * TAU : rnd(i, 211) * TAU, (rnd(i, 212) - 0.5) * (edge ? 0.12 : 0.5)), sp = edge ? 15 + rnd(i, 213) * 9 : 8 + rnd(i, 213) * 12;   /* edge: en tynn, glitrende kant på ringen */ return { p: [q.p[0] + d[0] * 1.5, q.p[1] + d[1] * 1.5, q.p[2] + d[2] * 1.5], v: [d[0] * sp, d[1] * sp - 0.5, d[2] * sp], b: 0.02 + rnd(i, 214) * 0.1, l: 0.5 + rnd(i, 215) * 0.7, z: 0.32 + rnd(i, 216) * 0.4 }; },
          { t0: F(POFF), drag: 2.4, add: 1, px: 40, c: ['#ffffff', '#e8f6ff', '#c8e4ff'], fade: 0.5, a: 0.75, near: 4 }); S.scene.add(S.pglint); }
      S.blast = K.pts(520, i => { const a = rnd(i, 111) * TAU, r = 1 + rnd(i, 112) * 4, sp = 9 + rnd(i, 113) * 15, bt = [0, 0.69, 1.39][i % 3]; return { p: [H[0] + cos(a) * r, 0.3 + rnd(i, 114) * 0.6, H[2] + sin(a) * r], v: [cos(a) * sp, 0.4 + rnd(i, 115) * 1.8, sin(a) * sp], b: bt + rnd(i, 116) * 0.12, l: 1.5 + rnd(i, 117) * 1.4, z: 3 + rnd(i, 118) * 4.5 }; },
        { t0: F(L.cam - 0.02), drag: 1.5, px: 220, sway: 0.3, c: ['#ebe5f7', '#cbc4e4', '#a69fca'], shade: 1, fade: 0.2, a: 0.13, sz0: 0.6, sz1: 2.4, near: 10 }); S.scene.add(S.blast);   /* bremseslagene: tettere og større (Jazz 24.11: mer snømist) */
      S.rdust = K.pts(240, i => { const a = rnd(i, 121) * TAU, e = (rnd(i, 122) - 0.3) * 1.6, sp = 5 + rnd(i, 123) * 13; return { p: [H[0], H[1] + 1.5, H[2]], v: [cos(a) * cos(e) * sp, sin(e) * sp * 0.7 + 1, sin(a) * cos(e) * sp], b: rnd(i, 124) * 0.25, l: 1.4 + rnd(i, 125) * 1.6, z: 0.5 + rnd(i, 126) * 0.9 }; },
        { t0: F(L.roar), drag: 1.2, add: 1, px: 46, c: ['#ffffff', '#dff2ff', '#b8d8ff'], fade: 0.4, a: 0.95 }); S.scene.add(S.rdust);
      return S; },
    act(S, t, o) { const s = t - CO, T = S.T, lu = S.lake.material.uniforms, q = S.q = perf(s, T);
      light(S, T, s >= L.top);
      { const ny = !q.nw ? 0 : 1; S.trail.visible = !ny; S.trail2.visible = !!ny; S.wmist.visible = !ny; S.wmist2.visible = !!ny; lu.uBeat.value.x = CO + B0 + (ny ? 0.02 : 0.05); }   /* den nye spissen er nede rett etter slaget (lite etterslep) */
      pose(S.gr, S.bd, q, T, t); pose(S.rf, S.rbd, q, T, t); S.rf.root.position.copy(S.gr.root.position); S.rf.root.quaternion.copy(S.gr.root.quaternion);
      S.gr.apply(); S.rw = q.rr; S.spc = '#d8f0ff';
      /* Speilbildet: klart i det svarte vannet, svakere og roligere i isen. */
      const ice = seg(s, L.acc, L.acc + 2.2); S.rfU.uA.value = mix(0.8, 0.4, ice); S.rfU.uWob.value = 1 - ice; S.rfU.uTint.value.set(mix(0.62, 0.7, ice), mix(0.62, 0.74, ice), mix(0.8, 0.95, ice));
      /* Ringen på aksenten: frosten skyter over hele innsjøen (2,9 s). Røyken faller sammen, og diamantstøvet tennes. */
      const rA = s - L.acc, c0 = path(L.acc); lu.uFR.value.set(c0[0], c0[2], rA > 0 ? 265 * Math.pow(c01(rA / 2.9), 1.08) : 0, rA > 0 ? 1 : 0);
      S.smoke.material.uniforms.uA.value = 0.2 * (1 - seg(s, L.acc, L.acc + 2.4)); S.fog.material.uniforms.uA.value = P2('eff') ? 0.085 - 0.045 * seg(s, L.acc, L.acc + 3) - 0.02 * seg(s, L.roar, L.name + 1) : 0.05 + 0.07 * seg(s, L.acc, L.acc + 3) - 0.035 * seg(s, L.roar, L.name + 1);   /* del 2: frostrøyken er tettest over det åpne vannet og tynnes når isen har lagt seg (research/is_sno_vind_lyn.md 15–16) */ S.dust.material.uniforms.uA.value = 0.14 + 0.16 * seg(s, -1.6, 0) + 0.6 * seg(s, L.acc, L.acc + 1.6);
      S.us.uSkyK.value.x = 0.3 + 0.4 * seg(s, L.acc, L.roar); { const ef = P2('eff'); S.us.uSkyK.value.z = ef ? 0.06 : 0; S.us.uSkyK.value.w = ef ? 1 : 0; if (S.dome2) { S.dome.visible = !ef; S.dome2.visible = ef; S.lake.visible = !ef; S.lake2.visible = ef; } }   /* del 2: ringen rundt sola og isnålene */
      /* Ice Beam: fra nebbet (forbi kjeven, i retningen fra hodet) til isen. */
      const bu = bmU(s), ba = s >= BM.on && s < BM.off ? eo(seg(s, BM.on, BM.on + 0.06)) * (1 - seg(s, BM.end, BM.off)) : 0, jw = S.gr.at('Jaw'), hd = S.gr.at('Head'), O = jw.clone().add(jw.clone().sub(hd).multiplyScalar(0.95)), I = q.aim.clone();
      S.bfx = { O, I, a: ba };   /* til frostlynene og spiralen (beamFx) */
      for (const m of S.beam) { m.visible = ba > 0.01; if (!m.visible) continue; const d = I.clone().sub(O), Ln = d.length(), r = m.userData.r * (0.96 + 0.04 * sin(t * 23 + m.userData.r * 9));
        m.position.copy(O); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.scale.set(r, Ln, r); m.material.uniforms.uL.value = Ln; m.material.uniforms.uA.value = m.userData.a0 * ba; }
      S.gMz.position.copy(O); S.gMz.material.uniforms.uA.value = 1.15 * ba;   /* ingen lading i lyset: i bildet før ser den mot kameraet, og ansiktet skal være fritt */ S.gIm.position.copy(I); S.gIm.material.uniforms.uA.value = 0.5 * ba;   /* treffet er nær kameraet: ikke en hvit kule */
      lu.uBK.value.set(max(0.001, bu), s >= BM.sw ? 1 : 0, ba); const ra = s - BM.on;
      lu.uMark.value.set(BA[0], BA[1], ra > 0 ? 2 + 7 * eo(c01(ra / 0.9)) : 0, ra > 0 ? 1 : 0);
      lu.uRing.value[0].set(BA[0], BA[1], ra > 0 ? 2 + 22 * eo(c01(ra / 0.7)) : 0, ra > 0 ? 1 - c01(ra / 1.1) : 0);
      lu.uStar.value.set(BA[0], BA[1], ra > 0 ? 9 * eo(c01(ra / 0.3)) : 0, ra > 0 ? (0.22 + 0.33 * (1 - c01(ra / 1.0))) * (1 - seg(s, L.hov, L.roar)) : 0);   /* frost-stjernen i første treff */
      S.ishard.at(t, F(BM.on), { g: 16, floor: 0.05 });
      /* Bremseslagene og brølet slår ringer i isen under den. */
      [L.cam + 0.69, L.hov, L.roar].forEach((b, i) => { const a = s - b; lu.uRing.value[i + 1].set(H[0], H[2], a > 0 ? 3 + (i === 2 ? 60 : 30) * eo(c01(a / 1.1)) : 0, a > 0 ? (i === 2 ? 1 : 0.6) * (1 - c01(a / 1.1)) : 0); });
    },
    shots: [
      /* 1 Kald start: lavt over det svarte, rykende vannet, mot skogen i sør og det rosa beltet over jordskyggen. Kameraet glir sakte fram. */
      [0, (S, u, a, t) => { camLv(7, mix(2.4, 2.6, u), mix(52, 46, u), 2, mix(17, 19, u), 172, 40, 0, t, CL.drone, 11, 1); light(S, S.T, 0); S.post.fade = 1 - seg(t, 0, 0.9); }],
      /* 2 Fanfaren: den kommer over tretoppene (lang linse, snøen raser), stuper mot vannet og retter seg opp, og stryker over kameraet mens vannet fryser under den. */
      [F(0) - 0.03, (S, u, a, t) => { const s = t - CO, p = path(s + 0.08), cz = mix(86, 63.5, io(u)), cy = mix(2.8, 3.1, u), tz = max(p[2], cz + 17), ty = min(p[1] - 2.6 * (1 - seg(s, 0.6, 2.4)), cy + (tz - cz) * mix(1.2, 0.36, seg(s, 3.3, 4.7)));   /* siktet følger den, men vipper aldri over 20°: den stryker ut over bildekanten */
        camLv(mix(8, 5.5, io(u)), cy, cz, p[0], ty, tz, kf(s, [[0, 14], [1.2, 15.5], [2.2, 17, io], [3.0, 21, io], [3.8, 30, io], [4.5, 40, io], [5.5, 48]]), 0, t, CL.hand, 12, 1);   /* zoomet litt ut (Jazz 24.11 om v6: «ikke så nærme»), før 10° → 48° */
        S.post.sh = 0.5 * hit(s, 0, 0.8) + 0.8 * hit(s, 5.15, 0.5) + 0.35 * EF(s); S.post.fl = 0.22 * hit(s, 0, 0.1); S.post.flc = '#ffe6f0'; spdAt(S, seg(s, 4.3, 4.9) * (1 - seg(s, 5.3, 5.55)) * 0.7); }],
      /* 3 Riffet: kameraet flyr lavt over vannet, først skrått foran den og så ved siden av, mens vannet fryser bak vingespissene og halen. */
      [F(L.riff), (S, u, a, t) => { const s = t - CO, p = path(s), e = EF(s), k = io(u), kv = P2('kam');   /* del 2: krengingen på 0,27 Hz (i kvalmebåndet) blir en langsom drift, og ristingen (hvit støy hvert 1/60 s) en glatt vinkel på 1 og 2,2 Hz */
        camLv(p[0] + mix(-12, -20, k), mix(3.0, 3.4, k), p[2] + mix(-17.5, -5, k), p[0] + mix(0.8, 1.6, k), p[1] + mix(0.7, 0.4, k), p[2] + mix(2.4, 4, k), mix(44, 45, k), -0.075 * e + (kv ? 0.005 * X.noise(t, 61, 0.1) : 0.018 * sin(t * 1.7)), t, [[0.22, 0.1], [0.12 * e, 1.0], [0.06 * e, 2.2]], 13, 1); S.post.sh = kv ? 0 : 0.75 * e; S.rfU.uA.value *= 0.3; }],   /* speilbildet svakt her: halens speiling kom inn nederst i bildet som en blå bit */   /* zoomet ut (Jazz 24.11 om v6): 21 m unna, før 13 */   /* lavere og nærmere med vid linse: isen raser forbi under (Jazz 24.11: «spesielt kameraet når det følger articuno») */
      /* 4 Høyt bak den: den hvite kilen over den svarte innsjøen. På aksenten skyter frosten ut til land, og kameraet løfter seg så hele innsjøen synes. */
      [F(L.top), (S, u, a, t) => { const s = t - CO, sf = s < L.acc ? s : L.acc + 0.8 * (1 - Math.exp(-(s - L.acc) / 0.8)), p = path(sf), e = eo(seg(s, L.acc, L.acc + 2.4)); camLv(p[0] + mix(16, 5, u), p[1] + 42 + 46 * e, p[2] + 88 + 44 * e, p[0] - 1, p[1] - 3, p[2] + 20 + 16 * e, mix(31, 46, e), 0, t, CL.drone, 14, 1); S.post.sh = 1.4 * hit(s, L.acc, 0.8) + 0.45 * EF(s); S.post.fl = 0.22 * hit(s, L.acc, 0.12); S.post.flc = '#dff0ff'; }],
      /* 5 Fra den nye isen: den stiger bratt mot himmelen der sola gikk ned, vender på vingespissen, faller inn i svingen med en full rull og kommer mot oss. */
      [F(L.up), (S, u, a, t) => { const s = t - CO, p = path(s); camLv(mix(-3, -1.5, u), 2.2, mix(62, 68, u), p[0], p[1] - mix(1.2, 0, seg(s, 20.6, 22.2)), p[2], kf(s, [[L.up, 13], [18.0, 13], [20.2, 15, io], [21.0, 15], [22.2, 9.5, io]]), 0, t, CL.hand, 15, 1);   /* rettelse 5: 32 m lenger bak, rullen på avstand (15°), og innzooming i stupet mot oss */   /* lengre bak og vidare (Jazz 24.11: «lengre unna … man ser ikke detaljene like godt»); linsa smalner litt mot slutten, så den vokser når den kommer mot oss */
        S.post.sh = 0.8 * hit(s, POFF, 0.45) + 0.4 * EF(s); S.post.fl = 0.12 * hit(s, POFF, 0.08); S.post.flc = '#eef6ff'; spdAt(S, seg(s, 19.9, 20.6) * 0.45 + seg(s, 21.0, 21.5) * 0.4); }],   /* poffen i rullen, og farten i stupet og mot oss */
      /* 6 Ice Beam og bremsen, i ett bilde: strålen treffer isen under plassen, feier mot oss og forbi (25,00), og den reiser seg med store slag og står i lufta
         der den står i kampen. Kameraet glir fra lang linse til kampens bilde. */
      [F(L.back), (S, u, a, t) => { const s = t - CO, k = io(seg(s, 24.95, 27.1)), tg = camEnd(), cp = CAMB.cp, c6 = CAM6.cp, g6 = CAM6.tg;
        camLv(mix(c6[0], cp[0], k), mix(c6[1], cp[1], k), mix(c6[2], cp[2], k), mix(g6[0], tg[0], k), mix(g6[1], tg[1], k), mix(g6[2], tg[2], k), mix(CAM6.fv, CAMB.fv, k), 0, t, CL.drone, 16, sm5(seg(s, BM.off + 0.4, BM.off + 1.4)));   /* i ro mens strålen går (Jazz 24.11), så til kampens bilde */
        S.post.sh = 1.9 * hit(s, BM.on, 0.5) + 0.9 * hit(s, BM.cam, 0.5) + 0.8 * hit(s, L.cam + 0.69, 0.4) + 1.0 * hit(s, L.hov, 0.5); S.post.fl = max(0.2 * hit(s, BM.on, 0.07), 0.3 * hit(s, BM.cam, 0.1)); S.post.flc = '#e2f4ff'; }],   /* bittelitt risting og et kort blink idet den treffer isen (Jazz 24.11 om v5) */
      /* 7 Brølet, tett på: lavt og skrått forfra, vingene ut over hele bildet, og frosten raser inn over linsa. */
      [F(L.roar), (S, u, a, t) => { const s = t - CO, e = eo(u); camLv(mix(-4.6, -4.1, e), mix(6.6, 7.0, e), mix(-9, -11.5, e), H[0] - 0.2, H[1] + 2.0, H[2], 36, 0, t, CL.hand, 17, 1); X.mouth(S, S.gr, F(L.roar), t); S.post.sh = 2.2 * hit(s, L.roar, 1.2); S.post.fl = 0.35 * hit(s, L.roar, 0.1); S.post.flc = '#e8f4ff'; }],
      /* 8 Navnet: kampens bilde. Den står i lufta og slår rolig med vingene mens den venter. */
      [TN, (S, u, a, t) => { const tg = camEnd(), cp = CAMB.cp; camLv(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv, 0, t, CL.drone, 18, 1 - sm5(c01((t - (LEN - 1.7)) / 1.2)));   /* del 2: stille i kampens bilde fra 0,5 s før slutten */ X.mouth(S, S.gr, F(L.roar), t); S.post.fl = 0.3 * hit(t, TN, 0.1); S.post.flc = '#e8f4ff'; }],
    ],
  });
  /* Lydene: naturlydene ligger i lydsengen. Brølet er artens eget (signalet 'cry').
     DALEN (Jazz 24.11: «articuno skriket med reverb som det høres ut når man skriker i en dal», og «også … når hele insjøen blir til is»): skriket direkte, litt borte
     (uten bunn og skarpeste diskant, litt dypere), så fem tydelige ekko fra fjellsidene, svakere og mørkere for hvert og vekselvis fra venstre og høyre, og dalens lange
     etterklang (regnet ut én gang). v = 0: i den kalde starten, før fanfaren; v = 1: når frosten tar innsjøen. */
  let valIR = null;
  const valleyIR = a => { if (valIR && valIR.sampleRate === a.sampleRate) return valIR; const sr = a.sampleRate, n = Math.floor(sr * 3.6), b = a.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let sd = 7 + c * 131, lp = 0; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 * 2 - 1; };
      for (let i = 0; i < n; i++) { const t = i / sr, v = rn() * Math.exp(-t / 0.62) * (1 - Math.exp(-max(0, t - 0.05) / 0.12)) * (t > 0.05 ? 1 : 0), k = 0.06 + 0.5 * Math.exp(-t / 0.7); lp += k * (v - lp); d[i] = lp; } }   /* diffus hale som mørkner (lufta tar diskanten) */
    return valIR = b; };
  const ECHO = [[0.42, 0.5, 2700, -0.6], [0.83, 0.34, 2100, 0.55], [1.31, 0.23, 1600, -0.4], [1.86, 0.15, 1200, 0.65], [2.5, 0.09, 900, -0.25]];   /* [forsinkelse s, styrke, lavpass Hz, side] */
  X.snd.dal = (v, sh) => { try { if (typeof S === 'undefined' || !S.sound || !S.cries || typeof cryBuf !== 'function' || !ac()) return [20];
      const o = v ? { g: 0.5, rate: 0.96, lp: 7500, dry: 1, echo: 0.85, wet: 0.45 } : { g: 0.27, rate: 0.9, lp: 3600, dry: 0.62, echo: 1.1, wet: 0.7 };   /* målt mot låta (lydspor.js): langt borte i stillheten, og litt over låta ved frysingen, godt under brølet */
      cryBuf(144).then(buf => { const a = ac(), out = (typeof fxBus === 'function' && fxBus()) || a.destination, Lq = typeof loudOf === 'function' ? loudOf(buf) : -18;
        const G = o.g * (Lq > -90 ? Math.max(0.12, Math.min(2, Math.pow(10, (-18 - Lq) / 20))) : 0.4) * Math.pow((S.cvol == null ? 70 : S.cvol) / 100, 1.6) * 4.27;
        const src = a.createBufferSource(), hp = a.createBiquadFilter(), lp = a.createBiquadFilter(), dry = a.createGain();
        src.buffer = buf; src.playbackRate.value = o.rate; hp.type = 'highpass'; hp.frequency.value = 220; lp.type = 'lowpass'; lp.frequency.value = o.lp;
        src.connect(hp); hp.connect(lp); lp.connect(dry); dry.gain.value = G * o.dry; dry.connect(out);
        for (const [d, gn, f, pan] of ECHO) { const dl = a.createDelay(3), fl = a.createBiquadFilter(), gg = a.createGain(), pn = a.createStereoPanner ? a.createStereoPanner() : null;
          dl.delayTime.value = d; fl.type = 'lowpass'; fl.frequency.value = f; gg.gain.value = G * o.echo * gn; lp.connect(dl); dl.connect(fl); fl.connect(gg);
          if (pn) { pn.pan.value = pan; gg.connect(pn); pn.connect(out); } else gg.connect(out); }
        const cv = a.createConvolver(), wg = a.createGain(); cv.buffer = valleyIR(a); wg.gain.value = G * o.wet; lp.connect(cv); cv.connect(wg); wg.connect(out);
        src.start(a.currentTime + (sh || 0)); }).catch(() => {}); } catch (_) {} return v ? [20, 60, 20] : [20]; };   /* sh: bare lydsporverktøyet (når i sporet signalet kommer) */
  X.reg('c3:144', { spid: 144, skin: 'ice', cues: [[0.3, 'dal', 0], [F(L.acc) + 0.3, 'dal', 1], [F(L.roar), 'cry']], roar: () => F(L.roar),
    look(S, t, P) { const s = t - CO; P.bloom = 0.24; P.bloomT = 0.8; P.vig = 0.34; P.vigc = '#0c0a26'; P.grain = 0.03; P.grade = { tint: [1.02, 0.98, 1.05], con: 1.05, sat: 1.06, exp: 1 }; },
    over: (x, t, o) => X.plate(x, t - TN, Object.assign({ name: 'Articuno', lv: 60, skin: 'ice' }, o)),
    fx(S, t, P) { const s = t - CO; speedFx(S, s, t); beamFx(S, s, t); splatFx(s);
      lensFrost(eo(seg(s, L.roar - 0.04, L.roar + 1.0)) * 0.7 * (1 - 0.14 * seg(s, L.name, L.name + 1.5)), 0.92 * seg(s, L.roar - 0.06, L.roar + 0.2) * (1 - 0.45 * seg(s, L.name + 0.4, L.name + 2.4))); } });
})();
