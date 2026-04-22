import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CELL_SIZE } from './PlacedBuilding';

/**
 * DroneDepot — stub entity for the build menu. Visual + interaction hook only.
 * Phase D fills in drone spawning logic.
 */
export class DroneDepot {
  readonly container: Container;
  readonly x: number;
  readonly y: number;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;

    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // 2×2 footprint: 2×CELL_SIZE wide, 2×CELL_SIZE tall, minus 4px padding
    const w = 2 * CELL_SIZE - 4;
    const h = 2 * CELL_SIZE - 4;

    const body = new Graphics();
    body.rect(-w / 2, -h / 2, w, h).fill(0x3A1A5C);
    body.rect(-w / 2, -h / 2, w, h).stroke({ width: 1, color: 0x6A4A8C });
    this.container.addChild(body);

    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 11,
      fill: '#D4A843',
      align: 'center',
    });
    const label = new Text({ text: 'DRONES', style: textStyle });
    label.anchor.set(0.5);
    this.container.addChild(label);
  }

  isNearby(px: number, py: number, radius = 120): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'CONFIGURE', target: 'DRONE DEPOT' };
  }
}
