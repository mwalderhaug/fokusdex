'use strict';
/* Fokusdex – de store legendariske (klasse 2): arenaen og introen til hver av dem, bygget med verktøykassa (fxgl.js, raidk.js) og arenarammeverket (arena.js).
   Planen for hver art står i work/RAIDS.md avsnitt 5. Alle tider er sekunder fra låta starter, lagt på slagene i musikken.
   Hver film ender i kampvinkelen, med den legendariske der den står når kampen begynner. Aldri mer enn tre store blink i sekundet. */
(() => {
  if (typeof ARENA === 'undefined') return;
  const C = CINE, K = C.kit, { W, H, TAU, PI, sin, cos, abs, max, min, floor, c01, mix, seg, hit, pulse, io, eo, ei, back, rnd, rgba, blend } = K;
  const hits = (t, l, d) => l.reduce((m, q) => max(m, hit(t, q, d)), 0), Z4 = [0, 0, 0, 0];
  /* Et flak av størknet skorpe (eller en klippe) på bakken: et mangekantet lokk med en kant ned i det som flyter rundt.
     (X, Z) = midten, R = radius, o = { seed, th (tykkelse), top, top2, glow (lyset i vannlinja), ga, n, sink (0–1: hvor dypt det ligger), lit (0–1: hvor lyst lokket er) }. */
  const floe = (X, Z, R, o) => {
    o = o || {}; const g = K.g, n = o.n || 22, sd = o.seed || 1, pts = [], gl = o.glow || '#ff5a14', ga = o.ga == null ? 0.42 : o.ga, lt = o.lit == null ? 1 : o.lit;
    for (let i = 0; i < n; i++) { const an = i / n * TAU, r = R * (0.8 + 0.3 * K.fbm1(i * 0.7, sd, 2) + 0.16 * (rnd(i, sd) - 0.5)), p = K.gp(X + cos(an) * r * 1.3, Z + sin(an) * r); if (!p) return null; pts.push(p); }
    const c = K.gp(X, Z); if (!c) return null; const th = (o.th == null ? 9 : o.th) * (1 - (o.sink || 0) * 0.75), path = dy => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y + dy * p.s) : g.moveTo(p.x, p.y + dy * p.s)); g.closePath(); }, front = fn => pts.forEach((p, i) => { const q = pts[(i + 1) % n]; if (q.x < p.x) fn(p, q, i); });
    let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = min(y0, p.y); y1 = max(y1, p.y); });
    K.blob(c.x, c.y + th * c.s * 0.6, R * c.s * 1.9, gl, ga * 0.6, 1, 0.2);
    /* Kanten ned i lavaen: ru stein, mørk øverst og glødende i vannlinja. */
    const gn = min(1, ga * 1.5), sg = g.createLinearGradient(0, y1 - 1, 0, y1 + th * c.s + 1); sg.addColorStop(0, '#0b0606'); sg.addColorStop(0.5, blend('#0b0606', gl, 0.22 * gn)); sg.addColorStop(1, blend('#1a0a08', blend(gl, '#ffd9a0', 0.3), gn));
    g.save(); path(th); g.fillStyle = sg; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.beginPath(); front((p, q, i) => { for (let k = 0; k < 3; k++) { const u = rnd(i * 3 + k, sd + 21), x = mix(p.x, q.x, u), y = mix(p.y, q.y, u); g.moveTo(x, y); g.lineTo(x + (rnd(i + k, sd + 22) - 0.5) * 3, y + th * c.s * (0.4 + 0.5 * rnd(i * 5 + k, sd + 23))); } }); g.stroke();
    g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.strokeStyle = gl; g.lineWidth = min(5, max(1.5, c.s * 1.6)); g.globalAlpha = c01(ga * 1.5); g.beginPath(); front((p, q) => { g.moveTo(p.x, p.y + th * p.s); g.lineTo(q.x, q.y + th * q.s); }); g.stroke();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    /* Lokket: svart basalt, litt lysere lengst unna, med småflekker og hårsprekker som gløder svakt. */
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, blend('#130d0d', o.top2 || '#2e2220', lt)); gr.addColorStop(0.55, blend('#0e0909', o.top || '#1a1212', lt)); gr.addColorStop(1, '#100a0b'); g.fillStyle = gr; path(0); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.26)' : 'rgba(150,110,96,.1)'; g.fillRect(c.x + (rnd(i, sd + 11) - 0.5) * R * c.s * 2.8, y0 + rnd(i, sd + 12) * (y1 - y0), (3 + rnd(i, sd + 13) * 10) * min(2.5, c.s), max(1, min(2.5, c.s))); }
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const a = pts[floor(rnd(i, sd + 7) * n)], mx = mix(a.x, c.x, 0.5) + (rnd(i, sd + 9) - 0.5) * R * c.s * 0.5, my = mix(a.y, c.y, 0.5), ex = mix(a.x, c.x, 0.95) + (rnd(i, sd + 10) - 0.5) * R * c.s * 0.6, ey = mix(a.y, c.y, 0.95); for (const [lw, al, col] of [[3, 0.16, gl], [1, 0.55, blend(gl, '#ffd9a0', 0.4)]]) { g.strokeStyle = col; g.globalAlpha = c01(al * (0.25 + ga) * (0.8 + 0.2 * sin(K.T * 2 + i))); g.lineWidth = lw * min(2, max(0.8, c.s * 0.6)); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(mx, my); g.lineTo(ex, ey); g.stroke(); } }
    g.restore();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = blend(gl, '#ffd9a0', 0.35); g.lineWidth = min(2.6, max(1, c.s * 0.9)); g.globalAlpha = c01(0.25 + ga * 0.75); g.beginPath(); front((p, q) => { g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); }); g.stroke();
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
    g.save(); g.beginPath(); L.concat(Rr.slice(1)).forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.clip();
    for (let i = 0; i < 9; i++) { const yy = b.y - hh * (0.08 + i * 0.1) + (rnd(i, sd + 9) - 0.5) * hh * 0.04; g.strokeStyle = i % 3 === 0 ? rgba('#ff7a24', 0.35 * (0.3 + 0.7 * ht)) : 'rgba(0,0,0,.35)'; g.lineWidth = max(1, w * 0.035); g.beginPath(); g.moveTo(b.x - w * 1.2, yy + w * 0.12); g.lineTo(b.x + lean * 0.4, yy - w * 0.1); g.lineTo(b.x + w * 1.2, yy + w * 0.16); g.stroke(); }
    g.restore();
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
  /* Lyn i askeskyen (vulkanlyn): i fase 2 slår det av og til, og filmen ber om det selv. Gir styrken 0–1. */
  const vlAt = (t, k) => { const q = floor(t / 3.7), ph = (t / 3.7) % 1; return k > 0.3 && ph < 0.09 && rnd(q, 5) > 0.4 ? 1 - ph / 0.09 : 0; };
  /* En ildkule fra krateret som slår ned i sjøen i (X, Z) på tidspunktet q: en bue med hale, og så et sprut. cr = krateret på skjermen. */
  const gBomb = (t, q, X, Z, cr) => { const p = K.gp(X, Z); if (!p) return; const u = seg(t, q - 0.7, q), d = hit(t, q, 0.9), ps = max(0.55, p.s), at = v => [mix(cr.x, p.x, v), mix(cr.y, p.y, v * v) - sin(v * PI) * (70 + abs(p.x - cr.x) * 0.25)];
    if (u > 0 && u < 1) { for (let j = 9; j >= 2; j--) { const a = at(max(0, u - j * 0.04)); K.blob(a[0] + sin(j * 2.1 + q) * 3, a[1] - j * 1.5, (5 + j * 1.6) * (0.6 + u * ps * 0.6), '#1a0d0a', 0.34 - j * 0.03); }
      for (let j = 0; j < 6; j++) { const a = at(max(0, u - j * 0.022)); K.blob(a[0], a[1], (10 - j * 1.3) * (0.55 + u * ps * 0.5), j < 2 ? '#fff6d8' : j < 4 ? '#ffb040' : '#e8401a', 0.95 - j * 0.13, 1); } const h = at(u); K.blob(h[0], h[1], 26 * (0.5 + u * ps * 0.5), '#ff8a30', 0.45, 1); }
    if (d > 0) { const ph = 1 - d, up = sin(min(1, ph * 2.2) * PI * 0.5) * (1 - ph * 0.5);
      K.blob(p.x, p.y, 90 * (1.25 - d) * ps, '#ffb050', d * 0.9, 1, 0.34); K.blob(p.x, p.y - 4 * ps, 34 * d * ps, '#fff6d8', d, 1);
      for (let i = 0; i < 7; i++) K.blob(p.x + (rnd(i, q * 7) - 0.5) * 10 * ps, p.y - up * i * 11 * ps, (13 - i * 1.3) * ps * (0.5 + d * 0.5), i < 3 ? '#fff2c8' : '#ffb040', d * (1 - i * 0.08), 1);
      for (let i = 0; i < 16; i++) { const an = -PI / 2 + (rnd(i, q * 9) - 0.5) * 2.2, r = ph * (60 + rnd(i, q * 5) * 90) * ps, x = p.x + cos(an) * r, y = p.y + sin(an) * r * 0.9 + ph * ph * 110 * ps; if (y > p.y + 4) continue; K.blob(x, y, 2.4 * ps + 1.6, i % 3 === 0 ? '#2a0f08' : i % 2 ? '#ffe08a' : '#ff6a1a', i % 3 === 0 ? d * 0.8 : d, i % 3 === 0 ? 0 : 1); }
      for (let i = 0; i < 3; i++) K.blob(p.x + (i - 1) * 9 * ps, p.y - (14 + ph * 46 + i * 8) * ps, (12 + ph * 22) * ps, '#241210', 0.3 * d * min(1, ph * 5)); } };
  const gScene = S => {
    const g = K.g, P = K.P, t = S.t, st = K.st, YH = st.YH, er = S.er == null ? 0.32 + 0.95 * S.p2 : S.er, heat = S.heat == null ? 0.5 + 0.6 * S.p2 : S.heat, sun = S.sun == null ? 0.38 + 0.22 * S.p2 : S.sun, night = S.night || 0, lit = 1 - night * 0.75;
    const fT = S.since('field'), eT = S.since('enter'), sp = K.spots(), vl = S.vl == null ? vlAt(t, S.p2) : S.vl, hot = min(1.2, er + heat * 0.4);
    /* Lyset på figurene: varmt og mørkt som stedet. Lavaen lyser nedenfra (sterkere jo varmere), sola og vulkanen gir kantlys bakfra og fra venstre,
       og omriss og skygger får den mørke rødbrune skyggefargen i stedet for svart. Din egen står nærmest lavaen foran og er litt mørkere (motlys). */
    K.lightSet({ amb: blend(blend('#5a3028', '#b8826c', lit), '#d09a80', 0.5 * sun), sat: 0.84, lift: blend('#1c0a08', '#34140e', lit),
      lights: [{ col: '#ff6a1c', a: min(0.85, 0.34 + 0.3 * min(1.3, heat) + 0.25 * (S.glowUp || 0)), h: 0.72 }],
      rim: [{ col: '#ffb060', dx: 1, dy: 1, a: (0.3 + 0.55 * sun) * lit }, { col: '#ff7a24', dx: 0, dy: -1, a: 0.5 + 0.25 * min(1, heat) }],
      glow: S.film ? null : { mask: 'seam', col: '#ff9a2c', a: (0.5 * S.p2 + 0.5 * hit(S.since('rage'), 0.5, 2.5)) * (0.8 + 0.2 * sin(t * 6)) },
      me: { amb: blend('#643a30', '#c48e76', lit), sat: 0.92, lights: [{ col: '#ff6a1c', a: min(0.8, 0.4 + 0.3 * min(1.3, heat)), h: 0.5 }], rim: [{ col: '#ffa050', dx: -1, dy: 1, a: (0.35 + 0.4 * sun) * lit }, { col: '#ff7a24', dx: 0, dy: -1, a: 0.6 }] } });
    /* Himmelen: natt som gløder nedenfra, askeskyer lyst opp av lavaen, og sola som en hard skive gjennom røyken (Drought). */
    K.layer(Infinity, () => {
      const gr = g.createLinearGradient(0, -260, 0, YH + 6); gr.addColorStop(0, '#050203'); gr.addColorStop(0.62, blend('#0e0506', '#1d0807', lit)); gr.addColorStop(0.86, blend('#1a0706', '#571607', lit)); gr.addColorStop(1, blend('#3a0e06', '#c8480e', lit * (0.75 + 0.25 * min(1, heat)))); g.fillStyle = gr; g.fillRect(-300, -300, W + 600, YH + 320);
      if (sun > 0.01) { K.blob(318, 36, 130 + 40 * sun, '#ff8a2a', 0.3 * sun, 1); K.blob(318, 36, 46, '#ffe9b0', 0.7 * sun, 1); K.blob(318, 36, 15, '#ffffff', sun, 1); K.blob(318, 36, 210, '#ffd9a0', 0.3 * sun, 1, 0.035); K.blob(318, 36, 90, '#ffffff', 0.4 * sun, 1, 0.03); }
      for (let i = 0; i < 11; i++) { const x = ((rnd(i, 3) * 800 + t * (2.5 + rnd(i, 4) * 3)) % 800) - 140, y = 2 + rnd(i, 5) * 92, r = 62 + rnd(i, 6) * 76; K.blob(x, y, r, blend('#120a0b', '#241517', lit), 0.86, 0, 0.42); K.blob(x + 8, y + r * 0.26, r * 0.86, '#c8400c', (0.16 + 0.24 * hot) * lit, 1, 0.24); if (vl > 0 && i % 4 === 1) K.blob(x, y, r, '#d8c8ff', 0.35 * vl, 1, 0.4); }
    });
    /* Langt borte: åser, og damp der lava renner ut i havet bak kraterkanten (til venstre). */
    K.layer(7000, () => {
      K.ridge({ y: YH + 3, h: 26, seed: 11, f: 0.018, c0: blend('#0d0606', '#2a0e0a', lit), c1: blend('#120707', '#4a160a', lit) });
      K.blob(88, YH - 2, 26, '#ff7a24', 0.6 * lit, 1, 0.3);
      K.plume(84, YH - 4, { n: 14, h: 84, w0: 6, w1: 34, wind: -0.35, seed: 9, spd: 0.06, c: blend('#241a1c', '#9c8a88', lit), hot: '#ffb070', ha: 0.6, a: 0.75, t });
    });
    /* Vulkanen: glød i krateret, elver nedover siden, utbruddet, og askeskyen som driver mot høyre med lyn i. */
    K.layer(3200, () => {
      K.blob(176, YH - 80, 150, '#ff4a10', (0.08 + 0.12 * min(1.3, er)) * lit, 1, 0.8);
      const cr = K.volcano(176, YH + 3, 330, 92, { seed: 7, c0: blend('#0c0607', '#2a1413', lit), c1: blend('#070405', '#120809', lit), lava: 0.35 + 0.65 * min(1, er * 1.3), er, t, rivers: 5 });
      K.plume(cr.x, cr.y + 2, { n: 38, h: 210, w0: 11, w1: 92, wind: 0.62 + 0.2 * er, seed: 5, spd: 0.04 + 0.035 * er, c: blend('#1a1112', '#3d2c29', lit), top: '#0c0708', hot: er > 0.2 ? '#f0540e' : '#6a1c08', ha: 0.5 + 0.5 * min(1, er), a: 0.66 + 0.34 * min(1, er * 1.4), t });
      if (vl > 0) { const q = floor(t * 14); for (let i = 0; i < 2; i++) K.bolt(cr.x + 26 + rnd(q, i) * 50, cr.y - 46 - rnd(q, i + 2) * 30, cr.x + 60 + rnd(q, i + 4) * 80, cr.y - 120 - rnd(q, i + 6) * 50, { seed: q * 3 + i, col: '#b89cff', core: '#ffffff', w: 1.4, a: vl, br: 2, depth: 4 }); K.blob(cr.x + 70, cr.y - 100, 90, '#cdb8ff', 0.4 * vl, 1); }
      K.erupt(cr.x, cr.y + 4, er, { n: 30 + floor(30 * min(1.4, er)), hgt: 96, t });
    });
    /* Kraterveggene nærmere oss, på hver side. */
    K.layer(1500, () => { K.ridge({ y: YH + 4, h: 60, seed: 23, f: 0.01, x0: -80, x1: 132, c0: blend('#0a0506', '#1c0c0b', lit), c1: '#090506', rim: '#ff6a24', ra: 0.22 * lit }); K.ridge({ y: YH + 4, h: 74, seed: 29, f: 0.011, x0: 372, x1: W + 90, c0: blend('#0a0506', '#1c0c0b', lit), c1: '#090506', rim: '#ff6a24', ra: 0.22 * lit }); });
    /* Lavasjøen (materialet), med ringer fra steg, nedslag og treff. */
    const rings = (S.rings || []).slice(0, 3); if (fT < 1.4) rings.push([sp.me.X + 46, sp.me.Z + 30, 20 + fT * 150, 1.2 * (1 - fT / 1.4)]); if (eT < 1.6) rings.push([sp.foe.X, sp.foe.Z, 40 + eT * 260, 0.9 * (1 - eT / 1.6)]);
    const bq = floor(t / 2.7), bt0 = bq * 2.7 + 1.1, bX = rnd(bq, 94) < 0.62 ? -300 + rnd(bq, 91) * 230 : 235 + rnd(bq, 91) * 100, bZ = 450 + rnd(bq, 92) * 260, bOn = !S.film && S.p2 > 0.4 && rnd(bq, 93) > 0.2;
    if (bOn && t >= bt0 && t < bt0 + 0.9) rings.push([bX, bZ, 14 + (t - bt0) * 240, 1.1 * (1 - (t - bt0) / 0.9)]);
    for (const h of S.hits) { const k = (t - h.t) / 0.9; if (k >= 0 && k < 1 && rings.length < 3) { const q = h.side === 'me' ? sp.me : sp.foe; rings.push([q.X, q.Z, 20 + k * (h.side === 'me' ? 60 : 200), 0.8 * (1 - k)]); } }
    K.ground('lava', [[heat, 1, 84, 0.036], [(0.8 + 0.2 * min(1, heat)) * (1 - 0.3 * night), 0.08 + 0.55 * min(1.2, heat), 0.6, 0], [0.34, 0.075, 0.03, 0.0005], rings[0] || Z4, rings[1] || Z4, rings[2] || Z4], { soft: 3 });
    /* En sprekk med ildgardin langt ute på sjøen. */
    for (let i = 0; i < 16; i++) { const p = K.gp(-300 + i * 44 + (rnd(i, 51) - 0.5) * 30, 1150 + rnd(i, 52) * 80); if (!p) continue; const fl = 0.6 + 0.4 * sin(t * (5 + rnd(i, 53) * 5) + i), hh = (14 + rnd(i, 54) * 30) * p.s * (0.5 + 0.7 * min(1.3, heat)) * fl; K.blob(p.x, p.y - hh * 0.5, hh * 0.9, '#ff5a14', 0.5 * lit, 1, 1.5); K.blob(p.x, p.y - hh * 0.3, hh * 0.4, '#ffd070', 0.7 * lit, 1, 1.6); }
    /* Revna i skorpa (bare i filmen): fra der Groudon ligger under lavaen og mot kameraet, i den åpne lavaen mellom flaket til treneren og ditt eget. */
    if (S.fis && S.fis.k > 0) { const f = S.fis, tip = K.crack(G0[0] + 26, G0[1] - 22, -118, 118, { seed: 5, cell: 84, w: 10, k: f.k, hot: f.hot, wk: f.w, t });
      if (tip && f.grow > 0) for (let i = 0; i < 9; i++) { const ph = 1 - f.grow, an = -PI / 2 + (rnd(i, 71) - 0.5) * 1.9, r = ph * (26 + rnd(i, 72) * 50) * min(3, tip.s); K.blob(tip.x + cos(an) * r, tip.y + sin(an) * r * 0.8 + ph * ph * 30 * min(3, tip.s), 1.6 + min(3, tip.s), i % 2 ? '#ffe08a' : '#ff6a1a', f.grow, 1); } }
    /* Flakene: småflak som pynt, og de to som det står noen på. De ligger dypere når lavaen stiger (fase 2). */
    const sink = 0.45 * S.p2, ga = 0.1 + 0.52 * min(1.3, heat), fo = { sink, ga, lit: 0.35 + 0.65 * lit };
    for (const [X, Z, R, sd] of [[-250, 640, 44, 3], [330, 720, 60, 5], [-90, 520, 30, 7], [260, 300, 26, 9], [-190, 250, 34, 12], [60, 800, 50, 15], [-420, 900, 80, 17], [470, 1000, 70, 19]]) floe(X, Z, R, Object.assign({ seed: sd, th: 5 }, fo, { ga: ga * 0.8 }));
    if (bOn) gBomb(t, bt0, bX, bZ, K.lp(3200, 176, YH - 86));
    for (const b of S.blades || []) blade(b[0], b[1], b[2], b[3], b[4], b[5]);
    const ff = floe(sp.foe.X, sp.foe.Z + 6, 104, Object.assign({ seed: 31, th: 12, n: 20 }, fo)), fm = floe(sp.me.X + 4, sp.me.Z + 6, 46, Object.assign({ seed: 37, th: 7, n: 18 }, fo));
    /* Skyggene i kampen: silhuetten kastet framover på flaket (når arenaen har bildet), og kontaktskyggen under føttene. */
    if (!S.film) { if (K.cur.sp) K.monShadow(S.foe[0], S.foe[1] - 2, 1.6 * S.fk, { a: 0.5, len: 0.17, skew: -0.5, box: 1, ft: S.ft, col: '#0b0304' }); K.contact(S.foe[0] - 6, S.foe[1] - 2, 80 * S.fk, { a: 0.95, col: '#0b0304', sy: 0.15 });
      if (K.cur.sps.me) K.monShadow(S.me[0], S.me[1] - 3, 1.6 * S.mk, { id: 'me', a: 0.45, len: 0.1, skew: -0.4, ft: S.ftm, col: '#0b0304' }); K.contact(S.me[0], S.me[1] - 4, 60 * S.mk, { a: 0.85, col: '#0b0304', sy: 0.22 }); }
    /* Stedet slår til: en søyle av lava spruter opp ved flaket ditt. */
    if (fT < 1.4) { const p = K.gp(sp.me.X + 46, sp.me.Z + 30), k = hit(fT, 0.38, 0.9); if (p && k > 0) { for (let j = 0; j < 9; j++) { const u = j / 8, fl = 0.7 + 0.3 * sin(t * (19 + j * 3) + j); K.blob(p.x + sin(t * 9 + j * 2) * 3 * j, p.y - u * 250 * (1 - (1 - k) * (1 - k)) , (34 - u * 18) * (0.5 + 0.5 * k) * fl, u < 0.35 ? '#fff2c8' : u < 0.7 ? '#ffc050' : '#ff7a20', k * (0.9 - u * 0.4), 1, 1.5); } K.blob(p.x, p.y, 120 * k, '#ff7a2a', k, 1, 0.5); } }
    /* Røyk i lag over sjøen, og glør langt unna. */
    K.fogBand(st.yh + 6, { h: 26, col: '#2a0d08', a: 0.5 + 0.2 * heat, seed: 61, spd: 5, n: 6 });
    K.fogBand(st.yh + 46, { h: 34, col: '#120708', a: 0.4, seed: 67, spd: 9, n: 5 });
    K.parts('ember', { n: 56, seed: 4, cols: ['#fff2c0', '#ffd070', '#ff8a2a', '#e8401a'], a: 0.95 * (0.5 + 0.5 * lit), spd: 0.9 + 0.5 * heat, z: [0, 0.6], wind: 0.25, y0: 40 });
    if (S.p2 > 0.02) K.parts('ash', { n: 50, seed: 8, cols: ['#3a2c2a', '#57423c', '#1c1414'], a: 0.9 * S.p2, spd: 1.4, z: [0, 0.6], wind: 0.5 });
    /* Etterbehandlingen: varmeflimmer rundt horisonten, glød, varm tone og mørke kanter. */
    P.heat = (1.3 + 1.5 * min(1.3, heat) + 1.6 * sun) * (S.shim == null ? 1 : S.shim); P.heatY = st.yh; P.heatUp = 90 + 120 * sun; P.heatDn = 110 + 160 * sun;
    P.bloom = 0.45 + 0.2 * sun; P.bloomT = 0.72; P.grain = 0.035; P.vig = 0.62 - 0.2 * sun; P.vigc = '#0a0102';
    P.grade = { tint: [1 + 0.05 * sun, 0.96 + 0.03 * sun, 0.92 - 0.06 * sun], con: 1.06, sat: 1.02 + 0.1 * sun, exp: 1 + 0.07 * sun - 0.12 * night + 0.1 * vl };
    if (sun > 0.3) P.rays = { x: st.x0 + (318 - 256) * st.f / st.F, y: st.yh + (36 - YH) * st.f / st.F, a: (S.rays == null ? 0.7 : S.rays) * (sun - 0.3), len: 0.85 };
  };
  const gFront = S => {
    const t = S.t, heat = S.heat == null ? 0.5 + 0.6 * S.p2 : S.heat, fT = S.since('field'), lit = 1 - (S.night || 0) * 0.6;
    K.fogBand(330, { h: 60, col: '#1a0806', a: 0.28 + 0.14 * S.p2, seed: 71, spd: 14, n: 4 });
    if (fT < 1.4) { const k = hit(fT, 0.38, 0.9); if (k > 0) for (let i = 0; i < 18; i++) { const ph = 1 - k, an = -PI / 2 + (rnd(i, 81) - 0.5) * 1.5, r = ph * 250; K.blob(S.me[0] + 96 + cos(an) * r, S.me[1] - 40 + sin(an) * r + ph * ph * 190, 5 + rnd(i, 82) * 6, i % 2 ? '#ffd070' : '#ff5a1a', k, 1); } }
    K.parts('ember', { n: 14, seed: 14, cols: ['#fff2c0', '#ffb040', '#ff6a1a'], a: 0.8 * lit, spd: 1.1 + 0.5 * heat, z: [0.72, 1], wind: 0.5, size: 1.1 });
    if (S.p2 > 0.02) K.parts('ash', { n: 22, seed: 23, cols: ['#2a201e', '#4a3834'], a: 0.85 * S.p2, spd: 1.6, z: [0.6, 1], wind: 0.6 });
  };
  /* Groudon selv, slik filmen tegner den: lyst opp nedenfra av lavaen, med skygge mot kameraet. wade = hvor dypt den står i lavaen (verdensenheter).
     sx, sy, r, dx, dy = kroppens form akkurat nå (K.act): pust, klem og strekk, brøl og steg. */
  const gMon = (X, Z, k, o) => {
    o = o || {}; const p = K.gp(X, Z); if (!p) return null; const s = 1.6 * k * p.s, wade = o.wade || 0, y = p.y + wade * p.s, cutY = wade > 0 ? p.y + 1 : null;
    if (!wade && o.shadow !== 0) K.monShadow(p.x, p.y, s, { a: 0.42, len: 0.2, skew: -0.5, box: 1, ft: o.ft });
    const M = K.mon(p.x + (o.dx || 0), y + (o.dy || 0), s, { box: 1, ft: o.ft, cut: cutY, a: o.a, sx: o.sx, sy: o.sy, r: o.r, hq: o.hq, dark: o.dark || 0, darkc: '#1a0806', col: o.col });
    if (wade > 0) { const w = (M ? M.w : 150) * 0.4, T = K.T; K.blob(p.x, p.y + 2, w * 1.25, '#ff6a1c', 0.45, 1, 0.16); for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14 - 0.5, fl = 0.5 + 0.5 * sin(T * (7 + rnd(i, 5) * 9) + i * 2.1), r = (5 + rnd(i, 6) * 9) * s * 0.42 * (0.6 + 0.4 * fl); K.blob(p.x + u * w * 2 + sin(T * 3 + i) * 2 * s, p.y + 1 - r * 0.3 * fl, r, i % 3 ? '#ffb040' : '#fff2c8', 0.5 + 0.4 * fl, 1, 0.55); } }
    return { p, s, M };
  };
  /* Mellom figurene: varmedis og glør lavt foran Groudon, så føttene står i lufta fra lavaen og ikke er klippet ut. */
  const gMid = S => { const heat = S.heat == null ? 0.5 + 0.6 * S.p2 : S.heat, y = S.foe[1]; K.fogBand(y + 2, { h: 22, col: '#7a2a10', a: 0.2 + 0.12 * min(1.2, heat), seed: 75, spd: 7, n: 7 }); K.fogBand(y + 20, { h: 26, col: '#2a0d08', a: 0.22, seed: 77, spd: 11, n: 5 });
    K.parts('ember', { n: 12, seed: 31, cols: ['#ffe9b0', '#ffb040', '#ff6a1a'], a: 0.75, spd: 0.8 + 0.4 * heat, z: [0.25, 0.6], wind: 0.3, y0: y - 120, y1: y + 30 }); };
  ARENA.def(383, {
    yh: 138, use: [], pose: { cz: 1.021, k: 1.235, km: 1.9 }, scene: gScene, mid: gMid, front: gFront,
    ev: { enter: { len: 0.7, cues: [[0, 'thud']] }, field: { len: 1.15, cues: [[0, 'rumble'], [0.38, 'hit'], [0.38, 'sfx', 'Eruption']] }, rage: { len: 1.7, cues: [[0, 'rumble'], [0.5, 'boom'], [0.5, 'cry']] } },
    film: { len: 14.2, R: GR, at: 0, outc: '#1a0602',
      cues: [[0.31, 'thud'], [1.56, 'thud'], [2.79, 'thud'], [4.01, 'thud'], [GE, 'boom'], [8.46, 'thud'], [8.93, 'thud'], [9.54, 'thud'], [GR, 'cry'], [11.4, 'thud'], [12.63, 'thud']],
      draw(t, P, c) {
        const pose = ARENA.fit(c.pose || { cz: 1.021, k: 1.235 }, c.sp), kf = K.kf, n = GB.filter(q => t >= q).length, bt = hits(t, GB, 0.6), roll = seg(t, 4.92, GE), a1 = t < GE;
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
        const S = ARENA.state(t, { film: true, cc: c.cc, cam, rings, blades: bl, glowUp: t >= GR ? 1 - seg(t, GR, GR + 2.4) : 0,
          night: kf(t, [[0, 1], [GE, 0.9], [GE + 0.5, 0.3], [8, 0]]), er: a1 ? 0.03 + 0.2 * roll * roll : kf(t, [[GE, 1.5], [8.4, 1.15], [11, 1], [13.2, 0.32]]),
          vl: max(hit(t, 6.48, 0.22), hit(t, 6.62, 0.12), hit(t, 7.1, 0.16)), heat: a1 ? 0.04 + 0.085 * n + 0.14 * bt + 0.3 * roll : kf(t, [[GE, 0.85], [8, 1], [11.2, 0.95], [13.3, 0.5]]), sun: kf(t, [[6.3, 0], [8, 1], [11, 0.9], [13.3, 0.38]]), shim: kf(t, [[9.8, 1], [GR, 0.55], [12.6, 0.55], [13.3, 1]]), rays: kf(t, [[9.8, 0.6], [GR, 1.5], [11.6, 1.2], [13.2, 0.7]]),
          /* Revna: skorpa revner et stykke til mot kameraet for hvert slag fra det andre, står åpen gjennom utbruddet, og gror igjen fra kantene når Groudon er oppe. */
          fis: { k: kf(t, [[GB[1], 0], [GB[1] + 0.32, 0.38, eo], [GB[2], 0.4], [GB[2] + 0.32, 0.72, eo], [GB[3], 0.74], [GB[3] + 0.32, 1, eo]]), grow: max(hit(t, GB[1], 0.5), hit(t, GB[2], 0.5), hit(t, GB[3], 0.5)),
            hot: a1 ? 0.5 + 0.45 * bt + 0.4 * roll : kf(t, [[GE, 1.25], [7, 0.8], [GK[0], 0.75], [GR, 1.15], [11.4, 0.9], [12.5, 0.6]]), w: kf(t, [[11.3, 1], [12.5, 0]]) } });
        ARENA.scene(383, S);
        /* Skalabildet: en trener på et flak til venstre, som ser alt skje. */
        const tr = K.gp(TF[0] + 4, TF[1]), rc = hit(t, GR + 0.05, 0.9); if (tr && tr.x > -40 && tr.s < 9) K.trainer(tr.x - rc * 5 * tr.s, tr.y - 2 * tr.s, 24 * tr.s, { col: '#070405', rim: S.night > 0.5 ? '#7a2410' : '#ff8a3a', ra: 0.8, wind: t > GR ? -0.9 * (0.4 + 0.6 * rc) : 0.5, lean: -0.1 * rc });
        /* Bomber fra utbruddet som slår ned i sjøen. */
        const cr = K.lp(3200, 176, K.st.YH - 86);
        gBomb(t, 6.48, -260, 700, cr); gBomb(t, 7.71, -30, 150, cr);
        /* Groudon: noe gløder under lavaen i skjelvet; på 10,16 reiser den seg, lavaen renner av, og så de to stegene opp på flaket. */
        const gp = K.gp(gx, gz), act = K.act(t, { breath: 1.7, bp: 1.7, roar: [[GR + 0.12, 1.02]], steps: GS, lift: 13, pre: 0.42, land: [{ t: GR + 0.5, a: 0.9 }, { t: GF, a: 0.45 }], amp: 1 - seg(t, 13.98, 14.2) });
        if (a1 && gp) { const pl = 0.25 + 0.2 * n + bt; K.blob(gp.x, gp.y, (70 + 30 * n + 40 * bt) * gp.s, '#ff3c0a', 0.22 * pl, 1, 0.24); K.blob(gp.x, gp.y, 30 * gp.s * (1 + bt), '#ffb040', 0.3 * bt + 0.4 * roll, 1, 0.24);
          if (n >= 2) K.mon(gp.x, gp.y + 30 * gp.s, 1.6 * pose.k * gp.s * 1.5, { box: 1, ft: 2.2 + t * 0.35, mask: 'seam', col: n >= 4 ? '#ff7a1c' : '#e8320a', add: 1, a: (0.1 + 0.16 * (n - 2) + 0.5 * bt + 0.5 * roll) * (0.8 + 0.2 * sin(t * 7)), tf: [1 + 0.05 * bt, 0, -0.5, 0.34 * (1 + 0.1 * bt)] }); }
        if (t >= GR - 0.5 && gp) {
          const pre = seg(t, GR - 0.5, GR); K.blob(gp.x, gp.y, 110 * gp.s * pre, '#ff7a24', 0.6 * pre * (1 - seg(t, GR, GR + 0.5)), 1, 0.26); K.blob(gp.x, gp.y, 46 * gp.s * pre, '#fff2c0', 0.8 * pre * (1 - seg(t, GR, GR + 0.3)), 1, 0.24);
          if (t >= GR) {
            /* Den bryter opp for høyt og synker tilbake (GR + 0,5), så brøler den: kjeften åpner seg på slaget (bildene 3,0–3,3 s i animasjonen) og står åpen og
               skjelver i ett sekund. Så to tunge steg, og til slutt hvilestillingen kampen starter i (første bilde i animasjonen, uten skuespill). */
            const wade = kf(t, [[GR, 150], [GR + 0.4, 6, eo], [GR + 0.78, 26], [12.18, 26], [GS[1], 0, eo]]), st = K.stomp(t, GS, { lift: 0, pre: 0.4 }), hot = 1 - seg(t, GR, GR + 2.4);
            const ft = t < GR + 0.12 ? K.clip(t, [[GR, 2.76], [GR + 0.12, 3]]) : t < GR + 1.08 ? K.pp(t - GR - 0.12, 3, 3.3, 0.48) : t < GF ? K.clip(t, [[GR + 1.08, 3.3], [GS[0], 3.72], [GS[1], 4.95], [GF, 5.69]]) : (t - GF) * 0.8;
            const ps = gp.s * 1.6 * pose.k, bodyO = { dx: act.dx * ps, dy: act.dy * ps, sx: act.sx, sy: act.sy * (1 + 0.1 * hit(t, GR, 0.4)), r: act.r };
            const G = gMon(gx, gz, pose.k, Object.assign({ wade, ft, hot, dark: 0.3 * (1 - seg(t, GR + 0.5, 12.4)) }, bodyO));
            if (G) { K.mon(G.p.x + bodyO.dx, G.p.y + wade * G.p.s + bodyO.dy, G.s, { box: 1, ft, mask: 'seam', col: '#ff9a2c', add: 1, sx: bodyO.sx, sy: bodyO.sy, r: bodyO.r, a: kf(t, [[GR, 0.95], [GR + 0.9, 0.55], [12.2, 0.4], [13.2, 0]]) * (0.82 + 0.18 * sin(t * 9)), cut: wade > 0 ? G.p.y + 1 : null });
              /* Pusten etter brølet og stegene: damp og glør fra kjeften. */
              const hx = G.p.x - (G.M ? G.M.w * 0.3 : 40), hy = G.p.y - (G.M ? G.M.h * 0.78 : 90) * (1 - wade / 190), puff = max(pulse(t, GR + 0.15, GR + 1.1), pulse(t, 11.62, 12.05) * 0.7, pulse(t, 13.0, 13.5) * 0.5);
              if (puff > 0.02) for (let i = 0; i < 7; i++) { const ph = (t * (1.4 + rnd(i, 81)) + rnd(i, 82)) % 1; K.blob(hx - ph * (30 + rnd(i, 83) * 40) * G.s * 0.4, hy - ph * 14 * G.s * 0.4 + (rnd(i, 84) - 0.5) * 8, (4 + ph * 12) * G.s * 0.4, i % 2 ? '#ffb060' : '#3a2420', puff * (1 - ph) * (i % 2 ? 0.5 : 0.4), i % 2 ? 1 : 0); }
              /* Lava som renner av kroppen. */
              const dk = 1 - seg(t, GR + 0.2, GR + 2.6); if (dk > 0 && G.M) for (let i = 0; i < 34; i++) { const life = 0.5 + rnd(i, 41) * 0.6, ph = ((t - GR) / life + rnd(i, 42)) % 1, x = G.p.x + (rnd(i, 43) - 0.5) * G.M.w * 0.8, y0 = G.p.y - G.M.h * (0.25 + rnd(i, 44) * 0.6) * (1 - wade / 190), y = y0 + ph * ph * G.M.h * 0.7; if (y < G.p.y + 2) K.rect(x, y, max(1.5, G.s * 0.6), (4 + ph * 12) * G.s * 0.4, ph < 0.4 ? '#ffe9a0' : '#ff7a1c', dk * (1 - ph) * 0.9, 1); }
              if (st.i >= 0 && st.hit > 0) { K.blob(G.p.x, G.p.y, 130 * G.p.s * (1.2 - st.hit), '#ff8a2a', st.hit * 0.8, 1, 0.24); for (let i = 0; i < 14; i++) { const ph = 1 - st.hit, an = -PI / 2 + (rnd(i, 61 + st.i) - 0.5) * 2.2, r = ph * 90 * G.p.s; K.blob(G.p.x + cos(an) * r * 1.4, G.p.y + sin(an) * r * 0.7 + ph * ph * 50 * G.p.s, 3 * G.p.s + 1.5, i % 2 ? '#ffd070' : '#ff5a1a', st.hit, 1); } }
            }
          }
        }
        const fp = t >= 12.7 ? K.gp(G2[0], G2[1]) : null; if (fp) ARENA.mid(383, Object.assign({}, S, { foe: [fp.x, fp.y] }));
        ARENA.front(383, S);
        /* Kameraet til bildet: risting, blink (to store), sjokkbølgene fra utbruddet og brølet, og innglidningen i kampvinkelen. */
        const hd = gp ? { x: gp.x - 40 * gp.s, y: gp.y - 120 * gp.s } : null, sk = [];
        if (t >= GE && t < GE + 1.3) sk.push({ x: cr.x, y: cr.y, r: (t - GE) * 430, w: 34, a: 20 * (1 - seg(t, GE, GE + 1.3)) });
        if (hd && t >= GR + 0.2 && t < GR + 1.3) sk.push({ x: hd.x, y: hd.y, r: (t - GR - 0.2) * 520, w: 30, a: 17 * (1 - seg(t, GR + 0.2, GR + 1.3)) });
        GK.forEach((q, i) => { const p = K.gp(BL[i][0], BL[i][1]); if (p && t >= q && t < q + 0.5) sk.push({ x: p.x, y: p.y, r: (t - q) * 300 * p.s, w: 16, a: 9 * (1 - seg(t, q, q + 0.5)), sy: 0.3 }); });
        P.shock = sk;
        if (a1 && gp && bt > 0) P.bulge = { x: gp.x, y: gp.y, r: 120 * gp.s, a: 0.16 * bt };
        P.bars = a1 ? 1 : 1 - seg(t, GE, GE + 0.35);
        P.sh = (a1 ? bt * 3.5 + roll * 5 : 0) + hit(t, GE, 1.2) * 12 + hits(t, [6.48, 7.71], 0.5) * 4 + hits(t, GK, 0.45) * 7 + hit(t, GR, 1) * 11 + (t >= GR - 0.4 ? act.sh : 0);
        /* Hvert steg gir kameraet et rykk (en liten rulling som dør ut), i tillegg til ristingen. */
        P.rot = GS.concat([GR + 0.5]).reduce((m, q) => m + (t >= q ? sin((t - q) * 46) * 0.008 * hit(t, q, 0.32) : 0), 0);
        P.fl = max(hit(t, GE, 0.45) * 0.85, hit(t, GR, 0.3) * 0.5); P.fc = '#fff0d0'; P.fade = 1 - seg(t, 0, 0.5);
        const zk = io(seg(t, 12.5, 13.4)); P.z = mix(1, pose.cz, zk); P.zx = 230.4; P.zy = 307.2;
        K.plate(GS[1], { mat: 'stone', col: '#ff6a2a' });
        const b1 = K.gp(BL[0][0], BL[0][1]); if (b1) K.impact(GK[0], b1.x, b1.y - 40 * b1.s, { len: 0.12, r0: 50 });
      }
    }
  });

  /* ================= KYOGRE =================
     Samme låt som Groudon («Primal Kyogre & Groudon»), se slagene over.
     Arenaen: det åpne havet over Seafloor Cavern i uvær. Hele banen er havflaten (materialet 'ocean': himmel og sjø i ett). Kyogre ligger i sjøen
     (vannflata går 62 piksler over føttene, så buken og finnene er under vann og hvert svømmetak dukker den), og din egen står på et skjær som så vidt
     stikker opp. Dønningene ruller mot kameraet, regnet står på skrå fra høyre, lynet lyser opp skyene og sjøen, og dråper sitter på linsa.
     Verden her: Y = 0 er vannflata, kameraet står 36 enheter over den, og Kyogre ligger i X 121, Z 400. */
  const KZ = 400, KX = 121, KR = [-8, 45];
  /* Lynet i arenaen: av og til (oftere i fase 2). Gir [styrke 0–1, x på skjermen, nummeret på lynet]. */
  const kBolt = (t, p2) => { const per = mix(5.3, 2.7, p2), q = floor(t / per), t0 = q * per + rnd(q, 31) * (per - 0.7), d = t - t0; if (rnd(q, 32) < 0.3 - 0.3 * p2 || d < 0 || d > 0.5) return [0, 256, q]; return [max(0, (1 - d / 0.5) * (0.55 + 0.45 * sin(d * 58))), 50 + rnd(q, 33) * 410, q]; };
  /* Tallene til havet (de samme radene går til shaderen og til K.seaH). Filmen setter egne verdier i S; ellers er det kampens. */
  const kSea = S => {
    const p2 = S.p2, fT = S.since('field'), fl = S.fl == null ? kBolt(S.t, p2) : [S.fl, S.flx == null ? 300 : S.flx, 0], rings = (S.rings || []).slice(0, 3);
    /* Stedet slår til: en dønning reiser seg bak Kyogre og ruller inn over skjæret ditt. */
    const fw = fT < 1.5 ? [mix(620, 30, ei(c01(fT / 1.05)) * 0.35 + c01(fT / 1.05) * 0.65), 19 * sin(c01(fT / 1.35) * PI), 46, 0] : null;
    for (const h of S.hits) { const k = (S.t - h.t) / 0.9; if (k >= 0 && k < 1 && rings.length < 3) rings.push(h.side === 'me' ? [KR[0], KR[1] + 26, 6 + k * 34, 0.9 * (1 - k)] : [KX, KZ - 12, 20 + k * 190, 0.8 * (1 - k)]); }
    /* Lyset under vannet rundt Kyogre (Primal): svakt hele tiden, sterkt i fase 2. */
    const gl = S.glow == null ? 0.16 + 0.5 * p2 + 0.5 * hit(S.since('rage'), 0.5, 2.2) : S.glow; if (gl > 0.01 && rings.length < 3) rings.push([S.gx == null ? KX : S.gx, S.gz == null ? KZ - 6 : S.gz, S.gr || 150, -gl * (0.82 + 0.18 * sin(S.t * 2.1))]);
    return { fl, fw, u: [[S.sw == null ? 15 + 6 * p2 : S.sw, S.chop == null ? 1 : S.chop, S.foam == null ? 0.85 + 0.45 * p2 : S.foam, S.rain == null ? 0.7 + 0.3 * p2 : S.rain],
      [S.storm == null ? 0.78 + 0.22 * p2 : S.storm, fl[0], fl[1], S.wind == null ? 0.8 + 0.4 * p2 : S.wind], S.wall || fw || Z4, rings[0] || Z4, rings[1] || Z4, rings[2] || Z4,
      S.lee || [60, 300, 0.2, 0], S.glc || [0.1, 0.5, 0.9, 0]] };
  };
  /* Et skjær i sjøen: en mørk, våt stein med flat topp som så vidt stikker opp, med skum som slår rundt foten. (X, Z) = midten, R = radius, o = { y (toppen over vannet), seed, n, wet }. */
  const skerry = (X, Z, R, u, o) => {
    o = o || {}; const g = K.g, t = K.T, n = o.n || 20, sd = o.seed || 3, top = o.y == null ? 4 : o.y, pts = [], low = [];
    for (let i = 0; i < n; i++) { const an = i / n * TAU, r = R * (0.78 + 0.34 * K.fbm1(i * 0.8, sd, 2) + 0.14 * (rnd(i, sd) - 0.5)), x = X + cos(an) * r * 1.45, z = Z + sin(an) * r, p = K.gp(x, z, top), q = K.gp(x + cos(an) * R * 0.16, z + sin(an) * R * 0.1, K.seaH(x, z, t, u) * 0.7 - 0.4); if (!p || !q) return null; pts.push(p); low.push(q); }
    const c = K.gp(X, Z, top); if (!c) return null; let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = min(y0, p.y); y1 = max(y1, p.y); });
    g.save();
    /* Skumkransen rundt foten (bak steinen), så siden ned i vannet: bare flatene som vender mot oss. */
    for (let i = 0; i < n; i++) { const q = low[i], fl = 0.5 + 0.5 * sin(t * (1.6 + rnd(i, sd + 31) * 2) + i * 1.3); K.blob(q.x, q.y, (7 + rnd(i, sd + 32) * 6) * min(4, q.s * 0.55) * (0.8 + 0.3 * fl), '#dcecf4', 0.3 + 0.2 * fl, 0, 0.36); }
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], la = low[i], lb = low[(i + 1) % n]; if (b.x >= a.x) continue; const gr = g.createLinearGradient(0, min(a.y, b.y), 0, max(la.y, lb.y) + 1); gr.addColorStop(0, '#0b1218'); gr.addColorStop(0.75, '#05090d'); gr.addColorStop(1, '#1d3a46'); g.fillStyle = gr; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(lb.x, lb.y); g.lineTo(la.x, la.y); g.closePath(); g.fill(); }
    /* Toppen: våt, mørk stein som speiler litt av himmelen, med furer på tvers. */
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#2b3842'); gr.addColorStop(0.4, '#151e26'); gr.addColorStop(1, '#0a1016'); g.fillStyle = gr; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 22; i++) { const x = c.x + (rnd(i, sd + 11) - 0.5) * R * c.s * 3, y = y0 + rnd(i, sd + 12) * (y1 - y0), w = (5 + rnd(i, sd + 13) * 20) * min(3, c.s * 0.5); g.fillStyle = i % 3 ? 'rgba(0,0,0,.32)' : 'rgba(150,180,200,.1)'; g.fillRect(x, y, w, max(1, min(3, c.s * 0.4))); }
    const wet = o.wet == null ? 0.5 : o.wet; if (wet > 0) for (let i = 0; i < 4; i++) K.blob(c.x + (rnd(i, sd + 21) - 0.5) * R * c.s * 2.2, y0 + (0.1 + 0.5 * rnd(i, sd + 22)) * (y1 - y0), (14 + rnd(i, sd + 23) * 20) * min(3, c.s * 0.45), '#9fc4d8', 0.13 * wet, 1, 0.2);
    g.restore();
    g.strokeStyle = 'rgba(170,205,225,.2)'; g.lineWidth = 1; g.beginPath(); let on = false; for (let i = 0; i <= n; i++) { const a = pts[i % n], b = pts[(i + 1) % n]; if (b.x > a.x) { on ? g.lineTo(b.x, b.y) : (g.moveTo(a.x, a.y), g.lineTo(b.x, b.y)); on = true; } else on = false; } g.stroke();
    g.restore();
    return { c, pts, y0, y1 };
  };
  /* En sjøstakk langt ute: en mørk tind i disen. */
  const stack = (X, Z, w, h, sd, a) => { const b = K.gp(X, Z, 0); if (!b) return; const g = K.g, n = 9, s = b.s; g.save(); g.globalAlpha = c01(a); const gr = g.createLinearGradient(0, b.y - h * s, 0, b.y); gr.addColorStop(0, '#141c24'); gr.addColorStop(1, '#27343e'); g.fillStyle = gr; g.beginPath(); g.moveTo(b.x - w * s, b.y + 2); for (let i = 0; i <= n; i++) { const u = i / n, hh = h * s * Math.pow(sin(u * PI), 0.55) * (0.72 + 0.4 * rnd(i, sd)); g.lineTo(b.x + (u * 2 - 1) * w * s + (rnd(i, sd + 1) - 0.5) * w * s * 0.2, b.y - hh); } g.lineTo(b.x + w * s, b.y + 2); g.closePath(); g.fill(); g.restore(); K.blob(b.x, b.y + 1, w * s * 1.5, '#cfe2ec', 0.35 * a, 0, 0.14); };
  const kScene = S => {
    const P = K.P, t = S.t, sea = kSea(S), u = sea.u, fl = sea.fl, p2 = S.p2, fT = S.since('field'), rT = S.since('rage'), rain = u[0][3], storm = u[1][0];
    S.u = u;
    /* Lyset på figurene: kjølig og dempet som uværet. Himmelen lyser svakt ovenfra, lynet gir hardt kantlys, og lyset under vannet når opp nedenfra.
       Omriss og skygger får den mørke blågrønne skyggefargen. De røde tegnene til Kyogre gløder (sterkt i fase 2). */
    const glw = S.glow == null ? 0.16 + 0.5 * p2 : S.glow;
    K.lightSet({ amb: blend('#8499a8', '#c4d6e2', fl[0] * 0.8), sat: 0.84, lift: blend('#0c1a24', '#1c3442', fl[0]),
      lights: [{ col: '#cfe2f0', a: 0.16 + 0.55 * fl[0], h: 0.55, top: 1 }, { col: '#2aa8e0', a: min(0.7, 0.18 + 0.5 * glw), h: 0.6 }],
      rim: [{ col: '#d8eafa', dx: fl[1] > 377 ? -1 : 1, dy: 1, a: 0.3 + 0.65 * fl[0] }],
      glow: S.film ? null : { mask: 'red', col: '#ff6a4a', a: (0.3 + 0.6 * p2 + 0.5 * hit(rT, 0.5, 2.5)) * (0.75 + 0.25 * sin(t * 3.1)) },
      me: { amb: blend('#7c8f9d', '#c0d2de', fl[0] * 0.8), lights: [{ col: '#cfe2f0', a: 0.2 + 0.55 * fl[0], h: 0.5, top: 1 }], rim: [{ col: '#d8eafa', dx: 0, dy: 1, a: 0.35 + 0.6 * fl[0] }] } });
    /* Havet og himmelen (alt bak): materialet tegner hele bildet. */
    K.ground('ocean', u);
    /* Sjøstakker i disen, så havet får dybde. */
    if (!S.nostack) { stack(-640, 2600, 46, 150, 5, 0.5); stack(-560, 2500, 26, 90, 7, 0.45); stack(900, 3400, 60, 190, 11, 0.38); }
    /* Lynet: en gren fra skyene ned i havet der himmelen lyser. I raseriet slår det ned like bak Kyogre. */
    if (fl[0] > 0.05 && S.fl == null) { const q = fl[2]; K.bolt(fl[1] + (rnd(q, 41) - 0.5) * 90, -12, fl[1], K.st.yh - 2, { seed: q * 5 + floor(t * 22) % 3, col: '#a8c8ff', core: '#ffffff', w: 1.7, a: fl[0], br: 3, depth: 5 }); K.blob(fl[1], K.st.yh, 70, '#cfe0ff', 0.5 * fl[0], 1, 0.3); }
    if (rT < 0.9) { const k = hit(rT, 0.5, 0.4), kp = K.gp(KX + 30, KZ + 160, 0); if (k > 0 && kp) { for (let i = 0; i < 3; i++) K.bolt(kp.x + (i - 1) * 60, -12, kp.x, kp.y, { seed: 70 + i + floor(t * 24), col: '#b8d0ff', core: '#ffffff', w: 3 - i * 0.7, a: k, br: 3 }); K.blob(kp.x, kp.y, 150, '#e0ecff', 0.8 * k, 1, 0.4); } }
    /* Regn langt unna (det nære ligger i forgrunnen), og skjæret der din egen står. */
    K.parts('rain', { n: 90, seed: 2, cols: ['#8fb0c8', '#c2d6e4'], a: 0.5 * rain, spd: 1.25, wind: -0.75, z: [0.05, 0.5], y1: H + 20 });
    if (!S.norock) { skerry(KR[0] + 15, KR[1] + 13, 6, u, { seed: 9, y: 2.2, n: 14, wet: 0.4 }); S.rock = skerry(KR[0], KR[1], 11.5, u, { seed: 5, y: 4, wet: 0.5 + 0.5 * fl[0] }); skerry(KR[0] - 9, KR[1] + 4, 5.5, u, { seed: 13, y: 6.2, n: 12, wet: 0.7 }); }
    if (!S.film && !S.norock) K.contact(S.me[0], S.me[1] - 4, 56 * S.mk, { a: 0.9, col: '#02070b', sy: 0.2 });
    /* Bølgen som slår inn: skumfronten der den bryter mot skjæret. */
    if (sea.fw && fT > 0.55) { const k = hit(fT, 0.95, 0.6), p = K.gp(KR[0], KR[1] + 34, 6); if (p && k > 0) for (let i = 0; i < 16; i++) { const an = -PI / 2 + (rnd(i, 51) - 0.5) * 2.4, r = (1 - k) * (60 + rnd(i, 52) * 150); K.blob(p.x + cos(an) * r * 1.5 + (rnd(i, 53) - 0.5) * 220, p.y + sin(an) * r, 16 + rnd(i, 54) * 22, '#eef8fc', k * 0.8, 0, 0.8); } }
    /* Dråper på linsa, og etterbehandlingen: kjølig tone, glød i skum og lyn, mørke kanter. */
    const drops = K.lensDrops({ n: 16, a: 13, size: 8, wet: S.wet == null ? 0.55 + 0.45 * rain : S.wet, run: 0.4 });
    S.drops = drops;
    P.bloom = 0.3 + 0.22 * fl[0]; P.bloomT = 0.68; P.grain = 0.04; P.vig = 0.5 + 0.12 * p2; P.vigc = '#01060b';
    P.grade = { tint: [0.96, 1, 1.04], con: 1.1, sat: 1.1, exp: 1.12 + 0.1 * fl[0] };
    if (fT < 1.5) P.sh = (P.sh || 0) + hit(fT, 0.92, 0.5) * 7;
  };
  /* Mellom figurene: Kyogre ligger i sjøen. Biten av bildet under vannlinja legges foran den, med skum der kroppen bryter flata. */
  const kMid = S => { if (!S.u) return; const line = K.seaLine(KZ, 377 - 128, 377 + 128, S.t, S.u, { step: 5 }); if (S.back) K.seaOver(S.back, line, 210); K.seaFoam(line, { a: 0.62 + 0.2 * S.p2, w: 0.8, size: 6.5, up: 18, seed: 93 }); };
  const kFront = S => {
    const t = S.t, p2 = S.p2, fT = S.since('field'), rain = S.rain == null ? 0.7 + 0.3 * p2 : S.rain;
    /* Bølgen som slår over skjæret: en vegg av skum feier opp over nedre del av bildet og renner av. */
    if (fT > 0.7 && fT < 2) { const k = hit(fT, 0.95, 1), up = eo(c01((fT - 0.8) / 0.25)); for (let i = 0; i < 26; i++) { const x = (i + rnd(i, 61)) / 26 * (W + 80) - 40, y = H + 30 - up * (90 + rnd(i, 62) * 120) + (1 - k) * (1 - k) * 170; K.blob(x, y, 34 + rnd(i, 63) * 30, i % 3 ? '#e8f4fa' : '#bcd6e4', k * 0.85, 0, 0.9); } K.parts('rain', { n: 40, seed: 77, cols: ['#ffffff'], a: k * 0.9, spd: 2.4, wind: -0.3, z: [0.5, 1], size: 1.3 }); }
    K.parts('rain', { n: 46, seed: 12, cols: ['#a8c4d8', '#dcebf4'], a: 0.6 * rain, spd: 1.35, wind: -0.75, z: [0.6, 1] });
    K.lensShine(S.drops, { a: 0.9 });
  };
  /* Filmen (14,2 s, på de samme slagene som Groudon):
     (1) Stille hav i skumring mens skyene samler seg. På de fire dempede slagene glir en enorm skygge med lysende tegn under overflaten, mot kameraet og
         under det, og de første dråpene treffer linsa. I trommevirvelen (4,92) kommer regnveggen.
     (2) Primordial Sea: på 5,26 slår lynet ned og himmelen åpner seg. Havet reiser seg, kameraet rir på dønningene, og en trener på et skjær ser en
         kjempebølge bygge seg opp bak. På de tre slagene (8,46 · 8,93 · 9,54) lyser tegnene inne i bølgen, større for hver gang.
     (3) På 10,16 bryter Kyogre ut av bølgeveggen, henger over kameraet og brøler. På 11,40 slår den og bølgen ned over oss, og bildet er under vann én takt
         (lys ovenfra, bobler, ruiner på bunnen, Kyogre som glir ned i det blå). På 12,63 kommer kameraet opp i kampvinkelen, og Kyogre bryter flata der
         den ligger i kampen, mens navnet står i vannet.
     Animasjonen: finnene står rett opp i bildene 12,0–12,6 s (spranget og brølet), svømmetaket er 10,9–11,5 s (stupet), og den ender på første bilde. */
  const KB = GB, KE = GE, KL = [6.49, 7.72], KK = GK, KRV = GR, KD = 11.4, KU = 12.63, KFN = GF;
  /* Skyggen under overflaten (akt 1): en mørk kropp med lysende tegn, lagt flatt i vannet. */
  const kShade = (X, Z, k, a, col, ft) => { const p = K.gp(X, Z, 0); if (!p || a <= 0.01) return; const s = 1.6 * k * p.s; K.blob(p.x, p.y, 170 * p.s * k, '#010810', 0.5 * a, 0, 0.3);
    K.mon(p.x, p.y + 26 * p.s * k, s, { ft, col: '#020c18', a: 0.42 * a, tf: [1, 0, -0.55, 0.36] }); K.mon(p.x, p.y + 26 * p.s * k, s, { ft, mask: 'red', col, add: 1, a, tf: [1, 0, -0.55, 0.36] }); };
  /* Et lyn fra skyene ned i sjøen ved x (skjermen), styrke k. */
  const kStrike = (x, k, sd, t) => { if (k <= 0.02) return; const y = K.st.yh; K.bolt(x + (rnd(sd, 3) - 0.5) * 140, -14, x, y - 1, { seed: sd * 7 + floor(t * 24) % 3, col: '#a8c8ff', core: '#ffffff', w: 2.4, a: k, br: 4, depth: 5 }); K.blob(x, y, 110, '#dce8ff', 0.6 * k, 1, 0.3); };
  /* Sprut: hvite klumper og dråper som kastes ut fra (x, y). k = 1 → 0 (alder), R = hvor langt. */
  const kSpray = (x, y, k, R, sd, n) => { if (k <= 0) return; const ph = 1 - k; for (let i = 0; i < (n || 34); i++) { const an = rnd(i, sd) * TAU, r = ph * R * (0.3 + rnd(i, sd + 1)), big = i % 3 === 0; K.blob(x + cos(an) * r * 1.2, y + sin(an) * r * 0.85 + ph * ph * R * 0.35, big ? (20 + rnd(i, sd + 2) * 34) * (0.5 + ph) : 2.5 + rnd(i, sd + 2) * 4, big ? '#e8f4fa' : '#ffffff', k * (big ? 0.5 : 0.95), 0, big ? 0.8 : 1); } };
  /* Et svart skjær i motlys (filmens forgrunn): taggete topp, en hylle der treneren står, lys kant mot himmelen og skum rundt foten. Gir hylla { x, y, s }. */
  const kCrag = (X, Z, W0, H0, sd, rim, t) => { const b = K.gp(X, Z, 0); if (!b || b.s > 14) return null; const g = K.g, s = b.s, n = 18, pts = []; for (let i = 0; i <= n; i++) { const u = i / n, sh = u > 0.38 && u < 0.62 ? 0.62 : 0.3 + 0.7 * Math.pow(sin(u * PI), 0.6) * (0.55 + 0.6 * K.fbm1(i * 0.9, sd, 2)); pts.push([b.x + (u * 2 - 1) * W0 * s, b.y - H0 * s * sh * (0.25 + 0.75 * Math.pow(sin(u * PI), 0.35))]); }
    for (let i = 0; i < 9; i++) K.blob(b.x + ((i + 0.5) / 9 * 2 - 1) * W0 * s * 1.15, b.y + 1 * s, (4 + rnd(i, sd + 3) * 4) * s * (0.8 + 0.3 * sin(t * (1.5 + rnd(i, sd + 4) * 2) + i)), '#dcecf4', 0.55, 0, 0.36);
    g.save(); g.fillStyle = '#02070b'; g.beginPath(); g.moveTo(b.x - W0 * s * 1.05, b.y + 3 * s); pts.forEach(q => g.lineTo(q[0], q[1])); g.lineTo(b.x + W0 * s * 1.05, b.y + 3 * s); g.closePath(); g.fill();
    g.strokeStyle = rim; g.lineWidth = max(1, min(2.5, s * 0.4)); g.globalAlpha = 0.8; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); g.restore();
    return { x: b.x, y: pts[9][1], s }; };
  /* Skumrøyken som vinden river av toppen på kjempebølgen. wall = [Z, høyde, bredde]. */
  const kCrest = (wall, t, a) => { if (!wall || a <= 0.01) return; for (let i = 0; i < 26; i++) { const X = (i / 25 * 2 - 1) * 900 + K.st.cx, p = K.gp(X, wall[0] + X * X * 0.00035, wall[1] * (1 + 0.07 * sin(X * 0.013 + 2)) * 0.97); if (!p || p.x < -80 || p.x > W + 80) continue; const ph = (t * (0.5 + rnd(i, 7) * 0.5) + rnd(i, 8)) % 1, r = (20 + rnd(i, 9) * 34) * min(1.6, p.s * 2.2); K.blob(p.x - ph * 60 * p.s * 2, p.y - ph * 26 * p.s * 2 + 4, r * (0.6 + ph), '#dfeef6', a * (1 - ph) * 0.55, 0, 0.6); } };
  ARENA.def(382, {
    yh: 100, hc: 36, use: [], pose: { cz: 1, k: 1.28, km: 1.9 }, scene: kScene, mid: kMid, front: kFront,
    ev: { enter: { len: 0.7, cues: [[0, 'thud']] }, field: { len: 1.5, cues: [[0, 'rumble'], [0.92, 'hit'], [0.92, 'sfx', 'Surf']] }, rage: { len: 1.7, cues: [[0, 'rumble'], [0.5, 'boom'], [0.5, 'sfx', 'Thunder'], [0.5, 'cry']] } },
    film: { len: 14.2, R: KRV, at: 0, outc: '#04121e',
      cues: [[0.31, 'tick'], [1.56, 'tick'], [2.79, 'tick'], [4.01, 'tick'], [KE, 'boom'], [6.49, 'thud'], [7.72, 'thud'], [8.46, 'thud'], [8.93, 'thud'], [9.54, 'thud'], [KRV, 'cry'], [KD, 'boom'], [KU, 'thud'], [KFN, 'thud']],
      draw(t, P, c) {
        const pose = ARENA.fit(c.pose || { cz: 1, k: 1.28 }, c.sp), kf = K.kf, A = c.sp && c.sp.ani, tot = A ? A.total : 13.14, n = KB.filter(q => t >= q).length, bt = hits(t, KB, 0.7), roll = seg(t, 4.92, KE), a1 = t < KE, under = t >= KD && t < KU, ks0 = 1.6 * pose.k;
        /* ---------- Under vann (11,40–12,63) ---------- */
        if (under) {
          const u = (t - KD) / (KU - KD), up = seg(t, 12.25, KU);
          K.stage({ yh: 150, hc: 36 }); K.camTo({ x: t * 30, z: t * 50, tilt: -30 + 150 * ei(up), zoom: 1 });
          K.lightSet({ amb: '#5f93bd', sat: 0.7, lift: '#062238', lights: [{ col: '#bfe8ff', a: 0.5, h: 0.6, top: 1 }], rim: [{ col: '#cfeeff', dx: 0, dy: 1, a: 0.5 }] });
          K.ground('deep', [[mix(70, 9, ei(up)), 0.75 + 0.5 * up + 0.5 * hit(t, 12, 0.5), 0.4, 0], [0.012, 0.11, 0.24, 0], [0.62, 0.9, 1, 0]]);
          /* Ruinene på bunnen (den sunkne byen), langt nede i det blå. */
          const g = K.g, by = 392 + 260 * ei(up);
          for (let i = 0; i < 9; i++) { const x = 20 + i * 62 + rnd(i, 3) * 30 - u * 40 * (1 + (i % 3)), h = 50 + rnd(i, 4) * 130, w = 16 + rnd(i, 5) * 16, far = i % 3; g.fillStyle = far ? '#06294a' : '#031a30'; g.globalAlpha = far ? 0.8 : 0.95; g.fillRect(x, by - h, w, h + 300); g.fillRect(x - 4, by - h, w + 8, 6); if (i % 4 === 1) g.fillRect(x - 30, by - h * 0.55, 60 + w, 9); }
          g.globalAlpha = 1; K.blob(256, by + 30, 420, '#010912', 0.85, 0, 0.26);
          for (let i = 0; i < 5; i++) K.shaft(60 + i * 100 + sin(t * 0.7 + i) * 20, -20 - 260 * ei(up), 0.16 + (i - 2) * 0.07, 430, 26, 110, '#9fdcff', (0.2 + 0.08 * sin(t * 2 + i * 1.7)) * (1 - up * 0.5));
          /* Kyogre glir ned i det blå, med tegnene lysende, og bobler etter seg. */
          const kx = mix(400, 170, io(u)), ky = mix(190, 300, io(u)) + 320 * ei(up), ks = ks0 * mix(2.3, 0.85, eo(u)), ft = 10.6 + (t - KD) * 0.75, pl = 0.6 + 0.6 * hit(t, 12, 0.5);
          K.mon(kx, ky, ks, { ft, dark: 0.15 }); K.mon(kx, ky, ks, { ft, mask: 'red', col: '#ff7a5a', add: 1, a: pl * (0.8 + 0.2 * sin(t * 8)) }); K.blob(kx - 20, ky - 60 * ks / 2, 150 * ks / 2, '#3aa8ff', 0.14 * pl, 1, 0.6);
          if (t >= 12) K.ring(kx, ky - 50 * ks / 2, (t - 12) * 520, { col: '#bfe8ff', w: 3, a: hit(t, 12, 0.55) * 0.7, sy: 0.75 });
          for (let i = 0; i < 26; i++) { const ph = (t * (0.7 + rnd(i, 21)) + rnd(i, 22)) % 1, bx = kx + 60 * ks / 2 + rnd(i, 23) * 150 * ks / 2 + ph * 40, byy = ky - 30 * ks / 2 - ph * (90 + rnd(i, 24) * 120) + (rnd(i, 25) - 0.5) * 50; K.ring(bx, byy, 2 + rnd(i, 26) * 5, { col: '#cfeeff', w: 1, a: (1 - ph) * 0.7 }); }
          /* Boblene fra nedslaget (tettest først), og støv som svever. */
          K.parts('bubble', { n: 110, seed: 5, cols: ['#bfe8ff', '#eaf8ff'], a: 0.9 * (1 - seg(t, KD, KD + 0.75)) + 0.25, spd: 2.6, z: [0.1, 1] }); K.parts('mote', { n: 50, seed: 9, cols: ['#7fc0e8', '#cfeeff'], a: 0.5, z: [0, 0.8] });
          P.bloom = 0.5; P.bloomT = 0.55; P.grain = 0.05; P.vig = 0.6; P.vigc = '#00050c'; P.grade = { tint: [0.82, 0.98, 1.12], con: 1.06, sat: 1.08, exp: 1 + 0.5 * up * up };
          P.wav = 2.2 * (1 - 0.5 * u); P.fl = max(hit(t, KD, 0.5), seg(t, KU - 0.14, KU)) * 0.95; P.fc = '#e4f4ff'; P.sh = hit(t, KD, 0.6) * 9 + hit(t, 12, 0.3) * 3;
          return;
        }
        /* ---------- Over vann ---------- Kameraet: lavt over stille sjø, så tilbake og ned mellom dønningene, inn mot bølgeveggen, og til slutt kampvinkelen. */
        const bob = a1 ? 0 : sin(t * 1.9) * 0.08 * seg(t, KE, 6.4) * (1 - seg(t, 10, 10.6));
        const cam = t >= KU ? { x: 0, z: kf(t, [[KU, -46], [13.5, 0, eo]]), h: kf(t, [[KU, 0.62], [13.5, 1, eo]]), tilt: kf(t, [[KU, 26], [13.5, 0, eo]]), zoom: 1 }
          : { x: kf(t, [[0, 0], [KE, 0], [7, 34], [10.16, 22]]), z: kf(t, [[0, -30], [KE, -6], [6.6, -78], [8.3, -74], [10.16, -34], [KD, 10]]), h: kf(t, [[0, 0.56], [KE, 0.52], [6.6, 0.66], [8.3, 0.6], [10.16, 0.5]]) + bob,
            tilt: kf(t, [[0, 44], [KE, 40], [6.6, 34], [8.3, 44], [10.16, 76], [KD, 96]]), zoom: kf(t, [[8.3, 1], [10.16, 1.1], [KD, 1.18]]) };
        /* Havet og været. Kjempebølgen: bygger seg opp fra 6,2, står som en vegg på 10, og velter over oss på 11,40. */
        const wall = t >= 6.2 && t < KD ? [kf(t, [[6.2, 1750], [8.4, 1080], [KRV, 760], [10.7, 700], [KD, 90, ei]]), kf(t, [[6.2, 0], [8.4, 185], [KRV, 318], [10.8, 334], [KD, 250]]), kf(t, [[6.2, 220], [KRV, 165], [KD, 120]]), 0] : null;
        const kk = hits(t, KK, 0.5), kn = KK.filter(q => t >= q).length, fls = [[KE, 330], [6.49, 120], [7.72, 400], [9.9, 250], [KFN, 400]], fb = fls.reduce((m, q) => { const d = t - q[0], k = d >= 0 && d < 0.5 ? (1 - d / 0.5) * (0.6 + 0.4 * sin(d * 60)) : 0; return k > m[0] ? [k, q[1], q[0]] : m; }, [0, 256, 0]);
        const far = a1 && t > 3.9 ? 0.3 * hit(t, 4.1, 0.25) + 0.4 * hit(t, 4.75, 0.2) : 0;
        const wz = wall ? wall[0] : 0, wh = wall ? wall[1] : 0, kX = 26, kZ = wz - 46, lit3 = t >= 8.3 && t < KRV;
        const S = ARENA.state(t, { film: true, cc: c.cc, cam, wall, nostack: t > 6 && t < KU, norock: t < KU,
          sw: a1 ? 3 + 1.5 * n + 4 * roll : t < KU ? kf(t, [[KE, 9], [7.6, 25], [KRV, 24], [KD, 30]]) : kf(t, [[KU, 26], [13.6, 15]]),
          chop: a1 ? 0.35 + 0.5 * roll : 1, foam: a1 ? 0.12 + 0.08 * n + 0.5 * roll : t < KU ? kf(t, [[KE, 0.75], [7.6, 1]]) : kf(t, [[KU, 1.3], [13.7, 0.85]]),
          rain: a1 ? 0.03 * n + 0.75 * roll * roll : t < KU ? 1 : kf(t, [[KU, 1], [13.8, 0.7]]), storm: a1 ? 0.22 + 0.1 * n + 0.3 * roll : t < KU ? 1 : kf(t, [[KU, 1], [13.8, 0.78]]),
          wind: a1 ? 0.15 + 0.6 * roll : t < KU ? 1.2 : kf(t, [[KU, 1.2], [13.8, 0.8]]), lee: t < KU ? [50, 240, a1 ? 1 : 0.34, 0] : [60, 300, kf(t, [[KU, 0.5], [13.6, 0.2]]), 0],
          fl: max(fb[0], far), flx: fb[0] > far ? fb[1] : 380, wet: a1 ? 0.12 * n : 1,
          /* Lyset under vannet: skyggen i akt 1, tegnene inne i bølgen i akt 2, og Kyogre selv i kampen. */
          glow: a1 ? 0.25 + 0.3 * bt : lit3 ? 0.22 + 0.14 * kn + 0.6 * kk : t < KU ? 0.6 * hit(t, KRV, 1.4) : kf(t, [[KU, 0.6], [13.9, 0.16]]),
          gx: a1 ? mix(300, 20, io(seg(t, 0.3, 4.4))) : lit3 || t < KU ? kX : KX, gz: a1 ? mix(950, 70, io(seg(t, 0.3, 4.4))) : lit3 || t < KU ? kZ + 30 : KZ - 6, gr: a1 ? 130 : lit3 ? 150 : 120, glc: lit3 ? [0.12, 0.5, 0.95, 0] : null });
        ARENA.scene(382, S); const u = S.u;
        kCrest(wall, t, seg(t, 7.2, 8.6));
        /* Lynene filmen selv ber om (i akt 1 bare lysglimt inne i skyene). */
        if (fb[0] > 0.02) kStrike(fb[1], fb[0], floor(fb[2] * 10), t);
        /* Skalabildet: en trener på et skjær i forgrunnen, sett bakfra, mens havet reiser seg. */
        if (t > KE && t < 10.1) { const cr = kCrag(6, 30, 20, 17, 5, blend('#27485c', '#dcecff', fb[0]), t); if (cr) K.trainer(cr.x - 1.5 * cr.s, cr.y + 0.6 * cr.s, 7.4 * cr.s, { col: '#02070b', rim: blend('#3a5466', '#dcecff', fb[0]), ra: 0.85, wind: -0.9, lean: 0.06 }); }
        /* Akt 1: skyggen som glir under overflaten. Tegnene lyser sterkere og rødere for hvert slag. */
        if (a1 && t > 0.3) { const k = io(seg(t, 0.3, 4.4)); kShade(mix(300, 20, k), mix(950, 70, k), pose.k * 1.5, seg(t, 0.3, 0.9) * (1 - seg(t, 4.15, 4.6)) * (0.5 + 0.5 * bt + 0.12 * n), ['#3f8cff', '#6a7aff', '#b05ad8', '#ff5a6a'][max(0, n - 1)], 2 + t * 0.5); }
        /* Akt 2: tegnene lyser inne i bølgeveggen, større for hvert av de tre slagene. */
        const kp = wall ? K.gp(kX, kZ, wh * 0.34) : null, ws = kp ? ks0 * kp.s * (0.9 + 0.35 * kn + 0.12 * kk) : 1;
        if (lit3 && kp && kn > 0) { const a = 0.3 + 0.16 * kn + 0.6 * kk + seg(t, 9.95, KRV); K.blob(kp.x, kp.y - 40 * ws / 2, 130 * ws / 2, '#0a3a66', 0.3 * a, 1, 0.7);
          K.mon(kp.x, kp.y + 40 * kp.s, ws, { ft: 12.3, col: '#01101e', a: 0.3 + 0.1 * kn }); K.mon(kp.x, kp.y + 40 * kp.s, ws, { ft: 12.3, mask: 'red', col: kn < 3 ? '#7ab8ff' : '#ffb0a0', add: 1, a: c01(a) }); }
        /* Akt 3: Kyogre bryter ut av bølgeveggen med finnene rett opp, henger over oss og brøler, og stuper så ned over kameraet (i skjermens mål). */
        const act = K.act(t, { breath: 1.2, bp: 2.2, roar: [[KRV + 0.12, 0.95]], land: [{ t: KU + 0.34, a: 0.8 }, { t: KFN, a: 0.35 }], amp: 1 - seg(t, 13.98, 14.2) });
        if (t >= KRV && t < KD && kp) {
          const k = t - KRV, x0 = K.gp(kX, 714, 159), jx = kf(t, [[KRV, x0 ? x0.x : 270], [KRV + 0.5, 268, eo], [11.05, 256], [KD, 236, ei]]), jy = kf(t, [[KRV, x0 ? x0.y + 30 : 120], [KRV + 0.5, 322, eo], [11.05, 312], [KD, 800, ei]]), s = ks0 * kf(t, [[KRV, 0.75], [KRV + 0.5, 1.7, eo], [11.05, 1.86], [KD, 4.4, ei]]);
          const ft = t < 11.05 ? K.pp(k, 12, 12.6, 0.56) : K.clip(t, [[11.05, 10.9], [KD, 11.5]]), rr = act.r - 0.2 * (1 - seg(t, KRV, KRV + 0.55)) + 0.42 * ei(seg(t, 11.05, KD));
          kSpray(jx, jy - 60 * s / 2, 1 - k / 1.15, 320, 31, 48); K.blob(jx, jy - 80 * s / 2, 170 * s / 2, '#eaf6ff', 0.55 * hit(t, KRV, 0.4), 1);
          K.mon(jx + act.dx * s, jy + act.dy * s, s, { ft, sx: act.sx, sy: act.sy, r: rr });
          K.mon(jx + act.dx * s, jy + act.dy * s, s, { ft, mask: 'red', col: '#ff8a6a', add: 1, a: 0.9 * (0.8 + 0.2 * sin(t * 11)), sx: act.sx, sy: act.sy, r: rr });
          /* Vannet som renner av den. */
          for (let i = 0; i < 34; i++) { const ph = (k * (1.1 + rnd(i, 41)) + rnd(i, 42)) % 1, x = jx + (rnd(i, 43) - 0.5) * 96 * s, y = jy - (8 + rnd(i, 44) * 56) * s + ph * ph * 60 * s; K.rect(x, y, max(1.5, s * 0.5), (5 + ph * 14) * s * 0.4, '#dff2ff', (1 - ph) * 0.7 * (1 - seg(t, 10.95, KD)), 1); }
        }
        /* Etter dykket: Kyogre bryter flata der den ligger i kampen (opp for høyt, så ned i leiet), med vannlinja rundt kroppen. */
        if (t >= KU) {
          const fp = K.gp(KX, KZ, 0); if (fp) { const s = ks0 * fp.s, dy = kf(t, [[KU, 150], [KU + 0.32, 34, eo], [KU + 0.66, 66], [KU + 0.95, 59], [13.6, 62]]) * fp.s, fy = fp.y + dy + act.dy * s, ft = t < KFN ? K.clip(t, [[KU, tot - 1.5], [KFN, tot - 0.02]]) : (t - KFN) * 0.15;
            const line = K.seaLine(KZ, fp.x - 130 * fp.s, fp.x + 130 * fp.s, t, u, { step: 5 }), cut = K.seaCut(line, fp.x + act.dx * s, fy, s, s * act.sy);
            K.mon(fp.x + act.dx * s, fy, s, { box: 1, ft, sx: act.sx, sy: act.sy, r: act.r, fx: cut });
            K.mon(fp.x + act.dx * s, fy, s, { box: 1, ft, mask: 'red', col: '#ff6a4a', add: 1, a: kf(t, [[KU, 0.95], [13.9, 0.3]]) * (0.75 + 0.25 * sin(t * 3.1)), sx: act.sx, sy: act.sy, r: act.r, fx: cut });
            K.seaFoam(line, { a: 0.62 + 0.4 * hit(t, KU, 1), w: 0.8, size: 6.5 * fp.s, up: 18 + 60 * hit(t, KU, 0.8), seed: 93 });
            kSpray(fp.x, fp.y - 10, 1 - (t - KU) / 0.9, 210 * fp.s, 57, 40); }
        }
        ARENA.front(382, S);
        /* Kameraet til bildet: risting, blink, sjokkbølgen der den bryter ut, og buler i bølgeveggen på de tre slagene. */
        const sk = []; if (kp && t >= KRV && t < KRV + 1.1) sk.push({ x: kp.x, y: kp.y - 40, r: (t - KRV) * 560, w: 36, a: 22 * (1 - seg(t, KRV, KRV + 1.1)) });
        if (t >= KU && t < KU + 0.8) { const fp = K.gp(KX, KZ, 0); if (fp) sk.push({ x: fp.x, y: fp.y, r: (t - KU) * 380, w: 22, a: 12 * (1 - seg(t, KU, KU + 0.8)), sy: 0.35 }); }
        P.shock = sk; if (lit3 && kp && kk > 0) P.bulge = { x: kp.x, y: kp.y - 30, r: 190, a: 0.2 * kk };
        P.bars = a1 ? 1 : 1 - seg(t, KE, KE + 0.3);
        P.sh = (P.sh || 0) + (a1 ? bt * 2 + roll * 5 : 0) + hit(t, KE, 1.1) * 11 + hits(t, KL, 0.5) * 5 + kk * 5 + hit(t, KRV, 1) * 12 + (t < KD ? seg(t, 11, KD) * 9 : 0) + hit(t, KU, 0.6) * 7 + hit(t, KFN, 0.4) * 3 + (t >= KRV - 0.4 ? act.sh : 0);
        P.fl = max(hit(t, KE, 0.3) * 0.55, hit(t, KRV, 0.28) * 0.45, t < KD ? seg(t, KD - 0.16, KD) * 0.95 : 0, hit(t, KU, 0.4) * 0.8, hit(t, KFN, 0.25) * 0.2); P.fc = '#e4f2ff'; P.fade = 1 - seg(t, 0, 0.6);
        if (t >= KU) P.wav = 2.6 * (1 - seg(t, KU, KU + 0.7));
        P.z = mix(1, pose.cz, io(seg(t, 13.1, 13.7))); P.zx = 230.4; P.zy = 307.2;
        K.plate(KU + 0.1, { mat: 'water', col: '#5aa8ff' });
      }
    }
  });
})();
