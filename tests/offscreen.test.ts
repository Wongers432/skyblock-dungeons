import { describe, expect, it } from 'vitest';
import { TUTORIAL_FLOOR } from '../src/data/floors';
import { Run } from '../src/game/run';
import { freshProfile } from '../src/game/save';
import { TUT } from '../src/game/tutorial';

const quiet = { toast: () => {}, changed: () => {}, ended: () => {} };

describe('rooms you are not in', () => {
  it('keep moving projectiles and shots, but cannot hurt you', () => {
    const run = new Run(freshProfile(), TUTORIAL_FLOOR.id, quiet, 1);
    const room = run.rooms[TUT.first];
    run.tapRoom(room);
    const f = room.field;
    const p = f.player;
    f.projectiles.push({ x: p.x - 3, y: p.y, vx: 1, vy: 0, damage: 1e9, kind: 'arrow', tappable: false, life: 8 });
    const mob = f.aliveMobs()[0];
    f.shots.push({ kind: 'bat', x: mob.x - 3, y: mob.y, target: mob, damage: 1e12, radius: 1, life: 3 });
    run.goToMap();
    for (let i = 0; i < 40; i++) run.update(0.1);
    expect(run.ended).toBeNull();
    expect(f.projectiles.length === 0 || f.projectiles[0].x > p.x - 3 + 3.5).toBe(true);
    expect(mob.dead).toBe(true);
  });
});
