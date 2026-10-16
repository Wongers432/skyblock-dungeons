import { ITEMS } from '../data/items';
import { MOBS, floorById, type FloorDef } from '../data/floors';
import { generateDungeon, doorTiles, type DoorPlan, type DungeonPlan, type Pt, type RoomPlan } from './dungeonGen';
import { Field, makeMob, type Mob } from './field';
import { Rng } from './rng';
import { baseHit, cataLevel, computeStats, damageTaken, type PlayerStats } from './progression';
import { newItem, saveProfile, type Profile } from './save';
import { computeScore, rollLoot, runXp, type Loot, type ScoreResult } from './score';
import { makeBlaze, makeWeirdos, type Mark, type WeirdosPuzzle } from './puzzles';
import { BlazeController, BloodController, BonzoController, type Controller } from './controllers';

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
  secretEssence: number;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  newBest: boolean;
}

export interface RunEvents {
  toast: (msg: string, color?: string) => void;
  changed: () => void;
  ended: (end: RunEnd) => void;
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

  hp: number;
  mana: number;
  shield = 0;
  shieldTime = 0;
  attackCd = 0;
  abilityCd = 0;
  aiming = false;
  maskUsed = false;
  witherKeys = 0;
  bloodKey = false;
  time = 0;
  secretsFound = 0;
  secretEssence = 0;
  crypts = 0;
  puzzlesFailed = 0;
  ended: RunEnd | null = null;
  private endTimer = -1;

  constructor(readonly profile: Profile, floorId: number, readonly events: RunEvents, seed = Date.now() % 1e9) {
    this.floor = floorById(floorId);
    this.rng = new Rng(seed ^ 0x5bd1e995);
    this.plan = generateDungeon(this.floor, seed);
    this.stats = computeStats(profile);
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
      return this.witherKeys > 0 ? { ok: true, unlock: lock } : { ok: false, reason: 'This Wither Door needs a Wither Key.' };
    }
    return this.bloodKey ? { ok: true, unlock: lock } : { ok: false, reason: 'The Blood Door needs the Blood Key.' };
  }

  tapRoom(room: RoomRT) {
    const check = this.canEnter(room);
    if (!check.ok) {
      if (check.reason) this.events.toast(check.reason, '#ff5555');
      return;
    }
    if (check.unlock) {
      this.openDoors.add(check.unlock.id);
      if (check.unlock.type === 'wither') {
        this.witherKeys--;
        this.events.toast('Opened the Wither Door!', '#aaaaaa');
      } else {
        this.events.toast('The BLOOD DOOR has been opened!', '#ff5555');
      }
    }
    this.enterRoom(room);
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
        this.events.toast(`Welcome to the Catacombs, ${this.floor.name}!`, '#55ff55');
        break;
      case 'fairy':
        room.cleared = true;
        break;
      case 'normal':
        for (const p of room.plan.mobSpawns) {
          const def = MOBS[this.rng.pick(this.floor.mobPool)];
          f.mobs.push(makeMob(def, p.x, p.y, this.floor.mobHpMult, this.floor.mobDmgMult));
        }
        if (!f.mobs.length) this.clearRoom(room);
        break;
      case 'blood':
        room.controller = new BloodController(this, room);
        this.events.toast('The Watcher: Things are getting exciting!', '#ff5555');
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
      this.events.toast(room.secrets.length ? `Room cleared! ${room.secrets.length} secret${room.secrets.length > 1 ? 's' : ''} here.` : 'Room cleared!', '#55ff55');
      if (room.key) {
        const spot = room.field.randomFloor(() => this.rng.next(), room.field.player, 1.5);
        room.key.x = spot.x;
        room.key.y = spot.y;
        room.key.spawned = true;
        this.events.toast(room.plan.key === 'blood' ? 'A Blood Key appeared!' : 'A Wither Key appeared!', room.plan.key === 'blood' ? '#ff5555' : '#aaaaaa');
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
    const s = this.stats;
    this.hp = Math.min(s.maxHp, this.hp + s.maxHp * 0.02 * dt);
    this.mana = Math.min(s.maxMana, this.mana + s.maxMana * 0.03 * dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    if (this.shieldTime > 0) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) {
        this.hp = Math.min(s.maxHp, this.hp + this.shield * 0.5);
        this.shield = 0;
      }
    }
    const f = this.field;
    if (!f) return;
    this.controller?.update(dt);
    this.updateMobs(f, dt);
    this.updateProjectiles(f, dt);
    for (const fx of f.fx) fx.t += dt;
    f.fx = f.fx.filter((x) => x.t < x.life);
    if (this.view === 'room' && this.current) {
      for (const sec of this.current.secrets) sec.phase += dt;
      const room = this.current;
      if (room.plan.type === 'normal' && !room.cleared && f.mobs.every((m) => m.dead || m.crypt)) this.clearRoom(room);
    }
  }

  private updateMobs(f: Field, dt: number) {
    const p = f.player;
    for (const m of f.mobs) {
      if (m.dead) continue;
      m.flash = Math.max(0, m.flash - dt);
      if (m.invuln) m.invuln = Math.max(0, m.invuln - dt);
      if (m.stun > 0) { m.stun -= dt; continue; }
      if (m.puzzle || m.boss) continue;
      const dist = Math.hypot(p.x - m.x, p.y - m.y);
      const range = m.def.range ?? 0.85;
      m.atk -= dt;
      if (dist > range) {
        const dir = f.stepToward(m.x, m.y);
        m.x += dir.x * m.def.speed * dt;
        m.y += dir.y * m.def.speed * dt;
      } else if (m.atk <= 0) {
        m.atk = m.def.attackCooldown;
        if (m.def.range) {
          const len = dist || 1;
          f.projectiles.push({ x: m.x, y: m.y, vx: ((p.x - m.x) / len) * 7, vy: ((p.y - m.y) / len) * 7, damage: m.damage, kind: 'arrow', tappable: false, life: 3 });
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

  private updateProjectiles(f: Field, dt: number) {
    const p = f.player;
    for (const pr of f.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (Math.hypot(pr.x - p.x, pr.y - p.y) < 0.45) {
        pr.life = 0;
        this.damagePlayer(pr.damage);
        if (pr.kind === 'balloon') f.ring(pr.x, pr.y, 1, '#ff5555');
      }
    }
    f.projectiles = f.projectiles.filter((pr) => pr.life > 0);
    for (const s of f.shots) {
      if (!s.target || s.target.dead) s.target = this.rng.pick(f.aliveMobs().filter((m) => !m.puzzle)) ?? null;
      s.life -= dt;
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

  damagePlayer(raw: number) {
    if (this.ended || this.profile.admin.godMode) return;
    let dmg = damageTaken(raw, this.stats.defense);
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
    }
    this.hp -= dmg;
    if (this.hp <= 0) {
      if (this.stats.hasBonzoMask && !this.maskUsed) {
        this.maskUsed = true;
        this.hp = this.stats.maxHp * 0.3;
        this.events.toast("Your Bonzo's Mask saved your life!", '#ffaa00');
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
    const dmg = Math.max(1, Math.round(amount));
    m.hp -= dmg;
    m.flash = 0.12;
    f.text(m.x, m.y - 0.8, crit ? `✧${dmg.toLocaleString()}✧` : dmg.toLocaleString(), color ?? (crit ? '#ffcc33' : '#ffffff'));
    if (m.hp <= 0) this.killMob(f, m);
  }

  private killMob(f: Field, m: Mob) {
    m.hp = 0;
    m.dead = true;
    f.fx.push({ kind: 'puff', x: m.x, y: m.y, t: 0, life: 0.4, color: '#cccccc' });
    if (m.crypt) {
      this.crypts++;
      if (this.crypts <= 5) this.events.toast(`Crypt cleared! (${this.crypts}/5 bonus)`, '#55ffff');
    }
    this.controller?.onMobDeath?.(m);
  }

  private explode(f: Field, x: number, y: number, r: number, dmg: number, color: string) {
    f.ring(x, y, r, color);
    for (const m of f.aliveMobs()) {
      if (Math.hypot(m.x - x, m.y - y) <= r + m.scale * 0.4) this.hitMob(f, m, dmg, false, color);
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
    this.abilityCd = ab.cooldown;
    const magic = baseHit(this.stats) * ab.power * (1 + this.stats.intelligence / 250);
    switch (ab.id) {
      case 'guided_bat':
        for (let i = 0; i < 6; i++) f.shots.push({ x: f.player.x, y: f.player.y, target: null, damage: magic, radius: ab.radius, life: 3 });
        break;
      case 'wither_scrolls': {
        const scrolls = this.stats.weapon?.scrolls ?? [];
        if (scrolls.includes('scroll_shadow_warp')) {
          for (const m of f.aliveMobs()) if (Math.hypot(m.x - x, m.y - y) <= ab.radius && !m.boss) m.stun = 2;
        }
        if (scrolls.includes('scroll_wither_shield')) {
          this.shield = this.stats.maxHp * 0.5;
          this.shieldTime = 5;
        }
        this.explode(f, x, y, ab.radius, magic, '#cc66ff');
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
    const near = (px: number, py: number, r: number) => Math.hypot(px - x, py - y) <= r;

    for (const pr of f.projectiles) {
      if (pr.tappable && near(pr.x, pr.y, 0.75)) {
        pr.life = 0;
        f.fx.push({ kind: 'puff', x: pr.x, y: pr.y, t: 0, life: 0.3, color: '#ff8888' });
        return;
      }
    }
    const room = this.view === 'room' ? this.current : null;
    if (room?.key?.spawned && !room.key.taken && near(room.key.x, room.key.y, 0.9)) {
      room.key.taken = true;
      if (room.plan.key === 'blood') {
        this.bloodKey = true;
        this.events.toast('You picked up the BLOOD KEY!', '#ff5555');
      } else {
        this.witherKeys++;
        this.events.toast('You picked up a WITHER KEY!', '#aaaaaa');
      }
      this.events.changed();
      return;
    }
    let target: Mob | null = null;
    let best = 0.85;
    for (const m of f.aliveMobs()) {
      if (m.puzzle) continue;
      const d = Math.hypot(m.x - x, m.y - 0.3 * m.scale - y) - (m.boss ? 0.6 : 0);
      if (d < best) { best = d; target = m; }
    }
    if (target) {
      if (this.attackCd > 0) return;
      this.attackCd = this.stats.attackCooldown;
      const crit = this.rng.chance(this.stats.critChance / 100);
      this.hitMob(f, target, baseHit(this.stats) * (crit ? 1 + this.stats.critDamage / 100 : 1), crit);
      return;
    }
    if (room) {
      if (room.cleared) {
        for (const s of room.secrets) {
          if (s.found) continue;
          const sp = secretPos(s);
          if (near(sp.x, sp.y, 0.8)) {
            s.found = true;
            this.secretsFound++;
            const ess = this.rng.int(1, 3);
            this.secretEssence += ess;
            f.text(sp.x, sp.y - 0.5, `SECRET! +${ess} essence`, '#55ffff');
            this.events.changed();
            return;
          }
        }
      }
      for (const c of room.crypts) {
        if (!c.opened && near(c.x, c.y, 0.8)) {
          c.opened = true;
          f.mobs.push(makeMob(MOBS.lurker, c.x, c.y + 0.6, this.floor.mobHpMult, this.floor.mobDmgMult, { crypt: true }));
          this.events.toast('A Crypt Lurker rises from the crypt!', '#aa55ff');
          return;
        }
      }
      if (room.plan.type === 'fairy' && !room.fairyUsed && near(4, 4, 1.2)) {
        room.fairyUsed = true;
        this.hp = this.stats.maxHp;
        this.mana = this.stats.maxMana;
        this.events.toast('The Fairy healed you!', '#ff77cc');
        this.events.changed();
      }
    }
  }

  startBoss() {
    this.bossField = new Field(ARENA, 'arena');
    this.bossField.setPlayer({ x: ARENA[0].length / 2, y: ARENA.length - 1.2 });
    this.bossController = new BonzoController(this, this.bossField);
    this.view = 'boss';
    this.aiming = false;
    this.events.toast('Bonzo: Gratz for making it this far, but I\'m basically unbeatable.', '#ff5555');
    this.events.changed();
  }

  /** Ends the run after a short pause so the final hit can be seen. */
  winSoon() {
    if (this.endTimer < 0) this.endTimer = 1.6;
  }

  // ---------- Score and end ----------

  scoreNow(): ScoreResult {
    const total = this.rooms.length;
    const cleared = this.rooms.filter((r) => r.cleared).length;
    const secretsTotal = this.rooms.reduce((s, r) => s + r.secrets.length, 0);
    return computeScore({
      roomsCleared: cleared, roomsTotal: total,
      secretsFound: this.secretsFound, secretsTotal,
      puzzlesFailed: this.puzzlesFailed, crypts: this.crypts,
      seconds: this.time, timeLimit: this.floor.timeLimit,
    });
  }

  get secretsTotal(): number {
    return this.rooms.reduce((s, r) => s + r.secrets.length, 0);
  }

  finish(victory: boolean) {
    if (this.ended) return;
    const blood = this.rooms[this.plan.blood];
    if (victory) blood.cleared = true;
    const score = this.scoreNow();
    const p = this.profile;
    const levelBefore = cataLevel(p.cataXp).level;
    let loot: Loot | undefined;
    let xp = 0;
    let newBest = false;
    p.runs++;
    if (victory) {
      loot = rollLoot(this.floor, score.grade, this.rng);
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
      reason: victory ? `${this.floor.boss} defeated!` : 'You died. The run is over.',
      score, seconds: this.time, loot, secretEssence: victory ? this.secretEssence : 0, xp,
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
    this.events.toast('Admin: +3 Wither Keys and the Blood Key.', '#ffaa00');
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
