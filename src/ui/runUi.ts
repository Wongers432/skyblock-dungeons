import { CHEST_NAME } from '../data/floors';
import { ITEMS, RARITY_COLOR } from '../data/items';
import { aiMove, bestPlayerMoves, winner } from '../game/puzzles';
import type { Run, RunEnd } from '../game/run';
import { h, fmtTime } from './dom';
import { saveProfile } from '../game/save';
import type { WitherLordsController } from '../game/bosses67';
import { tutorialTip } from '../game/tutorial';

export interface RunUiActions {
  setPaused(p: boolean): void;
  playAgain(): void;
  toHub(): void;
}

export class RunUi {
  private top: HTMLElement;
  private bottom: HTMLElement;
  private toasts: HTMLElement;
  private hint: HTMLElement;
  private puzzleBox: HTMLElement;
  private overlay: HTMLElement | null = null;
  private abilityBtn: HTMLButtonElement;
  private abilityCd: HTMLElement;
  private hpFill: HTMLElement;
  private shieldFill: HTMLElement;
  private hpText: HTMLElement;
  private manaFill: HTMLElement;
  private manaText: HTMLElement;
  private info: HTMLElement;
  private scoreEl: HTMLElement;
  private mapBtn: HTMLButtonElement;
  private last = '';
  private puzzleKey = '';
  /** Entrance tutorial tooltip; it sits above the toasts. */
  private tip: HTMLElement | null = null;
  private tipKey = '';

  constructor(private root: HTMLElement, private run: Run, private actions: RunUiActions) {
    this.info = h('div', { class: 'hud-sub' });
    this.scoreEl = h('div', { class: 'hud-main' });
    this.top = h('div', { class: 'hud-top' },
      h('div', {}, this.scoreEl, this.info),
      h('button', { onclick: () => this.showPause() }, '❚❚'),
    );
    this.hpFill = h('div');
    this.shieldFill = h('div', { class: 'shield' });
    this.hpText = h('span');
    this.manaFill = h('div');
    this.manaText = h('span');
    this.abilityCd = h('div', { class: 'cd' });
    this.abilityBtn = h('button', { class: 'ability-btn', onclick: () => run.pressAbility() }) as HTMLButtonElement;
    this.mapBtn = h('button', { onclick: () => run.goToMap() }, 'Map') as HTMLButtonElement;
    this.bottom = h('div', { class: 'hud-bottom' },
      h('div', { class: 'meters' },
        h('div', { class: 'meter hp' }, this.hpFill, this.shieldFill, this.hpText),
        h('div', { class: 'meter mana' }, this.manaFill, this.manaText),
      ),
      h('div', { class: 'row', style: { flexWrap: 'nowrap', alignItems: 'flex-end' } }, this.mapBtn, this.abilityBtn),
    );
    this.toasts = h('div', { class: 'toasts' });
    this.hint = h('div', { class: 'hint' });
    this.puzzleBox = h('div');
    root.append(this.top, this.bottom, this.toasts, this.hint, this.puzzleBox);
    this.refresh();
  }

  destroy() {
    for (const el of [this.top, this.bottom, this.toasts, this.hint, this.puzzleBox, this.overlay]) el?.remove();
  }

  toast(msg: string, color = '#ffffff') {
    const t = h('div', { class: 'toast', style: { color } }, msg);
    this.toasts.append(t);
    const all = this.toasts.querySelectorAll('.toast');
    for (let i = 0; i < all.length - 4; i++) all[i].remove();
    setTimeout(() => t.remove(), 3000);
  }

  /** Big centre-screen announcement that pops in and fades. */
  banner(msg: string, kind: 's' | 'splus') {
    const el = h('div', { class: `score-banner ${kind}` },
      h('div', { class: 'score-banner-text' }, ...[...msg].map((ch, i) => h('span', { style: { animationDelay: `${i * 0.05}s` } }, ch === ' ' ? '\u00a0' : ch))),
      h('div', { class: 'score-banner-sub' }, kind === 'splus' ? 'Perfect run so far. Keep it up!' : 'Find more secrets for S+'),
    );
    document.body.append(el);
    if (navigator.vibrate) navigator.vibrate(kind === 'splus' ? [40, 40, 80] : 40);
    setTimeout(() => el.remove(), 3200);
  }

  /** Cheap per-frame update of the meters and counters. */
  update() {
    const r = this.run;
    const s = r.stats;
    const score = r.scoreNow();
    const keys = [r.witherKeys ? `🗝 Wither x${r.witherKeys}` : '', r.bloodKey ? '🩸 Blood Key' : ''].filter(Boolean).join('  ');
    const info = `Secrets ${r.secretsFound}/${r.secretsTotal} · Crypts ${Math.min(5, r.crypts)}/5${keys ? ' · ' + keys : ''}`;
    const scoreText = `${r.floor.name} · ⏱ ${fmtTime(r.time)} · Score ${score.total} (${score.grade})`;
    const key = info + scoreText;
    if (key !== this.last) {
      this.info.textContent = info;
      this.scoreEl.textContent = scoreText;
      this.last = key;
    }
    const hpPct = Math.max(0, r.hp / s.maxHp) * 100;
    this.hpFill.style.width = `${hpPct}%`;
    this.shieldFill.style.width = `${Math.min(100, (r.shield / s.maxHp) * 100)}%`;
    this.hpText.textContent = `❤ ${Math.ceil(r.hp)} / ${s.maxHp}${r.shield > 0 ? `  +${Math.ceil(r.shield)}` : ''}`;
    this.manaFill.style.width = `${(r.mana / s.maxMana) * 100}%`;
    this.manaText.textContent = `✎ ${Math.floor(r.mana)} / ${s.maxMana}`;
    if (r.floor.tutorial) this.updateTip();
    const ab = s.ability;
    if (ab) this.abilityCd.style.width = `${ab.cooldown ? (r.abilityCd / ab.cooldown) * 100 : 0}%`;
  }

  private updateTip() {
    const r = this.run;
    const tip = tutorialTip(r);
    const key = tip ? `${tip.title}|${tip.text}|${tip.glowButton ?? ''}` : '';
    if (key === this.tipKey) return;
    this.tipKey = key;
    this.tip?.remove();
    this.tip = null;
    if (!tip) return;
    this.tip = h('div', { class: 'tutorial-tip' },
      h('b', {}, tip.title),
      h('div', {}, tip.text),
      tip.glowButton ? h('button', { class: 'small primary', onclick: () => {
        r.profile.settings.puzzleGlow = true;
        saveProfile(r.profile);
        this.refresh();
      } }, 'Turn on puzzle glow') : null,
    );
    this.toasts.prepend(this.tip);
  }

  /** Rebuild the parts that change on events (view, puzzles, ability). */
  refresh() {
    const r = this.run;
    const ab = r.stats.ability;
    this.abilityBtn.replaceChildren(this.abilityCd, ab ? ab.name : 'No ability', h('small', {}, ab ? (r.aiming ? 'Tap a spot (or cancel)' : `${ab.mana} mana`) : 'equip a weapon with one'));
    this.abilityBtn.disabled = !ab || r.view === 'map';
    this.abilityBtn.classList.toggle('aiming', r.aiming);
    this.mapBtn.style.display = r.view === 'room' ? '' : 'none';
    this.toasts.classList.toggle('boss', r.view === 'boss');
    this.hint.textContent = r.view === 'map'
      ? 'Tap a room to go there.'
      : r.aiming ? 'Tap where the ability should land.' : '';
    this.renderPuzzle();
  }

  private renderPuzzle() {
    const r = this.run;
    const glow = r.profile.settings.puzzleGlow;
    if (r.view === 'boss' && r.terminal) {
      this.renderTerminal(glow);
      return;
    }
    const room = r.view === 'room' ? r.current : null;
    const pz = room?.puzzle;
    const key = room && pz && !pz.done && pz.kind !== 'blaze' ? `${room.plan.id}:${pz.kind}:${pz.kind === 'tictactoe' ? pz.board.join(',') : ''}:${glow}` : '';
    if (key === this.puzzleKey) return;
    this.puzzleKey = key;
    this.puzzleBox.replaceChildren();
    if (!room || !pz || pz.done || pz.kind === 'blaze') return;
    if (pz.kind === 'tictactoe') {
      const hints = glow ? bestPlayerMoves([...pz.board]) : [];
      const play = (i: number) => {
        if (pz.board[i] || pz.done) return;
        pz.board[i] = 'X';
        let w = winner(pz.board);
        if (!w) {
          pz.board[aiMove(pz.board, r.rng)] = 'O';
          w = winner(pz.board);
        }
        if (w === 'O') r.solvePuzzle(room, false);
        else if (w) r.solvePuzzle(room, true);
        this.refresh();
      };
      this.puzzleBox.append(h('div', { class: 'panel puzzle' },
        h('h2', {}, 'Tic Tac Toe'),
        h('div', { class: 'muted' }, "You are X. Win or tie against the AI. If it beats you, the puzzle fails."),
        h('div', { class: 'ttt' }, pz.board.map((m, i) => h('button', { class: glow && !pz.done && hints.includes(i) ? 'glow' : '', onclick: () => play(i), style: { color: m === 'X' ? '#55ffff' : '#ff5555' } }, m ?? ''))),
      ));
    } else {
      const d = pz.data;
      this.puzzleBox.append(h('div', { class: 'panel puzzle' },
        h('h2', {}, 'Three Weirdos'),
        h('div', { class: 'muted' }, 'Exactly one of them is lying. Open the chest that has the reward.'),
        d.names.map((name, i) => h('div', { class: 'weirdo' + (glow && i === d.answer ? ' glow' : '') },
          h('b', { class: 'who' }, name),
          h('p', {}, `"${d.lines[i]}"`),
          h('button', { class: 'small', onclick: () => { pz.chosen = i; r.solvePuzzle(room, i === d.answer); this.refresh(); } }, 'Open'),
        )),
      ));
    }
  }

  /** Goldor's terminals on Floor VII. The fight keeps going while one is open. */
  private renderTerminal(glow: boolean) {
    const r = this.run;
    const t = r.terminal!;
    const ctl = r.bossController as WitherLordsController;
    const key = `term:${t.id}:${t.kind}:${t.next}:${t.cells.join(',')}:${glow}`;
    if (key === this.puzzleKey) return;
    this.puzzleKey = key;
    this.puzzleBox.replaceChildren();
    const panes = t.cells.map((c, i) => {
      let label = '';
      let cls = 'pane';
      if (t.kind === 'order') {
        const n = c as number;
        label = String(n);
        if (n < t.next) cls += ' green';
        if (glow && n === t.next) cls += ' glow';
      } else {
        cls += c ? ' green' : ' red';
        if (glow && !c) cls += ' glow';
      }
      return h('button', { class: cls, onclick: () => ctl.pressPane(i) }, label);
    });
    const done = ctl.terminals.filter((x) => x.done).length;
    this.puzzleBox.append(h('div', { class: 'panel puzzle mc-gui' },
      h('div', { class: 'mc-title' }, `TERMINAL ${done + 1}/4`),
      h('div', { class: 'row spread' },
        h('h2', {}, t.kind === 'order' ? 'Click in order!' : 'Correct all the panes!'),
        h('button', { class: 'small', onclick: () => ctl.closeTerminal() }, 'Close'),
      ),
      h('div', { class: 'muted' }, t.kind === 'order' ? 'Tap the panes from 1 to 9. A wrong pane hurts and resets.' : 'Tap every red pane to turn it green.'),
      h('div', { class: 'terminal' }, panes),
    ));
  }

  showPause() {
    if (this.overlay || this.run.ended) return;
    this.actions.setPaused(true);
    const r = this.run;
    const close = () => { this.overlay?.remove(); this.overlay = null; this.actions.setPaused(false); };
    const admin = r.profile.admin.enabled;
    this.overlay = h('div', { class: 'overlay' }, h('div', { class: 'panel' },
      h('h2', {}, 'Paused'),
      h('div', { class: 'muted' }, `${r.floor.name}  ·  ${fmtTime(r.time)}  ·  ${r.scoredRooms.filter((x) => x.cleared).length}/${r.scoredRooms.length} rooms cleared`),
      h('div', { class: 'btns' },
        h('button', { class: 'primary', onclick: close }, 'Resume'),
        h('button', { onclick: (e: Event) => {
          r.profile.settings.puzzleGlow = !r.profile.settings.puzzleGlow;
          saveProfile(r.profile);
          (e.currentTarget as HTMLElement).textContent = `Puzzle glow: ${r.profile.settings.puzzleGlow ? 'ON' : 'off'}`;
          this.refresh();
        } }, `Puzzle glow: ${r.profile.settings.puzzleGlow ? 'ON' : 'off'}`),
        h('button', { onclick: (e: Event) => {
          r.profile.settings.sound = !r.profile.settings.sound;
          saveProfile(r.profile);
          (e.currentTarget as HTMLElement).textContent = `Sound: ${r.profile.settings.sound ? 'ON' : 'off'}`;
        } }, `Sound: ${r.profile.settings.sound ? 'ON' : 'off'}`),
        admin ? h('button', { onclick: () => { r.adminClearRoom(); close(); } }, 'Admin: kill everything here') : null,
        admin ? h('button', { onclick: () => { r.adminKeys(); close(); } }, 'Admin: give keys') : null,
        admin ? h('button', { onclick: () => { r.adminRevealMap(); close(); } }, 'Admin: reveal map') : null,
        admin && r.view !== 'boss' ? h('button', { onclick: () => { close(); r.startBoss(); } }, 'Admin: skip to boss') : null,
        h('button', { class: 'danger', onclick: () => { if (confirm('Abandon this run? You get no loot.')) { close(); r.finish(false); } } }, 'Abandon run'),
      ),
    ));
    this.root.append(this.overlay);
  }

  showResults(end: RunEnd) {
    this.overlay?.remove();
    this.puzzleBox.replaceChildren();
    const s = end.score;
    const lootBox = h('div');
    const panel = h('div', { class: 'panel' },
      h('h2', { style: { color: end.victory ? '#55ff55' : '#ff5555' } }, end.victory ? `${this.run.floor.name} complete!` : 'Run failed'),
      h('div', { class: 'muted' }, end.reason),
      h('table', { class: 'score' },
        h('tr', {}, h('td', {}, 'Skill'), h('td', {}, s.skill)),
        h('tr', {}, h('td', {}, 'Exploration'), h('td', {}, s.exploration)),
        h('tr', {}, h('td', {}, `Speed (${fmtTime(end.seconds)})`), h('td', {}, s.speed)),
        h('tr', {}, h('td', {}, 'Bonus (crypts)'), h('td', {}, s.bonus)),
        h('tr', {}, h('td', {}, h('b', {}, 'Total')), h('td', {}, h('b', {}, s.total))),
      ),
      h('div', { style: { fontSize: '40px', textAlign: 'center', margin: '8px 0' }, class: 'grade' }, s.grade),
      end.newBest ? h('div', { style: { textAlign: 'center', color: '#55ffff' } }, 'New personal best!') : null,
      lootBox,
      h('div', { class: 'btns' },
        h('button', { class: 'primary', onclick: () => this.actions.playAgain() }, this.run.floor.tutorial ? 'Replay the tutorial' : 'Run it again'),
        h('button', { onclick: () => this.actions.toHub() }, 'Back to hub'),
      ),
    );
    if (end.victory && end.loot) {
      const loot = end.loot;
      const chestBtn = h('button', { class: 'chest-btn', onclick: () => {
        lootBox.replaceChildren(h('div', {},
          h('h3', {}, CHEST_NAME[loot.chest]),
          h('div', { class: 'loot' }, `+${loot.essence} ${this.run.floor.essence.type} essence`),
          end.secretEssence ? h('div', { class: 'loot' }, `+${end.secretEssence} essence from secrets and puzzles`) : null,
          loot.items.map((id) => h('div', { class: 'loot rare', style: { color: RARITY_COLOR[ITEMS[id].rarity] } }, `${end.rng?.paidOut === id ? 'RNG METER DROP!' : 'RARE DROP!'} ${ITEMS[id].name}`)),
          end.rng?.target ? h('div', { class: 'rng-mini' },
            h('div', { class: 'muted' }, `RNG Meter: ${ITEMS[end.rng.target].name}  ${end.rng.xp.toLocaleString()} / ${end.rng.required.toLocaleString()}${end.rng.gained ? `  (+${end.rng.gained})` : ''}`),
            h('div', { class: 'bar rng' }, h('div', { style: { width: `${(100 * end.rng.xp) / end.rng.required}%` } })),
          ) : h('div', { class: 'muted' }, 'Tip: the RNG Meter (in the hub) unlocks for a floor after your first clear.'),
          h('div', { class: 'loot', style: { color: '#55ffff' } }, `+${end.xp} Catacombs XP`),
          end.levelAfter > end.levelBefore ? h('div', { class: 'loot rare' }, `CATACOMBS LEVEL UP! ${end.levelBefore} → ${end.levelAfter}`) : null,
        ));
        // Real rare drops (not the common Wither Catalysts) get the full celebration.
        const big = loot.items.filter((id) => (this.run.floor.drops.find((d) => d.item === id)?.chance.bedrock ?? 0) < 0.1);
        if (big.length) this.rngesus(big, end.rng?.paidOut);
      } }, `Open the ${CHEST_NAME[loot.chest]}`);
      lootBox.append(chestBtn);
    } else if (end.victory && this.run.floor.tutorial) {
      lootBox.append(h('div', { class: 'loot', style: { color: '#55ffff', textAlign: 'center' } },
        end.xp ? `+${end.xp} Catacombs XP` : 'Tutorial XP already collected.'));
    } else {
      lootBox.append(h('div', { class: 'muted', style: { textAlign: 'center' } }, 'No chest this time.'));
    }
    this.overlay = h('div', { class: 'overlay' }, panel);
    this.root.append(this.overlay);
  }

  /** Full-screen rainbow celebration for a rare drop. Tap to close. */
  private rngesus(items: string[], meterItem?: string) {
    const title = '!!!!!!RNGESUS DROP!!!!!!';
    const letters = title.split('').map((ch, i) => h('span', { style: { animationDelay: `${-i * 0.08}s` } }, ch));
    const confetti: HTMLElement[] = [];
    for (let i = 0; i < 60; i++) {
      confetti.push(h('i', { style: {
        left: `${Math.random() * 100}%`,
        background: `hsl(${Math.floor(Math.random() * 360)},95%,60%)`,
        animationDelay: `${Math.random() * 1.5}s`,
        animationDuration: `${2 + Math.random() * 2}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      } }));
    }
    const box = h('div', { class: 'rngesus' },
      h('div', { class: 'confetti' }, confetti),
      h('div', { class: 'rngesus-inner' },
        h('div', { class: 'rngesus-title' }, letters),
        items.map((id) => h('div', { class: 'rngesus-item', style: { color: RARITY_COLOR[ITEMS[id].rarity] } },
          ITEMS[id].name, meterItem === id ? h('small', {}, ' (RNG Meter)') : null)),
        h('div', { class: 'muted' }, 'Tap to continue'),
      ),
    );
    const close = () => box.remove();
    box.addEventListener('click', close);
    setTimeout(close, 7000);
    this.root.append(box);
    try { navigator.vibrate?.([80, 40, 80, 40, 200]); } catch { /* not supported */ }
  }
}
