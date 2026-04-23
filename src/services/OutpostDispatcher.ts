import type { StorageDepot } from '@entities/StorageDepot';
import type { Furnace } from '@entities/Furnace';
import { FURNACE_RECIPES } from '@entities/Furnace';
import type { DroneBase } from '@entities/DroneBase';
import { CargoDrone } from '@entities/CargoDrone';
import { depositMap } from './DepositMap';
import { fleetManager } from './FleetManager';
import type { OreType, DroneTask } from '@data/types';

/** A slot in the Drone Bay — binds one specific drone to one ore target. */
export interface DroneBaySlot {
  slotId: string;
  drone: DroneBase | null;
  droneType: 'scout' | 'heavy' | 'refinery' | null;
  oreType: OreType | 'any';
}

/** Serialization-only mirror of DroneBaySlot (no DroneBase instance). */
export interface DroneBaySlotData {
  slotId: string;
  droneType: 'scout' | 'heavy' | 'refinery' | null;
  oreType: OreType | 'any';
}

export class OutpostDispatcher {
  private _storage: StorageDepot | null = null;
  private _furnace: Furnace | null = null;
  private _slots: DroneBaySlot[] = [];
  private _active = false;

  /**
   * Wire up storage, furnace, and the live bay-slot array.
   * Slots are stored by reference — mutations to slot objects propagate automatically.
   */
  configure(storage: StorageDepot, furnace: Furnace, slots: DroneBaySlot[]): void {
    this._storage = storage;
    this._furnace = furnace;
    this._slots = slots;
  }

  start(): void {
    this._active = true;
  }

  stop(): void {
    this._active = false;
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
    if (recipe === 'off') return;

    const idleCargoList = fleetManager
      .getIdleDrones()
      .filter(d => d.droneType === 'cargo') as CargoDrone[];
    if (idleCargoList.length === 0) return;

    const recipeData = FURNACE_RECIPES[recipe];
    const inputOre = recipeData.input;
    const inputQty = recipeData.inputQty;
    const available = storage.getStockpile().get(inputOre) ?? 0;
    if (available < inputQty) return;

    for (const drone of idleCargoList) {
      const pullTask: DroneTask = {
        type: 'CARRY',
        targetX: storage.x,
        targetY: storage.y,
        executeDurationSec: 0.3,
        onExecute: () => {
          const pulled = storage.pull(inputOre, inputQty);
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
    }
  }
}

export const outpostDispatcher = new OutpostDispatcher();
