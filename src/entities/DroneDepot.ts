import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CELL_SIZE } from './PlacedBuilding';
import type { StorageDepot } from './StorageDepot';
import type { Furnace } from './Furnace';
import type { OutpostDispatcher, DroneSlotConfig } from '@services/OutpostDispatcher';
import type { OreType } from '@data/types';

/** Module-level flag to enforce MVP limit of one DroneDepot per outpost. */
let _depotBuilt = false;

/** Reset the built flag — used in tests and on scene exit. */
export function resetDepotBuilt(): void {
  _depotBuilt = false;
}

/**
 * DroneDepot — manages slot configs for outpost miner/logistics drones.
 * When built (onBuild), disables manual-only furnace mode and starts the
 * OutpostDispatcher with default 3-slot config.
 */
export class DroneDepot {
  readonly container: Container;
  readonly x: number;
  readonly y: number;

  private _slots: DroneSlotConfig[] = [
    { slotId: 'slot_0', role: 'miner',    oreType: 'iron_ore' as OreType },
    { slotId: 'slot_1', role: 'miner',    oreType: 'copper_ore' as OreType },
    { slotId: 'slot_2', role: 'logistics', oreType: 'any' },
  ];

  private _dispatcher: OutpostDispatcher | null = null;
  private _storage: StorageDepot | null = null;
  private _furnace: Furnace | null = null;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;

    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // 2×2 footprint: 2×CELL_SIZE wide, 2×CELL_SIZE tall, minus 4px padding
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
   * Sets furnace.manualOnly = false, configures the dispatcher, and starts it.
   * Throws if a second DroneDepot is placed (MVP limit).
   */
  onBuild(storage: StorageDepot, furnace: Furnace, dispatcher: OutpostDispatcher): void {
    if (_depotBuilt) {
      console.warn('DroneDepot: only one Drone Depot may be placed per outpost (MVP limit).');
      throw new Error('DroneDepot: only one Drone Depot allowed per outpost.');
    }
    _depotBuilt = true;

    this._storage = storage;
    this._furnace = furnace;
    this._dispatcher = dispatcher;

    // Enable auto-feed mode for the furnace.
    furnace.manualOnly = false;

    dispatcher.configure(storage, furnace, this._slots);
    dispatcher.start();
  }

  /**
   * Update the role/ore config for a given slot ID.
   * Re-configures the dispatcher immediately if it's been built.
   */
  setSlotConfig(slotId: string, config: DroneSlotConfig): void {
    const idx = this._slots.findIndex(s => s.slotId === slotId);
    if (idx === -1) {
      console.warn(`DroneDepot.setSlotConfig: unknown slotId "${slotId}"`);
      return;
    }
    this._slots[idx] = { ...config, slotId };

    if (this._dispatcher && this._storage && this._furnace) {
      this._dispatcher.configure(this._storage, this._furnace, this._slots);
    }
  }

  /** Returns a copy of the current slot configs. */
  getSlotConfigs(): DroneSlotConfig[] {
    return this._slots.map(s => ({ ...s }));
  }

  isNearby(px: number, py: number, radius = 120): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'CONFIGURE', target: 'DRONE DEPOT' };
  }
}
