'use strict';
/* Fokusdex – trenere, ligaen, Battle Factory og belønninger. Reglene for selve kampen ligger i battle.js, skjermene i bui.js.

   To moduser, begge åpnes med «Done for today» og står åpne til neste økt starter:
   - Ligaen: ditt eget lag mot trenere i fast, stigende rekkefølge. Gir XP og Rare Candy. Et tap stenger ligaen for dagen, og du beholder plassen.
   - Battle Factory: du leier 4 av 7 tilfeldige Pokémon og kan bytte til deg én fra hver trener du slår. Gir gjenstander og møter.
   Hver dag har én av modusene en bonus, så det lønner seg å veksle. */

/* Vanlige trenere: [navn, bilde, typer de helst bruker, arena]. Nesten halve laget hentes utenfor temaet, så lagene ikke blir ensformige. */
const TCLASS = [['Youngster', 'youngster', [0, 2, 6], 'field'], ['Lass', 'lass', [0, 17, 11], 'field'], ['Bug Catcher', 'bugcatcher|bugcatcher-gen4dp', [6, 11, 3], 'forest'], ['Hiker', 'hiker', [5, 4, 1], 'cave'],
  ['Swimmer', 'swimmer|swimmerm|swimmer-gen4', [10, 14], 'beach'], ['Bird Keeper', 'birdkeeper', [2, 0], 'field'], ['Black Belt', 'blackbelt', [1, 5], 'dojo'], ['Psychic', 'psychic', [13, 7], 'night'], ['Fisherman', 'fisherman', [10, 4], 'beach'],
  ['Scientist', 'scientist', [12, 8, 3], 'lab'], ['Team Rocket Grunt', 'rocketgrunt', [3, 16, 0], 'night'], ['Team Galactic Grunt', 'galacticgrunt', [3, 16, 6], 'night'], ['Team Plasma Grunt', 'plasmagrunt', [16, 3, 0], 'night']];
const TACE = [['Ace Trainer', 'acetrainer', [], 'field'], ['Ace Trainer', 'acetrainerf', [], 'field'], ['Veteran', 'veteran', [], 'cave'], ['Veteran', 'veteranf', [], 'field'],
  ['Pokémon Ranger', 'pokemonranger', [11, 10, 2], 'forest'], ['Dragon Tamer', 'dragontamer', [15, 9, 2], 'cave'], ['Battle Girl', 'battlegirl', [1, 5, 8], 'dojo']];
/* Bosser: [navn, bilde, tittel, type (gir farge på arenaen), lag med esset først]. */
const BOSS = [
  ['Brock', 'brock', 'Gym Leader', 5, [95, 76, 141, 139, 112, 142]], ['Misty', 'misty', 'Gym Leader', 10, [121, 55, 119, 134, 131, 130]], ['Lt. Surge', 'ltsurge', 'Gym Leader', 12, [26, 101, 82, 125, 135, 181]],
  ['Erika', 'erika', 'Gym Leader', 11, [45, 114, 71, 182, 103, 189]], ['Koga', 'koga', 'Gym Leader', 3, [110, 89, 49, 168, 73, 169]], ['Sabrina', 'sabrina', 'Gym Leader', 13, [65, 122, 97, 124, 80, 196]],
  ['Blaine', 'blaine', 'Gym Leader', 9, [59, 78, 126, 38, 219, 136]], ['Whitney', 'whitney', 'Gym Leader', 0, [241, 36, 40, 162, 203, 115]], ['Morty', 'morty', 'Gym Leader', 7, [94, 429, 426, 354, 477, 200]],
  ['Jasmine', 'jasmine', 'Gym Leader', 8, [208, 82, 227, 437, 306, 462]], ['Clair', 'clair', 'Gym Leader', 15, [230, 148, 334, 130, 142, 149]], ['Wattson', 'wattson', 'Gym Leader', 12, [310, 82, 101, 181, 135, 466]],
  ['Flannery', 'flannery', 'Gym Leader', 9, [324, 323, 219, 78, 38, 229]], ['Norman', 'norman', 'Gym Leader', 0, [289, 335, 264, 327, 128, 115]], ['Winona', 'winona', 'Gym Leader', 2, [334, 227, 279, 277, 357, 169]],
  ['Roark', 'roark', 'Gym Leader', 5, [409, 95, 76, 185, 142, 348]], ['Gardenia', 'gardenia', 'Gym Leader', 11, [407, 421, 389, 465, 357, 189]], ['Maylene', 'maylene', 'Gym Leader', 1, [448, 308, 68, 107, 106, 214]],
  ['Fantina', 'fantina', 'Gym Leader', 7, [429, 426, 94, 354, 442, 477]], ['Candice', 'candice', 'Gym Leader', 14, [478, 460, 461, 473, 124, 362]], ['Volkner', 'volkner', 'Gym Leader', 12, [405, 466, 26, 135, 181, 462]],
  ['Lenora', 'lenora', 'Gym Leader', 0, [505, 508, 531, 573, 626, 115]], ['Burgh', 'burgh', 'Gym Leader', 6, [542, 545, 558, 589, 617, 212]], ['Elesa', 'elesa', 'Gym Leader', 12, [523, 587, 596, 604, 181, 310]],
  ['Clay', 'clay', 'Gym Leader', 4, [530, 553, 537, 623, 450, 232]], ['Skyla', 'skyla', 'Gym Leader', 2, [581, 521, 528, 561, 567, 630]], ['Brycen', 'brycen', 'Gym Leader', 14, [614, 615, 584, 461, 473, 362]],
  ['Drayden', 'drayden', 'Gym Leader', 15, [612, 621, 611, 334, 373, 149]], ['Roxie', 'roxie', 'Gym Leader', 3, [545, 569, 110, 169, 452, 544]], ['Marlon', 'marlon', 'Gym Leader', 10, [565, 593, 594, 537, 130, 73]],
  ['Lorelei', 'lorelei-gen3|lorelei|lorelei-lgpe', 'Elite Four', 14, [131, 87, 91, 124, 80, 473]], ['Bruno', 'bruno', 'Elite Four', 1, [68, 106, 107, 95, 237, 448]], ['Agatha', 'agatha-gen3|agatha|agatha-lgpe', 'Elite Four', 7, [94, 93, 169, 24, 429, 42]],
  ['Karen', 'karen', 'Elite Four', 16, [197, 229, 94, 45, 461, 430]], ['Flint', 'flint', 'Elite Four', 9, [392, 467, 78, 229, 136, 59]], ['Lucian', 'lucian', 'Elite Four', 13, [437, 65, 122, 196, 203, 308]],
  ['Shauntal', 'shauntal', 'Elite Four', 7, [609, 623, 563, 593, 426, 354]], ['Grimsley', 'grimsley', 'Elite Four', 16, [625, 560, 510, 553, 461, 430]], ['Caitlin', 'caitlin', 'Elite Four', 13, [579, 576, 518, 561, 475, 376]],
  ['Marshal', 'marshal', 'Elite Four', 1, [534, 620, 538, 539, 448, 68]]];
const TOPB = [
  ['Lance', 'lance', 'Champion', 15, [149, 130, 142, 6, 230, 373]], ['Steven', 'steven', 'Champion', 8, [376, 227, 306, 344, 346, 348]], ['Wallace', 'wallace', 'Champion', 10, [350, 130, 73, 272, 340, 321]],
  ['Alder', 'alder', 'Champion', 6, [637, 626, 621, 617, 589, 584]], ['Iris', 'iris', 'Champion', 15, [612, 635, 621, 567, 306, 131]],
  ['Blue', 'blue', 'Rival', 0, [18, 65, 112, 130, 59, 103]], ['Silver', 'silver', 'Rival', 16, [160, 215, 169, 82, 94, 65]], ['Barry', 'barry', 'Rival', 10, [395, 398, 214, 78, 407, 143]], ['Hugh', 'hugh', 'Rival', 9, [500, 521, 512, 626, 330, 604]],
  ['Cheren', 'cheren', 'Rival', 0, [508, 521, 510, 512, 573, 628]], ['Bianca', 'bianca', 'Rival', 13, [518, 508, 516, 609, 591, 500]], ['Wally', 'wally|wally-rse', 'Rival', 13, [282, 334, 301, 315, 82, 475]],
  ['Giovanni', 'giovanni', 'Team Rocket Boss', 4, [34, 31, 112, 53, 115, 51]], ['Cyrus', 'cyrus', 'Team Galactic Boss', 16, [461, 430, 169, 130, 229, 462]], ['Ghetsis', 'ghetsis', 'Team Plasma', 16, [635, 563, 537, 626, 604, 625]],
  ['Colress', 'colress', 'Team Plasma', 8, [462, 601, 376, 606, 604, 474]], ['Archie', 'archie-gen3|archie', 'Team Aqua Boss', 10, [319, 262, 169, 89, 342, 321]], ['Maxie', 'maxie-gen3|maxie', 'Team Magma Boss', 4, [323, 262, 169, 110, 324, 229]]];
/* De aller sjeldneste. Legendariske på laget kan ikke byttes til seg. */
const ULTRA = [['Red', 'red', 'Legendary Trainer', 12, [25, 3, 6, 9, 143, 131]], ['Cynthia', 'cynthia', 'Sinnoh Champion', 15, [445, 442, 448, 350, 407, 468]], ['N', 'n', 'King of Team Plasma', 15, [644, 571, 567, 565, 584, 601]]];
const POOL = { reg: TCLASS, ace: TACE, gym: BOSS.filter(b => b[2] === 'Gym Leader'), rival: TOPB.filter(b => b[2] === 'Rival'), e4: BOSS.filter(b => b[2] === 'Elite Four'),
  evil: TOPB.filter(b => /^Team/.test(b[2])), champ: TOPB.filter(b => b[2] === 'Champion'), legend: ULTRA };

/* Ligaens nivåer i fast rekkefølge. c = antall kamper, mons = antall Pokémon (fra–til gjennom nivået), rel = nivå i forhold til laget ditt,
   flo = laveste nivå uansett (så du ikke kan pløye deg gjennom uten å trene), sk = hvor godt de spiller, iv/ev = hvor godt oppdrettet laget er,
   q = hvor gjennomtenkte angrepene er, coin = mynter (× studiebonus), xp = XP-faktor, slack = hvor tidlig bosser får utvikle. */
const STAGES = [
  { k: 'reg', n: 'Trainers', c: 4, mons: [3, 3], rel: [0.86, 0.92], flo: [6, 10], sk: 0.45, iv: 4, ev: 0, q: 0, coin: 22, xp: 1 },
  { k: 'ace', n: 'Ace Trainers', c: 3, mons: [4, 4], rel: [0.93, 0.96], flo: [13, 17], sk: 0.66, iv: 10, ev: 0, q: 1, coin: 38, xp: 1.15 },
  { k: 'gym', n: 'Gym Leaders', c: 4, mons: [4, 5], rel: [0.97, 1], flo: [19, 26], sk: 0.8, iv: 14, ev: 16, q: 1, coin: 70, xp: 1.3, slack: 3 },
  { k: 'rival', n: 'Rivals', c: 2, mons: [5, 5], rel: [1, 1.02], flo: [27, 29], sk: 0.86, iv: 18, ev: 24, q: 2, coin: 95, xp: 1.4, slack: 4 },
  { k: 'e4', n: 'Elite Four', c: 4, mons: [5, 6], rel: [1.01, 1.03], flo: [32, 39], sk: 0.92, iv: 21, ev: 32, q: 2, coin: 125, xp: 1.5, slack: 6 },
  { k: 'evil', n: 'Team Bosses', c: 2, mons: [6, 6], rel: [1.02, 1.03], flo: [41, 44], sk: 0.95, iv: 24, ev: 44, q: 2, coin: 155, xp: 1.6, slack: 6 },
  { k: 'champ', n: 'Champion', c: 1, mons: [6, 6], rel: [1.04, 1.04], flo: [48, 48], sk: 1, iv: 27, ev: 60, q: 2, coin: 260, xp: 1.8, slack: 8 },
  { k: 'legend', n: 'Legendary Trainer', c: 1, mons: [6, 6], rel: [1.05, 1.05], flo: [54, 54], sk: 1, iv: 31, ev: 72, q: 2, coin: 500, xp: 2.2, slack: 10 }];
const LAPN = STAGES.slice(0, 7).reduce((a, s) => a + s.c, 0);
const SUPER = new Set(['e4', 'evil', 'champ', 'legend']);
/* Hvor i ligaen kamp nummer n (0-basert i runden) ligger. f går fra 0 til 1 gjennom nivået. */
function rungInfo(n) {
  let k = n;
  for (let i = 0; i < 7; i++) { const st = STAGES[i]; if (k < st.c) return { si: i, st, k, f: st.c > 1 ? k / (st.c - 1) : 1 }; k -= st.c; }
  return { si: 7, st: STAGES[7], k: 0, f: 1 };
}

/* Belønninger følger fokustiden den dagen kampene ble åpnet: ×0,5 uten studering, ×2,0 ved fem timer. XP svinger mindre. */
const ladMin = () => S.lad.day ? ((S.log[S.lad.day] || {}).m || 0) : todayMin();
const studyMult = () => Math.round((0.5 + Math.min(1.5, ladMin() / 300 * 1.5)) * 10) / 10;
const xpMult = () => 0.8 + Math.min(0.4, ladMin() / 300 * 0.4);
const ladLost = () => !!S.lad.lost && S.lad.lost === (S.lad.day || dayKey());
const ladderOpen = () => !!S.lad.day && !ladLost();
const facLost = () => !!S.fac.lost && S.fac.lost === (S.lad.day || dayKey());
const facOpen = () => !!S.lad.day && !facLost();
/* Dagens bonus: datoen avgjør hvilken modus som gir ekstra, likt for alle som spiller. */
function dayBoost() {
  const d = S.lad.day || dayKey(); let h = 7;
  for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
  return { mode: (h >>> 3) % 2 ? 'league' : 'factory', m: 1.5, xp: 1.3 };
}

/* ---------- Lagbygging ---------- */
/* Går ned til en tidligere form hvis nivået er for lavt for arten (slack = hvor mye for tidlig bosser får utvikle). */
function fitForm(id, lv, slack) { while (stageOf(id) > 0 && lv < reqLv(id) - slack && !(D(D(id)[4])[6] & 4)) id = D(id)[4]; return id; }
/* Angrepene til en motstander. q = 0: de fire nyeste. q = 1: beste angrep per type pluss ett nyttig statusangrep. q = 2: som 1, og kan angrep fra litt høyere nivå. */
function foeMoves(id, lv, q) {
  const all = movesAt(id, lv + (q >= 2 ? 8 : 0)).filter(x => !DEADMV.has(x));
  if (!q || all.length <= 4) return defaultMoves(id, lv);
  const d = D(id), st = BST[id - 1], phys = st[1] >= st[3];
  const val = x => {
    const m = MOVES[x]; let p = (m[2] || (FIXED[m[0]] ? 45 : 60)) * (m[3] ? m[3] / 100 : 1) * (m[13] ? 3 : 1);
    if (CHARGE[m[0]] || RECHARGE.has(m[0])) p *= 0.55;
    if (BOOM.has(m[0]) || ['Dream Eater', 'Focus Punch', 'Last Resort', 'Fake Out', 'Snore', 'Synchronoise', 'Final Gambit', 'Counter', 'Mirror Coat', 'Metal Burst', 'Endeavor'].includes(m[0])) p *= 0.3;
    if (m[9] < 0) p *= 0.9; if (m[6] === 9) p = 30;
    return p * (((m[4] === 1) === phys) ? 1 : 0.7) * (m[1] === d[1] || m[1] === d[2] ? 1.5 : 1);
  };
  const sval = x => {
    const m = MOVES[x], n = m[0];
    if (m[6] === 1) return m[7] === 2 ? 9 : m[7] === 1 || m[7] === 4 || n === 'Toxic' || m[7] === 18 ? 7 : m[7] === 5 || m[7] === 6 || m[7] === 14 ? 5 : 2;
    if (m[6] === 3 || n === 'Rest') return 6;
    if (m[12].length && m[17] === 1) return m[12].reduce((a, s) => a + Math.max(0, s[1]), 0) >= 2 ? 7 : 4;
    if (['Reflect', 'Light Screen', 'Stealth Rock', 'Substitute', 'Protect', 'Rain Dance', 'Sunny Day', 'Sandstorm', 'Hail', 'Taunt', 'Roar', 'Whirlwind'].includes(n)) return 5;
    return m[12].length ? 2 : UM[n] ? 2 : 0;
  };
  const dmg = all.filter(x => MOVES[x][4] > 0).sort((a, b) => val(b) - val(a)), stat = all.filter(x => MOVES[x][4] === 0).sort((a, b) => sval(b) - sval(a)), pick = [], tys = new Set();
  for (const x of dmg) { if (pick.length >= 3) break; if (tys.has(MOVES[x][1])) continue; pick.push(x); tys.add(MOVES[x][1]); }
  if (stat.length && sval(stat[0]) >= 4) pick.push(stat[0]);
  for (const x of dmg) { if (pick.length >= 4) break; if (!pick.includes(x)) pick.push(x); }
  for (const x of stat) { if (pick.length >= 4) break; if (!pick.includes(x)) pick.push(x); }
  return pick.slice(0, 4);
}
function foeMon(id, lv, st) {
  return { id, lv, sh: 0, iv: Array.from({ length: 6 }, () => Math.min(31, st.iv + rnd(32 - st.iv))), ev: Array.from({ length: 6 }, () => st.ev), nat: rnd(25), mv: foeMoves(id, lv, st.q) };
}
/* Nivået ligaen måler seg mot: snittet av de tre sterkeste på laget ditt. */
function leagueLv() { const p = S.party.map(monBy).filter(Boolean).map(m => m.lv).sort((a, b) => b - a).slice(0, 3); return p.length ? p.reduce((a, b) => a + b, 0) / p.length : 5; }
function rungLv(ri, lap) {
  const st = ri.st, mix = a => a[0] + (a[1] - a[0]) * ri.f;
  return Math.min(100, Math.max(Math.round(mix(st.flo) + 12 * lap), Math.round(leagueLv() * (mix(st.rel) + Math.min(0.12, 0.03 * lap)))));
}
/* Vanlig trener: n forskjellige arter med ulike hovedtyper der det går, utviklet så langt nivået tillater. */
function regTeam(cls, n, base, st) {
  const theme = cls[2], out = [], used = new Set(), tys = new Set();
  for (let k = 0; k < n; k++) {
    const any = !theme.length || (k > 0 && Math.random() < 0.45);
    let p = [];
    for (let id = 1; id <= 649; id++) { const d = D(id); if (isLeg(id) || stageOf(id) || (d[6] & 4) || used.has(id)) continue; if (!any && !theme.includes(d[1]) && !theme.includes(d[2])) continue; p.push(id); }
    const fresh = p.filter(id => !tys.has(D(id)[1])); if (fresh.length) p = fresh;
    let id = p[rnd(p.length)]; used.add(id);
    const lv = Math.max(2, base - (k < n - 1 ? 1 + rnd(2) : 0));
    for (let nx = EVO[id]; nx && nx.length; nx = EVO[id]) { const to = nx[rnd(nx.length)]; if (lv < reqLv(to) + (st.q ? 0 : 2)) break; id = to; }
    tys.add(D(id)[1]);
    out.push(foeMon(id, lv, st));
  }
  return out;
}
/* Boss: de n − 1 første fra laget, og esset til slutt på høyeste nivå. */
function bossTeam(d, n, base, st) {
  const ids = d[4].slice(1, n).concat(d[4][0]);
  return ids.map((id, k) => { const ace = k === ids.length - 1, lv = Math.max(3, Math.min(100, base + (ace ? 1 : -1 - rnd(2)))); return foeMon(fitForm(id, lv, st.slack || 0), lv, st); });
}

/* ---------- Ligaen ---------- */
/* Hvem som venter. Lagres, så den samme treneren står der til du har slått den. Ingen møtes to ganger i samme runde. */
function nextTrainer() {
  const L = S.lad;
  if (L.next && L.next.n === L.n && L.next.lap === L.lap && POOL[L.next.st] && POOL[L.next.st][L.next.i]) return L.next;
  const ri = rungInfo(L.n), pool = POOL[ri.st.k];
  let c = pool.map((_, i) => i).filter(i => !(L.seen || []).includes(ri.st.k + i));
  if (!c.length) c = pool.map((_, i) => i);
  L.next = { n: L.n, lap: L.lap, st: ri.st.k, i: c[rnd(c.length)] };
  return L.next;
}
function trainerInfo(t) {
  const d = POOL[t.st][t.i], st = STAGES.find(s => s.k === t.st), boss = t.st !== 'reg' && t.st !== 'ace';
  return { n: d[0], img: d[1], title: boss ? d[2] : '', ty: boss ? d[3] : (d[2][0] == null ? 0 : d[2][0]), kind: t.st, skill: st.sk, boss, arena: boss ? 'hall' : d[3], v: t.i % 3 };
}
/* lead = den som skal gå ut først (velges på oppstillingen før kampen). Resten følger rekkefølgen på laget. */
function newBattle(lead) {
  const t = nextTrainer(), ri = rungInfo(t.n), st = ri.st, d = POOL[st.k][t.i], tr = trainerInfo(t);
  const party = S.party.map(monBy).filter(Boolean); party.sort((a, b) => (b.u === lead) - (a.u === lead));
  const base = rungLv(ri, S.lad.lap), n = Math.round(st.mons[0] + (st.mons[1] - st.mons[0]) * ri.f);
  const foes = tr.boss ? bossTeam(d, n, base, st) : regTeam(d, n, base, st);
  return mkBattle(party, foes, tr, { mode: 'league', st, si: ri.si, rk: ri.k, lap: S.lad.lap, ti: t.i, xm: xpMult(), sm: studyMult(), boost: dayBoost() });
}
/* XP til hele laget etter kampen. Alle får som om de hadde kjempet selv, men litt mindre enn før. Sterkere motstandere og høyere liganivå gir mer,
   og de som ligger under motstanderens nivå får mer enn de som ligger over (som i Black og White). */
function battleXp(B) {
  const bm = B.boost.mode === 'league' ? B.boost.xp : 1;
  return B.me.map(b => {
    let x = 0;
    for (const k of B.kos) x += bstSum(k.id) / 8 * k.lv / 7 * Math.max(0.35, Math.min(2.2, Math.pow((2 * k.lv + 10) / (k.lv + b.lv + 10), 2.5)));
    return Math.round(x * 0.35 * B.st.xp * B.xm * bm);
  });
}
function grantXp(B, res) {
  const xs = battleXp(B);
  B.me.forEach((b, i) => {
    const m = b.src, x = xs[i]; if (!x || !m.u) return;
    const l0 = m.lv, x0 = m.xp; m.xp += x; m.lv = lvOf(m.xp);
    res.ups.push(Object.assign({ u: m.u, xp: x, l0, l1: m.lv, x0 }, m.lv > l0 ? learnUp(m, l0) : {}));
  });
}
const pushEnc = (res, e) => { S.pend.push(e); if (S.pend.length > 15) S.pend.splice(0, S.pend.length - 15); res.encs.push(e); };
/* Ligakampen er over: XP til laget (også ved tap), og ved seier mynter, gjenstander, møter og noen ganger et byttetilbud. */
function finishLeague(B) {
  const win = B.over === 'win', L = S.lad, st = B.st, k = st.k, res = { mode: 'league', win, ups: [], items: [], encs: [], coins: 0, trade: null, perk: '', kind: k, lapDone: false, legend: false };
  grantXp(B, res);
  if (win) {
    const sm = B.sm, bm = B.boost.mode === 'league', give = (it, n) => { if (n > 0) { S.items[it] += n; res.items.push(`${n} × ${SHOP[it].n}`); } };
    res.coins = Math.round(st.coin * sm * (1 + 0.25 * B.lap)) + B.pay; S.coins += res.coins;
    give('candy', ({ reg: 0, ace: Math.random() < 0.2 * sm ? 1 : 0, gym: 1, rival: 1, e4: 1 + (Math.random() < 0.5 ? 1 : 0), evil: 2, champ: 3, legend: 5 })[k] + (bm && B.tr.boss && Math.random() < 0.5 ? 1 : 0));
    if (k === 'reg' && Math.random() < 0.3) give('poke', 1 + (sm >= 1.5 ? 1 : 0));
    if (k === 'ace' && Math.random() < 0.4) give('great', 1);
    if (k === 'e4' || k === 'evil') give('ultra', 1);
    if (k === 'champ') { give('ultra', 3); give('stone', 1); S.boost = { n: 3, m: 1.5 }; res.perk = 'Your next 3 focus sessions give 1.5× coins.'; }
    if (k === 'legend') { give('ultra', 5); give('stone', 2); S.boost = { n: 5, m: 2 }; res.perk = 'Your next 5 focus sessions give 2× coins.'; }
    if (B.tr.boss) pushEnc(res, genEnc({ ty: [B.tr.ty], min: k === 'gym' ? 2 : 3, luck: 1.5 }));
    if (k === 'champ') pushEnc(res, genEnc({ min: 3, luck: 1.5 }));
    if (k === 'legend') pushEnc(res, genEnc({ leg: 1 }));
    /* Byttetilbud: tilfeldig, ikke hver gang. Den du får, er på ditt nivå og i den formen nivået tillater. */
    if (B.tr.boss && Math.random() < 0.3) {
      const cap = refLv();
      res.trade = B.foe.filter(f => !isLeg(f.id)).map(f => { const lv = Math.min(f.lv, cap); return { id: fitForm(f.id, lv, 0), lv, iv: f.src.iv.slice(), nat: f.src.nat }; });
      if (!res.trade.length) res.trade = null;
    }
    L.best = (L.best || 0) + 1; (L.seen = L.seen || []).push(k + B.ti); L.next = null;
    if (k === 'legend') { L.lap++; L.n = 0; L.seen = []; res.lapDone = true; }
    else if (++L.n >= LAPN) {
      /* Etter mesteren: en sjelden gang venter en legendarisk trener. Sjansen øker for hver runde. */
      if (Math.random() < Math.min(1, 0.25 + 0.25 * L.lap)) res.legend = true;
      else { L.lap++; L.n = 0; L.seen = []; res.lapDone = true; }
    }
  } else L.lost = L.day || dayKey();
  save();
  return res;
}
/* Bytte etter en boss: du gir fra deg en fra laget og får en av deres. Sier du nei, får du et møte i stedet. */
function doTrade(x, mine) {
  const i = S.party.indexOf(mine.u);
  S.mons = S.mons.filter(m => m !== mine); S.party = S.party.filter(u => u !== mine.u);
  const m = addMon(x.id, x.lv, 0); m.iv = x.iv; m.nat = x.nat;
  S.party = S.party.filter(u => u !== m.u); S.party.splice(i < 0 ? S.party.length : i, 0, m.u);
  save();
  return m;
}

/* ---------- Battle Factory ---------- */
/* Nivå og styrke på leie-Pokémonene stiger for hver runde på sju kamper. */
const FACLV = r => [30, 40, 50][Math.min(2, r - 1)];
const FACBST = r => [[280, 430], [380, 490], [440, 540], [480, 600]][Math.min(3, r - 1)];
/* d flytter styrken opp eller ned: de første motstanderne i en runde er svakere enn det du leier, fabrikksjefen sterkere. */
function facMon(r, used, d) {
  const [a, b] = FACBST(r), lv = FACLV(r), pool = [];
  for (let id = 1; id <= 649; id++) { if (isLeg(id) || used.has(id) || (D(id)[6] & 4)) continue; const s = bstSum(id); if (s >= a + d && s <= b + d && reqLv(id) <= lv + 12) pool.push(id); }
  const id = pool[rnd(pool.length)]; used.add(id);
  return { id, lv, sh: 0, iv: Array.from({ length: 6 }, () => Math.max(0, Math.min(31, 4 * r + Math.round(d / 5) + 6 + rnd(14)))), ev: [0, 0, 0, 0, 0, 0], nat: rnd(25), mv: foeMoves(id, lv, 1) };
}
function facOffer(r) { const used = new Set(); return Array.from({ length: 7 }, () => facMon(r, used, 0)); }
function facStart() { S.fac.run = { round: 1, w: 0, streak: 0, offer: facOffer(1), team: null, foe: null }; save(); }
function facPick(idx) { const R = S.fac.run; R.team = idx.map(i => R.offer[i]); R.offer = null; R.foe = null; save(); }
/* Neste motstander i fabrikken. Den sjuende i hver runde er fabrikksjefen med et sterkere lag. */
function facFoe() {
  const R = S.fac.run;
  if (R.foe) return R.foe;
  const head = R.w === 6, used = new Set(R.team.map(m => m.id)), list = TCLASS.concat(TACE), ci = rnd(list.length);
  const d = head ? 30 : [-70, -55, -40, -25, -10, 0][R.w], team = Array.from({ length: 4 }, () => facMon(R.round, used, d)), cnt = {};
  team.forEach(m => { const t = D(m.id)[1]; cnt[t] = (cnt[t] || 0) + 1; });
  R.foe = { head, ci, team, hint: +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] };
  save();
  return R.foe;
}
function facInfo(f) {
  const R = S.fac.run, d = TCLASS.concat(TACE)[f.ci];
  return f.head ? { n: 'Thorton', img: 'thorton', title: 'Factory Head', ty: 8, kind: 'fachead', skill: 1, boss: true, arena: 'factory', v: 0 }
    : { n: d[0], img: d[1], title: '', ty: f.hint, kind: 'fac', skill: Math.min(0.95, 0.3 + 0.1 * R.round + 0.06 * R.w), boss: false, arena: 'factory', v: 0 };
}
function facBattle() {
  const R = S.fac.run, f = facFoe();
  return mkBattle(R.team, f.team, facInfo(f), { mode: 'fac', round: R.round, w: R.w, sm: studyMult(), boost: dayBoost() });
}
/* Fabrikken gir gjenstander og møter, ikke XP (Pokémonene er leid). Et tap avslutter rekken og stenger fabrikken for dagen. */
function finishFactory(B) {
  const R = S.fac.run, win = B.over === 'win', res = { mode: 'fac', win, ups: [], items: [], encs: [], coins: 0, round: R.round, w: R.w, swap: null, roundDone: false, streak: R.streak };
  if (!win) { S.fac.best = Math.max(S.fac.best || 0, R.streak); S.fac.lost = S.lad.day || dayKey(); S.fac.run = null; save(); return res; }
  const sm = B.sm, bm = B.boost.mode === 'factory' ? B.boost.m : 1, r = R.round, roll = p => Math.random() < p * bm;
  const give = (it, n) => { if (n > 0) { S.items[it] += n; res.items.push(`${n} × ${SHOP[it].n}`); } };
  R.w++; R.streak++; res.w = R.w; res.streak = R.streak; S.fac.best = Math.max(S.fac.best || 0, R.streak);
  res.coins = Math.round((8 + 3 * R.w + 6 * (r - 1)) * sm) + B.pay; S.coins += res.coins;
  if (roll(0.4)) give(r >= 3 ? 'ultra' : r >= 2 ? 'great' : 'poke', r >= 2 ? 1 : 2);
  if (R.w === 3) pushEnc(res, genEnc({ min: 1, luck: 1 }));
  if (R.w === 5) { give('great', 2); if (!S.incOn) { S.incOn = 1; res.items.push('Incense for your next session'); } if (roll(0.5)) pushEnc(res, genEnc({ min: 2, luck: 1.2 })); }
  if (R.w >= 7) {
    pushEnc(res, genEnc({ min: r >= 2 ? 3 : 2, luck: 1.5 })); pushEnc(res, genEnc({ min: 2, luck: 1.5 }));
    give('ultra', r >= 2 ? 2 : 1); give(Math.random() < 0.5 ? 'stone' : 'candy', 1);
    if (r >= 2 && S.eggs.length < 3 && roll(0.5)) { S.eggs.push({ need: 120, got: 0 }); res.items.push('1 × Egg'); }
    if (r >= 3 && roll(0.12)) pushEnc(res, genEnc({ leg: 1 }));
    res.roundDone = true; R.round++; R.w = 0; R.team = null; R.offer = facOffer(R.round);
  } else res.swap = B.foe.map(f => f.src);
  R.foe = null;
  save();
  return res;
}
/* Bytt en av dine leide mot en fra laget du nettopp slo. */
function facSwap(mine, theirs) { const R = S.fac.run; if (R && R.team && R.team[mine] && theirs) { R.team[mine] = theirs; save(); } }
