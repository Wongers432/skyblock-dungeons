import { describe, expect, it } from 'vitest';
import { solveCalibration } from '../src/ui/calibrate';

describe('tap calibration', () => {
  it('cancels a constant offset and ignores a slip', () => {
    const pts = [[50, 100], [200, 100], [350, 100], [50, 400], [200, 400], [350, 400], [50, 700], [200, 700], [350, 700]];
    const samples = pts.map(([tx, ty], i) => ({ tx, ty, x: tx + 8 + (i % 2), y: ty + 14 - (i % 3) }));
    samples[4].x += 150; // a slip
    const c = solveCalibration(samples);
    expect(Math.abs(c.tapOffset.x + 8.5)).toBeLessThan(1.1);
    expect(Math.abs(c.tapOffset.y + 13)).toBeLessThan(1.1);
    expect(c.tapSize).toBeGreaterThanOrEqual(0.85);
    expect(c.tapSize).toBeLessThan(1);
  });
  it('widens tap areas for scattered taps', () => {
    const samples = Array.from({ length: 9 }, (_, i) => ({ tx: 100, ty: 100, x: 100 + (i % 3 - 1) * 30, y: 100 + (Math.floor(i / 3) - 1) * 30 }));
    expect(solveCalibration(samples).tapSize).toBeGreaterThan(1.2);
  });
});
