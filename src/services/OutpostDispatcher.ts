import type { StorageDepot } from '@entities/StorageDepot';
import type { Furnace } from '@entities/Furnace';
import { FURNACE_RECIPES } from '@entities/Furnace';
import { ElectrolysisUnit } from '@entities/ElectrolysisUnit';
import { Launchpad } from '@entities/Launchpad';
import { depositMap } from './DepositMap';
import { fleetManager } from './FleetManager';
import type { BaySlot } from '@services/DroneBayRegistry';
import type { DroneTask, DroneType } from '@data/types';

/** Kept for save-load compat — no longer used at runtime. */
export interface DroneBaySlotData {
  slotId?: string;
  slotIndex?: number;
  droneType: DroneType | null;
}

const MINER_TYPES: ReadonlySet<DroneType> = new Set<DroneType>(['scout', 'heavy']);
const LOGISTICS_TYPES: ReadonlySet<DroneType> = new Set<DroneType>(['refinery', 'cargo']);

export class OutpostDispatcher {
  private _storage: StorageDepot | null = null;
  private _furnace: Furnace | null = null;
  private _depotPos: { x: number; y: number } | null = null;
  private _slots: readonly BaySlot[] = [];
  private _active = false;
  private _electrolysisUnit: ElectrolysisUnit | null = null;
  private _launchpad: Launchpad | null = null;

  configure(
    storage: StorageDepot,
    furnace: Furnace,
    depotPos: { x: number; y: number },
    slots: readonly BaySlot[],
  ): void {
    this._storage = storage;
    this._furnace = furnace;
    this._depotPos = depotPos;
    this._slots = slots;
  }

  start(): void { this._active = true; }

  stop(): void {
    this._active = false;
    this._electrolysisUnit = null;
    this._launchpad = null;
  }

  setElectrolysisUnit(eu: ElectrolysisUnit): void { this._electrolysisUnit = eu; }
  setLaunchpad(lp: Launchpad): void { this._launchpad = lp; }

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
      if (!MINER_TYPES.has(drone.droneType)) continue;
      if (drone.state !== 'IDLE' || drone.getTasks().length > 0) continue;

      const deposit = depositMap.getNearestUnclaimedDeposit(
        drone.x, drone.y, drone.orePreference,
      );
      if (!deposit) continue;
      if (!deposit.claim(drone.id)) continue;

      drone.pushTask({
        type: 'MINE',
        targetX: deposit.data.x,
        targetY: deposit.data.y,
        executeDurationSec: drone.mineTimeSec,
        onExecute: () => {
          const lot = deposit.mine(drone.carryCapacity);
          if (lot.quantity > 0) drone.cargo = lot;
          deposit.release(drone.id);
        },
      });
      drone.pushTask({
        type: 'CARRY',
        targetX: storage.x,
        targetY: storage.y,
        executeDurationSec: 0.3,
        onExecute: () => {
          if (drone.cargo) { storage.deposit([drone.cargo]); drone.cargo = null; }
        },
      });
    }
  }

  private _tickLogistics(): void {
    if (!this._storage || !this._furnace) return;
    const furnace = this._furnace;
    const storage = this._storage;
    const recipe = furnace.recipe;

    const idleLogistics = fleetManager
      .getIdleDrones()
      .filter(d => !d.disabled && LOGISTICS_TYPES.has(d.droneType) &&
        this._slots.some(s => s.drone?.id === d.id));

    if (idleLogistics.length === 0) return;

    // 1. Output Pickup
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
            if (lot) drone.cargo = lot;
          },
        };
        const deliverTask: DroneTask = {
          type: 'CARRY',
          targetX: storage.x,
          targetY: storage.y,
          executeDurationSec: 0.3,
          onExecute: () => {
            if (drone.cargo) { storage.deposit([drone.cargo]); drone.cargo = null; }
          },
        };
        drone.pushTask(takeTask);
        drone.pushTask(deliverTask);
        return;
      }
    }

    // 2. Input Delivery
    if (recipe !== 'off') {
      const recipeData = FURNACE_RECIPES[recipe];
      const inputOre = recipeData.input;
      const inputQty = recipeData.inputQty;
      const missingInput = (recipeData.inputQty * 10) - furnace.plant.inputBuffer;
      if (missingInput >= inputQty) {
        const available = storage.getStockpile().get(inputOre) ?? 0;
        if (available >= inputQty) {
          for (const drone of idleLogistics) {
            const pullQty = Math.min(missingInput, available, drone.carryCapacity);
            if (pullQty <= 0) break;
            const pullTask: DroneTask = {
              type: 'CARRY',
              targetX: storage.x,
              targetY: storage.y,
              executeDurationSec: 0.3,
              onExecute: () => {
                const pulled = storage.pull(inputOre, pullQty);
                if (pulled > 0) drone.cargo = { oreType: inputOre, quantity: pulled, attributes: {} };
              },
            };
            const deliverTask: DroneTask = {
              type: 'CARRY',
              targetX: furnace.x,
              targetY: furnace.y,
              executeDurationSec: 0.3,
              onExecute: () => {
                if (drone.cargo) { furnace.insertBatch(drone.cargo.oreType, drone.cargo.quantity); drone.cargo = null; }
              },
            };
            drone.pushTask(pullTask);
            drone.pushTask(deliverTask);
            return;
          }
        }
      }
    }

    // 3. Electrolysis
    const eu = this._electrolysisUnit;
    if (eu) {
      if (eu.outputBuffer > 0) {
        for (const drone of idleLogistics) {
          if (drone.getTasks().length > 0) continue;
          const pullQty = Math.min(eu.outputBuffer, drone.carryCapacity);
          drone.pushTask({
            type: 'CARRY', targetX: eu.x, targetY: eu.y, executeDurationSec: 0.3,
            onExecute: () => {
              const pulled = eu.pullHydrolox(pullQty);
              if (pulled > 0) drone.cargo = { oreType: 'hydrolox_fuel', quantity: pulled, attributes: {} };
            },
          });
          drone.pushTask({
            type: 'CARRY', targetX: storage.x, targetY: storage.y, executeDurationSec: 0.3,
            onExecute: () => { if (drone.cargo) { storage.deposit([drone.cargo]); drone.cargo = null; } },
          });
          return;
        }
      }

      if (eu.inputBuffer < ElectrolysisUnit.MAX_INPUT - ElectrolysisUnit.INPUT_PER_CYCLE) {
        const waterAvail = storage.getStockpile().get('water') ?? 0;
        if (waterAvail >= ElectrolysisUnit.INPUT_PER_CYCLE) {
          for (const drone of idleLogistics) {
            if (drone.getTasks().length > 0) continue;
            const carry = Math.min(waterAvail, drone.carryCapacity);
            drone.pushTask({
              type: 'CARRY', targetX: storage.x, targetY: storage.y, executeDurationSec: 0.3,
              onExecute: () => {
                const pulled = storage.pull('water', carry);
                if (pulled > 0) drone.cargo = { oreType: 'water', quantity: pulled, attributes: {} };
              },
            });
            drone.pushTask({
              type: 'CARRY', targetX: eu.x, targetY: eu.y, executeDurationSec: 0.3,
              onExecute: () => { if (drone.cargo) { eu.addWater(drone.cargo.quantity); drone.cargo = null; } },
            });
            return;
          }
        }
      }
    }

    // 4. Launchpad
    const lp = this._launchpad;
    if (lp && lp.fuelUnits < Launchpad.FUEL_REQUIRED) {
      const hydroloxAvail = storage.getStockpile().get('hydrolox_fuel') ?? 0;
      if (hydroloxAvail > 0) {
        for (const drone of idleLogistics) {
          if (drone.getTasks().length > 0) continue;
          const carry = Math.min(hydroloxAvail, drone.carryCapacity);
          drone.pushTask({
            type: 'CARRY', targetX: storage.x, targetY: storage.y, executeDurationSec: 0.3,
            onExecute: () => {
              const pulled = storage.pull('hydrolox_fuel', carry);
              if (pulled > 0) drone.cargo = { oreType: 'hydrolox_fuel', quantity: pulled, attributes: {} };
            },
          });
          drone.pushTask({
            type: 'CARRY', targetX: lp.x, targetY: lp.y, executeDurationSec: 0.3,
            onExecute: () => { if (drone.cargo) { lp.addFuel(drone.cargo.quantity); drone.cargo = null; } },
          });
          return;
        }
      }
    }

    // 5. Idle Return
    if (this._depotPos) {
      for (const drone of idleLogistics) {
        if (drone.getTasks().length > 0) continue;
        const dx = drone.x - this._depotPos.x;
        const dy = drone.y - this._depotPos.y;
        if (dx * dx + dy * dy > 400) {
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
