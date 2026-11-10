# Roadmap

Agreed with Jazz on 10 Nov 2026. Steps 1 and 2 are done; step 3 is next.

## Step 1 – foundation (done)
Base stats, IVs, natures, EVs from focus minutes, level-up moves (Black 2/White 2), stat card with hexagon and evolution path,
wild levels that follow the team, 3 coins per minute, and a choice of which save to keep when connecting sync.

## Step 2 – trainer battles (done)
- "Done for today" opens the trainer ladder. It stays open until the next focus session starts, so battles can wait until
  later that evening or the next morning. No cap on battles; a loss closes the ladder until the next day of focus.
- Turn-based single battles: type chart, STAB, crits, accuracy, priority, stat stages, sleep, poison, burn, paralysis,
  freeze, confusion, drain, recoil, multi-hit, recharge and healing moves. Team is fully healed before every battle.
- Gen 5 layout: animated back sprite bottom left, opponent top right, slanted HP boxes, EXP bar, text box. Own artwork for
  arenas, platforms and move animations, and three distinct hit sounds.
- Every fifth trainer is a boss (Gym Leaders and Elite Four) with a VS intro and an arena in their type colour. From trainer 10
  a boss can be a top boss (champions, rivals, team leaders), and from trainer 15 a legendary trainer (Red, Cynthia, N).
- After a boss win, pick one Pokemon from their team (never legendaries). Top bosses also give a coin perk for the next sessions.
- Trainer levels follow the team (midway between the strongest and the average) and rise with every rung.
- Coins and items scale with that day's focus time: x0.5 with no study up to x2.0 at five hours. XP only x0.8-1.2.
- Overview screen after every battle with the team, XP, level-ups, rewards and the record.
- Simple own battle music (beta) with a setting to turn it off.

Still open from step 2: double battles, using items in battle (comes with step 3), two-turn moves (Fly, Dig, Solar Beam run as
one turn for now), and "Choose your own music" with local mp3 files stored on the device only (never in the repo).

## Step 2b – League and Battle Factory (done)

- The ladder is now a League with fixed stages that keep getting harder: Trainers, Ace Trainers, Gym Leaders, Rivals, Elite Four, Team Bosses, Champion, and sometimes a Legendary Trainer. Laps repeat with stronger trainers and better rewards.
- Trainers have at least three Pokémon, varied types, smarter movesets, and skilled trainers switch out. Levels follow your team but have a floor per stage.
- XP is handed out after the battle to the whole team, more to lower-level Pokémon. Coins are lower and follow the stage. Bosses give Rare Candy and encounters, and sometimes offer a trade.
- Battle Factory: 4 of 7 rental Pokémon, seven battles per round, swap after each win, rewards in items and encounters.
- Engine: Leech Seed, Rollout, two-turn moves, weather, screens, hazards, substitutes, trapping, Encore, Taunt, Disable and most other unique status moves.
- Screen: one connected arena, Gen 5-style HP boxes with HP that drains gradually, typed text, a colourful FIGHT menu, ball throws, an entrance for the top bosses' ace, and move animations per type and kind of move.
- New moves: a "wants to learn" choice like in the games, and a ! on the team until you have looked.
- Several routes can be on at the same time.

## Step 3 – items
- Random item finds during sessions, and wild Pokémon that sometimes hold an item.
- Held items with a unique use: Lucky Egg, Amulet Coin, Leftovers, type boosters, Exp. Share.
- Battle items: Potion, Revive. Rare items: Master Ball, Shiny Charm.
