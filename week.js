'use strict';
/* Fokusdex – ekspedisjonen (ukemodusen, steg 1d). Her ligger reglene: billettene, uka og ukestypen, kartet og løpet. Skjermene ligger i weekui.js.

   KORT FORTALT (Jazz 15.–17.11): hver studiedag (minst OPENMIN minutter) gir én billett, høyst WKMAX i uka. Fredag etter «Done for today» står
   ekspedisjonen som et fjerde valg den kampdagen (lørdag går også). Den er et kart med stier: trenere, hendelser, kilder, skatter og en
   boss. Billettene bestemmer hvor mye av kartet som er åpent, aldri hvor sterke motstanderne er. Rekker du verken fredag eller lørdag,
   følger billettene med til neste uke. Første gang på studiedag WKDAY.

   UKA går fra lørdag til fredag (wkIdx). Kartet, trenerne og hendelsene trekkes fra uka (wkSeed), så alle som spiller samme uke, får det samme.
   Internt heter modusen «week» (dagens modus) og «wk» (kampen, B.mode). S.wk = { on, bw, bank, w, run, sym, last, n }:
     on    = modusen er åpnet (studiedag WKDAY er nådd)            bw, bank = billettene som er spart: bank gjelder til og med uke bw
     w     = uka det siste løpet ble startet i (ett løp per uke)    run      = løpet som er i gang (se wkBegin), ellers null
     sym   = symboler per anlegg (1 sølv, 2 gull)                   last     = det forrige løpet (til resultatkortet), n = antall løp */

/* ---------- Uka og billettene ---------- */
const WKDAY = 10, WKMAX = 5, WKWKND = 0.05;
/* Dagen som et heltall som er likt i alle tidssoner (dIdx i game.js runder en halv dag og egner seg bare til forskjeller). 0 = torsdag 1.1.1970. */
const wkDn = k => { const q = String(k).split('-').map(Number); return Math.round(Date.UTC(q[0], q[1] - 1, q[2]) / 864e5); };
const wkKey = n => { const t = new Date(n * 864e5); return dayKey(new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())); };
const wkIdx = k => Math.floor((wkDn(k) - 2) / 7);
/* Ukedagen i billettuka: 0 = lørdag … 6 = fredag. */
const wkDow = k => wkDn(k) - 2 - wkIdx(k) * 7;
const wkDays = w => Array.from({ length: 7 }, (_, i) => wkKey(w * 7 + 2 + i));
const wkFri = w => wkKey(w * 7 + 8);
const wkStudied = k => (((S.log || {})[k] || {}).m || 0) >= OPENMIN;
const wkEarned = w => Math.min(WKMAX, wkDays(w).filter(wkStudied).length);
/* Stjernene: studier i helgen (lørdag og søndag i billettuka) mens eksamensperioden går. Hver gir WKWKND mer i mynter i løpet, ikke noe annet. */
const wkExam = k => !!S.exam && !!S.exam.s && k >= S.exam.s && !!examEnd() && k <= examEnd();
const wkStars = w => wkDays(w).slice(0, 2).filter(k => wkStudied(k) && wkExam(k)).length;
/* Studiedager i alt, telt fra loggen (likt for alle: reisetelleren S.jd stopper etter reisen, og eieren har den ikke). */
const studyDays = () => { let n = 0; for (const k in S.log || {}) if (wkStudied(k)) n++; return n; };
/* Uka som sist er helt over: lørdag står forrige ukes løp fortsatt åpent, så da er det uka før den. */
const wkPast = () => { const t = dayKey(); return wkIdx(t) - (wkDow(t) === 0 ? 2 : 1); };
const wkSt = () => S.wk || (S.wk = { bw: wkPast(), bank: 0, w: -1, run: null, sym: {}, n: 0 });
/* Sandkassa (show.js): SBX.wk = { t: billetter, ty: ukestype } overstyrer uka, billettene og at det må være fredag. */
const wkSbx = () => (typeof SBX !== 'undefined' && SBX && SBX.wk) || null;
function wkOn() { if (wkSbx()) return true; const W = wkSt(); if (!W.on && studyDays() >= WKDAY) W.on = 1; return !!W.on; }
/* Billettene som er spart: uker som er helt over (også lørdagen etter), legges til banken hvis løpet ikke ble spilt, og nuller den hvis det ble det.
   Før modusen er åpnet, spares ingenting. Et løp som står igjen etter at vinduet er over, avsluttes der det sto (wkExpire). */
function wkSettle() {
  const W = wkSt(), last = wkPast();
  if (!wkOn() || wkSbx()) { if (!wkSbx()) { W.bw = last; W.bank = 0; } return W; }
  while (W.bw < last) { W.bw++; W.bank = W.w === W.bw ? 0 : Math.min(WKMAX, (W.bank || 0) + wkEarned(W.bw)); }
  wkExpire();
  return W;
}
/* Løpet en kampdag hører til: fredag = uka den ligger i, lørdag = uka før. Andre dager har ikke noe løp. */
const wkRunWeek = d => { if (!d) return null; const x = wkDow(d); return x === 6 ? wkIdx(d) : x === 0 ? wkIdx(d) - 1 : null; };
/* Billettene til løpet i uke r: det som er spart, pluss ukas egne studiedager. Høyst WKMAX. */
const wkTix = r => { const W = wkSettle(); return W.bw >= r ? W.bank || 0 : Math.min(WKMAX, (W.bank || 0) + wkEarned(r)); };
/* Kan ekspedisjonen velges (eller fortsettes) på kampdagen som står åpen? { r: uka, tix, run: 1 når et løp er i gang }. */
function wkOffer() {
  const sb = wkSbx(), W = wkSt();
  if (sb) return { r: wkIdx(dayKey()), tix: W.run ? W.run.t : Math.max(1, Math.min(WKMAX, sb.t || 1)), run: W.run ? 1 : 0, sbx: 1 };
  const d = S.lad.day; if (!d || !wkOn()) return null;
  const r = wkRunWeek(d); if (r == null) return null;
  wkSettle();
  if (W.run && W.run.w === r) return { r, tix: W.run.t, run: 1 };
  if (W.w === r) return null;
  const tix = wkTix(r); return tix > 0 ? { r, tix, run: 0 } : null;
}
/* Det forsiden viser: uka som gjelder nå (lørdag står forrige ukes løp åpent til det er spilt), billettene, og hva som skjer når. */
function wkNow() {
  if (!wkOn()) return null;
  const W = wkSettle(), today = dayKey(), cur = wkIdx(today), dow = wkDow(today), o = wkOffer();
  let r = dow === 0 && W.w !== cur - 1 && wkTix(cur - 1) > 0 ? cur - 1 : cur;
  if (o) r = o.r;
  const played = W.w === r && !(W.run && W.run.w === r), tix = W.run && W.run.w === r ? W.run.t : played ? 0 : wkTix(r);
  return { r, tix, played, run: !!(W.run && W.run.w === r), offer: !!o, on: !!o && modeOn('week'), ty: wkType(r), next: wkType(r + 1), fri: wkFri(r), today: wkFri(r) === today, late: r < cur, stars: wkStars(r),
    left: r === cur && !played ? Math.max(0, Math.min(WKMAX - tix, 6 - dow + (wkStudied(today) ? 0 : 1))) : 0 };
}

/* ---------- Ukestypene ----------
   En runde er seks uker: fire anlegg, Ultra Wormhole og Shadow Snag. Hvert anlegg har sin Frontier Brain (navnet i POOL.brain) og sitt eget
   sølv- og gullsymbol. x = de to som kommer i tillegg til de fire i POOL.brain: den første i sølvkampen (fem i alt), begge i gullkampen (seks;
   mest hentet fra lagene de har i spillene: Brandon med fuglene, Palmer med Heatran og Cresselia). WKEPOCH = uka med fredag 20.11.2026, den første i rundgangen. Reglene som skiller typene, kommer i steg 1d.4:
   til da går alle på grunnkartet (fac = et anlegg med Brain; de to andre har en annen boss til slutt). */
const WKT = {
  pike: { n: 'Battle Pike', brain: 'Lucy', x: [213, 24], c: '#c9a3ff', fac: 1 },
  arcade: { n: 'Battle Arcade', brain: 'Dahlia', x: [308, 145], c: '#ff9f6b', fac: 1 },
  worm: { n: 'Ultra Wormhole', c: '#9fd9ff', boss: 'champ' },
  pyramid: { n: 'Battle Pyramid', brain: 'Brandon', x: [144, 146], c: '#e0b36a', fac: 1 },
  castle: { n: 'Battle Castle', brain: 'Darach', x: [244, 282], c: '#8fb6ff', fac: 1 },
  shadow: { n: 'Shadow Snag', c: '#c58bff', boss: 'evilboss' },
  dome: { n: 'Battle Dome', brain: 'Tucker', x: [380, 59], c: '#ffd27a', fac: 1 },
  hall: { n: 'Battle Hall', brain: 'Argenta', x: [149, 445], c: '#d7c8a8', fac: 1 },
  arena: { n: 'Battle Arena', brain: 'Greta', x: [292, 68], c: '#f08a8a', fac: 1 },
  tower: { n: 'Battle Tower', brain: 'Palmer', x: [485, 488], c: '#b7c4ff', fac: 1 }
};
const WKROT = ['pike', 'arcade', 'worm', 'pyramid', 'castle', 'shadow', 'dome', 'hall', 'worm', 'arena', 'tower', 'shadow'], WKEPOCH = 2967;
const wkType = w => { const sb = wkSbx(); return sb && WKT[sb.ty] && w === wkIdx(dayKey()) ? sb.ty : WKROT[(((w - WKEPOCH) % WKROT.length) + WKROT.length) % WKROT.length]; };

/* ---------- Fast tilfeldighet ----------
   Alt som skal være likt for alle samme uke, trekkes med en egen generator fra et frø (wkRng). wkSeeded bytter ut Math.random mens f går,
   så de vanlige lagbyggerne (regTeam, bossTeam, rentSet) kan brukes som de er. */
const wkHash = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x7f4a7c15, 0xc2b2ae35); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return (h ^ (h >>> 15)) >>> 0; };
const wkRng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function wkSeeded(seed, f) { const r = Math.random; Math.random = wkRng(seed); try { return f(); } finally { Math.random = r; } }
const wkSeed = (w, ty) => wkHash(wkHash(w, 0x51ed), Object.keys(WKT).indexOf(ty) + 1);

/* ---------- Kartet ----------
   Tolv rader nedenfra og opp i fem soner, én sone per billett. Hver sone slutter med en kamp som må vinnes (den siste raden i sonen):
     1 ytre haller: portvakten (gt) · 2 indre haller: en av de store trenerne (el) · 3 Frontier Brain, sølv (bs)
     4 gullveien: Brain på sitt beste, gull (bg) · 5 det forseglede rommet (sr)
   Slagene: tr trener · ac ess (tøffere, bedre premie) · ev hendelse · sp kilde (heler) · tz skatt · en sjeldent møte.
   n = antall rom i raden ([fra, til] trekkes), k = vektene slagene trekkes etter (uten gjentak i raden), need = slaget som alltid er med.
   Stiene går bare til naboene i raden over og krysser aldri hverandre (wkMap). En node: { id, r, c, z, k, x, dy, s: frø, to: [id-er], e: hendelse }. */
const WKROWS = [
  { z: 1, n: [2, 3], k: { tr: 1 } },
  { z: 1, n: [2, 3], k: { ev: 4, tz: 3, tr: 2, en: 1 } },
  { z: 1, n: 1, k: { gt: 1 } },
  { z: 2, n: [2, 3], k: { tr: 3, ev: 3, tz: 2, sp: 2 } },
  { z: 2, n: [3, 3], k: { ac: 3, tz: 2, en: 2, ev: 2, sp: 1 }, need: 'ac' },
  { z: 2, n: 1, k: { el: 1 } },
  { z: 3, n: [2, 3], k: { sp: 4, ev: 2, tz: 2 }, need: 'sp' },
  { z: 3, n: 1, k: { bs: 1 } },
  { z: 4, n: [2, 3], k: { ac: 3, ev: 3, tr: 2, en: 2 } },
  { z: 4, n: [2, 2], k: { sp: 4, tz: 3 }, need: 'sp' },
  { z: 4, n: 1, k: { bg: 1 } },
  { z: 5, n: 1, k: { sr: 1 } }
];
const WKZN = ['', 'Outer halls', 'Inner halls', 'The Brain', 'Gold road', 'Sealed room'];
const WKFIGHT = new Set(['tr', 'ac', 'gt', 'el', 'bs', 'bg']), WKCLOSE = { gt: 1, el: 2, bs: 3, bg: 4, sr: 5 };
let WKC = { k: '', m: null };
function wkMap(w, ty) {
  const key = w + ':' + ty; if (WKC.k === key) return WKC.m;
  const seed = wkSeed(w, ty), rng = wkRng(seed), rows = [], nodes = [], evs = [];
  const pick = P => { const ks = Object.keys(P); let x = rng() * ks.reduce((s, k) => s + P[k], 0); for (const k of ks) { x -= P[k]; if (x <= 0) return k; } return ks[ks.length - 1]; };
  WKROWS.forEach((sp, r) => {
    const n = Array.isArray(sp.n) ? sp.n[0] + Math.floor(rng() * (sp.n[1] - sp.n[0] + 1)) : sp.n, pool = Object.assign({}, sp.k), ks = [];
    if (sp.need && n > 1) { ks.push(sp.need); delete pool[sp.need]; }
    while (ks.length < n) { const k = pick(Object.keys(pool).length ? pool : sp.k); ks.push(k); if (Object.keys(sp.k).length > 1) delete pool[k]; }
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)), t = ks[i]; ks[i] = ks[j]; ks[j] = t; }
    const xs = n === 1 ? [0.5] : n === 2 ? [0.3, 0.7] : [0.18, 0.5, 0.82];
    rows.push(ks.map((k, c) => { const nd = { id: nodes.length, r, c, z: sp.z, k, x: xs[c] + (n > 1 ? (rng() - 0.5) * 0.07 : 0), dy: n > 1 ? (rng() - 0.5) * 0.3 : 0, s: wkHash(seed, nodes.length + 1), to: [] }; nodes.push(nd); return nd; }));
  });
  for (let r = 0; r < rows.length - 1; r++) {
    const a = rows[r], b = rows[r + 1], link = (i, j) => { if (!a[i].to.includes(b[j].id)) a[i].to.push(b[j].id); };
    if (b.length === 1) a.forEach((_, i) => link(i, 0));
    else if (a.length === 1) b.forEach((_, j) => link(0, j));
    else if (a.length === b.length) { a.forEach((_, i) => link(i, i)); for (let i = 0; i < a.length - 1; i++) { const x = rng(); if (x < 0.4) link(i, i + 1); else if (x < 0.8) link(i + 1, i); } }
    else if (a.length < b.length) { link(0, 0); link(0, 1); link(1, 1); link(1, 2); }
    else { link(0, 0); link(1, 0); link(1, 1); link(2, 1); }
    a.forEach(n => n.to.sort((p, q) => p - q));
  }
  /* Hendelsene: hver hendelsesnode får sin egen, uten gjentak før alle som passer sonen, er brukt. */
  nodes.filter(n => n.k === 'ev').forEach(n => { let l = Object.keys(WKEV).filter(k => (WKEV[k].z || 1) <= n.z && !evs.includes(k)); if (!l.length) l = Object.keys(WKEV).filter(k => (WKEV[k].z || 1) <= n.z); n.e = l[Math.floor(rng() * l.length)]; evs.push(n.e); });
  WKC = { k: key, m: { w, ty, seed, rows, nodes } };
  return WKC.m;
}

/* ---------- Motstanderne ----------
   Vanskelig fordi det er flere gode trenere, ikke fordi verdiene er høyere (Jazz 15.11): alle står på lagets nivå (R.flv; litt under på Easy og
   Normal, som i cupen), med oppdrett som klassene i ligaen. Det som skiller dem fra en vanlig kampdag, er at det er mange på rad, at de spiller
   godt (sk, iq), og at settene henger sammen (rentSet, som i Battle Frontier). Tallene her er spakene steg 1d.8 måler og stiller.
   mons = antall, rel = nivået mot laget ditt (aldri over), iv/ev = oppdrett, q = angrepene, sk/iq = spillet, slack = hvor tidlig de er utviklet, xp = XP-faktor, coin = mynter (× studiebonus). */
const WKFOE = {
  tr: { n: 'Trainer', mons: 3, rel: 0.92, iv: 8, ev: 0, q: 2, sk: 0.86, iq: 0.25, slack: 4, xp: 1.2, coin: 300 },
  ac: { n: 'Ace', mons: 4, rel: 0.97, iv: 18, ev: 16, q: 2, sk: 0.94, iq: 0.6, slack: 8, tut: 1, xp: 1.5, coin: 520 },
  gt: { n: 'Gatekeeper', mons: 3, rel: 0.94, iv: 12, ev: 4, q: 2, sk: 0.92, iq: 0.5, slack: 8, xp: 1.45, coin: 480 },
  el: { n: 'Elite', mons: 4, rel: 0.98, iv: 20, ev: 20, q: 2, sk: 0.96, iq: 0.7, slack: 12, tut: 1, xp: 1.6, coin: 650 },
  bs: { n: 'Frontier Brain', mons: 5, rel: 1, iv: 20, ev: 20, q: 2, sk: 1, iq: 0.85, slack: 99, tut: 1, xp: 1.8, coin: 900 },
  bg: { n: 'Frontier Brain', mons: 6, rel: 1, iv: 31, ev: 60, q: 2, sk: 1, iq: 1, slack: 99, tut: 2, xp: 2.1, coin: 1300 }
};
/* De store trenerne i de indre hallene: en leder, en av Elite Four, en rival eller en admin. */
const WKELITE = ['gym', 'e4', 'rival', 'eviladmin'];
/* Vanskelighetsgraden virker som i ligaen (diffSt), utenom nivået, som står i R.flv. */
function wkFoeSt(k) {
  const st = WKFOE[k], d = diff();
  return Object.assign({}, st, { i: k === 'bg' ? 8 : 5, mons: Math.max(2, st.mons + (d.mons || 0)), sk: st.sk * d.sk, iq: st.iq * (typeof facIqD === 'function' ? facIqD() : 1), iv: Math.round(st.iv * d.iv), ev: Math.round(st.ev * d.ev), q: Math.min(st.q, d.q), tut: Math.max(0, (st.tut || 0) + (d.tut || 0)), slack: Math.round(st.slack * d.slack), mg: 0 });
}
/* Bossen i en uke uten Frontier Brain (til 1d.4 gir de to typene sine egne): trekkes fra uka. */
function wkBoss(M) {
  const T = WKT[M.ty];
  if (T.brain) { const i = POOL.brain.findIndex(d => d[0] === T.brain); return ['brain', i < 0 ? 0 : i]; }
  const k = T.boss || 'champ'; return [k, wkHash(M.seed, 77) % POOL[k].length];
}
/* Motstanderen i en node: { st, tr, team, hint }. Likt for alle samme uke (frøet til noden), på nivået flv. */
function wkFoe(M, nd, flv) {
  const st = wkFoeSt(nd.k); flv = Math.max(3, Math.round(flv * st.rel));
  return wkSeeded(nd.s, () => {
    if (nd.k === 'bs' || nd.k === 'bg') {
      const [k, i] = wkBoss(M), d0 = POOL[k][i], x = WKT[M.ty].x, d = x ? Object.assign(d0.slice(), { 4: d0[4].concat(x) }) : d0;
      const team = bossTeam(d, st.mons, flv, st, true).map(rentSet);
      return { st, k, team, hint: d[3], tr: trainerOf(k, i, { skill: st.sk, iq: st.iq, fr: k === 'brain' ? 1 : 0, arena: 'hall', int: nd.k === 'bg' ? 5 : 3, wk: nd.k, film: '', sp: 0 }) };
    }
    if (nd.k === 'el') {
      const k = WKELITE[rnd(WKELITE.length)], i = rnd(POOL[k].length), d = POOL[k][i];
      return { st, k, team: bossTeam(d, st.mons, flv, st, true).map(rentSet), hint: d[3], tr: trainerOf(k, i, { skill: st.sk, iq: st.iq, wk: nd.k, film: '', sp: 0 }) };
    }
    /* Trenere, ess og portvakten: de dyktige trenerklassene (TACE), med et lag rundt typene de liker. */
    const ci = TCLASS.length + rnd(TACE.length), d = POOL.trainer[ci], theme = d[2].length ? d[2] : [rnd(18), rnd(18)];
    const team = regTeam(theme, st.mons, flv, st, true).map(rentSet), cnt = {};
    team.forEach(m => { const t = D(m.id)[1]; cnt[t] = (cnt[t] || 0) + 1; });
    const hint = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    return { st, k: 'trainer', team, hint, tr: trainerOf('trainer', ci, Object.assign({ ty: hint, skill: st.sk, iq: st.iq, fr: 1, arena: nd.k === 'tr' ? d[3] : 'hall', v: 0, int: nd.k === 'tr' ? 1 : 2, wk: nd.k }, nd.k === 'gt' ? { n: 'Gatekeeper', cn: 'Gatekeeper' } : nd.k === 'ac' ? { cn: 'Ace' } : null)) };
  });
}

/* ---------- Løpet ----------
   R = S.wk.run = { w, ty, t: billetter, st: stjerner, lv, flv, at: noden du står i (−1 = porten), path, pend: slaget på en node som ikke er
   gjort ferdig ('' ellers), hp: det laget har igjen ({ u: { h: andel HP, pp: { angrep: PP } } }), got: det løpet har gitt, ms: soner klart,
   sc: noden speideren har fortalt om, used: hendelser som er brukt, lk: kampdagen laget ble låst, d: kampdagen løpet startet }.
   INGEN HELING MELLOM KAMPENE: HP og PP følger med fra kamp til kamp, og de som er slått ut, blir liggende. Kildene heler alt (WKSPRING).
   Etter en seier kommer de som står, seg litt (WKREST), og tilstander (gift, søvn) slipper. Ingen veske i kampene (bag 0).
   NÅR EN SONE ER KLAR (kampen som avslutter den, er vunnet), får laget en pust i bakken: alle får tilbake WKZREST av HP-en, de som var
   slått ut, reiser seg med så mye, og PP-en er full. Sonene er altså hver sin etappe, og det er innenfor en sone det gjelder å holde ut.
   LÅSEN: laget står fast fra første kamp til løpet er over (runLock i league.js). */
const WKREST = 0.1, WKSPRING = 1, WKZREST = 0.5;
const wkParty = () => S.party.map(monBy).filter(Boolean);
const wkHp = (R, u) => (R.hp[u] || (R.hp[u] = { h: 1, pp: {} }));
/* Laget slik det står i løpet: [{ m, h }], h = andelen HP (0 = slått ut). Uten løp er alle friske. */
const wkTeam = R => wkParty().map(m => ({ m, h: R && R.hp[m.u] ? R.hp[m.u].h : 1 }));
function wkHeal(R, f, who) { for (const m of who || wkParty()) { const c = wkHp(R, m.u); if (f >= 1) { c.h = 1; c.pp = {}; } else if (c.h > 0) c.h = Math.min(1, c.h + f); } }
/* Alt skjermen trenger, enten løpet er i gang eller bare kan startes: uka, typen, billettene, kartet, hvor du står og hvor du kan gå. */
function wkView() {
  const W = wkSt(), o = wkOffer(), R = W.run && (!o || o.run || o.sbx) ? W.run : null; if (!R && !o) return null;
  const w = R ? R.w : o.r, ty = R ? R.ty : wkType(w), t = R ? R.t : o.tix, M = wkMap(w, ty), at = R ? R.at : -1, pend = R ? R.pend || '' : '';
  const reach = pend ? [] : (at < 0 ? M.rows[0] : M.nodes[at].to.map(i => M.nodes[i])).filter(n => n.z <= t).map(n => n.id);
  return { W, R, w, ty, T: WKT[ty], t, M, at, pend, reach, path: R ? R.path : [], stars: R ? R.st : wkStars(w) };
}
/* Løpet starter i det første rommet velges: uka er brukt (W.w), og billettene med den. */
function wkBegin() {
  const W = wkSt(); if (W.run) return W.run;
  const o = wkOffer(); if (!o || !modeOn('week')) return null;
  const lv = Math.max(5, Math.round(leagueLv()));
  W.run = { w: o.r, ty: wkType(o.r), t: o.tix, st: o.sbx ? 0 : wkStars(o.r), lv, flv: Math.max(5, Math.min(100, Math.round(lv * (1 + diff().rel)))), at: -1, path: [], pend: '', hp: {}, got: { coins: 0, wins: 0, items: [], encs: 0 }, ms: 0, used: {}, d: S.lad.day || dayKey() };
  if (!o.sbx) { W.w = o.r; if (W.bw >= o.r) W.bank = 0; }
  W.n = (W.n || 0) + 1; stamp(); save();
  return W.run;
}
/* Gå inn i et rom. Valget står: noden er der du er, og den må gjøres ferdig (pend) før du går videre. */
function wkEnter(id) {
  const V = wkView(); if (!V || !V.reach.includes(id)) return null;
  const R = wkBegin(); if (!R) return null;
  const nd = V.M.nodes[id]; R.at = id; R.path.push(id); R.pend = nd.k; stamp(); save();
  return nd;
}
/* Noden er ferdig: sonen er klar hvis det var den siste kampen i den, og løpet er over når ingenting mer er åpent med billettene dine. */
function wkAfter(R, nd) {
  R.pend = ''; if (WKCLOSE[nd.k]) { R.ms = Math.max(R.ms, WKCLOSE[nd.k]); for (const m of wkParty()) { const c = wkHp(R, m.u); c.h = Math.min(1, c.h + WKZREST); c.pp = {}; } }
  const M = wkMap(R.w, R.ty);
  return nd.to.some(i => M.nodes[i].z <= R.t) ? null : wkEnd('won');
}
/* Løpet er over: 'won' = alt billettene åpnet, er klart · 'lost' = laget ble slått ut · 'left' = du dro hjem, eller vinduet gikk ut.
   Det løpet ga underveis, er ditt uansett. Et anlegg gir sølvsymbolet når Brain er slått, og gullsymbolet etter gullkampen. */
function wkEnd(how) {
  const W = wkSt(), R = W.run; if (!R) return null;
  const out = { w: R.w, ty: R.ty, t: R.t, ms: R.ms, how, wins: R.got.wins, coins: R.got.coins, steps: R.path.length, d: dayKey() };
  if (WKT[R.ty].fac && R.ms >= 3) { const s = R.ms >= 4 ? 2 : 1; if ((W.sym[R.ty] || 0) < s) { W.sym[R.ty] = s; out.sym = s; } }
  W.last = out; W.run = null; if (typeof raidUnhide === 'function') raidUnhide(); stamp(); save();
  return out;
}
const wkLeave = () => { const R = wkSt().run; return R && !R.pend ? wkEnd('left') : null; };
/* Vinduet er fredag og lørdag. Står et løp igjen etter det (og kampdagen det hører til, ikke lenger er åpen), er det over der det sto. */
function wkExpire() { const R = wkSt().run; if (!R || wkSbx() || S.live) return; if (wkRunWeek(S.lad.day) === R.w) return; if (wkDn(dayKey()) > (R.w + 1) * 7 + 2) wkEnd('left'); }
const wkDone = () => !wkOffer();

/* ---------- Kampene ---------- */
const wkSm = () => smFor('week');
/* lead = den som går ut først. Laget stiller med det de har igjen: HP og PP fra R.hp, og de som er slått ut, står over. */
function wkBattle(id, lead) {
  const V = wkView(); if (!V) return null;
  const pending = V.R && V.R.pend && V.R.at === id, nd = pending ? V.M.nodes[id] : wkEnter(id); if (!nd || !WKFIGHT.has(nd.k)) return null;
  const R = wkSt().run, f = wkFoe(V.M, nd, R.flv), alive = m => wkHp(R, m.u).h > 0, party = wkParty();
  party.sort((a, b) => (alive(b) - alive(a)) || ((b.u === lead) - (a.u === lead)));
  const B = mkBattle(party, f.team, f.tr, { mode: 'wk', tag: `${WKT[R.ty].n} · ${WKZN[nd.z]}`, st: f.st, k: f.k, nk: nd.k, nid: nd.id, zone: nd.z, bag: 0, xm: xpMult() * diff().xp, sm: wkSm(), dc: diff().coin, boost: { mode: '', m: 1, xp: 1 } });
  for (const b of B.me) { const c = R.hp[b.src.u]; if (!c) continue; b.hp = c.h <= 0 ? 0 : Math.max(1, Math.round(b.max * c.h)); if (b.hp <= 0) b.out = 1; for (const m of b.mv) if (c.pp[m.i] != null) m.pp = Math.max(0, Math.min(m.max, c.pp[m.i])); }
  return B;
}
/* Det laget har igjen etter kampen. En som er forvandlet (Transform), har lånte angrep: da står PP-en som den var. */
function wkKeep(B, R, win) {
  for (const b of B.me) { const u = b.src && b.src.u; if (!u) continue; const c = wkHp(R, u); c.h = b.hp > 0 ? Math.max(0.01, Math.min(1, b.hp / b.max)) : 0; if (!b.tf) for (const m of b.mv) if (b.src.mv.includes(m.i)) c.pp[m.i] = m.pp; if (win && c.h > 0) c.h = Math.min(1, c.h + WKREST); }
}
/* Det en seier gir (første utgave: steg 1d.5 måler og setter premiene). Mynter etter hvem det var, ganger studiebonusen og stjernene. */
const WKLOOT = {
  tr: (g, e) => { g('great', 1); if (Math.random() < 0.35) e({ luck: 1 }); },
  ac: (g, e) => { g('candy', 1); g('ultra', 1); e({ min: 2, luck: 1.5 }); },
  gt: (g, e) => { g('candy', 1); g('great', 2); e({ min: 1, luck: 1.5 }); },
  el: (g, e) => { g('candy', 2); g('ultra', 2); e({ min: 2, luck: 1.5 }); },
  bs: (g, e) => { g('candy', 3); g('ultra', 2); g('stone', 1); e({ min: 3, luck: 2 }); e({ min: 2, luck: 1.5 }); },
  bg: (g, e) => { g('candy', 4); g('maxrev', 1); g('mstone', 1); e({ ids: PSEUDO }); e({ min: 3, luck: 2 }); }
};
const wkCoins = (R, base, sm) => Math.round(base * (sm || wkSm()) * diff().coin * (1 + WKWKND * (R.st || 0)) * purseM());
function finishWeek(B) {
  const W = wkSt(), R = W.run, win = B.over === 'win', res = { mode: 'wk', win, ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', kind: B.k, nk: B.nk };
  if (!R) return res;
  const M = wkMap(R.w, R.ty), nd = M.nodes[B.nid];
  grantXp(B, res); wkKeep(B, R, win);
  if (!win) { res.at = R.path.length; res.end = wkEnd('lost'); return res; }
  const give = (it, n) => { if (it === 'candy') n = candyRoll(n); if (n > 0 && SHOP[it]) { S.items[it] = (S.items[it] || 0) + n; res.items.push(`${n} × ${SHOP[it].n}`); } };
  res.coins = wkCoins(R, B.st.coin, B.sm) + (B.pay || 0); S.coins += res.coins;
  (WKLOOT[nd.k] || WKLOOT.tr)(give, o => pushEnc(res, genEnc(o)));
  if (R.st) res.perks.push(`Weekend study in exam season: ${Math.round(WKWKND * R.st * 100)} % more coins.`);
  R.got.wins++; R.got.coins += res.coins; R.got.encs += res.encs.length; res.items.forEach(x => R.got.items.push(x));
  res.zone = WKCLOSE[nd.k] || 0; res.end = wkAfter(R, nd);
  if (res.end && res.end.sym) { res.sym = res.end.sym; res.perks.push(`You earned the ${res.sym === 2 ? 'Gold' : 'Silver'} Symbol of the ${WKT[res.end.ty].n}.`); }
  stamp(); save();
  return res;
}

/* ---------- Kilder, skatter, møter og hendelser ----------
   wkDo(id, i) gjør et rom som ikke er en kamp: går inn (hvis du ikke alt står der) og tar valg i (hendelser). Svaret er det skjermen viser:
   { nd, t: tittel, l: linjer, coins, items, encs, end }. En hendelse uten valg (i == null) går bare inn og venter på valget. */
const WKTZ = { 1: [150, ['great', 2], ['candy', 1]], 2: [260, ['ultra', 2], ['candy', 1]], 3: [380, ['ultra', 2], ['candy', 2]], 4: [520, ['candy', 3], ['stone', 1]], 5: [900, ['candy', 4], ['mstone', 1]] };
/* Hendelsene: n = navn, d = det du ser, z = tidligste sone, o = valgene [knapp, hva det gjør, nøkkel]. Tekstene går gjennom tl (norsk i LNO under). */
const WKEV = {
  berry: { n: 'A berry tree', d: 'The branches hang heavy with Sitrus Berries. There is enough for a snack, not a feast.', o: [['Share them', 'Everyone still standing recovers a quarter of their HP.', 'share'], ['Give them to one', 'The one that is hurt the most recovers fully.', 'one']] },
  camp: { n: 'A campfire', d: 'Someone left a fire burning, and a pot is still warm.', o: [['Rest', 'Everyone still standing recovers a third of their HP.', 'rest'], ['Train by the fire', 'Your whole team gets XP, as from a win.', 'train']] },
  shrine: { n: 'An old shrine', d: 'A small stone shrine, worn smooth. Something rare is said to answer those who give of their strength.', o: [['Make an offering', 'Everyone still standing loses a fifth of their HP. A rare Pokémon comes to your grass.', 'offer'], ['Bow and move on', 'Everyone still standing recovers a little.', 'bow']] },
  cards: { n: 'Three face-down cards', d: 'A man from the Game Corner has set up a table. “Pick one. No charge, this once.”', o: [['The left card', '', 'c0'], ['The middle card', '', 'c1'], ['The right card', '', 'c2']] },
  scout: { n: 'A scout', z: 1, d: 'She has watched the hall ahead all day and is glad to talk.', o: [['Ask who waits ahead', 'You see the team of the next trainer you must beat.', 'ask'], ['Ask for supplies', 'Potions and a Revive for your Bag at home.', 'supplies']] },
  tutor: { n: 'A wandering tutor', z: 2, d: 'An old tutor rests by the path. “I taught a Frontier Brain once. Care to hear how?”', o: [['Listen', 'A rare move opens at the tutors in the Shop.', 'listen'], ['Thank them and go on', 'They press a few coins into your hand.', 'thanks']] }
};
function wkDo(id, i) {
  const V = wkView(); if (!V) return null;
  const pending = V.R && V.R.pend && V.R.at === id, nd = pending ? V.M.nodes[id] : wkEnter(id); if (!nd || WKFIGHT.has(nd.k)) return null;
  const R = wkSt().run, out = { nd, t: '', l: [], coins: 0, items: [], encs: [] };
  const give = (it, n) => { if (it === 'candy') n = Math.max(1, candyRoll(n)); if (n > 0 && SHOP[it]) { S.items[it] = (S.items[it] || 0) + n; out.items.push(`${n} × ${SHOP[it].n}`); R.got.items.push(`${n} × ${SHOP[it].n}`); } };
  const coins = base => { const c = wkCoins(R, base); S.coins += c; out.coins += c; R.got.coins += c; };
  const enc = o => { const e = genEnc(o); S.pend.push(e); trimPend(30); out.encs.push(e); R.got.encs++; };
  const alive = wkParty().filter(m => wkHp(R, m.u).h > 0);
  if (nd.k === 'sp') { wkHeal(R, WKSPRING); out.t = 'The spring'; out.l.push(tl('Your whole team is healed, and those that had fainted are back on their feet.')); }
  else if (nd.k === 'tz') { const z = WKTZ[nd.z] || WKTZ[1]; coins(z[0]); z.slice(1).forEach(x => give(x[0], x[1])); out.t = 'Treasure'; }
  else if (nd.k === 'en') { enc({ min: nd.z >= 3 ? 3 : 2, luck: 1.5 + 0.25 * nd.z }); out.t = 'A rare encounter'; out.l.push(tl('It slips away into your grass. Meet it there after the expedition.')); }
  else if (nd.k === 'sr') { coins(WKTZ[5][0]); WKTZ[5].slice(1).forEach(x => give(x[0], x[1])); enc({ ids: PSEUDO }); if (Math.random() < 0.3) { const e = legEnc(); S.pend.push(e); out.encs.push(e); R.got.encs++; } out.t = 'The sealed room'; out.l.push(tl('The seal breaks. Nobody has been in here for a very long time.')); }
  else if (nd.k === 'ev') {
    const E = WKEV[nd.e] || WKEV.berry; out.t = E.n; out.ev = nd.e;
    if (i == null) return out;
    const o = E.o[i]; if (!o) return null;
    const k = o[2];
    if (k === 'share') { wkHeal(R, 0.25); out.l.push(tl('Everyone still standing recovers a quarter of their HP.')); }
    else if (k === 'one') { const m = alive.slice().sort((a, b) => wkHp(R, a.u).h - wkHp(R, b.u).h)[0]; if (m) { wkHp(R, m.u).h = 1; out.l.push(tl('{n} eats until it is full of life again.', { n: mName(m) })); } }
    else if (k === 'rest') { wkHeal(R, 1 / 3); out.l.push(tl('Everyone still standing recovers a third of their HP.')); }
    else if (k === 'train') { const res = { ups: [] }; modeXp(res, 3, 1.2, xpMult() * diff().xp); out.ups = res.ups; out.l.push(tl('Your team trains until the fire burns low. Everyone gets XP.')); }
    else if (k === 'offer') { alive.forEach(m => { const c = wkHp(R, m.u); c.h = Math.max(0.01, c.h - 0.2); }); enc({ min: 3, luck: 2 }); out.l.push(tl('The shrine hums. Something rare has come to your grass.')); }
    else if (k === 'bow') { wkHeal(R, 0.1); out.l.push(tl('A calm settles over your team. Everyone recovers a little.')); }
    else if (/^c\d$/.test(k)) { const p = wkSeeded(nd.s, () => { const a = [0, 1, 2]; for (let j = 2; j > 0; j--) { const q = rnd(j + 1), t = a[j]; a[j] = a[q]; a[q] = t; } return a; })[+k[1]];
      if (p === 0) { coins(600); out.l.push(tl('A gold card! He pays up with a grin.')); } else if (p === 1) { give('candy', 2); out.l.push(tl('A sweet card. Not bad at all.')); } else out.l.push(tl('A blank card. He shrugs: better luck next week.')); }
    else if (k === 'ask') { const c = V.M.nodes.find(n => n.r > nd.r && WKCLOSE[n.k] && WKFIGHT.has(n.k)); if (c) { R.sc = c.id; out.l.push(tl('She tells you everything about the team that waits ahead. It shows when you get there.')); } }
    else if (k === 'supplies') { give('super', 2); give('revive', 1); out.l.push(tl('“Take these. You cannot use them in here, but they keep.”')); }
    else if (k === 'listen') { const l = Object.keys(TUTNEED).map(mvIx).filter(x => x >= 0 && !tutOpen(x)), x = l.length ? l[wkHash(nd.s, 5) % l.length] : -1;
      if (x >= 0) { tutUnlock(x); out.l.push(tl('The tutors in the Shop can now teach {mv}.', { mv: MOVES[x][0] })); } else { coins(500); out.l.push(tl('You already know every secret the tutor has. They pay you for listening anyway.')); } }
    else if (k === 'thanks') { coins(250); out.l.push(tl('They press a few coins into your hand.')); }
  }
  out.end = wkAfter(R, nd); stamp(); save();
  return out;
}

Object.assign(LNO, {
  'Your whole team is healed, and those that had fainted are back on their feet.': 'Hele laget er helet, og de som var slått ut, er på beina igjen.',
  'It slips away into your grass. Meet it there after the expedition.': 'Den smetter unna og inn i gresset ditt. Møt den der etter ekspedisjonen.',
  'The seal breaks. Nobody has been in here for a very long time.': 'Seglet brister. Ingen har vært her inne på veldig lenge.',
  'The branches hang heavy with Sitrus Berries. There is enough for a snack, not a feast.': 'Greinene henger tunge av Sitrus Berries. Nok til et mellommåltid, ikke til et festmåltid.',
  'Everyone still standing recovers a quarter of their HP.': 'Alle som står, får tilbake en firedel av HP-en.',
  'The one that is hurt the most recovers fully.': 'Den som er hardest skadet, blir helt frisk.',
  'Someone left a fire burning, and a pot is still warm.': 'Noen har latt et bål brenne, og gryta er fortsatt varm.',
  'Everyone still standing recovers a third of their HP.': 'Alle som står, får tilbake en tredel av HP-en.',
  'Your whole team gets XP, as from a win.': 'Hele laget får XP, som etter en seier.',
  'A small stone shrine, worn smooth. Something rare is said to answer those who give of their strength.': 'Et lite alter av stein, slitt glatt. Det sies at noe sjeldent svarer dem som gir av styrken sin.',
  'Everyone still standing loses a fifth of their HP. A rare Pokémon comes to your grass.': 'Alle som står, mister en femdel av HP-en. En sjelden Pokémon kommer til gresset ditt.',
  'Everyone still standing recovers a little.': 'Alle som står, kommer seg litt.',
  'A man from the Game Corner has set up a table. “Pick one. No charge, this once.”': 'En mann fra Game Corner har satt opp et bord. «Velg ett. Gratis, bare denne gangen.»',
  'She has watched the hall ahead all day and is glad to talk.': 'Hun har fulgt med på hallen foran deg hele dagen og prater gjerne.',
  'You see the team of the next trainer you must beat.': 'Du får se laget til den neste treneren du må slå.',
  'Potions and a Revive for your Bag at home.': 'Potions og en Revive til veska di hjemme.',
  'An old tutor rests by the path. “I taught a Frontier Brain once. Care to hear how?”': 'En gammel lærer hviler ved stien. «Jeg lærte opp en Frontier Brain en gang. Vil du høre hvordan?»',
  'A rare move opens at the tutors in the Shop.': 'Et sjeldent angrep åpnes hos lærerne i Shop.',
  'They press a few coins into your hand.': 'De stikker noen mynter i hånda di.',
  '{n} eats until it is full of life again.': '{n} spiser til den er full av liv igjen.',
  'Your team trains until the fire burns low. Everyone gets XP.': 'Laget trener til bålet brenner ned. Alle får XP.',
  'The shrine hums. Something rare has come to your grass.': 'Alteret summer. Noe sjeldent har kommet til gresset ditt.',
  'A calm settles over your team. Everyone recovers a little.': 'Det senker seg en ro over laget. Alle kommer seg litt.',
  'A gold card! He pays up with a grin.': 'Et gullkort! Han betaler med et glis.',
  'A sweet card. Not bad at all.': 'Et søtt kort. Slett ikke verst.',
  'A blank card. He shrugs: better luck next week.': 'Et blankt kort. Han trekker på skuldrene: bedre lykke neste uke.',
  'She tells you everything about the team that waits ahead. It shows when you get there.': 'Hun forteller alt om laget som venter foran deg. Du ser det når du kommer dit.',
  '“Take these. You cannot use them in here, but they keep.”': '«Ta disse. Du kan ikke bruke dem her inne, men de holder seg.»',
  'The tutors in the Shop can now teach {mv}.': 'Lærerne i Shop kan nå lære bort {mv}.',
  'You already know every secret the tutor has. They pay you for listening anyway.': 'Du kan alt læreren har å fortelle. Du får betalt for å lytte likevel.'
});
