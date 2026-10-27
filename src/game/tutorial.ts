import { openLayout } from '../data/layouts';
import type { FloorDef } from '../data/floors';
import { buildRoomTiles, type DoorPlan, type DungeonPlan, type RoomPlan } from './dungeonGen';
import { Rng } from './rng';
import type { Run } from './run';

/**
 * The Entrance tutorial is always the same little dungeon:
 *
 *   [Entrance] [First room] [Puzzle]
 *   [ Key room (2x1)      ] [Blood ]
 *
 * Entrance -> First room (mobs, secrets, Wither Key) -> Puzzle on the side,
 * Wither Door down to the Key room (Blood Key) -> Blood Door -> Blood Room.
 */
export const TUT = { entrance: 0, blood: 1, puzzle: 2, first: 3, keyRoom: 4 } as const;

const FIRST_ROOM = [
  'S......S',
  '.##..##.',
  '.#....#.',
  '...M....',
  '....M...',
  '.#..M.#.',
  '.##..##.',
  '........',
];

const KEY_ROOM = [
  '...............S',
  '.##..........##.',
  '.#...M....M..#..',
  '................',
  '................',
  '.#...M....M..#..',
  '.##..........##.',
  '................',
];

export function tutorialDungeon(floor: FloorDef, seed: number): DungeonPlan {
  const rng = new Rng(seed);
  const room = (id: number, type: RoomPlan['type'], shape: RoomPlan['shape'], bx: number, by: number, bw: number, bh: number): RoomPlan => {
    const cells = [];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) cells.push({ x: bx + x, y: by + y });
    return { id, type, shape, cells, bx, by, bw, bh, tiles: [], mobSpawns: [], secrets: [], crypts: [] };
  };
  const rooms = [
    room(TUT.entrance, 'entrance', '1x1', 0, 0, 1, 1),
    room(TUT.blood, 'blood', '1x1', 2, 1, 1, 1),
    room(TUT.puzzle, 'puzzle', '1x1', 2, 0, 1, 1),
    room(TUT.first, 'normal', '1x1', 1, 0, 1, 1),
    room(TUT.keyRoom, 'normal', '2x1', 0, 1, 2, 1),
  ];
  rooms[TUT.puzzle].puzzle = 'tictactoe';
  rooms[TUT.first].key = 'wither';
  rooms[TUT.keyRoom].key = 'blood';
  rooms[TUT.first].style = 'library';
  rooms[TUT.keyRoom].style = 'armory';
  // cellA is always in room a.
  const doors: DoorPlan[] = [
    { id: 0, a: TUT.entrance, b: TUT.first, cellA: { x: 0, y: 0 }, cellB: { x: 1, y: 0 }, type: 'normal' },
    { id: 1, a: TUT.puzzle, b: TUT.first, cellA: { x: 2, y: 0 }, cellB: { x: 1, y: 0 }, type: 'normal' },
    { id: 2, a: TUT.first, b: TUT.keyRoom, cellA: { x: 1, y: 0 }, cellB: { x: 1, y: 1 }, type: 'wither' },
    { id: 3, a: TUT.blood, b: TUT.keyRoom, cellA: { x: 2, y: 1 }, cellB: { x: 1, y: 1 }, type: 'blood' },
  ];
  const layouts: Record<number, string[]> = {
    [TUT.entrance]: openLayout('entrance'),
    [TUT.blood]: openLayout('blood'),
    [TUT.puzzle]: openLayout('puzzle'),
    [TUT.first]: FIRST_ROOM,
    [TUT.keyRoom]: KEY_ROOM,
  };
  for (const r of rooms) buildRoomTiles(r, doors, floor, rng, layouts[r.id]);
  const grid = [
    [TUT.entrance, TUT.first, TUT.puzzle],
    [TUT.keyRoom, TUT.keyRoom, TUT.blood],
  ];
  return { cols: 3, rows: 2, grid, rooms, doors, entrance: TUT.entrance, blood: TUT.blood, seed };
}

export interface TutorialTip {
  title: string;
  text: string;
  /** Shows a button that turns on puzzle glow. */
  glowButton?: boolean;
}

/** The tooltip to show right now, worked out from where the player is and what they've done. */
export function tutorialTip(run: Run): TutorialTip | null {
  if (run.ended) return null;
  const r = run.rooms;
  const here = run.view === 'room' ? run.current : null;
  const onMap = run.view === 'map';
  const first = r[TUT.first], puzzle = r[TUT.puzzle], keyRoom = r[TUT.keyRoom], blood = r[TUT.blood];

  if (blood.cleared) {
    return here === blood
      ? { title: 'Summoning Hall cleared!', text: 'The Gatekeeper lets you pass. Tap the portal in the middle to finish. On real Depths it leads to the boss.' }
      : { title: 'Summoning Hall cleared!', text: 'Head back to the Summoning Hall and tap the portal to finish.' };
  }
  if (here === blood) {
    return { title: 'The Summoning Hall', text: 'The Gatekeeper sends in his extras a few at a time. Kill them all to open the portal. He keeps spawning while you are away, so you can grab secrets meanwhile.' };
  }
  if (run.bloodKey) {
    return { title: 'The Gate Door', text: 'You have the Gate Key! Only it opens the red Gate Door. Tap the red door (or the room behind it on the map) to go in.' };
  }
  if (here === keyRoom) {
    if (!keyRoom.cleared) return { title: 'The Gate Key', text: 'The room right before the Gate Door holds the Gate Key. Clear the mobs and it drops.' };
    if (keyRoom.key?.spawned && !keyRoom.key.taken) return { title: 'The Gate Key', text: 'There it is, the red key. Tap it to pick it up.' };
    if (keyRoom.secrets.some((s) => !s.found)) return { title: 'Secrets', text: 'This room has a secret too. Find it before you move on.' };
  }
  if (keyRoom.visited) {
    return { title: 'The Gate Key', text: 'The Gate Key is in the room just before the red Gate Door. Go back there and clear it.' };
  }

  if (!first.visited) {
    return onMap
      ? { title: 'Welcome to Hollowdeep!', text: 'This is the map. Green is the Threshold; grey ? rooms are unexplored. Tap the ? room to walk in.' }
      : { title: 'Welcome to Hollowdeep!', text: 'Tap the glowing arrow in the doorway to walk into the next room, or open the Map.' };
  }
  if (!first.cleared) {
    return here === first
      ? { title: 'Killing mobs', text: 'Tap a mob to hit it. Mobs sleep until you get close. Kill them all to clear the room.' }
      : { title: 'Killing mobs', text: 'The brown room still has mobs in it. Go back in and clear it.' };
  }
  if (here === first && first.secrets.some((s) => !s.found)) {
    const left = first.secrets.filter((s) => !s.found).length;
    return { title: 'Finding secrets', text: `Clearing a room reveals its secrets: chests, essence and bats, often in corners. Tap them to collect. S+ needs every secret. ${left} left here.` };
  }
  if (first.key?.spawned && !first.key.taken) {
    return here === first
      ? { title: 'Rune Key', text: 'Clearing this room dropped a Rune Key. Tap it to pick it up.' }
      : { title: 'Rune Key', text: 'You left the Rune Key behind in the first room. Go back and tap it.' };
  }
  if (!puzzle.cleared) {
    if (here === puzzle) {
      return run.profile.settings.puzzleGlow
        ? { title: 'Puzzles', text: 'Win or tie this Tic Tac Toe. Puzzle glow is on, so the best moves light up.' }
        : { title: 'Puzzles', text: 'Win or tie this Tic Tac Toe. Failing costs score. Puzzle glow highlights the right answer in every puzzle (also in Settings and the pause menu).', glowButton: true };
    }
    return { title: 'Puzzles', text: 'A puzzle room is next door, opposite the Threshold. Tap that doorway arrow or the room on the map.' };
  }
  if (run.witherKeys <= 0 && !run.openDoors.has(2)) {
    return { title: 'Rune Doors', text: 'The black door needs a Rune Key. Pick up the key in the first room.' };
  }
  return { title: 'Rune Doors', text: 'Black doors are Rune Doors and each takes a Rune Key. The key drops in the room right before its door. Tap the black door (or the room past it on the map).' };
}
