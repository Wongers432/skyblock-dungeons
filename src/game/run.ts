import { SadanController, WitherLordsController, type Terminal } from './bosses67';
import { ITEMS } from '../data/items';
import { MOBS, baseFloor, floorById, type FloorDef } from '../data/floors';
import { generateDungeon, doorTiles, type DoorPlan, type DungeonPlan, type Pt, type RoomPlan } from './dungeonGen';
import { Field, makeMob, setHpRule, type Mob } from './field';
import { DragonController } from './dragons';
import { Rng } from './rng';
import type { Sfx } from '../audio/sound';
import { baseHit, cataLevel, computeStats, damageTaken, levelPower, type PlayerStats } from './progression';
import { newItem, saveProfile, type Profile } from './save';
import { applyRngMeter, computeScore, rollLoot, runXp, type Loot, type RngResult, type ScoreResult } from './score';
import { tutorialDungeon } from './tutorial';
import { makeBlaze, makeWeirdos, type Mark, type WeirdosPuzzle } from './puzzles';
import { BlazeController, BloodController, BonzoController, LividController, ProfessorController, ScarfController, ThornController, type Controller } from './controllers';

export type View = 'map' | 'room' | 'boss';

export interface Secret { x: number; y: number; kind: 'chest' | 'essence' | 'bat'; found: boolean; phase: number }
export interface Crypt { x: number; y: number; opened: boolean }

export type PuzzleState =
  | { kind: 'tictactoe'; board: Mark[]; done: boolean; result?: 'win' | 'draw' | 'loss' }
  | { kind: 'weirdos'; data: WeirdosPuzzle; done: boolean; chosen?: number }
  | { kind: 'blaze'; done: boolean };

export interface RoomRT {
  plan: RoomPlan;
  field: Field;
  visited: boolean;
  cleared: boolean;
  started: boolean;
  secrets: Secret[];
  crypts: Crypt[];
  key?: { x: number; y: number; spawned: boolean; taken: boolean };
  puzzle?: PuzzleState;
  puzzleFailed?: boolean;
  controller?: Controller;
  fairyUsed?: boolean;
}

export interface RunEnd {
  victory: boolean;
  reason: string;
  score: ScoreResult;
  seconds: number;
  loot?: Loot;
  rng?: RngResult;
  secretEssence: number;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  newBest: boolean;
}

export interface RunEvents {
  toast: (msg: string, color?: string) => void;
  /** A big centre-screen announcement (S score reached!). */
  banner?: (msg: string, kind: 's' | 'splus') => void;
  changed: () => void;
  ended: (end: RunEnd) => void;
  /** A short sound effect. */
  sfx?: (kind: Sfx) => void;
}

export class Run {
  readonly floor: FloorDef;
  readonly plan: DungeonPlan;
  readonly rooms: RoomRT[];
  readonly rng: Rng;
  readonly stats: PlayerStats;
  openDoors = new Set<number>();
  view: View = 'map';
  current: RoomRT | null = null;
  bossField: Field | null = null;
  bossController: Controller | null = null;
  /** Goldor's terminal currently open on screen (Floor VII). */
  terminal: Terminal | null = null;

  hp: number;
  mana: number;
  shield = 0;
  shieldTime = 0;
  attackCd = 0;
  /** A mob tap that arrived during the weapon cooldown; it fires as soon as the weapon is ready. */
  private queuedHit: { mob: Mob; t: number } | null = null;
  /** Weapon swing animation timer and which way the player faces (read by the renderer). */
  swing = 0;
  faceLeft = false;
  abilityCd = 0;
  aiming = false;
  maskUsed = false;
  /** Screen effects read by the renderer: purple flash, red hurt flash, shake. */
  flash = 0;
  hurt = 0;
  shake = 0;
  private gradeCheck = 0;
  private gradesShown = new Set<string>();
  /** Seconds of blindness (from hitting a fake Livid). */
  blind = 0;
  witherKeys = 0;
  bloodKey = false;
  time = 0;
  secretsFound = 0;
  secretEssence = 0;
  crypts = 0;
  puzzlesFailed = 0;
  ended: RunEnd | null = null;
  private endTimer = -1;
  private conjureTime = 0;
  private conjureTick = 0;
  private conjureDamage = 0;
  private lastSwipeHit = new Map<number, number>();
  /** Damage dealt and taken multipliers from your Catacombs level on this floor. */
  power = { dealt: 1, taken: 1 };

  constructor(readonly profile: Profile, floorId: number, readonly events: RunEvents, seed = Date.now() % 1e9) {
    this.floor = floorById(floorId);
    setHpRule(this.floor.hpRule ?? null);
    this.rng = new Rng(seed ^ 0x5bd1e995);
    this.plan = this.floor.tutorial ? tutorialDungeon(this.floor, seed) : generateDungeon(this.floor, seed);
    this.stats = computeStats(profile);
    this.power = levelPower(this.floor, this.stats.cataLevel);
    this.hp = this.stats.maxHp;
    this.mana = this.stats.maxMana;
    for (const d of this.plan.doors) if (d.type === 'normal') this.openDoors.add(d.id);
    this.rooms = this.plan.rooms.map((plan) => this.makeRoom(plan));
    this.enterRoom(this.rooms[this.plan.entrance]);
    this.view = 'map';
  }

  private makeRoom(plan: RoomPlan): RoomRT {
    const theme = plan.type === 'blood' ? 'blood' : plan.type === 'fairy' ? 'fairy' : 'floor';
    const rt: RoomRT = {
      plan,
      field: new Field(plan.tiles, theme),
      visited: false,
      cleared: false,
      started: false,
      secrets: plan.secrets.map((p) => ({ ...p, kind: this.rng.pick(['chest', 'essence', 'bat'] as const), found: false, phase: this.rng.next() * 6 })),
      crypts: plan.crypts.map((p) => ({ ...p, opened: false })),
    };
    rt.field.style = plan.style;
    rt.field.stands = plan.secrets;
    rt.field.keepClear = plan.crypts;
    if (plan.key) rt.key = { x: plan.bw * 4, y: plan.bh * 4, spawned: false, taken: false };
    if (plan.puzzle === 'tictactoe') rt.puzzle = { kind: 'tictactoe', board: Array(9).fill(null), done: false };
    if (plan.puzzle === 'weirdos') rt.puzzle = { kind: 'weirdos', data: makeWeirdos(this.rng), done: false };
    if (plan.puzzle === 'blaze') rt.puzzle = { kind: 'blaze', done: false };
    return rt;
  }

  // ---------- Map and doors ----------

  doorsOf(room: RoomRT): DoorPlan[] {
    return this.plan.doors.filter((d) => d.a === room.plan.id || d.b === room.plan.id);
  }

  private other(d: DoorPlan, id: number): RoomRT {
    return this.rooms[d.a === id ? d.b : d.a];
  }

  isVisible(room: RoomRT): boolean {
    return room.visited || this.doorsOf(room).some((d) => this.other(d, room.plan.id).visited);
  }

  canEnter(room: RoomRT): { ok: boolean; reason?: string; unlock?: DoorPlan } {
    if (this.view === 'boss' || this.ended) return { ok: false };
    if (room.visited) return { ok: true };
    const links = this.doorsOf(room).filter((d) => this.other(d, room.plan.id).visited);
    if (!links.length) return { ok: false };
    if (links.some((d) => this.openDoors.has(d.id))) return { ok: true };
    const lock = links[0];
    if (lock.type === 'wither') {
      return this.witherKeys > 0 ? { ok: true, unlock: lock } : { ok: false, reason: 'This Rune Door needs a Rune Key.' };
    }
    return this.bloodKey ? { ok: true, unlock: lock } : { ok: false, reason: 'The Gate Door needs the Gate Key.' };
  }

  tapRoom(room: RoomRT) {
    const check = this.canEnter(room);
    if (!check.ok) {
      if (check.reason) this.events.toast(check.reason, '#ff5555');
      return;
    }
    if (check.unlock) this.unlock(check.unlock);
    this.enterRoom(room);
  }

  private unlock(d: DoorPlan) {
    this.openDoors.add(d.id);
    this.events.sfx?.('door');
    if (d.type === 'wither') {
      this.witherKeys--;
      this.events.toast('Opened the Rune Door!', '#aaaaaa');
    } else {
      this.events.toast('The GATE DOOR has been opened!', '#ff5555');
    }
  }

  /** Where a door of a room is drawn, in that room's tiles (the gap in the outer wall). */
  doorSpot(room: RoomRT, d: DoorPlan): Pt {
    const { tiles, dir } = doorTiles(room.plan, d);
    const dx = dir.x, dy = dir.y;
    const cx = (tiles[0].x + tiles[1].x) / 2 + 0.5, cy = (tiles[0].y + tiles[1].y) / 2 + 0.5;
    return { x: cx + dx * 0.7, y: cy + dy * 0.7 };
  }

  /** The room on the other side of one of the current room's doors. */
  through(d: DoorPlan): RoomRT | null {
    return this.current ? this.other(d, this.current.plan.id) : null;
  }

  /** Walk through a door of the current room, unlocking it with a key if needed. */
  useDoor(d: DoorPlan) {
    const next = this.through(d);
    if (!next || this.view !== 'room') return;
    if (!this.openDoors.has(d.id)) {
      if (d.type === 'wither' && this.witherKeys <= 0) return this.events.toast('This Rune Door needs a Rune Key.', '#ff5555');
      if (d.type === 'blood' && !this.bloodKey) return this.events.toast('The Gate Door needs the Gate Key.', '#ff5555');
      this.unlock(d);
    }
    this.enterRoom(next);
  }

  private enterRoom(room: RoomRT) {
    const from = this.current;
    const link = this.doorsOf(room).find((d) => from && this.other(d, room.plan.id) === from && this.openDoors.has(d.id))
      ?? this.doorsOf(room).find((d) => this.other(d, room.plan.id).visited && this.openDoors.has(d.id));
    if (room.plan.type === 'entrance' && !room.visited) {
      room.field.setPlayer({ x: 4, y: 4 });
    } else if (link) {
      room.field.setPlayer(doorTiles(room.plan, link).stand);
    }
    this.current = room;
    this.view = 'room';
    this.aiming = false;
    if (!room.visited) {
      room.visited = true;
      this.startRoom(room);
    }
    this.events.changed();
  }

  goToMap() {
    if (this.view !== 'room') return;
    this.view = 'map';
    this.aiming = false;
    this.events.changed();
  }

  private startRoom(room: RoomRT) {
    room.started = true;
    const f = room.field;
    switch (room.plan.type) {
      case 'entrance':
        room.cleared = true;
        if (!this.floor.tutorial) this.events.toast(`Welcome to Hollowdeep, ${this.floor.name}!`, '#55ff55');
        break;
      case 'fairy':
        room.cleared = true;
        break;
      case 'normal':
        for (const p of room.plan.mobSpawns) {
          const def = MOBS[this.rng.pick(this.floor.mobPool)];
          f.mobs.push(makeMob(def, p.x, p.y, this.floor.mobHpMult, this.floor.mobDmgMult, { aggro: false }));
        }
        if (!f.mobs.length) this.clearRoom(room);
        break;
      case 'blood':
        room.controller = new BloodController(this, room);
        this.events.toast('The Gatekeeper: Places, everyone! We have a visitor!', '#ff5555');
        break;
      case 'puzzle':
        if (room.puzzle?.kind === 'blaze') room.controller = new BlazeController(this, room, makeBlaze(this.rng));
        break;
    }
  }

  clearRoom(room: RoomRT) {
    if (room.cleared) return;
    room.cleared = true;
    if (room.plan.type === 'normal') {
      this.events.sfx?.('roomClear');
      this.events.toast(room.secrets.length ? `Room cleared! ${room.secrets.length} secret${room.secrets.length > 1 ? 's' : ''} here.` : 'Room cleared!', '#55ff55');
      if (room.key) {
        const spot = room.field.randomFloor(() => this.rng.next(), room.field.player, 1.5);
        room.key.x = spot.x;
        room.key.y = spot.y;
        room.key.spawned = true;
        this.events.toast(room.plan.key === 'blood' ? 'A Gate Key appeared!' : 'A Rune Key appeared!', room.plan.key === 'blood' ? '#ff5555' : '#aaaaaa');
      }
    }
    this.events.changed();
  }

  solvePuzzle(room: RoomRT, success: boolean) {
    if (room.cleared) return;
    if (!success) {
      room.puzzleFailed = true;
      this.puzzlesFailed++;
      this.events.toast('PUZZLE FAIL! Your score went down.', '#ff5555');
    } else {
      this.events.toast('PUZZLE SOLVED!', '#55ff55');
      this.secretEssence += 2;
    }
    if (room.puzzle) room.puzzle.done = true;
    room.cleared = true;
    this.events.changed();
  }

  // ---------- Combat ----------

  get field(): Field | null {
    if (this.view === 'boss') return this.bossField;
    if (this.view === 'room') return this.current?.field ?? null;
    return null;
  }

  get controller(): Controller | null {
    if (this.view === 'boss') return this.bossController;
    if (this.view === 'room') return this.current?.controller ?? null;
    return null;
  }

  update(dt: number) {
    if (this.ended) return;
    if (this.endTimer >= 0) {
      this.endTimer -= dt;
      if (this.endTimer < 0) this.finish(true);
    }
    this.time += dt;
    this.gradeCheck -= dt;
    if (this.gradeCheck <= 0 && !this.floor.tutorial) {
      this.gradeCheck = 0.5;
      const g = this.scoreNow().grade;
      if ((g === 'S' || g === 'S+') && !this.gradesShown.has(g)) {
        if (g === 'S+') this.gradesShown.add('S');
        this.gradesShown.add(g);
        this.events.banner?.(g === 'S+' ? 'S+ SCORE REACHED!' : 'S SCORE REACHED!', g === 'S+' ? 'splus' : 's');
      }
    }
    const s = this.stats;
    this.hp = Math.min(s.maxHp, this.hp + s.maxHp * 0.02 * dt);
    this.mana = Math.min(s.maxMana, this.mana + s.maxMana * 0.03 * dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.swing = Math.max(0, this.swing - dt);
    if (this.queuedHit) {
      this.queuedHit.t -= dt;
      const q = this.queuedHit;
      if (q.t <= 0 || q.mob.dead || this.field?.mobs.indexOf(q.mob) === -1) this.queuedHit = null;
      else if (this.attackCd <= 0 && this.field) {
        this.queuedHit = null;
        this.attackMob(this.field, q.mob);
      }
    }
    this.flash = Math.max(0, this.flash - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.blind = Math.max(0, this.blind - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    if (this.shieldTime > 0) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) {
        this.hp = Math.min(s.maxHp, this.hp + this.shield * 0.5);
        this.shield = 0;
      }
    }
    const f = this.field;
    if (f && this.conjureTime > 0) {
      this.conjureTime -= dt;
      this.conjureTick -= dt;
      if (this.conjureTick <= 0) {
        this.conjureTick = 0.4;
        this.explode(f, f.player.x, f.player.y, this.stats.ability?.radius ?? 2.4, this.conjureDamage, '#9fd8ff');
      }
    }
    // Every room keeps running while you're somewhere else: mobs keep walking, projectiles keep
    // flying and the Watcher keeps spawning. Only the field you're standing in can hurt you.
    if (this.view === 'boss' && this.bossField) this.updateField(this.bossField, this.bossController, dt, true);
    for (const room of this.rooms) {
      if (!room.started) continue;
      this.updateField(room.field, room.controller ?? null, dt, room.field === f);
      if (room.plan.type === 'normal' && !room.cleared && room.field.mobs.every((m) => m.dead || m.crypt)) this.clearRoom(room);
    }
    if (this.view === 'room' && this.current) {
      for (const sec of this.current.secrets) sec.phase += dt;
    }
  }

  private updateField(f: Field, controller: Controller | null, dt: number, present: boolean) {
    controller?.update(dt);
    this.updateMobs(f, dt, present);
    this.updateProjectiles(f, dt, present);
    for (const fx of f.fx) fx.t += dt;
    f.fx = f.fx.filter((x) => x.t < x.life);
  }

  /** The controller that runs a field (a room's puzzle or the Watcher, or the boss). */
  private controllerOf(f: Field): Controller | null {
    if (f === this.bossField) return this.bossController;
    return this.rooms.find((r) => r.field === f)?.controller ?? null;
  }

  private updateMobs(f: Field, dt: number, present: boolean) {
    const p = f.player;
    for (const m of f.mobs) {
      if (m.dead) continue;
      m.flash = Math.max(0, m.flash - dt);
      if (m.invuln) m.invuln = Math.max(0, m.invuln - dt);
      if (m.stun > 0) { m.stun -= dt; continue; }
      if (m.puzzle || m.boss) continue;
      const dist = Math.hypot(p.x - m.x, p.y - m.y);
      if (!m.aggro) {
        // Sleeping mobs in a room you've left stay asleep until you come back.
        if (!present || dist > AGGRO_RANGE && m.hp >= m.maxHp) continue;
        // Waking one mob wakes its neighbours too.
        for (const o of f.mobs) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 2.5) o.aggro = true;
        m.aggro = true;
      }
      const range = m.def.range ?? 0.85;
      if (m.def.id === 'assassin') {
        m.tp = (m.tp ?? 2) - dt;
        if (m.tp <= 0 && dist > 1.5) {
          m.tp = 4;
          f.fx.push({ kind: 'puff', x: m.x, y: m.y, t: 0, life: 0.4, color: '#552266' });
          const ang = this.rng.next() * Math.PI * 2;
          const nx = p.x + Math.cos(ang) * 0.9, ny = p.y + Math.sin(ang) * 0.9;
          if (f.passable(Math.floor(nx), Math.floor(ny))) { m.x = nx; m.y = ny; }
        }
      }
      m.atk -= dt;
      if (dist > range) {
        const dir = f.stepToward(m.x, m.y);
        m.x += dir.x * m.def.speed * dt;
        m.y += dir.y * m.def.speed * dt;
      } else if (m.atk <= 0 && present) {
        m.atk = m.def.attackCooldown;
        if (m.def.range) {
          this.shoot(f, m.x, m.y, m.def.projectile ?? 'arrow', m.damage);
        } else {
          this.damagePlayer(m.damage);
        }
      }
    }
    // Keep mobs from stacking on one spot.
    const alive = f.aliveMobs();
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 0.7;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d, ny = dy / d;
        if (!a.boss && f.passable(Math.floor(a.x - nx * push), Math.floor(a.y - ny * push))) { a.x -= nx * push; a.y -= ny * push; }
        if (!b.boss && f.passable(Math.floor(b.x + nx * push), Math.floor(b.y + ny * push))) { b.x += nx * push; b.y += ny * push; }
      }
    }
  }

  /** Fires a hostile projectile at the player. Fireballs and skulls can be tapped to destroy them. */
  shoot(f: Field, x: number, y: number, kind: 'arrow' | 'fireball' | 'skull' | 'balloon' | 'boulder' | 'none', damage: number, angleOffset = 0) {
    if (kind === 'none') return;
    const p = f.player;
    const speed = { arrow: 7, fireball: 4.2, skull: 3.6, balloon: 2.8, boulder: 3 }[kind];
    const ang = Math.atan2(p.y - y, p.x - x) + angleOffset;
    f.projectiles.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, damage, kind, tappable: kind !== 'arrow', life: 8 });
  }

  private updateProjectiles(f: Field, dt: number, present: boolean) {
    const p = f.player;
    for (const pr of f.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.x < -1 || pr.y < -1 || pr.x > f.w + 1 || pr.y > f.h + 1) pr.life = 0;
      if (pr.kind === 'rocket') {
        // Rockets blow up where they were aimed; standing in the blast hurts.
        if (pr.life <= 0) {
          this.fireworkFx(f, pr.tx ?? pr.x, pr.ty ?? pr.y, pr.color ?? '#ff5555', pr.boom ?? 1.4);
          if (present && Math.hypot((pr.tx ?? pr.x) - p.x, (pr.ty ?? pr.y) - p.y) < (pr.boom ?? 1.4)) this.damagePlayer(pr.damage);
        }
        continue;
      }
      if (present && Math.hypot(pr.x - p.x, pr.y - p.y) < 0.45) {
        pr.life = 0;
        this.damagePlayer(pr.damage, pr.pierce);
        if (pr.kind === 'balloon') this.fireworkFx(f, pr.x, pr.y, pr.color ?? '#ff5555', 1);
        else if (pr.kind !== 'arrow') f.ring(pr.x, pr.y, 1, pr.kind === 'skull' ? '#555555' : pr.kind === 'boulder' ? '#bba58a' : '#ff5555');
      }
    }
    f.projectiles = f.projectiles.filter((pr) => pr.life > 0);
    for (const s of f.shots) {
      s.life -= dt;
      if (s.kind === 'firework') {
        const dx = s.tx! - s.x, dy = s.ty! - s.y;
        const d = Math.hypot(dx, dy);
        const stepLen = 13 * dt;
        if (d <= stepLen) {
          this.explode(f, s.tx!, s.ty!, s.radius, s.damage, s.color ?? '#ff77aa');
          this.fireworkFx(f, s.tx!, s.ty!, s.color ?? '#ff77aa', s.radius);
          s.life = 0;
        } else {
          s.x += (dx / d) * stepLen;
          s.y += (dy / d) * stepLen;
        }
        continue;
      }
      if (!s.target || s.target.dead) s.target = this.rng.pick(f.aliveMobs().filter((m) => !m.puzzle)) ?? null;
      if (!s.target) { s.life = 0; continue; }
      const dx = s.target.x - s.x, dy = s.target.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.4) {
        this.explode(f, s.x, s.y, s.radius, s.damage, '#88ccff');
        s.life = 0;
      } else {
        s.x += (dx / d) * 9 * dt;
        s.y += (dy / d) * 9 * dt;
      }
    }
    f.shots = f.shots.filter((s) => s.life > 0);
  }

  /** A firework burst: coloured sparks with trails, a flash and a crackle ring. */
  fireworkFx(f: Field, x: number, y: number, color: string, r: number) {
    f.fx.push({ kind: 'firework', x, y, t: 0, life: 0.9, color, r, angle: Math.floor(Math.random() * 1000) });
    this.shake = Math.max(this.shake, 0.08);
  }

  damagePlayer(raw: number, pierce = false) {
    if (this.ended || this.profile.admin.godMode) return;
    let dmg = damageTaken(raw, this.stats.defense) * this.power.taken;
    if (this.shield > 0 && !pierce) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
    }
    this.hp -= dmg;
    this.hurt = 0.3;
    if (dmg > 0) this.events.sfx?.('hurt');
    if (dmg > this.stats.maxHp * 0.08) this.shake = 0.2;
    if (this.hp <= 0) {
      if (this.stats.hasBonzoMask && !this.maskUsed) {
        this.maskUsed = true;
        this.hp = this.stats.maxHp * 0.3;
        this.events.toast("Your Jester's Grin saved your life!", '#ffaa00');
        return;
      }
      this.hp = 0;
      this.finish(false);
    }
  }

  hitMob(f: Field, m: Mob, amount: number, crit: boolean, color?: string) {
    if (m.dead || m.puzzle) return;
    if (m.invuln) {
      f.text(m.x, m.y - 0.8, 'IMMUNE', '#aaaaaa');
      return;
    }
    const dmg = Math.max(1, Math.round(amount * (amount >= 1e9 ? 1 : this.power.dealt) * (1 - m.armor)));
    m.hp -= dmg;
    m.flash = 0.12;
    this.events.sfx?.(crit ? 'crit' : 'hit');
    f.text(m.x, m.y - 0.8, crit ? `✧${dmg.toLocaleString()}✧` : dmg.toLocaleString(), color ?? (crit ? '#ffcc33' : '#ffffff'));
    if (m.hp <= 0) this.killMob(f, m);
  }

  private killMob(f: Field, m: Mob) {
    m.hp = 0;
    m.dead = true;
    this.deathFx(f, m);
    this.events.sfx?.(m.boss ? 'bossDeath' : 'mobDeath');
    if (m.crypt) {
      this.crypts++;
      if (this.crypts <= 5) this.events.toast(`Tomb cleared! (${this.crypts}/5 bonus)`, '#55ffff');
    }
    this.controllerOf(f)?.onMobDeath?.(m);
  }

  /** Death effects: the body tips over and bursts into blocky bits; bosses explode. */
  deathFx(f: Field, m: Mob) {
    f.fx.push({ kind: 'corpse', x: m.x, y: m.y, t: 0, life: 0.6, color: '', sprite: m.sprite, r: m.scale, angle: m.x < f.player.x ? -1 : 1 });
    f.fx.push({ kind: 'burst', x: m.x, y: m.y - 0.3 * m.scale, t: 0, life: 0.8, color: '', sprite: m.sprite, r: m.scale, angle: Math.random() * 1000 });
    if (m.boss) {
      f.fx.push({ kind: 'boom', x: m.x, y: m.y - 0.4 * m.scale, t: 0, life: 1.2, color: '#ffaa33', r: 2.5 * m.scale });
      this.shake = 0.6;
      this.flash = 0.15;
    }
  }

  /** Kills every mob left in a field (boss deaths, phase changes) with their death effects. */
  wipe(f: Field) {
    for (const m of f.aliveMobs()) {
      m.dead = true;
      this.deathFx(f, m);
      this.events.sfx?.(m.boss ? 'bossDeath' : 'mobDeath');
    }
  }

  private explode(f: Field, x: number, y: number, r: number, dmg: number, color: string, crit = false) {
    f.ring(x, y, r, color);
    for (const m of f.aliveMobs()) {
      if (Math.hypot(m.x - x, m.y - y) <= r + m.scale * 0.4) this.hitMob(f, m, dmg, crit, crit ? undefined : color);
    }
    for (const pr of f.projectiles) {
      if (pr.tappable && Math.hypot(pr.x - x, pr.y - y) <= r) pr.life = 0;
    }
  }

  /** Called by the ability button. */
  pressAbility() {
    const ab = this.stats.ability;
    if (!ab || !this.field) return;
    if (this.aiming) { this.aiming = false; this.events.changed(); return; }
    if (this.abilityCd > 0) return this.events.toast('This ability is on cooldown.', '#ff5555');
    if (this.mana < ab.mana) return this.events.toast('Not enough mana!', '#ff5555');
    if (ab.targeting === 'auto') this.cast(this.field.player.x, this.field.player.y);
    else { this.aiming = true; this.events.changed(); }
  }

  private cast(x: number, y: number) {
    const ab = this.stats.ability;
    const f = this.field;
    if (!ab || !f) return;
    this.aiming = false;
    this.mana -= ab.mana;
    this.abilityCd = ab.cooldown * this.stats.cooldownMult;
    const magic = baseHit(this.stats) * ab.power * (1 + this.stats.intelligence / 250);
    switch (ab.id) {
      case 'guided_bat':
        for (let i = 0; i < 6; i++) f.shots.push({ kind: 'bat', x: f.player.x, y: f.player.y, target: null, damage: magic, radius: ab.radius, life: 3 });
        break;
      case 'showtime':
      case 'throw':
        f.shots.push({ kind: 'firework', x: f.player.x, y: f.player.y, target: null, tx: x, ty: y, damage: magic, radius: ab.radius, life: 3, color: ab.id === 'throw' ? '#55ffff' : '#ff55ff' });
        break;
      case 'shadow_fury': {
        const targets = f.aliveMobs().filter((m) => !m.puzzle)
          .sort((a, b) => Math.hypot(a.x - f.player.x, a.y - f.player.y) - Math.hypot(b.x - f.player.x, b.y - f.player.y)).slice(0, 5);
        for (const m of targets) {
          const { dmg, crit } = this.rollHit();
          f.fx.push({ kind: 'ring', x: m.x, y: m.y, t: 0, life: 0.35, r: 1, color: '#8844ff' });
          this.hitMob(f, m, dmg * ab.power, crit, crit ? undefined : '#bb88ff');
        }
        break;
      }
      case 'conjuring':
        this.conjureTime = 4;
        this.conjureTick = 0;
        this.conjureDamage = magic;
        this.events.toast('Bone Ring!', '#9fd8ff');
        break;
      case 'wither_scrolls': {
        const scrolls = this.stats.weapon?.scrolls ?? [];
        // Wither Impact reaches every mob in the room.
        if (scrolls.includes('scroll_shadow_warp')) {
          for (const m of f.aliveMobs()) if (!m.boss) m.stun = 2;
        }
        if (scrolls.includes('scroll_wither_shield')) {
          this.shield = this.stats.maxHp * 0.5;
          this.shieldTime = 5;
        }
        f.ring(f.player.x, f.player.y, Math.max(f.w, f.h), '#cc66ff');
        this.flash = 0.25;
        for (const m of f.aliveMobs()) {
          if (m.puzzle) continue;
          f.ring(m.x, m.y, 1.2, '#cc66ff');
          this.hitMob(f, m, magic, false, '#cc66ff');
        }
        for (const pr of f.projectiles) if (pr.tappable) pr.life = 0;
        break;
      }
      default:
        this.explode(f, x, y, ab.radius, magic, ab.id === 'giants_slam' ? '#ffffff' : '#ff77aa');
    }
    this.events.changed();
  }

  /** A tap on the playfield, in tile coordinates. */
  tap(x: number, y: number) {
    const f = this.field;
    if (!f || this.ended) return;
    if (this.aiming) return this.cast(x, y);
    if (this.controller?.onTap?.(x, y)) return;
    const tapSize = this.profile.settings.tapSize ?? 1;

    const room = this.view === 'room' ? this.current : null;
    // Everything tappable competes; the closest one (relative to its tap size) wins, so a mob
    // standing near a secret no longer steals the tap and vice versa.
    let best: { score: number; act: () => void } | null = null;
    const consider = (px: number, py: number, r: number, act: () => void) => {
      const score = Math.hypot(px - x, py - y) / r;
      if (score <= 1 && (!best || score < best.score)) best = { score, act };
    };
    for (const pr of f.projectiles) {
      if (!pr.tappable) continue;
      consider(pr.x, pr.y, 1.0 * tapSize, () => {
        pr.life = 0;
        if (pr.kind === 'balloon' || pr.kind === 'rocket') {
          this.fireworkFx(f, pr.x, pr.y, pr.color ?? '#ff8888', 0.7);
          f.text(pr.x, pr.y - 0.4, 'POP!', '#ffffff');
          this.events.sfx?.('pop');
        } else f.fx.push({ kind: 'puff', x: pr.x, y: pr.y, t: 0, life: 0.3, color: '#ff8888' });
      });
    }
    if (room?.key?.spawned && !room.key.taken) {
      const key = room.key;
      consider(key.x, key.y, PICKUP_RADIUS * tapSize, () => {
        key.taken = true;
        this.events.sfx?.('key');
        if (room.plan.key === 'blood') {
          this.bloodKey = true;
          this.events.toast('You picked up the GATE KEY!', '#ff5555');
        } else {
          this.witherKeys++;
          this.events.toast('You picked up a RUNE KEY!', '#aaaaaa');
        }
        this.events.changed();
      });
    }
    for (const m of f.aliveMobs()) {
      if (m.puzzle) continue;
      const r = HIT_RADIUS * tapSize + (m.scale - 1) * 0.6;
      consider(m.x, m.y - 0.2 * m.scale, r, () => {
        if (this.attackCd > 0) this.queuedHit = { mob: m, t: 0.4 };
        else this.attackMob(f, m);
      });
    }
    if (room) {
      for (const d of this.doorsOf(room)) {
        const spot = this.doorSpot(room, d);
        consider(spot.x, spot.y, 1.2 * tapSize, () => this.useDoor(d));
      }
      if (room.cleared) {
        for (const s of room.secrets) {
          if (s.found) continue;
          const sp = secretPos(s);
          consider(sp.x, sp.y, PICKUP_RADIUS * tapSize, () => {
            s.found = true;
            this.secretsFound++;
            this.events.sfx?.('secret');
            const ess = this.rng.int(1, 3);
            this.secretEssence += ess;
            f.text(sp.x, sp.y - 0.5, `SECRET! +${ess} essence`, '#55ffff');
            f.fx.push({ kind: 'ring', x: sp.x, y: sp.y, t: 0, life: 0.45, r: 1, color: '#55ffff' });
            this.events.changed();
          });
        }
      }
      for (const c of room.crypts) {
        if (c.opened) continue;
        consider(c.x, c.y, PICKUP_RADIUS * tapSize, () => {
          c.opened = true;
          f.mobs.push(makeMob(MOBS.lurker, c.x, c.y + 0.6, this.floor.mobHpMult, this.floor.mobDmgMult, { crypt: true }));
          this.events.toast('A Crypt Lurker rises from the tomb!', '#aa55ff');
        });
      }
      if (room.plan.type === 'fairy' && !room.fairyUsed) {
        consider(4, 4, 1.5, () => {
          room.fairyUsed = true;
          this.hp = this.stats.maxHp;
          this.mana = this.stats.maxMana;
          this.events.toast('The Wellspring healed you!', '#ff77cc');
          this.events.changed();
        });
      }
    }
    const chosen = best as { score: number; act: () => void } | null;
    if (chosen) return chosen.act();
    // Firework weapons can also be aimed at empty floor.
    if (this.stats.weaponDef?.attack === 'firework' && this.attackCd <= 0 && f.aliveMobs().some((m) => !m.puzzle)) {
      this.attackCd = this.stats.attackCooldown;
      const { dmg, crit } = this.rollHit();
      this.firework(f, x, y, dmg, crit);
    }
  }

  private attackMob(f: Field, target: Mob) {
    this.attackCd = this.stats.attackCooldown;
    this.swing = 0.18;
    this.faceLeft = target.x < f.player.x;
    const wd = this.stats.weaponDef;
    if (wd?.cleave) {
      // A huge cleaving swing: one cut across the whole screen, hitting everything near the target.
      const { dmg, crit } = this.rollHit();
      const ang = Math.atan2(target.y - f.player.y, target.x - f.player.x) + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      f.fx.push({ kind: 'cleave', x: target.x, y: target.y - 0.3 * target.scale, t: 0, life: 0.45, color: '#b04cff', angle: ang });
      this.shake = Math.max(this.shake, 0.18);
      for (const m of f.aliveMobs()) {
        if (m.puzzle) continue;
        if (m === target || Math.hypot(m.x - target.x, m.y - target.y) <= wd.cleave) this.hitMob(f, m, dmg, crit, crit ? '#e0a0ff' : undefined);
      }
      return;
    }
    if (this.stats.weaponDef?.attack !== 'firework') {
      f.fx.push({ kind: 'slash', x: target.x, y: target.y - 0.3 * target.scale, t: 0, life: 0.18, color: '#ffffff', r: 0.6 * Math.max(1, target.scale), angle: Math.random() * Math.PI });
    }
    const { dmg, crit } = this.rollHit();
    if (this.stats.weaponDef?.attack === 'firework') this.firework(f, target.x, target.y, dmg, crit);
    else this.hitMob(f, target, dmg, crit);
  }

  /** Damage of one weapon hit, including crits and the Adaptive Blade passive. */
  private rollHit(): { dmg: number; crit: boolean } {
    const wd = this.stats.weaponDef;
    const crit = !!wd?.alwaysCrit || this.rng.chance(this.stats.critChance / 100);
    let dmg = baseHit(this.stats) * (crit ? 1 + this.stats.critDamage / 100 : 1) * (wd?.hitPower ?? 1);
    if (this.stats.weapon?.id === 'adaptive_blade') dmg *= 1 + 0.5 * (1 - this.hp / this.stats.maxHp);
    return { dmg, crit };
  }

  private firework(f: Field, x: number, y: number, dmg: number, crit: boolean) {
    f.shots.push({
      kind: 'firework', x: f.player.x, y: f.player.y, target: null, tx: x, ty: y, damage: dmg, radius: 1.6, life: 3,
      color: crit ? '#ffcc33' : this.rng.pick(['#ff5555', '#55ff55', '#5599ff', '#ff77ff']),
    });
  }

  /** Finger drag for controllers (sliding Maxor's crystals). Returns true when it was used. */
  drag(x: number, y: number): boolean {
    if (!this.field || this.ended) return false;
    return this.controller?.onDrag?.(x, y) ?? false;
  }

  release(x: number, y: number) {
    if (!this.field || this.ended) return;
    this.controller?.onRelease?.(x, y);
  }

  /** A finger dragged from (x0, y0) to (x1, y1). Swipe weapons slash every mob the line crosses. */
  swipe(x0: number, y0: number, x1: number, y1: number) {
    const f = this.field;
    if (!f || this.ended || this.aiming || !this.stats.weaponDef?.swipe) return;
    const vx = x1 - x0, vy = y1 - y0;
    const len2 = vx * vx + vy * vy || 1;
    for (const m of f.aliveMobs()) {
      if (m.puzzle) continue;
      const my = m.y - 0.3 * m.scale;
      const t = Math.max(0, Math.min(1, ((m.x - x0) * vx + (my - y0) * vy) / len2));
      const d = Math.hypot(x0 + vx * t - m.x, y0 + vy * t - my);
      if (d > 0.75 * Math.max(1, m.scale)) continue;
      const last = this.lastSwipeHit.get(m.id) ?? -1;
      if (this.time - last < 0.3) continue;
      this.lastSwipeHit.set(m.id, this.time);
      const { dmg, crit } = this.rollHit();
      this.hitMob(f, m, dmg * 0.8, crit, crit ? undefined : '#55ffff');
      f.fx.push({ kind: 'puff', x: m.x, y: my, t: 0, life: 0.25, color: '#aaffff' });
    }
  }

  startBoss() {
    // The tutorial ends at the Blood Room portal.
    if (this.floor.tutorial) return this.finish(true);
    this.bossField = new Field(ARENA, 'arena');
    this.bossField.setPlayer({ x: ARENA[0].length / 2, y: ARENA.length - 1.2 });
    const Ctl = { 1: BonzoController, 2: ScarfController, 3: ProfessorController, 4: ThornController, 5: LividController, 6: SadanController, 7: WitherLordsController }[baseFloor(this.floor)] ?? BonzoController;
    this.terminal = null;
    // Walking through the portal restores you for the fight.
    this.hp = this.stats.maxHp;
    this.mana = this.stats.maxMana;
    this.view = 'boss';
    this.aiming = false;
    this.bossController = new Ctl(this, this.bossField);
    this.events.changed();
  }

  /** M7: after Necron falls, the Wither King sends his dragons. */
  startDragons() {
    if (!this.bossField) return;
    this.bossField.projectiles = [];
    this.bossField.mobs = [];
    this.terminal = null;
    this.hp = this.stats.maxHp;
    this.bossController = new DragonController(this, this.bossField);
    this.events.changed();
  }

  /** Ends the run after a short pause so the final hit can be seen. */
  winSoon() {
    if (this.endTimer < 0) this.endTimer = 1.6;
  }

  // ---------- Score and end ----------

  scoreNow(): ScoreResult {
    // The blood room doesn't count, so the score is settled before the boss.
    const scored = this.scoredRooms;
    const total = scored.length;
    const cleared = scored.filter((r) => r.cleared).length;
    const secretsTotal = this.rooms.reduce((s, r) => s + r.secrets.length, 0);
    return computeScore({
      roomsCleared: cleared, roomsTotal: total,
      secretsFound: this.secretsFound, secretsTotal,
      puzzlesFailed: this.puzzlesFailed, crypts: this.crypts,
      seconds: this.time, timeLimit: this.floor.timeLimit,
    });
  }

  /** Rooms that count towards the score: every room but the blood room. */
  get scoredRooms() {
    return this.rooms.filter((r) => r.plan.type !== 'blood');
  }

  get secretsTotal(): number {
    return this.rooms.reduce((s, r) => s + r.secrets.length, 0);
  }

  finish(victory: boolean) {
    if (this.ended) return;
    const score = this.scoreNow();
    const p = this.profile;
    const levelBefore = cataLevel(p.cataXp).level;
    let loot: Loot | undefined;
    let xp = 0;
    let newBest = false;
    let rng: RngResult | undefined;
    p.runs++;
    if (victory && this.floor.tutorial) {
      // A little Catacombs XP the first time only, so the tutorial can't be farmed.
      const key = String(this.floor.id);
      xp = p.completions[key] ? 0 : this.floor.xp;
      p.cataXp += xp;
      p.essence[this.floor.essence.type] += this.secretEssence;
      p.completions[key] = (p.completions[key] ?? 0) + 1;
    } else if (victory) {
      const key0 = String(this.floor.id);
      // The RNG meter only unlocks once this floor has been completed before.
      const meterOn = (p.completions[key0] ?? 0) > 0;
      const meter = meterOn ? (p.rng[key0] ??= { target: null, xp: 0 }) : undefined;
      loot = rollLoot(this.floor, score.grade, this.rng, 1, meter);
      if (meter) rng = applyRngMeter(this.floor, meter, score.total, loot);
      xp = runXp(this.floor, score.total);
      p.cataXp += xp;
      p.essence[this.floor.essence.type] += loot.essence + this.secretEssence;
      for (const id of loot.items) newItem(p, id);
      const key = String(this.floor.id);
      p.completions[key] = (p.completions[key] ?? 0) + 1;
      const prev = p.best[key];
      if (!prev || score.total > prev.score || (score.total === prev.score && this.time < prev.time)) {
        p.best[key] = { score: score.total, grade: score.grade, time: Math.round(this.time) };
        newBest = true;
      }
    }
    saveProfile(p);
    this.ended = {
      victory,
      reason: victory ? (this.floor.tutorial ? 'You cleared the Threshold. You are ready for Depth 1!' : `${this.floor.boss} defeated!`) : 'You died. The run is over.',
      score, seconds: this.time, loot, rng, secretEssence: victory ? this.secretEssence : 0, xp,
      levelBefore, levelAfter: cataLevel(p.cataXp).level, newBest,
    };
    this.events.ended(this.ended);
  }

  // ---------- Admin tools ----------

  adminClearRoom() {
    const f = this.field;
    if (!f) return;
    for (const m of f.aliveMobs()) if (!m.puzzle) this.killMob(f, m);
    if (this.current?.puzzle && !this.current.cleared && this.view === 'room') this.solvePuzzle(this.current, true);
  }

  adminKeys() {
    this.witherKeys += 3;
    this.bloodKey = true;
    this.events.toast('Admin: +3 Rune Keys and the Gate Key.', '#ffaa00');
    this.events.changed();
  }

  adminRevealMap() {
    for (const r of this.rooms) if (r.plan.type !== 'blood') { r.visited = true; if (!r.started) this.startRoom(r); }
    this.events.changed();
  }
}

/** Secrets that are bats flutter around their spot. */
export function secretPos(s: Secret): Pt {
  if (s.kind !== 'bat') return { x: s.x, y: s.y };
  return { x: s.x + Math.cos(s.phase * 1.7) * 0.6, y: s.y + Math.sin(s.phase * 2.3) * 0.4 };
}

/** How far from a mob (in tiles) a tap still counts as hitting it. */
const HIT_RADIUS = 1.0;
/** How far from a secret, key or crypt a tap still picks it up. */
const PICKUP_RADIUS = 1.1;
/** Room mobs start idle and wake up when the player is this close. */
const AGGRO_RANGE = 5.5;

const ARENA = [
  '##..........##',
  '#............#',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '#............#',
  '##..........##',
];

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}
