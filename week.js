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
     sym   = symboler per anlegg (1 sølv, 2 gull)                   last     = det forrige løpet (til resultatkortet), n = antall løp
     vault = hvelvet som venter etter løpet (wkVault)               snag     = Shadow-fangstene som renses (wkPure), so = tilbudet om å snappe
     pun   = de som nettopp er renset (til arket), rs = uka regelkortet sist ble vist
     pt    = portalen er sett i full lengde, iw = uka ukas intro sist ble vist, d10 = arket på studiedag WKDAY er vist (weekui.js) */

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
  wkPure();
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
   mest hentet fra lagene de har i spillene: Brandon med fuglene, Palmer med Heatran og Cresselia). WKEPOCH = uka med fredag 20.11.2026, den første i rundgangen.
   HVER TYPE HAR ÉN REGEL (steg 1d.4; rule = navnet, rd = regelkortet, og et flagg som koden leser). Alle går på det samme grunnkartet:
     door  Pike: rommene er lukkede dører, med ett hint per rad (M.hint). stat: gift, brann og lammelse følger med fra rom til rom.
     board Arcade: brettet før hver kamp (wkBoard, wkSpin). Flere billetter gir flere gode ruter.
     deep  Wormhole: premien ved utgangen stiger for hver sone (WKEXIT), og møtene er oftere shiny jo dypere du er. Et tap koster ett trinn.
     dark  Pyramid: du ser bare radene lyset når (wkSees), og finner bær og Revive som bare gjelder i løpet (R.x.bag, wkUse).
     cp    Castle: ingen kilder (nosp); seire gir Castle Points (R.x.cp) som brukes på kartet (WKCP, wkBuy). Resten blir mynter.
     snag  Shadow: noen trenere har en Shadow-Pokémon (nd.sh). Slår du dem, kan du snappe den (wkSnag); den renses av studiedager (wkPure).
     open  Dome: alle lagene vises. crowd: en seier uten at noen blir slått ut, gir mer.   types Hall: kartet viser typen til hver trener.
     nosw  Arena: ingen bytter i kampen (B.nosw).   zrest/rest/nosp Tower: flere trenere og ingen kilder, men full heling etter hver sone.
   fac = et anlegg med Brain og symboler; de to andre har sine egne bosser (boss), romnavn (nn, nd) og sonenavn (zn). */
const WKT = {
  pike: { n: 'Battle Pike', brain: 'Lucy', x: [213, 24], c: '#c9a3ff', fac: 1, door: 1, stat: 1, rule: 'Closed doors',
    rd: 'You cannot see what is in a room before you open its door, but in every row the guard whispers what hides behind one of them. Poison, burns and paralysis stay with your team until a spring or the end of a zone.' },
  arcade: { n: 'Battle Arcade', brain: 'Dahlia', x: [308, 145], c: '#ff9f6b', fac: 1, board: 1, rule: 'The game board',
    rd: 'Before every battle a board spins, and you stop it yourself. The square you land on changes that battle: weather, berries for your team, a burn on the opponent, or something that hits you. More tickets put more good squares on the board, never more bad ones.' },
  worm: { n: 'Ultra Wormhole', c: '#9fd9ff', boss: 'champ', deep: 1, rule: 'Deeper and deeper', zn: ['', 'The rift', 'Ultra Space', 'The deep', 'The abyss', 'The far end'],
    nn: { gt: 'The rift keeper', bs: 'A Champion, lost in here', bg: 'The one at the bottom' }, nd: { gt: 'The rift closes behind whoever loses. Win to go deeper.', bs: 'A Champion who fell through long ago, and stayed.', bg: 'Another Champion, with everything they have. Nobody has been deeper.' },
    rd: 'There is no Frontier Brain in here: the map goes down. Every zone you clear lifts the prize that waits at the way out, and the deeper you are, the likelier it is that what you meet is shiny. Walk out when you like and the prize is yours. Fall, and you get the one a step below.' },
  pyramid: { n: 'Battle Pyramid', brain: 'Brandon', x: [144, 146], c: '#e0b36a', fac: 1, dark: 1, gk: 0.96, rule: 'In the dark',
    rd: 'The map lies in darkness. You see one row ahead, and one more for every two trainers you beat. In the dark there are berries and Revives that only work in here: use them on the map, between the rooms.' },
  castle: { n: 'Battle Castle', brain: 'Darach', x: [244, 282], c: '#8fb6ff', fac: 1, cp: 1, nosp: 'ev', rule: 'Castle Points',
    rd: 'There are no springs here. Every win gives Castle Points, more the healthier your team is, and you spend them on the map: heal, revive, or learn who waits ahead. Points you save turn into coins at the end.' },
  shadow: { n: 'Shadow Snag', c: '#c58bff', boss: 'evilboss', snag: 1, rule: 'Snag Balls', zn: ['', 'The outskirts', 'The hideout', 'The leader', 'The inner lab', 'The sealed room'],
    nn: { gt: 'The lookout', bs: 'The leader', bg: 'The leader, cornered' }, nd: { gt: 'The outskirts end here. Beat the lookout to get into the hideout.', bs: 'The one who gave the orders.', bg: 'The same leader with everything they have, and the rarest Shadow Pokémon of all.' },
    rd: 'Some trainers have a Shadow Pokémon: a rare species with a dark aura that hits harder. Beat them and you may snag it. You have one Snag Ball, two with four tickets, so choose who. Three study days lift the shadow, and then it is yours.' },
  dome: { n: 'Battle Dome', brain: 'Tucker', x: [380, 59], c: '#ffd27a', fac: 1, open: 1, crowd: 0.25, rule: 'Open brackets',
    rd: 'Everyone sees everyone: every team on the map is shown before you step in. The crowd loves a clean win: beat a trainer without losing a Pokémon, and the battle pays a quarter more.' },
  hall: { n: 'Battle Hall', brain: 'Argenta', x: [149, 445], c: '#d7c8a8', fac: 1, types: 1, gk: 0.94, rule: 'Type by type',
    rd: 'Every trainer in the Hall swears by one type, and the map shows which. Choose the path your team likes best.' },
  arena: { n: 'Battle Arena', brain: 'Greta', x: [143, 68], c: '#f08a8a', fac: 1, nosw: 1, rule: 'No way out',
    rd: 'In the Arena nobody is called back: neither you nor the opponent can switch during a battle. Only a faint, or a move that switches on its own, changes who is out. Choose who leads with care.' },
  tower: { n: 'Battle Tower', brain: 'Palmer', x: [485, 488], c: '#b7c4ff', fac: 1, nosp: 'tr', zrest: 1, rest: 0.25, rule: 'The long climb',
    rd: 'No springs and no shortcuts: more trainers than anywhere else. In return your team catches its breath after every win, and is fully healed each time a zone is cleared.' }
};
const wkZn = (ty, z) => ((WKT[ty] || {}).zn || WKZN)[z] || WKZN[z];
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
/* Pyramid: sjansen for et bær og for en Revive i et rom, og det de gjør (andel HP). Shadow: artene som kan være Shadow, etter hvor sjeldne de er
   (grunnformer; i kampen er de utviklet etter nivået): sjeldne i utkanten, episke hos essene, de pseudo-legendariske hos lederen, og fuglene,
   hundene og Lugia fra XD hos lederen i gullkampen. */
const WKFIND = [0.4, 0.18], WKBERRY = 0.35, WKREVIVE = 0.5, WKBAG0 = { berry: 2, revive: 1 }, WKSHLEG = [144, 145, 146, 243, 244, 245, 249];
let WKSHP = null;
function wkShPool() {
  if (WKSHP) return WKSHP; const a = [[], []];
  for (let id = 1; id <= 649; id++) { const d = D(id); if (isLeg(id) || stageOf(id) || (d[6] & 4) || PSEUDO.includes(id)) continue; const t = tierOf(id); if (t === 2) a[0].push(id); else if (t === 3) a[1].push(id); }
  return (WKSHP = [a[0].length ? a[0] : [133], a[1].length ? a[1] : [131], PSEUDO, WKSHLEG]);
}
let WKC = { k: '', m: null };
function wkMap(w, ty) {
  const key = w + ':' + ty; if (WKC.k === key) return WKC.m;
  const seed = wkSeed(w, ty), rng = wkRng(seed), rows = [], nodes = [], evs = [], T = WKT[ty], hint = [];
  const pick = P => { const ks = Object.keys(P); let x = rng() * ks.reduce((s, k) => s + P[k], 0); for (const k of ks) { x -= P[k]; if (x <= 0) return k; } return ks[ks.length - 1]; };
  WKROWS.forEach((sp, r) => {
    const n = Array.isArray(sp.n) ? sp.n[0] + Math.floor(rng() * (sp.n[1] - sp.n[0] + 1)) : sp.n, pool = Object.assign({}, sp.k), ks = [];
    if (sp.need && n > 1) { ks.push(sp.need); delete pool[sp.need]; }
    while (ks.length < n) { const k = pick(Object.keys(pool).length ? pool : sp.k); ks.push(k); if (Object.keys(sp.k).length > 1) delete pool[k]; }
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)), t = ks[i]; ks[i] = ks[j]; ks[j] = t; }
    const xs = n === 1 ? [0.5] : n === 2 ? [0.3, 0.7] : [0.18, 0.5, 0.82];
    if (T.nosp) for (let i = 0; i < ks.length; i++) if (ks[i] === 'sp') ks[i] = T.nosp;
    hint.push(n > 1 ? Math.floor(rng() * n) : -1);
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
  /* Pyramid: det som ligger i mørket (f = 'berry' eller 'revive'), i rom som ikke avslutter en sone. */
  if (T.dark) nodes.forEach(n => { const x = rng(); if (!WKCLOSE[n.k]) n.f = x < WKFIND[0] ? 'berry' : x < WKFIND[0] + WKFIND[1] ? 'revive' : ''; });
  /* Shadow: én trener i første rad, esset i de indre hallene, lederen (sølv og gull) og esset på gullveien har en Shadow-Pokémon (sh = arten). */
  if (T.snag) {
    const P = wkShPool(), at = (r, k) => rows[r].filter(n => n.k === k), one = l => l[Math.floor(rng() * l.length)], used = [];
    const put = (n, l) => { if (!n) return; const f = l.filter(x => !used.includes(x)); n.sh = one(f.length ? f : l); used.push(n.sh); };
    put(one(rows[0]), P[0]); put(at(4, 'ac')[0], P[1]); put(at(7, 'bs')[0], P[2]); put(at(8, 'ac')[0], P[1]); put(at(10, 'bg')[0], P[3]);
  }
  WKC = { k: key, m: { w, ty, seed, rows, nodes, hint } };
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
function wkBoss(M, nk) {
  const T = WKT[M.ty];
  if (T.brain) { const i = POOL.brain.findIndex(d => d[0] === T.brain); return ['brain', i < 0 ? 0 : i]; }
  const k = T.boss || 'champ', n = POOL[k].length, i = wkHash(M.seed, 77) % n;
  /* Wormhole: to forskjellige mestere. Shadow: den samme lederen to ganger, som Brain. */
  return [k, nk === 'bg' && T.deep && n > 1 ? (i + 1 + wkHash(M.seed, 78) % (n - 1)) % n : i];
}
/* Shadow-Pokémonen i kampen: arten utviklet så langt nivået tillater, med merket shd (bmon i kampen leser det: mørk aura og hardere slag). */
function wkShMon(sp, lv, st) { let id = sp; for (let nx = EVO[id]; nx && nx.length; nx = EVO[id]) { const to = nx[rnd(nx.length)]; if (lv < reqLv(to)) break; id = to; } return Object.assign(rentSet(foeMon(id, lv, st)), { shd: 1 }); }
/* Motstanderen i en node: { st, tr, team, hint }. Likt for alle samme uke (frøet til noden), på nivået flv. */
function wkFoe(M, nd, flv) {
  const st = wkFoeSt(nd.k); flv = Math.max(3, Math.round(flv * st.rel * ((nd.k === 'bg' && WKT[M.ty].gk) || 1)));
  const f = wkSeeded(nd.s, () => {
    if (nd.k === 'bs' || nd.k === 'bg') {
      const [k, i] = wkBoss(M, nd.k), d0 = POOL[k][i], x = WKT[M.ty].x, d = x ? Object.assign(d0.slice(), { 4: d0[4].concat(x) }) : d0;
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
  /* Shadow-uka: Shadow-Pokémonen tar plassen rett før esset (den siste hos en vanlig trener). */
  if (nd.sh) { const i = Math.max(0, f.team.length - (nd.k === 'bs' || nd.k === 'bg' || nd.k === 'el' ? 2 : 1)); f.team[i] = wkSeeded(wkHash(nd.s, 9), () => wkShMon(nd.sh, flv, st)); f.shi = i; }
  return f;
}
/* Typen hver kamp på kartet går i (Hall viser den på kartet). Mellomlagret per kart og nivå. */
let WKH = { k: '', h: null };
function wkHints(M, flv) { const key = M.w + ':' + M.ty + ':' + flv; if (WKH.k !== key) { const h = {}; M.nodes.forEach(n => { if (WKFIGHT.has(n.k)) h[n.id] = wkFoe(M, n, flv).hint; }); WKH = { k: key, h }; } return WKH.h; }
/* Hva du ser av et rom før du har vært der: 2 = alt · 1 = at det er et rom (en lukket dør, et omriss i mørket) · 0 = ingenting (bare Pyramid).
   Kampene som avslutter en sone, ser du alltid. Pike: hintet i raden er åpent. Pyramid: lyset når WKLIGHT rader, og én til for hver WKLIGHTW seier. */
const WKLIGHT = 1, WKLIGHTW = 2;
const wkLight = R => WKLIGHT + Math.floor(((R && R.got.wins) || 0) / WKLIGHTW);
function wkSees(V, nd) {
  if (WKCLOSE[nd.k] || V.path.includes(nd.id)) return 2;
  if (V.T.door) return V.M.hint[nd.r] === nd.c ? 2 : 1;
  if (V.T.dark) { const row = V.at < 0 ? -1 : V.M.nodes[V.at].r, L = wkLight(V.R); return nd.r <= row + L ? 2 : nd.r <= row + L + 1 ? 1 : 0; }
  return 2;
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
const wkTeam = R => wkParty().map(m => ({ m, h: R && R.hp[m.u] ? R.hp[m.u].h : 1, s: (R && R.hp[m.u] && R.hp[m.u].s) || '' }));
function wkHeal(R, f, who) { for (const m of who || wkParty()) { const c = wkHp(R, m.u); if (f >= 1) { c.h = 1; c.pp = {}; c.s = ''; } else if (c.h > 0) c.h = Math.min(1, c.h + f); } }
/* Det ukestypen holder styr på i løpet (R.x): Castle Points, Pyramid-veska, Snag Ballene, og ruta brettet stoppet på (arc). */
const wkX = (ty, t) => { const T = WKT[ty]; return T.cp ? { cp: WKCP0 } : T.dark ? { bag: Object.assign({}, WKBAG0) } : T.snag ? { balls: t >= WKBALL2 ? 2 : 1 } : {}; };
/* Alt skjermen trenger, enten løpet er i gang eller bare kan startes: uka, typen, billettene, kartet, hvor du står og hvor du kan gå. */
function wkView() {
  const W = wkSt(), o = wkOffer(), R = W.run && (!o || o.run || o.sbx) ? W.run : null; if (!R && !o) return null;
  if (R && !R.x) R.x = wkX(R.ty, R.t);
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
  W.run.x = wkX(W.run.ty, W.run.t); W.so = null;
  if (!o.sbx) { W.w = o.r; if (W.bw >= o.r) W.bank = 0; }
  W.n = (W.n || 0) + 1; stamp(); save();
  return W.run;
}
/* Gå inn i et rom. Valget står: noden er der du er, og den må gjøres ferdig (pend) før du går videre. */
function wkEnter(id) {
  const V = wkView(); if (!V || !V.reach.includes(id)) return null;
  const R = wkBegin(); if (!R) return null;
  const nd = V.M.nodes[id]; R.at = id; R.path.push(id); R.pend = nd.k; wkSt().so = null; stamp(); save();
  return nd;
}
/* Noden er ferdig: sonen er klar hvis det var den siste kampen i den, og løpet er over når ingenting mer er åpent med billettene dine. */
function wkAfter(R, nd) {
  R.pend = ''; if (WKCLOSE[nd.k]) { R.ms = Math.max(R.ms, WKCLOSE[nd.k]); const z = WKT[R.ty].zrest || WKZREST; for (const m of wkParty()) { const c = wkHp(R, m.u); c.h = Math.min(1, c.h + z); c.pp = {}; c.s = ''; } }
  const M = wkMap(R.w, R.ty);
  return nd.to.some(i => M.nodes[i].z <= R.t) ? null : wkEnd('won');
}
/* Løpet er over: 'won' = alt billettene åpnet, er klart · 'lost' = laget ble slått ut · 'left' = du dro hjem, eller vinduet gikk ut.
   Det løpet ga underveis, er ditt uansett. Et anlegg gir sølvsymbolet når Brain er slått, og gullsymbolet etter gullkampen. */
function wkEnd(how) {
  const W = wkSt(), R = W.run; if (!R) return null;
  const T = WKT[R.ty], X = R.x || {};
  /* Castle: poengene som er spart, blir mynter. */
  let cp = 0, cpc = 0; if (T.cp && X.cp > 0) { cp = X.cp; cpc = wkCoins(R, cp * WKCPC); S.coins += cpc; R.got.coins += cpc; }
  const out = { w: R.w, ty: R.ty, t: R.t, ms: R.ms, how, wins: R.got.wins, coins: R.got.coins, steps: R.path.length, d: dayKey(), p: R.path.slice(), tm: wkParty().map(m => m.id), lv: R.flv };
  if (cp) { out.cp = cp; out.cpc = cpc; }
  if (R.got.snag) out.snag = R.got.snag.slice();
  if (T.fac && R.ms >= 3) { const s = R.ms >= 4 ? 2 : 1; out.got = s; if ((W.sym[R.ty] || 0) < s) { W.sym[R.ty] = s; out.sym = s; } }
  /* Wormhole: premien ved utgangen er trinnet du nådde. Et tap koster ett trinn. */
  if (T.deep) { const st = Math.max(0, Math.min(5, R.ms) - (how === 'lost' ? 1 : 0)); out.exit = st; if (st) { const e = wkExitEnc(st); S.pend.push(e); trimPend(30); out.xe = { id: e.id, sh: e.sh || 0 }; } }
  /* Hvelvet: én kiste per billett, metallet etter hvor langt du kom. Står et gammelt hvelv igjen, åpnes det først. */
  while (W.vault && W.vault.open.length < W.vault.n) if (!wkChest()) break;
  W.vault = { w: R.w, ty: R.ty, n: R.t, m: R.ms >= 4 ? 2 : R.ms >= 3 ? 1 : 0, cm: wkCoins(R, 1000) / 1000, open: [] };
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
  const R = wkSt().run, T = WKT[R.ty], X = R.x || (R.x = {}), f = wkFoe(V.M, nd, R.flv), alive = m => wkHp(R, m.u).h > 0, party = wkParty();
  const arc = T.board && X.arc && X.arc.id === id ? X.arc : null, ak = arc ? arc.k : '';
  if (ak === 'berry' && !arc.u) { wkHeal(R, WKARCB); arc.u = 1; }
  party.sort((a, b) => (alive(b) - alive(a)) || ((b.u === lead) - (a.u === lead)));
  const B = mkBattle(party, f.team, f.tr, { mode: 'wk', tag: `${T.n} · ${wkZn(R.ty, nd.z)}`, st: f.st, k: f.k, nk: nd.k, nid: nd.id, zone: nd.z, bag: 0, xm: xpMult() * diff().xp, sm: wkSm(), dc: diff().coin, boost: { mode: '', m: 1, xp: 1 }, nosw: T.nosw ? 1 : 0, cm: ak === 'coin' ? WKARCC : 1, arc: ak });
  for (const b of B.me) { const c = R.hp[b.src.u]; if (!c) continue; b.hp = c.h <= 0 ? 0 : Math.max(1, Math.round(b.max * c.h)); if (b.hp <= 0) b.out = 1; for (const m of b.mv) if (c.pp[m.i] != null) m.pp = Math.max(0, Math.min(m.max, c.pp[m.i])); if (T.stat && c.s && b.hp > 0) b.status = c.s; }
  B.ko0 = B.me.filter(b => b.hp <= 0).length;
  for (const b of B.foe) if (b.src.shd) b.shd = 1;
  /* Ruta fra brettet (Arcade): gjelder denne ene kampen. Den som er immun mot en tilstand, slipper. */
  const me = B.me[0], fo = B.foe[0], sick = (b, k, imm) => { if (b && b.hp > 0 && !b.status && !imm.some(t => b.ty.includes(t))) b.status = k; };
  if (ak === 'par') sick(fo, 'par', [12]); else if (ak === 'brn') sick(fo, 'brn', [9]); else if (ak === 'mypsn') sick(me, 'psn', [3, 8]);
  else if (ak === 'low') for (const b of B.foe) b.hp = Math.max(1, Math.round(b.max * WKARCL)); else if (ak === 'up') me.sg[5] = 1; else if (ak === 'foeup') fo.sg[5] = 1;
  else if (WXT[ak] != null) B.wx = { k: ak, n: 8 }; else if (ak === 'tr') B.troom = 6;
  return B;
}
/* Det laget har igjen etter kampen. En som er forvandlet (Transform), har lånte angrep: da står PP-en som den var. */
function wkKeep(B, R, win) {
  const T = WKT[R.ty];
  for (const b of B.me) { const u = b.src && b.src.u; if (!u) continue; const c = wkHp(R, u); c.h = b.hp > 0 ? Math.max(0.01, Math.min(1, b.hp / b.max)) : 0; if (!b.tf) for (const m of b.mv) if (b.src.mv.includes(m.i)) c.pp[m.i] = m.pp; if (win && c.h > 0) c.h = Math.min(1, c.h + (T.rest || WKREST)); if (T.stat) c.s = b.hp > 0 && WKSTAT[b.status] ? WKSTAT[b.status] : ''; }
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
  const M = wkMap(R.w, R.ty), nd = M.nodes[B.nid], T = WKT[R.ty], X = R.x || (R.x = {});
  grantXp(B, res); wkKeep(B, R, win);
  if (!win) { res.at = R.path.length; res.end = wkEnd('lost'); return res; }
  const give = (it, n) => { if (it === 'candy') n = candyRoll(n); if (n > 0 && SHOP[it]) { S.items[it] = (S.items[it] || 0) + n; res.items.push(`${n} × ${SHOP[it].n}`); } };
  const clean = B.me.filter(b => b.hp <= 0).length === (B.ko0 || 0);
  res.coins = Math.round(wkCoins(R, B.st.coin, B.sm) * (B.cm || 1) * (T.crowd && clean ? 1 + T.crowd : 1)) + (B.pay || 0); S.coins += res.coins;
  (WKLOOT[nd.k] || WKLOOT.tr)(give, o => pushEnc(res, genEnc(T.deep ? Object.assign({ shm: 1 + nd.z }, o) : o)));
  if (B.cm > 1) res.perks.push('The board: this battle paid half as much again.');
  if (T.crowd && clean) res.perks.push(`A clean win. The crowd pays ${Math.round(T.crowd * 100)} % more.`);
  if (T.cp) { const l = wkTeam(R), cp = WKCPW[0] + Math.round(WKCPW[1] * l.reduce((a, x) => a + x.h, 0) / Math.max(1, l.length)) + (WKCPK[nd.k] || 0); X.cp = (X.cp || 0) + cp; res.cp = cp; res.perks.push(`You earned ${cp} Castle Points.`); }
  if (T.dark) wkFind(R, nd, res.perks);
  /* Shadow: kampen er vunnet, og Shadow-Pokémonen kan snappes hvis du har en ball igjen. Tilbudet står til du går inn i neste rom. */
  if (nd.sh && X.balls > 0) { const sb = B.foe.find(b => b.shd); if (sb) { W.so = { id: sb.id, nid: nd.id, w: R.w }; res.snag = { id: sb.id, balls: X.balls }; } }
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
  const T = WKT[R.ty], enc = o => { const e = genEnc(T.deep ? Object.assign({ shm: 1 + nd.z }, o) : o); S.pend.push(e); trimPend(30); out.encs.push(e); R.got.encs++; };
  const alive = wkParty().filter(m => wkHp(R, m.u).h > 0);
  if (nd.k === 'sp') { wkHeal(R, WKSPRING); out.t = 'The spring'; out.l.push(tl('Your whole team is healed, and those that had fainted are back on their feet.')); }
  else if (nd.k === 'tz') { const z = WKTZ[nd.z] || WKTZ[1]; coins(z[0]); z.slice(1).forEach(x => give(x[0], x[1])); out.t = 'Treasure'; }
  else if (nd.k === 'en') { enc({ min: nd.z >= 3 ? 3 : 2, luck: 1.5 + 0.25 * nd.z }); out.t = 'A rare encounter'; out.l.push(tl('It slips away into your grass. Meet it there after the expedition.')); }
  else if (nd.k === 'sr') { coins(WKTZ[5][0]); WKTZ[5].slice(1).forEach(x => give(x[0], x[1])); enc({ ids: PSEUDO }); if (!T.deep && Math.random() < 0.3) { const e = legEnc(); S.pend.push(e); out.encs.push(e); R.got.encs++; } out.t = 'The sealed room'; out.l.push(tl('The seal breaks. Nobody has been in here for a very long time.')); }
  else if (nd.k === 'ev') {
    const E = WKEV[nd.e] || WKEV.berry; out.t = E.n; out.ev = nd.e;
    if (i == null) return out;
    const o = E.o[i]; if (!o) return null;
    const k = o[2];
    if (k === 'share') { wkHeal(R, 0.25); out.l.push(tl('Everyone still standing recovers a quarter of their HP.')); }
    else if (k === 'one') { const m = alive.slice().sort((a, b) => wkHp(R, a.u).h - wkHp(R, b.u).h)[0]; if (m) { wkHp(R, m.u).h = 1; wkHp(R, m.u).s = ''; out.l.push(tl('{n} eats until it is full of life again.', { n: mName(m) })); } }
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
  if (T.dark) { const l = []; wkFind(R, nd, l); l.forEach(x => out.l.push(tl(x))); }
  out.end = wkAfter(R, nd); stamp(); save();
  return out;
}

/* ---------- Ukestypenes egne ting (steg 1d.4) ---------- */
/* PIKE: tilstandene som følger med fra rom til rom (søvn og frost slipper, som ellers). */
const WKSTAT = { psn: 'psn', tox: 'psn', par: 'par', brn: 'brn' };
/* ARCADE: brettet har åtte ruter. g = 1 god for deg · 0 verken eller · −1 treffer deg. Med t billetter er det 1 + t gode (høyst seks), alltid to
   dårlige, og resten nøytrale. Brettet er likt for alle (frøet til rommet); hvor det stopper, er ditt. Ruta gjelder den ene kampen. */
const WKARCB = 0.15, WKARCC = 1.5, WKARCL = 0.8;
const WKARC = {
  berry: { g: 1, n: 'Berries', d: 'Your team recovers a little HP before the battle.' }, par: { g: 1, n: 'Static', d: "The opponent's lead starts paralysed." },
  brn: { g: 1, n: 'Embers', d: "The opponent's lead starts with a burn." }, low: { g: 1, n: 'Weary', d: "The opponent's team starts at four fifths of its HP." },
  coin: { g: 1, n: 'Jackpot', d: 'This battle pays half as much again.' }, up: { g: 1, n: 'Tailwind', d: 'Your lead starts with its Speed raised.' },
  sun: { g: 0, n: 'Sun', d: 'The battle starts in harsh sunlight.' }, rain: { g: 0, n: 'Rain', d: 'The battle starts in rain.' }, sand: { g: 0, n: 'Sandstorm', d: 'The battle starts in a sandstorm.' },
  hail: { g: 0, n: 'Hail', d: 'The battle starts in hail.' }, tr: { g: 0, n: 'Trick Room', d: 'The slow move first for the first rounds.' }, none: { g: 0, n: 'Blank', d: 'Nothing happens. An ordinary battle.' },
  mypsn: { g: -1, n: 'Spikes', d: 'Your lead starts poisoned.' }, foeup: { g: -1, n: 'Headwind', d: "The opponent's lead starts with its Speed raised." }
};
function wkBoard(R, nd) {
  return wkSeeded(wkHash(nd.s, 31), () => {
    const sh = l => { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = rnd(i + 1), t = l[i]; l[i] = l[j]; l[j] = t; } return l; };
    const all = Object.keys(WKARC), of = g => sh(all.filter(k => WKARC[k].g === g)), good = Math.min(6, 1 + R.t);
    return sh(of(1).slice(0, good).concat(of(0).slice(0, 6 - good), of(-1).slice(0, 2)));
  });
}
/* Brettet er stoppet på rute i. Rommet må være det du står i (en kamp), og hvert rom har ett spinn. */
function wkSpin(id, i) {
  const R = wkSt().run; if (!R || !WKT[R.ty].board || R.at !== id || !R.pend || !WKFIGHT.has(R.pend)) return null;
  const X = R.x || (R.x = {}); if (X.arc && X.arc.id === id) return X.arc.k;
  const bd = wkBoard(R, wkMap(R.w, R.ty).nodes[id]); X.arc = { id, k: bd[((Math.floor(i) % bd.length) + bd.length) % bd.length] }; stamp(); save();
  return X.arc.k;
}
/* CASTLE: du starter med WKCP0 poeng. En seier gir WKCPW[0] + WKCPW[1] × (snittet av HP-en laget har igjen) + litt for de store (WKCPK).
   WKCP = det poengene kan brukes på (u: 1 = en som står, 2 = en som er slått ut). Det som er spart til slutt, blir WKCPC mynter per poeng (wkEnd). */
const WKCP0 = 12, WKCPW = [8, 16], WKCPK = { ac: 4, gt: 4, el: 8, bs: 12, bg: 16 }, WKCPC = 4;
const WKCP = {
  one: { c: 12, n: 'Heal one', d: 'One Pokémon gets all its HP and PP back.', u: 1 }, rev: { c: 16, n: 'Revive one', d: 'One that has fainted is back with half its HP.', u: 2 },
  all: { c: 22, n: 'Heal the team', d: 'Everyone still standing recovers a third of their HP.' }, see: { c: 6, n: 'Ask the valet', d: 'You see the team of the next trainer you must beat.' }
};
/* Den neste kampen du må vinne (den som avslutter sonen du er i, eller en senere). */
const wkNextGate = (M, row) => M.nodes.find(n => n.r > row && WKCLOSE[n.k] && WKFIGHT.has(n.k)) || null;
function wkBuy(k, u) {
  const R = wkSt().run, it = WKCP[k]; if (!R || R.pend || !WKT[R.ty].cp || !it || !((R.x.cp || 0) >= it.c)) return false;
  if (it.u && !S.party.includes(u)) return false;
  const c = it.u ? wkHp(R, u) : null;
  if (k === 'one') { if (c.h <= 0 || (c.h >= 1 && !Object.keys(c.pp).length)) return false; c.h = 1; c.pp = {}; c.s = ''; }
  else if (k === 'rev') { if (c.h > 0) return false; c.h = 0.5; }
  else if (k === 'all') { if (!wkParty().some(m => { const x = wkHp(R, m.u); return x.h > 0 && x.h < 1; })) return false; wkHeal(R, 1 / 3); }
  else if (k === 'see') { const g = wkNextGate(wkMap(R.w, R.ty), R.at < 0 ? -1 : wkMap(R.w, R.ty).nodes[R.at].r); if (!g || R.sc === g.id) return false; R.sc = g.id; }
  R.x.cp -= it.c; stamp(); save(); return true;
}
/* PYRAMID: veska som bare gjelder i løpet. Et bær gir WKBERRY av HP-en til en som står, en Revive reiser en som er slått ut med WKREVIVE. */
function wkFind(R, nd, lines) { if (!nd.f || !R.x || !R.x.bag) return; R.x.bag[nd.f] = (R.x.bag[nd.f] || 0) + 1; lines.push(nd.f === 'berry' ? 'You found a Sitrus Berry in the dark. It is in your Pyramid Bag.' : 'You found a Revive in the dark. It is in your Pyramid Bag.'); }
function wkUse(k, u) {
  const R = wkSt().run; if (!R || R.pend || !R.x || !R.x.bag || !(R.x.bag[k] > 0) || !S.party.includes(u)) return false;
  const c = wkHp(R, u);
  if (k === 'berry') { if (c.h <= 0 || c.h >= 1) return false; c.h = Math.min(1, c.h + WKBERRY); } else if (k === 'revive') { if (c.h > 0) return false; c.h = WKREVIVE; } else return false;
  R.x.bag[k]--; stamp(); save(); return true;
}
/* WORMHOLE: premien ved utgangen, ett trinn per sone som er klar (shm = shiny-sjansen ganget opp). Trinn 4 er en legendarisk annenhver gang. */
const WKEXIT = [null, { min: 2, luck: 2, shm: 2 }, { min: 3, luck: 2, shm: 3 }, { ids: PSEUDO, shm: 5 }, { ids: PSEUDO, shm: 8, leg: 0.5 }, { ids: PSEUDO, shm: 8, leg: 1 }];
const WKEXITN = ['Nothing yet', 'A rare Pokémon', 'An epic Pokémon', 'A pseudo-legendary Pokémon', 'A pseudo-legendary, or a legendary', 'A legendary Pokémon'];
function wkExitEnc(st) { const o = WKEXIT[st]; return o.leg && Math.random() < o.leg ? legEnc(o.shm) : genEnc(o.ids ? { ids: o.ids, shm: o.shm } : o); }
/* SHADOW SNAG: én ball, to fra WKBALL2 billetter. wkSnag tar imot tilbudet (S.wk.so): fangsten er formen du kan ha på ditt nivå, og den venter i
   S.wk.snag til WKPURE studiedager ETTER dagen den ble snappet har løftet skyggen (wkPure). Da blir den en vanlig Pokémon med merket pu og
   medfødte verdier på minst WKPUREIV. Ingen Shadow-form på laget, og ingenting å holde styr på imens (Jazz 16.11). */
const WKBALL2 = 4, WKPURE = 3, WKPUREIV = 15;
const wkSnagForm = id => { let x = id; while (reqLv(x) > refLv() && D(x)[4]) x = D(x)[4]; return x; };
function wkSnag() {
  const W = wkSt(), o = W.so, R = W.run; if (!o) return null;
  if (R && R.w === o.w) { if (!(R.x && R.x.balls > 0)) return null; R.x.balls--; }
  const e = genEnc({ ids: [wkSnagForm(o.id)] }), s = { id: e.id, lv: e.lv, sh: e.sh || 0, g: e.g, d: dayKey() };
  (W.snag = W.snag || []).push(s); W.so = null;
  if (R && R.w === o.w) (R.got.snag = R.got.snag || []).push(s.id); else if (W.last && W.last.w === o.w) (W.last.snag = W.last.snag || []).push(s.id);
  stamp(); save(); return s;
}
const wkPureLeft = s => { const d0 = wkDn(s.d); let n = 0; for (const k in S.log || {}) if (wkStudied(k) && wkDn(k) > d0) n++; return Math.max(0, WKPURE - n); };
function wkPure() {
  const W = S.wk; if (!W || !W.snag || !W.snag.length) return 0; let n = 0;
  W.snag = W.snag.filter(s => { if (wkPureLeft(s) > 0) return true; const m = addMon(s.id, s.lv, s.sh, 0, s.g); if (!m.sh) m.iv = m.iv.map(v => Math.max(v, WKPUREIV)); m.pu = 1; (W.pun = W.pun || []).push(m.u); n++; return false; });
  if (n) { stamp(); save(); } return n;
}

/* ---------- Hvelvet, Mints og Gold Bottle Cap (steg 1d.5) ----------
   HVELVET (P1, valgt 17.11): når løpet er over, venter én kiste per billett. Studiene gir antallet, spillet gir metallet: bronse, sølv når
   bossen i sone 3 er slått (Frontier Brain), gull etter gullkampen. Hver kiste har litt mynter (coin, ganger studiebonusen og vanskelighetsgraden
   fra løpet, som kampene: de store myntene ligger i selve løpet) og én ting
   trukket etter vektene i p. sure = det et sølv- eller gullhvelv alltid har minst én av. Du går aldri tomhendt: også et løp som ender i
   første rom, gir kistene sine i bronse. Mints og Gold Bottle Cap finnes bare her, og i alle ukestypene (Jazz 16.11).
   candy = Rare Candy (antallet etter metallet), balls = Ultra Balls, enc = et sjeldent møte, pseudo = en pseudo-legendarisk i gresset,
   tutor = et sjeldent angrep åpnes hos lærerne (er alle åpne: Rare Candy). */
const WKVN = ['Bronze', 'Silver', 'Gold'], WKVCANDY = [1, 2, 3];
/* PUNGEN (steg 1d.8): den første kista har i tillegg en fast sum (× studiebonusen og vanskelighetsgraden, som alt annet), så også et løp med én
   billett gir minst som en vanlig kampdag (Jazz: «minst like mange mynter som en vanlig kampdag»). Den er lik uansett billetter og metall:
   flere billetter gir flere kister og mer av kartet, ikke en større pung. Målt i NOTES.md (18. nov). */
const WKPURSE = 2500;
const WKV = [
  { coin: [70, 130], p: { candy: 30, balls: 24, enc: 26, stone: 12, mint: 8 } },
  { coin: [130, 210], p: { mint: 22, candy: 22, enc: 22, tutor: 14, mstone: 10, gcap: 6, stone: 4 }, sure: ['mint'] },
  { coin: [220, 340], p: { candy: 21, mint: 20, gcap: 15, tutor: 14, mstone: 12, pseudo: 10, enc: 8 }, sure: ['gcap', 'mint'] }
];
const wkVaultLeft = () => { const v = S.wk && S.wk.vault; return v ? Math.max(0, v.n - v.open.length) : 0; };
function wkChest() {
  const W = wkSt(), v = W.vault; if (!v || v.open.length >= v.n) return null;
  const C = WKV[v.m] || WKV[0], left = v.n - v.open.length, need = (C.sure || []).filter(k => !v.open.some(o => o.k === k));
  let k = need.length >= left ? need[0] : (() => { const ks = Object.keys(C.p); let x = Math.random() * ks.reduce((a, q) => a + C.p[q], 0); for (const q of ks) { x -= C.p[q]; if (x <= 0) return q; } return ks[0]; })();
  const o = { k, coins: Math.round((C.coin[0] + Math.random() * (C.coin[1] - C.coin[0])) * (v.cm || 1) / 10) * 10, items: [] };
  if (!v.open.length) { o.coins += Math.round(WKPURSE * (v.cm || 1) / 10) * 10; o.purse = 1; }
  const give = (it, n) => { if (n > 0 && SHOP[it]) { S.items[it] = (S.items[it] || 0) + n; o.items.push(`${n} × ${SHOP[it].n}`); } };
  const enc = q => { const e = genEnc(q); S.pend.push(e); trimPend(30); o.enc = { id: e.id, sh: e.sh || 0 }; };
  if (k === 'tutor') { const l = Object.keys(TUTNEED).map(mvIx).filter(x => x >= 0 && !tutOpen(x)); if (l.length) { const x = l[rnd(l.length)]; tutUnlock(x); o.mv = MOVES[x][0]; } else k = o.k = 'candy'; }
  if (k === 'candy') give('candy', Math.max(1, candyRoll(WKVCANDY[v.m])));
  else if (k === 'balls') give('ultra', 3); else if (k === 'stone') give('stone', 1); else if (k === 'mstone') give('mstone', 1);
  else if (k === 'mint') give('mint', 1); else if (k === 'gcap') give('gcap', 1);
  else if (k === 'enc') enc({ min: v.m ? 3 : 2, luck: 2 }); else if (k === 'pseudo') enc({ ids: PSEUDO });
  S.coins += o.coins; v.open.push(o); stamp(); save();
  return o;
}
/* MINT: bytter naturen til én Pokémon (den eneste måten; avtalt 15.11). GOLD BOTTLE CAP: hypertrener alle seks verdiene på én gang, uten mynter,
   fra nivået Hyper Training åpner på (HTLV; ønske 18). Ingen av dem kan brukes mens laget er låst i et løp. */
function wkMint(m, nat) { if (!m || locked() || !(S.items.mint > 0) || !(nat >= 0 && nat < NAT.length) || nat === m.nat) return false; m.nat = nat; S.items.mint--; save(); return true; }
const wkCapOk = m => !!m && htOk(m) && [0, 1, 2, 3, 4, 5].some(i => ivOf(m, i) < 31);
function wkCap(m) { if (!wkCapOk(m) || locked() || !(S.items.gcap > 0)) return false; m.ht = [1, 1, 1, 1, 1, 1]; S.items.gcap--; save(); return true; }

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
