'use strict';
/* Fokusdex – skjermene. Hver fane tegnes på nytt fra tilstanden (S) når noe endres; fokusklokka og fangstmåleren oppdaterer bare sine egne elementer. */

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nb = n => Math.round(n).toLocaleString('en-US');
/* Tid vises som timer og minutter («4 h 20 min», «45 min», «6 h»), aldri som desimaltimer: 4,3 t er vanskelig å regne med. */
const hm = m => { m = Math.max(0, Math.round(m || 0)); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };

/* ---------- Bilder ----------
   Appen inneholder ingen bilder av Pokémon. De hentes fra PokeAPI sitt åpne bildearkiv når appen brukes (med Showdown som reserve) og mellomlagres på enheten. */
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
const PLTINT = [null, [-50, 0.85], [165, 0.55], [256, 0.9], [-12, 0.65], [0, 0.4], [28, 1], [228, 0.85], [170, 0.15], [-38, 1.3], [168, 1.1], [62, 1], [8, 1.5], [-72, 1.1], [138, 0.75], [203, 1.3], [215, 0.25], [-88, 0.7]];
const slug = id => D(id)[0].toLowerCase().replace('♀', 'f').replace('♂', 'm').replace(/[^a-z0-9]/g, '');
function spr(id, o = {}) {
  /* sh: 1 = shiny, 2 = den mørke varianten (Dark Mewtwo): vanlig bilde som farges om når det er lastet (dkPaint). */
  if (o.sh === 2 && !o.sil) { const u = `${SPR}pokemon/${o.back ? 'back/' : ''}${id}.png`; if (o.urls) return [u + '?c=1']; return `<span class="sprb dark" style="--tc:var(--t${D(id)[1]})${o.s ? ';--s:' + o.s : ''}" data-n="${id}"><img class="spr" alt="Dark ${esc(D(id)[0])}" crossorigin="anonymous" ${DKC.get(u) ? `src="${DKC.get(u)}" data-dk="1"` : `src="${u}?c=1"`} data-u="${u}" onload="dkPaint(this)" onerror="dkErr(this)"></span>`; }
  const shn = o.sh === 1;
  const sd = `https://play.pokemonshowdown.com/sprites/${shn ? 'gen5-shiny' : 'gen5'}/${slug(id)}.png`;
  const png = `${SPR}pokemon/${shn ? 'shiny/' : ''}${id}.png`;
  const gif = `${SPR}pokemon/versions/generation-v/black-white/animated/${shn ? 'shiny/' : ''}${id}.gif`;
  const bk = `${SPR}pokemon/versions/generation-v/black-white/animated/back/${shn ? 'shiny/' : ''}${id}.gif`, bkp = `${SPR}pokemon/back/${shn ? 'shiny/' : ''}${id}.png`;
  const mgE = o.mega ? MEGA[o.mega - 1] : null, mg = mgE ? mgE[5] : 0, sdir = shn ? 'shiny/' : '', ANI = `${SPR}pokemon/versions/generation-v/black-white/animated/`;
  const list = mg ? (o.back ? (mgE[6] ? [`${ANI}back/${sdir}${mg}.gif`] : []).concat([`${SPR}pokemon/back/${sdir}${mg}.png`, `${SPR}pokemon/${sdir}${mg}.png`]) : (mgE[6] && o.ani ? [`${ANI}${sdir}${mg}.gif`] : []).concat([`${SPR}pokemon/${sdir}${mg}.png`])) : o.back ? [bk, bkp, `https://play.pokemonshowdown.com/sprites/${shn ? 'gen5-back-shiny' : 'gen5-back'}/${slug(id)}.png`, png] : o.ani ? [gif, png, sd] : [png, sd];
  if (o.urls) return list;
  /* Arceus skifter farge etter plata den holder: gullet i ringen dreies mot typens farge (PLTINT: grader og metning). */
  const pt = id === ARCEUS && o.it && HELD[o.it] && HELD[o.it].ty != null && !o.sil ? PLTINT[HELD[o.it].ty] : null;
  return `<span class="sprb${o.sil ? ' sil' : ''}${shn && !o.sil ? ' shiny' + (id === ARCEUS ? ' gsh' : '') : ''}${pt ? ' plt' : ''}" style="--tc:var(--t${pt ? HELD[o.it].ty : D(id)[1]})${o.s ? ';--s:' + o.s : ''}${pt ? `;--pf:hue-rotate(${pt[0]}deg) saturate(${pt[1]})` : ''}" data-n="${id}"><img class="spr" alt="${o.sil ? 'Unknown' : esc(D(id)[0])}" ${o.lazy ? 'loading="lazy" ' : ''}src="${list[0]}" data-f="${list.slice(1).join('|')}" onload="this.classList.add('ok')" onerror="sprErr(this)"></span>`;
}
/* Henter bildet av en Pokémon på forhånd, så det står klart i det den sendes ut (ellers dukker den opp et øyeblikk etter ballen).
   Prøver adressene i samme rekkefølge som spr(). Gir et løfte som blir ferdig når bildet er hentet (eller ikke finnes). */
const PRESPR = new Map();
function preSpr(id, o = {}) {
  const l = spr(id, Object.assign({}, o, { urls: 1 })), k = l[0]; if (PRESPR.has(k)) return PRESPR.get(k);
  const p = new Promise(res => { let i = 0; const im = new Image(); if (o.sh === 2) im.crossOrigin = 'anonymous'; im.onload = () => res(true); im.onerror = () => { i++; if (i < l.length) im.src = l[i]; else res(false); }; im.src = l[0]; });
  PRESPR.set(k, p); if (PRESPR.size > 60) PRESPR.delete(PRESPR.keys().next().value);
  return p;
}
/* Den mørke varianten: bildet tegnes på et lerret, farges om piksel for piksel (CINE.darken) og settes tilbake som bilde. Resultatet huskes per adresse.
   Kan ikke pikslene leses, vises det vanlige bildet mørklagt i stedet. */
const DKC = new Map();
window.dkPaint = img => {
  if (img.dataset.dk) return img.classList.add('ok'); img.dataset.dk = '1';
  try { const c = document.createElement('canvas'), x = c.getContext('2d'); c.width = img.naturalWidth; c.height = img.naturalHeight; x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height); CINE.darken(d.data); x.putImageData(d, 0, 0); const u = c.toDataURL(); DKC.set(img.dataset.u, u); img.src = u; }
  catch (_) { img.classList.add('dkf', 'ok'); }
};
window.dkErr = img => { if (img.dataset.e) { img.parentNode.classList.add('noimg'); return img.remove(); } img.dataset.e = '1'; img.dataset.dk = '1'; img.removeAttribute('crossorigin'); img.classList.add('dkf'); img.src = img.dataset.u; };
window.sprErr = img => {
  const f = (img.dataset.f || '').split('|').filter(Boolean);
  if (f.length) { img.dataset.f = f.slice(1).join('|'); img.src = f[0]; }
  else { img.parentNode.classList.add('noimg'); img.remove(); }
};
const ballEl = (k, s) => `<img class="ball im" style="--bc:${SHOP[k].bc}${s ? ';--s:' + s : ''}" alt="" src="${SPR}items/${SHOP[k].img}.png" onerror="this.classList.remove('im');this.removeAttribute('src')">`;
/* Bildet av en gjenstand som kan holdes (fra samme arkiv som ballene). */
const heldEl = (k, s) => `<img class="ball im" style="--bc:${HELD[k].ty != null ? `var(--t${HELD[k].ty})` : HELD[k].res != null ? `var(--t${HELD[k].res})` : 'var(--ink3)'}${s ? ';--s:' + s : ''}" alt="" src="${SPR}items/${HELD[k].img}.png" onerror="this.classList.remove('im');this.removeAttribute('src')">`;
const types = id => { const d = D(id); return [d[1], d[2]].filter(t => t >= 0).map(t => `<span class="ty" style="background:var(--t${t})">${TYN[t]}</span>`).join(' '); };
const tierEl = id => { const t = tierOf(id); return `<span class="tier r${t}">${TIERS[t]}</span>`; };
const short = n => n.length > 5 ? n.slice(0, 4) : n;
const coinEl = n => `<span class="coin tn"><i></i>${nb(n)}</span>`;
/* Kjønnssymbolet, slik det står ved navnet i spillene (blått ♂, rødt ♀, ingenting for dem uten kjønn). */
const gs = m => m && m.g < 2 ? `<i class="gx g${m.g}" aria-label="${m.g ? 'female' : 'male'}">${GSYM[m.g]}</i>` : '';

/* ---------- Lyd: små egne pip, ingen spillmusikk ---------- */
/* Lyden blandes med musikk du har på, og følger lydløs-bryteren på iPhone (Safari 16.4+). */
try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (_) {}
let AC = null;
function ac() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state !== 'running') AC.resume(); return AC; } catch (_) { return null; }
}
/* Effektene går gjennom én hovedvolumknapp (S.vol). Skrikene har sin egen (S.cvol). */
let MG = null, NB = null, BUS = null;
/* LYDGRAFEN (steg 1.12, ønske 14). Musikken og effektene går hver sin vei til høyttaleren:
     musikk (master()) ──────────────► mus: takhøyde (MUSTRIM) ─────────────────────────┐
     effekter (out()) og skrik ──► fx: begrenser bare for dem (FXDB) ──► FXTRIM ────────┴─► sum: myk klipper ──► høyttaleren
   Før gikk alt gjennom én begrenser like under full styrke. Musikken ligger nær full styrke, så hvert angrep og hvert skrik presset ned hele
   summen, også musikken, og slapp den opp igjen: den dukket og pumpet. Nå rører ingen begrenser musikken. Effektene holdes nede av sin egen
   (under terskelen går de urørt gjennom: forsterkningen noden legger på selv, er tatt bort igjen), og summen har så god plass at den myke
   klipperen bare runder av de korteste toppene. Klipperen har ingen hukommelse, så den kan ikke pumpe.
   busFor(ctx) bygger grafen, så testene kan lage den samme i en OfflineAudioContext og måle den (pw/t_lyd.js). */
const MUSTRIM = 0.8, FXTRIM = 0.8, FXDB = -7, FXRATIO = 20, SUMKNEE = 0.86, SUMIN = 2;
/* Myk klipper: rett linje opp til SUMKNEE, så en myk bue mot 1. Kurven dekker inngang fra −SUMIN til SUMIN. */
function softCurve() {
  const n = 8193, c = new Float32Array(n), k = SUMKNEE;
  for (let i = 0; i < n; i++) { const x = (i / (n - 1) * 2 - 1) * SUMIN, a = Math.abs(x), y = a <= k ? a : k + (1 - k) * Math.tanh((a - k) / (1 - k)); c[i] = x < 0 ? -y : y; }
  return c;
}
function busFor(a) {
  const pre = a.createGain(), sum = a.createWaveShaper(); pre.gain.value = 1 / SUMIN; sum.curve = softCurve(); sum.oversample = '2x'; pre.connect(sum); sum.connect(a.destination);
  const mus = a.createGain(); mus.gain.value = MUSTRIM; mus.connect(pre);
  /* Begrenseren legger selv på forsterkning etter terskelen og forholdet (full styrke inn gir T·(1 − 1/R) dB ut, og noden løfter alt med
     den inverse opphøyd i 0,6). Den tas bort igjen her, så en lyd under terskelen går gjennom akkurat som den er. */
  const fx = a.createDynamicsCompressor(), fg = a.createGain(), mk = Math.pow(1 / Math.pow(10, FXDB * (1 - 1 / FXRATIO) / 20), 0.6);
  fx.threshold.value = FXDB; fx.knee.value = 0; fx.ratio.value = FXRATIO; fx.attack.value = 0.002; fx.release.value = 0.1; fg.gain.value = FXTRIM / mk; fx.connect(fg); fg.connect(pre);
  return { mus, fx, sum, pre };
}
function bus() { const a = ac(); if (!a) return null; if (!BUS) { try { BUS = busFor(a); } catch (_) { BUS = { mus: a.destination, fx: a.destination }; } } return BUS; }
/* Musikken (music.js og pack.js) kobler seg til master(). Effektene går til out(), og skrikene rett til fxBus(). */
function master() { const b = bus(); return b ? b.mus : null; }
function fxBus() { const b = bus(); return b ? b.fx : null; }
function out() { SNDP = 1; const a = ac(); if (!a) return null; if (!MG) { MG = a.createGain(); MG.connect(fxBus() || a.destination); } MG.gain.value = Math.pow((S.vol == null ? 70 : S.vol) / 100, 1.6) * 2.13; return MG; }
/* Lydstyrken (K-vektet som i LUFS-målinger) i det sterkeste 400 ms-vinduet av en dekodet lyd. Brukes til å holde angrepslyder og skrik på
   nivå med musikken, uansett hvor sterkt filene er tatt opp. Regnes én gang per lyd. */
function loudOf(buf) {
  if (buf._lk != null) return buf._lk;
  try {
    const fs = buf.sampleRate, n = buf.length, H = Math.max(1, Math.round(fs * 0.05)), k = 8, nb = Math.ceil(n / H), e = new Float64Array(nb + 1);
    let K = Math.tan(Math.PI * 1681.974450955533 / fs), Q = 0.7071752369554196, a0 = 1 + K / Q + K * K; const Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    const b0 = (Vh + Vb * K / Q + K * K) / a0, b1 = 2 * (K * K - Vh) / a0, b2 = (Vh - Vb * K / Q + K * K) / a0, a1 = 2 * (K * K - 1) / a0, a2 = (1 - K / Q + K * K) / a0;
    K = Math.tan(Math.PI * 38.13547087602444 / fs); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K; const c1 = 2 * (K * K - 1) / a0, c2 = (1 - K / Q + K * K) / a0;
    const chs = Math.min(2, buf.numberOfChannels);
    for (let c = 0; c < chs; c++) {
      const x = buf.getChannelData(c); let x1 = 0, x2 = 0, y1 = 0, y2 = 0, u1 = 0, u2 = 0, z1 = 0, z2 = 0;
      for (let i = 0; i < n; i++) {
        const xi = x[i], y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = y;
        const z = y - 2 * u1 + u2 - c1 * z1 - c2 * z2; u2 = u1; u1 = y; z2 = z1; z1 = z;
        e[(i / H) | 0] += z * z;
      }
    }
    let best = 0, run = 0;
    for (let i = 0; i < nb; i++) { run += e[i]; if (i >= k) run -= e[i - k]; if (run > best) best = run; }
    /* En monolyd spilles i begge høyttalerne, så den teller dobbelt. */
    const ms = best * (chs === 1 ? 2 : 1) / (H * k);
    return (buf._lk = ms > 1e-12 ? -0.691 + 10 * Math.log10(ms) : -99);
  } catch (_) { return (buf._lk = -99); }
}
/* SFXT krymper tidene i de innebygde lydene (1 = som skrevet). Kampen setter den lavere i FAST, så lydene blir like raske som animasjonene. */
let SFXT = 1;
/* f2: tonen glir mot f2 i løpet av d sekunder. */
function tone(f, at, d, v = 0.05, type = 'square', f2 = 0) {
  if (!S.sound) return;
  try {
    const m = out(); if (!m) return;
    at *= SFXT; d *= SFXT;
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.015, d * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(m); o.start(t); o.stop(t + d + 0.02);
  } catch (_) {}
}
/* Støy gjennom et båndpassfilter som glir fra f1 til f2: kast, sus og smell. */
function noise(at, d, v = 0.05, f1 = 2400, f2 = 500) {
  if (!S.sound) return;
  try {
    const m = out(); if (!m) return;
    at *= SFXT; d *= SFXT;
    if (!NB) { NB = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime + at;
    s.buffer = NB; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, d * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(m); s.start(t); s.stop(t + d + 0.05);
  } catch (_) {}
}
const seq = (notes, step, d, v, type) => notes.forEach((f, i) => tone(f, i * step, d, v, type));
/* Egne lyder i Gen 5-stil: korte pulsbølger, raske arpeggioer og litt støy. Hver type trykk har sin egen lyd. */
const sfx = {
  tap: () => tone(520, 0, 0.05, 0.03),
  tab: () => { tone(1047, 0, 0.035, 0.03); tone(1568, 0.035, 0.05, 0.025); },
  chip: () => { tone(880, 0, 0.03, 0.03); tone(1320, 0.02, 0.02, 0.015, 'triangle'); },
  open: () => { tone(660, 0, 0.04, 0.03); tone(990, 0.04, 0.06, 0.03); },
  close: () => { tone(784, 0, 0.04, 0.03); tone(523, 0.04, 0.06, 0.03); },
  ok: () => seq([1047, 1319, 1568], 0.05, 0.06, 0.035),
  warn: () => { tone(330, 0, 0.08, 0.04); tone(330, 0.11, 0.08, 0.04); },
  fav: () => seq([1568, 2093, 2637], 0.04, 0.05, 0.02, 'triangle'),
  ball: () => { tone(1400, 0, 0.015, 0.025); tone(700, 0.02, 0.04, 0.025, 'triangle'); },
  start: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.09, 0.12)),
  done: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2, 0.06, 'triangle')),
  event: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.22, 0.05, 'triangle')); tone(1568, 0.58, 0.5, 0.04, 'square'); tone(784, 0.58, 0.6, 0.04, 'triangle'); },
  found: () => { tone(880, 0, 0.07); tone(1175, 0.08, 0.09); },
  rustle: () => { noise(0, 0.18, 0.02, 1800, 5200); noise(0.24, 0.14, 0.016, 2200, 6000); },
  appear: () => { for (let i = 0; i < 10; i++) tone(i % 2 ? 330 + i * 40 : 1320 - i * 60, i * 0.035, 0.04, 0.03); noise(0.35, 0.3, 0.025, 600, 3000); },
  thr: () => { noise(0, 0.28, 0.05, 3500, 500); tone(600, 0.05, 0.22, 0.02, 'triangle', 220); },
  wob: n => { tone(170 + (n || 0) * 25, 0, 0.07, 0.06, 'triangle'); tone(2400, 0, 0.012, 0.02); },
  got: () => { tone(1800, 0, 0.02, 0.04); seq([659, 784, 988, 1319], 0.1, 0.22, 0.06, 'triangle'); },
  fail: () => { noise(0, 0.12, 0.06, 1800, 3500); tone(500, 0.02, 0.14, 0.04, 'square', 1200); },
  flee: () => { noise(0, 0.35, 0.04, 2500, 400); tone(700, 0, 0.35, 0.03, 'triangle', 140); },
  coin: () => { tone(988, 0, 0.06); tone(1319, 0.06, 0.12); },
  rank: () => { seq([784, 988, 1175, 1568], 0.09, 0.16, 0.045, 'triangle'); noise(0.45, 0.16, 0.09, 420, 110); tone(110, 0.45, 0.18, 0.07, 'triangle', 60); tone(2093, 0.64, 0.45, 0.028, 'triangle'); tone(1568, 0.64, 0.45, 0.028, 'triangle'); },
  sell: () => { tone(1319, 0, 0.05); tone(988, 0.05, 0.05); tone(1568, 0.11, 0.14, 0.04, 'triangle'); },
  lvl: () => seq([784, 988, 1175, 1568], 0.08, 0.12, 0.045, 'triangle'),
  hatch: () => { noise(0, 0.15, 0.05, 900, 2500); seq([1047, 1319, 1568, 2093], 0.07, 0.1, 0.04, 'triangle'); },
  evo: () => [392, 494, 587, 784, 988, 1175].forEach((f, i) => tone(f, i * 0.11, 0.2, 0.06, 'triangle')),
  /* Battle Frontier (steg 1c.3): oppbyggingen før en sjelden ball, smellet når en ball åpnes (n = vurderingen 1–5: jo bedre, jo fyldigere;
     k = 'sh' | 'ace' | 'leg' | 'mega' får sin egen fanfare), og glitteret når en shiny viser seg (shinyFx). */
  frise: () => { for (let i = 0; i < 10; i++) tone(196 * Math.pow(1.122, i), i * 0.12, 0.11, 0.028 + i * 0.003, 'triangle'); },
  fpop: (n, k) => { noise(0, 0.14, 0.06, 900, 4200); if (k === 'mega') return sfx0.evo(); if (k) { seq([659, 880, 1109, 1319, 1760], 0.07, 0.16, 0.05, 'triangle'); tone(2637, 0.4, 0.5, 0.03, 'triangle'); tone(1319, 0.4, 0.6, 0.03); return; } seq([[784, 1047], [784, 1047], [880, 1175], [880, 1175, 1397], [988, 1319, 1568, 1976]][Math.max(0, Math.min(4, (n || 1) - 1))], 0.06, 0.09, 0.04, 'triangle'); },
  shiny: () => { [2093, 2637, 3136, 2637, 3520].forEach((f, i) => tone(f, i * 0.06, 0.09, 0.03, 'triangle')); tone(4186, 0.34, 0.35, 0.02, 'sine'); },
  /* Øyeblikk som har sin egen fanfare i pakken. Uten pakke låter de som den nærmeste av lydene over. */
  caught: () => sfx0.got(), evolved: () => sfx0.evo(), item: () => sfx0.ok(), keyitem: () => sfx0.fav(), berry: () => sfx0.ok(), egg: () => sfx0.ok(), learn: () => sfx0.lvl(), heal: () => sfx0.ok(), saved: () => sfx0.ok()
};
/* sfx0 = de innebygde lydene. Har pakken en lyd med samme navn (PACK.sys), spilles den i stedet. */
const sfx0 = Object.assign({}, sfx);
for (const k of Object.keys(sfx)) sfx[k] = (...a) => { if (!(S.sound && typeof PACK !== 'undefined' && PACK.sys && PACK.sys(k))) sfx0[k](...a); };
/* Pokémon-skrik: lydfilene fra Black/White-tiden i PokeAPI sitt åpne lydarkiv (nyere skrik som reserve). Hentes første gang og mellomlagres. */
const CRY = new Map();
function cryBuf(id) {
  if (CRY.has(id)) return CRY.get(id);
  const get = kind => fetch(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/${kind}/${id}.ogg`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(b => new Promise((res, rej) => ac().decodeAudioData(b, res, rej)));
  const p = get('legacy').catch(() => get('latest'));
  p.catch(() => CRY.delete(id));
  CRY.set(id, p);
  if (CRY.size > 80) CRY.delete(CRY.keys().next().value);
  return p;
}
window.cryCount = 0;
const CRYDEEP = 0.78;   /* hvor langt ned brølet legges i cutscenene (1 = uendret) */
/* deep: brølet i cutscenene (Jazz 18.11): lagt ned i tonehøyde, med mer bass og et lag en oktav under. I kampen brukes det vanlige. */
function cry(id, delay = 0, vol = 0.45, deep = 0) {
  if (!S.sound || !S.cries || !id || !ac()) return;
  const t0 = performance.now();
  cryBuf(id).then(buf => {
    const a = ac(), src = a.createBufferSource(), g = a.createGain();
    /* Skrikene er tatt opp med svært ulik styrke (de nyeste er mye sterkere enn de eldste), så hvert skrik jevnes til samme nivå før volumet legges på. */
    const L = loudOf(buf), norm = L > -90 ? Math.max(0.12, Math.min(2, Math.pow(10, (-18 - L) / 20))) : 0.4;
    src.buffer = buf; g.gain.value = Math.min(1.6, vol * norm * Math.pow((S.cvol == null ? 70 : S.cvol) / 100, 1.6) * 4.27); g.connect(fxBus() || a.destination);
    const at = a.currentTime + Math.max(0, delay - (performance.now() - t0)) / 1000;
    if (deep) { const lo = a.createBiquadFilter(), hi = a.createBiquadFilter(), sub = a.createBufferSource(), lp = a.createBiquadFilter(), sg = a.createGain();
      lo.type = 'lowshelf'; lo.frequency.value = 240; lo.gain.value = 8; hi.type = 'lowpass'; hi.frequency.value = 5200; src.playbackRate.value = CRYDEEP; src.connect(lo); lo.connect(hi); hi.connect(g);
      sub.buffer = buf; sub.playbackRate.value = CRYDEEP / 2; lp.type = 'lowpass'; lp.frequency.value = 300; sg.gain.value = 1.2; sub.connect(lp); lp.connect(sg); sg.connect(g); sub.start(at); g.gain.value *= 0.85; }
    else src.connect(g);
    src.start(at);
    window.cryCount++;
  }).catch(() => {});
}
/* LYD PER TRYKK (steg 1.12). Ett trykk gir én lyd, og lyden sier hva som skjedde:
     tap   en vanlig knapp                  tab   en annen fane, eller neste kort
     chip  et valg eller en bryter          open  et ark eller en meny åpnes (ett nivå inn)
     close lukk, tilbake, nei takk          ok    bekreftet og lagret
     warn  en advarsel, første trykk på «Tap again», og når knappen sier nei
   SND gir lyden for hver handling (ellers tap). Trykket spilles etter handlingen: har handlingen selv spilt en lyd (SNDP settes i out()),
   faller trykklyden bort, så ingenting blir dobbelt. En handling kan si fra selv med snd('warn') eller snd('') (stille).
   OWN = handlinger som skal være stille når de ikke spiller noe med en gang (kampen, kastet og filmene har sine egne lyder litt etter). */
const OWN = new Set(['wkisle', 'wkout', 'wkskip', 'wkintok', 'wkshgo', 'wkshdl', 'wkshtx', 'wkgo', 'wkdo', 'wkpick', 'wkdoor', 'wkstop', 'wkcpb', 'wkbagu', 'wksnag', 'wkpun', 'wkchest', 'wkchall', 'wkmintok', 'wkcap', 'evpick', 'mgive', 'triv', 'trev', 'start', 'throw', 'buy', 'buy10', 'pack', 'pkopen', 'pkflip', 'pkhunt', 'evolve', 'sestart', 'sound', 'hunt', 'cries', 'candy', 'selldupes', 'sell', 'bmove', 'bsw', 'bgo', 'fgo', 'bdone', 'btap', 'music', 'lforget', 'tgive', 'tskip', 'fenter', 'fpick', 'mopen', 'msel', 'mgo', 'evinfo', 'lresume', 'lgive', 'lgiveo', 'buse', 'btypes', 'honyes', 'clkagain', 'help', 'tour', 'tourend', 'swopen', 'swtap', 'swundo', 'swnext', 'fstats', 'achget', 'achall', 'sbxsnd', 'held', 'heldgive', 'heldoff', 'heldshop', 'heldbuy', 'form', 'tswp', 'tswgo', 'pkrel', 'early', 'bforfeit', 'bmega', 'berry', 'showfilm', 'tutteach', 'tutlearn']);
const SND = {
  /* Faner og sider */
  tab: 'tab', lagv: 'tab', dexr: 'tab', sbxtab: 'tab', shopt: 'tab', pknext: 'tab', tourgo: 'tab', toshop: 'tab', bteam: 'tab', sbxsounds: 'tab',
  /* Valg og brytere */
  fag: 'chip', min: 'chip', reg: 'chip', sort: 'chip', sety: 'chip', extog: 'chip', sbxr: 'chip', sbxo: 'chip', pktog: 'chip', look: 'chip', hfx: 'chip', hty: 'chip', rdet: 'chip',
  stknow: 'chip', stdiff: 'chip', streg: 'chip', seopen: 'chip', know: 'chip', helpmore: 'chip', trsel: 'chip', bxg: 'chip', bxf: 'chip', dupt: 'chip', tord: 'chip', cmp: 'chip', cmpick: 'chip',
  tsws: 'chip', mvinfo: 'chip', mvtog: 'chip', pause: 'chip', pick: 'chip', smore: 'chip', adm: 'chip', fsnd: 'chip', lang: 'chip', diff: 'chip', adv: 'chip', wday: 'chip',
  trtip: 'chip', rlead: 'chip', blead: 'chip', flead: 'chip', labmode: 'chip', bfast: 'chip', bdx: 'chip', bmusic: 'chip', fview: 'chip', fsel: 'chip', wsel: 'chip',
  /* Et ark eller en meny åpnes */
  mon: 'open', sinfo: 'open', pinfo: 'open', pkskip: 'open', pkpick: 'open', sbxpick: 'open', sbxtools: 'open', jprev: 'open', sbxfac: 'open', sbxlgo: 'open', sbxcup: 'open', sbxfinal: 'open', sbxagain: 'open',
  spec: 'open', plan: 'open', sync: 'open', backup: 'open', seadd: 'open', avatar: 'open', avall: 'open', ach: 'open', today: 'open', sopen: 'open', minfo: 'open', pset: 'open', badge: 'open',
  train: 'open', cmpw: 'open', tsw: 'open', tswc: 'open', mstat: 'open', mvpick: 'open', mlearn: 'open', tutor: 'open', tutmv: 'open', tutmore: 'open', nick: 'open', exam: 'open', work: 'open', tourhub: 'open',
  lab: 'open', binfo: 'open', bbag: 'open', bfightm: 'open', bswitch: 'open', bpause: 'open', bpre: 'open', blearn: 'open', tpick: 'open', packlab: 'open', sbxopen: 'open',
  /* Lukk, tilbake, nei takk */
  close: 'close', home: 'close', later: 'close', sedel: 'close', skip: 'close', syncoff: 'close', pkdone: 'close', btyback: 'close', stback: 'close', trback: 'close', tswb: 'close', mback: 'close',
  tswr: 'close', wdel: 'close', woff: 'close', exend: 'close', quit: 'close', reset: 'close', trclr: 'close', bback: 'close', fkeepno: 'close', lskip: 'close', tback: 'close', swback: 'close',
  showstop: 'close', exexit: 'close', sbxleave: 'close',
  /* Bekreftet og lagret */
  pkkeep: 'ok', sbxq: 'ok', jday: 'ok', avpick: 'ok', rkok: 'ok', stnext: 'ok', tipok: 'ok', mvsug: 'ok', lead: 'ok', sesave: 'ok', party: 'ok', wnok: 'ok', newsok: 'ok', jok: 'ok', mvsave: 'ok',
  nicksave: 'ok', wsave: 'ok', wone: 'ok', wearly: 'ok', exsave: 'ok', upd: 'ok', trtipok: 'ok', rcdone: 'ok', jnext: 'ok',
  bkcopy: 'saved', bkload: 'saved', bkold: 'saved',
  /* Ekspedisjonen (weekui.js) */
  wkinfo: 'open', wkopen: 'open', wknode: 'open', wkend: 'open', sbxwk: 'open', wklead: 'chip', sbxwky: 'chip', sbxwkt: 'chip',
  wkrule: 'open', wkcp: 'open', wkcps: 'open', wkbag: 'open', wkbags: 'open', wkdepth: 'open', wksnags: 'open', wksym: 'open', wkitems: 'open', wkmint: 'open', wkmintp: 'chip', sbxwki: 'open', sbxwkp: 'open',
  wkhome: 'open', wkmode: 'open', wkrew: 'open', wksyms: 'open', wksite: 'open', wkshare: 'open', sbxwkd: 'open', sbxwkh: 'chip',
  /* Ellers */
  ball: 'ball', fav: 'fav', boinfo: 'warn'
};
let CLK = '', SNDP = 0;
const snd = k => { CLK = k || ''; };
/* Handlingene låsen under et løp stopper (steg 1b.7). De som åpner et ark der noe bare kan endres (bytte, angrepsvalget), stoppes ved
   døra, så forklaringen kommer før arbeidet. Salg stoppes bare for dem som står på laget. */
const LOCKA = new Set(['lead', 'party', 'tsw', 'tswgo', 'tswr', 'candy', 'heldgive', 'heldoff', 'mgive', 'triv', 'trev', 'trclr', 'evolve', 'form', 'mvpick', 'mvsug', 'mvsave', 'diff', 'tutteach', 'egginh']);
const lockStops = (a, el) => (LOCKA.has(a) || (a === 'sell' && S.party.includes(+el.dataset.u))) && typeof runLock === 'function' && !!runLock();
const lockEl = () => { const t = typeof lockMsg === 'function' ? lockMsg(1) : ''; return t ? `<div class="lockn" role="note">${icn('lock')}<p class="sm">${t}</p></div>` : ''; };
function press(el, fn) {
  const a = el.dataset.a, arm = el.dataset.ok;
  if (lockStops(a, el)) { toast(lockMsg()); if (sfx.warn) sfx.warn(); return; }
  CLK = OWN.has(a) ? '' : SND[a] || 'tap'; SNDP = 0;
  try { fn(el); } finally {
    /* «Tap again»-knappene: det første trykket er en advarsel, ikke en bekreftelse. */
    if (!arm && el.dataset.ok && el.isConnected) CLK = 'warn';
    const k = SNDP ? '' : CLK; CLK = ''; if (k && sfx[k]) sfx[k]();
  }
}
const heldSnd = k => (HELD[k].g === 'once' ? sfx.berry : HELD[k].g === 'plate' ? sfx.keyitem : sfx.item)();
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) {} };
/* SHINY-EFFEKTEN (steg 1c): stjerner som glitrer rundt den, og lyden, så det er tydelig at dette er en shiny. Én effekt for alle steder en
   shiny viser seg (Frontier nå; møtet, raidet og pakkene i 1c.6). Tegnet i CSS (.shfx i style.css), så den virker uten pakken; har pakken
   lyden «shiny», spilles den i stedet for den innebygde. host = elementet Pokémonen står i (det må ha position). o.quiet = uten lyd. */
function shinyFx(host, o = {}) {
  if (!host) return; const old = host.querySelector(':scope > .shfx'); if (old) old.remove();
  const el = document.createElement('span'); el.className = 'shfx'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * Math.PI * 2 + 0.3, r = 36 + (i % 3) * 9; return `<i style="--x:${(50 + Math.cos(a) * r).toFixed(1)}%;--y:${(50 + Math.sin(a) * r * 0.92).toFixed(1)}%;--d:${(i * 0.07).toFixed(2)}s;--z:${[1, 0.6, 0.8][i % 3]}"></i>`; }).join('');
  host.appendChild(el); if (!o.quiet) sfx.shiny(); setTimeout(() => el.remove(), 2700);
}

let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

/* ---------- Faner ---------- */
const U = { step: 0, sd: null, tab: 'fokus', lag: 'lag', fag: null, min: null, sort: 'ny', dex: null, R: null, enc: null, quit: 0 };
const NAV = [
  ['fokus', 'Focus', '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>'],
  ['lag', 'Team', '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6.5" r="2"/><circle cx="17" cy="9" r="2"/><path d="M12 12c-3 0-5.5 2.6-5.5 5.2 0 1.6 1.4 2.3 3 2.3 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.6 0 3-.7 3-2.3C17.500 14.6 15 12 12 12z"/>'],
  ['dex', 'Dex', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.500" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'],
  ['butikk', 'Shop', '<path d="M5 8h14l-1.2 11.200H6.2L5 8z"/><path d="M9 8V6.500a3 3 0 0 1 6 0V8"/>'],
  ['profil', 'Profile', '<circle cx="12" cy="9" r="5"/><path d="M8.500 13.200L7 21l5-2.500L17 21l-1.500-7.800"/>']
];
function renderNav() {
  $('#nav').innerHTML = NAV.filter(([k]) => k !== 'butikk' || !jOn() || has('shop')).map(([k, n, p]) => `<button type="button" data-a="tab" data-k="${k}"${U.tab === k ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg><span>${n}</span>${(k === 'fokus' && S.pend.length) || (k === 'profil' && U.as && U.as.open) ? '<i class="dot"></i>' : ''}</button>`).join('');
}
function render() {
  buildFags();
  if (!S.started) { $('#nav').hidden = true; $('#main').innerHTML = ''; return intro(); }
  /* Arbeidsdager: i arbeidstida er appen låst (utenom pausene). Aldri midt i en økt, en kamp eller noe annet som står framme: da kommer låsen etterpå. */
  if (S.work) { workPromote(); if (workCredit()) save(true);
    const L = workLock(), busy = !!S.timer || !!SBX || (typeof BT !== 'undefined' && !!BT.B) || (!$('#ov').hidden && !U.wlock);
    if (L && !busy) { $('#nav').hidden = true; return workScreen(L); }
    if (!L && U.wlock) { U.wlock = 0; closeOv(); } }
  /* Før «Done for today» finnes bare Focus, uten faner (dayOpenQ). */
  if (typeof giftCheck === 'function' && giftCheck()) setTimeout(() => { if (!giftSheet()) return; }, 60);
  if (typeof jFriend === 'function') jFriend();
  if (typeof examCheck === 'function' && examCheck()) save(true);
  const open = dayOpenQ(); if (!open || (U.tab === 'butikk' && jOn() && !has('shop'))) U.tab = 'fokus'; $('#nav').hidden = !open;
  if (featCheck()) save(true);
  /* Achievements: summen regnes én gang per tegning. Når et nytt mål er nådd siden sist, sies det fra én gang (ikke mens en studerer). */
  { const as = U.as = achSum(); if (open) { if (U.asN != null && as.open > U.asN) setTimeout(() => toast('Achievement reached. Tap your picture to claim the reward.'), 700); U.asN = as.open; } }
  renderNav();
  /* På en eventdag får forsiden eventets farger og en annen oppstilling (se VIEW.fokus). Eventet trekkes når dagens modus velges (modePick). */
  const E = U.tab === 'fokus' && S.party.length && typeof evNow === 'function' ? evNow() : null, EI = E ? evInfo(E) : null;
  $('#main').classList.toggle('nonav', !open);
  $('#main').innerHTML = `${GRADDEF}<div class="wrap${E ? ' evpage ev-' + E.k : ''}${SBX ? ' insbx' : ''}"${E ? ` style="--ec:${EI.c};--ec2:${EI.c2 || EI.c}"` : ''}>${typeof sbxBar === 'function' ? sbxBar() : ''}${helpBtn()}${VIEW[U.tab]()}</div>`;
  /* Et område som nettopp ble åpnet (av nivå eller antall arter), sies fra om én gang. */
  if (open && S.nreg && S.nreg.length) { const l = S.nreg; S.nreg = []; save(true); setTimeout(() => toast(`New area: ${l.join(' and ')} ${l.length > 1 ? 'are' : 'is'} open. See the Dex.`), 400); }
}
const VIEW = {};
/* DAGEN HAR TO DELER. Før du har trykket «Done for today», viser appen bare det som har med studiet å gjøre: fag, lengde, Start, dagens framdrift og
   fangsten etter en økt. Laget, kampene, butikken og resten kommer fram når du er ferdig (S.dn = dagen det ble trykket). En kampdag som alt er åpnet
   i dag, og Sandbox, teller som ferdig. */
const dayOpenQ = () => !S.started || !!SBX || admOn() || S.dn === dayKey() || (S.lad && S.lad.day === dayKey());
/* ADMIN VIEW: eieren (isAdmin) ser det samme som alle andre, til bryteren «Admin view» slås på. Da er alt framme uansett om dagen er ferdig, og
   Sandbox står der. Valget huskes på denne enheten. */
const admOn = () => { if (U.adm == null) { try { U.adm = localStorage.getItem(KEY + '.adm') === '1'; } catch (_) { U.adm = false; } } return !!U.adm && isAdmin(); };
const admRow = () => isAdmin() ? `<div class="admrow"><button type="button" class="btn sm2" data-a="adm" aria-pressed="${admOn()}">Admin view · ${admOn() ? 'on' : 'off'}</button>${admOn() ? '<button type="button" class="btn sm2" data-a="lab">Sandbox</button>' : ''}</div>` : '';
/* Foten på forsiden før «Done for today». */
const studyFoot = () => `<button type="button" class="btn wide st-done" data-a="dn"><b>Done for today</b>${jOn() ? `<small>${tl('opens battles and the tabs')}</small>` : ''}</button>`;
/* Raidet vises ellers først når dagen er åpnet; gaveraidet (ev) vises med en gang. */
const raidGo = () => dayOpenQ() || !!(S.raid && S.raid.ev);
function giftSheet() {
  if (!S.gnote || S.timer || !$('#ov').hidden || !$('#sheet').hidden) return false;
  delete S.gnote; save(true);
  const pk = Object.keys(S.fpk || {}).filter(k => PACKS[k]).map(k => PACKS[k].n);
  openSheet(`<h2 style="margin:0 0 4px">A gift today</h2><ul class="wnl">${pk.length ? `<li>Free packs wait in the Shop: ${pk.join(', ')}.</li>` : ''}<li>Something legendary shows itself to every trainer today. You get one attempt, today only.</li></ul><button type="button" class="btn wide gold" data-a="wnok" style="margin-top:14px">Got it</button>`);
  return true;
}
/* ---------- REISEN (nye spillere) ----------
   journeyCard: hva som er åpnet, og hva som kommer (med et hint om neste studiedag). jReveal: arket for det som er nytt (ett om gangen, etter
   «Done for today»). jAfter: det som hører til rett etter en økt eller en kamp (forklaringen av raid, shinyen, angrepstypene), og ellers jReveal.
   Tekstene går gjennom tl (norsk eller engelsk, S.lang). */
const JIC = { battles: 'sword', shop: 'bag', shiny: 'spark', nature: 'star', train: 'gym', held: 'gift', size: 'scale', tutor: 'cap' };
const jNext = () => JOURNEY.find(f => !has(f[0]));
/* Studiedager til neste steg åpnes (lærerne kommer på dag 9, to dager etter størrelsene). */
const jGap = f => Math.max(1, f[1] - (S.jd || 0));
function journeyCard() {
  if (!jOn() || !S.started) return '';
  const next = jNext();
  return `<div class="card jrn"><div class="row" style="justify-content:space-between"><b>${tl('Your journey')}</b><span class="pill tn">${tl('Study day {d}', { d: S.jd || 0 })}</span></div>
    <div class="jrn-t">${JOURNEY.map(f => { const on = has(f[0]), nx = next && next[0] === f[0]; return `<span class="jt${on ? ' on' : ''}${nx ? ' nx' : ''}"><i>${on ? icn(JIC[f[0]]) : '?'}</i><small>${on ? tl(JSHORT[f[0]]) : nx ? tl('Next') : ''}</small></span>`; }).join('')}</div>
    <p class="sm">${next ? (jGap(next) > 1 ? tl('In {n} study days: {hint}', { n: jGap(next), hint: tl(JHINT[next[0]]) }) : tl('Next study day ({min} min): {hint}', { min: OPENMIN, hint: tl(JHINT[next[0]]) })) : tl('Everything is open. The rest is yours to find.')}</p></div>`;
}
/* To av samme art på nivå 50: født med full potensial og en nature som hjelper, mot født svak med en nature som trekker ned. */
function jNature() {
  const p = partner(), id = p ? p.id : 4, b = BST[id - 1], ix = [1, 2, 3, 4, 5], hi = ix.reduce((a, c) => b[c] > b[a] ? c : a, 1), lo = ix.reduce((a, c) => b[c] < b[a] ? c : a, 1);
  const natFor = (u, d) => { for (let n = 0; n < 25; n++) if (natUp(n) === u && natDn(n) === d) return n; return 0; };
  const mk = (iv, nat) => ({ nat, st: statsOf({ id, lv: 50, sh: 0, iv: [iv, iv, iv, iv, iv, iv], ev: [0, 0, 0, 0, 0, 0], nat }) });
  const A = mk(31, natFor(hi, lo)), Z = mk(3, natFor(lo, hi)), top = Math.max(...A.st, ...Z.st);
  const col = (x, t) => `<div class="jn-c"><div class="jn-h">${spr(id, { s: '44px' })}<span><b>${t}</b><span class="sm tn">${NAT[x.nat]}</span></span></div>${x.st.map((v, i) => `<div class="jn-r"><span class="sm">${SN[i]}</span><span class="jn-b"><i style="width:${Math.round(v / top * 100)}%"></i></span><b class="tn">${v}</b></div>`).join('')}</div>`;
  return `<div class="jn">${col(A, tl('Born strong'))}${col(Z, tl('Born weak'))}</div><p class="sm">${tl('Same Pokémon, same level. Potential (IVs) is set when it is born: 0 to 31 in each stat. A nature lifts one stat by 10 % and lowers another. Keep the ones born strong: the stars on the catch screen show it.')}</p>`;
}
/* ARKENE PÅ REISEN (steg 1.11): samme mal for alle. Ett bilde eller en liten animasjon, én idé (høyst rundt 30 ord), gavene som egne linjer,
   hintet om neste studiedag, og «Got it». jPic(k) = bildet til steget, jCard(o) = arket. Tekstene går gjennom tl. */
/* En vanlig og en shiny av samme art på samme nivå: hvor mye sterkere shinyen er, i tall (ønske 15). a = vanlig (IV 15), b = shiny. */
const shinyEx = (id, lv) => { const m = { id, lv, sh: 0, iv: [15, 15, 15, 15, 15, 15], ev: [0, 0, 0, 0, 0, 0], nat: 0 }; return { a: pwOf(m), b: pwOf(Object.assign({}, m, { sh: 1, iv: [31, 31, 31, 31, 31, 31] })) }; };
const jStars = n => `<span class="jp-st">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
function jPic(k, o) {
  const p = partner(), pid = p ? p.id : 4; o = o || {};
  if (k === 'battles') return `<div class="tr-vs">${spr(pid, { ani: 1, s: '84px' })}<b>VS</b>${spr(19, { s: '84px', sil: 1 })}</div>`;
  if (k === 'shop') return `<div class="jp-row"><span class="coin jp-coin"><i></i></span>${ballEl('great', '42px')}<span class="jp-pack" style="--c:${PACKS.poke.c}"><i></i><i></i><i></i></span></div>`;
  if (k === 'shiny') { const id = o.id || pid, lv = o.lv || (p ? p.lv : 5), x = shinyEx(id, lv);
    return `<div class="jp-two"><span>${spr(id, { ani: 1, s: '84px' })}<small class="tn">${tl('Power {n}', { n: nb(x.a) })}</small></span>${icn('arrow')}<span class="shy">${spr(id, { ani: 1, sh: 1, s: '84px' })}<small class="tn au">${tl('Power {n}', { n: nb(x.b) })}</small></span></div>`; }
  if (k === 'nature') { const lv = Math.max(20, p ? p.lv : 20), mk = iv => pwOf({ id: pid, lv, sh: 0, iv: [iv, iv, iv, iv, iv, iv], ev: [0, 0, 0, 0, 0, 0], nat: 0 });
    return `<div class="jp-two"><span>${spr(pid, { ani: 1, s: '80px' })}${jStars(5)}<small class="tn">${tl('Power {n}', { n: nb(mk(31)) })}</small></span><span class="lo">${spr(pid, { ani: 1, s: '80px' })}${jStars(1)}<small class="tn">${tl('Power {n}', { n: nb(mk(3)) })}</small></span></div>`; }
  if (k === 'train') return `<div class="jp-train">${spr(pid, { ani: 1, s: '84px' })}<span class="jp-bars">${[62, 38, 80].map((w, i) => `<i style="--w:${w}%;--i:${i}"><b></b></i>`).join('')}</span></div>`;
  if (k === 'held') return `<div class="jp-held">${spr(pid, { ani: 1, s: '88px' })}<span class="jp-it">${heldEl('sitrus', '40px')}</span></div>`;
  if (k === 'size') return `<div class="jp-size">${[0, 1, 2, 3].map(z => `<span class="z${z}">${spr(pid, { ani: 1, s: '56px' })}<small>${SZN[z]}</small><b class="tn">${z === 1 ? 'HP' : (SZHP[z] > 1 ? '+' : '−') + Math.abs(Math.round((SZHP[z] - 1) * 100)) + ' %'}</b></span>`).join('')}</div>`;
  if (k === 'raid') return '<span class="raid-sp qm hqm tr-raid"><i>?</i></span>';
  if (k === 'tutor') return `<div class="jp-row">${spr(pid, { ani: 1, s: '84px' })}<span class="jp-cap">${icn('cap')}</span></div>`;
  if (k === 'incense') return `<div class="jp-inc">${itPic('glint', '56px')}${icn('spark')}</div>`;
  return '';
}
const jOk = () => `<button type="button" class="btn wide gold" data-a="jok" style="margin-top:14px">${tl('Got it')}</button>`;
/* Hintet nederst i et ark: hva som kommer neste studiedag (ingenting når reisen er ferdig). */
const jTease = () => { const n = jNext(); return n ? `<p class="jtease">${icn('clock')}<span>${jGap(n) > 1 ? tl('In {n} study days: {hint}', { n: jGap(n), hint: tl(JHINT[n[0]]) }) : tl('Next study day: {hint}', { hint: tl(JHINT[n[0]]) })}</span></p>` : ''; };
const jCard = o => `<div class="jsh"><div class="jsh-pic">${o.pic || ''}</div><div class="jsh-k">${o.k}</div><h2>${o.n}</h2><p class="jsh-t">${o.t}</p>${o.x || ''}${(o.g || []).map(x => `<p class="jsh-g">${icn('gift')}<span>${x}</span></p>`).join('')}${o.tease === false ? '' : jTease()}${o.acts || jOk()}</div>`;
/* Tre slags angrep (vises første gang et nytt angrep læres etter dag 4). */
const jMoveTypes = () => `<div class="jmv"><div><span class="mcat ph"></span><span><b>Physical</b><span class="sm">${tl('Contact moves. They use Attack against Defense.')}</span></span></div><div><span class="mcat spc"></span><span><b>Special</b><span class="sm">${tl('Energy from a distance. They use Sp. Atk against Sp. Def.')}</span></span></div><div><span class="mcat stt"></span><span><b>Status</b><span class="sm">${tl('No damage. They change stats, the weather or the foe.')}</span></span></div></div>`;
/* Potensial (dag 4): den som er ny, får bare stjernene her. Naturen kommer som en egen liten forklaring på kortet (cardTip). */
function jSheet(f, g) {
  const k = f[0];
  return jCard({ pic: jPic(k), k: tl('New · study day {d}', { d: f[1] }), n: tl(f[2]), t: tl(f[3]), g, x: k === 'nature' && know() > 0 ? `<p class="jsh-s">${tl('A nature lifts one stat by 10 % and lowers another. You see both on its card.')}</p>` : '' });
}
function jReveal() {
  if (!jOn() || !S.started || S.timer || !dayOpenQ() || !$('#sheet').hidden || !$('#ov').hidden) return false;
  const f = JOURNEY.find(x => has(x[0]) && !(S.js || []).includes(x[0])); if (!f) return false;
  (S.js = S.js || []).push(f[0]); const g = jGift(f[0]);
  if (JOURNEY.every(x => S.js.includes(x[0]))) S.jdone = 1;
  save(true); render(); openSheet(jSheet(f, g)); return true;
}
/* Shiny-røkelsen (ønske 16, for alle): ett ark når den åpnes i Shop (trenernivå SHOP.glint.lv). */
function incSheet() {
  if (!S.started || S.timer || !$('#sheet').hidden || !$('#ov').hidden || (S.tip && S.tip.inc) || tlv() < SHOP.glint.lv || (jOn() && !has('shop'))) return false;
  (S.tip || (S.tip = {})).inc = 1; save(true);
  openSheet(jCard({ pic: jPic('incense'), k: tl('New in the Shop'), n: tl('Shiny incense'), t: tl('While it burns, new encounters are shiny more often: sessions you finish, packs you open and eggs that hatch. Those already waiting in the grass do not change.'), tease: false }));
  return true;
}
function jAfter() {
  if (!jOn() || !S.started || S.timer || !$('#sheet').hidden || !$('#ov').hidden) return false;
  const x = S.jx || (S.jx = {});
  if (x.r === 1) { x.r = 2; save(true); openSheet(jCard({ pic: jPic('raid'), k: tl('Now you know'), n: 'Legendary raids', t: tl('Now and then a legendary Pokémon shows itself after the day\'s battles. It fights your whole team. You get {n} attempts, one a day, and if you win, it joins you.', { n: RAIDTRIES }), x: `<p class="jsh-s">${tl('That one was not a fair fight. The next ones are, and the first shows itself in a few days.')}</p>`, tease: false })); return true; }
  if (x.sh === 1) {
    x.sh = 2; let g = []; if (!(S.js || []).includes('shiny')) { (S.js = S.js || []).push('shiny'); g = jGift('shiny'); }
    const e = S.pend.slice().reverse().find(q => q.sure && q.sh); save(true);
    openSheet(jCard({ pic: e ? jPic('shiny', { id: e.id, lv: e.lv }) : '', k: tl('Look closer'), n: tl('A shiny {name}', { name: e ? esc(D(e.id)[0]) : 'Pokémon' }), g,
      t: tl('A shiny has another colour, and here it is stronger too: born as strong as its kind can be, with every stat {p} % higher. This one is yours whatever ball you throw.', { p: Math.round((SHINYST - 1) * 100) }),
      acts: `<div class="acts" style="margin-top:12px"><button type="button" class="btn gold" data-a="hunt">${tl('Catch it now')}</button><button type="button" class="btn nf" data-a="jok">${tl('Later')}</button></div>` }));
    return true;
  }
  if (U.jmv && !x.mv && (S.jd || 0) >= 4) { x.mv = 1; U.jmv = 0; save(true); openSheet(jCard({ pic: '', k: tl('A new move'), n: tl('Three kinds of moves'), t: tl('A Pokémon with a high Sp. Atk hits harder with special moves, and one with a high Attack with physical ones.'), x: jMoveTypes(), tease: false })); return true; }
  return jReveal();
}
function whatsNew() {
  if (!S.started || (S.wn || 0) >= WNV) return false;
  S.wn = WNV; save(true);
  openSheet(`<h2 style="margin:0 0 4px">${tl('What\'s new')}</h2><ul class="wnl">${(jOn() ? [WNJ] : []).concat(WN).map(x => `<li>${tl(x)}</li>`).join('')}</ul><button type="button" class="btn wide gold" data-a="wnok" style="margin-top:14px">${tl('Got it')}</button>`);
  return true;
}
/* Kort som sier fra om noe nytt (FEATS), og kortet som står der kampene kommer. */
const newsEl = () => (S.news || []).map(k => { const f = FEATS.find(x => x[0] === k); return f ? `<div class="card newsc"><div class="row" style="justify-content:space-between"><b><span class="newsp">New</span> ${f[2]}</b><button type="button" class="btn sm2" data-a="newsok" data-k="${k}">Got it</button></div><p class="sm" style="margin-top:6px">${f[3]}</p></div>` : ''; }).join('');
const lockCard = k => { const f = FEATS.find(x => x[0] === k); return f ? `<div class="card lockc"><b>${tl(f[2])}</b><p class="sm" style="margin-top:4px">${f[1] <= 1 ? tl('Opens when today has {min} minutes of focus.', { min: OPENMIN }) : tl('Opens on study day {d}. You are on day {n}.', { d: f[1], n: S.jd || 0 })}</p></div>` : ''; };
function enter() { const w = $('#main .wrap'); if (w) w.classList.add('enter'); }

/* ---------- Din egen figur ----------
   Spilleren velger selv hvem de er: en av hovedpersonene fra spillene, eller hvilken som helst trener og boss. Figuren er profilbildet
   og står på din side i introen før bosskamper. Bildene kommer fra ressurspakken hvis den har dem, ellers fra Showdown (som for motstanderne). */
const PLAYERS = [['hilbert', 'Hilbert'], ['hilda', 'Hilda'], ['nate', 'Nate'], ['rosa', 'Rosa'], ['ethan', 'Ethan'], ['lyra', 'Lyra'], ['lucas', 'Lucas'], ['dawn', 'Dawn'], ['red', 'Red'], ['leaf', 'Leaf'], ['brendan', 'Brendan'], ['may', 'May']];
function avOthers() {
  const seen = new Set(PLAYERS.map(p => p[0])), out = [];
  for (const k of Object.keys(POOL)) for (const t of POOL[k]) { const key = t[1].split('|')[0]; if (seen.has(key)) continue; seen.add(key); out.push([t[1], t[0] === 'Grunt' ? t[2].replace('Team ', '') + ' Grunt' : t[0]]); }
  return out;
}
const avName = () => { const p = PLAYERS.concat(avOthers()).find(x => x[0] === S.av); return p ? p[1] : ''; };
function avSheet(all) {
  const cell = x => `<button type="button" data-a="avpick" data-k="${esc(x[0])}" aria-pressed="${S.av === x[0]}">${tsprite(x[0])}<span>${esc(x[1])}</span></button>`, rest = all ? avOthers() : [];
  openSheet(`<h2 class="h">Your character</h2><p class="sm">Pick who you are. Your character is your profile picture and stands on your side in the intro before boss battles.</p>
    <div class="avgrid">${PLAYERS.map(cell).join('')}</div>
    ${all ? `<div class="lab">Trainers and bosses</div><div class="avgrid">${rest.map(cell).join('')}</div>` : '<button type="button" class="btn wide" data-a="avall">More characters</button>'}
    ${S.av ? '<button type="button" class="btn wide" data-a="avpick" data-k="">No character</button>' : ''}`);
  /* Pakkens egne bilder hentes første gang velgeren åpnes, og så tegnes den på nytt med dem. */
  PACK.portraits(PLAYERS.concat(rest).map(x => x[0].split('|')[0])).then(n => { if (n && $('#sheet .avgrid')) avSheet(all); }).catch(() => {});
}
/* ---------- Achievements og rang ----------
   Et trykk på profilbildet åpner denne siden. Rammen og stempelet rundt bildet følger rangen (rankOf): én medalje for hver belønning du henter. */
const AIC = {
  hours: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>',
  streak: '<path d="M12 3c1 3.600 5 5.600 5 10a5 5 0 0 1-10 0c0-2 1-3.200 2-4 .200 1.500 1 2.300 1.800 2.500C10.500 9 11 5.500 12 3z"/>',
  goal: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
  tlv: '<path d="M12 19V6M6.500 11.500 12 6l5.500 5.500"/>',
  top: '<path d="M6.500 12.500 12 7l5.500 5.500M6.500 18 12 12.500 17.500 18"/>',
  train: '<path d="M12 5v14M5 12h14"/>',
  dex: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.500" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
  shiny: '<path d="M11 3.500l1.900 5.100L18 10.500l-5.100 1.900L11 17.500l-1.900-5.100L4 10.500l5.100-1.900z"/><path d="M18.500 15.500l.700 1.800 1.800.700-1.800.700-.700 1.800-.700-1.800-1.800-.700 1.800-.700z"/>',
  leg: '<path d="M12 3.500l2.600 5.300 5.900.900-4.300 4.100 1 5.800L12 16.900l-5.200 2.700 1-5.800L3.500 9.700l5.900-.900z"/>',
  evo: '<path d="M19 12a7 7 0 1 1-2.200-5.100M19 4.500V8h-3.500"/><path d="M12 15V9.500M9.800 11.500 12 9.300l2.200 2.200"/>',
  perfect: '<circle cx="12" cy="12" r="8"/><path d="M4 12h5.500M14.500 12H20"/><circle cx="12" cy="12" r="2.500"/>',
  pack: '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9.500 9.500h5M9.500 13h5"/>',
  lwin: '<path d="M12 3.500l7 2.500v5.500c0 4.500-3 7.500-7 9-4-1.500-7-4.500-7-9V6z"/><path d="M9 12l2.200 2.200L15.200 10"/>',
  lap: '<path d="M19 12a7 7 0 1 1-2.200-5.100M19 4.500V8h-3.500"/>',
  champ: '<path d="M4 18.500h16M4.500 15.500l-1-8.500 5 4L12 5l3.500 6 5-4-1 8.500z"/>',
  cynthia: '<path d="M4 18.500h16M4.500 15.500l-1-8.500 5 4L12 5l3.500 6 5-4-1 8.500z"/><circle cx="12" cy="12.500" r="1"/>',
  ghetsis: '<path d="M13 3 5 13.500h5.500L9.500 21 18 10h-5.500z"/>',
  fstreak: '<path d="M8 20V8l4-4 4 4v12M5 20h14M10.500 12h3M10.500 15.500h3"/>',
  cup: '<path d="M8 4.500h8v5a4 4 0 0 1-8 0zM8 6H5c0 3 1.500 4.500 3.500 4.500M16 6h3c0 3-1.500 4.500-3.500 4.500M12 13.500V17M8.500 19.500h7M9.500 17h5"/>',
  raid: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M10 10.200a2 2 0 1 1 3 1.700c-.700.400-1 .800-1 1.600M12 16v.100"/>',
  dark: '<path d="M3 12s3.500-6 9-6 9 6 9 6-3.500 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.500"/>',
  ring: '<circle cx="12" cy="13.500" r="6"/><path d="M9.500 4h5l-1.500 3h-2z"/>'
};
const rewTxt = r => [r.c ? `${nb(r.c)} coins` : '', r.k ? `${r.k} Rare Candy` : '', r.u ? `${r.u} Ultra Ball${r.u > 1 ? 's' : ''}` : '', r.m ? `${r.m > 1 ? r.m + ' Mega Stones' : 'a Mega Stone'}` : ''].filter(Boolean).join(' + ');
const achPips = s => `<span class="apips" role="img" aria-label="${s.got} of ${s.max} medals">${Array.from({ length: s.max }, (_, i) => `<i class="${i < s.got ? 'on' : i < s.done ? 'rdy' : ''}"></i>`).join('')}</span>`;
const achText = (a, s) => a.f ? a.f(nb(s.val), nb(s.next), s) : a.t.length === 1 ? a.u : s.done >= s.max ? `${nb(s.val)} ${a.u}` : `${nb(s.val)} of ${nb(s.next)} ${a.u}`;
/* Profilbildet i rangens ramme. Elite har en ring som glir rundt. */
const avIn = R => `${R.i >= RANKS.length - 1 ? '<i class="rkring"><i></i></i>' : ''}${S.av ? tsprite(S.av) : '<span class="tsb"></span>'}`;
const avFrame = (R, cls, stamp) => `<span class="avf rk${R.i}${cls ? ' ' + cls : ''}" style="--rk:${R.c}">${avIn(R)}${stamp ? `<span class="stamp">${R.n}</span>` : ''}</span>`;
function achSheet() {
  const sum = U.as = achSum(), R = sum.R, tot = achTotal(), pct = R.next ? Math.round((R.p - R.at) / (R.next - R.at) * 100) : 100, gs = [];
  ACH.forEach(a => { if (a.ty == null && !gs.includes(a.g)) gs.push(a.g); });
  const row = a => {
    const s = achState(a), full = s.got >= s.max, r = achRew(a, Math.min(s.max - 1, s.open ? s.got : s.done)), w = s.done >= s.max ? 100 : Math.round(Math.min(1, s.val / s.next) * 100);
    return `<div class="arow${s.open ? ' rdy' : ''}${full ? ' full' : ''}" id="ach-${a.k}"><span class="aic"><svg viewBox="0 0 24 24" aria-hidden="true">${AIC[a.k] || AIC.leg}</svg></span><div class="sp">
      <div class="row" style="justify-content:space-between"><b>${a.n}</b>${achPips(s)}</div>
      <div class="sm tn">${achText(a, s)}</div><div class="bar"><i style="width:${w}%"></i></div>
      ${s.open ? `<button type="button" class="btn gold sm2 aclaim" data-a="achget" data-k="${a.k}">Claim ${rewTxt(r)}</button>` : `<div class="sm arew">${full ? 'Complete' : `Reward: ${rewTxt(r)}`}</div>`}</div></div>`;
  };
  const tyc = a => {
    const s = achState(a), full = s.got >= s.max, r = achRew(a, Math.min(s.max - 1, s.got)), body = `<b>${TYN[a.ty]}</b><span class="sm tn">${s.done >= s.max ? s.val : `${s.val} of ${s.next}`}</span>${achPips(s)}${s.open ? `<span class="tyget">Claim ${nb(r.c)}</span>` : ''}`;
    return s.open ? `<button type="button" class="tyc rdy" id="ach-${a.k}" data-a="achget" data-k="${a.k}" style="--tc:var(--t${a.ty})" aria-label="${TYN[a.ty]} collector: claim ${nb(r.c)} coins">${body}</button>` : `<div class="tyc${full ? ' full' : ''}" id="ach-${a.k}" style="--tc:var(--t${a.ty})">${body}</div>`;
  };
  const html = `<div class="row" style="justify-content:space-between"><h2 class="h" style="font-size:22px;margin:0">Achievements</h2></div>
    <div class="ahead" style="--rk:${R.c}">${avFrame(R, 'lg', 1)}<div class="sp"><div class="sm">Your rank</div><b class="arank">${R.n}</b>
      <div class="bar"><i style="width:${pct}%;background:${R.c}"></i></div><div class="sm tn" style="margin-top:5px">${R.p} of ${tot} medals${R.nn ? ` · ${R.next - R.p} more to ${R.nn}` : ' · the highest rank'}</div></div></div>
    <div class="rkl">${RANKS.map((r, i) => `<span class="${i <= R.i ? 'on' : ''}${i === R.i ? ' now' : ''}" style="--rk:${r[2]}"><b>${r[0]}</b><i class="tn">${r[1]}</i></span>`).join('')}</div>
    <p class="sm">Every reward you claim is a medal. Medals raise your rank, and your rank is the frame and stamp around your picture.</p>
    ${sum.open ? `<button type="button" class="btn gold wide" data-a="achall">Claim all ${sum.open} reward${sum.open > 1 ? 's' : ''}</button>` : ''}
    ${gs.map(g => `<div class="lab">${g}</div><div class="card alist">${ACH.filter(a => a.g === g && a.ty == null).map(row).join('')}</div>`).join('')}
    <div class="lab">Types · species caught of each type</div><div class="tygrid">${ACH.filter(a => a.ty != null).map(tyc).join('')}</div>
    <button type="button" class="btn wide" data-a="avatar">${S.av ? 'Change character' : 'Pick a character'}</button>`;
  const sh = document.querySelector('#sheet .sheet.achsh');
  if (sh) { const y = sh.scrollTop; sh.innerHTML = SHTOP + html; sh.scrollTop = y; }
  else { openSheet(html); const s = document.querySelector('#sheet .sheet'); if (s) s.classList.add('achsh'); }
}
/* Ny rang: bildet i den nye rammen, og stempelet som slås ned. Ligger over arket til du trykker videre. */
function rankUp(R) {
  const w = $('#sheet'); if (w.hidden) return;
  const old = w.querySelector('.rkup'); if (old) old.remove();
  const d = document.createElement('div'); d.className = 'rkup'; d.style.setProperty('--rk', R.c);
  d.innerHTML = `<div class="lab">New rank</div>${avFrame(R, 'xl')}<span class="stamp">${R.n}</span><p class="sm">Your picture has a new frame.${R.nn ? ` ${R.next - R.p} more medals to ${R.nn}.` : ' This is the highest rank there is.'}</p><button type="button" class="btn gold" data-a="rkok">Continue</button>`;
  w.appendChild(d); sfx.rank(); buzz([20, 60, 90]);
}
/* ---------- Egne ikoner ----------
   Små strekikoner tegnet for appen (24 × 24). icn('navn') gir en <svg> som arver fargen og følger skriftstørrelsen (.icn i style.css).
   'f' = fylt i stedet for strek. Ingen av dem kommer fra spillene eller andre. */
const ICN = {
  flame: ['f', 'M13 2c.6 3.4-3.8 5-3.8 9.2 0 .8.3 1.5.8 2 .1-1.9 1.1-3.1 2.4-4.1 2.6 1.6 4.4 3.8 4.4 6.5a5.3 5.3 0 0 1-10.6.2C6.2 10.6 11.5 8.2 13 2z'],
  grass: ['', 'M5 20c0-5 .8-8 3-10.5M12 20c-.5-6 0-10 .5-14M19 20c0-5-1-8-3.200-10.500M8.500 20c.2-3 .5-4.500 1.200-6M15.500 20c-.2-3-.5-4.500-1.200-6'],
  chev: ['', 'M9 5l7 7-7 7'], down: ['', 'M5 9l7 7 7-7'], back: ['', 'M15 5l-7 7 7 7'], x: ['', 'M6 6l12 12M18 6L6 18'], size: ['', 'M6.500 17.500l11-11M12 6.500h5.500V12M12 17.500H6.500V12'], plus: ['', 'M12 5v14M5 12h14'],
  check: ['', 'M5 12.500l4.500 4.500L19 7.500'], arrow: ['', 'M4 12h15M13 6l6 6-6 6'],
  lock: ['', 'M7.700 10.500h8.600a2.200 2.200 0 0 1 2.200 2.200v5.100a2.200 2.200 0 0 1-2.200 2.200H7.700a2.200 2.200 0 0 1-2.200-2.200v-5.100a2.200 2.200 0 0 1 2.200-2.200zM8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500'],
  spark: ['f', 'M12 2c.7 5.200 2.800 7.300 8 8-5.200.7-7.300 2.800-8 8-.7-5.200-2.800-7.300-8-8 5.200-.7 7.300-2.800 8-8zM19 16c.3 2 1 2.700 3 3-2 .3-2.700 1-3 3-.3-2-1-2.700-3-3 2-.3 2.700-1 3-3z'],
  star: ['f', 'M12 2.500l2.700 6.100 6.600.6-5 4.400 1.500 6.500-5.800-3.400-5.800 3.400 1.500-6.500-5-4.400 6.600-.6z'],
  cap: ['', 'M2.500 9.500L12 5l9.500 4.500L12 14 2.500 9.500zM6.500 11.800v4c0 1.400 2.500 2.700 5.500 2.700s5.500-1.300 5.500-2.700v-4M21.500 9.500v5'],
  egg: ['', 'M12 3c3.300 0 6.500 5.200 6.500 10.200A6.500 6.500 0 0 1 12 20a6.500 6.500 0 0 1-6.500-6.800C5.500 8.200 8.700 3 12 3z'],
  gift: ['', 'M4 11h16v9H4zM3 7.500h18V11H3zM12 7.500V20M12 7.500C10 7.500 8 6.500 8 5s2-2 4 2.500zM12 7.500c2 0 4-1 4-2.500s-2-2-4 2.500z'],
  box: ['', 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8'],
  info: ['', 'M12 11v6M12 7.500v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'],
  swap: ['', 'M7 4L3.500 7.500 7 11M3.500 7.500H17M17 13l3.500 3.500L17 20M20.500 16.500H7'],
  scale: ['', 'M12 4v16M5 20h14M5 7h14M5 7l-2.500 6a2.900 2.900 0 0 0 5 0zM19 7l-2.500 6a2.900 2.900 0 0 0 5 0z'],
  sun: ['', 'M12 16.500a4.500 4.500 0 1 0 0-9 4.500 4.500 0 0 0 0 9zM12 2.500v2M12 19.500v2M2.500 12h2M19.500 12h2M5.300 5.300l1.400 1.400M17.300 17.300l1.400 1.400M5.300 18.700l1.400-1.400M17.300 6.700l1.400-1.400'],
  moon: ['', 'M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z'],
  bag: ['', 'M5 8h14l-1.200 11.200H6.200zM9 8V6.500a3 3 0 0 1 6 0V8'],
  clock: ['', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.500V12l3 2'],
  up: ['f', 'M12 5l7 9H5z'], dn: ['f', 'M12 19l7-9H5z'], gym: ['', 'M7 7.500v9M4 10v4M17 7.500v9M20 10v4M7 12h10'],
  bolt: ['f', 'M13.500 2L5 13.500h5.500L9.500 22 19 10h-5.800z'], sword: ['', 'M14.500 4H20v5.500L9 20.500 3.500 15zM6 18l-2.500 2.500M5 13l6 6'],
  shield: ['', 'M12 3l7.500 3v5.500c0 4.500-3 8-7.500 9.500-4.500-1.500-7.500-5-7.500-9.500V6z'],
  bell: ['', 'M6 16V11a6 6 0 0 1 12 0v5l1.500 2h-15zM10 20a2 2 0 0 0 4 0'], globe: ['', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.500 2.500 3.800 5.500 3.800 9s-1.300 6.500-3.800 9c-2.500-2.500-3.800-5.500-3.800-9S9.500 5.500 12 3z'],
  cloud: ['', 'M7 18.500a4 4 0 0 1-.6-7.950 5.500 5.500 0 0 1 10.700-1.250A4.600 4.600 0 0 1 17 18.500z'], wrench: ['', 'M14.500 6.500a4 4 0 0 0 5 5L11 20a2.100 2.100 0 0 1-3-3l8.500-8.500zM14.500 6.500l3-3'],
  flag: ['', 'M6 21V4M6 5h11l-2.500 3.500L17 12H6'], tower: ['', 'M8 21V9l4-5 4 5v12M5 21h14M10.500 21v-4h3v4M10 12h4'],
  cup: ['', 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.500 20h7M10 17h4'], heart: ['', 'M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z']
};
const icn = (k, cls) => { const d = ICN[k]; return d ? `<svg class="icn${d[0] ? ' f' : ''}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d[1]}"/></svg>` : ''; };
/* En ring som fylles (XP, egget): r = radius i en boks på size × size, f = 0–1. Fargen er aksentens overgang (#dg defineres én gang i siden). */
const ringEl = (size, r, f, w) => { const C = 2 * Math.PI * r, c = size / 2; return `<svg class="ringsv" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${w}"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#dg)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(C * Math.max(0, Math.min(1, f))).toFixed(1)} ${C.toFixed(1)}"/></svg>`; };
/* Overgangen alle ringer og buer bruker. Står én gang øverst i siden (render). */
const GRADDEF = '<svg class="defs" width="0" height="0" aria-hidden="true"><defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--acc)"/><stop offset="1" stop-color="var(--acc2)"/></linearGradient></defs></svg>';

/* Toppstripa: bildet ditt i rangens ramme (eller nivået i en ring), rangen med XP-streken, dager på rad og mynter. Trykk på bildet: Achievements. */
function topBar() {
  const l = tlv(), a = tlvXp(l), b = tlvXp(l + 1), st = streak(), as = U.as || achSum(), R = as.R, f = Math.max(0, Math.min(1, (S.xp - a) / (b - a)));
  const lab = `Achievements. Rank: ${R.n}. Trainer level ${l}, ${nb(S.xp - a)} of ${nb(b - a)} XP to level ${l + 1}${as.open ? `. ${as.open} reward${as.open > 1 ? 's' : ''} to claim` : ''}`;
  return `<div class="top">${S.av ? `<button type="button" class="avb avf rk${R.i}" data-a="ach" style="--rk:${R.c}" aria-label="${lab}">${avIn(R)}<span class="avl tn">${l}</span>${as.open ? '<i class="dot"></i>' : ''}</button>`
    : `<button type="button" class="lvring" data-a="ach" style="--rk:${R.c};--f:${Math.round(f * 100)}" aria-label="${lab}"><b class="tn">${l}</b>${as.open ? '<i class="dot"></i>' : ''}</button>`}
    <div class="top-r"><b class="rkt" style="color:${R.c}">${R.n}</b>${S.av ? `<span class="bar" title="${nb(S.xp - a)} of ${nb(b - a)} XP to level ${l + 1}"><i style="width:${Math.round(f * 100)}%"></i></span>` : ''}</div>
    ${st >= 2 ? `<span class="tk st" role="img" aria-label="${st}-day streak">${icn('flame')}<b class="tn">${st}</b></span>` : ''}${coinEl(S.coins)}</div>`;
}

/* Kampbonusen (multiplikatoren på mynter fra kamper) slik den står akkurat nå, og trinnene time for time fram til dagsmålet. */
/* Pengepungen (en sjelden premie fra Champion eller Supreme Boss): venter den, eller gjelder den i dag? */
function purseNote() {
  const p = S.purse; if (!p) return '';
  const pc = Math.round((p.m - 1) * 100);
  if (p.day && p.day === S.lad.day) return `<p class="sm purse"><b>The purse is open.</b> Today's battles pay ${pc} % more coins.</p>`;
  if (!p.day) return `<p class="sm purse"><b>A purse is waiting.</b> Your next battle day pays ${pc} % more coins.</p>`;
  return '';
}
/* Bonusen på et gitt antall minutter i dag (0,5 ved start, toppen ved dagsmålet). */
const mulAt = m => { const g = goalMin(), top = goalTop(); return Math.round((0.5 + Math.min(1, m / g) * (top - 0.5)) * 10) / 10; };
/* Neste trinn i bonusen: neste hele time (eller dagsmålet, om det kommer først), og minuttene dit. null når toppen er nådd. */
const mulNext = t => { const g = goalMin(); if (t >= g) return null; const to = Math.min(g, Math.ceil((t + 1) / 60) * 60); return { min: to - t, x: mulAt(to) }; };
/* BUEN: dagens kampbonus som en halvsirkel fra start til dagsmålet. Prikkene er timene, de små ringene er dagens tre delmål (QUESTS).
   add = minuttene økta som er valgt, er verdt: det stykket tegnes svakt foran knotten, så en ser hvor langt den tar en. */
function bonusArc(td, tq, add) {
  const g = goalMin(), gh = Math.max(1, Math.round(g / 60)), top = goalTop(), f = Math.min(1, td / g), ax = 75, ay = 76, ar = 64;
  const pt = x => [ax - Math.cos(Math.PI * x) * ar, ay - Math.sin(Math.PI * x) * ar], arc = x => { const [px, py] = pt(x); return `M${ax - ar} ${ay}A${ar} ${ar} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`; };
  const hrs = Array.from({ length: gh - 1 }, (_, i) => { const x = (i + 1) * 60 / g, [px, py] = pt(x); return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="1.600" class="${td >= (i + 1) * 60 ? 'hd on' : 'hd'}"/>`; }).join('');
  const qs = QUESTS.filter(q => q.m < g).map(q => { const [px, py] = pt(q.m / g), on = tq >= q.m; return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" class="${on ? 'qd on' : 'qd'}"/>`; }).join('');
  const [kx, ky] = pt(f), f2 = add > 0 ? Math.min(1, (td + add) / g) : f, [gx, gy] = pt(f2);
  return `<div class="arc"><svg viewBox="0 0 150 84" aria-hidden="true"><path d="${arc(1)}" class="a0"/>${f2 > f + 0.005 ? `<path d="M${kx.toFixed(1)} ${ky.toFixed(1)}A${ar} ${ar} 0 0 1 ${gx.toFixed(1)} ${gy.toFixed(1)}" class="a2"/>` : ''}${f > 0.01 ? `<path d="${arc(f)}" class="a1"/>` : ''}${hrs}${qs}<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="6" class="kn"/></svg><div class="v"><b class="tn">×${mulAt(td).toFixed(1)}</b><small class="tn">${td >= g ? 'top bonus' : `max ×${top.toFixed(1)}`}</small></div></div>`;
}
/* Det som virker akkurat nå utover røkelsen og lokkemidlene i raden under Start: shiny-røkelsen, Prism Lure, bossens premie og Shiny Charm. */
function fxTags() {
  const out = [];
  if (shinyBoost() > 1) out.push(`<span class="tg au">${icn('spark')}×${shinyBoost()}<i class="sep"></i>${hLeft(S.shb.until - Date.now())}</span>`);
  if (S.prism) out.push(`<span class="tg au">${icn('spark')}Prism Lure</span>`);
  if (S.boost) out.push(`<span class="tg au"><i class="c"></i>×${S.boost.m}<i class="sep"></i>${S.boost.n}</span>`);
  if (S.purse) { const pc = Math.round((S.purse.m - 1) * 100); if (S.purse.day && S.purse.day === S.lad.day) out.push(`<span class="tg au purse"><i class="c"></i>Purse open<i class="sep"></i>+${pc} %</span>`); else if (!S.purse.day) out.push('<span class="tg purse wt"><i class="c"></i>Purse waiting</span>'); }
  return out.join('');
}
/* Eksamensperioden på forsiden: hvilket fag som er nærmest, og hvor mange dager. Utenfor perioden: at den er av (bonusen er da litt lavere). */
function examTag() {
  const fs = Object.keys(S.fag || {}); if (!fs.length) return '';
  if (!examOn()) return jOn() && !fs.some(f => S.fag[f].d) ? '' : `<button type="button" class="tg ex off" data-a="exam">${icn('cap')}Exam period off</button>`;
  const k = dayKey(), nx = Object.keys(S.fag).map(f => S.fag[f]).filter(g => g.d && g.xs && g.d >= k).sort((a, b) => a.d < b.d ? -1 : 1)[0];
  const dd = nx ? dIdx(nx.d) - dIdx(k) : 0;
  return `<button type="button" class="tg ex" data-a="exam">${icn('cap')}Exam period${nx ? `<i class="sep"></i>${esc(nx.n)} ${dd > 0 ? `in ${dd} d` : 'today'}` : ''}</button>`;
}
/* KJØP RETT FØR ØKTA (ønske 12): røkelsen og lokkemidlene under Start. Det som er aktivt, lyser; det som er låst, viser nivået.
   Ett trykk kjøper (handlingen buy), og linja over viser med en gang hva økta gir nå. Skjult til Shop er åpnet på reisen. */
const BOOSTS = ['incense', 'lure', 'slure'];
/* Det kjøpet sier når det gjelder neste økt: hva som nå er i gang. */
const BOUGHT = { incense: 'Incense lit: one extra encounter and rarer finds in your next session.', lure: `Lure on: one more encounter in each of your next ${LUREN} sessions.`, slure: `Super Lure on: rarer Pokémon in your next ${LUREN} sessions.` };
const boostState = k => { const it = SHOP[k]; return shopFull(k) ? 'on' : it.lv && tlv() < it.lv ? 'lk' : S.coins >= it.p ? 'ok' : 'no'; };
function boostRow() {
  if (jOn() && !has('shop')) return '';
  const ic = k => ballEl(k, '26px');
  return `<div class="boost" role="group" aria-label="For your next session">${BOOSTS.map(k => { const it = SHOP[k], st = boostState(k);
    const txt = st === 'on' ? (k === 'incense' ? 'lit' : `${S[k]} left`) : st === 'lk' ? `Level ${it.lv}` : nb(it.p);
    return `<button type="button" class="bo ${st}" data-a="${st === 'ok' ? 'buy' : 'boinfo'}" data-k="${k}" aria-label="${it.n}: ${st === 'on' ? 'active, ' + txt : st === 'lk' ? 'opens at trainer level ' + it.lv : nb(it.p) + ' coins'}"><span class="ic">${ic(k)}</span><span class="t"><b>${it.n}</b><i class="tn">${txt}</i></span></button>`; }).join('')}</div>`;
}
/* Arket bak Today-kortet: trinnene time for time, dagens tre delmål og det som virker nå. Her står forklaringene som før lå på forsiden. */
function todaySheet() {
  const td = todayMin(), L = S.log[dayKey()] || {}, tdb = L.b || 0, dx = L.x || 0, g = goalMin(), gh = Math.max(1, Math.round(g / 60)), top = goalTop(), t = td + tdb, nx = t < g ? Math.ceil((t + 1) / 60) * 60 : 0;
  const fx = [S.incOn ? 'Incense is lit for your next session.' : '', S.lure > 0 ? `Lure: one more encounter in your next ${S.lure} session${S.lure > 1 ? 's' : ''}.` : '', S.slure > 0 ? `Super Lure: rarer Pokémon in your next ${S.slure} session${S.slure > 1 ? 's' : ''}.` : '',
    shinyBoost() > 1 ? `${SHOP[S.shb.k] ? SHOP[S.shb.k].n : 'Shiny incense'}: shiny odds ×${shinyBoost()} for ${hLeft(S.shb.until - Date.now())} more.` : '', S.prism ? 'Prism Lure: the next raid has a 1 in 5 chance of being shiny.' : '',
    S.boost ? `Boss perk: ${S.boost.m}× coins for your next ${S.boost.n} session${S.boost.n > 1 ? 's' : ''}.` : '', S.charm > 0 ? `Shiny Charm: ${CHARM.m}× shiny odds for your next ${S.charm} focus session${S.charm > 1 ? 's' : ''}.` : ''].filter(Boolean);
  openSheet(`<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">Today</h2><span class="sm tn">${hm(td)} of ${hm(S.cap)}</span></div>
    <div><div class="row" style="justify-content:space-between;align-items:baseline"><span class="lab" style="margin:0">Battle bonus ${hq('bonus', 'What is the battle bonus?')}</span><b class="mulnow tn">×${mulAt(t).toFixed(1)}</b></div>
      <div class="mulsteps" style="--n:${gh}">${Array.from({ length: gh }, (_, i) => `<span class="${t >= (i + 1) * 60 ? 'on' : t > i * 60 ? 'cur' : ''}"><i>${i + 1} h</i><b>×${mulAt((i + 1) * 60).toFixed(1)}</b></span>`).join('')}</div>
      <p class="sm" style="margin-top:8px">${t >= g ? `Goal reached: battles pay ×${top.toFixed(1)} coins today.` : `It grows with every minute of focus and peaks at ×${top.toFixed(1)} at your goal of ${gh} h.${nx ? ` Next step: ×${mulAt(Math.min(g, nx)).toFixed(1)} in ${Math.min(g, nx) - t} min.` : ''}`}</p>
      ${examOn() ? `<p class="sm" style="color:var(--acc)">${tl('Exam period: the bonus and XP are at full strength.')}</p>` : Object.keys(S.fag || {}).length ? `<p class="sm">${tl('Outside the exam period the top bonus and XP are {p} % lower. Start it under Profile when your exams are near.', { p: Math.round((1 - EXN) * 100) })}</p>` : ''}
      ${dx ? `<p class="sm tn">Includes ${hm(dx)} of other things, counted as ${hm(dx * OTHERW)}.</p>` : ''}${tdb ? `<p class="sm tn">Work adds ${hm(tdb)} to the battle bonus today.</p>` : ''}${purseNote()}</div>
    <div><div class="lab">Goals today</div><div class="quests">${QUESTS.map(q => `<span class="${td >= q.m ? 'on' : ''}"><b>${td >= q.m ? '✓ ' : ''}${q.n}</b>${q.r}</span>`).join('')}</div></div>
    ${S.eggs.length ? `<div class="row"><span class="egg"></span><div class="sp"><div class="row sm tn" style="justify-content:space-between"><span>Egg${S.eggs.length > 1 ? ' (' + S.eggs.length + ')' : ''}</span><span>${S.eggs[0].need - S.eggs[0].got} min left</span></div><div class="bar gold" style="margin-top:5px"><i style="width:${Math.round(S.eggs[0].got / S.eggs[0].need * 100)}%"></i></div></div></div>` : ''}
    ${fx.length ? `<div><div class="lab">Active now</div>${fx.map(x => `<p class="sm" style="margin-top:4px">${x}</p>`).join('')}</div>` : ''}
    <button type="button" class="btn wide" data-a="close">Close</button>`);
}
/* FORSIDEN. Før «Done for today»: toppstripa, partneren i XP-ringen med laget under, økta (fag, lengde, Start og det som kan kjøpes til den),
   Today (buen) og «Done for today». Etterpå kommer reisen, raidet og kampene i tillegg (se nederst). Alt annet ligger bak et trykk. */
VIEW.fokus = () => {
  const p = partner(), fag = FAGS[U.fag] ? U.fag : curFag(), min = U.min || S.last.min, td = todayMin(), tdb = (S.log[dayKey()] || {}).b || 0, left = Math.max(0, S.cap - td), open = dayOpenQ();
  /* Andre aktiviteter enn fagene teller halvt (rateOf): em = det økta er verdt. */
  const w = rateOf(fag), em = Math.round(min * w), subj = Object.keys(FAGS).filter(isSubj), oth = Object.keys(FAGS).filter(k => !isSubj(k)), chip = k => `<button type="button" class="chip" data-a="fag" data-k="${k}" aria-pressed="${fag === k}">${esc(F(k).n)}</button>`;
  const rl = w === 1 ? left : Math.round(left / w), n = Math.floor(Math.min(min, rl) / 20) + (min >= 25 && rl >= min ? 1 : 0) + (S.incOn ? 1 : 0) + (S.lure > 0 ? 1 : 0);
  const rested = !(S.log[dayKey()] || {}).s, xp = Math.round(Math.min(min, rl) * 10 * (w === 1 ? 1 : OTHERXP) * exf() * (rested ? 1.5 : 1));
  const hasMore = (subj.length > 0 && oth.length > 0) || S.regions.length > 1, more = !!U.more || (subj.length > 0 && !isSubj(fag));
  let top = topBar(), h = '', hero = '';
  if (p) {
    const ev = evoOpts(p), nx = ev.find(x => !x.ok), rdy = ev.find(x => x.ok), a = xpAt(p.lv), b = xpAt(p.lv + 1), egg = S.eggs[0];
    hero = `<div class="hero" style="--tc:var(--t${mTypes(p)[0]})">
      ${egg ? `<button type="button" class="hside l" data-a="today" aria-label="Egg: ${egg.need - egg.got} minutes of focus left">${ringEl(52, 23, egg.got / egg.need, 3)}<span class="egg"></span><small class="tn">${egg.need - egg.got} min</small></button>` : ''}
      <button type="button" class="orb" data-a="mon" data-u="${p.u}" aria-label="${esc(mName(p))}, your partner, level ${p.lv}">${ringEl(148, 66, (p.xp - a) / (b - a), 3)}${spr(p.id, { it: p.item, ani: 1, sh: p.sh, mega: p.mega })}</button>
      ${S.pend.length ? `<button type="button" class="hside r" data-a="hunt" aria-label="${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'} waiting in the grass"><span class="grass live"><i></i><i></i><i></i><i></i></span><b class="tn">${S.pend.length}</b><small>in the grass</small></button>` : ''}
      <div class="pn">${esc(mName(p))}${gs(p)}</div><div class="pl tn">Level ${p.lv}${rdy ? ' · <b class="au">ready to evolve</b>' : nx ? ` · evolves ${nx.why}` : ''}</div>
      ${S.party.length > 1 || S.mons.length > 1 ? `<div class="bub">${S.party.slice(1).map(u => { const m = monBy(u); return m ? `<button type="button" data-a="mon" data-u="${m.u}" aria-label="${esc(mName(m))}, level ${m.lv}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '34px' })}</button>` : ''; }).join('')}${Array.from({ length: 6 - S.party.length }, () => '<i></i>').join('')}<${open ? 'button type="button" data-a="tab" data-k="lag"' : 'span'} class="n tn" aria-label="${S.mons.length} Pokémon in all${open ? '. Open Team' : ''}">${icn('box')}${S.mons.length}</${open ? 'button' : 'span'}></div>` : ''}</div>`;
  }
  const tys = F(fag).ty.map(t => `<span class="ty" style="background:var(--t${t})">${TYN[t]}</span>`).join('');
  const ses = `<div class="card ses"><div class="chips">${(subj.length ? subj : oth).map(chip).join('')}${hasMore ? `<button type="button" class="chip morec" data-a="smore" aria-expanded="${more}" aria-label="${more ? 'Fewer options' : 'More options'}">${icn(more ? 'x' : 'plus')}</button>` : ''}</div>
    ${more && subj.length ? `<div class="lab">Other things · half value for the battle bonus</div><div class="chips">${oth.map(chip).join('')}</div>` : ''}
    ${more && S.regions.length > 1 ? `<div class="lab">Routes · tap to turn on or off</div><div class="chips">${S.regions.map(r => `<button type="button" class="chip" data-a="reg" data-k="${r}" aria-pressed="${S.routes.includes(r)}">${REG[r].n}</button>`).join('')}</div>` : ''}
    <div class="chips len">${[25, 45, 60, 75, 90].map(m => `<button type="button" class="chip tn" data-a="min" data-k="${m}" aria-pressed="${min === m}" aria-label="${m} minutes">${m}</button>`).join('')}</div>
    <button type="button" class="go" data-a="start">Start ${min} min</button>
    <div class="meta tn">${left <= 0 ? `<span>${tl('Your team is tired today: half XP and no encounters.')}</span>` : `<span><b>${n}</b> ${n === 1 ? 'encounter' : 'encounters'}</span><span><b>${nb(xp)}</b> XP${rested ? ' <i class="au">rested</i>' : ''}</span>${tys}${w < 1 ? `<span class="half">${tl('counts half for the bonus')}</span>` : ''}`}</div>
    ${left > 0 ? boostRow() : ''}</div>`;
  const mnx = mulNext(td + tdb), sesOn = left > 0 && (!open || !!U.sopen);
  const today = `<div class="card today"><button type="button" class="tdb" data-a="today" aria-label="Today: ${hm(td)} of ${hm(S.cap)}. Battle bonus ×${mulAt(td + tdb).toFixed(1)}${mnx ? `, ×${mnx.x.toFixed(1)} in ${mnx.min} minutes` : ''}. Open the details">${bonusArc(td + tdb, td, sesOn ? em : 0)}<span class="tr"><span class="t tn"><b>${hm(td)}</b> of ${hm(S.cap)}</span>${mnx ? `<span class="nx tn">${icn('up')}<b>${mnx.min} min</b> to ×${mnx.x.toFixed(1)}</span>` : ''}<span class="tgs"><span class="tg">${icn('gift')}<span class="tn">${QUESTS.filter(q => td >= q.m).length}/${QUESTS.length}</span></span>${fxTags()}</span></span></button>${examTag()}</div>`;
  /* En vanlig dag ligger kampene nederst. På en eventdag står eventet og kampene øverst, og det som har med studeringen å gjøre, under. */
  const CL = clockLock(); if (CL) top += clockCard(CL);
  const fpk = S.fpk && Object.keys(S.fpk).length ? `<button type="button" class="btn wide gold" data-a="fpk">${icn('gift')}Open your free packs</button>` : '';
  if (!open) return top + hero + (S.raid && S.raid.ev && S.party.length ? raidCard() : '') + fpk + ses + today + wkStrip() + studyFoot() + admRow();
  /* Etter «Done for today»: økta er foldet sammen til én rad («Study more») til den åpnes. */
  const sesRow = U.sopen ? ses : `<button type="button" class="card sesrow" data-a="sopen" aria-expanded="false">${icn('clock')}<span class="sp"><b>Study more</b><span class="sm tn">${esc(F(fag).n)}<i class="sep"></i>${min} min</span></span>${icn('chev')}</button>`;
  const battles = S.party.length ? (has('battles') ? raidCard() + ladderCard() : lockCard('battles')) : '';
  return top + hero + newsEl() + journeyCard() + fpk + battles + wkStrip() + today + sesRow + admRow();
};

/* ---------- Laget, Box og Duplicates ---------- */
VIEW.lag = () => {
  const head = `<div class="row" style="justify-content:space-between"><h1 class="big">${U.lag === 'boks' ? 'Box' : U.lag === 'dup' ? 'Duplicates' : 'Team'}</h1>${coinEl(S.coins)}</div>
    <div class="seg">${[['lag', `Team · ${S.party.length}`], ['boks', `Box · ${S.mons.length}`], ['dup', `Duplicates · ${S.mons.length - new Set(S.mons.map(m => m.id)).size}`]].map(([k, n]) => `<button type="button" data-a="lagv" data-k="${k}" aria-pressed="${U.lag === k}">${n}</button>`).join('')}</div>`;
  return U.lag === 'dup' ? dupView(head) : U.lag === 'boks' ? boxView(head) : teamView(head);
};
/* BOX (ønske 5 og 20): delt inn etter region, med sortering etter styrke, sjeldenhet, nivå, nummer og nyeste, og filter for shiny og favoritter.
   Sjeldenheten tar med shiny, fødte stjerner og størrelse, og de legendariske står alltid øverst. Valgene huskes (S.bx: s = sortering,
   g = 0 når regionene er slått av). Søket og filtrene tegner bare rutene på nytt (boxGrid). */
const rareCmp = (a, b) => tierOf(b.id) - tierOf(a.id) || (b.sh ? 1 : 0) - (a.sh ? 1 : 0) || bornStars(b) - bornStars(a) || szOf(b) - szOf(a) || pwOf(b) - pwOf(a) || a.id - b.id;
const BOXSO = { sjelden: ['Rarity', rareCmp], pw: ['Power', (a, b) => pwOf(b) - pwOf(a) || a.id - b.id], niva: ['Level', (a, b) => b.lv - a.lv || pwOf(b) - pwOf(a)], nr: ['Number', (a, b) => a.id - b.id || pwOf(b) - pwOf(a)], ny: ['Newest', (a, b) => b.at - a.at] };
const bxSo = () => BOXSO[(S.bx || {}).s] ? S.bx.s : 'sjelden', bxGrp = () => (S.bx || {}).g !== 0;
function boxCell(m, so, evb) {
  const t = tierOf(m.id), eb = evb ? evBoost(m, evb) : null, sz = szOn() ? szOf(m) : 1;
  const sub = so === 'pw' ? `<span class="bx-v tn">${nb(pwOf(m))}</span>` : so === 'nr' ? `<span class="bx-v tn">#${m.id}</span>` : potOn() ? starRow(m) : '';
  return `<button type="button" class="bx r${t}${S.party.includes(m.u) ? ' inp' : ''}${eb && (eb.m > 1 || eb.mega) ? ' evc' : ''}" data-a="mon" data-u="${m.u}" aria-label="${esc(mName(m))}, level ${m.lv}, ${TIERS[t]}${m.sh ? ', shiny' : ''}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, lazy: 1 })}<span class="bx-n">${esc(mName(m))}</span>${sub}<span class="bx-l tn">${m.lv}</span>${m.fav ? '<span class="bx-f">♥</span>' : ''}${sz !== 1 ? `<span class="bx-z sz${sz}" title="${SZN[sz]}">${SZN[sz][0]}</span>` : ''}${hasNews(m) ? '<span class="bang">!</span>' : ''}</button>`;
}
function boxGrid() {
  const so = bxSo(), q = (U.bxq || '').trim().toLowerCase(), evb = typeof evNow === 'function' ? evNow() : null;
  let l = S.mons.slice(); if (U.bxf === 'sh') l = l.filter(m => m.sh); else if (U.bxf === 'fav') l = l.filter(m => m.fav);
  if (q) l = l.filter(m => (mName(m) + ' ' + D(m.id)[0] + ' ' + mTypes(m).filter(t => t >= 0).map(t => TYN[t]).join(' ')).toLowerCase().includes(q));
  if (!l.length) return `<p class="sm" style="text-align:center;padding:18px 0">${q ? 'Nothing matches.' : U.bxf === 'sh' ? tl('No shiny Pokémon yet. They are rare: one may turn up in any session, pack or egg.') : 'No favourites yet. Tap the heart on a card.'}</p>`;
  l.sort(BOXSO[so][1]);
  if (!bxGrp()) return `<div class="bxg">${l.map(m => boxCell(m, so, evb)).join('')}</div>`;
  return [1, 2, 3, 4, 5].map(r => { const x = l.filter(m => regOf(m.id) === r); return x.length ? `<section class="bxs"><h2 class="bxh"><b>${REG[r].n}</b><span class="tn">${x.length}</span></h2><div class="bxg">${x.map(m => boxCell(m, so, evb)).join('')}</div></section>` : ''; }).join('');
}
function boxView(head) {
  const so = bxSo(), nsh = S.mons.filter(m => m.sh).length, nfav = S.mons.filter(m => m.fav).length, evb = typeof evNow === 'function' ? evNow() : null;
  return `${head}
    <div class="bxc"><input class="swq" type="search" data-q="bx" value="${esc(U.bxq || '')}" placeholder="Search name or type" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search the Box">
      <div class="chips bxso" role="group" aria-label="Sort">${Object.keys(BOXSO).map(k => `<button type="button" class="chip" data-a="sort" data-k="${k}" aria-pressed="${so === k}">${BOXSO[k][0]}</button>`).join('')}</div>
      <div class="chips bxfl"><button type="button" class="chip" data-a="bxg" aria-pressed="${bxGrp()}">${icn('globe')}Regions</button><button type="button" class="chip" data-a="bxf" data-k="sh" aria-pressed="${U.bxf === 'sh'}"${nsh ? '' : ' disabled'}>${icn('spark')}Shiny${nsh ? ` · ${nsh}` : ''}</button><button type="button" class="chip" data-a="bxf" data-k="fav" aria-pressed="${U.bxf === 'fav'}"${nfav ? '' : ' disabled'}>${icn('heart')}Favourites${nfav ? ` · ${nfav}` : ''}</button></div></div>
    <div id="bxl">${boxGrid()}</div>
    <p class="sm bxk"><span><i class="k-t"></i>on the team</span><span><i class="k-r r2"></i>rare</span><span><i class="k-r r3"></i>epic</span><span><i class="k-r r4"></i>legendary</span>${evb && (evb.k === 'surge' || EVSTAT[evb.k]) ? `<span>${tl('a glowing corner: gets today\'s bonus')}</span>` : ''}</p>`;
}
/* DUPLICATES (ønske 6): per art blir den største og den med flest fødte stjerner. Lista viser hvem som blir og hvem som selges, og et trykk bytter.
   Laget, shinies, favoritter og trente står med grunnen og røres ikke herfra. */
function dupView(head) {
  const G = dupGroups(), du = dupes(), val = du.reduce((s, m) => s + sellValue(m), 0);
  const row = (m, g) => { const why = dupWhy(m), keep = why ? '' : dupKeep(m, g), sz = szOn() ? szOf(m) : 1;
    return `<div class="dr${why ? ' pr' : keep ? ' kp' : ' sl'}"><button type="button" class="dr-m" data-a="mon" data-u="${m.u}" aria-label="${esc(mName(m))}, level ${m.lv}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '44px', lazy: 1 })}<span class="sp"><span class="dr-n tn"><b>Lv ${m.lv}</b>${sz !== 1 ? szTag(m) : ''}${potOn() ? `<span class="sm">${NAT[m.nat]}</span>` : ''}${(m.em || []).length ? `<span class="pill eggp">Egg: ${esc(MOVES[m.em[0]][0])}</span>` : ''}</span><span class="dr-s tn">${potOn() ? starRow(m) : ''}<span>${nb(pwOf(m))} power</span></span></span></button>
      ${why ? `<span class="pill dr-w">${why}</span>` : `<button type="button" class="dr-t" data-a="dupt" data-u="${m.u}" aria-pressed="${!!keep}" aria-label="${keep ? 'Stays: ' + keep + '. Tap to sell it with the rest' : 'Sells for ' + sellValue(m) + ' coins. Tap to keep it'}"><b>${keep ? 'Stays' : 'Sells'}</b><small class="tn">${keep ? keep : coinEl(sellValue(m))}</small></button>`}</div>`; };
  if (!G.length) return `${head}<div class="card"><p class="sm" style="text-align:center">${tl('No duplicates right now. When you catch a species you already have, it shows up here.')}</p></div>`;
  /* Artene der noe selges, står først. */
  const any = g => g.list.some(m => !dupWhy(m) && !dupKeep(m, g)), GG = G.filter(any).concat(G.filter(g => !any(g)));
  return `${head}
    <p class="sm">${tl('Of each species the biggest and the one born with the most stars stay. Level does not count: it can be trained. Tap Stays or Sells to change one.')}</p>
    ${du.length ? `<button type="button" class="btn wide gold" data-a="selldupes">Sell ${du.length} for ${coinEl(val)}</button>` : `<p class="sm tn" style="text-align:center">${tl('Nothing is marked to be sold.')}</p>`}
    <div class="stack">${GG.map(g => `<div class="card dg"><div class="dg-h"><b>${esc(D(g.id)[0])}</b><span class="sm tn">× ${g.list.length}</span>${tierEl(g.id)}</div>${g.list.map(m => row(m, g)).join('')}</div>`).join('')}</div>
    <p class="sm">${tl('The team, shinies, favourites and trained ones are never sold from here. The ones that stay sell for more if you ever sell them from their own card.')}</p>
    ${S.mons.some(m => (m.em || []).length) ? `<p class="sm">${tl('An egg move is never lost: when one that knows it is sold, another of the same family learns it.')}</p>` : ''}`;
}
/* Sekskanten: hver akse viser staten målt mot en sterk art (base 130) på samme nivå. */
/* Base stats, vist som på pokemondb.net: tallet og en farget stolpe for hver verdi, og summen nederst. Fargen følger verdien (rød under 30, oransje
   til 59, gul til 89, lysegrønn til 119, grønn til 149, turkis fra 150), og stolpen er full ved 180. */
const BSC = v => v < 30 ? '#e2574c' : v < 60 ? '#e8913d' : v < 90 ? '#e6c84f' : v < 120 ? '#a5cf3f' : v < 150 ? '#3fbf6e' : '#31b8b0';
function bstEl(id, mega, sh) {
  const b = mega ? MEGA[mega - 1][4] : BST[id - 1], tot = b.reduce((a, c) => a + c, 0);
  return `<div class="bst" role="table" aria-label="Base stats">${['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'].map((n, i) => `<div role="row"><span role="cell">${n}</span><b class="tn" role="cell">${b[i]}</b><span class="bst-b" role="cell" aria-hidden="true"><i style="width:${Math.min(100, Math.round(b[i] / 180 * 100))}%;background:${BSC(b[i])}"></i></span></div>`).join('')}<div class="bst-t" role="row"><span role="cell">Total</span><b class="tn" role="cell">${tot}</b><span class="sm" role="cell">${sh ? `Shiny: every stat is ${id === ARCEUS ? Math.round((SHINYARC - 1) * 100) : Math.round((SHINYST - 1) * 100)} % higher` : ''}</span></div></div>`;
}
function hexEl(m) {
  const st = statsOf(m), pot = potOn(), up = pot ? natUp(m.nat) : 0, dn = pot ? natDn(m.nat) : 0, cx = 130, cy = 104, R = 64, zs = szOn() && m.id !== 292 ? szOf(m) : 1;
  const ref = i => i === 0 ? Math.floor(291 * m.lv / 100) + m.lv + 10 : Math.floor(291 * m.lv / 100) + 5;
  const pt = (i, f) => { const a = (-90 + i * 60) * Math.PI / 180; return [Math.round((cx + Math.cos(a) * R * f) * 10) / 10, Math.round((cy + Math.sin(a) * R * f) * 10) / 10]; };
  const order = [0, 1, 2, 5, 4, 3], ring = f => order.map((_, k) => pt(k, f).join(',')).join(' ');
  const shape = order.map((s, k) => pt(k, Math.max(0.14, Math.min(1, st[s] / ref(s)))).join(',')).join(' ');
  const lab = order.map((s, k) => { const [x, y] = pt(k, 1.36), col = up !== dn && s === up || s === 0 && zs > 1 ? 'var(--good)' : up !== dn && s === dn || s === 0 && zs < 1 ? 'var(--red)' : 'var(--ink2)';
    return `<text x="${x}" y="${y - 3}" text-anchor="middle" font-size="10.5" font-weight="650" fill="${col}">${SN[s]}</text><text x="${x}" y="${y + 11}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--ink)">${st[s]}</text>`; }).join('');
  return `<svg class="hex" viewBox="0 0 260 208" role="img" aria-label="${order.map(s => SN[s] + ' ' + st[s]).join(', ')}"><polygon points="${ring(1)}" fill="var(--soft)" stroke="var(--line)"/><polygon points="${ring(0.5)}" fill="none" stroke="var(--line)" stroke-opacity=".7"/>${order.map((_, k) => `<line x1="${cx}" y1="${cy}" x2="${pt(k, 1)[0]}" y2="${pt(k, 1)[1]}" stroke="var(--line)" stroke-opacity=".6"/>`).join('')}<polygon points="${shape}" fill="var(--tc)" fill-opacity=".38" stroke="var(--tc)" stroke-width="2" stroke-linejoin="round"/>${lab}</svg>`;
}
const CLS = ['Status', 'Physical', 'Special'];
const moveEl = (x, o = {}) => { const mv = o.m && MOVES[x][0] === 'Hidden Power' && o.m.iv ? mvEff(null, { src: o.m }, MOVES[x]) : MOVES[x]; return `<${o.btn ? `button type="button" data-a="${o.act || 'mvtog'}" data-k="${x}" aria-pressed="${o.on ? 'true' : 'false'}"` : 'div'} class="mvc" style="--c:var(--t${mv[1]})"><b>${esc(mv[0])}</b><span><i></i>${TYN[mv[1]]} · ${CLS[mv[4]]}${mv[2] ? ' · ' + mv[2] : ''}</span></${o.btn ? 'button' : 'div'}>`; };
/* Utviklingsveien med nivå eller stein mellom hvert ledd. cur = arten som er uthevet. */
function evoLine(id, cur) {
  let b = id; while (D(b)[4]) b = D(b)[4];
  if (!(EVO[b] || []).length) return '';
  const cell = x => `<span class="evc${x === cur ? ' cur' : ''}">${S.caught[x] || S.seen[x] || x === cur ? spr(x, { sil: !S.caught[x], s: '46px' }) : '<span class="q">?</span>'}</span>`;
  const how = x => { const d = D(x); return d[5] ? 'Lv ' + d[5] : D(d[4])[6] & 4 ? 'Lv 10' : 'Stone'; };
  const walk = x => (EVO[x] || []).map(y => `<span class="evs"><span class="evw">${how(y)}</span>${cell(y)}${walk(y)}</span>`).join('');
  return `<div><div class="lab">Evolution</div><div class="evo">${cell(b)}${walk(b)}</div></div>`;
}
/* Egenskapen (Ability) til arten, hvis den har en av dem kampene bruker. */
const abLine = (id, mega) => { const a = typeof abilityOf === 'function' ? abilityOf(id, mega) : ''; return a ? `<p class="sm" style="margin-top:8px;text-align:center"><b>Ability · ${ABN[a]}</b><br><span class="mut">${ABTXT[a]}</span></p>` : ''; };
/* ---------- Byggeklosser til Team, Box og kortet (steg 1.6) ---------- */
/* TYPEIKONENE (ønske 2): egne, enkle tegn, ett per type, i en liten sirkel i typens farge. */
const TYG = ['M12 6.500a5.500 5.500 0 1 0 0 11a5.500 5.500 0 0 0 0-11z',
  'M7 11.500h10v2.500a5 5 0 0 1-10 0zM7 11.500V9a1.700 1.700 0 0 1 3.400 0v2.500M10.400 11.500V7.800a1.700 1.700 0 0 1 3.400 0v3.700M13.800 11.500V9a1.600 1.600 0 0 1 3.200 0v2.500',
  'M2.500 9.500c4-.8 7.200 1.500 9.500 6.500c2.300-5 5.500-7.300 9.500-6.500M12 16v2.500',
  'M9 14.500a3.500 3.500 0 1 0 0-7a3.500 3.500 0 0 0 0 7zM16.200 11.500a2 2 0 1 0 0-4a2 2 0 0 0 0 4zM14.500 19a2.500 2.500 0 1 0 0-5a2.500 2.500 0 0 0 0 5z',
  'M4 8.500h16M6.500 13h11M9.500 17.500h5',
  'M9 5l7 1.500l3 6l-3.500 6.500h-7L5 13zM9 5l2.500 7.500l-3 6.500M11.500 12.500H19',
  'M12 8.500a4.500 5.500 0 1 0 0 11a4.500 5.500 0 0 0 0-11zM9.800 8.300L8 4.500M14.200 8.300L16 4.500M7.500 14h9',
  'M6.500 19.500v-8.500a5.500 5.500 0 0 1 11 0v8.500l-2.750-2l-2.750 2l-2.750-2zM10 11.300v.4M14 11.300v.4',
  'M12 4l7 4v8l-7 4l-7-4V8zM12 9.500a2.500 2.500 0 1 0 0 5a2.500 2.500 0 0 0 0-5z',
  'M12.500 3.500c.6 3.600 5 5.600 5 10.200a5.500 5.500 0 0 1-11 0c0-2.200 1-3.800 2.200-4.900c.4 1.500 1 2.300 2 2.900c.2-3-.3-5.700 1.800-8.200z',
  'M12 4c3 4 5.500 6.800 5.500 10a5.500 5.500 0 0 1-11 0c0-3.200 2.500-6 5.500-10z',
  'M5.500 18.500c0-7.500 4.500-12.500 13-13c0 8.500-5 13-13 13zM5.500 18.500l8-8',
  'M13.200 3.500L6 13.500h5l-1.200 7L17 10h-5z',
  'M3 12c2.500-4 5.500-6 9-6s6.500 2 9 6c-2.500 4-5.500 6-9 6s-6.500-2-9-6zM12 9.500a2.500 2.500 0 1 0 0 5a2.500 2.500 0 0 0 0-5z',
  'M12 4v16M5 8l14 8M19 8L5 16M12 4l-2 2M12 4l2 2M12 20l-2-2M12 20l2-2',
  'M8 4.500c0 6 1.500 10.500 4 15.500c2.500-5 4-9.500 4-15.500c-2.500 1.500-5.500 1.500-8 0z',
  'M19 14.500A7.500 7.500 0 0 1 9.500 5a7.500 7.500 0 1 0 9.500 9.500z',
  'M12 4c.8 4.500 2.700 6.400 8 8c-5.300 1.600-7.200 3.500-8 8c-.8-4.500-2.700-6.400-8-8c5.300-1.600 7.200-3.500 8-8z'];
const tyIc = (t, cls) => t >= 0 && TYG[t] ? `<span class="tyi${cls ? ' ' + cls : ''}" style="--c:var(--t${t})" title="${TYN[t]}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${TYG[t]}"/></svg></span>` : '';
const tyChip = t => `<span class="ty tyk" style="background:var(--t${t})"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${TYG[t]}"/></svg>${TYN[t]}</span>`;
const mTyIcs = m => mTypes(m).filter(t => t >= 0).map(t => tyIc(t)).join(''), mTyChips = m => mTypes(m).filter(t => t >= 0).map(tyChip).join('');
/* Stjerneraden (ønske 18): de fødte stjernene fylt, de fra hypertrening dempet, resten tomme. Størrelsen står bare når den ikke er Normal. */
const JT = ['Decent', 'Above average', 'Great', 'Outstanding', 'Flawless'];
const starRow = (m, cls) => { const b = bornStars(m), n = nowStars(m); return `<span class="strs${cls ? ' ' + cls : ''}" role="img" aria-label="Born with ${b} of 5 stars${n > b ? ', ' + n + ' with training' : ''}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < b ? 'on' : i < n ? 'tr' : ''}"></i>`).join('')}</span>`; };
/* big = på kortet: med ikonet, så det er tydelig at brikken er størrelsen. I listene er det bare ordet. */
const szTag = (m, big) => szOn() && szOf(m) !== 1 ? `<span class="szt sz${szOf(m)}${big ? ' big' : ''}">${big ? icn('size') : ''}${SZN[szOf(m)]}</span>` : '';
/* Hva størrelsen gjør, sagt som naturen under sekskanten: «Large ▲ HP +3 %». Shedinja har alltid 1 HP. */
const szLine = m => { const z = szOf(m); return szOn() && z !== 1 && m.id !== 292 ? `<div class="mc-n mc-z"><b>${icn('size')}${SZN[z]}</b><span class="${z > 1 ? 'up' : 'dn'}">${icn(z > 1 ? 'up' : 'dn')}HP</span><span class="tn zp">${z > 1 ? '+' : '−'}${Math.abs(Math.round((SZHP[z] - 1) * 100))} %</span></div>` : ''; };
/* Potensialet (stjernene og naturen) vises på reisen først når det er forklart (studiedag 4). */
const potOn = () => !jOn() || has('nature');
const mcat = c => `<span class="mcat s ${['stt', 'ph', 'spc'][c]}" title="${CLS[c]}"></span>`;
/* Tegner innholdet i arket som står åpent på nytt, uten at det glir inn igjen og uten å miste plassen i rullingen. */
function reSheet(html) { const w = $('#sheet'), s = w.querySelector('.sheet'); if (w.hidden || !s) return openSheet(html); const y = s.scrollTop; s.innerHTML = SHTOP + html; s.scrollTop = y; }
/* Forklaringen som vises én gang (S.tip[k]) og kvitteres med OK. */
const tipEl = (k, txt, lvl) => (S.tip && S.tip[k]) || know() > (lvl == null ? 2 : lvl) ? '' : `<div class="tipc">${icn('info')}<p class="sm">${txt}</p><button type="button" class="btn sm2" data-a="tipok" data-k="${k}">OK</button></div>`;
/* Kortet til en Pokémon forklarer én ny ting om gangen, første gang den står der: typer (for den som er ny), stjernene og naturen (når potensial
   er åpnet), og størrelsen (ny for alle). Neste forklaring kommer neste gang et kort åpnes. */
function cardTip(m) {
  const sz = szOf(m), up = natUp(m.nat), dn = natDn(m.nat);
  return tipEl('ty', tl('Every Pokémon and every move has a type. Types beat each other like rock, paper, scissors: Water beats Fire, Fire beats Grass, Grass beats Water.'), 0)
    || (potOn() ? tipEl('st', tl('Filled stars are what it was born with, and they never change. Fainter stars come from training.'), 1) : '')
    || (potOn() && up !== dn ? tipEl('nat', tl('Its nature, {n}, lifts {a} by 10 % and lowers {b}.', { n: NAT[m.nat], a: SN[up], b: SN[dn] }), 1) : '')
    || (szOn() && sz !== 1 ? tipEl('sz', tl('{n}: {p} % HP against a Normal one. Size is something it is born with, and it can never be trained.', { n: SZN[sz], p: (SZHP[sz] > 1 ? '+' : '') + Math.round((SZHP[sz] - 1) * 100) })) : '');
}

/* ---------- Team ---------- */
/* Lagkortene (ønske 1, 2 og 20): typen som et preg i kortet og som ikon, styrken slik den faktisk er, stjernene, og bytt rett fra kortet.
   U.tord = 'pw' viser laget med den sterkeste øverst (rekkefølgen på laget endres ikke). U.cmp = [] når to skal velges til sammenligning. */
function teamView(head) {
  const cmp = U.cmp, mons = S.party.map(monBy).filter(Boolean), list = U.tord === 'pw' ? mons.slice().sort((a, b) => pwOf(b) - pwOf(a)) : mons, best = Math.max(1, ...mons.map(pwOf));
  const card = m => {
    const i = S.party.indexOf(m.u), a = xpAt(m.lv), b = xpAt(m.lv + 1), rdy = evoOpts(m).some(x => x.ok), ty = mTypes(m), sel = cmp && cmp.includes(m.u), pw = pwOf(m);
    return `<div class="tc${i ? '' : ' lead'}${sel ? ' sel' : ''}" style="--tc:var(--t${ty[0]});--tc2:var(--t${ty[1] >= 0 ? ty[1] : ty[0]})">
      <button type="button" class="tc-m" data-a="${cmp ? 'cmpick' : 'mon'}" data-u="${m.u}" aria-label="${esc(mName(m))}, level ${m.lv}, power ${pw}${i ? '' : ', your partner'}${cmp ? '. Pick to compare' : ''}">${hasNews(m) ? '<span class="bang abs" title="New move">!</span>' : ''}
        <span class="tc-o">${spr(m.id, { it: m.item, ani: !i, sh: m.sh, mega: m.mega, s: i ? '58px' : '72px' })}</span>
        <span class="sp"><span class="tc-n"><b>${esc(mName(m))}${gs(m)}</b>${i ? '' : '<span class="pill ptn">Partner</span>'}${szTag(m)}${typeof evTag === 'function' ? evTag(m) : ''}${rdy ? '<span class="pill au">Can evolve</span>' : ''}</span>
          <span class="tc-s tn">${mTyIcs(m)}<span>Lv ${m.lv}</span>${potOn() ? starRow(m) : ''}</span>
          <span class="tc-b"><i style="width:${Math.round(pw / best * 100)}%"></i></span></span>
        <span class="tc-p tn"><b>${nb(pw)}</b><small>power</small></span></button>
      ${cmp ? '' : `<button type="button" class="tc-x" data-a="tsw" data-u="${m.u}" aria-label="Swap ${esc(mName(m))} for another Pokémon">${icn('swap')}</button>`}</div>`; };
  const empty = S.party.length < 6 && !cmp ? `<button type="button" class="tc empty" data-a="tsw" data-u="0">${icn('plus')}<span>${S.mons.length > S.party.length ? 'Add a Pokémon' : 'An empty place'}</span><small class="tn">${S.party.length}/6</small></button>` : '';
  return `${head}${lockEl()}
    <div class="tctl"><div class="seg sm2" role="group" aria-label="Order"><button type="button" data-a="tord" data-k="" aria-pressed="${U.tord !== 'pw'}">Team order</button><button type="button" data-a="tord" data-k="pw" aria-pressed="${U.tord === 'pw'}">Strongest</button></div>
      ${mons.length > 1 ? `<button type="button" class="chip cmpb" data-a="cmp" aria-pressed="${!!cmp}">${icn('scale')}Compare</button>` : ''}</div>
    ${cmp ? `<p class="sm tcmp">${tl('Tap two to see them side by side.')}</p>` : tipEl('pw', tl('Power is what a Pokémon really brings right now: level, training, nature, shiny and size all count, not only the species.'))}
    <div class="stack tcs">${list.map(card).join('')}${empty}</div>`;
}
/* En rad i velgerne: bildet, navnet, nivået, typen, stjernene og styrken. o.ref = styrken den måles mot (forskjellen vises), o.act = handlingen,
   o.x = knapp til høyre, o.tag = merke etter navnet. */
function monRow(m, o) {
  o = o || {}; const pw = pwOf(m), d = o.ref ? pw - o.ref : 0, ty = mTypes(m);
  return `<div class="mr" style="--tc:var(--t${ty[0]})"><button type="button" class="mr-m" data-a="${o.act || 'mon'}" data-u="${m.u}" aria-label="${esc(mName(m))}, level ${m.lv}, power ${pw}${o.ref ? (d >= 0 ? ', ' + d + ' stronger' : ', ' + -d + ' weaker') : ''}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '46px', lazy: 1 })}
      <span class="sp"><span class="mr-n"><b>${esc(mName(m))}${gs(m)}</b>${szTag(m)}${o.tag || ''}${m.fav ? '<i class="fv">♥</i>' : ''}</span><span class="tc-s tn">${mTyIcs(m)}<span>Lv ${m.lv}</span>${potOn() ? starRow(m) : ''}</span></span>
      <span class="mr-p tn"><b>${nb(pw)}</b>${o.ref ? `<small class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '▲ ' + nb(d) : d < 0 ? '▼ ' + nb(-d) : '='}</small>` : '<small>power</small>'}</span></button>${o.x || ''}</div>`;
}
/* BYTT RETT FRA TEAM (ønske 1 og 20). U.sw = { mode, u }:
     swap = plassen til u på laget (0 = en ledig plass): de som ikke er på laget, sterkest først. Trykk = bytt inn. Vekta = sammenlign først.
     cmp  = velg hvem u skal sammenlignes med (alle andre, laget først).
     slot = u skal inn på et fullt lag: velg hvem som går ut.
   Søket (U.swq) og sorteringen (U.sws) tegner bare lista på nytt (swapList). */
const SWSO = { pw: ['Power', (a, b) => pwOf(b) - pwOf(a)], lv: ['Level', (a, b) => b.lv - a.lv || pwOf(b) - pwOf(a)], rare: ['Rarity', (a, b) => tierOf(b.id) - tierOf(a.id) || b.sh - a.sh || pwOf(b) - pwOf(a)], ny: ['Newest', (a, b) => b.at - a.at] };
function swapList() {
  const w = U.sw || {}, cur = monBy(w.u), q = (U.swq || '').trim().toLowerCase(), so = SWSO[U.sws] ? U.sws : 'pw', ref = cur ? pwOf(cur) : 0;
  let pool = w.mode === 'slot' ? S.party.map(monBy).filter(Boolean) : w.mode === 'cmp' ? S.mons.filter(m => m.u !== w.u) : S.mons.filter(m => !S.party.includes(m.u));
  if (q) pool = pool.filter(m => (mName(m) + ' ' + D(m.id)[0] + ' ' + mTypes(m).filter(t => t >= 0).map(t => TYN[t]).join(' ')).toLowerCase().includes(q));
  const list = w.mode === 'slot' ? pool : pool.slice().sort(SWSO[so][1]);
  if (w.mode === 'cmp' && !q) list.sort((a, b) => S.party.includes(b.u) - S.party.includes(a.u));
  if (!list.length) return `<p class="sm" style="text-align:center;padding:14px 0">${q ? 'Nothing matches.' : w.mode === 'swap' ? tl('Everyone you have is on the team. Catch more in the grass or open a pack.') : 'Nobody else yet.'}</p>`;
  return list.slice(0, 80).map(m => monRow(m, { act: 'tswp', ref: w.mode === 'cmp' ? 0 : ref, tag: S.party.includes(m.u) && w.mode !== 'slot' ? '<span class="pill ptn">Team</span>' : '',
    x: w.mode === 'swap' && cur ? `<button type="button" class="mr-x" data-a="tswc" data-u="${m.u}" aria-label="Compare ${esc(mName(m))} with ${esc(mName(cur))}">${icn('scale')}</button>` : '' })).join('') + (list.length > 80 ? `<p class="sm" style="text-align:center">${list.length - 80} more: search to find them.</p>` : '');
}
function swapSheet(re) {
  const w = U.sw || {}, cur = monBy(w.u), inP = cur && S.party.includes(cur.u), lead = cur && S.party[0] === cur.u, so = SWSO[U.sws] ? U.sws : 'pw';
  const title = w.mode === 'cmp' ? `Compare ${esc(mName(cur))} with` : w.mode === 'slot' ? 'Who steps out?' : cur ? `Swap ${esc(mName(cur))}` : 'Add to the team';
  const top = cur ? `<div class="swcur">${monRow(cur, { act: 'mon', tag: w.mode === 'slot' ? '<span class="pill au">coming in</span>' : lead ? '<span class="pill ptn">Partner</span>' : '' })}${w.mode === 'swap' && inP ? `<div class="row">${lead ? '' : `<button type="button" class="btn sm2 sp" data-a="lead" data-u="${cur.u}">Make partner</button>`}<button type="button" class="btn sm2 sp" data-a="tswr" data-u="${cur.u}"${S.party.length < 2 ? ' disabled' : ''}>Take off the team</button></div>` : ''}</div>` : '';
  const html = `<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">${title}</h2></div>
    ${top}
    ${w.mode === 'slot' ? `<p class="sm">${tl('The team is full. Tap the one that should make room.')}</p>` : `<div class="swf"><input class="swq" type="search" data-q="sw" value="${esc(U.swq || '')}" placeholder="Search name or type" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search">
      <div class="chips swso">${Object.keys(SWSO).map(k => `<button type="button" class="chip" data-a="tsws" data-k="${k}" aria-pressed="${so === k}">${SWSO[k][0]}</button>`).join('')}</div></div>`}
    <div class="mrl" id="swl">${swapList()}</div>`;
  re ? reSheet(html) : openSheet(html);
}
/* SAMMENLIGN TO (ønske 20): styrken fremst, så hver verdi side om side med den høyeste uthevet. Er den ene på laget og den andre ikke, kan de byttes her. */
function cmpSheet(a, b) {
  if (!a || !b) return;
  const sa = statsOf(a), sb = statsOf(b), pa = pwOf(a), pb = pwOf(b), mx = Math.max(...sa, ...sb, 1), inA = S.party.includes(a.u), inB = S.party.includes(b.u);
  const col = (m, pw, win) => `<button type="button" class="cm-c${win ? ' win' : ''}" data-a="mon" data-u="${m.u}" style="--tc:var(--t${mTypes(m)[0]})">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '76px' })}<b>${esc(mName(m))}${gs(m)}</b><span class="tc-s tn">${mTyIcs(m)}<span>Lv ${m.lv}</span></span>${potOn() ? starRow(m) : ''}<span class="cm-t">${szTag(m)}${S.party.includes(m.u) ? '<span class="pill ptn">Team</span>' : ''}</span><span class="cm-p tn"><b>${nb(pw)}</b><small>power</small></span></button>`;
  const row = (n, x, y) => `<div class="cm-r"><b class="tn${x > y ? ' w' : ''}">${x}</b><span class="cm-b l"><i style="width:${Math.round(x / mx * 100)}%"></i></span><span class="cm-n">${n}</span><span class="cm-b"><i style="width:${Math.round(y / mx * 100)}%"></i></span><b class="tn${y > x ? ' w' : ''}">${y}</b></div>`;
  const nat = m => { const up = natUp(m.nat), dn = natDn(m.nat); return `${NAT[m.nat]}${up !== dn ? ` · +${SN[up]} −${SN[dn]}` : ''}`; };
  const swap = inA !== inB ? `<button type="button" class="btn pri wide" data-a="tswgo" data-u="${inA ? b.u : a.u}" data-o="${inA ? a.u : b.u}">Put ${esc(mName(inA ? b : a))} in for ${esc(mName(inA ? a : b))}</button>` : '';
  openSheet(`<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">Compare</h2></div>
    <div class="cm-h">${col(a, pa, pa > pb)}<span class="cm-d tn">${pa === pb ? '=' : `${pa > pb ? '◀' : '▶'} ${nb(Math.abs(pa - pb))}`}</span>${col(b, pb, pb > pa)}</div>
    <div class="cm">${SN.map((n, i) => row(n, sa[i], sb[i])).join('')}</div>
    ${potOn() ? `<div class="cm-x sm"><span>${nat(a)}</span><span>Nature</span><span>${nat(b)}</span></div>` : ''}
    <p class="sm">${tl('The numbers are what each one has right now. A lower level catches up as it grows; stars and size do not change.')}</p>
    ${swap}${U.sw ? '<button type="button" class="btn wide nf" data-a="tswb">Back</button>' : ''}`);
}

/* ---------- Kortet til en Pokémon ---------- */
const mvTile = (x, m, on) => { const i = mvInfo(x, m); return `<button type="button" class="mvt${i.dead ? ' dead' : ''}" data-a="mvinfo" data-k="${x}" data-u="${m.u}" aria-pressed="${on ? 'true' : 'false'}" style="--c:var(--t${i.ty})">${tyIc(i.ty)}<span class="sp"><b>${esc(i.n)}</b><small class="tn">${mcat(i.cls)}${i.cls ? i.pw : 'Status'}${(m.em || []).includes(x) ? ' · <i class="eggm">Egg move</i>' : ''}</small></span></button>`; };
/* Forklaringen til ett angrep: den samme overalt (kortet, angrepsvalget, kampen). */
const mvxEl = (x, m) => { const i = mvInfo(x, m); return `<div class="mvx" style="--c:var(--t${i.ty})"><div class="mvx-h"><b>${esc(i.n)}</b>${tyChip(i.ty)}<span class="mvx-c">${mcat(i.cls)}${CLS[i.cls]}</span></div><div class="mvx-n tn">${i.cls ? `<span>Power <b>${i.pw}</b></span>` : ''}${i.acc ? `<span>${i.acc === 'never misses' ? 'Never misses' : 'Accuracy <b>' + i.acc + '</b>'}</span>` : ''}<span>PP <b>${i.pp}</b></span></div>${i.txt ? `<p class="sm">${esc(i.txt)}</p>` : ''}</div>`; };
/* En rad med et angrep og forklaringen: i angrepsvalget (o.act = 'mvtog', o.on), i «wants to learn» (o.act = 'lforget') og i «Learns later» (o.lv). */
function mvRow(x, m, o) {
  o = o || {}; const i = mvInfo(x, m), tag = o.act ? `button type="button" data-a="${o.act}" data-k="${x}"${o.on != null ? ` aria-pressed="${!!o.on}"` : ''}` : 'div';
  return `<${tag} class="mvr${o.lv ? ' lt' : ''}${i.dead ? ' dead' : ''}" style="--c:var(--t${i.ty})">${tyIc(i.ty)}<span class="sp"><span class="mvr-n"><b>${esc(i.n)}${o.tag ? `<i class="mvr-g">${o.tag}</i>` : ''}</b><small class="tn">${mcat(i.cls)}${i.cls ? i.pw : 'Status'}${i.acc && i.acc !== 'never misses' && i.acc !== '100 %' ? ' · ' + i.acc : ''}</small></span><small class="mvr-t">${esc(i.txt)}</small></span>${o.lv ? `<span class="pill tn">Lv ${o.lv}</span>` : o.on != null ? `<span class="mvr-c">${o.on ? icn('check') : ''}</span>` : o.x || ''}</${o.act ? 'button' : 'div'}>`;
}
/* Formene (ønske 19): en rad med formene arten har. Den som krever noe, sier hva. */
function formCard(m) {
  const o = formOpts(m); if (o.length < 2) return '';
  return `<div class="card2 fmc"><div class="lab" style="margin:0">Forme</div><div class="fms">${o.map(([k, n, need]) => `<button type="button" class="fm" data-a="form" data-u="${m.u}" data-k="${k}" aria-pressed="${(m.mega || 0) === k}"${need ? ' disabled' : ''}>${spr(m.id, { sh: m.sh, mega: k, s: '52px' })}<b>${n}</b>${need ? `<small>${need}</small>` : ''}</button>`).join('')}</div></div>`;
}
function monSheet(m, re) {
  /* Utropstegnet forsvinner når kortet åpnes, også om angrepet som venter ikke er besvart ennå. */
  const fresh = m.nw; if (seeNews(m)) { renderNav(); document.querySelectorAll(`[data-u="${m.u}"] .bang`).forEach(x => x.remove()); }
  const ed = U.nick === m.u, d = D(m.id), ty = mTypes(m), ev = evoOpts(m), inP = S.party.includes(m.u), lead = S.party[0] === m.u, a = xpAt(m.lv), b = xpAt(m.lv + 1), n = countOf(m.id);
  const up = natUp(m.nat), dn = natDn(m.nat), nx = nextMove(m), sg = shinyGain(m), fn = formName(m), ab = typeof abShow === 'function' ? abShow(m.id, m.mega) : null, born = bornStars(m), now = nowStars(m), cd = S.items.candy || 0;
  const html = `<div class="mc-h" style="--tc:var(--t${ty[0]})"><span class="mc-o">${ringEl(116, 54, (m.xp - a) / (b - a), 3)}${spr(m.id, { it: m.item, ani: 1, sh: m.sh, mega: m.mega, s: '88px' })}</span>
      <div class="sp"><div class="sm tn">No. ${m.id} · ${REG[regOf(m.id)].n} · Level ${m.lv}</div>
        ${ed ? `<div class="nkrow"><input class="nkin" id="nkin" maxlength="12" value="${esc(m.nn || '')}" placeholder="${esc(d[0])}" autocomplete="off" autocapitalize="words" aria-label="Nickname"><button type="button" class="btn sm2 pri" data-a="nicksave" data-u="${m.u}">Save</button></div>` : `<div class="pn">${esc(mName(m))}${gs(m)}<button type="button" class="nkb" data-a="nick" data-u="${m.u}" aria-label="Give a nickname">✎</button></div>`}
        ${m.nn && !ed ? `<div class="sm">${esc(spName(m))}</div>` : ''}
        <div class="mc-t">${mTyChips(m)}${tierEl(m.id)}${m.sh === 2 ? '<span class="pill dkp">Dark</span>' : m.sh ? '<span class="pill au">Shiny</span>' : ''}${fn ? `<span class="pill">${fn} Forme</span>` : ''}${szTag(m, 1)}</div></div>
      <button type="button" class="mc-f${m.fav ? ' on' : ''}" data-a="fav" data-u="${m.u}" aria-pressed="${!!m.fav}" aria-label="${m.fav ? 'Favourite: on' : 'Mark as favourite'}">${icn('heart')}</button></div>
    ${lockEl()}${cardTip(m)}<div class="card2 mc-s" style="--tc:var(--t${ty[0]})">
      <button type="button" class="mc-pw" data-a="mstat" data-u="${m.u}" aria-label="Power ${pwOf(m)}. See the numbers"><span class="pw tn"><b>${nb(pwOf(m))}</b><small>power</small></span><span class="sp">${potOn() ? `${starRow(m, 'lg')}<small>${now > born ? `Born ${JT[born - 1].toLowerCase()} · trained to ${now} stars` : `Born ${JT[born - 1].toLowerCase()}`}</small>` : ''}
        <span class="mtrs"><span class="mtr" role="img" aria-label="Level ${m.lv} of 100"><small>Level</small><i><b style="width:${m.lv}%"></b></i></span>${has('train') ? `<span class="mtr" role="img" aria-label="Training: ${evSum(m)} of ${EVTOT} EVs"><small>Training</small><i><b style="width:${Math.round(evSum(m) / EVTOT * 100)}%"></b></i></span>` : ''}</span></span>${icn('chev')}</button>
      ${hexEl(m)}
      ${potOn() ? `<div class="mc-n"><b>${NAT[m.nat]}</b>${up !== dn ? `<span class="up">${icn('up')}${SN[up]}</span><span class="dn">${icn('dn')}${SN[dn]}</span>` : '<span>no stat up or down</span>'}</div>` : ''}${szLine(m)}${wkCardX(m)}
      ${sg ? `<div class="mc-x au">${icn('spark')}<span><b>Shiny</b> · ${nb(sg.sum)} more power than a regular ${esc(d[0])}</span></div>` : ''}
      ${ab ? `<div class="mc-x"><span><b>${ab.n}</b> · ${ab.d}${ab.live ? '' : ' <i class="nyet">Not in battles yet.</i>'}</span></div>` : ''}
      ${S.mons.length > 1 ? `<button type="button" class="btn sm2 wide mc-c" data-a="cmpw" data-u="${m.u}">${icn('scale')}Compare with another</button>` : ''}</div>
    <div><div class="row" style="justify-content:space-between;margin-bottom:7px"><div class="lab" style="margin:0">Moves${fresh ? ' · <b class="au">new move learned</b>' : ''}</div><button type="button" class="btn sm2" data-a="mvpick" data-u="${m.u}">Change</button></div>
      ${(m.nm || []).length ? `<button type="button" class="newmv" data-a="mlearn" data-u="${m.u}" style="width:100%;text-align:left;margin-bottom:8px"><span class="bang">!</span><span class="sm" style="color:var(--ink)">Wants to learn <b>${esc(MOVES[m.nm[0]][0])}</b>${m.nm.length > 1 ? ' and ' + (m.nm.length - 1) + ' more' : ''}. Tap to decide.</span></button>` : ''}
      <div class="mvg">${m.mv.map(x => mvTile(x, m, U.mvx === x)).join('')}</div><div id="mvx">${U.mvx != null && m.mv.includes(U.mvx) ? mvxEl(U.mvx, m) : `<p class="sm mvx0">${tl('Tap a move to see what it does.')}</p>`}</div>
      ${nx ? `<p class="sm tn" style="margin-top:7px">Next: ${esc(MOVES[nx.mv][0])} at level ${nx.lv}</p>` : ''}</div>
    <div class="mc-l">
      ${has('train') ? `<button type="button" class="crow" data-a="train" data-u="${m.u}"><span class="ic">${icn('gym')}</span><span class="sp"><b>Train</b><small>${evSum(m)} of ${EVTOT} EVs placed</small></span>${icn('chev')}</button>` : ''}
      <div class="crow cnd"><span class="ic">${ballEl('candy', '26px')}</span><span class="sp"><b>Rare Candy</b><small class="tn">${cd ? cd + ' in the bag · one level each' : 'None in the bag'}</small></span><button type="button" class="btn sm2" data-a="candy" data-u="${m.u}" data-n="1"${cd > 0 && m.lv < 100 ? '' : ' disabled'}>+1</button><button type="button" class="btn sm2" data-a="candy" data-u="${m.u}" data-n="10"${cd > 1 && m.lv < 99 ? '' : ' disabled'}>+${Math.min(10, Math.max(2, cd), 100 - m.lv)}</button></div>
      ${has('held') ? heldRow(m) : ''}</div>
    ${evoLine(m.id, m.id)}
    ${ev.length ? `<div class="stack">${ev.map(o => `<button type="button" class="btn ${o.ok ? 'gold' : ''} wide" data-a="evolve" data-u="${m.u}" data-k="${o.to}"${o.ok ? '' : ' disabled'}>${o.ok ? 'Evolve into ' + esc(D(o.to)[0]) : 'Evolves ' + o.why}</button>`).join('')}</div>` : ''}
    ${formCard(m)}${megaCard(m)}
    <div class="mc-a">${lead ? '<span class="pill ptn">Your partner</span>' : inP ? `<button type="button" class="btn sp" data-a="lead" data-u="${m.u}">Make partner</button>` : ''}
      <button type="button" class="btn sp" data-a="party" data-u="${m.u}"${inP && S.party.length < 2 ? ' disabled' : ''}>${inP ? 'Take off the team' : 'Add to the team'}</button></div>
    <div class="row mc-e"><span class="sm tn">${n > 1 ? 'You have ' + n + ' of these' : 'Your only one'}</span><button type="button" class="btn sm2 danger" data-a="sell" data-u="${m.u}"${S.mons.length > 1 ? '' : ' disabled'}>Sell for ${coinEl(sellValue(m))}</button></div>`;
  re ? reSheet(html) : openSheet(html);
}
/* TALLENE BAK STYRKEN (ønske 15 og 18): hver verdi med det den er bygget av. Født og nå, størrelsen og det en shiny har over en vanlig. */
function statSheet(m) {
  const st = statsOf(m), bs = m.mega ? MEGA[m.mega - 1][4] : BST[m.id - 1], up = natUp(m.nat), dn = natDn(m.nat), sg = shinyGain(m), born = bornStars(m), now = nowStars(m), sz = szOf(m), mx = Math.max(...st, 1);
  const row = i => { const ht = m.ht && m.ht[i], nat = up !== dn && i === up ? ' up' : up !== dn && i === dn ? ' dn' : '';
    return `<div class="st-r"><span class="st-n${nat}">${SN[i]}${nat ? (i === up ? ' +' : ' −') : ''}</span><b class="tn">${st[i]}</b><span class="st-b"><i style="width:${Math.round(st[i] / mx * 100)}%"></i></span>
      <small class="tn">base ${bs[i]} · IV ${m.iv[i]}${ht ? ' → 31' : ''} · EV ${m.ev[i]}${sg && sg.d[i] ? ` · <b class="au">+${sg.d[i]} shiny</b>` : ''}${i === 0 && sz !== 1 && szOn() && m.id !== 292 ? ` · ${SZN[sz]} ${sz > 1 ? '+' : '−'}${Math.round(Math.abs(SZHP[sz] - 1) * 100)} %` : ''}</small></div>`; };
  openSheet(`<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">${esc(mName(m))} in numbers</h2><button type="button" class="xb" data-a="mback" data-u="${m.u}" aria-label="Back">${icn('x')}</button></div>
    <div class="st-top"><span class="pw tn"><b>${nb(pwOf(m))}</b><small>power · the six added up</small></span>${potOn() ? `<span class="sp">${starRow(m, 'lg')}<small>${JT[born - 1]} at birth${now > born ? ` · ${now} stars with training` : ''}</small></span>` : ''}</div>
    <div class="stl" style="--tc:var(--t${mTypes(m)[0]})">${SN.map((_, i) => row(i)).join('')}</div>
    <div class="st-x">
      ${potOn() ? `<p class="sm"><b>${tl('Stars')}</b> · ${tl('The filled ones are what it was born with (its IVs) and never change. The pale ones come from Hyper Training.')}</p>` : ''}
      ${potOn() ? `<p class="sm"><b>${NAT[m.nat]}</b> · ${up !== dn ? tl('Its nature gives {a} 10 % more and {b} 10 % less.', { a: SN[up], b: SN[dn] }) : tl('Its nature changes no stat.')}</p>` : ''}
      ${sz !== 1 && szOn() ? `<p class="sm"><b>${SZN[sz]}</b> · ${tl('Size is something it is born with and can never be trained. It only changes HP: {p} %.', { p: (sz > 1 ? '+' : '−') + Math.round(Math.abs(SZHP[sz] - 1) * 100) })}</p>` : ''}
      ${sg ? `<p class="sm"><b class="au">Shiny</b> · ${tl('A shiny is born with perfect IVs, and every stat is {p} % higher on top. Next to a regular {n} at the same level and training that is {x} more in all: {iv} from the IVs and {r} from the {p} %.', { p: m.id === ARCEUS ? Math.round((SHINYARC - 1) * 100) : Math.round((SHINYST - 1) * 100), n: esc(D(m.id)[0]), x: sg.sum, iv: sg.iv.reduce((x, y) => x + y, 0), r: sg.sum - sg.iv.reduce((x, y) => x + y, 0) })}</p>` : ''}</div>
    <div><div class="lab">Base stats of the species${isMega(m) ? ' · Mega form' : formName(m) ? ' · ' + formName(m) + ' Forme' : ''}</div>${bstEl(m.id, m.mega, 0)}</div>
    <button type="button" class="btn wide" data-a="mback" data-u="${m.u}">Back</button>`);
}
/* Det den holder, som en rad på kortet. Arceus med en plate: typen står der. */
function heldRow(m) {
  const h = heldOf(m), own = Object.keys(HELD).some(k => S.items[k] > 0);
  return `<button type="button" class="crow" data-a="held" data-u="${m.u}"><span class="ic">${h ? heldEl(m.item, '26px') : '<span class="hnone"></span>'}</span><span class="sp"><b>${h ? h.n : 'Holds nothing'}</b><small>${h ? esc(h.d) + (plateTy(m) >= 0 ? ` · ${D(m.id)[0]} is ${TYN[h.ty]} type` : '') : own ? 'Give it a berry, a plate or gear' : 'Berries, plates and gear are in the Shop'}</small></span>${icn('chev')}</button>`;
}
/* Velgeren: det som ligger i sekken, det som passer angrepene dens først. */
function heldSheet(m) {
  const h = heldOf(m), mt = new Set(m.mv.map(i => MOVES[i]).filter(x => x[4] > 0).map(x => x[1])), fit = k => HELD[k].ty != null && mt.has(HELD[k].ty) ? 1 : 0;
  const own = Object.keys(HELD).filter(k => S.items[k] > 0 && k !== m.item);
  const row = k => `<div class="item"><span class="ic">${heldEl(k, '30px')}</span><div class="sp"><b>${HELD[k].n}</b> <span class="sm tn">· ${S.items[k]} in the bag</span><div class="sm">${HELD[k].d}${fit(k) ? ' · <b style="color:var(--sage)">fits its moves</b>' : ''}</div></div><button type="button" class="btn sm2 pri" data-a="heldgive" data-u="${m.u}" data-k="${k}">Give</button></div>`;
  openSheet(`<h2 class="h" style="margin-top:0">What should ${esc(mName(m))} hold?</h2><p class="sm">One item each. It works in the League, the tournament and raids. Berries are used up when they work. Plates and gear last, and you can move them between your Pokémon as often as you like.</p>
    ${h ? `<div class="card" style="padding-top:6px;padding-bottom:6px"><div class="item"><span class="ic">${heldEl(m.item, '30px')}</span><div class="sp"><b>${h.n}</b> <span class="sm tn">· holding it now</span><div class="sm">${h.d}</div></div><button type="button" class="btn sm2" data-a="heldoff" data-u="${m.u}">Take off</button></div></div>` : ''}
    ${own.length ? HELDG.map(([gk, gn]) => { const l = own.filter(k => HELD[k].g === gk).sort((a, b) => fit(b) - fit(a)); return l.length ? `<div class="lab" style="margin-top:12px">${gn}</div><div class="card" style="padding-top:6px;padding-bottom:6px">${l.map(row).join('')}</div>` : ''; }).join('') : `<p class="sm" style="margin-top:10px">${h ? 'There is nothing else in the bag.' : 'There is nothing to hold in the bag yet.'} Berries also turn up after focus sessions, and a legendary you beat in a raid leaves its plate.</p>`}
    <button type="button" class="btn wide" data-a="heldshop" data-u="${m.u}" style="margin-top:12px">Buy items to hold</button><button type="button" class="btn wide nf" data-a="mon" data-u="${m.u}">Back</button>`);
}
/* Butikken for det som kan holdes: tre grupper. De lange (bær mot en type, plater) er foldet sammen til de åpnes. */
function heldShop(u) {
  const l = tlv(), row = k => { const it = HELD[k], lock = l < it.lv; return `<div class="item${lock ? ' lk' : ''}"><span class="ic">${heldEl(k, '30px')}</span><div class="sp"><b>${it.n}</b> <span class="sm tn">· own ${heldTotal(k)}</span><div class="sm">${it.d}</div></div><button type="button" class="btn sm2 ${S.coins >= it.p && !lock ? 'pri' : ''}" data-a="heldbuy" data-k="${k}"${u ? ` data-u="${u}"` : ''}${S.coins < it.p || lock ? ' disabled' : ''}>${lock ? 'Level ' + it.lv : nb(it.p)}</button></div>`; };
  const ks = Object.keys(HELD), of = f => ks.filter(f), fold = (name, list, open) => `<details class="hfold"${open ? ' open' : ''}><summary><b>${name}</b><span class="sm tn">${list.length} · ${nb(HELD[list[0]].p)} each${l < HELD[list[0]].lv ? ' · level ' + HELD[list[0]].lv : ''}</span></summary><div class="card" style="padding-top:6px;padding-bottom:6px">${list.map(row).join('')}</div></details>`;
  const one = of(k => HELD[k].g === 'once' && HELD[k].res == null && !HELD[k].pinch), pin = of(k => HELD[k].pinch), res = of(k => HELD[k].res != null), pl = of(k => HELD[k].g === 'plate'), gear = of(k => HELD[k].g === 'gear');
  U.hfo = U.hfo || {};
  openSheet(`<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">To hold in battle</h2>${coinEl(S.coins)}</div><p class="sm">Each Pokémon can hold one item. Give it from the Pokémon's own card. It works in the League, the tournament and raids, not for the rentals in the Battle Frontier.</p>
    <div class="lab" style="margin-top:12px">Berries and the sash · used up when they work</div><div class="card" style="padding-top:6px;padding-bottom:6px">${one.map(row).join('')}</div>
    ${fold('Berries that raise a stat', pin, U.hfo.pin)}${fold('Berries against one type', res, U.hfo.res)}
    <div class="lab" style="margin-top:12px">Gear · it lasts</div><div class="card" style="padding-top:6px;padding-bottom:6px">${gear.map(row).join('')}</div>
    ${fold('Plates · one type hits 20 % harder', pl, U.hfo.pl)}
    <p class="sm" style="margin-top:10px">Berries also turn up after focus sessions of ${BERRYMIN} minutes or more, and a legendary you beat in a raid leaves the plate of its type. Arceus takes the type of the plate it holds.</p>
    <button type="button" class="btn wide" data-a="${u ? 'held' : 'close'}"${u ? ` data-u="${u}"` : ''}>${u ? 'Back' : 'Close'}</button>`);
  document.querySelectorAll('#sheet details.hfold').forEach((d, i) => d.addEventListener('toggle', () => { U.hfo[['pin', 'res', 'pl'][i]] = d.open; }));
}
/* Mega på kortet: hva arten kan bli, og det som mangler (ring, stein). Med ringen gis steinen her, og de med to former bytter fritt mellom dem.
   Kortet viser egenskapen formen har i spillene (abShow), hva styrken blir, og at naturen følger med (ønske 3). */
function megaCard(m) {
  const o = megaOpts(m.id); if (!o.length) return '';
  const leg = isLeg(m.id), has = leg ? hasStone(m.id) : o.includes(m.ms), cur = o.includes(m.ms) ? m.ms : o[0], pri = MEGA[cur - 1][1] === 'Primal', word = pri ? 'revert to its primal form' : 'Mega Evolve';
  const g = MEGA[cur - 1], ab = typeof abShow === 'function' ? abShow(m.id, cur) : null, up = natUp(m.nat), dn = natDn(m.nat), p0 = pwOf(Object.assign({}, m, { mega: 0 })), p1 = pwOf(Object.assign({}, m, { mega: cur }));
  const txt = !S.ring ? (leg ? (has ? 'You have its stone. You also need the Mega Ring: beat a Champion.' : `Its stone is won by beating ${D(m.id)[0]} in a raid, and you need the Mega Ring: beat a Champion.`) : 'You need the Mega Ring first: beat a Champion.')
    : has ? `It can ${word} once a battle, from the move menu.` : leg ? `Its stone is won by beating ${D(m.id)[0]} in a raid.` : `Give it a Mega Stone and it can ${word} in battle. You have ${S.items.mstone || 0}.`;
  const btn = !S.ring ? '' : has ? o.filter(k => k !== cur).map(k => `<button type="button" class="btn sm2 wide" data-a="mgive" data-u="${m.u}" data-k="${k}">Switch to ${esc(megaName(k))}</button>`).join('')
    : leg ? '' : o.map(k => `<button type="button" class="btn sm2 wide gold" data-a="mgive" data-u="${m.u}" data-k="${k}"${S.items.mstone > 0 ? '' : ' disabled'}>Give a Mega Stone · ${esc(megaName(k))}</button>`).join('');
  return `<div class="card2 mgc${has && S.ring ? ' on' : ''}"><div class="row" style="gap:12px;align-items:center">${spr(m.id, { it: m.item, sh: m.sh, mega: cur, s: '64px' })}<div class="sp"><b>${esc(megaName(cur))}</b><div class="mc-t" style="margin-top:5px">${[g[2], g[3]].filter(t => t >= 0).map(tyChip).join('')}</div></div><span class="mr-p tn"><b>${nb(p1)}</b><small class="up">▲ ${nb(p1 - p0)}</small></span></div>
    ${ab ? `<p class="sm"><b>${ab.n}</b> · ${ab.d}${ab.live ? '' : ' <i class="nyet">Not in battles yet.</i>'}</p>` : ''}${potOn() && up !== dn ? `<p class="sm">${tl('Its nature stays as a Mega: {a} up, {b} down.', { a: SN[up], b: SN[dn] })}</p>` : ''}
    <p class="sm">${txt}</p>${btn}</div>`;
}
/* Trening: seks rader med verdi, IV og EV. IV-feltet er halvparten så bredt som EV-feltet, fordi full IV er verdt 31 poeng på nivå 100 og full EV 63:
   da ser man at de to har ulike tak. Den valgte verdien får kjøpene under. Etter et kjøp tegnes innholdet om på stedet, så arket ikke glir inn på nytt. */
function trainSheet(m) {
  const d = D(m.id), st = statsOf(m), up = natUp(m.nat), dn = natDn(m.nat), free = EVTOT - evSum(m);
  if (U.tri == null) U.tri = BST[m.id - 1].indexOf(Math.max(...BST[m.id - 1]));
  const i = U.tri, natc = k => up !== dn && k === up ? 'color:var(--sage)' : up !== dn && k === dn ? 'color:var(--red)' : '';
  /* Hva et kjøp gir på nivået den har nå, og på nivå 100. */
  const clone = lv => ({ id: m.id, lv: lv || m.lv, mega: m.mega, nat: m.nat, iv: m.iv.slice(), ev: m.ev.slice(), ht: (m.ht || [0, 0, 0, 0, 0, 0]).slice() });
  const gain = (f, lv) => { const a = clone(lv), b = clone(lv); f(b); return statsOf(b)[i] - statsOf(a)[i]; };
  const room = evRoom(m, i), ht = !!(m.ht && m.ht[i]), ivv = ivOf(m, i), dIv = gain(c => { c.ht[i] = 1; }), dIv100 = gain(c => { c.ht[i] = 1; }, 100), dEv = gain(c => { c.ev[i] += room; }), dEv100 = gain(c => { c.ev[i] += room; }, 100), ic = ivCost(m, i), shed = m.id === 292 && i === 0;
  const a = Math.min(10, room), b = evCan(m, i, EVMAX);
  const rows = SN.map((n, k) => `<button type="button" class="trr" data-a="trsel" data-k="${k}" aria-pressed="${k === i}"><b style="${natc(k)}">${n}</b><span class="tn v">${st[k]}</span><span class="tb g"><i style="width:${Math.round(ivOf(m, k) / 31 * 100)}%"></i></span><span class="tn n${m.ht && m.ht[k] ? ' ht' : ''}">${ivOf(m, k)}</span><span class="tb"><i style="width:${Math.round(m.ev[k] / EVMAX * 100)}%"></i></span><span class="tn n">${m.ev[k]}</span></button>`).join('');
  const evb = shed ? '' : room ? `<div class="trb">${m.ev[i] ? `<button type="button" class="btn sm2" data-a="trclr">Clear</button>` : ''}<button type="button" class="btn sm2 pri" data-a="trev" data-n="${a}"${S.coins >= evPriceOf(a) ? '' : ' disabled'}>+${a} EV ${coinEl(evPriceOf(a))}</button>${b > a ? `<button type="button" class="btn sm2 pri" data-a="trev" data-n="${b}">+${b} EV ${coinEl(evPriceOf(b))}</button>` : ''}</div>`
    : `<div class="trb fix">${m.ev[i] ? `<button type="button" class="btn sm2" data-a="trclr">Clear</button>` : ''}<span class="sm" style="align-self:center">${m.ev[i] >= EVMAX ? `This stat is at the cap of ${EVMAX}.` : `All ${EVTOT} EVs are placed. Clear a stat to move them.`}</span></div>`;
  const ivb = ht ? '<span class="pill" style="color:var(--gold)">Hyper trained</span>' : ivv >= 31 ? '<span class="pill" style="color:var(--gold)">Perfect</span>'
    : htOk(m) ? `<button type="button" class="btn sm2 gold" data-a="triv"${S.coins >= ic ? '' : ' disabled'}>Hyper Train ${coinEl(ic)}</button>` : `<span class="pill">From Lv ${HTLV}</span>`;
  const html = `${trainTip(m, i)}<div class="trs"><div class="trh"><span></span><span></span><span>IV · max 31</span><span>EV · max ${EVMAX}</span></div>${rows}</div>
    <div class="card2 trx"><div class="row" style="justify-content:space-between"><b>${SN[i]}</b><span class="sm tn" style="${natc(i)}">${st[i]}${up !== dn && i === up ? ' · nature +10 %' : up !== dn && i === dn ? ' · nature −10 %' : ''}</span></div>
      ${shed ? '<p class="sm">Shedinja always has 1 HP, so there is nothing to train here.</p>' : `<div class="trl"><span class="sm"><b>IV</b> <b class="tn">${m.iv[i]}</b> of 31${ht ? ' · counts as 31' : ''}<br>${ht || ivv >= 31 ? 'Nothing more to gain here.' : `Born with it. Hyper Training makes it count as 31: +${dIv} now, +${dIv100} at Lv 100.`}</span>${ivb}</div>
      <div class="sm"><b>EV</b> <b class="tn">${m.ev[i]}</b> of ${EVMAX} · ${VIT[i]}${dEv > 0 ? `<br>Room for ${room} more: +${dEv} now, +${dEv100} at Lv 100.` : ''}</div>${evb}`}</div>
    ${wkCapRow(m)}<p class="sm">${trainCut() < 1 ? `<b style="color:var(--gold)">Training Camp: everything here costs ${Math.round((1 - trainCut()) * 100)} % less today.</b> ` : ''}<b class="tn">${free}</b> of ${EVTOT} EVs are free, enough to max two stats. Focus sessions give your partner 1 EV every two minutes.</p>
    <button type="button" class="btn wide" data-a="trback">Back</button>`;
  const host = $('#trd');
  if (host && +host.dataset.u === m.u) { host.innerHTML = html; $('#trc').innerHTML = coinEl(S.coins); }
  else openSheet(`<div class="trv" style="--tc:var(--t${d[1]})"><div class="shead">${spr(m.id, { it: m.item, ani: 1, sh: m.sh, mega: m.mega, s: '72px' })}<div class="sp"><div class="sm tn">Training <button type="button" class="hq" data-a="trtip" aria-label="How training works">?</button></div><div class="pn" style="font-size:20px">${esc(mName(m))}</div><div class="sm tn">Lv ${m.lv} · ${NAT[m.nat]}</div></div><span id="trc">${coinEl(S.coins)}</span></div><div id="trd" class="trv" data-u="${m.u}">${html}</div></div>`);
}
/* ANGREPSVALGET (ønske 9 og 22): alt den kan nå, med forklaringen på hver rad, «Suggest four», og under det hva som kommer med nivå.
   Angrep uten virkning i disse kampene (DEADMV) vises bare hvis den har dem på seg, så de kan byttes ut. Lærerne og egg-angrepene (steg 1b.8)
   får sin egen del her, under «Learns later». */
function movePick(m, re) {
  const sel = U.mvsel, at = movesAt(m.id, m.lv).concat(extraMoves(m)).filter((x, i, a) => a.indexOf(x) === i), known = m.mv.concat(at.filter(x => !m.mv.includes(x)).reverse()).filter(x => !DEADMV.has(x) || m.mv.includes(x)), l = LEARN[m.id - 1], later = [];
  for (let i = 0; i < l.length; i += 2) if (l[i] > m.lv && !known.includes(l[i + 1]) && !DEADMV.has(l[i + 1]) && !later.some(x => x[1] === l[i + 1])) later.push([l[i], l[i + 1]]);
  const own = movesAt(m.id, m.lv), tag = x => (m.em || []).includes(x) ? 'Egg' : (m.tm || []).includes(x) ? 'Tutor' : !own.includes(x) && preMoves(m.id, m.lv).includes(x) ? 'Earlier form' : '';
  const row = (x, lv) => mvRow(x, m, lv ? { lv } : { act: 'mvtog', on: sel.includes(x), tag: tag(x) });
  const more = tutOn() ? tutFor(m).length : 0;
  const html = `<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">Moves for ${esc(mName(m))}</h2><span class="pill tn" id="mvn">${sel.length} of 4</span></div>
    ${known.filter(x => !DEADMV.has(x)).length > 4 ? `<button type="button" class="btn ${know() === 0 || (jOn() && know() < 2) ? 'pri' : ''} wide sug" data-a="mvsug" data-u="${m.u}">${icn('spark')}Suggest four</button>${jOn() ? `<p class="sm" style="margin-top:-6px">${tl('Not sure? This picks its strongest moves in its own type, one for cover and one tactical.')}</p>` : ''}` : ''}
    <div class="mvls">${known.map(x => row(x, 0)).join('')}</div>
    <p class="err" id="mv-err" role="alert"></p>
    ${more ? `<button type="button" class="btn wide rowb" data-a="tutmore" data-u="${m.u}"><span>${icn('cap')} More moves</span><span class="sm tn">${more} from the tutors</span></button>` : ''}
    ${later.length ? `<details class="hfold mvlt"${U.mvlt ? ' open' : ''}><summary><b>Learns later</b><span class="sm tn">${later.length} · next at level ${later[0][0]}</span></summary><div class="mvls">${later.map(([lv, x]) => row(x, lv)).join('')}</div></details>` : `<p class="sm">${tl('It has learned every move it gets by level.')}</p>`}
    <div class="row mv-f"><button type="button" class="btn sp nf" data-a="mback" data-u="${m.u}">Cancel</button><button type="button" class="btn pri sp" data-a="mvsave" data-u="${m.u}">Save moves</button></div>`;
  re ? reSheet(html) : openSheet(html);
  const dt = $('#sheet .mvlt'); if (dt) dt.addEventListener('toggle', () => { U.mvlt = dt.open; });
}

/* ---------- Dex ---------- */
VIEW.dex = () => {
  const r = U.dex || S.region, g = REG[r], open = S.regions.includes(r);
  let cells = '';
  for (let id = g.a; id <= g.b; id++) {
    if (S.caught[id]) { const c = countOf(id); cells += `<button type="button" class="cell" data-a="spec" data-k="${id}" aria-label="${esc(D(id)[0])}"><span class="n tn">${id}</span>${spr(id, { lazy: 1 })}${c > 1 ? `<span class="c tn">×${c}</span>` : ''}</button>`; }
    else if (S.seen[id]) cells += `<button type="button" class="cell" data-a="spec" data-k="${id}" aria-label="Seen, not caught"><span class="n tn">${id}</span>${spr(id, { sil: 1, lazy: 1 })}</button>`;
    else cells += `<span class="cell un"><span class="q tn">${id}</span></span>`;
  }
  const all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0);
  return `<div class="row" style="justify-content:space-between"><h1 class="big">Dex</h1><span class="pill tn">${all} of 649</span></div>
    <div class="seg">${[1, 2, 3, 4, 5].map(x => `<button type="button" data-a="dexr" data-k="${x}" aria-pressed="${r === x}">${REG[x].n}</button>`).join('')}</div>
    <div class="card"><div class="row" style="justify-content:space-between"><b>${g.n}</b><span class="sm tn">${dexCount(r)} of ${g.b - g.a + 1} caught</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.round(dexCount(r) / (g.b - g.a + 1) * 100)}%"></i></div>
      ${open ? `<div class="row" style="justify-content:space-between;margin-top:10px"><span class="sm">${tl('Wild Pokémon from here show up in your encounters when the route is on.')}</span><button type="button" class="btn sm2${S.routes.includes(r) ? ' pri' : ''}" data-a="reg" data-k="${r}" aria-pressed="${S.routes.includes(r)}">Route ${S.routes.includes(r) ? 'on' : 'off'}</button></div>`
        : `<p class="sm tn" style="margin-top:10px">${icn('lock')} ${regOrder().find(x => !S.regions.includes(x)) === r ? `Opens at trainer level ${regNeed(r).lv} (you are ${tlv()}) or ${regNeed(r).dex} species caught (you have ${dexAll()}).` : `Opens after ${REG[regOrder()[regOrder().indexOf(r) - 1]].n}.`}</p>${regOrder().find(x => !S.regions.includes(x)) === r ? `<div class="bar gold" style="margin-top:6px"><i style="width:${Math.round(Math.min(1, Math.max((tlv() - 1) / Math.max(1, regNeed(r).lv - 1), dexAll() / regNeed(r).dex)) * 100)}%"></i></div>` : ''}`}</div>
    <div class="grid">${cells}</div>`;
};
function specSheet(id) {
  const d = D(id), got = S.caught[id];
  openSheet(`<div class="shead">${spr(id, { ani: got ? 1 : 0, sil: !got })}<div class="sp"><div class="sm tn">No. ${id} · ${REG[regOf(id)].n}</div><div class="pn">${got ? esc(d[0]) : '???'}</div><div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">${got ? types(id) : ''} ${tierEl(id)}</div></div></div>
    <p class="sm">${got ? `You have ${countOf(id)}.` : 'Seen, but not caught yet.'}</p>${got ? abLine(id) : ''}
    ${got ? `<div><div class="lab">Base stats</div>${bstEl(id, defForm(id), 0)}</div>` : ''}
    ${evoLine(id, id)}
    <button type="button" class="btn wide" data-a="close">Close</button>`);
}

/* ---------- Butikk ---------- */
/* Det raden sier om det du har: antall, eller hvor lenge noe virker. */
const hLeft = ms => { const h = Math.max(1, Math.ceil(ms / 36e5)); return h >= 48 ? Math.ceil(h / 24) + ' days' : h + ' h'; };
const shopHave = k => k === 'lure' || k === 'slure' ? (S[k] > 0 ? `${S[k]} session${S[k] > 1 ? 's' : ''} left` : 'not in use') : k === 'prism' ? (S.prism ? 'waiting for the next raid' : 'not in use') : SHOP[k].sb ? (S.shb && S.shb.k === k && shinyBoost() > 1 ? `burning · ${hLeft(S.shb.until - Date.now())} left` : 'not lit') : k === 'incense' ? (S.incOn ? 'lit' : 'not lit') : `own ${shopOwn(k)}`;
const shopFullTxt = k => SHOP[k].sb || k === 'lure' || k === 'slure' || k === 'incense' || k === 'prism' ? 'Active' : 'Full';
/* Det hver hylle er til. Står i arket til varen (itemSheet), ikke på siden. */
const SHELFD = {
  'For the hunt': () => 'More and better encounters from your focus sessions, and help with the ones that are hard to catch.',
  'Shiny hunting': () => `A shiny is born with perfect IVs, and every stat is ${Math.round((SHINYST - 1) * 100)} % higher: a shiny of a strong species is the best Pokémon there is. The incense works on encounters, packs and eggs, not on raids.`,
  'For battles': () => 'Use these from the Bag in League battles and raids. Using one takes your turn, and the Bag has a limit per battle.'
};
/* FANENE (Dusk): Packs · Balls · Items · Shiny. Hver vare er én kort rad: bilde, navn, hva du har, og prisen. Trykk på raden for hva den gjør.
   ×10 står på det man kjøper mange av (SHOPTEN i game.js). Rutene ligger i Dex (de er ikke varer). */
const SHOPTABS = [['packs', 'Packs'], ['balls', 'Balls'], ['items', 'Items'], ['shiny', 'Shiny']];
const SHOPGRP = { balls: ['Balls', 'For the hunt'], items: ['For your Pokémon', 'For battles'], shiny: ['Shiny hunting'] };
const shopIc = (k, s) => SHOP[k].img ? ballEl(k, s || '30px') : SHOP[k].ic === 'egg' ? '<span class="egg" style="transform:scale(.7)"></span>' : `<span class="${SHOP[k].ic}${k === 'mstone' ? ' mg' : ''}"></span>`;
const shopLock = k => { const it = SHOP[k]; return it.ring && !S.ring ? 'Mega Ring' : it.lv && tlv() < it.lv ? 'Level ' + it.lv : ''; };
function shopRow(k) {
  const it = SHOP[k], lock = shopLock(k), full = shopFull(k), ten = SHOPTEN.has(k);
  return `<div class="srow${lock ? ' lk' : ''}"><button type="button" class="srow-m" data-a="sinfo" data-k="${k}" aria-label="${it.n}: what it does"><span class="ic">${shopIc(k)}</span><span class="sp"><b>${it.n}</b><span class="sm tn">${shopHave(k)}</span></span></button>
    ${lock ? `<span class="pill lk">${icn('lock')}${lock}</span>` : full ? `<span class="pill on">${shopFullTxt(k)}</span>` : `<button type="button" class="btn sm2 price" data-a="buy" data-k="${k}"${S.coins < it.p ? ' disabled' : ''} aria-label="Buy ${it.n} for ${nb(it.p)} coins">${nb(it.p)}</button>${ten ? `<button type="button" class="btn sm2 ten" data-a="buy10" data-k="${k}"${S.coins < it.p * 10 ? ' disabled' : ''} aria-label="Buy ten for ${nb(it.p * 10)} coins">×10</button>` : ''}`}</div>`;
}
/* Arket til en vare: hva den gjør, hva hylla er til, og kjøpet. */
function itemSheet(k) {
  const it = SHOP[k]; if (!it) return;
  const lock = shopLock(k), full = shopFull(k), ten = SHOPTEN.has(k), grp = (SHELF.find(([, ks]) => ks.includes(k)) || [''])[0];
  openSheet(`<div class="shead it"><span class="ic big">${shopIc(k, '44px')}</span><div class="sp"><div class="pn">${it.n}</div><div class="sm tn">${shopHave(k)}</div></div>${coinEl(S.coins)}</div>
    <p>${it.d.replace(/ · trainer level \d+$/, '')}.</p>${SHELFD[grp] ? `<p class="sm">${SHELFD[grp]()}</p>` : ''}
    ${lock ? `<p class="sm au">${it.ring && !S.ring ? 'You need the Mega Ring first: beat a Champion.' : `Opens at trainer level ${it.lv}. You are level ${tlv()}.`}</p>` : ''}
    <div class="acts">${lock ? '' : full ? `<span class="pill on" style="align-self:center">${shopFullTxt(k)}</span>` : `<button type="button" class="btn pri" data-a="buy" data-k="${k}" data-s="1"${S.coins < it.p ? ' disabled' : ''}>Buy · ${nb(it.p)}</button>${ten ? `<button type="button" class="btn pri" data-a="buy10" data-k="${k}" data-s="1"${S.coins < it.p * 10 ? ' disabled' : ''} aria-label="Buy ten for ${nb(it.p * 10)} coins">×10 · ${nb(it.p * 10)}</button>` : ''}`}<button type="button" class="btn nf" data-a="close">Close</button></div>`);
}
/* Arket til en pakke: hva som er i den (sjansene), og kjøpet. */
function packSheet(k) {
  const P = PACKS[k]; if (!P) return; const od = packOdds(k);
  const nf = (S.fpk && S.fpk[k]) || 0, free = nf > 0, lock = !free && P.lv && tlv() < P.lv, full = S.pend.length > PACKMAX, can = (free || S.coins >= P.p) && !lock && !full, p10 = P.p * Math.max(0, 10 - nf), can10 = !full && !(P.lv && tlv() < P.lv) && S.coins >= p10;
  openSheet(`<div class="shead it" style="--pc:${P.c}"><span class="pk-ic"><i></i></span><div class="sp"><div class="pn">${P.n}</div><div class="sm tn">Three encounters, opened on the spot</div></div>${coinEl(S.coins)}</div>
    <p>${P.d}</p>
    <div class="pkod" id="pkod"><div class="lab" style="margin:0">${tl('Your odds in one pack right now')}</div><div class="pkod-r">${[['r2', 'Rare or better', od.rare], ['r3', 'Epic', od.epic], ['r4', 'Legendary', od.leg], ['sh', 'Shiny', od.shiny]].map(([c, n, v]) => `<span class="pkod-c ${c}"><b class="tn">${pkPct(v)}</b><small>${n}</small></span>`).join('')}</div></div>
    <p class="sm">${tl('What is inside follows your routes and the level of your team. Ten at once always hold at least one rare or better. Pokémon from packs sell for less than wild ones, and the greatest legendaries are only met in raids.')}</p>
    ${lock ? `<p class="sm au">Opens at trainer level ${P.lv}. You are level ${tlv()}.</p>` : full ? '<p class="sm au">Catch some of the encounters that are waiting before you open more packs.</p>' : ''}
    <div class="acts pka"><button type="button" class="btn gold" data-a="pack" data-k="${k}"${can ? '' : ' disabled'}>${free ? 'Open · free' : `Open · ${nb(P.p)}`}</button><button type="button" class="btn" data-a="pack" data-k="${k}" data-n="10"${can10 ? '' : ' disabled'}>Open 10 · ${nb(p10)}</button><button type="button" class="btn nf" data-a="close">Close</button></div>`);
}
VIEW.butikk = () => {
  const tabs = tutOn() ? SHOPTABS.concat([['tutors', 'Tutors']]) : SHOPTABS, tab = tabs.some(t => t[0] === U.shop) ? U.shop : 'packs', l = tlv(), full = S.pend.length > PACKMAX;
  let body = '';
  if (tab === 'packs') body = `<div class="packs">${Object.keys(PACKS).map(k => { const P = PACKS[k], free = !!(S.fpk && S.fpk[k] > 0), lock = !free && P.lv && l < P.lv, can = (free || S.coins >= P.p) && !lock && !full;
      const ep = pkPct(packOdds(k).epic);
      return `<div class="pkb${can ? '' : ' off'}${free ? ' free' : ''}" style="--pc:${P.c}"><button type="button" class="pkb-m" data-a="pinfo" data-k="${k}" aria-label="${P.n}, ${free ? 'free' : lock ? 'opens at trainer level ' + P.lv : nb(P.p) + ' coins'}. ${ep} chance of an epic. See what is inside"><span class="pk-ic"><i></i></span><b>${P.n}</b><span class="pk-p tn">${free ? `${icn('gift')}Free` : lock ? `${icn('lock')}Level ${P.lv}` : coinEl(P.p)}</span><span class="pk-o tn"><b>${ep}</b> epic</span></button></div>`; }).join('')}</div>
    <p class="sm" style="text-align:center">${full ? 'Catch some of the encounters that are waiting before you open more packs.' : tl('Three encounters in every pack. Tap a pack to see your odds, and open one or ten.')}</p>`;
  else if (tab === 'tutors') body = `<p class="sm">${tl('Tutors teach moves a Pokémon never learns by level. Pick a move, see who on your team can learn it, and teach it with one tap.')}</p>${lockEl()}<div class="stack">${TUTORS.map(tutCard).join('')}</div>
    <p class="sm">${tl('An evolved Pokémon can also pick the moves its earlier forms learned, and one hatched from an egg knows an egg move. Both are free: open its card in Team and tap Change.')}</p>`;
  else body = SHOPGRP[tab].map(name => { const ks = SHELF.find(s => s[0] === name)[1]; return `${SHOPGRP[tab].length > 1 ? `<div class="lab sh">${name}</div>` : ''}<div class="card slist">${ks.map(shopRow).join('')}</div>`; }).join('');
  if (tab === 'shiny') body = `<button type="button" class="card odds" data-a="sinfo" data-k="glint" aria-label="Your shiny odds right now"><span class="sm">Your shiny odds now</span><b class="tn">1 in ${nb(Math.round(1 / Math.min(SHINYCAP, shinyOdds())))}</b>${shinyBoost() > 1 ? `<span class="pill on tn">×${shinyBoost()} incense</span>` : ''}</button>` + body;
  if (tab === 'items' && has('held')) body += `<div class="lab sh">To hold in battle</div><button type="button" class="card srow-l" data-a="heldshop"><span class="ic">${heldEl('oran', '30px')}</span><span class="sp"><b>Berries, plates and gear</b><span class="sm tn">own ${Object.keys(HELD).reduce((a, k) => a + heldTotal(k), 0)}</span></span>${icn('chev')}</button>`;
  return `<div class="row" style="justify-content:space-between"><h1 class="big">Shop</h1>${coinEl(S.coins)}</div>
    <div class="seg${tabs.length > 4 ? ' s5' : ''}">${tabs.map(([k, n]) => `<button type="button" data-a="shopt" data-k="${k}" aria-pressed="${tab === k}">${n}${k === 'packs' && S.fpk && Object.keys(S.fpk).length ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>${body}`;
};
/* ---------- LÆRERNE (steg 1b.8; reglene står over extraMoves i league.js) ----------
   Fanen «Tutors» i Shop: ett kort per lærer (tutCard). Arket til en lærer (tutorSheet) viser angrepene hans med hva de gjør, prisen og hvor
   mange på laget som kan lære dem; de laget har bruk for, står først. Arket til et angrep (tutMoveSheet) viser forklaringen og hvem som kan
   lære det, med én knapp per Pokémon. Fra angrepsvalget på kortet åpner «More moves» det lærerne har til akkurat den (tutMonSheet). */
const tutTeam = x => S.party.map(monBy).filter(Boolean).filter(m => tutCan(m.id, x) && !tutHas(m, x)).length;
const tutCost = x => !tutOpen(x) ? `<span class="pill lk">${icn('lock')}${FACSYM[tutNeed(x)]} Symbol</span>` : tutPrice(x) ? coinEl(tutPrice(x)) : '<b class="au">Free</b>';
function tutCard(T) {
  const l = tutList(T.k), n = l.filter(x => tutTeam(x) > 0).length, sym = S.fac.sym || 0, open = l.filter(tutOpen).length;
  const tag = T.k === 'master' ? (sym >= TUTFREE ? '<span class="pill on">Free for you</span>' : open ? `<span class="pill on tn">${open} of ${l.length} open</span>` : `<span class="pill lk">${icn('lock')}Bronze Symbol</span>`) : T.k === tutWeek() ? `<span class="pill on tn">This week −${Math.round((1 - TUTOFF) * 100)} %</span>` : '';
  return `<button type="button" class="card tut" data-a="tutor" data-k="${T.k}" style="--c:${T.c}" aria-label="${T.n}, ${T.t}. ${l.length} moves"><span class="tut-i">${icn(T.ic)}</span><span class="sp"><span class="tut-n"><b>${T.n}</b><small>${T.t}</small></span><i class="tut-q">“${T.q}”</i><span class="tut-m sm tn">${l.length} moves · ${n} new for your team${tag}</span></span>${icn('chev')}</button>`;
}
function tutorSheet(k, re) {
  const T = tutBy(k); if (!T) return; U.tut = { k };
  const l = tutList(k), mine = l.filter(x => tutTeam(x) > 0), rest = l.filter(x => !mine.includes(x)), sym = S.fac.sym || 0;
  const row = x => { const n = tutTeam(x); return mvRow(x, null, { act: 'tutmv', x: `<span class="tut-p">${tutCost(x)}<small class="tn">${n ? n + ' on your team' : ''}</small></span>` }); };
  const note = k === 'master' ? `<p class="sm tut-w">${sym >= TUTFREE ? tl('You hold the Diamond Symbol. Everything here is free.') : tl('Bronze opens the Pledge moves and Volt Tackle, Silver the three ultimate starter moves, Gold opens Draco Meteor, and with Diamond it is all free.')}</p>` : k === tutWeek() ? `<p class="sm tut-w">${tl('This week {n} takes {p} % off every move.', { n: T.n, p: Math.round((1 - TUTOFF) * 100) })}</p>` : '';
  const html = `<div class="shead it tuth" style="--c:${T.c}"><span class="tut-i big">${icn(T.ic)}</span><div class="sp"><div class="pn">${T.n}</div><div class="sm tn">${T.t}</div></div>${coinEl(S.coins)}</div>
    <p class="tut-q big">“${T.q}”</p><p class="sm">${T.d}</p>${note}${lockEl()}
    ${mine.length ? `<div class="lab">For your team</div><div class="mvls">${mine.map(row).join('')}</div>` : `<p class="sm tn">${tl('Nothing here that your team can learn and does not already have.')}</p>`}
    ${rest.length ? `<details class="hfold"${U.tutall || !mine.length ? ' open' : ''}><summary><b>${mine.length ? 'Every other move' : 'All moves'}</b><span class="sm tn">${rest.length}</span></summary><div class="mvls">${rest.map(row).join('')}</div></details>` : ''}
    <button type="button" class="btn wide nf" data-a="close" style="margin-top:12px">Close</button>`;
  re ? reSheet(html) : openSheet(html);
  const dt = $('#sheet .hfold'); if (dt) dt.addEventListener('toggle', () => { U.tutall = dt.open; });
}
function tutMoveSheet(x, re) {
  const k = tutOf(x), T = tutBy(k); if (!T) return; U.tut = { k, x };
  const W = tutWho(x), open = tutOpen(x), p = tutPrice(x), can = open && S.coins >= p && !lockMsg();
  const row = m => `<div class="mr" style="--tc:var(--t${mTypes(m)[0]})"><span class="mr-m">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '46px', lazy: 1 })}<span class="sp"><span class="mr-n"><b>${esc(mName(m))}${gs(m)}</b></span><span class="tc-s tn">${mTyIcs(m)}<span>Lv ${m.lv}</span></span></span></span><button type="button" class="btn sm2 pri tut-b" data-a="tutteach" data-u="${m.u}" data-k="${x}"${can ? '' : ' disabled'} aria-label="Teach ${esc(MOVES[x][0])} to ${esc(mName(m))}${p ? ' for ' + nb(p) + ' coins' : ''}">Teach${p ? ' · ' + nb(p) : ''}</button></div>`;
  const why = !open ? tl('{n} teaches this one when you hold the {s} Symbol from the Battle Frontier.', { n: T.n, s: FACSYM[tutNeed(x)] }) : S.coins < p ? tl('You need {n} more coins.', { n: nb(p - S.coins) }) : '';
  const html = `<div class="row" style="justify-content:space-between"><div class="sm tn">${T.n} · ${T.t}</div>${coinEl(S.coins)}</div>
    ${mvxEl(x, null)}${why ? `<p class="sm au">${why}</p>` : ''}${lockEl()}
    <div class="lab">${tl('On your team')}</div>${W.team.length ? `<div class="card mrl">${W.team.map(row).join('')}</div>` : `<p class="sm tn">${tl('No one on your team can learn it, or they know it already.')}</p>`}
    ${W.box.length ? `<details class="hfold"${U.tutbox ? ' open' : ''}><summary><b>In the box</b><span class="sm tn">${W.box.length}</span></summary><div class="card mrl">${W.box.slice(0, 40).map(row).join('')}</div></details>` : ''}
    <button type="button" class="btn wide nf" data-a="tutor" data-k="${k}" style="margin-top:12px">Back to ${T.n}</button>`;
  re ? reSheet(html) : openSheet(html);
  const dt = $('#sheet .hfold'); if (dt) dt.addEventListener('toggle', () => { U.tutbox = dt.open; });
}
/* «More moves» fra angrepsvalget: det hver lærer har til akkurat denne. Ett trykk på et angrep lærer det bort. */
function tutMonSheet(m, re) {
  const l = tutFor(m);
  const row = x => mvRow(x, m, { act: 'tutlearn', x: `<span class="tut-p">${tutCost(x)}</span>` });
  const html = `<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">More moves for ${esc(mName(m))}</h2>${coinEl(S.coins)}</div>
    <p class="sm">${tl('Tap a move to have the tutor teach it. It is then among the moves this Pokémon can choose from.')}</p>${lockEl()}<p class="err" id="mv-err" role="alert"></p>
    ${TUTORS.map(T => { const ms = l.filter(x => tutOf(x) === T.k); return ms.length ? `<div class="lab tut-l" style="--c:${T.c}">${icn(T.ic)}${T.n} · ${T.t}</div><div class="mvls" data-u="${m.u}">${ms.map(row).join('')}</div>` : ''; }).join('')}
    <button type="button" class="btn wide nf" data-a="mvpick2" data-u="${m.u}" style="margin-top:12px">Back to its moves</button>`;
  re ? reSheet(html) : openSheet(html);
}

/* ---------- Profil: trenerkortet, eksamensperioden, statistikken og innstillingene ----------
   Siden er kort: trenerkortet, eksamensperioden som merker, fire tall med de ti siste ukene, og en liste med rader. Hver rad åpner et ark
   (setSheet) med det som hører til: Appearance, Study, Battles, Sound, Language, Save and sync, Guide and rules, Fair play og Admin.
   Raden viser det som gjelder nå, så en ser det uten å åpne. Ingen innstilling er borte, de er bare samlet. */
const PSET = [['look', 'Appearance', 'sun'], ['study', 'Study', 'clock'], ['battle', 'Battles', 'sword'], ['sound', 'Sound', 'bell'], ['lang', 'Explanations', 'globe'], ['data', 'Save and sync', 'cloud'], ['about', 'Guide and rules', 'info'], ['fair', 'Fair play', 'shield'], ['admin', 'Admin', 'wrench']];
/* Det raden sier om hva som gjelder nå. */
function psetNow(k) {
  if (k === 'look') { const o = LOOK.get(); return `${o.t === 'auto' ? 'Auto' : o.t === 'light' ? 'Light' : 'Dark'} · ${LOOK.COLORS[o.c].n}`; }
  if (k === 'study') { const n = Object.keys(S.fag).length; return `${hm(S.cap)} goal · ${n} subject${n === 1 ? '' : 's'}${workIsOn() ? ' · work days' : ''}`; }
  if (k === 'battle') return diff().n;
  if (k === 'sound') return S.sound ? (S.music === 0 ? 'On · no music' : 'On') : 'Off';
  if (k === 'lang') return (S.lang === 'no' ? 'Norsk' : 'English') + ' · ' + ['everything', 'some', 'few'][know()];
  if (k === 'data') return GH && GH.ok ? 'Sync ' + (ghState === 'ok' ? 'on' : ghState || 'connecting') : 'On this device';
  if (k === 'fair') { const n = S.fair ? S.fair.n : 0; return n ? `${n} ${n === 1 ? 'mark' : 'marks'}` : 'Clean'; }
  if (k === 'admin') return admOn() ? 'Admin view on' : 'Sandbox';
  return '';
}
const workIsOn = () => !!(S.work && (S.work.fx || S.work.fx2 || Object.keys(S.work.one || {}).length));
const DIFFTXT = ['Opponents are a good bit below your level, play simply and bring smaller teams. You may use 5 items per battle.', 'Opponents are slightly below your level and make the odd mistake. You may use 4 items per battle.', 'Opponents match your level, are well trained and play to win. You may use 3 items per battle.'];
const tog = (a, on, lab, dis) => `<button type="button" class="tgl" data-a="${a}" role="switch" aria-checked="${!!on}"${dis ? ' disabled' : ''}><span>${lab}</span><i></i></button>`;
/* ARKET TIL EN RAD. re = tegnes om på stedet etter et valg (uten at arket glir inn på nytt). */
function setSheet(k, re) {
  const def = PSET.find(x => x[0] === k); if (!def || (k === 'admin' && !isAdmin())) return;
  U.pset = k; let h = '';
  if (k === 'look') { const o = LOOK.get();
    h = `<div><div class="lab">Mode</div><div class="seg">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, n]) => `<button type="button" data-a="look" data-k="t" data-v="${v}" aria-pressed="${o.t === v}">${n}</button>`).join('')}</div><p class="sm" style="margin-top:6px">${tl('Auto follows your device.')}</p></div>
      <div><div class="lab">Colour</div><div class="lkl">${Object.keys(LOOK.COLORS).map(c => `<button type="button" class="lkc lkc-${c}" data-a="look" data-k="c" data-v="${c}" aria-pressed="${o.c === c}"><i></i><b>${LOOK.COLORS[c].n}</b></button>`).join('')}</div></div>
      <p class="sm">${tl('Battles, raids and films keep their own dark look.')}</p>`; }
  else if (k === 'study') h = `<label class="field">Daily goal<select data-c="cap">${[120, 180, 240, 300, 360, 420, 480].map(c => `<option value="${c}"${S.cap === c ? ' selected' : ''}>${c / 60} hours · battle rewards up to ×${topFor(c).toFixed(1)}</option>`).join('')}</select></label>
      <p class="sm" style="margin-top:-6px">${tl('Battle rewards grow with today\'s focus and peak when you reach your goal: a higher goal has a higher peak. Past the goal your team is tired (half XP, no encounters).')}</p>
      <div class="stack"><button type="button" class="btn wide rowb" data-a="plan"><span>Subjects</span><span class="sm tn">${Object.keys(S.fag).map(f => esc(F(f).n)).join(' · ') || 'none yet'}</span></button>
      <button type="button" class="btn wide rowb" data-a="exam"><span>Exam period</span><span class="sm tn">${examOn() ? 'until ' + dShort(examEnd()) : 'off'}</span></button>
      <button type="button" class="btn wide rowb" data-a="work"><span>Work days</span><span class="sm tn">${workIsOn() ? 'on' : 'off'}</span></button></div>`;
  else if (k === 'battle') { const d = S.diff == null ? 2 : S.diff;
    h = `<div><div class="lab">Difficulty</div><div class="seg">${DIFF.map((x, i) => `<button type="button" data-a="diff" data-k="${i}" aria-pressed="${d === i}">${x.n}</button>`).join('')}</div>
      <p class="sm" style="margin-top:6px">${DIFFTXT[d]} Coins ×${diff().coin} and XP ×${diff().xp} from battles.</p>${lockEl()}</div>
      <div class="tgls">${tog('hfx', S.hfx !== 0, 'Move hints')}${tog('hty', S.hty !== 0, 'Type tags')}</div>
      <p class="sm">${tl('Move hints put 4×, 2×, ½, ¼ or 0× on each move. Type tags show the types by the HP boxes: tap a box to see what hits it hard. The i in the move menu tells what each move does.')}</p>
      <p class="sm">${tl('Battle speed, music and forfeit are in the Pause menu during a battle.')}</p>`; }
  else if (k === 'sound') h = `<div class="tgls">${tog('sound', S.sound, 'Sound')}${tog('music', S.music !== 0, 'Battle music', !S.sound)}${tog('cries', S.cries, 'Cries', !S.sound)}${tog('fsnd', S.fsnd !== 0, 'Encounter sound in a session')}</div>
      ${S.sound ? `<div>${S.music === 0 ? '' : `<div class="volrow"><span>Music</span><input type="range" min="0" max="100" step="5" value="${S.mvol}" data-v="mvol" aria-label="Music volume"><b class="tn" id="vv-mvol">${S.mvol}%</b></div>`}<div class="volrow"><span>Effects</span><input type="range" min="0" max="100" step="5" value="${S.vol}" data-v="vol" aria-label="Effects volume"><b class="tn" id="vv-vol">${S.vol}%</b></div>${S.cries ? `<div class="volrow"><span>Cries</span><input type="range" min="0" max="100" step="5" value="${S.cvol}" data-v="cvol" aria-label="Cries volume"><b class="tn" id="vv-cvol">${S.cvol}%</b></div>` : ''}</div>` : ''}`;
  else if (k === 'lang') h = `<div><div class="lab">Language</div>${langSeg(false)}<p class="sm" style="margin-top:6px">${tl('Guides and introductions to new things. Names, types and moves stay in English.')}</p></div>
      <div><div class="lab">${tl('How well you know Pokémon')}</div><div class="seg">${['New', 'A bit', 'Well'].map((n, i) => `<button type="button" data-a="know" data-k="${i}" aria-pressed="${know() === i}">${n}</button>`).join('')}</div><p class="sm" style="margin-top:6px">${tl(['Everything is explained, one small thing at a time.', 'The basics are skipped. New things here are still explained.', 'Only what differs from the main games is explained.'][know()])}</p></div>`;
  else if (k === 'data') h = `<div class="stack"><button type="button" class="btn wide rowb" data-a="sync"><span>Sync between devices</span><span class="sm tn">${GH && GH.ok ? (ghState === 'ok' ? 'on' : ghState || 'connecting') : 'off'}</span></button><button type="button" class="btn wide rowb" data-a="backup"><span>Backup</span>${icn('chev')}</button></div>
      <p class="sm">${tl('Your game is saved on this device. Sync keeps it in a private GitHub repository so it follows you between devices.')}</p>`;
  else if (k === 'about') h = `<div class="stack"><button type="button" class="btn wide rowb" data-a="tour"><span>Start guide</span>${icn('chev')}</button><button type="button" class="btn wide rowb" data-a="rules"><span>Rules and rewards</span>${icn('chev')}</button><button type="button" class="btn wide rowb" data-a="show"><span>Show the game</span><span class="sm">a trailer for a friend</span></button></div>
      <p class="sm">Fokusdex is a private hobby project. Pokémon and the names belong to Nintendo, Game Freak and Creatures. Images are fetched from PokeAPI when the app is used and are not part of the app.</p>`;
  else if (k === 'fair') { const F = S.fair, n = F ? F.n : 0, last = n ? F.l[F.l.length - 1] : null, hn = S.hon ? S.hon.n || 0 : 0;
    h = `<div class="row" style="justify-content:space-between"><b class="mulnow" style="color:${n ? 'var(--red)' : 'var(--good)'}">${n ? `${n} ${n === 1 ? 'mark' : 'marks'}` : 'Clean'}</b><span class="pill tn">${n ? 'clock changed' : 'no marks'}</span></div>
      <p class="sm">${n ? `The device clock did not match the game${last ? ' on ' + new Date(last.d + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}. A mark does nothing but stand here.` : 'The clock has matched the game, and nothing has been rolled back.'} ${hn ? `You have answered ${hn} honest ${hn === 1 ? 'check' : 'checks'}.` : ''} Cheating is optional, but your integrity pays for it.</p>`; }
  else if (k === 'admin') h = `<div class="tgls">${tog('adm', admOn(), 'Admin view · everything open')}</div>
      <div class="stack"><button type="button" class="btn wide rowb" data-a="lab"><span>Sandbox</span><span class="sm">test anything</span></button><button type="button" class="btn wide rowb" data-a="jprev"><span>Journey preview</span><span class="sm">see it as a new player</span></button></div><p class="sm">Only you see this.</p>`;
  const html = `<div class="row" style="justify-content:space-between"><h2 class="h" style="margin:0">${def[1]}</h2></div>${h}`;
  const host = $('#setd'); if (re && host) host.innerHTML = html; else openSheet(`<div id="setd" class="setd">${html}</div>`);
}
/* Etter et valg i et ark: tegn arket om hvis det fortsatt står framme. */
const setRe = () => { if (U.pset && !$('#sheet').hidden && $('#setd')) setSheet(U.pset, 1); };
VIEW.profil = () => {
  const t0 = new Date(), tot = totalMin(), ses = Object.values(S.log).reduce((s, d) => s + d.s, 0), l = tlv(), xa = tlvXp(l), xb = tlvXp(l + 1);
  const exOn = examOn(), fs = Object.keys(S.fag);
  /* Merkene: ett per fag. I perioden fylles ringen med tida mot eksamen, og prikkene er de fire belønningene (25, 50, 75 % og eksamensdagen). */
  const badges = fs.map(f => { const g = S.fag[f], c = F(f).c, on = exOn && !!g.xs && !!g.d, dd = g.d ? dIdx(g.d) - dIdx(dayKey()) : null, pct = on ? exFrac(g) : 0, xm = g.xm || 0;
    return `<button type="button" class="bdg${on ? ' on' : ''}" data-a="badge" data-k="${esc(f)}" style="--tc:${c}" aria-label="${esc(F(f).n)}${dd != null && dd >= 0 ? `, exam in ${dd} days` : ''}"><span class="bdg-r">${ringEl(60, 26, pct, 4)}<b>${esc(short(F(f).n))}</b></span><span class="bdg-p">${[0, 1, 2, 3].map(i => `<i class="${i < xm ? 'on' : ''}"></i>`).join('')}</span><small class="tn">${dd == null || (!on && dd < 0) ? hm(fagMin(f)) : dd > 0 ? dd + ' d' : dd === 0 ? 'today' : 'done'}</small></button>`; }).join('');
  let heat = '';
  const mon = addDays(t0, -((t0.getDay() + 6) % 7) - 63);
  for (let i = 0; i < 70; i++) { const d = addDays(mon, i), k = dayKey(d), m = (S.log[k] || { m: 0 }).m; heat += `<i class="${m ? (m < 90 ? 'l1' : m < 180 ? 'l2' : m < 270 ? 'l3' : 'l4') : ''}${k === dayKey() ? ' td' : ''}" title="${d.getDate()}.${d.getMonth() + 1}: ${m} min"></i>`; }
  const all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0), sp = focusSplit(), hasS = fs.length > 0, as = U.as || achSum(), R = as.R, pct = R.next ? Math.round((R.p - R.at) / (R.next - R.at) * 100) : 100;
  return `<h1 class="big">Profile</h1>
    <div class="card pcard" style="--rk:${R.c}"><button type="button" class="avpb" data-a="ach" aria-label="Achievements. Rank: ${R.n}">${avFrame(R, 'lg', 1)}</button><span class="sp"><span class="sm">${S.av ? esc(avName()) : 'No character yet'}</span><b>${R.n}</b>
      <span class="bar"><i style="width:${pct}%;background:${R.c}"></i></span><span class="sm tn">${R.p} of ${achTotal()} medals${R.nn ? ` · ${R.next - R.p} to ${R.nn}` : ''}</span><span class="sm tn">Level ${l} · ${nb(S.xp - xa)} of ${nb(xb - xa)} XP</span></span></div>
    <div class="row"><button type="button" class="btn sp${as.open ? ' gold' : ''}" data-a="ach">${as.open ? `${as.open} reward${as.open > 1 ? 's' : ''} ready` : 'Achievements'}</button><button type="button" class="btn sp" data-a="avatar">${S.av ? 'Character' : 'Pick a character'}</button></div>
    ${hasS ? `<div class="card exc"><div class="row" style="justify-content:space-between"><b>Exam period</b><button type="button" class="pill${exOn ? ' on' : ''}" data-a="exam">${exOn ? 'until ' + dShort(examEnd()) : 'off · start'}</button></div><div class="bdgs">${badges}</div></div>` : ''}
    ${wkSymCard()}
    <div class="card"><div class="pst"><div><b class="tn">${hm(hasS ? sp.subj : tot)}</b><span class="sm">${hasS ? 'Subjects' : 'Focus'}</span></div><div><b class="tn">${ses}</b><span class="sm">Sessions</span></div><div><b class="tn">${streak()}</b><span class="sm">Streak</span></div><div><b class="tn">${all}</b><span class="sm">Species</span></div></div>
      <div class="hm" role="img" aria-label="Focus the last ten weeks${hasS && sp.other ? `. Plus ${hm(sp.other)} of other things` : ''}">${heat}</div></div>
    <div class="card slist pset">${PSET.filter(x => x[0] !== 'admin' || isAdmin()).map(([k, n, ic]) => `<button type="button" class="srow-m prow" data-a="pset" data-k="${k}"><span class="ic">${icn(ic)}</span><span class="sp"><b>${n}</b></span><span class="sm tn">${psetNow(k)}</span>${icn('chev')}</button>`).join('')}</div>
    <p class="sm" style="text-align:center">Fokusdex is a private hobby project. Pokémon and the names belong to Nintendo, Game Freak and Creatures.</p>`;
};
/* Arket til et merke: det som før sto som linjer under hvert fag. */
function badgeSheet(f) {
  const g = S.fag[f]; if (!g) return;
  const exOn = examOn(), on = exOn && !!g.xs && !!g.d, dd = g.d ? dIdx(g.d) - dIdx(dayKey()) : null, pct = on ? exFrac(g) : 0, xm = g.xm || 0, done = on && xm >= 4, gate = on ? exGate(g) : 0;
  openSheet(`<div class="shead it" style="--tc:${F(f).c}"><span class="bdg-r big">${ringEl(60, 26, pct, 4)}<b>${esc(short(F(f).n))}</b></span><div class="sp"><div class="pn">${esc(F(f).n)}</div><div class="sm tn">${dd == null ? 'no exam date' : dd > 0 ? 'exam in ' + dd + ' d' : dd === 0 ? 'exam today' : 'exam done'}</div></div></div>
    <div class="pst two"><div><b class="tn">${hm(fagMin(f))}</b><span class="sm">in all</span></div>${on ? `<div><b class="tn">${hm(g.xf || 0)}</b><span class="sm">this exam period</span></div>` : ''}</div>
    ${on ? `<p class="sm">${done ? 'Badge complete.' : `Next reward at ${(xm + 1) * 25} % of the way to the exam${gate > 0 ? `, once you have logged ${hm(gate)} more here` : ''}. You have ${xm} of 4.`}</p>` : `<p class="sm">${tl('There is a bigger bonus in the exam period: more hours studied give a bigger boost.')}</p>`}
    <div class="acts"><button type="button" class="btn" data-a="exam">${exOn ? 'Exam dates' : 'Start exam period'}</button><button type="button" class="btn nf" data-a="close">Close</button></div>`);
}
/* ---------- Fag: brukes både ved første start og fra Profil ---------- */
const subjDraft = () => Object.keys(S.fag).map(k => { const f = S.fag[k]; return { k, n: f.n, ty: (f.ty || []).slice(0, 2), d: f.d || '' }; });
/* «14 Nov» */
const dShort = k => new Date(k + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
function seCards() {
  const sd = U.sd, O = U.seo || (U.seo = {});
  return sd.map((s, i) => { const o = O[i] || ''; return `<div class="card secard"><div class="row"><input class="sein" data-f="n" data-i="${i}" maxlength="14" placeholder="Subject name" autocomplete="off" value="${esc(s.n)}" aria-label="Subject name"><button type="button" class="btn sm2" data-a="sedel" data-i="${i}" aria-label="Remove ${esc(s.n) || 'subject'}">Remove</button></div>
    <div class="se-x"><button type="button" class="chip" data-a="seopen" data-i="${i}" data-k="ty" aria-expanded="${o === 'ty'}">Types: ${s.ty.length ? s.ty.map(t => TYN[t]).join(', ') : 'any'}${icn('down')}</button><button type="button" class="chip" data-a="seopen" data-i="${i}" data-k="d" aria-expanded="${o === 'd'}">${s.d && /^\d{4}-\d{2}-\d{2}$/.test(s.d) ? 'Exam ' + dShort(s.d) : 'Exam date'}${icn('down')}</button></div>
    ${o === 'd' ? `<label class="field">Exam date (optional)<input type="date" data-f="d" data-i="${i}" value="${esc(s.d)}"></label>` : ''}
    ${o === 'ty' ? `<div><div class="lab">${tl('These types show up more often when you study this subject. Pick up to 2.')}</div><div class="tychips">${TYN.map((n, t) => `<button type="button" class="tyc" data-a="sety" data-i="${i}" data-k="${t}" aria-pressed="${s.ty.includes(t)}" style="--c:var(--t${t})">${n}</button>`).join('')}</div></div>` : ''}</div>`; }).join('') +
    (sd.length < 4 ? '<button type="button" class="pfree" data-a="seadd">+ Add subject</button>' : '');
}
function seRedraw() { const el = $('#se'); if (el) el.innerHTML = seCards(); }
/* Sjekker utkastet. Gir en feilmelding, eller lista som skal lagres. */
function seRead() {
  const num = v => Number(String(v).replace(',', '.').trim());
  const out = [];
  for (const s of U.sd) {
    const n = s.n.trim();
    if (!n) return 'Give every subject a name, or remove the empty one.';
    if (s.d && !/^\d{4}-\d{2}-\d{2}$/.test(s.d)) return `Check the exam date for ${n}.`;
    out.push({ k: s.k, n, ty: s.ty, d: s.d || '' });
  }
  return out;
}
function subjSheet() {
  U.sd = subjDraft(); U.seo = {}; U.ex = (S.extra || []).filter(k => k !== 'annet' && EXTRA[k]);
  openSheet(`<h2 class="h">Your subjects</h2><p class="sm">Up to four. Their types show up more often in their sessions, and in an exam period each badge counts down to its exam. Subjects count in full.</p>
    <div id="se" class="stack">${seCards()}</div>
    <div><div class="lab">Other things you log · half value for the battle bonus</div><div class="chips">${Object.keys(EXTRA).filter(k => k !== 'annet').map(k => `<button type="button" class="chip" data-a="extog" data-k="${k}" aria-pressed="${U.ex.includes(k)}">${EXTRA[k].n}</button>`).join('')}<span class="chip" style="display:inline-flex;align-items:center;opacity:.55">Other · always there</span></div>
      <p class="sm" style="margin-top:8px">Encounters and coins as for subjects, a little less XP, and half value for the battle bonus and your daily goal.</p></div>
    <p class="err" id="se-err" role="alert"></p>
    <button type="button" class="btn pri wide" data-a="sesave">Save</button>`);
}
/* ---------- Arbeidsdager ---------- */
function workScreen(L) {
  closeSheet(); U.wlock = 1; U.wlockE = L.e;
  ov(`<div class="mid"><h1 class="big">At work</h1><p class="mut" style="max-width:30ch">${L.brk ? `Locked until your break at ${tstr(L.e)}. Work ends at ${tstr(L.end)}.` : `Locked until ${tstr(L.e)}.`}</p>
    <p class="sm" style="max-width:32ch">${tl('Each hour of work adds {m} minutes to the battle bonus. Transport and breaks do not count.', { m: WORKB })}</p></div>
    <div class="acts"><button type="button" class="btn" data-a="wearly">Done early</button></div>`, 'wlock');
}
/* Arbeidsdager: en økt kan ikke gå inn i arbeidstida (heller ikke forbi slutten av en pause). */
function workClash() {
  const wn = typeof workNext === 'function' ? workNext() : null, m = U.min || S.last.min;
  if (wn == null || nowMin() + m <= wn) return false;
  toast(wn <= nowMin() ? 'You are at work right now.' : `Work starts at ${tstr(wn)}. Pick a session that ends before then.`); return true;
}
/* Låsen kommer og går av seg selv: sjekkes hvert 20. sekund og når appen kommer fram. */
function workTick() { if (!S.started || !S.work || S.timer) return; const L = workLock(); if (!!L !== !!U.wlock || (L && U.wlockE !== L.e)) render(); else if (workCredit()) { save(true); render(); } }
setInterval(workTick, 20000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') workTick(); });
const WDAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
/* Tidene fra arket: p = 'w' (uka) eller 'o' (en enkelt dag). Pausene må ligge inne i arbeidstida. */
function wRead(p) {
  const v = id => tmin(($('#' + p + '-' + id) || {}).value), s = v('s'), e = v('e');
  if (s == null || e == null || e <= s) return 'Work must end after it starts.';
  const br = [];
  for (const i of [1, 2]) { const a = v('b' + i), b = v('c' + i); if (a == null && b == null) continue; if (a == null || b == null || b <= a || a < s || b > e) return 'A break must lie inside your work hours.'; br.push([a, b]); }
  br.sort((x, y) => x[0] - y[0]); if (br.length === 2 && br[1][0] < br[0][1]) return 'Two breaks cannot overlap.';
  return { s, e, br };
}
function workSheet() {
  const W = S.work || {}, cur = W.fx2 || W.fx || { days: [1, 2, 3, 4, 5], s: 480, e: 960, br: [[690, 720]] }, k = dayKey();
  if (!U.wd) U.wd = (cur.days && cur.days.length ? cur.days : [1, 2, 3, 4, 5]).slice();
  const t = (p, id, m) => `<input type="time" id="${p}-${id}" value="${m == null ? '' : tstr(m)}">`, br = (p, w, i) => (w.br || [])[i - 1] || [];
  const times = (p, w) => `<div class="segrid"><label class="field">Start${t(p, 's', w.s)}</label><label class="field">End${t(p, 'e', w.e)}</label>
    ${[1, 2].map(i => `<label class="field">Break ${i} from${t(p, 'b' + i, br(p, w, i)[0])}</label><label class="field">to${t(p, 'c' + i, br(p, w, i)[1])}</label>`).join('')}</div>`;
  const ones = Object.keys(W.one || {}).filter(d => d >= k).sort();
  openSheet(`<h2 class="h">Work days</h2><p class="sm">${tl('The app is locked while you work, except in your breaks. Each hour of work adds {m} minutes to the battle bonus that day, and study after work counts ×{x} for it. Transport and breaks do not count.', { m: WORKB, x: 1 + AFTERB })}</p>
    <div class="lab">Every week</div><div class="chips">${WDAYS.map(([d, n]) => `<button type="button" class="chip" data-a="wday" data-k="${d}" aria-pressed="${U.wd.includes(d)}">${n}</button>`).join('')}</div>
    ${times('w', cur)}<p class="sm">${W.fx2 ? 'Changes count from ' + dShort(W.fx2.from) + '.' : 'Changes count from tomorrow.'}</p>
    <button type="button" class="btn pri wide" data-a="wsave">Save the week</button>
    <div class="lab" style="margin-top:8px">One day</div><label class="field">Date<input type="date" id="o-d" min="${k}" value="${k}"></label>
    ${times('o', { s: null, e: null, br: [] })}<p class="sm">Add it before it starts.</p><button type="button" class="btn wide" data-a="wone">Add the day</button>
    ${ones.length ? `<div class="stack">${ones.map(d => `<div class="row" style="justify-content:space-between;align-items:center"><span class="sm tn">${dShort(d)} · ${tstr(W.one[d].s)}–${tstr(W.one[d].e)}</span><button type="button" class="btn sm2" data-a="wdel" data-k="${d}">Remove</button></div>`).join('')}</div>` : ''}
    <p class="err" id="w-err" role="alert"></p>
    ${W.fx || W.fx2 ? '<button type="button" class="btn wide" data-a="woff">Turn off work days</button>' : ''}`);
}
/* Eksamensperioden: datoene per fag, og (ved start) valget om å øke dagsmålet. */
function examSheet() {
  const on = examOn(), k = dayKey(), subs = Object.keys(S.fag), caps = [S.cap, S.cap + 60, S.cap + 120].filter((c, i) => !i || c <= 480);
  openSheet(`<h2 class="h">Exam period</h2><p>${tl('There is a bigger bonus in the exam period: more hours studied give a bigger boost.')}</p>
    ${subs.length ? `<div class="stack">${subs.map(f => `<label class="field">${esc(F(f).n)} · exam date<input type="date" data-x="${esc(f)}" min="${k}" value="${esc(S.fag[f].d || '')}"></label>`).join('')}</div>` : `<p class="sm">${tl('Add your subjects first: Profile → Edit subjects.')}</p>`}
    ${on ? '' : `<label class="field">${tl('Daily goal in the exam period')}<select id="ex-cap">${caps.map((c, i) => `<option value="${c}">${hm(c)}${i ? ' · +' + hm(c - S.cap) : ' · as now'}</option>`).join('')}</select></label>`}
    <p class="sm">${tl('Each badge counts down to its exam. 25 and 50% give a rare encounter, 75% an epic one and exam day a legendary one, once you have logged {a}, {b} and {c} hours in the subject in the period ({d} for the legendary). Outside an exam period the battle bonus and XP are a little lower.', { a: MSGATE / 60, b: MSGATE / 30, c: MSGATE / 20, d: BADGEGATE / 60 })}</p>
    <p class="err" id="ex-err" role="alert"></p>
    <div class="acts">${on ? '<button type="button" class="btn" data-a="exend">End exam period</button><button type="button" class="btn pri" data-a="exsave">Save</button>' : `<button type="button" class="btn pri" data-a="exgo"${subs.length ? '' : ' disabled'}>Start exam period</button>`}</div>`);
}
/* Leser datoene fra arket inn i fagene. start = perioden skal starte nå: minst ett fag må ha eksamen i dag eller senere. */
function exRead(start) {
  const k = dayKey(), got = {};
  for (const el of document.querySelectorAll('#sheet [data-x]')) { const v = el.value.trim(); if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Check the exam dates.'; got[el.dataset.x] = v; }
  if (start && !Object.values(got).some(v => v && v >= k)) return 'Give at least one subject an exam date from today on.';
  for (const f in got) if (S.fag[f]) { S.fag[f].d = got[f]; if (S.exam && !start) examJoin(S.fag[f], k); }
  return got;
}
function syncSheet() {
  let lb = null; try { lb = JSON.parse(localStorage.getItem('lb.gh') || 'null'); } catch (_) {}
  openSheet(`<h2 class="h">Sync between devices</h2><p class="sm">Your save is stored as one file (fokusdex/save.json) in a private GitHub repo. Use the same key and repo on each device. The first time you connect a device you choose which game to keep.</p>
    <label class="field">Repo (owner/name)<input id="gh-r" autocapitalize="off" autocomplete="off" value="${esc(GH ? GH.repo : '')}" placeholder="yourname/pokemon-save"></label>
    <label class="field">Key (fine-grained token with Contents: read and write)<input id="gh-t" type="password" autocomplete="off" value="${esc(GH ? GH.t : '')}"></label>
    ${lb && lb.t && lb.repo ? '<button type="button" class="btn wide" data-a="synclb">Use the key from Live-blekker</button>' : ''}
    <p class="sm" id="gh-s">${GH && GH.ok ? (ghState === 'ok' ? 'Sync is on.' : esc(ghState)) : 'Sync is off.'}</p>
    <div class="row"><button type="button" class="btn pri sp" data-a="syncsave">Connect</button>${GH && GH.ok ? '<button type="button" class="btn sp danger" data-a="syncoff">Turn off</button>' : ''}</div>
    ${GH && GH.ok ? '' : '<p class="sm" style="margin-top:6px">A pack of your own graphics, sounds and music goes in the same repo: a folder called <b>pack</b> at the top of it, with its manifest.json inside. The app finds it when Sync is connected.</p>'}
    ${GH && GH.ok ? `<p class="sm" style="margin-top:6px">Your own graphics, sound and music pack: put it in a folder called <b>pack</b> at the top of the same repo (pack/manifest.json). ${PACK.ok ? `Found: ${Object.keys(PACK.man.scenes || {}).length} arenas, ${(PACK.man.music || []).length} tracks, ${Object.keys(PACK.man.sfx || {}).length} sounds.` : 'None found yet.'}</p><button type="button" class="btn wide" data-a="packre">Check for the pack again</button>` : ''}`);
}
function backupSheet() {
  openSheet(`<h2 class="h">Backup</h2><p class="sm">Copy the text to keep your game safe, or paste a copy to restore it.</p>
    <label class="field">Paste a copy here<input id="bk-in" autocomplete="off"></label>
    <div class="row"><button type="button" class="btn sp" data-a="bkcopy">Copy game</button><button type="button" class="btn sp" data-a="bkload">Restore from copy</button></div>
    <p class="sm" id="bk-err" style="color:var(--red)"></p>
    ${localStorage.getItem(KEY + '.bak') ? '<button type="button" class="btn wide" data-a="bkold">Bring back the save this device had before sync</button>' : ''}
    <button type="button" class="btn wide danger" data-a="reset">Start over from scratch</button>`);
}

/* ---------- Ark ----------
   Tre veier ut av et ark (v81): lukkeknappen i topplinja, et drag nedover, og et trykk utenfor. Topplinja (SHTOP: håndtaket og knappen)
   står fast øverst mens arket rulles, så veien ut alltid er synlig. */
const SHTOP = `<div class="sh-top"><span class="grab"></span><button type="button" class="sh-x" data-a="close" aria-label="Close">${icn('x')}</button></div>`;
function openSheet(html) {
  const w = $('#sheet'), s = w.querySelector('.sheet');
  if (!w.hidden && s) { s.className = 'sheet'; s.style.transform = s.style.transition = ''; s.innerHTML = SHTOP + html; s.scrollTop = 0; void s.offsetWidth; s.classList.add('swp'); return; }
  w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${SHTOP}${html}</div>`; w.hidden = false;
}
function closeSheet() { const w = $('#sheet'); w.hidden = true; w.innerHTML = ''; U.pset = null; }
/* Dra arket ned for å lukke det. Draget gjelder når arket står øverst og fingeren går nedover, eller når det starter på topplinja.
   Slippes arket et stykke nede eller i fart, glir det ut og lukkes; ellers spretter det tilbake. Felt, skyvere og lister som ruller
   for seg selv inne i arket, beholder fingeren. */
(() => {
  const w = $('#sheet'); let g = null; if (!w) return;
  const back = () => { const s = g && g.s; g = null; if (!s || !s.isConnected) return; s.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; s.style.transform = ''; setTimeout(() => { if (s.isConnected) s.style.transition = ''; }, 240); };
  w.addEventListener('touchstart', ev => {
    g = null; const s = ev.target.closest ? ev.target.closest('.sheet') : null; if (!s || ev.touches.length !== 1 || ev.target.closest('input,textarea,select')) return;
    const bar = !!ev.target.closest('.sh-top'); let top = s.scrollTop <= 0; for (let e = ev.target; e && e !== s; e = e.parentElement) if (e.scrollTop > 0 || e.scrollWidth > e.clientWidth + 4 && getComputedStyle(e).overflowX !== 'visible') top = false;
    if (bar || top) g = { s, y: ev.touches[0].clientY, x: ev.touches[0].clientX, t: ev.timeStamp, on: 0, dy: 0 };
  }, { passive: true });
  w.addEventListener('touchmove', ev => {
    if (!g) return; const t = ev.touches[0], dy = t.clientY - g.y, dx = t.clientX - g.x;
    if (!g.on) { if (dy < -6 || Math.abs(dx) > 12 && Math.abs(dx) > dy) { g = null; return; } if (dy < 10) return; g.on = 1; g.y += 10; g.s.style.transition = 'none'; }
    if (ev.cancelable) ev.preventDefault();
    g.dy = Math.max(0, t.clientY - g.y); g.s.style.transform = `translateY(${g.dy}px)`;
  }, { passive: false });
  w.addEventListener('touchend', ev => {
    if (!g) return; if (!g.on) { g = null; return; }
    const s = g.s, v = g.dy / Math.max(1, ev.timeStamp - g.t);
    if (g.dy > Math.min(130, s.offsetHeight * 0.25) || g.dy > 36 && v > 0.5) { g = null; sfx.close(); s.style.transition = 'transform .18s ease-in'; s.style.transform = 'translateY(110%)'; setTimeout(() => { if (s.isConnected) closeSheet(); }, 170); }
    else back();
  });
  w.addEventListener('touchcancel', back);
})();
/* Byttet på laget: inn på plassen til den som går ut (out = null: en ledig plass). Arket lukkes, og laget tegnes på nytt. */
function teamSwap(out, inn) { if (!inn || !swapParty(out ? out.u : 0, inn.u)) return; U.sw = null; closeSheet(); render(); sfx.ok(); toast(out ? `${mName(inn)} is in for ${mName(out)}.` : `${mName(inn)} joined the team.`); }
/* Prosent slik sjansene vises: hele tall, én desimal under ti, og 100 % først når det er sikkert. */
const pkPct = x => x >= 0.9995 ? '100 %' : x >= 0.995 ? '99 %' : x >= 0.1 ? Math.round(x * 100) + ' %' : (x * 100).toFixed(1).replace(/\.0$/, '') + ' %';
/* ---------- PAKKEÅPNINGEN (steg 1.7, ønske 13) ----------
   Én pakke eller flere (ti fra Shop): pakken rives opp, kortene kommer ut med baksiden opp, og GLØDEN PÅ BAKSIDEN RØPER SJELDENHETEN før kortet
   snus. Det beste kommer sist: det beste kortet ligger sist i pakken, og pakken med det beste kortet åpnes til slutt. En pakke som holder
   noe stort (epic, legendarisk, shiny), er urolig alt før den åpnes. Et stort treff får sitt eget øyeblikk når det snus: lyset samler seg i
   klassens farge, kortet løftes fram, og ordet står over. Giant og fem stjerner røpes ikke på forhånd, så også en rolig pakke kan overraske.
   Med flere pakker fylles raden øverst pakke for pakke, og til slutt kommer SAMMENDRAGET: alt du fikk, det beste først, der du beholder det
   som er verdt det og slipper resten for mynter med ett trykk (samme regler som duplikatene, packKeepers i game.js).
   Møtene ligger alt i gresset når åpningen starter (openPacks), så ingenting går tapt om appen lukkes underveis.
   U.pk = { k, packs (hver sortert med det beste sist), i = pakken som står framme, demo, rel = settet som slippes, fin = ferdig valgt, pick }. */
const pkIv = e => e.iv ? e.iv.reduce((a, b) => a + b, 0) : 0;
const pkHot = e => !!(e.myst || e.t >= 3 || e.sh);
/* Valget mellom å beholde og å slippe for mynter: på reisen først fra dag 4 (steget «nature»). */
const pkPickOn = () => !jOn() || has('nature');
const pkBig = e => pkHot(e) || (szOn() && e.sz === 3) || !!(potOn() && e.iv && starsFor(pkIv(e)) >= 5);
const pkQ = e => (e.myst ? 100 : 0) + e.t * 10 + (e.sh ? 25 : 0) + (e.iv ? starsFor(pkIv(e)) : 0) + (e.sz === 3 ? 4 : e.sz === 2 ? 1 : 0);
const pkWord = e => e.myst ? 'Legendary' : [e.sh ? 'Shiny' : '', szOn() && e.sz === 3 ? 'Giant' : '', e.t >= 3 ? TIERS[e.t] : !e.sh && potOn() && e.iv && starsFor(pkIv(e)) >= 5 ? 'Five stars' : ''].filter(Boolean).join(' · ');
function pkFront(e) {
  if (e.myst) return '<span class="pk-front pkq"><span class="pkq-o" aria-hidden="true"><i>?</i></span><b>? ? ?</b><span class="tier r4">Legendary</span><span class="sm">Who is it? Find out in the grass</span></span>';
  return `<span class="pk-front">${S.caught[e.id] ? '' : '<i class="pk-new">NEW</i>'}${spr(e.id, { ani: 1, sh: e.sh, mega: defForm(e.id) })}<b>${esc(D(e.id)[0])}${gs(e)}</b><span class="tier r${e.t}">${e.sh ? 'Shiny · ' : ''}${TIERS[e.t]}</span><span class="pk-m tn">Lv ${e.lv}${potOn() && e.iv ? starRow(e) : ''}</span>${szOn() && e.sz != null && e.sz !== 1 ? `<span class="szt sz${e.sz}">${SZN[e.sz]}</span>` : ''}</span>`;
}
/* Et lite kort (raden øverst og sammendraget). o.act = knapp (trykk bytter mellom å beholde og å slippe), o.rel = slippes, o.in = kommer inn i raden. */
function pkMini(e, i, o) {
  o = o || {}; const tag = o.act ? `button type="button" data-a="${o.act}" data-k="${i}" aria-pressed="${!o.rel}" aria-label="${e.myst ? 'A legendary' : esc(D(e.id)[0])}: ${o.rel ? 'let go for ' + encValue(e) + ' coins' : 'kept'}"` : `span${o.in ? ` style="--i:${i}"` : ''}`;
  return `<${tag} class="pkm r${e.t}${e.sh ? ' shy' : ''}${o.rel ? ' rel' : ''}${o.in ? ' in' : ''}">${e.myst ? '<span class="pkm-q">?</span>' : spr(e.id, { sh: e.sh, s: '42px', mega: defForm(e.id), lazy: 1 })}${!e.myst && !S.caught[e.id] ? '<i class="pkm-n" title="New species"></i>' : ''}${e.sz === 3 && szOn() ? '<i class="pkm-g" title="Giant">G</i>' : ''}${o.act ? `<small class="tn">${o.rel ? '+' + nb(encValue(e)) : e.myst ? '? ? ?' : potOn() && e.iv ? '★'.repeat(starsFor(pkIv(e))) : 'keep'}</small>` : ''}</${o.act ? 'button' : 'span'}>`;
}
function packShow(k, packs, demo) {
  if (packs.length && !Array.isArray(packs[0])) packs = [packs];
  packs = packs.map(p => p.slice().sort((a, b) => pkQ(a) - pkQ(b)));
  if (packs.length > 1) { const top = p => pkQ(p[p.length - 1]); let bi = 0; packs.forEach((p, i) => { if (top(p) > top(packs[bi])) bi = i; }); packs.push(packs.splice(bi, 1)[0]); }
  const P = PACKS[k], n = packs.length, slots = packs.slice(0, -1).reduce((a, p) => a + p.length, 0);
  U.pk = { k, packs, i: 0, demo: demo ? k : '', rel: null, fin: 0 }; U.pkDemo = demo ? k : '';
  ov(`<div class="pko" id="pko" style="--pc:${P.c}">
    <div class="pk-top"${n > 1 ? '' : ' hidden'}><span class="pill tn" id="pkn"></span><button type="button" class="btn sm2 nf" data-a="pkskip">Open them all</button></div>
    <div class="pk-tray" id="pktray" style="--tc:${Math.min(9, slots)}" aria-hidden="true"${n > 1 ? '' : ' hidden'}>${'<span class="pkm e"></span>'.repeat(slots)}</div>
    <div class="pk-big" id="pkbig" aria-live="polite"></div>
    <div class="pk-stage" id="pkst"></div>
    <p class="sm" id="pkt" style="text-align:center"></p>
    <div class="acts" id="pka"></div>${demo ? '<p class="sm tn" style="text-align:center">Demo · free, and nothing is kept</p>' : ''}</div>`, 'packov', P.c);
  pkStage();
}
/* Pakken som står framme, uåpnet. Holder den noe stort, er den urolig. */
function pkStage() {
  const X = U.pk, st = $('#pkst'); if (!X || !st) return; const P = PACKS[X.k], n = X.packs.length, hot = X.packs[X.i].some(pkHot);
  if (n > 1) $('#pkn').textContent = `Pack ${X.i + 1} of ${n}`;
  st.className = 'pk-stage'; st.innerHTML = `<button type="button" class="pk-pack${hot ? ' hot' : ''}" data-a="pkopen" aria-label="Open the pack"><span class="pk-ic big"><i></i></span><b>${P.n}</b></button>`;
  $('#pkt').textContent = hot ? 'This one is restless. Tap it.' : 'Tap the pack to open it'; $('#pka').innerHTML = '';
  if (hot) buzz([20, 70, 20]);
}
/* Et stort treff: lyset samler seg i klassens farge, kortet løftes fram, og ordet står over. */
function pkHero(el, e) {
  const o = $('#pko'), b = $('#pkbig'); if (!o || !b) return;
  o.style.setProperty('--hc', e.sh ? 'var(--gold)' : e.myst ? 'var(--r4)' : e.t >= 3 ? `var(--r${e.t})` : 'var(--gold)');
  b.innerHTML = `<b>${pkWord(e)}</b>`; o.classList.remove('bigr'); void o.offsetWidth; o.classList.add('bigr'); el.classList.add('hero');
  if (e.sh === 1) { if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; shinyFx(el); }
  clearTimeout(pkHero.t); pkHero.t = setTimeout(() => { const q = $('#pko'); if (q) q.classList.remove('bigr'); el.classList.remove('hero'); }, 1700);
}
/* Alle kortene i pakken er snudd: neste pakke, eller slutten (big = det siste kortet fikk sitt øyeblikk, som får stå ferdig). */
function pkPackDone(big) {
  const X = U.pk, last = X.i >= X.packs.length - 1;
  if (!X.demo) save(true);
  if (last) { clearTimeout(pkPackDone.t); if (X.packs.length > 1) pkPackDone.t = setTimeout(() => { if (U.pk === X) pkEnd(); }, big ? 1900 : 800); else pkEnd(); return; }
  $('#pkt').textContent = 'Tap for the next pack'; $('#pka').innerHTML = '<button type="button" class="btn gold" data-a="pknext">Next pack</button>';
}
/* Slutten. Én pakke: kortene blir stående. Flere: sammendraget med det beste først. X.rel = de som slippes (forslaget følger reglene for duplikater). */
function pkEnd() {
  const X = U.pk, st = $('#pkst'); if (!X || !st) return; clearTimeout(pkPackDone.t);
  const all = X.packs.reduce((a, p) => a.concat(p), []), n = X.packs.length, live = all.filter(e => X.demo || S.pend.includes(e));
  const tray = $('#pktray'), top = $('#pko .pk-top'); if (tray) tray.hidden = true; if (top) top.hidden = true;
  const sum = n > 1 || !!X.pick; if (sum && !pkPickOn()) X.fin = 1;
  if (!X.rel) { const keep = X.demo || !sum ? null : packKeepers(all); X.rel = new Set(keep ? all.filter(e => !keep.has(e)) : []); }
  const best = all.reduce((a, x) => Math.max(a, x.t + (x.sh ? 2 : 0)), 0), nw = new Set(all.filter(e => !e.myst && !S.caught[e.id]).map(e => e.id)).size, cnt = f => live.filter(f).length;
  const word = all.some(x => x.myst) ? 'A legendary! Step into the grass to see who it is.' : best >= 4 ? 'What a pull!' : best >= 3 ? 'A great pack.' : X.demo ? 'An ordinary pack.' : 'They are waiting in the grass.';
  if (sum) {
    const sorted = all.map((e, i) => [e, i]).filter(x => X.demo || S.pend.includes(x[0])).sort((a, b) => pkQ(b[0]) - pkQ(a[0]));
    const bits = [`${live.length} ${live.length === 1 ? 'card' : 'cards'}`, nw ? `${nw} new` : '', cnt(e => e.myst) ? `${cnt(e => e.myst)} legendary` : '', cnt(e => !e.myst && e.t === 3) ? `${cnt(e => !e.myst && e.t === 3)} epic` : '', cnt(e => e.sh) ? `${cnt(e => e.sh)} shiny` : ''].filter(Boolean);
    st.className = 'pk-stage sum'; st.innerHTML = `<div class="pk-sum"><div class="pk-sh"><b>${X.fin ? 'In the grass' : 'Your pull'}</b><span class="sm tn">${bits.join(' · ')}</span></div>
      <div class="pk-grid">${sorted.map(([e, i]) => pkMini(e, i, X.demo || X.fin ? {} : { act: 'pktog', rel: X.rel.has(e) })).join('')}</div></div>`;
  }
  const rel = [...X.rel].filter(e => S.pend.includes(e)), val = rel.reduce((s, e) => s + encValue(e), 0);
  $('#pkt').textContent = X.demo ? word : sum && !X.fin ? (rel.length ? tl('The dimmed ones are duplicates no better than what you have. Tap a card to change it.') : tl('Tap a card to let it go for coins instead of catching it.')) : live.length ? word : 'All let go.';
  $('#pka').innerHTML = X.demo ? `<button type="button" class="btn gold" data-a="pkdemo" data-k="${X.k}">Open another</button><button type="button" class="btn" data-a="pkdemo" data-k="${X.k}" data-n="10">Open ten</button><button type="button" class="btn nf" data-a="${U.pkFrom === 'odds' ? 'packlab' : 'lab'}">${U.pkFrom === 'odds' ? 'Back to the odds' : 'Back to the Sandbox'}</button>`
    : sum && !X.fin ? `${rel.length ? `<button type="button" class="btn gold" data-a="pkrel">Let ${rel.length} go for ${coinEl(val)}</button>` : ''}<button type="button" class="btn${rel.length ? ' nf' : ' gold'}" data-a="pkkeep">${rel.length ? 'Keep them all' : 'Done'}</button>`
    : `${live.length ? '<button type="button" class="btn gold" data-a="pkhunt">Catch them now</button>' : ''}<button type="button" class="btn nf" data-a="pkdone">${live.length ? 'Later' : 'Done'}</button>${!sum && pkPickOn() && live.some(e => !e.myst) ? '<button type="button" class="btn nf pk-lg" data-a="pkpick">Let some go for coins</button>' : ''}`;
}
function ov(html, cls, tc) { const o = $('#ov'); o.className = 'ov' + (cls ? ' ' + cls : ''); o.style.setProperty('--tc', tc || 'var(--sage)'); o.innerHTML = `<div class="ovin">${html}</div>`; o.hidden = false; }
function closeOv() { const o = $('#ov'); o.hidden = true; o.innerHTML = ''; if (typeof wkAmbOff === 'function') wkAmbOff(); }

/* ---------- STARTEN (steg 1.10, ønske 8, 10, 16 og 17) ----------
   Fem korte skjermer, én idé på hver: velkommen og løftet · hvor godt du kjenner Pokémon · hvor vanskelige kampene skal være · region og
   partner · fagene. START holder valgene til spillet starter (begin i game.js). U.step = hvilken skjerm (0–4). */
let pick = 0;
const START = { know: null, diff: null, reg: 1 }, STEPS = 5;
/* Språkvalget: på startskjermen (kort, med «Explanations in») og under Settings i Profile. */
const langSeg = small => `<div class="langseg${small ? ' sm' : ''}">${small ? `<span class="sm">${tl('Explanations in')}</span>` : ''}<div class="seg">${[['en', 'English'], ['no', 'Norsk']].map(([k, n]) => `<button type="button" data-a="lang" data-k="${k}" aria-pressed="${(S.lang || 'en') === k}">${n}</button>`).join('')}</div></div>`;
const stTop = i => `<div class="st-top"><button type="button" class="btn sm2" data-a="stback">Back</button><span class="st-dots" role="img" aria-label="Step ${i + 1} of ${STEPS}">${Array.from({ length: STEPS }, (_, k) => `<i class="${k === i ? 'on' : k < i ? 'was' : ''}"></i>`).join('')}</span><span class="st-sp"></span></div>`;
/* Et valg på startskjermene: bilde, navn og én linje. */
const stCard = (a, k, on, pic, t, s, x) => `<button type="button" class="stc" data-a="${a}" data-k="${k}" role="radio" aria-checked="${!!on}"><span class="stc-i">${pic}</span><span class="sp"><b>${t}</b><span class="sm">${s}</span></span>${x || ''}</button>`;
/* Veien videre: hver prikk er en studiedag. De første lyser, resten er hemmelige, og den siste er noe stort. */
const stPath = () => `<div class="st-path" aria-hidden="true">${[ballEl('poke', '20px'), '<span class="coin"><i></i></span>', icn('spark'), '?', '?', '?', '?'].map((x, i) => `<i class="${i < 3 ? 'on' : i === 6 ? 'big' : 'q'}" style="--i:${i}">${x}</i>`).join('')}</div>`;
const KNOWS = [['New to Pokémon', 'Everything is explained, one small thing at a time.'], ['Played a bit', 'I know catching, types and evolving.'], ['I know it well', 'Types, stats, natures and IVs. Skip the basics.']];
const DIFFWHO = ['For those new to Pokémon. Opponents are below your level and play simply, and one loss a day is forgiven.', 'For those who have played a bit. Opponents are near your level and pick sensible moves.', 'For those who know types and strategy. Opponents are fully trained and play to win.'];
const stDiff = () => START.diff != null ? START.diff : START.know != null ? START.know : 1;
function intro() {
  const st = U.step = Math.max(0, Math.min(STEPS - 1, U.step || 0)), K = START.know, k0 = K === 0;
  if (st === 4) {
    if (!U.sd) U.sd = [{ k: '', n: '', ty: [], d: '' }];
    ov(`${stTop(4)}<div><h1 class="big">${tl('What are you studying?')}</h1><p class="mut" style="margin-top:6px">${tl('Add up to four subjects. You can change them later in Profile.')}</p></div>
      <div id="se" class="stack">${seCards()}</div><p class="err" id="se-err" role="alert"></p>
      <label class="field">${tl('How long do you usually study a day?')}<select data-c="cap">${[120, 180, 240, 300, 360, 420, 480].map(c => `<option value="${c}"${(S.cap || 360) === c ? ' selected' : ''}>${hm(c)}</option>`).join('')}</select></label>
      <div class="acts"><button type="button" class="btn pri" data-a="sestart">Start with ${esc(D(pick)[0])}</button></div>`);
    return;
  }
  if (st === 3) {
    const trio = STARTERS[START.reg] || STARTERS[1];
    ov(`${stTop(3)}<div class="mid st3"><h1 class="big">${tl('Choose your partner')}</h1>
      <div class="seg st-reg" role="tablist" aria-label="Region">${[1, 2, 3, 4, 5].map(r => `<button type="button" role="tab" data-a="streg" data-k="${r}" aria-pressed="${START.reg === r}">${REG[r].n}</button>`).join('')}</div>
      <div class="starters">${trio.map(id => `<button type="button" data-a="pick" data-k="${id}" aria-pressed="${pick === id}" style="--tc:var(--t${D(id)[1]})">${spr(id, { ani: 1 })}<span>${D(id)[0]}</span>${types(id)}</button>`).join('')}</div>
      <p class="sm" style="max-width:32ch">${k0 ? tl('Grass, Fire or Water: all three are equally strong. Pick the one you like.') : tl('The region decides which Pokémon you meet first. The others open as you go.')}</p></div>
      <div class="acts"><button type="button" class="btn pri" data-a="stnext"${pick ? '' : ' disabled'}>${pick ? 'Next' : 'Choose a partner'}</button></div>`);
    return;
  }
  if (st === 2) {
    const d = stDiff();
    ov(`${stTop(2)}<div class="mid st2"><h1 class="big">${tl('How hard should the battles be?')}</h1>
      <div class="stcs" role="radiogroup">${DIFF.map((x, i) => stCard('stdiff', i, d === i, `<span class="st-pips p${i}"><i></i><i></i><i></i></span>`, x.n, tl(DIFFWHO[i]), `<span class="st-pay tn"><span class="coin"><i></i></span>×${x.coin}</span>`)).join('')}</div>
      <p class="sm" style="max-width:34ch">${tl('Harder battles pay more. You can change this under Profile → Settings, except in the middle of a run.')}</p></div>
      <div class="acts"><button type="button" class="btn pri" data-a="stnext">Next</button></div>`);
    return;
  }
  if (st === 1) {
    ov(`${stTop(1)}<div class="mid st1"><div><h1 class="big">${tl('How well do you know Pokémon?')}</h1><p class="mut" style="margin-top:8px">${tl('It decides how much is explained along the way.')}</p></div>
      <div class="stcs" role="radiogroup">${KNOWS.map((x, i) => stCard('stknow', i, K === i, [icn('egg'), ballEl('poke', '26px'), icn('star')][i], tl(x[0]), tl(x[1]))).join('')}</div></div>
      <div class="acts"><button type="button" class="btn pri" data-a="stnext"${K == null ? ' disabled' : ''}>${K == null ? 'Choose one' : 'Next'}</button></div>`);
    return;
  }
  ov(`<div class="st-top">${langSeg(true)}</div><div class="mid st0">${stPath()}<div><h1 class="big st-name">Fokusdex</h1><p class="mut" style="margin-top:8px;max-width:28ch">${tl('Study, and a Pokémon world grows around it.')}</p></div>
      <div class="st-prom"><div>${icn('clock')}<p><b>${tl('A little at a time')}</b><span class="sm">${tl('Each study day opens a few new things, so you master one before the next.')}</span></p></div>
        <div>${icn('spark')}<p><b>${tl('Deeper than it looks')}</b><span class="sm">${tl('Bosses, legendary raids and rewards worth waiting for.')}</span></p></div></div></div>
    <div class="acts"><button type="button" class="btn pri" data-a="stnext">Begin</button></div>`);
}

/* ---------- Fokusklokka ---------- */
const CIRC = 289.03;
let tick = 0, wake = null;
async function keepAwake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (_) {} }
function dropAwake() { try { if (wake) wake.release(); } catch (_) {} wake = null; }
/* Bjella på timeren: på eller av (strek over). */
const bellSvg = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>${on ? '' : '<path d="M4 4l16 16"/>'}</svg>`;
function showTimer() {
  const t = S.timer, p = partner(), w = rateOf(t.fag), n = Math.floor(t.min / 20) + (t.min >= 25 ? 1 : 0);
  U.quit = 0;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="quit" id="t-quit">Cancel</button><span class="pill" style="background:${F(t.fag).c};color:#17130f">${esc(F(t.fag).n)} · ${t.min} min</span></div>
    <div class="mid"><div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="a0" cx="50" cy="50" r="46"/><circle class="a1" id="t-arc" cx="50" cy="50" r="46" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/></svg>
      <div class="in">${p ? spr(p.id, { ani: 1, sh: p.sh, mega: p.mega }) : ''}<div class="clock" id="t-clock" role="timer"></div><div class="sm" id="t-sub"></div></div></div>
      <div><div class="frow"><div class="found" id="t-found" aria-label="Encounters found">${Array.from({ length: n }, () => '<i></i>').join('')}</div><button type="button" class="tsnd" id="t-snd" data-a="fsnd" aria-pressed="${S.fsnd !== 0}" aria-label="Encounter sound">${bellSvg(S.fsnd !== 0)}</button></div><p class="sm" style="margin-top:8px" id="t-hint">${w < 1 ? `${esc(F(t.fag).n)} counts at half value for the battle bonus. A new encounter every 20 minutes.` : 'A new encounter every 20 minutes.'}</p></div></div>
    <div class="acts"><button type="button" class="btn nf" data-a="pause" id="t-pause">Pause</button><button type="button" class="btn pri" data-a="early">Finish now</button></div>`, 'tint', F(t.fag).c);
  keepAwake();
  clearInterval(tick); tick = setInterval(paintTimer, 500);
  paintTimer();
}
function paintTimer() {
  const t = S.timer; if (!t) { clearInterval(tick); return; }
  const ms = elapsedMs(t), left = t.min * 60000 - ms;
  if (left <= 0) return endTimer();
  const c = $('#t-clock'); if (!c) return;
  const s = Math.ceil(left / 1000);
  c.textContent = `${Math.floor(s / 60)}:${pad2(s % 60)}`;
  document.title = `${Math.floor(s / 60)}:${pad2(s % 60)} · Fokusdex`;
  $('#t-arc').style.strokeDashoffset = String(Math.round(CIRC * (ms / (t.min * 60000)) * 100) / 100);
  const xw = rateOf(t.fag) === 1 ? 1 : OTHERXP;
  $('#t-sub').textContent = t.pausedAt ? 'Paused' : `+${nb(Math.round(Math.floor(ms / 60000) * 10 * xw * exf()))} XP`;
  $('#t-pause').textContent = t.pausedAt ? 'Resume' : 'Pause';
  const got = Math.floor(ms / 1200000), dots = $('#t-found').children;
  for (let i = 0; i < dots.length; i++) if (i < got && !dots[i].classList.contains('on')) { dots[i].classList.add('on'); if (i >= t.seen) { dots[i].classList.add('new'); t.seen = i + 1; if (S.fsnd !== 0) { sfx.found(); buzz(40); } $('#t-hint').textContent = 'Something is rustling in the grass. It will wait until you are done.'; } }
}
function endTimer() {
  clearInterval(tick); dropAwake(); document.title = 'Fokusdex';
  const R = finishTimer();
  if (!R || !R.min) { sfx.close(); closeOv(); toast('The session was under a minute and does not count.'); return render(); }
  sfx.done(); buzz([120, 60, 120]);
  showReward(R);
}

/* ---------- Belønning ---------- */
function countUp(el, to) { const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 900); el.textContent = '+' + nb(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); }
function showReward(R) {
  const news = []; U.jmv = U.jmv || R.ups.some(x => (x.learned || []).length);
  R.hatch.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega })}<span><b>Egg hatched: ${esc(D(m.id)[0])}</b><br><span class="sm">${x.isNew ? 'New to your collection' : 'You already have it'}${m.sh ? ' · shiny' : ''}${x.em >= 0 && MOVES[x.em] ? ' · knows the egg move <b>' + esc(MOVES[x.em][0]) + '</b>' : ''}</span></span></div>`); });
  R.ups.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega })}<span><b>${esc(mName(m))} level ${x.l0} → ${x.l1}</b>${x.evo ? '<br><span class="sm" style="color:var(--gold)">Ready to evolve</span>' : ''}${(x.learned || []).length ? `<br><span class="sm">Learned ${esc(x.learned.join(', '))}</span>` : ''}${(x.avail || []).length ? `<br><span class="sm">New move to pick: ${esc(x.avail.join(', '))}</span>` : ''}</span></div>`); });
  if (R.sm1 != null && R.sm1 !== R.sm0) news.push(`<div><span class="mulic">×</span><span><b>Battle bonus ×${R.sm0.toFixed(1)} → ×${R.sm1.toFixed(1)}</b><br><span class="sm">${R.sm1 >= goalTop() ? 'You reached your goal: this is the top for today.' : `It peaks at ×${goalTop().toFixed(1)} when you reach ${hm(goalMin())}.`}</span></span></div>`);
  R.gifts.forEach(g => news.push(`<div><span class="grass"><i></i><i></i><i></i><i></i></span><span>${esc(g)}</span></div>`));
  const notes = [R.w < 1 ? `${F(R.fag).n} counts at half value for the battle bonus (your ${R.min} minutes count as ${R.eff} there) and gives a little less XP.` : '', R.rested ? 'Rested bonus: 1.5× on your first session of the day.' : '', R.tired ? 'Your team is tired: minutes past the daily cap gave half XP and no encounters.' : '', R.full ? '' : 'Ended early: you are rewarded for the minutes you did.'].filter(Boolean);
  ov(`<div class="mid" style="justify-content:flex-start;padding-top:8vh"><div><h1 class="big">${R.full ? 'Session complete.' : 'Nice work.'}</h1><p class="mut tn" style="margin-top:6px">${R.min} min ${esc(F(R.fag).n)}</p></div>
    <div class="gain"><div><span class="sm">XP</span><b class="tn" id="r-xp">+0</b></div><div><span class="sm">Coins</span><b class="tn" id="r-co">+0</b></div></div>
    ${notes.length ? `<p class="sm">${notes.join(' ')}</p>` : ''}
    <div class="news">${news.map((n, i) => n.replace('<div>', `<div style="animation-delay:${0.3 + i * 0.15}s">`)).join('')}</div></div>
    <div class="acts">${S.pend.length ? `<button type="button" class="btn gold" data-a="hunt">Into the grass · ${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'}</button><button type="button" class="btn nf" data-a="home">Later</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`, 'tint', F(R.fag).c);
  countUp($('#r-xp'), R.xp); countUp($('#r-co'), R.coins);
  if (R.hatch.length) setTimeout(() => { sfx.hatch(); const m = monBy(R.hatch[0].u); if (m) cry(m.id, 500); }, 900);
  else if (R.ups.length) setTimeout(sfx.lvl, 900);
}

/* ---------- Rent spill: klokka, ærlighetssjekken og merkene ---------- */
const dur = ms => hm(Math.max(1, Math.round(ms / 60000)));
const clockText = L => L.k === 'back'
  ? `Your device's clock is ${dur(L.ms)} behind the last time you earned something in the game. Sessions and battles are paused until it has caught up, at ${new Date(S.tmax).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
  : `Your device's clock is about ${dur(L.ms)} ahead of the real time. Sessions and battles are paused until it is right. Set the date and time to automatic, then check again.`;
const clockCard = L => `<div class="card stack clk"><div class="row" style="justify-content:space-between"><b>Clock check</b><span class="pill tn">Paused</span></div><p class="sm">${clockText(L)}</p>${L.k === 'ahead' ? '<button type="button" class="btn sm2 wide" data-a="clkagain">Check again</button>' : ''}</div>`;
function clockSheet(L) { openSheet(`<h2 class="h" style="margin-top:0">Clock check</h2><p class="sm">${clockText(L)}</p><p class="sm" style="margin-top:8px">The game counts days and minutes by the clock, so it has to be right. Nothing is lost while you wait.</p>${L.k === 'ahead' ? '<button type="button" class="btn wide" data-a="clkagain" style="margin-top:12px">Check again</button>' : ''}<button type="button" class="btn wide" data-a="close" style="margin-top:8px">Close</button>`); }
/* Stopper det som gir belønning når klokka ikke stemmer. Gir true når det ble stoppet. */
function fairGate() { const L = clockCheck(); if (!L) return false; sfx.warn(); clockSheet(L); return true; }
/* Ærlighetssjekken: appen kan ikke se om du studerer, så den spør når noe ser rart ut. */
function honestAsk(why) {
  const d = new Date(), k = dayKey(), real = Object.values((S.log[k] || {}).f || {}).reduce((x, y) => x + y, 0);
  const q = why === 'late' ? `It is ${pad2(d.getHours())}:${pad2(d.getMinutes())}. Are you really studying right now?` : why === 'long' ? `You have logged ${hm(real)} today. Is this still real study?` : `That is ${hm(S.run || 0)} in a row without a break. Are you still at it?`;
  sfx.open();
  ov(`<div class="mid"><div class="honq" aria-hidden="true">?</div><div><div class="evr-k" style="color:var(--gold)">Honest check</div><h1 class="big" style="margin-top:6px;font-size:28px">${q}</h1>
      <p class="mut" style="margin-top:12px">Cheating is optional, but your integrity pays for it. Be honest with yourself.</p></div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="honyes" data-k="${why}">I'm honest · I'm grinding school</button></div>
    <button type="button" class="btn wide nf" data-a="home">Not really · cancel</button>`, 'tint', 'var(--gold)');
}
function fairCard() {
  const F = S.fair, n = F ? F.n : 0, last = n ? F.l[F.l.length - 1] : null, hn = S.hon ? S.hon.n || 0 : 0;
  return `<h2 class="h">Fair play</h2><div class="card stack fair${n ? ' mk' : ''}"><div class="row" style="justify-content:space-between"><b>${n ? `${n} ${n === 1 ? 'mark' : 'marks'}` : 'Clean'}</b><span class="pill tn">${n ? 'clock changed' : 'no marks'}</span></div>
    <p class="sm">${n ? `The device clock did not match the game${last ? ' on ' + new Date(last.d + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}. A mark does nothing but stand here.` : 'The clock has matched the game, and nothing has been rolled back.'} ${hn ? `You have answered ${hn} honest ${hn === 1 ? 'check' : 'checks'}.` : ''} Cheating is optional, but your integrity pays for it.</p></div>`;
}

/* ---------- Møte og fangst ---------- */
const E = { e: null, ball: 'poke', c: 50, pos: 50, raf: 0, t0: 0, busy: false, done: null };
/* Master Ball velges aldri av seg selv, bare når den er den eneste som er igjen. */
function bestBall() { return ['poke', 'great', 'ultra', 'dusk'].find(k => S.items[k] > 0) || (S.items.master > 0 ? 'master' : 'poke'); }
function encQuiet() { if (E.mus) { E.mus = 0; if (typeof stopMusic === 'function') stopMusic(); } }
/* ---------- Radar-gresset (steg 1c.6, C1) ----------
   Før et møte rister gresset på noen steder, og du velger hvor du går inn: hver tue som rister, er ett av møtene som venter (de tre første),
   og en tue med glitter har en shiny. Er en kjede i gang og det finnes et møte å bruke opp (chainFuel), rister én tue slik kjeden gjør
   (C.sg: tre ulike bevegelser, den samme vises ved kjedelinja øverst). Går du inn der, møter du arten igjen; en annen tue avslutter kjeden.
   Ett trykk, så er møtet som før. Radaren kommer når du har fanget RADMIN arter, og bare når det er noe å velge (to møter, eller en kjede).
   U.rad = { items: [{ k: 'chain' | 'enc', e, sg, sp }], pos: plassen til hver, chain: kjedetua står der }. */
const RADMIN = 6, RADPOS = [[8, 10], [57, 4], [33, 37], [66, 50], [5, 56]];
const radarOn = () => Object.keys(S.caught).length >= RADMIN;
function radarOpen() {
  const C = S.chain, fuel = chainFuel(), items = [], pos = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5), csg = C ? C.sg || 0 : 0;
  if (fuel) items.push({ k: 'chain', sg: csg });
  S.pend.slice(0, fuel ? 2 : 3).forEach(e => items.push({ k: 'enc', e, sg: fuel ? (csg + 1 + rnd(2)) % 3 : rnd(3), sp: e.sh === 1 }));
  U.rad = { items, pos, chain: !!fuel };
  radarScreen(); sfx.rustle();
}
function radarScreen() {
  const R = U.rad, C = S.chain; if (!R) return hunt();
  const at = {}; R.items.forEach((it, i) => { at[R.pos[i]] = i; });
  const bl = '<i></i><i></i><i></i><i></i>';
  const field = RADPOS.map((p, j) => { const i = at[j], it = i == null ? null : R.items[i];
    return it ? `<button type="button" class="rtf sg${it.sg}${it.sp ? ' sp' : ''}${it.k === 'chain' && calm() ? ' ring' : ''}" style="left:${p[0]}%;top:${p[1]}%" data-a="rad" data-i="${i}" aria-label="${it.k === 'chain' ? 'The patch that moves like your chain' : it.sp ? 'A moving patch with a sparkle' : 'A moving patch'}">${bl}</button>` : `<span class="rtf still" style="left:${p[0]}%;top:${p[1]}%" aria-hidden="true">${bl}</span>`; }).join('');
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="later">Save for later</button><span class="pill tn">${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'} waiting</span></div>
    <div><h1 class="big">The grass is moving.</h1><p class="mut" style="margin-top:6px">${R.chain ? tl('One patch moves like your chain. Step in there to meet the same Pokémon again. Any other patch ends the chain.') : tl('Step into a patch that moves. A sparkle means a shiny is in there.')}</p></div>
    ${C ? `<div class="rchn"><span class="rtf sg${C.sg || 0} mini" aria-hidden="true">${bl}</span><span class="sp"><b>Chain ${C.n} · ${esc(D(C.id)[0])}</b><span class="sm tn">${R.chain ? `the next one is shiny 1 in ${Math.max(1, Math.round(1 / chainOdds(C.n)))}` : tl('Resting: it needs a waiting encounter as common as itself.')}</span></span>${spr(C.id, { s: '40px' })}</div>` : ''}
    <div class="rfield">${field}</div>
    ${tipEl('rad', tl('Catch the same Pokémon again and again, and the odds of a shiny climb with the chain.'), 2)}`, 'tint', 'var(--r1)');
}
function hunt() {
  encQuiet(); U.rad = null;
  if (!S.pend.length) { closeOv(); return render(); }
  if (radarOn() && (S.pend.length >= 2 || chainFuel())) return radarOpen();
  meet(S.pend[0]);
}
function meet(e) {
  E.e = e; E.done = null; E.busy = true;
  if (!(S.items[E.ball] > 0)) E.ball = bestBall();
  if (E.e.myst && typeof legendIntro === 'function' && typeof LEG !== 'undefined' && LEG[E.e.id]) return mystIntro(E.e);
  delete E.e.myst;
  S.seen[E.e.id] = 1;
  drawEnc(true);
  sfx.appear(); cry(E.e.id, 650);
  setTimeout(() => { E.busy = false; aim(); }, 1150);
}
/* Hvem den legendariske er, vises først her: filmen dens spilles (den samme som i et raid), og så står den i gresset. */
async function mystIntro(e) {
  const B = { tr: legTr(e.id), foe: [{ id: e.id, lv: e.lv }], b: 0, mode: 'myst', lap: 0, over: '' };
  BT.B = B; E.mus = 1;
  try { PACK.unlock(); await legendIntro(B); } catch (_) {}
  if (BT.B !== B) { return; }
  BT.B = null;
  if (E.e !== e || !S.pend.includes(e)) return;
  delete e.myst; S.seen[e.id] = 1; save(true);
  drawEnc(true); buzz([40, 60, 40]);
  setTimeout(() => { E.busy = false; aim(); }, 1150);
}
function drawEnc(reveal) {
  if (!(S.items[E.ball] > 0)) E.ball = bestBall();
  const e = E.e, d = D(e.id), n = countOf(e.id), noBalls = !BALLS.some(k => S.items[k] > 0), call = e.sh ? (e.sh === 2 ? 'Dark' : 'Shiny') : e.t >= 2 ? TIERS[e.t] : '';
  /* Køen: en prikk for hvert møte som venter. Prikkene er like: hverken hvem det er eller hvor sjeldent det er, vises før du møter det. */
  const q = S.pend.filter(x => x !== e).slice(0, 10).map(() => '<i></i>').join('');
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="later">Save for later</button><span class="row" style="gap:8px">${(S.cst || 0) >= 2 ? `<span class="pill tn estk">${S.cst} in a row</span>` : ''}<span class="pill tn" id="e-left">${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'} left</span></span></div>
    ${q ? `<div class="encq" aria-label="Encounters waiting">${q}</div>` : ''}
    <div class="mid r${e.t}${e.sh ? ' shy' : ''}"><div class="stage${reveal ? ' rev' : ''}" id="e-stage">${spr(e.id, { ani: 1, sh: e.sh, mega: defForm(e.id) })}<span class="tball">${ballEl(E.ball, '54px')}</span><span class="stars" id="e-stars"></span><span class="egrass" aria-hidden="true">${'<i></i>'.repeat(15)}</span>${reveal && call ? `<span class="ecall">${call}!</span>` : ''}</div>
      <div><div class="ename">${e.sh === 2 ? 'Dark ' : e.sh ? 'Shiny ' : ''}${esc(d[0])}${gs(e)}</div><div class="row" style="justify-content:center;margin-top:8px;flex-wrap:wrap;gap:6px">${tierEl(e.id)} ${types(e.id)} <span class="pill tn">Level ${e.lv}</span>${e.tp && e.tp !== 'calm' && !isLeg(e.id) ? `<span class="pill tn tpp tp-${e.tp}">${TEMPER[e.tp].n}</span>` : ''}</div>
      <div id="e-info"><p class="sm" style="margin-top:8px" id="e-msg">${e.ch != null && S.chain ? `<b style="color:var(--gold)">Chain ${S.chain.n}</b> · catch it to keep the chain going` : S.caught[e.id] ? (n ? `You already have ${n}.` : 'You have had it before.') : `<b style="color:var(--sage)">New to your collection</b> · +${NEWCOIN[e.t]} coins if you catch it`}</p>
      <div class="hearts" id="e-hearts" aria-label="Attempts left" style="margin-top:10px">${Array.from({ length: encTr(e) + (e.fed ? 1 : 0) }, (_, i) => `<i class="${i < e.tr ? '' : 'off'}"></i>`).join('')}</div>${e.fed ? '<p class="sm tn" style="margin-top:6px;color:var(--gold)">It ate a Golden Razz Berry: one more throw, and better odds.</p>' : ''}</div></div></div>
    <div id="e-ctl" style="display:flex;flex-direction:column;gap:12px">${noBalls ? `<p class="sm" style="text-align:center">You are out of balls. Buy more in the shop and the encounter will wait here.</p><div class="acts"><button type="button" class="btn pri" data-a="toshop">To the shop</button><button type="button" class="btn nf" data-a="skip">Let it go</button></div>` : `
      <div class="row sm tn" style="justify-content:space-between;gap:10px"><span id="e-odds">${oddsEl(e)}</span><span style="text-align:right">${know() === 0 && S.mons.length < 3 ? tl('Tap Throw when the marker is over the green') : e.tp && TEMPER[e.tp] && !isLeg(e.id) ? TEMPER[e.tp].d : 'green = good · gold = perfect'}</span></div>
      <button type="button" class="meter" data-a="throw" aria-label="Throw when the marker is in the green zone"><span class="z" id="e-z"></span><span class="g" id="e-g"></span><span class="m" id="e-m"></span></button>
      <div class="balls">${BALLS.filter(k => S.items[k] > 0 || k === 'poke' || k === 'great' || k === 'ultra').map(k => `<button type="button" data-a="ball" data-k="${k}" aria-pressed="${E.ball === k}" aria-label="${SHOP[k].n}"${S.items[k] > 0 ? '' : ' disabled'}>${ballEl(k, '28px')}<span class="tn">${S.items[k]}</span></button>`).join('')}</div>
      ${S.items.gberry > 0 && !e.fed ? `<button type="button" class="btn sm2 wide" data-a="berry">Feed a Golden Razz Berry · one more throw (${S.items.gberry})</button>` : ''}
      <div class="acts"><button type="button" class="btn gold" data-a="throw">Throw</button><button type="button" class="btn nf" data-a="skip">Let it go</button></div>`}</div>`, 'tint', `var(--r${e.t})`);
  /* En shiny synes med en gang (steg 1c.6): stjernene og lyden i det den dukker opp. */
  if (reveal && e.sh === 1) setTimeout(() => { if (E.e === e && $('#e-stage')) shinyFx($('#e-stage')); }, 520);
}
/* Hvor god sjansen er med ballen som er valgt (i den grønne sonen). */
const oddsEl = e => { const o = oddsOf(e, E.ball); return `Catch odds: <b class="od${o}">${['tough', 'even', 'good'][o]}</b>`; };
/* Det du ser når fangsten sitter: potensialet avsløres stjerne for stjerne, og så det fangsten ga. */
function catchCard(r, e) {
  const m = r.mon, j = judge(m), st = ['Decent', 'Above average', 'Great', 'Outstanding', 'Flawless'].indexOf(j.t) + 1, reg = regOf(e.id), tot = REG[reg].b - REG[reg].a + 1, n = countOf(e.id);
  return `<div class="ecard"><div class="row" style="justify-content:center;gap:8px"><b class="ecard-h">${r.took ? 'It is yours.' : 'Caught!'}</b>${r.crit ? '<span class="pill ecrit">Critical capture</span>' : ''}</div>
    ${potOn() ? `<div class="epot" role="img" aria-label="Born with ${st} of 5 stars: ${j.t}"><span class="sm">Born with</span><span class="epot-s">${Array.from({ length: 5 }, (_, i) => `<i class="${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.16}s"></i>`).join('')}</span><b class="epot-t" style="animation-delay:${0.3 + st * 0.16}s">${j.t}</b></div>
    <div class="sm tn ecard-n">${NAT[m.nat]} nature · best stat ${SN[j.best]}${szTag(m)}</div>` : szOn() && szOf(m) !== 1 ? `<div class="sm tn ecard-n">${szTag(m)}</div>` : ''}
    ${r.bonus.c ? `<div class="ecoin"><b>+${coinEl(r.bonus.c)}</b><span class="sm">${esc(r.bonus.why.join(' · '))}</span></div>` : ''}
    ${r.chain && (r.chain.n >= 2 || radarOn()) ? `<div class="echn"><b>Chain ${r.chain.n}</b><span class="sm tn">${r.chain.start ? 'meet it again to build the chain' : `next one shiny 1 in ${Math.max(1, Math.round(1 / chainOdds(r.chain.n)))}`}${r.chain.egg >= 0 ? ' · it knows ' + esc(MOVES[r.chain.egg][0]) : ''}</span></div>` : ''}
    <div class="sm">${r.isNew ? `<b style="color:var(--sage)">New species</b> · ${REG[reg].n} ${dexCount(reg)} of ${tot}` : r.took ? `It has taken the place of your Mewtwo: the same Pokémon at Lv ${m.lv}, now dark, with perfect IVs and full training.` : `You have ${n} now. A duplicate sells for ${nb(sellValue(m))} coins.`}</div></div>`;
}
function aim() {
  cancelAnimationFrame(E.raf);
  if (!$('#e-m')) return;
  const z = zones(E.e, E.ball), c0 = 22 + Math.random() * 56;
  E.c = c0; E.t0 = performance.now();
  const put = () => { const a = $('#e-z'), b = $('#e-g'); if (!a || !b) return; a.style.cssText = `left:${E.c - z.g / 2}%;width:${z.g}%`; b.style.cssText = `left:${E.c - z.au / 2}%;width:${z.au}%`; };
  put();
  (function f(t) { const m = $('#e-m'); if (!m || E.busy) return; const s = (t - E.t0) / 1000;
    E.pos = 50 + 48 * Math.sin(s * z.sp * 2.4 + (z.jit ? 0.9 * Math.sin(s * 3.1) : 0)); m.style.left = E.pos + '%';
    if (z.drift) { E.c = Math.max(z.g / 2 + 2, Math.min(98 - z.g / 2, c0 + 13 * Math.sin(s * 1.5))); put(); }
    E.raf = requestAnimationFrame(f); })(E.t0);
}
function doThrow() {
  if (E.busy || !E.e || E.done) return;
  const e = E.e, z = zones(e, E.ball), dist = Math.abs(E.pos - E.c), zone = dist <= z.au / 2 ? 2 : dist <= z.g / 2 ? 1 : 0;
  const r = throwBall(e, E.ball, zone);
  if (!r) return;
  E.busy = true; cancelAnimationFrame(E.raf);
  const st = $('#e-stage'), msg = $('#e-msg'), hearts = $('#e-hearts').children;
  for (let i = 0; i < hearts.length; i++) hearts[i].className = i < e.tr ? '' : 'off';
  msg.innerHTML = r.p >= 1 ? '<b style="color:var(--gold)">Master Ball</b>' : zone === 2 ? '<b style="color:var(--gold)">Perfect throw</b>' : zone === 1 ? 'Nice throw' : 'Outside the zone';
  st.className = 'stage in'; sfx.thr(); buzz(30);
  const wobs = r.crit ? 1 : r.ok ? 3 : 1 + (Math.random() < r.p ? 1 : 0);
  if (r.crit) { st.classList.add('crit'); setTimeout(() => { tone(1568, 0, 0.09, 0.05, 'square'); tone(2093, 0.09, 0.14, 0.05, 'square'); buzz([30, 30, 90]); }, 300); }
  let i = 0;
  const step = () => {
    if (i < wobs) { st.className = 'stage held'; void st.offsetWidth; st.className = 'stage held wob'; sfx.wob(i); buzz(20); i++; return setTimeout(step, 700); }
    if (r.ok) {
      st.className = 'stage held'; if (e.sh || isLeg(e.id)) sfx.caught(); else sfx.got(); buzz([60, 40, 60, 40, 140]);
      $('#e-stars').innerHTML = Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283, d = 70 + Math.random() * 50; return `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${k * 0.02}s"></i>`; }).join('');
      const info = $('#e-info'); if (info) info.innerHTML = catchCard(r, e);
      { const sk = $('.estk'); if (sk) sk.textContent = `${S.cst} in a row`; }
      { const j = judge(r.mon), n = ['Decent', 'Above average', 'Great', 'Outstanding', 'Flawless'].indexOf(j.t) + 1; for (let k = 0; k < n; k++) setTimeout(() => { if ($('.ecard')) { tone(880 + k * 150, 0, 0.06, 0.035, 'triangle'); if (k === n - 1 && n >= 4) { sfx.found(); buzz([30, 30, 120]); } } }, 250 + k * 160); }
      if (r.bonus.c) setTimeout(() => { if ($('.ecard')) sfx.coin(); }, 1150);
      cry(e.id, 650); E.done = 'got'; $('#e-left').textContent = S.pend.length ? `${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'} left` : 'Last encounter';
    } else {
      st.className = 'stage out'; if (r.fled) sfx.flee(); else sfx.fail();
      if (r.fled) { setTimeout(() => { st.className = 'stage fled'; }, 380); msg.textContent = r.chb ? `It ran away, and your chain of ${r.chb} ended.` : 'It ran away.'; E.done = 'fled'; }
      else { msg.textContent = `It broke free. ${e.tr} ${e.tr === 1 ? 'attempt' : 'attempts'} left.`; }
    }
    setTimeout(() => {
      E.busy = false;
      const ctl = $('#e-ctl'); if (!ctl) return;
      if (E.done) { ctl.innerHTML = `<div class="acts">${S.pend.length ? `<button type="button" class="btn gold" data-a="hunt">Next encounter · ${S.pend.length} left</button><button type="button" class="btn nf" data-a="home">Done</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`; }
      else { st.className = 'stage'; drawEnc(false); aim(); }
    }, r.ok ? 1300 : 650);
  };
  setTimeout(step, 420);
}
function evoShow(m, from) {
  closeSheet();
  ov(`<div class="mid r${tierOf(m.id)}"><div class="stage rev">${spr(m.id, { it: m.item, ani: 1, sh: m.sh, mega: m.mega })}</div><div><p class="mut">${esc(D(from)[0])} evolved into</p><div class="ename">${esc(D(m.id)[0])}</div><div class="row" style="justify-content:center;margin-top:8px;gap:6px">${types(m.id)}</div></div></div>
    <div class="acts"><button type="button" class="btn pri" data-a="home">Continue</button></div>`, 'tint', `var(--t${D(m.id)[1]})`);
  sfx.evolved(); cry(m.id, 750); buzz([80, 50, 80, 50, 200]);
}

/* ---------- Handlinger ---------- */
const A = {
  tab: el => { if (!dayOpenQ()) return; U.tab = el.dataset.k; render(); $('#main').scrollTop = 0; enter(); },
  smore: () => { U.more = !U.more; render(); },
  today: () => todaySheet(),
  pset: el => setSheet(el.dataset.k),
  look: el => { LOOK.set(el.dataset.k, el.dataset.v); render(); setRe(); },
  badge: el => badgeSheet(el.dataset.k),
  sopen: () => { U.sopen = 1; render(); },
  minfo: el => modeInfo(el.dataset.k || ''),
  boinfo: el => { const k = el.dataset.k, it = SHOP[k], st = boostState(k); if (!it) return; toast(st === 'on' ? `${it.n} is already active.` : st === 'lk' ? `${it.n} opens at trainer level ${it.lv}.` : `${it.n} costs ${nb(it.p)} coins. You have ${nb(S.coins)}.`); },
  adm: () => { if (!isAdmin()) return; U.adm = !admOn(); try { localStorage.setItem(KEY + '.adm', U.adm ? '1' : '0'); } catch (_) {} render(); setRe(); toast(U.adm ? 'Admin view is on: everything is open, and the Sandbox is here.' : 'Admin view is off: you see what everyone sees.'); },
  wnok: () => { closeSheet(); if (!giftSheet() && !jAfter() && !incSheet() && !wkDay10() && typeof raidArrive === 'function' && raidGo()) raidArrive(); },
  fpk: () => { const k = Object.keys(S.fpk || {}).find(x => PACKS[x]); if (!k) return render(); const out = openPacks(k, Math.min(10, S.fpk[k])); if (!out) { snd('warn'); return toast('Catch some of your waiting encounters first.'); } sfx.coin(); render(); packShow(k, out); },
  newsok: el => { S.news = (S.news || []).filter(k => k !== el.dataset.k); save(true); render(); },
  /* «Done for today»: resten av appen kommer fram. Er det studert nok til kampene (og de er åpnet for deg), åpnes kampdagen med det samme. */
  dn: () => { if (typeof fairGate === 'function' && fairGate()) return; S.dn = dayKey(); stamp(); save(); sfx.open(); render(); $('#main').scrollTop = 0; enter();
    if (jReveal()) { U.jfrom = 'dn'; return; }
    if (has('battles') && S.party.length && openNeed() <= 0 && (!S.lad.day || (dayOld() && dayDone()))) BA.bdone(); else if (typeof raidArrive === 'function') raidArrive(); },
  lagv: el => { U.lag = el.dataset.k; U.cmp = null; render(); enter(); },
  fag: el => { U.fag = el.dataset.k; render(); },
  min: el => { U.min = +el.dataset.k; render(); },
  reg: el => { const r = +el.dataset.k, was = S.routes.includes(r); toggleRoute(r); if (was && S.routes.includes(r)) toast('At least one route has to stay on.'); render(); },
  start: el => { if (fairGate()) return; if (typeof SBX !== 'undefined' && SBX) return toast('Leave the sandbox before you start a session: nothing in here is saved.'); if (workClash()) return; if (!(el && el.dataset.ok) && typeof dayOld === 'function' && dayOld() && (simPending() || !dayDone())) return openSheet(`<h2 class="h" style="margin-top:0">Yesterday's battles are still open</h2><p class="sm">${simPending() ? 'A simulated result is waiting for your answer. ' : ''}Starting a focus session closes the battles from your last battle day, and what you have not played or accepted is lost.</p><div class="acts"><button type="button" class="btn gold" data-a="close">Back to the battles</button><button type="button" class="btn nf" data-a="start" data-ok="1">Start the session anyway</button></div>`); closeSheet(); const why = honestWhy(); if (why) return honestAsk(why); startTimer(FAGS[U.fag] ? U.fag : curFag(), U.min || S.last.min); sfx.start(); showTimer(); },
  honyes: el => { honestOk(el.dataset.k); closeOv(); startTimer(FAGS[U.fag] ? U.fag : curFag(), U.min || S.last.min); sfx.start(); showTimer(); },
  clkagain: async el => { el.disabled = true; el.textContent = 'Checking…'; await netTime(); closeSheet(); render(); const L = clockCheck(); if (L) clockSheet(L); else { sfx.ok(); toast('The clock is fine.'); } },
  pause: () => { togglePause(); paintTimer(); },
  early: () => endTimer(),
  quit: () => { if (!U.quit) { snd('warn'); U.quit = 1; $('#t-quit').textContent = 'Tap again to cancel'; setTimeout(() => { U.quit = 0; const b = $('#t-quit'); if (b) b.textContent = 'Cancel'; }, 3000); return; } clearInterval(tick); dropAwake(); S.timer = null; save(true); document.title = 'Fokusdex'; closeOv(); render(); },
  home: () => { encQuiet(); closeOv(); render(); if (!jAfter() && !incSheet() && !giftSheet() && !wkDay10() && typeof raidArrive === 'function' && raidGo()) raidArrive(); },
  hunt: () => { if (jOn() && (S.jx || {}).sh === 1 && $('#sheet').hidden) { snd('ok'); closeOv(); render(); jAfter(); return; } closeSheet(); hunt(); },
  jok: () => { closeSheet(); if (jAfter() || incSheet()) return; const d = U.jfrom === 'dn'; U.jfrom = ''; if (d && has('battles') && S.party.length && openNeed() <= 0 && (!S.lad.day || (dayOld() && dayDone()))) BA.bdone(); else if (typeof raidArrive === 'function' && raidGo()) raidArrive(); },
  later: () => { cancelAnimationFrame(E.raf); encQuiet(); closeOv(); render(); },
  skip: () => { if (E.busy) return; cancelAnimationFrame(E.raf); if (E.e && E.e.ch != null && S.chain) { toast(`Your chain of ${S.chain.n} ended.`); S.chain = null; } dropPend(E.e); S.cst = 0; save(); hunt(); },
  rad: el => { const Q = U.rad, it = Q && Q.items[+el.dataset.i]; U.rad = null; if (!it) return hunt();
    if (it.k === 'chain') { const e = chainEnter(); return e ? meet(e) : hunt(); }
    if (!S.pend.includes(it.e)) return hunt();
    if (Q.chain && S.chain) { toast(`Your chain of ${S.chain.n} ended.`); S.chain = null; save(); }
    meet(it.e); },
  toshop: () => { closeOv(); U.tab = 'butikk'; render(); },
  ball: el => { if (E.busy) return; E.ball = el.dataset.k; drawEnc(false); aim(); },
  berry: () => { if (E.busy || !E.e || E.done) return; if (feedBerry(E.e)) { sfx.heal(); buzz(25); drawEnc(false); aim(); } },
  throw: () => doThrow(),
  mon: el => { const m = monBy(+el.dataset.u); if (m) { U.nick = 0; U.mvx = null; monSheet(m); } },
  /* Team (steg 1.6): rekkefølgen som vises, forklaringen som kvitteres, sammenligning og bytte rett fra kortet. */
  tord: el => { U.tord = el.dataset.k; render(); },
  tipok: el => { (S.tip || (S.tip = {}))[el.dataset.k] = 1; save(true); const c = el.closest('.tipc'), inner = !!el.closest('#ov, #sheet'); if (c) c.remove(); if (!inner) render(); },
  cmp: () => { U.cmp = U.cmp ? null : []; render(); },
  cmpick: el => { const u = +el.dataset.u, c = U.cmp || (U.cmp = []), i = c.indexOf(u); if (i >= 0) c.splice(i, 1); else c.push(u); if (c.length < 2) return render(); const a = monBy(c[0]), b = monBy(c[1]); U.cmp = null; U.sw = null; render(); cmpSheet(a, b); },
  cmpw: el => { U.sw = { mode: 'cmp', u: +el.dataset.u }; U.swq = ''; swapSheet(); },
  tsw: el => { U.sw = { mode: 'swap', u: +el.dataset.u }; U.swq = ''; swapSheet(); },
  tswb: () => { if (U.sw) swapSheet(); else closeSheet(); },
  tsws: el => { U.sws = el.dataset.k; swapSheet(1); },
  tswc: el => { const w = U.sw || {}; cmpSheet(monBy(w.u), monBy(+el.dataset.u)); },
  tswp: el => { const w = U.sw || {}, m = monBy(+el.dataset.u), cur = monBy(w.u); if (!m) return; if (w.mode === 'cmp') { sfx.open(); return cmpSheet(cur, m); } teamSwap(w.mode === 'slot' ? m : cur, w.mode === 'slot' ? cur : m); },
  tswgo: el => teamSwap(monBy(+el.dataset.o), monBy(+el.dataset.u)),
  tswr: el => { const m = monBy(+el.dataset.u); if (!m || S.party.length < 2) return; toggleParty(m); U.sw = null; closeSheet(); render(); toast(`${mName(m)} is off the team.`); },
  mstat: el => { const m = monBy(+el.dataset.u); if (m) statSheet(m); },
  mback: el => { const m = monBy(+el.dataset.u); if (m) monSheet(m); else closeSheet(); },
  mvinfo: el => { const m = monBy(+el.dataset.u), x = +el.dataset.k; if (!m) return; U.mvx = U.mvx === x ? null : x; monSheet(m, 1); },
  mvsug: el => { const m = monBy(+el.dataset.u); if (!m) return; U.mvsel = suggestMoves(m); movePick(m, 1); toast('Four picked. Change any you like, then save.'); },
  spec: el => specSheet(+el.dataset.k),
  close: () => closeSheet(),
  avatar: () => avSheet(false),
  ach: () => achSheet(),
  achget: el => {
    const a = achBy(el.dataset.k), R0 = rankOf(), r = achClaim(el.dataset.k); if (!r) return;
    sfx.coin(); buzz(12); U.asN = null; render(); achSheet(); toast(`${a.n}: ${rewTxt(r)}`);
    const R1 = rankOf(); if (R1.i > R0.i) rankUp(R1);
  },
  achall: () => {
    const R0 = rankOf(), o = achClaimAll(); if (!o.n) return;
    sfx.sell(); buzz([12, 30, 12]); U.asN = null; render(); achSheet(); toast(`${o.n} medal${o.n > 1 ? 's' : ''}: ${rewTxt(o)}`);
    const R1 = rankOf(); if (R1.i > R0.i) rankUp(R1);
  },
  rkok: () => { const l = document.querySelector('#sheet .rkup'); if (l) l.remove(); },
  avall: () => avSheet(true),
  avpick: el => { S.av = el.dataset.k || ''; save(); closeSheet(); render(); toast(S.av ? `You are now ${avName()}.` : 'Character removed.'); },
  sort: el => { (S.bx || (S.bx = {})).s = el.dataset.k; save(true); render(); },
  bxg: () => { const b = S.bx || (S.bx = {}); b.g = bxGrp() ? 0 : 1; save(true); render(); },
  bxf: el => { U.bxf = U.bxf === el.dataset.k ? '' : el.dataset.k; render(); },
  dupt: el => { const m = monBy(+el.dataset.u); if (m && dupToggle(m)) render(); },
  dexr: el => { U.dex = +el.dataset.k; render(); },
  lead: el => { const m = monBy(+el.dataset.u); setPartner(m); closeSheet(); render(); toast(`${D(m.id)[0]} is now your partner.`); },
  party: el => { const m = monBy(+el.dataset.u); if (!m) return; if (!S.party.includes(m.u) && S.party.length >= 6) { snd('open'); U.sw = { mode: 'slot', u: m.u }; return swapSheet(); } const was = S.party.includes(m.u); toggleParty(m); snd(S.party.includes(m.u) === was ? 'warn' : was ? 'close' : 'ok'); render(); monSheet(m, 1); },
  fav: el => { const m = monBy(+el.dataset.u); m.fav = m.fav ? 0 : 1; save(); render(); monSheet(m, 1); },
  mvpick: el => { const m = monBy(+el.dataset.u); U.mvsel = m.mv.slice(); U.mvu = m.u; movePick(m); },
  mlearn: el => { const m = monBy(+el.dataset.u); if (m) learnSheet(m, 'sheet'); },
  mvtog: el => { const x = +el.dataset.k, s = U.mvsel, i = s.indexOf(x); if (i >= 0) s.splice(i, 1); else if (s.length < 4) s.push(x); else { $('#mv-err').textContent = 'Four is the limit. Tap one to remove it first.'; return snd('warn'); } movePick(monBy(U.mvu), 1); },
  mvsave: el => { const m = monBy(+el.dataset.u); if (!U.mvsel.length) { $('#mv-err').textContent = 'Keep at least one move.'; return snd('warn'); } m.mv = U.mvsel.slice(); save(); monSheet(m); toast('Moves saved.'); },
  candy: el => { const m = monBy(+el.dataset.u), k = m ? useCandyN(m, Math.max(1, +el.dataset.n || 1)) : 0; if (k) { sfx.coin(); render(); monSheet(m, 1); if (k > 1) toast(`${mName(m)} grew ${k} levels.`); } },
  held: el => { const m = monBy(+el.dataset.u); if (m) { sfx.open(); heldSheet(m); } },
  heldgive: el => { const m = monBy(+el.dataset.u), k = el.dataset.k; if (m && giveHeld(m, k)) { heldSnd(k); render(); monSheet(m); toast(`${mName(m)} now holds the ${HELD[k].n}.`); } },
  heldoff: el => { const m = monBy(+el.dataset.u), n = heldOf(m) ? heldOf(m).n : ''; if (m && giveHeld(m, '')) { sfx.close(); render(); monSheet(m); toast(`The ${n} is back in the bag.`); } },
  heldshop: el => { sfx.open(); heldShop(el && el.dataset.u ? +el.dataset.u : 0); },
  heldbuy: el => { const k = el.dataset.k, u = el.dataset.u ? +el.dataset.u : 0; if (buyHeld(k)) { heldSnd(k); render(); heldShop(u); toast(`${HELD[k].n} bought.`); } },
  mgive: el => { const m = monBy(+el.dataset.u), k = +el.dataset.k; if (!m) return; const had = megaOpts(m.id).includes(m.ms) || isLeg(m.id); if (bondMega(m, k)) { sfx.evo(); render(); monSheet(m, 1); toast(had ? `${megaName(k)} it is.` : `${mName(m)} now holds a Mega Stone.`); } },
  train: el => { const m = monBy(+el.dataset.u); if (!m) return; U.tru = m.u; U.tri = null; trainSheet(m); },
  trsel: el => { const m = monBy(U.tru); if (!m) return; U.tri = +el.dataset.k; trainSheet(m); },
  trback: () => { const m = monBy(U.tru); if (m) monSheet(m); else closeSheet(); },
  triv: () => { const m = monBy(U.tru); if (!m) return; const i = U.tri; if (buyIv(m, i)) { sfx.coin(); render(); trainSheet(m); toast(`${SN[i]} is Hyper trained: it now counts as IV 31.`); } },
  trev: el => { const m = monBy(U.tru); if (!m) return; const i = U.tri, n = buyEv(m, i, +el.dataset.n); if (n) { sfx.coin(); render(); trainSheet(m); } },
  trclr: el => { const m = monBy(U.tru); if (!m) return; const i = U.tri; if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = `Tap again: remove ${m.ev[i]}`; return; } clearEv(m, i); render(); trainSheet(m); toast(`${SN[i]} training removed. The points are free again.`); },
  evolve: el => { const m = monBy(+el.dataset.u), from = m.id; if (evolve(m, +el.dataset.k)) { render(); evoShow(m, from); } },
  sell: el => { const m = monBy(+el.dataset.u); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.innerHTML = 'Tap again to sell'; return; } const v = sell(m), ps = SOLDPASS; save(); sfx.sell(); closeSheet(); render(); toast(`Sold for ${nb(v)} coins.${ps ? ` ${mName(ps.to)} learned ${ps.mv.map(x => MOVES[x][0]).join(' and ')} from it.` : ''}`); },
  selldupes: el => { const du = dupes(); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = `Tap again to sell ${du.length}`; return; } let v = 0, ps = 0; du.forEach(m => { v += sell(m); if (SOLDPASS) ps++; }); save(); sfx.sell(); render(); toast(`${du.length} sold for ${nb(v)} coins.${ps ? ' Their egg moves were passed on to the ones that stay.' : ''}`); },
  buy: el => { const k = el.dataset.k; if (buy(k)) { (k === 'egg' ? sfx.egg : sfx.coin)(); render(); if (el.dataset.s) itemSheet(k); toast(BOUGHT[k] || `${SHOP[k].n} bought.`); } },
  buy10: el => { const k = el.dataset.k; if (buyN(k, 10)) { sfx.coin(); setTimeout(sfx.coin, 90); render(); if (el.dataset.s) itemSheet(k); toast(`10 × ${SHOP[k].n} bought.`); } },
  shopt: el => { U.shop = el.dataset.k; render(); },
  tutor: el => tutorSheet(el.dataset.k),
  tutmv: el => tutMoveSheet(+el.dataset.k),
  tutteach: el => { const m = monBy(+el.dataset.u), x = +el.dataset.k; if (!m || !tutTeach(m, x)) return snd('warn'); sfx.learn(); render(); tutMoveSheet(x, 1); toast(`${mName(m)} learned ${MOVES[x][0]}.${m.mv.includes(x) ? '' : ' Pick it under Moves, Change on its card.'}`); },
  tutmore: el => { const m = monBy(+el.dataset.u); if (m) tutMonSheet(m); },
  tutlearn: el => { const box = el.closest('[data-u]'), m = monBy(box ? +box.dataset.u : 0), x = +el.dataset.k; if (!m) return; const why = tutWhy(m, x);
    if (why) { const e = $('#mv-err'); if (e) e.textContent = why === 'coins' ? `You need ${nb(tutPrice(x) - S.coins)} more coins.` : why === 'symbol' ? `This one opens with the ${FACSYM[tutNeed(x)]} Symbol from the Battle Frontier.` : why === 'locked' ? lockMsg() : 'It cannot learn that one.'; return snd('warn'); }
    tutTeach(m, x); sfx.learn(); if (U.mvu !== m.u || !U.mvsel) { U.mvsel = m.mv.slice(); U.mvu = m.u; } if (!U.mvsel.includes(x) && U.mvsel.length < 4) U.mvsel.push(x); render(); movePick(m); toast(`${mName(m)} learned ${MOVES[x][0]}.`); },
  mvpick2: el => { const m = monBy(+el.dataset.u); if (!m) return; if (U.mvu !== m.u || !U.mvsel) { U.mvsel = m.mv.slice(); U.mvu = m.u; } movePick(m); },
  sinfo: el => itemSheet(el.dataset.k),
  pinfo: el => packSheet(el.dataset.k),
  pack: el => { closeSheet(); const k = el.dataset.k, out = openPacks(k, Math.max(1, +el.dataset.n || 1)); if (!out) return toast(S.pend.length > PACKMAX ? 'Catch some of your waiting encounters first.' : 'Not enough coins.'); sfx.coin(); packShow(k, out); },
  pkopen: () => {
    const X = U.pk, st = $('#pkst'), pk = st && st.querySelector('.pk-pack'); if (!X || !pk || pk.classList.contains('rip')) return;
    pk.classList.add('rip'); sfx.appear(); buzz(pk.classList.contains('hot') ? [40, 40, 40, 40, 140] : [30, 40, 30]);
    setTimeout(() => { const s2 = $('#pkst'); if (!s2 || U.pk !== X) return; s2.classList.add('open');
      s2.innerHTML = `<div class="pk-cards">${X.packs[X.i].map((e, j) => `<button type="button" class="pk-card r${e.t} a${e.myst ? 4 : e.t}${e.sh ? ' shy' : ''}" data-a="pkflip" data-k="${j}" style="--i:${j}" aria-label="Card ${j + 1}"><span class="pk-in"><span class="pk-back"><i></i></span>${pkFront(e)}</span></button>`).join('')}</div>`;
      $('#pkt').textContent = 'Tap a card to turn it'; }, 330);
  },
  pkflip: el => {
    const X = U.pk, st = $('#pkst'); if (!X || !st) return;
    if (el.classList.contains('on')) { if (!st.querySelector('.pk-card:not(.on)') && X.i < X.packs.length - 1) A.pknext(); return; }
    const e = X.packs[X.i][+el.dataset.k]; if (!e) return;
    el.classList.add('on'); if (!e.myst && !X.demo) S.seen[e.id] = 1;
    el.setAttribute('aria-label', e.myst ? 'A legendary Pokémon. Who it is, you find out in the grass' : `${D(e.id)[0]}, ${e.sh ? 'shiny, ' : ''}${TIERS[e.t]}, level ${e.lv}${S.caught[e.id] ? '' : ', new species'}`);
    if (e.myst) { sfx.event(); buzz([80, 50, 80, 50, 80, 50, 320]); } else if (e.t >= 3 || e.sh) { sfx.evo(); buzz([60, 40, 60, 40, 220]); } else if (e.t >= 2) { sfx.got(); buzz(40); } else { sfx.found(); buzz(15); }
    if (!e.myst) cry(e.id, 280, 0.35);
    const big = pkBig(e); if (big) pkHero(el, e);
    if (!st.querySelector('.pk-card:not(.on)')) pkPackDone(big);
  },
  pknext: () => { const X = U.pk; if (!X || X.i >= X.packs.length - 1) return; const tray = $('#pktray'), at = X.packs.slice(0, X.i).reduce((a, p) => a + p.length, 0); if (tray) X.packs[X.i].forEach((e, j) => { const sl = tray.children[at + j]; if (sl) sl.outerHTML = pkMini(e, j, { in: 1 }); }); X.i++; pkStage(); },
  pkskip: () => { const X = U.pk; if (!X) return; if (!X.demo) { X.packs.forEach(p => p.forEach(e => { if (!e.myst) S.seen[e.id] = 1; })); save(true); } X.i = X.packs.length - 1; pkEnd(); },
  pktog: el => { const X = U.pk; if (!X || X.fin || X.demo) return; const e = X.packs.reduce((a, p) => a.concat(p), [])[+el.dataset.k]; if (!e || e.myst) return; if (X.rel.has(e)) X.rel.delete(e); else X.rel.add(e); pkEnd(); },
  pkrel: () => { const X = U.pk; if (!X) return; const r = releaseEncs([...X.rel]); X.rel = new Set(); X.fin = 1; if (r.n) { sfx.sell(); toast(`${r.n} let go for ${nb(r.v)} coins.`); } pkEnd(); },
  pkkeep: () => { const X = U.pk; if (!X) return; X.rel = new Set(); X.fin = 1; pkEnd(); },
  pkpick: () => { const X = U.pk; if (!X) return; X.pick = 1; X.rel = null; pkEnd(); },
  pkdone: () => { U.pk = null; closeOv(); render(); },
  pkhunt: () => { U.pk = null; hunt(); },
  sound: () => { S.sound = S.sound ? 0 : 1; save(); sfx.chip(); render(); setRe(); },
  /* Lyden når et møte dukker opp under en økt (S.fsnd = 0: av). Bjella på timeren og knappen under Settings. */
  fsnd: () => { S.fsnd = S.fsnd === 0 ? 1 : 0; save(); const b = $('#t-snd'); if (b) { b.innerHTML = bellSvg(S.fsnd !== 0); b.setAttribute('aria-pressed', S.fsnd !== 0); } else { render(); setRe(); } toast(S.fsnd === 0 ? 'Encounter sound off' : 'Encounter sound on'); },
  lang: el => { S.lang = el.dataset.k === 'no' ? 'no' : 'en'; save(true); if (!S.started) intro(); else { render(); setRe(); } },
  diff: el => { S.diff = +el.dataset.k; save(); render(); setRe(); toast(`Difficulty: ${diff().n}. It stays fixed from the first battle of a run until the run is over.`); },
  hfx: () => { S.hfx = S.hfx === 0 ? 1 : 0; save(); render(); setRe(); },
  hty: () => { S.hty = S.hty === 0 ? 1 : 0; save(); render(); setRe(); },
  nick: el => { const m = monBy(+el.dataset.u); if (!m) return; U.nick = m.u; monSheet(m, 1); const i = $('#nkin'); if (i) { i.focus(); i.select(); } },
  nicksave: el => { const m = monBy(+el.dataset.u), i = $('#nkin'); if (!m) return; const n = setNick(m, i ? i.value : ''); U.nick = 0; render(); monSheet(m, 1); toast(n ? `${D(m.id)[0]} is now called ${n}.` : `${D(m.id)[0]} goes by its own name again.`); },
  form: el => { const m = monBy(+el.dataset.u); if (!m || !setForm(m, +el.dataset.k || 0)) return; sfx.evo(); render(); monSheet(m, 1); toast(`${mName(m)} is now in its ${formName(m)} Forme.`); },
  music: () => { S.music = S.music === 0 ? 1 : 0; save(); sfx.chip(); render(); setRe(); },
  cries: () => { S.cries = S.cries ? 0 : 1; save(); sfx.chip(); if (S.cries) { const p = partner(); if (p) cry(p.id, 160); } render(); setRe(); },
  plan: () => subjSheet(),
  seadd: () => { if (U.sd.length < 4) { U.sd.push({ k: '', n: '', ty: [], t: '', h: '', d: '' }); seRedraw(); const f = document.querySelectorAll('#se .sein'); if (f.length) f[f.length - 1].focus(); } },
  sedel: el => { U.sd.splice(+el.dataset.i, 1); U.seo = {}; seRedraw(); },
  sety: el => { const s = U.sd[+el.dataset.i], t = +el.dataset.k; if (s.ty.includes(t)) s.ty = s.ty.filter(x => x !== t); else { s.ty.push(t); if (s.ty.length > 2) s.ty.shift(); } seRedraw(); },
  exam: () => examSheet(),
  adv: () => { U.adv = !U.adv; render(); },
  work: () => { U.wd = null; workSheet(); },
  wday: el => { const d = +el.dataset.k, i = U.wd.indexOf(d); if (i >= 0) U.wd.splice(i, 1); else U.wd.push(d); el.setAttribute('aria-pressed', String(i < 0)); },
  wsave: () => { const r = wRead('w'); if (typeof r === 'string') { $('#w-err').textContent = r; return snd('warn'); } S.work = S.work || {}; S.work.fx2 = Object.assign(r, { days: U.wd.slice().sort(), from: dayKey(addDays(new Date(), 1)) }); save(true); closeSheet(); render(); toast(U.wd.length ? 'Work days saved. They count from tomorrow.' : 'No fixed work days from tomorrow.'); },
  wone: () => { const r = wRead('o'), d = ($('#o-d') || {}).value || ''; if (typeof r === 'string') { $('#w-err').textContent = r; return snd('warn'); } if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < dayKey() || (d === dayKey() && r.s <= nowMin())) { $('#w-err').textContent = 'A single day must be added before it starts.'; return snd('warn'); } S.work = S.work || {}; (S.work.one = S.work.one || {})[d] = r; save(true); workSheet(); toast('Work day added.'); },
  wdel: el => { const d = el.dataset.k, w = ((S.work || {}).one || {})[d]; if (!w || d < dayKey() || (d === dayKey() && w.s <= nowMin())) { snd('warn'); return toast('That day has already started.'); } delete S.work.one[d]; save(true); workSheet(); },
  woff: el => { if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = 'Tap again to turn off'; return; } const k = dayKey(), W = S.work || {}; W.fx2 = { days: [], from: dayKey(addDays(new Date(), 1)) }; for (const d in W.one || {}) if (d > k) delete W.one[d]; S.work = W; save(true); closeSheet(); render(); toast('Work days are off from tomorrow.'); },
  wearly: el => { if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = 'Tap again: work is over for today'; return; } (S.work.early = S.work.early || {})[dayKey()] = nowMin(); const b = workCredit(); save(true); U.wlock = 0; closeOv(); render(); toast(b ? `Work done: +${hm(b)} for the battle bonus.` : 'Work done for today.'); },
  exgo: () => { const r = exRead(true); if (typeof r === 'string') { $('#ex-err').textContent = r; return snd('warn'); } const c = $('#ex-cap'); if (c) S.cap = +c.value; examStart(); save(true); closeSheet(); render(); sfx.ok(); toast('Exam period on. Good luck!'); },
  exsave: () => { const r = exRead(false); if (typeof r === 'string') { $('#ex-err').textContent = r; return snd('warn'); } examCheck(); save(true); closeSheet(); render(); toast('Exam dates saved.'); },
  exend: el => { if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = 'Tap again to end'; return; } examStop(); save(true); closeSheet(); render(); toast('Exam period ended.'); },
  sesave: () => { const r = seRead(); if (typeof r === 'string') { $('#se-err').textContent = r; return snd('warn'); } if (U.ex) S.extra = Object.keys(EXTRA).filter(k => k === 'annet' || U.ex.includes(k)); setSubjects(r); save(); closeSheet(); render(); toast('Subjects saved.'); },
  extog: el => { const k = el.dataset.k, i = U.ex.indexOf(k); if (i >= 0) U.ex.splice(i, 1); else U.ex.push(k); el.setAttribute('aria-pressed', String(i < 0)); },
  /* Starten (steg 1.10): fram og tilbake mellom de fem skjermene, og valgene på dem. */
  stnext: () => { const st = U.step || 0; if ((st === 1 && START.know == null) || (st === 3 && !pick)) return; U.step = st + 1; intro(); $('#ov').scrollTop = 0; },
  stback: () => { U.step = Math.max(0, (U.step || 0) - 1); intro(); },
  stknow: el => { START.know = +el.dataset.k; intro(); },
  stdiff: el => { START.diff = +el.dataset.k; intro(); },
  streg: el => { const r = +el.dataset.k; if (!STARTERS[r] || START.reg === r) return; START.reg = r; if (!STARTERS[r].includes(pick)) pick = 0; intro(); },
  seopen: el => { const O = U.seo || (U.seo = {}), i = +el.dataset.i; O[i] = O[i] === el.dataset.k ? '' : el.dataset.k; seRedraw(); },
  know: el => { S.know = Math.max(0, Math.min(2, +el.dataset.k || 0)); save(); render(); setRe(); },
  sestart: () => { const r = seRead(); if (typeof r === 'string') { $('#se-err').textContent = r; return snd('warn'); } setSubjects(r); const c = begin(pick, { reg: START.reg, know: START.know == null ? 1 : START.know, diff: stDiff() }); S.tour = 0; save(true); sfx.evo(); closeOv(); render(); tourShow(0); if (c) toast(`${nb(c)} coins for the hours you have already done.`); },
  sync: () => SBX ? (snd('warn'), toast('Leave the sandbox first: Sync is paused in here.')) : syncSheet(),
  synclb: () => { try { const lb = JSON.parse(localStorage.getItem('lb.gh')); $('#gh-r').value = lb.repo; $('#gh-t').value = lb.t; } catch (_) {} },
  syncsave: async () => {
    const t = $('#gh-t').value.trim(), r = $('#gh-r').value.trim();
    if (!t || !/^[\w.-]+\/[\w.-]+$/.test(r)) { $('#gh-s').textContent = 'Enter the repo as owner/name and paste the key.'; return snd('warn'); }
    ghSet(t, r); $('#gh-s').textContent = 'Connecting…';
    const p = await ghProbe();
    if (p.st === 'err') { const s = $('#gh-s'); if (s) s.textContent = ghState; GH = null; ghStore(); return sfx.warn(); }
    if (p.st === 'none') { await ghLink('local'); PACK.init(true); closeSheet(); render(); (ghState === 'ok' ? sfx.saved : sfx.warn)(); toast(ghState === 'ok' ? 'Sync is on. This game is now saved to GitHub.' : ghState); return; }
    U.remote = p.o;
    /* Viser hvor langt hver lagring er kommet, og merker den med mest framgang, så det ikke er mulig å velge feil ved et uhell. */
    const top = o => (o.mons || []).reduce((a, m) => Math.max(a, m.lv || 1), 1), mins = o => Object.values(o.log || {}).reduce((a, d) => a + (d.m || 0), 0);
    const sum = o => `Trainer level ${1 + Math.floor(Math.sqrt((o.xp || 0) / 300))} · ${o.mons.length} Pokémon · best Lv ${top(o)} · ${hm(mins(o))} focus · ${nb(o.coins || 0)} coins`;
    const here = saveScore(S) >= saveScore(p.o), more = '<span class="bonus" style="margin-left:6px">More progress</span>';
    openSheet(`<h2 class="h">Which game do you want to keep?</h2><p class="sm">There is already a save on GitHub. Choose one. The other is replaced, on GitHub or on this device (a replaced device save can be brought back from Backup).</p>
      <button type="button" class="card pick2" data-a="syncup"><b>Keep the game on this device${here ? more : ''}</b><span class="sm tn">${sum(S)}</span></button>
      <button type="button" class="card pick2" data-a="syncuse"${here ? ' data-warn="1"' : ''}><b>Use the save from GitHub${here ? '' : more}</b><span class="sm tn">${sum(p.o)}${p.o.at ? ' · saved ' + new Date(p.o.at).toLocaleDateString('en-GB') : ''}</span></button>
      <button type="button" class="btn wide" data-a="syncoff">Cancel</button>`);
  },
  syncuse: async el => { if (el.dataset.warn === '1' && el.dataset.ok !== '1') { el.dataset.ok = '1'; el.querySelector('b').textContent = 'Tap again: this device has more progress'; return; } await ghLink('remote', U.remote); PACK.init(true); closeSheet(); if (!$('#ov').hidden) closeOv(); render(); sfx.saved(); toast('Loaded the save from GitHub. Sync is on.'); },
  syncup: async () => { await ghLink('local', U.remote); PACK.init(true); closeSheet(); render(); (ghState === 'ok' ? sfx.saved : sfx.warn)(); toast(ghState === 'ok' ? 'This game replaced the save on GitHub. Sync is on.' : ghState); },
  syncoff: () => { ghSet('', ''); closeSheet(); render(); toast('Sync turned off.'); },
  backup: () => SBX ? (snd('warn'), toast('Leave the sandbox first.')) : backupSheet(),
  bkcopy: () => { const txt = b64e(JSON.stringify(S)); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied.'), () => { $('#bk-in').value = txt; toast('Copy the text in the field.'); }); },
  bkload: () => {
    let o = null; try { o = JSON.parse(b64d($('#bk-in').value.trim())); if (!o || o.v !== 1 || !Array.isArray(o.mons)) o = null; } catch (_) { o = null; }
    if (!o) { snd('warn'); return toast('That was not a valid copy.'); }
    /* En kopi som er eldre enn spillet på enheten, ville rullet tilbake det som har skjedd siden (tap, åpnede pakker, kast). Den tas ikke inn. */
    if (!canAdopt(o)) { const e = $('#bk-err'); if (e) e.textContent = 'This copy is older than the game on this device, so it cannot replace it. Copies are for moving to a new device, or for getting your game back after losing it.'; return sfx.warn(); }
    const p = S; adopt(o); carry(p); S.rev = Math.max(S.rev, p.rev || 0); save(); closeSheet(); render(); toast('Game restored.');
  },
  bkold: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: replaces the current game'; return; } try { const o = JSON.parse(localStorage.getItem(KEY + '.bak')); if (!o || o.v !== 1) throw 0; const rev = S.rev, p = S; adopt(o); carry(p); S.rev = Math.max(S.rev, rev); save(); closeSheet(); render(); toast('The earlier save is back.'); } catch (_) { snd('warn'); toast('No earlier save found.'); } },
  reset: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: everything is deleted'; return; } S = fresh(); save(); pick = 0; U.step = 0; U.sd = null; U.seo = {}; START.know = null; START.diff = null; START.reg = 1; closeSheet(); render(); },
  pick: el => { pick = +el.dataset.k; cry(pick, 120, 0.4); intro(); },
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  const fn = el && !el.disabled && (A[el.dataset.a] || BA[el.dataset.a] || HA[el.dataset.a] || (typeof XA !== 'undefined' && XA[el.dataset.a]) || WA[el.dataset.a]);
  if (fn) { press(el, fn); return; }
  if (ev.target.id === 'sheet') { sfx.close(); closeSheet(); }
});
let volT = 0;
document.addEventListener('input', ev => {
  const v = ev.target.dataset && ev.target.dataset.v;
  if (!v) return;
  S[v] = +ev.target.value; $('#vv-' + v).textContent = S[v] + '%';
  const now = performance.now(); if (now - volT < 180) return; volT = now;
  if (v === 'mvol') { if (typeof PACK !== 'undefined' && PACK.vol) PACK.vol(); if (typeof MUSIC !== 'undefined') MUSIC.vol(); } else if (v === 'vol') sfx.chip(); else { const p = partner(); if (p && now - (window.cryT || 0) > 700) { window.cryT = now; cry(p.id, 0, 0.45); } }
});
document.addEventListener('change', ev => { if (ev.target.dataset && ev.target.dataset.v) save(); });
document.addEventListener('input', ev => { const t = ev.target; if (t.dataset && t.dataset.f && U.sd && U.sd[+t.dataset.i]) { U.sd[+t.dataset.i][t.dataset.f] = t.value; const e = $('#se-err'); if (e) e.textContent = ''; } });
document.addEventListener('input', ev => { const t = ev.target; if (t.dataset && t.dataset.q === 'sw') { U.swq = t.value; const l = $('#swl'); if (l) l.innerHTML = swapList(); } else if (t.dataset && t.dataset.q === 'bx') { U.bxq = t.value; const l = $('#bxl'); if (l) l.innerHTML = boxGrid(); } });
document.addEventListener('change', ev => { if (ev.target.dataset && ev.target.dataset.c === 'cap') { S.cap = +ev.target.value; save(); render(); setRe(); } });
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !$('#sheet').hidden) return closeSheet();
  if ((ev.key === ' ' || ev.key === 'Enter') && E.e && !$('#ov').hidden && $('#e-m') && ev.target.tagName !== 'BUTTON') { ev.preventDefault(); doThrow(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - NT.at > 600000) netTime().then(() => { if (clockLock() && $('#ov').hidden && $('#sheet').hidden) render(); });
  const tab = tabShow();
  if (S.timer) { if (!tab) { keepAwake(); paintTimer(); } } else ghPull();
});

/* ---------- Oppstart ---------- */
/* iOS 26 gir Hjem-skjerm-apper et for kort vindu (innerHeight mindre enn skjermen). Da får body full skjermhøyde via --appH.
   Når Apple retter feilen, er avviket 0 og appen bruker vanlig høyde. */
function fixViewport() {
  let g = 0;
  try {
    const sa = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    if (sa && /iPhone|iPod/.test(navigator.userAgent) && matchMedia('(orientation: portrait)').matches) {
      g = Math.round(screen.height - window.innerHeight);
      if (!(g > 0 && g <= 100)) g = 0;
    }
  } catch (_) { g = 0; }
  if (g) document.documentElement.style.setProperty('--appH', (window.innerHeight + g) + 'px');
  else document.documentElement.style.removeProperty('--appH');
}
fixViewport();
window.addEventListener('resize', fixViewport);
window.addEventListener('orientationchange', () => setTimeout(fixViewport, 300));
load(); ghLoad();
saveHook = ghSoon;
/* kept = minutter fra økter som fulgte med da to lagringer møttes (jrMerge i game.js). */
ghHook = (adopted, kept) => { const s = $('#gh-s'); if (s) s.textContent = ghState === 'ok' ? 'Sync is on.' : ghState; if ((adopted || kept) && !S.timer && ($('#ov').hidden || !S.started)) { closeOv(); render(); toast(adopted ? 'Loaded a newer save from another device.' + (kept ? ` Your ${kept} min of focus on this device were kept.` : '') : `${kept} min of focus from another device were added.`); } };
/* En annen fane av appen har lagret noe nyere (tabSync i game.js): da vises det som gjelder nå. En økt som går, eier skjermen. */
function tabShow() { if (!tabSync()) return false; if (S.timer) showTimer(); else if ($('#ov').hidden) render(); return true; }
window.addEventListener('storage', ev => { if (ev.key === KEY) tabShow(); });
render();
clockCheck();
netTime().then(o => { if (o != null && clockCheck() && $('#ov').hidden) render(); });
if (S.started && S.timer) showTimer(); else if (!(typeof liveGate === 'function' && liveGate()) && S.started) { if (S.tour !== TOURV) tourShow(0); else if (!whatsNew() && !giftSheet() && !jAfter() && !incSheet() && !wkDay10() && typeof raidArrive === 'function' && raidGo()) raidArrive(); }
ghPull();
setTimeout(() => PACK.init(), 2500);
/* Adressen …/#lab åpner demoen direkte. */
if (location.hash === '#lab' && S.started && !S.timer) setTimeout(() => BA.lab(), 400);
/* OPPDATERINGER: når en ny versjon er lagt ut, henter service workeren den i bakgrunnen og tar over med en gang (skipWaiting og clients.claim i
   sw.js). Da sier appen fra: rett etter at den er åpnet (og ingenting er i gang) lastes den bare på nytt, ellers kommer en stripe nederst med «Reload».
   Appen ser etter en ny versjon når den åpnes, hver gang den kommer fram igjen, og hvert 30. minutt. hadCtl: den første installasjonen er ikke en oppdatering. */
const UPD = { t0: Date.now(), on: 0 };
function updBar() {
  if (!UPD.on || $('#updbar')) return;
  const b = document.createElement('div'); b.id = 'updbar'; b.className = 'updbar'; b.setAttribute('role', 'status');
  b.innerHTML = `<span>${tl('A new version of Fokusdex is ready.')}</span><button type="button" class="btn sm2 gold" data-a="upd">Reload</button>`;
  document.body.appendChild(b);
}
function updReady() {
  const busy = !!(S.timer || (typeof BT !== 'undefined' && BT.B) || !$('#ov').hidden || !$('#sheet').hidden);
  if (Date.now() - UPD.t0 < 6000 && !busy) { try { save(true); } catch (_) {} location.reload(); return; }
  UPD.on = 1; updBar();
}
A.upd = () => { if (typeof BT !== 'undefined' && BT.B) { snd('warn'); return toast('Finish the battle first, then reload.'); } try { save(true); } catch (_) {} location.reload(); };
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadCtl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtl) updReady(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const check = () => { try { reg.update(); } catch (_) {} };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    setInterval(check, 30 * 60000);
  }).catch(() => {});
}
