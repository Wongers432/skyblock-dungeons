import { describe, expect, it } from 'vitest';
import { FADER_STEPS, WitherLordsController, makeTerminal } from '../src/game/bosses67';
import { Run } from '../src/game/run';
import { freshProfile } from '../src/game/save';

const quiet = { toast: () => {}, changed: () => {}, ended: () => {} };
const DRUM_SPOTS = [{ x: 2.6, y: 9.2 }, { x: 5.4, y: 10.4 }, { x: 8.6, y: 10.4 }, { x: 11.4, y: 9.2 }];

function encore(): { run: Run; ctl: WitherLordsController } {
  const profile = freshProfile();
  profile.admin.unlockAll = true;
  const run = new Run(profile, 7, quiet, 3);
  run.startBoss();
  return { run, ctl: run.bossController as WitherLordsController };
}

/** Lets the drums finish playing the pattern. */
function watch(ctl: WitherLordsController) {
  for (let i = 0; i < 200 && ctl.drumMode === 'show'; i++) ctl.update(0.05);
}

describe('The Last Encore: Boom', () => {
  it('ignores the drums until the pattern has played', () => {
    const { ctl } = encore();
    expect(ctl.drumMode).toBe('show');
    const d = DRUM_SPOTS[ctl.pattern[0]];
    expect(ctl.onTap(d.x, d.y)).toBe(true);
    expect(ctl.hits).toBe(0);
  });

  it('stuns Boom when the pattern is played back, and the next pattern is longer', () => {
    const { ctl } = encore();
    const len = ctl.pattern.length;
    expect(len).toBe(3);
    watch(ctl);
    expect(ctl.drumMode).toBe('play');
    expect(ctl.lord.invuln).toBe(Infinity);
    for (const i of ctl.pattern) ctl.onTap(DRUM_SPOTS[i].x, DRUM_SPOTS[i].y);
    expect(ctl.vulnerable).toBeGreaterThan(0);
    expect(ctl.lord.invuln).toBe(0);
    for (let i = 0; i < 200 && ctl.vulnerable > 0; i++) ctl.update(0.05);
    expect(ctl.lord.invuln).toBe(Infinity);
    expect(ctl.pattern.length).toBe(len + 1);
  });

  it('a wrong drum hurts and deals a new pattern', () => {
    const { run, ctl } = encore();
    watch(ctl);
    const wrong = (ctl.pattern[0] + 1) % 4;
    const hp = run.hp;
    ctl.onTap(DRUM_SPOTS[wrong].x, DRUM_SPOTS[wrong].y);
    expect(run.hp).toBeLessThan(hp);
    expect(ctl.drumMode).toBe('show');
    expect(ctl.vulnerable).toBe(0);
  });
});

describe('The Last Encore: Strobe', () => {
  it('blacks out the stage unless you tap the fuse box in time', () => {
    const { run, ctl } = encore();
    watch(ctl);
    for (const i of ctl.pattern) ctl.onTap(DRUM_SPOTS[i].x, DRUM_SPOTS[i].y);
    run.hitMob(run.bossField!, ctl.lord, 1e9, false);
    for (let i = 0; i < 60; i++) ctl.update(0.05);
    expect(ctl.phase).toBe('storm');
    run.profile.admin.godMode = true;
    for (let i = 0; i < 400 && !ctl.fuse; i++) ctl.update(0.05);
    expect(ctl.fuse).not.toBeNull();
    expect(ctl.onTap(ctl.fuse!.x, ctl.fuse!.y)).toBe(true);
    expect(ctl.fuse).toBeNull();
    expect(ctl.dark).toBe(0);
    for (let i = 0; i < 400 && !ctl.fuse; i++) ctl.update(0.05);
    expect(ctl.fuse).not.toBeNull();
    for (let i = 0; i < 60 && ctl.fuse; i++) ctl.update(0.05);
    expect(ctl.dark).toBeGreaterThan(0);
  });
});

/** Kills the current act and waits out the break before the next one. */
function skipAct(run: Run, ctl: WitherLordsController) {
  ctl.lord.invuln = 0;
  run.hitMob(run.bossField!, ctl.lord, 1e9, false);
  for (let i = 0; i < 60; i++) ctl.update(0.05);
}

describe('The Last Encore: Riff and the Maestro', () => {
  it('a fader mixing desk is solved by tapping each fader up to its mark', () => {
    const { run, ctl } = encore();
    skipAct(run, ctl);
    skipAct(run, ctl);
    expect(ctl.phase).toBe('goldor');
    let seed = 7;
    const t = makeTerminal(0, 'faders', () => ((seed = (seed * 9301 + 49297) % 233280) / 233280));
    expect(t.cells.filter((c, i) => c !== t.target![i]).length).toBeGreaterThanOrEqual(3);
    run.terminal = t;
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < FADER_STEPS && run.terminal && t.cells[i] !== t.target![i]; k++) ctl.pressPane(i);
    }
    expect(run.terminal).toBeNull();
    expect(ctl.terminals[0].done).toBe(true);
  });

  it('the Maestro throws notes you can tap away, and ends with fireworks', () => {
    const { run, ctl } = encore();
    run.profile.admin.godMode = true;
    skipAct(run, ctl);
    skipAct(run, ctl);
    skipAct(run, ctl);
    expect(ctl.phase).toBe('necron');
    const f = run.bossField!;
    for (let i = 0; i < 2000 && !f.projectiles.some((p) => p.kind === 'note'); i++) run.update(0.02);
    const note = f.projectiles.find((p) => p.kind === 'note')!;
    expect(note.tappable).toBe(true);
    run.tap(note.x, note.y);
    expect(note.life).toBeLessThanOrEqual(0);
    skipAct(run, ctl);
    expect(f.fx.some((x) => x.kind === 'firework')).toBe(true);
  });
});
