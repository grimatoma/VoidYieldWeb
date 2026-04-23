import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Lightweight mocks — no PixiJS, no real services
// ---------------------------------------------------------------------------

// Shared drone storage for fleetManager mock (used by logistics path only)
let _mockDrones: MockDrone[] = [];

vi.mock('@services/FleetManager', () => ({
  fleetManager: {
    getIdleDrones: () => _mockDrones.filter(d => d.state === 'IDLE' && d.getTasks().length === 0),
    getDronesByType: (type: string) => _mockDrones.filter(d => d.droneType === type),
  },
}));

vi.mock('@services/DepositMap', () => ({
  depositMap: {
    getNearestUnclaimedDeposit: vi.fn(),
  },
}));

vi.mock('@entities/Furnace', () => ({
  FURNACE_RECIPES: {
    iron:   { input: 'iron_ore',   output: 'iron_bar',   inputQty: 2, outputQty: 1, batchSec: 6 },
    copper: { input: 'copper_ore', output: 'copper_bar', inputQty: 2, outputQty: 1, batchSec: 8 },
  },
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MockDrone {
  id: string;
  droneType: string;
  state: string;
  x: number;
  y: number;
  carryCapacity: number;
  mineTimeSec: number;
  disabled: boolean;
  cargo: null | { oreType: string; quantity: number; attributes: object };
  _tasks: unknown[];
  pushTask: ReturnType<typeof vi.fn>;
  getTasks: () => unknown[];
}

interface MockDeposit {
  data: { x: number; y: number; oreType: string; isExhausted: boolean };
  claim: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  mine: ReturnType<typeof vi.fn>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDrone(id: string, droneType = 'scout'): MockDrone {
  const tasks: unknown[] = [];
  return {
    id,
    droneType,
    state: 'IDLE',
    x: 0,
    y: 0,
    carryCapacity: 3,
    mineTimeSec: 3.0,
    disabled: false,
    cargo: null,
    _tasks: tasks,
    pushTask: vi.fn((t) => { tasks.push(t); return true; }),
    getTasks: () => tasks,
  };
}

function makeDeposit(oreType: string): MockDeposit {
  return {
    data: { x: 100, y: 100, oreType, isExhausted: false },
    claim: vi.fn(() => true),
    release: vi.fn(),
    mine: vi.fn((n: number) => ({ oreType, quantity: n, attributes: {} })),
  };
}

function makeStorage(stockpile: Record<string, number> = {}, full = false) {
  const map = new Map(Object.entries(stockpile));
  return {
    x: 200,
    y: 200,
    isFull: vi.fn(() => full),
    getBarCount: vi.fn((k: string) => map.get(k) ?? 0),
    getStockpile: vi.fn(() => map),
    pull: vi.fn((ore: string, qty: number) => {
      const cur = map.get(ore) ?? 0;
      const rem = Math.min(cur, qty);
      map.set(ore, cur - rem);
      return rem;
    }),
    deposit: vi.fn(),
  };
}

function makeFurnace(recipe = 'off') {
  return {
    x: 300,
    y: 200,
    recipe,
    insertBatch: vi.fn((_ore: string, _qty: number) => 0),
    manualOnly: true,
    plant: {
      inputBuffer: 0,
      outputBuffer: 0,
      takeOutput: vi.fn(() => null),
    },
  };
}

// Bay slot with no drone (empty)
function emptySlot(slotId: string, oreType: DroneBaySlot['oreType'] = 'iron_ore'): DroneBaySlot {
  return { slotId, drone: null, droneType: null, oreType };
}

// Bay slot with a bound drone
function occupiedSlot(slotId: string, drone: MockDrone, oreType: DroneBaySlot['oreType'] = 'iron_ore'): DroneBaySlot {
  return { slotId, drone: drone as any, droneType: drone.droneType as 'scout' | 'heavy', oreType };
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { OutpostDispatcher } from '@services/OutpostDispatcher';
import type { DroneBaySlot } from '@services/OutpostDispatcher';
import { depositMap } from '@services/DepositMap';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OutpostDispatcher', () => {
  let dispatcher: OutpostDispatcher;

  beforeEach(() => {
    _mockDrones = [];
    dispatcher = new OutpostDispatcher();
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReset();
  });

  it('does nothing when not started', () => {
    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const miner = makeDrone('d1', 'scout');
    const slots: DroneBaySlot[] = [occupiedSlot('slot_0', miner, 'iron_ore')];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots);
    // NOT calling dispatcher.start()
    dispatcher.update(0.016);

    expect(miner.pushTask).not.toHaveBeenCalled();
  });

  it('miner slot dispatches to its bound drone using nearest unclaimed deposit', () => {
    const deposit = makeDeposit('iron_ore');
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const miner = makeDrone('d1', 'scout');
    const slots: DroneBaySlot[] = [
      occupiedSlot('slot_0', miner, 'iron_ore'),
      emptySlot('slot_1', 'copper_ore'),
    ];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(deposit.claim).toHaveBeenCalledWith('d1');
    expect(miner.pushTask).toHaveBeenCalledTimes(2); // MINE + CARRY
  });

  it('miner skips when getNearestUnclaimedDeposit returns null', () => {
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(null);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const miner = makeDrone('d1', 'scout');
    const slots: DroneBaySlot[] = [occupiedSlot('slot_0', miner, 'iron_ore')];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.pushTask).not.toHaveBeenCalled();
  });

  it('miner skips disabled drones', () => {
    const deposit = makeDeposit('iron_ore');
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const miner = makeDrone('d1', 'scout');
    miner.disabled = true;
    const slots: DroneBaySlot[] = [occupiedSlot('slot_0', miner, 'iron_ore')];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.pushTask).not.toHaveBeenCalled();
  });

  it('empty slots are skipped — no NullPointerError', () => {
    const deposit = makeDeposit('iron_ore');
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const slots: DroneBaySlot[] = [
      emptySlot('slot_0', 'iron_ore'),
      emptySlot('slot_1', 'copper_ore'),
    ];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots);
    dispatcher.start();
    // Should not throw
    expect(() => dispatcher.update(0.016)).not.toThrow();
    expect(deposit.claim).not.toHaveBeenCalled();
  });

  it('logistics does nothing when furnace recipe is off', () => {
    const storage = makeStorage({ iron_ore: 10 });
    const furnace = makeFurnace('off');
    const cargo = makeDrone('c1', 'refinery');
    _mockDrones = [cargo];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, []);
    dispatcher.start();
    dispatcher.update(0.016);

    // The drone should be commanded to return to the depot and wait.
    expect(cargo.pushTask).toHaveBeenCalledTimes(1);
    expect(cargo.getTasks()[0]).toMatchObject({ targetX: 500, targetY: 500 });
  });

  it('logistics pushes carry tasks when furnace has recipe and storage has ore', () => {
    const storage = makeStorage({ iron_ore: 10 });
    const furnace = makeFurnace('iron');
    const cargo = makeDrone('c1', 'refinery');
    _mockDrones = [cargo];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, []);
    dispatcher.start();
    dispatcher.update(0.016);

    // Two tasks: pull-from-storage CARRY + deliver-to-furnace CARRY
    expect(cargo.pushTask).toHaveBeenCalledTimes(2);
  });
});
