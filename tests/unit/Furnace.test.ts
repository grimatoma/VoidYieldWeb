import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock('@services/Inventory', () => ({
  inventory: {
    getByType: vi.fn().mockReturnValue(0),
    drain: vi.fn().mockReturnValue([]),
    add: vi.fn(),
  },
}));

// Fully mock ProcessingPlant to avoid PixiJS dependency.
vi.mock('@entities/ProcessingPlant', () => ({
  ProcessingPlant: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    insertBatch: vi.fn().mockReturnValue(2),
    link: vi.fn(),
    destroy: vi.fn(),
    manualOnly: true,
    state: 'STALLED',
    batchProgress: 0,
    hasInput: false,
    schematic: { inputType: 'iron_ore', inputQty: 2, batchPerMin: 10 },
  })),
}));

// Minimal pixi.js mock so Furnace constructor doesn't crash.
vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    x: 0, y: 0,
    anchor: { set: vi.fn() },
  });
  return {
    Container: vi.fn().mockImplementation(make),
    Graphics: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(() => ({ ...make(), text: '' })),
    TextStyle: vi.fn(),
  };
});

// Stub SCHEMATICS so Furnace can build a plant.
vi.mock('@data/schematics', () => ({
  SCHEMATICS: {
    iron_smelter: {
      schematicId: 'iron_smelter',
      name: 'Iron Smelt',
      inputType: 'iron_ore',
      inputQty: 2,
      outputType: 'iron_bar',
      outputQty: 1,
      batchPerMin: 10,
      powerDraw: 3,
    },
    copper_smelter: {
      schematicId: 'copper_smelter',
      name: 'Copper Smelt',
      inputType: 'copper_ore',
      inputQty: 2,
      outputType: 'copper_bar',
      outputQty: 1,
      batchPerMin: 7.5,
      powerDraw: 3,
    },
  },
}));

import { Furnace } from '@entities/Furnace';
import { ProcessingPlant } from '@entities/ProcessingPlant';
import { EventBus } from '@services/EventBus';
import { inventory } from '@services/Inventory';

function makeOutputDepot() {
  return {
    deposit: vi.fn(),
    pull: vi.fn().mockReturnValue(0),
    isNearby: vi.fn().mockReturnValue(false),
    x: 200, y: 200,
    container: {},
    getStockpile: vi.fn().mockReturnValue(new Map()),
    getTotal: vi.fn().mockReturnValue(0),
    isFull: vi.fn().mockReturnValue(false),
    getRemainingCapacity: vi.fn().mockReturnValue(50),
  } as any;
}

describe('Furnace', () => {
  let furnace: Furnace;
  let outputDepot: ReturnType<typeof makeOutputDepot>;

  beforeEach(() => {
    vi.clearAllMocks();
    outputDepot = makeOutputDepot();
    furnace = new Furnace(100, 100, outputDepot);
  });

  it('starts with recipe "off"', () => {
    expect(furnace.recipe).toBe('off');
  });

  it('setRecipe("iron") switches recipe to iron and emits furnace:state-changed idle', () => {
    furnace.setRecipe('iron');
    expect(furnace.recipe).toBe('iron');
    expect(vi.mocked(EventBus.emit)).toHaveBeenCalledWith('furnace:state-changed', 'idle');
  });

  it('setRecipe("copper") switches recipe to copper', () => {
    furnace.setRecipe('copper');
    expect(furnace.recipe).toBe('copper');
  });

  it('setRecipe("off") emits furnace:state-changed idle', () => {
    furnace.setRecipe('iron');
    vi.mocked(EventBus.emit).mockClear();

    furnace.setRecipe('off');
    expect(furnace.recipe).toBe('off');
    expect(vi.mocked(EventBus.emit)).toHaveBeenCalledWith('furnace:state-changed', 'idle');
  });

  it('insertFromInventory returns 0 when recipe is "off"', () => {
    const result = furnace.insertFromInventory();
    expect(result).toBe(0);
  });

  it('insertFromInventory returns 0 when inventory has no matching ore', () => {
    furnace.setRecipe('iron');
    vi.mocked(inventory.getByType).mockReturnValue(0);
    const result = furnace.insertFromInventory();
    expect(result).toBe(0);
  });

  it('insertFromInventory with 4 iron_ore inserts 2 (inputQty cap) and drains from inventory', () => {
    furnace.setRecipe('iron');

    // Inventory has 4 iron_ore; plant.insertBatch returns 2 (cap at inputQty).
    vi.mocked(inventory.getByType).mockReturnValue(4);
    vi.mocked(inventory.drain).mockReturnValue([
      { oreType: 'iron_ore', quantity: 4, attributes: {} },
    ]);

    const result = furnace.insertFromInventory();

    expect(result).toBe(2);
    // drain() was called to remove ore from inventory.
    expect(vi.mocked(inventory.drain)).toHaveBeenCalled();
    // The remaining 2 ore should be re-added.
    expect(vi.mocked(inventory.add)).toHaveBeenCalledWith(
      expect.objectContaining({ oreType: 'iron_ore', quantity: 2 }),
    );
  });

  it('insertFromInventory does not touch other ore types in inventory', () => {
    furnace.setRecipe('iron');

    vi.mocked(inventory.getByType).mockReturnValue(2);
    vi.mocked(inventory.drain).mockReturnValue([
      { oreType: 'iron_ore', quantity: 2, attributes: {} },
      { oreType: 'copper_ore', quantity: 5, attributes: {} },
    ]);

    furnace.insertFromInventory();

    // copper_ore lot (quantity 5) should be re-added unchanged.
    expect(vi.mocked(inventory.add)).toHaveBeenCalledWith(
      expect.objectContaining({ oreType: 'copper_ore', quantity: 5 }),
    );
  });

  it('insertFromInventory emits inventory:changed on success', () => {
    furnace.setRecipe('iron');
    vi.mocked(inventory.getByType).mockReturnValue(2);
    vi.mocked(inventory.drain).mockReturnValue([
      { oreType: 'iron_ore', quantity: 2, attributes: {} },
    ]);
    vi.mocked(EventBus.emit).mockClear();

    furnace.insertFromInventory();

    expect(vi.mocked(EventBus.emit)).toHaveBeenCalledWith('inventory:changed');
  });

  it('getBatchProgress returns plant.batchProgress when recipe is active', () => {
    furnace.setRecipe('iron');
    const mockPlant = vi.mocked(ProcessingPlant).mock.results.at(-1)!.value;
    mockPlant.batchProgress = 0.75;

    expect(furnace.getBatchProgress()).toBe(0.75);
  });

  it('getBatchProgress returns 0 when recipe is off', () => {
    expect(furnace.getBatchProgress()).toBe(0);
  });

  it('isLoaded returns plant.hasInput when recipe is active', () => {
    furnace.setRecipe('iron');
    const mockPlant = vi.mocked(ProcessingPlant).mock.results.at(-1)!.value;
    mockPlant.hasInput = true;

    expect(furnace.isLoaded()).toBe(true);
  });

  it('isLoaded returns false when recipe is off', () => {
    expect(furnace.isLoaded()).toBe(false);
  });
});
