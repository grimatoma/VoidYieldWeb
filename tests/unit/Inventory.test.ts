import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Inventory } from '@services/Inventory';

vi.mock('@services/EventBus', () => ({ EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));

describe('Inventory', () => {
  let inv: Inventory;

  beforeEach(() => { inv = new Inventory(); });

  it('starts empty', () => {
    expect(inv.totalUnits).toBe(0);
    expect(inv.isFull).toBe(false);
  });

  it('adds a lot and tracks total units', () => {
    inv.add({ oreType: 'vorax', quantity: 5, attributes: {} });
    expect(inv.totalUnits).toBe(5);
  });

  it('merges lots of same ore type', () => {
    inv.add({ oreType: 'vorax', quantity: 3, attributes: {} });
    inv.add({ oreType: 'vorax', quantity: 4, attributes: {} });
    expect(inv.getLots().length).toBe(1);
    expect(inv.totalUnits).toBe(7);
  });

  it('caps at carry limit', () => {
    const added = inv.add({ oreType: 'vorax', quantity: 99, attributes: {} });
    expect(added).toBe(10);
    expect(inv.totalUnits).toBe(10);
    expect(inv.isFull).toBe(true);
  });

  it('drain empties inventory and returns lots', () => {
    inv.add({ oreType: 'krysite', quantity: 3, attributes: {} });
    const drained = inv.drain();
    expect(drained.length).toBe(1);
    expect(drained[0].quantity).toBe(3);
    expect(inv.totalUnits).toBe(0);
  });

  it('serialize and restore round-trips', () => {
    inv.add({ oreType: 'gas', quantity: 2, attributes: {} });
    const saved = inv.serialize();
    const inv2 = new Inventory();
    inv2.restore(saved);
    expect(inv2.totalUnits).toBe(2);
  });
});
