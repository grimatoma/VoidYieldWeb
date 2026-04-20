import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(), fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(), circle: vi.fn().mockReturnThis(),
    addChild: vi.fn(), x: 0, y: 0, visible: true, style: { fill: '#00B8D4' },
    anchor: { set: vi.fn() },
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(() => ({ ...make(), text: '', anchor: { set: vi.fn() } })),
    TextStyle: vi.fn(),
  };
});

vi.mock('@services/PowerManager', () => {
  const registerConsumer = vi.fn();
  const unregisterConsumer = vi.fn();
  return {
    powerManager: {
      registerConsumer,
      unregisterConsumer,
      throttleMultiplier: 1.0,
    },
  };
});

vi.mock('@services/ConsumptionManager', () => ({
  consumptionManager: { productivityMultiplier: 1 },
}));

import { Fabricator } from '@entities/Fabricator';
import { FABRICATOR_SCHEMATICS } from '@data/schematics';

describe('Fabricator', () => {
  it('starts in IDLE state', () => {
    const fab = new Fabricator(0, 0, FABRICATOR_SCHEMATICS.refined_alloy);
    expect(fab.state).toBe('IDLE');
  });

  it('stays IDLE when no depot linked', () => {
    const fab = new Fabricator(0, 0, FABRICATOR_SCHEMATICS.refined_alloy);
    fab.update(1);
    expect(fab.state).toBe('IDLE');
  });

  it('produces output when both inputs available', () => {
    const fab = new Fabricator(0, 0, FABRICATOR_SCHEMATICS.refined_alloy);
    // refined_alloy: alloy_rods(2) + steel_bars(1) → alloy_rods(2), 6/hr
    const depot = {
      pull: vi.fn((_type, qty: number) => qty), // always returns requested qty
      deposit: vi.fn(),
    } as any;
    fab.link(depot, depot);
    // advance enough time for one batch: 3600/6 = 600 seconds
    fab.update(600);
    expect(fab.state).toBe('RUNNING');
    expect(depot.deposit).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ oreType: 'alloy_rods', quantity: 2 })
    ]));
  });

  it('enters STALLED_A when input A is missing', () => {
    const fab = new Fabricator(0, 0, FABRICATOR_SCHEMATICS.refined_alloy);
    const depot = {
      pull: vi.fn((_type: string, qty: number) => {
        return _type === 'alloy_rods' ? 0 : qty; // no alloy_rods
      }),
      deposit: vi.fn(),
    } as any;
    fab.link(depot, depot);
    fab.update(600);
    expect(fab.state).toBe('STALLED_A');
  });

  it('calls destroy without error', () => {
    const fab = new Fabricator(0, 0, FABRICATOR_SCHEMATICS.drill_head);
    expect(() => fab.destroy()).not.toThrow();
  });
});
