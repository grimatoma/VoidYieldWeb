import { Container, Graphics } from 'pixi.js';

export class MinimapOverlay {
  readonly container: Container;
  private dot: Graphics;
  private readonly mapWidth: number;
  private readonly mapHeight: number;
  private readonly worldWidth: number;
  private readonly worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, screenWidth: number, screenHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.mapWidth = Math.round(worldWidth * 0.15);
    this.mapHeight = Math.round(worldHeight * 0.15);

    this.container = new Container();
    // Position: bottom-right, 10px margin
    this.container.x = screenWidth - this.mapWidth - 10;
    this.container.y = screenHeight - this.mapHeight - 10;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, this.mapWidth, this.mapHeight);
    bg.fill({ color: 0x0D1B3E, alpha: 0.85 });
    this.container.addChild(bg);

    // Border
    const border = new Graphics();
    border.rect(0, 0, this.mapWidth, this.mapHeight);
    border.stroke({ width: 1, color: 0x4A90D9 });
    this.container.addChild(border);

    // Player dot
    this.dot = new Graphics();
    this.dot.circle(0, 0, 3);
    this.dot.fill(0xFF00FF);
    this.container.addChild(this.dot);
  }

  update(playerPos: { x: number; y: number }): void {
    this.dot.x = (playerPos.x / this.worldWidth) * this.mapWidth;
    this.dot.y = (playerPos.y / this.worldHeight) * this.mapHeight;
  }
}
