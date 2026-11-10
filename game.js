'use strict';
/* Fokusdex – spillregler og lagring. Skjermene ligger i ui.js.
   Sløyfa: fokusminutter → XP og mynter → møter → fangst → lag, samling og butikk.
   Alt lagres i nettleseren (localStorage). Synk til et privat GitHub-repo er valgfritt (Profil → Synk). */

const TYN = ['Normal', 'Kamp', 'Flygende', 'Gift', 'Bakke', 'Stein', 'Insekt', 'Spøkelse', 'Stål', 'Ild', 'Vann', 'Gress', 'Elektrisk', 'Psykisk', 'Is', 'Drage', 'Mørk', 'Fe'];
const TIERS = ['Vanlig', 'Uvanlig', 'Sjelden', 'Episk', 'Legendarisk'];
/* Regioner = generasjoner. c er prisen for å låse opp. */
const REG = [null, { n: 'Kanto', a: 1, b: 151, c: 0 }, { n: 'Johto', a: 152, b: 251, c: 1200 }, { n: 'Hoenn', a: 252, b: 386, c: 2500 }, { n: 'Sinnoh', a: 387, b: 493, c: 4000 }, { n: 'Unova', a: 494, b: 649, c: 6000 }];
/* Fag styrer hvilke typer som dukker opp oftere. */
const FAGS = {
  bban: { n: 'BBAN', c: '#B9AFC9', ty: [12, 8] },
  cf: { n: 'CF', c: '#A9C3A2', ty: [0, 1] },
  met: { n: 'MET', c: '#9FBDB8', ty: [13, 7] },
  bsmo: { n: 'Ø&B', c: '#BDBE92', ty: [11, 10, 6] },
  sok: { n: 'Søknad', c: '#D4BC8E', ty: [2, 9] },
  annet: { n: 'Annet', c: '#AFA89E', ty: [] }
};
const SHOP = {
  poke: { n: 'Poké Ball', p: 20, d: 'Vanlig ball', img: 'poke-ball', bc: '#d98f7e' },
  great: { n: 'Great Ball', p: 60, d: 'Bedre sjanse · trenernivå 3', lv: 3, img: 'great-ball', bc: '#7fa8e6' },
  ultra: { n: 'Ultra Ball', p: 150, d: 'Best sjanse · trenernivå 7', lv: 7, img: 'ultra-ball', bc: '#e3c577' },
  incense: { n: 'Lokkeduft', p: 80, d: 'Neste økt: ett ekstra møte og mer sjeldent', ic: 'smoke' },
  candy: { n: 'Sjeldent godteri', p: 150, d: 'Ett nivå opp til én Pokémon', ic: 'candy' },
  stone: { n: 'Utviklingsstein', p: 300, d: 'For dem som ikke utvikles av nivå alene', ic: 'gem' },
  egg: { n: 'Egg', p: 250, d: 'Klekkes etter 120 fokusminutter. Kan være fra alle regioner', ic: 'egg' }
};
const BALLM = { poke: 1, great: 1.5, ultra: 2.2 };
const SELL = [15, 40, 100, 300, 1500];
const STMULT = [1, 0.22, 0.07];
/* Dagens mål: tre små delmål som gir noe med en gang de nås. */
const QUESTS = [
  { m: 25, n: 'første økt', r: '3 Poké Balls', give: () => { S.items.poke += 3; } },
  { m: 180, n: '3 timer', r: '100 mynter', give: () => { S.coins += 100; } },
  { m: 300, n: '5 timer', r: 'sjeldent godteri', give: () => { S.items.candy += 1; } }
];

/* ---------- Arter ---------- */
const D = id => DEX[id - 1];
const _st = {};
const stageOf = id => { if (_st[id] != null) return _st[id]; let s = 0, d = D(id); while (d[4] && s < 2) { s++; d = D(d[4]); } return (_st[id] = s); };
const isLeg = id => !!(D(id)[6] & 3);
const wOf = id => D(id)[3] * STMULT[stageOf(id)];
/* Sjeldenhet: vanlige grunnformer nederst, ferdig utviklede og de vanskeligste øverst. */
const tierOf = id => {
  if (isLeg(id)) return 4;
  const cr = D(id)[3], st = stageOf(id);
  if (st === 2) return 3;
  if (st === 1) return cr >= 120 ? 1 : cr >= 60 ? 2 : 3;
  return cr >= 190 ? 0 : cr >= 100 ? 1 : cr >= 45 ? 2 : 3;
};
const regOf = id => id <= 151 ? 1 : id <= 251 ? 2 : id <= 386 ? 3 : id <= 493 ? 4 : 5;
const EVO = {};
DEX.forEach((d, i) => { if (d[4]) (EVO[d[4]] = EVO[d[4]] || []).push(i + 1); });
const lvOf = xp => Math.max(1, Math.min(100, Math.floor(Math.sqrt(xp / 12))));
const xpAt = l => 12 * l * l;

/* ---------- Tilstand ---------- */
const KEY = 'fokusdex.v1';
function fresh() {
  return {
    v: 1, rev: 0, at: '', xp: 0, coins: 0, uid: 1, started: 0,
    items: { poke: 15, great: 0, ultra: 0, candy: 0, stone: 0, incense: 0 },
    mons: [], party: [], seen: {}, caught: {}, regions: [1], region: 1, eggs: [], pend: [], incOn: 0,
    log: {}, fm: {},
    /* Eksamensplanen H26: t = planlagte timer, b = minutter gjort før appen (fra hubben 9.11), d = eksamensdato, ms = milepæler hentet. */
    fag: { bban: { t: 63.5, b: 590, d: '2026-11-30', ms: 0 }, cf: { t: 55.75, b: 20, d: '2026-12-10', ms: 0 }, met: { t: 39.75, b: 60, d: '2026-12-17', ms: 0 }, bsmo: { t: 19, b: 0, d: '2026-12-22', ms: 0 } },
    last: { fag: 'bban', min: 60 }, cap: 360, sound: 0, timer: null
  };
}
let S = fresh();
function load() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1) S = Object.assign(fresh(), o); } catch (_) {}
  for (const k in fresh().items) if (S.items[k] == null) S.items[k] = 0;
}
let saveHook = null;
function save(quiet) {
  S.rev++; S.at = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {}
  if (!quiet && saveHook) saveHook();
}

/* ---------- Hjelpere ---------- */
const pad2 = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const rnd = n => Math.floor(Math.random() * n);
const tlv = () => 1 + Math.floor(Math.sqrt(S.xp / 300));
const tlvXp = l => 300 * (l - 1) * (l - 1);
const monBy = u => S.mons.find(m => m.u === u) || null;
const partner = () => monBy(S.party[0]);
const countOf = id => S.mons.filter(m => m.id === id).length;
const todayMin = () => (S.log[dayKey()] || { m: 0 }).m;
const fagMin = f => (S.fag[f] ? S.fag[f].b : 0) + (S.fm[f] || 0);
const totalMin = () => Object.values(S.log).reduce((s, d) => s + d.m, 0);
/* Dager på rad med minst 25 fokusminutter. I dag teller først når den er nådd. */
function streak() {
  let n = 0;
  for (let i = 0, d = new Date(); i < 400; i++, d = addDays(d, -1)) {
    const m = (S.log[dayKey(d)] || { m: 0 }).m;
    if (m >= 25) n++; else if (i > 0) break;
  }
  return n;
}
const shinyOdds = () => (1 / 150) * (1 + Math.min(streak(), 10) * 0.15);

function addMon(id, lv, sh) {
  const m = { u: S.uid++, id, lv, xp: xpAt(lv), sh: sh ? 1 : 0, fav: 0, at: Date.now() };
  S.mons.push(m);
  S.seen[id] = 1; S.caught[id] = 1;
  if (S.party.length < 6) S.party.push(m.u);
  return m;
}

/* ---------- Møter ---------- */
/* o: fag (typebias), luck 0–2 (lengre økt og lokkeduft gir mer sjeldent), min (laveste sjeldenhet), leg (legendarisk), egg. */
function genEnc(o = {}) {
  const bias = (FAGS[o.fag] || {}).ty || [], L = o.luck || 0, pool = [];
  let tot = 0;
  const push = (id, w) => { pool.push([id, w]); tot += w; };
  if (o.egg) {
    for (let id = 1; id <= 649; id++) { if (isLeg(id) || stageOf(id)) continue; const t = tierOf(id); push(id, (t >= 2 ? 3 : 1) * (D(id)[6] & 4 ? 2 : 1)); }
  } else if (o.leg) {
    for (const r of S.regions) for (let id = REG[r].a; id <= REG[r].b; id++) if (isLeg(id)) push(id, D(id)[6] & 2 ? 0.5 : 1);
  } else {
    const reg = REG[S.region];
    for (let id = reg.a; id <= reg.b; id++) {
      if (isLeg(id)) continue;
      const d = D(id), t = tierOf(id);
      if (t < (o.min || 0)) continue;
      let w = wOf(id) * [1, 1 + 0.3 * L, 1 + 1.2 * L, 1 + 3 * L][t];
      if (d[6] & 4) w *= 0.5;
      if (bias.includes(d[1]) || bias.includes(d[2])) w *= 2.5;
      push(id, w);
    }
  }
  let x = Math.random() * tot, id = pool[pool.length - 1][0];
  for (const [i, w] of pool) { x -= w; if (x <= 0) { id = i; break; } }
  const st = stageOf(id), d = D(id);
  let lv = o.egg ? 1 : 2 + rnd(Math.min(40, 4 + tlv() * 2));
  if (st) lv = Math.max(lv, d[5] || [0, 18, 34][st]);
  if (isLeg(id)) lv = 50;
  return { id, lv, sh: Math.random() < shinyOdds() * (o.egg ? 4 : 1) ? 1 : 0, t: tierOf(id), tr: isLeg(id) ? 4 : 3 };
}
/* Sjansen for fangst. zone: 0 = bom, 1 = grønn sone, 2 = gull. */
const catchP = (id, ball, zone) => Math.min(0.97, Math.pow(D(id)[3] / 255, 0.45) * BALLM[ball] * [0.5, 1, 1.6][zone]);
/* Sonene på timing-måleren i prosent: grønn bredde og gull bredde. Sjeldnere = smalere og raskere. */
const zones = (e, ball) => ({ g: Math.max(14, 36 - e.t * 5 + (ball === 'great' ? 4 : ball === 'ultra' ? 8 : 0)), au: 7, sp: 0.9 + e.t * 0.22 });
function throwBall(e, ball, zone) {
  if (!(S.items[ball] > 0) || e.tr <= 0) return null;
  S.items[ball]--; e.tr--;
  const p = catchP(e.id, ball, zone), ok = Math.random() < p;
  S.seen[e.id] = 1;
  let mon = null, isNew = false;
  if (ok) { isNew = !S.caught[e.id]; mon = addMon(e.id, e.lv, e.sh); dropPend(e); }
  else if (e.tr <= 0) dropPend(e);
  save();
  return { ok, p, mon, isNew, fled: !ok && e.tr <= 0 };
}
function dropPend(e) { const i = S.pend.indexOf(e); if (i >= 0) S.pend.splice(i, 1); }

/* ---------- Fokusøkt ---------- */
const elapsedMs = t => (t.pausedAt || Date.now()) - t.start - (t.paused || 0);
function startTimer(fag, min) { S.timer = { fag, min, start: Date.now(), paused: 0, pausedAt: 0, seen: 0 }; S.last = { fag, min }; save(true); }
function togglePause() { const t = S.timer; if (!t) return; if (t.pausedAt) { t.paused += Date.now() - t.pausedAt; t.pausedAt = 0; } else t.pausedAt = Date.now(); save(true); }
function finishTimer() {
  const t = S.timer; if (!t) return null;
  const ms = elapsedMs(t), full = ms >= t.min * 60000 - 800, min = full ? t.min : Math.floor(ms / 60000);
  S.timer = null;
  if (min < 1) { save(true); return { min: 0 }; }
  return grant(t.fag, min, full, t.min);
}
/* Belønningen for en økt. De første øktminuttene hver dag gir uthvilt-bonus, og etter dagstaket (S.cap) er laget slitent: halv XP og ingen møter. */
function grant(fag, min, full, planned) {
  const k = dayKey(), day = S.log[k] || (S.log[k] = { m: 0, s: 0, f: {} });
  const rested = day.s === 0, okMin = Math.max(0, Math.min(min, S.cap - day.m)), tired = okMin < min, mult = rested ? 1.5 : 1;
  const R = { fag, min, full, rested, tired, ups: [], gifts: [], hatch: [], tl0: tlv(), enc: 0 };
  R.xp = Math.round((okMin * 10 + (min - okMin) * 5) * mult);
  R.coins = Math.round((okMin * 2 + (min - okMin)) * mult) + (full ? 20 : 0);
  S.xp += R.xp; S.coins += R.coins;
  day.m += min; day.s++; day.f[fag] = (day.f[fag] || 0) + min;
  S.fm[fag] = (S.fm[fag] || 0) + min;
  S.party.forEach((u, i) => {
    const m = monBy(u); if (!m) return;
    const l0 = m.lv; m.xp += Math.round(min * 10 * (i ? 0.3 : 1)); m.lv = lvOf(m.xp);
    if (m.lv > l0) R.ups.push({ u, l0, l1: m.lv, evo: evoOpts(m).some(x => x.ok) });
  });
  for (const q of QUESTS) if (day.m - min < q.m && day.m >= q.m) { q.give(); R.gifts.push(`Dagens mål, ${q.n}: ${q.r}`); }
  R.tl1 = tlv();
  for (let l = R.tl0 + 1; l <= R.tl1; l++) {
    S.items.poke += 5; let g = '5 Poké Balls';
    if (l === 3) { S.items.great += 3; g += ' og 3 Great Balls (nå i butikken)'; }
    if (l === 7) { S.items.ultra += 2; g += ' og 2 Ultra Balls (nå i butikken)'; }
    R.gifts.push(`Trenernivå ${l}: ${g}`);
  }
  if (S.eggs.length) {
    const e = S.eggs[0]; e.got += min;
    if (e.got >= e.need) { S.eggs.shift(); const en = genEnc({ egg: 1 }); const isNew = !S.caught[en.id]; const m = addMon(en.id, 1, en.sh); R.hatch.push({ u: m.u, isNew }); }
  }
  const encs = [];
  let n = Math.floor(okMin / 20) + (full && planned >= 25 && okMin >= planned ? 1 : 0), luck = Math.min(1.5, planned / 60);
  if (S.incOn && okMin > 0) { n++; luck += 0.5; S.incOn = 0; }
  n = Math.min(n, 6);
  /* Hvert vanlig møte kan en sjelden gang være legendarisk: 0,5 % i en kort økt, opp mot 1 % i en lang, litt mer med dager på rad. */
  const legP = 0.005 * (1 + luck * 0.5) + Math.min(streak(), 10) * 0.0003;
  for (let i = 0; i < n; i++) encs.push(Math.random() < legP ? genEnc({ leg: 1 }) : genEnc({ fag, luck }));
  if (full && planned >= 45 && okMin >= planned && Math.random() < Math.min(0.04, 0.01 + 0.005 * streak())) { encs.push(genEnc({ leg: 1 })); R.gifts.push('Noe legendarisk rører seg i gresset.'); }
  const fg = S.fag[fag];
  if (fg) {
    const reach = Math.min(4, Math.floor(fagMin(fag) / (fg.t * 60) * 4));
    while (fg.ms < reach) {
      fg.ms++;
      if (fg.ms < 4) { encs.push(genEnc({ fag, min: 3, luck: 1.5 })); R.gifts.push(`${FAGS[fag].n}: ${fg.ms * 25} % av planen er gjort. Et episk møte venter.`); }
      else { encs.push(genEnc({ leg: 1 })); R.gifts.push(`${FAGS[fag].n}-merket er ditt. Et legendarisk møte venter.`); }
    }
  }
  R.enc = encs.length;
  S.pend.push(...encs);
  if (S.pend.length > 15) S.pend.splice(0, S.pend.length - 15);
  save();
  return R;
}

/* ---------- Lag, utvikling, salg, butikk ---------- */
function evoOpts(m) {
  return (EVO[m.id] || []).map(to => {
    const lv = D(to)[5];
    if (lv) return { to, ok: m.lv >= lv, why: `nivå ${lv}` };
    if (D(m.id)[6] & 4) return { to, ok: m.lv >= 10, why: 'nivå 10' };
    return { to, ok: S.items.stone > 0 && m.lv >= 15, why: 'utviklingsstein og nivå 15', stone: 1 };
  });
}
function evolve(m, to) {
  const o = evoOpts(m).find(x => x.to === to);
  if (!o || !o.ok) return false;
  if (o.stone) S.items.stone--;
  m.id = to; S.seen[to] = 1; S.caught[to] = 1;
  save(); return true;
}
const sellValue = m => Math.round(SELL[tierOf(m.id)] * (1 + m.lv / 50) * (m.sh ? 5 : 1));
function sell(m) {
  if (S.mons.length <= 1) return 0;
  const v = sellValue(m);
  S.mons = S.mons.filter(x => x !== m); S.party = S.party.filter(u => u !== m.u);
  if (!S.party.length && S.mons.length) S.party.push(S.mons[0].u);
  S.coins += v; return v;
}
/* Duplikater som kan selges samlet: beholder den beste av hver art, og rører ikke laget, favoritter eller shiny. */
function dupes() {
  const best = {};
  for (const m of S.mons) { const b = best[m.id]; if (!b || m.sh > b.sh || (m.sh === b.sh && m.lv > b.lv)) best[m.id] = m; }
  return S.mons.filter(m => best[m.id] !== m && !m.fav && !m.sh && !S.party.includes(m.u));
}
function setPartner(m) { S.party = [m.u, ...S.party.filter(u => u !== m.u)].slice(0, 6); save(); }
function toggleParty(m) {
  if (S.party.includes(m.u)) { if (S.party.length > 1) S.party = S.party.filter(u => u !== m.u); }
  else if (S.party.length < 6) S.party.push(m.u);
  save();
}
function useCandy(m) { if (!(S.items.candy > 0) || m.lv >= 100) return false; S.items.candy--; m.lv++; m.xp = Math.max(m.xp, xpAt(m.lv)); save(); return true; }
function buy(k) {
  const it = SHOP[k];
  if (!it || S.coins < it.p || (it.lv && tlv() < it.lv)) return false;
  if (k === 'egg') { if (S.eggs.length >= 3) return false; S.eggs.push({ need: 120, got: 0 }); }
  else if (k === 'incense') { if (S.incOn) return false; S.incOn = 1; }
  else S.items[k]++;
  S.coins -= it.p; save(); return true;
}
function buyRegion(r) { const g = REG[r]; if (!g || S.regions.includes(r) || S.coins < g.c) return false; S.coins -= g.c; S.regions.push(r); S.regions.sort(); S.region = r; save(); return true; }
function dexCount(r) { const g = REG[r]; let c = 0; for (let id = g.a; id <= g.b; id++) if (S.caught[id]) c++; return c; }
function begin(id) {
  S.started = 1; S.coins += 660;
  for (const f in S.fag) S.fag[f].ms = Math.min(3, Math.floor(S.fag[f].b / (S.fag[f].t * 60) * 4));
  addMon(id, 5, 0); save();
}

/* ---------- Synk (valgfri): hele lagringen som én fil i et privat GitHub-repo. Høyeste rev vinner. ---------- */
const GHK = 'fokusdex.gh';
let GH = null, ghSha = '', ghBusy = false, ghT = 0, ghState = '', ghHook = null;
const b64e = s => { const b = new TextEncoder().encode(s); let r = ''; for (let i = 0; i < b.length; i += 0x8000) r += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(r); };
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
function ghLoad() { try { GH = JSON.parse(localStorage.getItem(GHK) || 'null'); } catch (_) { GH = null; } if (GH && !(GH.t && GH.repo)) GH = null; }
function ghSet(t, repo) { GH = t && repo ? { t, repo } : null; ghSha = ''; ghState = ''; try { if (GH) localStorage.setItem(GHK, JSON.stringify(GH)); else localStorage.removeItem(GHK); } catch (_) {} }
function ghReq(method, body) {
  const h = { Authorization: 'Bearer ' + GH.t, Accept: 'application/vnd.github+json' };
  if (body) h['Content-Type'] = 'application/json';
  return fetch(`https://api.github.com/repos/${GH.repo}/contents/fokusdex/save.json`, { method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
}
const ghErr = st => st === 401 ? 'Nøkkelen virker ikke' : st === 403 ? 'Nøkkelen mangler tillatelse (Contents)' : st === 404 ? 'Fant ikke repoet' : 'Synk feilet (' + st + ')';
async function ghPull() {
  if (!GH || ghBusy || S.timer) return;
  ghBusy = true;
  let push = false, adopted = false;
  try {
    const r = await ghReq('GET');
    if (r.status === 404) { ghSha = ''; push = true; }
    else if (!r.ok) ghState = ghErr(r.status);
    else {
      const j = await r.json(); ghSha = j.sha;
      const o = JSON.parse(b64d(j.content));
      if (o && o.v === 1 && o.rev > S.rev) { S = Object.assign(fresh(), o); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} adopted = true; }
      else if (o && S.rev > o.rev) push = true;
      ghState = 'ok';
    }
  } catch (_) { ghState = 'Uten nett'; }
  ghBusy = false;
  if (push) await ghPush();
  if (ghHook) ghHook(adopted);
}
async function ghPush() {
  if (!GH || ghBusy) return;
  ghBusy = true;
  let again = false;
  try {
    const body = { message: 'Fokusdex: lagring', content: b64e(JSON.stringify(S)) };
    if (ghSha) body.sha = ghSha;
    const r = await ghReq('PUT', body);
    if (r.ok) { ghSha = (await r.json()).content.sha; ghState = 'ok'; }
    else if (r.status === 409 || r.status === 422) again = true;
    else ghState = ghErr(r.status === 404 ? 404 : r.status);
  } catch (_) { ghState = 'Uten nett'; }
  ghBusy = false;
  if (again) { ghSha = ''; await ghPull(); }
  else if (ghHook) ghHook(false);
}
function ghSoon() { if (!GH) return; clearTimeout(ghT); ghT = setTimeout(ghPush, 5000); }
