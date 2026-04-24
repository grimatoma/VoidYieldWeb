import type { StorageDepot } from '@entities/StorageDepot';
import type { Furnace } from '@entities/Furnace';
import { FURNACE_RECIPES } from '@entities/Furnace';
import type { DroneBase } from '@entities/DroneBase';
import { depositMap } from './DepositMap';
import { fleetManager } from './FleetManager';
import type { OreType, DroneTask, DroneType } from '@data/types';

/** A slot in the Drone Bay — binds one specific drone to one ore target. */
export interface DroneBaySlot {
  slotId: string;
  drone: DroneBase | null;
  droneType: DroneType | null;
  oreType: OreType | 'any';
  /** Role override: 'miner' or 'logistics'. Defaults based on droneType at
   *  assign time (scout/heavy → 'miner', refinery → 'logistics').
   *  Can be changed at runtime via OutpostDispatcher.setSlotRole(). */
  role?: 'miner' | 'logistics';
}

/** Serialization-only mirror of DroneBaySlot (no DroneBase instance). */
export interface DroneBaySlotData {
  slotId: string;
  droneType: DroneType | null;
  oreType: OreType | 'any';
}

export class OutpostDispatcher {
  private _storage: StorageDepot | null = null;
  private _furnace: Furnace | null = null;
  private _depotPos: { x: number; y: number } | null = null;
  private _slots: DroneBaySlot[] = [];
  private _active = false;

  /**
   * Wire up storage, furnace, and the live bay-slot array.
   * Slots are stored by reference — mutations to slot objects propagate automatically.
   */
  configure(storage: StorageDepot, furnace: Furnace, depotPos: { x: number; y: number }, slots: DroneBaySlot[]): void {
    this._storage = storage;
    this._furnace = furnace;
    this._depotPos = depotPos;
    this._slots = slots;
  }

  start(): void {
    this._active = true;
  }

  stop(): void {
    this._active = false;
  }

  /**
   * Override the role of a specific slot. Changes take effect after the
   * drone's current task completes (the dispatcher simply won't dispatch
   * a new task of the old role type on the next tick).
   */
  setSlotRole(slotId: string, role: 'miner' | 'logistics'): void {
    const slot = this._slots.find(s => s.slotId === slotId);
    if (slot) slot.role = role;
  }

  /**
   * Returns a "D-01" style name for the first miner slot that targets the
   * given ore type (or 'any'), or null if no miner drone is assigned.
   */
  getAssignedDroneForOre(oreType: OreType): string | null {
    for (let i = 0; i < this._slots.length; i++) {
      const slot = this._slots[i];
      if (!slot.drone) continue;
      const effectiveRole = slot.role
        ?? (slot.drone.droneType === 'refinery' || slot.drone.droneType === 'cargo' ? 'logistics' : 'miner');
      if (effectiveRole !== 'miner') continue;
      if (slot.oreType !== oreType && slot.oreType !== 'any') continue;
      return `D-${String(i + 1).padStart(2, '0')}`;
    }
    return null;
  }

  update(_delta: number): void {
    if (!this._active || !this._storage || !this._furnace) return;
    this._tickMiners();
    this._tickLogistics();
  }

  private _tickMiners(): void {
    if (!this._storage) return;
    const storage = this._storage;

    for (const slot of this._slots) {
      const drone = slot.drone;
      if (!drone || drone.disabled) continue;
      // Determine effective role: explicit override > droneType default
      const effectiveRole = slot.role
        ?? (drone.droneType === 'refinery' || drone.droneType === 'cargo' ? 'logistics' : 'miner');
      if (effectiveRole !== 'miner') continue;
      if (drone.state !== 'IDLE' || drone.getTasks().length > 0) continue;

      const orePref: OreType | null = slot.oreType === 'any' ? null : slot.oreType as OreType;
      const deposit = depositMap.getNearestUnclaimedDeposit(drone.x, drone.y, orePref);
      if (!deposit) continue;
      if (!deposit.claim(drone.id)) continue;

      drone.pushTask({
        type: 'MINE',
        targetX: deposit.data.x,
        targetY: deposit.data.y,
        executeDurationSec: drone.mineTimeSec,
        onExecute: () => {
          const lot = deposit.mine(drone.carryCapacity);
          drone.cargo = lot;
          deposit.release(drone.id);
        },
      });
      drone.pushTask({
        type: 'CARRY',
        targetX: storage.x,
        targetY: storage.y,
        executeDurationSec: 0.3,
        onExecute: () => {
          if (drone.cargo) {
            storage.deposit([drone.cargo]);
            drone.cargo = null;
          }
        },
      });
    }
  }

  private _tickLogistics(): void {
    if (!this._storage || !this._furnace) return;
    const furnace = this._furnace;
    const storage = this._storage;
    const recipe = furnace.recipe;

    // Build the set of drone IDs assigned the logistics role (via role override
    // or droneType default: refinery/cargo → logistics).
    const logisticsIds = new Set<string>(
      this._slots
        .filter(s => {
          if (!s.drone || s.drone.disabled) return false;
          const effectiveRole = s.role
            ?? (s.drone.droneType === 'refinery' || s.drone.droneType === 'cargo' ? 'logistics' : 'miner');
          return effectiveRole === 'logistics';
        })
        .map(s => s.drone!.id),
    );

    const idleLogistics = fleetManager
      .getIdleDrones()
      .filter(d => logisticsIds.has(d.id) || (logisticsIds.size === 0 && d.droneType === 'refinery'));
    
    if (idleLogistics.length === 0) return;

    // 1. Output Pickup: Prioritize getting products OUT of the furnace
    if (furnace.plant.outputBuffer > 0) {
      for (const drone of idleLogistics) {
        if (furnace.plant.outputBuffer <= 0) break;

        const takeTask: DroneTask = {
          type: 'CARRY',
          targetX: furnace.x,
          targetY: furnace.y,
          executeDurationSec: 0.3,
          onExecute: () => {
            const lot = furnace.plant.takeOutput();
            if (lot) {
              drone.cargo = lot;
            }
          },
        };
        const deliverTask: DroneTask = {
          type: 'CARRY',
          targetX: storage.x,
          targetY: storage.y,
          executeDurationSec: 0.3,
          onExecute: () => {
            if (drone.cargo) {
              storage.deposit([drone.cargo]);
              drone.cargo = null;
            }
          },
        };
        drone.pushTask(takeTask);
        drone.pushTask(deliverTask);
        return; // Only dispatch one drone per tick to avoid piling up
      }
    }

    // 2. Input Delivery: If furnace has room and we have idle drones
    if (recipe !== 'off') {
      const recipeData = FURNACE_RECIPES[recipe];
      const inputOre = recipeData.input;
      const inputQty = recipeData.inputQty;
      
      const missingInput = (recipeData.inputQty * 10) - furnace.plant.inputBuffer;
      if (missingInput >= inputQty) {
        const available = storage.getStockpile().get(inputOre) ?? 0;
        if (available >= inputQty) {
          for (const drone of idleLogistics) {
            // Already dispatched for output? Skip (though we return above, so it's safe)
            const pullQty = Math.min(missingInput, available, drone.carryCapacity);
            if (pullQty <= 0) break;

            const pullTask: DroneTask = {
              type: 'CARRY',
              targetX: storage.x,
              targetY: storage.y,
              executeDurationSec: 0.3,
              onExecute: () => {
                const pulled = storage.pull(inputOre, pullQty);
                if (pulled > 0) {
                  drone.cargo = { oreType: inputOre, quantity: pulled, attributes: {} };
                }
              },
            };
            const deliverTask: DroneTask = {
              type: 'CARRY',
              targetX: furnace.x,
              targetY: furnace.y,
              executeDurationSec: 0.3,
              onExecute: () => {
                if (drone.cargo) {
                  furnace.insertBatch(drone.cargo.oreType, drone.cargo.quantity);
                  drone.cargo = null;
                }
              },
            };
            drone.pushTask(pullTask);
            drone.pushTask(deliverTask);
            return; // Dispatch one per tick
          }
        }
      }
    }

    // 3. Idle Return: if still idle and not at drone depot, return to drone depot to wait
    if (this._depotPos) {
      for (const drone of idleLogistics) {
        // If it was given a task in steps 1 or 2, it won't be in idleLogistics, wait, yes it will be in the array, but its task length will be > 0.
        if (drone.getTasks().length > 0) continue;
        
        const dx = drone.x - this._depotPos.x;
        const dy = drone.y - this._depotPos.y;
        const distSq = dx * dx + dy * dy;
        
        // If it's more than ~20px away, fly back
        if (distSq > 400) {
          drone.pushTask({
            type: 'CARRY',
            targetX: this._depotPos.x,
            targetY: this._depotPos.y,
            executeDurationSec: 0,
          });
        }
      }
    }
  }
}

export const outpostDispatcher = new OutpostDispatcher();
