import { Container, Graphics } from 'pixi.js';
import type { InputManager } from '@services/InputManager';

export interface WorldBounds { width: number; height: number; }

export class Player {
  readonly container: Container;
  x: number;
  y: number;
  readonly speed = 200;

  constructor(startX = 100, startY = 100) {
    this.x = startX;
    this.y = startY;
    this.container = new Container();
    const body = new Graphics();
    body.rect(-16, -16, 32, 32);  // centered
    body.fill(0xFFFFFF);
    this.container.addChild(body);
    this.container.x = startX;
    this.container.y = startY;
  }

  update(delta: number, input: InputManager, bounds: WorldBounds): void {
    let dx = 0;
    let dy = 0;

    if (input.isHeld('player_move_up'))    dy -= this.speed * delta;
    if (input.isHeld('player_move_down'))  dy += this.speed * delta;
    if (input.isHeld('player_move_left'))  dx -= this.speed * delta;
    if (input.isHeld('player_move_right')) dx += this.speed * delta;

    this.x = Math.max(0, Math.min(bounds.width,  this.x + dx));
    this.y = Math.max(0, Math.min(bounds.height, this.y + dy));

    this.container.x = this.x;
    this.container.y = this.y;
  }
}
