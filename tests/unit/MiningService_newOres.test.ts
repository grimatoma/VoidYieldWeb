import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/EventBus', () => ({ EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));
vi.mock('@services/DepositMap', () => ({
  depositMap: {
    getNearestDeposit: vi.fn().mockReturnValue(null),
  },
}));
vi.mock('@services/Inventory', () => ({
  inventory: {
    isFull: false,
    add: vi.fn().mockReturnValue(1),
    drain: vi.fn().mockReturnValue([]),
  },
}));

import { MiningService } from '@services/MiningService';
import { depositMap } from '@services/DepositMap';
import { inventory } from '@services/Inventory';
import { EventBus } from '@services/EventBus';

function makeIronDeposit() {
  return {
    data: { isExhausted: false, oreType: 'iron_ore' as const, x: 100, y: 100, depositId: 'iron_1', concentrationPeak: 80, yieldRemaining: 120, sizeClass: 'medium' as const },
    mine: vi.fn().mockReturnValue({ oreType: 'iron_ore', quantity: 1, attributes: {} }),
    container: {},
    serialize: vi.fn(),
    holdProgress: 0,
  };
}

function makeCopperDeposit() {
  return {
    data: { isExhausted: false, oreType: 'copper_ore' as const, x: 200, y: 200, depositId: 'copper_1', concentrationPeak: 75, yieldRemaining: 90, sizeClass: 'medium' as const },
    mine: vi.fn().mockReturnValue({ oreType: 'copper_ore', quantity: 1, attributes: {} }),
    container: {},
    serialize: vi.fn(),
    holdProgress: 0,
  };
}

describe('MiningService — new ore types', () => {
  let svc: MiningService;

  beforeEach(() => {
    svc = new MiningService();
    vi.clearAllMocks();
  });

  it('hold-E near iron_ore deposit adds iron_ore lot to inventory (not credits)', () => {
    const mockDeposit = makeIronDeposit();
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(mockDeposit as never);

    svc.onInteract(100, 100); // begin hold
    svc.update(1.6, { x: 100, y: 100 }); // advance past HOLD_PER_UNIT (1.5s)

    expect(mockDeposit.mine).toHaveBeenCalledWith(1);
    expect(inventory.add).toHaveBeenCalledWith(expect.objectContaining({ oreType: 'iron_ore' }));
    // No credits-related event should be emitted
    expect(EventBus.emit).not.toHaveBeenCalledWith('ore:sold', expect.anything());
  });

  it('hold-E near copper_ore deposit adds copper_ore lot to inventory', () => {
    const mockDeposit = makeCopperDeposit();
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(mockDeposit as never);

    svc.onInteract(200, 200);
    svc.update(1.6, { x: 200, y: 200 });

    expect(mockDeposit.mine).toHaveBeenCalledWith(1);
    expect(inventory.add).toHaveBeenCalledWith(expect.objectContaining({ oreType: 'copper_ore' }));
  });

  it('interacting with depot deposits to storage without selling', () => {
    const drainResult = [{ oreType: 'iron_ore' as const, quantity: 3, attributes: {} }];
    vi.mocked(inventory.drain).mockReturnValue(drainResult);

    const mockDepot = {
      isNearby: vi.fn().mockReturnValue(true),
      deposit: vi.fn(),
      x: 0,
      y: 0,
      container: {},
    };
    svc.setDepot(mockDepot as never);

    const result = svc.onInteract(0, 0);

    expect(mockDepot.deposit).toHaveBeenCalledWith(drainResult);
    expect(result).toBe('Deposited');
    // No sellAll, no addCredits, no ore:sold event
    expect(EventBus.emit).not.toHaveBeenCalledWith('ore:sold', expect.anything());
    // No sellAll on the depot
    expect((mockDepot as unknown as { sellAll?: unknown }).sellAll).toBeUndefined();
  });

  it('interacting with depot when inventory is empty returns Nothing to deposit', () => {
    vi.mocked(inventory.drain).mockReturnValue([]);

    const mockDepot = {
      isNearby: vi.fn().mockReturnValue(true),
      deposit: vi.fn(),
      x: 0,
      y: 0,
      container: {},
    };
    svc.setDepot(mockDepot as never);

    const result = svc.onInteract(0, 0);

    expect(result).toBe('Nothing to deposit');
  });
});
