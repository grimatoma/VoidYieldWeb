/**
 * Smoke tests — fastest signal that the game boots and the debug API is live.
 * These run first in CI; if they fail, skip the full CUJ suite.
 */
import { test, expect } from '@playwright/test';
import { waitForGame } from './helpers/gameSetup';

test.describe('Smoke', () => {
  test('game loads and canvas is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('page title is VoidYield', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VoidYield/i);
  });

  test('debug API is mounted at window.__voidyield__', async ({ page }) => {
    const g = await waitForGame(page);
    // If waitForGame resolves, the API is present.
    // Verify basic shape:
    const credits = await g.getCredits();
    expect(typeof credits).toBe('number');
  });

  test('debug API exposes all expected methods', async ({ page }) => {
    await waitForGame(page);

    const methods = await page.evaluate(() => {
      const api = window.__voidyield__;
      return [
        'setCredits', 'setRP', 'setPlanetStock', 'clearPlanetStock',
        'setPopulation', 'resetPopulation', 'unlockTech', 'unlockAllTech',
        'setStranded', 'loadPreset', 'resetAll',
        'getCredits', 'getRP', 'getPlanetStock', 'getAllPlanetStock',
        'getPopulation', 'getTotalPopulation', 'getCurrentTier',
        'getTechUnlocks', 'getCurrentPlanet', 'isStranded',
        'getStrandingFuel', 'getProductivityMultiplier',
        'advanceTime',
      ].filter(m => typeof (api as Record<string, unknown>)[m] === 'function');
    });

    expect(methods.length).toBe(24);
  });

  test('debug API services object has all service references', async ({ page }) => {
    await waitForGame(page);

    const services = await page.evaluate(() => {
      const s = window.__voidyield__.services;
      return Object.keys(s);
    });

    expect(services).toContain('gameState');
    expect(services).toContain('logisticsManager');
    expect(services).toContain('consumptionManager');
    expect(services).toContain('techTree');
    expect(services).toContain('strandingManager');
    expect(services).toContain('EventBus');
  });

  test('initial game state is valid', async ({ page }) => {
    const g = await waitForGame(page);

    const credits = await g.getCredits();
    const rp = await g.getRP();
    const isStranded = await g.isStranded();
    const fuel = await g.getStrandingFuel();

    expect(credits).toBeGreaterThanOrEqual(0);
    expect(rp).toBeGreaterThanOrEqual(0);
    expect(typeof isStranded).toBe('boolean');
    expect(fuel).toBeGreaterThanOrEqual(0);
  });

  test('setCredits and getCredits round-trip', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setCredits(42_000);
    expect(await g.getCredits()).toBe(42_000);
  });

  test('setRP and getRP round-trip', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setRP(777);
    expect(await g.getRP()).toBe(777);
  });
});
