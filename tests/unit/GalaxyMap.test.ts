import { describe, it, expect, vi } from 'vitest';
import { GalaxyMap } from '@ui/GalaxyMap';

vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    addChildAt: vi.fn(),
    removeChildAt: vi.fn(),
    x: 0,
    y: 0,
    anchor: { set: vi.fn() },
    eventMode: 'auto' as const,
    cursor: 'default',
    on: vi.fn(),
    visible: true,
    children: [] as any[],
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(() => ({
      ...make(),
      removeChildAt: vi.fn(),
      children: [] as any[],
    })),
    Text: vi.fn().mockImplementation(() => ({ ...make(), text: '' })),
    TextStyle: vi.fn(),
  };
});

describe('GalaxyMap', () => {
  it('starts invisible', () => {
    const map = new GalaxyMap();
    expect(map.visible).toBe(false);
  });

  it('toggle shows/hides', () => {
    const map = new GalaxyMap();
    map.toggle();
    expect(map.visible).toBe(true);
    map.toggle();
    expect(map.visible).toBe(false);
  });

  it('setVisible(true) makes it visible', () => {
    const map = new GalaxyMap();
    map.setVisible(true);
    expect(map.visible).toBe(true);
  });

  it('setPlanets does not throw', () => {
    const map = new GalaxyMap();
    expect(() =>
      map.setPlanets([
        { id: 'planet_a1', label: 'A1', x: 0, y: 0, unlocked: true, current: true },
      ]),
    ).not.toThrow();
  });
});
