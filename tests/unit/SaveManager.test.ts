import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@services/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn() },
}));

import { SaveManager, defaultSaveData, FORMAT_VERSION } from '@services/SaveManager';

describe('SaveManager', () => {
  let sm: SaveManager;
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => { mockStorage.set(k, v); },
      removeItem: (k: string) => { mockStorage.delete(k); },
    });
    sm = new SaveManager();
  });

  it('returns null when no save exists', () => {
    expect(sm.loadGame()).toBeNull();
    expect(sm.hasSave()).toBe(false);
  });

  it('round-trips save data', () => {
    const data = defaultSaveData();
    data.credits = 999;
    data.sector_number = 3;
    sm.saveGame(data);
    const loaded = sm.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.credits).toBe(999);
    expect(loaded!.sector_number).toBe(3);
    expect(loaded!.format_version).toBe(FORMAT_VERSION);
  });

  it('stamps last_save_timestamp on save', () => {
    const before = Math.floor(Date.now() / 1000);
    sm.saveGame(defaultSaveData());
    const loaded = sm.loadGame()!;
    expect(loaded.last_save_timestamp).toBeGreaterThanOrEqual(before);
  });

  it('returns null and warns on version mismatch', () => {
    const data = defaultSaveData();
    (data as unknown as Record<string, unknown>)['format_version'] = 99;
    mockStorage.set('voidyield_savegame', JSON.stringify(data));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(sm.loadGame()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('clears save', () => {
    sm.saveGame(defaultSaveData());
    sm.clearSave();
    expect(sm.hasSave()).toBe(false);
  });

  // ─── v3 → v4 migration ───────────────────────────────────────────────────

  it('migrates v3 save to v4 preserving credits and tech unlocks', () => {
    const v3Save = {
      ...defaultSaveData(),
      format_version: 3,
      credits: 1234,
      tech_tree_unlocks: ['drone_mk2'],
    };
    mockStorage.set('voidyield_savegame', JSON.stringify(v3Save));
    const loaded = sm.loadGame()!;
    expect(loaded).not.toBeNull();
    expect(loaded.format_version).toBe(4);
    expect(loaded.credits).toBe(1234);
    expect(loaded.tech_tree_unlocks).toContain('drone_mk2');
  });

  it('migrates v3 droneSlots oreType into drone_allocations.miners', () => {
    const v3Save = {
      ...defaultSaveData(),
      format_version: 3,
      outpost: {
        grid: [],
        furnaceRecipe: 'off',
        stockpile: {},
        droneSlots: [
          { slotId: 'slot_0', droneType: 'scout', oreType: 'iron_ore' },
          { slotId: 'slot_1', droneType: 'scout', oreType: 'iron_ore' },
          { slotId: 'slot_2', droneType: 'scout', oreType: 'copper_ore' },
          { slotId: 'slot_3', droneType: 'refinery', oreType: 'any' },
        ],
        playerX: 0,
        playerY: 0,
      },
    };
    mockStorage.set('voidyield_savegame', JSON.stringify(v3Save));
    const loaded = sm.loadGame()!;
    expect(loaded.format_version).toBe(4);
    expect(loaded.drone_allocations?.miners?.iron_ore).toBe(2);
    expect(loaded.drone_allocations?.miners?.copper_ore).toBe(1);
    // refinery is logistics, not miner; oreType 'any' is excluded
    expect(loaded.drone_allocations?.miners?.any).toBeUndefined();
    expect(loaded.drone_allocations?.logistics).toBe(0);
  });

  it('migrates v3 with no droneSlots to empty allocations', () => {
    const v3Save = {
      ...defaultSaveData(),
      format_version: 3,
    };
    mockStorage.set('voidyield_savegame', JSON.stringify(v3Save));
    const loaded = sm.loadGame()!;
    expect(loaded.format_version).toBe(4);
    expect(loaded.drone_allocations).toMatchObject({ miners: {}, logistics: 0 });
  });
});
