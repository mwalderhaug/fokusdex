'use strict';
/* Fokusdex – Arceus (493) i 3D (steg 3.1, Fable 24.11): «EGGET». Bygget fra skisse B (Jazz 21.11: «et godt utgangspunkt»): rekkefølgen og tidene i låtene er låst,
   og stilen, kameraet, lyset og materialene er nye.
   Filmens tid t: 0 = varselet (Azure Flute fra 0:00, teksten oppå). Hall of Origin fra 19,0. Kamplåta fra 49,3, etter en bro uten toneart.
     0–15,0   KAOSET i de 18 typefargene blafrer på hver tone i fløyta og virvler; 15,0–20,8 trekkes alt sammen til ett punkt
     20,5     EGGET av lys, med fem ringer. Ett løft i Hall of Origin = én ring = én ting i verden:
              26,08 glassgulvet · 31,19 lyslinjene · 36,30 søylene · 41,41 stjernene · 46,52 de 17 platene
     49,55    egget ÅPNER seg til glorier rundt en skikkelse av gull (avsløringsverbet); 52,47 og 55,67 låser platene seg i hjulet
     58,87 →  gullet slipper nedenfra, én del per takt: beina, kroppen, halsen, hodet (63,67). 64,5–65,2 pusten
     65,27    DROPPET: Judgment (kula til himmels, regn av lys over hallen) og brølet; navnet 66,67
   STEDET er Hall of Origin slik han skaper den: et glassgulv som speiler kosmos (alt over gulvet speiles: søylene, egget, ham selv), lyslinjene i gulvet med de 18
   typemerkene i ring, søyler av marmor og gull som stiger opp gjennom glasset, og kosmos rundt. Hallen han skaper, er arenaen (X.arena nederst).
   1 enhet = 1 m. Han står i origo og ser mot +z (dit kameraet og din Pokémon står), og er rundt 9 m til toppen. */
(() => {
  const K = G3D.K, C = CINE.kit, X = G3C, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, hit, rnd, hex } = K, kf = C.kf, hyp = Math.hypot;
  /* ---------- Tidene (filmens tid) ---------- */
  const H0 = 19.0, HBASS = H0 + 4.0, LIFT = [7.08, 12.19, 17.30, 22.41, 27.52].map(x => H0 + x), HFADE = H0 + 29.0, HEND = H0 + 29.8;   /* Hall of Origin: løftene hvert 5,11 s */
  const K0 = 49.3, HIT = [0.25, 3.17, 6.37, 9.57, 11.17, 12.77, 14.37].map(x => K0 + x), BRE = K0 + 15.2, DROP = K0 + 15.97, NAME = DROP + 1.4, LEN = NAME + 3.2;   /* kamplåtas åpning */
  const FLN = [0.08, 0.43, 1.36, 2.15, 5.85, 7.40, 7.97, 9.05, 9.70, 10.65, 11.30, 11.97, 14.02];   /* fløytas 13 toner (målt i skissen) */
  /* De 18 typene i appens rekkefølge (TYN): Normal er ham selv, de 17 andre er platene. Lysende utgaver av typefargene. */
  const TY = ['#fff1c8', '#e0503a', '#9db4ff', '#b65ad6', '#e2b45a', '#c9a850', '#b4d42c', '#7a62d0', '#b9c4dc', '#ff7a2e', '#4f96ff', '#62d86a', '#ffd92e', '#ff5f9e', '#8fe6ee', '#6f4cff', '#8a6f66', '#ff9ed0'];
  const GOLD = '#ffcf5c', GOLDW = '#fff3c8', EC = [0, 5.6, 0], ER = 4.4, EY = 1.3;   /* eggets sentrum, radius og høydeforhold */
  const SKIN = { bg: '#120d05', top: '#ffd66a', bot: '#6b4a12', cap: '#ffe4a0', grad: ['#fffbea', '#ffd25a', '#c88a1c'], lv: '#fff1c4', ink: [18, 12, 4] };
  /* En glatt kurve gjennom nøklene (farten går gjennom hver nøkkel, stopper bare i endene), og kamerabanen [t, px, py, pz, tx, ty, tz, fov] bygget på den. */
  const hs = (t, P) => { const n = P.length; if (t <= P[0][0]) return P[0][1]; if (t >= P[n - 1][0]) return P[n - 1][1]; let i = 0; while (t > P[i + 1][0]) i++;
    const m = j => j === 0 || j === n - 1 ? 0 : (P[j + 1][1] - P[j - 1][1]) / (P[j + 1][0] - P[j - 1][0]), a = P[i], b = P[i + 1], d = b[0] - a[0], u = (t - a[0]) / d, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * a[1] + (u3 - 2 * u2 + u) * d * m(i) + (-2 * u3 + 3 * u2) * b[1] + (u3 - u2) * d * m(i + 1); };
  const pathAt = (t, KS) => { const v = []; for (let k = 1; k < KS[0].length; k++) v.push(hs(t, KS.map(q => [q[0], q[k]]))); return v; };
  let CS = null;   /* scenen som tegnes nå: kuppelen følger kameraet */
  const cam = (px, py, pz, tx, ty, tz, fov, roll) => { const d = G3D.dbgCam; if (d) { px = d[0]; py = d[1]; pz = d[2]; tx = d[3]; ty = d[4]; tz = d[5]; fov = d[6]; roll = 0; }   /* G3D.dbgCam: et fast kamera til prøvebilder (aldri satt i appen) */ K.far(2600); K.cam(px, py, pz, tx, ty, tz, fov, roll); if (CS && CS.dome) { CS.dome.position.set(px, py, pz); CS.dome.updateMatrixWorld(true); } };
  const camK = (t, KS, roll) => { const v = pathAt(t, KS); cam(v[0], v[1], v[2], v[3], v[4], v[5], v[6], roll); };

  /* ---------- GLSL ---------- */
  const CM = K.GLSL.COMMON;
  /* KOSMOS: tomrommet, tåkene (store former og dis, ikke korn), galaksebåndet og den lysende kanten i horisonten (Legends: Arceus). Speilet om horisonten, så det som
     ligger under gulvet, er speilbildet av himmelen. uSky = (hvor mye som er tent, bølgefronten som vinkel fra senit, tåkenes styrke, kanten i horisonten).
     uSkyT og uSkyTk: platens farge blandet inn (fase 2 og arenaen). uJd = Judgment i senit (sekunder siden, styrke). */
  const SKY = `uniform vec4 uSky, uJd; uniform vec3 uSkyT; uniform float uSkyTk;
vec3 skyc(vec3 d){ vec3 e = vec3(d.x, abs(d.y), d.z); float th = acos(clamp(e.y, 0., 1.)), lit = uSky.x * (1. - smoothstep(uSky.y - .07, uSky.y + .015, th));
  vec3 q = e * 1.3; float n1 = vn3(q + vec3(3.1, 0., 1.7)) * .55 + vn3(q * 2.2 + 5.) * .3 + vn3(q * 4.7 + 11.) * .15, n2 = vn3(q * .7 + 31.) * .6 + vn3(q * 1.7 + 17.) * .4;
  const vec3 GN = vec3(.7368, .6754, .0286), GC = vec3(-.169, .225, -.9595);   /* galaksebåndets normal, og kjernen: oppe til venstre i kampens bilde (aldri bak ham: hvit mot hvitt) */
  float gd = dot(e, GN), gb = exp(-gd * gd * 14.), cd = 1. - dot(e, GC), lane = smoothstep(.42, .6, vn3(q * 3.1 + 40.)) * exp(-gd * gd * 60.);
  vec3 nb = mix(vec3(.09, .045, .30), vec3(.03, .2, .36), smoothstep(.3, .75, n2)) * smoothstep(.38, .8, n1) * 1.0;
  nb += mix(vec3(.26, .14, .52), vec3(.95, .6, .46), smoothstep(.5, .86, n1)) * gb * (.2 + .8 * smoothstep(.36, .76, n1)) * .3 * (1. - .85 * lane);
  nb += vec3(1., .84, .6) * exp(-cd * 46.) * .3 + vec3(.7, .4, .8) * exp(-cd * 9.) * .045;
  nb = mix(nb, nb * .35 + uSkyT * dot(nb, vec3(.5)) * 1.6, uSkyTk);
  vec3 c = vec3(.004, .005, .014) + nb * uSky.z * lit;
  float hb = exp(-e.y * 7.), hl = exp(-e.y * 70.); vec3 hc = mix(mix(vec3(.30, .18, .62), vec3(.45, .95, .9), hl), uSkyT, uSkyTk * .7);
  c += hc * (hb * .09 + hl * .2) * uSky.w;
  c += vec3(1., .9, .7) * exp(-abs(th - uSky.y) * 40.) * uSky.x * step(.02, uSky.y) * (1. - smoothstep(1.3, 1.56, uSky.y)) * .8;
  if (uJd.y > 0.) { float a = uJd.x; c += vec3(1., .88, .6) * (exp(-th * th * 40. / (1. + a * 30.)) * exp(-a * 2.2) * 2.4 + exp(-abs(th - a * .85) * 26.) * exp(-a * 1.1) * .9) * uJd.y; }
  return c; }`;
  const DOME_V = `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`;
  const DOME_F = `varying vec3 vD;
${CM}
${SKY}
void main(){ gl_FragColor = vec4(skyc(normalize(vD)), 1.); }`;
  /* Stjernene: punkter på en kule rundt hallen (begge halvkuler: de under gulvet er speilbildene). Hver tennes idet fronten går forbi den, med et blink. */
  const STAR_V = `attribute vec4 aS; varying float vB; varying vec3 vC; uniform float uTime, uPs; uniform vec4 uSky;
void main(){ vec3 d = normalize(position); float th = acos(clamp(abs(d.y), 0., 1.)), on = step(th, uSky.y) * uSky.x, fl = exp(-max(0., uSky.y - th) * 9.) * step(uSky.y, 1.7);
  float tw = .72 + .28 * sin(uTime * (1.2 + aS.z * 3.) + aS.z * 40.);
  vB = on * aS.y * tw * (1. + 2.5 * fl); vC = mix(vec3(.72, .82, 1.), vec3(1., .9, .72), aS.w);
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aS.x * uPs * (1. + .8 * fl); if (on < .01) gl_Position = vec4(2., 2., 2., 1.); }`;
  const STAR_F = `varying float vB; varying vec3 vC; void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r2 = dot(q, q); if (r2 > 1.) discard; gl_FragColor = vec4(vC * exp(-r2 * 5.) * vB, 0.); }`;
  /* GLASSGULVET: selve glasset er en tynn tone over speilbildet (alt under gulvet er speilet geometri og kuppelens nedre halvdel). Sett rett ned slipper det
     mindre lys tilbake (mørkere), og sett flatt er det et rent speil. uGl = hvor langt glasset er støpt (radius; kanten lyser mens det brer seg). */
  const FLV = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const GLASS_F = `varying vec3 vW; uniform float uGl, uGA;
void main(){ float r = length(vW.xz); if (r > uGl) discard; vec3 V = normalize(cameraPosition - vW); float fr = pow(1. - max(V.y, 0.), 3.), a = (1. - fr) * .62 * uGA, ed = exp(-(uGl - r) * .6) * step(uGl, 390.);
  gl_FragColor = vec4(vec3(.010, .012, .032) * a + vec3(1., .88, .62) * ed * .45, a); }`;
  /* LYSLINJENE i gulvet (skaperens segl): ringer (tent av uR1, løft 1), linjer og merker (tegnet utover av uR2, løft 2), de 18 typemerkene i ring rundt ham
     (uPal fargene, uMk hvor sterkt hvert lyser: typen han har, synes alltid her), gangen sørover, bølger fra nedslag (uWv: x, z, når, styrke) og lyset fra egget i glasset. */
  const LINE_F = `varying vec3 vW; uniform float uR1, uR2, uA, uLit, uMk[18]; uniform vec3 uC1, uC2, uPal[18]; uniform vec4 uWv[6], uEgg, uFr[2], uTp; uniform float uMr;
${CM}
float lnF(float d, float w){ return 1. - smoothstep(w * .5, w * 1.5, abs(d)); }
void main(){ vec2 p = vW.xz; float r = length(p), a = atan(p.y, p.x);
  float fw = max(max(length(vec2(dFdx(p.x), dFdy(p.x))), length(vec2(dFdx(p.y), dFdy(p.y)))), .018), dim = 1. / (1. + fw * 2.2);
  float dr = min(min(min(abs(r - 5.2), abs(r - 6.)), min(abs(r - 10.), abs(r - 12.6))), min(min(abs(r - 17.), abs(r - 26.)), min(abs(r - 26.8), abs(r - 34.))));
  dr = min(dr, min(min(abs(r - 46.), abs(r - 62.)), min(abs(r - 63.), abs(r - 78.)))); float R = lnF(dr, fw * 1.3);
  float T18 = 6.2831853 / 18., a18 = a - 1.5707963, T16 = 6.2831853 / 16.;
  float L = lnF(abs(fract(a18 / T18) - .5) * T18 * r, fw * 1.2) * step(12.6, r) * step(r, 26.);
  L = max(L, lnF((fract(a / (T18 * .5) + .5) - .5) * T18 * .5 * r, fw) * step(26.8, r) * step(r, 28.6) * .8);
  L = max(L, lnF((fract(a / T16 + .5) - .5) * T16 * r, fw * 1.2) * step(36.6, r) * step(r, 62.));
  float a2 = (floor(a / T16) + .5) * T16; L = max(L, lnF(length(p - vec2(cos(a2), sin(a2)) * 34.) - 2.7, fw * 1.1));
  float pz = step(36.6, p.y) * step(p.y, 150.); L = max(L, lnF(abs(p.x) - 5., fw) * pz); L = max(L, lnF((fract(p.y / 5. + .5) - .5) * 5., fw) * step(abs(p.x), 5.) * pz * .6);
  float rv1 = 1. - smoothstep(uR1 - 2., uR1 + .3, r), rv2 = 1. - smoothstep(uR2 - 1.5, uR2 + .3, r), pen = exp(-abs(r - uR2) * .9) * step(.5, uR2) * step(uR2, 160.);
  vec3 lc = mix(uC1, uC2, .5 + .5 * sin(r * .11 - uTime * .4));
  vec3 col = lc * (R * rv1 + L * rv2) * (1. + .6 * uLit) + vec3(1., .95, .8) * L * pen * 2. + uC1 * exp(-abs(r - uR1) * .8) * step(.5, uR1) * step(uR1, 160.) * .3;
  /* typemerkene: 18 tavler i ring (r 10,45–12,15), spor 0 (Normal) mot +z */
  float am = a18 + uMr, k = floor(fract(am / 6.2831853 + .5 / 18.) * 18.), da = (fract(am / T18 + .5) - .5) * T18 * r, bx = max(abs(da) - 1.2, abs(r - 11.3) - .82); int ki = int(clamp(k, 0., 17.));
  float mk = uMk[ki]; col += uPal[ki] * (lnF(bx, fw * 1.2) * (.35 + mk) + step(bx, 0.) * (.05 + .55 * mk)) * rv2;
  for (int i = 0; i < 6; i++) { vec4 w = uWv[i]; float age = uTime - w.z; if (w.w > 0. && age > 0. && age < 3.) { float d = length(p - w.xy) - age * 16.; col += uC2 * w.w * (1. - smoothstep(0., 1.2, abs(d))) * (1. - age / 3.) * .8; } }
  col += vec3(1., .86, .55) * uEgg.w * exp(-r * r / 90.) * .14 * rv1 + uTp.rgb * uTp.w * exp(-r * r / 150.) * rv1;
  for (int i = 0; i < 2; i++) { vec4 q = uFr[i]; if (q.y > 0.) col += mix(uC1, vec3(1., .97, .88), .5) * q.y * (exp(-abs(r - q.x) / q.z) * .5 + lnF(r - q.x, fw * 2.4) * 1.6) / dim; }
  gl_FragColor = vec4(col * dim * uA * (1. - fogK(vW) * .85), 0.); }`;
  /* SØYLENE: marmor med riller og gull i fot og kapitél. De stiger opp GJENNOM glasset (kapitélet først), tent av ringen som går forbi (aI: når, hvor lenge, høyden, frø).
     uMir = −1 for speilbildet under gulvet (lyset regnes da som for den ekte søylen), uRef = hvor sterkt speilbildet er. Lyset kommer fra scenen (uEgg) og kaldt fra kosmos. */
  const PIL_V = `attribute vec4 aI; varying vec3 vW, vN; varying float vG, vK, vA; uniform float uTime, uHv; uniform vec3 uGw;
void main(){ vec4 c0 = instanceMatrix * vec4(0., 0., 0., 1.); float dd = min(length(c0.xz), 72.), k = uGw.x > .5 ? clamp((uGw.y - dd) / uGw.z, 0., 1.) : clamp((uTime - aI.x) / aI.y, 0., 1.), q = k - 1., e = 1. + 2.2 * q * q * q + 1.2 * q * q; vK = k;
  float y = position.y, H = aI.z, Y = y < 1.6 ? y : y < 2.6 ? mix(1.6, H - 1.95, y - 1.6) : H - 1.95 + (y - 2.6);
  vG = max(step(.45, y) * step(y, 1.15), step(2.9, y)); vA = atan(position.z, position.x);
  vec4 w = modelMatrix * instanceMatrix * vec4(position.x, Y - H * (1. - e) + uHv * (.55 + .45 * sin(uTime * .5 + aI.w * 6.283)), position.z, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const PIL_F = `varying vec3 vW, vN; varying float vG, vK, vA; uniform float uMir, uLit, uRef; uniform vec3 uTc; uniform vec4 uEgg;
${CM}
void main(){ if (vW.y * uMir < 0. || vK < .001) discard;
  vec3 W = vec3(vW.x, vW.y * uMir, vW.z), Cp = vec3(cameraPosition.x, cameraPosition.y * uMir, cameraPosition.z), N = normalize(vN * vec3(1., uMir, 1.)), V = normalize(Cp - W);
  float fl = cos(vA * 20.), sh = (1. - vG) * step(abs(N.y), .5); N = normalize(N + vec3(-sin(vA), 0., cos(vA)) * fl * .3 * sh);
  float vein = fbm(vec2(vA * .9 + W.y * .05, W.y * .16 + vA * .3)), vv = smoothstep(.5, .56, vein) - smoothstep(.56, .62, vein);
  vec3 gold = vec3(.95, .68, .24), base = mix(mix(vec3(.8, .79, .84), vec3(.6, .58, .7), vv * .35) * (.9 + .1 * fl), gold, vG);
  vec3 Lc = uEgg.xyz - W; float dist = length(Lc); Lc /= dist; float dl = max(dot(N, Lc), 0.), wrap = dot(N, Lc) * .5 + .5;
  vec3 c = base * (uShC * (.34 + .3 * max(N.y, 0.) + .2 * wrap) + uKeyC * dl * uEgg.w * (34. / (30. + dist)));
  c += uTc * (1. - smoothstep(0., 8., W.y)) * .16 * uLit;
  float f = pow(1. - max(dot(N, V), 0.), 3.); c += mix(vec3(.4, .46, .9), gold, vG) * f * .26 + gold * vG * (.05 + .12 * uLit) * (.6 + .4 * wrap);
  c += vec3(1., .9, .6) * (1. - smoothstep(0., 1., vK)) * (.3 + .6 * vG);
  gl_FragColor = vec4(mix(c, uFogC, fogK(W)) * uRef, 1.); }`;
  /* EGGET: en perle av lys med kaoset inni (de 18 fargene driver sakte som skyer i perlemoren), gull i kanten. Den er tett (det bak den synes ikke gjennom),
     så skikkelsen inni ligger BAK lyset og skimtes gjennom det (etterpassets uSub). uGh = 1: skallet som lys lagt oppå (idet det åpner seg og blir borte). */
  const EGG_V = `varying vec3 vW, vN, vL; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const EGG_F = `varying vec3 vW, vN, vL; uniform float uA, uIn, uGh; uniform vec3 uPal[18];
${CM}
void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float nv = abs(dot(N, V)), f = 1. - nv, ca = cos(uTime * .13), sa = sin(uTime * .13);
  vec3 q = normalize(vL); q = vec3(q.x * ca - q.z * sa, q.y, q.x * sa + q.z * ca) * 1.25 + vec3(0., -uTime * .05, 0.);
  float n = vn3(q) * .6 + vn3(q * 2.1 + 5.) * .4, m = vn3(q * 1.7 + 9. + n), hu = fract(n * .5 + m * .32 + uTime * .012) * 18.; int i0 = int(floor(hu)), i1 = int(mod(floor(hu) + 1., 18.));
  vec3 body = mix(vec3(1., .93, .78), mix(uPal[i0], uPal[i1], fract(hu)), .5 * smoothstep(.25, .75, m) * uIn);
  vec3 c = body * (.24 + .5 * pow(nv, 1.6)) + vec3(1., .82, .5) * pow(f, 2.2) * .8 + vec3(1.) * pow(f, 6.) * .6;
  gl_FragColor = vec4(c * uA, uGh > .5 ? 0. : 1.); }`;
  /* Ringer og glorier: tynne ringer av gull lagt oppå som lys (Legends: Arceus). */
  const RING_V = `varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const RING_F = `varying vec3 vW, vN; uniform vec3 uC; uniform float uA; void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = pow(abs(dot(N, V)), 1.4);
  float nr = .3 + .7 * smoothstep(3., 14., length(vW - cameraPosition)); gl_FragColor = vec4(uC * uA * f * nr, 0.); }`;
  /* Platene: 17 tavler i typefargene, med en innfelt ramme. uGo = ren glød (idet de blir til av ringen). */
  const PLATE_V = `varying vec3 vW, vN, vL; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const PLATE_F = `varying vec3 vW, vN, vL; uniform vec3 uC; uniform float uA, uGo;
${CM}
void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); if (dot(N, V) < 0.) N = -N; float tn = tone3(dot(N, uKey), -.2, .35), f = pow(1. - abs(dot(N, V)), 3.);
  vec2 q = abs(vL.xy) / vec2(.44, .62); float fr = step(.76, max(q.x, q.y));
  vec3 c = uC * (.42 + .4 * tn) * (.8 + .3 * fr) + vec3(1.) * f * .28 + uC * .2; c = mix(c, vec3(.9, .85, .75) + uC * .4, uGo);
  gl_FragColor = vec4(mix(c * uA, uFogC, fogK(vW) * .5), 1.); }`;
  /* KAOSET: lyspunkter og tåkedotter i de 18 typefargene. Hver type er en spiralarm (aQ.w = typen); uOrd blander fra spredt (kaos) til armene (orden: fløyta samler dem).
     uK = sammentrekningen (1 → 0): alt trekkes mot midten, virvelen går fortere jo nærmere, og når alt er ett, er lyset hvitt. uNt = tonene i fløyta (hver slår noen
     av typene opp). uSz = størrelsen (punktene små, tåken stor), uSo = hvor myk dotten er. */
  const MOTE_V = `attribute vec4 aR, aQ; varying vec3 vC; varying float vA; uniform float uTime, uK, uSpin, uA, uPs, uOrd, uSz, uMx, uNt[18]; uniform vec3 uCen, uPal[18];
void main(){ int ci = int(aQ.w); float w = uSpin * (7. / (2.5 + aR.x * .22)) * .16, aS = aQ.w * .349066 + 1.75 * log(aR.x + 1.) + aR.y + w;
  vec3 pS = vec3(cos(aS) * aR.x, aR.z * (.22 + aR.x * .012), sin(aS) * aR.x);
  float aC = aQ.y + uSpin * (7. / (2.5 + aQ.x * .22)) * .1 + sin(uTime * .3 + aQ.y * 7.) * .25; vec3 pC = vec3(cos(aC) * aQ.x, aQ.z + sin(uTime * .4 + aQ.x) * 1.2, sin(aC) * aQ.x);
  vec3 p = mix(pC, pS, uOrd); p.xz *= uK; p.y *= mix(.1, 1., uK);
  vec4 mv = viewMatrix * vec4(uCen + p, 1.); gl_Position = projectionMatrix * mv; float d = -mv.z;
  gl_PointSize = clamp(aR.w * uSz / max(d, 1.), 1., uMx) * mix(.45, 1., uK) * uPs;
  vC = mix(uPal[ci], vec3(1., .96, .86), (1. - smoothstep(0., .22, uK)) * .8);
  vA = uA * (1. + 2.4 * uNt[ci]) * smoothstep(.6, 5., d) * mix(.35, 1., uK) * (.65 + .35 * sin(uTime * (1. + aR.w * 2.) + aR.y * 30.)); }`;
  const MOTE_F = `varying vec3 vC; varying float vA; uniform float uSo; void main(){ vec2 q = gl_PointCoord - .5; float k = exp(-dot(q, q) * uSo); gl_FragColor = vec4(vC * k * vA, 0.); }`;
  /* Båndene: hver type er et bånd av lys, som silke i tomrommet. I kaoset flakker de og floker seg (1 − uOrd); fløyta samler dem til spiralarmer; og når alt
     trekkes sammen (uK), vikles de inn i midten og blir til hvitt lys. aU = (hvor langt ut på armen, siden av båndet, typen). */
  const RIB_V = `attribute vec3 aU; varying float vV, vU, vT; varying vec3 vC; uniform float uTime, uK, uSpin, uOrd, uNt[18]; uniform vec3 uCen, uPal[18];
vec3 arm(float u, float ty){ float r = mix(3.5, 84., pow(u, 1.25)), a = ty * .349066 + 1.75 * log(r + 1.) + uSpin * (7. / (2.5 + r * .22)) * .16;
  vec3 p = vec3(cos(a) * r, sin(u * 5. + ty * 1.3 + uTime * .35) * (1.2 + r * .03), sin(a) * r); float ch = 1. - uOrd, s1 = ty * 2.1 + uTime * .21, s2 = ty * 3.7 - uTime * .17;
  p += vec3(sin(u * 6.3 + s1) + .6 * sin(u * 13.1 + s2), 1.4 * sin(u * 4.7 + s2 * 1.3), cos(u * 5.6 + s1 * 1.1) + .6 * cos(u * 11.3 - s2)) * ch * (5. + 14. * u);
  p.xz *= uK; p.y *= mix(.1, 1., uK); return uCen + p; }
void main(){ float u = aU.x, ty = aU.z; vec4 a = viewMatrix * vec4(arm(u, ty), 1.), b = viewMatrix * vec4(arm(u + .012, ty), 1.); vec2 tn = normalize(b.xy - a.xy + vec2(1e-5, 0.));
  float wd = (.5 + 1.7 * sin(3.14159 * u)) * mix(.4, 1., uK) * (1. + .4 * uNt[int(ty + .5)]); a.xy += vec2(-tn.y, tn.x) * aU.y * wd; gl_Position = projectionMatrix * a;
  vV = aU.y; vU = u; vT = ty; vC = mix(uPal[int(ty + .5)], vec3(1., .96, .86), (1. - smoothstep(0., .22, uK)) * .8); }`;
  const RIB_F = `varying float vV, vU, vT; varying vec3 vC; uniform float uTime, uA, uNt[18];
void main(){ float x = 1. - vV * vV, fl = .55 + .45 * sin(vU * 46. - uTime * 2.6 + vT * 2.3), a = x * x * smoothstep(0., .08, vU) * (1. - smoothstep(.8, 1., vU)) * fl * uA * (1. + 1.5 * uNt[int(vT + .5)]);
  gl_FragColor = vec4(vC * a + vec3(1.) * a * x * x * .18, 0.); }`;
  /* JUDGMENT: søyler av lys som faller fra himmelen (aJ: x, z, når den treffer). Hver er et bånd som alltid vender mot kameraet, fra hodet (som faller JV m/s) og
     opp til himmelen; i treffet blir den bredere et øyeblikk og blekner. Og ringene der de treffer glasset. */
  const JY = 130., JV = 150., JB = 0.34;   /* JB: kula brister i senit 0,34 s etter droppet (lyden «arceus_judgment» er klippet slik) */
  const LAN_V = `attribute vec3 aJ; varying vec2 vQ; varying float vF, vH; uniform float uTime;
void main(){ float age = uTime - aJ.z + ${(JY / JV).toFixed(4)}, hitA = uTime - aJ.z, y0 = max(${JY.toFixed(1)} - age * ${JV.toFixed(1)}, 0.);
  float w = mix(.7, 1.9, clamp(hitA * 5., 0., 1.)) * (1. - .6 * smoothstep(.08, .6, hitA)); vF = step(0., age) * (1. - smoothstep(0., .6, hitA));
  vec3 base = vec3(aJ.x, 0., aJ.y), toC = cameraPosition - (modelMatrix * vec4(base, 1.)).xyz, rt = normalize(vec3(toC.z, 0., -toC.x)); float y = mix(y0, ${(JY + 40).toFixed(1)}, position.y);
  vQ = vec2(position.x * 2., position.y); vH = y - y0; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(base + rt * position.x * w + vec3(0., y, 0.), 1.); }`;
  const LAN_F = `varying vec2 vQ; varying float vF, vH; void main(){ if (vF < .01) discard; float x = 1. - abs(vQ.x), hd = exp(-vH * .1);
  gl_FragColor = vec4((vec3(1., .97, .88) * pow(x, 6.) * (1. + 2.2 * hd) + vec3(1., .78, .4) * x * x * (.22 + .5 * hd)) * vF, 0.); }`;
  const IMP_V = `attribute vec3 aJ; varying float vF; varying vec2 vQ; uniform float uTime;
void main(){ float age = uTime - aJ.z, r = 5. * (1. - exp(-age * 3.6)); vF = step(0., age) * (1. - smoothstep(.1, 1.1, age)); vQ = position.xz;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aJ.x + position.x * r, .04, aJ.y + position.z * r, 1.); }`;
  const IMP_F = `varying float vF; varying vec2 vQ; void main(){ if (vF < .01) discard; float l = length(vQ), k = (1. - smoothstep(0., .14, abs(l - .85))) + exp(-l * l * 9.) * 1.5 * vF;
  gl_FragColor = vec4(vec3(1., .88, .55) * k * vF * 1.8, 0.); }`;
  /* Speilbildet av ham i glasset: samme skjelett og tekstur, myk og dempet, med gullet (uCo: styrke og kanten). */
  const REFL_V = `#include <common>
#include <skinning_pars_vertex>
varying vec3 vW; varying vec2 vUv;
void main(){ vUv = uv;
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 w = modelMatrix * vec4(transformed, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const REFL_F = `varying vec3 vW; varying vec2 vUv; uniform sampler2D map; uniform vec4 uCo; uniform float uA;
void main(){ if (vW.y > 0.) discard; float wy = -vW.y; vec3 b = texture2D(map, vUv).rgb; b = mix(b, vec3(.8, .55, .14) * (.6 + .5 * b.g), uCo.x * step(uCo.y, wy));
  gl_FragColor = vec4(b * uA * exp(-wy * .1), 1.); }`;

  /* ---------- Stedet: Hall of Origin. Bygges likt for filmen og arenaen. ---------- */
  /* Søylene: den indre kolonnaden rundt scenen (16, radius 34), gangen sørover (to rader) og den ytre ringen (24, radius 62, høyere, bak i disen). */
  const PIL = (() => { const L = []; for (let i = 0; i < 16; i++) { if (i === 3 || i === 4) continue;   /* porten mot gangen (og kampens kamera) */ const a = (i + 0.5) / 16 * TAU; L.push([cos(a) * 34, sin(a) * 34, 26]); }
    for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) L.push([sx * 15, 48 + i * 11, 22]);
    for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * TAU; L.push([cos(a) * 62.5, sin(a) * 62.5, 36]); } return L; })();
  const pillarGeo = T => new T.LatheGeometry([[0.001, 0], [2.1, 0], [2.1, 0.45], [1.78, 0.6], [1.9, 0.8], [1.78, 1.0], [1.5, 1.15], [1.42, 1.6], [1.2, 2.6], [1.3, 2.9], [1.3, 3.08], [1.5, 3.3], [1.74, 3.7], [1.84, 4.05], [1.98, 4.15], [1.98, 4.55], [0.001, 4.55]].map(q => new T.Vector2(q[0], q[1])), 28);
  const place = (K, T, S, o) => { o = o || {}; const add = (m, ro) => { m.frustumCulled = false; if (ro != null) m.renderOrder = ro; S.scene.add(m); return m; }, pal = TY.map(c => K.u3(c));
    S.T = T; S.mirs = []; S.pal = pal; S.ax = { x: new T.Vector3(1, 0, 0), y: new T.Vector3(0, 1, 0), z: new T.Vector3(0, 0, 1) };
    const us = S.us = { uSky: K.uv(new T.Vector4(0, 0, 1, 0)), uJd: K.uv(new T.Vector4(0, 0, 0, 0)), uSkyT: K.uv(K.u3('#ffffff')), uSkyTk: K.uv(0), uEgg: K.uv(new T.Vector4(EC[0], EC[1], EC[2], 0)), uHv: K.uv(0), uGw: K.uv(new T.Vector3(0, 0, 14)) };
    S.dome = add(new T.Mesh(new T.SphereGeometry(1, 40, 24), K.shader(DOME_V, DOME_F, Object.assign({}, us), { side: T.BackSide, depthWrite: false, depthTest: false })), -20); S.dome.scale.setScalar(880);   /* innenfor kameraets vanlige grense (900): arenaens kamera settes av verktøykassa */
    { const n = 6400, P = new Float32Array(n * 3), A = new Float32Array(n * 4), GN = [0.7368, 0.6754, 0.0286];
      for (let i = 0; i < n; i++) { let u = rnd(i, 1) * 2 - 1, a = rnd(i, 2) * TAU, s = Math.sqrt(1 - u * u), b = rnd(i, 3), d = [cos(a) * s, u, sin(a) * s];
        if (i % 5 < 2) { const gd = d[0] * GN[0] + Math.abs(d[1]) * GN[1] + d[2] * GN[2], k = 0.82; d = [d[0] - GN[0] * gd * k, d[1] - Math.sign(d[1] || 1) * GN[1] * gd * k, d[2] - GN[2] * gd * k]; const l = hyp(d[0], d[1], d[2]); d = d.map(q => q / l); }   /* to av fem trekkes inn mot galaksebåndet */
        P.set([d[0] * 780, d[1] * 780, d[2] * 780], i * 3); A.set([b > 0.985 ? 4.6 : b > 0.9 ? 3 : 1.9, 0.3 + 0.7 * b * b, rnd(i, 4), rnd(i, 5)], i * 4); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aS', new T.BufferAttribute(A, 4));
      S.stars = add(new T.Points(g, K.shader(STAR_V, STAR_F, Object.assign({}, us), Object.assign(K.blend.add(), { depthTest: false }))), -15); }
    S.mirG = new T.Group(); S.mirG.scale.y = -1; S.scene.add(S.mirG);
    const disc = new T.CircleGeometry(400, 96); disc.rotateX(-PI / 2);
    S.glass = add(new T.Mesh(disc, K.shader(FLV, GLASS_F, { uGl: K.uv(o.all ? 400 : 0), uGA: K.uv(1) }, K.blend.soft())), -6);
    S.lines = add(new T.Mesh(disc, K.shader(FLV, LINE_F, Object.assign({ uR1: K.uv(o.all ? 400 : 0), uR2: K.uv(o.all ? 400 : 0), uA: K.uv(1), uLit: K.uv(0), uMk: K.uv(new Array(18).fill(0)), uC1: K.uv(K.u3('#ffdf9a')), uC2: K.uv(K.u3('#8fe9ff')), uPal: K.uv(pal),
      uWv: K.uv(Array.from({ length: 6 }, () => new T.Vector4(0, 0, -99, 0))), uFr: K.uv([0, 1].map(() => new T.Vector4(0, 0, 1, 0))), uTp: K.uv(new T.Vector4(1, 1, 1, 0)), uMr: K.uv(0) }, { uEgg: us.uEgg }), K.blend.add())), -5); S.lines.position.y = 0.02;
    /* Søylene og speilbildene deres. grow(q, i) → [når, hvor lenge]; i arenaen står de alt. */
    { const geo = pillarGeo(T), n = PIL.length, mk = (mir) => { const ig = geo.clone(), aI = new Float32Array(n * 4); PIL.forEach((q, i) => { const g = o.grow ? o.grow(q, i) : [-99, 1]; aI.set([g[0], g[1], q[2], rnd(i, 9)], i * 4); }); ig.setAttribute('aI', new T.InstancedBufferAttribute(aI, 4));
        const m = new T.InstancedMesh(ig, K.shader(PIL_V, PIL_F, Object.assign({ uMir: K.uv(mir ? -1 : 1), uLit: K.uv(0), uRef: K.uv(mir ? 0.5 : 1), uTc: K.uv(K.u3('#9fe6ff')), uHv: S.us.uHv, uGw: S.us.uGw }, { uEgg: us.uEgg }), { side: T.DoubleSide }), n), ob = new T.Object3D();
        PIL.forEach((q, i) => { ob.position.set(q[0], 0, q[1]); ob.updateMatrix(); m.setMatrixAt(i, ob.matrix); }); m.frustumCulled = false; return m; };
      S.pil = mk(0); S.scene.add(S.pil); S.pilM = mk(1); S.mirG.add(S.pilM); }
    /* Støv av lys som driver i hallen (tennes med stjernene). */
    S.motes = add(K.pts(260, i => { const a = rnd(i, 11) * TAU, r = 6 + Math.sqrt(rnd(i, 12)) * 60; return { p: [cos(a) * r, 0.5 + rnd(i, 13) * 26, sin(a) * r], v: [(rnd(i, 14) - 0.5) * 0.3, 0.12 + rnd(i, 15) * 0.2, (rnd(i, 16) - 0.5) * 0.3], b: rnd(i, 17) * 24, l: 24, z: 0.4 + rnd(i, 18) * 0.7 }; },
      { loop: 1, add: 1, px: 26, sway: 0.3, c: ['#fff4d0', '#ffe2a0', '#cfe6ff'], fade: 0.8, a: 0, near: 3 }));
    return S; };
  /* Speilbildet av en ting som lyser (ringer, egget, platene, lansene): samme form og materiale i den speilede gruppen, flyttet likt hvert bilde. */
  const mir = (S, m, ro) => { const c = m.clone(); c.renderOrder = ro == null ? -8 : ro; c.frustumCulled = false; c.traverse(q => { q.frustumCulled = false; }); S.mirG.add(c); S.mirs.push([m, c]); return m; };
  const mirSync = S => { for (const [m, c] of S.mirs) { c.visible = m.visible; if (!m.visible) continue; c.position.copy(m.position); c.quaternion.copy(m.quaternion); c.scale.copy(m.scale); } };
  const torus = (T, R, r, c, a) => { const m = new T.Mesh(new T.TorusGeometry(R, r, 8, 144), K.shader(RING_V, RING_F, { uC: K.uv(K.u3(c)), uA: K.uv(a) }, Object.assign(K.blend.add(), { side: T.DoubleSide }))); m.frustumCulled = false; m.userData.a0 = a; return m; };
  /* En ring = en tynn, hvit kjerne og en bred, myk glød i gull. ringA setter styrken. */
  const ring = (T, R, w) => { const g = new T.Group(); g.add(torus(T, R, 0.055 * (w || 1), GOLDW, 1.5)); g.add(torus(T, R, 0.26 * (w || 1), GOLD, 0.13)); g.add(torus(T, R, 0.7 * (w || 1), '#c88a2a', 0.035)); return g; };
  const ringA = (g, a) => { for (const m of g.children) m.material.uniforms.uA.value = m.userData.a0 * a; g.visible = a > 0.003; };
  const setv = (m, p, r, s) => { m.position.set(p[0], p[1], p[2]); if (r) m.rotation.set(r[0], r[1], r[2]); if (s != null) m.scale.setScalar(max(1e-4, s)); };

  /* ---------- Arceus: figuren (piksler), gullet (belegget i motoren, uCoat) og speilbildet i glasset ---------- */
  const cloneSk = src => { const sl = new Map(), cl = new Map(), c = src.clone(true);
    const walk = (a, b) => { sl.set(b, a); cl.set(a, b); for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]); }; walk(src, c);
    c.traverse(n => { if (!n.isSkinnedMesh) return; const s0 = sl.get(n); n.skeleton = s0.skeleton.clone(); n.bindMatrix.copy(s0.bindMatrix); n.skeleton.bones = s0.skeleton.bones.map(b => cl.get(b)); n.bind(n.skeleton, n.bindMatrix); });
    return c; };
  const makeArceus = (T, S) => { const gl = K.model('arceus'), src = cloneSk(gl.scene), g = S.gr = K.figure(gl); S.scene.add(g.root); S.figs.push(g); S.rg = X.rig(g);
    const f = S.rf = K.figure({ scene: src, model: 'arceus' }), un = S.rfU = { uCo: K.uv(new T.Vector4(0, -99, 0, 0)), uA: K.uv(0.5) };
    f.root.traverse(q => { if (!q.isMesh) return; const mp = q.material.uniforms && q.material.uniforms.map ? q.material.uniforms.map.value : null; q.material = K.shader(REFL_V, REFL_F, Object.assign({ map: K.uv(mp) }, un), { side: T.DoubleSide }); q.layers.set(0); q.frustumCulled = false; (S.rfM = S.rfM || []).push([/Eye/.test(q.userData.mn || '') ? 1 : 0, q.material]); });
    S.mirG.add(f.root); S.figs.push(f); S.rrg = X.rig(f);
    g.clear(); g.apply(); g.root.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(g.root, true); S.fy = -bb.min.y; S.hgt = bb.max.y - bb.min.y; };
  /* Stillingene. Hals, rygg og hale i figurens egne akser (X.rig; målt: pluss om X løfter hodet bakover og opp, minus bøyer det fram og ned), forbeinet i benets egne
     (LArm x− løfter det fram, LForeArm y+ bøyer det; høyre side har x speilet: målt med views.js). P = { bow: bøyd (statuen i gull), up: hodet mot himmelen (brølet),
     dip: forvarselet, hoof: høyre hov løftet, br: hvor levende (pust og hale), yaw: hodet dreid (minus = mot kampens kamera), t }. */
  const pose = (S, f, R, P) => { R.reset(); const ax = S.ax, b = P.bow || 0, u = P.up || 0, lv = P.br || 0, br = lv * sin(P.t * 1.25) * 0.012, d = P.dip || 0;
    R.rot('Spine1', ax.x, -0.04 * b + 0.09 * u + br); R.rot('Neck1', ax.x, -0.16 * b + 0.12 * u - 0.03 * d); R.rot('Neck2', ax.x, -0.2 * b + 0.14 * u - 0.04 * d); R.rot('Neck3', ax.x, -0.2 * b + 0.15 * u - 0.05 * d);
    R.rot('Neck4', ax.x, -0.18 * b + 0.14 * u - 0.05 * d); R.rot('Head', ax.x, -0.22 * b + 0.2 * u - 0.1 * d + lv * 0.01 * sin(P.t * 0.9 + 1));
    if (P.yaw) { R.rot('Neck2', ax.y, P.yaw * 0.3); R.rot('Neck4', ax.y, P.yaw * 0.3); R.rot('Head', ax.y, P.yaw * 0.4); }
    if (P.hoof) f.add({ RArm: [0.5 * P.hoof, 0, 0], RForeArm: [0, 0.95 * P.hoof, 0], RHand: [0, 0.25 * P.hoof, 0] }, 1);
    const sw = lv * 0.05; R.rot('Tail1', ax.y, sw * sin(P.t * 0.8)); R.rot('Tail2', ax.y, sw * 1.3 * sin(P.t * 0.8 - 0.7)); R.rot('Tail3', ax.y, sw * 1.6 * sin(P.t * 0.8 - 1.4)); R.rot('Tail1', ax.x, 0.1 * u); };
  const setCoat = (S, k, y, sheen) => { S.gr.set('uCoat', [k, y, 0.55, sheen == null ? -1e4 : sheen]); for (const m of S.gr.eyes) m.uniforms.uCoat.value.x = 0; S.rfU.uCo.value.set(k, y, 0, 0); };
  /* Gnistene i brølet: modellen har ingen kjeve, så de går ut fra en fast plass foran hodet. */
  const mouth = (S, t0, t) => { const h = S.gr.at('Head'), n = S.gr.at('Neck4'), d = h.clone().sub(n).normalize(), m = K.proj(h.x + d.x * 0.9, h.y + d.y * 0.9 - 0.2, h.z + d.z * 0.9 + 0.8);
    S.post.spx = m.x / 2; S.post.spy = m.y / 2; S.post.spr = 0.1; S.post.spd = 0.9 * S.rw * hit(t, t0, 2.4); S.mouth = m; S.post.spc = '#fff0b0'; };
  /* Kampens kamera (X.arena nederst stiller det likt): siktet dreies til plassen hans treffer (377, 198) i bildet. Filmen ender i dette bildet. */
  const CAMB = { cp: [-10, 4, 36.5], tg: [-5, 6.2, 0], fv: 34, kq: 0.06 }, WHEEL = [0, 3.86, -0.8], ORB = [0, 10.4, 0.3];
  let endTg = null;
  const camEnd = () => { if (!endTg) { const tg = CAMB.tg.slice(), cp = CAMB.cp; for (let i = 0; i < 14; i++) { K.cam(cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv); const q = K.proj(0, 0, 0); tg[0] -= (377 - q.x) * CAMB.kq; tg[1] += (198 - q.y) * CAMB.kq; } endTg = tg; } return endTg; };

  /* ---------- Det filmen har i tillegg til stedet ---------- */
  const NP = 17, NJ = 120;
  const NEAR = [[-13.5, 21, 1.25], [0.5, 25, 1.7], [-15, 29, 2.15], [-3, 30.5, 2.6], [-16.5, 31, 3.1], [-4.5, 32, 3.6]].map(q => [q[0], q[1], DROP + q[2]]);   /* de som slår ned rett ved oss (Hold) */
  const JT = (() => { const L = NEAR.slice(); for (let i = L.length; i < NJ; i++) { const a = rnd(i, 31) * TAU, r = 9 + 60 * Math.sqrt(rnd(i, 32)); const x = cos(a) * r, z = sin(a) * r * 0.9 + 4; if (z > 2 && abs(x + 0.274 * z) < 5) { L.push([x + (x + 0.274 * z < 0 ? -9 : 9), z, DROP + 0.62 + 2.9 * Math.pow(rnd(i, 33), 1.25)]); continue; }   /* aldri i synslinja mellom kampens kamera og ham */
      L.push([x, z, DROP + 0.62 + 2.9 * Math.pow(rnd(i, 33), 1.25)]); } return L; })();
  const orbitAt = (i, t, Rr, y0) => { const a = PI / 2 + (i + 1) / 18 * TAU + (t - LIFT[4]) * 0.2; return [cos(a) * Rr, y0 + 1.1 * sin(a * 2 + 0.7 + t * 0.3), sin(a) * Rr, a]; };
  const build = (K, T, S) => {
    const add = (m, ro) => { m.frustumCulled = false; if (ro != null) m.renderOrder = ro; S.scene.add(m); return m; }, pal = S.pal;
    /* Kaoset. */
    const cloud = (n, seed, sz, mx, so, zf) => { const R4 = new Float32Array(n * 4), Q4 = new Float32Array(n * 4), geo = new T.BufferGeometry();
      for (let i = 0; i < n; i++) { const ty = floor(rnd(i, seed + 7) * 18), r = 3 + 76 * Math.pow(rnd(i, seed + 1), 0.8); R4.set([r, (rnd(i, seed + 2) - 0.5) * (0.5 + 5 / (r + 4)), (rnd(i, seed + 3) - 0.5) * 16, zf(i)], i * 4);
        Q4.set([3 + 80 * Math.pow(rnd(i, seed + 4), 0.7), rnd(i, seed + 5) * TAU, (rnd(i, seed + 6) - 0.5) * 22, ty], i * 4); }
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('aR', new T.BufferAttribute(R4, 4)); geo.setAttribute('aQ', new T.BufferAttribute(Q4, 4));
      return new T.Points(geo, K.shader(MOTE_V, MOTE_F, { uK: K.uv(1), uSpin: K.uv(0), uA: K.uv(0), uOrd: K.uv(0), uSz: K.uv(sz), uMx: K.uv(mx), uSo: K.uv(so), uNt: K.uv(new Array(18).fill(0)), uCen: K.uv(new T.Vector3(...EC)), uPal: K.uv(pal) }, Object.assign(K.blend.add(), { depthTest: false }))); };
    S.gas = add(cloud(170, 100, 4600, 120, 5.5, i => 0.6 + 1.0 * rnd(i, 108)), -12);
    { const N = 120, pos = [], au = [], idx = []; for (let k = 0; k < 18; k++) { const b = k * (N + 1) * 2; for (let i = 0; i <= N; i++) { pos.push(0, 0, 0, 0, 0, 0); au.push(i / N, -1, k, i / N, 1, k); if (i < N) { const q = b + i * 2; idx.push(q, q + 1, q + 2, q + 2, q + 1, q + 3); } } }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('aU', new T.Float32BufferAttribute(au, 3)); geo.setIndex(idx);
      S.rib = add(new T.Mesh(geo, K.shader(RIB_V, RIB_F, { uK: K.uv(1), uSpin: K.uv(0), uA: K.uv(0), uOrd: K.uv(0), uNt: K.uv(new Array(18).fill(0)), uCen: K.uv(new T.Vector3(...EC)), uPal: K.uv(pal) }, Object.assign(K.blend.add(), { depthTest: false, side: T.DoubleSide }))), -11); }
    S.mote = add(cloud(3200, 0, 430, 30, 16, i => 0.4 + 1.9 * rnd(i, 8) * rnd(i, 9)), -9);
    /* Egget: skallet av lys, et usynlig skall som bare skriver dybde (så skikkelsen inni ligger BAK lyset og skimtes gjennom det), og punktet det blir til av. */
    const eg = new T.SphereGeometry(ER, 56, 36), eggM = (gh) => K.shader(EGG_V, EGG_F, { uA: K.uv(0), uIn: K.uv(1), uGh: K.uv(gh), uPal: K.uv(pal) }, gh ? K.blend.add() : {});
    S.egg = mir(S, add(new T.Mesh(eg, eggM(0)), 1), -9); S.egg.position.set(...EC);
    S.eggX = mir(S, add(new T.Mesh(eg, eggM(1)), 2)); S.eggX.position.set(...EC);
    S.seed = add(K.pts(3, i => ({ p: [0, 0, 0], v: [0, 0, 0], b: 0, l: 1e9, z: [3.4, 1.5, 0.6][i] }), { add: 1, px: 150, c: ['#fff6dc', '#fff6dc', '#ffffff'], fade: 0.99, a: 0 }), 3); S.seed.position.set(...EC);
    /* De fem ringene rundt egget (én per løft), gloriene egget åpner seg til, ringen som løfter gullet av ham, og kula i Judgment. */
    S.rings = [0, 1, 2, 3, 4].map(i => mir(S, add(ring(T, 6.5 + 0.42 * i), 4)));
    S.halo = [6.2, 7.5, 8.9].map(Rr => mir(S, add(ring(T, Rr, 1.15), 4)));
    S.tide = mir(S, add(ring(T, 3.4, 0.8), 4));
    S.orb = mir(S, add(K.pts(3, i => ({ p: [0, 0, 0], v: [0, 0, 0], b: 0, l: 1e9, z: [6, 2.6, 1.1][i] }), { add: 1, px: 150, c: ['#ffe9b0', '#fff6dc', '#ffffff'], fade: 0.99, a: 0 }), 5));
    { const pl = new T.PlaneGeometry(1, 1); pl.translate(0, 0.5, 0);   /* halen etter kula: et mykt bånd som alltid vender mot kameraet, sterkest ved kula og borte nederst */
      S.trail = mir(S, add(new T.Mesh(pl, K.shader(`varying vec2 vQ; uniform vec3 uTr; void main(){ vec3 b = (modelMatrix * vec4(0., 0., 0., 1.)).xyz, toC = cameraPosition - b, rt = normalize(vec3(toC.z, 0., -toC.x)); vQ = vec2(position.x * 2., position.y);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(rt * position.x * uTr.x + vec3(0., position.y * uTr.y, 0.), 1.); }`, `varying vec2 vQ; uniform float uA; void main(){ float x = 1. - abs(vQ.x), y = vQ.y;
  gl_FragColor = vec4((vec3(1., .97, .88) * pow(x, 3.) * (.5 + 1.8 * y * y) + vec3(1., .78, .4) * x * x * (.2 + .6 * y)) * smoothstep(0., .1, y) * uA, 0.); }`, { uA: K.uv(0), uTr: K.uv(new T.Vector3(1, 1, 0)) }, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 5)); }
    /* Platene. */
    S.pl = []; for (let i = 0; i < NP; i++) { const m = mir(S, add(new T.Mesh(new T.BoxGeometry(0.88, 1.24, 0.1), K.shader(PLATE_V, PLATE_F, { uC: K.uv(pal[i + 1].clone()), uA: K.uv(1), uGo: K.uv(0) })))); m.visible = false; S.pl.push(m); }
    makeArceus(T, S);
    /* Gullet som faller av: bladgull i figurens piksler (fire takter: beina, kroppen, halsen, hodet) og gullstøv. Bitene starter der kroppen er (målt på benene). */
    const Z = S.zone = [3.0, 4.9, 6.25, S.hgt + 1];   /* hvor høyt gullet har sluppet etter hver takt */
    const spot = (k, i) => { const s = k * 13 + 1, u = rnd(i, s), a = rnd(i, s + 1) * TAU, y = mix(k ? Z[k - 1] : 0.3, min(Z[k], S.hgt), rnd(i, s + 2));
      if (k === 0) { const L = [[1.45, 2.4], [-1.45, 2.4], [0.9, -2.5], [-0.9, -2.5]][i % 4]; return [L[0] + cos(a) * 0.45, y, L[1] + sin(a) * 0.45, a]; }
      if (k === 1) { if (u < 0.4) { const w = rnd(i, s + 3) * TAU; return [cos(w) * 2.6, 3.86 + sin(w) * 2.6, -0.8, w < PI ? 0 : PI]; } return [cos(a) * 1.15, y, -0.3 + sin(a) * 2.3, a]; }
      if (k === 2) return [cos(a) * 0.6, y, 1.9 + sin(a) * 0.6, a];
      return u < 0.55 ? [cos(a) * 0.7, min(y, 7.7), 2 + sin(a) * 0.8, a] : [cos(a) * 0.35, 7.2 + rnd(i, s + 4) * 1, -1.6 + rnd(i, s + 5) * 3.2, a]; };
    S.flake = [0, 1, 2, 3].map(k => { const m = K.shards(84, i => { const q = spot(k, i), sp = 0.7 + 1.8 * rnd(i, k * 9 + 4);
        return { p: [q[0], q[1], q[2]], v: [cos(q[3]) * sp, 0.3 + 1.4 * rnd(i, k * 9 + 5), sin(q[3]) * sp], r: [(rnd(i, k * 9 + 6) - 0.5) * 10, (rnd(i, k * 9 + 7) - 0.5) * 10, (rnd(i, k * 9 + 8) - 0.5) * 10], s: rnd(i, k * 9 + 9), b: rnd(i, k * 9 + 10) * 0.42, l: 3.4, z: 0.022 + 0.034 * rnd(i, k * 9 + 11) }; },
        { c: '#f2c14a', grey: 0, em: 0.5, sy: 0.22, seed: 21 + k }); S.scene.add(m); return m; });
    S.dust = [0, 1, 2, 3].map(k => add(K.pts(200, i => { const q = spot(k, i + 400); return { p: [q[0], q[1], q[2]], v: [cos(q[3]) * 0.7, 0.4 + rnd(i, k * 7 + 44) * 1.1, sin(q[3]) * 0.7], b: rnd(i, k * 7 + 45) * 0.6, l: 1.8 + rnd(i, k * 7 + 46) * 1.8, z: 0.3 + rnd(i, k * 7 + 47) * 0.5 }; },
      { t0: HIT[3 + k] - 0.03, g: 2.0, drag: 0.6, add: 1, px: 30, sway: 0.2, c: ['#fff6d8', '#ffd66a', '#d8a030'], fade: 0.55, a: 0.9, near: 2 })));
    /* Idet egget åpner seg: skallet blir til lys som stiger. */
    S.open = add(K.pts(420, i => { const u = rnd(i, 61) * 2 - 1, a = rnd(i, 62) * TAU, s = Math.sqrt(1 - u * u), sp = 2 + 5 * rnd(i, 63); return { p: [EC[0] + cos(a) * s * ER, EC[1] + u * ER * EY, EC[2] + sin(a) * s * ER], v: [cos(a) * s * sp, 1.5 + u * sp * 0.6 + 2.5 * rnd(i, 64), sin(a) * s * sp], b: rnd(i, 65) * 0.18, l: 1.6 + rnd(i, 66) * 1.8, z: 0.4 + rnd(i, 67) * 0.8 }; },
      { t0: HIT[0], g: -0.6, drag: 1.1, add: 1, px: 40, sway: 0.3, c: ['#ffffff', '#ffe9a8', '#e0a030'], fade: 0.4, a: 1, near: 2 }));
    /* Judgment. */
    { const cyl = new T.PlaneGeometry(1, 1); cyl.translate(0, 0.5, 0); const ig = new T.InstancedBufferGeometry().copy(cyl); ig.instanceCount = NJ; const aJ = new Float32Array(NJ * 3); JT.forEach((q, i) => aJ.set(q, i * 3)); ig.setAttribute('aJ', new T.InstancedBufferAttribute(aJ, 3));
      S.lan = mir(S, add(new T.Mesh(ig, K.shader(LAN_V, LAN_F, {}, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 6));
      const pl = new T.PlaneGeometry(2, 2); pl.rotateX(-PI / 2); const rg = new T.InstancedBufferGeometry().copy(pl); rg.instanceCount = NJ; rg.setAttribute('aJ', new T.InstancedBufferAttribute(aJ.slice(), 3));
      S.imp = add(new T.Mesh(rg, K.shader(IMP_V, IMP_F, {}, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 6);
      S.spark = add(K.pts(NJ * 5, i => { const q = JT[floor(i / 5)], a = rnd(i, 71) * TAU, sp = 2 + 6 * rnd(i, 72); return { p: [q[0], 0.1, q[1]], v: [cos(a) * sp, 3 + 7 * rnd(i, 73), sin(a) * sp], b: q[2] - DROP + rnd(i, 74) * 0.05, l: 0.7 + rnd(i, 75) * 0.9, z: 0.3 + rnd(i, 76) * 0.5 }; },
        { t0: DROP, g: 14, drag: 0.4, add: 1, px: 40, c: ['#ffffff', '#ffe9a8', '#e0a030'], fade: 0.5, a: 1, near: 2, floor: 0 })); }
    return S; };

  G3D.def('c3:493', {
    len: LEN, hold: 1, R: DROP, at: -K0,   /* kamplåta kommer inn 49,3 s ut i filmen (en kald start), og filmens klokke er dens */
    mus: { seq: [['Azure Flute', 0], ['Hall of Origin', H0, [HFADE, HEND]]], noskip: 19.36,   /* fløyta og Hall of Origin foran kamplåta (PACK.seq); hele fløyta spilles før Skip vises */
      bed: 'sfx/natur/arceus_intro.mp3', hold: ['sfx/natur/arceus_hold.mp3', 0.2, DROP] },   /* lydsengen på filmens klokke (work/raids3d/arceus/lyd/bed.py), og sløyfa mens fingeren holdes fra droppet */
    fig: 2, models: ['arceus'], edge: null, env: { rim: '#ffe2a0', glow: '#bfe9ff', fog: '#04050b', glowH: 6, ink: '#191430' },
    make(K, T) { const S = { scene: new T.Scene(), figs: [] };
      place(K, T, S, { grow: (q, i) => [LIFT[2] + 0.45 + min(hyp(q[0], q[1]), 72) / 62 * 2.5 + rnd(i, 3) * 0.1, 2.2] });   /* ringen går 24,8 m/s utover gulvet, og søylene stiger der den går forbi */
      return build(K, T, S); },
    act(S, t, o) { CS = S; const U = K.U(), us = S.us, lu = S.lines.material.uniforms;
      { const hv = t >= DROP && G3D.hold ? 1 : 0; S.hd = S.hd == null ? hv : S.hd + (hv - S.hd) * 0.2; }   /* Hold: fingeren mot skjermen (bui.js setter G3D.hold); glattet, så kuppelen reiser seg og synker */
      U.uKey.value.set(-0.4, 0.7, 0.6).normalize(); U.uKeyC.value.setRGB(1.0, 0.97, 0.9); U.uShC.value.setRGB(0.42, 0.4, 0.62); U.uRim.value.set(0.1, 0.35, -1).normalize(); U.uRimK.value = 0.85; U.uGlow.value = 0.3;
      U.uFog.value.set(160, 1100, 0.9); U.uFogC.value.setRGB(0.012, 0.014, 0.04);
      /* KAOSET: hver tone i fløyta slår lyset opp i tre av typene og klinger ut; stillheten (3–5,8) er nesten mørk; melodien samler armene (orden), og fra 15,0
         trekkes alt sammen, fortere og fortere, til ett punkt av hvitt lys. */
      const nt = new Array(18).fill(0); let fl = 0;
      FLN.forEach((tn, i) => { if (t < tn) return; const e = Math.exp(-(t - tn) * (i < 4 ? 0.95 : 1.9)); fl += 0.5 * e; for (const k of [0, 6, 12]) nt[(i * 5 + k) % 18] += e; });
      const kk = max(0.004, 1 - Math.pow(seg(t, 15.0, 20.55), 2.1)), spin = 0.35 * t + 0.045 * Math.pow(max(0, t - 5.8), 1.6) + 9 * Math.pow(seg(t, 15, 20.6), 3);
      const ord = 0.1 + 0.9 * io(seg(t, 5.8, 13.5)), ca = (0.07 + 0.25 * seg(t, 5.6, 9) + 0.6 * min(1, fl) + 0.5 * seg(t, 15, 19.5)) * (1 - seg(t, 20.35, 20.9)), con = t < 21;
      for (const m of [S.gas, S.mote, S.rib]) { const u = m.material.uniforms, gas = m === S.gas; u.uK.value = kk; u.uSpin.value = spin; u.uOrd.value = ord; u.uA.value = m === S.rib ? (0.09 + 0.36 * ca) * (1 - seg(t, 20.3, 20.7)) : gas ? ca * 0.16 : (0.3 + ca) * (1 - seg(t, 20.5, 21)); for (let i = 0; i < 18; i++) u.uNt.value[i] = min(1.5, nt[i]); m.visible = con; }
      /* EGGET: punktet (20,4), perlen svulmer fram (20,5–22,3), pulserer på bassen og på hvert løft, og dempes når Hall of Origin toner ut. */
      const open = seg(t, HIT[0], HIT[0] + 0.5), pul = 0.5 * hit(t, HBASS, 1.3) + LIFT.reduce((s, L) => s + 0.4 * hit(t, L, 0.9), 0), grow = back(seg(t, 20.5, 22.3), 1.4), eo1 = 1 + 0.55 * eo(open);
      const ea = (0.86 + 0.5 * pul) * (1 - 0.5 * seg(t, HFADE, K0 + 0.1));
      S.egg.visible = t > 20.5 && t < HIT[0]; S.egg.scale.set(grow, EY * grow, grow); S.egg.material.uniforms.uA.value = ea;
      S.eggX.visible = t >= HIT[0] && open < 1; S.eggX.scale.set(eo1, EY * eo1, eo1); S.eggX.material.uniforms.uA.value = 0.9 * (1 - eo(open));
      S.seed.material.uniforms.uA.value = seg(t, 19.4, 20.5) * (1 - seg(t, 20.9, 22.4)) + 1.5 * hit(t, HIT[0], 0.3); S.seed.scale.setScalar(1 + 2.4 * hit(t, HIT[0], 0.3));
      if (t < HIT[0]) us.uEgg.value.set(EC[0], EC[1], EC[2], 0.25 + 0.62 * ea * grow); else us.uEgg.value.set(0, 7.5, 2, mix(1.05, 0.85, seg(t, HIT[0], HIT[0] + 2)));
      /* DE FEM RINGENE: tennes rundt egget (fra 22,5), og hver løsner på sitt løft og blir en ting i verden. */
      let r1 = 0, gl = 0, r2 = 0, skyF = 0, skyK = 0; lu.uFr.value[0].set(0, 0, 1, 0); lu.uFr.value[1].set(0, 0, 1, 0);
      S.rings.forEach((g, i) => { const L = LIFT[i], app = eo(seg(t, 22.5 + i * 0.32, 23.6 + i * 0.32)), a = t - L, dir = i % 2 ? 1 : -1;
        let p = [...EC], rot = [[0.35, 0.2, 0], [-0.55, 0.9, 0.3], [1.15, -0.4, 0.2], [0.1, 1.45, -0.6], [-1.0, 0.3, 1.1]][i].map((q, j) => q + (j === 0 ? 0.22 * t * dir : j === 1 ? 0.17 * t : 0)), sc = 0.4 + 0.6 * app, al = app * (1 + 0.5 * hit(t, 22.5 + i * 0.32, 0.5));
        const flat = k => { rot = [mix(rot[0] % TAU, PI / 2, k), mix(rot[1] % TAU, 0, k), mix(rot[2], 0, k)]; };
        if (a > 0) {
          if (i === 0) { const k = io(c01(a / 1.0)), e = c01((a - 0.9) / 3.7), rf = 8 + 400 * e * e; flat(k); p = [0, mix(EC[1], 0.05, k), 0]; sc = mix(1, 1.22, k); al = 1 - seg(a, 0.9, 1.5);   /* 1: legges ned, og glasset støpes utover fra den */
            if (a > 0.9) { gl = r1 = rf; lu.uFr.value[0].set(rf, 1 - seg(a, 3.2, 4.6), 1.3, 0); } }
          else if (i === 1) { const k = io(c01(a / 0.7)); flat(k); p = [0, mix(EC[1], 0.08, k), 0]; sc = mix(1, 0.2, k); al = 1 - seg(a, 0.55, 0.9); r2 = a < 0.6 ? 0 : 3 + 150 * Math.pow(c01((a - 0.6) / 4.2), 1.5); }   /* 2: trekkes inn i seglet, og linjene tegnes utover */
          else if (i === 2) { const k = io(c01(a / 0.45)); flat(k); p = [0, mix(EC[1], 0.1, k), 0]; sc = mix(1, 0.75, k); al = 1 - seg(a, 0.4, 0.7);   /* 3: går utover gulvet, og søylene stiger der den går forbi */
            if (a > 0.45) lu.uFr.value[1].set((a - 0.45) / 2.5 * 62, 1.2 * (1 - seg(a, 3.0, 4.0)), 1.0, 0); }
          else if (i === 3) { const k = io(c01(a / 0.45)), e = Math.pow(c01((a - 0.3) / 1.5), 1.6); flat(k); p = [0, EC[1] + 240 * e, 0]; sc = mix(1, 5, e); al = 1 - seg(a, 1.5, 1.85); skyF = a < 1.75 ? 0 : 0.03 + 1.75 * eo(c01((a - 1.75) / 3.0)); skyK = a < 1.75 ? 0 : 1; }   /* 4: til himmels; kosmos tennes fra senit og ned */
          else { al = 1 - seg(a, 0, 0.22); sc = 1 + 0.25 * seg(a, 0, 0.22); } }   /* 5: brister i de 17 platene */
        setv(g, p, rot, sc); ringA(g, al * (1 - 0.4 * seg(t, HFADE, K0))); });
      if (t >= LIFT[4]) { skyF = 2; skyK = 1; }
      const fdone = t > LIFT[0] + 4.6;
      S.glass.material.uniforms.uGl.value = fdone ? 400 : gl; S.glass.visible = gl > 0.01 || fdone;
      lu.uR1.value = fdone ? 400 : r1; lu.uR2.value = t > LIFT[1] + 4.9 ? 400 : r2; S.lines.visible = S.glass.visible; S.mirG.visible = t > LIFT[0] + 0.95;
      lu.uLit.value = seg(t, LIFT[1], LIFT[1] + 3) * (1 - 0.3 * seg(t, HFADE, K0)); lu.uA.value = 1 - 0.3 * seg(t, HFADE, K0) + 0.3 * seg(t, HIT[0], HIT[0] + 0.4);
      us.uSky.value.set(skyK, skyF, 1, 0.25 * seg(t, LIFT[0] + 1, LIFT[0] + 4) + 0.75 * seg(t, LIFT[3] + 2, LIFT[3] + 4.5));
      S.pil.visible = S.pilM.visible = t > LIFT[2]; S.pil.material.uniforms.uLit.value = S.pilM.material.uniforms.uLit.value = lu.uLit.value;
      S.motes.material.uniforms.uA.value = 0.5 * seg(t, LIFT[3] + 2, LIFT[3] + 5);
      /* PLATENE: den femte ringen brister i 17 tavler som glir ut i bane (46,52); på 52,47 og 55,67 låser de seg i hjulet, hver med et blink i sin farge. */
      let flash = -1, fk = 0;
      S.pl.forEach((m, i) => { const out = c01((t - LIFT[4] - i * 0.02) / 1.5), grp = i < 9 ? 1 : 2, tl = HIT[grp] + (i - (grp === 1 ? 0 : 9)) * 0.05, dv = c01((t - tl + 0.5) / 0.5);
        m.visible = t > LIFT[4] && dv < 1; if (t >= tl && t < tl + 0.18) { flash = i + 1; fk = 1 - (t - tl) / 0.18; lu.uMk.value[i + 1] = 1.2; } else lu.uMk.value[i + 1] = t >= tl ? 0.3 + 0.9 * Math.exp(-(t - tl) * 1.6) : 0; if (!m.visible) return;
        const a0 = PI / 2 + (i + 1) / 18 * TAU, st = [EC[0] + cos(a0) * 7.9, EC[1] + 0.6 * sin(a0 * 3), EC[2] + sin(a0) * 7.9], q = orbitAt(i, t, 12, 7.2), e = back(out, 1.2);
        let p = [mix(st[0], q[0], e), mix(st[1], q[1], e), mix(st[2], q[2], e)]; if (dv > 0) { const k = dv * dv * dv, ga = i * 2.4; p = [mix(p[0], WHEEL[0] + cos(ga) * 2.2, k), mix(p[1], WHEEL[1] + sin(ga) * 2.2, k), mix(p[2], WHEEL[2], k)]; }
        m.position.set(p[0], p[1], p[2]); m.rotation.set(0.14 * sin(t * 0.9 + i), -q[3] + PI / 2, 0.1 * cos(t * 0.7 + i * 2)); const s = mix(0.25, 1, eo(out)) * (1 - 0.6 * dv); m.scale.set(s * mix(2.4, 1, eo(out)), s * mix(0.3, 1, eo(out)), s);
        m.material.uniforms.uGo.value = 1 - seg(out, 0.15, 0.7) + 0.8 * dv; });
      lu.uMk.value[0] = t >= HIT[0] ? 0.5 : 0;
      /* ARCEUS: en skikkelse inni egget (skimtes når lyset dempes), så i gull fra egget åpner seg, bøyd og helt stiv; gullet slipper nedenfra takt for takt, og
         det som er fritt, lever: kroppen puster (60,47), halsen reiser seg (62,07), hodet løftes og ser på oss (63,67). */
      const on = t >= LIFT[4] - 0.2, g = S.gr, Z = S.zone; g.root.visible = on; S.rf.root.visible = t >= HIT[0];
      const fsc = mix(0.72, 1, eo(seg(t, HIT[0], HIT[0] + 0.25)));   /* inni egget er han mindre og svever; idet det åpner seg, folder han seg ut og står på glasset */
      for (const f of [g, S.rf]) { f.root.scale.setScalar(fsc); f.root.position.set(0, S.fy * fsc + mix(1.5, 0, (fsc - 0.72) / 0.28), mix(-0.4, 0, (fsc - 0.72) / 0.28)); f.root.rotation.set(0, 0, 0); }
      const roar = t < DROP ? 0 : kf(t, [[DROP, 0], [DROP + 0.3, 1, eo], [NAME + 0.1, 1], [NAME + 1.6, 0.1, io]]); S.rw = roar;
      const bow = t < HIT[5] ? 1 : kf(t, [[HIT[5], 1], [HIT[5] + 1.0, 0.45, eo], [HIT[6], 0.45], [HIT[6] + 0.8, 0, eo]]);
      const yaw = kf(t, [[HIT[6], 0], [HIT[6] + 0.9, -0.55, io], [BRE + 0.55, -0.55], [DROP + 0.25, 0, io], [NAME + 0.3, 0], [NAME + 1.8, -0.4, io]]);
      const P = { t, bow, up: roar, yaw, hoof: kf(t, [[BRE - 0.6, 0], [BRE + 0.4, 1, io], [DROP - 0.03, 1], [DROP + 0.09, 0, ei]]), dip: seg(t, BRE - 0.2, DROP - 0.1) * (1 - seg(t, DROP - 0.04, DROP + 0.12)), br: seg(t, HIT[4], HIT[4] + 1.2) };
      pose(S, g, S.rg, P); pose(S, S.rf, S.rrg, P);
      const gy = kf(t, [[HIT[3] - 0.05, -2], [HIT[3] + 0.5, Z[0], eo], [HIT[4], Z[0]], [HIT[4] + 0.5, Z[1], eo], [HIT[5], Z[1]], [HIT[5] + 0.5, Z[2], eo], [HIT[6], Z[2]], [HIT[6] + 0.5, Z[3], eo]]);
      const born = c01((t - HIT[0]) / 0.5), inEgg = t < HIT[0], sheen = [HIT[1], HIT[2]].reduce((s, h) => t >= h && t < h + 0.9 ? mix(-1, S.hgt + 1, eo((t - h) / 0.9)) : s, -1e4);
      setCoat(S, inEgg ? 0 : 1, gy, sheen); g.set('uFlK', inEgg ? 1 : max(1 - born, 0.5 * fk)); g.set('uFlC', inEgg ? '#2a1804' : flash >= 0 && born >= 1 ? TY[flash] : '#ffffff'); g.set('uStone', 0);
      g.set('uCoatC', flash >= 0 ? TY[flash] : '#ffe69a'); g.eye(0, 0, t < HIT[6] + 0.3 ? 0.5 : 0.35); S.sub = inEgg ? 0.5 * seg(t, LIFT[4] + 0.6, HFADE) + 0.4 * seg(t, HFADE, HEND) : 0;
      S.open.visible = t > HIT[0] - 0.1 && t < HIT[0] + 4;
      /* GLORIENE: egget åpner seg til tre ringer rundt ham (49,55). I pusten trekker de seg sammen over ham, og på droppet er de kula som skytes til himmels. */
      const gather = io(seg(t, HIT[6] + 0.55, BRE + 0.5)), oa = t - DROP, sink = io(seg(t, HIT[3] - 1.3, HIT[3] - 0.3));   /* sink: gloriene legger seg rundt hovene mens gullet slipper, så kroppen og ansiktet står fritt */
      S.halo.forEach((h, i) => { const a = t - HIT[0] - i * 0.07, e = (a < 0 ? 0 : back(c01(a / 0.8), 1.5)) * (1 - sink), R0 = [6.2, 7.5, 8.9][i];
        const cy = mix(mix(EC[1] + (i - 1) * 2.4, 4.6 + (i - 1) * 1.2, a < 0 ? 0 : back(c01(a / 0.8), 1.5)), 0.35 + 0.3 * i, sink), sc = mix(ER * [0.8, 1, 0.8][i] / R0, 1, e) * mix(1, 0.9 / R0, gather) * (1 + 0.03 * sin(t * 2 + i)), pulse = 1 + 0.5 * hit(t, HIT[1], 0.35) + 0.5 * hit(t, HIT[2], 0.35);
        setv(h, [mix(0, ORB[0], gather), mix(cy, ORB[1], gather), mix(-0.3, ORB[2], gather)], [PI / 2 + ([0.3, -0.42, 0.12][i] * e + 0.05 * sin(t * 0.7 + i)) * (1 - gather), t * [0.2, -0.14, 0.09][i], [0.16, -0.22, 0.4][i] * e * (1 - gather)], sc);
        ringA(h, a < 0 || oa > 0 ? 0 : eo(c01(a / 0.3)) * pulse * mix(mix(0.7, 0.5, sink), 1.6, gather)); });
      /* Ringen som løfter gullet av ham: den står ved kanten, og tar ett steg opp på hver takt. */
      { const a = seg(t, HIT[3] - 0.3, HIT[3]) * (1 - seg(t, HIT[6] + 0.5, HIT[6] + 0.9)), w = 1 + 1.2 * [3, 4, 5, 6].reduce((s, k) => s + hit(t, HIT[k], 0.35), 0), zc = kf(t, [[HIT[4] + 0.5, 0], [HIT[5] + 0.5, 1.6, io], [HIT[6] + 0.5, 1.2, io]]), rr = kf(t, [[HIT[4] + 0.5, 3.4], [HIT[5] + 0.5, 1.9, io], [HIT[6] + 0.5, 2.4, io]]);
        setv(S.tide, [0, max(0.1, gy) + 0.05, zc], [PI / 2, 0, 0], rr / 3.4); ringA(S.tide, a * w * 0.8); }
      S.flake.forEach((m, k) => m.at(t, HIT[3 + k], { g: 5.5, floor: 0.02 }));
      /* JUDGMENT (65,27): hoven i glasset, kula til himmels på 0,4 s, den brister i senit, og lyset regner over hele hallen. */
      const ok = c01(oa / JB), oy = mix(ORB[1], 250, ok * ok); S.orb.visible = t > BRE && oa < JB + 0.02; S.orb.position.set(ORB[0], oa < 0 ? ORB[1] : oy, ORB[2]); S.orb.material.uniforms.uA.value = oa < 0 ? 0.8 * seg(t, BRE, DROP - 0.1) : 1.6;
      S.trail.visible = oa > 0 && oa < 1.1; if (S.trail.visible) { S.trail.position.set(ORB[0], ORB[1], ORB[2]); S.trail.material.uniforms.uTr.value.set(3.2 + 4 * c01(oa / 1.1), max(0.01, oy - ORB[1]), 0); S.trail.material.uniforms.uA.value = 2.6 * (1 - c01(oa / 1.1)); }
      us.uJd.value.set(max(0, oa - JB), oa > JB ? 1 : 0, 0, 0); S.lan.visible = S.imp.visible = S.spark.visible = oa > JB;
      lu.uWv.value[0].set(0, 0, HIT[0], t >= HIT[0] ? 1.3 : 0); lu.uWv.value[1].set(-1.5, 2.6, DROP + 0.05, t >= DROP + 0.05 ? 1.6 : 0);
      mirSync(S);
    },
    shots: [
      /* 1 Varselet: kaoset i tomrommet. Kameraet glir sakte inn over virvelen og løfter seg; teksten skrives oppå. */
      [0, (S, u, a, t) => { camK(t, [[0, -16, 8, 60, 8, 5, 0, 54], [5.8, -13, 14, 58, 4, 4, 0, 52], [12, -8, 30, 50, 0, 3, 0, 50], [16, -3, 46, 40, 0, 3, 0, 48], [19, 0, 56, 30, 0, 4, 0, 46]], 0.05 * (1 - seg(t, 10, 17))); S.post.fade = 1 - seg(t, 0, 0.7); }],
      /* 2 Hall of Origin: det siste av kaoset går i spiral inn i punktet, og egget av lys står der med de fem ringene. Det første bildet av ham: stort, og i ro. */
      [H0, (S, u, a, t) => { camK(t, [[H0, 6, 12, 28, 0, 5.6, 0, 42], [22.6, 4, 8.6, 21.5, 0, 5.9, 0, 42], [LIFT[0], 2.2, 7.4, 18, 0, 6, 0, 42]]); S.post.fl = 0.25 * hit(t, 20.5, 0.1); S.post.flc = '#fff2cf'; }],
      /* 3 Løft 1 og 2: høyt over. Ringen legges ned og glasset støpes utover; så tegnes lyslinjene. */
      [LIFT[0], (S, u, a, t) => { camK(t, [[LIFT[0], 18, 15, 26, 0, 3.5, 0, 46], [LIFT[0] + 2.6, 25, 25, 33, 0, 1, 0, 47], [LIFT[1], 30, 36, 39, 0, 0, 2, 48], [LIFT[2], 24, 54, 46, 0, 0, 6, 50]]); S.post.sh = 0.5 * hit(t, LIFT[0] + 0.9, 0.5) + 0.4 * hit(t, LIFT[1] + 0.6, 0.4); }],
      /* 4 Løft 3 og 4: lavt i gangen. Søylene stiger opp gjennom glasset rundt oss; så skytes ringen til himmels, og kosmos tennes fra senit og ned. */
      [LIFT[2], (S, u, a, t) => { camK(t, [[LIFT[2], 8, 4.2, 66, 0, 8, 0, 50], [LIFT[3], 6, 2.4, 56, 0, 12, 0, 52], [LIFT[3] + 1.9, 5.4, 1.8, 54, 0, 48, -8, 56], [LIFT[3] + 3.7, 5, 1.9, 52.5, 0, 30, -4, 54], [LIFT[4], 4.5, 2, 51, 0, 10, 0, 50]]); S.post.sh = 0.6 * seg(t, LIFT[2] + 0.6, LIFT[2] + 1.4) * (1 - seg(t, LIFT[2] + 2.6, LIFT[2] + 3.6)); }],
      /* 5 Løft 5: ringen brister i de 17 platene. Musikken toner ut, lyset dempes, og en skikkelse skimtes inni egget. */
      [LIFT[4], (S, u, a, t) => { camK(t, [[LIFT[4], -9, 6.5, 19, 0, 5.8, 0, 46], [K0, -6, 6.2, 16.5, 0, 5.8, 0, 44]]); S.post.sub = S.sub; S.post.subf = 0.01; S.post.subc = '#ffffff'; }],
      /* 6 Kamplåta: egget åpner seg til glorier rundt en skikkelse av gull (49,55). Platene låser seg i hjulet (52,47 og 55,67). */
      [K0, (S, u, a, t) => { camK(t, [[K0, -9.5, 2.2, 27, 0, 5.4, 0, 40], [HIT[2], -7.5, 2.6, 22.5, 0, 5.2, 0, 40], [HIT[3] - 0.7, -6.8, 2.7, 21, 0, 5.2, 0, 40]]); S.post.sub = t < HIT[0] ? S.sub : 0; S.post.subf = 0.01; S.post.subc = '#ffffff';
        S.post.sh = 1.2 * hit(t, HIT[0], 0.7) + 0.6 * hit(t, HIT[1], 0.4) + 0.6 * hit(t, HIT[2], 0.4); S.post.fl = max(0.5 * hit(t, HIT[0], 0.12), 0.16 * hit(t, HIT[1], 0.08), 0.16 * hit(t, HIT[2], 0.08)); S.post.flc = '#fff2cf'; }],
      /* 7 Gullet slipper, én del per takt: kameraet stiger med kanten, fra hovene til ansiktet. Så pusten, tett på, helt stille. */
      [HIT[3] - 0.7, (S, u, a, t) => { camK(t, [[HIT[3] - 0.7, -6.5, 1.0, 14.5, 0, 1.7, 0.6, 44], [HIT[3] + 0.6, -6.2, 1.5, 14, 0, 2.0, 0.6, 43], [HIT[4] + 0.6, -5.6, 3.6, 13.4, 0, 3.9, 0.2, 42], [HIT[5] + 0.6, -4.6, 5.9, 12.2, 0, 5.7, 1.5, 38], [HIT[6] + 0.75, -3.0, 7.25, 10.2, 0, 6.95, 1.9, 27], [DROP, -2.8, 7.25, 9.8, 0, 6.95, 1.9, 25]]);
        S.post.sh = 0.5 * [3, 4, 5, 6].reduce((s, k) => s + hit(t, HIT[k], 0.35), 0); }],
      /* 8 Droppet: Judgment. Hoven i glasset, hodet mot himmelen, kula til himmels og regnet av lys over hallen; kameraet glir til kampens bilde, og navnet. */
      [DROP, (S, u, a, t) => { const tg = camEnd(), cp = CAMB.cp; camK(t, [[DROP, -5.5, 0.9, 11.5, 0, 7.2, 0, 54], [DROP + 0.6, -6.3, 1.2, 14, 0, 9.5, 0, 56], [NAME + 0.6, cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv]]); mouth(S, DROP, t);
        const hd = S.hd || 0, nh = NEAR.reduce((q, h) => q + hit(t, h[2], 0.4), 0), nf = NEAR.reduce((q, h) => max(q, hit(t, h[2], 0.1)), 0);   /* uten Hold blender og rister lyset som slår ned ved oss; med Hold tar kuppelen det */
        S.post.sh = (2 * hit(t, DROP, 0.9) + 1.3 * hit(t, DROP + JB, 0.8) + 0.5 * seg(t, DROP + 0.7, DROP + 1.4) * (1 - seg(t, DROP + 2.4, DROP + 3.4))) * (1 - 0.45 * hd) + nh * mix(1.7, 0.5, hd);
        S.post.fl = max(0.3 * hit(t, DROP, 0.08), 0.45 * hit(t, DROP + JB, 0.12), 0.3 * nf * (1 - hd)); S.post.flc = '#fff2c8'; }],
    ],
  });
  /* Varselet: teksten skrives oppå filmen mens fløyta spiller (Jazz 21.11: «3D ja»). */
  const omenFx = t => { if (t > 18.8) return; const a = c01((t - 0.6) / 0.8) * (1 - seg(t, 16.4, 18.4)); if (a <= 0) return; const g = C.g, f = C.fontN(), l1 = 'The one who shaped', l2 = 'the world draws near';
    const n = floor(c01((t - 1.0) / 2.9) * (l1.length + l2.length + 1)), w = 186 * eo(c01((t - 0.6) / 1.2)); g.save(); g.globalAlpha = a;
    const gr = g.createLinearGradient(256 - w, 0, 256 + w, 0); gr.addColorStop(0, 'rgba(255,214,120,0)'); gr.addColorStop(0.5, 'rgba(255,214,120,.9)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); const bg = g.createLinearGradient(0, 270, 0, 364); bg.addColorStop(0, 'rgba(3,3,10,0)'); bg.addColorStop(0.3, 'rgba(3,3,10,.5)'); bg.addColorStop(0.7, 'rgba(3,3,10,.5)'); bg.addColorStop(1, 'rgba(3,3,10,0)'); g.fillStyle = bg; g.fillRect(0, 270, 512, 94);
    g.fillStyle = gr; g.fillRect(256 - w, 286, 2 * w, 1.5); g.fillRect(256 - w, 348, 2 * w, 1.5);
    g.font = `${f[1]}20px ${f[0]}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 6; g.fillStyle = '#fff4dc'; g.fillText(l1.slice(0, min(n, l1.length)), 256, 306); if (n > l1.length) g.fillText(l2.slice(0, n - l1.length - 1), 256, 330); g.restore(); };
  /* Punktet alt blir til (20,5), og glimtet idet egget åpner seg: en stjerne med fire tynne stråler, tegnet oppå. */
  const glint = (S, t) => { const k = seg(t, 19.9, 20.5) * (1 - seg(t, 20.55, 21.6)) + hit(t, HIT[0], 0.35); if (k < 0.01) return; const q = K.proj(EC[0], EC[1], EC[2]); if (q.z >= 1) return; const g = C.g, L = 26 + 150 * k; g.save(); g.globalCompositeOperation = 'lighter';
    for (const [dx, dy, w] of [[1, 0, 1], [0, 1, 0.8], [0.7, 0.7, 0.35], [0.7, -0.7, 0.35]]) { const gr = g.createLinearGradient(q.x - dx * L * w, q.y - dy * L * w, q.x + dx * L * w, q.y + dy * L * w); gr.addColorStop(0, 'rgba(255,236,190,0)'); gr.addColorStop(0.5, `rgba(255,248,226,${0.9 * k})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(q.x - dx * L * w, q.y - dy * L * w); g.lineTo(q.x + dx * L * w, q.y + dy * L * w); g.stroke(); }
    g.restore(); };
  /* HOLD: «HOLD» vises idet kula går til himmels (før navnet), og mens fingeren holdes, står en kuppel av lyslinjer rundt oss: lyset som slår ned ved oss, brer seg
     som ringer over den i stedet for å blende. Valgfritt, og bare for følelsen: filmen er den samme uten. */
  const holdFx = (S, t) => { const hd = S.hd || 0, g = C.g, f = C.fontN(), pa = seg(t, DROP + 0.22, DROP + 0.45) * (1 - seg(t, DROP + 1.12, DROP + 1.34)) * (1 - hd);
    if (pa > 0.01) { g.save(); g.globalAlpha = pa; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${f[1]}17px ${f[0]}`; g.shadowColor = 'rgba(0,0,0,.95)'; g.shadowBlur = 7; g.fillStyle = '#ffe9b0'; g.fillText('HOLD', 256, 354); g.fillText('HOLD', 256, 354);
      g.shadowBlur = 0; g.strokeStyle = 'rgba(255,224,150,.9)'; g.lineWidth = 1.5; const r = 9 + 3 * sin(t * 9); g.beginPath(); g.arc(256, 330, r, 0, TAU); g.stroke(); g.beginPath(); g.arc(256, 330, 3, 0, TAU); g.fillStyle = '#fff4d0'; g.fill(); g.restore(); }
    if (hd < 0.01) return; g.save(); g.globalCompositeOperation = 'lighter'; const cx = 256, cy = 500, e = eo(hd);
    for (let i = 0; i < 5; i++) { const r = (190 + i * 64) * (0.82 + 0.18 * e) + 3 * sin(t * 1.3 + i); g.strokeStyle = `rgba(255,214,130,${(0.32 + 0.08 * sin(t * 2.1 + i * 1.7)) * hd})`; g.lineWidth = i ? 1.4 : 2.6; g.beginPath(); g.arc(cx, cy, r, PI, TAU); g.stroke(); }
    for (let k = 0; k < 15; k++) { const a = PI + (k + 0.5) / 15 * PI, r0 = 190 * (0.82 + 0.18 * e); g.strokeStyle = `rgba(255,214,130,${0.17 * hd})`; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + cos(a) * r0, cy + sin(a) * r0); g.lineTo(cx + cos(a) * 520, cy + sin(a) * 520); g.stroke(); }
    NEAR.forEach((h, i) => { const a = t - h[2]; if (a < 0 || a > 0.8) return; const x = 70 + rnd(i, 5) * 370, y = 50 + rnd(i, 6) * 170, k = a / 0.8, gr = g.createRadialGradient(x, y, 0, x, y, 46);
      gr.addColorStop(0, `rgba(255,244,210,${0.85 * (1 - k) * (1 - k) * hd})`); gr.addColorStop(1, 'rgba(255,214,130,0)'); g.fillStyle = gr; g.fillRect(x - 46, y - 46, 92, 92);
      for (let j = 0; j < 3; j++) { const r = (16 + 150 * eo(k)) * (1 - j * 0.22); g.strokeStyle = `rgba(255,232,170,${0.6 * (1 - k) * hd})`; g.lineWidth = 2 - j * 0.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); } });
    g.restore(); };
  /* Lydene i INTROEN ligger i lydsengen (def.mus.bed: klippene Jazz fant på Epidemic Sound og godkjente 24.11, på filmens tider; brølet er hans eget, signalet 'cry').
     Signalene under gir ristingen i telefonen, og lyd bare når sengen ikke spiller: i løftet i kampen (c3:493p, FORELØPIGE til lydene derfra er skaffet), eller
     hvis sengen ikke lot seg hente. Stille der musikken er stille (fløytas pause, mellom låtene, pusten). */
  const bedOn = () => typeof PACK !== 'undefined' && !!PACK.stinging && PACK.stinging(), pks = (n, v, o) => !bedOn() && typeof c3p === 'function' && c3p(n, v, o), hasT = () => !bedOn() && typeof tone === 'function';
  X.snd.aegg = () => { pks('Wish', 0.2, { len: 2.6, fade: 1.4 }); return [20]; };
  X.snd.aring = k => { if (!bedOn() && typeof swellN === 'function') swellN(0, 1.1, 0.035 + 0.01 * (k || 0), 500, 3200); if (hasT()) tone(220 * Math.pow(1.122, [0, 2, 4, 7, 9][k || 0]), 0.02, 1.4, 0.022, 'sine'); return [15, 30, 15]; };
  X.snd.aplate = () => { pks('Light Screen', 0.2, { len: 1.1, fade: 0.6 }); return [15, 20, 15, 20, 15]; };
  X.snd.aopen = () => { pks('Cosmic Power', 0.3, { len: 2.2, fade: 1.2 }); if (hasT()) tone(98, 0, 1.0, 0.07, 'sine', 49); return [60, 40, 120]; };
  X.snd.agold = k => { pks('Power Gem', 0.13, { off: 0.2, len: 0.9, fade: 0.5, rate: 0.9 + 0.08 * (k || 0) }); return [25]; };
  X.snd.ajdg = () => { pks('Judgment', 0.55, { len: 3.4, fade: 1.6 }); if (hasT()) tone(55, 0, 0.9, 0.12, 'sine', 30); return [90, 40, 260]; };
  /* Lyset som slår ned ved oss følger fingeren og ligger derfor ikke i sengen. Med Hold: skjoldlyden (tre varianter i fila, 2 s fra hverandre). Uten: et lite dunk. */
  X.snd.ahit = i => { const hd = !!G3D.hold; if (hd && typeof c3p === 'function' && c3p('Arceus Shield', 0.5, { off: (i % 3) * 2, len: 1.4, fade: 0.3 })) return [50, 30, 70];
    if (typeof noise === 'function') noise(0, 0.28, hd ? 0.03 : 0.05, 900, 120); if (typeof tone === 'function') tone(hd ? 392 : 70, 0, hd ? 0.5 : 0.3, hd ? 0.03 : 0.06, 'sine', hd ? 784 : 40); return hd ? [50, 30, 70] : [25]; };
  X.sfx.push('Wish', 'Light Screen', 'Cosmic Power', 'Power Gem', 'Judgment', 'Arceus Shield');
  X.reg('c3:493', { spid: 493, skin: SKIN, roar: () => DROP,
    cues: [[20.5, 'aegg']].concat(LIFT.map((L, i) => [L, 'aring', i]), [[HIT[0], 'aopen'], [HIT[1], 'aplate'], [HIT[2], 'aplate']], [3, 4, 5, 6].map((k, i) => [HIT[k], 'agold', i]), [[DROP, 'ajdg'], [DROP, 'cry']], NEAR.map((h, i) => [h[2], 'ahit', i])),
    look(S, t, P) { P.bloom = 0.3; P.bloomT = 0.76; P.vig = 0.36; P.vigc = '#04030c'; P.grain = 0.03; },
    over: (x, t, o) => X.plate(x, t - NAME, Object.assign({ name: 'Arceus', lv: 80, cap: 'The Original One' }, o, { skin: SKIN, cap: 'The Original One' })),
    fx(S, t, P) { omenFx(t); holdFx(S, t); glint(S, t); if (P.shock) for (const q of P.shock) q.a *= 0.3; if (P.bulge) P.bulge.a *= 0.4;   /* lydbølgene bøyde de rette søylene som gummi */ const hd = S.hd || 0; if (hd > 0.01) { P.bloom *= 1 - 0.3 * hd; P.vig += 0.12 * hd; } } });

  /* ===================== LØFTET (1:24,77 i kamplåta): 'c3:493p' =====================
     Fase 2 starter på løftet i låta (kartet tl i manifestet, som hos Kyogre og Groudon: låta styrer, og under halv HP hopper den til oppbyggingen). Filmens tid 0 er
     1:18,5 i låta (tl.pre), der den begynner å stige; løftet kommer PL = 6,27 s inn.
     Han AVSKAPER hallen i motsatt rekkefølge av skapelsen mens låta stiger: de 17 platene strømmer ut av hjulet og går i bane rundt ham, fortere og fortere, stjernene
     slukner fra horisonten og opp, søylene synker i glasset, linjene trekkes inn og glasset krymper, til han står alene på den siste ringen av lys i tomrommet.
     Pusten: platene blir til ÉN (typen kampen har valgt). PÅ LØFTET går den inn i ham, han får platens farger (modellens egne teksturer for typen, som Multitype),
     og hallen skapes på nytt i ett slag, i platens farge. Kort, kan hoppes over, og ender i et hvitt blink tilbake til kampen. */
  const PL = 6.27, PEND = PL + 3.1, TYNL = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'];
  /* Typen kampen har valgt (reglene bytter platen før filmen spilles); G3D.dbgTy til prøvebilder, ellers Fire. */
  const tyNow = () => { try { if (G3D.dbgTy != null) return G3D.dbgTy; const B = typeof BT !== 'undefined' && BT.B, f = B && B.foe && B.foe[B.b]; if (f && f.id === 493 && f.ty && f.ty[0] > 0) return f.ty[0]; } catch (_) {} return 9; };
  /* Typens teksturer fra pakken (arceus_<type>_body.webp og _eye.webp), hentet første gang filmen trenger dem, med samme innstillinger som modellens egne. */
  const tyTex = (S, ty) => { if (S.tex[ty] !== undefined) return S.tex[ty]; S.tex[ty] = null; const T = S.T, m = S.gr.mats, bm = m.Body1 || m[Object.keys(m).find(k => !/Eye/.test(k))], em = m.Eye1 || m[Object.keys(m).find(k => /Eye/.test(k))];
    const one = (part, mat) => Promise.resolve(G3D.src('arceus_' + TYNL[ty] + '_' + part + '.webp')).then(u => new Promise((res, rej) => { if (!u) return rej(new Error('no tex')); new T.TextureLoader().load(u, res, undefined, rej); }))
      .then(tx => { const m0 = mat.uniforms.map.value; tx.flipY = m0.flipY; tx.wrapS = m0.wrapS; tx.wrapT = m0.wrapT; tx.colorSpace = m0.colorSpace; tx.magFilter = m0.magFilter; tx.minFilter = m0.minFilter; tx.generateMipmaps = m0.generateMipmaps; tx.needsUpdate = true; return tx; });
    S.tex0 = S.tex0 || [bm.uniforms.map.value, em.uniforms.map.value]; S.tm = [bm, em];
    Promise.all([one('body', bm), one('eye', em)]).then(a => { S.tex[ty] = a; }).catch(() => { S.tex[ty] = null; }); return null; };
  const tySet = (S, a) => { if (!a || S.texOn === a) return; S.texOn = a; S.tm[0].uniforms.map.value = a[0]; S.tm[1].uniforms.map.value = a[1]; for (const [eye, m] of S.rfM || []) m.uniforms.map.value = a[eye]; };
  const tySkin = ty => { const c = tyC(ty), d = mixHex(c, '#000000', 0.55), l = mixHex(c, '#ffffff', 0.6), h = v => '#' + v.map(q => Math.round(c01(q) * 255).toString(16).padStart(2, '0')).join('');
    return { bg: h(mixHex(c, '#000000', 0.9)), top: c, bot: h(d), cap: h(l), grad: ['#ffffff', h(mixHex(c, '#ffffff', 0.25)), h(mixHex(c, '#000000', 0.25))], lv: h(l), ink: mixHex(c, '#000000', 0.88).map(q => Math.round(q * 255)) }; };
  G3D.def('c3:493p', {
    len: PEND, R: PL, at: 78.5, mus: { bed: 'sfx/natur/arceus_loft.mp3' },   /* lydsengen følger låtas klokke (work/raids3d/arceus/lyd/loft.py) */ fig: 2, models: ['arceus'], edge: null, env: { rim: '#ffe2a0', glow: '#bfe9ff', fog: '#04050b', glowH: 6, ink: '#191430' },
    make(K, T) { const S = { scene: new T.Scene(), figs: [], tex: {} }; place(K, T, S, { all: 1 }); const add = (m, ro) => { m.frustumCulled = false; if (ro != null) m.renderOrder = ro; S.scene.add(m); return m; };
      S.pl = []; for (let i = 0; i < NP; i++) { const m = mir(S, add(new T.Mesh(new T.BoxGeometry(0.88, 1.24, 0.1), K.shader(PLATE_V, PLATE_F, { uC: K.uv(S.pal[i + 1].clone()), uA: K.uv(1), uGo: K.uv(0) })))); m.visible = false; S.pl.push(m); }
      S.glow = mir(S, add(K.pts(3, i => ({ p: [0, 0, 0], v: [0, 0, 0], b: 0, l: 1e9, z: [7, 3, 1.2][i] }), { add: 1, px: 150, c: ['#ffffff', '#ffffff', '#ffffff'], fade: 0.99, a: 0 }), 5));
      S.halo = mir(S, add(ring(T, 6.4, 1.2), 4));
      makeArceus(T, S);
      S.burst = add(K.pts(520, i => { const u = rnd(i, 61) * 2 - 1, a = rnd(i, 62) * TAU, q = Math.sqrt(1 - u * u), sp = 8 + 26 * rnd(i, 63); return { p: [cos(a) * q * 1.5, 4.6 + u * 2.5, sin(a) * q * 1.5], v: [cos(a) * q * sp, 2 + u * sp * 0.5 + 6 * rnd(i, 64), sin(a) * q * sp], b: rnd(i, 65) * 0.12, l: 1.4 + rnd(i, 66) * 1.6, z: 0.4 + rnd(i, 67) * 0.9 }; },
        { t0: PL, g: 3, drag: 1.4, add: 1, px: 44, sway: 0.3, c: ['#ffffff', '#ffffff', '#ffffff'], fade: 0.4, a: 1, near: 2 }));
      return S; },
    act(S, t, o) { CS = S; const U = K.U(), us = S.us, lu = S.lines.material.uniforms, g = S.gr;
      if (S.ty == null || t < 0.05) S.ty = tyNow(); const ty = S.ty, tc = tyC(ty), c3 = hex(tc), tex = tyTex(S, ty), re = t >= PL, rk = eo(seg(t, PL, PL + 0.75));
      U.uKey.value.set(-0.4, 0.7, 0.6).normalize(); U.uKeyC.value.setRGB(1.0, 0.97, 0.9); U.uShC.value.setRGB(0.42, 0.4, 0.62); U.uRim.value.set(0.1, 0.35, -1).normalize(); U.uRimK.value = 0.85; U.uGlow.value = 0.3; U.uFog.value.set(160, 1100, 0.9); U.uFogC.value.setRGB(0.012, 0.014, 0.04);
      /* Avskapelsen (til PL) og gjenskapelsen (fra PL): fronten som søylene, linjene og glasset følger, og bølgen over himmelen. */
      const un = io(seg(t, 1.2, 5.2)), fr = re ? mix(-14, 120, rk) : mix(92, -14, un);
      us.uGw.value.set(1, fr, 14); us.uHv.value = re ? 1.7 * seg(t, PL + 0.6, PL + 2) : 0;
      const lf = re ? 8.5 + 420 * rk * rk : mix(170, 8.5, io(seg(t, 2.6, 5.5))), gf = re ? lf : t < 3 ? 400 : mix(120, 8.5, io(seg(t, 3.0, 5.6)));
      S.glass.material.uniforms.uGl.value = gf > 395 ? 400 : gf; lu.uR1.value = re && rk >= 1 ? 400 : max(lf, 7); lu.uR2.value = re && rk >= 1 ? 400 : re ? lf : mix(170, 0, io(seg(t, 2.2, 5.0)));
      lu.uFr.value[0].set(re ? lf : 0, re ? 1.4 * (1 - seg(t, PL + 0.5, PL + 1.3)) : 0, 1.6, 0); lu.uLit.value = re ? mix(0.9, 0.4, seg(t, PL + 0.8, PL + 2.2)) : 0.5 * (1 - un); lu.uA.value = re ? mix(1.1, 0.85, seg(t, PL + 0.8, PL + 2.2)) : 1;
      const acc = re ? mixHex('#ffffff', tc, c01(rk * 2)) : hex('#8fe9ff'); lu.uC2.value.setRGB(acc[0], acc[1], acc[2]); S.pil.material.uniforms.uTc.value.setRGB(acc[0], acc[1], acc[2]); S.pilM.material.uniforms.uTc.value.setRGB(acc[0], acc[1], acc[2]);
      for (let i = 0; i < 18; i++) lu.uMk.value[i] = re ? (i === ty ? 1.3 : 0.1) : 0.12 * (1 - un); lu.uMr.value = re ? ty * TAU / 18 : 0; lu.uTp.value.set(c3[0], c3[1], c3[2], re ? 0.3 * rk : 0);
      us.uSkyT.value.setRGB(c3[0], c3[1], c3[2]); us.uSkyTk.value = re ? 0.62 : 0; us.uSky.value.set(1, re ? 2.2 * eo(seg(t, PL + 0.1, PL + 1)) : mix(1.75, 0, io(seg(t, 1.0, 4.6))), re ? 1.4 : 1, re ? rk : 1 - un);
      S.pil.material.uniforms.uLit.value = S.pilM.material.uniforms.uLit.value = lu.uLit.value; S.motes.material.uniforms.uA.value = re ? 0.7 * rk : 0.5 * (1 - un);
      us.uEgg.value.set(0, 7.5, 2, re ? 0.9 + 0.8 * hit(t, PL, 0.6) : mix(0.85, 0.25, un));
      /* PLATENE: ut av hjulet (0,2–1,6), i bane rundt ham, fortere og tettere; i pusten blir de til én, og på løftet går den inn i ham. */
      const ph = 0.5 * t + 0.11 * t * t * t, col = seg(t, PL - 0.95, PL - 0.45), pick = [0.5, 4.3, 3.6];
      S.pl.forEach((m, i) => { const out = eo(c01((t - 0.2 - i * 0.07) / 0.8)), me = i + 1 === ty; m.visible = t > 0.2 + i * 0.07 && t < PL + (me ? 0.02 : 0) && (me || col < 1); if (!m.visible) return;
        const a = i / NP * TAU + ph, R = mix(9.5, 5.6, seg(t, 1.5, PL - 1)), q = [cos(a) * R, 4.7 + 0.9 * sin(a * 2 + t) * (1 - seg(t, 2, 5)), sin(a) * R - 0.3];
        let p0 = [mix(WHEEL[0], q[0], out), mix(WHEEL[1], q[1], out), mix(WHEEL[2], q[2], out)], sc = out * (1 - (me ? 0 : col));
        if (me) { const k = io(col); p0 = [mix(p0[0], pick[0], k), mix(p0[1], pick[1], k), mix(p0[2], pick[2], k)]; sc = out * (1 + 0.45 * k); m.rotation.set(0, mix(-a + PI / 2, -0.25, k), 0.08 * sin(t * 3) * k); } else m.rotation.set(0.14 * sin(t * 0.9 + i), -a + PI / 2, 0.1 * cos(t * 0.7 + i * 2));
        m.position.set(p0[0], p0[1], p0[2]); m.scale.setScalar(max(1e-4, sc)); m.material.uniforms.uGo.value = me ? 0.08 * col + 0.6 * seg(t, PL - 0.16, PL) : 0.6 * (1 - out); });
      S.glow.position.set(pick[0], pick[1], pick[2] - (re ? 2 : 0)); S.glow.material.uniforms.uA.value = 0.3 * col * (1 - (re ? 1 : 0)) + 1.5 * hit(t, PL, 0.35); for (const k of ['uC0', 'uC1']) S.glow.material.uniforms[k].value.setRGB(c3[0], c3[1], c3[2]);
      for (const k of ['uC1', 'uC2']) S.burst.material.uniforms[k].value.setRGB(c3[0], c3[1], c3[2]); S.burst.visible = re;
      setv(S.halo, [0, 4.6, -0.3], [PI / 2 + 0.3 * sin(t * 0.4), t * 0.3, 0.2], re ? 0.3 + 2.4 * eo(seg(t, PL, PL + 0.9)) : mix(1, 0.75, un)); ringA(S.halo, re ? 1.4 * (1 - seg(t, PL + 0.5, PL + 1.4)) : 0.5 + 0.5 * un);
      /* ARCEUS: hodet senkes mens verden blir borte; hoven løftes i pusten og slår i glasset på løftet, og hodet kastes mot himmelen. Typens farger fra løftet. */
      for (const f of [g, S.rf]) { f.root.visible = true; f.root.scale.setScalar(1); f.root.position.set(0, S.fy, 0); f.root.rotation.set(0, 0, 0); }
      const roar = !re ? 0 : kf(t, [[PL, 0], [PL + 0.3, 1, eo], [PL + 1.5, 1], [PL + 2.8, 0.1, io]]); S.rw = roar;
      const P = { t, bow: 0.55 * io(seg(t, 0.4, 2.4)) * (1 - seg(t, PL - 0.9, PL - 0.3)), up: roar, yaw: 0, hoof: kf(t, [[PL - 1.1, 0], [PL - 0.35, 1, io], [PL - 0.03, 1], [PL + 0.09, 0, ei]]), dip: 0, br: 1 };
      pose(S, g, S.rg, P); pose(S, S.rf, S.rrg, P); setCoat(S, 0, -99); g.set('uStone', 0); g.eye(0, 0, 0.4);
      if (re) tySet(S, tex); else if (S.texOn) tySet(S, S.tex0);
      g.set('uFlK', max(0.85 * hit(t, PL, 0.16), 0.3 * hit(t, PL, 0.5))); g.set('uFlC', t < PL + 0.1 ? '#ffffff' : tc);
      lu.uWv.value[0].set(-1.5, 2.6, PL + 0.05, t >= PL + 0.05 ? 1.6 : 0);
      mirSync(S);
    },
    shots: [
      /* 1 Fra kampens bilde og inn mot ham, mens hallen blir borte rundt ham. */
      [0, (S, u, a, t) => { const tg = camEnd(), cp = CAMB.cp; camK(t, [[0, cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv], [2.6, -8.6, 3.6, 28, -2, 5.4, 0, 36], [PL - 0.75, -6.4, 3.2, 20, 0, 5.2, 0, 38]]); S.post.sh = 0.5 * seg(t, 1.6, 5) ; }],
      /* 2 Pusten: tett på ham og den ene platen. Alt annet er tomrom. */
      [PL - 0.75, (S, u, a, t) => { cam(mix(-3.4, -3.1, u), 5.5, mix(12.2, 11.4, u), 0, 5.3, 1.6, 34); }],
      /* 3 Løftet: lavt og vidt. Hoven i glasset, og hallen skapes på nytt i platens farge; kameraet glir til kampens bilde, og typen står på skiltet. */
      [PL, (S, u, a, t) => { const tg = camEnd(), cp = CAMB.cp; camK(t, [[PL, -6.2, 1.1, 14, 0, 7.5, 0, 56], [PL + 0.7, -7, 1.5, 17, 0, 9, 0, 56], [PL + 2.3, cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv]]); mouth(S, PL, t);
        S.post.sh = 2.4 * hit(t, PL, 1) + 0.8 * seg(t, PL + 0.1, PL + 0.5) * (1 - seg(t, PL + 0.9, PL + 1.8)); S.post.fl = max(0.5 * hit(t, PL, 0.12), seg(t, PEND - 0.32, PEND - 0.06)); S.post.flc = t < PL + 1 ? S.ty != null ? tyC(S.ty) : '#ffffff' : '#ffffff'; }],
    ],
  });
  X.reg('c3:493p', { spid: 493, swirl: 0, skin: SKIN, roar: () => PL, cues: [[0.3, 'aplate'], [PL - 0.8, 'aring', 4], [PL, 'ajdg'], [PL, 'cry']],
    look(S, t, P) { P.bloom = 0.32; P.bloomT = 0.76; P.vig = 0.36; P.vigc = '#04030c'; P.grain = 0.03; },
    over: (x, t, o) => { const S = G3D.S('c3:493p'), ty = S && S.ty != null ? S.ty : 9; return X.plate(x, t - PL - 1.25, Object.assign({}, o, { name: typeof TYN !== 'undefined' ? TYN[ty] : TYNL[ty], cap: 'Arceus takes the plate of', lv: 0, skin: tySkin(ty) })); },
    fx(S, t, P) { if (P.shock) for (const q of P.shock) q.a *= 0.3; if (P.bulge) P.bulge.a *= 0.4; } });

  /* ---------- Arenaen i kampen: hallen han skapte ----------
     Samme sted som filmen sluttet i, fra kampens kamera: glassgulvet med seglet, søylene og kosmos. Han er Gen 5-bildet lyst av stedet, med speilbildet i glasset.
     TYPEN HAN HAR, SYNES ALLTID: typemerket hans er tent i ringen i gulvet, linjene, glorien bak ham og tåkene i kosmos har platens farge (Normal: gull og blågrønt),
     og når han bytter plate, går en ring i den nye fargen utover gulvet. Stedet slår til (Judgment): søyler av lys faller rundt din Pokémon.
     Arenaen fra steg 2 fantes ikke for Arceus: reserven under (uten 3D) er et enkelt bilde, og uten pakken hentes aldri denne fila, så stedet er som før (raidx.js). */
  const tyC = k => TY[k] || TY[0], mixHex = (a, b, k) => { const x = hex(a), y = hex(b); return [mix(x[0], y[0], k), mix(x[1], y[1], k), mix(x[2], y[2], k)]; };
  if (typeof ARENA !== 'undefined') ARENA.def(493, { yh: 196, use: [], pose: { cz: 1, k: 1, km: 1.9 },
    scene: S => { const g = C.g; g.fillStyle = '#05040c'; g.fillRect(0, 0, 512, 384); C.blob(300, 150, 260, '#2a2046', 0.6, 1); C.blob(377, 205, 150, '#ffe2a0', 0.16, 1, 0.3); C.blob(256, 300, 320, '#8fe9ff', 0.08, 1, 0.3); },
    ev: { enter: { len: 0.6, cues: [[0, 'tick']] }, field: { len: 1.7, cues: [[0, 'rumble'], [0.5, 'sfx', 'Judgment'], [0.62, 'hit']] }, rage: { len: 1.5, cues: [[0, 'rumble'], [0.5, 'cry']] } } });
  const AJ = [[0, -1.5, 0.62], [-3.6, 1.2, 0.74], [3.4, -0.4, 0.86], [-1.4, -4.2, 0.98], [4.6, 2.8, 1.1], [-5.2, -2.6, 1.22]];   /* stedet slår til: [dx, dz, når] rundt din Pokémon */
  X.arena(493, {
    home: [0, 0, 0], foe: [377, 198], me: [190, 372], models: [], edge: null, env: { rim: '#ffe2a0', glow: '#bfe9ff', fog: '#04050b', glowH: 6, ink: '#191430' },
    cam: () => ({ fv: CAMB.fv, cp: CAMB.cp, kq: CAMB.kq, tg: CAMB.tg.slice() }),
    place(K, T) { const S = { scene: new T.Scene(), figs: [] }; place(K, T, S, { all: 1 }); const add = (m, ro) => { m.frustumCulled = false; if (ro != null) m.renderOrder = ro; S.scene.add(m); return m; };
      S.us.uSky.value.set(1, 2, 1, 1);
      /* Fase 2 (etter løftet): de 17 platene går i en stor bane over hallen. */
      S.pl = []; for (let i = 0; i < NP; i++) { const m = mir(S, add(new T.Mesh(new T.BoxGeometry(0.88, 1.24, 0.1), K.shader(PLATE_V, PLATE_F, { uC: K.uv(S.pal[i + 1].clone()), uA: K.uv(1), uGo: K.uv(0) })))); m.visible = false; S.pl.push(m); } return S; },
    dress(S, K, T, fig, m) { S.mp = [m.x, m.z]; const T3 = S.T, add = (q, ro) => { q.frustumCulled = false; if (ro != null) q.renderOrder = ro; S.scene.add(q); return q; };
      /* Judgment over din Pokémon: seks søyler av lys rundt den (aldri på den), ringene i glasset og gnistene. uT0 flyttes dit stedet slår til. */
      const pl = new T3.PlaneGeometry(1, 1); pl.translate(0, 0.5, 0); const ig = new T3.InstancedBufferGeometry().copy(pl); ig.instanceCount = AJ.length; const aJ = new Float32Array(AJ.length * 3); AJ.forEach((q, i) => aJ.set([m.x + q[0], m.z + q[1], q[2]], i * 3)); ig.setAttribute('aJ', new T3.InstancedBufferAttribute(aJ, 3));
      S.jt = K.uv(-1e5); const tu = { uTime: S.jt };   /* egen klokke: sekunder siden stedet slo til */
      S.lan = mir(S, add(new T3.Mesh(ig, K.shader(LAN_V.replace('uniform float uTime;', 'uniform float uJt;').replace(/uTime/g, 'uJt'), LAN_F, { uJt: S.jt }, Object.assign(K.blend.add(), { side: T3.DoubleSide }))), 6));
      const pr = new T3.PlaneGeometry(2, 2); pr.rotateX(-PI / 2); const rg = new T3.InstancedBufferGeometry().copy(pr); rg.instanceCount = AJ.length; rg.setAttribute('aJ', new T3.InstancedBufferAttribute(aJ.slice(), 3));
      S.imp = add(new T3.Mesh(rg, K.shader(IMP_V.replace('uniform float uTime;', 'uniform float uJt;').replace(/uTime/g, 'uJt'), IMP_F, { uJt: S.jt }, Object.assign(K.blend.add(), { side: T3.DoubleSide }))), 6);
      S.spark = add(K.pts(AJ.length * 8, i => { const q = AJ[floor(i / 8)], a = rnd(i, 71) * TAU, sp = 2 + 5 * rnd(i, 72); return { p: [m.x + q[0], 0.1, m.z + q[1]], v: [cos(a) * sp, 3 + 6 * rnd(i, 73), sin(a) * sp], b: q[2] + rnd(i, 74) * 0.05, l: 0.7 + rnd(i, 75) * 0.8, z: 0.3 + rnd(i, 76) * 0.5 }; },
        { t0: -1e5, g: 14, drag: 0.4, add: 1, px: 40, c: ['#ffffff', '#ffe9a8', '#e0a030'], fade: 0.5, a: 1, near: 2, floor: 0 })); },
    state(S, t, o, st) { CS = S; const U = K.U(), us = S.us, lu = S.lines.material.uniforms, { p2, fT, pk } = st, ty = S.ty || 0, pT = S.tyT == null ? 99 : S.tyT, k = eo(c01(pT / 1.1)), ty0 = S.ty0 || 0;
      if (S.cp) { S.dome.position.set(S.cp[0], S.cp[1], S.cp[2]); S.dome.updateMatrixWorld(true); }
      U.uKey.value.set(-0.4, 0.7, 0.6).normalize(); U.uKeyC.value.setRGB(1.0, 0.97, 0.9); U.uShC.value.setRGB(0.42, 0.4, 0.62); U.uRimK.value = 0.85; U.uGlow.value = 0.3; U.uFog.value.set(160, 1100, 0.9); U.uFogC.value.setRGB(0.012, 0.014, 0.04);
      /* Platens farge: fra den forrige til den nye mens ringen går utover (1,1 s). Normal er hallens egne farger. */
      const acc = (q) => q ? tyC(q) : '#8fe9ff', c2 = mixHex(acc(ty0), acc(ty), k), tk = mix(ty0 ? 0.55 : 0, ty ? 0.55 : 0, k) * (1 + 0.3 * pk);
      lu.uC2.value.setRGB(c2[0], c2[1], c2[2]); us.uSkyT.value.setRGB(c2[0], c2[1], c2[2]); us.uSkyTk.value = tk; S.pil.material.uniforms.uTc.value.setRGB(c2[0], c2[1], c2[2]); S.pilM.material.uniforms.uTc.value.setRGB(c2[0], c2[1], c2[2]);
      for (let i = 0; i < 18; i++) lu.uMk.value[i] = i === ty ? 0.85 + 0.2 * sin(t * 1.6) + 0.6 * (1 - k) : i === ty0 && k < 1 ? 0.8 * (1 - k) : 0.1 + 0.08 * p2;
      { const T18 = TAU / 18, a0 = ty0 * T18, a1 = ty * T18, d = ((a1 - a0 + PI) % TAU + TAU) % TAU - PI; lu.uMr.value = a0 + d * io(c01(pT / 1.4)); }   /* ringen av typemerker dreies, så merket hans ligger foran ham (mot oss) */
      lu.uTp.value.set(c2[0], c2[1], c2[2], ty ? 0.22 + 0.1 * pk : 0.06);
      lu.uFr.value[0].set(pT < 2.4 ? 4 + 120 * eo(c01(pT / 2.2)) : 0, pT < 2.4 ? 1.3 * (1 - c01(pT / 2.4)) : 0, 1.4, 0); lu.uLit.value = 0.3 + 0.1 * sin(t * 0.7) + 0.3 * p2; lu.uA.value = 0.8 + 0.2 * p2;
      us.uEgg.value.set(0, 7.5, 2, 0.85); us.uSky.value.set(1, 2, 1 + 0.35 * pk, 1); us.uHv.value = 1.7 * pk; us.uGw.value.set(0, 0, 14);
      S.pl.forEach((m, i) => { m.visible = pk > 0.02; if (!m.visible) return; const a = (i + 0.5) / NP * TAU + t * 0.07, sc = 2.6 * pk * (i + 1 === ty ? 1.5 : 1); m.position.set(cos(a) * 30, 15 + 2.2 * sin(a * 2 + t * 0.3), sin(a) * 30); m.rotation.set(0.1 * sin(t * 0.5 + i), -a + PI / 2, 0); m.scale.setScalar(sc); m.material.uniforms.uGo.value = i + 1 === ty ? 0.45 + 0.25 * sin(t * 2) : 0; }); S.pil.material.uniforms.uLit.value = S.pilM.material.uniforms.uLit.value = lu.uLit.value; S.motes.material.uniforms.uA.value = 0.5 + 0.3 * p2;
      /* Stedet slår til: søyler av lys faller rundt din Pokémon. Og treffene sender ringer over glasset. */
      const fa = fT < 98 ? fT : -1e5; S.jt.value = fa; S.lan.visible = S.imp.visible = S.spark.visible = fa > 0 && fa < 3.4; S.spark.material.uniforms.uT0.value = t - fa;
      const h = o.hit; lu.uWv.value[0].set(h ? h[0] : 0, h ? h[1] : 0, h ? t - h[2] : -99, h && h[2] >= 0 && h[2] < 3 ? 1 : 0); lu.uWv.value[1].set(S.mp ? S.mp[0] : 0, S.mp ? S.mp[1] : 0, t - fa + 0.62, fa > 0.62 ? 1.4 : 0);
      S.fa = fa; mirSync(S); },
    scene(As, S3, sn, q) { const P = q.P, t = As.t, p2 = As.p2, V = As.val || {};
      /* Platen fra kampen (kampskjermen sier fra med arenaens mark('plate', typen)): typen nå, den forrige, og hvor lenge siden byttet. */
      { const ty = V.plate || 0; if (ty !== (S3.ty || 0)) { S3.ty0 = S3.ty || 0; S3.ty = ty; } S3.tyT = As.since('plate'); }
      const c2 = S3.ty ? tyC(S3.ty) : '#9fe6ff', fa = S3.fa == null ? -1 : S3.fa, jf = fa > 0.5 && fa < 1.6 ? hit(fa, 0.62, 0.5) : 0;
      /* Lyset på figurene: hallens kjølige, lyse lys forfra og ovenfra, platens farge nedenfra fra linjene i glasset, og gull i kanten fra glorien. Din egen får kantlys. */
      C.lightSet({ amb: C.blend('#dedbee', '#ffffff', 0.5 * jf), sat: 0.98, lift: '#221c40', lights: [{ col: '#fff6e2', a: 0.16 + 0.4 * jf, h: 0.6, top: 1 }, { col: c2, a: 0.2 + 0.1 * p2, h: 0.42 }], rim: [{ col: '#ffe2a0', dx: 1, dy: 1, a: 0.4 }],
        me: { amb: C.blend('#cfcbe4', '#ffffff', 0.6 * jf), lights: [{ col: c2, a: 0.16, h: 0.4 }, { col: '#fff6e2', a: 0.5 * jf, h: 0.7, top: 1 }], rim: [{ col: '#ffe9b8', dx: -1, dy: 1, a: 0.45 + 0.4 * jf }] } });
      /* Speilbildene i glasset, og en myk kontakt under føttene. */
      if (C.cur.sp) C.monRefl(As.foe[0], As.foe[1] + 1, 1.6 * As.fk, { box: 1, ft: As.ft, a: 0.3, len: 0.78, hq: 1 }); C.contact(As.foe[0], As.foe[1] + 2, 62 * As.fk, { a: 0.4, col: '#120f2c', sy: 0.13 });
      if (C.cur.sps.me) C.monRefl(As.me[0], As.me[1] - 2, 1.6 * As.mk, { id: 'me', ft: As.ftm, a: 0.24, len: 0.45, hq: 1 }); C.contact(As.me[0], As.me[1] - 3, 64 * As.mk, { a: 0.55, col: '#120f2c', sy: 0.2 });
      P.bloom = 0.3 + 0.2 * jf; P.bloomT = 0.76; P.vig = 0.36 + 0.08 * p2; P.vigc = '#04030c'; P.grain = 0.03; if (jf > 0) { P.sh = (P.sh || 0) + 2.2 * jf; P.fl = max(P.fl || 0, 0.22 * hit(fa, 0.62, 0.1)); P.fc = '#fff2c8'; } },
  });
})();
