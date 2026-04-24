/**
 * DroneDepotOverlay — simplified per-depot panel.
 *
 * Shows slot count, an upgrade button, and a link to the unified
 * Drone Management panel. Opens on [E] near the DroneDepot building.
 */
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import type { DroneDepot } from '@entities/DroneDepot';

export class DroneDepotOverlay {
  private _depot: DroneDepot;
  private _onOpenManagement: (() => void) | null;
  private _root: HTMLElement | null = null;
  private _open = false;
  private _unsubCap: (() => void) | null = null;

  constructor(
    depot: DroneDepot,
    _getWorldContainer: () => unknown,
    onOpenManagement?: () => void,
  ) {
    this._depot = depot;
    this._onOpenManagement = onOpenManagement ?? null;
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;
    this._root = document.createElement('div');
    this._root.id = 'drone-depot-overlay';
    this._root.className = 'trade-panel';
    this._root.style.display = 'none';
    parent.appendChild(this._root);
    this._render();

    const onCap = () => { if (this._open) this._render(); };
    EventBus.on('drone:bay_cap_changed', onCap);
    this._unsubCap = () => EventBus.off('drone:bay_cap_changed', onCap);
  }

  unmount(): void {
    this._unsubCap?.();
    this._root?.remove();
    this._root = null;
    this._open = false;
  }

  open(): void {
    this._open = true;
    if (this._root) {
      this._root.style.display = 'flex';
      this._render();
    }
  }

  close(): void {
    this._open = false;
    if (this._root) this._root.style.display = 'none';
  }

  isOpen(): boolean { return this._open; }

  private _render(): void {
    if (!this._root) return;

    const used = this._depot.slots.filter(s => s.drone !== null).length;
    const total = this._depot.slotCount;
    const cost = this._depot.upgradeCost();
    const canAfford = gameState.credits >= cost;

    this._root.innerHTML = `
      <div class="trade-panel-head">
        <h2>DRONE DEPOT</h2>
        <button class="trade-panel-close" aria-label="close">✕</button>
      </div>
      <div style="font-size:13px;padding:8px 0;color:#C8C4B0;">
        Slots: <strong style="color:#D4A843;">${used}/${total}</strong>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
        <button id="ddo-upgrade-btn" class="trade-panel-action"
          style="${canAfford ? '' : 'opacity:0.5;cursor:not-allowed;'}"
          ${canAfford ? '' : 'disabled'}>
          UPGRADE SLOT — ${cost.toLocaleString()} CR
        </button>
        <button id="ddo-manage-btn" class="trade-panel-action trade-panel-action-primary">
          OPEN DRONE MANAGEMENT →
        </button>
        <button id="ddo-close-btn" class="trade-panel-action">CLOSE</button>
      </div>
    `;

    this._root.querySelector('.trade-panel-close')?.addEventListener('click', () => this.close());
    this._root.querySelector('#ddo-close-btn')?.addEventListener('click', () => this.close());

    this._root.querySelector('#ddo-upgrade-btn')?.addEventListener('click', () => {
      if (this._depot.upgradeSlot()) this._render();
    });

    this._root.querySelector('#ddo-manage-btn')?.addEventListener('click', () => {
      this.close();
      this._onOpenManagement?.();
    });
  }
}
