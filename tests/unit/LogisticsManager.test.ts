import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logisticsManager } from '@services/LogisticsManager';

// Mock StorageDepot
const mockDepot = (avail: number, stockpile?: Map<string, number>) => {
  const defaultStockpile = stockpile ?? new Map();
  return {
    pull: vi.fn((_type: string, qty: number) => Math.min(avail, qty)),
    deposit: vi.fn(),
    getStockpile: vi.fn(() => defaultStockpile),
  };
};

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

  describe('auto-dispatch', () => {
    it('auto-dispatches when threshold met', () => {
      const stockpile = new Map<string, number>([['steel_bars', 100]]);
      const depot = mockDepot(100, stockpile) as any;
      logisticsManager.registerPlanet('planet_a1', depot);
      logisticsManager.registerPlanet('planet_b', depot);
      const r = logisticsManager.addRoute({
        sourcePlanet: 'planet_a1',
        destPlanet: 'planet_b',
        cargoType: 'steel_bars',
        cargoQty: 100,
        cargoClass: 'bulk',
        tripTimeSec: 10,
        autoDispatchThreshold: 0.8,
      });
      expect(r.status).toBe('IDLE');
      logisticsManager.update(0.1); // should auto-dispatch since 100 >= 0.8*100
      expect(r.status).toBe('IN_TRANSIT');
    });

    it('does not auto-dispatch when threshold not met', () => {
      const stockpile = new Map<string, number>([['steel_bars', 50]]);
      const depot = mockDepot(50, stockpile) as any;
      logisticsManager.registerPlanet('planet_a1', depot);
      logisticsManager.registerPlanet('planet_b', depot);
      const r = logisticsManager.addRoute({
        sourcePlanet: 'planet_a1',
        destPlanet: 'planet_b',
        cargoType: 'steel_bars',
        cargoQty: 100,
        cargoClass: 'bulk',
        tripTimeSec: 10,
        autoDispatchThreshold: 0.8, // needs 80 units, only have 50
      });
      expect(r.status).toBe('IDLE');
      logisticsManager.update(0.1);
      expect(r.status).toBe('IDLE'); // should NOT dispatch
    });

    it('auto-dispatch respects cargo class constraints', () => {
      const stockpile = new Map<string, number>([['bio_circuit_boards', 200]]);
      const depot = mockDepot(200, stockpile) as any;
      logisticsManager.registerPlanet('planet_a1', depot);
      logisticsManager.registerPlanet('planet_b', depot);
      const r = logisticsManager.addRoute({
        sourcePlanet: 'planet_a1',
        destPlanet: 'planet_b',
        cargoType: 'bio_circuit_boards',
        cargoQty: 100,
        cargoClass: 'components',
        tripTimeSec: 10,
        shipType: 'bulk_freighter', // cannot carry components
        autoDispatchThreshold: 0.8,
      });
      logisticsManager.update(0.1);
      expect(r.status).toBe('IDLE'); // should NOT dispatch due to ship type constraint
    });
  });
});
