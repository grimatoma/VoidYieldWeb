import { describe, it, expect, beforeEach, vi } from 'vitest';

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

import { ProcessingPlant } from '@entities/ProcessingPlant';
import { SCHEMATICS } from '@data/schematics';
import { powerManager } from '@services/PowerManager';

const mockDepot = () => ({
  getStockpile: vi.fn().mockReturnValue(new Map([['vorax', 10]])),
  deposit: vi.fn(),
  pull: vi.fn().mockReturnValue(1),
  x: 0, y: 0,
});

describe('ProcessingPlant', () => {
  let plant: ProcessingPlant;

  beforeEach(() => {
    vi.clearAllMocks();
    plant = new ProcessingPlant(0, 0, SCHEMATICS.ore_smelter);
  });

  it('starts STALLED', () => {
    expect(plant.state).toBe('STALLED');
  });

  it('registers power draw with PowerManager on construction', () => {
    expect(vi.mocked(powerManager.registerConsumer)).toHaveBeenCalledWith(3);
  });

  it('remains STALLED when no depots linked', () => {
    plant.update(10);
    expect(plant.state).toBe('STALLED');
  });

  it('runs a batch when timer expires and input available', () => {
    const input = mockDepot();
    const output = mockDepot();
    plant.link(input as never, output as never);
    // batchInterval for ore_smelter = 60/12 = 5 seconds
    plant.update(5.1);
    expect(input.pull).toHaveBeenCalledWith('vorax', 1);
    expect(output.deposit).toHaveBeenCalled();
    expect(plant.state).toBe('RUNNING');
  });

  it('sets STALLED when input depot empty', () => {
    const input = mockDepot();
    input.pull.mockReturnValue(0);
    const output = mockDepot();
    plant.link(input as never, output as never);
    plant.update(5.1);
    expect(plant.state).toBe('STALLED');
  });

  it('destroy() unregisters power draw', () => {
    plant.destroy();
    expect(vi.mocked(powerManager.unregisterConsumer)).toHaveBeenCalledWith(3);
  });
});
