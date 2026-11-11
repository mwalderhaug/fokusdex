'use strict';
/* Fokusdex – kampskjermene: kortene på forsiden, oppstilling før kampen, selve kampen, oppgjøret etterpå, Battle Frontier og demoen.
   Reglene ligger i battle.js og league.js, effektene i bfx.js. */

const BT = { B: null, busy: false, v: null, menu: 'main', res: null, ty: 0, tap: null, lead: 0, fsel: [], tp: null, fs: null };
const spdF = () => S.bfast ? 2.1 : 1;
const bwait = ms => new Promise(r => setTimeout(r, ms / spdF()));
/* Hvor mye pynt en klasse får i kort og lister: vanlig trener, boss, toppboss, og de tre sjeldne som har hver sin stil:
   de onde lederne (mørkt og rødt), mesterne (hver sin farge) og de aller største (gull, bare klasse 9). */
const TIER = k => k === 'supreme' ? 'ultra' : k === 'champ' ? 'champ' : k === 'evilboss' ? 'evil' : k === 'trainer' ? 'reg' : k === 'gym' || k === 'evilteam' || k === 'brain' ? 'boss' : 'top';
const RARE = { evilboss: 'rare boss', champ: 'very rare boss', supreme: 'ultra rare boss' };
const kst = tr => tr.cc ? ` style="--cc:${tr.cc}"` : '';
/* Hva hver klasse gir (vises før kampen) og hva den er (vises i demoen). */
const REW = { trainer: 'coins, sometimes Poké Balls, a Potion or an encounter', gym: 'Rare Candy, a Super Potion and an encounter of their type', evilteam: 'Great Balls, stolen coins and an encounter', eviladmin: 'Ultra Balls, two encounters, maybe an evolution stone',
  e4: 'Rare Candy, a Hyper Potion and two rare encounters', rival: '2 Rare Candy, a Revive, an Egg and two encounters', evilboss: '3 Rare Candy, three rare encounters, maybe a pseudo-legendary', champ: '4 Rare Candy, a Max Revive and a pseudo-legendary encounter',
  supreme: 'a legendary and a pseudo-legendary encounter, 6 Rare Candy and a Shiny Charm' };
const LABD = { trainer: 'Regular trainers', gym: 'Gym bosses', evilteam: 'Grunts and members', eviladmin: 'Second in command of the evil teams', e4: 'The Pokémon League', rival: 'Rivals', evilboss: 'Leaders of the evil teams', champ: 'Regional champions', supreme: 'Iconic, extreme boss battles' };
const who = tr => (tr.title ? tr.title + ' ' : '') + tr.n;
/* Trenerbildene hentes fra Showdown når appen brukes. Finnes ikke bildet, prøves neste navn, og til slutt vises en silhuett. */
const TSP = 'https://play.pokemonshowdown.com/sprites/trainers/';
const tsprite = (img, cls) => { const l = img.split('|'), pk = PACK.portrait(l[0]); if (pk) return `<span class="tsb ok ${cls || ''}"><img alt="" src="${pk}"></span>`; return `<span class="tsb ${cls || ''}"><img alt="" src="${TSP}${l[0]}.png" data-f="${l.slice(1).join('|')}" onload="this.parentNode.classList.add('ok')" onerror="tsErr(this)"></span>`; };
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
  beat: () => { tone(58, 0, 0.16, 0.12, 'sine', 40); tone(52, 0.24, 0.2, 0.1, 'sine', 36); },
  dread: () => { noise(0, 1.3, 0.07, 140, 60); tone(46, 0, 1.3, 0.07, 'sawtooth', 30); },
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
/* Kampmusikken: trenerens egen låt fra ressurspakken hvis den finnes, ellers den innebygde. */
async function battleMusic(B) {
  const tk = PACK.trackFor(B);
  if (tk && await PACK.music(tk)) return music('');
  if (BT.B !== B || B.over) return;
  PACK.music(''); music(musicKey(B));
}
const stopMusic = () => { PACK.music(''); music(''); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') stopMusic(); else if (BT.B && !BT.B.over && $('#arena')) battleMusic(BT.B); });

/* ---------- Forsiden ---------- */
const leagueTag = () => { const L = S.lad; return `${L.lap ? 'Lap ' + (L.lap + 1) + ' · ' : ''}Battle ${L.n + 1}/${LAPN}`; };
function ladderCard() {
  const L = S.lad, t = nextTrainer(), tr = trainerInfo(t), sm = studyMult(), bo = dayBoost(), tier = TIER(tr.kind), R = S.fac.run;
  /* En runde: seks par med en trener og en boss. Den siste bossen er en av de sjeldne. */
  const prog = `<div class="lgp" aria-hidden="true">${Array.from({ length: LAPN }, (_, n) => `<i class="${n < L.n ? 'on' : n === L.n ? 'cur' : ''}${n % 2 === 0 && n ? ' gap' : ''}${n % 2 === 1 ? ' bo' : ''}${n === LAPN - 1 ? ' ul' : ''}"></i>`).join('')}</div>`;
  const row = `<div class="lrow k-${tier}"${kst(tr)}>${tsprite(tr.img, 'sm')}<div class="sp"><div class="sm tn">${esc(leagueTag())}${tr.boss ? ` · class ${tr.ci} of 9${tr.ultra ? ' · ' + RARE[tr.kind] : ''}` : ''}</div><b class="${tr.boss ? 'bossn' : ''}">${esc(who(tr))}</b></div></div>`;
  const fac = `<div class="modec"><span class="ficon">F</span><div class="sp"><b>Battle Frontier</b><div class="sm tn">${R ? `Round ${R.round} · ${R.w}/${FACN} wins · streak ${R.streak}` : `Rent 4 of 7 random Pokémon · everything is Lv ${FACLV}${S.fac.best ? ' · best streak ' + S.fac.best : ''}`}</div></div></div>`;
  const tag = m => bo.mode === m ? `<span class="bonus">Today's bonus</span>` : '';
  const lab = '<button type="button" class="btn wide nf" data-a="lab">Demo battle · try any class</button>';
  const charm = S.charm > 0 ? `<p class="sm" style="color:var(--gold)">Shiny Charm: ${CHARM.m}× shiny odds for your next ${S.charm} focus session${S.charm > 1 ? 's' : ''}.</p>` : '';
  if (!L.day) return `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Battles</b><span class="pill tn">Lap ${L.lap + 1}</span></div>${row}${prog}
    <p class="sm">Two ways to battle once you are done studying: the League (your own team, XP and Rare Candy) and the Battle Frontier (rental Pokémon at Lv ${FACLV}, items and encounters). Today's bonus is on the ${bo.mode === 'league' ? 'League' : 'Battle Frontier'}.</p>
    <button type="button" class="btn wide" data-a="bdone">Done for today · open battles</button>${lab}</div>${charm}`;
  const mult = `<p class="sm tn">Rewards ×${sm} from ${hrs(ladMin())} h of focus${L.day !== dayKey() ? ' that day' : ' today'}. Five hours gives ×2.</p>`;
  return `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Trainer League</b>${tag('league')}</div>${row}${prog}
      ${ladLost() ? '<p class="sm">Two losses today. The League opens again after your next day of focus, and you keep your place and the XP.</p>' : `<p class="sm">${bo.mode === 'league' ? '+30% XP and better odds for Rare Candy today. ' : ''}A trainer, then a boss, through the nine classes. XP for the whole team after each battle. ${ladFails() ? 'You have used your rematch: one more loss closes the League for the day.' : 'You get one rematch a day: the second loss closes the League.'}</p><button type="button" class="go${tr.boss ? ' gold' : ''}" data-a="bpre">Battle</button>`}</div>
    <div class="card stack"><div class="row" style="justify-content:space-between"><b>Battle Frontier</b>${tag('factory')}</div>${fac}
      ${facLost() ? '<p class="sm">Your run ended. The Frontier opens again after your next day of focus.</p>' : `<p class="sm">${bo.mode === 'factory' ? '1.5× luck on items, encounters and rare bosses today. ' : ''}Six trainers, then a boss. No XP and no Bag here: you win items and encounters. A loss ends the run.</p><button type="button" class="btn wide gold" data-a="fenter">${R ? 'Continue the run' : 'Enter the Frontier'}</button>`}</div>${mult}${charm}${lab}`;
}
/* Oppstilling før en ligakamp: hvem du møter, hva de gir, og hvem av dine som går ut først. */
function preBattle() {
  const t = nextTrainer(), tr = trainerInfo(t), p = leaguePlan(t), tier = TIER(tr.kind), team = S.party.map(monBy).filter(Boolean);
  if (!S.party.includes(BT.lead)) BT.lead = S.party[0];
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">${esc(leagueTag())}</span></div>
    <div class="card k-${tier}"${kst(tr)}><div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${tr.boss ? `Class ${tr.ci} of 9 · ${esc(tr.cn)}${tr.ultra ? ' · ' + RARE[tr.kind] : ''}${t.sup ? ' · surprise' : ''}` : 'Trainer'}</div><b class="${tr.boss ? 'bossn' : ''}" style="font-size:19px">${esc(who(tr))}</b><div class="sm tn" style="margin-top:4px">${p.n} Pokémon · around Lv ${p.lv}</div><div class="sm" style="margin-top:4px">Gives ${REW[t.k]}.</div></div></div></div>
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
/* Med ressurspakken tegnes HP-boksene piksel for piksel fra arket, slik de ser ut i Black 2 og White 2: navn, nivå, HP-linje, tall og EXP.
   Uten pakke brukes de innebygde boksene over. Toppbossene i ligaen (klasse 7 til 9) får en glinsende gullramme rundt boksen sin. */
const HUDM = 3;
/* Ramme rundt motstanderens boks: gull bare for klasse 9, mørkerød som pulserer for de onde lederne, og mesterens egen farge for klasse 8. */
const hudRing = side => { const B = BT.B, tr = B.tr; return side !== 'foe' || B.mode === 'fac' ? '' : tr.gold ? 'gold' : tr.th === 'evil' ? 'evil' : tr.kind === 'champ' ? 'champ' : ''; };
let goldRing = null;
/* Omrisset av motstanderens boks, to piksler bredt: boksen stemplet rundt seg selv, med selve boksen skåret ut. */
function ringFor(H) {
  if (goldRing && goldRing.im === H.im) return goldRing.cv;
  const r = H.r.foe, c = document.createElement('canvas'), x = c.getContext('2d'); c.width = r[2] + 2 * HUDM; c.height = r[3] + 2 * HUDM;
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.abs(dx) + Math.abs(dy) <= 3) x.drawImage(H.im, r[0], r[1], r[2], r[3], HUDM + dx, HUDM + dy, r[2], r[3]);
  x.globalCompositeOperation = 'destination-out'; x.drawImage(H.im, r[0], r[1], r[2], r[3], HUDM, HUDM, r[2], r[3]);
  goldRing = { im: H.im, cv: c }; return c;
}
function hudDraw(side) {
  const H = PACK.hud, cv = document.querySelector('#b-' + side + ' canvas'); if (!H || !cv) return false;
  const B = BT.B, v = BT.v[side], team = teamOf(side), b = team[v.i], me = side === 'me', g = cv.getContext('2d'), R = H.r, M = HUDM, py = 9 + M, hp = v.sh != null ? v.sh : v.hp, bw = me ? 113 : 104, bh = me ? 18 : 12;
  const put = (n, x, y) => { const r = R[n]; if (!r) return 0; g.drawImage(H.im, r[0], r[1], r[2], r[3], x + M, y, r[2], r[3]); return r[4] || r[2]; };
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
  const rk = hudRing(side);
  if (rk) {
    const ring = ringFor(H), T = performance.now() / 1000, t = BT.tmp || (BT.tmp = document.createElement('canvas')), tx = t.getContext('2d');
    t.width = ring.width; t.height = ring.height; tx.drawImage(ring, 0, 0); tx.globalCompositeOperation = 'source-in';
    const gr = tx.createLinearGradient(0, 0, 0, t.height);
    if (rk === 'gold') { gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.45, '#f8c830'); gr.addColorStop(1, '#b8780c'); }
    else if (rk === 'evil') { const ph = (T % 1.15) / 1.15, k = Math.max(Math.exp(-Math.pow(ph - 0.06, 2) / 0.0016), 0.7 * Math.exp(-Math.pow(ph - 0.26, 2) / 0.003)), c = Math.round(110 + 145 * k); gr.addColorStop(0, `rgb(${c},${Math.round(20 * k)},${Math.round(24 * k)})`); gr.addColorStop(1, '#3a0508'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, B.tr.cc || '#b295e6'); gr.addColorStop(1, B.tr.cc || '#b295e6'); }
    tx.fillStyle = gr; tx.fillRect(0, 0, t.width, t.height);
    if (rk === 'gold') {
      /* Glansen som sveiper over ramma, og små stjerner som blinker langs kanten. */
      tx.globalCompositeOperation = 'source-atop'; const sx = ((T * 80) % (t.width + 70)) - 30, g2 = tx.createLinearGradient(sx - 12, 0, sx + 12, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, 'rgba(255,255,255,.95)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); tx.fillStyle = g2; tx.fillRect(sx - 12, 0, 24, t.height);
    }
    g.drawImage(t, 0, py - M);
    if (rk === 'gold') for (let i = 0; i < 4; i++) { const q = T * 1.5 + i * 0.25, ph = q % 1, k = Math.floor(q) * 7 + i * 13, x = M + 4 + (k * 37) % (bw - 12), y = (k % 2) ? py - 2 : py + bh + 1; g.globalAlpha = Math.sin(ph * Math.PI); g.fillStyle = '#fff'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    g.globalAlpha = 1;
  }
  put(side, 0, py);
  /* HP-linja: tom stripe, og den fylte delen i grønt, gult eller rødt. */
  const bx = (me ? 50 : 38) + M, f = Math.max(0, Math.min(1, hp / b.max)), w = hp > 0 ? Math.max(1, Math.round(48 * f)) : 0;
  let r = R.hp_empty; g.drawImage(H.im, r[0] + 1, r[1] + 1, 48, 3, bx, py + 2, 48, 3);
  r = R[f > 0.5 ? 'hp_green' : f > 0.2 ? 'hp_yellow' : 'hp_red']; if (w) g.drawImage(H.im, r[0] + 1, r[1] + 1, w, 3, bx, py + 2, w, 3);
  /* Navnet med spillets bokstaver. Er det for langt, står bokstavene én piksel tettere. */
  const gl = [...b.name].map(ch => ch === ' ' ? 4 : R['n' + ch] ? 'n' + ch : 2), wid = gl.reduce((a, q) => a + (q > 0 ? q : R[q][4]), 0), tight = wid > 62 ? 1 : 0;
  let x = me ? 10 : 14; for (const q of gl) x += q > 0 ? q : put(q, x, py - 9) - tight;
  put('lv', me ? 74 : 78, py - 7); x = me ? 82 : 86; for (const ch of String(b.lv)) x += put('l' + ch, x, py - 9);
  if (v.st && R['st_' + v.st]) put('st_' + v.st, me ? 15 : 4, py + 3);
  if (me) {
    const s = String(Math.max(0, Math.round(hp))); x = 74 - 8 * s.length; for (const ch of s) { put('h' + ch, x, py + 5); x += 8; }
    x = 82; for (const ch of String(b.max)) { put('h' + ch, x, py + 5); x += 8; }
    r = R.xp_empty; g.drawImage(H.im, r[0], r[1], r[2], r[3], 25 + M, py + 14, r[2], r[3]);
    const xa = xpAt(b.lv), xb = xpAt(b.lv + 1), xw = b.src.u && b.src.xp != null && B.mode === 'league' ? Math.round(80 * Math.max(0, Math.min(1, (b.src.xp - xa) / (xb - xa)))) : 0;
    r = R.xp; if (xw) g.drawImage(H.im, r[0], r[1], 1 + xw, 4, 25 + M, py + 14, 1 + xw, 4);
  }
  /* Små kuler under boksen viser hvor mange som er igjen på laget. */
  const n = team.length, y0 = py + bh + (me ? 2 : 3); let x0 = me ? M + bw - 8 - n * 5 : M + 8;
  team.forEach((q, i) => { const out = q.out && !(i === v.i && hp > 0); g.fillStyle = '#101014'; g.fillRect(x0, y0, 4, 4); g.fillStyle = out ? '#5a5a66' : '#f05a4e'; g.fillRect(x0 + 1, y0 + 1, 2, 1); g.fillStyle = out ? '#3c3c46' : '#fff'; g.fillRect(x0 + 1, y0 + 2, 2, 1); x0 += 5; });
  return true;
}
function paintBox(side) {
  const el = $('#b-' + side); if (!el) return;
  const rk = hudRing(side), gold = rk ? ' ' + rk : '';
  if (PACK.hud) {
    if (!el.firstElementChild || el.firstElementChild.tagName !== 'CANVAS') { el.className = 'hpb pk ' + side + gold; el.innerHTML = `<canvas width="${(side === 'me' ? 113 : 104) + 2 * HUDM}" height="${(side === 'me' ? 33 : 28) + 2 * HUDM}"></canvas>`; }
    hudDraw(side);
  } else { el.className = 'hpb ' + side + gold; el.innerHTML = boxEl(side); }
  el.hidden = false;
}
function paintSprite(side, cls) {
  const b = teamOf(side)[BT.v[side].i], el = $('#s-' + side);
  if (el) { el.className = 'bs ' + side + ' ' + (cls || ''); el.innerHTML = spr(b.id, { ani: 1, sh: b.sh, back: side === 'me' }); }
}
/* HP-linja glir gradvis mot det nye tallet, og tallet teller med. Lengre fall tar lengre tid. */
function hpTo(side, hp) {
  const B = BT.B, v = BT.v[side], b = teamOf(side)[v.i], from = v.hp, el = $('#b-' + side), pk = !!(PACK.hud && el && el.querySelector('canvas')), bar = pk ? el : $('#b-' + side + ' .hpbar i'), num = $('#b-' + side + ' .hpnum');
  const dur = Math.max(320, Math.min(1400, Math.abs(from - hp) / b.max * 1700)) / spdF(), t0 = performance.now();
  v.hp = hp;
  if (from === hp || !bar) return Promise.resolve();
  return new Promise(res => (function f(t) {
    const k = Math.min(1, (t - t0) / dur), x = from + (hp - from) * k;
    if (BT.B !== B || !bar.isConnected) return res();
    if (pk) { v.sh = k < 1 ? x : null; hudDraw(side); }
    else { bar.style.width = (x / b.max * 100).toFixed(1) + '%'; bar.style.background = hpCol(x / b.max); if (num) num.textContent = Math.round(x) + '/' + b.max; }
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
function fitArena() { const a = $('#arena'); if (a) { a.style.setProperty('--z', (a.clientWidth / 256 * 0.8).toFixed(2)); a.style.setProperty('--u', (a.clientWidth / 256).toFixed(3) + 'px'); } }
window.addEventListener('resize', fitArena);
function battleTag(B) { return B.mode === 'fac' ? `Frontier · Round ${B.round} · ${B.w + 1}/${FACN}` : B.mode === 'lab' ? `Demo · ${B.tr.cn}` : `${B.lap ? 'Lap ' + (B.lap + 1) + ' · ' : ''}${B.n + 1}/${LAPN} · ${B.tr.cn}`; }
const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
function drawBattle() {
  const B = BT.B, tr = B.tr, tier = TIER(tr.kind), scene = PACK.now(PACK.sceneFor(B));
  ov(`<div class="btop k-${tier}"${kst(tr)}><span class="pill tn">${esc(battleTag(B))}</span><span class="btn-n"><b class="${tr.boss ? 'bossn' : ''}">${esc(who(tr))}</b></span></div>
    <div class="bscreen t-${tier}"${kst(tr)}><div class="arena a-${tr.arena} v${tr.v} t-${tier} i${tr.int}${tr.th ? ' th-' + tr.th : ''}${scene ? ' has-scene' : ''}" id="arena" style="--ac:var(--t${tr.ty});--cc:${tr.cc || 'var(--t' + tr.ty + ')'}">
      ${scene ? `<img class="scene" alt="" src="${scene}">` : ''}<div class="abg"></div><canvas class="fxc bgc" id="bgc" width="256" height="192"></canvas><div class="plat pf"></div><div class="plat pm"></div>
      <div class="trn" id="trn">${tsprite(tr.img)}</div>
      <div class="bs foe gone" id="s-foe"></div><div class="bs me gone" id="s-me"></div>
      <canvas class="fxc" id="fxc" width="256" height="192"></canvas><canvas class="fxc" id="axc" width="512" height="384"></canvas><div class="fx" id="fx"></div>
      <div class="hpb foe" id="b-foe" hidden></div><div class="hpb me" id="b-me" hidden></div>
    </div><button type="button" class="btext" id="btext" data-a="btap" aria-live="polite"><span id="btx"></span><i></i></button></div>
    <div id="bmenu" class="bmenu"></div>`, 'battle k-' + tier, `var(--t${tr.ty})`);
  FX.attach($('#fxc')); FX.speed = spdF();
  FX.hooks.shake = ms => { const a = $('#arena'); if (!a) return; a.classList.add('shake'); clearTimeout(BT.shT); BT.shT = setTimeout(() => a.classList.remove('shake'), ms); };
  /* Bakgrunnsshowet følger klassen og temaet. Rammene som beveger seg (gull og de ondes røde puls) tegnes på nytt mange ganger i sekundet. */
  FX.hooks.glitch = ms => { const a = $('#arena'); if (!a) return; a.classList.add('glitch'); setTimeout(() => a.classList.remove('glitch'), ms); };
  FX.show($('#bgc'), calm() ? 0 : tr.int, tr.ty, tr);
  clearInterval(BT.goldT);
  const rk = hudRing('foe');
  if (rk === 'gold' || rk === 'evil') BT.goldT = setInterval(() => { const el = $('#b-foe'); if (!$('#arena') || BT.B !== B) return clearInterval(BT.goldT); if (el && !el.hidden && PACK.hud) hudDraw('foe'); }, 66);
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
    const tt = PACK.title();
    el.innerHTML = `<div class="bsw"><button type="button" class="bback" data-a="bback">RESUME</button><button type="button" class="bback" data-a="bfast">SPEED: ${S.bfast ? 'FAST' : 'NORMAL'}</button><button type="button" class="bback" data-a="bmusic"${S.sound ? '' : ' disabled'}>MUSIC: ${S.music === 0 ? 'OFF' : 'ON'}</button>${tt ? `<p class="sm tn" style="text-align:center">♪ ${esc(tt)}</p>` : ''}<button type="button" class="bback" data-a="bforfeit" style="background:linear-gradient(#b0483c,#7a2a22)">FORFEIT</button></div>`;
    return;
  }
  /* Veska: velg gjenstand, og så hvem den brukes på. Den koster turen din. I demoen er alt gratis, så det kan prøves. */
  const free = B.mode === 'lab', own = k => free ? 1 : S.items[k] || 0;
  if (BT.menu === 'bag') {
    const have = Object.keys(BAG).filter(k => own(k) > 0);
    el.innerHTML = `<p class="sm tn bagh">Bag · ${B.bag} use${B.bag === 1 ? '' : 's'} left this battle${free ? ' · free in the demo' : ''}</p><div class="bmv bagl">${have.length ? have.map(k => `<button type="button" data-a="bitem" data-k="${k}" style="--c:var(--b${BAG[k].rev ? 12 : BAG[k].cure ? 11 : 13})"${B.me.some((_, i) => itemOk(B, k, i)) ? '' : ' disabled'}><b>${esc(SHOP[k].n)}</b><span class="mrow"><span class="mty">${BAG[k].rev ? 'Revive' : BAG[k].cure ? 'Status' : 'Heal'}</span><span class="tn">${free ? '∞' : '× ' + own(k)}</span></span></button>`).join('') : '<p class="sm" style="grid-column:1/-1;text-align:center;padding:10px">Your Bag is empty. Potions and Revives are sold in the Shop.</p>'}</div><button type="button" class="bback" data-a="bback">BACK</button>`;
    return;
  }
  if (BT.menu === 'bagt') {
    const k = BT.item;
    el.innerHTML = `<p class="sm tn bagh">${esc(SHOP[k].n)} · on who?</p><div class="bsw">${B.me.map((b, i) => `<button type="button" data-a="btarget" data-k="${i}"${itemOk(B, k, i) ? '' : ' disabled'}>${spr(b.id, { sh: b.sh, s: '40px' })}<span class="sp"><span class="bn"><span>${esc(b.name)}${b.status ? ' · ' + STAG[b.status] : ''}</span><span class="tn">Lv ${b.lv}</span></span><div class="hpbar"><i style="width:${Math.round(b.hp / b.max * 100)}%;background:${hpCol(b.hp / b.max)}"></i></div><small class="tn">${b.hp <= 0 ? 'Fainted' : b.hp + '/' + b.max}</small></span></button>`).join('')}</div><button type="button" class="bback" data-a="bbag">BACK</button>`;
    return;
  }
  const bag = B.bag != null && B.mode !== 'fac' && !(B.mode === 'lab' && B.rent);
  el.innerHTML = `<div class="bmain${bag ? ' b3' : ''}"><button type="button" class="bm-fight" data-a="bfightm">${BURST}<span>FIGHT</span></button>
    <button type="button" class="bm-b bm-pk" data-a="bswitch"${B.me.filter(b => b.hp > 0).length > 1 && canSwitch(B) ? '' : ' disabled'}>POKÉMON</button>${bag ? `<button type="button" class="bm-b bm-bag" data-a="bbag"${B.bag > 0 ? '' : ' disabled'}>BAG</button>` : ''}<button type="button" class="bm-b bm-pa" data-a="bpause">PAUSE</button></div>`;
}
/* Ballen kastes inn mot plattformen. Bosser bruker finere baller. */
function tossBall(side) {
  const fx = $('#fx'); if (!fx) return Promise.resolve();
  const tier = TIER(BT.B.tr.kind), ms = 520 / spdF(), el = document.createElement('i'), kind = side === 'me' || tier === 'reg' ? 'poke' : tier === 'boss' ? 'great' : 'ultra', pk = PACK.now(`ui/ball_${kind}ball.png`);
  el.className = 'pball ' + side; el.style.setProperty('--d', ms + 'ms'); el.innerHTML = pk ? `<b class="ball pk" style="background-image:url(${pk})"></b>` : ballEl(kind);
  fx.append(el); sfx.thr();
  return new Promise(r => setTimeout(() => { el.remove(); r(); }, ms));
}
/* Krokene ark-animasjonene bruker for å flytte Pokémonene, blinke skjermen og skjule målet. */
function animHooks(side, self) {
  const ar = $('#arena'), k = ar ? ar.clientWidth / 512 : 1, el = { u: $('#s-' + side), t: $('#s-' + (self ? side : opp(side))) };
  const tmp = (e, prop, val, ms) => { if (!e) return; e.style[prop] = val; setTimeout(() => { e.style[prop] = ''; }, ms); };
  return {
    sprite: (who, dx, dy, vis) => { const e = el[who]; if (!e || (self && who === 't')) return; e.style.translate = dx || dy ? `${(dx * k).toFixed(1)}px ${(dy * k).toFixed(1)}px` : ''; e.style.visibility = vis ? '' : 'hidden'; },
    flash: (css, ms) => { const fx = $('#fx'); if (!fx) return; const d = document.createElement('i'); d.className = 'flashov'; d.style.background = css; d.style.animationDuration = Math.max(120, ms) + 'ms'; fx.append(d); setTimeout(() => d.remove(), Math.max(120, ms) + 40); },
    tflash: (css, ms) => tmp(el.t, 'filter', 'brightness(2.4)', Math.max(100, ms)),
    thide: ms => tmp(el.t, 'visibility', 'hidden', Math.max(100, ms))
  };
}
/* Felles animasjoner (status, stat opp/ned, helbredelse) fra pakken. Gir false hvis pakken ikke har den. */
async function common(k, side) {
  const n = k && PACK.common(k), cv = $('#axc'); if (!n || !cv) return false;
  const p = fxPos(side), q = { x: p.x * 2, y: p.y * 2 };
  return PACK.play(n, cv, q, q, false, spdF(), null);
}
const wob = (side, ms) => { const sp = $('#s-' + side); if (sp) { sp.classList.add('wob'); setTimeout(() => sp.classList.remove('wob'), ms / spdF()); } };
/* Spiller av én hendelse fra motoren. */
async function playOne(B, e) {
  const side = e.side, sp = side ? $('#s-' + side) : null, v = side ? BT.v[side] : null;
  if (e.t === 'msg') return say(e.s);
  if (e.t === 'anim') {
    const m = e.mi >= 0 ? MOVES[e.mi] : STRUGGLE, a = fxPos(side), b = e.self ? a : fxPos(opp(side)), lunge = m[4] === 1 && FX.contact(m);
    BT.ty = m[1];
    const an = PACK.animFor(m), snd = PACK.sfx(m[0]);
    if (an && await PACK.play(an, $('#axc'), { x: a.x * 2, y: a.y * 2 }, { x: b.x * 2, y: b.y * 2 }, side === 'foe', spdF(), animHooks(side, e.self))) return;
    if (lunge) { if (!snd) BSFX.swing(); sp.classList.add('lunge'); await bwait(130); } else if (!snd) { if (m[4] === 2) BSFX.beam(); else if (m[4] === 0) BSFX.aura(); else BSFX.swing(); }
    await FX.move(m, a, b, { roll: e.roll, self: BOOM.has(m[0]), wobble: ms => wob(opp(side), ms) });
    sp.classList.remove('lunge');
  }
  else if (e.t === 'hit') {
    if (!e.quiet) {
      if (!PACK.sfx(e.e > 1 ? 'Hit Super Effective' : e.e < 1 ? 'Hit Weak Not Very Effective' : 'Hit Normal Damage', 1)) { if (e.e > 1) BSFX.hitS(); else if (e.e < 1) BSFX.hitW(); else BSFX.hit(); }
      FX.hit(fxPos(side), BT.ty, e.e, e.crit); buzz(e.e > 1 ? [40, 30, 60] : 25);
      sp.classList.add('hurt'); if (e.e > 1 || e.crit) FX.hooks.shake(280 + 25 * B.tr.int); else if (B.tr.int >= 6 && e.e === 1) FX.hooks.shake(140);
    }
    if (e.sub) await bwait(320); else await Promise.all([hpTo(side, e.hp), bwait(e.quiet ? 250 : 440)]);
    sp.classList.remove('hurt');
  }
  else if (e.t === 'heal') { if (!PACK.sfx('In-Battle Heal HP Restore')) BSFX.heal(); if (!e.q && !(await common('HealthUp', side))) FX.heal(fxPos(side)); await Promise.all([hpTo(side, e.hp), bwait(400)]); }
  else if (e.t === 'status') {
    v.st = e.st; paintBox(side);
    if (e.fx) { if (!PACK.sfx({ brn: 'Status Burned', psn: 'Status Poisoned', par: 'Status Paralyzed', frz: 'Status Frozen' }[e.fx])) BSFX.ail(); if (!(await common({ slp: 'Sleep', psn: 'Poison', brn: 'Burn', par: 'Paralysis', frz: 'Frozen', conf: 'Confusion', seed: 'LeechSeed' }[e.fx], side))) { FX.status(e.fx, fxPos(side)); await bwait(520); } }
  }
  else if (e.t === 'stat') { if (!PACK.sfx(e.up ? 'Stat Rise Up' : 'Stat Fall')) (e.up ? BSFX.up : BSFX.down)(); sp.classList.add(e.up ? 'sup' : 'sdn'); if (!(await common(e.up ? 'StatUp' : 'StatDown', side))) { FX.stat(fxPos(side), e.up); await bwait(520); } sp.classList.remove('sup', 'sdn'); }
  else if (e.t === 'faint') { if (!PACK.sfx('In-Battle Faint No Health')) BSFX.faint(); cry(teamOf(side)[v.i].id, 0, 0.3); sp.classList.remove('ace'); sp.classList.add('faint'); await bwait(850); paintBox(side); $('#b-' + side).hidden = true; }
  else if (e.t === 'recall') { if (e.txt) await typeOut(e.txt); if (!PACK.sfx('In-Battle Recall Switch Pokeball')) BSFX.recall(); sp.classList.remove('ace', 'subd', 'away'); sp.classList.add('recall'); $('#b-' + side).hidden = true; await bwait(420); sp.classList.add('gone'); }
  else if (e.t === 'send') {
    const team = teamOf(side), b = team[e.i], ace = side === 'foe' && B.tr.boss && team.length > 1 && e.i === team.length - 1, big = ace && B.tr.int >= 4;
    BT.v[side] = { i: e.i, hp: e.hp, st: e.st };
    if (big) { music(''); await say(`${B.tr.n} is down to the last Pokémon…`); }
    if (BT.B !== B || !sp.isConnected) return;
    await typeOut(e.txt);
    sp.className = 'bs ' + side + ' gone'; $('#b-' + side).hidden = true;
    await tossBall(side);
    if (big) { BSFX.ace(); buzz([80, 40, 80, 40, 240]); await FX.ace(side === 'foe' ? { x: 189, y: 74 } : { x: 62, y: 150 }, B.tr.ty, B.tr); if (!PACK.playing()) music(musicKey(B)); }
    paintSprite(side, 'in' + (ace ? ' ace' : '')); BSFX.ball(); FX.open(side === 'foe' ? { x: 189, y: 72 } : { x: 62, y: 150 }, big ? '#ffe9a8' : '');
    cry(b.id, 200, big ? 0.5 : 0.35); if (big) FX.hooks.shake(500);
    await bwait(380); paintBox(side);
    if (B.mode !== 'lab') S.seen[b.id] = 1;
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
/* Boss-introen, som i Black og White: fargebånd som feier inn fra hver side med treneren og din første Pokémon, lyn, og «VS» som smeller inn.
   De sjeldne bossene i ligaen har hvert sitt klipp først, i hver sin stil:
   - de onde lederne (klasse 7): mørkt og rødt, hjerteslag, forstyrrelser i bildet, røde lyn og en silhuett som vokser mot deg
   - mesterne (klasse 8): rolig og staselig, i mesterens egen farge og med sitt eget tema i bakgrunnen (snø, bobler, flammer, krystaller …)
   - de aller største (klasse 9): gull, lyn og stjerner
   Bildene (bånd, VS, lyn, stjerner) kommer fra ressurspakken. Uten den tegnes det samme med farger og tekst. */
const BARC = ['grey', 'brown', 'cyan', 'purple', 'brown', 'brown', 'lime', 'purple', 'steel', 'orange', 'blue', 'green', 'yellow', 'purple', 'cyan', 'blue', 'grey', 'purple'];
async function bossIntro(B) {
  const tr = B.tr, lead = B.me[0], tier = TIER(tr.kind), V = PACK.vs, clip = tr.ultra && B.mode !== 'fac', evil = tr.th === 'evil', sp = S.bfast ? 0.6 : 1, T = ms => new Promise(r => setTimeout(r, ms * sp));
  const im = k => V && V[k] ? `url(${V[k]})` : 'none', plasma = /Plasma/.test(tr.title) || tr.n === 'Ghetsis';
  ov(`<div class="bwi bwi-${tier} i${tr.int}${V ? ' pk' : ''}${tr.th ? ' th-' + tr.th : ''}" id="bwi" style="--ac:var(--t${tr.ty});--cc:${tr.cc || (evil ? '#e02020' : 'var(--t' + tr.ty + ')')};--bar:${im(evil ? 'bar_me' : 'bar_' + BARC[tr.ty])};--barme:${im(evil ? 'bar_steel' : 'bar_me')};--vsi:${im(tr.int >= 6 && !evil ? 'vs2' : 'vs')};--bolt:${im('bolt')};--vbolt:${im('vbolt')};--stars:${im(evil ? 'cloud' : 'stars')};--orb:${im('flash')};--em:${plasma ? im('plasma') : 'none'}">
    <div class="bwi-s"><div class="bwi-bg"></div><canvas class="bwi-cv" id="bwicv" width="256" height="192"></canvas><div class="bwi-em"></div>
      ${clip ? `<div class="bwi-pre"><span>${esc(RARE[tr.kind])}</span><b>${esc(evil ? tr.title : tr.cn)}</b></div><div class="bwi-sil">${tsprite(tr.img, 'big')}<i class="vb a"></i><i class="vb b"></i><i class="orb"></i><div class="nm"><span>${esc(tr.title)}</span><b>${esc(tr.n)}</b></div></div>` : ''}
      <div class="bwi-bar foe"><div class="bwi-bb"></div>${tsprite(tr.img, 'big')}<div class="bwi-n"><span>${esc(tr.title)}</span><b>${esc(tr.n)}</b></div></div>
      <div class="bwi-bar me"><div class="bwi-bb"></div>${spr(lead.id, { ani: 1, sh: lead.sh, back: 1 })}<div class="bwi-n"><span>${esc(battleTag(B))}</span><b>You</b></div></div>
      <div class="bwi-bolt"></div><div class="bwi-vs"><b>VS</b></div><div class="bwi-cls">${esc(tr.cn)}</div><div class="bwi-fl"></div>
    </div></div>`, 'battle vsov');
  const root = $('#bwi'), st = root.querySelector('.bwi-s'), on = c => { if (root.isConnected) root.classList.add(c); }, gone = () => BT.B !== B || !root.isConnected;
  st.style.setProperty('--u', (st.clientWidth / 256).toFixed(3) + 'px');
  /* Vanlig kampmusikk først hvis treneren ikke har egen låt, og så slår den over til bossmusikken når de viser seg. */
  if (!PACK.trackFor(B)) music('battle');
  sfx.appear(); buzz([40, 40, 40]); on('s0');
  await T(440); if (gone()) return;
  if (clip) {
    /* Temaet til bossen spiller i bakgrunnen av klippet (aske og rød puls, snø, bobler, gull …). */
    if (!calm()) { FX.hooks.glitch = ms => { st.classList.add('glitch'); setTimeout(() => st.classList.remove('glitch'), ms); }; FX.show($('#bwicv'), tr.int, tr.ty, tr); }
    on('c1'); if (evil) { BSFX.beat(); setTimeout(BSFX.beat, 700 * sp); buzz([90, 150, 90]); } else BSFX.vs();
    await T(evil ? 1900 : 1500); if (gone()) return;
    on('c2'); battleMusic(B); if (evil) { BSFX.dread(); BSFX.beat(); setTimeout(BSFX.beat, 800 * sp); buzz([90, 150, 90, 400, 90, 150, 90]); } else buzz([30, 30, 30, 30, 120]);
    await T(evil ? 2000 : tr.gold ? 1700 : 1500); if (gone()) return;
    on('c3'); BSFX.ace(); buzz([80, 40, 240]); await T(1300); if (gone()) return;
    on('c4'); await T(240); if (gone()) return;
  }
  on('s1'); await T(330); on('s2'); await T(380); if (gone()) return;
  on('s3'); if (!clip) battleMusic(B); BSFX.vs(); buzz([60, 40, 60, 40, 200]);
  await T(520); on('s4');
  await T(clip ? 1700 : tier === 'top' ? 1400 : 1150); if (gone()) return;
  on('s5'); await T(300);
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
  const prep = PACK.prep(B).catch(() => {});
  if (B.tr.boss) { await PACK.introPrep(B); if (BT.B !== B) return; await bossIntro(B); } else { await wipeIntro(); battleMusic(B); }
  await prep;
  if (BT.B !== B) return;
  drawBattle(); drawMenu();
  await bwait(350);
  await say(`${who(B.tr)} wants to battle!`);
  if (BT.B !== B || !$('#arena')) return;
  $('#trn').classList.add('out');
  await playOne(B, { t: 'send', side: 'foe', i: 0, hp: B.foe[0].hp, st: '', txt: `${B.tr.n} sent out ${B.foe[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  await playOne(B, { t: 'send', side: 'me', i: 0, hp: B.me[0].hp, st: '', txt: `Go! ${B.me[0].name}!` });
  if (BT.B !== B || !$('#arena')) return;
  BT.busy = false; setText(`What will ${B.me[0].name} do?`); drawMenu();
}
function endBattle() {
  const B = BT.B; stopMusic(); BT.busy = false;
  clearInterval(BT.goldT); FX.show(null);
  const res = BT.res = B.mode === 'fac' ? finishFactory(B) : B.mode === 'lab' ? finishLab(B) : finishLeague(B);
  if (res.win) BSFX.win(); else BSFX.lose();
  BT.tp = null; BT.fs = null;
  overview();
}

/* ---------- Etter kampen ---------- */
const encLine = res => res.encs.length ? `<div class="row" style="justify-content:space-between"><span>Encounters</span><b>${res.encs.length} waiting in the grass${res.encs.some(e => e.t >= 4) ? ' · legendary' : res.encs.some(e => e.t >= 3) ? ' · epic' : ''}</b></div>` : '';
const monCard = (x, a, k, on) => `<button type="button" data-a="${a}" data-k="${k}" aria-pressed="${!!on}" style="--tc:var(--t${D(x.id)[1]})">${spr(x.id, { ani: 1 })}<b>${esc(D(x.id)[0])}</b><span class="sm tn">Lv ${x.lv}${x.iv ? ' · ' + judge(x).t : ''}</span><span class="row" style="gap:4px;justify-content:center;flex-wrap:wrap">${types(x.id)}</span>${x.mv ? `<span class="mvl">${x.mv.map(i => esc(MOVES[i][0])).join(' · ')}</span>` : ''}</button>`;
function overview() {
  const B = BT.B, res = BT.res, tr = B.tr, fac = res.mode === 'fac', lab = res.mode === 'lab', first = !res.shown, nm = esc(who(tr));
  /* Laget: XP-linja fylles opp etter kampen, og nye nivåer og angrep vises her. */
  const team = fac || lab ? '' : `<div class="card stack">${B.me.map(b => {
    const m = b.src, u = res.ups.find(x => x.u === m.u), l = first && u ? u.l0 : m.lv, x = first && u ? u.x0 : m.xp, f = Math.max(0, Math.min(1, (x - xpAt(l)) / (xpAt(l + 1) - xpAt(l))));
    return `<div class="hofr${u && u.l1 > u.l0 && !first ? ' lvup' : ''}" data-row="${m.u}">${spr(b.id, { sh: b.sh, s: '48px' })}<div class="sp"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><b class="sm tn lvt">${u && u.l1 > u.l0 && !first ? `Lv ${u.l0} → ${u.l1}` : 'Lv ' + l}</b></div>
      <div class="xpbar" style="margin-top:6px;height:6px"><i style="width:${Math.round(f * 100)}%"></i></div>
      <div class="sm tn" style="margin-top:4px">${u ? '+' + nb(u.xp) + ' XP' : 'No XP this time'}${b.hp <= 0 ? ' · fainted' : ''}${u && (u.learned || []).length ? ' · learned ' + esc(u.learned.join(', ')) : ''}</div>
      ${(m.nm || []).length ? `<button type="button" class="newmv" data-a="blearn" data-u="${m.u}" style="margin-top:6px;width:100%;text-align:left"><span class="bang">!</span><span class="sm" style="color:var(--ink)">Wants to learn <b>${esc(MOVES[m.nm[0]][0])}</b>${m.nm.length > 1 ? ' +' + (m.nm.length - 1) : ''}</span></button>` : ''}</div></div>`; }).join('')}</div>`;
  const rew = res.win && !lab ? `<div class="card stack"><div class="row" style="justify-content:space-between"><b>Rewards${tr.boss ? ' · ' + esc(tr.cn) : ''}</b><span class="pill tn">×${B.sm} study bonus${B.boost.mode === (fac ? 'factory' : 'league') ? ' · today\'s bonus' : ''}</span></div>
      <div class="row" style="justify-content:space-between"><span>Coins</span>${coinEl(res.coins)}</div>
      ${res.items.map(x => `<div class="row" style="justify-content:space-between"><span>Item</span><b>${esc(x)}</b></div>`).join('')}${encLine(res)}
      ${res.got ? `<div class="row" style="justify-content:space-between"><span>Traded for</span><b>${esc(res.got)}</b></div>` : ''}${res.note ? `<p class="sm">${esc(res.note)}</p>` : ''}${(res.perks || []).map(x => `<p class="sm" style="color:var(--gold)">${esc(x)}</p>`).join('')}</div>` : '';
  /* Byttetilbud (ligaen) og bytte av leie-Pokémon (Frontier). */
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
  const next = lab ? 'Demo battle: no XP or rewards, and your League and Frontier progress are untouched.'
    : fac ? (res.win ? (res.roundDone ? `Round ${res.round} cleared. Round ${res.round + 1} has stronger rentals and opponents.` : `Next: battle ${R.w + 1} of ${FACN}${R.w === FACN - 1 ? ' · the boss' : ''}`) : `The run ends at a streak of ${res.streak}.`)
    : res.win ? (res.lapDone ? `Lap cleared. Lap ${L.lap + 1} begins, with stronger trainers, bigger teams and better rewards.` : 'Next: ' + esc(leagueTag()) + (L.n % 2 === 1 ? ' · a boss' : '')) : `${res.gone ? esc(tr.n) + ' moves on: rare bosses give you one chance.' + (res.lapDone ? ` Lap ${L.lap + 1} begins without the prize.` : '') : esc(tr.n) + ' waits for you.'} ${res.left ? 'You can lose once more today.' : 'The League opens again after your next day of focus.'}`;
  const open = lab ? true : fac ? facOpen() && !!R : ladderOpen();
  ov(`<div class="hof"><div class="hof-h"><span>${res.win ? 'VICTORY' : 'DEFEAT'}</span><span class="tn">${esc(battleTag(B))}</span></div>
      <div class="hof-stage">${B.me.map((b, i) => `<span style="--i:${i};--n:${B.me.length}" class="${b.hp <= 0 ? 'ko' : ''}">${spr(b.id, { ani: 1, sh: b.sh })}</span>`).join('')}</div>
      <p class="hof-t">${res.win ? `You beat ${nm}.` : lab ? `${nm} won this time.` : fac ? `${nm} stopped your run.` : `${nm} won this time. You keep your place and the XP.`}</p></div>
    ${team}${rew}${extra}
    <div class="card"><span class="sm" style="color:var(--ink)">${next}</span></div>
    <div class="acts">${lab ? '<button type="button" class="btn gold" data-a="lab">Another demo</button><button type="button" class="btn nf" data-a="home">Done</button>' : (res.win || res.left) && open ? `<button type="button" class="btn gold" data-a="${fac ? 'fenter' : 'bpre'}">${!res.win ? (res.gone ? 'Next battle' : 'Rematch') : fac && res.roundDone ? 'Pick new rentals' : 'Next battle'}</button><button type="button" class="btn nf" data-a="home">Done</button>` : '<button type="button" class="btn pri" data-a="home">Done</button>'}</div>`, 'tint ovtop', res.win ? 'var(--gold)' : 'var(--red)');
  if (first && !fac && !lab) setTimeout(animXp, 500);
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

/* ---------- Battle Frontier ---------- */
function facScreen() {
  const R = S.fac.run; if (!R) return;
  if (R.offer) {
    const sel = BT.fsel;
    return ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Battle Frontier · Round ${R.round}</span></div>
      <div><h1 class="big">Pick 4 of 7.</h1><p class="mut" style="margin-top:6px">Rental Pokémon, all at Lv ${FACLV} like everyone you meet. The first one you pick leads. A round is six trainers and then a boss, and you can swap in one Pokémon from each trainer you beat.</p></div>
      <div class="rent">${R.offer.map((m, i) => monCard(m, 'fsel', i, sel.includes(i)).replace('<b>', sel.includes(i) ? `<span class="ord">${sel.indexOf(i) + 1}</span><b>` : '<b>')).join('')}</div>
      <div class="acts"><button type="button" class="btn gold" data-a="fpick"${sel.length === 4 ? '' : ' disabled'}>${sel.length === 4 ? 'Take these four' : `Pick ${4 - sel.length} more`}</button></div>`, 'tint', 'var(--t8)');
  }
  const f = facFoe(), tr = facInfo(f), tier = TIER(tr.kind);
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Round ${R.round} · battle ${R.w + 1} of ${FACN}</span></div>
    <div class="card k-${tier}"${kst(tr)}><div class="pre-foe">${tsprite(tr.img)}<div class="sp"><div class="sm">${f.boss ? (tr.ultra ? `${esc(RARE[tr.kind][0].toUpperCase() + RARE[tr.kind].slice(1))} · ${esc(tr.cn)} · extra rewards` : `Boss · ${esc(tr.cn)} · last battle of the round`) : 'Battle Frontier'}</div><b class="${f.boss ? 'bossn' : ''}" style="font-size:19px">${esc(who(tr))}</b><div class="sm tn" style="margin-top:4px">4 Pokémon at Lv ${FACLV} · favours ${TYN[f.hint]} types</div></div></div></div>
    <div><div class="lab">Your rentals · tap the one that leads</div><div class="lineup">${R.team.map((m, i) => `<button type="button" data-a="flead" data-k="${i}" class="${i ? '' : 'lead'}">${spr(m.id)}<span class="sp"><b>${esc(D(m.id)[0])}</b><br><span class="sm tn">${m.mv.map(x => esc(MOVES[x][0])).join(', ')}</span></span>${i ? '' : '<span class="pill">Leads</span>'}</button>`).join('')}</div></div>
    <div class="acts"><button type="button" class="btn gold" data-a="fgo">Start battle</button></div>`, 'tint', 'var(--t8)');
}

/* ---------- Demo ---------- */
/* Prøv en kamp mot hvilken som helst av de ni klassene, når som helst. Gir ingenting og rører ikke framgangen. */
function labScreen() {
  const rent = !!BT.labRent;
  ov(`<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="home">Back</button><span class="pill tn">Demo</span></div>
    <div><h1 class="big">Try a battle.</h1><p class="mut" style="margin-top:6px">Pick a class and fight right away. Demo battles give no XP or rewards and do not touch your League or Frontier progress.</p></div>
    <div class="row labm"><button type="button" class="btn sp${rent ? ' nf' : ''}" data-a="labmode" data-k="0" aria-pressed="${!rent}">My team</button><button type="button" class="btn sp${rent ? '' : ' nf'}" data-a="labmode" data-k="1" aria-pressed="${rent}">Rentals · Lv ${FACLV}</button></div>
    <div class="lablist">${ORDER.map(k => { const c = TCL[k]; return `<button type="button" data-a="labgo" data-k="${k}" class="k-${TIER(k)}"><span class="cno">${c.i}</span><span class="sp"><b>${c.n}</b><br><span class="sm">${LABD[k]}</span></span>${ULTRA.has(k) ? `<span class="pill">${RARE[k].replace(' boss', '')}</span>` : ''}</button>`; }).join('')}</div>
    <p class="sm tn">${PACK.ok ? `Your pack is loaded: ${Object.keys(PACK.man.scenes || {}).length} arenas and ${(PACK.man.music || []).length} tracks.` : GH && GH.ok ? `Your pack is not loaded${PACK.err ? ' (error ' + esc(PACK.err) + ')' : ' yet'}. Open Profile, then Sync, to look for it again.` : 'No pack on this device: connect Sync in Profile to get your own arenas, HP boxes, animations and music.'}</p>`, 'tint', 'var(--gold)');
}

/* Handlingene (kobles inn i klikk-håndteringen i ui.js). */
const BA = {
  lab: () => { BT.B = null; BT.busy = false; stopMusic(); labScreen(); },
  bbag: () => { if (BT.busy || !BT.B || BT.B.over) return; BT.menu = 'bag'; drawMenu(); },
  bitem: el => { BT.item = el.dataset.k; BT.menu = 'bagt'; drawMenu(); },
  btarget: el => { if (BT.busy) return; const B = BT.B, k = BT.item, i = +el.dataset.k; if (!(B.bag > 0) || !itemOk(B, k, i)) return; if (B.mode !== 'lab') { if (!(S.items[k] > 0)) return; S.items[k]--; save(true); } BT.menu = 'main'; playEv(runTurn(B, { t: 'item', k, i })); },
  labmode: el => { BT.labRent = el.dataset.k === '1'; labScreen(); },
  labgo: el => { if (!BT.labRent && !S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team, or pick Rentals.'); PACK.unlock(); sfx.start(); BT.busy = false; startBattle(labBattle(el.dataset.k, !!BT.labRent)); },
  bdone: () => { S.lad.day = dayKey(); save(); sfx.ok(); render(); toast('Battles are open. Fight now or later tonight.'); },
  bpre: () => { if (!ladderOpen()) { closeOv(); return render(); } BT.B = null; BT.busy = false; preBattle(); },
  blead: el => { BT.lead = +el.dataset.u; preBattle(); },
  bteam: () => { closeOv(); U.tab = 'lag'; U.lag = 'lag'; render(); },
  bgo: () => { if (!ladderOpen()) { closeOv(); return render(); } if (!S.party.map(monBy).filter(Boolean).length) return toast('You need a Pokémon in your team.'); PACK.unlock(); sfx.start(); BT.busy = false; startBattle(newBattle(BT.lead)); },
  btap: () => { if (BT.tap) BT.tap(); },
  bfightm: () => { BT.menu = 'moves'; drawMenu(); },
  bswitch: () => { BT.menu = 'team'; drawMenu(); },
  bpause: () => { BT.menu = 'pause'; drawMenu(); },
  bback: () => { BT.menu = 'main'; drawMenu(); },
  bfast: () => { S.bfast = S.bfast ? 0 : 1; save(true); FX.speed = spdF(); drawMenu(); },
  bmusic: () => { S.music = S.music === 0 ? 1 : 0; save(true); if (S.music === 0) stopMusic(); else battleMusic(BT.B); drawMenu(); },
  bmove: el => { if (BT.busy || BT.B.over) return; BT.menu = 'main'; playEv(runTurn(BT.B, { t: 'move', k: +el.dataset.k })); },
  bsw: el => { if (BT.busy) return; const B = BT.B, i = +el.dataset.k; BT.menu = 'main'; playEv(B.need ? sendIn(B, i) : runTurn(B, { t: 'switch', i })); },
  bforfeit: el => { if (BT.busy) return; if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'TAP AGAIN TO GIVE UP'; return; } BT.B.over = 'loss'; endBattle(); },
  packre: async () => { toast('Looking for your pack…'); const ok = await PACK.init(true); toast(ok ? `Pack found: ${Object.keys(PACK.man.scenes || {}).length} arenas, ${(PACK.man.music || []).length} tracks.` : 'No pack found in your sync repo.'); },
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
  fgo: () => { if (!facOpen() || !S.fac.run || !S.fac.run.team) return; PACK.unlock(); sfx.start(); BT.busy = false; startBattle(facBattle()); },
  fswp: el => { BT.fs = +el.dataset.k; overview(); },
  fswb: () => { BT.fs = null; overview(); },
  fswm: el => { const res = BT.res, x = res.swap[BT.fs]; if (!x) return; const old = S.fac.run.team[+el.dataset.k]; facSwap(+el.dataset.k, x); res.swap = null; BT.fs = null; sfx.ok(); toast(`${D(x.id)[0]} joined your rentals in place of ${D(old.id)[0]}.`); overview(); }
};
