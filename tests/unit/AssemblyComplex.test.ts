import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    x: 0,
    y: 0,
    visible: true,
    style: { fill: '#9C27B0' },
    anchor: { set: vi.fn() },
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(() => ({ ...make(), text: '', anchor: { set: vi.fn() } })),
    TextStyle: vi.fn(),
  };
});

vi.mock('@services/PowerManager', () => ({
  powerManager: {
    registerConsumer: vi.fn(),
    unregisterConsumer: vi.fn(),
    throttleMultiplier: 1,
  },
}));

vi.mock('@services/ConsumptionManager', () => ({
  consumptionManager: { productivityMultiplier: 1 },
}));

import { AssemblyComplex } from '@entities/AssemblyComplex';
import { ASSEMBLY_SCHEMATICS } from '@data/schematics';
import { powerManager } from '@services/PowerManager';

describe('AssemblyComplex', () => {
  it('starts IDLE', () => {
    const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
    expect(ac.state).toBe('IDLE');
  });

  it('stays IDLE when no depot linked', () => {
    const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
    ac.update(1);
    expect(ac.state).toBe('IDLE');
  });

  it('produces output when all 3 inputs available', () => {
    const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
    // rocket_engine: steel_bars(2) + alloy_rods(2) + compressed_gas(3) → rocket_fuel(5), 2/hr
    const depot = {
      pull: vi.fn((_type: string, qty: number) => qty), // always returns requested qty
      deposit: vi.fn(),
    } as any;
    ac.link(depot, depot);
    // advance enough time for one batch: 3600/2 = 1800 seconds
    ac.update(1800);
    expect(ac.state).toBe('RUNNING');
    expect(depot.deposit).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ oreType: 'rocket_fuel', quantity: 5 })])
    );
  });

  it('enters STALLED_A when input A is missing', () => {
    const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
    const depot = {
      pull: vi.fn((_type: string, qty: number) => {
        return _type === 'steel_bars' ? 0 : qty; // no steel_bars
      }),
      deposit: vi.fn(),
    } as any;
    ac.link(depot, depot);
    ac.update(1800);
    expect(ac.state).toBe('STALLED_A');
  });

  it('enters STALLED_B when input B is missing', () => {
    const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
    const depot = {
      pull: vi.fn((_type: string, qty: number) => {
        return _type === 'alloy_rods' ? 0 : qty; // no alloy_rods
      }),
      deposit: vi.fn(),
    } as any;
    ac.link(depot, depot);
    ac.update(1800);
    expect(ac.state).toBe('STALLED_B');
  });

  it('enters STALLED_C when input C is missing', () => {
    const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
    const depot = {
      pull: vi.fn((_type: string, qty: number) => {
        return _type === 'compressed_gas' ? 0 : qty; // no compressed_gas
      }),
      deposit: vi.fn(),
    } as any;
    ac.link(depot, depot);
    ac.update(1800);
    expect(ac.state).toBe('STALLED_C');
  });

  it('enters NO_POWER when throttle is 0', () => {
    // Temporarily set throttleMultiplier to 0
    const originalValue = powerManager.throttleMultiplier;
    (powerManager as any).throttleMultiplier = 0;
    try {
      const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
      const depot = { pull: vi.fn(), deposit: vi.fn() } as any;
      ac.link(depot, depot);
      ac.update(1800);
      expect(ac.state).toBe('NO_POWER');
    } finally {
      (powerManager as any).throttleMultiplier = originalValue;
    }
  });

  it('destroy unregisters power', () => {
    const ac = new AssemblyComplex(0, 0, ASSEMBLY_SCHEMATICS.rocket_engine);
    expect(() => ac.destroy()).not.toThrow();
  });
});
