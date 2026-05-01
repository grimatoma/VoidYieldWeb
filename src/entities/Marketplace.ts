import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CELL_SIZE } from './PlacedBuilding';
import type { StorageDepot } from './StorageDepot';
import { marketplaceService } from '@services/MarketplaceService';

/**
 * Marketplace — sell buildings for converting bars to credits.
 */
export class Marketplace {
  readonly container: Container;
  readonly x: number;
  readonly y: number;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;

    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    const w = CELL_SIZE - 4;
    const h = CELL_SIZE - 4;

    const body = new Graphics();
    body.rect(-w / 2, -h / 2, w, h).fill(0x1A5C2A);
    body.rect(-w / 2, -h / 2, w, h).stroke({ width: 1, color: 0x4A8060 });
    this.container.addChild(body);

    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 11,
      fill: '#D4A843',
      align: 'center',
    });
    const label = new Text({ text: 'MARKET', style: textStyle });
    label.anchor.set(0.5);
    this.container.addChild(label);
  }

  /**
   * Sell all bars from storage and return total credits earned.
   */
  sellAll(storage: StorageDepot): number {
    const ironEarned = marketplaceService.sell(storage, 'iron_bar', storage.getBarCount('iron_bar'));
    const copperEarned = marketplaceService.sell(storage, 'copper_bar', storage.getBarCount('copper_bar'));
    return ironEarned + copperEarned;
  }

  isNearby(px: number, py: number, radius = 80): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'SELL', target: 'MARKETPLACE' };
  }
}
