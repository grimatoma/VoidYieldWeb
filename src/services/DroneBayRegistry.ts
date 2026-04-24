import type { DroneBase } from '@entities/DroneBase';
import type { DroneType } from '@data/types';
import { gameState } from './GameState';
import { depositMap } from './DepositMap';
import { EventBus } from './EventBus';

export interface BaySlot {
  drone: DroneBase | null;
  droneType: DroneType | null;
}

export interface IDroneBay {
  readonly id: string;
  readonly label: string;
  readonly slotCount: number;
  readonly slots: readonly BaySlot[];
  upgradeCost(): number;
  upgradeSlot(): boolean;
  purchaseIntoSlot(type: DroneType): DroneBase | null;
  releaseSlot(slotIndex: number): void;
  readonly position: { x: number; y: number };
}

const DRONE_COSTS: Record<DroneType, number> = {
  scout: 25,
  heavy: 150,
  refinery: 75,
  survey: 150,
  builder: 200,
  cargo: 500,
  repair: 800,
};

export class DroneBayRegistry {
  private _bays: IDroneBay[] = [];

  register(bay: IDroneBay): void {
    if (!this._bays.find(b => b.id === bay.id)) {
      this._bays.push(bay);
    }
  }

  unregister(id: string): void {
    this._bays = this._bays.filter(b => b.id !== id);
  }

  getAll(): readonly IDroneBay[] {
    return this._bays;
  }

  totalEmptySlots(): number {
    return this._bays.reduce((sum, bay) =>
      sum + bay.slots.filter(s => s.drone === null).length, 0);
  }

  totalUsedSlots(): number {
    return this._bays.reduce((sum, bay) =>
      sum + bay.slots.filter(s => s.drone !== null).length, 0);
  }

  totalSlots(): number {
    return this._bays.reduce((sum, bay) => sum + bay.slotCount, 0);
  }

  /** Return the first bay with an empty slot, or null if all slots are full. */
  findEmptySlot(): { bay: IDroneBay; slotIndex: number } | null {
    for (const bay of this._bays) {
      const idx = bay.slots.findIndex(s => s.drone === null);
      if (idx !== -1) return { bay, slotIndex: idx };
    }
    return null;
  }

  /** Destroy a drone: full refund, release tasks/claims, remove from scene + fleet. */
  destroyDrone(droneId: string): void {
    for (const bay of this._bays) {
      const slotIndex = bay.slots.findIndex(s => s.drone?.id === droneId);
      if (slotIndex === -1) continue;

      const slot = bay.slots[slotIndex];
      if (!slot.drone) return;

      const drone = slot.drone;
      const cost = DRONE_COSTS[slot.droneType ?? 'scout'];

      gameState.addCredits(cost);
      drone.clearTasks();
      drone.cargo = null;
      depositMap.releaseClaimsBy(drone.id);
      drone.container.parent?.removeChild(drone.container);

      bay.releaseSlot(slotIndex);

      // Import lazily to avoid circular dependency at module init time
      import('./FleetManager').then(({ fleetManager }) => {
        fleetManager.remove(droneId);
        import('./DroneAllocationManager').then(({ droneAllocationManager }) => {
          droneAllocationManager.reconcile();
        });
        EventBus.emit('fleet:roster_changed');
      });
      return;
    }
  }
}

export const droneBayRegistry = new DroneBayRegistry();
