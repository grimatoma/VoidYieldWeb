/**
 * CUJ: Planet Travel — galaxy map, scene switching, planet state persistence.
 *
 * Tests the inter-planet navigation system:
 *   - Starting planet is planet_a1
 *   - State persists across scene switches
 *   - Each planet has its own depot
 *   - Stranding state triggers on Planet B arrival
 */
import { test, expect } from '@playwright/test';
import { waitForGame, waitForPlanet } from '../helpers/gameSetup';
import { Preset } from '../helpers/presets';

test.describe('Planet Travel CUJ', () => {
  test('game starts on planet_a1', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(2000);

    // GameState.currentPlanet starts as 'a1' (or 'planet_a1' after scene switch)
    const planet = await g.getCurrentPlanet();
    expect(['a1', 'planet_a1']).toContain(planet);
  });

  test('credits persist across planet switch via EventBus travel', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(3000);

    await g.setCredits(7500);

    // Trigger scene travel via EventBus
    await page.evaluate(() => {
      window.__voidyield__.services.EventBus.emit('scene:travel', 'planet_b');
    });
    await page.waitForTimeout(2000);

    // Credits should survive the scene switch
    expect(await g.getCredits()).toBe(7500);
  });

  test('research points persist across planet switch', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(3000);

    await g.setRP(800);

    await page.evaluate(() => {
      window.__voidyield__.services.EventBus.emit('scene:travel', 'planet_a2');
    });
    await page.waitForTimeout(2000);

    expect(await g.getRP()).toBe(800);
  });

  test('tech unlocks persist across planet switch', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(3000);

    await g.unlockTech('drill_bit_mk2');
    await g.unlockTech('logistics_1');

    await page.evaluate(() => {
      window.__voidyield__.services.EventBus.emit('scene:travel', 'planet_b');
    });
    await page.waitForTimeout(2000);

    const unlocks = await g.getTechUnlocks();
    expect(unlocks).toContain('drill_bit_mk2');
    expect(unlocks).toContain('logistics_1');
  });

  test('population persists across planet switch', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(3000);

    await g.setPopulation('pioneer', 12);
    await g.setPopulation('colonist', 6);

    await page.evaluate(() => {
      window.__voidyield__.services.EventBus.emit('scene:travel', 'planet_a2');
    });
    await page.waitForTimeout(2000);

    expect(await g.getPopulation('pioneer')).toBe(12);
    expect(await g.getPopulation('colonist')).toBe(6);
  });

  test('planet_b depot is separate from planet_a1 depot', async ({ page }) => {
    // Boot into planet_a1, stock its depot, then travel to planet_b.
    // Depots are scene-local: planet_a1 depot unregisters when its scene exits.
    // The test verifies planet_b starts with its own fresh depot.
    const g = await waitForPlanet(page, 'planet_a1');

    // Verify planet_a1 depot is accessible and settable
    await g.setPlanetStock('planet_a1', 'vorax', 500);
    expect(await g.getPlanetStock('planet_a1', 'vorax')).toBe(500);

    // Travel to planet_b — planet_a1 scene exits and its depot unregisters
    await g.travelTo('planet_b');

    // planet_b depot should exist and be fresh (no vorax)
    const bStock = await g.getPlanetStock('planet_b', 'vorax');
    expect(bStock).toBe(0);

    // Setting stock on planet_b should work independently
    await g.setPlanetStock('planet_b', 'vorax', 300);
    expect(await g.getPlanetStock('planet_b', 'vorax')).toBe(300);
  });

  test('stranding activates when setting stranded state', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(3000);

    // Simulate arriving at planet B
    await g.setStranded(20);
    expect(await g.isStranded()).toBe(true);
    expect(await g.getStrandingFuel()).toBe(20);

    // Travel to planet_b scene (stranding state persists)
    await page.evaluate(() => {
      window.__voidyield__.services.EventBus.emit('scene:travel', 'planet_b');
    });
    await page.waitForTimeout(2000);

    expect(await g.isStranded()).toBe(true);
  });

  test('game canvas remains visible after scene travel', async ({ page }) => {
    await waitForGame(page);
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
      window.__voidyield__.services.EventBus.emit('scene:travel', 'planet_c');
    });
    await page.waitForTimeout(2000);

    // Canvas should still be in the DOM and visible
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('multiple round-trip planet switches maintain state', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(3000);

    await g.setCredits(12345);
    await g.unlockTech('survey_drone_unlock');

    // planet_a1 → planet_b → planet_a1
    for (const dest of ['planet_b', 'planet_a1', 'planet_b', 'planet_a2']) {
      await page.evaluate((d) => {
        window.__voidyield__.services.EventBus.emit('scene:travel', d);
      }, dest);
      await page.waitForTimeout(1500);
    }

    expect(await g.getCredits()).toBe(12345);
    const unlocks = await g.getTechUnlocks();
    expect(unlocks).toContain('survey_drone_unlock');
  });
});
