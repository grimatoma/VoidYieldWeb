/**
 * Playwright helper — waits for the game to boot and exposes typed wrappers
 * around window.__voidyield__ for all E2E tests.
 *
 * Usage:
 *   import { waitForGame, waitForPlanet } from '../helpers/gameSetup';
 *   const g = await waitForGame(page);          // boots, stays on BootScene
 *   const g = await waitForPlanet(page, 'planet_a1');  // boots + enters scene
 */
import type { Page } from '@playwright/test';
import type { OreType, ColonyTier } from '../../../src/data/types';
import type { GamePreset } from '../../../src/debug/VoidYieldDebugAPI';

/** Milliseconds to wait for the game to fully initialise */
const GAME_READY_TIMEOUT = 20_000;

/**
 * Wait for the game canvas to appear AND the debug API to be mounted.
 * Game stays on the BootScene — use `waitForPlanet` if you need a specific scene.
 */
export async function waitForGame(page: Page) {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: GAME_READY_TIMEOUT });
  await page.waitForFunction(
    () => typeof (window as unknown as { __voidyield__?: unknown }).__voidyield__ !== 'undefined',
    { timeout: GAME_READY_TIMEOUT }
  );
  return buildHelper(page);
}

/**
 * Boot the game AND travel to the specified planet scene.
 * Waits until the scene is fully entered before returning.
 *
 * Does NOT fire a redundant travel if the boot sequence already navigated
 * to this planet — avoids a race condition where double-entry tears down
 * the scene's input handlers mid-test.
 */
export async function waitForPlanet(page: Page, planetId: string = 'planet_a1') {
  const g = await waitForGame(page);

  // The boot sequence fires scene:travel after an 800ms splash. By the time
  // __voidyield__ is mounted the travel event was emitted but the scene may
  // still be entering. Wait for the boot navigation to land (≤5 s) before
  // deciding whether we need to fire our own travel.
  await page.waitForFunction(
    () => {
      const id = window.__voidyield__.currentSceneId();
      return id !== null && id !== 'boot';
    },
    { timeout: 5000 }
  ).catch(() => { /* if boot nav doesn't complete just proceed */ });

  const currentScene = await page.evaluate(
    () => window.__voidyield__.currentSceneId()
  );

  if (currentScene !== planetId) {
    await page.evaluate((id) => {
      window.__voidyield__.services.EventBus.emit('scene:travel', id);
    }, planetId);
  }

  // Wait until the target scene is fully entered
  await page.waitForFunction(
    (id) => window.__voidyield__.currentSceneId() === id,
    planetId,
    { timeout: GAME_READY_TIMEOUT }
  );

  return g;
}

/** Re-use an already-loaded page (skips navigation). */
export function attachHelper(page: Page) {
  return buildHelper(page);
}

// ─── Typed wrapper ─────────────────────────────────────────────────────────

function buildHelper(page: Page) {
  const ev = <T>(fn: string, ...args: unknown[]) =>
    page.evaluate<T>(`window.__voidyield__.${fn}(${args.map(a => JSON.stringify(a)).join(',')})`) as Promise<T>;

  return {
    // ── Setters ────────────────────────────────────────────────
    async setCredits(n: number)                             { await ev('setCredits', n); },
    async setRP(n: number)                                  { await ev('setRP', n); },
    async setPlanetStock(planet: string, ore: OreType, qty: number) { await ev('setPlanetStock', planet, ore, qty); },
    async clearPlanetStock(planet: string)                  { await ev('clearPlanetStock', planet); },
    async setPopulation(tier: ColonyTier, count: number)    { await ev('setPopulation', tier, count); },
    async resetPopulation()                                 { await ev('resetPopulation'); },
    async unlockTech(nodeId: string)                        { await ev('unlockTech', nodeId); },
    async unlockAllTech()                                   { await ev('unlockAllTech'); },
    /** Set stranding state: fuel<100 → stranded, fuel>=100 → not stranded */
    async setStranded(fuel: number)                         { await ev('setStranded', fuel); },
    async loadPreset(name: GamePreset)                      { await ev('loadPreset', name); },
    async resetAll()                                        { await ev('resetAll'); },

    // ── Getters ────────────────────────────────────────────────
    async getCredits()                                      { return ev<number>('getCredits'); },
    async getRP()                                           { return ev<number>('getRP'); },
    async getPlanetStock(planet: string, ore: OreType)      { return ev<number>('getPlanetStock', planet, ore); },
    async getAllPlanetStock(planet: string)                  { return ev<Record<string, number>>('getAllPlanetStock', planet); },
    async getPopulation(tier: ColonyTier)                   { return ev<number>('getPopulation', tier); },
    async getTotalPopulation()                              { return ev<number>('getTotalPopulation'); },
    async getCurrentTier()                                  { return ev<ColonyTier>('getCurrentTier'); },
    async getTechUnlocks()                                  { return ev<string[]>('getTechUnlocks'); },
    async getCurrentPlanet()                                { return ev<string>('getCurrentPlanet'); },
    async isStranded()                                      { return ev<boolean>('isStranded'); },
    async getStrandingFuel()                                { return ev<number>('getStrandingFuel'); },
    async getProductivityMultiplier()                       { return ev<number>('getProductivityMultiplier'); },

    // ── Scene travel ───────────────────────────────────────────
    /** Travel to a planet and wait for the scene to be fully entered. */
    async travelTo(planetId: string): Promise<void> {
      await page.evaluate((id) => {
        window.__voidyield__.services.EventBus.emit('scene:travel', id);
      }, planetId);
      await page.waitForFunction(
        (id) => window.__voidyield__.currentSceneId() === id,
        planetId,
        { timeout: GAME_READY_TIMEOUT }
      );
    },

    // ── Simulation ─────────────────────────────────────────────
    /** Advance game time by `seconds` synchronously inside the browser. */
    async advanceTime(seconds: number)                      { await ev('advanceTime', seconds); },

    // ── Inline evaluate for advanced usage ─────────────────────
    /** Run arbitrary JS against window.__voidyield__ and return result. */
    eval<T = unknown>(script: string): Promise<T> {
      return page.evaluate<T>(`(function(g){ return ${script}; })(window.__voidyield__)`);
    },
  };
}

export type GameHelper = ReturnType<typeof buildHelper>;
