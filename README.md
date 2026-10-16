# SkyBlock Dungeons

A private, solo, offline 2D take on Hypixel SkyBlock's Catacombs, built as an installable web app (PWA) for iPhone.

## What's in it (v0.4, Floors 1–7)
- Randomly generated dungeon each run: 1x1, 1x2, 2x1, 2x2 and L rooms built from hand-made layouts.
- Map screen first; tap a room to zoom in, tap the corner minimap (or **Map**) to go back.
- Tap mobs to hit them; weapon abilities do area damage.
- Wither Door + Blood Key: each key drops in the room right before its door, so you rush wither room to wither room. Clear the room and tap the key to pick it up.
- Secrets (appear once a room is cleared), crypts (+bonus score), Fairy room (full heal).
- Puzzles: Tic Tac Toe, Higher or Lower (blazes), Three Weirdos.
- Blood room with the Watcher, then the floor boss (walking through the portal heals you):
  - **F1 Bonzo**: two phases, balloons you can pop, undead adds.
  - **F2 Scarf**: kill his 4 minions first (Warrior, Priest, Mage, Archer). The Priest heals them and revives dead ones, so kill it first. Then Scarf teleports around throwing fireballs.
  - **F3 The Professor**: kill the 4 Guardians first (Healthy, Reinforced takes half damage, Chaos throws skulls, Laser charges a beam), then the Professor, then his Guardian form.
  - **F4 Thorn**: only the Spirit Bow hurts him. Kill a Spirit Bear, tap the bow it drops, then tap Thorn to shoot (4 hits). Spirit Wolves keep coming.
  - **F5 Livid**: 8 coloured Livids, only one is real. Its colour matches the block above the arena; hitting a fake blinds and hurts you. They shuffle around, and he enrages at half health with Shadow Assassins.
  - **F6 Sadan**: kill 12 Terracottas, then his 4 Giants (Bigfoot stomps, L.A.S.R. lasers, the Diamond Giant swings, the Jolly Pink Giant throws boulders you can tap). Hit a Giant while it charges to interrupt it. Then Sadan himself, with Golems.
  - **F7 The Wither Lords**: Maxor (slide both Energy Crystals into the power cells to fire the wall lasers and stun him), Storm (tap a crusher when he stands under it), Goldor (solve 4 terminals before he reaches you) and Necron (shields himself with Wither Guards at 66% and 33%).
- **RNG Meter** tab: every drop for every floor with its odds, pick a target per floor, each win fills the meter and boosts your odds; a full meter guarantees the drop. A floor's meter unlocks after your first clear of it.
- Phase banners in boss fights (DAMAGE MAXOR!, 1/2 CRYSTALS ACTIVATED, TERMINALS 2/4...), death and explosion effects, and a full-screen RNGESUS DROP celebration for rare drops.
- **Puzzle glow** setting (Settings tab or pause menu) highlights the right answer in every puzzle and terminal.
- Hyperion crafting: Necron's Handle + 8 Wither Catalysts + 2,000 Wither Essence, then the three scrolls.
- Room mobs stay idle until you get close, so big rooms come at you in waves.
- Tap the glowing arrow in a doorway to walk straight into the next room (it uses a key if the door is locked).
- The Watcher keeps spawning his mobs while you're elsewhere; they wait asleep until you come back.
- Bonzo picks random attacks: Balloon Barrage, Balloon Ring, Party Spiral, Firework Show (rockets with blast markers) and Confetti Blast. Tap balloons and rockets to pop them. All bosses have 25% less health.
- **Calibrate taps** in Settings: tap 9 dots and the game shifts every tap to where you meant it and sizes tap areas to how precise you are.
- Hyperion's Wither Impact hits every mob in the room. Secrets, keys and crypts have big tap areas.
- Looks: torch-lit rooms with dynamic lighting, 3D walls and pillars, cobwebs, bones, barrels, banners and moss; themed boss arenas per floor; hit shake, red hurt vignette and drop shadows.
- Bonzo's Staff fires an exploding firework on every tap. The Livid Dagger slashes every mob you swipe across.
- Hypixel-style score (Skill / Exploration / Speed / Bonus), S at 270, S+ at 300.
- Free reward chest by grade (Wood → Bedrock) with essence and rare drops: F1 **Bonzo's Staff**, **Bonzo's Mask**; F2 **Conjuring**; F3 **Adaptive Blade** and **Adaptive armor**; F4 **Spirit Sceptre**, **Spirit Boots**; F5 **Livid Dagger**, **Shadow Fury**, **Shadow Assassin armor**; F6 **Giant's Sword**, **Necromancer Lord armor**; F7 **Necron's Handle**, **Wither Catalysts**, the three **scrolls** and **Necron's armor**.
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
