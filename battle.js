'use strict';
/* Fokusdex – kampmotoren: reglene for en kamp, uten skjerm.
   Motoren endrer kampens tilstand med en gang og gir tilbake en liste hendelser som skjermen (bui.js) spiller av i rekkefølge.
   Trenere, ligaen og Battle Frontier ligger i league.js. XP deles ut etter kampen, ikke underveis. */

/* Typetabellen (med Fairy). For hver angrepstype: supereffektivt mot / lite effektivt mot / ingen effekt på. */
const TCH = { normal: '/rock steel/ghost', fighting: 'normal rock steel ice dark/flying poison bug psychic fairy/ghost', flying: 'fighting bug grass/rock steel electric/', poison: 'grass fairy/poison ground rock ghost/steel',
  ground: 'poison rock steel fire electric/bug grass/flying', rock: 'flying bug fire ice/fighting ground steel/', bug: 'grass psychic dark/fighting flying poison ghost steel fire fairy/', ghost: 'ghost psychic/dark/normal',
  steel: 'rock ice fairy/steel fire water electric/', fire: 'bug steel grass ice/rock fire water dragon/', water: 'ground rock fire/water grass dragon/', grass: 'ground rock water/flying poison bug steel fire grass dragon/',
  electric: 'flying water/grass electric dragon/ground', psychic: 'fighting poison/steel psychic/dark', ice: 'flying ground grass dragon/steel fire water ice/', dragon: 'dragon/steel/fairy', dark: 'ghost psychic/fighting dark fairy/', fairy: 'fighting dragon dark/poison steel fire/' };
const CH = TYPES.map(t => { const row = TYPES.map(() => 1); TCH[t].split('/').forEach((l, k) => l.split(' ').filter(Boolean).forEach(x => { row[TYPES.indexOf(x)] = [2, 0.5, 0][k]; })); return row; });
/* GRAV settes for hver runde: under Gravity treffer Ground-angrep også de som flyr eller svever. */
let GRAV = 0;
const typeEff = (t, b) => {
  const V = b.v || {}, gr = GRAV || V.smack;
  if (t === 4 && !gr && (V.mag || V.tele)) return 0;
  const one = x => { const c = CH[t][x]; if (c) return c; return (t === 4 && x === 2 && gr) || (V.fore === 1 && x === 7 && (t === 0 || t === 1)) || (V.fore === 2 && x === 16 && t === 13) ? 1 : 0; };
  /* Roost: flygetypen er borte resten av runden (en ren Flying-type står da uten type). */
  const ty = V.roost ? b.ty.map(x => x === 2 ? -1 : x) : b.ty;
  return (ty[0] >= 0 ? one(ty[0]) : 1) * (ty[1] >= 0 && ty[1] !== ty[0] ? one(ty[1]) : 1);
};
const stgM = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const accM = s => s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
const clampS = v => Math.max(-6, Math.min(6, v));
const Z8 = () => [0, 0, 0, 0, 0, 0, 0, 0];
const STN = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed', 'accuracy', 'evasiveness'];
const AIL = { 1: 'par', 2: 'slp', 3: 'frz', 4: 'brn', 5: 'psn' };
const AILTXT = { par: 'is paralyzed! It may be unable to move!', slp: 'fell asleep!', frz: 'was frozen solid!', brn: 'was burned!', psn: 'was poisoned!' };
const RECHARGE = new Set(['Hyper Beam', 'Giga Impact', 'Blast Burn', 'Frenzy Plant', 'Hydro Cannon', 'Rock Wrecker', 'Roar of Time']), BOOM = new Set(['Explosion', 'Self-Destruct']);
/* To-runders angrep: [tekst i første runde, 1 = utenfor rekkevidde mens den lader]. */
const CHARGE = { 'Fly': ['flew up high!', 1], 'Dig': ['burrowed its way under the ground!', 1], 'Bounce': ['sprang up!', 1], 'Dive': ['hid underwater!', 1], 'Shadow Force': ['vanished instantly!', 1],
  'Sky Drop': ['took its foe into the sky!', 1],
  'Solar Beam': ['absorbed light!', 0], 'Skull Bash': ['tucked in its head!', 0], 'Razor Wind': ['whipped up a whirlwind!', 0], 'Sky Attack': ['became cloaked in a harsh light!', 0] };
/* Den som er utenfor rekkevidde (i lufta, under jorda eller under vann), kan likevel treffes av noen få angrep, og da med dobbel styrke for dem i AWAY2. */
const AIRHIT = ['Gust', 'Twister', 'Thunder', 'Hurricane', 'Sky Uppercut', 'Smack Down'];
const AWAYHIT = { 'Fly': AIRHIT, 'Bounce': AIRHIT, 'Sky Drop': AIRHIT, 'Dig': ['Earthquake', 'Magnitude', 'Fissure'], 'Dive': ['Whirlpool'] }, AWAY2 = new Set(['Gust', 'Twister', 'Earthquake', 'Magnitude', 'Whirlpool']);
const awayMv = b => b.v.away && b.v.lock && b.mv[b.v.lock.k] ? MOVES[b.mv[b.v.lock.k].i][0] : '';
const reaches = (m, t) => (AWAYHIT[awayMv(t)] || []).includes(m[0]);
/* Angrep som tiner brukeren, og angrep som slår dobbelt og aldri bommer mot en som har brukt Minimize. */
const DEFROST = new Set(['Flame Wheel', 'Sacred Fire', 'Flare Blitz', 'Scald', 'Fusion Flare']), STOMP = new Set(['Stomp', 'Steamroller', 'Body Slam', 'Dragon Rush', 'Heavy Slam', 'Heat Crash']);
/* Låser brukeren: raseri i 2–3 runder (så forvirring), rulling i opptil fem runder med doblet styrke per treff, og angrep som dobles når de gjentas. */
const RAGE = new Set(['Outrage', 'Thrash', 'Petal Dance']), ROLL = new Set(['Rollout', 'Ice Ball']), CHAIN = new Set(['Fury Cutter', 'Echoed Voice']);
const WXTXT = { rain: ['It started to rain!', 'The rain stopped.'], sun: ['The sunlight turned harsh!', 'The harsh sunlight faded.'], sand: ['A sandstorm kicked up!', 'The sandstorm subsided.'], hail: ['It started to hail!', 'The hail stopped.'] };
const STRUGGLE = ['Struggle', 0, 50, 0, 1, 0, 0, 0, 0, -25, 0, 0, [], 0, 0, 0, 0, 0, 1];
const bstSum = id => BST[id - 1].reduce((a, c) => a + c, 0);
/* Angrep med fast skade. 0 betyr at angrepet slår feil. */
const FIXED = { 'Dragon Rage': () => 40, 'Sonic Boom': () => 20, 'Seismic Toss': u => u.lv, 'Night Shade': u => u.lv, 'Super Fang': (u, t) => Math.max(1, Math.floor(t.hp / 2)),
  'Psywave': u => Math.max(1, Math.floor(u.lv * (0.5 + Math.random()))), 'Endeavor': (u, t) => Math.max(0, t.hp - u.hp), 'Final Gambit': u => u.hp,
  'Counter': u => u.v.hit && u.v.hit.p === 1 ? u.v.hit.d * 2 : 0, 'Mirror Coat': u => u.v.hit && u.v.hit.p === 2 ? u.v.hit.d * 2 : 0, 'Metal Burst': u => u.v.hit ? Math.floor(u.v.hit.d * 1.5) : 0 };
/* Angrep der styrken regnes ut i kampen. Vekt finnes ikke i dataene, så tunge arter leses av samlet base stat. */
const hpPow = u => { const f = u.hp / u.max; return f < 0.042 ? 200 : f < 0.105 ? 150 : f < 0.21 ? 100 : f < 0.355 ? 80 : f < 0.69 ? 40 : 20; };
const wPow = (u, t) => { const s = bstSum(t.id); return s < 330 ? 40 : s < 430 ? 60 : s < 510 ? 80 : 100; };
const VPOW = { 'Flail': hpPow, 'Reversal': hpPow, 'Low Kick': wPow, 'Grass Knot': wPow, 'Heavy Slam': () => 80, 'Heat Crash': () => 80, 'Return': () => 102, 'Frustration': () => 60,
  'Electro Ball': (u, t, B) => { const r = spdB(B, u) / Math.max(1, spdB(B, t)); return r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : 60; },
  'Gyro Ball': (u, t, B) => Math.max(1, Math.min(150, Math.floor(25 * spdB(B, t) / Math.max(1, spdB(B, u))))),
  'Wring Out': (u, t) => 1 + Math.floor(120 * t.hp / t.max), 'Crush Grip': (u, t) => 1 + Math.floor(120 * t.hp / t.max),
  'Punishment': (u, t) => Math.min(200, 60 + 20 * t.sg.reduce((a, b) => a + Math.max(0, b), 0)), 'Magnitude': () => [10, 30, 50, 70, 90, 110, 150][[0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6][rnd(20)]],
  'Present': () => [40, 80, 120][rnd(3)], 'Spit Up': u => 100 * (u.v.stock || 1), 'Natural Gift': () => 70, 'Fling': () => 50, 'Bide': () => 60,
  /* Trump Card blir sterkere jo mindre PP som er igjen etter bruken. */
  'Trump Card': u => { const x = u.mv.find(y => MOVES[y.i][0] === 'Trump Card'), pp = x ? x.pp : 4; return pp >= 4 ? 40 : pp === 3 ? 50 : pp === 2 ? 60 : pp === 1 ? 80 : 200; },
  /* Snittet per slag, til motstanderens vurdering. I selve angrepet regnes hvert slag for seg (se useMove). */
  'Beat Up': (u, t, B) => { const l = beatUp(B, u); return l.reduce((a, c) => a + c, 0) / l.length; }, 'Triple Kick': () => 20 };
/* Beat Up: ett slag fra hver på laget som er frisk (brukeren selv slår alltid). Styrken følger den som slår: 5 + base Attack / 10, altså rundt 10–20 per slag. */
const beatUp = (B, u) => (B.me.includes(u) ? B.me : B.foe).filter(b => b === u || (b.hp > 0 && !b.status)).map(b => 5 + Math.floor(BST[b.id - 1][1] / 10));
/* Antall treff. Angrep med 2–5 treff: en tredel hver for 2 og 3, en sjettedel hver for 4 og 5. avg = forventet antall (til vurderinger). */
const hitsFor = (B, u, m, avg) => m[0] === 'Beat Up' ? beatUp(B, u).length : !m[13] ? 1 : m[13] === m[14] ? m[13] : avg ? 3 : [2, 2, 3, 3, 4, 5][rnd(6)];
/* Angrep som skifter type: Hidden Power følger brukerens IV-er, Weather Ball følger været. Gir en kopi av angrepet med riktig type. */
const hpType = iv => 1 + Math.floor(((iv[0] & 1) + 2 * (iv[1] & 1) + 4 * (iv[2] & 1) + 8 * (iv[5] & 1) + 16 * (iv[3] & 1) + 32 * (iv[4] & 1)) * 15 / 63);
const WXT = { sun: 9, rain: 10, sand: 5, hail: 14 };
function mvEff(B, u, m) {
  let ty = m[1];
  if (m[0] === 'Hidden Power' && u && u.src && u.src.iv) ty = hpType(u.src.iv);
  else if (m[0] === 'Weather Ball' && B && WXT[B.wx.k] != null) ty = WXT[B.wx.k];
  if (ty === m[1]) return m;
  const c = m.slice(); c[1] = ty; return c;
}
/* Unike statusangrep som retter seg mot motstanderen (resten virker på brukeren eller banen). */
const FOEU = new Set(['Psycho Shift', 'Transform', 'Mimic', 'Sketch', 'Guard Split', 'Power Split', 'Telekinesis', 'Taunt', 'Encore', 'Disable', 'Mean Look', 'Block', 'Spider Web', 'Lock-On', 'Mind Reader', 'Spite', 'Soak', 'Pain Split', 'Psych Up', 'Memento', 'Power Swap', 'Guard Swap', 'Heart Swap', 'Reflect Type', 'Defog']);

/* En Pokémon i kamp. src er den eide Pokémonen (eller en generert motstander med samme felter). v = det som nullstilles ved bytte. */
function bmon(src) {
  const st = statsOf(src);
  return { src, id: src.id, lv: src.lv, sh: src.sh || 0, name: mName(src), short: src.nn || D(src.id)[0], mega: src.mega || 0, mg: megaForm(src), g: src.g == null ? 2 : src.g, st, max: st[0], hp: st[0], mv: src.mv.map(i => ({ i, pp: MOVES[i][18] || 10, max: MOVES[i][18] || 10 })),
    sg: Z8(), status: '', slp: 0, tox: 0, ty: mTypes(src), out: 0, v: {} };
}
const newSide = () => ({ ref: 0, ls: 0, safe: 0, mist: 0, tail: 0, lucky: 0, spikes: 0, tsp: 0, rock: 0, wish: null });
/* tr = { n, title, img, ty, kind, skill, boss }. x = ekstra felter for modusen (liga, Battle Frontier eller demo). */
function mkBattle(me, foe, tr, x) {
  return Object.assign({ me: me.map(bmon), foe: foe.map(bmon), tr, a: 0, b: 0, turn: 0, over: null, need: 0, kos: [], pay: 0, megaUsed: { me: 0, foe: 0 },
    wx: { k: '', n: 0 }, sd: { me: newSide(), foe: newSide() }, lastM: { me: null, foe: null }, troom: 0, mud: 0, wsp: 0, aiSw: -9 }, x);
}
const act = (B, s) => s === 'me' ? B.me[B.a] : B.foe[B.b];
/* ---------- En kamp som kan lagres ----------
   Kampen er vanlige data, men noen ting i den finnes flere steder på én gang: den som holder en annen fast peker på den, køen midt i en runde peker på
   Pokémonene, og etter Mimic deler det nye og det opprinnelige angrepssettet de samme angrepene (så PP-en følges ad). battleSnap skriver derfor hver
   delte ting én gang ({ $id, $v }) og viser til den ellers ({ $r }), og battleRestore knytter dem sammen igjen. Dine egne kobles til den ekte Pokémonen
   (src), så XP og det andre kampen gir, havner riktig. Testet med sim/snap.js: en kamp som lagres og hentes etter hver runde, går nøyaktig som en uavbrutt. */
function battleSnap(B) {
  const cnt = new Map(), seen = new Map(); let n = 0;
  (function walk(x) { if (!x || typeof x !== 'object') return; const c = cnt.get(x) || 0; cnt.set(x, c + 1); if (c) return; if (Array.isArray(x)) x.forEach(walk); else for (const k in x) walk(x[k]); })(B);
  const body = x => { if (Array.isArray(x)) return x.map(v => { const y = enc(v); return y === undefined ? null : y; }); const o = {}; for (const k in x) { const v = enc(x[k]); if (v !== undefined) o[k] = v; } return o; };
  const enc = x => {
    if (x === null || typeof x !== 'object') return typeof x === 'function' ? undefined : x;
    if (cnt.get(x) > 1) { if (seen.has(x)) return { $r: seen.get(x) }; const id = ++n; seen.set(x, id); return { $id: id, $v: body(x) }; }
    return body(x);
  };
  return enc(B);
}
function battleRestore(o) {
  const ids = {};
  const fill = (t, v) => { if (Array.isArray(v)) v.forEach(e => t.push(dec(e))); else for (const k in v) t[k] = dec(v[k]); return t; };
  const dec = x => {
    if (!x || typeof x !== 'object') return x;
    if (!Array.isArray(x) && '$r' in x) return ids[x.$r];
    if (!Array.isArray(x) && '$id' in x) { const t = Array.isArray(x.$v) ? [] : {}; ids[x.$id] = t; return fill(t, x.$v); }
    return fill(Array.isArray(x) ? [] : {}, x);
  };
  const B = dec(o);
  B.me.forEach(b => { const m = b.src && b.src.u ? monBy(b.src.u) : null; if (m && m.id === b.src.id && m.lv === b.src.lv) b.src = m; });
  return B;
}
/* Mega Evolution: den som står inne, bytter til Mega-formen sin (b.mg) før angrepene i runden. Nye basestats (HP-en er den samme), nye typer og
   nytt bilde; det den har av økte og senkede verdier, følger med. Én per side per kamp, og formen varer kampen ut, også om den byttes ut og inn.
   how = 'rage' når en legendarisk forvandles i raseri i et raid. */
const canMega = (B, s) => { const b = act(B, s); return !!b && !!b.mg && !b.mega && !b.tf && b.hp > 0 && !(B.megaUsed && B.megaUsed[s]); };
function megaEvolve(B, s, ev, how) {
  if (!canMega(B, s)) return false;
  const b = act(B, s), k = b.mg, g = MEGA[k - 1], src2 = Object.assign({}, b.src, { mega: k }), st = statsOf(src2), N = how === 'rage' ? b.name : nmOf(s, b), to = megaName(k), primal = g[1] === 'Primal';
  const put = o => { o.st = [o.st[0]].concat(st.slice(1)); o.ty = [g[2], g[3]]; };
  put(b); if (b.orig) put(b.orig);
  b.mega = k; b.name = b.src.nn || to; (B.megaUsed || (B.megaUsed = {}))[s] = 1;
  ev.push({ t: 'mega', side: s, id: b.id, mega: k, sh: b.sh, primal, txt: primal ? `${N}'s Primal Reversion!` : how === 'rage' ? `${N} is surrounded by a blinding light!` : s === 'me' ? `${N} is reacting to your Mega Ring!` : `${N} is reacting to ${B.tr.n}'s Mega Ring!` },
    { t: 'msg', s: primal ? `It reverted to its primal form: ${to}!` : `${N} has Mega Evolved into ${to}!` });
  return true;
}
const opp = s => s === 'me' ? 'foe' : 'me';
let WILD = false;
const nmOf = (s, b) => s === 'foe' ? `${WILD ? 'The wild' : "The foe's"} ${b.name}` : b.name;
const lc = s => s.replace(/^The (foe|wild)/, 'the $1');
const sideOf = (B, b) => B.me.includes(b) ? 'me' : 'foe';
const spdB = (B, b) => b.st[5] * stgM(b.sg[5]) * (b.status === 'par' ? 0.5 : 1) * (B.sd[sideOf(B, b)].tail ? 2 : 1) * (b.v.slow ? 0.5 : 1);
const boosts = b => b.sg.reduce((a, c) => a + Math.max(0, c), 0);

/* ---------- Abilities ----------
   Et utvalg av egenskapene fra spillene (generasjon 5): de som merkes i kampen og sier fra når de virker. Hver art har høyst én.
   ABD: egenskap → artene som har den. Hendelsen { t: 'abil', side, n, s } viser egenskapen på skjermen sammen med teksten s. */
const ABD = 'intimidate:23,24,58,59,128,130,209,210,234,237,262,284,373,397,398,403,404,405,507,508,551,552,553|pressure:142,144,145,146,150,243,244,245,249,250,356,359,386,416,442,461,477,483,484,487,646|drizzle:382|drought:383|sandstream:248,449,450|snowwarning:459,460|airlock:384|cloudnine:54,55|moldbreaker:408,409,610,611,612|teravolt:644|turboblaze:643|download:137,233,474,649|slowstart:486|levitate:92,93,94,109,110,200,201,329,330,337,338,343,344,355,358,380,381,429,433,436,437,455,479,480,481,482,488,602,603,604,615,635|voltabsorb:135,170,171|waterabsorb:60,61,62,131,134,186,194,195,226,458,556,592,593|dryskin:453,454|flashfire:37,38,77,78,136,228,229,485,607,608,609,631|lightningrod:104,105,111,112,464,522,523|motordrive:466|stormdrain:422,423,456,457|sapsipper:585,586,626|wonderguard:292|static:25,26,100,101,125,172,179,180,181,239,309,310,587,618|flamebody:126,218,219,240,467,636,637|poisonpoint:29,30,31,32,33,34,117,211,315,406,407,543,544,545|effectspore:46,47,285,286,590,591|roughskin:318,319,621|ironbarbs:597,598|justified:638,639,640,647|sturdy:74,75,76,81,82,95,185,204,205,208,213,227,232,299,304,305,306,410,411,438,462,476,524,525,526,539,557,558,564,565|clearbody:72,73,374,375,376,377,378,379|whitesmoke:324|hypercutter:98,99,127,207,303,328,341,342,472|speedboost:193,291,469|shedskin:11,14,147,148,247,266,268,336,401,412,559,560,588|baddreams:491|hugepower:183,184,298|purepower:307,308';
const ABN = { intimidate: 'Intimidate', pressure: 'Pressure', drizzle: 'Drizzle', drought: 'Drought', sandstream: 'Sand Stream', snowwarning: 'Snow Warning', airlock: 'Air Lock', cloudnine: 'Cloud Nine', moldbreaker: 'Mold Breaker', teravolt: 'Teravolt', turboblaze: 'Turboblaze',
  download: 'Download', slowstart: 'Slow Start', levitate: 'Levitate', voltabsorb: 'Volt Absorb', waterabsorb: 'Water Absorb', dryskin: 'Dry Skin', flashfire: 'Flash Fire', lightningrod: 'Lightning Rod', motordrive: 'Motor Drive', stormdrain: 'Storm Drain', sapsipper: 'Sap Sipper',
  wonderguard: 'Wonder Guard', static: 'Static', flamebody: 'Flame Body', poisonpoint: 'Poison Point', effectspore: 'Effect Spore', roughskin: 'Rough Skin', ironbarbs: 'Iron Barbs', justified: 'Justified', sturdy: 'Sturdy', clearbody: 'Clear Body', whitesmoke: 'White Smoke',
  hypercutter: 'Hyper Cutter', speedboost: 'Speed Boost', shedskin: 'Shed Skin', baddreams: 'Bad Dreams', hugepower: 'Huge Power', purepower: 'Pure Power' };
/* Kort forklaring til lagskjermen og Pokédexen. */
const ABTXT = { intimidate: "Lowers the foe's Attack when it enters.", pressure: 'Moves used on it cost 2 PP.', drizzle: 'Makes it rain when it enters.', drought: 'Turns the sunlight harsh when it enters.', sandstream: 'Whips up a sandstorm when it enters.', snowwarning: 'Makes it hail when it enters.',
  airlock: 'Clears the weather, and no weather can start.', cloudnine: 'Clears the weather, and no weather can start.', moldbreaker: "Its moves ignore the foe's Ability.", teravolt: "Its moves ignore the foe's Ability.", turboblaze: "Its moves ignore the foe's Ability.",
  download: "Raises Attack or Sp. Atk, whichever hits the foe's weaker side.", slowstart: 'Attack and Speed are halved for five turns.', levitate: 'Ground moves cannot hit it.', voltabsorb: 'Electric moves heal it instead.', waterabsorb: 'Water moves heal it instead.', dryskin: 'Water moves heal it instead.',
  flashfire: 'Fire moves cannot hurt it, and power up its own.', lightningrod: 'Electric moves raise its Sp. Atk instead.', motordrive: 'Electric moves raise its Speed instead.', stormdrain: 'Water moves raise its Sp. Atk instead.', sapsipper: 'Grass moves raise its Attack instead.',
  wonderguard: 'Only super effective moves hit it.', static: 'Touching it may paralyze.', flamebody: 'Touching it may burn.', poisonpoint: 'Touching it may poison.', effectspore: 'Touching it may poison, paralyze or put to sleep.', roughskin: 'Hurts whoever touches it.', ironbarbs: 'Hurts whoever touches it.',
  justified: 'Dark moves raise its Attack.', sturdy: 'Survives any single hit from full HP.', clearbody: 'The foe cannot lower its stats.', whitesmoke: 'The foe cannot lower its stats.', hypercutter: 'The foe cannot lower its Attack.', speedboost: 'Speed rises every turn.', shedskin: 'May shed a status condition each turn.',
  baddreams: 'Hurts a sleeping foe every turn.', hugepower: 'Doubles its Attack.', purepower: 'Doubles its Attack.' };
const ABOF = {}; ABD.split('|').forEach(r => { const q = r.split(':'); q[1].split(',').forEach(id => { ABOF[+id] = q[0]; }); });
/* Egenskapen til en art (til visning), og til en Pokémon i kamp (den som har forvandlet seg med Transform, har ingen). */
/* Giratina i Origin Forme har Levitate i stedet for Pressure. */
const abilityOf = (id, mega) => id === 487 && mega === ORIGIN ? 'levitate' : ABOF[id] || '';
const ab = b => b && !b.tf ? abilityOf(b.id, b.mega) : '';
const mold = b => { const a = ab(b); return a === 'moldbreaker' || a === 'teravolt' || a === 'turboblaze'; };
const airOn = B => [act(B, 'me'), act(B, 'foe')].some(b => b && b.hp > 0 && (ab(b) === 'airlock' || ab(b) === 'cloudnine'));
const abSay = (ev, s, b, txt) => ev.push({ t: 'abil', side: s, n: ABN[ab(b)], s: txt || `${nmOf(s, b)}'s ${ABN[ab(b)]}!` });
/* Fysiske angrep som ikke rører ved målet (de utløser ikke Static, Rough Skin og lignende). */
const NOCON = new Set(['Earthquake', 'Magnitude', 'Bulldoze', 'Rock Slide', 'Rock Throw', 'Rock Tomb', 'Rock Blast', 'Stone Edge', 'Smack Down', 'Rock Wrecker', 'Bullet Seed', 'Seed Bomb', 'Razor Leaf', 'Pin Missile', 'Twineedle', 'Icicle Spear', 'Icicle Crash', 'Ice Shard', 'Bone Club', 'Bonemerang', 'Bone Rush',
  'Barrage', 'Egg Bomb', 'Explosion', 'Self-Destruct', 'Fling', 'Gunk Shot', 'Poison Sting', 'Sand Tomb', 'Spike Cannon', 'Sacred Fire', 'Psycho Cut', 'Present', 'Pay Day', 'Beat Up', 'Feint', 'Metal Burst', 'Natural Gift', 'Secret Power', 'Attack Order', 'Magnet Bomb', 'Fusion Bolt', 'Freeze Shock', 'Sky Attack', 'Poison Tail']);
/* Stopper egenskapen til målet t dette angrepet? Gir egenskapen, eller ''. Brukes både av kampen og av motstanderens vurdering. */
function abImm(u, t, m) {
  const a = t.hp > 0 && !mold(u) ? ab(t) : '', ty = m[1]; if (!a || m[4] === 0) return '';
  if (a === 'levitate') return ty === 4 && !GRAV && !t.v.smack && !t.v.ingrain ? a : '';
  if (a === 'voltabsorb' || a === 'lightningrod' || a === 'motordrive') return ty === 12 ? a : '';
  if (a === 'waterabsorb' || a === 'dryskin' || a === 'stormdrain') return ty === 10 ? a : '';
  if (a === 'flashfire') return ty === 9 ? a : '';
  if (a === 'sapsipper') return ty === 11 ? a : '';
  if (a === 'wonderguard') return !FIXED[m[0]] && typeEff(ty, t) <= 1 ? a : '';
  return '';
}
/* Angrepet stoppes av egenskapen: si fra, og gi det egenskapen gir (HP, styrke eller en stat). */
function abBlock(B, o, t, a, ev) {
  const N = nmOf(o, t), say = x => ev.push({ t: 'msg', s: x });
  if (a === 'levitate') return abSay(ev, o, t, `${N} makes Ground moves miss with Levitate!`);
  if (a === 'wonderguard') return abSay(ev, o, t, `${N}'s Wonder Guard evades the attack!`);
  abSay(ev, o, t);
  if (a === 'voltabsorb' || a === 'waterabsorb' || a === 'dryskin') { if (t.hp < t.max && !t.v.hblock) { t.hp = Math.min(t.max, t.hp + Math.max(1, Math.floor(t.max / 4))); ev.push({ t: 'heal', side: o, hp: t.hp }); say(`${N} restored its HP!`); } else say(`It doesn't affect ${lc(N)}…`); }
  else if (a === 'flashfire') { if (!t.v.ff) { t.v.ff = 1; say(`The power of ${lc(N)}'s Fire-type moves rose!`); } else say(`It doesn't affect ${lc(N)}…`); }
  else changeStats(B, o, [[{ lightningrod: 4, motordrive: 6, stormdrain: 4, sapsipper: 2 }[a], 1]], ev);
}
/* Når en Pokémon kommer inn: Intimidate, Pressure, været og de andre som virker med en gang. */
function abEntry(B, s, ev) {
  const b = act(B, s), o = opp(s), f = act(B, o), a = b.hp > 0 ? ab(b) : '', N = nmOf(s, b), WXA = { drizzle: 'rain', drought: 'sun', sandstream: 'sand', snowwarning: 'hail' };
  if (!a) return;
  if (a === 'intimidate') { if (f.hp > 0) { abSay(ev, s, b); changeStats(B, o, [[2, -1]], ev, true); } }
  else if (a === 'pressure') abSay(ev, s, b, `${N} is exerting its Pressure!`);
  else if (a === 'moldbreaker') abSay(ev, s, b, `${N} breaks the mold!`);
  else if (a === 'teravolt') abSay(ev, s, b, `${N} is radiating a bursting aura!`);
  else if (a === 'turboblaze') abSay(ev, s, b, `${N} is radiating a blazing aura!`);
  else if (WXA[a]) { if (B.wx.k !== WXA[a] && !airOn(B)) { B.wx = { k: WXA[a], n: B.raid && s === 'foe' ? 999 : 5 }; abSay(ev, s, b); ev.push({ t: 'wx', k: WXA[a] }, { t: 'msg', s: WXTXT[WXA[a]][0] }); } }
  else if (a === 'airlock' || a === 'cloudnine') { abSay(ev, s, b); if (B.wx.k) { B.wx = { k: '', n: 0 }; ev.push({ t: 'wx', k: '' }); } ev.push({ t: 'msg', s: 'The effects of the weather disappeared.' }); }
  else if (a === 'download') { if (f.hp > 0) { abSay(ev, s, b); changeStats(B, s, [[f.st[2] * stgM(f.sg[2]) < f.st[4] * stgM(f.sg[4]) ? 2 : 4, 1]], ev); } }
  else if (a === 'slowstart') { b.v.slow = 5; abSay(ev, s, b, `${N} can't get it going!`); }
}
/* Egenskapene til de to som står inne når kampen starter, den raskeste først. */
function startAbil(B) { const ev = []; GRAV = B.grav || 0; WILD = !!B.tr.wild; for (const s of spdB(B, act(B, 'me')) >= spdB(B, act(B, 'foe')) ? ['me', 'foe'] : ['foe', 'me']) abEntry(B, s, ev); settle(B, ev); return ev; }
/* Etter at u (siden s) har truffet t (siden o): Justified, og det som skjer med den som rører ved målet. */
function abHit(B, s, o, u, t, m, ev) {
  const a = ab(t); if (!a) return;
  if (a === 'justified' && m[1] === 16 && t.hp > 0 && t.sg[1] < 6) { abSay(ev, o, t); changeStats(B, o, [[2, 1]], ev); }
  if (m[4] !== 1 || NOCON.has(m[0]) || u.hp <= 0) return;
  if (a === 'roughskin' || a === 'ironbarbs') { abSay(ev, o, t); u.hp = Math.max(0, u.hp - Math.max(1, Math.floor(u.max / 8))); ev.push({ t: 'hit', side: s, hp: u.hp, e: 1, quiet: 1 }, { t: 'msg', s: `${nmOf(s, u)} was hurt!` }); return; }
  const ail = a === 'static' ? 1 : a === 'flamebody' ? 4 : a === 'poisonpoint' ? 5 : a === 'effectspore' ? [5, 1, 2][rnd(3)] : 0;
  if (ail && Math.random() < 0.3) { const tmp = []; if (applyAil(B, s, ail, tmp, false)) { abSay(ev, o, t); ev.push(...tmp); } }
}
function powOf(B, u, t, m, ord) {
  const n = m[0];
  let p = VPOW[n] ? VPOW[n](u, t, B) : m[2] || 60;
  if (n === 'Eruption' || n === 'Water Spout') p = Math.max(1, Math.floor(p * u.hp / u.max));
  if (n === 'Stored Power') p = 20 + 20 * boosts(u);
  if ((n === 'Facade' && u.status) || (n === 'Hex' && t.status) || (n === 'Venoshock' && t.status === 'psn') || (n === 'Brine' && t.hp <= t.max / 2) || (n === 'Wake-Up Slap' && t.status === 'slp') || (n === 'Smelling Salts' && t.status === 'par')
    || (n === 'Payback' && ord === 1) || ((n === 'Revenge' || n === 'Avalanche') && u.v.hit) || n === 'Acrobatics' || (n === 'Weather Ball' && B.wx.k) || (n === 'Assurance' && t.v.hit) || (n === 'Retaliate' && B.sd[sideOf(B, u)].fell === B.turn - 1)) p *= 2;
  if ((m[1] === 12 && u.v.charge) || (ROLL.has(n) && u.v.curl)) p *= 2;
  if (u.v.mefirst) p = Math.floor(p * 1.5);
  if (n === 'Solar Beam' && B.wx.k && B.wx.k !== 'sun') p = Math.floor(p / 2);
  if (ROLL.has(n)) p *= Math.pow(2, Math.min(4, u.v.roll || 0));
  /* Fury Cutter dobles for hvert treff på rad (40, 80, 160). Echoed Voice øker med 40 om gangen opp til 200. */
  if (CHAIN.has(n)) p = n === 'Echoed Voice' ? Math.min(200, p * (1 + (u.v.chain || 0))) : Math.min(160, p * Math.pow(2, u.v.chain || 0));
  if (n === 'Pursuit' && B.pursuit) p *= 2;
  if ((STOMP.has(n) && t.v.mini) || (AWAY2.has(n) && reaches(m, t))) p *= 2;
  return p;
}
function dmgOf(B, u, t, m, pow, crit, roll) {
  const phys = m[4] === 1, n = m[0], ai = phys ? 1 : 3, d0 = phys || n === 'Psyshock' || n === 'Psystrike' || n === 'Secret Sword' ? 2 : 4, di = B.wroom ? 6 - d0 : d0, raw = n === 'Chip Away' || n === 'Sacred Sword';
  let a = (n === 'Foul Play' ? t : u).st[ai] * (crit && u.sg[ai] < 0 ? 1 : stgM((n === 'Foul Play' ? t : u).sg[ai])), d = t.st[di] * ((crit && t.sg[di] > 0) || raw ? 1 : stgM(t.sg[di]));
  if (phys && n !== 'Foul Play') { if (u.v.slow) a *= 0.5; const ua = ab(u); if (ua === 'hugepower' || ua === 'purepower') a *= 2; }
  if (B.wx.k === 'sand' && di === 4 && t.ty.includes(5)) d *= 1.5;
  const base = Math.floor(Math.floor((Math.floor(2 * u.lv / 5) + 2) * pow * a / d) / 50) + 2;
  let mod = (crit ? 1.5 : 1) * (roll ? 0.85 + Math.random() * 0.15 : 0.925) * (u.ty.includes(m[1]) ? 1.5 : 1) * typeEff(m[1], t) * (phys && u.status === 'brn' && n !== 'Facade' ? 0.5 : 1);
  if (u.v.ff && m[1] === 9) mod *= 1.5;
  if (B.wx.k === 'rain') mod *= m[1] === 10 ? 1.5 : m[1] === 9 ? 0.5 : 1;
  if (B.wx.k === 'sun') mod *= m[1] === 9 ? 1.5 : m[1] === 10 ? 0.5 : 1;
  const sd = B.sd[sideOf(B, t)];
  if (!crit && n !== 'Brick Break' && ((phys && sd.ref) || (!phys && sd.ls))) mod *= 0.5;
  if ((m[1] === 12 && B.mud) || (m[1] === 9 && B.wsp)) mod *= 0.33;
  return Math.max(1, Math.floor(base * mod));
}
const ailOk = (b, st) => !!st && !b.status && !((st === 'par' && b.ty.includes(12)) || (st === 'brn' && b.ty.includes(9)) || (st === 'psn' && (b.ty.includes(3) || b.ty.includes(8))) || (st === 'frz' && b.ty.includes(14)));
/* Gir siden s en tilstand. loud = si fra når det ikke virker (statusangrep). bad = kraftig forgiftet. */
function applyAil(B, s, id, ev, loud, bad) {
  const b = act(B, s), N = nmOf(s, b), no = x => { if (loud) ev.push({ t: 'msg', s: x || 'But it failed!' }); return false; };
  if (b.hp <= 0) return false;
  if (b.v.sub) return no();
  if (B.sd[s].safe) return no(`${N} is protected by Safeguard!`);
  if (id === 6) { if (b.v.conf) return no(); b.v.conf = 2 + rnd(4); ev.push({ t: 'status', side: s, st: b.status, fx: 'conf' }, { t: 'msg', s: `${N} became confused!` }); return true; }
  const st = AIL[id];
  if (!st) return no();
  if (!ailOk(b, st)) return no(b.status ? 'But it failed!' : `It doesn't affect ${lc(N)}…`);
  b.status = st; b.tox = bad && st === 'psn' ? 1 : 0; if (st === 'slp') b.slp = 1 + rnd(3);
  ev.push({ t: 'status', side: s, st, fx: st }, { t: 'msg', s: `${N} ${b.tox ? 'was badly poisoned!' : AILTXT[st]}` });
  return true;
}
function changeStats(B, s, list, ev, byFoe) {
  const b = act(B, s), N = nmOf(s, b);
  if (b.hp <= 0) return;
  for (const [id, d] of list) {
    const i = id - 1;
    if (d < 0 && byFoe && (B.sd[s].mist || b.v.sub)) { ev.push({ t: 'msg', s: b.v.sub ? 'But it failed!' : `${N} is protected by the mist!` }); return; }
    if (d < 0 && byFoe && !mold(act(B, opp(s)))) { const a = ab(b); if (a === 'clearbody' || a === 'whitesmoke' || (a === 'hypercutter' && i === 1)) { abSay(ev, s, b, `${N}'s ${ABN[a]} prevents ${a === 'hypercutter' ? 'Attack' : 'stat'} loss!`); if (a === 'hypercutter') continue; return; } }
    const v = clampS(b.sg[i] + d);
    if (v === b.sg[i]) { ev.push({ t: 'msg', s: `${N}'s ${STN[i]} won't go any ${d > 0 ? 'higher' : 'lower'}!` }); continue; }
    b.sg[i] = v;
    ev.push({ t: 'stat', side: s, up: d > 0 }, { t: 'msg', s: `${N}'s ${STN[i]} ${d > 0 ? 'rose' : 'fell'}${Math.abs(d) > 2 ? ' drastically' : Math.abs(d) > 1 ? ' sharply' : ''}!` });
  }
}
/* Setter inn Pokémon i på siden s: nullstiller det flyktige og lar piggene på banen virke. */
function sendOut(B, s, i, ev, txt) {
  const b = (s === 'me' ? B.me : B.foe)[i], sd = B.sd[s], N = nmOf(s, b), air = b.ty.includes(2);
  if (s === 'me') B.a = i; else B.b = i;
  unform(b); b.v = {}; b.sg = Z8(); if (b.tox) b.tox = 1;
  if (B.pass && B.pass.s === s) { b.sg = B.pass.sg; Object.assign(b.v, B.pass.v); B.pass = null; }
  ev.push({ t: 'send', side: s, i, hp: b.hp, st: b.status, txt: txt || (s === 'me' ? `Go! ${b.name}!` : `${B.tr.n} sent out ${b.name}!`) });
  const hurt = (d, x) => { b.hp = Math.max(0, b.hp - Math.max(1, Math.floor(d))); ev.push({ t: 'hit', side: s, hp: b.hp, e: 1, quiet: 1 }, { t: 'msg', s: x }); };
  if (sd.hw && b.hp > 0) { sd.hw = 0; if (b.hp < b.max || b.status) { b.hp = b.max; b.status = ''; b.tox = 0; ev.push({ t: 'heal', side: s, hp: b.hp }, { t: 'status', side: s, st: '' }, { t: 'msg', s: `The healing wish came true for ${lc(N)}!` }); } }
  if (sd.rock) hurt(b.max / 8 * CH[5][b.ty[0]] * (b.ty[1] >= 0 ? CH[5][b.ty[1]] : 1), `Pointed stones dug into ${lc(N)}!`);
  if (sd.spikes && !air && b.hp > 0) hurt(b.max / [8, 6, 4][sd.spikes - 1], `${N} is hurt by the spikes!`);
  if (sd.tsp && !air && b.hp > 0) {
    if (b.ty.includes(3)) { sd.tsp = 0; ev.push({ t: 'msg', s: `${N} absorbed the poison spikes!` }); }
    else if (ailOk(b, 'psn') && !sd.safe) { b.status = 'psn'; b.tox = sd.tsp > 1 ? 1 : 0; ev.push({ t: 'status', side: s, st: 'psn', fx: 'psn' }, { t: 'msg', s: `${N} was ${b.tox ? 'badly ' : ''}poisoned!` }); }
  }
  if (b.hp > 0) abEntry(B, s, ev);
  settle(B, ev);
}
/* Tar vare på det en Pokémon hadde før noe i kampen byttet det ut (verdier, typer, angrep), og setter det tilbake når den kommer inn på nytt. */
const keep = b => { if (!b.orig) b.orig = { st: b.st.slice(), ty: b.ty.slice(), mv: b.mv }; };
const unform = b => { if (b.orig) { b.st = b.orig.st; b.ty = b.orig.ty; b.mv = b.orig.mv; b.orig = null; b.tf = 0; } };
/* Sitter denne fast? Feller og Mean Look holder bare så lenge den som satte dem, står inne. */
const stuck = (B, s) => { const V = act(B, s).v, f = act(B, opp(s)); return !!((V.trap && (!V.trapBy || V.trapBy === f)) || (V.nosw && (V.nosw === 1 || V.nosw === f)) || V.ingrain); };
function swapTo(B, s, i, ev) {
  const old = act(B, s);
  if (old.hp > 0) ev.push({ t: 'recall', side: s, txt: s === 'me' ? `${old.name}, come back!` : `${B.tr.n} withdrew ${old.name}!` });
  old.v = {}; old.sg = Z8();
  sendOut(B, s, i, ev);
}
/* Roar, Whirlwind, Dragon Tail: en tilfeldig annen på laget dras inn. */
function forceOut(B, s, ev, quiet) {
  const arr = s === 'me' ? B.me : B.foe, cur = s === 'me' ? B.a : B.b, c = arr.map((x, i) => i).filter(i => i !== cur && arr[i].hp > 0);
  if (!c.length || arr[cur].v.ingrain) { if (!quiet) ev.push({ t: 'msg', s: 'But it failed!' }); return; }
  const i = c[rnd(c.length)];
  ev.push({ t: 'recall', side: s, txt: '' });
  arr[cur].v = {}; arr[cur].sg = Z8();
  sendOut(B, s, i, ev, `${nmOf(s, arr[i])} was dragged out!`);
}

/* Statusangrep med egne regler. c = { B, s, o, u, t, V, N, ev, say, m, wasProt }. */
const fail = c => c.say('But it failed!');
const guard = (c, key, txt) => { if (c.wasProt && Math.random() < 0.5) return fail(c); c.V[key] = 1; c.V.lastProt = 1; c.say(`${c.N} ${txt}`); };
const weather = (c, k) => { if (c.B.wx.k === k || airOn(c.B)) return fail(c); c.B.wx = { k, n: 5 }; c.ev.push({ t: 'wx', k }); c.say(WXTXT[k][0]); };
const sideUp = (c, key, n, txt) => { const sd = c.B.sd[c.s]; if (sd[key]) return fail(c); sd[key] = n; c.say(`${c.s === 'me' ? 'Your team' : "The foe's team"} ${txt}`); };
const hazard = (c, key, max, txt) => { const sd = c.B.sd[c.o]; if (sd[key] >= max) return fail(c); sd[key]++; c.say(`${txt} ${c.s === 'me' ? "the foe's team" : 'your team'}!`); };
const swapSg = (c, idx) => { for (const i of idx) { const x = c.u.sg[i]; c.u.sg[i] = c.t.sg[i]; c.t.sg[i] = x; } c.say(`${c.N} switched stat changes with its target!`); };
const UM = {
  'Protect': c => guard(c, 'prot', 'protected itself!'), 'Detect': c => guard(c, 'prot', 'protected itself!'), 'Endure': c => guard(c, 'endure', 'braced itself!'),
  'Rest': c => { const u = c.u; if (u.hp >= u.max) return fail(c); u.hp = u.max; u.status = 'slp'; u.tox = 0; u.slp = 2; c.ev.push({ t: 'heal', side: c.s, hp: u.hp }, { t: 'status', side: c.s, st: 'slp', fx: 'slp' }); c.say(`${c.N} slept and became healthy!`); },
  'Rain Dance': c => weather(c, 'rain'), 'Sunny Day': c => weather(c, 'sun'), 'Sandstorm': c => weather(c, 'sand'), 'Hail': c => weather(c, 'hail'),
  'Reflect': c => sideUp(c, 'ref', 5, 'became stronger against physical moves!'), 'Light Screen': c => sideUp(c, 'ls', 5, 'became stronger against special moves!'), 'Safeguard': c => sideUp(c, 'safe', 5, 'became cloaked in a mystical veil!'),
  'Mist': c => sideUp(c, 'mist', 5, 'became shrouded in mist!'), 'Tailwind': c => sideUp(c, 'tail', 4, 'has the wind at its back!'), 'Lucky Chant': c => sideUp(c, 'lucky', 5, 'is shielded from critical hits!'),
  'Spikes': c => hazard(c, 'spikes', 3, 'Spikes were scattered around'), 'Toxic Spikes': c => hazard(c, 'tsp', 2, 'Poison spikes were scattered around'), 'Stealth Rock': c => hazard(c, 'rock', 1, 'Pointed stones float in the air around'),
  'Roar': c => forceOut(c.B, c.o, c.ev), 'Whirlwind': c => forceOut(c.B, c.o, c.ev),
  'Haze': c => { act(c.B, 'me').sg = Z8(); act(c.B, 'foe').sg = Z8(); c.say('All stat changes were eliminated!'); },
  'Focus Energy': c => { if (c.V.focus) return fail(c); c.V.focus = 1; c.say(`${c.N} is getting pumped!`); },
  'Curse': c => { if (!c.u.ty.includes(7)) return changeStats(c.B, c.s, [[6, -1], [2, 1], [3, 1]], c.ev); if (c.t.hp <= 0 || c.t.v.curse) return fail(c); c.t.v.curse = 1; c.u.hp = Math.max(0, c.u.hp - Math.floor(c.u.max / 2)); c.ev.push({ t: 'hit', side: c.s, hp: c.u.hp, e: 1, quiet: 1 }); c.say(`${c.N} cut its own HP and laid a curse on ${lc(nmOf(c.o, c.t))}!`); },
  'Taunt': c => { if (c.t.v.taunt) return fail(c); c.t.v.taunt = 3; c.say(`${nmOf(c.o, c.t)} fell for the taunt!`); },
  'Encore': c => { const tv = c.t.v; if (tv.enc || tv.last == null || tv.last < 0 || tv.lock) return fail(c); tv.enc = { k: tv.last, n: 3 }; c.say(`${nmOf(c.o, c.t)} received an encore!`); },
  'Disable': c => { const tv = c.t.v; if (tv.dis || tv.last == null || tv.last < 0) return fail(c); tv.dis = { k: tv.last, n: 4 }; c.say(`${nmOf(c.o, c.t)}'s ${MOVES[c.t.mv[tv.last].i][0]} was disabled!`); },
  'Aqua Ring': c => { if (c.V.aqua) return fail(c); c.V.aqua = 1; c.say(`${c.N} surrounded itself with a veil of water!`); },
  'Ingrain': c => { if (c.V.ingrain) return fail(c); c.V.ingrain = 1; c.say(`${c.N} planted its roots!`); },
  'Mean Look': c => { if (c.t.v.nosw) return fail(c); c.t.v.nosw = c.u; c.say(`${nmOf(c.o, c.t)} can no longer escape!`); },
  'Psych Up': c => { c.u.sg = c.t.sg.slice(); c.say(`${c.N} copied ${lc(nmOf(c.o, c.t))}'s stat changes!`); },
  'Lock-On': c => { c.V.lockon = 1; c.say(`${c.N} took aim at ${lc(nmOf(c.o, c.t))}!`); },
  'Destiny Bond': c => { c.V.dbond = 1; c.say(`${c.N} is trying to take its foe down with it!`); },
  'Refresh': c => { if (!c.u.status || c.u.status === 'slp' || c.u.status === 'frz') return fail(c); c.u.status = ''; c.u.tox = 0; c.ev.push({ t: 'status', side: c.s, st: '' }); c.say(`${c.N}'s status returned to normal!`); },
  'Heal Bell': c => { for (const b of c.s === 'me' ? c.B.me : c.B.foe) if (b.hp > 0) { b.status = ''; b.tox = 0; } c.ev.push({ t: 'status', side: c.s, st: '' }); c.say(c.m[0] === 'Heal Bell' ? 'A bell chimed!' : 'A soothing aroma wafted through the area!'); },
  'Splash': c => c.say('But nothing happened!'), 'Helping Hand': fail,
  /* Teleport bytter brukeren ut, som i de nyere spillene. Alene på laget slår den feil. */
  'Teleport': c => { if (!(c.s === 'me' ? c.B.me : c.B.foe).some(b => b !== c.u && b.hp > 0)) return fail(c); c.B.pivot = c.s; },
  /* Defog senker målets unnvikelse og blåser bort skjermer hos motstanderen og pigger og steiner på begge sider. */
  'Defog': c => { const B = c.B, a = B.sd[c.o], b = B.sd[c.s]; let any = 0; changeStats(B, c.o, [[8, -1]], c.ev, true);
    for (const k of ['ref', 'ls', 'safe', 'mist']) if (a[k]) { a[k] = 0; any = 1; }
    for (const sd of [a, b]) for (const k of ['spikes', 'tsp', 'rock']) if (sd[k]) { sd[k] = 0; any = 1; }
    if (any) c.say('The field was blown clear!'); },
  'Magnet Rise': c => { if (c.V.mag) return fail(c); c.V.mag = 5; c.say(`${c.N} levitated with electromagnetism!`); },
  'Soak': c => { keep(c.t); c.t.ty = [10, -1]; c.say(`${nmOf(c.o, c.t)} transformed into the Water type!`); },
  'Reflect Type': c => { keep(c.u); c.u.ty = c.t.ty.slice(); c.say(`${c.N}'s type became the same as ${lc(nmOf(c.o, c.t))}'s type!`); },
  'Conversion': c => { keep(c.u); c.u.ty = [MOVES[c.u.mv[0].i][1], -1]; c.say(`${c.N} transformed into the ${TYN[c.u.ty[0]]} type!`); },
  'Spite': c => { const tv = c.t.v, x = tv.last != null && tv.last >= 0 ? c.t.mv[tv.last] : null; if (!x || !x.pp) return fail(c); x.pp = Math.max(0, x.pp - 4); c.say(`It reduced the PP of ${lc(nmOf(c.o, c.t))}'s ${MOVES[x.i][0]}!`); },
  'Belly Drum': c => { const u = c.u; if (u.hp <= u.max / 2 || u.sg[1] >= 6) return fail(c); u.hp -= Math.floor(u.max / 2); u.sg[1] = 6; c.ev.push({ t: 'hit', side: c.s, hp: u.hp, e: 1, quiet: 1 }, { t: 'stat', side: c.s, up: true }); c.say(`${c.N} cut its own HP and maximized its Attack!`); },
  'Wish': c => { const sd = c.B.sd[c.s]; if (sd.wish) return fail(c); sd.wish = { n: 2, hp: Math.floor(c.u.max / 2) }; c.say(`${c.N} made a wish!`); },
  'Pain Split': c => { const a = Math.floor((c.u.hp + c.t.hp) / 2); c.u.hp = Math.min(c.u.max, a); c.t.hp = Math.min(c.t.max, a); c.ev.push({ t: 'heal', side: c.s, hp: c.u.hp, q: 1 }, { t: 'heal', side: c.o, hp: c.t.hp, q: 1 }); c.say('The battlers shared their pain!'); },
  'Substitute': c => { const u = c.u, d = Math.floor(u.max / 4); if (c.V.sub || u.hp <= d) return fail(c); u.hp -= d; c.V.sub = d; c.ev.push({ t: 'hit', side: c.s, hp: u.hp, e: 1, quiet: 1 }, { t: 'sub', side: c.s, on: 1 }); c.say(`${c.N} put in a substitute!`); },
  'Trick Room': c => { c.B.troom = c.B.troom ? 0 : 5; c.say(c.B.troom ? `${c.N} twisted the dimensions!` : 'The twisted dimensions returned to normal!'); },
  'Water Sport': c => { c.B.wsp = 5; c.say("Fire's power was weakened!"); }, 'Mud Sport': c => { c.B.mud = 5; c.say("Electricity's power was weakened!"); },
  'Acupressure': c => { const o = [1, 2, 3, 4, 5, 6, 7].filter(i => c.u.sg[i] < 6); if (!o.length) return fail(c); changeStats(c.B, c.s, [[o[rnd(o.length)] + 1, 2]], c.ev); },
  'Memento': c => { changeStats(c.B, c.o, [[2, -2], [4, -2]], c.ev, true); c.u.hp = 0; c.ev.push({ t: 'hit', side: c.s, hp: 0, e: 1, quiet: 1 }); },
  'Power Swap': c => swapSg(c, [1, 3]), 'Guard Swap': c => swapSg(c, [2, 4]), 'Heart Swap': c => swapSg(c, [1, 2, 3, 4, 5, 6, 7]),
  'Power Trick': c => { keep(c.u); const st = c.u.st, x = st[1]; st[1] = st[2]; st[2] = x; c.say(`${c.N} switched its Attack and Defense!`); }
};
Object.assign(UM, {
  'Stockpile': c => { const n = c.V.stock || 0; if (n >= 3) return fail(c); c.V.stock = n + 1; c.say(`${c.N} stockpiled ${n + 1}!`); changeStats(c.B, c.s, [[3, 1], [5, 1]], c.ev); },
  'Swallow': c => { const n = c.V.stock || 0, u = c.u; if (!n || u.hp >= u.max) return fail(c); c.V.stock = 0; u.hp = Math.min(u.max, u.hp + Math.max(1, Math.floor(u.max * [0.25, 0.5, 1][n - 1]))); c.ev.push({ t: 'heal', side: c.s, hp: u.hp }); c.say(`${c.N} regained health!`); },
  'Charge': c => { c.V.charge = 2; c.say(`${c.N} began charging power!`); changeStats(c.B, c.s, [[5, 1]], c.ev); },
  'Defense Curl': c => { c.V.curl = 1; changeStats(c.B, c.s, [[3, 1]], c.ev); },
  'Transform': c => { const u = c.u, t = c.t; if (t.hp <= 0 || u.tf || t.tf || t.v.sub) return fail(c); keep(u); u.tf = 1; u.st = [u.st[0]].concat(t.st.slice(1)); u.ty = t.ty.slice(); u.sg = t.sg.slice(); u.mv = t.mv.map(x => ({ i: x.i, pp: 5, max: 5 })); c.V.lock = null; c.ev.push({ t: 'form', side: c.s, id: t.id, sh: t.sh, mega: t.mega || 0 }); c.say(`${c.N} transformed into ${t.name}!`); },
  'Mimic': c => { const lm = c.B.lastM[c.o], u = c.u, k = u.mv.findIndex(x => MOVES[x.i][0] === c.m[0]); if (lm == null || lm < 0 || k < 0 || u.mv.some(x => x.i === lm)) return fail(c); keep(u); u.mv = u.mv.slice(); u.mv[k] = { i: lm, pp: 5, max: 5 }; c.say(`${c.N} learned ${MOVES[lm][0]}!`); },
  'Camouflage': c => { keep(c.u); c.u.ty = [0, -1]; c.say(`${c.N} transformed into the Normal type!`); },
  'Conversion 2': c => { const lm = c.B.lastM[c.o]; if (lm == null || lm < 0) return fail(c); const o = TYPES.map((_, i) => i).filter(i => CH[MOVES[lm][1]][i] < 1 && !c.u.ty.includes(i)); if (!o.length) return fail(c); keep(c.u); c.u.ty = [o[rnd(o.length)], -1]; c.say(`${c.N} transformed into the ${TYN[c.u.ty[0]]} type!`); },
  'Guard Split': c => { keep(c.u); keep(c.t); for (const i of [2, 4]) { const a = Math.floor((c.u.st[i] + c.t.st[i]) / 2); c.u.st[i] = c.t.st[i] = a; } c.say(`${c.N} shared its guard with the target!`); },
  'Power Split': c => { keep(c.u); keep(c.t); for (const i of [1, 3]) { const a = Math.floor((c.u.st[i] + c.t.st[i]) / 2); c.u.st[i] = c.t.st[i] = a; } c.say(`${c.N} shared its power with the target!`); },
  'Psycho Shift': c => { const st = c.u.status, id = +Object.keys(AIL).find(k => AIL[k] === st); if (!st || c.t.status || !ailOk(c.t, st) || c.t.v.sub) return fail(c); const bad = c.u.tox; c.u.status = ''; c.u.tox = 0; c.ev.push({ t: 'status', side: c.s, st: '' }); applyAil(c.B, c.o, id, c.ev, true, !!bad); },
  'Imprison': c => { if (c.V.imprison) return fail(c); c.V.imprison = 1; c.say(`${c.N} sealed any moves its target shares with it!`); },
  'Grudge': c => { c.V.grudge = 1; c.say(`${c.N} wants its target to bear a grudge!`); },
  'Magic Coat': c => { c.V.mcoat = 1; c.say(`${c.N} shrouded itself with Magic Coat!`); },
  'Snatch': c => { c.V.snatch = 1; c.say(`${c.N} waits for a target to make a move!`); },
  'Gravity': c => { if (c.B.grav) return fail(c); c.B.grav = 5; GRAV = 5; c.say('Gravity intensified!'); },
  'Magic Room': c => { c.B.mroom = c.B.mroom ? 0 : 5; c.say(c.B.mroom ? 'It created a bizarre area in which items lose their effects!' : 'Magic Room wore off.'); },
  'Wonder Room': c => { c.B.wroom = c.B.wroom ? 0 : 5; c.say(c.B.wroom ? 'It created a bizarre area in which Defense and Sp. Def stats are swapped!' : 'Wonder Room wore off.'); },
  'Telekinesis': c => { if (c.t.v.tele || c.t.v.ingrain) return fail(c); c.t.v.tele = 3; c.say(`${nmOf(c.o, c.t)} was hurled into the air!`); },
  'Healing Wish': c => { const team = c.s === 'me' ? c.B.me : c.B.foe; if (!team.some(b => b !== c.u && b.hp > 0)) return fail(c); c.B.sd[c.s].hw = 1; c.u.hp = 0; c.ev.push({ t: 'hit', side: c.s, hp: 0, e: 1, quiet: 1 }); },
  'Baton Pass': c => { const team = c.s === 'me' ? c.B.me : c.B.foe; if (!team.some(b => b !== c.u && b.hp > 0)) return fail(c); const V = c.V, v = {}; for (const k of ['sub', 'conf', 'focus', 'aqua', 'ingrain', 'seed', 'curse', 'mag', 'perish', 'nosw', 'stock']) if (V[k]) v[k] = V[k]; c.B.pass = { s: c.s, sg: c.u.sg.slice(), v }; c.B.pivot = c.s; }
});
UM['Sketch'] = UM['Mimic']; UM['Lunar Dance'] = UM['Healing Wish'];
UM['Aromatherapy'] = UM['Heal Bell']; UM['Block'] = UM['Spider Web'] = UM['Mean Look']; UM['Mind Reader'] = UM['Lock-On'];
/* Tilstander utover de fem vanlige (tilstandsnummeret fra dataene). */
/* Attract virker bare mellom en hann og en hunn (ikke på dem uten kjønn). */
const canLove = (u, t) => u.g < 2 && t.g < 2 && u.g !== t.g;
const AILX = {
  7: c => { if (c.t.v.love || !canLove(c.u, c.t)) return fail(c); c.t.v.love = 1; c.say(`${nmOf(c.o, c.t)} fell in love!`); },
  9: c => { if (c.t.status !== 'slp' || c.t.v.night) return fail(c); c.t.v.night = 1; c.say(`${nmOf(c.o, c.t)} began having a nightmare!`); },
  14: c => { if (c.t.status || c.t.v.yawn || c.B.sd[c.o].safe) return fail(c); c.t.v.yawn = 2; c.say(`${c.N} made ${lc(nmOf(c.o, c.t))} drowsy!`); },
  18: c => { if (c.t.v.seed) return fail(c); if (c.t.ty.includes(11)) return c.say(`It doesn't affect ${lc(nmOf(c.o, c.t))}…`); c.t.v.seed = 1; c.ev.push({ t: 'status', side: c.o, st: c.t.status, fx: 'seed' }); c.say(`${nmOf(c.o, c.t)} was seeded!`); },
  12: c => { if (c.t.v.torm) return fail(c); c.t.v.torm = 1; c.say(`${nmOf(c.o, c.t)} was subjected to torment!`); },
  15: c => { if (c.t.v.hblock) return fail(c); c.t.v.hblock = 5; c.say(`${nmOf(c.o, c.t)} was prevented from healing!`); },
  17: c => { c.t.v.fore = c.m[0] === 'Miracle Eye' ? 2 : 1; c.say(`${nmOf(c.o, c.t)} was identified!`); },
  19: c => { if (c.t.v.embargo) return fail(c); c.t.v.embargo = 5; c.say(`${nmOf(c.o, c.t)} can't use items anymore!`); },
  20: c => { for (const s of ['me', 'foe']) { const b = act(c.B, s); if (b.hp > 0 && !b.v.perish) b.v.perish = 4; } c.say('All Pokémon that heard the song will faint in three turns!'); }
};
const CALLS = new Set(['Metronome', 'Sleep Talk', 'Copycat', 'Mirror Move', 'Me First', 'Assist', 'Nature Power']), HEALS = new Set(['Rest', 'Wish', 'Swallow', 'Pain Split', 'Aqua Ring', 'Ingrain', 'Healing Wish', 'Lunar Dance']), PIVOT = new Set(['U-turn', 'Volt Switch']);
const handled = m => m[4] > 0 || !!UM[m[0]] || CALLS.has(m[0]) || (m[6] === 1 && (!!AIL[m[7]] || m[7] === 6 || !!AILX[m[7]])) || m[6] === 3 || m[6] === 5 || m[12].length > 0;
/* Angrep som ikke gjør noe i disse kampene ennå. De velges ikke automatisk, og trenerne bruker dem ikke. */
window.DEADMV = new Set(MOVES.map((m, i) => handled(m) && !['Splash', 'Helping Hand', 'Heal Pulse'].includes(m[0]) ? -1 : i).filter(i => i >= 0));
const METRO = MOVES.map((m, i) => m[4] > 0 && m[2] > 0 && !CHARGE[m[0]] && !BOOM.has(m[0]) ? i : -1).filter(i => i >= 0);

/* Ett angrep. k = plass i angrepslista (-1 = Struggle). ord = 0 hvis brukeren er først ut av to denne runden. */
function useMove(B, s, k, ev, ord) {
  const u = act(B, s), o = opp(s), t = act(B, o), N = nmOf(s, u), V = u.v, say = x => ev.push({ t: 'msg', s: x });
  if (u.hp <= 0) return;
  const wasProt = V.lastProt; V.lastProt = 0; V.dbond = 0; V.grudge = 0; V.mefirst = 0;
  const stop = () => { if (V.away) { V.away = 0; ev.push({ t: 'vanish', side: s, on: 0 }); } V.lock = null; V.roll = 0; V.chain = 0; V.cm = ''; };
  if (V.rech) { V.rech = 0; say(`${N} must recharge!`); return; }
  if (u.status === 'slp') {
    if (u.slp-- > 0) { say(`${N} is fast asleep.`); const nm = k >= 0 && u.mv[k] ? MOVES[u.mv[k].i][0] : ''; if (nm !== 'Sleep Talk' && nm !== 'Snore') return stop(); }
    else { u.status = ''; V.night = 0; ev.push({ t: 'status', side: s, st: '' }); say(`${N} woke up!`); }
  }
  if (u.status === 'frz') { const pre = k >= 0 && u.mv[k] ? MOVES[u.mv[k].i][0] : ''; if (!DEFROST.has(pre) && Math.random() < 0.8) { say(`${N} is frozen solid!`); return stop(); } u.status = ''; ev.push({ t: 'status', side: s, st: '' }); say(`${N} thawed out!`); }
  if (V.fl) { V.fl = 0; say(`${N} flinched!`); return stop(); }
  if (V.conf) {
    V.conf--;
    if (!V.conf) say(`${N} snapped out of its confusion!`);
    else {
      say(`${N} is confused!`);
      if (Math.random() < 0.33) {
        const d = Math.max(1, Math.floor((Math.floor((Math.floor(2 * u.lv / 5) + 2) * 40 * u.st[1] / u.st[2] / 50) + 2) * 0.92));
        u.hp = Math.max(0, u.hp - d); ev.push({ t: 'hit', side: s, hp: u.hp, e: 1 }); say('It hurt itself in its confusion!'); return stop();
      }
    }
  }
  if (u.status === 'par' && Math.random() < 0.25) { say(`${N} is paralyzed! It can't move!`); return stop(); }
  if (V.love && t.hp > 0 && Math.random() < 0.5) { say(`${N} is immobilized by love!`); return stop(); }
  if (V.enc && k >= 0) k = V.enc.k;
  const slot = k >= 0 ? u.mv[k] : null, cont = !!V.lock && V.lock.k === k;
  let m = slot ? MOVES[slot.i] : STRUGGLE, mi = slot ? slot.i : -1;
  if (slot && !cont) {
    if (V.dis && V.dis.k === k) { say(`${N}'s ${m[0]} is disabled!`); return; }
    if (V.taunt && m[4] === 0) { say(`${N} can't use ${m[0]} after the taunt!`); return; }
    if (V.torm && V.last === k && u.mv.length > 1) { say(`${N} can't use the same move twice in a row due to the torment!`); return; }
    if (V.hblock && (m[6] === 3 || m[6] === 8 || HEALS.has(m[0]))) { say(`${N} can't use ${m[0]} because of Heal Block!`); return; }
    if (t.hp > 0 && t.v.imprison && t.mv.some(x => x.i === slot.i)) { say(`${N} can't use its sealed ${m[0]}!`); return; }
    slot.pp = Math.max(0, slot.pp - (m[4] > 0 && t.hp > 0 && ab(t) === 'pressure' ? 2 : 1));
  }
  V.last = k; if (k >= 0) (V.used || (V.used = {}))[k] = 1;
  V.rage = m[0] === 'Rage' ? 1 : 0;
  /* Første runde av et to-runders angrep. I sterkt sollys lader Solar Beam ferdig med en gang. */
  if (CHARGE[m[0]] && !(cont && V.lock.kind === 'charge') && !(m[0] === 'Solar Beam' && B.wx.k === 'sun')) {
    ev.push({ t: 'anim', side: s, mi, self: 1, charge: 1 }); say(`${N} ${CHARGE[m[0]][0]}`); V.lock = { k, kind: 'charge' };
    if (CHARGE[m[0]][1]) { V.away = 1; ev.push({ t: 'vanish', side: s, on: 1 }); }
    if (m[0] === 'Skull Bash') changeStats(B, s, [[3, 1]], ev);
    return;
  }
  if (cont && V.lock.kind === 'charge') { V.lock = null; if (V.away) { V.away = 0; ev.push({ t: 'vanish', side: s, on: 0 }); } }
  /* Bide: lagrer skaden den tar i to runder og gir dobbelt tilbake. */
  if (m[0] === 'Bide') {
    if (!(cont && V.lock.kind === 'bide')) { V.lock = { k, kind: 'bide', n: 2 }; V.bide = 0; ev.push({ t: 'anim', side: s, mi, self: 1, charge: 1 }); say(`${N} is storing energy!`); return; }
    if (--V.lock.n > 0) { say(`${N} is storing energy!`); return; }
    const d0 = (V.bide || 0) * 2; V.lock = null; V.bide = null; say(`${N} unleashed its energy!`);
    if (!d0 || t.hp <= 0 || t.v.prot || t.v.away) { say('But it failed!'); return; }
    ev.push({ t: 'anim', side: s, mi, self: 0 }); t.hp -= Math.min(t.hp, d0); ev.push({ t: 'hit', side: o, hp: t.hp, e: 1 }); return;
  }
  /* Future Sight og Doom Desire: angrepet varsles nå og treffer den som står der to runder senere. */
  if (m[0] === 'Future Sight' || m[0] === 'Doom Desire') {
    say(`${N} used ${m[0]}!`); B.lastM[s] = mi;
    if (B.sd[o].fut) { say('But it failed!'); return; }
    B.sd[o].fut = { n: 3, u, mi, by: s }; ev.push({ t: 'anim', side: s, mi, self: 1, charge: 1 }); say(m[0] === 'Doom Desire' ? `${N} chose Doom Desire as its destiny!` : `${N} foresaw an attack!`); return;
  }
  say(`${N} used ${m[0]}!`);
  /* Angrep som kaller et annet angrep. */
  if (m[0] === 'Metronome') { mi = METRO[rnd(METRO.length)]; m = MOVES[mi]; say(`Waggling a finger let it use ${m[0]}!`); }
  else if (m[0] === 'Sleep Talk') { const c = u.mv.filter(x => MOVES[x.i][0] !== 'Sleep Talk' && !CHARGE[MOVES[x.i][0]]); if (u.status !== 'slp' || !c.length) return say('But it failed!'); mi = c[rnd(c.length)].i; m = MOVES[mi]; say(`${N} used ${m[0]}!`); }
  else if (m[0] === 'Me First') { const ti = B.intent ? B.intent[o] : -1; if (ti == null || ti < 0 || (B.moved && B.moved[o]) || MOVES[ti][4] === 0 || CHARGE[MOVES[ti][0]]) return say('But it failed!'); mi = ti; m = MOVES[mi]; V.mefirst = 1; say(`${N} used ${m[0]}!`); }
  else if (m[0] === 'Assist') { const c = (s === 'me' ? B.me : B.foe).filter(b => b !== u).flatMap(b => b.mv.map(x => x.i)).filter(i => !CALLS.has(MOVES[i][0]) && !CHARGE[MOVES[i][0]] && !DEADMV.has(i) && !['Protect', 'Detect', 'Endure', 'Transform', 'Mimic', 'Sketch', 'Baton Pass', 'Bide', 'Future Sight', 'Doom Desire'].includes(MOVES[i][0])); if (!c.length) return say('But it failed!'); mi = c[rnd(c.length)]; m = MOVES[mi]; say(`${N} used ${m[0]}!`); }
  else if (m[0] === 'Nature Power') { mi = MOVES.findIndex(x => x[0] === 'Tri Attack'); if (mi < 0) return say('But it failed!'); m = MOVES[mi]; say(`Nature Power turned into ${m[0]}!`); }
  else if (m[0] === 'Copycat' || m[0] === 'Mirror Move') { const lm = B.lastM[o]; if (lm == null || lm < 0 || MOVES[lm][4] === 0 || CHARGE[MOVES[lm][0]]) return say('But it failed!'); mi = lm; m = MOVES[mi]; say(`${N} used ${m[0]}!`); }
  B.lastM[s] = mi;
  m = mvEff(B, u, m);
  const atFoe = m[4] > 0 || m[0] === 'Heal Pulse' || (m[17] !== 1 && ![3, 10, 11].includes(m[6]) && (m[6] !== 13 || FOEU.has(m[0])) && !UM_SELF.has(m[0]));
  if (m[0] === 'Dream Eater' && t.status !== 'slp') { say('But it failed!'); return stop(); }
  if (m[0] === 'Snore' && u.status !== 'slp') { say('But it failed!'); return stop(); }
  if (m[0] === 'Fake Out' && V.t) { say('But it failed!'); return stop(); }
  if (m[0] === 'Sucker Punch') { const ti = B.intent ? B.intent[o] : -1; if ((B.moved && B.moved[o]) || ti == null || (ti >= 0 && MOVES[ti][4] === 0) || ti === -2) { say('But it failed!'); return stop(); } }
  if (m[0] === 'Last Resort' && !(u.mv.length > 1 && u.mv.every((x, j) => j === k || (V.used && V.used[j])))) { say('But it failed!'); return stop(); }
  if (m[0] === 'Spit Up' && !V.stock) { say('But it failed!'); return stop(); }
  if (m[0] === 'Synchronoise' && !t.ty.some(x => x >= 0 && u.ty.includes(x))) { say(`It doesn't affect ${lc(nmOf(o, t))}…`); return stop(); }
  if (m[0] === 'Focus Punch' && V.hit) { say(`${N} lost its focus and couldn't move!`); return stop(); }
  if (atFoe) {
    if (t.hp <= 0) { say('But there was no target…'); return stop(); }
    if (t.v.prot && m[0] !== 'Feint' && m[0] !== 'Shadow Force') { say(`${nmOf(o, t)} protected itself!`); return stop(); }
    let hit = true;
    if (V.lockon || (t.v.tele && m[6] !== 9) || (STOMP.has(m[0]) && t.v.mini && !t.v.away)) hit = true;
    else if (t.v.away && !reaches(m, t)) hit = false;
    else if (m[6] === 9) hit = u.lv >= t.lv && Math.random() < (30 + u.lv - t.lv) / 100;
    else if (m[3] && !((m[0] === 'Thunder' || m[0] === 'Hurricane') && B.wx.k === 'rain') && !(m[0] === 'Blizzard' && B.wx.k === 'hail')) hit = Math.random() < m[3] / 100 * accM(clampS(u.sg[6] - (t.v.fore ? Math.min(0, t.sg[7]) : t.sg[7]))) * (B.grav ? 5 / 3 : 1);
    V.lockon = 0;
    if (!hit) {
      say(t.v.away ? `${nmOf(o, t)} avoided the attack!` : `${N}'s attack missed!`);
      if (m[0] === 'High Jump Kick' || m[0] === 'Jump Kick') { u.hp = Math.max(0, u.hp - Math.floor(u.max / 2)); ev.push({ t: 'hit', side: s, hp: u.hp, e: 1 }); say(`${N} kept going and crashed!`); }
      return stop();
    }
  }
  if (m[4] > 0) {
    const fixed = FIXED[m[0]], te = m === STRUGGLE ? 1 : typeEff(m[1], t), e = fixed ? 1 : te;
    if (te === 0) { say(`It doesn't affect ${lc(nmOf(o, t))}…`); return stop(); }
    if (m !== STRUGGLE) { const imm = abImm(u, t, m); if (imm) { abBlock(B, o, t, imm, ev); return stop(); } }
    if (fixed && !(fixed(u, t, B) > 0)) { say('But it failed!'); return stop(); }
    if (ROLL.has(m[0])) V.roll = cont ? (V.roll || 0) + 1 : 0;
    if (CHAIN.has(m[0])) V.chain = V.cm === m[0] ? Math.min(m[0] === 'Echoed Voice' ? 4 : 2, (V.chain || 0) + 1) : 0;
    V.cm = CHAIN.has(m[0]) ? m[0] : '';
    ev.push({ t: 'anim', side: s, mi, self: 0, roll: V.roll || 0, ty: m[1] });
    const bu = m[0] === 'Beat Up' ? beatUp(B, u) : null, hits = hitsFor(B, u, m), cs = Math.min(3, m[16] + (V.focus ? 2 : 0));
    let total = 0, n = 0, crit = false, sub = false, held = false, sturdy = false;
    for (; n < hits && t.hp > 0 && u.hp > 0; n++) {
      /* Kritisk treff: 1 av 24 til vanlig, 1 av 8 for angrep med høy sjanse, og halvparten eller alltid over det. Skaden er × 1,5. */
      crit = !fixed && m[6] !== 9 && m !== STRUGGLE && !B.sd[o].lucky && Math.random() < [1 / 24, 1 / 8, 1 / 2, 1][cs];
      /* Beat Up har én styrke per lagkamerat, og Triple Kick slår hardere for hvert spark (10, 20, 30). */
      const pw = bu ? bu[n] : m[0] === 'Triple Kick' ? 10 * (n + 1) : 0;
      let d = m[6] === 9 ? t.hp : fixed ? fixed(u, t, B) : m === STRUGGLE ? Math.max(1, Math.floor(dmgOf(B, u, t, m, 50, false, true) / (u.ty.includes(0) ? 1.5 : 1) / (typeEff(0, t) || 1))) : dmgOf(B, u, t, m, pw || powOf(B, u, t, m, ord), crit, true);
      if (fixed && d <= 0) { say('But it failed!'); return stop(); }
      if (t.v.sub) {
        t.v.sub -= d; sub = true; ev.push({ t: 'hit', side: o, hp: t.hp, e, crit, sub: 1 });
        if (t.v.sub <= 0) { t.v.sub = 0; ev.push({ t: 'sub', side: o, on: 0 }); say(`${nmOf(o, t)}'s substitute faded!`); }
        continue;
      }
      d = Math.min(t.hp, d);
      if (d >= t.hp && (t.v.endure || m[0] === 'False Swipe')) { d = t.hp - 1; held = !!t.v.endure; }
      else if (d >= t.hp && t.hp === t.max && t.max > 1 && ab(t) === 'sturdy' && !mold(u)) { d = t.hp - 1; sturdy = true; }
      t.hp -= d; total += d; t.v.hit = { d: (t.v.hit ? t.v.hit.d : 0) + d, p: m[4] }; if (t.v.bide != null) t.v.bide += d;
      ev.push({ t: 'hit', side: o, hp: t.hp, e, crit });
    }
    if (crit) say('A critical hit!');
    if (total > 0 && t.hp > 0 && t.v.rage) { say(`${nmOf(o, t)}'s rage is building!`); changeStats(B, o, [[2, 1]], ev); }
    if (m[0] === 'Spit Up') V.stock = 0;
    if (m[6] === 9) say("It's a one-hit KO!");
    else if (!fixed && m !== STRUGGLE) { if (e > 1) say("It's super effective!"); else if (e < 1) say("It's not very effective…"); }
    if (hits > 1) say(`Hit ${n} time${n > 1 ? 's' : ''}!`);
    if (held) say(`${nmOf(o, t)} endured the hit!`);
    if (sturdy) abSay(ev, o, t, `${nmOf(o, t)} endured the hit with Sturdy!`);
    if (total > 0 && !sub) abHit(B, s, o, u, t, m, ev);
    if (t.status === 'frz' && (m[1] === 9 || m[0] === 'Scald') && t.hp > 0) { t.status = ''; ev.push({ t: 'status', side: o, st: '' }); say(`${nmOf(o, t)} thawed out!`); }
    /* Smack Down slår målet i bakken: Ground-angrep treffer det, og det mister svevingen. Den som var i lufta, kommer ned. */
    if (m[0] === 'Smack Down' && t.hp > 0 && (total > 0 || sub)) { const up = t.ty.includes(2) || t.v.mag || t.v.tele || t.v.away; t.v.smack = 1; t.v.mag = 0; t.v.tele = 0; if (t.v.away) { t.v.away = 0; t.v.lock = null; ev.push({ t: 'vanish', side: o, on: 0 }); } if (up) say(`${nmOf(o, t)} fell straight down!`); }
    if (m[9] > 0 && total > 0 && u.hp < u.max) { u.hp = Math.min(u.max, u.hp + Math.max(1, Math.floor(total * m[9] / 100))); ev.push({ t: 'heal', side: s, hp: u.hp }); say(`${nmOf(o, t)} had its energy drained!`); }
    if (m[9] < 0 && total > 0) { u.hp = Math.max(0, u.hp - Math.max(1, m === STRUGGLE ? Math.floor(u.max / 4) : Math.floor(total * -m[9] / 100))); ev.push({ t: 'hit', side: s, hp: u.hp, e: 1, quiet: 1 }); say(`${N} is hit with recoil!`); }
    if (RECHARGE.has(m[0]) && t.hp > 0) V.rech = 1;
    if (BOOM.has(m[0]) || m[0] === 'Final Gambit') { u.hp = 0; ev.push({ t: 'hit', side: s, hp: 0, e: 1, quiet: 1 }); }
    if (u.hp > 0 && m[6] === 7 && m[12].length && Math.random() * 100 < (m[11] || 100)) changeStats(B, s, m[12], ev);
    if (t.hp > 0 && !sub) {
      if (m[7] > 0 && m[7] <= 6 && Math.random() * 100 < (m[8] || 100)) applyAil(B, o, m[7], ev, false, m[0] === 'Poison Fang');
      if (m[0] === 'Tri Attack' && Math.random() < 0.2) applyAil(B, o, [1, 4, 3][rnd(3)], ev, false);
      if (m[0] === 'Secret Power' && Math.random() < 0.3) applyAil(B, o, 1, ev, false);
      if (m[7] === 8 && !t.v.trap) { t.v.trap = 4 + rnd(2); t.v.trapn = m[0]; t.v.trapBy = u; say(`${nmOf(o, t)} was trapped by ${m[0]}!`); }
      if (m[6] === 6 && m[12].length && Math.random() * 100 < (m[11] || 100)) changeStats(B, o, m[12], ev, true);
      if (m[15] && ord === 0 && Math.random() * 100 < m[15]) t.v.fl = 1;
      if ((m[0] === 'Wake-Up Slap' && t.status === 'slp') || (m[0] === 'Smelling Salts' && t.status === 'par')) { t.status = ''; ev.push({ t: 'status', side: o, st: '' }); }
      if (m[0] === 'Clear Smog') { t.sg = Z8(); say(`${nmOf(o, t)}'s stat changes were removed!`); }
      if (m[0] === 'Dragon Tail' || m[0] === 'Circle Throw') forceOut(B, o, ev, true);
    }
    if (m[0] === 'Rapid Spin' && u.hp > 0) { const sd = B.sd[s]; if (sd.spikes || sd.tsp || sd.rock || V.seed || V.trap) say(`${N} blew away the hazards!`); sd.spikes = sd.tsp = sd.rock = 0; V.seed = 0; V.trap = 0; }
    if (m[0] === 'Brick Break') { const sd = B.sd[o]; if (sd.ref || sd.ls) { sd.ref = sd.ls = 0; say('It shattered the barrier!'); } }
    if (m[0] === 'Pay Day' && s === 'me') { B.pay += u.lv * 2; say('Coins were scattered everywhere!'); }
    if (ROLL.has(m[0])) { if (V.roll < 4 && u.hp > 0) V.lock = { k, kind: 'roll' }; else { V.lock = null; V.roll = 0; } }
    if (RAGE.has(m[0]) && u.hp > 0) {
      if (!cont) V.lock = { k, kind: 'rage', n: 1 + rnd(2) };
      else if (--V.lock.n <= 0) { V.lock = null; if (!V.conf) { V.conf = 2 + rnd(4); say(`${N} became confused due to fatigue!`); } }
    }
    if (m[0] === 'Uproar' && u.hp > 0) { if (!cont) { V.lock = { k, kind: 'uproar', n: 2 }; say(`${N} caused an uproar!`); } else if (--V.lock.n <= 0) { V.lock = null; say(`${N} calmed down.`); } }
    if (t.hp <= 0 && t.v.grudge && slot && u.hp > 0) { slot.pp = 0; say(`${N}'s ${m[0]} lost all its PP due to the grudge!`); }
    if (PIVOT.has(m[0]) && (total > 0 || sub) && u.hp > 0 && (s === 'me' ? B.me : B.foe).some(b => b !== u && b.hp > 0)) B.pivot = s;
    if (t.hp <= 0 && t.v.dbond && u.hp > 0) { u.hp = 0; ev.push({ t: 'hit', side: s, hp: 0, e: 1, quiet: 1 }); say(`${nmOf(o, t)} took its attacker down with it!`); }
    return;
  }
  /* Statusangrep */
  ev.push({ t: 'anim', side: s, mi, self: atFoe ? 0 : 1 });
  let c = { B, s, o, u, t, V, N, ev, say, m, wasProt };
  if (atFoe && t.v.mcoat && !UM_SELF.has(m[0])) { say(`${N}'s ${m[0]} was bounced back by Magic Coat!`); c = { B, s: o, o: s, u: t, t: u, V: t.v, N: nmOf(o, t), ev, say, m, wasProt: 0 }; }
  else if (!atFoe && t.hp > 0 && t.v.snatch && (m[6] === 2 || m[6] === 3)) { t.v.snatch = 0; say(`${nmOf(o, t)} snatched ${lc(N)}'s move!`); c = { B, s: o, o: s, u: t, t: u, V: t.v, N: nmOf(o, t), ev, say, m, wasProt: 0 }; }
  return statusMove(c);
}
function statusMove(c) {
  const { B, s, o, u, t, N, ev, say, m } = c;
  if (m[0] === 'Thunder Wave' && typeEff(m[1], t) === 0) return say(`It doesn't affect ${lc(nmOf(o, t))}…`);
  if (UM[m[0]]) UM[m[0]](c);
  else if (m[6] === 1) { if (AILX[m[7]]) AILX[m[7]](c); else applyAil(B, o, m[7], ev, true, m[0] === 'Toxic'); }
  else if (m[6] === 3) {
    /* Heal Pulse helbreder målet, og i enkeltkamp er det motstanderen. Alle andre helbreder brukeren. */
    const pulse = m[0] === 'Heal Pulse', w = pulse ? t : u, ws = pulse ? o : s;
    if (w.hp <= 0 || w.hp >= w.max || (pulse && (w.v.hblock || w.v.sub))) return say('But it failed!');
    const sunny = ['Synthesis', 'Moonlight', 'Morning Sun'].includes(m[0]), pct = sunny && B.wx.k ? (B.wx.k === 'sun' ? 66 : 25) : m[10] || 50;
    w.hp = Math.min(w.max, w.hp + Math.max(1, Math.floor(w.max * pct / 100))); ev.push({ t: 'heal', side: ws, hp: w.hp }); say(`${nmOf(ws, w)} regained health!`);
    if (m[0] === 'Roost') u.v.roost = 1;
  }
  else if (m[6] === 5) { changeStats(B, o, m[12], ev, true); applyAil(B, o, 6, ev, false); }
  else if (m[12].length) {
    /* Growth gir dobbelt i sterkt sollys. Minimize gjør brukeren sårbar for tramp. */
    changeStats(B, m[17] === 1 ? s : o, m[0] === 'Growth' && B.wx.k === 'sun' ? m[12].map(x => [x[0], x[1] * 2]) : m[12], ev, m[17] !== 1);
    if (m[0] === 'Minimize') u.v.mini = 1;
  }
  else say('But nothing happened!');
}
/* Unike angrep som virker på brukeren eller banen, selv om dataene ikke sier «seg selv». */
const UM_SELF = new Set(['Curse', 'Trick Room', 'Water Sport', 'Mud Sport', 'Haze', 'Wish', 'Heal Bell', 'Aromatherapy', 'Roar', 'Whirlwind', 'Spikes', 'Toxic Spikes', 'Stealth Rock']);

/* Etter hvert angrep: hvem har besvimt, og er kampen over? Beseirede motstandere telles til XP-oppgjøret etter kampen. */
function settle(B, ev) {
  for (const s of ['foe', 'me']) {
    const b = act(B, s);
    if (b.hp <= 0 && !b.out) { b.out = 1; b.status = ''; ev.push({ t: 'faint', side: s }, { t: 'msg', s: `${nmOf(s, b)} fainted!` }); B.sd[s].fell = B.turn; if (s === 'foe') B.kos.push({ id: b.id, lv: b.lv }); }
  }
  if (B.over) return;
  if (!B.me.some(x => x.hp > 0)) B.over = 'loss';
  else if (!B.foe.some(x => x.hp > 0)) B.over = 'win';
}
/* Slutten av runden: vær, frø, gift, feller og alt som teller ned. */
function endTurn(B, ev) {
  const say = x => ev.push({ t: 'msg', s: x });
  const hurt = (s, b, d, x) => { b.hp = Math.max(0, b.hp - Math.max(1, Math.floor(d))); ev.push({ t: 'hit', side: s, hp: b.hp, e: 1, quiet: 1 }, { t: 'msg', s: x }); settle(B, ev); };
  const heal = (s, b, d, x) => { if (b.hp >= b.max || b.hp <= 0) return; b.hp = Math.min(b.max, b.hp + Math.max(1, Math.floor(d))); ev.push({ t: 'heal', side: s, hp: b.hp }, { t: 'msg', s: x }); };
  const sides = spdB(B, act(B, 'me')) >= spdB(B, act(B, 'foe')) ? ['me', 'foe'] : ['foe', 'me'];
  if (B.wx.k) {
    const k = B.wx.k;
    if (--B.wx.n <= 0) { B.wx = { k: '', n: 0 }; ev.push({ t: 'wx', k: '' }); say(WXTXT[k][1]); }
    else if (k === 'sand' || k === 'hail') for (const s of sides) {
      const b = act(B, s); if (b.hp <= 0 || B.over || b.v.away) continue;
      if (k === 'sand' ? !(b.ty.includes(5) || b.ty.includes(4) || b.ty.includes(8)) : !b.ty.includes(14)) hurt(s, b, b.max / 16, `${nmOf(s, b)} is ${k === 'sand' ? 'buffeted by the sandstorm' : 'pelted by hail'}!`);
    }
  }
  for (const s of sides) {
    if (B.over) break;
    const b = act(B, s), o = opp(s), f = act(B, o), N = nmOf(s, b), V = b.v, sd = B.sd[s];
    if (b.hp <= 0) continue;
    if (sd.fut && --sd.fut.n <= 0) {
      const F = sd.fut, fm = MOVES[F.mi]; sd.fut = null; say(`${N} took the ${fm[0]} attack!`);
      if (typeEff(fm[1], b) === 0) say(`It doesn't affect ${lc(N)}…`);
      else { ev.push({ t: 'anim', side: o, mi: F.mi, self: 0 }); const e = typeEff(fm[1], b), d = Math.min(b.hp, dmgOf(B, F.u, b, fm, fm[2], false, true)); b.hp -= d; ev.push({ t: 'hit', side: s, hp: b.hp, e }); if (e > 1) say("It's super effective!"); else if (e < 1) say("It's not very effective…"); settle(B, ev); if (b.hp <= 0) continue; }
    }
    if (V.trap && V.trapBy && (V.trapBy.hp <= 0 || f !== V.trapBy)) { V.trap = 0; say(`${N} was freed from ${V.trapn}!`); }
    if (sd.wish && --sd.wish.n <= 0) { heal(s, b, sd.wish.hp, `${N}'s wish came true!`); sd.wish = null; }
    if (V.ingrain && !V.hblock) heal(s, b, b.max / 16, `${N} absorbed nutrients with its roots!`);
    if (V.aqua && !V.hblock) heal(s, b, b.max / 16, `A veil of water restored ${lc(N)}'s HP!`);
    if (V.seed && f.hp > 0) {
      const d = Math.min(b.hp, Math.max(1, Math.floor(b.max / 8)));
      hurt(s, b, d, `${N}'s health is sapped by Leech Seed!`);
      if (f.hp < f.max && !f.v.hblock) { f.hp = Math.min(f.max, f.hp + d); ev.push({ t: 'heal', side: o, hp: f.hp }); }
      if (b.hp <= 0) continue;
    }
    if (b.status === 'psn') { hurt(s, b, b.tox ? b.max * Math.min(15, b.tox++) / 16 : b.max / 8, `${N} is hurt by poison!`); if (b.hp <= 0) continue; }
    if (b.status === 'brn') { hurt(s, b, b.max / 8, `${N} is hurt by its burn!`); if (b.hp <= 0) continue; }
    if (V.night && b.status === 'slp') { hurt(s, b, b.max / 4, `${N} is locked in a nightmare!`); if (b.hp <= 0) continue; }
    if (V.curse) { hurt(s, b, b.max / 4, `${N} is afflicted by the curse!`); if (b.hp <= 0) continue; }
    if (V.trap) { if (--V.trap <= 0) say(`${N} was freed from ${V.trapn}!`); else { hurt(s, b, b.max / 16, `${N} is hurt by ${V.trapn}!`); if (b.hp <= 0) continue; } }
    if (V.yawn && --V.yawn <= 0 && ailOk(b, 'slp') && !sd.safe) { b.status = 'slp'; b.slp = 1 + rnd(3); ev.push({ t: 'status', side: s, st: 'slp', fx: 'slp' }); say(`${N} fell asleep!`); }
    if (V.perish) { V.perish--; say(`${N}'s perish count fell to ${V.perish}!`); if (!V.perish) { b.hp = 0; ev.push({ t: 'hit', side: s, hp: 0, e: 1, quiet: 1 }); settle(B, ev); continue; } }
    if (V.taunt && --V.taunt <= 0) say(`${N}'s taunt wore off!`);
    if (V.enc && --V.enc.n <= 0) { V.enc = null; say(`${N}'s encore ended!`); }
    if (V.dis && --V.dis.n <= 0) { V.dis = null; say(`${N} is no longer disabled!`); }
    if (V.mag) V.mag--; if (V.tele) V.tele--; if (V.charge) V.charge--;
    if (V.hblock && --V.hblock <= 0) say(`${N}'s Heal Block wore off!`);
    if (V.embargo && --V.embargo <= 0) say(`${N} can use items again!`);
    const ba = ab(b);
    if (ba === 'speedboost' && b.sg[5] < 6) { abSay(ev, s, b); changeStats(B, s, [[6, 1]], ev); }
    else if (ba === 'shedskin' && b.status && Math.random() < 0.33) { b.status = ''; b.tox = 0; ev.push({ t: 'status', side: s, st: '' }); abSay(ev, s, b, `${N}'s Shed Skin cured its status!`); }
    else if (ba === 'baddreams' && f.hp > 0 && f.status === 'slp') { abSay(ev, s, b); hurt(o, f, f.max / 8, `${nmOf(o, f)} is tormented!`); }
    if (V.slow && --V.slow <= 0) say(`${N} finally got its act together!`);
    V.t = (V.t || 0) + 1;
  }
  for (const s of ['me', 'foe']) { const sd = B.sd[s]; for (const [k, x] of [['ref', 'Reflect'], ['ls', 'Light Screen'], ['safe', 'Safeguard'], ['mist', 'Mist'], ['tail', 'Tailwind'], ['lucky', 'Lucky Chant']]) if (sd[k] && --sd[k] <= 0 && !B.over) say(`${s === 'me' ? 'Your' : "The foe's"} ${x} wore off!`); }
  if (B.troom && --B.troom <= 0 && !B.over) say('The twisted dimensions returned to normal!');
  if (B.mud) B.mud--; if (B.wsp) B.wsp--;
  if (B.grav && --B.grav <= 0 && !B.over) say('Gravity returned to normal!');
  if (B.mroom && --B.mroom <= 0 && !B.over) say('Magic Room wore off, and held item effects returned to normal!');
  if (B.wroom && --B.wroom <= 0 && !B.over) say('Wonder Room wore off, and Defense and Sp. Def stats returned to normal!');
  for (const b of [...B.me, ...B.foe]) { b.v.prot = 0; b.v.endure = 0; b.v.fl = 0; b.v.hit = null; b.v.mcoat = 0; b.v.snatch = 0; b.v.roost = 0; }
  /* I en raid kjemper stedet med (league.js). */
  if (B.raid && !B.over && typeof raidField === 'function') raidField(B, ev);
}

/* ---------- Motstanderens valg ---------- */
/* Forventet skade (i HP) for ett angrep og det beste angrepet u har mot t. */
function estDmg(B, u, t, m) {
  if (m[4] === 0) return 0;
  m = mvEff(B, u, m);
  if (FIXED[m[0]]) return typeEff(m[1], t) === 0 && m[0] !== 'Bide' ? 0 : FIXED[m[0]](u, t, B) || 0;
  if (typeEff(m[1], t) === 0 || abImm(u, t, m)) return 0;
  if (m[6] === 9) return u.lv >= t.lv ? t.hp * 0.3 : 0;
  let d = dmgOf(B, u, t, m, powOf(B, u, t, m, 1), false, false) * hitsFor(B, u, m, true) * (m[3] ? m[3] / 100 : 1);
  if (CHARGE[m[0]] || RECHARGE.has(m[0])) d *= 0.6;
  if (m[0] === 'Focus Punch') d *= 0.4;
  if ((m[0] === 'Dream Eater' && t.status !== 'slp') || (m[0] === 'Snore' && u.status !== 'slp') || (m[0] === 'Fake Out' && u.v.t)) d = 0;
  return d;
}
const bestDmg = (B, u, t) => u.mv.reduce((best, x) => x.pp > 0 ? Math.max(best, estDmg(B, u, t, MOVES[x.i])) : best, 0);
/* Poeng for et statusangrep: hvor nyttig er det akkurat nå? */
function aiStatus(B, u, t, m) {
  const V = u.v, tv = t.v, sdU = B.sd.foe, sdT = B.sd.me, n = m[0], low = u.hp < u.max * 0.45, safe = bestDmg(B, t, u) < u.hp * 0.5;
  const bench = B.me.filter(x => x.hp > 0).length - 1;
  switch (n) {
    case 'Protect': case 'Detect': return V.lastProt ? 0 : tv.lock && tv.lock.kind === 'charge' ? 55 : t.status === 'psn' || t.status === 'brn' || tv.seed || tv.curse ? 26 : 7;
    case 'Endure': return 0;
    case 'Rest': return u.hp < u.max * 0.4 ? 60 : 0;
    case 'Rain Dance': return B.wx.k === 'rain' ? 0 : u.ty.includes(10) ? 36 : 6;
    case 'Sunny Day': return B.wx.k === 'sun' ? 0 : u.ty.includes(9) ? 36 : 6;
    case 'Sandstorm': return B.wx.k === 'sand' ? 0 : u.ty.includes(5) || u.ty.includes(4) || u.ty.includes(8) ? 30 : 4;
    case 'Hail': return B.wx.k === 'hail' ? 0 : u.ty.includes(14) ? 30 : 4;
    case 'Reflect': return sdU.ref ? 0 : 30; case 'Light Screen': return sdU.ls ? 0 : 30;
    case 'Safeguard': return sdU.safe ? 0 : 12; case 'Mist': return sdU.mist ? 0 : 6; case 'Lucky Chant': return sdU.lucky ? 0 : 6;
    case 'Tailwind': return sdU.tail ? 0 : spdB(B, u) < spdB(B, t) ? 30 : 8;
    case 'Stealth Rock': return sdT.rock || bench < 2 ? 0 : 36; case 'Spikes': return sdT.spikes >= 2 || bench < 2 ? 0 : 26; case 'Toxic Spikes': return sdT.tsp >= 2 || bench < 2 ? 0 : 22;
    case 'Roar': case 'Whirlwind': return bench && boosts(t) >= 2 ? 50 : 3;
    case 'Haze': return boosts(t) >= 2 ? 48 : 0;
    case 'Focus Energy': return V.focus ? 0 : safe ? 14 : 4;
    case 'Curse': return u.ty.includes(7) ? (tv.curse || low ? 0 : 30) : u.sg[1] >= 2 ? 0 : safe ? 34 : 6;
    case 'Taunt': return tv.taunt ? 0 : t.mv.some(x => MOVES[x.i][4] === 0) ? 24 : 4;
    case 'Encore': return !tv.enc && tv.last != null && tv.last >= 0 && MOVES[t.mv[tv.last].i][4] === 0 ? 42 : 2;
    case 'Disable': return !tv.dis && tv.last != null && tv.last >= 0 ? 22 : 0;
    case 'Aqua Ring': return V.aqua ? 0 : 14; case 'Ingrain': return V.ingrain ? 0 : 14;
    case 'Mean Look': case 'Block': case 'Spider Web': return tv.nosw ? 0 : 6;
    case 'Psych Up': return boosts(t) >= 2 ? 36 : 0;
    case 'Lock-On': case 'Mind Reader': return 4;
    case 'Destiny Bond': return u.hp < u.max * 0.3 ? 46 : 0;
    case 'Refresh': return u.status && u.status !== 'slp' ? 34 : 0;
    case 'Heal Bell': case 'Aromatherapy': return B.foe.some(x => x.hp > 0 && x.status) ? 32 : 0;
    case 'Magnet Rise': return V.mag ? 0 : t.mv.some(x => MOVES[x.i][1] === 4 && MOVES[x.i][4] > 0) ? 32 : 4;
    case 'Belly Drum': return u.hp > u.max * 0.8 && u.sg[1] < 2 && safe ? 40 : 0;
    case 'Wish': return sdU.wish || u.hp > u.max * 0.6 ? 0 : 30;
    case 'Pain Split': return t.hp - u.hp > u.max * 0.3 ? 46 : 0;
    case 'Substitute': return V.sub || u.hp < u.max * 0.35 ? 0 : 22;
    case 'Trick Room': return !B.troom && spdB(B, u) < spdB(B, t) ? 32 : 0;
    case 'Sleep Talk': return u.status === 'slp' ? 70 : 0;
    case 'Metronome': return 24; case 'Copycat': case 'Mirror Move': return B.lastM.me != null && B.lastM.me >= 0 && MOVES[B.lastM.me][4] > 0 ? 18 : 0;
    case 'Memento': return u.hp < u.max * 0.15 ? 22 : 0;
    case 'Acupressure': return safe ? 20 : 5;
  }
  if (UM[n]) return 5;
  if (m[6] === 1) {
    if (tv.sub || sdT.safe) return 0;
    const a = m[7];
    if (a <= 5) { if (!ailOk(t, AIL[a]) || (n === 'Thunder Wave' && typeEff(m[1], t) === 0)) return 0; return (a === 2 ? 56 : a === 1 ? (spdB(B, t) > spdB(B, u) ? 46 : 34) : a === 4 ? (t.st[1] > t.st[3] ? 42 : 28) : n === 'Toxic' ? 40 : 28) * (m[3] ? m[3] / 100 : 1); }
    if (a === 6) return tv.conf ? 0 : 24;
    if (a === 18) return tv.seed || t.ty.includes(11) ? 0 : 40;
    if (a === 14) return t.status || tv.yawn ? 0 : 34;
    if (a === 7) return tv.love || !canLove(u, t) ? 0 : 20;
    if (a === 9) return t.status === 'slp' && !tv.night ? 40 : 0;
    if (a === 20) return 4;
    return 0;
  }
  if (m[6] === 3) return low ? 66 : u.hp < u.max * 0.7 ? 14 : 0;
  if (m[6] === 5) return tv.conf ? 0 : 24;
  if (m[12].length) {
    const own = m[17] === 1, cur = (own ? u : t).sg[m[12][0][0] - 1];
    if (own) return cur >= 2 ? 0 : safe && u.hp > u.max * 0.55 ? 40 : 7;
    return cur <= -2 || tv.sub || sdT.mist || B.turn > 8 ? 0 : 16;
  }
  return 0;
}
/* Gir { t: 'move', k } eller { t: 'switch', i }. skill (0–1) styrer hvor ofte det beste velges, og om treneren bytter ut. */
function aiAct(B) {
  const u = B.foe[B.b], t = B.me[B.a], V = u.v, sk = B.tr.skill;
  if (V.rech || V.lock) return { t: 'move', k: V.lock ? V.lock.k : 0 };
  const bench = B.foe.map((x, i) => i).filter(i => i !== B.b && B.foe[i].hp > 0 && !(B.tr.boss && i === B.foe.length - 1 && B.foe.filter(x => x.hp > 0).length > 2));
  /* Bytte: når motstanderen truer hardt, treneren ikke kan slå tilbake, og noen på benken står klart bedre. */
  if (bench.length && sk >= 0.6 && !stuck(B, 'foe') && B.turn - B.aiSw > 2 && t.hp > 0) {
    const threat = bestDmg(B, t, u) / u.hp, mine = bestDmg(B, u, t) / t.hp;
    if (threat >= 0.55 && mine < 0.5 && u.hp > u.max * 0.25) {
      let best = -1, bs = 0;
      for (const i of bench) { const c = B.foe[i], inc = bestDmg(B, t, c) / c.hp, out = bestDmg(B, c, t) / t.hp, sc = out - inc * 1.2; if (inc < 0.34 && (out > mine + 0.15 || inc < threat * 0.4) && (best < 0 || sc > bs)) { best = i; bs = sc; } }
      if (best >= 0 && Math.random() < sk - 0.25) return { t: 'switch', i: best };
    }
  }
  const opts = [];
  u.mv.forEach((x, k) => {
    if (x.pp <= 0 || (V.dis && V.dis.k === k) || (V.enc && V.enc.k !== k) || (V.torm && V.last === k && u.mv.length > 1) || (t.v.imprison && t.mv.some(y => y.i === x.i))) return;
    const m = MOVES[x.i]; let sc;
    if (m[4] > 0) {
      const d = estDmg(B, u, t, m);
      sc = Math.min(100, d / t.hp * 100) + (d >= t.hp ? 30 + (m[5] > 0 ? 12 : 0) : 0);
      if (t.v.away) sc = 1;
      if (BOOM.has(m[0]) || m[0] === 'Final Gambit') sc = u.hp < u.max * 0.25 ? sc * 0.8 : sc * 0.12;
      if (m[9] < 0 && u.hp < u.max * 0.2) sc *= 0.8;
    } else sc = V.taunt || DEADMV.has(x.i) ? 0 : aiStatus(B, u, t, m);
    opts.push([k, sc * (0.9 + Math.random() * 0.2)]);
  });
  if (!opts.length) return { t: 'move', k: -1 };
  opts.sort((a, b) => b[1] - a[1]);
  if (Math.random() < sk || opts.length === 1) return { t: 'move', k: opts[0][0] };
  const ok = opts.filter(x => x[1] > 0), pool = ok.length ? ok : opts, tot = pool.reduce((a, x) => a + x[1] * x[1] + 1, 0);
  let r = Math.random() * tot;
  for (const x of pool) { r -= x[1] * x[1] + 1; if (r <= 0) return { t: 'move', k: x[0] }; }
  return { t: 'move', k: pool[0][0] };
}
/* Hvem sendes inn etter en besvimelse: dyktige trenere velger den som står best mot din Pokémon, og bosser sparer esset til slutt. */
function aiNext(B) {
  const alive = B.foe.map((x, i) => i).filter(i => B.foe[i].hp > 0), t = B.me[B.a];
  if (alive.length < 2 || B.tr.skill < 0.6 || t.hp <= 0) return alive[0];
  const c = B.tr.boss ? alive.filter(i => i !== B.foe.length - 1) : alive;
  let best = c[0], bs = -9;
  for (const i of c) { const f = B.foe[i], sc = bestDmg(B, f, t) / t.hp - bestDmg(B, t, f) / f.hp + Math.random() * 0.25; if (sc > bs) { bs = sc; best = i; } }
  return best;
}

/* ---------- Runden ---------- */
/* Det spilleren kan gjøre akkurat nå. Skjermen bruker disse til å tegne menyen. */
const autoAct = B => { const V = B.me[B.a].v; return V.rech || V.lock ? { t: 'move', k: V.lock ? V.lock.k : 0 } : null; };
const canSwitch = B => { const b = B.me[B.a], V = b.v; return b.hp <= 0 || !(stuck(B, 'me') || V.lock || V.rech); };
const moveOk = (B, k) => { const b = B.me[B.a], V = b.v, x = b.mv[k]; const f = B.foe[B.b], m = x ? MOVES[x.i] : null; return !!x && x.pp > 0 && !(V.dis && V.dis.k === k) && !(V.taunt && m[4] === 0) && (!V.enc || V.enc.k === k) && !(V.torm && V.last === k && b.mv.length > 1) && !(V.hblock && (m[6] === 3 || m[6] === 8 || HEALS.has(m[0]))) && !(f.hp > 0 && f.v.imprison && f.mv.some(y => y.i === x.i)); };
/* Én runde. a = { t: 'move', k } (k = -1 er Struggle) eller { t: 'switch', i }. */
/* Veska: gjenstander fra butikken brukt i kamp. Å bruke en koster turen din, akkurat som et bytte.
   hp = hvor mye som helbredes, cure = fjerner status, rev = vekker en som har besvimt (andel av HP). */
const BAG = { potion: { hp: 20 }, super: { hp: 60 }, hyper: { hp: 120 }, maxp: { hp: 9999 }, heal: { cure: 1 }, revive: { rev: 0.5 }, maxrev: { rev: 1 } };
function itemOk(B, k, i) {
  const d = BAG[k], b = B.me[i]; if (!d || !b || B.mroom || (i === B.a && b.v.embargo)) return false;
  if (d.rev) return b.hp <= 0;
  if (b.hp <= 0) return false;
  return d.cure ? !!b.status || !!b.v.conf : b.hp < b.max;
}
function useItem(B, k, i, ev) {
  const d = BAG[k], b = B.me[i], on = i === B.a, nm = SHOP[k].n, say = s => ev.push({ t: 'msg', s });
  say(`You used ${/^[AEIOU]/.test(nm) ? 'an' : 'a'} ${nm} on ${b.name}.`);
  if (d.rev) { b.hp = Math.max(1, Math.floor(b.max * d.rev)); b.out = 0; b.status = ''; b.tox = 0; b.slp = 0; b.sg = Z8(); b.v = {}; say(`${b.name} is back on its feet!`); }
  else if (d.cure) { b.status = ''; b.tox = 0; b.slp = 0; b.v.conf = 0; if (on) ev.push({ t: 'status', side: 'me', st: '' }); say(`${b.name} is healthy again.`); }
  else { const h = Math.min(b.max - b.hp, d.hp); b.hp += h; if (on) ev.push({ t: 'heal', side: 'me', hp: b.hp }); say(`${b.name} recovered ${h} HP.`); }
  B.bag = Math.max(0, (B.bag || 0) - 1);
}
/* Resten av runden etter at angrepene i køen q er gjort. Bytter spilleren ut midt i runden (U-turn, Volt Switch, Baton Pass),
   stopper runden her til den nye er valgt (B.need = 2), og sendIn gjør resten. Motstanderen velger selv og runden går videre. */
function runQueue(B, q, ev) {
  while (q.length) {
    const [s, k, who, ord] = q.shift();
    if (B.over || who.hp <= 0 || act(B, s) !== who) continue;
    useMove(B, s, k, ev, ord); B.moved[s] = 1; settle(B, ev);
    if (B.pivot) {
      const side = B.pivot; B.pivot = null;
      if (!B.over && act(B, side).hp > 0) {
        if (side === 'me') { if (!B.pass) ev.push({ t: 'msg', s: `${act(B, 'me').name} comes back to you!`, hold: 500 }); B.rest = q; B.need = 2; return false; }
        const c = B.foe.map((x, i) => i).filter(i => i !== B.b && B.foe[i].hp > 0), t = B.me[B.a];
        if (c.length) { let best = c[0], bs = -9; for (const i of c) { const f = B.foe[i], sc = bestDmg(B, f, t) / Math.max(1, t.hp) - bestDmg(B, t, f) / f.hp; if (sc > bs) { bs = sc; best = i; } } swapTo(B, 'foe', best, ev); B.aiSw = B.turn; }
      } else B.pass = null;
    }
  }
  return true;
}
function runTurn(B, a) {
  const ev = []; B.turn++; GRAV = B.grav || 0; WILD = !!B.tr.wild;
  const fa = aiAct(B);
  /* Hva hver side har tenkt å gjøre denne runden: angrepets nummer, -1 for Struggle og -2 for alt annet (bytte, gjenstand). */
  const idx = (b, k) => k >= 0 && b.mv[k] ? b.mv[b.v.enc ? b.v.enc.k : k].i : -1;
  B.intent = { me: a.t === 'move' ? idx(B.me[B.a], a.k) : -2, foe: fa.t === 'move' ? idx(B.foe[B.b], fa.k) : -2 }; B.moved = { me: 0, foe: 0 }; B.pivot = null; B.rest = null;
  if (a.t === 'item') useItem(B, a.k, a.i, ev);
  /* Pursuit: bytter målet ut denne runden, rekker Pursuit å slå først, og da med dobbel styrke. */
  const isPur = (b, k) => k >= 0 && !!b.mv[k] && !b.v.rech && MOVES[b.mv[b.v.enc ? b.v.enc.k : k].i][0] === 'Pursuit', pur = (sd, k) => { B.pursuit = 1; useMove(B, sd, k, ev, 0); B.pursuit = 0; B.moved[sd] = 1; settle(B, ev); };
  const purF = a.t === 'switch' && fa.t === 'move' && isPur(B.foe[B.b], fa.k), purM = fa.t === 'switch' && a.t === 'move' && isPur(B.me[B.a], a.k);
  if (purF) pur('foe', fa.k);
  if (purM) pur('me', a.k);
  if (a.t === 'switch' && !B.over && B.me[B.a].hp > 0) swapTo(B, 'me', a.i, ev);
  if (fa.t === 'switch' && !B.over && B.foe[B.b].hp > 0) { swapTo(B, 'foe', fa.i, ev); B.aiSw = B.turn; }
  /* Mega Evolution kommer før angrepene, så farten i denne runden er den nye. Motstanderen gjør det så snart den som kan, skal angripe
     (ikke de ville i raid: de forvandles i raseri, se raidField). */
  if (!B.over) { if (a.t === 'move' && a.mega) megaEvolve(B, 'me', ev); if (fa.t === 'move' && !B.tr.wild) megaEvolve(B, 'foe', ev); }
  const q = [];
  if (a.t === 'move' && !purM) q.push(['me', a.k, B.me[B.a]]);
  if (fa.t === 'move' && !purF) q.push(['foe', fa.k, B.foe[B.b]]);
  if (q.length === 2) {
    const pr = ([, k, b]) => k >= 0 && b.mv[k] ? MOVES[b.mv[k].i][5] : 0, pa = pr(q[0]), pb = pr(q[1]), sa = spdB(B, q[0][2]), sb = spdB(B, q[1][2]);
    const first = pa !== pb ? pa > pb : sa !== sb ? (sa > sb) !== !!B.troom : Math.random() < 0.5;
    if (!first) q.reverse();
  }
  q.forEach((x, n) => x.push(q.length === 2 ? n : 1));
  if (!runQueue(B, q, ev)) return ev;
  if (!B.over) endTurn(B, ev);
  afterTurn(B, ev);
  return ev;
}
/* Ny motstander kommer når runden er ferdig. Besvimer din, velger du selv (B.need). */
function afterTurn(B, ev) {
  for (let g = 0; g < 8 && !B.over && B.foe[B.b].hp <= 0; g++) sendOut(B, 'foe', aiNext(B), ev);
  B.need = !B.over && B.me[B.a].hp <= 0 ? 1 : 0;
}
/* Spilleren har valgt hvem som kommer inn: etter en besvimelse, eller midt i runden etter U-turn og lignende (da gjøres resten av runden etterpå). */
function sendIn(B, i) {
  const ev = []; GRAV = B.grav || 0; WILD = !!B.tr.wild;
  if (B.need === 2) {
    const q = B.rest || []; B.rest = null; B.need = 0;
    if (i !== B.a && B.me[i] && B.me[i].hp > 0) swapTo(B, 'me', i, ev); else B.pass = null;
    if (!runQueue(B, q, ev)) return ev;
    if (!B.over) endTurn(B, ev);
    afterTurn(B, ev);
    return ev;
  }
  sendOut(B, 'me', i, ev); afterTurn(B, ev); return ev;
}
