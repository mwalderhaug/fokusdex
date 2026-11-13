'use strict';
/* Fokusdex – det som er til for å vise fram og prøve, og de to øyeblikkene rundt et raid:
   1. Raidet kommer: et varsel over hele skjermen første gang forsiden vises etter at en legendarisk har vist seg (raidArrive).
   2. Raidet er vunnet: ballen lukker seg rundt den, uten kast (raidCaught), og så kommer oppsummeringen.
   3. Sandkassa (bare for admin, se isAdmin i game.js): enkeltkamper mot hvem du vil (labPick), raid, filmer, pakker (packLab), og en kopi av lagringen
      der hele spillet kan prøves uten at noe lagres (sbxEnter).
   4. «Show the game» (åpen for alle): en trailer (med et klipp fra en kamp og én av filmene), en oversikt som viser gangen i spillet uten å røpe hvem
      som venter, og en oppvisningskamp.
   Lastes etter bui.js og help.js. Handlingene ligger i XA (kobles inn i klikk-håndteringen i ui.js). */
const XT = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Raidet kommer ---------- */
/* Vises én gang per raid (S.raid.nw), når forsiden ellers ville stått stille: mørket puster, bildet slår sprekker, og kortet kommer fram. */
function raidArrive() {
  const R = S.raid; if (!R || R.hid || !R.nw || S.timer || !$('#ov').hidden || !$('#sheet').hidden) return false;
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
    st.className = 'stage held'; sfx.caught(); buzz([60, 40, 60, 40, 140]);
    $('#rc-stars').innerHTML = Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283, d = 70 + Math.random() * 50; return `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${k * 0.02}s"></i>`; }).join('');
    $('#rc-info').innerHTML = catchCard({ mon: m, crit: 0, bonus: { c: res.cau.c || 0, why: res.cau.c ? [`New species +${res.cau.c}`] : [] }, isNew: res.cau.isNew }, { id: m.id });
    cry(m.id, 500); $('#rc-act').style.visibility = 'visible';
  });
}

/* ---------- Sandkassa: hvem vil du møte? ---------- */
function labPick(k) {
  const c = TCL[k], L = POOL[k]; if (!c || !L) return;
  openSheet(`<h2 class="h" style="margin-top:0">${c.n}</h2><p class="sm">Choose who you meet. ${BT.labRent ? `You fight with rentals at Lv ${FACLV}.` : 'You fight with your own team.'}${k === 'champ' || k === 'supreme' ? ' Their team changes a little from time to time.' : ''}</p>
    <button type="button" class="btn wide gold" data-a="labgo" data-k="${k}" data-i="">Surprise me</button>
    <div class="labtr">${L.map((d, i) => `<button type="button" data-a="labgo" data-k="${k}" data-i="${i}">${tsprite(d[1])}<b>${esc(d[0])}</b><span class="sm">${esc(k === 'gym' ? `${d[5]} · ${TYN[d[3]]}` : (d[6] || {}).cn || d[2])}</span></button>`).join('')}</div>`);
}

/* ---------- Sandkassa: pakker ---------- */
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
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="lab">Back</button><span class="pill tn">Sandbox · packs</span></div>
    <div><h1 class="big">Pack odds.</h1><p class="mut" style="margin-top:6px">Open packs for free and see what really comes out. Nothing is kept, and the odds are the ones you have right now.</p></div>
    <div class="seg">${Object.keys(PACKS).map(x => `<button type="button" data-a="packlab" data-k="${x}" aria-pressed="${x === k}">${PACKS[x].n.replace(' Pack', '')}</button>`).join('')}</div>
    <div class="card stack" style="--pc:${P.c}"><div class="row" style="gap:12px;align-items:center"><span class="pk-ic"><i></i></span><div class="sp"><b>${P.n}</b><div class="sm tn">${nb(P.p)} coins in the Shop${P.lv ? ` · from trainer level ${P.lv}` : ''}</div></div></div><p class="sm">${esc(P.d)}</p>
      <div class="row"><button type="button" class="btn sp gold" data-a="pkdemo" data-k="${k}">Open one</button><button type="button" class="btn sp" data-a="pkrun" data-k="${k}">Open ${nb(PKN)}</button></div></div>
    ${stats}`, 'tint', P.c);
}

/* ---------- Show the game ----------
   Åpen for alle, og laget for ikke å røpe: traileren viser gangen i spillet (studere, fange, trene, kjempe), og oversikten viser tallene. Bossene og de
   legendariske vises bare som skygger, med ett unntak: traileren slutter med filmen til Dialga. De andre filmene, pakkene og alt annet som viser hva som
   faktisk venter, ligger i sandkassa (bare admin). */
let SHW = null;
const showNums = () => ({ mons: DEX.length, moves: MOVES.length, megas: MEGA.filter(g => g[1] !== 'Origin').length, bosses: ORDER.filter(k => k !== 'trainer' && k !== 'evilteam').reduce((n, k) => n + POOL[k].length, 0), raids: Object.keys(LEG).length + 1, medals: achTotal(), events: Object.keys(EVENTS).length });
/* De legendariske som har sin egen store film (ikke de rolige): til sandkassa. */
const showLegs = () => [384, 150, 493, 487, 382, 383, 249, 250, 483, 484, 643, 644, 646].filter(id => LEG[id] && typeof CINE !== 'undefined' && CINE.has(id));
/* Skygger: bossene (bildet deres helt svart) og noen av de legendariske. Hvem de er, finner man ut selv. */
const showSilK = n => { const l = []; for (const k of ['gym', 'e4', 'rival', 'eviladmin', 'evilboss', 'champ', 'supreme']) POOL[k].forEach((d, i) => { if (i % 3 === 0) l.push(d[1]); }); return l.slice(0, n); };
const showSil = n => showSilK(n).map(img => tsprite(img, 'sil')).join('');
/* Bildene fra pakken hentes, og raden tegnes på nytt når de er klare. */
const showSilFill = (sel, n) => { if (!PACK.ok) return; PACK.portraits(showSilK(n).map(k => k.split('|')[0])).then(got => { const el = got ? document.querySelector(sel) : null; if (el) el.innerHTML = showSil(n); }).catch(() => {}); };
function showcase() {
  const N = showNums(), all = [1, 2, 3, 4, 5].reduce((s, x) => s + dexCount(x), 0), sh = S.mons.filter(m => m.sh).length, lg = S.mons.filter(m => isLeg(m.id)).length, as = achSum();
  const best = S.mons.slice().sort((a, b) => (b.sh ? 3 : 0) + tierOf(b.id) + b.lv / 200 - ((a.sh ? 3 : 0) + tierOf(a.id) + a.lv / 200)).slice(0, 8);
  const num = (n, s) => `<div><b class="tn">${nb(n)}</b><span class="sm">${s}</span></div>`, step = (n, a, b) => `<div><span class="cno">${n}</span><span class="sp"><b>${a}</b><span class="sm">${b}</span></span></div>`;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Showcase</span></div>
    <div class="shw-hero"><div class="shw-k">Fokusdex</div><p class="mut">Study time becomes a Pokémon adventure. Every minute you focus feeds the game: you catch, train and battle with what you earned.</p>
      <button type="button" class="go gold" data-a="showplay">Play the trailer</button><p class="sm tn">A little over a minute, with sound · clips from the game, and a glimpse of what is waiting</p></div>
    <div class="shw-n">${num(N.mons, 'Pokémon')}${num(N.moves, 'moves')}${num(N.megas, 'Mega forms')}${num(N.bosses, 'named bosses')}${num(N.raids, 'legendary raids')}${num(N.medals, 'medals')}</div>
    <div class="card stack"><div class="lab">How it goes</div><div class="shw-st">${step(1, 'Study', '10 XP and 3 coins a minute. Your subjects count in full.')}${step(2, 'Catch', 'Every 20 minutes something waits in the grass. Some are rare. A few are shiny.')}${step(3, 'Train', 'Levels, evolutions, IVs, EVs and Mega forms: your team is built from your own hours.')}${step(4, 'Battle', 'When the day\'s studying is done, the battles open. The more you studied, the more they pay.')}</div></div>
    <div class="card stack"><div class="lab">Battles</div><b>${nb(N.moves)} moves, each with its own animation</b><p class="sm">Abilities, weather, status, Mega Evolution and type matchups work as in the games.</p>
      <div class="row"><button type="button" class="btn sp gold" data-a="exhib">Watch a battle</button><button type="button" class="btn sp" data-a="exhib" data-k="play">Play one yourself</button></div>
      <p class="sm tn">A strong rental team, with a Mega and a shiny in it, against a Champion. Nothing is at stake, and Exit is always at the top.</p></div>
    <div class="card stack"><div class="lab">Three ways to battle</div>${helpModes()}</div>
    <div class="card stack"><div class="lab">Who is waiting</div><b>${nb(N.bosses)} named bosses in nine classes</b><div class="shw-sil" id="shw-sil">${showSil(8)}</div>
      <p class="sm">From a Youngster to the Champions. The League ends with a Champion, and now and then someone greater is waiting instead. Who? You find out in the intro.</p></div>
    <div class="card stack"><div class="lab">Legendary raids</div><b>One against your whole team</b><div class="shw-sil leg">${[384, 150, 249, 483].map(id => spr(id, { sil: 1, lazy: 1 })).join('')}<span class="raid-sp qm" aria-hidden="true"><i>?</i></span></div>
      <p class="sm">Rare, never on a fixed day, and secret until you stand in front of it. Beat one, and it is yours.</p></div>
    <div class="card stack"><div class="lab">Special events</div><b>Some battle days are different</b><div class="shw-ev">${Object.keys(EVENTS).map(k => { const E = EVENTS[k]; return `<div><span class="evc-ic hev" style="--ec:${k === 'type' ? 'var(--t9)' : E.c}">${E.ic}</span><span class="sp"><b>${k === 'type' ? 'Type Festival' : E.n}</b><span class="sm">${HEV[k]}</span></span></div>`; }).join('')}</div></div>
    <div class="card stack"><div class="lab">Your collection</div><b>${all} of ${N.mons} species caught</b>
      <div class="gain">${num(S.mons.length, 'Pokémon')}${num(sh, 'shiny')}${num(lg, 'legendary')}${num(as.p, 'medals')}</div>
      ${best.length ? `<div class="pkbest">${best.map(m => `<span class="${m.sh ? 'shy' : ''}">${spr(m.id, { sh: m.sh, mega: m.mega, s: '52px' })}</span>`).join('')}</div>` : ''}
      <p class="sm">Every Pokémon has its own IVs, nature and moves, and can be trained. Five regions, shinies, Mega forms, and ${nb(N.medals)} medals across the achievements.</p></div>
    ${isAdmin() ? '<button type="button" class="btn wide nf" data-a="lab">Sandbox · films, raids, packs and modes</button>' : ''}
    <p class="sm" style="text-align:center">Nothing in the showcase touches your save.</p>`, 'tint shwov', 'var(--gold)');
  showSilFill('#shw-sil', 8);
}
/* En film utenom kampene (sandkassa): en liksom-kamp gir filmen det den trenger (treneren, laget, låta). Gir false hvis den ble avbrutt. */
async function showFilm(kind, arg) {
  let B;
  if (kind === 'boss') { const i = POOL.supreme.findIndex(x => x[0] === arg && (x[6] || {}).sp); if (i < 0) return false; B = { tr: trainerOf('supreme', i), foe: bossTeam(POOL.supreme[i], 6, 60, TCL.supreme, true), me: [], mode: 'lab', lap: 0, show: 1 }; }
  else { const dk = arg === 'dk', id = dk ? 150 : arg; if (!LEG[id]) return false; B = { tr: legTr(id, dk), foe: [{ id, lv: 0 }], me: [], mode: 'lab', lap: 0, raid: 1, show: 1 }; }
  PACK.unlock(); BT.B = B; BT.busy = false;
  try { if (kind === 'boss') await bossFilm(B); else await legendIntro(B); } catch (_) {}
  const mine = BT.B === B; if (mine) BT.B = null;
  stopMusic(0.6); await XT(500);
  return mine;
}

/* ---------- Traileren ----------
   Korte bilder på én låt (pakka: finalelåta fra World Tournament i Frontier-mappa; ellers den innebygde Frontier-låta). Tidene er sekunder fra låta
   starter og følger delene i den: rolig åpning til 17, lettere parti til 29, så setter den inn for fullt, med det store slaget på 41,6 og full styrke fra 49.
   Den er en trailer og ikke en innføring: hvert bilde har én kort linje, og ingenting forklares.
   Fra TRLCLIP til det store slaget vises et klipp fra en ekte kamp (tlrBattle, tlrClip): kampskjermen selv, med et angrep som treffer, Mega Evolution og
   en motstander som besvimer. På TRLOUT tones låta ut, filmen til Dialga spilles slik den er i raidet (legendIntro, med låta si), og rett etter filmen
   står tittelen der. Bossene vises bare som skygger, og av de legendariske er Dialga den eneste som vises. */
const TRLCLIP = 32.2, TRLOUT = 56.6, TRLLEG = 483;
const tlrStars = n => Array.from({ length: n }, (_, k) => { const a = k / n * 6.283 + 0.3, d = 54 + (k * 37 % 46); return `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d * 0.8)}px;--d:${(k * 0.045).toFixed(2)}s"></i>`; }).join('');
const tlrGrass = () => { let p = '0% 100%'; for (let i = 0; i <= 26; i++) p += `,${(i / 26 * 100).toFixed(1)}% ${i % 2 ? 0 : 46 + (i * 7 % 30)}%`; return `<i class="tlr-gr" style="clip-path:polygon(${p},100% 100%)"></i>`; };
const TRL = [
  { t: 0.4, k: 'title', h: () => `<div class="tlr-k">Fokusdex</div><p class="tlr-p tlr-lead">Your study time is the game.</p>` },
  { t: 4.6, k: 'focus', h: () => `<div class="tlr-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="a"/><circle cx="60" cy="60" r="52" class="b"/></svg><b class="tn" id="tlr-cl">25:00</b></div>
      <div class="tlr-chips"><span style="--d:1.5s">+250 XP</span><span style="--d:2.3s">+75 coins</span><span style="--d:3.1s">1 encounter</span></div>
      <h2 class="tlr-h">It starts with focus.</h2>`,
    run: (root, at) => { for (let i = 1; i <= 25; i++) at(300 + i * 168, () => { const e = root.querySelector('#tlr-cl'); if (e) e.textContent = `${String(25 - i).padStart(2, '0')}:00`; }); } },
  { t: 10.4, k: 'grass', h: () => `<div class="tlr-v"><span class="tlr-enc">${spr(133, { ani: 1, s: '112px' })}</span><span class="tlr-ball">${ballEl('poke', '54px')}</span>${tlrGrass()}</div>
      <h2 class="tlr-h">Something waits in the grass.</h2>` },
  { t: 17.0, k: 'grow', h: () => `<div class="tlr-v v-evo">${[4, 5, 6].map((id, i) => `<span class="tlr-e" style="--d:${(0.4 + i * 1.5).toFixed(1)}s">${spr(id, { ani: 1, s: [64, 84, 116][i] + 'px' })}</span>${i < 2 ? `<i class="tlr-ar" style="--d:${(1.3 + i * 1.5).toFixed(1)}s">›</i>` : ''}`).join('')}</div>
      <div class="tlr-lv"><span>Lv</span><b class="tn" id="tlr-lv">5</b></div><h2 class="tlr-h">It grows with what you put in.</h2>`,
    run: (root, at) => { for (let i = 1; i <= 31; i++) at(350 + i * 120, () => { const e = root.querySelector('#tlr-lv'); if (e) e.textContent = 5 + i; }); } },
  { t: 23.1, k: 'shiny', h: () => `<div class="tlr-v v-shy"><span class="tlr-a">${spr(130, { ani: 1, s: '124px' })}</span><span class="tlr-b">${spr(130, { ani: 1, sh: 1, s: '124px' })}</span><span class="tlr-spk">${tlrStars(12)}</span></div>
      <h2 class="tlr-h">Some are far rarer than others.</h2>` },
  { t: 29.0, k: 'battle', h: () => `<div class="tlr-vs"><div class="l">${[445, 6, 9].map((id, i) => `<span style="--d:${(0.15 + i * 0.17).toFixed(2)}s">${spr(id, { s: '76px' })}</span>`).join('')}</div><b>VS</b><div class="r">${[POOL.gym[2], POOL.e4[1], POOL.champ[0]].map((d, i) => `<span style="--d:${(0.7 + i * 0.17).toFixed(2)}s">${tsprite(d[1], 'sil')}<i>?</i></span>`).join('')}</div></div>
      <div class="tlr-chips tlr-gold"><span style="--d:1.2s">Trainer League</span><span style="--d:1.55s">Battle Frontier</span><span style="--d:1.9s">World Tournament</span></div>
      <h2 class="tlr-h">Then you battle.</h2>` },
  { t: TRLCLIP, k: 'clip' },
  { t: 41.6, k: 'legend', h: () => `<div class="tlr-leg">${[384, 150, 249].map((id, i) => `<span class="s${i}">${spr(id, { sil: 1, s: '150px' })}</span>`).join('')}<span class="raid-sp qm" aria-hidden="true"><i>?</i></span></div>
      <h2 class="tlr-h">And sometimes…</h2><p class="tlr-p late" style="--d:2.2s">…something legendary shows itself.</p>` },
  { t: 49.0, k: 'nums', h: () => { const N = showNums(); return `<div class="shw-n tlr-n">${[[N.mons, 'Pokémon'], [N.moves, 'moves'], [N.megas, 'Mega forms'], [N.bosses, 'named bosses'], [N.raids, 'legendary raids'], [N.medals, 'medals']].map(([n, s], i) => `<div style="--d:${(i * 0.12).toFixed(2)}s"><b class="tn" data-n="${n}">0</b><span class="sm">${s}</span></div>`).join('')}</div>
      <div class="shw-sil tlr-sil" id="tlr-sil">${showSil(7)}</div><h2 class="tlr-h">All of it is in here.</h2>`; },
    run: (root, at) => { showSilFill('#tlr-sil', 7); for (let i = 1; i <= 24; i++) at(200 + i * 55, () => root.querySelectorAll('.tlr-n b').forEach(b => { b.textContent = nb(Math.round(+b.dataset.n * (1 - Math.pow(1 - i / 24, 3)))); })); } }
];
/* Kampen klippet er hentet fra: Blastoise mot en Ace Trainer med Luxray. Den er bestemt på forhånd, så klippet er likt hver gang: Luxray treffer med
   Thunderbolt, Blastoise blir Mega Blastoise og svarer med Hydro Pump, og Luxray besvimer. Det er den vanlige kampmotoren som regner (useMove,
   megaEvolve) og den vanlige kampskjermen som viser. Modus «lab»: ingenting lagres, og ingenting gis. clip = ingen meny og intet oppgjør etterpå,
   pace og quick = klippets egen fart uansett hva spilleren har valgt (tlrClip), tag = merkelappen øverst. */
function tlrBattle() {
  const mv = l => l.map(n => MOVES.findIndex(m => m[0] === n)).filter(i => i >= 0), iv = [31, 31, 31, 31, 31, 31], no = [0, 0, 0, 0, 0, 0];
  const me = [{ id: 9, lv: 50, sh: 0, iv, ev: [0, 0, 0, 252, 0, 252], nat: 0, mv: mv(['Hydro Pump']), ms: megaOpts(9)[0] || 0 }];
  const foe = [{ id: 405, lv: 50, sh: 0, iv, ev: no, nat: 0, mv: mv(['Thunderbolt']) }, { id: 149, lv: 50, sh: 0, iv, ev: no, nat: 0, mv: mv(['Dragon Claw']) }];
  if (!me[0].mv.length || foe.some(f => !f.mv.length)) return null;
  const ti = Math.max(0, POOL.trainer.findIndex(d => d[0] === 'Ace Trainer')), tr = trainerOf('trainer', ti);
  const B = mkBattle(me, foe, tr, { mode: 'lab', st: TCL.trainer, k: 'trainer', rd: 2, n: 0, lap: 0, ti, rent: 1, bag: 0, xm: 1, sm: 1, boost: { mode: '', m: 1, xp: 1 }, clip: 1, pace: 1.5, quick: 1, tag: 'Trainer League' });
  labMega(B); B.foe[0].hp = Math.round(B.foe[0].max * 0.7);
  return B;
}
/* Hendelsene i klippet, én bit om gangen: 1 = motstanderens angrep, 2 = Mega Evolution, 3 = svaret. Terningen holdes fast på midten mens motoren
   regner, så ingenting bommer og ingenting blir kritisk. Regnes ut når skjermen viser stillingen før biten (som i en vanlig kamp), for motoren endrer
   kampen med en gang. */
function tlrTurn(B, n) {
  const R0 = Math.random, ev = [];
  try {
    Math.random = () => 0.5; B.turn = n < 2 ? 1 : 2; GRAV = 0; WILD = false; B.intent = { me: B.me[0].mv[0].i, foe: B.foe[0].mv[0].i }; B.moved = { me: 0, foe: 0 }; B.pivot = null; B.rest = null;
    if (n === 1) { useMove(B, 'foe', 0, ev, 0); B.moved.foe = 1; settle(B, ev); }
    else if (n === 2) megaEvolve(B, 'me', ev);
    else { useMove(B, 'me', 0, ev, 1); B.moved.me = 1; settle(B, ev); }
  } finally { Math.random = R0; }
  return ev;
}
/* Viser klippet: kampskjermen slik den står midt i en kamp (som når en forlatt kamp hentes fram igjen), og så de tre bitene. Traileren klipper videre
   når tiden er inne (left() = sekunder til da), og klippet skal da være framme ved at motstanderen har besvimt, med et lite pusterom (TLRREST).
   Første bit går i fast fart. Før hver av de neste regnes farten ut fra tiden som er igjen: arbeidet (sekunder ved fart 1) delt på tiden, når det
   meldingene tar uansett fart er trukket fra. Aldri saktere enn vanlig fart, aldri fortere enn FAST.
   - Animasjonene er ulike lange med og uten pakke, så lengden på den siste (an) anslås fra den første, som nettopp ble målt.
   - Blir det tid til overs selv i vanlig fart, står «What will … do?» der så lenge, som mellom to runder ellers.
   - Mega Evolution har en kjent lengde. Tok den lengre tid enn den skulle, er enheten treg, og siste bit regnes like mye opp (slow).
   Tallene er målt i nettleseren (pw/t_j7c.js): angrepet = (0,92 + animasjonen) / farten + 0,6 s · Mega Evolution = 2,53 / farten + 0,7 s ·
   svaret = (2,42 + animasjonen) / farten + 0,57 s. */
const TLRREST = 0.7;
async function tlrClip(B, left) {
  const gone = () => BT.B !== B || !$('#arena'), ask = `What will ${B.me[0].name} do?`;
  const play = async ev => { const t = performance.now(); await playEv(ev); return (performance.now() - t) / 1000; }, pace = p => { B.pace = Math.max(1.25, Math.min(2.6, p)); FX.speed = spdF(); return B.pace; };
  BT.B = B; BT.menu = 'main'; BT.res = null; BT.ty = 0; BT.busy = true; BT.live = null;
  BT.v = { me: { i: 0, hp: B.me[0].hp, st: '' }, foe: { i: 0, hp: B.foe[0].hp, st: '' } };
  drawBattle(); drawMenu();
  const o = document.querySelector('#ov .ovin'); if (o) o.insertAdjacentHTML('beforeend', '<button type="button" class="lgi-skip" data-a="showstop">Stop</button>');
  if ($('#trn')) $('#trn').classList.add('out');
  for (const side of ['foe', 'me']) { paintSprite(side, ''); paintBox(side); }
  setText(ask);
  await bwait(500); if (gone()) return;
  const p1 = B.pace, d1 = await play(tlrTurn(B, 1)); if (gone() || B.me[0].hp <= 0) return;
  const an = 1.12 + 0.75 * (Math.max(0.6, Math.min(2.6, (d1 - 0.6) * p1 - 0.92)) - 0.92), wait = left() - TLRREST - 1.27 - (4.95 + an) / 1.25;
  if (wait > 0.15) { setText(ask); await XT(wait * 1000); if (gone()) return; }
  const p2 = pace((4.95 + an) / Math.max(0.4, left() - TLRREST - 1.27)), d2 = await play(tlrTurn(B, 2)); if (gone()) return;
  const slow = Math.max(1, Math.min(2, (d2 - 0.7) * p2 / 2.53));
  pace(slow * (2.42 + an) / Math.max(0.3, left() - TLRREST - 0.57));
  await playEv(tlrTurn(B, 3));
}
async function showTrailer() {
  /* my.B = kampen i klippet mens det vises: da er det kampskjermen som står der, og ikke trailerens egen flate. */
  const my = SHW = { on: 1, B: null }, alive = () => SHW === my && my.on && (my.B ? BT.B === my.B && !!$('#arena') : !!$('#tlr'));
  const stage = () => ov(`<div class="tlr" id="tlr"><div class="tlr-st" id="tlr-st"></div><button type="button" class="lgi-skip" data-a="showstop">Stop</button></div>`, 'battle shwtov');
  /* Klippet er over: kampen ryddes bort, og trailerens flate kommer tilbake. */
  const cut = () => { if (!my.B) return; my.B = null; BT.B = null; BT.busy = false; BT.tap = null; clearInterval(BT.goldT); try { FX.show(null); } catch (_) {} if (BT.air) { BT.air(); BT.air = null; } stage(); };
  stage(); BT.B = null; PACK.unlock();
  /* Én låt gjennom bildene: finalelåta fra Frontier-mappa i pakka, ellers den rolige derfra, ellers den innebygde Frontier-låta. */
  const M = (PACK.ok && PACK.man.music) || [], tk = M.find(x => x.c === 'frontier' && /World Champion Final/.test(x.t)) || M.find(x => x.c === 'frontier' && /Aether/.test(x.t));
  /* Bildene til skyggene hentes først (pakken), så de står klare når bildet kommer. */
  if (PACK.ok) try { await Promise.race([PACK.portraits([POOL.gym[2], POOL.e4[1], POOL.champ[0]].map(d => d[1].split('|')[0]).concat(showSilK(7).map(k => k.split('|')[0]))), XT(1500)]); } catch (_) {}
  if (!alive()) return;
  let started = false; if (tk) started = await PACK.music(tk.f, { loop: false, fade: 0.4 }); if (!alive()) return;
  if (started) music(''); else { PACK.music(''); music('frontier'); }
  /* Det klippet og filmen trenger (bane, animasjoner, lyder, bilder, låta til Dialga), hentes mens de første bildene går. */
  let CB = null; try { CB = tlrBattle(); } catch (_) {}
  if (CB) try { PACK.prep(CB).catch(() => {}); preSpr(9, { ani: 1, back: 1 }); preSpr(9, { ani: 1, back: 1, mega: CB.me[0].mg }); preSpr(405, { ani: 1 }); } catch (_) {}
  const FB = typeof CINE !== 'undefined' && LEG[TRLLEG] && CINE.has(TRLLEG) ? { tr: legTr(TRLLEG), foe: [{ id: TRLLEG, lv: 0 }], me: [], mode: 'lab', lap: 0, raid: 1, show: 1 } : null;
  if (FB) try { CINE.prep(TRLLEG, 6000); PACK.cue(PACK.trackFor(FB)); } catch (_) {}
  const t0 = performance.now(), now = () => { const c = started ? PACK.clock() : -1, w = (performance.now() - t0) / 1000; return c >= 0 && Math.abs(c - w) < 2 ? c : w; }, timers = [];
  const at = (ms, f) => timers.push(setTimeout(() => { if (alive()) try { f(); } catch (_) {} }, ms));
  for (let i = 0; i < TRL.length && alive(); i++) {
    const sc = TRL[i];
    while (alive() && now() < sc.t) await XT(40);
    if (!alive()) break;
    /* Klippet går ved siden av: traileren venter bare på neste tidspunkt. Går noe galt i det, kommer flaten tilbake og traileren går videre. */
    if (sc.k === 'clip') { if (CB) { const end = TRL[i + 1].t; my.B = CB; tlrClip(CB, () => end - now()).catch(() => { if (SHW === my && my.on) cut(); }); } continue; }
    if (my.B) cut();
    const st = $('#tlr-st'), old = st.firstElementChild; if (old) { old.classList.add('out'); await XT(260); if (!alive()) break; }
    $('#tlr').dataset.k = sc.k; st.innerHTML = `<div class="tlr-s sc-${sc.k}">${sc.h()}</div>`;
    if (sc.run) sc.run(st.firstElementChild, at);
    if (sc.k === 'legend') { BSFX.dread(); buzz([40, 60, 40, 60, 200]); } else if (sc.k !== 'title') buzz(14);
  }
  while (alive() && now() < TRLOUT) await XT(60);
  timers.forEach(clearTimeout);
  if (!alive()) return;
  /* Slutten: låta og bildet tones ut, filmen til Dialga spilles (den kan hoppes over), og så står tittelen der mens låta til Dialga klinger ut. */
  const last = $('#tlr-st').firstElementChild; if (last) last.classList.add('fade');
  stopMusic(2.2); await XT(2500); if (!alive()) return;
  if (FB) {
    BT.B = FB; BT.busy = false;
    try { await legendIntro(FB); } catch (_) {}
    if (SHW !== my || !my.on || BT.B !== FB) return;
    BT.B = null;
  }
  stage(); $('#tlr').dataset.k = 'end';
  $('#tlr-st').innerHTML = `<div class="tlr-s sc-end"><div class="tlr-k">Fokusdex</div><p class="tlr-p tlr-lead">Study. Catch. Train. Battle.</p></div>`;
  if (FB) $('#tlr').insertAdjacentHTML('beforeend', '<i class="tlr-fl"></i>');
  buzz(14);
  await XT(3600); if (!alive()) return;
  stopMusic(2.6); await XT(2500); if (!alive()) return;
  SHW = null; showcase();
}

/* ---------- En kamp til å se på, eller prøve selv ----------
   Et sterkt leielag (fire kjente, alle ferdig trent, én med Mega-form og én shiny) mot en Champion. «Watch»: kampen går av seg selv, og hvert valg tas av
   den samme vurderingen motstanderne bruker (høyest ventet skade). «Take over» gir kontrollen til deg. Exit står alltid øverst. */
const EXH = [6, 448, 445, 376, 94, 248, 373, 130, 149, 257, 254, 260, 282, 212, 635, 637];
function exhTeam() {
  const ids = EXH.slice().sort(() => Math.random() - 0.5), mg = ids.find(id => megaOpts(id).length), l = [mg].concat(ids.filter(id => id !== mg).slice(0, 3)), shi = 1 + rnd(3);
  return l.map((id, i) => { const o = BST[id - 1].map((b, j) => [b, j]).sort((a, b) => b[0] - a[0]), ev = [0, 0, 0, 0, 0, 0]; ev[o[0][1]] = 252; ev[o[1][1]] = 252; return { id, lv: FACLV, sh: i === shi ? 1 : 0, iv: [31, 31, 31, 31, 31, 31], ev, nat: 0, mv: foeMoves(id, FACLV, 2), ms: megaOpts(id)[0] || 0 }; });
}
function exhibition(play) {
  PACK.unlock(); const B = labBattle('champ', true, rnd(POOL.champ.length), exhTeam()); B.watch = play ? 0 : 1; B.exh = 1; BT.busy = false; startBattle(B);
  const step = () => {
    if (BT.B !== B || B.over) return;
    const btn = $('#exb'), ex = $('#exx');
    if (!B.watch) { if (btn) btn.remove(); return; }
    if (ex && !btn) ex.insertAdjacentHTML('beforebegin', '<button type="button" class="pill exb" id="exb" data-a="exstop">Auto · take over</button>');
    if ($('#arena') && !BT.busy) {
      if (B.need) { const k = B.me.findIndex((b, j) => b.hp > 0 && (j !== B.a || B.need === 1)); if (k >= 0) playEv(sendIn(B, k)); }
      else if ($('#bmenu button')) {
        const me = B.me[B.a], foe = B.foe[B.b]; let best = -1, bv = -1;
        me.mv.forEach((x, k) => { if (!moveOk(B, k)) return; const v = (estDmg(B, me, foe, MOVES[x.i]) + 1) * (0.8 + Math.random() * 0.4); if (v > bv) { bv = v; best = k; } });
        BT.menu = 'main'; playEv(runTurn(B, { t: 'move', k: best, mega: canMega(B, 'me') ? 1 : 0 }));
      }
    } else if (BT.tap) BT.tap();
    else { const g = document.querySelector('#bwi.go'); if (g) { if (!B.gt) B.gt = Date.now(); else if (Date.now() - B.gt > 2200) { B.gt = 0; try { g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); } catch (_) {} } } }
    setTimeout(step, 700);
  };
  if (!play) setTimeout(step, 1600);
}

/* ---------- Sandkassa (bare admin) ----------
   Her testes alt. To slags ting:
   1. Enkeltkamper, raid, filmer og pakker som ikke rører noe (modus «lab»), slik demoen var.
   2. En KOPI av lagringen (SBX i game.js): hele spillet virker som vanlig – alle tre modusene, butikken, møtene, raid, simuleringen – men ingenting lagres,
      og ingenting synkes. Kopien får en ny kampdag med bonusen på topp og alle tre modusene åpne (sbxDay), og verktøyene (sbxTools) gir det som trengs for
      å prøve noe bestemt: mynter, nivå, gjenstander, et raid, et legendarisk eller shiny møte. «Leave» bytter tilbake til den ekte lagringen. Lukkes appen,
      er kopien borte. */
const sbxBar = () => SBX ? `<div class="sbxbar"><span class="sp"><b>Sandbox</b><span class="sm">A copy of your save · nothing is saved</span></span><button type="button" class="btn sm2" data-a="sbxtools">Tools</button><button type="button" class="btn sm2 gold" data-a="sbxleave">Leave</button></div>` : '';
function sbxEnter() {
  if (!isAdmin()) return false;
  if (S.timer) { toast('Finish your focus session first.'); return false; }
  if (!SBX) { SBX = { real: S, cup: null }; S = JSON.parse(JSON.stringify(S)); delete S.live; }
  return true;
}
function sbxLeave() { if (!SBX) return; S = SBX.real; SBX = null; BT.B = null; BT.busy = false; BT.res = null; stopMusic(); }
/* En ny kampdag i kopien: bonusen på topp, alle tre modusene åpne (eller bare én: da kan dagen også simuleres), ingen forsøk brukt. */
function sbxDay(only) {
  const d = dayKey(), L = S.lad, lg = S.log[d] || (S.log[d] = { m: 0, s: 0, f: {} });
  lg.m = Math.max(lg.m || 0, goalMin());
  L.day = d; L.lost = ''; L.lapd = ''; L.tries = null; L.fw = ''; L.skip = ''; L.simd = ''; L.simno = ''; S.sim = null;
  S.fac.lost = ''; S.fac.tries = null; const P = pwt(); P.day = ''; P.run = null;
  S.mode = { day: d, ks: only && MODES.includes(only) ? [only] : MODES.slice() }; if (!S.evt || S.evt.day !== d) S.evt = { day: d, k: '' };
  if (S.raid) S.raid.day = '';
  if (SBX) SBX.cup = null;
}
/* Ferdige oppsett: finalen mot en bestemt, Frontier fra en bestemt runde, en bestemt cup. */
function sbxFinal(k, i) { const L = S.lad; L.n = LAPN - 1; L.c = CLIMBTOP; L.seen = []; const t = { n: L.n, lap: L.lap, k, i, sup: 0 }; if ((POOL[k][i][6] || {}).fx) t.v = drawTeam(POOL[k][i]); L.next = t; }
function sbxFac(r) { S.fac.run = { round: r, w: 0, streak: (r - 1) * FACN, offer: facOffer(r), open: 0, team: null, foe: null }; }
function sbxRaid(id, sh, show) { const t = LEG[id].t; S.raid = { id, lv: raidLvFor(t), hx: +raidHx(t).toFixed(2), day: '', tries: 0, at: dayKey(), nw: 0, hid: 1, sh: sh ? 1 : 0 }; if (show) raidUnhide(); }
const SBXT = [['coins', '+100 000 coins'], ['level', 'Trainer level +10'], ['items', '5 of every item in the Shop'], ['held', 'One of everything a Pokémon can hold'], ['team', 'My team to Lv 100'], ['enc', 'A legendary encounter in the grass'], ['shenc', 'A shiny encounter in the grass'], ['raid', 'A legendary raid · hidden until the battles are done'], ['raidnow', 'A legendary raid · shown now'], ['shraid', 'A shiny legendary raid · shown now'], ['day', 'A new battle day · all three modes open'], ['dayl', 'A new battle day · League only (Simulate works)'], ['dayf', 'A new battle day · Frontier only'], ['dayp', 'A new battle day · Tournament only']];
function sbxTool(k) {
  if (!SBX) return;
  if (k === 'coins') S.coins += 100000;
  else if (k === 'level') S.xp = 300 * Math.pow(tlv() + 9, 2);
  else if (k === 'items') BALLS.concat(['gberry', 'candy', 'stone', 'mstone', 'potion', 'super', 'hyper', 'maxp', 'heal', 'revive', 'maxrev', 'ash']).forEach(x => { if (SHOP[x]) S.items[x] = (S.items[x] || 0) + 5; });
  else if (k === 'held') Object.keys(HELD).forEach(x => { S.items[x] = (S.items[x] || 0) + 1; });
  else if (k === 'team') S.party.map(monBy).filter(Boolean).forEach(m => { m.xp = Math.max(m.xp, xpAt(100)); m.lv = 100; });
  else if (k === 'enc') S.pend.push(legEnc());
  else if (k === 'shenc') { const e = genEnc({ luck: 2 }); e.sh = 1; S.pend.push(e); }
  else if (k === 'raid' || k === 'raidnow' || k === 'shraid') { const ids = Object.keys(LEG).map(Number), id = ids[rnd(ids.length)]; sbxRaid(id, k === 'shraid', k !== 'raid'); }
  else if (k === 'day') sbxDay();
  else if (k === 'dayl' || k === 'dayf' || k === 'dayp') sbxDay({ dayl: 'league', dayf: 'factory', dayp: 'pwt' }[k]);
}
/* Lydtavla: hver lyd i appen (sfx), hva den brukes til, og om den kommer fra pakken (PACK.sys) eller er den innebygde. */
const SNDUSE = { tap: 'Any button', tab: 'Tabs', chip: 'Filters and choices', ball: 'Choosing a ball', open: 'A sheet opens', close: 'Close and back', ok: 'Confirmed', warn: 'Warnings', fav: 'Favourite',
  start: 'A session or a battle starts', done: 'A session is complete', coin: 'Coins and purchases', sell: 'Selling', found: 'An encounter', appear: 'A wild Pokémon appears', thr: 'A ball is thrown', wob: 'The ball wobbles',
  got: 'Caught', caught: 'Caught: shiny or legendary', fail: 'It broke free', flee: 'It fled', lvl: 'Level up', evo: 'A rare find, a Mega Stone', evolved: 'Evolution', hatch: 'An egg hatches', egg: 'An egg bought',
  rank: 'A new rank', event: 'A special event', item: 'An item to hold', keyitem: 'A plate or another lasting item', berry: 'A berry', learn: 'Not in use yet', heal: 'Not in use yet', saved: 'Not in use yet' };
function sbxSounds() {
  openSheet(`<h2 class="h" style="margin-top:0">Sounds</h2><p class="sm">Tap one to hear it. <b>Pack</b> means it comes from your resource pack. The others are the built-in sounds, which is also what plays without the pack.</p>
    <div class="stack" style="margin-top:10px">${Object.keys(sfx).map(k => `<button type="button" class="btn wide sndb" data-a="sbxsnd" data-k="${k}"><b>${k}</b><span class="sm">${SNDUSE[k] || ''}</span>${PACK.sysPath(k) ? '<span class="pill">Pack</span>' : ''}</button>`).join('')}</div>
    <button type="button" class="btn wide nf" data-a="sbxtools">Back to the tools</button>`);
}
function sbxTools() {
  openSheet(`<h2 class="h" style="margin-top:0">Sandbox tools</h2><p class="sm">Everything here changes the copy only. Leave the sandbox, and your real save is exactly as it was.</p>
    <div class="stack" style="margin-top:10px">${SBXT.map(([k, n]) => `<button type="button" class="btn wide" data-a="sbxtool" data-k="${k}">${n}</button>`).join('')}</div>
    <button type="button" class="btn wide" data-a="sbxsounds">Sounds · hear every interface sound</button>
    <button type="button" class="btn wide nf" data-a="lab">Back to the Sandbox screen</button><button type="button" class="btn wide gold" data-a="sbxleave">Leave the sandbox</button>`);
}
function sbxPick(what) {
  if (what === 'final') return openSheet(`<h2 class="h" style="margin-top:0">The League final</h2><p class="sm">Choose who is waiting in battle ${LAPN}. You meet them with your own team, in a copy of your save.</p>
    ${['champ', 'supreme'].map(k => `<div class="lab" style="margin-top:10px">${TCL[k].n}</div><div class="labtr">${POOL[k].map((d, i) => `<button type="button" data-a="sbxfinal" data-k="${k}" data-i="${i}">${tsprite(d[1])}<b>${esc(d[0])}</b><span class="sm">${esc((d[6] || {}).cn || d[2])}</span></button>`).join('')}</div>`).join('')}`);
  if (what === 'fac') return openSheet(`<h2 class="h" style="margin-top:0">Battle Frontier</h2><p class="sm">Start a run from a round of your choice. Later rounds have stronger rentals and stronger opponents.</p>
    <div class="row" style="flex-wrap:wrap;margin-top:10px">${[1, 2, 3, 5, 8].map(r => `<button type="button" class="btn sp" data-a="sbxfac" data-k="${r}">Round ${r}</button>`).join('')}</div>`);
  openSheet(`<h2 class="h" style="margin-top:0">World Tournament</h2><p class="sm">Choose the cup. It is normally decided by the day of the week.</p>
    <div class="stack" style="margin-top:10px">${CUPS.map((c, i) => `<button type="button" class="btn wide" data-a="sbxcup" data-k="${i}">${esc(c.n)} · ×${c.f}</button>`).join('')}</div>`);
}
function sbxScreen() {
  const rent = !!BT.labRent, sec = (t, s) => `<div class="lab">${t}</div>${s ? `<p class="sm" style="margin-top:-4px">${s}</p>` : ''}`;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Sandbox · only you</span></div>
    <div><h1 class="big">Test anything.</h1><p class="mut" style="margin-top:6px">Nothing in here gives rewards, and nothing touches your progress. Only you can open it.</p></div>
    ${PACK.ok ? '' : `<div class="card nopack"><b>Built-in graphics and music</b><p class="sm" style="margin-top:4px">${GH && GH.ok ? `Sync is on, but your pack is not loaded${PACK.err ? ' (error ' + esc(PACK.err) + ')' : ' yet'}.` : 'Sync is off on this device, so your own pack is not loaded: music, HP boxes, sounds and move animations are the built-in ones.'}</p><button type="button" class="btn wide" data-a="${GH && GH.ok ? 'packre' : 'sync'}" style="margin-top:8px">${GH && GH.ok ? 'Look for the pack again' : 'Connect Sync'}</button></div>`}
    <div class="card stack sbxc">${sec('The whole game, on a copy of your save', 'All three modes open, the bonus at its peak, and the Shop, the grass, raids and the simulation working as usual. Nothing is saved or synced.')}
      <button type="button" class="go gold" data-a="sbxopen">${SBX ? 'Back into the copy' : 'Open a copy of my save'}</button>
      <div class="row"><button type="button" class="btn sp" data-a="sbxpick" data-k="final">League final…</button><button type="button" class="btn sp" data-a="sbxpick" data-k="fac">Frontier round…</button><button type="button" class="btn sp" data-a="sbxpick" data-k="cup">Cup…</button></div>
      ${SBX ? '<div class="row"><button type="button" class="btn sp" data-a="sbxtools">Tools</button><button type="button" class="btn sp nf" data-a="sbxleave">Leave the copy</button></div>' : ''}</div>
    <div class="stack">${sec('Single battles', 'One battle against a class, and you choose who you meet.')}
      <div class="row labm"><button type="button" class="btn sp${rent ? ' nf' : ''}" data-a="labmode" data-k="0" aria-pressed="${!rent}">My team</button><button type="button" class="btn sp${rent ? '' : ' nf'}" data-a="labmode" data-k="1" aria-pressed="${rent}">Rentals · Lv ${FACLV}</button></div>
      <div class="lablist">${ORDER.map(k => { const c = TCL[k]; return `<button type="button" data-a="${k === 'trainer' || k === 'evilteam' ? 'labgo' : 'labpick'}" data-k="${k}" class="k-${TIER(k)}"><span class="cno">${c.i}</span><span class="sp"><b>${c.n}</b><br><span class="sm">${LABD[k]}</span></span>${ULTRA.has(k) ? `<span class="pill">${RARE[k].replace(' boss', '')}</span>` : ''}</button>`; }).join('')}</div></div>
    <div class="stack">${sec('Legendary raids', 'The film, the entrance, the place and the fight, with your own team.')}${[['The greatest', id => LEG[id].t === 4 || LEG[id].t === 2], ['Mythical', id => LEG[id].t === 3], ['Legendary', id => LEG[id].t === 1]].map(([n, f]) => `<div class="sm tn">${n}</div><div class="legl">${Object.keys(LEG).map(Number).filter(f).sort((a, b) => (LEG[b].t === 4) - (LEG[a].t === 4)).map(id => `<button type="button" data-a="labraid" data-k="${id}" style="--cc:${LEG[id].cc}">${spr(id, { lazy: 1, mega: defForm(id) })}<b>${id === 150 ? 'Mewtwo → Dark' : esc(D(id)[0])}</b></button>`).join('')}</div>`).join('')}
      <p class="sm tn">Mewtwo is the whole story in one demo: beat it and it rises again as Dark Mewtwo, which transforms once more when its first song has ended, about two and a half minutes into that fight. In the demo Mewtwo has ordinary health, so you get that far.</p></div>
    <div class="stack">${sec('Films', 'Only the film, without the fight.')}<div class="shw-f"><button type="button" data-a="showfilm" data-k="boss" data-i="Cynthia" style="--cc:#e9d28a">${tsprite('cynthia')}<b>Cynthia</b><span class="sm">Sinnoh Champion</span></button><button type="button" data-a="showfilm" data-k="boss" data-i="Ghetsis" style="--cc:#c8102e">${tsprite('ghetsis')}<b>Ghetsis</b><span class="sm">Champions Edition</span></button></div>
      <div class="legl">${showLegs().concat([491]).map(id => `<button type="button" data-a="showfilm" data-k="leg" data-i="${id}" style="--cc:${LEG[id].cc}">${spr(id, { lazy: 1, mega: defForm(id) })}<b>${esc(D(id)[0])}</b></button>`).join('')}<button type="button" data-a="showfilm" data-k="leg" data-i="dk" style="--cc:${DARK.cc}">${spr(150, { sh: 2 })}<b>Dark Mewtwo</b></button></div>
      <div class="row"><button type="button" class="btn sp" data-a="showplay">The trailer</button><button type="button" class="btn sp" data-a="show">The showcase</button></div></div>
    <div class="stack">${sec('Packs', 'Open them for free and see what really comes out.')}<div class="row labpk">${Object.keys(PACKS).map(k => `<button type="button" class="btn sp" data-a="pkdemo" data-k="${k}" style="--pc:${PACKS[k].c}"><span class="pk-ic"><i></i></span>${PACKS[k].n.replace(' Pack', '')}</button>`).join('')}</div><button type="button" class="btn wide nf" data-a="packlab">Pack odds · open a thousand</button></div>
    ${PACK.ok ? `<p class="sm tn">Your pack is loaded: ${Object.keys(PACK.man.scenes || {}).length} arenas, ${(PACK.man.music || []).length} tracks and ${Object.keys(PACK.man.sfx || {}).length} sounds.</p>` : ''}`, 'tint', 'var(--gold)');
  /* Bildene av de to fra pakken settes inn når de er hentet. */
  if (PACK.ok) PACK.portraits(['cynthia', 'ghetsis']).then(n => { if (n) document.querySelectorAll('#ov .shw-f button').forEach(b => { const o = b.querySelector('.tsb'); if (o) o.outerHTML = tsprite(b.dataset.i.toLowerCase()); }); }).catch(() => {});
}
const sbxGo = msg => { closeSheet(); closeOv(); BT.B = null; BT.busy = false; stopMusic(); U.tab = 'fokus'; render(); toast(msg); };
const XA = {
  rcdone: () => { if (BT.res) overview(); else { closeOv(); render(); } },
  labpick: el => { if (!isAdmin()) return; sfx.open(); labPick(el.dataset.k); },
  packlab: el => { if (!isAdmin()) return; BT.B = null; packLab(el && el.dataset.k); },
  pkdemo: el => { const k = el.dataset.k; if (!isAdmin() || !PACKS[k]) return; U.plk = k; sfx.coin(); packShow(k, packDraw(k, true), true); },
  pkrun: el => { const k = el.dataset.k; if (!isAdmin() || !PACKS[k]) return; U.pls = packStats(k, PKN); sfx.ok(); packLab(k); },
  show: () => { closeSheet(); if (SHW) SHW.on = 0; SHW = null; BT.B = null; BT.busy = false; stopMusic(); sfx.open(); showcase(); },
  showplay: () => { sfx.start(); showTrailer(); },
  /* Stop i traileren, også mens klippet fra kampen står der: kampen ryddes bort som når en kamp er over. */
  showstop: () => { if (SHW) SHW.on = 0; SHW = null; BT.B = null; BT.busy = false; BT.tap = null; clearInterval(BT.goldT); try { FX.show(null); } catch (_) {} if (BT.air) { BT.air(); BT.air = null; } stopMusic(0.4); showcase(); },
  showfilm: async el => { if (!isAdmin()) return; const k = el.dataset.k, a = k === 'leg' && el.dataset.i !== 'dk' ? +el.dataset.i : el.dataset.i; SHW = null; sfx.start(); const ok = await showFilm(k, a); if (ok && $('#lgi')) sbxScreen(); },
  exhib: el => { if (SHW) SHW.on = 0; SHW = null; sfx.start(); exhibition(el && el.dataset.k === 'play'); },
  exstop: () => { const B = BT.B; if (B) B.watch = 0; const b = $('#exb'); if (b) b.remove(); toast('You are in control now.'); },
  exexit: () => { BT.B = null; BT.busy = false; stopMusic(0.4); sfx.tap(); showcase(); },
  sbxopen: () => { const first = !SBX; if (!sbxEnter()) return; if (first) sbxDay(); sbxGo(first ? 'Sandbox: this is a copy of your save. Nothing is saved.' : 'Back in the copy.'); },
  sbxpick: el => { if (!isAdmin()) return; sfx.open(); sbxPick(el.dataset.k); },
  sbxfinal: el => { const k = el.dataset.k, i = +el.dataset.i; if (!POOL[k] || !POOL[k][i] || !sbxEnter()) return; sbxDay(); sbxFinal(k, i); sbxGo(`Sandbox: ${POOL[k][i][0]} is waiting in the final.`); },
  sbxfac: el => { const r = Math.max(1, +el.dataset.k || 1); if (!sbxEnter()) return; sbxDay(); sbxFac(r); sbxGo(`Sandbox: a Frontier run from round ${r}.`); },
  sbxcup: el => { const i = +el.dataset.k; if (!CUPS[i] || !sbxEnter()) return; sbxDay(); SBX.cup = i; sbxGo(`Sandbox: the ${CUPS[i].n}.`); },
  sbxtools: () => { if (!SBX) return; sfx.open(); sbxTools(); },
  sbxsounds: () => { if (!SBX) return; sbxSounds(); },
  sbxsnd: el => { const k = el.dataset.k; if (sfx[k]) sfx[k](k === 'wob' ? 1 : undefined); },
  sbxtool: el => { if (!SBX) return; const k = el.dataset.k; sbxTool(k); sfx.ok(); closeSheet(); render(); toast((SBXT.find(x => x[0] === k) || ['', 'Done'])[1] + ': done.'); },
  sbxleave: () => { if (!SBX) return; closeSheet(); closeOv(); sbxLeave(); render(); toast('Back in your real save. Nothing from the sandbox was kept.'); }
};
