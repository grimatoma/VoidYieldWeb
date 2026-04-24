import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { makeAnimatedSprite } from '@services/SpriteSheetHelper';
import { DroneBase } from './DroneBase';
import { ScoutDrone } from './ScoutDrone';
import { RefineryDrone } from './RefineryDrone';
import { HeavyDrone } from './HeavyDrone';
import { SurveyDrone } from './SurveyDrone';
import { BuilderDrone } from './BuilderDrone';
import { CargoDrone } from './CargoDrone';
import { RepairDrone } from './RepairDrone';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import { assetManager } from '@services/AssetManager';
import { fleetManager } from '@services/FleetManager';
import { droneBayRegistry } from '@services/DroneBayRegistry';
import type { BaySlot, IDroneBay } from '@services/DroneBayRegistry';
import type { DroneType } from '@data/types';

let _bayIdCounter = 0;

const DRONE_COSTS: Record<DroneType, number> = {
  scout: ScoutDrone.COST,
  heavy: HeavyDrone.COST,
  refinery: RefineryDrone.COST,
  survey: SurveyDrone.COST,
  builder: BuilderDrone.COST,
  cargo: CargoDrone.COST,
  repair: RepairDrone.COST,
};

function spawnDrone(type: DroneType, x: number, y: number): DroneBase {
  switch (type) {
    case 'scout':    return new ScoutDrone(x, y);
    case 'heavy':    return new HeavyDrone(x, y);
    case 'refinery': return new RefineryDrone(x, y);
    case 'survey':   return new SurveyDrone(x, y);
    case 'builder':  return new BuilderDrone(x, y);
    case 'cargo':    return new CargoDrone(x, y);
    case 'repair':   return new RepairDrone(x, y);
  }
}

export class DroneBay implements IDroneBay {
  readonly container: Container;
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly serviceRadius = 400;

  private _slotCount: number;
  private _slots: BaySlot[];
  private _worldContainer: Container | null = null;

  constructor(x: number, y: number, initialSlots = 3) {
    this.id = `planet_bay_${_bayIdCounter++}`;
    this.label = 'Drone Bay';
    this.x = x;
    this.y = y;
    this._slotCount = initialSlots;
    this._slots = Array.from({ length: initialSlots }, () => ({ drone: null, droneType: null }));

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    const anim = makeAnimatedSprite('sheet_drone_bay', { frameCount: 8, frameWidth: 64, frameHeight: 64 });
    if (anim) {
      anim.anchor.set(0.5);
      this.container.addChild(anim);
    } else if (assetManager.has('building_drone_bay')) {
      const s = new Sprite(assetManager.texture('building_drone_bay'));
      s.anchor.set(0.5);
      s.width = 64;
      s.height = 64;
      this.container.addChild(s);
    } else {
      const gfx = new Graphics();
      gfx.rect(-16, -16, 32, 32).stroke({ color: 0x2196F3, width: 2 }).fill(0x0D1B3E);
      this.container.addChild(gfx);
    }

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#2196F3' });
    const label = new Text({ text: 'DRONE BAY', style });
    label.anchor.set(0.5);
    label.y = 40;
    this.container.addChild(label);
  }

  get slotCount(): number { return this._slotCount; }
  get slots(): readonly BaySlot[] { return this._slots; }
  get position(): { x: number; y: number } { return { x: this.x, y: this.y }; }

  setWorldContainer(container: Container): void {
    this._worldContainer = container;
    droneBayRegistry.register(this);
  }

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

  /** Purchase a drone and place it in the first empty slot.
   *  Returns null if no empty slot, wrong type, or insufficient credits. */
  purchaseIntoSlot(type: DroneType): DroneBase | null {
    const wc = this._worldContainer;
    if (!wc) return null;
    const idx = this._slots.findIndex(s => s.drone === null);
    if (idx === -1) return null;
    const cost = DRONE_COSTS[type];
    if (gameState.credits < cost) return null;

    gameState.addCredits(-cost);
    const drone = spawnDrone(type, this.x, this.y);
    wc.addChild(drone.container);
    this._slots[idx] = { drone, droneType: type };
    fleetManager.add(drone);
    EventBus.emit('drone:purchased', type);
    return drone;
  }

  /** Free a slot by index (no refund — caller handles that). */
  releaseSlot(slotIndex: number): void {
    const slot = this._slots[slotIndex];
    if (!slot) return;
    slot.drone = null;
    slot.droneType = null;
  }

  /** Add a drone to an empty slot for free (used for starter drone). */
  addStarterDrone(drone: DroneBase, worldContainer: Container): void {
    this._worldContainer = worldContainer;
    const idx = this._slots.findIndex(s => s.drone === null);
    if (idx === -1) {
      // Expand slots if needed
      this._slotCount++;
      this._slots.push({ drone: null, droneType: null });
    }
    const slot = this._slots[this._slots.findIndex(s => s.drone === null)];
    slot.drone = drone;
    slot.droneType = drone.droneType;
    fleetManager.add(drone);
  }

  /** Return all live drone instances (for scene cleanup). */
  getAllDrones(): DroneBase[] {
    return this._slots.filter(s => s.drone !== null).map(s => s.drone!);
  }

  serialize(): { id: string; kind: 'planet'; slotCount: number; slots: (DroneType | null)[] } {
    return {
      id: this.id,
      kind: 'planet',
      slotCount: this._slotCount,
      slots: this._slots.map(s => s.droneType),
    };
  }

  restore(
    data: { slotCount?: number; slots?: (DroneType | null)[] },
    worldContainer: Container,
  ): void {
    this._worldContainer = worldContainer;
    if (data.slotCount && data.slotCount > this._slotCount) {
      while (this._slots.length < data.slotCount) {
        this._slots.push({ drone: null, droneType: null });
      }
      this._slotCount = data.slotCount;
    }
    if (data.slots) {
      for (let i = 0; i < data.slots.length && i < this._slots.length; i++) {
        const type = data.slots[i];
        if (type) {
          const drone = spawnDrone(type, this.x, this.y);
          worldContainer.addChild(drone.container);
          this._slots[i] = { drone, droneType: type };
          fleetManager.add(drone);
        }
      }
    }
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'OPEN', target: 'DRONE BAY' };
  }

  unregister(): void {
    droneBayRegistry.unregister(this.id);
  }
}
