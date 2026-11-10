'use strict';
/* Fokusdex – skjermene. Hver fane tegnes på nytt fra tilstanden (S) når noe endres; fokusklokka og fangstmåleren oppdaterer bare sine egne elementer. */

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nb = n => Math.round(n).toLocaleString('nb-NO');
const hrs = m => (Math.round(m / 6) / 10).toLocaleString('nb-NO');

/* ---------- Bilder ----------
   Appen inneholder ingen bilder av Pokémon. De hentes fra PokeAPI sitt åpne bildearkiv når appen brukes (med Showdown som reserve) og mellomlagres på enheten. */
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
const slug = id => D(id)[0].toLowerCase().replace('♀', 'f').replace('♂', 'm').replace(/[^a-z0-9]/g, '');
function spr(id, o = {}) {
  const sd = `https://play.pokemonshowdown.com/sprites/${o.sh ? 'gen5-shiny' : 'gen5'}/${slug(id)}.png`;
  const png = `${SPR}pokemon/${o.sh ? 'shiny/' : ''}${id}.png`;
  const gif = `${SPR}pokemon/versions/generation-v/black-white/animated/${o.sh ? 'shiny/' : ''}${id}.gif`;
  const list = o.ani ? [gif, png, sd] : [png, sd];
  return `<span class="sprb${o.sil ? ' sil' : ''}${o.sh && !o.sil ? ' shiny' : ''}" style="--tc:var(--t${D(id)[1]})${o.s ? ';--s:' + o.s : ''}" data-n="${id}"><img class="spr" alt="${o.sil ? 'Ukjent' : esc(D(id)[0])}" ${o.lazy ? 'loading="lazy" ' : ''}src="${list[0]}" data-f="${list.slice(1).join('|')}" onload="this.classList.add('ok')" onerror="sprErr(this)"></span>`;
}
window.sprErr = img => {
  const f = (img.dataset.f || '').split('|').filter(Boolean);
  if (f.length) { img.dataset.f = f.slice(1).join('|'); img.src = f[0]; }
  else { img.parentNode.classList.add('noimg'); img.remove(); }
};
const ballEl = (k, s) => `<img class="ball im" style="--bc:${SHOP[k].bc}${s ? ';--s:' + s : ''}" alt="" src="${SPR}items/${SHOP[k].img}.png" onerror="this.classList.remove('im');this.removeAttribute('src')">`;
const types = id => { const d = D(id); return [d[1], d[2]].filter(t => t >= 0).map(t => `<span class="ty" style="background:var(--t${t})">${TYN[t]}</span>`).join(' '); };
const tierEl = id => { const t = tierOf(id); return `<span class="tier r${t}">${TIERS[t]}</span>`; };
const coinEl = n => `<span class="coin tn"><i></i>${nb(n)}</span>`;

/* ---------- Lyd: små egne pip, ingen spillmusikk ---------- */
let AC = null;
function tone(f, at, d, v = 0.05, type = 'square') {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + at;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (_) {}
}
const sfx = {
  tap: () => tone(520, 0, 0.05, 0.03),
  start: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.09, 0.12)),
  done: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2, 0.06, 'triangle')),
  found: () => { tone(880, 0, 0.07); tone(1175, 0.08, 0.09); },
  appear: () => [330, 392, 494, 659].forEach((f, i) => tone(f, i * 0.07, 0.1)),
  thr: () => { tone(300, 0, 0.08, 0.04, 'sawtooth'); tone(180, 0.08, 0.1, 0.04, 'sawtooth'); },
  wob: () => tone(220, 0, 0.06, 0.05),
  got: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.1, 0.22, 0.06, 'triangle')),
  fail: () => { tone(260, 0, 0.12, 0.05, 'sawtooth'); tone(196, 0.12, 0.2, 0.05, 'sawtooth'); },
  coin: () => { tone(988, 0, 0.06); tone(1319, 0.06, 0.12); },
  evo: () => [392, 494, 587, 784, 988, 1175].forEach((f, i) => tone(f, i * 0.11, 0.2, 0.06, 'triangle'))
};
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) {} };

let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

/* ---------- Faner ---------- */
const U = { tab: 'fokus', lag: 'lag', fag: null, min: null, sort: 'ny', dex: null, R: null, enc: null, quit: 0 };
const NAV = [
  ['fokus', 'Fokus', '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>'],
  ['lag', 'Laget', '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6.5" r="2"/><circle cx="17" cy="9" r="2"/><path d="M12 12c-3 0-5.5 2.6-5.5 5.2 0 1.6 1.4 2.3 3 2.3 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.6 0 3-.7 3-2.3C17.500 14.6 15 12 12 12z"/>'],
  ['dex', 'Dex', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.500" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'],
  ['butikk', 'Butikk', '<path d="M5 8h14l-1.2 11.200H6.2L5 8z"/><path d="M9 8V6.500a3 3 0 0 1 6 0V8"/>'],
  ['profil', 'Profil', '<circle cx="12" cy="9" r="5"/><path d="M8.500 13.200L7 21l5-2.500L17 21l-1.500-7.800"/>']
];
function renderNav() {
  $('#nav').innerHTML = NAV.map(([k, n, p]) => `<button type="button" data-a="tab" data-k="${k}"${U.tab === k ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg><span>${n}</span>${k === 'fokus' && S.pend.length ? '<i class="dot"></i>' : ''}</button>`).join('');
}
function render() {
  if (!S.started) { $('#nav').hidden = true; $('#main').innerHTML = ''; return intro(); }
  $('#nav').hidden = false;
  renderNav();
  $('#main').innerHTML = `<div class="wrap">${VIEW[U.tab]()}</div>`;
}
const VIEW = {};
function enter() { const w = $('#main .wrap'); if (w) w.classList.add('enter'); }

function topBar() {
  const l = tlv(), a = tlvXp(l), b = tlvXp(l + 1), st = streak();
  return `<div class="top"><div class="lv tn"><small>NIVÅ</small>${l}</div>
    <div class="sp"><div class="row" style="justify-content:space-between"><b>Trener</b>${st >= 2 ? `<span class="pill" style="color:var(--sage)">${st} dager på rad</span>` : ''}</div>
    <div class="bar" style="margin-top:7px"><i style="width:${Math.round((S.xp - a) / (b - a) * 100)}%"></i></div>
    <div class="sm tn" style="margin-top:4px">${nb(S.xp - a)} av ${nb(b - a)} XP til nivå ${l + 1}</div></div>
    ${coinEl(S.coins)}</div>`;
}

VIEW.fokus = () => {
  const p = partner(), fag = U.fag || S.last.fag, min = U.min || S.last.min, td = todayMin(), left = Math.max(0, S.cap - td);
  const n = Math.floor(Math.min(min, left) / 20) + (min >= 25 && left >= min ? 1 : 0) + (S.incOn ? 1 : 0);
  const rested = !(S.log[dayKey()] || {}).s;
  let h = topBar();
  if (p) {
    const ev = evoOpts(p), nx = ev.find(x => !x.ok), rdy = ev.find(x => x.ok), a = xpAt(p.lv), b = xpAt(p.lv + 1);
    h += `<button type="button" class="card partner" data-a="mon" data-u="${p.u}" style="--tc:var(--t${D(p.id)[1]});text-align:left;width:100%">${spr(p.id, { ani: 1, sh: p.sh })}
      <div class="sp"><div class="sm">Partner</div><div class="pn">${esc(D(p.id)[0])}</div>
      <div class="row sm tn" style="justify-content:space-between;margin-top:6px"><span>Nivå ${p.lv}</span><span>${rdy ? '<b style="color:var(--gold)">Klar til å utvikles</b>' : nx ? 'utvikles: ' + nx.why : ''}</span></div>
      <div class="bar" style="margin-top:5px"><i style="width:${Math.round((p.xp - a) / (b - a) * 100)}%"></i></div></div></button>`;
  }
  if (S.party.length > 1 || S.mons.length > 1) h += `<button type="button" class="card teamrow" data-a="tab" data-k="lag" aria-label="Åpne laget"><span class="sm">Laget</span><span class="tr-s">${S.party.slice(1).map(u => { const m = monBy(u); return m ? spr(m.id, { sh: m.sh, s: '38px' }) : ''; }).join('')}${Array.from({ length: 6 - S.party.length }, () => '<i></i>').join('')}</span><span class="sm tn">${S.mons.length} i boksen ›</span></button>`;
  if (S.pend.length) h += `<button type="button" class="card pendb" data-a="hunt" style="text-align:left;width:100%"><span class="grass live"><i></i><i></i><i></i><i></i></span><span class="sp"><b>${S.pend.length} ${S.pend.length === 1 ? 'møte venter' : 'møter venter'}</b><br><span class="sm">Noe rasler i gresset. Trykk for å gå inn.</span></span></button>`;
  h += `<div class="card"><div class="lab">Fag</div><div class="chips">${Object.keys(FAGS).map(k => `<button type="button" class="chip" data-a="fag" data-k="${k}" aria-pressed="${fag === k}">${FAGS[k].n}</button>`).join('')}</div>
    <div class="lab" style="margin-top:14px">Lengde</div><div class="chips">${[25, 45, 60, 75, 90].map(m => `<button type="button" class="chip tn" data-a="min" data-k="${m}" aria-pressed="${min === m}">${m} min</button>`).join('')}</div>
    ${S.regions.length > 1 ? `<div class="lab" style="margin-top:14px">Rute</div><div class="chips">${S.regions.map(r => `<button type="button" class="chip" data-a="reg" data-k="${r}" aria-pressed="${S.region === r}">${REG[r].n}</button>`).join('')}</div>` : ''}
    <button type="button" class="go" data-a="start" style="margin-top:16px">Start ${min} min</button>
    <p class="sm" style="margin-top:10px;text-align:center">${left <= 0 ? 'Laget er slitent i dag: halv XP og ingen møter. Hvil gir bonus i morgen.' : `${n} ${n === 1 ? 'møte' : 'møter'} · ${nb(Math.min(min, left) * 10 * (rested ? 1.5 : 1))} XP${rested ? ' med uthvilt-bonus' : ''}${FAGS[fag].ty.length ? ' · mer ' + FAGS[fag].ty.map(t => TYN[t].toLowerCase()).join(' og ') : ''}`}</p></div>`;
  h += `<div class="card"><div class="row" style="justify-content:space-between"><b>I dag</b><span class="sm tn">${hrs(td)} av ${hrs(S.cap)} t</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, Math.round(td / S.cap * 100))}%"></i></div>
    <div class="quests">${QUESTS.map(q => `<span class="${td >= q.m ? 'on' : ''}"><b>${td >= q.m ? '✓ ' : ''}${q.n}</b>${q.r}</span>`).join('')}</div>
    ${S.eggs.length ? `<div class="row" style="margin-top:14px"><span class="egg"></span><div class="sp"><div class="row sm tn" style="justify-content:space-between"><span>Egg${S.eggs.length > 1 ? ' (' + S.eggs.length + ')' : ''}</span><span>${S.eggs[0].need - S.eggs[0].got} min igjen</span></div><div class="bar gold" style="margin-top:5px"><i style="width:${Math.round(S.eggs[0].got / S.eggs[0].need * 100)}%"></i></div></div></div>` : ''}
    ${S.incOn ? '<p class="sm" style="margin-top:10px">Lokkeduft er tent for neste økt.</p>' : ''}</div>`;
  return h;
};

/* ---------- Laget ---------- */
VIEW.lag = () => {
  const head = `<div class="row" style="justify-content:space-between"><h1 class="big">${U.lag === 'boks' ? 'Boksen' : 'Laget'}</h1>${coinEl(S.coins)}</div>
    <div class="seg">${[['lag', `Laget · ${S.party.length}`], ['boks', `Boksen · ${S.mons.length}`]].map(([k, n]) => `<button type="button" data-a="lagv" data-k="${k}" aria-pressed="${U.lag === k}">${n}</button>`).join('')}</div>`;
  if (U.lag !== 'boks') {
    const rows = Array.from({ length: 6 }, (_, i) => monBy(S.party[i])).map((m, i) => {
      if (!m) return `<button type="button" class="tcard empty" data-a="lagv" data-k="boks"><span class="plus">+</span><span class="sm">Ledig plass. Velg en fra boksen.</span></button>`;
      const a = xpAt(m.lv), b = xpAt(m.lv + 1), rdy = evoOpts(m).some(x => x.ok);
      return `<button type="button" class="tcard${i ? '' : ' lead'}" data-a="mon" data-u="${m.u}" style="--tc:var(--t${D(m.id)[1]})">${spr(m.id, { ani: !i, sh: m.sh, s: i ? '60px' : '84px' })}
        <span class="sp"><span class="row" style="gap:6px"><b class="tn-n">${esc(D(m.id)[0])}</b>${i ? '' : '<span class="pill" style="background:var(--sage);color:#152013">Partner</span>'}${rdy ? '<span class="pill" style="color:var(--gold)">Kan utvikles</span>' : ''}</span>
        <span class="row sm tn" style="justify-content:space-between;margin-top:5px"><span>Nivå ${m.lv}</span><span>${i ? '30 % XP' : 'all XP'}</span></span>
        <span class="bar" style="margin-top:5px"><i style="width:${Math.round((m.xp - a) / (b - a) * 100)}%;background:var(--tc)"></i></span></span></button>`;
    }).join('');
    return `${head}<div class="stack">${rows}</div><p class="sm">Partneren står i klokka og får all XP fra øktene. Trykk på en Pokémon for å bytte partner, utvikle eller ta den ut.</p>`;
  }
  const sorts = { ny: (a, b) => b.at - a.at, niva: (a, b) => b.lv - a.lv, sjelden: (a, b) => tierOf(b.id) - tierOf(a.id) || b.sh - a.sh || a.id - b.id, nr: (a, b) => a.id - b.id || b.lv - a.lv };
  const list = S.mons.slice().sort(sorts[U.sort]), du = dupes(), val = du.reduce((s, m) => s + sellValue(m), 0);
  return `${head}
    <div class="chips">${[['ny', 'Nyeste'], ['niva', 'Nivå'], ['sjelden', 'Sjeldenhet'], ['nr', 'Nummer']].map(([k, n]) => `<button type="button" class="chip" data-a="sort" data-k="${k}" aria-pressed="${U.sort === k}">${n}</button>`).join('')}</div>
    ${du.length ? `<button type="button" class="btn wide" data-a="selldupes">Selg ${du.length} ${du.length === 1 ? 'duplikat' : 'duplikater'} for ${coinEl(val)}</button>` : ''}
    <div class="grid box">${list.map(m => { const t = tierOf(m.id); return `<button type="button" class="cell nm r${t}${t >= 2 ? ' rr' : ''}${S.party.includes(m.u) ? ' inp' : ''}" data-a="mon" data-u="${m.u}" aria-label="${esc(D(m.id)[0])}, nivå ${m.lv}">${spr(m.id, { sh: m.sh, lazy: 1 })}<span class="nx">${esc(D(m.id)[0])}</span><span class="l tn">${m.lv}</span>${m.fav ? '<span class="c">★</span>' : ''}</button>`; }).join('')}</div>
    <p class="sm">Grønn prikk = i laget. Farget ramme = sjelden eller bedre.</p>`;
};
function monSheet(m) {
  const d = D(m.id), ev = evoOpts(m), inP = S.party.includes(m.u), lead = S.party[0] === m.u, a = xpAt(m.lv), b = xpAt(m.lv + 1), n = countOf(m.id);
  openSheet(`<div class="shead">${spr(m.id, { ani: 1, sh: m.sh })}<div class="sp"><div class="sm tn">Nr. ${m.id} · ${REG[regOf(m.id)].n}${m.sh ? ' · <b style="color:var(--gold)">Shiny</b>' : ''}</div><div class="pn">${esc(d[0])}</div><div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">${types(m.id)} ${tierEl(m.id)}</div></div></div>
    <div><div class="row sm tn" style="justify-content:space-between"><span>Nivå ${m.lv}</span><span>${n > 1 ? 'Du har ' + n + ' av denne' : 'Den eneste du har'}</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.round((m.xp - a) / (b - a) * 100)}%"></i></div></div>
    <div class="stack">
    ${ev.map(o => `<button type="button" class="btn ${o.ok ? 'gold' : ''} wide" data-a="evolve" data-u="${m.u}" data-k="${o.to}"${o.ok ? '' : ' disabled'}>${o.ok ? 'Utvikle til ' + esc(D(o.to)[0]) : 'Utvikles ved ' + o.why}</button>`).join('')}
    ${lead ? '' : `<button type="button" class="btn sage wide" data-a="lead" data-u="${m.u}">Gjør til partner</button>`}
    <div class="row"><button type="button" class="btn sp" data-a="party" data-u="${m.u}"${(inP && S.party.length < 2) || (!inP && S.party.length >= 6) ? ' disabled' : ''}>${inP ? 'Ta ut av laget' : 'Legg i laget'}</button><button type="button" class="btn sp" data-a="fav" data-u="${m.u}">${m.fav ? 'Fjern favoritt' : 'Favoritt'}</button></div>
    <button type="button" class="btn wide" data-a="candy" data-u="${m.u}"${S.items.candy > 0 ? '' : ' disabled'}>Gi sjeldent godteri (${S.items.candy})</button>
    <button type="button" class="btn wide danger" data-a="sell" data-u="${m.u}"${S.mons.length > 1 ? '' : ' disabled'}>Selg for ${coinEl(sellValue(m))}</button></div>`);
}

/* ---------- Dex ---------- */
VIEW.dex = () => {
  const r = U.dex || S.region, g = REG[r], open = S.regions.includes(r);
  let cells = '';
  for (let id = g.a; id <= g.b; id++) {
    if (S.caught[id]) { const c = countOf(id); cells += `<button type="button" class="cell" data-a="spec" data-k="${id}" aria-label="${esc(D(id)[0])}"><span class="n tn">${id}</span>${spr(id, { lazy: 1 })}${c > 1 ? `<span class="c tn">×${c}</span>` : ''}</button>`; }
    else if (S.seen[id]) cells += `<button type="button" class="cell" data-a="spec" data-k="${id}" aria-label="Sett, ikke fanget"><span class="n tn">${id}</span>${spr(id, { sil: 1, lazy: 1 })}</button>`;
    else cells += `<span class="cell un"><span class="q tn">${id}</span></span>`;
  }
  const all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0);
  return `<div class="row" style="justify-content:space-between"><h1 class="big">Dex</h1><span class="pill tn">${all} av 649</span></div>
    <div class="seg">${[1, 2, 3, 4, 5].map(x => `<button type="button" data-a="dexr" data-k="${x}" aria-pressed="${r === x}">${REG[x].n}</button>`).join('')}</div>
    <div class="card"><div class="row" style="justify-content:space-between"><b>${g.n}</b><span class="sm tn">${dexCount(r)} av ${g.b - g.a + 1} fanget</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.round(dexCount(r) / (g.b - g.a + 1) * 100)}%"></i></div>${open ? '' : `<p class="sm" style="margin-top:8px">Ruta er låst. Lås den opp i butikken for ${nb(g.c)} mynter.</p>`}</div>
    <div class="grid">${cells}</div>`;
};
function specSheet(id) {
  const d = D(id), got = S.caught[id], chain = [];
  let b = id; while (D(b)[4]) b = D(b)[4];
  (function walk(x) { chain.push(x); (EVO[x] || []).forEach(walk); })(b);
  openSheet(`<div class="shead">${spr(id, { ani: got ? 1 : 0, sil: !got })}<div class="sp"><div class="sm tn">Nr. ${id} · ${REG[regOf(id)].n}</div><div class="pn">${got ? esc(d[0]) : '???'}</div><div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">${got ? types(id) : ''} ${tierEl(id)}</div></div></div>
    <p class="sm">${got ? `Du har ${countOf(id)}.` : 'Sett, men ikke fanget ennå.'}</p>
    ${chain.length > 1 ? `<div><div class="lab">Utviklingslinje</div><div class="row" style="flex-wrap:wrap;gap:4px">${chain.map(x => `<span class="cell${S.caught[x] ? '' : ' un'}" style="width:64px">${S.caught[x] || S.seen[x] ? spr(x, { sil: !S.caught[x] }) : `<span class="q tn">${x}</span>`}</span>`).join('')}</div></div>` : ''}
    <button type="button" class="btn wide" data-a="close">Lukk</button>`);
}

/* ---------- Butikk ---------- */
VIEW.butikk = () => {
  const l = tlv(), own = k => k === 'egg' ? S.eggs.length : k === 'incense' ? (S.incOn ? 1 : 0) : S.items[k];
  const ic = k => SHOP[k].img ? ballEl(k, '30px') : SHOP[k].ic === 'egg' ? '<span class="egg" style="transform:scale(.7)"></span>' : `<span class="${SHOP[k].ic}"></span>`;
  return `<div class="row" style="justify-content:space-between"><h1 class="big">Butikk</h1>${coinEl(S.coins)}</div>
    <div class="card" style="padding-top:6px;padding-bottom:6px">${Object.keys(SHOP).map(k => { const it = SHOP[k], lock = it.lv && l < it.lv, full = (k === 'egg' && S.eggs.length >= 3) || (k === 'incense' && S.incOn);
      return `<div class="item"><span class="ic">${ic(k)}</span><div class="sp"><b>${it.n}</b> <span class="sm tn">· har ${own(k)}</span><div class="sm">${it.d}</div></div><button type="button" class="btn sm2 ${S.coins >= it.p && !lock && !full ? 'pri' : ''}" data-a="buy" data-k="${k}"${S.coins < it.p || lock || full ? ' disabled' : ''}>${lock ? 'Nivå ' + it.lv : full ? 'Fullt' : nb(it.p)}</button></div>`; }).join('')}</div>
    <h2 class="h">Ruter</h2>
    <div class="card" style="padding-top:6px;padding-bottom:6px">${[1, 2, 3, 4, 5].map(r => { const g = REG[r], has = S.regions.includes(r);
      return `<div class="item"><span class="ic"><span class="map"></span></span><div class="sp"><b>${g.n}</b><div class="sm tn">${g.b - g.a + 1} arter · ${dexCount(r)} fanget</div></div>${has ? `<button type="button" class="btn sm2" data-a="reg" data-k="${r}"${S.region === r ? ' disabled' : ''}>${S.region === r ? 'Her nå' : 'Reis hit'}</button>` : `<button type="button" class="btn sm2 ${S.coins >= g.c ? 'pri' : ''}" data-a="buyreg" data-k="${r}"${S.coins < g.c ? ' disabled' : ''}>${nb(g.c)}</button>`}</div>`; }).join('')}</div>
    <p class="sm">Mynter kommer fra fokusminutter (2 per minutt), fullførte økter og salg av duplikater.</p>`;
};

/* ---------- Profil: merker, statistikk, innstillinger ---------- */
VIEW.profil = () => {
  const t0 = new Date(), tot = totalMin(), ses = Object.values(S.log).reduce((s, d) => s + d.s, 0);
  const badges = Object.keys(S.fag).map(f => { const g = S.fag[f], m = fagMin(f), pct = Math.min(1, m / (g.t * 60)), dd = Math.round((new Date(g.d + 'T00:00') - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 864e5);
    return `<div class="item" style="--tc:${FAGS[f].c}"><span class="badge${pct >= 1 ? ' on' : ''}">${FAGS[f].n}</span><div class="sp"><div class="row" style="justify-content:space-between"><b>${FAGS[f].n}-merket</b><span class="sm tn">${dd > 0 ? 'eksamen om ' + dd + ' d' : dd === 0 ? 'eksamen i dag' : 'ferdig'}</span></div>
      <div class="bar" style="margin-top:6px"><i style="width:${Math.round(pct * 100)}%;background:${FAGS[f].c}"></i></div><div class="sm tn" style="margin-top:4px">${hrs(m)} av ${hrs(g.t * 60)} t · neste belønning ved ${Math.min(100, (g.ms + 1) * 25)} %</div></div></div>`; }).join('');
  let hm = '';
  const mon = addDays(t0, -((t0.getDay() + 6) % 7) - 63);
  for (let i = 0; i < 70; i++) { const d = addDays(mon, i), k = dayKey(d), m = (S.log[k] || { m: 0 }).m; hm += `<i class="${m ? (m < 90 ? 'l1' : m < 180 ? 'l2' : m < 270 ? 'l3' : 'l4') : ''}${k === dayKey() ? ' td' : ''}" title="${d.getDate()}.${d.getMonth() + 1}: ${m} min"></i>`; }
  const all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0);
  return `<h1 class="big">Profil</h1>${topBar()}
    <h2 class="h">Merker</h2><div class="card" style="padding-top:6px;padding-bottom:6px">${badges}</div>
    <p class="sm">Hvert merke fylles av fokustimer i faget. 25, 50 og 75 % gir et episk møte, og fullt merke gir et legendarisk.</p>
    <h2 class="h">Statistikk</h2>
    <div class="gain"><div><span class="sm">Fokus totalt</span><b class="tn">${hrs(tot)} t</b></div><div><span class="sm">Økter</span><b class="tn">${ses}</b></div><div><span class="sm">Dager på rad</span><b class="tn">${streak()}</b></div><div><span class="sm">Arter fanget</span><b class="tn">${all}</b></div></div>
    <div class="card"><div class="lab">Siste ti uker</div><div class="hm">${hm}</div></div>
    <h2 class="h">Innstillinger</h2>
    <div class="card stack">
      <label class="field">Dagstak før laget blir slitent<select data-c="cap">${[240, 300, 360, 420, 480].map(c => `<option value="${c}"${S.cap === c ? ' selected' : ''}>${c / 60} timer</option>`).join('')}</select></label>
      <button type="button" class="btn wide" data-a="sound">Lyd: ${S.sound ? 'på' : 'av'}</button>
      <button type="button" class="btn wide" data-a="plan">Endre timer og eksamensdatoer</button>
      <button type="button" class="btn wide" data-a="sync">Synk mellom enheter${GH ? ' · ' + (ghState === 'ok' ? 'på' : ghState || 'kobler til') : ''}</button>
      <button type="button" class="btn wide" data-a="backup">Sikkerhetskopi</button>
    </div>
    <p class="sm">Fokusdex er et privat hobbyprosjekt. Pokémon og navnene tilhører Nintendo, Game Freak og Creatures. Bildene hentes fra PokeAPI når appen brukes og følger ikke med appen.</p>`;
};
function planSheet() {
  openSheet(`<h2 class="h">Plan per fag</h2>${Object.keys(S.fag).map(f => `<div class="row"><b style="width:52px">${FAGS[f].n}</b><label class="field sp">Timer<input inputmode="decimal" id="pt-${f}" value="${String(S.fag[f].t).replace('.', ',')}"></label><label class="field sp">Eksamen<input type="date" id="pd-${f}" value="${S.fag[f].d}"></label></div>`).join('')}
    <button type="button" class="btn pri wide" data-a="plansave">Lagre</button>`);
}
function syncSheet() {
  let lb = null; try { lb = JSON.parse(localStorage.getItem('lb.gh') || 'null'); } catch (_) {}
  openSheet(`<h2 class="h">Synk mellom enheter</h2><p class="sm">Lagringen legges som én fil (fokusdex/save.json) i et privat GitHub-repo. Bruk samme nøkkel og repo på hver enhet. Den som har spilt mest, vinner hvis to enheter er uenige.</p>
    <label class="field">Repo (eier/navn)<input id="gh-r" autocapitalize="off" autocomplete="off" value="${esc(GH ? GH.repo : '')}" placeholder="mwalderhaug/live-blekker-data"></label>
    <label class="field">Nøkkel (fine-grained token med Contents: read and write)<input id="gh-t" type="password" autocomplete="off" value="${esc(GH ? GH.t : '')}"></label>
    ${lb && lb.t && lb.repo ? '<button type="button" class="btn wide" data-a="synclb">Bruk nøkkelen fra Live-blekker</button>' : ''}
    <p class="sm" id="gh-s">${GH ? (ghState === 'ok' ? 'Synk er på.' : esc(ghState)) : 'Synk er av.'}</p>
    <div class="row"><button type="button" class="btn pri sp" data-a="syncsave">Koble til</button>${GH ? '<button type="button" class="btn sp danger" data-a="syncoff">Slå av</button>' : ''}</div>`);
}
function backupSheet() {
  openSheet(`<h2 class="h">Sikkerhetskopi</h2><p class="sm">Kopier teksten for å ta vare på spillet, eller lim inn en kopi for å hente det tilbake.</p>
    <label class="field">Lim inn kopi her<input id="bk-in" autocomplete="off"></label>
    <div class="row"><button type="button" class="btn sp" data-a="bkcopy">Kopier spillet</button><button type="button" class="btn sp" data-a="bkload">Hent fra kopi</button></div>
    <button type="button" class="btn wide danger" data-a="reset">Start helt på nytt</button>`);
}

/* ---------- Ark ---------- */
function openSheet(html) { const w = $('#sheet'); w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><span class="grab"></span>${html}</div>`; w.hidden = false; }
function closeSheet() { const w = $('#sheet'); w.hidden = true; w.innerHTML = ''; }
function ov(html, cls, tc) { const o = $('#ov'); o.className = 'ov' + (cls ? ' ' + cls : ''); o.style.setProperty('--tc', tc || 'var(--sage)'); o.innerHTML = `<div class="ovin">${html}</div>`; o.hidden = false; }
function closeOv() { const o = $('#ov'); o.hidden = true; o.innerHTML = ''; }

/* ---------- Start: velg partner ---------- */
let pick = 0;
function intro() {
  ov(`<div class="mid"><h1 class="big">Fokusdex</h1><p class="mut" style="max-width:30ch">Hvert minutt du fokuserer gir XP og mynter. Hver økt lokker fram ville Pokémon du kan fange, utvikle og samle.</p>
    <div class="starters">${[1, 4, 7].map(id => `<button type="button" data-a="pick" data-k="${id}" aria-pressed="${pick === id}" style="--tc:var(--t${D(id)[1]})">${spr(id, { ani: 1 })}<span>${D(id)[0]}</span>${types(id)}</button>`).join('')}</div>
    <p class="sm" style="max-width:32ch">Du starter med 15 baller og 660 mynter for de 11 timene du alt har lagt ned.</p></div>
    <div class="acts"><button type="button" class="btn pri" data-a="begin"${pick ? '' : ' disabled'}>${pick ? 'Velg ' + D(pick)[0] : 'Velg partner'}</button></div>`);
}

/* ---------- Fokusklokka ---------- */
const CIRC = 289.03;
let tick = 0, wake = null;
async function keepAwake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (_) {} }
function dropAwake() { try { if (wake) wake.release(); } catch (_) {} wake = null; }
function showTimer() {
  const t = S.timer, p = partner(), n = Math.floor(t.min / 20) + (t.min >= 25 ? 1 : 0);
  U.quit = 0;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="quit" id="t-quit">Avbryt</button><span class="pill" style="background:${FAGS[t.fag].c};color:#17130f">${FAGS[t.fag].n} · ${t.min} min</span></div>
    <div class="mid"><div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="a0" cx="50" cy="50" r="46"/><circle class="a1" id="t-arc" cx="50" cy="50" r="46" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/></svg>
      <div class="in">${p ? spr(p.id, { ani: 1, sh: p.sh }) : ''}<div class="clock" id="t-clock" role="timer"></div><div class="sm" id="t-sub"></div></div></div>
      <div><div class="found" id="t-found" aria-label="Møter funnet">${Array.from({ length: n }, () => '<i></i>').join('')}</div><p class="sm" style="margin-top:8px" id="t-hint">Et nytt møte hvert 20. minutt.</p></div></div>
    <div class="acts"><button type="button" class="btn nf" data-a="pause" id="t-pause">Pause</button><button type="button" class="btn pri" data-a="early">Ferdig nå</button></div>`, 'tint', FAGS[t.fag].c);
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
  $('#t-sub').textContent = t.pausedAt ? 'På pause' : `+${nb(Math.floor(ms / 60000) * 10)} XP`;
  $('#t-pause').textContent = t.pausedAt ? 'Fortsett' : 'Pause';
  const got = Math.floor(ms / 1200000), dots = $('#t-found').children;
  for (let i = 0; i < dots.length; i++) if (i < got && !dots[i].classList.contains('on')) { dots[i].classList.add('on'); if (i >= t.seen) { dots[i].classList.add('new'); t.seen = i + 1; sfx.found(); buzz(40); $('#t-hint').textContent = 'Noe rasler i gresset. Det venter til du er ferdig.'; } }
}
function endTimer() {
  clearInterval(tick); dropAwake(); document.title = 'Fokusdex';
  const R = finishTimer();
  if (!R || !R.min) { closeOv(); toast('Økta var under ett minutt og teller ikke.'); return render(); }
  sfx.done(); buzz([120, 60, 120]);
  showReward(R);
}

/* ---------- Belønning ---------- */
function countUp(el, to) { const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 900); el.textContent = '+' + nb(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); }
function showReward(R) {
  const news = [];
  R.hatch.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { sh: m.sh })}<span><b>Egget klekket: ${esc(D(m.id)[0])}</b><br><span class="sm">${x.isNew ? 'Ny i samlingen' : 'Du har den fra før'}${m.sh ? ' · shiny' : ''}</span></span></div>`); });
  R.ups.forEach(x => { const m = monBy(x.u); if (m) news.push(`<div>${spr(m.id, { sh: m.sh })}<span><b>${esc(D(m.id)[0])} nivå ${x.l0} → ${x.l1}</b>${x.evo ? '<br><span class="sm" style="color:var(--gold)">Klar til å utvikles</span>' : ''}</span></div>`); });
  R.gifts.forEach(g => news.push(`<div><span class="grass"><i></i><i></i><i></i><i></i></span><span>${esc(g)}</span></div>`));
  const notes = [R.rested ? 'Uthvilt-bonus: 1,5 × på dagens første økt.' : '', R.tired ? 'Laget er slitent: minuttene over dagstaket ga halv XP og ingen møter.' : '', R.full ? '' : 'Avsluttet før tiden: du får for minuttene du gjorde.'].filter(Boolean);
  ov(`<div class="mid" style="justify-content:flex-start;padding-top:8vh"><div><h1 class="big">${R.full ? 'Økta er i boks.' : 'Bra jobba.'}</h1><p class="mut tn" style="margin-top:6px">${R.min} min ${FAGS[R.fag].n}</p></div>
    <div class="gain"><div><span class="sm">XP</span><b class="tn" id="r-xp">+0</b></div><div><span class="sm">Mynter</span><b class="tn" id="r-co">+0</b></div></div>
    ${notes.length ? `<p class="sm">${notes.join(' ')}</p>` : ''}
    <div class="news">${news.map((n, i) => n.replace('<div>', `<div style="animation-delay:${0.3 + i * 0.15}s">`)).join('')}</div></div>
    <div class="acts">${S.pend.length ? `<button type="button" class="btn gold" data-a="hunt">Gå i gresset · ${S.pend.length} ${S.pend.length === 1 ? 'møte' : 'møter'}</button><button type="button" class="btn nf" data-a="home">Senere</button>` : '<button type="button" class="btn pri" data-a="home">Ferdig</button>'}</div>`, 'tint', FAGS[R.fag].c);
  countUp($('#r-xp'), R.xp); countUp($('#r-co'), R.coins);
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
  sfx.appear();
  setTimeout(() => { E.busy = false; aim(); }, 1150);
}
function drawEnc(reveal) {
  if (!(S.items[E.ball] > 0)) E.ball = bestBall();
  const e = E.e, d = D(e.id), n = countOf(e.id), noBalls = !['poke', 'great', 'ultra'].some(k => S.items[k] > 0);
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="later">Spar til senere</button><span class="pill tn" id="e-left">${S.pend.length} ${S.pend.length === 1 ? 'møte' : 'møter'} igjen</span></div>
    <div class="mid r${e.t}"><div class="stage${reveal ? ' rev' : ''}" id="e-stage">${spr(e.id, { ani: 1, sh: e.sh })}<span class="tball">${ballEl(E.ball, '54px')}</span><span class="stars" id="e-stars"></span></div>
      <div><div class="ename">${e.sh ? 'Shiny ' : ''}${esc(d[0])}</div><div class="row" style="justify-content:center;margin-top:8px;flex-wrap:wrap;gap:6px">${tierEl(e.id)} ${types(e.id)} <span class="pill tn">Nivå ${e.lv}</span></div>
      <p class="sm" style="margin-top:8px" id="e-msg">${S.caught[e.id] ? (n ? `Du har ${n} fra før.` : 'Du har hatt den før.') : '<b style="color:var(--sage)">Ny i samlingen</b>'}</p></div>
      <div class="hearts" id="e-hearts" aria-label="Forsøk igjen">${Array.from({ length: isLeg(e.id) ? 4 : 3 }, (_, i) => `<i class="${i < e.tr ? '' : 'off'}"></i>`).join('')}</div></div>
    <div id="e-ctl" style="display:flex;flex-direction:column;gap:12px">${noBalls ? `<p class="sm" style="text-align:center">Du er tom for baller. Kjøp flere i butikken, så venter møtet her.</p><div class="acts"><button type="button" class="btn pri" data-a="toshop">Til butikken</button><button type="button" class="btn nf" data-a="skip">La den gå</button></div>` : `
      <button type="button" class="meter" data-a="throw" aria-label="Kast når markøren er i den grønne sonen"><span class="z" id="e-z"></span><span class="g" id="e-g"></span><span class="m" id="e-m"></span></button>
      <div class="balls">${['poke', 'great', 'ultra'].map(k => `<button type="button" data-a="ball" data-k="${k}" aria-pressed="${E.ball === k}" aria-label="${SHOP[k].n}"${S.items[k] > 0 ? '' : ' disabled'}>${ballEl(k, '28px')}<span class="tn">${S.items[k]}</span></button>`).join('')}</div>
      <div class="acts"><button type="button" class="btn gold" data-a="throw">Kast</button><button type="button" class="btn nf" data-a="skip">La den gå</button></div>`}</div>`, 'tint', `var(--r${e.t})`);
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
  msg.innerHTML = zone === 2 ? '<b style="color:var(--gold)">Perfekt kast</b>' : zone === 1 ? 'Godt kast' : 'Utenfor sonen';
  st.className = 'stage in'; sfx.thr(); buzz(30);
  const wobs = r.ok ? 3 : 1 + (Math.random() < r.p ? 1 : 0);
  let i = 0;
  const step = () => {
    if (i < wobs) { st.className = 'stage held'; void st.offsetWidth; st.className = 'stage held wob'; sfx.wob(); buzz(20); i++; return setTimeout(step, 700); }
    if (r.ok) {
      st.className = 'stage held'; sfx.got(); buzz([60, 40, 60, 40, 140]);
      $('#e-stars').innerHTML = Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283, d = 70 + Math.random() * 50; return `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${k * 0.02}s"></i>`; }).join('');
      msg.innerHTML = `<b style="color:var(--sage)">Fanget.</b> ${r.isNew ? 'Ny i samlingen.' : 'Et duplikat du kan selge eller beholde.'}`;
      E.done = 'got'; $('#e-left').textContent = S.pend.length ? `${S.pend.length} ${S.pend.length === 1 ? 'møte' : 'møter'} igjen` : 'Siste møte';
    } else {
      st.className = 'stage out'; sfx.fail();
      if (r.fled) { setTimeout(() => { st.className = 'stage fled'; }, 380); msg.textContent = 'Den stakk av.'; E.done = 'fled'; }
      else { msg.textContent = `Den brøt seg løs. ${e.tr} forsøk igjen.`; }
    }
    setTimeout(() => {
      E.busy = false;
      if (E.done) { $('#e-ctl').innerHTML = `<div class="acts">${S.pend.length ? `<button type="button" class="btn gold" data-a="hunt">Neste møte · ${S.pend.length} igjen</button><button type="button" class="btn nf" data-a="home">Ferdig</button>` : '<button type="button" class="btn pri" data-a="home">Ferdig</button>'}</div>`; }
      else { st.className = 'stage'; drawEnc(false); aim(); }
    }, r.ok ? 900 : 650);
  };
  setTimeout(step, 420);
}
function evoShow(m, from) {
  closeSheet();
  ov(`<div class="mid r${tierOf(m.id)}"><div class="stage rev">${spr(m.id, { ani: 1, sh: m.sh })}</div><div><p class="mut">${esc(D(from)[0])} utviklet seg til</p><div class="ename">${esc(D(m.id)[0])}</div><div class="row" style="justify-content:center;margin-top:8px;gap:6px">${types(m.id)}</div></div></div>
    <div class="acts"><button type="button" class="btn pri" data-a="home">Videre</button></div>`, 'tint', `var(--t${D(m.id)[1]})`);
  sfx.evo(); buzz([80, 50, 80, 50, 200]);
}

/* ---------- Handlinger ---------- */
const A = {
  tab: el => { U.tab = el.dataset.k; render(); $('#main').scrollTop = 0; enter(); },
  lagv: el => { U.lag = el.dataset.k; render(); enter(); },
  fag: el => { U.fag = el.dataset.k; render(); },
  min: el => { U.min = +el.dataset.k; render(); },
  reg: el => { S.region = +el.dataset.k; save(); render(); },
  start: () => { startTimer(U.fag || S.last.fag, U.min || S.last.min); sfx.start(); showTimer(); },
  pause: () => { togglePause(); paintTimer(); },
  early: () => endTimer(),
  quit: () => { if (!U.quit) { U.quit = 1; $('#t-quit').textContent = 'Trykk igjen for å avbryte'; setTimeout(() => { U.quit = 0; const b = $('#t-quit'); if (b) b.textContent = 'Avbryt'; }, 3000); return; } clearInterval(tick); dropAwake(); S.timer = null; save(true); document.title = 'Fokusdex'; closeOv(); render(); },
  home: () => { closeOv(); render(); },
  hunt: () => hunt(),
  later: () => { cancelAnimationFrame(E.raf); closeOv(); render(); },
  skip: () => { if (E.busy) return; cancelAnimationFrame(E.raf); dropPend(E.e); save(); hunt(); },
  toshop: () => { closeOv(); U.tab = 'butikk'; render(); },
  ball: el => { if (E.busy) return; E.ball = el.dataset.k; drawEnc(false); aim(); },
  throw: () => doThrow(),
  mon: el => { const m = monBy(+el.dataset.u); if (m) monSheet(m); },
  spec: el => specSheet(+el.dataset.k),
  close: () => closeSheet(),
  sort: el => { U.sort = el.dataset.k; render(); },
  dexr: el => { U.dex = +el.dataset.k; render(); },
  lead: el => { const m = monBy(+el.dataset.u); setPartner(m); closeSheet(); render(); toast(`${D(m.id)[0]} er partneren din nå.`); },
  party: el => { const m = monBy(+el.dataset.u); toggleParty(m); render(); monSheet(m); },
  fav: el => { const m = monBy(+el.dataset.u); m.fav = m.fav ? 0 : 1; save(); render(); monSheet(m); },
  candy: el => { const m = monBy(+el.dataset.u); if (useCandy(m)) { sfx.coin(); render(); monSheet(m); } },
  evolve: el => { const m = monBy(+el.dataset.u), from = m.id; if (evolve(m, +el.dataset.k)) { render(); evoShow(m, from); } },
  sell: el => { const m = monBy(+el.dataset.u); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.innerHTML = 'Trykk igjen for å selge'; return; } const v = sell(m); save(); sfx.coin(); closeSheet(); render(); toast(`Solgt for ${nb(v)} mynter.`); },
  selldupes: el => { const du = dupes(); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = `Trykk igjen for å selge ${du.length}`; return; } let v = 0; du.forEach(m => { v += sell(m); }); save(); sfx.coin(); render(); toast(`${du.length} solgt for ${nb(v)} mynter.`); },
  buy: el => { if (buy(el.dataset.k)) { sfx.coin(); render(); toast(`${SHOP[el.dataset.k].n} kjøpt.`); } },
  buyreg: el => { const r = +el.dataset.k; if (buyRegion(r)) { sfx.evo(); render(); toast(`${REG[r].n} er åpnet. Du er der nå.`); } },
  sound: () => { S.sound = S.sound ? 0 : 1; save(); sfx.tap(); render(); },
  plan: () => planSheet(),
  plansave: () => { for (const f in S.fag) { const t = Number(String($('#pt-' + f).value).replace(',', '.')), d = $('#pd-' + f).value; if (t > 0 && t < 500) S.fag[f].t = t; if (/^\d{4}-\d{2}-\d{2}$/.test(d)) S.fag[f].d = d; } save(); closeSheet(); render(); toast('Planen er lagret.'); },
  sync: () => syncSheet(),
  synclb: () => { try { const lb = JSON.parse(localStorage.getItem('lb.gh')); $('#gh-r').value = lb.repo; $('#gh-t').value = lb.t; } catch (_) {} },
  syncsave: () => { const t = $('#gh-t').value.trim(), r = $('#gh-r').value.trim(); if (!t || !/^[\w.-]+\/[\w.-]+$/.test(r)) { $('#gh-s').textContent = 'Skriv repo som eier/navn og lim inn nøkkelen.'; return; } ghSet(t, r); $('#gh-s').textContent = 'Kobler til …'; ghPull(); },
  syncoff: () => { ghSet('', ''); closeSheet(); render(); toast('Synk er slått av.'); },
  backup: () => backupSheet(),
  bkcopy: () => { const txt = b64e(JSON.stringify(S)); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Kopiert.'), () => { $('#bk-in').value = txt; toast('Kopier teksten i feltet.'); }); },
  bkload: () => { try { const o = JSON.parse(b64d($('#bk-in').value.trim())); if (!o || o.v !== 1 || !Array.isArray(o.mons)) throw 0; S = Object.assign(fresh(), o); save(); closeSheet(); render(); toast('Spillet er hentet.'); } catch (_) { toast('Det var ikke en gyldig kopi.'); } },
  reset: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Trykk igjen: alt slettes'; return; } S = fresh(); save(); pick = 0; closeSheet(); render(); },
  pick: el => { pick = +el.dataset.k; sfx.tap(); intro(); },
  begin: () => { if (!pick) return; begin(pick); sfx.evo(); closeOv(); render(); toast('Lykke til. Første økt gir uthvilt-bonus.'); }
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  if (el && !el.disabled && A[el.dataset.a]) { A[el.dataset.a](el); return; }
  if (ev.target.id === 'sheet') closeSheet();
});
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
load(); ghLoad();
saveHook = ghSoon;
ghHook = adopted => { const s = $('#gh-s'); if (s) s.textContent = ghState === 'ok' ? 'Synk er på.' : ghState; if (adopted && !S.timer && ($('#ov').hidden || $('#nav').hidden)) { closeOv(); render(); toast('Hentet nyere lagring fra en annen enhet.'); } };
render();
if (S.started && S.timer) showTimer();
ghPull();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
