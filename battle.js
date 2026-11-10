'use strict';
/* Fokusdex – trenerkamper.
   Del 1: kampmotoren (regler, ingen skjerm). Del 2: trenere, stigen og belønninger. Del 3: skjermene, animasjonene og musikken.
   Motoren endrer kampens tilstand med en gang og gir tilbake en liste hendelser som skjermen spiller av i rekkefølge. */

/* ---------- Del 1: kampmotoren ---------- */
/* Typetabellen (med Fairy). For hver angrepstype: supereffektivt mot / lite effektivt mot / ingen effekt på. */
const TCH = { normal: '/rock steel/ghost', fighting: 'normal rock steel ice dark/flying poison bug psychic fairy/ghost', flying: 'fighting bug grass/rock steel electric/', poison: 'grass fairy/poison ground rock ghost/steel',
  ground: 'poison rock steel fire electric/bug grass/flying', rock: 'flying bug fire ice/fighting ground steel/', bug: 'grass psychic dark/fighting flying poison ghost steel fire fairy/', ghost: 'ghost psychic/dark/normal',
  steel: 'rock ice fairy/steel fire water electric/', fire: 'bug steel grass ice/rock fire water dragon/', water: 'ground rock fire/water grass dragon/', grass: 'ground rock water/flying poison bug steel fire grass dragon/',
  electric: 'flying water/grass electric dragon/ground', psychic: 'fighting poison/steel psychic/dark', ice: 'flying ground grass dragon/steel fire water ice/', dragon: 'dragon/steel/fairy', dark: 'ghost psychic/fighting dark fairy/', fairy: 'fighting dragon dark/poison steel fire/' };
const CH = TYPES.map(t => { const row = TYPES.map(() => 1); TCH[t].split('/').forEach((l, k) => l.split(' ').filter(Boolean).forEach(x => { row[TYPES.indexOf(x)] = [2, 0.5, 0][k]; })); return row; });
const typeEff = (t, b) => CH[t][b.ty[0]] * (b.ty[1] >= 0 ? CH[t][b.ty[1]] : 1);
const stgM = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const accM = s => s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
const STN = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed', 'accuracy', 'evasiveness'];
const AIL = { 1: 'par', 2: 'slp', 3: 'frz', 4: 'brn', 5: 'psn' };
const AILTXT = { par: 'is paralyzed! It may be unable to move!', slp: 'fell asleep!', frz: 'was frozen solid!', brn: 'was burned!', psn: 'was poisoned!' };
const RECHARGE = ['Hyper Beam', 'Giga Impact', 'Blast Burn', 'Frenzy Plant', 'Hydro Cannon', 'Rock Wrecker', 'Roar of Time'], BOOM = ['Explosion', 'Self-Destruct', 'Selfdestruct'];
const STRUGGLE = ['Struggle', 0, 50, 0, 1, 0, 0, 0, 0, -25, 0, 0, [], 0, 0, 0, 0, 0, 1];
/* Angrep med fast skade. */
const FIXED = { 'Dragon Rage': () => 40, 'Sonic Boom': () => 20, 'Seismic Toss': u => u.lv, 'Night Shade': u => u.lv, 'Super Fang': (u, t) => Math.max(1, Math.floor(t.hp / 2)), 'Psywave': u => Math.max(1, Math.floor(u.lv * (0.5 + Math.random()))) };

/* En Pokémon i kamp. src er den eide Pokémonen (eller en generert motstander med samme felter). */
function bmon(src) {
  const st = statsOf(src);
  return { src, id: src.id, lv: src.lv, sh: src.sh || 0, name: D(src.id)[0], st, max: st[0], hp: st[0], mv: src.mv.map(i => ({ i, pp: MOVES[i][18] || 10 })),
    sg: [0, 0, 0, 0, 0, 0, 0, 0], status: '', slp: 0, conf: 0, ty: [D(src.id)[1], D(src.id)[2]], xp: 0, prot: 0, lastProt: 0, fl: 0, out: 0, rech: 0 };
}
const act = (B, s) => s === 'me' ? B.me[B.a] : B.foe[B.b];
const opp = s => s === 'me' ? 'foe' : 'me';
const nmOf = (s, b) => s === 'foe' ? `The foe's ${b.name}` : b.name;
const spd = b => b.st[5] * stgM(b.sg[5]) * (b.status === 'par' ? 0.5 : 1);
function dmgOf(u, t, m, pow, crit, roll) {
  const phys = m[4] === 1, a = u.st[phys ? 1 : 3] * stgM(u.sg[phys ? 1 : 3]), d = t.st[phys ? 2 : 4] * stgM(t.sg[phys ? 2 : 4]);
  const base = Math.floor(Math.floor((Math.floor(2 * u.lv / 5) + 2) * pow * a / d) / 50) + 2;
  const mod = (crit ? 1.5 : 1) * (roll ? 0.85 + Math.random() * 0.15 : 0.925) * (u.ty.includes(m[1]) ? 1.5 : 1) * typeEff(m[1], t) * (phys && u.status === 'brn' ? 0.5 : 1);
  return Math.max(1, Math.floor(base * mod));
}
const ailOk = (b, st) => !!st && !b.status && !((st === 'par' && b.ty.includes(12)) || (st === 'brn' && b.ty.includes(9)) || (st === 'psn' && (b.ty.includes(3) || b.ty.includes(8))) || (st === 'frz' && b.ty.includes(14)));
function applyAil(B, s, id, ev, loud) {
  const b = act(B, s), N = nmOf(s, b);
  if (id === 6) { if (b.conf) return false; b.conf = 2 + rnd(4); ev.push({ t: 'msg', s: `${N} became confused!` }); return true; }
  const st = AIL[id];
  if (!ailOk(b, st)) {
    if (loud) ev.push({ t: 'msg', s: 'But it failed!' }); return false;
  }
  b.status = st; if (st === 'slp') b.slp = 1 + rnd(3);
  ev.push({ t: 'status', side: s, st }, { t: 'msg', s: `${N} ${AILTXT[st]}` });
  return true;
}
function changeStats(B, s, list, ev) {
  const b = act(B, s), N = nmOf(s, b);
  for (const [id, d] of list) {
    const i = id - 1, v = Math.max(-6, Math.min(6, b.sg[i] + d));
    if (v === b.sg[i]) { ev.push({ t: 'msg', s: `${N}'s ${STN[i]} won't go any ${d > 0 ? 'higher' : 'lower'}!` }); continue; }
    b.sg[i] = v;
    ev.push({ t: 'stat', side: s, up: d > 0 }, { t: 'msg', s: `${N}'s ${STN[i]} ${d > 0 ? 'rose' : 'fell'}${Math.abs(d) > 1 ? ' sharply' : ''}!` });
  }
}
function useMove(B, s, k, ev, first) {
  const u = act(B, s), o = opp(s), t = act(B, o), N = nmOf(s, u), say = x => ev.push({ t: 'msg', s: x });
  if (u.hp <= 0) return;
  const wasProt = u.lastProt; u.lastProt = 0;
  if (u.rech) { u.rech = 0; say(`${N} must recharge!`); return; }
  if (u.fl) { u.fl = 0; say(`${N} flinched!`); return; }
  if (u.status === 'slp') { if (u.slp-- > 0) { say(`${N} is fast asleep.`); return; } u.status = ''; ev.push({ t: 'status', side: s, st: '' }); say(`${N} woke up!`); }
  if (u.status === 'frz') { if (Math.random() < 0.8) { say(`${N} is frozen solid!`); return; } u.status = ''; ev.push({ t: 'status', side: s, st: '' }); say(`${N} thawed out!`); }
  if (u.status === 'par' && Math.random() < 0.25) { say(`${N} is paralyzed! It can't move!`); return; }
  if (u.conf) {
    u.conf--;
    if (!u.conf) say(`${N} snapped out of its confusion!`);
    else {
      say(`${N} is confused!`);
      if (Math.random() < 0.33) {
        const d = Math.max(1, Math.floor((Math.floor((Math.floor(2 * u.lv / 5) + 2) * 40 * u.st[1] / u.st[2] / 50) + 2) * 0.92));
        u.hp = Math.max(0, u.hp - d); ev.push({ t: 'hit', side: s, hp: u.hp, e: 1 }); say('It hurt itself in its confusion!'); return;
      }
    }
  }
  const slot = k >= 0 ? u.mv[k] : null, m = slot ? MOVES[slot.i] : STRUGGLE, atFoe = m[4] > 0 || !m[17];
  if (slot) slot.pp--;
  say(`${N} used ${m[0]}!`);
  if (atFoe && t.hp <= 0) { say('But there was no target…'); return; }
  if (m[0] === 'Dream Eater' && t.status !== 'slp') { say('But it failed!'); return; }
  if (atFoe && t.prot) { ev.push({ t: 'anim', side: s, ty: m[1], cls: m[4] }); say(`${nmOf(o, t)} protected itself!`); return; }
  let hit = true;
  if (m[6] === 9) hit = u.lv >= t.lv && Math.random() < 0.3;
  else if (m[3] && atFoe) hit = Math.random() < m[3] / 100 * accM(Math.max(-6, Math.min(6, u.sg[6] - t.sg[7])));
  if (!hit) { say(`${N}'s attack missed!`); return; }
  ev.push({ t: 'anim', side: s, ty: m[1], cls: m[4] });
  if (m[4] > 0) {
    const e = typeEff(m[1], t);
    if (e === 0 && m !== STRUGGLE) { say(`It doesn't affect ${nmOf(o, t).replace(/^The/, 'the')}…`); return; }
    const hits = m[13] ? (m[13] === m[14] ? m[13] : [2, 2, 2, 3, 3, 3, 4, 5][rnd(8)]) : 1;
    let total = 0, n = 0, crit = false;
    for (; n < hits && t.hp > 0; n++) {
      crit = Math.random() < [1 / 16, 1 / 8, 1 / 2][Math.min(2, m[16])];
      const d = Math.min(t.hp, m[6] === 9 ? t.hp : FIXED[m[0]] ? FIXED[m[0]](u, t) : m === STRUGGLE ? Math.max(1, Math.floor(dmgOf(u, t, m, 50, false, true) / (u.ty.includes(0) ? 1.5 : 1) / (typeEff(0, t) || 1))) : dmgOf(u, t, m, m[2] || 60, crit, true));
      t.hp -= d; total += d;
      ev.push({ t: 'hit', side: o, hp: t.hp, e: FIXED[m[0]] || m === STRUGGLE ? 1 : e, crit: crit && !FIXED[m[0]] });
    }
    if (crit && !FIXED[m[0]] && m[6] !== 9) say('A critical hit!');
    if (m[6] === 9) say("It's a one-hit KO!");
    else if (!FIXED[m[0]] && m !== STRUGGLE) { if (e > 1) say("It's super effective!"); else if (e < 1) say("It's not very effective…"); }
    if (hits > 1) say(`Hit ${n} time${n > 1 ? 's' : ''}!`);
    if (m[9] > 0 && u.hp < u.max) { u.hp = Math.min(u.max, u.hp + Math.max(1, Math.floor(total * m[9] / 100))); ev.push({ t: 'heal', side: s, hp: u.hp }); say(`${nmOf(o, t)} had its energy drained!`); }
    if (m[9] < 0) { u.hp = Math.max(0, u.hp - Math.max(1, Math.floor(total * -m[9] / 100))); ev.push({ t: 'hit', side: s, hp: u.hp, e: 1, quiet: 1 }); say(`${N} is hit with recoil!`); }
    if (RECHARGE.includes(m[0]) && t.hp > 0) u.rech = 1;
    if (BOOM.includes(m[0])) { u.hp = 0; ev.push({ t: 'hit', side: s, hp: 0, e: 1, quiet: 1 }); }
    if (u.hp > 0 && m[6] === 7 && m[12].length && Math.random() * 100 < (m[11] || 100)) changeStats(B, s, m[12], ev);
    if (t.hp > 0) {
      if (m[7] > 0 && Math.random() * 100 < (m[8] || 100)) applyAil(B, o, m[7], ev, false);
      if (m[6] === 6 && m[12].length && Math.random() * 100 < (m[11] || 100)) changeStats(B, o, m[12], ev);
      if (m[15] && first && Math.random() * 100 < m[15]) t.fl = 1;
    }
    return;
  }
  /* Status-angrep */
  if (m[0] === 'Protect' || m[0] === 'Detect') { if (wasProt && Math.random() < 0.5) say('But it failed!'); else { u.prot = 1; u.lastProt = 1; say(`${N} protected itself!`); } }
  else if (m[0] === 'Rest') { if (u.hp >= u.max) say('But it failed!'); else { u.hp = u.max; u.status = 'slp'; u.slp = 2; ev.push({ t: 'heal', side: s, hp: u.hp }, { t: 'status', side: s, st: 'slp' }); say(`${N} slept and became healthy!`); } }
  else if (m[6] === 1) applyAil(B, o, m[7], ev, true);
  else if (m[6] === 3) { if (u.hp >= u.max) say('But it failed!'); else { u.hp = Math.min(u.max, u.hp + Math.floor(u.max * (m[10] || 50) / 100)); ev.push({ t: 'heal', side: s, hp: u.hp }); say(`${N} regained health!`); } }
  else if (m[6] === 5) { changeStats(B, o, m[12], ev); applyAil(B, o, 6, ev, false); }
  else if (m[12].length) changeStats(B, m[17] ? s : o, m[12], ev);
  else say('But nothing happened!');
}
/* Etter hvert angrep: besvimelser, XP og om kampen er over. Ny motstander kommer først når runden er ferdig. */
function settle(B, ev) {
  const f = B.foe[B.b], m = B.me[B.a];
  if (f.hp <= 0 && !f.out) {
    f.out = 1; ev.push({ t: 'faint', side: 'foe' }, { t: 'msg', s: `The foe's ${f.name} fainted!` });
    const ps = [...B.part].filter(i => B.me[i].hp > 0), gain = Math.round(BST[f.id - 1].reduce((a, b) => a + b, 0) / 8 * f.lv / 7 * B.xm);
    for (const i of ps) { const g = Math.max(1, Math.round(gain / ps.length)); B.me[i].xp += g; ev.push({ t: 'xp', i, got: g }, { t: 'msg', s: `${B.me[i].name} gained ${g} XP!` }); }
    B.part = new Set(B.me[B.a].hp > 0 ? [B.a] : []);
    if (!B.foe.some(x => x.hp > 0)) B.over = 'win';
  }
  if (m.hp <= 0 && !m.out) {
    m.out = 1; ev.push({ t: 'faint', side: 'me' }, { t: 'msg', s: `${m.name} fainted!` });
    if (!B.me.some(x => x.hp > 0)) { if (!B.over) B.over = 'loss'; } else B.need = 1;
  }
}
function swapIn(B, i, ev) {
  const old = B.me[B.a]; old.sg = [0, 0, 0, 0, 0, 0, 0, 0]; old.conf = 0; old.fl = 0; old.rech = 0;
  B.a = i; B.part.add(i); B.need = 0;
  ev.push({ t: 'switch', side: 'me', i, hp: B.me[i].hp, st: B.me[i].status, xp: B.me[i].xp }, { t: 'msg', s: `Go! ${B.me[i].name}!` });
}
/* Motstanderens valg: forventet skade for skadeangrep, faste poeng for nyttige statusangrep. skill = hvor ofte det beste velges. */
function aiPick(B) {
  const u = B.foe[B.b], t = B.me[B.a], opts = [];
  u.mv.forEach((x, k) => {
    if (x.pp <= 0) return;
    const m = MOVES[x.i]; let sc = 0;
    if (m[4] > 0) { const d = FIXED[m[0]] ? FIXED[m[0]](u, t) : typeEff(m[1], t) === 0 ? 0 : dmgOf(u, t, m, m[2] || 60, false, false) * (m[13] ? 3 : 1); sc = Math.min(100, d / t.hp * 100) * (m[3] ? m[3] / 100 : 1) + (d >= t.hp ? 25 : 0); if (m[6] === 9) sc = 20; }
    else if (m[6] === 1) sc = m[7] === 6 ? (t.conf ? 0 : 22) : !ailOk(t, AIL[m[7]]) ? 0 : m[7] === 2 ? 45 : 32;
    else if (m[6] === 3 || m[0] === 'Rest') sc = u.hp < u.max * 0.4 ? 60 : 0;
    else if (m[0] === 'Protect' || m[0] === 'Detect') sc = u.lastProt ? 0 : 8;
    else if (m[12].length) { const tgt = m[17] ? u : t, cur = tgt.sg[m[12][0][0] - 1]; sc = Math.abs(cur) >= 2 || B.turn > 6 ? 0 : m[17] ? (u.hp > u.max * 0.5 ? 28 : 6) : 18; }
    opts.push([k, sc]);
  });
  if (!opts.length) return -1;
  opts.sort((a, b) => b[1] - a[1]);
  if (Math.random() < B.tr.skill || opts.length === 1) return opts[0][0];
  const ok = opts.filter(x => x[1] > 0);
  return (ok.length ? ok : opts)[rnd((ok.length ? ok : opts).length)][0];
}
/* Én runde. a = { t: 'move', k } (k = -1 er Struggle) eller { t: 'switch', i }. */
function runTurn(B, a) {
  const ev = []; B.turn++;
  const mine = B.me[B.a], theirs = B.foe[B.b], fk = aiPick(B);
  let seq;
  if (a.t === 'switch') { swapIn(B, a.i, ev); seq = [['foe', fk, theirs]]; }
  else {
    const pm = a.k >= 0 ? MOVES[mine.mv[a.k].i][5] : 0, pf = fk >= 0 ? MOVES[theirs.mv[fk].i][5] : 0;
    const meFirst = pm !== pf ? pm > pf : spd(mine) !== spd(theirs) ? spd(mine) > spd(theirs) : Math.random() < 0.5;
    seq = meFirst ? [['me', a.k, mine], ['foe', fk, theirs]] : [['foe', fk, theirs], ['me', a.k, mine]];
  }
  seq.forEach(([s, k, who], n) => { if (B.over || who.hp <= 0 || act(B, s) !== who) return; useMove(B, s, k, ev, n === 0 && seq.length > 1); settle(B, ev); });
  if (!B.over) for (const s of ['me', 'foe']) {
    const b = act(B, s);
    if (b.hp > 0 && (b.status === 'psn' || b.status === 'brn')) { b.hp = Math.max(0, b.hp - Math.max(1, Math.floor(b.max / 8))); ev.push({ t: 'hit', side: s, hp: b.hp, e: 1, quiet: 1 }, { t: 'msg', s: `${nmOf(s, b)} is hurt by its ${b.status === 'psn' ? 'poison' : 'burn'}!` }); settle(B, ev); }
  }
  for (const b of [...B.me, ...B.foe]) { b.prot = 0; b.fl = 0; }
  if (!B.over && B.foe[B.b].hp <= 0) { B.b = B.foe.findIndex(x => x.hp > 0); ev.push({ t: 'switch', side: 'foe', i: B.b, hp: B.foe[B.b].hp, st: '', xp: 0 }, { t: 'msg', s: `${B.tr.n} sent out ${B.foe[B.b].name}!` }); }
  return ev;
}
function sendIn(B, i) { const ev = []; swapIn(B, i, ev); return ev; }

/* ---------- Del 2: trenere, stigen og belønninger ---------- */
/* Vanlige trenere: [navn, bilde, typer de bruker]. De to siste dukker først opp fra trener 8. */
const TCLASS = [['Youngster', 'youngster', [0]], ['Lass', 'lass', [0, 17, 11]], ['Bug Catcher', 'bugcatcher|bugcatcher-gen4dp', [6]], ['Hiker', 'hiker', [5, 4]], ['Swimmer', 'swimmer', [10]], ['Bird Keeper', 'birdkeeper', [2]],
  ['Black Belt', 'blackbelt', [1]], ['Psychic', 'psychic', [13]], ['Fisherman', 'fisherman', [10]], ['Scientist', 'scientist', [12, 8]], ['Team Rocket Grunt', 'rocketgrunt', [3, 16]],
  ['Team Galactic Grunt', 'galacticgrunt', [3, 16, 6]], ['Team Plasma Grunt', 'plasmagrunt', [16, 3, 0]], ['Ace Trainer', 'acetrainer', []], ['Veteran', 'veteran', []]];
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
/* Toppbosser: mestere, skurker og rivaler. */
const TOPB = [
  ['Lance', 'lance', 'Champion', 15, [149, 130, 142, 6, 230, 373]], ['Steven', 'steven', 'Champion', 8, [376, 227, 306, 344, 346, 348]], ['Wallace', 'wallace', 'Champion', 10, [350, 130, 73, 272, 340, 321]],
  ['Alder', 'alder', 'Champion', 6, [637, 626, 621, 617, 589, 584]], ['Iris', 'iris', 'Champion', 15, [612, 635, 621, 567, 306, 131]], ['Blue', 'blue', 'Rival', 0, [18, 65, 112, 130, 59, 103]],
  ['Silver', 'silver', 'Rival', 16, [160, 215, 169, 82, 94, 65]], ['Barry', 'barry', 'Rival', 10, [395, 398, 214, 78, 407, 143]], ['Hugh', 'hugh', 'Rival', 9, [500, 521, 512, 626, 330, 604]],
  ['Giovanni', 'giovanni', 'Team Rocket Boss', 4, [34, 31, 112, 53, 115, 51]], ['Cyrus', 'cyrus', 'Team Galactic Boss', 16, [461, 430, 169, 130, 229, 462]], ['Ghetsis', 'ghetsis', 'Team Plasma', 16, [635, 563, 537, 626, 604, 625]],
  ['Colress', 'colress', 'Team Plasma', 8, [462, 601, 376, 606, 604, 474]]];
/* De aller sjeldneste. Legendariske på laget kan ikke velges som premie. */
const ULTRA = [['Red', 'red', 'Legendary Trainer', 12, [25, 3, 6, 9, 143, 131]], ['Cynthia', 'cynthia', 'Sinnoh Champion', 15, [445, 442, 448, 350, 407, 468]], ['N', 'n', 'King of Team Plasma', 15, [644, 571, 567, 565, 584, 601]]];
const KIND = { reg: '', boss: 'Boss', top: 'Top boss', ultra: 'Legendary trainer' };
const KMULT = { reg: 1, boss: 3, top: 6, ultra: 12 };
const BLIST = { boss: BOSS, top: TOPB, ultra: ULTRA };

/* Stigen åpnes med «Done for today» og står åpen til neste økt starter, så kampene kan tas senere på kvelden eller neste morgen.
   Belønninger følger fokustiden den dagen stigen ble åpnet: ×0,5 uten studering, ×2,0 ved fem timer. XP svinger mindre. */
const ladMin = () => S.lad.day ? ((S.log[S.lad.day] || {}).m || 0) : todayMin();
const studyMult = () => Math.round((0.5 + Math.min(1.5, ladMin() / 300 * 1.5)) * 10) / 10;
const xpMult = () => 0.8 + Math.min(0.4, ladMin() / 300 * 0.4);
const ladLost = () => !!S.lad.lost && S.lad.lost === (S.lad.day || dayKey());
const ladderOpen = () => !!S.lad.day && !ladLost();
/* Hvem som venter på neste trinn. Lagres, så den samme treneren står der til du har slått den. */
function nextTrainer() {
  const r = S.lad.n + 1;
  if (S.lad.next && S.lad.next.r === r) return S.lad.next;
  let kind = 'reg', i;
  if (r % 5 === 0) { const x = Math.random(); kind = r >= 15 && x < 0.06 ? 'ultra' : r >= 10 && x < 0.28 ? 'top' : 'boss'; i = rnd(BLIST[kind].length); }
  else i = rnd(r >= 8 ? TCLASS.length : TCLASS.length - 2);
  S.lad.next = { r, kind, i };
  return S.lad.next;
}
const trainerInfo = t => { const d = t.kind === 'reg' ? TCLASS[t.i] : BLIST[t.kind][t.i]; return t.kind === 'reg' ? { n: d[0], img: d[1], title: '', ty: d[2][0] == null ? 0 : d[2][0] } : { n: d[0], img: d[1], title: d[2], ty: d[3] }; };
/* Går ned til en tidligere form hvis nivået er for lavt for arten (slack = hvor mye for tidlig bosser får utvikle). */
function fitForm(id, lv, slack) { while (stageOf(id) > 0 && lv < reqLv(id) - slack && !(D(D(id)[4])[6] & 4)) id = D(id)[4]; return id; }
function foeMon(id, lv, kind, r) {
  const iv = Array.from({ length: 6 }, () => kind === 'ultra' ? 31 : kind === 'top' ? 20 + rnd(12) : kind === 'boss' ? 14 + rnd(14) : Math.min(31, rnd(16) + Math.min(12, r)));
  const e = kind === 'ultra' ? 24 : kind === 'top' ? 16 : 0;
  return { id, lv, sh: 0, iv, ev: [e, e, e, e, e, e], nat: rnd(25), mv: defaultMoves(id, lv) };
}
/* Nivået trenerne måler seg mot: midt mellom den sterkeste på laget og snittet, så et skjevt lag ikke møter en vegg. */
const teamLv = () => { const p = S.party.map(monBy).filter(Boolean).map(m => m.lv); return p.length ? Math.round((Math.max(...p) + p.reduce((a, b) => a + b, 0) / p.length) / 2) : 5; };
/* Laget til treneren bygges når kampen starter, ut fra nivået ditt akkurat da. Vanskeligheten stiger med trinnet. */
function buildTeam(t) {
  const r = t.r, P = teamLv(), f = Math.min(1.3, 0.62 + 0.02 * Math.min(r, 15) + 0.004 * Math.max(0, r - 15)), base = Math.max(2, Math.round(P * f)), out = [];
  if (t.kind === 'reg') {
    const cls = TCLASS[t.i][2], n = Math.min(6, 1 + Math.floor((r - 1) / 3)), pool = [];
    for (let id = 1; id <= 649; id++) { const d = D(id); if (isLeg(id) || stageOf(id) || (d[6] & 4)) continue; if (cls.length && !cls.includes(d[1]) && !cls.includes(d[2])) continue; const b = BST[id - 1].reduce((a, c) => a + c, 0); if (r < 6 && b > 400) continue; pool.push(id); }
    for (let k = 0; k < n; k++) {
      let id = pool[rnd(pool.length)]; const lv = Math.max(2, base - rnd(2) - (k < n - 1 ? 1 : 0));
      for (let nx = EVO[id]; nx && nx.length; nx = EVO[id]) { const to = nx[rnd(nx.length)]; if (lv < reqLv(to) + (r < 10 ? 2 : 0)) break; id = to; }
      out.push(foeMon(id, lv, 'reg', r));
    }
    return out;
  }
  const list = BLIST[t.kind][t.i][4], n = Math.min(6, t.kind === 'ultra' ? 6 : 2 + Math.floor(r / 5) + (t.kind === 'top' ? 1 : 0));
  const up = { boss: 0, top: 0, ultra: 0 }[t.kind], slack = { boss: 8, top: 10, ultra: 10 }[t.kind];
  const ids = list.slice(1, n).concat(list[0]);
  ids.forEach((id, k) => { const lv = Math.max(3, base + up - (k < ids.length - 1 ? 1 + rnd(2) : 0)); out.push(foeMon(fitForm(id, lv, slack), lv, t.kind, r)); });
  return out;
}
function newBattle() {
  const t = nextTrainer(), info = trainerInfo(t), mine = S.party.map(monBy).filter(Boolean);
  const B = { r: t.r, kind: t.kind, tr: Object.assign({ kind: t.kind, skill: t.kind === 'reg' ? Math.min(0.85, 0.45 + t.r * 0.03) : t.kind === 'boss' ? 0.9 : 1, v: t.i % 3 }, info),
    me: mine.map(bmon), foe: buildTeam(t).map(bmon), a: 0, b: 0, turn: 0, over: null, need: 0, part: new Set([0]), xm: xpMult(), sm: studyMult() };
  return B;
}
/* Kampen er over: XP og nivåer til de som var med, mynter og gjenstander ved seier, og stigen flyttes. */
function finishBattle(B) {
  const win = B.over === 'win', res = { win, r: B.r, ups: [], items: [], coins: 0, record: false, perk: '', kind: B.kind };
  B.me.forEach(b => { const m = b.src; if (!b.xp) return; const l0 = m.lv; m.xp += b.xp; m.lv = lvOf(m.xp); res.ups.push(Object.assign({ u: m.u, xp: b.xp, l0, l1: m.lv, hp: b.hp, max: b.max }, m.lv > l0 ? learnUp(m, l0) : {})); });
  if (win) {
    const sm = B.sm, give = (k, n) => { if (n > 0) { S.items[k] += n; res.items.push(`${n} × ${SHOP[k].n}`); } };
    res.coins = Math.round((40 + 12 * B.r) * KMULT[B.kind] * sm); S.coins += res.coins;
    if (B.kind === 'reg') { if (Math.random() < 0.25 * sm) give('poke', 1 + (sm >= 1.5 ? 1 : 0)); }
    else if (B.kind === 'boss') { give('great', Math.round(2 * sm)); give('candy', sm >= 1 ? 1 : 0); }
    else if (B.kind === 'top') { give('ultra', Math.round(2 * sm)); give('candy', 1); give('stone', 1); S.boost = { n: 3, m: 1.5 }; res.perk = 'Your next 3 focus sessions give 1.5× coins.'; }
    else { give('ultra', Math.round(4 * sm)); give('candy', 3); give('stone', 2); S.boost = { n: 5, m: 2 }; res.perk = 'Your next 5 focus sessions give 2× coins.'; }
    S.lad.n = B.r; S.lad.next = null;
    if (B.r > S.lad.best) { S.lad.best = B.r; res.record = true; }
    res.steal = B.kind === 'reg' ? [] : B.foe.filter(f => !isLeg(f.id)).map(f => ({ id: f.id, lv: Math.min(f.lv, refLv()), iv: f.src.iv.slice(), nat: f.src.nat }));
  } else S.lad.lost = S.lad.day || dayKey();
  save();
  return res;
}

/* ---------- Del 3: skjermene ---------- */
const BT = { B: null, busy: false, v: null, sw: false, res: null, ty: 0 };
const bwait = ms => new Promise(r => setTimeout(r, S.bfast ? ms * 0.4 : ms));
/* Trenerbildene hentes fra Showdown når appen brukes. Finnes ikke bildet, prøves neste navn, og til slutt vises en silhuett. */
const TSP = 'https://play.pokemonshowdown.com/sprites/trainers/';
const tsprite = (img, cls) => { const l = img.split('|'); return `<span class="tsb ${cls || ''}"><img alt="" src="${TSP}${l[0]}.png" data-f="${l.slice(1).join('|')}" onload="this.parentNode.classList.add('ok')" onerror="tsErr(this)"></span>`; };
window.tsErr = img => { const f = (img.dataset.f || '').split('|').filter(Boolean); if (f.length) { img.dataset.f = f.slice(1).join('|'); img.src = TSP + f[0] + '.png'; } else img.remove(); };
/* Lydene i kamp. Tre tydelig forskjellige treff: supereffektivt, vanlig og lite effektivt. */
const BSFX = {
  swing: () => { noise(0, 0.14, 0.05, 900, 3200); },
  beam: () => { tone(900, 0, 0.28, 0.035, 'sawtooth', 2400); noise(0.05, 0.22, 0.025, 4000, 1500); },
  aura: () => { tone(520, 0, 0.3, 0.03, 'triangle', 1040); },
  hit: () => { noise(0, 0.11, 0.09, 1400, 500); tone(180, 0, 0.1, 0.06, 'square', 90); },
  hitS: () => { noise(0, 0.22, 0.12, 2600, 300); tone(240, 0, 0.09, 0.08, 'square', 70); tone(1200, 0.02, 0.2, 0.05, 'square', 300); tone(120, 0.09, 0.16, 0.07, 'square', 60); },
  hitW: () => { noise(0, 0.07, 0.04, 700, 400); tone(140, 0, 0.08, 0.04, 'triangle', 110); },
  faint: () => { tone(520, 0, 0.5, 0.05, 'square', 90); noise(0.25, 0.3, 0.04, 900, 200); },
  up: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.05, 0.07, 0.035)),
  down: () => [784, 659, 523, 392].forEach((f, i) => tone(f, i * 0.05, 0.07, 0.035)),
  ail: () => { tone(300, 0, 0.12, 0.04, 'sawtooth', 220); tone(260, 0.14, 0.14, 0.04, 'sawtooth', 180); },
  heal: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.06, 0.1, 0.03, 'triangle')),
  ball: () => { noise(0, 0.1, 0.05, 1500, 3500); tone(700, 0.05, 0.12, 0.04, 'triangle', 1400); },
  vs: () => { noise(0, 0.5, 0.08, 300, 4000); tone(110, 0, 0.5, 0.07, 'sawtooth', 440); tone(880, 0.5, 0.25, 0.06, 'square'); },
  win: () => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.16, 0.05, 'triangle')),
  lose: () => [392, 370, 349, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.3, 0.05, 'triangle'))
};
/* Enkel kampmusikk (beta): en liten sekvenser med bass, melodi og hi-hat. Egne lydfiler kan komme senere. */
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
    while (MUS.t < AC.currentTime + 0.2) {
      const s = MUS.step, at = Math.max(0, MUS.t - AC.currentTime), b = T.bass[s % T.bass.length], l = T.lead[s % T.lead.length];
      if (b) tone(f(b), at, spb * 0.9, 0.035, 'triangle');
      if (l) tone(f(l), at, spb * 0.75, 0.016, 'square');
      if (T.hi && l) tone(f(l + 12), at, spb * 0.4, 0.007, 'square');
      if (s % 2 === 0) noise(at, 0.03, s % 8 === 4 ? 0.02 : 0.008, 6000, 5000);
      MUS.t += spb; MUS.step++;
    }
  }, 50);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') music(''); else if (BT.B && !BT.B.over && !$('#ov').hidden) music(BT.B.kind === 'reg' ? 'battle' : BT.B.kind === 'boss' ? 'boss' : 'top'); });

/* Kortet på forsiden. */
function ladderCard() {
  const L = S.lad, r = L.n + 1, t = nextTrainer(), info = trainerInfo(t), sm = studyMult(), boss = t.kind !== 'reg';
  const head = `<div class="row" style="justify-content:space-between"><b>Trainer ladder</b><span class="pill tn">Record ${L.best}</span></div>`;
  const who = `<div class="lrow k-${t.kind}">${tsprite(info.img, 'sm')}<div class="sp"><div class="sm tn">Trainer ${r}${boss ? ' · ' + KIND[t.kind] : ''}</div><b class="${boss ? 'bossn' : ''}">${esc(info.title ? info.title + ' ' : '')}${esc(info.n)}</b></div></div>`;
  const mult = `<p class="sm tn">Rewards ×${sm} from ${hrs(ladMin())} h of focus${L.day && L.day !== dayKey() ? ' that day' : ' today'}. Five hours gives ×2.</p>`;
  if (ladLost()) return `<div class="card stack">${head}${who}<p class="sm">You lost this one. The ladder opens again after your next day of focus, and you keep your place.</p></div>`;
  if (!L.day) return `<div class="card stack">${head}${who}${mult}<button type="button" class="btn wide" data-a="bdone">Done for today · open the ladder</button></div>`;
  return `<div class="card stack">${head}${who}${mult}<button type="button" class="go${boss ? ' gold' : ''}" data-a="bfight">Battle</button></div>`;
}

const hpCol = f => f > 0.5 ? 'var(--sage)' : f > 0.2 ? 'var(--gold)' : 'var(--red)';
const STAG = { par: 'PAR', slp: 'SLP', frz: 'FRZ', brn: 'BRN', psn: 'PSN' };
function boxEl(side) {
  const B = BT.B, v = BT.v[side], b = (side === 'me' ? B.me : B.foe)[v.i], f = v.hp / b.max, team = side === 'me' ? B.me : B.foe;
  const xa = xpAt(b.lv), xb = xpAt(b.lv + 1), xf = side === 'me' ? Math.max(0, Math.min(1, (b.src.xp + v.xp - xa) / (xb - xa))) : 0;
  return `<div class="hpn"><b>${esc(b.name)}</b>${v.st ? `<i class="st-${v.st}">${STAG[v.st]}</i>` : ''}<span class="tn">Lv ${b.lv}</span></div>
    <div class="hpbar"><i style="width:${Math.round(f * 100)}%;background:${hpCol(f)}"></i></div>
    <div class="hpf"><span class="dots">${team.map((x, i) => `<i class="${x.hp <= 0 && !(i === v.i && v.hp > 0) ? 'out' : ''}"></i>`).join('')}</span>${side === 'me' ? `<span class="tn">${v.hp} / ${b.max}</span>` : ''}</div>
    ${side === 'me' ? `<div class="xpbar"><i style="width:${Math.round(xf * 100)}%"></i></div>` : ''}`;
}
function paintBox(side) { const el = $('#b-' + side); if (el) el.innerHTML = boxEl(side); }
function paintSprite(side) {
  const B = BT.B, b = (side === 'me' ? B.me : B.foe)[BT.v[side].i], el = $('#s-' + side);
  if (el) { el.className = 'bs ' + side + ' in'; el.innerHTML = spr(b.id, { ani: 1, sh: b.sh, back: side === 'me' }); }
}
function drawBattle() {
  const B = BT.B, tr = B.tr;
  ov(`<div class="btop"><span class="pill tn">Trainer ${B.r}${B.kind !== 'reg' ? ' · ' + KIND[B.kind] : ''}</span><span class="btn-n"><b class="${B.kind !== 'reg' ? 'bossn' : ''}">${esc(tr.n)}</b></span><button type="button" class="btn sm2" data-a="bfast" id="bfast">${S.bfast ? 'Fast' : 'Normal'}</button></div>
    <div class="arena a-${B.kind} v${tr.v}" id="arena" style="--ac:var(--t${tr.ty})">
      <div class="abg"></div><div class="plat pf"></div><div class="plat pm"></div>
      <div class="bs foe" id="s-foe"></div><div class="bs me" id="s-me"></div>
      <div class="hpb foe" id="b-foe"></div><div class="hpb me" id="b-me"></div><div class="fx" id="fx"></div>
    </div>
    <div class="btext" id="btext" aria-live="polite"></div><div id="bmenu" class="bmenu"></div>`, 'battle k-' + B.kind, `var(--t${tr.ty})`);
  fitArena(); paintSprite('foe'); paintSprite('me'); paintBox('foe'); paintBox('me'); drawMenu();
}
/* Spritene forstørres etter bredden på arenaen (spillskjermen er 256 piksler bred). */
function fitArena() { const a = $('#arena'); if (a) a.style.setProperty('--z', (a.clientWidth / 256 * 0.8).toFixed(2)); }
window.addEventListener('resize', fitArena);
function drawMenu() {
  const el = $('#bmenu'); if (!el) return;
  const B = BT.B, me = B.me[B.a];
  if (BT.busy || B.over) { el.innerHTML = ''; return; }
  if (B.need || BT.sw) {
    el.innerHTML = `<div class="lab">${B.need ? 'Choose your next Pokémon' : 'Switch to'}</div><div class="bsw">${B.me.map((b, i) => `<button type="button" data-a="bsw" data-k="${i}"${b.hp <= 0 || (i === B.a && !B.need) ? ' disabled' : ''}>${spr(b.id, { sh: b.sh, s: '40px' })}<span><b>${esc(b.name)}</b><span class="tn">Lv ${b.lv} · ${b.hp}/${b.max}</span></span></button>`).join('')}</div>${B.need ? '' : '<button type="button" class="btn wide" data-a="bback">Back</button>'}`;
    return;
  }
  const any = me.mv.some(x => x.pp > 0);
  el.innerHTML = `<div class="bmv">${any ? me.mv.map((x, k) => { const m = MOVES[x.i], e = m[4] > 0 && !FIXED[m[0]] ? typeEff(m[1], B.foe[B.b]) : 1; return `<button type="button" data-a="bmove" data-k="${k}" style="--c:var(--t${m[1]})"${x.pp > 0 ? '' : ' disabled'}><b>${esc(m[0])}</b><span><i></i>${TYN[m[1]]}${m[2] ? ' · ' + m[2] : ''} · PP ${x.pp}</span>${e !== 1 ? `<em class="${e > 1 ? 'se' : 'nv'}">${e === 0 ? 'No effect' : e > 1 ? 'Super effective' : 'Not very effective'}</em>` : ''}</button>`; }).join('') : '<button type="button" data-a="bmove" data-k="-1" style="--c:var(--t0)"><b>Struggle</b><span>No PP left</span></button>'}</div>
    <div class="row"><button type="button" class="btn sp" data-a="bswitch"${B.me.filter(b => b.hp > 0).length > 1 ? '' : ' disabled'}>Switch</button><button type="button" class="btn sp danger" data-a="bforfeit">Forfeit</button></div>`;
}
function burst(side, n, big) {
  const fx = $('#fx'); if (!fx) return;
  const p = side === 'foe' ? [70, 34] : [26, 70];
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, d = (big ? 46 : 30) + Math.random() * 30, e = document.createElement('i'); e.className = 'pt'; e.style.cssText = `left:${p[0]}%;top:${p[1]}%;--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;--c:var(--t${BT.ty});animation-delay:${i * 12}ms`; fx.append(e); setTimeout(() => e.remove(), 700); }
}
async function playEv(ev) {
  BT.busy = true; drawMenu();
  const B = BT.B, txt = $('#btext');
  for (const e of ev) {
    if ($('#ov').hidden || BT.B !== B) return;
    const sp = e.side ? $('#s-' + e.side) : null, v = e.side ? BT.v[e.side] : null;
    if (e.t === 'msg') { txt.textContent = e.s; await bwait(820); }
    else if (e.t === 'anim') {
      BT.ty = e.ty; const fx = $('#fx');
      if (e.cls === 1) { BSFX.swing(); sp.classList.add('lunge'); await bwait(260); sp.classList.remove('lunge'); }
      else if (e.cls === 2) { BSFX.beam(); const p = document.createElement('i'); p.className = 'proj from-' + e.side; p.style.setProperty('--c', `var(--t${e.ty})`); fx.append(p); await bwait(380); p.remove(); }
      else { BSFX.aura(); sp.classList.add('aura'); sp.style.setProperty('--c', `var(--t${e.ty})`); await bwait(380); sp.classList.remove('aura'); }
    }
    else if (e.t === 'hit') {
      v.hp = e.hp; paintBox(e.side);
      if (!e.quiet) { if (e.e > 1) BSFX.hitS(); else if (e.e < 1) BSFX.hitW(); else BSFX.hit(); burst(e.side, e.e > 1 ? 14 : e.e < 1 ? 4 : 8, e.e > 1); buzz(e.e > 1 ? [40, 30, 60] : 25); }
      sp.classList.add('hurt'); if (e.e > 1 || e.crit) { $('#arena').classList.add('shake'); if (e.e > 1) $('#arena').classList.add('flash'); }
      await bwait(430); sp.classList.remove('hurt'); $('#arena').classList.remove('shake', 'flash');
    }
    else if (e.t === 'heal') { v.hp = e.hp; BSFX.heal(); paintBox(e.side); await bwait(350); }
    else if (e.t === 'status') { v.st = e.st; if (e.st) BSFX.ail(); paintBox(e.side); await bwait(200); }
    else if (e.t === 'stat') { (e.up ? BSFX.up : BSFX.down)(); sp.classList.add(e.up ? 'sup' : 'sdn'); await bwait(380); sp.classList.remove('sup', 'sdn'); }
    else if (e.t === 'faint') { BSFX.faint(); cry((e.side === 'me' ? B.me : B.foe)[v.i].id, 0, 0.3); sp.classList.add('faint'); await bwait(650); }
    else if (e.t === 'switch') { const b = (e.side === 'me' ? B.me : B.foe)[e.i]; BT.v[e.side] = { i: e.i, hp: e.hp, st: e.st, xp: e.xp }; BSFX.ball(); paintSprite(e.side); paintBox(e.side); cry(b.id, 250, 0.35); await bwait(520); if (e.side === 'foe') S.seen[b.id] = 1; }
    else if (e.t === 'xp') { if (e.i === BT.v.me.i) { BT.v.me.xp += e.got; paintBox('me'); } }
  }
  BT.busy = false;
  if (B.over) return endBattle();
  BT.sw = false; drawMenu();
}
async function vsIntro(B) {
  const tr = B.tr, lead = B.me[0];
  ov(`<div class="vs vs-${B.kind}" style="--ac:var(--t${tr.ty})">${B.kind === 'ultra' ? '<div class="vs-pre">A legendary trainer appears</div>' : ''}<div class="vs-a"><div class="vs-rays"></div>${tsprite(tr.img, 'big')}<div class="vs-n"><span>${esc(tr.title)}</span><b>${esc(tr.n)}</b></div></div>
    <div class="vs-mid"><b>VS</b>${B.kind !== 'boss' ? `<span>${KIND[B.kind]}</span>` : ''}</div>
    <div class="vs-b">${spr(lead.id, { ani: 1, sh: lead.sh, back: 1, s: '130px' })}<div class="vs-n"><span>Trainer ${B.r}</span><b>You</b></div></div></div>`, 'battle vsov');
  /* Vanlig kampmusikk først, og så slår den over til bossmusikken idet «VS» smeller inn. */
  const slam = B.kind === 'ultra' ? 1700 : 550;
  music('battle');
  await new Promise(r => setTimeout(r, slam));
  if (BT.B !== B) return;
  music(B.kind === 'boss' ? 'boss' : 'top'); BSFX.vs(); buzz([60, 40, 60, 40, 200]);
  await new Promise(r => setTimeout(r, B.kind === 'ultra' ? 2300 : B.kind === 'top' ? 2100 : 1700));
}
async function startBattle() {
  if (BT.busy) return;
  if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.');
  const B = newBattle(); BT.B = B; BT.sw = false; BT.res = null;
  BT.v = { me: { i: 0, hp: B.me[0].hp, st: '', xp: 0 }, foe: { i: 0, hp: B.foe[0].hp, st: '', xp: 0 } };
  S.seen[B.foe[0].id] = 1;
  if (B.kind !== 'reg') { BT.busy = true; await vsIntro(B); BT.busy = false; if (BT.B !== B) return; } else music('battle');
  drawBattle();
  cry(B.foe[0].id, 500, 0.35);
  playEv([{ t: 'msg', s: `${B.tr.title ? B.tr.title + ' ' : ''}${B.tr.n} wants to battle!` }, { t: 'msg', s: `${B.tr.n} sent out ${B.foe[0].name}!` }, { t: 'msg', s: `Go! ${B.me[0].name}!` }, { t: 'msg', s: `What will ${B.me[0].name} do?` }]);
}
function endBattle() {
  const B = BT.B; music('');
  const res = BT.res = finishBattle(B);
  if (res.win) BSFX.win(); else BSFX.lose();
  if (res.win && res.steal.length) return stealScreen();
  overview();
}
function stealScreen() {
  const B = BT.B, res = BT.res;
  ov(`<div class="mid" style="justify-content:flex-start;padding-top:5vh"><div><h1 class="big">You beat ${esc(B.tr.n)}.</h1><p class="mut" style="margin-top:6px">Choose one Pokémon from the team to keep.</p></div>
    <div class="stealg">${res.steal.map((x, i) => `<button type="button" class="card" data-a="bsteal" data-k="${i}" style="--tc:var(--t${D(x.id)[1]})">${spr(x.id, { ani: 1 })}<b>${esc(D(x.id)[0])}</b><span class="sm tn">Lv ${x.lv} · ${tierEl(x.id)}</span><span class="row" style="gap:4px;justify-content:center;flex-wrap:wrap">${types(x.id)}</span></button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn nf" data-a="bsteal" data-k="-1">Skip</button></div>`, 'tint', `var(--t${B.tr.ty})`);
}
function overview() {
  const B = BT.B, res = BT.res, L = S.lad;
  const team = B.me.map(b => { const u = res.ups.find(x => x.u === b.src.u); return `<div class="hofr">${spr(b.id, { sh: b.sh, s: '48px' })}<div class="sp"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><span class="sm tn">${u && u.l1 > u.l0 ? `<b style="color:var(--gold)">Lv ${u.l0} → ${u.l1}</b>` : 'Lv ' + b.src.lv}</span></div>
    <div class="hpbar" style="margin-top:5px"><i style="width:${Math.round(b.hp / b.max * 100)}%;background:${hpCol(b.hp / b.max)}"></i></div>
    <div class="sm tn" style="margin-top:3px">${u ? '+' + nb(u.xp) + ' XP' : 'No XP this time'}${u && (u.learned || []).length ? ' · learned ' + esc(u.learned.join(', ')) : ''}${u && (u.avail || []).length ? ' · new move to pick: ' + esc(u.avail.join(', ')) : ''}</div></div></div>`; }).join('');
  ov(`<div class="hof"><div class="hof-h"><span>${res.win ? 'VICTORY' : 'DEFEAT'}</span><span class="tn">Trainer ${res.r}</span></div>
      <div class="hof-stage">${B.me.map((b, i) => `<span style="--i:${i};--n:${B.me.length}" class="${b.hp <= 0 ? 'ko' : ''}">${spr(b.id, { ani: 1, sh: b.sh })}</span>`).join('')}</div>
      <p class="hof-t">${res.win ? `You beat ${esc(B.tr.title ? B.tr.title + ' ' : '')}${esc(B.tr.n)}.` : `${esc(B.tr.n)} won this time. You keep your place and all the XP.`}</p></div>
    <div class="card stack">${team}</div>
    ${res.win ? `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Rewards</b><span class="pill tn">×${B.sm} study bonus</span></div>
      <div class="row" style="justify-content:space-between"><span>Coins</span>${coinEl(res.coins)}</div>
      ${res.items.map(x => `<div class="row" style="justify-content:space-between"><span>Item</span><b>${x}</b></div>`).join('')}
      ${res.got ? `<div class="row" style="justify-content:space-between"><span>New Pokémon</span><b>${esc(res.got)}</b></div>` : ''}
      ${res.perk ? `<p class="sm" style="color:var(--gold)">${res.perk}</p>` : ''}</div>` : ''}
    <div class="card row" style="justify-content:space-between"><span>${res.win ? 'Next: trainer ' + (L.n + 1) : esc(B.tr.n) + ' waits at trainer ' + (L.n + 1)}</span><span class="pill tn"${res.record ? ' style="background:var(--gold);color:#2a2109"' : ''}>${res.record ? 'New record · ' : 'Record '}${L.best}</span></div>
    <div class="acts">${res.win ? '<button type="button" class="btn gold" data-a="bfight">Next trainer</button><button type="button" class="btn nf" data-a="home">Done</button>' : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`, 'tint ovtop', res.win ? 'var(--gold)' : 'var(--red)');
  BT.B = Object.assign(B, { shown: 1 });
}
/* Handlingene i kamp (kobles inn i klikk-håndteringen i ui.js). */
const BA = {
  bdone: () => { S.lad.day = dayKey(); save(); sfx.ok(); render(); toast('The ladder is open. Battle now or later tonight.'); },
  bfight: () => { if (!ladderOpen()) { closeOv(); render(); return; } sfx.start(); BT.busy = false; startBattle(); },
  bfast: () => { S.bfast = S.bfast ? 0 : 1; save(true); const b = $('#bfast'); if (b) b.textContent = S.bfast ? 'Fast' : 'Normal'; },
  bmove: el => { if (BT.busy || BT.B.over) return; playEv(runTurn(BT.B, { t: 'move', k: +el.dataset.k })); },
  bswitch: () => { BT.sw = true; drawMenu(); },
  bback: () => { BT.sw = false; drawMenu(); },
  bsw: el => { if (BT.busy) return; const B = BT.B, i = +el.dataset.k; BT.sw = false; playEv(B.need ? sendIn(B, i) : runTurn(B, { t: 'switch', i })); },
  bforfeit: el => { if (BT.busy) return; if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again to give up'; return; } BT.B.over = 'loss'; endBattle(); },
  bsteal: el => { const res = BT.res, x = res.steal[+el.dataset.k]; if (x) { const m = addMon(x.id, x.lv, 0); m.iv = x.iv; m.nat = x.nat; res.got = `${D(x.id)[0]} · Lv ${x.lv}`; save(); sfx.got(); cry(x.id, 200); } res.steal = []; overview(); }
};
