import { describe, it, expect, beforeEach, vi } from 'vitest';
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
});
