import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/EventBus', () => ({ EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));
vi.mock('@services/DepositMap', () => ({
  depositMap: {
    getNearestDeposit: vi.fn().mockReturnValue(null),
  },
}));
vi.mock('@services/GameState', () => ({
  gameState: { addCredits: vi.fn(), credits: 200 },
}));
vi.mock('@services/Inventory', () => ({
  inventory: {
    isFull: false,
    add: vi.fn().mockReturnValue(1),
    drain: vi.fn().mockReturnValue([{ oreType: 'vorax', quantity: 3, attributes: {} }]),
  },
}));

import { MiningService } from '@services/MiningService';
import { depositMap } from '@services/DepositMap';
import { gameState } from '@services/GameState';

function makeDeposit() {
  return {
    data: { isExhausted: false, oreType: 'vorax' as const, x: 100, y: 100, depositId: 'd1', concentrationPeak: 70, yieldRemaining: 100, sizeClass: 'large' as const },
    mine: vi.fn().mockReturnValue({ oreType: 'vorax', quantity: 1, attributes: {} }),
    container: {},
    serialize: vi.fn(),
    holdProgress: 0,
  };
}

describe('MiningService', () => {
  let svc: MiningService;

  beforeEach(() => {
    svc = new MiningService();
    vi.clearAllMocks();
  });

  it('returns null when nothing nearby', () => {
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(null);
    expect(svc.onInteract(100, 100)).toBeNull();
  });

  it('starts hold-mining when E is pressed near a deposit', () => {
    const mockDeposit = makeDeposit();
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(mockDeposit as never);
    svc.onInteract(100, 100); // begin hold
    // Tick forward through one full hold cycle (1.5s).
    svc.update(1.6, { x: 100, y: 100 });
    expect(mockDeposit.mine).toHaveBeenCalledWith(1);
  });

  it('sells inventory when interacting with depot', () => {
    const mockDepot = {
      isNearby: vi.fn().mockReturnValue(true),
      deposit: vi.fn(),
      sellAll: vi.fn().mockReturnValue(15),
      x: 0, y: 0, container: {},
    };
    svc.setDepot(mockDepot as never);
    const result = svc.onInteract(0, 0);
    expect(mockDepot.deposit).toHaveBeenCalled();
    expect(gameState.addCredits).toHaveBeenCalledWith(15);
    expect(result).toContain('15 CR');
  });

  it('stops hold-mining when E is released', () => {
    const mockDeposit = makeDeposit();
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(mockDeposit as never);
    svc.onInteract(100, 100); // begin hold
    svc.update(0.5, { x: 100, y: 100 }); // partial progress
    svc.onInteractReleased();
    svc.update(2.0, { x: 100, y: 100 }); // after release — should not mine
    expect(mockDeposit.mine).not.toHaveBeenCalled();
  });
});
