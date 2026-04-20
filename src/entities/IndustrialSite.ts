import { Container, Graphics } from 'pixi.js';

export class IndustrialSite {
  readonly container: Container;
  readonly siteId: string;
  isOccupied = false;
  private rect: Graphics;

  constructor(siteId: string, worldX: number, worldY: number) {
    this.siteId = siteId;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;
    this.rect = new Graphics();
    this._drawEmpty();
    this.container.addChild(this.rect);
  }

  private _drawEmpty(): void {
    this.rect.clear();
    this.rect.rect(-32, -32, 64, 64);
    this.rect.stroke({ width: 2, color: 0xFFCC00 });
  }

  private _drawOccupied(): void {
    this.rect.clear();
    this.rect.rect(-32, -32, 64, 64);
    this.rect.fill(0xD4A843);
  }

  occupy(_building: unknown): void {
    this.isOccupied = true;
    this._drawOccupied();
  }

  free(): void {
    this.isOccupied = false;
    this._drawEmpty();
  }
}
