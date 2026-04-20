import { Container, Graphics } from 'pixi.js';
import type { DroneType, DroneState, DroneTask, QualityLot } from '@data/types';

const DRONE_COLORS: Record<DroneType, number> = {
  scout: 0x2196F3,
  heavy: 0x5C6BC0,
  refinery: 0x43A047,
  survey: 0x00BCD4,
  builder: 0xFDD835,
  cargo: 0x8E24AA,
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
  state: DroneState = 'IDLE';
  cargo: QualityLot | null = null;
  loop = false;

  private _tasks: DroneTask[] = [];
  private _execTimer = 0;
  readonly trailPoints: Array<{ x: number; y: number }> = [];

  private _gfx: Graphics;

  constructor(droneType: DroneType, x: number, y: number, speed: number, carryCapacity: number) {
    this.id = `drone-${_idCounter++}`;
    this.droneType = droneType;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.carryCapacity = carryCapacity;

    this.container = new Container();
    this._gfx = new Graphics();
    this._gfx.circle(0, 0, 5).fill(DRONE_COLORS[droneType]);
    this.container.addChild(this._gfx);
    this.container.x = x;
    this.container.y = y;
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
    this.state = 'IDLE';
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
      return;
    }

    if (this.state === 'IDLE') {
      this.state = 'MOVING_TO_TARGET';
    }

    if (this.state === 'MOVING_TO_TARGET') {
      const dx = task.targetX - this.x;
      const dy = task.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8) {
        this.state = 'EXECUTING';
        this._execTimer = task.executeDurationSec;
      } else {
        const step = this.speed * delta;
        const ratio = Math.min(step / dist, 1);
        this.x += dx * ratio;
        this.y += dy * ratio;
        this.container.x = this.x;
        this.container.y = this.y;
      }
    }

    if (this.state === 'EXECUTING') {
      this._execTimer -= delta;
      if (this._execTimer <= 0) {
        task.onExecute?.();
        this._popTask();
        this.state = 'IDLE';
      }
    }
  }

  private _popTask(): void {
    if (this.loop && this._tasks.length > 0) {
      const t = this._tasks.shift()!;
      this._tasks.push(t);
    } else {
      this._tasks.shift();
    }
  }
}
