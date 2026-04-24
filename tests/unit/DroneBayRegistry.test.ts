import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@services/GameState', () => ({
  gameState: { credits: 0, addCredits: vi.fn() },
}));

vi.mock('@services/DepositMap', () => ({
  depositMap: { releaseClaimsBy: vi.fn() },
}));

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn() },
}));

import { DroneBayRegistry } from '@services/DroneBayRegistry';
import { gameState } from '@services/GameState';
import type { IDroneBay, BaySlot } from '@services/DroneBayRegistry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDrone(id: string, droneType = 'scout') {
  return {
    id,
    droneType,
    orePreference: null as string | null,
    disabled: false,
    cargo: null as unknown,
    clearTasks: vi.fn(),
    container: { parent: null as unknown },
    getTasks: () => [],
    state: 'IDLE',
    pushTask: vi.fn(),
  };
}

function makeBay(id: string, slotCount = 3, initialDrones: (ReturnType<typeof makeDrone> | null)[] = []): IDroneBay & { _slots: BaySlot[]; releaseSlot: ReturnType<typeof vi.fn> } {
  const slots: BaySlot[] = Array.from({ length: slotCount }, (_, i) => ({
    drone: initialDrones[i] ?? null,
    droneType: initialDrones[i] ? (initialDrones[i]!.droneType as any) : null,
  }));
  const releaseSlot = vi.fn((idx: number) => {
    slots[idx] = { drone: null, droneType: null };
  });
  return {
    id,
    label: `Bay ${id}`,
    slotCount,
    get slots() { return slots; },
    _slots: slots,
    upgradeCost: () => 100 * (slotCount + 1) ** 2,
    upgradeSlot: vi.fn(() => false),
    purchaseIntoSlot: vi.fn(() => null),
    releaseSlot,
    position: { x: 0, y: 0 },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DroneBayRegistry', () => {
  let registry: DroneBayRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    (gameState as any).credits = 0;
    registry = new DroneBayRegistry();
  });

  it('starts empty', () => {
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.totalSlots()).toBe(0);
    expect(registry.totalEmptySlots()).toBe(0);
  });

  it('register adds a bay', () => {
    const bay = makeBay('b1', 3);
    registry.register(bay);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.totalSlots()).toBe(3);
    expect(registry.totalEmptySlots()).toBe(3);
  });

  it('register is idempotent — same id not added twice', () => {
    const bay = makeBay('b1', 3);
    registry.register(bay);
    registry.register(bay);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('unregister removes a bay by id', () => {
    const bay = makeBay('b1', 3);
    registry.register(bay);
    registry.unregister('b1');
    expect(registry.getAll()).toHaveLength(0);
  });

  it('totalUsedSlots counts non-null drone slots', () => {
    const drone = makeDrone('d1');
    const bay = makeBay('b1', 3, [drone]);
    registry.register(bay);
    expect(registry.totalUsedSlots()).toBe(1);
    expect(registry.totalEmptySlots()).toBe(2);
  });

  it('findEmptySlot returns first bay with a free slot', () => {
    const drone = makeDrone('d1');
    const bay = makeBay('b1', 2, [drone]); // slot 0 occupied, slot 1 free
    registry.register(bay);

    const result = registry.findEmptySlot();
    expect(result).not.toBeNull();
    expect(result!.bay.id).toBe('b1');
    expect(result!.slotIndex).toBe(1);
  });

  it('findEmptySlot returns null when all slots are full', () => {
    const drone1 = makeDrone('d1');
    const drone2 = makeDrone('d2');
    const bay = makeBay('b1', 2, [drone1, drone2]);
    registry.register(bay);

    expect(registry.findEmptySlot()).toBeNull();
  });

  it('destroyDrone refunds full cost and calls releaseSlot', () => {
    const drone = makeDrone('d1', 'scout');
    const bay = makeBay('b1', 2, [drone]);
    registry.register(bay);

    registry.destroyDrone('d1');

    // gameState.addCredits called with scout cost (25)
    expect(gameState.addCredits).toHaveBeenCalledWith(25);
    // releaseSlot called for slot 0
    expect(bay.releaseSlot).toHaveBeenCalledWith(0);
    // drone tasks cleared and cargo nulled
    expect(drone.clearTasks).toHaveBeenCalled();
    expect(drone.cargo).toBeNull();
  });

  it('destroyDrone with heavy drone refunds 150', () => {
    const drone = makeDrone('d1', 'heavy');
    const bay = makeBay('b1', 1, [drone]);
    registry.register(bay);

    registry.destroyDrone('d1');
    expect(gameState.addCredits).toHaveBeenCalledWith(150);
  });

  it('destroyDrone does nothing for unknown droneId', () => {
    const bay = makeBay('b1', 2);
    registry.register(bay);
    registry.destroyDrone('nonexistent');
    expect(gameState.addCredits).not.toHaveBeenCalled();
  });

  it('totalSlots aggregates across multiple bays', () => {
    registry.register(makeBay('b1', 3));
    registry.register(makeBay('b2', 4));
    expect(registry.totalSlots()).toBe(7);
    expect(registry.totalEmptySlots()).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Export test — ensure DroneBayRegistry class is exported for instantiation
// ---------------------------------------------------------------------------

it('DroneBayRegistry can be instantiated directly (for tests)', () => {
  const r = new DroneBayRegistry();
  expect(r.getAll()).toHaveLength(0);
});
