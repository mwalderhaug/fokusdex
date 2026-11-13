'use strict';
/* Fokusdex – skjermene. Hver fane tegnes på nytt fra tilstanden (S) når noe endres; fokusklokka og fangstmåleren oppdaterer bare sine egne elementer. */

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nb = n => Math.round(n).toLocaleString('en-US');
const hrs = m => (Math.round(m / 6) / 10).toLocaleString('en-US');

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
let MG = null, NB = null;
function out() { const a = ac(); if (!a) return null; if (!MG) { MG = a.createGain(); MG.connect(a.destination); } MG.gain.value = Math.pow((S.vol == null ? 70 : S.vol) / 100, 1.6) * 2.13; return MG; }
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
function cry(id, delay = 0, vol = 0.45) {
  if (!S.sound || !S.cries || !id || !ac()) return;
  const t0 = performance.now();
  cryBuf(id).then(buf => {
    const a = ac(), src = a.createBufferSource(), g = a.createGain();
    /* Skrikene er tatt opp med svært ulik styrke (de nyeste er mye sterkere enn de eldste), så hvert skrik jevnes til samme nivå før volumet legges på. */
    const L = loudOf(buf), norm = L > -90 ? Math.max(0.12, Math.min(2, Math.pow(10, (-18 - L) / 20))) : 0.4;
    src.buffer = buf; g.gain.value = Math.min(1.6, vol * norm * Math.pow((S.cvol == null ? 70 : S.cvol) / 100, 1.6) * 4.27); src.connect(g); g.connect(a.destination);
    src.start(a.currentTime + Math.max(0, delay - (performance.now() - t0)) / 1000);
    window.cryCount++;
  }).catch(() => {});
}
/* Lyd per type trykk. Handlinger med egen lyd (kast, kjøp, utvikling osv.) får ikke en ekstra. */
const OWN = new Set(['evpick', 'dsell', 'mgive', 'triv', 'trev', 'mvtog', 'start', 'throw', 'buy', 'pack', 'pkopen', 'pkflip', 'pkhunt', 'buyreg', 'evolve', 'sestart', 'sound', 'hunt', 'pick', 'cries', 'mon', 'candy', 'selldupes', 'sell', 'bmove', 'bsw', 'bgo', 'fgo', 'bdone', 'btap', 'music', 'lforget', 'tgive', 'tskip', 'fenter', 'fpick', 'fswm', 'mopen', 'msel', 'mgo', 'evinfo', 'lresume', 'lgive', 'lgiveo', 'honyes', 'clkagain', 'help', 'tour', 'tourgo', 'tourend', 'tourhub', 'trtipok', 'trtip', 'swopen', 'swtap', 'swundo', 'swnext', 'fstats', 'achget', 'achall', 'sbxsnd', 'held', 'heldgive', 'heldoff', 'heldshop', 'heldbuy']);
const SND = {
  tab: 'tab', lagv: 'tab', dexr: 'tab',
  fag: 'chip', min: 'chip', reg: 'chip', sort: 'chip', filt: 'chip', sety: 'chip', extog: 'chip',
  ball: 'ball', spec: 'open', plan: 'open', sync: 'open', backup: 'open', snext: 'ok', seadd: 'open', avatar: 'open', avall: 'open', avpick: 'ok', ach: 'open', rkok: 'ok',
  close: 'close', home: 'close', later: 'close', sback: 'close', sedel: 'close', skip: 'close', syncoff: 'close', toshop: 'open',
  train: 'open', trsel: 'chip', trback: 'close', trclr: 'warn',
  lead: 'ok', sesave: 'ok', syncsave: 'ok', bkcopy: 'ok', bkload: 'ok', party: 'ok', fav: 'fav',
  quit: 'warn', reset: 'warn', early: 'ok', pause: 'chip'
};
function click(a) { if (OWN.has(a)) return; (sfx[SND[a]] || sfx.tap)(); }
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) {} };

let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

/* ---------- Faner ---------- */
const U = { step: 1, sd: null, tab: 'fokus', lag: 'lag', fag: null, min: null, sort: 'ny', dex: null, R: null, enc: null, quit: 0 };
const NAV = [
  ['fokus', 'Focus', '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>'],
  ['lag', 'Team', '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6.5" r="2"/><circle cx="17" cy="9" r="2"/><path d="M12 12c-3 0-5.5 2.6-5.5 5.2 0 1.6 1.4 2.3 3 2.3 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.6 0 3-.7 3-2.3C17.500 14.6 15 12 12 12z"/>'],
  ['dex', 'Dex', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.500" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'],
  ['butikk', 'Shop', '<path d="M5 8h14l-1.2 11.200H6.2L5 8z"/><path d="M9 8V6.500a3 3 0 0 1 6 0V8"/>'],
  ['profil', 'Profile', '<circle cx="12" cy="9" r="5"/><path d="M8.500 13.200L7 21l5-2.500L17 21l-1.500-7.800"/>']
];
function renderNav() {
  $('#nav').innerHTML = NAV.map(([k, n, p]) => `<button type="button" data-a="tab" data-k="${k}"${U.tab === k ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg><span>${n}</span>${(k === 'fokus' && S.pend.length) || (k === 'profil' && U.as && U.as.open) ? '<i class="dot"></i>' : ''}</button>`).join('');
}
function render() {
  buildFags();
  if (!S.started) { $('#nav').hidden = true; $('#main').innerHTML = ''; return intro(); }
  $('#nav').hidden = false;
  /* Achievements: summen regnes én gang per tegning. Når et nytt mål er nådd siden sist, sies det fra én gang. */
  { const as = U.as = achSum(); if (U.asN != null && as.open > U.asN) setTimeout(() => toast('Achievement reached. Tap your picture to claim the reward.'), 700); U.asN = as.open; }
  renderNav();
  /* På en eventdag får forsiden eventets farger og en annen oppstilling (se VIEW.fokus). Eventet trekkes når dagens modus velges (modePick). */
  const E = U.tab === 'fokus' && S.party.length && typeof evNow === 'function' ? evNow() : null, EI = E ? evInfo(E) : null;
  $('#main').innerHTML = `<div class="wrap${E ? ' evpage ev-' + E.k : ''}${SBX ? ' insbx' : ''}"${E ? ` style="--ec:${EI.c};--ec2:${EI.c2 || EI.c}"` : ''}>${typeof sbxBar === 'function' ? sbxBar() : ''}${helpBtn()}${VIEW[U.tab]()}</div>`;
  /* Et område som nettopp ble åpnet (av nivå eller antall arter), sies fra om én gang. */
  if (S.nreg && S.nreg.length) { const l = S.nreg; S.nreg = []; save(true); setTimeout(() => toast(`New area: ${l.join(' and ')} ${l.length > 1 ? 'are' : 'is'} open. See Shop · Routes.`), 400); }
}
const VIEW = {};
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
  const html = `<div class="row" style="justify-content:space-between"><h2 class="h" style="font-size:22px;margin:0">Achievements</h2><button type="button" class="btn sm2" data-a="close">Close</button></div>
    <div class="ahead" style="--rk:${R.c}">${avFrame(R, 'lg', 1)}<div class="sp"><div class="sm">Your rank</div><b class="arank">${R.n}</b>
      <div class="bar"><i style="width:${pct}%;background:${R.c}"></i></div><div class="sm tn" style="margin-top:5px">${R.p} of ${tot} medals${R.nn ? ` · ${R.next - R.p} more to ${R.nn}` : ' · the highest rank'}</div></div></div>
    <div class="rkl">${RANKS.map((r, i) => `<span class="${i <= R.i ? 'on' : ''}${i === R.i ? ' now' : ''}" style="--rk:${r[2]}"><b>${r[0]}</b><i class="tn">${r[1]}</i></span>`).join('')}</div>
    <p class="sm">Every reward you claim is a medal. Medals raise your rank, and your rank is the frame and stamp around your picture.</p>
    ${sum.open ? `<button type="button" class="btn gold wide" data-a="achall">Claim all ${sum.open} reward${sum.open > 1 ? 's' : ''}</button>` : ''}
    ${gs.map(g => `<div class="lab">${g}</div><div class="card alist">${ACH.filter(a => a.g === g && a.ty == null).map(row).join('')}</div>`).join('')}
    <div class="lab">Types · species caught of each type</div><div class="tygrid">${ACH.filter(a => a.ty != null).map(tyc).join('')}</div>
    <button type="button" class="btn wide" data-a="avatar">${S.av ? 'Change character' : 'Pick a character'}</button>`;
  const sh = document.querySelector('#sheet .sheet.achsh');
  if (sh) { const y = sh.scrollTop; sh.innerHTML = `<span class="grab"></span>${html}`; sh.scrollTop = y; }
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
function topBar() {
  const l = tlv(), a = tlvXp(l), b = tlvXp(l + 1), st = streak(), as = U.as || achSum(), R = as.R;
  return `<div class="top"><button type="button" class="avb avf rk${R.i}${S.av ? '' : ' noav'}" data-a="ach" style="--rk:${R.c}" aria-label="Achievements. Rank: ${R.n}${as.open ? `. ${as.open} reward${as.open > 1 ? 's' : ''} to claim` : ''}">${S.av ? `${avIn(R)}<span class="avl tn">${l}</span>` : `${R.i >= RANKS.length - 1 ? '<i class="rkring"><i></i></i>' : ''}<span class="lv tn"><small>LVL</small>${l}</span>`}${as.open ? '<i class="dot"></i>' : ''}</button>
    <div class="sp"><div class="row" style="justify-content:space-between"><b class="rkt" style="color:${R.c}">${R.n}</b>${st >= 2 ? `<span class="pill" style="color:var(--sage)">${st}-day streak</span>` : ''}</div>
    <div class="bar" style="margin-top:7px"><i style="width:${Math.round((S.xp - a) / (b - a) * 100)}%"></i></div>
    <div class="sm tn" style="margin-top:4px">${nb(S.xp - a)} of ${nb(b - a)} XP to level ${l + 1}</div></div>
    ${coinEl(S.coins)}</div>`;
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
function mulBox(td) {
  const g = goalMin(), gh = Math.max(1, Math.round(g / 60)), top = goalTop(), at = m => Math.round((0.5 + Math.min(1, m / g) * (top - 0.5)) * 10) / 10, now = at(td), nx = td < g ? Math.ceil((td + 1) / 60) * 60 : 0;
  return `<div class="mulbox"><div class="row" style="justify-content:space-between;align-items:baseline"><span class="sm">Battle bonus so far today ${hq('bonus', 'What is the battle bonus?')}</span><b class="mulnow tn">×${now.toFixed(1)}</b></div>
    <div class="mulsteps" style="--n:${gh}">${Array.from({ length: gh }, (_, i) => `<span class="${td >= (i + 1) * 60 ? 'on' : td > i * 60 ? 'cur' : ''}"><i>${i + 1} h</i><b>×${at((i + 1) * 60).toFixed(1)}</b></span>`).join('')}</div>
    <p class="sm" style="margin-top:6px">${td >= g ? `Goal reached: battles pay ×${top.toFixed(1)} coins today.` : `It grows with every minute of focus and peaks at ×${top.toFixed(1)} at your goal of ${gh} h.${nx ? ` Next step: ×${at(Math.min(g, nx)).toFixed(1)} in ${Math.min(g, nx) - td} min.` : ''}`}</p>${purseNote()}</div>`;
}
VIEW.fokus = () => {
  const p = partner(), fag = FAGS[U.fag] ? U.fag : curFag(), min = U.min || S.last.min, td = todayMin(), left = Math.max(0, S.cap - td);
  /* Andre aktiviteter enn fagene teller halvt (rateOf): em = det økta er verdt. */
  const w = rateOf(fag), em = Math.round(min * w), subj = Object.keys(FAGS).filter(isSubj), oth = Object.keys(FAGS).filter(k => !isSubj(k)), chip = k => `<button type="button" class="chip" data-a="fag" data-k="${k}" aria-pressed="${fag === k}">${esc(F(k).n)}</button>`;
  const n = Math.floor(Math.min(em, left) / 20) + (min * w >= 25 && left >= em ? 1 : 0) + (S.incOn ? 1 : 0) + (S.lure > 0 ? 1 : 0);
  const rested = !(S.log[dayKey()] || {}).s, dx = (S.log[dayKey()] || {}).x || 0;
  let top = topBar(), h = '';
  if (p) {
    const ev = evoOpts(p), nx = ev.find(x => !x.ok), rdy = ev.find(x => x.ok), a = xpAt(p.lv), b = xpAt(p.lv + 1);
    h += `<button type="button" class="card partner" data-a="mon" data-u="${p.u}" style="--tc:var(--t${D(p.id)[1]});text-align:left;width:100%">${spr(p.id, { ani: 1, sh: p.sh, mega: p.mega })}
      <div class="sp"><div class="sm">Partner</div><div class="pn">${esc(D(p.id)[0])}</div>
      <div class="row sm tn" style="justify-content:space-between;margin-top:6px"><span>Level ${p.lv}</span><span>${rdy ? '<b style="color:var(--gold)">Ready to evolve</b>' : nx ? 'evolves ' + nx.why : ''}</span></div>
      <div class="bar" style="margin-top:5px"><i style="width:${Math.round((p.xp - a) / (b - a) * 100)}%"></i></div></div></button>`;
  }
  if (S.party.length > 1 || S.mons.length > 1) h += `<button type="button" class="card teamrow" data-a="tab" data-k="lag" aria-label="Open team"><span class="sm">Team</span><span class="tr-s">${S.party.slice(1).map(u => { const m = monBy(u); return m ? spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '38px' }) : ''; }).join('')}${Array.from({ length: 6 - S.party.length }, () => '<i></i>').join('')}</span><span class="sm tn">${S.mons.length} in box ›</span></button>`;
  if (S.pend.length) h += `<button type="button" class="card pendb" data-a="hunt" style="text-align:left;width:100%"><span class="grass live"><i></i><i></i><i></i><i></i></span><span class="sp"><b>${S.pend.length} ${S.pend.length === 1 ? 'encounter waiting' : 'encounters waiting'}</b><br><span class="sm">Something is rustling in the grass. Tap to step in.</span></span></button>`;
  h += `<div class="card">${subj.length ? `<div class="lab">Subject</div><div class="chips">${subj.map(chip).join('')}</div><div class="lab" style="margin-top:14px">Other things · count at half value</div><div class="chips">${oth.map(chip).join('')}</div>` : `<div class="lab">Subject</div><div class="chips">${oth.map(chip).join('')}</div>`}
    <div class="lab" style="margin-top:14px">Length</div><div class="chips">${[25, 45, 60, 75, 90].map(m => `<button type="button" class="chip tn" data-a="min" data-k="${m}" aria-pressed="${min === m}">${m} min</button>`).join('')}</div>
    ${S.regions.length > 1 ? `<div class="lab" style="margin-top:14px">Routes · tap to turn on or off</div><div class="chips">${S.regions.map(r => `<button type="button" class="chip" data-a="reg" data-k="${r}" aria-pressed="${S.routes.includes(r)}">${REG[r].n}</button>`).join('')}</div>` : ''}
    <button type="button" class="go" data-a="start" style="margin-top:16px">Start ${min} min</button>
    <p class="sm" style="margin-top:10px;text-align:center">${left <= 0 ? 'Your team is tired today: half XP and no encounters. Rest gives a bonus tomorrow.' : `${n} ${n === 1 ? 'encounter' : 'encounters'} · ${nb(Math.min(em, left) * 10 * (rested ? 1.5 : 1))} XP${rested ? ' with rested bonus' : ''}${F(fag).ty.length ? ' · more ' + F(fag).ty.map(t => TYN[t].toLowerCase()).join(' and ') : ''}${w < 1 ? `<br>${esc(F(fag).n)} counts at half value: ${min} min is worth ${em}.` : ''}`}</p></div>`;
  h += `<div class="card"><div class="row" style="justify-content:space-between"><b>Today</b><span class="sm tn">${hrs(td)} of ${hrs(S.cap)} h</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, Math.round(td / S.cap * 100))}%"></i></div>${dx ? `<p class="sm tn" style="margin-top:6px">Includes ${hrs(dx)} h of other things, counted as ${hrs(dx * OTHERW)} h.</p>` : ''}
    ${mulBox(td)}
    <div class="quests">${QUESTS.map(q => `<span class="${td >= q.m ? 'on' : ''}"><b>${td >= q.m ? '✓ ' : ''}${q.n}</b>${q.r}</span>`).join('')}</div>
    ${S.eggs.length ? `<div class="row" style="margin-top:14px"><span class="egg"></span><div class="sp"><div class="row sm tn" style="justify-content:space-between"><span>Egg${S.eggs.length > 1 ? ' (' + S.eggs.length + ')' : ''}</span><span>${S.eggs[0].need - S.eggs[0].got} min left</span></div><div class="bar gold" style="margin-top:5px"><i style="width:${Math.round(S.eggs[0].got / S.eggs[0].need * 100)}%"></i></div></div></div>` : ''}
    ${S.incOn ? '<p class="sm" style="margin-top:10px">Incense is lit for your next session.</p>' : ''}${S.lure > 0 ? `<p class="sm" style="margin-top:10px">Lure: one more encounter in your next ${S.lure} session${S.lure > 1 ? 's' : ''}.</p>` : ''}${S.slure > 0 ? `<p class="sm" style="margin-top:10px">Super Lure: rarer Pokémon in your next ${S.slure} session${S.slure > 1 ? 's' : ''}.</p>` : ''}${shinyBoost() > 1 ? `<p class="sm" style="margin-top:10px;color:var(--gold)">${SHOP[S.shb.k] ? SHOP[S.shb.k].n : 'Shiny incense'}: shiny odds ×${shinyBoost()} for ${hLeft(S.shb.until - Date.now())} more.</p>` : ''}${S.prism ? '<p class="sm" style="margin-top:10px;color:var(--gold)">Prism Lure: the next raid has a 1 in 5 chance of being shiny.</p>' : ''}${S.boost ? `<p class="sm" style="margin-top:10px;color:var(--gold)">Boss perk: ${S.boost.m}× coins for your next ${S.boost.n} session${S.boost.n > 1 ? 's' : ''}.</p>` : ''}</div>`;
  /* En vanlig dag ligger kampene nederst. På en eventdag står eventet og kampene øverst, og det som har med studeringen å gjøre, under. */
  const CL = clockLock(); if (CL) top += clockCard(CL);
  const battles = S.party.length ? raidCard() + ladderCard() : '', E = battles && typeof evNow === 'function' ? evNow() : null;
  return E ? `${top}${battles}<div class="evsep"><span>Study</span></div>${h}` : top + h + battles;
};

/* ---------- Laget ---------- */
VIEW.lag = () => {
  const head = `<div class="row" style="justify-content:space-between"><h1 class="big">${U.lag === 'boks' ? 'Box' : U.lag === 'dup' ? 'Duplicates' : 'Team'}</h1>${coinEl(S.coins)}</div>
    <div class="seg">${[['lag', `Team · ${S.party.length}`], ['boks', `Box · ${S.mons.length}`], ['dup', `Duplicates · ${S.mons.length - new Set(S.mons.map(m => m.id)).size}`]].map(([k, n]) => `<button type="button" data-a="lagv" data-k="${k}" aria-pressed="${U.lag === k}">${n}</button>`).join('')}</div>`;
  /* Duplikater: hver art du har flere av, med alle ved siden av hverandre. Selges én og én, eller alle samlet. ★ = svært gode medfødte IV. */
  if (U.lag === 'dup') {
    const G = dupGroups(), du = dupes(), val = du.reduce((s, m) => s + sellValue(m), 0), JT = ['Decent', 'Above average', 'Great', 'Outstanding', 'Flawless'];
    const pot = j => { const st = JT.indexOf(j.t) + 1; return `<span class="dpot" role="img" aria-label="Potential: ${j.t}, ${st} of 5 stars">${'<i class="on"></i>'.repeat(st)}${'<i></i>'.repeat(5 - st)}</span>`; };
    const row = (m, g) => { const why = dupWhy(m, g.best), top = ivTop(m), j = judge(m);
      return `<div class="drow"><button type="button" class="dmon" data-a="mon" data-u="${m.u}" aria-label="${esc(mName(m))}, level ${m.lv}, ${j.t} potential">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '46px', lazy: 1 })}<span class="sp"><span class="row" style="gap:6px"><b class="tn">Lv ${m.lv}</b><span class="sm dnat">${NAT[m.nat]}</span>${top ? '<span class="pill ivp">★ Top IVs</span>' : ''}</span><span class="row sm" style="gap:6px;margin-top:3px">${pot(j)}<span class="dnat">${j.t}</span></span></span></button>${why ? `<span class="pill dwhy">${why}</span>` : `<button type="button" class="btn sm2 dsell" data-a="dsell" data-u="${m.u}"${top ? ' data-top="1"' : ''}>Sell · ${nb(sellValue(m))}</button>`}</div>`; };
    return `${head}${G.length ? `<p class="sm">Every species you have more than one of. <b style="color:var(--gold)">★ Top IVs</b> marks the ones born with outstanding or flawless potential: worth keeping whatever the level.</p>
      ${du.length ? `<button type="button" class="btn wide" data-a="selldupes">Sell ${du.length} ${du.length === 1 ? 'duplicate' : 'duplicates'} for ${coinEl(val)}</button><p class="sm" style="margin-top:-2px">Selling them all keeps the highest level of each species (marked Kept) and every one with top IVs. The team, favourites, shinies and trained ones are never sold from here.</p>` : ''}
      <div class="stack">${G.map(g => `<div class="card dgrp"><div class="row" style="justify-content:space-between"><b>${esc(D(g.id)[0])} <span class="sm tn">× ${g.list.length}</span></b>${tierEl(g.id)}</div>${g.list.map(m => row(m, g)).join('')}</div>`).join('')}</div>` : '<div class="card"><p class="sm" style="text-align:center">No duplicates right now. When you catch a species you already have, it shows up here.</p></div>'}`;
  }
  if (U.lag !== 'boks') {
    const rows = Array.from({ length: 6 }, (_, i) => monBy(S.party[i])).map((m, i) => {
      if (!m) return `<button type="button" class="tcard empty" data-a="lagv" data-k="boks"><span class="plus">+</span><span class="sm">Empty slot. Pick one from the box.</span></button>`;
      const a = xpAt(m.lv), b = xpAt(m.lv + 1), rdy = evoOpts(m).some(x => x.ok);
      return `<button type="button" class="tcard${i ? '' : ' lead'}" data-a="mon" data-u="${m.u}" style="--tc:var(--t${D(m.id)[1]})">${hasNews(m) ? '<span class="bang abs" title="New move">!</span>' : ''}${spr(m.id, { it: m.item, ani: !i, sh: m.sh, mega: m.mega, s: i ? '60px' : '84px' })}
        <span class="sp"><span class="row" style="gap:6px"><b class="tn-n">${esc(mName(m))}${gs(m)}</b>${i ? '' : '<span class="pill" style="background:var(--sage);color:#152013">Partner</span>'}${typeof evTag === 'function' ? evTag(m) : ''}${rdy ? '<span class="pill" style="color:var(--gold)">Can evolve</span>' : ''}</span>
        <span class="row sm tn" style="justify-content:space-between;margin-top:5px"><span>Level ${m.lv} · ${i ? '30% XP' : 'all XP'}</span><span>${rdy ? '' : (evoOpts(m)[0] || {}).s ? 'evolves ' + evoOpts(m).map(x => x.s).filter((x, k, a) => a.indexOf(x) === k).join(' / ') : 'fully evolved'}</span></span>
        <span class="bar" style="margin-top:5px"><i style="width:${Math.round((m.xp - a) / (b - a) * 100)}%;background:var(--tc)"></i></span></span></button>`;
    }).join('');
    return `${head}<div class="stack">${rows}</div><p class="sm">Your partner sits in the timer and gets all XP from sessions. In battles the whole team gets XP afterwards. Tap a Pokémon to switch partner, change moves, rename it, evolve it or remove it. ! means a new move you have not looked at yet.</p>`;
  }
  const sorts = { ny: (a, b) => b.at - a.at, niva: (a, b) => b.lv - a.lv, sjelden: (a, b) => tierOf(b.id) - tierOf(a.id) || b.sh - a.sh || a.id - b.id, nr: (a, b) => a.id - b.id || b.lv - a.lv };
  const list = S.mons.slice().sort(sorts[U.sort]), du = dupes(), val = du.reduce((s, m) => s + sellValue(m), 0), evb = typeof evNow === 'function' ? evNow() : null;
  return `${head}
    <div class="chips">${[['ny', 'Newest'], ['niva', 'Level'], ['sjelden', 'Rarity'], ['nr', 'Number']].map(([k, n]) => `<button type="button" class="chip" data-a="sort" data-k="${k}" aria-pressed="${U.sort === k}">${n}</button>`).join('')}</div>
    ${du.length ? `<button type="button" class="btn wide" data-a="selldupes">Sell ${du.length} ${du.length === 1 ? 'duplicate' : 'duplicates'} for ${coinEl(val)}</button>` : ''}
    <div class="grid box">${list.map(m => { const t = tierOf(m.id); const eb = evb ? evBoost(m, evb) : null; return `<button type="button" class="cell nm r${t}${t >= 2 ? ' rr' : ''}${S.party.includes(m.u) ? ' inp' : ''}${eb && (eb.m > 1 || eb.mega) ? ' evc' : ''}" data-a="mon" data-u="${m.u}" aria-label="${esc(mName(m))}, level ${m.lv}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, lazy: 1 })}<span class="nx">${esc(mName(m))}</span><span class="l tn">${m.lv}</span>${m.fav ? '<span class="c">★</span>' : ''}${hasNews(m) ? '<span class="bang">!</span>' : ''}</button>`; }).join('')}</div>
    <p class="sm">Green dot = in team. Colored frame = rare or better. ! = a new move to look at.${evb && (evb.k === 'surge' || EVSTAT[evb.k]) ? ` A glowing corner = gets today's ${esc(evInfo(evb).n)} bonus.` : ''}</p>`;
};
/* Sekskanten: hver akse viser staten målt mot en sterk art (base 130) på samme nivå. */
/* Base stats, vist som på pokemondb.net: tallet og en farget stolpe for hver verdi, og summen nederst. Fargen følger verdien (rød under 30, oransje
   til 59, gul til 89, lysegrønn til 119, grønn til 149, turkis fra 150), og stolpen er full ved 180. */
const BSC = v => v < 30 ? '#e2574c' : v < 60 ? '#e8913d' : v < 90 ? '#e6c84f' : v < 120 ? '#a5cf3f' : v < 150 ? '#3fbf6e' : '#31b8b0';
function bstEl(id, mega, sh) {
  const b = mega ? MEGA[mega - 1][4] : BST[id - 1], tot = b.reduce((a, c) => a + c, 0);
  return `<div class="bst" role="table" aria-label="Base stats">${['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'].map((n, i) => `<div role="row"><span role="cell">${n}</span><b class="tn" role="cell">${b[i]}</b><span class="bst-b" role="cell" aria-hidden="true"><i style="width:${Math.min(100, Math.round(b[i] / 180 * 100))}%;background:${BSC(b[i])}"></i></span></div>`).join('')}<div class="bst-t" role="row"><span role="cell">Total</span><b class="tn" role="cell">${tot}</b><span class="sm" role="cell">${sh ? `Shiny: every stat is ${id === ARCEUS ? Math.round((SHINYARC - 1) * 100) : Math.round((SHINYST - 1) * 100)} % higher` : ''}</span></div></div>`;
}
function hexEl(m) {
  const st = statsOf(m), up = natUp(m.nat), dn = natDn(m.nat), cx = 130, cy = 104, R = 64;
  const ref = i => i === 0 ? Math.floor(291 * m.lv / 100) + m.lv + 10 : Math.floor(291 * m.lv / 100) + 5;
  const pt = (i, f) => { const a = (-90 + i * 60) * Math.PI / 180; return [Math.round((cx + Math.cos(a) * R * f) * 10) / 10, Math.round((cy + Math.sin(a) * R * f) * 10) / 10]; };
  const order = [0, 1, 2, 5, 4, 3], ring = f => order.map((_, k) => pt(k, f).join(',')).join(' ');
  const shape = order.map((s, k) => pt(k, Math.max(0.14, Math.min(1, st[s] / ref(s)))).join(',')).join(' ');
  const lab = order.map((s, k) => { const [x, y] = pt(k, 1.36), col = up !== dn && s === up ? 'var(--sage)' : up !== dn && s === dn ? 'var(--red)' : 'var(--ink2)';
    return `<text x="${x}" y="${y - 3}" text-anchor="middle" font-size="10.5" font-weight="650" fill="${col}">${SN[s]}</text><text x="${x}" y="${y + 11}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--ink)">${st[s]}</text>`; }).join('');
  return `<svg class="hex" viewBox="0 0 260 208" role="img" aria-label="${order.map(s => SN[s] + ' ' + st[s]).join(', ')}"><polygon points="${ring(1)}" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.14)"/><polygon points="${ring(0.5)}" fill="none" stroke="rgba(255,255,255,.08)"/>${order.map((_, k) => `<line x1="${cx}" y1="${cy}" x2="${pt(k, 1)[0]}" y2="${pt(k, 1)[1]}" stroke="rgba(255,255,255,.06)"/>`).join('')}<polygon points="${shape}" fill="var(--tc)" fill-opacity=".38" stroke="var(--tc)" stroke-width="2" stroke-linejoin="round"/>${lab}</svg>`;
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
function monSheet(m) {
  /* Utropstegnet forsvinner når kortet åpnes, også om angrepet som venter ikke er besvart ennå. */
  const fresh = m.nw; if (seeNews(m)) { renderNav(); document.querySelectorAll(`[data-u="${m.u}"] .bang`).forEach(x => x.remove()); }
  const ed = U.nick === m.u, fm = megaOf(m), canForm = m.id === 487;
  const d = D(m.id), ev = evoOpts(m), inP = S.party.includes(m.u), lead = S.party[0] === m.u, a = xpAt(m.lv), b = xpAt(m.lv + 1), n = countOf(m.id);
  const j = judge(m), up = natUp(m.nat), dn = natDn(m.nat), nx = nextMove(m), evt = m.ev.reduce((x, y) => x + y, 0), more = movesAt(m.id, m.lv).length > m.mv.length;
  openSheet(`<div class="shead">${spr(m.id, { it: m.item, ani: 1, sh: m.sh, mega: m.mega })}<div class="sp"><div class="sm tn">No. ${m.id} · ${REG[regOf(m.id)].n}${m.sh === 2 ? ' · <b style="color:#ff8a2a">Dark</b>' : m.sh ? ' · <b style="color:var(--gold)">Shiny</b>' : ''}</div>${ed ? `<div class="nkrow"><input class="nkin" id="nkin" maxlength="12" value="${esc(m.nn || '')}" placeholder="${esc(d[0])}" autocomplete="off" autocapitalize="words" aria-label="Nickname"><button type="button" class="btn sm2 pri" data-a="nicksave" data-u="${m.u}">Save</button></div>` : `<div class="pn">${esc(mName(m))}${gs(m)}<button type="button" class="nkb" data-a="nick" data-u="${m.u}" aria-label="Give a nickname">✎</button></div>`}${m.nn && !ed ? `<div class="sm">${esc(spName(m))}</div>` : ''}<div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">${types(m.id)} ${tierEl(m.id)}${fm && fm[1] === 'Origin' ? ' <span class="pill">Origin Forme</span>' : canForm ? ' <span class="pill">Altered Forme</span>' : ''}</div></div></div>
    <div><div class="row sm tn" style="justify-content:space-between"><span>Level ${m.lv}</span><span>${n > 1 ? 'You have ' + n + ' of these' : 'Your only one'}</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.round((m.xp - a) / (b - a) * 100)}%"></i></div></div>
    <div class="card2" style="--tc:var(--t${d[1]})">${hexEl(m)}
      <div class="row" style="flex-wrap:wrap;gap:6px;justify-content:center"><span class="pill">${NAT[m.nat]}${up !== dn ? ` · +${SN[up]} −${SN[dn]}` : ' · neutral'}</span><span class="pill" style="color:${j.sum >= 121 ? 'var(--gold)' : j.sum >= 91 ? 'var(--sage)' : 'var(--ink2)'}">Judge: ${j.t}${j.sum >= 186 ? '' : ' · best ' + SN[j.best]}</span><span class="pill tn">EVs ${evt} of 510</span></div>${abLine(m.id, m.mega)}<button type="button" class="btn sm2 wide" data-a="train" data-u="${m.u}" style="margin-top:6px">Train · raise its stats for coins</button><button type="button" class="btn sm2 wide" data-a="candy" data-u="${m.u}"${S.items.candy > 0 && m.lv < 100 ? '' : ' disabled'}>Rare Candy · one level up (${S.items.candy})</button></div>
    ${heldCard(m)}
    <div><div class="lab">Base stats${isMega(m) ? ' · Mega form' : ''}</div>${bstEl(m.id, m.mega, m.sh)}</div>
    <div><div class="row" style="justify-content:space-between;margin-bottom:7px"><div class="lab" style="margin:0">Moves${fresh ? ' · <b style="color:var(--gold)">new move learned</b>' : ''}</div>${more ? `<button type="button" class="btn sm2" data-a="mvpick" data-u="${m.u}">Change moves</button>` : ''}</div>
      ${(m.nm || []).length ? `<button type="button" class="newmv" data-a="mlearn" data-u="${m.u}" style="width:100%;text-align:left;margin-bottom:8px"><span class="bang">!</span><span class="sm" style="color:var(--ink)">Wants to learn <b>${esc(MOVES[m.nm[0]][0])}</b>${m.nm.length > 1 ? ' and ' + (m.nm.length - 1) + ' more' : ''}. Tap to decide.</span></button>` : ''}<div class="mvg">${m.mv.map(x => moveEl(x)).join('')}</div>
      ${nx ? `<p class="sm tn" style="margin-top:7px">Next move: ${esc(MOVES[nx.mv][0])} at level ${nx.lv}</p>` : ''}</div>
    ${evoLine(m.id, m.id)}
    <div class="stack">
    ${ev.map(o => `<button type="button" class="btn ${o.ok ? 'gold' : ''} wide" data-a="evolve" data-u="${m.u}" data-k="${o.to}"${o.ok ? '' : ' disabled'}>${o.ok ? 'Evolve into ' + esc(D(o.to)[0]) : 'Evolves ' + o.why}</button>`).join('')}
    ${canForm ? `<button type="button" class="btn wide" data-a="form" data-u="${m.u}">Change to ${m.mega === ORIGIN ? 'Altered' : 'Origin'} Forme</button>` : ''}
    ${megaCard(m)}
    ${lead ? '' : `<button type="button" class="btn sage wide" data-a="lead" data-u="${m.u}">Make partner</button>`}
    <div class="row"><button type="button" class="btn sp" data-a="party" data-u="${m.u}"${(inP && S.party.length < 2) || (!inP && S.party.length >= 6) ? ' disabled' : ''}>${inP ? 'Remove from team' : 'Add to team'}</button><button type="button" class="btn sp" data-a="fav" data-u="${m.u}">${m.fav ? 'Unfavorite' : 'Favorite'}</button></div>
    <button type="button" class="btn wide danger" data-a="sell" data-u="${m.u}"${S.mons.length > 1 ? '' : ' disabled'}>Sell for ${coinEl(sellValue(m))}</button></div>`);
}
/* Det den holder, på kortet. Arceus med en plate: typen står der. */
function heldCard(m) {
  const h = heldOf(m), own = Object.keys(HELD).some(k => S.items[k] > 0);
  return `<div class="card heldc"><div class="item" style="padding:0"><span class="ic">${h ? heldEl(m.item, '30px') : '<span class="hnone"></span>'}</span><div class="sp"><div class="lab" style="margin:0 0 2px">Holding</div><b>${h ? h.n : 'Nothing'}</b><div class="sm">${h ? h.d + (h.g === 'once' ? ' · used up when it works' : '') + (plateTy(m) >= 0 ? ` · ${D(m.id)[0]} is ${TYN[h.ty]} type` : '') : own ? 'Give it a berry, a plate or a piece of gear.' : 'Berries, plates and gear are sold in the Shop.'}</div></div><button type="button" class="btn sm2" data-a="held" data-u="${m.u}">${h ? 'Change' : 'Give'}</button></div></div>`;
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
/* Mega på kortet: hva arten kan bli, og det som mangler (ring, stein). Med ringen gis steinen her, og de med to former bytter fritt mellom dem. */
function megaCard(m) {
  const o = megaOpts(m.id); if (!o.length) return '';
  const leg = isLeg(m.id), has = leg ? hasStone(m.id) : o.includes(m.ms), cur = o.includes(m.ms) ? m.ms : o[0], pri = MEGA[cur - 1][1] === 'Primal', word = pri ? 'revert to its primal form' : 'Mega Evolve';
  const g = MEGA[cur - 1], info = `${[g[2], g[3]].filter(t => t >= 0).map(t => TYN[t]).join(' / ')} · base stats +${megaBst(cur - 1) - BST[m.id - 1].reduce((a, b) => a + b, 0)}`;
  const txt = !S.ring ? (leg ? (has ? 'You have its stone. You also need the Mega Ring: beat a Champion.' : `Its stone is won by beating ${D(m.id)[0]} in a raid, and you need the Mega Ring: beat a Champion.`) : 'You need the Mega Ring first: beat a Champion.')
    : has ? `It can ${word} once a battle, from the move menu.` : leg ? `Its stone is won by beating ${D(m.id)[0]} in a raid.` : `Give it a Mega Stone and it can ${word} in battle. You have ${S.items.mstone || 0}.`;
  const btn = !S.ring ? '' : has ? o.filter(k => k !== cur).map(k => `<button type="button" class="btn sm2 wide" data-a="mgive" data-u="${m.u}" data-k="${k}">Switch to ${esc(megaName(k))}</button>`).join('')
    : leg ? '' : o.map(k => `<button type="button" class="btn sm2 wide gold" data-a="mgive" data-u="${m.u}" data-k="${k}"${S.items.mstone > 0 ? '' : ' disabled'}>Give a Mega Stone · ${esc(megaName(k))}</button>`).join('');
  return `<div class="card2 mgc${has && S.ring ? ' on' : ''}"><div class="row" style="gap:12px;align-items:center">${spr(m.id, { it: m.item, sh: m.sh, mega: cur, s: '64px' })}<div class="sp"><b>${esc(megaName(cur))}</b><div class="sm tn">${info}</div><div class="sm" style="margin-top:4px">${txt}</div></div></div>${btn}</div>`;
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
  const html = `${trainTip()}<div class="trs"><div class="trh"><span></span><span></span><span>IV · max 31</span><span>EV · max ${EVMAX}</span></div>${rows}</div>
    <div class="card2 trx"><div class="row" style="justify-content:space-between"><b>${SN[i]}</b><span class="sm tn" style="${natc(i)}">${st[i]}${up !== dn && i === up ? ' · nature +10 %' : up !== dn && i === dn ? ' · nature −10 %' : ''}</span></div>
      ${shed ? '<p class="sm">Shedinja always has 1 HP, so there is nothing to train here.</p>' : `<div class="trl"><span class="sm"><b>IV</b> <b class="tn">${m.iv[i]}</b> of 31${ht ? ' · counts as 31' : ''}<br>${ht || ivv >= 31 ? 'Nothing more to gain here.' : `Born with it. Hyper Training makes it count as 31: +${dIv} now, +${dIv100} at Lv 100.`}</span>${ivb}</div>
      <div class="sm"><b>EV</b> <b class="tn">${m.ev[i]}</b> of ${EVMAX} · ${VIT[i]}${dEv > 0 ? `<br>Room for ${room} more: +${dEv} now, +${dEv100} at Lv 100.` : ''}</div>${evb}`}</div>
    <p class="sm">${trainCut() < 1 ? `<b style="color:var(--gold)">Training Camp: everything here costs ${Math.round((1 - trainCut()) * 100)} % less today.</b> ` : ''}<b class="tn">${free}</b> of ${EVTOT} EVs are free, enough to max two stats. Focus sessions give your partner 1 EV every two minutes.</p>
    <button type="button" class="btn wide" data-a="trback">Back</button>`;
  const host = $('#trd');
  if (host && +host.dataset.u === m.u) { host.innerHTML = html; $('#trc').innerHTML = coinEl(S.coins); }
  else openSheet(`<div class="trv" style="--tc:var(--t${d[1]})"><div class="shead">${spr(m.id, { it: m.item, ani: 1, sh: m.sh, mega: m.mega, s: '72px' })}<div class="sp"><div class="sm tn">Training <button type="button" class="hq" data-a="trtip" aria-label="How training works">?</button></div><div class="pn" style="font-size:20px">${esc(mName(m))}</div><div class="sm tn">Lv ${m.lv} · ${NAT[m.nat]}</div></div><span id="trc">${coinEl(S.coins)}</span></div><div id="trd" class="trv" data-u="${m.u}">${html}</div></div>`);
}
/* Velg hvilke fire angrep den skal ha, blant alle den har lært til nå. */
function movePick(m) {
  const sel = U.mvsel;
  openSheet(`<h2 class="h">Moves for ${esc(D(m.id)[0])}</h2><p class="sm tn">Pick up to four. ${sel.length} of 4 chosen.</p>
    <div class="mvg">${movesAt(m.id, m.lv).concat(m.mv.filter(x => !movesAt(m.id, m.lv).includes(x))).map(x => moveEl(x, { btn: 1, on: sel.includes(x), m })).join('')}</div>
    <p class="err" id="mv-err" role="alert"></p>
    <button type="button" class="btn pri wide" data-a="mvsave" data-u="${m.u}">Save moves</button>`);
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
    <div class="card"><div class="row" style="justify-content:space-between"><b>${g.n}</b><span class="sm tn">${dexCount(r)} of ${g.b - g.a + 1} caught</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.round(dexCount(r) / (g.b - g.a + 1) * 100)}%"></i></div>${open ? '' : `<p class="sm" style="margin-top:8px">This area is locked. It opens at trainer level ${g.lv} or when you have caught ${g.dex} species (you are level ${tlv()} with ${dexAll()}).</p>`}</div>
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
const SHELFD = {
  'For the hunt': () => 'More and better encounters from your focus sessions, and help with the ones that are hard to catch.',
  'Shiny hunting': () => `A shiny is born with perfect IVs, and every stat is 5 % higher: a shiny of a strong species is the best Pokémon there is. Your odds right now: 1 in ${nb(Math.round(1 / Math.min(SHINYCAP, shinyOdds())))}${shinyBoost() > 1 ? ` (×${shinyBoost()} from the incense)` : ''}. The incense works on encounters, packs and eggs, not on raids.`,
  'For battles': () => 'Use these from the Bag in League battles and raids. Using one takes your turn, and the Bag has a limit per battle.'
};
VIEW.butikk = () => {
  const l = tlv();
  const ic = k => SHOP[k].img ? ballEl(k, '30px') : SHOP[k].ic === 'egg' ? '<span class="egg" style="transform:scale(.7)"></span>' : `<span class="${SHOP[k].ic}${k === 'mstone' ? ' mg' : ''}"></span>`;
  const full = S.pend.length > PACKMAX;
  return `<div class="row" style="justify-content:space-between"><h1 class="big">Shop</h1>${coinEl(S.coins)}</div>
    <h2 class="h">Encounter packs</h2>
    <div class="packs">${Object.keys(PACKS).map(k => { const P = PACKS[k], lock = P.lv && l < P.lv, can = S.coins >= P.p && !lock && !full;
      return `<button type="button" class="pkb${can ? '' : ' off'}" data-a="pack" data-k="${k}" style="--pc:${P.c}"${can ? '' : ' disabled'}><span class="pk-ic"><i></i></span><b>${P.n}</b><span class="sm">${P.d}</span><span class="pk-p tn">${lock ? 'Trainer level ' + P.lv : coinEl(P.p)}</span></button>`; }).join('')}</div>
    <p class="sm">${full ? 'Catch some of the encounters that are waiting before you open more packs.' : 'Three encounters in every pack, opened on the spot. The last slot is the good one: the dearer the pack, the better the odds of something rare. Pokémon from packs sell for less than wild ones. The greatest legendaries are not in packs; they have to be met in raids.'}</p>
    ${SHELF.map(([name, ks]) => `<h2 class="h">${name}</h2>${SHELFD[name] ? `<p class="sm">${SHELFD[name]()}</p>` : ''}<div class="card" style="padding-top:6px;padding-bottom:6px">${ks.map(k => { const it = SHOP[k], lock = (it.lv && l < it.lv) || (it.ring && !S.ring), full = shopFull(k);
      return `<div class="item${lock ? ' lk' : ''}"><span class="ic">${ic(k)}</span><div class="sp"><b>${it.n}</b> <span class="sm tn">· ${shopHave(k)}</span><div class="sm">${it.d}</div></div><button type="button" class="btn sm2 ${S.coins >= it.p && !lock && !full ? 'pri' : ''}" data-a="buy" data-k="${k}"${S.coins < it.p || lock || full ? ' disabled' : ''}>${lock ? (it.ring && !S.ring ? 'Mega Ring' : 'Level ' + it.lv) : full ? shopFullTxt(k) : nb(it.p)}</button></div>`; }).join('')}</div>`).join('')}
    <h2 class="h">To hold in battle</h2><p class="sm">Berries, plates and gear. Each Pokémon can hold one, and it works by itself in the League, the tournament and raids.</p>
    <button type="button" class="btn wide" data-a="heldshop">${(() => { const n = Object.keys(HELD).reduce((a, k) => a + heldTotal(k), 0); return `Berries, plates and gear · you own ${n}`; })()}</button>
    <h2 class="h">Routes</h2>
    <div class="card" style="padding-top:6px;padding-bottom:6px">${[1, 2, 3, 4, 5].map(r => { const g = REG[r], has = S.regions.includes(r);
      return `<div class="item"><span class="ic"><span class="map"></span></span><div class="sp"><b>${g.n}</b><div class="sm tn">${g.b - g.a + 1} species · ${dexCount(r)} caught</div>${has ? '' : `<div class="sm tn" style="margin-top:4px">Opens at trainer level ${g.lv} (you are ${tlv()}) or ${g.dex} species caught (you have ${dexAll()})</div><div class="bar" style="margin-top:6px"><i style="width:${Math.round(Math.min(1, Math.max((tlv() - 1) / Math.max(1, g.lv - 1), dexAll() / g.dex)) * 100)}%"></i></div>`}</div>${has ? `<button type="button" class="btn sm2${S.routes.includes(r) ? ' sage' : ''}" data-a="reg" data-k="${r}">${S.routes.includes(r) ? 'On' : 'Off'}</button>` : '<span class="pill">Locked</span>'}</div>`; }).join('')}</div>
    <p class="sm">New areas open by themselves as you gain experience or fill the Pokédex, whichever comes first. Every route that is on takes part in your encounters: more routes means more variety, fewer means better odds for the ones you are hunting.</p>
    <p class="sm">Most coins come from battles, and they pay more the closer you are to your daily goal. Focus minutes give 3 coins each, and duplicates can be sold.</p>`;
};

/* ---------- Profil: merker, statistikk, innstillinger ---------- */
VIEW.profil = () => {
  const t0 = new Date(), tot = totalMin(), ses = Object.values(S.log).reduce((s, d) => s + d.s, 0);
  const badges = Object.keys(S.fag).map(f => { const g = S.fag[f], m = fagMin(f), pct = Math.min(1, m / (g.t * 60)), dd = g.d ? Math.round((new Date(g.d + 'T00:00') - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 864e5) : null;
    return `<div class="item" style="--tc:${F(f).c}"><span class="badge${pct >= 1 ? ' on' : ''}">${esc(short(F(f).n))}</span><div class="sp"><div class="row" style="justify-content:space-between"><b>${esc(F(f).n)} badge</b><span class="sm tn">${dd == null ? '' : dd > 0 ? 'exam in ' + dd + ' d' : dd === 0 ? 'exam today' : 'done'}</span></div>
      <div class="bar" style="margin-top:6px"><i style="width:${Math.round(pct * 100)}%;background:${F(f).c}"></i></div><div class="sm tn" style="margin-top:4px">${hrs(m)} of ${hrs(g.t * 60)} h · ${g.ms >= 4 ? 'badge complete' : `next reward at ${Math.min(100, (g.ms + 1) * 25)}%${fagGate(f) > 0 && pct >= (g.ms + 1) / 4 ? ` · ${hrs(fagGate(f))} h more logged here first` : ''}`}</div></div></div>`; }).join('');
  let hm = '';
  const mon = addDays(t0, -((t0.getDay() + 6) % 7) - 63);
  for (let i = 0; i < 70; i++) { const d = addDays(mon, i), k = dayKey(d), m = (S.log[k] || { m: 0 }).m; hm += `<i class="${m ? (m < 90 ? 'l1' : m < 180 ? 'l2' : m < 270 ? 'l3' : 'l4') : ''}${k === dayKey() ? ' td' : ''}" title="${d.getDate()}.${d.getMonth() + 1}: ${m} min"></i>`; }
  const all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0), sp = focusSplit(), hasS = Object.keys(S.fag).length > 0;
  return `<h1 class="big">Profile</h1>${topBar()}
    ${(() => { const as = U.as || achSum(), R = as.R, pct = R.next ? Math.round((R.p - R.at) / (R.next - R.at) * 100) : 100;
      return `<div class="card avcard" style="--rk:${R.c}"><button type="button" class="avpb" data-a="ach" aria-label="Achievements. Rank: ${R.n}">${avFrame(R, 'lg', 1)}</button><span class="sp"><span class="sm">${S.av ? esc(avName()) : 'No character yet'}</span><b>${R.n}</b>
        <span class="bar"><i style="width:${pct}%;background:${R.c}"></i></span><span class="sm tn">${R.p} of ${achTotal()} medals${R.nn ? ` · ${R.next - R.p} more to ${R.nn}` : ''}</span></span></div>
      <div class="row"><button type="button" class="btn sp${as.open ? ' gold' : ''}" data-a="ach">${as.open ? `${as.open} reward${as.open > 1 ? 's' : ''} ready` : 'Achievements'}</button><button type="button" class="btn sp" data-a="avatar">${S.av ? 'Change character' : 'Pick a character'}</button></div>`; })()}
    <div class="card stack shwc"><div><b>Show the game</b><p class="sm" style="margin-top:4px">A trailer and an overview of what is in here, without giving away what is waiting. Made for showing a friend.</p></div><div class="row"><button type="button" class="btn sp gold" data-a="show">Open the showcase</button><button type="button" class="btn sp" data-a="tour">Start guide</button></div></div>
    <h2 class="h">Badges</h2><div class="card" style="padding-top:6px;padding-bottom:6px">${badges}</div>
    <p class="sm">Each badge fills with focus hours in that subject. 25, 50 and 75% give an epic encounter, and a full badge gives a legendary one. A reward needs time logged here in the app: ${MSGATE / 60} hours in the subject for each one, and ${BADGEGATE / 60} hours in all for the legendary.</p>
    <h2 class="h">Stats</h2>
    <div class="gain"><div><span class="sm">${hasS ? 'Subject hours' : 'Total focus'}</span><b class="tn">${hrs(hasS ? sp.subj : tot)} h</b></div><div><span class="sm">Sessions</span><b class="tn">${ses}</b></div><div><span class="sm">Day streak</span><b class="tn">${streak()}</b></div><div><span class="sm">Species caught</span><b class="tn">${all}</b></div></div>
    ${hasS && sp.other ? `<p class="sm">Plus ${hrs(sp.other)} h of other things, which count at half value.</p>` : ''}
    <div class="card"><div class="lab">Last ten weeks</div><div class="hm">${hm}</div></div>
    ${fairCard()}
    <h2 class="h">Settings</h2>
    <div class="card stack">
      <label class="field">Daily goal<select data-c="cap">${[120, 180, 240, 300, 360, 420, 480].map(c => `<option value="${c}"${S.cap === c ? ' selected' : ''}>${c / 60} hours · battle rewards up to ×${topFor(c).toFixed(1)}</option>`).join('')}</select></label>
      <p class="sm" style="margin-top:-4px">Battle rewards grow with today's focus and peak when you reach your goal: a higher goal has a higher peak. Past the goal your team is tired (half XP, no encounters).</p>
      <div><div class="lab">Difficulty</div><div class="seg">${DIFF.map((d, i) => `<button type="button" data-a="diff" data-k="${i}" aria-pressed="${(S.diff == null ? 2 : S.diff) === i}">${d.n}</button>`).join('')}</div>
        <p class="sm" style="margin-top:6px">${['Opponents are a good bit below your level, play simply and bring smaller teams. You may use 5 items per battle.', 'Opponents are slightly below your level and make the odd mistake. You may use 4 items per battle.', 'Opponents match your level, are well trained and play to win. You may use 3 items per battle.'][S.diff == null ? 2 : S.diff]} Coins ×${diff().coin} and XP ×${diff().xp} from battles.</p></div>
      <div class="row"><button type="button" class="btn sp" data-a="hfx">Move hints: ${S.hfx === 0 ? 'off' : 'on'}</button><button type="button" class="btn sp" data-a="hty">Type tags: ${S.hty === 0 ? 'off' : 'on'}</button></div>
      <div class="row"><button type="button" class="btn sp" data-a="sound">Sound: ${S.sound ? 'on' : 'off'}</button><button type="button" class="btn sp" data-a="cries"${S.sound ? '' : ' disabled'}>Cries: ${S.cries ? 'on' : 'off'}</button></div>
      <button type="button" class="btn wide" data-a="music"${S.sound ? '' : ' disabled'}>Battle music: ${S.music === 0 ? 'off' : 'on'}</button>
      ${S.sound ? `${S.music === 0 ? '' : `<div class="volrow"><span>Music</span><input type="range" min="0" max="100" step="5" value="${S.mvol}" data-v="mvol" aria-label="Music volume"><b class="tn" id="vv-mvol">${S.mvol}%</b></div>`}<div class="volrow"><span>Effects</span><input type="range" min="0" max="100" step="5" value="${S.vol}" data-v="vol" aria-label="Effects volume"><b class="tn" id="vv-vol">${S.vol}%</b></div>${S.cries ? `<div class="volrow"><span>Cries</span><input type="range" min="0" max="100" step="5" value="${S.cvol}" data-v="cvol" aria-label="Cries volume"><b class="tn" id="vv-cvol">${S.cvol}%</b></div>` : ''}` : ''}
      <button type="button" class="btn wide" data-a="plan">Edit subjects</button>
      <button type="button" class="btn wide" data-a="sync">Sync between devices${GH && GH.ok ? ' · ' + (ghState === 'ok' ? 'on' : ghState || 'connecting') : ''}</button>
      <button type="button" class="btn wide" data-a="backup">Backup</button>
      ${isAdmin() ? '<button type="button" class="btn wide" data-a="lab">Demo · battles, raids and packs (admin)</button>' : ''}
    </div>
    <p class="sm">Battle speed, music and forfeit are in the Pause menu during a battle.</p>
    <p class="sm">Fokusdex is a private hobby project. Pokémon and the names belong to Nintendo, Game Freak and Creatures. Images are fetched from PokeAPI when the app is used and are not part of the app.</p>`;
};
/* ---------- Fag: brukes både ved første start og fra Profil ---------- */
const subjDraft = () => Object.keys(S.fag).map(k => { const f = S.fag[k]; return { k, n: f.n, ty: (f.ty || []).slice(0, 2), t: String(f.t), h: f.b ? String(Math.round(f.b / 6) / 10) : '', d: f.d || '' }; });
function seCards() {
  const sd = U.sd;
  return sd.map((s, i) => `<div class="card secard"><div class="row"><input class="sein" data-f="n" data-i="${i}" maxlength="14" placeholder="Subject name" autocomplete="off" value="${esc(s.n)}" aria-label="Subject name"><button type="button" class="btn sm2" data-a="sedel" data-i="${i}" aria-label="Remove ${esc(s.n) || 'subject'}">Remove</button></div>
    <div class="segrid"><label class="field">Planned hours<input inputmode="decimal" data-f="t" data-i="${i}" value="${esc(s.t)}" placeholder="40"></label><label class="field">Already done (h)<input inputmode="decimal" data-f="h" data-i="${i}" value="${esc(s.h)}" placeholder="0"></label><label class="field full">Exam date (optional)<input type="date" data-f="d" data-i="${i}" value="${esc(s.d)}"></label></div>
    <div><div class="lab">Types that show up more often · pick up to 2</div><div class="tychips">${TYN.map((n, t) => `<button type="button" class="tyc" data-a="sety" data-i="${i}" data-k="${t}" aria-pressed="${s.ty.includes(t)}" style="--c:var(--t${t})">${n}</button>`).join('')}</div></div></div>`).join('') +
    (sd.length < 4 ? '<button type="button" class="pfree" data-a="seadd">+ Add subject</button>' : '');
}
function seRedraw() { const el = $('#se'); if (el) el.innerHTML = seCards(); }
/* Sjekker utkastet. Gir en feilmelding, eller lista som skal lagres. */
function seRead() {
  const num = v => Number(String(v).replace(',', '.').trim());
  const out = [];
  for (const s of U.sd) {
    const n = s.n.trim(), t = num(s.t), h = String(s.h).trim() ? num(s.h) : 0;
    if (!n) return 'Give every subject a name, or remove the empty one.';
    if (!(t > 0 && t <= 1000)) return `Enter planned hours for ${n}.`;
    if (!(h >= 0 && h <= t)) return `Hours already done for ${n} must be between 0 and the planned hours.`;
    if (s.d && !/^\d{4}-\d{2}-\d{2}$/.test(s.d)) return `Check the exam date for ${n}.`;
    out.push({ k: s.k, n, ty: s.ty, t, b: Math.round(h * 60), d: s.d });
  }
  return out;
}
function subjSheet() {
  U.sd = subjDraft(); U.ex = (S.extra || []).filter(k => k !== 'annet' && EXTRA[k]);
  openSheet(`<h2 class="h">Your subjects</h2><p class="sm">Up to four. Each one gets a badge that fills as you focus, and its types show up more often in its sessions. Subjects count in full.</p>
    <div id="se" class="stack">${seCards()}</div>
    <div><div class="lab">Other things you log · they count at half value</div><div class="chips">${Object.keys(EXTRA).filter(k => k !== 'annet').map(k => `<button type="button" class="chip" data-a="extog" data-k="${k}" aria-pressed="${U.ex.includes(k)}">${EXTRA[k].n}</button>`).join('')}<span class="chip" style="display:inline-flex;align-items:center;opacity:.55">Other · always there</span></div>
      <p class="sm" style="margin-top:8px">Half the XP, coins and encounters, and half the progress towards your daily goal. Their hours are kept apart from your subject hours.</p></div>
    <p class="err" id="se-err" role="alert"></p>
    <button type="button" class="btn pri wide" data-a="sesave">Save</button>`);
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

/* ---------- Ark ---------- */
function openSheet(html) { const w = $('#sheet'); w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><span class="grab"></span>${html}</div>`; w.hidden = false; }
function closeSheet() { const w = $('#sheet'); w.hidden = true; w.innerHTML = ''; }
/* Åpner en encounter-pakke: pakken ristes opp, tre kort kommer ut med baksiden opp, og hvert snus med et trykk. Fargen på kortet røper sjeldenheten først når det snus. */
function packShow(k, encs, demo) {
  const P = PACKS[k]; U.pk = encs; U.pkDemo = demo ? k : '';
  ov(`<div class="pko" id="pko" style="--pc:${P.c}">
    <button type="button" class="pk-pack" data-a="pkopen" aria-label="Open the pack"><span class="pk-ic big"><i></i></span><b>${P.n}</b></button>
    <div class="pk-cards">${encs.map((e, i) => `<button type="button" class="pk-card r${e.t}${e.sh ? ' shy' : ''}" data-a="pkflip" data-k="${i}" style="--i:${i}" aria-label="Card ${i + 1}"><span class="pk-in"><span class="pk-back"><i></i></span>${e.myst ? '<span class="pk-front pkq"><span class="pkq-o" aria-hidden="true"><i>?</i></span><b>? ? ?</b><span class="tier r4">Legendary</span><span class="sm">Who is it? Find out in the grass</span></span>' : `<span class="pk-front">${spr(e.id, { ani: 1, sh: e.sh, mega: defForm(e.id) })}<b>${e.sh ? 'Shiny ' : ''}${esc(D(e.id)[0])}${gs(e)}</b><span class="tier r${e.t}">${TIERS[e.t]}</span><span class="sm tn">Lv ${e.lv}${S.caught[e.id] ? '' : ' · new'}</span></span>`}</span></button>`).join('')}</div>
    <p class="sm" id="pkt" style="text-align:center">Tap the pack to open it</p>
    <div class="acts" id="pka" style="visibility:hidden">${demo ? `<button type="button" class="btn gold" data-a="pkdemo" data-k="${k}">Open another</button><button type="button" class="btn nf" data-a="packlab">Back to the packs</button>` : '<button type="button" class="btn gold" data-a="pkhunt">Catch them now</button><button type="button" class="btn nf" data-a="pkdone">Later</button>'}</div>${demo ? '<p class="sm tn" style="text-align:center">Demo · free, and nothing is kept</p>' : ''}</div>`, 'packov', P.c);
}
function ov(html, cls, tc) { const o = $('#ov'); o.className = 'ov' + (cls ? ' ' + cls : ''); o.style.setProperty('--tc', tc || 'var(--sage)'); o.innerHTML = `<div class="ovin">${html}</div>`; o.hidden = false; }
function closeOv() { const o = $('#ov'); o.hidden = true; o.innerHTML = ''; }

/* ---------- Start: velg partner ---------- */
let pick = 0;
function intro() {
  if (U.step === 2) {
    ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="sback">Back</button><span class="pill">Step 2 of 2</span></div>
      <div><h1 class="big">Your subjects</h1><p class="mut" style="margin-top:6px">Add up to four subjects you are studying for. Each gets a badge that fills as you focus, and the types you pick show up more often in its sessions. You can change this later in Profile.</p></div>
      <div id="se" class="stack">${seCards()}</div><p class="err" id="se-err" role="alert"></p>
      <div class="acts"><button type="button" class="btn pri" data-a="sestart">Start with ${esc(D(pick)[0])}</button></div>`);
    return;
  }
  ov(`<div class="row" style="justify-content:flex-end"><span class="pill">Step 1 of 2</span></div><div class="mid"><h1 class="big">Fokusdex</h1><p class="mut" style="max-width:30ch">Every minute you focus earns XP and coins. Every session lures out wild Pokémon you can catch, evolve and collect.</p>
    <div class="starters">${[1, 4, 7].map(id => `<button type="button" data-a="pick" data-k="${id}" aria-pressed="${pick === id}" style="--tc:var(--t${D(id)[1]})">${spr(id, { ani: 1 })}<span>${D(id)[0]}</span>${types(id)}</button>`).join('')}</div>
    <p class="sm" style="max-width:32ch">Pick your partner. You start with 15 Poké Balls, and next you add your subjects.</p></div>
    <div class="acts"><button type="button" class="btn pri" data-a="snext"${pick ? '' : ' disabled'}>${pick ? 'Next' : 'Choose a partner'}</button></div>`);
}

/* ---------- Fokusklokka ---------- */
const CIRC = 289.03;
let tick = 0, wake = null;
async function keepAwake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (_) {} }
function dropAwake() { try { if (wake) wake.release(); } catch (_) {} wake = null; }
function showTimer() {
  const t = S.timer, p = partner(), w = rateOf(t.fag), n = Math.floor(Math.round(t.min * w) / 20) + (t.min * w >= 25 ? 1 : 0);
  U.quit = 0;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="quit" id="t-quit">Cancel</button><span class="pill" style="background:${F(t.fag).c};color:#17130f">${esc(F(t.fag).n)} · ${t.min} min</span></div>
    <div class="mid"><div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="a0" cx="50" cy="50" r="46"/><circle class="a1" id="t-arc" cx="50" cy="50" r="46" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/></svg>
      <div class="in">${p ? spr(p.id, { ani: 1, sh: p.sh, mega: p.mega }) : ''}<div class="clock" id="t-clock" role="timer"></div><div class="sm" id="t-sub"></div></div></div>
      <div><div class="found" id="t-found" aria-label="Encounters found">${Array.from({ length: n }, () => '<i></i>').join('')}</div><p class="sm" style="margin-top:8px" id="t-hint">${w < 1 ? `${esc(F(t.fag).n)} counts at half value: a new encounter every ${Math.round(20 / w)} minutes.` : 'A new encounter every 20 minutes.'}</p></div></div>
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
  const w = rateOf(t.fag);
  $('#t-sub').textContent = t.pausedAt ? 'Paused' : `+${nb(Math.floor(Math.floor(ms / 60000) * w) * 10)} XP`;
  $('#t-pause').textContent = t.pausedAt ? 'Resume' : 'Pause';
  const got = Math.floor(ms * w / 1200000), dots = $('#t-found').children;
  for (let i = 0; i < dots.length; i++) if (i < got && !dots[i].classList.contains('on')) { dots[i].classList.add('on'); if (i >= t.seen) { dots[i].classList.add('new'); t.seen = i + 1; sfx.found(); buzz(40); $('#t-hint').textContent = 'Something is rustling in the grass. It will wait until you are done.'; } }
}
function endTimer() {
  clearInterval(tick); dropAwake(); document.title = 'Fokusdex';
  const R = finishTimer();
  if (!R || !R.min) { closeOv(); toast('The session was under a minute and does not count.'); return render(); }
  sfx.done(); buzz([120, 60, 120]);
  showReward(R);
}

/* ---------- Belønning ---------- */
function countUp(el, to) { const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 900); el.textContent = '+' + nb(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); }
function showReward(R) {
  const news = [];
  R.hatch.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega })}<span><b>Egg hatched: ${esc(D(m.id)[0])}</b><br><span class="sm">${x.isNew ? 'New to your collection' : 'You already have it'}${m.sh ? ' · shiny' : ''}</span></span></div>`); });
  R.ups.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega })}<span><b>${esc(mName(m))} level ${x.l0} → ${x.l1}</b>${x.evo ? '<br><span class="sm" style="color:var(--gold)">Ready to evolve</span>' : ''}${(x.learned || []).length ? `<br><span class="sm">Learned ${esc(x.learned.join(', '))}</span>` : ''}${(x.avail || []).length ? `<br><span class="sm">New move to pick: ${esc(x.avail.join(', '))}</span>` : ''}</span></div>`); });
  if (R.sm1 != null && R.sm1 !== R.sm0) news.push(`<div><span class="mulic">×</span><span><b>Battle bonus ×${R.sm0.toFixed(1)} → ×${R.sm1.toFixed(1)}</b><br><span class="sm">${R.sm1 >= goalTop() ? 'You reached your goal: this is the top for today.' : `It peaks at ×${goalTop().toFixed(1)} when you reach ${hrs(goalMin())} h.`}</span></span></div>`);
  R.gifts.forEach(g => news.push(`<div><span class="grass"><i></i><i></i><i></i><i></i></span><span>${esc(g)}</span></div>`));
  const notes = [R.w < 1 ? `${F(R.fag).n} counts at half value: your ${R.min} minutes are worth ${R.eff}.` : '', R.rested ? 'Rested bonus: 1.5× on your first session of the day.' : '', R.tired ? 'Your team is tired: minutes past the daily cap gave half XP and no encounters.' : '', R.full ? '' : 'Ended early: you are rewarded for the minutes you did.'].filter(Boolean);
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
const dur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 120 ? `${Math.round(m / 60)} hours` : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
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
  const q = why === 'late' ? `It is ${pad2(d.getHours())}:${pad2(d.getMinutes())}. Are you really studying right now?` : why === 'long' ? `You have logged ${hrs(real)} hours today. Is this still real study?` : `That is ${hrs(S.run || 0)} hours in a row without a break. Are you still at it?`;
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
function hunt() {
  encQuiet();
  if (!S.pend.length) { closeOv(); return render(); }
  E.e = S.pend[0]; E.done = null; E.busy = true;
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
      <div><div class="ename">${e.sh === 2 ? 'Dark ' : e.sh ? 'Shiny ' : ''}${esc(d[0])}${gs(e)}</div><div class="row" style="justify-content:center;margin-top:8px;flex-wrap:wrap;gap:6px">${tierEl(e.id)} ${types(e.id)} <span class="pill tn">Level ${e.lv}</span></div>
      <div id="e-info"><p class="sm" style="margin-top:8px" id="e-msg">${S.caught[e.id] ? (n ? `You already have ${n}.` : 'You have had it before.') : `<b style="color:var(--sage)">New to your collection</b> · +${NEWCOIN[e.t]} coins if you catch it`}</p>
      <div class="hearts" id="e-hearts" aria-label="Attempts left" style="margin-top:10px">${Array.from({ length: (isLeg(e.id) ? 4 : 3) + (e.fed ? 1 : 0) }, (_, i) => `<i class="${i < e.tr ? '' : 'off'}"></i>`).join('')}</div>${e.fed ? '<p class="sm tn" style="margin-top:6px;color:var(--gold)">It ate a Golden Razz Berry: one more throw, and better odds.</p>' : ''}</div></div></div>
    <div id="e-ctl" style="display:flex;flex-direction:column;gap:12px">${noBalls ? `<p class="sm" style="text-align:center">You are out of balls. Buy more in the shop and the encounter will wait here.</p><div class="acts"><button type="button" class="btn pri" data-a="toshop">To the shop</button><button type="button" class="btn nf" data-a="skip">Let it go</button></div>` : `
      <div class="row sm tn" style="justify-content:space-between;gap:10px"><span id="e-odds">${oddsEl(e)}</span><span style="text-align:right">green = good · gold = perfect</span></div>
      <button type="button" class="meter" data-a="throw" aria-label="Throw when the marker is in the green zone"><span class="z" id="e-z"></span><span class="g" id="e-g"></span><span class="m" id="e-m"></span></button>
      <div class="balls">${BALLS.filter(k => S.items[k] > 0 || k === 'poke' || k === 'great' || k === 'ultra').map(k => `<button type="button" data-a="ball" data-k="${k}" aria-pressed="${E.ball === k}" aria-label="${SHOP[k].n}"${S.items[k] > 0 ? '' : ' disabled'}>${ballEl(k, '28px')}<span class="tn">${S.items[k]}</span></button>`).join('')}</div>
      ${S.items.gberry > 0 && !e.fed ? `<button type="button" class="btn sm2 wide" data-a="berry">Feed a Golden Razz Berry · one more throw (${S.items.gberry})</button>` : ''}
      <div class="acts"><button type="button" class="btn gold" data-a="throw">Throw</button><button type="button" class="btn nf" data-a="skip">Let it go</button></div>`}</div>`, 'tint', `var(--r${e.t})`);
}
/* Hvor god sjansen er med ballen som er valgt (i den grønne sonen). */
const oddsEl = e => { const o = oddsOf(e, E.ball); return `Catch odds: <b class="od${o}">${['tough', 'even', 'good'][o]}</b>`; };
/* Det du ser når fangsten sitter: potensialet avsløres stjerne for stjerne, og så det fangsten ga. */
function catchCard(r, e) {
  const m = r.mon, j = judge(m), st = ['Decent', 'Above average', 'Great', 'Outstanding', 'Flawless'].indexOf(j.t) + 1, reg = regOf(e.id), tot = REG[reg].b - REG[reg].a + 1, n = countOf(e.id);
  return `<div class="ecard"><div class="row" style="justify-content:center;gap:8px"><b class="ecard-h">${r.took ? 'It is yours.' : 'Caught!'}</b>${r.crit ? '<span class="pill ecrit">Critical capture</span>' : ''}</div>
    <div class="epot" role="img" aria-label="Potential: ${j.t}, ${st} of 5 stars"><span class="sm">Potential · IVs</span><span class="epot-s">${Array.from({ length: 5 }, (_, i) => `<i class="${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.16}s"></i>`).join('')}</span><b class="epot-t" style="animation-delay:${0.3 + st * 0.16}s">${j.t}</b></div>
    <div class="sm tn">${NAT[m.nat]} nature · best stat ${SN[j.best]}</div>
    ${r.bonus.c ? `<div class="ecoin"><b>+${coinEl(r.bonus.c)}</b><span class="sm">${esc(r.bonus.why.join(' · '))}</span></div>` : ''}
    <div class="sm">${r.isNew ? `<b style="color:var(--sage)">New species</b> · ${REG[reg].n} ${dexCount(reg)} of ${tot}` : r.took ? `It has taken the place of your Mewtwo: the same Pokémon at Lv ${m.lv}, now dark, with perfect IVs and full training.` : `You have ${n} now. A duplicate sells for ${nb(sellValue(m))} coins.`}</div></div>`;
}
function aim() {
  cancelAnimationFrame(E.raf);
  if (!$('#e-m')) return;
  const z = zones(E.e, E.ball);
  E.c = 22 + Math.random() * 56; E.t0 = performance.now();
  $('#e-z').style.cssText = `left:${E.c - z.g / 2}%;width:${z.g}%`;
  $('#e-g').style.cssText = `left:${E.c - z.au / 2}%;width:${z.au}%`;
  (function f(t) { const m = $('#e-m'); if (!m || E.busy) return; E.pos = 50 + 48 * Math.sin((t - E.t0) / 1000 * z.sp * 2.4); m.style.left = E.pos + '%'; E.raf = requestAnimationFrame(f); })(E.t0);
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
      if (r.fled) { setTimeout(() => { st.className = 'stage fled'; }, 380); msg.textContent = 'It ran away.'; E.done = 'fled'; }
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
  tab: el => { U.tab = el.dataset.k; render(); $('#main').scrollTop = 0; enter(); },
  lagv: el => { U.lag = el.dataset.k; render(); enter(); },
  fag: el => { U.fag = el.dataset.k; render(); },
  min: el => { U.min = +el.dataset.k; render(); },
  reg: el => { const r = +el.dataset.k, was = S.routes.includes(r); toggleRoute(r); if (was && S.routes.includes(r)) toast('At least one route has to stay on.'); render(); },
  start: el => { if (fairGate()) return; if (typeof SBX !== 'undefined' && SBX) return toast('Leave the sandbox before you start a session: nothing in here is saved.'); if (!(el && el.dataset.ok) && typeof dayOld === 'function' && dayOld() && (simPending() || !dayDone())) return openSheet(`<h2 class="h" style="margin-top:0">Yesterday's battles are still open</h2><p class="sm">${simPending() ? 'A simulated result is waiting for your answer. ' : ''}Starting a focus session closes the battles from your last battle day, and what you have not played or accepted is lost.</p><div class="acts"><button type="button" class="btn gold" data-a="close">Back to the battles</button><button type="button" class="btn nf" data-a="start" data-ok="1">Start the session anyway</button></div>`); closeSheet(); const why = honestWhy(); if (why) return honestAsk(why); startTimer(FAGS[U.fag] ? U.fag : curFag(), U.min || S.last.min); sfx.start(); showTimer(); },
  honyes: el => { honestOk(el.dataset.k); closeOv(); startTimer(FAGS[U.fag] ? U.fag : curFag(), U.min || S.last.min); sfx.start(); showTimer(); },
  clkagain: async el => { el.disabled = true; el.textContent = 'Checking…'; await netTime(); closeSheet(); render(); const L = clockCheck(); if (L) clockSheet(L); else { sfx.ok(); toast('The clock is fine.'); } },
  pause: () => { togglePause(); paintTimer(); },
  early: () => endTimer(),
  quit: () => { if (!U.quit) { U.quit = 1; $('#t-quit').textContent = 'Tap again to cancel'; setTimeout(() => { U.quit = 0; const b = $('#t-quit'); if (b) b.textContent = 'Cancel'; }, 3000); return; } clearInterval(tick); dropAwake(); S.timer = null; save(true); document.title = 'Fokusdex'; closeOv(); render(); },
  home: () => { encQuiet(); closeOv(); render(); if (typeof raidArrive === 'function') raidArrive(); },
  hunt: () => hunt(),
  later: () => { cancelAnimationFrame(E.raf); encQuiet(); closeOv(); render(); },
  skip: () => { if (E.busy) return; cancelAnimationFrame(E.raf); dropPend(E.e); S.cst = 0; save(); hunt(); },
  toshop: () => { closeOv(); U.tab = 'butikk'; render(); },
  ball: el => { if (E.busy) return; E.ball = el.dataset.k; drawEnc(false); aim(); },
  berry: () => { if (E.busy || !E.e || E.done) return; if (feedBerry(E.e)) { sfx.coin(); buzz(25); drawEnc(false); aim(); } },
  throw: () => doThrow(),
  mon: el => { const m = monBy(+el.dataset.u); if (m) { U.nick = 0; cry(m.id, 0, 0.35); monSheet(m); } },
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
  sort: el => { U.sort = el.dataset.k; render(); },
  dexr: el => { U.dex = +el.dataset.k; render(); },
  lead: el => { const m = monBy(+el.dataset.u); setPartner(m); closeSheet(); render(); toast(`${D(m.id)[0]} is now your partner.`); },
  party: el => { const m = monBy(+el.dataset.u); toggleParty(m); render(); monSheet(m); },
  fav: el => { const m = monBy(+el.dataset.u); m.fav = m.fav ? 0 : 1; save(); render(); monSheet(m); },
  mvpick: el => { const m = monBy(+el.dataset.u); U.mvsel = m.mv.slice(); U.mvu = m.u; movePick(m); },
  mlearn: el => { const m = monBy(+el.dataset.u); if (m) learnSheet(m, 'sheet'); },
  mvtog: el => { const x = +el.dataset.k, s = U.mvsel, i = s.indexOf(x); if (i >= 0) s.splice(i, 1); else if (s.length < 4) s.push(x); else { $('#mv-err').textContent = 'Four is the limit. Tap one to remove it first.'; return; } movePick(monBy(U.mvu)); },
  mvsave: el => { const m = monBy(+el.dataset.u); if (!U.mvsel.length) { $('#mv-err').textContent = 'Keep at least one move.'; return; } m.mv = U.mvsel.slice(); save(); monSheet(m); toast('Moves saved.'); },
  candy: el => { const m = monBy(+el.dataset.u); if (useCandy(m)) { sfx.coin(); render(); monSheet(m); } },
  held: el => { const m = monBy(+el.dataset.u); if (m) { sfx.open(); heldSheet(m); } },
  heldgive: el => { const m = monBy(+el.dataset.u), k = el.dataset.k; if (m && giveHeld(m, k)) { (HELD[k].g === 'once' ? sfx.berry : sfx.keyitem)(); render(); monSheet(m); toast(`${mName(m)} now holds the ${HELD[k].n}.`); } },
  heldoff: el => { const m = monBy(+el.dataset.u), n = heldOf(m) ? heldOf(m).n : ''; if (m && giveHeld(m, '')) { sfx.close(); render(); monSheet(m); toast(`The ${n} is back in the bag.`); } },
  heldshop: el => { sfx.open(); heldShop(el && el.dataset.u ? +el.dataset.u : 0); },
  heldbuy: el => { const k = el.dataset.k, u = el.dataset.u ? +el.dataset.u : 0; if (buyHeld(k)) { (HELD[k].g === 'once' ? sfx.berry : sfx.keyitem)(); render(); heldShop(u); toast(`${HELD[k].n} bought.`); } },
  mgive: el => { const m = monBy(+el.dataset.u), k = +el.dataset.k; if (!m) return; const had = megaOpts(m.id).includes(m.ms) || isLeg(m.id); if (bondMega(m, k)) { sfx.evo(); render(); monSheet(m); toast(had ? `${megaName(k)} it is.` : `${mName(m)} now holds a Mega Stone.`); } },
  train: el => { const m = monBy(+el.dataset.u); if (!m) return; U.tru = m.u; U.tri = null; trainSheet(m); },
  trsel: el => { const m = monBy(U.tru); if (!m) return; U.tri = +el.dataset.k; trainSheet(m); },
  trback: () => { const m = monBy(U.tru); if (m) monSheet(m); else closeSheet(); },
  triv: () => { const m = monBy(U.tru); if (!m) return; const i = U.tri; if (buyIv(m, i)) { sfx.coin(); render(); trainSheet(m); toast(`${SN[i]} is Hyper trained: it now counts as IV 31.`); } },
  trev: el => { const m = monBy(U.tru); if (!m) return; const i = U.tri, n = buyEv(m, i, +el.dataset.n); if (n) { sfx.coin(); render(); trainSheet(m); } },
  trclr: el => { const m = monBy(U.tru); if (!m) return; const i = U.tri; if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = `Tap again: remove ${m.ev[i]}`; return; } clearEv(m, i); render(); trainSheet(m); toast(`${SN[i]} training removed. The points are free again.`); },
  evolve: el => { const m = monBy(+el.dataset.u), from = m.id; if (evolve(m, +el.dataset.k)) { render(); evoShow(m, from); } },
  sell: el => { const m = monBy(+el.dataset.u); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.innerHTML = 'Tap again to sell'; return; } const v = sell(m); save(); sfx.sell(); closeSheet(); render(); toast(`Sold for ${nb(v)} coins.`); },
  dsell: el => { const m = monBy(+el.dataset.u); if (!m) return render(); if (el.dataset.top === '1' && el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Top IVs · tap again'; sfx.warn(); return; } const n = mName(m), v = sell(m); if (!v) return; save(); sfx.sell(); render(); toast(`${n} sold for ${nb(v)} coins.`); },
  selldupes: el => { const du = dupes(); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = `Tap again to sell ${du.length}`; return; } let v = 0; du.forEach(m => { v += sell(m); }); save(); sfx.sell(); render(); toast(`${du.length} sold for ${nb(v)} coins.`); },
  buy: el => { if (buy(el.dataset.k)) { (el.dataset.k === 'egg' ? sfx.egg : sfx.coin)(); render(); toast(`${SHOP[el.dataset.k].n} bought.`); } },
  pack: el => { const k = el.dataset.k, out = openPack(k); if (!out) return toast(S.pend.length > PACKMAX ? 'Catch some of your waiting encounters first.' : 'Not enough coins.'); sfx.coin(); packShow(k, out); },
  pkopen: () => { const o = $('#pko'); if (!o || o.classList.contains('open')) return; o.classList.add('open'); sfx.appear(); buzz([30, 40, 30]); $('#pkt').textContent = 'Tap the cards to turn them'; },
  pkflip: el => {
    if (el.classList.contains('on') || !$('#pko').classList.contains('open')) return;
    const e = U.pk && U.pk[+el.dataset.k]; if (!e) return;
    el.classList.add('on'); if (!e.myst && !U.pkDemo) S.seen[e.id] = 1;
    if (e.myst) { sfx.event(); buzz([80, 50, 80, 50, 80, 50, 320]); } else if (e.t >= 3 || e.sh) { sfx.evo(); buzz([60, 40, 60, 40, 220]); } else if (e.t >= 2) { sfx.got(); buzz(40); } else { sfx.found(); buzz(15); }
    if (!e.myst) cry(e.id, 280, 0.35);
    if (document.querySelectorAll('#pko .pk-card:not(.on)').length === 0) { const best = U.pk.reduce((a, x) => Math.max(a, x.t + (x.sh ? 2 : 0)), 0); $('#pkt').textContent = U.pk.some(x => x.myst) ? 'A legendary! Step into the grass to see who it is.' : best >= 4 ? 'What a pull!' : best >= 3 ? 'A great pack.' : U.pkDemo ? 'An ordinary pack.' : 'They are waiting in the grass.'; $('#pka').style.visibility = 'visible'; if (!U.pkDemo) save(true); }
  },
  pkdone: () => { U.pk = null; closeOv(); render(); },
  pkhunt: () => { U.pk = null; hunt(); },
  sound: () => { S.sound = S.sound ? 0 : 1; save(); sfx.tap(); render(); },
  diff: el => { S.diff = +el.dataset.k; save(); render(); toast(`Difficulty: ${diff().n}. It applies from your next battle.`); },
  hfx: () => { S.hfx = S.hfx === 0 ? 1 : 0; save(); render(); },
  hty: () => { S.hty = S.hty === 0 ? 1 : 0; save(); render(); },
  nick: el => { const m = monBy(+el.dataset.u); if (!m) return; U.nick = m.u; monSheet(m); const i = $('#nkin'); if (i) { i.focus(); i.select(); } },
  nicksave: el => { const m = monBy(+el.dataset.u), i = $('#nkin'); if (!m) return; const n = setNick(m, i ? i.value : ''); U.nick = 0; render(); monSheet(m); toast(n ? `${D(m.id)[0]} is now called ${n}.` : `${D(m.id)[0]} goes by its own name again.`); },
  form: el => { const m = monBy(+el.dataset.u); if (!m || m.id !== 487) return; m.mega = m.mega === ORIGIN ? 0 : ORIGIN; save(); sfx.evo(); render(); monSheet(m); },
  music: () => { S.music = S.music === 0 ? 1 : 0; save(); sfx.tap(); render(); },
  cries: () => { S.cries = S.cries ? 0 : 1; save(); if (S.cries) { const p = partner(); if (p) cry(p.id); } render(); },
  plan: () => subjSheet(),
  seadd: () => { if (U.sd.length < 4) { U.sd.push({ k: '', n: '', ty: [], t: '', h: '', d: '' }); seRedraw(); const f = document.querySelectorAll('#se .sein'); if (f.length) f[f.length - 1].focus(); } },
  sedel: el => { U.sd.splice(+el.dataset.i, 1); seRedraw(); },
  sety: el => { const s = U.sd[+el.dataset.i], t = +el.dataset.k; if (s.ty.includes(t)) s.ty = s.ty.filter(x => x !== t); else { s.ty.push(t); if (s.ty.length > 2) s.ty.shift(); } seRedraw(); },
  sesave: () => { const r = seRead(); if (typeof r === 'string') { $('#se-err').textContent = r; return; } if (U.ex) S.extra = Object.keys(EXTRA).filter(k => k === 'annet' || U.ex.includes(k)); setSubjects(r); save(); closeSheet(); render(); toast('Subjects saved.'); },
  extog: el => { const k = el.dataset.k, i = U.ex.indexOf(k); if (i >= 0) U.ex.splice(i, 1); else U.ex.push(k); el.setAttribute('aria-pressed', String(i < 0)); },
  snext: () => { if (!pick) return; U.step = 2; if (!U.sd) U.sd = [{ k: '', n: '', ty: [], t: '', h: '', d: '' }]; intro(); $('#ov').scrollTop = 0; },
  sback: () => { U.step = 1; intro(); },
  sestart: () => { const r = seRead(); if (typeof r === 'string') { $('#se-err').textContent = r; return; } setSubjects(r); const c = begin(pick); S.tour = 0; save(true); sfx.evo(); closeOv(); render(); tourShow(0); if (c) toast(`${nb(c)} coins for the hours you have already done.`); },
  sync: () => SBX ? toast('Leave the sandbox first: Sync is paused in here.') : syncSheet(),
  synclb: () => { try { const lb = JSON.parse(localStorage.getItem('lb.gh')); $('#gh-r').value = lb.repo; $('#gh-t').value = lb.t; } catch (_) {} },
  syncsave: async () => {
    const t = $('#gh-t').value.trim(), r = $('#gh-r').value.trim();
    if (!t || !/^[\w.-]+\/[\w.-]+$/.test(r)) { $('#gh-s').textContent = 'Enter the repo as owner/name and paste the key.'; return; }
    ghSet(t, r); $('#gh-s').textContent = 'Connecting…';
    const p = await ghProbe();
    if (p.st === 'err') { const s = $('#gh-s'); if (s) s.textContent = ghState; GH = null; ghStore(); return; }
    if (p.st === 'none') { await ghLink('local'); PACK.init(true); closeSheet(); render(); toast(ghState === 'ok' ? 'Sync is on. This game is now saved to GitHub.' : ghState); return; }
    U.remote = p.o;
    /* Viser hvor langt hver lagring er kommet, og merker den med mest framgang, så det ikke er mulig å velge feil ved et uhell. */
    const top = o => (o.mons || []).reduce((a, m) => Math.max(a, m.lv || 1), 1), mins = o => Object.values(o.log || {}).reduce((a, d) => a + (d.m || 0), 0);
    const sum = o => `Trainer level ${1 + Math.floor(Math.sqrt((o.xp || 0) / 300))} · ${o.mons.length} Pokémon · best Lv ${top(o)} · ${hrs(mins(o))} h focus · ${nb(o.coins || 0)} coins`;
    const here = saveScore(S) >= saveScore(p.o), more = '<span class="bonus" style="margin-left:6px">More progress</span>';
    openSheet(`<h2 class="h">Which game do you want to keep?</h2><p class="sm">There is already a save on GitHub. Choose one. The other is replaced, on GitHub or on this device (a replaced device save can be brought back from Backup).</p>
      <button type="button" class="card pick2" data-a="syncup"><b>Keep the game on this device${here ? more : ''}</b><span class="sm tn">${sum(S)}</span></button>
      <button type="button" class="card pick2" data-a="syncuse"${here ? ' data-warn="1"' : ''}><b>Use the save from GitHub${here ? '' : more}</b><span class="sm tn">${sum(p.o)}${p.o.at ? ' · saved ' + new Date(p.o.at).toLocaleDateString('en-GB') : ''}</span></button>
      <button type="button" class="btn wide" data-a="syncoff">Cancel</button>`);
  },
  syncuse: async el => { if (el.dataset.warn === '1' && el.dataset.ok !== '1') { el.dataset.ok = '1'; el.querySelector('b').textContent = 'Tap again: this device has more progress'; return; } await ghLink('remote', U.remote); PACK.init(true); closeSheet(); if (!$('#ov').hidden) closeOv(); render(); toast('Loaded the save from GitHub. Sync is on.'); },
  syncup: async () => { await ghLink('local', U.remote); PACK.init(true); closeSheet(); render(); toast(ghState === 'ok' ? 'This game replaced the save on GitHub. Sync is on.' : ghState); },
  syncoff: () => { ghSet('', ''); closeSheet(); render(); toast('Sync turned off.'); },
  backup: () => SBX ? toast('Leave the sandbox first.') : backupSheet(),
  bkcopy: () => { const txt = b64e(JSON.stringify(S)); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied.'), () => { $('#bk-in').value = txt; toast('Copy the text in the field.'); }); },
  bkload: () => {
    let o = null; try { o = JSON.parse(b64d($('#bk-in').value.trim())); if (!o || o.v !== 1 || !Array.isArray(o.mons)) o = null; } catch (_) { o = null; }
    if (!o) return toast('That was not a valid copy.');
    /* En kopi som er eldre enn spillet på enheten, ville rullet tilbake det som har skjedd siden (tap, åpnede pakker, kast). Den tas ikke inn. */
    if (!canAdopt(o)) { const e = $('#bk-err'); if (e) e.textContent = 'This copy is older than the game on this device, so it cannot replace it. Copies are for moving to a new device, or for getting your game back after losing it.'; return sfx.warn(); }
    const p = S; adopt(o); carry(p); S.rev = Math.max(S.rev, p.rev || 0); save(); closeSheet(); render(); toast('Game restored.');
  },
  bkold: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: replaces the current game'; return; } try { const o = JSON.parse(localStorage.getItem(KEY + '.bak')); if (!o || o.v !== 1) throw 0; const rev = S.rev, p = S; adopt(o); carry(p); S.rev = Math.max(S.rev, rev); save(); closeSheet(); render(); toast('The earlier save is back.'); } catch (_) { toast('No earlier save found.'); } },
  reset: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: everything is deleted'; return; } S = fresh(); save(); pick = 0; U.step = 1; U.sd = null; closeSheet(); render(); },
  pick: el => { pick = +el.dataset.k; cry(pick, 0, 0.4); intro(); },
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  const fn = el && !el.disabled && (A[el.dataset.a] || BA[el.dataset.a] || HA[el.dataset.a] || (typeof XA !== 'undefined' && XA[el.dataset.a]));
  if (fn) { click(el.dataset.a); fn(el); return; }
  if (ev.target.id === 'sheet') closeSheet();
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
document.addEventListener('change', ev => { if (ev.target.dataset && ev.target.dataset.c === 'cap') { S.cap = +ev.target.value; save(); render(); } });
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
ghHook = (adopted, kept) => { const s = $('#gh-s'); if (s) s.textContent = ghState === 'ok' ? 'Sync is on.' : ghState; if ((adopted || kept) && !S.timer && ($('#ov').hidden || $('#nav').hidden)) { closeOv(); render(); toast(adopted ? 'Loaded a newer save from another device.' + (kept ? ` Your ${kept} min of focus on this device were kept.` : '') : `${kept} min of focus from another device were added.`); } };
/* En annen fane av appen har lagret noe nyere (tabSync i game.js): da vises det som gjelder nå. En økt som går, eier skjermen. */
function tabShow() { if (!tabSync()) return false; if (S.timer) showTimer(); else if ($('#ov').hidden) render(); return true; }
window.addEventListener('storage', ev => { if (ev.key === KEY) tabShow(); });
render();
clockCheck();
netTime().then(o => { if (o != null && clockCheck() && $('#ov').hidden) render(); });
if (S.started && S.timer) showTimer(); else if (!(typeof liveGate === 'function' && liveGate()) && S.started) { if (S.tour !== TOURV) tourShow(0); else if (typeof raidArrive === 'function') raidArrive(); }
ghPull();
setTimeout(() => PACK.init(), 2500);
/* Adressen …/#lab åpner demoen direkte. */
if (location.hash === '#lab' && S.started && !S.timer) setTimeout(() => BA.lab(), 400);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
