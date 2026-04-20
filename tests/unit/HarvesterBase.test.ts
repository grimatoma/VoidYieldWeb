import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const Graphics = vi.fn(() => ({
    clear: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
  }));
  const Container = vi.fn(() => ({ x: 0, y: 0, addChild: vi.fn() }));
  return { Graphics, Container };
});

import { HarvesterBase } from '@entities/HarvesterBase';
import { MineralHarvester } from '@entities/MineralHarvester';
import { GasCollector } from '@entities/GasCollector';

const BASE_CONFIG = { ber: 5, hopperCapacity: 500, fuelPerHour: 3, oreType: 'vorax' as const, worldX: 0, worldY: 0, depositConcentration: 60 };

describe('HarvesterBase', () => {
  it('starts IDLE', () => {
    const h = new HarvesterBase(BASE_CONFIG);
    expect(h.state).toBe('IDLE');
    expect(h.hopperCurrent).toBe(0);
  });

  it('accumulates ore when running (large delta)', () => {
    const h = new HarvesterBase(BASE_CONFIG);
    h.update(60); // 60 seconds
    // units/sec = 5 * 60/100 / 60 = 0.05/s → 60s = 3 units
    expect(h.hopperCurrent).toBeGreaterThan(0);
    expect(h.state).toBe('RUNNING');
  });

  it('transitions to FUEL_EMPTY when fuel runs out', () => {
    const h = new HarvesterBase({ ...BASE_CONFIG, fuelPerHour: 3600 }); // burns 1 unit/s
    h.fuelCurrent = 0.5;
    h.update(2); // burns remaining fuel, fuel hits 0
    h.update(1); // next tick detects fuelCurrent <= 0 → FUEL_EMPTY
    expect(h.state).toBe('FUEL_EMPTY');
  });

  it('transitions to HOPPER_FULL when hopper fills', () => {
    const h = new HarvesterBase({ ...BASE_CONFIG, hopperCapacity: 1 });
    h.hopperCurrent = 1;
    h.update(1);
    expect(h.state).toBe('HOPPER_FULL');
  });

  it('emptyHopper returns QualityLot and resets hopper', () => {
    const h = new HarvesterBase(BASE_CONFIG);
    h.update(120); // accumulate some ore
    const lot = h.emptyHopper();
    expect(lot.oreType).toBe('vorax');
    expect(lot.quantity).toBeGreaterThan(0);
    expect(h.hopperCurrent).toBe(0);
  });

  it('refuel adds fuel and clears FUEL_EMPTY', () => {
    // fuelPerHour:10 → 2-hour tank cap = 20, so refuel(10) fills exactly 10
    const h = new HarvesterBase({ ...BASE_CONFIG, fuelPerHour: 10 });
    h.fuelCurrent = 0;
    h.state = 'FUEL_EMPTY';
    h.refuel(10);
    expect(h.fuelCurrent).toBe(10);
    expect(h.state).toBe('IDLE');
  });

  it('MineralHarvester has correct BER and hopper cap', () => {
    const h = new MineralHarvester(0, 0, 'krysite', 50);
    expect(h.config.ber).toBe(5);
    expect(h.config.hopperCapacity).toBe(500);
    expect(h.config.fuelPerHour).toBe(3);
    expect(h.config.oreType).toBe('krysite');
  });

  it('GasCollector is self-powered (fuelPerHour=0, fuelCurrent=Infinity)', () => {
    const h = new GasCollector(0, 0, 70);
    expect(h.config.fuelPerHour).toBe(0);
    expect(h.fuelCurrent).toBe(Infinity);
    h.update(3600); // one hour
    expect(h.state).not.toBe('FUEL_EMPTY');
  });
});
