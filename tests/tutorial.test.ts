import { describe, expect, it } from 'vitest';
import { TUTORIAL_FLOOR, TUTORIAL_XP } from '../src/data/floors';
import { Run } from '../src/game/run';
import { freshProfile } from '../src/game/save';
import { TUT, tutorialTip } from '../src/game/tutorial';

const quiet = { toast: () => {}, changed: () => {}, ended: () => {} };

/** Plays the tutorial start to finish with the admin helpers, checking a tooltip shows at every step. */
function playThrough(run: Run): string[] {
  const titles: string[] = [];
  const tip = () => {
    const t = tutorialTip(run);
    expect(t).not.toBeNull();
    titles.push(t!.title);
  };
  const r = run.rooms;
  tip();
  run.tapRoom(r[TUT.first]);
  tip();
  run.adminClearRoom();
  run.update(0.1);
  tip();
  for (const s of r[TUT.first].secrets) { s.found = true; run.secretsFound++; }
  tip();
  const key = r[TUT.first].key!;
  run.tap(key.x, key.y);
  expect(run.witherKeys).toBe(1);
  run.tapRoom(r[TUT.puzzle]);
  tip();
  run.solvePuzzle(r[TUT.puzzle], true);
  run.goToMap();
  tip();
  run.tapRoom(r[TUT.keyRoom]);
  expect(run.witherKeys).toBe(0);
  tip();
  run.adminClearRoom();
  run.update(0.1);
  const bk = r[TUT.keyRoom].key!;
  run.tap(bk.x, bk.y);
  expect(run.bloodKey).toBe(true);
  tip();
  run.tapRoom(r[TUT.blood]);
  tip();
  for (let i = 0; i < 400 && !r[TUT.blood].cleared; i++) {
    run.adminClearRoom();
    run.update(0.1);
  }
  expect(r[TUT.blood].cleared).toBe(true);
  tip();
  run.startBoss();
  return titles;
}

describe('Entrance tutorial', () => {
  it('builds the fixed dungeon with mobs, secrets, a puzzle and both keys', () => {
    const run = new Run(freshProfile(), TUTORIAL_FLOOR.id, quiet, 1);
    expect(run.rooms.length).toBe(5);
    expect(run.rooms[TUT.first].plan.mobSpawns.length).toBe(3);
    expect(run.rooms[TUT.first].secrets.length).toBe(2);
    expect(run.rooms[TUT.puzzle].puzzle?.kind).toBe('tictactoe');
    expect(run.plan.doors.map((d) => d.type).sort()).toEqual(['blood', 'normal', 'normal', 'wither']);
  });

  it('shows a tooltip at every step and ends at the portal with a little XP the first time', () => {
    const profile = freshProfile();
    const run = new Run(profile, TUTORIAL_FLOOR.id, quiet, 2);
    const titles = playThrough(run);
    for (const t of ['Welcome to Hollowdeep!', 'Killing mobs', 'Finding secrets', 'Puzzles', 'Rune Doors', 'The Gate Key', 'The Gate Door', 'The Summoning Hall', 'Summoning Hall cleared!']) {
      expect(titles).toContain(t);
    }
    expect(run.ended?.victory).toBe(true);
    expect(run.ended?.xp).toBe(TUTORIAL_XP);
    expect(profile.cataXp).toBe(TUTORIAL_XP);
    expect(run.view).not.toBe('boss');

    const again = new Run(profile, TUTORIAL_FLOOR.id, quiet, 3);
    playThrough(again);
    expect(again.ended?.xp).toBe(0);
    expect(profile.cataXp).toBe(TUTORIAL_XP);
  });
});
