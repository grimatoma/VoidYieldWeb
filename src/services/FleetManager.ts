import type { DroneBase } from '@entities/DroneBase';
import type { DroneType } from '@data/types';
import { EventBus } from './EventBus';
import { droneCount } from '@store/gameStore';
import { depositMap } from './DepositMap';
import { droneAllocationManager } from './DroneAllocationManager';

export class FleetManager {
  private _drones: DroneBase[] = [];

  add(drone: DroneBase): void {
    this._drones.push(drone);
    droneCount.value = this._drones.length;
    EventBus.emit('fleet:count_changed', this._drones.length);
    droneAllocationManager.reconcile();
  }

  remove(droneId: string): void {
    this._drones = this._drones.filter(d => d.id !== droneId);
    droneCount.value = this._drones.length;
    EventBus.emit('fleet:count_changed', this._drones.length);
    droneAllocationManager.reconcile();
  }

  update(delta: number): void {
    for (const drone of this._drones) drone.update(delta);
  }

  getDrones(): readonly DroneBase[] { return this._drones; }

  getActive(): DroneBase[] { return this._drones.filter(d => d.state !== 'IDLE'); }

  clear(): void {
    this._drones = [];
    droneCount.value = 0;
    EventBus.emit('fleet:count_changed', 0);
  }

  getDronesByType(type: DroneType): DroneBase[] {
    return this._drones.filter(d => d.droneType === type);
  }

  getIdleDrones(): DroneBase[] {
    return this._drones.filter(d => d.state === 'IDLE' && d.getTasks().length === 0);
  }

  /** Count of non-disabled drones. */
  getActiveCount(): number {
    return this._drones.filter(d => !d.disabled).length;
  }

  /** Disable a drone (park it). Used internally by DroneAllocationManager. */
  setDroneDisabled(droneId: string, disabled: boolean): { disabled: boolean; ok: boolean } {
    const drone = this._drones.find(d => d.id === droneId);
    if (!drone) return { disabled: false, ok: false };
    if (disabled) {
      drone.clearTasks();
      drone.cargo = null;
      depositMap.releaseClaimsBy(drone.id);
    }
    drone.disabled = disabled;
    EventBus.emit('fleet:roster_changed');
    return { disabled: drone.disabled, ok: true };
  }

  fleetDispatch(): void {
    for (const drone of this._drones) {
      if (drone.loop && drone.getTasks().length === 0) {
        drone.loop = false;
      }
    }
  }
}

export const fleetManager = new FleetManager();
