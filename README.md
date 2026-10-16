# SkyBlock Dungeons

A private, solo, offline 2D take on Hypixel SkyBlock's Catacombs, built as an installable web app (PWA) for iPhone.

## What's in it (v0.1, Floor 1)
- Randomly generated dungeon each run: 1x1, 1x2, 2x1, 2x2 and L rooms built from hand-made layouts.
- Map screen first; tap a room to zoom in, tap the corner minimap (or **Map**) to go back.
- Tap mobs to hit them; weapon abilities do area damage.
- Wither Door + Blood Key: clear the key room and tap the key to pick it up.
- Secrets (appear once a room is cleared), crypts (+bonus score), Fairy room (full heal).
- Puzzles: Tic Tac Toe, Higher or Lower (blazes), Three Weirdos.
- Blood room with the Watcher, then **Bonzo** (two phases, balloons you can pop, undead adds).
- Hypixel-style score (Skill / Exploration / Speed / Bonus), S at 270, S+ at 300.
- Free reward chest by grade (Wood → Bedrock) with essence and rare drops: **Bonzo's Staff**, **Bonzo's Mask**.
- Catacombs XP and levels (+3% health, defense and damage per level).
- Essence upgrades for every item, level 1 to 50, cost rising each level.
- Temporary **Admin** tab to spawn items (incl. Spirit Sceptre, Giant's Sword, Hyperion and its scrolls), essence and XP, plus god mode. Turn it off under Save.
- Save backup: copy/paste a save code under Save.

Death ends the run with no chest.

## Develop
```
npm install
npm run dev      # local dev server
npm test         # generator tests
npm run build    # production build in dist/
```

## Deploy and install on iPhone
1. Import this repo into Vercel (framework preset: Vite; build `npm run build`; output `dist`). A private repo works.
2. Open the Vercel URL in **Safari** on the iPhone, tap Share → **Add to Home Screen**.
3. Open it once from the Home Screen while online; after that it works offline. New versions download the next time you open it online.

## Swapping the art
All art is generated in `src/render/sprites.ts`. Replace the sprite strings or swap them for image files later without touching game logic.
