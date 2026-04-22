import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@services/DepositMap', () => ({
  depositMap: {
    getNearestDeposit: vi.fn().mockReturnValue(null),
  },
}));
vi.mock('@services/MiningService', () => ({
  miningService: {
    onInteract: vi.fn(),
    onInteractReleased: vi.fn(),
    startAutoMine: vi.fn(),
    cancelAutoMine: vi.fn(),
  },
}));

import { handleWorldTap } from '@services/TapToMove';
import { depositMap } from '@services/DepositMap';
import { miningService } from '@services/MiningService';
import type { Player } from '@entities/Player';

function makePlayer(x = 0, y = 0) {
  const onArrives: Array<(() => void) | undefined> = [];
  const player = {
    x,
    y,
    setMoveTarget: vi.fn((tx: number, ty: number, cb?: () => void) => {
      onArrives.push(cb);
      player.x = tx; // so mining callback sees "arrived" coords
      player.y = ty;
    }),
  } as unknown as Player & { _onArrives: typeof onArrives };
  (player as unknown as { _onArrives: typeof onArrives })._onArrives = onArrives;
  return player;
}

describe('handleWorldTap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(null);
  });

  it('walks to plain ground when no deposit is nearby', () => {
    const player = makePlayer(10, 20);
    handleWorldTap(player, 300, 400);
    expect(player.setMoveTarget).toHaveBeenCalledWith(300, 400);
    expect(miningService.onInteract).not.toHaveBeenCalled();
  });

  it('always cancels any in-progress mining before routing the new tap', () => {
    const player = makePlayer(10, 20);
    handleWorldTap(player, 300, 400);
    expect(miningService.onInteractReleased).toHaveBeenCalled();
    expect(miningService.cancelAutoMine).toHaveBeenCalled();
  });

  it('routes to the deposit and auto-mines on arrival when tap hits ore', () => {
    const deposit = {
      data: { x: 500, y: 600, isExhausted: false },
    };
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(deposit as never);
    const player = makePlayer(10, 20);
    handleWorldTap(player, 495, 605); // tap slightly off-center still picks the ore
    expect(player.setMoveTarget).toHaveBeenCalledWith(500, 600, expect.any(Function));
    // Simulate arrival by invoking the captured onArrive.
    const cb = (player as unknown as { _onArrives: Array<(() => void) | undefined> })._onArrives[0];
    expect(cb).toBeTypeOf('function');
    cb!();
    expect(miningService.startAutoMine).toHaveBeenCalledWith(500, 600);
  });

  it('ignores exhausted deposits and falls back to walking to the tap point', () => {
    const deposit = {
      data: { x: 500, y: 600, isExhausted: true },
    };
    vi.mocked(depositMap.getNearestDeposit).mockReturnValue(deposit as never);
    const player = makePlayer(10, 20);
    handleWorldTap(player, 500, 600);
    // Should call setMoveTarget without a callback (plain walk).
    expect(player.setMoveTarget).toHaveBeenCalledWith(500, 600);
    const args = vi.mocked(player.setMoveTarget).mock.calls[0];
    expect(args.length).toBe(2);
  });
});
