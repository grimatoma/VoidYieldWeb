import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Lightweight mocks — no PixiJS, no real services
// ---------------------------------------------------------------------------

// Shared drone storage for fleetManager mock
let _mockDrones: MockDrone[] = [];

vi.mock('@services/FleetManager', () => ({
  fleetManager: {
    getIdleDrones: () => _mockDrones.filter(d => d.state === 'IDLE' && d.getTasks().length === 0),
    getDronesByType: (type: string) => _mockDrones.filter(d => d.droneType === type),
    setDroneDisabled: vi.fn((id: string, disabled: boolean) => {
      const drone = _mockDrones.find(d => d.id === id);
      if (drone) drone.disabled = disabled;
      return { disabled, ok: !!drone };
    }),
  },
}));

vi.mock('@services/DepositMap', () => ({
  depositMap: {
    getNearestUnclaimedDeposit: vi.fn(),
    releaseClaimsBy: vi.fn(),
  },
}));

vi.mock('@entities/Furnace', () => ({
  FURNACE_RECIPES: {
    iron:   { input: 'iron_ore',   output: 'iron_bar',   inputQty: 2, outputQty: 1, batchSec: 6 },
    copper: { input: 'copper_ore', output: 'copper_bar', inputQty: 2, outputQty: 1, batchSec: 8 },
  },
}));

// ---------------------------------------------------------------------------
// Types — BaySlot (matches @services/DroneBayRegistry interface)
// ---------------------------------------------------------------------------

interface MockDrone {
  id: string;
  droneType: string;
  orePreference: string | null;
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
  clearTasks: ReturnType<typeof vi.fn>;
}

interface MockBaySlot {
  drone: MockDrone | null;
  droneType: string | null;
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

function makeDrone(id: string, droneType = 'scout', orePreference: string | null = null): MockDrone {
  const tasks: unknown[] = [];
  return {
    id,
    droneType,
    orePreference,
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
    clearTasks: vi.fn(() => { tasks.length = 0; }),
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

// Slot helpers — BaySlot shape: { drone, droneType }; no slotId or oreType
function emptySlot(): MockBaySlot {
  return { drone: null, droneType: null };
}

function occupiedSlot(drone: MockDrone): MockBaySlot {
  return { drone, droneType: drone.droneType };
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { OutpostDispatcher } from '@services/OutpostDispatcher';
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
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    // NOT calling dispatcher.start()
    dispatcher.update(0.016);

    expect(miner.pushTask).not.toHaveBeenCalled();
  });

  it('miner dispatches using drone.orePreference (not slot oreType)', () => {
    const deposit = makeDeposit('iron_ore');
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    const slots: MockBaySlot[] = [
      occupiedSlot(miner),
      emptySlot(),
    ];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    // getNearestUnclaimedDeposit is called with drone.orePreference
    expect(depositMap.getNearestUnclaimedDeposit).toHaveBeenCalledWith(0, 0, 'iron_ore');
    expect(deposit.claim).toHaveBeenCalledWith('d1');
    expect(miner.pushTask).toHaveBeenCalledTimes(2); // MINE + CARRY
  });

  it('miner returns to depot when no deposit is available', () => {
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(null);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    // Drone starts far from depot so return trip is triggered.
    miner.x = 0; miner.y = 0;
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.pushTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CARRY', targetX: 500, targetY: 500 }),
    );
    expect(miner.pushTask).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'MINE' }));
  });

  it('miner skips disabled drones', () => {
    const deposit = makeDeposit('iron_ore');
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    miner.disabled = true;
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.pushTask).not.toHaveBeenCalled();
  });

  it('empty slots are skipped — no NullPointerError', () => {
    const deposit = makeDeposit('iron_ore');
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('iron');
    const slots: MockBaySlot[] = [emptySlot(), emptySlot()];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    expect(() => dispatcher.update(0.016)).not.toThrow();
    expect(deposit.claim).not.toHaveBeenCalled();
  });

  it('logistics does nothing when furnace recipe is off', () => {
    const storage = makeStorage({ iron_ore: 10 });
    const furnace = makeFurnace('off');
    const cargo = makeDrone('c1', 'refinery');
    _mockDrones = [cargo];

    // Cargo drone must be in a slot so the logistics filter finds it
    const slots: MockBaySlot[] = [occupiedSlot(cargo)];
    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    // No output buffer, no recipe → idle return task (1 task: move back to depot)
    expect(cargo.pushTask).toHaveBeenCalledTimes(1);
    expect(cargo.getTasks()[0]).toMatchObject({ targetX: 500, targetY: 500 });
  });

  it('logistics pushes carry tasks when furnace has recipe and storage has ore', () => {
    const storage = makeStorage({ iron_ore: 10 });
    const furnace = makeFurnace('iron');
    const cargo = makeDrone('c1', 'refinery');
    _mockDrones = [cargo];

    // Cargo drone must be in a slot
    const slots: MockBaySlot[] = [occupiedSlot(cargo)];
    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    // Two tasks: pull-from-storage CARRY + deliver-to-furnace CARRY
    expect(cargo.pushTask).toHaveBeenCalledTimes(2);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Stuck-drone scenarios
  // ──────────────────────────────────────────────────────────────────────────

  it('miner returns to depot when no deposits match its orePreference', () => {
    // Only copper_ore available; drone prefers iron_ore.
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockImplementation(
      (_x, _y, orePref) => (orePref === 'copper_ore' ? makeDeposit('copper_ore') as any : null),
    );

    const storage = makeStorage();
    const furnace = makeFurnace('off');
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    // Drone starts far from depot so return trip is triggered.
    miner.x = 0; miner.y = 0;
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.pushTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CARRY', targetX: 500, targetY: 500 }),
    );
    expect(miner.pushTask).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'MINE' }));
    expect(miner.state).toBe('IDLE');
  });

  it('miner returns to depot when all deposits of its ore type are exhausted', () => {
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(null);

    const storage = makeStorage();
    const furnace = makeFurnace('off');
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    miner.x = 200;
    miner.y = 200;
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();

    for (let i = 0; i < 10; i++) dispatcher.update(0.016);

    // First tick pushes exactly one CARRY-to-depot task; subsequent ticks
    // see tasks.length > 0 and skip — so pushTask is called exactly once.
    expect(miner.pushTask).toHaveBeenCalledTimes(1);
    expect(miner.pushTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CARRY', targetX: 500, targetY: 500 }),
    );
    expect(miner.state).toBe('IDLE');
  });

  it('miner skips when deposit claim fails — another drone already holds it', () => {
    const deposit = makeDeposit('iron_ore');
    deposit.claim.mockReturnValue(false);
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('off');
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(deposit.claim).toHaveBeenCalledWith('d1');
    expect(miner.pushTask).not.toHaveBeenCalled();
    expect(miner.state).toBe('IDLE');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Deallocation scenarios
  // ──────────────────────────────────────────────────────────────────────────

  it('unallocated miner (orePreference null) is not dispatched to mine', () => {
    const deposit = makeDeposit('iron_ore');
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('off');
    const miner = makeDrone('d1', 'scout', null); // unallocated
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.pushTask).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'MINE' }));
  });

  it('unallocated miner with an active MINE task is recalled: tasks cleared, claims released, depot return queued', () => {
    const storage = makeStorage();
    const furnace = makeFurnace('off');
    const miner = makeDrone('d1', 'scout', null); // unallocated
    miner._tasks.push({ type: 'MINE', targetX: 100, targetY: 100, executeDurationSec: 3 });
    miner._tasks.push({ type: 'CARRY', targetX: 200, targetY: 200, executeDurationSec: 0.3 });

    const slots: MockBaySlot[] = [occupiedSlot(miner)];
    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.clearTasks).toHaveBeenCalled();
    expect(depositMap.releaseClaimsBy).toHaveBeenCalledWith('d1');
    expect(miner.pushTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CARRY', targetX: 500, targetY: 500 }),
    );
  });

  it('idle unallocated miner away from depot is sent back to depot', () => {
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(null);

    const storage = makeStorage();
    const furnace = makeFurnace('off');
    const miner = makeDrone('d1', 'scout', null); // unallocated
    miner.x = 400;
    miner.y = 400; // far from depot at (500,500)? No — (400-500)^2+(400-500)^2 = 20000 > 400

    const slots: MockBaySlot[] = [occupiedSlot(miner)];
    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    expect(miner.pushTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CARRY', targetX: 500, targetY: 500 }),
    );
  });

  it('MINE onExecute guards against zero-quantity lot — cargo stays null when deposit exhausted mid-flight', () => {
    const deposit = makeDeposit('iron_ore');
    deposit.mine.mockReturnValue({ oreType: 'iron_ore', quantity: 0, attributes: {} });
    vi.mocked(depositMap.getNearestUnclaimedDeposit).mockReturnValue(deposit as any);

    const storage = makeStorage();
    const furnace = makeFurnace('off');
    const miner = makeDrone('d1', 'scout', 'iron_ore');
    const slots: MockBaySlot[] = [occupiedSlot(miner)];

    dispatcher.configure(storage as any, furnace as any, { x: 500, y: 500 }, slots as any);
    dispatcher.start();
    dispatcher.update(0.016);

    const mineTask = miner._tasks[0] as { onExecute?: () => void };
    mineTask.onExecute?.();

    expect(miner.cargo).toBeNull();
  });
});
