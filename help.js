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
    ${hRow(hSym('3', 'var(--gold)'), 'Battle when you are done', `After ${OPENMIN} minutes of focus, press <b>Done for today</b> and pick a battle mode. The more you studied today, the more the battles pay.`)}
    ${hNote('The game only gives. A day you skip costs you nothing, and nothing you own is ever taken away.')}
    <div class="hmore">${hLink('timer', 'Subjects and the timer')}${hLink('bonus', 'The battle bonus')}${hLink('modes', 'Battles')}</div>` },

  { k: 'timer', n: 'Subjects and the timer', s: 'What counts, and how a session works', ic: () => hSym('◷', 'var(--sage)'), body: () => `
    ${hH('Your subjects')}
    ${hP('Add up to four subjects under <b>Profile → Edit subjects</b>. The Pokémon types you pick for a subject show up more often in its sessions. In an exam period (Profile → Badges) each badge counts down to its exam and gives encounters on the way. Work days are under Profile → Settings → Advanced options: the app is locked while you work, and work adds a little to the battle bonus.')}
    ${hH('Other things')}
    ${hP(`Job applications, music, reading and the like can be logged too. They count at <b>half value</b> (×${OTHERW}) for the battle bonus and your daily goal, give a little less XP, and do not train your partner. Encounters still come every 20 minutes. Their hours are kept apart from your subject hours.`)}
    ${hH('A session')}
    ${hRow(hSym('▶', 'var(--sage)'), 'Pick, then Start', 'Choose a subject and a length on the Focus page, and press Start. You can lock your phone: the timer follows the clock.')}
    ${hRow(hSym('❙❙', 'var(--ink2)'), 'Pause or finish early', 'Pause stops the clock. Finish now ends the session, and you are rewarded for the minutes you did.')}
    ${hRow(hSym('×1.5', 'var(--gold)'), 'Rested bonus', 'Your first session of the day gives one and a half times the XP and coins.')}
    ${hRow(hSym('zZ', 'var(--blue)'), 'A tired team', `Past your daily goal of ${hm(S.cap)} your team is tired: half XP and no new encounters. Tomorrow it is rested again.`)}
    <div class="hmore">${hLink('bonus', 'The battle bonus')}${hLink('catch', 'Encounters and catching')}</div>` },

  { k: 'bonus', n: 'The battle bonus', s: 'How study time multiplies your winnings', ic: () => hSym('×', 'var(--gold)'), body: () => { const g = goalMin(), top = goalTop(), now = studyMult(); return `
    ${hP('Every minute you study today raises <b>today\'s battle bonus</b>. It multiplies the coins you win in battles, and the XP and the odds for Rare Candy follow it too, from ×0.7 to ×1.3.')}
    ${hBar(Math.min(1, (S.lad.day ? ladMin() : todayMin()) / g), 0.5, top.toFixed(1))}
    ${hP(`With no study the bonus is ×0.5. It grows evenly and peaks at <b>×${top.toFixed(1)}</b> when you reach your goal of ${hm(g)}. Right now it is <b>×${now}</b>.`)}
    ${hH('A higher goal, a higher peak')}
    <div class="hgrid">${[120, 240, 360, 480].map(c => `<span class="${S.cap === c ? 'on' : ''}"><b class="tn">${c / 60} h</b><span class="sm tn">×${topFor(c).toFixed(1)}</span></span>`).join('')}</div>
    ${hP('Set your goal under <b>Profile → Daily goal</b>. Pick one you can reach on a normal day: the bonus is counted against your own goal.')}
    ${hH('What else multiplies coins')}
    ${hRow(hSym('★', 'var(--gold)'), `Today's bonus mode: ×${DAYCOIN}`, 'One of the three battle modes pays extra each day. You see which when you choose.')}
    ${hRow(hSym('◎', 'var(--gold)'), `Gold Rush event: ×${EVCOIN}`, 'One of the special events.')}
    ${hRow(hSym('2×', 'var(--sage)'), 'First League win of the day', 'Pays double.')}
    ${hRow(hSym('⚑', 'var(--red)'), 'Difficulty', DIFF.map(d => `${d.n} ×${d.coin}`).join(' · ') + '. Hard pays the most of everything: coins, XP, Rare Candy, and legendary raids come nearly twice as often. Change it under Profile.')}` ; } },

  { k: 'catch', n: 'Encounters and catching', s: 'Rarity, throws, and what a catch gives', ic: () => ballEl('poke', '30px'), body: () => `
    ${hH('Where they come from')}
    ${hP('A session finds one Pokémon for every 20 minutes, and one more if you finish a session of 25 minutes or longer. Longer sessions find rarer ones. Battles give encounters too. They all wait in the grass until you have time.')}
    ${hH('Rarity')}
    <div class="hgrid tiers">${TIERS.map((t, i) => `<span><b class="tier r${i}">${t}</b><span class="sm tn">+${NEWCOIN[i]}</span></span>`).join('')}</div>
    ${hP('The number is the coins a <b>new species</b> gives the first time you catch it. Before you step in, the dots at the top show what is waiting, by colour.')}
    ${hP('A whole evolution line shares one rarity. <b class="tier r3">Epic</b> is every line that ends among the very strongest, from Dragonite to Gyarados, and they are all hard to find. Below that, it is how hard the first form is to find, plus how strong the line becomes in the end: Charizard\'s line is <b class="tier r2">Rare</b>.')}
    ${hH('Throwing')}
    ${hMeter()}
    ${hP('A marker runs back and forth. Press <b>Throw</b> when it is in the <b style="color:var(--sage)">green</b> zone for a good throw, or in the <b style="color:var(--gold)">gold</b> for a perfect one. You get three throws, four for a legendary. Then it runs.')}
    ${hRow(ballEl('poke', '30px'), 'Poké Ball', 'The standard ball.')}
    ${hRow(ballEl('great', '30px'), `Great Ball · ×${BALLM.great}`, 'Better odds and a wider zone. In the Shop from trainer level 3.')}
    ${hRow(ballEl('ultra', '30px'), `Ultra Ball · ×${BALLM.ultra}`, 'The best odds. From trainer level 7.')}
    ${hRow(ballEl('dusk', '30px'), 'Dusk Ball', `Ultra Ball odds, and a third better on legendary Pokémon. From trainer level ${SHOP.dusk.lv}.`)}
    ${hRow(ballEl('master', '30px'), 'Master Ball', `Never fails. You can carry one, and it is never thrown unless you pick it. From trainer level ${SHOP.master.lv}.`)}
    ${hRow(hSym('+', 'var(--gold)'), 'Golden Razz Berry', 'Feed it to the Pokémon in front of you: one more throw, and better odds on every throw.')}
    ${hH('After the catch')}
    ${hRow(hStars(4), 'Potential · IVs', `The stars show how good the Pokémon was born: one star is plain, five is flawless. From Lv ${HTLV} Hyper Training can make up for low ones.`)}
    ${hRow('<span class="szt sz3">Giant</span>', 'Size', `Most Pokémon are Normal. A few are born Small, Large or Giant, which moves their HP a little: ${Math.round((SZHP[0] - 1) * 100)} % for a Small one, +${Math.round((SZHP[3] - 1) * 100)} % for a Giant. A Giant is rare.`)}
    ${hRow(coinEl(PERFCOIN), 'Small bonuses', `A perfect throw gives +${PERFCOIN} coins, and from the third catch in a row you get a little more for each one.`)}
    ${hRow(hSym('✦', 'var(--gold)'), 'Shiny Pokémon', (() => { const p = partner(), x = p ? shinyEx(p.id, p.lv) : null; return `A rare other colour. It is born with perfect IVs, and every finished stat is ${Math.round((SHINYST - 1) * 100)} % higher on top of that${x ? `: a shiny ${esc(D(p.id)[0])} at level ${p.lv} has ${nb(x.b)} power against ${nb(x.a)} for an average one` : ''}. Incense from the Shop raises the odds for a while.`; })())}
    <div class="hmore">${hLink('train', 'IVs, EVs and training')}${hLink('shop', 'Balls and packs')}</div>` },

  { k: 'team', n: 'Your team', s: 'Partner, levels, evolution and moves', ic: () => hSym('☗', 'var(--blue)'), body: () => `
    ${hRow(hMon(hMyPartner()), 'Six on the team, one partner', 'The first Pokémon on your team is your partner. It gets all the XP from your study minutes. The other five get 30 %.')}
    ${hRow(hSym('Lv', 'var(--sage)'), 'Levels', 'Study and League battles give XP. A higher level means higher stats and new moves.')}
    ${hRow(hSym('⇪', 'var(--violet)'), 'Evolution', 'When a Pokémon is ready, its card says so. Open it under Team and press Evolve. Some need an Evolution Stone from the Shop.')}
    ${hRow(hSym('4', 'var(--red)'), 'Four moves', 'A Pokémon knows four moves in battle. You choose which four on its card, among everything it has learned.')}
    ${typeof tutOn === 'function' && tutOn() ? hRow(hSym('+', 'var(--sage)'), 'More moves', 'An evolved Pokémon can also pick what its earlier forms learned. The tutors in the Shop teach moves it never learns by level, and a Pokémon hatched from an egg knows an egg move.') : ''}
    ${hRow(hSym('▦', 'var(--ink2)'), 'The Box', 'Everything else you have caught, region by region. Sort it by rarity, power, level, number or newest. The Duplicates tab beside it lists every species you have more than one of: the biggest and the one born with most stars stay, and one tap changes who stays and who is sold.')}
    ${hH('Types')}
    ${hP('Every move and every Pokémon has a type. A move that is <b>super effective</b> does double damage, and one that is not very effective does half. Water beats Fire, Fire beats Grass, Grass beats Water, and so on. In battle the move menu shows how each move will hit.')}
    <div class="hmore">${hLink('train', 'Training')}${hLink('held', 'Items to hold')}${hLink('mega', 'Mega Evolution')}</div>` },

  { k: 'modes', n: 'Battles', s: 'Three modes, one a day', ic: () => '<span class="ficon hfi">L</span>', body: () => `
    ${hP('When you are done studying, press <b>Done for today</b>. You then choose <b>one</b> of three modes for that day. The other two wait for your next battle day.')}
    ${helpModes()}
    ${hNote(`One of the three pays bonus coins each day (×${DAYCOIN}). It is shown when you choose.`)}
    ${hH('In a battle')}
    ${hRow(hSym('⚔', 'var(--red)'), 'Fight, Bag, Pokémon', 'Pick a move, use an item from the Shop, or switch to another Pokémon. The move menu shows the type and how well it will hit.')}
    ${hRow(hSym('⏸', 'var(--ink2)'), 'Pause menu', 'Battle speed, music, and giving up are in the Pause menu. FAST runs the battle at more than double speed, sounds included.')}
    ${hRow(hSym('⟲', 'var(--sage)'), 'A battle you leave', 'Is saved after every turn and goes on where it was. Giving up counts as a loss.')}
    ${hH('No time today?')}
    ${hRow(hSym('–', 'var(--ink2)'), 'Not today', 'Closes the day without battles. Nothing is lost but the battles themselves.')}
    ${hRow(hSym('▸', 'var(--gold)'), `Simulate · ${Math.round(SIMPAY * 100)} %`, 'The game plays the day\'s battles with your team. You get a good deal less: part of the coins and XP, and none of the items, Rare Candy, medals or lap wins. You see the result before you accept, and you can undo it once.')}
    ${hRow(hSym('☾', 'var(--blue)'), 'Tomorrow', 'The battles wait until you start your next session. They are marked as yesterday\'s and pay yesterday\'s bonus.')}
    ${hRow(hSym('▶', 'var(--blue)'), 'See it first', 'Show the game, under Profile, plays a battle for you: a strong rental team against a Champion. You can take over whenever you like, or play it yourself from the start, and nothing is at stake.')}
    <div class="hmore">${hLink('events', 'Special events')}${hLink('raids', 'Legendary raids')}${hLink('bonus', 'The battle bonus')}</div>` },

  { k: 'events', n: 'Special events', s: 'Some days come with a gift', ic: () => `<span class="evc-ic hev" style="--ec:${EVENTS.surge.c}">${EVENTS.surge.ic}</span>`, body: () => `
    ${hP('About every third battle day is special. Once you have chosen your mode, the event shows as a <b>symbol above it</b>. Tap the symbol to see what it does.')}
    ${hNote('Events are only ever for you, never for your opponents. Nothing gets harder, and a day you sit out costs nothing.')}
    ${Object.keys(EVENTS).map(k => { const E = EVENTS[k]; return hRow(`<span class="evc-ic hev" style="--ec:${k === 'type' ? 'var(--t9)' : E.c}">${E.ic}</span>`, k === 'type' ? 'Type Festival' : E.n, HEV[k]); }).join('')}` },

  { k: 'raids', n: 'Legendary raids', s: 'One huge Pokémon against your whole team', ic: () => '<span class="raid-sp qm hqm"><i>?</i></span>', body: () => `
    ${hP('Now and then a legendary Pokémon shows itself. Who it is stays <b>secret</b> until you stand in front of it.')}
    ${hH('When it appears')}
    ${hRow(hSym('?', 'var(--gold)'), 'Rarely, and never on a fixed day', 'About once a week on Normal if you study every day, more often on Hard and less often on Easy. The longer since the last one, the better the odds.')}
    ${hRow(hSym('!', 'var(--gold)'), 'As a surprise', 'It shows itself when the day\'s battles are done: played, simulated or skipped. Until then you cannot know that one is waiting.')}
    ${hRow(hSym('◎', 'var(--sage)'), 'You reach your daily goal', 'One more draw that day.')}
    ${hRow('<span class="ficon hfi">L</span>', 'You win a League lap or a Frontier round', 'One more draw.')}
    ${hRow(hSym('★', 'var(--gold)'), 'New ones first', 'A legendary you already own never comes again while there is one you lack, so nearly every raid is someone new.')}
    ${hRow(hSym('▲', 'var(--sage)'), 'It grows with your collection', 'The more legendaries you own, the more often the great ones and Arceus show themselves, and the less often the common and the mythical ones. Your very first raid is far above you. It is meant to be.')}
    ${hH('The fight')}
    ${hP(`It is one Pokémon with ${RAIDHP[0]} to ${RAIDHP[3]} times the HP of a normal one, against your whole team, and you may use the Bag. Its place fights too: something happens on the field every third turn, and below half HP it becomes enraged.`)}
    ${hP('It cannot be knocked out in one hit, and moves that count in shares of HP (poison, a burn, Leech Seed, Super Fang) take no more from it than from any Pokémon. Sleep, paralysis and lowered stats work as usual, and a berry or a plate on the right Pokémon helps.')}
    ${hP(`You get <b>${RAIDTRIES} attempts</b>, one a day. The first time you do not know who is waiting. If you lose, you get one more attempt the next day, and now you know. Then it moves on. It stands well above your team, so a raid is meant to be hard.`)}
    ${hH('If you win')}
    ${hP('It is yours. Winning the raid is the catch: no throws. You also get a pile of coins, Rare Candy and XP for the whole team.')}
    ${hH('Help from the Shop')}
    ${hRow(hSym('✚', 'var(--gold)'), 'Sacred Ash', `Once in a raid: every fainted Pokémon is back with half its HP. From trainer level ${SHOP.ash.lv}.`)}
    ${hRow(hSym('✦', 'var(--violet)'), 'Prism Lure', `The next raid has a 1 in ${Math.round(1 / PRISMP)} chance of being shiny. From trainer level ${SHOP.prism.lv}.`)}` },

  { k: 'train', n: 'Training: IVs and EVs', s: 'What they are, why they matter, and their caps', ic: () => hSym('▲', 'var(--red)'), body: () => `
    ${helpTrain()}
    ${hH('Where')}
    ${hP('Open <b>Team</b>, tap a Pokémon, and press <b>Train</b>.')}
    ${hH('What to train first')}
    ${hP('Speed, and the attack stat the Pokémon actually uses: Attack for physical moves, Sp. Atk for special ones. Its card shows which moves are which.')}
    ${hH('Nature')}
    ${hP('Every Pokémon has a nature. Most natures raise one stat by 10 % and lower another. On the Train page the raised stat is green and the lowered one red.')}
    ${hH('What it costs')}
    ${hRow(coinEl(EVP), 'One EV', `A vitamin is 10 EVs. All ${EVTOT} cost ${nb(EVTOT * EVP)} coins.`)}
    ${hRow(coinEl(HTP), 'Hyper Training, one stat', `The same price whatever the IV was. Only from Lv ${HTLV}, as in the games.`)}
    ${hNote('Neither can go past its cap, so a fully trained Pokémon here is exactly as strong as a fully trained one in the games. Start with the one or two you use the most.')}` },

  { k: 'held', n: 'Items to hold', s: 'Berries, plates and gear for your team', ic: () => heldEl('sitrus', '30px'), body: () => `
    ${hP('Each Pokémon can hold <b>one item</b>. It works by itself in battle: in the League, the tournament and raids. The rentals in the Battle Frontier hold nothing, and neither do your opponents.')}
    ${hH('Three kinds')}
    ${hRow(heldEl('sitrus', '30px'), 'Berries', 'Used up when they work. A Sitrus Berry gives back a quarter of its HP at half HP, a Lum Berry cures a status condition, and there is a berry against every type that halves one super effective hit. The Focus Sash is used up the same way.')}
    ${hRow(heldEl('p9', '30px'), 'Plates', `They last. One type of move hits ${Math.round((PLATEX - 1) * 100)} % harder. There is one for every type but Normal.`)}
    ${hRow(heldEl('leftovers', '30px'), 'Gear', 'It lasts. Leftovers heal a little every turn, a Life Orb makes every move hit harder at a cost, an Eviolite toughens a Pokémon that can still evolve, and so on.')}
    ${hH('Where they come from')}
    ${hRow('<span class="coin hcoin"><i></i></span>', 'The Shop', 'Under <b>To hold in battle</b>. Berries are cheap, and plates and gear are something to save for. More opens as your trainer level rises.')}
    ${hRow(hSym('◷', 'var(--sage)'), 'Focus sessions', `A session of ${BERRYMIN} minutes or more can turn up a berry. The longer the session, the better the odds.`)}
    ${hRow('<span class="raid-sp qm hqm"><i>?</i></span>', 'Raids', 'A legendary you beat leaves the plate of its type.')}
    ${hH('How to use them')}
    ${hP('Open <b>Team</b>, tap a Pokémon, and press <b>Give</b> under Holding. A plate that matches one of its moves is marked. Plates and gear can be moved between your Pokémon as often as you like, and they come back to the bag if you sell the one holding them.')}
    ${hH('Arceus')}
    ${hP('Arceus takes the type of the plate it holds: its colour changes, and Judgment becomes that type too.')}
    <div class="hmore">${hLink('team', 'Your team')}${hLink('raids', 'Legendary raids')}${hLink('shop', 'The Shop')}</div>` },

  { k: 'mega', n: 'Mega Evolution', s: 'One stronger form a battle', ic: () => '<span class="gem mg hgem"></span>', body: () => `
    ${hRow('<span class="gem mg hgem"></span>', 'The Mega Ring', 'The first Champion you beat gives you the ring and a Mega Stone.')}
    ${hRow(hSym('◆', 'var(--violet)'), 'Mega Stones', `Give a stone to a Pokémon that has a Mega form, on its card. More stones cost ${nb(SHOP.mstone.p)} coins in the Shop, and the hardest bosses drop them.`)}
    ${hRow(hSym('M', 'var(--violet)'), 'In battle', 'A Mega button appears in the move menu. One Pokémon on your team can Mega Evolve each battle, and it stays that way until the battle is over.')}
    ${hRow('<span class="raid-sp qm hqm"><i>?</i></span>', 'Legendaries', 'They have their own stones. Beat one in a raid, and every one of that species you own can change form.')}` },

  { k: 'shop', n: 'Coins, the Shop and packs', s: 'Where coins come from and what they buy', ic: () => '<span class="coin hcoin"><i></i></span>', body: () => `
    ${hH('Where coins come from')}
    ${hRow(hSym('◷', 'var(--sage)'), 'Study', '3 coins a minute, and a little extra for a finished session.')}
    ${hRow(hSym('⚔', 'var(--red)'), 'Battles', 'Most of your coins. Multiplied by today\'s battle bonus.')}
    ${hRow(ballEl('poke', '30px'), 'Catching and selling', 'New species give coins, and duplicates can be sold from the Duplicates tab under Team.')}
    ${hH('What to buy')}
    ${hRow(ballEl('great', '30px'), 'Balls', 'You always need some. Better balls for rarer Pokémon, and a Dusk Ball for a legendary.')}
    ${hRow(hSym('❋', 'var(--sage)'), 'For the hunt', 'Lures give more or rarer encounters for three sessions. Incense raises the shiny odds for one to three days, for new encounters from sessions, packs and eggs while it burns. The ones already waiting in the grass keep their odds, and they wait as long as you like.')}
    ${hRow(hSym('+', 'var(--violet)'), 'Potions and Revives', 'Used from the Bag in League battles and raids.')}
    ${hRow(hSym('▲', 'var(--red)'), 'Training', 'The big one. It is what makes the hardest bosses possible.')}
    ${hH('Encounter packs')}
    ${hP('A pack is three to six Pokémon, more in the dearer packs, opened like a pack of cards: they lie in a pile, and one tap or swipe takes the top card away, so the next one comes forward. They come from the most common to the rarest, so the best is last. An epic, a shiny or a legendary builds up when it comes forward, and now and then a pack is golden: every card in it is rare or better. Open all takes the rest of the pile at once. Every Pokémon goes straight into your collection, and a legendary is a pack raid of its own, with one attempt. Your own odds stand on each pack in the Shop.')}
    ${hP(`Open ten at once and at least one is rare or better. Afterwards you see everything you got: keep what is worth keeping, and let the rest go for coins with one tap. In Master Packs bad luck has a limit: a legendary comes within ${PKPITY.master.leg} packs and a shiny within ${PKPITY.master.sh}, and the pack shows how many are left.`)}
    <div class="hgrid packs">${['poke', 'great', 'ultra', 'master'].map(k => `<span style="--pc:${PACKS[k].c}"><b>${PACKS[k].n.replace(' Pack', '')}</b><span class="sm tn">${nb(PACKS[k].p)}</span><span class="sm tn">${pkPct(packOdds(k).leg)}</span></span>`).join('')}</div>
    ${hP('The percentage is the chance of a <b>legendary</b> in one pack. The card does not say who it is: you find out in the pack raid.')}` },

  { k: 'ach', n: 'Achievements and rank', s: 'Medals, rewards and the frame around your picture', ic: () => hSym('★', 'var(--gold)'), body: () => { const R = rankOf(); return `
    ${hP('Tap <b>your picture</b> at the top of the Focus page to open your achievements.')}
    <div class="hach" style="--rk:${R.c}">${avFrame(R, 'lg', 1)}<div class="sp"><b style="color:${R.c}">${R.n}</b><p class="sm">${R.p} of ${achTotal()} medals${R.nn ? ` · ${R.next - R.p} more to ${R.nn}` : ''}</p></div></div>
    ${hRow(hSym('●', 'var(--gold)'), 'Steps and medals', 'An achievement has up to five steps: study hours, species caught, League wins and so on. When a step is reached, a gold dot shows on your picture. Claim it for a reward, and it counts as one medal.')}
    ${hRow(hSym('◆', 'var(--violet)'), 'Rank', `Medals raise your rank: ${RANKS.map(r => `${r[0]} at ${r[1]}`).join(', ')}. The rank is the frame and stamp around your picture.`)}
    ${hRow(coinEl(ACOIN[1]), 'Rewards', `The five steps pay ${ACOIN.map(nb).join(', ')} coins. A few pay Rare Candy or a Mega Stone as well.`)}
    ${hRow(hSym('18', 'var(--blue)'), 'One for every type', 'Catch 5, 12 and 25 different species of a type. Eighteen types, three medals each.')}
    <button type="button" class="btn wide" data-a="ach">Open your achievements</button>`; } },

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
const HEV = { surge: 'Three of your Pokémon that have a Mega form start every battle in it. You choose which three in the event. No ring or stone needed.', type: 'One type gets +15 % in every stat, and you find more of that type.', stars: 'Three Pokémon from your Box fight at your team\'s level with +20 %.', little: 'Pokémon that can still evolve get +35 %.',
  gold: 'Every battle pays one and a half times the coins.', wind: 'One more attempt in the League, or one more run in the Frontier.', lucky: 'Shiny odds are five times as high, and bosses give one more encounter.', camp: 'Training costs 40 % less.' };
/* De tre modusene, kort. (Hentes fra reglene, så teksten følger med når de endres.) */
function helpModes() {
  return hRow('<span class="ficon hfi">L</span>', 'Trainer League', `Your own team, ${LAPN} battles a lap. A trainer first, then the class rises as you go, and a Champion waits at the end. You never see who is next before the intro. Every win gives the whole team XP, and bosses give Rare Candy and items. One loss ends the lap, and the next lap starts from battle 1. One lap a day.`)
    + hRow('<span class="ficon hfi">F</span>', 'Battle Frontier', `You rent Pokémon instead of using your own, and everything is Lv ${FACLV}. ${FACN} battles a round, ${FACEND} rounds, and every trainer is stronger than the one before. The bosses hand out Symbols, and the Diamond Symbol in round ${FACEND} ends the run. You win coins, items and encounters, and your own team gets XP for every win. Each rental is rated with one to five marks for how good it really is, and now and then one of the seven balls is rare. Clear a round, and you keep one of your four rentals. ${FACLIVES} runs a day.`)
    + hRow('<span class="ficon hfi">W</span>', 'World Tournament', `A knockout cup, three rounds, three on three, and a new cup each weekday. You see each other's whole team, and both pick three in secret. Coins and XP for every round, and a pack of encounters for the winner.`);
}
/* IV og EV. Brukes både i hubben og første gang Train åpnes. */
function helpTrain() {
  return `${hP('Two numbers decide how strong a Pokémon is beyond its level. They have <b>different caps</b> and are raised separately.')}
    ${hRow('<span class="tb g hbx"><i style="width:55%"></i></span>', 'IV · what it was born with', `Individual Values: 0 to 31 in each stat, set when you catch it. The stars on the catch screen. IVs cannot be trained, but from Lv ${HTLV} <b>Hyper Training</b> makes a stat count as 31 in battle.`)}
    ${hRow('<span class="tb hbx"><i style="width:45%"></i></span>', 'EV · what training adds', `Effort Values: at most ${EVMAX} in one stat and ${EVTOT} in all, so two stats can be maxed, not all six. Your partner earns 1 EV for every two minutes you study, and you can buy more.`)}
    ${hNote('Why it matters: at Lv 100 a perfect IV is worth 31 points in a stat and full EVs 63. A base-100 stat is 205 with neither and 299 with both, so the same Pokémon can be almost half again as fast or as strong.')}`;
}

/* ---------- Hubben (steg 1.10): et rutenett med emner i grupper ----------
   Hvert emne åpner med ett bilde og en kort forklaring (HLEAD, høyst rundt 40 ord, på begge språk); «More» folder ut alt det andre.
   HGRP = gruppene og emnene i rutenettet. HSUB = emner som hører under et annet (lenket derfra, ikke egne ruter). */
/* Emnene som hører til noe spilleren ikke har møtt ennå (reisen), vises ikke før det er åpnet. */
const HELPJ = { modes: 'battles', bonus: 'battles', events: 'held', train: 'train', held: 'held', mega: 'train', shop: 'shop', ach: 'shop' };
const helpOk = k => typeof jOn !== 'function' || !jOn() || (k === 'raids' ? !!S.humb : !HELPJ[k] || has(HELPJ[k]));
const HGRP = [['The basics', ['start', 'timer', 'catch']], ['Your Pokémon', ['team', 'train', 'held']], ['Battles', ['modes', 'raids']], ['More', ['shop', 'ach', 'sync']]];
const HSUB = { modes: ['bonus', 'events'], held: ['mega'], sync: ['fair'] };
const HSHORT = { start: 'How it works', timer: 'The timer', catch: 'Catching', team: 'Your team', train: 'Training', held: 'Held items', modes: 'Battles', raids: 'Raids', shop: 'Shop', ach: 'Medals', sync: 'Saving', bonus: 'The battle bonus', events: 'Special events', mega: 'Mega Evolution', fair: 'Fair play' };
const HLEAD = {
  start: { pic: () => `<div class="hl-flow">${icn('clock')}<i></i><span class="grass live"><i></i><i></i><i></i><i></i></span><i></i>${icn('sword')}</div>`, t: 'Study with the timer on. Every minute gives XP and coins, and every 20 minutes a wild Pokémon turns up. When the day is done, your team battles. The game only gives: a day you skip costs nothing.' },
  timer: { pic: () => '<span class="go tr-go">Start 45 min</span>', t: 'Pick a subject and a length, and press Start. You can lock the phone: the timer follows the clock. Your own subjects count in full, and other things at half value for the battle bonus.' },
  catch: { pic: () => `<div class="hl-col">${ballEl('poke', '40px')}${hMeter()}</div>`, t: 'Wild Pokémon wait in the grass until you have time. Stop the marker in the green zone to catch one, or in the gold for a perfect throw. You get three throws before it runs.' },
  team: { pic: () => spr(hMyPartner(), { ani: 1, s: '96px' }), t: 'Six Pokémon fight for you. The first is your partner: it gets all the XP from your study minutes, the others 30 %. Tap one in Team to see its power and moves, or to swap it.' },
  train: { pic: () => '<div class="hl-col"><span class="hl-stars">★★★<i>★★</i></span><span class="tb hbx" style="width:140px"><i style="width:62%"></i></span></div>', t: 'Stars show how strong a Pokémon was born. Training with coins adds on top of that, and your partner trains a little for every two minutes you study.' },
  held: { pic: () => heldEl('sitrus', '56px'), t: 'A Pokémon can hold one item in battle: a berry that heals it, a plate that makes one type hit harder, or gear. Give it on the card under Team.' },
  mega: { pic: () => '<span class="gem mg" style="width:56px;height:56px"></span>', t: 'The first Champion you beat gives you the Mega Ring. One Pokémon holding its Mega Stone can then Mega Evolve each battle, from the move menu.' },
  modes: { pic: () => '<div class="tr-modes"><span class="ficon hfi">L</span><span class="ficon hfi">F</span><span class="ficon hfi">W</span></div>', t: 'After {min} minutes of study, press Done for today and pick one mode: the Trainer League with your own team, the Battle Frontier with rentals, or the World Tournament.', v: () => ({ min: OPENMIN }) },
  bonus: { pic: () => `<div class="tr-bar">${hBar(0.62, 0.5, goalTop().toFixed(1))}</div>`, t: 'Every minute you study today raises today\'s battle bonus, from ×0.5 up to ×{top} at your goal. It multiplies the coins your battles pay.', v: () => ({ top: goalTop().toFixed(1) }) },
  events: { pic: () => `<span class="evc-ic hev" style="--ec:${EVENTS.gold.c};transform:scale(1.5)">${EVENTS.gold.ic}</span>`, t: 'About every third battle day is special: more coins, Mega forms for three of yours, better shiny odds and more. Events are only ever for you, never for your opponents.' },
  raids: { pic: () => '<span class="raid-sp qm hqm tr-raid"><i>?</i></span>', t: 'Now and then a legendary Pokémon shows itself after the day\'s battles. It fights your whole team, and you get {n} attempts, one a day. Win, and it is yours.', v: () => ({ n: RAIDTRIES }) },
  shop: { pic: () => '<span class="coin hcoin" style="transform:scale(1.6)"><i></i></span>', t: 'Coins come from study and battles. They buy balls, packs of Pokémon and things for your team. Every pack shows your own odds before you buy.' },
  ach: { pic: () => { const R = rankOf(); return avFrame(R, 'lg', 1); }, t: 'Medals for what you do: study hours, species caught, League wins. Each step pays coins, and your medals raise your rank, the frame around your picture.' },
  fair: { pic: () => hSym('✓', 'var(--sage)'), t: 'Fokusdex cannot see whether you really study, and trusts you with that. It only closes the shortcuts it can: the clock, old saves and abandoned battles.' },
  sync: { pic: () => hSym('⇅', 'var(--blue)'), t: 'Your game is saved on this device as you go. Sync keeps a copy in a private GitHub repository, so it follows you between devices.' }
};
function helpOpen(k, more) {
  const T = HELP.find(t => t.k === k), L = T && HLEAD[k], subs = T ? (HSUB[k] || []).filter(helpOk) : [], par = T ? Object.keys(HSUB).find(p => HSUB[p].includes(k)) : '';
  if (T) U.hmore = more ? k : '';
  const tile = t => `<button type="button" class="htile" data-a="help" data-k="${t.k}"><span class="hic">${t.ic()}</span><b>${HSHORT[t.k] || t.n}</b></button>`;
  const html = T
    ? `<div class="row" style="justify-content:space-between"><button type="button" class="btn sm2" data-a="help" data-k="${par && helpOk(par) ? par : ''}">‹ ${par && helpOk(par) ? HSHORT[par] : 'All topics'}</button></div>
       <div class="hlead"><div class="hl-pic">${L ? L.pic() : T.ic()}</div><h2 class="h">${T.n}</h2><p class="hl-t">${L ? tl(L.t, L.v ? L.v() : null) : T.s}</p></div>
       ${subs.length ? `<div class="hmore" style="justify-content:center">${subs.map(s => hLink(s, HSHORT[s])).join('')}</div>` : ''}
       ${U.hmore === k ? `<div class="hbody">${T.body()}</div>` : `<button type="button" class="rs-more" data-a="helpmore" data-k="${k}" aria-expanded="false"><span>More</span>${icn('down')}</button>`}`
    : `<div class="row" style="justify-content:space-between"><h2 class="h" style="font-size:22px;margin:0">Questions</h2></div>
       ${HGRP.map(([g, ks]) => { const l = ks.map(x => HELP.find(t => t.k === x)).filter(t => t && helpOk(t.k)); return l.length ? `<section class="hgrp"><h3 class="lab">${tl(g)}</h3><div class="hgrid3">${l.map(tile).join('')}</div></section>` : ''; }).join('')}
       <div class="hfoot"><button type="button" class="chip" data-a="tour">Start guide</button><button type="button" class="chip" data-a="show">Show the game</button><button type="button" class="chip" data-a="rules">Rules and rewards</button></div>`;
  const sh = document.querySelector('#sheet .sheet.helpsh');
  if (sh) { sh.innerHTML = SHTOP + html; if (!more) sh.scrollTop = 0; }
  else { openSheet(html); const s = document.querySelector('#sheet .sheet'); if (s) s.classList.add('helpsh'); }
  if (!S.hseen) { S.hseen = 1; save(true); const b = document.querySelector('.helpb'); if (b) b.classList.remove('new'); }
}
/* Det lille spørsmålstegnet: i hjørnet på hver side (åpner hubben), og ved siden av ting som har et eget emne. */
const helpBtn = () => `<button type="button" class="helpb${S.hseen ? '' : ' new'}" data-a="help" data-k="" aria-label="Questions and help">?</button>`;
const hq = (k, label) => `<button type="button" class="hq" data-a="help" data-k="${k}" aria-label="${label || 'What is this?'}">?</button>`;

/* ---------- Guiden (steg 1.10) ----------
   Tre eller fire kort, ikke ti: bare runden du går hver dag (les, fang, kjemp). Alt annet kommer med reisen, én ting per studiedag.
   Den som er ny til Pokémon (know() === 0), får kortene med enklere ord og ett til om hva en Pokémon er. Vises én gang rett etter starten, og
   første gang appen åpnes etter en oppdatering som har endret reglene (S.tour !== TOURV). Kan vises igjen fra hubben og fra Profile. */
const TOURV = 2;
function tourSteps() {
  const pid = hMyPartner(), nm = esc(D(pid)[0]), old = S.tour === 1 || (S.tour == null && S.mons.length > 1), nw = know() === 0 && !old, min = OPENMIN;
  const go = `<span class="go tr-go">Start 45 min</span><span class="tr-sub"><span class="grass live"><i></i><i></i><i></i><i></i></span> ${tl('every 20 minutes')}</span>`;
  const path = typeof stPath === 'function' ? stPath() : '';
  if (nw) return [
    { pic: `<span class="tr-mon">${spr(pid, { ani: 1, s: '120px' })}</span>`, n: tl('Meet {name}', { name: nm }), t: tl('A Pokémon is a creature that grows with you. {name} gains experience for every minute you study.', { name: nm }) },
    { pic: go, n: tl('Study, and more appear'), t: tl('Press Start and put the phone away. Every 20 minutes a wild Pokémon turns up and waits for you.') },
    { pic: `<div class="hl-col">${ballEl('poke', '44px')}${hMeter()}</div>`, n: tl('Catch them afterwards'), t: tl('Stop the marker in the green zone, and the ball does the rest.') },
    { pic: `<div class="tr-vs">${spr(pid, { s: '84px' })}<b>VS</b>${spr(19, { s: '84px', sil: 1 })}</div>`, n: tl('Then your team battles'), t: tl('After {min} minutes of study in a day, press Done for today. Your Pokémon then fight other trainers.', { min }) }
  ];
  return (old ? [{ pic: `<span class="tr-mon">${spr(pid, { ani: 1, s: '120px' })}</span>`, n: tl('A lot is new'), t: tl('Fokusdex has been updated. Here is the daily round as it works now, in three cards.') }] : []).concat([
    { pic: go, n: tl('Study is the engine'), t: tl('Every minute gives XP and coins. Every 20 minutes a wild Pokémon waits in the grass.') },
    { pic: `<div class="tr-bar">${hBar(0.62, 0.5, goalTop().toFixed(1))}<span class="sm">${tl('today\'s battle bonus')}</span></div>`, n: tl('The day ends in battles'), t: tl('After {min} minutes, press Done for today. The more you studied, the more the battles pay.', { min }) },
    { pic: path, n: tl('One study day at a time'), t: tl('Shop, shinies, potential, training and raids open as you go. Some rules differ from the main games, so read the short cards.') }
  ]);
}
function tourShow(i) {
  const L = tourSteps(); i = Math.max(0, Math.min(L.length - 1, i || 0)); U.tour = i;
  const s = L[i], last = i === L.length - 1;
  ov(`<div class="st-top">${i ? '<button type="button" class="btn sm2" data-a="tourgo" data-k="-1">Back</button>' : '<span class="st-sp"></span>'}<span class="st-dots" role="img" aria-label="${i + 1} of ${L.length}">${L.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'was' : ''}"></i>`).join('')}</span>${last ? '<span class="st-sp"></span>' : '<button type="button" class="btn sm2" data-a="tourend">Skip</button>'}</div>
    <div class="mid tour"><div class="tr-pic">${s.pic}</div><div><h1 class="big" style="font-size:28px">${s.n}</h1><p class="mut" style="margin-top:10px;max-width:30ch;font-size:16px;line-height:1.45">${s.t}</p></div></div>
    <div class="acts"><button type="button" class="btn ${last ? 'gold' : 'pri'}" data-a="${last ? 'tourend' : 'tourgo'}" data-k="1">${last ? 'Start studying' : 'Next'}</button></div>`, 'tint', 'var(--sage)');
}
function tourEnd(hub) { if (S.tour !== TOURV) { S.tour = TOURV; save(true); } closeOv(); render(); if (hub) helpOpen(''); else if (typeof raidArrive === 'function' && raidGo()) raidArrive(); }

/* ---------- Første gang Train åpnes: hva potensial og treningspoeng er. Kan hentes fram igjen med spørsmålstegnet der. ---------- */
const trainTipOn = () => !(S.tip && S.tip.train) || U.trhelp;
/* Bildet i tipset (v81, Jazz 17.11: «vis med praktisk eksempel på forskjell i steg med bilder i stedet for så mye tekst»): den Pokémonen
   du trener, i tre trinn på nivå 100: som den ble født, ferdig trent, og med Hyper Training. Hver søyle er delt i det nivået gir (grå), det den
   ble født med (IV, gull) og det treningen gir (EV, typefargen): de samme fargene som radene under. Er den født med 31, er det to trinn.
   Søylene starter ikke på null (cut): ellers blir trinnene for små til å se. Tallene over er de ekte. Eksempelet følger verdien som er valgt under. */
function trainPic(m, i) {
  if (m.id === 292 && i === 0) i = 1;
  const mk = f => { const c = { id: m.id, lv: 100, mega: m.mega, nat: m.nat, iv: m.iv.slice(), ev: [0, 0, 0, 0, 0, 0], ht: [0, 0, 0, 0, 0, 0] }; f(c); return statsOf(c)[i]; };
  const s0 = mk(c => { c.iv[i] = 0; }), s1 = mk(() => {}), s2 = mk(c => { c.ev[i] = EVMAX; }), s3 = mk(c => { c.ev[i] = EVMAX; c.ht[i] = 1; }), top = Math.max(s3, 1), cut = Math.round(s0 * 0.62);
  const col = (v, iv, ev, lab, sub, d, cls) => `<div class="trp-c${cls ? ' ' + cls : ''}"><em class="tn">${d ? '+' + d : ''}</em><b class="tn">${v}</b>${spr(m.id, { sh: m.sh, mega: m.mega, s: '40px' })}<i class="trp-b" style="height:${Math.max(10, Math.round((v - cut) / Math.max(1, top - cut) * 78))}px"><u style="flex:${Math.max(1, v - iv - ev - cut)}"></u><u class="iv" style="flex:${iv}"></u><u class="ev" style="flex:${ev}"></u></i><small>${lab}</small><small class="s">${sub}</small></div>`;
  return `<div class="trp" role="img" aria-label="${esc(mName(m))}, ${SN[i]} at level 100: ${s1} as born, ${s2} fully trained${s3 > s2 ? `, ${s3} with Hyper Training` : ''}">
    <div class="trp-h">${tl('{p}: {s} at Lv 100', { p: esc(mName(m)), s: `<b>${SN[i]}</b>` })}</div>
    <div class="trp-s">${col(s1, s1 - s0, 0, tl('As born'), tl('IV {a} of 31', { a: m.iv[i] }))}${col(s2, s1 - s0, s2 - s1, tl('Trained'), tl('{n} EVs', { n: EVMAX }), s2 - s1, 'e')}${s3 > s2 ? col(s3, s3 - s2 + s1 - s0, s2 - s1, tl('Hyper trained'), tl('IV counts as 31'), s3 - s2, 'h') : ''}</div>
    <p class="trp-l"><i class="iv"></i><span>${tl('<b>IV</b> · born with it, 0 to 31. Hyper Training (from Lv {l}) counts it as 31.', { l: HTLV })}</span></p>
    <p class="trp-l"><i class="ev"></i><span>${tl('<b>EV</b> · from training: {a} per stat, {b} in all, so two stats can be maxed.', { a: EVMAX, b: EVTOT })}</span></p></div>`;
}
function trainTip(m, i) {
  if (!trainTipOn()) return '';
  return `<div class="card2 trtip"><div class="row" style="justify-content:space-between"><b>How training works</b>${hq('train', 'More about training')}</div>${m ? trainPic(m, i == null ? 0 : i) : helpTrain()}
    <p class="sm">${m ? 'Tap a stat below to see it here. Start with Speed and the attack stat it uses.' : 'Tap a stat below to train it. A good first choice is Speed, and the attack stat it uses.'}</p><button type="button" class="btn sm2 wide" data-a="trtipok">Got it</button></div>`;
}

const HA = {
  help: el => { sfx.open(); helpOpen(el.dataset.k || ''); },
  helpmore: el => { helpOpen(el.dataset.k || '', 1); const b = document.querySelector('.helpsh .hbody'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
  tour: () => { closeSheet(); sfx.open(); tourShow(0); },
  tourgo: el => { tourShow((U.tour || 0) + (+el.dataset.k || 1)); },
  tourend: () => { sfx.ok(); tourEnd(false); },
  tourhub: () => { tourEnd(true); },
  trtipok: () => { (S.tip || (S.tip = {})).train = 1; U.trhelp = 0; save(true); const m = monBy(U.tru); if (m) trainSheet(m); },
  trtip: () => { U.trhelp = U.trhelp ? 0 : 1; const m = monBy(U.tru); if (m) trainSheet(m); }
};
