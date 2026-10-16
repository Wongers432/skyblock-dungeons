import { h } from './dom';

export interface Calibration {
  tapOffset: { x: number; y: number };
  tapSize: number;
}

/** Fractions of the screen where the calibration dots appear. */
const SPOTS: [number, number][] = [
  [0.15, 0.2], [0.5, 0.2], [0.85, 0.2],
  [0.15, 0.5], [0.5, 0.5], [0.85, 0.5],
  [0.15, 0.8], [0.5, 0.8], [0.85, 0.8],
];

/**
 * Works out the correction from where each dot was and where the finger landed.
 * Taps far from the rest (a slip) are ignored.
 */
export function solveCalibration(samples: { tx: number; ty: number; x: number; y: number }[]): Calibration {
  const errs = samples.map((s) => ({ x: s.x - s.tx, y: s.y - s.ty }));
  const mean = (list: { x: number; y: number }[]) => ({
    x: list.reduce((a, e) => a + e.x, 0) / list.length,
    y: list.reduce((a, e) => a + e.y, 0) / list.length,
  });
  let m = mean(errs);
  const kept = errs.filter((e) => Math.hypot(e.x - m.x, e.y - m.y) <= 60);
  if (kept.length >= 3) m = mean(kept);
  const used = kept.length >= 3 ? kept : errs;
  const spread = Math.sqrt(used.reduce((a, e) => a + (e.x - m.x) ** 2 + (e.y - m.y) ** 2, 0) / used.length);
  const tapSize = Math.round(Math.min(1.35, Math.max(0.85, 0.85 + spread / 40)) * 20) / 20;
  return { tapOffset: { x: Math.round(-m.x), y: Math.round(-m.y) }, tapSize };
}

/** Full-screen tap calibration: tap 9 dots, see the result, test it, then save. */
export function openCalibration(current: Calibration, onSave: (c: Calibration) => void) {
  const root = h('div', { class: 'calib' });
  document.body.append(root);
  const close = () => root.remove();

  const runDots = () => {
    root.replaceChildren();
    const order = SPOTS.map((s) => s).sort(() => Math.random() - 0.5);
    const samples: { tx: number; ty: number; x: number; y: number }[] = [];
    const info = h('div', { class: 'calib-info' });
    const dot = h('div', { class: 'calib-dot' });
    const cancel = h('button', { class: 'small calib-cancel', onclick: close }, 'Cancel');
    root.append(info, dot, cancel);
    let target = { x: 0, y: 0 };
    const place = () => {
      const [fx, fy] = order[samples.length];
      target = { x: Math.round(window.innerWidth * fx), y: Math.round(window.innerHeight * fy) };
      dot.style.left = `${target.x}px`;
      dot.style.top = `${target.y}px`;
      dot.classList.remove('hit');
      void dot.offsetWidth;
      info.textContent = `Tap the centre of each dot as you would tap a mob.  ${samples.length + 1}/${order.length}`;
    };
    root.onpointerdown = (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      samples.push({ tx: target.x, ty: target.y, x: e.clientX, y: e.clientY });
      if (navigator.vibrate) navigator.vibrate(10);
      if (samples.length >= order.length) showResult(solveCalibration(samples), samples);
      else place();
    };
    place();
  };

  const showResult = (c: Calibration, samples: { tx: number; ty: number; x: number; y: number }[]) => {
    root.replaceChildren();
    // Each dot with where the tap landed before (red) and after (green) correction.
    for (const s of samples) {
      root.append(
        h('div', { class: 'calib-mark target', style: { left: `${s.tx}px`, top: `${s.ty}px` } }),
        h('div', { class: 'calib-mark raw', style: { left: `${s.x}px`, top: `${s.y}px` } }),
        h('div', { class: 'calib-mark fixed', style: { left: `${s.x + c.tapOffset.x}px`, top: `${s.y + c.tapOffset.y}px` } }),
      );
    }
    const { x, y } = c.tapOffset;
    const dir = (v: number, neg: string, pos: string) => (Math.abs(v) < 2 ? null : `${Math.abs(v)}px ${v > 0 ? pos : neg}`);
    const parts = [dir(x, 'left', 'right'), dir(y, 'up', 'down')].filter(Boolean);
    const probe = h('div', { class: 'calib-mark probe', style: { display: 'none' } });
    const probeRaw = h('div', { class: 'calib-mark raw', style: { display: 'none' } });
    root.append(probeRaw, probe, h('div', { class: 'panel calib-panel' },
      h('h2', {}, 'Calibration done'),
      h('div', {}, parts.length ? `Taps will be moved ${parts.join(' and ')}.` : 'Your taps were already spot on, so no shift is needed.'),
      h('div', {}, `Tap areas: ${Math.round(c.tapSize * 100)}% ${c.tapSize > 1.02 ? '(your taps were a bit spread out)' : c.tapSize < 0.98 ? '(your taps were very precise)' : ''}`),
      h('div', { class: 'muted' }, 'Red: where you tapped. Green: where the game will count it. Tap anywhere to test it.'),
      h('div', { class: 'row', style: { marginTop: '10px', justifyContent: 'center' } },
        h('button', { class: 'small primary', onclick: () => { onSave(c); close(); } }, 'Save'),
        h('button', { class: 'small', onclick: runDots }, 'Try again'),
        h('button', { class: 'small', onclick: close }, 'Cancel'),
      ),
    ));
    root.onpointerdown = (e) => {
      if ((e.target as HTMLElement).closest('.calib-panel')) return;
      probeRaw.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
      probe.style.cssText = `left:${e.clientX + x}px;top:${e.clientY + y}px`;
    };
  };

  // Intro screen.
  const off = current.tapOffset;
  root.append(h('div', { class: 'panel calib-panel' },
    h('h2', {}, 'Tap calibration'),
    h('div', {}, '9 dots will appear one at a time. Tap the centre of each one the way you normally tap in a run. The game then shifts your taps to where you meant and sizes the tap areas to fit how precise you are.'),
    h('div', { class: 'muted', style: { marginTop: '6px' } }, `Current: shift ${off.x}, ${off.y}px, tap areas ${Math.round(current.tapSize * 100)}%`),
    h('div', { class: 'row', style: { marginTop: '10px', justifyContent: 'center' } },
      h('button', { class: 'small primary', onclick: runDots }, 'Start'),
      h('button', { class: 'small', onclick: () => { onSave({ tapOffset: { x: 0, y: 0 }, tapSize: 1 }); close(); } }, 'Reset to default'),
      h('button', { class: 'small', onclick: close }, 'Cancel'),
    ),
  ));
}
