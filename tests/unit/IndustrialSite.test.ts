import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const Graphics = vi.fn(() => ({
    clear: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
  }));
  const Container = vi.fn(() => ({ x: 0, y: 0, addChild: vi.fn() }));
  return { Graphics, Container };
});

import { IndustrialSite } from '@entities/IndustrialSite';

describe('IndustrialSite', () => {
  it('starts unoccupied', () => {
    const site = new IndustrialSite('A1-S1', 400, 300);
    expect(site.isOccupied).toBe(false);
  });

  it('siteId is set correctly', () => {
    const site = new IndustrialSite('A1-S1', 400, 300);
    expect(site.siteId).toBe('A1-S1');
  });

  it('occupy sets isOccupied true', () => {
    const site = new IndustrialSite('A1-S1', 400, 300);
    site.occupy({});
    expect(site.isOccupied).toBe(true);
  });

  it('free clears isOccupied', () => {
    const site = new IndustrialSite('A1-S1', 400, 300);
    site.occupy({});
    site.free();
    expect(site.isOccupied).toBe(false);
  });

  it('container positioned at world coords', () => {
    const site = new IndustrialSite('A1-S1', 400, 300);
    expect(site.container.x).toBe(400);
    expect(site.container.y).toBe(300);
  });
});
