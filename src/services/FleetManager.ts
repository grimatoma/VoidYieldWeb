import type { DroneBase } from '@entities/DroneBase';
import type { DroneType } from '@data/types';

export class FleetManager {
  private _drones: DroneBase[] = [];

  add(drone: DroneBase): void {
    this._drones.push(drone);
  }

  remove(droneId: string): void {
    this._drones = this._drones.filter(d => d.id !== droneId);
  }

  update(delta: number): void {
    for (const drone of this._drones) {
      drone.update(delta);
    }
  }

  getDrones(): readonly DroneBase[] {
    return this._drones;
  }

  /** Returns drones that are not IDLE. */
  getActive(): DroneBase[] {
    return this._drones.filter(d => d.state !== 'IDLE');
  }

  clear(): void {
    this._drones = [];
  }

  getDronesByType(type: DroneType): DroneBase[] {
    return this._drones.filter(d => d.droneType === type);
  }

  getIdleDrones(): DroneBase[] {
    return this._drones.filter(d => d.state === 'IDLE' && d.getTasks().length === 0);
  }

  /** Resume loop circuits on all idle drones that have a previous circuit. */
  fleetDispatch(): void {
    // Drones with loop=true but no pending tasks were interrupted — re-trigger their update
    for (const drone of this._drones) {
      if (drone.loop && drone.getTasks().length === 0) {
        drone.loop = false;  // will be re-set by ZoneManager on next scan
      }
    }
  }
}

export const fleetManager = new FleetManager();
