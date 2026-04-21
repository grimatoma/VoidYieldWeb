/**
 * Inventory panel — opens when the player presses [I].
 * Shows carried inventory and the active planet's depot stockpile.
 */
import { inventory } from '@services/Inventory';
import type { StorageDepot } from '@entities/StorageDepot';
import type { OreType } from '@data/types';

export class InventoryPanel {
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
      if (e.code === 'Escape' || e.code === 'KeyI') {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }

  setDepot(depot: StorageDepot): void { this._depot = depot; }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'inventory-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>INVENTORY</h2>
        <button class="trade-panel-close" aria-label="close">\u2715</button>
      </div>
      <div class="trade-panel-list inventory-list"></div>
      <div class="trade-panel-hint">[I] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    return panel;
  }

  private _renderList(): void {
    const list = this._root.querySelector<HTMLElement>('.inventory-list')!;
    list.innerHTML = '';

    // Collect all ore types from both carried inventory and depot
    const oreTypes = new Set<OreType>();
    for (const lot of inventory.getLots()) oreTypes.add(lot.oreType);
    if (this._depot) {
      for (const type of this._depot.getStockpile().keys()) oreTypes.add(type);
    }

    if (oreTypes.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'storage-empty';
      empty.textContent = 'No cargo. Mine something first.';
      list.appendChild(empty);
      return;
    }

    // Carried section header
    const carriedSection = document.createElement('div');
    carriedSection.className = 'inventory-section';
    carriedSection.innerHTML = `<div class="inventory-section-header">CARRIED</div>`;
    list.appendChild(carriedSection);

    // Carried items
    for (const type of oreTypes) {
      const carried = inventory.getByType(type);
      if (carried > 0) {
        const row = document.createElement('div');
        row.className = 'trade-row';
        row.innerHTML = `
          <div class="trade-row-main">
            <div class="trade-row-name">${type.toUpperCase().replace(/_/g, ' ')}</div>
          </div>
          <div class="trade-row-buy">
            <div class="trade-row-stock-carry">${carried} unit${carried === 1 ? '' : 's'}</div>
          </div>
        `;
        list.appendChild(row);
      }
    }

    // Depot section header (only show if depot exists)
    if (this._depot) {
      const depotSection = document.createElement('div');
      depotSection.className = 'inventory-section';
      depotSection.innerHTML = `<div class="inventory-section-header">DEPOT STOCK</div>`;
      list.appendChild(depotSection);

      // Depot items
      const stockpile = this._depot.getStockpile();
      let hasStocked = false;
      for (const type of oreTypes) {
        const stocked = stockpile.get(type) ?? 0;
        if (stocked > 0) {
          hasStocked = true;
          const row = document.createElement('div');
          row.className = 'trade-row';
          row.innerHTML = `
            <div class="trade-row-main">
              <div class="trade-row-name">${type.toUpperCase().replace(/_/g, ' ')}</div>
            </div>
            <div class="trade-row-buy">
              <div class="trade-row-stock-pool">${stocked} unit${stocked === 1 ? '' : 's'}</div>
            </div>
          `;
          list.appendChild(row);
        }
      }

      if (!hasStocked) {
        const emptyDepot = document.createElement('div');
        emptyDepot.className = 'storage-empty';
        emptyDepot.textContent = 'Depot is empty.';
        list.appendChild(emptyDepot);
      }
    }
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    // Refresh when inventory or depot changes while the panel is open.
    const refreshIfOpen = () => { if (this._visible) this._renderList(); };
    window.addEventListener('inventory:changed', refreshIfOpen);
    this._cleanups.push(
      () => window.removeEventListener('inventory:changed', refreshIfOpen),
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
