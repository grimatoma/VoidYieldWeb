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
    this._root.style.cssText = [
      'position:absolute',
      'bottom:80px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(13,27,62,0.95)',
      'border:1px solid #00B8D4',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:13px',
      'padding:14px 18px',
      'min-width:300px',
      'z-index:20',
      'pointer-events:auto',
      'display:none',
    ].join(';');

    this._root.innerHTML = `
      <div style="font-size:15px;font-weight:bold;text-align:center;margin-bottom:12px;letter-spacing:2px;color:#00B8D4;">MARKETPLACE</div>
      <div id="market-list" style="margin-bottom:12px;"></div>
      <div id="market-total" style="text-align:right;margin-bottom:12px;border-top:1px solid #2A3A5A;padding-top:8px;font-size:14px;"></div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button id="market-sell-btn" style="${this._btnStyle('#00B8D4')}">SELL ALL</button>
        <button id="market-close-btn" style="${this._btnStyle('#D4A843')}">CLOSE [E]</button>
      </div>
    `;

    this._listEl  = this._root.querySelector('#market-list')!;
    this._totalEl = this._root.querySelector('#market-total')!;
    this._sellBtn = this._root.querySelector('#market-sell-btn')!;

    this._sellBtn.addEventListener('click', () => this._sellAll());
    this._root.querySelector('#market-close-btn')!.addEventListener('click', () => this.close());

    parent.appendChild(this._root);
  }

  private _btnStyle(color: string): string {
    return [
      `background:rgba(${color === '#00B8D4' ? '0,184,212' : '212,168,67'},0.15)`,
      `border:1px solid ${color}`,
      `color:${color}`,
      'font-family:monospace',
      'font-size:12px',
      'padding:6px 16px',
      'cursor:pointer',
      'letter-spacing:1px',
    ].join(';');
  }

  private _sellAll(): void {
    const earned = this._marketplace.sellAll(this._storage);
    if (earned > 0) {
      this._totalEl.textContent = `SOLD FOR ${earned} CR`;
      this._totalEl.style.color = '#00FF88';
      setTimeout(() => {
        this._totalEl.style.color = '';
        this._refresh();
      }, 800);
    }
    this._refresh();
  }

  private _refresh(): void {
    const rows = SELL_ROWS.map(r => {
      const qty = this._storage.getBarCount(r.ore as any);
      const value = qty * r.price;
      return `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="opacity:0.7;">${r.label}</span>
          <span>${qty} × ${r.price} CR = <b>${value} CR</b></span>
        </div>`;
    });
    this._listEl.innerHTML = rows.join('');

    const total = SELL_ROWS.reduce((sum, r) => {
      return sum + this._storage.getBarCount(r.ore as any) * r.price;
    }, 0);

    if (total > 0) {
      this._totalEl.textContent = `TOTAL: ${total} CR  (balance: ${Math.floor(gameState.credits)} CR)`;
      this._sellBtn.disabled = false;
    } else {
      this._totalEl.textContent = 'No bars to sell';
      this._sellBtn.disabled = true;
    }
  }

  open(): void {
    if (!this._root) return;
    this._open = true;
    this._root.style.display = 'block';
    this._refresh();
    this._pollId = setInterval(() => this._refresh(), 500);
  }

  close(): void {
    if (!this._root) return;
    this._open = false;
    this._root.style.display = 'none';
    if (this._pollId !== null) { clearInterval(this._pollId); this._pollId = null; }
  }

  toggle(): void {
    if (this._open) this.close(); else this.open();
  }

  isOpen(): boolean { return this._open; }

  unmount(): void {
    this.close();
    this._root?.remove();
    this._root = null;
  }
}
