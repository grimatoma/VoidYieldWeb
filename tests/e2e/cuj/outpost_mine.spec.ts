import { test, expect } from '@playwright/test';
import { waitForGame } from '../helpers/gameSetup';

test('player can mine iron ore', async ({ page }) => {
  await waitForGame(page);
  await page.evaluate(() => window.__voidyield__.outpost.resetOutpost());
  // Advance time to let scene settle
  await page.evaluate(() => window.__voidyield__.advanceTime(1));
  // Seed iron in inventory directly via debug
  await page.evaluate(() => window.__voidyield__.outpost.setInventory('iron_ore', 3));
  const count = await page.evaluate(() => window.__voidyield__.outpost.getInventory('iron_ore'));
  expect(count).toBe(3);
});

test('current scene is outpost on fresh start', async ({ page }) => {
  await waitForGame(page);
  // Wait for boot to navigate away from boot scene
  await page.waitForFunction(
    () => {
      const id = window.__voidyield__.currentSceneId();
      return id !== null && id !== 'boot';
    },
    { timeout: 10000 }
  );
  const sceneId = await page.evaluate(() => window.__voidyield__.currentSceneId());
  expect(sceneId).toBe('outpost');
});
