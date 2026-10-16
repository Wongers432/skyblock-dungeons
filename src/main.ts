import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { loadProfile, saveProfile, type Profile } from './game/save';
import { Run } from './game/run';
import { drawField, screenToField, type Rect, type Xform } from './render/fieldView';
import { drawMap, roomAt, type MapXform } from './render/mapView';
import { Hub } from './ui/hub';
import { RunUi } from './ui/runUi';

registerSW({ immediate: true });

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const ui = document.getElementById('ui')!;

let profile: Profile = loadProfile();
let run: Run | null = null;
let runUi: RunUi | null = null;
let paused = false;
let lastFloor = 1;

let fieldXf: Xform | null = null;
let mapXf: MapXform | null = null;
let miniRect: Rect | null = null;

const hub = new Hub(ui, () => profile, {
  play: (floorId) => startRun(floorId),
  replaceProfile: (p) => { profile = p; saveProfile(p); },
});

function startRun(floorId: number) {
  lastFloor = floorId;
  hub.hide();
  runUi?.destroy();
  paused = false;
  run = new Run(profile, floorId, {
    toast: (m, c) => runUi?.toast(m, c),
    changed: () => runUi?.refresh(),
    ended: (end) => runUi?.showResults(end),
  });
  runUi = new RunUi(ui, run, {
    setPaused: (p) => { paused = p; },
    playAgain: () => startRun(lastFloor),
    toHub: () => toHub(),
  });
  runUi.toast(`Welcome to the Catacombs, ${run.floor.name}! Tap a room to begin.`, '#55ff55');
}

function toHub() {
  runUi?.destroy();
  runUi = null;
  run = null;
  hub.show();
}

// ---------- Layout ----------

let W = 0, H = 0, safeTop = 0, safeBottom = 0;
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
document.body.append(probe);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(probe);
  safeTop = parseFloat(cs.paddingTop) || 0;
  safeBottom = parseFloat(cs.paddingBottom) || 0;
}
window.addEventListener('resize', resize);
resize();

function playArea(): Rect {
  const top = 40 + safeTop;
  const bottom = 84 + safeBottom;
  return { x: 6, y: top, w: W - 12, h: H - top - bottom };
}

// ---------- Drawing ----------

function draw(time: number) {
  ctx.fillStyle = '#0b0a0e';
  ctx.fillRect(0, 0, W, H);
  if (!run) return;
  // Faint warm glow behind the play area.
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bg.addColorStop(0, run.view === 'boss' ? '#1d1424' : '#17151c');
  bg.addColorStop(1, '#070609');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const area = playArea();
  fieldXf = null;
  mapXf = null;
  miniRect = null;
  if (run.view === 'map') {
    mapXf = drawMap(ctx, run, { x: area.x + 8, y: area.y + 8, w: area.w - 16, h: area.h - 16 }, time);
    return;
  }
  const f = run.field;
  if (!f) return;
  let fieldArea = area;
  if (run.view === 'room') {
    const size = Math.round(Math.min(W, H) * 0.3);
    if (W > H) {
      miniRect = { x: area.x + area.w - size, y: area.y, w: size, h: size };
      fieldArea = { ...area, w: area.w - size - 6 };
    } else {
      miniRect = { x: area.x + area.w - size, y: area.y, w: size, h: size };
      fieldArea = { ...area, y: area.y + size + 6, h: area.h - size - 6 };
    }
  }
  // Screen shake on big hits. Input mapping uses the unshaken transform.
  const shake = run.shake > 0 ? run.shake * 30 : 0;
  ctx.save();
  if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  fieldXf = drawField(ctx, run, f, fieldArea, time);
  ctx.restore();
  if (miniRect) {
    ctx.fillStyle = 'rgba(8,7,10,0.85)';
    ctx.fillRect(miniRect.x, miniRect.y, miniRect.w, miniRect.h);
    ctx.strokeStyle = '#8a6a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(miniRect.x + 1, miniRect.y + 1, miniRect.w - 2, miniRect.h - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeRect(miniRect.x + 3, miniRect.y + 3, miniRect.w - 6, miniRect.h - 6);
    drawMap(ctx, run, { x: miniRect.x + 4, y: miniRect.y + 4, w: miniRect.w - 8, h: miniRect.h - 8 }, time, true);
  }
}

// ---------- Input ----------

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!run || paused || run.ended) return;
  const x = e.clientX, y = e.clientY;
  if (run.view === 'map' && mapXf) {
    const room = roomAt(run, mapXf, x, y);
    if (room && run.isVisible(room)) run.tapRoom(room);
    return;
  }
  if (miniRect && x >= miniRect.x && y >= miniRect.y && x <= miniRect.x + miniRect.w && y <= miniRect.y + miniRect.h) {
    run.goToMap();
    return;
  }
  if (fieldXf) {
    const p = screenToField(fieldXf, x, y);
    run.tap(p.x, p.y);
    swipeFrom = { id: e.pointerId, x: p.x, y: p.y };
  }
});

// Dragging a finger across the field slashes mobs with swipe weapons (Livid Dagger).
let swipeFrom: { id: number; x: number; y: number } | null = null;
canvas.addEventListener('pointermove', (e) => {
  if (!swipeFrom || swipeFrom.id !== e.pointerId || !run || paused || !fieldXf) return;
  const p = screenToField(fieldXf, e.clientX, e.clientY);
  if (!run.drag(p.x, p.y)) run.swipe(swipeFrom.x, swipeFrom.y, p.x, p.y);
  swipeFrom = { id: e.pointerId, x: p.x, y: p.y };
});
const endSwipe = (e: PointerEvent) => {
  if (swipeFrom && swipeFrom.id === e.pointerId && run && fieldXf) {
    const p = screenToField(fieldXf, e.clientX, e.clientY);
    run.release(p.x, p.y);
  }
  swipeFrom = null;
};
canvas.addEventListener('pointerup', endSwipe);
canvas.addEventListener('pointercancel', endSwipe);
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------- Loop ----------

let prev = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  if (run && !paused && !run.ended && !document.hidden) run.update(dt);
  if (run) {
    draw(now / 1000);
    runUi?.update();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && run && !run.ended) runUi?.showPause();
});

hub.show();

// Test hook used by the automated playtest script.
(window as unknown as { __dbg: unknown }).__dbg = { run: () => run, profile: () => profile, start: startRun, setPaused: (p: boolean) => { paused = p; } };
