import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn() },
}));

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn() },
}));

// DroneAllocationManager.reconcile() uses dynamic import('./FleetManager')
// — no need to mock for the sync tests below.

import { droneAllocationManager } from '@services/DroneAllocationManager';

describe('DroneAllocationManager', () => {
  beforeEach(() => {
    droneAllocationManager.reset();
  });

  // ─── allocateMiner ────────────────────────────────────────────────────────

  it('allocates a miner to an ore type', () => {
    expect(droneAllocationManager.allocateMiner('iron_ore', 1, 3)).toBe(true);
    expect(droneAllocationManager.getMinerAlloc().get('iron_ore')).toBe(1);
  });

  it('allocateMiner returns false when exceeding totalMiners', () => {
    droneAllocationManager.allocateMiner('iron_ore', 1, 1);
    expect(droneAllocationManager.allocateMiner('copper_ore', 1, 1)).toBe(false);
    expect(droneAllocationManager.totalAllocatedMiners()).toBe(1);
  });

  it('allocateMiner returns false when result would go below 0', () => {
    expect(droneAllocationManager.allocateMiner('iron_ore', -1, 3)).toBe(false);
  });

  it('removing last allocation for an ore deletes the key', () => {
    droneAllocationManager.allocateMiner('iron_ore', 1, 3);
    droneAllocationManager.allocateMiner('iron_ore', -1, 3);
    expect(droneAllocationManager.getMinerAlloc().has('iron_ore')).toBe(false);
  });

  it('totalAllocatedMiners sums across ore types', () => {
    droneAllocationManager.allocateMiner('iron_ore', 2, 5);
    droneAllocationManager.allocateMiner('copper_ore', 1, 5);
    expect(droneAllocationManager.totalAllocatedMiners()).toBe(3);
  });

  // ─── allocateLogistics ────────────────────────────────────────────────────

  it('allocates logistics drones', () => {
    expect(droneAllocationManager.allocateLogistics(2, 3)).toBe(true);
    expect(droneAllocationManager.getLogisticsAlloc()).toBe(2);
  });

  it('allocateLogistics returns false when exceeding totalLogistics', () => {
    expect(droneAllocationManager.allocateLogistics(4, 3)).toBe(false);
    expect(droneAllocationManager.getLogisticsAlloc()).toBe(0);
  });

  it('allocateLogistics returns false when result goes below 0', () => {
    expect(droneAllocationManager.allocateLogistics(-1, 2)).toBe(false);
  });

  // ─── serialize / deserialize ──────────────────────────────────────────────

  it('serialize produces correct shape', () => {
    droneAllocationManager.allocateMiner('iron_ore', 2, 5);
    droneAllocationManager.allocateMiner('copper_ore', 1, 5);
    droneAllocationManager.allocateLogistics(1, 2);

    const data = droneAllocationManager.serialize();
    expect(data).toEqual({
      miners: { iron_ore: 2, copper_ore: 1 },
      logistics: 1,
    });
  });

  it('deserialize restores allocation state', () => {
    droneAllocationManager.deserialize({
      miners: { iron_ore: 3, copper_ore: 2 },
      logistics: 1,
    });

    expect(droneAllocationManager.getMinerAlloc().get('iron_ore')).toBe(3);
    expect(droneAllocationManager.getMinerAlloc().get('copper_ore')).toBe(2);
    expect(droneAllocationManager.getLogisticsAlloc()).toBe(1);
    expect(droneAllocationManager.totalAllocatedMiners()).toBe(5);
  });

  it('deserialize ignores zero-count entries', () => {
    droneAllocationManager.deserialize({ miners: { iron_ore: 0 }, logistics: 0 });
    expect(droneAllocationManager.getMinerAlloc().has('iron_ore')).toBe(false);
  });

  it('deserialize with missing fields defaults to 0', () => {
    droneAllocationManager.deserialize({});
    expect(droneAllocationManager.totalAllocatedMiners()).toBe(0);
    expect(droneAllocationManager.getLogisticsAlloc()).toBe(0);
  });

  // ─── reset ────────────────────────────────────────────────────────────────

  it('reset clears all state', () => {
    droneAllocationManager.allocateMiner('iron_ore', 2, 5);
    droneAllocationManager.allocateLogistics(1, 2);
    droneAllocationManager.reset();

    expect(droneAllocationManager.totalAllocatedMiners()).toBe(0);
    expect(droneAllocationManager.getLogisticsAlloc()).toBe(0);
    expect(droneAllocationManager.getMinerAlloc().size).toBe(0);
  });
});
