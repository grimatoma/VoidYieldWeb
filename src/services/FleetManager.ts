import type { DroneBase } from '@entities/DroneBase';

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
}

export const fleetManager = new FleetManager();
