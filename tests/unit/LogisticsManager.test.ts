import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logisticsManager } from '@services/LogisticsManager';

// Mock StorageDepot
const mockDepot = (avail: number) => ({
  pull: vi.fn((_type: string, qty: number) => Math.min(avail, qty)),
  deposit: vi.fn(),
  getStockpile: vi.fn(() => new Map()),
});

describe('LogisticsManager', () => {
  beforeEach(() => logisticsManager.reset());

  it('adds a route', () => {
    const r = logisticsManager.addRoute({
      sourcePlanet: 'planet_a1',
      destPlanet: 'planet_b',
      cargoType: 'steel_bars',
      cargoQty: 100,
      cargoClass: 'bulk',
    });
    expect(r.status).toBe('IDLE');
    expect(logisticsManager.getRoutes().length).toBe(1);
  });

  it('dispatch pulls cargo and sets IN_TRANSIT', () => {
    const depot = mockDepot(200) as any;
    logisticsManager.registerPlanet('planet_a1', depot);
    const r = logisticsManager.addRoute({
      sourcePlanet: 'planet_a1', destPlanet: 'planet_b',
      cargoType: 'steel_bars', cargoQty: 100, cargoClass: 'bulk',
    });
    const result = logisticsManager.dispatch(r.routeId);
    expect(result).toBe(true);
    expect(r.status).toBe('IN_TRANSIT');
  });

  it('dispatch fails if no cargo available', () => {
    const depot = mockDepot(0) as any;
    logisticsManager.registerPlanet('planet_a1', depot);
    const r = logisticsManager.addRoute({
      sourcePlanet: 'planet_a1', destPlanet: 'planet_b',
      cargoType: 'steel_bars', cargoQty: 100, cargoClass: 'bulk',
    });
    expect(logisticsManager.dispatch(r.routeId)).toBe(false);
    expect(r.status).toBe('STALLED');
  });

  it('delivers cargo after tripTimeSec', () => {
    const srcDepot = mockDepot(100) as any;
    const dstDepot = mockDepot(0) as any;
    logisticsManager.registerPlanet('planet_a1', srcDepot);
    logisticsManager.registerPlanet('planet_b', dstDepot);
    const r = logisticsManager.addRoute({
      sourcePlanet: 'planet_a1', destPlanet: 'planet_b',
      cargoType: 'steel_bars', cargoQty: 100, cargoClass: 'bulk',
      tripTimeSec: 10,
    });
    logisticsManager.dispatch(r.routeId);
    logisticsManager.update(10);
    expect(r.status).toBe('IDLE');
    expect(r.tripsCompleted).toBe(1);
    expect(dstDepot.deposit).toHaveBeenCalled();
  });

  it('removes a route', () => {
    const r = logisticsManager.addRoute({
      sourcePlanet: 'planet_a1', destPlanet: 'planet_b',
      cargoType: 'steel_bars', cargoQty: 50, cargoClass: 'bulk',
    });
    logisticsManager.removeRoute(r.routeId);
    expect(logisticsManager.getRoutes().length).toBe(0);
  });
});
