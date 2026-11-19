# Fokusdex – arbeidsnotat for Claude

En Pokémon-fokusapp (PWA): studieminutter gir XP, mynter og møter; etter dagens studier kan laget kjempe (ligaen, Battle Frontier,
World Tournament) og legendariske viser seg i raid. Ren HTML/CSS/JS uten byggesteg. GitHub Pages fra `main`.
Teksten i appen er på engelsk. Kommentarene i koden er på norsk.

## Eieren
- Jazz (GitHub `mwalderhaug`). Svar ham på norsk, kort og med konklusjonen først: han leser ofte på mobilen.
  Si alltid hva som er sluppet, og hva som ikke er testet (iPhone, lyd med ører).
- Vennene hans spiller også. De får endringer i appen, aldri ressurspakken.

## Harde regler
1. Ingen grafikk, lyd, musikk, fonter eller skript fra Pokémon-spillene eller andre tredjeparter i dette repoet. Slikt ligger bare i
   ressurspakken i eierens private repo (`pack/`), og pakken deles aldri videre.
2. Ingen hemmeligheter eller private data her: ingen lagringer, tokens eller e-postadresser, og ikke navnet på det private repoet.
3. De lokale lenkene `_pack`, `_spr`, `_cine.html`, `_g3d` og `_ark` står i `.git/info/exclude` og skal aldri committes.
4. Eierens lagring endres bare etter protokollen i `work/HANDOFF.md`.

## Filene, i rekkefølgen fra index.html
`look` (utseendet: lys eller mørk og fargesettet, lastes i `<head>` før alt annet) · `data`, `data2` (arter, angrep, typer) · `game` (lagringen `S`, `fresh`, `adopt`, `migrateNN`, XP, møter, butikken `SHOP`, pakkene `PACKS`,
`FEATS`/`WN`, synken `GH`) · `battle` (kampmotoren) · `league` (ligaen `POOL`/`TCL`, Frontier, turneringen, raid: `LEG`, `RAIDX`, `raidRoll`,
belønninger) · `week` (ekspedisjonen, ukemodusen: billettene, uka og ukestypene `WKT`, kartet `wkMap`, løpet `S.wk.run`, `finishWeek`) · `bfx`, `ebx`, `ebxp` (effekter, EBDX-animasjoner) · `raid`, `raidf`, `raidx` (raidfilmer, entréer, stedene) · `fxgl` (etterbehandling
og bakkematerialer i WebGL), `raidk` (verktøykassa til filmene og arenaene), `arena` (arenarammeverket: `ARENA.def`), `raid2` (de store: arena og intro
per art, fra steg 2), `raid1` (de vanlige legendariske, klasse 1), `raid3d` (motoren til cutscenene i 3D, `G3D`: stilen, bakkematerialene lava, hav og is, og riggen; three.js og modellene ligger bare i pakken, `pack/3d/`) og `raid3c` (verktøykassa til cutscenene, `G3C`: navneskiltet, filmene, arenaen og skuespillet i kampen, og lasteren for artenes filer) · `bossf`, `darkf` (filmene til Ghetsis/Cynthia og Dark Mewtwo) · `pack` (henter ressurspakken) · `bui` (kampskjermen, resultatet, raidskjermene, regelkortet) ·
`music` · `help` (hjelp og guide) · `show` (raidvarselet, demoen/Sandbox, showcase) · `weekui` (ekspedisjonen på skjermen: kartet, rommene, `WA`, og nederst portalen `wkPortal`, øya `wkIsle`, resultatkortet `wkCardDraw` og arket på studiedag 10 `wkDay10`) · `ui` (resten av grensesnittet, handlingene `A.*`, oppstart).
`sw.js` er service workeren. `style.css` er all stil. **`c3/<art>.js`** er artenes cutscener i 3D (`c3/383.js` er Groudon, `c3/382.js` Kyogre): de står ikke i index.html, men hentes når et raid med arten viser seg (`G3C.load`). En ny art: fila, nummeret i `G3C.ARTS` (raid3c.js) og fila i `FILES` (sw.js). Lærerangrepene `TUTMV` og egg-angrepene `EGGMV` i `data2.js` lages av `work/tools/tutors.js`, og `FACPW` (hver arts vurdering som leie-Pokémon i Battle Frontier, `facRate` i league.js) av `work/tools/facpow.js`: kjør den på nytt når sett, evner, skaderegningen eller vektene i vurderingen endres (`sim/t_c1.js` sier fra).

## Arbeidsmåten
- Verktøyene ligger i `/home/claude/work` (eierens private repo, `dev/`). Ny økt: se under.
- Endringer gjøres som små Python-patcher i `work/patch/` med `lib.py` (`patch(fil, [(gammel, ny)])`, der teksten må finnes nøyaktig én gang).
  Gi dem navn etter bestillingen (`m1.py`, `m2.py` …). Etter hver: `sh work/chk.sh` skal si `ok: 29 filer, 2 i c3` og ikke noe mer
  (den leser alle skriptene samlet, artenes filer i `c3/` hver for seg, og kjører en røyktest av reglene; en linje som starter med `RØYK:` betyr at et navn er forsvunnet).
- Regeltester: `cd work/sim && node <navn>.js` (skal si `alt ok`). Nettlesertester med Playwright: `cd work/pw && ./srv.sh && node t_<navn>.js`.
  Serveren stopper mellom svarene, så start den på nytt. Full regresjon: `work/pw/regress10.sh`.
- Balanse: `work/sim/boss.js` (finalene i ligaen), `perleg.js` (hvert raid for seg), `prog.js` (progresjonen). Med `DIR=/tmp/kopi` måles en endret kopi.
- Store tall og beslutninger skrives i `work/NOTES.md` (logg) og `work/HANDOFF.md` (status nå).
- Tid på skjermen vises som timer og minutter med `hm()` (ui.js): «4 h 20 min», aldri desimaltimer som 4.3.
- Store steg (planen i `work/HANDOFF.md`): jobb på grenen `steg-N` og push den underveis. Skriv «Ferdig med steg N.M» for hvert delsteg og
  «Ferdig med steg N» til slutt. Slå sammen med main først når Jazz skriver «Godkjent, slipp det».

## Utgivelse
1. Testene er grønne.
2. Øk `CACHE` i `sw.js` (`fokusdex-vNN`).
3. Merker spillerne noe: øk `WNV` og skriv 3–4 korte linjer i `WN` (game.js), med norsk i `LNO`. Hold dem vage: «Bug fixes»,
   «Some adjustments to raids and bosses». Aldri navn på bosser, legendariske eller gjenstander, og aldri tall: det røper for mye for
   spillerne. Et nytt valg spilleren selv skal bruke, kan nevnes kort med hvor det er. Spillerne får selv beskjed om at en ny versjon
   er klar (stripa «Reload», `updReady` i ui.js), så de trenger ikke å bli fortalt det.
4. Ny form på lagringen: ny `migrateNN` og `fresh().mig`.
5. Commit på engelsk, push til `main`. Skriv det i `work/NOTES.md` og oppdater `work/HANDOFF.md`.

## Ny økt
Klon appen til `/home/claude/fokusdex` og eierens private repo til `/home/claude/pokemon_save`, og kjør `sh /home/claude/pokemon_save/dev/setup.sh`.
Les så `work/HANDOFF.md`, `work/MONDAY.md` hvis oppgaven er layout, raidkamper eller traileren, og `work/RAIDS.md` og `work/STEG2.md` hvis den er
raidintroer eller arenaene (verktøykassa, oppskriften for en ny art, og `pw/t_film.js`, som lager video av en film). Gjelder den en cutscene i 3D,
raidbossen i 3D eller en arena i 3D: les også `work/RAIDS3D.md` (reglene Jazz har sagt ja og nei til, kodekartet og oppskriften for en ny art). Groudon
(`c3/383.js`) er standarden: sjekk ham bilde mot bilde etter enhver endring i motoren eller verktøykassa (`work/g3d/scripts/bildemot.js` og `bildemot.py`).
