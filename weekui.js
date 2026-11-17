'use strict';
/* Fokusdex – ekspedisjonen på skjermen (steg 1d): billettene på forsiden, kortet for dagens modus, kartet, rommene og oppsummeringen.
   Reglene ligger i week.js. Kartet er en mørk sone (.ov.wkov), som kampene: det er natt på øya uansett hva appen ellers er stilt til.
   Portalen, øya som hjemskjerm, ukas intro, musikken, resultatkortet og arket på studiedag 10 står nederst (steg 1d.6–1d.8). */

/* Tegnene for rommene (24 × 24). f = fylt. Bossen viser bildet sitt i stedet. */
const WKIC = {
  tr: [0, 'M5 19L17 7m0 0h-4m4 0v4M19 19L7 7m0 0h4M7 7v4'], ac: [1, 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z'], gt: [0, 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4'],
  el: [0, 'M4 18h16l1-10-5 4-4-7-4 7-5-4zM4 21h16'], bs: [1, 'M4 18h16l1-10-5 4-4-7-4 7-5-4z'], bg: [1, 'M4 18h16l1-10-5 4-4-7-4 7-5-4z'], sp: [0, 'M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z'],
  tz: [0, 'M4 11h16v8H4zM4 11c0-3 2-5 5-5h6c3 0 5 2 5 5M11 10h2v4h-2z'], en: [0, 'M4 20c1-5 2-8 3-10 0 4 1 7 2 10M10 20c0-7 1-11 2-14 1 3 2 7 2 14M15 20c1-3 2-6 2-10 1 2 2 5 3 10'],
  sr: [0, 'M12 3l8 9-8 9-8-9zM12 8v8M8 12h8'], dr: [0, 'M7 21V5a2 2 0 012-2h6a2 2 0 012 2v16M5 21h14M14.5 12.5h.01'], dk: [0, 'M9 12a3 3 0 106 0 3 3 0 10-6 0'], lk: [0, 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z'], ok: [0, 'M5 12.5l4.5 4.5L19 7.5']
};
const wkGl = k => k === 'ev' ? '<b class="wkq">?</b>' : `<svg viewBox="0 0 24 24" class="${(WKIC[k] || WKIC.tr)[0] ? 'f' : ''}" aria-hidden="true"><path d="${(WKIC[k] || WKIC.tr)[1]}"/></svg>`;
/* Det hvert rom heter, og én linje om hva det er (norsk i LNO nederst). */
const WKNN = { tr: 'A trainer', ac: 'An ace', gt: 'The gatekeeper', el: 'One of the greats', bs: 'The Frontier Brain', bg: 'The Frontier Brain · gold', ev: 'Something is going on', sp: 'A spring', tz: 'Treasure', en: 'A rare encounter', sr: 'The sealed room' };
const WKND = {
  tr: 'A skilled trainer with a team around one type.', ac: 'Tougher than the rest, with a better prize for beating them.', gt: 'The outer halls end here. Beat the gatekeeper to go on.',
  el: 'A Gym Leader, one of the Elite Four, a rival or an admin. Who it is shows in the intro.', bs: 'Win, and the Silver Symbol is yours.', bg: 'The same Brain with everything they have. Win, and the Gold Symbol is yours.',
  ev: 'You only find out what when you step in. There is always a choice, and none of them costs you the expedition.', sp: 'Your whole team is healed: HP, PP and those that have fainted.',
  tz: 'A chest with coins and items. Yours as soon as you open it.', en: 'Something rare moves in here. It goes to your grass, to meet after the expedition.', sr: 'Nobody knows what is in here. Only five tickets open it.'
};
/* Navnet på et rom og linja om det: ukestypen kan ha sine egne (WKT.nn, WKT.nd). */
const wkNn = (ty, k) => ((WKT[ty] || {}).nn || {})[k] || WKNN[k], wkNd = (ty, k) => ((WKT[ty] || {}).nd || {})[k] || WKND[k];
/* Billettene som lys: n tent av WKMAX, og en liten stjerne for hver helgedag med studier i eksamensperioden. */
const wkLights = (n, st, cls) => `<span class="wkl${cls ? ' ' + cls : ''}" role="img" aria-label="${n} of ${WKMAX} tickets${st ? ', ' + st + (st === 1 ? ' weekend star' : ' weekend stars') : ''}">${Array.from({ length: WKMAX }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}${st ? `<em>${'★'.repeat(st)}</em>` : ''}</span>`;
const wkEmb = c => `<span class="wkemb" style="--wc:${c}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 21V10l8-6 8 6v11M9 21v-6a3 3 0 016 0v6"/></svg></span>`;
/* Bildene av trenerne i pakken hentes først når de trengs: again tegner dem inn når de er kommet. */
const wkPort = (imgs, again) => { if (typeof PACK !== 'undefined' && PACK.ok) PACK.portraits(imgs.map(x => x.split('|')[0])).then(n => { if (n) again(); }).catch(() => {}); };
const wkDayName = k => new Date(k + 'T12:00').toLocaleDateString('en-US', { weekday: 'long' });

/* ---------- Forsiden ----------
   wkStrip: én rolig rad med ukas type og billettene, hele uka (også før «Done for today»: det er den som sier at studiedagen teller).
   wkCard: kortet når ekspedisjonen er dagens modus. */
function wkStrip() {
  const N = typeof wkNow === 'function' ? wkNow() : null; if (!N) return '';
  const T = WKT[N.ty];
  const line = N.run ? tl('Your expedition waits. It can go on until Saturday is over.')
    : N.played ? tl('Done for this week. Next week: {n}.', { n: WKT[N.next].n })
    : N.offer ? tl('Open now: choose it as the mode for the day.')
    : N.late ? tl('Last day: open the battles today to set out.')
    : N.today ? (N.tix ? tl('Today, after Done for today.') : tl('Today: {min} minutes of focus gives your ticket.', { min: OPENMIN }))
    : N.tix ? (N.left ? tl('Friday. Every study day until then lights one more.') : tl('Friday. All five are lit.'))
    : tl('Friday. Every study day of {min} minutes lights a ticket.', { min: OPENMIN });
  const strip = N.on ? '' : `<button type="button" class="card wks${N.offer ? ' on' : ''}" data-a="wkinfo" style="--wc:${T.c}" aria-label="Expedition: ${esc(T.n)}. ${N.tix} of ${WKMAX} tickets. ${esc(line)}">${wkEmb(T.c)}<span class="sp"><span class="wk-k">Expedition</span><b>${esc(T.n)}</b><span class="sm">${line}</span></span>${N.played ? '' : wkLights(N.tix, N.stars)}</button>`;
  return strip + wkVaultRow() + wkSnagRow();
}
/* Hvelvet som venter (kistene er ikke åpnet), og Shadow-fangstene som renses: egne rolige rader under billettene. */
function wkVaultRow() {
  const n = wkVaultLeft(), W = S.wk; if (!n || !W || W.run) return '';
  const v = W.vault;
  return `<button type="button" class="card wks on" data-a="wkend" style="--wc:${WKT[v.ty].c}"><span class="wkch m${v.m} mini" aria-hidden="true"><span class="wkcb"></span></span><span class="sp"><span class="wk-k">Expedition</span><b>${tl('Your vault is waiting')}</b><span class="sm">${n === 1 ? tl('One chest to open.') : tl('{n} chests to open.', { n })}</span></span></button>`;
}
const wkHearts = left => `<span class="wkhg" role="img" aria-label="${WKPURE - left} of ${WKPURE} study days">${Array.from({ length: WKPURE }, (_, i) => `<i${i < WKPURE - left ? ' class="on"' : ''}></i>`).join('')}</span>`;
function wkSnagRow() {
  const W = S.wk; if (!W) return '';
  const pun = (W.pun || []).map(monBy).filter(Boolean), sn = W.snag || [];
  return (pun.length ? `<button type="button" class="card wks on" data-a="wkpun" style="--wc:#c58bff">${spr(pun[0].id, { sh: pun[0].sh, s: '38px' })}<span class="sp"><span class="wk-k">Shadow Snag</span><b>${tl('The shadow has lifted')}</b><span class="sm">${pun.length === 1 ? tl('{n} is yours now. Tap to meet it.', { n: mName(pun[0]) }) : tl('{n} Pokémon are yours now. Tap to meet them.', { n: pun.length })}</span></span></button>` : '')
    + (sn.length ? `<button type="button" class="card wks" data-a="wksnags" style="--wc:#c58bff"><span class="wksh">${spr(sn[0].id, { sh: sn[0].sh, s: '36px' })}</span><span class="sp"><span class="wk-k">Shadow Snag</span><b>${sn.length === 1 ? 'Shadow ' + esc(D(sn[0].id)[0]) : sn.length + ' Shadow Pokémon'}</b><span class="sm">${tl('Every study day lifts the shadow a little.')}</span></span>${wkHearts(Math.min(...sn.map(wkPureLeft)))}</button>` : '');
}
function wkCard() {
  const V = wkView(), W = wkSt(), L = W.last, shut = dayShut();
  const head = (c, n, sub, right) => `<div class="mode-h">${wkEmb(c)}<span class="sp"><b>Expedition</b><span class="sm tn">${sub}</span></span><button type="button" class="hq" data-a="wkinfo" aria-label="About the Expedition">i</button></div>${right ? `<div class="mode-t">${right}</div>` : ''}`;
  if (!V || (!V.R && shut)) {
    const T = WKT[L ? L.ty : wkType(wkIdx(S.lad.day || dayKey()))];
    return `<div class="card mode wkc" id="mode-week" style="--wc:${T.c}">${head(T.c, T.n, esc(T.n))}<p class="sm">${shut && !L ? tl('No expedition this time. Your tickets stay with you.') : L ? esc(wkLastLine(L)) : ''}</p>${L && !shut ? '<button type="button" class="btn wide" data-a="wkend">See how it went</button>' : ''}</div>`;
  }
  const R = V.R, T = V.T, z = R ? Math.min(WKZN.length - 1, R.ms + 1) : 1;
  return `<div class="card mode wkc" id="mode-week" style="--wc:${T.c}">${head(T.c, T.n, `${esc(T.n)}${R ? ` · ${esc(wkZn(V.ty, z))} · ${R.got.wins} ${R.got.wins === 1 ? 'win' : 'wins'}` : ''}`, `<span class="pill tn au">Coins ×${smFor('week')}</span>${wkLights(V.t, V.stars)}`)}
    ${R ? wkTeamEl(R) : `<p class="sm">${tl('A map with paths you choose between. No healing between the battles, so pick your way with care.')}</p>`}
    <button type="button" class="go gold" data-a="wkisle">${R ? 'Continue the expedition' : 'Enter the portal'}</button>${R ? '' : '<button type="button" class="btn wide nf" data-a="skipday">Not today · the tickets stay</button>'}</div>`;
}
/* Kortet i valget av dagens modus (modeSheet i bui.js): står øverst, i ukas farge. */
function wkModeCard(o, sel) {
  const T = WKT[wkType(o.r)];
  return `<button type="button" class="mdc wkm${sel ? ' on' : ''}" data-a="msel" data-k="week" aria-pressed="${!!sel}" style="--wc:${T.c}">
    <span class="mdc-top">${wkEmb(T.c)}<span class="sp"><b>Expedition <i class="mdc-st">${o.run ? 'In progress' : 'This week'}</i></b><span class="sm tn">${esc(T.n)} · ${esc(T.rule)}</span></span>${wkLights(o.tix, wkStars(o.r))}</span>
    <span class="mdc-f"><span class="pill tn">Coins ×${smFor('week')}</span><span class="sm">${o.run ? tl('Your run goes on where it was') : tl('{n} of {m} zones open · the tickets are used', { n: o.tix, m: WKMAX })}</span></span></button>`;
}
const wkLastLine = L => L.how === 'won' ? tl('You cleared everything your {t} tickets opened: {n} wins.', { t: L.t, n: L.wins }) : L.how === 'lost' ? tl('The expedition ended in {z}, after {n} wins. What you won is yours.', { z: wkZn(L.ty, Math.min(5, L.ms + 1)).replace(/^The /, 'the ').replace(/^(Outer|Inner|Gold|Sealed|Ultra)/, m => 'the ' + (m === 'Ultra' ? m : m.toLowerCase())), n: L.wins }) : tl('You headed home after {n} wins. What you won is yours.', { n: L.wins });
/* Laget i løpet: bildene med HP-strek, de som er slått ut i grått. */
const wkHpCol = f => f > 0.5 ? '#6fd08a' : f > 0.2 ? '#f0c95a' : '#ef7a6a';
const wkTeamEl = R => `<div class="wkt" role="img" aria-label="Your team in the expedition">${wkTeam(R).map(x => `<span class="${x.h <= 0 ? 'ko' : ''}">${spr(x.m.id, { sh: x.m.sh, mega: x.m.mega, s: '34px' })}<i><i style="width:${Math.round(x.h * 100)}%;background:${wkHpCol(x.h)}"></i></i></span>`).join('')}</div>`;

/* ---------- Arket om ekspedisjonen ---------- */
function wkInfoSheet() {
  const N = wkNow(); if (!N) return;
  const T = WKT[N.ty], nx = WKT[N.played ? N.next : wkType(N.r + 1)], zs = [tl('The outer halls: a short map and a gatekeeper'), tl('The inner halls: more paths, events and treasure'), T.fac ? tl('The Frontier Brain, and the Silver Symbol') : tl('The one who waits at the end'), T.fac ? tl('The gold road: the Brain at full strength, and the Gold Symbol') : tl('The road beyond'), tl('The sealed room')];
  openSheet(`<div class="wkih" style="--wc:${T.c}">${wkEmb(T.c)}<div class="sp"><div class="wk-k">Expedition · ${esc(wkDayName(N.fri))}</div><h2 class="h" style="margin:0">${esc(T.n)}</h2></div>${wkLights(N.tix, N.stars, 'lg')}</div>
    <p class="sm">${tl('Once a week, on Friday after Done for today, you can set out on an expedition instead of the usual modes. Saturday works too.')}</p>
    <button type="button" class="wkrule" data-a="wkrule" data-k="${N.ty}" style="--wc:${T.c}"><span class="wk-k">${tl("This week's rule")}</span><b>${esc(T.rule)}</b><span class="sm">${tl(T.rd)}</span></button>
    <p class="sm">${tl('Every study day of {min} minutes lights one ticket, five at most. Each ticket opens one more zone of the map and one more chest in the vault at the end. The battles are the same however many you have.', { min: OPENMIN })}</p>
    <div class="wkzl" style="--wc:${T.c}">${zs.map((z, i) => `<div class="${i < N.tix ? 'on' : ''}"><i>${i + 1}</i><span>${z}</span></div>`).join('')}</div>
    <p class="sm">${tl('Miss both days, and the tickets stay with you and fill up next week. Nothing is lost.')}</p>
    ${N.stars ? `<p class="sm" style="color:var(--gold)">${tl('Weekend study in exam season: a few more coins on the expedition.')}</p>` : ''}
    <p class="sm tn">${tl('Next week: {n}.', { n: nx.n })} ${esc(nx.rule)}.</p>
    <div class="acts"><button type="button" class="btn gold" data-a="wkisle">${tl('Visit the island')}</button><button type="button" class="btn nf" data-a="close">Close</button></div>`);
}
/* Regelkortet: ukestypen forklart med ett kort (MONDAY.md avsnitt 8). Vises av seg selv første gang kartet åpnes en uke. */
function wkRuleSheet(ty, first) {
  const T = WKT[ty]; if (!T) return;
  const only = T.fac ? tl('Only here: the Silver and Gold Symbols of the {n}.', { n: T.n }) : T.deep ? tl('Only here: the prize at the way out, rarer for every zone you clear.') : tl('Only here: the Shadow Pokémon you snag.');
  openSheet(`<div class="wkih" style="--wc:${T.c}">${wkEmb(T.c)}<div class="sp"><div class="wk-k">${first ? tl("This week's rule") : esc(T.n)}</div><h2 class="h" style="margin:0">${esc(T.rule)}</h2></div></div>
    <p class="wkevd">${tl(T.rd)}</p><p class="sm">${only} ${tl('The vault at the end is there every week.')}</p>
    <button type="button" class="btn wide gold" data-a="close">${first ? 'Got it' : 'Close'}</button>`);
}
/* ---------- Kartet ----------
   Radene står nedenfra og opp (WKROWH per rad). Hver node er en knapp: et trykk åpner arket for rommet (wkNodeSheet).
   Tilstandene: now = der du står · open = hit kan du gå nå · done = stien du har gått · off = veier du gikk forbi · lock = soner over billettene. */
const WKROWH = 78;
const wkFlv = R => R ? R.flv : Math.max(5, Math.min(100, Math.round(Math.max(5, Math.round(leagueLv())) * (1 + diff().rel))));
/* Raden under laget: det ukestypen lar deg gjøre på kartet (Castle Points, Pyramid-veska, veien ut av ormehullet, Snag Ballene). */
function wkTray(V) {
  const R = V.R, T = V.T, X = (R && R.x) || wkX(V.ty, V.t);
  const b = (a, n, h, s) => `<button type="button" class="wktr" data-a="${a}"><span class="wkcpi">${n}</span><span class="sp"><b>${h}</b><span class="sm">${s}</span></span>${icn('chev')}</button>`;
  if (T.cp) return b('wkcp', X.cp, 'Castle Points', tl('Heal, revive, or ask who waits ahead.'));
  if (T.dark) return b('wkbag', (X.bag.berry || 0) + (X.bag.revive || 0), 'Pyramid Bag', `${X.bag.berry || 0} Sitrus Berry · ${X.bag.revive || 0} Revive`);
  if (T.deep) { const st = R ? Math.min(5, R.ms) : 0; return b('wkdepth', st, tl('The way out'), tl(WKEXITN[st])); }
  if (T.snag) return `<div class="wktr stat"><span class="wkcpi">${X.balls}</span><span class="sp"><b>${X.balls === 1 ? 'Snag Ball' : 'Snag Balls'}</b><span class="sm">${tl('Beat a trainer with a Shadow Pokémon to use one.')}</span></span></div>`;
  return '';
}
function wkScreen() {
  const V = wkView(); if (!V) return wkSt().last ? wkEndScreen() : (closeOv(), render());
  const { M, R, t, T } = V, H = M.rows.length * WKROWH + 26, y = n => Math.round(H - 14 - (n.r + 0.5) * WKROWH + n.dy * 16), path = new Set(V.path), reach = new Set(V.reach);
  /* Det som fortsatt kan nås fra der du står, og hva du ser av hvert rom (wkSees: dørene i Pike, mørket i Pyramid). */
  const can = new Set(V.at < 0 ? M.rows[0].map(n => n.id) : [V.at]); { const q = Array.from(can); while (q.length) for (const j of M.nodes[q.pop()].to) if (!can.has(j)) { can.add(j); q.push(j); } }
  const see = M.nodes.map(n => wkSees(V, n)), hints = T.types ? wkHints(M, wkFlv(R)) : null;
  const cls = n => n.z > t ? 'lock' : n.id === V.at ? 'now' : path.has(n.id) ? 'done' : reach.has(n.id) ? 'open' : can.has(n.id) ? '' : 'off';
  const bs = wkBoss(M), bg = wkBoss(M, 'bg'), img = { bs: POOL[bs[0]][bs[1]][1], bg: POOL[bg[0]][bg[1]][1] };
  const edges = M.nodes.map(a => a.to.map(j => { const b = M.nodes[j]; if (!see[a.id] || !see[b.id]) return ''; const walked = path.has(a.id) && path.has(b.id) && V.path.indexOf(b.id) === V.path.indexOf(a.id) + 1, open = a.id === V.at && reach.has(b.id), dead = a.z > t || b.z > t || !can.has(b.id) || !(can.has(a.id) || path.has(a.id));
    return `<line x1="${(a.x * 100).toFixed(1)}" y1="${y(a)}" x2="${(b.x * 100).toFixed(1)}" y2="${y(b)}" class="${walked ? 'w' : open ? 'o' : dead ? 'd' : ''}"/>`; }).join('')).join('');
  const zones = [1, 2, 3, 4, 5].map(z => { const rs = M.rows.filter(r => r[0].z === z), top = H - 14 - (rs[rs.length - 1][0].r + 1) * WKROWH, lk = z > t;
    return `<div class="wkz${lk ? ' lock' : ''}" style="top:${top}px;height:${rs.length * WKROWH}px"><span>${lk ? wkGl('lk') : ''}${esc(wkZn(V.ty, z))}${lk ? ` · ${z} tickets` : ''}</span></div>`; }).join('');
  const nodes = M.nodes.map(n => { const s = see[n.id]; if (!s) return ''; const c = cls(n), hid = s < 2, boss = n.k === 'bs' || n.k === 'bg', big = boss || n.k === 'sr', whisper = T.door && !hid && !WKCLOSE[n.k] && !path.has(n.id) && c !== 'lock';
    const name = hid ? (T.door ? 'A closed door' : 'Something in the dark') : wkNn(V.ty, n.k), ty = hints && hints[n.id] != null && c !== 'lock' && c !== 'done' ? hints[n.id] : null;
    return `<button type="button" class="wkn k-${hid ? 'hid' : n.k} ${c}${big ? ' big' : ''}${n.sh && !hid ? ' shd' : ''}${whisper ? ' hint' : ''}" data-a="wknode" data-k="${n.id}" style="left:${(n.x * 100).toFixed(1)}%;top:${y(n)}px" aria-label="${esc(name)}${whisper ? ', the guard whispered about this one' : ''}${n.sh && !hid ? ', a Shadow Pokémon is here' : ''}${ty != null ? ', ' + TYN[ty] + ' type' : ''}${c === 'open' ? ', you can go here' : c === 'now' ? ', you are here' : c === 'lock' ? ', needs ' + n.z + ' tickets' : ''}">${hid ? wkGl(T.door ? 'dr' : 'dk') : boss && c !== 'lock' ? tsprite(img[n.k]) : wkGl(n.k)}${c === 'done' ? `<span class="wkok">${wkGl('ok')}</span>` : ''}${ty != null ? `<i class="wkty" style="background:var(--t${ty})">${TYN[ty]}</i>` : ''}</button>`; }).join('');
  const me = V.at >= 0 ? M.nodes[V.at] : null, p = partner();
  const hint = V.pend ? tl('You are in the middle of this room.') : !R ? tl('Pick your first room. From there the paths decide where you can go.') : tl('Pick your next room.');
  ov(`<div class="row wktop"><button type="button" class="btn sm2" data-a="wkhome">${icn('back')}Island</button><span class="sp wk-h"><span class="wk-k">Expedition</span><b>${esc(T.n)}</b></span>${wkLights(t, V.stars)}</div>
    <button type="button" class="wkrc" data-a="wkrule" data-k="${V.ty}"><span class="wk-k">${tl("This week's rule")}</span><b>${esc(T.rule)}</b>${icn('chev')}</button>
    ${wkTeamEl(R)}${wkTray(V)}
    <div class="wkmap${T.dark ? ' dark' : ''}" id="wkmap" style="height:${H}px">${zones}<svg class="wke" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${nodes}
      ${me && p ? `<span class="wkme" style="left:${(me.x * 100).toFixed(1)}%;top:${y(me)}px">${spr(p.id, { sh: p.sh, s: '30px' })}</span>` : `<span class="wkgate" style="top:${H - 12}px">${tl('The gate')}</span>`}</div>
    <div class="acts wkacts"><p class="sm">${hint}</p>${V.pend ? `<button type="button" class="btn gold" data-a="wknode" data-k="${V.at}">Continue</button>` : ''}${R && !V.pend ? '<button type="button" class="btn nf" data-a="wkleave">Head home</button>' : ''}</div>`, 'wkov', T.c);
  const to = $('#ov .wkn.now') || $('#ov .wkn.open'); if (to && to.scrollIntoView) to.scrollIntoView({ block: 'center' });
  wkPort([img.bs, img.bg], () => document.querySelectorAll('#ov .wkn.big .tsb').forEach(x => { const b = x.closest('.wkn'); x.outerHTML = tsprite(img[b && b.classList.contains('k-bg') ? 'bg' : 'bs']); }));
  /* Regelkortet første gang kartet åpnes en uke, og valget «dypere eller hjem» når en sone i ormehullet er klar. */
  const W = wkSt(), sb = wkSbx();
  if ((sb ? sb.rs : W.rs) !== V.w + ':' + V.ty) { if (sb) sb.rs = V.w + ':' + V.ty; else { W.rs = V.w + ':' + V.ty; save(); } wkRuleSheet(V.ty, 1); }
  else if (T.deep && R && !V.pend && R.ms > (R.x.dz || 0)) { R.x.dz = R.ms; save(); wkDepthSheet(1); }
  wkAmb(V.ty);
}
/* ---------- Et rom ----------
   Arket viser hva rommet er, og knappen går inn. For en kamp velger du hvem som går ut først (BT.lead) blant dem som står.
   Kan du ikke gå dit (ennå), sier arket hvorfor. */
function wkNodeSheet(id) {
  const V = wkView(); if (!V) return;
  const nd = V.M.nodes[id]; if (!nd) return;
  const R = V.R, here = !!V.pend && V.at === id, can = here || V.reach.includes(id), fight = WKFIGHT.has(nd.k), T = V.T, hid = wkSees(V, nd) < 2;
  if (here && nd.k === 'ev') return wkEventSheet(id);
  const why = nd.z > V.t ? tl('This zone opens with {n} tickets. Every study day lights one.', { n: nd.z }) : V.path.includes(id) ? tl('You have been here.') : V.pend ? tl('Finish the room you are in first.') : tl('You are not there yet: the paths decide where you can go.');
  /* En lukket dør (Pike) eller et rom i mørket (Pyramid): du får først vite hva det er når du går inn, og da må rommet gjøres ferdig. */
  if (hid) return openSheet(`<div class="wkih" style="--wc:${T.c}"><span class="wkn k-hid stat" aria-hidden="true">${wkGl(T.door ? 'dr' : 'dk')}</span><div class="sp"><div class="wk-k">${esc(wkZn(V.ty, nd.z))}</div><h2 class="h" style="margin:0">${T.door ? 'A closed door' : 'A room in the dark'}</h2></div></div>
    <p class="sm">${T.door ? tl('Nobody knows what is behind it. Once you open it, the room is yours to finish.') : tl('Too dark to tell what is in there. Once you step in, the room is yours to finish.')}</p>${can ? '' : `<p class="sm wkwhy">${why}</p>`}
    ${can ? `<button type="button" class="go gold" data-a="wkdoor" data-k="${id}">${T.door ? 'Open the door' : 'Step into the dark'}</button>` : ''}<button type="button" class="btn wide${can ? ' nf' : ''}" data-a="close">${can ? 'Not yet' : 'Close'}</button>`);
  let body = '', go = '';
  if (fight) {
    const lv = wkFlv(R), f = wkFoe(V.M, nd, lv), known = nd.k === 'bs' || nd.k === 'bg', seen = (R && R.sc === id) || !!T.open, X = (R && R.x) || wkX(V.ty, V.t);
    const team = wkTeam(R), alive = team.filter(x => x.h > 0);
    if (!alive.some(x => x.m.u === BT.lead)) BT.lead = alive.length ? alive[0].m.u : 0;
    const sm = nd.sh ? f.team[f.shi] : null, notes = [T.nosw ? tl('No switching in the Arena: whoever is out stays out until it faints.') : '', T.board && can ? tl('The board spins before the battle.') : '', T.stat ? tl('Poison, burns and paralysis follow your team out of the room.') : ''].filter(Boolean);
    body = `<div class="wkfoe">${known ? tsprite(f.tr.img) : nd.k === 'el' ? '<span class="tsb qmb" aria-hidden="true"><i>?</i></span>' : tsprite(f.tr.img)}<div class="sp"><b>${known ? esc(who(f.tr)) : nd.k === 'el' ? 'Who is it?' : esc(f.tr.n)}</b>
        <span class="sm tn">${f.team.length} Pokémon · Lv ${lv} · <span class="ty" style="background:var(--t${f.hint})">${TYN[f.hint]}</span></span><span class="sm tn" style="color:var(--gold)">Coins ×${smFor('week')}${nd.k === 'ac' ? ' · a better prize' : ''}</span></div></div>
      ${sm ? `<div class="wkshl"><span class="wksh">${spr(sm.id, { s: '40px', mega: 0 })}</span><span class="sm"><b>Shadow ${esc(D(sm.id)[0])}</b><br>${X.balls > 0 ? tl('Win, and you may snag it.') : tl('You have no Snag Ball left.')}</span></div>` : ''}
      ${seen ? `<div class="wkscout"><span class="sm">${T.open ? tl('The bracket shows the team:') : tl('The scout told you:')}</span>${f.team.map(m => spr(m.id, { s: '38px', mega: 0 })).join('')}</div>` : ''}
      ${can ? `<div class="lab">Your team · tap the one that leads</div><div class="wklu">${team.map(x => `<button type="button" data-a="wklead" data-u="${x.m.u}" data-k="${id}" class="${x.m.u === BT.lead ? 'lead' : ''}${x.h <= 0 ? ' ko' : ''}"${x.h <= 0 ? ' disabled' : ''} aria-pressed="${x.m.u === BT.lead}" aria-label="${esc(mName(x.m))}, ${x.h <= 0 ? 'fainted' : Math.round(x.h * 100) + ' % HP'}${x.s ? ', ' + STAG[x.s] : ''}">${spr(x.m.id, { it: x.m.item, sh: x.m.sh, mega: x.m.mega, s: '40px' })}<b>${esc(mName(x.m))}</b><i class="wkhp"><i style="width:${Math.round(x.h * 100)}%;background:${wkHpCol(x.h)}"></i></i><span class="sm tn">${x.h <= 0 ? 'fainted' : (x.m.u === BT.lead ? 'leads' : Math.round(x.h * 100) + ' %') + (x.s ? ' · ' + STAG[x.s] : '')}</span></button>`).join('')}</div>` : ''}
      ${notes.map(x => `<p class="sm tn" style="text-align:center">${x}</p>`).join('')}`;
    if (!(nd.k === 'el' && !known)) wkPort([f.tr.img], () => { const x = $('#sheet .wkfoe .tsb'); if (x && !x.classList.contains('qmb')) x.outerHTML = tsprite(f.tr.img); });
    go = can ? `<button type="button" class="go gold" data-a="wkgo" data-k="${id}"${alive.length ? '' : ' disabled'}>${here && !T.board ? 'Back into the battle' : 'Start battle'}</button><p class="sm tn" style="text-align:center">${tl('No Bag in here, and no healing after the battle.')}</p>` : '';
  } else go = can ? `<button type="button" class="go gold" data-a="wkdo" data-k="${id}">${{ ev: 'Step in', sp: 'Rest here', tz: 'Open it', en: 'Look closer', sr: 'Break the seal' }[nd.k] || 'Enter'}</button>` : '';
  openSheet(`<div class="wkih" style="--wc:${T.c}"><span class="wkn k-${nd.k}${nd.sh ? ' shd' : ''} stat" aria-hidden="true">${wkGl(nd.k)}</span><div class="sp"><div class="wk-k">${esc(wkZn(V.ty, nd.z))}</div><h2 class="h" style="margin:0">${esc(wkNn(V.ty, nd.k))}</h2></div></div>
    <p class="sm">${tl(wkNd(V.ty, nd.k))}</p>${body}${can ? '' : `<p class="sm wkwhy">${why}</p>`}${go}<button type="button" class="btn wide${can && !here ? ' nf' : ''}" data-a="close">${here ? 'Back to the map' : can ? 'Not yet' : 'Close'}</button>`);
}
/* En hendelse du har gått inn i: det du ser, og valgene. */
function wkEventSheet(id) {
  const V = wkView(); if (!V) return;
  const nd = V.M.nodes[id], E = WKEV[nd.e]; if (!E) return;
  openSheet(`<div class="wkih" style="--wc:${V.T.c}"><span class="wkn k-ev stat" aria-hidden="true">${wkGl('ev')}</span><div class="sp"><div class="wk-k">${esc(wkZn(V.ty, nd.z))}</div><h2 class="h" style="margin:0">${esc(E.n)}</h2></div></div>
    <p class="wkevd">${tl(E.d)}</p>
    <div class="wkopts">${E.o.map((o, i) => `<button type="button" class="wkopt" data-a="wkpick" data-k="${id}" data-i="${i}"><b>${esc(o[0])}</b>${o[1] ? `<span class="sm">${tl(o[1])}</span>` : ''}</button>`).join('')}</div>`);
}
/* Det et rom ga: tittelen, det som skjedde, og premien som ikoner. Kartet tegnes på nytt under arket. */
function wkResultSheet(o) {
  const chips = (o.coins ? `<span class="coin rs-coin"><i></i><b class="tn">${nb(o.coins)}</b></span>` : '') + o.items.map(x => resItem(x, o.items.length <= 2)).join('') + (o.encs.length ? `<span class="rs-it enc"><span class="rs-ic">${icn('grass')}</span><b class="tn">${o.encs.length}</b><span class="rs-nm">in the grass</span></span>` : '');
  openSheet(`<div class="wkih"><span class="wkn k-${o.nd.k} stat" aria-hidden="true">${wkGl(o.nd.k)}</span><div class="sp"><div class="wk-k">${esc(wkZn((wkSt().run || wkSt().last || {}).ty, o.nd.z))}</div><h2 class="h" style="margin:0">${esc(o.t)}</h2></div></div>
    ${o.l.map(x => `<p class="wkevd">${esc(x)}</p>`).join('')}${chips ? `<div class="rs-l wkrs">${chips}</div>` : ''}
    <button type="button" class="btn wide gold" data-a="${o.end ? 'wkend' : 'close'}">${o.end ? 'The expedition is over' : 'Back to the map'}</button>`);
}
/* Løpet er over: hvor langt det gikk, og hva som venter neste uke. (Hvelvet med kistene kommer i steg 1d.5.) */
/* Det som lå i en kiste: tingen, og myntene under. Et møte røpes ikke: det venter i gresset. */
function wkChestIn(o) {
  const main = o.mv ? `<span class="rs-it"><span class="rs-ic">${icn('gift')}</span><span class="rs-nm">${esc(o.mv)} · ${tl('at the tutors')}</span></span>`
    : o.enc ? `<span class="rs-it enc"><span class="rs-ic">${icn('grass')}</span><span class="rs-nm">${o.k === 'pseudo' ? tl('A pseudo-legendary in the grass') : tl('A rare encounter in the grass')}</span></span>`
    : o.items.length ? resItem(o.items[0], 1) : '';
  return `${o.purse ? `<span class="wkpurse">${tl('The purse')}</span>` : ''}${main}<span class="coin${o.purse ? ' big' : ''}"><i></i><b class="tn">${nb(o.coins)}</b></span>`;
}
function wkVaultEl(v) {
  const shown = U.wkrv == null ? v.open.length : Math.min(v.open.length, U.wkrv), left = v.n - shown;
  return `<div class="wkvault m${v.m}"><div class="row" style="justify-content:space-between"><b>${tl('The vault')}</b><span class="pill tn">${WKVN[v.m]} · ${v.n} ${v.n === 1 ? 'chest' : 'chests'}</span></div>
    <p class="sm">${left ? tl('One chest for every ticket. Tap to open.') : tl('All of it is yours.')}${v.m === 0 ? ' ' + tl('Silver when the boss of the third zone is beaten, gold after the gold battle.') : v.m === 1 ? ' ' + tl('Gold after the gold battle.') : ''}</p>
    <div class="wkchs">${Array.from({ length: v.n }, (_, i) => i < shown ? `<div class="wkch m${v.m} open${U.wkco === i ? ' pop' : ''}${wkRare(v.open[i]) ? ' rare' : ''}">${wkChestIn(v.open[i])}</div>` : `<button type="button" class="wkch m${v.m}" data-a="wkchest" aria-label="${WKVN[v.m]} chest ${i + 1} of ${v.n}, closed"><span class="wkcb"></span></button>`).join('')}</div>
    ${left > 1 && U.wkrv == null ? '<button type="button" class="btn wide" data-a="wkchall">Open all</button>' : ''}</div>`;
}
/* Løpet er over: hvor langt det gikk, hvelvet med én kiste per billett, det ukestypen ga, og hva som venter neste uke. */
function wkEndScreen() {
  const W = wkSt(), L = W.last; if (!L) { closeOv(); return render(); }
  const T = WKT[L.ty], head = L.how === 'won' ? 'Expedition complete' : L.how === 'lost' ? 'The expedition ends here' : 'You headed home', v = W.vault && W.vault.w === L.w ? W.vault : null, so = W.so && W.so.w === L.w ? W.so : null, nx = WKT[wkType(L.w + 1)];
  const sym = L.got ? `<div class="wksymr" style="--wc:${T.c}"><span class="wksym s${L.got}">${wkSymEl(L.ty, L.got)}</span><p class="rs-hi">${L.sym ? tl('You earned the {m} Symbol of the {n}.', { m: L.sym === 2 ? 'Gold' : 'Silver', n: T.n }) : tl('You hold this symbol already. The vault is {m} all the same.', { m: L.got === 2 ? 'gold' : 'silver' })}</p></div>` : '';
  const exit = L.exit == null ? '' : `<p class="rs-hi">${L.exit ? tl('The way out: {p}. It waits in your grass.', { p: tl(WKEXITN[L.exit]).toLowerCase() }) : tl('The wormhole gave nothing at the way out this time.')}${L.how === 'lost' && L.ms > 0 ? ' ' + tl('You fell, so it is one step down.') : ''}</p>`;
  const snag = (L.snag || []).length ? `<p class="rs-hi">${tl('Snagged: {n}. Three study days lift the shadow.', { n: L.snag.map(id => 'Shadow ' + D(id)[0]).join(', ') })}</p>` : '';
  ov(`<div class="row" style="justify-content:flex-end"><span class="pill tn">${esc(T.n)}</span></div>
    <div class="wkend"><div class="wk-k">Expedition</div><h1 class="big">${head}</h1><p class="mut" style="margin-top:8px">${esc(wkLastLine(L))}</p>
      <div class="wkzp" role="img" aria-label="${L.ms} of ${L.t} zones cleared">${[1, 2, 3, 4, 5].map(z => `<span class="${z <= L.ms ? 'on' : z <= L.t ? 'op' : ''}"><i>${z <= L.ms ? wkGl('ok') : z > L.t ? wkGl('lk') : ''}</i>${esc(wkZn(L.ty, z))}</span>`).join('')}</div>
      <div class="gain"><div><b class="tn">${L.wins}</b><span class="sm">${L.wins === 1 ? 'win' : 'wins'}</span></div><div><b class="tn">+${nb(L.coins)}</b><span class="sm">coins</span></div><div><b class="tn">${L.steps}</b><span class="sm">${L.steps === 1 ? 'room' : 'rooms'}</span></div></div>
      ${sym}${exit}${L.cp ? `<p class="rs-hi">${tl('{n} Castle Points saved: {c} coins.', { n: L.cp, c: nb(L.cpc) })}</p>` : ''}${snag}
      ${so ? `<div class="card stack wksc"><div class="row" style="gap:12px;align-items:center"><span class="wksh">${spr(so.id, { s: '56px' })}</span><div class="sp"><b>Snag Shadow ${esc(D(so.id)[0])}?</b><div class="sm">${tl('It comes home with you, and is yours after three study days.')}</div></div></div><button type="button" class="btn wide gold" data-a="wksnag">Throw the Snag Ball</button></div>` : ''}
      ${v ? wkVaultEl(v) : ''}
      <p class="sm">${tl('Next week: {n}. A new map, and new tickets from your study days.', { n: nx.n })}</p></div>
    <div class="wkendb"><button type="button" class="btn" data-a="wkshare">Share the result</button><button type="button" class="btn" data-a="wkhome">The island</button></div>
    <div class="acts"><button type="button" class="btn pri" data-a="wkout">Done</button></div>
    ${SBX && !SBX.jp ? '<div class="row sbxacts"><button type="button" class="btn sp nf" data-a="lab">Sandbox</button></div>' : ''}`, 'wkov', T.c);
  U.wkco = -1; wkAmb('');
}
/* ---------- Ukestypenes ark (steg 1d.4): brettet, Castle Points, Pyramid-veska, veien ut av ormehullet og Shadow-fangstene ---------- */
/* Laget som knapper å velge blant (ok(x) = kan velges). */
const wkPickTeam = (R, a, k, ok) => `<div class="wklu">${wkTeam(R).map(x => `<button type="button" data-a="${a}" data-k="${k}" data-u="${x.m.u}" class="${x.h <= 0 ? 'ko' : ''}"${ok(x) ? '' : ' disabled'} aria-label="${esc(mName(x.m))}, ${x.h <= 0 ? 'fainted' : Math.round(x.h * 100) + ' % HP'}">${spr(x.m.id, { sh: x.m.sh, mega: x.m.mega, s: '40px' })}<b>${esc(mName(x.m))}</b><i class="wkhp"><i style="width:${Math.round(x.h * 100)}%;background:${wkHpCol(x.h)}"></i></i><span class="sm tn">${x.h <= 0 ? 'fainted' : Math.round(x.h * 100) + ' %'}</span></button>`).join('')}</div>`;
/* ARCADE: brettet går rundt til du stopper det (WKBD.i = ruta som lyser). Etter stoppet står ruta fast (wkSpin), og knappen starter kampen. */
let WKBD = { t: 0, i: 0 };
function wkBoardSheet(id) {
  const R = wkSt().run; if (!R) return;
  const T = WKT[R.ty], bd = wkBoard(R, wkMap(R.w, R.ty).nodes[id]), got = R.x.arc && R.x.arc.id === id ? R.x.arc.k : '';
  clearInterval(WKBD.t);
  openSheet(`<div class="wkih" style="--wc:${T.c}">${wkEmb(T.c)}<div class="sp"><div class="wk-k">${esc(T.n)}</div><h2 class="h" style="margin:0">${got ? esc(WKARC[got].n) : 'The game board'}</h2></div></div>
    <div class="wkbd${got ? ' set' : ''}" id="wkbd" role="img" aria-label="The board: ${bd.map(k => WKARC[k].n).join(', ')}">${bd.map(k => `<div class="wkbt g${WKARC[k].g + 1}${got === k ? ' on' : ''}"><b>${esc(WKARC[k].n)}</b></div>`).join('')}</div>
    <p class="wkevd" id="wkbdt">${got ? tl(WKARC[got].d) : tl('Stop the board. The square you land on counts for this battle.')}</p>
    <button type="button" class="go gold" data-a="${got ? 'wkgo' : 'wkstop'}" data-k="${id}">${got ? 'Start battle' : 'Stop'}</button>`);
  if (!got) { const step = () => { const el = $('#wkbd'); if (!el || el.classList.contains('set')) return clearInterval(WKBD.t); WKBD.i = (WKBD.i + 1) % el.children.length; Array.from(el.children).forEach((c, j) => c.classList.toggle('cur', j === WKBD.i)); }; WKBD.i = rnd(bd.length); step(); WKBD.t = setInterval(step, calm() ? 480 : 120); }
}
/* CASTLE: det poengene kan brukes på. k = varen som er valgt og trenger en Pokémon. */
function wkCastleSheet(k) {
  const V = wkView(); if (!V) return;
  const R = V.R, T = V.T, cp = R ? R.x.cp || 0 : WKCP0, it = k && WKCP[k];
  const head = `<div class="wkih" style="--wc:${T.c}"><span class="wkcpi lg">${cp}</span><div class="sp"><div class="wk-k">${esc(T.n)}</div><h2 class="h" style="margin:0">Castle Points</h2></div></div>`;
  if (it && it.u && R) return openSheet(`${head}<p class="sm"><b>${esc(it.n)}</b> · ${it.c} ${tl('points')}. ${tl(it.d)}</p>${wkPickTeam(R, 'wkcpb', k, x => it.u === 2 ? x.h <= 0 : x.h > 0)}<button type="button" class="btn wide nf" data-a="wkcp">Back</button>`);
  openSheet(`${head}<p class="sm">${tl('Every win gives points, more the healthier your team is. What you save turns into coins at the end.')}</p>
    <div class="wkopts">${Object.keys(WKCP).map(q => { const o = WKCP[q]; return `<button type="button" class="wkopt cp" data-a="${o.u ? 'wkcps' : 'wkcpb'}" data-k="${q}"${R && !V.pend && cp >= o.c ? '' : ' disabled'}><span class="sp"><b>${esc(o.n)}</b><span class="sm">${tl(o.d)}</span></span><span class="pill tn">${o.c}</span></button>`; }).join('')}</div>
    ${V.pend ? `<p class="sm wkwhy">${tl('Finish the room you are in first.')}</p>` : !R ? `<p class="sm wkwhy">${tl('The points can be spent once you have set out.')}</p>` : ''}<button type="button" class="btn wide" data-a="close">Close</button>`);
}
/* PYRAMID: veska som bare gjelder i løpet. */
function wkBagSheet(k) {
  const V = wkView(); if (!V) return;
  const R = V.R, T = V.T, bag = R ? R.x.bag : wkX(V.ty, V.t).bag, IT = { berry: ['Sitrus Berry', 'One that is still standing recovers {n} % of its HP.', WKBERRY], revive: ['Revive', 'One that has fainted is back with {n} % of its HP.', WKREVIVE] };
  const head = `<div class="wkih" style="--wc:${T.c}">${wkEmb(T.c)}<div class="sp"><div class="wk-k">${esc(T.n)}</div><h2 class="h" style="margin:0">Pyramid Bag</h2></div></div>`;
  if (k && IT[k] && R) return openSheet(`${head}<p class="sm"><b>${IT[k][0]}</b> · ${tl(IT[k][1], { n: Math.round(IT[k][2] * 100) })}</p>${wkPickTeam(R, 'wkbagu', k, x => k === 'revive' ? x.h <= 0 : x.h > 0 && x.h < 1)}<button type="button" class="btn wide nf" data-a="wkbag">Back</button>`);
  openSheet(`${head}<p class="sm">${tl('What you find in the dark only works in here. Use it on the map, between the rooms. The light reaches one row further for every two trainers you beat.')}</p>
    <div class="wkopts">${Object.keys(IT).map(q => `<button type="button" class="wkopt cp" data-a="wkbags" data-k="${q}"${R && !V.pend && bag[q] > 0 ? '' : ' disabled'}><span class="sp"><b>${IT[q][0]}</b><span class="sm">${tl(IT[q][1], { n: Math.round(IT[q][2] * 100) })}</span></span><span class="pill tn">×${bag[q] || 0}</span></button>`).join('')}</div>
    ${V.pend ? `<p class="sm wkwhy">${tl('Finish the room you are in first.')}</p>` : ''}<button type="button" class="btn wide" data-a="close">Close</button>`);
}
/* WORMHOLE: stigen ved utgangen. auto = en sone er nettopp klar, og valget er dypere eller hjem. */
function wkDepthSheet(auto) {
  const V = wkView(); if (!V) return;
  const R = V.R, T = V.T, st = R ? Math.min(5, R.ms) : 0, more = st < V.t;
  openSheet(`<div class="wkih" style="--wc:${T.c}">${wkEmb(T.c)}<div class="sp"><div class="wk-k">${esc(T.n)}</div><h2 class="h" style="margin:0">${auto && more ? tl('Deeper, or home?') : tl('The way out')}</h2></div></div>
    <p class="sm">${tl('Walk out, and the prize at your depth is yours. Fall in a battle, and you get the one a step below.')}</p>
    <div class="wkzl wkex" style="--wc:${T.c}">${[1, 2, 3, 4, 5].map(z => `<div class="${z <= st ? 'on' : ''}${z === st ? ' cur' : ''}"><i>${z}</i><span>${tl(WKEXITN[z])}${z > V.t ? ` · ${z} tickets` : ''}</span></div>`).join('')}</div>
    ${more ? `<p class="sm tn">${tl('What you meet in the next zone is {n} times as likely to be shiny.', { n: st + 2 })}</p>` : ''}
    <div class="acts">${R && !V.pend && st > 0 ? '<button type="button" class="btn nf" data-a="wkleave">Head home with it</button>' : ''}<button type="button" class="btn gold" data-a="close">${more && R ? 'Go deeper' : 'Close'}</button></div>`);
}
/* SHADOW: tilbudet om å snappe etter en seier (kortet i resultatet, overview i bui.js), de som renses, og de som er ferdige. */
function wkSnagCard(res) {
  const o = wkSt().so, s = res.snagged;
  if (s) return `<div class="card stack wksc"><div class="row" style="gap:12px;align-items:center"><span class="wksh">${spr(s.id, { sh: s.sh, s: '56px' })}</span><div class="sp"><div class="sm">Snagged</div><b>Shadow ${esc(D(s.id)[0])}</b><div class="sm">${tl('Three study days lift the shadow. Then it is yours.')}${s.id !== res.snag.id ? ' ' + tl('At your level it is a {n}.', { n: D(s.id)[0] }) : ''}</div></div>${wkHearts(WKPURE)}</div></div>`;
  if (!o) return '';
  return `<div class="card stack wksc"><div class="row" style="gap:12px;align-items:center"><span class="wksh">${spr(o.id, { s: '56px' })}</span><div class="sp"><div class="sm tn">${res.snag.balls} ${res.snag.balls === 1 ? 'Snag Ball' : 'Snag Balls'}</div><b>Snag Shadow ${esc(D(o.id)[0])}?</b><div class="sm">${tl('It comes home with you, and is yours after three study days.')} ${tl('Or save the ball for another one.')}</div></div></div>
    <button type="button" class="btn wide gold" data-a="wksnag">Throw the Snag Ball</button></div>`;
}
function wkSnagSheet() {
  const sn = (S.wk && S.wk.snag) || []; if (!sn.length) return;
  openSheet(`<div class="wkih" style="--wc:#c58bff">${wkEmb('#c58bff')}<div class="sp"><div class="wk-k">Shadow Snag</div><h2 class="h" style="margin:0">${tl('Lifting the shadow')}</h2></div></div>
    <p class="sm">${tl('Every study day of {min} minutes lifts the shadow one step. After three it is an ordinary Pokémon in your box, born a little better than most.', { min: OPENMIN })}</p>
    ${sn.map(s => `<div class="wkshl"><span class="wksh">${spr(s.id, { sh: s.sh, s: '44px' })}</span><span class="sp"><b>Shadow ${esc(D(s.id)[0])}</b><span class="sm tn">Lv ${s.lv} · ${wkPureLeft(s)} ${wkPureLeft(s) === 1 ? 'study day' : 'study days'} to go</span></span>${wkHearts(wkPureLeft(s))}</div>`).join('')}
    <button type="button" class="btn wide" data-a="close">Close</button>`);
}
function wkPunSheet() {
  const W = wkSt(), l = (W.pun || []).map(monBy).filter(Boolean); W.pun = []; save(); if (!l.length) return render();
  openSheet(`<div class="wkih" style="--wc:#c58bff">${wkEmb('#c58bff')}<div class="sp"><div class="wk-k">Shadow Snag</div><h2 class="h" style="margin:0">${tl('The shadow has lifted')}</h2></div></div>
    ${l.map(m => `<button type="button" class="wkshl pu" data-a="mon" data-u="${m.u}">${spr(m.id, { sh: m.sh, s: '56px', ani: 1 })}<span class="sp"><b>${esc(mName(m))}</b><span class="sm tn">Lv ${m.lv} · ${judge(m).t}</span><span class="sm">${tl('It is in your box, with the mark of the purified.')}</span></span>${icn('chev')}</button>`).join('')}
    <button type="button" class="btn wide gold" data-a="close">Close</button>`);
  sfx.found();
}

/* ---------- Symbolene, Mints og Gold Bottle Cap (steg 1d.5) ---------- */
/* Symbolet til et anlegg: en sekskant med anleggets tegn. s = 0 ikke vunnet (omriss), 1 sølv, 2 gull. */
const WKSYP = {
  pike: 'M14 31c0-6 12-4 12-10s-12-4-12-10', arcade: 'M13 15h14v14H13zM17.5 19.5h.01M22.5 24.5h.01M22.5 19.5h.01M17.5 24.5h.01', pyramid: 'M20 12l10 18H10z', castle: 'M12 30V16h4v3h3v-3h2v3h3v-3h4v14z',
  dome: 'M10 28a10 10 0 0120 0zM20 18v-4', hall: 'M11 30h18M13 30V19M20 30V19M27 30V19M10 19l10-6 10 6z', arena: 'M13 14l14 16M27 14L13 30', tower: 'M16 31V12h8v19zM16 18h8M16 24h8'
};
const wkSymEl = k => `<svg viewBox="0 0 40 44" aria-hidden="true"><path class="hx" d="M20 2l16 9.5v21L20 42 4 32.5v-21z"/><path class="gl" d="${WKSYP[k] || ''}"/></svg>`;
/* Kortet i Profile: de åtte anleggene med sølv og gull, og det du har av Mints og Gold Bottle Caps. */
function wkSymCard() {
  if (typeof wkOn !== 'function' || !wkOn()) return '';
  const W = wkSt(), fs = Object.keys(WKT).filter(k => WKT[k].fac), n = fs.reduce((a, k) => a + (W.sym[k] || 0), 0), mi = S.items.mint || 0, gc = S.items.gcap || 0;
  return `<div class="card wksy"><div class="row" style="justify-content:space-between"><b>Frontier Symbols</b><span class="sm tn">${n} of ${fs.length * 2}</span></div>
    <div class="wksyg">${fs.map(k => { const s = W.sym[k] || 0; return `<button type="button" class="wksym s${s}" data-a="wksym" data-k="${k}" style="--wc:${WKT[k].c}" aria-label="${esc(WKT[k].n)}: ${s === 2 ? 'Gold Symbol' : s === 1 ? 'Silver Symbol' : 'no symbol yet'}">${wkSymEl(k)}<small>${esc(WKT[k].n.replace('Battle ', ''))}</small></button>`; }).join('')}</div>
    ${mi || gc ? `<button type="button" class="wkinv" data-a="wkitems">${mi ? `<span>${itPic('mint')}<b class="tn">×${mi}</b> Mint</span>` : ''}${gc ? `<span>${itPic('gcap')}<b class="tn">×${gc}</b> Gold Bottle Cap</span>` : ''}${icn('chev')}</button>` : ''}</div>`;
}
/* Om så mange uker kommer typen igjen på rundgangen (0 = denne uka). */
const wkWeeksTo = ty => { const w = wkIdx(dayKey()); for (let i = 0; i < WKROT.length; i++) if (WKROT[(((w + i - WKEPOCH) % WKROT.length) + WKROT.length) % WKROT.length] === ty) return i; return -1; };
function wkSymSheet(k) {
  const T = WKT[k]; if (!T) return;
  const s = wkSt().sym[k] || 0, n = wkWeeksTo(k);
  openSheet(`<div class="wkih" style="--wc:${T.c}"><span class="wksym s${s} lg">${wkSymEl(k)}</span><div class="sp"><div class="wk-k">${s === 2 ? 'Gold Symbol' : s === 1 ? 'Silver Symbol' : tl('Not won yet')}</div><h2 class="h" style="margin:0">${esc(T.n)}</h2></div></div>
    <p class="sm">${tl('Frontier Brain: {n}.', { n: T.brain })} ${s === 2 ? tl('You have beaten them at full strength.') : s === 1 ? tl('Silver is yours. Gold waits on the gold road, with four tickets.') : tl('Silver for beating the Brain, with three tickets. Gold on the gold road, with four.')}</p>
    <p class="sm"><b>${esc(T.rule)}.</b> ${tl(T.rd)}</p>
    <p class="sm tn">${n === 0 ? tl('This is the expedition this week.') : n === 1 ? tl('It is the expedition next week.') : tl('It comes round again in {n} weeks.', { n })}</p>
    <button type="button" class="btn wide" data-a="close">Close</button>`);
}
function wkItemSheet() {
  openSheet(`<h2 class="h">${tl('From the vault')}</h2>
    <div class="wkshl">${itPic('mint')}<span class="sp"><b>Mint · ×${S.items.mint || 0}</b><span class="sm">${tl('Changes the nature of one Pokémon, for good. Open its card and tap Use a Mint.')}</span></span></div>
    <div class="wkshl">${itPic('gcap')}<span class="sp"><b>Gold Bottle Cap · ×${S.items.gcap || 0}</b><span class="sm">${tl('Hyper trains all six stats of one Pokémon at once, for free, from Lv {l}. Open its Training.', { l: HTLV })}</span></span></div>
    <p class="sm tn">${tl('Both are only found in the vault of the Expedition.')}</p><button type="button" class="btn wide" data-a="close">Close</button>`);
}
/* På kortet til en Pokémon (monSheet i ui.js): merket til en renset Shadow-fangst, og knappen for en Mint når du har en. */
const wkCardX = m => `${m.pu ? `<div class="mc-n wkpu"><b>Purified</b><span>${tl('snagged as a Shadow Pokémon')}</span></div>` : ''}${S.items.mint > 0 && potOn() ? `<button type="button" class="btn sm2 wkmb" data-a="wkmint" data-u="${m.u}">${itPic('mint')}Use a Mint · ${S.items.mint}</button>` : ''}`;
/* Valget av ny natur: gruppert etter verdien den løfter. sel = naturen som er valgt (venter på bekreftelsen). */
function wkMintSheet(u, sel) {
  const m = monBy(u); if (!m) return;
  const eff = n => natUp(n) !== natDn(n) ? `+${SN[natUp(n)]} −${SN[natDn(n)]}` : tl('no stat up or down'), ups = [], neu = NAT.findIndex((_, n) => natUp(n) === natDn(n));
  NAT.forEach((_, n) => { const a = natUp(n); if (a !== natDn(n) && !ups.includes(a)) ups.push(a); });
  const chip = n => `<button type="button" class="chip" data-a="wkmintp" data-u="${u}" data-k="${n}" aria-pressed="${sel === n}"${n === m.nat ? ' disabled' : ''}>${NAT[n]}${natUp(n) !== natDn(n) ? ` <small>−${SN[natDn(n)]}</small>` : ''}</button>`;
  openSheet(`<div class="shead">${spr(m.id, { it: m.item, sh: m.sh, mega: m.mega, s: '64px' })}<div class="sp"><div class="sm tn">Mint · ×${S.items.mint || 0}</div><div class="pn" style="font-size:20px">${esc(mName(m))}</div><div class="sm tn">${NAT[m.nat]} · ${eff(m.nat)}</div></div></div>
    <p class="sm">${tl('A Mint gives it a new nature, for good. Pick the one you want.')}</p>
    ${ups.map(a => `<div class="lab">+${SN[a]}</div><div class="chips wkmc">${NAT.map((_, n) => n).filter(n => natUp(n) === a && natDn(n) !== a).map(chip).join('')}</div>`).join('')}
    <div class="lab">${tl('No change')}</div><div class="chips wkmc">${chip(neu)}</div>
    ${locked() ? `<p class="sm wkwhy">${tl('Your team is locked during a run. Use the Mint when the run is over.')}</p>` : ''}
    <button type="button" class="go gold" data-a="wkmintok" data-u="${u}" data-k="${sel == null ? -1 : sel}"${sel == null || sel < 0 || locked() ? ' disabled' : ''}>${sel == null || sel < 0 ? 'Pick a nature' : `Use a Mint: ${NAT[sel]} · ${eff(sel)}`}</button>
    <button type="button" class="btn wide nf" data-a="mon" data-u="${u}">Back</button>`);
}
/* I Training (trainSheet i ui.js): Gold Bottle Cap, når du har en. */
const wkCapRow = m => S.items.gcap > 0 ? `<div class="card2 trx wkcr"><div class="trl"><span class="sm">${itPic('gcap')}<b>Gold Bottle Cap</b> · ×${S.items.gcap}<br>${wkCapOk(m) ? tl('Hyper trains all six stats at once, for free.') : htOk(m) ? tl('All six already count as 31.') : tl('Works from Lv {l}.', { l: HTLV })}</span>${wkCapOk(m) && !locked() ? `<button type="button" class="btn sm2 gold" data-a="wkcap" data-u="${m.u}">Use it</button>` : ''}</div></div>` : '';

/* ---------- Sandkassa (Modes): start hvilken som helst ukestype med så mange billetter du vil ---------- */
const sbxWk = () => U.sbk || (U.sbk = { t: 3, ty: wkType(wkIdx(dayKey())) });
function sbxWeekCard() {
  const o = sbxWk(), R = SBX && !SBX.jp && SBX.wk ? wkSt().run : null, T = WKT[o.ty], sn = SBX && !SBX.jp ? ((S.wk || {}).snag || []).length : 0;
  return `<div class="card stack" id="sbxwk"><div class="row" style="justify-content:space-between"><b class="h">Expedition</b>${R ? `<span class="pill tn">In the copy · ${esc(WKT[R.ty].n)}</span>` : '<span class="pill tn">The weekly mode</span>'}</div>
    <p class="sm">Pick the week type and how many tickets you have. The map is this week's, so it is the same every time you start the same type.</p>
    <div class="lab">Week type</div><div class="chips sbxo">${Object.keys(WKT).map(k => `<button type="button" class="chip" data-a="sbxwky" data-k="${k}" aria-pressed="${o.ty === k}">${esc(WKT[k].n.replace('Battle ', ''))}</button>`).join('')}</div>
    <p class="sm"><b>${esc(T.rule)}.</b> ${esc(T.rd)}</p>
    <div class="lab">Tickets</div><div class="sbxr" role="group" aria-label="Tickets">${[1, 2, 3, 4, 5].map(t => `<button type="button" data-a="sbxwkt" data-k="${t}" aria-pressed="${o.t === t}">${t}</button>`).join('')}</div>
    <p class="sm tn">${o.t} ${o.t === 1 ? 'ticket' : 'tickets'}: ${[1, 2, 3, 4, 5].slice(0, o.t).map(z => wkZn(o.ty, z).toLowerCase()).join(', ')}, and ${o.t} ${o.t === 1 ? 'chest' : 'chests'} in the vault.</p>
    <button type="button" class="go gold" data-a="sbxwk">Set out · ${esc(T.n)} · ${o.t} ${o.t === 1 ? 'ticket' : 'tickets'}</button>
    ${R ? '<button type="button" class="btn wide" data-a="wkopen">Continue the run in the copy</button>' : ''}
    <div class="row"><button type="button" class="btn sp" data-a="sbxwki">A Mint and a Gold Bottle Cap</button>${sn ? '<button type="button" class="btn sp" data-a="sbxwkp">Lift the shadow now</button>' : ''}</div>
    <p class="sm tn">The Mint is used from a Pokémon's card, the Gold Bottle Cap from its Training. Both only change the copy.</p>
    <div class="lab">The island</div><div class="chips sbxo">${[[-1, 'By the clock'], [23, 'Night'], [6, 'Dawn'], [12, 'Day'], [19, 'Dusk']].map(([h, n]) => `<button type="button" class="chip" data-a="sbxwkh" data-k="${h}" aria-pressed="${(U.wkhr == null ? -1 : U.wkhr) === h}">${n}</button>`).join('')}</div>
    <p class="sm tn">Set out plays the whole way in: the portal, the island and this week's intro. Skip is there all the time.</p>
    <button type="button" class="btn wide" data-a="sbxwkd">Show the sheet for study day 10</button></div>`;
}
const sbxWkRe = () => { const c = $('#sbxwk'); if (c) c.outerHTML = sbxWeekCard(); };

/* ---------- Handlingene ---------- */
const WA = {
  wkinfo: () => wkInfoSheet(),
  wkopen: () => { closeSheet(); if (!wkView()) return wkSt().last ? wkEndScreen() : (closeOv(), render()); if (!modeOn('week')) { closeOv(); return render(); } BT.B = null; BT.busy = false; wkScreen(); },
  wknode: el => wkNodeSheet(+el.dataset.k),
  wklead: el => { BT.lead = +el.dataset.u; wkNodeSheet(+el.dataset.k); },
  wkgo: el => {
    const id = +el.dataset.k; if (!modeOn('week')) { closeSheet(); closeOv(); return render(); }
    if (typeof fairGate === 'function' && fairGate()) return;
    /* Arcade: brettet spinner først. Rommet er da ditt (wkEnter), og ruta står fast når du har stoppet det. */
    const V = wkView(), R0 = V && V.R;
    if (V && V.T.board && !(R0 && R0.x && R0.x.arc && R0.x.arc.id === id)) {
      const nd = R0 && R0.pend && R0.at === id ? V.M.nodes[id] : wkEnter(id); if (!nd || !WKFIGHT.has(nd.k)) { snd('warn'); return toast('You cannot go there now.'); }
      sfx.open(); wkScreen(); return wkBoardSheet(id);
    }
    clearInterval(WKBD.t);
    const B = wkBattle(id, BT.lead); if (!B) { snd('warn'); return toast('You cannot go there now.'); }
    closeSheet(); PACK.unlock(); sfx.start(); BT.busy = false; startBattle(B);
  },
  wkdo: el => {
    const id = +el.dataset.k; if (!modeOn('week')) { closeSheet(); closeOv(); return render(); }
    const o = wkDo(id); if (!o) { snd('warn'); return toast('You cannot go there now.'); }
    if (o.ev && !o.l.length) { wkScreen(); return wkEventSheet(id); }
    if (o.nd.k === 'sp') sfx.heal(); else if (o.coins) sfx.coin(); else sfx.found();
    if (o.end) closeOv(); else wkScreen(); wkResultSheet(o);
  },
  wkpick: el => {
    const o = wkDo(+el.dataset.k, +el.dataset.i); if (!o) { snd('warn'); return; }
    if (o.coins) sfx.coin(); else sfx.ok();
    if (o.end) closeOv(); else wkScreen(); wkResultSheet(o);
  },
  wkleave: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: the expedition ends'; snd('warn'); return; } if (wkLeave()) { closeSheet(); wkEndScreen(); } },
  wkrule: el => wkRuleSheet(el.dataset.k || (wkView() || {}).ty),
  /* En lukket dør eller et rom i mørket: gå inn, og se hva det var. */
  wkdoor: el => {
    const id = +el.dataset.k; if (!modeOn('week')) { closeSheet(); closeOv(); return render(); }
    if (!wkEnter(id)) { snd('warn'); return toast('You cannot go there now.'); }
    sfx.open(); wkScreen(); wkNodeSheet(id);
  },
  wkstop: el => { clearInterval(WKBD.t); const id = +el.dataset.k, k = wkSpin(id, WKBD.i); if (!k) { snd('warn'); return; } (WKARC[k].g > 0 ? sfx.found : WKARC[k].g < 0 ? sfx.bad || sfx.tap : sfx.ok)(); buzz(14); wkBoardSheet(id); },
  wkcp: () => wkCastleSheet(), wkcps: el => wkCastleSheet(el.dataset.k),
  wkcpb: el => { const k = el.dataset.k; if (!wkBuy(k, +el.dataset.u || 0)) { snd('warn'); return toast('That does nothing right now.'); } (k === 'see' ? sfx.ok : sfx.heal)(); wkScreen(); wkCastleSheet(); if (k === 'see') toast('The valet tells you who waits ahead. It shows when you get there.'); },
  wkbag: () => wkBagSheet(), wkbags: el => wkBagSheet(el.dataset.k),
  wkbagu: el => { if (!wkUse(el.dataset.k, +el.dataset.u || 0)) { snd('warn'); return toast('That does nothing right now.'); } sfx.heal(); wkScreen(); wkBagSheet(); },
  wkdepth: () => wkDepthSheet(0),
  wksnag: el => { const end = !!el.closest('.wkend'), s = wkSnag(); if (!s) { snd('warn'); return toast('You have no Snag Ball left.'); } sfx.found(); buzz(20); if (end || !BT.res) return wkEndScreen(); BT.res.snagged = s; overview(); },
  wksnags: () => wkSnagSheet(), wkpun: () => wkPunSheet(),
  wkchest: () => wkOpenChest(), wkchall: () => wkOpenAll(),
  wksym: el => wkSymSheet(el.dataset.k), wkitems: () => wkItemSheet(),
  wkmint: el => wkMintSheet(+el.dataset.u), wkmintp: el => wkMintSheet(+el.dataset.u, +el.dataset.k),
  wkmintok: el => { const m = monBy(+el.dataset.u), n = +el.dataset.k; if (!wkMint(m, n)) { snd('warn'); return; } sfx.ok(); render(); monSheet(m); toast(`${mName(m)} is now ${NAT[n]}.`); },
  wkcap: el => { const m = monBy(+el.dataset.u); if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again to use it'; return; } if (!wkCap(m)) { snd('warn'); return; } sfx.coin(); render(); trainSheet(m); toast('All six stats are Hyper trained.'); },
  sbxwki: () => { if (!sbxEnter()) return; S.items.mint = (S.items.mint || 0) + 1; S.items.gcap = (S.items.gcap || 0) + 1; sbxIn('Sandbox: a Mint and a Gold Bottle Cap are in the copy.', () => {}); },
  sbxwkp: () => { if (!SBX) return; for (const x of (S.wk && S.wk.snag) || []) x.d = '2000-01-01'; const d = new Date(); for (let i = 1; i <= WKPURE; i++) { const k = dayKey(addDays(d, -i)); S.log[k] = S.log[k] || { m: 0, s: 0, f: {} }; S.log[k].m = Math.max(S.log[k].m || 0, OPENMIN); } wkPure(); sbxIn('Sandbox: the shadow has lifted.', () => {}); },
  wkend: () => { closeSheet(); wkEndScreen(); },
  sbxwky: el => { if (WKT[el.dataset.k]) sbxWk().ty = el.dataset.k; sbxWkRe(); },
  sbxwkt: el => { sbxWk().t = Math.max(1, Math.min(WKMAX, +el.dataset.k || 1)); sbxWkRe(); },
  sbxwk: () => {
    const o = sbxWk(); if (!sbxEnter()) return;
    sbxDay(); S.mode = { day: S.lad.day, ks: ['week'] }; SBX.wk = { t: o.t, ty: o.ty }; wkSt().run = null;
    sbxIn(`Sandbox: ${WKT[o.ty].n} with ${o.t} ${o.t === 1 ? 'ticket' : 'tickets'}.`, () => wkGo());
  }
};

Object.assign(LNO, {
  'A skilled trainer with a team around one type.': 'En dyktig trener med et lag rundt én type.',
  'Tougher than the rest, with a better prize for beating them.': 'Tøffere enn de andre, med bedre premie for den som vinner.',
  'The outer halls end here. Beat the gatekeeper to go on.': 'De ytre hallene slutter her. Slå portvakten for å gå videre.',
  'A Gym Leader, one of the Elite Four, a rival or an admin. Who it is shows in the intro.': 'En Gym Leader, en av Elite Four, en rival eller en admin. Hvem det er, ser du i introen.',
  'Win, and the Silver Symbol is yours.': 'Vinn, og sølvsymbolet er ditt.',
  'The same Brain with everything they have. Win, and the Gold Symbol is yours.': 'Den samme Brain med alt de har. Vinn, og gullsymbolet er ditt.',
  'You only find out what when you step in. There is always a choice, and none of them costs you the expedition.': 'Du får først vite hva når du går inn. Det er alltid et valg, og ingen av dem koster deg ekspedisjonen.',
  'Your whole team is healed: HP, PP and those that have fainted.': 'Hele laget heles: HP, PP og de som er slått ut.',
  'A chest with coins and items. Yours as soon as you open it.': 'En kiste med mynter og gjenstander. Din med en gang du åpner den.',
  'Something rare moves in here. It goes to your grass, to meet after the expedition.': 'Noe sjeldent rører seg her inne. Det går til gresset ditt, så du kan møte det etter ekspedisjonen.',
  'Nobody knows what is in here. Only five tickets open it.': 'Ingen vet hva som er her inne. Bare fem billetter åpner det.',
  'Your expedition waits. It can go on until Saturday is over.': 'Ekspedisjonen din venter. Den kan fortsette til lørdagen er over.',
  'Done for this week. Next week: {n}.': 'Ferdig for denne uka. Neste uke: {n}.',
  'Open now: choose it as the mode for the day.': 'Åpen nå: velg den som dagens modus.',
  'Last day: open the battles today to set out.': 'Siste dag: åpne kampene i dag for å dra ut.',
  'Today, after Done for today.': 'I dag, etter Done for today.',
  'Today: {min} minutes of focus gives your ticket.': 'I dag: {min} minutter fokus gir billetten din.',
  'Friday. Every study day until then lights one more.': 'Fredag. Hver studiedag fram til da tenner ett til.',
  'Friday. All five are lit.': 'Fredag. Alle fem er tent.',
  'Friday. Every study day of {min} minutes lights a ticket.': 'Fredag. Hver studiedag på {min} minutter tenner en billett.',
  'No expedition this time. Your tickets stay with you.': 'Ingen ekspedisjon denne gangen. Billettene blir hos deg.',
  'A map with paths you choose between. No healing between the battles, so pick your way with care.': 'Et kart med stier du velger mellom. Ingen heling mellom kampene, så velg veien med omhu.',
  'a map to explore, once a week': 'et kart å utforske, én gang i uka',
  'Your run goes on where it was': 'Løpet fortsetter der det var',
  '{n} of {m} zones open · the tickets are used': '{n} av {m} soner åpne · billettene brukes',
  'You cleared everything your {t} tickets opened: {n} wins.': 'Du klarte alt de {t} billettene dine åpnet: {n} seire.',
  'The expedition ended in the {z}, after {n} wins. What you won is yours.': 'Ekspedisjonen sluttet i {z}, etter {n} seire. Det du vant, er ditt.',
  'You headed home after {n} wins. What you won is yours.': 'Du dro hjem etter {n} seire. Det du vant, er ditt.',
  'The outer halls: a short map and a gatekeeper': 'De ytre hallene: et kort kart og en portvakt',
  'The inner halls: more paths, events and treasure': 'De indre hallene: flere stier, hendelser og skatter',
  'The Frontier Brain, and the Silver Symbol': 'Frontier Brain, og sølvsymbolet',
  'The one who waits at the end': 'Den som venter innerst',
  'The gold road: the Brain at full strength, and the Gold Symbol': 'Gullveien: Brain på sitt beste, og gullsymbolet',
  'The road beyond': 'Veien videre',
  'The sealed room': 'Det forseglede rommet',
  'Once a week, on Friday after Done for today, you can set out on an expedition instead of the usual modes. Saturday works too.': 'Én gang i uka, fredag etter Done for today, kan du dra på ekspedisjon i stedet for de vanlige modusene. Lørdag går også.',
  'Every study day of {min} minutes lights one ticket, five at most. Each ticket opens one more zone of the map. The battles are the same however many you have.': 'Hver studiedag på {min} minutter tenner én billett, høyst fem. Hver billett åpner én sone til på kartet. Kampene er de samme uansett hvor mange du har.',
  'Miss both days, and the tickets stay with you and fill up next week. Nothing is lost.': 'Rekker du ingen av dagene, blir billettene hos deg og fyller opp neste uke. Ingenting går tapt.',
  'Weekend study in exam season: a few more coins on the expedition.': 'Helgestudier i eksamensperioden: litt flere mynter på ekspedisjonen.',
  'Next week: {n}.': 'Neste uke: {n}.',
  'You are in the middle of this room.': 'Du står midt i dette rommet.',
  'Pick your first room. From there the paths decide where you can go.': 'Velg det første rommet. Derfra bestemmer stiene hvor du kan gå.',
  'Pick your next room.': 'Velg neste rom.',
  'The gate': 'Porten',
  'This zone opens with {n} tickets. Every study day lights one.': 'Denne sonen åpnes med {n} billetter. Hver studiedag tenner én.',
  'You have been here.': 'Her har du vært.',
  'Finish the room you are in first.': 'Gjør ferdig rommet du står i først.',
  'You are not there yet: the paths decide where you can go.': 'Du er ikke der ennå: stiene bestemmer hvor du kan gå.',
  'The scout told you:': 'Speideren fortalte deg:',
  'No Bag in here, and no healing after the battle.': 'Ingen veske her inne, og ingen heling etter kampen.',
  'You earned the {m} Symbol of the {n}.': 'Du vant {m} Symbol fra {n}.',
  'Next week: {n}. A new map, and new tickets from your study days.': 'Neste uke: {n}. Et nytt kart, og nye billetter fra studiedagene dine.',
  'Back to the map: choose your next room.': 'Tilbake til kartet: velg neste rom.',
  'That was everything your tickets opened this week.': 'Det var alt billettene dine åpnet denne uka.',
  'The expedition ends here. Everything you won on the way is yours.': 'Ekspedisjonen slutter her. Alt du vant på veien, er ditt.',
  'The Expedition is open today.': 'Ekspedisjonen er åpen i dag.'
});

/* Steg 1d.4 og 1d.5: norsk for regelkortene, ukestypenes ark, hvelvet, symbolene, Mint og Gold Bottle Cap. */
Object.assign(LNO, {
  'Your vault is waiting': 'Hvelvet ditt venter', 'One chest to open.': 'Én kiste å åpne.', '{n} chests to open.': '{n} kister å åpne.',
  'The shadow has lifted': 'Skyggen har løftet seg', '{n} is yours now. Tap to meet it.': '{n} er din nå. Trykk for å møte den.', '{n} Pokémon are yours now. Tap to meet them.': '{n} Pokémon er dine nå. Trykk for å møte dem.',
  'Every study day lifts the shadow a little.': 'Hver studiedag løfter skyggen litt.',
  'The expedition ended in {z}, after {n} wins. What you won is yours.': 'Ekspedisjonen sluttet i {z}, etter {n} seire. Det du vant, er ditt.',
  "This week's rule": 'Ukas regel',
  'Every study day of {min} minutes lights one ticket, five at most. Each ticket opens one more zone of the map and one more chest in the vault at the end. The battles are the same however many you have.': 'Hver studiedag på {min} minutter tenner én billett, høyst fem. Hver billett åpner én sone til på kartet og én kiste til i hvelvet til slutt. Kampene er de samme uansett hvor mange du har.',
  'Only here: the Silver and Gold Symbols of the {n}.': 'Bare her: sølv- og gullsymbolet fra {n}.', 'Only here: the prize at the way out, rarer for every zone you clear.': 'Bare her: premien ved utgangen, sjeldnere for hver sone du klarer.',
  'Only here: the Shadow Pokémon you snag.': 'Bare her: Shadow-Pokémonene du snapper.', 'The vault at the end is there every week.': 'Hvelvet til slutt er der hver uke.',
  'Heal, revive, or ask who waits ahead.': 'Hel, gjenoppliv, eller spør hvem som venter.', 'The way out': 'Veien ut', 'Beat a trainer with a Shadow Pokémon to use one.': 'Slå en trener med en Shadow-Pokémon for å bruke en.',
  'Nobody knows what is behind it. Once you open it, the room is yours to finish.': 'Ingen vet hva som er bak den. Åpner du den, må rommet gjøres ferdig.',
  'Too dark to tell what is in there. Once you step in, the room is yours to finish.': 'For mørkt til å se hva som er der inne. Går du inn, må rommet gjøres ferdig.',
  'No switching in the Arena: whoever is out stays out until it faints.': 'Ingen bytter i Arena: den som står ute, blir stående til den er slått ut.',
  'The board spins before the battle.': 'Brettet spinner før kampen.', 'Poison, burns and paralysis follow your team out of the room.': 'Gift, brann og lammelse følger laget ut av rommet.',
  'Win, and you may snag it.': 'Vinn, så kan du snappe den.', 'You have no Snag Ball left.': 'Du har ingen Snag Ball igjen.', 'The bracket shows the team:': 'Oppsettet viser laget:',
  'at the tutors': 'hos lærerne', 'A pseudo-legendary in the grass': 'En pseudo-legendarisk i gresset', 'A rare encounter in the grass': 'Et sjeldent møte i gresset',
  'The vault': 'Hvelvet', 'One chest for every ticket. Tap to open.': 'Én kiste for hver billett. Trykk for å åpne.', 'All of it is yours.': 'Alt sammen er ditt.',
  'Silver when the boss of the third zone is beaten, gold after the gold battle.': 'Sølv når bossen i den tredje sonen er slått, gull etter gullkampen.', 'Gold after the gold battle.': 'Gull etter gullkampen.',
  'You hold this symbol already. The vault is {m} all the same.': 'Dette symbolet har du alt. Hvelvet er {m} likevel.',
  'The way out: {p}. It waits in your grass.': 'Veien ut: {p}. Den venter i gresset ditt.', 'The wormhole gave nothing at the way out this time.': 'Ormehullet ga ingenting ved utgangen denne gangen.',
  'You fell, so it is one step down.': 'Du falt, så det ble ett trinn lavere.', 'Snagged: {n}. Three study days lift the shadow.': 'Snappet: {n}. Tre studiedager løfter skyggen.',
  '{n} Castle Points saved: {c} coins.': '{n} Castle Points spart: {c} mynter.', 'It comes home with you, and is yours after three study days.': 'Den blir med deg hjem, og er din etter tre studiedager.',
  'Stop the board. The square you land on counts for this battle.': 'Stopp brettet. Ruta du lander på, gjelder denne kampen.', 'points': 'poeng',
  'Every win gives points, more the healthier your team is. What you save turns into coins at the end.': 'Hver seier gir poeng, flere jo friskere laget er. Det du sparer, blir mynter til slutt.',
  'The points can be spent once you have set out.': 'Poengene kan brukes når du har dratt ut.',
  'What you find in the dark only works in here. Use it on the map, between the rooms. The light reaches one row further for every two trainers you beat.': 'Det du finner i mørket, virker bare her inne. Bruk det på kartet, mellom rommene. Lyset rekker én rad lenger for hver andre trener du slår.',
  'One that is still standing recovers {n} % of its HP.': 'En som står, får tilbake {n} % av HP-en.', 'One that has fainted is back with {n} % of its HP.': 'En som er slått ut, er tilbake med {n} % av HP-en.',
  'Deeper, or home?': 'Dypere, eller hjem?', 'Walk out, and the prize at your depth is yours. Fall in a battle, and you get the one a step below.': 'Går du ut, er premien på dybden din din. Faller du i en kamp, får du den ett trinn under.',
  'What you meet in the next zone is {n} times as likely to be shiny.': 'Det du møter i neste sone, er {n} ganger så ofte shiny.', 'Three study days lift the shadow. Then it is yours.': 'Tre studiedager løfter skyggen. Da er den din.',
  'At your level it is a {n}.': 'På ditt nivå er den en {n}.', 'Or save the ball for another one.': 'Eller spar ballen til en annen.', 'Lifting the shadow': 'Skyggen løftes',
  'Every study day of {min} minutes lifts the shadow one step. After three it is an ordinary Pokémon in your box, born a little better than most.': 'Hver studiedag på {min} minutter løfter skyggen ett trinn. Etter tre er den en vanlig Pokémon i boksen din, født litt bedre enn de fleste.',
  'It is in your box, with the mark of the purified.': 'Den ligger i boksen din, med merket til de rensede.', 'Not won yet': 'Ikke vunnet ennå', 'Frontier Brain: {n}.': 'Frontier Brain: {n}.',
  'You have beaten them at full strength.': 'Du har slått dem på sitt beste.', 'Silver is yours. Gold waits on the gold road, with four tickets.': 'Sølv er ditt. Gull venter på gullveien, med fire billetter.',
  'Silver for beating the Brain, with three tickets. Gold on the gold road, with four.': 'Sølv for å slå Brain, med tre billetter. Gull på gullveien, med fire.',
  'This is the expedition this week.': 'Dette er ukas ekspedisjon.', 'It is the expedition next week.': 'Det er ekspedisjonen neste uke.', 'It comes round again in {n} weeks.': 'Den kommer igjen om {n} uker.',
  'From the vault': 'Fra hvelvet', 'Changes the nature of one Pokémon, for good. Open its card and tap Use a Mint.': 'Bytter naturen til én Pokémon, for godt. Åpne kortet dens og trykk Use a Mint.',
  'Hyper trains all six stats of one Pokémon at once, for free, from Lv {l}. Open its Training.': 'Hypertrener alle seks verdiene til én Pokémon på én gang, gratis, fra nivå {l}. Åpne Training.',
  'Both are only found in the vault of the Expedition.': 'Begge finnes bare i hvelvet etter ekspedisjonen.', 'snagged as a Shadow Pokémon': 'snappet som Shadow-Pokémon', 'no stat up or down': 'ingen verdi opp eller ned',
  'A Mint gives it a new nature, for good. Pick the one you want.': 'En Mint gir den en ny natur, for godt. Velg den du vil ha.', 'No change': 'Ingen endring',
  'Your team is locked during a run. Use the Mint when the run is over.': 'Laget er låst under et løp. Bruk Minten når løpet er over.', 'Hyper trains all six stats at once, for free.': 'Hypertrener alle seks verdiene på én gang, gratis.',
  'All six already count as 31.': 'Alle seks teller alt som 31.', 'Works from Lv {l}.': 'Virker fra nivå {l}.',
  'You cannot see what is in a room before you open its door, but in every row the guard whispers what hides behind one of them. Poison, burns and paralysis stay with your team until a spring or the end of a zone.': 'Du ser ikke hva som er i et rom før du åpner døra, men i hver rad hvisker vakten hva som skjuler seg bak én av dem. Gift, brann og lammelse blir hos laget til en kilde eller til sonen er klar.',
  'Before every battle a board spins, and you stop it yourself. The square you land on changes that battle: weather, berries for your team, a burn on the opponent, or something that hits you. More tickets put more good squares on the board, never more bad ones.': 'Før hver kamp spinner et brett, og du stopper det selv. Ruta du lander på, endrer den kampen: vær, bær til laget ditt, brann på motstanderen, eller noe som treffer deg. Flere billetter gir flere gode ruter på brettet, aldri flere dårlige.',
  'There is no Frontier Brain in here: the map goes down. Every zone you clear lifts the prize that waits at the way out, and the deeper you are, the likelier it is that what you meet is shiny. Walk out when you like and the prize is yours. Fall, and you get the one a step below.': 'Her er det ingen Frontier Brain: kartet går nedover. Hver sone du klarer, løfter premien som venter ved utgangen, og jo dypere du er, jo oftere er det du møter, shiny. Gå ut når du vil, så er premien din. Faller du, får du den ett trinn under.',
  'The map lies in darkness. You see one row ahead, and one more for every two trainers you beat. In the dark there are berries and Revives that only work in here: use them on the map, between the rooms.': 'Kartet ligger i mørke. Du ser én rad fram, og én til for hver andre trener du slår. I mørket ligger det bær og Revive som bare virker her inne: bruk dem på kartet, mellom rommene.',
  'There are no springs here. Every win gives Castle Points, more the healthier your team is, and you spend them on the map: heal, revive, or learn who waits ahead. Points you save turn into coins at the end.': 'Her finnes ingen kilder. Hver seier gir Castle Points, flere jo friskere laget er, og du bruker dem på kartet: hel, gjenoppliv, eller få vite hvem som venter. Poeng du sparer, blir mynter til slutt.',
  'Some trainers have a Shadow Pokémon: a rare species with a dark aura that hits harder. Beat them and you may snag it. You have one Snag Ball, two with four tickets, so choose who. Three study days lift the shadow, and then it is yours.': 'Noen trenere har en Shadow-Pokémon: en sjelden art med mørk aura som slår hardere. Slå dem, så kan du snappe den. Du har én Snag Ball, to med fire billetter, så velg hvem. Tre studiedager løfter skyggen, og da er den din.',
  'Everyone sees everyone: every team on the map is shown before you step in. The crowd loves a clean win: beat a trainer without losing a Pokémon, and the battle pays a quarter more.': 'Alle ser alle: hvert lag på kartet vises før du går inn. Publikum elsker en ren seier: slå en trener uten å miste en Pokémon, og kampen gir en firedel mer.',
  'Every trainer in the Hall swears by one type, and the map shows which. Choose the path your team likes best.': 'Hver trener i Hall sverger til én type, og kartet viser hvilken. Velg stien laget ditt liker best.',
  'In the Arena nobody is called back: neither you nor the opponent can switch during a battle. Only a faint, or a move that switches on its own, changes who is out. Choose who leads with care.': 'I Arena kalles ingen tilbake: verken du eller motstanderen kan bytte i en kamp. Bare når en er slått ut, eller et angrep som bytter av seg selv, endrer hvem som står ute. Velg lederen med omhu.',
  'No springs and no shortcuts: more trainers than anywhere else. In return your team catches its breath after every win, and is fully healed each time a zone is cleared.': 'Ingen kilder og ingen snarveier: flere trenere enn noe annet sted. Til gjengjeld får laget pusten igjen etter hver seier, og heles helt hver gang en sone er klar.',
  'Your team recovers a little HP before the battle.': 'Laget får tilbake litt HP før kampen.', "The opponent's lead starts paralysed.": 'Motstanderens første starter lammet.', "The opponent's lead starts with a burn.": 'Motstanderens første starter med brann.',
  "The opponent's team starts at four fifths of its HP.": 'Motstanderens lag starter med fire femdeler av HP-en.', 'This battle pays half as much again.': 'Denne kampen gir halvannen gang så mye.',
  'Your lead starts with its Speed raised.': 'Din første starter med høyere Speed.', 'The battle starts in harsh sunlight.': 'Kampen starter i sterk sol.', 'The battle starts in rain.': 'Kampen starter i regn.',
  'The battle starts in a sandstorm.': 'Kampen starter i sandstorm.', 'The battle starts in hail.': 'Kampen starter i hagl.', 'The slow move first for the first rounds.': 'De trege går først de første rundene.',
  'Nothing happens. An ordinary battle.': 'Ingenting skjer. En vanlig kamp.', 'Your lead starts poisoned.': 'Din første starter forgiftet.', "The opponent's lead starts with its Speed raised.": 'Motstanderens første starter med høyere Speed.',
  'One Pokémon gets all its HP and PP back.': 'Én Pokémon får tilbake all HP og PP.', 'One that has fainted is back with half its HP.': 'En som er slått ut, er tilbake med halv HP.',
  'Nothing yet': 'Ingenting ennå', 'A rare Pokémon': 'En sjelden Pokémon', 'An epic Pokémon': 'En episk Pokémon', 'A pseudo-legendary Pokémon': 'En pseudo-legendarisk Pokémon',
  'A pseudo-legendary, or a legendary': 'En pseudo-legendarisk, eller en legendarisk', 'A legendary Pokémon': 'En legendarisk Pokémon',
  'The rift closes behind whoever loses. Win to go deeper.': 'Riften lukker seg bak den som taper. Vinn for å gå dypere.', 'A Champion who fell through long ago, and stayed.': 'En mester som falt gjennom for lenge siden, og ble.',
  'Another Champion, with everything they have. Nobody has been deeper.': 'Enda en mester, med alt de har. Ingen har vært dypere.',
  'The outskirts end here. Beat the lookout to get into the hideout.': 'Utkanten slutter her. Slå vakten for å komme inn i skjulestedet.', 'The one who gave the orders.': 'Den som ga ordrene.',
  'The same leader with everything they have, and the rarest Shadow Pokémon of all.': 'Den samme lederen med alt de har, og den sjeldneste Shadow-Pokémonen av alle.'
});

/* =====================================================================================================================================
   STEG 1d.6–1d.8: portalen, øya som hjemskjerm, ukas intro, musikken, hvelvet som åpnes, resultatkortet og arket på studiedag 10.

   FLYTEN: forsiden → portalen (wkGo) → øya (wkIsle) → Challenge → kartet (wkScreen) → kampene → slutten (wkEndScreen) → øya → portalen ut (wkOut).
   Øya er Battle Frontier tegnet i piksler i kode (ingen bilder, så den er lik med og uten pakken): de åtte anleggene, riften på himmelen
   (Ultra Wormhole) og skjæret med laboratoriet (Shadow Snag). Ukas sted lyser, de andre er mørke, og neste ukes sted er merket. Dag og natt
   følger klokka, og billettene står som lykter på brygga. Hvert sted kan trykkes på.
   Alt her er pynt og veier inn: reglene ligger i week.js, og ingenting av dette endrer hva et løp gir.
   ===================================================================================================================================== */
Object.assign(WKIC, { sy: [0, 'M12 2.5l8 4.7v9.6l-8 4.7-8-4.7V7.2zM9 12l2 2 4-4'], fr: [0, 'M12 3v11M8 7l4-4 4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6'], is: [0, 'M3 18c3-1 5-1 9 0s6 1 9 0M6 15l3-7 3 4 2-3 4 6'] });

/* ---------- Øya i piksler ----------
   Lerretet er WKIW × WKIH piksler og skaleres opp uten utjevning. WKSITE = der hvert sted står (foten av bygget, midt på).
   Bakgrunnen (himmel, hav, land, bygg) tegnes én gang per tid på døgnet og ukestype (WKIS.bg); hvert bilde legger bare det som rører seg oppå. */
const WKIW = 176, WKIH = 120, WKHZ = 56;
const WKSITE = { tower: [88, 47], castle: [40, 68], pyramid: [136, 68], dome: [66, 61], hall: [110, 61], pike: [88, 78], arena: [54, 88], arcade: [122, 89], worm: [152, 17], shadow: [15, 103] };
const WKGATE = [88, 99], WKLAMPX = [70, 79, 88, 97, 106];
/* Tid på døgnet: natt, morgen, dag og kveld. U.wkhr (Sandbox) overstyrer klokka. */
const wkHour = () => typeof U !== 'undefined' && U.wkhr != null ? U.wkhr : new Date().getHours();
const wkPhase = h => h >= 21 || h < 5 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : 'dusk';
const WKPAL = {
  night: { sky: ['#090818', '#131130', '#221b47'], sea: ['#0c1430', '#152246'], gl: '#4c62a0', land: ['#2c5045', '#1f3a34', '#152a26'], cliff: ['#342d4c', '#231e38'], sand: '#4d4864', b: ['#2a2743', '#3b3760', '#1b192d'], tree: ['#143029', '#245043'], star: 1, orb: [20, 13, '#ece7d2', '#c9c3ae'], cloud: '#2c2756' },
  dawn: { sky: ['#2a2452', '#75507c', '#dba08c'], sea: ['#2b3763', '#46557f'], gl: '#f0c2ae', land: ['#4e7a62', '#3b6250', '#2b4a40'], cliff: ['#5a4c68', '#40364e'], sand: '#9a8688', b: ['#463f62', '#5f5880', '#2e2944'], tree: ['#24483c', '#3f6e58'], star: 0.3, orb: [14, 53, '#ffd9a8', '#f5b98a'], cloud: '#b98a94' },
  day: { sky: ['#5c8ba3', '#83adb9', '#b7d0c9'], sea: ['#3c7189', '#4e879c'], gl: '#d6ebe8', land: ['#86b07c', '#6a9a6c', '#527f5a'], cliff: ['#928678', '#6f655c'], sand: '#dccfa6', b: ['#716e86', '#9390a6', '#4f4d63'], tree: ['#3a6a4a', '#5c9264'], star: 0, orb: [20, 12, '#fff6d2', '#ffe9a8'], cloud: '#e4efe9' },
  dusk: { sky: ['#1c1940', '#5c3b6c', '#cf7e5c'], sea: ['#231f4b', '#3b3162'], gl: '#f0a078', land: ['#3c6052', '#2c4a40', '#1f352f'], cliff: ['#463a58', '#2e2740'], sand: '#72606e', b: ['#363150', '#4b4568', '#23203a'], tree: ['#1c3a32', '#31584a'], star: 0.5, orb: [164, 53, '#ffc08a', '#f09a70'], cloud: '#7a4a6c' }
};
/* Fast «tilfeldighet» til stjerner, trær og glitter: den samme øya hver gang. */
const wkIh = (i, k) => { let x = Math.imul((i + 1) * 374761393 + (k + 1) * 668265263, 1274126177); x ^= x >>> 13; x = Math.imul(x, 1274126177); return ((x >>> 0) % 4096) / 4096; };
const wkIn = (x, k) => { const q = x / 7, i = Math.floor(q), f = q - i; return (wkIh(i, k) * (1 - f) + wkIh(i + 1, k) * f) * 2 - 1; };
/* Landet: øverste og nederste piksel i kolonne x (null utenfor øya). En høyde midt på, der tårnet står. */
function wkLand(x) {
  const u = (x - 88) / 75; if (Math.abs(u) >= 1) return null;
  const s = Math.sqrt(1 - u * u);
  return [Math.round(78 - 30 * s * (0.9 + 0.1 * wkIn(x, 1)) - 7 * Math.exp(-Math.pow((x - 88) / 22, 2))), Math.round(78 + 23 * s * (0.93 + 0.07 * wkIn(x, 2)))];
}
/* Byggene. K = fargene: b kropp, s skygge, r tak (ukas farge når stedet lyser), w vindu, d dør. (x, y) = foten, midt på. */
const WKBLD = {
  tower: (R, x, y, K) => { R(x - 4, y - 24, 8, 24, K.b); R(x + 2, y - 24, 2, 24, K.s); R(x - 5, y - 26, 10, 2, K.r); R(x - 1, y - 30, 2, 4, K.r); R(x, y - 32, 1, 2, K.w); for (let i = 0; i < 5; i++) { R(x - 3, y - 22 + i * 4, 1, 2, K.w); R(x - 1, y - 22 + i * 4, 1, 2, K.w); } R(x - 1, y - 3, 2, 3, K.d); },
  castle: (R, x, y, K) => { R(x - 9, y - 9, 18, 9, K.b); R(x - 11, y - 14, 5, 14, K.b); R(x + 6, y - 14, 5, 14, K.b); R(x + 9, y - 14, 2, 14, K.s); R(x + 3, y - 9, 3, 9, K.s);
    for (const dx of [-11, -9, -7, 6, 8, 10]) R(x + dx, y - 16, 1, 2, K.b); for (let i = 0; i < 5; i++) R(x - 5 + i * 2, y - 11, 1, 2, K.b);
    R(x - 9, y - 20, 1, 4, K.s); R(x - 8, y - 20, 3, 2, K.r); R(x + 8, y - 20, 1, 4, K.s); R(x + 9, y - 20, 3, 2, K.r); R(x - 2, y - 5, 4, 5, K.d); R(x - 9, y - 10, 1, 2, K.w); R(x + 7, y - 10, 1, 2, K.w); R(x - 5, y - 6, 1, 2, K.w); R(x + 4, y - 6, 1, 2, K.w); },
  pyramid: (R, x, y, K) => { for (let i = 0; i < 12; i++) { R(x - 12 + i, y - 1 - i, 12 - i, 1, i % 3 === 2 ? K.s : K.b); R(x, y - 1 - i, 12 - i, 1, K.s); } R(x - 1, y - 13, 2, 2, K.r); R(x - 1, y - 3, 2, 3, K.d); R(x - 1, y - 8, 2, 1, K.w); },
  dome: (R, x, y, K) => { for (let d = 0; d < 10; d++) { const w = Math.round(Math.sqrt(100 - d * d)); R(x - w, y - 4 - d, 2 * w, 1, K.b); R(x + Math.round(w * 0.45), y - 4 - d, w - Math.round(w * 0.45), 1, K.s); } R(x - 11, y - 3, 22, 3, K.r); R(x, y - 14, 1, 10, K.r); R(x - 1, y - 16, 2, 2, K.w); for (let i = 0; i < 5; i++) R(x - 8 + i * 4, y - 2, 1, 1, K.w); R(x - 1, y - 3, 2, 3, K.d); },
  hall: (R, x, y, K) => { R(x - 10, y - 8, 20, 8, K.b); for (let i = 0; i < 5; i++) R(x - 9 + Math.round(i * 4.5), y - 8, 1, 7, K.s); for (let i = 0; i < 5; i++) R(x - 11 + i * 2, y - 9 - i, 22 - i * 4, 1, K.r); R(x - 11, y - 1, 22, 1, K.s); R(x - 1, y - 5, 2, 4, K.d); R(x - 6, y - 6, 1, 2, K.w); R(x + 5, y - 6, 1, 2, K.w); },
  pike: (R, x, y, K) => { R(x - 6, y - 6, 12, 6, K.b); R(x + 3, y - 6, 3, 6, K.s); R(x - 3, y - 11, 9, 5, K.b); R(x + 4, y - 11, 2, 5, K.s); R(x - 7, y - 16, 9, 5, K.b); R(x, y - 16, 2, 5, K.s); R(x - 3, y - 20, 8, 4, K.r); R(x + 3, y - 19, 1, 1, K.w); R(x, y - 19, 1, 1, K.w); R(x + 5, y - 18, 2, 1, K.r); R(x - 6, y - 4, 12, 1, K.r); R(x - 3, y - 9, 9, 1, K.r); R(x - 7, y - 14, 9, 1, K.r); R(x - 1, y - 3, 2, 3, K.d); },
  arena: (R, x, y, K) => { R(x - 8, y - 7, 16, 7, K.b); R(x + 4, y - 7, 4, 7, K.s); R(x - 11, y - 9, 22, 2, K.r); R(x - 12, y - 10, 2, 1, K.r); R(x + 10, y - 10, 2, 1, K.r); R(x - 7, y - 12, 14, 3, K.r); R(x - 8, y - 13, 2, 1, K.r); R(x + 6, y - 13, 2, 1, K.r); R(x - 3, y - 14, 6, 2, K.r); R(x - 2, y - 5, 4, 5, K.d); R(x - 6, y - 5, 2, 2, K.w); R(x + 4, y - 5, 2, 2, K.w); },
  arcade: (R, x, y, K) => { R(x - 9, y - 10, 18, 10, K.b); R(x + 5, y - 10, 4, 10, K.s); for (let i = 0; i < 9; i++) R(x - 9 + i * 2, y - 12, 2, 2, i % 2 ? K.r : K.s); R(x - 6, y - 17, 12, 4, K.d); R(x - 6, y - 13, 1, 1, K.s); R(x + 5, y - 13, 1, 1, K.s); R(x - 2, y - 5, 4, 5, K.d); R(x - 7, y - 8, 3, 3, K.w); R(x + 4, y - 8, 3, 3, K.w); },
  shadow: (R, x, y, K) => { for (let d = 0; d < 5; d++) { const w = Math.round(Math.sqrt(36 - d * d * 1.3)); R(x - w, y - 4 - d, 2 * w, 1, K.b); R(x + 1, y - 4 - d, w - 1, 1, K.s); } R(x - 7, y - 4, 14, 4, K.b); R(x + 3, y - 4, 4, 4, K.s); R(x + 4, y - 15, 1, 7, K.s); R(x - 1, y - 3, 2, 3, K.d); R(x - 5, y - 3, 2, 1, K.w); },
  worm: () => {}
};
const WKIS = { bg: {}, raf: 0, last: 0 };
/* Bakgrunnen for en tid på døgnet (ph) og en ukestype (ty): himmel, hav, øya, stiene, trærne, byggene, brygga og lyktestolpene. */
function wkIsleBg(ph, ty, bare) {
  const key = ph + '|' + ty + (bare ? '|b' : ''); if (WKIS.bg[key]) return WKIS.bg[key];
  const P = WKPAL[ph], cv = document.createElement('canvas'); cv.width = WKIW; cv.height = WKIH;
  const g = cv.getContext('2d'), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }, BAY = [0.1, 0.6, 0.85, 0.35];
  /* Himmelen: tre bånd som går over i hverandre med et rutemønster (ingen myke overganger: det skal se ut som piksler). */
  for (let y = 0; y < WKHZ; y++) { const q = y / WKHZ * 2, i = Math.min(1, Math.floor(q)), fr = Math.max(0, (q - i - 0.45) / 0.55); R(0, y, WKIW, 1, P.sky[i]); if (fr > 0) for (let x = 0; x < WKIW; x++) if (fr > BAY[(x & 1) + (y & 1) * 2]) R(x, y, 1, 1, P.sky[i + 1]); }
  /* Månen eller sola, og to holmer langt ute. */
  if (!bare) { const [ox, oy, c1, c2] = P.orb; for (let d = -4; d <= 4; d++) { const w = Math.round(Math.sqrt(18 - d * d)); if (w > 0) R(ox - w, oy + d, 2 * w, 1, c1); } R(ox + 1, oy - 1, 2, 2, c2); R(ox - 2, oy + 1, 1, 1, c2); }
  for (const [x0, w, h] of [[0, 26, 5], [18, 16, 3], [152, 24, 4], [136, 14, 2]]) for (let x = 0; x < w; x++) { const hh = Math.max(1, Math.round(h * Math.sin(Math.PI * (x + 0.5) / w))); R(x0 + x, WKHZ - hh, 1, hh, P.cliff[1]); }
  /* Havet. */
  for (let y = WKHZ; y < WKIH; y++) { const fr = (y - WKHZ) / (WKIH - WKHZ); R(0, y, WKIW, 1, P.sea[0]); for (let x = 0; x < WKIW; x++) if (fr * 1.15 > BAY[(x & 1) + (y & 1) * 2]) R(x, y, 1, 1, P.sea[1]); }
  g.globalAlpha = 0.5; R(0, WKHZ, WKIW, 1, P.gl); g.globalAlpha = 1;
  /* Skjæret til venstre (Shadow Snag) og selve øya: gress med en lys kant øverst, klippen mot deg, og en stripe sand der stiene går. */
  for (let x = 4; x < 27; x++) { const u = (x - 15) / 11.5, s = Math.sqrt(Math.max(0, 1 - u * u)), top = Math.round(103 - 4 * s), bot = Math.round(104 + 4 * s); if (s > 0) { R(x, top, 1, bot - top, P.cliff[0]); R(x, bot - 2, 1, 2, P.cliff[1]); R(x, top, 1, 1, P.sand); } }
  for (let x = 12; x < 165; x++) { const L = wkLand(x); if (!L) continue; const [top, bot] = L, n = bot - top;
    for (let y = top; y < bot - 5; y++) { const fr = (y - top) / Math.max(1, n - 5); R(x, y, 1, 1, y === top ? P.land[0] : fr > 0.5 && (fr - 0.5) * 2.4 > BAY[(x & 1) + (y & 1) * 2] ? P.land[2] : P.land[1]); }
    R(x, bot - 5, 1, 3, P.cliff[0]); R(x, bot - 2, 1, 2, P.cliff[1]); if ((x + bot) % 5 === 0) R(x, bot - 4, 1, 2, P.cliff[1]); }
  /* Stiene fra porten til hvert sted (prikket), og trærne der det ikke står noe. */
  const on = (x, y) => { const L = wkLand(Math.round(x)); return !!L && y > L[0] && y < L[1] - 6; };
  for (const k in WKSITE) { if (k === 'worm' || k === 'shadow') continue; const [sx, sy] = WKSITE[k], n = Math.max(Math.abs(sx - WKGATE[0]), Math.abs(sy - WKGATE[1])); for (let i = 0; i <= n; i++) { const x = WKGATE[0] + (sx - WKGATE[0]) * i / n, y = WKGATE[1] - 3 + (sy - WKGATE[1] + 3) * i / n; if (i % 2 === 0 && on(x, y)) R(x, y, 1, 1, P.sand); } }
  for (let i = 0; i < 170; i++) { const x = 16 + Math.round(wkIh(i, 5) * 146), L = wkLand(x); if (!L) continue; const y = L[0] + 3 + Math.round(wkIh(i, 6) * Math.max(1, L[1] - L[0] - 13)); if (!on(x, y) || !on(x + 2, y + 2)) continue;
    if (Object.keys(WKSITE).some(k => Math.abs(WKSITE[k][0] + 1 - x) < 14 && y > WKSITE[k][1] - 22 && y < WKSITE[k][1] + 3) || (Math.abs(x - 88) < 8 && y > 82)) continue;
    R(x, y, 3, 3, P.tree[0]); R(x, y, 2, 1, P.tree[1]); R(x + 1, y + 3, 1, 1, P.cliff[1]); }
  /* Byggene: ukas sted i lyse farger med tak i ukas farge og lys i vinduene, de andre som mørke omriss. */
  const order = Object.keys(WKSITE).sort((a, b) => WKSITE[a][1] - WKSITE[b][1]);
  for (const k of order) { const lit = k === ty, c = WKT[k].c, K = lit ? { b: '#d6d0e2', s: '#9a93b2', r: c, w: '#ffe9a8', d: '#3a3350' } : { b: P.b[0], s: P.b[2], r: P.b[1], w: P.b[2], d: P.b[2] }; WKBLD[k](R, WKSITE[k][0], WKSITE[k][1], K); }
  /* Porten, brygga og de fem lyktestolpene (billettene). Lyset i lyktene tegnes for hvert bilde. */
  R(WKGATE[0] - 4, WKGATE[1] - 7, 2, 7, P.b[1]); R(WKGATE[0] + 2, WKGATE[1] - 7, 2, 7, P.b[1]); R(WKGATE[0] - 5, WKGATE[1] - 9, 10, 2, P.b[1]); R(WKGATE[0] - 3, WKGATE[1] - 10, 6, 1, P.b[0]);
  R(WKGATE[0] - 1, WKGATE[1], 3, 9, P.sand); R(64, 107, 49, 2, P.sand); R(64, 109, 49, 1, P.cliff[1]); for (const x of [66, 78, 98, 110]) R(x, 110, 1, 3, P.cliff[1]);
  for (const x of WKLAMPX) { R(x, 103, 1, 4, P.b[2]); R(x - 1, 101, 3, 2, P.b[2]); }
  return (WKIS.bg[key] = cv);
}
/* Ett bilde: bakgrunnen, og oppå den stjerner, skyer, glitter på havet, skummet, lyset rundt ukas sted, riften og lyktene. t = millisekunder. */
function wkIsleFrame(cv, t) {
  const o = cv._o || {}, ph = o.ph || wkPhase(wkHour()), ty = o.ty || 'pike', P = WKPAL[ph], g = cv.getContext('2d'), f = Math.floor(t / 125);
  const R = (x, y, w, h, c, a) => { g.globalAlpha = a == null ? 1 : a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); g.globalAlpha = 1; };
  g.imageSmoothingEnabled = false; g.drawImage(wkIsleBg(ph, ty, o.bare), 0, 0);
  if (P.star) for (let i = 0; i < 46; i++) { const x = Math.round(wkIh(i, 11) * (WKIW - 1)), y = Math.round(wkIh(i, 12) * 46), tw = (f + i * 5) % 23; if (!o.bare && Math.abs(x - P.orb[0]) < 7 && Math.abs(y - P.orb[1]) < 7) continue; R(x, y, 1, 1, i % 6 === 0 ? '#ffe9c0' : '#dfe4ff', P.star * (tw < 2 ? 0.25 : i % 3 ? 0.6 : 0.95)); }
  for (let i = 0; i < 3; i++) { const w = 16 + Math.round(wkIh(i, 21) * 12), x = ((Math.round(wkIh(i, 22) * WKIW) + Math.floor(f / (7 + i * 2))) % (WKIW + 40)) - 30, y = 8 + i * 12 + Math.round(wkIh(i, 23) * 5); R(x, y, w, 2, P.cloud, 0.55); R(x + 3, y - 1, w - 8, 1, P.cloud, 0.55); R(x + 5, y + 2, w - 10, 1, P.cloud, 0.4); }
  for (let i = 0; i < 34; i++) { const y = WKHZ + 2 + Math.round(wkIh(i, 31) * (WKIH - WKHZ - 4)), x0 = Math.round(wkIh(i, 32) * WKIW), on = (f + i * 5) % 26; if (on > 9) continue; const x = x0 + (on > 4 ? 1 : 0), L = wkLand(x); if ((L && y > L[0] - 1 && y < L[1] + 2) || (x > 60 && x < 116 && y > 104 && y < 114) || (x < 28 && y > 96 && y < 110) || Object.keys(WKSITE).some(k => Math.abs(WKSITE[k][0] - x) < 15 && y <= WKSITE[k][1] && y > WKSITE[k][1] - 26)) continue; R(x, y, 2 + (i % 3), 1, P.gl, on < 2 || on > 7 ? 0.25 : 0.55); }
  if (!o.bare) for (let i = 0; i < 4; i++) { const y = P.orb[1] < 30 ? WKHZ + 3 + i * 5 : WKHZ + 1 + i * 3, L = wkLand(P.orb[0]); if (L && y >= L[0] - 1) continue; R(P.orb[0] - 3 + ((f + i) % 3), y, 6 - i, 1, P.orb[2], 0.3); }
  for (let x = 13; x < 164; x++) { const L = wkLand(x); if (L && (x + Math.floor(f / 3)) % 4 < 2) R(x, L[1], 1, 1, P.gl, 0.5); }
  /* Ukas sted: en lysglorie som puster, og det som hører stedet til (riften som virvler, skiltet på Arcade, lampa på laboratoriet, lyset i tårnet). */
  const T = WKT[ty], S0 = WKSITE[ty], pu = 0.5 + 0.5 * Math.sin(t / 620);
  if (ty !== 'worm') { g.fillStyle = T.c; for (const [r, a] of [[19, 0.05], [14, 0.07], [9, 0.09]]) { g.globalAlpha = a * (0.55 + 0.45 * pu); g.beginPath(); g.ellipse(S0[0], S0[1] - 8, r, r * 0.8, 0, 0, 7); g.fill(); } g.globalAlpha = 1; }
  { const [x, y] = WKSITE.worm, big = ty === 'worm', n = big ? 30 : 9, rr = big ? 10 : 3.5;
    if (big) { g.fillStyle = '#05030f'; g.beginPath(); g.ellipse(x, y, 8, 5, 0, 0, 7); g.fill(); for (let i = 0; i < 6; i++) R(x - 5 + i * 2 + ((f + i) % 2), y + 7 + i * 4, 1, 3, '#9fd9ff', 0.12 + 0.05 * (i % 2)); }
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + f * (big ? 0.2 : 0.08), r = rr + (big ? 2 * Math.sin(i * 2.3 + f * 0.3) : 0); R(x + r * Math.cos(a), y + r * 0.55 * Math.sin(a), 1 + (big && i % 5 === 0 ? 1 : 0), 1, ['#9fd9ff', '#c9a3ff', '#ffffff'][i % 3], big ? 0.9 : 0.3); } }
  if (ty === 'arcade') for (let i = 0; i < 4; i++) R(S0[0] - 5 + i * 3, S0[1] - 16, 2, 2, (f + i) % 4 < 2 ? '#ffe9a8' : T.c);
  if (ty === 'shadow') { R(S0[0] + 3, S0[1] - 17, 3, 3, '#c58bff', 0.3 + 0.5 * pu); R(S0[0] + 4, S0[1] - 16, 1, 1, '#f2dcff'); R(S0[0] - 1, S0[1] - 3, 2, 3, '#c58bff', 0.5 + 0.4 * pu); }
  if (ty === 'tower') R(S0[0] - 1, S0[1] - 34, 3, 3, '#ffe9a8', 0.3 + 0.6 * pu);
  /* Lyktene på brygga: én for hver billett. */
  WKLAMPX.forEach((x, i) => { if (i >= (o.tix || 0)) return; const fl = (f + i * 4) % 17 === 0 ? 0.7 : 1; R(x - 1, 101, 3, 2, '#ffe9a8', fl); R(x - 2, 100, 5, 4, '#ffd27a', 0.22 * fl); R(x - 1, 110, 3, 1, '#ffd27a', 0.3 * fl); });
}
/* Holder øya i gang så lenge lerretet står på skjermen (åtte bilder i sekundet er nok for piksler). Med redusert bevegelse: ett stille bilde. */
function wkIsleRun(cv, o) {
  if (!cv) return; cv._o = o; wkIsleFrame(cv, performance.now()); if (calm()) return;
  const step = ts => { if (!cv.isConnected) return; if (ts - (cv._l || 0) > 120) { cv._l = ts; wkIsleFrame(cv, ts); } cv._r = requestAnimationFrame(step); };
  cancelAnimationFrame(cv._r || 0); cv._r = requestAnimationFrame(step);
}

/* ---------- Lyden og musikken ----------
   Portalen: et sus som stiger, og et smell når du lander. På øya går «The Underground» fra pakken (i ormehullet «Distortion World»);
   uten pakken den innebygde låta «isle» (music.js). Kampene har sine egne låter, og musikken tones ut når du forlater øya (closeOv i ui.js). */
const wkWarpSnd = sec => { tone(84, 0, sec, 0.035, 'triangle', 760); noise(0, sec, 0.03, 380, 6200); noise(sec, 0.4, 0.09, 520, 90); tone(132, sec, 0.45, 0.07, 'triangle', 48); [1319, 1760, 2349].forEach((f, i) => tone(f, sec + 0.05 + i * 0.07, 0.3, 0.02, 'triangle')); };
let WKAMB = 0;
const wkAmbScreen = () => !!document.querySelector('#ov .wkisw, #ov #wkmap, #ov .wkend');
async function wkAmb(ty) {
  if (!S.sound || S.music === 0) return; WKAMB = 1;
  const f = typeof PACK !== 'undefined' && PACK.ok ? PACK.special(ty && WKT[ty] && WKT[ty].deep ? /Distortion World/ : /Underground/) : '';
  if (f && await PACK.music(f, { fade: 1.4, out: 0.7 })) { if (WKAMB && wkAmbScreen()) music(''); else wkAmbOff(1); return; }
  if (!WKAMB || !wkAmbScreen()) return;
  if (typeof PACK !== 'undefined') PACK.music(''); music('isle', { fade: 1.2, out: 0.6 });
}
function wkAmbOff(force) { if (!WKAMB && !force) return; WKAMB = 0; if (!(BT.B && !BT.B.over && document.querySelector('#arena'))) stopMusic(0.9); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wkAmbScreen()) { const V = document.querySelector('#ov #wkmap') ? wkView() : null; wkAmb(V ? V.ty : ''); } });

/* ---------- Portalen ----------
   dir 1 = inn (forsiden trekkes mot midten, stjernestriper, et blink, og du lander på øya), −1 = ut. Første gang varer den drøyt tre sekunder;
   siden under ett. «Skip» står der hele tiden på den lange. then() tegner det som ligger bak, mens blinket dekker skjermen. */
function wkPortal(dir, col, then) {
  const W = wkSt(), sb = wkSbx(), first = dir > 0 && !(sb ? sb.pt : W.pt), long = first && !calm(), ms = calm() ? 220 : long ? 3300 : dir > 0 ? 900 : 620;
  if (first) { if (sb) sb.pt = 1; else { W.pt = 1; save(); } }
  const old = document.getElementById('wkport'); if (old) old.remove();
  const el = document.createElement('div'), vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight), cw = 96, ch = Math.max(60, Math.round(96 * vh / vw));
  el.id = 'wkport'; el.className = 'wkport' + (dir < 0 ? ' out' : '') + (long ? ' long' : ''); el.style.setProperty('--wc', col); el.style.setProperty('--ms', ms + 'ms');
  el.innerHTML = `<canvas width="${cw}" height="${ch}" aria-hidden="true"></canvas><i class="wkport-f"></i>${long ? '<button type="button" class="btn sm2 wkport-s" data-a="wkskip">Skip</button>' : ''}`;
  const main = document.getElementById('main'), ovl = document.getElementById('ov'); (ovl && ovl.parentNode ? ovl.parentNode : document.body).appendChild(el);
  const cv = el.firstChild, g = cv.getContext('2d'), t0 = performance.now();
  if (dir > 0 && main && !calm()) { main.style.setProperty('--ms', ms + 'ms'); main.style.setProperty('--sy', (main.scrollTop || 0) + 'px'); main.classList.add('wkwarp'); }
  if (dir < 0 && ovl && !calm()) ovl.classList.add('wkwarpo');
  if (S.sound && !calm()) wkWarpSnd(dir > 0 ? ms / 1000 * 0.78 : 0.3);
  /* Stripene: hver har sin vinkel og avstand, og dras rundt og innover (eller utover) mens den lyser opp. */
  const N = long ? 110 : 70, ps = Array.from({ length: N }, (_, i) => ({ a: wkIh(i, 41) * 6.283, r: 0.25 + wkIh(i, 42) * 0.95, v: 0.6 + wkIh(i, 43) * 0.8, c: i % 4 === 0 ? '#ffffff' : i % 4 === 1 ? col : i % 4 === 2 ? '#9fd9ff' : '#c9a3ff' }));
  let done = 0, landed = 0;
  const land = () => { if (landed) return; landed = 1; if (main) main.classList.remove('wkwarp'); try { then && then(); } catch (e) { console.error('ERR portal', e); } const o2 = document.getElementById('ov'); if (o2) o2.classList.remove('wkwarpo'); };
  const end = () => { if (done) return; done = 1; land(); el.classList.add('gone'); setTimeout(() => el.remove(), 420); U.wkskip = null; };
  U.wkskip = end;
  const D = Math.hypot(cw, ch) / 2, cx = cw / 2, cy = ch / 2;
  const step = now => {
    if (done || !el.isConnected) return;
    const p = Math.min(1, (now - t0) / ms), q = dir > 0 ? p : 1 - p, e = q * q * (3 - 2 * q);
    /* Mørket kommer gradvis, så forsiden synes gjennom mens den trekkes inn. Hver stripe er en liten bue som blir lengre jo fortere det går. */
    g.globalAlpha = 1; g.clearRect(0, 0, cw, ch); g.fillStyle = `rgba(5,3,15,${Math.min(1, e * 1.7)})`; g.fillRect(0, 0, cw, ch);
    for (const s of ps) { const rr = s.r * D * Math.pow(1 - e, 1.1 * s.v) + 1.5, a = s.a + e * (3.2 + 2.4 * s.v) / (0.35 + s.r), len = 0.1 + 0.9 * e * (1 - e) * 2 + 0.12 * e; g.globalAlpha = Math.min(1, 0.15 + 1.6 * e); g.strokeStyle = s.c; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, rr, a - len, a); g.stroke(); }
    g.globalAlpha = Math.min(1, e * 1.2); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, 1 + e * e * 5, 0, 7); g.fill(); g.globalAlpha = 0.25 * e; g.fillStyle = col; g.beginPath(); g.arc(cx, cy, 4 + e * e * 16, 0, 7); g.fill();
    if (p >= 0.8) land();
    if (p >= 1) return end();
    requestAnimationFrame(step);
  };
  if (calm()) { land(); setTimeout(end, ms); } else requestAnimationFrame(step);
  /* Sikring: står fanen i bakgrunnen, går ikke bildene. Da lander vi likevel. */
  setTimeout(end, ms + 900);
}
/* Inn fra forsiden (og fra Sandbox): portalen, så øya. Ut igjen: portalen, så forsiden. */
function wkGo() {
  const N = wkNow(); if (!N) { closeOv(); return render(); }
  closeSheet(); BT.B = null; BT.busy = false;
  wkPortal(1, WKT[N.ty].c, () => wkIsle({ arrive: 1 }));
}
function wkOut() { const N = wkNow(); closeSheet(); wkPortal(-1, N ? WKT[N.ty].c : '#c9a3ff', () => A.home()); }

/* ---------- Øya som hjemskjerm ----------
   Bildet øverst (hvert sted er en knapp), ukas type med regelen, og menyen: Challenge (ukas løp), Rewards, Symbols og Friends.
   o.arrive = du kom nettopp gjennom portalen: første gang en uke spilles ukas intro (wkIntroEl). */
const wkSiteName = k => WKT[k].n;
function wkIsle(o) {
  o = o || {};
  const N = wkNow(); if (!N) { closeOv(); return render(); }
  const W = wkSt(), sb = wkSbx(), T = WKT[N.ty], nxk = wkType(N.r + 1), NX = WKT[nxk], V = wkView(), R = V && V.R, live = !!V && modeOn('week'), ph = wkPhase(wkHour());
  const key = N.r + ':' + N.ty, intro = !!o.arrive && (sb ? sb.iw : W.iw) !== key;
  if (intro) { if (sb) sb.iw = key; else { W.iw = key; save(); } }
  const L = W.last, vl = W.run ? 0 : wkVaultLeft(), fs = Object.keys(WKT).filter(k => WKT[k].fac), ns = fs.reduce((a, k) => a + (W.sym[k] || 0), 0);
  /* Challenge: det knappen gjør akkurat nå, og linja under. */
  const ch = live && R ? { a: 'wkopen', h: 'Continue', s: `${esc(wkZn(V.ty, Math.min(5, R.ms + 1)))} · ${R.got.wins} ${R.got.wins === 1 ? 'win' : 'wins'}`, go: 1 }
    : live ? { a: 'wkopen', h: 'Challenge', s: tl('{n} of {m} zones open. The run starts when you pick your first room.', { n: V.t, m: WKMAX }), go: 1 }
    : N.played ? { a: L ? 'wkend' : '', h: 'Challenge', s: tl('Done for this week. See how it went.') }
    : N.offer ? { a: 'wkmode', h: 'Challenge', s: tl('Open today: choose the Expedition as the mode for the day.') }
    : { a: '', h: 'Challenge', s: N.today ? tl('Opens today, after Done for today.') : N.late ? tl('Last day: open the battles today to set out.') : tl('Opens on Friday, after Done for today.') };
  const mi = (a, g, h, s, dot) => `<button type="button" class="wkmi" data-a="${a}"><span class="wkmg">${wkGl(g)}</span><b>${h}</b><span class="sm">${s}</span>${dot ? '<i class="wkdot" aria-hidden="true"></i>' : ''}</button>`;
  const spot = k => { const [x, y] = WKSITE[k], cur = k === N.ty, nx = k === nxk && !cur, tag = cur ? 'This week' : nx ? 'Next' : ''; return `<button type="button" class="wkhs${cur ? ' cur' : ''}${nx ? ' nx' : ''}${x > 130 ? ' rt' : x < 46 ? ' lf' : ''}${k === 'worm' ? ' dn' : ''}" data-a="wksite" data-k="${k}" style="left:${(x / WKIW * 100).toFixed(1)}%;top:${((y - (k === 'worm' ? 0 : 8)) / WKIH * 100).toFixed(1)}%" aria-label="${esc(wkSiteName(k))}${cur ? ', this week' : nx ? ', next week' : ''}">${tag ? `<i>${tag}</i>` : ''}</button>`; };
  ov(`<div class="row wktop"><button type="button" class="btn sm2" data-a="wkout">${icn('back')}Back</button><span class="sp wk-h"><span class="wk-k">Expedition</span><b>Frontier Island</b></span>${wkLights(N.played ? 0 : N.tix, N.stars)}</div>
    <div class="wkisw${intro ? ' intro' : ''}" id="wkisw" style="--wc:${T.c};--ox:${(WKSITE[N.ty][0] / WKIW * 100).toFixed(1)}%;--oy:${((WKSITE[N.ty][1] - (N.ty === 'worm' ? -14 : 4)) / WKIH * 100).toFixed(1)}%">
      <div class="wkis ph-${ph}"><canvas id="wkisc" width="${WKIW}" height="${WKIH}" role="img" aria-label="Frontier Island. ${esc(T.n)} is lit this week."></canvas>${Object.keys(WKSITE).map(spot).join('')}</div>
      ${intro ? wkIntroEl(N, T) : ''}
      <button type="button" class="wkwk" data-a="wkrule" data-k="${N.ty}">${wkEmb(T.c)}<span class="sp"><span class="wk-k">${tl('This week')} · ${esc(T.rule)}</span><b>${esc(T.n)}</b></span>${icn('chev')}</button>
      <button type="button" class="wkgo${ch.go ? ' on' : ''}" data-a="${ch.a}"${ch.a ? '' : ' disabled'}><span class="sp"><b>${ch.h}</b><span class="sm">${ch.s}</span></span>${ch.a ? icn('chev') : wkGl('lk')}</button>
      <div class="wkmenu">${mi('wkrew', 'tz', 'Rewards', vl ? (vl === 1 ? tl('One chest to open') : tl('{n} chests to open', { n: vl })) : tl('What the tickets open'), vl > 0)}${mi('wksyms', 'sy', 'Symbols', `${ns} of ${fs.length * 2}`)}${mi('wkshare', 'fr', 'Friends', L ? tl('Share your result') : tl('The same map for all'))}</div>
      <p class="sm tn wknx">${tl('Next week: {n}.', { n: NX.n })} ${esc(NX.rule)}.</p></div>`, 'wkov wkisov', T.c);
  wkIsleRun($('#wkisc'), { ph, ty: N.ty, tix: N.played ? 0 : N.tix });
  if (intro) wkIntroRun(N, T);
  wkAmb('');
}
/* UKAS INTRO: bildet glir inn mot ukas sted, den som venter, trer fram, og lyktene tennes én etter én mens sonene de åpner, står under.
   Én linje tekst og én knapp. Alt er tidsstyrt i CSS (forsinkelser), så ingenting henger om en tidtaker ryker. */
function wkIntroEl(N, T) {
  const M = wkMap(N.r, N.ty), b = T.fac ? wkBoss(M) : null, img = b ? POOL[b[0]][b[1]][1] : '';
  const line = T.fac ? tl('Frontier Brain {n} waits at the end of the map.', { n: T.brain }) : T.deep ? tl('A rift has opened above the island. Nobody knows how deep it goes.') : tl('Someone out on the skerry is turning Pokémon into shadows.');
  const tix = N.played ? 0 : N.tix;
  return `<div class="wkint" id="wkint" style="--wc:${T.c}"><div class="wkint-c">
      <span class="wk-k">${tl('This week')}</span><h1>${esc(T.n)}</h1>
      <div class="wkint-b">${img ? tsprite(img) : `<span class="wkint-q" aria-hidden="true">${T.deep ? wkGl('sr') : '<b class="wkq">?</b>'}</span>`}<p>${line}</p></div>
      <div class="wkint-z">${[1, 2, 3, 4, 5].map(z => `<span class="${z <= tix ? 'on' : ''}" style="--i:${z}"><i></i>${esc(wkZn(N.ty, z))}</span>`).join('')}</div>
      <p class="sm wkint-n">${tix === 1 ? tl('One ticket: the first zone is open, and one chest waits in the vault.') : tix ? tl('{n} tickets: {n} of {m} zones are open, and {n} chests wait in the vault.', { n: tix, m: WKMAX }) : tl('No tickets yet. Every study day of {min} minutes lights one.', { min: OPENMIN })}</p>
      <button type="button" class="btn wide gold" data-a="wkintok">Step ashore</button></div></div>`;
}
function wkIntroRun(N, T) {
  const tix = N.played ? 0 : N.tix, M = wkMap(N.r, N.ty), b = T.fac ? wkBoss(M) : null;
  if (b) wkPort([POOL[b[0]][b[1]][1]], () => { const x = $('#wkint .tsb'); if (x) x.outerHTML = tsprite(POOL[b[0]][b[1]][1]); });
  if (calm()) return;
  for (let i = 0; i < tix; i++) setTimeout(() => { if ($('#wkint')) sfx.chip(); }, 1900 + i * 260);
}

/* ---------- Menyen: Rewards, Symbols og stedene på øya ---------- */
function wkRewardSheet() {
  const N = wkNow(); if (!N) return;
  const W = wkSt(), T = WKT[N.ty], tix = N.run ? W.run.t : N.played ? ((W.last || {}).t || 0) : N.tix, v = !W.run && wkVaultLeft() ? W.vault : null;
  const zs = [tl('The outer halls: a short map and a gatekeeper'), tl('The inner halls: more paths, events and treasure'), T.fac ? tl('The Frontier Brain, and the Silver Symbol') : tl('The one who waits at the end'), T.fac ? tl('The gold road: the Brain at full strength, and the Gold Symbol') : tl('The road beyond'), tl('The sealed room')];
  const only = T.fac ? tl('Only here: the Silver and Gold Symbols of the {n}.', { n: T.n }) : T.deep ? tl('Only here: the prize at the way out, rarer for every zone you clear.') : tl('Only here: the Shadow Pokémon you snag.');
  openSheet(`<div class="wkih" style="--wc:${T.c}"><span class="wkn k-tz stat" aria-hidden="true">${wkGl('tz')}</span><div class="sp"><div class="wk-k">${esc(T.n)}</div><h2 class="h" style="margin:0">Rewards</h2></div>${wkLights(tix, N.stars, 'lg')}</div>
    <p class="sm">${tl('Every ticket opens one more zone of the map, and puts one more chest in the vault at the end.')}</p>
    <div class="wkzl" style="--wc:${T.c}">${zs.map((z, i) => `<div class="${i < tix ? 'on' : ''}"><i>${i + 1}</i><span>${z}</span></div>`).join('')}</div>
    <div class="wkvr"><span class="wkch m0 mini" aria-hidden="true"><span class="wkcb"></span></span><span class="wkch m1 mini" aria-hidden="true"><span class="wkcb"></span></span><span class="wkch m2 mini" aria-hidden="true"><span class="wkcb"></span></span>
      <span class="sm">${tl('The vault: bronze at first, silver when the boss of the third zone is beaten, gold after the gold battle. The first chest holds the purse, so even a short week pays like a battle day.')}</span></div>
    <p class="sm">${tl('In the vault every week: Mints, Gold Bottle Caps, rare moves for the tutors and rare encounters.')} ${only}</p>
    ${v ? `<button type="button" class="go gold" data-a="wkend">${v.n - v.open.length === 1 ? 'Open your chest' : 'Open your chests'}</button>` : ''}<button type="button" class="btn wide${v ? ' nf' : ''}" data-a="close">Close</button>`);
}
function wkSymsSheet() {
  const W = wkSt(), fs = Object.keys(WKT).filter(k => WKT[k].fac), n = fs.reduce((a, k) => a + (W.sym[k] || 0), 0);
  openSheet(`<div class="wkih"><span class="wkn k-ac stat" aria-hidden="true">${wkGl('sy')}</span><div class="sp"><div class="wk-k">${n} of ${fs.length * 2}</div><h2 class="h" style="margin:0">Frontier Symbols</h2></div></div>
    <p class="sm">${tl('Silver for beating a Frontier Brain, with three tickets. Gold on the gold road, with four. Each facility comes round every twelve weeks.')}</p>
    <div class="wksyg">${fs.map(k => { const s = W.sym[k] || 0; return `<button type="button" class="wksym s${s}" data-a="wksym" data-k="${k}" style="--wc:${WKT[k].c}" aria-label="${esc(WKT[k].n)}: ${s === 2 ? 'Gold Symbol' : s === 1 ? 'Silver Symbol' : 'no symbol yet'}">${wkSymEl(k)}<small>${esc(WKT[k].n.replace('Battle ', ''))}</small></button>`; }).join('')}</div>
    <button type="button" class="btn wide" data-a="close">Close</button>`);
}
/* Et sted på øya: anleggene viser symbolet og Brain (wkSymSheet), riften og skjæret regelkortet sitt. */
const wkSiteSheet = k => { if (!WKT[k]) return; if (WKT[k].fac) return wkSymSheet(k); wkRuleSheet(k); };

/* ---------- Hvelvet som åpnes ----------
   Kista rister, lokket går opp i et lysskjær i metallets farge, og det som lå i den, stiger opp. Det sjeldne (Mint, Gold Bottle Cap, et sjeldent
   angrep, en pseudo-legendarisk) får en fyldigere fanfare. Innholdet er trukket og lagret før noe vises (wkChest), så ingenting går tapt
   om skjermen lukkes midt i. U.wkrv = hvor mange åpne kister som vises (resten rister ennå). */
const wkRare = o => !!o && (o.k === 'gcap' || o.k === 'mint' || o.k === 'pseudo' || o.k === 'tutor');
const wkVaultRe = () => { const v = wkSt().vault, el = $('#ov .wkvault'); if (v && el) el.outerHTML = wkVaultEl(v); };
function wkChestSnd(o, m) { if (wkRare(o)) { noise(0, 0.16, 0.05, 900, 4600); seq([659, 880, 1109, 1319, 1760], 0.07, 0.18, 0.045, 'triangle'); tone(2637, 0.42, 0.5, 0.025, 'triangle'); } else sfx.fpop(2 + m); }
function wkOpenChest() {
  const v = wkSt().vault; if (!v || U.wkbusy) return;
  const i = v.open.length, o = wkChest(); if (!o) return;
  if (calm()) { U.wkco = i; wkChestSnd(o, v.m); buzz(12); wkVaultRe(); U.wkco = -1; return; }
  U.wkbusy = 1; U.wkrv = i; const b = document.querySelectorAll('#ov .wkchs > *')[i]; if (b) b.classList.add('shk'); sfx.wob(1); setTimeout(() => sfx.wob(2), 190); buzz(8);
  setTimeout(() => { U.wkbusy = 0; U.wkrv = null; U.wkco = i; wkChestSnd(o, v.m); buzz(wkRare(o) ? [14, 40, 22] : 14); wkVaultRe(); U.wkco = -1; }, 520);
}
function wkOpenAll() {
  const v = wkSt().vault; if (!v || U.wkbusy) return;
  const i0 = v.open.length; while (wkChest()); const n = v.open.length;
  if (calm() || n - i0 < 1) { sfx.coin(); return wkVaultRe(); }
  U.wkbusy = 1; U.wkrv = i0; wkVaultRe(); document.querySelectorAll('#ov .wkchs > *').forEach((b, j) => { if (j >= i0) b.classList.add('shk'); });
  const next = i => { if (!$('#ov .wkvault')) { U.wkbusy = 0; U.wkrv = null; return; } U.wkrv = i + 1; U.wkco = i; wkChestSnd(v.open[i], v.m); buzz(12); wkVaultRe(); U.wkco = -1; document.querySelectorAll('#ov .wkchs > *').forEach((b, j) => { if (j > i) b.classList.add('shk'); });
    if (i + 1 < n) setTimeout(() => next(i + 1), 560); else { U.wkbusy = 0; U.wkrv = null; } };
  setTimeout(() => next(i0), 480);
}

/* ---------- 1d.7 Vennene: resultatkortet ----------
   Alle som spiller samme uke, har samme kart, samme regel og samme motstandere (frøet fra uka, wkSeed), så et resultat kan sammenlignes rett
   fram: hvor langt kom du, med hvor mange billetter, og hvilken vei gikk du. Kortet tegnes i kode (øya, tall og tegn: ingenting fra pakken),
   og deles som bilde (navigator.share), lagres, eller kopieres som tekst. Ingen tjener, ingen konto. */
const WKPL = { tr: 'T', ac: 'A', gt: 'G', el: 'E', bs: 'B', bg: 'B', ev: '?', sp: 'S', tz: '$', en: 'R', sr: 'X' };
const wkFriKey = w => { const d = new Date(wkFri(w) + 'T12:00'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
const wkMetal = L => L.ms >= 4 ? 2 : L.ms >= 3 ? 1 : 0;
/* Stien som tegn: ett per rom, i den rekkefølgen du gikk (T trener, A ess, G portvakt, E en av de store, B boss, ? hendelse, S kilde, $ skatt, R møte, X det forseglede). */
function wkTrail(L) { const M = wkMap(L.w, L.ty); return (L.p || []).map(id => M.nodes[id]).filter(Boolean); }
function wkCardText(L) {
  const T = WKT[L.ty], tr = wkTrail(L), by = [1, 2, 3, 4, 5].map(z => tr.filter(n => n.z === z).map(n => WKPL[n.k] || '·').join('')).filter(Boolean).join(' | ');
  const res = L.how === 'won' ? 'cleared everything' : L.how === 'lost' ? 'fell in ' + wkZn(L.ty, Math.min(5, L.ms + 1)) : 'headed home';
  return [`Fokusdex Expedition · ${T.n} · ${wkFriKey(L.w)}`, `Tickets ${'●'.repeat(L.t)}${'○'.repeat(WKMAX - L.t)}  Zones ${'■'.repeat(L.ms)}${'□'.repeat(WKMAX - L.ms)}`,
    `${L.wins} ${L.wins === 1 ? 'win' : 'wins'} · ${res} · ${WKVN[wkMetal(L)]} vault${L.got ? ` · ${L.got === 2 ? 'Gold' : 'Silver'} Symbol` : ''}${L.exit ? ` · exit ${L.exit}` : ''}${(L.snag || []).length ? ` · ${L.snag.length} snagged` : ''}`,
    by ? `Path ${by}` : '', 'Same map for everyone this week. How far do you get?'].filter(Boolean).join('\n');
}
function wkCardDraw(L) {
  const T = WKT[L.ty], cv = document.createElement('canvas'), W = 1080, H = 1480; cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), font = (px, w) => `${w || 600} ${px}px ${getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'}`, m = wkMetal(L), MC = ['#c08a5a', '#cfd5e2', '#f0c987'];
  const text = (s, x, y, f, c, al) => { g.font = f; g.fillStyle = c; g.textAlign = al || 'left'; g.fillText(s, x, y); }, rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const DIM = 'rgba(255,255,255,.5)', INK = '#f4f1fa';
  g.fillStyle = '#0d0b18'; g.fillRect(0, 0, W, H);
  /* Øya, slik den så ut den uka (alltid natt på kortet), i store piksler. */
  const ic = document.createElement('canvas'), ih = Math.round(W * WKIH / WKIW); ic.width = WKIW; ic.height = WKIH; ic._o = { ph: 'night', ty: L.ty, tix: L.t, bare: 1 }; wkIsleFrame(ic, 4000);
  g.imageSmoothingEnabled = false; g.drawImage(ic, 0, 0, WKIW, WKIH, 0, 0, W, ih);
  const gr = g.createLinearGradient(0, ih - 300, 0, ih); gr.addColorStop(0, 'rgba(13,11,24,0)'); gr.addColorStop(0.75, 'rgba(13,11,24,.9)'); gr.addColorStop(1, '#0d0b18'); g.fillStyle = gr; g.fillRect(0, ih - 300, W, 302);
  const g2 = g.createLinearGradient(0, 0, 0, 200); g2.addColorStop(0, 'rgba(13,11,24,.85)'); g2.addColorStop(1, 'rgba(13,11,24,0)'); g.fillStyle = g2; g.fillRect(0, 0, W, 200);
  text('FOKUSDEX · EXPEDITION', 64, 84, font(30, 700), 'rgba(255,255,255,.75)'); text(wkFriKey(L.w).toUpperCase(), W - 64, 84, font(30, 700), 'rgba(255,255,255,.75)', 'right');
  text(T.n, 64, ih - 44, font(84, 700), INK); text(T.rule, 64, ih + 12, font(36, 500), T.c);
  /* Billettene som lykter, og sonene som fem ruter. */
  let y = ih + 84;
  text('TICKETS', 64, y, font(23, 700), DIM); text('ZONES', 420, y, font(23, 700), DIM);
  for (let i = 0; i < WKMAX; i++) { rr(64 + i * 58, y + 20, 38, 52, 12); g.fillStyle = i < L.t ? '#f0c987' : 'rgba(255,255,255,.1)'; g.fill(); if (i < L.t) { g.fillStyle = 'rgba(255,246,214,.9)'; rr(64 + i * 58 + 8, y + 28, 22, 18, 6); g.fill(); } }
  for (let z = 1; z <= WKMAX; z++) { const x = 420 + (z - 1) * 122; rr(x, y + 20, 106, 52, 14); g.fillStyle = z <= L.ms ? T.c : z <= L.t ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)'; g.fill(); text(String(z), x + 53, y + 57, font(30, 700), z <= L.ms ? '#14111f' : 'rgba(255,255,255,.45)', 'center'); }
  /* Tallene. */
  y += 112; [[String(L.wins), L.wins === 1 ? 'win' : 'wins'], [String(L.steps), L.steps === 1 ? 'room' : 'rooms'], [WKVN[m], 'vault']].forEach((c, i) => { const x = 64 + i * 326; rr(x, y, 300, 136, 28); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); text(c[0], x + 150, y + 76, font(60, 700), i === 2 ? MC[m] : INK, 'center'); text(c[1], x + 150, y + 114, font(27, 500), 'rgba(255,255,255,.6)', 'center'); });
  /* Symbolet, veien ut eller fangsten: det ukestypen ga. */
  y += 196; const extra = L.got ? `${L.got === 2 ? 'Gold' : 'Silver'} Symbol of the ${T.n}` : L.exit ? `The way out: step ${L.exit} of 5` : (L.snag || []).length ? `Snagged: ${L.snag.map(id => 'Shadow ' + D(id)[0]).join(', ')}` : L.how === 'won' ? 'Cleared everything the tickets opened' : L.how === 'lost' ? `Fell in ${wkZn(L.ty, Math.min(5, L.ms + 1))}` : 'Headed home';
  if (L.got) { g.save(); g.translate(64, y - 46); g.scale(1.5, 1.5); g.fillStyle = L.got === 2 ? '#f0c987' : '#cfd5e2'; g.fill(new Path2D('M20 2l16 9.5v21L20 42 4 32.5v-21z')); g.strokeStyle = '#14111f'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D(WKSYP[L.ty] || '')); g.restore(); }
  text(extra, L.got ? 148 : 64, y, font(34, 600), INK);
  /* Stien, sone for sone: ett tegn per rom. */
  y += 70; text('PATH', 64, y, font(23, 700), DIM);
  const tr = wkTrail(L); let x = 64; y += 18;
  tr.forEach((n, i) => { if (i && tr[i - 1].z !== n.z) x += 16; if (x > W - 116) return; rr(x, y, 50, 50, 15); g.fillStyle = WKFIGHT.has(n.k) ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.05)'; g.fill(); if (n.k === 'bs' || n.k === 'bg') { g.strokeStyle = n.k === 'bg' ? '#f0c987' : '#cfd5e2'; g.lineWidth = 3; g.stroke(); } text(WKPL[n.k] || '·', x + 25, y + 36, font(29, 700), n.k === 'ac' || n.k === 'tz' ? '#f0c987' : n.k === 'ev' ? '#c9b3ff' : n.k === 'sp' ? '#8fd6d0' : '#e8e4f2', 'center'); x += 57; });
  /* Laget og bunnlinja. */
  y += 108; const names = (L.tm || []).map(id => D(id)[0]).join(' · ');
  if (names) { text(`TEAM${L.lv ? ' · LV ' + L.lv : ''}`, 64, y, font(23, 700), DIM); g.font = font(31, 500); let q = names; while (g.measureText(q).width > W - 128 && q.length > 8) q = q.slice(0, -2); text(q === names ? q : q + '…', 64, y + 44, font(31, 500), '#e8e4f2'); }
  text('Same map for everyone this week. How far do you get?', 64, H - 50, font(27, 500), 'rgba(255,255,255,.55)');
  return cv;
}
function wkShareSheet() {
  const W = wkSt(), L = W.last;
  if (!L) return openSheet(`<div class="wkih"><span class="wkn k-ev stat" aria-hidden="true">${wkGl('fr')}</span><div class="sp"><div class="wk-k">Expedition</div><h2 class="h" style="margin:0">Friends</h2></div></div>
    <p class="sm">${tl('Everyone who plays the same week gets the same map, the same rule and the same opponents. When your first expedition is over, your result card shows up here, ready to share.')}</p><button type="button" class="btn wide" data-a="close">Close</button>`);
  let url = ''; try { url = wkCardDraw(L).toDataURL('image/png'); } catch (_) {}
  const can = typeof navigator !== 'undefined' && !!navigator.share;
  openSheet(`<div class="wkih" style="--wc:${WKT[L.ty].c}"><span class="wkn k-ev stat" aria-hidden="true">${wkGl('fr')}</span><div class="sp"><div class="wk-k">${esc(WKT[L.ty].n)} · ${esc(wkFriKey(L.w))}</div><h2 class="h" style="margin:0">Your result card</h2></div></div>
    ${url ? `<img class="wkcardi" id="wkcardi" alt="Result card: ${esc(wkCardText(L).split('\n').slice(0, 3).join('. '))}" src="${url}">` : ''}
    <p class="sm">${tl('Same week, same map, same rule and the same opponents for everyone. Send it to a friend and compare how far you got and which way you went.')}</p>
    <div class="acts">${can ? '<button type="button" class="btn gold" data-a="wkshgo">Share</button>' : ''}<button type="button" class="btn${can ? '' : ' gold'}" data-a="wkshdl">Save image</button><button type="button" class="btn nf" data-a="wkshtx">Copy as text</button></div>
    <button type="button" class="btn wide nf" data-a="close">Close</button>`);
}
const wkCardBlob = L => new Promise(r => { try { wkCardDraw(L).toBlob(b => r(b), 'image/png'); } catch (_) { r(null); } });
async function wkShareGo() {
  const L = wkSt().last; if (!L) return; const b = await wkCardBlob(L), name = `fokusdex-expedition-${wkFri(L.w)}.png`, text = wkCardText(L);
  try { const f = b && typeof File !== 'undefined' ? new File([b], name, { type: 'image/png' }) : null; if (f && navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text }); else await navigator.share({ text }); } catch (e) { if (!e || e.name !== 'AbortError') toast('Sharing did not work here. Save the image instead.'); }
}
async function wkShareSave() {
  const L = wkSt().last; if (!L) return; const b = await wkCardBlob(L); if (!b) return toast('The image could not be made here.');
  const a = document.createElement('a'), u = URL.createObjectURL(b); a.href = u; a.download = `fokusdex-expedition-${wkFri(L.w)}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Saved.');
}
async function wkShareText() { const L = wkSt().last; if (!L) return; try { await navigator.clipboard.writeText(wkCardText(L)); toast('Copied.'); } catch (_) { toast('Copying did not work here.'); } }

/* ---------- 1d.8 Arket på studiedag 10 ----------
   Ett ark, én gang (S.wk.d10), når modusen åpner: øya i piksler, tre korte linjer og veien dit. Kalles i kjeden av ark etter forsiden (ui.js). */
function wkDay10(force) {
  if (!force && (!S.started || S.timer || !$('#sheet').hidden || !$('#ov').hidden || wkSbx() || !wkOn())) return false;
  const W = wkSt(); if (!force) { if (W.d10) return false; W.d10 = 1; save(true); }
  const N = wkNow() || { ty: wkType(wkIdx(dayKey())), tix: 0 }, T = WKT[N.ty];
  const row = (g, h, s) => `<div class="wkdr"><span class="wkmg">${wkGl(g)}</span><span class="sp"><b>${h}</b><span class="sm">${s}</span></span></div>`;
  openSheet(`<div class="wkd10" style="--wc:${T.c}"><div class="wkis"><canvas id="wkd10c" width="${WKIW}" height="${WKIH}" role="img" aria-label="Frontier Island"></canvas></div>
    <span class="wk-k">${tl('Study day {n}', { n: WKDAY })}</span><h2 class="h" style="margin:2px 0 6px">The Expedition</h2>
    <p class="sm">${tl('Ten study days in. From now on a portal opens once a week, to an island where the battles are not like the others.')}</p>
    ${row('sp', tl('A ticket for every study day'), tl('{min} minutes of focus lights one, five at most in a week. It is about showing up, not about studying the most.', { min: OPENMIN }))}
    ${row('is', tl('Friday, after Done for today'), tl('Choose the Expedition as the mode for the day. Saturday works too. A new place and a new rule every week.'))}
    ${row('tz', tl('More tickets open more'), tl('More of the map and more chests in the vault, never tougher battles. Miss a week, and the tickets stay with you.'))}
    <div class="acts" style="margin-top:12px"><button type="button" class="btn gold" data-a="wkisle">See the island</button><button type="button" class="btn nf" data-a="close">Later</button></div></div>`);
  wkIsleRun($('#wkd10c'), { ph: wkPhase(wkHour()), ty: N.ty, tix: N.tix || 0 });
  if (!force) sfx.event();
  return true;
}

Object.assign(WA, {
  wkisle: () => wkGo(), wkout: () => wkOut(), wkskip: () => { if (U.wkskip) U.wkskip(); },
  wkhome: () => { closeSheet(); wkIsle(); },
  wkintok: () => { const w = $('#wkisw'), i = $('#wkint'); if (w) w.classList.remove('intro'); if (i) { i.classList.add('gone'); setTimeout(() => i.remove(), 380); } sfx.ok(); },
  wkmode: () => { closeSheet(); closeOv(); render(); if (wkOffer() && !modeOn('week') && typeof BA !== 'undefined' && BA.mopen && !(S.mode && S.mode.day === S.lad.day && (S.mode.ks || []).length)) BA.mopen(); },
  wkrew: () => wkRewardSheet(), wksyms: () => wkSymsSheet(), wksite: el => wkSiteSheet(el.dataset.k),
  wkshare: () => wkShareSheet(), wkshgo: () => { wkShareGo(); }, wkshdl: () => { wkShareSave(); }, wkshtx: () => { wkShareText(); },
  sbxwkd: () => wkDay10(1),
  sbxwkh: el => { const h = +el.dataset.k; U.wkhr = h < 0 ? null : h; sbxWkRe(); if ($('#ov .wkisw')) wkIsle(); }
});
Object.assign(LNO, {
  'This week': 'Denne uka', '{n} of {m} zones open. The run starts when you pick your first room.': '{n} av {m} soner er åpne. Løpet starter når du velger det første rommet.',
  'Done for this week. See how it went.': 'Ferdig for denne uka. Se hvordan det gikk.', 'Open today: choose the Expedition as the mode for the day.': 'Åpen i dag: velg ekspedisjonen som dagens modus.',
  'Opens today, after Done for today.': 'Åpner i dag, etter Done for today.', 'Opens on Friday, after Done for today.': 'Åpner fredag, etter Done for today.',
  'One chest to open': 'Én kiste å åpne', '{n} chests to open': '{n} kister å åpne', 'What the tickets open': 'Det billettene åpner', 'Share your result': 'Del resultatet ditt', 'The same map for all': 'Samme kart for alle',
  'Frontier Brain {n} waits at the end of the map.': 'Frontier Brain {n} venter i enden av kartet.', 'A rift has opened above the island. Nobody knows how deep it goes.': 'En rift har åpnet seg over øya. Ingen vet hvor dypt den går.',
  'Someone out on the skerry is turning Pokémon into shadows.': 'Noen ute på skjæret gjør Pokémon om til skygger.',
  '{n} tickets: {n} of {m} zones are open, and {n} chests wait in the vault.': '{n} billetter: {n} av {m} soner er åpne, og {n} kister venter i hvelvet.', 'One ticket: the first zone is open, and one chest waits in the vault.': 'Én billett: den første sonen er åpen, og én kiste venter i hvelvet.', 'No tickets yet. Every study day of {min} minutes lights one.': 'Ingen billetter ennå. Hver studiedag på {min} minutter tenner én.',
  'Every ticket opens one more zone of the map, and puts one more chest in the vault at the end.': 'Hver billett åpner én sone til på kartet, og legger én kiste til i hvelvet til slutt.',
  'The vault: bronze at first, silver when the boss of the third zone is beaten, gold after the gold battle. The first chest holds the purse, so even a short week pays like a battle day.': 'Hvelvet: bronse først, sølv når bossen i den tredje sonen er slått, gull etter gullkampen. Den første kista har pungen, så også en kort uke gir som en kampdag.',
  'In the vault every week: Mints, Gold Bottle Caps, rare moves for the tutors and rare encounters.': 'I hvelvet hver uke: Mints, Gold Bottle Caps, sjeldne angrep til lærerne og sjeldne møter.',
  'Silver for beating a Frontier Brain, with three tickets. Gold on the gold road, with four. Each facility comes round every twelve weeks.': 'Sølv for å slå en Frontier Brain, med tre billetter. Gull på gullveien, med fire. Hvert anlegg kommer igjen hver tolvte uke.',
  'Everyone who plays the same week gets the same map, the same rule and the same opponents. When your first expedition is over, your result card shows up here, ready to share.': 'Alle som spiller samme uke, får samme kart, samme regel og samme motstandere. Når den første ekspedisjonen din er over, står resultatkortet ditt her, klart til å deles.',
  'Same week, same map, same rule and the same opponents for everyone. Send it to a friend and compare how far you got and which way you went.': 'Samme uke, samme kart, samme regel og samme motstandere for alle. Send det til en venn, og sammenlign hvor langt dere kom og hvilken vei dere gikk.',
  'Study day {n}': 'Studiedag {n}', 'Ten study days in. From now on a portal opens once a week, to an island where the battles are not like the others.': 'Ti studiedager inne. Fra nå av åpner en portal seg én gang i uka, til en øy der kampene ikke er som de andre.',
  'A ticket for every study day': 'En billett for hver studiedag', '{min} minutes of focus lights one, five at most in a week. It is about showing up, not about studying the most.': '{min} minutter med fokus tenner én, høyst fem i uka. Det handler om å møte opp, ikke om å studere mest.',
  'Friday, after Done for today': 'Fredag, etter Done for today', 'Choose the Expedition as the mode for the day. Saturday works too. A new place and a new rule every week.': 'Velg ekspedisjonen som dagens modus. Lørdag går også. Et nytt sted og en ny regel hver uke.',
  'More tickets open more': 'Flere billetter åpner mer', 'More of the map and more chests in the vault, never tougher battles. Miss a week, and the tickets stay with you.': 'Mer av kartet og flere kister i hvelvet, aldri tøffere kamper. Går du glipp av en uke, følger billettene med deg.',
  'The purse': 'Pungen', 'Visit the island': 'Besøk øya'
});
