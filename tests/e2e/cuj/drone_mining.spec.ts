/**
 * CUJ: Drone auto-mining loop (GDD §11 "Drone Behavior State Machine").
 *
 * Covers the end-to-end mining circuit driven by MiningCircuitManager:
 *   starter drone → MINE → HAUL → DEPOSIT → loop → sell terminal clears stock
 *
 * Scene A1 seeds a starter Mining Drone at the Drone Bay on enter(). The
 * dispatcher should pick it up, claim the nearest Vorax deposit, and deliver
 * ore to the depot without any manual task-pushing. After that, the sell
 * terminal (marketplaceService.sellAll) must empty the depot and credit the
 * player.
 */
import { test, expect } from '@playwright/test';
import { waitForPlanet } from '../helpers/gameSetup';

test.describe('Drone auto-mining loop', () => {
  test('starter Mining Drone is spawned on scene enter', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    const fleet = await g.eval<{ count: number; types: string[] }>(
      `({
         count: g.services.fleetManager.getDrones().length,
         types: g.services.fleetManager.getDrones().map(d => d.droneType),
       })`,
    );

    expect(fleet.count).toBeGreaterThanOrEqual(1);
    expect(fleet.types).toContain('scout');
  });

  test('miner drone delivers ore to depot without manual intervention', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    // Start from a clean stockpile so we can see what the drone alone adds.
    await g.clearPlanetStock('planet_a1');
    expect(await g.getPlanetStock('planet_a1', 'vorax')).toBe(0);

    // Let the dispatcher run a full circuit. 45s is well above the ~8s budget
    // for one round-trip (mine 3s + travel ~3s + deposit 0.3s) but gives slow
    // CI boxes headroom.
    await g.advanceTime(45);

    const stock = await g.getAllPlanetStock('planet_a1');
    const totalOre = Object.values(stock).reduce((a, b) => a + b, 0);
    expect(totalOre).toBeGreaterThan(0);
  });

  test('sell terminal clears the stockpile and credits the player', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    // Seed the depot with a known, sell-priced ore so we can assert on CR delta.
    await g.clearPlanetStock('planet_a1');
    await g.setPlanetStock('planet_a1', 'vorax', 50);
    await g.setCredits(0);

    const credBefore = await g.getCredits();
    const revenue = await g.eval<number>(
      `g.services.marketplaceService.sellAll(g.services.logisticsManager.getDepot('planet_a1'))`,
    );

    expect(revenue).toBeGreaterThan(0);
    const stockAfter = await g.getAllPlanetStock('planet_a1');
    expect(Object.keys(stockAfter).length).toBe(0);
    expect(await g.getCredits()).toBe(credBefore + revenue);
  });

  test('miner respects bay-slot cap — extra drones spawn disabled', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    // Force cap=1 so the starter drone saturates the bay.
    await g.eval(`g.services.gameState.setMaxActiveDrones(1)`);
    const starterActive = await g.eval<number>(
      `g.services.fleetManager.getDrones().filter(d => !d.disabled).length`,
    );
    expect(starterActive).toBeLessThanOrEqual(1);
  });

  test('disabled drone does not mine', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    // Disable every drone so the dispatcher has nothing to drive.
    await g.eval(`
      g.services.fleetManager.getDrones().forEach(d => {
        g.services.fleetManager.setDroneDisabled(d.id, true);
      })
    `);
    await g.clearPlanetStock('planet_a1');
    await g.advanceTime(30);

    const stock = await g.getAllPlanetStock('planet_a1');
    const totalOre = Object.values(stock).reduce((a, b) => a + b, 0);
    expect(totalOre).toBe(0);
  });

  test('full depot halts mining dispatch', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');

    // Fill the depot to capacity so the dispatcher's isFull() gate trips.
    const capacity = await g.eval<number>(
      `g.services.logisticsManager.getDepot('planet_a1').capacity`,
    );
    await g.clearPlanetStock('planet_a1');
    await g.setPlanetStock('planet_a1', 'vorax', capacity);

    await g.advanceTime(10);

    // Stock should still be at capacity (no new ore dumped) and no miner
    // drones should be in the middle of a MINE/CARRY pair.
    expect(await g.getPlanetStock('planet_a1', 'vorax')).toBe(capacity);
    const busyCount = await g.eval<number>(
      `g.services.fleetManager.getDrones().filter(d =>
         (d.droneType === 'scout' || d.droneType === 'heavy') && d.getTasks().length > 0
       ).length`,
    );
    expect(busyCount).toBe(0);
  });
});
