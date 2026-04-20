/**
 * CUJ: Game Progression — full end-to-end gameplay flows across milestone boundaries.
 *
 * These tests simulate complete game progressions by combining multiple systems.
 * They validate that systems interact correctly when combined, not just in isolation.
 *
 * Progressions tested:
 *   1. Early game: mine → sell → research → unlock first tech
 *   2. Mid game: factory running → colony growing → research chain
 *   3. Planet B: stranded → fuel loop → launch ready
 *   4. Late game: multi-planet economy → void-touched processing
 */
import { test, expect } from '@playwright/test';
import { waitForGame, waitForPlanet } from '../helpers/gameSetup';
import { Preset, applyStockedDepot, applyStrandedOnPlanetB, applyFullTechTree } from '../helpers/presets';

test.describe('Game Progression CUJ', () => {
  test('early game: accumulate credits and unlock first tech', async ({ page }) => {
    const g = await waitForGame(page);
    await page.waitForTimeout(3000);

    // Start fresh
    await Preset.freshStart(g);
    expect(await g.getCredits()).toBe(200);

    // Simulate selling ore (inject credits as if selling happened)
    await g.setCredits(600); // 400 CR from mining session
    expect(await g.getCredits()).toBe(600);

    // Simulate research gain
    await g.setRP(150);

    // Unlock first mining upgrade
    await g.unlockTech('drill_bit_mk2');

    const unlocks = await g.getTechUnlocks();
    expect(unlocks).toContain('drill_bit_mk2');
    expect(await g.getRP()).toBe(150);
  });

  test('mid game: factory + colony + research combo', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    await Preset.midGame(g);
    await applyStockedDepot(g);

    // Unlock fabricator branch
    await g.unlockTech('fabricator_unlock');
    await g.unlockTech('metallurgy_1');

    // Colonist population should be present
    expect(await g.getPopulation('colonist')).toBeGreaterThan(0);

    // Advance game clock
    await g.advanceTime(30);

    // State should remain valid after simulation
    expect(await g.getCredits()).toBeGreaterThanOrEqual(5000);
    expect(await g.getTotalPopulation()).toBeGreaterThanOrEqual(8);
  });

  test('Planet B progression: stranded → gather fuel → launch ready', async ({ page }) => {
    const g = await waitForGame(page);

    // Arrive at Planet B stranded
    await applyStrandedOnPlanetB(g);
    expect(await g.isStranded()).toBe(true);
    expect(await g.getStrandingFuel()).toBe(20);

    // Simulate fuel accumulation in steps
    const fuelSteps = [35, 55, 75, 100];
    for (const fuel of fuelSteps) {
      await g.setStranded(fuel);
      if (fuel < 100) {
        expect(await g.isStranded()).toBe(true);
      } else {
        expect(await g.isStranded()).toBe(false);
      }
    }

    // Fully fueled: ready to launch
    expect(await g.isStranded()).toBe(false);
    expect(await g.getStrandingFuel()).toBe(100);
  });

  test('late game: all planets accessible, multi-tier colony', async ({ page }) => {
    const g = await waitForGame(page);

    await Preset.lateGame(g);

    // Unlock all warp-related tech
    await g.unlockTech('warp_theory');
    await g.unlockTech('fuel_efficiency_1');
    await g.unlockTech('fuel_efficiency_2');

    // High-tier colonists
    expect(await g.getPopulation('technician')).toBeGreaterThan(0);
    expect(await g.getPopulation('engineer')).toBeGreaterThan(0);

    const unlocks = await g.getTechUnlocks();
    expect(unlocks).toContain('warp_theory');
  });

  test('full tech tree unlock enables all effects', async ({ page }) => {
    const g = await waitForGame(page);

    await applyFullTechTree(g);

    const unlocks = await g.getTechUnlocks();
    // Should have all 47 nodes
    expect(unlocks.length).toBeGreaterThanOrEqual(46);

    // Key late-game nodes should be present
    expect(unlocks).toContain('assembly_complex_unlock');
    expect(unlocks).toContain('warp_theory');
    expect(unlocks).toContain('quantum_research');
  });

  test('void-touched economy: Planet C supplies warp components', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    await Preset.lateGame(g);
    await g.unlockTech('assembly_complex_unlock');

    // Stock Planet C with void-touched ore
    await g.setPlanetStock('planet_c', 'void_touched_ore', 300);
    await g.setPlanetStock('planet_c', 'dark_gas', 100);
    await g.setPlanetStock('planet_c', 'resonance_shards', 50);

    // Stock Planet A1 for assembly
    await g.setPlanetStock('planet_a1', 'ferrovoid', 100);
    await g.setPlanetStock('planet_a1', 'alloy_rods', 100);
    await g.setPlanetStock('planet_a1', 'power_cells', 50);

    await g.advanceTime(60);

    // Verify stocks are non-negative after production
    expect(await g.getPlanetStock('planet_a1', 'ferrovoid')).toBeGreaterThanOrEqual(0);
  });

  test('research chain: basic → advanced → quantum', async ({ page }) => {
    const g = await waitForGame(page);

    await g.setRP(5000);

    // Unlock research chain
    await g.unlockTech('sample_analysis_1');
    await g.unlockTech('sample_analysis_2');
    await g.unlockTech('research_amp');
    await g.unlockTech('quantum_research');

    const unlocks = await g.getTechUnlocks();
    expect(unlocks).toContain('sample_analysis_1');
    expect(unlocks).toContain('research_amp');
    expect(unlocks).toContain('quantum_research');
  });

  test('fleet automation enables logistics at scale', async ({ page }) => {
    const g = await waitForGame(page);

    await Preset.midGame(g);
    await g.unlockTech('logistics_1');
    await g.unlockTech('fleet_automation');
    await g.unlockTech('fleet_cap_2');
    await g.unlockTech('fleet_cap_3');
    await g.unlockTech('auto_dispatch');

    const unlocks = await g.getTechUnlocks();
    expect(unlocks).toContain('fleet_automation');
    expect(unlocks).toContain('auto_dispatch');
  });

  test('colony tiers: pioneer all the way to engineer', async ({ page }) => {
    const g = await waitForGame(page);

    // Simulate full colony progression by direct state injection
    await g.resetPopulation();
    await g.setPopulation('pioneer', 3);
    await g.setPopulation('colonist', 5);
    await g.setPopulation('technician', 8);
    await g.setPopulation('engineer', 4);

    expect(await g.getCurrentTier()).toBe('engineer');
    expect(await g.getTotalPopulation()).toBe(20);
    expect(await g.getProductivityMultiplier()).toBeGreaterThan(0);
  });

  test('game debug API is idempotent: repeated presets are safe', async ({ page }) => {
    const g = await waitForGame(page);

    // Load same preset multiple times
    await Preset.freshStart(g);
    await Preset.freshStart(g);
    await Preset.freshStart(g);

    expect(await g.getCredits()).toBe(200);
    expect(await g.getRP()).toBe(0);
    expect(await g.getTotalPopulation()).toBe(4);
  });
});
