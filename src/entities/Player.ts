import { Container, Sprite } from 'pixi.js';
import type { InputManager } from '@services/InputManager';
import { assetManager } from '@services/AssetManager';

export interface WorldBounds { width: number; height: number; }

export type PlayerFacing = 'ne' | 'nw' | 'se' | 'sw';

export class Player {
  readonly container: Container;
  x: number;
  y: number;
  readonly speed = 200;
  facing: PlayerFacing = 'se';
  private sprite: Sprite;
  private _walkClock = 0; // seconds accumulated while moving; drives bounce

  constructor(startX = 100, startY = 100) {
    this.x = startX;
    this.y = startY;
    this.container = new Container();
    this.sprite = new Sprite(assetManager.texture('player_se'));
    this.sprite.anchor.set(0.5, 0.8);
    this.sprite.width = 36;
    this.sprite.height = 52;
    this.container.addChild(this.sprite);
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

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      this._walkClock += delta;
      const goingUp = dy < 0;
      const goingRight = dx > 0;
      const next: PlayerFacing = goingUp
        ? (goingRight ? 'ne' : 'nw')
        : (goingRight ? 'se' : 'sw');
      if (next !== this.facing) {
        this.facing = next;
        this.sprite.texture = assetManager.texture(`player_${next}`);
      }
      // Bounce: ~4 hz sine modulates vertical offset by a few pixels.
      const bounce = Math.sin(this._walkClock * Math.PI * 8) * 2;
      this.sprite.y = bounce;
      // Sway: slight horizontal lean alternating with steps.
      this.sprite.rotation = Math.sin(this._walkClock * Math.PI * 8) * 0.04;
    } else {
      // Dampen back to rest when idle.
      this._walkClock = 0;
      this.sprite.y = 0;
      this.sprite.rotation = 0;
    }
  }
}
