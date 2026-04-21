/**
 * Habitation panel — opens on E near a HabitationModule. Shows the colony
 * population breakdown by tier (Pioneer/Colonist/Technician/Engineer/Director),
 * housing capacity, and gas/water fulfillment from ConsumptionManager.
 */
import { EventBus } from '@services/EventBus';
import { consumptionManager } from '@services/ConsumptionManager';
import type { ColonyTier } from '@data/types';

const TIER_LABELS: Array<{ id: ColonyTier; label: string }> = [
  { id: 'pioneer',    label: 'PIONEERS' },
  { id: 'colonist',   label: 'COLONISTS' },
  { id: 'technician', label: 'TECHNICIANS' },
  { id: 'engineer',   label: 'ENGINEERS' },
  { id: 'director',   label: 'DIRECTORS' },
];

export class HabitationPanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;

  constructor() {
    this._root = this._build();
    this._root.style.display = 'none';
    this._onKeydown = (e) => {
      if (!this._visible) return;
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'habitation-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>HABITATION</h2>
        <button class="trade-panel-close" aria-label="close">\u2715</button>
      </div>
      <div class="hab-summary">
        <div class="hab-summary-row">
          <span>Housing</span>
          <span class="hab-housing-text">0 / 0</span>
        </div>
        <div class="hab-summary-row">
          <span>Productivity</span>
          <span class="hab-productivity-text">100%</span>
        </div>
      </div>
      <div class="trade-panel-list hab-tiers"></div>
      <div class="trade-panel-hint">[E] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    return panel;
  }

  private _render(): void {
    const list = this._root.querySelector<HTMLElement>('.hab-tiers')!;
    list.innerHTML = '';
    for (const tier of TIER_LABELS) {
      const count = consumptionManager.getTierPopulation(tier.id);
      const row = document.createElement('div');
      row.className = 'trade-row';
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${tier.label}</div>
          <div class="trade-row-desc">${count > 0 ? 'active' : 'none yet'}</div>
        </div>
        <div class="trade-row-buy">
          <div class="trade-row-cost">${count}</div>
        </div>
      `;
      list.appendChild(row);
    }
    const total = consumptionManager.getTotalPopulation();
    const capacity = consumptionManager.housingCapacity;
    this._root.querySelector<HTMLElement>('.hab-housing-text')!.textContent =
      `${total} / ${capacity}`;
    this._root.querySelector<HTMLElement>('.hab-productivity-text')!.textContent =
      `${Math.round(consumptionManager.productivityMultiplier * 100)}%`;
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const onPop = () => { if (this._visible) this._render(); };
    EventBus.on('population:changed', onPop);
    EventBus.on('needs:changed', onPop);
    this._cleanups.push(
      () => EventBus.off('population:changed', onPop),
      () => EventBus.off('needs:changed', onPop),
    );
  }

  open(): void {
    if (this._visible) return;
    this._visible = true;
    this._root.style.display = 'flex';
    this._render();
  }

  close(): void {
    if (!this._visible) return;
    this._visible = false;
    this._root.style.display = 'none';
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKeydown, true);
    for (const c of this._cleanups) c();
    this._cleanups = [];
    this._root.remove();
  }
}
