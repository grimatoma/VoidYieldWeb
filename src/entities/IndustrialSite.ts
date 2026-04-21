import { Container, Graphics, Sprite } from 'pixi.js';
import { assetManager } from '@services/AssetManager';

/**
 * IndustrialSite — a build plot on the outpost.
 * Renders an outpost floor tile so sites read as "prepared ground" rather than
 * abstract yellow outlines. Occupancy keeps the same tile but is dimmed so the
 * building placed on top stands out.
 */
export class IndustrialSite {
  readonly container: Container;
  readonly siteId: string;
  isOccupied = false;
  private _tile: Sprite | null = null;

  constructor(siteId: string, worldX: number, worldY: number) {
    this.siteId = siteId;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;
    if (assetManager.has('tile_outpost_floor')) {
      const s = new Sprite(assetManager.texture('tile_outpost_floor'));
      s.anchor.set(0.5);
      s.width = 80;
      s.height = 80;
      s.alpha = 0.9;
      this._tile = s;
      this.container.addChild(s);
    } else {
      const gfx = new Graphics();
      gfx.rect(-32, -32, 64, 64).stroke({ width: 2, color: 0xFFCC00 });
      this.container.addChild(gfx);
    }
  }

  occupy(_building: unknown): void {
    this.isOccupied = true;
    if (this._tile) this._tile.alpha = 0.55;
  }

  free(): void {
    this.isOccupied = false;
    if (this._tile) this._tile.alpha = 0.9;
  }
}
