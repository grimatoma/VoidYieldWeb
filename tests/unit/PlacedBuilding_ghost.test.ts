import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock('pixi.js', () => {
  const makeGfx = () => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
  });
  const makeContainer = () => {
    const obj: Record<string, unknown> = {
      addChild: vi.fn(),
      destroy: vi.fn(),
      x: 0,
      y: 0,
      alpha: 1,
      tint: 0xFFFFFF,
      visible: true,
    };
    return obj;
  };
  return {
    Graphics: vi.fn().mockImplementation(makeGfx),
    Container: vi.fn().mockImplementation(makeContainer),
    Text: vi.fn().mockImplementation(() => ({
      anchor: { set: vi.fn() },
      x: 0,
      y: 0,
    })),
    TextStyle: vi.fn(),
  };
});

import { PlacedBuilding } from '@entities/PlacedBuilding';

describe('PlacedBuilding — ghost mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createGhost returns a PlacedBuilding with alpha 0.5', () => {
    const ghost = PlacedBuilding.createGhost('marketplace', { rows: 1, cols: 2 });
    expect(ghost).toBeInstanceOf(PlacedBuilding);
    expect(ghost.container.alpha).toBe(0.5);
  });

  it('createGhost uses the __ghost__ buildingId', () => {
    const ghost = PlacedBuilding.createGhost('furnace', { rows: 1, cols: 1 });
    expect(ghost.buildingId).toBe('__ghost__');
  });

  it('createGhost stores the correct buildingType and footprint', () => {
    const ghost = PlacedBuilding.createGhost('drone_depot', { rows: 2, cols: 2 });
    expect(ghost.buildingType).toBe('drone_depot');
    expect(ghost.footprint).toEqual({ rows: 2, cols: 2 });
  });

  it('setGhostValid(true) sets tint to green (0x00FF88)', () => {
    const ghost = PlacedBuilding.createGhost('marketplace', { rows: 1, cols: 2 });
    ghost.setGhostValid(true);
    expect(ghost.container.tint).toBe(0x00FF88);
  });

  it('setGhostValid(false) sets tint to red (0xFF4444)', () => {
    const ghost = PlacedBuilding.createGhost('marketplace', { rows: 1, cols: 2 });
    ghost.setGhostValid(false);
    expect(ghost.container.tint).toBe(0xFF4444);
  });

  it('setGhostValid can be toggled multiple times', () => {
    const ghost = PlacedBuilding.createGhost('storage', { rows: 1, cols: 1 });
    ghost.setGhostValid(true);
    expect(ghost.container.tint).toBe(0x00FF88);
    ghost.setGhostValid(false);
    expect(ghost.container.tint).toBe(0xFF4444);
    ghost.setGhostValid(true);
    expect(ghost.container.tint).toBe(0x00FF88);
  });
});
