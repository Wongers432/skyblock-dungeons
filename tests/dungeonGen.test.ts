import { describe, expect, it } from 'vitest';
import { generateDungeon, doorTiles } from '../src/game/dungeonGen';
import { FLOORS } from '../src/data/floors';
import { CELL, LAYOUTS } from '../src/data/layouts';

describe('dungeon generator', () => {
  for (const floor of FLOORS) {
    it(`builds valid dungeons for ${floor.name}`, () => {
      for (let seed = 1; seed <= 150; seed++) {
        const d = generateDungeon(floor, seed);
        // Every cell belongs to a room.
        for (const row of d.grid) for (const id of row) expect(id).toBeGreaterThanOrEqual(0);
        // Tree: rooms - 1 doors, all rooms connected.
        expect(d.doors.length).toBe(d.rooms.length - 1);
        const adj = new Map<number, number[]>();
        for (const door of d.doors) {
          adj.set(door.a, [...(adj.get(door.a) ?? []), door.b]);
          adj.set(door.b, [...(adj.get(door.b) ?? []), door.a]);
        }
        const seen = new Set([d.entrance]);
        const q = [d.entrance];
        while (q.length) for (const n of adj.get(q.shift()!) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
        expect(seen.size).toBe(d.rooms.length);
        // Exactly one blood door, the configured number of wither doors, and a key for each.
        expect(d.doors.filter((x) => x.type === 'blood').length).toBe(1);
        const wither = d.doors.filter((x) => x.type === 'wither').length;
        expect(wither).toBeGreaterThanOrEqual(1);
        expect(d.rooms.filter((r) => r.key === 'wither').length).toBe(wither);
        expect(d.rooms.filter((r) => r.key === 'blood').length).toBe(1);
        expect(d.rooms.filter((r) => r.type === 'puzzle').length).toBe(floor.puzzles);
        // The blood rush is a chain of wither doors from entrance to blood through the fairy room.
        const parent = new Map<number, number>();
        const bq = [d.entrance];
        const bs = new Set(bq);
        while (bq.length) { const c = bq.shift()!; for (const n of adj.get(c) ?? []) if (!bs.has(n)) { bs.add(n); parent.set(n, c); bq.push(n); } }
        const chain = [d.blood];
        while (chain[0] !== d.entrance) chain.unshift(parent.get(chain[0])!);
        const fi = chain.findIndex((id) => d.rooms[id].type === 'fairy');
        expect(fi).toBeGreaterThan(1);
        expect(Math.abs(fi - (chain.length - 1 - fi))).toBeLessThanOrEqual(2);
        const doorBetween = (a: number, b: number) => d.doors.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))!;
        for (let j = 1; j < chain.length - 2; j++) {
          expect(doorBetween(chain[j], chain[j + 1]).type).toBe(j === fi ? 'normal' : 'wither');
        }
        expect(d.doors.filter((x) => x.type === 'wither').length).toBe(chain.length - 4);
        // Blood rush: every locked door has its key in one of the two rooms it joins.
        for (const door of d.doors.filter((x) => x.type !== 'normal')) {
          expect([d.rooms[door.a].key, d.rooms[door.b].key]).toContain(door.type);
        }
        // Keys are reachable in order: simulate opening doors greedily.
        let keys = 0, bloodKey = false;
        const open = new Set<number>(d.doors.filter((x) => x.type === 'normal').map((x) => x.id));
        const visited = new Set<number>([d.entrance]);
        for (let guard = 0; guard < 200; guard++) {
          let progress = false;
          for (const door of d.doors) {
            const inA = visited.has(door.a), inB = visited.has(door.b);
            if (inA === inB) continue;
            if (!open.has(door.id)) {
              if (door.type === 'wither' && keys > 0) { keys--; open.add(door.id); }
              else if (door.type === 'blood' && bloodKey) open.add(door.id);
              else continue;
            }
            const next = inA ? door.b : door.a;
            visited.add(next);
            if (d.rooms[next].key === 'wither') keys++;
            if (d.rooms[next].key === 'blood') bloodKey = true;
            progress = true;
          }
          if (!progress) break;
        }
        expect(visited.has(d.blood)).toBe(true);
        // Door tiles are floor.
        for (const door of d.doors) for (const id of [door.a, door.b]) {
          const room = d.rooms[id];
          for (const t of doorTiles(room, door).tiles) expect(room.tiles[t.y][t.x]).toBe('.');
        }
      }
    });
  }

  it('layouts have the right sizes', () => {
    for (const l of LAYOUTS['1x1']) { expect(l.length).toBe(CELL); l.forEach((r) => expect(r.length).toBe(CELL)); }
    for (const l of LAYOUTS['1x2']) { expect(l.length).toBe(CELL * 2); l.forEach((r) => expect(r.length).toBe(CELL)); }
    for (const l of [...LAYOUTS['2x2'], ...LAYOUTS.L]) { expect(l.length).toBe(CELL * 2); l.forEach((r) => expect(r.length).toBe(CELL * 2)); }
  });
});
