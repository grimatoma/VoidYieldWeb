/**
 * Storage depot panel — opens when the player presses E near the StorageDepot.
 * Lists current stockpile per ore type and offers "SELL ALL" to convert the
 * entire pool to credits (based on StorageDepot.sellAll()). Shows both
 * carried-vs-pool per-resource summaries (mock 14 + 15).
 */
import { effect } from '@preact/signals-core';
import { credits } from '@store/gameStore';
import { EventBus } from '@services/EventBus';
import { inventory } from '@services/Inventory';
import { gameState } from '@services/GameState';
import type { StorageDepot } from '@entities/StorageDepot';
import type { OreType } from '@data/types';

const SELL_PRICES: Record<OreType, number> = {
  vorax: 1, krysite: 5, gas: 0, steel_bars: 5, compressed_gas: 1, water: 1,
  alloy_rods: 15, rocket_fuel: 2, shards: 3, aethite: 8, void_cores: 60,
  processed_rations: 3, bio_resin: 4, processed_resin: 6, power_cells: 10,
  bio_circuit_boards: 15, dark_gas: 1, void_touched_ore: 5,
  resonance_shards: 15, ferrovoid: 12, warp_components: 50,
  crystal_lattice: 25, drill_head: 35,
  hull: 400, engine: 600, fuel_tank: 300, avionics: 500, landing_gear: 250,
};

export class StoragePanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _depot: StorageDepot | null = null;
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;

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

  setDepot(depot: StorageDepot): void { this._depot = depot; }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'storage-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>SELL TERMINAL</h2>
        <button class="trade-panel-close" aria-label="close">\u2715</button>
      </div>
      <div class="trade-panel-credits">
        <span>CR</span>
        <span class="trade-panel-cr-value">0</span>
      </div>
      <div class="sell-led-screen">
        <div class="sell-led-row">
          <span class="sell-led-label">POOL</span>
          <span class="sell-led-value sell-led-pool">000 / 000</span>
        </div>
        <div class="sell-led-bar-bg">
          <div class="sell-led-bar-fill"></div>
        </div>
        <div class="sell-led-rate">
          <span class="sell-led-rate-text">RATE: --</span>
          <span class="sell-led-total">= 0 CR</span>
        </div>
      </div>
      <div class="trade-panel-actions">
        <button class="trade-panel-action-primary" data-act="sell-all">SELL ALL</button>
        <button class="trade-panel-action" data-act="deposit">DEPOSIT CARRIED</button>
      </div>
      <div class="sell-auto-toggle">
        <div class="sell-auto-toggle-main">
          <span class="sell-auto-toggle-name">AUTO-SELL</span>
          <span class="sell-auto-toggle-desc">Sells at 80% capacity</span>
        </div>
        <div class="sell-auto-toggle-lock">LOCKED \u00B7 500 CR</div>
      </div>
      <div class="trade-panel-list storage-list"></div>
      <div class="trade-panel-hint">[E] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    panel.querySelector<HTMLButtonElement>('[data-act="sell-all"]')!
      .addEventListener('click', () => this._sellAll());
    panel.querySelector<HTMLButtonElement>('[data-act="deposit"]')!
      .addEventListener('click', () => this._depositCarried());
    return panel;
  }

  private _sellAll(): void {
    if (!this._depot) return;
    const cr = this._depot.sellAll();
    if (cr > 0) {
      gameState.addCredits(cr);
      EventBus.emit('ore:sold', cr);
    }
    this._renderList();
  }

  private _depositCarried(): void {
    if (!this._depot) return;
    const lots = inventory.drain();
    if (lots.length > 0) {
      this._depot.deposit(lots);
      EventBus.emit('inventory:changed');
    }
    this._renderList();
  }

  private _renderList(): void {
    const list = this._root.querySelector<HTMLElement>('.storage-list')!;
    list.innerHTML = '';
    if (!this._depot) return;
    const stockpile = this._depot.getStockpile();

    const oreTypes = new Set<OreType>();
    for (const type of stockpile.keys()) oreTypes.add(type);
    for (const lot of inventory.getLots()) oreTypes.add(lot.oreType);

    const POOL_CAP = 50; // matches Resource Rail cap; purely display here.
    let totalPool = 0;
    let totalValue = 0;
    let topRate: number | null = null;
    for (const type of oreTypes) {
      const pool = stockpile.get(type) ?? 0;
      const price = SELL_PRICES[type] ?? 0;
      totalPool += pool;
      totalValue += pool * price;
      if (topRate === null || price > topRate) topRate = price;
    }

    // Amber LED readout — mock 14
    const padN = (n: number) => String(n).padStart(3, '0');
    this._root.querySelector<HTMLElement>('.sell-led-pool')!.textContent =
      `${padN(totalPool)} / ${padN(POOL_CAP)}`;
    const pct = Math.min(100, (totalPool / POOL_CAP) * 100);
    this._root.querySelector<HTMLElement>('.sell-led-bar-fill')!
      .style.width = `${pct.toFixed(1)}%`;
    this._root.querySelector<HTMLElement>('.sell-led-rate-text')!.textContent =
      topRate != null ? `RATE: ${topRate} CR / UNIT` : 'RATE: --';
    this._root.querySelector<HTMLElement>('.sell-led-total')!.textContent =
      `= ${padN(totalValue)} CR`;

    if (oreTypes.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'storage-empty';
      empty.textContent = 'Storage is empty. Mine something first.';
      list.appendChild(empty);
      return;
    }

    for (const type of oreTypes) {
      const pool = stockpile.get(type) ?? 0;
      const carried = inventory.getByType(type);
      const price = SELL_PRICES[type] ?? 0;
      const value = pool * price;
      const row = document.createElement('div');
      row.className = 'trade-row';
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${type.toUpperCase().replace(/_/g, ' ')}</div>
          <div class="trade-row-desc">${price} CR / unit</div>
        </div>
        <div class="trade-row-buy">
          <div class="trade-row-stock-pool">pool ${pool}</div>
          <div class="trade-row-stock-carry">carried ${carried}</div>
          <div class="trade-row-cost">${value} CR</div>
        </div>
      `;
      list.appendChild(row);
    }

    const total = document.createElement('div');
    total.className = 'storage-total';
    total.innerHTML = `<span>TOTAL SELLABLE</span><span>${totalValue} CR</span>`;
    list.appendChild(total);
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const crEl = this._root.querySelector<HTMLElement>('.trade-panel-cr-value')!;
    this._cleanups.push(effect(() => {
      crEl.textContent = Math.floor(credits.value).toLocaleString();
    }));
    // Refresh when inventory or a sale changes while the panel is open.
    const refreshIfOpen = () => { if (this._visible) this._renderList(); };
    EventBus.on('inventory:changed', refreshIfOpen);
    EventBus.on('ore:sold', refreshIfOpen);
    this._cleanups.push(
      () => EventBus.off('inventory:changed', refreshIfOpen),
      () => EventBus.off('ore:sold', refreshIfOpen),
    );
  }

  open(): void {
    if (this._visible) return;
    this._visible = true;
    this._root.style.display = 'flex';
    this._renderList();
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
