import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

// Minimal StorageDepot stub
const makeDepot = (ironBars: number, copperBars: number) => ({
  getBarCount: (type: string) => {
    if (type === 'iron_bar') return ironBars;
    if (type === 'copper_bar') return copperBars;
    return 0;
  },
});

import { BuildMenuOverlay } from '@ui/BuildMenuOverlay';
import type { BuildMenuCallbacks } from '@ui/BuildMenuOverlay';

function makeCallbacks(overrides: Partial<BuildMenuCallbacks> = {}): BuildMenuCallbacks {
  return {
    getStorage: () => null,
    onBuildStart: vi.fn(),
    onMoveStart: vi.fn(),
    getPlacedBuildings: () => [],
    ...overrides,
  };
}

describe('BuildMenuOverlay', () => {
  beforeEach(() => {
    // Ensure a #ui-layer exists in jsdom
    document.body.innerHTML = '<div id="ui-layer"></div>';
  });

  it('starts closed', () => {
    const overlay = new BuildMenuOverlay(makeCallbacks());
    overlay.mount();
    expect(overlay.isOpen()).toBe(false);
  });

  it('toggle opens the panel', () => {
    const overlay = new BuildMenuOverlay(makeCallbacks());
    overlay.mount();
    overlay.toggle();
    expect(overlay.isOpen()).toBe(true);
  });

  it('toggle closes an already-open panel', () => {
    const overlay = new BuildMenuOverlay(makeCallbacks());
    overlay.mount();
    overlay.open();
    overlay.toggle();
    expect(overlay.isOpen()).toBe(false);
  });

  it('build buttons are disabled when depot has 0 bars (road_mode always enabled)', () => {
    // 0 iron_bar, 0 copper_bar — all non-free buildings should be disabled
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(0, 0) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-build-type]');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => {
      const buildType = btn.getAttribute('data-build-type');
      if (buildType === 'road_mode') {
        // road_mode is always enabled (zero material cost; cost is per tile placed)
        expect(btn.disabled).toBe(false);
      } else {
        expect(btn.disabled).toBe(true);
      }
    });
  });

  it('marketplace build button enabled when exactly enough bars (4 iron + 2 copper)', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(4, 2) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const marketBtn = document.querySelector<HTMLButtonElement>(
      'button[data-build-type="marketplace"]'
    );
    expect(marketBtn).not.toBeNull();
    expect(marketBtn!.disabled).toBe(false);

    // Drone depot costs 6 iron — still disabled with only 4 iron
    const droneBtn = document.querySelector<HTMLButtonElement>(
      'button[data-build-type="drone_depot"]'
    );
    expect(droneBtn).not.toBeNull();
    expect(droneBtn!.disabled).toBe(true);
  });

  it('drone_depot build button enabled when enough bars (6 iron + 0 copper)', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(6, 0) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const droneBtn = document.querySelector<HTMLButtonElement>(
      'button[data-build-type="drone_depot"]'
    );
    expect(droneBtn).not.toBeNull();
    expect(droneBtn!.disabled).toBe(false);
  });

  it('onBuildStart called when enabled build button is clicked', () => {
    const onBuildStart = vi.fn();
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(4, 2) as any,
      onBuildStart,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const marketBtn = document.querySelector<HTMLButtonElement>(
      'button[data-build-type="marketplace"]'
    );
    expect(marketBtn).not.toBeNull();
    marketBtn!.click();

    expect(onBuildStart).toHaveBeenCalledWith('marketplace');
  });

  it('clicking enabled build button closes the panel', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(4, 2) as any,
      onBuildStart: vi.fn(),
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const marketBtn = document.querySelector<HTMLButtonElement>(
      'button[data-build-type="marketplace"]'
    );
    marketBtn!.click();
    expect(overlay.isOpen()).toBe(false);
  });

  it('onBuildStart is NOT called when disabled build button is clicked', () => {
    const onBuildStart = vi.fn();
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(0, 0) as any,
      onBuildStart,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const marketBtn = document.querySelector<HTMLButtonElement>(
      'button[data-build-type="marketplace"]'
    );
    expect(marketBtn!.disabled).toBe(true);
    marketBtn!.click();
    expect(onBuildStart).not.toHaveBeenCalled();
  });

  it('MOVE buttons appear for placed buildings', () => {
    const callbacks = makeCallbacks({
      getPlacedBuildings: () => [
        {
          buildingId: 'storage_0',
          buildingType: 'storage',
          row: 0,
          col: 0,
          footprint: { rows: 1, cols: 1 },
        },
      ],
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const moveBtn = document.querySelector<HTMLButtonElement>(
      'button[data-move-id="storage_0"]'
    );
    expect(moveBtn).not.toBeNull();
  });

  it('onMoveStart called when MOVE button is clicked', () => {
    const onMoveStart = vi.fn();
    const callbacks = makeCallbacks({
      onMoveStart,
      getPlacedBuildings: () => [
        {
          buildingId: 'furnace_1',
          buildingType: 'furnace',
          row: 1,
          col: 1,
          footprint: { rows: 1, cols: 1 },
        },
      ],
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const moveBtn = document.querySelector<HTMLButtonElement>(
      'button[data-move-id="furnace_1"]'
    );
    moveBtn!.click();
    expect(onMoveStart).toHaveBeenCalledWith('furnace_1');
  });

  it('unmount removes the panel from DOM', () => {
    const overlay = new BuildMenuOverlay(makeCallbacks());
    overlay.mount();
    expect(document.getElementById('build-menu-overlay')).not.toBeNull();
    overlay.unmount();
    expect(document.getElementById('build-menu-overlay')).toBeNull();
  });

  // ── TDD-spec corrected costs (TDD §3.5) ───────────────────────────────────

  it('[TDD] drone_depot button enabled at exactly 6 iron + 0 copper (spec cost)', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(6, 0) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const btn = document.querySelector<HTMLButtonElement>('button[data-build-type="drone_depot"]');
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBe(false);
  });

  it('[TDD] drone_depot button disabled at only 5 iron (below spec cost of 6)', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(5, 0) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const btn = document.querySelector<HTMLButtonElement>('button[data-build-type="drone_depot"]');
    expect(btn!.disabled).toBe(true);
  });

  it('[TDD] marketplace button enabled at exactly 4 iron + 2 copper (spec cost)', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(4, 2) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const btn = document.querySelector<HTMLButtonElement>('button[data-build-type="marketplace"]');
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBe(false);
  });

  it('[TDD] marketplace button disabled at 4 iron + 1 copper (below spec cost)', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(4, 1) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const btn = document.querySelector<HTMLButtonElement>('button[data-build-type="marketplace"]');
    expect(btn!.disabled).toBe(true);
  });

  it('[TDD] onEnterRoadMode callback fires when road_mode button is clicked', () => {
    const onEnterRoadMode = vi.fn();
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(99, 99) as any,
      onEnterRoadMode,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const btn = document.querySelector<HTMLButtonElement>('button[data-build-type="road_mode"]');
    expect(btn).not.toBeNull();
    btn!.click();
    expect(onEnterRoadMode).toHaveBeenCalledOnce();
  });

  it('[TDD] electrolysis_unit button present and enabled at 6 iron + 4 copper', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(6, 4) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const btn = document.querySelector<HTMLButtonElement>('button[data-build-type="electrolysis_unit"]');
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBe(false);
  });

  it('[TDD] launchpad button present and disabled at 29 iron (below spec cost of 30)', () => {
    const callbacks = makeCallbacks({
      getStorage: () => makeDepot(29, 15) as any,
    });
    const overlay = new BuildMenuOverlay(callbacks);
    overlay.mount();
    overlay.open();

    const btn = document.querySelector<HTMLButtonElement>('button[data-build-type="launchpad"]');
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBe(true);
  });
});
