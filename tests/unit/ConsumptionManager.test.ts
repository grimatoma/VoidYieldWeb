import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { ConsumptionManager } from '@services/ConsumptionManager';

const makeDepot = (gasStock = 0, waterStock = 0) => ({
  getStockpile: vi.fn().mockReturnValue(new Map([['compressed_gas', gasStock], ['water', waterStock]])),
  deposit: vi.fn(),
  pull: vi.fn().mockImplementation((_type: string, qty: number) => qty),
});

describe('ConsumptionManager', () => {
  let cm: ConsumptionManager;

  beforeEach(() => {
    cm = new ConsumptionManager();
    vi.clearAllMocks();
  });

  it('starts with 4 pioneers and 0 housing', () => {
    expect(cm.pioneers).toBe(4);
    expect(cm.housingCapacity).toBe(0);
  });

  it('addHousing increases capacity', () => {
    cm.addHousing(30);
    expect(cm.housingCapacity).toBe(30);
  });

  it('productivityMultiplier is 1.0 when needs at 100%', () => {
    expect(cm.productivityMultiplier).toBeCloseTo(1.0);
  });

  it('productivityMultiplier is 0.15 when needs at 0%', () => {
    // Force 0% supply by triggering a day tick with empty depot
    const depot = makeDepot(0, 0);
    depot.pull.mockReturnValue(0);
    cm.update(1200, depot as never);
    expect(cm.productivityMultiplier).toBeCloseTo(0.15);
  });

  it('day tick consumes compressed_gas and water from depot', () => {
    const depot = makeDepot(100, 100);
    cm.update(1200, depot as never);
    expect(depot.pull).toHaveBeenCalledWith('compressed_gas', 8);  // 4 pioneers × 2
    expect(depot.pull).toHaveBeenCalledWith('water', 4);            // 4 pioneers × 1
  });

  it('population grows when needs met and housing available', () => {
    cm.addHousing(30);
    const depot = makeDepot(100, 100);
    // Run 90s with full supply
    for (let i = 0; i < 90; i++) cm.update(1, depot as never);
    expect(cm.pioneers).toBe(5);
  });

  it('population does not grow without housing', () => {
    const depot = makeDepot(100, 100);
    for (let i = 0; i < 200; i++) cm.update(1, depot as never);
    expect(cm.pioneers).toBe(4);
  });
});
