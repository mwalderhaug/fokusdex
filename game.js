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
   t = planlagte timer, b = minutter gjort før appen, d = eksamensdato, ms = milepæler hentet. Økter kan også føres på faste ekstra-valg (EXTRA). */
const EXTRA = { sok: { n: 'Job apps', c: '#D4BC8E', ty: [2, 9] }, annet: { n: 'Other', c: '#AFA89E', ty: [] } };
/* Jazz sine fag fra før fagene kunne velges. Brukes bare for å oppgradere gamle lagringer. */
const LEGACY = { bban: { n: 'BBAN', c: '#B9AFC9', ty: [12, 8] }, cf: { n: 'CF', c: '#A9C3A2', ty: [0, 1] }, met: { n: 'MET', c: '#9FBDB8', ty: [13, 7] }, bsmo: { n: 'Ø&B', c: '#BDBE92', ty: [11, 10, 6] } };
const PAL = ['#B9AFC9', '#A9C3A2', '#9FBDB8', '#BDBE92'];
let FAGS = {};
function buildFags() {
  FAGS = {};
  for (const k in S.fag) { const f = S.fag[k]; FAGS[k] = { n: f.n, c: f.c, ty: f.ty || [] }; }
  for (const k of S.extra || ['annet']) if (EXTRA[k]) FAGS[k] = EXTRA[k];
}
const F = k => FAGS[k] || EXTRA.annet;
const curFag = () => FAGS[S.last.fag] ? S.last.fag : Object.keys(FAGS)[0];
const SHOP = {
  poke: { n: 'Poké Ball', p: 20, d: 'Standard ball', img: 'poke-ball', bc: '#d98f7e' },
  great: { n: 'Great Ball', p: 60, d: 'Better odds · trainer level 3', lv: 3, img: 'great-ball', bc: '#7fa8e6' },
  ultra: { n: 'Ultra Ball', p: 150, d: 'Best odds · trainer level 7', lv: 7, img: 'ultra-ball', bc: '#e3c577' },
  /* Til kamp: brukes fra veska i ligakamper (bt = kampgjenstand). */
  potion: { n: 'Potion', p: 20, d: 'Heals 20 HP in battle', img: 'potion', bc: '#b28fe0', bt: 1 },
  super: { n: 'Super Potion', p: 45, d: 'Heals 60 HP in battle', img: 'super-potion', bc: '#e0845a', bt: 1 },
  hyper: { n: 'Hyper Potion', p: 90, d: 'Heals 120 HP in battle', img: 'hyper-potion', bc: '#e06a9a', bt: 1 },
  maxp: { n: 'Max Potion', p: 160, d: 'Heals all HP in battle', img: 'max-potion', bc: '#5a8fe0', bt: 1 },
  heal: { n: 'Full Heal', p: 40, d: 'Cures poison, burn, sleep and the rest', img: 'full-heal', bc: '#e3c577', bt: 1 },
  revive: { n: 'Revive', p: 120, d: 'Brings back a fainted Pokémon with half its HP', img: 'revive', bc: '#e3c577', bt: 1 },
  maxrev: { n: 'Max Revive', p: 300, d: 'Brings back a fainted Pokémon with all its HP', img: 'max-revive', bc: '#e3c577', bt: 1 },
  incense: { n: 'Incense', p: 80, d: 'Next session: one extra encounter and rarer finds', ic: 'smoke' },
  candy: { n: 'Rare Candy', p: 150, d: 'One level up for one Pokémon', ic: 'candy' },
  stone: { n: 'Evolution Stone', p: 300, d: 'For those that do not evolve by level alone', ic: 'gem' },
  egg: { n: 'Egg', p: 250, d: 'Hatches after 120 focus minutes. Can be from any region', ic: 'egg' }
};
const BALLM = { poke: 1, great: 1.5, ultra: 2.2 };
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
const lvOf = xp => Math.max(1, Math.min(100, Math.floor(Math.sqrt(xp / 12))));
const xpAt = l => 12 * l * l;

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
/* Formen en art har når den dukker opp (Giratina kommer i Origin Forme og kan byttes på kortet). */
const defForm = id => id === 487 ? ORIGIN : 0;
const megaOf = m => m && m.mega ? MEGA[m.mega - 1] : null;
const isMega = m => { const g = megaOf(m); return !!g && g[1] !== 'Origin'; };
/* Høyden i Pokédexen (meter), til størrelsen i kamp. */
const HT = '070a14060b11050a1003070b03060a030b0f0307030c14230408060a04080d05090e060d060b050a081005080c030a0a0f0207040a0811050a0713060a0d090d0f080f10070a110910040a0e0a110c10030a080e120b11090c030f0d100f580a10040d050c0414040a0f0e0c060c0a130b0a16040c060d080b0d0f0e0b0d0f0e09411903030a080908040a050d12151110141228161404090c12050911060b17081207100a0e050b12050c0303030306020f06080e0404080c0b0406080803080c040e090a051407050d0f060c0f0b5c060e0512060f0906120708040b060609091511060e12050b060e0c070e0406070c0f131514060c1434260605091104091304070f050a040503060a070c050c0f050a0d0307060c0408100508040c080e14050808060a0f0a17020a060b0506040915060d060f040407060304110812149107130507090b070b14040d040b0d1b0a0c0409060b050f0a0f070f063e030a060b081014060c06070f080b0e0411120a06060b0f060c101112130e142d23460311040b1605090c04081103060c050a030a05090e02090910050d020509030c04070b040503090c040c040c0909050a02040a050d050606050a070e1306070c0814080d070d0e040c0a0a160b0c11181412100f130a08141909100e160d03030303362a11252d0f04030f022004060821050a1005080f050b04090c040b060b060a060a060b03060c0810040911040903070b060c0e05080f0d0e03050c040c190307050b0a070a0f060d0a030e060b0e0511070c050e06130710040504070f03060a050d040b0d061304050a02060c160c0108060a030606020c15050a03060a060a12051a0b040807090e100a1c051010050f050c0e03080e120b101513140f0f201d0f1e0e060f';
const htOf = (id, mega) => { const g = mega ? MEGA[mega - 1] : null; return (g && g[7] ? g[7] : parseInt(HT.substr((id - 1) * 2, 2), 16) || 10) / 10; };
/* Kjønn: GR er andelen hunner i åttedeler per art (9 = uten kjønn). m.g: 0 = hann, 1 = hunn, 2 = uten kjønn. */
const GR = '1111111114444444444444444444888000666666444444444444444442244422222244444444444499444444444444444449944440044444848444499448224044491111911111199944499111111111444444444444661144444444444444444441144494444444664444444444464444444444944008228899944499911111111144444444444444444444444444444449444226466444444444440844444444444444444444449944449911114444444444444444444416444999999809999911111111144444444444411114801844444444444444664449944844444111444444444444494442214114490448999999499899999911111111144444441111114444444444444442224440044444444884444444444444411114411666664444444444444444444444999444444444444494444449944400884444444999009909999';
const rollG = (id, r) => { const q = +GR[id - 1]; return q === 9 || isNaN(q) ? 2 : (r == null ? Math.random() : r) * 8 < q ? 1 : 0; };
const GSYM = ['♂', '♀', ''];
const megaBst = k => MEGA[k][4].reduce((a, c) => a + c, 0);
/* Artsnavnet med form (Dark, Mega, Primal). mName gir kallenavnet hvis Pokémonen har fått et. */
const spName = m => { const g = megaOf(m), n = (m.sh === 2 ? 'Dark ' : '') + D(m.id)[0]; return g ? (g[1] === 'Primal' ? 'Primal ' + n : g[1] === 'Origin' ? n : 'Mega ' + n + (g[1] ? ' ' + g[1] : '')) : n; };
const mName = m => m.nn || spName(m);
/* Kallenavn: bokstaver, tall og noen få tegn (de som finnes i skrifta på HP-boksene), høyst 12. Tomt navn fjerner kallenavnet. */
const cleanNick = s => String(s || '').replace(/[^A-Za-z0-9 .\-?]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
function setNick(m, s) { const n = cleanNick(s); if (n && n !== D(m.id)[0]) m.nn = n; else delete m.nn; save(); return m.nn || ''; }
const mTypes = m => { const g = megaOf(m); return g ? [g[2], g[3]] : [D(m.id)[1], D(m.id)[2]]; };
function statsOf(m) {
  const b = m.mega ? MEGA[m.mega - 1][4] : BST[m.id - 1], up = natUp(m.nat), dn = natDn(m.nat);
  return b.map((B, i) => {
    const core = Math.floor((2 * B + m.iv[i] + Math.floor(m.ev[i] / 4)) * m.lv / 100);
    if (i === 0) return m.id === 292 ? 1 : core + m.lv + 10;
    const v = core + 5;
    return up === dn ? v : i === up ? Math.floor(v * 1.1) : i === dn ? Math.floor(v * 0.9) : v;
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
  return { t: s >= 151 ? 'Outstanding' : s >= 121 ? 'Great' : s >= 91 ? 'Above average' : 'Decent', best, sum: s };
}
const rollIv = egg => Array.from({ length: 6 }, () => egg ? Math.max(rnd(32), rnd(32)) : rnd(32));
function ensure(m) {
  if (!m.iv) m.iv = rollIv(); if (!m.ev) m.ev = [0, 0, 0, 0, 0, 0]; if (m.nat == null) m.nat = rnd(25); if (!m.nm) m.nm = [];
  /* Kjønnet til dem som fantes før kjønn ble innført, følger av nummeret og fangsttidspunktet, så det blir likt på alle enheter. */
  if (m.g == null) m.g = rollG(m.id, m.u ? (((m.u * 2654435761 + (m.at || 0) % 100003 * 40503) >>> 0) % 1000) / 1000 : null);
  if (!m.mv || !m.mv.length) m.mv = defaultMoves(m.id, m.lv);
  return m;
}
/* EV-er legges i artens beste stat først (maks 252 per stat, 510 totalt). */
function addEv(m, n) {
  const order = BST[m.id - 1].map((b, i) => [b, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  let tot = m.ev.reduce((a, b) => a + b, 0);
  for (const i of order) { const add = Math.min(n, 252 - m.ev[i], 510 - tot); if (add > 0) { m.ev[i] += add; tot += add; n -= add; } if (n <= 0) break; }
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
    v: 1, mig: 6, rev: 0, at: '', xp: 0, coins: 0, uid: 1, started: 0,
    items: { poke: 15, great: 0, ultra: 0, candy: 0, stone: 0, incense: 0, potion: 0, super: 0, hyper: 0, maxp: 0, heal: 0, revive: 0, maxrev: 0 }, charm: 0,
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
function load() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1) adopt(o); } catch (_) {}
  buildFags();
}
let saveHook = null;
function save(quiet) {
  S.rev++; S.at = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {}
  if (!quiet && saveHook) saveHook();
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
const CHARM = { n: 5, m: 8 };
const shinyOdds = () => (1 / 150) * (1 + Math.min(streak(), 10) * 0.15) * (S.charm > 0 ? CHARM.m : 1);

function addMon(id, lv, sh, egg, g) {
  const m = { u: S.uid++, id, lv, xp: xpAt(lv), sh: sh === 2 ? 2 : sh ? 1 : 0, fav: 0, at: Date.now(), iv: rollIv(egg), ev: [0, 0, 0, 0, 0, 0], nat: rnd(25), mv: defaultMoves(id, lv), g: g == null ? rollG(id) : g };
  if (defForm(id)) m.mega = defForm(id);
  S.mons.push(m);
  S.seen[id] = 1; S.caught[id] = 1; unlockRegions();
  if (S.party.length < 6) S.party.push(m.u);
  return m;
}

/* ---------- Møter ---------- */
/* o: fag (typebias), luck 0–2 (lengre økt og lokkeduft gir mer sjeldent), min (laveste sjeldenhet), leg (legendarisk), egg. */
function genEnc(o = {}) {
  const bias = o.ty || F(o.fag).ty || [], L = o.luck || 0, pool = [], P = refLv();
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
  return { id, lv, sh: Math.random() < shinyOdds() * (o.egg ? 4 : 1) ? 1 : 0, t: tierOf(id), tr: isLeg(id) ? 4 : 3, g: rollG(id) };
}
/* Sjansen for fangst. zone: 0 = bom, 1 = grønn sone, 2 = gull. */
const catchP = (id, ball, zone) => Math.min(0.97, Math.pow(D(id)[3] / 255, 0.45) * BALLM[ball] * [0.5, 1, 1.6][zone]);
/* Sonene på timing-måleren i prosent: grønn bredde og gull bredde. Sjeldnere = smalere og raskere. */
const zones = (e, ball) => ({ g: Math.max(14, 36 - e.t * 5 + (ball === 'great' ? 4 : ball === 'ultra' ? 8 : 0)), au: 7, sp: 0.9 + e.t * 0.22 });
function throwBall(e, ball, zone) {
  if (!(S.items[ball] > 0) || e.tr <= 0) return null;
  S.items[ball]--; e.tr--;
  const p = catchP(e.id, ball, zone), ok = Math.random() < p;
  S.seen[e.id] = 1;
  let mon = null, isNew = false;
  if (ok) { isNew = !S.caught[e.id]; mon = addMon(e.id, e.lv, e.sh, 0, e.g); dropPend(e); }
  else if (e.tr <= 0) dropPend(e);
  save();
  return { ok, p, mon, isNew, fled: !ok && e.tr <= 0 };
}
function dropPend(e) { const i = S.pend.indexOf(e); if (i >= 0) S.pend.splice(i, 1); }

/* ---------- Fokusøkt ---------- */
const elapsedMs = t => (t.pausedAt || Date.now()) - t.start - (t.paused || 0);
function startTimer(fag, min) { S.lad.day = ''; S.timer = { fag, min, start: Date.now(), paused: 0, pausedAt: 0, seen: 0 }; S.last = { fag, min }; save(true); }
function togglePause() { const t = S.timer; if (!t) return; if (t.pausedAt) { t.paused += Date.now() - t.pausedAt; t.pausedAt = 0; } else t.pausedAt = Date.now(); save(true); }
function finishTimer() {
  const t = S.timer; if (!t) return null;
  const ms = elapsedMs(t), full = ms >= t.min * 60000 - 800, min = full ? t.min : Math.floor(ms / 60000);
  S.timer = null;
  if (min < 1) { save(true); return { min: 0 }; }
  return grant(t.fag, min, full, t.min);
}
/* Belønningen for en økt. De første øktminuttene hver dag gir uthvilt-bonus, og etter dagstaket (S.cap) er laget slitent: halv XP og ingen møter. */
function grant(fag, min, full, planned) {
  const k = dayKey(), day = S.log[k] || (S.log[k] = { m: 0, s: 0, f: {} });
  const rested = day.s === 0, okMin = Math.max(0, Math.min(min, S.cap - day.m)), tired = okMin < min, mult = rested ? 1.5 : 1;
  const R = { fag, min, full, rested, tired, ups: [], gifts: [], hatch: [], tl0: tlv(), enc: 0 };
  R.xp = Math.round((okMin * 10 + (min - okMin) * 5) * mult);
  R.coins = Math.round((okMin * 3 + (min - okMin) * 1.5) * mult) + (full ? 30 : 0);
  /* Fordel fra toppbosser: flere mynter i de neste øktene. */
  if (S.boost && S.boost.n > 0) { R.coins = Math.round(R.coins * S.boost.m); S.boost.n--; R.gifts.push(`Boss perk: ${S.boost.m}× coins${S.boost.n ? ` · ${S.boost.n} more session${S.boost.n > 1 ? 's' : ''}` : ''}`); if (!S.boost.n) S.boost = null; }
  S.xp += R.xp; S.coins += R.coins;
  /* Kampbonusen før og etter økta, til oppsummeringen. */
  const mulOf = m => typeof goalMin === 'function' ? Math.round((0.5 + Math.min(1, m / goalMin()) * (goalTop() - 0.5)) * 10) / 10 : null;
  R.sm0 = mulOf(day.m); R.sm1 = mulOf(day.m + min);
  day.m += min; day.s++; day.f[fag] = (day.f[fag] || 0) + min;
  S.fm[fag] = (S.fm[fag] || 0) + min;
  S.party.forEach((u, i) => {
    const m = monBy(u); if (!m) return;
    const l0 = m.lv; m.xp += Math.round(min * 10 * (i ? 0.3 : 1)); m.lv = lvOf(m.xp);
    if (!i) addEv(m, Math.floor(min / 2));
    if (m.lv > l0) R.ups.push(Object.assign({ u, l0, l1: m.lv, evo: evoOpts(m).some(x => x.ok) }, learnUp(m, l0)));
  });
  for (const q of QUESTS) if (day.m - min < q.m && day.m >= q.m) { q.give(); R.gifts.push(`Daily goal, ${q.n}: ${q.r}`); }
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
    const e = S.eggs[0]; e.got += min;
    if (e.got >= e.need) { S.eggs.shift(); const en = genEnc({ egg: 1 }); const isNew = !S.caught[en.id]; const m = addMon(en.id, 1, en.sh, 1, en.g); R.hatch.push({ u: m.u, isNew }); }
  }
  const encs = [];
  let n = Math.floor(okMin / 20) + (full && planned >= 25 && okMin >= planned ? 1 : 0), luck = Math.min(1.5, planned / 60);
  if (S.incOn && okMin > 0) { n++; luck += 0.5; S.incOn = 0; }
  n = Math.min(n, 6);
  /* Hvert vanlig møte kan en sjelden gang være legendarisk: 0,5 % i en kort økt, opp mot 1 % i en lang, litt mer med dager på rad. */
  const legP = 0.005 * (1 + luck * 0.5) + Math.min(streak(), 10) * 0.0003;
  for (let i = 0; i < n; i++) encs.push(Math.random() < legP ? genEnc({ leg: 1 }) : genEnc({ fag, luck }));
  if (full && planned >= 45 && okMin >= planned && Math.random() < Math.min(0.04, 0.01 + 0.005 * streak())) { encs.push(genEnc({ leg: 1 })); R.gifts.push('Something legendary is stirring in the grass.'); }
  const fg = S.fag[fag];
  if (fg) {
    const reach = Math.min(4, Math.floor(fagMin(fag) / (fg.t * 60) * 4));
    while (fg.ms < reach) {
      fg.ms++;
      if (fg.ms < 4) { encs.push(genEnc({ fag, min: 3, luck: 1.5 })); R.gifts.push(`${F(fag).n}: ${fg.ms * 25}% of the plan is done. An epic encounter is waiting.`); }
      else { encs.push(genEnc({ leg: 1 })); R.gifts.push(`The ${F(fag).n} badge is yours. A legendary encounter is waiting.`); }
    }
  }
  R.enc = encs.length;
  if (S.charm > 0 && n > 0) { S.charm--; R.gifts.push(`Shiny Charm: ${CHARM.m}× shiny odds this session${S.charm ? ` · ${S.charm} more session${S.charm > 1 ? 's' : ''}` : ' · it has now faded'}`); }
  S.pend.push(...encs);
  if (S.pend.length > 15) S.pend.splice(0, S.pend.length - 15);
  save();
  return R;
}

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
  m.id = to; S.seen[to] = 1; S.caught[to] = 1;
  save(); return true;
}
const sellValue = m => Math.round(SELL[tierOf(m.id)] * (1 + m.lv / 20) * (m.sh ? 5 : 1));
function sell(m) {
  if (S.mons.length <= 1) return 0;
  const v = sellValue(m);
  S.mons = S.mons.filter(x => x !== m); S.party = S.party.filter(u => u !== m.u);
  if (!S.party.length && S.mons.length) S.party.push(S.mons[0].u);
  S.coins += v; return v;
}
/* Duplikater som kan selges samlet: beholder den beste av hver art, og rører ikke laget, favoritter eller shiny. */
function dupes() {
  const best = {};
  for (const m of S.mons) { const b = best[m.id]; if (!b || m.sh > b.sh || (m.sh === b.sh && m.lv > b.lv)) best[m.id] = m; }
  return S.mons.filter(m => best[m.id] !== m && !m.fav && !m.sh && !S.party.includes(m.u));
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
  if (!it || S.coins < it.p || (it.lv && tlv() < it.lv)) return false;
  if (k === 'egg') { if (S.eggs.length >= 3) return false; S.eggs.push({ need: 120, got: 0 }); }
  else if (k === 'incense') { if (S.incOn) return false; S.incOn = 1; }
  else S.items[k]++;
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
  S.started = 1;
  let head = 0;
  for (const f in S.fag) { const g = S.fag[f]; head += g.b; g.ms = Math.min(3, Math.floor(g.b / (g.t * 60) * 4)); }
  const coins = Math.round(head / 60 * 60);
  S.coins += coins; S.last.fag = Object.keys(S.fag)[0] || 'annet';
  addMon(id, 5, 0); save();
  return coins;
}
/* Lagrer fagene fra redigeringen. Eksisterende fag beholder nøkkel, minutter og milepæler. */
function setSubjects(list) {
  const old = S.fag, out = {};
  list.forEach((s, i) => {
    const k = s.k && old[s.k] ? s.k : 's' + Date.now().toString(36) + i;
    const o = old[k] || { ms: 0, c: PAL[Object.keys(out).length % PAL.length] };
    out[k] = Object.assign({}, o, { n: s.n, ty: s.ty.slice(0, 2), t: s.t, b: s.b, d: s.d });
    out[k].ms = Math.max(o.ms || 0, Math.min(3, Math.floor(s.b / (s.t * 60) * 4)));
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
  if (use === 'remote' && o) { try { localStorage.setItem(KEY + '.bak', JSON.stringify(S)); } catch (_) {} adopt(o); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} }
  else if (o) S.rev = Math.max(S.rev, o.rev || 0) + 1;
  GH.ok = 1; ghStore(); ghState = 'ok';
  if (use !== 'remote') await ghPush();
}
async function ghPull() {
  if (!GH || !GH.ok || ghBusy || S.timer) return;
  ghBusy = true;
  let push = false, adopted = false;
  try {
    const r = await ghReq('GET');
    if (r.status === 404) { ghSha = ''; push = true; }
    else if (!r.ok) ghState = ghErr(r.status);
    else {
      const j = await r.json(); ghSha = j.sha;
      const o = JSON.parse(b64d(j.content));
      if (o && o.v === 1 && o.rev > S.rev) { adopt(o); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} adopted = true; }
      else if (o && S.rev > o.rev) push = true;
      ghState = 'ok';
    }
  } catch (_) { ghState = 'Offline'; }
  ghBusy = false;
  if (push) await ghPush();
  if (ghHook) ghHook(adopted);
}
async function ghPush() {
  if (!GH || !GH.ok || ghBusy) return;
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
