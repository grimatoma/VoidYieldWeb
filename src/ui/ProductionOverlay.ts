import { Container, Graphics } from 'pixi.js';
import type { ProcessingPlant } from '@entities/ProcessingPlant';
import type { Fabricator } from '@entities/Fabricator';

// Status colors
const STATUS_COLORS = {
  RUNNING: 0x4CAF50,    // green
  PARTIAL: 0xFFC107,    // yellow
  STALLED: 0xF44336,    // red
  STALLED_A: 0xF44336,
  STALLED_B: 0xF44336,
  NO_POWER: 0xF44336,
  IDLE: 0x555555,       // grey
  HOPPER_FULL: 0xFFC107,
  FUEL_EMPTY: 0xF44336,
} as const;

export class ProductionOverlay {
  readonly container: Container;
  private _dimRect: Graphics;
  private _dots: Graphics;
  private _visible = false;

  constructor(worldWidth: number, worldHeight: number) {
    this.container = new Container();
    this.container.visible = false;

    // Dim rectangle (covers whole world, 30% opacity dark overlay)
    this._dimRect = new Graphics();
    this._dimRect.rect(0, 0, worldWidth, worldHeight).fill({ color: 0x000000, alpha: 0.35 });
    this.container.addChild(this._dimRect);

    // Dots layer
    this._dots = new Graphics();
    this.container.addChild(this._dots);
  }

  /** Call each frame when visible to update status dots. */
  render(plants: readonly ProcessingPlant[], fabricators: readonly Fabricator[] = []): void {
    this._dots.clear();

    for (const plant of plants) {
      const color = STATUS_COLORS[plant.state] ?? STATUS_COLORS.IDLE;
      // Draw status dot above building
      this._dots.circle(plant.x, plant.y - 28, 5).fill(color);
      // Outer ring
      this._dots.circle(plant.x, plant.y - 28, 5).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.4 });
    }

    for (const fab of fabricators) {
      const color = STATUS_COLORS[fab.state] ?? STATUS_COLORS.IDLE;
      this._dots.circle(fab.x, fab.y - 28, 5).fill(color);
      this._dots.circle(fab.x, fab.y - 28, 5).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.4 });
    }
  }

  setVisible(v: boolean): void {
    this._visible = v;
    this.container.visible = v;
  }

  get visible(): boolean { return this._visible; }
}
