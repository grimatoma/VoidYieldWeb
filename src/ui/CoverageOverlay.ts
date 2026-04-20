import { Container, Graphics } from 'pixi.js';
import type { DroneBay } from '@entities/DroneBay';

export class CoverageOverlay {
  readonly container: Container;
  private _gfx: Graphics;
  private _visible = false;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this._gfx = new Graphics();
    this.container.addChild(this._gfx);
  }

  setVisible(visible: boolean): void {
    this._visible = visible;
    this.container.visible = visible;
  }

  get visible(): boolean {
    return this._visible;
  }

  /** Draw coverage circle for each bay. Call when toggled or after bay added. */
  render(bays: readonly DroneBay[]): void {
    this._gfx.clear();
    for (const bay of bays) {
      this._gfx
        .circle(bay.x, bay.y, bay.serviceRadius)
        .fill({ color: 0x2196F3, alpha: 0.07 })
        .stroke({ color: 0x2196F3, width: 1, alpha: 0.3 });
    }
  }
}
