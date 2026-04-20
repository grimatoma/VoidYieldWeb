/**
 * CUJ: Stranding — Planet B arrival, fuel accumulation, launch readiness.
 *
 * Simulates the core Planet B mechanic:
 *   - Arrive with 20 RF (stranded)
 *   - Gather rocket fuel via FuelSynthesizer
 *   - Reach 100 RF to unstranded and launch
 */
import { test, expect } from '@playwright/test';
import { waitForGame } from '../helpers/gameSetup';
import { Preset, applyStrandedOnPlanetB } from '../helpers/presets';

test.describe('Stranding CUJ', () => {
  test('fresh start is NOT stranded (at home planet)', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.freshStart(g);

    expect(await g.isStranded()).toBe(false);
    expect(await g.getStrandingFuel()).toBe(100); // home planet has full fuel
  });

  test('setStranded with fuel<100 puts player in stranded state', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setStranded(20);

    expect(await g.isStranded()).toBe(true);
    expect(await g.getStrandingFuel()).toBe(20);
  });

  test('setStranded with fuel=0 is stranded', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setStranded(0);

    expect(await g.isStranded()).toBe(true);
    expect(await g.getStrandingFuel()).toBe(0);
  });

  test('setStranded with fuel=100 is NOT stranded', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setStranded(100);

    expect(await g.isStranded()).toBe(false);
    expect(await g.getStrandingFuel()).toBe(100);
  });

  test('setStranded with fuel=150 is NOT stranded', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setStranded(150);

    expect(await g.isStranded()).toBe(false);
    expect(await g.getStrandingFuel()).toBe(150);
  });

  test('planet_b_arrived preset is stranded at 20 RF', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.planetBArrived(g);

    expect(await g.isStranded()).toBe(true);
    expect(await g.getStrandingFuel()).toBe(20);
  });

  test('planet_b_fueled preset is unstranded at 100+ RF', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.planetBFueled(g);

    expect(await g.isStranded()).toBe(false);
    expect(await g.getStrandingFuel()).toBeGreaterThanOrEqual(100);
  });

  test('applyStrandedOnPlanetB helper sets correct stranding state', async ({ page }) => {
    const g = await waitForGame(page);
    await applyStrandedOnPlanetB(g);

    expect(await g.isStranded()).toBe(true);
    expect(await g.getStrandingFuel()).toBe(20);
    expect(await g.getCredits()).toBe(2000);
    expect(await g.getRP()).toBe(200);
  });

  test('resetAll restores home-planet fuel state', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setStranded(5); // fully stranded
    await g.resetAll();

    expect(await g.isStranded()).toBe(false);
    expect(await g.getStrandingFuel()).toBe(100); // reset() sets to 100
  });

  test('stranded state survives advanceTime', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setStranded(20);

    // Advance time — without a fuel synthesizer running, stranding shouldn't change
    await g.advanceTime(10);

    // Should still be stranded (no fuel being produced in test context)
    expect(await g.isStranded()).toBe(true);
  });

  test('can transition from stranded to unstranded by setting fuel to 100', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setStranded(20);
    expect(await g.isStranded()).toBe(true);

    // Simulate accumulating enough fuel
    await g.setStranded(100);
    expect(await g.isStranded()).toBe(false);
  });

  test('multiple stranding states can be tested in sequence', async ({ page }) => {
    const g = await waitForGame(page);

    // Simulate fuel progression: 20 → 50 → 80 → 100
    for (const fuel of [20, 50, 80]) {
      await g.setStranded(fuel);
      expect(await g.isStranded()).toBe(true);
      expect(await g.getStrandingFuel()).toBe(fuel);
    }

    await g.setStranded(100);
    expect(await g.isStranded()).toBe(false);
  });
});
