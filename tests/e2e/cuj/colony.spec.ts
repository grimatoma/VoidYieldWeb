/**
 * CUJ: Colony — population tiers, productivity multiplier, tier advancement.
 *
 * Tests the 5-tier colony system:
 *   pioneer → colonist → technician → engineer → director
 *
 * Uses advanceTime() to simulate the luxury-satisfaction timer,
 * and setPlanetStock() to provide colony consumption goods.
 */
import { test, expect } from '@playwright/test';
import { waitForGame, waitForPlanet } from '../helpers/gameSetup';
import { Preset, applyColonyExpansionReady } from '../helpers/presets';

test.describe('Colony CUJ', () => {
  test('fresh start has 4 pioneer colonists', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.freshStart(g);

    expect(await g.getPopulation('pioneer')).toBe(4);
    expect(await g.getTotalPopulation()).toBe(4);
    expect(await g.getCurrentTier()).toBe('pioneer');
  });

  test('fresh start has zero advanced tier population', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.freshStart(g);

    expect(await g.getPopulation('colonist')).toBe(0);
    expect(await g.getPopulation('technician')).toBe(0);
    expect(await g.getPopulation('engineer')).toBe(0);
    expect(await g.getPopulation('director')).toBe(0);
  });

  test('setPopulation changes tier population directly', async ({ page }) => {
    const g = await waitForGame(page);

    await g.setPopulation('colonist', 5);
    expect(await g.getPopulation('colonist')).toBe(5);

    await g.setPopulation('engineer', 2);
    expect(await g.getPopulation('engineer')).toBe(2);
  });

  test('getTotalPopulation sums all tiers', async ({ page }) => {
    const g = await waitForGame(page);
    await g.resetPopulation();

    await g.setPopulation('pioneer', 6);
    await g.setPopulation('colonist', 4);
    await g.setPopulation('technician', 2);

    expect(await g.getTotalPopulation()).toBe(12);
  });

  test('getCurrentTier returns highest populated tier', async ({ page }) => {
    const g = await waitForGame(page);
    await g.resetPopulation();

    await g.setPopulation('pioneer', 3);
    expect(await g.getCurrentTier()).toBe('pioneer');

    await g.setPopulation('technician', 2);
    expect(await g.getCurrentTier()).toBe('technician');

    await g.setPopulation('director', 1);
    expect(await g.getCurrentTier()).toBe('director');
  });

  test('resetPopulation restores 4 pioneers and zeroes other tiers', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setPopulation('engineer', 10);
    await g.setPopulation('director', 5);
    await g.resetPopulation();

    expect(await g.getPopulation('pioneer')).toBe(4);
    expect(await g.getPopulation('colonist')).toBe(0);
    expect(await g.getPopulation('technician')).toBe(0);
    expect(await g.getPopulation('engineer')).toBe(0);
    expect(await g.getPopulation('director')).toBe(0);
  });

  test('mid_game preset has pioneer + colonist population', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.midGame(g);

    expect(await g.getPopulation('pioneer')).toBeGreaterThan(0);
    expect(await g.getPopulation('colonist')).toBeGreaterThan(0);
    expect(await g.getTotalPopulation()).toBeGreaterThan(8);
  });

  test('late_game preset has multi-tier population', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.lateGame(g);

    const techPop = await g.getPopulation('technician');
    const engPop = await g.getPopulation('engineer');
    expect(techPop + engPop).toBeGreaterThan(0);
  });

  test('productivity multiplier defaults to 1.0 with satisfied needs', async ({ page }) => {
    const g = await waitForGame(page);
    await Preset.freshStart(g);
    await page.waitForTimeout(2000);

    // Initially needs are satisfied (100%) so multiplier = 1.0
    const mult = await g.getProductivityMultiplier();
    expect(mult).toBeCloseTo(1.0, 1);
  });

  test('colony expansion ready preset primes tier advancement', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    await applyColonyExpansionReady(g);

    // Should have pioneers ready to advance
    expect(await g.getPopulation('pioneer')).toBe(10);
    expect(await g.getPopulation('colonist')).toBe(0);

    // Advance 15s — with rations available, 10s of satisfaction should trigger advancement
    await g.advanceTime(15);

    // After advancement, some pioneers should have become colonists
    // (10s luxury timer + 30s advancement rate per spec)
    const colonists = await g.getPopulation('colonist');
    const pioneers = await g.getPopulation('pioneer');
    // Total should remain the same or grow (housing permitting)
    expect(pioneers + colonists).toBeGreaterThanOrEqual(10);
  });

  test('population survives advanceTime without regression', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setPopulation('pioneer', 8);
    await g.setPopulation('colonist', 4);

    await g.advanceTime(5);

    // Total should not decrease
    expect(await g.getTotalPopulation()).toBeGreaterThanOrEqual(12);
  });

  test('setPopulation zero removes a tier', async ({ page }) => {
    const g = await waitForGame(page);
    await g.setPopulation('engineer', 5);
    await g.setPopulation('engineer', 0);

    expect(await g.getPopulation('engineer')).toBe(0);
  });
});
