import { describe, it, expect, vi } from 'vitest';
import { ProductionOverlay } from '@ui/ProductionOverlay';

vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    x: 0,
    y: 0,
    visible: true,
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(() => ({ ...make(), text: '' })),
    TextStyle: vi.fn(),
  };
});

describe('ProductionOverlay', () => {
  it('starts invisible', () => {
    const overlay = new ProductionOverlay(2800, 2000);
    expect(overlay.visible).toBe(false);
  });

  it('setVisible(true) makes it visible', () => {
    const overlay = new ProductionOverlay(2800, 2000);
    overlay.setVisible(true);
    expect(overlay.visible).toBe(true);
  });

  it('setVisible(false) hides it', () => {
    const overlay = new ProductionOverlay(2800, 2000);
    overlay.setVisible(true);
    overlay.setVisible(false);
    expect(overlay.visible).toBe(false);
  });

  it('render does not throw with empty arrays', () => {
    const overlay = new ProductionOverlay(2800, 2000);
    expect(() => overlay.render([], [])).not.toThrow();
  });
});
