'use strict';
/* Fokusdex – kampskjermene: kortene på forsiden, oppstilling før kampen, selve kampen, oppgjøret etterpå, Battle Frontier og demoen.
   Reglene ligger i battle.js og league.js, effektene i bfx.js. */

const BT = { B: null, busy: false, v: null, menu: 'main', res: null, ty: 0, tap: null, lead: 0, fsel: [], tp: null, fs: null };
/* Farten i kampene: vanlig fart er satt opp en fjerdedel etter tilbakemelding om at angrepene gikk for sakte, og FAST er litt over det dobbelte.
   FXSLOW er bare til testing: et tall under 1 spiller alt i sakte film. */
const spdF = () => (S.bfast ? 2.2 : 1.25) * (window.FXSLOW || 1);
const bwait = ms => new Promise(r => setTimeout(r, ms / spdF()));
/* Hvor mye pynt en klasse får i kort og lister: vanlig trener, boss, toppboss, og de tre sjeldne som har hver sin stil:
   de onde lederne (mørkt og rødt), mesterne (hver sin farge) og de aller største (gull, bare klasse 9). */
const TIER = k => k === 'supreme' || k === 'legend' ? 'ultra' : k === 'champ' ? 'champ' : k === 'evilboss' ? 'evil' : k === 'trainer' ? 'reg' : k === 'gym' || k === 'evilteam' || k === 'brain' ? 'boss' : 'top';
const RARE = { evilboss: 'rare boss', champ: 'very rare boss', supreme: 'ultra rare boss', legend: 'legendary' };
const kst = tr => tr.cc ? ` style="--cc:${tr.cc}"` : '';
/* Hva hver klasse gir (vises før kampen) og hva den er (vises i demoen). */
const REW = { trainer: 'coins and a ball, sometimes a Potion, an encounter or a Rare Candy', gym: 'Rare Candy, Great Balls, a Super Potion and an encounter of their type', evilteam: 'Great Balls, stolen coins and an encounter', eviladmin: 'Ultra Balls, two encounters, maybe an evolution stone',
  e4: 'Rare Candy, a Hyper Potion and two rare encounters', rival: '2 Rare Candy, a Revive, an Egg and two encounters', evilboss: '3 Rare Candy, three rare encounters, maybe a pseudo-legendary', champ: '4 Rare Candy, a Max Revive and a pseudo-legendary encounter',
  supreme: 'a legendary and a pseudo-legendary encounter, 6 Rare Candy and a Shiny Charm' };
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
  ail: () => { tone(300, 0, 0.12, 0.04, 'sawtooth', 220); tone(260, 0.14, 0.14, 0.04, 'sawtooth', 180); },
  heal: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.06, 0.1, 0.03, 'triangle')),
  ball: () => { noise(0, 0.1, 0.05, 1500, 3500); tone(700, 0.05, 0.12, 0.04, 'triangle', 1400); },
  recall: () => { tone(1200, 0, 0.18, 0.04, 'triangle', 400); },
  vs: key => { const r = keyRoot(key, 55) * 2; noise(0, 0.5, 0.08, 300, 4000); tone(r, 0, 0.5, 0.07, 'sawtooth', r * 4); tone(r * 8, 0.5, 0.25, 0.06, 'square'); },
  ace: () => { noise(0, 0.9, 0.09, 200, 5000); tone(80, 0, 0.9, 0.08, 'sawtooth', 640); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5 + i * 0.07, 0.2, 0.05, 'square')); },
  win: () => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.16, 0.05, 'triangle')),
  lose: () => [392, 370, 349, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.3, 0.05, 'triangle'))
};
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
/* Enkel kampmusikk (beta): en liten sekvenser med bass, melodi og hi-hat. Egne lydfiler per trener kommer senere. */
const TUNE = {
  battle: { bpm: 152, bass: [45, 0, 45, 57, 45, 0, 45, 57, 45, 0, 45, 57, 45, 0, 45, 57, 41, 0, 41, 53, 41, 0, 41, 53, 43, 0, 43, 55, 43, 0, 43, 55], lead: [69, 72, 76, 72, 69, 72, 76, 81, 79, 76, 72, 76, 79, 76, 72, 69, 65, 69, 72, 69, 65, 69, 72, 77, 74, 71, 67, 71, 74, 71, 67, 71] },
  boss: { bpm: 168, bass: [40, 40, 52, 40, 40, 52, 40, 47, 40, 40, 52, 40, 40, 52, 43, 45, 36, 36, 48, 36, 36, 48, 36, 43, 38, 38, 50, 38, 42, 42, 54, 47], lead: [76, 0, 79, 76, 83, 0, 79, 76, 74, 0, 76, 79, 76, 0, 71, 0, 72, 0, 76, 72, 79, 0, 76, 72, 74, 0, 78, 74, 81, 78, 83, 0] },
  top: { bpm: 184, bass: [38, 50, 38, 50, 38, 50, 41, 53, 36, 48, 36, 48, 36, 48, 40, 52, 34, 46, 34, 46, 34, 46, 38, 50, 33, 45, 33, 45, 37, 49, 40, 52], lead: [74, 77, 81, 86, 81, 77, 74, 77, 72, 76, 79, 84, 79, 76, 72, 76, 70, 74, 77, 82, 77, 74, 70, 74, 69, 73, 76, 81, 85, 81, 88, 85], hi: 1 }
};
const MUS = { id: 0, t: 0, step: 0, k: '' };
function music(k) {
  clearInterval(MUS.id); MUS.id = 0; MUS.k = '';
  if (!k || !S.sound || S.music === 0 || !ac()) return;
  MUS.k = k; MUS.step = 0; MUS.t = AC.currentTime + 0.06;
  MUS.id = setInterval(() => {
    const T = TUNE[MUS.k], spb = 60 / T.bpm / 4, f = n => 440 * Math.pow(2, (n - 69) / 12);
    /* Den innebygde musikken går gjennom effektutgangen, men skal følge musikkskyveren: forskjellen mellom de to skyverne legges på her. */
    const mk = Math.min(4, Math.pow((S.mvol == null ? 70 : S.mvol) / 100, 1.6) / Math.max(0.01, Math.pow((S.vol == null ? 70 : S.vol) / 100, 1.6)));
    while (MUS.t < AC.currentTime + 0.2) {
      const s = MUS.step, at = Math.max(0, MUS.t - AC.currentTime), b = T.bass[s % T.bass.length], l = T.lead[s % T.lead.length];
      if (b) tone(f(b), at, spb * 0.9, 0.035 * mk, 'triangle');
      if (l) tone(f(l), at, spb * 0.75, 0.016 * mk, 'square');
      if (T.hi && l) tone(f(l + 12), at, spb * 0.4, 0.007 * mk, 'square');
      if (s % 2 === 0) noise(at, 0.03, (s % 8 === 4 ? 0.02 : 0.008) * mk, 6000, 5000);
      MUS.t += spb; MUS.step++;
    }
  }, 50);
}
/* Hvilken musikk som hører til kampen. Her kobles egne lydfiler per trener inn senere. */
const musicKey = B => ({ reg: 'battle', boss: 'boss', top: 'top', ultra: 'top' })[TIER(B.tr.kind)];
/* Kampmusikken: trenerens egen låt fra ressurspakken hvis den finnes, ellers den innebygde. */
async function battleMusic(B, o) {
  const tk = PACK.trackFor(B);
  if (tk && await PACK.music(tk, o)) return music('');
  if (BT.B !== B || B.over) return;
  PACK.music(''); music(musicKey(B));
}
const stopMusic = () => { PACK.music(''); PACK.stingOut(0.2); music(''); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') stopMusic(); else if (BT.B && !BT.B.over && $('#arena')) battleMusic(BT.B); });

/* ---------- Forsiden ---------- */
const leagueTag = () => { const L = S.lad; return `${L.lap ? 'Lap ' + (L.lap + 1) + ' · ' : ''}Battle ${L.n + 1}/${LAPN}`; };
/* Den legendariske som har vist seg. Én utfordring om dagen til den er slått. */
function raidCard() {
  const R = S.raid; if (!R || !LEG[R.id]) return '';
  const L = raidInfo(R), open = raidOpen();
  return `<div class="card k-ultra raidc" style="--cc:${L.cc}"><div class="pre-foe"><span class="raid-sp">${spr(R.id, { ani: 1, sh: R.dk ? 2 : 0, mega: defForm(R.id) })}</span><div class="sp"><div class="sm">Legendary raid${R.tries ? ' · attempt ' + (R.tries + 1) : ''}</div><b class="bossn" style="font-size:19px">${esc(R.dk ? L.n : D(R.id)[0])}</b><div class="sm tn" style="margin-top:4px">Lv ${R.lv} · ${TYN[D(R.id)[1]]}${D(R.id)[2] >= 0 ? ' / ' + TYN[D(R.id)[2]] : ''} · your own team of six</div></div></div>
    <button type="button" class="btn gold wide" data-a="raid" style="margin-top:10px"${open ? '' : ' disabled'}>${open ? 'Challenge it' : 'Again tomorrow'}</button></div>`;
}
function raidScreen() {
  const R = S.raid; if (!R) return render();
  const L = raidInfo(R), party = S.party.map(monBy).filter(Boolean), lead = BT.lead && party.some(m => m.u === BT.lead) ? BT.lead : party[0] && party[0].u;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Legendary raid</span></div>
    <div class="card k-ultra raidc" style="--cc:${L.cc}"><div class="pre-foe"><span class="raid-sp">${spr(R.id, { ani: 1, sh: R.dk ? 2 : 0, mega: defForm(R.id) })}</span><div class="sp"><div class="sm">${R.dk ? 'Shadow Pokémon · the rarest of all' : L.t === 4 ? 'The Original One' : L.t === 3 ? 'Mythical Pokémon' : 'Legendary Pokémon'}</div><b class="bossn" style="font-size:21px">${esc(R.dk ? L.n : D(R.id)[0])}</b><div class="sm tn" style="margin-top:4px">Lv ${R.lv} · far more HP than a normal Pokémon</div></div></div>
      <p class="sm" style="margin-top:10px">One Pokémon against your whole team, with the Bag. Win and it waits in the grass for you to catch, with ${nb(RAIDCOIN[L.t - 1])} coins and 3 Rare Candy. Lose and it stays: you can try again tomorrow.</p></div>
    <div><div class="lab">Your team · tap the one that leads</div><div class="lineup">${party.map(m => `<button type="button" data-a="rlead" data-u="${m.u}" class="${m.u === lead ? 'lead' : ''}">${spr(m.id, { sh: m.sh, mega: m.mega })}<span class="sp"><b>${esc(mName(m))}</b><br><span class="sm tn">Lv ${m.lv}</span></span>${m.u === lead ? '<span class="pill">Leads</span>' : ''}</button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="raidgo"${raidOpen() && party.length ? '' : ' disabled'}>${raidOpen() ? 'Start the raid' : 'Again tomorrow'}</button></div>`, 'tint', L.cc);
}
/* Filmen når en legendarisk Pokémon viser seg (raid.js og raidf.js). Hver av de store har sin egen, lagt på slagene i låta si, og trioene og de mindre har
   roligere filmer. Låta starter med filmen og fortsetter inn i kampen. Filmen kan hoppes over. Med «redusert bevegelse» vises bare et stillbilde. */
async function legendIntro(B) {
  const tr = B.tr, f = B.foe[0], id = tr.dk ? 'dk' + tr.leg : tr.leg, info = typeof CINE !== 'undefined' ? CINE.info(id) : null, T = ms => new Promise(r => setTimeout(r, ms));
  if (!info) { battleMusic(B); return; }
  ov(`<div class="lgi" id="lgi" style="--cc:${tr.cc}"><div class="lgi-s"><canvas class="lgi-cv" id="lgicv" width="512" height="384"></canvas></div><i class="lgi-wait"></i><button type="button" class="lgi-skip" id="lgiskip" hidden>Skip</button></div>`, 'battle vsov');
  const root = $('#lgi'), cv = $('#lgicv'), gone = () => BT.B !== B || !root.isConnected, o = { name: tr.n, cap: tr.title, lv: f.lv, cc: tr.cc };
  const tk = PACK.trackFor(B), ready = CINE.prep(id, 6000);
  if (calm()) { await ready; if (gone()) return; root.classList.add('on'); await CINE.still(cv, id, Math.min(info.len - 0.6, info.R + 2), o); battleMusic(B, { fade: 1.2, from: 0.1 }); cry(f.id, 300, 0.5); await T(2600); if (gone()) return; root.classList.add('d'); await T(260); return; }
  /* Låta og filmen starter samtidig. Uten låt i pakken spilles den innebygde oppbyggingen, med drønnet i det den viser seg. */
  await ready; if (gone()) return;
  const started = tk ? await PACK.music(tk, { at: info.at }) : false; if (gone()) return;
  let stop = () => {};
  if (started) music(''); else { PACK.music(''); stop = epicIntro('ultra', info.R); }
  root.classList.add('on'); sfx.appear(); buzz([40, 60, 40]);
  const cue = n => { if (gone()) return; if (n === 'cry') { cry(f.id, 0, 0.6); buzz([80, 40, 260]); if (!started) battleMusic(B); } else if (n === 'boom') buzz([90, 60, 90, 60, 240]); else if (n === 'thud') buzz(45); else buzz(18); };
  const pl = CINE.play(cv, id, Object.assign({ clock: () => started ? PACK.clock() : -1, cue }, o)), sk = $('#lgiskip');
  let skipped = false; const skip = () => { if (skipped) return; skipped = true; sfx.tap(); stop(); pl.skip(); };
  setTimeout(() => { if (!gone() && sk) sk.hidden = false; }, 1200); if (sk) sk.addEventListener('click', skip);
  const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip(); }; document.addEventListener('keydown', key);
  const watch = setInterval(() => { if (gone()) pl.stop(); }, 300);
  await pl.done; clearInterval(watch); document.removeEventListener('keydown', key);
  if (gone()) return stop();
  if (!started && !PACK.playing() && !MUS.id) battleMusic(B);
  root.classList.add('d'); await T(240);
}
function ladderCard() {
  const L = S.lad, t = nextTrainer(), tr = trainerInfo(t), sm = studyMult(), bo = dayBoost(), tier = TIER(tr.kind), R = S.fac.run;
  /* En runde: seks par med en trener og en boss. Den siste bossen er en av de sjeldne. */
  const prog = `<div class="lgp" aria-hidden="true">${Array.from({ length: LAPN }, (_, n) => `<i class="${n < L.n ? 'on' : n === L.n ? 'cur' : ''}${n % 2 === 0 && n ? ' gap' : ''}${n % 2 === 1 ? ' bo' : ''}${n === LAPN - 1 ? ' ul' : ''}"></i>`).join('')}</div>`;
  const row = `<div class="lrow k-${tier}"${kst(tr)}>${tsprite(tr.img, 'sm')}<div class="sp"><div class="sm tn">${esc(leagueTag())}${tr.boss ? ` · class ${tr.ci} of 9${tr.ultra ? ' · ' + RARE[tr.kind] : ''}` : ''}</div><b class="${tr.boss ? 'bossn' : ''}">${esc(who(tr))}</b></div></div>`;
  const fac = `<div class="modec"><span class="ficon">F</span><div class="sp"><b>Battle Frontier</b><div class="sm tn">${R ? `Round ${R.round} · ${R.w}/${FACN} wins · streak ${R.streak}` : `Rent 4 of 7 random Pokémon · everything is Lv ${FACLV}${S.fac.best ? ' · best streak ' + S.fac.best : ''}`}</div></div></div>`;
  const tag = m => bo.mode === m ? `<span class="bonus">Today's bonus</span>` : '';
  const lab = '<button type="button" class="btn wide nf" data-a="lab">Demo battle · try any class</button>';
  const charm = S.charm > 0 ? `<p class="sm" style="color:var(--gold)">Shiny Charm: ${CHARM.m}× shiny odds for your next ${S.charm} focus session${S.charm > 1 ? 's' : ''}.</p>` : '';
  if (!L.day) return `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Battles</b><span class="pill tn">Lap ${L.lap + 1}</span></div>${row}${prog}
    <p class="sm">Two ways to battle once you are done studying: the League (your own team, XP and Rare Candy) and the Battle Frontier (rental Pokémon at Lv ${FACLV}, items and encounters). Today's bonus is on the ${bo.mode === 'league' ? 'League' : 'Battle Frontier'}.</p>
    <button type="button" class="btn wide" data-a="bdone">Done for today · open battles</button>${lab}</div>${charm}`;
  const mult = `<p class="sm tn">Rewards ×${sm} from ${hrs(ladMin())} h of focus${L.day !== dayKey() ? ' that day' : ' today'}. Your goal of ${hrs(goalMin())} h gives ×${goalTop().toFixed(1)}.${firstWin() ? ' Your first win today pays double coins.' : ''}</p><p class="sm tn">Difficulty: ${diff().n} · coins ×${diff().coin}, XP ×${diff().xp}. Change it under Profile.</p>`;
  return `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Trainer League</b>${tag('league')}</div>${row}${prog}
      ${ladLost() ? '<p class="sm">Two losses today. The League opens again after your next day of focus, and you keep your place and the XP.</p>' : `<p class="sm">${bo.mode === 'league' ? '+30% XP and better odds for Rare Candy today. ' : ''}A trainer, then a boss, through the nine classes. XP for the whole team after each battle. ${ladFails() ? 'You have used your rematch: one more loss closes the League for the day.' : 'You get one rematch a day: the second loss closes the League.'}</p><button type="button" class="go${tr.boss ? ' gold' : ''}" data-a="bpre">Battle</button>`}</div>
    <div class="card stack"><div class="row" style="justify-content:space-between"><b>Battle Frontier</b>${tag('factory')}</div>${fac}
      ${facLost() ? '<p class="sm">Your run ended. The Frontier opens again after your next day of focus.</p>' : `<p class="sm">${bo.mode === 'factory' ? '1.5× luck on items, encounters and rare bosses today. ' : ''}Six trainers, then a boss. No XP and no Bag here: you win items and encounters. A loss ends the run.</p><button type="button" class="btn wide gold" data-a="fenter">${R ? 'Continue the run' : 'Enter the Frontier'}</button>`}</div>${mult}${charm}${lab}`;
}
/* Oppstilling før en ligakamp: hvem du møter, hva de gir, og hvem av dine som går ut først. */
function preBattle() {
  const t = nextTrainer(), tr = trainerInfo(t), p = leaguePlan(t), tier = TIER(tr.kind), team = S.party.map(monBy).filter(Boolean);
  if (!S.party.includes(BT.lead)) BT.lead = S.party[0];
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">${esc(leagueTag())}</span></div>
    <div class="card k-${tier}"${kst(tr)}><div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${tr.boss ? `Class ${tr.ci} of 9 · ${esc(tr.cn)}${tr.ultra ? ' · ' + RARE[tr.kind] : ''}${t.sup ? ' · surprise' : ''}` : 'Trainer'}</div><b class="${tr.boss ? 'bossn' : ''}" style="font-size:19px">${esc(who(tr))}</b><div class="sm tn" style="margin-top:4px">${p.n} Pokémon · around Lv ${p.lv}</div><div class="sm" style="margin-top:4px">Gives ${REW[t.k]}.</div><div class="sm tn" style="margin-top:4px;color:var(--gold)">About ${nb(leagueCoins(p.st, t.lap))} coins${firstWin() ? ' · first win today, double' : ''} · ${diff().n}</div></div></div></div>
    <div><div class="lab">Your team · tap the one that leads</div><div class="lineup">${team.map(m => `<button type="button" data-a="blead" data-u="${m.u}" class="${m.u === BT.lead ? 'lead' : ''}">${spr(m.id, { sh: m.sh, mega: m.mega })}<span class="sp"><b>${esc(mName(m))}</b><br><span class="sm tn">Lv ${m.lv} · ${m.mv.map(x => esc(MOVES[x][0])).join(', ')}</span></span>${hasNews(m) ? '<span class="bang">!</span>' : ''}${m.u === BT.lead ? '<span class="pill">Leads</span>' : ''}</button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="bgo">Start battle</button><button type="button" class="btn nf" data-a="bteam">Edit team</button></div>`, 'tint', `var(--t${tr.ty})`);
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
  let tb = el.querySelector('.tyb'); if (!tb) { tb = document.createElement('div'); tb.className = 'tyb'; el.appendChild(tb); }
  const th = tyBadge(teamOf(side)[BT.v[side].i]); if (tb.dataset.h !== th) { tb.dataset.h = th; tb.innerHTML = th; }
  el.hidden = false;
}
/* Størrelsen i kamp følger høyden i Pokédexen: de små litt mindre, de store tydelig større (Joltik 0,84 · 1 m = 1 · Charizard 1,1 · Lugia 1,3 · Wailord 1,42).
   Din egen står nærmest kameraet og er større enn motstanderen. De legendariske i raid får litt ekstra. */
const hK = h => Math.max(0.84, Math.min(1.42, 1 + (h < 1 ? 0.1 : 0.13) * Math.log2(h)));
/* Din egen står nærmest kameraet og tegnes rundt dobbelt så stor som motstanderen, som i Black og White (høyden teller mindre der, ellers fyller de største hele skjermen). */
const sprK = (side, b) => { const k = hK(htOf(b.id, b.mega)); return side === 'me' ? Math.min(2.3, 1.9 * Math.pow(k, 0.6)) : (BT.B && BT.B.raid ? 1.1 : 1) * k; };
/* Din Pokémon står midt på plattformen sin, som ligger nederst i bildet bak tekstboksen. Er den så liten at den ville forsvunnet bak boksen,
   flyttes den så langt bakover på plattformen at godt over halve kroppen vises (--ly = hvor mye). Regnes ut når bildet er lastet,
   sammen med taket på størrelsen (--k) for begge sider. */
function seat(side) {
  const el = $('#s-' + side), ar = $('#arena'), img = el && el.querySelector('img.spr'); if (!el || !ar || !img) return;
  const set = () => {
    if (!img.naturalHeight || !img.isConnected) return;
    const me = side === 'me', cz = parseFloat(ar.style.getPropertyValue('--cz')) || 1.1, k0 = parseFloat(el.dataset.k) || (me ? 1.9 : 1);
    /* De aller største holdes innenfor skjermen: bredden og høyden har et tak. */
    const k = Math.min(k0, (me ? 165 : 150) / (img.naturalWidth * 0.8 * cz), (me ? 140 : 106) / (img.naturalHeight * 0.8 * cz));
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
  if (el) { el.className = 'bs ' + side + ' ' + (cls || ''); el.dataset.k = sprK(side, b).toFixed(3); el.style.setProperty('--k', el.dataset.k); el.innerHTML = spr(b.id, { ani: 1, sh: b.sh, back: side === 'me', mega: b.mega }); camFit(); }
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
function battleTag(B) { return B.mode === 'raid' ? 'Legendary raid' : B.mode === 'fac' ? `Frontier · Round ${B.round} · ${B.w + 1}/${FACN}` : B.mode === 'lab' ? `Demo · ${B.tr.cn}` : `${B.lap ? 'Lap ' + (B.lap + 1) + ' · ' : ''}${B.n + 1}/${LAPN} · ${B.tr.cn}`; }
const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
function drawBattle() {
  const B = BT.B, tr = B.tr, tier = TIER(tr.kind), scene = PACK.now(PACK.sceneFor(B));
  ov(`<div class="btop k-${tier}"${kst(tr)}><span class="pill tn">${esc(battleTag(B))}</span><span class="btn-n"><b class="${tr.boss ? 'bossn' : ''}">${esc(who(tr))}</b></span></div>
    <div class="bscreen t-${tier}"${kst(tr)}><div class="arena a-${tr.arena} v${tr.v} t-${tier} i${tr.int}${tr.th ? ' th-' + tr.th : ''}${scene ? ' has-scene' : ''}" id="arena" style="--ac:var(--t${tr.ty});--cc:${tr.cc || 'var(--t' + tr.ty + ')'}">
      <div class="cam" id="cam"><div class="world" id="world">${scene ? `<img class="scene" alt="" src="${scene}">` : ''}<div class="abg"></div><canvas class="fxc bgc" id="bgc" width="256" height="192"></canvas><canvas class="fxc amc" id="amc" width="512" height="384"></canvas><div class="plat pf"></div><div class="plat pm"></div></div></div><div class="dim"></div>
      ${tr.wild ? '' : `<div class="trn" id="trn">${tsprite(tr.img)}</div>`}
      <div class="bs foe gone" id="s-foe"></div><div class="bs me gone" id="s-me"></div>
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
  /* De legendariske og klasse 9 har sin egen luft over banen (raidf.js): tåke, lyn, glør, snøstorm … Da dempes det vanlige showet, så det ikke blir for mye. */
  const airId = tr.wild ? (tr.dk ? 'dk' + tr.leg : tr.leg) : tr.kind === 'supreme' && B.mode !== 'fac' ? 's:' + tr.n : 0, air = !!airId && !calm() && typeof CINE !== 'undefined' && CINE.has(airId);
  if (BT.air) BT.air(); BT.air = air ? CINE.air($('#amc'), airId, { cc: tr.cc || '#ffffff', k: 1 }) : null;
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
  while (i < s.length && !skip) { i = Math.min(s.length, i + (S.bfast ? 3 : 1)); el.textContent = s.slice(0, i); await new Promise(r => setTimeout(r, 17)); if (BT.B !== B || !el.isConnected) return; }
  el.textContent = s; BT.tap = null;
}
async function say(s, hold) {
  await typeOut(s);
  const b = $('#btext'); if (!b) return;
  if (hold) { await new Promise(r => { const id = setTimeout(r, hold / spdF()); BT.tap = () => { clearTimeout(id); r(); }; }); BT.tap = null; return; }
  b.classList.add('wait');
  await new Promise(r => { const id = setTimeout(r, (S.bfast ? 380 : 760)); BT.tap = () => { clearTimeout(id); r(); }; });
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
  const B = BT.B, pk = PACK.menu ? ' pk' : '', bg = mim('pbg'), cancel = (a, t) => `<button type="button" class="bw-cancel bback" data-a="${a || 'bback'}" aria-label="${t || 'Back'}" style="--c:#2f84e6">${MFR}${RET}</button>`;
  if (!B || BT.busy || B.over) { el.innerHTML = `<div class="bw bw-main bw-idle${pk}" style="${mim('ball')}"></div>`; return; }
  const me = B.me[B.a];
  if (B.need || BT.menu === 'team') {
    el.innerHTML = `<div class="bw bw-party bsw${pk}" style="${bg}">${B.me.map((b, i) => partyPanel(b, i, 'bsw', b.hp > 0 && !(i === B.a && B.need !== 1), i === B.a && B.need !== 1)).join('')}<p class="bw-tip">${B.need === 1 ? 'Choose a Pokémon.' : 'Switch to which Pokémon?'}</p>${B.need ? '' : cancel()}</div>`;
    return;
  }
  if (BT.menu === 'moves') {
    const any = me.mv.some((x, k) => moveOk(B, k)), fv = BT.v.foe;
    const mvb = (k, m, pp, ok) => `<button type="button" class="bw-m" data-a="bmove" data-k="${k}" style="--c:var(--b${m[1]})"${ok ? '' : ' disabled'}>${MFR}<b>${esc(m[0])}</b><span class="mty">${TYN[m[1]]}</span><span class="pp tn">${pp}</span>${k >= 0 ? fxTag(B, m) : ''}</button>`;
    el.innerHTML = `<div class="bw bw-moves bmv${S.hfx === 0 ? '' : ' hfx'}">${MVBG}<span class="mv-foe">${B.foe.map((b, i) => `<i class="${b.hp <= 0 ? 'out' : i === fv.i ? 'on' : ''}"></i>`).join('')}</span>
      ${any ? me.mv.map((x, k) => mvb(k, mvEff(B, me, MOVES[x.i]), `<em>PP</em>${x.pp}/${x.max}`, moveOk(B, k))).join('') : mvb(-1, ['Struggle', 0], '<em>No PP left</em>', true)}
      <span class="mv-balls">${Array.from({ length: 6 }, (_, i) => { const b = B.me[i]; return `<i class="${!b ? 'no' : b.hp <= 0 ? 'out' : b.status ? 'st' : ''}${i === B.a ? ' cur' : ''}"></i>`; }).join('')}</span>${cancel()}</div>`;
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
    el.innerHTML = `<div class="bw bw-bag">${MVBG2}<p class="bw-tip">Bag · ${B.bag} use${B.bag === 1 ? '' : 's'} left${free ? ' · free here' : ''}</p><div class="bw-items">${have.length ? have.map(k => `<button type="button" class="bw-m it" data-a="bitem" data-k="${k}" style="--c:var(--b${BAG[k].rev ? 12 : BAG[k].cure ? 11 : 13})"${B.me.some((_, i) => itemOk(B, k, i)) ? '' : ' disabled'}>${MFR}<b>${esc(SHOP[k].n)}</b><span class="mty">${BAG[k].rev ? 'Revive' : BAG[k].cure ? 'Status' : 'Heal'}</span><span class="pp tn">${free ? '∞' : '× ' + own(k)}</span></button>`).join('') : '<p class="bw-tip">Your Bag is empty. Potions and Revives are sold in the Shop.</p>'}</div>${cancel()}</div>`;
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
    <span class="bw-balls">${B.me.map(b => `<i class="${b.hp <= 0 ? 'out' : b.status ? 'st' : ''}"></i>`).join('')}</span></div>`;
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
  if (o.sound && !PACK.sfx(o.sound[0])) BSFX.mv(FX.kindOf(o.sound), mvTier(o.sound), o.sound[1]);
  await pl.at(until === 'hit' ? rec.hit : rec.busy);
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
  if (!PACK.sfx(m[0])) BSFX.mv(kind, tier, m[1]);
  if (an && PACK.ready(an)) {
    /* Arkanimasjonen fra pakken. Flytter den selv på angriperen, gjør ikke vi det også. */
    const T = PACK.frames(an) * 50, hit = m[4] ? PACK.hitAt(an) * 50 : T;
    if (K.style === 'dash' && PACK.movesUser(an)) K.style = 'own';
    K.done = PACK.play(an, $('#axc'), { x: a.x * 2, y: a.y * 2 }, { x: b.x * 2, y: b.y * 2 }, side === 'foe', spdF(), animHooks(side, self));
    launch(K, sp, d, hit);
    if (kind === 'quake' || kind === 'boom') shake(T / spdF(), kind === 'boom' ? 8 : 4 + tier * 1.5, 1);
    else if (kind === 'beam' && tier >= 2) shake(hit / spdF(), 1 + tier * 0.8, 1);
    await bwait(hit);
  } else {
    const r = FX.move(m, a, b, { roll: e.roll, self: BOOM.has(m[0]), tier, wobble: ms => wob(opp(side), ms) });
    launch(K, sp, d, r.hit);
    K.done = bwait(r.ms);
    await bwait(m[4] ? r.hit : r.ms);
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
  if (e.t === 'abil') { abBanner(e.side, e.n); buzz(20); return say(e.s); }
  if (e.t === 'anim') return playAnim(B, e);
  if (e.t === 'hit') {
    const b = teamOf(side)[v.i], K = BT.atk && !e.quiet && BT.atk.side !== side ? BT.atk : null, tier = K ? K.tier : 0, sev = Math.min(1, Math.max(0, v.hp - e.hp) / b.max * 1.3);
    if (!e.quiet) {
      const pos = fxPos(side), n = K ? K.n++ : 0, ef = e.e;
      if (!PACK.sfx(ef > 1 ? 'Hit Super Effective' : ef < 1 ? 'Hit Weak Not Very Effective' : 'Hit Normal Damage', 1)) { if (ef > 1) BSFX.hitS(); else if (ef < 1) BSFX.hitW(); else BSFX.hit(); }
      if (e.crit) BSFX.crit();
      FX.hit(pos, BT.ty, ef, e.crit, tier, n); buzz(ef > 1 ? [40, 30, 60] : 25);
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
    if (big) { BSFX.ace(); buzz([80, 40, 80, 40, 240]); await FX.ace(anc(side, 26), B.tr.ty, B.tr); if (!PACK.playing()) music(musicKey(B)); }
    sp.className = 'bs ' + side + ' in' + (ace ? ' ace' : ''); BSFX.ball(); FX.open(anc(side), big ? '#ffe9a8' : '');
    cry(b.id, 200, big ? 0.5 : 0.35); if (big) shake(500 / spdF(), 4, 1);
    await bwait(380); paintBox(side);
    if (B.mode !== 'lab') S.seen[b.id] = 1;
    await bwait(big ? 1100 : 620);
    sp.classList.remove('in');
  }
  else if (e.t === 'vanish') { sp.classList.toggle('away', !!e.on); await bwait(260); clearMot(sp); EBXP.unhide(side); }
  else if (e.t === 'sub') { sp.classList.toggle('subd', !!e.on); await bwait(200); }
  else if (e.t === 'form') { const el = $('#s-' + side); if (el) { FX.open(fxPos(side), ''); BSFX.ball(); el.innerHTML = spr(e.id, { ani: 1, sh: e.sh, back: side === 'me', mega: e.mega }); } await bwait(480); }
  else if (e.t === 'wx') { const a = $('#arena'); if (e.k) { a.dataset.wx = e.k; FX.weather(e.k); await bwait(640); } else delete a.dataset.wx; }
}
async function playEv(ev) {
  BT.busy = true; drawMenu();
  const B = BT.B;
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
  BT.busy = false;
  if (B.over) return endBattle();
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
  const quick = !!o.quick, tr = B.tr, lead = B.me[0], tier = TIER(tr.kind), V = PACK.vs, clip = tr.ultra && B.mode !== 'fac', evil = tr.th === 'evil', sp = (S.bfast ? 0.6 : 1) * (quick ? 0.7 : 1), T = ms => new Promise(r => setTimeout(r, ms * sp));
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
  on('s3'); if (!clip) battleMusic(B); BSFX.vs(PACK.keyOf(PACK.trackFor(B))); buzz([60, 40, 60, 40, 200]);
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
  BT.B = B; BT.menu = 'main'; BT.res = null; BT.ty = 0; BT.busy = true;
  BT.v = { me: { i: 0, hp: B.me[0].hp, st: '' }, foe: { i: 0, hp: B.foe[0].hp, st: '' } };
  const prep = PACK.prep(B).catch(() => {});
  /* Bildene til begge lagene hentes mens introen går. De to første ventes det på (litt), resten kommer i bakgrunnen. */
  const pre = Promise.all([preSpr(B.me[0].id, { ani: 1, back: 1, sh: B.me[0].sh, mega: B.me[0].mega }), preSpr(B.foe[0].id, { ani: 1, sh: B.foe[0].sh, mega: B.foe[0].mega })]);
  B.me.slice(1).forEach(b => preSpr(b.id, { ani: 1, back: 1, sh: b.sh, mega: b.mega })); B.foe.slice(1).forEach(b => preSpr(b.id, { ani: 1, sh: b.sh, mega: b.mega }));
  if (B.tr.wild) { await Promise.race([prep, new Promise(r => setTimeout(r, 2500))]); if (BT.B !== B) return; await legendIntro(B); }
  else { await PACK.introPrep(B); if (BT.B !== B) return; await bossIntro(B, B.tr.boss ? {} : { quick: 1, until: prep }); }
  await prep; await Promise.race([pre, new Promise(r => setTimeout(r, 2000))]);
  if (BT.B !== B) return;
  drawBattle(); drawMenu(); packHint();
  await bwait(350);
  await say(B.tr.wild ? `The ${B.tr.title.replace(' Pokémon', '').toLowerCase()} ${B.tr.n} appeared!` : `${who(B.tr)} wants to battle!`);
  if (BT.B !== B || !$('#arena')) return;
  if ($('#trn')) $('#trn').classList.add('out');
  await playOne(B, { t: 'send', side: 'foe', i: 0, hp: B.foe[0].hp, st: '', txt: `${B.tr.n} sent out ${B.foe[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  await playOne(B, { t: 'send', side: 'me', i: 0, hp: B.me[0].hp, st: '', txt: `Go! ${B.me[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  /* Egenskapene til de to som står inne (Intimidate, Pressure, været …) slår inn før første runde. */
  for (const e of startAbil(B)) { if (BT.B !== B || !$('#arena')) return; await playOne(B, e); }
  if (BT.B !== B || !$('#arena')) return;
  if (B.over) return endBattle();
  BT.busy = false; setText(`What will ${B.me[B.a].name} do?`); drawMenu();
}
function endBattle() {
  const B = BT.B; stopMusic(); BT.busy = false;
  clearInterval(BT.goldT); FX.show(null); if (BT.air) { BT.air(); BT.air = null; }
  const res = BT.res = B.mode === 'fac' ? finishFactory(B) : B.mode === 'lab' ? finishLab(B) : B.mode === 'raid' ? finishRaid(B) : finishLeague(B);
  if (res.win) BSFX.win(); else BSFX.lose();
  BT.tp = null; BT.fs = null;
  overview();
}

/* ---------- Etter kampen ---------- */
const encLine = res => res.encs.length ? `<div class="row" style="justify-content:space-between"><span>Encounters</span><b>${res.encs.length} waiting in the grass${res.encs.some(e => e.t >= 4) ? ' · legendary' : res.encs.some(e => e.t >= 3) ? ' · epic' : ''}</b></div>` : '';
const tyEl = x => mTypes(x).filter(t => t >= 0).map(t => `<span class="ty" style="background:var(--t${t})">${TYN[t]}</span>`).join(' ');
const monCard = (x, a, k, on) => `<button type="button" data-a="${a}" data-k="${k}" aria-pressed="${!!on}" class="${x.mega ? 'mega' : ''}" style="--tc:var(--t${mTypes(x)[0]})">${spr(x.id, { ani: 1, mega: x.mega })}<b>${esc(mName(x))}</b><span class="sm tn">Lv ${x.lv}${x.iv ? ' · ' + judge(x).t : ''}</span><span class="row" style="gap:4px;justify-content:center;flex-wrap:wrap">${tyEl(x)}</span>${x.mv ? `<span class="mvl">${x.mv.map(i => esc(MOVES[i][0])).join(' · ')}</span>` : ''}</button>`;
function overview() {
  const B = BT.B, res = BT.res, tr = B.tr, fac = res.mode === 'fac', lab = res.mode === 'lab', raid = res.mode === 'raid', first = !res.shown, nm = esc(tr.wild ? tr.n : who(tr));
  /* Laget: XP-linja fylles opp etter kampen, og nye nivåer og angrep vises her. */
  const team = fac || lab || raid ? '' : `<div class="card stack">${B.me.map(b => {
    const m = b.src, u = res.ups.find(x => x.u === m.u), l = first && u ? u.l0 : m.lv, x = first && u ? u.x0 : m.xp, f = Math.max(0, Math.min(1, (x - xpAt(l)) / (xpAt(l + 1) - xpAt(l))));
    return `<div class="hofr${u && u.l1 > u.l0 && !first ? ' lvup' : ''}" data-row="${m.u}">${spr(b.id, { sh: b.sh, mega: b.mega, s: '48px' })}<div class="sp"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><b class="sm tn lvt">${u && u.l1 > u.l0 && !first ? `Lv ${u.l0} → ${u.l1}` : 'Lv ' + l}</b></div>
      <div class="xpbar" style="margin-top:6px;height:6px"><i style="width:${Math.round(f * 100)}%"></i></div>
      <div class="sm tn" style="margin-top:4px">${u ? '+' + nb(u.xp) + ' XP' : 'No XP this time'}${b.hp <= 0 ? ' · fainted' : ''}${u && (u.learned || []).length ? ' · learned ' + esc(u.learned.join(', ')) : ''}</div>
      ${(m.nm || []).length ? `<button type="button" class="newmv" data-a="blearn" data-u="${m.u}" style="margin-top:6px;width:100%;text-align:left"><span class="bang">!</span><span class="sm" style="color:var(--ink)">Wants to learn <b>${esc(MOVES[m.nm[0]][0])}</b>${m.nm.length > 1 ? ' +' + (m.nm.length - 1) : ''}</span></button>` : ''}</div></div>`; }).join('')}</div>`;
  const rew = res.win && !lab ? `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Rewards${tr.boss ? ' · ' + esc(tr.cn) : ''}</b><span class="pill tn">×${B.sm} study bonus${B.boost.mode === (fac ? 'factory' : 'league') ? ' · today\'s bonus' : ''}</span></div>
      <div class="row" style="justify-content:space-between"><span>Coins</span>${coinEl(res.coins)}</div>
      ${res.items.map(x => `<div class="row" style="justify-content:space-between"><span>Item</span><b>${esc(x)}</b></div>`).join('')}${encLine(res)}
      ${res.got ? `<div class="row" style="justify-content:space-between"><span>Traded for</span><b>${esc(res.got)}</b></div>` : ''}${res.note ? `<p class="sm">${esc(res.note)}</p>` : ''}${(res.perks || []).map(x => `<p class="sm" style="color:var(--gold)">${esc(x)}</p>`).join('')}</div>` : '';
  /* Byttetilbud (ligaen) og bytte av leie-Pokémon (Frontier). */
  let extra = '';
  if (res.trade) {
    const tp = BT.tp;
    extra = `<div class="card stack"><b>${esc(tr.n)} offers a trade</b><p class="sm">${tp == null ? 'Pick one of these, then one from your team to give up. Or keep your team and get an extra encounter instead.' : `Who do you give up for ${esc(D(res.trade[tp].id)[0])}?`}</p>
      <div class="rent">${tp == null ? res.trade.map((x, i) => monCard(x, 'tpick', i)).join('') : S.party.map(monBy).filter(Boolean).map(m => monCard(m, 'tgive', m.u)).join('')}</div>
      <button type="button" class="btn wide" data-a="${tp == null ? 'tskip' : 'tback'}">${tp == null ? 'Keep my team · extra encounter' : 'Back'}</button></div>`;
  } else if (res.swap) {
    const fs = BT.fs;
    extra = `<div class="card stack"><b>Swap one in?</b><p class="sm">${fs == null ? `Take one of ${esc(tr.n)}'s Pokémon in exchange for one of yours, or keep your four.` : `Who leaves for ${esc(D(res.swap[fs].id)[0])}?`}</p>
      <div class="rent">${fs == null ? res.swap.map((x, i) => monCard(x, 'fswp', i)).join('') : S.fac.run.team.map((x, i) => monCard(x, 'fswm', i)).join('')}</div>
      ${fs == null ? '' : '<button type="button" class="btn wide" data-a="fswb">Back</button>'}</div>`;
  }
  const L = S.lad, R = S.fac.run;
  const next = raid ? esc(res.note) : lab ? 'Demo battle: no XP or rewards, and your League and Frontier progress are untouched.'
    : fac ? (res.win ? (res.roundDone ? `Round ${res.round} cleared. Round ${res.round + 1} has stronger rentals and opponents.` : `Next: battle ${R.w + 1} of ${FACN}${R.w === FACN - 1 ? ' · the boss' : ''}`) : `The run ends at a streak of ${res.streak}.`)
    : res.win ? (res.lapDone ? `Lap cleared. Lap ${L.lap + 1} begins, with stronger trainers, bigger teams and better rewards.` : 'Next: ' + esc(leagueTag()) + (L.n % 2 === 1 ? ' · a boss' : '')) : `${res.gone ? esc(tr.n) + ' moves on: rare bosses give you one chance.' + (res.lapDone ? ` Lap ${L.lap + 1} begins without the prize.` : '') : esc(tr.n) + ' waits for you.'} ${res.left ? 'You can lose once more today.' : 'The League opens again after your next day of focus.'}`;
  const open = lab ? true : raid ? false : fac ? facOpen() && !!R : ladderOpen();
  ov(`<div class="hof"><div class="hof-h"><span>${res.win ? 'VICTORY' : 'DEFEAT'}</span><span class="tn">${esc(battleTag(B))}</span></div>
      <div class="hof-stage">${B.me.map((b, i) => `<span style="--i:${i};--n:${B.me.length}" class="${b.hp <= 0 ? 'ko' : ''}">${spr(b.id, { ani: 1, sh: b.sh, mega: b.mega })}</span>`).join('')}</div>
      <p class="hof-t">${res.win ? `You beat ${nm}.` : lab ? `${nm} won this time.` : fac ? `${nm} stopped your run.` : `${nm} won this time. You keep your place and the XP.`}</p></div>
    ${team}${rew}${extra}${res.raid && S.raid ? `<div class="card k-ultra raidc"><div class="sm">A legendary Pokémon has appeared</div><b class="bossn" style="font-size:19px">${esc(S.raid.dk ? DARK.n : D(S.raid.id)[0])} · Lv ${S.raid.lv}</b><p class="sm" style="margin-top:4px">Beat it and it waits in the grass for you to catch. It is far stronger than anything in the League.</p><button type="button" class="btn gold wide" data-a="raid" style="margin-top:8px">See the raid</button></div>` : ''}
    <div class="card"><span class="sm" style="color:var(--ink)">${next}</span></div>
    <div class="acts">${lab ? '<button type="button" class="btn gold" data-a="lab">Another demo</button><button type="button" class="btn nf" data-a="home">Done</button>' : (res.win || res.left) && open ? `<button type="button" class="btn gold" data-a="${fac ? 'fenter' : 'bpre'}">${!res.win ? (res.gone ? 'Next battle' : 'Rematch') : fac && res.roundDone ? 'Pick new rentals' : 'Next battle'}</button><button type="button" class="btn nf" data-a="home">Done</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`, 'tint ovtop', res.win ? 'var(--gold)' : 'var(--red)');
  if (first && !fac && !lab && !raid) setTimeout(animXp, 500);
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
function facScreen() {
  const R = S.fac.run; if (!R) return;
  if (R.offer && R.open != null && (R.open < 7 || !BT.fpick)) return facDraw(R);
  if (R.offer) {
    const sel = BT.fsel;
    return ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Battle Frontier · Round ${R.round}</span></div>
      <div><h1 class="big">Pick 4 of 7.</h1><p class="mut" style="margin-top:6px">Rental Pokémon, all at Lv ${FACLV} like everyone you meet. The first one you pick leads. A round is six trainers and then a boss, and you can swap in one Pokémon from each trainer you beat.</p></div>
      <div class="rent">${R.offer.map((m, i) => monCard(m, 'fsel', i, sel.includes(i)).replace('<b>', sel.includes(i) ? `<span class="ord">${sel.indexOf(i) + 1}</span><b>` : '<b>')).join('')}</div>
      <div class="acts"><button type="button" class="btn gold" data-a="fpick"${sel.length === 4 ? '' : ' disabled'}>${sel.length === 4 ? 'Take these four' : `Pick ${4 - sel.length} more`}</button></div>`, 'tint', 'var(--t8)');
  }
  const f = facFoe(), tr = facInfo(f), tier = TIER(tr.kind);
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Round ${R.round} · battle ${R.w + 1} of ${FACN}</span></div>
    <div class="card k-${tier}"${kst(tr)}><div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${f.boss ? (tr.ultra ? `${esc(RARE[tr.kind][0].toUpperCase() + RARE[tr.kind].slice(1))} · ${esc(tr.cn)} · extra rewards` : `Boss · ${esc(tr.cn)} · last battle of the round`) : 'Battle Frontier'}</div><b class="${f.boss ? 'bossn' : ''}" style="font-size:19px">${esc(who(tr))}</b><div class="sm tn" style="margin-top:4px">4 Pokémon at Lv ${FACLV} · favours ${TYN[f.hint]} types</div></div></div></div>
    <div><div class="lab">Your rentals · tap the one that leads</div><div class="lineup">${R.team.map((m, i) => `<button type="button" data-a="flead" data-k="${i}" class="${i ? '' : 'lead'}">${spr(m.id, { mega: m.mega })}<span class="sp"><b>${esc(mName(m))}</b><br><span class="sm tn">${m.mv.map(x => esc(MOVES[x][0])).join(', ')}</span></span>${i ? '' : '<span class="pill">Leads</span>'}</button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="fgo">Start battle</button></div>`, 'tint', 'var(--t8)');
}

/* Battle Frontier: leie-Pokémonene trekkes én og én. Hver ball må åpnes og Pokémonen ses over (typer, verdier, angrep) før den neste kan åpnes.
   De som er åpnet, kan ses på igjen. Når alle sju er åpnet, velges laget. En Mega får sin egen fanfare. */
const STN6 = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
function sumCard(m, fresh) {
  const g = megaOf(m), st = statsOf(m), ty = mTypes(m), top = Math.max(...st.slice(1));
  return `<div class="fsum${g ? ' mega' : ''}${fresh ? ' pop' : ''}" style="--tc:var(--t${ty[0]})">
    <div class="fs-top">${spr(m.id, { ani: 1, mega: m.mega })}<div class="sp"><b class="fs-n">${esc(mName(m))}</b><div class="sm tn">Lv ${m.lv} · ${NAT[m.nat]} · ${judge(m).t}</div><div class="row" style="gap:4px;margin-top:6px;flex-wrap:wrap">${tyEl(m)}${g ? '<span class="pill megap">MEGA</span>' : ''}</div></div></div>
    <div class="fs-st">${STN6.map((n, i) => `<div><span>${n}</span><i><b style="width:${Math.min(100, st[i] / 220 * 100).toFixed(0)}%;background:${i && st[i] === top ? 'var(--gold)' : 'var(--tc)'}"></b></i><em class="tn">${st[i]}</em></div>`).join('')}</div>
    <div class="fs-mv">${m.mv.map(x => { const mv = mvEff(null, { src: m }, MOVES[x]); return `<span style="--c:var(--t${mv[1]})"><b>${esc(mv[0])}</b><small>${TYN[mv[1]]}${mv[2] ? ' · ' + mv[2] : ''}</small></span>`; }).join('')}</div></div>`;
}
function facDraw(R) {
  const n = R.open, vi = BT.fview != null && BT.fview < n ? BT.fview : n - 1, cur = vi >= 0 ? R.offer[vi] : null, fresh = !!BT.fnew && vi === n - 1;
  BT.fnew = false;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Battle Frontier · Round ${R.round}</span></div>
    <div><h1 class="big">${n === 0 ? 'Seven Poké Balls.' : n < 7 ? `Pokémon ${vi + 1} of 7` : 'All seven are open.'}</h1><p class="mut" style="margin-top:6px">${n === 0 ? `Open them one at a time. Every rental is fully evolved and at Lv ${FACLV}, and with great luck one of them is a Mega.` : n < 7 ? 'Look it over, then open the next ball. You pick four when all seven are open.' : 'Tap a ball to look again, then pick your four.'}</p></div>
    <div class="fdr">${R.offer.map((m, i) => i < n ? `<button type="button" class="fdb open${m.mega ? ' mega' : ''}${i === vi ? ' on' : ''}" data-a="fview" data-k="${i}" aria-label="${esc(mName(m))}">${spr(m.id, { mega: m.mega })}</button>` : `<span class="fdb${i === n ? ' next' : ''}">${ballEl(R.round >= 3 ? 'ultra' : R.round === 2 ? 'great' : 'poke')}</span>`).join('')}</div>
    ${cur ? sumCard(cur, fresh) : `<div class="fsum empty"><p class="mut">Nothing opened yet.</p></div>`}
    <div class="acts">${n < 7 ? `<button type="button" class="btn gold" data-a="fopen">${n === 0 ? 'Open the first ball' : n === 6 ? 'Open the last ball' : 'Open the next ball'} · ${n}/7</button>` : '<button type="button" class="btn gold" data-a="fteam">Pick your four</button>'}</div>`, 'tint', 'var(--t8)');
}

/* ---------- Demo ---------- */
/* Prøv en kamp mot hvilken som helst av de ni klassene, når som helst. Gir ingenting og rører ikke framgangen. */
function labScreen() {
  const rent = !!BT.labRent;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Demo</span></div>
    <div><h1 class="big">Try a battle.</h1><p class="mut" style="margin-top:6px">Pick a class and fight right away. Demo battles give no XP or rewards and do not touch your League or Frontier progress.</p></div>
    ${PACK.ok ? '' : `<div class="card nopack"><b>Built-in graphics and music</b><p class="sm" style="margin-top:4px">${GH && GH.ok ? `Sync is on, but your pack is not loaded${PACK.err ? ' (error ' + esc(PACK.err) + ')' : ' yet'}.` : 'Sync is off on this device, so your own pack is not loaded: music, HP boxes, sounds and move animations are the built-in ones.'}</p><button type="button" class="btn wide" data-a="${GH && GH.ok ? 'packre' : 'sync'}" style="margin-top:8px">${GH && GH.ok ? 'Look for the pack again' : 'Connect Sync'}</button></div>`}
    <div class="row labm"><button type="button" class="btn sp${rent ? ' nf' : ''}" data-a="labmode" data-k="0" aria-pressed="${!rent}">My team</button><button type="button" class="btn sp${rent ? '' : ' nf'}" data-a="labmode" data-k="1" aria-pressed="${rent}">Rentals · Lv ${FACLV}</button></div>
    <div class="lablist">${ORDER.map(k => { const c = TCL[k]; return `<button type="button" data-a="labgo" data-k="${k}" class="k-${TIER(k)}"><span class="cno">${c.i}</span><span class="sp"><b>${c.n}</b><br><span class="sm">${LABD[k]}</span></span>${ULTRA.has(k) ? `<span class="pill">${RARE[k].replace(' boss', '')}</span>` : ''}</button>`; }).join('')}</div>
    <div class="stack"><div class="lab">Legendary raids · the film and the fight</div>${[['The greatest', id => LEG[id].t === 4 || LEG[id].t === 2], ['Mythical', id => LEG[id].t === 3], ['Legendary', id => LEG[id].t === 1]].map(([n, f]) => `<div class="sm tn">${n}</div><div class="legl">${Object.keys(LEG).map(Number).filter(f).sort((a, b) => (LEG[b].t === 4) - (LEG[a].t === 4)).map(id => `<button type="button" data-a="labraid" data-k="${id}" style="--cc:${LEG[id].cc}">${spr(id, { lazy: 1, mega: defForm(id) })}<b>${esc(D(id)[0])}</b></button>`).join('')}${n === 'The greatest' ? `<button type="button" data-a="labraid" data-k="dk" style="--cc:${DARK.cc}">${spr(150, { sh: 2 })}<b>Dark Mewtwo</b></button>` : ''}</div>`).join('')}</div>
    ${PACK.ok ? `<p class="sm tn">Your pack is loaded: ${Object.keys(PACK.man.scenes || {}).length} arenas, ${(PACK.man.music || []).length} tracks and ${Object.keys(PACK.man.sfx || {}).length} sounds.</p>` : ''}`, 'tint', 'var(--gold)');
}

/* Handlingene (kobles inn i klikk-håndteringen i ui.js). */
const BA = {
  lab: () => { BT.B = null; BT.busy = false; stopMusic(); labScreen(); },
  raid: () => { BT.B = null; BT.busy = false; stopMusic(); sfx.open(); raidScreen(); },
  rlead: el => { BT.lead = +el.dataset.u; raidScreen(); },
  raidgo: () => { if (!raidOpen() || !S.party.map(monBy).filter(Boolean).length) return; PACK.unlock(); sfx.start(); BT.busy = false; startBattle(raidBattle(BT.lead)); },
  labraid: el => { if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.'); const id = el.dataset.k === 'dk' ? 'dk' : +el.dataset.k; if (id !== 'dk' && !LEG[id]) return; PACK.unlock(); sfx.start(); BT.busy = false; startBattle(raidBattle(BT.lead, id)); },
  bbag: () => { if (BT.busy || !BT.B || BT.B.over) return; BT.menu = 'bag'; drawMenu(); },
  bitem: el => { BT.item = el.dataset.k; BT.menu = 'bagt'; drawMenu(); },
  btarget: el => { if (BT.busy) return; const B = BT.B, k = BT.item, i = +el.dataset.k; if (!(B.bag > 0) || !itemOk(B, k, i)) return; if (B.mode !== 'lab') { if (!(S.items[k] > 0)) return; S.items[k]--; save(true); } BT.menu = 'main'; playEv(runTurn(B, { t: 'item', k, i })); },
  labmode: el => { BT.labRent = el.dataset.k === '1'; labScreen(); },
  labgo: el => { if (!BT.labRent && !S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team, or pick Rentals.'); PACK.unlock(); sfx.start(); BT.busy = false; startBattle(labBattle(el.dataset.k, !!BT.labRent)); },
  bdone: () => { S.lad.day = dayKey(); save(); sfx.ok(); render(); toast('Battles are open. Fight now or later tonight.'); },
  bpre: () => { if (!ladderOpen()) { closeOv(); return render(); } BT.B = null; BT.busy = false; preBattle(); },
  blead: el => { BT.lead = +el.dataset.u; preBattle(); },
  bteam: () => { closeOv(); U.tab = 'lag'; U.lag = 'lag'; render(); },
  bgo: () => { if (!ladderOpen()) { closeOv(); return render(); } if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.'); PACK.unlock(); sfx.start(); BT.busy = false; startBattle(newBattle(BT.lead)); },
  btap: () => { if (BT.tap) BT.tap(); },
  bfightm: () => { BT.menu = 'moves'; drawMenu(); },
  bswitch: () => { BT.menu = 'team'; drawMenu(); },
  bpause: () => { BT.menu = 'pause'; drawMenu(); },
  bback: () => { BT.menu = 'main'; drawMenu(); },
  bfast: () => { S.bfast = S.bfast ? 0 : 1; save(true); FX.speed = spdF(); drawMenu(); },
  /* Angrepsanimasjonene: de store fra Elite Battle DX, eller de enklere arkene og kodetegnede effektene (for den som vil ha det raskere, eller hvis noe ser rart ut). */
  bdx: () => { S.dx = S.dx === 0 ? 1 : 0; save(true); drawMenu(); },
  bmusic: () => { S.music = S.music === 0 ? 1 : 0; save(true); if (S.music === 0) stopMusic(); else battleMusic(BT.B); drawMenu(); },
  bmove: el => { if (BT.busy || BT.B.over) return; BT.menu = 'main'; playEv(runTurn(BT.B, { t: 'move', k: +el.dataset.k })); },
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
  fenter: () => { if (!facOpen()) { closeOv(); return render(); } if (!S.fac.run) { facStart(); BT.fsel = []; } BT.B = null; BT.busy = false; sfx.open(); facScreen(); },
  fopen: () => { const R = S.fac.run; if (!R || !R.offer || !(R.open < 7)) return; const m = R.offer[R.open]; R.open++; save(); BT.fview = null; BT.fnew = true; if (m.mega) { sfx.evo(); buzz([60, 40, 60, 40, 260]); } else { sfx.found(); buzz(30); } cry(m.id, 250, 0.35); facScreen(); },
  fview: el => { BT.fview = +el.dataset.k; facScreen(); },
  fteam: () => { BT.fpick = true; BT.fsel = []; sfx.open(); facScreen(); },
  fsel: el => { const i = +el.dataset.k, s = BT.fsel, k = s.indexOf(i); if (k >= 0) s.splice(k, 1); else if (s.length < 4) s.push(i); facScreen(); },
  fpick: () => { if (BT.fsel.length !== 4) return; facPick(BT.fsel.slice()); BT.fsel = []; BT.fpick = false; BT.fview = null; sfx.ok(); facScreen(); },
  flead: el => { const R = S.fac.run, i = +el.dataset.k; if (i > 0) { R.team.unshift(R.team.splice(i, 1)[0]); save(); } facScreen(); },
  fgo: () => { if (!facOpen() || !S.fac.run || !S.fac.run.team) return; PACK.unlock(); sfx.start(); BT.busy = false; startBattle(facBattle()); },
  fswp: el => { BT.fs = +el.dataset.k; overview(); },
  fswb: () => { BT.fs = null; overview(); },
  fswm: el => { const res = BT.res, x = res.swap[BT.fs]; if (!x) return; const old = S.fac.run.team[+el.dataset.k]; facSwap(+el.dataset.k, x); res.swap = null; BT.fs = null; sfx.ok(); toast(`${D(x.id)[0]} joined your rentals in place of ${D(old.id)[0]}.`); overview(); }
};
