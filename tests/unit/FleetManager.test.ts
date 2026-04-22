import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const make = () => ({
    clear: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(), fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(), rect: vi.fn().mockReturnThis(),
    addChild: vi.fn(), x: 0, y: 0, visible: true,
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(make),
    TextStyle: vi.fn(),
    Application: vi.fn(),
  };
});

vi.mock('@services/GameState', () => ({
  gameState: { credits: 200, addCredits: vi.fn() },
}));

import { FleetManager } from '@services/FleetManager';
import { ScoutDrone } from '@entities/ScoutDrone';

describe('FleetManager', () => {
  let mgr: FleetManager;

  beforeEach(() => {
    mgr = new FleetManager();
    vi.clearAllMocks();
  });

  it('starts empty', () => {
    expect(mgr.getDrones().length).toBe(0);
  });

  it('add registers a drone', () => {
    const drone = new ScoutDrone(0, 0);
    mgr.add(drone);
    expect(mgr.getDrones().length).toBe(1);
  });

  it('remove unregisters by id', () => {
    const drone = new ScoutDrone(0, 0);
    mgr.add(drone);
    mgr.remove(drone.id);
    expect(mgr.getDrones().length).toBe(0);
  });

  it('update calls update on each drone', () => {
    const drone = new ScoutDrone(0, 0);
    const spy = vi.spyOn(drone, 'update');
    mgr.add(drone);
    mgr.update(0.016);
    expect(spy).toHaveBeenCalledWith(0.016);
  });

  it('getActive returns only non-IDLE drones', () => {
    const d1 = new ScoutDrone(0, 0);
    const d2 = new ScoutDrone(0, 0);
    d2.pushTask({ type: 'MINE', targetX: 100, targetY: 0, executeDurationSec: 2 });
    d2.update(0.016); // transitions to MOVING_TO_TARGET
    mgr.add(d1);
    mgr.add(d2);
    expect(mgr.getActive().length).toBe(1);
  });
});
