# Hollowdeep

A solo, offline 2D dungeon crawler for iPhone, built as an installable web app (PWA). Hollowdeep is a living dungeon that rebuilds its rooms every night; seven Wardens guard its seven Depths, and the whole place builds up to one big show.

## What's in it (v0.5, Depths 1–7)
- **The Threshold (tutorial)**: starts on first launch (replay it from Settings). A small fixed dungeon with tooltips on killing mobs, secrets, puzzles (and Puzzle glow), Rune Doors, the Gate Key and the Summoning Hall. It ends at the Gatekeeper's portal and gives 25 Delve XP the first time.
- A randomly generated dungeon each run: 1x1, 1x2, 2x1, 2x2 and L rooms built from hand-made layouts, each furnished in one of ten room styles.
- Map screen first; tap a room to zoom in, tap the corner minimap (or **Map**) to go back.
- Tap mobs to hit them; weapon abilities do area damage. Room mobs sleep until you get close.
- The rush: a chain of Rune Doors runs from the Threshold to the Summoning Hall, with the Wellspring halfway. Each key drops in the room right before its door. The Gate Door needs the Gate Key.
- Secrets (appear once a room is cleared), tombs (+bonus score), the Wellspring (full heal).
- Puzzles: Tic Tac Toe, Higher or Lower (embers), Three Liars.
- The Summoning Hall: the Gatekeeper sends in his extras (and keeps sending them while you're elsewhere). Clear them to open the portal to the Warden.
- The Wardens:
  - **Depth 1, Pip the Jester**: random Balloon Barrage, Balloon Ring, Party Spiral, Firework Show and Confetti Blast; tap balloons and rockets to pop them. He comes back for a second act.
  - **Depth 2, Ossia the Bonecaller**: kill her four apprentices first (Brute, Mender, Hexer, Sniper). The Mender heals and revives the others, so kill it first. Then Ossia blinks around throwing fireballs.
  - **Depth 3, Grimsby the Alchemist**: four Homunculi first (Stone, Plated takes half damage, Toxic throws skulls, Prism charges a beam), then Grimsby, then his transformed form.
  - **Depth 4, Mother Bramble**: only the Moonbow hurts her. Kill a Grove Bear, tap the bow it drops, then tap her to shoot (4 hits). Wisp Wolves keep coming.
  - **Depth 5, Lady Facet**: 8 masked copies, only one is real; its colour matches the block at the top. Hitting a fake blinds and hurts you. Shade Stalkers join at half health.
  - **Depth 6, Foreman Basalt**: 12 Clay Soldiers, then four Titans (Stomper, Lens Titan, Blade Titan, Rose Titan throws boulders you can tap). Hit a Titan while it charges to interrupt it. Then Basalt with Forge Golems.
  - **Depth 7, The Last Encore**: Boom the Drummer (four drums flash a pattern; tap it back to make the amps blast him, one beat longer each time; a wrong drum hurts and deals a new pattern), Strobe the Light Tech (tap a lighting rig when he stands under it, and tap the blinking fuse box before he kills the lights), Riff the Guitarist (solve 4 mixing desks before he reaches you: tap channels in order, fix the red channels, or set five faders to their marks) and the Maestro (throws fans of notes you tap out of the air, hides behind a ghost chorus at 66% and 33%, and goes down in a shower of fireworks).
- **Nightmare Mode**: N1 to N7 are the same Depths with far more mob health and damage. N1 needs a Depth 7 clear; each later one needs the one before. N7 ends with five **Neon Phoenixes** (2M health each): they take off every 6 seconds, up to three in the air, and take double damage over their own statue. Their fireballs cost 15% of your max health (tap them to destroy them), and each one charges a blast worth 50% of your health that you stop by dealing 25% of its health. N7 drops the **Showstopper**, a huge greatsword where every swing crits and cleaves.
- **Delver Rank matters everywhere.** Below a Depth's required rank (only possible with Unlock all Depths) each missing rank cuts your damage by 40% and raises damage taken by 50%. Nightmare Depths also have a mastery rank (N1 30 up to N7 50). tests/balance.test.ts checks this.
- **Luck Meter** tab: every drop for every Depth with its odds; pick a target per Depth and each win fills the meter and boosts your odds; a full meter guarantees the drop.
- Score: Skill / Exploration / Speed / Bonus, S at 270, S+ at 300, with big banners when you reach them. Free reward chest by grade (Wood, Iron, Gold, Crystal, Royal, Mythic) with essence and rare drops.
- Drops: D1 **Pip's Party Wand**, **Jester's Grin**; D2 **Bonecaller's Tome**; D3 **Mutagen Blade** and armor; D4 **Wisp Sceptre**, **Wisp Treads**; D5 **Facet Dagger**, **Shade Rush**, **Shade Stalker armor**; D6 **Titan's Cleaver**, **Forgelord armor**; D7 **Maestro's Hilt**, **Resonance Crystals**, three pieces of sheet music, **Headliner armor** and **Strobe armor**.
- **Crescendo** crafting: Maestro's Hilt + 8 Resonance Crystals + 2,000 Star Essence, then the Big Finish, Stage Dive and Standing Ovation sheet music unlock Encore Strike.
- Delve XP and Delver Rank (+3% health, defense and damage per rank). Bone and Star essence upgrade every item from level 1 to 50.
- **Calibrate taps** in Settings, **Puzzle glow**, music and sound effects.
- Temporary **Admin** tab to spawn items, essence and XP, a rank slider (0 to 50) and god mode. Turn it off under Save.
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
