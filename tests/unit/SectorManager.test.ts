import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock EventBus to avoid side effects
vi.mock('@services/EventBus', () => ({
  EventBus: { on: vi.fn(), emit: vi.fn() }
}));

// Mock all service dependencies
vi.mock('@services/GameState', () => ({
  gameState: {
    credits: 200, researchPoints: 0, voidCoresProduced: 0,
    sectorNumber: 1, a2Visited: false, planetCVisited: false,
    techTreeUnlocks: [],
    setCredits: vi.fn(), setResearchPoints: vi.fn(), addCredits: vi.fn(),
    setSectorNumber: vi.fn(), hasUnlock: vi.fn(() => false),
  }
}));
vi.mock('@services/ConsumptionManager', () => ({
  consumptionManager: { resetPopulation: vi.fn() }
}));
vi.mock('@services/LogisticsManager', () => ({
  logisticsManager: { clearRoutes: vi.fn() }
}));
vi.mock('@services/StrandingManager', () => ({
  strandingManager: { isStranded: false, rocketFuel: 100, reset: vi.fn() }
}));

import { SectorManager } from '@services/SectorManager';
import type { SectorBonus } from '@services/SectorManager';

describe('SectorManager', () => {
  let mgr: SectorManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mgr = new SectorManager();
  });

  it('starts with no bonuses', () => {
    expect(mgr.sectorBonuses.length).toBe(0);
  });

  it('warpGateBuilt starts false', () => {
    expect(mgr.warpGateBuilt).toBe(false);
  });

  it('galacticHubBuilt starts false', () => {
    expect(mgr.galacticHubBuilt).toBe(false);
  });

  it('isSectorComplete starts false', () => {
    expect(mgr.isSectorComplete).toBe(false);
  });

  it('hasSectorBonus returns false for unowned bonus', () => {
    expect(mgr.hasSectorBonus('veteran_miner')).toBe(false);
  });

  it('getBonusMultiplier returns 0 for unowned bonus', () => {
    expect(mgr.getBonusMultiplier('trade_connections')).toBe(0);
  });

  it('serialize produces correct shape', () => {
    const s = mgr.serialize();
    expect(s).toHaveProperty('sectorBonuses');
    expect(s).toHaveProperty('warpGateBuilt');
    expect(s).toHaveProperty('galacticHubBuilt');
    expect(Array.isArray(s.sectorBonuses)).toBe(true);
  });

  it('deserialize restores bonuses', () => {
    mgr.deserialize({
      sectorBonuses: ['veteran_miner', 'trade_connections'] as SectorBonus[],
      warpGateBuilt: true,
      galacticHubBuilt: false,
    });
    expect(mgr.hasSectorBonus('veteran_miner')).toBe(true);
    expect(mgr.hasSectorBonus('trade_connections')).toBe(true);
    expect(mgr.warpGateBuilt).toBe(true);
    expect(mgr.galacticHubBuilt).toBe(false);
  });

  it('getBonusMultiplier returns correct value when bonus owned', () => {
    mgr.deserialize({
      sectorBonuses: ['trade_connections'] as SectorBonus[],
      warpGateBuilt: false,
      galacticHubBuilt: false,
    });
    expect(mgr.getBonusMultiplier('trade_connections')).toBe(0.10);
  });

  it('reset clears warpGateBuilt and galacticHubBuilt', () => {
    mgr.deserialize({
      sectorBonuses: ['veteran_miner'] as SectorBonus[],
      warpGateBuilt: true,
      galacticHubBuilt: true,
    });
    mgr.reset();
    expect(mgr.warpGateBuilt).toBe(false);
    expect(mgr.galacticHubBuilt).toBe(false);
    // Bonuses persist across reset
    expect(mgr.hasSectorBonus('veteran_miner')).toBe(true);
  });

  it('reset preserves sector bonuses (they persist)', () => {
    mgr.deserialize({
      sectorBonuses: ['void_walker', 'survey_expert'] as SectorBonus[],
      warpGateBuilt: false,
      galacticHubBuilt: false,
    });
    mgr.reset();
    expect(mgr.hasSectorBonus('void_walker')).toBe(true);
    expect(mgr.hasSectorBonus('survey_expert')).toBe(true);
  });

  it('getConditions returns object with expected fields', () => {
    const conditions = mgr.getConditions();
    expect(conditions).toHaveProperty('warpGateBuilt');
    expect(conditions).toHaveProperty('galacticHubBuilt');
    expect(conditions).toHaveProperty('voidCoresProduced');
    expect(conditions).toHaveProperty('planetsVisited');
  });
});
