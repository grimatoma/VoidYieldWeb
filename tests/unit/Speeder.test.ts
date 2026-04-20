import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const make = () => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    x: 0,
    y: 0,
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(make),
    TextStyle: vi.fn(),
    Application: vi.fn(),
  };
});

import { Speeder } from '@entities/Speeder';

const mockInput = (held: string[] = []) =>
  ({
    isHeld: (action: string) => held.includes(action),
  }) as any;

describe('Speeder', () => {
  it('starts at full fuel', () => {
    const s = new Speeder(0, 0);
    expect(s.fuel).toBe(Speeder.MAX_FUEL);
  });

  it('moves faster than player speed (520 px/s)', () => {
    const s = new Speeder(0, 0);
    s.update(1, mockInput(['player_move_right']), { width: 9999, height: 9999 });
    expect(s.x).toBeCloseTo(520, 0);
  });

  it('does not move when out of fuel', () => {
    const s = new Speeder(100, 100);
    (s as any)._fuel = 0;
    s.update(1, mockInput(['player_move_right']), { width: 9999, height: 9999 });
    expect(s.x).toBe(100);
  });

  it('refuel adds fuel', () => {
    const s = new Speeder(0, 0);
    (s as any)._fuel = 10;
    s.refuel(50);
    expect(s.fuel).toBe(60);
  });

  it('fuel does not exceed MAX_FUEL', () => {
    const s = new Speeder(0, 0);
    s.refuel(999);
    expect(s.fuel).toBe(Speeder.MAX_FUEL);
  });
});
