import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import type { QualityLot, OreType } from '@data/types';
import { assetManager } from '@services/AssetManager';
import { SELL_PRICES } from '@services/MarketplaceService';

export class StorageDepot {
  readonly container: Container;
  readonly x: number;
  readonly y: number;
  /** Soft cap used by the drone mining dispatcher: while total >= capacity,
   * drones stay IDLE (GDD §10 "drones return to idle — they won't mine if
   * there's nowhere to put it"). `deposit()` still accepts everything; the cap
   * only gates mining dispatch. */
  capacity: number = 50;
  private stockpile = new Map<OreType, number>();
  private label!: Text;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Sprite: legacy storage_depot texture, fall back to amber rect if missing.
    if (assetManager.has('building_storage_depot')) {
      const s = new Sprite(assetManager.texture('building_storage_depot'));
      s.anchor.set(0.5);
      s.width = 64;
      s.height = 64;
      this.container.addChild(s);
    } else {
      const body = new Graphics();
      body.rect(-24, -24, 48, 48).fill(0x1A2A4A);
      body.rect(-24, -24, 48, 48).stroke({ width: 2, color: 0xD4A843 });
      this.container.addChild(body);
    }

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#D4A843' });
    this.label = new Text({ text: 'STORAGE', style });
    this.label.anchor.set(0.5);
    this.label.y = 40;
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

  /** Sum of all stockpiled ore — used for capacity gating. */
  getTotal(): number {
    let total = 0;
    for (const q of this.stockpile.values()) total += q;
    return total;
  }

  /** True when the pool has reached capacity. Drone mining dispatcher should
   * stop sending drones to mine while this is true. */
  isFull(): boolean { return this.getTotal() >= this.capacity; }

  /** Remaining space before hitting capacity. */
  getRemainingCapacity(): number {
    return Math.max(0, this.capacity - this.getTotal());
  }

  /** Set stockpile amount for a specific ore type — for testing/debug only */
  setStock(oreType: OreType, qty: number): void {
    if (qty <= 0) {
      this.stockpile.delete(oreType);
    } else {
      this.stockpile.set(oreType, qty);
    }
  }

  /** Clear all stockpile — for testing/debug only */
  clearStock(): void {
    this.stockpile.clear();
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    // Always offer deposit; on-interact logic handles "nothing to sell".
    return { verb: 'DEPOSIT', target: 'STORAGE' };
  }
}
