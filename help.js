'use strict';
/* Fokusdex – hjelp: startguiden for nye spillere, spørsmålshubben og forklaringen som kommer første gang du trener en Pokémon.
   Tekstene henter tallene fra de samme tabellene som spillet bruker, så de stemmer selv om reglene justeres.
   Hubben åpnes i ark-laget (over alt annet), så den kan åpnes fra hvor som helst uten at det du holdt på med, lukkes. */

/* ---------- Byggeklosser til forklaringene ---------- */
const hH = t => `<h3 class="hh">${t}</h3>`;
const hP = t => `<p class="hp">${t}</p>`;
const hNote = t => `<p class="hnote">${t}</p>`;
const hRow = (pic, title, text) => `<div class="hrow"><span class="hpic">${pic}</span><div class="sp"><b>${title}</b><p class="sm">${text}</p></div></div>`;
const hMon = (id, s, o) => spr(id, Object.assign({ s: s || '56px' }, o || {}));
const hSym = (t, c) => `<span class="hsym" style="--hc:${c || 'var(--gold)'}">${t}</span>`;
const hBar = (at, lo, hi) => `<div class="hbar"><span class="tn">×${lo}</span><span class="hbar-t"><i style="width:${Math.round(at * 100)}%"></i></span><span class="tn">×${hi}</span></div>`;
const hStars = n => `<span class="epot-s">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}" style="animation:none"></i>`).join('')}</span>`;
const hMeter = () => '<span class="meter hmeter" aria-hidden="true"><span class="z" style="left:36%;width:30%"></span><span class="g" style="left:47.5%;width:7%"></span><span class="m" style="left:58%"></span></span>';
const hMyPartner = () => { const p = typeof partner === 'function' ? partner() : null; return p ? p.id : 25; };
const hLink = (k, t) => `<button type="button" class="hlink" data-a="help" data-k="${k}">${t} ›</button>`;

/* ---------- Emnene ---------- */
const HELP = [
  { k: 'start', n: 'How it works', s: 'Study, collect, battle', ic: () => hMon(hMyPartner(), '40px'), body: () => `
    ${hP('Fokusdex turns your study time into a Pokémon adventure. The loop is the same every day:')}
    ${hRow(hSym('1', 'var(--sage)'), 'Study with the timer on', 'Every minute gives XP and coins. Your Pokémon level up while you work.')}
    ${hRow('<span class="grass live"><i></i><i></i><i></i><i></i></span>', 'Wild Pokémon show up', 'One for every 20 minutes. They wait in the grass until your session is done, and then you catch them.')}
    ${hRow(hSym('3', 'var(--gold)'), 'Battle when you are done', `Press <b>Done for today</b> and pick a battle mode. The more you studied today, the more the battles pay.`)}
    ${hNote('The game only gives. A day you skip costs you nothing, and nothing you own is ever taken away.')}
    <div class="hmore">${hLink('timer', 'Subjects and the timer')}${hLink('bonus', 'The battle bonus')}${hLink('modes', 'Battles')}</div>` },

  { k: 'timer', n: 'Subjects and the timer', s: 'What counts, and how a session works', ic: () => hSym('◷', 'var(--sage)'), body: () => `
    ${hH('Your subjects')}
    ${hP('Add up to four subjects under <b>Profile → Edit subjects</b>. Each one has a plan in hours and a badge that fills as you study it. The Pokémon types you pick for a subject show up more often in its sessions.')}
    ${hH('Other things')}
    ${hP(`Job applications, music, reading and the like can be logged too. They count at <b>half value</b> (×${OTHERW}), and their hours are kept apart from your subject hours.`)}
    ${hH('A session')}
    ${hRow(hSym('▶', 'var(--sage)'), 'Pick, then Start', 'Choose a subject and a length on the Focus page, and press Start. You can lock your phone: the timer follows the clock.')}
    ${hRow(hSym('❙❙', 'var(--ink2)'), 'Pause or finish early', 'Pause stops the clock. Finish now ends the session, and you are rewarded for the minutes you did.')}
    ${hRow(hSym('×1.5', 'var(--gold)'), 'Rested bonus', 'Your first session of the day gives one and a half times the XP and coins.')}
    ${hRow(hSym('zZ', 'var(--blue)'), 'A tired team', `Past your daily goal of ${hrs(S.cap)} hours your team is tired: half XP and no new encounters. Tomorrow it is rested again.`)}
    <div class="hmore">${hLink('bonus', 'The battle bonus')}${hLink('catch', 'Encounters and catching')}</div>` },

  { k: 'bonus', n: 'The battle bonus', s: 'How study time multiplies your winnings', ic: () => hSym('×', 'var(--gold)'), body: () => { const g = goalMin(), top = goalTop(), now = studyMult(); return `
    ${hP('Every minute you study today raises <b>today\'s battle bonus</b>. It multiplies the coins you win in battles.')}
    ${hBar(Math.min(1, (S.lad.day ? ladMin() : todayMin()) / g), 0.5, top.toFixed(1))}
    ${hP(`With no study the bonus is ×0.5. It grows evenly and peaks at <b>×${top.toFixed(1)}</b> when you reach your goal of ${hrs(g)} hours. Right now it is <b>×${now}</b>.`)}
    ${hH('A higher goal, a higher peak')}
    <div class="hgrid">${[120, 240, 360, 480].map(c => `<span class="${S.cap === c ? 'on' : ''}"><b class="tn">${c / 60} h</b><span class="sm tn">×${topFor(c).toFixed(1)}</span></span>`).join('')}</div>
    ${hP('Set your goal under <b>Profile → Daily goal</b>. Pick one you can reach on a normal day: the bonus is counted against your own goal.')}
    ${hH('What else multiplies coins')}
    ${hRow(hSym('★', 'var(--gold)'), `Today's bonus mode: ×${DAYCOIN}`, 'One of the three battle modes pays extra each day. You see which when you choose.')}
    ${hRow(hSym('◎', 'var(--gold)'), `Gold Rush event: ×${EVCOIN}`, 'One of the special events.')}
    ${hRow(hSym('2×', 'var(--sage)'), 'First League win of the day', 'Pays double.')}
    ${hRow(hSym('⚑', 'var(--red)'), 'Difficulty', DIFF.map(d => `${d.n} ×${d.coin}`).join(' · ') + '. Change it under Profile.')}` ; } },

  { k: 'catch', n: 'Encounters and catching', s: 'Rarity, throws, and what a catch gives', ic: () => ballEl('poke', '30px'), body: () => `
    ${hH('Where they come from')}
    ${hP('A session finds one Pokémon for every 20 minutes, and one more if you finish a session of 25 minutes or longer. Longer sessions find rarer ones. Battles and packs give encounters too. They all wait in the grass until you have time.')}
    ${hH('Rarity')}
    <div class="hgrid tiers">${TIERS.map((t, i) => `<span><b class="tier r${i}">${t}</b><span class="sm tn">+${NEWCOIN[i]}</span></span>`).join('')}</div>
    ${hP('The number is the coins a <b>new species</b> gives the first time you catch it. Before you step in, the dots at the top show what is waiting, by colour.')}
    ${hH('Throwing')}
    ${hMeter()}
    ${hP('A marker runs back and forth. Press <b>Throw</b> when it is in the <b style="color:var(--sage)">green</b> zone for a good throw, or in the <b style="color:var(--gold)">gold</b> for a perfect one. You get three throws, four for a legendary. Then it runs.')}
    ${hRow(ballEl('poke', '30px'), 'Poké Ball', 'The standard ball.')}
    ${hRow(ballEl('great', '30px'), `Great Ball · ×${BALLM.great}`, 'Better odds and a wider zone. In the Shop from trainer level 3.')}
    ${hRow(ballEl('ultra', '30px'), `Ultra Ball · ×${BALLM.ultra}`, 'The best odds. From trainer level 7.')}
    ${hH('After the catch')}
    ${hRow(hStars(4), 'Potential', 'The stars show how good the Pokémon was born: one star is plain, five is flawless. Training can raise it later.')}
    ${hRow(coinEl(PERFCOIN), 'Small bonuses', `A perfect throw gives +${PERFCOIN} coins, and from the third catch in a row you get a little more for each one.`)}
    ${hRow(hSym('✦', 'var(--gold)'), 'Shiny Pokémon', 'A rare other colour. Worth five times as much, and mostly just nice to own.')}
    <div class="hmore">${hLink('train', 'Training and potential')}${hLink('shop', 'Balls and packs')}</div>` },

  { k: 'team', n: 'Your team', s: 'Partner, levels, evolution and moves', ic: () => hSym('☗', 'var(--blue)'), body: () => `
    ${hRow(hMon(hMyPartner()), 'Six on the team, one partner', 'The first Pokémon on your team is your partner. It gets all the XP from your study minutes. The other five get 30 %.')}
    ${hRow(hSym('Lv', 'var(--sage)'), 'Levels', 'Study and League battles give XP. A higher level means higher stats and new moves.')}
    ${hRow(hSym('⇪', 'var(--violet)'), 'Evolution', 'When a Pokémon is ready, its card says so. Open it under Team and press Evolve. Some need an Evolution Stone from the Shop.')}
    ${hRow(hSym('4', 'var(--red)'), 'Four moves', 'A Pokémon knows four moves in battle. You choose which four on its card, among everything it has learned.')}
    ${hRow(hSym('▦', 'var(--ink2)'), 'The Box', 'Everything else you have caught. Duplicates can be sold for coins.')}
    ${hH('Types')}
    ${hP('Every move and every Pokémon has a type. A move that is <b>super effective</b> does double damage, and one that is not very effective does half. Water beats Fire, Fire beats Grass, Grass beats Water, and so on. In battle the move menu shows how each move will hit.')}
    <div class="hmore">${hLink('train', 'Training')}${hLink('mega', 'Mega Evolution')}</div>` },

  { k: 'modes', n: 'Battles', s: 'Three modes, one a day', ic: () => '<span class="ficon hfi">L</span>', body: () => `
    ${hP('When you are done studying, press <b>Done for today</b>. You then choose <b>one</b> of three modes for that day. The other two wait for your next battle day.')}
    ${helpModes()}
    ${hNote(`One of the three pays bonus coins each day (×${DAYCOIN}). It is shown when you choose.`)}
    ${hH('In a battle')}
    ${hRow(hSym('⚔', 'var(--red)'), 'Fight, Bag, Pokémon', 'Pick a move, use an item from the Shop, or switch to another Pokémon. The move menu shows the type and how well it will hit.')}
    ${hRow(hSym('⏸', 'var(--ink2)'), 'Pause menu', 'Battle speed, music, and giving up are in the Pause menu.')}
    ${hRow(hSym('⟲', 'var(--sage)'), 'A battle you leave', 'Is saved after every turn and goes on where it was. Giving up counts as a loss.')}
    ${hRow(hSym('?', 'var(--blue)'), 'Practice', 'The demo battle (Focus page or Profile) lets you try any class without rewards and without using an attempt.')}
    <div class="hmore">${hLink('events', 'Special events')}${hLink('raids', 'Legendary raids')}${hLink('bonus', 'The battle bonus')}</div>` },

  { k: 'events', n: 'Special events', s: 'Some days come with a gift', ic: () => `<span class="evc-ic hev" style="--ec:${EVENTS.surge.c}">${EVENTS.surge.ic}</span>`, body: () => `
    ${hP('About every third battle day is special. Once you have chosen your mode, the event shows as a <b>symbol above it</b>. Tap the symbol to see what it does.')}
    ${hNote('Events are only ever for you, never for your opponents. Nothing gets harder, and a day you sit out costs nothing.')}
    ${Object.keys(EVENTS).map(k => { const E = EVENTS[k]; return hRow(`<span class="evc-ic hev" style="--ec:${k === 'type' ? 'var(--t9)' : E.c}">${E.ic}</span>`, k === 'type' ? 'Type Festival' : E.n, HEV[k]); }).join('')}` },

  { k: 'raids', n: 'Legendary raids', s: 'One huge Pokémon against your whole team', ic: () => '<span class="raid-sp qm hqm"><i>?</i></span>', body: () => `
    ${hP('Now and then a legendary Pokémon shows itself. Who it is stays <b>secret</b> until you stand in front of it.')}
    ${hH('When it appears')}
    ${hRow(hSym('◎', 'var(--sage)'), 'You reach your daily goal', `${Math.round(RAIDGOAL * 100)} % chance.`)}
    ${hRow(hSym('7', 'var(--gold)'), 'Every seventh day in a row', 'Always.')}
    ${hRow('<span class="ficon hfi">L</span>', 'You finish a League lap', 'Always. A cleared Frontier round sometimes gives one too.')}
    ${hH('The fight')}
    ${hP(`It is one Pokémon with ${RAIDHP[0]} to ${RAIDHP[3]} times the HP of a normal one, against your whole team, and you may use the Bag. Its place fights too: something happens on the field every third turn, and below half HP it becomes enraged.`)}
    ${hP(`You get <b>${RAIDTRIES} attempts</b>, one a day. Then it moves on. Its level was set by your team when it appeared, so training between attempts helps.`)}
    ${hH('If you win')}
    ${hP('It waits in the grass for you to catch, and you get a pile of coins, Rare Candy and XP for the whole team.')}` },

  { k: 'train', n: 'Training', s: 'Potential and training points, made simple', ic: () => hSym('▲', 'var(--red)'), body: () => `
    ${helpTrain()}
    ${hH('Where')}
    ${hP('Open <b>Team</b>, tap a Pokémon, and press <b>Train</b>.')}
    ${hH('What to train first')}
    ${hP('Speed, and the attack stat the Pokémon actually uses: Attack for physical moves, Sp. Atk for special ones. Its card shows which moves are which.')}
    ${hH('Nature')}
    ${hP('Every Pokémon has a nature. Most natures raise one stat by 10 % and lower another. On the Train page the raised stat is green and the lowered one red.')}
    ${hNote(`A fully trained Pokémon costs about ${nb(EVTOT * EVP + 93 * IVP)} coins. Start with the one or two you use the most.`)}` },

  { k: 'mega', n: 'Mega Evolution', s: 'One stronger form a battle', ic: () => '<span class="gem mg hgem"></span>', body: () => `
    ${hRow('<span class="gem mg hgem"></span>', 'The Mega Ring', 'The first Champion you beat gives you the ring and a Mega Stone.')}
    ${hRow(hSym('◆', 'var(--violet)'), 'Mega Stones', `Give a stone to a Pokémon that has a Mega form, on its card. More stones cost ${nb(SHOP.mstone.p)} coins in the Shop, and the hardest bosses drop them.`)}
    ${hRow(hSym('M', 'var(--violet)'), 'In battle', 'A Mega button appears in the move menu. One Pokémon on your team can Mega Evolve each battle, and it stays that way until the battle is over.')}
    ${hRow('<span class="raid-sp qm hqm"><i>?</i></span>', 'Legendaries', 'They have their own stones. Beat one in a raid, and every one of that species you own can change form.')}` },

  { k: 'shop', n: 'Coins, the Shop and packs', s: 'Where coins come from and what they buy', ic: () => '<span class="coin hcoin"><i></i></span>', body: () => `
    ${hH('Where coins come from')}
    ${hRow(hSym('◷', 'var(--sage)'), 'Study', '3 coins a minute, and a little extra for a finished session.')}
    ${hRow(hSym('⚔', 'var(--red)'), 'Battles', 'Most of your coins. Multiplied by today\'s battle bonus.')}
    ${hRow(ballEl('poke', '30px'), 'Catching and selling', 'New species give coins, and duplicates can be sold from the Box.')}
    ${hH('What to buy')}
    ${hRow(ballEl('great', '30px'), 'Balls', 'You always need some. Better balls for rarer Pokémon.')}
    ${hRow(hSym('+', 'var(--violet)'), 'Potions and Revives', 'Used from the Bag in League battles and raids.')}
    ${hRow(hSym('▲', 'var(--red)'), 'Training', 'The big one. It is what makes the hardest bosses possible.')}
    ${hH('Encounter packs')}
    ${hP('A pack is three encounters, opened like a pack of cards. The dearer the pack, the better the last card.')}
    <div class="hgrid packs">${['poke', 'great', 'ultra', 'master'].map(k => `<span style="--pc:${PACKS[k].c}"><b>${PACKS[k].n.replace(' Pack', '')}</b><span class="sm tn">${nb(PACKS[k].p)}</span><span class="sm tn">${+(PACKS[k].slots[2].leg * 100).toFixed(1)} %</span></span>`).join('')}</div>
    ${hP('The percentage is the chance of a <b>legendary</b> in the last card. The card does not say who it is: you find out when you meet it in the grass.')}` },

  { k: 'fair', n: 'Fair play', s: 'What the game checks, and what it trusts you with', ic: () => hSym('✓', 'var(--sage)'), body: () => `
    ${hP('Fokusdex cannot see whether you are really studying. It trusts you with that, and closes the shortcuts it can:')}
    ${hRow(hSym('⟲', 'var(--sage)'), 'Leaving a battle', 'The battle is saved after every turn and goes on where it was. Giving up counts as a loss.')}
    ${hRow(hSym('◷', 'var(--red)'), 'The device clock', 'If the clock is set back or ahead, sessions and battles pause until it is right again. Big jumps leave a mark on your profile.')}
    ${hRow(hSym('⇄', 'var(--blue)'), 'Backups and sync', 'Only a newer save can replace the one on the device.')}
    ${hRow(hSym('?', 'var(--gold)'), 'Honest check', 'If you start a session in the middle of the night, or after a very long day, the game asks whether you are really studying.')}
    ${hNote('Cheating is optional, but your integrity pays for it. Be honest with yourself.')}` },

  { k: 'sync', n: 'Saving, sync and updates', s: 'Where your game lives', ic: () => hSym('⇅', 'var(--blue)'), body: () => `
    ${hRow(hSym('✓', 'var(--sage)'), 'Saved on the device', 'Everything is saved as you go, in the browser on this device.')}
    ${hRow(hSym('⇅', 'var(--blue)'), 'Sync between devices', 'Under Profile → Sync you can connect a private GitHub repository. The game is then saved there too, and follows you to your other devices.')}
    ${hRow(hSym('⎘', 'var(--ink2)'), 'Backup', 'Profile → Backup copies the whole game as text. Paste it on a new device to move there.')}
    ${hRow(hSym('↻', 'var(--gold)'), 'New versions', 'The app updates itself. After an update, open it, close it fully, and open it again to get the new version.')}
    ${hRow(hSym('♪', 'var(--violet)'), 'Your own graphics and music', 'Optional: a folder called pack in your sync repository can hold your own battle graphics, sounds and music. Without it the app uses what is built in.')}` }
];
/* Det hvert event gjør, i én linje. */
const HEV = { surge: 'Your Pokémon that have a Mega form start every battle in it. No ring or stone needed.', type: 'One type gets +15 % in every stat, and you find more of that type.', stars: 'Three Pokémon from your Box fight at your team\'s level with +20 %.', little: 'Pokémon that can still evolve get +35 %.',
  gold: 'Every battle pays one and a half times the coins.', wind: 'One more attempt in the League, or one more run in the Frontier.', lucky: 'Shiny odds are five times as high, and bosses give one more encounter.', camp: 'Training costs 40 % less.' };
/* De tre modusene, kort. (Hentes fra reglene, så teksten følger med når de endres.) */
function helpModes() {
  return hRow('<span class="ficon hfi">L</span>', 'Trainer League', `Your own team, ${LAPN} battles a lap. A trainer first, then the class rises as you go, and a Champion waits at the end. You never see who is next before the intro. Every win gives the whole team XP, and bosses give Rare Candy and items. ${LIVES === 1 ? 'One loss ends it for the day.' : `${LIVES} losses end it for the day.`}`)
    + hRow('<span class="ficon hfi">F</span>', 'Battle Frontier', `You rent Pokémon instead of using your own, and everything is Lv ${FACLV}. ${FACN} battles a round. You win items, encounters and coins, but no XP. ${FACLIVES} runs a day.`)
    + hRow('<span class="ficon hfi">W</span>', 'World Tournament', `A knockout cup, three rounds, three on three, and a new cup each weekday. Coins for every round, and a pack of encounters for the winner.`);
}
/* Potensial og treningspoeng. Brukes både i hubben og første gang Train åpnes. */
function helpTrain() {
  return `${hP('Two hidden things decide how strong a Pokémon becomes. Both count more the higher its level.')}
    ${hRow('<span class="tb g hbx"><i style="width:70%"></i></span>', 'Potential', 'What it was born with: 0 to 31 in each stat. The gold bars, and the stars you see when you catch it. <b>Hyper Training</b> raises it for coins.')}
    ${hRow('<span class="tb hbx"><i style="width:45%"></i></span>', 'Training', `Points it has earned: at most ${EVMAX} in one stat and ${EVTOT} in all. The coloured bars. Your partner earns one for every two minutes you study, and you can buy more.`)}`;
}

/* ---------- Hubben ---------- */
function helpOpen(k) {
  const T = HELP.find(t => t.k === k);
  const html = T
    ? `<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="help" data-k="">‹ All topics</button><button type="button" class="btn sm2" data-a="close">Close</button></div>
       <div class="hhead"><span class="hic">${T.ic()}</span><div><h2 class="h" style="font-size:22px">${T.n}</h2><p class="sm">${T.s}</p></div></div><div class="hbody">${T.body()}</div>
       <button type="button" class="btn wide" data-a="help" data-k="">All topics</button>`
    : `<div class="row" style="justify-content:space-between"><h2 class="h" style="font-size:22px;margin:0">Questions</h2><button type="button" class="btn sm2" data-a="close">Close</button></div>
       <p class="sm">Pick a topic. Short answers, with pictures.</p>
       <div class="hlist">${HELP.map(t => `<button type="button" class="hitem" data-a="help" data-k="${t.k}"><span class="hic">${t.ic()}</span><span class="sp"><b>${t.n}</b><span class="sm">${t.s}</span></span><span class="hgo">›</span></button>`).join('')}</div>
       <button type="button" class="btn wide" data-a="tour">Show the start guide again</button>
       <button type="button" class="btn wide nf" data-a="rules">Rules and rewards · every number</button>`;
  const sh = document.querySelector('#sheet .sheet.helpsh');
  if (sh) { sh.innerHTML = `<span class="grab"></span>${html}`; sh.scrollTop = 0; }
  else { openSheet(html); const s = document.querySelector('#sheet .sheet'); if (s) s.classList.add('helpsh'); }
  if (!S.hseen) { S.hseen = 1; save(true); const b = document.querySelector('.helpb'); if (b) b.classList.remove('new'); }
}
/* Det lille spørsmålstegnet: i hjørnet på hver side (åpner hubben), og ved siden av ting som har et eget emne. */
const helpBtn = () => `<button type="button" class="helpb${S.hseen ? '' : ' new'}" data-a="help" data-k="" aria-label="Questions and help">?</button>`;
const hq = (k, label) => `<button type="button" class="hq" data-a="help" data-k="${k}" aria-label="${label || 'What is this?'}">?</button>`;

/* ---------- Startguiden ----------
   Sju korte steg. Vises én gang, rett etter at en ny spiller har valgt partner og fag (S.tour = 0), og kan vises igjen fra hubben. */
function tourSteps() {
  const g = goalMin(), top = goalTop().toFixed(1), fags = Object.keys(FAGS).slice(0, 4), pid = hMyPartner();
  return [
    { pic: `<span class="tr-mon">${spr(pid, { ani: 1, s: '120px' })}</span>`, n: 'Welcome, trainer', t: 'Fokusdex turns your study time into a Pokémon adventure. Here is how it works, in one minute.' },
    { pic: `<div class="chips tr-chips">${fags.map((f, i) => `<span class="chip" aria-pressed="${i === 0}" style="--tc:${F(f).c}">${esc(F(f).n)}</span>`).join('')}</div>`, n: '1 · Pick what you study', t: 'Tap a subject on the Focus page. Your own subjects count in full. Other things, like job applications or music, count at half value.' },
    { pic: `<span class="go tr-go">Start 45 min</span><span class="tr-sub"><span class="grass live"><i></i><i></i><i></i><i></i></span> every 20 minutes</span>`, n: '2 · Start the timer', t: 'Choose a length and press Start. Then study. You can lock your phone, the timer keeps going. Every 20 minutes a wild Pokémon shows up.' },
    { pic: `<div class="tr-bar">${hBar(0.62, 0.5, top)}<span class="sm">today's battle bonus</span></div>`, n: '3 · Study raises the battle bonus', t: `Every minute you study today raises today's bonus, from ×0.5 up to ×${top} at your goal of ${hrs(g)} hours. It multiplies the coins you win in battles.` },
    { pic: `<div class="tr-rew"><span><b class="tn">+450</b><span class="sm">XP</span></span><span><b class="tn">${coinEl(135)}</b><span class="sm">coins</span></span><span>${ballEl('poke', '34px')}<span class="sm">encounters</span></span></div>${hMeter()}`, n: '4 · Collect your rewards', t: 'After a session you get XP and coins, and the Pokémon you found wait in the grass. Stop the marker in the green zone to catch them.' },
    { pic: `<div class="tr-modes"><span class="ficon hfi">L</span><span class="ficon hfi">F</span><span class="ficon hfi">W</span><span class="evc-ic hev" style="--ec:${EVENTS.gold.c}">${EVENTS.gold.ic}</span></div>`, n: '5 · Battle when you are done', t: 'Press Done for today and choose one of three battle modes. Some days a special event shows up, with a bonus just for you. Battles are where most coins come from.' },
    { pic: '<span class="helpb tr-q" aria-hidden="true">?</span>', n: 'Questions?', t: 'The ? in the top corner opens the question hub: short answers with pictures. Rules and rewards on the Focus page has every number. And the first time you train a Pokémon, the game explains how.' }
  ];
}
function tourShow(i) {
  const L = tourSteps(); i = Math.max(0, Math.min(L.length - 1, i || 0)); U.tour = i;
  const s = L[i], last = i === L.length - 1;
  ov(`<div class="row" style="justify-content:space-between"><span class="pill tn">${i + 1} of ${L.length}</span>${last ? '<span></span>' : '<button type="button" class="btn sm2" data-a="tourend">Skip</button>'}</div>
    <div class="mid tour"><div class="tr-pic">${s.pic}</div><div><h1 class="big" style="font-size:28px">${s.n}</h1><p class="mut" style="margin-top:10px;max-width:34ch;font-size:16px;line-height:1.45">${s.t}</p></div>
      <div class="tr-dots" aria-hidden="true">${L.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="acts">${i ? '<button type="button" class="btn nf" data-a="tourgo" data-k="-1">Back</button>' : ''}<button type="button" class="btn ${last ? 'gold' : 'pri'}" data-a="${last ? 'tourend' : 'tourgo'}" data-k="1">${last ? 'Start studying' : 'Next'}</button></div>
    ${last ? '<button type="button" class="btn wide nf" data-a="tourhub">Open the question hub</button>' : ''}`, 'tint', 'var(--sage)');
}
function tourEnd(hub) { if (S.tour !== 1) { S.tour = 1; save(true); } closeOv(); render(); if (hub) helpOpen(''); }

/* ---------- Første gang Train åpnes: hva potensial og treningspoeng er. Kan hentes fram igjen med spørsmålstegnet der. ---------- */
const trainTipOn = () => !(S.tip && S.tip.train) || U.trhelp;
function trainTip() {
  if (!trainTipOn()) return '';
  return `<div class="card2 trtip"><div class="row" style="justify-content:space-between"><b>How training works</b>${hq('train', 'More about training')}</div>${helpTrain()}
    <p class="sm">Tap a stat below to train it. A good first choice is Speed, and the attack stat it uses.</p><button type="button" class="btn sm2 wide" data-a="trtipok">Got it</button></div>`;
}

const HA = {
  help: el => { sfx.open(); helpOpen(el.dataset.k || ''); },
  tour: () => { closeSheet(); sfx.open(); tourShow(0); },
  tourgo: el => { tourShow((U.tour || 0) + (+el.dataset.k || 1)); },
  tourend: () => { sfx.ok(); tourEnd(false); },
  tourhub: () => { tourEnd(true); },
  trtipok: () => { (S.tip || (S.tip = {})).train = 1; U.trhelp = 0; save(true); const m = monBy(U.tru); if (m) trainSheet(m); },
  trtip: () => { U.trhelp = U.trhelp ? 0 : 1; const m = monBy(U.tru); if (m) trainSheet(m); }
};
