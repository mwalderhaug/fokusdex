'use strict';
/* Fokusdex – spillregler og lagring. Skjermene ligger i ui.js.
   Sløyfa: fokusminutter → XP og mynter → møter → fangst → lag, samling og butikk.
   Alt lagres i nettleseren (localStorage). Synk til et privat GitHub-repo er valgfritt (Profil → Synk). */

const TYN = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
const TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
/* Regioner = generasjoner. c er prisen for å låse opp. */
/* Områdene: a–b = artene som hører til. Et nytt område åpner seg når du er erfaren nok (trenernivå lv) eller har samlet nok arter (dex), det som kommer først. */
const REG = [null, { n: 'Kanto', a: 1, b: 151, lv: 1, dex: 0 }, { n: 'Johto', a: 152, b: 251, lv: 5, dex: 30 }, { n: 'Hoenn', a: 252, b: 386, lv: 9, dex: 70 }, { n: 'Sinnoh', a: 387, b: 493, lv: 14, dex: 120 }, { n: 'Unova', a: 494, b: 649, lv: 19, dex: 180 }];
/* Fagene ligger i lagringen (S.fag), så hver spiller har sine egne: n = navn, c = farge, ty = typer som dukker opp oftere,
   t = planlagte timer, b = minutter gjort før appen, d = eksamensdato, ms = milepæler hentet.
   Økter kan også føres på andre aktiviteter (EXTRA: jobbsøking, musikk, lesing …). De teller OTHERW av et fag: halv XP, halve mynter, halvt så
   mange møter og halv framdrift mot dagsmålet, og timene føres for seg. Har spilleren ingen egne fag, teller alt fullt. */
const OTHERW = 0.5;
/* XP fra andre ting enn fagene (XP-en fagene gir, ganget med dette). Møter og mynter er de samme som for fagene; bare kampbonusen og dagsmålet teller halvt (OTHERW). */
const OTHERXP = 0.75;
const EXTRA = { sok: { n: 'Job apps', c: '#D4BC8E', ty: [2, 9] }, musikk: { n: 'Music', c: '#C9A8B4', ty: [0, 17] }, lesing: { n: 'Reading', c: '#A8B6C9', ty: [13, 7] }, prosjekt: { n: 'Project', c: '#B4C2A0', ty: [8, 12] }, annet: { n: 'Other', c: '#AFA89E', ty: [] } };
const isSubj = k => !!(S.fag && S.fag[k]);
const rateOf = k => isSubj(k) || !Object.keys(S.fag || {}).length ? 1 : OTHERW;
/* Loggførte minutter (virkelige, ikke vektet) på fag og på andre aktiviteter. */
function focusSplit() { let a = 0, b = 0; for (const d of Object.values(S.log)) for (const k in d.f || {}) { if (EXTRA[k]) b += d.f[k]; else a += d.f[k]; } return { subj: a, other: b }; }
/* Jazz sine fag fra før fagene kunne velges. Brukes bare for å oppgradere gamle lagringer. */
const LEGACY = { bban: { n: 'BBAN', c: '#B9AFC9', ty: [12, 8] }, cf: { n: 'CF', c: '#A9C3A2', ty: [0, 1] }, met: { n: 'MET', c: '#9FBDB8', ty: [13, 7] }, bsmo: { n: 'Ø&B', c: '#BDBE92', ty: [11, 10, 6] } };
const PAL = ['#B9AFC9', '#A9C3A2', '#9FBDB8', '#BDBE92'];
let FAGS = {};
function buildFags() {
  FAGS = {};
  for (const k in S.fag) { const f = S.fag[k]; FAGS[k] = { n: f.n, c: f.c, ty: f.ty || [] }; }
  for (const k of Object.keys(EXTRA)) if (k === 'annet' || (S.extra || []).includes(k)) FAGS[k] = EXTRA[k];
}
const F = k => FAGS[k] || EXTRA.annet;
const curFag = () => FAGS[S.last.fag] ? S.last.fag : Object.keys(FAGS)[0];
const SHOP = {
  poke: { n: 'Poké Ball', p: 20, d: 'Standard ball', img: 'poke-ball', bc: '#d98f7e' },
  great: { n: 'Great Ball', p: 60, d: 'Better odds · trainer level 3', lv: 3, img: 'great-ball', bc: '#7fa8e6' },
  ultra: { n: 'Ultra Ball', p: 150, d: 'Best odds · trainer level 7', lv: 7, img: 'ultra-ball', bc: '#e3c577' },
  dusk: { n: 'Dusk Ball', p: 350, d: 'Ultra Ball odds, and a third better on legendary Pokémon · trainer level 10', lv: 10, img: 'dusk-ball', bc: '#4f8a5b' },
  master: { n: 'Master Ball', p: 60000, d: 'Never fails. You can carry one · trainer level 28', lv: 28, img: 'master-ball', bc: '#8a5fc0', max: 1 },
  /* Til kamp: brukes fra veska i ligakamper (bt = kampgjenstand). */
  potion: { n: 'Potion', p: 20, d: 'Heals 20 HP in battle', img: 'potion', bc: '#b28fe0', bt: 1 },
  super: { n: 'Super Potion', p: 45, d: 'Heals 60 HP in battle', img: 'super-potion', bc: '#e0845a', bt: 1 },
  hyper: { n: 'Hyper Potion', p: 90, d: 'Heals 120 HP in battle', img: 'hyper-potion', bc: '#e06a9a', bt: 1 },
  maxp: { n: 'Max Potion', p: 160, d: 'Heals all HP in battle', img: 'max-potion', bc: '#5a8fe0', bt: 1 },
  heal: { n: 'Full Heal', p: 40, d: 'Cures poison, burn, sleep and the rest', img: 'full-heal', bc: '#e3c577', bt: 1 },
  revive: { n: 'Revive', p: 120, d: 'Brings back a fainted Pokémon with half its HP', img: 'revive', bc: '#e3c577', bt: 1 },
  maxrev: { n: 'Max Revive', p: 300, d: 'Brings back a fainted Pokémon with all its HP', img: 'max-revive', bc: '#e3c577', bt: 1 },
  ash: { n: 'Sacred Ash', p: 4000, d: 'Raids only: every fainted Pokémon is back with half its HP. You can carry two · trainer level 16', lv: 16, img: 'sacred-ash', bc: '#e3c577', bt: 1, max: 2 },
  incense: { n: 'Incense', p: 80, d: 'Next session: one extra encounter and rarer finds', ic: 'smoke' },
  lure: { n: 'Lure', p: 350, d: 'One more encounter in each of your next 3 sessions · trainer level 6', lv: 6, img: 'lure', bc: '#7fa8e6' },
  slure: { n: 'Super Lure', p: 1200, d: 'Rarer Pokémon in your next 3 sessions · trainer level 12', lv: 12, img: 'super-lure', bc: '#e3c577' },
  gberry: { n: 'Golden Razz Berry', p: 600, d: 'Feed it to a Pokémon you meet: one more throw and better odds · trainer level 14', lv: 14, img: 'golden-razz-berry', bc: '#e3c577' },
  glint: { n: 'Glint Incense', p: 2000, d: 'Shiny odds ×2 for 24 hours: encounters, packs and eggs · trainer level 8', lv: 8, img: 'luck-incense', bc: '#e3c577', sb: [2, 24] },
  gleam: { n: 'Gleam Incense', p: 6000, d: 'Shiny odds ×3 for 48 hours · trainer level 16', lv: 16, img: 'pure-incense', bc: '#e3c577', sb: [3, 48] },
  radiant: { n: 'Radiant Incense', p: 18000, d: 'Shiny odds ×5 for 72 hours · trainer level 24', lv: 24, img: 'full-incense', bc: '#e3c577', sb: [5, 72] },
  prism: { n: 'Prism Lure', p: 12000, d: 'The next legendary raid has a 1 in 5 chance of being shiny · trainer level 20', lv: 20, img: 'prism-scale', bc: '#b295e6' },
  candy: { n: 'Rare Candy', p: 150, d: 'One level up for one Pokémon', ic: 'candy' },
  mstone: { n: 'Mega Stone', p: 3000, d: 'Give it to one Pokémon that has a Mega form. It can then Mega Evolve once a battle', ic: 'gem', ring: 1 },
  stone: { n: 'Evolution Stone', p: 300, d: 'For those that do not evolve by level alone', ic: 'gem' },
  egg: { n: 'Egg', p: 250, d: 'Hatches after 120 focus minutes. Can be from any region', ic: 'egg' }
};
/* Hyllene i butikken, i den rekkefølgen de står. Det som er låst, vises med trenernivået det krever: noe å se fram til. */
const SHELF = [['Balls', ['poke', 'great', 'ultra', 'dusk', 'master']], ['For the hunt', ['incense', 'lure', 'slure', 'gberry']], ['Shiny hunting', ['glint', 'gleam', 'radiant', 'prism']],
  ['For your Pokémon', ['candy', 'stone', 'mstone', 'egg']], ['For battles', ['potion', 'super', 'hyper', 'maxp', 'heal', 'revive', 'maxrev', 'ash']]];
/* ---------- Gjenstander en Pokémon kan HOLDE (HELD) ----------
   Hver Pokémon kan holde én (m.item). De ligger i sekken som alt annet (S.items[k]) til de gis til noen (giveHeld), og kommer tilbake dit når de tas av.
   Tre grupper (g): 'once' = brukes opp når den virker (bær og Focus Sash; da er den borte for godt) · 'plate' og 'gear' = varer.
   Virkningen leser kampmotoren (battle.js) fra feltene:
     ty: t     plate: angrep av typen × PLATEX. Arceus blir selv den typen (Multitype, se mTypes), og Judgment følger med.
     res: t    bær: halverer ett supereffektivt treff av typen (Chilan: ett Normal-treff)
     heal: f · hp: n   bær: gir tilbake f av full HP (eller n HP) når HP er nede på halvparten
     cure      Lum Berry: fjerner en tilstand eller forvirring, én gang
     pinch: i  bær: +1 i verdien i (som changeStats teller: 2 Attack … 6 Speed) når HP er nede på en firedel
     sash      Focus Sash: med full HP overlever den et slag som ville slått den ut
     left Leftovers · bell Shell Bell · lo Life Orb · belt Expert Belt · band Muscle Band · glass Wise Glasses · scope Scope Lens · helm Rocky Helmet · evio Eviolite
   Gjelder i ligaen, turneringen og raid (ditt eget lag). Leie-Pokémon i Battle Frontier holder ingenting, og motstanderne heller ikke. */
const PLATEX = 1.2, HELD = {};
{
  const add = (k, n, p, lv, g, fx, d) => { HELD[k] = Object.assign({ n, p, lv, g, d, img: n.toLowerCase().replace(/ /g, '-') }, fx); };
  add('oran', 'Oran Berry', 60, 2, 'once', { hp: 10 }, 'Restores 10 HP when its HP falls to half');
  add('sitrus', 'Sitrus Berry', 350, 6, 'once', { heal: 0.25 }, 'Restores a quarter of its HP when its HP falls to half');
  add('lum', 'Lum Berry', 450, 8, 'once', { cure: 1 }, 'Cures a status condition or confusion');
  add('sash', 'Focus Sash', 900, 12, 'once', { sash: 1 }, 'At full HP it survives a hit that would knock it out');
  [['Liechi', 2, 'Attack'], ['Ganlon', 3, 'Defense'], ['Petaya', 4, 'Sp. Atk'], ['Apicot', 5, 'Sp. Def'], ['Salac', 6, 'Speed']].forEach(([n, i, s]) => add(n.toLowerCase(), n + ' Berry', 300, 10, 'once', { pinch: i }, `${s} rises when its HP falls to a quarter`));
  ['Chilan', 'Chople', 'Coba', 'Kebia', 'Shuca', 'Charti', 'Tanga', 'Kasib', 'Babiri', 'Occa', 'Passho', 'Rindo', 'Wacan', 'Payapa', 'Yache', 'Haban', 'Colbur', 'Roseli'].forEach((n, t) => add('r' + t, n + ' Berry', 250, 9, 'once', { res: t }, t ? `Halves one super effective ${TYN[t]} hit` : 'Halves one Normal hit'));
  [null, 'Fist', 'Sky', 'Toxic', 'Earth', 'Stone', 'Insect', 'Spooky', 'Iron', 'Flame', 'Splash', 'Meadow', 'Zap', 'Mind', 'Icicle', 'Draco', 'Dread', 'Pixie'].forEach((n, t) => { if (n) add('p' + t, n + ' Plate', 5000, 10, 'plate', { ty: t }, `${TYN[t]} moves hit ${Math.round((PLATEX - 1) * 100)} % harder`); });
  add('eviolite', 'Eviolite', 5000, 8, 'gear', { evio: 1 }, 'Defense and Sp. Def ×1.5 for a Pokémon that can still evolve');
  add('muscleband', 'Muscle Band', 4000, 9, 'gear', { band: 1 }, 'Physical moves hit 10 % harder');
  add('wiseglasses', 'Wise Glasses', 4000, 9, 'gear', { glass: 1 }, 'Special moves hit 10 % harder');
  add('scopelens', 'Scope Lens', 5000, 11, 'gear', { scope: 1 }, 'Critical hits come more often');
  add('expertbelt', 'Expert Belt', 6000, 12, 'gear', { belt: 1 }, 'Super effective moves hit 20 % harder');
  add('shellbell', 'Shell Bell', 6000, 12, 'gear', { bell: 1 }, 'Restores an eighth of the damage it deals');
  add('rockyhelmet', 'Rocky Helmet', 6000, 13, 'gear', { helm: 1 }, 'An attacker that makes contact loses a sixth of its HP');
  add('leftovers', 'Leftovers', 9000, 14, 'gear', { left: 1 }, 'Restores a sixteenth of its HP every turn');
  add('lifeorb', 'Life Orb', 12000, 18, 'gear', { lo: 1 }, 'Moves hit 30 % harder, and every attack costs a tenth of its HP');
}
const HELDG = [['once', 'Berries · used up when they work'], ['plate', 'Plates · they last'], ['gear', 'Gear · it lasts']];
const heldOf = m => (m && m.item && HELD[m.item]) || null;
/* Gir m gjenstanden k fra sekken; den m holdt fra før, går tilbake dit. k = '' tar den av. */
function giveHeld(m, k) {
  if (!m || (m.item || '') === (k || '') || (k && (!HELD[k] || !(S.items[k] > 0)))) return false;
  if (heldOf(m)) S.items[m.item] = (S.items[m.item] || 0) + 1;
  if (k) { S.items[k]--; m.item = k; } else delete m.item;
  save(); return true;
}
/* Den som selges eller byttes bort, legger fra seg det den holder. */
function dropHeld(m) { if (heldOf(m)) S.items[m.item] = (S.items[m.item] || 0) + 1; if (m) delete m.item; }
/* BÆR FRA ØKTENE: en økt på minst BERRYMIN minutter kan gi et bær. Sjansen vokser med lengden (BERRYP per time, høyst BERRYTOP). De vanligste
   er Oran og Sitrus; så bærene mot en type, de som løfter en verdi, og sjelden Lum. Platene kommer fra raid (den legendariskes type) og butikken. */
const BERRYMIN = 25, BERRYP = 0.3, BERRYTOP = 0.6, PINCH = ['liechi', 'ganlon', 'petaya', 'apicot', 'salac'];
function berryFind(min) {
  if (!(min >= BERRYMIN) || Math.random() >= Math.min(BERRYTOP, BERRYP * min / 60)) return '';
  const r = Math.random(), k = r < 0.4 ? 'oran' : r < 0.65 ? 'sitrus' : r < 0.85 ? 'r' + rnd(18) : r < 0.95 ? PINCH[rnd(5)] : 'lum';
  S.items[k] = (S.items[k] || 0) + 1; return k;
}
/* Alt du eier av gjenstanden: i sekken og det Pokémonene dine holder. */
const heldTotal = k => (S.items[k] || 0) + S.mons.filter(m => m.item === k).length;
function buyHeld(k) { const it = HELD[k]; if (!it || S.coins < it.p || tlv() < it.lv) return false; S.coins -= it.p; S.items[k] = (S.items[k] || 0) + 1; save(); return true; }
/* Ballene. Dusk Ball er som en Ultra Ball, og LEGBALL ganger så god på legendariske (litt, ikke mye). Master Ball bommer aldri og velges aldri av seg selv.
   Golden Razz Berry (feedBerry): ett kast til på møtet og BERRYM ganger så god sjanse, én per møte. */
const BALLS = ['poke', 'great', 'ultra', 'dusk', 'master'];
const BALLM = { poke: 1, great: 1.5, ultra: 2.2, dusk: 2.2, master: 1 }, LEGBALL = 1.35, BERRYM = 1.15;
/* Lokkemidlene varer LUREN økter. Shiny-røkelsen (sb: [ganger, timer]) varer i timer på klokka, og bare én brenner om gangen. */
const LUREN = 3;
const shopOwn = k => k === 'egg' ? S.eggs.length : k === 'incense' ? (S.incOn ? 1 : 0) : k === 'lure' ? S.lure || 0 : k === 'slure' ? S.slure || 0 : k === 'prism' ? (S.prism ? 1 : 0) : SHOP[k].sb ? (S.shb && S.shb.k === k && shinyBoost() > 1 ? 1 : 0) : S.items[k] || 0;
const shopFull = k => k === 'egg' ? S.eggs.length >= 3 : k === 'incense' ? !!S.incOn : k === 'lure' ? S.lure > 0 : k === 'slure' ? S.slure > 0 : k === 'prism' ? !!S.prism : SHOP[k].sb ? shinyBoost() > 1 : SHOP[k].max ? (S.items[k] || 0) >= SHOP[k].max : false;
/* Encounter-pakker: kjøpes for mynter og åpnes med en gang, som å åpne en kortpakke. Tre møter i hver, og den siste plassen er den gode:
   jo dyrere pakke, jo bedre sjanser (min = laveste sjeldenhet, ps/leg = sjansen for en pseudo-legendarisk eller en legendarisk i den plassen,
   shm = så mye likere er en shiny). lv = trenernivået pakken krever. Alle pakker har en liten sjanse for en legendarisk, som et lodd: hvem som helst
   av dem du ikke eier, i områdene dine. Vekten per art (PKLEGW, etter sjeldenhet): vanlige 1, mytiske 1,3, de største 0,25 (også Mewtwo og Deoxys), Arceus 0,1 –
   så de mytiske kommer litt oftere, og de aller største er sjeldne her og kommer heller i raid. Kortet viser ikke hvem det er (myst = 1):
   det får du vite i gresset, i introen. */
const PKLEGW = [0, 1, 0.25, 1.3, 0.1];
/* Et legendarisk møte utenom raid (pakker, økter, merker og bosser): samme trekning overalt. Har du alle i områdene dine, kan det bli en du har fra før. */
function legEnc(shm) {
  const all = typeof LEG === 'undefined' ? [] : Object.keys(LEG).map(Number).filter(id => (PKLEGW[LEG[id].t] || 0) > 0 && S.regions.includes(regOf(id)));
  const fresh = all.filter(id => !S.mons.some(m => m.id === id) && !S.pend.some(e => e.id === id)), ids = fresh.length ? fresh : all;
  if (!ids.length) return Object.assign(genEnc({ leg: 1, shm }), { myst: 1 });
  let tot = 0; const w = ids.map(id => { const x = PKLEGW[LEG[id].t]; tot += x; return x; });
  let x = Math.random() * tot, id = ids[ids.length - 1];
  for (let i = 0; i < ids.length; i++) { x -= w[i]; if (x <= 0) { id = ids[i]; break; } }
  return Object.assign(genEnc({ ids: [id], shm }), { myst: 1 });
}
const PACKS = {
  poke: { n: 'Poké Pack', p: 250, c: '#d98f7e', d: 'One of the three is uncommon or better. 0.2% legendary.', slots: [{ luck: 0 }, { luck: 0.5 }, { min: 1, luck: 0, leg: 0.002 }], shm: 1 },
  great: { n: 'Great Pack', p: 700, c: '#7fa8e6', d: 'One is rare or better, one uncommon or better. 0.5% legendary.', slots: [{ luck: 0.5 }, { min: 1, luck: 0.5 }, { min: 2, luck: 0.6, leg: 0.005 }], shm: 1.2, lv: 3 },
  ultra: { n: 'Ultra Pack', p: 1800, c: '#e3c577', d: 'One is epic. 12% pseudo-legendary, 1.2% legendary. Shiny odds ×1.5.', slots: [{ min: 1, luck: 1.5 }, { min: 2, luck: 1.5 }, { min: 3, luck: 2, ps: 0.12, leg: 0.012 }], shm: 1.5, lv: 5 },
  master: { n: 'Master Pack', p: 6000, c: '#b295e6', d: 'Rare, epic and a top slot: 35% pseudo-legendary, 5% legendary. Shiny odds ×2.', slots: [{ min: 2, luck: 2 }, { min: 3, luck: 2 }, { min: 3, luck: 2, ps: 0.35, leg: 0.05 }], shm: 2, lv: 8 }
};
const PACKMAX = 24;
/* Innholdet i en pakke (tre møter), uten å røre lagringen: brukes av butikken og av demoen. lg = plassen ga en legendarisk, ps = en pseudo-legendarisk.
   demo = den legendariske vises med en gang (det finnes ikke noe gress å møte den i). */
const PKPS = [147, 246, 371, 374, 443, 633];
function packDraw(k, demo) {
  const P = PACKS[k];
  return P.slots.map(sl => { const r = Math.random(), lg = r < (sl.leg || 0) ? legEnc(P.shm) : null, ps = !lg && r < (sl.leg || 0) + (sl.ps || 0), e = lg || (ps ? genEnc({ ids: PKPS, shm: P.shm }) : genEnc({ min: sl.min || 0, luck: sl.luck || 0, shm: P.shm })); e.pk = 1; if (demo) { delete e.myst; if (lg) e.lg = 1; if (ps) e.ps = 1; } return e; });
}
function openPack(k) {
  const P = PACKS[k], free = !!(S.fpk && S.fpk[k] > 0); if (!P || S.pend.length > PACKMAX || (!free && (S.coins < P.p || (P.lv && tlv() < P.lv)))) return null;
  const out = packDraw(k);
  if (free) { if (--S.fpk[k] <= 0) delete S.fpk[k]; } else S.coins -= P.p; S.pend.push(...out); S.packs = (S.packs || 0) + 1; save();
  return out;
}
/* Salgsverdi: sjeldenhet teller mest, nivå løfter prisen (nivå 20 dobler den). */
const SELL = [10, 30, 120, 450, 3000];
const STMULT = [1, 0.22, 0.07];
/* Dagens mål: tre små delmål som gir noe med en gang de nås. */
const QUESTS = [
  { m: 25, n: 'first session', r: '3 Poké Balls', give: () => { S.items.poke += 3; } },
  { m: 180, n: '3 hours', r: '100 coins', give: () => { S.coins += 100; } },
  { m: 300, n: '5 hours', r: 'Rare Candy', give: () => { S.items.candy += 1; } }
];

/* ---------- Arter ---------- */
const D = id => DEX[id - 1];
const _st = {};
const stageOf = id => { if (_st[id] != null) return _st[id]; let s = 0, d = D(id); while (d[4] && s < 2) { s++; d = D(d[4]); } return (_st[id] = s); };
const isLeg = id => !!(D(id)[6] & 3);
const wOf = id => D(id)[3] * STMULT[stageOf(id)];
/* Sjeldenhet: vanlige grunnformer nederst, ferdig utviklede og de vanskeligste øverst. */
const tierOf = id => {
  if (isLeg(id)) return 4;
  const cr = D(id)[3], st = stageOf(id);
  if (st === 2) return 3;
  if (st === 1) return cr >= 120 ? 1 : cr >= 60 ? 2 : 3;
  return cr >= 190 ? 0 : cr >= 100 ? 1 : cr >= 45 ? 2 : 3;
};
const regOf = id => id <= 151 ? 1 : id <= 251 ? 2 : id <= 386 ? 3 : id <= 493 ? 4 : 5;
const EVO = {};
DEX.forEach((d, i) => { if (d[4]) (EVO[d[4]] = EVO[d[4]] || []).push(i + 1); });
/* XP-kurven: 12 · nivå² · (1 + nivå/25). De første nivåene går omtrent som før; nivå 50 koster tre ganger så mye som med den gamle kurven (12 · nivå²)
   og nivå 100 fem ganger, så laget ikke er utlært etter en måned. xpAtOld brukes bare til å regne om lagringer fra før (migrate8). */
const xpAtOld = l => 12 * l * l;
const xpAt = l => Math.round(12 * l * l * (1 + l / 25));
const XPT = Array.from({ length: 102 }, (_, l) => xpAt(l));
const lvOf = xp => { let a = 1, b = 100; while (a < b) { const m = (a + b + 1) >> 1; if (XPT[m] <= xp) a = m; else b = m - 1; } return a; };

/* ---------- Stats, natur, IV/EV og angrep ----------
   Hver Pokémon har iv (0–31 per stat, trukket ved fangst), ev (trenes av fokusminutter), nat (natur 0–24) og mv (opptil fire angrep).
   Statrekkefølge: HP, Attack, Defense, Sp. Atk, Sp. Def, Speed. */
const SN = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
const NAT = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
const NST = [1, 2, 5, 3, 4];
const natUp = n => NST[Math.floor(n / 5)], natDn = n => NST[n % 5];
/* Mega-former (og de to urformene): [art, tillegg i navnet, type 1, type 2, basestats, bildenummer hos PokeAPI]. De ligger utenfor Pokédexen:
   en Pokémon er Mega når den har feltet mega (plassen i lista + 1). Mega-former dukker aldri opp i vanlige møter. */
const MEGA = [[3, '', 11, 3, [80, 100, 123, 122, 120, 80], 10033], [6, 'X', 9, 15, [78, 130, 111, 130, 85, 100], 10034], [6, 'Y', 9, 2, [78, 104, 78, 159, 115, 100], 10035], [9, '', 10, -1, [79, 103, 120, 135, 115, 78], 10036], [15, '', 6, 3, [65, 150, 40, 15, 80, 145], 10090], [18, '', 0, 2, [83, 80, 80, 135, 80, 121], 10073], [26, 'X', 12, -1, [60, 135, 95, 90, 95, 110], 10304], [26, 'Y', 12, -1, [60, 100, 55, 160, 80, 130], 10305], [36, '', 17, 2, [95, 80, 93, 135, 110, 70], 10278], [65, '', 13, -1, [55, 50, 65, 175, 105, 150], 10037], [71, '', 11, 3, [80, 125, 85, 135, 95, 70], 10279], [80, '', 10, 13, [95, 75, 180, 130, 80, 30], 10071], [94, '', 7, 3, [60, 65, 80, 170, 95, 130], 10038], [115, '', 0, -1, [105, 125, 100, 60, 100, 100], 10039], [121, '', 10, 13, [60, 100, 105, 130, 105, 120], 10280], [127, '', 6, 2, [65, 155, 120, 65, 90, 105], 10040], [130, '', 10, 16, [95, 155, 109, 70, 130, 81], 10041], [142, '', 5, 2, [80, 135, 85, 70, 95, 150], 10042], [149, '', 15, 2, [91, 124, 115, 145, 125, 100], 10281], [150, 'X', 13, 1, [106, 190, 100, 154, 100, 130], 10043], [150, 'Y', 13, -1, [106, 150, 70, 194, 120, 140], 10044], [154, '', 11, 17, [80, 92, 115, 143, 115, 80], 10282], [160, '', 10, 15, [85, 160, 125, 89, 93, 78], 10283], [181, '', 12, 15, [90, 95, 105, 165, 110, 45], 10045], [208, '', 8, 4, [75, 125, 230, 55, 95, 30], 10072], [212, '', 6, 8, [70, 150, 140, 65, 100, 75], 10046], [214, '', 6, 1, [80, 185, 115, 40, 105, 75], 10047], [227, '', 8, 2, [65, 140, 110, 40, 100, 110], 10284], [229, '', 16, 9, [75, 90, 90, 140, 90, 115], 10048], [248, '', 5, 16, [100, 164, 150, 95, 120, 71], 10049], [254, '', 11, 15, [70, 110, 75, 145, 85, 145], 10065], [257, '', 9, 1, [80, 160, 80, 130, 80, 100], 10050], [260, '', 10, 4, [100, 150, 110, 95, 110, 70], 10064], [282, '', 13, 17, [68, 85, 65, 165, 135, 100], 10051], [302, '', 16, 7, [50, 85, 125, 85, 115, 20], 10066], [303, '', 8, 17, [50, 105, 125, 55, 95, 50], 10052], [306, '', 8, -1, [70, 140, 230, 60, 80, 50], 10053], [308, '', 1, 13, [60, 100, 85, 80, 85, 100], 10054], [310, '', 12, -1, [70, 75, 80, 135, 80, 135], 10055], [319, '', 10, 16, [70, 140, 70, 110, 65, 105], 10070], [323, '', 9, 4, [70, 120, 100, 145, 105, 20], 10087], [334, '', 15, 17, [75, 110, 110, 110, 105, 80], 10067], [354, '', 7, -1, [64, 165, 75, 93, 83, 75], 10056], [358, '', 13, 8, [75, 50, 110, 135, 120, 65], 10306], [359, '', 16, -1, [65, 150, 60, 115, 60, 115], 10057], [359, 'Z', 16, 7, [65, 154, 60, 75, 60, 151], 10307], [362, '', 14, -1, [80, 120, 80, 120, 80, 100], 10074], [373, '', 15, 2, [95, 145, 130, 120, 90, 120], 10089], [376, '', 8, 13, [80, 145, 150, 105, 110, 110], 10076], [380, '', 15, 13, [80, 100, 120, 140, 150, 110], 10062], [381, '', 15, 13, [80, 130, 100, 160, 120, 110], 10063], [382, 'Primal', 10, -1, [100, 150, 90, 180, 160, 90], 10077], [383, 'Primal', 4, 9, [100, 180, 160, 150, 90, 90], 10078], [384, '', 15, 2, [105, 180, 100, 180, 100, 115], 10079], [398, '', 1, 2, [85, 140, 100, 60, 90, 110], 10308], [428, '', 0, 1, [65, 136, 94, 54, 96, 135], 10088], [445, '', 15, 4, [108, 170, 115, 120, 95, 92], 10058], [445, 'Z', 15, -1, [108, 130, 85, 141, 85, 151], 10309], [448, '', 1, 8, [70, 145, 88, 140, 70, 112], 10059], [448, 'Z', 1, 8, [70, 100, 70, 164, 70, 151], 10310], [460, '', 11, 14, [90, 132, 105, 132, 105, 30], 10060], [475, '', 13, 1, [68, 165, 95, 65, 115, 110], 10068], [478, '', 14, 7, [70, 80, 70, 140, 100, 120], 10285], [485, '', 9, 8, [91, 120, 106, 175, 141, 67], 10311], [491, '', 16, -1, [70, 120, 130, 165, 130, 85], 10312], [500, '', 9, 1, [110, 148, 75, 110, 110, 75], 10286], [530, '', 4, 8, [110, 165, 100, 65, 65, 103], 10287], [531, '', 0, 17, [103, 60, 126, 80, 126, 50], 10069], [545, '', 6, 3, [60, 140, 149, 75, 99, 62], 10288], [560, '', 16, 1, [65, 130, 135, 55, 135, 68], 10289], [604, '', 12, -1, [85, 145, 80, 135, 90, 80], 10290], [609, '', 7, 9, [60, 75, 110, 175, 110, 90], 10291], [623, '', 4, 7, [89, 159, 105, 70, 105, 55], 10313]];
/* Giratina i Origin Forme ligger i samme liste (den er en form, ikke en Mega): [.., bildenummer, 1 = har animert bilde fra Black/White, høyde i dm]. */
MEGA.push([487, 'Origin', 7, 15, [150, 120, 100, 120, 100, 90], 10007, 1, 69]);
const ORIGIN = MEGA.length;
/* Deoxys sine former ligger her også. I raid åpner den i Attack Forme, går i Defense Forme når kampen er i gang, og tilbake i Attack Forme når den blir rasende (raidForm). */
const DEOXYS = 386;
MEGA.push([DEOXYS, 'Defense', 13, -1, [50, 70, 160, 70, 160, 90], 10002, 1, 17]);
const DEOXD = MEGA.length;
MEGA.push([DEOXYS, 'Attack', 13, -1, [50, 180, 20, 180, 20, 150], 10001, 1, 17]);
const DEOXA = MEGA.length;
/* Former som ikke er Mega: de teller ikke som Mega Evolution, og navnet står som det er. */
const FORMS = new Set(['Origin', 'Defense', 'Attack']);
/* Formen en art har når den dukker opp (Giratina kommer i Origin Forme og kan byttes på kortet). */
const defForm = id => id === 487 ? ORIGIN : 0;
const megaOf = m => m && m.mega ? MEGA[m.mega - 1] : null;
const isMega = m => { const g = megaOf(m); return !!g && !FORMS.has(g[1]); };
/* Mega Evolution i kamp. megaOpts = formene en art har (plass i MEGA + 1; Charizard og Mewtwo har to). En egen Pokémon kan mega-utvikle seg når
   du har Mega Ring (S.ring, fra den første Champion du slår) og den har fått en Mega Stone (m.ms = formen; S.items.mstone er steinene du har).
   De legendariske bruker ikke vanlige steiner: deres vinnes ved å slå dem i raid (S.lst[art] = 1), og gjelder alle du eier av arten.
   Motstandere og raid-bosser bærer formen sin i ms. Én Mega per side per kamp; formen varer kampen ut. */
const megaOpts = id => MEGA.reduce((a, g, k) => { if (g[0] === id && !FORMS.has(g[1])) a.push(k + 1); return a; }, []);
const megaName = k => spName({ id: MEGA[k - 1][0], mega: k });
const hasStone = id => !!(S.lst && S.lst[id]);
function megaForm(src) {
  if (!src || src.mega) return 0;
  const o = megaOpts(src.id); if (!o.length) return 0;
  if (!src.u) return o.includes(src.ms) ? src.ms : 0;
  if (!S.ring) return 0;
  if (isLeg(src.id)) return hasStone(src.id) ? (o.includes(src.ms) ? src.ms : o[0]) : 0;
  return o.includes(src.ms) ? src.ms : 0;
}
/* Gir en Mega Stone til en av dine (bruker opp steinen), eller bytter form på en som alt har en (gratis). Legendariske bytter bare form. */
function bondMega(m, k) {
  const o = megaOpts(m.id); if (!S.ring || !o.includes(k)) return false;
  if (isLeg(m.id)) { if (!hasStone(m.id)) return false; m.ms = k; save(); return true; }
  if (!o.includes(m.ms)) { if (!(S.items.mstone > 0)) return false; S.items.mstone--; }
  m.ms = k; save(); return true;
}
/* Når en Pokémon forlater deg (salg, bytte), får du steinen dens tilbake. */
function unbond(m) { if (m && m.ms && !isLeg(m.id) && megaOpts(m.id).includes(m.ms)) { S.items.mstone = (S.items.mstone || 0) + 1; m.ms = 0; return true; } return false; }
/* Høyden i Pokédexen (meter), til størrelsen i kamp. */
const HT = '070a14060b11050a1003070b03060a030b0f0307030c14230408060a04080d05090e060d060b050a081005080c030a0a0f0207040a0811050a0713060a0d090d0f080f10070a110910040a0e0a110c10030a080e120b11090c030f0d100f580a10040d050c0414040a0f0e0c060c0a130b0a16040c060d080b0d0f0e0b0d0f0e09411903030a080908040a050d12151110141228161404090c12050911060b17081207100a0e050b12050c0303030306020f06080e0404080c0b0406080803080c040e090a051407050d0f060c0f0b5c060e0512060f0906120708040b060609091511060e12050b060e0c070e0406070c0f131514060c1434260605091104091304070f050a040503060a070c050c0f050a0d0307060c0408100508040c080e14050808060a0f0a17020a060b0506040915060d060f040407060304110812149107130507090b070b14040d040b0d1b0a0c0409060b050f0a0f070f063e030a060b081014060c06070f080b0e0411120a06060b0f060c101112130e142d23460311040b1605090c04081103060c050a030a05090e02090910050d020509030c04070b040503090c040c040c0909050a02040a050d050606050a070e1306070c0814080d070d0e040c0a0a160b0c11181412100f130a08141909100e160d03030303362a11252d0f04030f022004060821050a1005080f050b04090c040b060b060a060a060b03060c0810040911040903070b060c0e05080f0d0e03050c040c190307050b0a070a0f060d0a030e060b0e0511070c050e06130710040504070f03060a050d040b0d061304050a02060c160c0108060a030606020c15050a03060a060a12051a0b040807090e100a1c051010050f050c0e03080e120b101513140f0f201d0f1e0e060f';
const htOf = (id, mega) => { const g = mega ? MEGA[mega - 1] : null; return (g && g[7] ? g[7] : parseInt(HT.substr((id - 1) * 2, 2), 16) || 10) / 10; };
/* Kjønn: GR er andelen hunner i åttedeler per art (9 = uten kjønn). m.g: 0 = hann, 1 = hunn, 2 = uten kjønn. */
const GR = '1111111114444444444444444444888000666666444444444444444442244422222244444444444499444444444444444449944440044444848444499448224044491111911111199944499111111111444444444444661144444444444444444441144494444444664444444444464444444444944008228899944499911111111144444444444444444444444444444449444226466444444444440844444444444444444444449944449911114444444444444444444416444999999809999911111111144444444444411114801844444444444444664449944844444111444444444444494442214114490448999999499899999911111111144444441111114444444444444442224440044444444884444444444444411114411666664444444444444444444444999444444444444494444449944400884444444999009909999';
const rollG = (id, r) => { const q = +GR[id - 1]; return q === 9 || isNaN(q) ? 2 : (r == null ? Math.random() : r) * 8 < q ? 1 : 0; };
const GSYM = ['♂', '♀', ''];
const megaBst = k => MEGA[k][4].reduce((a, c) => a + c, 0);
/* Artsnavnet med form (Dark, Mega, Primal). mName gir kallenavnet hvis Pokémonen har fått et. */
const spName = m => { const g = megaOf(m), n = (m.sh === 2 ? 'Dark ' : '') + D(m.id)[0]; return g ? (g[1] === 'Primal' ? 'Primal ' + n : FORMS.has(g[1]) ? n : 'Mega ' + n + (g[1] ? ' ' + g[1] : '')) : n; };
const mName = m => m.nn || spName(m);
/* Kallenavn: bokstaver, tall og noen få tegn (de som finnes i skrifta på HP-boksene), høyst 12. Tomt navn fjerner kallenavnet. */
const cleanNick = s => String(s || '').replace(/[^A-Za-z0-9 .\-?]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
function setNick(m, s) { const n = cleanNick(s); if (n && n !== D(m.id)[0]) m.nn = n; else delete m.nn; save(); return m.nn || ''; }
/* Arceus med en plate er den typen (Multitype). */
const ARCEUS = 493, plateTy = m => { const h = m && m.id === ARCEUS && m.item ? HELD[m.item] : null; return h && h.ty != null ? h.ty : -1; };
const mTypes = m => { const g = megaOf(m), p = plateTy(m); return p >= 0 ? [p, -1] : g ? [g[2], g[3]] : [D(m.id)[1], D(m.id)[2]]; };
function statsOf(m) {
  const b = m.mega ? MEGA[m.mega - 1][4] : BST[m.id - 1], up = natUp(m.nat), dn = natDn(m.nat), sx = m.sh ? (m.sh === 1 && m.id === ARCEUS ? SHINYARC : SHINYST) : 1;
  return b.map((B, i) => {
    const core = Math.floor((2 * B + ivOf(m, i) + Math.floor(m.ev[i] / 4)) * m.lv / 100);
    if (i === 0) return m.id === 292 ? 1 : Math.floor((core + m.lv + 10) * sx);
    const v = core + 5;
    return Math.floor((up === dn ? v : i === up ? Math.floor(v * 1.1) : i === dn ? Math.floor(v * 0.9) : v) * sx);
  });
}
/* Angrepene arten kan på dette nivået, i den rekkefølgen de læres. */
function movesAt(id, lv) { const l = LEARN[id - 1], out = []; for (let i = 0; i < l.length; i += 2) if (l[i] <= lv && !out.includes(l[i + 1])) out.push(l[i + 1]); return out; }
/* De fire nyeste, men alltid minst ett som gjør skade hvis arten har det. */
function defaultMoves(id, lv) {
  const known = movesAt(id, lv), live = known.filter(x => !(window.DEADMV && DEADMV.has(x))), all = live.length ? live : known, mv = all.slice(-4);
  if (!mv.some(x => MOVES[x][2] > 0)) { const d = all.filter(x => MOVES[x][2] > 0).pop(); if (d != null) mv[0] = d; }
  return mv;
}
function nextMove(m) { const l = LEARN[m.id - 1]; for (let i = 0; i < l.length; i += 2) if (l[i] > m.lv && !m.mv.includes(l[i + 1])) return { lv: l[i], mv: l[i + 1] }; return null; }
function judge(m) {
  const s = m.iv.reduce((a, b) => a + b, 0), best = m.iv.indexOf(Math.max(...m.iv));
  return { t: s >= 186 ? 'Flawless' : s >= 151 ? 'Outstanding' : s >= 121 ? 'Great' : s >= 91 ? 'Above average' : 'Decent', best, sum: s };
}
const rollIv = egg => Array.from({ length: 6 }, () => egg ? Math.max(rnd(32), rnd(32)) : rnd(32));
function ensure(m) {
  if (!m.iv) m.iv = rollIv(); if (!m.ev) m.ev = [0, 0, 0, 0, 0, 0]; if (m.nat == null) m.nat = rnd(25); if (!m.nm) m.nm = [];
  /* Kjønnet til dem som fantes før kjønn ble innført, følger av nummeret og fangsttidspunktet, så det blir likt på alle enheter. */
  if (m.g == null) m.g = rollG(m.id, m.u ? (((m.u * 2654435761 + (m.at || 0) % 100003 * 40503) >>> 0) % 1000) / 1000 : null);
  if (!m.mv || !m.mv.length) m.mv = defaultMoves(m.id, m.lv);
  return m;
}
/* Trening for mynter, på kortet til hver Pokémon – som i spillene, og med de samme takene.
   IV (Individual Values): det den ble født med, 0 til 31 i hver verdi. IV-er kan ikke trenes. Men fra nivå HTLV kan en verdi HYPERTRENES (Bottle Cap
   i spillene): da regnes den som 31 i kamp, mens den egentlige IV-en står (m.ht[i] = 1; Hidden Power følger fortsatt den egentlige). HTP mynter per
   verdi, uansett hvor lav den var. (Før kostet det per poeng som manglet, og fra nivå 1: da var perfekte verdier nesten gratis.)
   EV (Effort Values): det trening legger på, høyst EVMAX (252) i én verdi og EVTOT (510) til sammen, så to verdier kan trenes helt opp. Fire EV er
   ett poeng på nivå 100. Kjøpes som vitaminer (EVP mynter per poeng), og partneren får dem også av fokusøkter. Trening kan fjernes fra en verdi
   uten å få noe igjen, så poengene kan legges et annet sted.
   På nivå 100 er full IV verdt 31 poeng i en verdi og full EV 63: de to har ulike tak og trenes hver for seg, og ingen av dem kan gå over taket. */
const EVP = 10, HTP = 1000, HTLV = 50, EVMAX = 252, EVTOT = 510;
const ivOf = (m, i) => m.ht && m.ht[i] ? 31 : m.iv[i];
const VIT = ['HP Up', 'Protein', 'Iron', 'Calcium', 'Zinc', 'Carbos'];
const evSum = m => m.ev.reduce((a, b) => a + b, 0);
const evRoom = (m, i) => Math.max(0, Math.min(EVMAX - m.ev[i], EVTOT - evSum(m)));
/* Så mange poeng et ønske om n faktisk gir: aldri mer enn det er plass til og råd til. */
const trainCut = () => typeof evPrice === 'function' ? evPrice() : 1, evPriceOf = n => Math.ceil(n * EVP * trainCut());
const evCan = (m, i, n) => { n = Math.max(0, Math.min(n, evRoom(m, i))); while (n > 0 && evPriceOf(n) > S.coins) n--; return n; };
function buyEv(m, i, n) { n = evCan(m, i, n); if (!(n > 0)) return 0; m.ev[i] += n; S.coins -= evPriceOf(n); save(); return n; }
function clearEv(m, i) { const n = m.ev[i]; if (n) { m.ev[i] = 0; save(); } return n; }
/* Hypertrening av én verdi: prisen (0 når verdien alt er 31), og om nivået er høyt nok. */
const ivCost = (m, i) => ivOf(m, i) >= 31 ? 0 : Math.ceil(HTP * trainCut());
const htOk = m => m.lv >= HTLV;
function buyIv(m, i) { const c = ivCost(m, i); if (!(c > 0) || !htOk(m) || S.coins < c) return 0; if (!m.ht) m.ht = [0, 0, 0, 0, 0, 0]; m.ht[i] = 1; S.coins -= c; save(); return c; }
/* EV-er fra økter legges først i den staten som alt er mest trent, og ellers i artens beste stat (maks 252 per stat, 510 totalt). For en Pokémon
   som bare er trent av økter, er det samme rekkefølge som før; har du selv kjøpt trening i en stat, fortsetter øktene der. */
function addEv(m, n) {
  const order = BST[m.id - 1].map((b, i) => [m.ev[i] > 0 ? 1000 + m.ev[i] : b, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  let tot = evSum(m);
  for (const i of order) { const add = Math.min(n, EVMAX - m.ev[i], EVTOT - tot); if (add > 0) { m.ev[i] += add; tot += add; n -= add; } if (n <= 0) break; }
}
/* Etter nivåøkning: nye angrep læres rett inn hvis det er ledig plass. Er alle fire plassene brukt, venter angrepet i m.nm til du har valgt
   om det skal læres (som i spillene). m.nw = 1 gir utropstegnet i lagoversikten til kortet er åpnet. */
function learnUp(m, l0) {
  const l = LEARN[m.id - 1], out = { learned: [], avail: [] };
  if (!m.nm) m.nm = [];
  for (let i = 0; i < l.length; i += 2) if (l[i] > l0 && l[i] <= m.lv && !m.mv.includes(l[i + 1]) && !m.nm.includes(l[i + 1])) {
    if (m.mv.length < 4) { m.mv.push(l[i + 1]); out.learned.push(MOVES[l[i + 1]][0]); m.nw = 1; } else { m.nm.push(l[i + 1]); out.avail.push(MOVES[l[i + 1]][0]); }
  }
  return out;
}
/* Utropstegnet: noe nytt som ikke er sett ennå. Angrep som venter på svar, teller bare til kortet er åpnet (m.ns = hvor mange av dem som er sett). */
const hasNews = m => !!(m.nw || (m.nm && m.nm.length > (m.ns || 0)));
const seeNews = m => { const n = (m.nm || []).length; if (m.nw || (m.ns || 0) !== n) { m.nw = 0; m.ns = n; save(true); return true; } return false; };
/* Svar på «vil lære»: forget = angrepet som byttes ut, eller null for å la være. */
function resolveMove(m, mv, forget) {
  m.nm = (m.nm || []).filter(x => x !== mv); if (m.ns > m.nm.length) m.ns = m.nm.length;
  if (forget != null) { const i = m.mv.indexOf(forget); if (i >= 0) m.mv[i] = mv; }
  save();
}
/* Nivåer for ville Pokémon følger laget: vanlige ligger rundt ditt nivå, sjeldne lavere. Utviklede former dukker først opp når du er høyt nok. */
const refLv = () => { const p = S.party.map(monBy).filter(Boolean); return p.length ? Math.max(...p.map(m => m.lv)) : 5; };
function reqLv(id) {
  const st = stageOf(id); if (!st) return 1;
  const d = D(id);
  if (st === 1 && D(d[4])[6] & 4) return 1;
  const own = d[5] || [0, 18, 34][st];
  return st === 2 ? Math.max(own, reqLv(d[4]) + 1) : own;
}
function wildLv(id, t) {
  const P = refLv(), base = [P - rnd(3), P - 1 - rnd(3), Math.round(P * 0.75) - rnd(2), Math.round(P * 0.65) - rnd(2), Math.round(P * 0.6)][t];
  return Math.max(2, Math.min(P, Math.max(base, reqLv(id))));
}

/* ---------- Tilstand ---------- */
const KEY = 'fokusdex.v1';
function fresh() {
  return {
    v: 1, mig: 16, rev: 0, at: '', xp: 0, coins: 0, uid: 1, started: 0,
    items: { poke: 20, great: 0, ultra: 0, dusk: 0, master: 0, gberry: 0, candy: 0, stone: 0, mstone: 0, incense: 0, potion: 0, super: 0, hyper: 0, maxp: 0, heal: 0, revive: 0, maxrev: 0, ash: 0 }, charm: 0, ring: 0, lst: {},
    lure: 0, slure: 0, prism: 0, shb: null,
    mons: [], party: [], seen: {}, caught: {}, regions: [1], region: 1, routes: [1], eggs: [], pend: [], incOn: 0,
    log: {}, fm: {},
    fag: {}, extra: ['annet'],
    last: { fag: 'annet', min: 60 }, cap: 360, sound: 0, cries: 1, vol: 70, cvol: 70, mvol: 70, timer: null,
    lad: { n: 0, lap: 0, best: 0, day: '', lost: '', next: null, seen: [] }, fac: { run: null, best: 0, lost: '' }, raid: null, boost: null, bfast: 0, music: 1, av: '',
    /* diff: vanskelighetsgrad (0 Easy, 1 Normal, 2 Hard). hfx/hty: vis effektivitet på angrepene og typer i kamp. */
    diff: 1, hfx: 1, hty: 1
  };
}
let S = fresh();
/* Tar i bruk en lagring (fra enheten, synk eller sikkerhetskopi) og oppgraderer gamle lagringer der fagene var faste. */
/* Versjon 9: en shiny har full IV i alt (det gjelder også dem som er fanget før). */
function migrate9() { for (const m of S.mons) if (m.sh && Array.isArray(m.iv)) m.iv = [31, 31, 31, 31, 31, 31]; S.mig = 9; }
/* Raid fra før «den viser seg selv»-reglene (ingen S.raid.at) fikk aldri de nye feltene: kortet kunne si «attempt 1 of 2» og «last attempt» på én gang,
   og raidet sto framme før dagens kamper. De stilles på nytt etter reglene som gjelder nå: samme legendariske, ingen brukte forsøk, og skjult til
   dagens kamper er ferdige (er de alt ferdige, står kortet der som før). */
function migrate10() {
  const R = S.raid;
  if (R && !R.at) { let done = false; try { done = !!S.lad.day && typeof dayDone === 'function' && dayDone(); } catch (_) {} R.tries = 0; R.day = ''; R.at = dayKey(); R.hid = done ? 0 : 1; R.nw = 0; delete R.seen; raidRelevel(R); }
  S.mig = 10;
}
/* Det første raidet skal være Mewtwo eller Arceus (S.humb, se raidPick i league.js). Venter det alt et raid du verken har sett eller prøvd deg på, og
   du aldri har vunnet et raid, er det dette som blir det første møtet. Har du vunnet et raid før, er du forbi det. */
function migrate11() {
  const R = S.raid;
  if (S.st && S.st.rw > 0) S.humb = 1;
  else if (R && !R.dk && !R.seen && !R.tries && !S.humb && typeof LEG !== 'undefined') {
    const two = [150, 493].filter(id => !S.mons.some(m => m.id === id));
    if (two.length) { R.id = two[rnd(two.length)]; delete R.hx; R.sh = 0; raidRelevel(R); S.humb = 1; }
  }
  S.mig = 11;
}
/* Mewtwo og Deoxys har byttet klasse (Mewtwo står nå sammen med Arceus, Deoxys er mytisk): et raid som venter, får nivået den nye klassen gir.
   En Dark Mewtwo du alt eier, får det den mørke alltid har (IV 31, Timid, og EV fullt ut hvis den ikke er trent ferdig). */
/* SPRÅK: forklaringer og introduksjoner kan leses på norsk (S.lang = 'no'). Navn, typer, angrep, knapper og faner står alltid på engelsk.
   tl(tekst, verdier): den engelske teksten er nøkkelen, LNO[tekst] den norske; {navn} byttes med verdier.navn. Mangler en oversettelse, står den engelske. */
const LNO = {
  // Startskjermen
  'Every minute you focus earns XP and coins. Every session lures out wild Pokémon you can catch, evolve and collect.': 'Hvert minutt du fokuserer gir XP og mynter. Hver økt lokker fram ville Pokémon du kan fange, utvikle og samle på.',
  'Pick your partner. You start with 20 Poké Balls, and next you add your subjects.': 'Velg partneren din. Du starter med 20 Poké Balls, og etterpå legger du inn fagene dine.',
  'Your subjects': 'Fagene dine',
  'Add up to four subjects you are studying for. The types you pick show up more often in their sessions. You can change this later in Profile.': 'Legg inn opptil fire fag du studerer. Typene du velger, dukker oftere opp i øktene til faget. Du kan endre dette senere under Profile.',
  'How long do you usually study a day?': 'Hvor lenge studerer du vanligvis om dagen?',
  'There is a bigger bonus in the exam period: more hours studied give a bigger boost.': 'Det er en økt bonus i eksamensperioden: flere timer studert gir en større boost.',
  'Each badge counts down to its exam. More hours studied give a bigger boost.': 'Hvert merke teller ned til eksamen. Flere timer studert gir en større boost.',
  'Add your subjects first: Profile → Edit subjects.': 'Legg inn fagene dine først: Profile → Edit subjects.',
  'Daily goal in the exam period': 'Dagsmålet i eksamensperioden',
  'The app is locked while you work, except in your breaks. Each hour of work adds {m} minutes to the battle bonus that day, and study after work counts ×{x} for it. Transport and breaks do not count.': 'Appen er låst mens du jobber, utenom pausene. Hver arbeidstime gir {m} minutter til kampbonusen den dagen, og studier etter jobb teller ×{x} for den. Transport og pauser teller ikke.',
  'Each hour of work adds {m} minutes to the battle bonus. Transport and breaks do not count.': 'Hver arbeidstime gir {m} minutter til kampbonusen. Transport og pauser teller ikke.',
  'Each badge counts down to its exam. 25, 50 and 75% give an epic encounter and exam day a legendary one, once you have logged {a}, {b} and {c} hours in the subject in the period ({d} for the legendary). Outside an exam period the battle bonus and XP are a little lower.': 'Hvert merke teller ned til eksamen. 25, 50 og 75 % gir et episk møte og eksamensdagen et legendarisk, når du har logget {a}, {b} og {c} timer i faget i perioden ({d} for det legendariske). Utenfor en eksamensperiode er kampbonusen og XP litt lavere.',
  'Explanations in': 'Forklaringer på',
  // Innstillingen
  'Language for explanations': 'Språk for forklaringer',
  'Guides and introductions to new things. Names, types and moves stay in English.': 'Guider og introduksjoner til nye ting. Navn, typer og angrep står alltid på engelsk.',
  // Reisen: navn, korte navn, tekstene og hintet om neste dag
  'Battles': 'Kamper', 'The Shop': 'Shop', 'Shiny Pokémon': 'Shiny Pokémon', 'Nature and potential': 'Nature og potensial', 'Training': 'Trening', 'Held items': 'Held items',
  'Shop': 'Shop', 'Shiny': 'Shiny', 'Nature': 'Nature', 'Items': 'Items',
  'When the day is done, your team can fight. Pick the League, the Battle Frontier or the World Tournament for the day.': 'Når dagen er ferdig, kan laget ditt kjempe. Velg League, Battle Frontier eller World Tournament for dagen.',
  'Spend your coins on balls, packs and things for your team. A free Poké Pack and 10 Great Balls are yours.': 'Bruk myntene på baller, pakker og ting til laget. En gratis Poké Pack og 10 Great Balls er dine.',
  'A shiny is rare, and here it is more than a new colour: perfect IVs, and every stat a little higher.': 'En shiny er sjelden, og her er den mer enn en ny farge: perfekte IV-er og litt høyere verdier i alt.',
  'Two of the same Pokémon are never quite equal. Here is why, and why it pays to keep the good ones.': 'To av samme Pokémon er aldri helt like. Her ser du hvorfor, og hvorfor det lønner seg å beholde de gode.',
  'Open a Pokémon in Team and tap Train to raise its stats with coins. A free Ultra Pack is yours.': 'Åpne en Pokémon under Team og trykk Train for å øke verdiene med mynter. En gratis Ultra Pack er din.',
  'A Pokémon can hold a berry, a plate or gear in battle. See its card in Team, or the Shop.': 'En Pokémon kan holde et bær, en plate eller utstyr i kamp. Se kortet dens under Team, eller i Shop.',
  'Your team gets to fight.': 'Laget ditt får kjempe.', 'Somewhere to spend your coins.': 'Et sted å bruke myntene.', 'Something rare in the grass.': 'Noe sjeldent i gresset.',
  'Why two of the same are not equal.': 'Hvorfor to like ikke er like.', 'A way to make your team stronger.': 'En måte å gjøre laget sterkere på.', 'Something for your team to carry.': 'Noe laget kan bære med seg.',
  'A free {pack}: open it from the Focus page or the Shop': 'En gratis {pack}: åpne den fra Focus-siden eller i Shop',
  '{n} Great Balls in your bag': '{n} Great Balls i bagen din',
  // Kortet på forsiden og låste kort
  'Your journey': 'Reisen din', 'Study day {d}': 'Studiedag {d}', 'Next': 'Neste',
  'Next study day ({min} min): {hint}': 'Neste studiedag ({min} min): {hint}',
  'Everything is open. The rest is yours to find.': 'Alt er åpnet. Resten finner du selv.',
  'Opens when today has {min} minutes of focus.': 'Åpner når dagen har {min} minutter fokus.',
  'Opens on study day {d}. You are on day {n}.': 'Åpner på studiedag {d}. Du er på dag {n}.',
  // Arkene
  'New · study day {d}': 'Nytt · studiedag {d}', 'Got it': 'Skjønner', 'Next study day: {hint}': 'Neste studiedag: {hint}',
  'New areas open as your trainer level rises, and their Pokémon then show up in your encounters. See Routes under More options on the Focus page.': 'Nye områder åpner seg når trenernivået ditt stiger, og da dukker Pokémonene deres opp i møtene dine. Se Routes under More options på Focus-siden.',
  'Born strong': 'Født sterk', 'Born weak': 'Født svak',
  'Same Pokémon, same level. Potential (IVs) is set when it is born: 0 to 31 in each stat. A nature lifts one stat by 10 % and lowers another. Keep the ones born strong: the stars on the catch screen show it.': 'Samme Pokémon, samme nivå. Potensialet (IV) settes når den blir født: 0 til 31 i hver verdi. En nature løfter én verdi med 10 % og senker en annen. Behold de som er født sterke: stjernene på fangstskjermen viser det.',
  'Contact moves. They use Attack against Defense.': 'Angrep med kontakt. De bruker Attack mot Defense.',
  'Energy from a distance. They use Sp. Atk against Sp. Def.': 'Energi på avstand. De bruker Sp. Atk mot Sp. Def.',
  'No damage. They change stats, the weather or the foe.': 'Ingen skade. De endrer verdier, været eller motstanderen.',
  'A Pokémon with a high Sp. Atk hits harder with special moves, and one with a high Attack with physical ones. Look at its stats before you pick its moves.': 'En Pokémon med høy Sp. Atk slår hardere med special-angrep, og en med høy Attack med physical-angrep. Se på verdiene før du velger angrepene.',
  'A new move': 'Et nytt angrep', 'Three kinds of moves': 'Tre slags angrep',
  'Now you know': 'Nå vet du det',
  'Now and then a legendary Pokémon shows itself after the day\'s battles. It fights your whole team. You get {n} attempts, one a day, and if you win, it joins you.': 'Av og til viser en legendarisk Pokémon seg etter dagens kamper. Den kjemper mot hele laget ditt. Du får {n} forsøk, ett om dagen, og vinner du, blir den med deg.',
  'The stronger your team, the better your chances.': 'Jo sterkere laget er, jo bedre er sjansene.',
  'The first ones are fair fights. Deoxys was not.': 'De første er rettferdige kamper. Deoxys var ikke det.',
  'The next one shows itself in a few days.': 'Den neste viser seg om noen dager.',
  'Look closer': 'Se nøyere', 'A shiny {name}': 'En shiny {name}',
  'In the main games a shiny is just another colour. Here it is stronger: born with perfect IVs, and every stat {p} % higher. This one is yours whatever ball you throw.': 'I hovedspillene er en shiny bare en annen farge. Her er den sterkere: født med perfekte IV-er, og alle verdier {p} % høyere. Denne blir din uansett hvilken ball du kaster.',
  'That is enough distraction. Study on, fill up today\'s bonus, and catch it when you like.': 'Det var nok distraksjon. Studer videre, fyll opp dagens bonus, og fang den når du vil.',
  'Catch it now': 'Fang den nå', 'Later': 'Senere',
  // Raidintroen (league.js)
  'That was {name}. You never had a chance, and that was the point: now you know what is out there. Train your team, and the next legendary Pokémon will be a fair fight. It comes in a few days.': 'Det var {name}. Du hadde aldri en sjanse, og det var meningen: nå vet du hva som finnes der ute. Tren laget ditt, så blir neste legendariske Pokémon en rettferdig kamp. Den kommer om noen dager.',
  // What's new og oppdateringer
  'What\'s new': 'Nytt i appen',
  'Other activities now give encounters every 20 minutes, like your subjects.': 'Andre aktiviteter gir nå møter hvert 20. minutt, som fagene.',
  'You can mute the encounter sound: tap the bell during a session.': 'Du kan slå av lyden når et møte dukker opp: trykk på bjella under en økt.',
  'Explanations can now be read in Norwegian: Profile → Language for explanations.': 'Forklaringer kan nå leses på norsk: Profile → Language for explanations.',
  'Some adjustments to raids, bosses and rewards, and bug fixes.': 'Noen justeringer på raid, bosser og belønninger, og feilrettinger.',
  'Minor boss adjustments.': 'Små justeringer på bossene.',
  'Exam period: Profile → Badges. Your badges count down to your exams, and subjects no longer need planned hours.': 'Eksamensperiode: Profile → Badges. Merkene teller ned til eksamen, og fagene trenger ikke lenger planlagte timer.',
  'Work days: Profile → Settings → Advanced options.': 'Arbeidsdager: Profile → Settings → Advanced options.',
  'Other activities now give encounters every 20 minutes, and the bell in a session mutes the encounter sound.': 'Andre aktiviteter gir nå møter hvert 20. minutt, og bjella i en økt slår av lyden for møter.',
  'Your journey: new things now open one study day at a time. See the card on the Focus page.': 'Reisen din: nye ting åpner seg nå én studiedag om gangen. Se kortet på Focus-siden.',
  'A new version of Fokusdex is ready.': 'En ny versjon av Fokusdex er klar.'
};
const tl = (s, v) => { const x = typeof S !== 'undefined' && S && S.lang === 'no' && LNO[s] != null ? LNO[s] : s; return v ? x.replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m) : x; };
/* REISEN: nye spillere får ting åpnet etter STUDIEDAGER (ikke trenernivå), én ny ting per dag, og ser det når dagen er ferdig («Done for today»).
   JOURNEY: [nøkkel, studiedag, navn, tekst på arket]. S.j = 1 for dem som startet etter v63 (begin). S.jd = antall studiedager (en dag teller når
   den når OPENMIN minutter, se grant). S.ulk = det som er åpnet, S.js = det som er vist. S.jx = engangsting underveis: b = første kamp er spilt,
   r = raidintroen (1 = vis forklaringen, 2 = vist), sh = den garanterte shinyen (1 = vis arket, 2 = vist), mv = angrepstypene forklart.
   JFREE = gaver når steget vises. De som startet før reisen fantes, har alt åpent (migrate13/15). */
const JOURNEY = [['battles', 1, 'Battles', 'When the day is done, your team can fight. Pick the League, the Battle Frontier or the World Tournament for the day.'],
  ['shop', 2, 'The Shop', 'Spend your coins on balls, packs and things for your team. A free Poké Pack and 10 Great Balls are yours.'],
  ['shiny', 3, 'Shiny Pokémon', 'A shiny is rare, and here it is more than a new colour: perfect IVs, and every stat a little higher.'],
  ['nature', 4, 'Nature and potential', 'Two of the same Pokémon are never quite equal. Here is why, and why it pays to keep the good ones.'],
  ['train', 5, 'Training', 'Open a Pokémon in Team and tap Train to raise its stats with coins. A free Ultra Pack is yours.'],
  ['held', 6, 'Held items', 'A Pokémon can hold a berry, a plate or gear in battle. See its card in Team, or the Shop.']];
/* Korte navn til rutene på kortet, og hintet om hva som kommer neste studiedag. */
const JSHORT = { battles: 'Battles', shop: 'Shop', shiny: 'Shiny', nature: 'Nature', train: 'Training', held: 'Items' };
const JHINT = { battles: 'Your team gets to fight.', shop: 'Somewhere to spend your coins.', shiny: 'Something rare in the grass.', nature: 'Why two of the same are not equal.', train: 'A way to make your team stronger.', held: 'Something for your team to carry.' };
const FEATS = JOURNEY, JFREE = { shop: { pk: 'poke', great: 10 }, shiny: { pk: 'great' }, train: { pk: 'ultra' } }, JLAST = JOURNEY[JOURNEY.length - 1][1];
/* Den garanterte shinyen på dag 3: en svak art fra områdene dine (den skal vise hva en shiny er, ikke bære laget). */
const JSHINY = [19, 161, 263, 399, 504];
const jOn = () => !!S.j && !S.jdone;
/* VENNENE PÅ REISEN (v65): alle som startet før reisen, utenom eieren, går inn i den på studiedag 4. Ingenting tas fra dem: Pokémon, XP, mynter,
   gjenstander, raid som venter, gratispakker og dagens studier står som før. Bare det som vises, følger reisen herfra (nature dag 4, trening dag 5,
   holdte gjenstander dag 6), og bare dager med studier teller. Har dagen alt OPENMIN minutter, er i dag dag 4; ellers blir neste studiedag dag 4.
   Første kamp, raidintroen og shinyen er regnet som gjort (de er forbi det), og S.humb = 1 så raidene går som før. S.jf = merket for at det er gjort. */
const JFRIEND = 'f4';
function jFriend() {
  if (!S.started || (typeof SBX !== 'undefined' && SBX) || typeof isAdmin !== 'function') return false;
  /* Skulle eierens lagring en gang ha blitt merket (for eksempel på en enhet der synken ikke var koblet til ennå), tas det tilbake så snart
     eieren er kjent igjen: alt åpent som før, og merket 'own' så det aldri skjer igjen. */
  if (isAdmin()) { if (S.jf === JFRIEND) { S.j = 0; S.jdone = 1; jAll(); S.jf = 'own'; save(true); } return false; }
  if (S.j || S.jf === JFRIEND || S.jf === 'own' || (GH && !GH.ok)) return false;
  const k = dayKey(), done = (((S.log || {})[k] || {}).m || 0) >= OPENMIN;
  S.jf = JFRIEND; S.j = 1; S.jdone = 0; S.jd = done ? 4 : 3; S.jt = done ? k : ''; S.ulk = {}; featCheck();
  S.js = ['battles', 'shop', 'shiny']; S.jx = { b: 1, r: 2, sh: 2, mv: 0 }; S.humb = 1; S.news = [];
  save(true); return true;
}
const has = k => !!(S.ulk && S.ulk[k]);
/* WHAT'S NEW: vises én gang, første gang appen åpnes etter en oppdatering (S.wn < WNV). Hold det til noen få korte linjer, uten å røpe noe.
   Øk WNV og bytt linjene når en utgivelse har noe spillerne merker. Nye spillere ser det ikke (S.wn settes når spillet starter). */
const WNV = 69, WN = ['Minor boss adjustments.'];
/* Første linje for dem som går reisen (whatsNew i ui.js). */
const WNJ = 'Your journey: new things now open one study day at a time. See the card on the Focus page.';
function featCheck() { S.ulk = S.ulk || {}; if (!jOn()) return 0; let ch = 0; for (const [k, d] of JOURNEY) if (!S.ulk[k] && (S.jd || 0) >= d) { S.ulk[k] = 1; ch = 1; } return ch; }
/* Alt åpent, uten ark (de som startet før reisen, og når reisen er ferdig). */
function jAll() { S.ulk = S.ulk || {}; JOURNEY.forEach(f => { S.ulk[f[0]] = 1; }); S.news = []; }
/* Gaven som hører til et steg, gitt når arket vises. Svaret er linjene til arket. */
function jGift(k) {
  const g = JFREE[k], out = []; if (!g) return out;
  if (g.pk && PACKS[g.pk]) { S.fpk = S.fpk || {}; S.fpk[g.pk] = (S.fpk[g.pk] || 0) + 1; out.push(tl('A free {pack}: open it from the Focus page or the Shop', { pack: PACKS[g.pk].n })); }
  if (g.great) { S.items.great = (S.items.great || 0) + g.great; out.push(tl('{n} Great Balls in your bag', { n: g.great })); }
  return out;
}
/* Den garanterte shinyen: første art fra JSHINY som finnes i områdene dine. Den blir fanget uansett (sure). */
function jShiny() { const id = JSHINY.find(x => S.regions.includes(regOf(x))) || JSHINY[0], e = genEnc({ ids: [id] }); e.sh = 1; e.sure = 1; return e; }
/* Deoxys er tilbake i øverste klasse (v62): et vanlig Deoxys-raid som venter, får nivået og HP-en den klassen gir. */
function migrate14() { const R = S.raid; if (R && !R.dk && !R.ev && R.id === 386 && typeof LEG !== 'undefined') { delete R.hx; raidRelevel(R); } S.mig = 14; }
function migrate13() { if (S.started) jAll(); S.mig = 13; }
/* Reisen (v63) gjelder bare dem som starter etter den. Alle andre får alt (også det som var nytt i reisen: butikken, shiny, nature). */
/* Mewtwo og Deoxys står blant de store fra v64: et vanlig raid som venter med en av dem, får nivået og HP-en den klassen gir. */
function migrate16() { const R = S.raid; if (R && !R.dk && !R.ev && (R.id === 150 || R.id === 386) && typeof LEG !== 'undefined') { delete R.hx; raidRelevel(R); } S.mig = 16; }
function migrate15() { if (S.started && !S.j) jAll(); S.mig = 15; }
function migrate12() {
  const R = S.raid;
  if (R && !R.dk && (R.id === 150 || R.id === 386) && typeof LEG !== 'undefined') { delete R.hx; raidRelevel(R); }
  /* En mørk som venter etter de gamle reglene (Mewtwo var ikke gitt ennå): Mewtwo er din nå, og den mørke tar plassen dens hvis du vinner. */
  if (R && R.dk && R.won1) { delete R.won1; const own = S.mons.filter(m => m.id === 150 && m.sh !== 2).sort((a, b) => (a.sh ? 1 : 0) - (b.sh ? 1 : 0) || b.lv - a.lv)[0]; try { const m = own || (typeof raidCatch === 'function' ? raidCatch(150, 0) : null); if (m && !m.sh) R.mu = m.u; } catch (_) {} }
  for (const m of S.mons) if (m.id === 150 && m.sh === 2) { m.iv = [31, 31, 31, 31, 31, 31]; m.nat = 10; if (m.ev.reduce((a, b) => a + b, 0) < EVTOT) m.ev = [6, 0, 0, 252, 0, 252]; }
  S.mig = 12;
}
/* Nivået til et raid som er stilt på nytt: det reglene gir for laget slik det er nå (raidLvFor), som for et raid som viser seg i dag. De gamle sto på
   nivået fra eldre regler, langt over laget. hx settes samtidig, og er merket på at dette er gjort. Den mørke (dk) har sitt eget nivå og røres ikke. */
function raidRelevel(R) {
  try { if (!R || R.dk || R.hx != null || typeof LEG === 'undefined' || !LEG[R.id] || typeof raidLvFor !== 'function') return; const t = LEG[R.id].t; R.lv = raidLvFor(t); R.hx = +raidHx(t).toFixed(2); } catch (_) {}
}
function adopt(o) {
  S = Object.assign(fresh(), o);
  S.lad = Object.assign(fresh().lad, o.lad || {}); S.fac = Object.assign(fresh().fac, o.fac || {});
  for (const k in fresh().items) if (S.items[k] == null) S.items[k] = 0;
  let legacy = false;
  for (const k in S.fag) if (!S.fag[k].n) { Object.assign(S.fag[k], LEGACY[k] || { n: k.toUpperCase(), c: PAL[0], ty: [] }); legacy = true; }
  if (legacy && !o.extra) S.extra = ['sok', 'annet'];
  if (!o.mig || o.mig < 2) migrate2();
  if (!o.mig || o.mig < 3) migrate3();
  if (!o.mig || o.mig < 4) migrate4();
  if (!o.mig || o.mig < 5) migrate5();
  if (!o.mig || o.mig < 6) migrate6(o);
  if (!o.mig || o.mig < 7) migrate7();
  if (!o.mig || o.mig < 8) migrate8();
  if (!o.mig || o.mig < 9) migrate9();
  if (!o.mig || o.mig < 10) migrate10();
  if (!o.mig || o.mig < 11) migrate11();
  if (!o.mig || o.mig < 12) migrate12();
  if (!o.mig || o.mig < 13) migrate13();
  if (!o.mig || o.mig < 14) migrate14();
  if (!o.mig || o.mig < 15) migrate15();
  if (!o.mig || o.mig < 16) migrate16();
  /* Et forsøk kan ikke være eldre enn raidet selv (S.raid.at = dagen det kom). Et slikt merke kommer fra en eldre appversjon som flettet inn
     forsøkene fra et tidligere raid av samme art: de gjelder ikke dette. */
  if (S.raid && S.raid.at && S.raid.day && S.raid.day < S.raid.at) { S.raid.tries = 0; S.raid.day = ''; }
  /* Raid som ble stilt på nytt av den første utgaven av migrate10 (ingen hx), fikk ikke nytt nivå: det får de her. */
  if (S.raid && S.raid.at && S.raid.hx == null) raidRelevel(S.raid);
  S.routes = (S.routes || []).filter(r => S.regions.includes(r)); if (!S.routes.length) S.routes = [S.regions.includes(S.region) ? S.region : S.regions[0]];
  S.mons.forEach(ensure);
  unlockRegions();
  buildFags();
}
/* Versjon 2 (stats og angrep): ingen eid Pokémon er høyere enn nivået starteren ville hatt med all XP-en din, og ventende møter får nye nivåer. */
function migrate2() {
  const first = S.mons.slice().sort((a, b) => a.u - b.u)[0];
  const cap = Math.max(5, first ? first.lv : 5, lvOf(xpAt(5) + S.xp));
  for (const m of S.mons) { if (m.lv > cap) { m.lv = cap; m.xp = xpAt(cap); } delete m.mv; ensure(m); }
  for (const e of S.pend) e.lv = wildLv(e.id, e.t);
  S.mig = 2;
}
/* Versjon 3 (ligaen): den gamle stigen byttes ut med ligaen, som starter fra første trener. Den gamle rekorden tas vare på som et tall. */
function migrate3() {
  S.lad = Object.assign(fresh().lad, { old: (S.lad && S.lad.best) || 0, day: (S.lad && S.lad.day) || '' });
  S.fac = fresh().fac; S.routes = [S.region]; S.bfast = 0; S.mig = 3;
}
/* Versjon 4 (de ni klassene): ligaen er lagt om til runder på 18 kamper, og alt i Battle Frontier er på nivå 50.
   Du beholder runden og omtrent samme sted i den. En påbegynt Frontier-runde starter på nytt, rekorden står. */
function migrate4() {
  const L = S.lad; L.n = Math.max(0, Math.min(17, L.n || 0)); L.next = null; L.seen = [];
  if (S.fac) S.fac.run = null;
  S.mig = 4;
}
/* Versjon 5: en runde i ligaen er 12 kamper (en trener og så en boss, seks ganger) i stedet for 18. Du står foran samme boss som før. */
function migrate5() {
  const L = S.lad, n = Math.max(0, Math.min(17, L.n || 0)); L.n = Math.floor(n / 3) * 2 + (n % 3 === 2 ? 1 : 0); L.next = null;
  S.mig = 5;
}
/* Versjon 6: musikken har fått sin egen volumknapp (den fulgte effektene før), og skrikene er jevnet ut og stilt inn på nytt, så den knappen starter på midten igjen. */
function migrate6(o) {
  S.mvol = o.vol == null ? 70 : o.vol; S.cvol = 70;
  /* De som spilte før vanskelighetsgraden kom, spilte på det som nå heter Hard. */
  if (o.diff == null && (o.started || (o.mons || []).length)) S.diff = 2;
  S.mig = 6;
}
/* Versjon 7: en runde i ligaen er 10 kamper der klassen stiger for hver kamp (før: 12, en trener og så en boss). Du står omtrent like langt i runden. */
function migrate7() {
  const L = S.lad, n = Math.max(0, Math.min(11, L.n || 0)); L.n = Math.min(9, Math.round(n * 10 / 12)); L.c = L.n ? Math.max(1, Math.min(7, L.n - 1)) : 0; L.next = null; L.seen = [];
  S.mig = 7;
}
/* Versjon 8: (1) XP-kurven er brattere. Alle Pokémon beholder nivået sitt og like stor del av veien til neste. (2) En runde i ligaen er 8 kamper
   (før 10), og et tap avslutter den: du står omtrent like langt i runden. (3) Raid har to forsøk. */
function migrate8() {
  for (const m of S.mons) {
    const x = m.xp || 0, l = Math.max(1, Math.min(100, m.lv || Math.floor(Math.sqrt(x / 12)))), a = xpAtOld(l), b = xpAtOld(l + 1);
    const f = l >= 100 ? 0 : Math.max(0, Math.min(0.999, (x - a) / (b - a)));
    m.lv = l; m.xp = Math.round(xpAt(l) + f * (xpAt(l + 1) - xpAt(l)));
  }
  const L = S.lad, n = Math.max(0, Math.min(9, L.n || 0)); L.n = Math.min(7, Math.round(n * 8 / 10)); L.c = L.n ? Math.max(1, Math.min(7, L.c || L.n)) : 0; L.next = null; L.seen = [];
  if (S.raid && (S.raid.tries || 0) >= 2) S.raid.tries = 1;
  S.mig = 8;
}
function load() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1) adopt(o); } catch (_) {}
  buildFags();
}
let saveHook = null;
/* Sandkassa (show.js, bare admin): SBX = { real: den ekte lagringen, cup } mens S står for en KOPI. Da lagres og synkes ingenting, og kamper som er
   i gang, skrives ikke til enheten. Lukkes appen, er kopien borte og den ekte lagringen urørt. */
let SBX = null;
function save(quiet) {
  /* Under en simulering av kampdagen (simDay i league.js) står S for en kopi: den skal aldri lagres. */
  if ((typeof SIMRUN !== 'undefined' && SIMRUN) || SBX) return;
  S.rev++; S.at = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {}
  if (!quiet && saveHook) saveHook();
}

/* ---------- Rent spill ----------
   Appen har ingen tjener, så den som redigerer lagringsfila for hånd, kan gi seg selv hva som helst. Det som stoppes her, er snarveiene i selve appen:
   KLOKKA: S.tmax er det seneste tidspunktet du har tjent noe (økt, kamp). Står enhetens klokke mer enn CLKSLACK bak det, er den stilt tilbake etter et
     hopp fram, og økter og kamper står stille til klokka har tatt det igjen: det du lånte av framtiden, betales tilbake. Med nett sjekkes klokka også mot
     tjenerens (Date-hodet på en HEAD-forespørsel, som service workeren ikke rører): ligger enheten mer enn CLKAHEAD foran, står alt stille til den er rettet.
     Store avvik (over CLKMARK) gir et merke under Fair play på profilen (S.fair). Merkene gjør ingenting annet enn å stå der.
   LAGRINGER: en kopi eller en lagring fra en annen enhet tar bare over når den er nyere enn den som er her (canAdopt), og dagens forsøk følger med (carry).
   KAMPER: en påbegynt kamp er lagret etter hver runde og fortsetter der den var (se league.js: live). Å gå ut er ikke en ny sjanse. */
const DEVK = 'fokusdex.dev';
const devId = () => { let d = ''; try { d = localStorage.getItem(DEVK) || ''; if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem(DEVK, d); } } catch (_) {} return d || 'x'; };
const CLKSLACK = 20 * 60000, CLKAHEAD = 30 * 60000, CLKMARK = 60 * 60000, NT = { off: null, at: 0 };
function stamp() { const n = Date.now(); if (!(S.tmax > n)) S.tmax = n; }
function clockLock() {
  const n = Date.now();
  if (S.tmax && n < S.tmax - CLKSLACK) return { k: 'back', ms: S.tmax - n };
  if (NT.off != null && NT.off > CLKAHEAD) return { k: 'ahead', ms: NT.off };
  return null;
}
function fairMark(k, key) {
  const F = S.fair || (S.fair = { n: 0, l: [], key: '' });
  if (key && F.key === key) return false;
  F.key = key || ''; F.n++; F.l.push({ d: dayKey(), k }); if (F.l.length > 12) F.l.shift();
  return true;
}
/* Kalles ved oppstart, når appen kommer fram igjen og før noe som gir belønning. Gir null når klokka er i orden. */
function clockCheck() {
  const L = clockLock(); if (!L) return null;
  if (L.ms > CLKMARK && fairMark('clock', L.k === 'back' ? 'back:' + S.tmax : 'ahead:' + dayKey())) save(true);
  return L;
}
/* Tjenerens klokke. Svaret kan ha ligget i et mellomlager, så sann tid er et sted mellom Date og Date + Age: bare avvik utenfor det spennet teller. */
async function netTime() {
  try {
    const r = await fetch('./index.html?nt=' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), { method: 'HEAD', cache: 'no-store' });
    const d = Date.parse(r.headers.get('date') || ''); if (!r.ok || !isFinite(d)) return null;
    const age = Math.max(0, Math.min(3600, +(r.headers.get('age') || 0) || 0)) * 1000, now = Date.now();
    NT.off = now > d + age + 2000 ? now - (d + age) : now < d - 2000 ? now - d : 0; NT.at = now;
    return NT.off;
  } catch (_) { return null; }
}
/* En annen lagring (kopi, synk) kan bare ta over når den er nyere enn spillet på enheten, eller når spillet her ikke er startet. */
const canAdopt = o => !!o && (!S.started || (o.rev || 0) > (S.rev || 0));
/* ---------- En fullført økt går aldri tapt ----------
   To kopier av appen (to enheter, eller to faner i samme nettleser) kan begge ha lagret noe siden sist de var like. Da tar lagringen med høyest nummer
   over, og det den andre gjorde i mellomtiden, er borte. Det meste kan gjøres om igjen, men ikke en fullført økt: den er tiden din. (12. november 2026
   forsvant en økt på 90 minutter slik: en kopi uten økt hadde lagret flere ganger enn den med økta.)
   Derfor fører hver lagring en journal over de siste øktene (S.jr): t = da økta startet (det er navnet dens), e = da den sluttet, f = fag,
   r = minutter, p = planlagt, u = fullført, d = dagen. Når to lagringer møtes (ghPull, tabSync), får den som vinner, øktene den mangler fra den andre,
   med alt økta ga (grant på nytt). Det gjelder begge veier: også når lagringen her vinner, hentes først øktene bare den andre har. En økt gis aldri
   to ganger (navnet er det samme i begge), og en økt som overlapper i tid med en den andre alt har, teller ikke: klokka går ikke to steder samtidig. */
const JRN = 12;
function jrAdd(e) { const l = Array.isArray(S.jr) ? S.jr : (S.jr = []); if (l.some(x => x.t === e.t)) return; l.push(e); l.sort((a, b) => a.t - b.t); while (l.length > JRN) l.shift(); }
const jrOk = e => !!e && typeof e.t === 'number' && typeof e.e === 'number' && e.e >= e.t && e.r >= 1 && e.r <= 720 && typeof e.f === 'string' && /^\d{4}-\d\d-\d\d$/.test(e.d || '');
/* Øktene i lagringen a som lagringen b ikke har. Har b ingen journal (en lagring fra før journalen fantes), gjelder de som sluttet etter b sin siste
   økt. Er journalen til b full, regnes alt som er eldre enn dens eldste, som kjent. */
function jrMissing(a, b) {
  /* Det som skal gis på nytt, må ha sluttet før nå (en klokke stilt fram gir ingenting). Det b alt har, teller som kjent uansett hva klokka her sier. */
  const mine = (a && Array.isArray(a.jr) ? a.jr : []).filter(e => jrOk(e) && e.e <= Date.now() + 600000), theirs = (b && Array.isArray(b.jr) ? b.jr : []).filter(jrOk);
  if (!mine.length) return [];
  const has = new Set(theirs.map(x => x.t)), old = theirs.length >= JRN ? Math.min(...theirs.map(x => x.t)) : 0, last = theirs.length ? 0 : ((b && b.lastEnd) || 0);
  return mine.filter(x => !has.has(x.t) && x.t > old && x.e > last && !theirs.some(y => x.t < y.e && x.e > y.t));
}
/* Gir lagringen som gjelder nå (S), øktene den mangler fra den andre (p). Svaret er minuttene som kom til. */
function jrMerge(p) {
  let n = 0;
  for (const x of jrMissing(p, S)) { try { grant(x.f, x.r, !!x.u, x.p || x.r, { t: x.t, e: x.e, d: x.d, again: 1 }); n += x.r; } catch (_) {} }
  return n;
}
/* En annen fane eller et annet vindu av appen i samme nettleser deler lageret, men husker sin egen tilstand. Har den andre lagret noe nyere, tar denne
   det over før den gjør noe mer (ui.js kaller dette når fanen kommer fram og når lageret endres); ellers ville neste lagring herfra skrive over det.
   Har den andre bare en økt denne mangler, hentes økta. Ikke midt i en økt eller en kamp her, og ikke mens den andre står i en økt eller en kamp:
   en økt som går, eies av fanen som startet den, og når den er ferdig, hentes resultatet. Gir true når noe ble endret. */
function tabSync() {
  if (SBX || !S.started || S.timer || (S.live && S.live.dev === devId()) || (typeof BT !== 'undefined' && BT.B)) return false;
  let o = null; try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
  if (!o || o.v !== 1 || !Array.isArray(o.mons) || o.live || o.timer) return false;
  if (o.rev > S.rev) { const p = S; adopt(o); carry(p); if (jrMerge(p)) save(true); return true; }
  if (jrMerge(o)) { save(true); return true; }
  return false;
}
/* Det som er brukt opp i dag, følger med når en annen lagring tar over: forsøk, dagens modus og event, første seier. p = lagringen som var her. */
function carry(p) {
  if (!p || !p.started) return;
  const ge = (a, b) => (a || '') >= (b || ''), tr = (a, b) => !a ? b : !b ? a : a.d === b.d ? (a.n >= b.n ? a : b) : (a.d > b.d ? a : b);
  /* Et tap den andre lagringen ikke kjenner til, avslutter runden der også (ligaen: tap = runden over), og en runde som er vunnet i dag, er dagens runde. */
  if (p.lad) { S.lad.tries = tr(p.lad.tries, S.lad.tries) || null; if (ge(p.lad.lost, S.lad.lost)) { if (p.lad.lost && p.lad.lost !== S.lad.lost) { S.lad.n = 0; S.lad.c = 0; S.lad.seen = []; S.lad.next = null; S.lad.fell = p.lad.fell || 0; } S.lad.lost = p.lad.lost || ''; } if (ge(p.lad.fw, S.lad.fw) && p.lad.fw) S.lad.fw = p.lad.fw; if (p.lad.lapd && ge(p.lad.lapd, S.lad.lapd)) S.lad.lapd = p.lad.lapd; }
  if (p.fac) { S.fac.tries = tr(p.fac.tries, S.fac.tries) || null; if (ge(p.fac.lost, S.fac.lost)) S.fac.lost = p.fac.lost || ''; }
  if (p.pwt && p.pwt.day && (!S.pwt || ge(p.pwt.day, S.pwt.day))) { if (!S.pwt) S.pwt = { day: '', run: null, won: 0, cups: {} }; if (S.pwt.day !== p.pwt.day) { S.pwt.day = p.pwt.day; S.pwt.run = null; } }
  if (p.mode && p.mode.day && (!S.mode || ge(p.mode.day, S.mode.day))) S.mode = p.mode;
  if (p.evt && p.evt.day && (!S.evt || ge(p.evt.day, S.evt.day))) S.evt = p.evt;
  if (p.raid && S.raid && p.raid.id === S.raid.id && !!p.raid.dk === !!S.raid.dk && (p.raid.at || '') === (S.raid.at || '')) { S.raid.tries = Math.max(S.raid.tries || 0, p.raid.tries || 0); if (ge(p.raid.day, S.raid.day)) S.raid.day = p.raid.day || ''; if (p.raid.seen) S.raid.seen = 1; }
  if (p.tmax > (S.tmax || 0)) S.tmax = p.tmax;
  if (p.fair && (!S.fair || p.fair.n > S.fair.n)) S.fair = p.fair;
  if (p.hon && (!S.hon || ge(p.hon.d, S.hon.d))) S.hon = p.hon;
}

/* ---------- Hjelpere ---------- */
const pad2 = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const rnd = n => Math.floor(Math.random() * n);
const tlv = () => 1 + Math.floor(Math.sqrt(S.xp / 300));
const tlvXp = l => 300 * (l - 1) * (l - 1);
const monBy = u => S.mons.find(m => m.u === u) || null;
const partner = () => monBy(S.party[0]);
const countOf = id => S.mons.filter(m => m.id === id).length;
const todayMin = () => (S.log[dayKey()] || { m: 0 }).m;
const fagMin = f => (S.fag[f] ? S.fag[f].b : 0) + (S.fm[f] || 0);
const MSGATE = 180, BADGEGATE = 900, STARTCAP = 25 * 60;
/* EKSAMENSPERIODEN (v68): «Det er en økt bonus i eksamensperioden: flere timer studert gir en større boost.» S.exam = { s: dagen den startet }.
   I perioden teller hvert fag med eksamensdato (g.d) ned mot eksamen: merket fylles med tida fra g.xs (dagen faget kom med) til eksamensdagen.
   25, 50 og 75 % gir et episk møte og eksamensdagen et legendarisk, når det er logget MSGATE minutter i faget for hvert steg (BADGEGATE for det
   legendariske) i perioden (g.xf). g.xm = steg nådd i perioden. Utenfor perioden er framgangen litt lavere (EXN): toppen på kampbonusen, XP fra
   kampene og XP fra øktene. Perioden slutter av seg selv dagen etter den siste eksamenen (examCheck). Planlagte timer (g.t, g.b, g.ms) brukes ikke lenger. */
const EXN = 0.9;
const dIdx = k => Math.round(new Date(k + 'T12:00').getTime() / 864e5);
const examEnd = () => Object.values(S.fag || {}).reduce((a, g) => g.d && g.xs && g.d > a ? g.d : a, '');
const examOn = () => !!S.exam && !!examEnd() && dayKey() <= examEnd();
const exf = () => examOn() ? 1 : EXN;
const exFrac = g => !g || !g.d || !g.xs ? 0 : Math.max(0, Math.min(1, (dIdx(dayKey()) - dIdx(g.xs)) / Math.max(1, dIdx(g.d) - dIdx(g.xs))));
/* Minuttene som må logges i faget i perioden før neste belønning kan komme (0 = ingenting står i veien). */
const exGate = g => !g || (g.xm || 0) >= 4 ? 0 : Math.max(0, ((g.xm || 0) === 3 ? BADGEGATE : MSGATE * ((g.xm || 0) + 1)) - (g.xf || 0));
/* Et fag med eksamensdato fra i dag og fram blir med i perioden fra i dag; uten dato (eller etter eksamen) er det ute. */
function examJoin(g, k) { if (g.d && g.d >= k) { if (!g.xs) { g.xs = k; g.xf = 0; g.xm = 0; } } else delete g.xs; }
function examStart() { const k = dayKey(); S.exam = { s: k }; for (const f in S.fag) { delete S.fag[f].xs; examJoin(S.fag[f], k); } }
function examStop() { S.exam = null; for (const f in S.fag) delete S.fag[f].xs; }
/* Er perioden over (siste eksamen var i går eller før), avsluttes den. true når det skjedde. */
function examCheck() { if (S.exam && !examOn()) { examStop(); return true; } return false; }
/* ARBEIDSDAGER (v68): S.work = { fx: fast uke { days: [0–6, søndag = 0], s, e, br: [[fra, til]], from }, fx2: endret uke som gjelder fra i morgen,
   one: { dag: { s, e, br } } (en enkelt dag, lagt inn før den starter), early: { dag: minuttet «Done early» ble trykket }, cr: { dag: kreditt gitt } }.
   Tider er minutter fra midnatt. I arbeidstida er appen låst, utenom pausene. Når dagens arbeid er over, gir hver arbeidstime (uten pausene) WORKB
   minutter til kampbonusen den dagen (day.b), og studier etter jobb teller ×(1 + AFTERB) for kampbonusen den dagen. Ikke for XP, møter, dagsmålet
   eller for å åpne kampene. Endringer i uka gjelder fra i morgen, og en enkelt dag må legges inn før den starter: ingen kreditt i etterkant. */
const WORKB = 10, AFTERB = 0.5;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const tmin = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
const tstr = m => `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;
function workOf(k) {
  const W = S.work; if (!W) return null;
  if (W.one && W.one[k]) return W.one[k];
  const fx = W.fx2 && k >= W.fx2.from ? W.fx2 : W.fx;
  if (!fx || !fx.days || !(k >= (fx.from || ''))) return null;
  return fx.days.includes(new Date(k + 'T12:00').getDay()) ? fx : null;
}
/* Ny uke fra i dag tar over, og gamle dager ryddes bort. */
function workPromote() {
  const W = S.work; if (!W) return; const k = dayKey(), old = dayKey(addDays(new Date(), -14));
  if (W.fx2 && k >= W.fx2.from) { W.fx = W.fx2.days && W.fx2.days.length ? W.fx2 : null; delete W.fx2; }
  for (const o of [W.one, W.early, W.cr]) if (o) for (const d in o) if (d < old) delete o[d];
}
/* Arbeidsminutter (uten pausene) fra start til «to». */
function workMins(w, to) { if (!w) return 0; const e = Math.min(w.e, to == null ? w.e : to); let m = Math.max(0, e - w.s); for (const [a, b] of w.br || []) m -= Math.max(0, Math.min(b, e) - Math.max(a, w.s)); return Math.max(0, m); }
/* Når arbeidet den dagen var over (minutt), eller null: ikke over ennå, eller ikke arbeid. Dager før i dag er over. */
function workEnd(k) {
  const w = workOf(k); if (!w) return null; const ea = ((S.work || {}).early || {})[k];
  if (ea != null) return Math.max(w.s, Math.min(ea, w.e)); if (k < dayKey()) return w.e; if (k > dayKey()) return null; return nowMin() >= w.e ? w.e : null;
}
/* Låst nå? { e: minuttet låsen slutter (neste pause eller arbeidsslutt), brk: låsen slutter med en pause, end: arbeidsslutt }, ellers null. */
function workLock() {
  if (!S.work) return null; const k = dayKey(), w = workOf(k); if (!w || ((S.work.early || {})[k]) != null) return null;
  const n = nowMin(); if (n < w.s || n >= w.e) return null;
  for (const [a, b] of w.br || []) if (n >= a && n < b) return null;
  const nb = (w.br || []).map(x => x[0]).filter(a => a > n && a < w.e).sort((a, b) => a - b)[0];
  return { e: nb != null ? nb : w.e, brk: nb != null, end: w.e };
}
/* Minuttet låsen begynner neste gang i dag (nå, hvis den er på), eller null. En økt kan ikke gå inn i den. */
function workNext() {
  if (!S.work) return null; const k = dayKey(), w = workOf(k); if (!w || ((S.work.early || {})[k]) != null) return null;
  const n = nowMin(); if (n >= w.e) return null; if (n < w.s) return w.s;
  for (const [a, b] of w.br || []) if (n >= a && n < b) return b < w.e ? b : null;
  return n;
}
/* Kreditten for arbeidet, én gang per dag når arbeidet er over (i går eller i dag). Gir minuttene som ble lagt til. */
function workCredit() {
  const W = S.work; if (!W) return 0; W.cr = W.cr || {}; let got = 0;
  for (const k of [dayKey(addDays(new Date(), -1)), dayKey()]) {
    if (W.cr[k] != null) continue; const end = workEnd(k); if (end == null) continue;
    const b = Math.round(workMins(workOf(k), end) * WORKB / 60); W.cr[k] = b;
    if (b) { const d = S.log[k] || (S.log[k] = { m: 0, s: 0, f: {} }); d.b = (d.b || 0) + b; got += b; }
  }
  return got;
}
/* Minuttene som må logges i faget før neste belønning kan komme (0 = ingenting står i veien). */
function fagGate(f) {
  const g = S.fag[f]; if (!g || g.ms >= 4) return 0;
  const logged = S.fm[f] || 0, rw = g.rw == null ? Math.min(g.ms, Math.floor(logged / MSGATE)) : g.rw;
  return Math.max(0, (g.ms === 3 ? BADGEGATE : MSGATE * (rw + 1)) - logged);
}
const totalMin = () => Object.values(S.log).reduce((s, d) => s + d.m, 0);
/* Dager på rad med minst 25 fokusminutter. I dag teller først når den er nådd. */
function streak() {
  let n = 0;
  for (let i = 0, d = new Date(); i < 400; i++, d = addDays(d, -1)) {
    const m = (S.log[dayKey(d)] || { m: 0 }).m;
    if (m >= 25) n++; else if (i > 0) break;
  }
  return n;
}
/* Shiny Charm: vinnes fra de sjeldneste bossene og virker av seg selv i de neste fokusøktene (S.charm = antall økter igjen). Flere legges sammen. */
const CHARM = { n: 5, m: 6 };
/* Shiny: 1 av SHINYN, litt bedre for hver dag på rad (opp til ×1,5 etter ti dager), og mer i dyre pakker, på Lucky Day og med Shiny Charm.
   Før var grunnsjansen 1 av 150 og en Master Pack ga ×5 oppå ×2,5 for dager på rad: da var hver tjuende fangst shiny. */
const SHINYN = 300;
/* Shiny-røkelsen fra butikken (S.shb = { k, m, until }) ganger sjansen i en periode, overalt unntatt i raid. SHINYCAP er taket uansett hvor mye som
   legges oppå hverandre (røkelse, Shiny Charm, dyre pakker, Lucky Day): aldri oftere enn hver femtende.
   EN SHINY ER BEDRE: den fødes med full IV i alt, og alle verdiene er SHINYST ganger så høye (se statsOf). En shiny av de beste artene er dermed det
   sterkeste man kan ha, og det er verdt å jakte på dem. I et raid er sjansen 1 av SHINYN, eller PRISMP når en Prism Lure er kjøpt (S.prism). */
const SHINYCAP = 1 / 15, SHINYST = 1.05, PRISMP = 0.2;
/* En shiny Arceus er den eneste som får mer: SHINYARC i stedet for SHINYST, så den står over alt annet i spillet, også Mega-formene. */
const SHINYARC = 1.1;
const shinyBoost = () => S.shb && S.shb.until > Date.now() ? S.shb.m : 1;
const shinyOdds = () => (1 / SHINYN) * (1 + Math.min(streak(), 10) * 0.05) * (S.charm > 0 ? CHARM.m : 1) * shinyBoost();

function addMon(id, lv, sh, egg, g) {
  const m = { u: S.uid++, id, lv, xp: xpAt(lv), sh: sh === 2 ? 2 : sh ? 1 : 0, fav: 0, at: Date.now(), iv: sh ? [31, 31, 31, 31, 31, 31] : rollIv(egg), ev: [0, 0, 0, 0, 0, 0], nat: rnd(25), mv: defaultMoves(id, lv), g: g == null ? rollG(id) : g };
  if (defForm(id)) m.mega = defForm(id);
  S.mons.push(m);
  S.seen[id] = 1; S.caught[id] = 1; unlockRegions();
  if (S.party.length < 6) S.party.push(m.u);
  return m;
}

/* ---------- Møter ---------- */
/* o: fag (typebias), luck 0–2 (lengre økt og lokkeduft gir mer sjeldent), min (laveste sjeldenhet), leg (legendarisk), egg. */
function genEnc(o = {}) {
  const fest = typeof evNow === 'function' && evNow() && evNow().k === 'type' ? [evNow().ty] : [];
  const bias = (o.ty || F(o.fag).ty || []).concat(fest), L = o.luck || 0, pool = [], P = refLv();
  let tot = 0;
  const push = (id, w) => { pool.push([id, w]); tot += w; };
  if (o.egg) {
    for (let id = 1; id <= 649; id++) { if (isLeg(id) || stageOf(id)) continue; const t = tierOf(id); push(id, (t >= 2 ? 3 : 1) * (D(id)[6] & 4 ? 2 : 1)); }
  } else if (o.ids) {
    /* En bestemt gruppe arter (for eksempel de pseudo-legendariske), uansett rute og nivå. */
    for (const id of o.ids) push(id, 1);
  } else if (o.leg) {
    for (const r of S.regions) for (let id = REG[r].a; id <= REG[r].b; id++) if (isLeg(id)) push(id, D(id)[6] & 2 ? 0.5 : 1);
  } else {
    /* Alle rutene som er slått på, er med i trekningen. */
    for (const r of S.routes && S.routes.length ? S.routes : [S.region]) for (let id = REG[r].a; id <= REG[r].b; id++) {
      if (isLeg(id)) continue;
      const d = D(id), t = tierOf(id);
      if (t < (o.min || 0) || reqLv(id) > P) continue;
      let w = wOf(id) * [1, 1 + 0.3 * L, 1 + 1.2 * L, 1 + 3 * L][t];
      if (d[6] & 4) w *= 0.5;
      if (bias.includes(d[1]) || bias.includes(d[2])) w *= 2.5;
      push(id, w);
    }
  }
  if (!pool.length) return genEnc(Object.assign({}, o, { min: Math.max(0, (o.min || 0) - 1) }));
  let x = Math.random() * tot, id = pool[pool.length - 1][0];
  for (const [i, w] of pool) { x -= w; if (x <= 0) { id = i; break; } }
  const lv = o.egg ? 1 : wildLv(id, tierOf(id));
  return { id, lv, sh: Math.random() < Math.min(SHINYCAP, shinyOdds() * (o.egg ? 4 : 1) * (o.shm || 1) * (typeof evShiny === 'function' ? evShiny() : 1)) ? 1 : 0, t: tierOf(id), tr: isLeg(id) ? 4 : 3, g: rollG(id) };
}
/* Sjansen for fangst. zone: 0 = bom, 1 = grønn sone, 2 = gull. */
const catchP = (id, ball, zone, e) => ball === 'master' || (e && e.sure) ? 1 : Math.min(0.97, Math.pow(D(id)[3] / 255, 0.45) * BALLM[ball] * (ball === 'dusk' && isLeg(id) ? LEGBALL : 1) * (e && e.fed ? BERRYM : 1) * [0.5, 1, 1.6][zone]);
/* Sonene på timing-måleren i prosent: grønn bredde og gull bredde. Sjeldnere = smalere og raskere. */
const zones = (e, ball) => ({ g: Math.max(14, 36 - e.t * 5 + (ball === 'great' ? 4 : ball === 'poke' ? 0 : 8)), au: 7, sp: 0.9 + e.t * 0.22 });
/* Det en fangst gir utover Pokémonen: mynter for en ny art (NEWCOIN etter sjeldenhet), for et perfekt kast (PERFCOIN), og for flere fangster på rad uten
   at noen slipper unna (STREAKC per fangst fra den tredje, høyst STREAKMAX). S.cst = rekka akkurat nå.
   Kritisk fangst: en sjelden gang (critP, litt oftere jo flere arter du har) sitter ballen ekstra godt, og sjansen er CRITM ganger så stor. */
const NEWCOIN = [15, 30, 60, 120, 300], PERFCOIN = 10, STREAKC = 5, STREAKMAX = 50, CRITM = 2.5;
/* Legendariske møter i vanlige økter (se grant), og hvor mange minutter fokus en dag må ha før kampene kan åpnes og dagen teller som studiedag. */
const LEGSES = 0.0012, LEGSTIR = [0.003, 0.01], OPENMIN = 25;
const critP = () => Math.min(0.1, 0.03 + Object.keys(S.caught).length * 0.0002);
/* Hvor godt sjansen står med denne ballen i den grønne sonen: 2 = god, 1 = jevn, 0 = tøff. */
const oddsOf = (e, ball) => { const p = catchP(e.id, ball, 1, e); return p >= 0.7 ? 2 : p >= 0.4 ? 1 : 0; };
function throwBall(e, ball, zone) {
  if (!(S.items[ball] > 0) || e.tr <= 0) return null;
  S.items[ball]--; e.tr--;
  const crit = Math.random() < critP(), p = ball === 'master' ? 1 : Math.min(0.97, catchP(e.id, ball, zone, e) * (crit ? CRITM : 1)), ok = Math.random() < p;
  if (zone === 2) achInit().pf++;
  S.seen[e.id] = 1;
  let mon = null, isNew = false; const bonus = { c: 0, why: [] };
  if (ok) {
    isNew = !S.caught[e.id]; mon = addMon(e.id, e.lv, e.sh, 0, e.g); if (e.pk) mon.pk = 1; dropPend(e);
    S.cst = (S.cst || 0) + 1;
    const add = (n, s) => { if (n > 0) { bonus.c += n; bonus.why.push(`${s} +${n}`); } };
    if (isNew) add(NEWCOIN[e.t] || 0, 'New species');
    if (zone === 2) add(PERFCOIN, 'Perfect throw');
    if (S.cst >= 3) add(Math.min(STREAKMAX, STREAKC * S.cst), `${S.cst} in a row`);
    S.coins += bonus.c;
  } else if (e.tr <= 0) { dropPend(e); S.cst = 0; }
  save();
  return { ok, p, mon, isNew, fled: !ok && e.tr <= 0, crit: crit && ok, bonus };
}
/* Golden Razz Berry: ett kast til, og litt bedre sjanse resten av møtet. Én per møte. */
function feedBerry(e) { if (!e || e.fed || !(S.items.gberry > 0) || e.tr <= 0) return false; S.items.gberry--; e.fed = 1; e.tr++; save(); return true; }
function dropPend(e) { const i = S.pend.indexOf(e); if (i >= 0) S.pend.splice(i, 1); }
/* Køen av encounters har et tak. De eldste vanlige ryker først; kjøpte (pakker) og legendariske blir aldri kastet. */
function trimPend(max) { for (let i = 0; S.pend.length > max && i < S.pend.length;) { const e = S.pend[i]; if (e.pk || e.t >= 4) i++; else S.pend.splice(i, 1); } }

/* ---------- Fokusøkt ---------- */
const elapsedMs = t => (t.pausedAt || Date.now()) - t.start - (t.paused || 0);
function startTimer(fag, min) { if (!(S.lastEnd && Date.now() - S.lastEnd < RUNGAP)) S.run = 0; S.lad.day = ''; S.timer = { fag, min, start: Date.now(), paused: 0, pausedAt: 0, seen: 0 }; S.last = { fag, min }; save(true); }
/* ---------- Ærlighetssjekk ----------
   Appen kan ikke se om du faktisk studerer. Når en økt starter under forhold som ser rare ut, spør den før klokka går:
   late = midt på natta (HONLATE), long = mer logget i dag enn en lang dag (HONLONG utover dagsmålet), run = HONRUN minutter på rad uten pause (RUNGAP).
   Hver grunn spørres det om én gang per dag. Svaret lagres bare som et antall (S.hon.n). */
const HONLATE = [0.5, 5.5], HONLONG = 120, HONRUN = 240, RUNGAP = 5 * 60000;
function honestWhy() {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60, k = dayKey(), a = S.hon && S.hon.d === k ? S.hon.a : {};
  const real = Object.values((S.log[k] || {}).f || {}).reduce((x, y) => x + y, 0);
  if (h >= HONLATE[0] && h < HONLATE[1] && !a.late) return 'late';
  if (real >= Math.max(480, S.cap + HONLONG) && !a.long) return 'long';
  if (S.lastEnd && Date.now() - S.lastEnd < RUNGAP && (S.run || 0) >= HONRUN && !a.run) return 'run';
  return '';
}
function honestOk(why) { const k = dayKey(); if (!S.hon || S.hon.d !== k) S.hon = { d: k, a: {}, n: (S.hon && S.hon.n) || 0 }; S.hon.a[why] = 1; S.hon.n++; save(true); }
function togglePause() { const t = S.timer; if (!t) return; if (t.pausedAt) { t.paused += Date.now() - t.pausedAt; t.pausedAt = 0; } else t.pausedAt = Date.now(); save(true); }
function finishTimer() {
  const t = S.timer; if (!t) return null;
  const ms = elapsedMs(t), full = ms >= t.min * 60000 - 800, min = full ? t.min : Math.floor(ms / 60000);
  S.timer = null;
  if (min < 1) { save(true); return { min: 0 }; }
  return grant(t.fag, min, full, t.min, { t: t.start });
}
/* Belønningen for en økt. De første øktminuttene hver dag gir uthvilt-bonus, og etter dagstaket (S.cap) er laget slitent: halv XP og ingen møter.
   real = minuttene som faktisk ble brukt. min = det de er verdt (w = 1 for fag, OTHERW for andre aktiviteter): all belønning og dagsmålet regnes
   av det. Dagsloggen fører det vektede tallet i m, de virkelige minuttene per kategori i f, og virkelige minutter på andre aktiviteter i x. */
function grant(fag, real, full, plan, re) {
  /* re = { t: da økta startet }. Gis en økt på nytt etter at to lagringer har møttes (jrMerge: re.again), hører den til dagen den ble gjort (re.d). */
  const k = re && re.again && re.d ? re.d : dayKey(), day = S.log[k] || (S.log[k] = { m: 0, s: 0, f: {} });
  /* Andre ting enn fagene (rateOf < 1) teller halvt bare for kampbonusen og dagsmålet (min, day.m). Møter og mynter følger de ekte minuttene
     (okReal = de ekte minuttene som er innenfor dagsmålet), XP er OTHERXP av det fagene gir, og partneren får ikke EV av dem. */
  const w = rateOf(fag), min = w === 1 ? real : Math.round(real * w), planned = plan;
  const rested = day.s === 0, okMin = Math.max(0, Math.min(min, S.cap - day.m)), tired = okMin < min, mult = rested ? 1.5 : 1;
  const okReal = w === 1 ? okMin : Math.min(real, Math.round(okMin / w)), xw = w === 1 ? 1 : OTHERXP;
  const R = { fag, min: real, eff: min, w, full, rested, tired, ups: [], gifts: [], hatch: [], tl0: tlv(), enc: 0 };
  R.xp = Math.round((okReal * 10 + (real - okReal) * 5) * mult * xw * exf());
  R.coins = Math.round((okReal * 3 + (real - okReal) * 1.5) * mult) + (full ? 30 : 0);
  /* Fordel fra toppbosser: flere mynter i de neste øktene. */
  if (S.boost && S.boost.n > 0) { R.coins = Math.round(R.coins * S.boost.m); S.boost.n--; R.gifts.push(`Boss perk: ${S.boost.m}× coins${S.boost.n ? ` · ${S.boost.n} more session${S.boost.n > 1 ? 's' : ''}` : ''}`); if (!S.boost.n) S.boost = null; }
  S.xp += R.xp; S.coins += R.coins;
  /* Kampbonusen før og etter økta, til oppsummeringen. */
  const mulOf = m => typeof goalMin === 'function' ? Math.round((0.5 + Math.min(1, m / goalMin()) * (goalTop() - 0.5)) * 10) / 10 : null;
  const b0 = day.b || 0;
  /* Arbeidsdager: en økt som startet etter dagens arbeid, teller ×(1 + AFTERB) for kampbonusen den dagen (day.b). */
  if (S.work && !(re && re.again) && re && re.t) { const we = workEnd(k), st = new Date(re.t); if (we != null && dayKey(st) === k && st.getHours() * 60 + st.getMinutes() >= we) { day.b = b0 + Math.round(min * AFTERB); R.wb = day.b - b0; } }
  R.sm0 = mulOf(day.m + b0); R.sm1 = mulOf(day.m + min + (day.b || 0));
  day.m += min; day.s++; day.f[fag] = (day.f[fag] || 0) + real; if (w < 1) day.x = (day.x || 0) + real;
  S.fm[fag] = (S.fm[fag] || 0) + real;
  stamp();
  if (re && re.again) S.lastEnd = Math.max(S.lastEnd || 0, re.e || 0); else { S.run = (S.run || 0) + real; S.lastEnd = Date.now(); }
  jrAdd({ t: re && re.t ? re.t : S.lastEnd - real * 60000, e: re && re.again ? re.e : S.lastEnd, f: fag, r: real, p: plan || real, u: full ? 1 : 0, d: k });
  /* Achievements: lengste rekke dager, og dager med dagsmålet nådd (hver dag teller én gang, også om målet endres underveis). */
  { const A = achInit(), g0 = typeof goalMin === 'function' ? goalMin() : S.cap; A.bs = Math.max(A.bs || 0, streak()); if (A.gd !== k && day.m >= g0) { A.goal = (A.goal || 0) + 1; A.gd = k; } }
  S.party.forEach((u, i) => {
    const m = monBy(u); if (!m) return;
    const l0 = m.lv; m.xp += Math.round(real * 10 * xw * exf() * (i ? 0.3 : 1)); m.lv = lvOf(m.xp);
    if (!i && w === 1) addEv(m, Math.floor(real / 2));
    if (m.lv > l0) R.ups.push(Object.assign({ u, l0, l1: m.lv, evo: evoOpts(m).some(x => x.ok) }, learnUp(m, l0)));
  });
  for (const q of QUESTS) if (day.m - min < q.m && day.m >= q.m) { q.give(); R.gifts.push(`Daily goal, ${q.n}: ${q.r}`); }
  /* Reisen: dagen teller som en studiedag når den når OPENMIN minutter (én gang per dag). */
  if (jOn() && day.m - min < OPENMIN && day.m >= OPENMIN && S.jt !== k) { S.jt = k; S.jd = (S.jd || 0) + 1; featCheck(); R.jday = S.jd; }
  /* Raid: sjeldent, og aldri til fast tid (raidRoll i league.js). Dagens første OPENMIN minutter teller som en studiedag og gir én trekning,
     og dagsmålet nådd gir én til. */
  if (typeof raidRoll === 'function' && S.party.length) {
    const g = goalMin();
    /* Det sies ingenting her: raidet er skjult til dagens kamper er spilt, simulert eller hoppet over (raidUnhide), og kommer da som en overraskelse. */
    if (day.m - min < OPENMIN && day.m >= OPENMIN) { S.rwait = (S.rwait || 0) + 1; if (raidRoll()) R.raid = 1; }
    if (!R.raid && day.m - min < g && day.m >= g && raidRoll()) R.raid = 1;
  }
  R.tl1 = tlv();
  for (const n of unlockRegions()) R.gifts.push(`New area: ${n} is open. Its Pokémon now show up in your encounters.`);
  S.nreg = [];
  for (let l = R.tl0 + 1; l <= R.tl1; l++) {
    S.items.poke += 5; let g = '5 Poké Balls';
    if (l === 3) { S.items.great += 3; g += ' and 3 Great Balls (now in the shop)'; }
    if (l === 7) { S.items.ultra += 2; g += ' and 2 Ultra Balls (now in the shop)'; }
    R.gifts.push(`Trainer level ${l}: ${g}`);
  }
  if (S.eggs.length) {
    const e = S.eggs[0]; e.got += real;
    if (e.got >= e.need) { S.eggs.shift(); const en = genEnc({ egg: 1 }); const isNew = !S.caught[en.id]; const m = addMon(en.id, 1, en.sh, 1, en.g); R.hatch.push({ u: m.u, isNew }); }
  }
  const encs = [];
  let n = Math.floor(okReal / 20) + (full && planned >= 25 && okReal >= planned ? 1 : 0), luck = Math.min(1.5, planned / 60);
  if (S.incOn && okMin > 0) { n++; luck += 0.5; S.incOn = 0; }
  /* Lure: ett møte til i LUREN økter. Super Lure: sjeldnere funn i LUREN økter. */
  let cap = 6;
  if (S.lure > 0 && okMin > 0) { n++; cap++; S.lure--; R.gifts.push(`Lure: one more encounter${S.lure ? ` · ${S.lure} more session${S.lure > 1 ? 's' : ''}` : ' · it is now used up'}`); }
  if (S.slure > 0 && okMin > 0) { luck += 1; S.slure--; R.gifts.push(`Super Lure: rarer Pokémon this session${S.slure ? ` · ${S.slure} more session${S.slure > 1 ? 's' : ''}` : ' · it is now used up'}`); }
  n = Math.min(n, cap);
  /* Hvert vanlig møte kan en sjelden gang være legendarisk: LEGSES i en kort økt, opp mot det dobbelte i en lang, litt mer med dager på rad.
     En hel økt på 45 minutter eller mer har i tillegg en liten sjanse (LEGSTIR) for at noe legendarisk rører seg. Begge er en tredel av det de var:
     de store kommer i raid, og et legendarisk møte i gresset skal være en sjelden overraskelse. */
  const legP = LEGSES * (1 + luck * 0.5) + Math.min(streak(), 10) * 0.0001;
  for (let i = 0; i < n; i++) encs.push(Math.random() < legP ? legEnc() : genEnc({ fag, luck }));
  if (full && planned >= 45 && okReal >= planned && Math.random() < Math.min(LEGSTIR[1], LEGSTIR[0] + 0.0015 * streak())) { encs.push(legEnc()); R.gifts.push('Something legendary is stirring in the grass.'); }
  { const bk = berryFind(okReal); if (bk) R.gifts.push(`Your team found ${/^[AEIOU]/.test(HELD[bk].n) ? 'an' : 'a'} ${HELD[bk].n}. A Pokémon can hold it in battle.`); }
  /* Eksamensperioden: merket teller ned mot eksamen. Tida i faget teller fram til og med eksamensdagen (se EXN). */
  const fg = S.fag[fag];
  if (fg && examOn() && fg.xs && fg.d && k <= fg.d) {
    fg.xf = (fg.xf || 0) + real; fg.xm = fg.xm || 0;
    const reach = Math.floor(exFrac(fg) * 4);
    while (fg.xm < reach && !exGate(fg)) {
      fg.xm++;
      if (fg.xm < 4) { encs.push(genEnc({ fag, min: 3, luck: 1.5 })); R.gifts.push(`${F(fag).n}: ${fg.xm * 25}% of the way to the exam. An epic encounter is waiting.`); }
      else { encs.push(legEnc()); R.gifts.push(`Exam day: the ${F(fag).n} badge is yours. A legendary encounter is waiting.`); }
    }
  }
  if (jOn() && has('shiny') && !(S.jx || {}).sh) { (S.jx = S.jx || {}).sh = 1; encs.push(jShiny()); R.jsh = 1; }
  R.enc = encs.length;
  if (S.charm > 0 && n > 0) { S.charm--; R.gifts.push(`Shiny Charm: ${CHARM.m}× shiny odds this session${S.charm ? ` · ${S.charm} more session${S.charm > 1 ? 's' : ''}` : ' · it has now faded'}`); }
  S.pend.push(...encs);
  trimPend(15);
  save();
  return R;
}

/* ---------- Achievements og rang ----------
   Hvert mål har flere trinn (t), og hvert trinn gir en belønning som hentes med ett trykk (r: mynter, c = Rare Candy, u = Ultra Balls, m = Mega Stone).
   S.ach[k] = antall trinn som er hentet. Hvor langt du er kommet, leses av spillet slik det står (v), pluss noen tellere i S.st som ikke finnes
   andre steder (ev utviklinger, pf perfekte kast, ch mestere slått, rw raid vunnet, bs lengste rekke dager, goal dager med dagsmålet nådd).
   Hvert trinn du henter, er en medalje. Rangen (RANKS) følger antall medaljer og vises som ramme og stempel rundt profilbildet:
   du rykker altså opp i det du henter en belønning, ikke midt i en kamp. */
const ACOIN = [100, 250, 600, 1500, 4000], ATY = [80, 200, 500];
const tyCount = t => Object.keys(S.caught).filter(id => { const d = D(+id); return d && (d[1] === t || d[2] === t); }).length;
function achInit() {
  if (S.st) return S.st;
  const legs = Object.keys(S.caught).filter(id => isLeg(+id)).length;
  const g0 = Math.max(60, S.cap || 360), hit = Object.keys(S.log).filter(d => S.log[d].m >= g0);
  S.st = { ev: 0, pf: 0, ch: 0, rw: legs, bs: streak(), goal: hit.length, gd: hit.includes(dayKey()) ? dayKey() : '' };
  return S.st;
}
const ACH = [
  { g: 'Study', k: 'hours', n: 'Study hours', u: 'hours of focus', v: () => Math.floor(totalMin() / 60), t: [5, 25, 75, 150, 300] },
  { g: 'Study', k: 'streak', n: 'Day streak', f: (v, n, s) => s.done >= s.max ? `Best streak: ${v} days in a row` : `Best streak: ${v} of ${n} days in a row`, v: () => Math.max(achInit().bs || 0, streak()), t: [3, 7, 14, 30, 60] },
  { g: 'Study', k: 'goal', n: 'Daily goal', u: 'days with your daily goal reached', v: () => achInit().goal || 0, t: [1, 5, 15, 40, 100] },
  { g: 'Trainer', k: 'tlv', n: 'Trainer level', f: (v, n, s) => s.done >= s.max ? `Trainer level ${v}` : `Trainer level ${v} · next medal at ${n}`, v: () => tlv(), t: [5, 10, 15, 20, 30] },
  { g: 'Trainer', k: 'top', n: 'Strong team', f: (v, n, s) => s.done >= s.max ? `Your strongest Pokémon is Lv ${v}` : `Your strongest Pokémon is Lv ${v} · next medal at Lv ${n}`, v: () => S.mons.reduce((a, m) => Math.max(a, m.lv), 0), t: [20, 35, 50, 75, 100] },
  { g: 'Trainer', k: 'train', n: 'Fully trained', u: 'Pokémon with all 510 EVs', v: () => S.mons.filter(m => evSum(m) >= EVTOT).length, t: [1, 3, 6], r: [{ c: 600, k: 2 }, { c: 1500, k: 3 }, { c: 4000, k: 5 }] },
  { g: 'Collection', k: 'dex', n: 'Species caught', u: 'different species caught', v: () => Object.keys(S.caught).length, t: [10, 30, 75, 150, 300] },
  { g: 'Collection', k: 'shiny', n: 'Shiny hunter', u: 'shiny Pokémon owned', v: () => S.mons.filter(m => m.sh === 1).length, t: [1, 3, 10, 25], r: [{ c: 250 }, { c: 600, k: 2 }, { c: 1500, k: 3 }, { c: 4000, k: 5 }] },
  { g: 'Collection', k: 'leg', n: 'Legendary collector', u: 'legendary species caught', v: () => Object.keys(S.caught).filter(id => isLeg(+id)).length, t: [1, 3, 8, 15], r: [{ c: 600, k: 2 }, { c: 1500, k: 3 }, { c: 4000, k: 5 }, { c: 8000, m: 1 }] },
  { g: 'Collection', k: 'evo', n: 'Evolver', u: 'evolutions', v: () => achInit().ev || 0, t: [3, 10, 30] },
  { g: 'Collection', k: 'perfect', n: 'Perfect throws', u: 'perfect throws', v: () => achInit().pf || 0, t: [10, 50, 200] },
  { g: 'Collection', k: 'pack', n: 'Pack opener', u: 'encounter packs opened', v: () => S.packs || 0, t: [3, 15, 50] },
  { g: 'League', k: 'lwin', n: 'League wins', u: 'League battles won', v: () => S.lad.best || 0, t: [5, 25, 75, 200, 500] },
  { g: 'League', k: 'lap', n: 'Laps cleared', u: 'laps of the League cleared', v: () => S.lad.lap || 0, t: [1, 3, 6, 12], r: [{ c: 600, k: 2 }, { c: 1500, k: 3 }, { c: 3000, k: 4 }, { c: 6000, m: 1 }] },
  { g: 'League', k: 'champ', n: 'Champion slayer', u: 'Champions beaten', v: () => achInit().ch || 0, t: [1, 3, 10], r: [{ c: 600, k: 2 }, { c: 1500, k: 3 }, { c: 4000, m: 1 }] },
  { g: 'League', k: 'cynthia', n: 'The Sinnoh Champion', u: 'Beat Cynthia in the last battle of a League lap', v: () => (S.spw || {}).Cynthia || 0, t: [1], r: [{ c: 3000, k: 5 }] },
  { g: 'League', k: 'ghetsis', n: 'No mercy', u: 'Beat Ghetsis, Champions Edition, in the last battle of a League lap', v: () => (S.spw || {}).Ghetsis || 0, t: [1], r: [{ c: 3000, k: 5 }] },
  { g: 'Frontier and cups', k: 'fstreak', n: 'Frontier streak', f: (v, n, s) => s.done >= s.max ? `Best run: ${v} wins in a row` : `Best run: ${v} of ${n} wins in a row`, v: () => Math.max(S.fac.best || 0, (S.fac.run || {}).streak || 0), t: [5, 10, 20, 35] },
  { g: 'Frontier and cups', k: 'cup', n: 'Trophies', u: 'cups won in the World Tournament', v: () => (S.pwt || {}).won || 0, t: [1, 5, 15, 40] },
  { g: 'Raids', k: 'raid', n: 'Raid victories', u: 'legendary raids won', v: () => achInit().rw || 0, t: [1, 3, 8, 15], r: [{ c: 600, k: 2 }, { c: 1500, k: 3 }, { c: 4000, k: 5 }, { c: 8000, m: 1 }] },
  { g: 'Raids', k: 'dark', n: 'The shadow', u: 'Catch Dark Mewtwo', v: () => S.mons.some(m => m.id === 150 && m.sh === 2) ? 1 : 0, t: [1], r: [{ c: 5000, m: 1 }] },
  { g: 'Raids', k: 'ring', n: 'The Mega Ring', u: 'Earn the Mega Ring', v: () => S.ring ? 1 : 0, t: [1], r: [{ c: 1000, k: 2 }] }
].concat(TYN.map((n, t) => ({ g: 'Types', k: 'ty' + t, n: `${n} collector`, ty: t, u: `${n}-type species caught`, v: () => tyCount(t), t: [5, 12, 25], r: ATY.map(c => ({ c })) })));
const achBy = k => ACH.find(a => a.k === k);
const achRew = (a, i) => (a.r && a.r[i]) || { c: ACOIN[Math.min(ACOIN.length - 1, i + (a.t.length < 5 ? 1 : 0))] };
/* done = trinn klart, got = trinn hentet, val = hvor langt du er, next = neste mål (eller det siste når alt er klart).
   Et trinn som er hentet, står: selger du en shiny etterpå, mister du ikke medaljen. */
function achState(a) { const val = a.v(), got = Math.min(a.t.length, (S.ach || {})[a.k] || 0), done = Math.max(got, a.t.filter(x => val >= x).length); return { val, done, got, max: a.t.length, next: a.t[Math.min(a.t.length - 1, done)], open: done - got }; }
const achOpen = () => ACH.reduce((n, a) => n + achState(a).open, 0);
const achPoints = () => ACH.reduce((n, a) => n + achState(a).got, 0);
const achTotal = () => ACH.reduce((n, a) => n + a.t.length, 0);
/* Henter belønningen for neste trinn som er klart. Gir det som ble gitt, eller null. */
function achClaim(k, quiet) {
  const a = achBy(k); if (!a) return null; const st = achState(a); if (st.open <= 0) return null;
  const r = achRew(a, st.got); S.coins += r.c || 0;
  if (r.k) S.items.candy = (S.items.candy || 0) + r.k; if (r.u) S.items.ultra = (S.items.ultra || 0) + r.u; if (r.m) S.items.mstone = (S.items.mstone || 0) + r.m;
  (S.ach || (S.ach = {}))[k] = st.got + 1; if (!quiet) save();
  return r;
}
/* Henter alt som venter. Gir antall og summen. */
function achClaimAll() {
  const o = { n: 0, c: 0, k: 0, u: 0, m: 0 };
  for (const a of ACH) { let r; while ((r = achClaim(a.k, 1))) { o.n++; o.c += r.c || 0; o.k += r.k || 0; o.u += r.u || 0; o.m += r.m || 0; } }
  if (o.n) save();
  return o;
}
const RANKS = [['Rookie', 0, '#a39b8f'], ['Novice', 10, '#a6c59c'], ['Skilled', 25, '#7fa8e6'], ['Expert', 50, '#b295e6'], ['Master', 80, '#e3c577'], ['Elite', 105, '#ffd9a0']];
function rankFor(p) { let i = 0; RANKS.forEach((r, j) => { if (p >= r[1]) i = j; }); return { i, n: RANKS[i][0], c: RANKS[i][2], p, at: RANKS[i][1], next: RANKS[i + 1] ? RANKS[i + 1][1] : 0, nn: RANKS[i + 1] ? RANKS[i + 1][0] : '' }; }
const rankOf = () => rankFor(achPoints());
/* Alt på én gang, til forsiden: hvor mange belønninger som venter (open), medaljer (p) og rang (R). */
function achSum() { let open = 0, p = 0; for (const a of ACH) { const s = achState(a); open += s.open; p += s.got; } return { open, p, R: rankFor(p) }; }

/* ---------- Lag, utvikling, salg, butikk ---------- */
function evoOpts(m) {
  return (EVO[m.id] || []).map(to => {
    const lv = D(to)[5];
    if (lv) return { to, ok: m.lv >= lv, why: `at level ${lv}`, s: `Lv ${lv}` };
    if (D(m.id)[6] & 4) return { to, ok: m.lv >= 10, why: 'at level 10', s: 'Lv 10' };
    return { to, ok: S.items.stone > 0 && m.lv >= 15, why: 'with an Evolution Stone at level 15', s: 'Stone · Lv 15', stone: 1 };
  });
}
function evolve(m, to) {
  const o = evoOpts(m).find(x => x.to === to);
  if (!o || !o.ok) return false;
  if (o.stone) S.items.stone--;
  achInit().ev++;
  m.id = to; S.seen[to] = 1; S.caught[to] = 1;
  save(); return true;
}
/* Pokémon fra kjøpte pakker selges for 30 %, ellers kunne en pakke kjøpes og selges med fortjeneste. */
/* Svært gode medfødte IV («Outstanding» eller «Flawless», summen fra IVTOP av 186). Hyper Training teller ikke med: det er det den ble født med. */
const IVTOP = 151, ivTop = m => m.iv.reduce((a, b) => a + b, 0) >= IVTOP;
const PKSELL = 0.3;
/* Salgsverdien følger sjeldenheten, ikke nivået: før vokste den med nivået (og ville Pokémon følger laget ditt), så salg av duplikater ble den
   største inntektskilden sent i spillet. */
const sellValue = m => Math.round(SELL[tierOf(m.id)] * (m.sh ? 5 : 1) * (m.pk ? PKSELL : 1));
function sell(m) {
  if (S.mons.length <= 1) return 0;
  const v = sellValue(m); unbond(m); dropHeld(m);
  S.mons = S.mons.filter(x => x !== m); S.party = S.party.filter(u => u !== m.u);
  if (!S.party.length && S.mons.length) S.party.push(S.mons[0].u);
  S.coins += v; return v;
}
/* Artene du har mer enn én av, de sjeldneste først. best = den som beholdes når alle selges samlet (shiny foran, så høyest nivå). */
function dupGroups() {
  const by = {}; for (const m of S.mons) (by[m.id] = by[m.id] || []).push(m);
  return Object.keys(by).map(Number).filter(id => by[id].length > 1).map(id => { const l = by[id].slice().sort((a, b) => b.sh - a.sh || b.lv - a.lv); return { id, best: l[0], list: l }; })
    .sort((a, b) => tierOf(b.id) - tierOf(a.id) || a.id - b.id);
}
/* Hvorfor en av dem ikke selges fra Duplicates ('' = kan selges). Den kan fortsatt selges fra sitt eget ark. */
const dupWhy = (m, best) => S.party.includes(m.u) ? 'Team' : m.sh ? 'Shiny' : m.fav ? 'Favourite' : m.ms ? 'Mega Stone' : evSum(m) ? 'Trained' : m === best ? 'Kept' : '';
/* Duplikater som selges samlet: beholder den beste av hver art, og rører ikke laget, favoritter, shiny, trente eller dem med svært gode IV. */
function dupes() {
  const out = [];
  for (const g of dupGroups()) for (const m of g.list) if (!dupWhy(m, g.best) && !ivTop(m)) out.push(m);
  return out;
}
function setPartner(m) { S.party = [m.u, ...S.party.filter(u => u !== m.u)].slice(0, 6); save(); }
function toggleParty(m) {
  if (S.party.includes(m.u)) { if (S.party.length > 1) S.party = S.party.filter(u => u !== m.u); }
  else if (S.party.length < 6) S.party.push(m.u);
  save();
}
function useCandy(m) { if (!(S.items.candy > 0) || m.lv >= 100) return false; S.items.candy--; m.lv++; m.xp = Math.max(m.xp, xpAt(m.lv)); learnUp(m, m.lv - 1); save(); return true; }
function buy(k) {
  const it = SHOP[k];
  if (!it || S.coins < it.p || (it.lv && tlv() < it.lv) || (it.ring && !S.ring) || shopFull(k)) return false;
  if (k === 'egg') S.eggs.push({ need: 120, got: 0 });
  else if (k === 'incense') S.incOn = 1;
  else if (k === 'lure') S.lure = LUREN;
  else if (k === 'slure') S.slure = LUREN;
  else if (k === 'prism') S.prism = 1;
  else if (it.sb) S.shb = { k, m: it.sb[0], until: Date.now() + it.sb[1] * 36e5 };
  else S.items[k] = (S.items[k] || 0) + 1;
  S.coins -= it.p; save(); return true;
}
/* Områdene åpnes av trenernivå eller antall arter fanget (REG). Nye områder slås på med en gang. Gir navnene på dem som ble åpnet nå;
   de legges også i S.nreg, så skjermen kan si fra én gang. */
const dexAll = () => Object.keys(S.caught || {}).length;
const regReady = r => { const g = REG[r]; return !!g && (tlv() >= g.lv || dexAll() >= g.dex); };
function unlockRegions() {
  const out = [];
  for (let r = 2; r < REG.length; r++) if (!S.regions.includes(r) && regReady(r)) { S.regions.push(r); S.regions.sort(); if (!S.routes.includes(r)) { S.routes.push(r); S.routes.sort(); } out.push(REG[r].n); }
  if (out.length) S.nreg = (S.nreg || []).concat(out);
  return out;
}
/* Slår en rute av eller på. Minst én må stå på. */
function toggleRoute(r) {
  if (!S.regions.includes(r)) return;
  if (S.routes.includes(r)) { if (S.routes.length > 1) S.routes = S.routes.filter(x => x !== r); } else { S.routes.push(r); S.routes.sort(); S.region = r; }
  if (!S.routes.includes(S.region)) S.region = S.routes[0];
  save();
}
function dexCount(r) { const g = REG[r]; let c = 0; for (let id = g.a; id <= g.b; id++) if (S.caught[id]) c++; return c; }
/* Første start: timer som alt er gjort i fagene gir 60 mynter per time og et forsprang på merkene. */
function begin(id) {
  S.started = 1; S.wn = WNV; S.j = 1; S.jd = 0; S.ulk = {}; S.js = []; S.jx = {}; if (typeof TOURV !== 'undefined') S.tour = TOURV;
  let head = 0;
  for (const f in S.fag) { const g = S.fag[f]; head += g.b || 0; g.ms = g.t > 0 ? Math.min(3, Math.floor((g.b || 0) / (g.t * 60) * 4)) : 0; }
  const coins = Math.round(Math.min(head, STARTCAP) / 60 * 60);
  S.coins += coins; S.last.fag = Object.keys(S.fag)[0] || 'annet';
  addMon(id, 5, 0); save();
  return coins;
}
/* Lagrer fagene fra redigeringen. Eksisterende fag beholder nøkkel, minutter og milepæler. */
function setSubjects(list) {
  const old = S.fag, out = {};
  list.forEach((s, i) => {
    const k = s.k && old[s.k] ? s.k : 's' + Date.now().toString(36) + i;
    const o = old[k] || { ms: 0, t: 0, b: 0, c: PAL[Object.keys(out).length % PAL.length] };
    out[k] = Object.assign({}, o, { n: s.n, ty: s.ty.slice(0, 2), d: s.d || '' });
    if (S.exam) examJoin(out[k], dayKey());
  });
  S.fag = out; buildFags();
  if (!FAGS[S.last.fag]) S.last.fag = curFag();
}

/* ---------- Synk (valgfri): hele lagringen som én fil i et privat GitHub-repo. Høyeste rev vinner. ---------- */
const GHK = 'fokusdex.gh';
let GH = null, ghSha = '', ghBusy = false, ghT = 0, ghState = '', ghHook = null;
const b64e = s => { const b = new TextEncoder().encode(s); let r = ''; for (let i = 0; i < b.length; i += 0x8000) r += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(r); };
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
function ghLoad() { try { GH = JSON.parse(localStorage.getItem(GHK) || 'null'); } catch (_) { GH = null; } if (GH && !(GH.t && GH.repo)) GH = null; }
function ghStore() { try { if (GH) localStorage.setItem(GHK, JSON.stringify(GH)); else localStorage.removeItem(GHK); } catch (_) {} }
/* Sandkassa (prøv hvilken som helst klasse, raid, film og pakke, og hele spillet på en kopi av lagringen) er et testverktøy for den som eier appen. Den vises bare på enheter der Sync er koblet til
   et lagringsrepo hos eieren (ADMIN = GitHub-brukere). Det ligger ingen hemmelighet i koden: tilkoblingen krever en nøkkel til det private repoet, og
   ok settes først når nøkkelen har virket. Appen har ingen tjener, så dette er en lukket dør, ikke en lås: den som endrer lagringen eller koden for
   hånd, kommer forbi – som med alt annet her. */
const ADMIN = ['mwalderhaug'];
function isAdmin() { return !!(GH && GH.ok && ADMIN.includes(String(GH.repo || '').split('/')[0].trim().toLowerCase())); }
/* ok = 1 først når brukeren har valgt hvilken lagring som gjelder (ghLink). Før det synkes ingenting. */
function ghSet(t, repo) { GH = t && repo ? { t, repo, ok: 0 } : null; ghSha = ''; ghState = ''; ghStore(); }
function ghReq(method, body) {
  const h = { Authorization: 'Bearer ' + GH.t, Accept: 'application/vnd.github+json' };
  if (body) h['Content-Type'] = 'application/json';
  return fetch(`https://api.github.com/repos/${GH.repo}/contents/fokusdex/save.json`, { method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
}
const ghErr = st => st === 401 ? 'The key does not work' : st === 403 ? 'The key lacks permission (Contents)' : st === 404 ? 'Repo not found' : 'Sync failed (' + st + ')';
/* Første tilkobling: ser om repoet alt har en lagring. Gir { st: 'none' | 'remote' | 'err', o }. */
async function ghProbe() {
  try {
    const r = await ghReq('GET');
    if (r.status === 404) { ghSha = ''; return { st: 'none' }; }
    if (!r.ok) { ghState = ghErr(r.status); return { st: 'err' }; }
    const j = await r.json(); ghSha = j.sha;
    const o = JSON.parse(b64d(j.content));
    return o && o.v === 1 && Array.isArray(o.mons) ? { st: 'remote', o } : { st: 'none' };
  } catch (_) { ghState = 'Offline'; return { st: 'err' }; }
}
/* use = 'remote': denne enheten tar over lagringen fra GitHub (den lokale legges til side som sikkerhetskopi). use = 'local': denne enheten laster opp sin og erstatter den. */
const saveScore = o => (o.mons || []).reduce((a, m) => a + m.lv, 0) + (o.xp || 0) / 50 + Object.values(o.log || {}).reduce((a, d) => a + (d.m || 0), 0);
async function ghLink(use, o) {
  if (SBX) return;
  if (use === 'remote' && o) { const p = S; try { localStorage.setItem(KEY + '.bak', JSON.stringify(S)); } catch (_) {} adopt(o); carry(p); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} }
  else if (o) S.rev = Math.max(S.rev, o.rev || 0) + 1;
  GH.ok = 1; ghStore(); ghState = 'ok';
  if (use !== 'remote') await ghPush();
}
async function ghPull() {
  if (!GH || !GH.ok || ghBusy || SBX || S.timer || (S.live && S.live.dev === devId())) return;
  ghBusy = true;
  let push = false, adopted = false, kept = 0;
  try {
    const r = await ghReq('GET');
    if (r.status === 404) { ghSha = ''; push = true; }
    else if (!r.ok) ghState = ghErr(r.status);
    else {
      const j = await r.json(); ghSha = j.sha;
      const o = JSON.parse(b64d(j.content));
      /* En økt eller en kamp som startet mens svaret var på vei, røres ikke: lagringen her står til den er ferdig. */
      if (S.timer || (S.live && S.live.dev === devId())) { ghBusy = false; ghState = 'ok'; return; }
      /* Øktene følger med begge veier (jrMerge). Kom det noen til, lagres og lastes det sammenslåtte opp. */
      if (o && o.v === 1 && o.rev > S.rev) { const p = S; adopt(o); carry(p); kept = jrMerge(p); if (kept) { save(true); push = true; } try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} adopted = true; }
      else { if (o && o.v === 1) { kept = jrMerge(o); if (kept) save(true); } if (o && S.rev > o.rev) push = true; }
      ghState = 'ok';
    }
  } catch (_) { ghState = 'Offline'; }
  ghBusy = false;
  if (push) await ghPush();
  if (ghHook) ghHook(adopted, kept);
}
async function ghPush() {
  if (!GH || !GH.ok || ghBusy || SBX) return;
  ghBusy = true;
  let again = false;
  try {
    const body = { message: 'Fokusdex: save', content: b64e(JSON.stringify(S)) };
    if (ghSha) body.sha = ghSha;
    const r = await ghReq('PUT', body);
    if (r.ok) { ghSha = (await r.json()).content.sha; ghState = 'ok'; }
    else if (r.status === 409 || r.status === 422) again = true;
    else ghState = ghErr(r.status === 404 ? 404 : r.status);
  } catch (_) { ghState = 'Offline'; }
  ghBusy = false;
  if (again) { ghSha = ''; await ghPull(); }
  else if (ghHook) ghHook(false);
}
function ghSoon() { if (!GH || !GH.ok) return; clearTimeout(ghT); ghT = setTimeout(ghPush, 5000); }
