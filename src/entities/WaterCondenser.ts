// FIXME: Water source for A1 not defined in spec. This is a placeholder building.
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { StorageDepot } from './StorageDepot';

export class WaterCondenser {
  static readonly COST_CR = 300;
  static readonly WATER_PER_DAY = 5;

  readonly container: Container;
  readonly x: number;
  readonly y: number;

  private _depot: StorageDepot | null = null;
  private _dayTimer = 0;
  private static readonly DAY_SECONDS = 1200; // 1 in-game day = 20 real minutes

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    const gfx = new Graphics();
    gfx.rect(-18, -18, 36, 36).fill(0x0A1A2A).stroke({ width: 2, color: 0x29B6F6 });
    this.container.addChild(gfx);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#29B6F6' });
    const label = new Text({ text: 'H2O', style });
    label.anchor.set(0.5);
    this.container.addChild(label);
  }

  link(depot: StorageDepot): void {
    this._depot = depot;
  }

  update(delta: number): void {
    this._dayTimer += delta;
    if (this._dayTimer >= WaterCondenser.DAY_SECONDS) {
      this._dayTimer -= WaterCondenser.DAY_SECONDS;
      this._depot?.deposit([{ oreType: 'water', quantity: WaterCondenser.WATER_PER_DAY, attributes: {} }]);
    }
  }
}
