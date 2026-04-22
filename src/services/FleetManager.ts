import type { DroneBase } from '@entities/DroneBase';
import type { DroneType } from '@data/types';
import { EventBus } from './EventBus';
import { droneCount } from '@store/gameStore';
import { gameState } from './GameState';
import { depositMap } from './DepositMap';

export class FleetManager {
  private _drones: DroneBase[] = [];

  add(drone: DroneBase): void {
    this._drones.push(drone);
    // Respect bay-slot cap on purchase: if activating this drone would exceed
    // gameState.maxActiveDrones, park it disabled so the player can decide
    // what to rotate out.
    if (this.getActiveCount() > gameState.maxActiveDrones) {
      drone.disabled = true;
    }
    droneCount.value = this._drones.length;
    EventBus.emit('fleet:count_changed', this._drones.length);
  }

  remove(droneId: string): void {
    this._drones = this._drones.filter(d => d.id !== droneId);
    droneCount.value = this._drones.length;
    EventBus.emit('fleet:count_changed', this._drones.length);
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
    droneCount.value = 0;
    EventBus.emit('fleet:count_changed', 0);
  }

  getDronesByType(type: DroneType): DroneBase[] {
    return this._drones.filter(d => d.droneType === type);
  }

  getIdleDrones(): DroneBase[] {
    return this._drones.filter(d => d.state === 'IDLE' && d.getTasks().length === 0);
  }

  /** Count of drones currently eligible to work — i.e., not disabled. This is
   * what the bay-slot cap limits. */
  getActiveCount(): number {
    return this._drones.filter(d => !d.disabled).length;
  }

  /** Toggle a drone's disabled flag, rejecting enable requests that would
   * exceed gameState.maxActiveDrones. Returns the new disabled state (so the
   * UI can re-render) and whether the request was honored. */
  setDroneDisabled(droneId: string, disabled: boolean): { disabled: boolean; ok: boolean } {
    const drone = this._drones.find(d => d.id === droneId);
    if (!drone) return { disabled: false, ok: false };

    if (!disabled) {
      // Enabling: check cap. Already-enabled count excludes this drone.
      const otherActive = this._drones.filter(d => d !== drone && !d.disabled).length;
      if (otherActive + 1 > gameState.maxActiveDrones) {
        return { disabled: drone.disabled, ok: false };
      }
    } else {
      // Disabling: drop any in-flight tasks so the drone parks, and release
      // any deposit claim it was holding so another drone can pick up there.
      drone.clearTasks();
      drone.cargo = null;
      depositMap.releaseClaimsBy(drone.id);
    }
    drone.disabled = disabled;
    EventBus.emit('fleet:roster_changed');
    return { disabled: drone.disabled, ok: true };
  }

  /** Set the preferred ore type for a drone (miners only; ignored by state
   * machine for non-miner types). */
  setDroneOrePreference(droneId: string, orePref: DroneBase['orePreference']): boolean {
    const drone = this._drones.find(d => d.id === droneId);
    if (!drone) return false;
    drone.orePreference = orePref;
    // If the drone is mid-circuit on a now-unwanted deposit, let it finish —
    // clearing mid-MINE would leave the claim dangling. Next circuit will use
    // the new preference.
    EventBus.emit('fleet:roster_changed');
    return true;
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
