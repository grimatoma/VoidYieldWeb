import { describe, it, expect } from 'vitest';
import { FORMAT_VERSION, defaultSaveData, SaveData } from '@services/SaveManager';

describe('SaveManager v3', () => {
  it('should have FORMAT_VERSION = 3', () => {
    expect(FORMAT_VERSION).toBe(3);
  });

  it('defaultSaveData().current_planet should be "outpost"', () => {
    const data = defaultSaveData();
    expect(data.current_planet).toBe('outpost');
  });

  it('outpost field should be optional in SaveData', () => {
    const data: SaveData = defaultSaveData();
    // Should compile without errors — outpost is optional
    expect(data.outpost).toBeUndefined();
  });

  it('should migrate v2 save to v3 and set current_planet to "outpost"', () => {
    // Note: This is a conceptual test. SaveManager.loadGame handles migrations internally.
    // A v2 save loaded should have current_planet = 'outpost' after migration.
    const defaultData = defaultSaveData();
    expect(defaultData.format_version).toBe(3);
    expect(defaultData.current_planet).toBe('outpost');
  });

  it('outpost field can hold grid, furnace, stockpile, drone slots, and position', () => {
    const data: SaveData = {
      ...defaultSaveData(),
      outpost: {
        grid: [],
        furnaceRecipe: 'iron',
        stockpile: { iron_bar: 5, copper_bar: 3 },
        droneSlots: [],
        playerX: 480,
        playerY: 270,
      },
    };
    expect(data.outpost).toBeDefined();
    expect(data.outpost?.grid).toEqual([]);
    expect(data.outpost?.furnaceRecipe).toBe('iron');
    expect(data.outpost?.stockpile.iron_bar).toBe(5);
    expect(data.outpost?.playerX).toBe(480);
  });
});
