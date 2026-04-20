import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { QualityLot, OreType } from '@data/types';

const SELL_PRICES: Record<OreType, number> = {
  vorax: 1,
  krysite: 5,
  gas: 0,
  steel_bars: 5,
  compressed_gas: 1,
  water: 1,
  alloy_rods: 15,
  rocket_fuel: 2,
  shards: 3,
  aethite: 8,
};

export class StorageDepot {
  readonly container: Container;
  readonly x: number;
  readonly y: number;
  private stockpile = new Map<OreType, number>();
  private label!: Text;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Visual: dark rect 48x48 with amber border
    const body = new Graphics();
    body.rect(-24, -24, 48, 48).fill(0x1A2A4A);
    body.rect(-24, -24, 48, 48).stroke({ width: 2, color: 0xD4A843 });
    this.container.addChild(body);

    // "S" label
    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#D4A843' });
    this.label = new Text({ text: 'S', style });
    this.label.anchor.set(0.5);
    this.container.addChild(this.label);
  }

  /** Transfer lots into depot stockpile. */
  deposit(lots: QualityLot[]): void {
    for (const lot of lots) {
      const cur = this.stockpile.get(lot.oreType) ?? 0;
      this.stockpile.set(lot.oreType, cur + lot.quantity);
    }
  }

  /** Remove up to qty units of oreType. Returns amount actually removed. */
  pull(oreType: OreType, qty: number): number {
    const current = this.stockpile.get(oreType) ?? 0;
    const removed = Math.min(current, qty);
    if (removed > 0) this.stockpile.set(oreType, current - removed);
    return removed;
  }

  /** Sell everything in stockpile. Returns CR earned. */
  sellAll(): number {
    let earned = 0;
    for (const [type, qty] of this.stockpile.entries()) {
      earned += qty * SELL_PRICES[type];
    }
    this.stockpile.clear();
    return earned;
  }

  getStockpile(): Map<OreType, number> { return this.stockpile; }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }
}
