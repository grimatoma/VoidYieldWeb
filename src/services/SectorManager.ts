import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import { strandingManager } from '@services/StrandingManager';

/** The 10 prestige bonus options per spec 09 */
export type SectorBonus =
  | 'veteran_miner'    // +20% BER on all deposits
  | 'fleet_commander'  // Start sector 2 with 2 Scout Drones deployed
  | 'survey_expert'    // +25% survey radius on all scan tools
  | 'trade_connections' // +10% sell price on all goods
  | 'refined_tastes'   // Processing Plant efficiency +15%
  | 'research_heritage' // Start next sector with 100 RP
  | 'harvester_legacy'  // All harvesters start with +10% hopper capacity
  | 'fuel_surplus'      // Start next sector with 50 Rocket Fuel
  | 'pioneer_spirit'   // Colony needs are reduced by 10%
  | 'void_walker';     // Void Cores sell for +25%

export const SECTOR_BONUS_DESCRIPTIONS: Record<SectorBonus, string> = {
  veteran_miner: '+20% BER on all deposits this sector',
  fleet_commander: 'Start with 2 Scout Drones deployed',
  survey_expert: '+25% survey radius on all tools',
  trade_connections: '+10% sell price on all goods',
  refined_tastes: '+15% Processing Plant efficiency',
  research_heritage: 'Start next sector with 100 RP bonus',
  harvester_legacy: '+10% hopper capacity on all harvesters',
  fuel_surplus: 'Start with 50 Rocket Fuel',
  pioneer_spirit: 'Colony consumption reduced by 10%',
  void_walker: 'Void Cores sell for +25% more',
};

/** Conditions that must ALL be true to allow Sector Complete */
export interface SectorCompleteConditions {
  warpGateBuilt: boolean;
  galacticHubBuilt: boolean;
  voidCoresProduced: number;  // need >= 10
  planetsVisited: number;     // need all 4 (a1, b, a2, c)
}

export class SectorManager {
  private _sectorBonuses: SectorBonus[] = [];
  private _isSectorComplete = false;
  private _warpGateBuilt = false;
  private _galacticHubBuilt = false;

  constructor() {
    EventBus.on('warpgate:built', () => {
      this._warpGateBuilt = true;
      this._checkSectorComplete();
    });
    EventBus.on('galactichub:built', () => {
      this._galacticHubBuilt = true;
      this._checkSectorComplete();
    });
  }

  get sectorBonuses(): readonly SectorBonus[] { return this._sectorBonuses; }
  get isSectorComplete(): boolean { return this._isSectorComplete; }
  get warpGateBuilt(): boolean { return this._warpGateBuilt; }
  get galacticHubBuilt(): boolean { return this._galacticHubBuilt; }

  getConditions(): SectorCompleteConditions {
    return {
      warpGateBuilt: this._warpGateBuilt,
      galacticHubBuilt: this._galacticHubBuilt,
      voidCoresProduced: gameState.voidCoresProduced,
      planetsVisited: this._countPlanetsVisited(),
    };
  }

  hasSectorBonus(bonus: SectorBonus): boolean {
    return this._sectorBonuses.includes(bonus);
  }

  /** Get numeric effect of a bonus (e.g. trade_connections -> 0.1) */
  getBonusMultiplier(bonus: SectorBonus): number {
    if (!this.hasSectorBonus(bonus)) return 0;
    const multipliers: Record<SectorBonus, number> = {
      veteran_miner: 0.20,
      fleet_commander: 0,
      survey_expert: 0.25,
      trade_connections: 0.10,
      refined_tastes: 0.15,
      research_heritage: 0,
      harvester_legacy: 0.10,
      fuel_surplus: 0,
      pioneer_spirit: 0.10,
      void_walker: 0.25,
    };
    return multipliers[bonus];
  }

  private _countPlanetsVisited(): number {
    let count = 1; // A1 is always visited
    if (gameState.a2Visited) count++;
    if (!strandingManager.isStranded || strandingManager.rocketFuel > 20) count++; // B visited if fuel changed
    if (gameState.planetCVisited) count++;
    return count;
  }

  private _checkSectorComplete(): void {
    if (this._isSectorComplete) return;
    const conditions = this.getConditions();
    if (
      conditions.warpGateBuilt &&
      conditions.galacticHubBuilt &&
      conditions.voidCoresProduced >= 10
    ) {
      this._isSectorComplete = true;
      EventBus.emit('sector:complete');
    }
  }

  /**
   * Apply selected prestige bonus and execute full sector reset.
   * Per spec 09 + spec 15.
   */
  applyPrestigeAndReset(selectedBonus: SectorBonus): void {
    // Add the bonus (stacks with previous)
    if (!this._sectorBonuses.includes(selectedBonus)) {
      this._sectorBonuses.push(selectedBonus);
    }

    // Bonus: research_heritage -> start with 100 RP
    const startRP = this.hasSectorBonus('research_heritage') ? 100 : 0;
    // Bonus: fuel_surplus -> start with 50 RF
    const startFuel = this.hasSectorBonus('fuel_surplus') ? 50 : 100;

    // Reset game state per spec 15
    gameState.setCredits(200);
    gameState.setResearchPoints(startRP);
    // Note: tech unlocks are NOT reset per spec 15 "What Persists"

    // Broadcast the prestige reset so each service can clean itself up.
    // ConsumptionManager, LogisticsManager, and StrandingManager all listen for this.
    EventBus.emit('prestige:reset', selectedBonus, startFuel);

    // Increment sector number
    gameState.setSectorNumber(gameState.sectorNumber + 1);

    // Reset sector complete state for new sector
    this._isSectorComplete = false;
    this._warpGateBuilt = false;
    this._galacticHubBuilt = false;

    EventBus.emit('sector:reset', selectedBonus);
  }

  serialize(): { sectorBonuses: SectorBonus[]; warpGateBuilt: boolean; galacticHubBuilt: boolean } {
    return {
      sectorBonuses: [...this._sectorBonuses],
      warpGateBuilt: this._warpGateBuilt,
      galacticHubBuilt: this._galacticHubBuilt,
    };
  }

  deserialize(data: { sectorBonuses: SectorBonus[]; warpGateBuilt: boolean; galacticHubBuilt: boolean }): void {
    this._sectorBonuses = data.sectorBonuses ?? [];
    this._warpGateBuilt = data.warpGateBuilt ?? false;
    this._galacticHubBuilt = data.galacticHubBuilt ?? false;
  }

  reset(): void {
    this._isSectorComplete = false;
    this._warpGateBuilt = false;
    this._galacticHubBuilt = false;
    // NOTE: _sectorBonuses intentionally NOT reset -- they persist across sectors
  }
}

export const sectorManager = new SectorManager();
