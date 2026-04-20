import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const Graphics = vi.fn(() => ({ clear: vi.fn().mockReturnThis(), rect: vi.fn().mockReturnThis(), fill: vi.fn().mockReturnThis(), stroke: vi.fn().mockReturnThis() }));
  const Container = vi.fn(() => ({ x: 0, y: 0, addChild: vi.fn() }));
  return { Graphics, Container };
});
vi.mock('@services/EventBus', () => ({ EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));
vi.mock('@services/Inventory', () => ({
  inventory: { add: vi.fn(), drain: vi.fn().mockReturnValue([]), getByType: vi.fn().mockReturnValue(0) },
}));

import { HarvesterManager } from '@services/HarvesterManager';
import { MineralHarvester } from '@entities/MineralHarvester';

describe('HarvesterManager', () => {
  let mgr: HarvesterManager;
  const worldContainer = { addChild: vi.fn(), removeChild: vi.fn() } as never;

  beforeEach(() => {
    mgr = new HarvesterManager();
    vi.clearAllMocks();
  });

  it('adds and updates harvesters', () => {
    const h = new MineralHarvester(0, 0, 'vorax', 60);
    mgr.add(h, worldContainer);
    const spyUpdate = vi.spyOn(h, 'update');
    mgr.update(1);
    expect(spyUpdate).toHaveBeenCalledWith(1);
  });

  it('returns null when no harvester nearby', () => {
    expect(mgr.onInteract(9999, 9999)).toBeNull();
  });

  it('empties hopper when harvester is nearby with ore', () => {
    const h = new MineralHarvester(100, 100, 'vorax', 60);
    h.hopperCurrent = 50;
    h.state = 'HOPPER_FULL';
    mgr.add(h, worldContainer);
    const result = mgr.onInteract(100, 100);
    expect(result).toContain('50');
    expect(h.hopperCurrent).toBe(0);
  });

  it('clear removes all harvesters', () => {
    const h = new MineralHarvester(0, 0, 'vorax', 50);
    mgr.add(h, worldContainer);
    mgr.clear(worldContainer);
    expect(mgr.getAll().length).toBe(0);
  });
});
