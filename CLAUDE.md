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
3. De lokale lenkene `_pack`, `_spr` og `_cine.html` står i `.git/info/exclude` og skal aldri committes.
4. Eierens lagring endres bare etter protokollen i `work/HANDOFF.md`.

## Filene, i rekkefølgen fra index.html
`data`, `data2` (arter, angrep, typer) · `game` (lagringen `S`, `fresh`, `adopt`, `migrateNN`, XP, møter, butikken `SHOP`, pakkene `PACKS`,
`FEATS`/`WN`, synken `GH`) · `battle` (kampmotoren) · `league` (ligaen `POOL`/`TCL`, Frontier, turneringen, raid: `LEG`, `RAIDX`, `raidRoll`,
belønninger) · `bfx`, `ebx`, `ebxp` (effekter, EBDX-animasjoner) · `raid`, `raidf`, `raidx` (raidfilmer, entréer, stedene) · `bossf`, `darkf`
(filmene til Ghetsis/Cynthia og Dark Mewtwo) · `pack` (henter ressurspakken) · `bui` (kampskjermen, resultatet, raidskjermene, regelkortet) ·
`music` · `help` (hjelp og guide) · `show` (raidvarselet, demoen/Sandbox, showcase) · `ui` (resten av grensesnittet, handlingene `A.*`, oppstart).
`sw.js` er service workeren. `style.css` er all stil.

## Arbeidsmåten
- Verktøyene ligger i `/home/claude/work` (eierens private repo, `dev/`). Ny økt: se under.
- Endringer gjøres som små Python-patcher i `work/patch/` med `lib.py` (`patch(fil, [(gammel, ny)])`, der teksten må finnes nøyaktig én gang).
  Gi dem navn etter bestillingen (`m1.py`, `m2.py` …). Etter hver: `sh work/chk.sh` skal si `ok: 19 filer`.
- Regeltester: `cd work/sim && node <navn>.js` (skal si `alt ok`). Nettlesertester med Playwright: `cd work/pw && ./srv.sh && node t_<navn>.js`.
  Serveren stopper mellom svarene, så start den på nytt. Full regresjon: `work/pw/regress10.sh`.
- Balanse: `work/sim/boss.js` (finalene i ligaen), `perleg.js` (hvert raid for seg), `prog.js` (progresjonen). Med `DIR=/tmp/kopi` måles en endret kopi.
- Store tall og beslutninger skrives i `work/NOTES.md` (logg) og `work/HANDOFF.md` (status nå).
- Tid på skjermen vises som timer og minutter med `hm()` (ui.js): «4 h 20 min», aldri desimaltimer som 4.3.

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
Les så `work/HANDOFF.md`, og `work/MONDAY.md` hvis oppgaven er layout, raidintroer, raidkamper eller traileren.
