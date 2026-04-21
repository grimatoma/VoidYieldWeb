import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import type { QualityLot, OreType } from '@data/types';
import { assetManager } from '@services/AssetManager';

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
  void_cores: 60,
  processed_rations: 3,
  bio_resin: 4,
  processed_resin: 6,
  power_cells: 10,
  bio_circuit_boards: 15,
  dark_gas: 1,
  void_touched_ore: 5,
  resonance_shards: 15,
  ferrovoid: 12,
  warp_components: 50,
  crystal_lattice: 25,
  drill_head: 35,
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
