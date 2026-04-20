import { test, expect } from '@playwright/test';

test.describe('M0 boot smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage between runs
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('game loads and renders the dark background', async ({ page }) => {
    await page.goto('/');
    // Body background should be dark navy (#0D1B3E)
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    expect(bgColor).toBe('rgb(13, 27, 62)');
  });

  test('canvas is present in #game-container', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game-container canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });

  test('save round-trip via localStorage', async ({ page }) => {
    await page.goto('/');
    // Wait for PixiJS to initialise
    await page.locator('#game-container canvas').waitFor({ timeout: 5000 });

    // Inject a save and reload — game should pick it up
    await page.evaluate(() => {
      const save = {
        format_version: 1,
        last_save_timestamp: Math.floor(Date.now() / 1000),
        sector_number: 2,
        current_planet: 'a1',
        phase_flags: { a1: 0, planet_b: 0, planet_c: 0, a3: 0 },
        credits: 1234,
        research_points: 0,
        tech_tree_unlocks: [],
        sector_bonuses: [],
        crafting_schematics_known: [],
        stockpile_quantities: {},
        deposit_map: {},
        survey_waypoints: {},
        harvester_states: {},
        drone_task_queues: {},
        factory_states: {},
        population_data: {},
        need_satisfaction_state: {},
        active_trade_routes: [],
        ship_fleet: [],
      };
      localStorage.setItem('voidyield_savegame', JSON.stringify(save));
    });

    await page.reload();
    await page.locator('#game-container canvas').waitFor({ timeout: 5000 });

    const credits = await page.evaluate(() => {
      const raw = localStorage.getItem('voidyield_savegame');
      if (!raw) return null;
      return (JSON.parse(raw) as { credits: number }).credits;
    });
    expect(credits).toBe(1234);
  });

  test('no console errors on boot', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.locator('#game-container canvas').waitFor({ timeout: 5000 });
    expect(errors).toHaveLength(0);
  });
});
