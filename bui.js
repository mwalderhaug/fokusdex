'use strict';
/* Fokusdex – kampskjermene: kortene på forsiden, oppstilling før kampen, selve kampen, oppgjøret etterpå, Battle Frontier og demoen.
   Reglene ligger i battle.js og league.js, effektene i bfx.js. */

const BT = { B: null, busy: false, v: null, menu: 'main', res: null, ty: 0, tap: null, lead: 0, fsel: [], tp: null, fs: null };
/* Farten i kampene: vanlig fart er satt opp en fjerdedel etter tilbakemelding om at angrepene gikk for sakte, og FAST er litt over det dobbelte.
   FXSLOW er bare til testing: et tall under 1 spiller alt i sakte film. */
/* Farten i kamp. FAST er godt over det dobbelte. Lydene følger med: de innebygde krympes (SFXT), og pakkens spilles litt raskere og kuttes
   når animasjonen er over, så ingen lyd henger igjen inn i neste trekk. */
/* B.pace = en kamp med sin egen fart, uansett hva spilleren har valgt (klippet i traileren, show.js). B.quick = meldingene går som med FAST. */
const bPace = () => (BT.B && BT.B.pace) || 0, bFast = () => (bPace() ? !!BT.B.quick : !!S.bfast);
const spdF = () => (bPace() || (S.bfast ? 2.6 : 1.25)) * (window.FXSLOW || 1);
const sfxFast = () => (bFast() && BT.B && document.getElementById('arena') ? { rate: 1.22, max: 0.9 } : null);
const bwait = ms => new Promise(r => setTimeout(r, ms / spdF()));
/* Hvor mye pynt en klasse får i kort og lister: vanlig trener, boss, toppboss, og de tre sjeldne som har hver sin stil:
   de onde lederne (mørkt og rødt), mesterne (hver sin farge) og de aller største (gull, bare klasse 9). */
const TIER = k => k === 'supreme' || k === 'legend' ? 'ultra' : k === 'champ' ? 'champ' : k === 'evilboss' ? 'evil' : k === 'trainer' ? 'reg' : k === 'gym' || k === 'evilteam' || k === 'brain' ? 'boss' : 'top';
const RARE = { evilboss: 'rare boss', champ: 'very rare boss', supreme: 'ultra rare boss', legend: 'legendary' };
const kst = tr => tr.cc ? ` style="--cc:${tr.cc}"` : '';
/* Hva hver klasse gir (vises før kampen) og hva den er (vises i demoen). */
const REW = { trainer: 'coins and a ball, sometimes a Potion, an encounter or a Rare Candy', gym: 'Rare Candy, Great Balls, a Super Potion and an encounter of their type', evilteam: 'Great Balls, stolen coins and an encounter', eviladmin: 'Ultra Balls, two encounters, maybe an evolution stone',
  e4: 'Rare Candy, a Hyper Potion and two rare encounters', rival: '2 Rare Candy, a Revive, an Egg and two encounters', evilboss: '3 Rare Candy, three rare encounters, maybe a pseudo-legendary or a Mega Stone', champ: 'the Mega Ring the first time, often a Mega Stone, 4 Rare Candy, a Max Revive and a pseudo-legendary encounter. Now and then a rare prize on top',
  supreme: 'a Mega Stone, a legendary and a pseudo-legendary encounter, 6 Rare Candy and a Shiny Charm. Often a rare prize on top' };
const LABD = { trainer: 'Regular trainers', gym: 'Gym bosses', evilteam: 'Grunts and members', eviladmin: 'Second in command of the evil teams', e4: 'The Pokémon League', rival: 'Rivals', evilboss: 'Leaders of the evil teams', champ: 'Regional champions', supreme: 'Iconic, extreme boss battles' };
const who = tr => (tr.title ? tr.title + ' ' : '') + tr.n;
/* Trenerbildene hentes fra Showdown når appen brukes. Finnes ikke bildet, prøves neste navn, og til slutt vises en silhuett. */
const TSP = 'https://play.pokemonshowdown.com/sprites/trainers/';
const tsprite = (img, cls) => { const l = img.split('|'), pk = PACK.portrait(l[0]); if (pk) return `<span class="tsb ok ${cls || ''}"><img alt="" src="${pk}"></span>`; return `<span class="tsb ${cls || ''}"><img alt="" src="${TSP}${l[0]}.png" data-f="${l.slice(1).join('|')}" onload="this.parentNode.classList.add('ok')" onerror="tsErr(this)"></span>`; };
window.tsErr = img => { const f = (img.dataset.f || '').split('|').filter(Boolean); if (f.length) { img.dataset.f = f.slice(1).join('|'); img.src = TSP + f[0] + '.png'; } else img.remove(); };
/* Lydene i kamp når pakken ikke har egne. Tre tydelig forskjellige treff: supereffektivt (dypt drønn, skarpt smell og en lys klang som henger igjen),
   vanlig (et kort, tørt smekk) og lite effektivt (et dempet dunk). */
const BSFX = {
  swing: () => { noise(0, 0.14, 0.05, 900, 3200); },
  beam: () => { tone(900, 0, 0.28, 0.035, 'sawtooth', 2400); noise(0.05, 0.22, 0.025, 4000, 1500); },
  aura: () => { tone(520, 0, 0.3, 0.03, 'triangle', 1040); },
  hit: () => { noise(0, 0.09, 0.11, 1900, 420); tone(160, 0, 0.12, 0.09, 'square', 72); tone(92, 0.01, 0.1, 0.05, 'sine', 52); },
  hitS: () => { tone(120, 0, 0.34, 0.15, 'sine', 38); noise(0, 0.16, 0.17, 5200, 600); noise(0.07, 0.22, 0.1, 2400, 240); tone(1560, 0.015, 0.24, 0.05, 'square', 420); tone(2090, 0.03, 0.2, 0.03, 'sawtooth', 700); tone(72, 0.1, 0.32, 0.08, 'triangle', 34); },
  hitW: () => { noise(0, 0.06, 0.035, 520, 260); tone(124, 0, 0.07, 0.035, 'sine', 96); },
  crit: () => { tone(2637, 0, 0.09, 0.04, 'square'); tone(3520, 0.05, 0.16, 0.03, 'square'); },
  /* Oppladningen før angrepet: en tone som stiger. Sterkere angrep lader lenger og lysere. */
  charge: (tier, cls) => { const d = 0.26 + tier * 0.11; if (cls === 2) { tone(220, 0, d, 0.025 + tier * 0.006, 'sawtooth', 880 + tier * 220); tone(330, 0, d, 0.015, 'triangle', 1320 + tier * 300); } else if (cls === 1) { noise(0, d, 0.03 + tier * 0.008, 300, 1400 + tier * 300); tone(90, 0, d, 0.03, 'triangle', 150 + tier * 30); } else tone(520, 0, d, 0.02, 'triangle', 780); },
  /* Lyden til selve angrepet, etter hva slags bevegelse det har (samme inndeling som de kodetegnede animasjonene). */
  mv: (k, tier, ty) => {
    const t = tier || 0;
    switch (k) {
      case 'punch': noise(0, 0.12, 0.06, 500, 2400); tone(200, 0.02, 0.1, 0.03, 'square', 120); break;
      case 'slash': for (let i = 0; i < (t >= 2 ? 3 : 2); i++) noise(0.1 + i * 0.12, 0.09, 0.06, 5200, 1800); break;
      case 'bite': noise(0.12, 0.05, 0.08, 3000, 1200); tone(900, 0.13, 0.04, 0.04, 'square', 300); break;
      case 'jab': for (let i = 0; i < 2 + t; i++) noise(0.05 + i * 0.07, 0.05, 0.06, 3600, 1500); break;
      case 'needle': for (let i = 0; i < 4 + t * 2; i++) tone(1800 - i * 60, i * 0.055, 0.04, 0.025, 'square', 900); break;
      case 'ball': noise(0, 0.3, 0.04, 800, 2200); tone(300, 0, 0.32, 0.025, 'triangle', 620); break;
      case 'beam': { const d = 0.42 + t * 0.13; tone(900, 0, d, 0.035 + t * 0.006, 'sawtooth', 2400); tone(450, 0, d, 0.03, 'square', 620); noise(0.03, d, 0.03 + t * 0.008, 4000, 1500); break; }
      case 'stream': { const d = 0.5 + t * 0.11; noise(0, d, 0.05 + t * 0.008, ty === 10 ? 1200 : ty === 14 ? 5200 : 2200, ty === 9 || ty === 15 ? 700 : 2600); break; }
      case 'bolt': for (let i = 0; i < 2 + (t >= 2 ? 1 : 0) + (t >= 3 ? 1 : 0); i++) { noise(0.06 + i * 0.14, 0.1, 0.1, 6000, 900); tone(140, 0.06 + i * 0.14, 0.12, 0.06, 'sawtooth', 50); } break;
      case 'fall': for (let i = 0; i < 5 + t * 2; i++) { noise(0.17 + i * 0.08, 0.07, 0.06, 700, 240); tone(110, 0.17 + i * 0.08, 0.07, 0.04, 'square', 60); } break;
      case 'quake': { const d = 0.72 + t * 0.17; noise(0, d, 0.12, 160, 70); tone(52, 0, d, 0.1, 'sawtooth', 34); tone(104, 0.05, d, 0.05, 'square', 60); break; }
      case 'wave': noise(0, 0.8, 0.07, 500, 2600); noise(0.3, 0.5, 0.05, 2600, 600); break;
      case 'psy': for (let i = 0; i < 3 + t; i++) tone(700 + i * 90, i * 0.13, 0.16, 0.03, 'sine', 1400 - i * 60); break;
      case 'drain': for (let i = 0; i < 6; i++) tone(1200 - i * 110, 0.1 + i * 0.07, 0.07, 0.025, 'triangle'); break;
      case 'sound': tone(220, 0, 0.5, 0.05, 'sawtooth', 160); tone(331, 0.05, 0.45, 0.03, 'square', 250); break;
      case 'powder': noise(0, 0.7, 0.025, 5200, 3600); break;
      case 'buff': [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.14, 0.03, 'triangle')); break;
      case 'heal': [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.08, 0.14, 0.03, 'triangle')); break;
      case 'shield': tone(1320, 0, 0.3, 0.035, 'triangle', 1760); tone(880, 0.12, 0.3, 0.025, 'sine'); break;
      case 'weather': noise(0, 0.9, 0.05, 900, 3000); break;
      case 'boom': noise(0, 0.9, 0.2, 900, 60); tone(90, 0, 0.9, 0.16, 'sine', 30); noise(0.05, 0.4, 0.12, 4000, 300); break;
      case 'roll': noise(0, 0.38, 0.06, 240, 500); tone(70, 0, 0.38, 0.05, 'square', 110); break;
      case 'seed': [520, 620, 720].forEach((f, i) => tone(f, i * 0.1, 0.1, 0.03, 'triangle', f + 240)); break;
      case 'wind': noise(0, 0.7, 0.06, 500, 2400); noise(0.2, 0.5, 0.04, 2400, 700); break;
      case 'wisp': tone(600, 0, 0.5, 0.03, 'sine', 900); tone(605, 0.1, 0.4, 0.02, 'sine', 300); break;
      case 'hazard': for (let i = 0; i < 5; i++) tone(1400 + i * 100, i * 0.05, 0.05, 0.02, 'square'); break;
      default: noise(0, 0.14, 0.06, 700, 3000);
    }
  },
  faint: () => { tone(520, 0, 0.5, 0.05, 'square', 90); noise(0.25, 0.3, 0.04, 900, 200); },
  up: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.05, 0.07, 0.035)),
  down: () => [784, 659, 523, 392].forEach((f, i) => tone(f, i * 0.05, 0.07, 0.035)),
  beat: () => { tone(58, 0, 0.16, 0.12, 'sine', 40); tone(52, 0.24, 0.2, 0.1, 'sine', 36); },
  dread: () => { noise(0, 1.3, 0.07, 140, 60); tone(46, 0, 1.3, 0.07, 'sawtooth', 30); },
  /* Mega Evolution: lyset samler seg (stigende toner), og så slipper det. megaArm = knappen slås på. */
  mega: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.17, 0.24, 0.035, 'triangle', f * 1.5)); noise(0, 1.1, 0.03, 600, 6000); tone(2093, 1.13, 0.5, 0.05, 'square'); tone(1047, 1.13, 0.7, 0.05, 'triangle'); noise(1.12, 0.45, 0.07, 5000, 700); },
  megaArm: () => { tone(1175, 0, 0.08, 0.035, 'square'); tone(1760, 0.07, 0.14, 0.035, 'square'); },
  ail: () => { tone(300, 0, 0.12, 0.04, 'sawtooth', 220); tone(260, 0.14, 0.14, 0.04, 'sawtooth', 180); },
  heal: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.06, 0.1, 0.03, 'triangle')),
  ball: () => { noise(0, 0.1, 0.05, 1500, 3500); tone(700, 0.05, 0.12, 0.04, 'triangle', 1400); },
  recall: () => { tone(1200, 0, 0.18, 0.04, 'triangle', 400); },
  vs: key => { const r = keyRoot(key, 55) * 2; noise(0, 0.5, 0.08, 300, 4000); tone(r, 0, 0.5, 0.07, 'sawtooth', r * 4); tone(r * 8, 0.5, 0.25, 0.06, 'square'); },
  ace: () => { noise(0, 0.9, 0.09, 200, 5000); tone(80, 0, 0.9, 0.08, 'sawtooth', 640); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5 + i * 0.07, 0.2, 0.05, 'square')); },
  win: () => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.16, 0.05, 'triangle')),
  lose: () => [392, 370, 349, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.3, 0.05, 'triangle'))
};
/* I FAST krympes de innebygde kamplydene like mye som animasjonene, så ingen lyd henger igjen inn i neste trekk. Seier, tap og de store
   øyeblikkene (Mega Evolution, introer) spilles som de er. */
{ const KEEP = new Set(['win', 'lose', 'dread', 'mega', 'megaArm', 'vs', 'ace', 'beat']);
  for (const k of Object.keys(BSFX)) { if (KEEP.has(k)) continue; const f = BSFX[k]; BSFX[k] = (...a) => { const o = SFXT; SFXT = sfxFast() ? 0.58 : 1; try { return f(...a); } finally { SFXT = o; } }; } }
/* Den episke introen til de sjeldne bossene (klasse 7 til 9), laget med lyd-API-et og uten lydfiler: en dyp drone som vokser, krigstrommer som tetner,
   et kor som stiger, et sus som bygger seg opp, og et drønn i det bossen viser seg. Da toner kamplåta inn over etterklangen.
   kind: 'evil' (mørk og skjev, med hjerteslag), 'champ' (staselig) eller 'ultra' (størst, med fanfare). T = sekunder fram til drønnet.
   bare = bare drønnet (når pakken har sin egen intro til bossen). Gir en funksjon som stopper lyden. */
/* Grunntonen til introen: tonikaen i kamplåta som følger (tonearten står i pakken), lagt nede i bassen (55–104 Hz). Uten kjent toneart brukes def. */
const keyRoot = (key, def) => key ? 55 * Math.pow(2, ((key[0] + 3) % 12) / 12) : def;
/* key = tonearten til kamplåta ([tonika, 0 moll / 1 dur / 2 uviss]): introen går i samme toneart, så drønnet glir rett over i låta.
   Er den ikke sikkert i moll, spilles akkordene uten ters (bare grunntone og kvint), som passer til begge. */
function epicIntro(kind, T, bare, key) {
  const m = S.sound ? out() : null; if (!m) return () => {};
  try {
    const a = AC, t0 = a.currentTime + 0.04, tE = t0 + T, bus = a.createGain(), cmp = a.createDynamicsCompressor(), evil = kind === 'evil', ultra = kind === 'ultra', root = keyRoot(key, evil ? 61.74 : 73.42), th = !key || key[1] === 0;
    bus.gain.value = 0.9; bus.connect(cmp); cmp.connect(m);
    const osc = (type, f, t1, t2, dest) => { const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t1); g.gain.setValueAtTime(0.0001, t1); o.connect(g); g.connect(dest || bus); o.start(t1); o.stop(t2 + 0.1); return { o, g }; };
    const nb = a.createBuffer(1, a.sampleRate, a.sampleRate), ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const hiss = (type, f1, f2, t1, t2, q) => { const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = nb; s.loop = true; f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f1, t1); f.frequency.exponentialRampToValueAtTime(f2, t2); g.gain.setValueAtTime(0.0001, t1); s.connect(f); f.connect(g); g.connect(bus); s.start(t1); s.stop(t2 + 0.1); return g; };
    if (!bare) {
      /* Dronen: sagtenner gjennom et filter som åpner seg. */
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.setValueAtTime(180, t0); lp.frequency.exponentialRampToValueAtTime(evil ? 1500 : 2600, tE); lp.connect(bus);
      for (const [mul, det, v] of [[1, 0, 0.1], [2, 6, 0.08], [evil ? 2.828 : 3, -5, 0.05], [4, 3, 0.03]]) { const x = osc('sawtooth', root * mul, t0, tE, lp); x.o.detune.value = det; x.g.gain.exponentialRampToValueAtTime(v * 0.25, t0 + T * 0.3); x.g.gain.exponentialRampToValueAtTime(v, tE - 0.05); x.g.gain.exponentialRampToValueAtTime(0.0001, tE + 0.08); }
      /* Koret: en akkord som toner inn. Mesterne løftes en tone mot slutten, de onde synker i en skjev klang. */
      (evil ? [1, 1.0595, 1.4142, 2] : ultra ? (th ? [1, 1.189, 1.498, 2, 2.378] : [1, 1.498, 2, 2.997, 4]) : th ? [1, 1.189, 1.498, 2] : [1, 1.498, 2, 2.997]).forEach((r, i) => {
        const f = root * 4 * r, x = osc('triangle', f, t0 + T * 0.22, tE), lfo = a.createOscillator(), lg = a.createGain();
        lfo.frequency.value = 5 + i * 0.4; lg.gain.value = 3 + i; lfo.connect(lg); lg.connect(x.o.frequency); lfo.start(t0); lfo.stop(tE + 0.2);
        x.o.frequency.setValueAtTime(f, tE - T * 0.24); x.o.frequency.exponentialRampToValueAtTime(f * (evil ? 0.944 : 1.1225), tE - 0.02);
        x.g.gain.exponentialRampToValueAtTime(0.03, tE - 0.1); x.g.gain.exponentialRampToValueAtTime(0.0001, tE + 0.1);
      });
      /* Suset som bygger seg opp. */
      const ng = hiss('bandpass', 220, 7000, t0, tE, 1.6); ng.gain.exponentialRampToValueAtTime(0.012, t0 + T * 0.5); ng.gain.exponentialRampToValueAtTime(0.1, tE); ng.gain.exponentialRampToValueAtTime(0.0001, tE + 0.06);
      /* Krigstrommene: tettere og sterkere fram mot drønnet. De onde får dobbeltslag som et hjerte. */
      const drum = (t, v) => { const x = osc('sine', 124, t, t + 0.4); x.o.frequency.exponentialRampToValueAtTime(44, t + 0.24); x.g.gain.exponentialRampToValueAtTime(v, t + 0.012); x.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36); const y = osc('triangle', 250, t, t + 0.12); y.o.frequency.exponentialRampToValueAtTime(92, t + 0.08); y.g.gain.exponentialRampToValueAtTime(v * 0.6, t + 0.006); y.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); };
      const hits = evil ? [0, 0.07, 0.3, 0.37, 0.56, 0.63, 0.76, 0.81, 0.87, 0.91, 0.95, 0.98] : [0, 0.2, 0.4, 0.55, 0.66, 0.75, 0.82, 0.87, 0.91, 0.94, 0.965, 0.985];
      hits.forEach((f, i) => drum(t0 + T * f, 0.1 + 0.2 * (i / hits.length)));
      /* Fanfaren til de aller største: en stigende arpeggio like før drønnet. */
      if (ultra) (th ? [1, 1.189, 1.498, 2, 2.378, 2.997, 4] : [1, 1.335, 1.498, 2, 2.67, 2.997, 4]).forEach((r, i) => { const t = tE - 0.64 + i * 0.085, x = osc('square', root * 8 * r, t, t + 0.2); x.g.gain.exponentialRampToValueAtTime(0.028, t + 0.01); x.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); });
    }
    /* Drønnet: dyp tromme, messing som faller, et smell og en cymbal som klinger ut. */
    const bo = osc('sine', 150, tE, tE + 1.6); bo.o.frequency.exponentialRampToValueAtTime(34, tE + 0.9); bo.g.gain.exponentialRampToValueAtTime(0.36, tE + 0.02); bo.g.gain.exponentialRampToValueAtTime(0.0001, tE + 1.5);
    const bl = a.createBiquadFilter(); bl.type = 'lowpass'; bl.frequency.setValueAtTime(1800, tE); bl.frequency.exponentialRampToValueAtTime(260, tE + 1.8); bl.connect(bus);
    for (const [mul, v] of [[1, 0.09], [2, 0.08], [3, 0.055], [evil ? 2.828 : th ? 2.378 : 6, evil || th ? 0.05 : 0.02], [4, 0.035]]) { const x = osc('sawtooth', root * mul, tE, tE + 2.4, bl); x.o.frequency.exponentialRampToValueAtTime(root * mul * 0.985, tE + 2); x.g.gain.exponentialRampToValueAtTime(v, tE + 0.03); x.g.gain.exponentialRampToValueAtTime(v * 0.5, tE + 0.7); x.g.gain.exponentialRampToValueAtTime(0.0001, tE + 2.3); }
    const cr = hiss('lowpass', 2600, 300, tE, tE + 0.5); cr.gain.exponentialRampToValueAtTime(0.2, tE + 0.01); cr.gain.exponentialRampToValueAtTime(0.0001, tE + 0.45);
    const cy = hiss('highpass', 5200, 7000, tE, tE + 2); cy.gain.exponentialRampToValueAtTime(0.07, tE + 0.02); cy.gain.exponentialRampToValueAtTime(0.0001, tE + 1.9);
    return () => { try { const t = a.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + 0.15); } catch (_) {} };
  } catch (_) { return () => {}; }
}
/* Hvilken innebygd låt som hører til kampen (music.js har sju: én for hver type motstander). Brukes når pakken ikke har en egen låt. */
const MKIND = { gym: 'gym', e4: 'gym', evilteam: 'evil', eviladmin: 'evil', evilboss: 'evil', rival: 'rival', champ: 'champ', supreme: 'champ', brain: 'champ', legend: 'legend' };
const musicKey = B => MKIND[B.tr.kind] || (B.tr.fr || B.mode === 'fac' || B.mode === 'pwt' ? 'frontier' : 'trainer');
/* Kampmusikken: trenerens egen låt fra ressurspakken hvis den finnes, ellers den innebygde. */
async function battleMusic(B, o) {
  if (dkOn(B) && B.dks && B.dks.ph) return dkMusic(B, o);
  return battleMusic0(B, o);
}
async function battleMusic0(B, o) {
  const tk = PACK.trackFor(B);
  if (tk && await PACK.music(tk, o)) return music('');
  if (BT.B !== B || B.over) return;
  PACK.music(''); music(musicKey(B), o);
}
/* Musikken stopper aldri brått: den tones ut. sec = hvor lenge (kort når skjermen byttes, lang etter en kamp). */
const stopMusic = sec => { const f = sec == null ? 0.35 : sec; PACK.music('', { out: f }); PACK.stingOut(Math.min(f, 1.2)); music('', { out: f }); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') { dkPause(); stopMusic(0.05); } else if (BT.B && !BT.B.over && $('#arena')) battleMusic(BT.B); });

/* ---------- Forsiden ---------- */
const leagueTag = () => { const L = S.lad; return `${L.lap ? 'Lap ' + (L.lap + 1) + ' · ' : ''}Battle ${L.n + 1}/${LAPN}`; };
/* Den legendariske som har vist seg. To forsøk, ett om dagen. Hvem det er, er hemmelig til du har stått foran den (R.seen settes når kampen starter og
   filmen går), og nivået sies aldri på forhånd. */
function raidCard() {
  const R = S.raid; if (!R || R.hid || !LEG[R.id]) return '';
  const V = raidShow(R), L = V.L, open = raidOpen(), n = (R.tries || 0) + 1, last = n >= raidTries(R) && !R.ev;
  const btn = `<button type="button" class="btn gold wide" data-a="raid" style="margin-top:10px"${open ? '' : ' disabled'}>${open ? (last ? 'Challenge it · last attempt' : 'Challenge it') : 'Again tomorrow'}</button>`;
  if (!R.seen) return `<div class="card k-ultra raidc myst"><div class="pre-foe"><span class="raid-sp qm" aria-hidden="true"><i>?</i></span><div class="sp"><div class="sm">Legendary raid · attempt 1 of ${raidTries(R)}</div><b class="bossn" style="font-size:19px">A legendary Pokémon</b><div class="sm tn" style="margin-top:4px">Who it is stays secret until you face it</div></div></div>${btn}</div>`;
  return `<div class="card k-ultra raidc" style="--cc:${L.cc}"><div class="pre-foe"><span class="raid-sp">${spr(R.id, { ani: 1, sh: V.sh, mega: defForm(R.id) })}</span><div class="sp"><div class="sm">Legendary raid · attempt ${n} of ${raidTries(R)}</div><b class="bossn" style="font-size:19px">${esc(V.n)}</b><div class="sm tn" style="margin-top:4px">${TYN[D(R.id)[1]]}${D(R.id)[2] >= 0 ? ' / ' + TYN[D(R.id)[2]] : ''} · your own team of six</div></div></div>${btn}</div>`;
}
function raidScreen() {
  const R = S.raid; if (!R) return render();
  const V = raidShow(R), L = V.L, t = L.t, dom = raidDom({ dk: V.sh === 2, lbg: L.bg }), left = raidTries(R) - (R.tries || 0), party = S.party.map(monBy).filter(Boolean), lead = BT.lead && party.some(m => m.u === BT.lead) ? BT.lead : party[0] && party[0].u;
  const team = `<div><div class="lab">Your team · tap the one that leads</div><div class="lineup">${party.map(m => `<button type="button" data-a="rlead" data-u="${m.u}" class="${m.u === lead ? 'lead' : ''}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega })}<span class="sp"><b>${esc(mName(m))}</b><br><span class="sm tn">Lv ${m.lv}</span> ${evTag(m)}</span>${m.u === lead ? '<span class="pill">Leads</span>' : ''}</button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="raidgo"${raidOpen() && party.length ? '' : ' disabled'}>${raidOpen() ? 'Start the raid' : 'Again tomorrow'}</button></div>`;
  const lose = left > 1 ? 'it stays, and you get one more attempt tomorrow, knowing who it is.' : 'this was your last attempt, and it moves on.';
  /* Første forsøk: ingenting om hvem det er. Navn, type, sted og premie ville røpet den. */
  if (!R.seen) return ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Legendary raid</span></div>
    <div class="card k-ultra raidc myst"><div class="pre-foe"><span class="raid-sp qm" aria-hidden="true"><i>?</i></span><div class="sp"><div class="sm">Unknown · you find out when you face it</div><b class="bossn" style="font-size:21px">A legendary Pokémon</b><div class="sm tn" style="margin-top:4px">${RAIDHP[0]} to ${RAIDHP[3]}× the HP of a normal Pokémon</div></div></div>
      <p class="sm" style="margin-top:10px">One Pokémon against your whole team, with the Bag. Its level was set by your team when it appeared, so training before you try again helps.</p>
      <p class="sm" style="margin-top:6px">Its place fights with it: every third turn something happens on the field, and below half HP it becomes enraged and grows stronger.</p>
      <p class="sm" style="margin-top:6px">Win: it is yours, with ${nb(Math.round(RAIDCOIN[0] * diff().coin))} coins or more, Rare Candy and a lot of XP for the whole team. Lose: ${lose}</p></div>
    ${team}`, 'tint', 'var(--gold)');
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Legendary raid</span></div>
    <div class="card k-ultra raidc" style="--cc:${L.cc}"><div class="pre-foe"><span class="raid-sp">${spr(R.id, { ani: 1, sh: V.sh, mega: defForm(R.id) })}</span><div class="sp"><div class="sm">${V.sh === 2 ? 'Shadow Pokémon · the rarest of all' : raidTitle(R.id, 0)}</div><b class="bossn" style="font-size:21px">${esc(V.n)}</b><div class="sm tn" style="margin-top:4px">${RAIDHP[t - 1]}× the HP of a normal Pokémon</div></div></div>
      <p class="sm" style="margin-top:10px">One Pokémon against your whole team, with the Bag. Its level was set by your team when it appeared, so training before you try again helps.</p>
      ${dom ? `<p class="sm" style="margin-top:6px"><b>${dom.n}.</b> The place fights with it: every third turn ${dom.d}. Below half HP it becomes enraged, grows stronger, and it happens every second turn.</p>` : ''}
      <p class="sm" style="margin-top:6px">Win: it is yours, with ${nb(Math.round(RAIDCOIN[t - 1] * diff().coin))} coins, ${RAIDCANDY[t - 1]} Rare Candy and a lot of XP for the whole team. Lose: ${lose}</p></div>
    ${team}`, 'tint', L.cc);
}
/* ---------- Rundt de legendariske i kampen (bildene ligger i raidx.js, reglene for stedet i league.js) ---------- */
/* Hvilken entré den legendariske har, og hvordan figuren kommer inn i det den viser seg. */
const entKind = tr => DOM[domKey(tr)] ? domKey(tr) : 'void';
const ENTC = { bolt: 'e-flash', ice: 'e-flash', magma: 'e-rise', sea: 'e-rise', sky: 'e-drop', void: 'e-warp', space: 'e-zoom', time: 'e-flash', forest: 'e-zoom', stone: 'e-slam', origin: 'e-descend', dark: 'e-zoom', night: 'e-warp' };
/* Lydene effektene ber om heter som angrep i pakken. Uten pakke spilles den innebygde lyden av samme slag. */
const SFXFB = { Thunder: 'bolt', Blizzard: 'wind', Eruption: 'boom', Surf: 'wave', Hurricane: 'wind', Psychic: 'psy', 'Cosmic Power': 'psy', 'Roar of Time': 'sound', Synthesis: 'heal', 'Rock Slide': 'fall', Judgment: 'beam', Psystrike: 'boom', Nightmare: 'psy' };
/* Lyd, risting og vibrasjon til effektene. more(n, v) tar det som er spesielt for én effekt. */
const fxCue = (B, more) => (n, v) => {
  if (BT.B !== B || !$('#arena')) return;
  if (n === 'tick') { tone(1800, 0, 0.04, 0.03, 'square', 900); buzz(15); shake(140, 1.5); }
  else if (n === 'thud') { BSFX.hit(); buzz(45); shake(220, 3); }
  else if (n === 'hit') { BSFX.hit(); buzz([30, 30, 70]); shake(320, 4); }
  else if (n === 'boom') { tone(60, 0, 0.5, 0.1, 'sine', 30); buzz([90, 60, 90, 60, 240]); shake(650, 6, 1); }
  else if (n === 'rumble') { BSFX.dread(); buzz([20, 40, 20, 40, 20, 40, 20]); shake(800, 2); }
  else if (n === 'beat') { BSFX.beat(); buzz([60, 80, 90]); }
  else if (n === 'wind') BSFX.mv('wind');
  else if (n === 'chime') BSFX.up();
  else if (n === 'sfx') { if (!PACK.sfx(v, 0.9)) BSFX.mv(SFXFB[v] || 'boom', 3); }
  else if (n === 'cry') cry(B.foe[B.b].id, 0, 0.6);
  else if (more) more(n, v);
};
/* Hvor de to står, i effektenes 512 × 384, og hvor stor figuren til den legendariske er. */
const fxAt = B => { const a = anc('foe', 0), m = anc('me', 0), ar = $('#arena'), sp = $('#s-foe'), cz = parseFloat(ar.style.getPropertyValue('--cz')) || 1.1, k = parseFloat(sp && sp.style.getPropertyValue('--k')) || 1; return { x: a.x * 2, y: a.y * 2, mx: m.x * 2, my: m.y * 2, cc: B.tr.cc || '#ffffff', s: 1.6 * k * cz }; };
/* Entréen: figuren er malt skjult, effekten spilles over banen, og i det den viser seg får figuren sin egen bevegelse inn. Gir false når det ikke finnes noen egen entré. */
async function raidEntry(B) {
  const tr = B.tr, sp = $('#s-foe'), cv = $('#rfx'), b = B.foe[B.b], kind = entKind(tr), name = 'in:' + kind;
  if (!cv || !sp || calm() || typeof CINE === 'undefined' || !CINE.fxInfo(name)) return false;
  const f = CINE.FILM[tr.leg], sid = tr.dk ? 'dk' + tr.leg : (f && f.spid) || tr.leg, inf = CINE.fxInfo(name);
  await CINE.fxPrep(name, sid); if (BT.B !== B || !sp.isConnected) return true;
  textAway();
  let shown = false; const show = () => { if (shown || BT.B !== B || !sp.isConnected) return; shown = true; sp.className = 'bs foe ' + ENTC[kind] + ' ace'; cry(b.id, 60, 0.6); };
  const o = Object.assign(fxAt(B), { id: sid, cue: fxCue(B) });
  const tm = setTimeout(show, inf.R * 1000);
  await CINE.fx(cv, name, o); clearTimeout(tm); show();
  return true;
}
/* Stedet kjemper med: teksten skrives mens hendelsen spilles over banen. Raseriet blir stående: glød rundt den legendariske, og sterkere luft resten av kampen. */
async function envFx(B, e) {
  const cv = $('#rfx'), name = 'ev:' + e.k, ok = !!cv && !calm() && typeof CINE !== 'undefined' && !!CINE.fxInfo(name);
  if (e.k === 'rage') { const fo = $('#s-foe'), ar = $('#arena'); if (fo) fo.classList.add('rage'); if (ar) ar.classList.add('raging'); if (BT.airO) BT.airO.k = 1.5; }
  const tx = e.s ? typeOut(e.s) : null;
  if (ok) await CINE.fx(cv, name, Object.assign(fxAt(B), { cue: fxCue(B) }));
  if (tx) await tx;
  await bwait(ok ? 320 : 800);
}
/* ---------- Dark Mewtwo: to låter og forvandlingen (bildene ligger i darkf.js, reglene i darkShift i league.js) ----------
   Kampen mot Dark Mewtwo har sin egen låt, som spilles én gang (pakka: «Villain's Ascent»). Den starter i det forvandlingen starter (filmen, rett etter
   varselet), og går uavbrutt inn i kampen (dkStart). Når den er slutt – DKSEC sekunder ut i LÅTA, altså snaut to og et halvt minutt ut i kampen – og Dark Mewtwo
   fortsatt står, forvandles den. Det som spilles av, gjøres ferdig først. Så toner den første låta ut, «Something is happening…» skrives, og den neste låta
   («Where Is Your God Now», CINE.SIN.at sekunder inn) starter sammen med bildene. På utbruddet er den «provoked»: helsa løftes til 75 %, Sp. Atk og Speed går
   opp, og skyen og de lysende øynene blir stående resten av kampen (B.sin).
   Klokka går bare mens kampen vises (dkPause når appen legges bort), og hvor langt den er kommet, lagres med kampen (B.dks = { ph, el }: ph 1 = første låt,
   2 = forvandlet; el = sekunder), så en kamp som hentes fram igjen fortsetter der låta var. Uten pakke skjer det samme til samme tid, med innebygd musikk.
   B.dkq (sandkassa) kutter ventetiden til DKQUICK sekunder og starter låta tilsvarende langt ute, så slutten høres. */
const DKSEC = 172.2, DKQUICK = 22;
const dkOn = B => !!(B && B.raid && B.tr && B.tr.dk);
const dkSec = B => B.dkq ? DKQUICK : DKSEC;
const dkEl = B => BT.dkB === B ? (performance.now() - BT.dkT0) / 1000 : (B.dks && B.dks.el) || 0;
const dkDue = B => dkOn(B) && !!B.dks && B.dks.ph === 1 && !B.over && B.foe[B.b].hp > 0 && dkEl(B) >= dkSec(B);
/* Hvor i den første låta klokka står (i sandkassa starter låta langt ute). */
const dkAt = (B, V) => dkEl(B) + (B.dkq ? Math.max(0, (PACK.lenOf(V) || DKSEC + 2.7) - 2.7 - DKQUICK) : 0);
function dkClock(B, el) {
  const s = B.dks; if (el != null) s.el = el; BT.dkB = B; BT.dkT0 = performance.now() - (s.el || 0) * 1000;
  clearTimeout(BT.dkTm); BT.dkTm = setTimeout(() => dkCheck(B), Math.max(250, (dkSec(B) - (s.el || 0)) * 1000 + 80));
}
function dkCheck(B) {
  if (BT.B !== B || BT.dkB !== B || B.over || !B.dks || B.dks.ph !== 1) return;
  if (dkEl(B) < dkSec(B)) return dkClock(B, dkEl(B));
  /* Spilles det av noe nå, tar playEv den når runden er vist. Ellers (menyen står åpen) skjer det med en gang. */
  if (BT.busy || !$('#arena')) { clearTimeout(BT.dkTm); BT.dkTm = setTimeout(() => dkCheck(B), 400); return; }
  dkShift(B);
}
function dkPause() { const B = BT.dkB; clearTimeout(BT.dkTm); if (B && B.dks && B.dks.ph === 1) B.dks.el = dkEl(B); BT.dkB = null; }
const dkTick = B => { if (BT.dkB === B && B.dks && B.dks.ph === 1) B.dks.el = dkEl(B); };
/* Filmen til Dark Mewtwo er lagt på slagene i X og Y-låta. Nå starter den første kamplåta («Villain's Ascent») i det forvandlingen starter, og da
   strekkes filmtiden så de samme bildene faller på slagene i DEN: [sekunder i låta, sekunder i filmen]. Skyggene kommer på 4.87, 6.67, 8.47 og 9.66,
   de fire tunge klippene på 12.07–15.67, utbruddet på 16.87, skuddet som knuser bildet på låtas sterkeste slag (21.67), og navnet på 22.86. */
const DKWARP = [[0, 0], [4.87, 3.74], [6.67, 5.07], [8.47, 6.4], [9.66, 7.74], [12.07, 9.07], [13.26, 9.74], [14.47, 10.41], [15.67, 11.07], [16.87, 11.74], [21.67, 15.73], [22.86, 17.07], [25.2, 19.6]];
const dkWarp = t => { for (let i = 1; i < DKWARP.length; i++) { const a = DKWARP[i - 1], b = DKWARP[i]; if (t <= b[0]) return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } const z = DKWARP[DKWARP.length - 1]; return z[1] + (t - z[0]); };
/* Kampen er tegnet. Spiller den første låta allerede (den startet med filmen), går den bare videre, og klokka stilles etter hvor langt den er kommet:
   forvandlingen midt i kampen kommer når låta er slutt. Ellers (uten film, eller i hurtigvarianten) starter låta her. */
function dkStart(B) {
  if (!dkOn(B)) return; const s = B.dks || (B.dks = { ph: 0, el: 0 }); if (s.ph) return;
  const V0 = PACK.special(/Villain/), on = !!V0 && !B.dkq && PACK.track() === V0, c0 = on ? PACK.clock() : 0;
  s.ph = 1; dkClock(B, c0 > 0 ? c0 : 0);
  if (on) { music(''); const G = PACK.special(/God Now/); if (G) PACK.cue(G); return; }
  const V = PACK.special(/Villain/); if (!V) return;
  PACK.music(V, { loop: false, at: dkAt(B, V), fade: 1.2, from: 0.05, out: 1.4 }).then(ok => { if (!ok || BT.B !== B || s.ph !== 1) return; music(''); dkClock(B, 0); const G = PACK.special(/God Now/); if (G) PACK.cue(G); });
}
/* Musikken når kampen hentes fram igjen (appen har vært lagt bort, eller kampen fortsetter etter at appen ble lukket). */
async function dkMusic(B, o) {
  const s = B.dks, V = PACK.special(/Villain/), G = PACK.special(/God Now/);
  if (s.ph === 1) {
    if (BT.dkB !== B) dkClock(B);
    if (V && dkEl(B) < dkSec(B) - 1.5) { if (await PACK.music(V, Object.assign({ fade: 0.5 }, o, { loop: false, at: dkAt(B, V) }))) { music(''); if (G) PACK.cue(G); return; } }
    else if (V) { PACK.music('', { out: 0.4 }); return music(''); }
    if (BT.B !== B || B.over) return;
    return battleMusic0(B, o);
  }
  if (G && await PACK.music(G, Object.assign({ fade: 0.6 }, o, { at: CINE.SIN.loop }))) return music('');
  if (BT.B !== B || B.over) return;
  PACK.music(''); music('evil', o);
}
/* Øynene som lyser: to merker oppå figuren, plassert etter øynene i bildet (CINE.SIN.eye). */
/* DKEYE: øyepikslene i det 96 × 96 store bildet av nr. 150 sett forfra. hot = det hvite i det nære øyet, core = pupillen, far = glipa som er alt
   en ser av det bortre øyet (hodet er vendt mot venstre). dkEyePaint maler dem glødende i det mørke bildet og husker resultatet i DKC. */
const DKEYE = { hot: [[47, 31], [48, 31], [49, 31], [48, 32], [49, 32]], core: [[47, 32], [46, 33]], far: [[42, 31], [42, 32]] };
function dkEyePaint(img) {
  if (!img || typeof DKC === 'undefined') return false;
  const u = img.dataset.u || '', k = u + '#sin', have = DKC.get(k);
  if (have) { if (img.src !== have) img.src = have; return true; }
  if (!DKC.get(u) || img.classList.contains('dkf') || !img.complete || img.naturalWidth !== 96 || img.naturalHeight !== 96) return false;
  try {
    const c = document.createElement('canvas'), x = c.getContext('2d'); c.width = 96; c.height = 96; x.drawImage(img, 0, 0);
    const put = (l, col) => { x.fillStyle = col; l.forEach(p => x.fillRect(p[0], p[1], 1, 1)); };
    put(DKEYE.hot, '#fff3c8'); put(DKEYE.core, '#ff7a1e'); put(DKEYE.far, '#ff5a1a'); x.fillStyle = '#ffb060'; x.fillRect(DKEYE.far[1][0], DKEYE.far[1][1], 1, 1);
    const d = c.toDataURL(); DKC.set(k, d); img.src = d; return true;
  } catch (_) { return false; }
}
/* Øynene som lyser: pikslene males (dkEyePaint), og to svake skjær legges oppå, plassert etter øynene i bildet (CINE.SIN.eye). Er bildet ikke lastet
   ennå, males det når det er klart. */
const dkEyes = sp => {
  if (!sp || typeof CINE === 'undefined' || !CINE.SIN) return;
  const img = sp.querySelector('.sprb.dark img.spr');
  if (img && !dkEyePaint(img) && !img.dataset.sinw) { img.dataset.sinw = '1'; img.addEventListener('load', () => { delete img.dataset.sinw; if (sp.classList.contains('sin')) setTimeout(() => dkEyePaint(img), 0); }, { once: true }); }
  if (sp.querySelector('.sineye')) return;
  CINE.SIN.eye.forEach((e, i) => { const el = document.createElement('i'); el.className = 'sineye' + (i ? ' b' : ''); el.style.setProperty('--ex', e[0] + 'px'); el.style.setProperty('--ey', e[1] + 'px'); sp.appendChild(el); });
};
/* Det som blir stående etter forvandlingen: rød glød rundt den og langs kanten av banen, øynene, og skyen bak den (lufta får vite hvor den står). */
function dkLook(B) {
  const ar = $('#arena'), sp = $('#s-foe'); if (!ar || !sp || BT.B !== B) return;
  ar.classList.add('sinful'); ar.style.setProperty('--cc', '#ff2a2a'); sp.classList.add('sin'); dkEyes(sp);
  if (BT.airO) { const at = fxAt(B), cz = parseFloat(ar.style.getPropertyValue('--cz')) || 1.1, wx = 230.4 + (at.x - 230.4) / cz, wy = 307.2 + (at.y - 307.2) / cz, s = at.s / cz; BT.airO.sin = { x: wx, y: wy - 46 * s, r: 58 * s, fy: wy }; BT.airO.k = Math.max(BT.airO.k || 1, 1.5); }
}
/* Arceus svarer (darkShift, B.god): et gyllent lys stiger fra din side av banen, med skriket til Arceus. */
async function godLight(B) {
  const ar = $('#arena'); if (!ar || BT.B !== B) return;
  if (!PACK.sfx('Judgment', 0.8)) BSFX.mv('beam', 3); cry(DKGOD, 0.15);
  if (calm()) return bwait(500);
  const el = document.createElement('i'); el.className = 'godl'; ar.appendChild(el); await bwait(1500); el.remove();
}
async function dkShift(B) {
  const s = B.dks; if (!s || s.ph !== 1 || BT.B !== B || B.over || !$('#arena')) return;
  s.ph = 2; clearTimeout(BT.dkTm); BT.dkB = null; BT.busy = true; BT.menu = 'main'; drawMenu();
  const ok = () => BT.B === B && !!$('#arena'), T = ms => new Promise(r => setTimeout(r, ms)), f = B.foe[B.b], ev = [];
  /* Reglene først, så de står om appen lukkes midt i bildene. HP-streken og meldingene vises etter utbruddet. */
  darkShift(B, ev); liveSave(B);
  PACK.music('', { out: 1.6 }); music('', { out: 1.6 });
  await say('Something is happening…', 1100); if (!ok()) return;
  const G = PACK.special(/God Now/), cv = $('#rfx'), fxok = !!cv && !calm() && typeof CINE !== 'undefined' && !!CINE.fxInfo('ev:sin');
  if (fxok) await CINE.fxPrep('ev:sin', 'dk150');
  const started = G ? await PACK.music(G, { at: CINE.SIN.at, fade: 0.1 }) : false; if (!ok()) return;
  if (started) music('');
  /* Utbruddet: fra nå står skyen, og uten pakke tar den innebygde låta over her. */
  const look = () => { if (!ok()) return; dkLook(B); if (!started) { PACK.music(''); music('evil'); } typeOut(`${f.name} feels provoked!`); };
  if (fxok) { textAway(); const at = fxAt(B), E = CINE.SIN.eye; await CINE.fx(cv, 'ev:sin', Object.assign(at, { id: 'dk150', ex: at.x + E[0][0] * at.s, ey: at.y + E[0][1] * at.s, ex2: at.x + E[1][0] * at.s, ey2: at.y + E[1][1] * at.s, cue: fxCue(B, n => { if (n === 'sin') look(); }) })); }
  else { await T(1400); look(); await T(1800); }
  if (!ok()) return;
  await bwait(400);
  for (const e of ev) { if (!ok()) return; await playOne(B, e); }
  if (!ok()) return;
  liveSave(B); BT.busy = false;
  if (B.over) return endBattle();
  return turnIdle(B);
}
/* Filmen til de to helt spesielle i ligaens finale (bossf.js): spilles før oppstillingen, i takt med låta. Har bossen et eget introstykke i pakken
   (Cynthia), spiller det gjennom filmen og oppstillingen, og kamplåta starter når du går inn. Ellers starter kamplåta med filmen (Ghetsis).
   Uten pakke spilles den innebygde oppbyggingen, med lyder på slagene. Gir true når filmen er vist. */
async function bossFilm(B) {
  const tr = B.tr, id = tr.film, info = typeof CINE !== 'undefined' && id ? CINE.info(id) : null, T = ms => new Promise(r => setTimeout(r, ms));
  if (!info) return false;
  ov(`<div class="lgi" id="lgi" style="--cc:${tr.cc || '#fff'}"><div class="lgi-s"><canvas class="lgi-cv" id="lgicv" width="512" height="384"></canvas></div><i class="lgi-wait"></i><button type="button" class="lgi-skip" id="lgiskip" hidden>Skip</button></div>`, 'battle vsov');
  /* Filmen får laget som faktisk møter (det vises bare som skygger). */
  const root = $('#lgi'), cv = $('#lgicv'), gone = () => BT.B !== B || !root.isConnected, o = { name: tr.n, cap: tr.cn, cc: tr.cc || '#fff', team: B.foe.map(f => f.id) };
  try { await Promise.race([PACK.portraits([tr.img.split('|')[0]]), T(1500)]); } catch (_) {}
  await CINE.prep(id, 6000, o.team); if (gone()) return true;
  if (calm()) { root.classList.add('on'); await CINE.still(cv, id, Math.min(info.len - 0.6, info.R + 2), o); battleMusic(B, { fade: 1.2, from: 0.1 }); await T(2600); if (gone()) return true; root.classList.add('d'); await T(260); return true; }
  const it = PACK.introFor(B), tk = PACK.trackFor(B);
  let started = false, own = false, t0 = 0;
  if (it) { started = await PACK.sting(it, true); own = started; } else if (tk) started = await PACK.music(tk, { at: info.at });
  if (gone()) return true;
  let stop = () => {};
  if (started) music(''); else { PACK.music(''); stop = epicIntro(tr.th === 'evil' ? 'evil' : 'ultra', info.R); }
  t0 = performance.now(); root.classList.add('on'); sfx.appear(); buzz([40, 60, 40]);
  const ace = B.foe[B.foe.length - 1];
  const cue = n => { if (gone()) return;
    if (n === 'cry') { cry(ace.id, 0, 0.6); buzz([80, 40, 260]); }
    else if (n === 'boom') { if (!started) BSFX.mv('boom', 3); buzz([90, 60, 90, 60, 240]); }
    else if (n === 'hit') { if (!started) BSFX.hit(); buzz([30, 30, 70]); }
    else if (n === 'beat') { if (!started) BSFX.beat(); buzz([60, 80, 90]); }
    else if (n === 'rumble') { if (!started) BSFX.dread(); buzz([20, 40, 20, 40, 20]); }
    else if (n === 'chime') { if (!started) BSFX.up(); buzz(18); }
    else if (n === 'thud') buzz(45); else buzz(18); };
  const pl = CINE.play(cv, id, Object.assign({ clock: () => !started ? -1 : own ? (performance.now() - t0) / 1000 : PACK.clock(), cue }, o)), sk = $('#lgiskip');
  let skipped = false; const skip = () => { if (skipped) return; skipped = true; sfx.tap(); stop(); pl.skip(); };
  setTimeout(() => { if (!gone() && sk) sk.hidden = false; }, 1200); if (sk) sk.addEventListener('click', skip);
  const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip(); }; document.addEventListener('keydown', key);
  const watch = setInterval(() => { if (gone()) pl.stop(); }, 300);
  await pl.done; clearInterval(watch); document.removeEventListener('keydown', key);
  if (gone()) { stop(); PACK.stingOut(0.2); return true; }
  root.classList.add('d'); await T(240);
  return true;
}
/* Filmen når en legendarisk Pokémon viser seg (raid.js og raidf.js). Hver av de store har sin egen, lagt på slagene i låta si, og trioene og de mindre har
   roligere filmer. Låta starter med filmen og fortsetter inn i kampen. Filmen kan hoppes over. Med «redusert bevegelse» vises bare et stillbilde. */
async function legendIntro(B) {
  const tr = B.tr, f = B.foe[0], id = tr.dk ? 'dk' + tr.leg : tr.leg, info = typeof CINE !== 'undefined' ? CINE.info(id) : null, T = ms => new Promise(r => setTimeout(r, ms));
  if (!info) { battleMusic(B); return; }
  ov(`<div class="lgi" id="lgi" style="--cc:${tr.cc}"><div class="lgi-s"><canvas class="lgi-cv" id="lgicv" width="512" height="384"></canvas></div><i class="lgi-wait"></i><button type="button" class="lgi-skip" id="lgiskip" hidden>Skip</button></div>`, 'battle vsov');
  const root = $('#lgi'), cv = $('#lgicv'), gone = () => BT.B !== B || !root.isConnected, o = { name: tr.n, cap: tr.title, lv: 0, cc: tr.cc };
  /* Dark Mewtwo: den første kamplåta starter med forvandlingen (filmen) og går rett videre inn i kampen. Finnes den ikke i pakken, er alt som før. */
  const V = tr.dk ? PACK.special(/Villain/) : '', tk = V || PACK.trackFor(B), ready = CINE.prep(id, 6000);
  if (V) PACK.cue(V);
  if (calm()) { await ready; if (gone()) return; root.classList.add('on'); await CINE.still(cv, id, Math.min(info.len - 0.6, info.R + 2), o); if (V) PACK.music(V, { loop: false, at: 0, fade: 1.2, from: 0.1 }).then(k => { if (k) music(''); }); else battleMusic(B, { fade: 1.2, from: 0.1 }); cry(f.id, 300, 0.5); await T(2600); if (gone()) return; root.classList.add('d'); await T(260); return; }
  /* Låta og filmen starter samtidig. Uten låt i pakken spilles den innebygde oppbyggingen, med drønnet i det den viser seg. */
  await ready; if (gone()) return;
  /* De aller sjeldneste varsles først: mørket puster, bildet slår sprekker, og så starter filmen. */
  if (info.omen) {
    await CINE.fxPrep('omen'); if (gone()) return; root.classList.add('on'); PACK.music(''); music(''); BSFX.dread();
    await CINE.fx(cv, 'omen', { cc: tr.cc, warn: tr.dk ? 'WARNING' : '', txt: tr.dk ? 'A power that could end\nthe galaxy is awakening' : tr.leg === 493 ? 'The one who shaped\nthe world draws near' : tr.leg === 150 ? 'It was made to be\nthe strongest of all' : 'Something from beyond\nthe sky draws near', cue: n => { if (gone()) return; if (n === 'beat') { BSFX.beat(); buzz([70, 90, 110]); } else if (n === 'boom') { BSFX.mv('boom', 3); buzz([90, 60, 240]); } } });
    if (gone()) return;
  }
  const started = tk ? await PACK.music(tk, V ? { at: 0, loop: false, out: 0.3 } : { at: info.at }) : false; if (gone()) return;
  let stop = () => {};
  if (started) music(''); else { PACK.music(''); stop = epicIntro('ultra', info.R); }
  root.classList.add('on'); sfx.appear(); buzz([40, 60, 40]);
  const cue = n => { if (gone()) return; if (n === 'cry') { cry(f.id, 0, 0.6); buzz([80, 40, 260]); if (!started) battleMusic(B); } else if (n === 'boom') buzz([90, 60, 90, 60, 240]); else if (n === 'thud') buzz(45); else buzz(18); };
  const pl = CINE.play(cv, id, Object.assign({ clock: () => started ? PACK.clock() : -1, cue, warp: V && started ? dkWarp : null }, o)), sk = $('#lgiskip');
  let skipped = false; const skip = () => { if (skipped) return; skipped = true; sfx.tap(); stop(); pl.skip(); };
  setTimeout(() => { if (!gone() && sk) sk.hidden = false; }, 1200); if (sk) sk.addEventListener('click', skip);
  const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip(); }; document.addEventListener('keydown', key);
  const watch = setInterval(() => { if (gone()) pl.stop(); }, 300);
  await pl.done; clearInterval(watch); document.removeEventListener('keydown', key);
  if (gone()) return stop();
  if (!started && !PACK.playing() && !MUSIC.playing()) battleMusic(B);
  root.classList.add('d'); await T(240);
}
/* Dagens event: dine egne som får noe ut av det (laget først, så de sterkeste i boksen). */
function evWho(e, n) {
  const l = S.mons.map(m => ({ m, b: evBoost(m, e), on: S.party.includes(m.u) })).filter(x => x.b.m > 1 || x.b.mega);
  return l.sort((a, b) => (b.on - a.on) || b.m.lv - a.m.lv).slice(0, n || 6);
}
const evTag = m => { const b = evBoost(m); return b.mega ? '<span class="pill mgp">Mega today</span>' : b.m > 1 ? `<span class="pill evp">+${Math.round((b.m - 1) * 100)} %${b.lv ? ' · Lv ' + b.lv : ''}</span>` : ''; };
const evMon = x => `<button type="button" class="evm${x.on ? ' on' : ''}" data-a="mon" data-u="${x.m.u}">${spr(x.m.id, { sh: x.m.sh, mega: x.b.mega || x.m.mega, s: '52px' })}<b>${esc(mName(x.m))}</b><span class="sm tn">${x.b.mega ? 'Mega' : '+' + Math.round((x.b.m - 1) * 100) + ' %'}${x.b.lv ? ' · Lv ' + x.b.lv : ''}</span><span class="sm">${x.on ? 'on the team' : 'in the box'}</span></button>`;
/* Dagens event som symbol over modusen: ett trykk viser hva det gjør. Nytt (ikke åpnet ennå) pulserer det. */
function evChip(e) {
  const I = evInfo(e);
  return `<button type="button" class="evchip${e.seen ? '' : ' new'}" data-a="evinfo" style="--ec:${I.c};--ec2:${I.c2 || I.c}" aria-label="Special event: ${esc(I.n)}. Tap to see what it does"><span class="evc-ic" aria-hidden="true">${I.ic}</span><span class="sp"><span class="evc-k">Special event · today only</span><b>${esc(I.n)}</b><span class="evc-s">${esc(I.s)}</span></span><span class="evc-go">${e.seen ? 'Details' : 'Tap to see'} ›</span></button>`;
}
/* Mega Surge: de du kan velge blant (alle du eier som har en Mega-form, laget først). Et trykk velger eller velger bort; høyst SURGEN. */
function surgePickEl(e) {
  const on = surgeList(e), l = surgeCan().slice(0, 12);
  return `<p class="sm evpk-h" style="position:relative;text-align:center"><b class="tn">${on.length} of ${SURGEN}</b> chosen · tap to choose who starts Mega Evolved</p>
    <div class="evms">${l.map(m => { const k = megaOpts(m.id), g = k.includes(m.ms) ? m.ms : k[0], sel = on.includes(m.u), team = S.party.includes(m.u);
      return `<button type="button" class="evm pk${sel ? ' on' : ''}" data-a="evpick" data-u="${m.u}" aria-pressed="${sel}">${spr(m.id, { sh: m.sh, mega: sel ? g : m.mega, s: '52px' })}<b>${esc(mName(m))}</b><span class="sm tn">${sel ? 'Mega today' : 'Lv ' + m.lv}</span><span class="sm">${team ? 'on the team' : 'in the box'}</span></button>`; }).join('')}</div>`;
}
/* Hva dagens event gjør, og hvem av dine som har glede av det. Åpnes fra symbolet over modusen og fra regelarket. */
function evSheet(e) {
  const I = evInfo(e), who = evWho(e, 6), stat = e.k === 'surge' || EVSTAT[e.k], pick = e.k === 'surge' && surgeCan().length > 0, rent = modeOn('factory') && MODESN < MODES.length && (e.k === 'surge' || e.k === 'type');
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Today only</span></div>
    <div class="evrev"><div class="evr-rays"></div><div class="evr-ic">${I.ic}</div><div class="evr-k">Special event ${hq('events', 'What are special events?')}</div><h1 class="evr-n">${esc(I.n)}</h1><p class="evr-s">${esc(I.s)}</p>
      <p class="evr-d">${esc(I.d)}</p>${rent ? '<p class="sm" style="position:relative;text-align:center">In the Battle Frontier it counts for the rental Pokémon you pick. Your own get it in raids.</p>' : ''}
      ${pick ? `<div id="evpk" style="position:relative;width:100%">${surgePickEl(e)}</div>` : stat ? (who.length ? `<div class="evms">${who.map(evMon).join('')}</div>` : '<p class="sm" style="position:relative;text-align:center">None of your own Pokémon qualify today. It costs you nothing: everything else is as usual.</p>') : ''}
      <p class="sm" style="text-align:center">Events are only ever for you, never for your opponents. Nothing gets harder, and nothing is lost if you sit it out.</p></div>
    <div class="acts">${stat && (who.some(x => !x.on) || (pick && surgeCan().some(m => !S.party.includes(m.u)))) || e.k === 'camp' ? `<button type="button" class="btn" data-a="tab" data-k="lag">${e.k === 'camp' ? 'Open your team to train' : 'Change your team'}</button>` : e.k === 'lucky' ? '<button type="button" class="btn" data-a="tab" data-k="butikk">Packs are in the Shop</button>' : ''}<button type="button" class="btn gold" data-a="home">Got it</button></div>`, 'tint evov', I.c);
}
/* Rundens kamper som streker: de du har slått, i fargen til klassen (L.seen = klasse + nummer), den som venter, og finalen med gullkant. */
function lapPips() {
  const L = S.lad, cls = (L.seen || []).map(s => ORDER.find(k => s.indexOf(k) === 0 && /^\d+$/.test(s.slice(k.length))) || 'trainer');
  return `<div class="lgp ten" role="img" aria-label="Battle ${L.n + 1} of ${LAPN} in this lap">${Array.from({ length: LAPN }, (_, n) => `<i class="${n < L.n ? 'on c' + clsI(cls[n] || 'trainer') : n === L.n ? 'cur' : ''}${n === LAPN - 1 ? ' ul' : ''}"></i>`).join('')}</div>`;
}
/* Hvem som venter, sies ikke: bare det reglene alltid lover (en trener først, en Champion eller noen større til slutt). */
const nextHint = () => { const n = S.lad.n; return n <= 0 ? 'A trainer to start with' : n >= LAPN - 1 ? 'The final: a Champion, or someone greater' : 'Who is next? You find out in the intro'; };
/* Det hver modus er, på valgskjermen og i teksten ellers. */
const MODEIC = { league: 'L', factory: 'F', pwt: 'W' };
const pipsEl = (n, used) => `<span class="pips" role="img" aria-label="${Math.max(0, n - used)} of ${n} attempts left today">${Array.from({ length: n }, (_, i) => `<i${i < n - used ? ' class="on"' : ''}></i>`).join('')}</span>`;
/* Valget av dagens modus. Åpnes av «Done for today», og fra kortet på forsiden hvis valget ble utsatt. Først velges et kort, så bekreftes det:
   valget gjelder hele kampdagen og kan ikke gjøres om. */
function modeSheet() {
  if (!S.lad.day || !modePicks()) { closeOv(); return render(); }
  const bo = dayBoost(), L1 = S.lad, R = S.fac.run, WR = pwtRun(), wc = WR ? CUPS[WR.wd] : cupNow(), W = pwt(), sel = MODES.includes(BT.msel) ? BT.msel : '';
  const C = {
    league: { s: `${leagueTag()} · ${L1.n >= LAPN - 1 ? 'the final' : L1.n <= 0 ? 'a new lap' : 'the class rises'}`, d: 'Your own team of six. Every win gives the whole team XP, and bosses give Rare Candy and items.', a: ladLives() > 1 ? 'You can lose once and try again' : 'One loss ends the lap', n: ladLives(), u: ladFails() },
    factory: { s: R ? `Round ${R.round} · ${R.w}/${FACN} wins · streak ${R.streak}` : `Rental Pokémon at Lv ${FACLV}${S.fac.best ? ' · best streak ' + S.fac.best : ''}`, d: 'Rental Pokémon, so your own team does not fight. You win coins, items and encounters, and your own team gets XP for every win.', a: `${FACLIVES} runs · a loss ends a run`, n: FACLIVES, u: facFails() },
    pwt: { s: `Today: ${wc.n}`, d: `A knockout cup, three rounds, three on three, and a new cup each weekday. Your three play at Lv ${WR ? WR.lv : pwtLv()}. Coins and XP for every round, and the winner takes a trophy and ${aN(PACKS[wc.pk].n)}.`, a: 'One cup · a loss ends it', n: 1, u: W.day === S.lad.day && !WR ? 1 : 0 }
  };
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Not now</button><span class="pill tn">Choose 1 of ${MODES.length}</span></div>
    <div><h1 class="big" style="font-size:30px">Today's mode ${hq('modes', 'What are the modes?')}</h1><p class="sm" style="margin-top:6px">Pick one way to battle today. The other two stay closed until your next battle day.</p></div>
    <div class="mdl">${MODES.map(k => `<button type="button" class="mdc${sel === k ? ' on' : ''}${bo.mode === k ? ' bo' : ''}" data-a="msel" data-k="${k}" aria-pressed="${sel === k}">
      <span class="mdc-top"><span class="ficon">${MODEIC[k]}</span><span class="sp"><b>${MODEN[k]}</b><span class="sm tn">${esc(C[k].s)}</span></span>${pipsEl(C[k].n, C[k].u)}</span>
      <span class="sm mdc-d">${esc(C[k].d)}</span>
      <span class="mdc-f"><span class="pill tn">Coins ×${smFor(k)}</span>${bo.mode === k ? `<span class="bonus">Bonus today · coins ×${DAYCOIN}</span>` : ''}<span class="sm">${esc(C[k].a)}</span></span></button>`).join('')}</div>
    <p class="sm" style="text-align:center">Coins ×${studyMult()} comes from your ${hrs(ladMin())} h of focus. A special event may show itself once you have chosen.</p>
    <div class="acts"><button type="button" class="btn gold" id="mgo" data-a="mgo"${sel ? '' : ' disabled'}>${sel ? `Play the ${MODEN[sel]} today` : 'Tap a mode to choose it'}</button></div>`, 'tint modeov', 'var(--gold)');
}
/* Hva kampdagen heter når den ikke er i dag. */
const dayWord = d => { if (!d || d === dayKey()) return 'today'; if (d === dayKey(addDays(new Date(), -1))) return 'yesterday'; const q = d.split('-').map(Number); return 'on ' + new Date(q[0], q[1] - 1, q[2]).toLocaleDateString('en-US', { weekday: 'long' }); };
/* Simuler og «Not today»: står under knappen i modusen som er valgt. */
const simRow = () => `<div class="row simrow"><button type="button" class="btn sp nf" data-a="sim"${simCan() ? '' : ' disabled'}>${S.lad.simno === S.lad.day ? 'Simulation undone' : `Simulate · ${Math.round(SIMPAY * 100)} %`}</button><button type="button" class="btn sp nf" data-a="skipday">Not today</button></div>`;
/* Resultatet av en simulering som venter på svar: godta eller angre. Hvem du møtte, står ikke her. */
function simCard() {
  const Q = simPending(); if (!Q) return '';
  const xp = Q.xp.reduce((n, x) => n + x[1], 0);
  return `<div class="card stack simc"><div class="row" style="justify-content:space-between"><b>Simulated · ${MODEN[Q.k]}</b><span class="pill tn">Waiting for you</span></div>
    <p class="sm">The game played ${Q.played} ${Q.played === 1 ? 'battle' : 'battles'} with your team and won ${Q.won}.</p>
    <div class="gain"><div><b class="tn">+${nb(Q.coins)}</b><span class="sm">coins</span></div><div><b class="tn">+${nb(xp)}</b><span class="sm">XP for the team</span></div></div>
    <p class="sm tn">${Math.round(SIMPAY * 100)} % of what the battles paid. No Rare Candy, items, encounters, medals or lap win.</p>
    <div class="row"><button type="button" class="btn sp gold" data-a="simok">Accept</button><button type="button" class="btn sp" data-a="simundo">Undo</button></div>
    <p class="sm tn">Undo, and nothing happened: the battles are yours to fight, but you cannot simulate again ${dayWord(Q.day)}.</p></div>`;
}
function ladderCard() {
  const L = S.lad, bo = dayBoost(), R = S.fac.run;
  const prog = lapPips(), row = `<div class="lrow myst"><span class="tsb qmb" aria-hidden="true"><i>?</i></span><div class="sp"><div class="sm tn">${esc(leagueTag())}</div><b>${nextHint()}</b></div></div>`;
  const fac = `<div class="modec"><span class="ficon">F</span><div class="sp"><b>Battle Frontier</b><div class="sm tn">${R ? `Round ${R.round} · ${R.w}/${FACN} wins · streak ${R.streak}` : `Rent 4 of 7 random Pokémon · everything is Lv ${FACLV}${S.fac.best ? ' · best streak ' + S.fac.best : ''}`}</div></div></div>`;
  const tag = m => bo.mode === m ? `<span class="bonus">Bonus · coins ×${DAYCOIN}</span>` : '';
  /* Sandbox og regelarket ligger i Profile, ikke på forsiden. */
  const lab = '', rules = '';
  /* World Tournament: dagens cup. */
  const W = pwt(), WR = pwtRun(), wc = WR ? CUPS[WR.wd] : cupNow();
  const charm = S.charm > 0 ? `<p class="sm" style="color:var(--gold)">Shiny Charm: ${CHARM.m}× shiny odds for your next ${S.charm} focus session${S.charm > 1 ? 's' : ''}.</p>` : '';
  const one = MODESN < MODES.length;
  /* Ingen kampdag er åpen – eller den som står åpen, er fra en tidligere dag og ferdig: da er forsiden tilbake til vanlig, og kampene åpnes med «Done for today». */
  if (!L.day || (dayOld() && dayDone())) return `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Battles</b><span class="pill tn">Lap ${L.lap + 1}</span></div>${row}${prog}
    <p class="sm">League, Battle Frontier or World Tournament: ${one ? 'you choose when the battles open' : 'all three are yours once the battles open'}.</p>
    ${openNeed() > 0 ? `<p class="sm tn" style="color:var(--gold)">${openNeed()} more ${openNeed() === 1 ? 'minute' : 'minutes'} of focus today opens them.</p>` : ''}<button type="button" class="btn wide" data-a="bdone"${openNeed() > 0 ? ' disabled' : ''}>Open the battles</button></div>${charm}`;
  /* Kamper fra en tidligere dag kan tas helt til en ny økt starter. Da gjelder den dagens fokus og den dagens bonus, og det skal være tydelig. */
  const old = dayOld(), when = dayWord(L.day), oldc = old ? `<div class="card stack oldday"><div class="row" style="justify-content:space-between"><b>Battles from ${when.replace(/^on /, '')}</b><span class="pill tn">${dayDone() ? 'Done' : 'Not played yet'}</span></div><p class="sm">These are the battles you opened ${when}. They pay by that day's focus (coins ×${studyMult()} from ${hrs(ladMin())} h) and that day's bonus mode. They close when you start a focus session.</p></div>` : '';
  /* Kampene er åpnet, men dagens modus er ikke valgt ennå (valget ble utsatt). */
  if (modePicks() > 0 && !dayShut()) return `${oldc}<div class="card stack modeask"><div class="row" style="justify-content:space-between"><b>Battles are open</b><span class="pill tn">Choose 1 of ${MODES.length}</span></div>
    <p class="sm">Pick the mode you want to play today: the Trainer League, the Battle Frontier or the World Tournament. The other two stay closed until your next battle day.</p>
    <button type="button" class="go" data-a="mopen">Choose ${old ? 'the' : "today's"} mode</button><button type="button" class="btn wide nf" data-a="skipday">Not today · no battles</button></div>${charm}${lab}${rules}`;
  /* Kampdagen er stengt uten at en modus er valgt («Not today» før valget). */
  if (modePicks() > 0) return `${oldc}<div class="card stack"><div class="row" style="justify-content:space-between"><b>Battles</b><span class="pill tn">Closed</span></div><p class="sm">No battles ${when}. They open again after your next day of focus.</p></div>${charm}${lab}${rules}`;
  const on = MODES.filter(modeOn), E = evNow(), k1 = on.length === 1 ? on[0] : '', sm = k1 ? smFor(k1) : evSm();
  const mult = `<p class="sm tn">Coins ×${sm} ${k1 ? `in the ${MODEN[k1]}` : ''}: ×${studyMult()} from ${hrs(ladMin())} h of focus${L.day !== dayKey() ? ' that day' : ' today'}${k1 && bo.mode === k1 ? `, ×${DAYCOIN} for ${old ? "that day's" : "today's"} bonus mode` : ''}${evIs('gold') ? `, ×${EVCOIN} for the Gold Rush` : ''}. Your goal of ${hrs(goalMin())} h gives ×${goalTop().toFixed(1)} from focus.${firstWin() && modeOn('league') && !dayShut() ? ` Your first League win ${old ? 'of that day' : 'today'} pays double coins.` : ''}</p><p class="sm tn">Difficulty: ${diff().n} · coins ×${diff().coin}, XP ×${diff().xp}. Change it under Profile.</p>`;
  /* Stengt («Not today» eller simulert), eller en simulering som venter: da står det i stedet for kampknappen. */
  const shut = dayShut() ? `<p class="sm">${L.simd === L.day ? 'The game played these battles for you' : 'No battles'} ${when}. They open again after your next day of focus.</p>` : simPending() ? '<p class="sm">A simulated result is waiting above. Accept it or undo it first.</p>' : '';
  const keepb = S.fac.keep && S.fac.keep.length ? '<button type="button" class="btn wide gold" data-a="fkeeps">Your round reward · keep one of your rentals</button>' : '';
  const cards = {
    league: `<div class="card stack" id="mode-league"><div class="row" style="justify-content:space-between"><b>Trainer League</b><span class="row" style="gap:8px">${tag('league')}${pipsEl(ladLives(), ladFails())}</span></div>${row}${prog}
      ${shut || (ladLost() ? `<p class="sm">The lap ended at battle ${(L.fell || 0) + 1} of ${LAPN}. A new lap starts from battle 1 on your next battle day. Your team keeps the XP it earned.</p>` : ladDone() ? '<p class="sm">You cleared the lap today. The next one opens on your next battle day, with stronger trainers and better rewards.</p>' : `<p class="sm">${bo.mode === 'league' ? '+30% XP and better odds for Rare Candy today. ' : ''}${LAPN} battles a lap, and the class rises as you go: a trainer first, a Champion at the end. XP for the whole team after each battle. ${ladLives() - ladFails() > 1 ? 'You can lose once and try again against the same trainer.' : 'One loss ends the lap, and the next one starts from battle 1.'}</p><button type="button" class="go${L.n >= LAPN - 1 ? ' gold' : ''}" data-a="bpre">${S.lad.next && S.lad.next.fail ? 'Rematch' : 'Battle'}</button>${simRow()}`)}</div>`,
    factory: `<div class="card stack" id="mode-factory"><div class="row" style="justify-content:space-between"><b>Battle Frontier</b><span class="row" style="gap:8px">${tag('factory')}${pipsEl(facLives(), facFails())}</span></div>${fac}
      ${keepb}${shut || (facLost() ? '<p class="sm">Your runs for today are used. The Frontier opens again after your next day of focus.</p>' : `<p class="sm">${bo.mode === 'factory' ? '1.5× luck on items, encounters and rare bosses today. ' : ''}${FACN - 1} trainers, then a boss. No Bag here. You win coins, items and encounters, and your own team gets XP for every win. A loss ends the run, and you have ${facLives() - facFails() === 1 ? 'one run left today' : (facLives() - facFails()) + ' runs left today'}.</p><button type="button" class="btn wide gold" data-a="fenter">${R ? 'Continue the run' : 'Enter the Frontier'}</button>${simRow()}`)}</div>`,
    pwt: `<div class="card stack" id="mode-pwt"><div class="row" style="justify-content:space-between"><b>World Tournament</b><span class="row" style="gap:8px">${tag('pwt')}${pipsEl(1, pwtOpen() ? 0 : 1)}</span></div>
      <div class="modec"><span class="ficon">W</span><div class="sp"><b>${esc(wc.n)}</b><div class="sm tn">${WR ? `${ROUNDN[WR.r]} · round ${WR.r + 1} of ${PWTN}` : 'Three rounds · three on three'} · Lv ${WR ? WR.lv : pwtLv()}${W.won ? ` · ${W.won} ${W.won === 1 ? 'trophy' : 'trophies'}` : ''}</div></div></div>
      ${shut || (pwtOpen() ? `<p class="sm">A knockout cup that changes with the day of the week. You see the opponent's team before you pick your three. No Bag. Every round pays coins and XP for your own team, and the winner takes a trophy and ${aN(PACKS[wc.pk].n)}.</p><button type="button" class="btn wide gold" data-a="wenter">${WR ? 'Continue the cup' : 'Enter the cup'}</button>${simRow()}` : '<p class="sm">You have played today\'s cup. A new one opens after your next day of focus.</p>')}</div>`
  };
  const off = MODES.filter(k => !modeOn(k)).map(k => 'the ' + MODEN[k]);
  const note = one && k1 ? `<p class="sm tn">Today's mode is the ${MODEN[k1]}. ${off.join(' and ').replace(/^t/, 'T')} open again on your next battle day.</p>` : '';
  return `${oldc}${simCard()}${E ? evChip(E) : ''}${on.map(k => cards[k]).join('')}${note}${mult}${charm}${lab}${rules}`;
}
/* Oppstilling før en ligakamp: hvem du møter, hva de gir, og hvem av dine som går ut først. */
function preBattle() {
  /* Motstanderen trekkes nå (og står fast), men vises ikke: den kommer fram i introen. */
  const t = nextTrainer(), L = S.lad, team = S.party.map(monBy).filter(Boolean), lv = Math.round(leagueLv());
  if (!S.party.includes(BT.lead)) BT.lead = S.party[0];
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">${esc(leagueTag())}</span></div>
    <div class="card mystc"><div class="pre-foe"><span class="tsb qmb big" aria-hidden="true"><i>?</i></span><div class="sp"><div class="sm">${L.n <= 0 ? 'Class 1 of 9 · the lap starts here' : L.n >= LAPN - 1 ? 'The final of the lap' : 'The class rises as you go'}</div><b style="font-size:19px">${nextHint()}</b>
      <div class="sm tn" style="margin-top:4px">Around your team's level (Lv ${lv})</div><div class="sm tn" style="margin-top:4px;color:var(--gold)">Higher class, more coins${firstWin() ? ' · first win today pays double' : ''} · ${diff().n}</div></div></div>${lapPips()}</div>
    <div><div class="lab">Your team · tap the one that leads</div><div class="lineup">${team.map(m => `<button type="button" data-a="blead" data-u="${m.u}" class="${m.u === BT.lead ? 'lead' : ''}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega })}<span class="sp"><b>${esc(mName(m))}</b><br><span class="sm tn">Lv ${m.lv} · ${m.mv.map(x => esc(MOVES[x][0])).join(', ')}</span> ${evTag(m)}</span>${hasNews(m) ? '<span class="bang">!</span>' : ''}${m.u === BT.lead ? '<span class="pill">Leads</span>' : ''}</button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="bgo">Start battle</button><button type="button" class="btn nf" data-a="bteam">Edit team</button></div>`, 'tint', 'var(--sage)');
}
/* ---------- Kampskjermen ---------- */
const hpCol = f => f > 0.5 ? '#48d868' : f > 0.2 ? '#f8c830' : '#f05038';
const STAG = { par: 'PAR', slp: 'SLP', frz: 'FRZ', brn: 'BRN', psn: 'PSN' };
/* Den taggete flaten bak FIGHT: en avrundet firkant med tenner hele veien rundt. */
const BURST = (() => { const pts = [], N = 40, pw = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e); for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * 6.2832, r = i % 2 ? 0.86 : 1; pts.push((200 + pw(Math.cos(a), 0.6) * 196 * (i % 2 ? 0.93 : 1)).toFixed(1) + ',' + (55 + pw(Math.sin(a), 0.6) * 52 * r).toFixed(1)); }
  return `<svg viewBox="0 0 400 110" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="bfg"><stop offset="0" stop-color="#ff9a52"/><stop offset=".65" stop-color="#ea3c2e"/><stop offset="1" stop-color="#b81f1a"/></radialGradient></defs><polygon points="${pts.join(' ')}" fill="url(#bfg)" stroke="#2a0c0a" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`; })();
const teamOf = side => side === 'me' ? BT.B.me : BT.B.foe;
function boxEl(side) {
  const B = BT.B, v = BT.v[side], team = teamOf(side), b = team[v.i], f = v.hp / b.max;
  const xa = xpAt(b.lv), xb = xpAt(b.lv + 1), xf = b.src.xp != null ? Math.max(0, Math.min(1, (b.src.xp - xa) / (xb - xa))) : 0;
  return `<div class="hpn"><b>${esc(b.short || b.name)}${gs(b)}</b>${v.st ? `<i class="st-${v.st}">${STAG[v.st]}</i>` : ''}<span class="blv tn"><small>Lv</small>${b.lv}</span></div>
    <div class="hpr"><em>HP</em><div class="hpbar"><b></b><i style="width:${(f * 100).toFixed(1)}%;background:${hpCol(f)}"></i></div></div>
    <div class="hpf"><span class="dots">${team.map((x, i) => `<i class="${x.out && !(i === v.i && v.hp > 0) ? 'out' : ''}"></i>`).join('')}</span>${side === 'me' ? `<span class="hpnum tn">${v.hp}/${b.max}</span>` : ''}</div>
    ${side === 'me' && B.mode === 'league' ? `<div class="xpr"><em>EXP</em><div class="xpbar"><i style="width:${Math.round(xf * 100)}%"></i></div></div>` : ''}`;
}
/* Med ressurspakken tegnes HP-boksene piksel for piksel fra arket, slik de ser ut i Black 2 og White 2: navn, nivå, HP-linje, tall og EXP.
   Uten pakke brukes de innebygde boksene over. Toppbossene i ligaen (klasse 7 til 9) får en glinsende gullramme rundt boksen sin. */
const HUDM = 3;
/* Ramme rundt motstanderens boks: gull bare for klasse 9, mørkerød som pulserer for de onde lederne, og mesterens egen farge for klasse 8. */
const hudRing = side => { const B = BT.B, tr = B.tr; return side !== 'foe' || B.mode === 'fac' ? '' : tr.gold ? 'gold' : tr.th === 'evil' ? 'evil' : tr.kind === 'champ' || tr.kind === 'legend' ? 'champ' : ''; };
let goldRing = null;
/* Omrisset av motstanderens boks, to piksler bredt: boksen stemplet rundt seg selv, med selve boksen skåret ut. */
function ringFor(H) {
  if (goldRing && goldRing.im === H.im) return goldRing.cv;
  const r = H.r.foe, c = document.createElement('canvas'), x = c.getContext('2d'); c.width = r[2] + 2 * HUDM; c.height = r[3] + 2 * HUDM;
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.abs(dx) + Math.abs(dy) <= 3) x.drawImage(H.im, r[0], r[1], r[2], r[3], HUDM + dx, HUDM + dy, r[2], r[3]);
  x.globalCompositeOperation = 'destination-out'; x.drawImage(H.im, r[0], r[1], r[2], r[3], HUDM, HUDM, r[2], r[3]);
  goldRing = { im: H.im, cv: c }; return c;
}
function hudDraw(side) {
  const H = PACK.hud, cv = document.querySelector('#b-' + side + ' canvas'); if (!H || !cv) return false;
  const B = BT.B, v = BT.v[side], team = teamOf(side), b = team[v.i], me = side === 'me', g = cv.getContext('2d'), R = H.r, M = HUDM, py = 9 + M, hp = v.sh != null ? v.sh : v.hp, bw = me ? 113 : 104, bh = me ? 18 : 12;
  const put = (n, x, y) => { const r = R[n]; if (!r) return 0; g.drawImage(H.im, r[0], r[1], r[2], r[3], x + M, y, r[2], r[3]); return r[4] || r[2]; };
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
  const rk = hudRing(side);
  if (rk) {
    const ring = ringFor(H), T = performance.now() / 1000, t = BT.tmp || (BT.tmp = document.createElement('canvas')), tx = t.getContext('2d');
    t.width = ring.width; t.height = ring.height; tx.drawImage(ring, 0, 0); tx.globalCompositeOperation = 'source-in';
    const gr = tx.createLinearGradient(0, 0, 0, t.height);
    if (rk === 'gold') { gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.45, '#f8c830'); gr.addColorStop(1, '#b8780c'); }
    else if (rk === 'evil') { const ph = (T % 1.15) / 1.15, k = Math.max(Math.exp(-Math.pow(ph - 0.06, 2) / 0.0016), 0.7 * Math.exp(-Math.pow(ph - 0.26, 2) / 0.003)), c = Math.round(110 + 145 * k); gr.addColorStop(0, `rgb(${c},${Math.round(20 * k)},${Math.round(24 * k)})`); gr.addColorStop(1, '#3a0508'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, B.tr.cc || '#b295e6'); gr.addColorStop(1, B.tr.cc || '#b295e6'); }
    tx.fillStyle = gr; tx.fillRect(0, 0, t.width, t.height);
    if (rk === 'gold') {
      /* Glansen som sveiper over ramma, og små stjerner som blinker langs kanten. */
      tx.globalCompositeOperation = 'source-atop'; const sx = ((T * 80) % (t.width + 70)) - 30, g2 = tx.createLinearGradient(sx - 12, 0, sx + 12, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, 'rgba(255,255,255,.95)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); tx.fillStyle = g2; tx.fillRect(sx - 12, 0, 24, t.height);
    }
    g.drawImage(t, 0, py - M);
    if (rk === 'gold') for (let i = 0; i < 4; i++) { const q = T * 1.5 + i * 0.25, ph = q % 1, k = Math.floor(q) * 7 + i * 13, x = M + 4 + (k * 37) % (bw - 12), y = (k % 2) ? py - 2 : py + bh + 1; g.globalAlpha = Math.sin(ph * Math.PI); g.fillStyle = '#fff'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    g.globalAlpha = 1;
  }
  put(side, 0, py);
  /* HP-linja: tom stripe, og den fylte delen i grønt, gult eller rødt. */
  const bx = (me ? 50 : 38) + M, f = Math.max(0, Math.min(1, hp / b.max)), wf = hp > 0 ? Math.max(1, v.sh != null ? 48 * f : Math.round(48 * f)) : 0, w = Math.floor(wf);
  let r = R.hp_empty; g.drawImage(H.im, r[0] + 1, r[1] + 1, 48, 3, bx, py + 2, 48, 3);
  /* Den lyse resten av det som nettopp ble slått bort, og så selve linja. Mens den glir, tegnes den siste pikselen delvis, så bevegelsen blir jevn. */
  if (v.gh != null && v.gh > hp) { const gw = Math.min(48, Math.ceil(48 * v.gh / b.max)); if (gw > w) { g.globalAlpha = 0.92; g.fillStyle = '#fff'; g.fillRect(bx + w, py + 2, gw - w, 3); g.globalAlpha = 1; } }
  r = R[f > 0.5 ? 'hp_green' : f > 0.2 ? 'hp_yellow' : 'hp_red']; if (w) g.drawImage(H.im, r[0] + 1, r[1] + 1, w, 3, bx, py + 2, w, 3);
  if (wf - w > 0.03 && w < 48) { g.globalAlpha = wf - w; g.drawImage(H.im, r[0] + 1 + Math.min(w, 46), r[1] + 1, 1, 3, bx + w, py + 2, 1, 3); g.globalAlpha = 1; }
  /* Navnet med spillets bokstaver. Er det for langt, står bokstavene én piksel tettere. */
  const gl = [...(b.short || b.name)].map(ch => ch === ' ' ? 4 : R['n' + ch] ? 'n' + ch : 2), wid = gl.reduce((a, q) => a + (q > 0 ? q : R[q][4]), 0), tight = wid > 62 ? 1 : 0;
  let x = me ? 10 : 14; for (const q of gl) x += q > 0 ? q : put(q, x, py - 9) - tight;
  /* Kjønnssymbolet rett etter navnet, som i spillene (Nidoran har det alt i navnet). */
  if (b.g < 2 && !((b.id === 29 || b.id === 32) && !b.src.nn)) put(b.g ? 'female' : 'male', Math.min(x + 1, (me ? 74 : 78) - 8), py - 10);
  put('lv', me ? 74 : 78, py - 7); x = me ? 82 : 86; for (const ch of String(b.lv)) x += put('l' + ch, x, py - 9);
  if (v.st && R['st_' + v.st]) put('st_' + v.st, me ? 15 : 4, py + 3);
  if (me) {
    const s = String(Math.max(0, Math.round(hp))); x = 74 - 8 * s.length; for (const ch of s) { put('h' + ch, x, py + 5); x += 8; }
    x = 82; for (const ch of String(b.max)) { put('h' + ch, x, py + 5); x += 8; }
    r = R.xp_empty; g.drawImage(H.im, r[0], r[1], r[2], r[3], 25 + M, py + 14, r[2], r[3]);
    const xa = xpAt(b.lv), xb = xpAt(b.lv + 1), xw = b.src.u && b.src.xp != null && B.mode === 'league' ? Math.round(80 * Math.max(0, Math.min(1, (b.src.xp - xa) / (xb - xa)))) : 0;
    r = R.xp; if (xw) g.drawImage(H.im, r[0], r[1], 1 + xw, 4, 25 + M, py + 14, 1 + xw, 4);
  }
  /* Små kuler under boksen viser hvor mange som er igjen på laget. */
  const n = team.length, y0 = py + bh + (me ? 2 : 3); let x0 = me ? M + bw - 8 - n * 5 : M + 8;
  team.forEach((q, i) => { const out = q.out && !(i === v.i && hp > 0); g.fillStyle = '#101014'; g.fillRect(x0, y0, 4, 4); g.fillStyle = out ? '#5a5a66' : '#f05a4e'; g.fillRect(x0 + 1, y0 + 1, 2, 1); g.fillStyle = out ? '#3c3c46' : '#fff'; g.fillRect(x0 + 1, y0 + 2, 2, 1); x0 += 5; });
  return true;
}
/* Hvor godt et angrep virker mot den som står ute hos motstanderen, etter typene (som i de nyere spillene). Vanlig effekt gir ingen merkelapp.
   Angrep med fast skade og statusangrep merkes bare når typen gjør dem virkningsløse. Kan slås av i innstillingene. */
function fxTag(B, m) {
  const foe = B.foe[B.b]; if (S.hfx === 0 || !foe || foe.hp <= 0 || !m || m[4] == null) return '';
  const e = typeEff(m[1], foe), tag = (c, t) => `<span class="mfx ${c}">${t}</span>`;
  if (m[4] === 0) return m[0] === 'Thunder Wave' && e === 0 ? tag('n', 'No effect') : '';
  if (e === 0) return tag('n', 'No effect');
  if ((typeof FIXED !== 'undefined' && FIXED[m[0]]) || m[6] === 9) return '';
  return e > 1 ? tag('s', 'Super effective') : e < 1 ? tag('w', 'Not very effective') : '';
}
/* Typene til den som står ute, som små merker ved HP-boksen (kan slås av i innstillingene). */
const tyBadge = b => S.hty === 0 || !b ? '' : b.ty.filter((t, i) => t >= 0 && b.ty.indexOf(t) === i).map(t => `<span style="background:var(--t${t})">${TYN[t]}</span>`).join('');
function paintBox(side) {
  const el = $('#b-' + side); if (!el) return;
  const rk = hudRing(side), gold = rk ? ' ' + rk : '';
  if (PACK.hud) {
    if (!el.firstElementChild || el.firstElementChild.tagName !== 'CANVAS') { el.className = 'hpb pk ' + side + gold; el.innerHTML = `<canvas width="${(side === 'me' ? 113 : 104) + 2 * HUDM}" height="${(side === 'me' ? 33 : 28) + 2 * HUDM}"></canvas>`; }
    hudDraw(side);
  } else { el.className = 'hpb ' + side + gold; el.innerHTML = boxEl(side); }
  const cur = teamOf(side)[BT.v[side].i], th = tyBadge(cur) + (isMega(cur) ? `<span class="mgt">${megaOf(cur)[1] === 'Primal' ? 'Primal' : 'Mega'}</span>` : '') + (cur.evb && cur.evb !== 'surge' ? '<span class="evt">Event</span>' : '');
  /* Dine egne merker står på den nederste skjermen (drawMenu setter dem inn, og de oppdateres her når en ny kommer ut). Motstanderens står oppå boksen dens. */
  if (side === 'me') { BT.tyme = th; const o0 = el.querySelector('.tyb'); if (o0) o0.remove(); const m = $('#bty-me'); if (m && m.dataset.h !== th) { m.dataset.h = th; m.innerHTML = th; } }
  else { let tb = el.querySelector('.tyb'); if (!tb) { tb = document.createElement('div'); tb.className = 'tyb'; el.appendChild(tb); } if (tb.dataset.h !== th) { tb.dataset.h = th; tb.innerHTML = th; } }
  el.hidden = false;
}
/* Størrelsen i kamp følger høyden i Pokédexen: de små litt mindre, de store tydelig større (Joltik 0,84 · 1 m = 1 · Charizard 1,1 · Lugia 1,3 · Wailord 1,42).
   Din egen står nærmest kameraet og er større enn motstanderen. De legendariske i raid får litt ekstra. */
const hK = h => Math.max(0.84, Math.min(1.42, 1 + (h < 1 ? 0.1 : 0.13) * Math.log2(h)));
/* Din egen står nærmest kameraet og tegnes rundt dobbelt så stor som motstanderen, som i Black og White (høyden teller mindre der, ellers fyller de største hele skjermen). */
const sprK = (side, b) => { const k = hK(htOf(b.id, b.mega)); return side === 'me' ? Math.min(2.3, 1.9 * Math.pow(k, 0.6)) : k; };
/* Din Pokémon står midt på plattformen sin, som ligger nederst i bildet bak tekstboksen. Er den så liten at den ville forsvunnet bak boksen,
   flyttes den så langt bakover på plattformen at godt over halve kroppen vises (--ly = hvor mye). Regnes ut når bildet er lastet,
   sammen med taket på størrelsen (--k) for begge sider. */
function seat(side) {
  const el = $('#s-' + side), ar = $('#arena'), img = el && el.querySelector('img.spr'); if (!el || !ar || !img) return;
  const set = () => {
    if (!img.naturalHeight || !img.isConnected) return;
    const me = side === 'me', cz = parseFloat(ar.style.getPropertyValue('--cz')) || 1.1, k0 = parseFloat(el.dataset.k) || (me ? 1.9 : 1);
    /* De aller største holdes innenfor skjermen: bredden og høyden har et tak. Motstanderen står nær høyre kant og øverst i bildet,
       så taket hennes regnes fra der føttene faktisk står: hun skal aldri kuttes av kanten eller toppen. */
    const u = ar.clientWidth / 256, fx = u ? el.offsetLeft / u : 190, fy = u ? el.offsetTop / u : 95;
    const mw = me ? 165 : Math.max(60, Math.min(150, 2 * (256 - fx) - 6)), mh = me ? 140 : Math.max(50, Math.min(106, fy - 5));
    const k = Math.min(k0, mw / (img.naturalWidth * 0.8 * cz), mh / (img.naturalHeight * 0.8 * cz));
    el.style.setProperty('--k', k.toFixed(3));
    if (!me) return;
    const H = img.naturalHeight * 0.8 * k * cz, feet = (0.8 + 0.17 * cz) * 192, want = Math.max(152, 144 + 0.42 * H);
    el.style.setProperty('--ly', (Math.max(0, feet - want) / 192 * 100).toFixed(2) + '%');
  };
  if (img.complete && img.naturalHeight) set(); else img.addEventListener('load', set, { once: true });
}
/* Venter til bildet av den som skal ut, er lastet (høyst ms), så den ikke dukker opp et øyeblikk etter at ballen har åpnet seg. */
const sprReady = (side, ms) => new Promise(res => { const im = document.querySelector('#s-' + side + ' img.spr'); if (!im || (im.complete && im.naturalWidth)) return res(); let done = false; const fin = () => { if (!done) { done = true; res(); } }; im.addEventListener('load', fin, { once: true }); setTimeout(fin, ms); });
/* Der en Pokémon står (til effektene rundt den), i spillskjermens 256 × 192. dy = hvor langt over føttene. */
const anc = (side, dy) => { const sp = $('#s-' + side), ar = $('#arena'); if (!sp || !ar || !ar.clientWidth) return side === 'foe' ? { x: 189, y: 72 } : { x: 80, y: 124 }; const u = ar.clientWidth / 256; return { x: sp.offsetLeft / u, y: Math.min(152, sp.offsetTop / u) - (dy == null ? 28 : dy) }; };
/* Kameraet står til vanlig litt nærmere enn selve banebildet (--cz 1,10). Når en stor Pokémon står ute, trekker det seg ut (ned mot 1,0),
   så den får plass og ruver over plattformen sin. Plattformene og begge Pokémonene følger med (se .cam og .bs i stilarket). */
function camFit() {
  const ar = $('#arena'); if (!BT.B || !ar) return;
  const h = Math.max(...['me', 'foe'].map(s => { const v = BT.v[s], b = v && teamOf(s)[v.i]; return b && v.hp > 0 ? htOf(b.id, b.mega) : 0; }));
  ar.style.setProperty('--cz', (h <= 1.6 ? 1.1 : h >= 4 ? 1 : 1.1 - 0.1 * (h - 1.6) / 2.4).toFixed(3));
  seat('me'); seat('foe');
}
function paintSprite(side, cls) {
  const b = teamOf(side)[BT.v[side].i], el = $('#s-' + side);
  if (el) { el.className = 'bs ' + side + ' ' + (cls || ''); el.dataset.k = sprK(side, b).toFixed(3); el.style.setProperty('--k', el.dataset.k); el.innerHTML = spr(b.id, { ani: 1, sh: b.sh, back: side === 'me', mega: b.mega, it: b.src && b.src.item }); if (side === 'foe' && BT.B && BT.B.rage) el.classList.add('rage'); if (side === 'foe' && BT.B && BT.B.sin) { el.classList.add('sin'); dkEyes(el); } camFit(); }
}
/* Mega Evolution på skjermen: lyset samler seg om Pokémonen mens den blir hvit, og når det slipper, står den nye formen der. Bildet, navnet og
   typene byttes i det lyset er på sitt sterkeste. */
async function megaShow(B, side, e) {
  let sp = $('#s-' + side); if (!sp) return;
  await say(e.txt, 500);
  if (BT.B !== B || !sp.isConnected) return;
  const img = sp.querySelector('img,canvas'), h = Math.max(56, Math.min(230, img ? img.getBoundingClientRect().height : 90));
  const ring = cls => { const fx = document.createElement('i'); fx.className = 'megafx ' + cls + (e.primal ? ' primal' : ''); fx.style.setProperty('--h', h.toFixed(0) + 'px'); sp.appendChild(fx); return fx; };
  ring('gather'); BSFX.mega(); buzz([30, 50, 30, 50, 30, 50, 220]); sp.classList.add('megaev');
  await bwait(1150); if (BT.B !== B || !sp.isConnected) return;
  const keepCls = [...sp.classList].filter(c => !['bs', side, 'megaev', 'in', 'gone'].includes(c)).join(' ');
  if (!calm()) { const fxl = $('#fx'); if (fxl) { const d = document.createElement('i'); d.className = 'flashov'; d.style.background = '#fff'; d.style.animationDuration = '520ms'; fxl.append(d); setTimeout(() => d.remove(), 580); } }
  shake(520, 4); paintSprite(side, keepCls + ' megain'); paintBox(side);
  sp = $('#s-' + side); if (sp) { const fx = ring('burst'); setTimeout(() => fx.remove(), 800); }
  const b = teamOf(side)[BT.v[side].i]; if (b) cry(b.id, 0.12, 0.5);
  await bwait(850);
  sp = $('#s-' + side); if (sp) sp.classList.remove('megain');
}
/* HP-linja glir mot det nye tallet, og tallet teller med. Farten følger treffet: et supereffektivt treff får linja til å rase ned,
   et vanlig går jevnt, og et lite effektivt siger sakte. Bak linja står en lys rest av det som ble slått bort et øyeblikk før den synker etter,
   så det synes hvor mye som forsvant. o = { e: hvor effektivt, crit, hit: et treff fra et angrep }. Løftet holder til selve linja er framme. */
const EASE = { out: k => 1 - Math.pow(1 - k, 3), io: k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, sine: k => -(Math.cos(Math.PI * k) - 1) / 2 };
function hpTo(side, hp, o = {}) {
  const B = BT.B, v = BT.v[side], b = teamOf(side)[v.i], from = v.hp, el = $('#b-' + side), pk = !!(PACK.hud && el && el.querySelector('canvas')), bar = pk ? el : $('#b-' + side + ' .hpbar i'), gh = pk ? null : $('#b-' + side + ' .hpbar b'), num = $('#b-' + side + ' .hpnum');
  const e = o.e == null ? 1 : o.e, dmg = hp < from, frac = Math.abs(from - hp) / b.max;
  /* Fart i «andel av full linje per sekund», og korteste og lengste tid. */
  const rate = !dmg ? 0.55 : e > 1 ? 1.3 : e < 1 ? 0.26 : o.crit ? 0.85 : 0.58, lim = !dmg ? [420, 1300] : e > 1 ? [230, 780] : e < 1 ? [520, 1700] : [400, 1400];
  const dur = Math.max(lim[0], Math.min(lim[1], frac / rate * 1000)) / spdF(), ease = !dmg ? EASE.io : e > 1 ? EASE.out : e < 1 ? EASE.sine : EASE.io;
  const ghost = dmg && !!o.hit, lag = (e > 1 ? 220 : 130) / spdF(), gdur = ghost ? dur + (e > 1 ? 420 : 260) / spdF() : dur, t0 = performance.now(), my = v.tk = (v.tk || 0) + 1;
  v.hp = hp;
  if (from === hp || !bar) return Promise.resolve();
  if (ghost && e > 1) jolt(el);
  return new Promise(res => (function f(t) {
    const k = Math.min(1, (t - t0) / dur), x = from + (hp - from) * ease(k), kg = ghost ? Math.min(1, Math.max(0, (t - t0 - lag) / (gdur - lag))) : 1, gx = from + (hp - from) * EASE.io(kg);
    if (BT.B !== B || BT.v[side] !== v || v.tk !== my || !bar.isConnected) { v.gh = null; return res(); }
    if (pk) { v.sh = k < 1 ? x : null; v.gh = kg < 1 ? gx : null; hudDraw(side); }
    else { bar.style.width = (x / b.max * 100).toFixed(2) + '%'; bar.style.background = hpCol(x / b.max); if (gh) gh.style.width = kg < 1 ? `calc((100% - 2px) * ${(gx / b.max).toFixed(4)})` : '0'; if (num) num.textContent = Math.round(x) + '/' + b.max; }
    if (k >= 1) res();
    if (k < 1 || kg < 1) requestAnimationFrame(f);
  })(t0));
}
/* HP-boksen får et lite rykk og et lysglimt når treffet var supereffektivt. */
function jolt(el) { if (!el || !el.animate || calm()) return; try { el.animate([{ transform: 'translate(0,0)', filter: 'brightness(2.4)' }, { transform: 'translate(-3px,2px)', filter: 'brightness(1.7)' }, { transform: 'translate(3px,-2px)', filter: 'brightness(1.3)' }, { transform: 'translate(-2px,-1px)', filter: 'brightness(1.1)' }, { transform: 'translate(0,0)', filter: 'brightness(1)' }], { duration: 260 / spdF() }); } catch (_) {} }
/* Midten av en Pokémon i effektlerretets piksler (256 × 192). */
function fxPos(side) {
  const ar = $('#arena'), img = document.querySelector('#s-' + side + ' img'), def = side === 'foe' ? { x: 189, y: 66 } : { x: 62, y: 146 };
  if (!ar || !img || !img.naturalWidth) return def;
  const A = ar.getBoundingClientRect(), r = img.getBoundingClientRect(), k = 256 / A.width;
  return r.width ? { x: (r.left + r.width / 2 - A.left) * k, y: Math.min(184, (r.top + r.height * 0.55 - A.top) * k) } : def;
}
/* Spritene forstørres etter bredden på arenaen (spillskjermen er 256 piksler bred). */
function fitArena() { const a = $('#arena'), m = $('#bmenu'); if (a) { const u = (a.clientWidth / 256).toFixed(3) + 'px'; a.style.setProperty('--z', (a.clientWidth / 256 * 0.8).toFixed(2)); a.style.setProperty('--u', u); a.parentNode.style.setProperty('--u', u); if (m) m.style.setProperty('--u', u); } }
window.addEventListener('resize', fitArena);
function battleTag(B) { return B.tag ? B.tag : B.raid && raidDom(B.tr) ? `${B.mode === 'raid' ? 'Raid' : 'Sandbox'} · ${raidDom(B.tr).n}` : B.mode === 'raid' ? 'Legendary raid' : B.mode === 'pwt' ? `${B.cup} · ${ROUNDN[B.r]}` : B.mode === 'fac' ? `Frontier · Round ${B.round} · ${B.w + 1}/${FACN}` : B.mode === 'lab' ? `${B.exh ? 'Showcase' : 'Sandbox'} · ${B.tr.cn}` : `${B.lap ? 'Lap ' + (B.lap + 1) + ' · ' : ''}${B.n + 1}/${LAPN} · ${B.tr.cn}`; }
const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
function drawBattle() {
  const B = BT.B, tr = B.tr, tier = TIER(tr.kind);
  /* De legendariske og klasse 9 har sin egen luft over banen (raidf.js): tåke, lyn, glør, snøstorm … De legendariske har også sitt eget sted bak plattformene (raidx.js). */
  const airId = tr.wild ? (tr.dk ? 'dk' + tr.leg : tr.leg) : tr.kind === 'supreme' && B.mode !== 'fac' ? 's:' + tr.n : 0, ainf = airId && typeof CINE !== 'undefined' ? CINE.info(airId) : null, own = !!(ainf && ainf.bg);
  /* Med eget sted står de to som i trenerkampene (oppstillingen til banebildene), og plattformene tegnes sammen med stedet. */
  const scene = own ? '' : PACK.now(PACK.sceneFor(B));
  ov(`<div class="btop k-${tier}"${kst(tr)}><span class="pill tn">${esc(B.raid && raidDom(tr) ? raidDom(tr).n : battleTag(B))}</span><span class="btn-n"><b class="${tr.boss ? 'bossn' : ''}">${esc(who(tr))}</b></span>${B.ev && evNow() ? `<span class="pill evp" style="--ec:${evInfo(evNow()).c}">${esc(evInfo(evNow()).n)}</span>` : ''}${SBX && B.mode !== 'lab' ? '<span class="pill sbxp">Sandbox</span>' : ''}${B.exh ? '<button type="button" class="pill exx" id="exx" data-a="exexit">Exit</button>' : ''}</div>
    <div class="bscreen t-${tier}"${kst(tr)}><div class="arena a-${tr.arena} v${tr.v} t-${tier} i${tr.int}${tr.th ? ' th-' + tr.th : ''}${scene || own ? ' has-scene' : ''}${tr.wild ? ' rv lg' + (tr.dk ? 'dk' : tr.leg) : ''}" id="arena" style="--ac:var(--t${tr.ty});--cc:${tr.cc || 'var(--t' + tr.ty + ')'}">
      <div class="cam" id="cam"><div class="world" id="world">${scene ? `<img class="scene" alt="" src="${scene}">` : ''}<div class="abg"></div>${own ? '<canvas class="fxc bgc evc" id="evc" width="512" height="384"></canvas>' : ''}<canvas class="fxc bgc" id="bgc" width="256" height="192"></canvas><canvas class="fxc amc" id="amc" width="512" height="384"></canvas><div class="plat pf"></div><div class="plat pm"></div></div></div><div class="dim"></div>
      ${tr.wild ? '' : `<div class="trn" id="trn">${tsprite(tr.img)}</div>`}
      <div class="bs foe gone" id="s-foe"></div><div class="bs me gone" id="s-me"></div>${tr.wild ? '<canvas class="fxc rfx" id="rfx" width="512" height="384"></canvas>' : ''}
      <canvas class="fxc" id="fxc" width="256" height="192"></canvas><canvas class="fxc" id="axc" width="512" height="384"></canvas><div class="fx" id="fx"></div>
      <div class="hpb foe" id="b-foe" hidden></div><div class="hpb me" id="b-me" hidden></div>
    </div><button type="button" class="btext" id="btext" data-a="btap" aria-live="polite"><span id="btx"></span><i></i></button></div>
    <div id="bmenu" class="bmenu"></div>`, 'battle k-' + tier, `var(--t${tr.ty})`);
  FX.attach($('#fxc')); FX.speed = spdF();
  EBXP.attach($('#arena'));
  BT.sh = null; BT.atk = null;
  FX.hooks.shake = (ms, amp, kind) => shake(ms, amp == null ? 3 : amp, kind);
  /* Bakgrunnsshowet følger klassen og temaet. Rammene som beveger seg (gull og de ondes røde puls) tegnes på nytt mange ganger i sekundet. */
  FX.hooks.glitch = ms => { const a = $('#arena'); if (!a) return; a.classList.add('glitch'); setTimeout(() => a.classList.remove('glitch'), ms); };
  /* Med egen luft dempes det vanlige showet, så det ikke blir for mye. BT.airO.k er styrken: den økes når den legendariske blir rasende. */
  const air = !!airId && !calm() && typeof CINE !== 'undefined' && CINE.has(airId);
  if (BT.air) BT.air(); BT.airO = { cc: tr.cc || '#ffffff', k: 1, bg: $('#evc') }; BT.air = air ? CINE.air($('#amc'), airId, BT.airO) : null;
  if (own && !air) CINE.bgStill($('#evc'), airId, 12, { cc: tr.cc });
  /* Lydene til entréen og stedets hendelser hentes nå. */
  if (tr.wild && typeof CINE !== 'undefined' && typeof raidDom === 'function') for (const n of ['in:' + entKind(tr), 'ev:' + domKey(tr), 'ev:rage']) ((CINE.FXS[n] || {}).cues || []).forEach(q => { if (q[1] === 'sfx') PACK.warm(q[2]); });
  FX.show($('#bgc'), calm() ? 0 : air ? (tr.wild ? 0 : 4) : tr.int, tr.ty, tr);
  clearInterval(BT.goldT);
  const rk = hudRing('foe');
  if (rk === 'gold' || rk === 'evil') BT.goldT = setInterval(() => { const el = $('#b-foe'); if (!$('#arena') || BT.B !== B) return clearInterval(BT.goldT); if (el && !el.hidden && PACK.hud) hudDraw('foe'); }, 66);
  fitArena();
}
/* Teksten skrives fram bokstav for bokstav. Trykk på boksen for å hoppe fram. */
function setText(s) { const el = $('#btx'); if (el) el.textContent = s; const b = $('#btext'); if (b) b.classList.remove('wait', 'hid'); }
/* Tekstboksen viker mens et angrep spilles av (som i spillene), og kommer tilbake med neste melding. */
const textAway = () => { const b = $('#btext'); if (b) b.classList.add('hid'); };
async function typeOut(s) {
  const el = $('#btx'), B = BT.B; if (!el) return;
  let i = 0, skip = false; BT.tap = () => { skip = true; };
  $('#btext').classList.remove('wait', 'hid');
  while (i < s.length && !skip) { i = Math.min(s.length, i + (bFast() ? 4 : 1)); el.textContent = s.slice(0, i); await new Promise(r => setTimeout(r, 17)); if (BT.B !== B || !el.isConnected) return; }
  el.textContent = s; BT.tap = null;
}
async function say(s, hold) {
  await typeOut(s);
  const b = $('#btext'); if (!b) return;
  if (hold) { await new Promise(r => { const id = setTimeout(r, hold / spdF()); BT.tap = () => { clearTimeout(id); r(); }; }); BT.tap = null; return; }
  b.classList.add('wait');
  await new Promise(r => { const id = setTimeout(r, (bFast() ? 320 : 760)); BT.tap = () => { clearTimeout(id); r(); }; });
  BT.tap = null; b.classList.remove('wait');
}
/* Menyen under banen er bygd som den nederste skjermen i Black og White: den store ballen med FIGHT, og BAG, RUN og POKÉMON under.
   Angrepene ligger i fire felt i typens farge, og laget i paneler i to kolonner (blå, rød for besvimt, turkis for den som står inne).
   Bildene kommer fra ressurspakken. Uten den tegnes det samme med farger. Mens noe spilles av, hviler skjermen med ballen alene. */
const mim = k => PACK.menu && PACK.menu[k] ? `background-image:url(${PACK.menu[k]})` : '';
/* Menyene med valg er tegnet som i Black 2 og White 2. MFR = rammen rundt ett valg: mørkt felt med nett og skrå ender i valgets farge (--c),
   og røde hjørnemerker mens det trykkes. MVBG = flaten bak: røde felt øverst og den lyse V-en nederst. */
const MFR = '<svg class="mfr" viewBox="0 0 124 44" preserveAspectRatio="none" aria-hidden="true"><polygon class="a" points="1,22 13,1 111,1 123,22 111,43 13,43"/><polygon class="b" points="1,22 13,1 20,1 8,22 20,43 13,43"/><polygon class="h" points="6.4,22 18.4,1 20,1 8,22 20,43 18.4,43"/><polygon class="b" points="123,22 111,1 104,1 116,22 104,43 111,43"/><polygon class="h" points="117.6,22 105.6,1 104,1 116,22 104,43 105.6,43"/><path class="l" d="M20,1.4H104M20,42.6H104"/><polygon class="o" points="1,22 13,1 111,1 123,22 111,43 13,43"/><path class="k" d="M-2,9V-3H12M112,-3H126V9M126,35V47H112M12,47H-2V35"/></svg>';
const MVDEF = '<defs><pattern id="mvmesh" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#1a1b1f"/><rect width="1" height="1" fill="#2a2b30"/></pattern><pattern id="mvdot" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#2c2d32"/></pattern></defs><rect width="256" height="192" fill="#37383d"/><rect width="256" height="192" fill="url(#mvdot)"/>';
const MVRED = '<polygon points="0,3 91,3 83,19 0,13" fill="#b93226"/><polygon points="0,3 91,3 90,5.5 0,5.5" fill="#d9594a"/><path d="M0,14.2L84,20.2L92,3.6" fill="none" stroke="#e8e8ec" stroke-width="1.2"/><polygon points="256,3 165,3 173,19 256,13" fill="#b93226"/><polygon points="256,3 165,3 166,5.5 256,5.5" fill="#d9594a"/><path d="M256,14.2L172,20.2L164,3.6" fill="none" stroke="#e8e8ec" stroke-width="1.2"/>';
const MVSVG = x => `<svg class="mvbg" viewBox="0 0 256 192" preserveAspectRatio="none" aria-hidden="true">${MVDEF}${x}</svg>`;
/* Angrepsmenyen har den lyse V-en nederst. Listene (veska og RUN) har en rett fot i stedet, så feltene får plass. */
const MVBG = MVSVG(MVRED + '<polygon points="0,126 82,133 97,157 128,166 159,157 174,133 256,126 256,192 0,192" fill="#4a4c52"/><path d="M0,126L82,133L97,157L128,166L159,157L174,133L256,126" fill="none" stroke="#e8e8ec" stroke-width="1.4"/><path d="M0,128.4L80.6,135.2L95.4,159L128,168.6L160.6,159L175.4,135.2L256,128.4" fill="none" stroke="#1d1e22" stroke-width="1"/>');
const MVBG2 = MVSVG('<polygon points="0,0 256,0 256,6 0,6" fill="#b93226"/><path d="M0,6.6H256" stroke="#e8e8ec" stroke-width="1.2"/><polygon points="0,148 256,148 256,192 0,192" fill="#4a4c52"/><path d="M0,148H256" stroke="#e8e8ec" stroke-width="1.4"/><path d="M0,150.2H256" stroke="#1d1e22" stroke-width="1"/>');
const RET = '<span class="ret"><svg viewBox="0 0 18 12" aria-hidden="true"><path d="M6,0V3H12A4.5,4.5 0 0 1 12,12H3V9H12A1.5,1.5 0 0 0 12,6H6V9L0,4.5Z"/></svg></span>';
/* Ett panel på lagskjermen. act = handlingen når det trykkes, ok = kan velges, cur = står inne i kampen nå. */
function partyPanel(b, i, act, ok, cur) {
  const row = b.hp <= 0 ? 1 : cur ? 2 : 0, col = i ? 2 : 0, f = Math.max(0, b.hp / b.max);
  return `<button type="button" class="bw-p ${i % 2 ? 'r' : 'l'} s${row}${PACK.menu ? '' : ' np'}" data-a="${act}" data-k="${i}" style="--row:${Math.floor(i / 2)};${PACK.menu ? `--bg:url(${PACK.menu['p' + row + col]});--bgs:url(${PACK.menu['p' + row + (col + 1)]})` : ''}"${ok ? '' : ' disabled'}>
    <span class="ic">${spr(b.id, { sh: b.sh, mega: b.mega })}</span><b class="nm">${esc(b.short || b.name)}${gs(b)}${isMega(b) ? ' <u>M</u>' : ''}</b><span class="plv tn">Lv${b.lv}</span>${b.status ? `<i class="st st-${b.status}">${STAG[b.status]}</i>` : ''}
    <span class="hpl"><em>HP</em><span><i style="width:${(f * 100).toFixed(1)}%;background:${hpCol(f)}"></i></span></span><span class="hpn tn">${b.hp <= 0 ? 'FNT' : b.hp + '/' + b.max}</span></button>`;
}
function drawMenu() {
  const el = $('#bmenu'); if (!el) return;
  /* Demoen «Mewtwo → Dark» i Sandbox: mens du står mot den vanlige Mewtwo, kan du hoppe rett til forvandlingen. */
  { const B0 = BT.B, ar = $('#arena'), on = !!(B0 && !B0.over && !BT.busy && B0.mode === 'lab' && B0.raid && B0.tr && B0.tr.leg === 150 && !B0.tr.dk), b = $('#dkskip');
    if (on && ar && !b) ar.insertAdjacentHTML('beforeend', '<button type="button" id="dkskip" class="dkskip" data-a="dkskip">Skip to Dark Mewtwo ›</button>'); else if (!on && b) b.remove(); }
  const B = BT.B, pk = PACK.menu ? ' pk' : '', bg = mim('pbg'), cancel = (a, t) => `<button type="button" class="bw-cancel bback" data-a="${a || 'bback'}" aria-label="${t || 'Back'}" style="--c:#2f84e6">${MFR}${RET}</button>`;
  const myTy = `<span class="tyb bw-ty" id="bty-me" data-h="">${BT.tyme || ''}</span>`;
  if (!B || BT.busy || B.over) { el.innerHTML = `<div class="bw bw-main bw-idle${pk}" style="${mim('ball')}">${B && !B.over ? myTy : ''}</div>`; return; }
  const me = B.me[B.a];
  if (B.need || BT.menu === 'team') {
    el.innerHTML = `<div class="bw bw-party bsw${pk}" style="${bg}">${B.me.map((b, i) => partyPanel(b, i, 'bsw', b.hp > 0 && !(i === B.a && B.need !== 1), i === B.a && B.need !== 1)).join('')}<p class="bw-tip">${B.need === 1 ? 'Choose a Pokémon.' : 'Switch to which Pokémon?'}</p>${B.need ? '' : cancel()}</div>`;
    return;
  }
  if (BT.menu !== 'moves') BT.mega = 0;
  if (BT.menu === 'moves') {
    const any = me.mv.some((x, k) => moveOk(B, k)), fv = BT.v.foe, mg = canMega(B, 'me'); if (!mg) BT.mega = 0;
    const mvb = (k, m, pp, ok) => `<button type="button" class="bw-m" data-a="bmove" data-k="${k}" style="--c:var(--b${m[1]})"${ok ? '' : ' disabled'}>${MFR}<b>${esc(m[0])}</b><span class="mty">${TYN[m[1]]}</span><span class="pp tn">${pp}</span>${k >= 0 ? fxTag(B, m) : ''}</button>`;
    el.innerHTML = `<div class="bw bw-moves bmv${S.hfx === 0 ? '' : ' hfx'}">${MVBG}<span class="mv-foe">${B.foe.map((b, i) => `<i class="${b.hp <= 0 ? 'out' : i === fv.i ? 'on' : ''}"></i>`).join('')}</span>
      ${any ? me.mv.map((x, k) => mvb(k, mvEff(B, me, MOVES[x.i]), `<em>PP</em>${x.pp}/${x.max}`, moveOk(B, k))).join('') : mvb(-1, ['Struggle', 0], '<em>No PP left</em>', true)}
      <span class="mv-balls">${Array.from({ length: 6 }, (_, i) => { const b = B.me[i]; return `<i class="${!b ? 'no' : b.hp <= 0 ? 'out' : b.status ? 'st' : ''}${i === B.a ? ' cur' : ''}"></i>`; }).join('')}</span>${myTy}${mg ? `<button type="button" class="bw-mega${BT.mega ? ' on' : ''}" data-a="bmega" aria-pressed="${!!BT.mega}" aria-label="${MEGA[me.mg - 1][1] === 'Primal' ? 'Primal Reversion' : 'Mega Evolve'} with the next move"><span>${MEGA[me.mg - 1][1] === 'Primal' ? 'PRIMAL' : 'MEGA'}</span></button>` : ''}${cancel()}</div>`;
    return;
  }
  if (BT.menu === 'pause') {
    const tt = PACK.title(), row = (a, l, v, x) => `<button type="button" class="bw-row${x || ''}" data-a="${a}"${a === 'bmusic' && !S.sound ? ' disabled' : ''}>${MFR}<span>${l}</span><b>${v}</b></button>`;
    el.innerHTML = `<div class="bw bw-list bsw${PACK.ebx ? ' r4' : ''}">${MVBG2}${row('bfast', 'SPEED', S.bfast ? 'FAST' : 'NORMAL')}${row('bmusic', 'MUSIC', S.music === 0 ? 'OFF' : 'ON')}${PACK.ebx ? row('bdx', 'MOVES', S.dx === 0 ? 'CLASSIC' : 'DX') : ''}${row('bforfeit', 'FORFEIT', 'give up', ' red')}${tt ? `<p class="bw-tip">♪ ${esc(tt)}</p>` : ''}${cancel('bback', 'Back')}</div>`;
    return;
  }
  /* Veska: velg gjenstand, og så hvem den brukes på. Den koster turen din. I demoen er alt gratis, så det kan prøves. */
  const free = B.mode === 'lab', own = k => free ? 1 : S.items[k] || 0;
  if (BT.menu === 'bag') {
    const have = Object.keys(BAG).filter(k => own(k) > 0);
    el.innerHTML = `<div class="bw bw-bag">${MVBG2}<p class="bw-tip">Bag · ${B.bag} use${B.bag === 1 ? '' : 's'} left${free ? ' · free here' : ''}</p><div class="bw-items">${have.length ? have.map(k => `<button type="button" class="bw-m it" data-a="bitem" data-k="${k}" style="--c:var(--b${BAG[k].rev || BAG[k].all ? 12 : BAG[k].cure ? 11 : 13})"${B.me.some((_, i) => itemOk(B, k, i)) ? '' : ' disabled'}>${MFR}<b>${esc(SHOP[k].n)}</b><span class="mty">${BAG[k].all ? 'Revive all' : BAG[k].rev ? 'Revive' : BAG[k].cure ? 'Status' : 'Heal'}</span><span class="pp tn">${free ? '∞' : '× ' + own(k)}</span></button>`).join('') : '<p class="bw-tip">Your Bag is empty. Potions and Revives are sold in the Shop.</p>'}</div>${cancel()}</div>`;
    return;
  }
  if (BT.menu === 'bagt') {
    const k = BT.item;
    el.innerHTML = `<div class="bw bw-party bsw${pk}" style="${bg}">${B.me.map((b, i) => partyPanel(b, i, 'btarget', itemOk(B, k, i), i === B.a)).join('')}<p class="bw-tip">${esc(SHOP[k].n)} · on who?</p>${cancel('bbag')}</div>`;
    return;
  }
  const bag = B.bag != null && B.mode !== 'fac' && !(B.mode === 'lab' && B.rent);
  el.innerHTML = `<div class="bw bw-main${pk}" style="${mim('ball')}"><button type="button" class="bw-fight bm-fight" data-a="bfightm" aria-label="Fight"><i style="${mim('fight')}"></i><span>FIGHT</span></button>
    <button type="button" class="bw-b bw-bag bm-bag" data-a="bbag" style="${mim('bag')}"${bag && B.bag > 0 ? '' : ' disabled'}><span>BAG</span></button><button type="button" class="bw-b bw-run bm-pa" data-a="bpause" style="${mim('run')}"><span>RUN</span></button><button type="button" class="bw-b bw-pk bm-pk" data-a="bswitch" style="${mim('pkmn')}"${B.me.filter(b => b.hp > 0).length > 1 && canSwitch(B) ? '' : ' disabled'}><span>POKÉMON</span></button>
    <span class="bw-balls">${B.me.map(b => `<i class="${b.hp <= 0 ? 'out' : b.status ? 'st' : ''}"></i>`).join('')}</span>${myTy}</div>`;
}
/* Ballen kastes inn mot plattformen. Bosser bruker finere baller. */
function tossBall(side) {
  const fx = $('#fx'); if (!fx) return Promise.resolve();
  const tier = TIER(BT.B.tr.kind), ms = 520 / spdF(), el = document.createElement('i'), kind = side === 'me' || tier === 'reg' ? 'poke' : tier === 'boss' ? 'great' : 'ultra', pk = PACK.now(`ui/ball_${kind}ball.png`);
  el.className = 'pball ' + side; el.style.setProperty('--d', ms + 'ms'); el.innerHTML = pk ? `<b class="ball pk" style="background-image:url(${pk})"></b>` : ballEl(kind);
  fx.append(el); sfx.thr();
  return new Promise(r => setTimeout(() => { el.remove(); r(); }, ms));
}
/* Krokene ark-animasjonene bruker for å flytte Pokémonene, blinke skjermen og skjule målet. */
function animHooks(side, self) {
  const ar = $('#arena'), k = ar ? ar.clientWidth / 512 : 1, el = { u: $('#s-' + side), t: $('#s-' + (self ? side : opp(side))) };
  const tmp = (e, prop, val, ms) => { if (!e) return; e.style[prop] = val; setTimeout(() => { e.style[prop] = ''; }, ms); };
  return {
    sprite: (who, dx, dy, vis) => { const e = el[who]; if (!e || (self && who === 't')) return; e.style.translate = dx || dy ? `${(dx * k).toFixed(1)}px ${(dy * k).toFixed(1)}px` : ''; e.style.visibility = vis ? '' : 'hidden'; },
    flash: (css, ms) => { const fx = $('#fx'); if (!fx) return; const d = document.createElement('i'); d.className = 'flashov'; d.style.background = css; d.style.animationDuration = Math.max(120, ms) + 'ms'; fx.append(d); setTimeout(() => d.remove(), Math.max(120, ms) + 40); },
    tflash: (css, ms) => tmp(el.t, 'filter', 'brightness(2.4)', Math.max(100, ms)),
    thide: ms => tmp(el.t, 'visibility', 'hidden', Math.max(100, ms))
  };
}
/* Felles animasjoner (status, stat opp/ned, helbredelse) fra pakken. Gir false hvis pakken ikke har den. */
async function common(k, side) {
  if (k && await ebxPlay(PACK.ebxCommon(k), side, { self: true }, 'main')) return true;
  const n = k && PACK.common(k), cv = $('#axc'); if (!n || !cv) return false;
  const p = fxPos(side), q = { x: p.x * 2, y: p.y * 2 };
  return PACK.play(n, cv, q, q, false, spdF(), null);
}
const wob = (side, ms) => { const sp = $('#s-' + side); if (sp) { sp.classList.add('wob'); setTimeout(() => sp.classList.remove('wob'), ms / spdF()); } };

/* ---------- Angrepslaget ----------
   Hvert angrep spilles som en liten scene, enten animasjonen kommer fra pakken eller er tegnet med kode:
   1. banen dempes i typens farge, så angrepet lyser, og angriperen lader opp
   2. angriperen kaster seg mot målet (eller rykker bakover når den skyter, eller hopper og slår i bakken)
   3. i det angrepet treffer står alt stille et øyeblikk, målet lyser hvitt, og så rister skjermen og målet slås bakover
   Sterkere angrep får mer av alt: lengre oppladning, lengre stopp, kraftigere risting. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* Hvor voldsomt et angrep er, 0–3, etter styrken. Rulling vokser for hvert treff. */
function mvTier(m, e) {
  if (m[4] === 0) return 0;
  const n = m[0], p = (m[2] || (VPOW[n] ? 80 : 60)) * (e && e.roll ? Math.pow(2, Math.min(4, e.roll)) : 1);
  return m[6] === 9 || BOOM.has(n) || p >= 120 ? 3 : p >= 90 ? 2 : p >= 60 ? 1 : 0;
}
/* Hvordan angriperen beveger seg: 'dash' kaster seg mot målet, 'cast' lader og skyter, 'stomp' hopper og slår i bakken, 'swell' eser ut (eksplosjon),
   'pulse' samler kraft (statusangrep på seg selv) og 'nod' vender seg mot motstanderen (statusangrep mot den). */
function styleOf(m, kind, self) {
  if (m[4] === 0) return self ? 'pulse' : 'nod';
  if (kind === 'boom') return 'swell';
  if (kind === 'quake' || kind === 'fall') return 'stomp';
  return m[4] === 1 && FX.contact(m) ? 'dash' : 'cast';
}
/* Små bevegelser på en sprite (Web Animations). Den siste stillingen holdes til clearMot, så neste bevegelse kan ta over der den forrige slapp. */
function mot(el, kf, ms, ease) {
  if (!el || !el.animate || calm()) return sleep(ms / spdF());
  try { const a = el.animate(kf, { duration: Math.max(30, ms / spdF()), easing: ease || 'ease-out', fill: 'both', id: 'atk' }); return a.finished.then(() => {}, () => {}); } catch (_) { return sleep(ms / spdF()); }
}
function clearMot(el) { try { if (el && el.getAnimations) for (const a of el.getAnimations()) if (a.id === 'atk') a.cancel(); } catch (_) {} }
/* Vektoren fra a til b i skjermpiksler (a og b er i spillpiksler), og hvor stor en spillpiksel er på skjermen (u). */
const vec = (a, b) => { const ar = $('#arena'), u = ar ? ar.clientWidth / 256 : 1.5; return { x: (b.x - a.x) * u, y: (b.y - a.y) * u, u }; };
const T2 = (x, y, sx, sy, r) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sx},${sy == null ? sx : sy})${r ? ` rotate(${r}deg)` : ''}`;
function stageOn(K, a, b) {
  const ar = $('#arena'); if (!ar) return;
  const m = K.m, f = K.self ? a : b;
  ar.style.setProperty('--tc', `var(--t${m[1]})`);
  ar.style.setProperty('--dim', (m[4] === 0 ? 0.4 : 0.5 + K.tier * 0.09).toFixed(2));
  ar.style.setProperty('--fx', (f.x / 2.56).toFixed(1) + '%'); ar.style.setProperty('--fy', (f.y / 1.92).toFixed(1) + '%');
  ar.classList.add('atk');
}
/* Scenen er over: angriperen går tilbake på plass, resten av effekten får spille ferdig, og banen lysner igjen. */
async function stageOff() {
  const K = BT.atk; if (!K) return; BT.atk = null;
  if (K.back) K.back();
  if (K.done) await Promise.race([K.done, sleep((K.ebx ? 4000 : 900) / spdF())]);
  const ar = $('#arena'); if (ar) ar.classList.remove('atk');
  for (const s of ['me', 'foe']) { const el = $('#s-' + s); if (el) el.classList.remove('cast'); }
}
/* Oppladningen: angriperen trekker seg sammen, lener seg bakover eller hopper, etter hva slags angrep det er. d = vektoren mot målet. */
function windUp(K, sp, d, ms) {
  const Z = T2(0, 0, 1);
  switch (K.style) {
    case 'dash': return mot(sp, [{ transform: Z }, { transform: T2(-d.x * 0.1, -d.y * 0.1, 1.06, 0.92) }], ms, 'cubic-bezier(.3,0,.3,1)');
    case 'cast': return mot(sp, [{ transform: Z }, { transform: T2(-d.x * 0.05, -d.y * 0.05, 1.07), offset: 0.7 }, { transform: T2(-d.x * 0.06, -d.y * 0.06, 1.04, 1.08) }], ms);
    case 'stomp': return mot(sp, [{ transform: Z }, { transform: T2(0, 3 * d.u, 1.08, 0.88), offset: 0.45 }, { transform: T2(0, -16 * d.u, 0.96, 1.08) }], ms + 60, 'cubic-bezier(.3,0,.2,1)');
    case 'swell': return mot(sp, [{ transform: Z }, { transform: T2(0, 0, 1.12), offset: 0.5 }, { transform: T2(0, 0, 1.03), offset: 0.7 }, { transform: T2(0, 0, 1.25) }], ms + 200, 'ease-in');
    case 'pulse': return mot(sp, [{ transform: Z }, { transform: T2(0, -3 * d.u, 1.08), offset: 0.5 }, { transform: Z }], ms, 'ease-in-out');
    default: return mot(sp, [{ transform: Z }, { transform: T2(d.x * 0.06, d.y * 0.06, 1.04), offset: 0.5 }, { transform: Z }], ms, 'ease-in-out');
  }
}
/* Selve angrepet. hit = millisekunder til det treffer. Den som kaster seg fram, blir stående hos målet til treffet er over (K.back henter den hjem). */
function launch(K, sp, d, hit) {
  const far = K.side === 'me' ? 0.84 : 1.22, Z = T2(0, 0, 1);
  switch (K.style) {
    case 'dash':
      mot(sp, [{ transform: T2(-d.x * 0.1, -d.y * 0.1, 1.06, 0.92) }, { transform: T2(d.x * 0.62, d.y * 0.62, far) }], Math.max(70, Math.min(140, hit - 10)), 'cubic-bezier(.5,0,.9,.5)');
      K.back = () => { K.back = null; mot(sp, [{ transform: T2(d.x * 0.62, d.y * 0.62, far) }, { transform: T2(d.x * 0.3, d.y * 0.3 - 6 * d.u, (1 + far) / 2), offset: 0.5 }, { transform: Z }], 300, 'cubic-bezier(.2,.6,.3,1)').then(() => clearMot(sp)); };
      break;
    case 'cast': mot(sp, [{ transform: T2(-d.x * 0.06, -d.y * 0.06, 1.04, 1.08) }, { transform: T2(d.x * 0.07, d.y * 0.07, 1.03), offset: 0.18 }, { transform: T2(-d.x * 0.05, -d.y * 0.05, 1), offset: 0.5 }, { transform: Z }], Math.max(320, hit + 120)).then(() => clearMot(sp)); break;
    case 'stomp': mot(sp, [{ transform: T2(0, -16 * d.u, 0.96, 1.08) }, { transform: T2(0, 2 * d.u, 1.14, 0.82), offset: 0.35 }, { transform: Z }], 300, 'cubic-bezier(.6,0,.4,1)').then(() => clearMot(sp)); break;
    case 'swell': mot(sp, [{ transform: T2(0, 0, 1.25) }, { transform: Z }], 260).then(() => clearMot(sp)); break;
    default: clearMot(sp);
  }
}
/* Første runde av et to-runders angrep: opp i lufta, ned i bakken eller en puls av kraft. Spriten skjules av motoren rett etterpå. */
function gatherMot(sp, name, d) {
  const Z = T2(0, 0, 1);
  if (/Fly|Bounce/.test(name)) return mot(sp, [{ transform: Z }, { transform: T2(0, 4 * d.u, 1.1, 0.86), offset: 0.4 }, { transform: T2(0, -130 * d.u, 0.9, 1.2) }], 460, 'cubic-bezier(.5,0,.8,.4)');
  if (/Dig|Dive/.test(name)) return mot(sp, [{ transform: Z }, { transform: T2(0, -6 * d.u, 1), offset: 0.3 }, { transform: T2(0, 14 * d.u, 1, 0.1) }], 480, 'ease-in');
  if (/Shadow/.test(name)) return mot(sp, [{ opacity: 1 }, { opacity: 0 }], 380);
  return mot(sp, [{ transform: Z }, { transform: T2(0, 0, 1.06), offset: 0.3 }, { transform: Z, offset: 0.6 }, { transform: T2(0, 0, 1.08), offset: 0.85 }, { transform: Z }], 800, 'ease-in-out').then(() => clearMot(sp));
}
/* Målet slås bakover fra angriperen og fjærer tilbake. sev = 0–1: hvor mye treffet tok. */
function knock(sp, side, sev, eff) {
  const ar = $('#arena'), u = ar ? ar.clientWidth / 256 : 1.5, s = side === 'foe' ? 1 : -1, k = (eff < 1 ? 1.5 : 3 + sev * 8 + (eff > 1 ? 3 : 0)) * u, Z = T2(0, 0, 1);
  mot(sp, [{ transform: Z }, { transform: T2(s * k, -s * k * 0.45, 1, 1, s * (eff > 1 ? 5 : 2)), offset: 0.2 }, { transform: T2(-s * k * 0.2, s * k * 0.1, 1), offset: 0.65 }, { transform: Z }], 300 + sev * 160, 'cubic-bezier(.1,.7,.3,1)').then(() => clearMot(sp));
}
/* Skjermen rister. amp = styrke i spillpiksler. kind: 0 = et rykk som dør ut, 1 = rumling (jordskjelv, stråler), 2 = svaier sidelengs (vind).
   zoom = et lite kamerarykk inn mot punktet at. De sterkeste ristene tar med hele kampskjermen, ikke bare banen. Flere rist legges oppå hverandre. */
function shake(ms, amp, kind, zoom, at) {
  const ar = $('#arena'); if (!ar || calm() || !(amp > 0)) return;
  const Q = BT.sh || (BT.sh = { id: 0, list: [] });
  Q.list.push({ t0: performance.now(), ms, amp, kind: kind || 0, zoom: zoom || 0 });
  if (at) ar.style.transformOrigin = `${(at.x / 2.56).toFixed(1)}% ${(at.y / 1.92).toFixed(1)}%`;
  if (Q.id) return;
  const scr = ar.closest('.bscreen');
  Q.id = requestAnimationFrame(function f(t) {
    Q.list = Q.list.filter(q => t - q.t0 < q.ms);
    if (!Q.list.length || !ar.isConnected || BT.sh !== Q) { Q.id = 0; Q.list = []; ar.style.transform = ''; if (scr) scr.style.transform = ''; return; }
    const u = ar.clientWidth / 256; let x = 0, y = 0, z = 0, big = 0;
    for (const q of Q.list) {
      const k = Math.max(0, (t - q.t0) / q.ms), A = q.amp * (q.kind ? Math.min(1, k * 8) * Math.min(1, (1 - k) * 4) : Math.pow(1 - k, 1.5));
      if (q.kind === 2) { x += A * Math.sin((t - q.t0) / 70); y += A * 0.15 * Math.sin((t - q.t0) / 45); }
      else { x += A * (Math.random() * 2 - 1); y += A * 0.7 * (Math.random() * 2 - 1); }
      z = Math.max(z, q.zoom * Math.pow(1 - k, 2)); big = Math.max(big, A);
    }
    ar.style.transform = `translate(${(x * u).toFixed(1)}px,${(y * u).toFixed(1)}px) scale(${(1 + z + Math.min(0.04, big * 0.004)).toFixed(3)})`;
    if (scr) scr.style.transform = big >= 4 ? `translate(${(x * u * 0.4).toFixed(1)}px,${(y * u * 0.4).toFixed(1)}px)` : '';
    Q.id = requestAnimationFrame(f);
  });
}
/* Spiller en EBDX-animasjon (se ebx.js og ebxp.js) og venter til den treffer ('hit') eller til selve animasjonen er over ('main');
   kameraet glir hjem i bakgrunnen etterpå. Gir null hvis animasjonen ikke finnes eller bildene ikke er klare: da brukes den gamle. */
const EBXR = 1.5;
/* Så lenge (sekunder) klinger lyden til et angrep ut etter at det har truffet. */
const MVTAIL = 0.5;
/* Angrep som låner animasjonen til et annet (pakka har ingen egen), men skal ha en annen farge: lagene med effektene farges om så lenge animasjonen går.
   Pokémonene ligger ikke i de lagene, så de beholder fargene sine. */
const EBXTINT = { 'Blue Flare': 'hue-rotate(195deg) saturate(1.15)', 'Fusion Bolt': 'hue-rotate(150deg) saturate(1.1)' };
/* De samme angrepene i effektene som tegnes med kode (treffet, og hele angrepet uten pakke): fargene til en annen type (10 = blå, 14 = isblå). */
const MVPAL = { 'Blue Flare': 10, 'Fusion Bolt': 14 };
async function ebxPlay(key, side, o, until) {
  const B = BT.B, sp = $('#s-' + side);
  if (!key || !sp) return null;
  /* Var ikke animasjonene lastet da kampskjermen ble tegnet, kobles lerretene inn nå. */
  if (!EBXP.on() && !EBXP.attach($('#arena'))) return null;
  const rec = EBXP.record(key, side, o);
  /* Noen få animasjoner i EBDX er tomme (de overlater alt til spillmotoren). Da brukes den gamle. */
  if (!rec || rec.main < 3 || !(await EBXP.load(rec, EBXP.warmed(key) ? 1500 : 250))) return null;
  if (BT.B !== B || !sp.isConnected) return null;
  if (o.away) sp.classList.remove('away');
  /* De aller lengste animasjonene spilles litt fortere, så ingen angrep tar mye lengre tid enn de andre. */
  const pl = EBXP.play(rec, spdF() * EBXR * Math.min(1.5, Math.max(1, Math.sqrt(rec.busy / 140)))); if (!pl) return null;
  if (o.sound) textAway();
  { const tint = o.sound ? EBXTINT[o.sound[0]] : '', cvs = tint ? [...document.querySelectorAll('#arena canvas.ebx')] : [];
    if (cvs.length) { cvs.forEach(c => { c.style.filter = tint; }); const off = () => cvs.forEach(c => { if (c.style.filter === tint) c.style.filter = ''; }); if (pl.done && pl.done.then) pl.done.then(off); else setTimeout(off, 4000); } }
  /* Lyden til angrepet tones ut når animasjonen er over (PACK.mvEnd). */
  const mh = o.sound ? PACK.mvSfx(o.sound[0]) : null;
  if (o.sound && !mh) BSFX.mv(FX.kindOf(o.sound), mvTier(o.sound), o.sound[1]);
  if (mh && pl.done && pl.done.then) pl.done.then(() => PACK.mvEnd(mh));
  await pl.at(until === 'hit' ? rec.hit : rec.busy);
  if (mh && until === 'hit') PACK.mvEnd(mh, MVTAIL);
  return pl;
}
/* Et angrep: oppladning, selve angrepet og fram til det treffer. Treffet (lyd, stopp, risting og HP-linja) hører til hendelsen som kommer etter. */
async function playAnim(B, e) {
  const side = e.side, sp = $('#s-' + side), m0 = e.mi >= 0 ? MOVES[e.mi] : STRUGGLE, m = e.ty != null && e.ty !== m0[1] ? Object.assign(m0.slice(), { 1: e.ty }) : m0, self = !!e.self, a = fxPos(side), b = self ? a : fxPos(opp(side)), kind = FX.kindOf(m), tier = mvTier(m, e), d = vec(a, b);
  BT.ty = m[1];
  const K = BT.atk = { side, m, kind, tier, self, n: 0, style: styleOf(m, kind, self), back: null, done: null };
  /* Animasjonen fra Elite Battle DX hvis pakken har den: den styrer selv kamera, lys og bevegelser, så resten av scenen her hoppes over. */
  const xk = calm() ? '' : PACK.ebxFor(m);
  if (xk) {
    const pl = await ebxPlay(xk, side, { self: self && !e.charge, hitNum: e.charge ? 1 : 0, hide: e.away ? [side] : [], keep: e.keep || [], away: e.away, sound: m }, e.charge || m[4] === 0 || self ? 'main' : 'hit');
    if (pl) { K.style = 'own'; K.ebx = 1; K.done = pl.done; return; }
  }
  if (e.away) { sp.classList.remove('away'); await bwait(200); }
  textAway(); stageOn(K, a, b); sp.classList.add('cast');
  if (e.charge) { BSFX.charge(2, m[4]); const ms = FX.gather(m[0], a, m[1]); await Promise.all([gatherMot(sp, m[0], d), bwait(ms)]); return; }
  const wms = m[4] === 0 ? 300 : 250 + tier * 110;
  FX.charge(a, m[1], tier, wms, m[4]); if (tier >= 1 || m[4] !== 1) BSFX.charge(tier, m[4]);
  await windUp(K, sp, d, wms);
  if (BT.B !== B || !sp.isConnected) return;
  const an = PACK.animFor(m);
  const mh = PACK.mvSfx(m[0]); if (!mh) BSFX.mv(kind, tier, m[1]);
  const mvDone = p => { if (mh) Promise.resolve(p).then(() => PACK.mvEnd(mh)); };
  if (an && PACK.ready(an)) {
    /* Arkanimasjonen fra pakken. Flytter den selv på angriperen, gjør ikke vi det også. */
    const T = PACK.frames(an) * 50, hit = m[4] ? PACK.hitAt(an) * 50 : T;
    if (K.style === 'dash' && PACK.movesUser(an)) K.style = 'own';
    K.done = PACK.play(an, $('#axc'), { x: a.x * 2, y: a.y * 2 }, { x: b.x * 2, y: b.y * 2 }, side === 'foe', spdF(), animHooks(side, self));
    PACK.sfxTrim(T / spdF() / 1000 + 0.15); mvDone(bwait(T));
    launch(K, sp, d, hit);
    if (kind === 'quake' || kind === 'boom') shake(T / spdF(), kind === 'boom' ? 8 : 4 + tier * 1.5, 1);
    else if (kind === 'beam' && tier >= 2) shake(hit / spdF(), 1 + tier * 0.8, 1);
    await bwait(hit); if (m[4]) PACK.mvEnd(mh, MVTAIL);
  } else {
    const r = FX.move(m, a, b, { roll: e.roll, self: BOOM.has(m[0]), tier, pal: MVPAL[m[0]], wobble: ms => wob(opp(side), ms) });
    PACK.sfxTrim(r.ms / spdF() / 1000 + 0.15);
    launch(K, sp, d, r.hit);
    K.done = bwait(r.ms); mvDone(K.done);
    await bwait(m[4] ? r.hit : r.ms); if (m[4]) PACK.mvEnd(mh, MVTAIL);
  }
}
/* En egenskap slår inn: et bånd med navnet glir inn fra den siden Pokémonen står på, som i Black 2 og White 2. Teksten kommer i tekstboksen. */
function abBanner(side, name) {
  const fx = $('#fx'), b = teamOf(side)[BT.v[side].i]; if (!fx || !name || !b) return;
  fx.querySelectorAll('.abb.' + side).forEach(x => x.remove());
  const el = document.createElement('div'); el.className = 'abb ' + side; el.innerHTML = `<span>${esc(b.short || b.name)}'s</span><b>${esc(name)}</b>`; fx.append(el);
  setTimeout(() => el.classList.add('out'), 1500 / spdF() + 300); setTimeout(() => el.remove(), 1500 / spdF() + 700);
}
/* Spiller av én hendelse fra motoren. */
async function playOne(B, e) {
  const side = e.side, sp = side ? $('#s-' + side) : null, v = side ? BT.v[side] : null;
  if (e.t === 'msg') return say(e.s, e.hold);
  if (e.t === 'god') return godLight(B);
  if (e.t === 'held') { abBanner(e.side, e.n); if (!PACK.sfx('In-Battle Held Item Activate', 0.9)) BSFX.up(); buzz(15); return bwait(380); }
  if (e.t === 'env') return envFx(B, e);
  if (e.t === 'abil') { abBanner(e.side, e.n); buzz(20); return say(e.s); }
  if (e.t === 'anim') return playAnim(B, e);
  if (e.t === 'hit') {
    const b = teamOf(side)[v.i], K = BT.atk && !e.quiet && BT.atk.side !== side ? BT.atk : null, tier = K ? K.tier : 0, sev = Math.min(1, Math.max(0, v.hp - e.hp) / b.max * 1.3);
    if (!e.quiet) {
      const pos = fxPos(side), n = K ? K.n++ : 0, ef = e.e;
      if (!PACK.sfx(ef > 1 ? 'Hit Super Effective' : ef < 1 ? 'Hit Weak Not Very Effective' : 'Hit Normal Damage', 1)) { if (ef > 1) BSFX.hitS(); else if (ef < 1) BSFX.hitW(); else BSFX.hit(); }
      if (e.crit) BSFX.crit();
      FX.hit(pos, K && MVPAL[K.m[0]] != null ? MVPAL[K.m[0]] : BT.ty, ef, e.crit, tier, n); buzz(ef > 1 ? [40, 30, 60] : 25);
      /* Treff-stopp: et øyeblikk der alt står stille og målet lyser hvitt. Lengst for supereffektive og kritiske treff. */
      const fz = calm() || e.sub ? 0 : ((ef > 1 ? 95 : ef < 1 ? 0 : 50) + tier * 22 + (e.crit ? 50 : 0)) * (n ? 0.45 : 1) / spdF();
      if (fz) { sp.classList.add('imp'); FX.hold(fz); PACK.hold(fz); EBXP.hold(fz); await sleep(fz); sp.classList.remove('imp'); }
      if (BT.B !== B || !sp.isConnected) return;
      if (K && K.back) K.back();
      else if (K && n && K.style === 'dash') { const asp = $('#s-' + K.side), d = vec(fxPos(K.side), pos); mot(asp, [{ transform: T2(0, 0, 1) }, { transform: T2(d.x * 0.35, d.y * 0.35, 1), offset: 0.4 }, { transform: T2(0, 0, 1) }], 200).then(() => clearMot(asp)); }
      if (!e.sub) knock(sp, side, sev, ef);
      sp.classList.add('hurt');
      if (ef >= 1) shake((170 + sev * 260 + tier * 60 + (ef > 1 ? 90 : 0)) / spdF(), 1.6 + sev * 5 + tier * 1.1 + (ef > 1 ? 1.6 : 0) + (e.crit ? 1.4 : 0) + B.tr.int * 0.1, 0, tier >= 2 || ef > 1 || e.crit ? 0.02 + sev * 0.045 : 0, pos);
      else shake(120 / spdF(), 0.8 + sev * 1.5, 0);
    }
    if (e.sub) await bwait(320); else await Promise.all([hpTo(side, e.hp, { e: e.quiet ? 1 : e.e, crit: e.crit, hit: !e.quiet }), bwait(e.quiet ? 250 : 400)]);
    sp.classList.remove('hurt');
  }
  else if (e.t === 'heal') { if (!PACK.sfx('In-Battle Heal HP Restore')) BSFX.heal(); if (!e.q && !(await common('HealthUp', side))) FX.heal(fxPos(side)); await Promise.all([hpTo(side, e.hp), bwait(400)]); }
  else if (e.t === 'status') {
    v.st = e.st; paintBox(side);
    if (e.fx) { if (!PACK.sfx({ brn: 'Status Burned', psn: 'Status Poisoned', par: 'Status Paralyzed', frz: 'Status Frozen' }[e.fx])) BSFX.ail(); if (!(await common({ slp: 'Sleep', psn: 'Poison', brn: 'Burn', par: 'Paralysis', frz: 'Frozen', conf: 'Confusion', seed: 'LeechSeed' }[e.fx], side))) { FX.status(e.fx, fxPos(side)); await bwait(520); } }
  }
  else if (e.t === 'stat') { if (!PACK.sfx(e.up ? 'Stat Rise Up' : 'Stat Fall')) (e.up ? BSFX.up : BSFX.down)(); sp.classList.add(e.up ? 'sup' : 'sdn'); if (!(await common(e.up ? 'StatUp' : 'StatDown', side))) { FX.stat(fxPos(side), e.up); await bwait(520); } sp.classList.remove('sup', 'sdn'); }
  else if (e.t === 'faint') { if (!PACK.sfx('In-Battle Faint No Health')) BSFX.faint(); cry(teamOf(side)[v.i].id, 0, 0.3); clearMot(sp); sp.classList.remove('ace'); sp.classList.add('faint'); await bwait(850); paintBox(side); $('#b-' + side).hidden = true; }
  else if (e.t === 'recall') { if (e.txt) await typeOut(e.txt); if (!PACK.sfx('In-Battle Recall Switch Pokeball')) BSFX.recall(); clearMot(sp); sp.classList.remove('ace', 'subd', 'away'); sp.classList.add('recall'); $('#b-' + side).hidden = true; await bwait(420); sp.classList.add('gone'); EBXP.unhide(side); }
  else if (e.t === 'send') {
    const team = teamOf(side), b = team[e.i], wild = side === 'foe' && !!B.tr.wild, ace = wild || (side === 'foe' && B.tr.boss && team.length > 1 && e.i === team.length - 1), big = ace && B.tr.int >= 4;
    BT.v[side] = { i: e.i, hp: e.hp, st: e.st };
    if (big && !wild) { music(''); await say(`${B.tr.n} is down to the last Pokémon…`); }
    if (BT.B !== B || !sp.isConnected) return;
    if (!wild) await typeOut(e.txt);
    clearMot(sp); $('#b-' + side).hidden = true;
    /* Bildet males skjult med en gang, så det hentes mens ballen er i lufta. */
    paintSprite(side, 'gone');
    if (!wild) await tossBall(side);
    await sprReady(side, 1500); if (BT.B !== B || !sp.isConnected) return;
    if (wild && await raidEntry(B)) { if (BT.B !== B || !sp.isConnected) return; if (!PACK.playing() && !MUSIC.playing()) music(musicKey(B)); }
    else {
      if (big) { BSFX.ace(); buzz([80, 40, 80, 40, 240]); await FX.ace(anc(side, 26), B.tr.ty, B.tr); if (!PACK.playing()) music(musicKey(B)); }
      sp.className = 'bs ' + side + ' in' + (ace ? ' ace' : ''); BSFX.ball(); FX.open(anc(side), big ? '#ffe9a8' : '');
      cry(b.id, 200, big ? 0.5 : 0.35); if (big) shake(500 / spdF(), 4, 1);
    }
    await bwait(380); paintBox(side);
    if (B.mode !== 'lab') S.seen[b.id] = 1;
    await bwait(big ? 1100 : 620);
    sp.classList.remove('in', ...Object.values(ENTC));
  }
  else if (e.t === 'vanish') { sp.classList.toggle('away', !!e.on); await bwait(260); clearMot(sp); EBXP.unhide(side); }
  else if (e.t === 'sub') { sp.classList.toggle('subd', !!e.on); await bwait(200); }
  else if (e.t === 'mega') await megaShow(B, side, e);
  /* Arceus bytter plate i raid: et lysglimt i typens farge, og figuren, typen og fargen byttes. */
  else if (e.t === 'plate') {
    await typeOut(e.s); if (BT.B !== B || !sp.isConnected) return;
    if (!PACK.sfx('Judgment', 0.55)) BSFX.aura(); buzz([30, 40, 140]);
    if (!calm()) { const fxl = $('#fx'); if (fxl) { const d = document.createElement('i'); d.className = 'flashov'; d.style.background = `var(--t${e.ty})`; d.style.animationDuration = '560ms'; fxl.append(d); setTimeout(() => d.remove(), 620); } }
    const keep = [...sp.classList].filter(c => !['bs', side, 'in', 'gone'].includes(c)).join(' '); paintSprite(side, keep); paintBox(side); await bwait(460);
  }
  else if (e.t === 'form') { const el = $('#s-' + side); if (el) { FX.open(fxPos(side), ''); BSFX.ball(); el.innerHTML = spr(e.id, { ani: 1, sh: e.sh, back: side === 'me', mega: e.mega }); } await bwait(480); }
  else if (e.t === 'wx') { const a = $('#arena'); if (e.k) { a.dataset.wx = e.k; FX.weather(e.k); await bwait(640); } else delete a.dataset.wx; }
}
async function playEv(ev) {
  BT.busy = true; drawMenu();
  const B = BT.B;
  /* Runden er avgjort i det den vises: stillingen lagres nå, så det å lukke appen ikke gir en ny sjanse. */
  dkTick(B); liveSave(B);
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    if (BT.B !== B || !$('#arena')) return;
    if (BT.atk && e.t !== 'hit') await stageOff();
    if (e.t === 'anim') {
      /* Den som skal være borte etter animasjonen (flyr opp, byttes ut) blir stående skjult der animasjonen slapp den. */
      e.keep = []; for (let j = i + 1; j < ev.length && ev[j].t !== 'anim'; j++) if ((ev[j].t === 'vanish' && ev[j].on) || ev[j].t === 'recall') e.keep.push(ev[j].side);
    }
    /* Den som kommer ned igjen fra lufta, hentes fram av selve angrepsanimasjonen (hvis angrepet blir noe av: bare tekst imellom, og så animasjonen). */
    if (e.t === 'vanish' && !e.on) { let j = i + 1; while (j < ev.length && ev[j].t === 'msg') j++; if (j < ev.length && ev[j].t === 'anim' && ev[j].side === e.side && !ev[j].charge) { ev[j].away = 1; continue; } }
    /* Første runde av et to-runders angrep: teksten («… flew up high!») kommer før animasjonen, så den gamle teksten ikke blir stående. */
    if (e.t === 'anim' && e.charge && !e.sw && ev[i + 1] && ev[i + 1].t === 'msg') { const m2 = ev[i + 1]; m2.hold = 200; e.sw = 1; ev[i + 1] = e; ev[i] = m2; i--; continue; }
    /* Teksten «… used …!» står bare et øyeblikk: animasjonen er det som skal ha tiden. */
    if (e.t === 'msg' && ev[i + 1] && ev[i + 1].t === 'anim') e.hold = 260;
    await playOne(B, e);
  }
  await stageOff();
  if (BT.B !== B || !$('#arena')) return;
  /* Et klipp (traileren): skjermen blir stående slik hendelsene slapp den, uten meny og uten oppgjør. */
  if (B.clip) return;
  BT.busy = false;
  if (B.over) return endBattle();
  /* Dark Mewtwo: er den første låta slutt, forvandles den nå som runden er vist ferdig. */
  if (dkDue(B)) return dkShift(B);
  return turnIdle(B);
}
/* Runden er vist: en tvungen runde (lading, hvile) går av seg selv, ellers er det spilleren sin tur. */
async function turnIdle(B) {
  if (!B.need) { const a = autoAct(B); if (a) { BT.busy = true; await bwait(260); if (BT.B !== B) return; return playEv(runTurn(B, a)); } }
  setText(B.need ? 'Choose your next Pokémon.' : `What will ${B.me[B.a].name} do?`);
  BT.menu = 'main'; drawMenu();
}
/* Boss-introen, som i Black og White: fargebånd som feier inn fra hver side med treneren og din første Pokémon, lyn, og «VS» som smeller inn.
   De sjeldne bossene i ligaen har hvert sitt klipp først, i hver sin stil:
   - de onde lederne (klasse 7): mørkt og rødt, hjerteslag, forstyrrelser i bildet, røde lyn og en silhuett som vokser mot deg
   - mesterne (klasse 8): rolig og staselig, i mesterens egen farge og med sitt eget tema i bakgrunnen (snø, bobler, flammer, krystaller …)
   - de aller største (klasse 9): gull, lyn og stjerner
   Bildene (bånd, VS, lyn, stjerner) kommer fra ressurspakken. Uten den tegnes det samme med farger og tekst. */
const BARC = ['grey', 'brown', 'cyan', 'purple', 'brown', 'brown', 'lime', 'purple', 'steel', 'orange', 'blue', 'green', 'yellow', 'purple', 'cyan', 'blue', 'grey', 'purple'];
async function bossIntro(B, o = {}) {
  /* o.quick = vanlig trener: samme oppstilling, men raskere og uten trykk. Den blir stående (båndene går) til kampen er lastet (o.until), så skjermen aldri er svart. */
  const quick = !!o.quick, tr = B.tr, lead = B.me[0], tier = TIER(tr.kind), V = PACK.vs, clip = tr.ultra && B.mode !== 'fac' && !o.filmed, evil = tr.th === 'evil', sp = (S.bfast ? 0.6 : 1) * (quick ? 0.7 : 1), T = ms => new Promise(r => setTimeout(r, ms * sp));
  const im = k => V && V[k] ? `url(${V[k]})` : 'none', plasma = /Plasma/.test(tr.title) || tr.n === 'Ghetsis';
  ov(`<div class="bwi bwi-${tier} i${tr.int}${V ? ' pk' : ''}${tr.th ? ' th-' + tr.th : ''}" id="bwi" style="--ac:var(--t${tr.ty});--cc:${tr.cc || (evil ? '#e02020' : 'var(--t' + tr.ty + ')')};--bar:${im(evil ? 'bar_me' : 'bar_' + BARC[tr.ty])};--barme:${im(evil ? 'bar_steel' : 'bar_me')};--vsi:${im(tr.int >= 6 && !evil ? 'vs2' : 'vs')};--bolt:${im('bolt')};--vbolt:${im('vbolt')};--stars:${im(evil ? 'cloud' : 'stars')};--orb:${im('flash')};--em:${plasma ? im('plasma') : 'none'}">
    <div class="bwi-s"><div class="bwi-bg"></div><canvas class="bwi-cv" id="bwicv" width="256" height="192"></canvas><div class="bwi-em"></div>
      ${clip ? `<div class="bwi-pre"><span>${esc(RARE[tr.kind])}</span><b>${esc(evil ? tr.title : tr.cn)}</b></div><div class="bwi-sil">${tsprite(tr.img, 'big')}<i class="vb a"></i><i class="vb b"></i><i class="orb"></i><div class="nm"><span>${esc(tr.title)}</span><b>${esc(tr.n)}</b></div></div>` : ''}
      <div class="bwi-bar foe"><div class="bwi-bb"></div>${tsprite(tr.img, 'big')}<div class="bwi-n"><span>${esc(tr.title)}</span><b>${esc(tr.n)}</b></div></div>
      <div class="bwi-bar me${S.av ? ' av' : ''}"><div class="bwi-bb"></div>${S.av ? tsprite(S.av, 'big') : ''}${spr(lead.id, { ani: 1, sh: lead.sh, mega: lead.mega, back: 1 })}<div class="bwi-n"><span>${esc(battleTag(B))}</span><b>You</b></div></div>
      <div class="bwi-bolt"></div><div class="bwi-vs"><b>VS</b></div><div class="bwi-cls">${esc(tr.cn)}</div><div class="bwi-go">Press to enter</div><div class="bwi-fl"></div>
    </div></div>`, 'battle vsov');
  const root = $('#bwi'), st = root.querySelector('.bwi-s'), on = c => { if (root.isConnected) root.classList.add(c); }, gone = () => BT.B !== B || !root.isConnected;
  st.style.setProperty('--u', (st.clientWidth / 256).toFixed(3) + 'px');
  /* Vanlig kampmusikk først hvis treneren ikke har egen låt, og så slår den over til bossmusikken når de viser seg. De sjeldne bossene har sin egen intro i stedet. */
  if (!clip && !PACK.trackFor(B)) music('battle');
  sfx.appear(); buzz([40, 40, 40]); on('s0');
  await T(440); if (gone()) return;
  if (clip) {
    /* Temaet til bossen spiller i bakgrunnen av klippet (aske og rød puls, snø, bobler, gull …). */
    if (!calm()) { FX.hooks.glitch = ms => { st.classList.add('glitch'); setTimeout(() => st.classList.remove('glitch'), ms); }; FX.show($('#bwicv'), tr.int, tr.ty, tr); }
    /* Introen: bossens egen fra pakken hvis den finnes, ellers den innebygde episke. Drønnet faller i det bossen viser seg (c3), og da glir kamplåta inn. */
    const d1 = evil ? 1900 : 1600, d2 = evil ? 2100 : tr.gold ? 1900 : 1600, it = PACK.introFor(B), stop = epicIntro(evil ? 'evil' : tr.gold ? 'ultra' : 'champ', (d1 + d2) * sp / 1000, !!it, PACK.keyOf(PACK.trackFor(B))), quit = () => { stop(); PACK.stingOut(0.2); };
    /* Har bossen sin egen introlåt, spiller den gjennom hele introen og helt til spilleren trykker seg inn i kampen. Kamplåta starter først da. */
    if (it) PACK.sting(it, true);
    on('c1'); buzz(evil ? [90, 150, 90] : [40, 40, 40]);
    await T(d1); if (gone()) return quit();
    on('c2'); buzz(evil ? [90, 150, 90, 400, 90, 150, 90] : [30, 30, 30, 30, 120]);
    await T(d2); if (gone()) return quit();
    on('c3'); if (!it) battleMusic(B, { fade: 1.8, from: 0.12 }); buzz([80, 40, 240]); await T(1300); if (gone()) return PACK.stingOut(0.2);
    on('c4'); await T(240); if (gone()) return;
  }
  on('s1'); await T(330); on('s2'); await T(380); if (gone()) return;
  on('s3'); if (!clip && !PACK.stinging()) battleMusic(B); BSFX.vs(PACK.keyOf(PACK.trackFor(B))); buzz([60, 40, 60, 40, 200]);
  await T(520); on('s4');
  if (quick) { await Promise.race([Promise.all([o.until, T(640)]), new Promise(r => setTimeout(r, 12000))]); if (gone()) return; on('s5'); await T(260); return; }
  await T(clip ? 1100 : 800); if (gone()) return PACK.stingOut(0.2);
  /* Introen blir stående til spilleren trykker («Press to enter»), så introlåta får spille så lenge man vil. */
  await enterGate(root, gone);
  if (gone()) return PACK.stingOut(0.2);
  if (PACK.stinging()) { PACK.stingOut(0.9); battleMusic(B, { fade: 1.4, from: 0.12 }); }
  on('s5'); await T(300);
}
function enterGate(root, gone) {
  return new Promise(res => {
    let done = false;
    const fin = () => { if (done) return; done = true; clearInterval(id); root.removeEventListener('pointerdown', tap); document.removeEventListener('keydown', key); root.classList.remove('go'); res(); };
    const tap = e => { e.preventDefault(); sfx.tap(); fin(); }, key = e => { if (e.key === 'Enter' || e.key === ' ') { sfx.tap(); fin(); } };
    const id = setInterval(() => { if (gone()) fin(); }, 250);
    root.classList.add('go'); root.addEventListener('pointerdown', tap); document.addEventListener('keydown', key);
  });
}
/* Uten ressurspakke brukes det innebygde. Det sies fra de første gangene, så det ikke er tvil om hva som vises. */
function packHint() {
  if (PACK.ok) return;
  let n = 0; try { n = +localStorage.getItem('fokusdex.packhint') || 0; if (n < 3) localStorage.setItem('fokusdex.packhint', n + 1); } catch (_) {}
  if (n < 3) toast(GH && GH.ok ? 'Built-in graphics and music: your pack was not found.' : 'Built-in graphics and music. Your own pack loads when Sync is connected (Profile).');
}
/* Starter en kamp: overgang, treneren på plattformen, ballkast fra begge sider, og så menyen. */
async function startBattle(B) {
  if (BT.busy && BT.B && !BT.B.over) return;
  if (B.mode !== 'lab') {
    /* Klokka må være i orden, og en kamp som er i gang på en annen enhet, må gjøres ferdig der (eller gis opp her) før en ny kan starte. */
    if (typeof fairGate === 'function' && fairGate()) return;
    if (S.live && !liveMine()) return liveOther();
    liveBegin(B);
  }
  BT.B = B; BT.menu = 'main'; BT.res = null; BT.ty = 0; BT.busy = true;
  BT.v = { me: { i: 0, hp: B.me[0].hp, st: '' }, foe: { i: 0, hp: B.foe[0].hp, st: '' } };
  const prep = PACK.prep(B).catch(() => {});
  /* Bildene til begge lagene hentes mens introen går. De to første ventes det på (litt), resten kommer i bakgrunnen. */
  const pre = Promise.all([preSpr(B.me[0].id, { ani: 1, back: 1, sh: B.me[0].sh, mega: B.me[0].mega }), preSpr(B.foe[0].id, { ani: 1, sh: B.foe[0].sh, mega: B.foe[0].mega })]);
  B.me.slice(1).forEach(b => preSpr(b.id, { ani: 1, back: 1, sh: b.sh, mega: b.mega })); B.foe.slice(1).forEach(b => preSpr(b.id, { ani: 1, sh: b.sh, mega: b.mega }));
  if (B.tr.wild) { await Promise.race([prep, new Promise(r => setTimeout(r, 2500))]); if (BT.B !== B) return; await legendIntro(B); }
  else {
    await PACK.introPrep(B); if (BT.B !== B) return;
    /* De to helt spesielle har sin egen film før oppstillingen. */
    const filmed = B.tr.film && B.mode !== 'fac' ? await bossFilm(B) : false; if (BT.B !== B) return;
    await bossIntro(B, B.tr.boss ? { filmed } : { quick: 1, until: prep });
  }
  await prep; await Promise.race([pre, new Promise(r => setTimeout(r, 2000))]);
  if (BT.B !== B) return;
  drawBattle(); drawMenu(); packHint(); dkStart(B);
  await bwait(350);
  await say(B.tr.wild ? (/^The /.test(B.tr.title) ? `${B.tr.n}, ${B.tr.title.replace(/^The /, 'the ')}, appeared!` : `The ${B.tr.title.replace(' Pokémon', '').toLowerCase()} ${B.tr.n} appeared!`) : `${who(B.tr)} wants to battle!`);
  if (BT.B !== B || !$('#arena')) return;
  if ($('#trn')) $('#trn').classList.add('out');
  await playOne(B, { t: 'send', side: 'foe', i: 0, hp: B.foe[0].hp, st: '', txt: `${B.tr.n} sent out ${B.foe[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  await playOne(B, { t: 'send', side: 'me', i: 0, hp: B.me[0].hp, st: '', txt: `Go! ${B.me[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  /* Egenskapene til de to som står inne (Intimidate, Pressure, været …) slår inn før første runde. */
  for (const e of startAbil(B)) { if (BT.B !== B || !$('#arena')) return; await playOne(B, e); }
  if (BT.B !== B || !$('#arena')) return;
  if (B.raid && raidDom(B.tr)) { await say(`${B.tr.n}'s domain: ${raidDom(B.tr).n}!`); if (BT.B !== B || !$('#arena')) return; }
  if (B.over) return endBattle();
  BT.busy = false; setText(`What will ${B.me[B.a].name} do?`); drawMenu();
}
function endBattle() {
  /* Kampmusikken klinger ut over et par sekunder i stedet for å stoppe: først dukker den, så seierslyden slipper til. */
  const B = BT.B; stopMusic(2.6); BT.busy = false; clearTimeout(BT.dkTm); BT.dkB = null;
  if (B.mode !== 'lab') liveEnd();
  clearInterval(BT.goldT); FX.show(null); if (BT.air) { BT.air(); BT.air = null; }
  const res = BT.res = B.mode === 'fac' ? finishFactory(B) : B.mode === 'lab' ? finishLab(B) : B.mode === 'raid' ? finishRaid(B) : B.mode === 'pwt' ? finishPwt(B) : finishLeague(B);
  if (jOn() && B.mode !== 'raid' && B.mode !== 'lab' && !(S.jx || {}).b) { (S.jx = S.jx || {}).b = 1; jRaid(); }
  BT.tp = null; BT.fs = null;
  if (res.dark && $('#arena')) return darkRise(B);
  if (res.win) BSFX.win(); else BSFX.lose();
  /* Raidet er vunnet: ballen lukker seg rundt den (show.js), og så kommer oppsummeringen. */
  if (res.cau && typeof raidCaught === 'function') return raidCaught(B, res);
  overview();
}
/* ---------- En kamp som ble forlatt ----------
   liveGate kalles ved oppstart. Er det en kamp i gang på denne enheten, er det bare to veier videre: fortsette der den var, eller gi opp (som er et tap). */
const LIVEN = { league: 'League battle', fac: 'Frontier battle', pwt: 'cup match', raid: 'raid' };
function liveGate() {
  if (!S.started || !S.live || !liveMine()) return false;
  const B = liveLoad(), L = S.live;
  if (!B) {
    const w = liveLoss(); render();
    ov(`<div class="mid"><div><h1 class="big">You left a battle.</h1><p class="mut" style="margin-top:10px">The ${esc(w)}${L.n ? ' against ' + esc(L.n) : ''} was not finished, and it could not be brought back. It counts as a loss.</p></div></div>
      <div class="acts"><button type="button" class="btn pri" data-a="home">Continue</button></div>`, 'tint', 'var(--red)');
    return true;
  }
  BT.live = B;
  const f = B.foe[B.b], m = B.me[B.a], left = t => t.filter(x => x.hp > 0).length;
  ov(`<div class="mid"><div><div class="evr-k" style="color:var(--gold)">Battle in progress</div><h1 class="big" style="margin-top:6px">${esc(who(B.tr))}</h1><p class="mut" style="margin-top:8px">You left in the middle of this ${LIVEN[B.mode] || 'battle'}. It is saved after every turn and goes on where it was.</p></div>
      <div class="card stack" style="width:100%"><div class="row" style="justify-content:space-between"><span class="row" style="gap:10px">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '44px' })}<span><b>${esc(m.name)}</b><br><span class="sm tn">${left(B.me)} of ${B.me.length} left</span></span></span><span class="sm">turn ${B.turn}</span><span class="row" style="gap:10px;text-align:right"><span><b>${esc(f.name)}</b><br><span class="sm tn">${left(B.foe)} of ${B.foe.length} left</span></span>${spr(f.id, { sh: f.sh, mega: f.mega, s: '44px' })}</span></div></div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="lresume">Continue the battle</button></div>
    <button type="button" class="btn wide nf" data-a="lgive">Give up · counts as a loss</button>`, 'tint', `var(--t${B.tr.ty})`);
  return true;
}
function liveOther() {
  const L = S.live;
  openSheet(`<h2 class="h" style="margin-top:0">A battle is in progress</h2><p class="sm">You started a ${LIVEN[L.m] || 'battle'}${L.n ? ' against ' + esc(L.n) : ''} on another device, and it is not finished. Finish it there first.</p><p class="sm" style="margin-top:8px">If that is not possible, you can give it up here. It then counts as a loss.</p>
    <button type="button" class="btn wide danger" data-a="lgiveo" style="margin-top:12px">Give it up · counts as a loss</button><button type="button" class="btn wide" data-a="close">Close</button>`);
}
/* Tegner kampen slik den sto: de to som er inne, HP, vær og raseri. Ingen intro, og ingen ny utsendelse. */
async function resumeBattle(B) {
  BT.B = B; BT.menu = 'main'; BT.res = null; BT.ty = 0; BT.busy = true; BT.live = null;
  const vis = s => { const i = s === 'me' ? B.a : B.b, b = (s === 'me' ? B.me : B.foe)[i]; return { i, hp: b.hp, st: b.status }; };
  BT.v = { me: vis('me'), foe: vis('foe') };
  ov('<div class="mid"><p class="mut">Back to the battle…</p></div>', 'battle');
  try { await Promise.race([PACK.prep(B), new Promise(r => setTimeout(r, 4000))]); } catch (_) {}
  if (BT.B !== B) return;
  drawBattle(); drawMenu(); packHint();
  if ($('#trn')) $('#trn').classList.add('out');
  for (const side of ['foe', 'me']) { const b = teamOf(side)[BT.v[side].i], sp = $('#s-' + side); if (b.hp > 0) { paintSprite(side, b.v && b.v.away ? 'away' : ''); if (b.v && b.v.sub && sp) sp.classList.add('subd'); paintBox(side); } }
  const ar = $('#arena'); if (B.wx && B.wx.k) ar.dataset.wx = B.wx.k;
  if (B.rage) { ar.classList.add('raging'); if (BT.airO) BT.airO.k = 1.5; }
  if (B.sin) { dkLook(B); setTimeout(() => { if (BT.B === B && $('#arena')) dkLook(B); }, 600); }
  battleMusic(B);
  await bwait(350); if (BT.B !== B || !$('#arena')) return;
  if (B.over) return endBattle();
  BT.busy = false; setText(B.need ? 'Choose your next Pokémon.' : `What will ${B.me[B.a].name} do?`); BT.menu = 'main'; drawMenu();
  /* Sto en tvungen runde for tur (lading eller hvile), går den av seg selv som ellers. */
  if (!B.need) { const a = autoAct(B); if (a) { BT.busy = true; await bwait(400); if (BT.B === B) playEv(runTurn(B, a)); } }
}
/* Mewtwo er slått, men reiser seg som Dark Mewtwo (finishRaid): en kort overgang på banen, og så runde to. Det er en helt ny kamp, så laget er friskt,
   og filmen til Dark Mewtwo spilles først, som ved et vanlig raid. */
async function darkRise(B) {
  const ar = $('#arena'), ok = () => BT.B === B && !!$('#arena');
  BT.busy = true; await bwait(600); if (!ok()) return;
  await say(BT.res && BT.res.mew ? 'Mewtwo is beaten, and it is yours…' : 'Mewtwo is beaten…'); if (!ok()) return;
  BSFX.dread(); buzz([40, 60, 40, 60, 200]); shake(1100, 3); ar.classList.add('dkrise');
  await Promise.all([say('…but its shadow stays behind, and it is rising!'), new Promise(r => setTimeout(r, 1400))]); if (!ok()) return;
  await say('Your team is restored. This is not over.'); if (!ok()) return;
  BT.busy = false; startBattle(raidBattle(BT.lead, B.mode === 'lab' ? 'dk' : undefined));
}

/* ---------- Etter kampen ---------- */
const encLine = res => res.encs.length ? `<div class="row" style="justify-content:space-between"><span>Encounters</span><b>${res.encs.length} waiting in the grass${res.encs.some(e => e.t >= 4) ? ' · legendary' : res.encs.some(e => e.t >= 3) ? ' · epic' : ''}</b></div>` : '';
const tyEl = x => mTypes(x).filter(t => t >= 0).map(t => `<span class="ty" style="background:var(--t${t})">${TYN[t]}</span>`).join(' ');
const monCard = (x, a, k, on) => `<button type="button" data-a="${a}" data-k="${k}" aria-pressed="${!!on}" class="${x.mega ? 'mega' : ''}" style="--tc:var(--t${mTypes(x)[0]})">${spr(x.id, { ani: 1, mega: x.mega })}<b>${esc(mName(x))}</b><span class="sm tn">Lv ${x.lv}${x.iv ? ' · ' + judge(x).t : ''}</span><span class="row" style="gap:4px;justify-content:center;flex-wrap:wrap">${tyEl(x)}</span>${x.mv ? `<span class="mvl">${x.mv.map(i => esc(MOVES[i][0])).join(' · ')}</span>` : ''}</button>`;
/* Premien for en klar runde i Battle Frontier: behold én av de fire du leide. Brukes på resultatskjermen og fra forsiden (hvis valget ble utsatt). */
function keepCard(sheet) {
  const kl = facKeepList(); if (!kl.length) return '';
  return `<div class="${sheet ? 'stack' : 'card stack'}"><div class="row" style="justify-content:space-between"><b>Keep one of your rentals</b><span class="sm tn">round reward</span></div><p class="sm">You cleared the round. One of the four you rented can join your own Pokémon, at Lv ${kl[0].lv} and in the form that level allows.</p>
    <div class="rent">${kl.map((x, i) => monCard({ id: x.id, lv: x.lv, iv: x.iv, nat: x.nat, sh: x.sh }, 'fkeep', i)).join('')}</div>
    <button type="button" class="btn wide" data-a="fkeepno">No thanks</button></div>`;
}
/* Bildet til en gjenstand fra butikken (ball, stein, godteri), i samme form som i butikken. */
const itPic = (k, s) => !SHOP[k] ? '' : SHOP[k].img ? ballEl(k, s || '30px') : SHOP[k].ic === 'egg' ? '<span class="egg" style="transform:scale(.7)"></span>' : `<span class="${SHOP[k].ic}${k === 'mstone' ? ' mg' : ''}"></span>`;
function overview() {
  const B = BT.B, res = BT.res, tr = B.tr, fac = res.mode === 'fac', lab = res.mode === 'lab', raid = res.mode === 'raid', cup = res.mode === 'pwt', first = !res.shown, nm = esc(tr.wild ? tr.n : who(tr));
  /* Laget: XP-linja fylles opp etter kampen, og nye nivåer og angrep vises her. */
  /* I ligaen og raidet er det de som kjempet. I Frontier og turneringen er det ditt eget lag som får XP for seieren (leie-Pokémonene er ikke dine). */
  const rows = lab ? [] : fac || cup ? S.party.map(monBy).filter(m => m && res.ups.some(x => x.u === m.u)).map(m => ({ src: m, id: m.id, sh: m.sh, mega: m.mega, name: mName(m), hp: 1 })) : raid && !res.ups.length ? [] : B.me;
  const team = !rows.length ? '' : `<div class="card stack">${fac || cup ? '<div class="lab">XP for your own team</div>' : ''}${rows.map(b => {
    const m = b.src, u = res.ups.find(x => x.u === m.u), l = first && u ? u.l0 : m.lv, x = first && u ? u.x0 : m.xp, f = Math.max(0, Math.min(1, (x - xpAt(l)) / (xpAt(l + 1) - xpAt(l))));
    return `<div class="hofr${u && u.l1 > u.l0 && !first ? ' lvup' : ''}" data-row="${m.u}">${spr(b.id, { sh: b.sh, mega: b.mega, s: '48px' })}<div class="sp"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><b class="sm tn lvt">${u && u.l1 > u.l0 && !first ? `Lv ${u.l0} → ${u.l1}` : 'Lv ' + l}</b></div>
      <div class="xpbar" style="margin-top:6px;height:6px"><i style="width:${Math.round(f * 100)}%"></i></div>
      <div class="sm tn" style="margin-top:4px">${u ? '+' + nb(u.xp) + ' XP' : 'No XP this time'}${b.hp <= 0 ? ' · fainted' : ''}${u && (u.learned || []).length ? ' · learned ' + esc(u.learned.join(', ')) : ''}</div>
      ${(m.nm || []).length ? `<button type="button" class="newmv" data-a="blearn" data-u="${m.u}" style="margin-top:6px;width:100%;text-align:left"><span class="bang">!</span><span class="sm" style="color:var(--ink)">Wants to learn <b>${esc(MOVES[m.nm[0]][0])}</b>${m.nm.length > 1 ? ' +' + (m.nm.length - 1) : ''}</span></button>` : ''}</div></div>`; }).join('')}</div>`;
  /* Cynthia og Ghetsis: det de gir, i et eget kort over resten (res.sp, se finishLeague). */
  const P = res.sp, spRow = (pic, b, s) => `<div class="spw-r"><span class="spw-i">${pic}</span><span class="sp"><b>${b}</b>${s ? `<span class="sm tn">${s}</span>` : ''}</span></div>`;
  const spc = P ? `<div class="card spw" style="--cc:${P.cc || 'var(--gold)'}"><div class="sm">${esc(P.cn || 'The greatest')}</div><b class="spw-h">${esc(P.n)} is beaten</b>
      ${spRow('<span class="coin"><i></i></span>', 'Double coins', '+' + nb(P.extra) + ' on top of the win')}${P.sig ? spRow(spr(P.sig, { sh: 1, s: '40px' }), 'A shiny ' + esc(D(P.sig)[0]), 'waiting in your encounters · shinies are stronger') : ''}
      ${spRow('<span class="raid-sp qm"><i>?</i></span>', 'A legendary encounter', 'who it is shows when you meet it')}${spRow(itPic('candy'), P.candy + ' Rare Candy', '')}${spRow(itPic('mstone'), 'A Mega Stone', '')}
      ${P.first ? spRow(itPic('master'), 'A Master Ball', 'the first time you beat ' + esc(P.n)) : ''}</div>` : '';
  const rew = res.win && !lab ? `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Rewards${tr.boss ? ' · ' + esc(tr.cn) : ''}</b><span class="pill tn">×${B.sm} study bonus${B.boost.mode === (fac ? 'factory' : 'league') ? ' · today\'s bonus' : ''}</span></div>
      <div class="row" style="justify-content:space-between"><span>Coins</span>${coinEl(res.coins)}</div>
      ${res.items.map(x => `<div class="row" style="justify-content:space-between"><span>Item</span><b>${esc(x)}</b></div>`).join('')}${encLine(res)}
      ${res.got ? `<div class="row" style="justify-content:space-between"><span>Traded for</span><b>${esc(res.got)}</b></div>` : ''}${res.cau && monBy(res.cau.u) ? `<div class="row" style="justify-content:space-between"><span>Caught</span><b>${esc(mName(monBy(res.cau.u)))}${res.cau.isNew ? ' · new species' : ''}</b></div>` : ''}${res.note ? `<p class="sm">${esc(res.note)}</p>` : ''}${(res.perks || []).map(x => `<p class="sm" style="color:var(--gold)">${esc(x)}</p>`).join('')}</div>` : '';
  /* Byttetilbud (ligaen) og bytte av leie-Pokémon (Frontier). */
  let extra = '';
  if (res.trade) {
    const tp = BT.tp;
    extra = `<div class="card stack"><b>${esc(tr.n)} offers a trade</b><p class="sm">${tp == null ? 'Pick one of these, then one from your team to give up. Or keep your team and get an extra encounter instead.' : `Who do you give up for ${esc(D(res.trade[tp].id)[0])}?`}</p>
      <div class="rent">${tp == null ? res.trade.map((x, i) => monCard(x, 'tpick', i)).join('') : S.party.map(monBy).filter(Boolean).map(m => monCard(m, 'tgive', m.u)).join('')}</div>
      <button type="button" class="btn wide" data-a="${tp == null ? 'tskip' : 'tback'}">${tp == null ? 'Keep my team · extra encounter' : 'Back'}</button></div>`;
  } else if (res.keep && S.fac.keep && S.fac.keep.length) {
    extra = keepCard();
  } else if (res.kept && monBy(res.kept)) {
    const km = monBy(res.kept); extra = `<div class="card stack"><div class="row" style="gap:12px;align-items:center">${spr(km.id, { sh: km.sh, s: '56px' })}<div class="sp"><div class="sm">Round reward</div><b>${esc(mName(km))} joined you</b><div class="sm tn">Lv ${km.lv} · ${judge(km).t} · it is in your box</div></div></div></div>`;
  } else if (res.swap) {
    const fs = BT.fs;
    extra = `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Swap one in?</b><span class="sm tn">optional</span></div><p class="sm">You may take one of ${esc(tr.n)}'s Pokémon in exchange for one of yours. You see both teams side by side, and nothing is final until you press Next.</p>
      <div class="swprev">${res.swap.map(x => spr(x.id, { mega: x.mega, s: '46px' })).join('')}</div>
      <button type="button" class="btn wide" data-a="swopen">Look at their team</button></div>`;
  }
  const L = S.lad, R = S.fac.run;
  const next = raid ? esc(res.note) : cup ? (!res.win ? esc(res.note) : res.done ? `You won the ${esc(res.cup)}. A new cup opens after your next day of focus.` : `Next: the ${ROUNDN[res.r + 1].toLowerCase()} of the ${esc(res.cup)}. Your team is healed.`) : lab ? (B.exh ? 'Showcase battle: nothing was at stake, and your progress is untouched.' : 'Sandbox battle: no XP or rewards, and your League and Frontier progress are untouched.')
    : fac ? (res.win ? (res.roundDone ? `Round ${res.round} cleared. Round ${res.round + 1} has stronger rentals and opponents.` : `Next: battle ${R.w + 1} of ${FACN}${R.w === FACN - 1 ? ' · the boss' : ''}`) : `The run ends at a streak of ${res.streak}. ${res.left ? 'You have one more run today.' : 'The Frontier opens again after your next day of focus.'}`)
    : res.win ? (res.lapDone ? `Lap cleared: that was today's lap. Lap ${L.lap + 1} opens on your next battle day, with stronger trainers, bigger teams and better rewards.` : 'Next: ' + esc(leagueTag()) + (L.n >= LAPN - 1 ? ' · the final' : '')) : (res.left ? `You have one more attempt: ${esc(tr.n)} is still waiting.` : `The lap ends here, at battle ${(res.at || 0) + 1} of ${LAPN}. A new lap starts from battle 1 on your next battle day, and your team keeps the XP it earned.`);
  const open = lab ? true : raid ? false : cup ? !!pwtRun() : fac ? facOpen() && (!!R || !!res.left) : ladderOpen();
  ov(`<div class="hof"><div class="hof-h"><span>${res.win ? 'VICTORY' : 'DEFEAT'}</span><span class="tn">${esc(battleTag(B))}</span></div>
      <div class="hof-stage">${B.me.map((b, i) => `<span style="--i:${i};--n:${B.me.length}" class="${b.hp <= 0 ? 'ko' : ''}">${spr(b.id, { ani: 1, sh: b.sh, mega: b.mega })}</span>`).join('')}</div>
      <p class="hof-t">${res.win ? (res.cau ? `You beat ${nm}, and it is yours.` : `You beat ${nm}.`) : lab ? `${nm} won this time.` : cup ? `${nm} knocked you out of the cup.` : fac ? `${nm} stopped your run.` : res.left ? `${nm} won this time. You have one more attempt.` : `${nm} won this time. The lap is over.`}</p></div>
    ${team}${spc}${rew}${extra}${res.ring ? `<div class="card mgring"><div class="row" style="gap:12px;align-items:center"><span class="gem mg" style="width:34px;height:34px;flex:none"></span><div class="sp"><div class="sm">A Champion's gift</div><b style="font-size:19px">The Mega Ring</b><p class="sm" style="margin-top:4px">Give your Mega Stone to a Pokémon that has a Mega form, on its card. It can then Mega Evolve once a battle, from the move menu.</p></div></div></div>` : ''}
    <div class="card"><span class="sm" style="color:var(--ink)">${next}</span></div>
    <div class="acts">${lab ? (B.exh ? '<button type="button" class="btn gold" data-a="show">Back to the showcase</button>' : isAdmin() ? '<button type="button" class="btn gold" data-a="lab">Back to the Sandbox</button>' : '') + '<button type="button" class="btn nf" data-a="home">Done</button>' : (res.win || res.left) && open ? `<button type="button" class="btn gold" data-a="${cup ? 'wenter' : fac ? 'fenter' : 'bpre'}">${cup ? 'Next round' : !res.win ? (fac ? 'Start a new run' : 'Rematch') : fac && res.roundDone ? 'Pick new rentals' : fac && res.swap ? 'Next battle · keep my four' : 'Next battle'}</button><button type="button" class="btn nf" data-a="home">Done</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`, 'tint ovtop', res.win ? 'var(--gold)' : 'var(--red)');
  if (first && team) setTimeout(animXp, 500);
  res.shown = 1;
}
/* XP-linjene fylles, og de som går opp i nivå får ny linje og gullfarget nivå. */
function animXp() {
  const res = BT.res; if (!res) return;
  let up = false;
  for (const u of res.ups) {
    const m = monBy(u.u), row = document.querySelector(`[data-row="${u.u}"]`); if (!m || !row) continue;
    const bar = row.querySelector('.xpbar i'), lvt = row.querySelector('.lvt'), f1 = Math.round(Math.max(0, Math.min(1, (m.xp - xpAt(m.lv)) / (xpAt(m.lv + 1) - xpAt(m.lv)))) * 100);
    if (u.l1 > u.l0) { up = true; bar.style.width = '100%'; setTimeout(() => { if (!bar.isConnected) return; bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = ''; bar.style.width = f1 + '%'; row.classList.add('lvup'); lvt.textContent = `Lv ${u.l0} → ${u.l1}`; }, 900); }
    else bar.style.width = f1 + '%';
  }
  if (up) setTimeout(() => { if (BT.res === res) sfx.lvl(); }, 900);
}
/* «Vil lære»: som i spillene. Velg hvilket angrep som skal glemmes, eller la være. back = hvor vi kom fra. */
function learnSheet(m, back) {
  const x = (m.nm || [])[0];
  if (x == null) { closeSheet(); if (back === 'ov') overview(); else { render(); monSheet(m); } return; }
  U.learn = { u: m.u, back };
  const mv = MOVES[x];
  openSheet(`<h2 class="h">${esc(D(m.id)[0])} wants to learn ${esc(mv[0])}</h2>
    <div class="newmv">${moveEl(x)}<span class="sm tn">${mv[2] ? 'Power ' + mv[2] : 'No damage'} · ${mv[3] ? mv[3] + '% accuracy' : 'never misses'} · PP ${mv[18]}${window.DEADMV && DEADMV.has(x) ? ' · has no effect in battles yet' : ''}</span></div>
    <p class="sm">It already knows four moves. Tap the one to forget, or keep them as they are.</p>
    <div class="mvg">${m.mv.map(k => moveEl(k, { btn: 1, act: 'lforget', m })).join('')}</div>
    <button type="button" class="btn wide" data-a="lskip">Don't learn ${esc(mv[0])}</button>`);
}

/* ---------- Battle Frontier ---------- */
/* World Tournament: runden som venter. Motstanderens lag vises (som i ekte turneringer), og du velger hvem av dine som spiller. */
function pwtScreen() {
  const R = pwtRun(); if (!R) { closeOv(); return render(); }
  const f = pwtFoe(), c = f.c, tr = f.tr, tier = TIER(tr.kind), party = S.party.map(monBy).filter(Boolean), sel = BT.wsel = (BT.wsel || []).filter(u => party.some(m => m.u === u)).slice(0, R.n);
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">${esc(c.n)}</span></div>
    <div class="card stack k-${tier}"${kst(tr)}><div class="lgp" aria-hidden="true">${ROUNDN.map((_, i) => `<i class="${i < R.r ? 'on' : i === R.r ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${ROUNDN[R.r]} · ${esc(tr.cn)}</div><b class="bossn" style="font-size:19px">${esc(who(tr))}</b><div class="sm tn" style="margin-top:4px">${R.n} Pokémon at Lv ${R.flv || R.lv} · yours play at Lv ${R.lv}</div></div></div>
      <div class="pvs">${f.team.map(x => `<div class="pv">${spr(x.id, { ani: 1, mega: x.mega })}<b>${esc(D(x.id)[0])}</b><span class="row" style="gap:4px;justify-content:center;flex-wrap:wrap">${tyEl(x)}${x.ms ? '<span class="pill mgp">Mega Stone</span>' : ''}</span></div>`).join('')}</div>
      <p class="sm">Win this round: ${nb(pwtCoins(c, R.r))} coins.${R.r === PWTN - 1 ? ` Win the cup: a trophy, ${PWTCANDY} Rare Candy and ${aN(PACKS[c.pk].n)}.` : ''} No Bag, and one loss ends the cup.</p></div>
    <div><div class="lab">Your team · pick ${R.n}, the first one leads</div><div class="lineup">${party.map(m => { const i = sel.indexOf(m.u); return `<button type="button" data-a="wsel" data-u="${m.u}" class="${i >= 0 ? 'lead' : ''}">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega })}<span class="sp"><b>${esc(mName(m))}</b><br><span class="sm tn">${m.lv === R.lv ? 'Lv ' + m.lv : `Lv ${m.lv} → ${R.lv}`}</span> ${tyEl(m)} ${evTag(m)}</span>${i >= 0 ? `<span class="pill">${i + 1}</span>` : ''}</button>`; }).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="wgo"${sel.length === R.n ? '' : ' disabled'}>${sel.length === R.n ? 'Start the ' + ROUNDN[R.r].toLowerCase() : `Pick ${R.n - sel.length} more`}</button></div>`, 'tint', `var(--t${tr.ty})`);
}
/* Reglene samlet: hva som gir hva, og når det skjer. Tallene hentes fra de samme tabellene som spillet bruker. */
function rulesSheet() {
  const d = diff(), g = hrs(goalMin()), pk = k => `${PACKS[k].n} ${nb(PACKS[k].p)}`, row = (a, b) => `<div class="row" style="justify-content:space-between;gap:12px;align-items:flex-start"><span class="sm" style="color:var(--ink);flex:none">${a}</span><span class="sm tn" style="text-align:right">${b}</span></div>`;
  openSheet(`<h2 class="h" style="margin-top:0">Rules and rewards</h2>
    <div class="stack">
    ${S.lad.day && MODESN < MODES.length && !modePicks() ? `<div class="card stack"><b>Today</b>${row('Mode', modeSt().ks.map(k => MODEN[k]).join(', '))}${row('Bonus coins today', `${MODEN[dayBoost().mode]} · ×${DAYCOIN}`)}${evNow() ? row('Special event', esc(evInfo(evNow()).n) + ' · ' + esc(evInfo(evNow()).s)) + '<button type="button" class="btn sm2 wide" data-a="evinfo">See what today\'s event does</button>' : row('Special event', 'none today')}</div>` : ''}
    <div class="card stack"><b>Focus sessions</b><p class="sm">Your subjects count in full: 10 XP and 3 coins a minute, an encounter every 20 minutes, and every minute moves the battle bonus. Other things you log, such as job applications, music or reading, count at half value, and their hours are kept apart from your subject hours. The first session of the day gives ×1.5.</p>
      ${row('Subjects', 'full value')}${row('Other things', '×' + OTHERW)}</div>
    <div class="card stack"><b>Battle bonus</b><p class="sm">Battles are where most coins come from, and every minute of focus raises today's bonus: from ×0.5 up to ×${goalTop().toFixed(1)} at your goal of ${g} h. It multiplies the coins you win in the League, the Frontier and the Tournament. XP and the odds for Rare Candy grow the same way, from ×0.7 to ×1.3, in all three modes. Raid rewards are fixed.</p>
      ${row('Right now', '×' + studyMult())}${row('First League win of the day', 'double coins')}${row('Difficulty · ' + d.n, `coins ×${d.coin} · XP ×${d.xp} · Rare Candy ×${d.candy}<br>Bag ${d.bag} · raids ×${d.rf} as often`)}${row('All three', DIFF.map(x => `${x.n} ×${x.coin}`).join(' · ') + '<br>Hard pays the most of everything')}${row('Battles open', `after ${OPENMIN} minutes of focus that day`)}${row('A day of battles', `League: one lap, and one loss ends it${DIFF[0].lives > 1 ? ' (two on Easy)' : ''}<br>Frontier ${FACLIVES} runs · Tournament 1 cup · Raid 1 attempt`)}</div>
    ${MODESN < MODES.length ? `<div class="card stack"><b>One mode a day</b><p class="sm">When you press Done for today, you choose ${MODESN === 1 ? 'one' : MODESN} of the three modes for that battle day. The other two stay closed until your next battle day, and the choice cannot be changed. Each day one of the three pays bonus coins: which one is shown when you choose. Raids are separate: one that is waiting shows itself when the day's battles are done.</p>
      ${row('Bonus mode', `coins ×${DAYCOIN}`)}${row('League on its bonus day', '+30 % XP, better odds for Rare Candy')}${row('Frontier on its bonus day', '1.5× luck on items and encounters')}</div>` : ''}
    <div class="card stack"><b>No time to battle</b><p class="sm">Playing the battles yourself always pays best, but a day is never lost. <b>Not today</b> closes the day without battles. <b>Simulate</b> lets the game play the day's battles with your team: you see what it won before you accept, and you can undo it once (then there is no more simulating that day). You can also leave the battles until the next day: they are marked as yesterday's, pay yesterday's bonus, and stay open until you start a new session.</p>
      ${row('A simulated day', `${Math.round(SIMPAY * 100)} % of the coins and the XP`)}${row('Not included', 'Rare Candy, items, encounters and trades<br>medals, lap wins and the extra raid draw')}${row('Either way', 'a raid that was waiting shows itself')}</div>
    <div class="card stack"><b>Trainer League</b><p class="sm">Your own team, ${LAPN} battles a lap. The first is always a trainer. From there the class usually rises one step for every battle, sometimes two, and sometimes it stays, so no two laps are the same. Who is waiting, you find out in the intro. The whole team gets XP after every battle, and bosses give Rare Candy and items. <b>One loss ends the lap</b>: the League closes for the day, and your next lap starts from battle 1. On Easy you can lose once and try again against the same trainer. A lap you win is the lap for that day, so the Mega Ring and the later laps are earned one clean run at a time.</p>
      ${row('Battle ' + LAPN, 'always a Champion')}${row('Or one of the greatest', `${Math.round(SUPP(0) * 100)} % in the first lap, up to ${Math.round(SUPP(99) * 100)} %`)}${row('Cynthia or Ghetsis beaten', `double coins · ${SPCANDY} Rare Candy · a Mega Stone<br>a shiny Gible or Deino · a legendary encounter<br>the first time: a Master Ball`)}
      ${row('Rare prizes', `Champion ${Math.round(RAREP[0] * 100)} % · Supreme Boss ${Math.round(RAREP[1] * 100)} %, in all three modes<br>a purse: your next battle day pays ${Math.round((PURSEM - 1) * 100)} % more coins<br>a bag of coins: ${RAREGOLD} times what the battle paid<br>gear for a Pokémon to hold · a Prism Lure<br>a Master Ball · a shiny Pokémon in the grass`)}
      ${row('Their teams', 'the ace and the signature Pokémon are fixed<br>the rest change a little from time to time')}
      ${row('Coins per win', `${TCL.trainer.coin} for a trainer up to ${TCL.champ.coin} for a Champion<br>${TCL.supreme.coin} for one of the greatest`)}
      <p class="sm"><b>Cynthia</b> and <b>Ghetsis, Champions Edition</b> are the rarest finals. Each has a film of their own and a team to match, and pays half again as many coins, with one more legendary encounter, Rare Candy and a Mega Stone on top.</p></div>
    <div class="card stack"><b>Battle Frontier</b><p class="sm">Rental Pokémon at Lv ${FACLV}: you open seven balls and pick four. ${FACN - 1} trainers and then a boss a round. After a win you may swap one of theirs for one of yours. You win coins, items and encounters, and your own team gets XP for every win. A loss ends the run, and you can start ${FACLIVES} runs a day.</p>
      ${row('Coins per win', `${Math.round(FACCOIN * 30)} to ${Math.round(FACCOIN * (30 + 12 * (FACN - 1)))} × bonus in round 1<br>${Math.round(FACCOIN * 15)} more for every round after it`)}${row('Round cleared', `${FACROUND(1)} and up × bonus<br>and you keep one of your four rentals`)}</div>
    <div class="card stack"><b>World Tournament</b><p class="sm">One cup a day, a new one each day of the week. Quarter-final, semi-final and final, three on three. Your three all play at your team's level, whatever level they really are, and the opponents stand at the same level on Hard and a little below it on Normal and Easy. You see the opponent's team before you pick. No Bag, and one loss ends the cup. Every round you win gives your own team XP.</p>
      ${row('Coins per round', PWTCOIN.join(' · ') + ' × cup × bonus')}${row('Leaders cups · Elite Four · Champions', CUPS.slice(1, 2).concat(CUPS[6], CUPS[0]).map(c => '×' + c.f).join(' · '))}${row('Winner', `trophy · ${PWTCANDY} Rare Candy · a pack`)}</div>
    <div class="card stack"><b>Legendary raids</b><p class="sm">Rare, and never on a fixed day. One legendary against your whole team, and who it is stays secret until you stand in front of it. You get ${RAIDTRIES} attempts, one a day: the first without knowing who is waiting, the second knowing. Then it moves on. It stands well above your team's level and has ${RAIDHP[0]} to ${RAIDHP[4]} times the HP of a normal Pokémon. Beat it and it is yours: winning is the catch.</p>
      <p class="sm">It cannot be knocked out in one hit, and Super Fang, Endeavor, Pain Split, Destiny Bond and Perish Song do nothing to it. Poison, a burn, Leech Seed and a curse take the same HP as from any Pokémon, which is a small part of its long HP bar. Sleep, paralysis and lowered stats work as usual.</p>
      ${row('It appears', 'about once a week on Normal if you study every day<br>nearly twice as often on Hard, less often on Easy<br>likelier the longer since the last one')}
      ${row('It shows itself', 'when the day\'s battles are played, simulated or skipped')}${row('New ones first', 'never one you own<br>while there is one you lack')}${row('As you collect', 'the great ones and the three rarest come more often,<br>the common and the mythical less')}${row('Your first raid', 'one of the very strongest:<br>it shows how far there is to go')}
      ${row('One more draw', 'reaching your daily goal<br>winning a League lap or a Frontier round')}
      ${row('Team level needed', `mythical ${RAIDGATE[2]} · the great ones ${RAIDGATE[1]} · Mewtwo, Arceus, Deoxys ${RAIDGATE[3]}`)}
      ${row('Its place fights too', `an event every ${RAIDEV}rd turn<br>enraged below half HP`)}
      ${row('Coins', RAIDCOIN.map(nb).join(' · '))}${row('Rare Candy', RAIDCANDY.join(' · '))}
      ${row('Shiny', `1 in ${nb(SHINYN)} · 1 in ${Math.round(1 / PRISMP)} with a Prism Lure`)}${row('Sacred Ash', 'once in a raid: every fainted Pokémon is back at half HP')}
      <p class="sm">The five steps are: legendary, the great ones, mythical, Mewtwo, Arceus and Deoxys, and Dark Mewtwo. A win also gives a lot of XP, and the legendary is yours.</p>
      <p class="sm"><b>Mewtwo, Arceus and Deoxys</b> are the three hardest. <b>Mewtwo</b> has Psystrike and Aura Sphere whatever its level. <b>Arceus</b> changes plate every ${ARCEV}rd turn: it takes a type that resists what you last hit it with, and Judgment follows, so you have to vary your attacks. Neither of the two runs out of PP. <b>Deoxys</b> changes shape: it opens in Attack Forme, turns to Defense Forme after ${DEOXT} turns, and goes back to Attack Forme when it is enraged.</p>
      <p class="sm"><b>Dark Mewtwo</b> has no raid of its own. Beat Mewtwo and it is yours, and its shadow always rises as Dark Mewtwo, until you own the dark one. You keep what Mewtwo gave, your team is restored, and you fight once more, right away, with ${RAIDTRIES} attempts. Win, and Dark Mewtwo takes the place of your Mewtwo, with perfect IVs, a Timid nature and full training (a shiny Mewtwo is never taken: then the dark one joins you as its own). Lose, and you still have Mewtwo. Partway through that fight it is provoked and restores its strength. With <b>Arceus</b> on your team and still standing at that moment, it cannot: the light holds the darkness back.</p></div>
    <div class="card stack"><b>Items to hold</b><p class="sm">Each Pokémon can hold one item, given from its card. It works by itself in the League, the tournament and raids. The rentals in the Battle Frontier hold nothing, and neither do your opponents.</p>
      ${row('Berries · used up', 'Sitrus: a quarter of its HP back at half HP<br>Lum: cures a status condition<br>one against each type: halves one super effective hit')}${row('Plates · they last', `one type hits ${Math.round((PLATEX - 1) * 100)} % harder`)}
      ${row('Gear · it lasts', 'Leftovers: 1/16 HP every turn · Shell Bell: 1/8 of the damage dealt<br>Life Orb: ×1.3, costs 1/10 HP per attack · Expert Belt: ×1.2 when super effective<br>Muscle Band and Wise Glasses: ×1.1 · Scope Lens: more critical hits<br>Rocky Helmet: contact costs the attacker 1/6 HP · Eviolite: Def and Sp. Def ×1.5 for one that can still evolve')}
      ${row('Focus Sash · used up', 'at full HP it survives a knockout hit')}${row('Found', `a berry after some sessions of ${BERRYMIN} minutes or more<br>the plate of its type from every legendary you beat`)}</div>
    <div class="card stack"><b>Special events</b><p class="sm">Some battle days are special. You find out once you have chosen today's mode: the event shows as a symbol above it, and a tap tells you what it does. An event is only ever for you, never for your opponents: nothing gets harder, and a day you sit out costs nothing. They are counted in battle days, come about every third one, and never two days running.</p>
      ${Object.keys(EVENTS).map(k => row(k === 'type' ? 'Type Festival' : EVENTS[k].n, k === 'surge' ? `${SURGEN} of your Pokémon with a Mega form start in it, and you choose which` : k === 'type' ? 'one type gets +15 % in every stat' : k === 'stars' ? 'three from your box: team level and +20 %' : k === 'little' ? '+35 % for those that can still evolve' : k === 'gold' ? 'coins ×1.5 from every battle' : k === 'wind' ? 'one more attempt in the League, one more run in the Frontier' : k === 'lucky' ? 'shiny odds ×5, one more encounter from bosses' : 'training costs 40 % less')).join('')}</div>
    <div class="card stack"><b>Mega Evolution</b><p class="sm">The first Champion or Supreme Boss you beat gives you the Mega Ring and a Mega Stone. A Pokémon that has a Mega form and holds a stone can Mega Evolve from the move menu: once a battle for your team, before it attacks, and it stays that way until the battle is over. Its HP is the same, its other stats and sometimes its types change, and some get an Ability of their own (Mega Mawile has Huge Power, Mega Charizard Y brings the sun, Mega Gengar no longer levitates). Stones are given on the Pokémon's card, and you get the stone back if you sell or trade it.</p>
      ${row('Mega Stone', `${nb(SHOP.mstone.p)} coins in the Shop, with the ring`)}${row('Won from', `Supreme Boss: always · Champion: ${Math.round(MSTONE[1] * 100)} % · Evil Leader: ${Math.round(MSTONE[0] * 100)} %<br>the Champions Cup · raids against the great ones`)}${row('Opponents', 'Champions and Supreme Bosses, on Normal and Hard')}
      <p class="sm"><b>Arceus</b> takes the type of the plate it holds, and Judgment with it.</p>
      <p class="sm"><b>Legendaries</b> do not use ordinary stones. Rayquaza, Kyogre, Groudon, Latias, Latios, Heatran and Darkrai change form when they become enraged in a raid, and the shadow of a beaten Mewtwo rises as Dark Mewtwo. Beat one, and you have its stone: every one of that species you own can then do the same.</p></div>
    <div class="card stack"><b>Training: IVs and EVs</b><p class="sm">As in the games. <b>IVs</b> are what a Pokémon was born with, 0 to 31 in each stat, and cannot be trained: from Lv ${HTLV} Hyper Training makes a stat count as 31. <b>EVs</b> are what training adds, at most ${EVMAX} in one stat and ${EVTOT} in all, so two stats can be maxed. Your partner gains 1 EV for every two minutes of focus, in the stat it has trained the most. Both are bought under Train on the Pokémon's card, both count more the higher its level, and neither can pass its cap. EVs can be cleared from a stat and placed somewhere else, but the coins are not returned.</p>
      ${row('At Lv 100', 'perfect IV: +31 in a stat<br>full EVs: +63 in a stat')}${row('One EV', `${EVP} coins`)}${row('Hyper Training', `${nb(HTP)} coins a stat, from Lv ${HTLV}`)}${row('One Pokémon, fully trained', `${nb(EVTOT * EVP)} coins for the EVs<br>up to ${nb(6 * HTP)} for Hyper Training`)}</div>
    <div class="card stack"><b>Shiny Pokémon</b><p class="sm">A shiny is born with perfect IVs in every stat and has ${Math.round((SHINYST - 1) * 100)} % higher stats than an ordinary one of its kind (a shiny Arceus ${Math.round((SHINYARC - 1) * 100)} %, and it glows), so the best Pokémon you can own is a fully trained shiny. The odds follow your streak, and incense from the Shop multiplies them for a while in the grass, in packs and in eggs. They can never pass 1 in ${Math.round(1 / SHINYCAP)}.</p>
      ${row('Incense', ['glint', 'gleam', 'radiant'].map(k => `×${SHOP[k].sb[0]} for ${SHOP[k].sb[1]} h`).join(' · '))}${row('Prism Lure', `the next raid: 1 in ${Math.round(1 / PRISMP)}`)}${row('Sold', 'five times the price')}</div>
    <div class="card stack"><b>Catching</b><p class="sm">Every encounter gives you three throws, four for a legendary. Stop the marker in the green zone for a good throw and in the gold for a perfect one. The dots at the top show how many are still waiting. Who they are, and how rare, you see when you meet them. A catch shows the Pokémon's potential (its IVs) in stars: from Lv ${HTLV} Hyper Training can make up for low ones.</p>
      ${row('New species', NEWCOIN.map((c, i) => `${TIERS[i].toLowerCase()} ${c}`).join(' · ') + ' coins')}
      ${row('Perfect throw', `+${PERFCOIN} coins`)}${row('Catches in a row', `+${STREAKC} coins each from the third, up to ${STREAKMAX}`)}
      ${row('Critical capture', 'now and then the ball holds extra well')}
      ${row('Dusk Ball', `Ultra Ball odds, ×${LEGBALL} on legendary Pokémon`)}${row('Golden Razz Berry', `one more throw and ×${BERRYM} odds, once per encounter`)}${row('Master Ball', 'never fails · you can carry one')}${row('Lure · Super Lure', `${LUREN} sessions: one more encounter · rarer Pokémon`)}</div>
    <div class="card stack"><b>Achievements and rank</b><p class="sm">Tap your picture to see them. An achievement has up to five steps. Every step you claim pays a reward and counts as one medal, and medals raise your rank: the frame and stamp around your picture. There are ${achTotal()} medals in all.</p>
      ${row('Reward for each step', ACOIN.map(nb).join(' · ') + ' coins')}${row('Type collectors', ATY.map(nb).join(' · ') + ' coins')}
      ${row('Some also give', 'Rare Candy or a Mega Stone')}
      ${row('Ranks', RANKS.map(r => `${r[0]} ${r[1]}`).join(' · ') + ' medals')}</div>
    <div class="card stack"><b>Fair play</b><p class="sm">The game trusts you with the clock and the timer, and closes the shortcuts it can.</p>
      ${row('Opening the battles', `needs ${OPENMIN} minutes of focus that day`)}${row('A battle you leave', 'is saved after every turn and goes on where it was<br>giving up counts as a loss')}
      ${row('The device clock', 'set back or ahead: sessions and battles pause until it is right again')}
      ${row('Backups and sync', 'only a newer save can replace the one on the device')}
      ${row('Badge rewards', `need ${MSGATE / 60} h logged in the subject each, ${BADGEGATE / 60} h for the legendary`)}
      ${row('Honest check', 'at night, after a very long day, or after four hours without a break')}
      <p class="sm">Nothing stops you from leaving the timer on without studying. Cheating is optional, but your integrity pays for it.</p></div>
    <div class="card stack"><b>Encounter packs</b><p class="sm">Three encounters a pack, bought in the Shop. The dearer the pack, the better the last card. Pokémon from packs sell for ${Math.round(PKSELL * 100)} % of the usual price.</p>
      ${row('Prices', ['poke', 'great', 'ultra', 'master'].map(pk).join('<br>'))}
      ${row('Legendary in the last card', ['poke', 'great', 'ultra', 'master'].map(k => `${PACKS[k].n.replace(' Pack', '')} ${+(PACKS[k].slots[2].leg * 100).toFixed(1)} %`).join(' · '))}
      <p class="sm">A legendary card does not say who it is: you find out when you meet it in the grass. It can be any legendary you do not own from your areas. Mythical Pokémon come a little more often, and the greatest ones are rare in packs. They are more often met in raids.</p></div>
    </div><button type="button" class="btn wide" data-a="close" style="margin-top:12px">Close</button>`);
}
function facScreen() {
  const R = S.fac.run; if (!R) return;
  if (R.offer && R.open != null && (R.open < 7 || !BT.fpick)) return facDraw(R);
  if (R.offer) {
    const sel = BT.fsel;
    return ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Battle Frontier · Round ${R.round}</span></div>
      <div><h1 class="big">Pick 4 of 7.</h1><p class="mut" style="margin-top:6px">Rental Pokémon, all at Lv ${FACLV} like everyone you meet. The first one you pick leads. A round is ${FACN - 1} trainers and then a boss, and you can swap in one Pokémon from each trainer you beat.</p></div>
      <div class="rent">${R.offer.map((m, i) => monCard(m, 'fsel', i, sel.includes(i)).replace('<b>', (sel.includes(i) ? `<span class="ord">${sel.indexOf(i) + 1}</span>` : '') + `<span class="fstar sm" aria-hidden="true">${'★'.repeat(facStars(m))}</span><b>`)).join('')}</div>
      ${sel.length >= 2 ? `<p class="sm" style="text-align:center">${teamWeak(sel.map(i => R.offer[i]))}</p>` : ''}
      <div class="acts"><button type="button" class="btn gold" data-a="fpick"${sel.length === 4 ? '' : ' disabled'}>${sel.length === 4 ? 'Take these four' : `Pick ${4 - sel.length} more`}</button></div>`, 'tint', 'var(--t8)');
  }
  const f = facFoe(), tr = facInfo(f), tier = TIER(tr.kind);
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Round ${R.round} · battle ${R.w + 1} of ${FACN}</span></div>
    <div class="card k-${tier}"${kst(tr)}><div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${f.boss ? (tr.ultra ? `${esc(RARE[tr.kind][0].toUpperCase() + RARE[tr.kind].slice(1))} · ${esc(tr.cn)} · extra rewards` : `Boss · ${esc(tr.cn)} · last battle of the round`) : 'Battle Frontier'}</div><b class="${f.boss ? 'bossn' : ''}" style="font-size:19px">${esc(who(tr))}</b><div class="sm tn" style="margin-top:4px">4 Pokémon at Lv ${FACLV} · favours ${TYN[f.hint]} types</div></div></div></div>
    <div><div class="lab">Your rentals · tap the one that leads</div><div class="lineup">${R.team.map((m, i) => `<button type="button" data-a="flead" data-k="${i}" class="${i ? '' : 'lead'}">${spr(m.id, { it: m.item, mega: m.mega })}<span class="sp"><b>${esc(mName(m))}</b><br><span class="sm tn">${m.mv.map(x => esc(MOVES[x][0])).join(', ')}</span></span>${i ? '' : '<span class="pill">Leads</span>'}</button>`).join('')}</div></div>
    <button type="button" class="btn wide nf" data-a="fstats">Stats and moves of your four</button>
    <div class="acts"><button type="button" class="btn gold" data-a="fgo">Start battle</button></div>`, 'tint', 'var(--t8)');
}
/* Typene minst to på laget er svake mot. */
function teamWeak(list) {
  const bad = TYN.map((n, t) => [n, list.filter(m => { const ty = mTypes(m); return CH[t][ty[0]] * (ty[1] >= 0 && ty[1] !== ty[0] ? CH[t][ty[1]] : 1) >= 2; }).length]).filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return bad.length ? 'Careful: ' + bad.map(x => `${x[1]} of them are weak to ${x[0]}`).join(', ') + '.' : 'No shared weakness so far. A good spread.';
}
/* ---------- Byttet etter en seier i Battle Frontier ----------
   Begge lag vises hver for seg og med navn. Ett trykk velger og viser sammendraget (verdier og angrep) nederst. Når én fra hvert lag er valgt,
   bytter de to plass med en liten animasjon, og du ser laget slik det blir. Ingenting er gjort før «Next»: da låses laget (handler swnext). */
function facSwapScreen() {
  const R = S.fac.run, res = BT.res, B = BT.B; if (!R || !R.team || !res || !res.swap) return overview();
  const W = BT.sw || (BT.sw = { a: null, b: null, view: null }), theirs = res.swap, mine = R.team, done = W.a != null && W.b != null;
  const myRow = mine.map((m, i) => done && i === W.b ? theirs[W.a] : m), thRow = theirs.map((m, i) => done && i === W.a ? mine[W.b] : m);
  const card = (m, side, i) => { const sel = side === 'th' ? W.a === i : W.b === i, on = W.view && W.view[0] === side && W.view[1] === i;
    return `<button type="button" class="swc${sel ? ' sel' : ''}${done && sel ? ' moved' : ''}${on ? ' on' : ''}${m.mega ? ' mega' : ''}" data-a="swtap" data-s="${side}" data-k="${i}" id="sw-${side}-${i}" style="--tc:var(--t${mTypes(m)[0]})" aria-pressed="${sel}">${spr(m.id, { it: m.item, mega: m.mega, s: '52px' })}<b>${esc(mName(m))}</b><span class="fstar" aria-hidden="true">${'★'.repeat(facStars(m))}</span>${sel ? `<span class="swt">${done ? (side === 'my' ? 'NEW' : 'GIVEN') : side === 'my' ? 'OUT' : 'IN'}</span>` : ''}</button>`; };
  const v = W.view, vm = v ? (v[0] === 'th' ? thRow : myRow)[v[1]] : null;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="swback">Back</button><span class="pill tn">Round ${R.round} · ${R.w} of ${FACN} won</span></div>
    <div><h1 class="big" style="font-size:26px">${done ? 'Swapped. For now.' : 'Swap one in?'}</h1><p class="sm" style="margin-top:6px">${done ? 'This is your team if you go on. Undo if you change your mind: nothing is final until you press Next.' : W.a != null ? 'Now tap the one of yours that leaves.' : W.b != null ? 'Now tap the one of theirs that comes in.' : 'Tap one of theirs and one of yours, in any order. Or keep your four.'}</p></div>
    <div class="swg"><div class="swl th"><span>${esc(who(B.tr))}</span><b>Their team</b></div><div class="swr th">${thRow.map((m, i) => card(m, 'th', i)).join('')}</div>
      <div class="swmid" aria-hidden="true"><i></i><span>${done ? 'swapped' : 'swap'}</span><i></i></div>
      <div class="swl my"><span>Lv ${FACLV} rentals</span><b>Your team</b></div><div class="swr my">${myRow.map((m, i) => card(m, 'my', i)).join('')}</div></div>
    <div class="acts">${done ? '<button type="button" class="btn nf" data-a="swundo">Undo</button>' : ''}<button type="button" class="btn gold" data-a="swnext">${done ? 'Next · lock this team' : 'Next · keep my four'}</button></div>
    ${vm ? sumCard(vm) : '<div class="fsum empty"><p class="mut">Tap a Pokémon to see its stats and moves.</p></div>'}`, 'tint', 'var(--t8)');
}

/* Battle Frontier: leie-Pokémonene trekkes én og én. Hver ball må åpnes og Pokémonen ses over (typer, verdier, angrep) før den neste kan åpnes.
   De som er åpnet, kan ses på igjen. Når alle sju er åpnet, velges laget. En Mega får sin egen fanfare. */
const STN6 = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
function sumCard(m, fresh) {
  const g = megaOf(m), st = statsOf(m), ty = mTypes(m), top = Math.max(...st.slice(1));
  return `<div class="fsum${g ? ' mega' : ''}${fresh ? ' pop' : ''}" style="--tc:var(--t${ty[0]})">
    <div class="fs-top">${spr(m.id, { it: m.item, ani: 1, mega: m.mega })}<div class="sp"><b class="fs-n">${esc(mName(m))}</b><div class="sm tn">Lv ${m.lv} · ${NAT[m.nat]} · ${judge(m).t}</div>${m.u ? '' : `<div class="fs-role"><span class="fstar" role="img" aria-label="Strength ${facStars(m)} of 5">${'★'.repeat(facStars(m))}<i>${'★'.repeat(5 - facStars(m))}</i></span><b>${facRole(m)}</b></div>`}<div class="row" style="gap:4px;margin-top:6px;flex-wrap:wrap">${tyEl(m)}${g ? '<span class="pill megap">MEGA</span>' : ''}</div></div></div>
    <div class="fs-st">${STN6.map((n, i) => `<div><span>${n}</span><i><b style="width:${Math.min(100, st[i] / 220 * 100).toFixed(0)}%;background:${i && st[i] === top ? 'var(--gold)' : 'var(--tc)'}"></b></i><em class="tn">${st[i]}</em></div>`).join('')}</div>
    <div class="fs-mv">${m.mv.map(x => { const mv = mvEff(null, { src: m }, MOVES[x]); return `<span style="--c:var(--t${mv[1]})"><b>${esc(mv[0])}</b><small>${TYN[mv[1]]}${mv[2] ? ' · ' + mv[2] : ''}</small></span>`; }).join('')}</div></div>`;
}
function facDraw(R) {
  const n = R.open, vi = BT.fview != null && BT.fview < n ? BT.fview : n - 1, cur = vi >= 0 ? R.offer[vi] : null, fresh = !!BT.fnew && vi === n - 1;
  BT.fnew = false;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Battle Frontier · Round ${R.round}</span></div>
    <div><h1 class="big">${n === 0 ? 'Seven Poké Balls.' : n < 7 ? `Pokémon ${vi + 1} of 7` : 'All seven are open.'}</h1><p class="mut" style="margin-top:6px">${n === 0 ? `Open them one at a time. The ball tells you a little: a Great Ball holds a stronger Pokémon than a Poké Ball, and an Ultra Ball the strongest. With great luck one of them is a Mega.` : n < 7 ? 'Look it over, then open the next ball. You pick four when all seven are open.' : 'Tap a ball to look again, then pick your four.'}</p></div>
    <div class="fdr">${R.offer.map((m, i) => i < n ? `<button type="button" class="fdb open${m.mega ? ' mega' : ''}${i === vi ? ' on' : ''}" data-a="fview" data-k="${i}" aria-label="${esc(mName(m))}">${spr(m.id, { it: m.item, mega: m.mega })}</button>` : `<span class="fdb b-${m.mega ? 'mega' : facBall(m)}${i === n ? ' next' : ''}${n === 0 ? ' drop' : ''}" style="--i:${i}">${ballEl(facBall(m))}</span>`).join('')}</div>
    ${cur ? sumCard(cur, fresh) : `<div class="fsum empty"><p class="mut">Nothing opened yet.</p></div>`}
    <div class="acts">${n < 7 ? `<button type="button" class="btn gold" data-a="fopen">${n === 0 ? 'Open the first ball' : n === 6 ? 'Open the last ball' : 'Open the next ball'} · ${n}/7</button>` : '<button type="button" class="btn gold" data-a="fteam">Pick your four</button>'}</div>`, 'tint', 'var(--t8)');
}

/* ---------- Sandkassa ---------- */
/* Skjermen ligger i show.js (sbxScreen): enkeltkamper, raid, filmer, pakker, og en kopi av lagringen der hele spillet kan prøves. Bare for admin. */
function labScreen() { return sbxScreen(); }

/* Handlingene (kobles inn i klikk-håndteringen i ui.js). */
const BA = {
  lab: () => { if (!isAdmin()) { closeOv(); return render(); } BT.B = null; BT.busy = false; stopMusic(); labScreen(); },
  raid: () => { BT.B = null; BT.busy = false; stopMusic(); sfx.open(); raidScreen(); },
  rlead: el => { BT.lead = +el.dataset.u; raidScreen(); },
  raidgo: () => { if (!raidOpen() || !S.party.map(monBy).filter(Boolean).length) return; PACK.unlock(); sfx.start(); BT.busy = false; startBattle(raidBattle(BT.lead)); },
  labraid: el => { if (!isAdmin()) return; if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.'); const q = el.dataset.k === 'dkq', id = q || el.dataset.k === 'dk' ? 'dk' : +el.dataset.k; if (id !== 'dk' && !LEG[id]) return; PACK.unlock(); sfx.start(); BT.busy = false; const B = raidBattle(BT.lead, id); if (q) B.dkq = 1; startBattle(B); },
  bbag: () => { if (BT.busy || !BT.B || BT.B.over) return; BT.menu = 'bag'; drawMenu(); },
  bitem: el => { const k = el.dataset.k; if (BAG[k] && BAG[k].all) { const B = BT.B; if (BT.busy || !(B.bag > 0) || !itemOk(B, k, B.a)) return; if (B.mode !== 'lab') { if (!(S.items[k] > 0)) return; S.items[k]--; save(true); } BT.menu = 'main'; return playEv(runTurn(B, { t: 'item', k, i: B.a })); } BT.item = k; BT.menu = 'bagt'; drawMenu(); },
  btarget: el => { if (BT.busy) return; const B = BT.B, k = BT.item, i = +el.dataset.k; if (!(B.bag > 0) || !itemOk(B, k, i)) return; if (B.mode !== 'lab') { if (!(S.items[k] > 0)) return; S.items[k]--; save(true); } BT.menu = 'main'; playEv(runTurn(B, { t: 'item', k, i })); },
  labmode: el => { if (!isAdmin()) return; BT.labRent = el.dataset.k === '1'; labScreen(); },
  labgo: el => { if (!isAdmin()) return; if (!BT.labRent && !S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team, or pick Rentals.'); closeSheet(); PACK.unlock(); sfx.start(); BT.busy = false; startBattle(labBattle(el.dataset.k, !!BT.labRent, el.dataset.i === '' || el.dataset.i == null ? null : +el.dataset.i)); },
  bdone: () => { if (typeof fairGate === 'function' && fairGate()) return; if (openNeed() > 0) return toast(`Study ${openNeed()} more ${openNeed() === 1 ? 'minute' : 'minutes'} today to open the battles.`); S.lad.day = dayKey(); purseOpen(); stamp(); if (MODESN >= MODES.length) evRoll(); save(); render(); if (modePicks() > 0) { BT.msel = ''; sfx.open(); modeSheet(); } else { sfx.ok(); toast('Battles are open. Fight now or later tonight.'); } },
  mopen: () => { if (!S.lad.day) return; BT.msel = ''; sfx.open(); modeSheet(); },
  /* Simulering av kampdagen: advarsel først (kan slås av), så resultatet på forsiden, der det godtas eller angres. */
  sim: () => { if (!simCan()) return; if (S.simok) return BA.simgo(); sfx.warn(); openSheet(`<h2 class="h" style="margin-top:0">Simulate ${dayOld() ? 'these' : "today's"} battles?</h2>
    <p class="sm">The game plays them for you, with your team and simple choices. It is for the days you have no time to fight.</p>
    <div class="card2 simw"><b>You get much less</b><p class="sm">${Math.round(SIMPAY * 100)} % of the coins and XP the battles pay. No Rare Candy, items, encounters, trades, medals or lap win, and beating a Champion this way does not count.</p></div>
    <p class="sm">You see the result before you take it. Undo it, and you can fight yourself instead, but you cannot simulate again that day.</p>
    <label class="chk"><input type="checkbox" id="simchk"> Do not warn me again</label>
    <div class="acts"><button type="button" class="btn gold" data-a="simgo">Simulate</button><button type="button" class="btn nf" data-a="close">Cancel</button></div>`); },
  simgo: () => { const c = $('#simchk'); if (c && c.checked) { S.simok = 1; save(true); } closeSheet(); const Q = simDay(); if (!Q) return toast('The battles could not be simulated.'); sfx.ok(); buzz([30, 40, 30]); render(); const el = document.querySelector('.simc'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); },
  simok: () => { const A = simAccept(); render(); if (!A) return; sfx.coin(); buzz(40); if (!(typeof raidArrive === 'function' && raidArrive())) toast(`+${nb(A.R.coins)} coins${A.ups.some(u => u.l1 > u.l0) ? ', and your team levelled up' : ' and XP for your team'}.`); },
  simundo: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again to undo'; return; } if (simUndo()) { sfx.close(); render(); toast('Undone. The battles are yours to fight.'); } },
  skipday: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: no battles'; return; } if (daySkip()) { sfx.close(); render(); if (!(typeof raidArrive === 'function' && raidArrive())) toast('No battles this time.'); } },
  fkeep: el => { const K0 = facKeep(+el.dataset.k); closeSheet(); if (K0) { sfx.got(); buzz([40, 40, 120]); if (BT.res && BT.res.mode === 'fac' && $('.hof')) { BT.res.keep = 0; BT.res.kept = K0.m.u; overview(); } else render(); toast(`${mName(K0.m)} joined you${K0.isNew ? ' · new species' : ''}.`); } else render(); },
  fkeepno: () => { S.fac.keep = null; save(); closeSheet(); if (BT.res && BT.res.mode === 'fac' && $('.hof')) { BT.res.keep = 0; overview(); } else render(); },
  fkeeps: () => { if (!(S.fac.keep && S.fac.keep.length)) return render(); sfx.open(); openSheet(keepCard(true)); },
  lresume: () => { const B = BT.live; if (!B) { closeOv(); return render(); } PACK.unlock(); sfx.start(); BT.busy = false; resumeBattle(B); },
  lgive: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again to give up'; return; } const B = BT.live; BT.live = null; if (!B) { liveLoss(); closeOv(); return render(); } BT.B = B; BT.busy = false; B.over = 'loss'; endBattle(); },
  lgiveo: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again to give it up'; return; } const w = liveLoss(); closeSheet(); closeOv(); render(); toast(`The ${w} counts as a loss.`); },
  msel: el => { const k = el.dataset.k; if (!MODES.includes(k)) return; BT.msel = k; document.querySelectorAll('#ov .mdc').forEach(x => { const on = x === el; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); const b = $('#mgo'); if (b) { b.disabled = false; b.textContent = `Play the ${MODEN[k]} today`; } sfx.tap(); buzz(12); },
  /* Valget står for hele kampdagen. Dagens event trekkes i det samme (modePick), og viser seg som et symbol over modusen. */
  mgo: () => {
    const k = BT.msel; if (!k || !modePick(k)) { closeOv(); return render(); }
    BT.msel = ''; closeOv(); render();
    const e = evNow(), c = $('#mode-' + k), chip = document.querySelector('.evchip');
    if (e) { sfx.event(); buzz([40, 60, 40, 60, 180]); toast(`Special event: ${evInfo(e).n}. Tap the symbol to see what it does.`); } else { sfx.ok(); buzz(30); toast(`${MODEN[k]} it is. Fight now or later tonight.`); }
    const to = chip || c; if (to && to.scrollIntoView) to.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
  },
  evinfo: () => { const e = evNow(); if (!e) return; closeSheet(); if (!e.seen) { e.seen = 1; save(true); } sfx.open(); evSheet(e); },
  evpick: el => { const e = evNow(), u = +el.dataset.u; if (!e || e.k !== 'surge') return; if (!surgeToggle(u)) { sfx.warn(); return toast(`Three at most. Tap one of the chosen to free a place.`); } save(true); sfx.tap(); const box = $('#evpk'); if (box) box.innerHTML = surgePickEl(e); },
  bpre: () => { if (!ladderOpen()) { closeOv(); return render(); } BT.B = null; BT.busy = false; preBattle(); },
  blead: el => { BT.lead = +el.dataset.u; preBattle(); },
  bteam: () => { closeOv(); U.tab = 'lag'; U.lag = 'lag'; render(); },
  bgo: () => { if (!ladderOpen()) { closeOv(); return render(); } if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.'); PACK.unlock(); sfx.start(); BT.busy = false; startBattle(newBattle(BT.lead)); },
  btap: () => { if (BT.tap) BT.tap(); },
  bfightm: () => { BT.menu = 'moves'; drawMenu(); },
  bswitch: () => { BT.menu = 'team'; drawMenu(); },
  bpause: () => { BT.menu = 'pause'; drawMenu(); },
  bback: () => { BT.menu = 'main'; drawMenu(); },
  dkskip: () => { const B = BT.B; if (!B || BT.busy || B.over || B.mode !== 'lab' || !(B.tr && B.tr.leg === 150 && !B.tr.dk)) return; const b = $('#dkskip'); if (b) b.remove(); B.foe.forEach(f => { f.hp = 0; }); B.over = 'win'; BT.busy = true; paintBox('foe'); endBattle(); },
  bfast: () => { S.bfast = S.bfast ? 0 : 1; save(true); FX.speed = spdF(); drawMenu(); },
  /* Angrepsanimasjonene: de store fra Elite Battle DX, eller de enklere arkene og kodetegnede effektene (for den som vil ha det raskere, eller hvis noe ser rart ut). */
  bdx: () => { S.dx = S.dx === 0 ? 1 : 0; save(true); drawMenu(); },
  bmusic: () => { S.music = S.music === 0 ? 1 : 0; save(true); if (S.music === 0) stopMusic(); else battleMusic(BT.B); drawMenu(); },
  bmove: el => { if (BT.busy || BT.B.over) return; const mega = BT.mega ? 1 : 0; BT.mega = 0; BT.menu = 'main'; playEv(runTurn(BT.B, { t: 'move', k: +el.dataset.k, mega })); },
  bmega: () => { if (BT.busy || !BT.B || !canMega(BT.B, 'me')) return; BT.mega = BT.mega ? 0 : 1; if (BT.mega) BSFX.megaArm(); drawMenu(); },
  bsw: el => { if (BT.busy) return; const B = BT.B, i = +el.dataset.k; BT.menu = 'main'; playEv(B.need ? sendIn(B, i) : runTurn(B, { t: 'switch', i })); },
  bforfeit: el => { if (BT.busy) return; if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.innerHTML = MFR + '<span>TAP AGAIN</span><b>to give up</b>'; return; } BT.B.over = 'loss'; endBattle(); },
  packre: async () => { toast('Looking for your pack…'); const ok = await PACK.init(true); toast(ok ? `Pack found: ${Object.keys(PACK.man.scenes || {}).length} arenas, ${(PACK.man.music || []).length} tracks.` : 'No pack found in your sync repo.'); if (BT.B == null && $('.lablist')) labScreen(); },
  blearn: el => { const m = monBy(+el.dataset.u); if (m) learnSheet(m, 'ov'); },
  lforget: el => { const L = U.learn, m = monBy(L.u); if (!m) return closeSheet(); const x = m.nm[0], old = +el.dataset.k; resolveMove(m, x, old); sfx.lvl(); toast(`${mName(m)} forgot ${MOVES[old][0]} and learned ${MOVES[x][0]}.`); learnSheet(m, L.back); },
  lskip: () => { const L = U.learn, m = monBy(L.u); if (!m) return closeSheet(); const x = m.nm[0]; resolveMove(m, x, null); toast(`${mName(m)} did not learn ${MOVES[x][0]}.`); learnSheet(m, L.back); },
  tpick: el => { BT.tp = +el.dataset.k; overview(); },
  tback: () => { BT.tp = null; overview(); },
  tgive: el => { const res = BT.res, x = res.trade[BT.tp], mine = monBy(+el.dataset.k); if (!x || !mine) return; const got = doTrade(x, mine); res.got = `${D(got.id)[0]} · Lv ${got.lv} (for ${D(mine.id)[0]})`; res.trade = null; BT.tp = null; sfx.got(); cry(got.id, 200); overview(); },
  tskip: () => { const res = BT.res; pushEnc(res, genEnc({ min: 2, luck: 1.2 })); save(); res.trade = null; sfx.found(); overview(); },
  wenter: () => { if (!pwtOpen()) { closeOv(); return render(); } if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.'); if (!pwtRun()) { pwtStart(); BT.wsel = []; } BT.B = null; BT.busy = false; sfx.open(); pwtScreen(); },
  wsel: el => { const R = pwtRun(); if (!R) return; const u = +el.dataset.u, s = BT.wsel || (BT.wsel = []), i = s.indexOf(u); if (i >= 0) s.splice(i, 1); else if (s.length < R.n) s.push(u); else return; sfx.tap(); pwtScreen(); },
  wgo: () => { const R = pwtRun(); if (!R || (BT.wsel || []).length !== R.n) return; PACK.unlock(); sfx.start(); BT.busy = false; BT.lead = BT.wsel[0]; startBattle(pwtBattle(BT.wsel.slice())); },
  rules: () => { sfx.open(); rulesSheet(); },
  fenter: () => { if (!facOpen()) { closeOv(); return render(); } if (!S.fac.run) { facStart(); BT.fsel = []; } BT.B = null; BT.busy = false; sfx.open(); facScreen(); },
  fopen: () => { const R = S.fac.run; if (!R || !R.offer || !(R.open < 7)) return; const m = R.offer[R.open]; R.open++; save(); BT.fview = null; BT.fnew = true; if (m.mega) { sfx.evo(); buzz([60, 40, 60, 40, 260]); } else { sfx.found(); buzz(30); } cry(m.id, 250, 0.35); facScreen(); },
  fview: el => { BT.fview = +el.dataset.k; facScreen(); },
  fteam: () => { BT.fpick = true; BT.fsel = []; sfx.open(); facScreen(); },
  fsel: el => { const i = +el.dataset.k, s = BT.fsel, k = s.indexOf(i); if (k >= 0) s.splice(k, 1); else if (s.length < 4) s.push(i); facScreen(); },
  fpick: () => { if (BT.fsel.length !== 4) return; facPick(BT.fsel.slice()); BT.fsel = []; BT.fpick = false; BT.fview = null; sfx.ok(); facScreen(); },
  flead: el => { const R = S.fac.run, i = +el.dataset.k; if (i > 0) { R.team.unshift(R.team.splice(i, 1)[0]); save(); } facScreen(); },
  fgo: () => { if (!facOpen() || !S.fac.run || !S.fac.run.team) return; PACK.unlock(); sfx.start(); BT.busy = false; startBattle(facBattle()); },
  swopen: () => { if (!BT.res || !BT.res.swap || !S.fac.run) return; BT.sw = { a: null, b: null, view: null }; sfx.open(); facSwapScreen(); },
  /* Ett trykk velger og viser sammendraget. Når én fra hvert lag er valgt, bytter de plass (foreløpig) med en liten animasjon. */
  swtap: el => {
    const W = BT.sw, side = el.dataset.s, k = +el.dataset.k; if (!W) return;
    W.view = [side, k];
    if (W.a != null && W.b != null) { sfx.tap(); return facSwapScreen(); }
    if (side === 'th') W.a = W.a === k ? null : k; else W.b = W.b === k ? null : k;
    if (W.a != null && W.b != null) {
      const ea = $('#sw-th-' + W.a), eb = $('#sw-my-' + W.b), ra = ea && ea.getBoundingClientRect(), rb = eb && eb.getBoundingClientRect();
      W.view = ['my', W.b]; facSwapScreen(); sfx.ok(); buzz([30, 40, 60]);
      const na = $('#sw-th-' + W.a), nb2 = $('#sw-my-' + W.b);
      if (ra && rb && na && nb2 && na.animate && !calm()) { const o = { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' }, dx = ra.left - rb.left, dy = ra.top - rb.top;
        nb2.animate([{ transform: `translate(${dx}px,${dy}px) scale(1.06)`, zIndex: 2 }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 14}px) scale(1.14)`, zIndex: 2 }, { transform: 'none', zIndex: 2 }], o);
        na.animate([{ transform: `translate(${-dx}px,${-dy}px) scale(1.06)` }, { transform: `translate(${-dx * 0.5}px,${-dy * 0.5 + 14}px) scale(.94)` }, { transform: 'none' }], o); }
      return;
    }
    sfx.tap(); facSwapScreen();
  },
  swundo: () => { const W = BT.sw; if (!W) return; W.a = W.b = null; W.view = null; sfx.tap(); facSwapScreen(); },
  swback: () => { BT.sw = null; overview(); },
  /* Next låser laget: byttet gjennomføres (hvis det er gjort), og neste kamp venter. */
  swnext: () => {
    const W = BT.sw, res = BT.res, R = S.fac.run; if (!res || !R) return;
    if (W && W.a != null && W.b != null && res.swap && res.swap[W.a]) { const x = res.swap[W.a], old = R.team[W.b]; facSwap(W.b, x); toast(`${D(x.id)[0]} joined your rentals in place of ${D(old.id)[0]}.`); }
    res.swap = null; BT.sw = null; sfx.ok(); if (!facOpen()) { closeOv(); return render(); } BT.B = null; BT.busy = false; facScreen();
  },
  fstats: () => { const R = S.fac.run; if (!R || !R.team) return; sfx.open(); openSheet(`<h2 class="h" style="margin-top:0">Your rentals</h2><div class="stack">${R.team.map(m => sumCard(m)).join('')}</div><button type="button" class="btn wide" data-a="close" style="margin-top:12px">Close</button>`); }
};
