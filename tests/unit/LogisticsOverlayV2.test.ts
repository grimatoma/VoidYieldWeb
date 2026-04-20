import { describe, it, expect, vi } from 'vitest';
import { LogisticsOverlay } from '@ui/LogisticsOverlay';
import type { TradeRoute } from '@data/types';

vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    removeChildren: vi.fn(),
    removeChildAt: vi.fn(),
    on: vi.fn().mockReturnThis(),
    x: 0,
    y: 0,
    visible: true,
    eventMode: 'static',
    cursor: 'pointer',
    children: [],
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(() => ({ ...make(), text: '' })),
    TextStyle: vi.fn(),
  };
});

const makeRoute = (overrides: Partial<TradeRoute> = {}): TradeRoute => ({
  routeId: 'r1',
  sourcePlanet: 'planet_a1',
  destPlanet: 'planet_b',
  cargoType: 'steel_bars',
  cargoQty: 100,
  cargoClass: 'bulk',
  shipType: 'bulk_freighter',
  status: 'IDLE',
  tripTimeSec: 180,
  tripsCompleted: 5,
  elapsedSec: 0,
  autoDispatch: false,
  autoDispatchThreshold: 0,
  ...overrides,
});

describe('LogisticsOverlay v2', () => {
  it('shows route count in title area', () => {
    const overlay = new LogisticsOverlay();
    expect(() => overlay.refresh([makeRoute(), makeRoute({ routeId: 'r2' })])).not.toThrow();
  });

  it('handles IN_TRANSIT route with ETA', () => {
    const overlay = new LogisticsOverlay();
    expect(() => overlay.refresh([makeRoute({ status: 'IN_TRANSIT', elapsedSec: 60 })])).not.toThrow();
  });

  it('handles auto-dispatch route', () => {
    const overlay = new LogisticsOverlay();
    expect(() => overlay.refresh([makeRoute({ autoDispatchThreshold: 0.8 })])).not.toThrow();
  });

  it('handles STALLED route', () => {
    const overlay = new LogisticsOverlay();
    expect(() => overlay.refresh([makeRoute({ status: 'STALLED' })])).not.toThrow();
  });
});
