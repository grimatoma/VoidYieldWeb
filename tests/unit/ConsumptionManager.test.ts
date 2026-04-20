import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { ConsumptionManager } from '@services/ConsumptionManager';

const makeDepot = (supplyMap: Record<string, number>) => ({
  getStockpile: vi.fn().mockReturnValue(new Map(Object.entries(supplyMap))),
  deposit: vi.fn(),
  pull: vi.fn().mockImplementation((type: string, qty: number) => {
    const avail = supplyMap[type] ?? 0;
    const consumed = Math.min(avail, qty);
    if (consumed > 0) supplyMap[type] = avail - consumed;
    return consumed;
  }),
});

describe('ConsumptionManager', () => {
  let cm: ConsumptionManager;

  beforeEach(() => {
    cm = new ConsumptionManager();
    vi.clearAllMocks();
  });

  it('starts with 4 pioneers and 0 housing', () => {
    expect(cm.getTierPopulation('pioneer')).toBe(4);
    expect(cm.getTotalPopulation()).toBe(4);
    expect(cm.housingCapacity).toBe(0);
  });

  it('backward compat: populationCount returns total', () => {
    expect(cm.populationCount).toBe(4);
  });

  it('addHousing increases capacity', () => {
    cm.addHousing(30);
    expect(cm.housingCapacity).toBe(30);
  });

  it('productivityMultiplier is 1.0 when needs at 100%', () => {
    expect(cm.productivityMultiplier).toBeCloseTo(1.0);
  });

  it('productivityMultiplier is 0.15 when needs at 0%', () => {
    const depot = makeDepot({ compressed_gas: 0, water: 0 });
    cm.update(1200, depot as never);
    expect(cm.productivityMultiplier).toBeCloseTo(0.15);
  });

  it('day tick consumes compressed_gas and water from depot', () => {
    const depot = makeDepot({ compressed_gas: 100, water: 100 });
    cm.update(1200, depot as never);
    expect(depot.pull).toHaveBeenCalledWith('compressed_gas', 8);  // 4 pioneers × 2
    expect(depot.pull).toHaveBeenCalledWith('water', 4);            // 4 pioneers × 1
  });

  it('getCurrentTier returns pioneer initially', () => {
    expect(cm.getCurrentTier()).toBe('pioneer');
  });

  it("getTierPopulation('pioneer') is 4 at start", () => {
    expect(cm.getTierPopulation('pioneer')).toBe(4);
    expect(cm.getTierPopulation('colonist')).toBe(0);
  });

  it('reset() restores initial state', () => {
    cm.addHousing(30);
    cm.reset();
    expect(cm.getTierPopulation('pioneer')).toBe(4);
    expect(cm.getTotalPopulation()).toBe(4);
    expect(cm.housingCapacity).toBe(0);
  });
});
