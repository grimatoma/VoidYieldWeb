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

vi.mock('@services/PowerManager', () => ({
  powerManager: {
    registerConsumer: vi.fn(),
    unregisterConsumer: vi.fn(),
    throttleMultiplier: 1.0,
  },
}));

vi.mock('@services/ConsumptionManager', () => ({
  consumptionManager: { productivityMultiplier: 1.0 },
}));

import { ProcessingPlant } from '@entities/ProcessingPlant';
import { SCHEMATICS } from '@data/schematics';

function makeDepot(pullReturn = 1) {
  return {
    getStockpile: vi.fn().mockReturnValue(new Map([['vorax', 10]])),
    deposit: vi.fn(),
    pull: vi.fn().mockReturnValue(pullReturn),
    x: 0, y: 0,
  };
}

describe('ProcessingPlant — manualOnly', () => {
  let plant: ProcessingPlant;
  let inputDepot: ReturnType<typeof makeDepot>;
  let outputDepot: ReturnType<typeof makeDepot>;

  beforeEach(() => {
    vi.clearAllMocks();
    plant = new ProcessingPlant(0, 0, SCHEMATICS.iron_smelter);
    inputDepot = makeDepot(2);
    outputDepot = makeDepot();
    plant.link(inputDepot as never, outputDepot as never);
  });

  it('starts with manualOnly = false (default)', () => {
    expect(plant.manualOnly).toBe(false);
  });

  it('when manualOnly = false, update() auto-pulls from input depot', () => {
    plant.manualOnly = false;
    // batchInterval for iron_smelter = 60/10 = 6 s
    plant.update(6.1);
    expect(inputDepot.pull).toHaveBeenCalledWith('iron_ore', 2);
    expect(outputDepot.deposit).toHaveBeenCalled();
    expect(plant.state).toBe('RUNNING');
  });

  it('when manualOnly = true, update() does NOT pull from input depot', () => {
    plant.manualOnly = true;
    plant.update(6.1);
    expect(inputDepot.pull).not.toHaveBeenCalled();
  });

  it('when manualOnly = true and buffer is empty, state stays STALLED', () => {
    plant.manualOnly = true;
    plant.update(6.1);
    expect(plant.state).toBe('STALLED');
  });

  it('insertBatch() adds to the input buffer and returns accepted qty', () => {
    plant.manualOnly = true;
    const accepted = plant.insertBatch('iron_ore', 2);
    expect(accepted).toBe(2);
    // Trigger a batch — output goes to linked outputDepot directly.
    plant.update(6.1);
    expect(inputDepot.pull).not.toHaveBeenCalled();
    expect(outputDepot.deposit).toHaveBeenCalled();
    expect(plant.outputBuffer).toBe(0);
    expect(plant.state).toBe('RUNNING');
  });

  it('insertBatch() returns 0 when oreType does not match schematic input', () => {
    plant.manualOnly = true;
    const accepted = plant.insertBatch('copper_ore', 4);
    expect(accepted).toBe(0);
  });

  it('insertBatch() caps at 10x batch-worth of buffer space', () => {
    plant.manualOnly = true;
    // iron_smelter.inputQty = 2; inserting 30 should be capped at 20.
    const accepted = plant.insertBatch('iron_ore', 30);
    expect(accepted).toBe(20);
  });

  it('insertBatch() returns 0 when buffer is already full', () => {
    plant.manualOnly = true;
    plant.insertBatch('iron_ore', 20); // fills the 10x buffer
    const second = plant.insertBatch('iron_ore', 1);
    expect(second).toBe(0);
  });

  it('manualOnly plant does NOT require outputDepot', () => {
    const bare = new ProcessingPlant(0, 0, SCHEMATICS.iron_smelter);
    bare.manualOnly = true;
    bare.insertBatch('iron_ore', 2);
    bare.update(6.1);
    expect(bare.state).toBe('RUNNING'); // Now runs fine on internal buffer
  });

  it('batchProgress is 0 when buffer is empty', () => {
    plant.manualOnly = true;
    plant.update(3); // timer advances but no ore
    expect(plant.batchProgress).toBe(0);
  });

  it('batchProgress increases from 0 to 1 as timer elapses when ore is loaded', () => {
    plant.manualOnly = true;
    plant.insertBatch('iron_ore', 2);
    // iron_smelter: batchInterval = 60/60 = 1s
    plant.update(0.5); // halfway
    expect(plant.batchProgress).toBeCloseTo(0.5, 1);
    plant.update(0.6); // just past full
    // After the batch fires, inputBuffer is empty → batchProgress resets to 0
    expect(plant.batchProgress).toBe(0);
  });

  it('hasInput is false when buffer is empty', () => {
    plant.manualOnly = true;
    expect(plant.hasInput).toBe(false);
  });

  it('hasInput is true after insertBatch fills the buffer', () => {
    plant.manualOnly = true;
    plant.insertBatch('iron_ore', 2);
    expect(plant.hasInput).toBe(true);
  });

  it('hasInput returns false again after the batch is consumed', () => {
    plant.manualOnly = true;
    plant.insertBatch('iron_ore', 2);
    plant.update(6.1); // fires the batch
    expect(plant.hasInput).toBe(false);
  });
});
