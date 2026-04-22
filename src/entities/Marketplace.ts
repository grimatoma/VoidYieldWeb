import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CELL_SIZE } from './PlacedBuilding';

/**
 * Marketplace — stub entity for the build menu. Visual + interaction hook only.
 * Phase C/D fills in the actual sell logic.
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

    // 2×1 footprint: 2×CELL_SIZE wide, 1×CELL_SIZE tall, minus 4px padding
    const w = 2 * CELL_SIZE - 4;
    const h = 1 * CELL_SIZE - 4;

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

  isNearby(px: number, py: number, radius = 80): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'SELL', target: 'MARKETPLACE' };
  }
}
