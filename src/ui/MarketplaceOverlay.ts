import type { StorageDepot } from '@entities/StorageDepot';
import type { Marketplace } from '@entities/Marketplace';
import { gameState } from '@services/GameState';

interface SellRow {
  ore: string;
  label: string;
  price: number;
}

const SELL_ROWS: SellRow[] = [
  { ore: 'iron_bar',   label: 'IRON BAR',   price: 5  },
  { ore: 'copper_bar', label: 'COPPER BAR', price: 10 },
];

export class MarketplaceOverlay {
  private _marketplace: Marketplace;
  private _storage: StorageDepot;
  private _root: HTMLElement | null = null;
  private _open = false;
  private _listEl!: HTMLElement;
  private _totalEl!: HTMLElement;
  private _sellBtn!: HTMLButtonElement;
  private _pollId: ReturnType<typeof setInterval> | null = null;

  constructor(marketplace: Marketplace, storage: StorageDepot) {
    this._marketplace = marketplace;
    this._storage = storage;
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;

    this._root = document.createElement('div');
    this._root.id = 'marketplace-overlay';
    this._root.className = 'facility-panel facility-panel--bottom';
    this._root.style.display = 'none';
    this._root.style.setProperty('--facility-accent', '#67e8f9');
    this._root.style.setProperty('--facility-accent-soft', 'rgba(103, 232, 249, 0.14)');
    this._root.style.setProperty('--facility-accent-border', 'rgba(103, 232, 249, 0.42)');

    this._root.innerHTML = `
      <div class="facility-panel-head">
        <div class="facility-panel-heading">
          <div class="facility-panel-kicker">Outpost Terminal</div>
          <h2 class="facility-panel-title">Marketplace</h2>
          <div class="facility-panel-subtitle">Bulk-sell refined bars directly into credits.</div>
        </div>
        <div class="facility-panel-meta">
          <span class="facility-chip facility-chip--accent">Ready to trade</span>
        </div>
      </div>
      <div class="facility-panel-body">
        <div class="facility-section facility-section--accent">
          <div class="facility-section-title">Sell Ledger</div>
          <div id="market-list" class="facility-table"></div>
        </div>
        <div class="facility-section">
          <div class="facility-row">
            <span class="facility-row-label">Settlement</span>
            <span class="facility-row-value facility-row-value--accent">Asteroid Exchange</span>
          </div>
          <div id="market-total" class="facility-note"></div>
        </div>
        <div class="facility-actions">
          <button id="market-sell-btn" class="facility-btn facility-btn--accent">Sell all stock</button>
          <button id="market-close-btn" class="facility-btn">Close [E]</button>
        </div>
      </div>
    `;

    this._listEl = this._root.querySelector('#market-list')!;
    this._totalEl = this._root.querySelector('#market-total')!;
    this._sellBtn = this._root.querySelector('#market-sell-btn')!;

    this._sellBtn.addEventListener('click', () => this._sellAll());
    this._root.querySelector('#market-close-btn')!.addEventListener('click', () => this.close());

    parent.appendChild(this._root);
  }

  private _sellAll(): void {
    const earned = this._marketplace.sellAll(this._storage);
    if (earned > 0) {
      this._totalEl.className = 'facility-note facility-note--good';
      this._totalEl.textContent = `Sold for ${earned} CR. Updating settlement balance...`;
      setTimeout(() => {
        if (!this._root) return;
        this._refresh();
      }, 800);
    }
    this._refresh();
  }

  private _refresh(): void {
    const rows = SELL_ROWS.map((row) => {
      const qty = this._storage.getBarCount(row.ore as never);
      const value = qty * row.price;
      return `
        <div class="facility-table-row">
          <div>
            <div class="facility-item-title">${row.label}</div>
            <div class="facility-item-meta">${row.price} CR per unit</div>
          </div>
          <div class="facility-item-value">${qty} × ${row.price} = <strong>${value} CR</strong></div>
        </div>
      `;
    });
    this._listEl.innerHTML = rows.join('');

    const total = SELL_ROWS.reduce((sum, row) => {
      return sum + this._storage.getBarCount(row.ore as never) * row.price;
    }, 0);

    if (total > 0) {
      this._totalEl.className = 'facility-note';
      this._totalEl.innerHTML = `
        <div class="facility-row">
          <span class="facility-row-label">Sale value</span>
          <span class="facility-row-value"><strong>${total} CR</strong></span>
        </div>
        <div class="facility-row">
          <span class="facility-row-label">Current balance</span>
          <span class="facility-row-value facility-row-value--accent">${Math.floor(gameState.credits)} CR</span>
        </div>
      `;
      this._sellBtn.disabled = false;
    } else {
      this._totalEl.className = 'facility-note';
      this._totalEl.textContent = 'No refined bars are in storage. Run the plant longer before opening the terminal.';
      this._sellBtn.disabled = true;
    }
  }

  open(): void {
    if (!this._root) return;
    this._open = true;
    this._root.style.display = 'flex';
    this._refresh();
    this._pollId = setInterval(() => this._refresh(), 500);
  }

  close(): void {
    if (!this._root) return;
    this._open = false;
    this._root.style.display = 'none';
    if (this._pollId !== null) {
      clearInterval(this._pollId);
      this._pollId = null;
    }
  }

  toggle(): void {
    if (this._open) this.close();
    else this.open();
  }

  isOpen(): boolean { return this._open; }

  unmount(): void {
    this.close();
    this._root?.remove();
    this._root = null;
  }
}
