/**
 * VoidYield Debug API — mounted as window.__voidyield__ in dev/test builds.
 * Provides state manipulation for Playwright E2E tests.
 * Never included in production bundles (guarded by import.meta.env.DEV).
 */
import type { OreType, ColonyTier } from '@data/types';
import { gameState } from '@services/GameState';
import { surveyService } from '@services/SurveyService';
import { inventory } from '@services/Inventory';
import { consumptionManager } from '@services/ConsumptionManager';
import { logisticsManager } from '@services/LogisticsManager';
import { techTree } from '@services/TechTree';
import { strandingManager } from '@services/StrandingManager';
import { saveManager } from '@services/SaveManager';
import { settingsManager } from '@services/SettingsManager';
import { EventBus } from '@services/EventBus';
import { tutorialManager } from '@services/TutorialManager';
import { fleetManager } from '@services/FleetManager';
import { miningCircuitManager } from '@services/MiningCircuitManager';
import { depositMap } from '@services/DepositMap';
import { marketplaceService } from '@services/MarketplaceService';
import { getActiveStorage } from '@scenes/AsteroidOutpostScene';

export interface VoidYieldDebugAPI {
  // ── State setters ─────────────────────────────────────────────
  setCredits(n: number): void;
  setRP(n: number): void;
  setPlanetStock(planetId: string, ore: OreType, qty: number): void;
  clearPlanetStock(planetId: string): void;
  setPopulation(tier: ColonyTier, count: number): void;
  resetPopulation(): void;
  unlockTech(nodeId: string): void;
  unlockAllTech(): void;
  setStranded(fuel: number): void;

  // ── State getters ─────────────────────────────────────────────
  getCredits(): number;
  getRP(): number;
  getPlanetStock(planetId: string, ore: OreType): number;
  getAllPlanetStock(planetId: string): Record<string, number>;
  getPopulation(tier: ColonyTier): number;
  getTotalPopulation(): number;
  getCurrentTier(): ColonyTier;
  getTechUnlocks(): string[];
  getCurrentPlanet(): string;
  isStranded(): boolean;
  getStrandingFuel(): number;
  getProductivityMultiplier(): number;

  // ── Simulation helpers ────────────────────────────────────────
  /** Advance the scene manager update loop by `seconds` in one shot */
  advanceTime(seconds: number): void;
  /** Reset all services to initial state */
  resetAll(): void;
  /** Suppress the tutorial overlay immediately (for tests) */
  skipTutorial(): void;
  /** Returns the current scene ID (e.g. 'planet_a1', 'boot') or null */
  currentSceneId(): string | null;

  // ── Preset loader ─────────────────────────────────────────────
  loadPreset(name: GamePreset): void;

  // ── Outpost helpers ───────────────────────────────────────────
  outpost: {
    setInventory(ore: OreType, qty: number): void;
    getInventory(ore: OreType): number;
    resetOutpost(): void;
    forceBuild(buildingType: 'marketplace' | 'drone_depot'): void;
    seedBars(ironBars: number, copperBars: number): void;
    getStorageStock(ore: OreType): number;
  };

  // ── Raw service access for advanced tests ────────────────────
  services: {
    gameState: typeof gameState;
    inventory: typeof inventory;
    consumptionManager: typeof consumptionManager;
    logisticsManager: typeof logisticsManager;
    techTree: typeof techTree;
    strandingManager: typeof strandingManager;
    saveManager: typeof saveManager;
    settingsManager: typeof settingsManager;
    EventBus: typeof EventBus;
    surveyService: typeof surveyService;
    fleetManager: typeof fleetManager;
    miningCircuitManager: typeof miningCircuitManager;
    depositMap: typeof depositMap;
    marketplaceService: typeof marketplaceService;
  };
}

export type GamePreset =
  | 'fresh_start'
  | 'mid_game'
  | 'late_game'
  | 'planet_b_arrived'
  | 'planet_b_fueled'
  | 'research_ready'
  | 'factory_ready';

// The SceneManager update function — injected by main.ts at boot
let _sceneUpdateFn: ((dt: number) => void) | null = null;
export function injectSceneUpdater(fn: (dt: number) => void): void {
  _sceneUpdateFn = fn;
}

// Current scene ID getter — injected by main.ts at boot
let _sceneIdGetter: (() => string | null) | null = null;
export function injectSceneIdGetter(fn: () => string | null): void {
  _sceneIdGetter = fn;
}

function createDebugAPI(): VoidYieldDebugAPI {
  return {
    // ── Setters ───────────────────────────────────────────────
    setCredits(n) { gameState.setCredits(n); },
    setRP(n) { gameState.setResearchPoints(n); },

    setPlanetStock(planetId, ore, qty) {
      const depot = logisticsManager.getDepot(planetId);
      if (!depot) {
        console.warn(`[voidyield] No depot registered for planet "${planetId}"`);
        return;
      }
      depot.setStock(ore, qty);
    },

    clearPlanetStock(planetId) {
      const depot = logisticsManager.getDepot(planetId);
      if (!depot) return;
      depot.clearStock();
    },

    setPopulation(tier, count) { consumptionManager.setTierPopulation(tier, count); },
    resetPopulation() { consumptionManager.resetPopulation(); },

    unlockTech(nodeId) {
      // Bypass prereqs and costs — force-add directly to game state
      gameState.addUnlock(nodeId);
    },
    unlockAllTech() {
      // Force-unlock every node, bypassing prerequisites and costs
      for (const node of techTree.getAllNodes()) {
        gameState.addUnlock(node.nodeId);
      }
    },

    setStranded(fuel) {
      // Directly set stranding state without going through arriveAtPlanetB logic
      const sm = strandingManager as unknown as { _rocketFuel: number; _isStranded: boolean };
      sm._rocketFuel = fuel;
      sm._isStranded = fuel < 100;
    },

    // ── Getters ───────────────────────────────────────────────
    getCredits() { return gameState.credits; },
    getRP() { return gameState.researchPoints; },

    getPlanetStock(planetId, ore) {
      const depot = logisticsManager.getDepot(planetId);
      if (!depot) return 0;
      return depot.getStockpile().get(ore) ?? 0;
    },

    getAllPlanetStock(planetId) {
      const depot = logisticsManager.getDepot(planetId);
      if (!depot) return {};
      const result: Record<string, number> = {};
      depot.getStockpile().forEach((qty, ore) => { result[ore] = qty; });
      return result;
    },

    getPopulation(tier) { return consumptionManager.getTierPopulation(tier); },
    getTotalPopulation() { return consumptionManager.getTotalPopulation(); },
    getCurrentTier() { return consumptionManager.getCurrentTier(); },
    getTechUnlocks() { return [...gameState.techTreeUnlocks]; },
    getCurrentPlanet() { return gameState.currentPlanet; },
    isStranded() { return strandingManager.isStranded; },
    getStrandingFuel() { return strandingManager.rocketFuel; },
    getProductivityMultiplier() { return consumptionManager.productivityMultiplier; },

    // ── Simulation ────────────────────────────────────────────
    advanceTime(seconds) {
      if (!_sceneUpdateFn) {
        console.warn('[voidyield] advanceTime: scene updater not injected yet');
        return;
      }
      // Advance in 1-second chunks to avoid huge delta spikes
      const CHUNK = 1;
      let remaining = seconds;
      while (remaining > 0) {
        const dt = Math.min(CHUNK, remaining);
        _sceneUpdateFn(dt);
        remaining -= dt;
      }
    },

    resetAll() {
      gameState.setCredits(200);
      gameState.setResearchPoints(0);
      consumptionManager.resetPopulation();
      logisticsManager.clearRoutes();
      strandingManager.reset();
      EventBus.emit('credits:changed', 200);
      EventBus.emit('rp:changed', 0);
    },

    skipTutorial() {
      tutorialManager.skip();
      EventBus.emit('tutorial:completed');
    },

    currentSceneId() { return _sceneIdGetter ? _sceneIdGetter() : null; },

    // ── Presets ───────────────────────────────────────────────
    loadPreset(name) {
      switch (name) {
        case 'fresh_start':
          this.resetAll();
          break;

        case 'mid_game':
          gameState.setCredits(5000);
          gameState.setResearchPoints(300);
          consumptionManager.setTierPopulation('pioneer', 8);
          consumptionManager.setTierPopulation('colonist', 4);
          // Unlock first tier of each branch
          ['drill_bit_mk2', 'cargo_pockets_1', 'energy_efficiency_1', 'fleet_cap_2'].forEach(id => {
            gameState.addUnlock(id);
          });
          break;

        case 'late_game':
          gameState.setCredits(50000);
          gameState.setResearchPoints(2000);
          consumptionManager.setTierPopulation('pioneer', 5);
          consumptionManager.setTierPopulation('colonist', 10);
          consumptionManager.setTierPopulation('technician', 8);
          consumptionManager.setTierPopulation('engineer', 3);
          break;

        case 'planet_b_arrived':
          gameState.setCredits(3000);
          gameState.setResearchPoints(500);
          strandingManager.arriveAtPlanetB();
          break;

        case 'planet_b_fueled':
          gameState.setCredits(3000);
          gameState.setResearchPoints(500);
          strandingManager.arriveAtPlanetB();
          strandingManager.addFuel(100);
          break;

        case 'research_ready':
          gameState.setCredits(2000);
          gameState.setResearchPoints(1500);
          break;

        case 'factory_ready':
          gameState.setCredits(1000);
          gameState.setResearchPoints(100);
          // Stockpile will need to be set per-planet in the test
          break;
      }
    },

    // ── Outpost helpers ───────────────────────────────────────
    outpost: {
      setInventory(ore, qty) { inventory.restore([{ oreType: ore, quantity: qty, attributes: {} }]); },
      getInventory(ore) { return inventory.getByType(ore); },
      resetOutpost() {
        inventory.drain();
        gameState.setCredits(200);
        EventBus.emit('outpost:inventory-changed');
      },
      forceBuild(buildingType) {
        EventBus.emit('outpost:force-build' as any, buildingType);
      },
      seedBars(ironBars, copperBars) {
        EventBus.emit('outpost:seed-bars' as any, { iron_bar: ironBars, copper_bar: copperBars });
      },
      getStorageStock(ore) {
        const storage = getActiveStorage();
        return storage?.getBarCount(ore) ?? 0;
      },
    },

    // ── Raw service access ────────────────────────────────────
    services: {
      gameState,
      inventory,
      consumptionManager,
      logisticsManager,
      techTree,
      strandingManager,
      saveManager,
      settingsManager,
      EventBus,
      surveyService,
      fleetManager,
      miningCircuitManager,
      depositMap,
      marketplaceService,
    },
  };
}

export const voidyieldDebugAPI = createDebugAPI();
