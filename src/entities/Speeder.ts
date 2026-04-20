import { Container, Graphics } from 'pixi.js';
import type { InputManager } from '@services/InputManager';

export class Speeder {
  readonly container: Container;
  x: number;
  y: number;
  readonly speed = 520; // px/s
  readonly carryBonus = 10;
  private _fuel: number;
  static readonly MAX_FUEL = 100;
  private _body!: Graphics;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this._fuel = Speeder.MAX_FUEL;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;
    this._draw();
  }

  private _draw(): void {
    if (this._body) this._body.clear();
    else {
      this._body = new Graphics();
      this.container.addChild(this._body);
    }
    // Wider, lower-profile rectangle than player (it's a vehicle)
    this._body.rect(-14, -8, 28, 16).fill(0xd4a843);
    this._body.rect(-14, -8, 28, 16).stroke({ width: 1, color: 0xffffff });
    // "cockpit" dot
    this._body.circle(4, 0, 3).fill(0x0d1b3e);
  }

  update(delta: number, input: InputManager, bounds: { width: number; height: number }): void {
    if (this._fuel <= 0) return;

    let dx = 0;
    let dy = 0;
    if (input.isHeld('player_move_up')) dy -= 1;
    if (input.isHeld('player_move_down')) dy += 1;
    if (input.isHeld('player_move_left')) dx -= 1;
    if (input.isHeld('player_move_right')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      this.x = Math.max(0, Math.min(bounds.width, this.x + (dx / len) * this.speed * delta));
      this.y = Math.max(0, Math.min(bounds.height, this.y + (dy / len) * this.speed * delta));
      this.container.x = this.x;
      this.container.y = this.y;
      // Fuel drain: 20 gas per 60s of movement
      this._fuel = Math.max(0, this._fuel - delta * (20 / 60));
    }
  }

  refuel(amount: number): void {
    this._fuel = Math.min(Speeder.MAX_FUEL, this._fuel + amount);
  }

  get fuel(): number {
    return this._fuel;
  }

  get isOutOfFuel(): boolean {
    return this._fuel <= 0;
  }
}
