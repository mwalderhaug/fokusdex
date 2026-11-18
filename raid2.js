'use strict';
/* Fokusdex – de store legendariske (klasse 2): arenaen og introen til hver av dem, bygget med verktøykassa (fxgl.js, raidk.js) og arenarammeverket (arena.js).
   Planen for hver art står i work/RAIDS.md avsnitt 5. Alle tider er sekunder fra låta starter, lagt på slagene i musikken.
   Hver film ender i kampvinkelen, med den legendariske der den står når kampen begynner. Aldri mer enn tre store blink i sekundet. */
(() => {
  if (typeof ARENA === 'undefined') return;
  const C = CINE, K = C.kit, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, pulse, io, eo, ei, back, rnd, rgba, blend } = K;
  const hits = (t, l, d) => l.reduce((m, q) => max(m, hit(t, q, d)), 0), Z4 = [0, 0, 0, 0];
  /* Et flak av størknet skorpe (eller en klippe) på bakken: et mangekantet lokk med en kant ned i det som flyter rundt.
     (X, Z) = midten, R = radius, o = { seed, th (tykkelse), top, top2, side, glow (lyset i vannlinja), ga, n, sink (0–1: hvor dypt det ligger) }. */
  const floe = (X, Z, R, o) => {
    o = o || {}; const g = K.g, n = o.n || 16, sd = o.seed || 1, pts = [], gl = o.glow || '#ff5a14', ga = o.ga == null ? 0.42 : o.ga;
    for (let i = 0; i < n; i++) { const an = i / n * TAU, r = R * (0.8 + 0.34 * K.fbm1(i * 0.9, sd, 2) + 0.1 * rnd(i, sd)), p = K.gp(X + cos(an) * r * 1.3, Z + sin(an) * r); if (!p) return null; pts.push(p); }
    const c = K.gp(X, Z); if (!c) return null; const th = (o.th == null ? 9 : o.th) * (1 - (o.sink || 0) * 0.75), path = dy => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y + dy * p.s) : g.moveTo(p.x, p.y + dy * p.s)); g.closePath(); };
    let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = min(y0, p.y); y1 = max(y1, p.y); });
    K.blob(c.x, c.y + th * c.s * 0.6, R * c.s * 1.9, gl, ga * 0.6, 1, 0.2);
    /* Kanten ned i lavaen: mørk øverst, glødende i vannlinja. */
    const gn = min(1, ga * 1.5), sg = g.createLinearGradient(0, y1 - 1, 0, y1 + th * c.s + 1); sg.addColorStop(0, '#0d0707'); sg.addColorStop(0.6, blend('#0d0707', gl, 0.3 * gn)); sg.addColorStop(1, blend('#1a0a08', blend(gl, '#ffd9a0', 0.3), gn));
    g.save(); path(th); g.fillStyle = sg; g.fill();
    g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.strokeStyle = gl; g.lineWidth = min(5, max(1.5, c.s * 1.6)); g.globalAlpha = c01(ga * 1.5); g.beginPath(); pts.forEach((p, i) => { const q = pts[(i + 1) % n]; if (q.x < p.x) { g.moveTo(p.x, p.y + th * p.s); g.lineTo(q.x, q.y + th * q.s); } }); g.stroke();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    /* Lokket: basalt som er lysest lengst unna, med småflekker, et par sprekker og en kant som fanger lyset fra lavaen. */
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, o.top2 || '#40302c'); gr.addColorStop(0.6, o.top || '#231918'); gr.addColorStop(1, '#170f10'); g.fillStyle = gr; path(0); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 34; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.22)' : 'rgba(150,110,96,.13)'; g.fillRect(c.x + (rnd(i, sd + 11) - 0.5) * R * c.s * 2.8, y0 + rnd(i, sd + 12) * (y1 - y0), (3 + rnd(i, sd + 13) * 10) * min(2.5, c.s), max(1, min(2.5, c.s))); }
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = min(2, max(1, c.s * 0.5));
    for (let i = 0; i < 3; i++) { const a = pts[floor(rnd(i, sd + 7) * n)]; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(mix(a.x, c.x, 0.45) + (rnd(i, sd + 9) - 0.5) * R * c.s * 0.3, mix(a.y, c.y, 0.45)); g.lineTo(mix(a.x, c.x, 0.8) + (rnd(i, sd + 10) - 0.5) * R * c.s * 0.4, mix(a.y, c.y, 0.8)); g.stroke(); }
    g.restore();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = blend(gl, '#ffd9a0', 0.35); g.lineWidth = min(2.6, max(1, c.s * 0.9)); g.globalAlpha = c01(0.3 + ga * 0.7); g.beginPath(); pts.forEach((p, i) => { const q = pts[(i + 1) % n]; if (q.x < p.x) { g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); } }); g.stroke();
    g.restore(); return c;
  };
  /* Et steinspyd som skyter opp av bakken (Precipice Blades). k = hvor langt det er kommet (0–1), hgt = høyden i verdensenheter. */
  const blade = (X, Z, hgt, k, sd, hot) => {
    if (k <= 0) return; const b = K.gp(X, Z); if (!b) return; const g = K.g, hh = hgt * b.s * eo(k), w = hgt * b.s * 0.17, lean = (rnd(sd, 3) - 0.5) * w * 1.8, ht = hot == null ? 1 : hot, tip = [b.x + lean, b.y - hh];
    K.blob(b.x, b.y, w * 3.6, '#ff6a1c', 0.5 * (0.4 + 0.6 * ht), 1, 0.26);
    /* To flater som møtes i en egg: den ene fanger lyset fra lavaen, den andre ligger i skygge. Hakk langs kantene gjør det til stein, ikke en kjegle. */
    const L = [[b.x - w, b.y + 4], [b.x - w * 0.82, b.y - hh * 0.22], [b.x - w * 0.5 + lean * 0.3, b.y - hh * 0.5], [b.x - w * 0.34 + lean * 0.55, b.y - hh * 0.74], tip], Rr = [tip, [b.x + w * 0.3 + lean * 0.6, b.y - hh * 0.7], [b.x + w * 0.62 + lean * 0.3, b.y - hh * 0.42], [b.x + w * 0.74, b.y - hh * 0.2], [b.x + w, b.y + 4]], mid = [[b.x + w * 0.12, b.y + 4], [b.x + w * 0.06 + lean * 0.5, b.y - hh * 0.5], tip];
    const fillp = (pts, st) => { g.fillStyle = st; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
    g.save(); const gl = g.createLinearGradient(0, b.y - hh, 0, b.y + 4); gl.addColorStop(0, '#3c2a26'); gl.addColorStop(0.6, '#2a1b19'); gl.addColorStop(1, blend('#2a1b19', '#c8440e', 0.75 * (0.3 + 0.7 * ht))); fillp(L.concat(mid.slice().reverse()), gl);
    const gd = g.createLinearGradient(0, b.y - hh, 0, b.y + 4); gd.addColorStop(0, '#120b0c'); gd.addColorStop(0.7, '#0d0808'); gd.addColorStop(1, blend('#0d0808', '#8a2a0a', 0.6 * (0.3 + 0.7 * ht))); fillp(mid.concat(Rr.slice(1)), gd);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#ffb060', 0.5); g.lineWidth = 1.2; g.beginPath(); L.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
    /* Lava som renner av spydet mens det er ferskt. */
    if (ht > 0.02) for (let i = 0; i < 9; i++) { const u = 0.15 + rnd(i, sd + 5) * 0.7, x = mix(b.x - w * 0.8, b.x + w * 0.7, rnd(i, sd + 6)) + lean * u * 0.5, y0 = b.y - hh * u, ph = (K.T * (0.5 + rnd(i, sd + 7) * 0.5) + rnd(i, sd + 8)) % 1; K.rect(x, y0 + ph * hh * u * 0.9, max(1.2, w * 0.05), hh * 0.09, ph < 0.4 ? '#ffe9a0' : '#ff7a1c', ht * (1 - ph) * 0.9, 1); }
    g.restore();
  };

  /* ================= GROUDON =================
     Låta («Primal Kyogre & Groudon»): fire dempede slag (0,31 · 1,56 · 2,79 · 4,01), en trommevirvel fra 4,92, orkesteret smeller inn på 5,26, tre slag (8,46 · 8,93 · 9,54)
     og et nytt løft på 10,16. Takten er 1,23 s, så det faller slag på 11,40, 12,63 og 13,87.
     Arenaen: krateret ved Terra Cave. Banen er en lavasjø med flak av størknet skorpe, en vulkan i utbrudd bak, røyk i lag og glør i lufta.
     Filmen i tre akter: (1) skjelv: natt, sprekkene i skorpa lyser opp i bølger mot kameraet for hvert slag, og noe stort gløder under lavaen.
     (2) Drought: vulkanen eksploderer på 5,26, sola blir hard gjennom røyken, og varmen flimrer over hele bildet.
     (3) Precipice Blades: tre steinspyd skyter opp på rekke mot kameraet, og på 10,16 reiser Groudon seg av lavaen. Den vasser to tunge steg (11,40 og 12,63),
     går opp på flaket sitt, og kameraet glir ut i kampvinkelen mens navnet slår ned i stein. */
  const GB = [0.31, 1.56, 2.79, 4.01], GE = 5.26, GK = [8.46, 8.93, 9.54], GR = 10.16, GS = [11.4, 12.63], GF = 13.87;
  /* Der Groudon reiser seg (G0), der det første steget lander (G1) og flaket den står på i kampen (G2). TF = flaket til treneren. BL = de tre steinspydene. */
  const G0 = [-109, 360], G1 = [10, 385], G2 = [121, 400], TF = [-190, 250], BL = [[-20, 70, 110], [-52, 170, 105], [-139, 430, 110]];
  const gScene = S => {
    const g = K.g, P = K.P, t = S.t, st = K.st, YH = st.YH, er = S.er == null ? 0.32 + 0.95 * S.p2 : S.er, heat = S.heat == null ? 0.5 + 0.6 * S.p2 : S.heat, sun = S.sun == null ? 0.12 + 0.2 * S.p2 : S.sun, night = S.night || 0, lit = 1 - night * 0.75;
    const fT = S.since('field'), eT = S.since('enter'), sp = K.spots();
    /* Himmelen: natt som gløder nedenfra, med askeskyer lyst opp av lavaen. */
    K.layer(Infinity, () => {
      const gr = g.createLinearGradient(0, -260, 0, YH + 6); gr.addColorStop(0, '#050203'); gr.addColorStop(0.62, blend('#0e0506', '#1d0807', lit)); gr.addColorStop(0.86, blend('#1a0706', '#571607', lit)); gr.addColorStop(1, blend('#3a0e06', '#c8480e', lit * (0.75 + 0.25 * min(1, heat)))); g.fillStyle = gr; g.fillRect(-300, -300, W + 600, YH + 320);
      if (sun > 0.01) { K.blob(318, 36, 130 + 40 * sun, '#ff8a2a', 0.3 * sun, 1); K.blob(318, 36, 46, '#ffe9b0', 0.7 * sun, 1); K.blob(318, 36, 15, '#ffffff', sun, 1); }
      for (let i = 0; i < 9; i++) { const x = ((rnd(i, 3) * 760 + t * (2.5 + rnd(i, 4) * 3)) % 760) - 120, y = 8 + rnd(i, 5) * 86, r = 60 + rnd(i, 6) * 70; K.blob(x, y, r, '#1c1012', 0.85, 0, 0.42); K.blob(x + 6, y + r * 0.24, r * 0.85, '#c03a0c', 0.3 * lit * (0.6 + 0.4 * min(1.2, er + heat * 0.4)), 1, 0.26); }
    });
    /* Langt borte: åser, og lava som renner ut i havet med damp (til venstre). */
    K.layer(7000, () => {
      K.ridge({ y: YH + 3, h: 26, seed: 11, f: 0.018, c0: blend('#0d0606', '#2a0e0a', lit), c1: blend('#120707', '#4a160a', lit) });
      g.fillStyle = blend('#06080c', '#141a24', lit); g.fillRect(-60, YH - 4, 150, 8); K.blob(74, YH - 2, 30, '#ff7a24', 0.75 * lit, 1, 0.3); K.blob(96, YH + 1, 14, '#ffd070', 0.9 * lit, 1, 0.4);
      K.plume(84, YH - 4, { n: 14, h: 80, w0: 6, w1: 34, wind: -0.35, seed: 9, spd: 0.06, c: blend('#241a1c', '#a89490', lit), hot: '#ffb070', a: 0.8, t });
    });
    /* Vulkanen: glød i krateret, elver nedover siden, utbruddet og askeskyen som driver mot høyre. */
    K.layer(3200, () => {
      const cr = K.volcano(176, YH + 3, 330, 92, { seed: 7, c0: blend('#0c0607', '#241011', lit), c1: blend('#070405', '#120809', lit), lava: 0.35 + 0.65 * min(1, er * 1.3), er, t });
      K.plume(cr.x, cr.y + 2, { n: 34, h: 200, w0: 10, w1: 86, wind: 0.62 + 0.2 * er, seed: 5, spd: 0.04 + 0.03 * er, c: blend('#170f10', '#30201e', lit), hot: er > 0.2 ? '#d8480e' : '#6a1c08', a: 0.62 + 0.38 * min(1, er * 1.4), t });
      K.erupt(cr.x, cr.y + 4, er, { n: 30 + floor(30 * min(1.4, er)), hgt: 96, t });
    });
    /* Kraterveggene nærmere oss, på hver side. */
    K.layer(1500, () => { K.ridge({ y: YH + 4, h: 60, seed: 23, f: 0.01, x0: -80, x1: 132, c0: blend('#0a0506', '#1c0c0b', lit), c1: '#090506', rim: '#ff6a24', ra: 0.22 * lit }); K.ridge({ y: YH + 4, h: 74, seed: 29, f: 0.011, x0: 372, x1: W + 90, c0: blend('#0a0506', '#1c0c0b', lit), c1: '#090506', rim: '#ff6a24', ra: 0.22 * lit }); });
    /* Lavasjøen (materialet), med ringer fra steg og nedslag. */
    const rings = (S.rings || []).slice(0, 3); if (fT < 1.4) rings.push([sp.me.X + 46, sp.me.Z + 30, 20 + fT * 150, 1.2 * (1 - fT / 1.4)]); if (eT < 1.6) rings.push([sp.foe.X, sp.foe.Z, 40 + eT * 260, 0.9 * (1 - eT / 1.6)]);
    for (const h of S.hits) { const k = (t - h.t) / 0.9; if (k >= 0 && k < 1 && rings.length < 3) { const q = h.side === 'me' ? sp.me : sp.foe; rings.push([q.X, q.Z, 20 + k * (h.side === 'me' ? 60 : 200), 0.8 * (1 - k)]); } }
    K.ground('lava', [[heat, 1, 92, 0.045], [(0.8 + 0.2 * min(1, heat)) * (1 - 0.3 * night), 0.08 + 0.55 * min(1.2, heat), 0.6, 0], [0.34, 0.075, 0.03, 0.0005], rings[0] || Z4, rings[1] || Z4, rings[2] || Z4], { soft: 3 });
    /* En sprekk med ildgardin langt ute på sjøen. */
    for (let i = 0; i < 16; i++) { const p = K.gp(-300 + i * 44 + (rnd(i, 51) - 0.5) * 30, 1150 + rnd(i, 52) * 80); if (!p) continue; const fl = 0.6 + 0.4 * sin(t * (5 + rnd(i, 53) * 5) + i), hh = (14 + rnd(i, 54) * 30) * p.s * (0.5 + 0.7 * min(1.3, heat)) * fl; K.blob(p.x, p.y - hh * 0.5, hh * 0.9, '#ff5a14', 0.5 * lit, 1, 1.5); K.blob(p.x, p.y - hh * 0.3, hh * 0.4, '#ffd070', 0.7 * lit, 1, 1.6); }
    /* Flakene: småflak som pynt, og de to som det står noen på. De ligger dypere når lavaen stiger (fase 2). */
    const sink = 0.45 * S.p2, ga = 0.1 + 0.52 * min(1.3, heat);
    for (const [X, Z, R, sd] of [[-250, 640, 44, 3], [330, 720, 60, 5], [-90, 520, 30, 7], [260, 300, 26, 9], [-190, 250, 34, 12], [60, 800, 50, 15], [-420, 900, 80, 17], [470, 1000, 70, 19]]) floe(X, Z, R, { seed: sd, sink, ga: ga * 0.8, th: 5 });
    for (const b of S.blades || []) blade(b[0], b[1], b[2], b[3], b[4], b[5]);
    const ff = floe(sp.foe.X, sp.foe.Z + 6, 104, { seed: 31, sink, ga, th: 12, n: 20 }), fm = floe(sp.me.X + 4, sp.me.Z + 6, 46, { seed: 37, sink, ga, th: 7, n: 18 });
    if (ff && !S.film) K.blob(ff.x, ff.y - 5 * ff.s, 84 * ff.s, '#000000', 0.5, 0, 0.16); if (fm && !S.film) K.blob(fm.x, fm.y - 4 * fm.s, 34 * fm.s, '#000000', 0.45, 0, 0.3);
    /* Stedet slår til: lava spruter opp ved flaket ditt. */
    if (fT < 1.4) { const p = K.gp(sp.me.X + 46, sp.me.Z + 30), k = hit(fT, 0.38, 0.9); if (p && k > 0) { K.beam(p.x, 30 * k + 8, p.y - (1 - k * k) * 330, p.y + 8, '#ff6a1a', k, '#ffe9a0'); K.blob(p.x, p.y, 120 * k, '#ff7a2a', k, 1, 0.5); } }
    /* Røyk i lag over sjøen, og glør langt unna. */
    K.fogBand(st.yh + 6, { h: 26, col: '#2a0d08', a: 0.5 + 0.2 * heat, seed: 61, spd: 5, n: 6 });
    K.fogBand(st.yh + 46, { h: 34, col: '#120708', a: 0.4, seed: 67, spd: 9, n: 5 });
    K.parts('ember', { n: 46, seed: 4, cols: ['#fff2c0', '#ffd070', '#ff8a2a', '#e8401a'], a: 0.95 * (0.5 + 0.5 * lit), spd: 0.9 + 0.5 * heat, z: [0, 0.6], wind: 0.25, y0: 40 });
    if (S.p2 > 0.02) K.parts('ash', { n: 50, seed: 8, cols: ['#3a2c2a', '#57423c', '#1c1414'], a: 0.9 * S.p2, spd: 1.4, z: [0, 0.6], wind: 0.5 });
    /* Etterbehandlingen: varmeflimmer rundt horisonten, glød, varm tone og mørke kanter. */
    P.heat = (1.3 + 1.5 * min(1.3, heat) + 1.6 * sun) * (S.shim == null ? 1 : S.shim); P.heatY = st.yh; P.heatUp = 90 + 120 * sun; P.heatDn = 110 + 160 * sun;
    P.bloom = 0.45 + 0.2 * sun; P.bloomT = 0.72; P.grain = 0.035; P.vig = 0.62 - 0.2 * sun; P.vigc = '#0a0102';
    P.grade = { tint: [1 + 0.05 * sun, 0.96 + 0.03 * sun, 0.92 - 0.06 * sun], con: 1.06, sat: 1.02 + 0.1 * sun, exp: 1 + 0.07 * sun - 0.12 * night };
    if (sun > 0.3) P.rays = { x: st.x0 + (318 - 256) * st.f / st.F, y: st.yh + (36 - YH) * st.f / st.F, a: 0.5 * (sun - 0.3), len: 0.85 };
  };
  const gFront = S => {
    const t = S.t, heat = S.heat == null ? 0.5 + 0.6 * S.p2 : S.heat, fT = S.since('field'), lit = 1 - (S.night || 0) * 0.6;
    K.fogBand(330, { h: 60, col: '#1a0806', a: 0.28 + 0.14 * S.p2, seed: 71, spd: 14, n: 4 });
    if (fT < 1.4) { const k = hit(fT, 0.38, 0.9); if (k > 0) for (let i = 0; i < 18; i++) { const ph = 1 - k, an = -PI / 2 + (rnd(i, 81) - 0.5) * 1.5, r = ph * 250; K.blob(S.me[0] + 96 + cos(an) * r, S.me[1] - 40 + sin(an) * r + ph * ph * 190, 5 + rnd(i, 82) * 6, i % 2 ? '#ffd070' : '#ff5a1a', k, 1); } }
    K.parts('ember', { n: 14, seed: 14, cols: ['#fff2c0', '#ffb040', '#ff6a1a'], a: 0.8 * lit, spd: 1.1 + 0.5 * heat, z: [0.72, 1], wind: 0.5, size: 1.1 });
    if (S.p2 > 0.02) K.parts('ash', { n: 22, seed: 23, cols: ['#2a201e', '#4a3834'], a: 0.85 * S.p2, spd: 1.6, z: [0.6, 1], wind: 0.6 });
  };
  /* Groudon selv, slik filmen tegner den: lyst opp nedenfra av lavaen, med skygge mot kameraet. wade = hvor dypt den står i lavaen (verdensenheter). */
  const gMon = (X, Z, k, o) => {
    o = o || {}; const p = K.gp(X, Z); if (!p) return null; const s = 1.6 * k * p.s, wade = o.wade || 0, y = p.y + wade * p.s, cutY = wade > 0 ? p.y + 1 : null;
    if (!wade && o.shadow !== 0) K.monShadow(p.x, p.y, s, { a: 0.42, len: 0.2, skew: -0.5, box: 1, ft: o.ft });
    const M = K.mon(p.x, y + (o.dy || 0), s, { box: 1, ft: o.ft, cut: cutY, a: o.a, sy: o.sy, lit: [{ col: '#ff5a14', a: (0.42 + 0.2 * (o.hot || 0)) * (o.lit == null ? 1 : o.lit), h: 0.6 }, { col: '#1a0608', a: 0.3 * (o.lit == null ? 1 : o.lit), h: 0.5, top: 1 }], rim: { col: '#ffb060', dx: 0, dy: -1, a: 0.85 }, dark: o.dark || 0, col: o.col });
    if (wade > 0) { const w = (M ? M.w : 150) * 0.42; K.blob(p.x, p.y + 2, w * 1.5, '#ff7a24', 0.75, 1, 0.22); K.blob(p.x, p.y + 1, w, '#ffe9a0', 0.8, 1, 0.12); }
    return { p, s, M };
  };
  ARENA.def(383, {
    yh: 138, use: [], pose: { cz: 1.021, k: 1.235, km: 1.9 }, scene: gScene, front: gFront,
    ev: { enter: { len: 0.7, cues: [[0, 'thud']] }, field: { len: 1.15, cues: [[0, 'rumble'], [0.38, 'hit'], [0.38, 'sfx', 'Eruption']] }, rage: { len: 1.7, cues: [[0, 'rumble'], [0.5, 'boom'], [0.5, 'cry']] } },
    film: { len: 14.2, R: GR, at: 0, outc: '#1a0602',
      cues: [[0.31, 'thud'], [1.56, 'thud'], [2.79, 'thud'], [4.01, 'thud'], [GE, 'boom'], [8.46, 'thud'], [8.93, 'thud'], [9.54, 'thud'], [GR, 'cry'], [11.4, 'thud'], [12.63, 'thud']],
      draw(t, P, c) {
        const pose = c.pose || { cz: 1.021, k: 1.235 }, kf = K.kf, n = GB.filter(q => t >= q).length, bt = hits(t, GB, 0.6), roll = seg(t, 4.92, GE), a1 = t < GE;
        /* Kameraet: lavt over sjøen i skjelvet, rykk opp til vulkanen i utbruddet, ut igjen når sola bryter gjennom, fram mellom spydene til Groudon,
           og til slutt ut og opp i kampvinkelen. */
        const gx = kf(t, [[10.98, G0[0]], [GS[0], G1[0]], [12.2, G1[0]], [GS[1], G2[0]]]), gz = kf(t, [[10.98, G0[1]], [GS[0], G1[1]], [12.2, G1[1]], [GS[1], G2[1]]]);
        const cam = { x: t < GR ? kf(t, [[0, -70], [GE, -50], [GE + 0.22, -60, eo], [9.75, -60], [GR, -150, ei]]) : gx - kf(t, [[GR, 41], [13.3, 121]]), z: kf(t, [[0, -110], [GE, -40], [GE + 0.22, -60, eo], [8.3, -60], [9.75, -50], [GR, 140, ei], [11, 134], [13.3, 0]]),
          h: kf(t, [[0, 0.5], [6.6, 0.5], [7.7, 0.6], [9.75, 0.6], [GR, 0.35, ei], [11, 0.36], [13.3, 1]]), tilt: kf(t, [[0, 28], [GE, 24], [GE + 0.22, 160, eo], [6.6, 168], [7.7, 18], [9.75, 16], [GR, 52, ei], [11, 48], [13.3, 0]]),
          zoom: kf(t, [[0, 1], [GE, 1.04], [GE + 0.22, 1.7, eo], [6.6, 1.85], [7.7, 1]]), px: kf(t, [[GE, 0], [GE + 0.22, 121, eo], [6.6, 128], [7.7, 0]]) };
        /* Stedet: natt og en sovende vulkan i skjelvet, så utbruddet, Drought (sola) og til slutt slik det står i kampen. */
        const rings = [], bl = [], ring = (q, X, Z, sp, a, d) => { const k = (t - q) / (d || 1.2); if (k > 0 && k < 1 && rings.length < 3) rings.push([X, Z, 14 + (t - q) * sp, a * (1 - k)]); };
        if (a1) GB.slice(max(0, n - 2), n).forEach(q => ring(q, G0[0], G0[1], 480, 1.5)); else { ring(7.71, -30, 150, 260, 1.2, 0.9); GK.forEach((q, i) => ring(q, BL[i][0], BL[i][1], 300, 1.3, 0.8)); ring(GR, G0[0], G0[1], 420, 1.6); ring(GS[0], G1[0], G1[1], 380, 1.4); ring(GS[1], G2[0], G2[1], 380, 1.4); ring(GF, G2[0], G2[1], 520, 1.1); }
        BL.forEach((b, i) => bl.push([b[0], b[1], b[2], seg(t, GK[i], GK[i] + 0.14) * (1 - seg(t, i === 2 ? GR - 0.05 : 10.6, i === 2 ? GR + 0.35 : 11.3)), i + 1, 1 - seg(t, GK[i] + 0.2, GK[i] + 2)]));
        const S = ARENA.state(t, { film: true, cc: c.cc, cam, rings, blades: bl,
          night: kf(t, [[0, 1], [GE, 0.9], [GE + 0.5, 0.3], [8, 0]]), er: a1 ? 0.03 + 0.2 * roll * roll : kf(t, [[GE, 1.5], [8.4, 1.15], [11, 1], [13.2, 0.32]]),
          heat: a1 ? 0.04 + 0.085 * n + 0.14 * bt + 0.3 * roll : kf(t, [[GE, 0.85], [8, 1], [11.2, 0.95], [13.3, 0.5]]), sun: kf(t, [[6.3, 0], [8, 1], [11, 0.9], [13.3, 0.12]]), shim: kf(t, [[9.8, 1], [GR, 0.55], [12.6, 0.55], [13.3, 1]]) });
        ARENA.scene(383, S);
        /* Skalabildet: en trener på et flak til venstre, som ser alt skje. */
        const tr = K.gp(TF[0] + 4, TF[1]); if (tr && tr.x > -40 && tr.s < 9) K.trainer(tr.x, tr.y - 2 * tr.s, 24 * tr.s, { col: '#070405', rim: S.night > 0.5 ? '#7a2410' : '#ff8a3a', ra: 0.8, wind: 0.5 });
        /* Bomber fra utbruddet som slår ned i sjøen. */
        const bomb = (q, X, Z) => { const d = hit(t, q, 0.9), p = K.gp(X, Z); if (d > 0 && p) { K.beam(p.x, 16 * d * p.s + 4, p.y - (1 - d * d) * 150 * p.s, p.y + 4, '#ff6a1a', d, '#ffe9a0'); K.blob(p.x, p.y, 70 * d * p.s, '#ff7a2a', d, 1, 0.4); for (let i = 0; i < 12; i++) { const ph = 1 - d, an = -PI / 2 + (rnd(i, q * 9) - 0.5) * 1.7, r = ph * 120 * p.s; K.blob(p.x + cos(an) * r, p.y + sin(an) * r + ph * ph * 90 * p.s, 3 * p.s + 2, i % 2 ? '#ffd070' : '#ff5a1a', d, 1); } } };
        bomb(7.71, -30, 150);
        /* Groudon: noe gløder under lavaen i skjelvet; på 10,16 reiser den seg, lavaen renner av, og så de to stegene opp på flaket. */
        const gp = K.gp(gx, gz);
        if (a1 && gp) { const pl = 0.25 + 0.2 * n + bt; K.blob(gp.x, gp.y, (70 + 30 * n + 40 * bt) * gp.s, '#ff3c0a', 0.22 * pl, 1, 0.24); K.blob(gp.x, gp.y, 30 * gp.s * (1 + bt), '#ffb040', 0.3 * bt + 0.4 * roll, 1, 0.24); }
        if (t >= GR - 0.5 && gp) {
          const pre = seg(t, GR - 0.5, GR); K.blob(gp.x, gp.y, 110 * gp.s * pre, '#ff7a24', 0.6 * pre * (1 - seg(t, GR, GR + 0.5)), 1, 0.26); K.blob(gp.x, gp.y, 46 * gp.s * pre, '#fff2c0', 0.8 * pre * (1 - seg(t, GR, GR + 0.3)), 1, 0.24);
          if (t >= GR) {
            const wade = kf(t, [[GR, 150], [GR + 0.7, 26, back], [12.18, 26], [GS[1], 0, eo]]), st = K.stomp(t, GS, { lift: 9, pre: 0.4 }), hot = 1 - seg(t, GR, GR + 2.4), ft = 3.7 + (t - GR);
            const G = gMon(gx, gz, pose.k, { wade, ft, hot, dy: st.y * gp.s, sy: 1 - st.sq * 0.05, dark: 0.5 * (1 - seg(t, GR + 0.6, 12.8)) });
            if (G) { K.mon(G.p.x, G.p.y + wade * G.p.s + st.y * gp.s, G.s, { box: 1, ft, mask: 'seam', col: '#ffc45a', add: 1, a: kf(t, [[GR, 1], [GR + 1.6, 0.85], [13.2, 0]]), cut: wade > 0 ? G.p.y + 1 : null });
              /* Lava som renner av kroppen. */
              const dk = 1 - seg(t, GR + 0.2, GR + 2.6); if (dk > 0 && G.M) for (let i = 0; i < 34; i++) { const life = 0.5 + rnd(i, 41) * 0.6, ph = ((t - GR) / life + rnd(i, 42)) % 1, x = G.p.x + (rnd(i, 43) - 0.5) * G.M.w * 0.8, y0 = G.p.y - G.M.h * (0.25 + rnd(i, 44) * 0.6) * (1 - wade / 190), y = y0 + ph * ph * G.M.h * 0.7; if (y < G.p.y + 2) K.rect(x, y, max(1.5, G.s * 0.6), (4 + ph * 12) * G.s * 0.4, ph < 0.4 ? '#ffe9a0' : '#ff7a1c', dk * (1 - ph) * 0.9, 1); }
              if (st.i >= 0 && st.hit > 0) { K.blob(G.p.x, G.p.y, 130 * G.p.s * (1.2 - st.hit), '#ff8a2a', st.hit * 0.8, 1, 0.24); for (let i = 0; i < 14; i++) { const ph = 1 - st.hit, an = -PI / 2 + (rnd(i, 61 + st.i) - 0.5) * 2.2, r = ph * 90 * G.p.s; K.blob(G.p.x + cos(an) * r * 1.4, G.p.y + sin(an) * r * 0.7 + ph * ph * 50 * G.p.s, 3 * G.p.s + 1.5, i % 2 ? '#ffd070' : '#ff5a1a', st.hit, 1); } }
            }
          }
        }
        ARENA.front(383, S);
        /* Kameraet til bildet: risting, blink (to store), sjokkbølgene fra utbruddet og brølet, og innglidningen i kampvinkelen. */
        const cr = K.lp(3200, 176, K.st.YH - 86), hd = gp ? { x: gp.x - 40 * gp.s, y: gp.y - 120 * gp.s } : null, sk = [];
        if (t >= GE && t < GE + 1.3) sk.push({ x: cr.x, y: cr.y, r: (t - GE) * 430, w: 34, a: 20 * (1 - seg(t, GE, GE + 1.3)) });
        if (hd && t >= GR + 0.2 && t < GR + 1.3) sk.push({ x: hd.x, y: hd.y, r: (t - GR - 0.2) * 520, w: 30, a: 17 * (1 - seg(t, GR + 0.2, GR + 1.3)) });
        GK.forEach((q, i) => { const p = K.gp(BL[i][0], BL[i][1]); if (p && t >= q && t < q + 0.5) sk.push({ x: p.x, y: p.y, r: (t - q) * 300 * p.s, w: 16, a: 9 * (1 - seg(t, q, q + 0.5)), sy: 0.3 }); });
        P.shock = sk;
        if (a1 && gp && bt > 0) P.bulge = { x: gp.x, y: gp.y, r: 120 * gp.s, a: 0.16 * bt };
        P.bars = a1 ? 1 : 1 - seg(t, GE, GE + 0.35);
        P.sh = (a1 ? bt * 3.5 + roll * 5 : 0) + hit(t, GE, 1.2) * 12 + hits(t, [6.48, 7.71], 0.5) * 4 + hits(t, GK, 0.45) * 7 + hit(t, GR, 1) * 11 + hits(t, GS, 0.5) * 8 + hit(t, GF, 0.4) * 3;
        P.fl = max(hit(t, GE, 0.45) * 0.85, hit(t, GR, 0.3) * 0.5); P.fc = '#fff0d0'; P.fade = 1 - seg(t, 0, 0.5);
        const zk = io(seg(t, 12.5, 13.4)); P.z = mix(1, pose.cz, zk); P.zx = 230.4; P.zy = 307.2;
        K.plate(GS[1], { mat: 'stone', col: '#ff6a2a' });
        const b1 = K.gp(BL[0][0], BL[0][1]); if (b1) K.impact(GK[0], b1.x, b1.y - 40 * b1.s, { len: 0.12, r0: 50 });
      }
    }
  });
})();
