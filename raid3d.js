'use strict';
/* Fokusdex – cutscener i 3D: motoren (G3D). Cutscenene selv ligger i raid3c.js.
   three.js og modellene er IKKE en del av appen: de ligger i ressurspakken (3d/g3d.js og 3d/<navn>.glb) og hentes først når en cutscene skal
   spilles. pack.js setter G3D.src når pakken har dem. Uten pakke (eller uten WebGL 2) finnes det ingen cutscene, og sprite-filmen spilles som før.
   Stilen er den fra DS-spillene: alt tegnes i 256 × 192 uten kantutjevning og skaleres opp med skarpe piksler. Lyset har to–tre harde toner,
   figurer og nære ting får mørk kontur, og motlyset er sterkt. Omgivelsene og effektene tegnes i samme pass og samme oppløsning som figuren.
   Hver cutscene er en ren funksjon av tiden (som filmene i raid.js): ingen tilstand mellom bildene, så den kan spoles, hoppes over og følge låta.
   Bildet: scenen → et lerret i minnet med farge + nummer per ting (alfa) + dybde → ett etterpass (kontur, risting i hele piksler, blink,
   fartsstreker, virvel, femten bits farger) → appens 2D-lerret. */
const G3D = (() => {
  const G = { W: 256, H: 192, src: null, err: '', dead: 0, out: 0 };   /* out (0..1): virvelen ut av cutscenen, satt av avspilleren når spilleren trykker Continue */
  const sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2, abs = Math.abs, max = Math.max, min = Math.min, floor = Math.floor;
  const c01 = x => x < 0 ? 0 : x > 1 ? 1 : x, mix = (a, b, k) => a + (b - a) * k, seg = (t, a, b) => c01((t - a) / (b - a));
  const io = k => k * k * (3 - 2 * k), eo = k => 1 - (1 - k) * (1 - k) * (1 - k), ei = k => k * k * k;
  /* Tyngde: back går forbi målet og faller på plass (overskudd), spring er en dempet fjær (noe tungt som lander og dirrer ut),
     ant trekker seg først litt motsatt vei (forvarsel) før den går til 1. hit er et slag som dør ut. */
  const back = (k, s) => { s = s == null ? 1.70158 : s; k = c01(k) - 1; return k * k * ((s + 1) * k + s) + 1; };
  const spring = (k, f, d) => k <= 0 ? 0 : 1 - Math.exp(-(d || 5) * k) * cos((f || 9) * k);
  const ant = (k, a) => { k = c01(k); a = a == null ? 0.18 : a; return k < 0.3 ? -a * sin(k / 0.3 * PI) : io((k - 0.3) / 0.7); };
  const hit = (t, t0, d) => t < t0 ? 0 : max(0, 1 - (t - t0) / (d || 0.4));
  const rnd = (i, s) => { const x = sin(i * 127.1 + (s || 0) * 311.7 + 0.5) * 43758.5453; return x - floor(x); };
  const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  let T = null, R = null, cv = null, rt = null, post = null, postScene = null, postCam = null, cam = null, bootJob = null, U = null;

  /* ---------- GLSL ---------- */
  const COMMON = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hs(float q){ return fract(sin(q) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); float n = i.x + i.y * 57. + i.z * 113.;
  return mix(mix(mix(hs(n), hs(n + 1.), f.x), mix(hs(n + 57.), hs(n + 58.), f.x), f.y), mix(mix(hs(n + 113.), hs(n + 114.), f.x), mix(hs(n + 170.), hs(n + 171.), f.x), f.y), f.z); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 3; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float bayer(vec2 p){ vec2 q = floor(mod(p, 4.)); int i = int(q.x) + int(q.y) * 4; float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.); return (m[i] + .5) / 16.; }
uniform float uTime, uLavaY, uGlow, uGlowH, uRimK; uniform vec3 uKey, uKeyC, uShC, uRim, uRimC, uLavaC, uFogC, uFog;
vec3 fogged(vec3 c, vec3 w){ float f = clamp((length(cameraPosition - w) - uFog.x) / (uFog.y - uFog.x), 0., 1.); f = floor(f * 6. + .5) / 6.; return mix(c, uFogC, f * uFog.z); }
float tone3(float d, float a, float b){ return step(a, d) * .5 + step(b, d) * .5; }
/* Gløden nedenfra: flater som vender ned mot lavaen, sterkest nær den, i fire trinn. */
float under(vec3 N, vec3 w, float bias){ float g = clamp(-N.y * 1.2 + bias, 0., 1.) * clamp(1. - (w.y - uLavaY) / uGlowH, 0., 1.); return floor(g * 4. + .5) / 4.; }
`;
  const VS = `varying vec3 vW; varying vec2 vUv; varying float vG; attribute float aG;
void main(){ vUv = uv; vG = aG; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  /* Figuren: skinnet, tre toner, kantlys bakfra, glød nedenfra, steinhud (uStone) og glødende sømmer (uCrack). */
  const VS_FIG = `#include <common>
#include <skinning_pars_vertex>
varying vec3 vW, vN, vO; varying vec2 vUv; uniform vec2 uUvOff; uniform float uOs;
void main(){ vUv = uv + uUvOff; vO = vec3(position.x, position.z, -position.y) * uOs;
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 w = modelMatrix * vec4(transformed, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * objectNormal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FS_FIG = `varying vec3 vW, vN, vO; varying vec2 vUv; uniform sampler2D map;
uniform float uId, uStone, uCrack, uCrackR, uSeam, uSeamOn, uEmis, uFlK, uB1, uB2, uCut, uMask; uniform vec3 uCrackC, uCrackO, uFlC, uStoneC, uMul; uniform vec2 uTx; uniform float uVor;
${COMMON}
vec2 fcell(vec2 c){ return vec2(h21(c), h21(c + 17.3)); }
float fedge(vec2 x){ vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), r = g + fcell(n + g) - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
  md = 8.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 g = mg + vec2(float(i), float(j)), r = g + fcell(n + g) - f; if (dot(mr - r, mr - r) > .00001) md = min(md, dot(.5 * (mr + r), normalize(r - mr))); }
  return md; }
void main(){
  if (vW.y < uCut) discard;
  vec4 tx = texture2D(map, vUv); vec3 base = tx.rgb; float lum = dot(base, vec3(.3, .59, .11));
  if (uMask > .5) { float m = max(tx.r, max(tx.g, tx.b)); if (m < .35) discard; gl_FragColor = vec4(uCrackC * (.7 + .5 * m) * uCrack, uId / 255.); return; }
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 V = normalize(cameraPosition - vW);
  float lm = lum; if (uSeamOn > .5 && uCrack > 0.) { for (int i = 0; i < 4; i++) { vec2 o = (i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.)) * uTx; lm = min(lm, dot(texture2D(map, vUv + o).rgb, vec3(.3, .59, .11))); } }
  float seam = (1. - smoothstep(uSeam - .05, uSeam + .05, lm)) * uSeamOn;
  float st = step(vn3(vO * .42) * .8 + vn3(vO * 1.7) * .2, uStone * 1.3 - .15);
  base = mix(base, uStoneC * (.4 + lum * 1.05), st) * uMul;
  float d = dot(N, uKey), tn = tone3(d, uB1, uB2);
  vec3 col = base * mix(uShC, uKeyC, tn);
  col += uLavaC * under(N, vW, .25) * uGlow * (.3 + .7 * base);
  float rim = step(.56, (1. - max(dot(N, V), 0.)) * (dot(N, uRim) * .5 + .5));
  col = mix(col, uRimC * (.55 + .6 * base), rim * uRimK);
  col = mix(col, base * 1.25, uEmis);
  float fr = step(distance(vO, uCrackO) + (vn3(vO * 2.3) - .5) * 1.6, uCrackR);
  float vc = 0.; if (uVor > 0. && uCrack > 0. && uSeamOn > .5) { vec2 q = vec2(vO.x + vO.z * .55, vO.y + vO.z * .35) * .58; q += (vec2(vn(q * 2.3), vn(q * 2.3 + 9.)) - .5) * .55; vc = (1. - smoothstep(.03, .07, fedge(q))) * uVor; }
  col = mix(col, uCrackC, max(seam, vc) * fr * uCrack);
  col = mix(col, uFlC, uFlK);
  gl_FragColor = vec4(fogged(col, vW), uId / 255.);
}`;
  /* Stein: flate fasetter (normalen regnes ut fra flaten selv), lagdeling i to bergfarger, glød nedenfra og dis. vG = glødende årer (vulkanen). */
  const FS_ROCK = `varying vec3 vW; varying float vG; uniform vec3 uA, uB, uGc; uniform float uId, uStr, uTop, uFlow;
${COMMON}
void main(){
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
  float d = dot(N, uKey), tn = tone3(d, -.08, .42);
  float s = vn(vec2(vW.y * uStr + vn(vW.xz * .045) * 1.6, 3.7));
  vec3 base = mix(uA, uB, step(.52, s)); base = mix(base, uB * 1.18, step(.8, N.y) * uTop);
  vec3 col = base * mix(uShC, uKeyC, tn);
  col += uLavaC * under(N, vW, .55) * uGlow;
  float rim = step(.6, (1. - max(dot(N, normalize(cameraPosition - vW)), 0.)) * (dot(N, uRim) * .5 + .5));
  col = mix(col, uRimC * .8, rim * uRimK * .7);
  float gl = step(.5, vG) * step(.35, vn(vec2(vW.x * .4, vW.y * .5 - uTime * uFlow)));
  col = mix(fogged(col, vW), uGc * (.75 + .45 * step(.62, vn(vW.xy * .9 + uTime))), max(gl, step(.92, vG)));
  gl_FragColor = vec4(col, uId / 255.);
}`;
  /* Krystaller: fasetter med ett hardt blikk og lys innenfra. */
  const FS_CRY = `varying vec3 vW; uniform vec3 uA, uB; uniform float uId, uPulse;
${COMMON}
void main(){
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW))), V = normalize(cameraPosition - vW);
  float tn = tone3(dot(N, uKey), -.1, .4);
  vec3 col = mix(uA, uB, tn) * (.75 + .5 * uPulse);
  col = mix(col, vec3(1., .93, .9), step(.86, dot(reflect(-V, N), normalize(uKey + vec3(0., .5, 0.)))));
  col += uLavaC * under(N, vW, .5) * uGlow * .7;
  gl_FragColor = vec4(fogged(col, vW), uId / 255.);
}`;
  /* Lavasjøen: flak av skorpe med glødende sprekker (kantavstanden i et Voronoi-mønster), åpne felt, ringer og lys rundt det som står i den.
     Sprekkene blir bredere med avstanden, så de aldri blir tynnere enn en piksel (ellers gnistrer de). */
  const FS_LAVA = `varying vec3 vW; uniform vec4 uRing[4]; uniform vec4 uWade; uniform vec3 uP0, uP1, uL0, uL1, uL2, uL3; uniform float uS, uCr, uHeat; uniform vec2 uCw;
${COMMON}
vec2 cellp(vec2 c){ return vec2(h21(c), h21(c + 17.3)); }
vec2 voro(vec2 x){ vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), r = g + cellp(n + g) - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
  md = 8.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 g = mg + vec2(float(i), float(j)), r = g + cellp(n + g) - f; if (dot(mr - r, mr - r) > .00001) md = min(md, dot(.5 * (mr + r), normalize(r - mr))); }
  return vec2(md, h21(n + mg + 3.1)); }
void main(){
  float dist = length(cameraPosition - vW); vec2 p = vW.xz * uS;
  vec2 q = p + (vec2(vn(p * .6 + uTime * .05), vn(p * .6 + 31.4 - uTime * .04)) - .5) * 1.1 + vec2(uTime * .018, uTime * .011);
  vec2 v = voro(q); float w = uCw.x + dist * uCw.y;
  float open = vn(vW.xz * uS * .21 + vec2(7., uTime * .012));
  float crack = 1. - smoothstep(w * .5, w, v.x);
  float heat = max(crack * (.5 + .5 * (1. - v.x / w)), smoothstep(uCr - .06, uCr + .06, open) * (.6 + .4 * vn(q * 2.1 + vec2(0., uTime * .25))));
  for (int i = 0; i < 4; i++) { vec4 r = uRing[i]; if (r.w > 0.) heat = max(heat, r.w * (1. - smoothstep(0., .9 + r.z * .06, abs(length(vW.xz - r.xy) - r.z)))); }
  heat = max(heat, uWade.w * (1. - smoothstep(uWade.z * .35, uWade.z, length(vW.xz - uWade.xy))));
  heat = clamp(heat * uHeat + (bayer(gl_FragCoord.xy) - .5) * .09, 0., 1.);
  vec3 col = heat < .13 ? mix(uP0, uP1, step(.5, v.y)) : heat < .36 ? uL0 : heat < .58 ? uL1 : heat < .82 ? uL2 : uL3;
  gl_FragColor = vec4(fogged(col, vW), 1. / 255.);
}`;
  /* Himmelen: fem bånd fra gløden i horisonten til mørket, rastrert i overgangene, med askeskyer som lyses nedenfra. */
  const FS_SKY = `varying vec3 vW; uniform vec3 uS0, uS1, uS2, uS3, uS4; uniform float uLift;
${COMMON}
void main(){ vec3 d = normalize(vW - cameraPosition);
  float k = clamp(d.y * 1.5 + .1 + uLift, 0., 1.) + (fbm(d.xz / (abs(d.y) + .35) * 1.6 + vec2(uTime * .01, 0.)) - .5) * .55 + (bayer(gl_FragCoord.xy) - .5) * .12;
  k = floor(clamp(k, 0., .999) * 5.);
  gl_FragColor = vec4(k < .5 ? uS0 : k < 1.5 ? uS1 : k < 2.5 ? uS2 : k < 3.5 ? uS3 : uS4, 0.);
}`;
  /* Partikler (punkter): banen regnes ut i skyggeleggeren fra frø, fart og tiden, så det ikke finnes noen tilstand. uLoop = 1: evig strøm (glør),
     ellers et utbrudd som starter i uT0 (støv, stein, sprut). Firkantede eller runde, harde piksler; de løses opp i raster når de dør. */
  const VS_PTS = `attribute vec3 aV; attribute vec4 aS; varying float vK, vSd; uniform float uTime, uT0, uLoop, uG, uDrag, uPx, uSway, uFloor, uMin; uniform vec2 uSz; uniform vec3 uWind;
void main(){ float tau = uLoop > .5 ? mod(uTime + aS.y, aS.z) : uTime - uT0 - aS.y; float k = tau / aS.z; vK = k; vSd = aS.x;
  float dr = 1. - uDrag * clamp(k, 0., 1.) * .5;
  vec3 p = position + aV * tau * dr + vec3(0., -.5 * uG * tau * tau, 0.) + uWind * tau * tau;
  p.x += sin(tau * 2.1 + aS.x * 40.) * uSway; p.z += cos(tau * 1.7 + aS.x * 23.) * uSway;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
  gl_PointSize = max(aS.w * uPx / max(-mv.z, .1) * mix(uSz.x, uSz.y, clamp(k, 0., 1.)), uMin);
  if (k < 0. || k > 1. || p.y < uFloor) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; } }`;
  const FS_PTS = `varying float vK, vSd; uniform vec3 uC0, uC1, uC2; uniform float uRound, uFade, uId, uShade;
${COMMON}
void main(){ vec2 q = gl_PointCoord * 2. - 1.; if (uRound > .5 && dot(q, q) > 1.) discard;
  float a = 1. - smoothstep(uFade, 1., vK); if (a < bayer(gl_FragCoord.xy + floor(vSd * 4.))) discard;
  vec3 c = vK < .34 ? uC0 : vK < .67 ? uC1 : uC2;
  if (uShade > .5) c *= (q.y + q.x * .35 < -.15) ? 1.2 : (q.y > .45 ? .68 : .9);
  gl_FragColor = vec4(c, uId / 255.);
}`;
  /* Lys som legges oppå (ringer, glød, søyler): bare farge, aldri nummer eller dybde. */
  const FS_ADD = `varying vec3 vW; varying vec2 vUv; uniform vec3 uC; uniform float uA, uMode;
${COMMON}
void main(){ float a = uA;
  if (uMode < .5) a *= step(.5, vUv.y) * step(vUv.y, .96) + step(.2, vUv.y) * step(vUv.y, .5) * .45;          /* ring: hard kjerne og svakere hale */
  else if (uMode < 1.5) { float r = length(vUv * 2. - 1.); a *= r < .35 ? 1. : r < .62 ? .55 : r < .9 ? .22 : 0.; } /* glød i tre trinn */
  else a *= step(abs(vUv.x - .5), .5 - vUv.y * .28) * (.4 + .6 * step(.5, vn(vec2(vUv.x * 9., vUv.y * 3. - uTime * 2.))));  /* søyle */
  if (a < bayer(gl_FragCoord.xy) * .35) discard;
  gl_FragColor = vec4(uC * a, 0.);
}`;
  /* Etterpasset. Kontur: en piksel får blekk når naboen er en annen ting og ligger lenger bak (kanten tilhører det som står foran), eller når
     samme ting har et dybdesprang (en arm foran kroppen; bare ting med nummer fra 128). Langt unna tegnes ingen kontur: der er alt flater. */
  const FS_POST = `uniform sampler2D tC, tD; uniform vec2 uRes, uSh, uNF; uniform vec3 uInk, uFlC, uFadeC, uTint; uniform vec4 uSpd, uInkD; uniform float uT, uInkK, uFl, uFade, uHeat, uHeatY, uSwirl, uBars, uVig, uSat, uFrame;
${COMMON}
float lin(float z){ return 2. * uNF.x * uNF.y / (uNF.y + uNF.x - (z * 2. - 1.) * (uNF.y - uNF.x)); }
void main(){
  vec2 px = floor(gl_FragCoord.xy) + uSh;
  px.x += floor(sin(px.y * .6 + uT * 9.) * uHeat * (1. - smoothstep(uHeatY - 10., uHeatY + 26., px.y)) + .5);
  vec2 uv = (px + .5) / uRes; vec4 c = texture2D(tC, uv); float id = floor(c.a * 255. + .5), d = lin(texture2D(tD, uv).x), e = 0., es = 0.;
  if (id > 1.5) for (int i = 0; i < 4; i++) { vec2 o = i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.);
    vec2 u2 = uv + o / uRes; float idn = floor(texture2D(tC, u2).a * 255. + .5), dd = lin(texture2D(tD, u2).x) - d;
    if (abs(idn - id) > .5) { if (dd > uInkD.x + d * uInkD.y) e = 1.; } else if (id > 127.5 && dd > uInkD.z + d * uInkD.w) es = 1.; }
  float ik = uInkK * (1. - smoothstep(uNF.y * .12, uNF.y * .2, d));
  vec3 col = c.rgb; col = mix(col, col * .32 + uInk * .25, es * ik); col = mix(col, uInk, e * ik);
  float l = dot(col, vec3(.3, .59, .11)); col = mix(vec3(l), col, uSat) * uTint;
  /* Fartsstreker ut fra et punkt (harde kiler), og virvelen fra Black/White: kiler som roterer og lukker bildet i hvitt. */
  vec2 r = (px - uSpd.xy) / uRes.y; float ang = atan(r.y, r.x), rr = length(r);
  if (uSpd.z > 0.) { float w = h21(vec2(floor(ang * 56. / 6.2832), floor(uFrame * .5))); if (w > 1. - uSpd.z * .3 && rr > uSpd.w + h21(vec2(w, 3.)) * .3) col = mix(col, vec3(1.), .92); }
  if (uSwirl > 0.) { vec2 s = (px - uRes * .5) / uRes.y; float a2 = atan(s.y, s.x) + uSwirl * 5. - length(s) * 3.2, wd = fract(a2 * 7. / 6.2832);
    float cut = uSwirl * 1.25 - (1. - length(s) * 1.1) * .25; if (wd < cut) col = mix(vec3(.82, .74, 1.), vec3(1.), step(wd, cut * .6)); }
  if (uVig > 0.) { float v = length((px - uRes * .5) / uRes * vec2(1., 1.)) * 1.5; v = floor(clamp((v - .62) * 2.4 + (bayer(px) - .5) * .25, 0., 1.) * 4.) / 4.; col *= 1. - v * uVig; }
  col = mix(col, uFlC, uFl); col = mix(col, uFadeC, uFade);
  float bar = floor(uBars * uRes.y * .13 + .5); if (px.y < bar || px.y >= uRes.y - bar) col = vec3(0.);
  gl_FragColor = vec4(floor(clamp(col, 0., 1.) * 31. + .5) / 31., 1.);
}`;

  /* ---------- Oppstart: bunten fra pakken, tegneren og etterpasset ---------- */
  const gl2 = () => { if (G._gl2 == null) { try { G._gl2 = !!document.createElement('canvas').getContext('webgl2'); } catch (_) { G._gl2 = false; } } return G._gl2; };
  G.can = () => !!G.src && !G.dead && gl2();
  const u3 = h => new T.Color(...hex(h)), uv = v => ({ value: v });
  G.boot = () => bootJob || (bootJob = (async () => {
    const url = await G.src('g3d.js'); if (!url) throw new Error('no 3d bundle');
    T = await import(new URL(url, location.href).href);
    cv = document.createElement('canvas'); cv.width = G.W; cv.height = G.H;
    R = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setSize(G.W, G.H, false); R.outputColorSpace = T.LinearSRGBColorSpace; R.setClearColor(0x000000, 0);
    cv.addEventListener('webglcontextlost', () => { G.dead = 1; });
    const dt = new T.DepthTexture(G.W, G.H); dt.minFilter = dt.magFilter = T.NearestFilter;
    rt = new T.WebGLRenderTarget(G.W, G.H, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, generateMipmaps: false, depthBuffer: true, depthTexture: dt });
    cam = new T.PerspectiveCamera(40, G.W / G.H, 0.5, 900);
    /* Felles lys for alle materialene: én verdi, delt av alle. */
    U = { uTime: uv(0), uLavaY: uv(0), uGlow: uv(1), uGlowH: uv(14), uRimK: uv(1), uKey: uv(new T.Vector3(0.4, 0.8, 0.45).normalize()), uKeyC: uv(u3('#fff2e0')), uShC: uv(u3('#3a1a22')),
      uRim: uv(new T.Vector3(0, 0.3, -1).normalize()), uRimC: uv(u3('#ffb040')), uLavaC: uv(u3('#ff6a14')), uFogC: uv(u3('#5a1608')), uFog: uv(new T.Vector3(60, 260, 0.85)) };
    post = new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: FS_POST,
      uniforms: Object.assign({ tC: uv(rt.texture), tD: uv(dt), uRes: uv(new T.Vector2(G.W, G.H)), uSh: uv(new T.Vector2()), uNF: uv(new T.Vector2(0.5, 900)), uInk: uv(u3('#1c0a0c')), uInkK: uv(1), uInkD: uv(new T.Vector4(0.05, 0.004, 0.5, 0.03)),
        uFl: uv(0), uFlC: uv(u3('#ffffff')), uFade: uv(0), uFadeC: uv(u3('#000000')), uTint: uv(u3('#ffffff')), uSpd: uv(new T.Vector4()), uT: uv(0), uHeat: uv(0), uHeatY: uv(60), uSwirl: uv(0), uBars: uv(0), uVig: uv(0), uSat: uv(1), uFrame: uv(0) }, U) });
    postScene = new T.Scene(); const tri = new T.Mesh(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), post); tri.frustumCulled = false; postScene.add(tri);
    postCam = new T.Camera();
    return true;
  })().catch(e => { G.dead = 1; G.err = String(e && e.stack || e); throw e; }));

  /* ---------- Byggeklossene (K): materialer og former. Alt lages én gang per cutscene. ---------- */
  const sm = (vs, fs, un, o) => new T.ShaderMaterial(Object.assign({ vertexShader: vs, fragmentShader: fs, uniforms: Object.assign(un, U) }, o || {}));
  const addBlend = () => ({ transparent: true, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendEquationAlpha: T.AddEquation, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor });
  const K = { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, spring, ant, hit, rnd, hex };
  let nextId = 2;
  K.id = big => big ? 128 + (nextId++ % 120) : 2 + (nextId++ % 120);
  K.rockMat = o => sm(VS, FS_ROCK, { uA: uv(u3(o.a || '#3b2422')), uB: uv(u3(o.b || '#5a3a30')), uGc: uv(u3(o.gc || '#ffb030')), uId: uv(o.id || K.id(o.big)), uStr: uv(o.str == null ? 0.22 : o.str), uTop: uv(o.top || 0), uFlow: uv(o.flow || 0.6) }, { side: T.DoubleSide });
  K.cryMat = o => sm(VS, FS_CRY, { uA: uv(u3(o.a || '#7a1030')), uB: uv(u3(o.b || '#ff5a78')), uId: uv(K.id(1)), uPulse: uv(0.5) });
  K.figMat = (map, o) => { o = o || {}; if (map) { map.colorSpace = T.NoColorSpace; map.magFilter = T.NearestFilter; map.minFilter = T.NearestFilter; map.generateMipmaps = false; map.needsUpdate = true; }
    return sm(VS_FIG, FS_FIG, { map: uv(map), uUvOff: uv(new T.Vector2()), uId: uv(o.id || 255), uStone: uv(0), uStoneC: uv(u3('#8a7892')), uCrack: uv(0), uCrackR: uv(0), uCrackO: uv(new T.Vector3()), uCrackC: uv(u3('#ffe24a')), uSeam: uv(o.seam == null ? 0.2 : o.seam), uSeamOn: uv(o.seamOn == null ? 1 : o.seamOn),
      uEmis: uv(o.emis || 0), uTx: uv(new T.Vector2(1.6 / ((map && map.image && map.image.width) || 512), 1.6 / ((map && map.image && map.image.height) || 512))), uVor: uv(0), uOs: uv(o.os || 0.0254), uFlK: uv(0), uFlC: uv(u3('#ffffff')), uB1: uv(-0.1), uB2: uv(0.45), uCut: uv(-1e4), uMask: uv(o.mask || 0), uMul: uv(u3('#ffffff')) }, o.mask ? Object.assign(addBlend(), { side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }) : { side: T.DoubleSide }); };
  /* Kampestein: en kule med tjue eller åtti flater, dyttet ut og inn etter frø. */
  const jitter = (geo, amt, seed, fn) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.round(x * 31.7) * 3 + Math.round(y * 17.3) * 7 + Math.round(z * 23.9) * 13, k = 1 + (rnd(h, seed) - 0.5) * 2 * amt; let v = [x * k, y * k, z * k]; if (fn) v = fn(v[0], v[1], v[2], rnd(h, seed + 9)); p.setXYZ(i, v[0], v[1], v[2]); } p.needsUpdate = true; geo.computeBoundingSphere(); return geo; };
  K.boulder = (r, seed, o) => { o = o || {}; const g = jitter(new T.IcosahedronGeometry(r, o.d == null ? 1 : o.d), o.j == null ? 0.22 : o.j, seed, (x, y, z) => [x * (o.sx || 1), min((y < 0 && o.flat ? y * 0.25 : y) * (o.sy || 1), o.cap == null ? 1e9 : o.cap), z * (o.sz || 1)]); return new T.Mesh(g, o.mat); };
  /* Spiss: steinspyd, drypstein og krystall (sekskantet stav med topp). */
  K.spike = (h, r, seed, o) => { o = o || {}; const n = o.n || 6, pts = o.crystal ? [[0, 0], [r, 0], [r * 0.92, h * 0.72], [0, h]] : [[0, 0], [r, 0], [r * 0.62, h * 0.4], [r * 0.24, h * 0.78], [0, h]];
    const g = jitter(new T.LatheGeometry(pts.map(q => new T.Vector2(q[0] + 1e-4, q[1])), n), o.j == null ? 0.16 : o.j, seed); return new T.Mesh(g, o.mat); };
  /* Fjellvegg rundt sjøen: en ring med hyller. r(a) = radius, h(a) = høyde; trinnene gir avsatser som i hula i Omega Ruby. */
  K.cliff = o => { const N = o.n || 44, M = o.m || 7, pos = [], idx = [], a0 = o.a0 || 0, a1 = o.a1 == null ? TAU : o.a1;
    for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N, ia = i === N && a1 - a0 >= TAU - 1e-6 ? 0 : i, hh = o.h * (o.hf ? o.hf(a) : 1) * (0.72 + 0.5 * rnd(ia, o.seed + 1) + 0.25 * sin(a * 3 + o.seed));
      for (let j = 0; j <= M; j++) { const v = j / M, st = floor(v * (o.steps || 3)) / (o.steps || 3), rr = o.r + (rnd(ia * 13 + j, o.seed) - 0.5) * o.rough + st * o.back + (j % 2 ? o.ledge || 0 : 0) + sin(a * 5 + j) * o.rough * 0.4;
        pos.push(cos(a) * rr, o.y0 + v * hh + (j === M ? rnd(ia, o.seed + 5) * o.h * 0.18 : 0), sin(a) * rr); } }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j, q = p + M + 1; idx.push(p, p + 1, q, q, p + 1, q + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeBoundingSphere(); return new T.Mesh(g, o.mat); };
  /* Vulkanen: en kjegle med brutt krater og årer av lava nedover siden (aG = 1 der det gløder). */
  K.volcano = o => { const N = 26, M = 9, pos = [], gl = [], idx = [], veins = [1, 2, 7, 12, 13, 19, 23];
    for (let i = 0; i <= N; i++) { const ia = i % N, a = ia / N * TAU; for (let j = 0; j <= M; j++) { const v = j / M, rr = mix(o.r, o.r * 0.16, Math.pow(v, 0.62)) * (1 + (rnd(ia * 7 + j, o.seed) - 0.5) * 0.3), y = v * o.h * (j === M ? 0.86 + 0.2 * rnd(ia, o.seed + 3) : 1);
      pos.push(cos(a) * rr, y, sin(a) * rr); gl.push(j === M ? 1 : veins.indexOf((ia + floor(v * 2.4 * (ia % 3 ? 1 : 0))) % N) >= 0 && v > 0.2 + 0.4 * rnd(ia, 4) ? 0.7 : 0); } }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j, q = p + M + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aG', new T.Float32BufferAttribute(gl, 1)); g.setIndex(idx); g.computeBoundingSphere(); return new T.Mesh(g, o.mat); };
  K.lava = o => { o = o || {}; const m = new T.Mesh(new T.PlaneGeometry(o.size || 700, o.size || 700).rotateX(-PI / 2), sm(VS, FS_LAVA, { uRing: uv([0, 1, 2, 3].map(() => new T.Vector4())), uWade: uv(new T.Vector4()),
      uP0: uv(u3('#1e0a09')), uP1: uv(u3('#34100b')), uL0: uv(u3('#8e1c08')), uL1: uv(u3('#dc4208')), uL2: uv(u3('#ff8a12')), uL3: uv(u3('#ffe062')), uS: uv(o.s || 0.085), uCr: uv(o.cr == null ? 0.63 : o.cr), uHeat: uv(1), uCw: uv(new T.Vector2(0.07, 0.0028)) })); return m; };
  K.sky = o => { o = o || {}; const m = new T.Mesh(new T.SphereGeometry(700, 16, 10), sm(VS, FS_SKY, { uS0: uv(u3(o.c0 || '#e8581a')), uS1: uv(u3(o.c1 || '#9a2410')), uS2: uv(u3(o.c2 || '#521410')), uS3: uv(u3(o.c3 || '#2a0c12')), uS4: uv(u3(o.c4 || '#120609')), uLift: uv(0) }, { side: T.BackSide, depthWrite: false, depthTest: false }));
    m.renderOrder = -10; m.frustumCulled = false; return m; };
  /* Partikler. init(i) gir { p: [x, y, z], v: [x, y, z], s: frø, b: fødsel (s), l: levetid (s), z: størrelse }. */
  K.pts = (n, init, o) => { o = o || {}; const P = new Float32Array(n * 3), V = new Float32Array(n * 3), S = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const q = init(i); P.set(q.p, i * 3); V.set(q.v || [0, 0, 0], i * 3); S.set([q.s == null ? rnd(i, 77) : q.s, q.b || 0, q.l || 1, q.z || 1], i * 4); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aV', new T.BufferAttribute(V, 3)); g.setAttribute('aS', new T.BufferAttribute(S, 4));
    const c = o.c || ['#ffffff', '#ffb040', '#c03010'];
    const m = sm(VS_PTS, FS_PTS, { uT0: uv(o.t0 == null ? -1e5 : o.t0), uLoop: uv(o.loop ? 1 : 0), uG: uv(o.g || 0), uDrag: uv(o.drag || 0), uPx: uv(o.px || 180), uSway: uv(o.sway || 0), uFloor: uv(o.floor == null ? -1e4 : o.floor), uMin: uv(o.min || 1), uSz: uv(new T.Vector2(o.sz0 == null ? 1 : o.sz0, o.sz1 == null ? 1 : o.sz1)), uWind: uv(new T.Vector3(...(o.wind || [0, 0, 0]))),
      uC0: uv(u3(c[0])), uC1: uv(u3(c[1])), uC2: uv(u3(c[2])), uRound: uv(o.round ? 1 : 0), uFade: uv(o.fade == null ? 0.7 : o.fade), uId: uv(o.add ? 0 : o.id == null ? 200 : o.id), uShade: uv(o.shade ? 1 : 0) }, o.add ? addBlend() : {});
    const pts = new T.Points(g, m); pts.frustumCulled = false; return pts; };
  /* Lys oppå: mode 0 ring (flat på bakken), 1 glød (mot kameraet), 2 søyle. */
  K.light = (mode, col, o) => { o = o || {}; const g = mode === 0 ? new T.RingGeometry(0.72, 1, 28, 1).rotateX(-PI / 2) : new T.PlaneGeometry(1, 1);
    if (mode === 0) { const u = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < u.count; i++) u.setXY(i, 0, (Math.hypot(p.getX(i), p.getZ(i)) - 0.72) / 0.28); }
    const m = new T.Mesh(g, sm(VS, FS_ADD, { uC: uv(u3(col)), uA: uv(1), uMode: uv(mode) }, Object.assign(addBlend(), { side: T.DoubleSide, depthTest: o.depth !== false }))); m.frustumCulled = false; return m; };
  /* Figuren: modellen fra pakken med våre materialer, og en rigg. Poser er { Ben: [rx, ry, rz, (px, py, pz)] } lagt oppå hvilestillingen;
     '*Arm' gjelder både LArm og RArm (speilet, så bevegelsen blir lik på begge sider). add(pose, vekt) legger sammen, apply() setter benene. Aksene (fra prøven): y løfter og senker, z til siden, x vrir. */
  const MIR = [1, 0, 1, 1, 0, 0];   /* høyre side av figuren er speilet: rotasjon om x og z (og flytting i x) snur fortegn, y er lik */
  K.figure = (gltf, o) => { o = o || {}; const root = gltf.scene, bones = {}, rest = {}, acc = {}, mats = {}, ex = {};
    root.traverse(q => { if (q.isBone) { bones[q.name] = q; rest[q.name] = [q.rotation.x, q.rotation.y, q.rotation.z, q.position.x, q.position.y, q.position.z]; }
      if (q.isMesh) { q.frustumCulled = false; const n = q.material.name || q.name; if (o.hide && o.hide.test(n + ' ' + q.name)) { q.visible = false; return; }
        const k = /Mask/.test(n) ? 'mask' : n; q.material = mats[k] || (mats[k] = K.figMat(q.material.map, Object.assign({ id: o.id || 255 }, /Eye/.test(n) ? { seamOn: 0, emis: 0.35 } : /BodyB1|^BodyB$/.test(n) ? { seamOn: 0 } : /Mask/.test(n) ? { mask: 1 } : {}))); if (/Mask/.test(n)) q.renderOrder = 5; } });
    const names = Object.keys(bones), list = k => ex[k] || (ex[k] = k[0] === '*' ? ['L' + k.slice(1), 'R' + k.slice(1)].filter(n => bones[n]) : bones[k] ? [k] : []);
    const holder = new T.Group(); holder.add(root);
    const F = { root: holder, bones, mats, rest,
      clear() { for (const n of names) acc[n] = null; },
      add(pose, w) { if (!w) return F; for (const k in pose) { const v = pose[k], st = k[0] === '*'; for (const n of list(k)) { const a = acc[n] || (acc[n] = [0, 0, 0, 0, 0, 0]), m = st && n[0] === 'R'; for (let i = 0; i < v.length; i++) a[i] += v[i] * w * (m && MIR[i] ? -1 : 1); } } return F; },
      rot(k, x, y, z) { return F.add({ [k]: [x, y, z] }, 1); },
      apply() { for (const n of names) { const b = bones[n], r = rest[n], a = acc[n]; if (a) { b.rotation.set(r[0] + a[0], r[1] + a[1], r[2] + a[2]); b.position.set(r[3] + a[3], r[4] + a[4], r[5] + a[5]); } else { b.rotation.set(r[0], r[1], r[2]); b.position.set(r[3], r[4], r[5]); } } holder.updateMatrixWorld(true); },
      at(n, v) { return bones[n].getWorldPosition(v || new T.Vector3()); },
      set(k, val) { for (const m in mats) { const u = mats[m].uniforms[k]; if (!u) continue; if (u.value && u.value.isColor) u.value.setRGB(...(typeof val === 'string' ? hex(val) : val)); else if (u.value && u.value.set && Array.isArray(val)) u.value.set(...val); else u.value = val; } return F; } };
    return F; };
  const models = new Map();
  K.model = n => models.get(n);
  const loadModel = n => models.has(n) ? Promise.resolve(models.get(n)) : G.src(n + '.glb').then(u => { if (!u) throw new Error('no model ' + n); return fetch(u); }).then(r => r.arrayBuffer()).then(b => new T.GLTFLoader().parseAsync(b, '')).then(g => { models.set(n, g); return g; });

  /* ---------- Cutscenene ---------- G3D.def(id, { len, fps, models, make(K, T) → S, act(S, t, o), shots: [[start, fn(S, u, tau, t)]], over(x, t, o) }).
     S.scene er scenen, S.figs figurene. act er skuespillet (én sammenhengende handling), shots er kameraene som klipper mellom bilder av den. */
  const DEF = {}, jobs = {};
  G.def = (id, d) => { DEF[id] = d; };
  G.has = id => !!DEF[id];
  G.info = id => DEF[id] ? { len: DEF[id].len, hold: DEF[id].hold || 0, R: DEF[id].R || 0, at: DEF[id].at || 0 } : null;
  G.ready = id => jobs[id] || (jobs[id] = (async () => {
    const D = DEF[id]; if (!D || !G.can()) throw new Error('no 3d');
    await G.boot(); await Promise.all((D.models || []).map(loadModel));
    nextId = 2; D.S = D.make(K, T); D.S.post = {}; G.frame(id, 0, {}); if (G.err) throw new Error(G.err);
    return true;
  })().catch(e => { G.err = String(e && e.stack || e); jobs[id] = null; throw e; }));
  G.isReady = id => !!(DEF[id] && DEF[id].S && !G.dead);
  const P0 = () => ({ sh: 0, fl: 0, flc: '#ffffff', fade: 0, fadec: '#000000', heat: 0, heatY: 60, spd: 0, spx: 128, spy: 96, spr: 0.3, swirl: 0, bars: 0, vig: 0.5, sat: 1, tint: '#ffffff', ink: 1 });
  /* Kameraet: fra, mot, synsvinkel, og en helling (roll) for lave, skjeve vinkler. */
  K.cam = (px, py, pz, tx, ty, tz, fov, roll) => { cam.position.set(px, py, pz); cam.up.set(0, 1, 0); cam.lookAt(tx, ty, tz); if (roll) cam.rotateZ(roll); if (cam.fov !== (fov || 40)) { cam.fov = fov || 40; cam.updateProjectionMatrix(); } };
  K.U = () => U; K.face = m => { m.quaternion.copy(cam.quaternion); return m; }; K.camPos = () => cam.position;
  /* Tegner ett bilde av cutscenen på tidspunktet t (sekunder) på motorens eget lerret, og gir lerretet. o = { name, lv, cap, cc, out (0..1: virvelen ut) }. */
  G.frame = (id, t, o) => {
    const D = DEF[id], S = D && D.S; if (!S || G.dead) return null;
    try {
      const fps = D.fps || 30, tq = floor(t * fps + 1e-6) / fps, P = S.post = P0(); U.uTime.value = tq;
      for (const f of S.figs || []) f.clear();
      o = Object.assign({}, o || {}, { out: (o && o.out) || G.out || 0 });
      D.act(S, tq, o); for (const f of S.figs || []) f.apply();
      let si = 0; for (let i = 0; i < D.shots.length; i++) if (tq >= D.shots[i][0] - 1e-6) si = i;
      const s0 = D.shots[si][0], s1 = si + 1 < D.shots.length ? D.shots[si + 1][0] : D.len; S.shot = si;
      D.shots[si][1](S, c01((tq - s0) / max(1e-6, s1 - s0)), tq - s0, tq);
      if (o.out > 0) { P.swirl = max(P.swirl, c01(o.out * 1.25)); P.fl = max(P.fl, seg(o.out, 0.62, 1)); P.flc = '#ffffff'; }
      S.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
      const pu = post.uniforms, fn = floor(tq * fps), a = P.sh > 0 ? P.sh : 0;
      pu.uSh.value.set(Math.round((rnd(fn, 1) - 0.5) * 2 * a), Math.round((rnd(fn, 2) - 0.5) * 2 * a)); pu.uFl.value = c01(P.fl); pu.uFlC.value.setRGB(...hex(P.flc)); pu.uFade.value = c01(P.fade); pu.uFadeC.value.setRGB(...hex(P.fadec));
      pu.uHeat.value = P.heat; pu.uHeatY.value = P.heatY; pu.uSpd.value.set(P.spx, G.H - P.spy, P.spd, P.spr); pu.uSwirl.value = P.swirl; pu.uBars.value = P.bars; pu.uVig.value = P.vig; pu.uSat.value = P.sat; pu.uTint.value.setRGB(...hex(P.tint));
      pu.uInkK.value = P.ink; pu.uT.value = tq; pu.uFrame.value = fn; pu.uNF.value.set(cam.near, cam.far);
      R.setRenderTarget(rt); R.clear(); R.render(S.scene, cam); R.setRenderTarget(null); R.render(postScene, postCam);
      G.err = '';
    } catch (e) { G.err = String(e && e.stack || e); }
    return cv;
  };
  /* Tekst i samme lave oppløsning: tegnes på et lite lerret, alfa gjøres hard, og en mørk kant legges rundt. Gir lerretet (256 × 192). */
  let tcv = null, tx = null;
  G.text = fn => { if (!tcv) { tcv = document.createElement('canvas'); tcv.width = G.W; tcv.height = G.H; tx = tcv.getContext('2d', { willReadFrequently: true }); }
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, G.W, G.H); tx.save(); fn(tx); tx.restore();
    const im = tx.getImageData(0, 0, G.W, G.H), d = im.data, n = G.W * G.H, on = new Uint8Array(n); for (let i = 0; i < n; i++) on[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) { const i = y * G.W + x, q = i * 4; if (on[i]) { d[q + 3] = 255; continue; }
      let e = 0; for (let dy = -1; dy <= 1 && !e; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < G.W && yy < G.H && on[yy * G.W + xx]) { e = 1; break; } }
      if (e) { d[q] = 22; d[q + 1] = 8; d[q + 2] = 10; d[q + 3] = 255; } else d[q + 3] = 0; }
    tx.putImageData(im, 0, 0); return tcv; };
  G.K = K; G.T = () => T; G.canvas = () => cv; G.S = id => DEF[id] && DEF[id].S;
  return G;
})();
