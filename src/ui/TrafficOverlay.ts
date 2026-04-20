import { Container, Graphics } from 'pixi.js';
import type { DroneBase } from '@entities/DroneBase';

const TRAIL_COLORS: Record<string, number> = {
  scout:    0x2196F3,
  heavy:    0x5C6BC0,
  refinery: 0x43A047,
  survey:   0x00BCD4,
  builder:  0xFDD835,
  cargo:    0x8E24AA,
};

export class TrafficOverlay {
  readonly container: Container;
  private _gfx: Graphics;
  private _visible = false;

  constructor() {
    this.container = new Container();
    this._gfx = new Graphics();
    this.container.addChild(this._gfx);
    this.container.visible = false;
  }

  update(drones: readonly DroneBase[]): void {
    if (!this._visible) return;
    this._gfx.clear();
    for (const drone of drones) {
      if (drone.trailPoints.length < 2) continue;
      const color = TRAIL_COLORS[drone.droneType] ?? 0xFFFFFF;
      const pts = drone.trailPoints;
      this._gfx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        this._gfx.lineTo(pts[i].x, pts[i].y);
      }
      this._gfx.stroke({ color, width: 1, alpha: 0.6 });
    }
  }

  setVisible(v: boolean): void {
    this._visible = v;
    this.container.visible = v;
  }

  get visible(): boolean {
    return this._visible;
  }
}
