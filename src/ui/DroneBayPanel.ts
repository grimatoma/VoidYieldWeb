/**
 * DroneBayPanel — simplified per-bay panel.
 *
 * Shows slot count, an upgrade button, and a link to the unified
 * Drone Management panel. Opens on [E] near the DroneBay building.
 */
import { effect } from '@preact/signals-core';
import { credits } from '@store/gameStore';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import type { DroneBay } from '@entities/DroneBay';

export class DroneBayPanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _bay: DroneBay | null = null;
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;
  private _onOpenManagement: (() => void) | null = null;
  private _unsubCap: (() => void) | null = null;

  constructor() {
    this._root = this._build();
    this._root.style.display = 'none';
    this._onKeydown = (e) => {
      if (!this._visible) return;
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }

  setBay(bay: DroneBay): void {
    this._bay = bay;
    this._renderBody();
  }

  setOpenManagementCallback(cb: () => void): void {
    this._onOpenManagement = cb;
  }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'dronebay-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>DRONE BAY</h2>
        <button class="trade-panel-close" aria-label="close">✕</button>
      </div>
      <div class="trade-panel-credits">
        <span>CR</span>
        <span class="trade-panel-cr-value">0</span>
      </div>
      <div id="dronebay-body"></div>
      <div class="trade-panel-hint">[E] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    return panel;
  }

  private _renderBody(): void {
    const body = this._root.querySelector<HTMLElement>('#dronebay-body')!;
    const bay = this._bay;
    if (!bay) { body.innerHTML = ''; return; }

    const used = bay.slots.filter(s => s.drone !== null).length;
    const total = bay.slotCount;
    const cost = bay.upgradeCost();
    const canAfford = gameState.credits >= cost;

    body.innerHTML = `
      <div style="font-size:13px;padding:8px 0;color:#C8C4B0;">
        Slots: <strong style="color:#D4A843;">${used}/${total}</strong>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
        <button id="dronebay-upgrade-btn" class="trade-panel-action"
          style="${canAfford ? '' : 'opacity:0.5;cursor:not-allowed;'}"
          ${canAfford ? '' : 'disabled'}>
          UPGRADE SLOT — ${cost.toLocaleString()} CR
        </button>
        <button id="dronebay-manage-btn" class="trade-panel-action trade-panel-action-primary">
          OPEN DRONE MANAGEMENT →
        </button>
      </div>
    `;

    body.querySelector('#dronebay-upgrade-btn')?.addEventListener('click', () => {
      if (this._bay?.upgradeSlot()) this._renderBody();
    });

    body.querySelector('#dronebay-manage-btn')?.addEventListener('click', () => {
      this.close();
      this._onOpenManagement?.();
    });
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const crEl = this._root.querySelector<HTMLElement>('.trade-panel-cr-value')!;
    this._cleanups.push(
      effect(() => {
        crEl.textContent = Math.floor(credits.value).toLocaleString();
        if (this._visible) this._renderBody();
      }),
    );

    const onCap = () => { if (this._visible) this._renderBody(); };
    EventBus.on('drone:bay_cap_changed', onCap);
    this._unsubCap = () => EventBus.off('drone:bay_cap_changed', onCap);
  }

  open(): void {
    if (this._visible) return;
    this._visible = true;
    this._root.style.display = 'flex';
    this._renderBody();
  }

  close(): void {
    if (!this._visible) return;
    this._visible = false;
    this._root.style.display = 'none';
  }

  /** Called each frame — no-op in simplified version (body is event-driven). */
  update(_delta: number): void {}

  destroy(): void {
    window.removeEventListener('keydown', this._onKeydown, true);
    this._unsubCap?.();
    for (const c of this._cleanups) c();
    this._cleanups = [];
    this._root.remove();
  }
}
