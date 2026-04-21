import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { consumptionManager } from '@services/ConsumptionManager';

export class HabitationModule {
  static readonly COST_CR = 800;
  static readonly CAPACITY = 30;

  readonly container: Container;
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    const gfx = new Graphics();
    gfx.rect(-30, -24, 60, 48).fill(0x1A2233).stroke({ width: 2, color: 0x4CAF50 });
    // Decorative windows so it reads as a habitation pod at a glance.
    for (let i = 0; i < 3; i++) {
      gfx.rect(-22 + i * 15, -8, 8, 10).fill(0x8BC34A);
    }
    this.container.addChild(gfx);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#4CAF50' });
    const label = new Text({ text: 'HABITATION', style });
    label.anchor.set(0.5);
    label.y = 36;
    this.container.addChild(label);

    consumptionManager.addHousing(HabitationModule.CAPACITY);
  }

  isNearby(px: number, py: number, radius = 50): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'OPEN', target: 'HABITATION' };
  }
}
