import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';

export interface CatalogItem {
  itemId: string;
  name: string;
  costCr: number;
  description: string;
}

export const TRADE_CATALOG: CatalogItem[] = [
  { itemId: 'crystal_lattice', name: 'Crystal Lattice', costCr: 30, description: 'Research & electronics component' },
  { itemId: 'alloy_rods', name: 'Alloy Rods', costCr: 50, description: 'Precision fabrication material' },
  { itemId: 'steel_plates', name: 'Steel Plates', costCr: 15, description: 'Structural refined material' },
];

export class TradeHub {
  readonly container: Container;
  readonly x: number;
  readonly y: number;

  private _inventory = new Map<string, number>();

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    const gfx = new Graphics();
    gfx.rect(-20, -20, 40, 40).fill(0x1A1A3A).stroke({ width: 2, color: 0xD4A843 });
    this.container.addChild(gfx);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#D4A843' });
    const label = new Text({ text: 'TRADE\n HUB', style });
    label.anchor.set(0.5);
    this.container.addChild(label);
  }

  getCatalog(): readonly CatalogItem[] {
    return TRADE_CATALOG;
  }

  /** Purchase qty units of itemId. Returns true if successful. */
  buy(itemId: string, qty: number): boolean {
    const item = TRADE_CATALOG.find(c => c.itemId === itemId);
    if (!item) return false;
    const totalCost = item.costCr * qty;
    if (gameState.credits < totalCost) return false;
    gameState.addCredits(-totalCost);
    const cur = this._inventory.get(itemId) ?? 0;
    this._inventory.set(itemId, cur + qty);
    EventBus.emit('shop:purchase', itemId);
    return true;
  }

  getInventory(): Map<string, number> {
    return this._inventory;
  }

  getStockCount(itemId: string): number {
    return this._inventory.get(itemId) ?? 0;
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }
}
