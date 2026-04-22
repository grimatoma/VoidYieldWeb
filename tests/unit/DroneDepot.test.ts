import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock PixiJS — DroneDepot uses Container, Graphics, Text, TextStyle
// ---------------------------------------------------------------------------
vi.mock('pixi.js', () => {
  const makeContainer = () => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    x: 0,
    y: 0,
    destroy: vi.fn(),
  });
  return {
    Container:  vi.fn().mockImplementation(makeContainer),
    Graphics:   vi.fn().mockImplementation(() => ({
      rect:   vi.fn().mockReturnThis(),
      fill:   vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
    })),
    Text:       vi.fn().mockImplementation(() => ({ anchor: { set: vi.fn() } })),
    TextStyle:  vi.fn(),
  };
});

// Mock PlacedBuilding (only CELL_SIZE is needed)
vi.mock('@entities/PlacedBuilding', () => ({
  CELL_SIZE: 80,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

// reset depotBuilt before each test
import { resetDepotBuilt } from '@entities/DroneDepot';
import { DroneDepot } from '@entities/DroneDepot';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStorage() {
  return {
    x: 200,
    y: 200,
    isFull: vi.fn(() => false),
    getBarCount: vi.fn(() => 0),
    getStockpile: vi.fn(() => new Map()),
    pull: vi.fn(() => 0),
    deposit: vi.fn(),
  };
}

function makeFurnace() {
  return {
    x: 300,
    y: 200,
    recipe: 'off',
    manualOnly: true,
    insertBatch: vi.fn(() => 0),
  };
}

function makeDispatcher() {
  return {
    configure: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    update: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DroneDepot', () => {
  beforeEach(() => {
    resetDepotBuilt();
  });

  it('onBuild sets furnace.manualOnly = false', () => {
    const depot = new DroneDepot(400, 300);
    const storage = makeStorage();
    const furnace = makeFurnace();
    const dispatcher = makeDispatcher();

    expect(furnace.manualOnly).toBe(true);
    depot.onBuild(storage as any, furnace as any, dispatcher as any);
    expect(furnace.manualOnly).toBe(false);
  });

  it('onBuild calls dispatcher.configure with correct slot configs', () => {
    const depot = new DroneDepot(400, 300);
    const storage = makeStorage();
    const furnace = makeFurnace();
    const dispatcher = makeDispatcher();

    depot.onBuild(storage as any, furnace as any, dispatcher as any);

    expect(dispatcher.configure).toHaveBeenCalledOnce();
    const [s, f, slots] = dispatcher.configure.mock.calls[0];
    expect(s).toBe(storage);
    expect(f).toBe(furnace);
    expect(slots).toHaveLength(3);
    expect(slots[0]).toMatchObject({ slotId: 'slot_0', role: 'miner',     oreType: 'iron_ore' });
    expect(slots[1]).toMatchObject({ slotId: 'slot_1', role: 'miner',     oreType: 'copper_ore' });
    expect(slots[2]).toMatchObject({ slotId: 'slot_2', role: 'logistics', oreType: 'any' });
  });

  it('setSlotConfig updates a slot and re-configures dispatcher', () => {
    const depot = new DroneDepot(400, 300);
    const storage = makeStorage();
    const furnace = makeFurnace();
    const dispatcher = makeDispatcher();

    depot.onBuild(storage as any, furnace as any, dispatcher as any);
    dispatcher.configure.mockClear();

    depot.setSlotConfig('slot_1', { slotId: 'slot_1', role: 'miner', oreType: 'iron_ore' });

    expect(dispatcher.configure).toHaveBeenCalledOnce();
    const slots = depot.getSlotConfigs();
    expect(slots[1]).toMatchObject({ slotId: 'slot_1', role: 'miner', oreType: 'iron_ore' });
  });

  it('second DroneDepot throws (MVP limit)', () => {
    const depot1 = new DroneDepot(400, 300);
    const storage = makeStorage();
    const furnace1 = makeFurnace();
    const dispatcher1 = makeDispatcher();
    depot1.onBuild(storage as any, furnace1 as any, dispatcher1 as any);

    const depot2 = new DroneDepot(500, 300);
    const furnace2 = makeFurnace();
    const dispatcher2 = makeDispatcher();

    expect(() => {
      depot2.onBuild(storage as any, furnace2 as any, dispatcher2 as any);
    }).toThrow();
  });
});
