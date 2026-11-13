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
   lives = forsøk i ligaen per dag (Easy tåler ett tap, slik Battle Frontier alltid har gjort). coin/xp/candy = belønningen: mynter, XP og sjansen
   for Rare Candy følger graden, så Hard lønner seg for et lag som tåler det, og Easy koster noe.
   På lavere grad stiller motstanderne svakere: lavere nivå (rel), dummere spill (sk), dårligere oppdrett (iv, ev), enklere angrep (q), færre Pokémon (mons)
   og senere utvikling (slack) – og du får flere gjenstander i veska (bag). Belønningen følger graden (coin, xp), så det lønner seg å gå opp når laget tåler det.
   rlv/rhp = nivå og HP for de legendariske i raid. rf = hvor ofte en legendarisk viser seg (ganges med sjansen i raidRoll), rc = dager lagt til eller
   trukket fra pausen etter et raid (RAIDCOOL), lg = sjansen for det legendariske møtet fra de aller største (rareLoot). Målt over 28 dager med tre timer
   om dagen gir Hard rundt 30 % flere mynter og seks nivåer mer enn Normal, og nesten dobbelt så mange raid. */
const DIFF = [
  { n: 'Easy', rel: -0.1, sk: 0.6, iv: 0.4, ev: 0, q: 1, mons: -1, slack: 0.5, coin: 0.5, xp: 0.75, candy: 0.6, lives: 2, bag: 5, rlv: 0.96, rhp: 0.9, rf: 0.6, rc: 1, lg: 0.5 },
  { n: 'Normal', rel: -0.05, sk: 0.85, iv: 0.75, ev: 0.5, q: 2, mons: 0, slack: 0.8, coin: 1, xp: 1, candy: 1, lives: 1, bag: 4, rlv: 1, rhp: 1, rf: 1, rc: 0, lg: 1 },
  { n: 'Hard', rel: 0, sk: 1, iv: 1, ev: 1, q: 2, mons: 0, slack: 1, coin: 2.3, xp: 1.5, candy: 1.7, lives: 1, bag: 3, rlv: 1.02, rhp: 1.05, rf: 1.8, rc: -1, lg: 1 }
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
    ['Cynthia', 'cynthia', 'Sinnoh Champion', 15, [445, 442, 448, 350, 407, 468], 'Cynthia', { sc: 'black_tower_10', sp: 1, film: 'b:cynthia', cc: '#e9d28a', fx: [4, [423, 471, 604, 628]] }],
    ['Iris', 'iris', 'Unova Champion', 15, [612, 635, 621, 567, 306, 131], 'Iris', { sc: 'black_tower_3_5', fx: [2, [373]] }],
    ['Steven', 'steven', 'Hoenn Champion', 8, [376, 227, 306, 142, 344, 346], 'Champion Steven', { sc: 'cave', fx: [3, [348, 530, 567]] }],
    ['Colress', 'colress', 'Team Plasma', 8, [601, 462, 606, 376, 479, 474], 'Colress', { sc: 'black_tower_1_2', fx: [3, [466, 604]] }],
    /* Ghetsis, Champions Edition: den andre av de to helt spesielle (ved siden av Cynthia), og den sterkeste motstanderen i spillet. Laget er det han
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
const ladMin = () => S.lad.day ? ((S.log[S.lad.day] || {}).m || 0) : todayMin();
const goalMin = () => Math.max(60, S.cap || 360);
const topFor = c => Math.round((1 + Math.max(60, c) / 240) * 10) / 10;
const goalTop = () => topFor(goalMin());
const goalPart = () => Math.min(1, ladMin() / goalMin());
const studyMult = () => Math.round((0.5 + goalPart() * (goalTop() - 0.5)) * 10) / 10;
/* XP og Rare Candy fra kampene følger også fokustiden, fra ×0,7 uten studering til ×1,3 når dagsmålet er nådd (før 0,8–1,2 for XP, og ikke i det
   hele tatt for Rare Candy): da skiller studietiden mer på hvor fort laget vokser. candyRoll(x) = antall Rare Candy når satsen er x. */
const xpMult = () => 0.7 + goalPart() * 0.6;
const candyRoll = x => { const y = x * xpMult() * (diff().candy || 1); return Math.floor(y) + (Math.random() < y - Math.floor(y) ? 1 : 0); };
/* Dagens første seier gir doble mynter (S.lad.fw = dagen den er brukt). */
const firstWin = () => S.lad.fw !== (S.lad.day || dayKey());
const ladLost = () => !!S.lad.lost && S.lad.lost === (S.lad.day || dayKey());
/* Én runde per ligadag: er runden vunnet i dag, er ligaen ferdig til neste ligadag. */
const ladDone = () => !!S.lad.lapd && S.lad.lapd === (S.lad.day || dayKey());
/* Kampene åpnes først når dagen har OPENMIN minutter fokus (før holdt det å starte og stoppe en økt). openNeed = minutter som mangler. */
const openNeed = () => Math.max(0, OPENMIN - todayMin());
/* Forsøk per dag: i ligaen avslutter et tap hele runden (LIVES; Easy tåler ett tap), Frontier tåler to løp (FACLIVES), turneringen er én cup og
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
const facLost = () => !!S.fac.lost && S.fac.lost === (S.lad.day || dayKey());
const facOpen = () => !!S.lad.day && !dayStop() && !facLost() && modeOn('factory');
/* Dagens bonus: datoen avgjør hvilken av de tre modusene som gir ekstra, likt for alle som spiller. Bonusen er DAYCOIN ganger mynter
   (i tillegg litt mer XP i ligaen og litt mer flaks i Frontier, som før). */
const MODES = ['league', 'factory', 'pwt'], MODEN = { league: 'Trainer League', factory: 'Battle Frontier', pwt: 'World Tournament' }, DAYCOIN = 1.5;
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
  const M = modeSt(); if (!S.lad.day || !MODES.includes(k) || M.ks.includes(k) || M.ks.length >= MODESN) return false;
  M.ks.push(k); evRoll(k); stamp(); save(); return true;
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
  stamp(); liveSave(B); save();
}
function liveSave(B) { if (!B || B.mode === 'lab' || SBX || !liveMine()) return; try { localStorage.setItem(LIVEK, JSON.stringify({ v: 1, at: S.live.at, B: battleSnap(B) })); } catch (_) {} }
function liveEnd() { if (SBX) { delete S.live; return; } if (S.live) { delete S.live; stamp(); } try { localStorage.removeItem(LIVEK); } catch (_) {} }
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
const ladLives = () => (diff().lives || LIVES) + (evIs('wind') ? 1 : 0), facLives = () => FACLIVES + (evIs('wind') ? 1 : 0);
/* Et tap i ligaen på kampdagen d. Er forsøkene brukt opp, er runden over: ligaen stenger for dagen, og neste ligadag starter du på kamp 1 igjen
   (S.lad.fell = hvor langt du kom). Har du et forsøk igjen (Easy, eller Second Wind), står den samme treneren der til omkamp. Gir forsøk igjen i dag. */
function ladLose(d) {
  const L = S.lad, n = (L.tries && L.tries.d === d ? L.tries.n : 0) + 1, left = Math.max(0, ladLives() - n);
  L.tries = { d, n };
  if (!left) { L.lost = d; L.fell = L.n; L.n = 0; L.c = 0; L.seen = []; L.next = null; }
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
  const e = evNow(); if (!e || e.k !== 'surge' || !surgeOk(u)) return false;
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
  const team = ids.map((id, k) => { const ace = k === ids.length - 1, lv = flat ? base : Math.max(3, Math.min(100, base + (ace ? 1 : -1 - rnd(2)))); return foeMon(fitForm(id, lv, st.slack || 0), lv, st); });
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
const RAREP = [0.25, 0.6], RAREW = [['purse', 28], ['gold', 26], ['gear', 24], ['lure', 8], ['master', 7], ['shiny', 7]], PURSEM = 1.5, RAREGOLD = 2;
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

/* ---------- Ligaen ---------- */
/* Hvem som venter. Lagres, så den samme treneren står der når du kommer tilbake (toppbossene drar videre hvis du taper).
   Ingen møtes to ganger i samme runde. En sjelden gang står en toppboss der en vanlig boss skulle stått. */
function nextTrainer() {
  const L = S.lad, old = L.next && L.next.n === L.n && L.next.lap === L.lap && POOL[L.next.k] && POOL[L.next.k][L.next.i] ? L.next : null;
  /* Den som venter, blir stående til du har møtt den – også til omkampen når du har et forsøk igjen (Easy eller Second Wind). Taper du uten
     forsøk igjen, er runden over, og L.next er nullet (ladLose). v = laget en Champion eller Supreme Boss stiller med denne gangen. */
  if (old) { if (!old.v && (POOL[old.k][old.i][6] || {}).fx) old.v = drawTeam(POOL[old.k][old.i]); return old; }
  const k = L.n >= LAPN - 1 ? (Math.random() < SUPP(L.lap) ? 'supreme' : 'champ') : ORDER[climb(L.n, L.c || 0) - 1];
  const pool = POOL[k], all = pool.map((_, i) => i), mk = i => { const t = { n: L.n, lap: L.lap, k, i, sup: 0 }; if ((pool[i][6] || {}).fx) t.v = drawTeam(pool[i]); return t; };
  let c = all.filter(i => !(L.seen || []).includes(k + i));
  if (!c.length) c = all;
  /* Blant de aller største kommer de to spesielle oftest (SPW ganger så ofte som de andre), og ikke den samme to ganger på rad. */
  if (k === 'supreme') { const c2 = c.filter(i => !(L.lsp === pool[i][0] && c.length > 1)), w = c2.map(i => (pool[i][6] || {}).sp ? SPW : 1); let x = Math.random() * w.reduce((a, b) => a + b, 0), pick = c2[c2.length - 1]; for (let j = 0; j < c2.length; j++) { x -= w[j]; if (x <= 0) { pick = c2[j]; break; } } L.lsp = pool[pick][0]; L.next = mk(pick); return L.next; }
  L.next = mk(c[rnd(c.length)]);
  return L.next;
}
const trainerInfo = t => trainerOf(t.k, t.i);
/* Klassen, nivået og antallet for treneren som venter (brukes også på oppstillingen før kampen). */
function leaguePlan(t) {
  const ri = rungInfo(t.n, t.lap), x = ((POOL[t.k] || [])[t.i] || [])[6] || {};
  let st = diffSt(t.k === 'trainer' ? trainerCls(ri.rd) : TCL[t.k]);
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
  return evApply(mkBattle(party.map(evSrc), foeTeam(t.k, d, p.n, p.lv, p.st, false, t.v), tr, { mode: 'league', st: p.st, k: t.k, rd: p.ri.rd, n: t.n, lap: t.lap, ti: t.i, bag: bagN(), xm: xpMult() * diff().xp, sm: smFor('league'), dc: diff().coin, boost: dayBoost() }));
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
    const fw = firstWin(); res.coins = Math.round(LGCOIN * st.coin * (B.dc || 1) * B.sm * lapCoin(B.lap) * (fw ? 2 : 1) * purseM()) + B.pay; S.coins += res.coins;
    if (fw) { L.fw = L.day || dayKey(); res.perks.push('First win of the day: double coins.'); }
    classLoot(B, res, give); ringAward(clsI(k), res); rarePrize(clsI(k), res); evPerk(res);
    if (evIs('lucky') && B.tr.boss) { pushEnc(res, genEnc({ ty: [B.tr.ty], min: 2, luck: 1.5 })); res.perks.push('Lucky Day: one more encounter.'); }
    if (bm && B.tr.boss && Math.random() < 0.5) give('candy', 1);
    /* Byttetilbud: tilfeldig, ikke hver gang (rivaler tilbyr oftest). Den du får, er på ditt nivå og i den formen nivået tillater. */
    if (B.tr.boss && k !== 'evilteam' && Math.random() < (k === 'rival' ? 0.6 : 0.3)) {
      const cap = refLv();
      res.trade = B.foe.filter(f => !isLeg(f.id)).map(f => { const lv = Math.min(f.lv, cap); return { id: fitForm(f.id, lv, 0), lv, iv: f.src.iv.slice(), nat: f.src.nat, g: f.src.g }; });
      if (!res.trade.length) res.trade = null;
    }
    /* De to spesielle gir mer av alt, og seieren huskes (S.spw). */
    if (B.tr.sp) { const extra = Math.round(res.coins * 0.5); res.coins += extra; S.coins += extra; give('candy', 4); give('mstone', 1); pushEnc(res, legEnc()); (S.spw || (S.spw = {}))[B.tr.n] = (S.spw[B.tr.n] || 0) + 1; res.perks.push(`${B.tr.n} is beaten. Half again as many coins, and one more legendary encounter.`); }
    L.best = (L.best || 0) + 1; (L.seen = L.seen || []).push(k + B.ti); L.next = null; L.c = Math.min(CLIMBTOP, clsI(k)); L.won = (L.won || 0) + 1;
    if (clsI(k) >= 8) achInit().ch++;
    /* Runden er vunnet: ligaen er ferdig for i dag (én runde per ligadag), og en legendarisk kan vise seg (RAIDWIN). */
    if (++L.n >= LAPN) { L.lap++; L.n = 0; L.seen = []; L.c = 0; L.lapd = L.day || dayKey(); res.lapDone = true; raidRoll(RAIDWIN); raidUnhide(); }
  } else {
    /* Et tap avslutter runden, uansett hvem det var mot (ladLose). res.at = kampen du røk ut i (0-basert), res.left = forsøk igjen i dag. */
    res.at = L.n; res.left = ladLose(L.day || dayKey()); res.out = !res.left; if (res.out) raidUnhide();
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
/* Alt i Battle Frontier er på nivå 50, så alle stiller likt. En runde er FACN kamper: fire vanlige trenere og en boss. For hver runde blir
   leie-Pokémonene og motstanderne sterkere (høyere samlet styrke), ikke høyere i nivå. Internt heter modusen fortsatt «fac».
   LEIEPOOLEN (FACBST = laveste og høyeste samlede styrke per runde): bunnen er løftet så de helt svake er borte, og toppen holdt nede så ingen
   bærer laget alene. Innenfor spennet trekkes de midterste oftest (facW), og blant de sju er det aldri mer enn to med samme hovedtype,
   så det alltid er noe nytt å prøve. Motstanderne ligger tettere opp mot det du leier enn før (FACD). */
const FACLV = 50, FACN = 5, FACROUND = r => 200 + 100 * Math.min(4, r - 1);
const FACBST = r => [[430, 525], [455, 545], [475, 570], [495, 600]][Math.min(3, r - 1)];
const FACD = [-55, -35, -15, 0];
const facW = (s, a, b) => { const m = (a + b) / 2, h = (b - a) / 2 || 1; return 0.35 + 0.65 * (1 - Math.abs(s - m) / h); };
/* Hvor sterk en leie-Pokémon er, i stjerner (1–5), og ballen den ligger i før den åpnes. Mega er alltid fem. */
const facStars = m => { if (m.mega) return 5; const s = bstSum(m.id); return s < 455 ? 1 : s < 485 ? 2 : s < 515 ? 3 : s < 545 ? 4 : 5; };
const facBall = m => { const n = facStars(m); return n >= 4 ? 'ultra' : n === 3 ? 'great' : 'poke'; };
/* Rollen, lest av verdiene på nivå 50: til hjelp når laget velges. */
function facRole(m) {
  const st = statsOf(m), off = Math.max(st[1], st[3]), bulk = (st[0] - 60 + st[2] + st[4]) / 3, sp = st[5];
  return sp >= 112 && off >= 112 ? 'Fast attacker' : off >= 128 ? (st[1] >= st[3] ? 'Heavy hitter' : 'Special cannon') : bulk >= 108 && off < 105 ? 'Wall' : sp >= 118 ? 'Speedster' : bulk >= 98 ? 'Tank' : 'All-rounder';
}
/* d flytter styrken opp eller ned: de første motstanderne i en runde er svakere enn det du leier. */
function facMon(r, used, d, tys) {
  const [a, b] = FACBST(r), pool = []; let tot = 0;
  for (let id = 1; id <= 649; id++) {
    if (isLeg(id) || used.has(id) || (D(id)[6] & 4) || (EVO[id] && EVO[id].length)) continue;
    const s = bstSum(id); if (s < a + d || s > b + d || reqLv(id) > FACLV + 12) continue;
    if (tys && (tys[D(id)[1]] || 0) >= 2) continue;
    const w = facW(s, a + d, b + d); pool.push([id, w]); tot += w;
  }
  if (!pool.length) return facMon(r, used, d, null);
  let x = Math.random() * tot, id = pool[pool.length - 1][0]; for (const [i, w] of pool) { x -= w; if (x <= 0) { id = i; break; } }
  used.add(id); if (tys) tys[D(id)[1]] = (tys[D(id)[1]] || 0) + 1;
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
  const used = new Set(), tys = {}, l = Array.from({ length: 7 }, () => facMon(r, used, 0, tys));
  if (Math.random() < MEGAP) { const k = megaPick(used), g = MEGA[k], i = rnd(7); l[i] = { id: g[0], mega: k + 1, lv: FACLV, sh: 0, iv: l[i].iv, ev: [0, 0, 0, 0, 0, 0], nat: rnd(25), mv: foeMoves(g[0], FACLV, 1) }; }
  return l;
}
function facStart() { S.fac.run = { round: 1, w: 0, streak: 0, offer: facOffer(1), open: 0, team: null, foe: null }; save(); }
function facPick(idx) { const R = S.fac.run; R.team = idx.map(i => R.offer[i]); R.offer = null; R.foe = null; save(); }
/* Neste motstander. Den sjuende i hver runde er bossen: oftest en Frontier Brain eller en boss fra klasse 2 til 6,
   og en sjelden gang en toppboss (klasse 7 til 9), som gir mye bedre belønning. Sjansen for toppboss øker med rundene. */
function facFoe() {
  const R = S.fac.run;
  /* Et løp fra før runden ble kortere: står du lenger enn den nye runden rekker, er det bossen som venter. */
  if (R.w > FACN - 1) { R.w = FACN - 1; R.foe = null; }
  if (R.foe && (R.foe.boss ? POOL[R.foe.k] && POOL[R.foe.k][R.foe.i] : R.foe.ci != null)) return R.foe;
  const boss = R.w === FACN - 1, used = new Set(R.team.map(m => m.id)), cnt = {};
  let f;
  if (boss) {
    const up = dayBoost().mode === 'factory' ? 1.5 : 1, ultra = Math.random() < Math.min(0.6, (0.12 + 0.06 * (R.round - 1)) * up);
    const k = ultra ? pickUltra(R.round - 1) : Math.random() < 0.5 ? 'brain' : ['gym', 'eviladmin', 'e4', 'rival'][rnd(4)], i = rnd(POOL[k].length);
    /* Bossen vokser med rundene: i første runde er laget dårligere oppdrettet og de som utvikler seg sent, står i en tidligere form.
       De sjeldne (u = 1 til 3 for klasse 7 til 9) ligger alltid et hakk eller mer over, så de sjeldneste er vanskeligst også her. */
    const r = Math.min(4, R.round), u = ultra ? TCL[k].i - 6 : 0;
    const st = { iv: Math.min(31, (u ? 10 + 4 * u : k === 'brain' ? 0 : 4) + 6 * r), ev: (u ? 8 + 8 * u : 0) + 8 * (r - 1), q: k === 'brain' && r < 3 ? 1 : 2, slack: u >= 3 ? 99 : [0, 6, 14, 99][Math.min(3, r - 1 + u)], mg: TCL[k].i >= 8 };
    const dd = diff(); st.iv = Math.round(st.iv * dd.iv); st.ev = Math.round(st.ev * dd.ev);
    f = { boss: 1, k, i, sk: Math.min(1, [0.76, 0.86, 0.94, 1][r - 1] - (k === 'brain' ? 0.06 : 0) + 0.06 * u), team: bossTeam(POOL[k][i], 4, FACLV, st, true), hint: POOL[k][i][3] };
  } else {
    const d = FACD[Math.min(FACD.length - 1, R.w)], team = Array.from({ length: 4 }, () => facMon(R.round, used, d));
    team.forEach(m => { const t = D(m.id)[1]; cnt[t] = (cnt[t] || 0) + 1; });
    f = { ci: rnd(POOL.trainer.length), team, hint: +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] };
  }
  R.foe = f; save();
  return f;
}
function facInfo(f) {
  const R = S.fac.run;
  if (f.boss) return trainerOf(f.k, f.i, { skill: (f.sk || 1) * diff().sk, fr: 1, arena: 'hall', int: f.k === 'brain' ? 3 : TCL[f.k].i - 1 });
  return trainerOf('trainer', f.ci, { ty: f.hint, skill: Math.min(0.95, 0.3 + 0.1 * R.round + 0.08 * R.w) * diff().sk, fr: 1, arena: 'factory', v: 0, int: R.w >= 2 ? 1 : 0 });
}
function facBattle() {
  const R = S.fac.run, f = facFoe();
  return evApply(mkBattle(R.team, f.team, facInfo(f), { mode: 'fac', round: R.round, w: R.w, k: f.boss ? f.k : 'trainer', sm: smFor('factory'), dc: diff().coin, boost: dayBoost() }));
}
/* Frontier gir gjenstander, møter, mynter og XP til ditt eget lag (det ser på og lærer, se modeXp). Et tap avslutter løpet; etter FACLIVES tap er
   Frontier stengt for dagen. En ferdig runde (FACN seire) gir en egen myntpremie. */
function finishFactory(B) {
  const R = S.fac.run, win = B.over === 'win', res = { mode: 'fac', win, ups: [], items: [], encs: [], coins: 0, round: R.round, w: R.w, swap: null, roundDone: false, streak: R.streak, perks: [], note: '' };
  if (!win) { const d = S.lad.day || dayKey(), n = facFails() + 1; S.fac.best = Math.max(S.fac.best || 0, R.streak); S.fac.tries = { d, n }; if (n >= facLives()) S.fac.lost = d; res.left = Math.max(0, facLives() - n); S.fac.run = null; raidUnhide(); save(); return res; }
  const sm = B.sm, bm = B.boost.mode === 'factory' ? B.boost.m : 1, r = R.round, roll = p => Math.random() < p * bm;
  const give = (it, n) => { if (it === 'candy') n = candyRoll(n); if (n > 0) { S.items[it] = (S.items[it] || 0) + n; res.items.push(`${n} × ${SHOP[it].n}`); } };
  R.w++; R.streak++; res.w = R.w; res.streak = R.streak; S.fac.best = Math.max(S.fac.best || 0, R.streak);
  res.coins = Math.round(FACCOIN * (30 + 12 * R.w + 15 * (r - 1)) * sm * (B.dc || 1) * purseM()) + B.pay; S.coins += res.coins; evPerk(res);
  modeXp(res, 4, FACXP * (R.w >= FACN ? 1.5 : 1) * (1 + 0.08 * Math.min(4, r - 1)), xpMult() * diff().xp * (B.boost.mode === 'factory' ? B.boost.xp : 1));
  if (roll(0.4)) give(r >= 3 ? 'ultra' : r >= 2 ? 'great' : 'poke', r >= 2 ? 1 : 2);
  if (R.w === 2) pushEnc(res, genEnc({ min: 1, luck: 1 }));
  if (R.w === 3) give('candy', 1);
  if (R.w === 4) { give('great', 2); if (!S.incOn) { S.incOn = 1; res.items.push('Incense for your next session'); } if (roll(0.5)) pushEnc(res, genEnc({ min: 2, luck: 1.2 })); }
  if (R.w >= FACN) {
    pushEnc(res, genEnc({ ty: [B.tr.ty], min: r >= 2 ? 3 : 2, luck: 1.5 })); pushEnc(res, genEnc({ min: 2, luck: 1.5 }));
    give('ultra', r >= 2 ? 2 : 1); give('candy', 1); if (Math.random() < 0.5) give('stone', 1);
    if (r >= 2 && S.eggs.length < 3 && roll(0.5)) { S.eggs.push({ need: 120, got: 0 }); res.items.push('1 × Egg'); }
    if (r >= 3 && roll(0.12)) pushEnc(res, legEnc());
    /* Sjelden boss: klassens egen belønning på toppen, som i ligaen. */
    { const bonus = Math.round(FACROUND(r) * sm * (B.dc || 1)); res.coins += bonus; S.coins += bonus; res.perks.push(`Round ${r} cleared: ${bonus.toLocaleString('en-US')} coins on top.`); }
    if (B.tr.ultra) { const c = B.tr.ci, extra = Math.round([600, 1000, 2000][c - 7] * sm * (B.dc || 1)); res.coins += extra; S.coins += extra; rareLoot(c, res, give, [B.tr.ty]); ringAward(c, res); rarePrize(c, res); res.note = `${B.tr.cn}: extra rewards.`; }
    res.roundDone = true; raidRoll(RAIDWIN); raidUnhide(); S.fac.keep = R.team.map(x => ({ id: x.id, sh: x.sh || 0, iv: (x.iv || []).slice(), nat: x.nat || 0 })); res.keep = 1; R.round++; R.w = 0; R.team = null; R.offer = facOffer(R.round); R.open = 0;
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
   Motstanderne står på det samme nivået på Hard, og litt under på Normal og Easy (som i ligaen), så det er valget av de tre og spillet som avgjør, ikke hvem som har trent mest. Du ser motstanderens tre før du velger dine. Ingen veske og ingen XP,
   og laget er friskt til hver runde. Ett tap, og du er ute til neste dag med kamper. Cupen skifter med ukedagen (CUPS, søndag først): lederne fra hver region,
   Elite Four-cupen med en mester i finalen, og mesternes cup med en av de aller største i finalen.
   PREMIER: mynter for hver runde (PWTCOIN × cupens faktor × vanskelighetsgrad × studiebonus). Vinneren får et trofé, PWTCANDY Rare Candy og en pakke encounters
   (samme trekning som pakken i butikken, uten de legendariske). */
const PWTN = 3, PWTCOIN = [260, 520, 1040], PWTCANDY = 2, ROUNDN = ['Quarter-final', 'Semi-final', 'Final'];
/* Stilt inn mot ligaen (se LGCOIN): mynter i Frontier (FACCOIN) og XP til eget lag per seier i Frontier (FACXP) og i cupen (PWTXP). */
const FACCOIN = 3.9, FACXP = 1.25, PWTXP = 3.2;
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
const pwt = () => S.pwt || (S.pwt = { day: '', run: null, won: 0, cups: {} });
const cupNow = () => (SBX && SBX.cup != null && CUPS[SBX.cup]) || CUPS[new Date((S.lad.day || dayKey()) + 'T12:00:00').getDay()] || CUPS[1];
/* Cupen som er i gang. Den gjelder bare dagen den ble startet. */
const pwtRun = () => { const P = pwt(); if (P.run && P.run.day !== S.lad.day) { P.run = null; } return P.run; };
const pwtOpen = () => !!S.lad.day && !dayStop() && modeOn('pwt') && (!!pwtRun() || pwt().day !== S.lad.day);
/* ---------- Kampdagen er ferdig ----------
   modeDone(k) = modusen har ikke mer å gi denne kampdagen. Når dagen er ferdig (dayDone), viser raidet seg hvis et venter (raidUnhide).
   En kampdag fra i går kan spilles helt til en ny økt starter. Er den ferdig, går forsiden tilbake til vanlig (se ladderCard). */
const modeDone = k => k === 'league' ? ladLost() || ladDone() : k === 'factory' ? facLost() : pwt().day === S.lad.day && !pwtRun();
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
  return evApply(mkBattle(mine, f.team, f.tr, { mode: 'pwt', st: f.st, k: f.k, r: R.r, cup: f.c.n, bag: 0, xm: 0, sm: smFor('pwt'), dc: diff().coin, boost: { mode: '', m: 1, xp: 1 } }));
}
function finishPwt(B) {
  const P = pwt(), R = pwtRun(), win = B.over === 'win', res = { mode: 'pwt', win, ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', r: B.r, cup: B.cup, done: false };
  if (!R) return res;
  const c = CUPS[R.wd];
  if (!win) { P.run = null; res.note = `You are out of the ${c.n}. A new cup opens after your next day of focus.`; raidUnhide(); save(); return res; }
  res.coins = Math.round(PWTCOIN[R.r] * c.f * B.sm * (B.dc || 1) * purseM()); S.coins += res.coins; ringAward(clsI(B.k), res); rarePrize(clsI(B.k), res); evPerk(res);
  modeXp(res, R.n, PWTXP * [1, 1.3, 1.7][Math.min(2, R.r)] * Math.sqrt(c.f), xpMult() * diff().xp * (dayBoost().mode === 'pwt' ? dayBoost().xp : 1));
  R.r++; R.foe = null;
  /* Finaleplassen gir en Rare Candy, og vinneren PWTCANDY til. */
  if (R.r === PWTN - 1) { const n = candyRoll(1); if (n) { S.items.candy = (S.items.candy || 0) + n; res.items.push(`${n} × Rare Candy`); } }
  if (R.r >= PWTN) {
    res.done = true; raidUnhide(); P.won = (P.won || 0) + 1; P.cups[c.n] = (P.cups[c.n] || 0) + 1; P.run = null;
    { const n = Math.max(1, candyRoll(PWTCANDY)); S.items.candy = (S.items.candy || 0) + n; res.items.push(`${n} × Rare Candy`); }
    if (c.ms) { S.items.mstone = (S.items.mstone || 0) + c.ms; res.items.push(`${c.ms} × Mega Stone`); }
    const PK = PACKS[c.pk]; PK.slots.forEach(sl => pushEnc(res, genEnc({ min: sl.min || 0, luck: sl.luck || 0, shm: PK.shm })));
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
const simMode = () => { const ks = modeSt().ks.filter(k => !modeDone(k)); return ks.length === 1 ? ks[0] : ''; };
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
    const used = new Set(team ? team.map(m => m.id) : []); me = team || Array.from({ length: 4 }, () => facMon(2, used, 0));
    const st = { iv: ULTRA.has(k) ? 31 : 22, ev: ULTRA.has(k) ? 60 : 24, q: 2, slack: 99, mg: c.i >= 8 };
    foes = k === 'trainer' ? Array.from({ length: 4 }, () => facMon(2, used, -20)) : k === 'evilteam' ? regTeam(d[4], 4, FACLV, Object.assign({}, c, st), true) : bossTeam(d, 4, FACLV, st, true);
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
const LEGD = '144,1,Lugia,snowy_tall_grass,snow,#bfe6ff,ice,|145,1,Raikou,mountain,spark,#ffe14a,bolt,|146,1,Ho-oh,mountain,flame,#ff9a3a,magma,|150,4,Origins>>Mewtwo,cave,shard,#c79bff,void,rings|151,3,Origins>>Mewtwo,tall_grass,petal,#ffb3d9,forest,|243,1,Raikou,mountain,spark,#ffe14a,bolt,|244,1,Entei>>Raikou,cave,flame,#ff7a2a,magma,|245,1,Raikou,shallow_water,bubble,#7ad0ff,sea,|249,2,Lugia,water,bubble,#cfe6ff,sea,whirl|250,2,Ho-oh,mountain,flame,#ffb23a,sky,rainbow|251,3,Ho-oh,pinwheel_road,petal,#9be07a,forest,|377,1,Heatran,cave,shard,#c9a45c,stone,|378,1,Heatran,kyurem_cave,snow,#bfe6ff,ice,|379,1,Heatran,cave,shard,#b4c0d2,stone,|380,1,Rayquaza,mountain,spark,#ff7a8a,sky,|381,1,Rayquaza,mountain,spark,#6aa8ff,sky,|382,2,Kyogre,water,bubble,#3f8cff,sea,glyph|383,2,Kyogre,cave,flame,#ff5a2a,magma,glyph|384,2,Rayquaza,mountain,spark,#3fe08a,sky,streak|385,3,Deoxys,mountain,spark,#ffe680,space,|386,3,Deoxys,black_tower_10,shard,#ff7a4a,space,rings|480,1,Uxie,shallow_water,bubble,#ffe680,sea,|481,1,Uxie,shallow_water,bubble,#ff8ab0,sea,|482,1,Uxie,shallow_water,bubble,#6aa8ff,sea,|483,2,Palkia,black_tower_10,shard,#6aa8ff,time,rings|484,2,Palkia,black_tower_10,shard,#ff8ad0,space,rift|485,1,Heatran,cave,flame,#ff7a2a,magma,|486,1,Heatran,cave,shard,#e8e0c0,stone,|487,2,Giratina,kyurem_cave,evil,#e0b030,void,stripes|488,1,Uxie,mountain,shard,#ffb3ea,space,|490,3,Uxie,water,bubble,#5ad0ff,sea,|491,3,Darkrai>>Giratina,kyurem_cave,evil,#b03060,night,|492,3,Uxie,tall_grass,petal,#8be07a,forest,|493,4,Arceus,black_tower_10,,#ffe9a8,origin,wheel|494,3,Reshiram,pwt,flame,#ff9a3a,magma,|638,1,Cobalion,mountain,shard,#6ac0e8,stone,|639,1,Cobalion,cave,shard,#c9a45c,stone,|640,1,Cobalion,pinwheel_road,petal,#8be07a,forest,|641,1,Reshiram,mountain,spark,#8be0a0,sky,|642,1,Reshiram,mountain,spark,#6aa8ff,bolt,|643,2,Reshiram,black_tower_10,flame,#fff2e0,flame,pillar|644,2,Reshiram,black_tower_10,spark,#4ad0ff,bolt,pillar|645,1,Reshiram,cave,shard,#e0903a,stone,|646,2,Reshiram,kyurem_cave,snow,#bfe6ff,ice,pillar|647,3,Cobalion,shallow_water,bubble,#6ac0ff,sea,|648,3,Reshiram,pwt,petal,#9be07a,forest,|649,3,Reshiram,black_tower_3_5,shard,#c79bff,space,';
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
        Det som gjør et raid tungt, er ikke nivået, men at den legendariske har flere ganger så mye HP (RAIDHP) og de sterkeste artene i spillet.
        Stilt inn med simulerte kamper (med stedets hendelser og raseriet): et jevnt lag uten veske slår de vanlige omtrent annenhver gang på Hard, de største bare av og til.
   STEDET: hver legendarisk har et domene som kjemper med (se DOM lenger ned): en liten hendelse hver tredje runde, og raseri under halv HP.
   HVEM: oftest en vanlig legendarisk (1), så de mytiske (3) og de største (2). De aller sjeldneste (4: Mewtwo og Arceus, de to vanskeligste) starter på 3 %,
        og sjansen vokser litt for hvert raid uten en av dem (S.rpity), så de kommer før eller siden. Mewtwo har egen trekning (MEWP) til du har den mørke,
        og hver gang du slår Mewtwo, reiser skyggen seg: runde to, mot Dark Mewtwo.
   BELØNNING: mynter (RAIDCOIN × vanskelighetsgrad), Rare Candy (RAIDCANDY), mye XP til hele laget, og den legendariske selv: seieren er fangsten
   (raidCatch). Før måtte den fanges med kast etterpå, og da slapp fire av ti unna etter et vunnet raid. */
const RAIDLV = [75, 88, 82, 96, 100], RAIDHP = [2.4, 3.2, 2.8, 3.4, 3.6], RAIDCOIN = [1800, 3800, 2700, 7500, 12000], RAIDCANDY = [3, 5, 4, 8, 10], RAIDOFF = [8, 12, 10, 13, 16], RAIDREL = [0.22, 0.32, 0.27, 0.36, 0.45], RAIDCAPHP = 0.025;
const RAIDTRIES = 2, RAIDP0 = 0.08, RAIDPITY = 0.035, RAIDWIN = 0.25, RAIDCOOL = 3, MEWP = 0.08, MEWP1 = 0.16;
/* Egen HP-faktor for enkelte arter, oppå klassens (RAIDHP). Innen «de største» var spredningen for stor: Dialga, Palkia, Zekrom og Reshiram var nesten
   uslåelige for alle lag uten legendariske, og hardere enn Mewtwo og Arceus, som skal være de to vanskeligste. Stilt inn med sim/perleg.js. */
const RAIDX = { 150: [1.3, 1], 493: [0.85, 1], 386: [1.6, 1], 483: [0.6, 0.94], 484: [0.6, 0.94], 644: [0.75, 0.97], 643: [0.7, 0.96] };
const raidX = id => RAIDX[id] || [1, 1];
/* Mewtwo, Arceus og den mørke går ikke tomme: de har RAIDPP ganger så mange PP. De andre har vanlige PP, så de sterkeste angrepene deres tar slutt i en
   lang kamp (det er en del av hvorfor en lang kamp kan vinnes). */
const RAIDPP = 4;
/* De sterkeste viser seg bare for lag som kan gi dem kamp: de mytiske fra lagnivå 25, de største fra 35, og Mewtwo og Arceus fra 45. (Dark Mewtwo kommer bare ut av en slått Mewtwo.) */
const RAIDGATE = [0, 35, 25, 45, 45];
/* Nivået den ville hatt uten tak: laget ditt + RAIDOFF nivåer, eller + RAIDREL i andel (det som er høyest, så den står like langt over et sterkt lag som
   over et svakt). Taket er artens toppnivå (RAIDLV, tre nivåer høyere for hver runde du har vunnet, høyst 100). Mangler den nivåer på grunn av taket,
   får den RAIDCAPHP mer HP for hvert av dem (raidHx, lagres i S.raid.hx). */
const raidWant = t => { const l = leagueLv(); return Math.round(Math.max(l + RAIDOFF[t - 1], l * (1 + RAIDREL[t - 1]))); };
const raidCap = t => Math.min(100, RAIDLV[t - 1] + 3 * Math.min(5, S.lad.lap || 0));
const raidLvFor = t => Math.max(15, Math.min(raidCap(t), raidWant(t)));
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
  const inT = t => all.filter(id => LEG[id].t === t), fresh = t => inT(t).filter(id => !legOwn(id));
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
  if (S.raid || !S.party.length) return false;
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
  S.raid = { id, lv: raidLvFor(t), hx: +raidHx(t).toFixed(2), day: '', tries: 0, at: dayKey(), nw: 0, hid: 1, sh }; S.rwait = 0;
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
const raidTries = R => R && R.ev ? 1 : RAIDTRIES;
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
/* Kalles på slutten av hver runde i en raid (fra endTurn i battle.js). */
function raidField(B, ev) {
  const D0 = raidDom(B.tr), f = B.foe[B.b], b = B.me[B.a]; if (!D0 || B.over || f.hp <= 0) return;
  const N = nmOf('me', b), F = f.name;
  /* Deoxys åpner i Attack Forme, går i Defense Forme når to runder er gått, og tilbake i Attack Forme når den blir rasende. */
  if (f.id === DEOXYS && f.mega === DEOXA && !B.rage && B.turn >= DEOXT && f.hp > f.max / 2) raidForm(B, ev, DEOXD);
  if (!B.rage && f.hp <= f.max / 2) { B.rage = 1; ev.push({ t: 'env', k: 'rage', s: `${F} is enraged!` }); if (!(f.id === DEOXYS && raidForm(B, ev, DEOXA)) && !megaEvolve(B, 'foe', ev, 'rage')) changeStats(B, 'foe', D0.up, ev); }
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
const ARCEV = 3, ARCEV2 = 2, ARCMOVES = ['Judgment', 'Earth Power', 'Extreme Speed', 'Hyper Voice'];
const arcMoves = () => { const l = ARCMOVES.map(n => MOVES.findIndex(m => m[0] === n)).filter(i => i >= 0); return l.length === 4 ? l : null; };
/* Deoxys i raid: et sett som ikke senker dens egne verdier (med Psycho Boost gjorde den seg selv ufarlig etter to angrep). */
const DEOXMOVES = ['Psychic', 'Shadow Ball', 'Ice Beam', 'Extreme Speed'];
const deoxMoves = () => { const l = DEOXMOVES.map(n => MOVES.findIndex(m => m[0] === n)).filter(i => i >= 0); return l.length === 4 ? l : null; };
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
/* Formen en legendarisk forvandles til når den blir rasende i et raid (0 = ingen). Mewtwo har Dark Mewtwo som sin andre form og forvandles ikke. */
const raidMega = R => R.dk || R.id === 150 ? 0 : megaOpts(R.id)[0] || 0;
/* Steinen til en legendarisk (Blue Orb, Red Orb, eller Mega-steinen dens). */
const legStone = id => id === 382 ? 'the Blue Orb' : id === 383 ? 'the Red Orb' : `${D(id)[0]}'s Mega Stone`;
function legTr(id, dk) {
  const L = dk ? DARK : LEG[id], d = D(id);
  return { n: dk ? L.n : d[0], img: '', title: raidTitle(id, dk), ty: d[1], kind: 'legend', ci: 10, cn: 'Legendary raid', skill: 1, boss: true, ultra: true, gold: L.t === 4, int: 8,
    sc: L.sc, th: L.th, cc: L.cc, arena: 'hall', v: 0, mre: L.mre, wild: 1, leg: id, dk: dk ? 1 : 0, lt: L.t, lbg: L.bg, sig: L.sig };
}
/* En legendarisk i raid slår aldri ut seg selv: Explosion, Final Gambit, Memento og lignende byttes ut med det beste den ellers kan. */
/* Den helbreder seg heller ikke: med flere ganger så mye HP som en vanlig Pokémon ville Rest eller Recover gjort kampen håpløs. */
const SELFKO = new Set(['Explosion', 'Self-Destruct', 'Final Gambit', 'Memento', 'Healing Wish', 'Lunar Dance', 'Destiny Bond', 'Perish Song',
  'Rest', 'Recover', 'Roost', 'Soft-Boiled', 'Synthesis', 'Moonlight', 'Morning Sun', 'Milk Drink', 'Slack Off', 'Heal Order', 'Wish', 'Swallow', 'Pain Split', 'Leech Seed', 'Ingrain', 'Aqua Ring']);
/* Dark Mewtwo har sitt eget sett: Psystrike, Shadow Ball, Aura Sphere og Dark Pulse treffer alle typer med minst ett angrep. Med det arten lærer av seg
   selv (Future Sight, Aura Sphere, Swift, Psystrike) var en Ghost/Dark-type som Sableye helt urørlig, og den sterkeste i spillet kunne bare stå og se på. */
const DKMOVES = ['Psystrike', 'Shadow Ball', 'Aura Sphere', 'Dark Pulse'];
/* MEWTWO I RAID har de samme fire angrepene på alle nivåer: de den ellers først har fra nivå 93–100. Med nivålista hadde den under raidnivå 90 bare
   Psychic-angrep og Swift, og et lag med en Dark-type slo den nesten hver gang (målt: 96–100 % for pseudo-legendariske på nivå 35–60). I demoen
   (Mewtwo → Dark) har den nivålista som før, så en kommer fram til forvandlingen. */
const MEWMOVES = ['Psystrike', 'Aura Sphere', 'Future Sight', 'Swift'];
const mewMoves = () => { const l = MEWMOVES.map(n => MOVES.findIndex(m => m[0] === n)).filter(i => i >= 0); return l.length === 4 ? l : null; };
const dkMoves = () => { const l = DKMOVES.map(n => MOVES.findIndex(m => m[0] === n)).filter(i => i >= 0); return l.length === 4 ? l : null; };
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
function raidMoves(id, lv) {
  /* Og den bygger seg ikke opp med Cosmic Power, Calm Mind og lignende: den angriper. */
  const ok = x => { const m = MOVES[x]; return !SELFKO.has(m[0]) && !(m[4] === 0 && m[17] === 1 && m[12].length); }, mv = foeMoves(id, lv, 2).filter(ok);
  for (const x of movesAt(id, lv + 8).filter(x => ok(x) && !DEADMV.has(x) && MOVES[x][4] > 0).sort((a, b) => (MOVES[b][2] || 0) - (MOVES[a][2] || 0))) { if (mv.length >= 4) break; if (!mv.includes(x)) mv.push(x); }
  return mv.length ? mv : defaultMoves(id, lv);
}
/* demo = arten som skal prøves i demoen (gir ingenting). Ellers den som har vist seg. */
/* demo = arten som skal prøves i demoen (gir ingenting), eller 'dk' for Dark Mewtwo. Ellers den som har vist seg. */
function raidBattle(lead, demo) {
  const R = demo === 'dk' ? { id: 150, dk: 1, lv: raidLvFor(5), hx: raidHx(5) } : demo ? { id: demo, lv: raidLvFor(LEG[demo].t), hx: raidHx(LEG[demo].t) } : S.raid, L = raidInfo(R), party = S.party.map(monBy).filter(Boolean);
  party.sort((a, b) => (b.u === lead) - (a.u === lead));
  /* Hvem som venter, er hemmelig til filmen har gått: fra første forsøk er den kjent (R.seen), og kortet viser den. */
  if (!demo && S.raid && !S.raid.seen) { S.raid.seen = 1; save(); }
  /* Vanskelighetsgraden senker nivået og HP-en til den legendariske (Hard = som før). */
  const dd = diff(), lv = R.ev ? 100 : Math.max(10, Math.round(R.lv * dd.rlv * (R.dk ? 1 : raidX(R.id)[1]))), e = Math.round((R.dk ? 85 : 60) * dd.ev), foe = { id: R.id, lv, sh: R.dk ? 2 : R.sh ? 1 : 0, g: rollG(R.id), mega: R.id === DEOXYS ? DEOXA : defForm(R.id), ms: raidMega(R), iv: [31, 31, 31, 31, 31, 31].map(v => Math.round(v * (0.5 + dd.iv / 2))), ev: [e, e, e, e, e, e], nat: 0, mv: (R.dk && dkMoves()) || (R.id === ARCEUS && arcMoves()) || (R.id === DEOXYS && deoxMoves()) || (R.id === 150 && demo !== 150 && mewMoves()) || raidMoves(R.id, lv) };
  const B = mkBattle(demo ? party : party.map(evSrc), [foe], legTr(R.id, R.dk), { mode: demo ? 'lab' : 'raid', raid: 1, st: TCL.supreme, k: 'legend', rd: 0, n: 0, lap: 0, ti: 0, bag: bagN(), xm: 3 * dd.xp, sm: 1, dc: dd.coin, boost: { mode: '', m: 1, xp: 1 } });
  B.tr.skill = dd.sk; if (demo) labMega(B); else evApply(B);
  /* I demoen har Mewtwo vanlig HP (ikke raid-HP), så en kommer fram til forvandlingen: det er den demoen er til for. */
  const f = B.foe[0], big = demo === 150 ? 1 : RAIDHP[L.t - 1] * (R.ev ? 1 : dd.rhp) * (R.dk ? 1 : (R.hx || 1) * raidX(R.id)[0]); f.max = f.hp = Math.round(f.max * big); f.big = big; if (L.t >= 4) f.mv.forEach(m => { m.pp = m.max = m.max * RAIDPP; }); if (R.dk) f.short = 'D.Mewtwo';
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
      S.raid = { id: 150, dk: 1, seen: 1, lv: raidLvFor(5), hx: +raidHx(5).toFixed(2), day: '', tries: 0, mu: tg ? tg.u : null, r1: `${res.coins.toLocaleString('en-US')} coins, ${res.items.join(', ')}${nc}` };
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
      if (R.ev) res.note = `${nm} was never going to fall today, and that is how it was meant to be. It has moved on. Train your team: legendary Pokémon will show themselves again.`;
      else if (R.dk) res.note = `${pre}The shadow lets go and Dark Mewtwo is gone. Mewtwo stays with you. Beat a Mewtwo again, and the shadow will rise once more.`;
      else res.note = `${nm} has moved on. Another legendary Pokémon will show itself in time.`;
    } else res.note = `${pre}${nm} stays where it is. You have one more attempt, tomorrow${R.dk ? '' : ', and now you know who is waiting'}.`;
  }
  save(); return res;
}
/* I demoen er Mewtwo hele historien: slår du den, reiser den seg som Dark Mewtwo (dark), akkurat som i et ekte raid. */
const finishLab = B => ({ mode: 'lab', win: B.over === 'win', ups: [], items: [], encs: [], coins: 0, trade: null, perks: [], note: '', kind: B.k, dark: B.over === 'win' && B.raid && B.tr && B.tr.leg === 150 && !B.tr.dk ? 1 : 0 });
