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

  const HOME = [0, 0, 0];   /* der Kyogre ligger i havet (roten) */
  const DEEP = [0, -140, -10];   /* lyset langt nede */

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
    fig: { models: ['kyogre', 'kyogre_primal'], at: [362, 228], me: [132, 452],   /* vannlinja hans og føttene til din egen med 3D-figuren (oppstillingen fra Black/White); at er der
      kampskjermen setter boksen (.arena.fig3 .bs.foe i style.css ved --cz 1, som Groudon), så treffene og effektene lander på figuren */
      make(S, K, T) { const g = S.gr = kyFig({ mip: 1 }), p = S.pg = kypFig({ mip: 1 }); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.forms = [g, p]; p.root.scale.setScalar(KS * PS); },
      form: (S, pr) => pr ? { f: S.pg, y: 0.1, stand: [{ Neck: [0, -0.08, 0], '*Shoulder': [0, 0, 0.1] }, 1], duck: DUCK, roar: ROAR, rk: 0.45 } : { f: S.gr, y: 0.15, stand: [{ Neck: [0, -0.06, 0] }, 1], duck: DUCK, roar: ROAR, rk: 0.5 },
      idle(f, t) { SWIM(f, t, 0.35, 1.3); f.add({ Neck: [0, 0.03 * sin(t * 0.8), 0.05 * sin(t * 0.45)], Jaw: [0, -0.04 - 0.03 * sin(t * 2), 0] }, 1); },
      glow(S, f, t, st, pr) { if (pr) lines(f, 1.3 + 0.3 * sin(t * 3.1) + 0.6 * (S.drop && S.drop.hk || 0), 1); else lines(f, 0.75 + 0.5 * st.p2 * (0.6 + 0.4 * sin(t * 4)), 0); },
      ink2: () => 0.85, turn: 0.4 },
  });
  /* ===================== SKISSE 4 av Primal, skisse 2 av introen (sparringen 20.11, Opus) – Kyogre =====================
     Bare i en midlertidig kopi av appen: utsnitt og timing, ikke stil. Dreieboka: work/raids3d/kyogre/ideer.md («Dreieboka, utkast 2»). Skisse 1 ligger i git-historikken.
     'c3:382' er introen: filmens tid = tiden i låta (fra 0:00), brølet på 0:41,52 og navnet 1,4 s etter.
     'c3:382p' er Primal: filmens tid = låta − 195,7 (fra narhval-tonen 3:15,7); kameraet står over vannet hele tiden (Jazz 20.11). Skisse 2 (Primal-dreieboka, utkast 2).
     motor.py legger ringbølger (uRH) inn i havet i kopiens raid3d.js. */
  {
    const HY2 = 0.25;   /* Primal (skisse 1): hvor høyt han ligger før han stuper */
    /* Stormen i horisonten (2D bak 3D-bildet, i vinkelmål som backdrop): en svart veggsky med lysere underkant, regnslør ned til havet og lyn inne i skyen.
       st = hvor nær den er (0,3 langt borte … 1 over oss: hele himmelen grå). a0 = retningen (radianer fra −Z). */
    const wall = (S, t, st, a0) => {
      const g = C.g, v = G3D.view(), k = v.ppr / UR, bl = C.blend, L = S.L || [];
      g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
      const cx = wrap(a0 - v.yaw) * UR, w = UR * (0.35 + 1.6 * st * st), h = UR * (0.06 + 0.5 * st * st), base = -UR * (0.025 + 0.05 * st);
      let lit = 0; for (const q of L) if (!q.near) lit = max(lit, flick(q.d) * q.k * Math.exp(-3 * wrap(q.a - a0) * wrap(q.a - a0)));
      /* Lys ved horisonten bak stormen (himmelen langt borte), så veggskyen står som en silhuett mot den. */
      const hg = g.createLinearGradient(0, -UR * 0.24, 0, 4), la = 0.6 * (1 - 0.55 * st); hg.addColorStop(0, 'rgba(90,108,124,0)'); hg.addColorStop(0.65, `rgba(98,116,132,${la})`); hg.addColorStop(1, `rgba(128,144,158,${la})`);
      g.fillStyle = hg; g.fillRect(-4000, -UR * 0.24, 8000, UR * 0.24 + 4);
      const top = -UR * (0.13 + 0.3 * st);
      for (let i = 0; i < 16; i++) { const x = cx + (rnd(i, 501) - 0.5) * w * 1.6, ww = 30 + rnd(i, 502) * 90 * (0.5 + st), gr = g.createLinearGradient(0, base, 0, 8);
        gr.addColorStop(0, 'rgba(40,50,60,0)'); gr.addColorStop(0.3, `rgba(58,70,82,${0.22 + 0.35 * st})`); gr.addColorStop(1, `rgba(70,84,96,${0.3 + 0.4 * st})`); g.fillStyle = gr; g.fillRect(x - ww / 2, base, ww, 8 - base); }
      for (let i = 0; i < 36; i++) { const x = cx + (rnd(i, 511) - 0.5) * w * 1.6, y = mix(base - 12, top, Math.pow(rnd(i, 512), 0.8)), r = 50 + rnd(i, 513) * 110 * (0.6 + st);
        C.blob(x, y, r, bl('#05080c', '#2a3a50', lit * 0.8), 0.96, 0, 0.6); if (lit > 0.05) C.blob(x, y + r * 0.2, r * 0.8, '#9ab8e8', 0.6 * lit * Math.exp(-((x - cx) * (x - cx)) / (0.49 * w * w)), 1, 0.5); }
      for (let i = 0; i < 16; i++) { const x = cx + (rnd(i, 521) - 0.5) * w * 1.3, r = 40 + rnd(i, 522) * 80 * (0.6 + st); C.blob(x, top + rnd(i, 523) * 26, r, '#3e5064', 0.45, 0, 0.5); }
      C.blob(cx, base - 6, w * 0.95, bl('#1e2a36', '#6a86a8', lit), 0.55, 1, 0.1);
      g.restore();
      if (st > 0.7) { g.fillStyle = `rgba(52,60,68,${(st - 0.7) / 0.3 * 0.55})`; g.fillRect(0, 0, 512, v.y + 4); }
    };
    const backS = (S, t) => { const r = backdrop(S, t); if ((S.st || 0) > 0 && !S.under) wall(S, t, S.st, S.sta || 0); if (S.shelf) shelf(S, t, S.sta || 0, S.shelf); return r; };
    /* Skisse (Primal-dronen, Jazz 20.11 bilde 4): en tydelig hyllesky over havet til venstre i bildet, med lagdelt underside, regnsøyler og lyn inni. Grov: formen og plassen, ikke stilen. */
    const shelf = (S, t, a0, k0) => {
      const g = C.g, v = G3D.view(), k = v.ppr / UR, L = S.L || []; g.save(); g.translate(v.x, v.y); g.rotate(v.ang); g.scale(k, k);
      const cx = wrap(a0 - v.yaw) * UR, w = UR * 0.95, base = -UR * 0.035, top = -UR * 0.5;
      let lit = 0; for (const q of L) if (!q.near) lit = max(lit, flick(q.d) * q.k * Math.exp(-4 * wrap(q.a - a0) * wrap(q.a - a0)));
      for (let i = 0; i < 7; i++) { const x = cx - w * 0.55 + i * w * 0.14 + (rnd(i, 601) - 0.5) * 20, ww = 40 + rnd(i, 602) * 50, gr = g.createLinearGradient(0, base, 0, 6);
        gr.addColorStop(0, `rgba(150,166,182,${0.55 * k0})`); gr.addColorStop(1, `rgba(190,204,218,${(0.75 + 0.25 * lit) * k0})`); g.fillStyle = gr; g.fillRect(x - ww / 2, base, ww, 6 - base); }
      for (let i = 0; i < 46; i++) { const u = rnd(i, 611), x = cx - w * 0.6 + u * w * 1.15, y = mix(base - 8, top, Math.pow(rnd(i, 612), 1.4) * (1 - 0.55 * u)), r = 40 + rnd(i, 613) * 120;
        const lo = y > base - UR * 0.12; C.blob(x, y, r, lo ? '#6a7a8a' : '#0e141a', 0.95 * k0, 0, 0.6); if (lit > 0.05) C.blob(x, y + r * 0.25, r * 0.7, '#a8c4ec', 0.55 * lit * k0, 1, 0.5); }
      for (let i = 0; i < 14; i++) { const x = cx + w * 0.42 - i * w * 0.075, y = base - 6 - i * 3; C.blob(x, y, 70 + rnd(i, 621) * 40, '#9aaab8', 0.85 * k0, 0, 0.5); }   /* den lysere forkanten */
      g.restore(); };
    const lookS = (S, t, P, q, sn) => { look(S, t, P, q, sn); const gr = S.grey || 0; P.grade.sat *= 1 - 0.4 * gr; P.grade.con *= 1 - 0.06 * gr; };

    /* ---------- Introen, skisse 2 (Jazz 20.11, rettelsene på skisse 1) ----------
       «store ting beveger seg mer langsomt og voldsomt med stor kraft»: havet har sin egen, langsommere tid (TS), så dønningene er riktige for en enhet på rundt 8 m
       (en tråler på 21 m er 2,6 enheter, Kyogre rundt 150 m), og sprutet stiger like høyt, men bruker nesten tre ganger så lang tid (SLOW).
       1 Stormen filmes · 2 skyggen kommer inn, glir under båten og er helt ute før klippet · 3 noe stort kommer nedenfra · 4 finnene bryter flaten på hver side av båten,
       ryggen hever seg som en øy, og båten glir av og velter · 5–6 ringbølgene · 7 forvarselet og brølet med lyn bak ham (låst), bare havet foran ham. */
    const QI = { LY0: 1.51, PASS: 4.57, LY: 7.66, W1: 9.08, W2: 10.73, OUT: 12.5, B6: 13.2, W3: 16.9, W4: 20.06, UP: 23.03, LIFT: 23.7, SLIDE: 24.9, HIT: 26.02, ROLL: 26.71, GONE: 27.8,
      R1: 28.36, R2: 31.91, R3: 35.51, DK: 39.24, RO: 41.52, NM: 42.92, END: 46 };
    const TS = 0.48, SLOW = 0.35;   /* havets tid og tiden i sprutet (se over) */
    const KYH = 0.9;                /* hvor høyt han ligger når han er oppe (skisse 1: 0,25). Han rir på dønningene, og ingen bølge skal skjule ham (Jazz 20.11) */
    const BT = [0, 2.5];            /* båten (x, z): rett over hodet hans, mellom finnene (han kommer opp med hodet mot kameraet, +Z). Hodet løfter den høyest */
    const RK = [[-17, -7, 3.6, 8, 41], [21, -13, 4.4, 11, 43], [-27, 10, 3, 6, 47]];   /* sjøstakkene nær ham: x, z, r, h, frø */
    /* Ringbølgene: [start, stakken den knuser mot (−1: ingen), når den knuser, høyde]. Hver større og raskere (lange bølger går fortere). */
    const RINGS = [[QI.R1, 0, QI.R2, 1.0], [QI.R2, 2, QI.R3, 1.3], [QI.R3, 1, 38.53, 1.6], [QI.RO + 0.05, -1, QI.RO + 5, 1.9]];
    const ringAt = (i, t) => { const [t0, rk, tc, A] = RINGS[i]; if (t < t0) return null; const d = rk >= 0 ? Math.hypot(RK[rk][0], RK[rk][1]) - RK[rk][2] * 0.6 : 34, R = 4 + (t - t0) * (d - 4) / (tc - t0);
      return { R, a: A * min(1, (t - t0) / 0.9) * Math.sqrt(9 / max(9, R)) * (1 - seg(R, 40, 58)) }; };
    /* Sprut i stor målestokk: samme bane, men tiden går SLOW ganger så fort (farten × s, tyngden × s², levetiden og forsinkelsen ÷ s). */
    const slowP = (n, init, o, s) => K.pts(n, i => { const q = init(i); return Object.assign({}, q, { v: q.v.map(v => v * s), b: (q.b || 0) / s, l: (q.l || 1) / s }); }, Object.assign({}, o, { g: (o.g || 0) * s * s }));
    const slowIn = (p, s) => { const g = p.geometry, V = g.attributes.aV, A = g.attributes.aS; for (let i = 0; i < V.count; i++) { V.setXYZ(i, V.getX(i) * s, V.getY(i) * s, V.getZ(i) * s); A.setY(i, A.getY(i) / s); A.setZ(i, A.getZ(i) / s); }
      V.needsUpdate = A.needsUpdate = true; p.material.uniforms.uG.value *= s * s; };
    /* Ryggen hans, målt på figuren med stråler ovenfra (q.js, 20.11): høyden over roten langs kroppen (lz: fram mot hodet) og hvor bred den er (rundt 3,6 til hver side).
       Han kommer opp med hodet mot +Z (yaw 0), så lz = z og lx = x. Båten ligger på ryggen når han kommer opp. */
    const PROF = [[-9, -0.6], [-6, 0.36], [-3, 1.31], [0, 2.19], [3, 2.4], [6, 1.6], [9, -0.5]];
    const backTop = (ry, x, z) => { const lz = z, lx = x; if (lz <= -9 || lz >= 9) return -1e9; let i = 0; while (PROF[i + 1][0] < lz) i++; const [z0, h0] = PROF[i], [z1, h1] = PROF[i + 1];
      const w = 1 - Math.pow(abs(lx) / 3.6, 6); return w <= 0 ? -1e9 : ry + mix(h0, h1, (lz - z0) / (z1 - z0)) * Math.sqrt(w); };

    /* Tråleren (Jazz 20.11: «en større båt, ikke lekebåt»): skrog med baug, dekk, styrehus forut med lys i vinduene, mast med topplys, utriggere, galge og nettrommel akter. */
    const mkBoat2 = (K, T) => {
      const M = (a, b, o) => K.rockMat(Object.assign({ a, b, str: 0.2, sm: 0.6, hot: 0, lv: 0, tint: [0.08, 0.07, 0.06] }, o || {})), g = new T.Group(),
        hullM = M('#2a0e0c', '#6e2419'), blk = M('#0b0c0e', '#26282c'), wh = M('#77776f', '#d2d2c8', { tint: [0.12, 0.12, 0.12] }), deck = M('#3a3026', '#7a6a52'), grn = M('#14281c', '#355a40');
      const BX = (w, h, d, m, x, y, z, ry) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; g.add(o); return o; };
      const CY = (r0, r1, h, m, x, y, z, rx, rz) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 6), m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (rz) o.rotation.z = rz; g.add(o); return o; };
      BX(0.86, 0.44, 2.0, hullM, 0, 0, -0.14); BX(0.87, 0.07, 2.0, blk, 0, -0.2, -0.14); BX(0.61, 0.44, 0.61, hullM, 0, 0, 0.86, PI / 4); BX(0.84, 0.18, 0.5, hullM, 0, 0.3, 0.8);
      BX(0.8, 0.05, 1.9, deck, 0, 0.24, -0.12); BX(0.62, 0.5, 0.62, wh, 0, 0.5, 0.18); BX(0.7, 0.05, 0.7, blk, 0, 0.77, 0.18);
      CY(0.03, 0.04, 1.3, blk, 0, 1.4, 0.18); CY(0.018, 0.018, 1.5, blk, 0.42, 1.05, -0.25, 0, -0.75); CY(0.018, 0.018, 1.5, blk, -0.42, 1.05, -0.25, 0, 0.75);
      CY(0.025, 0.025, 0.9, blk, 0.32, 0.68, -1.0); CY(0.025, 0.025, 0.9, blk, -0.32, 0.68, -1.0); BX(0.7, 0.05, 0.05, blk, 0, 1.12, -1.0); CY(0.16, 0.16, 0.6, grn, 0, 0.42, -0.66, 0, PI / 2);
      g.scale.setScalar(1.2); g.rotation.order = 'YXZ'; return g; };
    /* Lysene på båten (vender mot kameraet): to vinduer, topplyset og lykta akter. Lokale punkter i båten. */
    const LAMPS = [[-0.14, 0.55, 0.5, 0.38, '#ffd27a'], [0.14, 0.55, 0.5, 0.38, '#ffd27a'], [0, 2.08, 0.18, 0.5, '#fff0c8'], [0, 1.15, -1.05, 0.6, '#ffcf70']];

    G3D.def('c3:382', {
      len: QI.END, hold: 1, R: QI.RO, at: 0, models: ['kyogre'], edge: 'sea', env: { rim: '#a8c8ff', glow: '#2a6c9a', fog: '#16222e', glowH: 3 },
      make(K, T) { const S = storm(T), g = S.gr = kyFig(); S.T = T; S.scene.add(g.root); S.figs.push(g); S.v3 = new T.Vector3();
        const su = S.sea.material.uniforms; su.uTime = { value: 0 };            /* havets egen tid (TS), se over */
        S.sprays.forEach(p => slowIn(p, SLOW));
        S.boat = mkBoat2(K, T); S.scene.add(S.boat);
        S.lamps = LAMPS.map(q => { const m = K.light(1, q[4], { depth: true }); m.renderOrder = 7; S.scene.add(m); return m; });
        const wet = K.rockMat({ a: '#0b1218', b: '#222e37', str: 0.32, sm: 0.6, hot: 0, lv: 0, tint: [0.07, 0.09, 0.11], top: 0.25, rough: 0.9 });
        S.rk = RK.map(([x, z, r, h, sd]) => { const m = K.boulder(r, sd, { sy: h / r, j: 0.32, d: 2, mat: wet }); m.position.set(x, h * 0.3 - 1.5, z); S.scene.add(m); return m; });
        const SP = { t0: -1e5, shade: 1, g: 16, drag: 0.6, px: 80, sz0: 0.6, sz1: 2.1, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.62, fade: 0.5, floor: -1 };
        /* Sprut mot stakkene når en bølge knuser: mest opp og bort fra ham (han ligger i origo). */
        S.rsp = RK.map(([x, z, r, h], i) => { const ox = -x / Math.hypot(x, z), oz = -z / Math.hypot(x, z), p = slowP(520, j => { const a = rnd(j, 60 + i) * TAU, q = rnd(j, 61 + i);
          return { p: [cos(a) * r * 0.8 + ox * r, 0.5 + rnd(j, 62 + i) * 2, sin(a) * r * 0.8 + oz * r], v: [cos(a) * (2 + 6 * (1 - q)) - ox * 6, 12 + 16 * q + h * 0.6, sin(a) * (2 + 6 * (1 - q)) - oz * 6], b: rnd(j, 63 + i) * 0.35, l: 1.8 + rnd(j, 64 + i), z: 1.0 + rnd(j, 65 + i) * 2.6 }; }, Object.assign({}, SP, { a: 0.7 }), SLOW);
          p.position.set(x, 0, z); S.scene.add(p); return p; });
        /* Vannet som fosser av ryggen og finnene når han kommer opp (Godzilla 2:12–2:22). */
        S.casc = slowP(520, i => { const a = rnd(i, 71) * TAU, rr = Math.sqrt(rnd(i, 72)); return { p: [cos(a) * 5 * rr, 2.6 + rnd(i, 73) * 1.4, sin(a) * 9 * rr], v: [cos(a) * (1.5 + 3 * rr), -0.6 - rnd(i, 74) * 2, sin(a) * (1 + 2 * rr)], b: rnd(i, 75) * 4, l: 1.1 + rnd(i, 76) * 0.8, z: 0.6 + rnd(i, 77) * 1.5 }; },
          { loop: 1, shade: 1, g: 14, px: 75, c: ['#eaf6ff', '#a8c4d8', '#5a7486'], a: 0.85, fade: 0.7, floor: -1 }, SLOW); S.scene.add(S.casc);
        S.fsp = [-1, 1].map(sd => { const p = slowP(260, i => { const q = rnd(i, 81 + sd); return { p: [(rnd(i, 82 + sd) - 0.5) * 3, 2 + q * 5, (rnd(i, 83 + sd) - 0.5) * 2], v: [(rnd(i, 84 + sd) - 0.5) * 2 + sd * 1.2, 2 + 5 * rnd(i, 85 + sd), (rnd(i, 86 + sd) - 0.5) * 2], b: rnd(i, 87 + sd) * 1.6, l: 1.6 + rnd(i, 88 + sd), z: 0.6 + rnd(i, 89 + sd) * 1.6 }; },
          Object.assign({}, SP, { a: 0.8 }), SLOW); S.scene.add(p); return p; });
        /* Sprut fra baugen (0:10,73) og når båten treffer vannet (0:26,02). */
        S.bow = slowP(140, i => { const a = (rnd(i, 91) - 0.5) * 2.2, q = rnd(i, 92); return { p: [(rnd(i, 93) - 0.5) * 0.8, 0.2, 0.9], v: [sin(a) * (2 + 2.5 * q), 3 + 4 * q, 2 + 2.5 * cos(a) * q], b: rnd(i, 94) * 0.2, l: 1.4 + rnd(i, 95) * 0.6, z: 0.3 + rnd(i, 96) * 0.6 }; }, SP, SLOW); S.scene.add(S.bow);
        S.cap = slowP(420, i => { const a = rnd(i, 101) * TAU, q = rnd(i, 102); return { p: [cos(a) * 1.6, 0.3, sin(a) * 1.6], v: [cos(a) * (2 + 6 * q), 8 + 13 * (1 - q), sin(a) * (2 + 6 * q)], b: rnd(i, 103) * 0.3, l: 1.8 + rnd(i, 104), z: 1.6 + rnd(i, 105) * 3 }; }, Object.assign({}, SP, { px: 140, a: 0.75 }), SLOW); S.scene.add(S.cap);
        return S; },
      act(S, t, o) {
        const g = S.gr, U = K.U(), su = S.sea.material.uniforms, ts = t * TS; su.uTime.value = ts;
        const H = (x, z) => K.seaH(su, x, z, ts);
        /* Stormen kommer nærmere gjennom hele introen. Dønningene blir høyere (ikke raskere) fra 0:13,2. */
        const k = 1 + 0.2 * seg(t, 0, QI.B6) + 0.45 * io(seg(t, QI.B6, QI.UP)) + 0.1 * seg(t, QI.RO, QI.RO + 0.6), kk = k - 1;
        su.uSea.value.set(1.15 + 0.5 * kk, 1.3 + 0.5 * kk, 0.3 + 0.1 * kk, min(1, 0.8 + 0.25 * kk)); su.uWind.value.set(0.35, 1, 1.05, 0);
        S.st = 0.32 + 0.3 * seg(t, 0, QI.UP) + 0.1 * seg(t, QI.UP, QI.RO); S.sta = PI; S.grey = 0.5 * S.st;
        /* Lynene slår ned et stykke unna, bak og rundt ham, aldri på ham (Jazz 20.11). Bare lynet i brølet står nær, bak ham, som i skisse 1 («Det passet»). */
        const L = []; for (const q of strikes(t, 0.12 + 0.3 * seg(t, 0, QI.RO), 61)) L.push({ d: t - q[0], k: q[1] * 0.7, a: q[2] * 0.5, s: q[3] });
        for (const [tb, kk2, a, near] of [[QI.LY0, 0.7, 0.05, 0], [QI.PASS, 0.6, -0.9, 0], [QI.LY, 1, 0.6, 0], [QI.W2, 0.75, -0.8, 0], [QI.W3, 0.8, 1.1, 0], [QI.W4, 0.9, -1.2, 0], [QI.RO, 1, -0.62, 1], [QI.RO + 0.35, 0.9, 1.3, 0], [QI.RO + 0.7, 0.85, -1.4, 0]])
          L.push({ d: t - tb, k: kk2, a, s: floor(tb * 31), near: !!near });
        S.L = L; const fl = flashOf(L); S.fl = fl;
        lerpC(su.uSkyA, '#2c3c4a', '#b8cce8', fl); lerpC(su.uSkyB, '#0a121e', '#40557a', fl); lerpC(su.uDeep, '#020f18', '#0a2a3a', fl * 0.6); su.uBri.value = 1 + 0.3 * fl;
        /* De fjerne stakkene i kysten: sprut når en topp når dem (i havets tid, gjort om til filmens). */
        S.stacks.forEach((m, i) => S.fx(S.sprays[i], crestAt(su, m.position.x, m.position.z, ts) / TS));

        /* Kyogre: forbi under båten (0:04,57–0:12,5), opp fra dypet under den (0:13,2–0:23), finnene først (0:23,03), ryggen som en øy, så ligger han høyt og rir på dønningene. */
        let x = 0, y = -40, z = 0, yaw = 0, pit = 0, sh = 0, fin = 0, gl = 0;
        if (t >= QI.PASS - 0.3 && t < QI.W2 + 0.6) {
          z = 2.9 - 8 * (t - QI.LY);   /* jevn fart, han stopper aldri (Jazz 20.11): inn på 0:04,57, midt under båten i lynet 0:07,66, halen ute på 0:10,73 */ x = BT[0] + 0.4; y = -7; yaw = PI; sh = 0.8; gl = 0.12; }
        else if (t >= QI.B6 && t < QI.UP) { const u = seg(t, QI.B6, QI.UP); y = mix(-30, -6.6, io(u)); yaw = 0; sh = 0.25 + 0.65 * u; gl = 0.06 + 0.4 * u * u; fin = 0.75 * seg(t, QI.B6 + 4, QI.UP - 1.5); }
        else if (t >= QI.UP) { const sea = H(0, 0), y1 = KYH + 0.8 * sea; y = kf(t, [[QI.UP, -6.4], [24.0, -3.9, io], [26.0, y1, io]]); if (t >= 26.0) y = y1;
          fin = 0.75 * (1 - io(seg(t, 24.3, 27.2))) + 0.12 * seg(t, 24.3, 27.2); sh = 0.6 * (1 - seg(t, QI.UP, 24.6));
          yaw = -0.4 * io(seg(t, 28.2, 38.2)); }
        g.root.visible = y > -32; g.root.position.set(x, y, z); g.root.rotation.set(pit, yaw + (t >= QI.UP ? 0.05 * sin(t * 0.3) : 0), (t >= QI.HIT ? 0.03 * sin(t * 0.37) : 0));
        SWIM(g, t, t < QI.UP ? 0.8 : 0.25, t < QI.UP ? 1.1 : 0.8);
        g.add({ '*Shoulder': [0, 0, 1] }, fin);
        /* Pulsene: han løfter seg litt, linjene blusser, og en ringbølge går ut fra ham. Forvarselet 0:39,24 og brølet 0:41,52. */
        let pul = 0; for (const tp of [QI.R1, QI.R2, QI.R3]) pul = max(pul, hit(t, tp, 1.6)); g.add({ '*Shoulder': [0, 0, 0.18], Neck: [0, -0.06, 0], Hips: [0, -0.05, 0] }, pul);
        const dk = kf(t, [[QI.DK - 0.7, 0], [QI.DK, 0.75, io], [QI.RO - 0.12, 1, io], [QI.RO + 0.04, 0, eo]]), r2 = t < QI.RO ? 0 : back(seg(t, QI.RO, QI.RO + 0.3), 2.4) * (1 - io(seg(t, QI.NM + 0.2, QI.NM + 0.9)));
        g.add(DUCK, dk); g.add(ROAR, r2); g.rot('Jaw', 0, 0.04 * sin(t * 57) * r2, 0); S.rw = r2; S.mouth = null;
        g.eye(0, r2 > 0.2 ? 0.75 : 0, 0.6);   /* øynene er åpne hele tiden: øyne som åpner seg er Groudon sitt (Jazz 20.11) */
        lines(g, 0.85 + 0.5 * (y < -1 ? 1 : 0) * (0.6 + 0.4 * sin(t * 2.2)) + 0.9 * pul + 0.5 * dk + 0.5 * r2, 0);
        /* Skyggen og det røde skjæret i havet; lynet 0:07,66 gjør hele kroppen tydelig. */
        su.uBody.value.set(x, z, 12, y < -1 ? min(1, sh * (0.85 + 1.2 * fl)) : 0); su.uBodyD.value.set(sin(yaw), cos(yaw), 6, 1);
        su.uGlo.value.set(x, z, 5.5 + 3 * seg(t, QI.B6, QI.UP), y < -1 ? gl + 0.22 * fl : 0); su.uGloC.value.set(0.9, 0.12, 0.14);

        /* Båten: flyter tungt på dønningene, krenger i kjølvannet (0:09,08) og stamper i en topp (0:10,73); løftes av ryggen, glir av og velter (0:26,02), og er borte. */
        const b = S.boat; let bx = BT[0], bz = BT[1], by, pitch, roll, alive = t < QI.GONE;
        const sea = (xx, zz) => H(xx, zz), yawB = 0.55;
        const fw = [sin(yawB), cos(yawB)], sd = [cos(yawB), -sin(yawB)];
        if (t < QI.LIFT) { by = sea(bx, bz) - 0.08; pitch = Math.atan2(sea(bx - fw[0] * 1.2, bz - fw[1] * 1.2) - sea(bx + fw[0] * 1.2, bz + fw[1] * 1.2), 2.4) * 0.9; roll = Math.atan2(sea(bx - sd[0] * 0.5, bz - sd[1] * 0.5) - sea(bx + sd[0] * 0.5, bz + sd[1] * 0.5), 1.0) * 0.6;
          const wk = t > QI.W1 ? Math.exp(-(t - QI.W1) / 1.6) * sin((t - QI.W1) * 2.1) : 0; roll += 0.42 * wk; by += 0.25 * wk;
          pitch -= 0.22 * (t > QI.W2 ? Math.exp(-(t - QI.W2) / 0.9) * sin((t - QI.W2) * 2.6) : 0);
          if (t >= QI.UP) { const lift = seg(t, QI.UP, QI.LIFT); by += 0.6 * lift; roll += 0.1 * lift * sin(t * 3); } }
        else if (t < QI.HIT) { const u = ei(seg(t, QI.SLIDE, QI.HIT)); bx = BT[0] + 6.5 * u; const top = backTop(y, bx, bz), s0 = sea(bx, bz), on = top > s0 - 0.1;
          by = on ? top - 0.12 : s0 - 0.08; const e = 0.25, d = (backTop(y, bx + e, bz) - backTop(y, bx - e, bz)) / (2 * e); roll = on ? -Math.atan(isFinite(d) ? max(-3, min(3, d)) : 0) : 0.5; pitch = 0.08 * sin(t * 1.3); }
        else { const u = seg(t, QI.HIT, QI.ROLL + 0.3); bx = BT[0] + 6.5 + 1.2 * seg(t, QI.HIT, QI.GONE); by = sea(bx, bz) - 0.1 - 2.6 * ei(seg(t, QI.ROLL, QI.GONE)); roll = mix(0.9, PI * 0.96, io(u)); pitch = 0.25 * u; }
        b.visible = alive; b.position.set(bx, by, bz); b.rotation.set(pitch, yawB, roll); b.updateMatrixWorld(true);
        const on = t < QI.HIT ? 1 : t < QI.HIT + 0.25 ? (sin(t * 90) > 0 ? 0.6 : 0) : 0;   /* lysene slukner når båten treffer vannet */
        S.lamps.forEach((m, i) => { const q = LAMPS[i]; m.visible = alive && on > 0; m.position.copy(S.v3.set(q[0], q[1], q[2]).applyMatrix4(b.matrixWorld)); K.face(m); m.scale.setScalar(q[3] * (S.shot === 1 ? 2.2 : 1) * (0.8 + 0.1 * sin(t * 11 + i)));
          m.material.uniforms.uA.value = on * (i === 3 ? 0.8 + 0.2 * sin(t * 13.3) * sin(t * 7.1) : 0.9); });
        S.fx(S.bow, QI.W2 - 0.05, bx, by, bz); S.bow.rotation.y = yawB; S.fx(S.cap, QI.HIT, BT[0] + 6.5, 0, bz); S.cap.visible = t < 27.9;

        /* Ringbølgene (0:28,36 · 0:31,91 · 0:35,51, og brølet): havet løfter seg (uRH, motor.py) med skum på toppen, og de knuser mot stakkene i tungt, langsomt sprut. */
        for (let i = 0; i < 4; i++) { const r = ringAt(i, t); su.uRH.value[i].set(0, 0, r ? r.R : 0, r ? r.a : 0); }
        const ring = (i, xx, zz, R, a) => su.uRing.value[i].set(xx, zz, R, a);
        if (t < QI.R1) { ring(0, -9.5, 2, 1.5 + (t - QI.UP) * 2.2, t >= QI.UP ? hit(t, QI.UP, 3.5) : 0); ring(1, 9.5, 2, 1.5 + (t - QI.UP) * 2.2, t >= QI.UP ? hit(t, QI.UP, 3.5) : 0);
          ring(2, BT[0] + 6.5, bz, 1 + (t - QI.HIT) * 3.5, t >= QI.HIT ? hit(t, QI.HIT, 2.5) : 0); ring(3, 0, 0, 0, 0); }
        else for (let i = 0; i < 4; i++) { const r = ringAt(i, t); ring(i, 0, 0, r ? r.R - 0.6 : 0, r ? 0.75 * c01(r.a / 0.5) : 0); }
        const HITS = [[QI.W3, 0], [QI.W4, 1], [QI.R2, 0], [QI.R3, 2], [38.53, 1]];
        S.rk.forEach((m, i) => { const hs = HITS.filter(q => q[1] === i && t >= q[0]); S.fx(S.rsp[i], hs.length ? hs[hs.length - 1][0] : -1e5); });
        S.casc.position.set(0, y - KYH, 0); S.casc.visible = t >= QI.LIFT && t < QI.R2; S.casc.material.uniforms.uA.value = 0.85 * seg(t, QI.LIFT, QI.LIFT + 0.6) * (1 - seg(t, QI.HIT + 1.5, QI.R2));
        S.fsp.forEach((p, i) => S.fx(p, QI.UP + 0.2, (i ? 9.5 : -9.5), 0, 2));
        su.uWade.value.set(t >= QI.UP ? 0 : bx, t >= QI.UP ? 0 : bz, t >= QI.UP ? 9 : 1.7, t >= QI.UP ? 0.7 * seg(t, QI.UP + 0.6, 26.0) : 0.6);
        /* Lyset: kaldt og mørkt, gråere og tettere dis jo nærmere stormen er; lynet lyser opp alt. */
        lerpC(U.uKeyC, '#5a6c80', '#e8f2ff', fl); lerpC(U.uShC, '#0a141e', '#3a4c66', fl); U.uRimK.value = 0.85; U.uGlow.value = 0.25;
        U.uFog.value.set(40 - 14 * S.st, 320 - 120 * S.st, 0.88); lerpC(U.uFogC, '#121c26', '#5a7090', fl); S.k = k; S.glo = 0;
      },
      shots: [
        /* 1 Stormen filmes: lavt over havet mot veggskyen; tråleren klatrer sakte over dønningene. */
        [0, (S, u, a, t) => { const e = io(u), x = mix(5, 4, e), z = mix(-21, -18, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); K.cam(x, h + 2.6, z, mix(1.5, 1, e), 4 + 0.4 * h, 160, 44, 0.02); S.post.fade = 1 - seg(t, 0.9, 1.9); }],
        /* 2 Ovenfra: båten alene; skyggen kommer inn nedenfra på 0:04,57, glir under båten i stillheten, lynet viser hele kroppen, og den er ute før klippet. */
        [QI.PASS - 0.04, (S, u, a, t) => { K.cam(BT[0] + 0.6, 26, BT[1] + 3.6, BT[0] + 0.6, 0, BT[1] + 0.4, 52, 0); S.post.fl = 0.35 * hit(t, QI.LY, 0.12); S.post.flc = '#e8f2ff'; S.post.sh = 0.6 * hit(t, QI.W1, 0.8); }],
        /* 3 Noe stort kommer: lavt ved båten mot stakkene; det røde skjæret vokser under den. */
        [QI.B6, (S, u, a, t) => { const e = io(u), x = mix(10, 8.5, e), z = mix(13, 11, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); K.cam(x, h + 3.2, z, -3, 1.2, -12, 48, -0.02); S.post.sh = 0.7 * hit(t, QI.W3, 0.6) + 0.8 * hit(t, QI.W4, 0.6) + 0.25 * seg(t, QI.B6, QI.UP); }],
        /* 4 Finnene først: lavt og rett forfra; båten midt i bildet mellom finnene. Ryggen løfter den, den glir av og velter. */
        [QI.UP - 0.05, (S, u, a, t) => { const e = io(seg(t, QI.UP, QI.HIT)), e2 = io(seg(t, QI.HIT, 27.9)), x = mix(5, 6, e), z = 54, h = K.seaH(S.sea.material.uniforms, x, z, t * TS); K.cam(x, h * 0.2 + mix(11.2, 11.8, e), z, mix(0, 2.2, e) + 1.2 * e2, mix(1.4, 2.6, e), BT[1], mix(23, 26, e), 0.01); S.post.sh = 1.6 * hit(t, QI.UP, 1.6) + 1.2 * hit(t, QI.HIT, 1.2); }],
        /* 5 Ringbølgene, litt ovenfra: han ligger høyt i vannet, og ringene ruller ut mot stakkene. */
        [27.9, (S, u, a, t) => { const e = io(u); K.cam(mix(26, 24, e), mix(12, 11, e), mix(25, 23, e), -2, 1, -4, 46, -0.01); S.post.sh = 0.5 * hit(t, QI.R1, 0.8) + 0.9 * hit(t, QI.R2, 0.9); }],
        /* 6 Lavt ved stakken: ringen ruller mot kameraet og knuser mot stakken (0:35,51). */
        [33.9, (S, u, a, t) => { const e = io(u), x = mix(-37, -35, e), z = mix(27, 25, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); K.cam(x, h * 0.4 + 7, z, -4, 2, 0, 44, 0.02); S.post.sh = 0.6 * hit(t, QI.R2 + 0.2, 0.8) + 1.2 * hit(t, QI.R3, 1.0); }],
        /* 7 Vidt og lavt for forvarselet og brølet (som i skisse 1, uten båten); kameraet høyt nok til at ingen bølge skjuler ham. */
        [38.45, (S, u, a, t) => { const k2 = io(seg(t, 38.45, QI.RO)), w = 0.05 * sin(max(0, t - QI.RO) * 0.25), x = mix(16, 13, k2) + w * 4, z = mix(31, 27, k2), h = K.seaH(S.sea.material.uniforms, x, z, t * TS);
          K.cam(x, h * 0.4 + 6.2, z, -1.5, mix(2.2, 3.6, k2), 0, 50, -0.03); S.post.fl = max(0.45 * hit(t, QI.RO, 0.12), 0.3 * hit(t, QI.RO + 0.35, 0.1)); S.post.flc = '#eef6ff'; S.post.sh = 1.0 * hit(t, 38.53, 0.8) + 4 * hit(t, QI.RO, 1.2) + 0.6 * S.rw; }],
      ],
    });
    X.reg('c3:382', { spid: 382, skin: 'sea', back: backS, look: lookS, roar: () => QI.RO, cues: [],
      over: (x, t, o) => X.plate(x, t - QI.NM, Object.assign({ skin: 'sea' }, o)),
      fx(S, t, P) { rainFx(S, t, S.k || 1, 0.4 + 0.6 * seg(t, 0, QI.UP));
        if (S.shot === 6) { const hz = G3D.view().y; for (const q of S.L || []) if (q.near) { const a = flick(q.d) * q.k; if (a > 0.05) { const x = 256 + q.a * 220; nearBolt(x + (rnd(q.s, 3) - 0.5) * 60, -10, x, hz + 6, a, q.s * 5 + (q.d > 0.12 ? 2 : 0), 3.2); } } } } });   /* lynet i brølet ender i horisonten ved siden av ham, bak ham (Jazz 20.11: aldri på ham) */

    /* ---------- Primal, skisse 4 (på låtas klokke fra 3:15,7; Jazz 20.11, chat 3) ----------
       Endret fra skisse 3 (Jazz: «Han skal være opp på 3:43 akkurat, da er det første slaget», «Forstatt ingen lys ned i vannet», «fortsatt er han synlig hele tiden hvor han
       bare venter», og «stormen er aaalt for dårlig … Det skal forsse nedover med vann som også gjør det lettere å skille. Du har masse bilder å gå etter»):
       1 stormen langt borte (i 3D: hyllesky, regnsøyler som fosser ned, lyn inne i regnet; himmelen over oss er lysere) · 2 dronen langs fronten (vinkelen fra skisse 3, som
       var bedre): stormen til venstre presser inn mot arenaen, havet under den er mørkt og grovt, utenfor grått og roligere; han er ikke med · 3 han stuper (3:29,1) ·
       4 vannet lukker seg · 5 et lys langt nede (3:34,9): lite og svakt, og det stiger hele tiden · 6 sterkere (3:39,8), og dritfort opp på riseren (3:42,45) · 7 han er oppe på
       det første slaget 3:42,96 (sub-slaget, låtas rutenett på 0,8 s) med lyn på begge sider og stiger videre til det blir svart 3:43,90 · 8 pangen 3:44,55 lenger borte ·
       9 svart · 10 smellet 3:46,15: han er alt oppe foran oss og brøler. Havet og sprutet går i stor målestokk (TS, SLOW). */
    const QP = { DR: 5.44, ARR: 11.84, DV: 13.43, CL: 16.6, DEEP: 19.2, SH: 24.1, UP: 26.75, C: 27.26, B1: 28.2, S: 28.85, B2: 29.82, L: 30.45, N: 31.15, F: 32.5, E: 32.82 };
    const GL = [HOME[0], HOME[2] + 4];   /* der lyset og Primal kommer opp */

    /* ---------- Stormen i 3D (bare i skissen; Fable lager den ordentlig) ----------
       Som bildene Jazz sendte (fanart/kyogre/IMG_6597 og IMG_6596): en hyllesky med lys, bulende overside og mørk underside, regnsøyler som fosser ned i havet under den (lysere
       enn skyen bak), lyn inne i regnet, og havet under stormen er mørkt og grovt med skum, mens havet utenfor er roligere og grått (motor.py: uStm). Fronten går langs x og kommer
       fra det åpne havet (+Z) mot arenaen. Dottene og søylene ligger i forhold til fronten (z' bak den), og fronten flyttes (zfAt). */
    const zfAt = t => t < QP.DR ? mix(205, 188, t / QP.DR) : t < QP.DV ? mix(26, -6, (t - QP.DR) / (QP.DV - QP.DR)) : -1000;   /* forbi arenaen (z = 0) på 3:27,54 */
    /* Dottene: x, y, z' (bak fronten), størrelse, flathet, variant (0–3), lys (0 mørk … 1 lys), dekning. */
    const PUFFS = (() => { const L = [];
      for (let i = 0; i < 110; i++) L.push([-420 + i * 7.6 + (rnd(i, 801) - 0.5) * 5, 24 + rnd(i, 802) * 2.5, -7 + rnd(i, 803) * 5, 22 + rnd(i, 804) * 14, 0.55, floor(rnd(i, 805) * 3), 0.8 + 0.2 * rnd(i, 806), 0.96]);   /* leppa: en sammenhengende rull langs fronten (hyllesky) */
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
    const FS_PUFF = `uniform sampler2D tP; uniform vec3 uCL, uCD, uCB, uCF; uniform vec4 uLit; uniform float uFk, uAl; varying vec2 vUv; varying vec4 vP; varying vec3 vW;
${K.GLSL.COMMON}
void main(){ vec2 uv = vec2(mod(vP.x, 2.) * .5, .5 - floor(vP.x / 2.) * .5) + clamp(vUv, .004, .996) * .5; vec4 tx = texture2D(tP, uv);
  float a = tx.r * vP.w * uAl; if (a < .004) discard;
  vec3 c = mix(uCD, uCL, smoothstep(.12, .95, tx.g) * vP.y); c = mix(uCB, c, smoothstep(.0, .55, vUv.y + .25 * vP.y));
  float d = length(vW - uLit.xyz); c += uCF * uLit.w * exp(-d * d / 3500.) * (.3 + .5 * (1. - tx.g));
  c = mix(c, uFogC, fogK(vW) * uFk); gl_FragColor = vec4(c * a, a); }`;
    /* Regnsøylene: står loddrett og snur seg mot kameraet, bredere nederst og skrå med vinden; striper som fosser ned, store flak, og dis der det treffer havet. */
    const VS_RAIN = `attribute vec4 aR, aQ; varying vec2 vUv; varying vec4 vQ; varying vec3 vW;
void main(){ vec3 b = vec3(aR.x, 0., aR.y), tc = cameraPosition - b; tc.y = 0.; vec3 rt = normalize(vec3(tc.z, 0., -tc.x) + vec3(1e-4, 0., 0.));
  float k = position.y + .5, wd = aR.z * (1. + .4 * (1. - k)); vec3 w = b + rt * position.x * wd + vec3(.15, 0., -1.) * aQ.z * (1. - k) * aR.z; w.y = mix(-1., aR.w, k);
  vW = w; vUv = vec2(position.x + .5, k); vQ = aQ; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`;
    const FS_RAIN = `uniform vec3 uCR, uCF; uniform vec4 uLit; uniform float uFk, uAl; varying vec2 vUv; varying vec4 vQ; varying vec3 vW;
${K.GLSL.COMMON}
void main(){ float x = vUv.x - .5, y = vUv.y, sd = vQ.y;
  float prof = exp(-x * x / (.028 + .04 * (1. - y))) * (.75 + .5 * vn(vec2(vUv.x * 9. + sd, y * .8)));
  float br = fbm(vec2(vUv.x * 2.4 + sd, y * 1.1 - uTime * .25));
  float st = vn(vec2(vUv.x * 70. + sd * 7., y * 3. + uTime * 3.2)) * .55 + vn(vec2(vUv.x * 190. + sd * 3., y * 7. + uTime * 8.)) * .45;
  float top = smoothstep(1., .8, y), bot = 1. + 1.1 * smoothstep(.15, 0., y);
  float a = prof * (.5 + .5 * smoothstep(.3, .8, st)) * (.5 + .9 * br) * top * bot * vQ.x * uAl; if (a < .004) discard;
  vec3 c = uCR * (.82 + .35 * st + .22 * smoothstep(.2, 0., y)); float d = length(vW - uLit.xyz); c += uCF * uLit.w * exp(-d * d / 2200.) * .8;
  c = mix(c, uFogC, fogK(vW) * uFk); a = min(a, .92); gl_FragColor = vec4(c * a, a); }`;
    const mkStorm = (S, K, T) => {
      const inst = (n, attrs, vs, fs, un, ro) => { const q = new T.PlaneGeometry(1, 1), g = new T.InstancedBufferGeometry(); g.index = q.index; g.setAttribute('position', q.attributes.position); g.instanceCount = n;
        const A = {}; for (const [nm, sz] of attrs) { A[nm] = new T.InstancedBufferAttribute(new Float32Array(n * sz), sz); A[nm].setUsage(T.DynamicDrawUsage); g.setAttribute(nm, A[nm]); }
        const m = new T.Mesh(g, K.shader(vs, fs, un, Object.assign({ depthTest: true, side: T.DoubleSide }, K.blend.soft()))); m.frustumCulled = false; m.renderOrder = ro; S.scene.add(m); return { m, A, n }; };
      const v3 = () => K.uv(K.u3('#000000'));   /* farger (lerpC bruker setRGB) */
      S.puff = inst(PUFFS.length, [['aC', 4], ['aP', 4]], VS_PUFF, FS_PUFF, { tP: K.uv(puffTex(T)), uCL: v3(), uCD: v3(), uCB: v3(), uCF: K.uv(new T.Vector3(0.7, 0.82, 1)), uLit: K.uv(new T.Vector4()), uFk: K.uv(0.75), uAl: K.uv(1) }, 4);
      S.rain = inst(SHAFTS.length, [['aR', 4], ['aQ', 4]], VS_RAIN, FS_RAIN, { uCR: v3(), uCF: K.uv(new T.Vector3(0.7, 0.82, 1)), uLit: K.uv(new T.Vector4()), uFk: K.uv(0.75), uAl: K.uv(1) }, 5); };
    /* Hvert bilde: dottene og søylene sorteres bakfra (etter kameraet i dette bildet), og fronten flyttes. Inne i stormen (etter dronen) står søylene i en ring langt rundt oss. */
    const stormSort = (S, t) => {
      const zf = S.zf, cp = K.camPos(), P = S.puff, R = S.rain, inside = zf < -500, sy = S.sy || 1, ss = S.ss || 1; P.m.visible = !inside && S.stormOn;
      if (P.m.visible) { const C4 = P.A.aC.array, P4 = P.A.aP.array;
        PUFFS.map((q, i) => [i, (q[0] - cp.x) ** 2 + (q[1] * sy - cp.y) ** 2 + (q[2] + zf - cp.z) ** 2]).sort((a, b) => b[1] - a[1]).forEach(([i], j) => { const q = PUFFS[i]; C4.set([q[0], q[1] * sy, q[2] + zf, q[3] * ss], j * 4); P4.set([q[5], q[6], q[4], q[7]], j * 4); });
        P.A.aC.needsUpdate = P.A.aP.needsUpdate = true; }
      R.m.visible = S.stormOn; if (!R.m.visible) return;
      const pos = SHAFTS.map((q, i) => inside ? [HOME[0] + sin(i * 2.4 + q[5]) * (95 + q[1] * 1.5), HOME[2] + cos(i * 2.4 + q[5]) * (95 + q[1] * 1.5)] : [q[0], q[1] + zf]), R4 = R.A.aR.array, Q4 = R.A.aQ.array;
      pos.map((p, i) => [i, (p[0] - cp.x) ** 2 + (p[1] - cp.z) ** 2]).sort((a, b) => b[1] - a[1]).forEach(([i], j) => { const q = SHAFTS[i], p = pos[i]; R4.set([p[0], p[1], q[2] * (inside ? 1.6 : 1) * ss, q[3] * sy], j * 4); Q4.set([q[4], q[5], 0.22, 0], j * 4); });
      R.A.aR.needsUpdate = R.A.aQ.needsUpdate = true; };
    /* Lynene inne i stormen (1 og 2): fra skybasen ned i havet inne i regnet, og skyene lyser opp innenfra der det slår ned. [når, styrke, x, z'] */
    const BOLTS = (() => { const L = []; let tb = 0.35; for (let i = 0; tb < QP.DV - 0.2; i++) { const dr = tb >= QP.DR;
      L.push([tb, 0.65 + 0.35 * rnd(i, 871), dr ? -40 - rnd(i, 872) * 170 : -210 + rnd(i, 872) * 220, 12 + rnd(i, 873) * 45]);   /* i bildet: dronen ser mot vest, bilde 1 skrått mot venstre */ tb += 0.55 + rnd(i, 874) * 0.75; if (tb > QP.DR - 0.3 && tb < QP.DR) tb = QP.DR + 0.15; } return L; })();

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
        const lt = rnd(i, 706) > 0.45; C.blob(x, y, r, lt ? bl('#7a8793', '#36414b', ov) : bl('#28313a', '#0e1419', ov), (lt ? 0.3 : 0.4) + 0.2 * rnd(i, 707), 0, 0.26); }
      g.restore(); return { hz: v.y }; };
    const lookQ = (S, t, P, q, sn) => { look(S, t, P, q, sn); const ov = S.ov || 0; P.grade.sat *= 0.8 - 0.25 * ov; P.grade.con *= 1.02; P.bloom += 0.15 * (S.dlk || 0); };

    /* Lyset langt nede (Jazz: «bare en lysskilde langt nede», «primal lysene ser du også småt helt i starten … veldig svakt fordi han er langt nede … sterkere lysstyrke
       når han svømmer oppover»): en blå glød i havet (uDL) og oppå (glød og små, uskarpe striper av linjene hans, som om han kommer rett opp mot oss), skarpere og større jo
       høyere han er. Ingen kropp (Jazz: «fortsatt er han synlig hele tiden»). S.dl = { dep: dybden (62 … 0), k: styrken }. */
    const LIGHTS = [[-PI / 2, 0.12, 0.62, 1.3], [PI / 2, 0.15, 0.5, 1], [-0.22, 0.28, 1.15, 1.1], [PI + 0.22, 0.28, 1.15, 1.1], [0.38, 0.22, 0.85, 0.8], [PI - 0.38, 0.22, 0.85, 0.8], [-PI / 2 - 0.55, 0.38, 0.78, 0.7], [-PI / 2 + 0.55, 0.38, 0.78, 0.7]];
    const deepLight = (S, t) => {
      const D = S.dl; if (!D || D.k <= 0.01) return; const g = C.g, q = K.proj(GL[0], -0.2, GL[1]); if (q.z > 1) return;
      const dep = max(0.3, D.dep), sz = min(36, 640 / (dep + 14)), bl = min(10, 0.15 * dep + 0.5), k = D.k, wb = dep / 25;
      const cx = q.x + (1.8 * sin(t * 2.3) + 0.9 * sin(t * 4.1)) * wb, cy = q.y + 1.2 * cos(t * 1.9) * wb;
      C.blob(cx, cy, sz * 3.4, '#2a90ff', 0.28 * k, 1, 0.5); C.blob(cx, cy, sz * 1.6, '#6cc8ff', 0.4 * k, 1, 0.55); C.blob(cx, cy, sz * 0.6, '#e6f8ff', min(0.85, 0.55 * k * c01(1.5 - dep / 50)), 1, 0.65);
      g.save(); g.globalCompositeOperation = 'lighter'; g.filter = `blur(${bl.toFixed(1)}px)`; g.lineCap = 'round';
      for (let i = 0; i < LIGHTS.length; i++) { const [a0, r0, r1, w] = LIGHTS[i], a = a0 + 0.05 * sin(t * 2.6 + i);
        g.strokeStyle = `rgba(150,222,255,${c01(0.6 * k * (0.75 + 0.25 * sin(t * 5 + i * 1.7))).toFixed(3)})`; g.lineWidth = max(1.2, w * sz * 0.09);
        g.beginPath(); g.moveTo(cx + cos(a) * r0 * sz, cy + sin(a) * r0 * sz * 0.75); g.lineTo(cx + cos(a) * r1 * sz, cy + sin(a) * r1 * sz * 0.75); g.stroke(); }
      g.restore(); };

    G3D.def('c3:382p', {
      len: QP.E, R: QP.L, at: 195.7, models: ['kyogre', 'kyogre_primal'], edge: 'sea', env: { rim: '#a8c8ff', glow: '#2a8acc', fog: '#16222e', glowH: 3 },
      make(K, T) { const S = storm(T), g = S.gr = kyFig(), p = S.pg = kypFig(); S.scene.add(g.root); S.scene.add(p.root); S.figs.push(g, p); S.T = T;
        S.sea.material.uniforms.uTime = { value: 0 }; S.sprays.forEach(q => slowIn(q, SLOW)); mkStorm(S, K, T); S.cliff = S.scene.children[1];
        const pts = (n, f, o) => { const q = slowP(n, f, o, SLOW); S.scene.add(q); return q; };
        S.dsp = slowP(460, i => { const a = rnd(i, 11) * TAU, q = rnd(i, 12); return { p: [cos(a) * 5, 0.3, sin(a) * 4], v: [cos(a) * (3 + 9 * q), 8 + rnd(i, 13) * 16, sin(a) * (3 + 9 * q) - 5], b: rnd(i, 14) * 0.6, l: 1.4 + rnd(i, 15) * 0.6, z: 0.5 + rnd(i, 16) * 1.4 }; }, { t0: -1e5, shade: 1, g: 14, drag: 0.6, px: 80, sz0: 0.6, sz1: 2.2, c: ['#f4fbff', '#c4d8e4', '#6e8a9c'], a: 0.6, fade: 0.6, floor: -1 }, 0.6); S.scene.add(S.dsp);
        S.col = pts(620, i => { const a = rnd(i, 21) * TAU, q = rnd(i, 22), r = 3 + q * 6; return { p: [cos(a) * r, 0.5 + rnd(i, 23) * 3, sin(a) * r * 0.8], v: [cos(a) * (2 + 6 * q), 18 + rnd(i, 24) * 22 * (1 - 0.5 * q), sin(a) * (2 + 6 * q)], b: rnd(i, 25) * 0.55, l: 2.4 + rnd(i, 26), z: 1.2 + rnd(i, 27) * 2.6 }; }, { t0: -1e5, shade: 1, g: 16, drag: 0.5, px: 110, sz0: 0.6, sz1: 2.2, c: ['#f6fcff', '#c8dcea', '#708ea2'], a: 0.75, fade: 0.5, floor: -1 });
        S.brk = pts(520, i => { const a = rnd(i, 51) * TAU, q = rnd(i, 52); return { p: [cos(a) * 3 * q, 0.3, sin(a) * 3 * q], v: [cos(a) * (3 + 9 * q), 16 + 20 * rnd(i, 53), sin(a) * (3 + 9 * q)], b: rnd(i, 54) * 0.1, l: 1.8 + rnd(i, 55), z: 0.9 + rnd(i, 56) * 2.2 }; }, { t0: -1e5, shade: 1, g: 16, drag: 0.5, px: 95, c: ['#f6fcff', '#c8dcea', '#708ea2'], a: 0.85, fade: 0.5, floor: -1 });
        S.sheet = pts(220, i => { const a = rnd(i, 31) * TAU; return { p: [(rnd(i, 32) - 0.5) * 8, 4 + rnd(i, 33) * 14, (rnd(i, 34) - 0.5) * 6], v: [cos(a) * 2, -2 - rnd(i, 35) * 3, sin(a) * 2], b: rnd(i, 36) * 1.2, l: 1.1 + rnd(i, 37) * 0.6, z: 0.5 + rnd(i, 38) * 0.9 }; }, { t0: -1e5, shade: 1, g: 22, px: 70, c: ['#f0f8ff', '#a8c4d8', '#5a7486'], a: 0.85, fade: 0.8, floor: -1 });
        S.wallp = pts(380, i => { const a = rnd(i, 41) * TAU, q = rnd(i, 42), r = 5 + q * 12; return { p: [cos(a) * r, 0.5, sin(a) * r * 0.5], v: [cos(a) * (6 + 14 * q), 22 + rnd(i, 43) * 34 * (1 - 0.6 * q), sin(a) * (6 + 14 * q) * 0.35], b: rnd(i, 44) * 0.4, l: 2.8 + rnd(i, 45) * 1.2, z: 0.8 + rnd(i, 46) * 2.4 }; }, { t0: -1e5, shade: 1, g: 15, drag: 0.7, px: 90, sz0: 0.6, sz1: 2.4, c: ['#eef8ff', '#b8d0e0', '#5a7486'], a: 0.28, fade: 0.6, floor: -1 });
        return S; },
      act(S, t, o) {
        const g = S.gr, p = S.pg, U = K.U(), su = S.sea.material.uniforms, ts = t * TS; su.uTime.value = ts; S.under = 0;
        const black = (t >= QP.B1 && t < QP.S) || (t >= QP.B2 && t < QP.L); S.black = black;
        const drone = t >= QP.DR - 0.02 && t < QP.DV - 0.05, outside = t < QP.DV - 0.05;
        /* Stormen: langt borte (1), langs dronen (2), så er vi inne i den (Jazz: «helt til det høljer ned, er veldig grått»). */
        S.zf = zfAt(t); S.stormOn = !black; S.cliff.visible = t >= QP.DR - 0.02; S.sy = t < QP.DR - 0.02 ? 0.55 : 1; S.ss = 1; S.sa = PI; S.ov = outside ? (drone ? 0.12 * seg(t, QP.ARR - 1, QP.DV) : 0) : 1; S.sd = outside ? (drone ? 0.6 : 0.2) : 0;
        S.st = outside ? 0.35 : 1; S.grey = S.ov;
        const k = outside ? 1 : 1.5 + 0.3 * seg(t, QP.L, QP.L + 0.6), kk = k - 1;
        if (outside) { su.uSea.value.set(1.0, 0.7, 0.08, 0.06); su.uStm.value.set(S.zf + 4, 5, 1, 1); }
        else { su.uSea.value.set(1.15 + 0.6 * kk, 1.3 + 0.5 * kk, 0.06 + 0.1 * seg(t, QP.L, QP.L + 1), 1); su.uStm.value.set(-1000, 5, 1, 1); }   /* lite skum på toppene (store grå flater nært), småskum overalt (uStm) */
        su.uWind.value.set(0.35, 1, 1.05, 0);
        /* Lynene. Ute (1, 2): inne i regnet i stormen (BOLTS, i 3D); inne i stormen: masse, men aldri på ham (Jazz 20.11). De nære står ved kantene og ender i horisonten. */
        const L = [], BL = []; let lit = null;
        if (!black && outside) for (const [tb, kb, x, zz] of BOLTS) { const d = t - tb; if (d < 0 || d > 0.7) continue; const a = flick(d) * kb; BL.push({ d, k: kb, x, z: S.zf + zz, s: floor(tb * 41) });
          if (!lit || a > lit.a) lit = { a, x, z: S.zf + zz }; L.push({ d, k: kb * 0.3, a: PI, s: floor(tb * 41) }); }
        if (!black && !outside) { for (const q of strikes(t, t < QP.DEEP ? 0.9 : t < QP.L ? 0.3 : 2.6, 81)) L.push({ d: t - q[0], k: q[1] * 0.8, a: q[2], s: q[3], near: false });
          for (const [tb, kk2, a, nr] of [[QP.DV, 1, -0.85, 1], [QP.DEEP, 0.9, -0.2, 0], [QP.SH, 1, 0.25, 0], [QP.UP + 0.2, 0.8, -0.6, 0],
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
        S.stacks.forEach((m, i) => S.fx(S.sprays[i], crestAt(su, m.position.x, m.position.z, ts) / TS));
        /* Vanlig form: ligger høyt i havet og stuper fram og ned på 3:29,1. Han er ikke med før han stuper (Jazz: «fortsatt er han synlig hele tiden hvor han bare venter»). */
        const dv = io(seg(t, QP.DV, QP.DV + 1.5)), sink = ei(seg(t, QP.DV + 0.7, QP.DV + 3.2)), sea0 = K.seaH(su, HOME[0], HOME[2], ts);
        g.root.visible = !black && t >= QP.DV - 0.05 && t < QP.DV + 3.3;
        if (g.root.visible) { g.root.position.set(HOME[0], mix(KYH * 0.7 + 0.8 * sea0, -20, sink), HOME[2] + 7 * sink); g.root.rotation.set(-0.05 + 1.35 * dv, 0, 0); g.add({ Neck: [0, -0.08 * (1 - dv), 0] }, 1); g.add(DIVE, dv);
          SWIM(g, t, 0.7, 2.6); lines(g, 0.8 + 0.3 * dv, 0); g.eye(0, 0, 0.3); }
        /* Lyset langt nede fra 3:34,9: dybden 62 → 44 til suget (3:39,8), 44 → 24 til riseren (3:42,45), så dritfort opp til flaten på slaget (3:42,96). */
        const dep = t < QP.SH ? mix(62, 44, seg(t, QP.DEEP, QP.SH)) : t < QP.UP ? mix(44, 24, io(seg(t, QP.SH, QP.UP))) : mix(24, 0, ei(seg(t, QP.UP, QP.C)));
        const dlk = t >= QP.DEEP && t < QP.C ? (0.95 + 0.2 * seg(t, QP.DEEP, QP.SH) + 0.4 * seg(t, QP.SH, QP.UP) + 1.1 * ei(seg(t, QP.UP, QP.C))) * seg(t, QP.DEEP, QP.DEEP + 0.6) : 0;
        S.dl = { dep, k: dlk }; S.dlk = dlk;
        su.uDL.value.set(GL[0], GL[1], 4 + 10 * (1 - dep / 62), dlk > 0 ? min(1.4, dlk * (0.55 + 0.6 * (1 - dep / 62))) : 0); su.uGloC.value.set(0.12, 0.55, 1);
        /* Primal: under vann tegnes han ikke. Oppe på slaget 3:42,96 (halvveis ute når bildet kommer) og stiger videre uten å stoppe til det blir svart 3:43,90;
           lenger borte på 3:44,55 og stuper ned igjen; alt oppe foran oss på smellet 3:46,15. */
        p.root.visible = !black && t >= QP.C - 0.02; let glo = 0; S.rw = 0; S.glo = 0;
        if (t >= QP.C - 0.02 && t < QP.B1) { const u = seg(t, QP.C - 0.02, QP.B1 + 0.6); p.root.position.set(GL[0], mix(2.5, 15.5, eo(u)), GL[1]);   /* godt oppe allerede på slaget */ p.root.rotation.set(mix(-1.38, -1.12, io(u)), -0.3, 0.1);
          p.add(BREACH, 1); glo = 2.6; lines(p, glo, 1); S.glo = 1; }
        else if (t >= QP.S && t < QP.B2) { const u = seg(t, QP.S, QP.B2); p.root.position.set(HOME[0], mix(15, 0.5, ei(u)), HOME[2] + mix(2, 9, u)); p.root.rotation.set(mix(0.15, 1.35, io(u)), -0.3, 0.1 * sin(u * 3));
          p.add(BREACH, 1 - u); SWIM(p, t, 0.6, 3); glo = 2.2; lines(p, glo, 1); S.glo = 1; }
        else if (t >= QP.L) { const tq = t - QP.L, ry = KYH + 0.8 * sea0 + 1.8 * (1 - eo(seg(tq, 0, 1.1)));
          p.root.position.set(HOME[0], ry, HOME[2] + 2); p.root.rotation.set(mix(-0.32, 0, eo(seg(tq, 0, 1.0))), mix(0.1, -0.4, io(seg(tq, 0, QP.E - QP.L))), 0);
          const rw = back(seg(tq, 0, 0.35), 2.2) * (1 - 0.5 * io(seg(tq, 1.6, QP.E - QP.L))); p.add(ROAR, rw); p.rot('Jaw', 0, 0.04 * sin(t * 55) * rw, 0); S.rw = rw; S.mouth = null; p.eye(0, rw > 0.2 ? 0.75 : 0, 0.7);
          glo = 2.2 + 0.6 * rw + 0.6 * hit(tq, 0, 1); lines(p, glo, 1); S.glo = c01(glo - 1); }
        S.fx(S.brk, QP.C - 0.12, GL[0], 0, GL[1]); S.fx(S.sheet, QP.C + 0.05, GL[0], 4, GL[1]); S.fx(S.col, QP.S + 0.5, HOME[0], 0, HOME[2] + 8); S.fx(S.wallp, QP.L - 0.32, HOME[0], 0, HOME[2] + 3); S.fx(S.dsp, QP.DV + 1.0, HOME[0], 0, HOME[2] - 7);
        if (t >= QP.L) S.fx(S.sheet, QP.L - 0.15, HOME[0], 3, HOME[2] + 2);
        /* Havet: lyset fra dypet, og flaten buler opp over ham like før han bryter ut (uRH, motor.py). */
        su.uGlo.value.set(GL[0], GL[1], 9, t >= QP.UP && t < QP.B1 ? 0.25 * ei(seg(t, QP.UP, QP.C)) + (t >= QP.C ? 0.3 * (1 - seg(t, QP.C, QP.B1)) : 0) : t >= QP.L ? 0.1 + 0.1 * S.rw : 0); su.uBody.value.set(0, 0, 1, 0);
        su.uRH.value[0].set(GL[0], GL[1], 0, t >= QP.UP && t < QP.C + 0.3 ? 2.4 * ei(seg(t, QP.UP + 0.15, QP.C)) * (1 - seg(t, QP.C, QP.C + 0.3)) : 0);
        su.uWade.value.set(t >= QP.UP && t < QP.B1 ? GL[0] : HOME[0], t >= QP.UP && t < QP.B1 ? GL[1] : HOME[2] + (t >= QP.L ? 2 : 0), t >= QP.UP && t < QP.B1 ? 9 : 11, t >= QP.DV - 0.05 && t < QP.DV + 1.5 ? 0.6 : t >= QP.UP && t < QP.B1 ? 0.9 * seg(t, QP.UP + 0.2, QP.C) : t >= QP.L ? 0.9 : 0);
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
        [0, (S, u, a, t) => { const e = io(u), x = mix(34, 30, e), z = mix(36, 40, e), h = K.seaH(S.sea.material.uniforms, x, z, t * TS); K.cam(x, h * 0.5 + 4.6, z, mix(-150, -140, e), 12, 320, 42, 0.02); S.post.fade = 1 - seg(t, 0, 0.5); }],   /* skrått mot fronten, så den forsvinner mot horisonten til venstre (IMG_6596) */
        /* 2 Dronen følger stormen (3:21,14), vinkelen fra skisse 3 (Jazz: «var bedre»): høyt og skrått langs fronten mot vest. Stormen til venstre presser inn mot arenaen foran;
           havet under den er mørkt og grovt, utenfor grått og roligere. Fronten er forbi arenaen på 3:27,54. */
        [QP.DR - 0.02, (S, u, a, t) => { const e = io(u), cx = mix(66, 44, e), cy = mix(19, 15.5, e), cz = S.zf - 30; K.cam(cx, cy, cz, cx - 80, 9, cz + 9, 52, 0.02); }],
        /* 3 Han stuper (3:29,1): lavt bak ham, halefinnen slår en bue over kameraet, og sprut skyller over. */
        [QP.DV - 0.05, (S, u, a, t) => { K.cam(-1.6, 1.0, -13, 0, mix(2.6, 7, io(seg(t, QP.DV, QP.DV + 1.5))), mix(-2, -6, io(seg(t, QP.DV, QP.DV + 1.5))), 70, 0.03); S.post.sh = 2.2 * hit(t, QP.DV + 1.1, 0.8); S.post.fl = 0.35 * hit(t, QP.DV + 1.2, 0.35); S.post.flc = '#dde8ee'; }],
        /* 4 Vannet lukker seg over ham. */
        [QP.CL, (S, u, a, t) => { const e = io(u); K.cam(7, mix(7, 9, e), -14, 0, 0, 3, 50, 0); }],
        /* 5 Lyset langt nede (3:34,9): skrått over havet i stormen, som Godzilla 1:56–2:03; et lite, svakt lys dypt nede som stiger hele tiden. */
        [QP.DEEP - 0.03, (S, u, a, t) => { const e = io(u); K.cam(GL[0] + mix(7, 6, e), mix(9, 8.5, e), GL[1] + mix(27, 24, e), GL[0], 0, GL[1] - 5, 46, 0.02); S.post.sh = 0.4 * hit(t, QP.DEEP, 0.8); }],
        /* 6 Sterkere (3:39,8), og dritfort opp på riseren (3:42,45): nærmere og brattere; flaten buler opp og lyser like før han bryter ut. */
        [QP.SH - 0.03, (S, u, a, t) => { const e = io(seg(t, QP.SH, QP.UP)), e2 = ei(seg(t, QP.UP, QP.C)); K.cam(GL[0] + mix(4.5, 3.5, e), mix(9.5, 8.5, e) - 1.2 * e2, GL[1] + mix(16, 13, e) - 2 * e2, GL[0], 0, GL[1] - 1, mix(50, 54, e2), 0.02);
          S.post.sh = 0.25 + 0.4 * e + 2.6 * e2; }],
        /* 7 Det første slaget (3:42,96), som bildet Jazz sendte fra skisse 1: lavt fra siden; han er alt halvveis ute når bildet kommer, med lyn på begge sider, og stiger videre. */
        [QP.C - 0.02, (S, u, a, t) => { K.cam(23, 1.3, 54, 0, mix(7.5, 9.5, io(u)), 4, 48, -0.04); S.post.fl = 0.5 * hit(t, QP.C, 0.14); S.post.flc = '#e8f4ff'; S.post.sh = 5 * hit(t, QP.C, 0.6); }],
        /* Svart i stillheten (3:43,90–3:44,54). */
        [QP.B1, (S, u, a, t) => { K.cam(0, 200, 0, 0, 0, 1, 40); S.post.fade = 1; }],
        /* 8 Pangen (3:44,55): lenger borte; han er i lufta og stuper ned i vannet igjen. */
        [QP.S - 0.01, (S, u, a, t) => { K.cam(mix(58, 55, u), 7, mix(104, 100, u), 0, mix(9, 5, u), 4, 32, -0.02); S.post.sh = 1.2 * hit(t, QP.S + 0.5, 0.9); S.post.fl = 0.35 * hit(t, QP.S, 0.1); S.post.flc = '#e8f4ff'; }],
        /* Svart og stille (3:45,52–3:46,14). */
        [QP.B2, (S, u, a, t) => { K.cam(0, 200, 0, 0, 0, 1, 40); S.post.fade = 1; }],
        /* 9 Smellet (3:46,15): han er alt oppe foran oss (vannet fosser av ham, en vegg av sprut faller), brøler, lyn rundt ham, kort Primal-tekst; kampen tar til igjen. */
        [QP.L - 0.01, (S, u, a, t) => { const e = io(seg(t, QP.L, QP.E)); K.cam(mix(15, 12.5, e), mix(4.2, 3.6, e), mix(30, 26, e), -0.5, mix(3.6, 3.2, e), 2, 50, -0.03);
          S.post.fl = max(0.45 * hit(t, QP.L, 0.12), 0.3 * hit(t, QP.L + 0.4, 0.1), seg(t, QP.F, QP.E - 0.04)); S.post.flc = '#f2f8ff'; S.post.sh = 6 * hit(t, QP.L, 1.4) + 0.8 * S.rw; }],
      ].map(([t0, f]) => [t0, (S, u, a, t) => { f(S, u, a, t); stormSort(S, t); }]),
    });
    X.reg('c3:382p', { spid: 382, swirl: 0, skin: 'sea', back: skyQ, look: lookQ, roar: () => QP.L, cues: [],
      over(x, t, o) { const S = G3D.S('c3:382p'); let on = false; if (S.black) return false;
        /* α langt nede (Jazz 20.11: svakere, og det skal se ut som det er langt nede under vann): uskarpt, blått, lite, og det blafrer med bølgene. */
        if (S.dg > 0.02) { const q = K.proj(GL[0], -0.2, GL[1]); if (q.z < 1) { const cx = q.x / 2 + 1.6 * sin(t * 2.7) + 0.8 * sin(t * 4.3), cy = q.y / 2 + 1.2 * cos(t * 2.1);
          x.save(); x.filter = 'blur(1.6px)'; x.globalAlpha = c01(S.dg * 0.38); X.alpha(x, Math.round(cx), Math.round(cy), 4 + 2 * S.dg, 0.25 + 0.35 * S.dg);
          x.globalAlpha = c01(S.dg * 0.16); X.alpha(x, Math.round(cx + 1.5 * sin(t * 3.3)), Math.round(cy + 1), 5 + 2 * S.dg, 0.2); x.restore(); on = true; } }
        return X.plate(x, t - QP.N, { name: o.name, cap: 'Primal Reversion', sign: X.alpha, skin: 'sea' }) || on; },
      fx(S, t, P) { if (S.black) return; const outside = t < QP.DV - 0.05, dr = t >= QP.DR - 0.02 && outside;
        /* Lynene inne i stormen (1, 2): fra skybasen ned i havet, inne i regnet. */
        for (const b of S.BL || []) { const a = flick(b.d) * b.k; if (a < 0.05) continue; const q0 = K.proj(b.x, 27 * (S.sy || 1), b.z), q1 = K.proj(b.x + (rnd(b.s, 5) - 0.5) * 14, 0, b.z - 4); if (q0.z > 1 || q1.z > 1) continue;
          C.bolt(q0.x, q0.y, q1.x, q1.y, { seed: b.s * 5 + (b.d > 0.12 ? 2 : 0), col: '#a8c8ff', core: '#ffffff', w: dr ? 2.2 : 1.5, a, br: 4, depth: 6 }); C.blob(q0.x, q0.y, dr ? 120 : 70, '#b8d0ff', 0.35 * a, 1, 0.4); C.blob(q1.x, q1.y, dr ? 70 : 40, '#d8e8ff', 0.4 * a, 1, 0.3); }
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
