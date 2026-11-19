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
  const TL = { pre: 214.9, cut: 223.72, stab: 224.55, gap: 225.42, slam: 226.15, riser: 264.2, drop: 266.1, b0: 226.15, pulse: 0.8, end: 293.32, hole: [280.54, 281.06] };
  /* Hvor i låta vi er (kampen): låta som spiller, ellers filmverkstedets klokke (G3D.mus), ellers −1. */
  const musNow = t => { if (typeof G3D.mus === 'function') return G3D.mus(t); try { return typeof PACK !== 'undefined' && PACK.tlOf(PACK.track()) ? PACK.pos() : -1; } catch (_) { return -1; } };

  /* ---------- Figurene ----------
     'kyogre' og 'kyogre_primal' er Jazz sin nedlasting fra Omega Ruby / Alpha Sapphire (3DS). Den vanlige formen har to lag med linjer som gløder (BodyAInc,
     BodyBInc): de tegnes som linjemasker oppå (røde linjer, sterkere når den er sint), ellers ble finnene svarte. Primal har linjemasken BodyCMask (lyseblå
     linjer som lyser) og de runde flekkene BodyBInc og BodyBInc2 (gule og oransje) som lyser selv. Primal er 1,66 ganger så stor som den vanlige formen. */
  const KS = 1.45, PS = 0.62;   /* skalaen (Kyogre skal føles enorm) og hvor mye Primal krympes i kampen, så formene er like store der (regelen fra Groudon) */
  const kyFig = o => { const f = K.figure(K.model('kyogre'), Object.assign({ rules: [[/Inc$/, { mask: 1 }]] }, o)); f.root.rotation.order = 'YXZ'; f.root.scale.setScalar(KS); lines(f, 0.7, 0); return f; };
  const kypFig = o => { const f = K.figure(K.model('kyogre_primal'), Object.assign({ rules: [[/^BodyBInc/, { emis: 0.85 }]] }, o)); f.root.rotation.order = 'YXZ'; f.root.scale.setScalar(KS); lines(f, 1, 1); return f; };
  /* Linjene: v = hvor sterkt (0,7 = som teksturen, over 1 = gløder), p = Primal (lyseblå) eller vanlig (rød). */
  const lines = (f, v, p) => { const m = f.mats.mask; if (!m) return; m.uniforms.uCrack.value = v; if (p) m.uniforms.uCrackC.value.setRGB(mix(0.42, 0.75, c01(v - 1)), mix(0.86, 1, c01(v - 1)), 1); else m.uniforms.uCrackC.value.setRGB(mix(0.82, 1, c01(v - 0.8)), mix(0.16, 0.45, c01(v - 1.2)), mix(0.2, 0.3, c01(v - 1))); };
  /* Posene (akseprøven 19.11: Jaw y− åpner, Neck/Head y− løfter hodet, '*Shoulder' z+ løfter finnene og z− senker dem, Hips y− løfter halen, Tail1 y+ løfter halefinnene). */
  const ROAR = { Neck: [0, -0.32, 0], Head: [0, -0.22, 0], Jaw: [0, -0.9, 0], '*Shoulder': [0, 0, 0.32], '*Arm': [0.25, 0, 0.1], Hips: [0, 0.12, 0], Tail1: [0, -0.15, 0] };
  const DUCK = { Neck: [0, 0.2, 0], Head: [0, 0.14, 0], Jaw: [0, -0.15, 0], '*Shoulder': [0, 0, -0.25], Hips: [0, -0.1, 0] };
  const DIVE = { Neck: [0, 0.3, 0], Head: [0, 0.2, 0], '*Shoulder': [0, 0, -0.35], '*Arm': [0, 0, -0.15], Hips: [0, -0.55, 0], Tail1: [0, 0.35, 0], Tail2: [0, 0.3, 0] };
  const SWIM = (f, t, k, sp) => { const w = t * (sp || 2.2); f.add({ '*Shoulder': [0, 0, 0.32 * sin(w) * k], '*Arm': [0, 0, 0.14 * sin(w - 0.6) * k], Hips: [0, 0.1 * sin(w + 1.2) * k, 0], Tail1: [0, 0.16 * sin(w + 0.4) * k, 0], Tail2: [0, 0.16 * sin(w - 0.3) * k, 0] }, 1); };
  const BREACH = { Neck: [0, -0.2, 0], Head: [0, -0.12, 0], '*Shoulder': [0, 0, 0.42], '*Arm': [0.35, 0, 0.12], Hips: [0, 0.18, 0], Tail1: [0, -0.2, 0], Tail2: [0, -0.2, 0] };

  /* ---------- Stedet: stormhavet ----------
     Havet er arenaens materiale (K.ground('sea')): dønninger med skum på toppene, vindstriper og regnringer. En kystlinje av mørke klipper bak, sjøstakker ute i havet der
     bølgene slår inn og spruter opp (hver gang en topp når steinen), og himmelen er 2D bak (backdrop). k = stormen (1 = storm, 2 = Primordial Sea). */
  const STACKS = [[-46, -38, 5.5, 15, 3], [-70, -8, 4.2, 11, 7], [58, -52, 6.5, 19, 11], [84, -14, 3.6, 9, 13], [-24, -96, 8, 24, 17], [30, -118, 9, 26, 19]];
  const seaPar = { swell: 1.15, chop: 1.3, foam: 0.95, rain: 0.8, wind: [0.35, 1, 1.05], deep: '#020f18', shal: '#0d4a58', skyA: '#4a6274', skyB: '#0a121e', foamC: '#e2eef4', seg: 200 };
  /* Når toppen av den store dønningen sist var ved (x, z): samme regning som SEA_H (raid3d.js), bare det største leddet. */
  const crestAt = (u, x, z, t) => { const W = u.uWind.value, dl = Math.hypot(W.x + 1e-4, W.y) || 1, dx = (W.x + 1e-4) / dl, dz = W.y / dl, a = x * dx + z * dz, b = -x * dz + z * dx, sp = W.z,
    ph = a * 0.085 + b * 0.021 - t * 0.62 * sp + 1.3 * sin(b * 0.017 + t * 0.13), d = ((PI / 2 - ph) % TAU + TAU) % TAU; return t - d / (0.62 * sp); };
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
      { t0: -1e5, shade: 1, g: 16, drag: 0.6, px: 70, sz0: 0.5, sz1: 1.6, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.55, fade: 0.55, floor: -1 });
    S.sprays = S.stacks.map((m, i) => add(spray(90, STACKS[i][2], 9 + STACKS[i][3] * 0.9, 40 + i * 7), m.position.x, 0, m.position.z));
    /* Lyset fra lynet i 3D: et blink over havet der det slår ned (lys som legges oppå). */
    S.flash = add(K.light(1, '#cfe2ff', { depth: false })); S.flash.renderOrder = 6; S.flash.visible = false;
    S.fx = (pts, t0, x, y, z) => { if (x != null) pts.position.set(x, y, z); pts.material.uniforms.uT0.value = t0; };
    return S;
  }
  /* Havet for hvert bilde: stormen (k), lynet (fl: 0–1, hvor hele himmelen lyser) og sprutet ved steinene. */
  const seaAct = (S, t, k, fl) => {
    const u = S.sea.material.uniforms, kk = max(0, k - 1); u.uSea.value.set((1.15 + 0.62 * kk) * (S.calm || 1), 1.3 + 0.7 * kk, 0.95 + 0.4 * kk, min(1, 0.8 + 0.25 * kk)); u.uWind.value.set(0.35, 1, 1.05 + 0.4 * kk, 0);
    lerpC(u.uSkyA, '#4a6274', '#d2e4ff', fl); lerpC(u.uSkyB, '#0a121e', '#40557a', fl); lerpC(u.uDeep, '#020f18', '#0a2a3a', fl * 0.6); u.uBri.value = 1 + 0.35 * fl;
    S.stacks.forEach((m, i) => { const t0 = crestAt(u, m.position.x, m.position.z, t); S.fx(S.sprays[i], t0); S.sprays[i].material.uniforms.uPx.value = 70 * (0.8 + 0.35 * kk); });
  };
  /* Lynene: [når, styrke, retning i verden (radianer fra −Z), frø]. rate = lyn per sekund. Et lyn blinker to–tre ganger (som ekte lyn). */
  const strikes = (t, rate, sd, span) => { const per = 1 / max(0.02, rate), q = floor(t / per), out = []; for (let j = q - 2; j <= q; j++) { if (rnd(j, sd) < 0.18) continue; out.push([j * per + rnd(j, sd + 1) * per * 0.85, 0.55 + 0.45 * rnd(j, sd + 2), (rnd(j, sd + 3) - 0.5) * (span || 2.4), j * 7 + sd]); } return out; };
  const flick = d => d < 0 ? 0 : d < 0.05 ? 1 : d < 0.1 ? 0.3 : d < 0.17 ? 0.9 : d < 0.24 ? 0.25 : max(0, 1 - (d - 0.24) / 0.4) * 0.55;
  const flashOf = L => L.reduce((s, q) => max(s, flick(q.d) * q.k), 0);

  /* ---------- Himmelen (2D bak 3D-bildet) ----------
     Mørk stormhimmel som er lysest ved horisonten, tunge skyer som driver, en hyllesky lavt over havet (referansen), og lynet: grener fra skybasen ned i havet i det fjerne,
     og skyene som lyser innenfra der det slår ned. Tegnes i vinkelmål rundt horisonten (UR enheter per radian) og festes til 3D-kameraet (G3D.view). Under vann: dypet. */
  const UR = 560, wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  const backdrop = (S, t) => {
    const g = C.g, v = G3D.view(), k = v.ppr / UR, bl = C.blend, L = S.L || [], fl = S.fl || 0, dark = S.dark || 0;
    if (S.under) { const gr = g.createLinearGradient(0, 0, 0, 384), u = S.under; gr.addColorStop(0, bl('#02101c', '#0c4a66', u)); gr.addColorStop(0.5, '#020a12'); gr.addColorStop(1, '#000306'); g.fillStyle = gr; g.fillRect(0, 0, 512, 384); return { hz: -999, under: 1 }; }
    g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
    const gr = g.createLinearGradient(0, -UR * 1.1, 0, 12); gr.addColorStop(0, '#020407'); gr.addColorStop(0.55, bl('#070c13', '#1a2840', fl)); gr.addColorStop(0.86, bl('#141e2a', '#4a6488', fl)); gr.addColorStop(1, bl('#26343f', '#8aa6c8', fl * (1 - 0.4 * dark)));
    g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 4014); g.fillStyle = bl('#141c24', '#506884', fl); g.fillRect(-4000, 12, 8000, 4000);
    /* Skyene: mørke klumper i flere lag som driver med vinden; de lyser opp nedenfra der lynet slår ned. */
    for (let i = 0; i < 30; i++) { const x = wrap(rnd(i, 3) * TAU + t * (0.006 + rnd(i, 4) * 0.008) - v.yaw) * UR, y = -(24 + Math.pow(rnd(i, 5), 1.4) * 300), r = 80 + rnd(i, 6) * 120; if (abs(x) > 820) continue;
      C.blob(x, y, r, bl('#0a0f16', '#1c2a3c', fl * 0.8), 0.88, 0, 0.4); let lit = 0; for (const q of L) { const dx = abs(wrap(q.a - v.yaw) * UR - x); lit = max(lit, flick(q.d) * q.k * Math.exp(-dx * dx / 90000)); } if (lit > 0.02) C.blob(x, y + r * 0.2, r * 0.9, '#a8c4ff', 0.55 * lit, 1, 0.42); }
    /* Hyllesyken: et bredt, mørkt bånd lavt over havet med en lysere underkant. */
    for (let i = 0; i < 16; i++) { const x = wrap(rnd(i, 23) * TAU + t * 0.004 - v.yaw) * UR, r = 150 + rnd(i, 24) * 120; if (abs(x) > 900) continue; C.blob(x, -46 - rnd(i, 25) * 26, r, '#05090e', 0.82, 0, 0.22); C.blob(x, -30, r * 0.8, bl('#2a3846', '#7f9cc4', fl), 0.22 + 0.3 * fl, 1, 0.08); }
    /* Regnet som henger som slør under skyene i det fjerne. */
    for (let i = 0; i < 10; i++) { const x = wrap(rnd(i, 33) * TAU + t * 0.01 - v.yaw) * UR; if (abs(x) > 820) continue; const gr2 = g.createLinearGradient(0, -60, 0, 4); gr2.addColorStop(0, 'rgba(70,90,110,0)'); gr2.addColorStop(1, 'rgba(70,90,110,.35)'); g.fillStyle = gr2; g.fillRect(x - 40 - rnd(i, 34) * 60, -60, 60 + rnd(i, 35) * 90, 64); }
    g.restore();
    /* Lynet i det fjerne: fra skybasen ned i havet (i skjermens mål, så strekene er like tynne uansett kamera). */
    for (const q of L) { const a = flick(q.d) * q.k; if (a < 0.05 || q.near) continue; const X0 = v.x + wrap(q.a - v.yaw) * v.ppr; if (X0 < -60 || X0 > 572) continue;
      const top = v.y - 0.32 * v.ppr, bot = v.y + 1; C.bolt(X0 + (rnd(q.s, 41) - 0.5) * 40, top, X0, bot, { seed: q.s * 3 + (q.d > 0.12 ? 1 : 0), col: '#9fc0ff', core: '#ffffff', w: 1.6, a, br: 3, depth: 5 }); C.blob(X0, bot, 60, '#cfe0ff', 0.45 * a, 1, 0.3); }
    return { hz: v.y };
  };
  /* Stedets etterbehandling: kjølig, mørkt og vått, med glød i skum og lyn. */
  const look = (S, t, P, q, sn) => {
    const fl = S.fl || 0, u = S.under || 0; P.bloom = 0.32 + 0.3 * fl + 0.25 * (S.glo || 0); P.bloomT = 0.7; P.grain = 0.04; P.vig = 0.42 + 0.3 * q.vig + 0.2 * u; P.vigc = u ? '#000710' : '#01050a';
    P.grade = { tint: u ? [0.85, 1, 1.12] : [0.95, 1, 1.05], con: 1.1, sat: 1.06, exp: 1.06 + 0.22 * fl };
    if (S.rays) P.rays = S.rays;
  };
  /* Regn foran kameraet (2D, på skrå med vinden) og lynet nær kameraet, oppå 3D-bildet. */
  const rainFx = (S, t, k, a) => { if (a <= 0.01) return; C.parts('rain', { n: floor(40 + 50 * k), seed: 12, cols: ['#a8c4d8', '#dcebf4'], a: 0.55 * a, spd: 1.2 + 0.4 * k, wind: -0.7 - 0.35 * k, z: [0.45, 1] }); };
  const nearBolt = (x, yTop, x1, y1, a, sd, w) => { if (a <= 0.03) return; C.bolt(x, yTop, x1, y1, { seed: sd, col: '#b8d4ff', core: '#ffffff', w: w || 3, a, br: 4, depth: 6 }); C.blob(x1, y1, 160, '#e0ecff', 0.7 * a, 1, 0.35); };

  /* ---------- Introen: kraken (låtas åpning) ----------
     Jazz 19.11 («han er litt for underveldende til at grafikken er så mye bedre»): det langsomme kraken-øyeblikket. Primal-forvandlingen er det eksplosive (breachen).
     (1) Stormhav om natta sett ovenfra: en enorm skygge med røde linjer glir under overflaten, rett under kameraet, mens den første dønningen i låta ruller.
     (2) Lynet slår ned (7,66): et lavt, vidt bilde der lyset viser hvor stor skyggen er, mellom sjøstakkene der bølgene slår inn.
     (3) Ryggen stiger som en øy (fra 13,2): vannet renner av, finnene bryter flaten på hver side, hodet løftes med messingen (16,9).
     (4) Øyet åpner seg på slaget (20,06), i nærbilde, med lyn som speiles.
     (5) Brølet på 23,03 der hoveddelen av låta starter: lyn over hele himmelen, og navnet kommer opp. Venter på Continue.
     Filmens tid = låtas tid − IA. */
  const IA = 0.4, ib = x => Math.round((x - IA) * 100) / 100;
  const IH = [ib(1.0), ib(4.57), ib(7.66), ib(9.08), ib(10.73), ib(13.2), ib(16.9), ib(20.06), ib(23.03)], IR = IH[8];
  const HOME = [0, 0, 0], HY = -0.55;   /* der Kyogre ligger i havet (roten), og høyden: ryggen over vannet, buken under */
  G3D.def('c3:382', {
    len: IR + 1.7, hold: 1, R: IR, at: IA, models: ['kyogre'], edge: 'sea', env: { rim: '#a8c8ff', glow: '#2a6c9a', fog: '#16222e', glowH: 3 },
    make(K, T) { const S = storm(T), g = S.gr = kyFig(); S.scene.add(g.root); S.figs.push(g);
      S.drip = K.pts(70, i => ({ p: [(rnd(i, 90) - 0.5) * 18, 0.5 + rnd(i, 91) * 2.5, (rnd(i, 92) - 0.5) * 12], v: [(rnd(i, 93) - 0.5) * 2, -0.5, (rnd(i, 94) - 0.5) * 2], b: rnd(i, 95) * 1.2, l: 0.8 + rnd(i, 96) * 0.6, z: 0.6 + rnd(i, 97) * 0.9 }), { loop: 1, shade: 1, g: 14, px: 60, c: ['#eaf6ff', '#a8c4d8', '#5a7486'], a: 0.8, fade: 0.8, floor: -0.5 }); S.scene.add(S.drip);
      S.wash = K.pts(120, i => { const a = rnd(i, 81) * TAU, r = 6 + rnd(i, 82) * 7; return { p: [cos(a) * r, 0.2, sin(a) * r * 0.7], v: [cos(a) * (3 + rnd(i, 83) * 5), 3 + rnd(i, 84) * 6, sin(a) * (3 + rnd(i, 85) * 5)], b: rnd(i, 86) * 2.5, l: 1.4 + rnd(i, 87), z: 1.5 + rnd(i, 88) * 2.5 }; }, { t0: -1e5, shade: 1, g: 9, drag: 0.8, px: 60, sz0: 0.8, sz1: 2.2, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.75, fade: 0.5, floor: -1 }); S.scene.add(S.wash);
      return S; },
    act(S, t, o) {
      const g = S.gr, U = K.U(), su = S.sea.material.uniforms, out = o.out || 0;
      /* Stormen bygger seg opp, og lynet kommer på slagene i låta (pluss litt i det fjerne). */
      const k = 1 + 0.25 * seg(t, IH[5], IH[7]) + 0.35 * seg(t, IR, IR + 0.6), L = [];
      for (const q of strikes(t, 0.16 + 0.25 * seg(t, IH[2], IR), 61)) L.push({ d: t - q[0], k: q[1] * 0.7, a: q[2] - 0.2, s: q[3] });
      for (const [tb, kk, a, s] of [[IH[1], 0.5, 0.9, 71], [IH[2], 1, -0.3, 72], [IH[3], 0.7, 0.4, 73], [IH[4], 0.75, -0.7, 74], [IH[7], 0.9, 0.2, 75], [IR, 1, -0.15, 76], [IR + 0.35, 1, 0.55, 77], [IR + 0.7, 0.9, -0.6, 78]]) L.push({ d: t - tb, k: kk, a, s, near: tb === IH[2] || tb >= IR });
      S.L = L; const fl = flashOf(L); S.fl = fl;
      seaAct(S, t, k, fl);
      /* Kyogre: under vann som en skygge (1–2), stiger som en øy (3), øyet (4), brølet (5). */
      const rise = io(seg(t, IH[5], IH[6] + 1.6)), up = eo(seg(t, IH[6], IH[7])), y = mix(-9.5, HY, rise), drift = 1 - io(seg(t, 0, IH[5]));
      const px = mix(-34, 0, io(seg(t, 0, IH[5] + 1))), pz = mix(30, 0, io(seg(t, 0, IH[5] + 1)));
      g.root.position.set(HOME[0] + px * drift, y, HOME[2] + pz * drift); g.root.rotation.set(0.04 * sin(t * 0.7) * (1 - rise), -0.85 + 0.45 * io(seg(t, 0, IH[6])), 0.03 * sin(t * 0.5));
      SWIM(g, t, 0.9 * (1 - rise) + 0.25, 1.4);
      g.add({ Neck: [0, -0.18 * up, 0], Head: [0, -0.1 * up, 0] }, 1);
      const r2 = t < IR ? 0 : back(seg(t, IR, IR + 0.3), 2.4) * (1 - 0.35 * io(seg(t, IR + 1.6, IR + 2.4))) * (1 - out), dk = kf(t, [[IR - 1.1, 0], [IR - 0.12, 1, io], [IR + 0.04, 0, eo]]);
      g.add(DUCK, dk); g.add(ROAR, r2); g.rot('Jaw', 0, 0.04 * sin(t * 57) * r2, 0); S.rw = r2; S.mouth = null;
      /* Øynene: lukket til slaget (20,06), så åpne, smale i brølet. Linjene gløder rødt under vann og sterkere når den våkner. */
      g.eye(0, t < IH[7] ? 0.5 : t > IR - 0.3 && t < IR + 3 ? 0.75 : 0, t < IH[7] ? 0 : 0.6);
      lines(g, 0.75 + 0.9 * (1 - rise) * (0.6 + 0.4 * sin(t * 2.2)) + 0.6 * hit(t, IH[7], 0.6) + 0.5 * r2, 0);
      /* Skyggen under overflaten (kraken): stor, mørk, med finnene, og et rødt skjær fra linjene. Den går over i selve kroppen når den stiger. */
      const yaw = g.root.rotation.y, sh = (1 - io(seg(t, IH[6] - 0.5, IH[7]))) * (0.85 + 0.15 * fl);
      su.uBody.value.set(g.root.position.x, g.root.position.z, 13 * KS / 1.45, sh); su.uBodyD.value.set(sin(yaw), cos(yaw), 6.5 * KS / 1.45, 1);
      su.uGlo.value.set(g.root.position.x, g.root.position.z, 9, 0.22 * (1 - rise) * (0.6 + 0.4 * sin(t * 2.2))); su.uGloC.value.set(0.9, 0.12, 0.14);
      su.uWade.value.set(HOME[0], HOME[2], 13, 0.95 * rise);
      const ring = (i, t0, v, d, a) => su.uRing.value[i].set(HOME[0], HOME[2], 3 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
      ring(0, IH[5] + 0.6, 7, 3, 0.9); ring(1, IH[6], 9, 2.5, 0.9); ring(2, IR, 22, 1.8, 1); ring(3, IH[7], 6, 1.6, 0.7);
      S.fx(S.wash, IH[5] + 0.8, HOME[0], 0, HOME[2]); S.drip.position.set(HOME[0], y + 0.6, HOME[2]); S.drip.visible = rise > 0.2; S.drip.material.uniforms.uPx.value = 70 * rise;
      /* Lyset: kaldt og mørkt, blått kantlys, og lynet som lyser opp alt. */
      lerpC(U.uKeyC, '#5a6c80', '#e8f2ff', fl); lerpC(U.uShC, '#0a141e', '#3a4c66', fl); U.uRimK.value = 0.85; U.uGlow.value = 0.25; U.uFog.value.set(40, 320, 0.88); lerpC(U.uFogC, '#121c26', '#5a7090', fl);
      S.flash.visible = false; S.k = k; S.glo = 0;
    },
    shots: [
      /* 1 Ovenfra: skyggen glir under overflaten mot kameraet og under det. */
      [0, (S, u, a, t) => { const e = io(u); K.cam(mix(-6, 4, e), mix(26, 22, e), mix(36, 18, e), mix(-16, -2, e), -2, mix(6, 0, e), 50, 0.06); S.post.fade = 1 - seg(t, 0, 1.2); S.post.sh = 0.6 * hit(t, IH[1], 0.8); }],
      /* 2 Lynet slår ned: lavt og vidt mellom sjøstakkene; skyggen er enorm i lyset. */
      [IH[2] - 0.03, (S, u, a, t) => { const e = io(u); K.cam(mix(18, 12, e), 4.2, mix(52, 46, e), mix(-6, -2, e), 0, -8, 52, -0.03); S.post.sh = 2.4 * hit(t, IH[2], 0.6) + 1.2 * hit(t, IH[3], 0.4) + 1.4 * hit(t, IH[4], 0.4); }],
      /* 3 Ryggen stiger som en øy: lavt ved vannet, kameraet glir sakte inn. */
      [IH[5] - 0.4, (S, u, a, t) => { const e = io(u); K.cam(mix(12, 7, e), mix(2.2, 3.2, e), mix(30, 22, e), 0, mix(-1, 2.5, e), 0, 46, 0.02); S.post.sh = 0.6 * seg(t, IH[5], IH[6]) + 1.2 * hit(t, IH[6], 0.8); }],
      /* 4 Øyet åpner seg på slaget, i nærbilde fra siden. */
      [IH[7] - 0.35, (S, u, a, t) => { const h = S.gr.at('Head'), j = S.gr.at('Jaw'); K.cam(h.x + 9 - u * 1.5, h.y + 2.6, h.z + 7.5, mix(h.x, j.x, 0.3), h.y + 0.6, mix(h.z, j.z, 0.3), 28); S.post.sh = 1.6 * hit(t, IH[7], 0.5); S.post.fl = 0.4 * hit(t, IH[7], 0.15); S.post.flc = '#e8f2ff'; S.post.vig = 0.9; }],
      /* 5 Brølet: lavt og vidt, lyn over hele himmelen, navnet. Kameraet glir sakte mens den venter. */
      [IR - 1.3, (S, u, a, t) => { const k = io(seg(t, IR - 1.3, IR)), w = 0.05 * sin(max(0, t - IR) * 0.25); K.cam(mix(15, 12, k) + w * 4, 2.4, mix(30, 26, k), -2, mix(1.5, 3.5, k), 0, 50, -0.03);
        S.post.fl = max(0.45 * hit(t, IR, 0.12), 0.3 * hit(t, IR + 0.35, 0.1)); S.post.flc = '#eef6ff'; S.post.sh = 4 * hit(t, IR, 1.2) + 0.6 * S.rw; }],
    ],
  });

  /* ---------- Primal Reversion, på låta (Jazz 19.11) ----------
     Cutscenens tid 0 er crashet i oppbyggingen (tl.pre, 3:34,9), og låta hoppes dit når den starter (primalCut i bui.js), så hvert øyeblikk treffer:
     (1) han stuper på crashet: hodet ned, halen opp, og et sprut (0)
     (2) under vann: han synker ned i mørket, og langt nede lyser noe opp (α, svakt) på neste crash (G, 3:39,8)
     (3) han snur ved lyset og svømmer opp mot kameraet med linjene lysende (U, riseren 3:42,4), som skapningen i Subnautica
     (4) kuttet i låta (C, 3:43,72): stillhet over vannet; havet lyser blått nedenfra og en enorm skygge stiger under flaten
     (5) slaget (S, 3:44,55): breachen, rett opp av havet i en søyle av sprut, som orcaen og hvalen i referansene; i stillheten (A) henger han i lufta og begynner å brøle
     (6) phase 2 smeller inn (L, 3:46,15): han slår ned i havet, en vegg av vann reiser seg, og stormen er over oss: lyn overalt, regn og vind. Navnet (N), hvitt blink (F).
     Han er i lufta i 1,6 s, like lenge som orcaen (orca_hopp_telefon.mp4). */
  const PT = { D: 0, G: 4.9, U: 7.5, C: 8.82, S: 9.65, A: 10.52, L: 11.25, N: 11.95, F: 13.3, E: 13.62 };
  const DEEP = [0, -140, -10];   /* lyset langt nede */
  G3D.def('c3:382p', {
    len: PT.E, R: PT.A, at: TL.pre, models: ['kyogre', 'kyogre_primal'],   /* at: låta står ved crashet når cutscenen starter (primalCut hopper dit; verktøyene spiller låta derfra) */ edge: 'sea', env: { rim: '#a8c8ff', glow: '#2a8acc', fog: '#16222e', glowH: 3 },
    make(K, T) { const S = storm(T), g = S.gr = kyFig(), p = S.pg = kypFig(); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p);
      const pts = (n, f, o) => { const q = K.pts(n, f, o); S.scene.add(q); return q; };
      /* Sprutet når han stuper, søylen når han bryter ut, og veggen når han slår ned. */
      S.dsp = pts(260, i => { const a = rnd(i, 11) * TAU, q = rnd(i, 12); return { p: [cos(a) * 4, 0.3, sin(a) * 3], v: [cos(a) * (3 + 8 * q), 6 + rnd(i, 13) * 12, sin(a) * (3 + 8 * q)], b: rnd(i, 14) * 0.5, l: 1.6 + rnd(i, 15) * 0.8, z: 0.5 + rnd(i, 16) * 1.5 }; }, { t0: -1e5, shade: 1, g: 14, drag: 0.6, px: 70, sz0: 0.6, sz1: 2, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.6, fade: 0.55, floor: -1 });
      S.col = pts(480, i => { const a = rnd(i, 21) * TAU, q = rnd(i, 22), r = 3 + q * 6; return { p: [cos(a) * r, 0.5 + rnd(i, 23) * 3, sin(a) * r * 0.8], v: [cos(a) * (2 + 6 * q), 18 + rnd(i, 24) * 22 * (1 - 0.5 * q), sin(a) * (2 + 6 * q)], b: rnd(i, 25) * 0.55, l: 2.4 + rnd(i, 26), z: 0.6 + rnd(i, 27) * 1.8 }; }, { t0: -1e5, shade: 1, g: 16, drag: 0.5, px: 80, sz0: 0.6, sz1: 2.2, c: ['#f6fcff', '#c8dcea', '#708ea2'], a: 0.62, fade: 0.5, floor: -1 });
      S.sheet = pts(160, i => { const a = rnd(i, 31) * TAU; return { p: [(rnd(i, 32) - 0.5) * 8, 4 + rnd(i, 33) * 14, (rnd(i, 34) - 0.5) * 6], v: [cos(a) * 2, -2 - rnd(i, 35) * 3, sin(a) * 2], b: rnd(i, 36) * 1.2, l: 1.1 + rnd(i, 37) * 0.6, z: 0.5 + rnd(i, 38) * 0.9 }; }, { t0: -1e5, shade: 1, g: 22, px: 70, c: ['#f0f8ff', '#a8c4d8', '#5a7486'], a: 0.85, fade: 0.8, floor: -1 });
      S.wall = pts(460, i => { const a = rnd(i, 41) * TAU, q = rnd(i, 42), r = 5 + q * 12; return { p: [cos(a) * r, 0.5, sin(a) * r * 0.5], v: [cos(a) * (6 + 14 * q), 22 + rnd(i, 43) * 34 * (1 - 0.6 * q), sin(a) * (6 + 14 * q) * 0.35], b: rnd(i, 44) * 0.4, l: 2.8 + rnd(i, 45) * 1.2, z: 0.8 + rnd(i, 46) * 2.4 }; }, { t0: -1e5, shade: 1, g: 15, drag: 0.7, px: 90, sz0: 0.6, sz1: 2.4, c: ['#eef8ff', '#b8d0e0', '#5a7486'], a: 0.36, fade: 0.45, floor: -1 });
      S.bub = pts(90, i => ({ p: [(rnd(i, 51) - 0.5) * 14, -rnd(i, 52) * 40, (rnd(i, 53) - 0.5) * 14], v: [0, 3 + rnd(i, 54) * 4, 0], b: rnd(i, 55) * 6, l: 6, z: 0.3 + rnd(i, 56) * 0.6 }), { loop: 1, add: 1, sway: 0.4, px: 60, c: ['#dff6ff', '#8fd0f0', '#2a6a8a'], a: 0.5, fade: 0.6 });
      S.snow = pts(160, i => ({ p: [(rnd(i, 61) - 0.5) * 60, -10 - rnd(i, 62) * 80, (rnd(i, 63) - 0.5) * 60], v: [0.3, -0.4, 0.2], b: rnd(i, 64) * 12, l: 12, z: 0.3 + rnd(i, 65) * 0.5 }), { loop: 1, add: 1, sway: 0.6, px: 60, c: ['#bfe8ff', '#6ab0d0', '#1a4a62'], a: 0.35, fade: 0.9 });
      S.deep = K.light(1, '#7ad8ff', { depth: false }); S.deep.renderOrder = 6; S.scene.add(S.deep);
      return S; },
    act(S, t, o) {
      const g = S.gr, p = S.pg, U = K.U(), su = S.sea.material.uniforms, under = t >= 3.0 && t < PT.C, post = t >= PT.S;
      S.under = under ? (t < PT.U ? 0.35 : 0.35 + 0.65 * seg(t, PT.U, PT.C)) : 0; S.sea.visible = !under; for (const m of S.stacks) m.visible = !under;
      /* Stormen: over oss fra smellet. Lynet: noen i oppbyggingen, et på slaget som lyser ham opp, og en storm av lyn på smellet. */
      const k = t < PT.L ? 1.25 : 1.25 + 0.75 * seg(t, PT.L, PT.L + 0.6), L = [];
      if (!under) { for (const q of strikes(t, t < PT.L ? 0.35 : 2.2, 81)) L.push({ d: t - q[0], k: q[1], a: q[2], s: q[3] });
        for (const [tb, kk, a] of [[0, 1, 0.3], [PT.S, 1, -0.2], [PT.L, 0.9, 0.1], [PT.L + 0.18, 0.8, -0.6], [PT.L + 0.42, 0.85, 0.65], [PT.L + 0.7, 0.75, -0.25], [PT.L + 1.0, 0.8, 0.4], [PT.L + 1.35, 0.7, -0.8]]) L.push({ d: t - tb, k: kk, a, s: floor(tb * 37), near: tb >= PT.L || tb === PT.S }); }
      if (t >= PT.C && t < PT.S) L.length = 0;   /* kuttet: stille, ingen lyn (bare stillheten og lyset nedenfra) */
      S.L = L; const fl = flashOf(L); S.fl = fl; seaAct(S, t, k, fl);
      /* 1 Han stuper (vanlig form): hodet ned og halen opp, ned i havet. */
      const dv = io(seg(t, 0.1, 1.4)), sink = eo(seg(t, 0.5, 3.0));
      g.root.visible = t < PT.U; p.root.visible = t >= PT.U - 0.02;
      if (t < 3.0) { g.root.position.set(HOME[0], mix(HY, -16, sink), HOME[2] + 6 * sink); g.root.rotation.set(1.05 * dv, -0.55, 0); g.add(DIVE, dv); SWIM(g, t, 0.6, 2.6); }
      /* 2 Under vann: han synker ned mot lyset i dypet, snur der og samler seg. */
      else { const d2 = io(seg(t, 3.0, PT.U)); g.root.position.set(HOME[0] + 2 * d2, mix(-18, -58, d2), mix(10, DEEP[2] + 4, d2)); g.root.rotation.set(mix(1.15, 0.2, io(seg(t, PT.G, PT.U))), -0.55 + 1.2 * io(seg(t, PT.G, PT.U)), 0); SWIM(g, t, 0.8, 2); }
      lines(g, 0.75 + 0.8 * seg(t, PT.G, PT.U) + 0.5 * hit(t, PT.G, 1.2), 0);
      /* 3–6 Primal: stiger opp mot kameraet (U–C), under flaten (C–S), breachen (S), henger i lufta (A), slår ned (L) og ligger i havet og brøler. */
      const asc = seg(t, PT.U, PT.C), ry = t < PT.C ? mix(-70, -8, ei(asc)) : t < PT.S ? mix(-13, -9, seg(t, PT.C, PT.S)) : t < PT.L ? kf(t, [[PT.S, -9], [PT.S + 0.22, 4, eo], [PT.A, 15.5, eo], [PT.A + 0.3, 15.8], [PT.L, 1.5, ei]]) : mix(-2.2, HY * 1.6, eo(seg(t, PT.L, PT.L + 1.2)));
      const pit = t < PT.C ? -1.35 : t < PT.S ? -1.4 : t < PT.L ? kf(t, [[PT.S, -1.35], [PT.A, -0.75, io], [PT.L - 0.25, 0.35, io], [PT.L, 0.5]]) : mix(0.5, 0, eo(seg(t, PT.L, PT.L + 0.9)));
      const pz = t < PT.S ? mix(DEEP[2], 4, ei(asc)) : t < PT.L ? mix(4, 6, seg(t, PT.S, PT.L)) : 6 - 6 * eo(seg(t, PT.L, PT.L + 1.2));
      p.root.position.set(HOME[0], ry, HOME[2] + pz); p.root.rotation.set(pit, t < PT.L ? -0.3 + 0.35 * seg(t, PT.S, PT.L) : mix(0.05, -0.5, io(seg(t, PT.L, PT.E))), t < PT.L && t > PT.S ? 0.22 * sin((t - PT.S) * 2.4) : 0);
      if (t < PT.S) SWIM(p, t, 1, 4.2); else p.add(BREACH, t < PT.L ? io(seg(t, PT.S, PT.S + 0.3)) : 1 - io(seg(t, PT.L, PT.L + 0.6)));
      const rw = t < PT.A ? 0 : back(seg(t, PT.A, PT.A + 0.35), 2.2) * (1 - 0.4 * io(seg(t, PT.L + 1.6, PT.E))); p.add(ROAR, rw); p.rot('Jaw', 0, 0.04 * sin(t * 55) * rw, 0); S.rw = rw; S.mouth = null;
      p.eye(0, rw > 0.2 ? 0.75 : 0, 0.7);
      const glo = t < PT.U ? 0 : 1.1 + 0.9 * seg(t, PT.U, PT.C) + 0.8 * hit(t, PT.S, 0.8) + 0.6 * rw + 0.6 * hit(t, PT.L, 1); lines(p, glo, 1); S.glo = c01(glo - 1);
      /* Lyset i dypet (G): svakt, langt nede, en krans av blått lys med α i, som vokser når han er der, og slokner når han stiger. */
      const dg = t < PT.G ? 0 : (0.35 + 0.65 * hit(t, PT.G, 1.6) + 0.5 * seg(t, PT.G + 1, PT.U)) * (1 - seg(t, PT.U + 0.3, PT.C)); S.dg = dg;
      K.face(S.deep); S.deep.position.set(DEEP[0], DEEP[1], DEEP[2]); S.deep.scale.setScalar(30 + 30 * dg); S.deep.material.uniforms.uA.value = 0.9 * dg; S.deep.visible = dg > 0.01 && under;
      /* Over flaten i kuttet: havet lyser blått nedenfra, og skyggen stiger. Etter smellet: ringer, skum og lyset under ham. */
      su.uGlo.value.set(HOME[0], HOME[2] + 4, 7 + 9 * seg(t, PT.C, PT.S), t >= PT.C && t < PT.S + 0.4 ? 0.12 + 0.22 * seg(t, PT.C, PT.S) : post ? 0.1 + 0.1 * rw : 0); su.uGloC.value.set(0.12, 0.5, 1);
      su.uBody.value.set(HOME[0], HOME[2] + 4, 12, t >= PT.C && t < PT.S ? 0.8 : 0); su.uBodyD.value.set(0, 1, 6, 1);
      su.uWade.value.set(HOME[0], HOME[2], 14, t < 0.5 ? 0.9 : post ? 1 : 0);
      const ring = (i, x, z, t0, v, d, a) => su.uRing.value[i].set(x, z, 3 + (t - t0) * v, t >= t0 ? a * hit(t, t0, d) : 0);
      ring(0, HOME[0], HOME[2], 0.6, 12, 2.4, 1); ring(1, HOME[0], HOME[2] + 4, PT.S, 16, 1.6, 1); ring(2, HOME[0], HOME[2] + 6, PT.L, 26, 2, 1); ring(3, HOME[0], HOME[2] + 6, PT.L + 0.3, 14, 2, 0.8);
      S.fx(S.dsp, 0.7, HOME[0], 0, HOME[2] + 2); S.fx(S.col, PT.S, HOME[0], 0, HOME[2] + 4); S.fx(S.sheet, PT.S + 0.15, HOME[0], ry - 4, HOME[2] + pz); S.fx(S.wall, PT.L, HOME[0], 0, HOME[2] + 6);
      S.bub.visible = S.snow.visible = under; S.bub.position.set(g.root.visible ? g.root.position.x : 0, g.root.visible ? g.root.position.y : ry, 0);
      /* Lyset: kaldt over vannet (lynet lyser opp alt), blått under. */
      if (under) { lerpC(U.uKeyC, '#3a6a88', '#9ee4ff', S.under * 0.6 + 0.4 * dg); lerpC(U.uShC, '#020a12', '#0a2638', S.under); U.uRimK.value = 0.6; U.uFog.value.set(6, 70, 0.96); lerpC(U.uFogC, '#020a12', '#0c3a52', 0.4 + 0.4 * S.under); U.uGlow.value = 0.6; }
      else { lerpC(U.uKeyC, '#5a6c80', '#e8f2ff', fl); lerpC(U.uShC, '#0a141e', '#3a4c66', fl); U.uRimK.value = 0.85; U.uGlow.value = 0.3 + 0.4 * (t >= PT.C ? 1 : 0); U.uFog.value.set(40, 320, 0.88); lerpC(U.uFogC, '#121c26', '#5a7090', fl); }
      S.rays = under ? { x: 256 + 30 * sin(t * 0.3), y: -40, a: 0.6 * (1 - S.under * 0.5), len: 0.9 } : null; S.k = k;
    },
    shots: [
      /* 1 Han stuper: lavt ved vannet, litt fra siden, med lynet på crashet. */
      [0, (S, u, a, t) => { K.cam(mix(11, 9, u), 2.2, mix(22, 19, u), 0, -0.5, 3, 50, 0.03); S.post.fl = max(1 - seg(t, 0, 0.3), 0.35 * hit(t, 0, 0.12)); S.post.flc = '#ffffff'; S.post.sh = 2.4 * hit(t, 0.7, 0.6); }],
      /* 2 Under vann: rett ned i mørket etter ham; lyset i dypet tennes på G. */
      [3.0, (S, u, a, t) => { const g = S.gr.root.position, e = io(u); K.cam(g.x + 6, g.y + mix(16, 26, e), g.z + 12, mix(g.x, DEEP[0], 0.3), mix(g.y, DEEP[1], 0.35), mix(g.z, DEEP[2], 0.3), 54, 0.1); S.post.sh = 1.6 * hit(t, PT.G, 1); S.post.fl = 0.25 * hit(t, PT.G, 0.3); S.post.flc = '#9ee4ff'; S.post.vig = 0.8; }],
      /* 3 Han stiger mot kameraet med linjene lysende, ut av mørket (Subnautica). */
      [PT.U - 0.04, (S, u, a, t) => { const p = S.pg.root.position; K.cam(4, -6, 10, p.x, p.y - 6, p.z, 58, 0.04); S.post.sh = 0.6 + 2.2 * u * u; S.post.spd = 0.6 * u; S.post.spx = 128; S.post.spy = 110; S.post.vig = 0.85; }],
      /* 4 Kuttet: stille over vannet, havet lyser nedenfra. */
      [PT.C, (S, u, a, t) => { K.cam(12, 3.2, 34, 0, 1, 4, 46); S.post.sh = 0.25 * u; S.post.vig = 0.75; }],
      /* 5 Breachen, lavt og nært; han henger i lufta i stillheten og begynner å brøle. */
      [PT.S - 0.03, (S, u, a, t) => { K.cam(mix(24, 21, u), 1.3, mix(56, 52, u), 0, mix(7, 10, io(seg(t, PT.S, PT.A))), 4, 48, -0.04); S.post.fl = 0.4 * hit(t, PT.S, 0.12); S.post.flc = '#e8f4ff'; S.post.sh = 5 * hit(t, PT.S, 0.7); }],
      /* 6 Smellet: han slår ned, vannveggen og stormen; så ligger han i havet og brøler, med navnet. */
      [PT.L - 0.02, (S, u, a, t) => { const e = io(seg(t, PT.L + 0.6, PT.E)); K.cam(mix(20, 15, e), mix(3.6, 2.8, e), mix(48, 38, e), -1, mix(4, 3, e), 2, 50, -0.03);
        S.post.fl = max(0.4 * hit(t, PT.L, 0.12), 0.25 * hit(t, PT.L + 0.3, 0.1), seg(t, PT.F, PT.E - 0.04)); S.post.flc = '#f2f8ff'; S.post.sh = 7 * hit(t, PT.L, 1.4) + 0.8 * S.rw; }],
    ],
  });

  /* Lydene til Kyogre (signalene i cutscenene). Pakken først, og en innebygd reserve (tone, noise og swellN fra ui.js). */
  const has = n => typeof window[n] === 'function';
  const pk = (n, v, o) => typeof c3p === 'function' && c3p(n, v, o);
  X.snd.kydive = () => { if (!pk('Dive', 0.9, { rate: 0.75, trim: 1 }) && has('noise')) { noise(0, 1.1, 0.2, 900, 140); tone(70, 0, 1, 0.14, 'sine', 40); } return [60, 40, 160]; };
  X.snd.kydeep = () => { if (has('tone')) { tone(55, 0, 3.2, 0.16, 'sine', 52); tone(110, 0.02, 2.6, 0.06, 'sine', 108); tone(1318, 0.05, 1.8, 0.02, 'triangle'); } pk('Water Pulse', 0.5, { rate: 0.6, trim: 1 }); return [40, 80, 40]; };
  X.snd.kyrise = d => { d = d || 1.3; if (!pk('Waterfall', 0.85, { rate: 0.8, len: d + 0.2, trim: 1 }) && has('swellN')) swellN(0, d, 0.18, 200, 2400); return [20, 40, 20, 40, 20, 60]; };
  X.snd.kybreach = () => { if (!pk('Surf', 1, { rate: 0.9, len: 1.6, trim: 1 }) && has('noise')) noise(0, 1.4, 0.3, 2400, 300); pk('Thunder', 0.75, { len: 1.4, trim: 1 }); return [120, 40, 200]; };
  X.snd.kyslam = () => { if (!pk('Water Spout', 1, { rate: 0.8, len: 2.4, trim: 1 }) && has('noise')) { noise(0, 2, 0.32, 1200, 80); tone(48, 0, 1.8, 0.26, 'sine', 30); } pk('Thunder', 1, { trim: 1 }); pk('Thunder', 0.8, { at: 0.3, rate: 0.85, trim: 1 }); return [140, 40, 300]; };
  X.snd.kythunder = k => { if (!pk('Thunder', 0.55 + 0.35 * (k || 0.6), { rate: 0.9 + 0.2 * (k || 0.6), trim: 1 }) && has('noise')) noise(0, 1.2, 0.18, 600, 60); return [40, 30, 80]; };
  X.sfx.push('Dive', 'Water Pulse', 'Waterfall', 'Surf', 'Thunder', 'Water Spout');

  /* Filmene i CINE. */
  X.reg('c3:382', { spid: 382, skin: 'sea', back: backdrop, look, over: (x, t, o) => X.plate(x, t - (IR + 0.55), Object.assign({ skin: 'sea' }, o)), roar: t => IR,
    cues: [[IH[2], 'kythunder', 1], [IH[3], 'kythunder', 0.6], [IH[4], 'kythunder', 0.7], [IH[5] + 0.6, 'kyrise', 3], [IH[7], 'thud'], [IR, 'cry'], [IR + 0.02, 'kythunder', 1], [IR + 0.35, 'kythunder', 0.9]],
    fx(S, t, P) { rainFx(S, t, S.k || 1, 0.5 + 0.5 * seg(t, IH[1], IH[5]));
      if (S.shot === 4 || S.shot === 1) for (const q of S.L || []) if (q.near) { const a = flick(q.d) * q.k; if (a > 0.05) { const x = 256 + q.a * 220; nearBolt(x + (rnd(q.s, 3) - 0.5) * 80, -10, x, 180 + 40 * rnd(q.s, 4), a, q.s * 5 + (q.d > 0.12 ? 2 : 0), 3.2); } } } });
  X.reg('c3:382p', { spid: 382, swirl: 0, skin: 'sea', back: backdrop, look, roar: () => PT.A,
    cues: [[0, 'kythunder', 1], [0.6, 'kydive'], [PT.G, 'kydeep'], [PT.U, 'kyrise', PT.C - PT.U], [PT.S, 'kybreach'], [PT.A, 'cry'], [PT.L, 'kyslam'], [PT.L + 0.3, 'kythunder', 1], [PT.L + 0.8, 'kythunder', 0.8]],
    /* Lyset langt nede: α, svakt og i figurens oppløsning (Jazz 19.11: «trenger ikke like tydelig steinvisning av omega, men at noe lyser langt nede under vann»). Så navnet. */
    over(x, t, o) { const S = G3D.S('c3:382p'); let on = false;
      if (S.dg > 0.02 && S.under) { const q = K.proj(DEEP[0], DEEP[1], DEEP[2]); if (q.z < 1) { x.save(); x.globalAlpha = c01(S.dg * 0.75); X.alpha(x, Math.round(q.x / 2), Math.round(q.y / 2), 9 + 5 * S.dg, min(1, 0.4 + S.dg)); x.restore(); on = true; } }
      return X.plate(x, t - PT.N, { name: o.name, cap: 'Primal Reversion', sign: X.alpha, skin: 'sea' }) || on; },
    fx(S, t, P) {
      if (S.under) { const q = K.proj(DEEP[0], DEEP[1], DEEP[2]); if (S.dg > 0.01 && q.z < 1) { C.blob(q.x, q.y, 120 + 90 * S.dg, '#2a9ad8', 0.5 * S.dg, 1, 1); C.blob(q.x, q.y, 40 + 30 * S.dg, '#d8f6ff', 0.7 * S.dg, 1, 1); P.rays = { x: q.x, y: q.y, a: 1.2 * S.dg, len: 0.6 }; } return; }
      rainFx(S, t, S.k || 1, t >= PT.C && t < PT.S ? 0.25 : 1);
      for (const q of S.L || []) if (q.near) { const a = flick(q.d) * q.k; if (a > 0.05) { const x = 256 + q.a * 230; nearBolt(x + (rnd(q.s, 3) - 0.5) * 90, -10, x + (rnd(q.s, 5) - 0.5) * 40, 170 + 50 * rnd(q.s, 4), a, q.s * 5 + (q.d > 0.12 ? 2 : 0), 3.4); } }
      if (t >= PT.L) { const d = C.lensDrops({ n: 18, a: 14, size: 9, wet: 0.8 * seg(t, PT.L, PT.L + 0.5), run: 0.5 }); C.lensShine(d, { a: 0.8 }); } } });

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
    place(K, T, fig) { const S = storm(T); S.calm = 0.62; return S; },
    dress(S, K, T, fig, m) {
      /* Klippa din: våt, mørk stein som så vidt stikker opp, med skum og sprut rundt foten når bølgene slår inn. */
      const cm = K.rockMat({ a: '#0c1319', b: '#26323b', str: 0.3, top: 0.5, sm: 0.4, hot: 0, lv: 0, tint: [0.07, 0.09, 0.11], rough: 0.8, sc: 2.4 });
      S.rock = K.boulder(3.6, 91, { flat: 1, sx: 1.25, sy: 0.55, sz: 1, cap: 1.4, j: 0.3, d: 2, mat: cm }); S.rock.position.set(m.x + 0.3, -0.3, m.z - 1.2); S.rock.rotation.y = 0.4; S.scene.add(S.rock);
      for (const [dx, dz, r, sd] of [[4.4, -2.6, 1.3, 93], [-3.8, -3.6, 1.1, 95], [2.2, 3.4, 0.9, 97]]) { const b = K.boulder(r, sd, { sy: 0.9, j: 0.3, mat: cm }); b.position.set(m.x + dx, -0.2, m.z + dz); S.scene.add(b); }
      S.mspray = K.pts(80, i => { const a = rnd(i, 101) * TAU, q = rnd(i, 102); return { p: [cos(a) * 3.2, 0.3, sin(a) * 2.6], v: [cos(a) * (2 + 4 * q) - 1, 5 + rnd(i, 103) * 8, sin(a) * (2 + 4 * q) + 1], b: rnd(i, 104) * 0.3, l: 1.2 + rnd(i, 105) * 0.7, z: 0.8 + rnd(i, 106) * 1.6 }; }, { t0: -1e5, shade: 1, g: 16, drag: 0.6, px: 70, sz0: 0.7, sz1: 1.8, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.85, fade: 0.55, floor: -1 });
      S.mspray.position.set(m.x, 0, m.z - 1); S.scene.add(S.mspray); S.mp = [m.x, m.z];
      /* Stedet slår til (Raging Tide: «A great wave crashes over …»): en vegg av sprut over klippa di. */
      S.big = K.pts(200, i => { const a = rnd(i, 111) * TAU, q = rnd(i, 112); return { p: [cos(a) * 5, 0.4, -3 + sin(a) * 3], v: [cos(a) * (3 + 7 * q), 10 + rnd(i, 113) * 16, 2 + sin(a) * 4], b: rnd(i, 114) * 0.3, l: 1.8 + rnd(i, 115) * 0.8, z: 1.4 + rnd(i, 116) * 3 }; }, { t0: -1e5, shade: 1, g: 15, drag: 0.6, px: 80, sz0: 0.8, sz1: 2.4, c: ['#f8fdff', '#c8dcea', '#647e90'], a: 0.92, fade: 0.5, floor: -1 });
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
      const tc = crestAt(su, S.mp[0], S.mp[1] - 6, t); S.fx(S.mspray, tc); S.fx(S.big, fT < 98 ? t - fT + 0.45 : -1e5);
      /* Rundt Kyogre: skum der kroppen bryter flaten, den mørke kroppen under, og lyset under vannet som Primal. */
      su.uWade.value.set(HOME[0], HOME[2], 10, 0.55 + 0.2 * pk); su.uBody.value.set(HOME[0], HOME[2], 11, 0.55); su.uBodyD.value.set(sin(S.face || 0), cos(S.face || 0), 5.5, 1);
      su.uGlo.value.set(HOME[0], HOME[2], 13, (0.2 + 0.3 * sin(t * 2.1)) * pk + 0.25 * hit(st.pT, 0, 2)); su.uGloC.value.set(0.25, 0.75, 1);
      const ring = (i, x, z, age, v, d, a) => su.uRing.value[i].set(x, z, 1.5 + age * v, age >= 0 && age < d ? a * (1 - age / d) : 0), h = o.hit;
      ring(0, S.mp[0], S.mp[1] - 1, t - tc, 6, 1.6, 0.9); ring(1, HOME[0], HOME[2], rT - 0.4, 20, 1.8, 1); ring(2, S.mp[0], S.mp[1], fT - 0.4, 14, 1.5, 1); ring(3, h ? h[0] : 0, h ? h[1] : 0, h ? h[2] : -1, 12, 0.9, 0.8);
      lerpC(U.uKeyC, '#7a8ca0', '#eef6ff', fl); lerpC(U.uShC, '#0e1a26', '#3e5270', fl); U.uRimK.value = 0.9; U.uGlow.value = 0.3 + 0.5 * pk; U.uFog.value.set(46 - 10 * pk, 330 - 80 * pk, 0.86); lerpC(U.uFogC, '#121c26', '#5a7090', fl);
      S.k = k; S.pk = pk; S.rw = 0; S.glo = 0.3 * pk;
    },
    back: (S, t) => backdrop(S, t),
    scene(S, A, sn, q) {
      const P = q.P, t = S.t, p2 = S.p2, pk = A.pk || 0, fl = A.fl || 0, k = A.k || 1;
      /* Lyset på figurene: kaldt og dempet som uværet; lynet gir hardt kantlys, og lyset under vannet når opp nedenfra som Primal. */
      C.lightSet({ amb: C.blend('#7f93a6', '#d4e2f0', fl * 0.8), sat: 0.86, lift: C.blend('#0a1622', '#1c3448', fl),
        lights: [{ col: '#cfe2f0', a: 0.18 + 0.55 * fl, h: 0.55, top: 1 }, { col: '#2aa8e0', a: min(0.7, 0.15 + 0.4 * pk), h: 0.6 }], rim: [{ col: '#d8eafa', dx: 1, dy: 1, a: 0.3 + 0.65 * fl }],
        me: { amb: C.blend('#7c8f9d', '#c8d8e6', fl * 0.8), lights: [{ col: '#cfe2f0', a: 0.2 + 0.55 * fl, h: 0.5, top: 1 }], rim: [{ col: '#d8eafa', dx: -1, dy: 1, a: 0.35 + 0.6 * fl }, { col: '#7ac8e8', dx: 0, dy: -1, a: 0.3 + 0.3 * pk }] } });
      if (C.cur.sps.me) C.monShadow(S.me[0], S.me[1] - 3, 1.6 * S.mk, { id: 'me', a: 0.4, len: 0.1, skew: -0.4, ft: S.ftm, col: '#02070b' }); C.contact(S.me[0], S.me[1] - 4, 58 * S.mk, { a: 0.85, col: '#02070b', sy: 0.2 });
      /* Lynet nær: på dropet og smellet slår det ned i havet foran kysten. */
      for (const L of A.L || []) if (L.s >= 500) { const a = flick(L.d) * L.k; if (a > 0.08) { const x = 256 + L.a * 210; C.bolt(x + (rnd(L.s, 3) - 0.5) * 70, -10, x, 150 + 30 * rnd(L.s, 4), { seed: L.s, col: '#b8d4ff', core: '#ffffff', w: 2.6, a, br: 3, depth: 6 }); } }
      rainFx(A, t, k, 0.75 + 0.25 * pk);
      P.bloom = 0.3 + 0.25 * fl + 0.12 * pk; P.bloomT = 0.72; P.grain = 0.04; P.vig = 0.48 + 0.12 * p2 + 0.1 * pk; P.vigc = '#01050a';
      P.grade = { tint: [0.95, 1, 1.05], con: 1.1, sat: 1.04 - 0.06 * pk, exp: 1.05 + 0.2 * fl - 0.05 * pk };
      if (A.drop && A.drop.on) P.sh = (P.sh || 0) + 1.6 * A.drop.hk; if (A.drop && A.drop.sl > 0) P.sh = (P.sh || 0) + 3 * A.drop.sl * A.drop.sl;
    },
    fig: { models: ['kyogre', 'kyogre_primal'], at: [356, 236], me: [132, 452],   /* vannlinja hans og føttene til din egen med 3D-figuren (oppstillingen fra Black/White) */
      make(S, K, T) { const g = S.gr = kyFig({ mip: 1 }), p = S.pg = kypFig({ mip: 1 }); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.forms = [g, p]; p.root.scale.setScalar(KS * PS); },
      form: (S, pr) => pr ? { f: S.pg, y: 0.1, stand: [{ Neck: [0, -0.08, 0], '*Shoulder': [0, 0, 0.1] }, 1], duck: DUCK, roar: ROAR, rk: 0.45 } : { f: S.gr, y: 0.15, stand: [{ Neck: [0, -0.06, 0] }, 1], duck: DUCK, roar: ROAR, rk: 0.5 },
      idle(f, t) { SWIM(f, t, 0.35, 1.3); f.add({ Neck: [0, 0.03 * sin(t * 0.8), 0.05 * sin(t * 0.45)], Jaw: [0, -0.04 - 0.03 * sin(t * 2), 0] }, 1); },
      glow(S, f, t, st, pr) { if (pr) lines(f, 1.3 + 0.3 * sin(t * 3.1) + 0.6 * (S.drop && S.drop.hk || 0), 1); else lines(f, 0.75 + 0.5 * st.p2 * (0.6 + 0.4 * sin(t * 4)), 0); },
      ink2: () => 0.85, turn: 0.4 },
  });
})();
