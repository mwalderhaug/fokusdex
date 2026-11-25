'use strict';
/* Fokusdex – Arceus (493) i 3D (steg 3.1, Fable 24.11): «EGGET». Bygget fra skisse B (Jazz 21.11: «et godt utgangspunkt»): rekkefølgen og tidene i låtene er låst,
   og stilen, kameraet, lyset og materialene er nye.
   Filmens tid t: 0 = varselet (Azure Flute fra 0:00, teksten oppå). Hall of Origin fra 19,0. Kamplåta fra 49,3, etter en bro uten toneart.
     0–15,0   KAOSET i de 18 typefargene blafrer på hver tone i fløyta og virvler; 15,0–20,8 trekkes alt sammen til ett punkt
     20,5     EGGET av lys, med fem ringer. Ett løft i Hall of Origin = én ring = én ting i verden:
              26,08 glassgulvet · 31,19 lyslinjene · 36,30 søylene · 41,41 stjernene · 46,52 de 17 platene
     49,24    suget, og på smellet 49,67 blir egget til lys: han står i gull (avsløringsverbet); platene slår inn i hjulet, som smeller 52,87 og 55,67, og lunta går
     58,87 →  gullet sprenges av nedenfra, én del per takt: beina, kroppen, halsen, hodet (63,67). 64,5–65,2 pusten
     65,27    DROPPET: Judgment (kula til himmels, regn av lys over hallen) og brølet; navnet 66,67
   STEDET er Hall of Origin slik han skaper den: et glassgulv som speiler kosmos (alt over gulvet speiles: søylene, egget, ham selv), lyslinjene i gulvet med de 18
   typemerkene i ring, søyler av marmor og gull som stiger opp gjennom glasset, og kosmos rundt. Hallen han skaper, er arenaen (X.arena nederst).
   1 enhet = 1 m. Han står i origo og ser mot +z (dit kameraet og din Pokémon står), og er rundt 9 m til toppen.
   STORT SPRANG (Fable 25.11) og «Bevegelse etter Fable» (Opus 25.11), sluppet i v94: den gamle slutten (egget som åpnet seg 49,55), de gamle søylene (som steg mykt)
   og bevegelsen før lå bak bryteren G3D.alt[493] til Jazz valgte; de er slettet (git show 5d1bb4f:c3/493.js). */
(() => {
  const K = G3D.K, C = CINE.kit, X = G3C, { sin, cos, PI, TAU, abs, max, min, floor, c01, mix, seg, io, eo, ei, back, hit, rnd, hex } = K, kf = C.kf, hyp = Math.hypot;
  /* ---------- Tidene (filmens tid) ---------- */
  const H0 = 19.0, HBASS = H0 + 4.0, LIFT = [7.08, 12.19, 17.30, 22.41, 27.52].map(x => H0 + x), HFADE = H0 + 29.0, HEND = H0 + 29.8;   /* Hall of Origin: løftene hvert 5,11 s */
  const K0 = 49.3, HIT = [0.25, 3.17, 6.37, 9.57, 11.17, 12.77, 14.37].map(x => K0 + x), BRE = K0 + 15.2, DROP = K0 + 15.97, NAME = DROP + 1.4, LEN = NAME + 3.2;   /* kamplåtas åpning */
  const FLN = [0.08, 0.43, 1.36, 2.15, 5.85, 7.40, 7.97, 9.05, 9.70, 10.65, 11.30, 11.97, 14.02];   /* fløytas 13 toner (målt i skissen) */
  /* STORT SPRANG (Fable 25.11, Jazz 24.11 kveld: «mer action og mer WOW faktor og eksplosjon» når han kommer ut av egget, og søylene «mer intens»).
     Kamplåtas tre første slag er hvert et SUG og et SMELL (målt i lydfila 25.11): suget 0,00–0,43, 3,21–3,63 og 6,01–6,42 i låta, smellene på 0,43, 3,63 og 6,43.
     SW og BOOM er filmens tider med samme forskyvning som de andre slagene (bildet to bilder før lyden). 49,55 (HIT[0]) lå midt i det første suget, 0,2 s før smellet,
     og 52,47 (HIT[1]) er starten på det andre suget: den nye slutten legger eksplosjonen PÅ smellet 49,67 og lar platene slå inn under sugene og hjulet smelle på 52,87 og 55,67.
     (Den gamle slutten la egget åpne seg 49,55; den er slettet i v94.) */
  const SW = [K0 - 0.06, K0 + 3.17, K0 + 5.95], BOOM = [K0 + 0.37, K0 + 3.57, K0 + 6.37], BANG = BOOM[0]; const L2 = LIFT[2], L3 = LIFT[3], L4 = LIFT[4];
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
  const PIL_V = `attribute vec4 aI; varying vec3 vW, vN; varying float vG, vK, vA, vS; uniform float uTime, uHv; uniform vec3 uGw;
void main(){ vec4 c0 = instanceMatrix * vec4(0., 0., 0., 1.), I = aI; float dd = min(length(c0.xz), 72.), k = uGw.x > .5 ? clamp((uGw.y - dd) / uGw.z, 0., 1.) : clamp((uTime - I.x) / I.y, 0., 1.), q = k - 1., e = 1. + 2.2 * q * q * q + 1.2 * q * q; vK = k; vS = uGw.x > .5 ? 99. : uTime - I.x - I.y;
  float y = position.y, H = aI.z, Y = y < 1.6 ? y : y < 2.6 ? mix(1.6, H - 1.95, y - 1.6) : H - 1.95 + (y - 2.6);
  vG = max(step(.45, y) * step(y, 1.15), step(2.9, y)); vA = atan(position.z, position.x);
  vec4 w = modelMatrix * instanceMatrix * vec4(position.x, Y - H * (1. - e) + uHv * (.55 + .45 * sin(uTime * .5 + aI.w * 6.283)), position.z, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const PIL_F = `varying vec3 vW, vN; varying float vG, vK, vA, vS; uniform float uMir, uLit, uRef; uniform vec3 uTc, uHot, uBl; uniform vec4 uEgg;
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
  float hot = 1. - smoothstep(0., 1., vK); c += vec3(1., .9, .6) * hot * (.3 + .6 * vG) * uHot.x; c = mix(c, vec3(1.3, 1.12, .78), hot * hot * uHot.y);   /* uHot = (gløden mens den stiger, hvitglødende, glimtet når den stanser) */
  c += vec3(1., .86, .5) * uHot.z * (.25 + .75 * vG) * exp(-max(vS, 0.) * 3.2) * step(0., vS) * step(vS, 3.);
  c += vec3(1., .93, .74) * uBl.y * exp(-abs(length(W.xz) - uBl.x) / max(uBl.z, .01)) * (.6 + .4 * wrap);   /* uBl = (trykkfrontens radius, styrke, bredde): søylene blinker når den går forbi */
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
uniform float uJw;
void main(){ float age = uTime - aJ.z + ${(JY / JV).toFixed(4)}, hitA = uTime - aJ.z, y0 = max(${JY.toFixed(1)} - age * ${JV.toFixed(1)}, 0.);
  float w = mix(.7, 1.9, clamp(hitA * 5., 0., 1.)) * (1. - .6 * smoothstep(.08, .6, hitA)) * (1. + uJw); vF = step(0., age) * (1. - smoothstep(0., .6, hitA));   /* uJw: stort sprang, bredere søyler av lys (0 = som før) */
  vec3 base = vec3(aJ.x, 0., aJ.y), toC = cameraPosition - (modelMatrix * vec4(base, 1.)).xyz, rt = normalize(vec3(toC.z, 0., -toC.x)); float y = mix(y0, ${(JY + 40).toFixed(1)}, position.y);
  vQ = vec2(position.x * 2., position.y); vH = y - y0; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(base + rt * position.x * w + vec3(0., y, 0.), 1.); }`;
  const LAN_F = `varying vec2 vQ; varying float vF, vH; void main(){ if (vF < .01) discard; float x = 1. - abs(vQ.x), hd = exp(-vH * .1);
  gl_FragColor = vec4((vec3(1., .97, .88) * pow(x, 6.) * (1. + 2.2 * hd) + vec3(1., .78, .4) * x * x * (.22 + .5 * hd)) * vF, 0.); }`;
  const IMP_V = `attribute vec3 aJ; varying float vF; varying vec2 vQ; uniform float uTime;
uniform float uJw;
void main(){ float age = uTime - aJ.z, r = 5. * (1. - exp(-age * 3.6)) * (1. + .7 * uJw); vF = step(0., age) * (1. - smoothstep(.1, 1.1, age)); vQ = position.xz;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aJ.x + position.x * r, .04, aJ.y + position.z * r, 1.); }`;
  const IMP_F = `varying float vF; varying vec2 vQ; void main(){ if (vF < .01) discard; float l = length(vQ), k = (1. - smoothstep(0., .14, abs(l - .85))) + exp(-l * l * 9.) * 1.5 * vF;
  gl_FragColor = vec4(vec3(1., .88, .55) * k * vF * 1.8, 0.); }`;
  /* SØYLENE SKYTER OPP (stort sprang): en stripe av lys går foran kapitélet til himmels og blekner mens søylen fyller den (aJ: x, z, når, høyden; aD: hvor lenge den stiger).
     Stripa vender alltid mot kameraet; søylen selv dekker midten av den, så det som synes, er lyset rundt skaftet og over kapitélet. */
  const PJ_V = `attribute vec4 aJ; attribute float aD; varying vec2 vQ; varying float vF; uniform float uTime;
void main(){ float age = uTime - aJ.z, k = clamp(age / aD, 0., 1.), q = k - 1., e = 1. + 2.2 * q * q * q + 1.2 * q * q, top = aJ.w * e + mix(38., 2., k);
  vF = step(0., age) * pow(1. - k, 1.3);
  vec3 base = vec3(aJ.x, 0., aJ.y), toC = cameraPosition - (modelMatrix * vec4(base, 1.)).xyz, rt = normalize(vec3(toC.z, 0., -toC.x)); float w = mix(4.4, 2.6, position.y);
  vF *= .35 + .65 * smoothstep(10., 46., length(toC.xz));   /* dempet nær kameraet: ellers en hvit flate rett foran linsa */
  vQ = vec2(position.x * 2., position.y); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(base + rt * position.x * w + vec3(0., top * position.y, 0.), 1.); }`;
  const PJ_F = `varying vec2 vQ; varying float vF; void main(){ if (vF < .01) discard; float x = 1. - abs(vQ.x), y = vQ.y;
  gl_FragColor = vec4((vec3(1., .97, .88) * pow(x, 5.) * 1.3 + vec3(1., .8, .42) * x * x * .42) * (1. - y * y * .6) * smoothstep(0., .03, y) * vF, 0.); }`;
  /* DET SOM SLYNGES UT OG BLIR HENGENDE (stort sprang): lyspunkter som kastes fra et sted til et annet på et øyeblikk (aD: hvor langt og hvor; uLam: hvor fort farten dør),
     og så henger i lufta, glitrer og synker sakte (uSink) til de slukner. Partiklene i motoren (K.pts) bremser jevnt og egner seg ikke til et smell.
     aB = (når, levetid, størrelse, frø). uTw = hvor mye de blinker. */
  const BV_V = `attribute vec3 aD; attribute vec4 aB; varying float vK, vA; uniform float uTime, uT0, uLam, uSink, uPx, uPs, uA, uNear, uTw;
void main(){ float tau = uTime - uT0 - aB.x, k = tau / aB.y; vK = k; float e = 1. - exp(-max(tau, 0.) * uLam * (.6 + .8 * aB.w));
  vec3 p = position + aD * e; p.y -= uSink * max(tau - .4, 0.) * (.4 + aB.w); p.x += sin(tau * .9 + aB.w * 40.) * .35 * e; p.z += cos(tau * .7 + aB.w * 23.) * .35 * e; p.y = max(p.y, .06);
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; float d = -mv.z;
  gl_PointSize = max(aB.z * uPx / max(d, .1), 1.5) * uPs;
  vA = uA * smoothstep(0., .03, tau) * (1. - smoothstep(.55, 1., k)) * smoothstep(uNear, uNear * 1.8, d) * mix(1., .55 + .45 * sin(uTime * (3. + 6. * aB.w) + aB.w * 50.), uTw);
  if (k < 0. || k > 1.) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; } }`;
  const BV_F = `varying float vK, vA; uniform vec3 uC0, uC1, uC2; void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r2 = dot(q, q); if (r2 > 1.) discard; float a = (1. - r2) * (1. - r2) * vA;
  gl_FragColor = vec4(mix(mix(uC0, uC1, smoothstep(0., .25, vK)), uC2, smoothstep(.4, 1., vK)) * a, 0.); }`;
  /* TRYKKBØLGEN (stort sprang): et skall av lys som brer seg ut fra egget på smellet, lysest i kanten (en boble, ikke en ball), og sterkest nede ved gulvet. */
  const SHL_F = `varying vec3 vW, vN; uniform float uA; void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float f = 1. - abs(dot(N, V));
  gl_FragColor = vec4(vec3(1., .9, .66) * (pow(f, 4.) * 1.1 + pow(f, 14.) * 2.2) * (.3 + .7 * exp(-abs(vW.y) * .07)) * (vW.y < 0. ? .4 : 1.) * uA, 0.); }`;
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
  /* Stort sprang: ringen jager utover gulvet i VP m/s fra 0,30 s etter løftet, og hver søyle SKYTER opp idet den går forbi (PT2: [når, hvor lenge]). Tiden den bruker,
     følger målestokken (√høyden: 22 m på 1,4 s, 36 m på 1,8 s). Den indre ringen (34 m) skyter opp samlet, så parene i gangen ett og ett utover, og den ytre ringen samlet. */
  const VP = 32, PT2 = PIL.map(q => [LIFT[2] + 0.30 + hyp(q[0], q[1]) / VP, 0.3 * Math.sqrt(q[2])]);
  const pillarGeo = T => new T.LatheGeometry([[0.001, 0], [2.1, 0], [2.1, 0.45], [1.78, 0.6], [1.9, 0.8], [1.78, 1.0], [1.5, 1.15], [1.42, 1.6], [1.2, 2.6], [1.3, 2.9], [1.3, 3.08], [1.5, 3.3], [1.74, 3.7], [1.84, 4.05], [1.98, 4.15], [1.98, 4.55], [0.001, 4.55]].map(q => new T.Vector2(q[0], q[1])), 28);
  const place = (K, T, S, o) => { o = o || {}; const add = (m, ro) => { m.frustumCulled = false; if (ro != null) m.renderOrder = ro; S.scene.add(m); return m; }, pal = TY.map(c => K.u3(c));
    S.T = T; S.mirs = []; S.pal = pal; S.ax = { x: new T.Vector3(1, 0, 0), y: new T.Vector3(0, 1, 0), z: new T.Vector3(0, 0, 1) };
    const us = S.us = { uJw: K.uv(0), uSky: K.uv(new T.Vector4(0, 0, 1, 0)), uJd: K.uv(new T.Vector4(0, 0, 0, 0)), uSkyT: K.uv(K.u3('#ffffff')), uSkyTk: K.uv(0), uEgg: K.uv(new T.Vector4(EC[0], EC[1], EC[2], 0)), uHv: K.uv(0), uGw: K.uv(new T.Vector3(0, 0, 14)),  uHot: K.uv(new T.Vector3(1, 0, 0)), uBl: K.uv(new T.Vector3(0, 0, 1)) };
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
        const m = new T.InstancedMesh(ig, K.shader(PIL_V, PIL_F, Object.assign({ uMir: K.uv(mir ? -1 : 1), uLit: K.uv(0), uRef: K.uv(mir ? 0.5 : 1), uTc: K.uv(K.u3('#9fe6ff')), uHv: S.us.uHv, uGw: S.us.uGw, uHot: S.us.uHot, uBl: S.us.uBl }, { uEgg: us.uEgg }), { side: T.DoubleSide }), n), ob = new T.Object3D();
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
    S.shock = add(new T.Mesh(eg, K.shader(EGG_V, SHL_F, { uA: K.uv(0) }, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 5); S.shock.position.set(...EC); S.shock.visible = false;
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
    S.dust = [0, 1, 2, 3].map(k => add(K.pts(200, i => { const q = spot(k, i + 400); return { p: [q[0], q[1], q[2]], v: [cos(q[3]) * 0.7, 0.4 + rnd(i, k * 7 + 44) * 1.1, sin(q[3]) * 0.7], b: rnd(i, k * 7 + 45) * 0.6, l: 1.8 + rnd(i, k * 7 + 46) * 1.8, z: 0.3 + rnd(i, k * 7 + 47) * 0.5 }; },
      { t0: HIT[3 + k] - 0.03, g: 2.0, drag: 0.6, add: 1, px: 30, sway: 0.2, c: ['#fff6d8', '#ffd66a', '#d8a030'], fade: 0.55, a: 0.9, near: 2 })));
    /* SØYLENE SKYTER OPP (stort sprang): lyssprut fra glasset rundt foten (stiger med kapitélet og regner ned igjen langs skaftet), stripa av lys foran kapitélet,
       en ring i glasset ved foten, og lysdryss fra kapitélet når søylen stanser. Og ringen selv, som en bølge av lys over gulvet (S.wr[0]). */
    { const n = PIL.length, G = 30, D = 8;
      S.gey = mir(S, add(K.pts(n * G, i => { const j = floor(i / G), q = PIL[j], a = rnd(i, 201) * TAU, rr = 2.0 + 0.9 * rnd(i, 202), sp = 1.5 + 5 * rnd(i, 203), up = (9 + 25 * rnd(i, 204) * rnd(i, 205)) * Math.sqrt(q[2] / 26);
          return { p: [q[0] + cos(a) * rr, 0.05, q[1] + sin(a) * rr], v: [cos(a) * sp, up, sin(a) * sp], b: PT2[j][0] + 0.02 + 0.16 * rnd(i, 206), l: 1.3 + 1.5 * rnd(i, 207), z: 0.3 + 0.7 * rnd(i, 208) }; },
        { t0: 0, g: 15, drag: 0.25, add: 1, px: 66, c: ['#ffffff', '#ffe9a8', '#e0a030'], fade: 0.45, a: 1, near: 2, floor: 0 }), 6));
      S.pdust = add(K.pts(n * D, i => { const j = floor(i / D), q = PIL[j], a = rnd(i, 211) * TAU, sp = 0.4 + 1.3 * rnd(i, 212);
          return { p: [q[0] + cos(a) * 1.9, q[2] - 0.4 * rnd(i, 213), q[1] + sin(a) * 1.9], v: [cos(a) * sp, 0.6 * (rnd(i, 214) - 0.3), sin(a) * sp], b: PT2[j][0] + PT2[j][1] * (0.62 + 0.3 * rnd(i, 215)), l: 1.9 + 1.4 * rnd(i, 216), z: 0.25 + 0.5 * rnd(i, 217) }; },
        { t0: 0, g: 5, drag: 0.5, add: 1, px: 30, sway: 0.25, c: ['#fff6d8', '#ffd66a', '#c88a2a'], fade: 0.4, a: 0.9, near: 2, floor: 0 }), 6);
      const pl = new T.PlaneGeometry(1, 1); pl.translate(0, 0.5, 0); const ig = new T.InstancedBufferGeometry().copy(pl); ig.instanceCount = n; const aJ = new Float32Array(n * 4), aD = new Float32Array(n), aB = new Float32Array(n * 3);
      PIL.forEach((q, i) => { aJ.set([q[0], q[1], PT2[i][0], q[2]], i * 4); aD[i] = PT2[i][1]; aB.set([q[0], q[1], PT2[i][0]], i * 3); }); ig.setAttribute('aJ', new T.InstancedBufferAttribute(aJ, 4)); ig.setAttribute('aD', new T.InstancedBufferAttribute(aD, 1));
      S.pjet = mir(S, add(new T.Mesh(ig, K.shader(PJ_V, PJ_F, {}, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 5));
      const pr = new T.PlaneGeometry(2, 2); pr.rotateX(-PI / 2); const rg = new T.InstancedBufferGeometry().copy(pr); rg.instanceCount = n; rg.setAttribute('aJ', new T.InstancedBufferAttribute(aB, 3));
      S.pimp = add(new T.Mesh(rg, K.shader(IMP_V.replace('5. * (1. - exp(-age * 3.6))', '11. * (1. - exp(-age * 3.))'), `varying float vF; varying vec2 vQ; void main(){ if (vF < .01) discard; float l = length(vQ), k = 1. - smoothstep(0., .07, abs(l - .88));
  gl_FragColor = vec4(vec3(1., .88, .55) * k * vF * vF * .8, 0.); }`, {}, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 6); }   /* bare en tynn ring: en fylt glød ble en hvit flate sett fra det lave kameraet */
    /* DEN NYE SLUTTEN (stort sprang). burst(n, init, o): lyspunkter som slynges ut og blir hengende (BV); init(i) gir { p, d, b, l, z }. */
    const burst = (n, init, o) => { const P = new Float32Array(n * 3), Dd = new Float32Array(n * 3), B = new Float32Array(n * 4), geo = new T.BufferGeometry(), c = o.c;
      for (let i = 0; i < n; i++) { const q = init(i); P.set(q.p, i * 3); Dd.set(q.d, i * 3); B.set([q.b || 0, q.l || 4, q.z || 1, rnd(i, 97)], i * 4); }
      geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('aD', new T.BufferAttribute(Dd, 3)); geo.setAttribute('aB', new T.BufferAttribute(B, 4));
      const m = new T.Points(geo, K.shader(BV_V, BV_F, { uT0: K.uv(o.t0), uLam: K.uv(o.lam || 3.4), uSink: K.uv(o.sink || 0), uPx: K.uv(o.px || 60), uA: K.uv(o.a == null ? 1 : o.a), uNear: K.uv(o.near || 2), uTw: K.uv(o.tw == null ? 1 : o.tw), uC0: K.uv(K.u3(c[0])), uC1: K.uv(K.u3(c[1])), uC2: K.uv(K.u3(c[2])) }, Object.assign(K.blend.add(), { depthTest: o.depth !== false })));
      m.frustumCulled = false; return m; };
    const sph = (i, sd) => { const u = rnd(i, sd) * 2 - 1, a = rnd(i, sd + 1) * TAU, q = Math.sqrt(1 - u * u); return [cos(a) * q, u, sin(a) * q]; };
    /* Suget: lys fra hele hallen trekkes inn i egget, fortere og fortere, og er framme på smellet. */
    S.inhp = add(K.pts(260, i => { const d = sph(i, 301), R = 14 + 34 * rnd(i, 303), p = [EC[0] + d[0] * R, max(0.4, EC[1] + d[1] * R * 0.7), EC[2] + d[2] * R], du = 0.26 + 0.16 * rnd(i, 304);
        return { p, v: [(EC[0] - p[0]) / (1.45 * du), (EC[1] - p[1]) / (1.45 * du), (EC[2] - p[2]) / (1.45 * du)], b: BANG - du - 0.04 * rnd(i, 305), l: du, z: 0.5 + 0.9 * rnd(i, 306) }; },
      { t0: 0, drag: -0.9, add: 1, px: 50, sz0: 1, sz1: 0.35, c: ['#ffd98a', '#fff1c8', '#ffffff'], fade: 0.9, a: 0.9, near: 2 }), 5);
    /* Smellet: en stjerne av lysstråler ut fra midten (kort), og skallet som blir til glitter: slynges ut i hele hallen og blir hengende i lufta. */
    S.star = mir(S, add(K.beams(46, i => { const d = sph(i, 311); return { p: EC, d: [d[0], d[1] * 0.8 + 0.12, d[2]], l: 24 + 70 * rnd(i, 313) * rnd(i, 314), w: 0.22, w1: 2.2 + 2.6 * rnd(i, 315), b: 0.04 * rnd(i, 316) }; }, { t0: BANG, rise: 0.07, a: 0, core: 0.85, c: '#ffe2a0' }), 5));
    S.shell = mir(S, add(burst(1500, i => { const d = sph(i, 321), far = rnd(i, 323), R = 5 + 50 * far * far + (i % 7 === 0 ? 30 * rnd(i, 324) : 0);
        return { p: [EC[0] + d[0] * 2.4, EC[1] + d[1] * 3.2, EC[2] + d[2] * 2.4], d: [d[0] * R, (d[1] * 0.75 + 0.2) * R, d[2] * R + (i % 5 === 0 ? 18 * rnd(i, 327) : 0)], b: 0.03 * rnd(i, 325), l: 4.2 + 5 * rnd(i, 326), z: 0.35 + 1.1 * rnd(i, 328) * rnd(i, 329) }; },
      { t0: BANG, lam: 3.6, sink: 0.55, px: 150, c: ['#ffffff', '#ffe9a8', '#c88a2a'], near: 2.2 }), 6));
    /* Platene slår inn i hjulet: gnister fra der hver treffer, og et glimt i platens farge. */
    S.spk = add(K.pts(NP * 14, i => { const j = floor(i / 14), ga = j * 2.4, sp = 3 + 6 * rnd(i, 331); return { p: [WHEEL[0] + cos(ga) * 2.2, WHEEL[1] + sin(ga) * 2.2, WHEEL[2] + 0.2], v: [cos(ga) * sp + (rnd(i, 332) - 0.5) * 4, sin(ga) * sp + 1.5 + (rnd(i, 333) - 0.5) * 4, 1 + 4 * rnd(i, 334)], b: TA(j) + 0.02 * rnd(i, 335), l: 0.45 + 0.6 * rnd(i, 336), z: 0.3 + 0.5 * rnd(i, 337) }; },
      { t0: 0, g: 9, drag: 0.5, add: 1, px: 36, c: ['#ffffff', '#ffe9a8', '#e0a030'], fade: 0.4, a: 1, near: 2 }), 6);
    S.pglow = add(K.pts(2, i => ({ p: [0, 0, 0], v: [0, 0, 0], b: 0, l: 1e9, z: [2.6, 1][i] }), { add: 1, px: 150, c: ['#ffffff', '#ffffff', '#ffffff'], fade: 0.99, a: 0 }), 6);
    /* Gullet SPRENGES av: bladgull som slynges ut til alle kanter (fire slag: beina, kroppen, halsen, hodet; flere og fortere for hvert), og en sky av gullstøv som blir hengende. */
    S.flakeN = [0, 1, 2, 3].map(k => { const m = K.shards(120 + 24 * k, i => { const q = spot(k, i), sp = 2.4 + (5 + 1.2 * k) * rnd(i, k * 9 + 104), up = 1 + (4.5 + k) * rnd(i, k * 9 + 105);
        return { p: [q[0], q[1], q[2]], v: [cos(q[3]) * sp, up, sin(q[3]) * sp + 1.2 * rnd(i, k * 9 + 112)], r: [(rnd(i, k * 9 + 106) - 0.5) * 16, (rnd(i, k * 9 + 107) - 0.5) * 16, (rnd(i, k * 9 + 108) - 0.5) * 16], s: rnd(i, k * 9 + 109), b: rnd(i, k * 9 + 110) * 0.07, l: 3.2, z: 0.05 + 0.1 * rnd(i, k * 9 + 111) * rnd(i, k * 9 + 113) }; },
        { c: '#f2c14a', grey: 0, em: 0.55, sy: 0.22, seed: 31 + k }); S.scene.add(m); return m; });
    S.puff = [0, 1, 2, 3].map(k => add(burst(170 + 30 * k, i => { const q = spot(k, i + 900), R = 1.5 + (4 + k) * rnd(i, k * 5 + 341); return { p: [q[0], q[1], q[2]], d: [cos(q[3]) * R, 0.4 + 1.6 * rnd(i, k * 5 + 342), sin(q[3]) * R], b: 0.03 * rnd(i, k * 5 + 343), l: 1.6 + 2.2 * rnd(i, k * 5 + 344), z: 0.25 + 0.6 * rnd(i, k * 5 + 345) }; },
      { t0: HIT[3 + k], lam: 4.2, sink: 0.7, px: 130, c: ['#ffffff', '#ffd66a', '#c88a2a'], near: 1.6, a: 0.9 }), 6));
    /* Bølgene av lys (stort sprang): ringer med radius 1 som skaleres opp (ring 3 over gulvet, og eksplosjonens ringer). */
    S.wr = [0, 1, 2, 3, 4].map(() => { const g = new T.Group(); g.add(torus(T, 1, 0.0035, GOLDW, 1.6)); g.add(torus(T, 1, 0.016, GOLD, 0.2)); g.add(torus(T, 1, 0.05, '#c88a2a', 0.04)); g.visible = false; return mir(S, add(g, 4)); });
    /* Judgment. */
    { const cyl = new T.PlaneGeometry(1, 1); cyl.translate(0, 0.5, 0); const ig = new T.InstancedBufferGeometry().copy(cyl); ig.instanceCount = NJ; const aJ = new Float32Array(NJ * 3); JT.forEach((q, i) => aJ.set(q, i * 3)); ig.setAttribute('aJ', new T.InstancedBufferAttribute(aJ, 3));
      S.lan = mir(S, add(new T.Mesh(ig, K.shader(LAN_V, LAN_F, { uJw: S.us.uJw }, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 6));
      const pl = new T.PlaneGeometry(2, 2); pl.rotateX(-PI / 2); const rg = new T.InstancedBufferGeometry().copy(pl); rg.instanceCount = NJ; rg.setAttribute('aJ', new T.InstancedBufferAttribute(aJ.slice(), 3));
      S.imp = add(new T.Mesh(rg, K.shader(IMP_V, IMP_F, { uJw: S.us.uJw }, Object.assign(K.blend.add(), { side: T.DoubleSide }))), 6);
      S.spark = add(K.pts(NJ * 5, i => { const q = JT[floor(i / 5)], a = rnd(i, 71) * TAU, sp = 2 + 6 * rnd(i, 72); return { p: [q[0], 0.1, q[1]], v: [cos(a) * sp, 3 + 7 * rnd(i, 73), sin(a) * sp], b: q[2] - DROP + rnd(i, 74) * 0.05, l: 0.7 + rnd(i, 75) * 0.9, z: 0.3 + rnd(i, 76) * 0.5 }; },
        { t0: DROP, g: 14, drag: 0.4, add: 1, px: 40, c: ['#ffffff', '#ffe9a8', '#e0a030'], fade: 0.5, a: 1, near: 2, floor: 0 })); }
    return S; };

  /* ---------- BEVEGELSEN (Opus 25.11, «Bevegelse etter Fable»; reglene: work/RAIDS3D.md, «Bevegelse»; posene: work/raids3d/arceus/bevegelse/poser.jpg) ----------
     Posene er nøkler (målene under), og motoren lager bevegelsen mellom dem: målene glir mellom posene (io), og fjærene (X.follow) gir tyngden, etterslepet og
     overskuddet. Hodet leder (raskere fjær enn halsen); når halsen reiser seg, leder roten av den (raskere fjær nederst enn øverst); manen og halen henger etter
     (X.chain); og forbeina står i glasset mens brystet beveger seg (IK med to ledd: skulderen flyttes med brystet, og overarmen og underarmen dreies så hoven står).
     Stampen er kinematisk: hoven løftes med et lite overskudd, akselererer ned og stanser i glasset på slaget, og figuren står i tre bilder i nedslaget (X.freeze).
     Kanalene, i figurens akser (målt 25.11 med X.rig: + om X dreier halsen og hodet FRAM og ned, − bakover og opp):
       b   statuen (1: halsen og hodet bakover, blikket mot himmelen; Fables pose, uendret), sluppet for halsen (b) og hodet (bh) hver for seg
       n   halsen (+ fram, − bakover: brystet fram og halsen høy) · h hodet mot halsen (+ nesa ned, − nesa opp) · y blikket (− mot kampens kamera)
       c   brystet om Spine1 (− opp og bakover: vekten på bakbeina, + ned og fram), med pusten oppå · f høyre hov løftet (0–1)
     Bevegelsen før (Fable 25.11) lå bak bryteren 'stiv' til v94: git show 5d1bb4f:c3/493.js. G3D.dbgKey = 1: posene uten fjærene (posearket,
     work/g3d/scripts/poser.js; aldri satt i appen). */
  const W_BOW = [0.04, 0.16, 0.2, 0.2, 0.18, 0.22], W_N = [0.06, 0.2, 0.25, 0.25, 0.24], MANE = ['Feeler1', 'Feeler2', 'Feeler3'], TAIL = ['Tail1', 'Tail2', 'Tail3'];   /* per ledd: Spine1, Neck1–4, (Head) */
  /* Pusten: 0 → 1 (inn, 42 % av perioden) → 0 (ut), myk i begge ender, med perioden P fra t0. */
  const brW = (t, t0, P) => { if (t < t0) return 0; const u = ((t - t0) / P) % 1, a = 0.42; return u < a ? io(u / a) : 1 - io((u - a) / (1 - a)); };
  /* Forbeinet står i glasset (IK med to ledd i planet y–z): L = { s, e, h } (skulder, albue, hov i hvile), P = Spine1 i hvile, th = brystets dreining nå, th0 = dreiningen
     hoven står med (statuen). Gir dreiningene om X i figurens ramme for overarmen (utenom brystets), underarmen og hoven (som står like flatt som i statuen). */
  const ik2 = (L, P, th, th0) => { const rot = (v, a) => { const dy = v.y - P.y, dz = v.z - P.z, c = cos(a), s = sin(a); return [P.y + dy * c - dz * s, P.z + dy * s + dz * c]; };
    const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]), wr = x => Math.atan2(sin(x), cos(x)), S0 = [L.s.y, L.s.z], E0 = [L.e.y, L.e.z], H0 = [L.h.y, L.h.z], Sn = rot(L.s, th), H = rot(L.h, th0);
    const l1 = hyp(E0[0] - S0[0], E0[1] - S0[1]), l2 = hyp(H0[0] - E0[0], H0[1] - E0[1]), d = min(l1 + l2 - 1e-5, hyp(H[0] - Sn[0], H[1] - Sn[1]));
    const g = Math.acos(max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), sg = Math.sign((E0[0] - S0[0]) * (H0[1] - S0[1]) - (E0[1] - S0[1]) * (H0[0] - S0[0])) || 1;
    const al = ang(Sn, H) - sg * g, En = [Sn[0] + l1 * cos(al), Sn[1] + l1 * sin(al)], da = wr(al - ang(S0, E0)), db = wr(ang(En, H) - ang(E0, H0));
    return [da - th, db - da, th0 - db]; };
  /* Stillingen i den nye bevegelsen: A = kanalene akkurat nå (fra mover under). Benene som riggen dreier, skrives etter posene (X.rig). */
  const poseN = (S, f, R, A) => { R.reset(); const ax = S.ax, L = S.leg || (S.leg = [['L', 'R'].map(s => ({ s: S.rg.pos(s + 'Arm'), e: S.rg.pos(s + 'ForeArm'), h: S.rg.pos(s + 'Hand') })), S.rg.pos('Spine1')]);
    const th = -W_BOW[0] * A.bB + W_N[0] * A.nB + A.c;
    R.rot('Spine1', ax.x, th); R.rot('Neck1', ax.x, -W_BOW[1] * A.bB + W_N[1] * A.nB); R.rot('Neck2', ax.x, -W_BOW[2] * A.bB + W_N[2] * A.nB);
    R.rot('Neck3', ax.x, -W_BOW[3] * A.bT + W_N[3] * A.nT); R.rot('Neck4', ax.x, -W_BOW[4] * A.bT + W_N[4] * A.nT); R.rot('Head', ax.x, -W_BOW[5] * A.bH + A.h);
    R.rot('Neck2', ax.y, 0.3 * A.yN); R.rot('Neck4', ax.y, 0.3 * A.yN); R.rot('Head', ax.y, 0.4 * A.yH);
    A.mane.forEach((r, i) => { R.rot(MANE[i], ax.x, r[0]); R.rot(MANE[i], ax.y, r[1]); }); A.tail.forEach((r, i) => { R.rot(TAIL[i], ax.x, r[0]); R.rot(TAIL[i], ax.y, r[1]); });
    L[0].forEach((l, k) => { const q = ik2(l, L[1], th, -W_BOW[0]), s = k ? 'R' : 'L', fl = k ? A.f : 0; R.rot(s + 'Arm', ax.x, q[0] - 0.62 * fl); R.rot(s + 'ForeArm', ax.x, q[1] + 1.15 * fl); R.rot(s + 'Hand', ax.x, q[2] + 0.35 * fl); }); };
  /* Motoren for én film: Q(t) gir målene { b, bh, n, h, y, c } (posen akkurat nå, uten fjærene); o = { t0 (fjærene starter), hits (nedslag: tre frosne bilder),
     hoof(t), tail(t) → [løft, sving] (halens egen pose), jolt(t) (rykket i kroppen i nedslaget, som halen henger etter), mane og tail0 (når de er fri) }. at(t) → kanalene. */
  const mover = (Q, o) => { const t0 = o.t0, ZZ = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const sB = X.follow(t => { const q = Q(t); return [q.b, q.n]; }, { f: 1.0, z: 0.42, t0 }), sT = X.follow(t => { const q = Q(t); return [q.b, q.n]; }, { f: 0.78, z: 0.42, t0 });
    const sH = X.follow(t => { const q = Q(t); return [q.bh, q.h]; }, { f: 1.45, z: 0.48, t0 }), sY = X.follow(t => Q(t).y, { f: 1.35, z: 0.55, t0 }), sYN = X.follow(t => Q(t).y, { f: 0.8, z: 0.6, t0 });
    const sC = X.follow(t => Q(t).c, { f: 0.85, z: 0.5, t0 });
    const pitch = t => { const b = sB(t), u = sT(t), h = sH(t); return -(W_BOW[0] + W_BOW[1] + W_BOW[2]) * b[0] + (W_N[0] + W_N[1] + W_N[2]) * b[1] - (W_BOW[3] + W_BOW[4]) * u[0] + (W_N[3] + W_N[4]) * u[1] - W_BOW[5] * h[0] + h[1] + sC(t); };   /* hodets dreining i rommet: det manen henger etter */
    const mane = X.chain({ bones: MANE, drive: t => [pitch(t), 0.6 * sYN(t) + 0.4 * sY(t), 0], f: 1.2, fo: 0.85, z: 0.6, lim: 0.3, t0: o.mane });
    const tail = X.chain({ bones: TAIL, drive: t => [o.jolt(t), 0, 0], pose: (t, i) => i ? null : o.tail(t), f: 0.9, fo: 0.85, z: 0.5, lim: 0.4, t0: o.tail0 });
    return { at(t) { if (G3D.dbgKey) { const q = Q(t), tp = o.tail(t); return { bB: q.b, nB: q.n, bT: q.b, nT: q.n, bH: q.bh, h: q.h, yH: q.y, yN: q.y, c: q.c, f: o.hoof(t), mane: ZZ, tail: [[tp[0], tp[1], 0], [0, 0, 0], [0, 0, 0]] }; }
      const tf = o.hits ? X.freeze(t, o.hits, 3, 0.3) : t, b = sB(tf), u = sT(tf), h = sH(tf), tp = o.tail(tf);
      return { bB: b[0], nB: b[1], bT: u[0], nT: u[1], bH: h[0], h: h[1], yH: sY(tf), yN: sYN(tf), c: sC(tf), f: o.hoof(tf), mane: mane.at(tf), tail: tail.at(tf).map((r, i) => i ? r : [r[0] + tp[0], r[1] + tp[1], 0]) }; } }; };
  /* Liv i holdeposene: et hode som aldri står helt stille (svak, langsom støy i blikket og nesa) og en pust som er litt ujevn (fasen glir med støyen). */
  const liveH = (t, s) => [0.016 * X.noise(t, s, 0.33), 0.03 * X.noise(t, s + 7, 0.27)];
  const brV = (t, t0, P, s) => t < t0 ? 0 : brW(t + 0.35 * P * X.noise(t, s, 0.12), t0, P);
  /* INTROEN: posene (nøklene) på filmens tider. HIT[4] kroppen er fri (første pust), HIT[5] halsen, HIT[6] hodet; BRE pusten før droppet; DROP slaget; NAME navnet.
     A1 statuen · A2 første pust · A3 oppspill (halsen litt lenger bak) · A4 halsen fram · A5 oppspill (blikket litt høyere) · A6 blikket ned mot oss ·
     B1 han samler seg (hoven opp, brystet bakover, hodet ned) · B2 slaget (hoven i glasset, brystet fram) · B3 mot himmelen (rundt 15°: ansiktet synes fra det lave
     kameraet) · B4 lyset regner · B5 kampstillingen (blikket snur først, så senkes hodet). */
  const AQ = t => { const lv = seg(t, HIT[6] + 0.8, HIT[6] + 1.4) * (1 - 0.8 * seg(t, BRE, BRE + 0.3) * (1 - seg(t, DROP + 0.8, DROP + 1.4))), L = liveH(t, 41);
    return {
    b: kf(t, [[HIT[5] - 0.02, 1], [HIT[5] + 0.28, 1.15], [HIT[5] + 0.9, 0]]),
    bh: kf(t, [[HIT[6] - 0.02, 1], [HIT[6] + 0.25, 1.18], [HIT[6] + 0.8, 0]]),
    n: kf(t, [[BRE - 0.1, 0], [BRE + 0.35, 0.07], [DROP - 0.2, 0.07], [DROP - 0.04, 0.11], [DROP + 0.1, 0.11], [DROP + 0.5, -0.14], [NAME + 0.3, -0.09], [NAME + 0.5, -0.09], [NAME + 1.3, 0.03]]),
    h: kf(t, [[HIT[6] + 0.25, 0], [HIT[6] + 0.8, 0.07], [BRE - 0.1, 0.07], [BRE + 0.35, 0.16], [DROP - 0.2, 0.16], [DROP - 0.04, 0.19], [DROP + 0.1, 0.19], [DROP + 0.42, -0.08], [NAME + 0.3, -0.02], [NAME + 0.5, -0.02], [NAME + 1.25, 0.06]]) + 1.3 * L[0] * lv,
    y: kf(t, [[HIT[6] + 0.2, 0], [HIT[6] + 0.85, -0.55], [NAME + 0.1, -0.5], [NAME + 0.8, -0.3], [NAME + 1.5, -0.4]]) + L[1] * lv,
    c: kf(t, [[BRE - 0.15, 0], [BRE + 0.3, -0.04], [DROP - 0.2, -0.04], [DROP, 0.03, ei], [DROP + 0.1, 0.03], [DROP + 0.5, -0.02], [NAME + 0.2, -0.015], [NAME + 1.2, 0]])
      - mix(0.028, 0.009, seg(t, HIT[4] + 2.2, HIT[4] + 3.4)) * (1 + 0.5 * seg(t, DROP + 0.4, DROP + 1.2)) * brV(t, HIT[4], 3.3, 51) }; };
  const MVA = mover(AQ, { t0: HIT[4] - 0.1, hits: [DROP], mane: HIT[6] - 0.05, tail0: HIT[5] - 0.05,
    hoof: t => kf(t, [[BRE - 0.3, 0], [BRE + 0.3, 1.07], [BRE + 0.55, 1], [DROP - 0.21, 1], [DROP, 0, ei]]),   /* løftes med et lite overskudd på toppen, og akselererer ned i glasset på slaget */
    tail: t => { const w = seg(t, HIT[5], HIT[5] + 1.5); return [kf(t, [[HIT[5], 0], [HIT[5] + 1.6, 0.06], [BRE, 0.06], [BRE + 0.5, -0.03], [DROP + 0.1, -0.03], [DROP + 0.6, 0.14], [NAME + 0.2, 0.12], [NAME + 1.6, 0.04]]) + 0.025 * X.noise(t, 33, 0.4) * w,
      0.07 * X.noise(t, 31, 0.45) * w + kf(t, [[DROP + 0.1, 0], [DROP + 0.6, 0.07], [NAME + 0.5, 0.03], [NAME + 1.6, 0]])]; },
    jolt: t => { const a = t - DROP; return a < 0 || a > 0.26 ? 0 : -0.09 * Math.pow(sin(PI * a / 0.26), 2); } });

  /* ---------- STORT SPRANG: den nye slutten ---------- */
  /* PLATENE: suget drar banen inn mot egget (orbN), smellet slynger dem ut i hallen, der de blir hengende og tumler sakte (HANG; tre av dem i veien kameraet raser inn),
     og under hvert av de to neste sugene slår de inn i hjulet på rekke og rad (TA: ni med den siste på smellet 52,87, åtte med den siste på 55,67).
     LUNTA (FU): når hjulet er helt, tennes de 18 typemerkene rundt ringen ett for ett, fortere og fortere, til sirkelen er sluttet (58,02) og gullet sprenges av. */
  const TA = i => i < 9 ? SW[1] + i * 0.05 : BOOM[2] - (16 - i) * 0.06, FU = j => BOOM[2] + 0.35 + 2.0 * Math.pow(j / 17, 0.75);
  const orbN = (i, t, q) => { const a = PI / 2 + (i + 1) / 18 * TAU + (t - LIFT[4]) * 0.2 + 1.8 * q, Rr = mix(12, 7.4, q); return [cos(a) * Rr, mix(7.2, 6.2, q) + 1.1 * sin(a * 2 + 0.7 + t * 0.3) * (1 - 0.6 * q), sin(a) * Rr, a]; };
  const HANG = Array.from({ length: NP }, (_, i) => { const a = PI / 2 + (i + 1) / 18 * TAU + 2.7 + (rnd(i, 51) - 0.5) * 0.5, R = 17 + 14 * rnd(i, 52); return i === 4 ? [4.4, 3.2, 45] : i === 12 ? [-6.4, 4.4, 31] : i === 7 ? [-0.6, 7.2, 23] : [cos(a) * R, 4.5 + 13 * rnd(i, 53), sin(a) * R]; });
  const PB = Array.from({ length: NP }, (_, i) => orbN(i, BANG, 1));
  /* VIRVELEN: når de ni første har slått inn (52,87), slipper de åtte siste plassene sine og går i ÉN skrå ring rundt ham, fortere og fortere (opp mot 48 m/s ved det
     tredje suget), og slår inn derfra. Så står det aldri stille mellom de to platesmellene. Ringen heller mot kameraet: lavt foran ham (ved hovene, så platene aldri
     dekker kroppen og ansiktet) og høyt bak ham (over hodet). */
  const cyc = (i, t) => { const u = t - BOOM[1], ph = (i - 9) / 8 * TAU + 1.1 * u + 0.95 * u * u, R = mix(11.5, 8.8, c01(u / 2.4)); return [cos(ph) * R, 4.9 - 3.7 * sin(ph) + 0.25 * sin(t * 1.7 + i), sin(ph) * R, ph]; };
  const markN = (j, t) => { const ta = j ? TA(j - 1) : BANG, f = FU(j); let v = t < ta ? 0 : j ? 0.35 + 0.9 * Math.exp(-(t - ta) * 2.2) : 0.5; if (t >= f) v = max(v, 0.95 + 0.6 * Math.exp(-(t - f) * 5)); return mix(v, j ? 0.12 : 0.85, io(seg(t, DROP + 0.6, NAME + 1.2))); };   /* til slutt som arenaen: bare hans eget merke lyser */
  /* Det den nye slutten har i tillegg (kalles sist i act): suget, smellet, platene som slår inn, hjulet som smeller, lunta, gullet som sprenges av, og Judgment løftet. */
  const kick = (t, t0, f, d) => { const a = t - t0; return a < 0 ? 0 : Math.exp(-d * a) * sin(f * a); };   /* et støt: starter i null, slår ut og faller til ro (kameraets rekyl) */
  const endFx = (S, t, q) => { const { tb, inh, lu, us, oa } = q;
    /* SUGET (49,24–49,67): lyset i hallen trekkes inn i egget, og en ring av lys løper innover gulvet. */
    S.inhp.visible = t > SW[0] - 0.3 && t < BANG; if (tb < 0 && inh > 0) lu.uFr.value[0].set(mix(64, 4, inh), 1.5 * inh * (1 - seg(inh, 0.9, 1)), 1.3, 0);
    /* SMELLET (49,67): stjernen av stråler, glitteret, tre store ringer ut i kosmos i glorienes plan, fronten over gulvet (150 m/s) og søylene som blinker idet den går forbi. */
    S.star.visible = tb >= 0 && tb < 1.1; if (S.star.visible) { const u = S.star.material.uniforms; u.uLen.value = 0.22 + 1.0 * eo(c01(tb / 0.32)); u.uA.value = 1.15 * Math.pow(1 - c01(tb / 1.1), 2); u.uWd.value = 1 + 0.8 * c01(tb / 1.1); }
    S.shell.visible = tb >= 0 && tb < 9.4;
    S.shock.visible = tb >= 0 && tb < 0.8; if (S.shock.visible) { const R = (5 + 150 * tb) / ER; S.shock.scale.set(R, R, R); S.shock.material.uniforms.uA.value = 1.5 * seg(tb, -0.02, 0.1) * (1 - seg(tb, 0.3, 0.8)); }   /* trykkbølgen: samme radius som fronten over gulvet */
    if (tb >= 0 && tb < 2.4) { const R = 5 + 150 * tb, f = 1 - seg(tb, 0.8, 1.6);
      lu.uFr.value[0].set(R, 1.5 * f, 2.0, 0); us.uBl.value.set(R, 2.6 * (1 - seg(tb, 0.5, 1.3)), 6); setv(S.wr[4], [0, 0.25, 0], [PI / 2, 0, 0], R); ringA(S.wr[4], 0.3 * f * (26 / max(26, R)));
      for (let i = 0; i < 3; i++) { const Rg = 5 + 250 * (1 - Math.exp(-tb * 1.5)) * [1, 0.86, 1.12][i]; setv(S.wr[1 + i], EC, [PI / 2 + [0.48, -0.67, 0.19][i], [0.4, -0.9, 2.1][i], [0.16, -0.22, 0.4][i]], Rg); ringA(S.wr[1 + i], 1.25 * (1 - seg(tb, 0.3, 1.5)) * Math.sqrt(14 / max(14, Rg))); } }
    /* PLATENE SLÅR INN: gnistene, og et glimt i fargen til den som traff sist. */
    S.spk.visible = t > SW[1] - 0.1 && t < BOOM[2] + 1.2; S.pglow.visible = q.flash >= 0;
    if (q.flash >= 0) { const ga = (q.flash - 1) * 2.4, c = hex(TY[q.flash]), u = S.pglow.material.uniforms; S.pglow.position.set(WHEEL[0] + cos(ga) * 2.2, WHEEL[1] + sin(ga) * 2.2, WHEEL[2] + 0.3); u.uA.value = 1.3 * q.fk; for (const k of ['uC0', 'uC1']) u[k].value.setRGB(c[0], c[1], c[2]); }
    /* HJULET SMELLER (52,87 og 55,67): en ring ut fra hjulet i hjulets plan; på det andre er hjulet helt, og en front går over gulvet og tenner søylene. */
    [BOOM[1], BOOM[2]].forEach((b, n) => { const a = t - b; if (a < 0 || a >= 0.8) return; setv(S.wr[1], WHEEL, [0, 0, 0], 2.4 + (15 + 9 * n) * eo(a / 0.8)); ringA(S.wr[1], 1.4 * (1 - a / 0.8));
      if (n && a > 0.07) { setv(S.wr[2], WHEEL, [0, 0, 0], 2.4 + 34 * eo((a - 0.07) / 0.73)); ringA(S.wr[2], 1.0 * (1 - a / 0.8)); } });
    { const a = t - BOOM[2]; if (a >= 0 && a < 1.6) { const R = 4 + 85 * a; lu.uFr.value[0].set(R, 1.7 * (1 - a / 1.6), 1.8, 0); us.uBl.value.set(R, 1.1 * (1 - seg(a, 0.3, 1.1)), 5); }
      /* LUNTA: mens merkene tennes rundt ringen (markN), løper tre bølger av lys innover gulvet mot ham. */
      for (const s0 of [0.55, 1.2, 1.75]) { const b = a - s0; if (b >= 0 && b < 0.75) lu.uFr.value[1].set(mix(44, 3, io(b / 0.75)), 1.1 * sin(PI * b / 0.75), 1.2, 0); } }
    /* GULLET SPRENGES AV (58,87 · 60,47 · 62,07 · 63,67): gullstøvet, en ring ut fra kroppen i høyden der gullet slapp, og en bølge i glasset. */
    for (let k = 0; k < 4; k++) { const a = t - HIT[3 + k]; S.puff[k].visible = a >= 0 && a < 4;
      if (a >= 0 && a < 0.5) { setv(S.wr[3], [0, [1.6, 4.0, 5.6, 7.4][k], [0, -0.3, 1.6, 1.4][k]], [PI / 2, 0, 0], 1.6 + (11 + 2 * k) * eo(a / 0.5)); ringA(S.wr[3], 1.3 * (1 - a / 0.5)); } }
    if (t < DROP + 1) for (let k = 0; k < 4; k++) lu.uWv.value[2 + k].set(0, 0, HIT[3 + k] + 0.02, t >= HIT[3 + k] + 0.02 ? 0.9 + 0.2 * k : 0);
    else NEAR.slice(0, 4).forEach((h, i) => lu.uWv.value[2 + i].set(h[0], h[1], h[2], t >= h[2] ? 1.2 : 0));   /* Judgment: lyset som slår ned ved oss, sender ringer over glasset */
    /* JUDGMENT løftet: hoven i glasset sender en front over gulvet, og søylene blinker. */
    if (oa >= 0 && oa < 1.5) { const R = 3 + 90 * oa; lu.uFr.value[0].set(R, 2 * (1 - oa / 1.5), 2, 0); us.uBl.value.set(R, 1.6 * (1 - seg(oa, 0.3, 1.2)), 5); }
    if (oa >= JB) { const b = Math.exp(-(oa - JB) * 1.5), fl2 = Math.exp(-(oa - JB) * 5);   /* kula brister i senit: lyset flommer ned over hallen (kosmos blusser opp, seglet lyser, søylene lyses ovenfra) */
      us.uSky.value.z += 1.6 * b; us.uSky.value.x += 1.2 * b; lu.uA.value += 0.5 * b; lu.uLit.value += 0.6 * b; us.uEgg.value.set(0, mix(60, 7.5, 1 - b), 2, us.uEgg.value.w + 3.2 * fl2 + 0.5 * b); }
  };
  /* ---------- STORT SPRANG: kameraene til de nye bildene ---------- */
  /* 5–6 Slutten. 5: som før til suget, så skyves kameraet inn mens linsa vides ut (egget står like stort, og hallen trekkes vekk bak det).
     6 (K6, ett klipp fra smellet 49,67 til hjulet er helt 55,67): KLIPP PÅ SMELLET til gangen langt unna, lavt og vidt: egget detonerer i enden av søylerekkene, fronten
     kommer mot oss og treffer linsa (0,47 s etter), og så raser kameraet lavt inn over glasset gjennom glitteret til han står stor i gull over oss (52,2). Det blir
     stående under ham mens de ni første platene slår inn, og glir så i en bue foran ham og opp mens de åtte siste slår inn.
     6M (55,67–58,17): KLIPP PÅ SMELLET rett opp: seglet ovenfra, lunta rundt ringen av typemerker, gloriene som samles ved hovene. Dreier sakte og synker. */
  const K5 = [[L4, -9, 6.5, 19, 0, 5.8, 0, 46], [SW[0], -6.05, 6.2, 16.55, 0, 5.8, 0, 44], [BANG, -4.4, 5.95, 12.0, 0, 5.7, 0, 58]];
  const K6 = [[BANG, 2.0, 1.5, 76, 0, 8, 0, 50], [BANG + 0.45, 2.2, 1.6, 78.5, 0, 8.5, 0, 52], [BANG + 1.5, 0.5, 1.7, 52, 0, 7, 0, 56], [BANG + 2.55, -4.2, 1.9, 17, 0, 5.6, 0, 44], [BOOM[1], -4.8, 2.1, 14.6, 0, 5.5, 0, 42],
    [BOOM[1] + 1.3, -1, 3.2, 15.5, 0, 5.4, 0, 41], [BOOM[2] - 0.4, 5.2, 4.6, 14.2, 0, 5.2, 0, 40], [BOOM[2], 6, 4.9, 13.6, 0, 5.2, 0, 40]];
  const hh6 = X.handheld(t => pathAt(t, K6).slice(0, 6), { t0: BANG, f: 3, z: 0.9, amp: [0.04, 0.03], hz: 0.7, seed: 6 });
  const endCam = (S, t) => {
    if (t < BANG) { const iq = Math.pow(seg(t, SW[0], BANG), 2); camK(t, K5); S.post.sub = S.sub; S.post.subf = 0.01; S.post.subc = '#ffffff'; S.post.sh = 0.6 * iq; return; }
    if (t < BOOM[2]) { const c = hh6(t), fv = pathAt(t, K6)[6], tb = t - BANG; cam(c[0], c[1], c[2], c[3], c[4], c[5], fv);
      let vt = 0; for (let i = 0; i < NP; i++) vt += 0.5 * hit(t, TA(i), 0.12);   /* hvert slag i hjulet */
      S.post.sh = 2.6 * hit(t, BANG, 1.0) + 1.7 * hit(t, BANG + 0.46, 0.6) + vt + 1.6 * hit(t, BOOM[1], 0.6);
      S.post.fl = max(0.95 * hit(t, BANG, 0.1), 0.8 * hit(t, BANG + 0.44, 0.13), 0.32 * hit(t, BOOM[1], 0.08), 0.5 * seg(t, BOOM[2] - 0.07, BOOM[2])); S.post.flc = '#fff4d8';
      const q = K.proj(0, 6, 0); S.post.spx = q.x / 2; S.post.spy = q.y / 2; S.post.spr = 0.1; S.post.spd = max(0.9 * hit(t, BANG, 0.45), 0.55 * seg(tb, 0.6, 1.1) * (1 - seg(tb, 1.9, 2.5))); S.post.spc = '#fff0b0'; return; }
    const a = t - BOOM[2], k = io(c01(a / 2.5)), ph = 0.5 + 0.28 * a, R = mix(8, 5.5, k); cam(sin(ph) * R, mix(52, 42, k), cos(ph) * R, 0, 0.5, 0, 40);
    let ft = 0; for (let j = 0; j < 18; j++) ft += 0.16 * hit(t, FU(j), 0.1);
    S.post.sh = 1.9 * hit(t, BOOM[2], 0.7) + ft; S.post.fl = max(0.5 * hit(t, BOOM[2], 0.1), 0.4 * seg(t, HIT[3] - 0.76, HIT[3] - 0.7)); S.post.flc = '#fff4d8'; };
  /* 7 Gullet sprenges av: helt nede ved hovene og tett på med vid linse, så beina står som søyler over oss og gullet slynges mot linsa; så opp med kanten til ansiktet,
     som før. Hvert slag gir kameraet et støt bakover (kick: starter i null, slår ut og faller til ro). */
  const K7 = [[HIT[3] - 0.7, -3.3, 0.5, 7.6, 0, 1.7, 0.8, 52], [HIT[3] + 0.5, -3.7, 0.75, 8.2, 0, 2.1, 0.7, 52], [HIT[4] + 0.5, -5.8, 3.3, 12.6, 0, 4.0, 0, 46], [HIT[5] + 0.5, -4.8, 5.7, 12.0, 0, 5.9, 1.2, 38], [HIT[6] + 0.75, -3.0, 7.25, 10.2, 0, 6.95, 1.9, 27], [DROP, -2.8, 7.25, 9.8, 0, 6.95, 1.9, 25]];
  /* Kameraet med litt liv (Bevegelse, Opus 25.11): banen følges med en fjær (etterslep) og får svak støy, som X.handheld, men støyen tones inn fra tIn og ut mot tEnd,
     der bildet må stå nøyaktig (kampens bilde: arenaen tar over der filmen slutter). Ett per klipp; src(t) gir [px, py, pz, tx, ty, tz, fov]. */
  const camLive = (src, o) => { const lag = X.follow(t => src(t).slice(0, 6), { f: o.f || 2, z: o.z || 0.85, t0: o.t0 }), A = o.amp || [0.04, 0.025];
    return t => { const v = src(t), c = lag(t), w = (o.tIn != null ? io(seg(t, o.tIn, o.tIn + 0.6)) : 1) * (o.tEnd != null ? 1 - io(seg(t, o.tEnd - 1, o.tEnd)) : 1);
      for (let i = 0; i < 6; i++) c[i] += X.noise(t, (o.seed || 1) + i * 17, o.hz || 0.6) * A[i < 3 ? 0 : 1] * w; c.push(v[6]); return c; }; };
  /* 7 med liv: banen K7 med etterslep og støy (tett på ansiktet til slutt: små utslag), og støtene på slagene som før. */
  const cam7 = camLive(t => pathAt(t, K7), { t0: HIT[3] - 0.7, f: 2.2, z: 0.85, amp: [0.03, 0.016], hz: 0.55, seed: 7 });
  const shot7n = (S, t) => { const v = cam7(t); let rc = 0; [3, 4, 5, 6].forEach((k, i) => { rc += kick(t, HIT[k], 11, 6) * (0.55 + 0.12 * i); });
    const dx = v[0] - v[3], dy = v[1] - v[4], dz = v[2] - v[5], dl = hyp(dx, dy, dz); cam(v[0] + dx / dl * rc, v[1] + dy / dl * rc + 0.25 * rc, v[2] + dz / dl * rc, v[3], v[4], v[5], v[6] + 2.5 * rc);
    S.post.sh = [3, 4, 5, 6].reduce((s, k, i) => s + (1.0 + 0.25 * i) * hit(t, HIT[k], 0.45), 0); S.post.fl = [3, 4, 5, 6].reduce((s, k) => max(s, 0.1 * hit(t, HIT[k], 0.08)), 0); S.post.flc = '#ffe9b0'; };
  /* 8 med liv: fra droppet til kampens bilde, med etterslep og støy som er borte når navnet står (kampen tar over i nøyaktig samme bilde). Lages første gang (camEnd). */
  let cam8 = null; const K8 = () => { const tg = camEnd(), cp = CAMB.cp; return [[DROP, -5.5, 0.9, 11.5, 0, 7.2, 0, 54], [DROP + 0.6, -6.3, 1.2, 14, 0, 9.5, 0, 56], [NAME + 0.6, cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv]]; };
  /* 4 Søylene: lavt i gangen like utenfor porten. Ringen slås ned og kommer mot oss; den indre ringen av søyler skyter opp samlet rundt egget, og så rygger kameraet
     nedover gangen foran fronten (32 m/s, nær den høyre raden), mens parene skyter opp tett på linsa. Det stanser ytterst i gangen, og på løft 4 ser det opp. Kameraet
     holdes av en hånd (X.handheld), og hvert utbrudd rister det etter avstanden. */
  const K4 = [[L2, 2.0, 1.7, 49, 0, 6, 0, 50], [L2 + 1.25, 2.6, 1.6, 53, 0, 9, 0, 52], [L2 + 1.87, 5.5, 1.6, 66, 0, 12, 0, 55], [L2 + 3.55, 7.0, 1.9, 120, 0, 15, 0, 56], [L2 + 4.5, 6.4, 2.1, 129, 0, 14, 0, 54], [L3, 6.0, 2.2, 130.5, 0, 16, 0, 54],
    [L3 + 1.9, 5.4, 2.0, 127, 0, 105, -10, 58], [L3 + 3.7, 5, 2.0, 118, 0, 60, -6, 56], [L4, 4.5, 2.2, 104, 0, 14, 0, 52]];
  const hh4 = X.handheld(t => pathAt(t, K4).slice(0, 6), { t0: L2, f: 2.4, z: 0.9, amp: [0.05, 0.04], hz: 0.7, seed: 4 });
  const shot4 = (S, t) => { const c = hh4(t), fv = pathAt(t, K4)[6]; cam(c[0], c[1], c[2], c[3], c[4], c[5], fv);
    let sh = 0; PIL.forEach((q, i) => { const a = t - PT2[i][0]; if (a < 0 || a > 0.7) return; sh += 0.9 * min(1, 16 / hyp(q[0] - c[0], q[1] - c[2])) * (1 - a / 0.7); });
    S.post.sh = min(1.9, sh) + 0.5 * hit(t, L2 + 0.28, 0.4); };   /* ingen blink: over den svarte himmelen ble det et grått slør, og utbruddene lyser selv */

  G3D.def('c3:493', {
    len: LEN, hold: 1, R: DROP, at: -K0,   /* kamplåta kommer inn 49,3 s ut i filmen (en kald start), og filmens klokke er dens */
    mus: { seq: [['Azure Flute', 0], ['Hall of Origin', H0, [HFADE, HEND]]], noskip: 19.36,   /* fløyta og Hall of Origin foran kamplåta (PACK.seq); hele fløyta spilles før Skip vises */
      bed: 'sfx/natur/arceus_intro.mp3', hold: ['sfx/natur/arceus_hold.mp3', 0.2, DROP] },   /* lydsengen på filmens klokke (work/raids3d/arceus/lyd/bed.py), og sløyfa mens fingeren holdes fra droppet */
    fig: 2, models: ['arceus'], edge: null, env: { rim: '#ffe2a0', glow: '#bfe9ff', fog: '#04050b', glowH: 6, ink: '#191430' },
    make(K, T) { const S = { scene: new T.Scene(), figs: [] };
      place(K, T, S, { grow: (q, i) => PT2[i] });   /* søylene skyter opp der ringen går forbi (PT2) */
      return build(K, T, S); },
    act(S, t, o) { CS = S; const U = K.U(), us = S.us, lu = S.lines.material.uniforms;
      /* TB = øyeblikket han kommer ut av egget (smellet 49,67), inh = suget før smellet (0–1; inq = kvadratet: det tar av mot slutten), tb = sekunder siden smellet. */
      const TB = BANG, inh = t < BANG ? seg(t, SW[0], BANG) : 0, inq = inh * inh, tb = t - BANG;
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
      /* Stort sprang: i suget (49,24–49,67) trekker egget seg sammen til litt over halv størrelse og blir hvitglødende, mens lyset i hallen trekkes inn i det.
         På smellet er det borte i ett bilde: kjernen av lys (S.seed) blender og brer seg, og hallen lyses hardt fra midten et øyeblikk (uEgg). */
      const open = seg(t, TB, TB + 0.5), pul = 0.5 * hit(t, HBASS, 1.3) + LIFT.reduce((s, L) => s + 0.4 * hit(t, L, 0.9), 0), grow = back(seg(t, 20.5, 22.3), 1.4) * (1 - 0.42 * inq), eo1 = 1 + 0.55 * eo(open);
      const ea = (0.86 + 0.5 * pul) * (1 - 0.5 * seg(t, HFADE, K0 + 0.1)) * (1 + 1.6 * inq);
      S.egg.visible = t > 20.5 && t < TB; S.egg.scale.set(grow, EY * grow, grow); S.egg.material.uniforms.uA.value = ea;
      S.seed.material.uniforms.uA.value = seg(t, 19.4, 20.5) * (1 - seg(t, 20.9, 22.4)) + 0.7 * inq * (tb < 0 ? 1 : 0) + (tb >= 0 ? 2.6 * Math.exp(-tb * 10) : 0);
      S.seed.scale.setScalar(tb >= 0 ? 1.6 + 2.6 * eo(c01(tb / 0.4)) : 1);
      if (t < TB) us.uEgg.value.set(EC[0], EC[1], EC[2], (0.25 + 0.62 * ea * grow) * (1 - 0.78 * inq)); else us.uEgg.value.set(0, 7.5, 2, mix(1.05, 0.85, seg(tb, 0, 2)) + 4.5 * Math.exp(-tb * 4.2));
      /* DE FEM RINGENE: tennes rundt egget (fra 22,5), og hver løsner på sitt løft og blir en ting i verden. */
      let r1 = 0, gl = 0, r2 = 0, skyF = 0, skyK = 0; lu.uFr.value[0].set(0, 0, 1, 0); lu.uFr.value[1].set(0, 0, 1, 0);
      us.uHot.value.set(1.3, 0.6, 1); us.uBl.value.set(0, 0, 1); for (const w of S.wr) w.visible = false;
      S.gey.visible = S.pjet.visible = S.pimp.visible = S.pdust.visible = t > LIFT[2] && t < LIFT[2] + 9;
      S.rings.forEach((g, i) => { const L = LIFT[i], app = eo(seg(t, 22.5 + i * 0.32, 23.6 + i * 0.32)), a = t - L, dir = i % 2 ? 1 : -1;
        let p = [...EC], rot = [[0.35, 0.2, 0], [-0.55, 0.9, 0.3], [1.15, -0.4, 0.2], [0.1, 1.45, -0.6], [-1.0, 0.3, 1.1]][i].map((q, j) => q + (j === 0 ? 0.22 * t * dir : j === 1 ? 0.17 * t : 0)), sc = 0.4 + 0.6 * app, al = app * (1 + 0.5 * hit(t, 22.5 + i * 0.32, 0.5));
        const flat = k => { rot = [mix(rot[0] % TAU, PI / 2, k), mix(rot[1] % TAU, 0, k), mix(rot[2], 0, k)]; };
        if (a > 0) {
          if (i === 0) { const k = io(c01(a / 1.0)), e = c01((a - 0.9) / 3.7), rf = 8 + 400 * e * e; flat(k); p = [0, mix(EC[1], 0.05, k), 0]; sc = mix(1, 1.22, k); al = 1 - seg(a, 0.9, 1.5);   /* 1: legges ned, og glasset støpes utover fra den */
            if (a > 0.9) { gl = r1 = rf; lu.uFr.value[0].set(rf, 1 - seg(a, 3.2, 4.6), 1.3, 0); } }
          else if (i === 1) { const k = io(c01(a / 0.7)); flat(k); p = [0, mix(EC[1], 0.08, k), 0]; sc = mix(1, 0.2, k); al = 1 - seg(a, 0.55, 0.9); r2 = a < 0.6 ? 0 : 3 + 150 * Math.pow(c01((a - 0.6) / 4.2), 1.5); }   /* 2: trekkes inn i seglet, og linjene tegnes utover */
          else if (i === 2) { const k = io(c01(a / 0.3)); flat(k); p = [0, mix(EC[1], 0.1, k), 0]; sc = mix(1, 0.75, k); al = 1 - seg(a, 0.26, 0.42);   /* 3 (stort sprang): slås ned i gulvet og JAGER utover, og søylene skyter opp der den går forbi */
            if (a > 0.3) { const rr = (a - 0.3) * VP, fa = 1 - seg(a, 4.1, 4.9); lu.uFr.value[1].set(rr, 0.9 * fa, 1.0, 0); setv(S.wr[0], [0, 0.22, 0], [PI / 2, 0, 0], max(4, rr)); ringA(S.wr[0], 0.75 * fa * seg(a, 0.3, 0.5) * (22 / max(22, rr))); } }
          else if (i === 3) { const k = io(c01(a / 0.45)), e = Math.pow(c01((a - 0.3) / 1.5), 1.6); flat(k); p = [0, EC[1] + 240 * e, 0]; sc = mix(1, 5, e); al = 1 - seg(a, 1.5, 1.85); skyF = a < 1.75 ? 0 : 0.03 + 1.75 * eo(c01((a - 1.75) / 3.0)); skyK = a < 1.75 ? 0 : 1; }   /* 4: til himmels; kosmos tennes fra senit og ned */
          else { al = 1 - seg(a, 0, 0.22); sc = 1 + 0.25 * seg(a, 0, 0.22); } }   /* 5: brister i de 17 platene */
        setv(g, p, rot, sc); ringA(g, al * (1 - 0.4 * seg(t, HFADE, K0))); });
      if (t >= LIFT[4]) { skyF = 2; skyK = 1; }
      const fdone = t > LIFT[0] + 4.6;
      S.glass.material.uniforms.uGl.value = fdone ? 400 : gl; S.glass.visible = gl > 0.01 || fdone;
      lu.uR1.value = fdone ? 400 : r1; lu.uR2.value = t > LIFT[1] + 4.9 ? 400 : r2; S.lines.visible = S.glass.visible; S.mirG.visible = t > LIFT[0] + 0.95;
      lu.uLit.value = seg(t, LIFT[1], LIFT[1] + 3) * (1 - 0.3 * seg(t, HFADE, K0)); lu.uA.value = 1 - 0.3 * seg(t, HFADE, K0) + 0.3 * seg(t, HIT[0], HIT[0] + 0.4);
      us.uSky.value.set(skyK, skyF, 1, 0.25 * seg(t, LIFT[0] + 1, LIFT[0] + 4) + 0.75 * seg(t, LIFT[3] + 2, LIFT[3] + 4.5));
      { const bl = tb >= 0 ? Math.exp(-tb * 2.4) : 0;   /* suget slukker hallen (linjene, stjernene), og smellet tenner alt sterkere enn før: tåkene i kosmos blusser opp og blir stående litt lysere */
        lu.uLit.value = seg(t, LIFT[1], LIFT[1] + 3) * (1 - 0.3 * seg(t, HFADE, K0)) * (1 - 0.9 * inq) + 0.7 * bl; lu.uA.value = (1 - 0.3 * seg(t, HFADE, K0)) * (1 - 0.6 * inq) + (tb >= 0 ? 0.3 + 0.9 * bl : 0);
        us.uSky.value.x = skyK * (1 - 0.6 * inq) + 1.5 * bl; us.uSky.value.z = 1 + (tb >= 0 ? 0.22 * (1 - io(seg(t, DROP + 1.6, NAME + 2.6))) + 0.9 * Math.exp(-tb * 1.8) : 0); }   /* til slutt som arenaen (kampen står slik filmen sluttet) */
      S.pil.visible = S.pilM.visible = t > LIFT[2]; S.pil.material.uniforms.uLit.value = S.pilM.material.uniforms.uLit.value = lu.uLit.value;
      S.motes.material.uniforms.uA.value = 0.5 * seg(t, LIFT[3] + 2, LIFT[3] + 5);
      /* PLATENE: den femte ringen brister i 17 tavler som glir ut i bane (46,52); på 52,47 og 55,67 låser de seg i hjulet, hver med et blink i sin farge. */
      let flash = -1, fk = 0;
      { for (let j = 0; j < 18; j++) lu.uMk.value[j] = markN(j, t);
        S.pl.forEach((m, i) => { const out = c01((t - LIFT[4] - i * 0.02) / 1.5), ta = TA(i), dv = c01((t - ta + 0.3) / 0.3);
          m.visible = t > LIFT[4] && dv < 1; if (t >= ta && t < ta + 0.18) { flash = i + 1; fk = 1 - (t - ta) / 0.18; } if (!m.visible) return;
          const a0 = PI / 2 + (i + 1) / 18 * TAU, st = [EC[0] + cos(a0) * 7.9, EC[1] + 0.6 * sin(a0 * 3), EC[2] + sin(a0) * 7.9], q = orbN(i, t, inq), e = back(out, 1.2), bl = tb >= 0 ? 1 - Math.exp(-tb * 3.4) : 0;
          let p = [mix(st[0], q[0], e), mix(st[1], q[1], e), mix(st[2], q[2], e)];
          if (tb >= 0) { const h = HANG[i], b = PB[i]; p = [mix(b[0], h[0], bl), mix(b[1], h[1], bl) + 0.5 * sin(t * 0.6 + i * 1.7) * bl, mix(b[2], h[2], bl)]; }   /* slynget ut av smellet, så hengende */
          const cy = i >= 9 && t > BOOM[1] ? io(seg(t, BOOM[1] + 0.05, BOOM[1] + 1.25)) : 0; if (cy > 0) { const c = cyc(i, t); p = [mix(p[0], c[0], cy), mix(p[1], c[1], cy), mix(p[2], c[2], cy)]; q[3] = mix(q[3], c[3], cy); }   /* virvelen */
          if (dv > 0) { const k = dv * dv * dv, ga = i * 2.4; p = [mix(p[0], WHEEL[0] + cos(ga) * 2.2, k), mix(p[1], WHEEL[1] + sin(ga) * 2.2, k), mix(p[2], WHEEL[2], k)]; }
          const tum = (tb >= 0 ? 6 * bl + 0.3 * tb : 0) * (1 - cy), s = mix(0.25, 1, eo(out)) * (1 - 0.6 * dv) * (1 + 0.6 * bl * (1 - 0.75 * cy));
          m.position.set(p[0], p[1], p[2]); m.rotation.set(0.14 * sin(t * 0.9 + i) + tum * (0.5 + 0.5 * rnd(i, 55)), -q[3] + PI / 2 + tum * (rnd(i, 56) - 0.5) * 2, 0.1 * cos(t * 0.7 + i * 2) + tum * 0.6 * rnd(i, 57));
          m.scale.set(s * mix(2.4, 1, eo(out)), s * mix(0.3, 1, eo(out)), s); m.material.uniforms.uGo.value = min(1, 1 - seg(out, 0.15, 0.7) + 0.8 * dv + 0.4 * inq + (tb >= 0 ? Math.exp(-tb * 3.5) : 0)); }); }
      /* ARCEUS: en skikkelse inni egget (skimtes når lyset dempes), så i gull fra egget åpner seg, bøyd og helt stiv; gullet slipper nedenfra takt for takt, og
         det som er fritt, lever: kroppen puster (60,47), halsen reiser seg (62,07), hodet løftes og ser på oss (63,67). */
      const on = t >= LIFT[4] - 0.2, g = S.gr, Z = S.zone; g.root.visible = on; S.rf.root.visible = t >= HIT[0];
      const fsc = mix(0.72, 1, eo(seg(t, TB, TB + 0.12)));   /* inni egget er han mindre og svever; idet det åpner seg, folder han seg ut og står på glasset */
      { const fs2 = fsc * (1 - 0.4 * inq), up = (fsc - 0.72) / 0.28;   /* i suget krymper han med egget (skikkelsen holder seg inni det), og på smellet folder han seg ut til full størrelse */
        for (const f of [g, S.rf]) { f.root.scale.setScalar(fs2); f.root.position.set(0, S.fy * fs2 + mix(1.5 + 1.75 * inq, 0, up), mix(-0.4, 0, up)); f.root.rotation.set(0, 0, 0); } }
      const roar = t < DROP ? 0 : kf(t, [[DROP, 0], [DROP + 0.3, 1, eo], [NAME + 0.1, 1], [NAME + 1.6, 0.1, io]]); S.rw = roar;
      { const A = MVA.at(t); poseN(S, g, S.rg, A); poseN(S, S.rf, S.rrg, A); }   /* bevegelsen (Opus 25.11): posene og fjærene i MVA */
      /* Stort sprang: gullet SPRENGES av på slaget (kanten spretter opp på 0,17 s, og figuren blinker hvitt i tre bilder), i stedet for å slippe over et halvt sekund. */
      const gy = kf(t, [[HIT[3] - 0.03, -2], [HIT[3] + 0.14, Z[0], eo], [HIT[4] - 0.03, Z[0]], [HIT[4] + 0.14, Z[1], eo], [HIT[5] - 0.03, Z[1]], [HIT[5] + 0.14, Z[2], eo], [HIT[6] - 0.03, Z[2]], [HIT[6] + 0.14, Z[3], eo]]);
      const born = 1 - Math.pow(1 - c01((t - TB) / 2.3), 2.2), inEgg = t < TB,   /* han står hvitglødende i lyset etter smellet og kjølner til gull mens kameraet raser inn */ sheen = [BOOM[1], BOOM[2]].reduce((s, h) => t >= h && t < h + 0.9 ? mix(-1, S.hgt + 1, eo((t - h) / 0.9)) : s, -1e4);
      const gfl = 0.7 * [3, 4, 5, 6].reduce((q, k) => max(q, hit(t, HIT[k], 0.1)), 0);
      setCoat(S, inEgg ? 0 : 1, gy, sheen); g.set('uFlK', inEgg ? 1 : max(1 - born, 0.2 * fk, gfl)); g.set('uFlC', inEgg ? '#2a1804' : flash >= 0 && born >= 1 && gfl <= 0 ? TY[flash] : '#ffffff'); g.set('uStone', 0);
      g.set('uCoatC', flash >= 0 ? mixHex('#ffe69a', TY[flash], 0.25 + 0.4 * fk) : '#ffe69a');   /* fargen blandes inn i gullet (han fyller bildet, og ni rene farger på et halvt sekund ble et hardt flimmer) */ g.eye(0, 0, t < HIT[6] + 0.3 ? 0.5 : 0.35); S.sub = inEgg ? 0.5 * seg(t, LIFT[4] + 0.6, HFADE) + 0.4 * seg(t, HFADE, HEND) + 0.3 * inq : 0;
      /* GLORIENE: egget åpner seg til tre ringer rundt ham (49,55). I pusten trekker de seg sammen over ham, og på droppet er de kula som skytes til himmels. */
      /* Stort sprang: i suget tennes de tett rundt egget og vinder seg opp som et gyroskop som strammes; på smellet slår de ut til full størrelse (0,5 s, med overskudd).
         De synker til hovene mens lunta går (55,9–57,9), og blir der til ringen som løfter gullet. */
      const gather = io(seg(t, HIT[6] + 0.55, BRE + 0.5)), oa = t - DROP, sink = io(seg(t, BOOM[2] + 0.2, BOOM[2] + 2.2));   /* sink: gloriene legger seg rundt hovene mens gullet slipper, så kroppen og ansiktet står fritt */
      S.halo.forEach((h, i) => { const a = t - TB - i * 0.03, ex = a < 0 ? 0 : back(c01(a / 0.5), 1.5), e = ex * (1 - sink), R0 = [6.2, 7.5, 8.9][i], BM = BOOM, wd = a < 0 ? inq : 0;
        const cy = mix(mix(EC[1] + (i - 1) * 2.4 * (1 - 0.42 * wd), 4.6 + (i - 1) * 1.2, ex), 0.35 + 0.3 * i, sink), sc = mix(ER * [0.8, 1, 0.8][i] / R0, 1, e) * mix(1, 0.9 / R0, gather) * (1 + 0.03 * sin(t * 2 + i)) * (a < 0 ? (1.5 - 0.6 * wd) * (1 - 0.42 * wd) : 1), pulse = 1 + 0.5 * hit(t, BM[1], 0.35) + 0.5 * hit(t, BM[2], 0.35);
        setv(h, [mix(0, ORB[0], gather), mix(cy, ORB[1], gather), mix(-0.3, ORB[2], gather)], [PI / 2 + ([0.3, -0.42, 0.12][i] * e + 0.05 * sin(t * 0.7 + i)) * (1 - gather) + 0.8 * wd * [1, -1.2, 0.7][i], t * [0.2, -0.14, 0.09][i] + 13 * wd * (i % 2 ? -1 : 1), [0.16, -0.22, 0.4][i] * e * (1 - gather)], sc);
        ringA(h, oa > 0 ? 0 : a < 0 ? 0.9 * inh : eo(c01(a / 0.3)) * pulse * mix(mix(mix(0.9, 0.5, seg(a, 0.5, 2.6)), 0.14, sink), 1.6, gather)); });
      /* Ringen som løfter gullet av ham: den står ved kanten, og tar ett steg opp på hver takt. */
      { const a = seg(t, BOOM[2] + 1.5, BOOM[2] + 2.3) * (1 - seg(t, HIT[6] + 0.5, HIT[6] + 0.9)), w = 1 + 2.2 * [3, 4, 5, 6].reduce((s, k) => s + hit(t, HIT[k], 0.35), 0), zc = kf(t, [[HIT[4] + 0.5, 0], [HIT[5] + 0.5, 1.6, io], [HIT[6] + 0.5, 1.2, io]]), rr = kf(t, [[HIT[4] + 0.5, 3.4], [HIT[5] + 0.5, 1.9, io], [HIT[6] + 0.5, 2.4, io]]);
        setv(S.tide, [0, max(0.1, gy) + 0.05, zc], [PI / 2, 0, 0], rr / 3.4); ringA(S.tide, a * w * 0.8); }
      S.flakeN.forEach((m, k) => m.at(t, HIT[3 + k], { g: 9, floor: 0.02 }));
      /* JUDGMENT (65,27): hoven i glasset, kula til himmels på 0,4 s, den brister i senit, og lyset regner over hele hallen. */
      const ok = c01(oa / JB), oy = mix(ORB[1], 250, ok * ok); S.orb.visible = t > BRE && oa < JB + 0.02; S.orb.position.set(ORB[0], oa < 0 ? ORB[1] : oy, ORB[2]); S.orb.material.uniforms.uA.value = oa < 0 ? 0.8 * seg(t, BRE, DROP - 0.1) : 1.6;
      S.trail.visible = oa > 0 && oa < 1.1; if (S.trail.visible) { S.trail.position.set(ORB[0], ORB[1], ORB[2]); S.trail.material.uniforms.uTr.value.set(3.2 + 4 * c01(oa / 1.1), max(0.01, oy - ORB[1]), 0); S.trail.material.uniforms.uA.value = 2.6 * (1 - c01(oa / 1.1)); }
      us.uJd.value.set(max(0, oa - JB), oa > JB ? 1.8 : 0, 0, 0); S.lan.visible = S.imp.visible = S.spark.visible = oa > JB; us.uJw.value = 1.5;
      lu.uWv.value[0].set(0, 0, TB, t >= TB ? 1.6 : 0); lu.uWv.value[1].set(-1.5, 2.6, DROP + 0.05, t >= DROP + 0.05 ? 2.2 : 0);
      for (let i = 2; i < 6; i++) lu.uWv.value[i].w = 0;
      for (const k of ['inhp', 'star', 'shell', 'spk', 'pglow', 'shock']) S[k].visible = false; for (const m of S.puff) m.visible = false;
      endFx(S, t, { tb, inh, lu, us, flash, fk, oa });
      mirSync(S);
    },
    shots: [
      /* 1 Varselet: kaoset i tomrommet. Kameraet glir sakte inn over virvelen og løfter seg; teksten skrives oppå. */
      [0, (S, u, a, t) => { camK(t, [[0, -16, 8, 60, 8, 5, 0, 54], [5.8, -13, 14, 58, 4, 4, 0, 52], [12, -8, 30, 50, 0, 3, 0, 50], [16, -3, 46, 40, 0, 3, 0, 48], [19, 0, 56, 30, 0, 4, 0, 46]], 0.05 * (1 - seg(t, 10, 17))); S.post.fade = 1 - seg(t, 0, 0.7); }],
      /* 2 Hall of Origin: det siste av kaoset går i spiral inn i punktet, og egget av lys står der med de fem ringene. Det første bildet av ham: stort, og i ro. */
      [H0, (S, u, a, t) => { camK(t, [[H0, 6, 12, 28, 0, 5.6, 0, 42], [22.6, 4, 8.6, 21.5, 0, 5.9, 0, 42], [LIFT[0], 2.2, 7.4, 18, 0, 6, 0, 42]]); S.post.fl = 0.25 * hit(t, 20.5, 0.1); S.post.flc = '#fff2cf'; }],
      /* 3 Løft 1 og 2: høyt over. Ringen legges ned og glasset støpes utover; så tegnes lyslinjene. */
      [LIFT[0], (S, u, a, t) => { camK(t, [[LIFT[0], 18, 15, 26, 0, 3.5, 0, 46], [LIFT[0] + 2.6, 25, 25, 33, 0, 1, 0, 47], [LIFT[1], 30, 36, 39, 0, 0, 2, 48], [LIFT[2], 24, 54, 46, 0, 0, 6, 50]]); S.post.sh = 0.5 * hit(t, LIFT[0] + 0.9, 0.5) + 0.4 * hit(t, LIFT[1] + 0.6, 0.4); }],
      /* 4 Løft 3 og 4: lavt i gangen. Søylene stiger opp gjennom glasset rundt oss; så skytes ringen til himmels, og kosmos tennes fra senit og ned.
         STORT SPRANG (shot4): ringen jager nedover gangen mot oss, og kameraet rygger foran den i samme fart, så parene skyter opp tett på linsa ett etter ett. */
      [LIFT[2], (S, u, a, t) => shot4(S, t)],
      /* 5 Løft 5: ringen brister i de 17 platene, musikken toner ut, og en skikkelse skimtes inni egget; så suget (endCam). */
      [LIFT[4], (S, u, a, t) => endCam(S, t)],
      /* 6 Kamplåta: smellet 49,67 (klipp til gangen), kameraet raser inn, platene slår inn og hjulet smeller (52,87 og 55,67), lunta ovenfra (endCam). */
      [K0, (S, u, a, t) => endCam(S, t)],
      /* 7 Gullet sprenges av, én del per takt: kameraet stiger med kanten, fra hovene til ansiktet, så pusten tett på (shot7n: banen K7 med liv). */
      [HIT[3] - 0.7, (S, u, a, t) => shot7n(S, t)],
      /* 8 Droppet: Judgment. Hoven i glasset, hodet mot himmelen, kula til himmels og regnet av lys over hallen; kameraet glir til kampens bilde, og navnet. */
      [DROP, (S, u, a, t) => { const v = (cam8 = cam8 || camLive(t => pathAt(t, K8()), { t0: DROP, f: 2.0, z: 0.85, amp: [0.05, 0.03], hz: 0.6, seed: 8, tEnd: NAME + 0.6 }))(t); cam(v[0], v[1], v[2], v[3], v[4], v[5], v[6]); mouth(S, DROP, t);
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
  const glint = (S, t) => { const k = seg(t, 19.9, 20.5) * (1 - seg(t, 20.55, 21.6)) + 1.3 * hit(t, BANG, 0.4); if (k < 0.01) return; const q = K.proj(EC[0], EC[1], EC[2]); if (q.z >= 1) return; const g = C.g, L = 26 + 150 * k; g.save(); g.globalCompositeOperation = 'lighter';
    for (const [dx, dy, w] of [[1, 0, 1], [0, 1, 0.8], [0.7, 0.7, 0.35], [0.7, -0.7, 0.35]]) { const gr = g.createLinearGradient(q.x - dx * L * w, q.y - dy * L * w, q.x + dx * L * w, q.y + dy * L * w); gr.addColorStop(0, 'rgba(255,236,190,0)'); gr.addColorStop(0.5, `rgba(255,248,226,${0.9 * k})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(q.x - dx * L * w, q.y - dy * L * w); g.lineTo(q.x + dx * L * w, q.y + dy * L * w); g.stroke(); }
    g.restore(); };
  /* Etterbehandlingen i den nye slutten (stort sprang): suget mørkner kantene; smellet er ett bilde i negativ (støtbildet), så fargesplitt og sterk glød som dør ut;
     hvert slag etterpå (hjulet, gullet, droppet) gir et kort løft i gløden og litt fargesplitt. */
  const endLook = (S, t, P) => { const tb = t - BANG, iq = Math.pow(seg(t, SW[0], BANG), 2), hits = [BOOM[1], BOOM[2], HIT[3], HIT[4], HIT[5], HIT[6], DROP];
    P.vig += 0.42 * iq * (tb < 0 ? 1 : 0); if (tb >= 0 && tb < 0.034) { P.inv = 1; P.grade = Object.assign({}, P.grade || {}, { sat: 0.12 }); }
    const pk = (tb >= 0 ? Math.exp(-tb * 3.2) : 0) + hits.reduce((q, h) => q + 0.45 * hit(t, h, 0.5), 0) + (t >= DROP + JB ? 0.8 * Math.exp(-(t - DROP - JB) * 2.5) : 0);
    P.bloom += 0.42 * min(1, pk); P.rgb = 2.6 * (tb >= 0 ? Math.exp(-tb * 5) : 0) + 1.2 * hits.reduce((q, h) => q + hit(t, h, 0.22), 0); };
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
  X.snd.apil = v => { if (hasT()) tone(v ? 58 : 82, 0, v ? 0.7 : 0.35, v ? 0.07 : 0.04, 'sine', v ? 34 : 50); return v ? [70, 20, 110] : [40]; };   /* stort sprang: søylene skyter opp (v = en hel ring samlet) */
  X.snd.aring = k => { if (!bedOn() && typeof swellN === 'function') swellN(0, 1.1, 0.035 + 0.01 * (k || 0), 500, 3200); if (hasT()) tone(220 * Math.pow(1.122, [0, 2, 4, 7, 9][k || 0]), 0.02, 1.4, 0.022, 'sine'); return [15, 30, 15]; };
  /* Slutten: aplate = platene slår inn (52,47 og det tredje suget 55,25), abang = smellet, aboom = hjulet smeller, afuse = lunta (ett lite tikk per typemerke). */
  X.snd.aplate = () => { pks('Light Screen', 0.2, { len: 1.1, fade: 0.6 }); return [14, 36, 14, 36, 14, 36, 14, 36, 14, 36, 14, 36, 14, 36, 14]; };
  X.snd.abang = () => { pks('Cosmic Power', 0.34, { len: 2.4, fade: 1.3 }); if (hasT()) tone(72, 0, 1.3, 0.1, 'sine', 36); return [130, 30, 70, 30, 220]; };
  X.snd.aboom = v => { if (hasT()) tone(v ? 62 : 70, 0, 0.9, 0.08, 'sine', 34); return v ? [90, 30, 170] : [70, 30, 110]; };
  X.snd.afuse = j => { if (hasT()) tone(392 * Math.pow(2, (j || 0) / 12), 0, 0.12, 0.014, 'sine'); return [8]; };
  X.snd.agold = k => { pks('Power Gem', 0.13, { off: 0.2, len: 0.9, fade: 0.5, rate: 0.9 + 0.08 * (k || 0) }); return [45, 20, 70]; };
  X.snd.ajdg = () => { pks('Judgment', 0.55, { len: 3.4, fade: 1.6 }); if (hasT()) tone(55, 0, 0.9, 0.12, 'sine', 30); return [90, 40, 260]; };
  /* Lyset som slår ned ved oss følger fingeren og ligger derfor ikke i sengen. Med Hold: skjoldlyden (tre varianter i fila, 2 s fra hverandre). Uten: et lite dunk. */
  X.snd.ahit = i => { const hd = !!G3D.hold; if (hd && typeof c3p === 'function' && c3p('Arceus Shield', 0.5, { off: (i % 3) * 2, len: 1.4, fade: 0.3 })) return [50, 30, 70];
    if (typeof noise === 'function') noise(0, 0.28, hd ? 0.03 : 0.05, 900, 120); if (typeof tone === 'function') tone(hd ? 392 : 70, 0, hd ? 0.5 : 0.3, hd ? 0.03 : 0.06, 'sine', hd ? 784 : 40); return hd ? [50, 30, 70] : [25]; };
  X.sfx.push('Wish', 'Light Screen', 'Cosmic Power', 'Power Gem', 'Judgment', 'Arceus Shield');
  X.reg('c3:493', { spid: 493, skin: SKIN, roar: () => DROP,
    cues: [[20.5, 'aegg']].concat(LIFT.map((L, i) => [L, 'aring', i]), [34, 62.5].map(r => [L2 + 0.3 + r / VP, 'apil', 1]), [48, 59, 70, 81, 92, 103, 114].map(z => [L2 + 0.3 + hyp(15, z) / VP, 'apil', 0]), [[BANG, 'abang'], [HIT[1], 'aplate'], [BOOM[1], 'aboom', 0], [SW[2], 'aplate'], [BOOM[2], 'aboom', 1]], Array.from({ length: 18 }, (_, j) => [FU(j), 'afuse', j]), [3, 4, 5, 6].map((k, i) => [HIT[k], 'agold', i]), [[DROP, 'ajdg'], [DROP, 'cry']], NEAR.map((h, i) => [h[2], 'ahit', i])),
    look(S, t, P) { P.bloom = 0.3; P.bloomT = 0.76; P.vig = 0.36; P.vigc = '#04030c'; P.grain = 0.03; },
    over: (x, t, o) => X.plate(x, t - NAME, Object.assign({ name: 'Arceus', lv: 80, cap: 'The Original One' }, o, { skin: SKIN, cap: 'The Original One' })),
    fx(S, t, P) { omenFx(t); holdFx(S, t); glint(S, t); endLook(S, t, P); if (P.shock) for (const q of P.shock) q.a *= 0.3; if (P.bulge) P.bulge.a *= 0.4;   /* lydbølgene bøyde de rette søylene som gummi */ const hd = S.hd || 0; if (hd > 0.01) { P.bloom *= 1 - 0.3 * hd; P.vig += 0.12 * hd; } } });

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
  /* LØFTET, bevegelsen (Opus 25.11): han står som i kampen, senker hodet mens hallen avskapes, løfter blikket mot platen i pusten (og hoven), slår i glasset på løftet med
     tre frosne bilder, kaster hodet mot himmelen og står som i kampen igjen. Posene: L1 kampstillingen · L2 hodet senket · L3 mot platen, hoven opp · L4 slaget ·
     L5 mot himmelen · L6 kampstillingen. Kameraene får liv som i introen (inn fra kampens bilde og ut igjen til det). */
  const LQ = t => { const L = liveH(t, 47), lv = 1 - 0.85 * seg(t, PL - 1.1, PL - 0.8) * (1 - seg(t, PL + 0.8, PL + 1.4));
    return { b: 0, bh: 0,
    n: kf(t, [[0.4, 0.03], [2.6, 0.18], [PL - 1.05, 0.23], [PL - 0.5, 0.05], [PL - 0.2, 0.08], [PL - 0.04, 0.11], [PL + 0.1, 0.11], [PL + 0.5, -0.14], [PL + 1.4, -0.09], [PL + 1.6, -0.09], [PL + 2.4, 0.03]]),
    h: kf(t, [[0.4, 0.06], [2.6, 0.24], [PL - 1.05, 0.28], [PL - 0.5, 0.3], [PL - 0.2, 0.22], [PL - 0.04, 0.24], [PL + 0.1, 0.24], [PL + 0.42, -0.08], [PL + 1.4, -0.02], [PL + 1.6, -0.02], [PL + 2.35, 0.06]]) + 1.3 * L[0] * lv,
    y: kf(t, [[0.4, -0.4], [2.6, -0.15], [PL - 1.05, 0.12], [PL - 0.5, 0], [PL + 0.1, 0], [PL + 0.5, -0.45], [PL + 1.4, -0.45], [PL + 2.0, -0.3], [PL + 2.6, -0.4]]) + L[1] * lv,   /* i holdet følger blikket platene rundt ham */
    c: kf(t, [[PL - 1.0, 0], [PL - 0.45, -0.04], [PL - 0.2, -0.04], [PL, 0.03, ei], [PL + 0.1, 0.03], [PL + 0.5, -0.02], [PL + 2.4, 0]]) - 0.013 * brV(t, 0.3, 3.0, 53) }; };
  const MVL = mover(LQ, { t0: 0, hits: [PL], mane: 0, tail0: 0,
    hoof: t => kf(t, [[PL - 1.0, 0], [PL - 0.45, 1.07], [PL - 0.3, 1], [PL - 0.21, 1], [PL, 0, ei]]),
    tail: t => [kf(t, [[0.4, 0.04], [2.6, -0.02], [PL - 0.4, -0.03], [PL + 0.1, -0.03], [PL + 0.6, 0.14], [PL + 1.5, 0.12], [PL + 2.7, 0.04]]) + 0.025 * X.noise(t, 39, 0.4),
      0.07 * X.noise(t, 37, 0.45) + kf(t, [[PL + 0.1, 0], [PL + 0.6, 0.07], [PL + 1.6, 0.03], [PL + 2.7, 0]])],
    jolt: t => { const a = t - PL; return a < 0 || a > 0.26 ? 0 : -0.09 * Math.pow(sin(PI * a / 0.26), 2); } });
  let camL = null; const KL = () => { const tg = camEnd(), cp = CAMB.cp; return [[[0, cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv], [2.6, -8.6, 3.6, 28, -2, 5.4, 0, 36], [PL - 0.75, -6.4, 3.2, 20, 0, 5.2, 0, 38]],
    [[PL, -6.2, 1.1, 14, 0, 7.5, 0, 56], [PL + 0.7, -7, 1.5, 17, 0, 9, 0, 56], [PL + 2.3, cp[0], cp[1], cp[2], tg[0], tg[1], tg[2], CAMB.fv]]]; };
  const camLift = (k, t) => { if (!camL) camL = [camLive(t => pathAt(t, KL()[0]), { t0: 0, f: 1.8, amp: [0.05, 0.03], seed: 11, tIn: 0 }),
      camLive(t => { const u = seg(t, PL - 0.75, PL); return [mix(-3.4, -3.1, u), 5.5, mix(12.2, 11.4, u), 0, 5.3, 1.6, 34]; }, { t0: PL - 0.75, f: 2.4, amp: [0.025, 0.015], seed: 12 }),
      camLive(t => pathAt(t, KL()[1]), { t0: PL, f: 2.0, amp: [0.05, 0.03], seed: 13, tEnd: PL + 2.3 })];
    const v = camL[k](t); cam(v[0], v[1], v[2], v[3], v[4], v[5], v[6]); };
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
      { const A = MVL.at(t); poseN(S, g, S.rg, A); poseN(S, S.rf, S.rrg, A); } setCoat(S, 0, -99); g.set('uStone', 0); g.eye(0, 0, 0.4);
      if (re) tySet(S, tex); else if (S.texOn) tySet(S, S.tex0);
      g.set('uFlK', max(0.85 * hit(t, PL, 0.16), 0.3 * hit(t, PL, 0.5))); g.set('uFlC', t < PL + 0.1 ? '#ffffff' : tc);
      lu.uWv.value[0].set(-1.5, 2.6, PL + 0.05, t >= PL + 0.05 ? 1.6 : 0);
      mirSync(S);
    },
    shots: [
      /* 1 Fra kampens bilde og inn mot ham, mens hallen blir borte rundt ham. */
      [0, (S, u, a, t) => { camLift(0, t); S.post.sh = 0.5 * seg(t, 1.6, 5) ; }],
      /* 2 Pusten: tett på ham og den ene platen. Alt annet er tomrom. */
      [PL - 0.75, (S, u, a, t) => camLift(1, t)],
      /* 3 Løftet: lavt og vidt. Hoven i glasset, og hallen skapes på nytt i platens farge; kameraet glir til kampens bilde, og typen står på skiltet. */
      [PL, (S, u, a, t) => { camLift(2, t); mouth(S, PL, t);
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
