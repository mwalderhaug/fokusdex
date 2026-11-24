'use strict';
/* Fokusdex – cutscenene i 3D: verktøykassa alle artene bygger på (G3C). Motoren og stilen står i raid3d.js; hver art har sin egen fil i c3/ (c3/383.js er Groudon),
   og den hentes først når et raid med arten viser seg (G3C.load), så appen ikke leser 47 arters cutscener ved oppstart.
   En art er ett sted bygget i 3D, ett sammenhengende skuespill (act) og kameraer som klipper mellom bilder av det (shots), og den gir:
     'c3:<art>'   introen før raidet: ender i brølet med navnet og nivået, venter på Continue, og går ut i virvel og hvitt blink rett inn i kampen
     'c3:<art>p'  forvandlingen ved raseriet (Primal, Mega), hvis arten har en: kort, kan hoppes over, og ender i et hvitt blink tilbake til kampen
     'c3:<art>a'  arenaen i kampen: samme sted fra et fast kamera, med den legendariske som Gen 5-bilde lyst av stedet
     'c3:<art>b'  arenaen med den legendariske som 3D-figur i spritekorn (bare Groudon og Kyogre)
   Koblingen i appen (bui.js: legendIntro, primalCut, drawBattle; arena.js) er skrevet med disse navnene og finner en ny art selv.
   Det arten selv må lage, og det verktøykassa gjør for den, står i work/RAIDS3D.md («Oppskriften for en ny art»).
   Tyngden i bevegelsene: forvarsel (trekker seg sammen før den slår ut), overskudd (back: forbi målet og tilbake), en dempet fjær etter hvert nedslag (sq). */
const G3C = (() => {
  /* ARTS: artene som har en fil i c3/. Legg til nummeret når fila finnes (og fila i FILES i sw.js). */
  const X = { ARTS: [383, 382, 144, 493], snd: {}, sfx: [], base: 'c3/' }, jobs = {};
  const ok = typeof G3D !== 'undefined' && typeof CINE !== 'undefined';
  X.has = id => ok && X.ARTS.indexOf(+id) >= 0;
  /* Henter artens fil (én gang). Feiler den (ikke nett, ikke mellomlagret), kan den prøves igjen senere, og sprite-introen spilles i mellomtiden. */
  X.load = id => { id = +id; if (!X.has(id)) return Promise.reject(new Error('no c3 ' + id));
    return jobs[id] || (jobs[id] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = X.base + id + '.js'; s.onload = () => res(true); s.onerror = () => { jobs[id] = null; s.remove(); rej(new Error('c3 ' + id)); }; document.head.appendChild(s); })); };
  /* Til bakgrunnen (raidvarselet, raidkortet): artens fil, motoren og modellene til introen og kampen hentes, uten at noe bygges eller tegnes. */
  X.warm = id => X.load(id).then(() => G3D.warm('c3:' + id)).then(() => G3D.has('c3:' + id + 'b') ? G3D.warm('c3:' + id + 'b').catch(() => 0) : 0).then(() => true);
  if (!ok) return X;
  const K = G3D.K, C = CINE.kit, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, hit, rnd, hex } = K, kf = C.kf;

  /* ---------- Småting alle bruker ---------- */
  X.lerpC = (u, a, b, k) => { const x = hex(a), y = hex(b); u.value.setRGB(mix(x[0], y[0], k), mix(x[1], y[1], k), mix(x[2], y[2], k)); };
  X.col3 = (u, k, a, b, c) => { if (k < 0.5) X.lerpC(u, a, b, k * 2); else X.lerpC(u, b, c, k * 2 - 2 + 1); };
  X.sq = (t, t0, f, d) => { const a = t - t0; return a < 0 ? 0 : Math.exp(-(d || 6) * a) * cos((f || 13) * a); };   /* fjæringen etter et nedslag */

  /* ---------- Fjærene: det som henger etter, og tyngden (Bevegelse, 24.11) ----------
     Haler, tentakler, finner, vingefjær og kapper følger roten eller hodet med fjærfysikk (en dempet fjær per ledd), ikke med fast forsinkelse per ledd.
     Alt er en ren funksjon av tiden, som resten av motoren: fjærene regnes fra t0 i faste steg (1/240 s) med en lagret tilstand hvert kvarte sekund, så bildet
     på tiden t er det samme om filmen spilles, spoles eller hoppes i (og regnes på høyst et kvart sekund når den spoles bakover). Målene (src, drive, pose)
     må også være rene funksjoner av tiden (de samme formlene som i act), aldri lest av figuren. Ingen bibliotek. Reglene: work/RAIDS3D.md, «Bevegelse».
     X.follow(src, o) → f(t): følger målet src(t) (et tall eller en liste: en vekt, vinkler, kameraets plass) som en dempet fjær. Et sprang i målet blir en myk
       start (farten starter i null), en bevegelse dit og et lite overskudd før den faller på plass. o = { f: egenfrekvensen i Hz (1,2; lavere = tyngre og tregere),
       z: dempingen (0,45 = et tydelig overskudd, 0,7 = et lite, 1 = ingen), t0: fra når (før t0 står den i målet), dt }.
       Eksempel: const v = X.follow(t => t < Q.ROAR ? 0 : 1, { f: 1.1, z: 0.5, t0: Q.ROAR - 1 }); g.add(ROAR, v(t)).
       Hodet leder: samme mål med høyere f for hodet (1,6) enn for kroppen (0,9), så hodet er framme først og kroppen kommer etter.
     X.chain(o) → kjeden: o = { bones: ledd fra roten og ut (roller som i posene), drive: t → [rx, ry, rz] (ankeret: roten eller hodet, i posenes rom),
       pose: (t, i) → [rx, ry, rz] (leddets egen stive pose; valgfri), f: Hz i leddet innerst (1,6), fo: frekvensen ganges med dette per ledd utover (0,8: tuppen er
       tregest og pisker mest), z (0,35), lim: høyeste avvik per ledd i radianer (mykt tak; valgfri), t0, dt }. Hvert ledd følger leddet innenfor seg (det innerste
       følger ankeret), så tuppen henger mest etter og slår forbi når ankeret stanser. at(t) → avviket fra den stive posen per ledd ([[rx, ry, rz], …], legges oppå
       posen); add(f, t, w) legger det på figuren f. Flytting av roten tas med som en vinkel i drive (halen henger etter når kroppen løftes: [0, −k · høyden(t), 0]).
     X.freeze(t, list, n, cu) → figurens tid: de n bildene (1/30 s; standard 3) fra hvert nedslag i list står stille, og så tar figuren igjen tiden i løpet av cu
       sekunder (0,3) uten sprang. Bare for figurens skuespill; låta, kameraet og effektene går som før. Store arter: 2–4 bilder ved nedslag.
     X.noise(t, seed, hz) → jevn støy i −1..1 (verdistøy i to lag, femtegradskurve mellom punktene).
     X.handheld(src, o) → f(t): kameraet som holdes av en hånd: src(t) = [px, py, pz, tx, ty, tz] (banen) følges med en fjær (etterslep), og svak støy legges oppå.
       o = { f (1,6), z (0,8), amp: [plassen, siktet] i enheter ([0,04, 0,025]; etter målestokken), hz (0,6), seed, t0 }. Ett per klipp med t0 = klippets start,
       så kameraet ikke fjærer fra forrige klipp. Gir [px, py, pz, tx, ty, tz] til K.cam. */
  const SPR = { dt: 1 / 240, mark: 60 };   /* steget, og hvor mange steg mellom hver lagrede tilstand (60 · 1/240 = et kvart sekund) */
  /* Kjernen: n frihetsgrader (plass og fart i én liste), init(s) gir starttilstanden i t0, step(s, t, dt) ett steg. Gir st(t): tilstanden på steget nærmest t
     (st.tk = stegets tid). Går filmen framover, regnes det videre derfra; spoles den bakover, startes det fra den lagrede tilstanden før t. */
  const springSim = (n, init, step, o) => {
    const dt = o.dt || SPR.dt, t0 = o.t0 || 0, M = SPR.mark, marks = [], s = new Float64Array(2 * n); let at = -1;
    const st = t => { const k = max(0, Math.round((t - t0) / dt));
      if (at < 0 || at > k) { if (!marks.length) { const s0 = new Float64Array(2 * n); init(s0); marks.push(s0); } const m = min(floor(k / M), marks.length - 1); s.set(marks[m]); at = m * M; }
      while (at < k) { step(s, t0 + at * dt, dt); at++; if (at % M === 0 && at / M === marks.length) marks.push(Float64Array.from(s)); }
      st.tk = t0 + at * dt; return s; };
    return st; };
  const vec = (v, n) => typeof v === 'number' ? [v] : v || new Array(n).fill(0);
  X.follow = (src, o) => { o = o || {}; const t0 = o.t0 || 0, w = TAU * (o.f || 1.2), z = o.z == null ? 0.45 : o.z, one = typeof src(t0) === 'number', n = vec(src(t0)).length;
    const st = springSim(n, s => { const v = vec(src(t0), n); for (let j = 0; j < n; j++) { s[j] = v[j]; s[n + j] = 0; } },
      (s, t, dt) => { const v = vec(src(t), n); for (let j = 0; j < n; j++) { s[n + j] += (w * w * (v[j] - s[j]) - 2 * z * w * s[n + j]) * dt; s[j] += s[n + j] * dt; } }, o);
    return t => { if (t <= t0) { const v = src(t); return one ? v : Array.from(v); } const s = st(t); return one ? s[0] : Array.from(s.subarray(0, n)); }; };
  X.chain = o => {
    const B = o.bones || [], n = o.n || B.length, t0 = o.t0 || 0, f0 = o.f || 1.6, fo = o.fo == null ? 0.8 : o.fo, z = o.z == null ? 0.35 : o.z, lim = o.lim || 0;
    const W = Array.from({ length: n }, (_, i) => TAU * f0 * Math.pow(fo, i)), Z3 = [0, 0, 0], drv = t => o.drive ? o.drive(t) : Z3, pz = (t, i) => o.pose ? o.pose(t, i) || Z3 : Z3, N = 3 * n;
    /* s[3i + c] = leddets vinkel i kjedens rom (ankeret pluss alle leddene innenfor), s[N + 3i + c] = farten. Målet for et ledd er leddet innenfor pluss leddets egen pose. */
    const st = springSim(N, s => { const a = drv(t0); for (let c = 0; c < 3; c++) { let p = a[c] || 0; for (let i = 0; i < n; i++) { p += pz(t0, i)[c] || 0; s[3 * i + c] = p; s[N + 3 * i + c] = 0; } } },
      (s, t, dt) => { const a = drv(t); for (let i = 0; i < n; i++) { const p = pz(t, i), w = W[i];
        for (let c = 0; c < 3; c++) { const q = 3 * i + c, tg = (i ? s[q - 3] : a[c] || 0) + (p[c] || 0); s[N + q] += (w * w * (tg - s[q]) - 2 * z * w * s[N + q]) * dt; s[q] += s[N + q] * dt; } } }, o);
    const C = { bones: B, n,
      at(t) { const out = []; if (t <= t0) { for (let i = 0; i < n; i++) out.push([0, 0, 0]); return out; } const s = st(t), tk = st.tk, a = drv(tk);
        for (let i = 0; i < n; i++) { const p = pz(tk, i), r = [0, 0, 0];
          for (let c = 0; c < 3; c++) { const q = 3 * i + c; let d = s[q] - (i ? s[q - 3] : a[c] || 0) - (p[c] || 0); if (lim) d = lim * Math.tanh(d / lim); r[c] = d; } out.push(r); }
        return out; },
      add(f, t, w) { const r = C.at(t); w = w == null ? 1 : w; for (let i = 0; i < n && i < B.length; i++) f.add({ [B[i]]: r[i] }, w); return r; } };
    return C; };
  X.freeze = (t, list, n, cu) => { const d = (n == null ? 3 : n) / 30; cu = cu || 0.3;
    for (const h of list || []) { if (t < h) continue; if (t < h + d) return h; if (t < h + d + cu) return t - d * (1 - io((t - h - d) / cu)); }
    return t; };
  const nz1 = (x, s) => { const i = floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10); return mix(rnd(i, s), rnd(i + 1, s), u) * 2 - 1; };
  X.noise = (t, seed, hz) => { const x = t * (hz || 0.6), s = seed || 0; return 0.72 * nz1(x, s) + 0.28 * nz1(x * 2.17 + 3.1, s + 11); };
  X.handheld = (src, o) => { o = o || {}; const lag = X.follow(src, { f: o.f || 1.6, z: o.z == null ? 0.8 : o.z, t0: o.t0, dt: o.dt }), A = o.amp || [0.04, 0.025], hz = o.hz || 0.6, sd = o.seed || 1;
    return t => { const c = lag(t); for (let i = 0; i < 6; i++) c[i] += X.noise(t, sd + i * 17, hz) * A[i < 3 ? 0 : 1]; return c; }; };

  /* ---------- Brølet ---------- (Jazz 18.11: «ikke tykke streker»): tynne gnister ut fra kjeften, lydbølger som brer seg fra den (forvrengningsringer i fxgl.js) og
     et rykk i bildet. mouth(S, f, t0, t) i kameraet som filmer brølet: f = figuren, t0 = når brølet startet, S.rw = hvor åpent (0–1). Kjeften er rollen 'Jaw'. */
  X.mouth = (S, f, t0, t, len) => { const j = f.at('Jaw'), m = K.proj(j.x, j.y, j.z); S.post.spx = m.x / 2; S.post.spy = m.y / 2; S.post.spr = 0.1; S.post.spd = 0.9 * S.rw * hit(t, t0, len || 2.4); S.mouth = m; if (S.spc) S.post.spc = S.spc; };   /* S.spc: stedets farge på gnistene (standard oransje) */
  X.roarFx = (S, t, P, t0) => { const a = t - t0, m = S.mouth; if (a < 0 || a > 2.9 || !m || m.z >= 1 || !(S.rw > 0.05)) return; const sk = P.shock || (P.shock = []);
    for (let i = 0; i < 3; i++) { const ph = (a / 0.72 + i / 3) % 1; if (a - ph * 0.72 < -0.01) continue; sk.push({ x: m.x, y: m.y, r: 14 + ph * 300, w: 26, a: 20 * (1 - ph) * S.rw }); }
    P.bulge = { x: m.x, y: m.y, r: 210, a: 0.2 * hit(t, t0, 0.3) }; };

  /* ---------- Navneskiltet ---------- Navnet og nivået, i figurens oppløsning (256 × 192 ganger def.fig). Det viktige ligger innenfor x 32–224, som er det en
     smal skjerm viser. a = sekunder siden skiltet startet. o = { name, cap, lv, sign: tegnet i stedet for nivået (forvandlingen), skin, deco(x, a, w, sk) }.
     Skiltet er i stedets materiale (RAIDS.md regel 3): skin er et av SKIN (lava, sea, ice) eller artens eget { bg, top, bot, cap, grad: [lys, midt, mørk], lv, ink }.
     ink er fargen på kanten rundt teksten (G3D.text), og sendes med av reg. Lange navn krympes så de får plass foran nivået. */
  X.SKIN = { lava: { bg: '#170709', top: '#ff8a1a', bot: '#7a1c0a', cap: '#ffb060', grad: ['#fff2b0', '#ffa828', '#f0541a'], lv: '#ffe8c0', ink: [22, 8, 10] },
    sea: { bg: '#061320', top: '#58c8ff', bot: '#0c3a66', cap: '#8fd4ff', grad: ['#f2fbff', '#7cc8ff', '#2a7fd8'], lv: '#d8f0ff', ink: [5, 14, 28] },
    ice: { bg: '#0d1422', top: '#cfeeff', bot: '#3d5c8a', cap: '#b8dcff', grad: ['#ffffff', '#cfe9ff', '#8ab4ea'], lv: '#eaf6ff', ink: [10, 16, 34] } };
  const skinOf = s => typeof s === 'string' ? X.SKIN[s] || X.SKIN.lava : s || X.SKIN.lava;
  X.plate = (x, a, o) => {
    if (a < 0) return false;
    const sk = skinOf(o.skin), f = C.fontN(), nm = String(o.name || '').toUpperCase(), k = eo(c01(a / 0.2)), w = Math.round(256 * k), jolt = a < 0.3 ? Math.round(2 * (1 - a / 0.3) * (floor(a * 60) % 2 ? 1 : -1)) : 0;
    x.fillStyle = sk.bg; x.fillRect(0, 141, w, 42); x.fillStyle = sk.top; x.fillRect(0, 140, w, 1); x.fillStyle = sk.bot; x.fillRect(0, 183, w, 1);
    if (o.deco) o.deco(x, a, w, sk);
    if (a < 0.1) return true;
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.font = `${f[1]}8px ${f[0]}`; x.fillStyle = sk.cap; x.fillText(String(o.cap || 'Legendary Pokémon').toUpperCase(), 36, 151 + jolt);
    const gr = x.createLinearGradient(0, 157, 0, 179); gr.addColorStop(0, sk.grad[0]); gr.addColorStop(0.42, sk.grad[0]); gr.addColorStop(0.43, sk.grad[1]); gr.addColorStop(0.74, sk.grad[1]); gr.addColorStop(0.75, sk.grad[2]); gr.addColorStop(1, sk.grad[2]);
    /* Navnet får plass mellom x 35 og nivået (eller tegnet): lengre navn krympes til de passer (ROOM piksler; Groudon og Kyogre står i full størrelse). */
    let px = 32; x.font = `${f[1]}${px}px ${f[0]}`; while (px > 16 && x.measureText(nm).width > X.ROOM) { px -= 2; x.font = `${f[1]}${px}px ${f[0]}`; }
    x.fillStyle = a < 0.16 ? '#ffffff' : gr; x.fillText(nm, 35, 179 + jolt); x.font = `${f[1]}16px ${f[0]}`;
    if (o.sign) { if (a > 0.42) o.sign(x, 206, 162, 15, a < 0.5 ? 0.6 : 1); }
    else if (o.lv && a > 0.42) { x.textAlign = 'right'; x.fillStyle = a < 0.5 ? '#ffffff' : sk.lv; x.fillText('Lv.' + o.lv, 222, 178); }
    return true;
  };
  X.ROOM = 146;
  /* Tegnene ved forvandlingen, tegnet med tre streker oppå hverandre (mørk kant, farge, lys kjerne): Ω (Groudon) og α (Kyogre). k = hvor sterkt det lyser (0–1).
     cols = [kant, svak, sterk, kjerne]. Tegnes i figurens oppløsning (på krystallen og på skiltet). */
  const stroke3 = (x, r, k, cols, path) => { const one = (w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'miter'; x.lineCap = 'butt'; x.beginPath(); path(); x.stroke(); };
    one(r * 0.36, cols[0]); one(r * 0.25, k > 0.5 ? cols[2] : cols[1]); if (k > 0.75) one(r * 0.09, cols[3]); };
  X.omega = (x, cx, cy, r, k, cols) => { const R = r * 0.62, c = -r * 0.14, a0 = 0.66, ex = R * sin(a0), ey = c + R * cos(a0), fy = r * 0.66, f0 = r * 0.2, f1 = r * 0.84;
    stroke3(x, r, k, cols || ['#c4480a', '#f08a14', '#ffc81e', '#fff4a8'], () => { x.moveTo(cx - f1, cy + fy); x.lineTo(cx - f0, cy + fy); x.lineTo(cx - ex, cy + ey); x.arc(cx, cy + c, R, PI / 2 + a0, PI / 2 - a0 + TAU); x.lineTo(cx + f0, cy + fy); x.lineTo(cx + f1, cy + fy); }); };
  X.alpha = (x, cx, cy, r, k, cols) => { stroke3(x, r, k, cols || ['#0a3a9c', '#2a8ae8', '#58c8ff', '#eafaff'], () => { x.moveTo(cx + r * 0.86, cy - r * 0.62); x.bezierCurveTo(cx + r * 0.3, cy + r * 0.95, cx - r * 0.98, cy + r * 0.8, cx - r * 0.92, cy); x.bezierCurveTo(cx - r * 0.98, cy - r * 0.8, cx + r * 0.3, cy - r * 0.95, cx + r * 0.86, cy + r * 0.62); }); };

  /* ---------- Filmene i CINE ---------- Samme grensesnitt som sprite-filmene (CINE.still, CINE.play), så verktøyene og avspilleren virker likt. gl: 1 = bildet
     går gjennom etterbehandlingen i fxgl.js (glød, varmeflimmer, lysstråler, fargetone, vignett), som filmene og arenaene fra steg 2.
     d = { spid, swirl (0 = ingen virvel ut: forvandlingen), cues, skin (skiltets kant, se plate),
           back(S, t) → sn: bakteppet i 2D bak 3D-bildet (himmel, fjernt landskap), tegnet med raidk.js og festet til kameraet med G3D.view,
           over(x, t, o): navnet og tegn i figurens oppløsning,
           look(S, t, P, q, sn): stedets etterbehandling (P.bloom, P.heat, P.vig, P.grade, P.rays …); q = det kameraet ba om (S.post),
           roar: t → tidspunktet brølet startet (gnister og lydbølger), fx(S, t, P, q, sn): cutscenens egne tillegg }. */
  X.reg = (id, d) => { const inf = G3D.info(id), ink = d.skin ? skinOf(d.skin).ink : null; C.film(id, { len: inf.len, R: inf.R, at: inf.at, hold: inf.hold, mus: inf.mus, c3: 1, gl: 1, spid: d.spid, swirl: d.swirl, outc: '#ffffff', cues: d.cues, pre: () => G3D.ready(id),
    draw(t, P, cur) { const g = C.g, c = G3D.isReady(id) ? G3D.frame(id, t, cur, CINE._.rs()) : null; if (!c) { CINE.err = 'g3d: ' + (G3D.err || 'not ready'); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 384); return; } if (G3D.err) CINE.err = G3D.err;
      const S = G3D.S(id), q = G3D.post(id), sn = d.back ? d.back(S, t) : null;
      g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, 512, 384);
      if (d.over && !(G3D.out > 0.3)) { g.imageSmoothingEnabled = false; g.drawImage(G3D.text(x => d.over(x, t, cur), inf.fig, ink), 0, 0, 512, 384); g.imageSmoothingEnabled = true; }
      P.sh = q.sh * 2; P.fl = q.fl; P.fc = q.flc; P.fade = q.fade; P.fadec = q.fadec;
      if (d.look) d.look(S, t, P, q, sn);
      if (d.roar) X.roarFx(S, t, P, d.roar(t));
      if (d.fx) d.fx(S, t, P, q, sn); } }); };

  /* ---------- Arenaen i kampen: samme sted som cutscenen ---------- (Jazz 18.11, runde 5: arenaen «må ha samme layout som introen».)
     X.arena(art, A) lager 'c3:<art>a' (stedet fra et fast kamera, den legendariske som Gen 5-bilde lyst av stedet) og, når A.fig finnes, 'c3:<art>b' (den legendariske
     som 3D-figur i spritekorn), og kobler dem på arenaen fra steg 2 (ARENA.defs[art], som er reserven uten 3D). Verktøykassa gjør kameraet, plassene, hendelsene
     fra kampen, skuespillet i kampen og koblingen; arten gir stedet og det som er dens eget:
     A = { home: [x, y, z]    der den legendariske står i stedet (y = føttene i forhold til bakken)
           foe: [x, y], me: [x, y]   plassene i arenaens piksler uten 3D-figur (den legendariskes fot- eller vannlinje, og føttene til din egen)
           env, edge          stedets lys og kanten mot bakken (som i G3D.def)
           cam(fig) → { fv, cp: [x, y, z], kq, tg: [x, y, z] }   kameraet: synsvinkel, plass, og hvor fort siktet rettes inn (enheter per piksel). Siktet (tg) dreies
                              til home treffer plassen i bildet.
           place(K, T, fig) → S     stedet (S.scene, S.figs = []), bygget som i cutscenen
           dress(S, K, T, fig, m)   det kampen har i tillegg: det din Pokémon står på (m = punktet under den), bobler, røyk
           state(S, t, o, st)       stedet for hvert bilde. st = hendelsene (X.state under), o = det rå fra kampskjermen
           back(S, t) → sn          bakteppet i 2D (som i reg)
           scene(As, S, sn, q)      etter at 3D-bildet er tegnet: lyset på figurene (C.lightSet), skygger, det stedet gjør når det slår til, og etterbehandlingen.
                                    As = arenaens tilstand (ARENA), S = 3D-scenen, q = { P, fig (3D-figuren er med), fT, pT, id }
           mid(As, mid0)            mellom figurene uten 3D-figur (bakken over føttene på Gen 5-bildet); mid0 = den fra steg 2
           fig: { models, at: [x, y], me: [x, y]   plassene med 3D-figuren (oppstillingen fra Black/White: din egen nede til venstre, kuttet av kanten)
                  turn                hvor mye den dreies forbi din Pokémon (0,36 = trekvart forfra)
                  make(S, K, T)       figurene: S.figs og S.forms = [vanlig, forvandlet]
                  form(S, pr) → { f, y, stand: [pose, vekt], duck, roar, rk }   formen som står nå (pr = forvandlet): figuren, høyden, kampstillingen, «dukket»,
                                      brølets pose og hvor mye av den et utfall bruker
                  idle(f, t)          pusten og det som lever mens den står
                  glow(S, f, t, st, pr)   artens eget lys på figuren (årer, mønstre)
                  after(S, K, T, m)   til slutt i byggingen (rydd rundt føttene)
                  sink, ink2(S) } }
     Hendelsen 'primal' betyr «forvandlingen er over» (også for Mega): arenaen står fra da av slik cutscenen sluttet. */
  const SINCE = ['eT', 'fT', 'rT', 'pT', 'fh', 'aT', 'dT', 'sT', 'mT'];
  /* o fra kampskjermen: p2 (raseriet, 0–1), eT, fT, rT, pT (sekunder siden kampen startet, stedet slo til, raseriet, forvandlingen var over), hit: [x, z, alder]
     (ringen i bakken), fh (sekunder siden den legendariske ble truffet), aT og ak (angrep, og hvor hardt: 0,5 for angrep på seg selv), dT (besvimte), sT og sv
     (stat opp +1 eller ned −1), mT (lysringen uten cutscene), away (borte: Fly, Dig). pk = hvor langt stedet er kommet i tilstanden etter forvandlingen (0–1). */
  X.state = o => { const pT = o.pT == null ? 1e9 : o.pT, pr = pT < 1e8; return { p2: o.p2 || 0, eT: o.eT == null ? 99 : o.eT, fT: o.fT == null ? 99 : o.fT, rT: o.rT == null ? 99 : o.rT, pT, pr, pk: pr ? eo(c01((pT + 2) / 3)) : 0 }; };
  /* Skuespillet i kampen (runde 20), i trinn og hele piksler: den legendariske puster og ser seg om (idle), blunker, rykker til når den blir truffet (to hele piksler
     til siden annethvert trinn), går til angrep (dukker 0,2 s, så et utfall med overskudd mot din Pokémon), får stat opp og ned (farget blink), forvandles uten
     cutscene (hvit til formen byttes), besvimer (hodet synker, øynene går igjen, og den synker i bakken) og er borte (Fly, Dig). Den brøler IKKE i kampen.
     Roten står fast (ellers kryper pikslene); S.fo = hvor mange hele piksler figuren flyttes på skjermen. */
  X.actor = (S, t, o, st, G, home) => {
    const pr = st.pr, F = G.form(S, pr), f = F.f, fh = o.fh == null ? 99 : o.fh, fl = Math.exp(-5 * fh) * (fh < 99 ? 1 : 0);
    const aT = o.aT == null ? 99 : o.aT, ak = o.ak == null ? 1 : o.ak, dT = o.dT == null ? 99 : o.dT, sT = o.sT == null ? 99 : o.sT, mT = o.mT == null ? 99 : o.mT;
    const wd = aT < 98 ? kf(aT, [[0, 0], [0.2, 1, io], [0.3, 0, eo]]) : 0, th = aT < 98 ? back(seg(aT, 0.26, 0.44), 2.4) * (1 - io(seg(aT, 0.62, 1.05))) * ak : 0, dn = dT < 98 ? io(seg(dT, 0.1, 0.95)) : 0, gone = !!o.away || (dT >= 1 && dT < 98);
    for (const q of S.forms) q.root.visible = q === f && !gone;
    const stp = floor(t * 12.5 + 1e-6); f.root.position.set(home[0], F.y - (G.sink || 9.5) * dn, home[2]); f.root.rotation.y = S.face + 0.05 * sin(t * 0.37);
    S.fo = [(fl > 0.25 ? (stp % 2 ? 2 : -2) : 0) + (th > 0.5 ? -2 : 0), (fh < 99 ? Math.round(3.2 * X.sq(fh, 0, 13, 5)) : 0) + (th > 0.5 ? 1 : 0)];   /* utfallet: to hele piksler mot din Pokémon */
    f.add(F.stand[0], F.stand[1]); G.idle(f, t);
    f.add(F.duck, 0.8 * fl + 0.7 * wd + 1.2 * dn); f.add(F.roar, F.rk * th);
    f.eye(0, dn > 0.3 || t % 4.6 < 0.12 ? 0.5 : fl > 0.3 || th > 0.2 ? 0.75 : 0, 0.5);
    /* Blinkene følger trinnene: treffet hvitt, stat opp varmt og ned kaldt (annethvert trinn i 0,45 s), og lysringen uten cutscene: hvit til formen byttes, så ut av det hvite. */
    const sf = sT < 0.45 && stp % 2 ? 0.5 : 0, mw = mT < 98 ? (pr ? 1 - seg(st.pT, 0, 0.6) : io(seg(mT, 0, 0.7))) : 0, hf = fl > 0.25 && stp % 2 ? 0.55 : 0;
    f.set('uStone', 0); f.set('uFlK', max(hf, sf, mw)); f.set('uFlC', mw > 0 || hf >= sf ? '#ffffff' : o.sv < 0 ? '#5a86e0' : '#ffd27a');
    if (G.glow) G.glow(S, f, t, st, pr);
  };
  X.arena = (id, A) => {
    const AID = 'c3:' + id + 'a', AIDF = 'c3:' + id + 'b', FG = A.fig || null, home = A.home;
    const def = fig => ({ len: 1e9, models: fig ? FG.models : A.models || [], env: A.env, edge: A.edge,
      /* Jazz 18.11 (runde 8): bevegelsene i kampen i trinn (12–15 bilder i sekundet) mens arenaen og effektene går jevnt, og figuren står alltid på hele piksler. */
      spr: fig ? { fps: 12.5, since: SINCE } : null,
      make(K, T) {
        const S = A.place(K, T, fig), c = A.cam(fig), aim = fig ? FG.at : A.foe, cp = c.cp, tg = c.tg.slice();
        /* Kameraet står fast: siktet dreies til plassen hennes (home) treffer aim i bildet. Det din Pokémon står på, legges der strålen gjennom plassen dens treffer. */
        for (let i = 0; i < 14; i++) { K.cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], c.fv); const q = K.proj(home[0], 0, home[2]); tg[0] -= (aim[0] - q.x) * c.kq; tg[1] += (aim[1] - q.y) * c.kq; }
        S.cp = cp; S.tg = tg; S.fv = c.fv; K.cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], c.fv); const am = fig ? FG.me : A.me, m = K.ray(am[0], am[1], 0.5); S.me = [m.x, 0.5, m.z];
        if (A.dress) A.dress(S, K, T, fig, m);
        if (fig) { FG.make(S, K, T); S.face = Math.atan2(m.x - home[0], m.z - home[2]) - (FG.turn == null ? 0.36 : FG.turn);   /* trekvart forfra, dreid mot din Pokémon (som motstanderne i Black/White) */
          /* Runde 12 («lyset forfra»): nøkkellyset på figuren kommer fra den retningen den vender (mot din Pokémon), 38° opp, så forsiden er lyst opp. Stedet har lyset sitt som før. */
          for (const f of S.forms) f.set('uKf', [Math.sin(S.face) * 0.785, 0.62, Math.cos(S.face) * 0.785]);
          if (FG.after) FG.after(S, K, T, m); }
        return S; },
      act(S, t, o) { const st = X.state(o); A.state(S, t, o, st); if (fig) X.actor(S, t, o, st, FG, home); },
      shots: [[0, S => { K.cam(S.cp[0], S.cp[1], S.cp[2], S.tg[0], S.tg[1], S.tg[2], S.fv); S.post.vig = 0; if (fig) { S.post.ink2 = FG.ink2 ? FG.ink2(S) : 0.9; S.post.inkz = 0.16;   /* runde 12: strekene inni (FS_SPR trekker fra hellingen, så terskelen er lav og lik for formene) */ } }]] });
    G3D.def(AID, def(0)); if (FG) { G3D.def(AIDF, def(1)); G3D.meF = FG.me; }   /* G3D.meF: filmverkstedet flytter din Pokémon hit når 3D-figuren står i arenaen */
    const d = typeof ARENA !== 'undefined' ? ARENA.defs[id] : null; if (!d) return;
    const sc0 = d.scene, mid0 = d.mid, fr0 = d.front; let on3 = false, lastT = 1e18;
    /* 3D-figuren velges per kamp (S.fig3 fra ARENA.run, satt av kampskjermen når 'b' er klar); G3D.fig3 er bryteren til filmverkstedet. */
    const aid = S => FG && ((S && S.fig3) || G3D.fig3) && G3D.isReady(AIDF) ? AIDF : AID;
    if (FG) d.fig3 = { foe: FG.at, me: FG.me, ok: () => G3D.isReady(AIDF) };
    const scene3 = S => {
      const g = C.g, P = C.P, t = S.t, i3 = aid(S), V = S.val || {}, pT = S.since('primal'), fT = S.since('field'), A3 = G3D.S(i3), fh = G3D.fhAt != null ? (t >= G3D.fhAt ? t - G3D.fhAt : 99) : S.hits.filter(q => q.side !== 'me').map(q => t - q.t).filter(q => q >= 0).sort((a, b) => a - b)[0];   /* G3D.fhAt: filmverkstedet setter tidspunktet for et treff */
      const hs = S.hits.length ? S.hits[S.hits.length - 1] : null, hit3 = hs && A3 ? (hs.side === 'me' ? [A3.me[0], A3.me[2] - 3, t - hs.t] : [home[0], home[2] + 3, t - hs.t]) : null;
      const c = G3D.frame(i3, t, { p2: S.p2, eT: S.since('enter'), fT, rT: S.since('rage'), pT, hit: hit3, fh, aT: S.since('atk'), ak: V.atk, dT: S.since('faint'), sT: S.since('stat'), sv: V.stat, mT: S.since('mega'), away: V.away }, CINE._.rs()); if (!c) return sc0(S);
      const sn = A.back ? A.back(A3, t) : null; g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, 512, 384);
      if (i3 === AIDF) C.cur.sp = null;   /* figuren er 3D-figuren, så Gen 5-bildet tegnes ikke */
      C.cur.fig3 = i3 === AIDF ? G3D.sprite(i3) : null;   /* 3D-figuren som sprite: arena.js legger den oppå etter etterbehandlingen (A.fig3) */
      A.scene(S, A3, sn, { P, fig: i3 === AIDF, fT, pT, id: i3 });
    };
    d.scene = S => { if (S.film) return sc0(S); if (S.t < lastT || !on3) on3 = G3D.isReady(aid(S)); lastT = S.t; return on3 ? scene3(S) : sc0(S); };
    d.ev = d.ev || {}; d.ev.primal = { len: 0.1, cues: [] };
    d.mid = S => !on3 || S.film ? (mid0 ? mid0(S) : null) : aid(S) === AIDF ? null : A.mid ? A.mid(S, mid0) : mid0 ? mid0(S) : null; d.front = S => fr0 ? fr0(S) : null;
  };

  /* ---------- Riggen i dyrets egne akser (2b.4, Fable) ----------
     Posene i K.figure legges på benenes Euler-vinkler, og hva x, y og z gjør, er ulikt i hvert ben og hver modell (på Articunos skulder gjør x og z nesten det samme).
     X.rig(f) måler hvilestillingen én gang og lar skuespillet dreie et ben om en akse gitt i FIGURENS ramme i hvile (X venstre, Y opp, Z fram for modellene fra
     conv.js), uansett hvordan benet selv ligger. En dreining bæres videre av det som er dreid lenger inne i kjeden, så «løft vingen, fei den bakover, vri den»
     skrives i den rekkefølgen og betyr det samme i alle modeller. Benene riggen har rørt, skrives som kvaternioner etter posene (F.late i raid3d.js); resten står.
       rot(ben, akse, vinkel)   dreier benet (og alt utenfor det) om aksen; flere kall på samme ben: det første er ytterst, de neste følger med det
       chain(navn, retninger, vridning)   en kjede (halen) pekes ledd for ledd dit retningene sier (i figurens ramme): den korteste dreiningen for hvert ledd,
                                og så vris leddet om sin egen akse til vridningen (radianer fra roten, per ledd), så et flatt bånd kan vri seg langs lengden
       seg(a, b), pos(n)        retningen fra ben a til ben b, og plassen til et ben, i hvile
       reset()                  nullstiller dreiningene (først i hvert bilde: X.bird.begin gjør det) */
  const bn0 = s => String(s || '').replace(/_\d+$/, '');
  X.rig = f => { const T = G3D.T(), B = {}, tq = new T.Quaternion(), M = new T.Matrix4(), sc = new T.Vector3();
    f.late = null; f.clear(); f.apply(); f.root.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(f.root.matrixWorld).invert(), wq = o => { const p = new T.Vector3(), q = new T.Quaternion(); M.multiplyMatrices(inv, o.matrixWorld).decompose(p, q, sc); return [p, q]; };
    for (const n in f.bones) { const b = f.bones[n], w = wq(b), pw = wq(b.parent); B[n] = { b, p: w[0], PR: pw[1], PRi: pw[1].clone().invert(), L: b.quaternion.clone(), d: null }; }
    const G = { B, pos: n => B[n].p.clone(), seg: (a, b) => B[b].p.clone().sub(B[a].p).normalize(),
      rot(n, ax, ang) { const q = B[n]; if (!q || !ang) return G; tq.setFromAxisAngle(ax, ang); if (q.d) q.d.multiply(tq); else q.d = tq.clone(); return G; },
      chain(names, dirs, tw) { const Dc = new T.Quaternion(), e = new T.Quaternion(), c = new T.Vector3(), N = names.length; let v = null, pt = 0;
        for (let k = 0; k < N; k++) { if (!B[names[k]]) continue; if (k < N - 1 && B[names[k + 1]]) v = G.seg(names[k], names[k + 1]); if (!v || !dirs[k]) continue;
          c.copy(v).applyQuaternion(Dc); e.setFromUnitVectors(c, dirs[k]); const Dk = e.clone().multiply(Dc);
          if (tw) { const dt = (tw[k] || 0) - pt; pt = tw[k] || 0; if (dt) Dk.premultiply(tq.setFromAxisAngle(dirs[k], dt)); }   /* vridningen om leddets egen akse (et bånd som vrir seg) */
          B[names[k]].d = Dc.clone().invert().multiply(Dk); Dc.copy(Dk); } return G; },
      write() { for (const n in B) { const q = B[n]; if (!q.d) continue; q.b.quaternion.copy(q.PRi).multiply(q.d).multiply(q.PR).multiply(q.L); } },
      reset() { for (const n in B) B[n].d = null; return G; } };   /* dreiningene står til reset(), så apply() kan kalles flere ganger i samme bilde */
    f.late = () => G.write(); return G; };

  /* ---------- Flyriggen: én felles for alle som flyr (2b.4, Fable; Jazz 23.11: «se mye på animasjon på flyvinger og bevegelighet») ----------
     X.bird(f, o) bygger på X.rig. o = { fwd, up: kroppens akser i hvile (mot hodet, og ut av ryggen; standard [0, 1, 0] og [0, 0, −1]: en modell som står oppreist),
       mid: kroppens midtpunkt i hvile (roten dreies om det), wing: leddene i en vinge innenfra og ut uten L/R, tail: halekjeden, neck: [[ben, andel, andel av giret]]
       (uten det tredje tallet er giret fordelt som stigningen),
       keep: [[ben, andel]] det som henger på nakkens ben, men skal bli liggende inntil kroppen når nakken bøyes (Articunos brystfjær, Jazz 24.11: «magen stikker ut»),
       leg: [[ben, vinkel når beina er trukket inn]], poses: { navn: { fw, di, tw } }, og vingeslagets tall per ledd (grader) }.
     En VINGE beskrives per segment (fra et ledd til det neste) med tre vinkler, i kroppens egne mål: fw = hvor langt fram segmentet peker i vingeplanet (0 = rett ut,
     minus = feid bakover), di = hvor høyt over vingeplanet (opp av ryggen), tw = vridningen (pluss = forkanten ned). Stillingene (glid, sammenlagt, oppreist) er slike
     tabeller, og 'rest' er modellens egen hvilestilling. Riggen regner om til dreininger i leddene, likt for begge sider.
     VINGESLAGET (pose) legges oppå stillingene, og er det som gjør at den flyr som en fugl:
       · bølgen går utover: hvert ledd følger skulderen litt forsinket (lag), og utslaget vokser utover (fa), så spissen henger igjen og pisker etter
       · oppslaget: vingen bøyes i albuen og håndleddet (fold: ff feier, fd senker hånda, fq vrir forkanten opp), og er strukket ut igjen før nedslaget starter
       · nedslaget går ned og fram, oppslaget opp og bakover (fs), og forkanten vris ned i nedslaget (ft)
       · u er slaget (0 = toppen, 0,5 = bunnen, 1 = toppen igjen); X.bird.warp gjør nedslaget lengre enn oppslaget
     KROPPEN (place) settes med hodet langs fw og ryggen langs up om midtpunktet; heave gir løftet (kroppen løftes gjennom nedslaget og synker i oppslaget),
     neck holder hodet (stigning, rull og gir, fordelt på nakkeleddene), legs trekker beina inn, og tail peker halekjeden (og vrir den).
     HALEN er artens egen (c3/<art>.js): Articunos er et langt, flatt bånd som bølger, vrir seg og henger etter (Jazz 24.11: «Halen må være bevegelig slik som den er ment å være»). */
  X.bird = (f, o) => { const T = G3D.T(), R = X.rig(f), V3 = a => new T.Vector3(a[0], a[1], a[2]), DG = PI / 180, W = o.wing, n = W.length;
    const F0 = V3(o.fwd || [0, 1, 0]).normalize(), U0 = V3(o.up || [0, 0, -1]).normalize(), L0 = new T.Vector3().crossVectors(U0, F0).normalize(), Z0 = U0.clone().negate(), MID = V3(o.mid || [0, 2.3, 0]);
    const side = s => { const pre = s > 0 ? 'L' : 'R', J = [];
      for (let i = 0; i < n; i++) { const a = i < n - 1 ? R.seg(pre + W[i], pre + W[i + 1]) : J[i - 1].a.clone();
        J.push({ n: pre + W[i], a, c: new T.Vector3().crossVectors(a, U0).normalize(), al: Math.atan2(a.dot(F0), a.dot(L0) * s), be: Math.asin(max(-1, min(1, a.dot(U0)))) }); }
      return { s, J, us: U0.clone().multiplyScalar(s) }; };
    const SD = [side(1), side(-1)], deg = (a, d) => (a || d || new Array(n).fill(0)).map(v => v * DG), zero = new Array(n).fill(0);
    const PO = { rest: { fw: SD[0].J.map(j => j.al), di: SD[0].J.map(j => j.be), tw: zero } };
    for (const k in o.poses || {}) PO[k] = { fw: deg(o.poses[k].fw), di: deg(o.poses[k].di), tw: deg(o.poses[k].tw) };
    const lag = o.lag || zero, FA = o.fa || zero, FM = o.fm || zero, FS = o.fs || zero, FT = o.ft || zero, FF = deg(o.ff), FD = deg(o.fd), FQ = deg(o.fq), HA = o.ha || zero, HD = o.hd || zero, HT = o.ht || zero;
    const bump = x => x <= 0 || x >= 1 ? 0 : Math.pow(sin(PI * Math.pow(x, 0.8)), 1.5);   /* foldingen i oppslaget: mest tidlig, og strukket ut igjen før toppen */
    const m0 = new T.Matrix4().makeBasis(L0, U0, F0).transpose(), m1 = new T.Matrix4(), vx = new T.Vector3(), vy = new T.Vector3(), vz = new T.Vector3(), qi = new T.Quaternion();
    const B = { rig: R, F0, U0, L0, n, poses: PO, begin() { R.reset(); return B; },   /* kalles først i hvert bilde */
      /* Stillingen til én vinge (k: 0 venstre, 1 høyre). st = { u, A: utslaget i radianer (opp og ned), Ah: slaget i den oppreiste stillingen (langs kroppen),
         fold: hvor mye den bøyes i oppslaget (0–1), w: { stilling: vekt }, asym: det ytre vingeslaget dypere i en sving (−1…1), ex: { fw, di, tw } lagt til alle ledd } */
      pose(st, k) { const P = { fw: [], di: [], tw: [] }, w = st.w || { rest: 1 }, A = st.A || 0, Ah = st.Ah || 0, fo = st.fold || 0, as = 1 + (k ? 1 : -1) * (st.asym || 0), ex = st.ex || {}, u0 = st.u || 0;
        for (let i = 0; i < n; i++) { let fw = ex.fw || 0, di = ex.di || 0, tw = ex.tw || 0;
          for (const key in w) { const q = PO[key], x = w[key]; if (!q || !x) continue; fw += q.fw[i] * x; di += q.di[i] * x; tw += q.tw[i] * x; }
          const u = u0 - lag[i], c = cos(TAU * u), s1 = sin(TAU * u), fb = bump((((u % 1) + 1) % 1 - 0.5) / 0.47);
          di += A * as * (FA[i] * c + FM[i]) + fo * fb * FD[i] + Ah * HD[i] * c;
          fw += -A * FS[i] * cos(TAU * (u0 - lag[0])) + fo * fb * FF[i] + Ah * HA[i] * c;
          tw += A * FT[i] * s1 + fo * fb * FQ[i] + Ah * HT[i] * s1;
          P.fw.push(fw); P.di.push(di); P.tw.push(tw); }
        return P; },
      /* Setter begge vingene fra en stilling per side (eller samme på begge). */
      wings(Pl, Pr) { for (let k = 0; k < 2; k++) { const S = SD[k], Q = k ? Pr || Pl : Pl; let pc = 0, pd = 0, pt = 0;
          for (let i = 0; i < n; i++) { const j = S.J[i], cs = j.al - Q.fw[i], cd = Q.di[i] - j.be, ct = Q.tw[i] * S.s; R.rot(j.n, j.c, cd - pd); R.rot(j.n, S.us, cs - pc); R.rot(j.n, j.a, ct - pt); pc = cs; pd = cd; pt = ct; } } return B; },
      flap(st) { return B.wings(B.pose(st, 0), B.pose(st, 1)); },
      /* Kroppens midtpunkt i p (verden), hodet mot fw, ryggen mot up (rettes vinkelrett på fw). sc = figurens skala. */
      place(p, fw, up, sc) { vz.copy(fw).normalize(); vx.crossVectors(up, vz).normalize(); vy.crossVectors(vz, vx); m1.makeBasis(vx, vy, vz).multiply(m0); f.root.quaternion.setFromRotationMatrix(m1);
        f.root.position.copy(MID).multiplyScalar(sc || f.root.scale.x).applyQuaternion(f.root.quaternion).negate().add(p); return B; },
      /* En retning i verden → figurens ramme (til tail og look). */
      local(v) { return v.clone().applyQuaternion(qi.copy(f.root.quaternion).invert()); },
      /* Løftet i vingeslaget (−1…1): lavest like etter toppen, stiger gjennom nedslaget, høyest like etter bunnen. */
      heave(u) { return -cos(TAU * (u - 0.12)); },
      /* Nakken: pitch = hodet løftes mot kroppens framretning (radianer; rundt 1,4 når kroppen ligger vannrett og hodet skal se fram), roll = hodet rulles om nebbets
         akse (holder hodet vannrett i en sving), yaw = til siden. Fordelt på leddene i o.neck. */
      neck(pitch, roll, yaw) { for (const [bn, w, wy] of o.neck || []) { R.rot(bn, L0, -pitch * w); if (yaw) R.rot(bn, F0, yaw * (wy == null ? w : wy)); } const h = o.neck && o.neck[o.neck.length - 1][0]; if (h && roll) R.rot(h, Z0, roll);
        for (const [bn, w] of o.keep || []) R.rot(bn, L0, pitch * w); return B; },   /* o.keep: det som henger på nakken, men skal ligge inntil kroppen (brystfjærene): dreies tilbake med andelen w av nakkens stigning */
      legs(k) { for (const [bn, a] of o.leg || []) { R.rot('L' + bn, L0, a * DG * k); R.rot('R' + bn, L0, a * DG * k); } return B; },
      tail(dirs, tw) { R.chain(o.tail, dirs, tw); return B; } };
    return B; };
  /* Nedslaget tar lengre tid enn oppslaget: ph (0–1, jevnt i tid, 0 = toppen) → u (0,5 = bunnen etter andelen ds av slaget). */
  X.bird.warp = (ph, ds) => { ph = ((ph % 1) + 1) % 1; ds = ds || 0.56; return ph < ds ? 0.5 * ph / ds : 0.5 + 0.5 * (ph - ds) / (1 - ds); };
  return X;
})();
