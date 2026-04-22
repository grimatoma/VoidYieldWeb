import type { StorageDepot } from '@entities/StorageDepot';
import type { Furnace } from '@entities/Furnace';
import { FURNACE_RECIPES } from '@entities/Furnace';
import type { DroneBase } from '@entities/DroneBase';
import { ScoutDrone } from '@entities/ScoutDrone';
import { CargoDrone } from '@entities/CargoDrone';
import { depositMap } from './DepositMap';
import { fleetManager } from './FleetManager';
import type { OreType, DroneTask } from '@data/types';

export interface DroneSlotConfig {
  slotId: string;
  role: 'miner' | 'logistics';
  oreType: OreType | 'any'; // miners only; logistics ignores
}

export class OutpostDispatcher {
  private _storage: StorageDepot | null = null;
  private _furnace: Furnace | null = null;
  private _slots: DroneSlotConfig[] = [];
  private _active = false;

  configure(storage: StorageDepot, furnace: Furnace, slots: DroneSlotConfig[]): void {
    this._storage = storage;
    this._furnace = furnace;
    this._slots = [...slots];
  }

  start(): void {
    this._active = true;
  }

  stop(): void {
    this._active = false;
  }

  /** Called every frame by the scene. Assigns tasks to idle drones. */
  update(_delta: number): void {
    if (!this._active || !this._storage || !this._furnace) return;
    this._tickMiners();
    this._tickLogistics();
  }

  private _tickMiners(): void {
    if (!this._storage) return;

    // Get all idle scout drones (miners)
    const idleMiners = fleetManager
      .getIdleDrones()
      .filter(d => d.droneType === 'scout' || d.droneType === 'heavy') as DroneBase[];

    if (idleMiners.length === 0) return;

    // Storage full gate
    if (this._storage.isFull()) return;

    const minerSlots = this._slots.filter(s => s.role === 'miner');
    let droneIndex = 0;

    for (const slot of minerSlots) {
      if (droneIndex >= idleMiners.length) break;

      const drone = idleMiners[droneIndex];
      droneIndex++;

      // Find nearest unclaimed deposit matching this slot's ore type
      const orePref: OreType | null = slot.oreType === 'any' ? null : slot.oreType;
      const deposit = depositMap.getNearestUnclaimedDeposit(drone.x, drone.y, orePref);

      if (!deposit) continue;

      // Claim it
      if (!deposit.claim(drone.id)) continue;

      const storage = this._storage!;

      // MINE task: move to deposit, execute mine
      const mineTask: DroneTask = {
        type: 'MINE',
        targetX: deposit.data.x,
        targetY: deposit.data.y,
        executeDurationSec: drone instanceof ScoutDrone ? ScoutDrone.MINE_TIME : 3.0,
        onExecute: () => {
          const lot = deposit.mine(drone.carryCapacity);
          drone.cargo = lot;
          deposit.release(drone.id);
        },
      };

      // CARRY task: move to storage, deposit cargo
      const carryTask: DroneTask = {
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

      drone.pushTask(mineTask);
      drone.pushTask(carryTask);
    }
  }

  private _tickLogistics(): void {
    if (!this._storage || !this._furnace) return;

    const furnace = this._furnace;
    const storage = this._storage;
    const recipe = furnace.recipe;

    if (recipe === 'off') return;

    // Get all idle cargo drones (logistics)
    const idleCargoList = fleetManager
      .getIdleDrones()
      .filter(d => d.droneType === 'cargo') as CargoDrone[];

    if (idleCargoList.length === 0) return;

    const logisticsSlots = this._slots.filter(s => s.role === 'logistics');

    let droneIndex = 0;

    for (const _slot of logisticsSlots) {
      if (droneIndex >= idleCargoList.length) break;

      const drone = idleCargoList[droneIndex];
      droneIndex++;

      const recipeData = FURNACE_RECIPES[recipe];
      const inputOre = recipeData.input;
      const inputQty = recipeData.inputQty;

      // If furnace has a recipe and storage has matching ore, carry ore to furnace
      const available = storage.getStockpile().get(inputOre) ?? 0;

      if (available >= inputQty) {
        // Pull ore task: move to storage, pull ore
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

        // Deliver task: move to furnace, insert batch
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
}

export const outpostDispatcher = new OutpostDispatcher();
