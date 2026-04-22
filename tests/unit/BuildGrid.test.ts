import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/EventBus', () => ({ EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));

import { BuildGrid } from '@services/BuildGrid';
import type { PlacedEntry } from '@services/BuildGrid';

function makeEntry(overrides: Partial<PlacedEntry> = {}): PlacedEntry {
  return {
    buildingId: 'test_0',
    buildingType: 'storage',
    row: 0,
    col: 0,
    footprint: { rows: 1, cols: 1 },
    ...overrides,
  };
}

describe('BuildGrid', () => {
  let grid: BuildGrid;

  beforeEach(() => {
    grid = new BuildGrid();
    vi.clearAllMocks();
  });

  it('canPlace returns true for an empty in-bounds cell', () => {
    expect(grid.canPlace(0, 0, { rows: 1, cols: 1 })).toBe(true);
  });

  it('canPlace returns false when row is out of bounds', () => {
    expect(grid.canPlace(5, 0, { rows: 1, cols: 1 })).toBe(false);
  });

  it('canPlace returns false when col is out of bounds', () => {
    expect(grid.canPlace(0, 5, { rows: 1, cols: 1 })).toBe(false);
  });

  it('canPlace returns false when footprint extends out of bounds', () => {
    expect(grid.canPlace(4, 4, { rows: 2, cols: 2 })).toBe(false);
  });

  it('canPlace returns false when a cell is occupied', () => {
    grid.place(makeEntry({ buildingId: 'a', row: 1, col: 1 }));
    expect(grid.canPlace(1, 1, { rows: 1, cols: 1 })).toBe(false);
  });

  it('place + pickup round-trip returns the entry and removes it', () => {
    const entry = makeEntry({ buildingId: 'b', row: 2, col: 2 });
    grid.place(entry);
    expect(grid.getAll()).toHaveLength(1);

    const removed = grid.pickup('b');
    expect(removed).not.toBeNull();
    expect(removed!.buildingId).toBe('b');
    expect(grid.getAll()).toHaveLength(0);
  });

  it('pickup returns null for unknown buildingId', () => {
    expect(grid.pickup('nonexistent')).toBeNull();
  });

  it('getBuildingAt finds a 1×1 building by its exact cell', () => {
    grid.place(makeEntry({ buildingId: 'c', row: 3, col: 2 }));
    const found = grid.getBuildingAt(3, 2);
    expect(found).not.toBeNull();
    expect(found!.buildingId).toBe('c');
  });

  it('getBuildingAt returns null for an empty cell', () => {
    expect(grid.getBuildingAt(0, 0)).toBeNull();
  });

  it('getBuildingAt finds a 2×2 building by any of its 4 cells', () => {
    const entry = makeEntry({ buildingId: 'd', row: 1, col: 1, footprint: { rows: 2, cols: 2 } });
    grid.place(entry);
    expect(grid.getBuildingAt(1, 1)?.buildingId).toBe('d');
    expect(grid.getBuildingAt(1, 2)?.buildingId).toBe('d');
    expect(grid.getBuildingAt(2, 1)?.buildingId).toBe('d');
    expect(grid.getBuildingAt(2, 2)?.buildingId).toBe('d');
  });

  it('2×2 footprint blocks all 4 cells for subsequent placement', () => {
    grid.place(makeEntry({ buildingId: 'e', row: 0, col: 0, footprint: { rows: 2, cols: 2 } }));
    expect(grid.canPlace(0, 0, { rows: 1, cols: 1 })).toBe(false);
    expect(grid.canPlace(0, 1, { rows: 1, cols: 1 })).toBe(false);
    expect(grid.canPlace(1, 0, { rows: 1, cols: 1 })).toBe(false);
    expect(grid.canPlace(1, 1, { rows: 1, cols: 1 })).toBe(false);
    // Cell outside footprint should still be free
    expect(grid.canPlace(2, 0, { rows: 1, cols: 1 })).toBe(true);
  });

  it('place throws if cell is occupied', () => {
    grid.place(makeEntry({ buildingId: 'f' }));
    expect(() => grid.place(makeEntry({ buildingId: 'g' }))).toThrow();
  });

  it('serialize returns a copy of all entries', () => {
    grid.place(makeEntry({ buildingId: 'h', row: 4, col: 4 }));
    const serialized = grid.serialize();
    expect(serialized).toHaveLength(1);
    expect(serialized[0].buildingId).toBe('h');
    // Mutation of serialized array should not affect grid
    serialized.pop();
    expect(grid.getAll()).toHaveLength(1);
  });

  it('deserialize replaces grid state', () => {
    grid.place(makeEntry({ buildingId: 'old' }));
    grid.deserialize([makeEntry({ buildingId: 'new', row: 4, col: 4 })]);
    expect(grid.getAll()).toHaveLength(1);
    expect(grid.getAll()[0].buildingId).toBe('new');
  });
});
