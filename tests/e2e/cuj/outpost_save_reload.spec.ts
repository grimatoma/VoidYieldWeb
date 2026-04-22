import { test, expect } from '@playwright/test';
import { waitForGame } from '../helpers/gameSetup';

test('credits persist across page reload', async ({ page }) => {
  let g = await waitForGame(page);

  // Set credits via debug API
  const targetCredits = 1500;
  await g.eval(`g.setCredits(${targetCredits})`);

  const creditsBefore = await g.getCredits();
  expect(creditsBefore).toBe(targetCredits);

  // Trigger an autosave (wait a bit to ensure save completes)
  await page.waitForTimeout(100);

  // Reload the page
  await page.reload();

  // Re-attach helper and wait for game to boot
  g = await waitForGame(page);

  // Check credits persisted
  const creditsAfter = await g.getCredits();
  expect(creditsAfter).toBe(targetCredits);
});

test('current scene is "outpost" after reload', async ({ page }) => {
  let g = await waitForGame(page);

  const sceneId = await g.eval('g.currentSceneId()');
  expect(sceneId).toBe('outpost');

  // Wait a bit and reload
  await page.waitForTimeout(100);
  await page.reload();

  // Re-attach and check scene
  g = await waitForGame(page);
  const sceneIdAfter = await g.eval('g.currentSceneId()');
  expect(sceneIdAfter).toBe('outpost');
});

test('outpost stockpile persists across reload', async ({ page }) => {
  let g = await waitForGame(page);

  // Seed bars
  await g.eval('g.outpost.seedBars(8, 3)');

  const ironBefore = await g.eval('g.outpost.getStorageStock("iron_bar")');
  const copperBefore = await g.eval('g.outpost.getStorageStock("copper_bar")');
  expect(ironBefore).toBe(8);
  expect(copperBefore).toBe(3);

  // Wait for autosave and reload
  await page.waitForTimeout(100);
  await page.reload();

  g = await waitForGame(page);

  // Check stockpile persisted
  const ironAfter = await g.eval('g.outpost.getStorageStock("iron_bar")');
  const copperAfter = await g.eval('g.outpost.getStorageStock("copper_bar")');
  expect(ironAfter).toBe(8);
  expect(copperAfter).toBe(3);
});
