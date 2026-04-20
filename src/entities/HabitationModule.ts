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
    gfx.rect(-22, -18, 44, 36).fill(0x1A2233).stroke({ width: 2, color: 0x4CAF50 });
    this.container.addChild(gfx);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#4CAF50' });
    const label = new Text({ text: 'HAB', style });
    label.anchor.set(0.5);
    this.container.addChild(label);

    consumptionManager.addHousing(HabitationModule.CAPACITY);
  }
}
