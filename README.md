# Fokusdex

A focus timer as a game: every minute you focus earns XP and coins, and every session lures out wild Pokémon (generations 1–5) that you can catch, evolve and collect.

- Plain HTML, CSS and JavaScript with no build step. Open `index.html`, or use GitHub Pages.
- Share it by sending the link. Each player picks a partner and up to four subjects of their own on first start.
- Everything is saved in the browser, so each player and device has its own game. Sync between devices is optional (Profile → Sync) and uses a private GitHub repo.
- `data.js` is built from the open data files of [PokeAPI](https://github.com/PokeAPI/pokeapi).
- Battles open with "Done for today": the Trainer League (your own team against trainers scaled to it, endless, laps of 12 battles with a trainer and then a boss through nine classes from Gym Leader to Supreme Boss, XP for the whole team afterwards, Potions and Revives from the Shop usable from the Bag) and the Battle Frontier (pick 4 of 7 rental Pokémon, everything at Lv 50, six trainers and then a boss, win items and encounters). Each day one of the two has a bonus. A demo mode (Profile, or `#lab` in the address) lets you try any class without rewards.
- Optional private resource pack: each player can keep their own arenas, HP boxes, intro graphics, move animations, sounds and battle music in a folder called `pack` in their private sync repo. The app reads it with the sync key and stores the files on the device (`pack.js`). Nothing from such a pack is part of this repository, and without one the battles use the effects drawn with code.
- Files: `game.js` (rules and saving), `battle.js` (battle engine), `league.js` (trainers, League, Frontier, demo, rewards), `bfx.js` (move animations drawn with code), `bui.js` (battle screens), `ui.js` (everything else on screen).

This is a private hobby project with no affiliation with Nintendo, Game Freak or The Pokémon Company, who own Pokémon and the names. The repo contains no Pokémon images. Images are fetched from the [PokeAPI sprite archive](https://github.com/PokeAPI/sprites) when the app is used.
