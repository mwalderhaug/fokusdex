'use strict';
/* Fokusdex – skjermene. Hver fane tegnes på nytt fra tilstanden (S) når noe endres; fokusklokka og fangstmåleren oppdaterer bare sine egne elementer. */

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nb = n => Math.round(n).toLocaleString('en-US');
const hrs = m => (Math.round(m / 6) / 10).toLocaleString('en-US');

/* ---------- Bilder ----------
   Appen inneholder ingen bilder av Pokémon. De hentes fra PokeAPI sitt åpne bildearkiv når appen brukes (med Showdown som reserve) og mellomlagres på enheten. */
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
const slug = id => D(id)[0].toLowerCase().replace('♀', 'f').replace('♂', 'm').replace(/[^a-z0-9]/g, '');
function spr(id, o = {}) {
  const sd = `https://play.pokemonshowdown.com/sprites/${o.sh ? 'gen5-shiny' : 'gen5'}/${slug(id)}.png`;
  const png = `${SPR}pokemon/${o.sh ? 'shiny/' : ''}${id}.png`;
  const gif = `${SPR}pokemon/versions/generation-v/black-white/animated/${o.sh ? 'shiny/' : ''}${id}.gif`;
  const list = o.ani ? [gif, png, sd] : [png, sd];
  return `<span class="sprb${o.sil ? ' sil' : ''}${o.sh && !o.sil ? ' shiny' : ''}" style="--tc:var(--t${D(id)[1]})${o.s ? ';--s:' + o.s : ''}" data-n="${id}"><img class="spr" alt="${o.sil ? 'Unknown' : esc(D(id)[0])}" ${o.lazy ? 'loading="lazy" ' : ''}src="${list[0]}" data-f="${list.slice(1).join('|')}" onload="this.classList.add('ok')" onerror="sprErr(this)"></span>`;
}
window.sprErr = img => {
  const f = (img.dataset.f || '').split('|').filter(Boolean);
  if (f.length) { img.dataset.f = f.slice(1).join('|'); img.src = f[0]; }
  else { img.parentNode.classList.add('noimg'); img.remove(); }
};
const ballEl = (k, s) => `<img class="ball im" style="--bc:${SHOP[k].bc}${s ? ';--s:' + s : ''}" alt="" src="${SPR}items/${SHOP[k].img}.png" onerror="this.classList.remove('im');this.removeAttribute('src')">`;
const types = id => { const d = D(id); return [d[1], d[2]].filter(t => t >= 0).map(t => `<span class="ty" style="background:var(--t${t})">${TYN[t]}</span>`).join(' '); };
const tierEl = id => { const t = tierOf(id); return `<span class="tier r${t}">${TIERS[t]}</span>`; };
const short = n => n.length > 5 ? n.slice(0, 4) : n;
const coinEl = n => `<span class="coin tn"><i></i>${nb(n)}</span>`;

/* ---------- Lyd: små egne pip, ingen spillmusikk ---------- */
/* Lyden blandes med musikk du har på, og følger lydløs-bryteren på iPhone (Safari 16.4+). */
try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (_) {}
let AC = null;
function ac() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (_) { return null; }
}
/* Effektene går gjennom én hovedvolumknapp (S.vol). Skrikene har sin egen (S.cvol). */
let MG = null, NB = null;
function out() { const a = ac(); if (!a) return null; if (!MG) { MG = a.createGain(); MG.connect(a.destination); } MG.gain.value = Math.pow((S.vol == null ? 70 : S.vol) / 100, 1.6) * 1.6; return MG; }
/* f2: tonen glir mot f2 i løpet av d sekunder. */
function tone(f, at, d, v = 0.05, type = 'square', f2 = 0) {
  if (!S.sound) return;
  try {
    const m = out(); if (!m) return;
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(m); o.start(t); o.stop(t + d + 0.02);
  } catch (_) {}
}
/* Støy gjennom et båndpassfilter som glir fra f1 til f2: kast, sus og smell. */
function noise(at, d, v = 0.05, f1 = 2400, f2 = 500) {
  if (!S.sound) return;
  try {
    const m = out(); if (!m) return;
    if (!NB) { NB = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime + at;
    s.buffer = NB; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
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
  found: () => { tone(880, 0, 0.07); tone(1175, 0.08, 0.09); },
  appear: () => { for (let i = 0; i < 10; i++) tone(i % 2 ? 330 + i * 40 : 1320 - i * 60, i * 0.035, 0.04, 0.03); noise(0.35, 0.3, 0.025, 600, 3000); },
  thr: () => { noise(0, 0.28, 0.05, 3500, 500); tone(600, 0.05, 0.22, 0.02, 'triangle', 220); },
  wob: n => { tone(170 + (n || 0) * 25, 0, 0.07, 0.06, 'triangle'); tone(2400, 0, 0.012, 0.02); },
  got: () => { tone(1800, 0, 0.02, 0.04); seq([659, 784, 988, 1319], 0.1, 0.22, 0.06, 'triangle'); },
  fail: () => { noise(0, 0.12, 0.06, 1800, 3500); tone(500, 0.02, 0.14, 0.04, 'square', 1200); },
  flee: () => { noise(0, 0.35, 0.04, 2500, 400); tone(700, 0, 0.35, 0.03, 'triangle', 140); },
  coin: () => { tone(988, 0, 0.06); tone(1319, 0.06, 0.12); },
  sell: () => { tone(1319, 0, 0.05); tone(988, 0.05, 0.05); tone(1568, 0.11, 0.14, 0.04, 'triangle'); },
  lvl: () => seq([784, 988, 1175, 1568], 0.08, 0.12, 0.045, 'triangle'),
  hatch: () => { noise(0, 0.15, 0.05, 900, 2500); seq([1047, 1319, 1568, 2093], 0.07, 0.1, 0.04, 'triangle'); },
  evo: () => [392, 494, 587, 784, 988, 1175].forEach((f, i) => tone(f, i * 0.11, 0.2, 0.06, 'triangle'))
};
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
    src.buffer = buf; g.gain.value = vol * Math.pow((S.cvol == null ? 80 : S.cvol) / 100, 1.6) * 1.4; src.connect(g); g.connect(a.destination);
    src.start(a.currentTime + Math.max(0, delay - (performance.now() - t0)) / 1000);
    window.cryCount++;
  }).catch(() => {});
}
/* Lyd per type trykk. Handlinger med egen lyd (kast, kjøp, utvikling osv.) får ikke en ekstra. */
const OWN = new Set(['start', 'throw', 'buy', 'buyreg', 'evolve', 'sestart', 'sound', 'hunt', 'pick', 'cries', 'mon', 'candy', 'selldupes', 'sell']);
const SND = {
  tab: 'tab', lagv: 'tab', dexr: 'tab',
  fag: 'chip', min: 'chip', reg: 'chip', sort: 'chip', filt: 'chip', sety: 'chip',
  ball: 'ball', spec: 'open', plan: 'open', sync: 'open', backup: 'open', snext: 'ok', seadd: 'open',
  close: 'close', home: 'close', later: 'close', sback: 'close', sedel: 'close', skip: 'close', syncoff: 'close', toshop: 'open',
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
  $('#nav').innerHTML = NAV.map(([k, n, p]) => `<button type="button" data-a="tab" data-k="${k}"${U.tab === k ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg><span>${n}</span>${k === 'fokus' && S.pend.length ? '<i class="dot"></i>' : ''}</button>`).join('');
}
function render() {
  buildFags();
  if (!S.started) { $('#nav').hidden = true; $('#main').innerHTML = ''; return intro(); }
  $('#nav').hidden = false;
  renderNav();
  $('#main').innerHTML = `<div class="wrap">${VIEW[U.tab]()}</div>`;
}
const VIEW = {};
function enter() { const w = $('#main .wrap'); if (w) w.classList.add('enter'); }

function topBar() {
  const l = tlv(), a = tlvXp(l), b = tlvXp(l + 1), st = streak();
  return `<div class="top"><div class="lv tn"><small>LVL</small>${l}</div>
    <div class="sp"><div class="row" style="justify-content:space-between"><b>Trainer</b>${st >= 2 ? `<span class="pill" style="color:var(--sage)">${st}-day streak</span>` : ''}</div>
    <div class="bar" style="margin-top:7px"><i style="width:${Math.round((S.xp - a) / (b - a) * 100)}%"></i></div>
    <div class="sm tn" style="margin-top:4px">${nb(S.xp - a)} of ${nb(b - a)} XP to level ${l + 1}</div></div>
    ${coinEl(S.coins)}</div>`;
}

VIEW.fokus = () => {
  const p = partner(), fag = FAGS[U.fag] ? U.fag : curFag(), min = U.min || S.last.min, td = todayMin(), left = Math.max(0, S.cap - td);
  const n = Math.floor(Math.min(min, left) / 20) + (min >= 25 && left >= min ? 1 : 0) + (S.incOn ? 1 : 0);
  const rested = !(S.log[dayKey()] || {}).s;
  let h = topBar();
  if (p) {
    const ev = evoOpts(p), nx = ev.find(x => !x.ok), rdy = ev.find(x => x.ok), a = xpAt(p.lv), b = xpAt(p.lv + 1);
    h += `<button type="button" class="card partner" data-a="mon" data-u="${p.u}" style="--tc:var(--t${D(p.id)[1]});text-align:left;width:100%">${spr(p.id, { ani: 1, sh: p.sh })}
      <div class="sp"><div class="sm">Partner</div><div class="pn">${esc(D(p.id)[0])}</div>
      <div class="row sm tn" style="justify-content:space-between;margin-top:6px"><span>Level ${p.lv}</span><span>${rdy ? '<b style="color:var(--gold)">Ready to evolve</b>' : nx ? 'evolves ' + nx.why : ''}</span></div>
      <div class="bar" style="margin-top:5px"><i style="width:${Math.round((p.xp - a) / (b - a) * 100)}%"></i></div></div></button>`;
  }
  if (S.party.length > 1 || S.mons.length > 1) h += `<button type="button" class="card teamrow" data-a="tab" data-k="lag" aria-label="Open team"><span class="sm">Team</span><span class="tr-s">${S.party.slice(1).map(u => { const m = monBy(u); return m ? spr(m.id, { sh: m.sh, s: '38px' }) : ''; }).join('')}${Array.from({ length: 6 - S.party.length }, () => '<i></i>').join('')}</span><span class="sm tn">${S.mons.length} in box ›</span></button>`;
  if (S.pend.length) h += `<button type="button" class="card pendb" data-a="hunt" style="text-align:left;width:100%"><span class="grass live"><i></i><i></i><i></i><i></i></span><span class="sp"><b>${S.pend.length} ${S.pend.length === 1 ? 'encounter waiting' : 'encounters waiting'}</b><br><span class="sm">Something is rustling in the grass. Tap to step in.</span></span></button>`;
  h += `<div class="card"><div class="lab">Subject</div><div class="chips">${Object.keys(FAGS).map(k => `<button type="button" class="chip" data-a="fag" data-k="${k}" aria-pressed="${fag === k}">${esc(F(k).n)}</button>`).join('')}</div>
    <div class="lab" style="margin-top:14px">Length</div><div class="chips">${[25, 45, 60, 75, 90].map(m => `<button type="button" class="chip tn" data-a="min" data-k="${m}" aria-pressed="${min === m}">${m} min</button>`).join('')}</div>
    ${S.regions.length > 1 ? `<div class="lab" style="margin-top:14px">Route</div><div class="chips">${S.regions.map(r => `<button type="button" class="chip" data-a="reg" data-k="${r}" aria-pressed="${S.region === r}">${REG[r].n}</button>`).join('')}</div>` : ''}
    <button type="button" class="go" data-a="start" style="margin-top:16px">Start ${min} min</button>
    <p class="sm" style="margin-top:10px;text-align:center">${left <= 0 ? 'Your team is tired today: half XP and no encounters. Rest gives a bonus tomorrow.' : `${n} ${n === 1 ? 'encounter' : 'encounters'} · ${nb(Math.min(min, left) * 10 * (rested ? 1.5 : 1))} XP${rested ? ' with rested bonus' : ''}${F(fag).ty.length ? ' · more ' + F(fag).ty.map(t => TYN[t].toLowerCase()).join(' and ') : ''}`}</p></div>`;
  h += `<div class="card"><div class="row" style="justify-content:space-between"><b>Today</b><span class="sm tn">${hrs(td)} of ${hrs(S.cap)} h</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, Math.round(td / S.cap * 100))}%"></i></div>
    <div class="quests">${QUESTS.map(q => `<span class="${td >= q.m ? 'on' : ''}"><b>${td >= q.m ? '✓ ' : ''}${q.n}</b>${q.r}</span>`).join('')}</div>
    ${S.eggs.length ? `<div class="row" style="margin-top:14px"><span class="egg"></span><div class="sp"><div class="row sm tn" style="justify-content:space-between"><span>Egg${S.eggs.length > 1 ? ' (' + S.eggs.length + ')' : ''}</span><span>${S.eggs[0].need - S.eggs[0].got} min left</span></div><div class="bar gold" style="margin-top:5px"><i style="width:${Math.round(S.eggs[0].got / S.eggs[0].need * 100)}%"></i></div></div></div>` : ''}
    ${S.incOn ? '<p class="sm" style="margin-top:10px">Incense is lit for your next session.</p>' : ''}</div>`;
  return h;
};

/* ---------- Laget ---------- */
VIEW.lag = () => {
  const head = `<div class="row" style="justify-content:space-between"><h1 class="big">${U.lag === 'boks' ? 'Box' : 'Team'}</h1>${coinEl(S.coins)}</div>
    <div class="seg">${[['lag', `Team · ${S.party.length}`], ['boks', `Box · ${S.mons.length}`]].map(([k, n]) => `<button type="button" data-a="lagv" data-k="${k}" aria-pressed="${U.lag === k}">${n}</button>`).join('')}</div>`;
  if (U.lag !== 'boks') {
    const rows = Array.from({ length: 6 }, (_, i) => monBy(S.party[i])).map((m, i) => {
      if (!m) return `<button type="button" class="tcard empty" data-a="lagv" data-k="boks"><span class="plus">+</span><span class="sm">Empty slot. Pick one from the box.</span></button>`;
      const a = xpAt(m.lv), b = xpAt(m.lv + 1), rdy = evoOpts(m).some(x => x.ok);
      return `<button type="button" class="tcard${i ? '' : ' lead'}" data-a="mon" data-u="${m.u}" style="--tc:var(--t${D(m.id)[1]})">${spr(m.id, { ani: !i, sh: m.sh, s: i ? '60px' : '84px' })}
        <span class="sp"><span class="row" style="gap:6px"><b class="tn-n">${esc(D(m.id)[0])}</b>${i ? '' : '<span class="pill" style="background:var(--sage);color:#152013">Partner</span>'}${rdy ? '<span class="pill" style="color:var(--gold)">Can evolve</span>' : ''}</span>
        <span class="row sm tn" style="justify-content:space-between;margin-top:5px"><span>Level ${m.lv}</span><span>${i ? '30% XP' : 'all XP'}</span></span>
        <span class="bar" style="margin-top:5px"><i style="width:${Math.round((m.xp - a) / (b - a) * 100)}%;background:var(--tc)"></i></span></span></button>`;
    }).join('');
    return `${head}<div class="stack">${rows}</div><p class="sm">Your partner sits in the timer and gets all XP from sessions. Tap a Pokémon to switch partner, evolve it or remove it.</p>`;
  }
  const sorts = { ny: (a, b) => b.at - a.at, niva: (a, b) => b.lv - a.lv, sjelden: (a, b) => tierOf(b.id) - tierOf(a.id) || b.sh - a.sh || a.id - b.id, nr: (a, b) => a.id - b.id || b.lv - a.lv };
  const list = S.mons.slice().sort(sorts[U.sort]), du = dupes(), val = du.reduce((s, m) => s + sellValue(m), 0);
  return `${head}
    <div class="chips">${[['ny', 'Newest'], ['niva', 'Level'], ['sjelden', 'Rarity'], ['nr', 'Number']].map(([k, n]) => `<button type="button" class="chip" data-a="sort" data-k="${k}" aria-pressed="${U.sort === k}">${n}</button>`).join('')}</div>
    ${du.length ? `<button type="button" class="btn wide" data-a="selldupes">Sell ${du.length} ${du.length === 1 ? 'duplicate' : 'duplicates'} for ${coinEl(val)}</button>` : ''}
    <div class="grid box">${list.map(m => { const t = tierOf(m.id); return `<button type="button" class="cell nm r${t}${t >= 2 ? ' rr' : ''}${S.party.includes(m.u) ? ' inp' : ''}" data-a="mon" data-u="${m.u}" aria-label="${esc(D(m.id)[0])}, level ${m.lv}">${spr(m.id, { sh: m.sh, lazy: 1 })}<span class="nx">${esc(D(m.id)[0])}</span><span class="l tn">${m.lv}</span>${m.fav ? '<span class="c">★</span>' : ''}</button>`; }).join('')}</div>
    <p class="sm">Green dot = in team. Colored frame = rare or better.</p>`;
};
function monSheet(m) {
  const d = D(m.id), ev = evoOpts(m), inP = S.party.includes(m.u), lead = S.party[0] === m.u, a = xpAt(m.lv), b = xpAt(m.lv + 1), n = countOf(m.id);
  openSheet(`<div class="shead">${spr(m.id, { ani: 1, sh: m.sh })}<div class="sp"><div class="sm tn">No. ${m.id} · ${REG[regOf(m.id)].n}${m.sh ? ' · <b style="color:var(--gold)">Shiny</b>' : ''}</div><div class="pn">${esc(d[0])}</div><div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">${types(m.id)} ${tierEl(m.id)}</div></div></div>
    <div><div class="row sm tn" style="justify-content:space-between"><span>Level ${m.lv}</span><span>${n > 1 ? 'You have ' + n + ' of these' : 'Your only one'}</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.round((m.xp - a) / (b - a) * 100)}%"></i></div></div>
    <div class="stack">
    ${ev.map(o => `<button type="button" class="btn ${o.ok ? 'gold' : ''} wide" data-a="evolve" data-u="${m.u}" data-k="${o.to}"${o.ok ? '' : ' disabled'}>${o.ok ? 'Evolve into ' + esc(D(o.to)[0]) : 'Evolves ' + o.why}</button>`).join('')}
    ${lead ? '' : `<button type="button" class="btn sage wide" data-a="lead" data-u="${m.u}">Make partner</button>`}
    <div class="row"><button type="button" class="btn sp" data-a="party" data-u="${m.u}"${(inP && S.party.length < 2) || (!inP && S.party.length >= 6) ? ' disabled' : ''}>${inP ? 'Remove from team' : 'Add to team'}</button><button type="button" class="btn sp" data-a="fav" data-u="${m.u}">${m.fav ? 'Unfavorite' : 'Favorite'}</button></div>
    <button type="button" class="btn wide" data-a="candy" data-u="${m.u}"${S.items.candy > 0 ? '' : ' disabled'}>Use Rare Candy (${S.items.candy})</button>
    <button type="button" class="btn wide danger" data-a="sell" data-u="${m.u}"${S.mons.length > 1 ? '' : ' disabled'}>Sell for ${coinEl(sellValue(m))}</button></div>`);
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
    <div class="card"><div class="row" style="justify-content:space-between"><b>${g.n}</b><span class="sm tn">${dexCount(r)} of ${g.b - g.a + 1} caught</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.round(dexCount(r) / (g.b - g.a + 1) * 100)}%"></i></div>${open ? '' : `<p class="sm" style="margin-top:8px">This route is locked. Unlock it in the shop for ${nb(g.c)} coins.</p>`}</div>
    <div class="grid">${cells}</div>`;
};
function specSheet(id) {
  const d = D(id), got = S.caught[id], chain = [];
  let b = id; while (D(b)[4]) b = D(b)[4];
  (function walk(x) { chain.push(x); (EVO[x] || []).forEach(walk); })(b);
  openSheet(`<div class="shead">${spr(id, { ani: got ? 1 : 0, sil: !got })}<div class="sp"><div class="sm tn">No. ${id} · ${REG[regOf(id)].n}</div><div class="pn">${got ? esc(d[0]) : '???'}</div><div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">${got ? types(id) : ''} ${tierEl(id)}</div></div></div>
    <p class="sm">${got ? `You have ${countOf(id)}.` : 'Seen, but not caught yet.'}</p>
    ${chain.length > 1 ? `<div><div class="lab">Evolution line</div><div class="row" style="flex-wrap:wrap;gap:4px">${chain.map(x => `<span class="cell${S.caught[x] ? '' : ' un'}" style="width:64px">${S.caught[x] || S.seen[x] ? spr(x, { sil: !S.caught[x] }) : `<span class="q tn">${x}</span>`}</span>`).join('')}</div></div>` : ''}
    <button type="button" class="btn wide" data-a="close">Close</button>`);
}

/* ---------- Butikk ---------- */
VIEW.butikk = () => {
  const l = tlv(), own = k => k === 'egg' ? S.eggs.length : k === 'incense' ? (S.incOn ? 1 : 0) : S.items[k];
  const ic = k => SHOP[k].img ? ballEl(k, '30px') : SHOP[k].ic === 'egg' ? '<span class="egg" style="transform:scale(.7)"></span>' : `<span class="${SHOP[k].ic}"></span>`;
  return `<div class="row" style="justify-content:space-between"><h1 class="big">Shop</h1>${coinEl(S.coins)}</div>
    <div class="card" style="padding-top:6px;padding-bottom:6px">${Object.keys(SHOP).map(k => { const it = SHOP[k], lock = it.lv && l < it.lv, full = (k === 'egg' && S.eggs.length >= 3) || (k === 'incense' && S.incOn);
      return `<div class="item"><span class="ic">${ic(k)}</span><div class="sp"><b>${it.n}</b> <span class="sm tn">· own ${own(k)}</span><div class="sm">${it.d}</div></div><button type="button" class="btn sm2 ${S.coins >= it.p && !lock && !full ? 'pri' : ''}" data-a="buy" data-k="${k}"${S.coins < it.p || lock || full ? ' disabled' : ''}>${lock ? 'Level ' + it.lv : full ? 'Full' : nb(it.p)}</button></div>`; }).join('')}</div>
    <h2 class="h">Routes</h2>
    <div class="card" style="padding-top:6px;padding-bottom:6px">${[1, 2, 3, 4, 5].map(r => { const g = REG[r], has = S.regions.includes(r);
      return `<div class="item"><span class="ic"><span class="map"></span></span><div class="sp"><b>${g.n}</b><div class="sm tn">${g.b - g.a + 1} species · ${dexCount(r)} caught</div></div>${has ? `<button type="button" class="btn sm2" data-a="reg" data-k="${r}"${S.region === r ? ' disabled' : ''}>${S.region === r ? 'Here now' : 'Travel here'}</button>` : `<button type="button" class="btn sm2 ${S.coins >= g.c ? 'pri' : ''}" data-a="buyreg" data-k="${r}"${S.coins < g.c ? ' disabled' : ''}>${nb(g.c)}</button>`}</div>`; }).join('')}</div>
    <p class="sm">Coins come from focus minutes (2 per minute), completed sessions and selling duplicates.</p>`;
};

/* ---------- Profil: merker, statistikk, innstillinger ---------- */
VIEW.profil = () => {
  const t0 = new Date(), tot = totalMin(), ses = Object.values(S.log).reduce((s, d) => s + d.s, 0);
  const badges = Object.keys(S.fag).map(f => { const g = S.fag[f], m = fagMin(f), pct = Math.min(1, m / (g.t * 60)), dd = g.d ? Math.round((new Date(g.d + 'T00:00') - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 864e5) : null;
    return `<div class="item" style="--tc:${F(f).c}"><span class="badge${pct >= 1 ? ' on' : ''}">${esc(short(F(f).n))}</span><div class="sp"><div class="row" style="justify-content:space-between"><b>${esc(F(f).n)} badge</b><span class="sm tn">${dd == null ? '' : dd > 0 ? 'exam in ' + dd + ' d' : dd === 0 ? 'exam today' : 'done'}</span></div>
      <div class="bar" style="margin-top:6px"><i style="width:${Math.round(pct * 100)}%;background:${F(f).c}"></i></div><div class="sm tn" style="margin-top:4px">${hrs(m)} of ${hrs(g.t * 60)} h · next reward at ${Math.min(100, (g.ms + 1) * 25)}%</div></div></div>`; }).join('');
  let hm = '';
  const mon = addDays(t0, -((t0.getDay() + 6) % 7) - 63);
  for (let i = 0; i < 70; i++) { const d = addDays(mon, i), k = dayKey(d), m = (S.log[k] || { m: 0 }).m; hm += `<i class="${m ? (m < 90 ? 'l1' : m < 180 ? 'l2' : m < 270 ? 'l3' : 'l4') : ''}${k === dayKey() ? ' td' : ''}" title="${d.getDate()}.${d.getMonth() + 1}: ${m} min"></i>`; }
  const all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0);
  return `<h1 class="big">Profile</h1>${topBar()}
    <h2 class="h">Badges</h2><div class="card" style="padding-top:6px;padding-bottom:6px">${badges}</div>
    <p class="sm">Each badge fills with focus hours in that subject. 25, 50 and 75% give an epic encounter, and a full badge gives a legendary one.</p>
    <h2 class="h">Stats</h2>
    <div class="gain"><div><span class="sm">Total focus</span><b class="tn">${hrs(tot)} h</b></div><div><span class="sm">Sessions</span><b class="tn">${ses}</b></div><div><span class="sm">Day streak</span><b class="tn">${streak()}</b></div><div><span class="sm">Species caught</span><b class="tn">${all}</b></div></div>
    <div class="card"><div class="lab">Last ten weeks</div><div class="hm">${hm}</div></div>
    <h2 class="h">Settings</h2>
    <div class="card stack">
      <label class="field">Daily cap before your team gets tired<select data-c="cap">${[240, 300, 360, 420, 480].map(c => `<option value="${c}"${S.cap === c ? ' selected' : ''}>${c / 60} hours</option>`).join('')}</select></label>
      <div class="row"><button type="button" class="btn sp" data-a="sound">Sound: ${S.sound ? 'on' : 'off'}</button><button type="button" class="btn sp" data-a="cries"${S.sound ? '' : ' disabled'}>Cries: ${S.cries ? 'on' : 'off'}</button></div>
      ${S.sound ? `<div class="volrow"><span>Effects</span><input type="range" min="0" max="100" step="5" value="${S.vol}" data-v="vol" aria-label="Effects volume"><b class="tn" id="vv-vol">${S.vol}%</b></div>${S.cries ? `<div class="volrow"><span>Cries</span><input type="range" min="0" max="100" step="5" value="${S.cvol}" data-v="cvol" aria-label="Cries volume"><b class="tn" id="vv-cvol">${S.cvol}%</b></div>` : ''}` : ''}
      <button type="button" class="btn wide" data-a="plan">Edit subjects</button>
      <button type="button" class="btn wide" data-a="sync">Sync between devices${GH ? ' · ' + (ghState === 'ok' ? 'on' : ghState || 'connecting') : ''}</button>
      <button type="button" class="btn wide" data-a="backup">Backup</button>
    </div>
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
  U.sd = subjDraft();
  openSheet(`<h2 class="h">Your subjects</h2><p class="sm">Up to four. Each one gets a badge that fills as you focus, and its types show up more often in its sessions. Other is always there too.</p>
    <div id="se" class="stack">${seCards()}</div><p class="err" id="se-err" role="alert"></p>
    <button type="button" class="btn pri wide" data-a="sesave">Save</button>`);
}
function syncSheet() {
  let lb = null; try { lb = JSON.parse(localStorage.getItem('lb.gh') || 'null'); } catch (_) {}
  openSheet(`<h2 class="h">Sync between devices</h2><p class="sm">Your save is stored as one file (fokusdex/save.json) in a private GitHub repo. Use the same key and repo on each device. If two devices disagree, the one that has played the most wins.</p>
    <label class="field">Repo (owner/name)<input id="gh-r" autocapitalize="off" autocomplete="off" value="${esc(GH ? GH.repo : '')}" placeholder="mwalderhaug/live-blekker-data"></label>
    <label class="field">Key (fine-grained token with Contents: read and write)<input id="gh-t" type="password" autocomplete="off" value="${esc(GH ? GH.t : '')}"></label>
    ${lb && lb.t && lb.repo ? '<button type="button" class="btn wide" data-a="synclb">Use the key from Live-blekker</button>' : ''}
    <p class="sm" id="gh-s">${GH ? (ghState === 'ok' ? 'Sync is on.' : esc(ghState)) : 'Sync is off.'}</p>
    <div class="row"><button type="button" class="btn pri sp" data-a="syncsave">Connect</button>${GH ? '<button type="button" class="btn sp danger" data-a="syncoff">Turn off</button>' : ''}</div>`);
}
function backupSheet() {
  openSheet(`<h2 class="h">Backup</h2><p class="sm">Copy the text to keep your game safe, or paste a copy to restore it.</p>
    <label class="field">Paste a copy here<input id="bk-in" autocomplete="off"></label>
    <div class="row"><button type="button" class="btn sp" data-a="bkcopy">Copy game</button><button type="button" class="btn sp" data-a="bkload">Restore from copy</button></div>
    <button type="button" class="btn wide danger" data-a="reset">Start over from scratch</button>`);
}

/* ---------- Ark ---------- */
function openSheet(html) { const w = $('#sheet'); w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><span class="grab"></span>${html}</div>`; w.hidden = false; }
function closeSheet() { const w = $('#sheet'); w.hidden = true; w.innerHTML = ''; }
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
  const t = S.timer, p = partner(), n = Math.floor(t.min / 20) + (t.min >= 25 ? 1 : 0);
  U.quit = 0;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="quit" id="t-quit">Cancel</button><span class="pill" style="background:${F(t.fag).c};color:#17130f">${esc(F(t.fag).n)} · ${t.min} min</span></div>
    <div class="mid"><div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="a0" cx="50" cy="50" r="46"/><circle class="a1" id="t-arc" cx="50" cy="50" r="46" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/></svg>
      <div class="in">${p ? spr(p.id, { ani: 1, sh: p.sh }) : ''}<div class="clock" id="t-clock" role="timer"></div><div class="sm" id="t-sub"></div></div></div>
      <div><div class="found" id="t-found" aria-label="Encounters found">${Array.from({ length: n }, () => '<i></i>').join('')}</div><p class="sm" style="margin-top:8px" id="t-hint">A new encounter every 20 minutes.</p></div></div>
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
  $('#t-sub').textContent = t.pausedAt ? 'Paused' : `+${nb(Math.floor(ms / 60000) * 10)} XP`;
  $('#t-pause').textContent = t.pausedAt ? 'Resume' : 'Pause';
  const got = Math.floor(ms / 1200000), dots = $('#t-found').children;
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
  R.hatch.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { sh: m.sh })}<span><b>Egg hatched: ${esc(D(m.id)[0])}</b><br><span class="sm">${x.isNew ? 'New to your collection' : 'You already have it'}${m.sh ? ' · shiny' : ''}</span></span></div>`); });
  R.ups.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { sh: m.sh })}<span><b>${esc(D(m.id)[0])} level ${x.l0} → ${x.l1}</b>${x.evo ? '<br><span class="sm" style="color:var(--gold)">Ready to evolve</span>' : ''}</span></div>`); });
  R.gifts.forEach(g => news.push(`<div><span class="grass"><i></i><i></i><i></i><i></i></span><span>${esc(g)}</span></div>`));
  const notes = [R.rested ? 'Rested bonus: 1.5× on your first session of the day.' : '', R.tired ? 'Your team is tired: minutes past the daily cap gave half XP and no encounters.' : '', R.full ? '' : 'Ended early: you are rewarded for the minutes you did.'].filter(Boolean);
  ov(`<div class="mid" style="justify-content:flex-start;padding-top:8vh"><div><h1 class="big">${R.full ? 'Session complete.' : 'Nice work.'}</h1><p class="mut tn" style="margin-top:6px">${R.min} min ${esc(F(R.fag).n)}</p></div>
    <div class="gain"><div><span class="sm">XP</span><b class="tn" id="r-xp">+0</b></div><div><span class="sm">Coins</span><b class="tn" id="r-co">+0</b></div></div>
    ${notes.length ? `<p class="sm">${notes.join(' ')}</p>` : ''}
    <div class="news">${news.map((n, i) => n.replace('<div>', `<div style="animation-delay:${0.3 + i * 0.15}s">`)).join('')}</div></div>
    <div class="acts">${S.pend.length ? `<button type="button" class="btn gold" data-a="hunt">Into the grass · ${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'}</button><button type="button" class="btn nf" data-a="home">Later</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`, 'tint', F(R.fag).c);
  countUp($('#r-xp'), R.xp); countUp($('#r-co'), R.coins);
  if (R.hatch.length) setTimeout(() => { sfx.hatch(); const m = monBy(R.hatch[0].u); if (m) cry(m.id, 500); }, 900);
  else if (R.ups.length) setTimeout(sfx.lvl, 900);
}

/* ---------- Møte og fangst ---------- */
const E = { e: null, ball: 'poke', c: 50, pos: 50, raf: 0, t0: 0, busy: false, done: null };
function bestBall() { return ['poke', 'great', 'ultra'].find(k => S.items[k] > 0) || 'poke'; }
function hunt() {
  if (!S.pend.length) { closeOv(); return render(); }
  E.e = S.pend[0]; E.done = null; E.busy = true;
  if (!(S.items[E.ball] > 0)) E.ball = bestBall();
  S.seen[E.e.id] = 1;
  drawEnc(true);
  sfx.appear(); cry(E.e.id, 650);
  setTimeout(() => { E.busy = false; aim(); }, 1150);
}
function drawEnc(reveal) {
  if (!(S.items[E.ball] > 0)) E.ball = bestBall();
  const e = E.e, d = D(e.id), n = countOf(e.id), noBalls = !['poke', 'great', 'ultra'].some(k => S.items[k] > 0);
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="later">Save for later</button><span class="pill tn" id="e-left">${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'} left</span></div>
    <div class="mid r${e.t}"><div class="stage${reveal ? ' rev' : ''}" id="e-stage">${spr(e.id, { ani: 1, sh: e.sh })}<span class="tball">${ballEl(E.ball, '54px')}</span><span class="stars" id="e-stars"></span></div>
      <div><div class="ename">${e.sh ? 'Shiny ' : ''}${esc(d[0])}</div><div class="row" style="justify-content:center;margin-top:8px;flex-wrap:wrap;gap:6px">${tierEl(e.id)} ${types(e.id)} <span class="pill tn">Level ${e.lv}</span></div>
      <p class="sm" style="margin-top:8px" id="e-msg">${S.caught[e.id] ? (n ? `You already have ${n}.` : 'You have had it before.') : '<b style="color:var(--sage)">New to your collection</b>'}</p></div>
      <div class="hearts" id="e-hearts" aria-label="Attempts left">${Array.from({ length: isLeg(e.id) ? 4 : 3 }, (_, i) => `<i class="${i < e.tr ? '' : 'off'}"></i>`).join('')}</div></div>
    <div id="e-ctl" style="display:flex;flex-direction:column;gap:12px">${noBalls ? `<p class="sm" style="text-align:center">You are out of balls. Buy more in the shop and the encounter will wait here.</p><div class="acts"><button type="button" class="btn pri" data-a="toshop">To the shop</button><button type="button" class="btn nf" data-a="skip">Let it go</button></div>` : `
      <button type="button" class="meter" data-a="throw" aria-label="Throw when the marker is in the green zone"><span class="z" id="e-z"></span><span class="g" id="e-g"></span><span class="m" id="e-m"></span></button>
      <div class="balls">${['poke', 'great', 'ultra'].map(k => `<button type="button" data-a="ball" data-k="${k}" aria-pressed="${E.ball === k}" aria-label="${SHOP[k].n}"${S.items[k] > 0 ? '' : ' disabled'}>${ballEl(k, '28px')}<span class="tn">${S.items[k]}</span></button>`).join('')}</div>
      <div class="acts"><button type="button" class="btn gold" data-a="throw">Throw</button><button type="button" class="btn nf" data-a="skip">Let it go</button></div>`}</div>`, 'tint', `var(--r${e.t})`);
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
  msg.innerHTML = zone === 2 ? '<b style="color:var(--gold)">Perfect throw</b>' : zone === 1 ? 'Nice throw' : 'Outside the zone';
  st.className = 'stage in'; sfx.thr(); buzz(30);
  const wobs = r.ok ? 3 : 1 + (Math.random() < r.p ? 1 : 0);
  let i = 0;
  const step = () => {
    if (i < wobs) { st.className = 'stage held'; void st.offsetWidth; st.className = 'stage held wob'; sfx.wob(i); buzz(20); i++; return setTimeout(step, 700); }
    if (r.ok) {
      st.className = 'stage held'; sfx.got(); buzz([60, 40, 60, 40, 140]);
      $('#e-stars').innerHTML = Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283, d = 70 + Math.random() * 50; return `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${k * 0.02}s"></i>`; }).join('');
      msg.innerHTML = `<b style="color:var(--sage)">Caught.</b> ${r.isNew ? 'New to your collection.' : 'A duplicate you can sell or keep.'}`;
      cry(e.id, 650); E.done = 'got'; $('#e-left').textContent = S.pend.length ? `${S.pend.length} ${S.pend.length === 1 ? 'encounter' : 'encounters'} left` : 'Last encounter';
    } else {
      st.className = 'stage out'; if (r.fled) sfx.flee(); else sfx.fail();
      if (r.fled) { setTimeout(() => { st.className = 'stage fled'; }, 380); msg.textContent = 'It ran away.'; E.done = 'fled'; }
      else { msg.textContent = `It broke free. ${e.tr} ${e.tr === 1 ? 'attempt' : 'attempts'} left.`; }
    }
    setTimeout(() => {
      E.busy = false;
      if (E.done) { $('#e-ctl').innerHTML = `<div class="acts">${S.pend.length ? `<button type="button" class="btn gold" data-a="hunt">Next encounter · ${S.pend.length} left</button><button type="button" class="btn nf" data-a="home">Done</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`; }
      else { st.className = 'stage'; drawEnc(false); aim(); }
    }, r.ok ? 900 : 650);
  };
  setTimeout(step, 420);
}
function evoShow(m, from) {
  closeSheet();
  ov(`<div class="mid r${tierOf(m.id)}"><div class="stage rev">${spr(m.id, { ani: 1, sh: m.sh })}</div><div><p class="mut">${esc(D(from)[0])} evolved into</p><div class="ename">${esc(D(m.id)[0])}</div><div class="row" style="justify-content:center;margin-top:8px;gap:6px">${types(m.id)}</div></div></div>
    <div class="acts"><button type="button" class="btn pri" data-a="home">Continue</button></div>`, 'tint', `var(--t${D(m.id)[1]})`);
  sfx.evo(); cry(m.id, 750); buzz([80, 50, 80, 50, 200]);
}

/* ---------- Handlinger ---------- */
const A = {
  tab: el => { U.tab = el.dataset.k; render(); $('#main').scrollTop = 0; enter(); },
  lagv: el => { U.lag = el.dataset.k; render(); enter(); },
  fag: el => { U.fag = el.dataset.k; render(); },
  min: el => { U.min = +el.dataset.k; render(); },
  reg: el => { S.region = +el.dataset.k; save(); render(); },
  start: () => { startTimer(FAGS[U.fag] ? U.fag : curFag(), U.min || S.last.min); sfx.start(); showTimer(); },
  pause: () => { togglePause(); paintTimer(); },
  early: () => endTimer(),
  quit: () => { if (!U.quit) { U.quit = 1; $('#t-quit').textContent = 'Tap again to cancel'; setTimeout(() => { U.quit = 0; const b = $('#t-quit'); if (b) b.textContent = 'Cancel'; }, 3000); return; } clearInterval(tick); dropAwake(); S.timer = null; save(true); document.title = 'Fokusdex'; closeOv(); render(); },
  home: () => { closeOv(); render(); },
  hunt: () => hunt(),
  later: () => { cancelAnimationFrame(E.raf); closeOv(); render(); },
  skip: () => { if (E.busy) return; cancelAnimationFrame(E.raf); dropPend(E.e); save(); hunt(); },
  toshop: () => { closeOv(); U.tab = 'butikk'; render(); },
  ball: el => { if (E.busy) return; E.ball = el.dataset.k; drawEnc(false); aim(); },
  throw: () => doThrow(),
  mon: el => { const m = monBy(+el.dataset.u); if (m) { cry(m.id, 0, 0.35); monSheet(m); } },
  spec: el => specSheet(+el.dataset.k),
  close: () => closeSheet(),
  sort: el => { U.sort = el.dataset.k; render(); },
  dexr: el => { U.dex = +el.dataset.k; render(); },
  lead: el => { const m = monBy(+el.dataset.u); setPartner(m); closeSheet(); render(); toast(`${D(m.id)[0]} is now your partner.`); },
  party: el => { const m = monBy(+el.dataset.u); toggleParty(m); render(); monSheet(m); },
  fav: el => { const m = monBy(+el.dataset.u); m.fav = m.fav ? 0 : 1; save(); render(); monSheet(m); },
  candy: el => { const m = monBy(+el.dataset.u); if (useCandy(m)) { sfx.coin(); render(); monSheet(m); } },
  evolve: el => { const m = monBy(+el.dataset.u), from = m.id; if (evolve(m, +el.dataset.k)) { render(); evoShow(m, from); } },
  sell: el => { const m = monBy(+el.dataset.u); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.innerHTML = 'Tap again to sell'; return; } const v = sell(m); save(); sfx.sell(); closeSheet(); render(); toast(`Sold for ${nb(v)} coins.`); },
  selldupes: el => { const du = dupes(); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = `Tap again to sell ${du.length}`; return; } let v = 0; du.forEach(m => { v += sell(m); }); save(); sfx.sell(); render(); toast(`${du.length} sold for ${nb(v)} coins.`); },
  buy: el => { if (buy(el.dataset.k)) { sfx.coin(); render(); toast(`${SHOP[el.dataset.k].n} bought.`); } },
  buyreg: el => { const r = +el.dataset.k; if (buyRegion(r)) { sfx.evo(); render(); toast(`${REG[r].n} is unlocked. You are there now.`); } },
  sound: () => { S.sound = S.sound ? 0 : 1; save(); sfx.tap(); render(); },
  cries: () => { S.cries = S.cries ? 0 : 1; save(); if (S.cries) { const p = partner(); if (p) cry(p.id); } render(); },
  plan: () => subjSheet(),
  seadd: () => { if (U.sd.length < 4) { U.sd.push({ k: '', n: '', ty: [], t: '', h: '', d: '' }); seRedraw(); const f = document.querySelectorAll('#se .sein'); if (f.length) f[f.length - 1].focus(); } },
  sedel: el => { U.sd.splice(+el.dataset.i, 1); seRedraw(); },
  sety: el => { const s = U.sd[+el.dataset.i], t = +el.dataset.k; if (s.ty.includes(t)) s.ty = s.ty.filter(x => x !== t); else { s.ty.push(t); if (s.ty.length > 2) s.ty.shift(); } seRedraw(); },
  sesave: () => { const r = seRead(); if (typeof r === 'string') { $('#se-err').textContent = r; return; } setSubjects(r); save(); closeSheet(); render(); toast('Subjects saved.'); },
  snext: () => { if (!pick) return; U.step = 2; if (!U.sd) U.sd = [{ k: '', n: '', ty: [], t: '', h: '', d: '' }]; intro(); $('#ov').scrollTop = 0; },
  sback: () => { U.step = 1; intro(); },
  sestart: () => { const r = seRead(); if (typeof r === 'string') { $('#se-err').textContent = r; return; } setSubjects(r); const c = begin(pick); sfx.evo(); closeOv(); render(); toast(c ? `${nb(c)} coins for the hours you have already done. Good luck.` : 'Good luck. Your first session gets the rested bonus.'); },
  sync: () => syncSheet(),
  synclb: () => { try { const lb = JSON.parse(localStorage.getItem('lb.gh')); $('#gh-r').value = lb.repo; $('#gh-t').value = lb.t; } catch (_) {} },
  syncsave: () => { const t = $('#gh-t').value.trim(), r = $('#gh-r').value.trim(); if (!t || !/^[\w.-]+\/[\w.-]+$/.test(r)) { $('#gh-s').textContent = 'Enter the repo as owner/name and paste the key.'; return; } ghSet(t, r); $('#gh-s').textContent = 'Connecting…'; ghPull(); },
  syncoff: () => { ghSet('', ''); closeSheet(); render(); toast('Sync turned off.'); },
  backup: () => backupSheet(),
  bkcopy: () => { const txt = b64e(JSON.stringify(S)); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied.'), () => { $('#bk-in').value = txt; toast('Copy the text in the field.'); }); },
  bkload: () => { try { const o = JSON.parse(b64d($('#bk-in').value.trim())); if (!o || o.v !== 1 || !Array.isArray(o.mons)) throw 0; adopt(o); save(); closeSheet(); render(); toast('Game restored.'); } catch (_) { toast('That was not a valid copy.'); } },
  reset: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: everything is deleted'; return; } S = fresh(); save(); pick = 0; U.step = 1; U.sd = null; closeSheet(); render(); },
  pick: el => { pick = +el.dataset.k; cry(pick, 0, 0.4); intro(); },
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  if (el && !el.disabled && A[el.dataset.a]) { click(el.dataset.a); A[el.dataset.a](el); return; }
  if (ev.target.id === 'sheet') closeSheet();
});
let volT = 0;
document.addEventListener('input', ev => {
  const v = ev.target.dataset && ev.target.dataset.v;
  if (!v) return;
  S[v] = +ev.target.value; $('#vv-' + v).textContent = S[v] + '%';
  const now = performance.now(); if (now - volT < 180) return; volT = now;
  if (v === 'vol') sfx.chip(); else { const p = partner(); if (p && now - (window.cryT || 0) > 700) { window.cryT = now; cry(p.id, 0, 0.45); } }
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
  if (S.timer) { keepAwake(); paintTimer(); } else ghPull();
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
ghHook = adopted => { const s = $('#gh-s'); if (s) s.textContent = ghState === 'ok' ? 'Sync is on.' : ghState; if (adopted && !S.timer && ($('#ov').hidden || $('#nav').hidden)) { closeOv(); render(); toast('Loaded a newer save from another device.'); } };
render();
if (S.started && S.timer) showTimer();
ghPull();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
