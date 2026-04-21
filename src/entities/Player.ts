import { Container, Sprite } from 'pixi.js';
import type { InputManager } from '@services/InputManager';
import { assetManager } from '@services/AssetManager';
import { playerSpriteSheet, type PlayerAnimState } from '@services/PlayerSpriteSheet';
import { miningService } from '@services/MiningService';
import { obstacleManager } from '@services/ObstacleManager';

export interface WorldBounds { width: number; height: number; }

export type PlayerFacing = 'ne' | 'nw' | 'se' | 'sw' | 'e' | 'w';

/**
 * Frame-per-second for each animation loop. Mining strikes feel best at a
 * slightly slower cadence so the wind-up and follow-through read clearly.
 */
const FPS_BY_STATE: Record<PlayerAnimState, number> = {
  idle: 3,
  walk: 10,
  mine: 6,
};

export class Player {
  readonly container: Container;
  x: number;
  y: number;
  readonly speed = 200;
  /** Footprint radius used for wall collision; matches the sprite's ~20px base. */
  readonly collisionRadius = 10;
  facing: PlayerFacing = 'se';

  /**
   * Drives the mining animation. Scenes set this true while the E key is held
   * near a deposit so the sprite swings a pickaxe. Cleared each frame and
   * re-set by the scene's interact loop.
   */
  mining = false;

  private sprite: Sprite;
  private _animState: PlayerAnimState = 'idle';
  private _animClock = 0;     // seconds since this animation started
  private _frameIdx = 0;

  constructor(startX = 100, startY = 100) {
    this.x = startX;
    this.y = startY;
    this.container = new Container();
    this.sprite = new Sprite(assetManager.texture('player_se'));
    // Anchor toward the feet so the world position corresponds to the ground
    // contact point (y=46 on a 48-tall frame ≈ 0.9 anchor).
    this.sprite.anchor.set(0.5, 0.9);
    this.sprite.width = 36;
    this.sprite.height = 52;
    this.container.addChild(this.sprite);
    this.container.x = startX;
    this.container.y = startY;

    // Try to upgrade to the sliced sheet texture now; if assets aren't loaded
    // yet, the per-frame update() will pick it up once available.
    this._applyFrameTexture();
  }

  update(delta: number, input: InputManager, bounds: WorldBounds): void {
    let dx = 0;
    let dy = 0;

    if (input.isHeld('player_move_up'))    dy -= this.speed * delta;
    if (input.isHeld('player_move_down'))  dy += this.speed * delta;
    if (input.isHeld('player_move_left'))  dx -= this.speed * delta;
    if (input.isHeld('player_move_right')) dx += this.speed * delta;

    // Axis-separated, substepped movement so the player slides along walls
    // rather than sticking when pushing diagonally into a corner, and can't
    // tunnel through thin walls when dt spikes. Each axis is rejected
    // independently if it would put the collision circle inside a wall.
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxStep = 6; // stays below the outpost wall thickness (14px)
    const steps = Math.max(1, Math.ceil(dist / maxStep));
    const stepDx = dx / steps;
    const stepDy = dy / steps;
    for (let i = 0; i < steps; i++) {
      const nextX = Math.max(0, Math.min(bounds.width, this.x + stepDx));
      if (!obstacleManager.isBlocked(nextX, this.y, this.collisionRadius)) {
        this.x = nextX;
      }
      const nextY = Math.max(0, Math.min(bounds.height, this.y + stepDy));
      if (!obstacleManager.isBlocked(this.x, nextY, this.collisionRadius)) {
        this.y = nextY;
      }
    }

    this.container.x = this.x;
    this.container.y = this.y;

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      // Facing rules:
      //   • Both axes active (diagonal input) → NE/NW/SE/SW isometric view.
      //   • Pure horizontal → E/W side profile.
      //   • Pure vertical → keep the current hemisphere's diagonal so the
      //     sprite doesn't snap sideways (default east if we have no prior).
      if (dx !== 0 && dy !== 0) {
        this.facing = dy < 0
          ? (dx > 0 ? 'ne' : 'nw')
          : (dx > 0 ? 'se' : 'sw');
      } else if (dx !== 0) {
        this.facing = dx > 0 ? 'e' : 'w';
      } else {
        // dy !== 0, dx === 0: preserve the east/west bias of the current
        // facing so pressing W alone from 'ne' keeps you facing 'ne'.
        const onEast = this.facing === 'e' || this.facing === 'ne' || this.facing === 'se';
        this.facing = dy < 0
          ? (onEast ? 'ne' : 'nw')
          : (onEast ? 'se' : 'sw');
      }
    }

    // Animation state priority: mining > walking > idle. Scenes can force the
    // mining pose by setting player.mining, but we also poll miningService so
    // the correct state shows up automatically while hold-to-mine is active.
    const isMining = this.mining || miningService.isMining;
    const nextState: PlayerAnimState = isMining
      ? 'mine'
      : moving
        ? 'walk'
        : 'idle';

    if (nextState !== this._animState) {
      this._animState = nextState;
      this._animClock = 0;
      this._frameIdx = 0;
    } else {
      this._animClock += delta;
      const fps = FPS_BY_STATE[this._animState];
      this._frameIdx = Math.floor(this._animClock * fps);
    }

    this._applyFrameTexture();
  }

  /** Resolve the current (dir, state, frameIdx) to a texture on the sprite. */
  private _applyFrameTexture(): void {
    const tex = playerSpriteSheet.frame(this.facing, this._animState, this._frameIdx);
    if (tex) {
      this.sprite.texture = tex;
    } else {
      // Fallback to a static per-direction PNG when the sheet is unavailable
      // (e.g. in unit tests where assets aren't loaded). Pure E/W have no
      // dedicated legacy asset, so collapse them onto the nearest diagonal.
      const fallbackDir = this.facing === 'e' ? 'se'
        : this.facing === 'w' ? 'sw'
        : this.facing;
      this.sprite.texture = assetManager.texture(`player_${fallbackDir}`);
    }
    // All procedural bounce/sway is now baked into the sheet; keep the sprite
    // flat so world position matches the frame's ground anchor.
    this.sprite.y = 0;
    this.sprite.rotation = 0;
  }
}
