'use strict';
/* Fokusdex – trenere, ligaen, Battle Frontier, demoen og belønninger. Reglene for selve kampen ligger i battle.js, skjermene i bui.js.

   To moduser, begge åpnes med «Done for today» og står åpne til neste økt starter:
   - Ligaen: ditt eget lag mot trenere på ditt nivå, uten ende. To trenere og så en boss, gjennom de ni klassene. Gir XP, Rare Candy og
     en egen belønning per klasse. Et tap stenger ligaen for dagen, og du beholder plassen.
   - Battle Frontier: du leier 4 av 7 tilfeldige Pokémon, alt er på nivå 50, og du kan bytte til deg én fra hver trener du slår.
     Seks trenere og så en boss. Gir gjenstander og møter.
   Hver dag har én av modusene en bonus, så det lønner seg å veksle. */

/* De ni klassene, i stigende vanskelighetsgrad (nøklene er de samme som musikkmappene i ressurspakken):
   1 Trainer · 2 Gym Leader · 3 Evil Team · 4 Evil Admin · 5 Elite Four · 6 Rival · 7 Evil Leader · 8 Champion · 9 Supreme Boss.
   Klasse 7–9 er de sjeldne toppbossene: de får gullramme, egen intro og mest effekter.
   mons = antall Pokémon, rel = nivå i forhold til de tre sterkeste på laget ditt, sk = hvor godt de spiller, iv/ev = hvor godt oppdrettet laget er,
   q = hvor gjennomtenkte angrepene er, coin = mynter (× studiebonus), xp = XP-faktor, slack = hvor tidlig de får utvikle.
   Nivået stiger bare litt fra klasse til klasse. Det som gjør de høye klassene vanskelige, er fulle lag, bedre oppdrett, bedre angrep og smartere spill.
   De sjeldneste får også utvikle laget tidligst (slack), så de er farlige selv på lave nivåer: klasse 9 stiller nesten alltid med ferdig utviklede Pokémon.
   Tallene er stilt inn med simulerte kamper (et jevnt lag på samme nivå, uten EV og uten veske). */
const TCL = {
  trainer: { i: 1, n: 'Trainer', mons: 3, rel: 0.93, sk: 0.5, iv: 6, ev: 0, q: 0, coin: 60, xp: 1 },
  gym: { i: 2, n: 'Gym Leader', mons: 4, rel: 0.97, sk: 0.84, iv: 18, ev: 24, q: 2, coin: 250, xp: 1.3, slack: 5 },
  evilteam: { i: 3, n: 'Evil Team', mons: 5, rel: 0.97, sk: 0.85, iv: 18, ev: 24, q: 2, coin: 220, xp: 1.35 },
  eviladmin: { i: 4, n: 'Evil Admin', mons: 5, rel: 0.975, sk: 0.87, iv: 17, ev: 20, q: 2, coin: 330, xp: 1.4, slack: 6 },
  e4: { i: 5, n: 'Elite Four', mons: 5, rel: 0.98, sk: 0.9, iv: 21, ev: 28, q: 2, coin: 420, xp: 1.5, slack: 8 },
  rival: { i: 6, n: 'Rival', mons: 6, rel: 0.985, sk: 0.93, iv: 19, ev: 22, q: 2, coin: 500, xp: 1.6, slack: 8 },
  evilboss: { i: 7, n: 'Evil Leader', mons: 6, rel: 0.99, sk: 0.96, iv: 20, ev: 28, q: 2, coin: 750, xp: 1.75, slack: 12 },
  champ: { i: 8, n: 'Champion', mons: 6, rel: 1, sk: 1, iv: 28, ev: 56, q: 2, coin: 1100, xp: 1.9, slack: 16 },
  supreme: { i: 9, n: 'Supreme Boss', mons: 6, rel: 1.01, sk: 1, iv: 31, ev: 60, q: 2, coin: 2000, xp: 2.2, slack: 30 }
};
/* Vanskelighetsgrad (S.diff): 0 Easy, 1 Normal, 2 Hard. Tallene i klassetabellen over er Hard, slik spillet var før valget kom.
   På lavere grad stiller motstanderne svakere: lavere nivå (rel), dummere spill (sk), dårligere oppdrett (iv, ev), enklere angrep (q), færre Pokémon (mons)
   og senere utvikling (slack) – og du får flere gjenstander i veska (bag). Belønningen følger graden (coin, xp), så det lønner seg å gå opp når laget tåler det.
   rlv/rhp = nivå og HP for de legendariske i raid. */
const DIFF = [
  { n: 'Easy', rel: -0.1, sk: 0.6, iv: 0.4, ev: 0, q: 1, mons: -1, slack: 0.5, coin: 0.5, xp: 0.9, bag: 5, rlv: 0.85, rhp: 0.7 },
  { n: 'Normal', rel: -0.05, sk: 0.85, iv: 0.75, ev: 0.5, q: 2, mons: 0, slack: 0.8, coin: 1, xp: 1, bag: 4, rlv: 0.93, rhp: 0.85 },
  { n: 'Hard', rel: 0, sk: 1, iv: 1, ev: 1, q: 2, mons: 0, slack: 1, coin: 1.6, xp: 1.15, bag: 3, rlv: 1, rhp: 1 }
];
const diff = () => DIFF[S.diff == null ? 2 : S.diff] || DIFF[2];
const diffSt = st => { const d = diff(); return d.rel === 0 ? st : Object.assign({}, st, { mons: Math.max(st.i >= 2 ? 3 : 2, st.mons + d.mons), rel: st.rel + d.rel, sk: st.sk * d.sk, iv: Math.round(st.iv * d.iv), ev: Math.round(st.ev * d.ev), q: Math.min(st.q, d.q), slack: Math.round((st.slack || 0) * d.slack) }); };
const ORDER = ['trainer', 'gym', 'evilteam', 'eviladmin', 'e4', 'rival', 'evilboss', 'champ', 'supreme'];
const ULTRA = new Set(['evilboss', 'champ', 'supreme']);
const clsI = k => (TCL[k] || TCL.trainer).i;
/* Vanlige trenere: [navn, bilde, typer de helst bruker, arena]. Nesten halve laget hentes utenfor temaet, så lagene ikke blir ensformige. */
const TCLASS = [['Youngster', 'youngster', [0, 2, 6], 'field'], ['Lass', 'lass', [0, 17, 11], 'field'], ['Bug Catcher', 'bugcatcher|bugcatcher-gen4dp', [6, 11, 3], 'forest'], ['Hiker', 'hiker', [5, 4, 1], 'cave'],
  ['Swimmer', 'swimmer|swimmerm|swimmer-gen4', [10, 14], 'beach'], ['Bird Keeper', 'birdkeeper', [2, 0], 'field'], ['Black Belt', 'blackbelt', [1, 5], 'dojo'], ['Psychic', 'psychic', [13, 7], 'night'], ['Fisherman', 'fisherman', [10, 4], 'beach'],
  ['Scientist', 'scientist', [12, 8, 3], 'lab']];
const TACE = [['Ace Trainer', 'acetrainer', [], 'field'], ['Ace Trainer', 'acetrainerf', [], 'field'], ['Veteran', 'veteran', [], 'cave'], ['Veteran', 'veteranf', [], 'field'],
  ['Pokémon Ranger', 'pokemonranger', [11, 10, 2], 'forest'], ['Dragon Tamer', 'dragontamer', [15, 9, 2], 'cave'], ['Battle Girl', 'battlegirl', [1, 5, 8], 'dojo']];
/* Bossene: [navn, bilde, tittel, type (farge), lag med esset først, hvilken låt i pakken som hører til (søk i låttittelen)]. Til og med generasjon 5. */
const gymL = (m, l) => l.map(x => [x[0], x[1], 'Gym Leader', x[2], x[3], m]);
const POOL = {
  trainer: TCLASS.concat(TACE),
  gym: gymL('Kanto', [['Brock', 'brock', 5, [95, 76, 141, 139, 112, 142]], ['Misty', 'misty', 10, [121, 55, 119, 134, 131, 130]], ['Lt. Surge', 'ltsurge', 12, [26, 101, 82, 125, 135, 181]], ['Erika', 'erika', 11, [45, 114, 71, 182, 103, 189]],
      ['Koga', 'koga', 3, [110, 89, 49, 168, 73, 169]], ['Sabrina', 'sabrina', 13, [65, 122, 97, 124, 80, 196]], ['Blaine', 'blaine', 9, [59, 78, 126, 38, 219, 136]]])
    .concat(gymL('Johto', [['Falkner', 'falkner', 2, [18, 164, 22, 85, 227, 169]], ['Bugsy', 'bugsy', 6, [212, 214, 127, 469, 168, 205]], ['Whitney', 'whitney', 0, [241, 36, 40, 162, 203, 115]], ['Morty', 'morty', 7, [94, 429, 426, 354, 477, 200]],
      ['Chuck', 'chuck', 1, [62, 57, 107, 68, 308, 286]], ['Jasmine', 'jasmine', 8, [208, 82, 227, 437, 306, 462]], ['Pryce', 'pryce', 14, [473, 87, 221, 131, 362, 91]], ['Clair', 'clair', 15, [230, 148, 334, 130, 142, 149]]]))
    .concat(gymL('Hoenn|Omega', [['Roxanne', 'roxanne', 5, [476, 76, 142, 139, 141, 208]], ['Brawly', 'brawly', 1, [297, 68, 308, 286, 237, 448]], ['Wattson', 'wattson', 12, [310, 82, 101, 181, 135, 466]], ['Flannery', 'flannery', 9, [324, 323, 219, 78, 38, 229]],
      ['Norman', 'norman', 0, [289, 335, 264, 327, 128, 115]], ['Winona', 'winona', 2, [334, 227, 279, 277, 357, 169]], ['Tate & Liza', 'tateandliza|tate', 13, [338, 337, 344, 178, 282, 376]], ['Juan', 'juan', 10, [230, 370, 340, 365, 342, 350]]]))
    .concat(gymL('Sinnoh', [['Roark', 'roark', 5, [409, 95, 76, 185, 142, 348]], ['Gardenia', 'gardenia', 11, [407, 421, 389, 465, 357, 189]], ['Maylene', 'maylene', 1, [448, 308, 68, 107, 106, 214]], ['Crasher Wake', 'crasherwake', 10, [419, 130, 195, 272, 319, 367]],
      ['Fantina', 'fantina', 7, [429, 426, 94, 354, 442, 477]], ['Byron', 'byron', 8, [411, 208, 437, 462, 227, 306]], ['Candice', 'candice', 14, [478, 460, 461, 473, 124, 362]], ['Volkner', 'volkner', 12, [405, 466, 26, 135, 181, 462]]]))
    .concat(gymL('B2 W2 Gym', [['Cilan', 'cilan', 11, [512, 591, 549, 556, 598, 465]], ['Chili', 'chili', 9, [514, 555, 609, 631, 59, 467]], ['Cress', 'cress', 10, [516, 537, 565, 594, 581, 593]], ['Lenora', 'lenora', 0, [505, 508, 531, 573, 626, 115]],
      ['Burgh', 'burgh', 6, [542, 545, 558, 589, 617, 212]], ['Elesa', 'elesa', 12, [523, 587, 596, 604, 181, 310]], ['Clay', 'clay', 4, [530, 553, 537, 623, 450, 232]], ['Skyla', 'skyla', 2, [581, 521, 528, 561, 567, 630]],
      ['Brycen', 'brycen', 14, [614, 615, 584, 461, 473, 362]], ['Drayden', 'drayden', 15, [612, 621, 611, 334, 373, 149]], ['Roxie', 'roxie', 3, [545, 569, 110, 169, 452, 544]], ['Marlon', 'marlon', 10, [565, 593, 594, 537, 130, 73]]])),
  /* Evil Team: fotfolket. Lagene trekkes innenfor typene deres (femte felt er typene, ikke et fast lag). */
  evilteam: [['Grunt', 'rocketgrunt', 'Team Rocket', 3, [3, 16, 0], 'Rocket'], ['Grunt', 'aquagrunt', 'Team Aqua', 10, [10, 16, 3], 'Aqua'], ['Grunt', 'magmagrunt', 'Team Magma', 9, [9, 4, 16], 'Aqua'],
    ['Grunt', 'galacticgrunt', 'Team Galactic', 16, [3, 16, 6], 'Galactic'], ['Grunt', 'plasmagrunt', 'Team Plasma', 16, [16, 3, 0], 'White - Team Plasma'], ['Grunt', 'plasmagrunt-gen5bw2|plasmagrunt', 'Neo Team Plasma', 14, [16, 14, 3], 'Neo']],
  eviladmin: [['Archer', 'archer', 'Rocket Executive', 9, [229, 110, 169, 24, 20, 215], 'Rocket'], ['Ariana', 'ariana', 'Rocket Executive', 3, [24, 45, 430, 110, 73, 169], 'Rocket'], ['Petrel', 'petrel', 'Rocket Executive', 3, [110, 20, 169, 89, 101, 49], 'Rocket'], ['Proton', 'proton', 'Rocket Executive', 3, [169, 110, 20, 24, 89, 229], 'Rocket'],
    ['Mars', 'mars', 'Galactic Commander', 0, [432, 437, 169, 430, 229, 461], 'Galactic Commander'], ['Jupiter', 'jupiter', 'Galactic Commander', 3, [435, 437, 169, 452, 407, 430], 'Galactic Commander'], ['Saturn', 'saturn', 'Galactic Commander', 3, [454, 437, 169, 65, 472, 474], 'Galactic Commander'],
    ['Shelly', 'shelly|shelly-gen3', 'Aqua Admin', 10, [319, 262, 73, 342, 130, 272], 'Aqua'], ['Matt', 'matt|matt-gen3', 'Aqua Admin', 10, [319, 89, 169, 262, 342, 68], 'Aqua'], ['Tabitha', 'tabitha|tabitha-gen3', 'Magma Admin', 9, [323, 262, 110, 169, 219, 229], 'Aqua'], ['Courtney', 'courtney|courtney-gen3', 'Magma Admin', 9, [323, 262, 38, 169, 324, 229], 'Aqua'],
    ['Zinzolin', 'zinzolin', 'Plasma Sage', 14, [615, 461, 584, 614, 478, 473], 'Neo'], ['Shadow Triad', 'shadowtriad', 'Team Plasma', 16, [625, 359, 354, 617, 461, 430], 'Neo']],
  e4: [['Lorelei', 'lorelei-gen3|lorelei|lorelei-lgpe', 'Elite Four', 14, [131, 87, 91, 124, 80, 473], 'FireRed'], ['Bruno', 'bruno', 'Elite Four', 1, [68, 106, 107, 95, 237, 448], 'FireRed'], ['Agatha', 'agatha-gen3|agatha|agatha-lgpe', 'Elite Four', 7, [94, 93, 169, 24, 429, 42], 'FireRed'],
    ['Will', 'will', 'Elite Four', 13, [178, 103, 124, 80, 196, 282], 'HeartGold'], ['Karen', 'karen', 'Elite Four', 16, [197, 229, 94, 45, 461, 430], 'HeartGold'], ['Sidney', 'sidney', 'Elite Four', 16, [359, 262, 275, 332, 342, 319], 'Sapphire - Elite'], ['Phoebe', 'phoebe', 'Elite Four', 7, [477, 354, 302, 429, 94, 442], 'Sapphire - Elite'],
    ['Glacia', 'glacia', 'Elite Four', 14, [365, 362, 478, 91, 131, 473], 'Sapphire - Elite'], ['Drake', 'drake', 'Elite Four', 15, [373, 334, 330, 230, 149, 635], 'Sapphire - Elite'], ['Aaron', 'aaron', 'Elite Four', 6, [452, 469, 416, 214, 212, 402], 'Diamond'], ['Bertha', 'bertha', 'Elite Four', 4, [450, 340, 76, 472, 464, 195], 'Diamond'],
    ['Flint', 'flint', 'Elite Four', 9, [392, 467, 78, 229, 136, 59], 'Diamond'], ['Lucian', 'lucian', 'Elite Four', 13, [437, 65, 122, 196, 203, 308], 'Diamond'], ['Shauntal', 'shauntal', 'Elite Four', 7, [609, 623, 563, 593, 426, 354], 'Black'], ['Grimsley', 'grimsley', 'Elite Four', 16, [625, 560, 510, 553, 461, 430], 'Black'],
    ['Caitlin', 'caitlin', 'Elite Four', 13, [579, 576, 518, 561, 475, 376], 'Black'], ['Marshal', 'marshal', 'Elite Four', 1, [534, 620, 538, 539, 448, 68], 'Black']],
  rival: [['Blue', 'blue', 'Rival', 0, [18, 65, 112, 130, 59, 103], 'Rival Blue>>FireRed'], ['Silver', 'silver', 'Rival', 16, [160, 215, 169, 82, 94, 65], 'HeartGold'], ['Barry', 'barry', 'Rival', 10, [395, 398, 214, 78, 407, 143], 'Brilliant'], ['Wally', 'wally|wally-rse', 'Rival', 13, [282, 334, 301, 315, 82, 475], 'Wally'],
    ['Hugh', 'hugh', 'Rival', 9, [500, 521, 512, 626, 330, 604], 'Rival \\(B2'], ['Cheren', 'cheren', 'Rival', 0, [508, 521, 510, 512, 573, 628], 'White - Rival'], ['Bianca', 'bianca', 'Rival', 13, [518, 508, 516, 609, 591, 500], 'White - Rival'], ['N', 'n', 'Rival', 16, [571, 565, 567, 584, 601, 530], 'B2 W2 - N']],
  evilboss: [['Giovanni', 'giovanni', 'Team Rocket Boss', 4, [34, 31, 464, 53, 115, 51], 'Rocket', { sc: 'building' }], ['Cyrus', 'cyrus', 'Team Galactic Boss', 16, [461, 430, 169, 130, 229, 462], 'Galactic Boss', { sc: 'mountain' }], ['Archie', 'archie-gen3|archie', 'Team Aqua Leader', 10, [319, 262, 169, 89, 342, 321], 'Leader', { sc: 'water' }],
    ['Maxie', 'maxie-gen3|maxie', 'Team Magma Leader', 4, [323, 262, 169, 110, 324, 229], 'Leader', { sc: 'mountain' }], ['Ghetsis', 'ghetsis', 'Team Plasma Leader', 16, [635, 563, 537, 626, 604, 625], 'Ghetsis', { sc: 'kyurem_cave' }], ['N', 'n', 'King of Team Plasma', 15, [644, 571, 567, 565, 584, 601], 'N Final', { sc: 'black_tower_10' }]],
  champ: [['Blue', 'blue', 'Champion', 0, [65, 18, 112, 130, 59, 103], 'Champion Blue', { sc: 'pwt', th: 'spark', cc: '#5aa2ff' }], ['Lance', 'lance', 'Champion', 15, [149, 130, 142, 6, 230, 373], 'Lance', { sc: 'black_tower_10', th: 'flame', cc: '#ff7a2a' }], ['Zinnia', 'zinnia', 'Lorekeeper', 15, [373, 334, 330, 612, 149, 230], 'Zinnia', { sc: 'kyurem_cave', th: 'meteor', cc: '#a98bff' }],
    ['Steven', 'steven', 'Champion', 8, [376, 227, 306, 344, 346, 348], 'Steven & Wallace', { sc: 'cave', th: 'shard', cc: '#9fc7d8' }], ['Wallace', 'wallace', 'Champion', 10, [350, 130, 73, 272, 340, 321], 'Steven & Wallace', { sc: 'water', th: 'bubble', cc: '#3fd0c4' }], ['Alder', 'alder', 'Champion', 6, [637, 626, 621, 617, 589, 584], 'Alder', { sc: 'pinwheel_road', th: 'petal', cc: '#ff9a4a' }]],
  supreme: [['Red', 'red', 'Legend', 9, [6, 25, 3, 9, 143, 131], 'Red & Blue|Champion & Red', { sc: 'snowy_tall_grass' }], ['Blue', 'blue', 'Legend', 9, [59, 65, 68, 142, 130, 103], 'Red & Blue', { sc: 'pwt' }], ['Cynthia', 'cynthia', 'Sinnoh Champion', 15, [445, 442, 448, 350, 407, 468], 'Cynthia', { sc: 'black_tower_10' }],
    ['Iris', 'iris', 'Unova Champion', 15, [612, 635, 621, 567, 306, 131], 'Iris', { sc: 'black_tower_3_5' }], ['Steven', 'steven', 'Hoenn Champion', 8, [376, 373, 306, 344, 346, 348], 'Champion Steven', { sc: 'cave' }], ['Colress', 'colress', 'Team Plasma', 8, [462, 601, 376, 606, 604, 474], 'Colress', { sc: 'black_tower_1_2' }]]
};
/* Frontier Brains: de vanlige bossene i Battle Frontier. [navn, bilde, tittel, type, lag med esset først, låt]. */
const BRAIN = [['Noland', 'noland-gen3|noland', 'Factory Head', 8, [376, 130, 94, 248], 'Sapphire - Frontier'], ['Greta', 'greta-gen3|greta', 'Arena Tycoon', 1, [197, 214, 94, 286], 'Sapphire - Frontier'], ['Tucker', 'tucker-gen3|tucker', 'Dome Ace', 15, [373, 260, 6, 376], 'Sapphire - Frontier'],
  ['Lucy', 'lucy-gen3|lucy', 'Pike Queen', 3, [350, 336, 208, 130], 'Sapphire - Frontier'], ['Spenser', 'spenser-gen3|spenser', 'Palace Maven', 0, [289, 59, 131, 169], 'Sapphire - Frontier'], ['Brandon', 'brandon-gen3|brandon', 'Pyramid King', 5, [379, 377, 378, 142], 'Sapphire - Frontier'],
  ['Anabel', 'anabel-gen3|anabel', 'Salon Maiden', 13, [243, 65, 143, 196], 'Sapphire - Frontier'], ['Palmer', 'palmer', 'Tower Tycoon', 15, [149, 464, 350, 59], 'Platinum - Frontier|SoulSilver - Frontier'], ['Thorton', 'thorton', 'Factory Head', 8, [462, 437, 474, 448], 'Platinum - Frontier|SoulSilver - Frontier'],
  ['Dahlia', 'dahlia', 'Arcade Star', 9, [468, 477, 272, 257], 'Platinum - Frontier|SoulSilver - Frontier'], ['Darach', 'darach', 'Castle Valet', 1, [475, 395, 398, 229], 'Platinum - Frontier|SoulSilver - Frontier'], ['Argenta', 'argenta', 'Hall Matron', 0, [143, 248, 94, 130], 'Platinum - Frontier|SoulSilver - Frontier']];
POOL.brain = BRAIN;
TCL.brain = { i: 5, n: 'Frontier Brain', mons: 4, rel: 1, sk: 1, iv: 22, ev: 24, q: 2, coin: 0, xp: 0, slack: 99 };

/* Ligaen: uendelig, i runder på 12 kamper: en vanlig trener og så en boss, seks ganger. Bossene kommer i klasserekkefølge (2 til 6), og hver
   runde avsluttes med en sjelden boss (klasse 7, 8 eller 9, de sterkeste sjeldnest). Så starter en ny runde med høyere nivå, større lag og bedre belønninger. */
const BOSSEQ = ['gym', 'evilteam', 'eviladmin', 'e4', 'rival', 'ultra'], LAPN = BOSSEQ.length * 2;
/* Hvilken toppboss som dukker opp: oftest en leder (klasse 7), sjeldnere en mester (8), og sjeldnest de aller største (9: fra 10 % og opp til 25 % etter mange runder). */
const pickUltra = lap => { const r = Math.random(), s = Math.min(0.25, 0.1 + 0.03 * (lap || 0)), c = Math.min(0.35, 0.3 + 0.01 * (lap || 0)); return r < s ? 'supreme' : r < s + c ? 'champ' : 'evilboss'; };
/* Hvor i ligaen kamp nummer n (0-basert i runden) ligger: klassen, om det er en boss, og laveste nivå uansett hvor lavt laget ditt er. */
function rungInfo(n, lap) {
  const rd = Math.min(BOSSEQ.length - 1, Math.floor(n / 2)), boss = n % 2 === 1, k = boss ? BOSSEQ[rd] : 'trainer';
  return { n, rd, boss, k, floor: Math.round(5 + n * 1.5 + (boss ? 1 : 0) + 6 * (lap || 0)) };
}
/* Vanlige trenere blir bedre utover i runden: flere Pokémon, smartere spill og bedre lag. */
const trainerCls = rd => Object.assign({}, TCL.trainer, { mons: rd >= 2 ? 4 : 3, rel: 0.93 + 0.008 * rd, sk: 0.5 + 0.05 * rd, iv: 6 + 2 * rd, q: rd >= 1 ? 1 : 0, coin: 60 + 12 * rd, xp: 1 + 0.04 * rd });
/* Lagene vokser med rundene (høyst seks). */
const teamSize = (st, lap) => Math.min(6, st.mons + (lap >= 3 ? 2 : lap >= 1 ? 1 : 0));

/* Belønninger følger fokustiden den dagen kampene ble åpnet, målt mot dagsmålet ditt (S.cap, det samme som taket før laget blir slitent):
   ×0,5 uten studering og full uttelling når målet er nådd. Et høyere mål gir en høyere topp (4 t: ×2,0 · 6 t: ×2,5 · 8 t: ×3,0), så det lønner seg
   å sette målet der du faktisk vil ligge – men bare hvis du når det. XP svinger mindre. Kampene er hovedkilden til mynter, så dette er
   den viktigste premien for å studere: samme seier betaler fem ganger så mye på en dag der målet er nådd som på en dag uten studering. */
const ladMin = () => S.lad.day ? ((S.log[S.lad.day] || {}).m || 0) : todayMin();
const goalMin = () => Math.max(60, S.cap || 360);
const topFor = c => Math.round((1 + Math.max(60, c) / 240) * 10) / 10;
const goalTop = () => topFor(goalMin());
const goalPart = () => Math.min(1, ladMin() / goalMin());
const studyMult = () => Math.round((0.5 + goalPart() * (goalTop() - 0.5)) * 10) / 10;
const xpMult = () => 0.8 + goalPart() * 0.4;
/* Dagens første seier gir doble mynter (S.lad.fw = dagen den er brukt). */
const firstWin = () => S.lad.fw !== (S.lad.day || dayKey());
const ladLost = () => !!S.lad.lost && S.lad.lost === (S.lad.day || dayKey());
/* Forsøk per dag: ligaen stenger ved første tap (LIVES), Frontier tåler to løp (FACLIVES), turneringen er én cup og raidet ett forsøk.
   En boss du ikke slår, er altså et prosjekt til neste dag: tren laget, bytt på det og prøv igjen. */
/* Veska: så mange gjenstander kan brukes per kamp. Ellers kunne nok Revive vinne enhver kamp. */
const BAGN = 3, bagN = () => diff().bag;
const LIVES = 1, ladFails = () => { const t = S.lad.tries, d = S.lad.day || dayKey(); return t && t.d === d ? t.n : 0; };
const FACLIVES = 2, facFails = () => { const t = S.fac.tries, d = S.lad.day || dayKey(); return t && t.d === d ? t.n : 0; };
const ladderOpen = () => !!S.lad.day && !ladLost();
const facLost = () => !!S.fac.lost && S.fac.lost === (S.lad.day || dayKey());
const facOpen = () => !!S.lad.day && !facLost();
/* Dagens bonus: datoen avgjør hvilken modus som gir ekstra, likt for alle som spiller. */
function dayBoost() {
  const d = S.lad.day || dayKey(); let h = 7;
  for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
  return { mode: (h >>> 3) % 2 ? 'league' : 'factory', m: 1.5, xp: 1.3 };
}

/* ---------- Lagbygging ---------- */
/* Går ned til en tidligere form hvis nivået er for lavt for arten (slack = hvor mye for tidlig bosser får utvikle). */
function fitForm(id, lv, slack) { while (stageOf(id) > 0 && lv < reqLv(id) - slack && !(D(D(id)[4])[6] & 4)) id = D(id)[4]; return id; }
/* Angrepene til en motstander. q = 0: de fire nyeste. q = 1: beste angrep per type pluss ett nyttig statusangrep. q = 2: som 1, og kan angrep fra litt høyere nivå. */
function foeMoves(id, lv, q) {
  const all = movesAt(id, lv + (q >= 2 ? 8 : 0)).filter(x => !DEADMV.has(x));
  if (!q || all.length <= 4) return defaultMoves(id, lv);
  const d = D(id), st = BST[id - 1], phys = st[1] >= st[3];
  const val = x => {
    const m = MOVES[x]; let p = (m[2] || (FIXED[m[0]] ? 45 : 60)) * (m[3] ? m[3] / 100 : 1) * (m[13] ? 3 : 1);
    if (CHARGE[m[0]] || RECHARGE.has(m[0])) p *= 0.55;
    if (BOOM.has(m[0]) || ['Dream Eater', 'Focus Punch', 'Last Resort', 'Fake Out', 'Snore', 'Synchronoise', 'Final Gambit', 'Counter', 'Mirror Coat', 'Metal Burst', 'Endeavor'].includes(m[0])) p *= 0.3;
    if (m[9] < 0) p *= 0.9; if (m[6] === 9) p = 30;
    return p * (((m[4] === 1) === phys) ? 1 : 0.7) * (m[1] === d[1] || m[1] === d[2] ? 1.5 : 1);
  };
  const sval = x => {
    const m = MOVES[x], n = m[0];
    if (m[6] === 1) return m[7] === 2 ? 9 : m[7] === 1 || m[7] === 4 || n === 'Toxic' || m[7] === 18 ? 7 : m[7] === 5 || m[7] === 6 || m[7] === 14 ? 5 : 2;
    if (m[6] === 3 || n === 'Rest') return 6;
    if (m[12].length && m[17] === 1) return m[12].reduce((a, s) => a + Math.max(0, s[1]), 0) >= 2 ? 7 : 4;
    if (['Reflect', 'Light Screen', 'Stealth Rock', 'Substitute', 'Protect', 'Rain Dance', 'Sunny Day', 'Sandstorm', 'Hail', 'Taunt', 'Roar', 'Whirlwind'].includes(n)) return 5;
    return m[12].length ? 2 : UM[n] ? 2 : 0;
  };
  const dmg = all.filter(x => MOVES[x][4] > 0).sort((a, b) => val(b) - val(a)), stat = all.filter(x => MOVES[x][4] === 0).sort((a, b) => sval(b) - sval(a)), pick = [], tys = new Set();
  for (const x of dmg) { if (pick.length >= 3) break; if (tys.has(MOVES[x][1])) continue; pick.push(x); tys.add(MOVES[x][1]); }
  if (stat.length && sval(stat[0]) >= 4) pick.push(stat[0]);
  for (const x of dmg) { if (pick.length >= 4) break; if (!pick.includes(x)) pick.push(x); }
  for (const x of stat) { if (pick.length >= 4) break; if (!pick.includes(x)) pick.push(x); }
  return pick.slice(0, 4);
}
function foeMon(id, lv, st) {
  return { id, lv, sh: 0, g: rollG(id), iv: Array.from({ length: 6 }, () => Math.min(31, st.iv + rnd(32 - st.iv))), ev: Array.from({ length: 6 }, () => st.ev), nat: rnd(25), mv: foeMoves(id, lv, st.q) };
}
/* Nivået ligaen måler seg mot: snittet av de tre sterkeste på laget ditt. */
function leagueLv() { const p = S.party.map(monBy).filter(Boolean).map(m => m.lv).sort((a, b) => b - a).slice(0, 3); return p.length ? p.reduce((a, b) => a + b, 0) / p.length : 5; }
/* Nivået til treneren som venter: lagets nivå ganger klassens forhold, litt høyere for hver runde du har klart, og aldri under stigens laveste nivå. */
function rungLv(ri, lap, st) { return Math.min(100, Math.max(ri.floor, Math.round(leagueLv() * (st.rel + Math.min(0.09, 0.015 * lap))))); }
/* Lag satt sammen på måfå: n forskjellige arter (til og med generasjon 5) med ulike hovedtyper der det går, utviklet så langt nivået tillater. theme = typene treneren helst bruker, flat = alle på samme nivå. */
function regTeam(theme, n, base, st, flat) {
  const out = [], used = new Set(), tys = new Set();
  for (let k = 0; k < n; k++) {
    const any = !theme.length || (k > 0 && Math.random() < 0.45);
    let p = [];
    for (let id = 1; id <= 649; id++) { const d = D(id); if (isLeg(id) || stageOf(id) || (d[6] & 4) || used.has(id)) continue; if (!any && !theme.includes(d[1]) && !theme.includes(d[2])) continue; p.push(id); }
    const fresh = p.filter(id => !tys.has(D(id)[1])); if (fresh.length) p = fresh;
    let id = p[rnd(p.length)]; used.add(id);
    const lv = flat ? base : Math.max(2, base - (k < n - 1 ? 1 + rnd(2) : 0));
    for (let nx = EVO[id]; nx && nx.length; nx = EVO[id]) { const to = nx[rnd(nx.length)]; if (lv < reqLv(to) + (st.q ? 0 : 2)) break; id = to; }
    tys.add(D(id)[1]);
    out.push(foeMon(id, lv, st));
  }
  return out;
}
/* Boss: de n − 1 første fra laget, og esset til slutt på høyeste nivå. flat = alle på samme nivå (Battle Frontier). */
function bossTeam(d, n, base, st, flat) {
  const ids = d[4].slice(1, n).concat(d[4][0]);
  return ids.map((id, k) => { const ace = k === ids.length - 1, lv = flat ? base : Math.max(3, Math.min(100, base + (ace ? 1 : -1 - rnd(2)))); return foeMon(fitForm(id, lv, st.slack || 0), lv, st); });
}
/* Det en kamp trenger å vite om treneren. k = klassen, i = hvem i klassen. int = hvor mye show kampen får (0 til 8, følger klassen).
   ultra = de sjeldne (klasse 7 til 9), gold = bare klasse 9. sc/th/cc = egen bane, eget tema og egen farge (mesterne har hver sin). */
function trainerOf(k, i, x) {
  const d = POOL[k][i], c = TCL[k], boss = k !== 'trainer';
  const e = (boss && d[6]) || {};
  return Object.assign({ n: d[0], img: d[1], title: boss ? d[2] : '', ty: boss ? d[3] : (d[2][0] == null ? 0 : d[2][0]), kind: k, ci: c.i, cn: c.n, skill: c.sk, boss, ultra: ULTRA.has(k), gold: k === 'supreme', int: c.i - 1,
    sc: e.sc || '', th: k === 'evilboss' ? 'evil' : e.th || '', cc: e.cc || '',
    arena: boss ? 'hall' : d[3], v: i % 3, mre: boss ? d[5] || '' : '' }, x || {});
}
const foeTeam = (k, d, n, base, st, flat) => k === 'trainer' ? regTeam(d[2], n, base, st) : k === 'evilteam' ? regTeam(d[4], n, base, st) : bossTeam(d, n, base, st, flat);

/* ---------- Ligaen ---------- */
/* Hvem som venter. Lagres, så den samme treneren står der når du kommer tilbake (toppbossene drar videre hvis du taper).
   Ingen møtes to ganger i samme runde. En sjelden gang står en toppboss der en vanlig boss skulle stått. */
function nextTrainer() {
  const L = S.lad, day = L.day || dayKey(), old = L.next && L.next.n === L.n && L.next.lap === L.lap && POOL[L.next.k] && POOL[L.next.k][L.next.i] ? L.next : null;
  /* Den som slo deg, står der resten av dagen (omkampen). Neste dag venter en annen fra samme klasse, så du ikke blir stående fast mot ett lag. */
  if (old && !(old.fail && old.fail !== day)) return old;
  const ri = rungInfo(L.n, L.lap);
  let k = ri.k, sup = 0;
  if (old && !ULTRA.has(old.k)) k = old.k;
  else if (k === 'ultra') k = pickUltra(L.lap);
  else if (ri.boss && ri.rd >= 1 && Math.random() < 0.06) { k = pickUltra(L.lap); sup = 1; }
  const pool = POOL[k], all = pool.map((_, i) => i);
  let c = all.filter(i => !(L.seen || []).includes(k + i) && !(old && old.k === k && old.i === i));
  if (!c.length) c = all.filter(i => !(old && old.k === k && old.i === i));
  if (!c.length) c = all;
  L.next = { n: L.n, lap: L.lap, k, i: c[rnd(c.length)], sup };
  return L.next;
}
const trainerInfo = t => trainerOf(t.k, t.i);
/* Klassen, nivået og antallet for treneren som venter (brukes også på oppstillingen før kampen). */
function leaguePlan(t) {
  const ri = rungInfo(t.n, t.lap), st = diffSt(t.k === 'trainer' ? trainerCls(ri.rd) : TCL[t.k]);
  return { ri, st, lv: rungLv(ri, t.lap, st), n: teamSize(st, t.lap) };
}
/* Myntene en seier gir akkurat nå: klassens sats × vanskelighetsgrad × studiebonus × runde, og dobbelt for dagens første seier. */
function leagueCoins(st, lap) {
  return Math.round(st.coin * diff().coin * studyMult() * (1 + Math.min(1, 0.2 * (lap || 0))) * (firstWin() ? 2 : 1));
}
/* lead = den som skal gå ut først (velges på oppstillingen før kampen). Resten følger rekkefølgen på laget. */
function newBattle(lead) {
  const t = nextTrainer(), p = leaguePlan(t), d = POOL[t.k][t.i], tr = trainerInfo(t);
  tr.skill = p.st.sk;
  const party = S.party.map(monBy).filter(Boolean); party.sort((a, b) => (b.u === lead) - (a.u === lead));
  return mkBattle(party, foeTeam(t.k, d, p.n, p.lv, p.st), tr, { mode: 'league', st: p.st, k: t.k, rd: p.ri.rd, n: t.n, lap: t.lap, ti: t.i, bag: bagN(), xm: xpMult() * diff().xp, sm: studyMult(), dc: diff().coin, boost: dayBoost() });
}
/* XP til hele laget etter kampen. Alle får like mye, uansett hvem som kjempet. Sterkere motstandere og høyere klasse gir mer, og de som ligger
   under motstanderens nivå får mer enn de som ligger over (som i Black og White). Ligaen tar aldri slutt, så andelen er satt slik at en bossseier
   gir godt over et halvt nivå og en vanlig trener rundt en femdel: en kveld med kamper gir laget noen nivåer, ikke ti. */
function battleXp(B) {
  const bm = B.boost.mode === 'league' ? B.boost.xp : 1;
  return B.me.map(b => {
    let x = 0;
    for (const k of B.kos) x += bstSum(k.id) / 8 * k.lv / 7 * Math.max(0.35, Math.min(2.2, Math.pow((2 * k.lv + 10) / (k.lv + b.lv + 10), 2.5)));
    return Math.round(x * 0.18 * B.st.xp * B.xm * bm);
  });
}
function grantXp(B, res) {
  const xs = battleXp(B);
  B.me.forEach((b, i) => {
    const m = b.src, x = xs[i]; if (!x || !m.u) return;
    const l0 = m.lv, x0 = m.xp; m.xp += x; m.lv = lvOf(m.xp);
    res.ups.push(Object.assign({ u: m.u, xp: x, l0, l1: m.lv, x0 }, m.lv > l0 ? learnUp(m, l0) : {}));
  });
}
const pushEnc = (res, e) => { S.pend.push(e); trimPend(30); res.encs.push(e); };
/* De pseudo-legendariske (første form): Dratini, Larvitar, Bagon, Beldum, Gible og Deino. */
const PSEUDO = [147, 246, 371, 374, 443, 633];
const giveCharm = res => { S.charm = (S.charm || 0) + CHARM.n; res.perks.push(`Shiny Charm: ${CHARM.m}× shiny odds in your next ${S.charm} focus sessions.`); };
/* Det de sjeldne bossene gir i tillegg, likt i ligaen og i Battle Frontier. Belønningen følger sjeldenheten:
   klasse 7 gir sjeldne møter og av og til et pseudo-legendarisk, klasse 8 alltid et pseudo-legendarisk, klasse 9 et legendarisk, et pseudo-legendarisk og en Shiny Charm. */
function rareLoot(ci, res, give, ty) {
  const hit = p => Math.random() < p, enc = o => pushEnc(res, genEnc(o));
  if (ci === 7) { give('candy', 3); give('ultra', 2); give('stone', 1); give('maxp', 1); give('revive', 1); enc({ ty, min: 3, luck: 2 }); enc({ min: 3, luck: 2 }); enc({ min: 2, luck: 1.5 }); if (hit(0.35)) enc({ ids: PSEUDO }); }
  if (ci === 8) { give('candy', 4); give('ultra', 3); give('stone', 1); give('maxrev', 1); enc({ ty, min: 3, luck: 2 }); enc({ min: 3, luck: 2 }); enc({ min: 2, luck: 1.5 }); enc({ ids: PSEUDO }); if (hit(0.25)) giveCharm(res); }
  if (ci === 9) { give('candy', 6); give('ultra', 5); give('stone', 2); give('maxrev', 2); enc({ leg: 1 }); enc({ ids: PSEUDO }); enc({ ty, min: 3, luck: 2 }); enc({ min: 3, luck: 2 }); giveCharm(res); }
}
/* Hva hver klasse gir ved seier (i tillegg til mynter og XP). Hver klasse har sin egen type belønning, alle bossene gir møter, og jo sjeldnere bossen er, jo mer. */
function classLoot(B, res, give) {
  const sm = B.sm, ty = [B.tr.ty], hit = p => Math.random() < p, enc = o => pushEnc(res, genEnc(o)), boost = (n, m) => { S.boost = { n, m }; res.perks.push(`Your next ${n} focus sessions give ${m}× coins.`); };
  ({
    trainer: () => { give(B.rd >= 3 ? 'great' : 'poke', 1 + (sm >= 1.5 ? 1 : 0)); if (hit(0.35)) give(B.rd >= 3 ? 'super' : 'potion', 1); if (hit(0.3)) enc({ luck: 1 }); if (hit((B.rd >= 2 ? 0.14 : 0.07) * sm)) give('candy', 1); },
    gym: () => { give('candy', 1 + (hit(0.3 * sm) ? 1 : 0)); give('super', 1); give('great', 2); enc({ ty, min: 2, luck: 1.5 }); },
    evilteam: () => { give('great', 2); if (hit(0.5)) give('ultra', 1); const loot = Math.round(200 * sm * (B.dc || 1)); res.coins += loot; S.coins += loot; res.note = 'Recovered stolen coins.'; enc({ ty, min: 1, luck: 1.2 }); },
    eviladmin: () => { give('ultra', 2); if (hit(0.45)) give('stone', 1); enc({ ty, min: 2, luck: 1.5 }); enc({ min: 1, luck: 1.2 }); },
    e4: () => { give('candy', 1 + (hit(0.5) ? 1 : 0)); give('ultra', 1); give('hyper', 1); enc({ ty, min: 3, luck: 1.5 }); enc({ min: 2, luck: 1.5 }); },
    rival: () => { give('candy', 2); give('revive', 1); if (S.eggs.length < 3) { S.eggs.push({ need: 120, got: 0 }); res.items.push('1 × Egg'); } else enc({ min: 3, luck: 1.5 }); enc({ min: 2, luck: 1.5 }); enc({ min: 2, luck: 1.5 }); },
    evilboss: () => { rareLoot(7, res, give, ty); boost(2, 1.5); },
    champ: () => { rareLoot(8, res, give, ty); boost(3, 1.5); },
    supreme: () => { rareLoot(9, res, give, ty); boost(5, 2); }
  })[B.k]();
}
/* Ligakampen er over: XP til laget (også ved tap), og ved seier mynter, klassens belønning og noen ganger et byttetilbud. */
function finishLeague(B) {
  const win = B.over === 'win', L = S.lad, st = B.st, k = B.k, res = { mode: 'league', win, ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', kind: k, lapDone: false };
  grantXp(B, res);
  if (win) {
    const bm = B.boost.mode === 'league', give = (it, n) => { if (n > 0) { S.items[it] += n; res.items.push(`${n} × ${SHOP[it].n}`); } };
    const fw = firstWin(); res.coins = Math.round(st.coin * (B.dc || 1) * B.sm * (1 + Math.min(1, 0.2 * B.lap)) * (fw ? 2 : 1)) + B.pay; S.coins += res.coins;
    if (fw) { L.fw = L.day || dayKey(); res.perks.push('First win of the day: double coins.'); }
    classLoot(B, res, give);
    if (bm && B.tr.boss && Math.random() < 0.5) give('candy', 1);
    /* Byttetilbud: tilfeldig, ikke hver gang (rivaler tilbyr oftest). Den du får, er på ditt nivå og i den formen nivået tillater. */
    if (B.tr.boss && k !== 'evilteam' && Math.random() < (k === 'rival' ? 0.6 : 0.3)) {
      const cap = refLv();
      res.trade = B.foe.filter(f => !isLeg(f.id)).map(f => { const lv = Math.min(f.lv, cap); return { id: fitForm(f.id, lv, 0), lv, iv: f.src.iv.slice(), nat: f.src.nat, g: f.src.g }; });
      if (!res.trade.length) res.trade = null;
    }
    L.best = (L.best || 0) + 1; (L.seen = L.seen || []).push(k + B.ti); L.next = null;
    if (++L.n >= LAPN) { L.lap++; L.n = 0; L.seen = []; res.lapDone = true; raidSpawn(res); }
  } else {
    const d = L.day || dayKey(), n = ladFails() + 1; L.tries = { d, n }; if (n >= LIVES) L.lost = d; res.left = Math.max(0, LIVES - n);
    /* De sjeldne bossene gir deg bare én sjanse. Taper du mot den som avslutter runden, drar den videre og neste runde begynner uten belønningen.
       Taper du mot en som dukket opp overraskende midt i runden, står den vanlige bossen der neste gang. */
    if (B.tr.ultra) { L.next = null; res.gone = true; if (rungInfo(L.n, L.lap).k === 'ultra') { L.lap++; L.n = 0; L.seen = []; res.lapDone = true; raidSpawn(res); } } else if (L.next) L.next.fail = d;
  }
  save();
  return res;
}
/* Bytte etter en boss: du gir fra deg en fra laget og får en av deres. Sier du nei, får du et møte i stedet. */
function doTrade(x, mine) {
  const i = S.party.indexOf(mine.u);
  S.mons = S.mons.filter(m => m !== mine); S.party = S.party.filter(u => u !== mine.u);
  const m = addMon(x.id, x.lv, 0, 0, x.g); m.iv = x.iv; m.nat = x.nat;
  S.party = S.party.filter(u => u !== m.u); S.party.splice(i < 0 ? S.party.length : i, 0, m.u);
  save();
  return m;
}

/* ---------- Battle Frontier ---------- */
/* Alt i Battle Frontier er på nivå 50, så alle stiller likt. En runde er seks vanlige trenere og en boss. For hver runde blir leie-Pokémonene
   og motstanderne sterkere (høyere samlet styrke), ikke høyere i nivå. Internt heter modusen fortsatt «fac». */
const FACLV = 50, FACN = 7, FACROUND = r => 200 + 100 * Math.min(4, r - 1);
const FACBST = r => [[380, 500], [420, 530], [450, 560], [480, 600]][Math.min(3, r - 1)];
/* d flytter styrken opp eller ned: de første motstanderne i en runde er svakere enn det du leier. */
function facMon(r, used, d) {
  const [a, b] = FACBST(r), pool = [];
  for (let id = 1; id <= 649; id++) { if (isLeg(id) || used.has(id) || (D(id)[6] & 4) || (EVO[id] && EVO[id].length)) continue; const s = bstSum(id); if (s >= a + d && s <= b + d && reqLv(id) <= FACLV + 12) pool.push(id); }
  const id = pool[rnd(pool.length)]; used.add(id);
  return { id, lv: FACLV, sh: 0, iv: Array.from({ length: 6 }, () => Math.max(0, Math.min(31, 4 * r + Math.round(d / 5) + 6 + rnd(14)))), ev: [0, 0, 0, 0, 0, 0], nat: rnd(25), mv: foeMoves(id, FACLV, 1) };
}
/* Leie-Pokémon er alltid fullt utviklet. En sjelden gang (MEGAP) er én av de sju en Mega. Den trekkes blant alle Mega-former som ikke er legendariske,
   og de svakeste kommer klart oftest: Mawile og Beedrill mange ganger så ofte som Garchomp og Salamence. */
const MEGAP = 0.09;
function megaPick(used) {
  const c = MEGA.map((g, k) => k).filter(k => !isLeg(MEGA[k][0]) && MEGA[k][1] !== 'Primal' && !used.has(MEGA[k][0])), w = c.map(k => Math.pow(Math.max(40, 760 - megaBst(k)), 2.2));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; }
  return c[0];
}
function facOffer(r) {
  const used = new Set(), l = Array.from({ length: 7 }, () => facMon(r, used, 0));
  if (Math.random() < MEGAP) { const k = megaPick(used), g = MEGA[k], i = rnd(7); l[i] = { id: g[0], mega: k + 1, lv: FACLV, sh: 0, iv: l[i].iv, ev: [0, 0, 0, 0, 0, 0], nat: rnd(25), mv: foeMoves(g[0], FACLV, 1) }; }
  return l;
}
function facStart() { S.fac.run = { round: 1, w: 0, streak: 0, offer: facOffer(1), open: 0, team: null, foe: null }; save(); }
function facPick(idx) { const R = S.fac.run; R.team = idx.map(i => R.offer[i]); R.offer = null; R.foe = null; save(); }
/* Neste motstander. Den sjuende i hver runde er bossen: oftest en Frontier Brain eller en boss fra klasse 2 til 6,
   og en sjelden gang en toppboss (klasse 7 til 9), som gir mye bedre belønning. Sjansen for toppboss øker med rundene. */
function facFoe() {
  const R = S.fac.run;
  if (R.foe && (R.foe.boss ? POOL[R.foe.k] && POOL[R.foe.k][R.foe.i] : R.foe.ci != null)) return R.foe;
  const boss = R.w === FACN - 1, used = new Set(R.team.map(m => m.id)), cnt = {};
  let f;
  if (boss) {
    const up = dayBoost().mode === 'factory' ? 1.5 : 1, ultra = Math.random() < Math.min(0.6, (0.12 + 0.06 * (R.round - 1)) * up);
    const k = ultra ? pickUltra(R.round - 1) : Math.random() < 0.5 ? 'brain' : ['gym', 'eviladmin', 'e4', 'rival'][rnd(4)], i = rnd(POOL[k].length);
    /* Bossen vokser med rundene: i første runde er laget dårligere oppdrettet og de som utvikler seg sent, står i en tidligere form.
       De sjeldne (u = 1 til 3 for klasse 7 til 9) ligger alltid et hakk eller mer over, så de sjeldneste er vanskeligst også her. */
    const r = Math.min(4, R.round), u = ultra ? TCL[k].i - 6 : 0;
    const st = { iv: Math.min(31, (u ? 10 + 4 * u : k === 'brain' ? 0 : 4) + 6 * r), ev: (u ? 8 + 8 * u : 0) + 8 * (r - 1), q: k === 'brain' && r < 3 ? 1 : 2, slack: u >= 3 ? 99 : [0, 6, 14, 99][Math.min(3, r - 1 + u)] };
    const dd = diff(); st.iv = Math.round(st.iv * dd.iv); st.ev = Math.round(st.ev * dd.ev);
    f = { boss: 1, k, i, sk: Math.min(1, [0.76, 0.86, 0.94, 1][r - 1] - (k === 'brain' ? 0.06 : 0) + 0.06 * u), team: bossTeam(POOL[k][i], 4, FACLV, st, true), hint: POOL[k][i][3] };
  } else {
    const d = [-90, -75, -55, -40, -25, -10][R.w], team = Array.from({ length: 4 }, () => facMon(R.round, used, d));
    team.forEach(m => { const t = D(m.id)[1]; cnt[t] = (cnt[t] || 0) + 1; });
    f = { ci: rnd(POOL.trainer.length), team, hint: +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] };
  }
  R.foe = f; save();
  return f;
}
function facInfo(f) {
  const R = S.fac.run;
  if (f.boss) return trainerOf(f.k, f.i, { skill: (f.sk || 1) * diff().sk, fr: 1, arena: 'hall', int: f.k === 'brain' ? 3 : TCL[f.k].i - 1 });
  return trainerOf('trainer', f.ci, { ty: f.hint, skill: Math.min(0.95, 0.25 + 0.1 * R.round + 0.05 * R.w) * diff().sk, fr: 1, arena: 'factory', v: 0, int: R.w >= 4 ? 1 : 0 });
}
function facBattle() {
  const R = S.fac.run, f = facFoe();
  return mkBattle(R.team, f.team, facInfo(f), { mode: 'fac', round: R.round, w: R.w, k: f.boss ? f.k : 'trainer', sm: studyMult(), dc: diff().coin, boost: dayBoost() });
}
/* Frontier gir gjenstander, møter og mynter, ikke XP (Pokémonene er leid). Et tap avslutter løpet; etter FACLIVES tap er Frontier stengt for dagen.
   En ferdig runde (sju seire) gir en egen myntpremie. */
function finishFactory(B) {
  const R = S.fac.run, win = B.over === 'win', res = { mode: 'fac', win, ups: [], items: [], encs: [], coins: 0, round: R.round, w: R.w, swap: null, roundDone: false, streak: R.streak, perks: [], note: '' };
  if (!win) { const d = S.lad.day || dayKey(), n = facFails() + 1; S.fac.best = Math.max(S.fac.best || 0, R.streak); S.fac.tries = { d, n }; if (n >= FACLIVES) S.fac.lost = d; res.left = Math.max(0, FACLIVES - n); S.fac.run = null; save(); return res; }
  const sm = B.sm, bm = B.boost.mode === 'factory' ? B.boost.m : 1, r = R.round, roll = p => Math.random() < p * bm;
  const give = (it, n) => { if (n > 0) { S.items[it] += n; res.items.push(`${n} × ${SHOP[it].n}`); } };
  R.w++; R.streak++; res.w = R.w; res.streak = R.streak; S.fac.best = Math.max(S.fac.best || 0, R.streak);
  res.coins = Math.round((20 + 8 * R.w + 15 * (r - 1)) * sm * (B.dc || 1)) + B.pay; S.coins += res.coins;
  if (roll(0.4)) give(r >= 3 ? 'ultra' : r >= 2 ? 'great' : 'poke', r >= 2 ? 1 : 2);
  if (R.w === 3) pushEnc(res, genEnc({ min: 1, luck: 1 }));
  if (R.w === 5) { give('great', 2); if (!S.incOn) { S.incOn = 1; res.items.push('Incense for your next session'); } if (roll(0.5)) pushEnc(res, genEnc({ min: 2, luck: 1.2 })); }
  if (R.w >= FACN) {
    pushEnc(res, genEnc({ ty: [B.tr.ty], min: r >= 2 ? 3 : 2, luck: 1.5 })); pushEnc(res, genEnc({ min: 2, luck: 1.5 }));
    give('ultra', r >= 2 ? 2 : 1); give(Math.random() < 0.5 ? 'stone' : 'candy', 1);
    if (r >= 2 && S.eggs.length < 3 && roll(0.5)) { S.eggs.push({ need: 120, got: 0 }); res.items.push('1 × Egg'); }
    if (r >= 3 && roll(0.12)) pushEnc(res, genEnc({ leg: 1 }));
    /* Sjelden boss: klassens egen belønning på toppen, som i ligaen. */
    { const bonus = Math.round(FACROUND(r) * sm * (B.dc || 1)); res.coins += bonus; S.coins += bonus; res.perks.push(`Round ${r} cleared: ${bonus.toLocaleString('en-US')} coins on top.`); }
    if (B.tr.ultra) { const c = B.tr.ci, extra = Math.round([600, 1000, 2000][c - 7] * sm * (B.dc || 1)); res.coins += extra; S.coins += extra; rareLoot(c, res, give, [B.tr.ty]); res.note = `${B.tr.cn}: extra rewards.`; }
    res.roundDone = true; if (Math.random() < RAIDFAC) raidSpawn(res); R.round++; R.w = 0; R.team = null; R.offer = facOffer(R.round); R.open = 0;
  } else res.swap = B.foe.map(f => f.src);
  R.foe = null;
  save();
  return res;
}
/* Bytt en av dine leide mot en fra laget du nettopp slo. */
function facSwap(mine, theirs) { const R = S.fac.run; if (R && R.team && R.team[mine] && theirs) { R.team[mine] = theirs; save(); } }

/* ---------- World Tournament ----------
   En daglig cup med utslagsrunder: kvartfinale, semifinale og finale på rad. Tre mot tre, og alle dine spiller på samme nivå (lagets nivå da cupen startet).
   Motstanderne står på det samme nivået på Hard, og litt under på Normal og Easy (som i ligaen), så det er valget av de tre og spillet som avgjør, ikke hvem som har trent mest. Du ser motstanderens tre før du velger dine. Ingen veske og ingen XP,
   og laget er friskt til hver runde. Ett tap, og du er ute til neste dag med kamper. Cupen skifter med ukedagen (CUPS, søndag først): lederne fra hver region,
   Elite Four-cupen med en mester i finalen, og mesternes cup med en av de aller største i finalen.
   PREMIER: mynter for hver runde (PWTCOIN × cupens faktor × vanskelighetsgrad × studiebonus). Vinneren får et trofé, PWTCANDY Rare Candy og en pakke encounters
   (samme trekning som pakken i butikken, uten de legendariske). */
const PWTN = 3, PWTCOIN = [200, 400, 800], PWTCANDY = 2, ROUNDN = ['Quarter-final', 'Semi-final', 'Final'];
const aN = s => (/^[AEIOU]/i.test(s) ? 'an ' : 'a ') + s;
const gymCup = (n, re) => ({ n, f: 1, pk: 'great', rounds: [['gym', re], ['gym', re], ['gym', re]] });
const CUPS = [
  { n: 'Champions Cup', f: 2.2, pk: 'ultra', rounds: [['champ'], ['champ'], ['supreme']] },
  gymCup('Kanto Leaders Cup', /^Kanto/), gymCup('Johto Leaders Cup', /^Johto/), gymCup('Hoenn Leaders Cup', /^Hoenn/), gymCup('Sinnoh Leaders Cup', /^Sinnoh/), gymCup('Unova Leaders Cup', /^B2 W2/),
  { n: 'Elite Four Cup', f: 1.5, pk: 'ultra', rounds: [['e4'], ['e4'], ['champ']] }
];
const pwt = () => S.pwt || (S.pwt = { day: '', run: null, won: 0, cups: {} });
const cupNow = () => CUPS[new Date((S.lad.day || dayKey()) + 'T12:00:00').getDay()] || CUPS[1];
/* Cupen som er i gang. Den gjelder bare dagen den ble startet. */
const pwtRun = () => { const P = pwt(); if (P.run && P.run.day !== S.lad.day) { P.run = null; } return P.run; };
const pwtOpen = () => !!S.lad.day && (!!pwtRun() || pwt().day !== S.lad.day);
const pwtLv = () => Math.max(10, Math.min(100, Math.round(leagueLv())));
const pwtSize = () => Math.max(1, Math.min(PWTN, S.party.map(monBy).filter(Boolean).length));
const pwtCoins = (c, r) => Math.round(PWTCOIN[r] * c.f * studyMult() * diff().coin);
function pwtStart() {
  const P = pwt(), c = cupNow(), opp = [];
  c.rounds.forEach(([k, re]) => { let l = POOL[k].map((_, i) => i).filter(i => (!re || re.test(POOL[k][i][5] || '')) && !opp.some(o => o[0] === k && o[1] === i)); if (!l.length) l = POOL[k].map((_, i) => i); opp.push([k, l[rnd(l.length)]]); });
  const lv = pwtLv();
  /* Motstanderne følger vanskelighetsgraden slik som i ligaen: litt lavere nivå på Easy og Normal, likt på Hard. */
  P.day = S.lad.day; P.run = { day: S.lad.day, wd: CUPS.indexOf(c), lv, flv: Math.max(5, Math.round(lv * (1 + diff().rel))), n: pwtSize(), opp, r: 0, foe: null }; save();
}
/* Motstanderen i runden som venter. Laget trekkes én gang, så det du ser på forhånd er det du møter. */
function pwtFoe() {
  const R = pwtRun(), c = CUPS[R.wd], [k, i] = R.opp[R.r], d = POOL[k][i], st = diffSt(TCL[k]);
  if (!R.foe) { R.foe = bossTeam(d, R.n, R.flv || R.lv, st, true); save(); }
  return { c, k, st, team: R.foe, tr: trainerOf(k, i, { skill: st.sk, sc: 'pwt' }) };
}
/* us = de du har valgt (u), den første går ut først. Dine spiller på cupens nivå i denne kampen, uten at de egentlige nivåene røres. */
function pwtBattle(us) {
  const R = pwtRun(), f = pwtFoe(), mine = us.map(monBy).filter(Boolean).slice(0, R.n).map(m => Object.assign({}, m, { lv: R.lv }));
  return mkBattle(mine, f.team, f.tr, { mode: 'pwt', st: f.st, k: f.k, r: R.r, cup: f.c.n, bag: 0, xm: 0, sm: studyMult(), dc: diff().coin, boost: { mode: '', m: 1, xp: 1 } });
}
function finishPwt(B) {
  const P = pwt(), R = pwtRun(), win = B.over === 'win', res = { mode: 'pwt', win, ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', r: B.r, cup: B.cup, done: false };
  if (!R) return res;
  const c = CUPS[R.wd];
  if (!win) { P.run = null; res.note = `You are out of the ${c.n}. A new cup opens after your next day of focus.`; save(); return res; }
  res.coins = Math.round(PWTCOIN[R.r] * c.f * B.sm * (B.dc || 1)); S.coins += res.coins;
  R.r++; R.foe = null;
  if (R.r >= PWTN) {
    res.done = true; P.won = (P.won || 0) + 1; P.cups[c.n] = (P.cups[c.n] || 0) + 1; P.run = null;
    S.items.candy = (S.items.candy || 0) + PWTCANDY; res.items.push(`${PWTCANDY} × Rare Candy`);
    const PK = PACKS[c.pk]; PK.slots.forEach(sl => pushEnc(res, genEnc({ min: sl.min || 0, luck: sl.luck || 0, shm: PK.shm })));
    res.perks.push(`Champion of the ${c.n}! That is trophy number ${P.won}.`); res.note = `The prize is ${aN(PK.n)}: three encounters are waiting in the grass.`;
  }
  save(); return res;
}

/* ---------- Demo ---------- */
/* Prøvekamp mot en valgfri klasse. Gir ingenting og rører verken ligaen eller Frontier. rent = leide Pokémon på nivå 50 i stedet for ditt eget lag. */
function labBattle(k, rent, pi) {
  const i = pi == null ? rnd(POOL[k].length) : pi, d = POOL[k][i], c = TCL[k], rd = 2;
  let me, foes, tr;
  if (rent) {
    const used = new Set(); me = Array.from({ length: 4 }, () => facMon(2, used, 0));
    const st = { iv: ULTRA.has(k) ? 31 : 22, ev: ULTRA.has(k) ? 60 : 24, q: 2, slack: 99 };
    foes = k === 'trainer' ? Array.from({ length: 4 }, () => facMon(2, used, -20)) : k === 'evilteam' ? regTeam(d[4], 4, FACLV, Object.assign({}, c, st), true) : bossTeam(d, 4, FACLV, st, true);
    tr = trainerOf(k, i, { fr: 1, arena: k === 'trainer' ? 'factory' : 'hall' });
  } else {
    const st = k === 'trainer' ? trainerCls(rd) : c, base = Math.min(100, Math.max(5, Math.round(leagueLv() * st.rel)));
    me = S.party.map(monBy).filter(Boolean); foes = foeTeam(k, d, st.mons, base, st); tr = trainerOf(k, i);
    if (k === 'trainer') tr.skill = st.sk;
  }
  return mkBattle(me, foes, tr, { mode: 'lab', st: c, k, rd, n: 0, lap: 0, ti: i, rent: rent ? 1 : 0, bag: rent ? 0 : BAGN, xm: 1, sm: 1, boost: { mode: '', m: 1, xp: 1 } });
}
/* ---------- Legendariske kamper ----------
   Når en runde i ligaen eller i Battle Frontier er fullført, viser en legendarisk Pokémon seg. Den er på et høyt nivå og har flere ganger så mye HP
   som vanlig, så den er umulig i starten. Slår du den, venter den i gresset, og da kan du prøve å fange den.
   LEGD: art, trinn (1 legendarisk, 2 de største, 3 mytisk, 4 Arceus), søk etter låta i pakken, bane, tema på banen, farge, scenen i filmsnutten og kjennetegnet der. */
const LEGD = '144,1,Lugia,snowy_tall_grass,snow,#bfe6ff,ice,|145,1,Raikou,mountain,spark,#ffe14a,bolt,|146,1,Ho-oh,mountain,flame,#ff9a3a,magma,|150,2,Origins>>Mewtwo,cave,shard,#c79bff,void,rings|151,3,Origins>>Mewtwo,tall_grass,petal,#ffb3d9,forest,|243,1,Raikou,mountain,spark,#ffe14a,bolt,|244,1,Entei>>Raikou,cave,flame,#ff7a2a,magma,|245,1,Raikou,shallow_water,bubble,#7ad0ff,sea,|249,2,Lugia,water,bubble,#cfe6ff,sea,whirl|250,2,Ho-oh,mountain,flame,#ffb23a,sky,rainbow|251,3,Ho-oh,pinwheel_road,petal,#9be07a,forest,|377,1,Heatran,cave,shard,#c9a45c,stone,|378,1,Heatran,kyurem_cave,snow,#bfe6ff,ice,|379,1,Heatran,cave,shard,#b4c0d2,stone,|380,1,Rayquaza,mountain,spark,#ff7a8a,sky,|381,1,Rayquaza,mountain,spark,#6aa8ff,sky,|382,2,Kyogre,water,bubble,#3f8cff,sea,glyph|383,2,Kyogre,cave,flame,#ff5a2a,magma,glyph|384,2,Rayquaza,mountain,spark,#3fe08a,sky,streak|385,3,Deoxys,mountain,spark,#ffe680,space,|386,4,Deoxys,black_tower_10,shard,#ff7a4a,space,rings|480,1,Uxie,shallow_water,bubble,#ffe680,sea,|481,1,Uxie,shallow_water,bubble,#ff8ab0,sea,|482,1,Uxie,shallow_water,bubble,#6aa8ff,sea,|483,2,Palkia,black_tower_10,shard,#6aa8ff,time,rings|484,2,Palkia,black_tower_10,shard,#ff8ad0,space,rift|485,1,Heatran,cave,flame,#ff7a2a,magma,|486,1,Heatran,cave,shard,#e8e0c0,stone,|487,2,Giratina,kyurem_cave,evil,#e0b030,void,stripes|488,1,Uxie,mountain,shard,#ffb3ea,space,|490,3,Uxie,water,bubble,#5ad0ff,sea,|491,3,Giratina,kyurem_cave,evil,#b03060,void,|492,3,Uxie,tall_grass,petal,#8be07a,forest,|493,4,Arceus,black_tower_10,,#ffe9a8,origin,wheel|494,3,Reshiram,pwt,flame,#ff9a3a,magma,|638,1,Cobalion,mountain,shard,#6ac0e8,stone,|639,1,Cobalion,cave,shard,#c9a45c,stone,|640,1,Cobalion,pinwheel_road,petal,#8be07a,forest,|641,1,Reshiram,mountain,spark,#8be0a0,sky,|642,1,Reshiram,mountain,spark,#6aa8ff,bolt,|643,2,Reshiram,black_tower_10,flame,#fff2e0,flame,pillar|644,2,Reshiram,black_tower_10,spark,#4ad0ff,bolt,pillar|645,1,Reshiram,cave,shard,#e0903a,stone,|646,2,Reshiram,kyurem_cave,snow,#bfe6ff,ice,pillar|647,3,Cobalion,shallow_water,bubble,#6ac0ff,sea,|648,3,Reshiram,pwt,petal,#9be07a,forest,|649,3,Reshiram,black_tower_3_5,shard,#c79bff,space,';
const LEG = {}; LEGD.split('|').forEach(r => { const q = r.split(','); LEG[+q[0]] = { t: +q[1], mre: q[2], sc: q[3], th: q[4], cc: q[5], bg: q[6], sig: q[7] }; });
/* ---------- Raid-reglene ----------
   NÅR en legendarisk viser seg: (1) hver gang en runde i ligaen er fullført, (2) når du når dagsmålet ditt (RAIDGOAL sjanse), (3) hver sjuende dag på rad
   du har studert, og (4) noen ganger etter en fullført runde i Battle Frontier (RAIDFAC). Bare én venter om gangen.
   HVOR LENGE: du har RAIDTRIES forsøk, ett om dagen. Etter det siste drar den videre, så du aldri blir stående fast mot en du ikke klarer.
   NIVÅ: settes i det den viser seg, etter laget ditt (snittet av de tre sterkeste + RAIDOFF for sjeldenheten), og aldri over artens toppnivå (RAIDLV).
        Trener du laget før du prøver igjen, har du altså tatt innpå. Vanskelighetsgraden senker nivå og HP på Easy og Normal.
        Det som gjør et raid tungt, er ikke nivået, men at den legendariske har flere ganger så mye HP (RAIDHP) og de sterkeste artene i spillet.
        Stilt inn med simulerte kamper (med stedets hendelser og raseriet): et jevnt lag uten veske slår de vanlige omtrent annenhver gang på Hard, de største bare av og til.
   STEDET: hver legendarisk har et domene som kjemper med (se DOM lenger ned): en liten hendelse hver tredje runde, og raseri under halv HP.
   HVEM: oftest en vanlig legendarisk (1), så de mytiske (3) og de største (2). De aller sjeldneste (4: Arceus og Deoxys) starter på 3 %,
        og sjansen vokser litt for hvert raid uten en av dem (S.rpity), så de kommer før eller siden. Mewtwo har egen trekning (MEWP) til du har den mørke,
        og hver gang Mewtwo viser seg, er det DARKP sjanse for at den blir til Dark Mewtwo foran øynene dine.
   BELØNNING: mynter (RAIDCOIN × vanskelighetsgrad), Rare Candy (RAIDCANDY), mye XP til hele laget, og den legendariske venter i gresset. */
const RAIDLV = [60, 72, 66, 85, 92], RAIDHP = [2, 2.7, 2.3, 2.8, 3.8], RAIDCOIN = [1800, 3800, 2700, 7500, 12000], RAIDCANDY = [3, 5, 4, 8, 10], RAIDOFF = [1, 2, 2, 2, 5];
const RAIDTRIES = 3, RAIDGOAL = 0.3, RAIDFAC = 0.35, MEWP = 0.08, DARKP = 0.3;
/* De sterkeste viser seg bare for lag som kan gi dem kamp: de mytiske fra lagnivå 25, de største fra 35, og Arceus og Deoxys fra 45. (Dark Mewtwo kommer bare ut av en slått Mewtwo.) */
const RAIDGATE = [0, 35, 25, 45, 45];
const raidLvFor = t => Math.max(12, Math.min(RAIDLV[t - 1] + 3 * Math.min(5, S.lad.lap || 0), Math.round(leagueLv()) + RAIDOFF[t - 1]));
/* Dark Mewtwo (Shadow Mewtwo i Pokkén Tournament, «Dark Mewtwo» på japansk): den sjeldneste og sterkeste av alle. Samme art som Mewtwo, men mørk (sh: 2),
   på et høyere nivå enn Arceus og med mer HP. Den finnes ikke som eget raid: den er RUNDE TO. Slår du Mewtwo i et raid, er det DARKP sjanse for at den
   reiser seg igjen som Dark Mewtwo (finishRaid). Da har du fått belønningen for Mewtwo, laget ditt er friskt igjen (en ny kamp), og du må slåss en gang til,
   med en gang. Vinner du, er det den mørke som venter i gresset. Taper du, står den igjen som raid med forsøkene du hadde igjen, og går også de tapt,
   slipper skyggen taket og den vanlige Mewtwo du slo, venter i gresset. */
const DARK = { id: 150, t: 5, mre: 'X & Y - Mewtwo>>Mewtwo', sc: 'cave', th: 'evil', cc: '#ff8a2a', bg: 'void', sig: 'rings', n: 'Dark Mewtwo', title: 'Shadow Pokémon' };
const hasDark = () => S.mons.some(m => m.id === 150 && m.sh === 2);
const raidInfo = R => R && R.dk ? DARK : R ? LEG[R.id] : null;
/* Det raidkortet viser før kampen. */
const raidShow = R => ({ L: raidInfo(R), n: R.dk ? DARK.n : D(R.id)[0], sh: R.dk ? 2 : 0, lv: R.lv });
const raidTitle = (id, dk) => dk ? DARK.title : id === 493 ? 'The Original One' : LEG[id].t === 3 || id === 386 ? 'Mythical Pokémon' : 'Legendary Pokémon';
function raidPick() {
  const p4 = Math.min(0.25, 0.03 + 0.006 * (S.rpity || 0)), r = Math.random(), lv = leagueLv(), all = Object.keys(LEG).map(Number);
  let t = r < p4 ? 4 : r < p4 + 0.18 ? 2 : r < p4 + 0.4 ? 3 : 1;
  if (t === 4 && lv < RAIDGATE[3]) t = 2; if (t === 2 && lv < RAIDGATE[1]) t = 3; if (t === 3 && lv < RAIDGATE[2]) t = 1;
  const c = all.filter(id => LEG[id].t === t && !S.mons.some(m => m.id === id));
  const l = c.length ? c : all.filter(id => LEG[id].t === 1); return l[rnd(l.length)];
}
function raidSpawn(res) {
  if (S.raid) return false;
  const lv = leagueLv();
  /* Mewtwo har sin egen trekning (MEWP) helt til du eier Dark Mewtwo, også om du alt har den vanlige: det er bare gjennom den du kan møte den mørke. */
  const id = !hasDark() && lv >= RAIDGATE[1] && Math.random() < MEWP ? 150 : raidPick(), t = LEG[id].t;
  S.rpity = t >= 4 ? 0 : (S.rpity || 0) + 1;
  S.raid = { id, lv: raidLvFor(t), day: '', tries: 0 };
  if (res) res.raid = id;
  return true;
}
const raidOpen = () => !!S.raid && !!LEG[S.raid.id] && S.raid.day !== dayKey();
/* ---------- Stedet kjemper med ----------
   Hver legendarisk har et «domene» etter stedet sitt (LEG.bg). Hver RAIDEV-te runde skjer det noe der: din Pokémon mister litt HP (1/RAIDCHIP, og typer som tåler
   stedet slipper), får senket en verdi ett trinn, eller den legendariske henter seg litt inn. Første gang den legendariske er nede i halv HP, blir den rasende:
   verdiene i «up» går opp ett trinn, og hendelsene kommer hver RAIDEV2-te runde resten av kampen. Hendelsene vises av kampskjermen (hendelsestypen «env», raidx.js). */
const RAIDEV = 3, RAIDEV2 = 2, RAIDCHIP = 16, RAIDHEAL = 20;
const DOM = {
  ice: { n: 'Blizzard', k: 'chip', imm: [14], s: 'The blizzard bites into {N}!', d: 'the blizzard hurts your Pokémon a little (Ice types are safe)', up: [[5, 1]] },
  bolt: { n: 'Thunderstorm', k: 'chip', imm: [4, 12], s: 'Lightning crashes down on {N}!', d: 'lightning hurts your Pokémon a little (Ground and Electric types are safe)', up: [[6, 1]] },
  magma: { n: 'Scorched Earth', k: 'chip', imm: [9], s: 'The ground erupts under {N}!', d: 'eruptions hurt your Pokémon a little (Fire types are safe)', up: [[2, 1]] },
  stone: { n: 'Ancient Chamber', k: 'chip', imm: [4, 5, 8], s: 'Rocks rain down on {N}!', d: 'falling rocks hurt your Pokémon a little (Rock, Ground and Steel types are safe)', up: [[3, 1]] },
  sea: { n: 'Raging Tide', k: 'chip', imm: [10], s: 'A great wave crashes over {N}!', d: 'waves hurt your Pokémon a little (Water types are safe)', up: [[4, 1]] },
  sky: { n: 'Jet Stream', k: 'drop', st: 6, s: 'The gale forces {N} back!', d: "the gale lowers your Pokémon's Speed", up: [[6, 1]] },
  void: { n: 'Distortion', k: 'drop', st: 5, s: 'The air warps around {N}!', d: "the distortion lowers your Pokémon's Sp. Def", up: [[4, 1]] },
  space: { n: 'Spatial Rift', k: 'drop', st: 3, s: 'Space bends around {N}!', d: "the rift lowers your Pokémon's Defense", up: [[4, 1]] },
  time: { n: 'Time Warp', k: 'drop', st: 6, s: 'Time slows around {N}!', d: "the warp lowers your Pokémon's Speed", up: [[3, 1]] },
  forest: { n: 'Life Spring', k: 'heal', s: '{F} draws strength from the land!', d: 'the land restores a little of its HP', up: [[5, 1]] },
  origin: { n: 'Judgment', k: 'chip', imm: [], s: 'Pillars of light fall on {N}!', d: 'pillars of light hurt your Pokémon a little', up: [[2, 1], [4, 1]] },
  dark: { n: 'Shadow Field', k: 'both', st: 5, imm: [], s: 'Shadows tear at {N}!', d: "the shadows hurt your Pokémon a little and lower its Sp. Def", up: [[2, 1], [4, 1]] }
};
const domKey = tr => tr.dk ? 'dark' : tr.lbg === 'flame' ? 'magma' : tr.lbg, raidDom = tr => DOM[domKey(tr)] || null;
/* Kalles på slutten av hver runde i en raid (fra endTurn i battle.js). */
function raidField(B, ev) {
  const D0 = raidDom(B.tr), f = B.foe[B.b], b = B.me[B.a]; if (!D0 || B.over || f.hp <= 0) return;
  const N = nmOf('me', b), F = f.name;
  if (!B.rage && f.hp <= f.max / 2) { B.rage = 1; ev.push({ t: 'env', k: 'rage', s: `${F} is enraged!` }); changeStats(B, 'foe', D0.up, ev); }
  if (b.hp <= 0 || b.v.away) return;
  B.fld = (B.fld || 0) + 1;
  if (B.fld < (B.rage ? RAIDEV2 : RAIDEV)) return;
  B.fld = 0;
  const s = D0.s.replace('{N}', N).replace('{F}', F);
  if (D0.k === 'heal') { if (f.hp < f.max) { f.hp = Math.min(f.max, f.hp + Math.max(1, Math.floor(f.max / RAIDHEAL))); ev.push({ t: 'env', k: domKey(B.tr), s }, { t: 'heal', side: 'foe', hp: f.hp }); } return; }
  ev.push({ t: 'env', k: domKey(B.tr), s });
  if (D0.k !== 'drop') {
    if (D0.imm.some(t => b.ty.includes(t))) ev.push({ t: 'msg', s: `${N} shrugs it off!` });
    else { b.hp = Math.max(0, b.hp - Math.max(1, Math.floor(b.max / RAIDCHIP))); ev.push({ t: 'hit', side: 'me', hp: b.hp, e: 1, quiet: 1 }); settle(B, ev); }
  }
  if (D0.k !== 'chip' && b.hp > 0 && !B.over) changeStats(B, 'me', [[D0.st, -1]], ev, true);
}
function legTr(id, dk) {
  const L = dk ? DARK : LEG[id], d = D(id);
  return { n: dk ? L.n : d[0], img: '', title: raidTitle(id, dk), ty: d[1], kind: 'legend', ci: 10, cn: 'Legendary raid', skill: 1, boss: true, ultra: true, gold: L.t === 4, int: 8,
    sc: L.sc, th: L.th, cc: L.cc, arena: 'hall', v: 0, mre: L.mre, wild: 1, leg: id, dk: dk ? 1 : 0, lt: L.t, lbg: L.bg, sig: L.sig };
}
/* En legendarisk i raid slår aldri ut seg selv: Explosion, Final Gambit, Memento og lignende byttes ut med det beste den ellers kan. */
/* Den helbreder seg heller ikke: med flere ganger så mye HP som en vanlig Pokémon ville Rest eller Recover gjort kampen håpløs. */
const SELFKO = new Set(['Explosion', 'Self-Destruct', 'Final Gambit', 'Memento', 'Healing Wish', 'Lunar Dance', 'Destiny Bond', 'Perish Song',
  'Rest', 'Recover', 'Roost', 'Soft-Boiled', 'Synthesis', 'Moonlight', 'Morning Sun', 'Milk Drink', 'Slack Off', 'Heal Order', 'Wish', 'Swallow', 'Pain Split', 'Leech Seed', 'Ingrain', 'Aqua Ring']);
function raidMoves(id, lv) {
  /* Og den bygger seg ikke opp med Cosmic Power, Calm Mind og lignende: den angriper. */
  const ok = x => { const m = MOVES[x]; return !SELFKO.has(m[0]) && !(m[4] === 0 && m[17] === 1 && m[12].length); }, mv = foeMoves(id, lv, 2).filter(ok);
  for (const x of movesAt(id, lv + 8).filter(x => ok(x) && !DEADMV.has(x) && MOVES[x][4] > 0).sort((a, b) => (MOVES[b][2] || 0) - (MOVES[a][2] || 0))) { if (mv.length >= 4) break; if (!mv.includes(x)) mv.push(x); }
  return mv.length ? mv : defaultMoves(id, lv);
}
/* demo = arten som skal prøves i demoen (gir ingenting). Ellers den som har vist seg. */
/* demo = arten som skal prøves i demoen (gir ingenting), eller 'dk' for Dark Mewtwo. Ellers den som har vist seg. */
function raidBattle(lead, demo) {
  const R = demo === 'dk' ? { id: 150, dk: 1, lv: raidLvFor(5) } : demo ? { id: demo, lv: raidLvFor(LEG[demo].t) } : S.raid, L = raidInfo(R), party = S.party.map(monBy).filter(Boolean);
  party.sort((a, b) => (b.u === lead) - (a.u === lead));
  /* Vanskelighetsgraden senker nivået og HP-en til den legendariske (Hard = som før). */
  const dd = diff(), lv = Math.max(10, Math.round(R.lv * dd.rlv)), e = Math.round((R.dk ? 100 : 60) * dd.ev), foe = { id: R.id, lv, sh: R.dk ? 2 : 0, g: rollG(R.id), mega: defForm(R.id), iv: [31, 31, 31, 31, 31, 31].map(v => Math.round(v * (0.5 + dd.iv / 2))), ev: [e, e, e, e, e, e], nat: 0, mv: raidMoves(R.id, lv) };
  const B = mkBattle(party, [foe], legTr(R.id, R.dk), { mode: demo ? 'lab' : 'raid', raid: 1, st: TCL.supreme, k: 'legend', rd: 0, n: 0, lap: 0, ti: 0, bag: bagN(), xm: 3 * dd.xp, sm: 1, dc: dd.coin, boost: { mode: '', m: 1, xp: 1 } });
  B.tr.skill = dd.sk;
  const f = B.foe[0]; f.max = f.hp = Math.round(f.max * RAIDHP[L.t - 1] * dd.rhp); if (R.dk) f.short = 'D.Mewtwo';
  return B;
}
function finishRaid(B) {
  const win = B.over === 'win', id = B.tr.leg, R = S.raid, nm = B.tr.n, t = B.tr.lt, res = { mode: 'raid', win, ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', kind: 'legend', leg: id };
  if (win) {
    grantXp(B, res);
    res.coins = Math.round(RAIDCOIN[t - 1] * (B.dc || 1)); S.coins += res.coins;
    const c = RAIDCANDY[t - 1]; S.items.candy = (S.items.candy || 0) + c; res.items.push(`${c} × Rare Candy`);
    if (t >= 2) { const n = t >= 4 ? 3 : 1; S.items.ultra = (S.items.ultra || 0) + n + 1; res.items.push(`${n + 1} × Ultra Ball`); }
    if (t >= 4) giveCharm(res);
    if (id === 150 && !B.tr.dk && R && !hasDark() && Math.random() < DARKP) {
      /* Den reiser seg igjen. Belønningen for Mewtwo er gitt; r1 husker den til oppsummeringen etter runde to. */
      S.raid = { id: 150, dk: 1, lv: raidLvFor(5), day: '', tries: R.tries || 0, won1: 1, r1: `${res.coins.toLocaleString('en-US')} coins, ${res.items.join(', ')}` };
      res.dark = 1; res.note = 'Mewtwo is not finished.';
    } else {
      pushEnc(res, Object.assign(genEnc({ ids: [id] }), B.tr.dk ? { sh: 2 } : {})); S.raid = null; res.note = `${nm} is waiting in the grass. Go and catch it.`;
      if (R && R.r1) res.perks.push(`Mewtwo gave its rewards before it changed: ${R.r1}.`);
    }
  } else if (R) {
    R.day = dayKey(); R.tries = (R.tries || 0) + 1;
    const pre = R.r1 && !R.told ? `Mewtwo's rewards are yours: ${R.r1}. ` : ''; R.told = 1;
    if (R.tries >= RAIDTRIES) {
      S.raid = null;
      if (R.won1) { pushEnc(res, genEnc({ ids: [150] })); res.note = `${pre}The shadow lets go and Dark Mewtwo is gone. The Mewtwo you beat is waiting in the grass.`; }
      else res.note = `${nm} has moved on. Another legendary Pokémon will show itself in time.`;
    } else res.note = `${pre}${nm} stays where it is. You have ${RAIDTRIES - R.tries} ${RAIDTRIES - R.tries === 1 ? 'attempt' : 'attempts'} left, one a day.`;
  }
  save(); return res;
}
const finishLab = B => ({ mode: 'lab', win: B.over === 'win', ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', kind: B.k });
