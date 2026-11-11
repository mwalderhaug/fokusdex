'use strict';
/* Fokusdex – viser opptakene fra EBX (ebx.js) i kampskjermen.
   Et opptak er en liste med bilder. Hvert bilde sier hvilke sprites som skal tegnes hvor, hvor kameraet står, og hvordan de to Pokémonene
   skal stå, lyse og farges. Her gjøres det om til det som faktisk synes:
   - effektene tegnes med WebGL i tre lag: bak begge Pokémonene, mellom dem og foran. Pokémonene selv er fortsatt de vanlige bildene i kampskjermen
   - kameraet flytter og forstørrer banen (og Pokémonene følger med), akkurat som vektoren i EBDX
   - Pokémonene flyttes, skaleres og farges (hvitt glimt ved treff, farget skjær ved status) med et fargefilter
   Bildene effektene bruker, kommer fra ressurspakken (P.source settes av pack.js). */
const EBXP = (() => {
  const P = { ok: false, source: null, err: '' };
  const W = 512, H = 384, STR = EBX.STR, RS = EBX.ROOM_SCALE, D = EBX.spoof(EBX.VEC.MAIN);
  let cv = null, gl = null, U = null, lost = false, white = null, sc = 2;
  let c0 = null, c1 = null, g0 = null, g1 = null, d0 = false, d1 = false, svg = null;
  const texs = new Map(), imgs = new Map(), jobs = new Map();
  let texBytes = 0, cur = null, holdT = 0;

  /* ---------- WebGL ---------- */
  const VS = 'attribute vec2 a;uniform vec2 uO,uX,uY;uniform vec4 uUV;varying vec2 v;void main(){vec2 p=uO+a.x*uX+a.y*uY;gl_Position=vec4(p.x/256.0-1.0,1.0-p.y/192.0,0.0,1.0);v=uUV.xy+a*uUV.zw;}';
  /* Samme rekkefølge som spillmotoren bruker på en sprite: gråtone, tone (legges til), dekkevne, og til slutt blanding mot fargen.
     Teksturene ligger med fargene ganget med dekkevnen, så kantene ikke får mørke render når de forstørres. */
  const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;uniform sampler2D t;uniform vec4 uT,uC;uniform vec3 uP;
vec3 toHsv(vec3 c){vec4 K=vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.0*d+1.0e-10)),d/(q.x+1.0e-10),q.x);}
vec3 toRgb(vec3 c){vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);}
void main(){
  vec2 q=uP.y>0.5?fract(v):v;
  vec4 c=texture2D(t,q);
  vec3 k=c.a>0.0?c.rgb/c.a:vec3(0.0);
  if(uP.z!=0.0){vec3 h=toHsv(k);h.x=fract(h.x+uP.z);k=toRgb(h);}
  float g=dot(k,vec3(0.299,0.587,0.114));
  k=mix(k,vec3(g),uT.a)+uT.rgb;
  k=mix(clamp(k,0.0,1.0),uC.rgb,uC.a);
  float al=c.a*uP.x;
  gl_FragColor=vec4(k*al,al);
}`;
  function glInit() {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
    const pg = gl.createProgram(); gl.attachShader(pg, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pg, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pg) || 'link');
    gl.useProgram(pg);
    U = {}; for (const n of ['uO', 'uX', 'uY', 'uUV', 'uT', 'uC', 'uP', 't']) U[n] = gl.getUniformLocation(pg, n);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(U.t, 0); gl.activeTexture(gl.TEXTURE0);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, white); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])); texParams();
    P.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
  }
  const texParams = () => { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
  /* Lager lerretet og WebGL-konteksten én gang. Samme lerret flyttes inn i hver nye kampskjerm, så teksturene overlever fra kamp til kamp. */
  function setup() {
    if (cv) return !!gl && !lost;
    cv = document.createElement('canvas'); cv.className = 'fxc ebx'; cv.id = 'ebx2';
    try {
      gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
      if (!gl) throw new Error('no webgl');
      glInit();
    } catch (e) { P.err = String(e && e.message || e); gl = null; return false; }
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; texs.clear(); texBytes = 0; if (cur) finish(cur); });
    cv.addEventListener('webglcontextrestored', () => { try { glInit(); lost = false; } catch (_) { gl = null; } });
    c0 = document.createElement('canvas'); c0.className = 'fxc ebx'; c0.id = 'ebx0'; g0 = c0.getContext('2d');
    c1 = document.createElement('canvas'); c1.className = 'fxc ebx'; c1.id = 'ebx1'; g1 = c1.getContext('2d');
    return true;
  }
  function mkTex(src, w, h) {
    let s = src;
    if (w > P.maxTex || h > P.maxTex) { const k = Math.min(P.maxTex / w, P.maxTex / h), c = document.createElement('canvas'); c.width = Math.max(1, Math.floor(w * k)); c.height = Math.max(1, Math.floor(h * k)); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); s = c; }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s); texParams();
    return t;
  }
  /* Teksturen til et bilde fra pakken. De ligger i minnet til det blir for mye; da ryker de som er lengst siden var i bruk. */
  function texOf(name) {
    let e = texs.get(name);
    if (!e) { const im = imgs.get(name); if (!im) return null; e = { t: mkTex(im, im.width, im.height), w: im.width, h: im.height, at: 0 }; texs.set(name, e); texBytes += e.w * e.h * 4; }
    e.at = performance.now(); return e;
  }
  function trim(keep) {
    if (texBytes < 96e6) return;
    const l = [...texs.entries()].filter(x => !keep.has(x[0])).sort((a, b) => a[1].at - b[1].at);
    for (const [n, e] of l) { if (texBytes < 64e6) break; gl.deleteTexture(e.t); texs.delete(n); texBytes -= e.w * e.h * 4; }
  }

  /* ---------- Bildene ---------- */
  /* Henter et bilde fra pakken (én gang). Gir null hvis det ikke finnes. */
  function image(name) {
    if (imgs.has(name)) return Promise.resolve(imgs.get(name));
    if (!jobs.has(name)) jobs.set(name, Promise.resolve(P.source ? P.source(name) : null).catch(() => null).then(im => { jobs.delete(name); if (im) imgs.set(name, im); return im || null; }));
    return jobs.get(name);
  }
  /* Henter bildene til en animasjon på forhånd, så den er klar når angrepet brukes. */
  P.warm = key => { const l = EBX.imagesOf(key); return Promise.all(l.map(image)).then(a => a.every(Boolean)); };
  P.warmed = key => EBX.imagesOf(key).every(n => imgs.has(n));
  /* Bilder som animasjonen tegner selv (ensfargede flater, sirkler, sammensatte bilder) bygges på et eget lerret etter oppskriften i opptaket. */
  const css = c => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
  function hueShift(g, w, h, deg) {
    const d = g.getImageData(0, 0, w, h), p = d.data, sh = ((deg % 360) + 360) % 360 / 360;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i] / 255, gr = p[i + 1] / 255, b = p[i + 2] / 255, mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), dl = mx - mn;
      let hh = 0; if (dl > 0) { hh = mx === r ? ((gr - b) / dl) % 6 : mx === gr ? (b - r) / dl + 2 : (r - gr) / dl + 4; hh /= 6; if (hh < 0) hh += 1; }
      const s = mx ? dl / mx : 0, hv = (hh + sh) % 1, f = k => { const n = (k + hv * 6) % 6; return mx - mx * s * Math.max(0, Math.min(n, 4 - n, 1)); };
      p[i] = Math.round(f(5) * 255); p[i + 1] = Math.round(f(3) * 255); p[i + 2] = Math.round(f(1) * 255);
    }
    g.putImageData(d, 0, 0);
  }
  function build(rec, id, ver, depth) {
    const key = id + ':' + ver, b = rec.bmps[id], ops = rec.vers[key];
    if (!ops) return imgs.get(b.img) || null;
    const hit = rec.cvs.get(key); if (hit) return hit;
    const c = document.createElement('canvas'); c.width = b.w; c.height = b.h; rec.cvs.set(key, c);
    const g = c.getContext('2d');
    for (const o of ops) {
      switch (o[0]) {
        case 'img': { const im = imgs.get(b.img); if (im) g.drawImage(im, 0, 0); break; }
        case 'cl': g.clearRect(0, 0, b.w, b.h); break;
        case 'fr': g.clearRect(o[1], o[2], o[3], o[4]); g.fillStyle = css(o[5]); g.fillRect(o[1], o[2], o[3], o[4]); break;
        case 'bl': { const s = depth < 6 ? build(rec, o[3], o[4], depth + 1) : null; if (s && o[7] > 0 && o[8] > 0) { g.globalAlpha = o[9]; g.drawImage(s, o[5], o[6], o[7], o[8], o[1], o[2], o[7], o[8]); g.globalAlpha = 1; } break; }
        case 'sb': { const s = depth < 6 ? build(rec, o[5], o[6], depth + 1) : null; if (s && o[9] > 0 && o[10] > 0) { g.globalAlpha = o[11]; g.drawImage(s, o[7], o[8], o[9], o[10], o[1], o[2], o[3], o[4]); g.globalAlpha = 1; } break; }
        case 'ci': { g.fillStyle = g.strokeStyle = css(o[1]); g.beginPath(); g.arc(o[3], o[4], Math.max(0.5, o[2] - (o[5] ? 0.5 : 0)), 0, 6.2832); if (o[5]) g.stroke(); else g.fill(); break; }
        case 'hu': hueShift(g, b.w, b.h, o[1]); break;
      }
    }
    return c;
  }
  /* Gjør opptaket klart til å vises: teksturer for alle bilder det bruker. Gir false hvis noe mangler. */
  function prepare(rec) {
    if (rec.tx) return true;
    if (!gl || lost) return false;
    for (const n of rec.uses) if (!imgs.has(n)) return false;
    rec.cvs = new Map(); const tx = new Map(), own = [], sig = new Map();
    try {
      for (const fr of rec.frames) for (let i = 0, d = fr.s; i < fr.n; i++) {
        const id = d[i * STR], ver = d[i * STR + 1], k = id * 65536 + ver; if (tx.has(k)) continue;
        const b = rec.bmps[id], ops = rec.vers[id + ':' + ver];
        if (!ops) { const e = texOf(b.img); tx.set(k, e || null); continue; }
        const s = b.w + 'x' + b.h + JSON.stringify(ops) + (ops.some(o => o[0] === 'img') ? b.img : '');
        let e = sig.get(s);
        if (!e) { const c = build(rec, id, ver, 0); e = c ? { t: mkTex(c, b.w, b.h), w: b.w, h: b.h } : null; if (e) own.push(e.t); sig.set(s, e); }
        tx.set(k, e);
      }
    } catch (e) { P.err = String(e && e.message || e); for (const t of own) gl.deleteTexture(t); rec.cvs = null; return false; }
    rec.cvs = null; rec.tx = tx; rec.own = own;
    trim(new Set(rec.uses));
    return true;
  }

  /* ---------- Tegningen ---------- */
  const RAD = Math.PI / 180;
  function range(rec, fr, from, to, vc) {
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const d = fr.s; let last = null;
    for (let i = from; i < to; i++) {
      const o = i * STR, e = rec.tx.get(d[o] * 65536 + d[o + 1]); if (!e) continue;
      if (e.t !== last) { gl.bindTexture(gl.TEXTURE_2D, e.t); last = e.t; }
      const sw = d[o + 4], sh = d[o + 5], zx = d[o + 10], zy = d[o + 11];
      if (d[o + 25]) {
        /* En flate som fliselegger bildet over hele skjermen og ruller med ox og oy. */
        const tw = e.w * (zx || 1), th = e.h * (zy || 1), u0 = d[o + 8] / tw, v0 = d[o + 9] / th;
        gl.uniform2f(U.uO, 0, 0); gl.uniform2f(U.uX, W, 0); gl.uniform2f(U.uY, 0, H);
        gl.uniform4f(U.uUV, u0 - Math.floor(u0), v0 - Math.floor(v0), W / tw, H / th);
      } else {
        const an = d[o + 12] * RAD, cs = an ? Math.cos(an) : 1, sn = an ? Math.sin(an) : 0, ox = d[o + 8] * zx, oy = d[o + 9] * zy;
        gl.uniform2f(U.uO, d[o + 6] - ox * cs - oy * sn, d[o + 7] + ox * sn - oy * cs);
        gl.uniform2f(U.uX, sw * zx * cs, -sw * zx * sn); gl.uniform2f(U.uY, sh * zy * sn, sh * zy * cs);
        /* Et utsnitt av et ark trekkes en halv piksel inn, så naboruta ikke siver inn i kanten. */
        const part = sw < e.w || sh < e.h, ix = part ? 0.5 : 0, u0 = (d[o + 2] + ix) / e.w, du = (sw - 2 * ix) / e.w;
        gl.uniform4f(U.uUV, d[o + 13] ? u0 + du : u0, (d[o + 3] + ix) / e.h, d[o + 13] ? -du : du, (sh - 2 * ix) / e.h);
      }
      gl.uniform4f(U.uT, d[o + 15] / 255, d[o + 16] / 255, d[o + 17] / 255, d[o + 18] / 255);
      gl.uniform4f(U.uC, d[o + 19] / 255, d[o + 20] / 255, d[o + 21] / 255, d[o + 22] / 255);
      gl.uniform3f(U.uP, d[o + 14] / 255, d[o + 25], d[o + 24] / 360);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    /* Skjermfargen (glimt over hele bildet) ligger øverst. */
    if (vc) {
      gl.bindTexture(gl.TEXTURE_2D, white);
      gl.uniform2f(U.uO, 0, 0); gl.uniform2f(U.uX, W, 0); gl.uniform2f(U.uY, 0, H); gl.uniform4f(U.uUV, 0, 0, 1, 1);
      gl.uniform4f(U.uT, 0, 0, 0, 0); gl.uniform4f(U.uC, vc[0] / 255, vc[1] / 255, vc[2] / 255, 1); gl.uniform3f(U.uP, vc[3], 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  const copy = (g, c) => { g.clearRect(0, 0, c.width, c.height); g.drawImage(cv, 0, 0); };
  function drawFx(rec, fr) {
    /* De to lagene bak tegnes først og kopieres over på hvert sitt lerret. Det forreste laget blir stående på WebGL-lerretet. */
    if (fr.n0 > 0) { range(rec, fr, 0, fr.n0, null); copy(g0, c0); d0 = true; } else if (d0) { g0.clearRect(0, 0, c0.width, c0.height); d0 = false; }
    if (fr.n1 > fr.n0) { range(rec, fr, fr.n0, fr.n1, null); copy(g1, c1); d1 = true; } else if (d1) { g1.clearRect(0, 0, c1.width, c1.height); d1 = false; }
    range(rec, fr, fr.n1, fr.n, fr.vc);
  }
  function wipe() {
    if (gl && !lost) { gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    if (g0) { g0.clearRect(0, 0, c0.width, c0.height); g1.clearRect(0, 0, c1.width, c1.height); } d0 = d1 = false;
  }

  /* ---------- Kampskjermen ---------- */
  /* Fargefilteret til en Pokémon: samme regnestykke som for sprites, skrevet som en matrise. Annenhver gang brukes et nytt filter,
     for noen nettlesere tegner ikke bildet på nytt når bare tallene i et filter endres. */
  function ensureSvg() {
    if (svg && svg.isConnected) return;
    const ns = 'http://www.w3.org/2000/svg'; svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    for (const id of ['me0', 'me1', 'foe0', 'foe1']) {
      const f = document.createElementNS(ns, 'filter'), m = document.createElementNS(ns, 'feColorMatrix');
      f.setAttribute('id', 'ebxf-' + id); f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', '1'); f.setAttribute('height', '1'); f.setAttribute('color-interpolation-filters', 'sRGB');
      m.setAttribute('type', 'matrix'); m.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0'); f.appendChild(m); svg.appendChild(f);
    }
    document.body.appendChild(svg);
  }
  const f3 = x => (Math.round(x * 1000) / 1000).toString();
  function tint(D, b) {
    const im = D.img; if (!im) return;
    const tr = b[9] / 255, tg = b[10] / 255, tb = b[11] / 255, y = b[12] / 255, ca = b[16] / 255;
    if (Math.abs(b[9]) < 0.5 && Math.abs(b[10]) < 0.5 && Math.abs(b[11]) < 0.5 && b[12] < 0.5 && b[16] < 0.5) { if (D.fk) { im.style.removeProperty('filter'); D.fk = ''; } return; }
    const k = 1 - ca, a = k * (1 - y), l0 = k * y * 0.299, l1 = k * y * 0.587, l2 = k * y * 0.114;
    const v = [a + l0, l1, l2, 0, k * tr + ca * b[13] / 255, l0, a + l1, l2, 0, k * tg + ca * b[14] / 255, l0, l1, a + l2, 0, k * tb + ca * b[15] / 255, 0, 0, 0, 1, 0].map(f3).join(' ');
    if (v === D.fk) return;
    D.fk = v; D.fi ^= 1;
    const id = 'ebxf-' + D.side + D.fi, m = svg.querySelector('#' + id + ' feColorMatrix');
    m.setAttribute('values', v); im.style.setProperty('filter', `url(#${id})`, 'important');
  }
  /* Speiler banebildet utover kantene. Kameraet i EBDX ser et godt stykke utenfor det bildet som fyller skjermen i ro. */
  function widen(ar) {
    const w = ar.querySelector('#world'), im = w && w.querySelector('img.scene');
    if (!w || !im || w.querySelector('.scx') || !im.complete || !im.naturalWidth) return !!(w && w.querySelector('.scx'));
    const c = document.createElement('canvas'), nw = im.naturalWidth, nh = im.naturalHeight; c.className = 'scx'; c.width = nw * 3; c.height = nh * 3;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    try { for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { g.save(); g.translate(i === 1 ? nw : i ? nw * 3 : nw, j === 1 ? nh : j ? nh * 3 : nh); g.scale(i === 1 ? 1 : -1, j === 1 ? 1 : -1); g.drawImage(im, 0, 0); g.restore(); } } catch (_) { return false; }
    w.insertBefore(c, w.firstChild); return true;
  }
  /* Setter lerretene inn i kampskjermen: ett bak begge Pokémonene, ett mellom dem og ett foran. */
  P.attach = ar => {
    if (!ar || !EBX.ok || !setup()) return false;
    const foe = ar.querySelector('#s-foe'), me = ar.querySelector('#s-me'); if (!foe || !me) return false;
    if (cur) finish(cur);
    sc = Math.max(1, Math.min(2, Math.ceil(ar.clientWidth * (window.devicePixelRatio || 1) / W * 2) / 2));
    for (const c of [cv, c0, c1]) { if (c.width !== W * sc) { c.width = W * sc; c.height = H * sc; } }
    ar.insertBefore(c0, foe); ar.insertBefore(c1, me); me.after(cv);
    wipe(); ensureSvg();
    return true;
  };
  P.on = () => !!(EBX.ok && gl && !lost && cv && cv.isConnected);
  /* Kan animasjonene vises på denne enheten? (Trenger WebGL.) */
  P.able = () => setup();
  /* Hvor en Pokémon står (føttene) og hvor stort bildet er, i EBDX sine 512 × 384. z0 er forstørrelsen EBDX ville brukt for å få samme størrelse. */
  function geom(ar, side) {
    const el = ar.querySelector('#s-' + side), im = el && el.querySelector('img.spr'), k = ar.clientWidth / W;
    if (!el) return null;
    /* Størrelsen følger det kampskjermen har satt: --k per Pokémon (høyden i Pokédexen) og --cz for kameraet. */
    const z = (parseFloat(getComputedStyle(ar).getPropertyValue('--z')) || ar.clientWidth / 256 * 0.8) * (parseFloat(el.style.getPropertyValue('--k')) || (side === 'me' ? 1.9 : 1)) * (parseFloat(ar.style.getPropertyValue('--cz')) || 1.1) / k;
    const nw = im && im.naturalWidth ? im.naturalWidth : 96, nh = im && im.naturalHeight ? im.naturalHeight : 96;
    return { x: el.offsetLeft / k, y: el.offsetTop / k, w: nw * z, h: nh * z, z0: z / 2 };
  }
  /* Gjør et opptak for kampskjermen slik den står nå. side = hvem som bruker angrepet ('me' eller 'foe'); o.self = angrepet gjelder brukeren selv. */
  P.record = (key, side, o = {}) => {
    const ar = document.getElementById('arena'); if (!ar || !P.on()) return null;
    const me = geom(ar, 'me'), foe = geom(ar, 'foe'); if (!me || !foe) return null;
    const u = side === 'me' ? 0 : 1, t = o.self ? u : 1 - u, ix = s => s === 'me' ? 0 : 1;
    const hide = [false, false], keep = [false, false];
    for (const s of o.hide || []) hide[ix(s)] = true; for (const s of o.keep || []) keep[ix(s)] = true;
    const rec = EBX.record(key, { me, foe, user: u, target: t, hitNum: o.hitNum || 0, multiHit: !!o.multiHit, args: o.args || [], hide, keep });
    if (rec) rec.side = side;
    return rec;
  };
  /* Henter bildene opptaket trenger og lager teksturene. Gir false hvis de ikke kom i tide. */
  P.load = async (rec, ms) => {
    if (!rec || !P.on()) return false;
    const all = Promise.all(rec.uses.map(image));
    await Promise.race([all, new Promise(r => setTimeout(r, ms == null ? 1500 : ms))]);
    return prepare(rec);
  };
  P.ready = rec => !!rec && P.on() && prepare(rec);

  function domOf(ar, side, i, rec) {
    const el = ar.querySelector('#s-' + side), sb = el && el.querySelector('.sprb'), im = sb && sb.querySelector('img.spr');
    return { side, el, sb, img: im, fk: '', fi: 0, tk: '', rest: rec.rest[i], vis: true };
  }
  function pose(D, b, k) {
    const sb = D.sb; if (!sb || !b) return;
    const r = D.rest, dx = (b[0] - r[0]) * k, dy = (b[1] - r[1]) * k, sx = b[4] / r[2], sy = b[5] / r[2], lx = -(b[2] - r[3]) * r[2] * k, ly = -(b[3] - r[4]) * r[2] * k;
    const idt = Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(sx - 1) < 0.002 && Math.abs(sy - 1) < 0.002 && !lx && !ly && !b[6] && !b[7];
    const t = idt ? '' : `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)${b[6] ? ` rotate(${(-b[6]).toFixed(1)}deg)` : ''} scale(${(b[7] ? -sx : sx).toFixed(3)},${sy.toFixed(3)})${lx || ly ? ` translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px)` : ''}`;
    if (t !== D.tk) { sb.style.transform = t; D.tk = t; }
    const op = b[8] / 255;
    if (op !== D.op) { D.op = op; sb.style.opacity = op >= 1 ? '' : op.toFixed(3); sb.style.visibility = op <= 0 ? 'hidden' : ''; }
    tint(D, b);
  }
  function camera(C, fr, k) {
    const w = C.world; if (!w) return;
    let sx = fr.room[2] / RS, sy = fr.room[3] / RS, tx = fr.room[0] - D[0] * sx, ty = fr.room[1] - D[1] * sy;
    /* Uten banebilde finnes det ikke noe utenfor kantene: da holdes bakgrunnen innenfor skjermen. */
    if (!C.wide) { sx = Math.max(1, sx); sy = Math.max(1, sy); tx = Math.min(0, Math.max(W * (1 - sx), tx)); ty = Math.min(0, Math.max(H * (1 - sy), ty)); }
    const idt = Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001 && Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05;
    const t = idt ? '' : `translate(${(tx * k).toFixed(1)}px,${(ty * k).toFixed(1)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
    if (t !== C.wk) { w.style.transform = t; C.wk = t; }
  }
  function show(C, i) {
    const rec = C.rec, fr = rec.frames[i];
    C.i = i;
    camera(C, fr, C.k); pose(C.me, fr.b[0], C.k); pose(C.foe, fr.b[1], C.k);
    if (!lost) drawFx(rec, fr);
  }
  /* Rydder opp etter en avspilling: banen og Pokémonene settes tilbake, og lerretene tømmes. En Pokémon som skal være borte, blir stående skjult. */
  function finish(C) {
    if (C.done) return; C.done = true;
    if (cur === C) cur = null;
    cancelAnimationFrame(C.raf);
    if (C.world) C.world.style.transform = '';
    C.ar.classList.remove('ebx-on');
    [C.me, C.foe].forEach((d, i) => {
      if (!d.sb) return;
      d.sb.style.transform = ''; d.sb.style.opacity = '';
      d.sb.style.visibility = C.rec.gone[i] ? 'hidden' : '';
      if (d.img) d.img.style.removeProperty('filter');
    });
    wipe();
    const rec = C.rec; if (rec.own && gl && !lost) for (const t of rec.own) gl.deleteTexture(t); rec.own = null; rec.tx = null;
    for (const m of C.marks) m.r(); C.marks = [];
    C.res();
  }
  /* Spiller av et opptak. rate = hvor fort (1 = EBDX sine 40 bilder i sekundet). Gir { done, at(i) }: løfter som holder til slutten og til bilde i. */
  P.play = (rec, rate) => {
    const ar = document.getElementById('arena');
    if (!ar || !P.ready(rec)) return null;
    if (cur) finish(cur);
    let res; const done = new Promise(r => { res = r; });
    const C = cur = { rec, ar, res, marks: [], k: ar.clientWidth / W, world: ar.querySelector('#world'), wide: widen(ar), wk: '', t: 0, last: 0, i: -1, done: false, raf: 0 };
    C.me = domOf(ar, 'me', 0, rec); C.foe = domOf(ar, 'foe', 1, rec);
    for (const d of [C.me, C.foe]) if (d.sb) d.sb.style.visibility = '';
    ar.classList.add('ebx-on');
    const fps = C.fps = 40 * (rate || 1);
    show(C, 0);
    const step = ts => {
      if (C.done) return;
      if (!ar.isConnected || !cv.isConnected) return finish(C);
      const dt = C.last ? Math.min(100, ts - C.last) : 0; C.last = ts;
      if (ts >= holdT) C.t += dt;
      const i = Math.min(rec.n - 1, Math.floor(C.t / 1000 * fps));
      if (i !== C.i) show(C, i);
      if (C.marks.length) C.marks = C.marks.filter(m => m.i > i || (m.r(), false));
      if (i >= rec.n - 1) return finish(C);
      C.raf = requestAnimationFrame(step);
    };
    C.raf = requestAnimationFrame(step);
    return { done, at: i => C.done || C.i >= i ? Promise.resolve() : new Promise(r => C.marks.push({ i, r })), stop: () => finish(C) };
  };
  /* Alt står stille et øyeblikk (treff-stoppet). */
  P.hold = ms => {
    holdT = performance.now() + ms;
    /* Kampskjermens eget hvite glimt skal synes mens alt står stille, så fargefilteret tas av til neste bilde. */
    if (cur) for (const d of [cur.me, cur.foe]) if (d.img && d.fk) { d.img.style.removeProperty('filter'); d.fk = ''; }
  };
  P.stop = () => { if (cur) finish(cur); };
  /* Tegner alle bildene i et opptak så fort det går og sier fra om feil (til feilsøking og fartsmåling). */
  P.bench = (rec, step) => {
    if (!prepare(rec)) return { err: 'not ready ' + P.err };
    const t0 = performance.now(); let n = 0;
    for (let i = 0; i < rec.n; i += step || 1) { const fr = rec.frames[i]; drawFx(rec, fr); n += fr.n; }
    gl.finish(); const e = gl.getError(), ms = performance.now() - t0, tx = rec.tx.size, nul = [...rec.tx.values()].filter(x => !x).length;
    wipe(); if (rec.own) for (const t of rec.own) gl.deleteTexture(t); rec.own = null; rec.tx = null;
    return { ms, frames: rec.n, sprites: n, tx, nul, glerr: e };
  };
  /* Hopper til et bestemt bilde i animasjonen som spiller (til feilsøking). */
  P.seek = i => { if (cur) { cur.t = (i + 0.5) / cur.fps * 1000; show(cur, Math.max(0, Math.min(cur.rec.n - 1, i))); } };
  P.playing = () => !!cur;
  /* Henter fram en Pokémon som en animasjon lot stå skjult (den som fløy opp, den som ble byttet ut). */
  P.unhide = side => { const sb = document.querySelector('#s-' + side + ' .sprb'); if (sb) sb.style.visibility = ''; };
  return P;
})();
