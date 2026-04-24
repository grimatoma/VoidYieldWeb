import type { OreType, DroneType } from '@data/types';
import { EventBus } from './EventBus';

const MINER_TYPES: ReadonlySet<DroneType> = new Set<DroneType>(['scout', 'heavy']);
const LOGISTICS_TYPES: ReadonlySet<DroneType> = new Set<DroneType>(['refinery', 'cargo']);

class DroneAllocationManager {
  /** Number of miners allocated to each ore type. oreType→count. */
  private _minerAlloc: Map<OreType, number> = new Map();
  /** Number of logistics drones that should be active (not disabled). */
  private _logisticsAlloc = 0;

  getMinerAlloc(): ReadonlyMap<OreType, number> {
    return this._minerAlloc;
  }

  getLogisticsAlloc(): number {
    return this._logisticsAlloc;
  }

  totalAllocatedMiners(): number {
    let n = 0;
    for (const v of this._minerAlloc.values()) n += v;
    return n;
  }

  /** Adjust miner allocation for an ore type by delta (+1 or -1).
   *  Requires drones in the fleet; returns false if the change would exceed
   *  available unallocated miners or go below 0. */
  allocateMiner(ore: OreType, delta: number, totalMiners: number): boolean {
    const current = this._minerAlloc.get(ore) ?? 0;
    const newCount = current + delta;
    if (newCount < 0) return false;
    if (delta > 0 && this.totalAllocatedMiners() >= totalMiners) return false;
    if (newCount === 0) {
      this._minerAlloc.delete(ore);
    } else {
      this._minerAlloc.set(ore, newCount);
    }
    EventBus.emit('drone:allocation_changed');
    return true;
  }

  /** Adjust logistics pool size by delta. Returns false if can't satisfy. */
  allocateLogistics(delta: number, totalLogistics: number): boolean {
    const newVal = this._logisticsAlloc + delta;
    if (newVal < 0 || newVal > totalLogistics) return false;
    this._logisticsAlloc = newVal;
    EventBus.emit('drone:allocation_changed');
    return true;
  }

  /**
   * Reconcile: walk the fleet and set orePreference on miners + enabled on
   * logistics drones to match the intent stored here.
   * Called by FleetManager whenever the fleet changes.
   */
  reconcile(): void {
    import('./FleetManager').then(({ fleetManager }) => {
      const drones = fleetManager.getDrones();

      const miners = drones.filter(d => MINER_TYPES.has(d.droneType) && !d.disabled);
      const logistics = drones.filter(d => LOGISTICS_TYPES.has(d.droneType));

      // Reset all miner ore preferences
      for (const drone of miners) drone.orePreference = null;

      // Assign preferences per allocation table
      let unassigned = [...miners];
      for (const [ore, count] of this._minerAlloc) {
        let assigned = 0;
        unassigned = unassigned.filter(drone => {
          if (assigned < count && drone.orePreference === null) {
            drone.orePreference = ore;
            assigned++;
            return false;
          }
          return true;
        });
      }

      // Logistics: enable/disable to match _logisticsAlloc (don't abort in-flight)
      let activeCount = 0;
      for (const drone of logistics) {
        if (activeCount < this._logisticsAlloc) {
          if (drone.disabled) drone.disabled = false;
          activeCount++;
        } else {
          if (!drone.disabled) {
            drone.clearTasks();
            drone.cargo = null;
            drone.disabled = true;
          }
        }
      }
    });
  }

  serialize(): { miners: Record<string, number>; logistics: number } {
    const miners: Record<string, number> = {};
    for (const [ore, count] of this._minerAlloc) miners[ore] = count;
    return { miners, logistics: this._logisticsAlloc };
  }

  deserialize(data: { miners?: Record<string, number>; logistics?: number }): void {
    this._minerAlloc.clear();
    if (data.miners) {
      for (const [ore, count] of Object.entries(data.miners)) {
        if (count > 0) this._minerAlloc.set(ore as OreType, count);
      }
    }
    this._logisticsAlloc = data.logistics ?? 0;
  }

  reset(): void {
    this._minerAlloc.clear();
    this._logisticsAlloc = 0;
  }
}

export const droneAllocationManager = new DroneAllocationManager();
