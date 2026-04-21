/**
 * CUJ: Galaxy Navigation — galaxy map open/close, planet list, travel.
 *
 * Tests the galaxy map UI accessible via [G]:
 *   - [G] opens the galaxy panel on every planet
 *   - The panel lists the correct travel destinations per planet
 *   - Clicking TRAVEL changes the active scene via gameState.currentPlanet
 *   - Planet B, previously a dead-end, can travel back to planet_a1
 */
import { test, expect } from '@playwright/test';
import { waitForGame, waitForPlanet } from '../helpers/gameSetup';

test.describe('Galaxy Navigation CUJ', () => {
  test('press [G] on planet_a1 opens the galaxy panel', async ({ page }) => {
    await waitForPlanet(page, 'planet_a1');

    await page.keyboard.press('g');

    // The galaxy panel element must be visible in the DOM
    await expect(page.locator('.galaxy-panel')).toBeVisible({ timeout: 5000 });
  });

  test('galaxy panel on planet_a1 shows travel buttons for A2, B, C, A3', async ({ page }) => {
    await waitForPlanet(page, 'planet_a1');

    await page.keyboard.press('g');
    await expect(page.locator('.galaxy-panel')).toBeVisible({ timeout: 5000 });

    // Each destination must have a TRAVEL button (or a button/link containing the planet name)
    await expect(page.locator('.galaxy-panel [data-planet="planet_a2"]')).toBeVisible();
    await expect(page.locator('.galaxy-panel [data-planet="planet_b"]')).toBeVisible();
    await expect(page.locator('.galaxy-panel [data-planet="planet_c"]')).toBeVisible();
    await expect(page.locator('.galaxy-panel [data-planet="planet_a3"]')).toBeVisible();
  });

  test('clicking TRAVEL to A2 from planet_a1 changes scene to planet_a2', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    await page.keyboard.press('g');
    await expect(page.locator('.galaxy-panel')).toBeVisible({ timeout: 5000 });

    // Click the travel button for planet_a2
    await page.locator('.galaxy-panel [data-planet="planet_a2"]').click();

    // Wait for the scene to change
    await page.waitForFunction(
      () => {
        const planet = window.__voidyield__.services.gameState.currentPlanet;
        return planet === 'planet_a2' || planet === 'a2';
      },
      { timeout: 10_000 }
    );

    const currentPlanet = await g.getCurrentPlanet();
    expect(['planet_a2', 'a2']).toContain(currentPlanet);
  });

  test('galaxy panel on planet_a2 shows travel buttons for A1, B, C, A3', async ({ page }) => {
    await waitForPlanet(page, 'planet_a2');

    await page.keyboard.press('g');
    await expect(page.locator('.galaxy-panel')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('.galaxy-panel [data-planet="planet_a1"]')).toBeVisible();
    await expect(page.locator('.galaxy-panel [data-planet="planet_b"]')).toBeVisible();
    await expect(page.locator('.galaxy-panel [data-planet="planet_c"]')).toBeVisible();
    await expect(page.locator('.galaxy-panel [data-planet="planet_a3"]')).toBeVisible();
  });

  test('press [G] on planet_b opens the galaxy panel', async ({ page }) => {
    // Planet B was previously a dead-end with no way out — this test confirms it
    // now exposes the galaxy map.
    await waitForPlanet(page, 'planet_b');

    await page.keyboard.press('g');

    await expect(page.locator('.galaxy-panel')).toBeVisible({ timeout: 5000 });
  });

  test('from planet_b: can travel back to planet_a1 via galaxy map', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_b');

    await page.keyboard.press('g');
    await expect(page.locator('.galaxy-panel')).toBeVisible({ timeout: 5000 });

    // Planet B must offer a route back to A1
    await expect(page.locator('.galaxy-panel [data-planet="planet_a1"]')).toBeVisible();

    await page.locator('.galaxy-panel [data-planet="planet_a1"]').click();

    await page.waitForFunction(
      () => {
        const planet = window.__voidyield__.services.gameState.currentPlanet;
        return planet === 'planet_a1' || planet === 'a1';
      },
      { timeout: 10_000 }
    );

    const currentPlanet = await g.getCurrentPlanet();
    expect(['planet_a1', 'a1']).toContain(currentPlanet);
  });

  test('galaxy panel on planet_c shows travel button for planet_a3', async ({ page }) => {
    await waitForPlanet(page, 'planet_c');

    await page.keyboard.press('g');
    await expect(page.locator('.galaxy-panel')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('.galaxy-panel [data-planet="planet_a3"]')).toBeVisible();
  });
});
