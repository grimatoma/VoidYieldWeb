/**
 * Shop terminal panel — matches design_mocks/13_shop_panel.svg. Tabs:
 *   DRONES   — redirect to the Drone Bay (drone purchases live there now)
 *   UPGRADES — TradeHub catalog (Crystal Lattice, Alloy Rods, Steel Plates)
 *   MARKET   — MarketplaceService buy/sell per resource, backed by the depot
 *   BUILD    — placeholder list of unlockable buildings
 */
import { effect } from '@preact/signals-core';
import { credits } from '@store/gameStore';
import { EventBus } from '@services/EventBus';
import { TRADE_CATALOG } from '@entities/TradeHub';
import type { TradeHub } from '@entities/TradeHub';
import type { StorageDepot } from '@entities/StorageDepot';
import { marketplaceService, FREE_BUY_MODE } from '@services/MarketplaceService';
import type { OreType } from '@data/types';

type Tab = 'drones' | 'upgrades' | 'market' | 'build';

const BUILD_CATALOG: Array<{ label: string; desc: string; cost: string }> = [
  { label: 'SOLAR PANEL',       desc: 'Power node, low output',            cost: '150 CR' },
  { label: 'PROCESSING PLANT',  desc: 'Ore smelter — unlock via research', cost: '1200 CR' },
  { label: 'FABRICATOR',        desc: 'Tier-2 factory — locked',           cost: '--' },
];

export class ShopPanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _tradeHub: TradeHub | null = null;
  private _depot: StorageDepot | null = null;
  private _visible = false;
  private _tab: Tab = 'market';
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
  setTradeHub(hub: TradeHub): void { this._tradeHub = hub; }
  setDepot(depot: StorageDepot): void { this._depot = depot; }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'shop-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>SHOP TERMINAL</h2>
        <button class="trade-panel-close" aria-label="close">✕</button>
      </div>
      <div class="trade-panel-credits">
        <span>CR</span>
        <span class="trade-panel-cr-value">0</span>
      </div>
      <div class="trade-panel-tabs">
        <button class="trade-panel-tab" data-tab="drones">DRONES</button>
        <button class="trade-panel-tab" data-tab="upgrades">UPGRADES</button>
        <button class="trade-panel-tab is-active" data-tab="market">MARKET</button>
        <button class="trade-panel-tab" data-tab="build">BUILD</button>
      </div>
      <div class="trade-panel-list shop-list"></div>
      <div class="trade-panel-hint">[E] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    panel.querySelectorAll<HTMLButtonElement>('.trade-panel-tab').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab as Tab));
    });
    return panel;
  }

  private _switchTab(tab: Tab): void {
    this._tab = tab;
    this._root.querySelectorAll<HTMLButtonElement>('.trade-panel-tab')
      .forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    this._renderList();
  }

  private _renderList(): void {
    const list = this._root.querySelector<HTMLElement>('.shop-list')!;
    list.innerHTML = '';
    if (this._tab === 'drones') {
      const note = document.createElement('div');
      note.className = 'storage-empty';
      note.textContent = 'Drone purchases moved to the Drone Bay. Press [E] on the bay to buy drones.';
      list.appendChild(note);
      return;
    }
    if (this._tab === 'upgrades') {
      for (const item of TRADE_CATALOG) {
        const stock = this._tradeHub?.getStockCount(item.itemId) ?? 0;
        const affordable = credits.value >= item.costCr;
        const row = document.createElement('div');
        row.className = 'trade-row' + (affordable ? '' : ' trade-row--dim');
        row.innerHTML = `
          <div class="trade-row-main">
            <div class="trade-row-name">${item.name}</div>
            <div class="trade-row-desc">${item.description}</div>
            <div class="trade-row-stock">owned ${stock}</div>
          </div>
          <div class="trade-row-buy">
            <div class="trade-row-cost">${item.costCr} CR</div>
            <button class="trade-row-buy-btn" data-qty="1" ${affordable ? '' : 'disabled'}>BUY 1</button>
            <button class="trade-row-buy-btn" data-qty="10" ${credits.value >= item.costCr * 10 ? '' : 'disabled'}>BUY 10</button>
          </div>
        `;
        row.querySelectorAll<HTMLButtonElement>('.trade-row-buy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const qty = Number(btn.dataset.qty ?? '1');
            if (this._tradeHub?.buy(item.itemId, qty)) {
              this._renderList();
            }
          });
        });
        list.appendChild(row);
      }
      return;
    }
    if (this._tab === 'market') {
      this._renderMarket(list);
      return;
    }
    // build tab — placeholder
    for (const item of BUILD_CATALOG) {
      const row = document.createElement('div');
      row.className = 'trade-row trade-row--dim';
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${item.label}</div>
          <div class="trade-row-desc">${item.desc}</div>
        </div>
        <div class="trade-row-buy">
          <div class="trade-row-cost">${item.cost}</div>
        </div>
      `;
      list.appendChild(row);
    }
  }

  private _renderMarket(list: HTMLElement): void {
    if (!this._depot) {
      const note = document.createElement('div');
      note.className = 'storage-empty';
      note.textContent = 'No storage depot connected. Build one to trade resources.';
      list.appendChild(note);
      return;
    }
    if (FREE_BUY_MODE) {
      const banner = document.createElement('div');
      banner.className = 'market-free-banner';
      banner.textContent = 'TEST MODE — All purchases are FREE';
      list.appendChild(banner);
    }
    const stockpile = this._depot.getStockpile();
    for (const listing of marketplaceService.getListings()) {
      const ore = listing.oreType as OreType;
      const pool = stockpile.get(ore) ?? 0;
      const canBuy1 = marketplaceService.canBuy(ore, 1);
      const canBuy10 = marketplaceService.canBuy(ore, 10);
      const canSell1 = marketplaceService.canSell(this._depot, ore, 1);
      const canSellAll = pool > 0;
      const buyPriceText = listing.buyPrice === 0 ? 'FREE' : `${listing.buyPrice} CR`;
      const sellPriceText = listing.sellPrice > 0 ? `${listing.sellPrice} CR` : 'no value';
      const row = document.createElement('div');
      row.className = 'trade-row market-row';
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${listing.displayName}</div>
          <div class="trade-row-desc">buy ${buyPriceText} · sell ${sellPriceText}</div>
          <div class="trade-row-stock">in depot: ${pool}</div>
        </div>
        <div class="trade-row-buy market-actions">
          <div class="market-btn-group">
            <button class="trade-row-buy-btn" data-action="buy" data-qty="1" ${canBuy1 ? '' : 'disabled'}>BUY 1</button>
            <button class="trade-row-buy-btn" data-action="buy" data-qty="10" ${canBuy10 ? '' : 'disabled'}>BUY 10</button>
          </div>
          <div class="market-btn-group">
            <button class="trade-row-buy-btn market-sell-btn" data-action="sell" data-qty="1" ${canSell1 ? '' : 'disabled'}>SELL 1</button>
            <button class="trade-row-buy-btn market-sell-btn" data-action="sell-all" ${canSellAll ? '' : 'disabled'}>SELL ALL</button>
          </div>
        </div>
      `;
      row.querySelectorAll<HTMLButtonElement>('.trade-row-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => this._handleMarketAction(btn, ore, pool));
      });
      list.appendChild(row);
    }
  }

  private _handleMarketAction(btn: HTMLButtonElement, ore: OreType, pool: number): void {
    if (!this._depot) return;
    const action = btn.dataset.action;
    if (action === 'buy') {
      const qty = Number(btn.dataset.qty ?? '1');
      marketplaceService.buy(this._depot, ore, qty);
    } else if (action === 'sell') {
      const qty = Number(btn.dataset.qty ?? '1');
      marketplaceService.sell(this._depot, ore, qty);
    } else if (action === 'sell-all') {
      marketplaceService.sell(this._depot, ore, pool);
    }
    this._renderList();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const crEl = this._root.querySelector<HTMLElement>('.trade-panel-cr-value')!;
    this._cleanups.push(effect(() => {
      crEl.textContent = Math.floor(credits.value).toLocaleString();
      if (this._visible) this._renderList();
    }));
    const refreshIfOpen = () => { if (this._visible) this._renderList(); };
    EventBus.on('marketplace:buy', refreshIfOpen);
    EventBus.on('marketplace:sell', refreshIfOpen);
    this._cleanups.push(
      () => EventBus.off('marketplace:buy', refreshIfOpen),
      () => EventBus.off('marketplace:sell', refreshIfOpen),
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
