import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CELL_SIZE } from './PlacedBuilding';
import { ScoutDrone } from './ScoutDrone';
import { HeavyDrone } from './HeavyDrone';
import { RefineryDrone } from './RefineryDrone';
import type { DroneBase } from './DroneBase';
import type { StorageDepot } from './StorageDepot';
import type { Furnace } from './Furnace';
import type { OutpostDispatcher, DroneBaySlot, DroneBaySlotData } from '@services/OutpostDispatcher';
import type { OreType, DroneType } from '@data/types';
import { gameState } from '@services/GameState';
import { fleetManager } from '@services/FleetManager';
import { EventBus } from '@services/EventBus';

/** Module-level flag to enforce MVP limit of one DroneDepot per outpost. */
let _depotBuilt = false;

/** Reset the built flag — used in tests and on scene exit. */
export function resetDepotBuilt(): void {
  _depotBuilt = false;
}

/**
 * DroneDepot — manages the Drone Bay: three slots, each binding one drone to
 * one ore target. When built (onBuild), disables manual-only furnace mode and
 * starts the OutpostDispatcher.
 */
export class DroneDepot {
  readonly container: Container;
  readonly x: number;
  readonly y: number;

  private _baySlots: DroneBaySlot[] = [
    { slotId: 'slot_0', drone: null, droneType: null, oreType: 'iron_ore' as OreType },
    { slotId: 'slot_1', drone: null, droneType: null, oreType: 'copper_ore' as OreType },
    { slotId: 'slot_2', drone: null, droneType: null, oreType: 'iron_ore' as OreType },
    { slotId: 'slot_3', drone: null, droneType: null, oreType: 'iron_ore' as OreType },
  ];

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;

    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    const w = 2 * CELL_SIZE - 4;
    const h = 2 * CELL_SIZE - 4;

    const body = new Graphics();
    body.rect(-w / 2, -h / 2, w, h).fill(0x3A1A5C);
    body.rect(-w / 2, -h / 2, w, h).stroke({ width: 1, color: 0x6A4A8C });
    this.container.addChild(body);

    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 11,
      fill: '#D4A843',
      align: 'center',
    });
    const label = new Text({ text: 'DRONES', style: textStyle });
    label.anchor.set(0.5);
    this.container.addChild(label);
  }

  /**
   * Call after placing on the grid.
   * Passes the live bay-slot array to the dispatcher by reference so slot
   * mutations (assignDrone, setSlotOreType) are reflected immediately.
   * Throws if a second DroneDepot is placed (MVP limit).
   */
  onBuild(storage: StorageDepot, furnace: Furnace, dispatcher: OutpostDispatcher): void {
    if (_depotBuilt) {
      console.warn('DroneDepot: only one Drone Depot may be placed per outpost (MVP limit).');
      throw new Error('DroneDepot: only one Drone Depot allowed per outpost.');
    }
    _depotBuilt = true;
    furnace.manualOnly = false;
    dispatcher.configure(storage, furnace, { x: this.x, y: this.y }, this._baySlots);
    dispatcher.start();
  }

  /**
   * Purchase a drone and assign it to a slot. Deducts credits.
   * Returns the new drone or null if unaffordable, slot not found, or slot occupied.
   */
  assignDrone(slotId: string, type: DroneType, worldContainer: Container): DroneBase | null {
    const slot = this._baySlots.find(s => s.slotId === slotId);
    if (!slot || slot.drone !== null) return null;

    const costs: Partial<Record<DroneType, number>> = {
      scout: ScoutDrone.COST,
      heavy: HeavyDrone.COST,
      refinery: RefineryDrone.COST,
    };
    const cost = costs[type];
    if (cost === undefined || gameState.credits < cost) return null;

    gameState.addCredits(-cost);
    EventBus.emit('drone:purchased', type);
    return this._spawnIntoSlot(slot, type, worldContainer);
  }

  /**
   * Stop a drone, remove it from the scene and fleet, and free the slot.
   * Any pending tasks are abandoned (deposit claim may linger until scene exit).
   */
  releaseDrone(slotId: string): void {
    const slot = this._baySlots.find(s => s.slotId === slotId);
    if (!slot?.drone) return;
    const drone = slot.drone;
    drone.clearTasks();
    drone.disabled = true;
    drone.container.parent?.removeChild(drone.container);
    fleetManager.remove(drone.id);
    slot.drone = null;
    slot.droneType = null;
  }

  /** Update the ore preference for a slot without replacing the drone. */
  setSlotOreType(slotId: string, oreType: OreType | 'any'): void {
    const slot = this._baySlots.find(s => s.slotId === slotId);
    if (slot) slot.oreType = oreType;
  }

  getBaySlots(): readonly DroneBaySlot[] {
    return this._baySlots;
  }

  /** Returns all currently assigned drones (for cleanup on scene exit). */
  getAllDrones(): DroneBase[] {
    return this._baySlots.filter(s => s.drone !== null).map(s => s.drone!);
  }

  getBaySlotData(): DroneBaySlotData[] {
    return this._baySlots.map(s => ({
      slotId: s.slotId,
      droneType: s.droneType,
      oreType: s.oreType,
    }));
  }

  /** Restore a slot from saved data. Spawns the drone without charging credits. */
  restoreBaySlot(data: DroneBaySlotData, worldContainer: Container): void {
    const slot = this._baySlots.find(s => s.slotId === data.slotId);
    if (!slot) return;
    slot.oreType = data.oreType;
    if (data.droneType && !slot.drone) {
      this._spawnIntoSlot(slot, data.droneType, worldContainer);
    }
  }

  isNearby(px: number, py: number, radius = 120): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'CONFIGURE', target: 'DRONE DEPOT' };
  }

  private _spawnIntoSlot(
    slot: DroneBaySlot,
    type: DroneType,
    worldContainer: Container,
  ): DroneBase {
    let drone: DroneBase;
    if (type === 'scout') drone = new ScoutDrone(this.x, this.y);
    else if (type === 'heavy') drone = new HeavyDrone(this.x, this.y);
    else if (type === 'refinery') drone = new RefineryDrone(this.x, this.y);
    else throw new Error(`DroneDepot: unsupported drone type ${type}`);

    worldContainer.addChild(drone.container);
    fleetManager.add(drone);
    slot.drone = drone;
    slot.droneType = type;
    return drone;
  }
}
