'use strict';
/* Fokusdex – ekspedisjonen på skjermen (steg 1d): billettene på forsiden, kortet for dagens modus, kartet, rommene og oppsummeringen.
   Reglene ligger i week.js. Kartet er en mørk sone (.ov.wkov), som kampene: det er natt på øya uansett hva appen ellers er stilt til.
   Hjemskjermen på øya, portalen og musikken kommer i steg 1d.6; her er kartet det første du ser. */

/* Tegnene for rommene (24 × 24). f = fylt. Bossen viser bildet sitt i stedet. */
const WKIC = {
  tr: [0, 'M5 19L17 7m0 0h-4m4 0v4M19 19L7 7m0 0h4M7 7v4'], ac: [1, 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z'], gt: [0, 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4'],
  el: [0, 'M4 18h16l1-10-5 4-4-7-4 7-5-4zM4 21h16'], bs: [1, 'M4 18h16l1-10-5 4-4-7-4 7-5-4z'], bg: [1, 'M4 18h16l1-10-5 4-4-7-4 7-5-4z'], sp: [0, 'M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z'],
  tz: [0, 'M4 11h16v8H4zM4 11c0-3 2-5 5-5h6c3 0 5 2 5 5M11 10h2v4h-2z'], en: [0, 'M4 20c1-5 2-8 3-10 0 4 1 7 2 10M10 20c0-7 1-11 2-14 1 3 2 7 2 14M15 20c1-3 2-6 2-10 1 2 2 5 3 10'],
  sr: [0, 'M12 3l8 9-8 9-8-9zM12 8v8M8 12h8'], lk: [0, 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z'], ok: [0, 'M5 12.5l4.5 4.5L19 7.5']
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
  const N = typeof wkNow === 'function' ? wkNow() : null; if (!N || N.on) return '';
  const T = WKT[N.ty];
  const line = N.run ? tl('Your expedition waits. It can go on until Saturday is over.')
    : N.played ? tl('Done for this week. Next week: {n}.', { n: WKT[N.next].n })
    : N.offer ? tl('Open now: choose it as the mode for the day.')
    : N.late ? tl('Last day: open the battles today to set out.')
    : N.today ? (N.tix ? tl('Today, after Done for today.') : tl('Today: {min} minutes of focus gives your ticket.', { min: OPENMIN }))
    : N.tix ? (N.left ? tl('Friday. Every study day until then lights one more.') : tl('Friday. All five are lit.'))
    : tl('Friday. Every study day of {min} minutes lights a ticket.', { min: OPENMIN });
  return `<button type="button" class="card wks${N.offer ? ' go' : ''}" data-a="wkinfo" style="--wc:${T.c}" aria-label="Expedition: ${esc(T.n)}. ${N.tix} of ${WKMAX} tickets. ${esc(line)}">${wkEmb(T.c)}<span class="sp"><span class="wk-k">Expedition</span><b>${esc(T.n)}</b><span class="sm">${line}</span></span>${N.played ? '' : wkLights(N.tix, N.stars)}</button>`;
}
function wkCard() {
  const V = wkView(), W = wkSt(), L = W.last, shut = dayShut();
  const head = (c, n, sub, right) => `<div class="mode-h">${wkEmb(c)}<span class="sp"><b>Expedition</b><span class="sm tn">${sub}</span></span><button type="button" class="hq" data-a="wkinfo" aria-label="About the Expedition">i</button></div>${right ? `<div class="mode-t">${right}</div>` : ''}`;
  if (!V || (!V.R && shut)) {
    const T = WKT[L ? L.ty : wkType(wkIdx(S.lad.day || dayKey()))];
    return `<div class="card mode wkc" id="mode-week" style="--wc:${T.c}">${head(T.c, T.n, esc(T.n))}<p class="sm">${shut && !L ? tl('No expedition this time. Your tickets stay with you.') : L ? esc(wkLastLine(L)) : ''}</p>${L && !shut ? '<button type="button" class="btn wide" data-a="wkend">See how it went</button>' : ''}</div>`;
  }
  const R = V.R, T = V.T, z = R ? Math.min(WKZN.length - 1, R.ms + 1) : 1;
  return `<div class="card mode wkc" id="mode-week" style="--wc:${T.c}">${head(T.c, T.n, `${esc(T.n)}${R ? ` · ${esc(WKZN[z])} · ${R.got.wins} ${R.got.wins === 1 ? 'win' : 'wins'}` : ''}`, `<span class="pill tn au">Coins ×${smFor('week')}</span>${wkLights(V.t, V.stars)}`)}
    ${R ? wkTeamEl(R) : `<p class="sm">${tl('A map with paths you choose between. No healing between the battles, so pick your way with care.')}</p>`}
    <button type="button" class="go gold" data-a="wkopen">${R ? 'Continue the expedition' : 'Enter'}</button>${R ? '' : '<button type="button" class="btn wide nf" data-a="skipday">Not today · the tickets stay</button>'}</div>`;
}
/* Kortet i valget av dagens modus (modeSheet i bui.js): står øverst, i ukas farge. */
function wkModeCard(o, sel) {
  const T = WKT[wkType(o.r)];
  return `<button type="button" class="mdc wkm${sel ? ' on' : ''}" data-a="msel" data-k="week" aria-pressed="${!!sel}" style="--wc:${T.c}">
    <span class="mdc-top">${wkEmb(T.c)}<span class="sp"><b>Expedition <i class="mdc-st">${o.run ? 'In progress' : 'This week'}</i></b><span class="sm tn">${esc(T.n)} · ${tl('a map to explore, once a week')}</span></span>${wkLights(o.tix, wkStars(o.r))}</span>
    <span class="mdc-f"><span class="pill tn">Coins ×${smFor('week')}</span><span class="sm">${o.run ? tl('Your run goes on where it was') : tl('{n} of {m} zones open · the tickets are used', { n: o.tix, m: WKMAX })}</span></span></button>`;
}
const wkLastLine = L => L.how === 'won' ? tl('You cleared everything your {t} tickets opened: {n} wins.', { t: L.t, n: L.wins }) : L.how === 'lost' ? tl('The expedition ended in the {z}, after {n} wins. What you won is yours.', { z: WKZN[Math.min(5, L.ms + 1)].toLowerCase(), n: L.wins }) : tl('You headed home after {n} wins. What you won is yours.', { n: L.wins });
/* Laget i løpet: bildene med HP-strek, de som er slått ut i grått. */
const wkHpCol = f => f > 0.5 ? '#6fd08a' : f > 0.2 ? '#f0c95a' : '#ef7a6a';
const wkTeamEl = R => `<div class="wkt" role="img" aria-label="Your team in the expedition">${wkTeam(R).map(x => `<span class="${x.h <= 0 ? 'ko' : ''}">${spr(x.m.id, { sh: x.m.sh, mega: x.m.mega, s: '34px' })}<i><i style="width:${Math.round(x.h * 100)}%;background:${wkHpCol(x.h)}"></i></i></span>`).join('')}</div>`;

/* ---------- Arket om ekspedisjonen ---------- */
function wkInfoSheet() {
  const N = wkNow(); if (!N) return;
  const T = WKT[N.ty], zs = [tl('The outer halls: a short map and a gatekeeper'), tl('The inner halls: more paths, events and treasure'), T.fac ? tl('The Frontier Brain, and the Silver Symbol') : tl('The one who waits at the end'), T.fac ? tl('The gold road: the Brain at full strength, and the Gold Symbol') : tl('The road beyond'), tl('The sealed room')];
  openSheet(`<div class="wkih" style="--wc:${T.c}">${wkEmb(T.c)}<div class="sp"><div class="wk-k">Expedition · ${esc(wkDayName(N.fri))}</div><h2 class="h" style="margin:0">${esc(T.n)}</h2></div>${wkLights(N.tix, N.stars, 'lg')}</div>
    <p class="sm">${tl('Once a week, on Friday after Done for today, you can set out on an expedition instead of the usual modes. Saturday works too.')}</p>
    <p class="sm">${tl('Every study day of {min} minutes lights one ticket, five at most. Each ticket opens one more zone of the map. The battles are the same however many you have.', { min: OPENMIN })}</p>
    <div class="wkzl" style="--wc:${T.c}">${zs.map((z, i) => `<div class="${i < N.tix ? 'on' : ''}"><i>${i + 1}</i><span>${z}</span></div>`).join('')}</div>
    <p class="sm">${tl('Miss both days, and the tickets stay with you and fill up next week. Nothing is lost.')}</p>
    ${N.stars ? `<p class="sm" style="color:var(--gold)">${tl('Weekend study in exam season: a few more coins on the expedition.')}</p>` : ''}
    <p class="sm tn">${tl('Next week: {n}.', { n: WKT[N.played ? N.next : wkType(N.r + 1)].n })}</p>
    <button type="button" class="btn wide" data-a="close">Close</button>`);
}

/* ---------- Kartet ----------
   Radene står nedenfra og opp (WKROWH per rad). Hver node er en knapp: et trykk åpner arket for rommet (wkNodeSheet).
   Tilstandene: now = der du står · open = hit kan du gå nå · done = stien du har gått · off = veier du gikk forbi · lock = soner over billettene. */
const WKROWH = 78;
function wkScreen() {
  const V = wkView(); if (!V) return wkSt().last ? wkEndScreen() : (closeOv(), render());
  const { M, R, t, T } = V, H = M.rows.length * WKROWH + 26, y = n => Math.round(H - 14 - (n.r + 0.5) * WKROWH + n.dy * 16), path = new Set(V.path), reach = new Set(V.reach);
  /* Det som fortsatt kan nås fra der du står. */
  const can = new Set(V.at < 0 ? M.rows[0].map(n => n.id) : [V.at]); { const q = Array.from(can); while (q.length) for (const j of M.nodes[q.pop()].to) if (!can.has(j)) { can.add(j); q.push(j); } }
  const cls = n => n.z > t ? 'lock' : n.id === V.at ? 'now' : path.has(n.id) ? 'done' : reach.has(n.id) ? 'open' : can.has(n.id) ? '' : 'off';
  const boss = wkBoss(M), bimg = POOL[boss[0]][boss[1]][1];
  const edges = M.nodes.map(a => a.to.map(j => { const b = M.nodes[j], walked = path.has(a.id) && path.has(b.id) && V.path.indexOf(b.id) === V.path.indexOf(a.id) + 1, open = a.id === V.at && reach.has(b.id), dead = a.z > t || b.z > t || !can.has(b.id) || !(can.has(a.id) || path.has(a.id));
    return `<line x1="${(a.x * 100).toFixed(1)}" y1="${y(a)}" x2="${(b.x * 100).toFixed(1)}" y2="${y(b)}" class="${walked ? 'w' : open ? 'o' : dead ? 'd' : ''}"/>`; }).join('')).join('');
  const zones = [1, 2, 3, 4, 5].map(z => { const rs = M.rows.filter(r => r[0].z === z), top = H - 14 - (rs[rs.length - 1][0].r + 1) * WKROWH, lk = z > t;
    return `<div class="wkz${lk ? ' lock' : ''}" style="top:${top}px;height:${rs.length * WKROWH}px"><span>${lk ? wkGl('lk') : ''}${esc(WKZN[z])}${lk ? ` · ${z} tickets` : ''}</span></div>`; }).join('');
  const nodes = M.nodes.map(n => { const c = cls(n), big = n.k === 'bs' || n.k === 'bg' || n.k === 'sr';
    return `<button type="button" class="wkn k-${n.k} ${c}${big ? ' big' : ''}" data-a="wknode" data-k="${n.id}" style="left:${(n.x * 100).toFixed(1)}%;top:${y(n)}px" aria-label="${esc(WKNN[n.k])}${c === 'open' ? ', you can go here' : c === 'now' ? ', you are here' : c === 'lock' ? ', needs ' + n.z + ' tickets' : ''}">${(n.k === 'bs' || n.k === 'bg') && c !== 'lock' ? tsprite(bimg) : wkGl(n.k)}${c === 'done' ? `<span class="wkok">${wkGl('ok')}</span>` : ''}</button>`; }).join('');
  const me = V.at >= 0 ? M.nodes[V.at] : null, p = partner();
  const hint = V.pend ? tl('You are in the middle of this room.') : !R ? tl('Pick your first room. From there the paths decide where you can go.') : tl('Pick your next room.');
  ov(`<div class="row wktop"><button type="button" class="btn sm2" data-a="home">${icn('back')}Back</button><span class="sp wk-h"><span class="wk-k">Expedition</span><b>${esc(T.n)}</b></span>${wkLights(t, V.stars)}</div>
    ${wkTeamEl(R)}
    <div class="wkmap" id="wkmap" style="height:${H}px">${zones}<svg class="wke" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${nodes}
      ${me && p ? `<span class="wkme" style="left:${(me.x * 100).toFixed(1)}%;top:${y(me)}px">${spr(p.id, { sh: p.sh, s: '30px' })}</span>` : `<span class="wkgate" style="top:${H - 12}px">${tl('The gate')}</span>`}</div>
    <div class="acts wkacts"><p class="sm">${hint}</p>${V.pend ? `<button type="button" class="btn gold" data-a="wknode" data-k="${V.at}">Continue</button>` : ''}${R && !V.pend ? '<button type="button" class="btn nf" data-a="wkleave">Head home</button>' : ''}</div>`, 'wkov', T.c);
  const to = $('#ov .wkn.now') || $('#ov .wkn.open'); if (to && to.scrollIntoView) to.scrollIntoView({ block: 'center' });
  wkPort([bimg], () => document.querySelectorAll('#ov .wkn.big .tsb').forEach(x => { x.outerHTML = tsprite(bimg); }));
}

/* ---------- Et rom ----------
   Arket viser hva rommet er, og knappen går inn. For en kamp velger du hvem som går ut først (BT.lead) blant dem som står.
   Kan du ikke gå dit (ennå), sier arket hvorfor. */
function wkNodeSheet(id) {
  const V = wkView(); if (!V) return;
  const nd = V.M.nodes[id]; if (!nd) return;
  const R = V.R, here = !!V.pend && V.at === id, can = here || V.reach.includes(id), fight = WKFIGHT.has(nd.k), T = V.T;
  if (here && nd.k === 'ev') return wkEventSheet(id);
  const why = nd.z > V.t ? tl('This zone opens with {n} tickets. Every study day lights one.', { n: nd.z }) : V.path.includes(id) ? tl('You have been here.') : V.pend ? tl('Finish the room you are in first.') : tl('You are not there yet: the paths decide where you can go.');
  let body = '', go = '';
  if (fight) {
    const lv = R ? R.flv : Math.max(5, Math.min(100, Math.round(Math.max(5, Math.round(leagueLv())) * (1 + diff().rel)))), f = wkFoe(V.M, nd, lv), known = nd.k === 'bs' || nd.k === 'bg', seen = R && R.sc === id;
    const team = wkTeam(R), alive = team.filter(x => x.h > 0);
    if (!alive.some(x => x.m.u === BT.lead)) BT.lead = alive.length ? alive[0].m.u : 0;
    body = `<div class="wkfoe">${known ? tsprite(f.tr.img) : nd.k === 'el' ? '<span class="tsb qmb" aria-hidden="true"><i>?</i></span>' : tsprite(f.tr.img)}<div class="sp"><b>${known ? esc(who(f.tr)) : nd.k === 'el' ? 'Who is it?' : esc(f.tr.n)}</b>
        <span class="sm tn">${f.team.length} Pokémon · Lv ${lv} · <span class="ty" style="background:var(--t${f.hint})">${TYN[f.hint]}</span></span><span class="sm tn" style="color:var(--gold)">Coins ×${smFor('week')}${nd.k === 'ac' ? ' · a better prize' : ''}</span></div></div>
      ${seen ? `<div class="wkscout"><span class="sm">${tl('The scout told you:')}</span>${f.team.map(m => spr(m.id, { s: '38px', mega: 0 })).join('')}</div>` : ''}
      ${can ? `<div class="lab">Your team · tap the one that leads</div><div class="wklu">${team.map(x => `<button type="button" data-a="wklead" data-u="${x.m.u}" data-k="${id}" class="${x.m.u === BT.lead ? 'lead' : ''}${x.h <= 0 ? ' ko' : ''}"${x.h <= 0 ? ' disabled' : ''} aria-pressed="${x.m.u === BT.lead}" aria-label="${esc(mName(x.m))}, ${x.h <= 0 ? 'fainted' : Math.round(x.h * 100) + ' % HP'}">${spr(x.m.id, { it: x.m.item, sh: x.m.sh, mega: x.m.mega, s: '40px' })}<b>${esc(mName(x.m))}</b><i class="wkhp"><i style="width:${Math.round(x.h * 100)}%;background:${wkHpCol(x.h)}"></i></i><span class="sm tn">${x.h <= 0 ? 'fainted' : x.m.u === BT.lead ? 'leads' : Math.round(x.h * 100) + ' %'}</span></button>`).join('')}</div>` : ''}`;
    if (!(nd.k === 'el' && !known)) wkPort([f.tr.img], () => { const x = $('#sheet .wkfoe .tsb'); if (x && !x.classList.contains('qmb')) x.outerHTML = tsprite(f.tr.img); });
    go = can ? `<button type="button" class="go gold" data-a="wkgo" data-k="${id}"${alive.length ? '' : ' disabled'}>${here ? 'Back into the battle' : 'Start battle'}</button><p class="sm tn" style="text-align:center">${tl('No Bag in here, and no healing after the battle.')}</p>` : '';
  } else go = can ? `<button type="button" class="go gold" data-a="wkdo" data-k="${id}">${{ ev: 'Step in', sp: 'Rest here', tz: 'Open it', en: 'Look closer', sr: 'Break the seal' }[nd.k] || 'Enter'}</button>` : '';
  openSheet(`<div class="wkih" style="--wc:${T.c}"><span class="wkn k-${nd.k} stat" aria-hidden="true">${wkGl(nd.k)}</span><div class="sp"><div class="wk-k">${esc(WKZN[nd.z])}</div><h2 class="h" style="margin:0">${esc(WKNN[nd.k])}</h2></div></div>
    <p class="sm">${tl(WKND[nd.k])}</p>${body}${can ? '' : `<p class="sm wkwhy">${why}</p>`}${go}<button type="button" class="btn wide${can ? ' nf' : ''}" data-a="close">${can ? 'Not yet' : 'Close'}</button>`);
}
/* En hendelse du har gått inn i: det du ser, og valgene. */
function wkEventSheet(id) {
  const V = wkView(); if (!V) return;
  const nd = V.M.nodes[id], E = WKEV[nd.e]; if (!E) return;
  openSheet(`<div class="wkih" style="--wc:${V.T.c}"><span class="wkn k-ev stat" aria-hidden="true">${wkGl('ev')}</span><div class="sp"><div class="wk-k">${esc(WKZN[nd.z])}</div><h2 class="h" style="margin:0">${esc(E.n)}</h2></div></div>
    <p class="wkevd">${tl(E.d)}</p>
    <div class="wkopts">${E.o.map((o, i) => `<button type="button" class="wkopt" data-a="wkpick" data-k="${id}" data-i="${i}"><b>${esc(o[0])}</b>${o[1] ? `<span class="sm">${tl(o[1])}</span>` : ''}</button>`).join('')}</div>`);
}
/* Det et rom ga: tittelen, det som skjedde, og premien som ikoner. Kartet tegnes på nytt under arket. */
function wkResultSheet(o) {
  const chips = (o.coins ? `<span class="coin rs-coin"><i></i><b class="tn">${nb(o.coins)}</b></span>` : '') + o.items.map(x => resItem(x, o.items.length <= 2)).join('') + (o.encs.length ? `<span class="rs-it enc"><span class="rs-ic">${icn('grass')}</span><b class="tn">${o.encs.length}</b><span class="rs-nm">in the grass</span></span>` : '');
  openSheet(`<div class="wkih"><span class="wkn k-${o.nd.k} stat" aria-hidden="true">${wkGl(o.nd.k)}</span><div class="sp"><div class="wk-k">${esc(WKZN[o.nd.z])}</div><h2 class="h" style="margin:0">${esc(o.t)}</h2></div></div>
    ${o.l.map(x => `<p class="wkevd">${esc(x)}</p>`).join('')}${chips ? `<div class="rs-l wkrs">${chips}</div>` : ''}
    <button type="button" class="btn wide gold" data-a="${o.end ? 'wkend' : 'close'}">${o.end ? 'The expedition is over' : 'Back to the map'}</button>`);
}
/* Løpet er over: hvor langt det gikk, og hva som venter neste uke. (Hvelvet med kistene kommer i steg 1d.5.) */
function wkEndScreen() {
  const W = wkSt(), L = W.last; if (!L) { closeOv(); return render(); }
  const T = WKT[L.ty], head = L.how === 'won' ? 'Expedition complete' : L.how === 'lost' ? 'The expedition ends here' : 'You headed home';
  ov(`<div class="row" style="justify-content:flex-end"><span class="pill tn">${esc(T.n)}</span></div>
    <div class="wkend"><div class="wk-k">Expedition</div><h1 class="big">${head}</h1><p class="mut" style="margin-top:8px">${esc(wkLastLine(L))}</p>
      <div class="wkzp" role="img" aria-label="${L.ms} of ${L.t} zones cleared">${[1, 2, 3, 4, 5].map(z => `<span class="${z <= L.ms ? 'on' : z <= L.t ? 'op' : ''}"><i>${z <= L.ms ? wkGl('ok') : z > L.t ? wkGl('lk') : ''}</i>${esc(WKZN[z])}</span>`).join('')}</div>
      <div class="gain"><div><b class="tn">${L.wins}</b><span class="sm">${L.wins === 1 ? 'win' : 'wins'}</span></div><div><b class="tn">+${nb(L.coins)}</b><span class="sm">coins</span></div><div><b class="tn">${L.steps}</b><span class="sm">${L.steps === 1 ? 'room' : 'rooms'}</span></div></div>
      ${L.sym ? `<p class="rs-hi">${tl('You earned the {m} Symbol of the {n}.', { m: L.sym === 2 ? 'Gold' : 'Silver', n: T.n })}</p>` : ''}
      <p class="sm">${tl('Next week: {n}. A new map, and new tickets from your study days.', { n: WKT[wkType(L.w + 1)].n })}</p></div>
    <div class="acts"><button type="button" class="btn pri" data-a="home">Done</button></div>
    ${SBX && !SBX.jp ? '<div class="row sbxacts"><button type="button" class="btn sp nf" data-a="lab">Sandbox</button></div>' : ''}`, 'wkov', T.c);
}

/* ---------- Sandkassa (Modes): start hvilken som helst ukestype med så mange billetter du vil ---------- */
const sbxWk = () => U.sbk || (U.sbk = { t: 3, ty: wkType(wkIdx(dayKey())) });
function sbxWeekCard() {
  const o = sbxWk(), R = SBX && !SBX.jp && SBX.wk ? wkSt().run : null;
  return `<div class="card stack" id="sbxwk"><div class="row" style="justify-content:space-between"><b class="h">Expedition</b>${R ? `<span class="pill tn">In the copy · ${esc(WKT[R.ty].n)}</span>` : '<span class="pill tn">The weekly mode</span>'}</div>
    <p class="sm">Pick the week type and how many tickets you have. The map is this week's, so it is the same every time you start the same type.</p>
    <div class="lab">Week type</div><div class="chips sbxo">${Object.keys(WKT).map(k => `<button type="button" class="chip" data-a="sbxwky" data-k="${k}" aria-pressed="${o.ty === k}">${esc(WKT[k].n.replace('Battle ', ''))}</button>`).join('')}</div>
    <div class="lab">Tickets</div><div class="sbxr" role="group" aria-label="Tickets">${[1, 2, 3, 4, 5].map(t => `<button type="button" data-a="sbxwkt" data-k="${t}" aria-pressed="${o.t === t}">${t}</button>`).join('')}</div>
    <p class="sm tn">${o.t} ${o.t === 1 ? 'ticket' : 'tickets'}: ${WKZN.slice(1, o.t + 1).map(z => z.toLowerCase()).join(', ')}. The rules that set the week types apart come in step 1d.4: for now they share the same map rules.</p>
    <button type="button" class="go gold" data-a="sbxwk">Set out · ${esc(WKT[o.ty].n)} · ${o.t} ${o.t === 1 ? 'ticket' : 'tickets'}</button>
    ${R ? '<button type="button" class="btn wide" data-a="wkopen">Continue the run in the copy</button>' : ''}</div>`;
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
  wkleave: el => { if (el.dataset.ok !== '1') { el.dataset.ok = '1'; el.textContent = 'Tap again: the expedition ends'; snd('warn'); return; } if (wkLeave()) wkEndScreen(); },
  wkend: () => { closeSheet(); wkEndScreen(); },
  sbxwky: el => { if (WKT[el.dataset.k]) sbxWk().ty = el.dataset.k; sbxWkRe(); },
  sbxwkt: el => { sbxWk().t = Math.max(1, Math.min(WKMAX, +el.dataset.k || 1)); sbxWkRe(); },
  sbxwk: () => {
    const o = sbxWk(); if (!sbxEnter()) return;
    sbxDay(); S.mode = { day: S.lad.day, ks: ['week'] }; SBX.wk = { t: o.t, ty: o.ty }; wkSt().run = null;
    sbxIn(`Sandbox: ${WKT[o.ty].n} with ${o.t} ${o.t === 1 ? 'ticket' : 'tickets'}.`, () => wkScreen());
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
