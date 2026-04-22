import { Container, Graphics, Sprite } from 'pixi.js';
import type { DroneType, DroneState, DroneTask, OreType, QualityLot } from '@data/types';
import { droneSpriteSheet, dirFromVelocity, type Dir8 } from '@services/DroneSpriteSheet';
import { obstacleManager, type Vec2 } from '@services/ObstacleManager';

const DRONE_COLORS: Record<DroneType, number> = {
  scout: 0x2196F3,
  heavy: 0x5C6BC0,
  refinery: 0x43A047,
  survey: 0x00BCD4,
  builder: 0xFDD835,
  cargo: 0x8E24AA,
  repair: 0xEF5350,
};

let _idCounter = 0;

export class DroneBase {
  readonly id: string;
  readonly container: Container;
  x: number;
  y: number;
  readonly droneType: DroneType;
  readonly speed: number;       // px/s
  readonly carryCapacity: number;
  /** Seconds to extract a single load of ore from a deposit (GDD §11). */
  readonly mineTimeSec: number;
  state: DroneState = 'IDLE';
  cargo: QualityLot | null = null;
  loop = false;
  /** When true the drone parks and the mining dispatcher skips it. Toggled
   * from the Drone Bay UI. Bay-slot cap (gameState.maxActiveDrones) limits
   * how many drones can be enabled at once. */
  disabled = false;
  /** Preferred ore type for auto-mining. null = "any" (default). Set via the
   * Drone Bay roster dropdown. Ignored for non-miner drone types. */
  orePreference: OreType | null = null;

  private _tasks: DroneTask[] = [];
  private _execTimer = 0;
  /** Cached hop sequence for the current task when routed around walls. The
   * final entry is the task's actual target. Cleared whenever the task
   * changes. */
  private _pathHops: Vec2[] | null = null;
  private _pathTaskTargetX = 0;
  private _pathTaskTargetY = 0;
  readonly trailPoints: Array<{ x: number; y: number }> = [];

  private _sprite: Sprite | null = null;
  private _tint: Graphics | null = null;
  private _fallback: Graphics | null = null;
  private _miningBar: Graphics;
  private _facing: Dir8 = 's';
  private _animClock = 0;
  private _execDurationSec = 0; // captured when EXECUTING begins, for progress calc

  constructor(droneType: DroneType, x: number, y: number, speed: number, carryCapacity: number, mineTimeSec = 3.0) {
    this.id = `drone-${_idCounter++}`;
    this.droneType = droneType;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.carryCapacity = carryCapacity;
    this.mineTimeSec = mineTimeSec;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    droneSpriteSheet.ensureLoaded();
    if (droneSpriteSheet.isLoaded) {
      // Colored disc behind the sprite so drone-type is readable at a glance
      // (per the color-by-type spec in 04_drone_swarm.md).
      this._tint = new Graphics();
      this._tint.circle(0, 0, 14).fill({ color: DRONE_COLORS[droneType], alpha: 0.45 });
      this._tint.circle(0, 0, 14).stroke({ color: DRONE_COLORS[droneType], width: 1.5 });
      this.container.addChild(this._tint);

      this._sprite = new Sprite(droneSpriteSheet.frame('s', 0) ?? undefined);
      this._sprite.anchor.set(0.5);
      this._sprite.width = 32;
      this._sprite.height = 32;
      this.container.addChild(this._sprite);
    } else {
      // Fallback: small colored circle (older render, kept for tests without
      // the spritesheet loaded).
      this._fallback = new Graphics();
      this._fallback.circle(0, 0, 5).fill(DRONE_COLORS[droneType]);
      this.container.addChild(this._fallback);
    }

    // Added last so the bar renders on top of the drone sprite.
    this._miningBar = new Graphics();
    this.container.addChild(this._miningBar);
  }

  pushTask(task: DroneTask): boolean {
    if (this._tasks.length >= 5) return false;
    this._tasks.push(task);
    return true;
  }

  peekTask(): DroneTask | null {
    return this._tasks[0] ?? null;
  }

  clearTasks(): void {
    this._tasks = [];
    this._pathHops = null;
    this.state = 'IDLE';
    this._drawMiningBar(0);
  }

  getTasks(): readonly DroneTask[] {
    return this._tasks;
  }

  update(delta: number): void {
    // trail: keep last 20 positions
    if (this.state !== 'IDLE') {
      this.trailPoints.push({ x: this.x, y: this.y });
      if (this.trailPoints.length > 20) this.trailPoints.shift();
    }

    const task = this._tasks[0];

    if (!task || task.type === 'IDLE') {
      this.state = 'IDLE';
      if (task?.type === 'IDLE') this._popTask();
      this._advanceAnim(delta, false, 0, 0);
      return;
    }

    if (this.state === 'IDLE') {
      this.state = 'MOVING_TO_TARGET';
    }

    if (this.state === 'MOVING_TO_TARGET') {
      // Compute / refresh the routed hop list. If the task changed under us
      // (different cached target), re-plan.
      if (
        this._pathHops === null
        || this._pathTaskTargetX !== task.targetX
        || this._pathTaskTargetY !== task.targetY
      ) {
        this._pathHops = obstacleManager.findPath(this.x, this.y, task.targetX, task.targetY);
        this._pathTaskTargetX = task.targetX;
        this._pathTaskTargetY = task.targetY;
      }

      const hop = this._pathHops[0] ?? { x: task.targetX, y: task.targetY };
      const dx = hop.x - this.x;
      const dy = hop.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 8) {
        // Reached this hop. If it was an intermediate waypoint, advance to
        // the next; if it was the final target, begin EXECUTING.
        this._pathHops.shift();
        if (this._pathHops.length === 0) {
          this.state = 'EXECUTING';
          this._execTimer = task.executeDurationSec;
          this._execDurationSec = task.executeDurationSec;
          this._pathHops = null;
        }
        this._advanceAnim(delta, false, dx, dy);
      } else {
        const step = this.speed * delta;
        const ratio = Math.min(step / dist, 1);
        this.x += dx * ratio;
        this.y += dy * ratio;
        this.container.x = this.x;
        this.container.y = this.y;
        this._advanceAnim(delta, true, dx, dy);
      }
    }

    if (this.state === 'EXECUTING') {
      this._execTimer -= delta;
      this._advanceAnim(delta, false, 0, 0);
      if (task.type === 'MINE' && this._execDurationSec > 0) {
        const progress = 1 - (this._execTimer / this._execDurationSec);
        this._drawMiningBar(Math.max(0, Math.min(1, progress)));
      } else {
        this._drawMiningBar(0);
      }
      if (this._execTimer <= 0) {
        task.onExecute?.();
        this._popTask();
        this.state = 'IDLE';
        this._drawMiningBar(0);
      }
      return;
    }

    this._drawMiningBar(0);
  }

  private _drawMiningBar(progress: number): void {
    this._miningBar.clear();
    if (progress <= 0) return;

    const barWidth = 24;
    const barHeight = 3;
    const barX = -barWidth / 2;
    const barY = -22; // above the drone sprite

    this._miningBar.rect(barX, barY, barWidth, barHeight);
    this._miningBar.fill(0x333333);

    this._miningBar.rect(barX, barY, barWidth * progress, barHeight);
    this._miningBar.fill(0x00B8D4);
  }

  /** Update facing texture + frame. `moving` drives frame cycle; when false, holds frame 0. */
  private _advanceAnim(delta: number, moving: boolean, dx: number, dy: number): void {
    if (!this._sprite) return;
    if (moving) {
      this._facing = dirFromVelocity(dx, dy);
      this._animClock += delta;
    } else {
      this._animClock = 0;
    }
    const frameIdx = moving ? Math.floor(this._animClock * 10) : 0;
    const tex = droneSpriteSheet.frame(this._facing, frameIdx);
    if (tex) this._sprite.texture = tex;
  }

  private _popTask(): void {
    if (this.loop && this._tasks.length > 0) {
      const t = this._tasks.shift()!;
      this._tasks.push(t);
    } else {
      this._tasks.shift();
    }
    this._pathHops = null;
  }
}
