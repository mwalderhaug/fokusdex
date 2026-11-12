'use strict';
/* Fokusdex – det som er til for å vise fram og prøve, og de to øyeblikkene rundt et raid:
   1. Raidet kommer: et varsel over hele skjermen første gang forsiden vises etter at en legendarisk har vist seg (raidArrive).
   2. Raidet er vunnet: ballen lukker seg rundt den, uten kast (raidCaught), og så kommer oppsummeringen.
   3. Demoen (bare for admin, se isAdmin i game.js): velg hvem du møter i en klasse (labPick), og åpne pakker gratis for å se hva som faktisk kommer ut (packLab).
   4. «Show the game»: en trailer og en omvisning til å vise fram for andre (showcase). Den spiller de ekte filmene og en ekte kamp som går av seg selv,
      og rører ikke lagringen.
   Lastes etter bui.js og help.js. Handlingene ligger i XA (kobles inn i klikk-håndteringen i ui.js). */
const XT = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Raidet kommer ---------- */
/* Vises én gang per raid (S.raid.nw), når forsiden ellers ville stått stille: mørket puster, bildet slår sprekker, og kortet kommer fram. */
function raidArrive() {
  const R = S.raid; if (!R || !R.nw || S.timer || !$('#ov').hidden || !$('#sheet').hidden) return false;
  R.nw = 0; save(true);
  ov(`<div class="rarr" id="rarr"><canvas class="rarr-cv" id="rarrcv" width="512" height="384"></canvas>
      <div class="rarr-c"><span class="raid-sp qm" aria-hidden="true"><i>?</i></span><div class="sm">Legendary raid</div><h1 class="big" style="font-size:28px">A legendary Pokémon has shown itself.</h1>
        <p class="mut" style="max-width:32ch;margin:0 auto">Who it is stays secret until you face it. You get ${RAIDTRIES} attempts: the first blind, the second knowing. Beat it, and it is yours.</p>
        <div class="acts"><button type="button" class="btn gold" data-a="raid">See the raid</button><button type="button" class="btn nf" data-a="home">Later</button></div></div></div>`, 'battle rarrov', 'var(--gold)');
  const root = $('#rarr'), done = () => { if (root.isConnected) root.classList.add('done'); };
  if (calm() || typeof CINE === 'undefined' || !CINE.fx) { done(); sfx.event(); return true; }
  CINE.fxPrep('omen').then(() => {
    if (!root.isConnected) return; root.classList.add('on'); BSFX.dread();
    return CINE.fx($('#rarrcv'), 'omen', { cc: '#e3c577', txt: 'A legendary Pokémon\nhas shown itself', cue: n => { if (!root.isConnected) return; if (n === 'beat') { BSFX.beat(); buzz([70, 90, 110]); } else if (n === 'boom') { BSFX.mv('boom', 3); buzz([90, 60, 240]); } } });
  }).then(done, done);
  return true;
}

/* ---------- Raidet er vunnet ---------- */
function raidCaught(B, res) {
  const m = monBy(res.cau.u); if (!m) return overview();
  ov(`<div class="row" style="justify-content:space-between"><span></span><span class="pill tn">Legendary raid</span></div>
    <div class="mid r4${m.sh ? ' shy' : ''}"><div class="stage" id="rc-stage">${spr(m.id, { ani: 1, sh: m.sh, mega: m.mega })}<span class="tball">${ballEl('ultra', '54px')}</span><span class="stars" id="rc-stars"></span></div>
      <div><div class="ename">${m.sh === 2 ? 'Dark ' : m.sh ? 'Shiny ' : ''}${esc(D(m.id)[0])}</div><div id="rc-info"><p class="sm" style="margin-top:8px">It has no fight left in it. The ball closes around it.</p></div></div></div>
    <div class="acts" id="rc-act" style="visibility:hidden"><button type="button" class="btn gold" data-a="rcdone">Continue</button></div>`, 'tint', 'var(--gold)');
  const st = $('#rc-stage'), at = (ms, f) => setTimeout(() => { if (BT.res === res && st.isConnected) f(); }, ms);
  at(750, () => { st.className = 'stage in'; sfx.thr(); buzz(30); });
  at(1200, () => { st.className = 'stage held'; void st.offsetWidth; st.className = 'stage held wob'; sfx.wob(0); buzz(20); });
  at(1950, () => {
    st.className = 'stage held'; sfx.got(); buzz([60, 40, 60, 40, 140]);
    $('#rc-stars').innerHTML = Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283, d = 70 + Math.random() * 50; return `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${k * 0.02}s"></i>`; }).join('');
    $('#rc-info').innerHTML = catchCard({ mon: m, crit: 0, bonus: { c: res.cau.c || 0, why: res.cau.c ? [`New species +${res.cau.c}`] : [] }, isNew: res.cau.isNew }, { id: m.id });
    cry(m.id, 500); $('#rc-act').style.visibility = 'visible';
  });
}

/* ---------- Demoen: hvem vil du møte? ---------- */
function labPick(k) {
  const c = TCL[k], L = POOL[k]; if (!c || !L) return;
  openSheet(`<h2 class="h" style="margin-top:0">${c.n}</h2><p class="sm">Choose who you meet. ${BT.labRent ? `You fight with rentals at Lv ${FACLV}.` : 'You fight with your own team.'}${k === 'champ' || k === 'supreme' ? ' Their team changes a little from time to time.' : ''}</p>
    <button type="button" class="btn wide gold" data-a="labgo" data-k="${k}" data-i="">Surprise me</button>
    <div class="labtr">${L.map((d, i) => `<button type="button" data-a="labgo" data-k="${k}" data-i="${i}">${tsprite(d[1])}<b>${esc(d[0])}</b><span class="sm">${esc(k === 'gym' ? `${d[5]} · ${TYN[d[3]]}` : (d[6] || {}).cn || d[2])}</span></button>`).join('')}</div>`);
}

/* ---------- Demoen: pakker ---------- */
const PKN = 1000;
function packStats(k, n) {
  const c = { k, n, cards: 0, t: [0, 0, 0, 0, 0], sh: 0, lg: 0, ps: 0, pLg: 0, pSh: 0, pEp: 0, best: [], val: 0 };
  for (let i = 0; i < n; i++) {
    let l = 0, s = 0, ep = 0;
    for (const e of packDraw(k, true)) {
      c.cards++; c.t[e.t]++; c.val += SELL[e.t] * (e.sh ? 5 : 1) * PKSELL;
      if (e.sh) { c.sh++; s = 1; } if (e.lg) { c.lg++; l = 1; } if (e.ps) c.ps++; if (e.t >= 3) ep = 1;
      if ((e.lg || e.sh) && c.best.length < 10) c.best.push({ id: e.id, sh: e.sh });
    }
    c.pLg += l; c.pSh += s; c.pEp += ep;
  }
  return c;
}
function packLab(k) {
  k = PACKS[k] ? k : PACKS[U.plk] ? U.plk : 'poke'; U.plk = k;
  const P = PACKS[k], c = U.pls && U.pls.k === k ? U.pls : null, pct = (a, b) => b ? (a / b * 100).toFixed(a / b < 0.1 ? 2 : 1).replace(/\.?0+$/, '') + ' %' : '–', oneIn = (a, b) => a ? `1 in ${nb(Math.round(b / a))}` : 'none this time';
  const row = (a, b, s) => `<div class="row" style="justify-content:space-between;gap:12px;align-items:flex-start"><span class="sm" style="color:var(--ink);flex:none">${a}</span><span class="sm tn" style="text-align:right">${b}${s ? `<br><span class="mut">${s}</span>` : ''}</span></div>`;
  const stats = c ? `<div class="card stack"><div class="row" style="justify-content:space-between"><b>${nb(c.n)} packs opened</b><span class="pill tn">${nb(c.cards)} cards</span></div>
      <div class="pkbar" role="img" aria-label="Share of each rarity">${c.t.map((n, i) => n ? `<i class="r${i}" style="flex:${n}"></i>` : '').join('')}</div>
      ${c.t.map((n, i) => row(`<span class="tier r${i}">${TIERS[i]}</span>`, pct(n, c.cards), `${nb(n)} cards`)).join('')}
      ${row('A pack with an epic or better', pct(c.pEp, c.n))}
      ${P.slots.some(s => s.ps) ? row('Pseudo-legendary', `${nb(c.ps)} · ${oneIn(c.ps, c.n)} packs`) : ''}
      ${row('<b style="color:var(--gold)">Legendary</b>', `${nb(c.lg)} · ${oneIn(c.lg, c.n)} packs`, `the Shop says ${(Math.max(...P.slots.map(s => s.leg || 0)) * 100).toFixed(1).replace(/\.0$/, '')} % a pack`)}
      ${row('Shiny', `${nb(c.sh)} · ${oneIn(c.sh, c.cards)} cards`, `your shiny odds right now: 1 in ${nb(Math.round(1 / (shinyOdds() * P.shm)))}`)}
      ${row('Sold as duplicates', `${nb(Math.round(c.val / c.n))} coins a pack`, `the pack costs ${nb(P.p)}`)}
      ${c.best.length ? `<div class="lab">The best of them</div><div class="pkbest">${c.best.map(x => `<span class="${x.sh ? 'shy' : ''}">${spr(x.id, { sh: x.sh, s: '52px', mega: defForm(x.id) })}</span>`).join('')}</div>` : ''}</div>`
    : `<p class="sm" style="text-align:center">Open ${nb(PKN)} at once to see the real numbers: how often each rarity, a legendary and a shiny come out.</p>`;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="lab">Back</button><span class="pill tn">Demo · packs</span></div>
    <div><h1 class="big">Pack odds.</h1><p class="mut" style="margin-top:6px">Open packs for free and see what really comes out. Nothing is kept, and the odds are the ones you have right now.</p></div>
    <div class="seg">${Object.keys(PACKS).map(x => `<button type="button" data-a="packlab" data-k="${x}" aria-pressed="${x === k}">${PACKS[x].n.replace(' Pack', '')}</button>`).join('')}</div>
    <div class="card stack" style="--pc:${P.c}"><div class="row" style="gap:12px;align-items:center"><span class="pk-ic"><i></i></span><div class="sp"><b>${P.n}</b><div class="sm tn">${nb(P.p)} coins in the Shop${P.lv ? ` · from trainer level ${P.lv}` : ''}</div></div></div><p class="sm">${esc(P.d)}</p>
      <div class="row"><button type="button" class="btn sp gold" data-a="pkdemo" data-k="${k}">Open one</button><button type="button" class="btn sp" data-a="pkrun" data-k="${k}">Open ${nb(PKN)}</button></div></div>
    ${stats}`, 'tint', P.c);
}

/* ---------- Show the game ---------- */
let SHW = null;
const showNums = () => ({ mons: DEX.length, moves: MOVES.length, megas: MEGA.filter(g => g[1] !== 'Origin').length, bosses: ORDER.filter(k => k !== 'trainer' && k !== 'evilteam').reduce((n, k) => n + POOL[k].length, 0), raids: Object.keys(LEG).length + 1, medals: achTotal(), events: Object.keys(EVENTS).length });
/* De legendariske som har sin egen store film (ikke de rolige), til traileren og forsiden av omvisningen. */
const showLegs = () => [384, 150, 493, 487, 382, 383, 249, 250, 483, 484, 643, 644, 646].filter(id => LEG[id] && typeof CINE !== 'undefined' && CINE.has(id));
function showcase() {
  const N = showNums(), legs = showLegs().slice(0, 4), all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0), sh = S.mons.filter(m => m.sh).length, lg = S.mons.filter(m => isLeg(m.id)).length, as = achSum();
  const best = S.mons.slice().sort((a, b) => (b.sh ? 3 : 0) + tierOf(b.id) + b.lv / 200 - ((a.sh ? 3 : 0) + tierOf(a.id) + a.lv / 200)).slice(0, 8);
  const num = (n, s) => `<div><b class="tn">${nb(n)}</b><span class="sm">${s}</span></div>`;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Showcase</span></div>
    <div class="shw-hero"><div class="shw-k">Fokusdex</div><p class="mut">Study time becomes a Pokémon adventure. Every minute you focus feeds the game: you catch, train and battle with what you earned.</p>
      <button type="button" class="go gold" data-a="showplay">Play the trailer</button><p class="sm tn">About a minute · three of the films, with sound</p></div>
    <div class="shw-n">${num(N.mons, 'Pokémon')}${num(N.moves, 'moves')}${num(N.megas, 'Mega forms')}${num(N.bosses, 'named bosses')}${num(N.raids, 'legendary raids')}${num(N.medals, 'medals')}</div>
    <div class="card stack"><div class="lab">The finals</div><b>Two finals have a film of their own</b><p class="sm">The League ends with a Champion. Now and then someone greater is waiting instead, and you only find out in the intro.</p>
      <div class="shw-f"><button type="button" data-a="showfilm" data-k="boss" data-i="Cynthia" style="--cc:#e9d28a">${tsprite('cynthia')}<b>Cynthia</b><span class="sm">Sinnoh Champion</span></button><button type="button" data-a="showfilm" data-k="boss" data-i="Ghetsis" style="--cc:#c8102e">${tsprite('ghetsis')}<b>Ghetsis</b><span class="sm">Champions Edition</span></button></div>
      <p class="sm"><b>Ghetsis</b> is the strongest opponent in the game: one loss ends the lap, his team is never quite the same, and the battle has a place of its own.</p></div>
    <div class="card stack"><div class="lab">Legendary raids</div><b>One against your whole team</b><p class="sm">Rare, and secret until you stand in front of it. The great ones arrive with a film, an entrance and a place that fights with them. Beat one, and it is yours.</p>
      <div class="legl">${legs.map(id => `<button type="button" data-a="showfilm" data-k="leg" data-i="${id}" style="--cc:${LEG[id].cc}">${spr(id, { lazy: 1, mega: defForm(id) })}<b>${esc(D(id)[0])}</b></button>`).join('')}</div>
      ${isAdmin() ? `<button type="button" class="btn wide nf" data-a="lab">All ${N.raids} in the demo · film, entrance and fight</button>` : ''}</div>
    <div class="card stack"><div class="lab">Battles</div><b>${nb(N.moves)} moves, each with its own animation</b><p class="sm">Abilities, weather, status, held Mega Stones and type matchups work as in the games. Nine classes of opponents, from a Youngster to the Champions, with teams that fit who they are.</p>
      <div class="row"><button type="button" class="btn sp gold" data-a="exhib">Watch a battle</button>${isAdmin() ? '<button type="button" class="btn sp" data-a="lab">Play one yourself</button>' : ''}</div>
      <p class="sm tn">Watch: rental Pokémon against a Champion, played for you. Take over whenever you like.</p></div>
    <div class="card stack"><div class="lab">Three ways to battle</div>${helpModes()}</div>
    <div class="card stack"><div class="lab">Special events</div><b>Some battle days are different</b><div class="shw-ev">${Object.keys(EVENTS).map(k => { const E = EVENTS[k]; return `<div><span class="evc-ic hev" style="--ec:${k === 'type' ? 'var(--t9)' : E.c}">${E.ic}</span><span class="sp"><b>${k === 'type' ? 'Type Festival' : E.n}</b><span class="sm">${HEV[k]}</span></span></div>`; }).join('')}</div></div>
    <div class="card stack"><div class="lab">Your collection</div><b>${all} of ${N.mons} species caught</b>
      <div class="gain">${num(S.mons.length, 'Pokémon')}${num(sh, 'shiny')}${num(lg, 'legendary')}${num(as.p, 'medals')}</div>
      ${best.length ? `<div class="pkbest">${best.map(m => `<span class="${m.sh ? 'shy' : ''}">${spr(m.id, { sh: m.sh, mega: m.mega, s: '52px' })}</span>`).join('')}</div>` : ''}
      <p class="sm">Every Pokémon has its own IVs, nature and moves, and can be trained. Five regions, shinies, Mega forms, and ${nb(N.medals)} medals across the achievements.</p>
      ${isAdmin() ? '<button type="button" class="btn wide nf" data-a="packlab">Open packs for free · see the odds</button>' : ''}</div>
    <p class="sm" style="text-align:center">Nothing in the showcase touches your save.</p>`, 'tint shwov', 'var(--gold)');
}
/* En film utenom kampene: en liksom-kamp gir filmen det den trenger (treneren, laget, låta). Gir false hvis den ble avbrutt. */
async function showFilm(kind, arg) {
  let B;
  if (kind === 'boss') { const i = POOL.supreme.findIndex(x => x[0] === arg && (x[6] || {}).sp); if (i < 0) return false; B = { tr: trainerOf('supreme', i), foe: bossTeam(POOL.supreme[i], 6, 60, TCL.supreme, true), me: [], mode: 'lab', lap: 0, show: 1 }; }
  else { if (!LEG[arg]) return false; B = { tr: legTr(arg, 0), foe: [{ id: arg, lv: 0 }], me: [], mode: 'lab', lap: 0, raid: 1, show: 1 }; }
  PACK.unlock(); BT.B = B; BT.busy = false;
  try { if (kind === 'boss') await bossFilm(B); else await legendIntro(B); } catch (_) {}
  const mine = BT.B === B; if (mine) BT.B = null;
  stopMusic(0.6); await XT(500);
  return mine;
}
/* Traileren: tittel, Cynthia, en legendarisk, Ghetsis. Skip hopper til neste del, Stop avslutter. */
async function showTrailer() {
  const my = SHW = { on: 1 }, alive = () => SHW === my && my.on, legs = showLegs(), leg = legs.length ? legs[rnd(Math.min(4, legs.length))] : 0;
  const card = async (a, b, ms) => { ov(`<div class="shw-t"><div><div class="shw-k">${a}</div><div class="shw-b">${b}</div></div><button type="button" class="lgi-skip" data-a="showstop">Stop</button></div>`, 'battle shwtov'); await XT(ms); };
  await card('Fokusdex', 'Study time becomes a Pokémon adventure', 2400); if (!alive()) return;
  await showFilm('boss', 'Cynthia'); if (!alive()) return;
  if (leg) { await card('Legendary raids', 'Rare, secret, and yours if you win', 1900); if (!alive()) return; await showFilm('leg', leg); if (!alive()) return; }
  await card('The strongest', 'One loss ends the lap. His team is never the same twice', 2100); if (!alive()) return;
  await showFilm('boss', 'Ghetsis'); if (!alive()) return;
  SHW = null; showcase();
}
/* En kamp som går av seg selv: leie-Pokémon mot en Champion. Hvert valg tas av den samme vurderingen motstanderne bruker (høyest ventet skade).
   «Take over» gir kontrollen tilbake, og kampen fortsetter som en vanlig demokamp. */
function exhibition() {
  PACK.unlock(); const B = labBattle('champ', true, rnd(POOL.champ.length)); B.watch = 1; B.exh = 1; BT.busy = false; startBattle(B);
  const step = () => {
    if (BT.B !== B || B.over) return;
    const btn = $('#exb');
    if (!B.watch) { if (btn) btn.remove(); return; }
    const top = document.querySelector('.btop'); if (top && !btn) top.insertAdjacentHTML('beforeend', '<button type="button" class="pill exb" id="exb" data-a="exstop">Auto · take over</button>');
    if ($('#arena') && !BT.busy) {
      if (B.need) { const k = B.me.findIndex((b, j) => b.hp > 0 && (j !== B.a || B.need === 1)); if (k >= 0) playEv(sendIn(B, k)); }
      else if ($('#bmenu button')) {
        const me = B.me[B.a], foe = B.foe[B.b]; let best = -1, bv = -1;
        me.mv.forEach((x, k) => { if (!moveOk(B, k)) return; const v = (estDmg(B, me, foe, MOVES[x.i]) + 1) * (0.8 + Math.random() * 0.4); if (v > bv) { bv = v; best = k; } });
        BT.menu = 'main'; playEv(runTurn(B, { t: 'move', k: best, mega: canMega(B, 'me') ? 1 : 0 }));
      }
    } else if (BT.tap) BT.tap();
    setTimeout(step, 700);
  };
  setTimeout(step, 1600);
}
const XA = {
  rcdone: () => { if (BT.res) overview(); else { closeOv(); render(); } },
  labpick: el => { if (!isAdmin()) return; sfx.open(); labPick(el.dataset.k); },
  packlab: el => { if (!isAdmin()) return; BT.B = null; packLab(el && el.dataset.k); },
  pkdemo: el => { const k = el.dataset.k; if (!isAdmin() || !PACKS[k]) return; U.plk = k; sfx.coin(); packShow(k, packDraw(k, true), true); },
  pkrun: el => { const k = el.dataset.k; if (!isAdmin() || !PACKS[k]) return; U.pls = packStats(k, PKN); sfx.ok(); packLab(k); },
  show: () => { closeSheet(); SHW = null; BT.B = null; stopMusic(); sfx.open(); showcase(); },
  showplay: () => { sfx.start(); showTrailer(); },
  showstop: () => { if (SHW) SHW.on = 0; SHW = null; BT.B = null; stopMusic(0.4); showcase(); },
  showfilm: async el => { const k = el.dataset.k, a = k === 'leg' ? +el.dataset.i : el.dataset.i; SHW = null; sfx.start(); const ok = await showFilm(k, a); if (ok && $('#lgi')) showcase(); },
  exhib: () => { SHW = null; sfx.start(); exhibition(); },
  exstop: () => { const B = BT.B; if (B) B.watch = 0; const b = $('#exb'); if (b) b.remove(); toast('You are in control now.'); }
};
