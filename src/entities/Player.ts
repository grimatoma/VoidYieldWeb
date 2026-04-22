import { Container, Graphics, Sprite } from 'pixi.js';
import type { InputManager } from '@services/InputManager';
import { assetManager } from '@services/AssetManager';
import { playerSpriteSheet, type PlayerAnimState } from '@services/PlayerSpriteSheet';
import { miningService } from '@services/MiningService';
import { obstacleManager, type Vec2 } from '@services/ObstacleManager';

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
  private _miningBar: Graphics;
  private _animState: PlayerAnimState = 'idle';
  private _animClock = 0;     // seconds since this animation started
  private _frameIdx = 0;

  /**
   * Tap-to-move path in world coordinates. When non-empty (and no movement key
   * is held), the player walks toward `_movePath[0]` at `speed`, popping each
   * waypoint on arrival. The path is produced by `obstacleManager.findPath`
   * so the player routes around walls via registered navigation waypoints.
   */
  private _movePath: Vec2[] = [];
  /** Final destination the path was computed toward (kept for recomputes). */
  private _moveFinal: Vec2 | null = null;
  /**
   * Fired once the last waypoint is reached. Used by scenes to trigger an
   * auto-interact (e.g. start mining when the tap was on an ore deposit).
   * Cleared after firing, when keyboard takes over, or on give-up.
   */
  private _onArrive: (() => void) | null = null;
  /** Consecutive frames with a path active but zero progress. */
  private _stuckFrames = 0;
  /** Squared "arrived" distance — within this radius the waypoint pops. */
  private static readonly TARGET_ARRIVE_DIST = 4;

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

    this._miningBar = new Graphics();
    this.container.addChild(this._miningBar);

    this.container.x = startX;
    this.container.y = startY;

    // Try to upgrade to the sliced sheet texture now; if assets aren't loaded
    // yet, the per-frame update() will pick it up once available.
    this._applyFrameTexture();
  }

  /**
   * Set a tap-to-move target. The player walks toward (x, y) along a path
   * that routes around registered walls via the obstacle graph, until it
   * arrives, is blocked for too long, or the user grabs the keyboard.
   * `onArrive` (if given) fires once the final waypoint is reached; it does
   * not fire if the move is cancelled or gives up.
   */
  setMoveTarget(x: number, y: number, onArrive?: () => void): void {
    this._moveFinal = { x, y };
    this._movePath = obstacleManager.findPath(this.x, this.y, x, y);
    this._onArrive = onArrive ?? null;
    this._stuckFrames = 0;
  }

  /** Cancel any active tap-to-move target (and drop the arrive callback). */
  clearMoveTarget(): void {
    this._movePath = [];
    this._moveFinal = null;
    this._onArrive = null;
    this._stuckFrames = 0;
  }

  /** Read-only view of the current tap-to-move final target (for tests / UI). */
  get moveTarget(): { x: number; y: number } | null {
    return this._moveFinal;
  }

  update(delta: number, input: InputManager, bounds: WorldBounds): void {
    let dx = 0;
    let dy = 0;

    const keyboardActive =
      input.isHeld('player_move_up')   ||
      input.isHeld('player_move_down') ||
      input.isHeld('player_move_left') ||
      input.isHeld('player_move_right');

    if (keyboardActive) {
      // Keyboard always wins over tap-to-move so the player can interrupt a
      // long walk by simply pressing WASD.
      this._movePath = [];
      this._moveFinal = null;
      this._onArrive = null;
      this._stuckFrames = 0;
      if (input.isHeld('player_move_up'))    dy -= this.speed * delta;
      if (input.isHeld('player_move_down'))  dy += this.speed * delta;
      if (input.isHeld('player_move_left'))  dx -= this.speed * delta;
      if (input.isHeld('player_move_right')) dx += this.speed * delta;
    } else if (this._movePath.length > 0) {
      // Pop any waypoints we're already within arrive distance of (covers the
      // case where a short recompute produced a node right on top of us).
      while (this._movePath.length > 0) {
        const next = this._movePath[0];
        const dxw = next.x - this.x;
        const dyw = next.y - this.y;
        if (dxw * dxw + dyw * dyw <= Player.TARGET_ARRIVE_DIST * Player.TARGET_ARRIVE_DIST) {
          this._movePath.shift();
        } else {
          break;
        }
      }
      if (this._movePath.length === 0) {
        // Path exhausted this frame — fire the arrive callback and stop.
        const cb = this._onArrive;
        this._moveFinal = null;
        this._onArrive = null;
        this._stuckFrames = 0;
        if (cb) cb();
      } else {
        const next = this._movePath[0];
        const tx = next.x - this.x;
        const ty = next.y - this.y;
        const tdist = Math.sqrt(tx * tx + ty * ty);
        const step = Math.min(this.speed * delta, tdist);
        dx = (tx / tdist) * step;
        dy = (ty / tdist) * step;
      }
    }

    // Axis-separated, substepped movement so the player slides along walls
    // rather than sticking when pushing diagonally into a corner, and can't
    // tunnel through thin walls when dt spikes. Each axis is rejected
    // independently if it would put the collision circle inside a wall.
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxStep = 6; // stays below the outpost wall thickness (14px)
    const steps = Math.max(1, Math.ceil(dist / maxStep));
    const stepDx = dx / steps;
    const stepDy = dy / steps;
    const startX = this.x;
    const startY = this.y;
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

    // Path progress bookkeeping: pop the active waypoint if we arrived on it,
    // and handle stall detection (blocked by geometry the graph doesn't know
    // about). First stall frame triggers a one-shot recompute from the
    // current position; a second stall frame gives up so the player doesn't
    // grind forever.
    if (this._movePath.length > 0) {
      const next = this._movePath[0];
      const rx = next.x - this.x;
      const ry = next.y - this.y;
      const arrived = rx * rx + ry * ry <= Player.TARGET_ARRIVE_DIST * Player.TARGET_ARRIVE_DIST;
      if (arrived) {
        this._movePath.shift();
        this._stuckFrames = 0;
        if (this._movePath.length === 0) {
          const cb = this._onArrive;
          this._moveFinal = null;
          this._onArrive = null;
          if (cb) cb();
        }
      } else if ((dx !== 0 || dy !== 0) && this.x === startX && this.y === startY) {
        if (this._stuckFrames === 0 && this._moveFinal) {
          const recomputed = obstacleManager.findPath(this.x, this.y, this._moveFinal.x, this._moveFinal.y);
          if (recomputed.length > 0) this._movePath = recomputed;
          this._stuckFrames = 1;
        } else {
          this._movePath = [];
          this._moveFinal = null;
          this._onArrive = null;
          this._stuckFrames = 0;
        }
      } else {
        this._stuckFrames = 0;
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
    this._drawMiningBar(miningService.progress);
  }

  private _drawMiningBar(progress: number): void {
    this._miningBar.clear();
    if (progress <= 0) return;

    const barWidth = 28;
    const barHeight = 4;
    const barX = -barWidth / 2;
    const barY = -54; // above the player's head

    this._miningBar.rect(barX, barY, barWidth, barHeight);
    this._miningBar.fill(0x333333);

    this._miningBar.rect(barX, barY, barWidth * progress, barHeight);
    this._miningBar.fill(0x00B8D4);
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
