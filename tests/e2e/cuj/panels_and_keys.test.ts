/**
 * CUJ: Panels and Keys — keyboard-driven UI panel open/close behaviour.
 *
 * Tests that the keyboard shortcuts for panels work correctly:
 *   - [I] opens the inventory panel
 *   - [Esc] closes an open panel
 *   - [Esc] with no panel open is a no-op (game does not crash)
 */
import { test, expect } from '@playwright/test';
import { waitForPlanet } from '../helpers/gameSetup';

test.describe('Panels and Keys CUJ', () => {
  test('press [I] on planet_a1 opens the inventory panel', async ({ page }) => {
    await waitForPlanet(page, 'planet_a1');

    await page.keyboard.press('i');

    // The inventory panel must be visible in the DOM
    await expect(
      page.locator('.inventory-panel, #inventory-panel')
    ).toBeVisible({ timeout: 5000 });
  });

  test('press [Esc] while inventory panel is open closes it', async ({ page }) => {
    await waitForPlanet(page, 'planet_a1');

    // Open the panel first
    await page.keyboard.press('i');
    await expect(
      page.locator('.inventory-panel, #inventory-panel')
    ).toBeVisible({ timeout: 5000 });

    // Now close it with Escape
    await page.keyboard.press('Escape');

    await expect(
      page.locator('.inventory-panel, #inventory-panel')
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('press [Esc] when no panel is open does not crash the game', async ({ page }) => {
    await waitForPlanet(page, 'planet_a1');

    // Ensure no panel is open (no inventory-panel, no galaxy-panel)
    const inventoryPanel = page.locator('.inventory-panel, #inventory-panel');
    const galaxyPanel = page.locator('.galaxy-panel');

    // If panels happen to be open, close them first — not expected in a fresh load
    // but guard against flakiness
    if (await inventoryPanel.isVisible()) {
      await page.keyboard.press('Escape');
    }
    if (await galaxyPanel.isVisible()) {
      await page.keyboard.press('Escape');
    }

    // Press Esc with nothing open — should not throw or freeze the game
    await page.keyboard.press('Escape');

    // The game canvas must still be present and responsive
    await expect(page.locator('canvas')).toBeVisible();

    // Verify the debug API is still accessible (game hasn't crashed)
    const credits = await page.evaluate(() => window.__voidyield__.getCredits());
    expect(typeof credits).toBe('number');
  });
});
