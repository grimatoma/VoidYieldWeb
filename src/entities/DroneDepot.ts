import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CELL_SIZE } from './PlacedBuilding';
import { ScoutDrone } from './ScoutDrone';
import { HeavyDrone } from './HeavyDrone';
import { RefineryDrone } from './RefineryDrone';
import type { DroneBase } from './DroneBase';
import type { StorageDepot } from './StorageDepot';
import type { Furnace } from './Furnace';
import type { OutpostDispatcher } from '@services/OutpostDispatcher';
import type { DroneType } from '@data/types';
import { gameState } from '@services/GameState';
import { fleetManager } from '@services/FleetManager';
import { EventBus } from '@services/EventBus';
import { droneBayRegistry } from '@services/DroneBayRegistry';
import type { BaySlot, IDroneBay } from '@services/DroneBayRegistry';

/** Module-level flag to enforce MVP limit of one DroneDepot per outpost. */
let _depotBuilt = false;

/** Reset the built flag — used in tests and on scene exit. */
export function resetDepotBuilt(): void {
  _depotBuilt = false;
}

const DRONE_COSTS: Partial<Record<DroneType, number>> = {
  scout: ScoutDrone.COST,
  heavy: HeavyDrone.COST,
  refinery: RefineryDrone.COST,
};

function spawnDepotDrone(type: DroneType, x: number, y: number): DroneBase {
  if (type === 'scout')    return new ScoutDrone(x, y);
  if (type === 'heavy')    return new HeavyDrone(x, y);
  if (type === 'refinery') return new RefineryDrone(x, y);
  throw new Error(`DroneDepot: unsupported drone type ${type}`);
}

let _depotIdCounter = 0;

export class DroneDepot implements IDroneBay {
  readonly container: Container;
  readonly id: string;
  readonly label = 'Outpost Drone Depot';
  readonly x: number;
  readonly y: number;

  private _slotCount: number;
  private _slots: BaySlot[];
  private _worldContainer: Container | null = null;

  constructor(worldX: number, worldY: number, initialSlots = 4) {
    this.id = `depot_${_depotIdCounter++}`;
    this.x = worldX;
    this.y = worldY;
    this._slotCount = initialSlots;
    this._slots = Array.from({ length: initialSlots }, () => ({ drone: null, droneType: null }));

    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    const w = 2 * CELL_SIZE - 4;
    const h = 2 * CELL_SIZE - 4;

    const body = new Graphics();
    body.rect(-w / 2, -h / 2, w, h).fill(0x3A1A5C);
    body.rect(-w / 2, -h / 2, w, h).stroke({ width: 1, color: 0x6A4A8C });
    this.container.addChild(body);

    const textStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: '#D4A843', align: 'center' });
    const lbl = new Text({ text: 'DRONES', style: textStyle });
    lbl.anchor.set(0.5);
    this.container.addChild(lbl);
  }

  get slotCount(): number { return this._slotCount; }
  get slots(): readonly BaySlot[] { return this._slots; }
  get position(): { x: number; y: number } { return { x: this.x, y: this.y }; }

  /** Cost to add one more slot. Quadratic: 100 × (currentSlots + 1)². */
  upgradeCost(): number {
    return 100 * (this._slotCount + 1) * (this._slotCount + 1);
  }

  /** Add one slot if the player can afford it. Returns true on success. */
  upgradeSlot(): boolean {
    const cost = this.upgradeCost();
    if (gameState.credits < cost) return false;
    gameState.addCredits(-cost);
    this._slotCount++;
    this._slots.push({ drone: null, droneType: null });
    EventBus.emit('drone:bay_cap_changed', this._slotCount);
    return true;
  }

  /** Purchase a depot-compatible drone into the first empty slot. */
  purchaseIntoSlot(type: DroneType): DroneBase | null {
    const wc = this._worldContainer;
    if (!wc) return null;
    const idx = this._slots.findIndex(s => s.drone === null);
    if (idx === -1) return null;
    const cost = DRONE_COSTS[type];
    if (cost === undefined || gameState.credits < cost) return null;

    gameState.addCredits(-cost);
    EventBus.emit('drone:purchased', type);
    const drone = this._spawnIntoSlot(idx, type, wc);
    return drone;
  }

  /** Free a slot by index (no refund — caller handles that). */
  releaseSlot(slotIndex: number): void {
    const slot = this._slots[slotIndex];
    if (!slot) return;
    if (slot.drone) {
      slot.drone.clearTasks();
      slot.drone.disabled = true;
      slot.drone.container.parent?.removeChild(slot.drone.container);
      fleetManager.remove(slot.drone.id);
    }
    slot.drone = null;
    slot.droneType = null;
  }

  /**
   * Wire up storage, furnace, and the dispatcher.
   * Throws if a second DroneDepot is placed (MVP limit).
   */
  onBuild(
    storage: StorageDepot,
    furnace: Furnace,
    dispatcher: OutpostDispatcher,
    worldContainer: Container,
  ): void {
    if (_depotBuilt) {
      console.warn('DroneDepot: only one Drone Depot may be placed per outpost (MVP limit).');
      throw new Error('DroneDepot: only one Drone Depot allowed per outpost.');
    }
    _depotBuilt = true;
    this._worldContainer = worldContainer;
    dispatcher.configure(storage, furnace, { x: this.x, y: this.y }, this._slots);
    dispatcher.start();
    droneBayRegistry.register(this);
  }

  /** Return all currently assigned drones (for cleanup on scene exit). */
  getAllDrones(): DroneBase[] {
    return this._slots.filter(s => s.drone !== null).map(s => s.drone!);
  }

  /** Serialize slot data for saving. */
  getBaySlotData(): { slotIndex: number; droneType: DroneType | null }[] {
    return this._slots.map((s, i) => ({ slotIndex: i, droneType: s.droneType }));
  }

  /** Restore a slot from saved data. Spawns the drone without charging credits. */
  restoreBaySlot(
    data: { slotIndex?: number; slotId?: string; droneType: DroneType | null },
    worldContainer: Container,
  ): void {
    this._worldContainer = worldContainer;
    // Support old slotId-based format (slotId: 'slot_0' → index 0)
    const idx = data.slotIndex ??
      (data.slotId ? parseInt(data.slotId.replace('slot_', ''), 10) : -1);
    if (idx < 0 || idx >= this._slotCount) return;
    if (!data.droneType || this._slots[idx].drone !== null) return;
    this._spawnIntoSlot(idx, data.droneType, worldContainer);
  }

  serialize(): { id: string; kind: 'depot'; slotCount: number; slots: (DroneType | null)[] } {
    return {
      id: this.id,
      kind: 'depot',
      slotCount: this._slotCount,
      slots: this._slots.map(s => s.droneType),
    };
  }

  isNearby(px: number, py: number, radius = 120): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'CONFIGURE', target: 'DRONE DEPOT' };
  }

  unregister(): void {
    droneBayRegistry.unregister(this.id);
  }

  private _spawnIntoSlot(idx: number, type: DroneType, worldContainer: Container): DroneBase {
    const drone = spawnDepotDrone(type, this.x, this.y);
    worldContainer.addChild(drone.container);
    fleetManager.add(drone);
    this._slots[idx] = { drone, droneType: type };
    return drone;
  }
}
