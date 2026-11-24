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
  e4: { i: 5, n: 'Elite Four', mons: 5, rel: 0.98, sk: 0.9, iv: 21, ev: 28, q: 2, tut: 1, coin: 420, xp: 1.5, slack: 8 },
  rival: { i: 6, n: 'Rival', mons: 6, rel: 0.985, sk: 0.93, iv: 19, ev: 22, q: 2, tut: 1, coin: 500, xp: 1.6, slack: 8 },
  evilboss: { i: 7, n: 'Evil Leader', mons: 6, rel: 0.99, sk: 0.96, iv: 20, ev: 28, q: 2, tut: 1, coin: 750, xp: 1.75, slack: 12 },
  champ: { i: 8, n: 'Champion', mons: 6, rel: 1, sk: 1, iv: 28, ev: 56, q: 2, tut: 2, coin: 1100, xp: 1.9, slack: 16 },
  supreme: { i: 9, n: 'Supreme Boss', mons: 6, rel: 1.01, sk: 1, iv: 31, ev: 60, q: 2, tut: 4, coin: 2000, xp: 2.2, slack: 30 }
};
/* Vanskelighetsgrad (S.diff): 0 Easy, 1 Normal, 2 Hard. Tallene i klassetabellen over er Hard, slik spillet var før valget kom.
   lives = forsøk i ligaen per dag (Easy tåler ett tap, slik Battle Frontier alltid har gjort). coin/xp/candy = belønningen: mynter, XP og sjansen
   for Rare Candy følger graden, så Hard lønner seg for et lag som tåler det, og Easy koster noe.
   På lavere grad stiller motstanderne svakere: lavere nivå (rel), dummere spill (sk), dårligere oppdrett (iv, ev), enklere angrep (q), færre Pokémon (mons)
   og senere utvikling (slack) – og du får flere gjenstander i veska (bag). Belønningen følger graden (coin, xp), så det lønner seg å gå opp når laget tåler det.
   rlv/rhp = nivå og HP for de legendariske i raid. rf = hvor ofte en legendarisk viser seg (ganges med sjansen i raidRoll), rc = dager lagt til eller
   trukket fra pausen etter et raid (RAIDCOOL), lg = sjansen for det legendariske møtet fra de aller største (rareLoot). Målt over 28 dager med tre timer
   om dagen gir Hard rundt 30 % flere mynter og seks nivåer mer enn Normal, og nesten dobbelt så mange raid. */
const DIFF = [
  { n: 'Easy', rel: -0.1, sk: 0.6, iv: 0.4, ev: 0, q: 1, tut: -9, mons: -1, slack: 0.5, coin: 0.5, xp: 0.75, candy: 0.6, lives: 2, bag: 5, rlv: 0.96, rhp: 0.9, rf: 0.6, rc: 1, lg: 0.5 },
  { n: 'Normal', rel: -0.05, sk: 0.85, iv: 0.75, ev: 0.5, q: 2, tut: -1, mons: 0, slack: 0.8, coin: 1, xp: 1, candy: 1, lives: 1, bag: 4, rlv: 1, rhp: 0.9, rf: 1, rc: 0, lg: 1 },
  { n: 'Hard', rel: 0, sk: 1, iv: 1, ev: 1, q: 2, tut: 0, mons: 0, slack: 1, coin: 2.3, xp: 1.5, candy: 1.7, lives: 1, bag: 3, rlv: 1.02, rhp: 1.05, rf: 1.8, rc: -1, lg: 1 }
];
const diff = () => DIFF[S.diff == null ? 2 : S.diff] || DIFF[2];
const diffSt = st => { const d = diff(); return d.rel === 0 ? st : Object.assign({}, st, { mons: Math.max(st.i >= 2 ? 3 : 2, st.mons + d.mons), rel: st.rel + d.rel, sk: st.sk * d.sk, iv: Math.round(st.iv * d.iv), ev: Math.round(st.ev * d.ev), q: Math.min(st.q, d.q), tut: Math.max(0, (st.tut || 0) + (d.tut || 0)), slack: Math.round((st.slack || 0) * d.slack) }); };
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
      ['Brycen', 'brycen', 14, [614, 615, 584, 461, 473, 362]], ['Drayden', 'drayden', 15, [612, 621, 611, 334, 373, 149]], ['Roxie', 'roxie', 3, [545, 569, 110, 169, 452, 544]], ['Marlon', 'marlon', 10, [593, 565, 594, 537, 130, 73]]])),
  /* Evil Team: fotfolket. Lagene trekkes innenfor typene deres (femte felt er typene, ikke et fast lag). */
  evilteam: [['Grunt', 'rocketgrunt', 'Team Rocket', 3, [3, 16, 0], 'Rocket'], ['Grunt', 'aquagrunt', 'Team Aqua', 10, [10, 16, 3], 'Aqua'], ['Grunt', 'magmagrunt', 'Team Magma', 9, [9, 4, 16], 'Aqua'],
    ['Grunt', 'galacticgrunt', 'Team Galactic', 16, [3, 16, 6], 'Galactic'], ['Grunt', 'plasmagrunt', 'Team Plasma', 16, [16, 3, 0], 'White - Team Plasma'], ['Grunt', 'plasmagrunt-gen5bw2|plasmagrunt', 'Neo Team Plasma', 14, [16, 14, 3], 'Neo']],
  eviladmin: [['Archer', 'archer', 'Rocket Executive', 9, [229, 110, 169, 24, 20, 215], 'Rocket'], ['Ariana', 'ariana', 'Rocket Executive', 3, [24, 45, 430, 110, 73, 169], 'Rocket'], ['Petrel', 'petrel', 'Rocket Executive', 3, [110, 20, 169, 89, 101, 49], 'Rocket'], ['Proton', 'proton', 'Rocket Executive', 3, [169, 110, 20, 24, 89, 229], 'Rocket'],
    ['Mars', 'mars', 'Galactic Commander', 0, [432, 437, 169, 430, 229, 461], 'Galactic Commander'], ['Jupiter', 'jupiter', 'Galactic Commander', 3, [435, 437, 169, 452, 407, 430], 'Galactic Commander'], ['Saturn', 'saturn', 'Galactic Commander', 3, [454, 437, 169, 65, 472, 474], 'Galactic Commander'],
    ['Shelly', 'shelly|shelly-gen3', 'Aqua Admin', 10, [319, 262, 73, 342, 130, 272], 'Aqua'], ['Matt', 'matt|matt-gen3', 'Aqua Admin', 10, [319, 89, 169, 262, 342, 68], 'Aqua'], ['Tabitha', 'tabitha|tabitha-gen3', 'Magma Admin', 9, [323, 262, 110, 169, 219, 229], 'Aqua'], ['Courtney', 'courtney|courtney-gen3', 'Magma Admin', 9, [323, 262, 38, 169, 324, 229], 'Aqua'],
    ['Zinzolin', 'zinzolin', 'Plasma Sage', 14, [615, 461, 584, 614, 478, 473], 'Neo'], ['Shadow Triad', 'shadowtriad', 'Team Plasma', 16, [625, 359, 354, 617, 461, 430], 'Neo']],
  e4: [['Lorelei', 'lorelei-gen3|lorelei|lorelei-lgpe', 'Elite Four', 14, [131, 87, 91, 124, 80, 473], 'FireRed'], ['Bruno', 'bruno', 'Elite Four', 1, [68, 106, 107, 95, 237, 448], 'FireRed'], ['Agatha', 'agatha-gen3|agatha|agatha-lgpe', 'Elite Four', 7, [94, 93, 169, 24, 429, 42], 'FireRed'],
    ['Will', 'will', 'Elite Four', 13, [178, 103, 124, 80, 196, 282], 'HeartGold'], ['Karen', 'karen', 'Elite Four', 16, [197, 229, 94, 45, 461, 430], 'HeartGold'], ['Sidney', 'sidney', 'Elite Four', 16, [359, 262, 275, 332, 342, 319], 'Sapphire - Elite'], ['Phoebe', 'phoebe', 'Elite Four', 7, [477, 354, 302, 429, 94, 442], 'Sapphire - Elite'],
    ['Glacia', 'glacia', 'Elite Four', 14, [365, 362, 478, 91, 131, 473], 'Sapphire - Elite'], ['Drake', 'drake', 'Elite Four', 15, [373, 334, 330, 230, 149, 612], 'Sapphire - Elite'], ['Aaron', 'aaron', 'Elite Four', 6, [452, 469, 416, 214, 212, 402], 'Diamond'], ['Bertha', 'bertha', 'Elite Four', 4, [450, 340, 76, 472, 464, 195], 'Diamond'],
    ['Flint', 'flint', 'Elite Four', 9, [392, 467, 78, 229, 136, 59], 'Diamond'], ['Lucian', 'lucian', 'Elite Four', 13, [437, 65, 122, 196, 203, 308], 'Diamond'], ['Shauntal', 'shauntal', 'Elite Four', 7, [609, 623, 563, 593, 426, 354], 'Black'], ['Grimsley', 'grimsley', 'Elite Four', 16, [625, 560, 510, 553, 461, 430], 'Black'],
    ['Caitlin', 'caitlin', 'Elite Four', 13, [576, 579, 518, 561, 475, 376], 'Black'], ['Marshal', 'marshal', 'Elite Four', 1, [534, 620, 538, 539, 448, 68], 'Black']],
  rival: [['Blue', 'blue', 'Rival', 0, [18, 65, 112, 130, 59, 103], 'Rival Blue>>FireRed'], ['Silver', 'silver', 'Rival', 16, [160, 215, 169, 82, 94, 65], 'HeartGold'], ['Barry', 'barry', 'Rival', 10, [395, 398, 214, 78, 407, 143], 'Brilliant'], ['Wally', 'wally|wally-rse', 'Rival', 13, [282, 334, 301, 315, 82, 475], 'Wally'],
    ['Hugh', 'hugh', 'Rival', 9, [500, 521, 512, 626, 330, 604], 'Rival \\(B2'], ['Cheren', 'cheren', 'Rival', 0, [508, 521, 510, 512, 573, 628], 'White - Rival'], ['Bianca', 'bianca', 'Rival', 13, [518, 508, 516, 609, 591, 500], 'White - Rival'], ['N', 'n', 'Rival', 16, [571, 565, 567, 584, 601, 530], 'B2 W2 - N']],
  evilboss: [['Giovanni', 'giovanni', 'Team Rocket Boss', 4, [34, 31, 464, 53, 115, 51], 'Rocket', { sc: 'building' }], ['Cyrus', 'cyrus', 'Team Galactic Boss', 16, [461, 430, 169, 130, 229, 462], 'Galactic Boss', { sc: 'mountain' }], ['Archie', 'archie-gen3|archie', 'Team Aqua Leader', 10, [319, 262, 169, 89, 342, 321], 'Leader', { sc: 'water' }],
    ['Maxie', 'maxie-gen3|maxie', 'Team Magma Leader', 4, [323, 262, 169, 110, 324, 229], 'Leader', { sc: 'mountain' }], ['Ghetsis', 'ghetsis', 'Team Plasma Leader', 16, [635, 563, 537, 626, 604, 625], 'B2 W2 - Ghetsis>>Ghetsis', { sc: 'kyurem_cave' }], ['N', 'n', 'King of Team Plasma', 15, [644, 571, 567, 565, 584, 601], 'N Final', { sc: 'black_tower_10' }]],
  /* Champion og Supreme Boss stiller ikke med nøyaktig samme lag hver gang (fx, se drawTeam): [antall faste først i laget, de som kan komme inn,
     høyst så mange legendariske blant de som kommer inn]. Esset og signaturene er faste. Alle som kan komme inn, er Pokémon treneren har brukt i
     et av spillene (omkamper, World Tournament), eller som hører til typen og stilen deres. */
  champ: [['Blue', 'blue', 'Champion', 0, [65, 18, 112, 130, 59, 103], 'Champion Blue', { sc: 'pwt', th: 'spark', cc: '#5aa2ff', fx: [2, [68, 142, 214, 248]] }],
    ['Lance', 'lance', 'Champion', 15, [149, 130, 6, 142, 230, 373], 'Lance', { sc: 'black_tower_10', th: 'flame', cc: '#ff7a2a', fx: [3, [445, 334, 612, 330]] }],
    ['Zinnia', 'zinnia', 'Lorekeeper', 15, [373, 334, 330, 612, 149, 230], 'Zinnia', { sc: 'kyurem_cave', th: 'meteor', cc: '#a98bff', fx: [2, [621, 445]] }],
    ['Steven', 'steven', 'Champion', 8, [376, 227, 306, 344, 346, 348], 'Steven & Wallace', { sc: 'cave', th: 'shard', cc: '#9fc7d8', fx: [3, [530, 567, 142]] }],
    ['Wallace', 'wallace', 'Champion', 10, [350, 321, 272, 130, 73, 340], 'Steven & Wallace', { sc: 'water', th: 'bubble', cc: '#3fd0c4', fx: [3, [121, 260, 365, 319]] }],
    ['Alder', 'alder', 'Champion', 6, [637, 617, 626, 621, 589, 584], 'Alder', { sc: 'pinwheel_road', th: 'petal', cc: '#ff9a4a', fx: [3, [534, 579, 553, 609, 628]] }]],
  supreme: [['Red', 'red', 'Legend', 9, [6, 25, 3, 9, 143, 131], 'Red & Blue|Champion & Red', { sc: 'snowy_tall_grass', fx: [5, [196, 68, 59]] }],
    ['Blue', 'blue', 'Legend', 9, [18, 65, 59, 130, 103, 464], 'Red & Blue', { sc: 'pwt', fx: [2, [68, 142, 248, 214]] }],
    ['Cynthia', 'cynthia', 'Sinnoh Champion', 15, [445, 442, 448, 350, 407, 468], 'Cynthia', { sc: 'black_tower_10', sp: 1, film: 'b:cynthia', cc: '#e9d28a', fx: [4, [423, 471, 604, 628]], st: { rel: 0.06, ev: 1.4 } }],
    ['Iris', 'iris', 'Unova Champion', 15, [612, 635, 621, 567, 306, 131], 'Iris', { sc: 'black_tower_3_5', fx: [2, [373]], st: { rel: -0.01 } }],
    ['Steven', 'steven', 'Hoenn Champion', 8, [376, 227, 306, 142, 344, 346], 'Champion Steven', { sc: 'cave', fx: [3, [348, 530, 567]] }],
    ['Colress', 'colress', 'Team Plasma', 8, [601, 462, 606, 376, 479, 474], 'Colress', { sc: 'black_tower_1_2', fx: [3, [466, 604]] }],
    /* Cynthia står over klassen sin (st), så hun er omtrent like vanskelig som Ghetsis (målt med sim/boss.js), og Iris litt under.
       Ghetsis, Champions Edition: den andre av de to helt spesielle (ved siden av Cynthia), og den sterkeste motstanderen i spillet. Laget er det han
       ville hatt om han fikk det som han ville: Hydreigon som ess, Kyurem (dragen han tvang til å lyde, sendes ut nest sist: late), og rundt dem de
       sterkeste han kunne tatt fra hvilken som helst region – Tyranitar, Gengar, Chandelure, Genesect (Team Plasmas eget våpen), Darkrai – og et par av
       hans egne (Cofagrigus, Eelektross, Drapion, Bisharp). Høyst én legendarisk til kommer inn. Laget er sterkere enn noe annet i spillet, så han har
       ikke noe tillegg i nivå eller trening utover klassen (målt: boten slår ham sjeldnere enn noen annen). Egen film (bossf.js) på Black/White-låta,
       og sitt eget sted (bossf.js, 's:Ghetsis'). */
    ['Ghetsis', 'ghetsis', 'Tyrant', 16, [635, 646, 248, 94, 609, 649], 'Black & White - Ghetsis>>Ghetsis', { sc: 'kyurem_cave', th: 'evil', sp: 1, film: 'b:ghetsis', cc: '#c8102e', cn: 'Champions Edition', fx: [2, [491, 625, 604, 461, 553, 563, 452], 1], late: 1 }]]
};
/* Hvor mange på laget som deler den verste svakheten (typene alene, uten evner). */
const weakN = ids => { let w = 0; for (let t = 0; t < 18; t++) { let n = 0; for (const id of ids) { const d = D(id); if (CH[t][d[1]] * (d[2] >= 0 && d[2] !== d[1] ? CH[t][d[2]] : 1) > 1) n++; } if (n > w) w = n; } return w; };
/* Laget en Champion eller Supreme Boss stiller med denne gangen: esset først, så resten i den rekkefølgen de står i d[4]. De faste (fx[0]) er alltid med;
   resten trekkes blant de øvrige i standardlaget og de som kan komme inn (fx[1]). Laget skal ikke bli skjevere enn standardlaget: ikke flere med samme
   svakhet (tre tillates alltid), høyst to nye med samme hovedtype (treneren egen type er unntatt), og høyst fx[2] legendariske blant de nye. */
function drawTeam(d) {
  const fx = (d[6] || {}).fx; if (!fx) return d[4];
  const core = d[4].slice(0, fx[0]), pool = d[4].slice(fx[0]).concat(fx[1]).filter((id, i, a) => a.indexOf(id) === i && !core.includes(id)), need = d[4].length - core.length, lim = Math.max(3, weakN(d[4])), legs = fx[2] == null ? 9 : fx[2];
  let best = null, bw = 99;
  for (let k = 0; k < 60; k++) {
    const p = pool.slice(), pick = [], ty = {}; let lg = 0;
    for (let i = p.length - 1; i > 0; i--) { const j = rnd(i + 1), x = p[i]; p[i] = p[j]; p[j] = x; }
    for (const id of p) { if (pick.length >= need) break; const t1 = D(id)[1], L = isLeg(id) ? 1 : 0; if (lg + L > legs || (t1 !== d[3] && (ty[t1] || 0) >= 2)) continue; ty[t1] = (ty[t1] || 0) + 1; lg += L; pick.push(id); }
    if (pick.length < need) continue;
    /* De nye står i samme rekkefølge som i lista over de som kan velges, så et lag ser likt ut uansett hvilken rekkefølge de ble trukket i. */
    pick.sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
    const team = core.concat(pick), w = weakN(team);
    if (w <= lim) return team;
    if (w < bw) { bw = w; best = team; }
  }
  return best || d[4];
}
/* Frontier Brains: de vanlige bossene i Battle Frontier. [navn, bilde, tittel, type, lag med esset først, låt]. */
const BRAIN = [['Noland', 'noland-gen3|noland', 'Factory Head', 8, [376, 130, 94, 248], 'Sapphire - Frontier'], ['Greta', 'greta-gen3|greta', 'Arena Tycoon', 1, [197, 214, 94, 286], 'Sapphire - Frontier'], ['Tucker', 'tucker-gen3|tucker', 'Dome Ace', 15, [373, 260, 6, 376], 'Sapphire - Frontier'],
  ['Lucy', 'lucy-gen3|lucy', 'Pike Queen', 3, [350, 336, 208, 130], 'Sapphire - Frontier'], ['Spenser', 'spenser-gen3|spenser', 'Palace Maven', 0, [289, 59, 131, 169], 'Sapphire - Frontier'], ['Brandon', 'brandon-gen3|brandon', 'Pyramid King', 5, [379, 377, 378, 142], 'Sapphire - Frontier'],
  ['Anabel', 'anabel-gen3|anabel', 'Salon Maiden', 13, [243, 65, 143, 196], 'Sapphire - Frontier'], ['Palmer', 'palmer', 'Tower Tycoon', 15, [149, 464, 350, 59], 'Platinum - Frontier|SoulSilver - Frontier'], ['Thorton', 'thorton', 'Factory Head', 8, [462, 437, 474, 448], 'Platinum - Frontier|SoulSilver - Frontier'],
  ['Dahlia', 'dahlia', 'Arcade Star', 9, [468, 477, 272, 257], 'Platinum - Frontier|SoulSilver - Frontier'], ['Darach', 'darach', 'Castle Valet', 1, [475, 395, 398, 229], 'Platinum - Frontier|SoulSilver - Frontier'], ['Argenta', 'argenta', 'Hall Matron', 0, [143, 248, 94, 130], 'Platinum - Frontier|SoulSilver - Frontier']];
POOL.brain = BRAIN;
TCL.brain = { i: 5, n: 'Frontier Brain', mons: 4, rel: 1, sk: 1, iv: 22, ev: 24, q: 2, coin: 0, xp: 0, slack: 99 };

/* Ligaen: uendelig, i runder på LAPN kamper. Kamp 1 er alltid en vanlig trener. Derfra stiger klassen for hver kamp, som oftest ett trinn (CLIMBUP),
   en sjelden gang to (CLIMBJUMP), og noen ganger blir den stående – så samme runde kan bli lettere eller tyngre enn forrige. Før finalen går det
   ikke høyere enn klasse CLIMBTOP (Evil Leader). Kamp LAPN er alltid en Champion, med en liten sjanse (SUPP) for en av de aller største i stedet:
   oftest Cynthia eller Ghetsis i Champions Edition (SPW), som har egen film, eget lag og ekstra belønning. Hvem som venter, vises ikke før introen.
   S.lad.c = klassen til den du sist slo i runden (0 ved rundestart). Så starter en ny runde med høyere nivå, større lag og bedre belønninger. */
/* De to spesielle (sp: Cynthia og Ghetsis i Champions Edition) gir i tillegg til klassens belønning: dobbelt så mange mynter, SPCANDY Rare Candy
   (rett i veska, ikke skåret ned som ligaens ellers), en Mega Stone, en shiny av sin egen signatur-Pokémon (SPSIG, i første form), et legendarisk
   møte, og første gang hver av dem er slått, en Master Ball. res.sp beskriver det for resultatskjermen. */
const SPSIG = { Cynthia: 443, Ghetsis: 633 }, SPCANDY = 6;
const LAPN = 8, CLIMBUP = 0.7, CLIMBJUMP = 0.12, CLIMBTOP = 7, SPW = 3;
/* Mynter og Rare Candy i ligaen målt mot klassetabellen (stilt inn sammen med Battle Frontier og cupen, så en dag i hver modus er omtrent like mye verdt
   og dagens bonus avgjør valget). */
const LGCOIN = 0.6, LGCANDY = 0.25, LGXP = 0.8;
/* Rundebonusen på mynter: litt mer for hver runde du har vunnet (før +20 % per runde opp til det dobbelte, som lot ligaen løpe fra de andre modusene). */
const lapCoin = lap => 1 + Math.min(0.5, 0.1 * (lap || 0));
const SUPP = lap => Math.min(0.25, 0.1 + 0.03 * (lap || 0));
/* Klassen (1–7) i kamp n (0-basert) når forrige kamp var klasse c0. Aldri høyere enn kampnummeret, og aldri lavere enn halve veien. */
function climb(n, c0) {
  if (n <= 0) return 1;
  const r = Math.random(), c = (c0 || 1) + (r < CLIMBJUMP ? 2 : r < CLIMBJUMP + CLIMBUP ? 1 : 0);
  return Math.max(1, Math.floor((n + 1) / 2), Math.min(CLIMBTOP, n + 1, c));
}
/* Hvilken toppboss som dukker opp i Battle Frontier: oftest en leder (klasse 7), sjeldnere en mester (8), og sjeldnest de aller største (9). */
const pickUltra = lap => { const r = Math.random(), s = Math.min(0.25, 0.1 + 0.03 * (lap || 0)), c = Math.min(0.35, 0.3 + 0.01 * (lap || 0)); return r < s ? 'supreme' : r < s + c ? 'champ' : 'evilboss'; };
/* Hvor i runden kamp nummer n (0-basert) ligger: hvor langt (rd, for de vanlige trenerne og musikken), om det er finalen, og laveste nivå uansett lag. */
function rungInfo(n, lap) {
  return { n, rd: Math.min(4, Math.floor(n / 2)), boss: n > 0, final: n >= LAPN - 1, k: n <= 0 ? 'trainer' : n >= LAPN - 1 ? 'final' : 'climb', floor: Math.round(5 + n * 2.2 + 6 * (lap || 0)) };
}
/* Vanlige trenere blir bedre utover i runden: flere Pokémon, smartere spill og bedre lag. */
const trainerCls = rd => Object.assign({}, TCL.trainer, { mons: rd >= 2 ? 4 : 3, rel: 0.93 + 0.008 * rd, sk: 0.5 + 0.05 * rd, iv: 6 + 2 * rd, q: rd >= 1 ? 1 : 0, coin: 60 + 12 * rd, xp: 1 + 0.04 * rd });
/* Lagene vokser med rundene (høyst seks). */
const teamSize = (st, lap) => Math.min(6, st.mons + (lap >= 3 ? 2 : lap >= 1 ? 1 : 0));

/* Belønninger følger fokustiden den dagen kampene ble åpnet, målt mot dagsmålet ditt (S.cap, det samme som taket før laget blir slitent):
   ×0,5 uten studering og full uttelling når målet er nådd. Et høyere mål gir en høyere topp (4 t: ×2,0 · 6 t: ×2,5 · 8 t: ×3,0), så det lønner seg
   å sette målet der du faktisk vil ligge – men bare hvis du når det. XP svinger mindre. Kampene er hovedkilden til mynter, så dette er
   den viktigste premien for å studere: samme seier betaler fem ganger så mye på en dag der målet er nådd som på en dag uten studering. */
/* Med arbeidsdager kommer kreditten for arbeid og studier etter jobb i tillegg (day.b). */
const ladMin = () => { const d = S.log[S.lad.day || dayKey()] || {}; return (d.m || 0) + (d.b || 0); };
const goalMin = () => Math.max(60, S.cap || 360);
const topFor = c => Math.round((1 + Math.max(60, c) / 240) * exf() * 10) / 10;
const goalTop = () => topFor(goalMin());
const goalPart = () => Math.min(1, ladMin() / goalMin());
const studyMult = () => Math.round((0.5 + goalPart() * (goalTop() - 0.5)) * 10) / 10;
/* XP og Rare Candy fra kampene følger også fokustiden, fra ×0,7 uten studering til ×1,3 når dagsmålet er nådd (før 0,8–1,2 for XP, og ikke i det
   hele tatt for Rare Candy): da skiller studietiden mer på hvor fort laget vokser. candyRoll(x) = antall Rare Candy når satsen er x. */
const xpMult = () => (0.7 + goalPart() * 0.6) * exf();
const candyRoll = x => { const y = x * xpMult() * (diff().candy || 1); return Math.floor(y) + (Math.random() < y - Math.floor(y) ? 1 : 0); };
/* Dagens første seier gir doble mynter (S.lad.fw = dagen den er brukt). */
const firstWin = () => S.lad.fw !== (S.lad.day || dayKey());
const ladLost = () => !!S.lad.lost && S.lad.lost === (S.lad.day || dayKey());
/* Én runde per ligadag: er runden vunnet i dag, er ligaen ferdig til neste ligadag. */
const ladDone = () => !!S.lad.lapd && S.lad.lapd === (S.lad.day || dayKey());
/* Kampene åpnes først når dagen har OPENMIN minutter fokus (før holdt det å starte og stoppe en økt). openNeed = minutter som mangler. */
const openNeed = () => Math.max(0, OPENMIN - todayMin());
/* Forsøk per dag: i ligaen avslutter et tap hele runden (LIVES; Easy tåler ett tap), Frontier tåler to løp (FACLIVES; tre fra 16.11 til steg 1b.6, mens den var for tung tidlig), turneringen er én cup og
   raidet ett forsøk. Taper du i ligaen, starter du på kamp 1 neste ligadag: det er ingen omkamp mot den som slo deg. */
/* Veska: så mange gjenstander kan brukes per kamp. Ellers kunne nok Revive vinne enhver kamp. */
const BAGN = 3, bagN = () => diff().bag;
const LIVES = 1, ladFails = () => { const t = S.lad.tries, d = S.lad.day || dayKey(); return t && t.d === d ? t.n : 0; };
const FACLIVES = 2, facFails = () => { const t = S.fac.tries, d = S.lad.day || dayKey(); return t && t.d === d ? t.n : 0; };
/* Kampdagen kan også stenges uten kamper: «Not today» (S.lad.skip) eller en godtatt simulering (S.lad.simd). Mens en simulering venter på svar
   (simPending), står kampene stille. dayDone = alt som kan spilles denne kampdagen, er spilt, simulert eller hoppet over. */
const dayShut = () => !!S.lad.day && (S.lad.skip === S.lad.day || S.lad.simd === S.lad.day);
const simPending = () => S.sim && S.lad.day && S.sim.day === S.lad.day ? S.sim : null;
const dayStop = () => dayShut() || !!simPending();
const ladderOpen = () => !!S.lad.day && !dayStop() && !ladLost() && !ladDone() && modeOn('league');
/* Stengt når dagens tap har nådd taket. Tapene telles på nytt, så et høyere tak gir et nytt forsøk samme dag. */
const facLost = () => !!S.fac.lost && S.fac.lost === (S.lad.day || dayKey()) && facFails() >= facLives();
const facOpen = () => !!S.lad.day && !dayStop() && !facLost() && modeOn('factory');
/* Dagens bonus: datoen avgjør hvilken av de tre modusene som gir ekstra, likt for alle som spiller. Bonusen er DAYCOIN ganger mynter
   (i tillegg litt mer XP i ligaen og litt mer flaks i Frontier, som før). */
const MODES = ['league', 'factory', 'pwt'], MODEN = { league: 'Trainer League', factory: 'Battle Frontier', pwt: 'World Tournament', week: 'Expedition' }, DAYCOIN = 1.5;
function dayBoost() {
  /* Dagene går i bolker på tre, og i hver bolk har hver modus bonusen én gang, i en rekkefølge som skifter fra bolk til bolk.
     (Før fulgte den en enkel sum av datoen, og da ble bonusen stående på samme modus i opptil åtte dager.) */
  const d = S.lad.day || dayKey(), q = d.split('-').map(Number); let n = Math.round(Date.UTC(q[0], q[1] - 1, q[2]) / 864e5);
  if (!isFinite(n)) { n = 7; for (let i = 0; i < d.length; i++) n = (n * 31 + d.charCodeAt(i)) >>> 0; }
  let h = Math.imul(Math.floor(n / 3) + 0x9e3779b9, 0x85ebca6b) >>> 0; h = (h ^ (h >>> 15)) >>> 0; h = Math.imul(h, 0xc2b2ae35) >>> 0; h = (h ^ (h >>> 13)) >>> 0;
  const perm = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]][h % 6];
  return { mode: MODES[perm[((n % 3) + 3) % 3]], m: 1.5, xp: 1.3, c: DAYCOIN };
}
/* ---------- Dagens modus ----------
   Når kampene åpnes («Done for today»), velger du MODESN av de tre modusene for den kampdagen. De andre er stengt til neste kampdag.
   S.mode = { day, ks } gjelder kampdagen day. Valget kan ikke gjøres om, heller ikke ved å starte en ny økt og åpne kampene igjen samme dag.
   Dagens special event trekkes i det første modus velges, blant dem som gir noe i den modusen (EVMODE). */
const MODESN = 1;
const modeSt = () => { const d = S.lad.day; if (d && (!S.mode || S.mode.day !== d)) S.mode = { day: d, ks: [] }; return S.mode && S.mode.day === d ? S.mode : { day: d, ks: [] }; };
const modeOn = k => !!S.lad.day && (MODESN >= MODES.length || modeSt().ks.includes(k));
const modePicks = () => !S.lad.day || MODESN >= MODES.length ? 0 : Math.max(0, MODESN - modeSt().ks.length);
function modePick(k) {
  /* Ekspedisjonen (week.js) er et fjerde valg på dager den står åpen. Den har ingen special event: uka er lik for alle. */
  const M = modeSt(), wk = k === 'week' && typeof wkOffer === 'function' && !!wkOffer(); if (!S.lad.day || !(MODES.includes(k) || wk) || M.ks.includes(k) || M.ks.length >= MODESN) return false;
  M.ks.push(k); if (!wk) evRoll(k); stamp(); save(); return true;
}
/* Myntgangeren i en modus akkurat nå: studiebonusen, dagens event og dagens bonusmodus. */
const smFor = k => Math.round(studyMult() * evCoin() * (dayBoost().mode === k ? DAYCOIN : 1) * 10) / 10;

/* ---------- Kampen som er i gang ----------
   Når en kamp starter, står den i lagringen (S.live = { m: modus, d: kampdag, dev: enheten, at, u: sjelden boss }), og selve kampen lagres på enheten
   etter hver runde (LIVEK). Lukkes appen, fortsetter kampen der den var neste gang. Finnes ikke kampen på enheten lenger, teller den som tapt
   (liveLoss). En kamp som er i gang på en annen enhet, må gjøres ferdig der eller gis opp her. Demokamper lagres ikke. */
const LIVEK = 'fokusdex.live';
const liveMine = () => !!S.live && S.live.dev === devId();
function liveBegin(B) {
  if (!B || B.mode === 'lab' || SBX) return;
  S.live = { m: B.mode, d: B.mode === 'raid' ? dayKey() : (S.lad.day || dayKey()), dev: devId(), at: Date.now(), u: B.tr && B.tr.ultra ? 1 : 0, n: B.tr ? B.tr.n : '' };
  lockMark(B.mode);
  stamp(); liveSave(B); save();
}
function liveSave(B) { if (!B || B.mode === 'lab' || SBX || !liveMine()) return; try { localStorage.setItem(LIVEK, JSON.stringify({ v: 1, at: S.live.at, B: battleSnap(B) })); } catch (_) {} }
function liveEnd() { if (SBX) { delete S.live; return; } if (S.live) { delete S.live; stamp(); } try { localStorage.removeItem(LIVEK); } catch (_) {} }
/* LÅSEN UNDER ET LØP (steg 1b.7, Jazz 14.11): «Man skal ikke kunne endre lag eller lvl opp pokemonene underveis etter du har startet en av
   game modusene … fordi da kan man se motstanderens lag og lvl opp, og det er juks.» runLock() gir modusen som låser ('league', 'factory'
   eller 'pwt'), eller '' når alt er åpent. Låsen står fra FØRSTE KAMP i løpet på denne kampdagen til løpet er over:
     ligaen     fra første kamp i dag til runden er tapt eller klar (S.lad.lk = kampdagen)
     Frontier   fra første kamp i dag til løpet er tapt eller vunnet (S.fac.run.lk = kampdagen; et nytt løp er åpent til sin første kamp)
     turneringen fra første runde til du er ute eller har vunnet (S.pwt.run.lk)
   Den slipper også når kampdagen er over: en ny økt (startTimer nuller S.lad.day), «Not today» eller en godtatt simulering. Før første
   kamp og etter løpet er alt åpent, så laget kan stilles etter den første motstanderen, men ikke etter de neste.
   LÅST: hvem som er på laget og hvem som er partner, Rare Candy, trening (EV, Hyper Training), utvikling, det de holder, Mega-steinen,
   formen, angrepene (valget, lærerne og egg-angrepene) og vanskelighetsgraden. game.js spør locked() i hver av dem, og ui.js stopper
   trykket med en forklaring (LOCKA, lockMsg). SOM FØR: hvem som leder i hver kamp, XP-en laget får av kampene (og angrepet et nytt nivå
   tilbyr), byttet en boss tilbyr, og fangst (den nye går i boksen mens laget er låst). Raid låser ikke, og Sandbox er unntatt. */
function lockMark(mode) {
  const d = S.lad.day || dayKey();
  if (mode === 'league') S.lad.lk = d; else if (mode === 'fac' && S.fac.run) S.fac.run.lk = d; else if (mode === 'pwt' && S.pwt && S.pwt.run) S.pwt.run.lk = d; else if (mode === 'wk' && S.wk && S.wk.run) S.wk.run.lk = d;
}
function runLock() {
  if (SBX || SIMRUN) return '';
  const lm = S.live && S.live.m;
  if (lm === 'league' || lm === 'pwt') return lm;
  if (lm === 'fac') return 'factory';
  if (lm === 'wk') return 'week';
  const d = S.lad.day; if (!d || dayShut()) return '';
  if (S.lad.lk === d && !ladLost() && !ladDone()) return 'league';
  if (S.fac.run && S.fac.run.lk === d) return 'factory';
  const P = S.pwt && S.pwt.run; if (P && P.lk && P.day === d) return 'pwt';
  if (S.wk && S.wk.run && S.wk.run.lk === d) return 'week';
  return '';
}
/* Én linje til spilleren: hva som låser, og når det åpnes igjen. full = 1: også hva som er låst (banneret i Team og under Settings). */
const LOCKTXT = {
  league: ['Locked during your League lap.', 'It opens when the lap is won or lost.'],
  factory: ['Locked during your Frontier run.', 'It opens when the run is over.'],
  pwt: ['Locked during the cup.', 'It opens when you are out or have won it.'],
  week: ['Locked during your expedition.', 'It opens when the expedition is over.']
};
function lockMsg(full) {
  const k = runLock(); if (!k) return '';
  const t = LOCKTXT[k];
  return tl(t[0]) + ' ' + (full ? tl('Your team, its levels, training, items, moves and the difficulty stay as they were at the first battle.') + ' ' : '') + tl(t[1]);
}
/* Kampen som ble forlatt, hvis den finnes på denne enheten og hører til merket i lagringen. */
function liveLoad() {
  if (!liveMine()) return null;
  try { const o = JSON.parse(localStorage.getItem(LIVEK) || 'null'); if (!o || o.v !== 1 || o.at !== S.live.at || !o.B || !Array.isArray(o.B.me) || !o.B.me.length) return null; return battleRestore(o.B); } catch (_) { return null; }
}
/* Kampen kan ikke gjøres ferdig (den finnes ikke på enheten, eller den gis opp fra en annen enhet): den teller som tapt, uten XP. */
function liveLoss() {
  const L = S.live; if (!L) return '';
  delete S.live; try { localStorage.removeItem(LIVEK); } catch (_) {}
  const d = L.d || S.lad.day || dayKey(), used = t => (t && t.d === d ? t.n : 0) + 1; let what = 'battle';
  if (L.m === 'league') {
    ladLose(d); what = 'League battle';
  } else if (L.m === 'fac') {
    const R = S.fac.run, n = used(S.fac.tries); if (R) S.fac.best = Math.max(S.fac.best || 0, R.streak || 0); S.fac.tries = { d, n }; if (n >= facLives()) S.fac.lost = d; S.fac.run = null; what = 'Frontier run';
  } else if (L.m === 'pwt') { pwt().run = null; what = 'cup';
  } else if (L.m === 'wk') { if (typeof wkEnd === 'function') wkEnd('lost'); what = 'expedition battle';
  } else if (L.m === 'raid') {
    const R = S.raid; what = 'raid';
    if (R) { R.day = dayKey(); R.tries = (R.tries || 0) + 1; R.told = 1; if (R.tries >= raidTries(R)) raidGone(); }
  }
  stamp(); save();
  return what;
}

/* ---------- Special events ----------
   Noen kampdager er spesielle. Hva som skjer, avgjøres i det kampene åpnes («Done for today») og vises ikke før da. Alt er fordeler: ingen event
   gjør noe vanskeligere, og en dag uten event er en helt vanlig dag. Dagene telles i kampdager, ikke i kalenderdager, så en dag uten studering
   bruker ikke opp noe. S.evt = { day, k, ty, stars } gjelder kampdagen day (k = '' når dagen er vanlig), S.evg = kampdager siden sist.
   surge:  høyst SURGEN av dine som har en Mega-form, starter kampen i den (uten ring og stein). Du velger hvem (S.evt.mg = u-ene deres);
           uten valg er det de første på laget som har en form. Leide Pokémon i Frontier: de SURGEN første på laget.
   type:   dagens type får +15 % i alle verdier, og møtene du vinner er oftere av den typen.
   stars:  tre av dine egne som ikke står på laget, står i rampelyset: de kjemper på lagets nivå med +20 % i alle verdier.
   little: de som ennå kan utvikle seg, får +35 % i alle verdier.
   gold:   alle kamper gir 1,5 ganger så mange mynter. wind: ett forsøk til i ligaen og ett løp til i Frontier.
   lucky:  fem ganger så stor sjanse for shiny på alt du vinner eller åpner, og hver boss gir ett møte ekstra. camp: trening koster 40 % mindre. */
const EVENTS = {
  surge: { n: 'Mega Surge', c: '#b9a5e8', c2: '#7fd4f5', ic: 'M', s: 'Three Mega forms for free', d: 'Three of your Pokémon that have a Mega form start each battle Mega Evolved today, and you choose which three. No ring and no stones needed, and your own Mega is still yours to use.' },
  type: { n: 'Festival', c: '#a6c59c', c2: '#e3c577', ic: '✦', s: '+15 % in every stat', d: '' },
  stars: { n: 'Spotlight', c: '#e3c577', c2: '#f1ede6', ic: '★', s: 'Three of yours shine', d: "Three Pokémon from your box are in the spotlight. Put them on the team: they fight at your team's level with +20 % in every stat, and keep the XP they earn." },
  little: { n: 'Little League', c: '#a6c59c', c2: '#7fa8e6', ic: '◔', s: '+35 % for the small ones', d: 'Your Pokémon that can still evolve get +35 % in every stat today.' },
  gold: { n: 'Gold Rush', c: '#e3c577', c2: '#d98f7e', ic: '◎', s: 'Coins ×1.5', d: 'Every battle pays one and a half times the coins today, raids included.' },
  wind: { n: 'Second Wind', c: '#7fa8e6', c2: '#a6c59c', ic: '↻', s: 'One more attempt', d: 'One more attempt in the League and one more run in the Frontier today.' },
  lucky: { n: 'Lucky Day', c: '#e3a8cb', c2: '#e3c577', ic: '✧', s: 'Shiny odds ×5', d: 'Shiny odds are five times as high on every encounter you win or open today, and every boss gives one encounter more.' },
  camp: { n: 'Training Camp', c: '#d98f7e', c2: '#e3c577', ic: '▲', s: 'Training −40 %', d: 'Training points and Hyper Training cost 40 % less today.' }
};
const EVGAP = [0, 0.35, 0.65, 1], EVSTAT = { type: 1.15, stars: 1.2, little: 1.35 }, EVCOIN = 1.5, EVSHINY = 5, EVCAMP = 0.6, SURGEN = 3;
const evNow = () => { const e = S.evt; return e && e.k && EVENTS[e.k] && !!S.lad.day && e.day === S.lad.day ? e : null; };
const evIs = k => { const e = evNow(); return !!e && e.k === k; };
const evCoin = () => evIs('gold') ? EVCOIN : 1, evShiny = () => evIs('lucky') ? EVSHINY : 1, evPrice = () => evIs('camp') ? EVCAMP : 1;
const evSm = () => Math.round(studyMult() * evCoin() * 10) / 10;
/* Ekstra forsøk i Frontier i dag, gitt i lagringen (S.fac.xb = { d, n }; Jazz 16.11). carry rører det ikke, så det overlever en ny lagring. */
/* Ekstra forsøk i Frontier til alle en bestemt kampdag (Jazz 16.11: «Ett forsøk til hos begge»). Går ut av seg selv dagen etter. */
const FACGIFT = { '2026-11-16': 1 }, facGift = () => FACGIFT[S.lad.day || dayKey()] || 0;
const facXb = () => { const x = S.fac && S.fac.xb, d = S.lad.day || dayKey(); return x && x.d === d ? Math.max(0, x.n | 0) : 0; };
const ladLives = () => (diff().lives || LIVES) + (evIs('wind') ? 1 : 0), facLives = () => FACLIVES + (evIs('wind') ? 1 : 0) + facXb() + facGift();
/* Et tap i ligaen på kampdagen d. Er forsøkene brukt opp, er runden over: ligaen stenger for dagen, og neste ligadag starter du på kamp 1 igjen
   (S.lad.fell = hvor langt du kom). Har du et forsøk igjen (Easy, eller Second Wind), står den samme treneren der til omkamp. Gir forsøk igjen i dag. */
function ladLose(d) {
  const L = S.lad, n = (L.tries && L.tries.d === d ? L.tries.n : 0) + 1, left = Math.max(0, ladLives() - n);
  L.tries = { d, n };
  if (!left) { L.lost = d; L.fell = L.n; L.n = 0; L.c = 0; L.seen = []; L.next = null; L.fork = null; }
  else if (L.next) L.next.fail = d;
  return left;
}
const canEvolve = id => !!(EVO[id] || []).length;
/* Navn, farger og tekst for dagens event (typefestivalen tar farge og navn fra typen). */
function evInfo(e) {
  const E = EVENTS[e.k];
  if (e.k === 'type') return Object.assign({}, E, { n: `${TYN[e.ty]} Festival`, c: `var(--t${e.ty})`, d: `Your ${TYN[e.ty]}-type Pokémon get +15 % in every stat today, and the encounters you win are more often ${TYN[e.ty]} types.` });
  if (e.k === 'wind' && MODESN < MODES.length) { const ks = modeSt().ks; if (ks.length === 1 && ks[0] === 'league') return Object.assign({}, E, { s: 'One more attempt', d: 'You can lose once in the League today and still go on.' }); if (ks.length === 1 && ks[0] === 'factory') return Object.assign({}, E, { s: 'One more run', d: 'One more run in the Battle Frontier today.' }); }
  return E;
}
/* Mega Surge: hvem av dine som starter i Mega-formen i dag (u-ene, høyst SURGEN). Valget ligger i e.mg; før noe er valgt, er det de første på laget
   som har en form. surgeCan = alle du eier som kan velges. surgeToggle legger til eller tar bort én (false når det allerede står SURGEN der). */
const surgeOk = u => { const m = monBy(u); return !!m && megaOpts(m.id).length > 0; };
function surgeList(e) {
  e = e || evNow(); if (!e || e.k !== 'surge') return [];
  return (Array.isArray(e.mg) ? e.mg : S.party).filter(surgeOk).slice(0, SURGEN);
}
const surgeCan = () => S.mons.filter(m => megaOpts(m.id).length > 0).sort((a, b) => (S.party.includes(b.u) - S.party.includes(a.u)) || b.lv - a.lv);
function surgeToggle(u) {
  const e = evNow(); if (!e || e.k !== 'surge' || !surgeOk(u) || runLock()) return false;
  const l = surgeList(e), i = l.indexOf(u);
  if (i >= 0) l.splice(i, 1); else { if (l.length >= SURGEN) return false; l.push(u); }
  e.mg = l; return true;
}
/* Er dette en av dine egne (og ikke en leid i Frontier eller en kopi uten plass i boksen)? */
const evOwn = src => src.u != null && !!monBy(src.u) && monBy(src.u).id === src.id;
/* Fordelen en av dine får i dag: m = ganger i alle verdier (1 = ingen), mega = formen den starter i, lv = nivået den kjemper på. */
function evBoost(src, e) {
  e = e || evNow(); const o = { m: 1, mega: 0, lv: 0 }; if (!e || !src) return o;
  const ty = mTypes(src);
  if (e.k === 'type' && ty.includes(e.ty)) o.m = EVSTAT.type;
  else if (e.k === 'stars' && src.u && (e.stars || []).includes(src.u)) { o.m = EVSTAT.stars; const L = Math.round(leagueLv()); if (src.lv < L) o.lv = L; }
  else if (e.k === 'little' && canEvolve(src.id)) o.m = EVSTAT.little;
  else if (e.k === 'surge' && !src.mega && (!evOwn(src) || surgeList(e).includes(src.u))) { const k = megaOpts(src.id); if (k.length) o.mega = k.includes(src.ms) ? src.ms : k[0]; }
  return o;
}
/* De som står i rampelyset kjemper på lagets nivå: kampen får en kopi med det nivået. XP-en går likevel til den ekte (grantXp slår opp på u). */
const evSrc = m => { const b = evBoost(m); return b.lv ? Object.assign({}, m, { lv: b.lv, mv: m.mv }) : m; };
/* Legger dagens fordeler på laget ditt i en kamp som nettopp er laget. Motstanderne røres aldri. evb = merket på kampskjermen. */
function evApply(B) {
  const e = evNow(); if (!e || !B || B.mode === 'lab') return B;
  B.ev = e.k;
  let mg = 0;
  for (const b of B.me) {
    const o = evBoost(b.src, e);
    /* Høyst SURGEN starter som Mega: dine egne er valgt på forhånd (surgeList), leide telles i rekkefølgen de står. */
    if (o.mega && !b.mega && mg >= SURGEN) o.mega = 0;
    if (o.mega && !b.mega) { mg++; const st = statsOf(Object.assign({}, b.src, { mega: o.mega })), g = MEGA[o.mega - 1]; b.st = [b.st[0]].concat(st.slice(1)); b.ty = [g[2], g[3]]; b.mega = o.mega; b.mg = 0; b.name = b.src.nn || megaName(o.mega); b.evb = 'surge'; }
    if (o.m > 1) { b.st = b.st.map(v => Math.max(1, Math.round(v * o.m))); b.max = b.hp = b.st[0]; b.evb = e.k; }
  }
  return B;
}
/* En linje i oppsummeringen når dagens event ga noe ekstra i denne kampen. */
const evPerk = res => { if (evIs('gold') && res.coins > 0) res.perks.push('Gold Rush: one and a half times the coins.'); };
const pickW = W => { const ks = Object.keys(W).filter(k => W[k] > 0); let x = Math.random() * ks.reduce((s, k) => s + W[k], 0); for (const k of ks) { x -= W[k]; if (x <= 0) return k; } return ks[ks.length - 1]; };
/* Tre fra boksen til rampelyset: helst slike som kan brukes (ferdig utviklet eller sterke nok), og aldri to av samme art. */
function pickStars() {
  const out = S.mons.filter(m => !S.party.includes(m.u)), good = out.filter(m => !canEvolve(m.id) || bstSum(m.id) >= 420);
  const pool = (good.length >= 3 ? good : out.length >= 3 ? out : S.mons).slice().sort(() => Math.random() - 0.5), seen = new Set(), res = [];
  for (const m of pool) { if (seen.has(m.id)) continue; seen.add(m.id); res.push(m.u); if (res.length === 3) break; }
  return res;
}
/* Trekker dagens event første gang kampene åpnes den dagen. Den aller første gangen er det alltid et event; siden blir sjansen større for hver
   vanlig kampdag (EVGAP), og aldri to dager på rad. Bare eventer som gir deg noe, er med i trekningen. */
const EVMODE = { league: ['surge', 'type', 'stars', 'little', 'gold', 'wind', 'lucky', 'camp'], factory: ['surge', 'type', 'gold', 'wind', 'lucky', 'camp'], pwt: ['surge', 'type', 'stars', 'little', 'gold', 'lucky', 'camp'] };
function evRoll(mode) {
  const day = S.lad.day; if (!day) return null;
  if (jOn() && (S.jd || 0) < JOURNEY.find(f => f[0] === 'held')[1]) { S.evt = { day, k: '' }; return null; }
  if (S.evt && S.evt.day === day) return evNow();
  const first = !S.evt, gap = S.evg || 0;
  if (!first && !(Math.random() < EVGAP[Math.min(3, gap)])) { S.evt = { day, k: '' }; S.evg = gap + 1; return null; }
  const megaN = S.mons.filter(m => !m.mega && megaOpts(m.id).length).length, lit = S.mons.filter(m => canEvolve(m.id)).length, tyc = {};
  S.mons.forEach(m => mTypes(m).forEach(t => { if (t >= 0) tyc[t] = (tyc[t] || 0) + 1; }));
  const tys = Object.keys(tyc).map(Number).filter(t => tyc[t] >= 2 && t !== S.evlt);
  const W = { surge: megaN ? 1.3 : 0, type: tys.length ? 1.6 : 0, stars: S.mons.length >= 8 ? 1.2 : 0, little: lit >= 2 ? 1 : 0, gold: 1.2, wind: 1, lucky: 1, camp: 0.8 };
  if (S.evl) W[S.evl] = 0;
  if (mode && EVMODE[mode]) for (const x in W) if (!EVMODE[mode].includes(x)) W[x] = 0;
  const k = first && megaN ? 'surge' : pickW(W), e = { day, k };
  if (k === 'type') { e.ty = tys[rnd(tys.length)]; S.evlt = e.ty; }
  if (k === 'stars') e.stars = pickStars();
  S.evt = e; S.evl = k; S.evg = 0; S.evn = (S.evn || 0) + 1;
  return e;
}

/* ---------- Lagbygging ---------- */
/* Går ned til en tidligere form hvis nivået er for lavt for arten (slack = hvor mye for tidlig bosser får utvikle). */
function fitForm(id, lv, slack) { while (stageOf(id) > 0 && lv < reqLv(id) - slack && !(D(D(id)[4])[6] & 4)) id = D(id)[4]; return id; }
/* Angrepene til en motstander. q = 0: de fire nyeste. q = 1: beste angrep per type pluss ett nyttig statusangrep. q = 2: som 1, og kan angrep fra litt høyere nivå. */
function foeMoves(id, lv, q) {
  let all = movesAt(id, lv + (q >= 2 ? 8 : 0));
  /* q = 3 (toppene i ligaen og turneringen, steg 1b.8): også det formene før lærte, og det lærerne kan lære arten. */
  if (q >= 3) all = all.concat(preMoves(id, lv), tutFoe(id, lv)).filter((x, i, a) => a.indexOf(x) === i);
  all = all.filter(x => !DEADMV.has(x));
  if (!q || all.length <= 4) return defaultMoves(id, lv);
  const d = D(id), st = BST[id - 1], phys = st[1] >= st[3];
  const val = x => {
    const m = MOVES[x]; let p = (m[2] || (m[0] === 'Return' && q >= 3 ? 100 : FIXED[m[0]] ? 45 : 60)) * (m[3] ? m[3] / 100 : 1) * (m[13] ? (m[13] + m[14]) / 2 : 1);
    if (CHARGE[m[0]] || RECHARGE.has(m[0])) p *= 0.55;
    if (BOOM.has(m[0]) || ['Dream Eater', 'Focus Punch', 'Last Resort', 'Fake Out', 'Snore', 'Synchronoise', 'Final Gambit', 'Counter', 'Mirror Coat', 'Metal Burst', 'Endeavor'].includes(m[0])) p *= 0.3;
    /* Toppene: angrep som koster en runde eller slagkraften teller mindre, og Normal dekker ingenting for den som ikke er Normal selv. */
    if (q >= 3 && (m[0] === 'Sky Attack' || m[0] === 'Overheat' || m[0] === 'Future Sight' || m[0] === 'Doom Desire' || (m[1] === 0 && d[1] !== 0 && d[2] !== 0))) p *= 0.6;
    if (m[9] < 0) p *= 0.9; if (m[6] === 9) p = 30;
    return p * (((m[4] === 1) === phys) ? 1 : 0.7) * (m[1] === d[1] || m[1] === d[2] ? 1.5 : 1);
  };
  const sval = x => {
    const m = MOVES[x], n = m[0];
    if (m[6] === 1) return m[7] === 2 ? 9 : m[7] === 1 || m[7] === 4 || n === 'Toxic' || m[7] === 18 ? 7 : m[7] === 5 || m[7] === 6 || m[7] === 14 ? 5 : 2;
    if (m[6] === 3 || n === 'Rest') return 6;
    if (m[12].length && m[17] === 1) {
      /* Toppene bygger ikke opp den slagkraften de ikke bruker (Swords Dance på en som slår spesielt). */
      if (q >= 3) { const up = i => m[12].some(s => s[0] === i && s[1] > 0); if ((up(2) && !up(4) && !up(6) && !phys) || (up(4) && !up(2) && !up(6) && phys)) return 1; }
      return m[12].reduce((a, s) => a + Math.max(0, s[1]), 0) >= 2 ? 7 : 4;
    }
    if (['Reflect', 'Light Screen', 'Stealth Rock', 'Substitute', 'Protect', 'Rain Dance', 'Sunny Day', 'Sandstorm', 'Hail', 'Taunt', 'Roar', 'Whirlwind'].includes(n)) return 5;
    return m[12].length ? 2 : UM[n] ? 2 : 0;
  };
  const dmg = all.filter(x => MOVES[x][4] > 0).sort((a, b) => val(b) - val(a)), stat = all.filter(x => MOVES[x][4] === 0).sort((a, b) => sval(b) - sval(a)), pick = [], tys = new Set();
  for (const x of dmg) { if (pick.length >= 3) break; if (tys.has(MOVES[x][1])) continue; pick.push(x); tys.add(MOVES[x][1]); }
  if (stat.length && sval(stat[0]) >= 4) pick.push(stat[0]);
  for (const x of dmg) { if (pick.length >= 4) break; if (!pick.includes(x)) pick.push(x); }
  for (const x of stat) { if (pick.length >= 4) break; if (!pick.includes(x)) pick.push(x); }
  return boostFix(pick.slice(0, 4), dmg, stat, sval);
}
/* ET BOOST SKAL PASSE TIL ANGREPENE I SETTET (steg 1c.2, Jazz 17.11: «har flere ganger fått et angrep som booster Sp. Atk på en Pokémon med bare
   fysiske angrep»). boostFits: et statusangrep som bare hever Attack (Swords Dance, Bulk Up, Dragon Dance), krever at settet har fysiske angrep og
   minst like mange som spesielle; ett som bare hever Sp. Atk (Nasty Plot, Calm Mind), krever spesielle på samme måte. Angrep med fast skade og
   Foul Play teller ikke, for de bruker ikke brukerens slagkraft. Boost som hever begge, eller ingen av dem (Agility, Amnesia), passer alltid.
   boostFix bytter ut det som ikke passer: helst et annet nyttig statusangrep som passer, så det sterkeste skadeangrepet som er igjen, og ellers
   går plassen ut. Settet er ellers urørt, så motstanderne i ligaen har de samme angrepene som før der ingenting var galt. */
function boostFits(x, set) {
  const m = MOVES[x]; if (m[4] !== 0 || !m[12].length || m[17] !== 1) return true;
  const up = i => m[12].some(s => s[0] === i && s[1] > 0), a = up(2), s = up(4); if (a === s) return true;
  let ph = 0, sp = 0; for (const y of set) { const d = MOVES[y]; if (!(d[4] > 0) || FIXED[d[0]] || d[6] === 9 || d[0] === 'Foul Play') continue; if (d[4] === 1) ph++; else sp++; }
  return a ? ph > 0 && ph >= sp : sp > 0 && sp >= ph;
}
function boostFix(pick, dmg, stat, sval) {
  for (let i = 0; i < pick.length; i++) {
    if (boostFits(pick[i], pick)) continue;
    const rest = pick.filter((x, k) => k !== i), ok = x => !pick.includes(x) && boostFits(x, rest);
    const alt = [stat.find(x => ok(x) && sval(x) >= 4), dmg.find(x => !pick.includes(x)), stat.find(x => ok(x) && sval(x) > 0)].find(x => x != null);
    if (alt != null) pick[i] = alt; else pick.splice(i--, 1);
  }
  return pick;
}
/* «SUGGEST FOUR» i angrepsvalget (ønske 22): det sterkeste angrepet i hver av dens egne typer, ett som dekker det de ikke biter på, og ett taktisk.
   Regnes på det den faktisk er (verdiene nå, formen), blant angrepene den kan velge (pool, ellers alt den har lært). Angrep uten virkning er aldri med. */
function suggestMoves(m, pool) {
  const all = (pool || movesAt(m.id, m.lv).concat(m.mv, extraMoves(m))).filter((x, i, a) => a.indexOf(x) === i && !DEADMV.has(x));
  if (all.length <= 4) return all.slice();
  const st = statsOf(m), own = mTypes(m).filter(t => t >= 0), top = Math.max(st[1], st[3], 1), mvOf = x => MOVES[x][0] === 'Hidden Power' ? mvEff(null, { src: m }, MOVES[x]) : MOVES[x];
  const val = x => {
    const mv = mvOf(x), n = mv[0]; let p = (mv[2] || (FIXED[n] ? 45 : 60)) * (mv[3] ? mv[3] / 100 : 1) * (mv[13] ? (mv[13] + mv[14]) / 2 : 1);
    if (CHARGE[n] || RECHARGE.has(n)) p *= 0.55;
    if (BOOM.has(n) || ['Dream Eater', 'Focus Punch', 'Last Resort', 'Fake Out', 'Snore', 'Synchronoise', 'Final Gambit', 'Counter', 'Mirror Coat', 'Metal Burst', 'Endeavor', 'Bide', 'Spit Up', 'Natural Gift', 'Fling'].includes(n)) p *= 0.3;
    if (mv[9] < 0) p *= 0.9; if (mv[6] === 9) p = 30; if (n === 'Future Sight' || n === 'Doom Desire') p *= 0.6;
    return p * Math.max(0.45, st[mv[4] === 1 ? 1 : 3] / top) * (own.includes(mv[1]) ? 1.5 : 1);
  };
  const tact = x => {
    const mv = MOVES[x], n = mv[0];
    if (mv[6] === 1) return mv[7] === 2 ? 9 : mv[7] === 1 || mv[7] === 4 || n === 'Toxic' || mv[7] === 18 ? 7 : mv[7] === 5 || mv[7] === 6 || mv[7] === 14 ? 5 : 2;
    if (mv[6] === 3 || n === 'Rest') return 6;
    if (mv[12].length && mv[17] === 1) {
      const up = i => mv[12].some(s => s[0] === i && s[1] > 0), phys = st[1] >= st[3];
      if ((up(2) && !up(4) && !up(6) && !phys) || (up(4) && !up(2) && !up(6) && phys)) return 1;
      return mv[12].reduce((a, s) => a + Math.max(0, s[1]), 0) >= 2 ? 8 : 4;
    }
    if (['Reflect', 'Light Screen', 'Stealth Rock', 'Substitute', 'Protect', 'Rain Dance', 'Sunny Day', 'Sandstorm', 'Hail', 'Taunt', 'Roar', 'Whirlwind', 'Spikes', 'Toxic Spikes', 'Wish', 'Belly Drum'].includes(n)) return 5;
    return mv[12].length ? 2 : UM[n] ? 2 : 0;
  };
  const dmg = all.filter(x => MOVES[x][4] > 0).sort((a, b) => val(b) - val(a)), stat = all.filter(x => MOVES[x][4] === 0).sort((a, b) => tact(b) - tact(a)), pick = [], tys = new Set();
  const add = x => { if (x != null && !pick.includes(x) && pick.length < 4) { pick.push(x); if (MOVES[x][4] > 0) tys.add(mvOf(x)[1]); } };
  /* 1. egne typer */
  for (const t of own) add(dmg.find(x => mvOf(x)[1] === t && val(x) >= 45));
  /* 2. dekning: en annen type, helst en som er supereffektiv der de egne ikke er det */
  const cover = x => { const t = mvOf(x)[1]; let n = 0; for (let d = 0; d < TYN.length; d++) { const best = Math.max(0, ...[...tys].map(a => CH[a][d])); if (CH[t][d] > 1 && best <= 1) n += 1; else if (CH[t][d] >= 1 && best < 1) n += 0.5; } return n; };
  const cov = dmg.filter(x => !tys.has(mvOf(x)[1]) && !pick.includes(x)).sort((a, b) => val(b) * (1 + 0.12 * cover(b)) - val(a) * (1 + 0.12 * cover(a)));
  add(cov[0]);
  /* 3. ett taktisk */
  if (stat.length && tact(stat[0]) >= 4) add(stat[0]);
  /* 4. fyll opp: nye typer først, så et taktisk til hvis det er godt, så det sterkeste som er igjen, så statusangrep */
  for (const x of dmg) { if (pick.length >= 4) break; if (!tys.has(mvOf(x)[1]) && val(x) >= 40) add(x); }
  for (const x of stat) { if (pick.length >= 4) break; if (tact(x) >= 6) add(x); }
  for (const x of dmg) add(x);
  for (const x of stat) add(x);
  return pick;
}
function foeMon(id, lv, st) {
  return { id, lv, sh: 0, g: rollG(id), iv: Array.from({ length: 6 }, () => Math.min(31, st.iv + rnd(32 - st.iv))), ev: Array.from({ length: 6 }, () => Math.min(85, st.ev)), nat: rnd(25), mv: foeMoves(id, lv, st.q) };
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
/* Boss: de n − 1 første fra laget, og esset til slutt på høyeste nivå. flat = alle på samme nivå (Battle Frontier). pre = laget som alt er trukket
   (ligaen lagrer det sammen med treneren som venter); ellers trekkes det nå. late = så mange av de faste som sendes ut rett før esset. */
function bossTeam(d, n, base, st, flat, pre) {
  const src = (pre && pre.length ? pre : drawTeam(d)).slice(0, Math.max(2, n)), lt = Math.min((d[6] || {}).late || 0, src.length - 2), ids = src.slice(1 + lt).concat(src.slice(1, 1 + lt), src[0]);
  /* st.tut (steg 1b.8) = så mange som har vært hos lærerne: esset, og så de som sendes ut rett før det. De får q = 3 i foeMoves.
     Bare når du selv har lærerne (tutOn): en ny spiller møter dem ikke før studiedag 9 på reisen. */
  const tn = tutOn() ? st.tut || 0 : 0, tq = tn ? Object.assign({}, st, { q: 3 }) : st;
  const team = ids.map((id, k) => { const ace = k === ids.length - 1, lv = flat ? base : Math.max(3, Math.min(100, base + (ace ? 1 : -1 - rnd(2)))); return foeMon(fitForm(id, lv, st.slack || 0), lv, k >= ids.length - tn ? tq : st); });
  /* Mega: Champion og Supreme Boss (klasse 8 og 9) bærer Mega Ring på Normal og Hard. Esset får steinen hvis arten har en Mega-form, ellers den
     sterkeste av de andre som har det. Den mega-utvikler seg første gang den angriper. */
  if (megaCls(st)) {
    const c = team.map((m, k) => k).filter(k => megaOpts(team[k].id).length);
    if (c.length) { const k = c.includes(team.length - 1) ? team.length - 1 : c.sort((a, b) => bstSum(team[b].id) - bstSum(team[a].id))[0], o = megaOpts(team[k].id); team[k].ms = o[rnd(o.length)]; }
  }
  return team;
}
const megaCls = st => !!st && (st.i >= 8 || !!st.mg) && (S.diff == null ? 2 : S.diff) >= 1;
/* Mega Ring: den første Champion (eller Supreme Boss) du slår, i ligaen, Frontier eller turneringen. Den første steinen følger med. */
const MSTONE = [0.25, 0.6, 1];
function ringAward(ci, res) {
  if (ci < 8 || S.ring) return;
  S.ring = 1; S.items.mstone = (S.items.mstone || 0) + 1; res.ring = 1;
  res.perks.push('You earned the Mega Ring, and a Mega Stone to go with it.');
}
/* SJELDNE PREMIER fra de to vanskeligste, Champion og Supreme Boss (ligaen, Battle Frontier og turneringen). Hver seier gir én trekning, i tillegg til
   alt klassen ellers gir. RAREP = sjansen for at det blir noe (Champion, Supreme Boss). Hva det blir, trekkes etter vektene i RAREW:
     purse  pengepungen: kampene NESTE kampdag betaler PURSEM ganger så mange mynter (S.purse; purseOpen slår den på når den dagen åpnes)
     gold   en pose mynter: RAREGOLD ganger det kampen betalte
     gear   en varig gjenstand å holde som du ikke eier fra før (de dyreste først), ellers en plate
     lure   en Prism Lure: neste raid er shiny 1 av 5
     master en Master Ball
     shiny  en shiny Pokémon venter i gresset
   Passer ikke premien (du har alt en Master Ball, en Prism Lure er alt i bruk, eller en pung venter alt), blir det en pose mynter. */
const RAREP = [0.25, 0.6], RAREW = [['purse', 28], ['gold', 26], ['gear', 24], ['lure', 8], ['shiny', 7]], PURSEM = 1.5, RAREGOLD = 2;
const purseM = () => (S.purse && S.purse.day && S.purse.day === S.lad.day ? S.purse.m : 1);
/* En kampdag åpnes: en pung som venter (vunnet en tidligere dag), gjelder i dag. En som alt er brukt en annen dag, er tom. */
function purseOpen() { const p = S.purse, d = S.lad.day; if (!p || !d) return; if (!p.day) { if (p.from !== d) p.day = d; } else if (p.day !== d) S.purse = null; }
function rarePrize(ci, res) {
  if (ci < 8 || Math.random() >= RAREP[ci - 8]) return '';
  let x = Math.random() * RAREW.reduce((a, w) => a + w[1], 0), k = 'gold'; for (const w of RAREW) { x -= w[1]; if (x <= 0) { k = w[0]; break; } }
  if ((k === 'master' && S.items.master >= 1) || (k === 'lure' && S.prism) || (k === 'purse' && S.purse && !S.purse.day)) k = 'gold';
  const who = ci === 9 ? 'Supreme Boss' : 'Champion';
  if (k === 'purse') { S.purse = { m: PURSEM, day: '', from: S.lad.day || dayKey() }; res.perks.push(`A rare prize: the ${who}'s purse. Your next battle day pays ${Math.round((PURSEM - 1) * 100)} % more coins.`); }
  else if (k === 'gold') { const c = Math.round((res.coins || 0) * RAREGOLD); S.coins += c; res.coins = (res.coins || 0) + c; res.perks.push(`A rare prize: a bag of ${c.toLocaleString('en-US')} coins.`); }
  else if (k === 'gear') {
    const free = g => Object.keys(HELD).filter(x => HELD[x].g === g && !heldTotal(x)), gear = free('gear').sort((a, b) => HELD[b].p - HELD[a].p), pl = free('plate');
    const it = gear.length ? gear[rnd(Math.min(3, gear.length))] : pl.length ? pl[rnd(pl.length)] : 'p' + (1 + rnd(17));
    S.items[it] = (S.items[it] || 0) + 1; res.items.push(HELD[it].n); res.perks.push(`A rare prize: ${/^[AEIOU]/.test(HELD[it].n) ? 'an' : 'a'} ${HELD[it].n} for a Pokémon to hold.`);
  }
  else if (k === 'lure') { S.prism = 1; res.perks.push('A rare prize: a Prism Lure. Your next legendary raid has a 1 in 5 chance of being shiny.'); }
  else if (k === 'master') { S.items.master = 1; res.items.push('1 × Master Ball'); res.perks.push('A rare prize: a Master Ball.'); }
  else { const e = genEnc({ luck: 2, min: 2 }); e.sh = 1; pushEnc(res, e); res.perks.push('A rare prize: a shiny Pokémon is waiting in the grass.'); }
  res.rare = k; return k;
}
/* Det en kamp trenger å vite om treneren. k = klassen, i = hvem i klassen. int = hvor mye show kampen får (0 til 8, følger klassen).
   ultra = de sjeldne (klasse 7 til 9), gold = bare klasse 9. sc/th/cc = egen bane, eget tema og egen farge (mesterne har hver sin). */
function trainerOf(k, i, x) {
  const d = POOL[k][i], c = TCL[k], boss = k !== 'trainer';
  const e = (boss && d[6]) || {};
  return Object.assign({ n: d[0], img: d[1], title: boss ? d[2] : '', ty: boss ? d[3] : (d[2][0] == null ? 0 : d[2][0]), kind: k, ci: c.i, cn: e.cn || c.n, skill: c.sk, boss, ultra: ULTRA.has(k), gold: k === 'supreme', int: c.i - 1,
    sc: e.sc || '', th: k === 'evilboss' ? 'evil' : e.th || '', cc: e.cc || '', sp: e.sp || 0, film: e.film || '',
    arena: boss ? 'hall' : d[3], v: i % 3, mre: boss ? d[5] || '' : '' }, x || {});
}
const foeTeam = (k, d, n, base, st, flat, pre) => k === 'trainer' ? regTeam(d[2], n, base, st) : k === 'evilteam' ? regTeam(d[4], n, base, st) : bossTeam(d, n, base, st, flat, pre);

/* ---------- Ligaen: utfordreren og veiskillet (steg 1c.5, Jazz valgte blant L1–L4 og W1–W4) ----------
   UTFORDREREN (L1): en sjelden gang står en omreisende utfordrer i stedet for en av kampene midt i runden (kamp 3–7), med et lag bygget
   rundt en shiny. Den tar plassen til kampen, så runden blir ikke lengre. Vinner du: CHLCOIN ganger myntene, og arten (første form) venter
   som shiny i gresset. Taper du: runden går videre til neste kamp, og ingen forsøk er brukt. Den kommer høyst én gang per runde, tidligst
   når du har vunnet CHLMIN ligakamper, og senest etter CHLDRY kamper uten (S.lad.chn teller dem). Styrken er som Elite Four (CHLST).
   CHLP 0,026 per kamp gir en utfordrer i rundt hver åttende runde (målt 1c.7: med 0,05 ga ligaen 0,32 shiny-møter per kampdag mot 0,04–0,06
   i de to andre modusene; nå rundt 0,2, der lagets egne bonuser står for det meste).
   t.ch = { a: essets art, nm: navnet } på treneren som venter; B.ch i kampen. */
const CHLP = 0.026, CHLDRY = 60, CHLMIN = 6, CHLCOIN = 2;
const CHLACE = [350, 130, 59, 448, 282, 330, 468, 637, 612, 609, 212, 181, 359, 571, 405, 334, 38, 229, 466, 121, 208, 461, 6, 9, 3, 254, 257, 260, 392, 395];
const CHLNAME = ['Lyra', 'Soren', 'Mika', 'Ilva', 'Tarek', 'Noor', 'Eskil', 'Runa', 'Odin', 'Saga'];
const CHLST = Object.assign({}, TCL.e4, { n: 'Challenger', mons: 5 });
const lineBase = id => { let b = id, g = 0; while (stageOf(b) && D(b)[4] && g++ < 4) b = D(b)[4]; return b; };
const chlForce = () => typeof SBX !== 'undefined' && SBX && SBX.chl ? 1 : 0;
function chlRoll() {
  const L = S.lad; if (chlForce()) return L.n < LAPN - 1;
  if (L.n < 2 || L.n > LAPN - 2 || L.chl === L.lap + 1 || (L.won || 0) < CHLMIN) return false;
  L.chn = (L.chn || 0) + 1;
  return L.chn >= CHLDRY || Math.random() < CHLP;
}
function chlMake() {
  const L = S.lad, own = CHLACE.filter(id => S.regions.includes(regOf(lineBase(id)))), l = own.length >= 4 ? own : CHLACE, i0 = TCLASS.length;
  L.chl = L.lap + 1; L.chn = 0; if (typeof SBX !== 'undefined' && SBX) SBX.chl = 0;
  return { n: L.n, lap: L.lap, k: 'trainer', i: i0 + rnd(4), sup: 0, ch: { a: l[rnd(l.length)], nm: CHLNAME[rnd(CHLNAME.length)] } };
}
/* Laget: fire–fem på måfå, og esset sist: shiny, med full IV som alle shiny, i den formen nivået tillater. */
function chlTeam(t, p) {
  const ace = foeMon(fitForm(t.ch.a, p.lv + 1, p.st.slack || 0), Math.min(100, p.lv + 1), Object.assign({}, p.st, { q: tutOn() ? 3 : p.st.q }));
  ace.sh = 1; ace.iv = [31, 31, 31, 31, 31, 31];
  return regTeam([], Math.max(2, p.n - 1), p.lv, p.st).filter(m => lineBase(m.id) !== lineBase(ace.id)).concat([ace]);
}
function chlLoot(B, res, give) {
  const b = lineBase(B.ch.a), e = genEnc({ ids: [b] }); e.sh = 1; pushEnc(res, e); give('ultra', 2); give('candy', 1);
  res.chl = { id: b, nm: B.ch.nm, win: 1 }; res.perks.push(`You beat the challenger: a shiny ${D(b)[0]} is waiting in the grass.`);
}
/* VEISKILLET (L2): før kamp 3, 5 og 7 (FORKN, 0-basert) står to trenere og venter, og du velger hvem du møter. Den ene er den runden ville gitt
   deg (som før), den andre en eller to klasser over (eller under, når runden alt er høyt oppe). Du ser klassen, typen og hva klassen gir;
   hvem det er, kommer fram i introen som ellers. Valget kan gjøres om til kampen starter. Velger du ikke (simuleringen), blir det den
   runden ville gitt. S.lad.fork = { n, lap, o: [lav, høy], d: plassen til den vanlige, s: valgt plass eller -1 }; S.lad.next er alltid den valgte. */
const FORKN = [2, 4, 6], FORKMIN = 6;
const mkNext = (k, i) => { const L = S.lad, t = { n: L.n, lap: L.lap, k, i, sup: 0 }; if ((POOL[k][i][6] || {}).fx) t.v = drawTeam(POOL[k][i]); return t; };
function forkNow() {
  const L = S.lad; if (!FORKN.includes(L.n) || (L.won || 0) < FORKMIN) return null;
  const t = nextTrainer(); if (t.ch || t.fail) return null;
  let F = L.fork;
  if (F && F.n === L.n && F.lap === L.lap && F.o && F.o.length === 2 && F.o.some(x => x.k === t.k && x.i === t.i)) return F;
  const c1 = clsI(t.k); let c2 = c1 >= 6 ? c1 - 1 - rnd(2) : c1 + 1 + (Math.random() < 0.35 ? 1 : 0); c2 = Math.max(2, Math.min(7, c2)); if (c2 === c1) c2 = c1 > 2 ? c1 - 1 : c1 + 1;
  const k = ORDER[c2 - 1], pool = POOL[k]; let c = pool.map((_, i) => i).filter(i => !(L.seen || []).includes(k + i) && pool[i][0] !== POOL[t.k][t.i][0]); if (!c.length) c = pool.map((_, i) => i);
  const alt = mkNext(k, c[rnd(c.length)]), lo = c2 < c1;
  F = L.fork = { n: L.n, lap: L.lap, o: lo ? [alt, t] : [t, alt], d: lo ? 1 : 0, s: -1 }; save();
  return F;
}
function forkPick(i) { const F = forkNow(); if (!F || !F.o[i]) return false; F.s = i; S.lad.next = F.o[i]; save(); return true; }
/* Det klassen gir, i få ord (det samme som classLoot deler ut). */
const FORKLOOT = { gym: ['Rare Candy', '1 encounter'], evilteam: ['Stolen coins', '1 encounter'], eviladmin: ['Ultra Balls', '2 encounters'], e4: ['Rare Candy', '2 encounters'], rival: ['An Egg', '2 encounters'], evilboss: ['Rare encounters', 'Coin boost'] };
function forkInfo(t) { const p = leaguePlan(t), d = POOL[t.k][t.i]; return { k: t.k, cn: TCL[t.k].n, ci: clsI(t.k), ty: d[3], n: p.n, coins: leagueCoins(p.st, t.lap), loot: FORKLOOT[t.k] || [] }; }

/* ---------- Ligaen ---------- */
/* Hvem som venter. Lagres, så den samme treneren står der når du kommer tilbake (toppbossene drar videre hvis du taper).
   Ingen møtes to ganger i samme runde. En sjelden gang står en toppboss der en vanlig boss skulle stått. */
function nextTrainer() {
  const L = S.lad, old = L.next && L.next.n === L.n && L.next.lap === L.lap && POOL[L.next.k] && POOL[L.next.k][L.next.i] ? L.next : null;
  /* Den som venter, blir stående til du har møtt den – også til omkampen når du har et forsøk igjen (Easy eller Second Wind). Taper du uten
     forsøk igjen, er runden over, og L.next er nullet (ladLose). v = laget en Champion eller Supreme Boss stiller med denne gangen. */
  if (old) { if (!old.v && (POOL[old.k][old.i][6] || {}).fx) old.v = drawTeam(POOL[old.k][old.i]); return old; }
  if (chlRoll()) { L.next = chlMake(); return L.next; }
  const k = L.n >= LAPN - 1 ? (Math.random() < SUPP(L.lap) ? 'supreme' : 'champ') : ORDER[climb(L.n, L.c || 0) - 1];
  const pool = POOL[k], all = pool.map((_, i) => i), mk = i => { const t = { n: L.n, lap: L.lap, k, i, sup: 0 }; if ((pool[i][6] || {}).fx) t.v = drawTeam(pool[i]); return t; };
  let c = all.filter(i => !(L.seen || []).includes(k + i));
  if (!c.length) c = all;
  /* Blant de aller største kommer de to spesielle oftest (SPW ganger så ofte som de andre), og ikke den samme to ganger på rad. */
  if (k === 'supreme') { const c2 = c.filter(i => !(L.lsp === pool[i][0] && c.length > 1)), w = c2.map(i => (pool[i][6] || {}).sp ? SPW : 1); let x = Math.random() * w.reduce((a, b) => a + b, 0), pick = c2[c2.length - 1]; for (let j = 0; j < c2.length; j++) { x -= w[j]; if (x <= 0) { pick = c2[j]; break; } } L.lsp = pool[pick][0]; L.next = mk(pick); return L.next; }
  L.next = mk(c[rnd(c.length)]);
  return L.next;
}
const trainerInfo = t => trainerOf(t.k, t.i, t.ch ? { n: t.ch.nm, title: 'Wanderer', cn: 'Challenger', ty: D(t.ch.a)[1], int: 4, cc: '#b99cff', chl: 1 } : null);
/* Klassen, nivået og antallet for treneren som venter (brukes også på oppstillingen før kampen). */
function leaguePlan(t) {
  const ri = rungInfo(t.n, t.lap), x = ((POOL[t.k] || [])[t.i] || [])[6] || {};
  let st = diffSt(t.ch ? CHLST : t.k === 'trainer' ? trainerCls(ri.rd) : TCL[t.k]);
  /* De spesielle kan stå litt over klassen sin (st: rel = tillegg i nivå, ev = ganger i trening). */
  if (x.st) st = Object.assign({}, st, { rel: st.rel + (x.st.rel || 0), ev: Math.round(st.ev * (x.st.ev || 1)) });
  return { ri, st, lv: rungLv(ri, t.lap, st), n: teamSize(st, t.lap) };
}
/* Myntene en seier gir akkurat nå: klassens sats × vanskelighetsgrad × studiebonus × runde, og dobbelt for dagens første seier. */
function leagueCoins(st, lap) {
  return Math.round(LGCOIN * st.coin * diff().coin * smFor('league') * lapCoin(lap) * (firstWin() ? 2 : 1));
}
/* lead = den som skal gå ut først (velges på oppstillingen før kampen). Resten følger rekkefølgen på laget. */
function newBattle(lead) {
  const t = nextTrainer(), p = leaguePlan(t), d = POOL[t.k][t.i], tr = trainerInfo(t);
  tr.skill = p.st.sk;
  const party = S.party.map(monBy).filter(Boolean); party.sort((a, b) => (b.u === lead) - (a.u === lead));
  return evApply(mkBattle(party.map(evSrc), t.ch ? chlTeam(t, p) : foeTeam(t.k, d, p.n, p.lv, p.st, false, t.v), tr, { mode: 'league', st: p.st, ch: t.ch || null, k: t.k, rd: p.ri.rd, n: t.n, lap: t.lap, ti: t.i, bag: bagN(), xm: xpMult() * diff().xp, sm: smFor('league'), dc: diff().coin, boost: dayBoost() }));
}
/* XP til hele laget etter kampen. Alle får like mye, uansett hvem som kjempet. Sterkere motstandere og høyere klasse gir mer, og de som ligger
   under motstanderens nivå får mer enn de som ligger over (som i Black og White). Ligaen tar aldri slutt, så andelen er satt slik at en bossseier
   gir godt over et halvt nivå og en vanlig trener rundt en femdel: en kveld med kamper gir laget noen nivåer, ikke ti. */
function battleXp(B) {
  const bm = B.boost.mode === 'league' ? B.boost.xp : 1;
  return B.me.map(b => {
    let x = 0;
    for (const k of B.kos) x += bstSum(k.id) / 8 * k.lv / 7 * Math.max(0.35, Math.min(2.2, Math.pow((2 * k.lv + 10) / (k.lv + b.lv + 10), 2.5)));
    return Math.round(x * 0.18 * B.st.xp * B.xm * bm * (B.mode === 'league' ? LGXP : 1));
  });
}
function grantXp(B, res) {
  const xs = battleXp(B);
  B.me.forEach((b, i) => {
    const m = b.src.u ? monBy(b.src.u) || b.src : b.src, x = xs[i]; if (!x || !m.u) return;
    const l0 = m.lv, x0 = m.xp; m.xp += x; m.lv = lvOf(m.xp);
    res.ups.push(Object.assign({ u: m.u, xp: x, l0, l1: m.lv, x0 }, m.lv > l0 ? learnUp(m, l0) : {}));
  });
}
const pushEnc = (res, e) => { S.pend.push(e); trimPend(30); res.encs.push(e); };
/* De pseudo-legendariske (første form): Dratini, Larvitar, Bagon, Beldum, Gible og Deino. */
const PSEUDO = [147, 246, 371, 374, 443, 633];
const giveCharm = res => { S.charm = (S.charm || 0) + CHARM.n; res.perks.push(`Shiny Charm: ${CHARM.m}× shiny odds in your next ${S.charm} focus sessions.`); };
/* Det de sjeldne bossene gir i tillegg, likt i ligaen og i Battle Frontier. Belønningen følger sjeldenheten:
   klasse 7 gir sjeldne møter og av og til et pseudo-legendarisk, klasse 8 alltid et pseudo-legendarisk, klasse 9 et legendarisk, et pseudo-legendarisk og en Shiny Charm.
   De gir også det som trengs for å fange de aller sjeldneste: Dusk Balls, og fra klasse 8 av og til en Golden Razz Berry. De aller største kan gi Sacred Ash
   (aldri flere enn du kan bære). På Easy er det legendariske møtet fra klasse 9 en sjanse (diff().lg), ikke en selvfølge. */
function rareLoot(ci, res, give, ty) {
  const hit = p => Math.random() < p, enc = o => pushEnc(res, genEnc(o));
  if (hit(MSTONE[ci - 7] || 0)) give('mstone', 1);
  if (ci === 7) { if (hit(0.3)) give('dusk', 2); give('candy', 3); give('ultra', 2); give('stone', 1); give('maxp', 1); give('revive', 1); enc({ ty, min: 3, luck: 2 }); enc({ min: 3, luck: 2 }); enc({ min: 2, luck: 1.5 }); if (hit(0.35)) enc({ ids: PSEUDO }); }
  if (ci === 8) { give('dusk', 2); if (hit(0.35)) give('gberry', 1); give('candy', 4); give('ultra', 3); give('stone', 1); give('maxrev', 1); enc({ ty, min: 3, luck: 2 }); enc({ min: 3, luck: 2 }); enc({ min: 2, luck: 1.5 }); enc({ ids: PSEUDO }); if (hit(0.25)) giveCharm(res); }
  if (ci === 9) { give('dusk', 3); give('gberry', 1); if (hit(0.5) && (S.items.ash || 0) < SHOP.ash.max) give('ash', 1); give('candy', 6); give('ultra', 5); give('stone', 2); give('maxrev', 2); if (hit(diff().lg == null ? 1 : diff().lg)) pushEnc(res, legEnc()); else enc({ ids: PSEUDO }); enc({ ids: PSEUDO }); enc({ ty, min: 3, luck: 2 }); enc({ min: 3, luck: 2 }); giveCharm(res); }
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
    /* Rare Candy fra ligaen er skåret ned (LGCANDY) og følger fokustiden og vanskelighetsgraden (candyRoll): brøkdelen som blir igjen, er sjansen for én til. */
    const bm = B.boost.mode === 'league', give = (it, n) => { if (it === 'candy') n = candyRoll(n * LGCANDY); if (n > 0) { S.items[it] = (S.items[it] || 0) + n; res.items.push(`${n} × ${SHOP[it].n}`); } };
    const fw = firstWin(); res.coins = Math.round(LGCOIN * st.coin * (B.dc || 1) * B.sm * lapCoin(B.lap) * (fw ? 2 : 1) * (B.ch ? CHLCOIN : 1) * purseM()) + B.pay; S.coins += res.coins;
    if (fw) { L.fw = L.day || dayKey(); res.perks.push('First win of the day: double coins.'); }
    if (B.ch) chlLoot(B, res, give); else classLoot(B, res, give);
    ringAward(clsI(k), res); rarePrize(clsI(k), res); evPerk(res);
    if (evIs('lucky') && B.tr.boss) { pushEnc(res, genEnc({ ty: [B.tr.ty], min: 2, luck: 1.5 })); res.perks.push('Lucky Day: one more encounter.'); }
    if (bm && B.tr.boss && Math.random() < 0.5) give('candy', 1);
    /* Byttetilbud: tilfeldig, ikke hver gang (rivaler tilbyr oftest). Den du får, er på ditt nivå og i den formen nivået tillater. */
    if (B.tr.boss && k !== 'evilteam' && Math.random() < (k === 'rival' ? 0.6 : 0.3)) {
      const cap = refLv();
      res.trade = B.foe.filter(f => !isLeg(f.id)).map(f => { const lv = Math.min(f.lv, cap); return { id: fitForm(f.id, lv, 0), lv, iv: f.src.iv.slice(), nat: f.src.nat, g: f.src.g }; });
      if (!res.trade.length) res.trade = null;
    }
    /* De to spesielle gir mer av alt, og seieren huskes (S.spw). */
    if (B.tr.sp) {
      const spw = S.spw || (S.spw = {}), first = !spw[B.tr.n], extra = res.coins, sig = SPSIG[B.tr.n];
      res.coins += extra; S.coins += extra; S.items.candy = (S.items.candy || 0) + SPCANDY; S.items.mstone = (S.items.mstone || 0) + 1;
      let se = null; if (sig) { se = genEnc({ ids: [sig] }); se.sh = 1; pushEnc(res, se); }
      pushEnc(res, legEnc());
      if (first) S.items.master = (S.items.master || 0) + 1;
      spw[B.tr.n] = (spw[B.tr.n] || 0) + 1;
      res.sp = { n: B.tr.n, cn: (POOL[k][B.ti][6] || {}).cn || POOL[k][B.ti][2] || '', cc: B.tr.cc || '', extra, candy: SPCANDY, sig: se ? se.id : 0, first };
    }
    L.best = (L.best || 0) + 1; (L.seen = L.seen || []).push(k + B.ti); L.next = null; L.fork = null; if (!B.ch) L.c = Math.min(CLIMBTOP, clsI(k)); L.won = (L.won || 0) + 1;
    if (clsI(k) >= 8) achInit().ch++;
    /* Runden er vunnet: ligaen er ferdig for i dag (én runde per ligadag), og en legendarisk kan vise seg (RAIDWIN). */
    if (++L.n >= LAPN) { L.lap++; L.n = 0; L.seen = []; L.c = 0; L.lapd = L.day || dayKey(); res.lapDone = true; raidRoll(RAIDWIN); raidUnhide(); }
  } else {
    /* Et tap avslutter runden, uansett hvem det var mot (ladLose). res.at = kampen du røk ut i (0-basert), res.left = forsøk igjen i dag. */
    /* Utfordreren koster ingenting: runden går videre til neste kamp, og ingen forsøk er brukt. */
    if (B.ch) { (L.seen = L.seen || []).push(k + B.ti); L.next = null; L.fork = null; L.n++; res.chl = { nm: B.ch.nm, win: 0 }; res.left = ladLives() - ladFails(); res.at = L.n; }
    else { res.at = L.n; res.left = ladLose(L.day || dayKey()); res.out = !res.left; if (res.out) raidUnhide(); }
  }
  save();
  return res;
}
/* Bytte etter en boss: du gir fra deg en fra laget og får en av deres. Sier du nei, får du et møte i stedet. */
function doTrade(x, mine) {
  const i = S.party.indexOf(mine.u); unbond(mine); dropHeld(mine);
  S.mons = S.mons.filter(m => m !== mine); S.party = S.party.filter(u => u !== mine.u);
  const m = addMon(x.id, x.lv, 0, 0, x.g); m.iv = x.iv; m.nat = x.nat;
  S.party = S.party.filter(u => u !== m.u); S.party.splice(i < 0 ? S.party.length : i, 0, m.u);
  save();
  return m;
}

/* ---------- Battle Frontier ---------- */
/* Alt i Battle Frontier er på nivå 50, så alle stiller likt. En runde er FACN kamper: fire vanlige trenere og en boss. Internt heter modusen «fac».
   ET LØP (steg 1b.6, Jazz 17.11) er høyst FACEND runder (30 kamper) og slutter når runde 6 er klar: «Frontier conquered». Et tap avslutter det før.
   STYRKEN STIGER GJENNOM HELE LØPET og går aldri ned: hver vanlige trener er sterkere enn den forrige, også over rundegrensene (FACPF = midten av
   vurderingen laget deres trekkes rundt, for hver av de fire i hver runde). Runde 1 og 2 er lettere enn før og de senere tyngre: et godt lag skal klare de
   to første, og så blir det hardt. Trenerne velger også bedre for hver kamp (facSk), og fra runde 3 får de taktikk (facIq, aiIq i battle.js).
   LEIEPOOLEN blir bedre for hver runde, også i runde 5 og 6, og trekkes etter vurderingen (se «LEIEPOOLEN» under). En sjelden gang ligger
   det en sjelden ball blant de sju (shiny, ace eller en legendarisk til låns), og flaksmåleren sørger for at det aldri går for lenge mellom.
   BOSSENE (FACBOSS), en for hver runde: en leder, admin eller rival med tre Pokémon i runde 1 · runde 2 gir BRONSE · i runde 3 møter du løpets Frontier Brain
   (R.brain) og vinner SØLV · i runde 4 den samme, sterkere, for GULL · runde 5 er en av de fire store eller en rival på sitt beste · og i
   runde 6 står Brain der for tredje gang, med alt, for DIAMANT. En sjelden toppboss (klasse 7–9, bedre belønning) kan ta plassen i runde 2 og 5
   (FACTOP). Symbolene (S.fac.sym: 0–4, det høyeste du har vunnet) er medaljer under Profile, med premie første gang (ACH «fsym» i game.js).
   MYNTENE flater ut etter runde 4 (seieren og rundepremien), så et langt løp ikke gir urimelig mye. */
const FACLV = 50, FACN = 5, FACEND = 6, FACROUND = r => 200 + 100 * Math.min(3, r - 1);
const FACBOSS = [
  { k: ['gym', 'eviladmin', 'rival'], mons: 3, iv: 10, ev: 0, q: 1, slack: 0, sk: 0.8, iq: 0 },
  { k: ['gym', 'eviladmin', 'e4', 'rival'], iv: 14, ev: 4, q: 2, slack: 6, sk: 0.82, iq: 0.2, sym: 1 },
  { brain: 1, iv: 16, ev: 12, q: 2, slack: 14, sk: 0.86, iq: 0.4, sym: 2 },
  { brain: 1, iv: 18, ev: 14, q: 2, slack: 99, sk: 0.87, iq: 0.45, sym: 3 },
  { k: ['e4', 'rival', 'eviladmin'], iv: 24, ev: 16, q: 2, slack: 99, sk: 0.96, iq: 0.8 },
  { brain: 1, iv: 31, ev: 16, q: 2, slack: 99, sk: 1, iq: 1, sym: 4 }
];
const FACSYM = ['', 'Bronze', 'Silver', 'Gold', 'Diamond'], FACTOP = [0, 0.12, 0, 0, 0.2, 0];
const facBossOf = r => FACBOSS[Math.max(0, Math.min(FACEND, r) - 1)];
/* Sjansen for at bossen i runde r er en toppboss (klasse 7–9; up = 1.5 på Frontier-bonusdagen), og hvor ofte en vanlig trener velger det beste
   angrepet (w = 0–3: hvilken trener i runden). Egne navn fordi sandkassa viser dem (sbxFacPeek i show.js). */
const facTopP = (r, up = 1) => Math.min(0.6, (FACTOP[Math.max(0, Math.min(FACEND, r) - 1)] || 0) * up), facSk = (r, w) => Math.min(0.95, 0.3 + 0.1 * r + 0.08 * w);
/* Taktikken i Frontier: ingen i runde 1 og 2, så litt mer for hver runde og kamp. Vanskelighetsgraden teller som ellers (Easy ingen, Normal halvparten). */
const facIq = (r, w) => r < 3 ? 0 : Math.min(0.5, 0.15 * (r - 2) + 0.03 * w), facIqD = () => Math.max(0, Math.min(1, (diff().sk - 0.7) / 0.3));
/* Hvor god en leie-Pokémon er, i merker (1–5, se facRate lenger ned), og ballen den ligger i før den åpnes. */
const facStars = m => facRate(m).n;
const facBall = m => { const n = facStars(m); return n >= 4 ? 'ultra' : n === 3 ? 'great' : 'poke'; };
/* Rollen, lest av verdiene på nivå 50: til hjelp når laget velges. */
function facRole(m) {
  const st = statsOf(m), off = Math.max(st[1], st[3]), bulk = (st[0] - 60 + st[2] + st[4]) / 3, sp = st[5];
  return sp >= 112 && off >= 112 ? 'Fast attacker' : off >= 128 ? (st[1] >= st[3] ? 'Heavy hitter' : 'Special cannon') : bulk >= 108 && off < 105 ? 'Wall' : sp >= 118 ? 'Speedster' : bulk >= 98 ? 'Tank' : 'All-rounder';
}
/* LEIEPOOLEN (steg 1c.2). Før ble artene trukket etter samlet basisverdi (FACBST), og i de høye rundene gikk de samme igjen: 400 tilbud ga
   90 arter i runde 4, 37 i runde 5 og 17 i runde 6, der Metagross, Tyranitar og Archeops var med i over halvparten. Nå trekkes de etter
   vurderingen (facRate), så en art med lavere verdier, men gode angrep eller en sterk evne, er med der den hører hjemme (Gengar, Starmie,
   Darmanitan i de høye rundene): 195, 152 og 102 arter i runde 4, 5 og 6, og ingen er med i mer enn hvert tiende tilbud (sim/facvar2.js).
     FACPB[runde]          midten leie-Pokémonene trekkes rundt, i vurderingen de får med rundens IV-er
     FACPF[runde][trener]  midten for lagene til de fire vanlige trenerne (stiger hele veien, aldri ned)
     FACPH                 halve bredden på vinduet (leie, trenere): artene nær midten trekkes oftest
     FACIVF[runde][trener] IV-grunnlaget til trenerne (som før 1c: −11 → 7 til runde 3, så 8, 9 og 10); leie-Pokémon får 4 per runde
     FACNATP[runde]        hvor ofte en leie-Pokémon har naturen som passer den (facNat) i stedet for en tilfeldig: aldri i runde 1 og 2,
                           alltid i runde 6. Slik blir de beste rundene bedre uten at utvalget av arter må snevres inn til de aller sterkeste.
   Tallene er satt så snittet er det samme som før 1c, målt med de nye settene (sim/facband.js). facPow(art) = artens vurdering med IV 15
   (tabellen FACPW i data2.js, laget av work/tools/facpow.js), og FACIVP = hvor mye ett IV-poeng flytter vurderingen.
   VARIASJONEN: de siste FACSEENN artene du har fått tilbud om (S.fac.seen), trekkes sjeldnere (FACSEENW), blant de sju er det aldri mer enn to
   med samme hovedtype, og den andre av en type trekkes sjeldnere enn den første. */
const FACPB = [55, 63, 70, 75, 82, 87], FACPF = [[20, 26, 31, 37], [42, 45, 48, 51], [53, 53, 55, 56], [60, 61, 61, 61], [63, 63, 63, 64], [64, 64, 64, 64]], FACPH = [20, 18];
const FACIVF = [[-11, -9, -6, -4], [-3, -1, 1, 3], [4, 5, 6, 7], [8, 8, 8, 8], [9, 9, 9, 9], [10, 10, 10, 10]], FACIVP = 0.6, FACSEENN = 35, FACSEENW = 0.15, FACNATP = [0, 0, 0.25, 0.5, 0.75, 1];
const facPow = id => +FACPW.substr((id - 1) * 2, 2) || 0;
const facFit = id => !isLeg(id) && !(D(id)[6] & 4) && !(EVO[id] && EVO[id].length) && reqLv(id) <= FACLV + 12;
const facIvs = b => Array.from({ length: 6 }, () => Math.max(0, Math.min(31, b + 6 + rnd(14))));
/* w = hvilken trener i runden (0–3) laget er til; uten w er det en leie-Pokémon. tys = hovedtypene som alt er trukket (bare for de sju). */
function facMon(r, used, w, tys, wide) {
  const ri = Math.max(0, Math.min(FACEND, r) - 1), foe = w != null, wi = Math.max(0, Math.min(3, w | 0)), ivb = foe ? FACIVF[ri][wi] : 4 * r;
  const c = (foe ? FACPF[ri][wi] : FACPB[ri]) - FACIVP * (Math.max(0, Math.min(31, ivb + 12.5)) - 15), h = FACPH[foe ? 1 : 0] + (wide || 0);
  const seen = !foe && S.fac && S.fac.seen ? S.fac.seen : [], pool = []; let tot = 0;
  for (let id = 1; id <= 649; id++) {
    if (!facFit(id) || used.has(id) || (tys && (tys[D(id)[1]] || 0) >= 2)) continue;
    const dist = Math.abs(facPow(id) - c); if (dist > h) continue;
    const wg = (0.5 + 0.5 * (1 - dist / h)) * (seen.includes(id) ? FACSEENW : 1) * (tys && tys[D(id)[1]] ? 0.6 : 1); pool.push([id, wg]); tot += wg;
  }
  if (pool.length < 6) return wide > 40 ? facMon(r, used, w, null, wide) : facMon(r, used, w, tys, (wide || 0) + 8);
  let x = Math.random() * tot, id = pool[pool.length - 1][0]; for (const [i, wg] of pool) { x -= wg; if (x <= 0) { id = i; break; } }
  used.add(id); if (tys) tys[D(id)[1]] = (tys[D(id)[1]] || 0) + 1;
  return rentSet({ id, lv: FACLV, sh: 0, iv: facIvs(ivb), ev: [0, 0, 0, 0, 0, 0], nat: !foe && Math.random() < FACNATP[ri] ? facNat(id) : rnd(25) });
}
/* SETTENE I BATTLE FRONTIER (steg 1c.2). Leie-Pokémon, trenerne og bossene i Frontier kan det formene før lærte og det de tre vanlige lærerne
   lærer bort (som toppene i ligaen), og settet bygges slik «Suggest four» gjør: det beste angrepet i hver av dens egne typer, ett som dekker det
   de ikke biter på, og ett taktisk som passer til resten (boostFits). Det regnes på det den faktisk er: verdiene med natur og IV, Mega-formen, og
   evnene som endrer slagkraften (Huge Power, Technician, Skill Link, Adaptability, Aerilate og de andre som bytter type). Før kom settet fra
   nivålista alene (foeMoves med q = 1): Starmie hadde Water Gun og Swift, Salamence ingen Dragon-angrep, og Weavile Nasty Plot.
   RENTV: mellom valg som er nesten like gode, trekkes det, og noen ganger går det taktiske ut for et fjerde angrep (RENTALL), så samme art ikke
   alltid kommer med de samme fire. fix = uten trekning (det beste hver gang): brukes når en art skal vurderes for seg (facPow).
   De legendariske har settet sitt fra LEGSET. */
const RENTV = 0.12, RENTALL = 0.25;
const RENTBAD = new Set(['Dream Eater', 'Focus Punch', 'Last Resort', 'Fake Out', 'Snore', 'Synchronoise', 'Final Gambit', 'Counter', 'Mirror Coat', 'Metal Burst', 'Endeavor', 'Bide', 'Spit Up', 'Natural Gift', 'Fling', 'Sucker Punch', 'Belch']);
const RENTUTIL = { 'Reflect': 4, 'Light Screen': 4, 'Substitute': 4, 'Taunt': 4, 'Stealth Rock': 4, 'Spikes': 4, 'Toxic Spikes': 4, 'Wish': 4, 'Belly Drum': 4, 'Rain Dance': 3, 'Sunny Day': 3, 'Sandstorm': 3, 'Hail': 3, 'Roar': 3, 'Whirlwind': 3, 'Protect': 3, 'Detect': 3 };
function rentPool(id, lv) { return movesAt(id, lv).concat(preMoves(id, lv), tutFoe(id, lv)).filter((x, i, a) => a.indexOf(x) === i && !DEADMV.has(x)); }
function rentMoves(m, fix) {
  if (LEGSET[m.id]) return legSet(m.id);
  const all = rentPool(m.id, m.lv); if (all.length <= 4) return all.length ? all : defaultMoves(m.id, m.lv);
  const st = statsOf(m), ab = abilityOf(m.id, m.mega), own = mTypes(m).filter(t => t >= 0), atk = st[1] * (ab === 'hugepower' || ab === 'purepower' ? 2 : 1), top = Math.max(atk, st[3], 1);
  const mvOf = x => MOVES[x][0] === 'Hidden Power' ? mvEff(null, { src: m }, MOVES[x]) : MOVES[x], tyOf = x => { const mv = mvOf(x); return ATE[ab] != null && mv[1] === 0 ? ATE[ab] : mv[1]; };
  const val = x => {
    const mv = mvOf(x), n = mv[0]; let pw = mv[2] || (n === 'Return' ? 100 : FIXED[n] ? 45 : 60); if (ab === 'technician' && pw <= 60) pw *= 1.5;
    let p = pw * (ab === 'noguard' || !mv[3] ? 1 : mv[3] / 100) * (mv[13] ? (ab === 'skilllink' ? mv[14] : (mv[13] + mv[14]) / 2) : 1);
    if (CHARGE[n] || RECHARGE.has(n)) p *= 0.55;
    if (BOOM.has(n) || RENTBAD.has(n)) p *= 0.3;
    if (mv[9] < 0) p *= 0.9; if (mv[6] === 9) p = 30; if (n === 'Future Sight' || n === 'Doom Desire') p *= 0.6;
    if (RAGE.has(n)) p *= 0.75; else if (mv[6] === 7 && mv[12].some(s => s[1] < 0)) p *= 0.85;
    if (ATE[ab] != null && mv[1] === 0) p *= 1.2;
    return p * (n === 'Foul Play' ? 0.8 : Math.max(0.45, (mv[4] === 1 ? atk : st[3]) / top)) * (own.includes(tyOf(x)) ? (ab === 'adaptability' ? 2 : 1.5) : 1);
  };
  /* Det taktiske: søvn først, så oppbygging som passer (mest for den som hever slagkraften to trinn), lammelse og brannskade, helbredelse, og
     gift og skjermer. Treffsikkerheten teller. Rene forsvarsboost og unnvikelse er sjelden verdt en plass. */
  const tact = x => {
    const mv = MOVES[x], n = mv[0], acc = mv[3] ? mv[3] / 100 : 1;
    if (n === 'Swallow' || n === 'Spit Up') return 0;
    if (mv[6] === 1) return (mv[7] === 2 ? 9 : mv[7] === 1 || mv[7] === 4 || mv[7] === 18 ? 7 : n === 'Toxic' ? 5.5 : mv[7] === 5 || mv[7] === 6 || mv[7] === 14 ? 4.5 : 2) * acc;
    if (n === 'Rest') return 4; if (mv[6] === 3) return 6;
    if (mv[12].length && mv[17] === 1) {
      const d = i => Math.max(0, ...mv[12].filter(s => s[0] === i).map(s => s[1])), off = Math.min(2, Math.max(d(2), d(4))), spe = Math.min(2, d(6));
      return off || spe ? 5.5 + 1.25 * off + 0.5 * spe + (d(3) || d(5) ? 0.5 : 0) : d(8) ? 2 : 3;
    }
    return RENTUTIL[n] || (mv[12].length || UM[n] ? 2 : 0);
  };
  const dmg = all.filter(x => MOVES[x][4] > 0).sort((a, b) => val(b) - val(a)), stat = all.filter(x => MOVES[x][4] === 0).sort((a, b) => tact(b) - tact(a)), pick = [], tys = new Set();
  /* Blant dem som er nesten like gode som den beste (f = hvor nær), trekkes det. */
  const near = (l, sc, f) => { if (!l.length) return null; if (fix) return l[0]; const b = sc(l[0]), c = l.filter(x => sc(x) >= b * f); return c[rnd(c.length)]; };
  const add = x => { if (x != null && !pick.includes(x) && pick.length < 4) { pick.push(x); if (MOVES[x][4] > 0) tys.add(tyOf(x)); } };
  for (const t of own) add(near(dmg.filter(x => tyOf(x) === t && val(x) >= 45), val, 1 - RENTV));
  const cover = x => { const t = tyOf(x); let n = 0; for (let d = 0; d < TYN.length; d++) { const best = Math.max(0, ...[...tys].map(a => CH[a][d])); if (CH[t][d] > 1 && best <= 1) n += 1; else if (CH[t][d] >= 1 && best < 1) n += 0.5; } return n; };
  const cv = x => val(x) * (1 + 0.12 * cover(x)), covs = () => dmg.filter(x => !tys.has(tyOf(x)) && !pick.includes(x)).sort((a, b) => cv(b) - cv(a));
  add(near(covs(), cv, 1 - RENTV));
  { const c2 = covs(), fits = stat.filter(x => tact(x) >= 4 && boostFits(x, pick));
    if (fits.length && !(!fix && c2.length && val(c2[0]) >= 60 && Math.random() < RENTALL)) add(near(fits, tact, 0.78)); }
  for (const x of covs()) { if (pick.length >= 4) break; if (!tys.has(tyOf(x)) && val(x) >= 40) add(x); }
  for (const x of stat) { if (pick.length >= 4) break; if (tact(x) >= 6 && boostFits(x, pick)) add(x); }
  for (const x of dmg) add(x);
  for (const x of stat) if (boostFits(x, pick)) add(x);
  return boostFix(pick, dmg, stat, tact);
}
const rentSet = m => { m.mv = rentMoves(m); return m; };
/* VURDERINGEN AV EN LEIE-POKÉMON (steg 1c.4, Jazz 14.11: «Stjerner må være basert på stats og moves og hvor god denne faktisk er»).
   Før var stjernene samlet basisverdi alene. Nå spiller den i tankene én mot én mot et fast panel av dem man møter i Frontier (FACREF: hver
   sjuende av de ferdig utviklede, nivå 50, med settet de ville hatt), med spillets egen skaderegning (bestDmg): verdiene med natur og IV,
   angrepene, typene begge veier og evnene som teller i regnestykket er da med av seg selv. facDuel gir for hver motstander hvem som vinner
   og hvor mye HP som er igjen; snittet er grunnlaget. Oppå kommer det regnestykket ikke ser: søvn, lammelse og brannskade, oppbygging som
   passer, helbredelse, og evner som virker når den kommer inn (FACABB). Vektene (FACW) er stilt inn mot fasiten fra botene (sim/stars_elo.js:
   hver art én mot én mot feltet med den vanlige og den flinke boten), og lag med høyere vurdering vinner oftere (sim/stars_team.js).
   facRate(m) = { p: 0–100 (omtrent hvor mange av hundre dueller mot feltet den vinner), n: 1–5 merker (FACCUT), why: [[tekst, 1 | -1], …],
   role, d (duellene), f (tilleggene), ab }. Merkene vises som RUTER, ikke stjerner: stjernene på kortet er IV-ene (spørsmål 7 i gjennomgangen).
   Målt 17.11 (387 arter og Mega-former): rangkorrelasjonen med fasiten er 0,89–0,91 (samlet basisverdi: 0,77), og seier per merke er
   29, 44, 55, 64 og 79 % for den vanlige boten og 31, 47, 58, 67 og 82 % for den flinke. */
const FACW = { k: 0.08, v: 0.67, wins: 0.31, slp: 0.13, bo: 0.055, heal: 0.036 };
const FACABB = { intimidate: 0.07, levitate: 0.035, speedboost: 0.04, slowstart: -0.2 };
const FACCUT = [40, 51, 62, 72];
let _facRef = null;
function facRefs() {
  if (_facRef) return _facRef;
  const l = []; for (let id = 1; id <= 649; id++) { if (isLeg(id) || (D(id)[6] & 4) || (EVO[id] && EVO[id].length) || reqLv(id) > FACLV + 12) continue; const s = bstSum(id); if (s >= 440 && s <= 600) l.push(id); }
  return (_facRef = l.filter((_, i) => i % 7 === 3).map(id => { const m = { id, lv: FACLV, sh: 0, iv: [15, 15, 15, 15, 15, 15], ev: [0, 0, 0, 0, 0, 0], nat: 0 }; m.mv = rentMoves(m, 1); return m; }));
}
/* Én mot én mot hver i panelet. out = andelen av motstanderens HP den tar per runde (i snitt, treffsikkerheten medregnet), inc = det den selv mister. */
function facDuel(m) {
  const B = mkBattle([m], facRefs(), { skill: 1 }, {}), me = B.me[0]; let v = 0, out = 0, inc = 0, fast = 0, wins = 0, walled = 0;
  const one = (o, i, f) => { const to = o > 0.02 ? Math.ceil(1 / o - 1e-9) : 50, ti = i > 0.02 ? Math.ceil(1 / i - 1e-9) : 50, win = f ? to <= ti : to < ti; return win ? [1, 0.5 + 0.5 * Math.max(0, 1 - (f ? to - 1 : to) * i)] : [0, 0.5 * Math.min(1, (f ? ti : ti - 1) * o)]; };
  for (const c of B.foe) {
    const o = Math.min(1, bestDmg(B, me, c) / c.max), i = Math.min(1, bestDmg(B, c, me) / me.max), sa = spdB(B, me), sc = spdB(B, c), a = one(o, i, true), b = one(o, i, false), w = sa > sc ? 1 : sa < sc ? 0 : 0.5;
    v += w * a[1] + (1 - w) * b[1]; wins += w * a[0] + (1 - w) * b[0]; out += o; inc += i; fast += w; if (o < 0.2) walled++;
  }
  const n = B.foe.length; return { v: v / n, out: out / n, inc: inc / n, fast: fast / n, wins: wins / n, walled: walled / n, st: me.st, max: me.max };
}
function facRate(m) {
  if (m._fr && m._fr.k === m.mv.join()) return m._fr.r;
  const d = facDuel(m), ab = abilityOf(m.id, m.mega), mvs = m.mv.map(x => MOVES[x]), f = { wins: d.wins, slp: 0, bo: 0, heal: 0 };
  /* Oppbygging og helbredelse hjelper den som tåler å stå en runde (safe). Lammelse, gift og fart alene ga ikke flere seire i målingen. */
  const safe = Math.max(0, 1 - d.inc * 2);
  mvs.forEach((mv, k) => {
    if (mv[4] !== 0) return; const up = i => Math.max(0, ...mv[12].filter(s => s[0] === i).map(s => s[1]));
    if (mv[6] === 1 && mv[7] === 2) f.slp = Math.max(f.slp, mv[3] ? mv[3] / 100 : 1);
    if (mv[12].length && mv[17] === 1 && boostFits(m.mv[k], m.mv)) f.bo = Math.max(f.bo, Math.min(2, Math.max(up(2), up(4))) / 2 * safe);
    if (mv[6] === 3 && mv[0] !== 'Swallow') f.heal = safe;
  });
  let x = FACW.k + FACW.v * d.v + (FACABB[ab] || 0); for (const k in f) x += FACW[k] * f[k];
  const p = Math.max(0, Math.min(100, Math.round(100 * x))), n = 1 + FACCUT.filter(c => p >= c).length;
  const r = { p, n, why: [], d, f, role: facRole(m), ab };
  facWhy(m, r);
  Object.defineProperty(m, '_fr', { value: { k: m.mv.join(), r }, enumerable: false, configurable: true, writable: true });
  return r;
}
/* NOEN FÅ ORD OM HVORFOR (FACWHY = tersklene, satt etter spredningen blant leie-Pokémonene: de beste og svakeste 20 %). Høyst tre: det beste
   først, og én svakhet; en svak får én styrke og to svakheter. Evnen nevnes når den teller i regnestykket. */
const FACWHY = { fast: 0.74, slow: 0.17, hard: 0.72, soft: 0.5, bulky: 0.5, frail: 0.74, walled: 0.09, stab: 85, cover: 9 }, FACWHY2 = { fast: 0.57, slow: 0.29, hard: 0.67, soft: 0.57, bulky: 0.57, frail: 0.68 };
const FACABW = { hugepower: 'Huge Power: Attack ×2', purepower: 'Pure Power: Attack ×2', intimidate: 'Intimidate', levitate: 'Levitate', speedboost: 'Speed Boost', adaptability: 'Adaptability', technician: 'Technician', skilllink: 'Skill Link', multiscale: 'Multiscale', regenerator: 'Regenerator', sheerforce: 'Sheer Force', toughclaws: 'Tough Claws', parentalbond: 'Parental Bond', drizzle: 'Brings rain', drought: 'Brings sun', sandstream: 'Brings a sandstorm', wonderguard: 'Wonder Guard', magicbounce: 'Magic Bounce', prankster: 'Prankster' };
const FACIMM = { levitate: 4, voltabsorb: 12, lightningrod: 12, motordrive: 12, waterabsorb: 10, dryskin: 10, stormdrain: 10, flashfire: 9, sapsipper: 11 };
function facWhy(m, r) {
  const d = r.d, ab = r.ab, ty = mTypes(m).filter(t => t >= 0), st = statsOf(m), atk = st[1] * (ab === 'hugepower' || ab === 'purepower' ? 2 : 1), top = Math.max(atk, st[3], 1);
  const dm = m.mv.map(x => MOVES[x][0] === 'Hidden Power' ? mvEff(null, { src: m }, MOVES[x]) : MOVES[x]).filter(mv => mv[4] > 0), tyOf = mv => ATE[ab] != null && mv[1] === 0 ? ATE[ab] : mv[1];
  const pw = mv => (mv[2] || 0) * (mv[3] ? mv[3] / 100 : 1) * (mv[13] ? (mv[13] + mv[14]) / 2 : 1), stab = dm.filter(mv => ty.includes(tyOf(mv)));
  const strong = stab.some(mv => pw(mv) >= FACWHY.stab && (mv[4] === 1 ? atk : st[3]) >= 0.85 * top);
  let cov = 0; for (let t = 0; t < TYN.length; t++) if (dm.some(mv => (mv[2] || 0) >= 60 && CH[tyOf(mv)][t] > 1)) cov++;
  /* q = 0: de strenge tersklene. q = 1: de løsere (FACWHY2), når en god ikke har fått noen styrke eller en svak ingen svakhet. */
  const W = [FACWHY, FACWHY2], soft = q => d.out <= W[q].soft;
  const P = q => { const o = []; if (FACABW[ab]) o.push(FACABW[ab]); if (r.f.slp >= 0.6) o.push('Sleep move'); if (d.out >= W[q].hard) o.push('Hits hard'); else if (strong && !soft(0)) o.push('Strong STAB');
    if (d.fast >= W[q].fast) o.push('Fast'); if (d.inc <= W[q].bulky) o.push('Bulky'); if (r.f.bo > 0.25) o.push('Sets up'); if (r.f.heal > 0.25) o.push('Heals itself'); if (cov >= FACWHY.cover) o.push('Wide coverage'); return o; };
  const w4 = []; for (let t = 0; t < TYN.length; t++) { if (FACIMM[ab] === t) continue; let e = 1; for (const y of ty) e *= CH[t][y]; if (ab === 'thickfat' && (t === 9 || t === 14)) e /= 2; if (e >= 4) w4.push(TYN[t]); }
  const N = q => { const o = []; if (w4.length) o.push('4× weak to ' + w4.slice(0, 2).join(' and ')); if (!stab.length && dm.length) o.push('No STAB'); else if (soft(q)) o.push(dm.some(mv => pw(mv) >= 70) ? 'Hits softly' : 'Weak moves');
    if (d.inc >= W[q].frail) o.push('Frail'); if (d.fast <= W[q].slow) o.push('Slow'); if (d.walled >= FACWHY.walled) o.push('Easily walled'); return o; };
  let pos = P(0), neg = N(0); if (r.n >= 4 && pos.length < 2) pos = P(1); if (r.n <= 2 && neg.length < 2) neg = N(1);
  const np = r.n >= 3 ? 2 : 1, nn = r.n >= 3 ? 1 : 2;
  r.why = pos.slice(0, np + (neg.length ? 0 : 1)).map(t => [t, 1]).concat(neg.slice(0, nn + (pos.length >= np ? 0 : 1)).map(t => [t, -1])).slice(0, 3);
}
/* En sjelden gang (MEGAP for runden; i runde 6 alltid) er én av de sju en Mega. Den trekkes blant alle Mega-former som ikke er legendariske, og de
   svakeste kommer klart oftest: Mawile og Beedrill mange ganger så ofte som Garchomp og Salamence. */
const MEGAP = [0.09, 0.09, 0.12, 0.35, 0.7, 1], facMegaP = r => MEGAP[Math.max(0, Math.min(MEGAP.length, r) - 1)];
function megaPick(used) {
  const c = MEGA.map((g, k) => k).filter(k => !isLeg(MEGA[k][0]) && MEGA[k][1] !== 'Primal' && !used.has(MEGA[k][0])), w = c.map(k => Math.pow(Math.max(40, 760 - megaBst(k)), 2.2));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; }
  return c[0];
}
/* DE SJELDNE BALLENE (steg 1c.2, Jazz valgte F1 og F5 17.11: «Frontier er vanskelig, så man må kunne håpe på noe veldig bra»). Høyst én i hvert
   tilbud, og den ligger alltid sist, så den åpnes til slutt. m.rr sier hva den er (en shiny har sh = 1):
     'sh'   SHINY: en av rundens leie-Pokémon som shiny (full IV og 5 % høyere verdier, som alle shiny). Beholdes den etter en klar runde, er den din som shiny.
     'ace'  ACE: en av de aller beste artene (FACACEP i vurderingen, eller en pseudo-legendarisk), også i runde 1, med naturen som passer den
            (facNat) og litt høyere IV-er enn runden gir (FACACEIV). Avløser trekkplasteret fra v79 (FACSTAR).
     'leg'  LEGEND ON LOAN: en legendarisk av de vanlige (klasse 1, samlet basisverdi høyst 600: fuglene, hundene, Latios, Heatran …), med settet
            sitt, full IV og naturen som passer. Den er til låns og kan ikke beholdes.
   FACRARE = sjansen per tilbud for hver (legendarisk først, så shiny, så ace).
   FLAKSMÅLEREN (S.fac.luck): hver ball i et tilbud uten en sjelden ball teller, på tvers av løp og dager. Når den er full (FACLUCKN baller,
   altså fem tilbud på rad uten), har neste tilbud garantert en sjelden ball (FACLUCKW = hvilken). Et tap er aldri bortkastet: måleren står til
   neste løp. Med måleren medregnet har rundt hvert fjerde tilbud en sjelden ball: en shiny i 1 av 20, en ace i 1 av 5 og en legendarisk i 1 av 35. o = { mg: 1 } en Mega blant de sju, { rare: 'sh' | 'ace' | 'leg' | '' } bestemmer den sjeldne
   ballen (begge bare fra sandkassa; da røres ikke måleren). */
const FACRARE = { leg: 0.022, sh: 0.035, ace: 0.14 }, FACLUCKN = 35, FACLUCKW = { sh: 0.2, leg: 0.1, ace: 0.7 }, FACACEP = 68, FACACEIV = 8;
const FACRN = { sh: 'Shiny', ace: 'Ace', leg: 'Legend on loan' };
const facRare = m => m ? m.rr || (m.sh ? 'sh' : '') : '';
/* Naturen som passer: hever den sterkeste av Attack og Sp. Atk (farten for den som er rask og jevn) og senker den slagkraften den ikke bruker.
   Er de to nesten like, avgjør angrepene (mv = settet den får med nøytral natur, eller settet til en legendarisk). */
function facNat(id, mega, mv) {
  const b = mega ? MEGA[mega - 1][4] : BST[id - 1], ab = abilityOf(id, mega), atk = b[1] * (ab === 'hugepower' || ab === 'purepower' ? 2 : 1);
  mv = mv || (LEGSET[id] ? legSet(id) : rentMoves({ id, mega: mega || 0, lv: FACLV, sh: 0, iv: [15, 15, 15, 15, 15, 15], ev: [0, 0, 0, 0, 0, 0], nat: 0 }, 1));
  const cls = c => mv.filter(x => MOVES[x][4] === c && !FIXED[MOVES[x][0]] && MOVES[x][0] !== 'Foul Play').length, phys = Math.abs(atk - b[3]) < 15 && cls(1) !== cls(2) ? cls(1) > cls(2) : atk >= b[3];
  const up = b[5] >= 100 && Math.abs(atk - b[3]) < 25 ? 5 : phys ? 1 : 3, dn = phys ? 3 : 1;
  const n = NAT.findIndex((_, k) => natUp(k) === up && natDn(k) === dn); return n < 0 ? 0 : n;
}
function facAce(r, used, tys) {
  const l = []; for (let id = 1; id <= 649; id++) if (facFit(id) && !used.has(id) && (facPow(id) >= FACACEP || bstSum(id) >= 590) && bstSum(id) <= 600 && !(tys && (tys[D(id)[1]] || 0) >= 2)) l.push(id);
  if (!l.length) return null;
  const id = l[rnd(l.length)]; used.add(id); if (tys) tys[D(id)[1]] = (tys[D(id)[1]] || 0) + 1;
  return rentSet({ id, lv: FACLV, sh: 0, iv: facIvs(Math.min(25, 4 * r + FACACEIV)), ev: [0, 0, 0, 0, 0, 0], nat: facNat(id), rr: 'ace' });
}
function facLegend(used) {
  const l = Object.keys(LEG).map(Number).filter(id => LEG[id].t === 1 && bstSum(id) <= 600 && id <= 649 && !used.has(id)); if (!l.length) return null;
  const id = l[rnd(l.length)]; used.add(id);
  return rentSet({ id, lv: FACLV, sh: 0, iv: [31, 31, 31, 31, 31, 31], ev: [0, 0, 0, 0, 0, 0], nat: facNat(id), rr: 'leg' });
}
const facLuck = () => Math.max(0, Math.min(FACLUCKN, (S.fac && S.fac.luck) || 0));
function facOffer(r, o) {
  o = o === true ? { mg: 1 } : o || {};
  const F = S.fac, used = new Set(), tys = {}, free = o.rare == null;
  let kind = o.rare || '';
  if (free) { const x = Math.random(); kind = facLuck() >= FACLUCKN ? pickW(FACLUCKW) : x < FACRARE.leg ? 'leg' : x < FACRARE.leg + FACRARE.sh ? 'sh' : x < FACRARE.leg + FACRARE.sh + FACRARE.ace ? 'ace' : ''; }
  const rare = kind === 'leg' ? facLegend(used) : kind === 'ace' ? facAce(r, used, tys) : null, l = Array.from({ length: rare ? 6 : 7 }, () => facMon(r, used, null, tys));
  if (kind === 'sh') { const m = l.splice(rnd(l.length), 1)[0]; m.sh = 1; m.rr = 'sh'; l.push(m); } else if (rare) l.push(rare); else kind = '';
  if (o.mg || Math.random() < facMegaP(r)) { const k = megaPick(used), g = MEGA[k], n = kind ? 6 : 7, i = rnd(n), old = l.splice(i, 1)[0]; l.splice(n - 1, 0, rentSet({ id: g[0], mega: k + 1, lv: FACLV, sh: 0, iv: old.iv, ev: [0, 0, 0, 0, 0, 0], nat: rnd(25) })); }
  /* lk0 = det måleren sto på før dette tilbudet: skjermen fyller den ball for ball (facLuckShow i bui.js). */
  if (F) F.lk0 = facLuck();
  if (free && F) { F.luck = kind ? 0 : Math.min(FACLUCKN, facLuck() + 7); F.seen = (F.seen || []).concat(l.map(m => m.id)).slice(-FACSEENN); }
  return l;
}
function facStart() { S.fac.run = { round: 1, w: 0, streak: 0, offer: facOffer(1), open: 0, team: null, foe: null, brain: rnd(POOL.brain.length) }; save(); }
function facPick(idx) { const R = S.fac.run; R.team = idx.map(i => R.offer[i]); R.offer = null; R.foe = null; save(); }
/* Neste motstander. Den femte i hver runde er bossen (FACBOSS). */
function facFoe() {
  const R = S.fac.run;
  /* Et løp fra før runden ble kortere: står du lenger enn den nye runden rekker, er det bossen som venter. */
  if (R.w > FACN - 1) { R.w = FACN - 1; R.foe = null; }
  if (R.foe && (R.foe.boss ? POOL[R.foe.k] && POOL[R.foe.k][R.foe.i] : R.foe.ci != null)) return R.foe;
  const boss = R.w === FACN - 1, used = new Set(R.team.map(m => m.id)), cnt = {};
  let f;
  if (boss) {
    /* R.top: toppboss hver gang (bare fra sandkassa). Et løp fra før steg 1b.6 har ingen Brain ennå: den trekkes her. */
    const r = Math.max(1, Math.min(FACEND, R.round)), T = facBossOf(r), up = dayBoost().mode === 'factory' ? 1.5 : 1, ultra = !!R.top || (!T.brain && Math.random() < facTopP(r, up));
    if (R.brain == null || !POOL.brain[R.brain]) R.brain = rnd(POOL.brain.length);
    const k = ultra ? pickUltra(r - 1) : T.brain ? 'brain' : T.k[rnd(T.k.length)], i = k === 'brain' ? R.brain : rnd(POOL[k].length), u = ultra ? TCL[k].i - 6 : 0;
    /* De sjeldne (u = 1 til 3 for klasse 7 til 9) ligger alltid et hakk eller mer over rundens boss, så de sjeldneste er vanskeligst også her. */
    const st = { iv: Math.min(31, T.iv + (u ? 4 + 4 * u : 0)), ev: T.ev + 8 * u, q: u ? 2 : T.q, slack: u >= 3 ? 99 : Math.max(T.slack, u ? [6, 14, 99][u - 1] : 0), mg: TCL[k].i >= 8 };
    const dd = diff(); st.iv = Math.round(st.iv * dd.iv); st.ev = Math.round(st.ev * dd.ev);
    f = { boss: 1, k, i, sk: Math.min(1, T.sk + 0.06 * u), iq: Math.min(1, T.iq + 0.15 * u), sym: T.sym || 0, team: bossTeam(POOL[k][i], u ? 4 : T.mons || 4, FACLV, st, true).map(rentSet), hint: POOL[k][i][3] };
  } else {
    const rr = Math.max(1, Math.min(FACEND, R.round)), team = Array.from({ length: 4 }, () => facMon(rr, used, R.w));
    team.forEach(m => { const t = D(m.id)[1]; cnt[t] = (cnt[t] || 0) + 1; });
    f = { ci: rnd(POOL.trainer.length), team, hint: +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] };
  }
  R.foe = f; save();
  return f;
}
function facInfo(f) {
  const R = S.fac.run;
  /* Taktikken stiger gjennom løpet (facIq for trenerne, FACBOSS for bossene) og følger vanskelighetsgraden (facIqD). */
  if (f.boss) return trainerOf(f.k, f.i, { skill: (f.sk || 1) * diff().sk, iq: (f.iq || 0) * facIqD(), fr: 1, arena: 'hall', int: f.k === 'brain' ? 3 : TCL[f.k].i - 1 });
  return trainerOf('trainer', f.ci, { ty: f.hint, skill: facSk(R.round, R.w) * diff().sk, iq: facIq(R.round, R.w) * facIqD(), fr: 1, arena: 'factory', v: 0, int: R.w >= 2 ? 1 : 0 });
}
function facBattle() {
  const R = S.fac.run, f = facFoe();
  return evApply(mkBattle(R.team, f.team, facInfo(f), { mode: 'fac', round: R.round, w: R.w, k: f.boss ? f.k : 'trainer', sm: smFor('factory'), dc: diff().coin, boost: dayBoost() }));
}
/* Frontier gir gjenstander, møter, mynter og XP til ditt eget lag (det ser på og lærer, se modeXp). Et tap avslutter løpet; etter FACLIVES tap er
   Frontier stengt for dagen. En ferdig runde (FACN seire) gir en egen myntpremie, og symbolet til bossen (res.sym: første gang du vinner det).
   Er runde FACEND klar, er løpet vunnet (res.done) og Frontier ferdig for dagen. */
function finishFactory(B) {
  const R = S.fac.run, win = B.over === 'win', res = { mode: 'fac', win, ups: [], items: [], encs: [], coins: 0, round: R.round, w: R.w, swap: null, roundDone: false, streak: R.streak, perks: [], note: '' };
  if (!win) { const d = S.lad.day || dayKey(), n = facFails() + 1; S.fac.best = Math.max(S.fac.best || 0, R.streak); S.fac.tries = { d, n }; if (n >= facLives()) S.fac.lost = d; res.left = Math.max(0, facLives() - n); S.fac.run = null; raidUnhide(); save(); return res; }
  const sm = B.sm, bm = B.boost.mode === 'factory' ? B.boost.m : 1, r = R.round, roll = p => Math.random() < p * bm;
  const give = (it, n) => { if (it === 'candy') n = candyRoll(n); if (n > 0) { S.items[it] = (S.items[it] || 0) + n; res.items.push(`${n} × ${SHOP[it].n}`); } };
  R.w++; R.streak++; res.w = R.w; res.streak = R.streak; S.fac.best = Math.max(S.fac.best || 0, R.streak);
  res.coins = Math.round(FACCOIN * (30 + 12 * R.w + 15 * Math.min(3, r - 1)) * sm * (B.dc || 1) * purseM()) + B.pay; S.coins += res.coins; evPerk(res);
  modeXp(res, 4, FACXP * (R.w >= FACN ? 1.5 : 1) * (1 + 0.08 * Math.min(4, r - 1)), xpMult() * diff().xp * (B.boost.mode === 'factory' ? B.boost.xp : 1));
  if (roll(0.4)) give(r >= 3 ? 'ultra' : r >= 2 ? 'great' : 'poke', r >= 2 ? 1 : 2);
  if (R.w === 2) pushEnc(res, genEnc({ min: 1, luck: 1 }));
  if (R.w === 3) give('candy', 1);
  if (R.w === 4) { give('great', 2); if (!S.incOn) { S.incOn = 1; res.items.push('Incense for your next session'); } if (roll(0.5)) pushEnc(res, genEnc({ min: 2, luck: 1.2 })); }
  if (R.w >= FACN) {
    /* Steg 1.7: epic er nå de aller sjeldneste linjene, så premien for en klar runde er en rare med mer flaks fra runde 2 (samme verdi som før). */
    pushEnc(res, genEnc({ ty: [B.tr.ty], min: 2, luck: r >= 2 ? 2 : 1.5 })); pushEnc(res, genEnc({ min: 2, luck: 1.5 }));
    give('ultra', r >= 2 ? 2 : 1); give('candy', 1); if (Math.random() < 0.5) give('stone', 1);
    if (r >= 2 && S.eggs.length < 3 && roll(0.5)) { S.eggs.push({ need: 120, got: 0 }); res.items.push('1 × Egg'); }
    if (r >= 3 && roll(0.12)) pushEnc(res, legEnc());
    /* Sjelden boss: klassens egen belønning på toppen, som i ligaen. */
    { const bonus = Math.round(FACROUND(r) * sm * (B.dc || 1)); res.coins += bonus; S.coins += bonus; res.perks.push(`Round ${r} cleared: ${bonus.toLocaleString('en-US')} coins on top.`); }
    if (B.tr.ultra) { const c = B.tr.ci, extra = Math.round([600, 1000, 2000][c - 7] * sm * (B.dc || 1)); res.coins += extra; S.coins += extra; rareLoot(c, res, give, [B.tr.ty]); ringAward(c, res); rarePrize(c, res); res.note = `${B.tr.cn}: extra rewards.`; }
    { const sy = facBossOf(r).sym || 0; if (sy > (S.fac.sym || 0)) { S.fac.sym = sy; res.sym = sy; res.perks.push(`You earned the ${FACSYM[sy]} Symbol. Its prize waits under Profile, Achievements.`); } }
    res.roundDone = true; raidRoll(RAIDWIN); raidUnhide(); S.fac.keep = R.team.filter(x => x.rr !== 'leg').map(x => ({ id: x.id, sh: x.sh || 0, iv: (x.iv || []).slice(), nat: x.nat || 0 })); res.keep = S.fac.keep.length ? 1 : 0; if (!res.keep) S.fac.keep = null;
    if (r >= FACEND) { const d = S.lad.day || dayKey(); res.done = 1; res.note = 'Frontier conquered.'; S.fac.tries = { d, n: Math.max(facFails(), facLives()) }; S.fac.lost = d; S.fac.run = null; save(); return res; }
    R.round++; R.w = 0; R.team = null; R.offer = facOffer(R.round); R.open = 0;
  } else res.swap = B.foe.map(f => f.src);
  R.foe = null;
  save();
  return res;
}
/* En klar runde i Battle Frontier lar deg beholde én av dem du leide (S.fac.keep venter til du har valgt, eller sagt nei). Den kommer på nivået
   laget ditt tåler og i den formen nivået tillater, slik et bytte i ligaen gjør, med de samme IV-ene og naturen den hadde. Den selges som en fra en pakke. */
function facKeepList() { const cap = Math.max(5, Math.min(FACLV, refLv())); return (S.fac.keep || []).map(x => ({ id: fitForm(x.id, cap, 0), lv: cap, sh: x.sh, iv: x.iv, nat: x.nat, from: x.id })); }
function facKeep(i) {
  const l = facKeepList(), x = l[i]; S.fac.keep = null;
  if (!x) { save(); return null; }
  const isNew = !S.caught[x.id], m = addMon(x.id, x.lv, x.sh, 0); if (!x.sh && x.iv && x.iv.length === 6) m.iv = x.iv.slice(); m.nat = x.nat; m.pk = 1;
  save(); return { m, isNew };
}
/* Bytt en av dine leide mot en fra laget du nettopp slo. */
function facSwap(mine, theirs) { const R = S.fac.run; if (R && R.team && R.team[mine] && theirs) { R.team[mine] = theirs; save(); } }

/* ---------- World Tournament ----------
   En daglig cup med utslagsrunder: kvartfinale, semifinale og finale på rad. Tre mot tre, og alle dine spiller på samme nivå (lagets nivå da cupen startet).
   Motstanderne står på det samme nivået på Hard, og litt under på Normal og Easy (som i ligaen), så det er valget av de tre og spillet som avgjør, ikke hvem som har trent mest.
   VALGET I BLINDE (steg 1b.3): begge ser hele laget til den andre (motstanderen stiller med seks), og begge velger tre uten å se den andres valg,
   som i de ekte verdensmesterskapene. Motstanderen velger ut fra hele laget ditt, med sin egen logikk (pwtPick). Ingen veske og ingen XP,
   og laget er friskt til hver runde. Ett tap, og du er ute til neste dag med kamper. Cupen skifter med ukedagen (CUPS, søndag først): lederne fra hver region,
   Elite Four-cupen med en mester i finalen, og mesternes cup med en av de aller største i finalen.
   PREMIER: mynter for hver runde (PWTCOIN × cupens faktor × vanskelighetsgrad × studiebonus). Vinneren får et trofé, PWTCANDY Rare Candy og en pakke encounters
   (samme trekning som pakken i butikken, uten de legendariske). */
const PWTN = 3, PWTCOIN = [360, 720, 1440], PWTCANDY = 2, ROUNDN = ['Quarter-final', 'Semi-final', 'Final'];
/* Stilt inn mot ligaen (se LGCOIN): mynter i Frontier (FACCOIN) og XP til eget lag per seier i Frontier (FACXP) og i cupen (PWTXP).
   Steg 1c.7 (17.11): målt som hele kampdager med begge botene på eierens lag (Hard, 270 min fokus, uten dagens bonus) ga ligaen rundt 13 000
   mynter, Frontier 17 000–21 000 (to løp, og flere seire etter at vurderingen kom) og cupen 9 000–10 000. FACCOIN 3,9 → 2,7 og PWTCOIN
   260/520/1040 → 360/720/1440 legger dem på linje med ligaen, og PWTXP 3,2 → 3,8 fordi cupen er den korteste og ga minst XP. */
const FACCOIN = 2.7, FACXP = 1.25, PWTXP = 3.8;
/* XP til ditt eget lag fra Battle Frontier og cupen, der det ikke kjemper selv (leielag) eller står på lånt nivå: hver seier gir hele laget like mye
   som en ligaseier mot n Pokémon på lagets eget nivå, ganger cx (modusens sats) og xm (studiebonus, vanskelighetsgrad og dagens bonus).
   Før var ligaen den eneste modusen som løftet laget, og da kunne ikke dagens bonus styre valget. */
function modeXp(res, n, cx, xm) {
  S.party.map(monBy).filter(Boolean).forEach(m => {
    const x = Math.round(n * 60 * m.lv / 7 * 0.18 * cx * xm); if (!(x > 0)) return;
    const l0 = m.lv, x0 = m.xp; m.xp += x; m.lv = lvOf(m.xp);
    res.ups.push(Object.assign({ u: m.u, xp: x, l0, l1: m.lv, x0 }, m.lv > l0 ? learnUp(m, l0) : {}));
  });
}
const aN = s => (/^[AEIOU]/i.test(s) ? 'an ' : 'a ') + s;
const gymCup = (n, re) => ({ n, f: 1, pk: 'great', rounds: [['gym', re], ['gym', re], ['gym', re]] });
const CUPS = [
  { n: 'Champions Cup', f: 2.2, pk: 'ultra', ms: 1, rounds: [['champ'], ['champ'], ['supreme']] },
  gymCup('Kanto Leaders Cup', /^Kanto/), gymCup('Johto Leaders Cup', /^Johto/), gymCup('Hoenn Leaders Cup', /^Hoenn/), gymCup('Sinnoh Leaders Cup', /^Sinnoh/), gymCup('Unova Leaders Cup', /^B2 W2/),
  { n: 'Elite Four Cup', f: 1.5, pk: 'ultra', rounds: [['e4'], ['e4'], ['champ']] }
];
/* ---------- World Tournament: den ukjente og premieballene (steg 1c.5, W1 og W4) ----------
   DEN UKJENTE (W1): noen kampdager står en maskert deltaker i cupen. Datoen avgjør det (pwtDark, som dagens bonus: likt for alle), så det
   synes før dagens modus velges. Når du til finalen, faller masken: en mester der du ventet en leder (i Elite Four Cup en av de aller
   største). Seier gir DARKF ganger myntene i finalen, en gullpokal (S.pwt.gold) og premiepakken ett trinn opp (PKUP). Champions Cup har
   ingen ukjent: der er finalen alt den største. R.dk = klassen den ukjente stiller i ('champ' eller 'supreme'). */
const DARKP = 0.2, DARKF = 1.5, PKUP = { poke: 'great', great: 'ultra', ultra: 'master', master: 'master' };
const DARKWHO = { 'Kanto Leaders Cup': [['champ', 'Blue']], 'Johto Leaders Cup': [['champ', 'Lance']], 'Hoenn Leaders Cup': [['champ', 'Steven'], ['champ', 'Wallace']], 'Sinnoh Leaders Cup': [['supreme', 'Cynthia']],
  'Unova Leaders Cup': [['champ', 'Alder'], ['supreme', 'Iris']], 'Elite Four Cup': [['supreme', 'Red'], ['supreme', 'Cynthia'], ['supreme', 'Steven'], ['supreme', 'Iris']] };
function pwtDark(c) {
  c = c || cupNow(); if (!DARKWHO[c.n]) return false;
  if (typeof SBX !== 'undefined' && SBX && SBX.dark != null) return !!SBX.dark;
  const d = S.lad.day || dayKey(); let h = 0x2f6b; for (let i = 0; i < d.length; i++) h = (Math.imul(h, 31) + d.charCodeAt(i)) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0; h = (h ^ (h >>> 13)) >>> 0;
  return (h % 1000) / 1000 < DARKP;
}
function pwtDarkOpp(c) { const l = DARKWHO[c.n].map(([k, n]) => [k, POOL[k].findIndex(d => d[0] === n)]).filter(x => x[1] >= 0); return l.length ? l[rnd(l.length)] : null; }
/* PREMIEBALLENE (W4): cuppremien er tre møter som før, men de åpnes som ballene i Frontier, og en sjelden ball kan ligge sist: en shiny
   (PZSH av de sjeldne) eller en født med høyt potensial (fire eller fem stjerner). PZRARE = sjansen etter premiepakken. */
const PZRARE = { great: 0.1, ultra: 1 / 6, master: 0.25 }, PZSH = 0.4;
function pwtPrize(c, pk) {
  const PK = PACKS[pk], l = PK.slots.map(sl => genEnc({ min: sl.min || 0, luck: sl.luck || 0, shm: PK.shm, evo: PK.evo || 0 }));
  const want = typeof SBX !== 'undefined' && SBX && SBX.pz ? SBX.pz : '', e = l[l.length - 1];
  if (want) e.sh = 0;
  if (want !== 'none' && !e.sh && (want || Math.random() < (PZRARE[c.ms ? 'master' : pk] || 0.1))) {
    if (want === 'sh' || (!want && Math.random() < PZSH)) e.sh = 1;
    else { e.iv = starterIv().map(v => Math.min(31, v + 2)); e.nat = rnd(25); e.rr = 'star'; }
  }
  l.forEach(x => { if (x.sh) x.rr = 'sh'; });
  return l;
}

const pwt = () => S.pwt || (S.pwt = { day: '', run: null, won: 0, cups: {} });
const cupNow = () => (SBX && SBX.cup != null && CUPS[SBX.cup]) || CUPS[new Date((S.lad.day || dayKey()) + 'T12:00:00').getDay()] || CUPS[1];
/* Cupen som er i gang. Den gjelder bare dagen den ble startet. */
const pwtRun = () => { const P = pwt(); if (P.run && P.run.day !== S.lad.day) { P.run = null; } return P.run; };
/* Ekstra forsøk i cupen i dag, gitt i lagringen (S.pwt.xb = { d, n }; Jazz 17.11, bare eieren). carry rører det ikke. */
const pwtXb = () => { const x = S.pwt && S.pwt.xb, d = S.lad.day || dayKey(); return x && x.d === d ? Math.max(0, x.n | 0) : 0; };
const pwtOpen = () => !!S.lad.day && !dayStop() && modeOn('pwt') && (!!pwtRun() || pwt().day !== S.lad.day || pwtXb() > 0);
/* ---------- Kampdagen er ferdig ----------
   modeDone(k) = modusen har ikke mer å gi denne kampdagen. Når dagen er ferdig (dayDone), viser raidet seg hvis et venter (raidUnhide).
   En kampdag fra i går kan spilles helt til en ny økt starter. Er den ferdig, går forsiden tilbake til vanlig (se ladderCard). */
const modeDone = k => k === 'week' ? wkDone() : k === 'league' ? ladLost() || ladDone() : k === 'factory' ? facLost() : pwt().day === S.lad.day && !pwtRun() && !pwtXb();
const dayDone = () => !!S.lad.day && (dayShut() || (MODESN < MODES.length ? modeSt().ks.length >= MODESN && modeSt().ks.every(modeDone) : MODES.every(modeDone)));
const dayOld = () => !!S.lad.day && S.lad.day !== dayKey();
/* «Not today»: ingen kamper denne kampdagen. Kan ikke gjøres om. */
function daySkip() { if (!S.lad.day || dayDone() || simPending() || S.live) return false; S.lad.skip = S.lad.day; raidUnhide(); stamp(); save(); return true; }
const pwtLv = () => Math.max(10, Math.min(100, Math.round(leagueLv())));
const pwtSize = () => Math.max(1, Math.min(PWTN, S.party.map(monBy).filter(Boolean).length));
const pwtCoins = (c, r) => Math.round(PWTCOIN[r] * c.f * smFor('pwt') * diff().coin);
function pwtStart() {
  const P = pwt(), c = cupNow(), opp = [];
  c.rounds.forEach(([k, re]) => { let l = POOL[k].map((_, i) => i).filter(i => (!re || re.test(POOL[k][i][5] || '')) && !opp.some(o => o[0] === k && o[1] === i)); if (!l.length) l = POOL[k].map((_, i) => i); opp.push([k, l[rnd(l.length)]]); });
  const lv = pwtLv(), dk = pwtDark(c) ? pwtDarkOpp(c) : null;
  if (dk) opp[opp.length - 1] = dk;
  /* Motstanderne følger vanskelighetsgraden slik som i ligaen: litt lavere nivå på Easy og Normal, likt på Hard. */
  if (P.day === S.lad.day && pwtXb() > 0) P.xb.n--;
  P.day = S.lad.day; P.run = { day: S.lad.day, wd: CUPS.indexOf(c), lv, flv: Math.max(5, Math.round(lv * (1 + diff().rel))), n: pwtSize(), opp, r: 0, foe: null }; if (dk) P.run.dk = c.rounds[c.rounds.length - 1][0] === 'champ' || c.n === 'Elite Four Cup' ? 'supreme' : 'champ'; save();
}
/* Motstanderen i runden som venter: hele laget (esset sist), trukket én gang, så det du ser på forhånd, er det de velger blant.
   Bare esset har vært hos lærerne her (steg 1b.8): de stiller med tre, og esset er alltid med, så lærerangrepene veier tyngre enn i ligaen.
   (Et lag på tre fra en cup som var i gang før steg 1b.3, trekkes på nytt.) */
function pwtFoe() {
  const R = pwtRun(), c = CUPS[R.wd], [k, i] = R.opp[R.r], d = POOL[k][i], mys = !!R.dk && R.r === PWTN - 1, st = diffSt(TCL[mys ? R.dk : k]);
  if (!R.foe || R.foe.length < Math.min(6, d[4].length)) { R.foe = bossTeam(d, 6, R.flv || R.lv, Object.assign({}, st, { tut: Math.min(1, st.tut || 0) }), true); save(); }
  return { c, k, st, mys, team: R.foe, tr: trainerOf(k, i, Object.assign({ skill: st.sk, sc: 'pwt' }, mys ? { mys: 1, ci: TCL[R.dk].i, sp: 0, film: '' } : null)) };
}
/* MOTSTANDERENS VALG I BLINDE: hvilke n av laget som stiller (plasser i team, i den rekkefølgen de sendes ut: lederen først, esset sist).
   Esset er alltid med (det er det du kjenner treneren på, og det du kan legge planen din etter) og aldri først. De andre velges ut fra HELE
   laget ditt (party), for motstanderen vet ikke hvem du stiller med. For hver av dine regnes hvor godt hver av deres står mot den: skaden den
   gir mot skaden den tar, og hvem som slår først (den som bærer Mega-steinen, regnes i formen sin). Laget som har det beste svaret på flest
   av dine, og ellers står best samlet, vinner (PWTAVG = hvor mye det samlede teller). Litt tilfeldighet (PWTNOISE) gjør at jevne lag veksler.
   Hvor nøye de velger, følger taktikken (aiIq) i annen: uten taktikk (Easy, og lederne og Elite Four på Normal) er det oftest to tilfeldige
   ved siden av esset, en mester på Normal velger det beste laget i hver tredje kamp, en leder på Hard også, og en mester på Hard nesten
   alltid (PWTBEST = sjansen uten taktikk og tillegget med full taktikk). */
const PWTAVG = 0.3, PWTNOISE = 0.4, PWTBEST = [0.15, 0.8];
function pwtPick(team, party, lv, n, tr) {
  const ace = team.length - 1, rest = team.map((m, i) => i).filter(i => i !== ace);
  n = Math.max(1, Math.min(n, team.length));
  if (n === 1 || !rest.length) return [ace];
  const iq = aiIq({ tr }), B1 = mkBattle(party.map(m => Object.assign({}, m, { lv })), team.map(m => megaOpts(m.id).includes(m.ms) ? Object.assign({}, m, { mega: m.ms }) : m), tr, {});
  const adv = B1.foe.map(c => B1.me.map(p => { const fast = spdB(B1, c) > spdB(B1, p); return Math.min(1, bestDmg(B1, c, p) / p.max) * (fast ? 1.15 : 1) - Math.min(1, bestDmg(B1, p, c) / c.max) * (fast ? 1 : 1.15); }));
  const val = T => { let s = 0; for (let p = 0; p < B1.me.length; p++) { let b = -9, sum = 0; for (const c of T) { if (adv[c][p] > b) b = adv[c][p]; sum += adv[c][p]; } s += b + PWTAVG * sum / T.length; } return s; };
  const sets = []; (function rec(st, from) { if (st.length === n - 1) { sets.push(st.slice()); return; } for (let j = from; j < rest.length; j++) { st.push(rest[j]); rec(st, j + 1); st.pop(); } })([], 0);
  let pick = sets[rnd(sets.length)];
  if (Math.random() < PWTBEST[0] + PWTBEST[1] * iq * iq) { let bs = -1e9; for (const st of sets) { const sc = val(st.concat(ace)) + Math.random() * PWTNOISE; if (sc > bs) { bs = sc; pick = st; } } }
  /* Lederen: med taktikk den av de valgte som står best mot laget ditt samlet, ellers den som står først. */
  const avg = c => adv[c].reduce((a, x) => a + x, 0), lead = iq > 0 ? pick.slice().sort((a, b) => avg(b) - avg(a))[0] : pick[0];
  return [lead].concat(pick.filter(i => i !== lead), ace);
}
/* us = de du har valgt (u), den første går ut først. Dine spiller på cupens nivå i denne kampen, uten at de egentlige nivåene røres.
   Motstanderen velger uten å se dine: pwtPick får hele laget ditt, ikke us. (Som før stiller de med minst to.) */
function pwtBattle(us) {
  const R = pwtRun(), f = pwtFoe(), party = S.party.map(monBy).filter(Boolean), mine = us.map(monBy).filter(Boolean).slice(0, R.n).map(m => Object.assign({}, m, { lv: R.lv }));
  const foes = pwtPick(f.team, party, R.lv, Math.max(2, R.n), f.tr).map(i => f.team[i]);
  return evApply(mkBattle(mine, foes, f.tr, { mode: 'pwt', st: f.st, mys: f.mys ? 1 : 0, k: f.mys ? R.dk : f.k, r: R.r, cup: f.c.n, bag: 0, xm: 0, sm: smFor('pwt'), dc: diff().coin, boost: { mode: '', m: 1, xp: 1 } }));
}
function finishPwt(B) {
  const P = pwt(), R = pwtRun(), win = B.over === 'win', res = { mode: 'pwt', win, ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', r: B.r, cup: B.cup, done: false };
  if (!R) return res;
  const c = CUPS[R.wd];
  if (!win) {
    P.run = null;
    res.note = pwtXb() > 0 ? `You are out of the ${c.n}, but you have one more try today: enter the cup again.`
      : `You are out of the ${c.n}. A new cup opens after your next day of focus.`;
    raidUnhide(); save(); return res;
  }
  res.coins = Math.round(PWTCOIN[R.r] * c.f * (B.mys ? DARKF : 1) * B.sm * (B.dc || 1) * purseM()); S.coins += res.coins; ringAward(clsI(B.k), res); rarePrize(clsI(B.k), res); evPerk(res);
  modeXp(res, R.n, PWTXP * [1, 1.3, 1.7][Math.min(2, R.r)] * Math.sqrt(c.f), xpMult() * diff().xp * (dayBoost().mode === 'pwt' ? dayBoost().xp : 1));
  R.r++; R.foe = null;
  /* Finaleplassen gir en Rare Candy, og vinneren PWTCANDY til. */
  if (R.r === PWTN - 1) { const n = candyRoll(1); if (n) { S.items.candy = (S.items.candy || 0) + n; res.items.push(`${n} × Rare Candy`); } }
  if (R.r >= PWTN) {
    res.done = true; raidUnhide(); P.won = (P.won || 0) + 1; P.cups[c.n] = (P.cups[c.n] || 0) + 1; P.run = null;
    { const n = Math.max(1, candyRoll(PWTCANDY)); S.items.candy = (S.items.candy || 0) + n; res.items.push(`${n} × Rare Candy`); }
    if (c.ms) { S.items.mstone = (S.items.mstone || 0) + c.ms; res.items.push(`${c.ms} × Mega Stone`); }
    /* Premien er tre møter trukket som plassene i pakken (uten den lille sjansen for epic og legendarisk i den siste plassen, som før). */
    const pk = B.mys ? PKUP[c.pk] : c.pk, PK = PACKS[pk]; res.pz = pwtPrize(c, pk); res.pz.forEach(e => pushEnc(res, e));
    if (B.mys) { P.gold = (P.gold || 0) + 1; res.mys = 1; res.perks.push(`You unmasked ${B.tr.n} and won: a gold trophy, and the prize is one step up.`); }
    res.perks.push(`Champion of the ${c.n}! That is trophy number ${P.won}.`); res.note = `The prize is ${aN(PK.n)}: three encounters are waiting in the grass.`;
  }
  save(); return res;
}

/* ---------- Simulering av kampdagen ----------
   Har du ikke tid til å slåss, kan spillet spille dagens kamper for deg: laget ditt mot dem som venter, med enkle valg (det angrepet som gjør mest
   skade, bytte når den som står inne er sjanseløs, Mega når det går, ingen veske). Det gir SIMPAY av myntene og XP-en kampene ville gitt, og
   ingenting annet: ikke Rare Candy, gjenstander, møter, bytter, medaljer, rundeseier eller raidtrekning. Det skal aldri lønne seg å la være å slåss.
   SLIK: simDay() spiller kampene på en KOPI av lagringen (S byttes ut mens det pågår, og lagres aldri: SIMRUN) og legger resultatet i S.sim.
   Der venter det til du godtar det (simAccept: myntene og XP-en kommer, og kampdagen er over) eller angrer (simUndo: ingenting skjer, men du kan
   ikke simulere igjen den kampdagen, S.lad.simno: da må du slåss selv eller la være). Hvem du møtte, sies ikke: det ville røpet dem. */
const SIMPAY = 0.4, SIMCAP = { league: 8, factory: 10, pwt: 3 };
let SIMRUN = 0;
const simMode = () => { const ks = modeSt().ks.filter(k => !modeDone(k)); return ks.length === 1 && ks[0] !== 'week' ? ks[0] : ''; };
const simCan = () => !!S.lad.day && !S.live && !dayStop() && S.lad.simno !== S.lad.day && !!simMode() && S.party.map(monBy).filter(Boolean).length > 0;
/* Valget til den som spiller for deg. */
function autoMove(B) {
  const u = B.me[B.a], t = B.foe[B.b];
  if (canSwitch(B) && B.turn - (B.asw || -9) > 2 && B.me.some((x, j) => j !== B.a && x.hp > 0)) {
    const threat = bestDmg(B, t, u) / Math.max(1, u.hp), mine = bestDmg(B, u, t) / Math.max(1, t.hp);
    if (threat >= 0.6 && mine < 0.45) {
      let best = -1, bs = 0;
      B.me.forEach((c, i) => { if (i === B.a || c.hp <= 0) return; const inc = bestDmg(B, t, c) / Math.max(1, c.hp), out = bestDmg(B, c, t) / Math.max(1, t.hp), sc = out - inc * 1.2; if (inc < 0.34 && (out > mine + 0.15 || inc < threat * 0.4) && (best < 0 || sc > bs)) { best = i; bs = sc; } });
      if (best >= 0) { B.asw = B.turn; return { t: 'switch', i: best }; }
    }
  }
  let k = -1, bv = -1;
  u.mv.forEach((x, i) => { if (!moveOk(B, i)) return; const m = MOVES[x.i], d = m[4] > 0 ? estDmg(B, u, t, m) : 0, v = (Math.min(100, d / Math.max(1, t.hp) * 100) + (d >= t.hp ? 30 : 0) + 1) * (0.85 + Math.random() * 0.3); if (v > bv) { bv = v; k = i; } });
  return canMega(B, 'me') ? { t: 'move', k, mega: 1 } : { t: 'move', k };
}
function autoBench(B) {
  const t = B.foe[B.b]; let bi = -1, bs = -1e9;
  B.me.forEach((u, j) => { if (u.hp <= 0 || j === B.a) return; const out = bestDmg(B, u, t) / Math.max(1, t.hp), inc = bestDmg(B, t, u) / Math.max(1, u.hp), sc = out - inc * 0.8 + u.hp / u.max * 0.1; if (sc > bs) { bs = sc; bi = j; } });
  return bi;
}
function autoBattle(B) {
  let g = 0;
  while (!B.over && g++ < 600) { if (B.need) { const j = autoBench(B); sendIn(B, j < 0 ? B.a : j); } else runTurn(B, autoAct(B) || autoMove(B)); }
  if (!B.over) B.over = 'loss';
  return B.over === 'win';
}
function simDay() {
  if (!simCan()) return null;
  const k = simMode(), real = S, day = S.lad.day; let out = null;
  S = JSON.parse(JSON.stringify(real)); SIMRUN = 1;
  try {
    const c0 = S.coins, x0 = {}; S.mons.forEach(m => { x0[m.u] = m.xp; });
    let played = 0, won = 0;
    const one = (B, fin) => { autoBattle(B); const r = fin(B); played++; if (r.win) won++; };
    if (k === 'league') while (ladderOpen() && played < SIMCAP.league) one(newBattle(S.party[0]), finishLeague);
    else if (k === 'factory') while (facOpen() && played < SIMCAP.factory) {
      if (!S.fac.run) facStart();
      const R = S.fac.run; S.fac.keep = null;
      if (!R.team) facPick(R.offer.map((m, i) => [i, (m.mega ? 900 : 0) + bstSum(m.id)]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]));
      one(facBattle(), finishFactory);
    }
    else while (pwtOpen() && played < SIMCAP.pwt) { if (!pwtRun()) pwtStart(); one(pwtBattle(S.party.map(monBy).filter(Boolean).sort((a, b) => b.lv - a.lv).slice(0, pwtSize()).map(m => m.u)), finishPwt); }
    const xp = S.mons.filter(m => x0[m.u] != null && m.xp > x0[m.u]).map(m => [m.u, Math.round((m.xp - x0[m.u]) * SIMPAY)]).filter(x => x[1] > 0);
    out = { day, k, played, won, coins: Math.max(0, Math.round((S.coins - c0) * SIMPAY)), xp };
  } catch (_) { out = null; } finally { S = real; SIMRUN = 0; }
  if (out) { S.sim = out; stamp(); save(); }
  return out;
}
function simAccept() {
  const R = simPending(); if (!R) { S.sim = null; return null; }
  const ups = [];
  S.coins += R.coins;
  for (const [u, x] of R.xp) { const m = monBy(u); if (!m) continue; const l0 = m.lv, x0 = m.xp; m.xp += x; m.lv = lvOf(m.xp); ups.push(Object.assign({ u, xp: x, l0, l1: m.lv, x0 }, m.lv > l0 ? learnUp(m, l0) : {})); }
  S.lad.simd = R.day; S.sim = null;
  /* Det som sto åpent i modusen, er brukt: runden i ligaen starter på nytt neste gang, løpet i Frontier er over, og cupen er spilt. */
  if (R.k === 'league') { const L0 = S.lad; L0.n = 0; L0.c = 0; L0.seen = []; L0.next = null; }
  else if (R.k === 'factory') S.fac.run = null;
  else { const P = pwt(); P.run = null; P.day = R.day; }
  raidUnhide(); stamp(); save();
  return { R, ups };
}
function simUndo() { const R = S.sim; if (!R) return false; S.sim = null; S.lad.simno = R.day; stamp(); save(); return true; }

/* ---------- Demo ---------- */
/* Prøvekamp mot en valgfri klasse. Gir ingenting og rører verken ligaen eller Frontier. rent = leide Pokémon på nivå 50 i stedet for ditt eget lag.
   team = et ferdig leielag (oppvisningskampen i omvisningen har sitt eget, sterkere). */
function labBattle(k, rent, pi, team) {
  const i = pi == null ? rnd(POOL[k].length) : pi, d = POOL[k][i], c = TCL[k], rd = 2;
  let me, foes, tr;
  if (rent) {
    const used = new Set(team ? team.map(m => m.id) : []); me = team || Array.from({ length: 4 }, () => facMon(2, used));
    const st = { iv: ULTRA.has(k) ? 31 : 22, ev: ULTRA.has(k) ? 60 : 24, q: 2, slack: 99, mg: c.i >= 8 };
    foes = k === 'trainer' ? Array.from({ length: 4 }, () => facMon(2, used, 2)) : k === 'evilteam' ? regTeam(d[4], 4, FACLV, Object.assign({}, c, st), true) : bossTeam(d, 4, FACLV, st, true);
    tr = trainerOf(k, i, { fr: 1, arena: k === 'trainer' ? 'factory' : 'hall' });
  } else {
    const st = k === 'trainer' ? trainerCls(rd) : c, base = Math.min(100, Math.max(5, Math.round(leagueLv() * st.rel)));
    me = S.party.map(monBy).filter(Boolean); foes = foeTeam(k, d, st.mons, base, st); tr = trainerOf(k, i);
    if (k === 'trainer') tr.skill = st.sk;
  }
  const B = mkBattle(me, foes, tr, { mode: 'lab', st: c, k, rd, n: 0, lap: 0, ti: i, rent: rent ? 1 : 0, bag: rent ? 0 : BAGN, xm: 1, sm: 1, boost: { mode: '', m: 1, xp: 1 } });
  labMega(B);
  return B;
}
/* I demoen kan alle dine som har en Mega-form, prøve den, også uten Mega Ring og stein. */
function labMega(B) { B.me.forEach(b => { if (!b.mg && !b.mega) { const o = megaOpts(b.id); if (o.length) b.mg = o.includes(b.src.ms) ? b.src.ms : o[0]; } }); }
/* ---------- Legendariske kamper ----------
   Når en runde i ligaen eller i Battle Frontier er fullført, viser en legendarisk Pokémon seg. Den er på et høyt nivå og har flere ganger så mye HP
   som vanlig, så den er umulig i starten. Slår du den, venter den i gresset, og da kan du prøve å fange den.
   LEGD: art, trinn (1 legendarisk, 2 de største, 3 mytisk, 4 Mewtwo og Arceus: de to vanskeligste), søk etter låta i pakken, bane, tema på banen, farge, scenen i filmsnutten og kjennetegnet der. */
const LEGD = '144,1,Legendary Birds>>Ho-oh,snowy_tall_grass,snow,#bfe6ff,ice,|145,1,Legendary Birds>>Ho-oh,mountain,spark,#ffe14a,bolt,|146,1,Legendary Birds>>Ho-oh,mountain,flame,#ff9a3a,magma,|150,2,Origins>>Mewtwo,cave,shard,#c79bff,void,rings|151,3,Mew Battle>>Origins,tall_grass,petal,#ffb3d9,forest,|243,1,Raikou>>Entei,mountain,spark,#ffe14a,bolt,|244,1,Entei>>Raikou,cave,flame,#ff7a2a,magma,|245,1,Walking Wake>>Entei,shallow_water,bubble,#7ad0ff,sea,|249,2,Lugia,water,bubble,#cfe6ff,sea,whirl|250,2,Ho-Oh>>Ho-oh,mountain,flame,#ffb23a,sky,rainbow|251,3,Celebi>>Ho-oh,pinwheel_road,petal,#9be07a,forest,|377,1,Regirock>>Heatran,cave,shard,#c9a45c,stone,|378,1,Regirock>>Heatran,kyurem_cave,snow,#bfe6ff,ice,|379,1,Regirock>>Heatran,cave,shard,#b4c0d2,stone,|380,1,Latias>>Rayquaza,mountain,spark,#ff7a8a,sky,|381,1,Latias>>Rayquaza,mountain,spark,#6aa8ff,sky,|382,2,Narwhal>>Kyogre,water,bubble,#3f8cff,sea,glyph|383,2,War Lord>>Kyogre,cave,flame,#ff5a2a,magma,glyph|384,2,Rayquaza,mountain,spark,#3fe08a,sky,streak|385,3,Jirachi>>Deoxys,mountain,spark,#ffe680,space,|386,2,Deoxys,black_tower_10,shard,#ff7a4a,space,rings|480,1,Uxie,shallow_water,bubble,#ffe680,sea,|481,1,Uxie,shallow_water,bubble,#ff8ab0,sea,|482,1,Uxie,shallow_water,bubble,#6aa8ff,sea,|483,2,Palkia,black_tower_10,shard,#6aa8ff,time,rings|484,2,Palkia,black_tower_10,shard,#ff8ad0,space,rift|485,1,Heatran,cave,flame,#ff7a2a,magma,|486,1,Regigigas>>Heatran,cave,shard,#e8e0c0,stone,|487,2,Giratina,kyurem_cave,evil,#e0b030,void,stripes|488,1,Crescent>>Uxie,mountain,shard,#ffb3ea,space,|490,3,Manaphy>>Uxie,water,bubble,#5ad0ff,sea,|491,3,Darkrai>>Giratina,kyurem_cave,evil,#b03060,night,|492,3,Shaymin>>Uxie,tall_grass,petal,#8be07a,forest,|493,4,Arceus,black_tower_10,,#ffe9a8,origin,wheel|494,3,Victini>>Reshiram,pwt,flame,#ff9a3a,magma,|638,1,Swords of Justice>>Cobalion,mountain,shard,#6ac0e8,stone,|639,1,Swords of Justice>>Cobalion,cave,shard,#c9a45c,stone,|640,1,Swords of Justice>>Cobalion,pinwheel_road,petal,#8be07a,forest,|641,1,Galarian Zapdos>>Reshiram,mountain,spark,#8be0a0,sky,|642,1,Galarian Zapdos>>Reshiram,mountain,spark,#6aa8ff,bolt,|643,2,Reshiram,black_tower_10,flame,#fff2e0,flame,pillar|644,2,Reshiram,black_tower_10,spark,#4ad0ff,bolt,pillar|645,1,Galarian Zapdos>>Reshiram,cave,shard,#e0903a,stone,|646,2,Kyurem>>Reshiram,kyurem_cave,snow,#bfe6ff,ice,pillar|647,3,Swords of Justice>>Cobalion,shallow_water,bubble,#6ac0ff,sea,|648,3,Frenzied Flame>>Reshiram,pwt,petal,#9be07a,forest,|649,3,Genesect>>Reshiram,black_tower_3_5,shard,#c79bff,space,';
const LEG = {}; LEGD.split('|').forEach(r => { const q = r.split(','); LEG[+q[0]] = { t: +q[1], mre: q[2], sc: q[3], th: q[4], cc: q[5], bg: q[6], sig: q[7] }; });
/* ---------- Raid-reglene ----------
   NÅR en legendarisk viser seg: sjelden, og aldri til fast tid (raidRoll). Hver studiedag (dagens første OPENMIN minutter) trekkes det én gang:
   RAIDP0, pluss RAIDPITY for hver studiedag som er gått siden RAIDCOOL dager etter forrige raid – så jo lenger det er siden sist, jo likere blir det,
   og ingen venter evig. Når du dagsmålet, trekkes det én gang til den dagen, og en vunnet runde i ligaen eller i Battle Frontier gir en ekstra
   trekning (RAIDWIN). Med studier hver dag blir det om lag ett raid i uka. Bare én venter om gangen. (Før: hver vunnet ligarunde, hver sjuende dag
   på rad og 30 % på dagsmålet, som ga et raid annenhver til hver tredje dag.)
   HVOR LENGE: du har RAIDTRIES forsøk, ett om dagen. Første gang vet du ikke hvem det er; taper du, får du ett forsøk til, og da vet du det.
   Så drar den videre, så du aldri blir stående fast mot en du ikke klarer.
   NIVÅ: settes i det den viser seg, etter laget ditt (snittet av de tre sterkeste + RAIDOFF for sjeldenheten), og aldri over artens toppnivå (RAIDLV).
        Den står godt over laget ditt (RAIDOFF ble løftet da raid ble sjeldnere): et raid skal være vanskelig. Vanskelighetsgraden senker nivå og HP litt på Easy og Normal.
        I kampen står den aldri under laget ditt (gulvet, raidFoeLv, v90).
        Det som gjør et raid tungt, er ikke nivået, men at den legendariske har flere ganger så mye HP (RAIDHP) og de sterkeste artene i spillet.
        Stilt inn med simulerte kamper (med stedets hendelser og raseriet): et jevnt lag uten veske slår de vanlige omtrent annenhver gang på Hard, de største bare av og til.
   STEDET: hver legendarisk har et domene som kjemper med (se DOM lenger ned): en liten hendelse hver tredje runde, og raseri under halv HP.
   HVEM: oftest en vanlig legendarisk (1), så de mytiske (3) og de største (2). De aller sjeldneste (4: Mewtwo og Arceus, de to vanskeligste) starter på 3 %,
        og sjansen vokser litt for hvert raid uten en av dem (S.rpity), så de kommer før eller siden. Mewtwo har egen trekning (MEWP) til du har den mørke,
        og hver gang du slår Mewtwo, reiser skyggen seg: runde to, mot Dark Mewtwo.
   BELØNNING: mynter (RAIDCOIN × vanskelighetsgrad), Rare Candy (RAIDCANDY), mye XP til hele laget, og den legendariske selv: seieren er fangsten
   (raidCatch). Før måtte den fanges med kast etterpå, og da slapp fire av ti unna etter et vunnet raid. */
const RAIDLV = [75, 88, 82, 96, 100], RAIDHP = [2.0, 3.2, 1.8, 3.4, 3.6], RAIDCOIN = [1800, 3800, 2700, 7500, 12000], RAIDCANDY = [3, 5, 4, 8, 10], RAIDOFF = [6, 12, 5, 13, 16], RAIDREL = [0.16, 0.32, 0.13, 0.36, 0.45], RAIDCAPHP = 0.025;
const RAIDTRIES = 2, RAIDP0 = 0.08, RAIDPITY = 0.035, RAIDWIN = 0.25, RAIDCOOL = 3, MEWP = 0.08, MEWP1 = 0.16;
/* Egen HP-faktor for enkelte arter, oppå klassens (RAIDHP). Innen «de største» var spredningen for stor: Dialga, Palkia, Zekrom og Reshiram var nesten
   uslåelige for alle lag uten legendariske, og hardere enn Mewtwo og Arceus, som skal være de to vanskeligste. Stilt inn med sim/perleg.js.
   Rayquaza 0,9 → 1,2 (v90, Jazz 24.11: et lag på nivå 60 holdt på å slå den på Normal). Med Mega under 70 % (RAGEAT), perleg Normal med Sacred Ash, lag på
   60/70: T2 12/17 % → 2/4 %, T3 32/40 % → 12/12 % (uten Sacred Ash 0–4 %); Hard: laget til Jazz på 97 95 % → rundt 50 %, T3@100 74 → 22 %, fortsatt lettere enn Arceus. */
const RAIDX = { 144: [1.15, 1.04], 145: [1.07, 1], 146: [1.2, 1.05], 150: [0.51, 0.9], 151: [1.5, 1.06], 243: [0.87, 1], 244: [1.17, 1.02], 245: [0.91, 1], 249: [0.8, 0.98], 251: [1.26, 1.1], 377: [1.16, 1.02], 378: [1.2, 1.05], 379: [1.2, 1.05], 380: [0.89, 1], 381: [0.66, 1], 382: [0.7, 0.88], 383: [0.95, 1], 384: [1.2, 1], 385: [1.39, 1.04], 386: [1.4, 1], 480: [1.2, 1.02], 481: [0.85, 1], 482: [1.2, 1.05], 483: [0.64, 0.86], 484: [0.6, 0.86], 485: [1.2, 1.05], 486: [1.07, 1.02], 487: [0.65, 0.96], 488: [1.05, 1.04], 490: [0.61, 1], 491: [0.98, 1], 492: [1.21, 1], 493: [0.85, 1], 494: [1.5, 1.1], 638: [0.92, 1], 639: [0.69, 1], 640: [1.07, 1], 641: [1.2, 1.05], 642: [1.2, 1.05], 643: [0.73, 0.94], 644: [0.73, 0.97], 645: [1.2, 1.05], 646: [0.67, 0.98], 647: [0.63, 0.88], 648: [1.5, 1.1], 649: [1.07, 1] };
const raidX = id => RAIDX[id] || [1, 1];
/* Ingen legendarisk går tom for PP i et raid (steg 1b.4, useMove i battle.js). Før gjaldt det bare Mewtwo, Arceus, Deoxys og den mørke, og de andre
   mistet de sterkeste angrepene sine i en lang kamp. */
/* De sterkeste viser seg bare for lag som kan gi dem kamp: de mytiske fra lagnivå 25, de største fra 35, og Mewtwo og Arceus fra 45. (Dark Mewtwo kommer bare ut av en slått Mewtwo.) */
const RAIDGATE = [0, 35, 25, 45, 45];
/* Nivået den ville hatt uten tak: laget ditt + RAIDOFF nivåer, eller + RAIDREL i andel (det som er høyest, så den står like langt over et sterkt lag som
   over et svakt). Taket er artens toppnivå (RAIDLV, tre nivåer høyere for hver runde du har vunnet, høyst 100). Mangler den nivåer på grunn av taket,
   får den RAIDCAPHP mer HP for hvert av dem (raidHx, lagres i S.raid.hx). */
const raidWant = t => { const l = leagueLv(); return Math.round(Math.max(l + RAIDOFF[t - 1], l * (1 + RAIDREL[t - 1]))); };
const raidCap = t => Math.min(100, RAIDLV[t - 1] + 3 * Math.min(5, S.lad.lap || 0));
const raidLvFor = t => Math.max(15, Math.min(raidCap(t), raidWant(t)));
/* GULVET (v90, Jazz 24.11: «mitt lag er nivå 100, da skal ingen legendaries være mindre enn nivå 100»): i kampen står den legendariske aldri under laget ditt,
   men minst RAIDFLOOR nivåer over det (høyst 100), uansett taket over, vanskelighetsgraden (rlv) og artens nivåfaktor (RAIDX). Før sto de vanlige 4–11 nivåer
   under et lag på 97 (taket), og de største med lav nivåfaktor (Kyogre, Dialga, Palkia, Mewtwo) på 86–90. Gulvet settes etter laget i det den viser seg (S.raid.fl),
   som nivået ellers, så trening før neste forsøk hjelper; et raid fra før v90 får det etter laget slik det er nå. HP-en (raidHx) er som før, så raidene blir
   tøffere for lag på 90–100, og det er meningen (perleg Hard, T3@100: de største 88 → 74 %). Taket selv tas i 7.0 (MONDAY.md, «Nivåtaket»). */
const RAIDFLOOR = 3;
const raidFloor = () => Math.min(100, Math.round(leagueLv()) + RAIDFLOOR);
/* Nivået i kampen: raidnivået (R.lv) etter vanskelighetsgraden og arten, aldri under gulvet. Gaven (R.ev) står på 100. */
const raidFoeLv = R => R.ev ? 100 : Math.max(R.fl || raidFloor(), Math.max(10, Math.round(R.lv * diff().rlv * (R.dk ? 1 : raidX(R.id)[1]))));
/* Dark Mewtwo (5) får ikke dette tillegget: den står alltid på toppnivået sitt, og med tillegget hadde den nær ti ganger vanlig HP mot et lag på
   nivå 100. Da var den umulig for alle, uansett lag. Nå er den RAIDHP[4] ganger vanlig HP, og fortsatt den hardeste i spillet. */
const raidHx = t => t === 5 ? 1 : 1 + RAIDCAPHP * Math.max(0, raidWant(t) - Math.max(15, raidCap(t)));
/* Dark Mewtwo (Shadow Mewtwo i Pokkén Tournament, «Dark Mewtwo» på japansk): den sjeldneste og sterkeste av alle. Samme art som Mewtwo, men mørk (sh: 2),
   på et høyere nivå enn Arceus og med mer HP. Den finnes ikke som eget raid: den er RUNDE TO. Slår du Mewtwo i et raid, er Mewtwo din
   med en gang, og skyggen reiser seg ALLTID som Dark Mewtwo (finishRaid), helt til du eier den mørke. Laget ditt er friskt igjen (en ny kamp), og du må slåss
   en gang til, med en gang. Vinner du, tar den mørke plassen til Mewtwoen din (darkTake): du har aldri begge fra samme raid. Taper du, står den igjen som raid
   med RAIDTRIES forsøk, og går også de tapt, slipper skyggen taket. Mewtwo beholder du uansett, og neste gang du slår en Mewtwo, reiser skyggen seg igjen. */
const DARK = { id: 150, t: 5, mre: 'X & Y - Mewtwo>>Mewtwo', sc: 'cave', th: 'evil', cc: '#ff8a2a', bg: 'void', sig: 'rings', n: 'Dark Mewtwo', title: 'Shadow Pokémon' };
const hasDark = () => S.mons.some(m => m.id === 150 && m.sh === 2);
const raidInfo = R => R && R.dk ? DARK : R ? LEG[R.id] : null;
/* Det raidkortet viser før kampen. */
const raidShow = R => ({ L: raidInfo(R), n: R.dk ? DARK.n : D(R.id)[0], sh: R.dk ? 2 : R.sh ? 1 : 0, lv: R.lv });
const raidTitle = (id, dk) => dk ? DARK.title : id === 493 ? 'The Original One' : LEG[id].t === 3 || id === 386 ? 'Mythical Pokémon' : 'Legendary Pokémon';
const legOwn = id => S.mons.some(m => m.id === id) || (S.pend || []).some(e => e.id === id);
/* HVEM SOM KOMMER, følger samlingen din (legN = antall legendariske arter du eier):
   - Klassene veies etter RAIDW0 når du ikke eier noen, og etter RAIDW1 når du eier RAIDFAR arter eller flere, jevnt imellom: de vanlige og de mytiske
     viker for de største og for Mewtwo og Arceus, så du bygger deg gradvis opp mot dem. Klasse 4 har i tillegg sin egen ventetid (S.rpity) som før.
   - Lagnivået må være høyt nok for klassen (RAIDGATE); ellers går vekten til klassen under.
   - Innen klassen: aldri en du har (eller som venter i gresset) så lenge det finnes en ny. En klasse du har ALLE i, gir plassen sin til de klassene der
     du mangler noen, så langt ute er det nesten bare de største igjen. Først når du eier alle, kommer de om igjen (Mewtwo ikke, om du har den mørke).
   - Mewtwo sin egen trekning (til du har den mørke) går fra MEWP til MEWP1 på samme måte.
   - DET FØRSTE RAIDET (S.humb) er Mewtwo eller Arceus, uansett lagnivå, og det kommer tidlig (HUMBDAY studiedager): man skal møte veggen først.
     Etterpå er alt som beskrevet over. Den som alt har vunnet et raid, er forbi dette. */
const RAIDW0 = [0, 57, 18, 22, 3], RAIDW1 = [0, 30, 42, 16, 12], RAIDFAR = 24, HUMBDAY = 3, HUMB = [150, 493];
const legN = () => Object.keys(LEG).filter(id => S.mons.some(m => m.id === +id)).length;
const raidFar = () => Math.min(1, legN() / RAIDFAR);
function raidPick() {
  const p = raidFar(), lv = leagueLv(), all = Object.keys(LEG).map(Number), w = [0, 1, 2, 3, 4].map(t => RAIDW0[t] + (RAIDW1[t] - RAIDW0[t]) * p);
  w[4] = Math.min(25, w[4] + 0.6 * (S.rpity || 0));
  if (lv < RAIDGATE[3]) { w[2] += w[4]; w[4] = 0; } if (lv < RAIDGATE[1]) { w[3] += w[2]; w[2] = 0; } if (lv < RAIDGATE[2]) { w[1] += w[3]; w[3] = 0; }
  const inT = t => all.filter(id => LEG[id].t === t && !(id === 150 && lv < RAIDGATE[3])), fresh = t => inT(t).filter(id => !legOwn(id) && !(S.rnot || []).includes(id));
  const open = [1, 2, 3, 4].filter(t => w[t] > 0 && fresh(t).length), use = open.length ? open : [1, 2, 3, 4].filter(t => w[t] > 0);
  let x = Math.random() * use.reduce((a, t) => a + w[t], 0), t = use[use.length - 1];
  for (const k of use) { x -= w[k]; if (x <= 0) { t = k; break; } }
  /* Har du den mørke, er historien om Mewtwo ferdig: den kommer ikke igjen, heller ikke når alt er samlet. */
  const c = fresh(t), again = inT(t).filter(id => !(id === 150 && hasDark())), pick = c.length ? c : again.length ? again : inT(t);
  return pick[rnd(pick.length)];
}
/* En trekning om en legendarisk viser seg. Uten p: dagens trekning (RAIDP0 + RAIDPITY for hver studiedag utover RAIDCOOL siden forrige raid; S.rwait
   teller studiedagene og økes i grant). Med p: en ekstra trekning med den sjansen (en vunnet runde), men heller ikke den før RAIDCOOL dager er gått. */
function raidRoll(p) {
  if (S.raid || !S.party.length || (jOn() && !S.humb)) return false;
  /* Et bestilt raid (S.rforce = 'ÅÅÅÅ-MM-DD', settes bare for hånd i én lagring etter protokollen): ingen trekning før den dagen, og den første
     trekningen fra og med den dagen gir et raid. Det er en vanlig trekning (S.humb = 1: ikke det første møtet med Mewtwo eller Arceus), og
     artene i S.rnot er utelatt (raidPick). */
  if (S.rforce) { if (dayKey() < S.rforce) return false; delete S.rforce; S.humb = 1; return raidSpawn(); }
  /* Det første raidet kommer tidlig, uten trekning. */
  if (!S.humb && (S.rwait || 0) >= HUMBDAY) return raidSpawn();
  const w = (S.rwait || 0) - RAIDCOOL - (diff().rc || 0); if (w < 0) return false;
  return Math.random() < (p != null ? p : RAIDP0 + RAIDPITY * w) * (diff().rf || 1) ? raidSpawn() : false;
}
/* Seieren er fangsten: den legendariske blir med deg i det raidet er vunnet, uten kast. Nivået er som for et møte i gresset (etter laget ditt),
   ikke raidnivået. res.cau = { u, isNew } til oppsummeringen. */
function raidCatch(id, dk, res, sh) {
  const e = genEnc({ ids: [id] }), isNew = !S.caught[id], m = addMon(id, e.lv, dk ? 2 : sh ? 1 : 0, 0, e.g);
  if (res) { res.cau = { u: m.u, isNew }; if (isNew) { res.cau.c = NEWCOIN[tierOf(id)] || 0; S.coins += res.cau.c; } }
  return m;
}
function raidSpawn(res) {
  if (S.raid) return false;
  const lv = leagueLv();
  /* Mewtwo har sin egen trekning (MEWP) helt til du eier Dark Mewtwo, også om du alt har den vanlige: det er bare gjennom den du kan møte den mørke. */
  let first = 0;
  if (!S.humb) { S.humb = 1; const two = HUMB.filter(x => !legOwn(x)); if (!(S.st && S.st.rw > 0) && two.length) first = two[rnd(two.length)]; }
  const mew = !first && !hasDark() && lv >= RAIDGATE[3] && Math.random() < MEWP + (MEWP1 - MEWP) * raidFar(), id = first || (mew ? 150 : raidPick()), t = LEG[id].t;
  /* Ventetiden for klasse 4 nullstilles når klassen selv blir trukket (og ved det første møtet), ikke av Mewtwo sin egen trekning: ellers ville
     hver Mewtwo holdt Arceus borte. */
  S.rpity = t >= 4 && !mew ? 0 : (S.rpity || 0) + 1;
  /* hid = ikke vist ennå: den viser seg først når dagens kamper er spilt, simulert eller hoppet over (raidUnhide), som en overraskelse.
     sh = shiny: 1 av SHINYN, eller PRISMP når en Prism Lure er kjøpt (den brukes opp her). */
  const sh = Math.random() < (S.prism ? PRISMP : 1 / SHINYN) ? 1 : 0; S.prism = 0;
  S.raid = { id, lv: raidLvFor(t), fl: raidFloor(), hx: +raidHx(t).toFixed(2), day: '', tries: 0, at: dayKey(), nw: 0, hid: 1, sh }; S.rwait = 0; delete S.rnot;
  if (res) res.raid = id;
  return true;
}
function raidUnhide() { const R = S.raid; if (!R || !R.hid) return false; R.hid = 0; R.nw = 1; return true; }
/* GAVE 13. NOV 2026 (bestilt av Jazz): alle utenom eieren får Deoxys som raid denne ene dagen, med ETT forsøk og så mye HP at den ikke kan slås
   (ev = 1), og en gratis Poké, Great og Ultra Pack (S.fpk: gratispakker, brukes i openPack). Et raid som alt ventet, legges til side (S.rst) og
   kommer tilbake når Deoxys er borte (raidGone). S.gift = merket for at gaven er gitt, S.gnote = arket om gaven er ikke vist ennå. */
const GIFT = { k: 'g1113', d: '2026-11-13', id: 386, pk: ['poke', 'great', 'ultra'], hx: 30 };
function giftCheck() {
  if (!S.started || S.gift === GIFT.k || dayKey() !== GIFT.d || !S.party.length || !LEG[GIFT.id] || (typeof isAdmin === 'function' && isAdmin())) return false;
  S.gift = GIFT.k;
  if (S.raid && !S.raid.ev) S.rst = S.raid;
  S.raid = { id: GIFT.id, lv: 100, hx: GIFT.hx, day: '', tries: 0, at: dayKey(), nw: 1, hid: 0, sh: 0, ev: 1 };
  S.fpk = S.fpk || {}; GIFT.pk.forEach(k => { S.fpk[k] = (S.fpk[k] || 0) + 1; });
  S.gnote = 1; save(true); return true;
}
/* GAVE 18. NOV 2026 (bestilt av Jazz): kompisen byttet bort sin shiny Electivire på nivå 54 ved et uhell i et byttetilbud i ligaen (ett trykk på
   laget tok byttet; v86 har bekreftelsen, se tradeCard i bui.js). Den gis tilbake til alle utenom eieren (Jazz: «Han er eneste som spiller utenom
   meg») som har hatt en Electivire, ikke har en shiny Electivire nå, og startet før utgivelsen (første dag i loggen før GIFTE.by). Nye spillere og
   den som aldri hadde en, får den altså ikke. Natur, trening og angrep den hadde, vet ikke appen: den kommer på nivå 54 med full IV (som alle shiny),
   angrepene den kan på nivået, Naughty (+Attack, −Sp. Def: rører ikke spesialangrepene den har) og vanlig størrelse.
   Én gang per lagring (S.gx = merket). Arket om den (backSheet i ui.js) vises én gang (S.gxn = Pokémonen). Aldri for eieren (isAdmin), i sandkassa,
   eller før synken har valgt hvilken lagring som gjelder (GH uten ok, som i jFriend). */
const GIFTE = { k: 'e1118', id: 466, lv: 54, nat: 4, by: '2026-11-19' };
function giftBack() {
  if (!S.started || S.gx === GIFTE.k || (typeof SBX !== 'undefined' && SBX) || typeof isAdmin !== 'function' || isAdmin() || (GH && !GH.ok)) return false;
  const first = Object.keys(S.log || {}).sort()[0] || '';
  if (!(S.caught || {})[GIFTE.id] || !first || first >= GIFTE.by || S.mons.some(m => m.id === GIFTE.id && m.sh)) return false;
  const m = addMon(GIFTE.id, GIFTE.lv, 1, 0); m.nat = GIFTE.nat; delete m.sz;
  S.gx = GIFTE.k; S.gxn = m.u; save(true); return true;
}
const raidTries = R => R && R.ev ? 1 : RAIDTRIES;
/* RAIDINTROEN (reisen): etter den første kampen viser Deoxys seg. Den kan ikke slås, og det er meningen: den viser hva som finnes der ute.
   ev = 2, ett forsøk, nivå 100. S.humb = 1, så det vanlige første raidet (HUMB) ikke kommer i tillegg, og S.rwait = 0, så neste raid tar noen dager. */
function jRaid() {
  if (!jOn() || S.raid || S.humb || !S.party.length || !LEG[386]) return false;
  S.humb = 1; S.rwait = 0; S.raid = { id: 386, lv: 100, hx: 30, day: '', tries: 0, at: dayKey(), nw: 1, hid: 0, sh: 0, ev: 2 }; save(true); return true;
}
function raidGone() { S.raid = S.rst || null; delete S.rst; }
const raidOpen = () => !!S.raid && !S.raid.hid && !!LEG[S.raid.id] && S.raid.day !== dayKey();
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
  night: { n: 'Nightmare', k: 'chip', imm: [], s: 'A nightmare closes around {N}!', d: 'a nightmare hurts your Pokémon a little (nothing is safe from it)', up: [[4, 1]] },
  dark: { n: 'Shadow Field', k: 'both', st: 5, imm: [], s: 'Shadows tear at {N}!', d: "the shadows hurt your Pokémon a little and lower its Sp. Def", up: [[2, 1], [4, 1]] }
};
const domKey = tr => tr.dk ? 'dark' : tr.lbg === 'flame' ? 'magma' : tr.lbg, raidDom = tr => DOM[domKey(tr)] || null;
/* Raseriet kommer under halv HP, men noen arter blir rasende tidligere (RAGEAT: andel av HP-en). Rayquaza (v90, Jazz 24.11: «Mega rayquaza bør og se litt før»):
   Mega Rayquaza under 70 %, så Delta Stream tar firedobbel is-svakhet fra den tidligere. rageTxt er det raidkortet sier. */
const RAGEAT = { 384: 0.7 }, rageAt = id => RAGEAT[id] || 0.5, rageTxt = id => rageAt(id) === 0.5 ? 'half HP' : Math.round(rageAt(id) * 100) + ' % of its HP';
/* Kalles på slutten av hver runde i en raid (fra endTurn i battle.js). */
function raidField(B, ev) {
  const D0 = raidDom(B.tr), f = B.foe[B.b], b = B.me[B.a]; if (!D0 || B.over || f.hp <= 0) return;
  const N = nmOf('me', b), F = f.name;
  /* Deoxys åpner i Attack Forme, går i Defense Forme når to runder er gått, og tilbake i Attack Forme når den blir rasende. */
  if (f.id === DEOXYS && f.mega === DEOXA && !B.rage && B.turn >= DEOXT && f.hp > f.max / 2) raidForm(B, ev, DEOXD);
  if (!B.rage && f.hp <= f.max * rageAt(B.tr.dk ? 0 : f.id)) { B.rage = 1; ev.push({ t: 'env', k: 'rage', s: `${F} is enraged!` }); if (!(f.id === DEOXYS && raidForm(B, ev, DEOXA)) && !(f.id === 648 && formTo(B, 'foe', f, PIROU, ev)) && !megaEvolve(B, 'foe', ev, 'rage')) changeStats(B, 'foe', D0.up, ev); }
  if (b.hp <= 0 || b.v.away) return;
  /* Arceus bytter plate: første gang når første runde er over, så hver ARCEV-te runde (hver ARCEV2-te når den er rasende). */
  if (f.id === ARCEUS && !B.tr.dk) { B.arc = (B.arc == null ? ARCEV : B.arc) + 1; if (B.arc > (B.rage ? ARCEV2 : ARCEV)) { B.arc = 1; arcPlate(B, ev); } }
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
/* DEOXYS I RAID skifter form: Attack Forme i åpningen (DEOXT runder) og i raseriet, Defense Forme imellom. Verdiene følger formen (HP er lik i alle). */
const DEOXT = 2;
function raidForm(B, ev, to) {
  const f = B.foe[B.b]; if (f.id !== DEOXYS || f.mega === to || f.hp <= 0) return false;
  const g = MEGA[to - 1], st = statsOf(Object.assign({}, f.src, { mega: to }));
  f.st = [f.st[0]].concat(st.slice(1)); f.ty = [g[2], g[3]]; f.mega = to;
  ev.push({ t: 'mega', side: 'foe', id: f.id, mega: to, sh: f.sh, forme: 1, txt: `${f.name} is changing its shape!` }, { t: 'msg', s: `${f.name} changed to its ${g[1]} Forme!` });
  return true;
}
/* ARCEUS I RAID bytter plate (Multitype): den tar en type som tåler angrepet den sist ble truffet av, og blant dem helst en som treffer Pokémonen din
   hardt og tåler typene dens (litt tilfeldig, så det ikke alltid blir den samme). Judgment, fargen og typen følger plata, og plata gir angrep av typen PLATEX som ellers. Ingen immunitet varer:
   en Ghost-type er trygg for Normal bare til første bytte.
   ARCW = vektene i valget: [tåle angrepet den sist ble truffet av, treffe Pokémonen din hardt, tåle typene dens, tilfeldighet]. Forsvar veier tyngst:
   den tilpasser seg det du kaster mot den, så samme angrep virker dårligere og dårligere, og du må veksle. */
const ARCW = [10, 3, 2, 2];
const ARCEV = 3, ARCEV2 = 2;
function arcPlate(B, ev) {
  const f = B.foe[B.b], b = B.me[B.a]; if (f.id !== ARCEUS || f.hp <= 0 || !b || b.hp <= 0) return false;
  const li = B.lastM.me, lm = li != null && li >= 0 && MOVES[li][4] > 0 ? mvEff(B, b, MOVES[li]) : null, lt = lm ? lm[1] : -1;
  let best = -1, bs = -1e9;
  for (let t = 1; t <= 17; t++) {
    if (!HELD['p' + t]) continue;
    const as = { ty: [t, -1], v: {} }, last = lt >= 0 ? typeEff(lt, as) : 1, off = typeEff(t, b), hurt = Math.max(...b.ty.filter(x => x >= 0).map(x => typeEff(x, as)));
    const sc = -last * ARCW[0] + Math.min(2, off) * ARCW[1] - Math.min(2, hurt) * ARCW[2] + Math.random() * ARCW[3];
    if (sc > bs) { bs = sc; best = t; }
  }
  /* Står den alt med den beste plata, beholder den den. */
  if (best < 0 || best === f.ty[0]) return false;
  const k = 'p' + best; f.item = k; f.src.item = k; f.ty = [best, -1]; if (f.orig) f.orig.ty = [best, -1];
  ev.push({ t: 'plate', side: 'foe', ty: best, s: `${f.name} draws on the ${HELD[k].n}!` }, { t: 'msg', s: `It became the ${TYN[best]} type!` });
  return true;
}
/* Dark Mewtwo forvandles midt i kampen. Kampskjermen bestemmer når (dkShift i bui.js: når den første låta er slutt), reglene står her: helsa løftes til DKHP
   av full hvis den er lavere, og verdiene i DKUP går opp ett trinn. Skjer høyst én gang i en kamp (B.sin). */
/* ARCEUS: står Arceus på laget ditt og er på beina når den blir «provoked», holder lyset mørket tilbake, og den får IKKE kreftene igjen (B.god;
   Sp. Atk og Speed stiger som ellers). Det er helbredelsen som gjør forvandlingen så tung, så dette er en stor fordel. Låta som tar over, heter
   «Where Is Your God Now»: er Arceus slått ut før det skjer, er det ingen som svarer. */
const DKHP = 0.75, DKUP = [[4, 1], [6, 1]], DKGOD = 493;
function darkShift(B, ev) {
  const f = B.foe[B.b]; if (!B.tr || !B.tr.dk || B.sin || B.over || !f || f.hp <= 0) return false;
  B.sin = 1; const to = Math.ceil(f.max * DKHP), god = B.me.find(b => b.id === DKGOD && b.hp > 0);
  if (god) { B.god = 1; ev.push({ t: 'god' }, { t: 'msg', s: `${god.name} answers!` }, { t: 'msg', s: 'Its light holds the darkness back.' }, { t: 'msg', s: `${f.name} could not restore its strength!` }); }
  else if (f.hp < to) { f.hp = to; ev.push({ t: 'heal', side: 'foe', hp: f.hp }, { t: 'msg', s: `${f.name} restored its strength!` }); }
  changeStats(B, 'foe', DKUP, ev); return true;
}
/* KYOGRE I RAID (Jazz 19.11): kamplåta («All-Devouring Narwhal») bygger seg opp mot phase 2 ved 3:43. Har ikke halv HP gjort Kyogre rasende innen da, gjør stormen
   det: raseriet kommer som ellers (verdiene, hendelsene hver RAIDEV2-te runde) med Primal Reversion. Kampskjermen bestemmer når (kyShift i bui.js: når låta når
   cutscenens start), reglene står her. Skjer bare med låta (uten den: halv HP som før), og høyst én gang. */
/* GENERELT FRA 2b.2: gjelder arten kampskjermen ber om (den som har et kart over låta: kyTl i bui.js). Groudon: låta («War Lord») når bruddet for andre gang. */
const KYOGRE = 382, PEAK = { 382: 'The storm reaches its peak!', 383: 'The heat reaches its peak!' };
function stormRage(B, ev) {
  const f = B.foe[B.b], D0 = raidDom(B.tr); if (!B.tr || B.tr.dk || !B.tr.leg || B.rage || B.over || !f || f.hp <= 0 || !D0) return false;
  B.rage = 1; ev.push({ t: 'env', k: 'rage', s: `${PEAK[B.tr.leg] ? PEAK[B.tr.leg] + ' ' : ''}${f.name} is enraged!` });
  if (!megaEvolve(B, 'foe', ev, 'rage')) changeStats(B, 'foe', D0.up, ev);
  return true;
}
/* Formen en legendarisk forvandles til når den blir rasende i et raid (0 = ingen). Mewtwo har Dark Mewtwo som sin andre form og forvandles ikke. */
const raidMega = R => R.dk || R.id === 150 ? 0 : megaOpts(R.id)[0] || 0;
/* Steinen til en legendarisk (Blue Orb, Red Orb, eller Mega-steinen dens). */
const legStone = id => id === 382 ? 'the Blue Orb' : id === 383 ? 'the Red Orb' : `${D(id)[0]}'s Mega Stone`;
function legTr(id, dk) {
  const L = dk ? DARK : LEG[id], d = D(id);
  /* Taktikken (aiIq i battle.js) følger vanskelighetsgraden som hos trenerne: raidBattle setter skill, så Easy har ingen, Normal halvparten og Hard alt. */
  return { n: dk ? L.n : d[0], img: '', title: raidTitle(id, dk), ty: d[1], kind: 'legend', ci: 10, cn: 'Legendary raid', skill: 1, boss: true, ultra: true, gold: L.t === 4, int: 8,
    sc: L.sc, th: L.th, cc: L.cc, arena: 'hall', v: 0, mre: L.mre, wild: 1, leg: id, dk: dk ? 1 : 0, lt: L.t, lbg: L.bg, sig: L.sig };
}
/* En legendarisk i raid slår aldri ut seg selv: Explosion, Final Gambit, Memento og lignende byttes ut med det beste den ellers kan. */
/* Den helbreder seg heller ikke: med flere ganger så mye HP som en vanlig Pokémon ville Rest eller Recover gjort kampen håpløs. */
const SELFKO = new Set(['Explosion', 'Self-Destruct', 'Final Gambit', 'Memento', 'Healing Wish', 'Lunar Dance', 'Destiny Bond', 'Perish Song',
  'Rest', 'Recover', 'Roost', 'Soft-Boiled', 'Synthesis', 'Moonlight', 'Morning Sun', 'Milk Drink', 'Slack Off', 'Heal Order', 'Wish', 'Swallow', 'Pain Split', 'Leech Seed', 'Ingrain', 'Aqua Ring']);
/* ---------- Settene til de legendariske (steg 1b.4) ----------
   Hver av de 47 (og Dark Mewtwo) har et håndplukket sett: signaturangrepet eller det arten er kjent for, et angrep av egen type, dekning og ett
   taktisk. Bare angrep arten kan lære i spillene (sjekket mot PokeAPI med work/sim/t_b9.js, i en hvilken som helst form og et hvilket som
   helst spill), og ingen som slår den ut selv, helbreder den eller bygger opp verdiene dens (SELFKO): med flere ganger så mye HP ville
   det gjort kampen håpløs. Settet er det samme på alle nivåer, og i et raid går den aldri tom for PP (useMove i battle.js: den som har b.big).
   Den som fanges, får settet som utgangspunkt (addMon), og angrepene kan byttes som ellers; de fire står alltid i angrepsvalget (extraMoves).
   Før steg 1b.4 ble settet trukket fra nivålista (legLevelMoves), og da fikk Uxie Flail og Mewtwo Swift. */
const LEGSET = {
  144: 'Blizzard|Hurricane|Ancient Power|Hail', 145: 'Thunder|Drill Peck|Heat Wave|Rain Dance', 146: 'Fire Blast|Air Slash|Solar Beam|Sunny Day',
  150: 'Psystrike|Aura Sphere|Ice Beam|Psych Up', 151: 'Psychic|Aura Sphere|Flamethrower|Thunder Wave',
  243: 'Thunderbolt|Extrasensory|Shadow Ball|Reflect', 244: 'Sacred Fire|Eruption|Stone Edge|Roar', 245: 'Hydro Pump|Scald|Ice Beam|Tailwind',
  249: 'Aeroblast|Psychic|Hydro Pump|Whirlwind', 250: 'Sacred Fire|Brave Bird|Earthquake|Sunny Day', 251: 'Future Sight|Psychic|Energy Ball|Earth Power',
  377: 'Hammer Arm|Stone Edge|Earthquake|Stealth Rock', 378: 'Ice Beam|Thunderbolt|Flash Cannon|Thunder Wave', 379: 'Iron Head|Hammer Arm|Earthquake|Toxic',
  380: 'Mist Ball|Dragon Pulse|Thunderbolt|Reflect', 381: 'Luster Purge|Dragon Pulse|Aura Sphere|Light Screen',
  382: 'Water Spout|Hydro Pump|Ice Beam|Thunder', 383: 'Eruption|Earthquake|Solar Beam|Stealth Rock', 384: 'Outrage|Air Slash|Earthquake|Extreme Speed',
  385: 'Doom Desire|Iron Head|Psychic|Thunder Wave', 386: 'Psycho Boost|Psychic|Brick Break|Extreme Speed',
  480: 'Psychic|Foul Play|Thunderbolt|Yawn', 481: 'Psychic|Ice Beam|Thunderbolt|Charm', 482: 'Psychic|Flamethrower|Shadow Ball|Taunt',
  483: 'Roar of Time|Flash Cannon|Earth Power|Thunder Wave', 484: 'Spacial Rend|Hydro Pump|Earth Power|Gravity', 485: 'Magma Storm|Flash Cannon|Earth Power|Will-O-Wisp',
  486: 'Crush Grip|Earthquake|Hammer Arm|Confuse Ray', 487: 'Shadow Force|Dragon Claw|Aura Sphere|Will-O-Wisp', 488: 'Psychic|Ice Beam|Shadow Ball|Psycho Shift',
  490: 'Scald|Ice Beam|Energy Ball|Heart Swap', 491: 'Dark Void|Dark Pulse|Ice Beam|Nightmare', 492: 'Seed Flare|Energy Ball|Earth Power|Sweet Kiss',
  493: 'Judgment|Earth Power|Extreme Speed|Hyper Voice', 494: 'V-create|Psychic|Thunderbolt|Will-O-Wisp',
  638: 'Sacred Sword|Iron Head|Stone Edge|Thunder Wave', 639: 'Sacred Sword|Stone Edge|Earthquake|Taunt', 640: 'Sacred Sword|Leaf Blade|Stone Edge|Reflect',
  641: 'Hurricane|Dark Pulse|Hammer Arm|Tailwind', 642: 'Thunderbolt|Dark Pulse|Hammer Arm|Thunder Wave', 645: 'Earthquake|Stone Edge|Hammer Arm|Sandstorm',
  643: 'Blue Flare|Dragon Pulse|Earth Power|Sunny Day', 644: 'Bolt Strike|Dragon Claw|Stone Edge|Light Screen', 646: 'Glaciate|Ice Beam|Dragon Pulse|Earth Power',
  647: 'Secret Sword|Hydro Pump|Ice Beam|Aqua Jet', 648: 'Relic Song|Psychic|Close Combat|Teeter Dance', 649: 'Techno Blast|Bug Buzz|Flash Cannon|Metal Sound'
};
/* Dark Mewtwo: Psystrike, Shadow Ball, Aura Sphere og Dark Pulse treffer alle typer med minst ett angrep. */
const DKSET = 'Psystrike|Shadow Ball|Aura Sphere|Dark Pulse';
/* MEW kan lære alt. I et raid velger den dekningen etter laget ditt: de to angrepene fra MEWCOV som til sammen treffer flest av dine hardt (sammen
   med Psychic), og Will-O-Wisp hvis de fleste av dine slår fysisk, ellers Thunder Wave. En Mew du eier, kan velge blant alle disse. */
const MEWCOV = ['Aura Sphere', 'Flamethrower', 'Ice Beam', 'Thunderbolt', 'Energy Ball', 'Earth Power', 'Shadow Ball', 'Dark Pulse', 'Sludge Bomb', 'Bug Buzz', 'Flash Cannon', 'Dragon Pulse'], MEWTAC = ['Will-O-Wisp', 'Thunder Wave'];
/* GENESECT i raid bærer en Drive: Techno Blast får den typen (ild, is, vann eller elektrisk) som treffer laget ditt hardest (src.drive, mvEff i battle.js). */
const DRIVES = [9, 14, 10, 12];
const mvIx = n => MOVES.findIndex(m => m[0] === n);
const _ls = {};
function legSet(id, dk) {
  const k = dk ? 'dk' : id;
  if (_ls[k] === undefined) { const s = dk ? DKSET : LEGSET[id], l = s ? s.split('|').map(mvIx) : null; _ls[k] = l && l.length === 4 && l.every(i => i >= 0) ? l : null; }
  return _ls[k] ? _ls[k].slice() : null;
}
/* Hvor hardt typen ty treffer en av dine (til valgene Mew og Genesect gjør før kampen). */
const legEff = (ty, m) => typeEff(ty, { ty: mTypes(m), v: {} });
function mewSet(party) {
  const cov = MEWCOV.map(mvIx).filter(i => i >= 0), psy = mvIx('Psychic'); if (psy < 0 || cov.length < 2 || !party.length) return legSet(151);
  const sc = (a, b) => party.reduce((s, m) => s + Math.min(2, Math.max(legEff(13, m), legEff(MOVES[a][1], m), legEff(MOVES[b][1], m))), 0) + Math.random() * 0.3;
  let best = null, bs = -1;
  for (let i = 0; i < cov.length; i++) for (let j = i + 1; j < cov.length; j++) { const v = sc(cov[i], cov[j]); if (v > bs) { bs = v; best = [cov[i], cov[j]]; } }
  const phys = party.filter(m => { const st = statsOf(m); return st[1] > st[3]; }).length, tac = mvIx(MEWTAC[phys * 2 > party.length ? 0 : 1]);
  return tac >= 0 ? [psy, best[0], best[1], tac] : legSet(151);
}
const driveFor = party => { let best = DRIVES[0], bs = -1; for (const ty of DRIVES) { const v = party.reduce((s, m) => s + Math.min(2, legEff(ty, m)), 0) + Math.random() * 0.3; if (v > bs) { bs = v; best = ty; } } return best; };
/* Angrep en art kan velge i tillegg til nivålista: settet til en legendarisk (og hele utvalget til Mew). Lærerne og egg-angrepene (steg 1b.8) kommer hit. */
function extraMoves(m) {
  if (!m) return [];
  let l = !LEGSET[m.id] ? [] : (legSet(m.id, m.sh === 2) || []).concat(m.id === 151 ? MEWCOV.concat(MEWTAC).map(mvIx).filter(i => i >= 0) : [], m.id === 646 && KYU[formName(m)] ? KYU[formName(m)].map(mvIx).filter(i => i >= 0) : []);
  l = l.concat(preMoves(m.id, m.lv), m.tm || [], m.em || []);
  return l.filter((x, i) => l.indexOf(x) === i);
}
/* ---------- ANGREPENE UTOVER NIVÅLISTA (steg 1b.8, Jazz 16.11) ----------
   Før lærte en Pokémon bare angrep ved å gå opp i nivå. Målt på de 346 sisteformene på nivå 100 manglet 30 et skadeangrep i egen type, og 86
   hadde bare svake. Tre kilder til, alle samlet i extraMoves(m), som angrepsvalget (movePick) og «Suggest four» leser:
   1. TIDLIGERE FORMER (preMoves): en utviklet Pokémon kan velge blant det formene før den lærte opp til nivået sitt. Gratis, og det redder
      dem som utvikler seg med stein (Starmie, Ninetales, Vileplume).
   2. LÆRERNE (m.tm = angrepene denne ene har lært av en lærer). Ikke TM-er: fire faste lærere med hver sin personlighet og sitt tema, som i
      Black 2 og White 2. Hvem som kan lære hva, følger TM- og lærerlistene i generasjon 5 (TUTMV i data2.js, laget av tools/tutors.js).
        Sten   kraft: fysiske angrep            Ilse   elementene: spesialangrep
        Mirin  taktikk: statusangrep            Asta   mesteren: de sjeldne, som åpnes av symbolene i Battle Frontier (TUTNEED)
      De vanlige koster mynter (tutBase: 300, 800 eller 1 500 etter styrke, statusangrep 400), og én av de tre første har tilbud hver uke
      (tutWeek, TUTOFF). De sjeldne er premier: Pledge-angrepene og Volt Tackle med bronsesymbolet, startertrioenes ultimate-angrep med sølv,
      Draco Meteor med gull, og med diamant lærer Asta bort alt gratis. S.tut.r[angrep] = 1 åpner ett sjeldent angrep uten symbolet
      (tutUnlock: til ukemodusen i steg 1d). Ingen ny valuta.
   3. EGG-ANGREP (m.em): den som klekkes av et egg, kan ett egg-angrep fra spillene (EGGMV per utviklingslinje, eggMove). Selges den, går
      angrepet i arv til en annen i samme linje (eggPass, som i Nursery i Sword og Shield), så duplikatene er verdt noe.
   Fanen «Tutors» i Shop åpnes på studiedag 9 på reisen (tutOn). Alt er låst under et løp (tutTeach spør locked()). */
function preMoves(id, lv) { let l = []; for (let p = D(id)[4]; p; p = D(p)[4]) l = l.concat(movesAt(p, lv)); return l; }
const TUTORS = [
  { k: 'power', n: 'Sten', t: 'The Quarryman', ic: 'gym', c: '#c9a26b', q: 'No tricks. Hit it until it stops moving.', d: 'Physical moves that hit hard, and the punches, fangs and tails that cover what a Pokémon\'s own type cannot.' },
  { k: 'elem', n: 'Ilse', t: 'The Element Scholar', ic: 'flame', c: '#7fa8e6', q: 'Every type is a language. Let me teach yours a new one.', d: 'Special moves in every element: the big one a Pokémon should have in its own type, and cover for the rest.' },
  { k: 'tact', n: 'Mirin', t: 'The Strategist', ic: 'shield', c: '#a6c59c', q: 'The best move is the one they did not plan for.', d: 'Moves that do no damage and win battles anyway: build up, slow them down, change the weather.' },
  { k: 'master', n: 'Asta', t: 'The Frontier Master', ic: 'tower', c: '#b295e6', q: 'A Symbol first. Then we talk.', d: 'The rarest moves there are. Each one opens with a Symbol from the Battle Frontier.' }
];
const TUTL = {
  power: 'Earthquake|Stone Edge|Rock Slide|Superpower|Brick Break|Drain Punch|Low Kick|Iron Head|Iron Tail|X-Scissor|Bug Bite|U-turn|Poison Jab|Gunk Shot|Shadow Claw|Waterfall|Aqua Tail|Seed Bomb|Wild Charge|Thunder Punch|Fire Punch|Ice Punch|Zen Headbutt|Dragon Claw|Outrage|Dual Chop|Drill Run|Dig|Bulldoze|Aerial Ace|Acrobatics|Bounce|Fly|Sky Attack|Knock Off|Foul Play|Payback|Play Rough|Return|Strength|Facade|Giga Impact',
  elem: 'Flamethrower|Fire Blast|Heat Wave|Overheat|Surf|Scald|Thunderbolt|Thunder|Volt Switch|Charge Beam|Ice Beam|Blizzard|Icy Wind|Frost Breath|Energy Ball|Giga Drain|Grass Knot|Solar Beam|Psychic|Psyshock|Shadow Ball|Sludge Bomb|Sludge Wave|Dark Pulse|Snarl|Dragon Pulse|Flash Cannon|Earth Power|Signal Beam|Moonblast|Dazzling Gleam|Focus Blast|Hyper Voice|Hyper Beam',
  tact: 'Swords Dance|Calm Mind|Bulk Up|Work Up|Hone Claws|Rock Polish|Iron Defense|Thunder Wave|Toxic|Will-O-Wisp|Reflect|Light Screen|Safeguard|Stealth Rock|Taunt|Torment|Substitute|Protect|Roost|Synthesis|Rest|Heal Bell|Pain Split|Rain Dance|Sunny Day|Sandstorm|Hail|Roar|Tailwind|Trick Room|Gravity|Magic Coat',
  master: 'Fire Pledge|Water Pledge|Grass Pledge|Volt Tackle|Blast Burn|Hydro Cannon|Frenzy Plant|Draco Meteor'
};
/* De sjeldne: symbolet som åpner dem (1 bronse … 4 diamant, FACSYM), og prisen når de er åpne. */
const TUTNEED = { 'Fire Pledge': 1, 'Water Pledge': 1, 'Grass Pledge': 1, 'Volt Tackle': 1, 'Blast Burn': 2, 'Hydro Cannon': 2, 'Frenzy Plant': 2, 'Draco Meteor': 3 };
const TUTP = { 'Fire Pledge': 1500, 'Water Pledge': 1500, 'Grass Pledge': 1500, 'Volt Tackle': 2500, 'Blast Burn': 3000, 'Hydro Cannon': 3000, 'Frenzy Plant': 3000, 'Draco Meteor': 4000 };
const TUTOFF = 0.7, TUTFREE = 4, TUTLV = [30, 50];
let _tut = null;
function tutData() {
  if (_tut) return _tut;
  const by = {}, of = {};
  for (const T of TUTORS) { by[T.k] = TUTL[T.k].split('|').map(mvIx).filter(x => x >= 0 && !DEADMV.has(x) && !!(window.TUTMV && TUTMV[x])); by[T.k].forEach(x => { of[x] = T.k; }); }
  return (_tut = { by, of, foe: {} });
}
const tutOn = () => !jOn() || has('tutor');
const tutList = k => tutData().by[k] || [], tutOf = x => tutData().of[x] || '', tutBy = k => TUTORS.find(T => T.k === k);
/* Kan arten lære angrepet av en lærer? TUTMV[angrep] = én bit per art (1–649), seks biter per tegn. */
const TUTB64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function tutCan(id, x) { const s = window.TUTMV && TUTMV[x]; if (!s || !tutOf(x)) return false; const i = id - 1, c = TUTB64.indexOf(s[Math.floor(i / 6)]); return c >= 0 && !!(c >> (i % 6) & 1); }
const tutNeed = x => TUTNEED[MOVES[x][0]] || 0;
const tutOpen = x => !tutNeed(x) || (S.fac.sym || 0) >= tutNeed(x) || !!(S.tut && S.tut.r && S.tut.r[x]);
function tutUnlock(x) { if (!tutNeed(x)) return false; S.tut = S.tut || {}; (S.tut.r = S.tut.r || {})[x] = 1; return true; }
/* Ukens tilbud: én av de tre vanlige lærerne tar TUTOFF av prisen. Uka skifter mandag, likt for alle. */
const tutWeekN = () => Math.floor((Date.parse((S.lad.day || dayKey()) + 'T12:00:00Z') / 864e5 + 3) / 7);
const tutWeek = () => ['power', 'elem', 'tact'][tutWeekN() % 3];
function tutBase(x) { const m = MOVES[x], n = m[0]; if (TUTP[n]) return TUTP[n]; if (!m[4]) return 400; const p = m[2] || (n === 'Return' ? 100 : 80); return p > 100 ? 1500 : p >= 85 ? 800 : 300; }
function tutPrice(x) { const k = tutOf(x); if (k === 'master') return (S.fac.sym || 0) >= TUTFREE ? 0 : tutBase(x); return Math.round(tutBase(x) * (k === tutWeek() ? TUTOFF : 1) / 10) * 10; }
/* Har den angrepet alt (kan velge det i angrepsvalget)? */
const tutHas = (m, x) => m.mv.includes(x) || movesAt(m.id, m.lv).includes(x) || extraMoves(m).includes(x);
/* Det lærerne kan lære akkurat denne, som den ikke har: [angrep …] i lærernes rekkefølge. */
const tutFor = m => TUTORS.reduce((a, T) => a.concat(tutList(T.k).filter(x => tutCan(m.id, x) && !tutHas(m, x))), []);
/* Hvem av dine som kan lære angrepet og ikke har det: laget først, så boksen (sterkest først). */
function tutWho(x) { const p = S.party.map(monBy).filter(Boolean), ok = m => tutCan(m.id, x) && !tutHas(m, x); return { team: p.filter(ok), box: S.mons.filter(m => !S.party.includes(m.u) && ok(m)).sort((a, b) => b.lv - a.lv || a.u - b.u) }; }
/* Hvorfor en lærer ikke kan lære bort x til m akkurat nå ('' = det går). */
function tutWhy(m, x) {
  if (!m || !tutOn() || !tutCan(m.id, x)) return 'cannot';
  if (tutHas(m, x)) return 'has';
  if (!tutOpen(x)) return 'symbol';
  if (locked()) return 'locked';
  if (S.coins < tutPrice(x)) return 'coins';
  return '';
}
function tutTeach(m, x) {
  if (tutWhy(m, x)) return false;
  S.coins -= tutPrice(x); (m.tm = m.tm || []).push(x); if (m.mv.length < 4) m.mv.push(x);
  save(); return true;
}
/* Det en topptrener kan ha lært artene sine (foeMoves med q = 3): alt de tre vanlige lærerne kan lære arten. */
function tutFoe(id, lv) {
  const T = tutData(), l = T.foe[id] || (T.foe[id] = tutList('power').concat(tutList('elem'), tutList('tact')).filter(x => tutCan(id, x)));
  /* En motstander på lavt nivå har ikke de største angrepene ennå: de dyreste (1 500) fra nivå TUTLV[1], de midterste (800) fra TUTLV[0]. */
  return lv == null || lv >= TUTLV[1] ? l : l.filter(x => tutBase(x) <= (lv >= TUTLV[0] ? 800 : 400));
}
/* EGG-ANGREP. lineRoot (game.js) = første form i utviklingslinja. eggMove trekker ett for den som klekkes (−1 = linja har ingen). */
const eggPool = id => (window.EGGMV && EGGMV[lineRoot(id)]) || [];
function eggMove(id) { const l = eggPool(id); return l.length ? l[rnd(l.length)] : -1; }
function eggGive(m) { const x = eggMove(m.id); if (x < 0) return -1; m.em = [x]; if (!m.mv.includes(x)) { if (m.mv.length < 4) m.mv.push(x); else m.mv[0] = x; } return x; }
/* Arvingen når m forlater deg: en annen i samme linje som mangler angrepet. Helst en på laget, så den med høyest nivå. */
function eggHeir(m) {
  if (!m || !(m.em || []).length) return null;
  const r = lineRoot(m.id), l = S.mons.filter(o => o !== m && lineRoot(o.id) === r && m.em.some(x => !(o.em || []).includes(x)));
  return l.sort((a, b) => (S.party.includes(b.u) - S.party.includes(a.u)) || b.lv - a.lv || a.u - b.u)[0] || null;
}
function eggPass(m) { const h = eggHeir(m); if (!h) return null; const mv = m.em.filter(x => !(h.em || []).includes(x)); h.em = (h.em || []).concat(mv); return { to: h, mv }; }
const dkMoves = () => legSet(150, 1);
/* Den mørke tar plassen til en Mewtwo du eier: det er den samme Pokémonen (nivå, XP, kallenavn og det den holder står), men mørk, og alltid med de
   beste verdiene: IV 31 i alt, naturen Timid (DKNAT) og EV fullt ut i Sp. Atk og Speed (DKEV). Angrepene blir de fire den mørke bruker. */
const DKNAT = 10, DKEV = [6, 0, 0, 252, 0, 252];
/* Mewtwoen den mørke tar plassen til: den vanlige på høyest nivå. En shiny Mewtwo røres aldri (da kommer den mørke som egen Pokémon). */
const dkTarget = () => S.mons.filter(m => m.id === 150 && !m.sh).sort((a, b) => b.lv - a.lv)[0] || null;
function darkTake(m) {
  m.sh = 2; m.iv = [31, 31, 31, 31, 31, 31]; m.nat = DKNAT; m.ev = DKEV.slice(); delete m.ht;
  const mv = dkMoves(); if (mv) m.mv = mv.slice();
  return m;
}
/* Settet fra nivålista, slik alle raid var før steg 1b.4. Nå bare for Mewtwo i demoen (der den har vanlig HP, så en kommer fram til forvandlingen),
   og som reserve hvis et sett skulle mangle. */
function legLevelMoves(id, lv) {
  /* Og den bygger seg ikke opp med Cosmic Power, Calm Mind og lignende: den angriper. */
  const ok = x => { const m = MOVES[x]; return !SELFKO.has(m[0]) && !(m[4] === 0 && m[17] === 1 && m[12].length); }, mv = foeMoves(id, lv, 2).filter(ok);
  for (const x of movesAt(id, lv + 8).filter(x => ok(x) && !DEADMV.has(x) && MOVES[x][4] > 0).sort((a, b) => (MOVES[b][2] || 0) - (MOVES[a][2] || 0))) { if (mv.length >= 4) break; if (!mv.includes(x)) mv.push(x); }
  return mv.length ? mv : defaultMoves(id, lv);
}
/* Angrepene i et raid: settet til arten (LEGSET). Mew velger dekningen etter laget ditt (party). */
function raidMoves(id, lv, dk, party) { return (id === 151 && !dk && party && party.length ? mewSet(party) : null) || legSet(id, dk) || legLevelMoves(id, lv); }
/* demo = arten som skal prøves i demoen (gir ingenting), eller 'dk' for Dark Mewtwo. Ellers den som har vist seg. */
function raidBattle(lead, demo) {
  const R = demo === 'dk' ? { id: 150, dk: 1, lv: raidLvFor(5), hx: raidHx(5) } : demo ? { id: demo, lv: raidLvFor(LEG[demo].t), hx: raidHx(LEG[demo].t) } : S.raid, L = raidInfo(R), party = S.party.map(monBy).filter(Boolean);
  party.sort((a, b) => (b.u === lead) - (a.u === lead));
  /* Hvem som venter, er hemmelig til filmen har gått: fra første forsøk er den kjent (R.seen), og kortet viser den. */
  if (!demo && S.raid && !S.raid.seen) { S.raid.seen = 1; save(); }
  /* Vanskelighetsgraden senker nivået og HP-en til den legendariske (Hard = som før), men nivået står aldri under laget (raidFoeLv, gulvet fra v90). */
  const dd = diff(), lv = raidFoeLv(R), e = Math.round((R.dk ? 85 : 60) * dd.ev), foe = { id: R.id, lv, sh: R.dk ? 2 : R.sh ? 1 : 0, g: rollG(R.id), mega: R.id === DEOXYS ? DEOXA : defForm(R.id), ms: raidMega(R), iv: [31, 31, 31, 31, 31, 31].map(v => Math.round(v * (0.5 + dd.iv / 2))), ev: [e, e, e, e, e, e], nat: 0, mv: demo === 150 ? legLevelMoves(150, lv) : raidMoves(R.id, lv, R.dk, party), drive: R.id === 649 ? driveFor(party) : null };
  const B = mkBattle(demo ? party : party.map(evSrc), [foe], legTr(R.id, R.dk), { mode: demo ? 'lab' : 'raid', raid: 1, st: TCL.supreme, k: 'legend', rd: 0, n: 0, lap: 0, ti: 0, bag: bagN(), xm: 3 * dd.xp, sm: 1, dc: dd.coin, boost: { mode: '', m: 1, xp: 1 } });
  B.tr.skill = dd.sk; if (demo) labMega(B); else evApply(B);
  /* I demoen har Mewtwo vanlig HP (ikke raid-HP), så en kommer fram til forvandlingen: det er den demoen er til for. */
  const f = B.foe[0], big = demo === 150 ? 1 : RAIDHP[L.t - 1] * (R.ev ? 1 : dd.rhp) * (R.dk ? 1 : (R.hx || 1) * raidX(R.id)[0]); f.max = f.hp = Math.round(f.max * big); f.big = big; if (R.dk) f.short = 'D.Mewtwo';
  return B;
}
function finishRaid(B) {
  const win = B.over === 'win', id = B.tr.leg, R = S.raid, nm = B.tr.n, t = B.tr.lt, res = { mode: 'raid', win, ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', kind: 'legend', leg: id };
  if (win) {
    grantXp(B, res); achInit().rw++;
    res.coins = Math.round(RAIDCOIN[t - 1] * (B.dc || 1) * evCoin()); S.coins += res.coins; evPerk(res);
    const c = RAIDCANDY[t - 1]; S.items.candy = (S.items.candy || 0) + c; res.items.push(`${c} × Rare Candy`);
    if (t >= 2) { const n = t >= 4 ? 3 : 1; S.items.ultra = (S.items.ultra || 0) + n + 1; res.items.push(`${n + 1} × Ultra Ball`); }
    if (t >= 4) giveCharm(res);
    /* Mega: en vanlig stein fra de store (noen ganger fra de vanlige legendariske), og den legendariskes egen stein første gang den slås. */
    if (t >= 2 || Math.random() < 0.25) { S.items.mstone = (S.items.mstone || 0) + 1; res.items.push('1 × Mega Stone'); }
    /* Plata til typen den legendariske har (den mørke: Dread Plate; de av Normal-type, som Arceus: en tilfeldig). */
    { const ty = B.tr.dk ? 16 : D(id)[1], pk = 'p' + (ty > 0 ? ty : 1 + rnd(17)); S.items[pk] = (S.items[pk] || 0) + 1; res.items.push(HELD[pk].n); }
    if (megaOpts(id).length && !hasStone(id)) { (S.lst || (S.lst = {}))[id] = 1; res.items.push(legStone(id).replace(/^the /, '')); res.perks.push(`You found ${legStone(id)}. Every ${D(id)[0]} you own can now ${id === 382 || id === 383 ? 'revert to its primal form' : 'Mega Evolve'} in battle${S.ring ? '' : ', once you have the Mega Ring'}.`); }
    if (id === 150 && !B.tr.dk && R && !hasDark()) {
      /* Mewtwo er din med en gang, og skyggen reiser seg ALLTID: runde to, mot Dark Mewtwo, med nye forsøk. Har du en Mewtwo fra før, får du ikke en
         til – unntatt når den du slo er shiny og du ikke har en shiny: den får du. mu = Mewtwoen den mørke tar plassen til hvis du vinner (dkTarget:
         aldri en shiny). r1 husker belønningen til oppsummeringen etter runde to. res.mew = 1 når du fikk Mewtwo nå. */
      const regs = S.mons.filter(m => m.id === 150 && m.sh !== 2), give = !regs.length || (!!R.sh && !regs.some(m => m.sh === 1));
      if (give) raidCatch(150, 0, res, R.sh);
      const tg = dkTarget(), nc = res.cau && res.cau.c ? `, ${res.cau.c} coins for a new species` : '';
      S.raid = { id: 150, dk: 1, seen: 1, lv: raidLvFor(5), fl: raidFloor(), hx: +raidHx(5).toFixed(2), day: '', tries: 0, mu: tg ? tg.u : null, r1: `${res.coins.toLocaleString('en-US')} coins, ${res.items.join(', ')}${nc}` };
      res.dark = 1; res.mew = give ? 1 : 0; res.note = give ? 'Mewtwo is yours, but its shadow is not finished.' : 'Mewtwo is beaten, but its shadow is not.';
    } else if (B.tr.dk) {
      /* Den mørke tar plassen til Mewtwoen din (darkTake). Har du ingen lenger (eller bare en shiny, som aldri overskrives), kommer den som ny. */
      const mu = R && R.mu != null ? monBy(R.mu) : null, m0 = mu && mu.id === 150 && !mu.sh ? mu : dkTarget();
      if (m0) { darkTake(m0); res.cau = { u: m0.u, isNew: false, took: 1 }; res.note = 'Dark Mewtwo has taken the place of your Mewtwo. It is yours.'; }
      else { darkTake(raidCatch(150, 1, res)); res.note = 'Dark Mewtwo is yours.'; }
      S.raid = null;
      if (R && R.r1) res.perks.push(`Mewtwo gave its rewards before it changed: ${R.r1}.`);
    } else {
      raidCatch(id, 0, res, R && R.sh); raidGone(); res.note = `${nm} is yours.`;
    }
  } else if (R) {
    R.day = dayKey(); R.tries = (R.tries || 0) + 1;
    const pre = R.r1 && !R.told ? `Mewtwo's rewards are yours: ${R.r1}. ` : ''; R.told = 1;
    if (R.tries >= raidTries(R)) {
      raidGone();
      if (R.ev === 2) { S.items.candy = (S.items.candy || 0) + 2; res.items.push('2 × Rare Candy'); S.seen[386] = 1; (S.jx = S.jx || {}).r = 1; res.note = tl('That was {name}. You never had a chance, and that was the point: now you know what is out there. Train your team, and the next legendary Pokémon will be a fair fight. It comes in a few days.', { name: nm }); }
      else if (R.ev) res.note = `${nm} was never going to fall today, and that is how it was meant to be. It has moved on. Train your team: legendary Pokémon will show themselves again.`;
      else if (R.dk) res.note = `${pre}The shadow lets go and Dark Mewtwo is gone. Mewtwo stays with you. Beat a Mewtwo again, and the shadow will rise once more.`;
      else res.note = `${nm} has moved on. Another legendary Pokémon will show itself in time.`;
    } else res.note = `${pre}${nm} stays where it is. You have one more attempt, tomorrow${R.dk ? '' : ', and now you know who is waiting'}.`;
  }
  save(); return res;
}
/* I demoen er Mewtwo hele historien: slår du den, reiser den seg som Dark Mewtwo (dark), akkurat som i et ekte raid. */
const finishLab = B => ({ mode: 'lab', win: B.over === 'win', ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', kind: B.k, dark: B.over === 'win' && B.raid && B.tr && B.tr.leg === 150 && !B.tr.dk ? 1 : 0 });
