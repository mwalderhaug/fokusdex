'use strict';
/* Fokusdex – cutscener i 3D: motoren (G3D). Verktøykassa til cutscenene er raid3c.js (G3C), og hver art har sin egen fil i c3/.
   three.js og modellene er IKKE en del av appen: de ligger bare i ressurspakken (3d/g3d.js, Draco-dekoderen og 3d/<navn>.glb) og hentes først når en
   cutscene skal spilles. pack.js setter G3D.src når pakken har dem. Uten pakke (eller uten WebGL 2) finnes det ingen cutscene, og sprite-filmen spilles som før.
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
  let T = null, R = null, cv = null, rtE = null, rtF = null, post = null, postScene = null, postCam = null, cam = null, bootJob = null, U = null, rsNow = 0, lastKey = '';

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
varying vec3 vW, vN, vO; varying vec2 vUv; uniform vec2 uUvOff; uniform mat3 uOm; uniform vec3 uOo;
void main(){ vUv = uv + uUvOff; vO = uOm * position + uOo;
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 w = modelMatrix * vec4(transformed, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * objectNormal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FS_FIG = `varying vec3 vW, vN, vO; varying vec2 vUv; uniform sampler2D map;
uniform float uId, uStone, uCrack, uCrackR, uSeam, uSeamOn, uEmis, uFlK, uB1, uB2, uMask, uVor, uGl, uCw, uHalo, uSpill, uWk, uWh; uniform vec3 uCrackC, uCrackO, uFlC, uStoneC, uMul, uHead, uKf; uniform vec2 uTx;
${COMMON}
void main(){
  vec4 tx = texture2D(map, vUv); vec3 base = tx.rgb; float lum = dot(base, vec3(.3, .59, .11));
  if (uMask > .5) { float m = max(tx.r, max(tx.g, tx.b)); if (m < .35) discard; gl_FragColor = vec4(uCrackC * (.7 + .5 * m) * uCrack, uId / 255.); return; }
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 V = normalize(cameraPosition - vW);
  /* Sømmene i teksturen (de mørke strekene) er der lyset kommer fram. uCw gjør streken bredere; l2 leter lenger ut og gir gløden rundt den. */
  float lm = lum, l2 = lum; if (uSeamOn > .5 && uCrack > 0.) { for (int i = 0; i < 4; i++) { vec2 o = (i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.)) * uTx * uCw; lm = min(lm, dot(texture2D(map, vUv + o).rgb, vec3(.3, .59, .11))); if (uHalo > 0.) l2 = min(l2, dot(texture2D(map, vUv + o * 2.4 + o.yx * .9).rgb, vec3(.3, .59, .11))); } l2 = min(l2, lm); }
  float seam = (1. - smoothstep(uSeam - .05, uSeam + .05, lm)) * uSeamOn;
  float st = step(vn3(vO * .42) * .8 + vn3(vO * 1.7) * .2, uStone * 1.3 - .15);
  base = mix(base, uStoneC * (.4 + lum * 1.05), st) * uMul;
  float d = dot(N, dot(uKf, uKf) > .01 ? uKf : uKey), tn = tone3(d, uB1, uB2);   /* uKf: figurens eget nøkkellys (kampen); null = stedets */
  /* Steinen er nøytralt grå: lyset på den mister fargen, gløden nedenfra når bare det nederste, og kantlyset er blekt (Jazz 18.11: «mer tydelig at han er helt grå»). */
  vec3 lit = mix(uShC, uKeyC, tn); lit = mix(lit, vec3(dot(lit, vec3(.34, .33, .33))) * vec3(.99, .96, 1.05), st * .88);
  vec3 col = base * lit;
  col += uLavaC * floor(underK(N, vW, .25) * 4. + .5) / 4. * uGlow * uGl * (1. - .78 * st) * (.3 + .7 * base);
  float rim = step(.56, (1. - max(dot(N, V), 0.)) * (dot(N, uRim) * .5 + .5));
  col = mix(col, mix(uRimC, vec3(.8, .72, .8), st) * (.55 + .6 * base), rim * uRimK * (1. - .3 * st));
  col = mix(col, base * 1.25, uEmis);
  float fr = step(distance(vO, uCrackO) + (vn3(vO * 2.3) - .5) * 1.6, uCrackR) * (1. - uHead.z * step(uHead.x, vO.z) * step(uHead.y, vO.y));
  float vc = 0., vh = 0.; if (uVor > 0. && uCrack > 0. && uSeamOn > .5) { vec2 q = vec2(vO.x + vO.z * .55, vO.y + vO.z * .35) * .58; q += (vec2(vn(q * 2.3), vn(q * 2.3 + 9.)) - .5) * .55; vec3 v = voro(q); float e = v.y - v.x; vc = (1. - smoothstep(.05 * uCw, .12 * uCw, e)) * uVor; vh = (1. - smoothstep(.1 * uCw, .55 * uCw, e)) * uVor; }
  /* Lyset i sprekkene: selve streken (ln), en glød rundt den (uHalo) og et skjær over steinen der lyset har nådd (uSpill). */
  float ln = max(seam, vc) * fr * uCrack, hl = max((1. - smoothstep(uSeam - .05, uSeam + .05, l2)) * uSeamOn, vh) * fr;
  col += uCrackC * (hl * uHalo + uSpill * fr) * (1. - ln);
  col = mix(col, uCrackC, ln);
  /* Der han går ned i lavaen, gløder han: tre harde trinn fra hvitgult ved overflaten til ingenting (uWh over den). */
  float wb = floor(clamp(1. - (vW.y - uLavaY) / uWh, 0., 1.) * 2. + .8) / 2.; col += mix(vec3(.9, .3, .04), vec3(1., .62, .16), wb) * wb * uWk * (.75 - .3 * st);   /* lagt oppå som varme, ikke blandet inn (det ble et blekt bånd) */
  col = mix(col, uFlC, uFlK);
  float fg = floor(fogK(vW) * 6. + .5) / 6.;
  gl_FragColor = vec4(mix(col, uFogC, fg), uId / 255.);
}`;
  /* Stein (omgivelsene): ru basalt (Jazz 18.11, runde 9: «for glatte: gi dem mer tekstur (ru basalt, sprekker, gjerne svak glød i kantene), så de står tydelig mot lavaen»).
     · Mønsteret legges på flaten fasetten vender mest mot (skiftet skjer i kantene, der lyset uansett skifter): korn og porer i flere størrelser, og en høyde som bøyer
       lyset (bump), så lyset faller ujevnt. Det fine tones ut før det blir mindre enn en piksel (ingen flimmer).
     · Sprekker i to størrelser (voronoi): mørke streker, og nær lavaen gløder de svakt oransje inni.
     · Kanten: glød fra lavaen langs omrisset (sterkest nede ved lavaen), og den glødende foten der steinen står i lavaen.
     · uFar = fjellveggene i bakgrunnen (runde 9, punkt 6: «litt mer tekstur (lavastriper, sprekker, ru stein), men dempet av dis og med mindre kontrast enn forgrunnen»):
       mønsteret i større mål og rundt sjøen (ingen søm foran), renner nedover veggen, noen svake lavastriper nederst, halv kontrast og et slør av dis.
     · Kantlyset fra lavaen ligger på sidene, ikke på flatene på toppen (sett skrått fikk de et oransje slør og skilte seg ikke fra lavaen).
     uSm = hvor avrundet, uRough = hvor ru, uCrust = størknet skorpe (tettere sprekker med glød i), uCk = hvor tydelige sprekkene og porene er (1 = fullt). */
  const FS_ROCK = `varying vec3 vW, vN, vO; uniform vec3 uA, uB, uTint; uniform float uStr, uTop, uSm, uHot, uRough, uCrust, uFar, uCk, uSc, uLv;
${COMMON}
float hgt(vec2 s, float l2, float l3){ return fbm(s * 1.6) * .55 + fbm(s * 4.7 + 3.1) * .3 * l2 + vn(s * 12.) * .15 * l3; }
void main(){
  vec3 Nf = normalize(cross(dFdx(vW), dFdy(vW))), Ns = normalize(vN); if (dot(Ns, Nf) < 0.) Ns = -Ns; vec3 N = normalize(mix(Nf, Ns, uSm)), V = normalize(cameraPosition - vW);
  vec3 an = abs(Nf), U = vec3(1., 0., 0.), W = vec3(0., 0., 1.); vec2 sp = vW.xz;
  if (an.y < .66) { if (uFar > .5) { float rr = max(length(vW.xz), 1.); sp = vec2(atan(vW.x, -vW.z) * rr, vW.y); U = vec3(-vW.z, 0., vW.x) / rr; W = vec3(0., 1., 0.); }
    else if (an.x > an.z) { sp = vW.zy; U = vec3(0., 0., 1.); W = vec3(0., 1., 0.); } else { sp = vW.xy; W = vec3(0., 1., 0.); } }
  float sc = mix(1., .22, uFar) * uSc, fw = max(length(dFdx(vW)), length(dFdy(vW))) * sc; vec2 s = sp * sc;
  float l2 = 1. - smoothstep(.07, .16, fw), l3 = 1. - smoothstep(.03, .07, fw), bk = 1. - smoothstep(.1, .35, fw);
  float h = hgt(s, l2, l3), e = .03; vec3 gr = (U * (hgt(s + vec2(e, 0.), l2, l3) - h) + W * (hgt(s + vec2(0., e), l2, l3) - h)) / e; gr -= N * dot(N, gr);
  vec3 Nb = normalize(N - gr * .3 * uRough * bk * (1. - .3 * uFar));
  float f1 = .5 + .45 * uCrust; vec3 c1 = voro(s * f1 + fbm(s * .3) * .8); float a1 = fw * f1;
  float k1 = (1. - smoothstep(.015, .015 + max(.035, a1 * 1.6), c1.y - c1.x)) * (1. - smoothstep(.12, .35, a1));
  vec3 c2 = voro(s * .09 + 7.3); float a2 = fw * .09, k2 = (1. - smoothstep(.01, .01 + max(.025, a2 * 1.6), c2.y - c2.x)) * (1. - smoothstep(.12, .35, a2));
  float crk = max(k1, k2) * (1. - .3 * uFar) * uCk, pore = smoothstep(.72, .8, vn(s * 7.5 + 7.)) * (1. - smoothstep(.1, .3, fw * 7.5)) * (1. - .6 * uFar) * uCk;
  float n1 = fbm(vec2(vW.y * uStr + fbm(vW.xz * .05) * 1.8, vW.x * .021 + vW.z * .013)), side = 1. - smoothstep(.5, .8, abs(N.y)), dy = vW.y - uLavaY;
  float gul = smoothstep(.45, .75, fbm(vec2(s.x * .9, vW.y * .011 + s.x * .1))) * side * uFar;
  vec3 base = mix(uA, uB, smoothstep(.35, .65, n1)) * (.6 + .7 * h); base = mix(base, uB * 1.15, smoothstep(.6, .9, N.y) * uTop * (.5 + .5 * h));
  base *= (1. - .7 * crk) * (1. - .45 * pore) * (1. - .4 * gul);
  vec3 col = base * mix(uShC, uKeyC, smoothstep(.25, .9, dot(Nb, uKey) * .5 + .5));
  float ug = underK(Nb, vW, .6); col += uLavaC * ug * ug * uGlow * .8;
  float hot = 1. - smoothstep(0., 1.8 * uHot, dy); col += vec3(1., .4, .07) * hot * hot * uGlow * uLv;
  float cg = crk * (1. - smoothstep(0., .5 + 2.7 * uCrust, dy)) * (.35 + .65 * uCrust) * uLv; col = mix(col, vec3(1., .42, .08) * (.7 + .5 * uGlow), cg * .85);
  float ls = abs(fbm(vec2(s.x * .45, vW.y * .0045 + 3.)) - .5), lst = (1. - smoothstep(.01, .045, ls)) * side * uFar * smoothstep(.55, .7, fbm(vec2(s.x * .15, 1.))) * (1. - smoothstep(2., 18., dy));
  col += vec3(.9, .22, .04) * lst * (.45 + .4 * uGlow) * uLv;
  /* Runde 10 («fortsatt for glatte») og runde 11 («akkurat for realistisk slik at det skiller seg litt»): lysere rygger og mørkere søkk oppå, så mønsteret synes også i den nesten
     svarte steinen, men svakt (halvparten av runde 10) og uten de ekstra lavastripene. */
  float fd = (h - .5) * 2.2 + 1.8 * (dot(Nb, uKey) - dot(N, uKey)) - .7 * crk; col += uTint * clamp(fd, -.6, 1.) * .2 * uFar * bk;
  float rim = pow(1. - max(dot(Nb, V), 0.), 3.);
  col += uRimC * rim * (dot(Nb, uRim) * .5 + .5) * uRimK * .5 * (.4 + .6 * side) + vec3(1., .38, .08) * rim * uGlow * .5 * (1. - smoothstep(0., 5., dy)) * (1. - .5 * uFar) * side * uLv;
  col = mix(col, uFogC, .12 * uFar);
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.);
}`;
  /* Vulkanen: mørk basalt med renner nedover (støy strukket langs fallet), lysere aske mot toppen, og lavaelver som følger rennene fra krateret
     (uEr = hvor sterkt utbruddet er). vUv = (rundt fjellet 0–1, høyden 0–1). Støyen regnes på en sirkel (og høyden), så den har ingen søm.
     Runde 9 (Jazz 18.11: «litt for glatte: gi dem litt mer tekstur (lavastriper, sprekker, ru stein), men dempet av dis og med mindre kontrast enn forgrunnen, så de blir
     liggende bak og ikke tar blikket fra Groudon») og runde 10 («fortsatt for glatte»): teksturen var der, men under disen ble den borte (rundt ±13 % i lyset).
     Nå: rygger og knauser som renner nedover fjellet i to størrelser og korn (3D-støy på sirkelen og høyden, strukket langs fallet), lyset som faller ujevnt på dem,
     sprekker i to størrelser, flekker av mørkere og lysere stein, og flere størknede lavastriper (smale, mørkt rødoransje) ned fra krateret. Disen legges på først,
     og teksturen oppå, og til slutt et tynt slør av dis.
     Runde 11 (Jazz: «Fjellene bak ble akkurat for realistisk slik at det skiller seg litt»): skrudd ned til rundt halvparten (rundt ±15 %), uten det fine kornet og de fine
     sprekkene, med ett sett lavastriper og litt mer dis: de store formene (rygger, renner) blir, detaljene som gjorde det fotografisk, er borte. */
  const FS_VOLC = `varying vec3 vW, vN; varying vec2 vUv; uniform vec3 uA, uB; uniform float uEr;
${COMMON}
float fbm3(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn3(p); p = p * 2.03 + vec3(17.3, 9.1, 4.7); a *= .5; } return s; }
void main(){
  float a = vUv.x * 6.2832, v = vUv.y; vec2 c = vec2(cos(a), sin(a));
  vec3 Nf = normalize(cross(dFdx(vW), dFdy(vW))), Ns = normalize(vN); if (dot(Ns, Nf) < 0.) Ns = -Ns; vec3 N = normalize(mix(Nf, Ns, .7));
  float g1 = fbm(c * 9. + vec2(v * 1.3, 0.)), g2 = fbm(c * 24. + v * 2.), streak = fbm(vec2(c.x * 30. + g1 * 2., c.y * 30. + v * 2.5));
  float fa = length(vec2(dFdx(vUv.x), dFdy(vUv.x))) * 6.2832, lf = 1. - smoothstep(.2, .45, fa * 60.);
  vec3 q = vec3(c * 18., v * 5.);
  float rg = smoothstep(.5, .95, 1. - abs(fbm3(q) * 2. - 1.)), rg2 = fbm3(q * vec3(2.6, 2.6, 2.2) + 7.);
  float h = rg * .55 + (rg2 - .5) * .6 * lf;
  vec3 dpx = dFdx(vW), dpy = dFdy(vW), r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
  vec3 Nb = normalize(abs(det) * N - sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * 5.); if (dot(Nb, N) < .35) Nb = N;
  float k1 = abs(fbm3(vec3(c * 24., v * 8.) + 3.) - .5);
  float crack = (1. - smoothstep(.006, .03, k1)) * (1. - smoothstep(.3, .6, fa * 24.));
  float sk = abs(fbm3(vec3(c * 34., v * 1.6) + 5.) - .5);
  float lstr = (1. - smoothstep(.008, .04, sk)) * smoothstep(.3, .5, fbm3(vec3(c * 5., v * .8) + 2.)) * smoothstep(.05, .5, v) * (1. - smoothstep(.3, .6, fa * 34.));
  float pa = fbm3(vec3(c * 6., v * 2.) + 4.);
  vec3 base = mix(uA, uB, smoothstep(.35, .7, streak * .6 + g2 * .4)) * (.7 + .6 * g1); base = mix(base, uB * 1.3, smoothstep(.5, .95, v) * .45);
  float lb = smoothstep(.2, .9, dot(Nb, uKey) * .5 + .5), l0 = smoothstep(.2, .9, dot(N, uKey) * .5 + .5);
  float tx = (.8 + .45 * h) * (1. - .35 * crack) * (.82 + .36 * smoothstep(.3, .7, pa)) * (1. + 1.1 * (lb - l0));
  vec3 col = base * mix(uShC, uKeyC, l0);
  col += uRimC * pow(1. - max(dot(N, normalize(cameraPosition - vW)), 0.), 2.5) * (dot(N, uRim) * .5 + .5) * .35;
  float ch = abs(fbm(c * 5. + vec2(0., v * .6)) - .5), w = .01 + .018 * v;
  float river = (1. - smoothstep(w, w * 2.8, ch)) * smoothstep(.1 + .42 * (1. - min(uEr, 1.)), 1., v + fbm(c * 3.) * .35);
  float flow = .7 + .3 * sin(v * 60. - uTime * 3. + g1 * 9.);
  vec3 hot = mix(vec3(.7, .09, .02), vec3(1., .72, .2), smoothstep(.3, 1., v) * flow) * (.55 + .9 * min(uEr, 1.6));
  float fg = fogK(vW); col = mix(col, uFogC, fg);
  col *= mix(1., tx, .5 - .1 * fg);   /* teksturen og stripene dempes av disen, men forsvinner ikke */
  float dt = (rg - .5) * 1.1 + (rg2 - .5) * 1.1 * lf + 1.6 * (lb - l0);
  col += vec3(.2, .09, .065) * clamp(dt, -.6, 1.) * (.22 - .07 * fg);   /* ru stein som synes også der fjellet ligger i skygge: lysere rygger og korn, mørkere søkk */
  col += vec3(.62, .14, .03) * lstr * (.26 + .3 * min(uEr, 1.)) * (1. - .4 * fg) * (.6 + .5 * pa) + vec3(.55, .12, .03) * crack * .08 * (1. - .5 * fg);
  col = mix(col, uFogC, .12);
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
  /* Lavasjøen (Jazz 18.11, runde 8): smeltet, oransje lava over hele flaten, ingen mørk skorpe med sprekker. Bare steinflakene (egne steiner i scenen) er mørke.
     · Mønsteret (lv): store varmere og kjøligere felt, mørkere hud i flekker med tau i (avkjølt, mørk rødoransje, ikke svart) og lyse renner.
     · Strømmen: mønsteret flyter langs et felt som peker mest fra vulkanen mot kameraet og svinger litt, i to faser som tones over i hverandre (flytkart), så det
       flyter i det uendelige uten at formene strekkes ut, og de mørke og lyse partiene flytter på seg som på ekte lava (rundt 0,6 enheter i sekundet).
     · Pusten: store flater gløder sterkere og svakere, langsomt (rundt 9 s) og i hver sin takt.
     · Boblene (uPop: x, z, takt, fase): stedet gløder opp like før, og en lysende ring brer seg når klumpene spretter opp (partiklene i raid3c.js, samme takt).
     Fine detaljer tones ut på avstand (fd, lod). uK = verktøykassas mål per enhet. Ringer ved nedslag (uRing) og kulpen rundt det som står i lavaen (uWade). */
  /* Skorpen på lavaen, delt mellom lavaflaten og boblene (K.domes): crDrift = hvor fort flakene driver (live = 1 i kampen: 0,35 enheter/s, ellers 0,2), og plateAt = om et
     punkt ligger under et skorpeflak akkurat nå (samme regning som i FS_LAVA, uten utjevningen for avstand). */
  const LAVA_CR = `/* Voronoi med id-en til nabocellen også (vor2), og om en celle er skorpe akkurat nå (crust): hver celle smelter og størkner i sin egen takt. */
vec3 vor2(vec2 p, out float i2){ vec2 i = floor(p), f = fract(p); float a = 8., b = 8., id = 0., jd = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), r = g + h22(i + g) - f; float d = dot(r, r), h = h21(i + g + 3.7);
    if (d < a) { b = a; jd = id; a = d; id = h; } else if (d < b) { b = d; jd = h; } }
  i2 = jd; return vec3(sqrt(a), sqrt(b), id); }
float crust(float id, float t){ return smoothstep(id - .05, id + .05, .36 + .08 * sin(t * .04 + id * 9.)); }
vec2 crDrift(float live){ return mix(vec2(.015, .055), vec2(.027, .096), live); }
float plateAt(vec2 xz, float t, float k, float cell, float live){ vec2 q = xz * k / cell * .55, rb = q * 2.6 - crDrift(live) * t, rc = rb + (vec2(fbm(rb * .2 + 4.), fbm(rb * .2 + 9.)) - .5) * .9 + (vec2(vn(rb * 1.7 + 1.), vn(rb * 1.7 + 7.)) - .5) * .28;
  float id2; vec3 cv = vor2(rc, id2); float ce = cv.y - cv.x; return crust(cv.z, t) * mix(smoothstep(.02, .09, ce), smoothstep(0., .03, ce), crust(id2, t)); }
`;
  const FS_LAVA = `varying vec3 vW; uniform vec4 uRing[4]; uniform vec4 uWade; uniform vec4 uPop[16]; uniform float uHeat, uK, uCell, uCw, uBri, uLive;
${COMMON}
vec3 ramp(float x){ vec3 c = vec3(.028, .006, .002); c = mix(c, vec3(.4, .028, .0), smoothstep(0., .3, x)); c = mix(c, vec3(.98, .24, .02), smoothstep(.24, .6, x)); c = mix(c, vec3(1., .66, .14), smoothstep(.56, .92, x)); return mix(c, vec3(1., .95, .72), smoothstep(.9, 1.35, x)); }
${LAVA_CR}
float lv(vec2 r, float t, float fd, float px){
  float big = fbm(r * .7 + vec2(0., t * .015)), mid = fbm(r * 1.9 + 5.2 - vec2(t * .02, 0.));
  float skin = smoothstep(.44, .68, fbm(r * 1.3 + vec2(2., 6.) + big * .8));
  float rope = (.5 + .5 * sin(r.y * 12. + big * 7. + mid * 4.)) * fd;
  float ch = abs(fbm(r * 1.1 + vec2(11., 4.)) - .5), vw = .028 + .025 * mid + 1.6 * px, vein = (1. - smoothstep(vw * .25, vw, ch)) * (1. - .6 * skin);
  float tp = .7 + .3 * (big - .5) + .12 * (mid - .5) - .2 * skin - .07 * rope * skin;
  return mix(tp, 1.04, vein * .92);
}
void main(){
  vec2 w = vW.xz * uK; float t = uTime, heat = uHeat, cell = uCell; vec2 p = w / cell;
  float fw = max(length(dFdx(w)), length(dFdy(w))), px = fw / cell, fd = 1. - clamp(px / .07, 0., 1.);
  vec2 q = p * .55, fl = vec2(.18, .62) + (vec2(fbm(q * .3 + 1.3), fbm(q * .3 + 8.1)) - .5) * 1.1;
  float ph = t * mix(.09, .13, uLive), f0 = fract(ph), f1 = fract(ph + .5), wa = 1. - abs(2. * f0 - 1.);
  float temp = mix(lv(q - fl * f1 * 1.1 + vec2(3.7, 1.9), t, fd, px), lv(q - fl * f0 * 1.1, t, fd, px), wa);
  temp += .07 * sin(t * .7 + fbm(p * .1 + 3.3) * 7.) + .08 * (heat - 1.);
  /* Skorpe som driver (runde 9: «gi den litt mørkere skorpe som driver og årer som lyser sterkere, så den ser ut som lava og ikke tåke»): flak av størknet skorpe som flyter
     sakte og stivt med strømmen (mønsteret regnes i et koordinatsystem som flytter seg, så flakene holder formen), med ujevne kanter. Rundt en tredel er skorpe, og flakene
     smelter og størkner sakte (hver i sin takt, over et halvt minutt). Mot åpen lava smelter kanten gradvis ut (ingen lys strek rundt flaket); mellom to flak går en smal,
     lysende sprekk. På avstand blir flakene til en jevn, litt mørkere tone (cf). */
  vec2 rb = q * 2.6 - crDrift(uLive) * t, rc = rb + (vec2(fbm(rb * .2 + 4.), fbm(rb * .2 + 9.)) - .5) * .9 + (vec2(vn(rb * 1.7 + 1.), vn(rb * 1.7 + 7.)) - .5) * .28;
  float id2; vec3 cv = vor2(rc, id2); float ce = cv.y - cv.x, cfw = px * 1.43, cf = clamp(cfw / .3, 0., 1.);
  float k1 = crust(cv.z, t), k2 = crust(id2, t), ew = .09 + cfw * 1.5, cw = .03 + cfw * 1.5, wr = fbm(rc * 5.);
  float plate = mix(k1 * mix(smoothstep(.02, ew, ce), smoothstep(0., cw, ce), k2), .3, cf), crack = k1 * k2 * (1. - smoothstep(0., cw, ce)) * (1. - cf);
  if (uLive > .5) for (int i = 0; i < 16; i++) { vec4 s = uPop[i]; if (s.z <= 0.) continue; float o = smoothstep(.75, 1.6, length(vW.xz - s.xy) + (wr - .5) * .5); plate *= o; crack *= o; }
  temp = mix(temp, .14 + .08 * wr + .03 * sin(rc.y * 18. + wr * 5.) * (1. - cf), plate * .95);
  temp = mix(temp, 1.02, crack * .85);
  for (int i = 0; i < 16; i++) { vec4 s = uPop[i]; if (s.z <= 0.) continue; float a = mod(t + s.w, s.z), d = length(vW.xz - s.xy);
    if (uLive > .5) temp += .28 * smoothstep(s.z - 1.2, s.z, a) * (1. - smoothstep(0., .9, d)) + (a < .9 ? (1. - a / .9) * (.3 * (1. - smoothstep(0., .2 + .12 * a, abs(d - .3 - a * 2.))) + .3 * max(0., 1. - a / .3) * (1. - smoothstep(0., .5, d))) : 0.);
    else temp += .3 * smoothstep(s.z - .5, s.z, a) * (1. - smoothstep(0., 1.1, d)) + (a < .8 ? .5 * (1. - a / .8) * (1. - smoothstep(.15 + a * 2.4, .6 + a * 2.8, d)) : 0.); }
  float rg = 0.; for (int i = 0; i < 4; i++) { vec4 g = uRing[i]; if (g.w > 0.) rg = max(rg, g.w * (1. - smoothstep(0., .5 + g.z * .07, abs(length(vW.xz - g.xy) - g.z)))); }
  temp += rg * .42;
  float dw = length(vW.xz - uWade.xy), wd = min(1., uWade.w) * (1. - smoothstep(uWade.z * .3, uWade.z, dw)), rip = .5 + .5 * sin(dw * 1.7 - t * 2.2 + fbm(vW.xz * .35 + t * .05) * 3.2);
  temp = max(temp, wd * (.8 + .14 * rip * (.4 + .6 * uWade.w)));
  temp += max(0., uWade.w - 1.) * (1. - smoothstep(0., uWade.z * .45, dw)) * .35;
  vec3 c = ramp(temp) * uBri;
  float lod = clamp(fw / (cell * .42), 0., 1.);
  c = mix(c, ramp(.56 + .08 * (heat - 1.) + .05 * vn(vec2(w.x / 190. + t * .02, length(cameraPosition - vW) * uK / 600.))) * uBri, lod * lod);
  gl_FragColor = vec4(mix(c, uFogC, fogK(vW)), 1.);
}`;
  /* HAVET (K.ground('sea')): en flate med ekte høyde. Dønningene flytter punktene i flaten (VS_SEA), så en bølge kan skjule det som ligger bak den, og vannlinja på en
     figur følger sjøen (dybden avgjør, som med lavaen). Lyset regnes fra hellingen: mørkt der vi ser rett ned, himmelen speilet der vi ser langs flaten (uSkyA ved
     horisonten, uSkyB oppe), grønnblått lys i tynne bølgetopper, skum på toppene og i striper etter vinden, og ringer etter regnet. Himmelen bak er 2D (bakteppet),
     så speilingen er fargene stedet setter, ikke et bilde. SEA_H er høyden; K.seaH i JavaScript er samme regning (tallene MÅ være like begge steder).
     uSea = (dønning i enheter, krapp sjø, skum 0–1, regn 0–1) · uWind = (retning x, z, fart, 0) · uRing og uWade som lavaen (ringer ved nedslag, skum rundt det som står i vannet). */
  const SEA_H = `uniform vec4 uSea, uWind;
float crest(float p){ float s = .5 + .5 * sin(p); return 2. * s * s - .75; }
float seaH(vec2 w, float t){ vec2 d = normalize(uWind.xy + vec2(1e-4, 0.)), e = vec2(-d.y, d.x); float a = dot(w, d), b = dot(w, e), sp = uWind.z;
  return uSea.x * (crest(a * .085 + b * .021 - t * .62 * sp + 1.3 * sin(b * .017 + t * .13)) + .45 * crest(a * .151 - b * .064 - t * .86 * sp + 2.1) + .18 * crest(a * .31 + b * .19 - t * 1.25 * sp + 4.)); }
`;
  const VS_SEA = `varying vec3 vW; varying float vH; uniform float uTime;
${SEA_H}
void main(){ vec4 w = modelMatrix * vec4(position, 1.); float k = 1. - smoothstep(180., 420., length(w.xz)); vH = seaH(w.xz, uTime) * k; w.y += vH; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FS_SEA = `varying vec3 vW; varying float vH; uniform vec4 uRing[4]; uniform vec4 uWade, uBody, uBodyD, uGlo; uniform vec3 uDeep, uShal, uSkyA, uSkyB, uFoamC, uGloC; uniform float uBri;
${COMMON}
${SEA_H}
float chop(vec2 w, float t){ return (fbm(w * .32 + vec2(t * .5, t * .31)) - .5) * 1.4 + .3 * sin(w.x * .9 + w.y * .7 + t * 2.3); }
void main(){
  vec2 w = vW.xz; float t = uTime, fw = max(length(dFdx(w)), length(dFdy(w))), lod = 1. - smoothstep(.25, 1.4, fw), far = 1. - smoothstep(180., 420., length(w)), e = .35;
  float h0 = seaH(w, t) * far, hx = seaH(w + vec2(e, 0.), t) * far, hz = seaH(w + vec2(0., e), t) * far, c0 = chop(w, t), ck = uSea.y * lod * .22;
  vec3 N = normalize(vec3(-(hx - h0) / e - (chop(w + vec2(.25, 0.), t) - c0) * ck * 4., 1., -(hz - h0) / e - (chop(w + vec2(0., .25), t) - c0) * ck * 4.)), V = normalize(cameraPosition - vW);
  float fr = pow(1. - max(dot(N, V), 0.), 4.) * .88 + .06; vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 sky = mix(uSkyA, uSkyB, pow(clamp(R.y, 0., 1.), .45));
  float thin = smoothstep(.25, 1.25, h0 / max(uSea.x, .01)) * smoothstep(-.2, .5, dot(N, uKey));
  vec3 body = mix(uDeep, uShal, thin * .8) * (.62 + .4 * smoothstep(-.3, .9, dot(N, uKey) * .5 + .5));
  /* Under overflaten (Kyogre, Jazz 19.11 «kraken»): en enorm mørk kropp (uBody = x, z, halv lengde, styrke; uBodyD = retning x, z, halv bredde, finner) med finner
     til sidene, og lys fra dypet (uGlo = x, z, radius, styrke; uGloC = fargen). Bare i vannets egen farge: speilingen og skummet ligger oppå. */
  float gl = 0.;
  if (uBody.w > 0.) { vec2 dd = normalize(uBodyD.xy + vec2(1e-4, 0.)), q = w - uBody.xy; float a = dot(q, dd) / uBody.z, b = dot(q, vec2(-dd.y, dd.x)) / uBodyD.z, nz = (fbm(w * .09 + t * .05) - .5) * .25;
    float e = a * a + b * b * (1. + .6 * max(0., -a)), f = pow((a - .15) / .42, 2.) + pow((abs(b) - 1.9) / 1.15, 2.), k = max(1. - smoothstep(.45, 1.1, e + nz), (1. - smoothstep(.4, 1.1, f + nz)) * uBodyD.w);
    body *= 1. - .82 * k * uBody.w; }
  if (uGlo.w > 0.) { float d = length(w - uGlo.xy) / max(uGlo.z, .01); gl = exp(-d * d * 2.2) * uGlo.w; body += uGloC * gl; }
  vec3 col = mix(body, sky, fr);
  col += uGloC * gl * .3;
  col += uKeyC * pow(max(dot(R, normalize(uKey + vec3(0., .25, 0.))), 0.), 60.) * .5 * lod;
  /* Skum: på toppene (der dønningen er høyest og bryter), i striper etter vinden, og rundt det som står i vannet (uWade). */
  float fn = fbm(w * .55 + vec2(t * .22, -t * .16)), top = smoothstep(.92, 1.35, h0 / max(uSea.x, .01) + (fn - .5) * 1.1 + c0 * .12 * uSea.y);
  vec2 wd = normalize(uWind.xy + vec2(1e-4, 0.)); float st = fbm(vec2(dot(w, wd) * .12 - t * .2, dot(w, vec2(-wd.y, wd.x)) * 1.4)), streak = smoothstep(.62, .82, st) * smoothstep(.35, .7, fn) * .55;
  float dw = length(w - uWade.xy), wr = uWade.w * (1. - smoothstep(uWade.z * .55, uWade.z, dw)) * smoothstep(.38, .62, fbm(w * 1.3 + vec2(t * .4, 0.)) + .16 * sin(dw * 1.5 - t * 2.2 + 5. * fbm(w * .35)));
  float rg = 0.; for (int i = 0; i < 4; i++) { vec4 g = uRing[i]; if (g.w > 0.) rg = max(rg, g.w * (1. - smoothstep(0., .45 + g.z * .06, abs(length(w - g.xy) - g.z)))); }
  float foam = clamp(max(max(top, streak) * uSea.z, max(wr, rg * .8)), 0., 1.) * (.55 + .45 * lod);
  col = mix(col, uFoamC * (.72 + .28 * smoothstep(-.2, .8, dot(N, uKey))), foam);
  /* Regnet: små ringer i et rutenett, hver i sin takt (tones ut på avstand). */
  if (uSea.w > 0.) { vec2 gp = w / 1.9, ci = floor(gp), o = h22(ci); float ph = fract(t * (.8 + o.x * .6) + o.y), rr = length(fract(gp) - .5 - (o - .5) * .5), ring = exp(-pow((rr - ph * .42) / .05, 2.)) * (1. - ph) * step(o.x, uSea.w); col += uSkyA * ring * .5 * lod; }
  col *= uBri;
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.);
}`;
  /* ISEN (K.ground('ice')): en frossen flate som speiler himmelen uskarpt (fargene stedet setter), med rim i flekker, snøfonner som ligger oppå, fine sprekker i to
     størrelser og glitter i rimet. En sprekk-stjerne kan slå ut fra et punkt (uStar: x, z, radius, styrke). uIce = (speiling, rim, sprekker, snø). */
  const FS_ICE = `varying vec3 vW; uniform vec4 uRing[4]; uniform vec4 uWade, uStar, uIce; uniform vec3 uDeep, uShal, uSkyA, uSkyB, uFoamC; uniform float uBri;
${COMMON}
void main(){
  vec2 w = vW.xz; float t = uTime, fw = max(length(dFdx(w)), length(dFdy(w))), lod = 1. - smoothstep(.2, 1.2, fw);
  vec3 V = normalize(cameraPosition - vW), N = normalize(vec3((fbm(w * .5) - .5) * .12, 1., (fbm(w * .5 + 7.) - .5) * .12));
  float fr = pow(1. - max(dot(N, V), 0.), 3.) * .8 + .1; vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 sky = mix(uSkyA, uSkyB, pow(clamp(R.y + (fbm(w * .16) - .5) * .18, 0., 1.), .5));
  float depth = fbm(w * .07 + 3.), vein = abs(fbm(w * .11 + 11.) - .5);
  vec3 col = mix(mix(uDeep, uShal, smoothstep(.3, .75, depth)), sky, fr * uIce.x);
  col += uShal * (1. - smoothstep(.0, .03, vein)) * .22 * lod;   /* lyse årer dypt i isen */
  vec3 c1 = voro(w * .16 + (vec2(vn(w * .05), vn(w * .05 + 4.)) - .5) * 1.2), c2 = voro(w * .55 + 3.7);
  float k1 = (1. - smoothstep(.0, .02 + fw * .3, c1.y - c1.x)) * (1. - smoothstep(.3, 1.2, fw * .16 * 6.)), k2 = (1. - smoothstep(.0, .03 + fw * .9, c2.y - c2.x)) * lod * .5;
  col += uFoamC * max(k1, k2) * uIce.z * .55;
  float rime = smoothstep(.5, .78, fbm(w * .22 + 3.)) * uIce.y; col = mix(col, uFoamC * (.78 + .2 * fbm(w * 2.4)), rime * .7);
  float snow = smoothstep(.56, .74, fbm(w * .045 + 9.) + .12 * fbm(w * .5)) * uIce.w; vec3 sc = uFoamC * mix(uShC * 1.6 + .25, vec3(1.), smoothstep(-.2, .7, dot(normalize(vec3((fbm(w * .3 + 2.) - .5) * 1.2, 1., (fbm(w * .3 + 5.) - .5) * 1.2)), uKey)));
  col = mix(col, sc, snow);
  float gl = step(.985, h21(floor(w * 9.) + floor(t * 3.) * .37)) * (rime + snow) * lod; col += vec3(1.) * gl * .6;
  if (uStar.w > 0.) { vec2 dv = w - uStar.xy; float L = length(dv), an = atan(dv.y, dv.x), ray = pow(abs(sin(an * 3.5 + vn(vec2(L * .6, an * 2.)) * 2.5)), 40.), inr = 1. - smoothstep(uStar.z * .9, uStar.z, L); col += uFoamC * (ray * inr + exp(-L * L / .8)) * uStar.w * lod; }
  float rg = 0.; for (int i = 0; i < 4; i++) { vec4 g = uRing[i]; if (g.w > 0.) rg = max(rg, g.w * (1. - smoothstep(0., .4 + g.z * .05, abs(length(w - g.xy) - g.z)))); }
  col += uFoamC * rg * .35; float dw = length(w - uWade.xy); col = mix(col, uFoamC, uWade.w * (1. - smoothstep(uWade.z * .4, uWade.z, dw)) * .5);
  col *= uBri;
  gl_FragColor = vec4(mix(col, uFogC, fogK(vW)), 1.);
}`;
  /* Partikler (punkter): banen regnes ut i skyggeleggeren fra frø, fart og tiden, så det ikke finnes noen tilstand. uLoop = 1: evig strøm (glør),
     ellers et utbrudd som starter i uT0. Myke og runde i omgivelsene (lys som legges oppå, eller røyk og støv); uPix = 1: harde firkanter i figurens
     oppløsning (steinflakene som faller av ham), som løses opp i raster. */
  const VS_PTS = `attribute vec3 aV; attribute vec4 aS; varying float vK, vSd, vNr; uniform float uTime, uT0, uLoop, uG, uDrag, uPx, uSway, uFloor, uMin, uPs, uFs, uPix, uNear; uniform vec2 uSz; uniform vec3 uWind;
void main(){ float tau = uLoop > .5 ? mod(uTime + aS.y, aS.z) : uTime - uT0 - aS.y; float k = tau / aS.z; vK = k; vSd = aS.x;
  float dr = 1. - uDrag * clamp(k, 0., 1.) * .5;
  vec3 p = position + aV * tau * dr + vec3(0., -.5 * uG * tau * tau, 0.) + uWind * tau * tau;
  p.x += sin(tau * 2.1 + aS.x * 40.) * uSway; p.z += cos(tau * 1.7 + aS.x * 23.) * uSway;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; vNr = uNear > 0. ? smoothstep(uNear, uNear * 1.8, -mv.z) : 1.;
  gl_PointSize = max(aS.w * uPx / max(-mv.z, .1) * mix(uSz.x, uSz.y, clamp(k, 0., 1.)), uMin) * mix(uPs, uFs, uPix);
  if (k < 0. || k > 1. || p.y < uFloor) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; } }`;
  const FS_PTS = `varying float vK, vSd, vNr; uniform vec3 uC0, uC1, uC2; uniform float uFade, uId, uShade, uPix, uAdd, uA;
${COMMON}
void main(){ vec2 q = gl_PointCoord * 2. - 1.; float fade = 1. - smoothstep(uFade, 1., vK);
  if (uPix > .5) { if (fade < bayer(gl_FragCoord.xy + floor(vSd * 4.))) discard; vec3 c = vK < .34 ? uC0 : vK < .67 ? uC1 : uC2; c *= (q.y + q.x * .35 < -.15) ? 1.2 : (q.y > .45 ? .68 : .9); gl_FragColor = vec4(c, uId / 255.); return; }
  float r2 = dot(q, q); if (r2 > 1.) discard; float a = (1. - r2) * (1. - r2) * fade * uA * vNr;
  vec3 c = mix(mix(uC0, uC1, smoothstep(0., .5, vK)), uC2, smoothstep(.5, 1., vK)); if (uShade > .5) c *= mix(1.2, .62, smoothstep(-.6, .7, q.y + q.x * .3));
  gl_FragColor = uAdd > .5 ? vec4(c * a, 0.) : vec4(c * a, a);
}`;
  /* Steinflak og krystallbiter (piksler): flate sider i tre toner, som figuren. uGrey = hvor mye lyset mister fargen (stein), uEm = eget lys (krystall). */
  const VS_SHARD = `varying vec3 vW; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FS_SHARD = `varying vec3 vW; uniform vec3 uC; uniform float uId, uGrey, uEm;
${COMMON}
void main(){ vec3 N = normalize(cross(dFdx(vW), dFdy(vW))); float tn = tone3(dot(N, uKey), -.1, .45);
  vec3 lit = mix(uShC, uKeyC, tn); lit = mix(lit, vec3(dot(lit, vec3(.34, .33, .33))) * vec3(.99, .96, 1.05), uGrey);
  vec3 col = uC * lit + uLavaC * floor(underK(N, vW, .25) * 4. + .5) / 4. * uGlow * .25 * (1. - uGrey * .6); col = mix(col, uC * (.8 + .5 * tn), uEm);
  gl_FragColor = vec4(col, uId / 255.); }`;
  /* Krystallen (piksler): hver fasett sin tone, noen blanke. uAl < 1: rastrert gjennomsiktig (det som står inni, skimtes). uDark: den mørkner til nesten svart.
     uCrk: sprekker av lys som brer seg fra forsiden (uCrkR) før den knuses. */
  const FS_GEM = `varying vec3 vW, vO; uniform vec3 uA, uB, uD, uCrkC; uniform float uId, uAl, uDark, uCrk, uCrkR;
${COMMON}
void main(){ if (uAl < bayer(gl_FragCoord.xy)) discard;
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW))), V = normalize(cameraPosition - vW); float d = dot(N, normalize(uKey + vec3(.1, .3, .6))) * .5 + .5, f = h21(floor(N.xy * 9. + .5) + floor(N.z * 9. + .5) * 7.3);
  vec3 col = mix(uA, uB, clamp(floor((d * .7 + f * .5) * 4.) / 3., 0., 1.)); col = mix(col, vec3(1., .95, 1.), step(1.02, d * .62 + f * .52));
  col += uB * step(.62, 1. - max(dot(N, V), 0.)) * .35;
  col = mix(col, uD * (.55 + .9 * f) + uB * .1 * step(.9, f), uDark);
  vec2 q = vO.xy * 1.6 + vO.z * .9; q += (vec2(vn(q * 2.1), vn(q * 2.1 + 7.)) - .5) * .7; vec3 v = voro(q); float cr = (1. - smoothstep(.04, .1, v.y - v.x)) * step(distance(vO, vec3(0., 0., 1.)) + (vn(q * 3.) - .5) * .5, uCrkR);
  col = mix(col, uCrkC, cr * uCrk);
  gl_FragColor = vec4(col, uId / 255.); }`;
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
  const FS_POST = `uniform sampler2D tE, tED, tF, tFD; uniform vec2 uRes, uLo, uNF, uInkW; uniform vec3 uInk; uniform vec4 uSpd, uInkD; uniform float uInkK, uInkO, uSwirl, uFrame, uFig; uniform vec4 uSub; uniform vec3 uSubC, uSpdC;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lin(float z){ return 2. * uNF.x * uNF.y / (uNF.y + uNF.x - (z * 2. - 1.) * (uNF.y - uNF.x)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes, tuv = (floor(uv * uLo) + .5) / uLo; vec4 c = texture2D(tE, uv), f = texture2D(tF, tuv); float id = floor(f.a * 255. + .5);
  if (uFig > .5 && id > .5) { float dF = lin(texture2D(tFD, tuv).x), dE = lin(texture2D(tED, tuv).x);
    if (dF < dE + .03 + dE * .002) { float e = 0., es = 0.;
      for (int i = 0; i < 4; i++) { vec2 o = i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.); vec2 u2 = (floor((uv + o / uInkW) * uLo) + .5) / uLo; float idn = floor(texture2D(tF, u2).a * 255. + .5), dn = lin(texture2D(tFD, u2).x);
        if (abs(idn - id) > .5 && min(idn, id) < 253.5) { if (idn < .5 || dn > dF) e = 1.; } else if (id > 127.5 && dn - dF > uInkD.z + dF * uInkD.w) es = 1.; }
      float ik = uInkK * (1. - smoothstep(uNF.y * .12, uNF.y * .2, dF)); vec3 fc = f.rgb; fc = mix(fc, fc * .32 + uInk * .25, es * ik); fc = mix(fc, uInk, e * ik); c = vec4(fc, 1.); }
    /* Figuren bak omgivelsene skimtes gjennom dem (uSub: under havflaten, inne i en bølge): tonet, svakere jo lenger bak, og det som lyser på den, slår gjennom. Ingen kontur. */
    else if (uSub.x > 0.) { float sk = uSub.x * exp(-(dF - dE) * uSub.y); c.rgb = mix(c.rgb, f.rgb * uSubC, sk) + max(f.rgb - vec3(.55), 0.) * 2.2 * uSub.z * sk; } }
  else if (uFig > .5 && uInkO > 0.) { float dE = lin(texture2D(tED, tuv).x), k = 0.;   /* kant UTENFOR figuren (uInkO): pikselen ved siden av figuren får blekk, så omrisset blir to piksler */
    for (int i = 0; i < 4; i++) { vec2 o = i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.); vec2 u2 = (floor((uv + o / uInkW) * uLo) + .5) / uLo; if (texture2D(tF, u2).a > .993) { float dn = lin(texture2D(tFD, u2).x); if (dn < dE + .03 + dE * .002) k = 1.; } }
    c.rgb = mix(c.rgb, uInk, k * uInkO); }
  vec2 px = uv * uLo, r = (px - uSpd.xy) / uLo.y; float ang = atan(r.y, r.x), rr = length(r);
  /* Gnister utover fra et punkt: tynne, korte, oransje streker som flyr ut (ikke tykke hvite kiler: Jazz 18.11). Lys legges oppå. */
  if (uSpd.z > 0.) { float bn = ang * 150. / 6.2832, w = h21(vec2(floor(bn), 7.)), ph = fract(w * 7.3 + uFrame * .04 * (.6 + w)), r0 = uSpd.w + ph * 1.15;
    if (w > 1. - uSpd.z * .5 && abs(fract(bn) - .5) < .17 && rr > r0 && rr < r0 + .05 + .13 * w) c.rgb += uSpdC * (1. - ph) * .85 * uSpd.z; }
  if (uSwirl > 0.) { vec2 s = (px - uLo * .5) / uLo.y; float a2 = atan(s.y, s.x) + uSwirl * 5. - length(s) * 3.2, wd = fract(a2 * 7. / 6.2832), cut = uSwirl * 1.25 - (1. - length(s) * 1.1) * .25;
    if (wd < cut) c = vec4(mix(vec3(.82, .74, 1.), vec3(1.), step(wd, cut * .6)), 1.); }
  gl_FragColor = c;
}`;

  /* Spritepasset (arenaen i kampen, Jazz 18.11 runde 8: «ser ut som et filter»): figuren gjøres om til en sprite i sitt eget rutenett (256 × 192, samme pikselstørrelse
     som en frontsprite i arenaen), og legges oppå bildet etter etterbehandlingen, som spritene. For hver piksel ses 5 × 5 naboer: hvilke som er figur og synlige
     (ikke bak lavaen eller en stein), og hvor dype de er.
     · Rent omriss: en synlig piksel med høyst én synlig nabo (av åtte) tas bort (løse piksler, spisser av én piksel), og et hakk med tre naboer fylles.
     · Én hel piksel kontur UTENFOR silhuetten (ingen blekk inni kanten, så tynne ting som klør og pigger beholder fargen), og ikke ved lavaen.
     · En løs enkeltpiksel (tennene, lyset på en piggspiss) som ikke ligner noen av naboene, får naboenes farge. Øyet (id 254) røres ikke: ansiktet er hellig.
     · Strekene inni (der en del ligger foran en annen) beholdes, men bare når streken er mer enn én piksel lang.
     · Lavaen ved beina (runde 9: «Lavakanten og gløden rundt beina skal tegnes i samme pikselstørrelse som Groudon, med en ujevn, levende kant, og uten løse mørke prikker
       i lavaen under ham»): lavaen står én til to piksler opp på beina, med en lys øverste rad, og høyden bølger langs kanten og flytter seg for hvert trinn (uStep).
       Under kanten gløder lavaen foran beina én til to piksler ned (også ujevnt), og ved siden av beina én til to piksler ut. Over kanten får beina lys fra lavaen i tre trinn
       (farget, ikke malt over). Ingen kontur og ingen streker inni der lavaen er. dl = rader ned til lavaen (synlig piksel), du = rader opp til figuren (skjult piksel).
       Der en del av ham henger rett over lavaen uten å gå ned i den (buken, en klo: under uCt = 0,35 enheter over), får kanten under den samme gløden i stedet for en mørk
       kontur: høyden regnes fra dybden (uIPV). Små biter av ham rett over lavaen (under åtte synlige piksler i 5 × 5) blir glød, ikke mørke prikker.
     Ut: farge og dekning (0 eller 1), ingen halvgjennomsiktige kanter. */
  const FS_SPR = `uniform sampler2D tF, tFD, tED; uniform vec2 uLo, uNF; uniform vec3 uInk, uLvT, uLvC, uLvG, uLvM; uniform vec4 uInkD; uniform float uTol, uStep, uLY, uCt, uEdge; uniform mat4 uIPV;
float lin(float z){ return 2. * uNF.x * uNF.y / (uNF.y + uNF.x - (z * 2. - 1.) * (uNF.y - uNF.x)); }
float lum(vec3 c){ return dot(c, vec3(.3, .59, .11)); }
float h1(float x){ return fract(sin(x * 91.7 + 3.1) * 43758.5453); }
float stAt(vec2 q, out vec3 c, out float d, out float hy){ c = vec3(0.); d = 1e6; hy = 1e3; if (q.x < 0. || q.y < 0. || q.x >= uLo.x || q.y >= uLo.y) return 0.;
  vec2 uv = (q + .5) / uLo; vec4 f = texture2D(tF, uv); float id = floor(f.a * 255. + .5); c = f.rgb; if (id < 249.5) return 0.;
  float zr = texture2D(tFD, uv).x; d = lin(zr); float dE = lin(texture2D(tED, uv).x); vec4 w = uIPV * vec4(uv * 2. - 1., zr * 2. - 1., 1.); hy = w.y / w.w - uLY;
  return d < dE + uTol + dE * .001 ? (id > 254.5 ? 1. : 3.) : (uEdge > .5 ? 2. : 0.); }   /* uEdge 0 = fast grunn: det som ligger under bakken, er bare borte (vanlig kontur langs kuttet) */
bool vs(float s){ return s == 1. || s == 3.; }
bool hid(float s){ return s == 2. || s == 4.; }   /* under lavaen: 2 = han er der bak lavaen, 4 = rett over lavaen (kontakt, se under) */
void main(){
  vec2 p0 = floor(gl_FragCoord.xy); float V[25], D[25], H[25]; vec3 C[25], cx; float dz, hz;
  for (int j = 0; j < 5; j++) for (int i = 0; i < 5; i++) { int k = j * 5 + i; vec3 c; float d, hy; V[k] = stAt(p0 + vec2(float(i - 2), float(j - 2)), c, d, hy); D[k] = d; C[k] = c; H[k] = hy; }
  /* Kontakt: rett under en synlig piksel som ligger mindre enn uCt over lavaen (buken, en klo), regnes lavaen som om den dekker ham der (4: ingen kontur, men heller ingen lavakant). */
  for (int k = 0; k < 20; k++) if (V[k] == 0. && vs(V[k + 5]) && H[k + 5] < uCt) V[k] = 4.;
  float Cm[9], L[9];
  for (int j = 1; j <= 3; j++) for (int i = 1; i <= 3; i++) { int k = j * 5 + i; float n8 = 0., n4 = 0., ln = 0.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { if (x == 0 && y == 0) continue; int q = k + y * 5 + x; float v = vs(V[q]) ? 1. : 0.; n8 += v;
      if (x == 0 || y == 0) { n4 += v; int o2 = k - y * 5 - x; float g = vs(V[o2]) ? clamp(D[k] - D[o2], -.25, .25) : 0.;   /* hellingen på vår side (runde 12) */
        if (v > .5 && D[q] - D[k] - g > uInkD.z + D[k] * uInkD.w + (H[k] < .7 ? .6 * uEdge : 0.)) ln = 1.; } }
    bool vk = vs(V[k]); int m = (j - 1) * 3 + i - 1;
    Cm[m] = (vk && n8 > 1.5) || (!vk && !hid(V[k]) && n4 > 2.5) ? 1. : 0.; L[m] = V[k] == 1. ? ln : 0.; }
  float n25 = 0.; for (int k = 0; k < 25; k++) n25 += vs(V[k]) ? 1. : 0.;
  /* Runde 10 (Jazz 18.11: «den lyse linja går rett over hele bredden av spriten og ser ut som bunnen av et rektangel. Den skal følge beina og kroppen, være ujevn med små ringer
     og sprut, og lyse svakere»): lavaen kutter ham langs en rett linje (planet sett nesten fra siden), så kanten kan ikke ligge over hele bredden. dd = hvor mange rader av ham
     som går videre ned under lavaen i denne kolonnen: beina, halen og klørne går dypt (mer enn to), buken dypper så vidt eller henger rett over. Bare der det er dypt, tegnes
     lavakanten: 1–2 piksler som bølger fra trinn til trinn, en piksel høyere på sidene av beinet (den klatrer opp og følger formen), og den lyse øverste raden er svakere og bare på
     noen av pikslene. Under buken er det ingen kant: buken får varmt lys nedenfra, og lavaen går rett inn under den. Vannlinja i de dype kolonnene merkes (alfa 254), så
     spritePass kan legge ringer og sprut rundt beina i de samme pikslene. */
  float dl = 9., du = 9., dd = 0.;
  if (vs(V[12]) || Cm[4] > .5) { if (hid(V[7])) dl = 1.; else if (hid(V[2])) dl = 2.; else for (int r = 3; r <= 5; r++) if (dl > 8. && stAt(p0 - vec2(0., float(r)), cx, dz, hz) == 2.) dl = float(r);
    if (dl < 4.5 && (dl > 2.5 || (dl < 1.5 ? V[7] : V[2]) == 2.)) for (int r = 0; r < 5; r++) { if (stAt(p0 - vec2(0., dl + float(r)), cx, dz, hz) == 2.) dd += 1.; else break; } }
  if (hid(V[12])) { if (vs(V[17])) du = 1.; else if (vs(V[22])) du = 2.; else if (vs(stAt(p0 + vec2(0., 3.), cx, dz, hz))) du = 3.;
    if (V[12] == 2. && du < 3.5) { dd = du - 1.; for (int r = 0; r < 4; r++) { if (stAt(p0 - vec2(0., float(r)), cx, dz, hz) == 2.) dd += 1.; else break; } } }
  bool deep = dd > 2.5;
  float xc = p0.x, s = uStep, sd = 0.;
  if (deep && dl < 3.5) sd = (stAt(p0 + vec2(-1., -dl), cx, dz, hz) != 2. || stAt(p0 + vec2(1., -dl), cx, dz, hz) != 2.) ? 1. : 0.;
  float lip = deep ? 1. + floor(clamp(.5 + .6 * sin(xc * .5 + s * .4) + .45 * sin(xc * 1.37 - s * .33) + .5 * (h1(xc + floor(s / 3.) * 7.) - .5), 0., 1.99)) + sd : 0.;
  bool top = h1(xc * 2.3 + floor(s / 2.) * 5.) > .4;
  float gw = 1. + floor(clamp(.35 + .6 * sin(xc * .8 - s * .5 + 2.) + .4 * (h1(xc * 1.7 + floor(s / 2.) * 3.) - .5), 0., 1.99));
  vec4 o = vec4(0.);
  if (Cm[4] > .5) {
    vec3 c = C[12], avg = vec3(0.); float nv = 0., sim = 0., mk = 1.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { if (x == 0 && y == 0) continue; int q = 12 + y * 5 + x; if (vs(V[q])) { nv += 1.; avg += C[q]; if (abs(lum(C[q]) - lum(c)) < .1 && distance(C[q], c) < .2) sim += 1.; } }
    avg /= max(nv, 1.);
    if (!vs(V[12])) c = avg; else if (V[12] == 1. && nv > 1.5 && sim < .5) c = avg;
    if (dl <= lip) { c = dl == lip && top ? uLvT : uLvC; if (dl < 1.5) mk = 254. / 255.; }
    else if (dl <= 4. && n25 < 8.) c = uLvG;   /* en liten bit av ham rett over lavaen (en klo, en tå): sprut av glød, ikke en mørk prikk */
    else {
      if (dl <= lip + 3.) c = mix(c, c * uLvM + uLvG * .22, (deep ? .46 : .4) - .13 * (dl - lip - 1.));   /* varme fra lavaen, også på buken over den */
      float ln = L[4] * max(max(max(L[0], L[1]), max(L[2], L[3])), max(max(L[5], L[6]), max(L[7], L[8])));
      if (dl > lip + 1.) c = mix(c, c * .32 + uInk * .25, ln * (1. - step(.7, lum(c)) * step(c.b, c.g * .55)));   /* ikke strek oppå det som gløder gult (Primal): den ble olivengrønn */
    }
    o = vec4(c, mk);
  } else if (hid(V[12])) {
    if (deep && du <= gw && h1(xc * 1.3 + floor(s / 2.) * 11.) > .3) o = vec4(du < 1.5 ? uLvC : uLvG, 1.);   /* gløden i lavaen rett foran beinet, ujevn */
  } else {
    bool w1 = (vs(V[11]) && V[6] == 2.) || (V[11] == 2. && vs(V[16])) || (vs(V[13]) && V[8] == 2.) || (V[13] == 2. && vs(V[18]));
    if ((w1 && h1(xc * 3.1 + floor(s / 2.) * 5.) > .4) || (V[7] == 2. && (vs(V[11]) || vs(V[13]) || vs(V[17])))) o = vec4(uLvG, 1.);
    else {
      vec3 a = vec3(0.); float n = 0.;
      for (int m = 0; m < 4; m++) { int q = m == 0 ? 7 : m == 1 ? 11 : m == 2 ? 13 : 17, cm = m == 0 ? 1 : m == 1 ? 3 : m == 2 ? 5 : 7;
        bool lz = (q >= 5 && hid(V[q - 5])) || (q >= 10 && hid(V[q - 10]));
        if (Cm[cm] > .5 && !lz) { a += C[q]; n += 1.; } }
      if (n > .5) o = vec4(uInk + .16 * a / n, 1.);
    }
  }
  gl_FragColor = o;
}`;

  /* ---------- Oppstart: bunten fra pakken, tegneren og de to lerretene i minnet ---------- */
  const gl2 = () => { if (G._gl2 == null) { try { G._gl2 = !!document.createElement('canvas').getContext('webgl2'); } catch (_) { G._gl2 = false; } } return G._gl2; };
  /* ---------- Kildene ---------- 3D kommer bare fra pakken (Jazz 18.11): alle som har pakken, ser 3D, og appen henter ingenting utenfra for dette.
     · 3d/g3d.js: bunten med three, GLTFLoader og DRACOLoader (work/g3d/pack/build.sh).
     · 3d/<navn>.glb: modellene, pakket med Draco og WebP (work/g3d/scripts/conv.js). De fleste er laget av Jazz sine 3DS-kilder (pack/3d/src/); noen kommer
       fra det åpne arkivet og har andre navn og mål (K.figure gjør dem like).
     · 3d/draco.js og 3d/draco.wasm: Draco-dekoderen, hentet første gang en modell trenger den. */
  G.can = () => !!G.src && !G.dead && gl2();
  const absU = u => new URL(u, location.href).href, packUrl = n => G.src ? Promise.resolve(G.src(n)).catch(() => '') : Promise.resolve('');
  const grab = async u => { const r = await fetch(u); if (!r.ok) throw new Error('3d ' + r.status); return r.arrayBuffer(); };
  let draco = null; const dracoL = () => draco || (draco = (async () => { if (!T.DRACOLoader) throw new Error('3d: bundle has no DRACOLoader'); const [js, wasm] = await Promise.all([packUrl('draco.js'), packUrl('draco.wasm')]); if (!js || !wasm) throw new Error('3d: no draco decoder');
    const d = new T.DRACOLoader(); d.setDecoderPath({ js: absU(js), wasm: absU(wasm) }); return d; })().catch(e => { draco = null; throw e; }));
  const u3 = h => new T.Color(...hex(h)), uv = v => ({ value: v });
  G.boot = () => bootJob || (bootJob = (async () => {
    const url = await packUrl('g3d.js'); if (!url) throw new Error('no 3d bundle');
    T = await import(absU(url));
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
    U = { uTime: uv(0), uPs: uv(1), uFs: uv(1), uLavaY: uv(0), uGlow: uv(1), uGlowH: uv(14), uRimK: uv(1), uKey: uv(new T.Vector3(0.4, 0.8, 0.45).normalize()), uKeyC: uv(u3('#fff2e0')), uShC: uv(u3('#3a1a22')),
      uRim: uv(new T.Vector3(0, 0.3, -1).normalize()), uRimC: uv(u3('#ffb040')), uLavaC: uv(u3('#ff6a14')), uFogC: uv(u3('#6a1c08')), uFog: uv(new T.Vector3(60, 300, 0.8)) };
    post = new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: FS_POST,
      uniforms: { tE: uv(rtE.texture), tED: uv(de), tF: uv(rtF.texture), tFD: uv(dt), uRes: uv(new T.Vector2(512, 384)), uLo: uv(new T.Vector2(G.W, G.H)), uNF: uv(new T.Vector2(0.5, 900)), uInk: uv(u3('#1c0a0c')), uInkK: uv(1), uInkO: uv(0), uSub: uv(new T.Vector4()), uSubC: uv(u3('#3a6a9a')), uSpdC: uv(new T.Vector3(1, 0.5, 0.16)), uInkD: uv(new T.Vector4(0.05, 0.004, 0.5, 0.03)), uSpd: uv(new T.Vector4()), uSwirl: uv(0), uFrame: uv(0), uFig: uv(1), uInkW: uv(new T.Vector2(G.W, G.H)) } });
    postScene = new T.Scene(); const tri = new T.Mesh(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), post); tri.frustumCulled = false; postScene.add(tri);
    postCam = new T.Camera(); scale(1); rtFs[1] = rtF;
    return true;
  })().catch(e => { G.dead = 1; G.err = String(e && e.stack || e); throw e; }));
  /* Omgivelsene tegnes i filmens oppløsning: 512 × 384 ganger rs (CINE.RS: 1 eller 1,5). Figuren er alltid 256 × 192. */
  /* Figurens lag i en annen oppløsning enn 256 × 192 (def.fig: 1,5 eller 2): eget lerret i minnet per størrelse, laget første gang det trengs. */
  const rtFs = {}, figRT = fs => { if (!rtFs[fs]) { const w = Math.round(G.W * fs), h = Math.round(G.H * fs), dt = new T.DepthTexture(w, h); dt.minFilter = dt.magFilter = T.NearestFilter;
    rtFs[fs] = new T.WebGLRenderTarget(w, h, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, generateMipmaps: false, depthBuffer: true, depthTexture: dt }); } return rtFs[fs]; };
  const scale = rs => { rs = rs || 1; if (rs === rsNow) return; rsNow = rs; const w = Math.round(512 * rs), h = Math.round(384 * rs); R.setSize(w, h, false); rtE.setSize(w, h); post.uniforms.uRes.value.set(w, h); };

  /* ---------- Byggeklossene (K): materialer og former. Alt lages én gang per cutscene. ---------- */
  const sm = (vs, fs, un, o) => new T.ShaderMaterial(Object.assign({ vertexShader: vs, fragmentShader: fs, uniforms: Object.assign(un, U) }, o || {}));
  const addBlend = () => ({ transparent: true, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendEquationAlpha: T.AddEquation, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor });
  const softBlend = () => ({ transparent: true, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendEquationAlpha: T.AddEquation, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor });
  const K = { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, spring, ant, hit, rnd, hex };
  /* Artens egne materialer (c3/<art>.js): K.shader(vs, fs, uniformer, valg) gir et materiale med stedets felles uniformer (lys, dis, tid). K.GLSL har byggeklossene:
     COMMON (støy, tone3, fogK og de felles uniformene), VS (hjørneskyggeren med vW, vN, vO, vUv) og SEA_H (havets høyde). K.uv og K.u3 pakker verdier og farger. */
  K.shader = (vs, fs, un, o) => sm(vs || VS, fs, un || {}, o); K.GLSL = { COMMON, VS, SEA_H }; K.uv = v => uv(v); K.u3 = h => u3(h); K.blend = { add: () => addBlend(), soft: () => softBlend() };
  K.rockMat = o => sm(VS, FS_ROCK, { uSc: uv(o.sc || 1), uA: uv(u3(o.a || '#3b2422')), uB: uv(u3(o.b || '#5a3a30')), uStr: uv(o.str == null ? 0.22 : o.str), uTop: uv(o.top || 0), uSm: uv(o.sm == null ? 0.7 : o.sm), uHot: uv(o.hot == null ? 1 : o.hot), uRough: uv(o.rough == null ? 1 : o.rough), uCrust: uv(o.crust || 0), uFar: uv(o.far || 0), uCk: uv(o.ck == null ? 1 : o.ck), uLv: uv(o.lv == null ? 1 : o.lv), uTint: uv(new T.Vector3(...(o.tint || [0.2, 0.09, 0.065]))) }, { side: T.DoubleSide });   /* hot: hvor høyt opp foten gløder (1 = 1,8 enheter), rough: hvor ru, crust: størknet skorpe, far: fjellvegg i bakgrunnen, ck: sprekker og porer (0–1) */
  K.cryMat = o => sm(VS, FS_CRY, { uA: uv(u3(o.a || '#7a1030')), uB: uv(u3(o.b || '#ff5a78')), uPulse: uv(0.5) });
  K.figMat = (map, o) => { o = o || {}; if (map) { map.colorSpace = T.NoColorSpace; map.magFilter = T.NearestFilter; map.minFilter = o.mip ? T.LinearMipmapLinearFilter : T.NearestFilter; map.generateMipmaps = !!o.mip; map.needsUpdate = true; }
    return sm(VS_FIG, FS_FIG, { map: uv(map), uUvOff: uv(new T.Vector2()), uId: uv(o.id || 255), uStone: uv(0), uStoneC: uv(u3('#8a7892')), uCrack: uv(0), uCrackR: uv(0), uCrackO: uv(new T.Vector3()), uCrackC: uv(u3('#ffe24a')), uSeam: uv(o.seam == null ? 0.2 : o.seam), uSeamOn: uv(o.seamOn == null ? 1 : o.seamOn), uHead: uv(new T.Vector3(1e4, 1e4, 0)),
      uEmis: uv(o.emis || 0), uTx: uv(new T.Vector2(1.6 / ((map && map.image && map.image.width) || 512), 1.6 / ((map && map.image && map.image.height) || 512))), uVor: uv(0), uGl: uv(1), uCw: uv(1), uHalo: uv(0), uSpill: uv(0), uWk: uv(0), uWh: uv(1.15), uOm: uv(new T.Matrix3().set(OS3, 0, 0, 0, 0, OS3, 0, -OS3, 0)), uOo: uv(new T.Vector3()), uFlK: uv(0), uFlC: uv(u3('#ffffff')), uB1: uv(-0.1), uB2: uv(0.45), uMask: uv(o.mask || 0), uMul: uv(u3(o.mul || '#ffffff')), uKf: uv(new T.Vector3()) }, o.mask ? Object.assign(addBlend(), { side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }) : { side: T.DoubleSide }); };
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
  K.lava = o => { o = o || {}; return new T.Mesh(new T.PlaneGeometry(o.size || 900, o.size || 900).rotateX(-PI / 2), sm(VS, FS_LAVA, { uRing: uv([0, 1, 2, 3].map(() => new T.Vector4())), uWade: uv(new T.Vector4()), uPop: uv(Array.from({ length: 16 }, () => new T.Vector4())), uLive: uv(0), uHeat: uv(1.2), uK: uv(o.k || 16), uCell: uv(o.cell || 84), uCw: uv(o.cw || 0.05), uBri: uv(0.95) })); };
  /* Bakken som et valg per sted: K.ground('lava' | 'sea' | 'ice', o). Alle har uRing (fire ringer: x, z, radius, styrke) og uWade (x, z, radius, styrke: det som står i bakken),
     så arenaen og cutscenene kan si fra om nedslag og hvor figuren står på samme måte. Kanten på figuren i kampen følger materialet (def.edge: 'lava', 'sea', null).
     · sea: o = { size, seg (ruter i flaten: flere gir jevnere dønninger), swell, chop, foam, rain, wind: [x, z, fart], deep, shal, skyA, skyB, foamC }. Uniformene uSea og uWind kan endres i act.
     · ice: o = { size, mirror, rime, cracks, snow, deep, shal, skyA, skyB, foamC }. uStar = sprekk-stjernen. */
  const gU = () => ({ uRing: uv([0, 1, 2, 3].map(() => new T.Vector4())), uWade: uv(new T.Vector4()), uBri: uv(1), uBody: uv(new T.Vector4()), uBodyD: uv(new T.Vector4(0, 1, 1, 1)), uGlo: uv(new T.Vector4()), uGloC: uv(new T.Vector3(0.3, 0.8, 1)) });
  K.sea = o => { o = o || {}; const n = o.seg || 160; return new T.Mesh(new T.PlaneGeometry(o.size || 900, o.size || 900, n, n).rotateX(-PI / 2), sm(VS_SEA, FS_SEA, Object.assign(gU(), { uSea: uv(new T.Vector4(o.swell == null ? 0.6 : o.swell, o.chop == null ? 1 : o.chop, o.foam == null ? 0.7 : o.foam, o.rain || 0)), uWind: uv(new T.Vector4(...(o.wind || [0.25, 1, 1]), 0)),
    uDeep: uv(u3(o.deep || '#06202e')), uShal: uv(u3(o.shal || '#1c7c8c')), uSkyA: uv(u3(o.skyA || '#8aa2b4')), uSkyB: uv(u3(o.skyB || '#1c2c44')), uFoamC: uv(u3(o.foamC || '#e8f4fa')) }))); };
  K.ice = o => { o = o || {}; return new T.Mesh(new T.PlaneGeometry(o.size || 900, o.size || 900).rotateX(-PI / 2), sm(VS, FS_ICE, Object.assign(gU(), { uStar: uv(new T.Vector4()), uIce: uv(new T.Vector4(o.mirror == null ? 0.8 : o.mirror, o.rime == null ? 0.7 : o.rime, o.cracks == null ? 0.8 : o.cracks, o.snow == null ? 0.6 : o.snow)),
    uDeep: uv(u3(o.deep || '#16304e')), uShal: uv(u3(o.shal || '#5a9ac8')), uSkyA: uv(u3(o.skyA || '#e8b8d8')), uSkyB: uv(u3(o.skyB || '#5a5a9c')), uFoamC: uv(u3(o.foamC || '#f2f8ff')) }))); };
  K.ground = (kind, o) => kind === 'sea' ? K.sea(o) : kind === 'ice' ? K.ice(o) : K.lava(o);
  /* Havets høyde i et punkt (samme regning som SEA_H): u = havets uniformer (mesh.material.uniforms), t = tiden. Til det som flyter (figuren, skjæret) og til vannlinja. */
  K.seaH = (u, x, z, t) => { const S = u.uSea.value, W = u.uWind.value, dl = Math.hypot(W.x + 1e-4, W.y) || 1, dx = (W.x + 1e-4) / dl, dz = W.y / dl, a = x * dx + z * dz, b = -x * dz + z * dx, sp = W.z, cr = p => { const s = 0.5 + 0.5 * sin(p); return 2 * s * s - 0.75; };
    return S.x * (cr(a * 0.085 + b * 0.021 - t * 0.62 * sp + 1.3 * sin(b * 0.017 + t * 0.13)) + 0.45 * cr(a * 0.151 - b * 0.064 - t * 0.86 * sp + 2.1) + 0.18 * cr(a * 0.31 + b * 0.19 - t * 1.25 * sp + 4)) * (1 - io(c01((Math.hypot(x, z) - 180) / 240))); };
  /* Partikler. init(i) gir { p, v, s: frø, b: fødsel (s), l: levetid (s), z: størrelse }. o.pix: harde piksler i figurens oppløsning, o.add: lys, ellers røyk. */
  K.pts = (n, init, o) => { o = o || {}; const P = new Float32Array(n * 3), V = new Float32Array(n * 3), S = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const q = init(i); P.set(q.p, i * 3); V.set(q.v || [0, 0, 0], i * 3); S.set([q.s == null ? rnd(i, 77) : q.s, q.b || 0, q.l || 1, q.z || 1], i * 4); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aV', new T.BufferAttribute(V, 3)); g.setAttribute('aS', new T.BufferAttribute(S, 4));
    const c = o.c || ['#ffffff', '#ffb040', '#c03010'];
    const m = sm(VS_PTS, FS_PTS, { uT0: uv(o.t0 == null ? -1e5 : o.t0), uLoop: uv(o.loop ? 1 : 0), uG: uv(o.g || 0), uDrag: uv(o.drag || 0), uPx: uv((o.px || 180) * (o.pix ? 1 : 2)), uSway: uv(o.sway || 0), uFloor: uv(o.floor == null ? -1e4 : o.floor), uMin: uv(o.min || (o.pix ? 1 : 2)), uNear: uv(o.near || 0), uSz: uv(new T.Vector2(o.sz0 == null ? 1 : o.sz0, o.sz1 == null ? 1 : o.sz1)), uWind: uv(new T.Vector3(...(o.wind || [0, 0, 0]))),
      uC0: uv(u3(c[0])), uC1: uv(u3(c[1])), uC2: uv(u3(c[2])), uFade: uv(o.fade == null ? 0.7 : o.fade), uId: uv(o.id == null ? 200 : o.id), uShade: uv(o.shade ? 1 : 0), uPix: uv(o.pix ? 1 : 0), uAdd: uv(o.add ? 1 : 0), uA: uv(o.a == null ? 1 : o.a) }, o.pix ? {} : o.add ? addBlend() : softBlend());
    const pts = new T.Points(g, m); pts.frustumCulled = false; if (o.pix) pts.layers.set(1); return pts; };
  /* Steinflak (piksler som figuren, lag 1): n kantete biter som slynges ut og spinner. init(i) gir { p, v, r: spinn per sekund, s: frø, b: forsinkelse, l: levetid, z: størrelse }.
     m.at(t, t0, { g, floor }) setter bitene for tidspunktet t (banen regnes ut fra tiden, ingen tilstand); de forsvinner når de synker i lavaen. */
  K.shards = (n, init, o) => { o = o || {}; const geo = jitter(new T.IcosahedronGeometry(1, 0), 0.3, o.seed || 9, (x, y, z) => [x, y * (o.sy || 0.42), z * 0.8]);
    const m = new T.InstancedMesh(geo, sm(VS_SHARD, FS_SHARD, { uC: uv(u3(o.c || '#8a7892')), uId: uv(o.id || 201), uGrey: uv(o.grey == null ? 0.75 : o.grey), uEm: uv(o.em || 0) }, { side: T.DoubleSide }), n); m.frustumCulled = false; m.layers.set(1);
    const L = []; for (let i = 0; i < n; i++) L.push(init(i)); const d = new T.Object3D();
    m.at = (t, t0, q2) => { q2 = q2 || {}; const gv = q2.g == null ? 22 : q2.g, fl = q2.floor == null ? -0.3 : q2.floor; let live = 0;
      for (let i = 0; i < n; i++) { const q = L[i], a = t - t0 - (q.b || 0); let s = 0;
        if (a >= 0 && a < (q.l || 3)) { const y = q.p[1] + q.v[1] * a - 0.5 * gv * a * a; if (y > fl) { s = q.z * (q2.k == null ? 1 : q2.k); d.position.set(q.p[0] + q.v[0] * a, y, q.p[2] + q.v[2] * a); d.rotation.set(q.r[0] * a + q.s * 6, q.r[1] * a + q.s * 9, q.r[2] * a); live++; } }
        d.scale.setScalar(s || 1e-6); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }
      m.instanceMatrix.needsUpdate = true; m.visible = live > 0; return live; };
    return m; };
  /* Krystallen som kapsler ham inn: en ujevn, fasettert kule (radius 1, skaler den). */
  K.gem = o => { o = o || {}; const g = jitter(new T.IcosahedronGeometry(1, 1), 0.07, o.seed || 4, (x, y, z) => [x, y * 1.06, z * 0.96]).toNonIndexed();
    const m = new T.Mesh(g, sm(VS, FS_GEM, { uA: uv(u3(o.a || '#c81e8c')), uB: uv(u3(o.b || '#ff9adf')), uD: uv(u3(o.d || '#1a0c1c')), uCrkC: uv(u3(o.crk || '#ffe24a')), uId: uv(o.id || 190), uAl: uv(1), uDark: uv(0), uCrk: uv(0), uCrkR: uv(0) }, { side: T.FrontSide })); m.frustumCulled = false; m.layers.set(1); return m; };
  /* Lys oppå: mode 0 ring (flat på bakken), 1 glød (vend den mot kameraet med K.face). */
  /* Lavabobler (runde 18, Jazz 18.11: lavaen «mer levende»): blemmer i 3D som vokser opp av lavaen og sprekker. Sett fra kampens lave kamera klemmes alt som bare ligger
     PÅ flaten, til en strek (7:1), så liv i lavaen må ha høyde. Hver boble er en halvkule (instansert): L = [[x, z, takt, fase, radius, voksetid], …]. Den vokser de siste
     aB.w sekundene av takten sin og er borte idet den sprekker (da kommer ringen i lavaen og dråpene: samme takt som uPop og S.pop). Småboblene (voksetid under 1 s) vokser
     ikke opp gjennom et skorpeflak; rundt de store smelter skorpen (FS_LAVA). Disen legges på med halv styrke, så de ikke blir matte i røyken etter Primal. */
  K.domes = L => { const g = new T.SphereGeometry(1, 16, 8, 0, PI * 2, 0, PI / 2), n = L.length, B = new Float32Array(n * 4), M = new T.Matrix4();
    const m = new T.InstancedMesh(g, sm(`attribute vec4 aB; varying vec3 vW, vN; varying float vG;
${COMMON}
${LAVA_CR}
void main(){ float a = mod(uTime + aB.y, aB.x), gq = clamp((a - (aB.x - aB.w)) / aB.w, 0., 1.), e = gq * gq * (3. - 2. * gq), s = aB.z * (.3 + .7 * e) * step(.001, gq), h = (.22 + .62 * e) * (1. + .06 * sin(uTime * 21. + aB.y * 9.) * e * e);
  vec4 c0 = modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.); if (aB.w < 1.) s *= 1. - smoothstep(.15, .5, plateAt(c0.xz, uTime, 16., 84., 1.));
  vec3 p = position * vec3(s, s * h, s); vG = e; vN = normalize(vec3(position.x * h, position.y + .0001, position.z * h));
  vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`, `varying vec3 vW, vN; varying float vG;
${COMMON}
vec3 ramp(float x){ vec3 c = vec3(.028, .006, .002); c = mix(c, vec3(.4, .028, .0), smoothstep(0., .3, x)); c = mix(c, vec3(.98, .24, .02), smoothstep(.24, .6, x)); c = mix(c, vec3(1., .66, .14), smoothstep(.56, .92, x)); return mix(c, vec3(1., .95, .72), smoothstep(.9, 1.35, x)); }
void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = 1. - max(dot(N, V), 0.), top = N.y * N.y;
  float temp = .58 + .16 * vG + (.2 + .22 * vG) * top - .26 * f * f + .1 * smoothstep(.55, .9, dot(N, normalize(vec3(-.3, .8, .5)))) * (.4 + .6 * vG);
  gl_FragColor = vec4(mix(ramp(temp) * .84, uFogC, fogK(vW) * .5), 1.); }`, {}), n);
    L.forEach((q, i) => { m.setMatrixAt(i, M.makeTranslation(q[0], 0, q[1])); B.set([q[2], q[3], q[4], q[5] || 1.2], i * 4); });
    g.setAttribute('aB', new T.InstancedBufferAttribute(B, 4)); m.frustumCulled = false; return m; };
  K.light = (mode, col, o) => { o = o || {}; const g = mode === 0 ? new T.RingGeometry(0.6, 1, 40, 1).rotateX(-PI / 2) : new T.PlaneGeometry(1, 1);
    if (mode === 0) { const u = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < u.count; i++) u.setXY(i, 0, (Math.hypot(p.getX(i), p.getZ(i)) - 0.6) / 0.4); }
    const m = new T.Mesh(g, sm(VS, FS_ADD, { uC: uv(u3(col)), uA: uv(1), uMode: uv(mode) }, Object.assign(addBlend(), { side: T.DoubleSide, depthTest: o.depth !== false }))); m.frustumCulled = false; return m; };
  /* Figuren: modellen fra pakken med våre materialer, og en rigg. Poser er { Ben: [rx, ry, rz, (px, py, pz)] } lagt oppå hvilestillingen;
     '*Arm' gjelder både LArm og RArm (speilet, så bevegelsen blir lik på begge sider). add(pose, vekt) legger sammen, apply() setter benene.
     Aksene (målt med dev/g3d): y løfter og senker, z til siden, x vrir. Figuren ligger i lag 1 og tegnes i den lave oppløsningen. */
  const MIR = [1, 0, 1, 1, 0, 0];   /* høyre side av figuren er speilet: rotasjon om x og z (og flytting i x) snur fortegn, y er lik */
  /* Navnene gjøres like på tvers av kildene: ben fra arkivets modeller kan ha et nummer bak (Waist_03, Head_049), og materialene kan hete «Material #35» (da brukes
     teksturens navn) eller ha artens nummer foran (pm0383_51_00_BodyEnv01 → BodyEnv01). */
  const OS3 = 0.0254, bname = s => String(s || '').replace(/_\d+$/, ''), mclean = s => String(s || '').replace(/\.(png|webp|jpe?g)$/i, '').replace(/^pm\d+_\d+_(\d\d_)?/, '');
  const mname = (m, q) => { const a = mclean(m.name), b = mclean(m.map && m.map.name); return /^Material\b|^$/.test(a) ? (b || q.name) : a; };
  /* Materialreglene: [mønster på materialets navn, valg]. Den første som treffer, gjelder; artens egne (o.rules) kommer før standarden (3DS-modellenes navn).
     Valg: eye (øyet: egen id, ingen sømmer, eget lys; atlas: 0 = teksturen er ikke 3DS-atlaset med åpne, smale og lukkede øyne), mask (linjemaske som gløder oppå),
     key (del materiale med et annet navn), og alt K.figMat tar (seam, seamOn, emis, mul).
     o.glow = [[mønster på materialet, (r, g, b, a) => true der teksturen har en linje, eller et tall 0–1 for hvor sterkt]]: linjer som gløder, hentet fra fargene (0–1) i teksturen. Arkivets Switch-modeller
     har linjene i kroppens tekstur, ikke i en egen maske som 3DS-modellene: flaten tegnes en gang til oppå med en maske laget av teksturen, i samme slags materiale som
     3DS-maskene. Den første er f.mats.mask, de andre deler uCrack og uCrackC med den, så alle linjene gløder likt. Masken lages én gang per modell, materiale og test. */
  const RULES0 = [[/Eye/, { eye: 1 }], [/BodyB1|^BodyB$/, { seamOn: 0 }], [/Mask/, { mask: 1 }]];
  /* Flater uten tekstur (arkivets Switch-modeller har ensfargede deler, som kjernene på Primal Kyogre) får en tekstur på 1 × 1 piksel i sin egen farge; ellers ble de svarte. */
  const solidMap = c => { const h = c.getHex(), t = new T.DataTexture(new Uint8Array([h >> 16 & 255, h >> 8 & 255, h & 255, 255]), 1, 1); t.needsUpdate = true; return t; };
  const glowCv = new Map();
  const glowMap = (key, src, test) => { let cv = glowCv.get(key); const img = src.image;
    if (!cv) { cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, cv.width, cv.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { const q = test(a[i] / 255, a[i + 1] / 255, a[i + 2] / 255, a[i + 3] / 255), v = q === true ? 255 : !q ? 0 : Math.round(255 * Math.min(1, q)); a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255; } x.putImageData(d, 0, 0); glowCv.set(key, cv); }
    const t = new T.CanvasTexture(cv); t.flipY = src.flipY; t.wrapS = src.wrapS; t.wrapT = src.wrapT; return t; };   /* som kildens tekstur: samme vei (glTF: ikke snudd) og gjentatt (UV-ene går utenfor 0–1) */
  K.figure = (gltf, o) => { o = o || {}; const root = gltf.scene, bones = {}, rest = {}, acc = {}, mats = {}, ex = {}, eyes = [], mir = o.mir || MIR, map = o.map || {};
    const rules = (o.rules || []).concat(RULES0), rule = n => { for (const r of rules) if (r[0].test(n)) return r[1]; return {}; };
    const holder = new T.Group(); holder.add(root); holder.updateMatrixWorld(true); const own = [];
    root.traverse(q => { if (q.isBone) { const bn = bname(q.name); if (!bones[bn]) { bones[bn] = q; rest[bn] = [q.rotation.x, q.rotation.y, q.rotation.z, q.position.x, q.position.y, q.position.z]; } }
      if (q.isMesh) { q.frustumCulled = false; q.layers.set(1); const n = mname(q.material, q); if (o.hide && o.hide.test(n + ' ' + q.name)) { q.visible = false; return; } own.push(q); q.userData.mn = n;
        const ru = rule(n), k = ru.key || (ru.mask ? 'mask' : n); q.material = mats[k] || (mats[k] = K.figMat(q.material.map || (q.material.color ? solidMap(q.material.color) : null), Object.assign({ id: o.id || 255, mip: o.mip && !ru.eye && !ru.mask }, ru.eye ? { id: (o.id || 255) - 1, seamOn: 0, emis: 0.35 } : {}, ru))); if (ru.mask) q.renderOrder = 5; if (ru.eye && eyes.indexOf(q.material) < 0) { q.material.userData.atlas = ru.atlas !== 0; eyes.push(q.material); } } });
    /* Skjelettkartet (o.map): posene skrives med rollene (Head, Jaw, Neck1, Spine1, '*Arm' …), og kartet sier hvilket ben som har rollen i denne modellen
       ({ '*Arm': '*Shoulder', Spine3: 'Spine2' }). Uten oppføring er rollen bennavnet selv. '*X' = både LX og RX (høyre speilet med o.mir). */
    const names = Object.keys(bones), al = k => map[k] || k, list = k => ex[k] || (ex[k] = (k = al(k))[0] === '*' ? ['L' + k.slice(1), 'R' + k.slice(1)].map(al).filter(n => bones[n]) : bones[k] ? [k] : []);
    if (o.glow) for (const q of own) { const g = o.glow.find(r => r[0].test(q.userData.mn)), src = g && q.material.uniforms.map.value; if (!src || !src.image || !src.image.width) continue;
      const mk = mats.mask ? 'mask_' + q.userData.mn : 'mask', mm = mats[mk] || (mats[mk] = K.figMat(glowMap([gltf.model, q.userData.mn, g[1]].join('|'), src, g[1]), { id: o.id || 255, mask: 1 }));
      if (mk !== 'mask') { mm.uniforms.uCrack = mats.mask.uniforms.uCrack; mm.uniforms.uCrackC = mats.mask.uniforms.uCrackC; } if (g[2]) Object.assign(mm, g[2]);
      const s = q.isSkinnedMesh ? new T.SkinnedMesh(q.geometry, mm) : new T.Mesh(q.geometry, mm); if (q.isSkinnedMesh) { s.bindMode = q.bindMode; s.bind(q.skeleton, q.bindMatrix); }
      s.layers.set(1); s.frustumCulled = false; s.renderOrder = 5; q.add(s); }   /* et barn av flaten: samme plass, samme skjelett */
    /* Flaten i figurens eget rom (vO i FS_FIG: steinhuden, sprekkene, hodet): modellens plassering i hvilestillingen. Modellene fra conv.js står alle likt
       (Z opp, −Y fram, tommer): da brukes de nøyaktige tallene. Andre (fra arkivet) får sin egen matrise. */
    for (const q of own) { const e = q.matrixWorld.elements, ref = [OS3, 0, 0, 0, 0, -OS3, 0, OS3, 0], m3 = [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]];
      const same = m3.every((v, i) => Math.abs(v - ref[i]) < 2e-6) && Math.hypot(e[12], e[13], e[14]) < 1e-4, u = q.material.uniforms; if (same || !u.uOm || q.material.userData.om) continue;
      q.material.userData.om = 1; u.uOm.value.setFromMatrix4(q.matrixWorld); u.uOo.value.set(e[12], e[13], e[14]); }
    const F = { root: holder, bones, mats, rest, model: gltf.model || '',
      clear() { for (const n of names) acc[n] = null; },
      add(pose, w) { if (!w) return F; for (const k in pose) { const v = pose[k], st = k[0] === '*'; for (const n of list(k)) { const a = acc[n] || (acc[n] = [0, 0, 0, 0, 0, 0]), m = st && n[0] === 'R'; for (let i = 0; i < v.length; i++) a[i] += v[i] * w * (m && mir[i] ? -1 : 1); } } return F; },
      rot(k, x, y, z) { return F.add({ [k]: [x, y, z] }, 1); },
      apply() { for (const n of names) { const b = bones[n], r = rest[n], a = acc[n]; if (a) { b.rotation.set(r[0] + a[0], r[1] + a[1], r[2] + a[2]); b.position.set(r[3] + a[3], r[4] + a[4], r[5] + a[5]); } else { b.rotation.set(r[0], r[1], r[2]); b.position.set(r[3], r[4], r[5]); } } holder.updateMatrixWorld(true); },
      at(n, v) { return bones[list(n)[0] || n].getWorldPosition(v || new T.Vector3()); }, has(n) { return list(n).length > 0; },
      /* Øynene (3DS-atlaset: (0, 0) åpent, (0, 0,5) lukket, (0, 0,75) smalt): flytter UV, og setter eventuelt eget lys og steinhud. Øyne uten atlaset får bare lyset. */
      eye(u, v, emis, stone) { for (const m of eyes) { if (m.userData.atlas) m.uniforms.uUvOff.value.set(u, v); if (emis != null) m.uniforms.uEmis.value = emis; if (stone != null) m.uniforms.uStone.value = stone; } return F; }, eyes,
      set(k, val) { for (const m in mats) { const u = mats[m].uniforms[k]; if (!u) continue; if (u.value && u.value.isColor) u.value.setRGB(...(typeof val === 'string' ? hex(val) : val)); else if (u.value && u.value.set && Array.isArray(val)) u.value.set(...val); else u.value = val; } return F; } };
    return F; };
  /* Modellene: fila hentes én gang (bufs), men tolkes på nytt for hver cutscene, for K.figure bytter materialene og flytter modellen inn i scenen sin.
     K.model(navn) gir utgaven til cutscenen som bygges akkurat nå (curM settes av G.ready rundt make). */
  const bufs = new Map(); let curM = null;
  K.model = n => curM ? curM[n] : null;
  const loadBuf = n => { if (!bufs.has(n)) bufs.set(n, packUrl(n + '.glb').then(u => { if (!u) throw new Error('no model ' + n); return grab(u); }).catch(e => { bufs.delete(n); throw e; })); return bufs.get(n); };
  const isDraco = b => { try { return new TextDecoder().decode(new Uint8Array(b, 20, new DataView(b).getUint32(12, true))).indexOf('KHR_draco_mesh_compression') >= 0; } catch (_) { return false; } };
  const loadModel = async n => { const b = await loadBuf(n), L = new T.GLTFLoader(); if (isDraco(b)) L.setDRACOLoader(await dracoL()); const g = await L.parseAsync(b, ''); g.model = n; return g; };

  /* ---------- Cutscenene ---------- G3D.def(id, { len, fps, models, make(K, T) → S, act(S, t, o), shots: [[start, fn(S, u, tau, t)]], spr }).
     spr = { fps, since }: figuren som sprite i kampen (se G.frame og FS_SPR). act setter da S.fo = [x, y], hvor mange hele piksler den flyttes (rykk, dukk).
     S.scene er scenen, S.figs figurene. act er skuespillet (én sammenhengende handling), shots er kameraene som klipper mellom bilder av den.
     S.post er det kameraet ber om for bildet: sh risting, fl/flc blink, fade/fadec, heat/heatY varmeflimmer, vig, spd fartsstreker (spx, spy, spr), swirl. */
  const DEF = {}, jobs = {};
  G.def = (id, d) => { DEF[id] = d; };
  G.has = id => !!DEF[id];
  G.info = id => DEF[id] ? { len: DEF[id].len, hold: DEF[id].hold || 0, R: DEF[id].R || 0, at: DEF[id].at || 0, fig: DEF[id].spr ? 1 : DEF[id].fig || 1 } : null;
  /* Henter det en cutscene trenger fra pakken (bunten, modellene og Draco-dekoderen) uten å bygge scenen: til bakgrunnen, når raidvarselet vises. */
  G.warm = id => { const D = DEF[id]; if (!D || !G.can()) return Promise.reject(new Error('no 3d')); return G.boot().then(() => Promise.all((D.models || []).map(loadBuf))).then(bs => bs.some(isDraco) ? dracoL().then(d => { d.preload(); }) : 0).then(() => true); };
  G.ready = id => jobs[id] || (jobs[id] = (async () => {
    const D = DEF[id]; if (!D || !G.can()) throw new Error('no 3d');
    await G.boot(); const M = {}; await Promise.all((D.models || []).map(n => loadModel(n).then(g => { M[n] = g; })));
    curM = M; try { D.S = D.make(K, T); } finally { curM = null; } D.S.post = {}; G.frame(id, 0, {}); if (G.err) throw new Error(G.err);
    return true;
  })().catch(e => { G.err = String(e && e.stack || e); jobs[id] = null; throw e; }));
  G.isReady = id => !!(DEF[id] && DEF[id].S && !G.dead);
  const P0 = () => ({ sh: 0, fl: 0, flc: '#ffffff', fade: 0, fadec: '#000000', heat: 0, heatY: 60, spd: 0, spx: 128, spy: 96, spr: 0.3, swirl: 0, vig: 0.5, ink: 1, ink2: 0, inkz: 0.5 });
  /* Kameraet: fra, mot, synsvinkel, og en helling (roll) for lave, skjeve vinkler. */
  K.cam = (px, py, pz, tx, ty, tz, fov, roll) => { cam.position.set(px, py, pz); cam.up.set(0, 1, 0); cam.lookAt(tx, ty, tz); if (roll) cam.rotateZ(roll); if (cam.fov !== (fov || 40)) { cam.fov = fov || 40; cam.updateProjectionMatrix(); } cam.updateMatrixWorld(true); };   /* matrisene med en gang, så K.proj og K.ray gjelder dette bildet */
  K.U = () => U; K.face = m => { m.quaternion.copy(cam.quaternion); return m; }; K.camPos = () => cam.position;
  /* Et punkt i verden → filmens piksler (512 × 384). z > 1 = bak kameraet. */
  const pv = () => new T.Vector3();
  K.proj = (x, y, z) => { const v = pv().set(x, y, z).project(cam); return { x: (v.x * 0.5 + 0.5) * 512, y: (0.5 - v.y * 0.5) * 384, z: v.z }; };
  /* Motsatt vei: der strålen gjennom en piksel (512 × 384) treffer planet i høyden y. */
  K.ray = (px, py, y) => { cam.updateMatrixWorld(true); const a = cam.position, d = pv().set(px / 256 - 1, 1 - py / 192, 0.5).unproject(cam).sub(a).normalize(), k = (y - a.y) / d.y; return { x: a.x + d.x * k, y, z: a.z + d.z * k, k }; };
  /* Det 2D-bakteppet trenger: horisonten rett fram på skjermen (x, y), hellingen, piksler per radian, og hvor kameraet ser (yaw 0 = mot −Z). */
  G.view = () => { const d = cam.getWorldDirection(pv()), yaw = Math.atan2(d.x, -d.z), p = cam.position, a = K.proj(p.x + sin(yaw) * 1e5, p.y, p.z - cos(yaw) * 1e5), b = K.proj(p.x + sin(yaw + 0.05) * 1e5, p.y, p.z - cos(yaw + 0.05) * 1e5);
    return { x: a.x, y: a.y, ang: Math.atan2(b.y - a.y, b.x - a.x), ppr: Math.hypot(b.x - a.x, b.y - a.y) / 0.05, yaw, pitch: Math.asin(c01(d.y * 0.5 + 0.5) * 2 - 1), cx: p.x, cy: p.y, cz: p.z }; };
  /* Tegner ett bilde av cutscenen på tidspunktet t (sekunder) på motorens eget lerret (gjennomsiktig der himmelen er), og gir lerretet.
     o = { name, lv, cap, cc }, rs = filmens oppløsning (1 eller 1,5). */
  /* Stedets lys (def.env): kantlyset bakfra (rim), lyset og gløden nedenfra fra bakken (glow, og hvor høyt det når: glowH), disen (fog) og bakkens høyde (y).
     Settes for hvert bilde, for verdiene er felles for alle materialer i alle scener. Standard er Groudons krater. act kan endre dem videre (uKeyC, uShC, uGlow). */
  const ENV0 = { rim: '#ffb040', glow: '#ff6a14', fog: '#6a1c08', glowH: 14, y: 0 }, INK0 = '#1c0a0c';   /* env.ink: stedets blekk (konturen); standard er kraterets */
  const envSet = e => { e = e || ENV0; U.uRimC.value.setRGB(...hex(e.rim || ENV0.rim)); U.uLavaC.value.setRGB(...hex(e.glow || ENV0.glow)); U.uFogC.value.setRGB(...hex(e.fog || ENV0.fog)); U.uGlowH.value = e.glowH == null ? ENV0.glowH : e.glowH; U.uLavaY.value = e.y || 0; };
  /* Stillingen på tidspunktet t: skuespillet (act), benene, og kameraet i bildet (shots) som gjelder. Gir P (det kameraet ber om). */
  const poseAt = (D, S, t, o) => {
    const P = S.post = P0(); U.uTime.value = t; envSet(D.env);
    for (const f of S.figs || []) f.clear(); U.uFog.value.set(60, 300, 0.8);
    D.act(S, t, o); for (const f of S.figs || []) f.apply();
    let si = 0; for (let i = 0; i < D.shots.length; i++) if (t >= D.shots[i][0] - 1e-6) si = i;
    const s0 = D.shots[si][0], s1 = si + 1 < D.shots.length ? D.shots[si + 1][0] : D.len; S.shot = si;
    D.shots[si][1](S, c01((t - s0) / max(1e-6, s1 - s0)), t - s0, t);
    if (o.out > 0) { P.swirl = max(P.swirl, c01(o.out * 1.25)); P.fl = max(P.fl, seg(o.out, 0.62, 1)); P.flc = '#ffffff'; }
    S.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true); return P;
  };
  /* Ringer og sprut rundt beina i lavaen (runde 10: «ujevn med små ringer og sprut»), i figurens piksler og i takt med trinnene. Spritepasset merker vannlinja der en del av
     ham går ned i lavaen (alfa 254); merkene samles til strekk (et bein, halen). Fra hvert strekk brer to ringer seg ut til sidene (korte streker på lavaen som blir mørkere og
     borte) og noen få dråper spretter opp og faller tilbake. Ringene legges bare på lavaen (tomme piksler), aldri oppå ham. n = trinnet. */
  /* Kanten mot bakken per materiale (def.edge): fargene på kanten (top, mid), gløden i bakken foran (glow), lyset bakken kaster opp på figuren (warm: ganges inn)
     og fargene på ringene og dråpene (fx). 'lava' er Groudons (runde 9–10), 'sea' er skum og vann (Kyogre). null = fast grunn (is, stein): ingen kant. */
  const EDGE = { lava: { top: '#ffb455', mid: '#ec7a2c', glow: '#c04a1c', warm: [1.3, 0.9, 0.62], fx: [[255, 176, 82], [228, 108, 38], [170, 62, 22]] },
    sea: { top: '#f4fbff', mid: '#a8d6ec', glow: '#4f8fb8', warm: [0.84, 0.95, 1.1], fx: [[240, 250, 255], [170, 214, 236], [96, 150, 192]] } };
  G.edges = EDGE; const edgeOf = D => D.edge === undefined ? EDGE.lava : typeof D.edge === 'string' ? EDGE[D.edge] || null : D.edge || null;
  const lavaFx = (d, n, LFX) => { const W = G.W, H = G.H, pts = [];
    for (let i = 3; i < d.length; i += 4) if (d[i] === 254) { d[i] = 255; const p = (i - 3) / 4; pts.push([p % W, floor(p / W)]); }
    if (!pts.length) return; pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const segs = []; for (const [x, y] of pts) { const s = segs[segs.length - 1]; if (s && x - s.x1 <= 2 && abs(y - s.y) <= 2) { s.x1 = x; s.y = max(s.y, y); } else segs.push({ x0: x, x1: x, y }); }
    const put = (x, y, c, over) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; if (d[i + 3] && !over) return; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
    for (const s of segs) { const w = s.x1 - s.x0 + 1; if (w < 2) continue; const yw = s.y + 1, sd = s.x0 * 7 + s.x1 * 3;
      for (let r = 0; r < 2; r++) { const P = 24, k = ((n + r * 12 + floor(rnd(sd, 5) * P)) % P) / P; if (k > 0.8) continue;
        const dx = 1 + floor(k * (7 + w * 0.15)), c = LFX[k < 0.3 ? 0 : k < 0.6 ? 1 : 2], y = yw + (k > 0.45 ? 1 : 0), L = k < 0.4 ? 3 : 2;
        for (let q = 0; q < L; q++) { put(s.x0 - dx - q, y, c); put(s.x1 + dx + q, y, c); } }
      for (let j = 0; j < 2; j++) { const Cy = 13 + j * 4, m = n + floor(rnd(sd + j, 9) * Cy), cyc = floor(m / Cy), a = m % Cy; if (a >= 6 || rnd(cyc * 7 + j, sd) > 0.65) continue;
        const x = s.x0 + floor(rnd(cyc, sd + j * 3) * w) + (a > 2 ? (rnd(cyc, sd + 1) > 0.5 ? 1 : -1) : 0), h = Math.round((2 + rnd(cyc, sd + 2) * 2) * sin(PI * a / 6));
        put(x, yw - 1 - h, LFX[h > 2 ? 0 : 1], true); } } };
  /* Spritepasset (FS_SPR) ut på et vanlig lerret (D.fcv, 256 × 192): figuren slik den står i dette trinnet, renset og med omriss. */
  let rtS = null, sprM = null, sprScene = null, sbuf = null;
  const spritePass = (D, P, n) => {
    if (!rtS) { rtS = new T.WebGLRenderTarget(G.W, G.H, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, generateMipmaps: false, depthBuffer: false });
      sprM = new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: FS_SPR,
        uniforms: { tF: uv(rtF.texture), tFD: uv(rtF.depthTexture), tED: uv(rtE.depthTexture), uLo: uv(new T.Vector2(G.W, G.H)), uNF: uv(new T.Vector2(0.5, 900)), uInk: uv(u3('#1c0a0c')), uLvT: uv(u3('#ffb455')), uLvC: uv(u3('#ec7a2c')), uLvG: uv(u3('#c04a1c')), uLvM: uv(new T.Vector3(1.3, 0.9, 0.62)), uEdge: uv(1), uStep: uv(0), uLY: uv(0), uCt: uv(0.35), uIPV: uv(new T.Matrix4()), uInkD: uv(new T.Vector4(0, 0, 0.5, 0)), uTol: uv(0.03) } });
      sprScene = new T.Scene(); const tri = new T.Mesh(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), sprM); tri.frustumCulled = false; sprScene.add(tri); sbuf = new Uint8Array(G.W * G.H * 4); }
    const u = sprM.uniforms; u.uNF.value.set(cam.near, cam.far); u.uInkD.value.z = P.inkz == null ? 0.5 : P.inkz; u.tED.value = rtE.depthTexture; u.uStep.value = n || 0;
    u.uIPV.value.multiplyMatrices(cam.matrixWorld, cam.projectionMatrixInverse); u.uLY.value = U.uLavaY.value; u.uCt.value = P.ct == null ? 0.35 : P.ct;   /* verdenshøyden til hver piksel (kontakten med lavaen) */
    u.uInk.value.setRGB(...hex((D.env && D.env.ink) || INK0)); const ed = edgeOf(D); u.uEdge.value = ed ? 1 : 0; if (ed) { u.uLvT.value.setRGB(...hex(ed.top)); u.uLvC.value.setRGB(...hex(ed.mid)); u.uLvG.value.setRGB(...hex(ed.glow)); u.uLvM.value.set(...ed.warm); } else u.uCt.value = -1e6;
    R.setRenderTarget(rtS); R.clear(); R.render(sprScene, postCam); R.readRenderTargetPixels(rtS, 0, 0, G.W, G.H, sbuf);
    if (!D.fcv) { D.fcv = document.createElement('canvas'); D.fcv.width = G.W; D.fcv.height = G.H; D.fim = D.fcv.getContext('2d').createImageData(G.W, G.H); }
    const d = D.fim.data, rw = G.W * 4; for (let y = 0; y < G.H; y++) d.set(sbuf.subarray((G.H - 1 - y) * rw, (G.H - y) * rw), y * rw);   /* WebGL leser nedenfra og opp */
    if (ed) lavaFx(d, n || 0, ed.fx); D.fcv.getContext('2d').putImageData(D.fim, 0, 0);
  };
  G.frame = (id, t, o, rs) => {
    const D = DEF[id], S = D && D.S; if (!S || G.dead) return null;
    try {
      scale(rs || 1);
      const fps = D.fps || 30, tq = floor(t * fps + 1e-6) / fps, sp = D.spr, fsc = sp ? 1 : D.fig || 1, RF = figRT(fsc);   /* kampen (spr) er alltid i 256 × 192: samme korn som frontspritene */
      o = Object.assign({}, o || {}, { out: (o && o.out) || G.out || 0 });
      /* Samme bilde som sist (filmen går i 30 bilder i sekundet, skjermen ofte i 60): lerretet står som det er. */
      const key = id + '|' + floor(tq * fps + 0.5) + '|' + (rs || 1) + '|' + o.out.toFixed(3); if (key === lastKey && !D.live) return cv; lastKey = '';
      /* D.spr (arenaen i kampen): figuren er en sprite. Den regnes i trinn (sp.fps bilder i sekundet) og bare når trinnet skifter, med hendelsene (sp.since:
         sekunder siden) regnet tilbake til trinnet, så den står helt stille mellom trinnene. Omgivelsene regnes for hvert bilde, så de går jevnt. */
      const fs = sp ? floor(t * sp.fps + 1e-6) : -1, fnew = !!sp && fs !== D.fs; let Pf = null;
      if (fnew) { const tf = fs / sp.fps, dt = t - tf, of = Object.assign({}, o); for (const k of sp.since || []) if (of[k] != null && of[k] < 98) of[k] -= dt;
        S.fo = [0, 0]; Pf = Object.assign({}, poseAt(D, S, tf, of)); D.fo = S.fo.slice(); cam.layers.set(1); R.setRenderTarget(rtF); R.clear(); R.render(S.scene, cam); }
      const P = poseAt(D, S, tq, o);
      const pu = post.uniforms, fn = floor(tq * fps);
      pu.tF.value = RF.texture; pu.tFD.value = RF.depthTexture; pu.uLo.value.set(RF.width, RF.height); U.uFs.value = fsc;
      pu.uSpd.value.set(P.spx * fsc, (G.H - P.spy) * fsc, P.spd, P.spr); pu.uSwirl.value = P.swirl; pu.uInkK.value = P.ink; pu.uInkO.value = P.ink2 || 0; pu.uInkD.value.z = P.inkz == null ? 0.5 : P.inkz; pu.uFrame.value = fn; pu.uNF.value.set(cam.near, cam.far); pu.uFig.value = sp ? 0 : 1;
      pu.uSub.value.set(P.sub || 0, P.subf == null ? 0.25 : P.subf, P.subg || 0, 0); if (P.sub) pu.uSubC.value.setRGB(...hex(P.subc || '#3a6a9a')); pu.uInk.value.setRGB(...hex((D.env && D.env.ink) || INK0)); if (P.spc) pu.uSpdC.value.set(...hex(P.spc)); else pu.uSpdC.value.set(1, 0.5, 0.16);
      U.uPs.value = rsNow || 1; cam.layers.set(0); R.setRenderTarget(rtE); R.clear(); R.render(S.scene, cam);
      if (!sp) { cam.layers.set(1); R.setRenderTarget(RF); R.clear(); R.render(S.scene, cam); }
      else if (fnew) { spritePass(D, Pf, fs); D.fs = fs; }
      R.setRenderTarget(null); R.clear(); R.render(postScene, postCam);
      G.err = ''; lastKey = key;
    } catch (e) { G.err = String(e && e.stack || e); }
    return cv;
  };
  /* Figuren som sprite (D.spr): lerretet (256 × 192, som hele bildet), og hvor mange hele piksler den er flyttet (ox, oy). Tegnes oppå arenaen etter etterbehandlingen. */
  G.sprite = id => { const D = DEF[id]; return D && D.spr && D.fcv ? { cv: D.fcv, ox: D.fo ? D.fo[0] : 0, oy: D.fo ? D.fo[1] : 0 } : null; };
  /* Tekst i figurens lave oppløsning: tegnes på et lite lerret, alfa gjøres hard, og en mørk kant legges rundt. Gir lerretet (256 × 192). */
  /* fs = figurens oppløsning i cutscenen (def.fig): tegnes med de samme målene (256 × 192), på et rutenett som er fs ganger så fint. */
  const tcvs = {};
  G.text = (fn, fs, ink) => { fs = fs || 1; ink = ink || [22, 8, 10]; const W = Math.round(G.W * fs), H = Math.round(G.H * fs); let q0 = tcvs[fs]; if (!q0) { const c = document.createElement('canvas'); c.width = W; c.height = H; q0 = tcvs[fs] = [c, c.getContext('2d', { willReadFrequently: true })]; } const tcv = q0[0], tx = q0[1];
    tx.setTransform(fs, 0, 0, fs, 0, 0); tx.clearRect(0, 0, G.W, G.H); tx.save(); fn(tx); tx.restore();
    const im = tx.getImageData(0, 0, W, H), d = im.data, n = W * H, on = new Uint8Array(n); for (let i = 0; i < n; i++) on[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, q = i * 4; if (on[i]) { d[q + 3] = 255; continue; }
      let e = 0; for (let dy = -1; dy <= 1 && !e; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && on[yy * W + xx]) { e = 1; break; } }
      if (e) { d[q] = ink[0]; d[q + 1] = ink[1]; d[q + 2] = ink[2]; d[q + 3] = 255; } else d[q + 3] = 0; }
    tx.putImageData(im, 0, 0); return tcv; };
  G.K = K; G.T = () => T; G.canvas = () => cv; G.S = id => DEF[id] && DEF[id].S; G.post = id => (DEF[id] && DEF[id].S && DEF[id].S.post) || P0();
  return G;
})();
