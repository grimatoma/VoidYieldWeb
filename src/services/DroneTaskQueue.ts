import type { DroneTask } from '@data/types';

export class DroneTaskQueue {
  private _tasks: DroneTask[] = [];
  loop = false;

  /** Add a task. Returns false if queue is full (5 tasks). */
  push(task: DroneTask): boolean {
    if (this._tasks.length >= 5) return false;
    this._tasks.push(task);
    return true;
  }

  /** Peek at front of queue without removing. */
  peek(): DroneTask | null {
    return this._tasks[0] ?? null;
  }

  /** Remove and return the front task. Re-adds to back if loop=true. */
  complete(): DroneTask | null {
    if (this._tasks.length === 0) return null;
    const task = this._tasks.shift()!;
    if (this.loop) this._tasks.push(task);
    return task;
  }

  clear(): void {
    this._tasks = [];
  }

  getTasks(): readonly DroneTask[] {
    return this._tasks;
  }

  get size(): number {
    return this._tasks.length;
  }

  /** Helper: create a MINE task */
  static mine(targetX: number, targetY: number, onExecute?: () => void): DroneTask {
    return { type: 'MINE', targetX, targetY, executeDurationSec: 2.0, onExecute };
  }

  /** Helper: create a CARRY task */
  static carry(targetX: number, targetY: number, onExecute?: () => void): DroneTask {
    return { type: 'CARRY', targetX, targetY, executeDurationSec: 0.3, onExecute };
  }

  /** Helper: create an IDLE task */
  static idle(): DroneTask {
    return { type: 'IDLE', targetX: 0, targetY: 0, executeDurationSec: 0 };
  }
}
