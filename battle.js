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
const typeEff = (t, b) => (t === 4 && b.v && b.v.mag) ? 0 : CH[t][b.ty[0]] * (b.ty[1] >= 0 && b.ty[1] !== b.ty[0] ? CH[t][b.ty[1]] : 1);
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
  'Solar Beam': ['absorbed light!', 0], 'Skull Bash': ['tucked in its head!', 0], 'Razor Wind': ['whipped up a whirlwind!', 0], 'Sky Attack': ['became cloaked in a harsh light!', 0] };
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
  'Present': () => [40, 80, 120][rnd(3)], 'Spit Up': () => 100, 'Natural Gift': () => 70, 'Trump Card': () => 60, 'Fling': () => 50, 'Beat Up': () => 50, 'Bide': () => 60 };
/* Unike statusangrep som retter seg mot motstanderen (resten virker på brukeren eller banen). */
const FOEU = new Set(['Taunt', 'Encore', 'Disable', 'Mean Look', 'Block', 'Spider Web', 'Lock-On', 'Mind Reader', 'Spite', 'Soak', 'Pain Split', 'Psych Up', 'Memento', 'Power Swap', 'Guard Swap', 'Heart Swap', 'Reflect Type']);

/* En Pokémon i kamp. src er den eide Pokémonen (eller en generert motstander med samme felter). v = det som nullstilles ved bytte. */
function bmon(src) {
  const st = statsOf(src);
  return { src, id: src.id, lv: src.lv, sh: src.sh || 0, name: D(src.id)[0], st, max: st[0], hp: st[0], mv: src.mv.map(i => ({ i, pp: MOVES[i][18] || 10, max: MOVES[i][18] || 10 })),
    sg: Z8(), status: '', slp: 0, tox: 0, ty: [D(src.id)[1], D(src.id)[2]], out: 0, v: {} };
}
const newSide = () => ({ ref: 0, ls: 0, safe: 0, mist: 0, tail: 0, lucky: 0, spikes: 0, tsp: 0, rock: 0, wish: null });
/* tr = { n, title, img, ty, kind, skill, boss }. x = ekstra felter for modusen (liga, Battle Frontier eller demo). */
function mkBattle(me, foe, tr, x) {
  return Object.assign({ me: me.map(bmon), foe: foe.map(bmon), tr, a: 0, b: 0, turn: 0, over: null, need: 0, kos: [], pay: 0,
    wx: { k: '', n: 0 }, sd: { me: newSide(), foe: newSide() }, lastM: { me: null, foe: null }, troom: 0, mud: 0, wsp: 0, aiSw: -9 }, x);
}
const act = (B, s) => s === 'me' ? B.me[B.a] : B.foe[B.b];
const opp = s => s === 'me' ? 'foe' : 'me';
const nmOf = (s, b) => s === 'foe' ? `The foe's ${b.name}` : b.name;
const lc = s => s.replace(/^The foe/, 'the foe');
const sideOf = (B, b) => B.me.includes(b) ? 'me' : 'foe';
const spdB = (B, b) => b.st[5] * stgM(b.sg[5]) * (b.status === 'par' ? 0.5 : 1) * (B.sd[sideOf(B, b)].tail ? 2 : 1);
const boosts = b => b.sg.reduce((a, c) => a + Math.max(0, c), 0);

function powOf(B, u, t, m, ord) {
  const n = m[0];
  let p = VPOW[n] ? VPOW[n](u, t, B) : m[2] || 60;
  if (n === 'Eruption' || n === 'Water Spout') p = Math.max(1, Math.floor(p * u.hp / u.max));
  if (n === 'Stored Power') p = 20 + 20 * boosts(u);
  if ((n === 'Facade' && u.status) || (n === 'Hex' && t.status) || (n === 'Venoshock' && t.status === 'psn') || (n === 'Brine' && t.hp <= t.max / 2) || (n === 'Wake-Up Slap' && t.status === 'slp') || (n === 'Smelling Salts' && t.status === 'par')
    || (n === 'Payback' && ord === 1) || ((n === 'Revenge' || n === 'Avalanche') && u.v.hit) || n === 'Acrobatics' || (n === 'Weather Ball' && B.wx.k)) p *= 2;
  if (n === 'Solar Beam' && B.wx.k && B.wx.k !== 'sun') p = Math.floor(p / 2);
  if (ROLL.has(n)) p *= Math.pow(2, Math.min(4, u.v.roll || 0));
  if (CHAIN.has(n)) p = Math.min(160, p * Math.pow(2, u.v.chain || 0));
  return p;
}
function dmgOf(B, u, t, m, pow, crit, roll) {
  const phys = m[4] === 1, n = m[0], ai = phys ? 1 : 3, di = phys || n === 'Psyshock' || n === 'Psystrike' || n === 'Secret Sword' ? 2 : 4;
  let a = (n === 'Foul Play' ? t : u).st[ai] * (crit && u.sg[ai] < 0 ? 1 : stgM((n === 'Foul Play' ? t : u).sg[ai])), d = t.st[di] * (crit && t.sg[di] > 0 ? 1 : stgM(t.sg[di]));
  if (B.wx.k === 'sand' && di === 4 && t.ty.includes(5)) d *= 1.5;
  const base = Math.floor(Math.floor((Math.floor(2 * u.lv / 5) + 2) * pow * a / d) / 50) + 2;
  let mod = (crit ? 1.5 : 1) * (roll ? 0.85 + Math.random() * 0.15 : 0.925) * (u.ty.includes(m[1]) ? 1.5 : 1) * typeEff(m[1], t) * (phys && u.status === 'brn' && n !== 'Facade' ? 0.5 : 1);
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
  b.v = {}; b.sg = Z8(); if (b.tox) b.tox = 1;
  ev.push({ t: 'send', side: s, i, hp: b.hp, st: b.status, txt: txt || (s === 'me' ? `Go! ${b.name}!` : `${B.tr.n} sent out ${b.name}!`) });
  const hurt = (d, x) => { b.hp = Math.max(0, b.hp - Math.max(1, Math.floor(d))); ev.push({ t: 'hit', side: s, hp: b.hp, e: 1, quiet: 1 }, { t: 'msg', s: x }); };
  if (sd.rock) hurt(b.max / 8 * CH[5][b.ty[0]] * (b.ty[1] >= 0 ? CH[5][b.ty[1]] : 1), `Pointed stones dug into ${lc(N)}!`);
  if (sd.spikes && !air && b.hp > 0) hurt(b.max / [8, 6, 4][sd.spikes - 1], `${N} is hurt by the spikes!`);
  if (sd.tsp && !air && b.hp > 0) {
    if (b.ty.includes(3)) { sd.tsp = 0; ev.push({ t: 'msg', s: `${N} absorbed the poison spikes!` }); }
    else if (ailOk(b, 'psn') && !sd.safe) { b.status = 'psn'; b.tox = sd.tsp > 1 ? 1 : 0; ev.push({ t: 'status', side: s, st: 'psn', fx: 'psn' }, { t: 'msg', s: `${N} was ${b.tox ? 'badly ' : ''}poisoned!` }); }
  }
  settle(B, ev);
}
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
const weather = (c, k) => { if (c.B.wx.k === k) return fail(c); c.B.wx = { k, n: 5 }; c.ev.push({ t: 'wx', k }); c.say(WXTXT[k][0]); };
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
  'Mean Look': c => { if (c.t.v.nosw) return fail(c); c.t.v.nosw = 1; c.say(`${nmOf(c.o, c.t)} can no longer escape!`); },
  'Psych Up': c => { c.u.sg = c.t.sg.slice(); c.say(`${c.N} copied ${lc(nmOf(c.o, c.t))}'s stat changes!`); },
  'Lock-On': c => { c.V.lockon = 1; c.say(`${c.N} took aim at ${lc(nmOf(c.o, c.t))}!`); },
  'Destiny Bond': c => { c.V.dbond = 1; c.say(`${c.N} is trying to take its foe down with it!`); },
  'Refresh': c => { if (!c.u.status || c.u.status === 'slp' || c.u.status === 'frz') return fail(c); c.u.status = ''; c.u.tox = 0; c.ev.push({ t: 'status', side: c.s, st: '' }); c.say(`${c.N}'s status returned to normal!`); },
  'Heal Bell': c => { for (const b of c.s === 'me' ? c.B.me : c.B.foe) if (b.hp > 0) { b.status = ''; b.tox = 0; } c.ev.push({ t: 'status', side: c.s, st: '' }); c.say(c.m[0] === 'Heal Bell' ? 'A bell chimed!' : 'A soothing aroma wafted through the area!'); },
  'Splash': c => c.say('But nothing happened!'), 'Teleport': fail, 'Helping Hand': fail,
  'Magnet Rise': c => { if (c.V.mag) return fail(c); c.V.mag = 5; c.say(`${c.N} levitated with electromagnetism!`); },
  'Soak': c => { c.t.ty = [10, -1]; c.say(`${nmOf(c.o, c.t)} transformed into the Water type!`); },
  'Reflect Type': c => { c.u.ty = c.t.ty.slice(); c.say(`${c.N}'s type became the same as ${lc(nmOf(c.o, c.t))}'s type!`); },
  'Conversion': c => { c.u.ty = [MOVES[c.u.mv[0].i][1], -1]; c.say(`${c.N} transformed into the ${TYN[c.u.ty[0]]} type!`); },
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
  'Power Trick': c => { const st = c.u.st, x = st[1]; st[1] = st[2]; st[2] = x; c.say(`${c.N} switched its Attack and Defense!`); }
};
UM['Aromatherapy'] = UM['Heal Bell']; UM['Block'] = UM['Spider Web'] = UM['Mean Look']; UM['Mind Reader'] = UM['Lock-On'];
/* Tilstander utover de fem vanlige (tilstandsnummeret fra dataene). */
const AILX = {
  7: c => { if (c.t.v.love) return fail(c); c.t.v.love = 1; c.say(`${nmOf(c.o, c.t)} fell in love!`); },
  9: c => { if (c.t.status !== 'slp' || c.t.v.night) return fail(c); c.t.v.night = 1; c.say(`${nmOf(c.o, c.t)} began having a nightmare!`); },
  14: c => { if (c.t.status || c.t.v.yawn || c.B.sd[c.o].safe) return fail(c); c.t.v.yawn = 2; c.say(`${c.N} made ${lc(nmOf(c.o, c.t))} drowsy!`); },
  18: c => { if (c.t.v.seed) return fail(c); if (c.t.ty.includes(11)) return c.say(`It doesn't affect ${lc(nmOf(c.o, c.t))}…`); c.t.v.seed = 1; c.ev.push({ t: 'status', side: c.o, st: c.t.status, fx: 'seed' }); c.say(`${nmOf(c.o, c.t)} was seeded!`); },
  20: c => { for (const s of ['me', 'foe']) { const b = act(c.B, s); if (b.hp > 0 && !b.v.perish) b.v.perish = 4; } c.say('All Pokémon that heard the song will faint in three turns!'); }
};
const handled = m => m[4] > 0 || !!UM[m[0]] || (m[6] === 1 && (!!AIL[m[7]] || m[7] === 6 || !!AILX[m[7]])) || m[6] === 3 || m[6] === 5 || m[12].length > 0;
/* Angrep som ikke gjør noe i disse kampene ennå. De velges ikke automatisk, og trenerne bruker dem ikke. */
window.DEADMV = new Set(MOVES.map((m, i) => handled(m) && !['Splash', 'Teleport', 'Helping Hand'].includes(m[0]) ? -1 : i).filter(i => i >= 0));
const METRO = MOVES.map((m, i) => m[4] > 0 && m[2] > 0 && !CHARGE[m[0]] && !BOOM.has(m[0]) ? i : -1).filter(i => i >= 0);

/* Ett angrep. k = plass i angrepslista (-1 = Struggle). ord = 0 hvis brukeren er først ut av to denne runden. */
function useMove(B, s, k, ev, ord) {
  const u = act(B, s), o = opp(s), t = act(B, o), N = nmOf(s, u), V = u.v, say = x => ev.push({ t: 'msg', s: x });
  if (u.hp <= 0) return;
  const wasProt = V.lastProt; V.lastProt = 0; V.dbond = 0;
  const stop = () => { if (V.away) { V.away = 0; ev.push({ t: 'vanish', side: s, on: 0 }); } V.lock = null; V.roll = 0; V.chain = 0; V.cm = ''; };
  if (V.rech) { V.rech = 0; say(`${N} must recharge!`); return; }
  if (u.status === 'slp') {
    if (u.slp-- > 0) { say(`${N} is fast asleep.`); const nm = k >= 0 && u.mv[k] ? MOVES[u.mv[k].i][0] : ''; if (nm !== 'Sleep Talk' && nm !== 'Snore') return stop(); }
    else { u.status = ''; V.night = 0; ev.push({ t: 'status', side: s, st: '' }); say(`${N} woke up!`); }
  }
  if (u.status === 'frz') { if (Math.random() < 0.8) { say(`${N} is frozen solid!`); return stop(); } u.status = ''; ev.push({ t: 'status', side: s, st: '' }); say(`${N} thawed out!`); }
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
    slot.pp = Math.max(0, slot.pp - 1);
  }
  V.last = k;
  /* Første runde av et to-runders angrep. I sterkt sollys lader Solar Beam ferdig med en gang. */
  if (CHARGE[m[0]] && !(cont && V.lock.kind === 'charge') && !(m[0] === 'Solar Beam' && B.wx.k === 'sun')) {
    say(`${N} ${CHARGE[m[0]][0]}`); V.lock = { k, kind: 'charge' };
    if (CHARGE[m[0]][1]) { V.away = 1; ev.push({ t: 'vanish', side: s, on: 1 }); }
    if (m[0] === 'Skull Bash') changeStats(B, s, [[3, 1]], ev);
    return;
  }
  if (cont && V.lock.kind === 'charge') { V.lock = null; if (V.away) { V.away = 0; ev.push({ t: 'vanish', side: s, on: 0 }); } }
  say(`${N} used ${m[0]}!`);
  /* Angrep som kaller et annet angrep. */
  if (m[0] === 'Metronome') { mi = METRO[rnd(METRO.length)]; m = MOVES[mi]; say(`Waggling a finger let it use ${m[0]}!`); }
  else if (m[0] === 'Sleep Talk') { const c = u.mv.filter(x => MOVES[x.i][0] !== 'Sleep Talk' && !CHARGE[MOVES[x.i][0]]); if (u.status !== 'slp' || !c.length) return say('But it failed!'); mi = c[rnd(c.length)].i; m = MOVES[mi]; say(`${N} used ${m[0]}!`); }
  else if (m[0] === 'Copycat' || m[0] === 'Mirror Move') { const lm = B.lastM[o]; if (lm == null || lm < 0 || MOVES[lm][4] === 0 || CHARGE[MOVES[lm][0]]) return say('But it failed!'); mi = lm; m = MOVES[mi]; say(`${N} used ${m[0]}!`); }
  B.lastM[s] = mi;
  const atFoe = m[4] > 0 || (m[17] !== 1 && ![3, 10, 11].includes(m[6]) && (m[6] !== 13 || FOEU.has(m[0])) && !UM_SELF.has(m[0]));
  if (m[0] === 'Dream Eater' && t.status !== 'slp') { say('But it failed!'); return stop(); }
  if (m[0] === 'Snore' && u.status !== 'slp') { say('But it failed!'); return stop(); }
  if (m[0] === 'Fake Out' && V.t) { say('But it failed!'); return stop(); }
  if (m[0] === 'Focus Punch' && V.hit) { say(`${N} lost its focus and couldn't move!`); return stop(); }
  if (atFoe) {
    if (t.hp <= 0) { say('But there was no target…'); return stop(); }
    if (t.v.prot && m[0] !== 'Feint' && m[0] !== 'Shadow Force') { say(`${nmOf(o, t)} protected itself!`); return stop(); }
    let hit = true;
    if (V.lockon) hit = true;
    else if (t.v.away) hit = false;
    else if (m[6] === 9) hit = u.lv >= t.lv && Math.random() < (30 + u.lv - t.lv) / 100;
    else if (m[3] && !((m[0] === 'Thunder' || m[0] === 'Hurricane') && B.wx.k === 'rain') && !(m[0] === 'Blizzard' && B.wx.k === 'hail')) hit = Math.random() < m[3] / 100 * accM(clampS(u.sg[6] - t.sg[7]));
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
    if (ROLL.has(m[0])) V.roll = cont ? (V.roll || 0) + 1 : 0;
    if (CHAIN.has(m[0])) V.chain = V.cm === m[0] ? Math.min(3, (V.chain || 0) + 1) : 0;
    V.cm = CHAIN.has(m[0]) ? m[0] : '';
    ev.push({ t: 'anim', side: s, mi, self: 0, roll: V.roll || 0 });
    const hits = m[13] ? (m[13] === m[14] ? m[13] : [2, 2, 2, 3, 3, 3, 4, 5][rnd(8)]) : 1, cs = Math.min(3, m[16] + (V.focus ? 2 : 0));
    let total = 0, n = 0, crit = false, sub = false, held = false;
    for (; n < hits && t.hp > 0 && u.hp > 0; n++) {
      crit = !fixed && m[6] !== 9 && m !== STRUGGLE && !B.sd[o].lucky && Math.random() < [1 / 16, 1 / 8, 1 / 2, 1][cs];
      let d = m[6] === 9 ? t.hp : fixed ? fixed(u, t, B) : m === STRUGGLE ? Math.max(1, Math.floor(dmgOf(B, u, t, m, 50, false, true) / (u.ty.includes(0) ? 1.5 : 1) / (typeEff(0, t) || 1))) : dmgOf(B, u, t, m, powOf(B, u, t, m, ord), crit, true);
      if (fixed && d <= 0) { say('But it failed!'); return stop(); }
      if (t.v.sub) {
        t.v.sub -= d; sub = true; ev.push({ t: 'hit', side: o, hp: t.hp, e, crit, sub: 1 });
        if (t.v.sub <= 0) { t.v.sub = 0; ev.push({ t: 'sub', side: o, on: 0 }); say(`${nmOf(o, t)}'s substitute faded!`); }
        continue;
      }
      d = Math.min(t.hp, d);
      if (d >= t.hp && (t.v.endure || m[0] === 'False Swipe')) { d = t.hp - 1; held = !!t.v.endure; }
      t.hp -= d; total += d; t.v.hit = { d: (t.v.hit ? t.v.hit.d : 0) + d, p: m[4] };
      ev.push({ t: 'hit', side: o, hp: t.hp, e, crit });
    }
    if (crit) say('A critical hit!');
    if (m[6] === 9) say("It's a one-hit KO!");
    else if (!fixed && m !== STRUGGLE) { if (e > 1) say("It's super effective!"); else if (e < 1) say("It's not very effective…"); }
    if (hits > 1) say(`Hit ${n} time${n > 1 ? 's' : ''}!`);
    if (held) say(`${nmOf(o, t)} endured the hit!`);
    if (t.status === 'frz' && m[1] === 9 && t.hp > 0) { t.status = ''; ev.push({ t: 'status', side: o, st: '' }); say(`${nmOf(o, t)} thawed out!`); }
    if (m[9] > 0 && total > 0 && u.hp < u.max) { u.hp = Math.min(u.max, u.hp + Math.max(1, Math.floor(total * m[9] / 100))); ev.push({ t: 'heal', side: s, hp: u.hp }); say(`${nmOf(o, t)} had its energy drained!`); }
    if (m[9] < 0 && total > 0) { u.hp = Math.max(0, u.hp - Math.max(1, m === STRUGGLE ? Math.floor(u.max / 4) : Math.floor(total * -m[9] / 100))); ev.push({ t: 'hit', side: s, hp: u.hp, e: 1, quiet: 1 }); say(`${N} is hit with recoil!`); }
    if (RECHARGE.has(m[0]) && t.hp > 0) V.rech = 1;
    if (BOOM.has(m[0]) || m[0] === 'Final Gambit') { u.hp = 0; ev.push({ t: 'hit', side: s, hp: 0, e: 1, quiet: 1 }); }
    if (u.hp > 0 && m[6] === 7 && m[12].length && Math.random() * 100 < (m[11] || 100)) changeStats(B, s, m[12], ev);
    if (t.hp > 0 && !sub) {
      if (m[7] > 0 && m[7] <= 6 && Math.random() * 100 < (m[8] || 100)) applyAil(B, o, m[7], ev, false, m[0] === 'Poison Fang');
      if (m[7] === 8 && !t.v.trap) { t.v.trap = 4 + rnd(2); t.v.trapn = m[0]; say(`${nmOf(o, t)} was trapped by ${m[0]}!`); }
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
    if (t.hp <= 0 && t.v.dbond && u.hp > 0) { u.hp = 0; ev.push({ t: 'hit', side: s, hp: 0, e: 1, quiet: 1 }); say(`${nmOf(o, t)} took its attacker down with it!`); }
    return;
  }
  /* Statusangrep */
  ev.push({ t: 'anim', side: s, mi, self: atFoe ? 0 : 1 });
  const c = { B, s, o, u, t, V, N, ev, say, m, wasProt };
  if (m[0] === 'Thunder Wave' && typeEff(m[1], t) === 0) return say(`It doesn't affect ${lc(nmOf(o, t))}…`);
  if (UM[m[0]]) UM[m[0]](c);
  else if (m[6] === 1) { if (AILX[m[7]]) AILX[m[7]](c); else applyAil(B, o, m[7], ev, true, m[0] === 'Toxic'); }
  else if (m[6] === 3) {
    if (u.hp >= u.max) return say('But it failed!');
    const sunny = ['Synthesis', 'Moonlight', 'Morning Sun'].includes(m[0]), pct = sunny && B.wx.k ? (B.wx.k === 'sun' ? 66 : 25) : m[10] || 50;
    u.hp = Math.min(u.max, u.hp + Math.max(1, Math.floor(u.max * pct / 100))); ev.push({ t: 'heal', side: s, hp: u.hp }); say(`${N} regained health!`);
  }
  else if (m[6] === 5) { changeStats(B, o, m[12], ev, true); applyAil(B, o, 6, ev, false); }
  else if (m[12].length) changeStats(B, m[17] === 1 ? s : o, m[12], ev, m[17] !== 1);
  else say('But nothing happened!');
}
/* Unike angrep som virker på brukeren eller banen, selv om dataene ikke sier «seg selv». */
const UM_SELF = new Set(['Curse', 'Trick Room', 'Water Sport', 'Mud Sport', 'Haze', 'Wish', 'Heal Bell', 'Aromatherapy', 'Roar', 'Whirlwind', 'Spikes', 'Toxic Spikes', 'Stealth Rock']);

/* Etter hvert angrep: hvem har besvimt, og er kampen over? Beseirede motstandere telles til XP-oppgjøret etter kampen. */
function settle(B, ev) {
  for (const s of ['foe', 'me']) {
    const b = act(B, s);
    if (b.hp <= 0 && !b.out) { b.out = 1; b.status = ''; ev.push({ t: 'faint', side: s }, { t: 'msg', s: `${nmOf(s, b)} fainted!` }); if (s === 'foe') B.kos.push({ id: b.id, lv: b.lv }); }
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
    if (sd.wish && --sd.wish.n <= 0) { heal(s, b, sd.wish.hp, `${N}'s wish came true!`); sd.wish = null; }
    if (V.ingrain) heal(s, b, b.max / 16, `${N} absorbed nutrients with its roots!`);
    if (V.aqua) heal(s, b, b.max / 16, `A veil of water restored ${lc(N)}'s HP!`);
    if (V.seed && f.hp > 0) {
      const d = Math.min(b.hp, Math.max(1, Math.floor(b.max / 8)));
      hurt(s, b, d, `${N}'s health is sapped by Leech Seed!`);
      if (f.hp < f.max) { f.hp = Math.min(f.max, f.hp + d); ev.push({ t: 'heal', side: o, hp: f.hp }); }
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
    if (V.mag) V.mag--;
    V.t = (V.t || 0) + 1;
  }
  for (const s of ['me', 'foe']) { const sd = B.sd[s]; for (const [k, x] of [['ref', 'Reflect'], ['ls', 'Light Screen'], ['safe', 'Safeguard'], ['mist', 'Mist'], ['tail', 'Tailwind'], ['lucky', 'Lucky Chant']]) if (sd[k] && --sd[k] <= 0 && !B.over) say(`${s === 'me' ? 'Your' : "The foe's"} ${x} wore off!`); }
  if (B.troom && --B.troom <= 0 && !B.over) say('The twisted dimensions returned to normal!');
  if (B.mud) B.mud--; if (B.wsp) B.wsp--;
  for (const b of [...B.me, ...B.foe]) { b.v.prot = 0; b.v.endure = 0; b.v.fl = 0; b.v.hit = null; }
}

/* ---------- Motstanderens valg ---------- */
/* Forventet skade (i HP) for ett angrep og det beste angrepet u har mot t. */
function estDmg(B, u, t, m) {
  if (m[4] === 0) return 0;
  if (FIXED[m[0]]) return FIXED[m[0]](u, t, B) || 0;
  if (typeEff(m[1], t) === 0) return 0;
  if (m[6] === 9) return u.lv >= t.lv ? t.hp * 0.3 : 0;
  let d = dmgOf(B, u, t, m, powOf(B, u, t, m, 1), false, false) * (m[13] ? (m[13] === m[14] ? m[13] : 3) : 1) * (m[3] ? m[3] / 100 : 1);
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
    if (a === 7) return tv.love ? 0 : 20;
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
  if (bench.length && sk >= 0.6 && !V.trap && !V.nosw && !V.ingrain && B.turn - B.aiSw > 2 && t.hp > 0) {
    const threat = bestDmg(B, t, u) / u.hp, mine = bestDmg(B, u, t) / t.hp;
    if (threat >= 0.55 && mine < 0.5 && u.hp > u.max * 0.25) {
      let best = -1, bs = 0;
      for (const i of bench) { const c = B.foe[i], inc = bestDmg(B, t, c) / c.hp, out = bestDmg(B, c, t) / t.hp, sc = out - inc * 1.2; if (inc < 0.34 && (out > mine + 0.15 || inc < threat * 0.4) && (best < 0 || sc > bs)) { best = i; bs = sc; } }
      if (best >= 0 && Math.random() < sk - 0.25) return { t: 'switch', i: best };
    }
  }
  const opts = [];
  u.mv.forEach((x, k) => {
    if (x.pp <= 0 || (V.dis && V.dis.k === k) || (V.enc && V.enc.k !== k)) return;
    const m = MOVES[x.i]; let sc;
    if (m[4] > 0) {
      const d = estDmg(B, u, t, m);
      sc = Math.min(100, d / t.hp * 100) + (d >= t.hp ? 30 + (m[5] > 0 ? 12 : 0) : 0);
      if (t.v.away) sc = 1;
      if (BOOM.has(m[0])) sc = u.hp < u.max * 0.25 ? sc * 0.8 : sc * 0.12;
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
const canSwitch = B => { const b = B.me[B.a], V = b.v; return b.hp <= 0 || !(V.trap || V.nosw || V.ingrain || V.lock || V.rech); };
const moveOk = (B, k) => { const b = B.me[B.a], V = b.v, x = b.mv[k]; return !!x && x.pp > 0 && !(V.dis && V.dis.k === k) && !(V.taunt && MOVES[x.i][4] === 0) && (!V.enc || V.enc.k === k); };
/* Én runde. a = { t: 'move', k } (k = -1 er Struggle) eller { t: 'switch', i }. */
function runTurn(B, a) {
  const ev = []; B.turn++;
  const fa = aiAct(B);
  if (a.t === 'switch') swapTo(B, 'me', a.i, ev);
  if (fa.t === 'switch' && !B.over) { swapTo(B, 'foe', fa.i, ev); B.aiSw = B.turn; }
  const q = [];
  if (a.t === 'move') q.push(['me', a.k, B.me[B.a]]);
  if (fa.t === 'move') q.push(['foe', fa.k, B.foe[B.b]]);
  if (q.length === 2) {
    const pr = ([, k, b]) => k >= 0 && b.mv[k] ? MOVES[b.mv[k].i][5] : 0, pa = pr(q[0]), pb = pr(q[1]), sa = spdB(B, q[0][2]), sb = spdB(B, q[1][2]);
    const first = pa !== pb ? pa > pb : sa !== sb ? (sa > sb) !== !!B.troom : Math.random() < 0.5;
    if (!first) q.reverse();
  }
  q.forEach(([s, k, who], n) => { if (B.over || who.hp <= 0 || act(B, s) !== who) return; useMove(B, s, k, ev, q.length === 2 ? n : 1); settle(B, ev); });
  if (!B.over) endTurn(B, ev);
  afterTurn(B, ev);
  return ev;
}
/* Ny motstander kommer når runden er ferdig. Besvimer din, velger du selv (B.need). */
function afterTurn(B, ev) {
  for (let g = 0; g < 8 && !B.over && B.foe[B.b].hp <= 0; g++) sendOut(B, 'foe', aiNext(B), ev);
  B.need = !B.over && B.me[B.a].hp <= 0 ? 1 : 0;
}
function sendIn(B, i) { const ev = []; sendOut(B, 'me', i, ev); afterTurn(B, ev); return ev; }
