import type { DroneBase } from '@entities/DroneBase';
import type { HarvesterBase } from '@entities/HarvesterBase';
import type { StorageDepot } from '@entities/StorageDepot';
import { harvesterManager } from '@services/HarvesterManager';
import { fleetManager } from '@services/FleetManager';

export class ZoneManager {
  private _active = false;
  private _fuelSourceX = 0;
  private _fuelSourceY = 0;
  private _depot: StorageDepot | null = null;
  private _scanTimer = 0;
  private _dispatched = new Set<string>();  // drone IDs dispatched this tick

  /**
   * Enable AUTO-HARVEST-SUPPORT zone behavior.
   * @param fuelSourceX  GasCollector world position X
   * @param fuelSourceY  GasCollector world position Y
   * @param depot        StorageDepot to deliver ore to
   */
  enable(fuelSourceX: number, fuelSourceY: number, depot: StorageDepot): void {
    this._active = true;
    this._fuelSourceX = fuelSourceX;
    this._fuelSourceY = fuelSourceY;
    this._depot = depot;
  }

  disable(): void {
    this._active = false;
  }

  update(delta: number): void {
    if (!this._active || !this._depot) return;

    // Scan every 3 seconds to avoid over-dispatching
    this._scanTimer += delta;
    if (this._scanTimer < 3.0) return;
    this._scanTimer = 0;
    this._dispatched.clear();

    for (const h of harvesterManager.getAll()) {
      if (h.state === 'FUEL_EMPTY') {
        const drone = this._findIdleRefinery();
        if (drone) this._assignFuelCircuit(drone, h);
      } else if (h.state === 'HOPPER_FULL') {
        const drone = this._findIdleRefinery();
        if (drone) this._assignEmptyCircuit(drone, h);
      }
    }
  }

  private _findIdleRefinery(): DroneBase | null {
    return fleetManager.getDrones().find(
      d => d.droneType === 'refinery' &&
           d.state === 'IDLE' &&
           d.getTasks().length === 0 &&
           !this._dispatched.has(d.id)
    ) ?? null;
  }

  private _assignFuelCircuit(drone: DroneBase, harvester: HarvesterBase): void {
    this._dispatched.add(drone.id);
    drone.loop = true;

    // Step 1: go to fuel source, pick up gas
    drone.pushTask({
      type: 'CARRY',
      targetX: this._fuelSourceX,
      targetY: this._fuelSourceY,
      executeDurationSec: 0.5,
      onExecute: () => {
        const qty = Math.min(drone.carryCapacity, 50);
        drone.cargo = { oreType: 'gas', quantity: qty, attributes: {} };
      },
    });

    // Step 2: go to harvester, deposit gas
    drone.pushTask({
      type: 'CARRY',
      targetX: harvester.config.worldX,
      targetY: harvester.config.worldY,
      executeDurationSec: 0.5,
      onExecute: () => {
        if (drone.cargo) {
          harvester.refuel(drone.cargo.quantity);
          drone.cargo = null;
        }
      },
    });
  }

  private _assignEmptyCircuit(drone: DroneBase, harvester: HarvesterBase): void {
    this._dispatched.add(drone.id);
    drone.loop = true;

    // Step 1: go to harvester, empty hopper
    drone.pushTask({
      type: 'CARRY',
      targetX: harvester.config.worldX,
      targetY: harvester.config.worldY,
      executeDurationSec: 0.5,
      onExecute: () => {
        drone.cargo = harvester.emptyHopper();
      },
    });

    // Step 2: go to depot, deposit cargo
    drone.pushTask({
      type: 'CARRY',
      targetX: this._depot!.x,
      targetY: this._depot!.y,
      executeDurationSec: 0.3,
      onExecute: () => {
        if (drone.cargo && drone.cargo.quantity > 0) {
          this._depot!.deposit([drone.cargo]);
          drone.cargo = null;
        }
      },
    });
  }

  reset(): void {
    this._active = false;
    this._dispatched.clear();
    this._scanTimer = 0;
  }
}

export const zoneManager = new ZoneManager();
