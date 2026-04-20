import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/HarvesterManager');
vi.mock('@services/FleetManager');

import { ZoneManager } from '@services/ZoneManager';
import { harvesterManager } from '@services/HarvesterManager';
import { fleetManager } from '@services/FleetManager';

const makeDepot = () => ({
  x: 0,
  y: 0,
  deposit: vi.fn(),
  pull: vi.fn(),
  getStockpile: vi.fn(),
});

describe('ZoneManager', () => {
  let zm: ZoneManager;

  beforeEach(() => {
    zm = new ZoneManager();
    vi.mocked(harvesterManager.getAll).mockReturnValue([]);
    vi.mocked(fleetManager.getDrones).mockReturnValue([]);
    vi.clearAllMocks();
  });

  it('does nothing when disabled', () => {
    zm.update(5);
    expect(fleetManager.getDrones).not.toHaveBeenCalled();
  });

  it('does not scan until 3 seconds elapsed', () => {
    zm.enable(0, 0, makeDepot() as never);
    zm.update(2);
    expect(fleetManager.getDrones).not.toHaveBeenCalled();
  });

  it('scans after 3 seconds', () => {
    // Set up a harvester to trigger the scan
    const mockHarvester = {
      state: 'FUEL_EMPTY',
      config: { worldX: 100, worldY: 100 },
      refuel: vi.fn(),
      emptyHopper: vi.fn(),
    };
    vi.mocked(harvesterManager.getAll).mockReturnValue([mockHarvester as never]);
    vi.mocked(fleetManager.getDrones).mockReturnValue([]);
    zm.enable(0, 0, makeDepot() as never);
    zm.update(3.1);
    expect(fleetManager.getDrones).toHaveBeenCalled();
  });

  it('dispatches idle refinery drone to FUEL circuit when harvester FUEL_EMPTY', () => {
    const mockHarvester = {
      state: 'FUEL_EMPTY',
      config: { worldX: 100, worldY: 100 },
      refuel: vi.fn(),
      emptyHopper: vi.fn(),
    };
    vi.mocked(harvesterManager.getAll).mockReturnValue([mockHarvester as never]);

    const mockDrone = {
      id: 'drone-0',
      droneType: 'refinery',
      state: 'IDLE',
      loop: false,
      carryCapacity: 8,
      cargo: null,
      getTasks: vi.fn().mockReturnValue([]),
      pushTask: vi.fn().mockReturnValue(true),
    };
    vi.mocked(fleetManager.getDrones).mockReturnValue([mockDrone as never]);

    zm.enable(300, 900, makeDepot() as never);
    zm.update(3.1);

    expect(mockDrone.pushTask).toHaveBeenCalledTimes(2);
    expect(mockDrone.loop).toBe(true);
  });

  it('reset clears state', () => {
    zm.enable(0, 0, makeDepot() as never);
    zm.reset();
    zm.update(5);
    expect(fleetManager.getDrones).not.toHaveBeenCalled();
  });
});
