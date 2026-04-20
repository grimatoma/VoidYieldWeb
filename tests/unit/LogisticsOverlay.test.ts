import { describe, it, expect, vi } from 'vitest';
import { LogisticsOverlay } from '@ui/LogisticsOverlay';

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

describe('LogisticsOverlay', () => {
  it('starts invisible', () => {
    const overlay = new LogisticsOverlay();
    expect(overlay.visible).toBe(false);
  });

  it('toggle shows and hides', () => {
    const overlay = new LogisticsOverlay();
    overlay.toggle();
    expect(overlay.visible).toBe(true);
    overlay.toggle();
    expect(overlay.visible).toBe(false);
  });

  it('refresh with empty routes does not throw', () => {
    const overlay = new LogisticsOverlay();
    expect(() => overlay.refresh([])).not.toThrow();
  });

  it('refresh with routes does not throw', () => {
    const overlay = new LogisticsOverlay();
    const fakeRoutes = [
      {
        routeId: 'r1',
        sourcePlanet: 'planet_a1',
        destPlanet: 'planet_b',
        cargoType: 'steel_bars' as const,
        cargoQty: 100,
        cargoClass: 'bulk' as const,
        status: 'IDLE' as const,
        tripTimeSec: 180,
        tripsCompleted: 0,
        elapsedSec: 0,
        autoDispatch: false,
      },
    ];
    expect(() => overlay.refresh(fakeRoutes)).not.toThrow();
  });

  it('setVisible(true) makes it visible', () => {
    const overlay = new LogisticsOverlay();
    overlay.setVisible(true);
    expect(overlay.visible).toBe(true);
  });

  it('setVisible(false) hides it', () => {
    const overlay = new LogisticsOverlay();
    overlay.setVisible(true);
    overlay.setVisible(false);
    expect(overlay.visible).toBe(false);
  });

  it('onDispatch callback is called when dispatch button clicked', () => {
    const overlay = new LogisticsOverlay();
    const mockDispatch = vi.fn();
    overlay.onDispatch(mockDispatch);

    const fakeRoute = {
      routeId: 'r1',
      sourcePlanet: 'planet_a1',
      destPlanet: 'planet_b',
      cargoType: 'steel_bars' as const,
      cargoQty: 100,
      cargoClass: 'bulk' as const,
      status: 'IDLE' as const,
      tripTimeSec: 180,
      tripsCompleted: 0,
      elapsedSec: 0,
      autoDispatch: false,
    };

    overlay.refresh([fakeRoute]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
