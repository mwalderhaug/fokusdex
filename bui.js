'use strict';
/* Fokusdex – kampskjermene: kortene på forsiden, oppstilling før kampen, selve kampen, oppgjøret etterpå og Battle Factory.
   Reglene ligger i battle.js og league.js, effektene i bfx.js. */

const BT = { B: null, busy: false, v: null, menu: 'main', res: null, ty: 0, tap: null, lead: 0, fsel: [], tp: null, fs: null };
const spdF = () => S.bfast ? 2.1 : 1;
const bwait = ms => new Promise(r => setTimeout(r, ms / spdF()));
const TIER = k => k === 'legend' ? 'ultra' : SUPER.has(k) ? 'top' : k === 'gym' || k === 'rival' || k === 'fachead' ? 'boss' : 'reg';
const KIND = { boss: 'Boss', top: 'Top boss', ultra: 'Legendary trainer' };
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
  recall: () => { tone(1200, 0, 0.18, 0.04, 'triangle', 400); },
  vs: () => { noise(0, 0.5, 0.08, 300, 4000); tone(110, 0, 0.5, 0.07, 'sawtooth', 440); tone(880, 0.5, 0.25, 0.06, 'square'); },
  ace: () => { noise(0, 0.9, 0.09, 200, 5000); tone(80, 0, 0.9, 0.08, 'sawtooth', 640); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5 + i * 0.07, 0.2, 0.05, 'square')); },
  win: () => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.16, 0.05, 'triangle')),
  lose: () => [392, 370, 349, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.3, 0.05, 'triangle'))
};
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
/* Hvilken musikk som hører til kampen. Her kobles egne lydfiler per trener inn senere. */
const musicKey = B => ({ reg: 'battle', boss: 'boss', top: 'top', ultra: 'top' })[TIER(B.tr.kind)];
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') music(''); else if (BT.B && !BT.B.over && $('#arena')) music(musicKey(BT.B)); });

/* ---------- Forsiden ---------- */
const leagueTag = () => { const L = S.lad, ri = rungInfo(L.n); return `${L.lap ? 'Lap ' + (L.lap + 1) + ' · ' : ''}${ri.st.n}${ri.st.c > 1 ? ' ' + (ri.k + 1) + '/' + ri.st.c : ''}`; };
function ladderCard() {
  const L = S.lad, t = nextTrainer(), tr = trainerInfo(t), sm = studyMult(), bo = dayBoost(), tier = TIER(tr.kind), R = S.fac.run;
  const prog = `<div class="lgp" aria-hidden="true">${STAGES.slice(0, 7).map((st, si) => Array.from({ length: st.c }, (_, k) => { const n = STAGES.slice(0, si).reduce((a, x) => a + x.c, 0) + k; return `<i class="${n < L.n ? 'on' : n === L.n ? 'cur' : ''}${k === 0 && si ? ' gap' : ''}"></i>`; }).join('')).join('')}</div>`;
  const who = `<div class="lrow k-${tier}">${tsprite(tr.img, 'sm')}<div class="sp"><div class="sm tn">${esc(leagueTag())}${tier !== 'reg' ? ' · ' + KIND[tier] : ''}</div><b class="${tr.boss ? 'bossn' : ''}">${esc(tr.title ? tr.title + ' ' : '')}${esc(tr.n)}</b></div></div>`;
  const fac = `<div class="modec"><span class="ficon">F</span><div class="sp"><b>Battle Factory</b><div class="sm tn">${R ? `Round ${R.round} · ${R.w}/7 wins · streak ${R.streak}` : `Rent 4 of 7 random Pokémon${S.fac.best ? ' · best streak ' + S.fac.best : ''}`}</div></div></div>`;
  const tag = m => bo.mode === m ? `<span class="bonus">Today's bonus</span>` : '';
  if (!L.day) return `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Battles</b><span class="pill tn">Lap ${L.lap + 1}</span></div>${who}${prog}
    <p class="sm">Two ways to battle once you are done studying: the League (your own team, XP and Rare Candy) and the Battle Factory (rental Pokémon, items and encounters). Today's bonus is on the ${bo.mode === 'league' ? 'League' : 'Battle Factory'}.</p>
    <button type="button" class="btn wide" data-a="bdone">Done for today · open battles</button></div>`;
  const mult = `<p class="sm tn">Rewards ×${sm} from ${hrs(ladMin())} h of focus${L.day !== dayKey() ? ' that day' : ' today'}. Five hours gives ×2.</p>`;
  return `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Trainer League</b>${tag('league')}</div>${who}${prog}
      ${ladLost() ? '<p class="sm">You lost this one. The League opens again after your next day of focus, and you keep your place and the XP.</p>' : `<p class="sm">${bo.mode === 'league' ? '+30% XP and better odds for Rare Candy today. ' : ''}XP for the whole team after each battle. A loss closes the League for the day.</p><button type="button" class="go${tr.boss ? ' gold' : ''}" data-a="bpre">Battle</button>`}</div>
    <div class="card stack"><div class="row" style="justify-content:space-between"><b>Battle Factory</b>${tag('factory')}</div>${fac}
      ${facLost() ? '<p class="sm">Your run ended. The Factory opens again after your next day of focus.</p>' : `<p class="sm">${bo.mode === 'factory' ? '1.5× luck on items and encounters today. ' : ''}No XP here: you win items and encounters. A loss ends the run.</p><button type="button" class="btn wide gold" data-a="fenter">${R ? 'Continue the run' : 'Enter the Factory'}</button>`}</div>${mult}`;
}
/* Oppstilling før en ligakamp: hvem du møter, og hvem av dine som går ut først. */
function preBattle() {
  const t = nextTrainer(), tr = trainerInfo(t), ri = rungInfo(t.n), st = ri.st, tier = TIER(tr.kind), team = S.party.map(monBy).filter(Boolean);
  const n = Math.round(st.mons[0] + (st.mons[1] - st.mons[0]) * ri.f), lv = rungLv(ri, S.lad.lap);
  if (!S.party.includes(BT.lead)) BT.lead = S.party[0];
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">${esc(leagueTag())}</span></div>
    <div class="card k-${tier}"><div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${tier !== 'reg' ? KIND[tier] + ' · ' : ''}${esc(st.n)}</div><b class="${tr.boss ? 'bossn' : ''}" style="font-size:19px">${esc(tr.title ? tr.title + ' ' : '')}${esc(tr.n)}</b><div class="sm tn" style="margin-top:4px">${n} Pokémon · around Lv ${lv}</div></div></div></div>
    <div><div class="lab">Your team · tap the one that leads</div><div class="lineup">${team.map(m => `<button type="button" data-a="blead" data-u="${m.u}" class="${m.u === BT.lead ? 'lead' : ''}">${spr(m.id, { sh: m.sh })}<span class="sp"><b>${esc(D(m.id)[0])}</b><br><span class="sm tn">Lv ${m.lv} · ${m.mv.map(x => esc(MOVES[x][0])).join(', ')}</span></span>${hasNews(m) ? '<span class="bang">!</span>' : ''}${m.u === BT.lead ? '<span class="pill">Leads</span>' : ''}</button>`).join('')}</div></div>
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
  return `<div class="hpn"><b>${esc(b.name)}</b>${v.st ? `<i class="st-${v.st}">${STAG[v.st]}</i>` : ''}<span class="blv tn"><small>Lv</small>${b.lv}</span></div>
    <div class="hpr"><em>HP</em><div class="hpbar"><i style="width:${(f * 100).toFixed(1)}%;background:${hpCol(f)}"></i></div></div>
    <div class="hpf"><span class="dots">${team.map((x, i) => `<i class="${x.out && !(i === v.i && v.hp > 0) ? 'out' : ''}"></i>`).join('')}</span>${side === 'me' ? `<span class="hpnum tn">${v.hp}/${b.max}</span>` : ''}</div>
    ${side === 'me' && B.mode === 'league' ? `<div class="xpr"><em>EXP</em><div class="xpbar"><i style="width:${Math.round(xf * 100)}%"></i></div></div>` : ''}`;
}
function paintBox(side) { const el = $('#b-' + side); if (el) { el.innerHTML = boxEl(side); el.hidden = false; } }
function paintSprite(side, cls) {
  const b = teamOf(side)[BT.v[side].i], el = $('#s-' + side);
  if (el) { el.className = 'bs ' + side + ' ' + (cls || ''); el.innerHTML = spr(b.id, { ani: 1, sh: b.sh, back: side === 'me' }); }
}
/* HP-linja glir gradvis mot det nye tallet, og tallet teller med. Lengre fall tar lengre tid. */
function hpTo(side, hp) {
  const B = BT.B, v = BT.v[side], b = teamOf(side)[v.i], from = v.hp, bar = $('#b-' + side + ' .hpbar i'), num = $('#b-' + side + ' .hpnum');
  const dur = Math.max(320, Math.min(1400, Math.abs(from - hp) / b.max * 1700)) / spdF(), t0 = performance.now();
  v.hp = hp;
  if (from === hp || !bar) return Promise.resolve();
  return new Promise(res => (function f(t) {
    const k = Math.min(1, (t - t0) / dur), x = from + (hp - from) * k;
    if (BT.B !== B || !bar.isConnected) return res();
    bar.style.width = (x / b.max * 100).toFixed(1) + '%'; bar.style.background = hpCol(x / b.max);
    if (num) num.textContent = Math.round(x) + '/' + b.max;
    if (k < 1) requestAnimationFrame(f); else res();
  })(t0));
}
/* Midten av en Pokémon i effektlerretets piksler (256 × 192). */
function fxPos(side) {
  const ar = $('#arena'), img = document.querySelector('#s-' + side + ' img'), def = side === 'foe' ? { x: 189, y: 66 } : { x: 62, y: 146 };
  if (!ar || !img || !img.naturalWidth) return def;
  const A = ar.getBoundingClientRect(), r = img.getBoundingClientRect(), k = 256 / A.width;
  return r.width ? { x: (r.left + r.width / 2 - A.left) * k, y: Math.min(184, (r.top + r.height * 0.55 - A.top) * k) } : def;
}
/* Spritene forstørres etter bredden på arenaen (spillskjermen er 256 piksler bred). */
function fitArena() { const a = $('#arena'); if (a) a.style.setProperty('--z', (a.clientWidth / 256 * 0.8).toFixed(2)); }
window.addEventListener('resize', fitArena);
function battleTag(B) { return B.mode === 'fac' ? `Factory · Round ${B.round} · ${B.w + 1}/7` : `${B.lap ? 'Lap ' + (B.lap + 1) + ' · ' : ''}${B.st.n}${B.st.c > 1 ? ' ' + (B.rk + 1) + '/' + B.st.c : ''}`; }
function drawBattle() {
  const B = BT.B, tr = B.tr, tier = TIER(tr.kind);
  ov(`<div class="btop k-${tier}"><span class="pill tn">${esc(battleTag(B))}</span><span class="btn-n"><b class="${tr.boss ? 'bossn' : ''}">${esc(tr.title ? tr.title + ' ' : '')}${esc(tr.n)}</b></span></div>
    <div class="bscreen t-${tier}"><div class="arena a-${tr.arena} v${tr.v} t-${tier}" id="arena" style="--ac:var(--t${tr.ty})">
      <div class="abg"></div><div class="plat pf"></div><div class="plat pm"></div>
      <div class="trn" id="trn">${tsprite(tr.img)}</div>
      <div class="bs foe gone" id="s-foe"></div><div class="bs me gone" id="s-me"></div>
      <canvas class="fxc" id="fxc" width="256" height="192"></canvas><div class="fx" id="fx"></div>
      <div class="hpb foe" id="b-foe" hidden></div><div class="hpb me" id="b-me" hidden></div>
    </div><button type="button" class="btext" id="btext" data-a="btap" aria-live="polite"><span id="btx"></span><i></i></button></div>
    <div id="bmenu" class="bmenu"></div>`, 'battle k-' + tier, `var(--t${tr.ty})`);
  FX.attach($('#fxc')); FX.speed = spdF();
  FX.hooks.shake = ms => { const a = $('#arena'); if (!a) return; a.classList.add('shake'); clearTimeout(BT.shT); BT.shT = setTimeout(() => a.classList.remove('shake'), ms); };
  fitArena();
}
/* Teksten skrives fram bokstav for bokstav. Trykk på boksen for å hoppe fram. */
function setText(s) { const el = $('#btx'); if (el) el.textContent = s; const b = $('#btext'); if (b) b.classList.remove('wait'); }
async function typeOut(s) {
  const el = $('#btx'), B = BT.B; if (!el) return;
  let i = 0, skip = false; BT.tap = () => { skip = true; };
  $('#btext').classList.remove('wait');
  while (i < s.length && !skip) { i = Math.min(s.length, i + (S.bfast ? 3 : 1)); el.textContent = s.slice(0, i); await new Promise(r => setTimeout(r, 17)); if (BT.B !== B || !el.isConnected) return; }
  el.textContent = s; BT.tap = null;
}
async function say(s) {
  await typeOut(s);
  const b = $('#btext'); if (!b) return;
  b.classList.add('wait');
  await new Promise(r => { const id = setTimeout(r, (S.bfast ? 420 : 950)); BT.tap = () => { clearTimeout(id); r(); }; });
  BT.tap = null; b.classList.remove('wait');
}
function drawMenu() {
  const el = $('#bmenu'); if (!el) return;
  const B = BT.B;
  if (!B || BT.busy || B.over) { el.innerHTML = ''; return; }
  const me = B.me[B.a];
  if (B.need || BT.menu === 'team') {
    el.innerHTML = `<div class="bsw">${B.me.map((b, i) => `<button type="button" data-a="bsw" data-k="${i}" class="${i === B.a && !B.need ? 'cur' : ''}"${b.hp <= 0 || (i === B.a && !B.need) ? ' disabled' : ''}>${spr(b.id, { sh: b.sh, s: '40px' })}<span class="sp"><span class="bn"><span>${esc(b.name)}${b.status ? ' · ' + STAG[b.status] : ''}</span><span class="tn">Lv ${b.lv}</span></span><div class="hpbar"><i style="width:${Math.round(b.hp / b.max * 100)}%;background:${hpCol(b.hp / b.max)}"></i></div><small class="tn">${b.hp <= 0 ? 'Fainted' : b.hp + '/' + b.max}${i === B.a && !B.need ? ' · in battle' : ''}</small></span></button>`).join('')}</div>${B.need ? '' : '<button type="button" class="bback" data-a="bback">BACK</button>'}`;
    return;
  }
  if (BT.menu === 'moves') {
    const any = me.mv.some((x, k) => moveOk(B, k));
    el.innerHTML = `<div class="bmv">${any ? me.mv.map((x, k) => { const m = MOVES[x.i]; return `<button type="button" data-a="bmove" data-k="${k}" style="--c:var(--b${m[1]})"${moveOk(B, k) ? '' : ' disabled'}><b>${esc(m[0])}</b><span class="mrow"><span class="mty">${TYN[m[1]]}</span><span class="tn">PP ${x.pp}/${x.max}</span></span></button>`; }).join('') : '<button type="button" data-a="bmove" data-k="-1" style="--c:var(--b0)"><b>Struggle</b><span class="mrow"><span class="mty">Normal</span><span>No moves left</span></span></button>'}</div><button type="button" class="bback" data-a="bback">BACK</button>`;
    return;
  }
  if (BT.menu === 'pause') {
    el.innerHTML = `<div class="bsw"><button type="button" class="bback" data-a="bback">RESUME</button><button type="button" class="bback" data-a="bfast">SPEED: ${S.bfast ? 'FAST' : 'NORMAL'}</button><button type="button" class="bback" data-a="bmusic"${S.sound ? '' : ' disabled'}>MUSIC: ${S.music === 0 ? 'OFF' : 'ON'}</button><button type="button" class="bback" data-a="bforfeit" style="background:linear-gradient(#b0483c,#7a2a22)">FORFEIT</button></div>`;
    return;
  }
  el.innerHTML = `<div class="bmain"><button type="button" class="bm-fight" data-a="bfightm">${BURST}<span>FIGHT</span></button>
    <button type="button" class="bm-b bm-pk" data-a="bswitch"${B.me.filter(b => b.hp > 0).length > 1 && canSwitch(B) ? '' : ' disabled'}>POKÉMON</button><button type="button" class="bm-b bm-pa" data-a="bpause">PAUSE</button></div>`;
}
/* Ballen kastes inn mot plattformen. Bosser bruker finere baller. */
function tossBall(side) {
  const fx = $('#fx'); if (!fx) return Promise.resolve();
  const tier = TIER(BT.B.tr.kind), ms = 520 / spdF(), el = document.createElement('i');
  el.className = 'pball ' + side; el.style.setProperty('--d', ms + 'ms'); el.innerHTML = ballEl(side === 'me' || tier === 'reg' ? 'poke' : tier === 'boss' ? 'great' : 'ultra');
  fx.append(el); sfx.thr();
  return new Promise(r => setTimeout(() => { el.remove(); r(); }, ms));
}
const wob = (side, ms) => { const sp = $('#s-' + side); if (sp) { sp.classList.add('wob'); setTimeout(() => sp.classList.remove('wob'), ms / spdF()); } };
/* Spiller av én hendelse fra motoren. */
async function playOne(B, e) {
  const side = e.side, sp = side ? $('#s-' + side) : null, v = side ? BT.v[side] : null;
  if (e.t === 'msg') return say(e.s);
  if (e.t === 'anim') {
    const m = e.mi >= 0 ? MOVES[e.mi] : STRUGGLE, a = fxPos(side), b = e.self ? a : fxPos(opp(side)), lunge = m[4] === 1 && FX.contact(m);
    BT.ty = m[1];
    if (lunge) { BSFX.swing(); sp.classList.add('lunge'); await bwait(130); } else if (m[4] === 2) BSFX.beam(); else if (m[4] === 0) BSFX.aura(); else BSFX.swing();
    await FX.move(m, a, b, { roll: e.roll, self: BOOM.has(m[0]), wobble: ms => wob(opp(side), ms) });
    sp.classList.remove('lunge');
  }
  else if (e.t === 'hit') {
    if (!e.quiet) {
      if (e.e > 1) BSFX.hitS(); else if (e.e < 1) BSFX.hitW(); else BSFX.hit();
      FX.hit(fxPos(side), BT.ty, e.e, e.crit); buzz(e.e > 1 ? [40, 30, 60] : 25);
      sp.classList.add('hurt'); if (e.e > 1 || e.crit) FX.hooks.shake(280);
    }
    if (e.sub) await bwait(320); else await Promise.all([hpTo(side, e.hp), bwait(e.quiet ? 250 : 440)]);
    sp.classList.remove('hurt');
  }
  else if (e.t === 'heal') { BSFX.heal(); if (!e.q) FX.heal(fxPos(side)); await Promise.all([hpTo(side, e.hp), bwait(400)]); }
  else if (e.t === 'status') { v.st = e.st; const hp = v.hp; paintBox(side); v.hp = hp; if (e.fx) { BSFX.ail(); FX.status(e.fx, fxPos(side)); await bwait(520); } }
  else if (e.t === 'stat') { (e.up ? BSFX.up : BSFX.down)(); FX.stat(fxPos(side), e.up); sp.classList.add(e.up ? 'sup' : 'sdn'); await bwait(520); sp.classList.remove('sup', 'sdn'); }
  else if (e.t === 'faint') { BSFX.faint(); cry(teamOf(side)[v.i].id, 0, 0.3); sp.classList.remove('ace'); sp.classList.add('faint'); await bwait(850); paintBox(side); $('#b-' + side).hidden = true; }
  else if (e.t === 'recall') { if (e.txt) await typeOut(e.txt); BSFX.recall(); sp.classList.remove('ace', 'subd', 'away'); sp.classList.add('recall'); $('#b-' + side).hidden = true; await bwait(420); sp.classList.add('gone'); }
  else if (e.t === 'send') {
    const team = teamOf(side), b = team[e.i], ace = side === 'foe' && B.tr.boss && team.length > 1 && e.i === team.length - 1, big = ace && SUPER.has(B.tr.kind);
    BT.v[side] = { i: e.i, hp: e.hp, st: e.st };
    if (big) { music(''); await say(`${B.tr.n} is down to the last Pokémon…`); }
    await typeOut(e.txt);
    sp.className = 'bs ' + side + ' gone'; $('#b-' + side).hidden = true;
    await tossBall(side);
    if (big) { BSFX.ace(); buzz([80, 40, 80, 40, 240]); await FX.ace(side === 'foe' ? { x: 189, y: 74 } : { x: 62, y: 150 }, B.tr.ty, B.tr.kind === 'legend'); music(musicKey(B)); }
    paintSprite(side, 'in' + (ace ? ' ace' : '')); BSFX.ball(); FX.open(side === 'foe' ? { x: 189, y: 72 } : { x: 62, y: 150 }, big ? '#ffe9a8' : '');
    cry(b.id, 200, big ? 0.5 : 0.35); if (big) FX.hooks.shake(500);
    await bwait(380); paintBox(side);
    S.seen[b.id] = 1;
    await bwait(big ? 1100 : 620);
    sp.classList.remove('in');
  }
  else if (e.t === 'vanish') { sp.classList.toggle('away', !!e.on); await bwait(260); }
  else if (e.t === 'sub') { sp.classList.toggle('subd', !!e.on); await bwait(200); }
  else if (e.t === 'wx') { const a = $('#arena'); if (e.k) { a.dataset.wx = e.k; FX.weather(e.k); await bwait(640); } else delete a.dataset.wx; }
}
async function playEv(ev) {
  BT.busy = true; drawMenu();
  const B = BT.B;
  for (const e of ev) { if (BT.B !== B || !$('#arena')) return; await playOne(B, e); }
  if (BT.B !== B || !$('#arena')) return;
  BT.busy = false;
  if (B.over) return endBattle();
  if (!B.need) { const a = autoAct(B); if (a) { BT.busy = true; await bwait(260); if (BT.B !== B) return; return playEv(runTurn(B, a)); } }
  setText(B.need ? 'Choose your next Pokémon.' : `What will ${B.me[B.a].name} do?`);
  BT.menu = 'main'; drawMenu();
}
async function vsIntro(B) {
  const tr = B.tr, lead = B.me[0], tier = TIER(tr.kind);
  ov(`<div class="vs vs-${tier}" style="--ac:var(--t${tr.ty})">${tier === 'ultra' ? '<div class="vs-pre">A legendary trainer appears</div>' : ''}<div class="vs-a"><div class="vs-rays"></div>${tsprite(tr.img, 'big')}<div class="vs-n"><span>${esc(tr.title)}</span><b>${esc(tr.n)}</b></div></div>
    <div class="vs-mid"><b>VS</b>${tier !== 'boss' ? `<span>${KIND[tier]}</span>` : ''}</div>
    <div class="vs-b">${spr(lead.id, { ani: 1, sh: lead.sh, back: 1, s: '130px' })}<div class="vs-n"><span>${esc(battleTag(B))}</span><b>You</b></div></div></div>`, 'battle vsov');
  /* Vanlig kampmusikk først, og så slår den over til bossmusikken idet «VS» smeller inn. */
  const slam = tier === 'ultra' ? 1700 : 550;
  music('battle');
  await new Promise(r => setTimeout(r, slam));
  if (BT.B !== B) return;
  music(musicKey(B)); BSFX.vs(); buzz([60, 40, 60, 40, 200]);
  await new Promise(r => setTimeout(r, tier === 'ultra' ? 2300 : tier === 'top' ? 2100 : 1700));
}
async function wipeIntro() {
  const o = $('#ov'), w = document.createElement('div');
  w.className = 'wipe'; w.innerHTML = '<i></i><i></i>'; o.append(w); sfx.appear(); buzz([40, 40, 40]);
  await new Promise(r => setTimeout(r, 820));
}
/* Starter en kamp: overgang, treneren på plattformen, ballkast fra begge sider, og så menyen. */
async function startBattle(B) {
  if (BT.busy && BT.B && !BT.B.over) return;
  BT.B = B; BT.menu = 'main'; BT.res = null; BT.ty = 0; BT.busy = true;
  BT.v = { me: { i: 0, hp: B.me[0].hp, st: '' }, foe: { i: 0, hp: B.foe[0].hp, st: '' } };
  if (B.tr.boss) await vsIntro(B); else { await wipeIntro(); music('battle'); }
  if (BT.B !== B) return;
  drawBattle(); drawMenu();
  await bwait(350);
  await say(`${B.tr.title ? B.tr.title + ' ' : ''}${B.tr.n} wants to battle!`);
  if (BT.B !== B || !$('#arena')) return;
  $('#trn').classList.add('out');
  await playOne(B, { t: 'send', side: 'foe', i: 0, hp: B.foe[0].hp, st: '', txt: `${B.tr.n} sent out ${B.foe[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  await playOne(B, { t: 'send', side: 'me', i: 0, hp: B.me[0].hp, st: '', txt: `Go! ${B.me[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  BT.busy = false; setText(`What will ${B.me[0].name} do?`); drawMenu();
}
function endBattle() {
  const B = BT.B; music(''); BT.busy = false;
  const res = BT.res = B.mode === 'fac' ? finishFactory(B) : finishLeague(B);
  if (res.win) BSFX.win(); else BSFX.lose();
  BT.tp = null; BT.fs = null;
  overview();
}

/* ---------- Etter kampen ---------- */
const encLine = res => res.encs.length ? `<div class="row" style="justify-content:space-between"><span>Encounters</span><b>${res.encs.length} waiting in the grass${res.encs.some(e => e.t >= 4) ? ' · legendary' : res.encs.some(e => e.t >= 3) ? ' · epic' : ''}</b></div>` : '';
const monCard = (x, a, k, on) => `<button type="button" data-a="${a}" data-k="${k}" aria-pressed="${!!on}" style="--tc:var(--t${D(x.id)[1]})">${spr(x.id, { ani: 1 })}<b>${esc(D(x.id)[0])}</b><span class="sm tn">Lv ${x.lv}${x.iv ? ' · ' + judge(x).t : ''}</span><span class="row" style="gap:4px;justify-content:center;flex-wrap:wrap">${types(x.id)}</span>${x.mv ? `<span class="mvl">${x.mv.map(i => esc(MOVES[i][0])).join(' · ')}</span>` : ''}</button>`;
function overview() {
  const B = BT.B, res = BT.res, tr = B.tr, fac = res.mode === 'fac', first = !res.shown;
  const who = esc((tr.title ? tr.title + ' ' : '') + tr.n);
  /* Laget: XP-linja fylles opp etter kampen, og nye nivåer og angrep vises her. */
  const team = fac ? '' : `<div class="card stack">${B.me.map(b => {
    const m = b.src, u = res.ups.find(x => x.u === m.u), l = first && u ? u.l0 : m.lv, x = first && u ? u.x0 : m.xp, f = Math.max(0, Math.min(1, (x - xpAt(l)) / (xpAt(l + 1) - xpAt(l))));
    return `<div class="hofr${u && u.l1 > u.l0 && !first ? ' lvup' : ''}" data-row="${m.u}">${spr(b.id, { sh: b.sh, s: '48px' })}<div class="sp"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><b class="sm tn lvt">${u && u.l1 > u.l0 && !first ? `Lv ${u.l0} → ${u.l1}` : 'Lv ' + l}</b></div>
      <div class="xpbar" style="margin-top:6px;height:6px"><i style="width:${Math.round(f * 100)}%"></i></div>
      <div class="sm tn" style="margin-top:4px">${u ? '+' + nb(u.xp) + ' XP' : 'No XP this time'}${b.hp <= 0 ? ' · fainted' : ''}${u && (u.learned || []).length ? ' · learned ' + esc(u.learned.join(', ')) : ''}</div>
      ${(m.nm || []).length ? `<button type="button" class="newmv" data-a="blearn" data-u="${m.u}" style="margin-top:6px;width:100%;text-align:left"><span class="bang">!</span><span class="sm" style="color:var(--ink)">Wants to learn <b>${esc(MOVES[m.nm[0]][0])}</b>${m.nm.length > 1 ? ' +' + (m.nm.length - 1) : ''}</span></button>` : ''}</div></div>`; }).join('')}</div>`;
  const rew = res.win ? `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Rewards</b><span class="pill tn">×${B.sm} study bonus${B.boost.mode === (fac ? 'factory' : 'league') ? ' · today\'s bonus' : ''}</span></div>
      <div class="row" style="justify-content:space-between"><span>Coins</span>${coinEl(res.coins)}</div>
      ${res.items.map(x => `<div class="row" style="justify-content:space-between"><span>Item</span><b>${esc(x)}</b></div>`).join('')}${encLine(res)}
      ${res.got ? `<div class="row" style="justify-content:space-between"><span>Traded for</span><b>${esc(res.got)}</b></div>` : ''}${res.perk ? `<p class="sm" style="color:var(--gold)">${res.perk}</p>` : ''}</div>` : '';
  /* Byttetilbud (ligaen) og bytte av leie-Pokémon (fabrikken). */
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
  const next = fac ? (res.win ? (res.roundDone ? `Round ${res.round} cleared. Round ${res.round + 1} has stronger rentals.` : `Next: battle ${R.w + 1} of 7${R.w === 6 ? ' · the Factory Head' : ''}`) : `The run ends at a streak of ${res.streak}.`)
    : res.win ? (res.legend ? 'Someone is waiting beyond the Champion…' : res.lapDone ? `League cleared. Lap ${L.lap + 1} begins, with stronger trainers and better rewards.` : 'Next: ' + esc(leagueTag())) : `${esc(tr.n)} waits for you. The League opens again after your next day of focus.`;
  const open = fac ? facOpen() && !!R : ladderOpen();
  ov(`<div class="hof"><div class="hof-h"><span>${res.win ? 'VICTORY' : 'DEFEAT'}</span><span class="tn">${esc(battleTag(B))}</span></div>
      <div class="hof-stage">${B.me.map((b, i) => `<span style="--i:${i};--n:${B.me.length}" class="${b.hp <= 0 ? 'ko' : ''}">${spr(b.id, { ani: 1, sh: b.sh })}</span>`).join('')}</div>
      <p class="hof-t">${res.win ? `You beat ${who}.` : fac ? `${who} stopped your run.` : `${who} won this time. You keep your place and the XP.`}</p></div>
    ${team}${rew}${extra}
    <div class="card"><span class="sm" style="color:var(--ink)">${next}</span></div>
    <div class="acts">${res.win && open ? `<button type="button" class="btn gold" data-a="${fac ? 'fenter' : 'bpre'}">${fac && res.roundDone ? 'Pick new rentals' : 'Next battle'}</button><button type="button" class="btn nf" data-a="home">Done</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`, 'tint ovtop', res.win ? 'var(--gold)' : 'var(--red)');
  if (first && !fac) setTimeout(animXp, 500);
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
    <div class="mvg">${m.mv.map(k => moveEl(k, { btn: 1, act: 'lforget' })).join('')}</div>
    <button type="button" class="btn wide" data-a="lskip">Don't learn ${esc(mv[0])}</button>`);
}

/* ---------- Battle Factory ---------- */
function facScreen() {
  const R = S.fac.run; if (!R) return;
  if (R.offer) {
    const sel = BT.fsel;
    return ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Battle Factory · Round ${R.round}</span></div>
      <div><h1 class="big">Pick 4 of 7.</h1><p class="mut" style="margin-top:6px">Rental Pokémon at Lv ${FACLV(R.round)}. The first one you pick leads. Win seven battles in a row to clear the round, and swap in one Pokémon from each trainer you beat.</p></div>
      <div class="rent">${R.offer.map((m, i) => monCard(m, 'fsel', i, sel.includes(i)).replace('<b>', sel.includes(i) ? `<span class="ord">${sel.indexOf(i) + 1}</span><b>` : '<b>')).join('')}</div>
      <div class="acts"><button type="button" class="btn gold" data-a="fpick"${sel.length === 4 ? '' : ' disabled'}>${sel.length === 4 ? 'Take these four' : `Pick ${4 - sel.length} more`}</button></div>`, 'tint', 'var(--t8)');
  }
  const f = facFoe(), tr = facInfo(f);
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Round ${R.round} · battle ${R.w + 1} of 7</span></div>
    <div class="card k-${f.head ? 'boss' : 'reg'}"><div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${f.head ? 'Boss · last battle of the round' : 'Battle Factory'}</div><b class="${f.head ? 'bossn' : ''}" style="font-size:19px">${esc(tr.title ? tr.title + ' ' : '')}${esc(tr.n)}</b><div class="sm tn" style="margin-top:4px">4 Pokémon at Lv ${FACLV(R.round)} · favours ${TYN[f.hint]} types</div></div></div></div>
    <div><div class="lab">Your rentals · tap the one that leads</div><div class="lineup">${R.team.map((m, i) => `<button type="button" data-a="flead" data-k="${i}" class="${i ? '' : 'lead'}">${spr(m.id)}<span class="sp"><b>${esc(D(m.id)[0])}</b><br><span class="sm tn">${m.mv.map(x => esc(MOVES[x][0])).join(', ')}</span></span>${i ? '' : '<span class="pill">Leads</span>'}</button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="fgo">Start battle</button></div>`, 'tint', 'var(--t8)');
}

/* Handlingene (kobles inn i klikk-håndteringen i ui.js). */
const BA = {
  bdone: () => { S.lad.day = dayKey(); save(); sfx.ok(); render(); toast('Battles are open. Fight now or later tonight.'); },
  bpre: () => { if (!ladderOpen()) { closeOv(); return render(); } BT.B = null; BT.busy = false; preBattle(); },
  blead: el => { BT.lead = +el.dataset.u; preBattle(); },
  bteam: () => { closeOv(); U.tab = 'lag'; U.lag = 'lag'; render(); },
  bgo: () => { if (!ladderOpen()) { closeOv(); return render(); } if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.'); sfx.start(); BT.busy = false; startBattle(newBattle(BT.lead)); },
  btap: () => { if (BT.tap) BT.tap(); },
  bfightm: () => { BT.menu = 'moves'; drawMenu(); },
  bswitch: () => { BT.menu = 'team'; drawMenu(); },
  bpause: () => { BT.menu = 'pause'; drawMenu(); },
  bback: () => { BT.menu = 'main'; drawMenu(); },
  bfast: () => { S.bfast = S.bfast ? 0 : 1; save(true); FX.speed = spdF(); drawMenu(); },
  bmusic: () => { S.music = S.music === 0 ? 1 : 0; save(true); music(S.music === 0 ? '' : musicKey(BT.B)); drawMenu(); },
  bmove: el => { if (BT.busy || BT.B.over) return; BT.menu = 'main'; playEv(runTurn(BT.B, { t: 'move', k: +el.dataset.k })); },
  bsw: el => { if (BT.busy) return; const B = BT.B, i = +el.dataset.k; BT.menu = 'main'; playEv(B.need ? sendIn(B, i) : runTurn(B, { t: 'switch', i })); },
  bforfeit: el => { if (BT.busy) return; if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'TAP AGAIN TO GIVE UP'; return; } BT.B.over = 'loss'; endBattle(); },
  blearn: el => { const m = monBy(+el.dataset.u); if (m) learnSheet(m, 'ov'); },
  lforget: el => { const L = U.learn, m = monBy(L.u); if (!m) return closeSheet(); const x = m.nm[0], old = +el.dataset.k; resolveMove(m, x, old); sfx.lvl(); toast(`${D(m.id)[0]} forgot ${MOVES[old][0]} and learned ${MOVES[x][0]}.`); learnSheet(m, L.back); },
  lskip: () => { const L = U.learn, m = monBy(L.u); if (!m) return closeSheet(); const x = m.nm[0]; resolveMove(m, x, null); toast(`${D(m.id)[0]} did not learn ${MOVES[x][0]}.`); learnSheet(m, L.back); },
  tpick: el => { BT.tp = +el.dataset.k; overview(); },
  tback: () => { BT.tp = null; overview(); },
  tgive: el => { const res = BT.res, x = res.trade[BT.tp], mine = monBy(+el.dataset.k); if (!x || !mine) return; const got = doTrade(x, mine); res.got = `${D(got.id)[0]} · Lv ${got.lv} (for ${D(mine.id)[0]})`; res.trade = null; BT.tp = null; sfx.got(); cry(got.id, 200); overview(); },
  tskip: () => { const res = BT.res; pushEnc(res, genEnc({ min: 2, luck: 1.2 })); save(); res.trade = null; sfx.found(); overview(); },
  fenter: () => { if (!facOpen()) { closeOv(); return render(); } if (!S.fac.run) { facStart(); BT.fsel = []; } BT.B = null; BT.busy = false; sfx.open(); facScreen(); },
  fsel: el => { const i = +el.dataset.k, s = BT.fsel, k = s.indexOf(i); if (k >= 0) s.splice(k, 1); else if (s.length < 4) s.push(i); facScreen(); },
  fpick: () => { if (BT.fsel.length !== 4) return; facPick(BT.fsel.slice()); BT.fsel = []; sfx.ok(); facScreen(); },
  flead: el => { const R = S.fac.run, i = +el.dataset.k; if (i > 0) { R.team.unshift(R.team.splice(i, 1)[0]); save(); } facScreen(); },
  fgo: () => { if (!facOpen() || !S.fac.run || !S.fac.run.team) return; sfx.start(); BT.busy = false; startBattle(facBattle()); },
  fswp: el => { BT.fs = +el.dataset.k; overview(); },
  fswb: () => { BT.fs = null; overview(); },
  fswm: el => { const res = BT.res, x = res.swap[BT.fs]; if (!x) return; const old = S.fac.run.team[+el.dataset.k]; facSwap(+el.dataset.k, x); res.swap = null; BT.fs = null; sfx.ok(); toast(`${D(x.id)[0]} joined your rentals in place of ${D(old.id)[0]}.`); overview(); }
};
