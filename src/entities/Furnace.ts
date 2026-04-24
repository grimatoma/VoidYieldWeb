import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ProcessingPlant } from './ProcessingPlant';
import type { StorageDepot } from './StorageDepot';
import { inventory } from '@services/Inventory';
import { EventBus } from '@services/EventBus';
import { SCHEMATICS } from '@data/schematics';
import type { OreType } from '@data/types';

export type FurnaceRecipe = 'iron' | 'copper' | 'off';

export const FURNACE_RECIPES: Record<
  Exclude<FurnaceRecipe, 'off'>,
  { input: OreType; output: OreType; inputQty: number; outputQty: number; batchSec: number }
> = {
  iron:   { input: 'iron_ore',   output: 'iron_bar',   inputQty: 2, outputQty: 1, batchSec: 1 },
  copper: { input: 'copper_ore', output: 'copper_bar', inputQty: 2, outputQty: 1, batchSec: 1 },
};

/** Schematics keyed by recipe name for ProcessingPlant construction. */
const RECIPE_SCHEMATICS: Record<Exclude<FurnaceRecipe, 'off'>, string> = {
  iron: 'iron_smelter',
  copper: 'copper_smelter',
};

export class Furnace {
  readonly container: Container;
  readonly x: number;
  readonly y: number;
  private _plant: ProcessingPlant;
  private _outputDepot: StorageDepot;
  private _recipe: FurnaceRecipe = 'off';
  manualOnly = true;

  private _lastEmittedState: 'idle' | 'running' | 'output-ready' = 'idle';

  constructor(worldX: number, worldY: number, outputDepot: StorageDepot) {
    this.x = worldX;
    this.y = worldY;
    this._outputDepot = outputDepot;

    // Build a default plant with the iron_smelter schematic as a placeholder.
    // It will be reconfigured when setRecipe() is called.
    this._plant = new ProcessingPlant(worldX, worldY, SCHEMATICS.iron_smelter);
    this._plant.manualOnly = true;
    // Link only the output depot; the Furnace provides input via insertBatch().
    this._plant.link(outputDepot, outputDepot);

    // Visual container — teal-bordered dark rect 40×40 with "FURNACE" label.
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    const body = new Graphics();
    body.rect(-20, -20, 40, 40).fill(0x2A1A0A);
    body.rect(-20, -20, 40, 40).stroke({ width: 2, color: 0xD4A843 });
    this.container.addChild(body);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: '#D4A843' });
    const lbl = new Text({ text: 'FURNACE', style });
    (lbl as any).anchor?.set(0.5);
    this.container.addChild(lbl);
  }

  get recipe(): FurnaceRecipe { return this._recipe; }

  /**
   * Switch the active recipe. Rebuilds the internal ProcessingPlant with the
   * appropriate schematic. Emits `furnace:state-changed`.
   */
  setRecipe(recipe: FurnaceRecipe): void {
    this._recipe = recipe;

    if (recipe === 'off') {
      EventBus.emit('furnace:state-changed', 'idle');
      this._lastEmittedState = 'idle';
      return;
    }

    const schematicId = RECIPE_SCHEMATICS[recipe];
    const schematic = SCHEMATICS[schematicId];

    // Destroy old plant to unregister its power draw.
    this._plant.destroy();

    // Build a fresh plant for the new recipe.
    this._plant = new ProcessingPlant(this.x, this.y, schematic);
    this._plant.manualOnly = this.manualOnly;
    // Link output depot only; input is fed manually.
    this._plant.link(this._outputDepot, this._outputDepot);

    EventBus.emit('furnace:state-changed', 'idle');
    this._lastEmittedState = 'idle';
  }

  /**
   * Insert ore directly from an external source (e.g., a logistics drone).
   * Returns the number of units actually accepted.
   */
  insertBatch(oreType: OreType, qty: number): number {
    if (this._recipe === 'off') return 0;
    return this._plant.insertBatch(oreType, qty);
  }

  /**
   * Called by a player E-press: consume matching ore from player inventory
   * and push it into the furnace input buffer.
   * Returns the number of ore units actually inserted.
   */
  insertFromInventory(): number {
    if (this._recipe === 'off') return 0;

    const r = FURNACE_RECIPES[this._recipe];
    const available = inventory.getByType(r.input);
    if (available <= 0) return 0;

    const inserted = this._plant.insertBatch(r.input, available);
    if (inserted <= 0) return 0;

    // Drain all inventory lots, reduce the matching ore by the inserted amount,
    // and put everything else back.
    const lots = inventory.drain();
    let toRemove = inserted;
    for (const lot of lots) {
      if (lot.oreType === r.input && toRemove > 0) {
        const removed = Math.min(lot.quantity, toRemove);
        toRemove -= removed;
        lot.quantity -= removed;
      }
    }
    // Re-add lots that still have ore remaining.
    for (const lot of lots) {
      if (lot.quantity > 0) {
        inventory.add(lot);
      }
    }

    EventBus.emit('inventory:changed');
    return inserted;
  }

  /**
   * Called by a player E-press: extract products from the furnace output buffer
   * and add them to the player's inventory.
   */
  takeProducts(): boolean {
    if (this._recipe === 'off') return false;
    const lot = this._plant.takeOutput();
    if (!lot) return false;
    inventory.add(lot);
    EventBus.emit('inventory:changed');
    return true;
  }

  /** Called every frame from the scene update loop. */
  update(delta: number): void {
    if (this._recipe === 'off') return;
    this._plant.update(delta);

    // Emit furnace:state-changed only when the state transitions.
    const plantState = this._plant.state;
    let furnaceState: 'idle' | 'running' | 'output-ready';
    if (plantState === 'RUNNING') {
      furnaceState = 'running';
    } else if (plantState === 'STALLED') {
      furnaceState = 'idle';
    } else {
      // NO_POWER — treat as idle for overlay purposes
      furnaceState = 'idle';
    }

    if (furnaceState !== this._lastEmittedState) {
      this._lastEmittedState = furnaceState;
      EventBus.emit('furnace:state-changed', furnaceState);
    }
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    if (this._recipe === 'off') {
      return { verb: 'CONFIGURE', target: 'FURNACE (off)' };
    }
    
    if (this._plant.outputBuffer > 0) {
      return { verb: 'TAKE', target: 'PRODUCTS' };
    }

    const r = FURNACE_RECIPES[this._recipe];
    const canInsert = inventory.getByType(r.input) > 0;
    return canInsert
      ? {
          verb: 'INSERT',
          target: `${r.input.replace(/_/g, ' ').toUpperCase()} → ${r.output.replace(/_/g, ' ').toUpperCase()}`,
        }
      : { verb: 'CONFIGURE', target: `FURNACE (${this._recipe})` };
  }

  /** Expose internal plant for queries */
  get plant() { return this._plant; }

  /** Expose the internal plant state for the overlay. */
  getPlantState(): string {
    if (this._recipe === 'off') return 'OFF';
    return this._plant.state;
  }

  /** 0–1 progress through the current batch interval; 0 when no ore is loaded. */
  getBatchProgress(): number {
    if (this._recipe === 'off') return 0;
    return this._plant.batchProgress;
  }

  /** True when the plant buffer holds a full batch of ore and is processing. */
  isLoaded(): boolean {
    if (this._recipe === 'off') return false;
    return this._plant.hasInput;
  }

  destroy(): void {
    this._plant.destroy();
  }
}
