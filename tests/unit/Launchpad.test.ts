import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(), fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(), circle: vi.fn().mockReturnThis(),
    poly: vi.fn().mockReturnThis(), clear: vi.fn(),
    addChild: vi.fn(), x: 0, y: 0, visible: true, style: { fill: '#D4A843' },
    anchor: { set: vi.fn() },
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(() => ({ ...make(), text: '', anchor: { set: vi.fn() } })),
    TextStyle: vi.fn(),
  };
});

import { Launchpad } from '@entities/Launchpad';
import { ROCKET_COMPONENT_DEFAULTS } from '@data/rocketComponents';

describe('Launchpad', () => {
  it('starts in BUILDING state', () => {
    const pad = new Launchpad(0, 0);
    expect(pad.state).toBe('BUILDING');
    expect(pad.componentsInstalled).toBe(0);
  });

  it('installs components', () => {
    const pad = new Launchpad(0, 0);
    const result = pad.installComponent(ROCKET_COMPONENT_DEFAULTS.hull);
    expect(result).toBe(true);
    expect(pad.componentsInstalled).toBe(1);
  });

  it('does not install duplicate component', () => {
    const pad = new Launchpad(0, 0);
    pad.installComponent(ROCKET_COMPONENT_DEFAULTS.hull);
    const second = pad.installComponent(ROCKET_COMPONENT_DEFAULTS.hull);
    expect(second).toBe(false);
    expect(pad.componentsInstalled).toBe(1);
  });

  it('is not launch ready with missing components', () => {
    const pad = new Launchpad(0, 0);
    expect(pad.isLaunchReady).toBe(false);
  });

  it('fires onLaunchReady when all 5 components installed and fueled', () => {
    const pad = new Launchpad(0, 0);
    const cb = vi.fn();
    pad.onLaunchReady = cb;
    for (const key of Object.keys(ROCKET_COMPONENT_DEFAULTS)) {
      pad.installComponent(ROCKET_COMPONENT_DEFAULTS[key]);
    }
    // Manually set fuel
    (pad as any)._fuelUnits = 100;
    (pad as any)._updateStatus();
    expect(cb).toHaveBeenCalled();
  });

  it('launch() returns false when not ready', () => {
    const pad = new Launchpad(0, 0);
    expect(pad.launch()).toBe(false);
  });
});
