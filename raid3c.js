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
  const X = { ARTS: [383, 382], snd: {}, sfx: [], base: 'c3/' }, jobs = {};
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

  /* ---------- Brølet ---------- (Jazz 18.11: «ikke tykke streker»): tynne gnister ut fra kjeften, lydbølger som brer seg fra den (forvrengningsringer i fxgl.js) og
     et rykk i bildet. mouth(S, f, t0, t) i kameraet som filmer brølet: f = figuren, t0 = når brølet startet, S.rw = hvor åpent (0–1). Kjeften er rollen 'Jaw'. */
  X.mouth = (S, f, t0, t, len) => { const j = f.at('Jaw'), m = K.proj(j.x, j.y, j.z); S.post.spx = m.x / 2; S.post.spy = m.y / 2; S.post.spr = 0.1; S.post.spd = 0.9 * S.rw * hit(t, t0, len || 2.4); S.mouth = m; };
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
  X.reg = (id, d) => { const inf = G3D.info(id), ink = d.skin ? skinOf(d.skin).ink : null; C.film(id, { len: inf.len, R: inf.R, at: inf.at, hold: inf.hold, c3: 1, gl: 1, spid: d.spid, swirl: d.swirl, outc: '#ffffff', cues: d.cues, pre: () => G3D.ready(id),
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
  return X;
})();
