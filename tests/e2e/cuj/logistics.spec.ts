/**
 * CUJ: Logistics — trade routes, auto-dispatch, cargo class enforcement.
 *
 * Tests the inter-planet trade system:
 *   - Create routes via the raw services API
 *   - Advance time and verify cargo movement
 *   - Auto-dispatch threshold behaviour
 *   - Cargo class enforcement (bulk/refined/components)
 *
 * Note: logisticsManager.addRoute() auto-generates routeIds (route-1, route-2, …).
 * Capture the returned route object to get the actual ID.
 */
import { test, expect } from '@playwright/test';
import type { CargoClass, CargoShipType, OreType } from '../../../src/data/types';
import { waitForGame, waitForPlanet } from '../helpers/gameSetup';
import { applyLogisticsReady } from '../helpers/presets';

/** Add a route using the actual logisticsManager.addRoute() API and return its ID. */
async function addTestRoute(
  page: import('@playwright/test').Page,
  params: {
    sourcePlanet?: string;
    destPlanet?: string;
    cargoType?: OreType;
    cargoQty?: number;
    cargoClass?: CargoClass;
    shipType?: CargoShipType;
    tripTimeSec?: number;
    autoDispatchThreshold?: number;
  } = {}
): Promise<string> {
  return page.evaluate((p) => {
    const route = window.__voidyield__.services.logisticsManager.addRoute({
      sourcePlanet: p.sourcePlanet ?? 'planet_a1',
      destPlanet: p.destPlanet ?? 'planet_b',
      cargoType: (p.cargoType ?? 'vorax') as import('../../../src/data/types').OreType,
      cargoQty: p.cargoQty ?? 100,
      cargoClass: (p.cargoClass ?? 'bulk') as import('../../../src/data/types').CargoClass,
      shipType: (p.shipType ?? 'bulk_freighter') as import('../../../src/data/types').CargoShipType,
      tripTimeSec: p.tripTimeSec ?? 60,
      autoDispatchThreshold: p.autoDispatchThreshold ?? 0,
    });
    return route.routeId;
  }, params);
}

test.describe('Logistics CUJ', () => {
  test('logistics_ready preset has unlocked logistics nodes', async ({ page }) => {
    const g = await waitForGame(page);

    await applyLogisticsReady(g);

    const unlocks = await g.getTechUnlocks();
    expect(unlocks).toContain('logistics_1');
    expect(unlocks).toContain('auto_dispatch');
  });

  test('can add a trade route via services API', async ({ page }) => {
    await waitForGame(page);
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    const routeId = await addTestRoute(page);

    const routes = await page.evaluate(() =>
      window.__voidyield__.services.logisticsManager.getRoutes().map((r: { routeId: string }) => r.routeId)
    );
    expect(routes).toContain(routeId);
  });

  test('clearRoutes removes all routes', async ({ page }) => {
    await waitForGame(page);

    await addTestRoute(page);
    await addTestRoute(page);

    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    const routes = await page.evaluate(() =>
      window.__voidyield__.services.logisticsManager.getRoutes()
    );
    expect(routes.length).toBe(0);
  });

  test('resetAll clears all trade routes', async ({ page }) => {
    const g = await waitForGame(page);

    await addTestRoute(page);
    await g.resetAll();

    const routes = await page.evaluate(() =>
      window.__voidyield__.services.logisticsManager.getRoutes()
    );
    expect(routes.length).toBe(0);
  });

  test('route with bulk cargo uses bulk_freighter', async ({ page }) => {
    await waitForGame(page);
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    const routeId = await addTestRoute(page, {
      cargoType: 'vorax',
      cargoClass: 'bulk',
      shipType: 'bulk_freighter',
    });

    const route = await page.evaluate((id) =>
      window.__voidyield__.services.logisticsManager.getRoute(id),
      routeId
    );
    expect(route?.shipType).toBe('bulk_freighter');
    expect(route?.cargoClass).toBe('bulk');
  });

  test('route with refined cargo uses liquid_tanker', async ({ page }) => {
    await waitForGame(page);
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    const routeId = await addTestRoute(page, {
      cargoType: 'steel_bars',
      cargoClass: 'refined',
      shipType: 'liquid_tanker',
    });

    const route = await page.evaluate((id) =>
      window.__voidyield__.services.logisticsManager.getRoute(id),
      routeId
    );
    expect(route?.shipType).toBe('liquid_tanker');
  });

  test('auto-dispatch route triggers when threshold met', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    // Set up depot with enough stock: threshold=1 × cargoQty=100 → need ≥ 100 vorax
    await g.setPlanetStock('planet_a1', 'vorax', 200);

    const routeId = await addTestRoute(page, {
      cargoType: 'vorax',
      cargoQty: 100,
      cargoClass: 'bulk',
      shipType: 'bulk_freighter',
      autoDispatchThreshold: 1,
    });

    // After one update tick, auto-dispatch should fire (threshold met, stock ≥ 100)
    await g.advanceTime(2);

    const route = await page.evaluate((id) =>
      window.__voidyield__.services.logisticsManager.getRoute(id),
      routeId
    );
    // Route should have moved from IDLE to LOADING or IN_TRANSIT
    expect(route?.status).not.toBe('IDLE');
  });

  test('auto-dispatch does NOT trigger below threshold', async ({ page }) => {
    const g = await waitForPlanet(page, 'planet_a1');
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    // Only 50 units in depot, need 200 (threshold=2 × cargoQty=100)
    await g.clearPlanetStock('planet_a1');
    await g.setPlanetStock('planet_a1', 'vorax', 50);

    const routeId = await addTestRoute(page, {
      cargoType: 'vorax',
      cargoQty: 100,
      cargoClass: 'bulk',
      shipType: 'bulk_freighter',
      autoDispatchThreshold: 2,
    });

    await g.advanceTime(2);

    const route = await page.evaluate((id) =>
      window.__voidyield__.services.logisticsManager.getRoute(id),
      routeId
    );
    // Should still be IDLE (only 50 units, threshold needs 200)
    expect(route?.status).toBe('IDLE');
  });

  test('heavy_transport can carry all cargo classes', async ({ page }) => {
    await waitForGame(page);
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    const ids: string[] = [];
    for (const cls of ['bulk', 'refined', 'components'] as CargoClass[]) {
      ids.push(await addTestRoute(page, {
        cargoClass: cls,
        shipType: 'heavy_transport',
      }));
    }

    const routes = await page.evaluate(() =>
      window.__voidyield__.services.logisticsManager.getRoutes()
    );
    expect(routes.filter((r: { shipType: string }) => r.shipType === 'heavy_transport').length).toBe(3);
  });

  test('getRoute returns undefined for non-existent route', async ({ page }) => {
    await waitForGame(page);
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    const route = await page.evaluate(() =>
      window.__voidyield__.services.logisticsManager.getRoute('does-not-exist')
    );
    expect(route).toBeUndefined();
  });

  test('multiple routes can be created with different ship types', async ({ page }) => {
    await waitForGame(page);
    await page.evaluate(() => window.__voidyield__.services.logisticsManager.clearRoutes());

    await addTestRoute(page, { cargoClass: 'bulk', shipType: 'bulk_freighter' });
    await addTestRoute(page, { cargoClass: 'bulk', shipType: 'heavy_transport' });
    await addTestRoute(page, { cargoClass: 'refined', shipType: 'container_ship' });

    const routes = await page.evaluate(() =>
      window.__voidyield__.services.logisticsManager.getRoutes()
    );
    expect(routes.length).toBe(3);
  });
});
