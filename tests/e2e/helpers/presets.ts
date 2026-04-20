/**
 * Named game-state presets for E2E tests.
 *
 * Each preset is a function that accepts a GameHelper and applies state
 * mutations to bring the game to a well-known progression point.
 * Tests should call these at the top of `test()` blocks.
 */
import type { GameHelper } from './gameSetup';

// ── Built-in preset wrappers ───────────────────────────────────────────────

export const Preset = {
  /** Brand-new game: 200 CR, 0 RP, 4 pioneer pop, no tech. */
  freshStart: (g: GameHelper) => g.loadPreset('fresh_start'),

  /** Mid-game: 5000 CR, 300 RP, 8 pioneer + 4 colonist, basic tech. */
  midGame: (g: GameHelper) => g.loadPreset('mid_game'),

  /** Late-game: 50000 CR, 2000 RP, mixed colony tiers. */
  lateGame: (g: GameHelper) => g.loadPreset('late_game'),

  /** Arrived at Planet B, stranded (fuel=20). */
  planetBArrived: (g: GameHelper) => g.loadPreset('planet_b_arrived'),

  /** At Planet B, fully fueled (fuel=100, not stranded). */
  planetBFueled: (g: GameHelper) => g.loadPreset('planet_b_fueled'),

  /** 2000 CR, 1500 RP — ready to unlock high-tier tech. */
  researchReady: (g: GameHelper) => g.loadPreset('research_ready'),

  /** 1000 CR, 100 RP — simulates having built a factory. */
  factoryReady: (g: GameHelper) => g.loadPreset('factory_ready'),
};

// ── Custom composite presets ───────────────────────────────────────────────

/**
 * Sets up a fully stocked planet_a1 depot for factory/processing tests.
 * Deposits: 500 vorax, 200 krysite, 100 gas, 50 water.
 */
export async function applyStockedDepot(g: GameHelper): Promise<void> {
  await g.setPlanetStock('planet_a1', 'vorax', 500);
  await g.setPlanetStock('planet_a1', 'krysite', 200);
  await g.setPlanetStock('planet_a1', 'gas', 100);
  await g.setPlanetStock('planet_a1', 'water', 50);
}

/**
 * Simulates a player who has unlocked the full extraction branch
 * and has enough resources to start refining.
 */
export async function applyExtractionComplete(g: GameHelper): Promise<void> {
  await g.loadPreset('mid_game');
  for (const nodeId of [
    'drill_bit_mk2', 'cargo_pockets_1', 'improved_drill',
    'drone_speed_1', 'drone_carry_1', 'ber_2',
  ]) {
    await g.unlockTech(nodeId);
  }
  await g.setPlanetStock('planet_a1', 'vorax', 1000);
  await g.setPlanetStock('planet_a1', 'krysite', 500);
}

/**
 * Unlocks logistics branch and sets up a multi-planet economy.
 */
export async function applyLogisticsReady(g: GameHelper): Promise<void> {
  await g.loadPreset('mid_game');
  await g.unlockTech('logistics_1');
  await g.unlockTech('fleet_cap_2');
  await g.unlockTech('auto_dispatch');
  await g.setPlanetStock('planet_a1', 'vorax', 800);
  await g.setPlanetStock('planet_a1', 'steel_bars', 200);
}

/**
 * Colony expansion preset: enough luxury goods to trigger tier advancement.
 * pioneer→colonist needs rations@100% for 10 seconds.
 */
export async function applyColonyExpansionReady(g: GameHelper): Promise<void> {
  await g.setCredits(3000);
  await g.setRP(100);
  await g.setPopulation('pioneer', 10);
  await g.setPopulation('colonist', 0);
  // Stock the depot with rations so consumption manager satisfaction goes to 100%
  await g.setPlanetStock('planet_a1', 'processed_rations', 200);
  await g.setPlanetStock('planet_a1', 'gas', 50);
  await g.setPlanetStock('planet_a1', 'water', 50);
}

/**
 * Stranding scenario: at Planet B with 20 RF (stranded), needs 80 more to launch.
 */
export async function applyStrandedOnPlanetB(g: GameHelper): Promise<void> {
  await g.setCredits(2000);
  await g.setRP(200);
  await g.setStranded(20);
}

/**
 * Full tech tree unlock — for testing effects and interactions without gate progression.
 */
export async function applyFullTechTree(g: GameHelper): Promise<void> {
  await g.setCredits(999999);
  await g.setRP(999999);
  await g.unlockAllTech();
}
