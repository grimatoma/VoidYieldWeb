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
    parent: null,
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

vi.mock('@entities/PlacedBuilding', () => ({
  CELL_SIZE: 80,
}));

vi.mock('@services/DroneBayRegistry', () => ({
  droneBayRegistry: {
    register:   vi.fn(),
    unregister: vi.fn(),
  },
}));

vi.mock('@services/FleetManager', () => ({
  fleetManager: {
    add:    vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@services/GameState', () => ({
  gameState: {
    credits: 500,
    addCredits: vi.fn(),
  },
}));

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { resetDepotBuilt, DroneDepot } from '@entities/DroneDepot';
import { droneBayRegistry } from '@services/DroneBayRegistry';
import { gameState } from '@services/GameState';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorldContainer() {
  return { addChild: vi.fn(), removeChild: vi.fn() };
}

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
    vi.clearAllMocks();
    (gameState as any).credits = 500;
  });

  it('onBuild registers with droneBayRegistry', () => {
    const depot = new DroneDepot(400, 300);
    const wc = makeWorldContainer();
    depot.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);
    expect(droneBayRegistry.register).toHaveBeenCalledWith(depot);
  });

  it('onBuild calls dispatcher.configure with BaySlot array (no oreType)', () => {
    const depot = new DroneDepot(400, 300);
    const dispatcher = makeDispatcher();
    const wc = makeWorldContainer();

    depot.onBuild(makeStorage() as any, makeFurnace() as any, dispatcher as any, wc as any);

    expect(dispatcher.configure).toHaveBeenCalledOnce();
    const [, , pos, slots] = dispatcher.configure.mock.calls[0];
    expect(pos).toMatchObject({ x: 400, y: 300 });
    expect(slots).toHaveLength(4);
    // New shape: BaySlot — no slotId, no oreType
    expect(slots[0]).toMatchObject({ drone: null, droneType: null });
    expect(Object.keys(slots[0])).not.toContain('oreType');
    expect(Object.keys(slots[0])).not.toContain('slotId');
  });

  it('onBuild leaves furnace.manualOnly as true', () => {
    const depot = new DroneDepot(400, 300);
    const furnace = makeFurnace();
    const wc = makeWorldContainer();
    depot.onBuild(makeStorage() as any, furnace as any, makeDispatcher() as any, wc as any);
    expect(furnace.manualOnly).toBe(true);
  });

  it('second DroneDepot throws (MVP limit)', () => {
    const depot1 = new DroneDepot(400, 300);
    const wc = makeWorldContainer();
    depot1.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);

    const depot2 = new DroneDepot(500, 300);
    expect(() => {
      depot2.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);
    }).toThrow();
  });

  it('upgradeSlot deducts credits and grows slot array', () => {
    const depot = new DroneDepot(400, 300, 4);
    const wc = makeWorldContainer();
    depot.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);

    const cost = depot.upgradeCost(); // 100 * (4+1)^2 = 2500
    expect(cost).toBe(2500);

    // Set credits high enough
    (gameState as any).credits = 9999;
    const result = depot.upgradeSlot();
    expect(result).toBe(true);
    expect(gameState.addCredits).toHaveBeenCalledWith(-cost);
    expect(depot.slotCount).toBe(5);
    expect(depot.slots).toHaveLength(5);
  });

  it('upgradeSlot returns false when credits insufficient', () => {
    const depot = new DroneDepot(400, 300, 4);
    const wc = makeWorldContainer();
    depot.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);
    (gameState as any).credits = 0;
    expect(depot.upgradeSlot()).toBe(false);
    expect(depot.slotCount).toBe(4);
  });

  it('getBaySlotData serialises slot indices', () => {
    const depot = new DroneDepot(400, 300, 3);
    const wc = makeWorldContainer();
    depot.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);

    const data = depot.getBaySlotData();
    expect(data).toHaveLength(3);
    expect(data[0]).toMatchObject({ slotIndex: 0, droneType: null });
    expect(data[1]).toMatchObject({ slotIndex: 1, droneType: null });
  });

  it('restoreBaySlot accepts slotId format (backwards compat)', () => {
    const depot = new DroneDepot(400, 300, 4);
    const wc = makeWorldContainer();
    depot.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);

    // Old format used slotId: 'slot_0'
    depot.restoreBaySlot({ slotId: 'slot_0', droneType: 'scout' }, wc as any);
    expect(depot.slots[0].droneType).toBe('scout');
  });

  it('restoreBaySlot accepts slotIndex format', () => {
    const depot = new DroneDepot(400, 300, 4);
    const wc = makeWorldContainer();
    depot.onBuild(makeStorage() as any, makeFurnace() as any, makeDispatcher() as any, wc as any);

    depot.restoreBaySlot({ slotIndex: 2, droneType: 'refinery' }, wc as any);
    expect(depot.slots[2].droneType).toBe('refinery');
  });
});
