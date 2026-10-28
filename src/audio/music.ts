// Plays the soundtrack live: a look-ahead scheduler feeds the compiled songs to the synth a moment early.
import { compileSong, stepTime, type Compiled } from './score';
import { Mixer } from './synth';
import { TRACKS, type TrackKey } from './tracks';

const LOOKAHEAD = 0.15;
const TICK_MS = 30;

const compiled = new Map<TrackKey, Compiled>();
function song(key: TrackKey): Compiled {
  let c = compiled.get(key);
  if (!c) compiled.set(key, (c = compileSong(TRACKS[key])));
  return c;
}

/** One track playing into its own fader, so the old one can fade out while the next starts. */
export class MusicPlayer {
  private out: GainNode;
  private mix: Mixer;
  private c: Compiled;
  private step = 0;
  /** The context time of the current loop's step 0. */
  private loopStart = -1;
  private timer = 0;
  private held = false;

  constructor(private ctx: AudioContext, dest: AudioNode, readonly key: TrackKey, private volume: number) {
    this.c = song(key);
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    const level = ctx.createGain();
    level.gain.value = this.c.song.level ?? 1;
    level.connect(this.out);
    this.mix = new Mixer(ctx, level, (this.c.song.delaySteps ?? 3) * this.c.stepSec);
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  private tick() {
    const ctx = this.ctx;
    // A suspended context (before the first tap on iOS) doesn't advance; start the clock once it runs.
    if (this.held || ctx.state !== 'running') return;
    if (this.loopStart < 0) {
      this.loopStart = ctx.currentTime + 0.05;
      this.out.gain.setValueAtTime(this.volume, ctx.currentTime);
    }
    const c = this.c;
    const horizon = ctx.currentTime + LOOKAHEAD;
    for (;;) {
      const t = this.loopStart + stepTime(c, this.step);
      if (t > horizon) break;
      // Notes that have already slipped past (after a hiccup) are dropped rather than played late in a pile.
      if (t >= ctx.currentTime - 0.02) {
        for (const e of c.byStep[this.step]) this.mix.note(e.inst, c.song.insts[e.inst], e.midi, e.vel, t, e.len * c.stepSec);
      }
      this.step++;
      if (this.step >= c.totalSteps) {
        this.step = 0;
        this.loopStart += c.totalSteps * c.stepSec;
      }
    }
  }

  /** Pauses where it is (pause menu, app in the background) and later carries on from the same spot. */
  hold(on: boolean) {
    if (on === this.held) return;
    this.held = on;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    if (on) {
      this.out.gain.setTargetAtTime(0, now, 0.03);
    } else if (this.loopStart >= 0) {
      // Shift the loop's clock so the next step lands just after now.
      this.loopStart = now + 0.05 - stepTime(this.c, this.step);
      this.out.gain.setTargetAtTime(this.volume, now, 0.03);
    }
  }

  /** Fades out and shuts down. */
  stop(fadeSeconds: number) {
    clearInterval(this.timer);
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    window.setTimeout(() => this.out.disconnect(), (fadeSeconds + 0.5) * 1000);
  }
}
