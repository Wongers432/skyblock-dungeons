import { ALL_FLOORS, FLOORS, MASTER_FLOORS, baseFloor, floorById, type FloorDef } from '../data/floors';
import { ESSENCE_NAME, HYPERION_RECIPE, ITEMS, RARITY_COLOR, SCROLLS, SLOTS, isGear, type ItemStats } from '../data/items';
import {
  MAX_CATA, MAX_ITEM_LEVEL, baseHit, cataLevel, levelPower, computeStats, findItem, itemAbility, itemStats, salvageValue, upgradeCost, xpForLevel,
} from '../game/progression';
import { exportProfile, freshProfile, importProfile, newItem, saveProfile, type ItemInstance, type Profile } from '../game/save';
import { openCalibration } from './calibrate';
import { h } from './dom';
import { rngCarryOver, rngRequired, rngStoreCap } from '../game/score';
import { fmtTime } from './dom';

type Tab = 'dungeons' | 'rng' | 'gear' | 'admin';

export interface HubActions {
  play(floorId: number): void;
  replaceProfile(p: Profile): void;
  /** Shown as "Replay tutorial" in the settings menu when provided. */
  replayTutorial?(): void;
}

const STAT_LABEL: Record<keyof ItemStats, string> = {
  damage: 'Damage', strength: 'Strength', critChance: 'Crit Chance', critDamage: 'Crit Damage',
  health: 'Health', defense: 'Defense', intelligence: 'Intelligence',
};

export class Hub {
  private tab: Tab = 'dungeons';
  private master = false;
  private openItem: string | null = null;
  private el: HTMLElement | null = null;
  private scrollTop = 0;
  private settingsOpen = false;
  private settingsScroll = 0;

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
    if (this.el) {
      this.scrollTop = this.el.scrollTop;
      const panel = this.el.querySelector('.settings-panel');
      if (panel) this.settingsScroll = panel.scrollTop;
    }
    this.el?.remove();
    const p = this.profile();
    const cata = cataLevel(p.cataXp);
    const tabs: [Tab, string, string][] = [['dungeons', '⚔', 'Dungeons'], ['rng', '✦', 'Luck Meter'], ['gear', '⛨', 'Gear']];
    if (p.admin.enabled) tabs.push(['admin', '⚒', 'Admin']);
    const settings = this.settingsOpen ? this.settingsMenu(p) : null;
    this.el = h('div', { class: 'hub' },
      h('header', { class: 'hub-top' },
        h('div', {},
          h('h1', {}, 'Hollowdeep'),
          h('div', { class: 'sub' }, 'Delve the living dungeon. Clear rooms, find secrets, beat the Wardens, grind the drops.'),
        ),
        h('button', { class: 'icon-btn', title: 'Settings', 'aria-label': 'Settings', onclick: () => this.openSettings() }, '⚙'),
      ),
      h('div', { class: 'card profile-card' },
        h('div', { class: 'cata-badge', title: 'Delver Rank' }, String(cata.level)),
        h('div', { class: 'profile-main' },
          h('div', { class: 'row spread' },
            h('b', {}, `Delver Rank ${cata.level}`),
            h('span', { class: 'muted' }, cata.need ? `${cata.into.toLocaleString()} / ${cata.need.toLocaleString()} XP` : 'MAX'),
          ),
          h('div', { class: 'bar', style: { marginTop: '6px' } }, h('div', { style: { width: `${cata.need ? (100 * cata.into) / cata.need : 100}%` } })),
          h('div', { class: 'row', style: { marginTop: '8px' } },
            h('span', { class: 'pill undead' }, `☠ ${p.essence.undead.toLocaleString()} Bone`),
            h('span', { class: 'pill wither' }, `✪ ${p.essence.wither.toLocaleString()} Star`),
            h('span', { class: 'pill' }, `+${cata.level * 3}% dungeon stats`),
          ),
        ),
      ),
      this.nextUp(p, cata.level),
      h('nav', { class: 'tabs' }, tabs.map(([id, icon, name]) =>
        h('button', { class: this.tab === id ? 'active' : '', onclick: () => { this.tab = id; this.scrollTop = 0; this.render(); } },
          h('span', { class: 'tab-icon' }, icon), name))),
      this.tab === 'dungeons' ? this.dungeons(p, cata.level)
        : this.tab === 'rng' ? this.rngMeter(p)
        : this.tab === 'gear' ? this.gear(p)
        : this.admin(p),
      settings,
    );
    this.root.append(this.el);
    this.el.scrollTop = this.scrollTop;
    const panel = this.el.querySelector('.settings-panel');
    if (panel) panel.scrollTop = this.settingsScroll;
  }

  private openSettings() {
    this.settingsOpen = true;
    this.settingsScroll = 0;
    this.render();
  }

  private closeSettings() {
    this.settingsOpen = false;
    this.render();
  }

  private unlocked(p: Profile, f: FloorDef, level: number) {
    const needFloor = f.requires ? floorById(f.requires) : null;
    const cleared = !needFloor || (p.completions[String(needFloor.id)] ?? 0) > 0;
    return p.admin.unlockAll || (level >= f.reqLevel && cleared);
  }

  /** The furthest floor the player can play right now, one tap from the top of the screen. */
  private nextUp(p: Profile, level: number) {
    const open = ALL_FLOORS.filter((f) => f.implemented && this.unlocked(p, f, level));
    const f = open.find((x) => !(p.completions[String(x.id)] ?? 0)) ?? open[open.length - 1];
    if (!f) return null;
    const best = p.best[String(f.id)];
    return h('div', { class: 'card next-up' + (f.master ? ' master' : '') },
      this.floorBadge(f),
      h('div', { class: 'next-up-main' },
        h('div', { class: 'eyebrow' }, best ? 'Jump back in' : 'Next up'),
        h('b', {}, `${f.name}: ${f.boss}`),
        h('div', { class: 'muted' }, best ? `Best ${best.grade} (${best.score}) in ${fmtTime(best.time)}` : 'Not cleared yet'),
      ),
      h('button', { class: 'primary play-btn', onclick: () => this.actions.play(f.id) }, '▶ Play'),
    );
  }

  private floorBadge(f: FloorDef) {
    return h('div', { class: 'floor-badge' + (f.master ? ' master' : '') }, `${f.master ? 'N' : 'D'}${baseFloor(f)}`);
  }

  private dungeons(p: Profile, level: number) {
    const list = this.master ? MASTER_FLOORS : FLOORS;
    const toggle = h('div', { class: 'row mode-toggle' },
      h('button', { class: this.master ? '' : 'active', onclick: () => { this.master = false; this.render(); } }, 'Depths'),
      h('button', { class: this.master ? 'active master' : 'master', onclick: () => { this.master = true; this.render(); } }, 'Nightmare Mode'),
    );
    const intro = this.master
      ? h('div', { class: 'card master-intro' }, h('div', {}, 'Nightmare Mode: the same Depths with far tougher mobs and bosses. N7 ends with the Neon Phoenixes and drops the Showstopper.'))
      : null;
    return h('div', {}, toggle, intro, list.map((f) => {
      const best = p.best[String(f.id)];
      const needFloor = f.requires ? floorById(f.requires) : null;
      const unlocked = this.unlocked(p, f, level);
      const clears = p.completions[String(f.id)] ?? 0;
      return h('div', { class: 'card floor-card' + (unlocked && f.implemented ? '' : ' locked') },
        this.floorBadge(f),
        h('div', { class: 'floor-info' },
          h('h3', {}, f.boss, h('span', { class: 'muted floor-name' }, f.name)),
          h('div', { class: 'muted' }, `Requires Delver Rank ${f.reqLevel}${needFloor ? ` and a ${needFloor.name} clear` : ''}  ·  ${f.cols}x${f.rows} map  ·  ${f.xp.toLocaleString()} base XP`),
          (() => {
            // Locked floors only need the requirement line above; the power warning matters once you can play.
            if (!unlocked) return null;
            const pw = levelPower(f, level);
            if (pw.dealt >= 0.999) return f.masteryLevel ? h('div', { class: 'muted' }, `Mastered: full strength at Rank ${f.masteryLevel}`) : null;
            const under = level < f.reqLevel;
            return h('div', { style: { color: under ? '#ff5555' : '#ffaa00', fontSize: '0.85em' } },
              `At Rank ${level}: you deal ${Math.round(pw.dealt * 1000) / 10}% damage and take ${Math.round(pw.taken * 100)}%` +
              (f.masteryLevel ? `. Full strength at Rank ${f.masteryLevel}.` : '.'));
          })(),
          best
            ? h('div', { class: 'row', style: { marginTop: '4px' } },
              h('span', { class: 'pill grade-pill' }, `${best.grade} · ${best.score}`),
              h('span', { class: 'muted' }, `${fmtTime(best.time)}  ·  ${clears} clear${clears === 1 ? '' : 's'}`))
            : null,
        ),
        !f.implemented
          ? h('button', { disabled: true }, 'Coming soon')
          : unlocked
            ? h('button', { class: 'primary play-btn', onclick: () => this.actions.play(f.id) }, '▶ Play')
            : h('button', { class: 'play-btn', disabled: true, 'aria-label': 'Locked' }, '🔒'),
      );
    }));
  }

  private rngMeter(p: Profile) {
    const pct = (x: number) => (x >= 0.01 ? `${+(x * 100).toFixed(1)}%` : `${+(x * 100).toFixed(2)}%`);
    return h('div', {},
      h('div', { class: 'card' },
        h('h3', {}, 'Luck Meter'),
        h('div', { class: 'muted' }, 'Pick one drop per Depth. Every win adds its score to that Depth\'s meter, and the fuller it is the better your odds (up to 3x). When it fills, the drop is guaranteed. If the item drops on its own, the meter resets. Wins with no drop picked still bank their score, ready for when you pick one.'),
      ),
      ALL_FLOORS.filter((f) => f.drops.length).map((f) => {
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
            ? h('div', { class: 'rng-locked' }, '🔒 Complete this Depth to unlock its Luck Meter')
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
            : h('div', { class: 'muted', style: { margin: '6px 0 10px' } },
              meter.xp > 0
                ? `No target selected. ${meter.xp.toLocaleString()} / ${rngStoreCap(f).toLocaleString()} meter XP stored, tap a drop below to use it.`
                : 'No target selected. Wins still store meter XP. Tap a drop below.'),
          h('div', { class: 'rng-list' }, f.drops.map((d) => {
            const it = ITEMS[d.item];
            const selected = meter.target === d.item;
            return h('button', {
              class: 'rng-item' + (selected ? ' selected' : ''),
              disabled: !unlocked,
              onclick: () => {
                if (selected || !unlocked) return;
                const xp = rngCarryOver(meter.xp, d);
                // Picking a first target is free; only ask when progress is on the line.
                if (meter.target && meter.xp > 0 && !confirm(xp < meter.xp
                  ? `Switch target to ${it.name}? Your meter progress (${meter.xp}) is capped at ${xp} for this drop.`
                  : `Switch target to ${it.name}? Your meter progress (${meter.xp}) carries over.`)) return;
                if (!meter.target && xp < meter.xp && !confirm(`Use ${xp} of your ${meter.xp} stored meter XP on ${it.name}? The rest is lost.`)) return;
                p.rng[String(f.id)] = { target: d.item, xp };
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
        s.cooldownMult < 1 ? h('div', {}, `⌛ Ability Cooldowns: -${Math.round((1 - s.cooldownMult) * 100)}%`) : null,
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
      h('div', { class: 'row spread' }, h('b', { style: { color: RARITY_COLOR.LEGENDARY } }, 'Crescendo'), h('span', { class: 'muted' }, 'Depth 7')),
      line(handle, 1, "Maestro's Hilt"),
      line(cats, r.catalysts, 'Resonance Crystals'),
      line(p.essence.wither, r.essence, 'Star Essence'),
      h('div', { class: 'muted', style: { marginTop: '4px' } }, 'Then apply the Big Finish, Stage Dive and Standing Ovation sheet music to unlock Encore Strike.'),
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
        alert('You crafted the Crescendo!');
        this.commit();
      } }, 'Craft Crescendo'),
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
        }, inst.level >= MAX_ITEM_LEVEL ? 'Max level' : `Upgrade (${cost} ${ESSENCE_NAME[def.essence]})`));
      }
      buttons.append(h('button', {
        class: 'small danger', disabled: equipped,
        onclick: () => {
          if (!confirm(`Salvage ${def.name} for ${salvageValue(inst)} ${ESSENCE_NAME[def.essence]} essence?`)) return;
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
        h('div', { class: 'muted' }, 'For testing only. Turn this tab off in Settings when you are done.'),
      ),
      h('div', { class: 'card' }, h('h3', {}, 'Spawn items'),
        h('div', { class: 'row' }, Object.values(ITEMS).map((d) =>
          h('button', { class: 'small', style: { color: RARITY_COLOR[d.rarity] }, onclick: () => spawn(d.id) }, d.name)))),
      h('div', { class: 'card' }, h('h3', {}, 'Resources'),
        h('div', { class: 'row' },
          h('button', { class: 'small', onclick: () => { p.essence.undead += 1000; this.commit(); } }, '+1000 Bone Essence'),
          h('button', { class: 'small', onclick: () => { p.essence.wither += 1000; this.commit(); } }, '+1000 Star Essence'),
          h('button', { class: 'small', onclick: () => { p.cataXp += 500; this.commit(); } }, '+500 Delve XP'),
          h('button', { class: 'small', onclick: () => { p.cataXp = 0; this.commit(); } }, 'Reset Delve XP'),
        )),
      (() => {
        const cur = cataLevel(p.cataXp).level;
        const label = h('b', {}, `Rank ${cur}`);
        const slider = h('input', { type: 'range', min: 0, max: MAX_CATA, step: 1, value: cur, class: 'cata-slider' }) as HTMLInputElement;
        slider.oninput = () => { label.textContent = `Rank ${slider.value}`; };
        slider.onchange = () => { p.cataXp = xpForLevel(Number(slider.value)); this.commit(); };
        return h('div', { class: 'card' },
          h('div', { class: 'row spread' }, label, h('span', { class: 'muted' }, 'Drag to set your level')),
          slider);
      })(),
      h('div', { class: 'card' }, h('h3', {}, 'Cheats'),
        h('div', { class: 'row' },
          h('button', { class: 'small' + (p.admin.godMode ? ' primary' : ''), onclick: () => { p.admin.godMode = !p.admin.godMode; this.commit(); } }, `God mode: ${p.admin.godMode ? 'ON' : 'off'}`),
          h('button', { class: 'small' + (p.admin.unlockAll ? ' primary' : ''), onclick: () => { p.admin.unlockAll = !p.admin.unlockAll; this.commit(); } }, `Unlock all Depths: ${p.admin.unlockAll ? 'ON' : 'off'}`),
        )),
    );
  }

  private toggleRow(label: string, desc: string, on: boolean, flip: () => void) {
    return h('div', { class: 'setting-row' },
      h('div', { class: 'setting-text' }, h('b', {}, label), h('div', { class: 'muted' }, desc)),
      h('button', { class: 'switch' + (on ? ' on' : ''), role: 'switch', 'aria-checked': String(on), 'aria-label': label, onclick: flip }, h('span', {})),
    );
  }

  private actionRow(label: string, desc: string, button: HTMLElement) {
    return h('div', { class: 'setting-row' },
      h('div', { class: 'setting-text' }, h('b', {}, label), h('div', { class: 'muted' }, desc)),
      button,
    );
  }

  private settingsMenu(p: Profile) {
    const area = h('textarea', { placeholder: 'Paste a save code here to load it' }) as HTMLTextAreaElement;
    const code = exportProfile(p);
    const panel = h('div', { class: 'panel settings-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Settings', onclick: () => {} },
      h('div', { class: 'row spread settings-head' },
        h('h2', {}, '⚙ Settings'),
        h('button', { class: 'icon-btn small-icon', 'aria-label': 'Close settings', onclick: () => this.closeSettings() }, '✕'),
      ),
      h('div', { class: 'settings-section' },
        h('div', { class: 'eyebrow' }, 'Gameplay'),
        this.toggleRow('Puzzle glow', 'Highlights the right answer in puzzles (Tic Tac Toe, Three Liars, Higher or Lower and more). You can also toggle it from the pause menu.',
          p.settings.puzzleGlow, () => { p.settings.puzzleGlow = !p.settings.puzzleGlow; this.commit(); }),
        this.toggleRow('Sound', 'Music while you clear the dungeon (it fades out at the boss) and quiet sound effects for hits, deaths, secrets and doors.',
          p.settings.sound, () => { p.settings.sound = !p.settings.sound; this.commit(); }),
        this.actionRow('Tap calibration',
          `Tap some dots so mob, secret and map taps line up with your finger. Now: shift ${p.settings.tapOffset?.x ?? 0}, ${p.settings.tapOffset?.y ?? 0}px, tap areas ${Math.round((p.settings.tapSize ?? 1) * 100)}%.`,
          h('button', { class: 'small', onclick: () => openCalibration({ tapOffset: p.settings.tapOffset ?? { x: 0, y: 0 }, tapSize: p.settings.tapSize ?? 1 }, (c) => {
            p.settings.tapOffset = c.tapOffset;
            p.settings.tapSize = c.tapSize;
            this.commit();
          }) }, 'Calibrate')),
      ),
      this.actions.replayTutorial
        ? h('div', { class: 'settings-section' },
          h('div', { class: 'eyebrow' }, 'Help'),
          this.actionRow('Tutorial', 'Replay the Threshold tutorial: clearing rooms, secrets, puzzles and locked doors.',
            h('button', { class: 'small primary', onclick: () => { this.settingsOpen = false; this.actions.replayTutorial?.(); } }, 'Replay')),
        )
        : null,
      h('div', { class: 'settings-section' },
        h('div', { class: 'eyebrow' }, 'Save data'),
        h('div', { class: 'muted' }, 'Your progress is stored on this device. Copy this code somewhere safe (Notes works) to restore it later.'),
        h('textarea', { readonly: true }, code),
        h('button', { class: 'small', onclick: async () => {
          try { await navigator.clipboard.writeText(code); alert('Save code copied.'); } catch { alert('Copy failed: select the text and copy it manually.'); }
        } }, 'Copy save code'),
        h('div', { style: { height: '10px' } }),
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
      h('div', { class: 'settings-section' },
        h('div', { class: 'eyebrow' }, 'Advanced'),
        this.toggleRow('Admin tab', 'Testing tools: spawn items, set your level, god mode.',
          p.admin.enabled, () => { p.admin.enabled = !p.admin.enabled; if (!p.admin.enabled && this.tab === 'admin') this.tab = 'dungeons'; this.commit(); }),
        this.actionRow('Reset all progress', 'Deletes every item, level and clear on this device.',
          h('button', { class: 'small danger', onclick: () => {
            if (!confirm('Delete ALL progress and start over?')) return;
            this.actions.replaceProfile(freshProfile());
            this.render();
          } }, 'Reset')),
      ),
    );
    return h('div', { class: 'overlay settings-overlay', onclick: () => this.closeSettings() }, panel);
  }
}
