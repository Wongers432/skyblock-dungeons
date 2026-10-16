import { FLOORS } from '../data/floors';
import { HYPERION_RECIPE, ITEMS, RARITY_COLOR, SCROLLS, SLOTS, isGear, type ItemStats } from '../data/items';
import {
  MAX_ITEM_LEVEL, baseHit, cataLevel, computeStats, findItem, itemAbility, itemStats, salvageValue, upgradeCost, xpForLevel,
} from '../game/progression';
import { exportProfile, freshProfile, importProfile, newItem, saveProfile, type ItemInstance, type Profile } from '../game/save';
import { h } from './dom';
import { rngRequired } from '../game/score';
import { fmtTime } from './dom';

type Tab = 'dungeons' | 'rng' | 'gear' | 'admin' | 'save';

export interface HubActions {
  play(floorId: number): void;
  replaceProfile(p: Profile): void;
}

const STAT_LABEL: Record<keyof ItemStats, string> = {
  damage: 'Damage', strength: 'Strength', critChance: 'Crit Chance', critDamage: 'Crit Damage',
  health: 'Health', defense: 'Defense', intelligence: 'Intelligence',
};

export class Hub {
  private tab: Tab = 'dungeons';
  private openItem: string | null = null;
  private el: HTMLElement | null = null;
  private scrollTop = 0;

  constructor(private root: HTMLElement, private profile: () => Profile, private actions: HubActions) {}

  show() {
    this.render();
  }

  hide() {
    this.el?.remove();
    this.el = null;
  }

  private commit() {
    saveProfile(this.profile());
    this.render();
  }

  private render() {
    if (this.el) this.scrollTop = this.el.scrollTop;
    this.el?.remove();
    const p = this.profile();
    const cata = cataLevel(p.cataXp);
    const tabs: [Tab, string][] = [['dungeons', 'Dungeons'], ['rng', 'RNG Meter'], ['gear', 'Gear'], ['save', 'Settings']];
    if (p.admin.enabled) tabs.push(['admin', 'Admin']);
    this.el = h('div', { class: 'hub' },
      h('h1', {}, 'SkyBlock Dungeons'),
      h('div', { class: 'sub' }, 'Solo Catacombs. Clear rooms, find secrets, beat the boss, grind the drops.'),
      h('div', { class: 'card' },
        h('div', { class: 'row spread' },
          h('b', {}, `Catacombs Level ${cata.level}`),
          h('span', { class: 'muted' }, cata.need ? `${cata.into.toLocaleString()} / ${cata.need.toLocaleString()} XP` : 'MAX'),
        ),
        h('div', { class: 'bar', style: { marginTop: '6px' } }, h('div', { style: { width: `${cata.need ? (100 * cata.into) / cata.need : 100}%` } })),
        h('div', { class: 'row', style: { marginTop: '8px' } },
          h('span', { class: 'pill' }, `Undead Essence: ${p.essence.undead.toLocaleString()}`),
          h('span', { class: 'pill' }, `Wither Essence: ${p.essence.wither.toLocaleString()}`),
          h('span', { class: 'pill' }, `+${cata.level * 3}% dungeon stats`),
        ),
      ),
      h('div', { class: 'tabs' }, tabs.map(([id, name]) =>
        h('button', { class: this.tab === id ? 'active' : '', onclick: () => { this.tab = id; this.scrollTop = 0; this.render(); } }, name))),
      this.tab === 'dungeons' ? this.dungeons(p, cata.level)
        : this.tab === 'rng' ? this.rngMeter(p)
        : this.tab === 'gear' ? this.gear(p)
        : this.tab === 'admin' ? this.admin(p)
        : this.save(p),
    );
    this.root.append(this.el);
    this.el.scrollTop = this.scrollTop;
  }

  private dungeons(p: Profile, level: number) {
    return h('div', {}, FLOORS.map((f) => {
      const best = p.best[String(f.id)];
      const unlocked = p.admin.unlockAll || level >= f.reqLevel;
      return h('div', { class: 'card' },
        h('div', { class: 'row spread' },
          h('div', {},
            h('h3', {}, `${f.name}: ${f.boss}`),
            h('div', { class: 'muted' }, `Requires Catacombs ${f.reqLevel}  ·  ${f.cols}x${f.rows} map  ·  ${f.xp} base XP`),
            best ? h('div', { class: 'muted' }, 'Best: ', h('span', { class: 'grade' }, `${best.grade} (${best.score})`), ` in ${fmtTime(best.time)}  ·  ${p.completions[String(f.id)] ?? 0} clears`) : null,
          ),
          !f.implemented
            ? h('button', { disabled: true }, 'Coming soon')
            : h('button', { class: 'primary', disabled: !unlocked, onclick: () => this.actions.play(f.id) }, unlocked ? 'Play' : 'Locked'),
        ),
      );
    }));
  }

  private rngMeter(p: Profile) {
    const pct = (x: number) => (x >= 0.01 ? `${+(x * 100).toFixed(1)}%` : `${+(x * 100).toFixed(2)}%`);
    return h('div', {},
      h('div', { class: 'card' },
        h('h3', {}, 'RNG Meter'),
        h('div', { class: 'muted' }, 'Pick one drop per floor. Every win adds its score to that floor\'s meter, and the fuller it is the better your odds (up to 3x). When it fills, the drop is guaranteed. If the item drops on its own, the meter resets.'),
      ),
      FLOORS.filter((f) => f.drops.length).map((f) => {
        const meter = p.rng[String(f.id)] ?? { target: null, xp: 0 };
        const target = f.drops.find((d) => d.item === meter.target);
        const owned = (id: string) => p.items.filter((i) => i.id === id).length;
        const unlocked = (p.completions[String(f.id)] ?? 0) > 0;
        return h('div', { class: 'card' + (unlocked ? '' : ' locked') },
          h('div', { class: 'row spread' },
            h('h3', {}, `${f.name} · ${f.boss}`),
            !f.implemented ? h('span', { class: 'pill' }, 'Coming soon') : null,
          ),
          !unlocked
            ? h('div', { class: 'rng-locked' }, '🔒 Complete this floor to unlock RNG meter')
            : target
            ? h('div', { style: { margin: '6px 0 10px' } },
              h('div', { class: 'row spread' },
                h('b', { style: { color: RARITY_COLOR[ITEMS[target.item].rarity] } }, ITEMS[target.item].name),
                h('span', { class: 'muted' }, `${meter.xp.toLocaleString()} / ${rngRequired(target).toLocaleString()}`),
              ),
              h('div', { class: 'bar rng', style: { marginTop: '4px' } }, h('div', { style: { width: `${Math.min(100, (100 * meter.xp) / rngRequired(target))}%` } })),
              h('div', { class: 'muted', style: { marginTop: '4px' } },
                `Guaranteed in about ${Math.max(1, Math.ceil((rngRequired(target) - meter.xp) / 300))} more S+ runs. Drop chance now ${pct(Math.min(1, target.chance.bedrock * (1 + 2 * meter.xp / rngRequired(target))))} at S+.`),
            )
            : h('div', { class: 'muted', style: { margin: '6px 0 10px' } }, 'No target selected. Tap a drop below.'),
          h('div', { class: 'rng-list' }, f.drops.map((d) => {
            const it = ITEMS[d.item];
            const selected = meter.target === d.item;
            return h('button', {
              class: 'rng-item' + (selected ? ' selected' : ''),
              disabled: !unlocked,
              onclick: () => {
                if (selected || !unlocked) return;
                if (meter.xp > 0 && !confirm(`Switch target to ${it.name}? Your meter progress (${meter.xp}) carries over.`)) return;
                p.rng[String(f.id)] = { target: d.item, xp: meter.xp };
                this.commit();
              },
            },
              h('span', { style: { color: RARITY_COLOR[it.rarity], fontWeight: 'bold' } }, it.name),
              h('span', { class: 'muted' }, `S+ ${pct(d.chance.bedrock)} · S ${pct(d.chance.obsidian)} · A ${pct(d.chance.emerald)}`),
              h('span', { class: 'muted' }, `Meter: ${rngRequired(d).toLocaleString()} score${owned(d.item) ? ` · owned ×${owned(d.item)}` : ''}`),
            );
          })),
        );
      }),
    );
  }

  private gear(p: Profile) {
    const s = computeStats(p);
    const equippedIds = new Set(Object.values(p.equipped));
    const statsCard = h('div', { class: 'card' },
      h('h3', {}, 'Your stats in dungeons'),
      h('div', { class: 'stats' },
        h('div', {}, `❤ Health: ${s.maxHp}`),
        h('div', {}, `❈ Defense: ${s.defense}`),
        h('div', {}, `❁ Strength: ${s.strength}`),
        h('div', {}, `☣ Crit Chance: ${s.critChance}%`),
        h('div', {}, `☠ Crit Damage: ${s.critDamage}%`),
        h('div', {}, `✎ Intelligence: ${s.intelligence}`),
        h('div', {}, `⚔ Hit: ${Math.round(baseHit(s))}`),
        h('div', {}, `✦ Mana: ${s.maxMana}`),
      ),
    );
    const slots = h('div', { class: 'card' }, h('h3', {}, 'Equipped'),
      SLOTS.map((slot) => {
        const inst = findItem(p, p.equipped[slot]);
        return h('div', { class: 'row spread', style: { margin: '4px 0' } },
          h('span', { class: 'muted' }, slot[0].toUpperCase() + slot.slice(1)),
          inst ? this.itemLabel(inst) : h('span', { class: 'muted' }, 'empty'));
      }));
    // Scrolls and materials stack into one card per kind.
    const seen = new Set<string>();
    const shown = p.items.filter((i) => {
      if (isGear(ITEMS[i.id])) return true;
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
    const sorted = shown.sort((a, b) => Number(equippedIds.has(b.uid)) - Number(equippedIds.has(a.uid)) || ITEMS[a.id].kind.localeCompare(ITEMS[b.id].kind));
    const inv = h('div', {}, h('h3', { style: { margin: '12px 0 6px' } }, `Items (${p.items.length})`), sorted.map((inst) => this.itemCard(p, inst, equippedIds.has(inst.uid))));
    return h('div', {}, statsCard, slots, this.crafting(p), inv);
  }

  private crafting(p: Profile) {
    const r = HYPERION_RECIPE;
    const count = (id: string) => p.items.filter((i) => i.id === id).length;
    const handle = count(r.handle), cats = count(r.catalyst);
    const ok = handle >= 1 && cats >= r.catalysts && p.essence.wither >= r.essence;
    const line = (have: number, need: number, name: string) =>
      h('div', { style: { color: have >= need ? '#55ff55' : '#ff7777' } }, `${have >= need ? '✔' : '✖'} ${name} ${Math.min(have, need).toLocaleString()}/${need.toLocaleString()}`);
    return h('div', { class: 'card' },
      h('h3', {}, 'Crafting'),
      h('div', { class: 'row spread' }, h('b', { style: { color: RARITY_COLOR.LEGENDARY } }, 'Hyperion'), h('span', { class: 'muted' }, 'Floor VII')),
      line(handle, 1, "Necron's Handle"),
      line(cats, r.catalysts, 'Wither Catalysts'),
      line(p.essence.wither, r.essence, 'Wither Essence'),
      h('div', { class: 'muted', style: { marginTop: '4px' } }, 'Then apply the Implosion, Shadow Warp and Wither Shield scrolls to unlock Wither Impact.'),
      h('button', { class: 'small primary', style: { marginTop: '6px' }, disabled: !ok, onclick: () => {
        let catLeft = r.catalysts;
        let handleLeft = 1;
        p.items = p.items.filter((i) => {
          if (i.id === r.handle && handleLeft > 0) { handleLeft--; return false; }
          if (i.id === r.catalyst && catLeft > 0) { catLeft--; return false; }
          return true;
        });
        p.essence.wither -= r.essence;
        newItem(p, 'hyperion');
        alert('You crafted the Hyperion!');
        this.commit();
      } }, 'Craft Hyperion'),
    );
  }

  private itemLabel(inst: ItemInstance) {
    const def = ITEMS[inst.id];
    return h('span', { class: 'item-name', style: { color: RARITY_COLOR[def.rarity] } }, `${def.name}${isGear(def) ? ` [Lv${inst.level}]` : ''}`);
  }

  private itemCard(p: Profile, inst: ItemInstance, equipped: boolean) {
    const def = ITEMS[inst.id];
    const open = this.openItem === inst.uid;
    const cost = upgradeCost(inst.level);
    const ess = p.essence[def.essence];
    const ability = itemAbility(inst);
    const body: (HTMLElement | null)[] = [];
    if (open) {
      const st = itemStats(inst);
      body.push(h('div', { class: 'stats', style: { marginTop: '6px' } },
        (Object.keys(st) as (keyof ItemStats)[]).map((k) => h('div', {}, `${STAT_LABEL[k]}: +${st[k]}${k === 'critChance' || k === 'critDamage' ? '%' : ''}`))));
      if (ability) body.push(h('div', { class: 'ability' }, `Ability: ${ability.name} (${ability.mana} mana) – ${ability.desc}`));
      if (def.passive) body.push(h('div', { class: 'ability' }, def.passive));
      if (inst.id === 'hyperion') {
        const applied = inst.scrolls ?? [];
        body.push(h('div', { class: 'muted', style: { marginTop: '4px' } }, `Scrolls: ${applied.length ? applied.map((s) => ITEMS[s].name).join(', ') : 'none'}`));
        for (const sid of SCROLLS) {
          if (applied.includes(sid)) continue;
          const owned = p.items.find((i) => i.id === sid);
          if (owned) {
            body.push(h('button', { class: 'small', style: { marginTop: '4px' }, onclick: () => {
              inst.scrolls = [...applied, sid];
              p.items = p.items.filter((i) => i !== owned);
              this.commit();
            } }, `Apply ${ITEMS[sid].name}`));
          }
        }
      }
      const buttons = h('div', { class: 'row', style: { marginTop: '8px' } });
      if (isGear(def)) {
        buttons.append(h('button', { class: 'small', disabled: equipped, onclick: () => { p.equipped[def.kind as keyof Profile['equipped']] = inst.uid; this.commit(); } }, equipped ? 'Equipped' : 'Equip'));
        buttons.append(h('button', {
          class: 'small primary',
          disabled: inst.level >= MAX_ITEM_LEVEL || ess < cost,
          onclick: () => { p.essence[def.essence] -= cost; inst.level++; this.commit(); },
        }, inst.level >= MAX_ITEM_LEVEL ? 'Max level' : `Upgrade (${cost} ${def.essence})`));
      }
      buttons.append(h('button', {
        class: 'small danger', disabled: equipped,
        onclick: () => {
          if (!confirm(`Salvage ${def.name} for ${salvageValue(inst)} ${def.essence} essence?`)) return;
          p.essence[def.essence] += salvageValue(inst);
          p.items = p.items.filter((i) => i !== inst);
          this.openItem = null;
          this.commit();
        },
      }, `Salvage (+${salvageValue(inst)})`));
      body.push(buttons);
    }
    return h('div', { class: 'card', onclick: () => { this.openItem = open ? null : inst.uid; this.render(); } },
      h('div', { class: 'row spread' }, this.itemLabel(inst), h('span', { class: 'muted' }, equipped ? 'equipped' : isGear(def) ? def.kind : `${def.kind} ×${p.items.filter((i) => i.id === inst.id).length}`)),
      ...body);
  }

  private admin(p: Profile) {
    const spawn = (id: string) => { newItem(p, id); this.commit(); };
    return h('div', {},
      h('div', { class: 'card' },
        h('h3', {}, 'Admin tools (temporary)'),
        h('div', { class: 'muted' }, 'For testing only. Turn this tab off in Save when you are done.'),
      ),
      h('div', { class: 'card' }, h('h3', {}, 'Spawn items'),
        h('div', { class: 'row' }, Object.values(ITEMS).map((d) =>
          h('button', { class: 'small', style: { color: RARITY_COLOR[d.rarity] }, onclick: () => spawn(d.id) }, d.name)))),
      h('div', { class: 'card' }, h('h3', {}, 'Resources'),
        h('div', { class: 'row' },
          h('button', { class: 'small', onclick: () => { p.essence.undead += 1000; this.commit(); } }, '+1000 Undead Essence'),
          h('button', { class: 'small', onclick: () => { p.essence.wither += 1000; this.commit(); } }, '+1000 Wither Essence'),
          h('button', { class: 'small', onclick: () => { p.cataXp += 500; this.commit(); } }, '+500 Catacombs XP'),
          h('button', { class: 'small', onclick: () => { p.cataXp = xpForLevel(24); this.commit(); } }, 'Set Catacombs 24'),
          h('button', { class: 'small', onclick: () => { p.cataXp = 0; this.commit(); } }, 'Reset Catacombs XP'),
        )),
      h('div', { class: 'card' }, h('h3', {}, 'Cheats'),
        h('div', { class: 'row' },
          h('button', { class: 'small' + (p.admin.godMode ? ' primary' : ''), onclick: () => { p.admin.godMode = !p.admin.godMode; this.commit(); } }, `God mode: ${p.admin.godMode ? 'ON' : 'off'}`),
          h('button', { class: 'small' + (p.admin.unlockAll ? ' primary' : ''), onclick: () => { p.admin.unlockAll = !p.admin.unlockAll; this.commit(); } }, `Unlock all floors: ${p.admin.unlockAll ? 'ON' : 'off'}`),
        )),
    );
  }

  private save(p: Profile) {
    const area = h('textarea', { placeholder: 'Paste a save code here to load it' }) as HTMLTextAreaElement;
    const code = exportProfile(p);
    return h('div', {},
      h('div', { class: 'card' },
        h('h3', {}, 'Back up your save'),
        h('div', { class: 'muted' }, 'Your progress is stored on this device. Copy this code somewhere safe (Notes works) to restore it later.'),
        h('textarea', { readonly: true }, code),
        h('button', { class: 'small', onclick: async () => {
          try { await navigator.clipboard.writeText(code); alert('Save code copied.'); } catch { alert('Copy failed: select the text and copy it manually.'); }
        } }, 'Copy save code'),
      ),
      h('div', { class: 'card' },
        h('h3', {}, 'Restore a save'),
        area,
        h('button', { class: 'small primary', onclick: () => {
          try {
            const np = importProfile(area.value);
            if (!confirm('Replace your current progress with this save?')) return;
            this.actions.replaceProfile(np);
            this.render();
          } catch { alert("That doesn't look like a save code."); }
        } }, 'Load save code'),
      ),
      h('div', { class: 'card' },
        h('h3', {}, 'Settings'),
        h('div', { class: 'row', style: { marginBottom: '8px' } },
          h('button', { class: 'small' + (p.settings.puzzleGlow ? ' primary' : ''), onclick: () => { p.settings.puzzleGlow = !p.settings.puzzleGlow; this.commit(); } }, `Puzzle glow: ${p.settings.puzzleGlow ? 'ON' : 'off'}`),
          h('span', { class: 'muted' }, 'Highlights the right answer in puzzles (Tic Tac Toe, Three Weirdos, Higher or Lower and more). You can also toggle it from the pause menu.'),
        ),
        h('div', { class: 'row' },
          h('button', { class: 'small', onclick: () => { p.admin.enabled = !p.admin.enabled; if (!p.admin.enabled && this.tab === 'admin') this.tab = 'dungeons'; this.commit(); } }, `Admin tab: ${p.admin.enabled ? 'ON' : 'off'}`),
          h('button', { class: 'small danger', onclick: () => {
            if (!confirm('Delete ALL progress and start over?')) return;
            this.actions.replaceProfile(freshProfile());
            this.render();
          } }, 'Reset all progress'),
        ),
      ),
    );
  }
}
