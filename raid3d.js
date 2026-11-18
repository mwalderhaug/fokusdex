'use strict';
/* Fokusdex – cutscener i 3D: motoren (G3D). Cutscenene selv ligger i raid3c.js.
   three.js og modellene er IKKE en del av appen: de ligger i ressurspakken (3d/g3d.js og 3d/<navn>.glb) og hentes først når en cutscene skal
   spilles. pack.js setter G3D.src når pakken har dem. Uten pakke (eller uten WebGL 2) finnes det ingen cutscene, og sprite-filmen spilles som før.
   To oppløsninger i samme bilde (Jazz 18.11: figuren var bra, omgivelsene «for pikslete»):
   · FIGUREN tegnes i 256 × 192 uten kantutjevning, med tre harde toner, mørk kontur og motlys, og forstørres med skarpe piksler (som spritene i kampen).
   · OMGIVELSENE (lavasjøen, fjellet, krystallene, glør og røyk) tegnes i filmens fulle oppløsning med myke overganger. Lavaen er samme materiale som
     arenaen i raid2.js (fxgl.js), regnet ut i 3D. Himmelen og vulkanen tegner cutscenen i 2D med verktøykassa (raidk.js) bak 3D-bildet, og
     hele bildet går til slutt gjennom etterbehandlingen i fxgl.js (glød, varmeflimmer, fargetone), som filmene fra steg 2.
   Etterpasset setter de to sammen etter dybden (figuren står I lavaen og bak stein), tegner konturen, fartsstreker og virvelen ut.
   Hver cutscene er en ren funksjon av tiden (som filmene i raid.js): ingen tilstand mellom bildene, så den kan spoles, hoppes over og følge låta. */
const G3D = (() => {
  const G = { W: 256, H: 192, src: null, err: '', dead: 0, out: 0 };   /* out (0..1): virvelen ut av cutscenen, satt av avspilleren når spilleren trykker Continue */
  const sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2, abs = Math.abs, max = Math.max, min = Math.min, floor = Math.floor;
  const c01 = x => x < 0 ? 0 : x > 1 ? 1 : x, mix = (a, b, k) => a + (b - a) * k, seg = (t, a, b) => c01((t - a) / (b - a));
  const io = k => k * k * (3 - 2 * k), eo = k => 1 - (1 - k) * (1 - k) * (1 - k), ei = k => k * k * k;
  /* Tyngde: back går forbi målet og faller på plass (overskudd), spring er en dempet fjær, ant trekker seg først litt motsatt vei (forvarsel). */
  const back = (k, s) => { s = s == null ? 1.70158 : s; k = c01(k) - 1; return k * k * ((s + 1) * k + s) + 1; };
  const spring = (k, f, d) => k <= 0 ? 0 : 1 - Math.exp(-(d || 5) * k) * cos((f || 9) * k);
  const ant = (k, a) => { k = c01(k); a = a == null ? 0.18 : a; return k < 0.3 ? -a * sin(k / 0.3 * PI) : io((k - 0.3) / 0.7); };
  const hit = (t, t0, d) => t < t0 ? 0 : max(0, 1 - (t - t0) / (d || 0.4));
  const rnd = (i, s) => { const x = sin(i * 127.1 + (s || 0) * 311.7 + 0.5) * 43758.5453; return x - floor(x); };
  const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  let T = null, R = null, cv = null, rtE = null, rtF = null, post = null, postScene = null, postCam = null, cam = null, bootJob = null, U = null, rsNow = 0;

  /* ---------- GLSL ---------- */
  const COMMON = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p + n + 17.13)); }
float hs(float q){ return fract(sin(q) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); float n = i.x + i.y * 57. + i.z * 113.;
  return mix(mix(mix(hs(n), hs(n + 1.), f.x), mix(hs(n + 57.), hs(n + 58.), f.x), f.y), mix(mix(hs(n + 113.), hs(n + 114.), f.x), mix(hs(n + 170.), hs(n + 171.), f.x), f.y), f.z); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.3, 9.1); a *= .5; } return s; }
vec3 voro(vec2 p){ vec2 i = floor(p), f = fract(p); float a = 8., b = 8., id = 0.; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 r = g + h22(i + g) - f; float d = dot(r, r); if (d < a) { b = a; a = d; id = h21(i + g + 3.7); } else if (d < b) b = d; } return vec3(sqrt(a), sqrt(b), id); }
float bayer(vec2 p){ vec2 q = floor(mod(p, 4.)); int i = int(q.x) + int(q.y) * 4; float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.); return (m[i] + .5) / 16.; }
uniform float uTime, uLavaY, uGlow, uGlowH, uRimK; uniform vec3 uKey, uKeyC, uShC, uRim, uRimC, uLavaC, uFogC, uFog;
float fogK(vec3 w){ float f = clamp((length(cameraPosition - w) - uFog.x) / (uFog.y - uFog.x), 0., 1.); return f * f * (3. - 2. * f) * uFog.z; }
float tone3(float d, float a, float b){ return step(a, d) * .5 + step(b, d) * .5; }
float underK(vec3 N, vec3 w, float bias){ return clamp(-N.y * 1.2 + bias, 0., 1.) * clamp(1. - (w.y - uLavaY) / uGlowH, 0., 1.); }
`;
  const VS = `varying vec3 vW, vN, vO; varying vec2 vUv;
void main(){ vUv = uv; vO = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  /* Figuren (piksler): skinnet, tre toner, kantlys bakfra, glød nedenfra, steinhud (uStone) og sprekker av lys (uCrack). uHead: ingen sprekker i hodet. */
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
uniform float uId, uStone, uCrack, uCrackR, uSeam, uSeamOn, uEmis, uFlK, uB1, uB2, uMask, uVor; uniform vec3 uCrackC, uCrackO, uFlC, uStoneC, uMul, uHead; uniform vec2 uTx;
${COMMON}
void main(){
  vec4 tx = texture2D(map, vUv); vec3 base = tx.rgb; float lum = dot(base, vec3(.3, .59, .11));
  if (uMask > .5) { float m = max(tx.r, max(tx.g, tx.b)); if (m < .35) discard; gl_FragColor = vec4(uCrackC * (.7 + .5 * m) * uCrack, uId / 255.); return; }
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 V = normalize(cameraPosition - vW);
  float lm = lum; if (uSeamOn > .5 && uCrack > 0.) { for (int i = 0; i < 4; i++) { vec2 o = (i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.)) * uTx; lm = min(lm, dot(texture2D(map, vUv + o).rgb, vec3(.3, .59, .11))); } }
  float seam = (1. - smoothstep(uSeam - .05, uSeam + .05, lm)) * uSeamOn;
  float st = step(vn3(vO * .42) * .8 + vn3(vO * 1.7) * .2, uStone * 1.3 - .15);
  base = mix(base, uStoneC * (.4 + lum * 1.05), st) * uMul;
  float d = dot(N, uKey), tn = tone3(d, uB1, uB2);
  vec3 col = base * mix(uShC, uKeyC, tn);
  col += uLavaC * floor(underK(N, vW, .25) * 4. + .5) / 4. * uGlow * (.3 + .7 * base);
  float rim = step(.56, (1. - max(dot(N, V), 0.)) * (dot(N, uRim) * .5 + .5));
  col = mix(col, uRimC * (.55 + .6 * base), rim * uRimK);
  col = mix(col, base * 1.25, uEmis);
  float fr = step(distance(vO, uCrackO) + (vn3(vO * 2.3) - .5) * 1.6, uCrackR) * (1. - uHead.z * step(uHead.x, vO.z) * step(uHead.y, vO.y));
  float vc = 0.; if (uVor > 0. && uCrack > 0. && uSeamOn > .5) { vec2 q = vec2(vO.x + vO.z * .55, vO.y + vO.z * .35) * .58; q += (vec2(vn(q * 2.3), vn(q * 2.3 + 9.)) - .5) * .55; vec3 v = voro(q); vc = (1. - smoothstep(.05, .12, v.y - v.x)) * uVor; }
  col = mix(col, uCrackC, max(seam, vc) * fr * uCrack);
  col = mix(col, uFlC, uFlK);
  float fg = floor(fogK(vW) * 6. + .5) / 6.;
  gl_FragColor = vec4(mix(col, uFogC, fg), uId / 255.);
}`;
  /* Stein (omgivelsene, mykt): lagdeling og korn, lys fra nøkkelen, glød nedenfra, glødende fot der den står i lavaen, kantlys og dis. uSm = hvor avrundet. */
  const FS_ROCK = `varying vec3 vW, vN, vO; uniform vec3 uA, uB; uniform float uStr, uTop, uSm;
${COMMON}
void main(){
  vec3 Nf = normalize(cross(dFdx(vW), dFdy(vW))), Ns = normalize(vN); if (dot(Ns, Nf) < 0.) Ns = -Ns; vec3 N = normalize(mix(Nf, Ns, uSm)), V = normalize(cameraPosition - vW);
  float n1 = fbm(vec2(vW.y * uStr + fbm(vW.xz * .05) * 1.8, vW.x * .021 + vW.z * .013)), n2 = fbm(vW.xz * .9 + vW.y * .7);
  vec3 base = mix(uA, uB, smoothstep(.35, .65, n1)) * (.8 + .4 * n2); base = mix(base, uB * 1.2, smoothstep(.6, .9, N.y) * uTop);
  vec3 col = base * mix(uShC, uKeyC, smoothstep(.3, .85, dot(N, uKey) * .5 + .5));
  float ug = underK(N, vW, .6); col += uLavaC * ug * ug * uGlow * .9;
  float hot = 1. - smoothstep(0., 1.8, vW.y - uLavaY); col += vec3(1., .4, .07) * hot * hot * uGlow;
  col += uRimC * pow(1. - max(dot(N, V), 0.), 3.) * (dot(N, uRim) * .5 + .5) * uRimK * .5;
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.);
}`;
  /* Vulkanen: mørk basalt med renner nedover (støy strukket langs fallet), lysere aske mot toppen, og lavaelver som følger rennene fra krateret
     (uEr = hvor sterkt utbruddet er). vUv = (rundt fjellet 0–1, høyden 0–1). Støyen regnes på en sirkel, så den har ingen søm. */
  const FS_VOLC = `varying vec3 vW, vN; varying vec2 vUv; uniform vec3 uA, uB; uniform float uEr;
${COMMON}
void main(){
  float a = vUv.x * 6.2832, v = vUv.y; vec2 c = vec2(cos(a), sin(a));
  vec3 Nf = normalize(cross(dFdx(vW), dFdy(vW))), Ns = normalize(vN); if (dot(Ns, Nf) < 0.) Ns = -Ns; vec3 N = normalize(mix(Nf, Ns, .7));
  float g1 = fbm(c * 9. + vec2(v * 1.3, 0.)), g2 = fbm(c * 24. + v * 2.), streak = fbm(vec2(c.x * 30. + g1 * 2., c.y * 30. + v * 2.5));
  vec3 base = mix(uA, uB, smoothstep(.35, .7, streak * .6 + g2 * .4)) * (.7 + .6 * g1); base = mix(base, uB * 1.3, smoothstep(.5, .95, v) * .45);
  vec3 col = base * mix(uShC, uKeyC, smoothstep(.25, .85, dot(N, uKey) * .5 + .5));
  col += uRimC * pow(1. - max(dot(N, normalize(cameraPosition - vW)), 0.), 2.5) * (dot(N, uRim) * .5 + .5) * .35;
  float ch = abs(fbm(c * 5. + vec2(0., v * .6)) - .5), w = .01 + .018 * v;
  float river = (1. - smoothstep(w, w * 2.8, ch)) * smoothstep(.1 + .42 * (1. - min(uEr, 1.)), 1., v + fbm(c * 3.) * .35);
  float flow = .7 + .3 * sin(v * 60. - uTime * 3. + g1 * 9.);
  vec3 hot = mix(vec3(.7, .09, .02), vec3(1., .72, .2), smoothstep(.3, 1., v) * flow) * (.55 + .9 * min(uEr, 1.6));
  float fg = fogK(vW); col = mix(col, uFogC, fg);
  col += hot * river * (1. - fg * .45) + vec3(1., .42, .08) * smoothstep(.84, 1., v) * (.35 + .7 * min(uEr, 1.6));
  gl_FragColor = vec4(col, 1.);
}`;
  /* Krystaller: fasetter, ett blikk, lys i kantene og innenfra. */
  const FS_CRY = `varying vec3 vW; uniform vec3 uA, uB; uniform float uPulse;
${COMMON}
void main(){
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW))), V = normalize(cameraPosition - vW);
  vec3 col = mix(uA, uB, smoothstep(.2, .9, dot(N, uKey) * .5 + .5)) * (.75 + .55 * uPulse);
  col += vec3(1., .9, .9) * pow(max(dot(reflect(-V, N), normalize(uKey + vec3(0., .5, 0.))), 0.), 22.) * .9;
  col += uB * pow(1. - max(dot(N, V), 0.), 2.) * .55 + uLavaC * underK(N, vW, .5) * uGlow * .6;
  float hot = 1. - smoothstep(0., 1.5, vW.y - uLavaY); col += vec3(1., .4, .1) * hot * hot * uGlow * .8;
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.);
}`;
  /* Lavasjøen: samme materiale som arenaen (mats.lava i fxgl.js: flak som driver, sprekker i tre nivåer, åpne renner), her på et plan i 3D.
     uK = verktøykassas mål per enhet her. Ringer ved nedslag (uRing) og glød rundt det som står i lavaen (uWade) er lagt til. */
  const FS_LAVA = `varying vec3 vW; uniform vec4 uRing[4]; uniform vec4 uWade; uniform float uHeat, uK, uCell, uCw, uBri;
${COMMON}
vec3 ramp(float x){ vec3 c = vec3(.028, .006, .002); c = mix(c, vec3(.4, .028, .0), smoothstep(0., .3, x)); c = mix(c, vec3(.98, .24, .02), smoothstep(.24, .6, x)); c = mix(c, vec3(1., .66, .14), smoothstep(.56, .92, x)); return mix(c, vec3(1., .95, .72), smoothstep(.9, 1.35, x)); }
void main(){
  vec2 w = vW.xz * uK; float t = uTime, heat = uHeat, cell = uCell, dist = length(cameraPosition - vW) * uK; vec2 p = w / cell;
  vec2 fl = vec2(fbm(p * .33 + vec2(0., t * .02)), fbm(p * .33 + vec2(5.2, -t * .017))) - .5, wg = (vec2(vn(p * 3.7 + 2.), vn(p * 3.7 + 9.)) - .5) * .24;
  vec2 pp = p + fl * 1.25 + wg + vec2(t * .01, t * .026); vec3 V = voro(pp); float e = V.y - V.x;
  float open = smoothstep(.67 - .14 * heat, .78 - .14 * heat, fbm(p * .2 + vec2(t * .012, -t * .009) + 7.));
  float fw = max(length(dFdx(w)), length(dFdy(w))), px = fw / cell;
  float cw = max(uCw * (.5 + vn(pp * 2.1 + V.z * 7.)) * (1. + .55 * heat), 1.3 * px);
  float core = 1. - smoothstep(0., cw * .42, e), body = 1. - smoothstep(cw * .3, cw * 1.15, e), halo = 1. - smoothstep(cw, cw * 6., e);
  vec3 V2 = voro(pp * 2.7 + 11.); float f2 = (1. - smoothstep(0., max(cw * .9, 2.6 * px), V2.y - V2.x)) * (1. - clamp(px / .1, 0., 1.));
  vec3 V3 = voro(pp * 6.9 + 3.); float f3 = (1. - smoothstep(0., max(cw * 1.1, 6. * px), V3.y - V3.x)) * (1. - clamp(px / .04, 0., 1.));
  float tx = fbm(pp * 6. + V.z * 20.), rope = abs(sin(fbm(pp * 3. + V.z * 9.) * 14. + pp.x * 2.));
  vec3 crust = (vec3(.04, .028, .028) + vec3(.05, .034, .03) * tx + vec3(.026, .012, .004) * V.z) * (.74 + .26 * rope) * (.55 + .45 * smoothstep(cw, cw * 2.6, e));
  float pulse = .84 + .16 * sin(t * 1.7 + V.z * 40. + p.x);
  float temp = core * (.86 + .16 * heat) + body * (.46 + .17 * heat) * pulse + halo * (.09 + .08 * heat);
  temp = max(temp, f2 * (.42 + .2 * heat) * (.6 + .4 * V2.z)); temp = max(temp, f3 * (.2 + .16 * heat));
  float skin = fbm(pp * 2.3 + vec2(t * .085, t * .05));
  temp = max(temp, open * (.42 + .38 * skin + .12 * heat) * (1. - .62 * smoothstep(.45, .7, fbm(pp * 5. + vec2(t * .04, -t * .03)))));
  float rg = 0.; for (int i = 0; i < 4; i++) { vec4 r = uRing[i]; if (r.w > 0.) rg = max(rg, r.w * (1. - smoothstep(0., .5 + r.z * .07, abs(length(vW.xz - r.xy) - r.z)))); }
  temp += rg * (.45 + .55 * max(max(body, f2), open));
  float wd = uWade.w * (1. - smoothstep(uWade.z * .25, uWade.z, length(vW.xz - uWade.xy))); temp = max(temp, wd * (.6 + .4 * skin)); open = max(open, wd * .8);
  vec3 c = crust * (1. - open * .8) + ramp(temp) * uBri;
  float lod = clamp(fw / (cell * .42), 0., 1.);
  c = mix(c, ramp(.1 + .3 * min(heat, 1.2) + .1 * vn(vec2(w.x / 190. + t * .03, dist / 600.))) * uBri, lod * lod);
  gl_FragColor = vec4(mix(c, uFogC, fogK(vW)), 1.);
}`;
  /* Partikler (punkter): banen regnes ut i skyggeleggeren fra frø, fart og tiden, så det ikke finnes noen tilstand. uLoop = 1: evig strøm (glør),
     ellers et utbrudd som starter i uT0. Myke og runde i omgivelsene (lys som legges oppå, eller røyk og støv); uPix = 1: harde firkanter i figurens
     oppløsning (steinflakene som faller av ham), som løses opp i raster. */
  const VS_PTS = `attribute vec3 aV; attribute vec4 aS; varying float vK, vSd; uniform float uTime, uT0, uLoop, uG, uDrag, uPx, uSway, uFloor, uMin; uniform vec2 uSz; uniform vec3 uWind;
void main(){ float tau = uLoop > .5 ? mod(uTime + aS.y, aS.z) : uTime - uT0 - aS.y; float k = tau / aS.z; vK = k; vSd = aS.x;
  float dr = 1. - uDrag * clamp(k, 0., 1.) * .5;
  vec3 p = position + aV * tau * dr + vec3(0., -.5 * uG * tau * tau, 0.) + uWind * tau * tau;
  p.x += sin(tau * 2.1 + aS.x * 40.) * uSway; p.z += cos(tau * 1.7 + aS.x * 23.) * uSway;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
  gl_PointSize = max(aS.w * uPx / max(-mv.z, .1) * mix(uSz.x, uSz.y, clamp(k, 0., 1.)), uMin);
  if (k < 0. || k > 1. || p.y < uFloor) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; } }`;
  const FS_PTS = `varying float vK, vSd; uniform vec3 uC0, uC1, uC2; uniform float uFade, uId, uShade, uPix, uAdd, uA;
${COMMON}
void main(){ vec2 q = gl_PointCoord * 2. - 1.; float fade = 1. - smoothstep(uFade, 1., vK);
  if (uPix > .5) { if (fade < bayer(gl_FragCoord.xy + floor(vSd * 4.))) discard; vec3 c = vK < .34 ? uC0 : vK < .67 ? uC1 : uC2; c *= (q.y + q.x * .35 < -.15) ? 1.2 : (q.y > .45 ? .68 : .9); gl_FragColor = vec4(c, uId / 255.); return; }
  float r2 = dot(q, q); if (r2 > 1.) discard; float a = (1. - r2) * (1. - r2) * fade * uA;
  vec3 c = mix(mix(uC0, uC1, smoothstep(0., .5, vK)), uC2, smoothstep(.5, 1., vK)); if (uShade > .5) c *= mix(1.2, .62, smoothstep(-.6, .7, q.y + q.x * .3));
  gl_FragColor = uAdd > .5 ? vec4(c * a, 0.) : vec4(c * a, a);
}`;
  /* Lys som legges oppå (ring på bakken, glød mot kameraet): bare farge. */
  const FS_ADD = `varying vec2 vUv; uniform vec3 uC; uniform float uA, uMode;
void main(){ float a = uA;
  if (uMode < .5) a *= smoothstep(0., .55, vUv.y) * (1. - smoothstep(.75, 1., vUv.y));
  else { float r = length(vUv * 2. - 1.); a *= (1. - smoothstep(0., 1., r)) * (1. - smoothstep(0., 1., r)); }
  gl_FragColor = vec4(uC * a, 0.);
}`;
  /* Etterpasset: omgivelsene (tE, full oppløsning) og figuren (tF, 256 × 192, nærmeste piksel) settes sammen etter dybden. Dybden til omgivelsene leses
     midt i figurens piksel, så hver store piksel enten synes eller er skjult (lavaen kutter beina, stein står foran). Konturen: figurens piksel får
     blekk når naboen ikke er figur, eller ligger et sprang lenger bak (en arm foran kroppen). Så gnister utover fra et punkt (brølet) og virvelen ut (Black/White). */
  const FS_POST = `uniform sampler2D tE, tED, tF, tFD; uniform vec2 uRes, uLo, uNF; uniform vec3 uInk; uniform vec4 uSpd, uInkD; uniform float uInkK, uSwirl, uFrame;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lin(float z){ return 2. * uNF.x * uNF.y / (uNF.y + uNF.x - (z * 2. - 1.) * (uNF.y - uNF.x)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes, tuv = (floor(uv * uLo) + .5) / uLo; vec4 c = texture2D(tE, uv), f = texture2D(tF, tuv); float id = floor(f.a * 255. + .5);
  if (id > .5) { float dF = lin(texture2D(tFD, tuv).x), dE = lin(texture2D(tED, tuv).x);
    if (dF < dE + .03 + dE * .002) { float e = 0., es = 0.;
      for (int i = 0; i < 4; i++) { vec2 o = i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.); vec2 u2 = tuv + o / uLo; float idn = floor(texture2D(tF, u2).a * 255. + .5), dn = lin(texture2D(tFD, u2).x);
        if (abs(idn - id) > .5) { if (idn < .5 || dn > dF) e = 1.; } else if (id > 127.5 && dn - dF > uInkD.z + dF * uInkD.w) es = 1.; }
      float ik = uInkK * (1. - smoothstep(uNF.y * .12, uNF.y * .2, dF)); vec3 fc = f.rgb; fc = mix(fc, fc * .32 + uInk * .25, es * ik); fc = mix(fc, uInk, e * ik); c = vec4(fc, 1.); } }
  vec2 px = uv * uLo, r = (px - uSpd.xy) / uLo.y; float ang = atan(r.y, r.x), rr = length(r);
  /* Gnister utover fra et punkt: tynne, korte, oransje streker som flyr ut (ikke tykke hvite kiler: Jazz 18.11). Lys legges oppå. */
  if (uSpd.z > 0.) { float bn = ang * 150. / 6.2832, w = h21(vec2(floor(bn), 7.)), ph = fract(w * 7.3 + uFrame * .04 * (.6 + w)), r0 = uSpd.w + ph * 1.15;
    if (w > 1. - uSpd.z * .5 && abs(fract(bn) - .5) < .17 && rr > r0 && rr < r0 + .05 + .13 * w) c.rgb += vec3(1., .5, .16) * (1. - ph) * .85 * uSpd.z; }
  if (uSwirl > 0.) { vec2 s = (px - uLo * .5) / uLo.y; float a2 = atan(s.y, s.x) + uSwirl * 5. - length(s) * 3.2, wd = fract(a2 * 7. / 6.2832), cut = uSwirl * 1.25 - (1. - length(s) * 1.1) * .25;
    if (wd < cut) c = vec4(mix(vec3(.82, .74, 1.), vec3(1.), step(wd, cut * .6)), 1.); }
  gl_FragColor = c;
}`;

  /* ---------- Oppstart: bunten fra pakken, tegneren og de to lerretene i minnet ---------- */
  const gl2 = () => { if (G._gl2 == null) { try { G._gl2 = !!document.createElement('canvas').getContext('webgl2'); } catch (_) { G._gl2 = false; } } return G._gl2; };
  G.can = () => !!G.src && !G.dead && gl2();
  const u3 = h => new T.Color(...hex(h)), uv = v => ({ value: v });
  G.boot = () => bootJob || (bootJob = (async () => {
    const url = await G.src('g3d.js'); if (!url) throw new Error('no 3d bundle');
    T = await import(new URL(url, location.href).href);
    cv = document.createElement('canvas');
    R = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.outputColorSpace = T.LinearSRGBColorSpace; R.setClearColor(0x000000, 0);
    cv.addEventListener('webglcontextlost', () => { G.dead = 1; });
    const dt = new T.DepthTexture(G.W, G.H); dt.minFilter = dt.magFilter = T.NearestFilter;
    rtF = new T.WebGLRenderTarget(G.W, G.H, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, generateMipmaps: false, depthBuffer: true, depthTexture: dt });
    const de = new T.DepthTexture(512, 384); de.minFilter = de.magFilter = T.NearestFilter;
    rtE = new T.WebGLRenderTarget(512, 384, { samples: 4, minFilter: T.LinearFilter, magFilter: T.LinearFilter, generateMipmaps: false, depthBuffer: true, depthTexture: de });
    cam = new T.PerspectiveCamera(40, G.W / G.H, 0.5, 900);
    /* Felles lys for alle materialene: én verdi, delt av alle. */
    U = { uTime: uv(0), uLavaY: uv(0), uGlow: uv(1), uGlowH: uv(14), uRimK: uv(1), uKey: uv(new T.Vector3(0.4, 0.8, 0.45).normalize()), uKeyC: uv(u3('#fff2e0')), uShC: uv(u3('#3a1a22')),
      uRim: uv(new T.Vector3(0, 0.3, -1).normalize()), uRimC: uv(u3('#ffb040')), uLavaC: uv(u3('#ff6a14')), uFogC: uv(u3('#6a1c08')), uFog: uv(new T.Vector3(60, 300, 0.8)) };
    post = new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: FS_POST,
      uniforms: { tE: uv(rtE.texture), tED: uv(de), tF: uv(rtF.texture), tFD: uv(dt), uRes: uv(new T.Vector2(512, 384)), uLo: uv(new T.Vector2(G.W, G.H)), uNF: uv(new T.Vector2(0.5, 900)), uInk: uv(u3('#1c0a0c')), uInkK: uv(1), uInkD: uv(new T.Vector4(0.05, 0.004, 0.5, 0.03)), uSpd: uv(new T.Vector4()), uSwirl: uv(0), uFrame: uv(0) } });
    postScene = new T.Scene(); const tri = new T.Mesh(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), post); tri.frustumCulled = false; postScene.add(tri);
    postCam = new T.Camera(); scale(1);
    return true;
  })().catch(e => { G.dead = 1; G.err = String(e && e.stack || e); throw e; }));
  /* Omgivelsene tegnes i filmens oppløsning: 512 × 384 ganger rs (CINE.RS: 1 eller 1,5). Figuren er alltid 256 × 192. */
  const scale = rs => { rs = rs || 1; if (rs === rsNow) return; rsNow = rs; const w = Math.round(512 * rs), h = Math.round(384 * rs); R.setSize(w, h, false); rtE.setSize(w, h); post.uniforms.uRes.value.set(w, h); };

  /* ---------- Byggeklossene (K): materialer og former. Alt lages én gang per cutscene. ---------- */
  const sm = (vs, fs, un, o) => new T.ShaderMaterial(Object.assign({ vertexShader: vs, fragmentShader: fs, uniforms: Object.assign(un, U) }, o || {}));
  const addBlend = () => ({ transparent: true, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendEquationAlpha: T.AddEquation, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor });
  const softBlend = () => ({ transparent: true, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendEquationAlpha: T.AddEquation, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor });
  const K = { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, spring, ant, hit, rnd, hex };
  K.rockMat = o => sm(VS, FS_ROCK, { uA: uv(u3(o.a || '#3b2422')), uB: uv(u3(o.b || '#5a3a30')), uStr: uv(o.str == null ? 0.22 : o.str), uTop: uv(o.top || 0), uSm: uv(o.sm == null ? 0.7 : o.sm) }, { side: T.DoubleSide });
  K.cryMat = o => sm(VS, FS_CRY, { uA: uv(u3(o.a || '#7a1030')), uB: uv(u3(o.b || '#ff5a78')), uPulse: uv(0.5) });
  K.figMat = (map, o) => { o = o || {}; if (map) { map.colorSpace = T.NoColorSpace; map.magFilter = T.NearestFilter; map.minFilter = T.NearestFilter; map.generateMipmaps = false; map.needsUpdate = true; }
    return sm(VS_FIG, FS_FIG, { map: uv(map), uUvOff: uv(new T.Vector2()), uId: uv(o.id || 255), uStone: uv(0), uStoneC: uv(u3('#8a7892')), uCrack: uv(0), uCrackR: uv(0), uCrackO: uv(new T.Vector3()), uCrackC: uv(u3('#ffe24a')), uSeam: uv(o.seam == null ? 0.2 : o.seam), uSeamOn: uv(o.seamOn == null ? 1 : o.seamOn), uHead: uv(new T.Vector3(1e4, 1e4, 0)),
      uEmis: uv(o.emis || 0), uTx: uv(new T.Vector2(1.6 / ((map && map.image && map.image.width) || 512), 1.6 / ((map && map.image && map.image.height) || 512))), uVor: uv(0), uOs: uv(o.os || 0.0254), uFlK: uv(0), uFlC: uv(u3('#ffffff')), uB1: uv(-0.1), uB2: uv(0.45), uMask: uv(o.mask || 0), uMul: uv(u3('#ffffff')) }, o.mask ? Object.assign(addBlend(), { side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }) : { side: T.DoubleSide }); };
  /* Kampestein: en kule dyttet ut og inn etter frø. Normalen peker ut fra midten, så den skygges som en rund stein. */
  const jitter = (geo, amt, seed, fn) => { const p = geo.attributes.position, nn = geo.attributes.normal; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.round(x * 31.7) * 3 + Math.round(y * 17.3) * 7 + Math.round(z * 23.9) * 13, k = 1 + (rnd(h, seed) - 0.5) * 2 * amt; let v = [x * k, y * k, z * k]; if (fn) v = fn(v[0], v[1], v[2]); p.setXYZ(i, v[0], v[1], v[2]); if (nn) { const l = Math.hypot(x, y, z) || 1; nn.setXYZ(i, x / l, y / l, z / l); } } p.needsUpdate = true; geo.computeBoundingSphere(); return geo; };
  K.boulder = (r, seed, o) => { o = o || {}; const g = jitter(new T.IcosahedronGeometry(r, o.d == null ? 2 : o.d), o.j == null ? 0.2 : o.j, seed, (x, y, z) => [x * (o.sx || 1), min((y < 0 && o.flat ? y * 0.25 : y) * (o.sy || 1), o.cap == null ? 1e9 : o.cap), z * (o.sz || 1)]); return new T.Mesh(g, o.mat); };
  /* Spiss: steinspyd og krystall (sekskantet stav med topp). */
  K.spike = (h, r, seed, o) => { o = o || {}; const n = o.n || 6, pts = o.crystal ? [[0, 0], [r, 0], [r * 0.92, h * 0.72], [0, h]] : [[0, 0], [r, 0], [r * 0.62, h * 0.4], [r * 0.24, h * 0.78], [0, h]];
    const g = new T.LatheGeometry(pts.map(q => new T.Vector2(q[0] + 1e-4, q[1])), n); if (!o.crystal) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), q = 1 + (rnd(Math.round(y * 9) + Math.round(p.getX(i) * 7) * 3, seed) - 0.5) * 0.3; p.setX(i, p.getX(i) * q); p.setZ(i, p.getZ(i) * q); } g.computeVertexNormals(); } return new T.Mesh(g, o.mat); };
  /* Fjellvegg rundt sjøen: en ring med hyller. hf(a) = høyden rundt ringen (lavere der krateret åpner seg). */
  K.cliff = o => { const N = o.n || 44, M = o.m || 7, pos = [], idx = [];
    for (let i = 0; i <= N; i++) { const ia = i === N ? 0 : i, a = ia / N * TAU, hh = o.h * (o.hf ? o.hf(a) : 1) * (0.72 + 0.5 * rnd(ia, o.seed + 1) + 0.25 * sin(a * 3 + o.seed));
      for (let j = 0; j <= M; j++) { const v = j / M, st = floor(v * (o.steps || 3)) / (o.steps || 3), rr = o.r + (rnd(ia * 13 + j, o.seed) - 0.5) * o.rough + st * o.back + (j % 2 ? o.ledge || 0 : 0) + sin(a * 5 + j) * o.rough * 0.4;
        pos.push(cos(a) * rr, o.y0 + v * hh + (j === M ? rnd(ia, o.seed + 5) * o.h * 0.18 : 0), sin(a) * rr); } }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j, q = p + M + 1; idx.push(p, p + 1, q, q, p + 1, q + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return new T.Mesh(g, o.mat); };
  /* Vulkanen: en bred, slak kjegle som blir brattere mot toppen, med ujevnt omriss, renner og en brutt kraterkant (lavere på den ene siden). */
  K.volcano = o => { const N = o.n || 96, M = o.m || 30, pos = [], uvs = [], idx = [], sd = o.seed || 5, cr = o.crater || 0.07;
    for (let j = 0; j <= M; j++) { const v = j / M; for (let i = 0; i <= N; i++) { const ia = i % N, a = ia / N * TAU, lobes = 1 + 0.16 * sin(a * 3 + sd) + 0.1 * sin(a * 7 + sd * 2.3) + 0.06 * sin(a * 13 + 1.7), gully = 0.05 * sin(a * 31 + sin(a * 5) * 3) * (1 - v) + 0.03 * sin(a * 57 + v * 9) * (1 - v * 0.6);
      const rr = (o.r * Math.pow(1 - v, 1.65) * lobes + o.r * cr) * (1 + gully), notch = j === M ? -o.h * 0.08 * max(0, sin(a * 2 + 1.1)) + (rnd(ia, sd) - 0.5) * o.h * 0.04 : 0;
      pos.push(cos(a) * rr, v * o.h + notch, sin(a) * rr); uvs.push(i / N, v); } }
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) { const p = j * (N + 1) + i, q = p + N + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    return new T.Mesh(g, sm(VS, FS_VOLC, { uA: uv(u3(o.a || '#140c0e')), uB: uv(u3(o.b || '#33211d')), uEr: uv(0.3) }, { side: T.DoubleSide })); };
  K.lava = o => { o = o || {}; return new T.Mesh(new T.PlaneGeometry(o.size || 900, o.size || 900).rotateX(-PI / 2), sm(VS, FS_LAVA, { uRing: uv([0, 1, 2, 3].map(() => new T.Vector4())), uWade: uv(new T.Vector4()), uHeat: uv(1.2), uK: uv(o.k || 16), uCell: uv(o.cell || 84), uCw: uv(o.cw || 0.05), uBri: uv(0.95) })); };
  /* Partikler. init(i) gir { p, v, s: frø, b: fødsel (s), l: levetid (s), z: størrelse }. o.pix: harde piksler i figurens oppløsning, o.add: lys, ellers røyk. */
  K.pts = (n, init, o) => { o = o || {}; const P = new Float32Array(n * 3), V = new Float32Array(n * 3), S = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const q = init(i); P.set(q.p, i * 3); V.set(q.v || [0, 0, 0], i * 3); S.set([q.s == null ? rnd(i, 77) : q.s, q.b || 0, q.l || 1, q.z || 1], i * 4); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aV', new T.BufferAttribute(V, 3)); g.setAttribute('aS', new T.BufferAttribute(S, 4));
    const c = o.c || ['#ffffff', '#ffb040', '#c03010'];
    const m = sm(VS_PTS, FS_PTS, { uT0: uv(o.t0 == null ? -1e5 : o.t0), uLoop: uv(o.loop ? 1 : 0), uG: uv(o.g || 0), uDrag: uv(o.drag || 0), uPx: uv((o.px || 180) * (o.pix ? 1 : 2)), uSway: uv(o.sway || 0), uFloor: uv(o.floor == null ? -1e4 : o.floor), uMin: uv(o.min || (o.pix ? 1 : 2)), uSz: uv(new T.Vector2(o.sz0 == null ? 1 : o.sz0, o.sz1 == null ? 1 : o.sz1)), uWind: uv(new T.Vector3(...(o.wind || [0, 0, 0]))),
      uC0: uv(u3(c[0])), uC1: uv(u3(c[1])), uC2: uv(u3(c[2])), uFade: uv(o.fade == null ? 0.7 : o.fade), uId: uv(o.id == null ? 200 : o.id), uShade: uv(o.shade ? 1 : 0), uPix: uv(o.pix ? 1 : 0), uAdd: uv(o.add ? 1 : 0), uA: uv(o.a == null ? 1 : o.a) }, o.pix ? {} : o.add ? addBlend() : softBlend());
    const pts = new T.Points(g, m); pts.frustumCulled = false; if (o.pix) pts.layers.set(1); return pts; };
  /* Lys oppå: mode 0 ring (flat på bakken), 1 glød (vend den mot kameraet med K.face). */
  K.light = (mode, col, o) => { o = o || {}; const g = mode === 0 ? new T.RingGeometry(0.6, 1, 40, 1).rotateX(-PI / 2) : new T.PlaneGeometry(1, 1);
    if (mode === 0) { const u = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < u.count; i++) u.setXY(i, 0, (Math.hypot(p.getX(i), p.getZ(i)) - 0.6) / 0.4); }
    const m = new T.Mesh(g, sm(VS, FS_ADD, { uC: uv(u3(col)), uA: uv(1), uMode: uv(mode) }, Object.assign(addBlend(), { side: T.DoubleSide, depthTest: o.depth !== false }))); m.frustumCulled = false; return m; };
  /* Figuren: modellen fra pakken med våre materialer, og en rigg. Poser er { Ben: [rx, ry, rz, (px, py, pz)] } lagt oppå hvilestillingen;
     '*Arm' gjelder både LArm og RArm (speilet, så bevegelsen blir lik på begge sider). add(pose, vekt) legger sammen, apply() setter benene.
     Aksene (målt med dev/g3d): y løfter og senker, z til siden, x vrir. Figuren ligger i lag 1 og tegnes i den lave oppløsningen. */
  const MIR = [1, 0, 1, 1, 0, 0];   /* høyre side av figuren er speilet: rotasjon om x og z (og flytting i x) snur fortegn, y er lik */
  K.figure = (gltf, o) => { o = o || {}; const root = gltf.scene, bones = {}, rest = {}, acc = {}, mats = {}, ex = {};
    root.traverse(q => { if (q.isBone) { bones[q.name] = q; rest[q.name] = [q.rotation.x, q.rotation.y, q.rotation.z, q.position.x, q.position.y, q.position.z]; }
      if (q.isMesh) { q.frustumCulled = false; q.layers.set(1); const n = q.material.name || q.name; if (o.hide && o.hide.test(n + ' ' + q.name)) { q.visible = false; return; }
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

  /* ---------- Cutscenene ---------- G3D.def(id, { len, fps, models, make(K, T) → S, act(S, t, o), shots: [[start, fn(S, u, tau, t)]] }).
     S.scene er scenen, S.figs figurene. act er skuespillet (én sammenhengende handling), shots er kameraene som klipper mellom bilder av den.
     S.post er det kameraet ber om for bildet: sh risting, fl/flc blink, fade/fadec, heat/heatY varmeflimmer, vig, spd fartsstreker (spx, spy, spr), swirl. */
  const DEF = {}, jobs = {};
  G.def = (id, d) => { DEF[id] = d; };
  G.has = id => !!DEF[id];
  G.info = id => DEF[id] ? { len: DEF[id].len, hold: DEF[id].hold || 0, R: DEF[id].R || 0, at: DEF[id].at || 0 } : null;
  G.ready = id => jobs[id] || (jobs[id] = (async () => {
    const D = DEF[id]; if (!D || !G.can()) throw new Error('no 3d');
    await G.boot(); await Promise.all((D.models || []).map(loadModel));
    D.S = D.make(K, T); D.S.post = {}; G.frame(id, 0, {}); if (G.err) throw new Error(G.err);
    return true;
  })().catch(e => { G.err = String(e && e.stack || e); jobs[id] = null; throw e; }));
  G.isReady = id => !!(DEF[id] && DEF[id].S && !G.dead);
  const P0 = () => ({ sh: 0, fl: 0, flc: '#ffffff', fade: 0, fadec: '#000000', heat: 0, heatY: 60, spd: 0, spx: 128, spy: 96, spr: 0.3, swirl: 0, vig: 0.5, ink: 1 });
  /* Kameraet: fra, mot, synsvinkel, og en helling (roll) for lave, skjeve vinkler. */
  K.cam = (px, py, pz, tx, ty, tz, fov, roll) => { cam.position.set(px, py, pz); cam.up.set(0, 1, 0); cam.lookAt(tx, ty, tz); if (roll) cam.rotateZ(roll); if (cam.fov !== (fov || 40)) { cam.fov = fov || 40; cam.updateProjectionMatrix(); } };
  K.U = () => U; K.face = m => { m.quaternion.copy(cam.quaternion); return m; }; K.camPos = () => cam.position;
  /* Et punkt i verden → filmens piksler (512 × 384). z > 1 = bak kameraet. */
  const pv = () => new T.Vector3();
  K.proj = (x, y, z) => { const v = pv().set(x, y, z).project(cam); return { x: (v.x * 0.5 + 0.5) * 512, y: (0.5 - v.y * 0.5) * 384, z: v.z }; };
  /* Det 2D-bakteppet trenger: horisonten rett fram på skjermen (x, y), hellingen, piksler per radian, og hvor kameraet ser (yaw 0 = mot −Z). */
  G.view = () => { const d = cam.getWorldDirection(pv()), yaw = Math.atan2(d.x, -d.z), p = cam.position, a = K.proj(p.x + sin(yaw) * 1e5, p.y, p.z - cos(yaw) * 1e5), b = K.proj(p.x + sin(yaw + 0.05) * 1e5, p.y, p.z - cos(yaw + 0.05) * 1e5);
    return { x: a.x, y: a.y, ang: Math.atan2(b.y - a.y, b.x - a.x), ppr: Math.hypot(b.x - a.x, b.y - a.y) / 0.05, yaw, pitch: Math.asin(c01(d.y * 0.5 + 0.5) * 2 - 1), cx: p.x, cy: p.y, cz: p.z }; };
  /* Tegner ett bilde av cutscenen på tidspunktet t (sekunder) på motorens eget lerret (gjennomsiktig der himmelen er), og gir lerretet.
     o = { name, lv, cap, cc }, rs = filmens oppløsning (1 eller 1,5). */
  G.frame = (id, t, o, rs) => {
    const D = DEF[id], S = D && D.S; if (!S || G.dead) return null;
    try {
      scale(rs || 1);
      const fps = D.fps || 30, tq = floor(t * fps + 1e-6) / fps, P = S.post = P0(); U.uTime.value = tq;
      o = Object.assign({}, o || {}, { out: (o && o.out) || G.out || 0 });
      for (const f of S.figs || []) f.clear();
      D.act(S, tq, o); for (const f of S.figs || []) f.apply();
      let si = 0; for (let i = 0; i < D.shots.length; i++) if (tq >= D.shots[i][0] - 1e-6) si = i;
      const s0 = D.shots[si][0], s1 = si + 1 < D.shots.length ? D.shots[si + 1][0] : D.len; S.shot = si;
      D.shots[si][1](S, c01((tq - s0) / max(1e-6, s1 - s0)), tq - s0, tq);
      if (o.out > 0) { P.swirl = max(P.swirl, c01(o.out * 1.25)); P.fl = max(P.fl, seg(o.out, 0.62, 1)); P.flc = '#ffffff'; }
      S.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
      const pu = post.uniforms, fn = floor(tq * fps);
      pu.uSpd.value.set(P.spx, G.H - P.spy, P.spd, P.spr); pu.uSwirl.value = P.swirl; pu.uInkK.value = P.ink; pu.uFrame.value = fn; pu.uNF.value.set(cam.near, cam.far);
      cam.layers.set(0); R.setRenderTarget(rtE); R.clear(); R.render(S.scene, cam);
      cam.layers.set(1); R.setRenderTarget(rtF); R.clear(); R.render(S.scene, cam);
      R.setRenderTarget(null); R.clear(); R.render(postScene, postCam);
      G.err = '';
    } catch (e) { G.err = String(e && e.stack || e); }
    return cv;
  };
  /* Tekst i figurens lave oppløsning: tegnes på et lite lerret, alfa gjøres hard, og en mørk kant legges rundt. Gir lerretet (256 × 192). */
  let tcv = null, tx = null;
  G.text = fn => { if (!tcv) { tcv = document.createElement('canvas'); tcv.width = G.W; tcv.height = G.H; tx = tcv.getContext('2d', { willReadFrequently: true }); }
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, G.W, G.H); tx.save(); fn(tx); tx.restore();
    const im = tx.getImageData(0, 0, G.W, G.H), d = im.data, n = G.W * G.H, on = new Uint8Array(n); for (let i = 0; i < n; i++) on[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) { const i = y * G.W + x, q = i * 4; if (on[i]) { d[q + 3] = 255; continue; }
      let e = 0; for (let dy = -1; dy <= 1 && !e; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < G.W && yy < G.H && on[yy * G.W + xx]) { e = 1; break; } }
      if (e) { d[q] = 22; d[q + 1] = 8; d[q + 2] = 10; d[q + 3] = 255; } else d[q + 3] = 0; }
    tx.putImageData(im, 0, 0); return tcv; };
  G.K = K; G.T = () => T; G.canvas = () => cv; G.S = id => DEF[id] && DEF[id].S; G.post = id => (DEF[id] && DEF[id].S && DEF[id].S.post) || P0();
  return G;
})();
