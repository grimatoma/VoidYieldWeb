import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { powerManager } from '@services/PowerManager';

export class SolarPanel {
  static readonly POWER_OUTPUT = 2;
  static readonly COST = 50;

  readonly x: number;
  readonly y: number;
  readonly container: Container;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Visual: light rect 32x32 with amber border
    const body = new Graphics();
    body.rect(-16, -16, 32, 32).fill(0x2A3A2A);
    body.rect(-16, -16, 32, 32).stroke({ width: 1, color: 0xD4A843 });
    this.container.addChild(body);

    // Solar panel label
    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#D4A843' });
    const label = new Text({ text: '☀', style });
    label.anchor.set(0.5);
    this.container.addChild(label);

    // Register power generation
    powerManager.registerGenerator(SolarPanel.POWER_OUTPUT);
  }

  destroy(): void {
    powerManager.unregisterGenerator(SolarPanel.POWER_OUTPUT);
    this.container.removeChildren();
  }
}
