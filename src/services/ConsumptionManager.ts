import { EventBus } from '@services/EventBus';
import type { StorageDepot } from '@entities/StorageDepot';
import type { ColonyTier, OreType } from '@data/types';

/** 1 in-game day = 20 real minutes = 1200 seconds */
const DAY_SECONDS = 1200;
/** Time needed at 100% luxury to advance tier (10 seconds) */
const LUXURY_TIMER_THRESHOLD = 10;
/** Time between individual advances (1 person per 30 seconds) */
const ADVANCEMENT_INTERVAL = 30;

interface TierConsumption {
  basicNeeds: Partial<Record<OreType, number>>;
  luxuryNeeds: OreType | null;
}

// Shared productivity formula matching original ConsumptionManager
function calcProductivityMultiplier(s: number): number {
  const clamped = Math.max(0, Math.min(1, s));
  if (clamped >= 1) return 1.0;
  if (clamped >= 0.5) return 0.65 + (clamped - 0.5) * 0.7;
  return 0.15 + clamped * 1.0;
}

const TIER_CONSUMPTION_RATES: Record<ColonyTier, TierConsumption> = {
  pioneer: {
    basicNeeds: { compressed_gas: 2, water: 1 },
    luxuryNeeds: null,
  },
  colonist: {
    basicNeeds: { compressed_gas: 2, water: 1, processed_rations: 1 },
    luxuryNeeds: 'power_cells',
  },
  technician: {
    basicNeeds: { compressed_gas: 3, water: 2, processed_rations: 2, power_cells: 1 },
    luxuryNeeds: 'bio_circuit_boards',
  },
  engineer: {
    basicNeeds: { power_cells: 2, processed_rations: 2 },
    luxuryNeeds: null,
  },
  director: {
    basicNeeds: { power_cells: 3, bio_circuit_boards: 2 },
    luxuryNeeds: null,
  },
};

export class ConsumptionManager {
  private _tierPopulation = new Map<ColonyTier, number>();
  private _housingCapacity = 0;
  private _tierBasicNeedsPct = new Map<ColonyTier, number>();
  private _tierLuxuryNeedsPct = new Map<ColonyTier, number>();
  private _luxurySatisfiedTimer = new Map<ColonyTier, number>();
  private _dayTimer = 0;
  private _advancementTimer = 0;

  constructor() {
    // Initialize with 4 Pioneers
    this._tierPopulation.set('pioneer', 4);
    this._tierPopulation.set('colonist', 0);
    this._tierPopulation.set('technician', 0);
    this._tierPopulation.set('engineer', 0);
    this._tierPopulation.set('director', 0);

    for (const tier of ['pioneer', 'colonist', 'technician', 'engineer', 'director'] as ColonyTier[]) {
      this._tierBasicNeedsPct.set(tier, 1.0);
      this._tierLuxuryNeedsPct.set(tier, 1.0);
      this._luxurySatisfiedTimer.set(tier, 0);
    }
  }

  /** Called by HabitationModule on construction */
  addHousing(capacity: number): void {
    this._housingCapacity += capacity;
    EventBus.emit('population:changed', this.getTotalPopulation(), this._housingCapacity);
  }

  /** Get population at a specific tier */
  getTierPopulation(tier: ColonyTier): number {
    return this._tierPopulation.get(tier) ?? 0;
  }

  /** Get total population across all tiers */
  getTotalPopulation(): number {
    let total = 0;
    for (const tier of ['pioneer', 'colonist', 'technician', 'engineer', 'director'] as ColonyTier[]) {
      total += this._tierPopulation.get(tier) ?? 0;
    }
    return total;
  }

  /** Directly set population at a tier — for testing/debug only */
  setTierPopulation(tier: ColonyTier, count: number): void {
    this._tierPopulation.set(tier, Math.max(0, count));
    EventBus.emit('population:changed', this.getTotalPopulation(), this._housingCapacity);
  }

  /** Reset all population to initial state */
  resetPopulation(): void {
    const tiers: ColonyTier[] = ['pioneer', 'colonist', 'technician', 'engineer', 'director'];
    for (const tier of tiers) {
      this._tierPopulation.set(tier, 0);
      this._tierBasicNeedsPct.set(tier, 1.0);
      this._tierLuxuryNeedsPct.set(tier, 1.0);
      this._luxurySatisfiedTimer.set(tier, 0);
    }
    this._tierPopulation.set('pioneer', 4);
    EventBus.emit('population:changed', this.getTotalPopulation(), this._housingCapacity);
  }

  /** Get highest tier with population > 0 */
  getCurrentTier(): ColonyTier {
    for (const tier of ['director', 'engineer', 'technician', 'colonist', 'pioneer'] as ColonyTier[]) {
      if ((this._tierPopulation.get(tier) ?? 0) > 0) {
        return tier;
      }
    }
    return 'pioneer';
  }

  /** Backward compatibility: returns total population */
  get populationCount(): number {
    return this.getTotalPopulation();
  }

  get housingCapacity(): number { return this._housingCapacity; }

  get compressedGasPct(): number { return this._tierBasicNeedsPct.get('pioneer') ?? 1.0; }
  get waterPct(): number { return this._tierBasicNeedsPct.get('pioneer') ?? 1.0; }

  /**
   * Productivity multiplier based on weighted average of all tiers' basic need satisfaction.
   */
  get productivityMultiplier(): number {
    let totalWeight = 0;
    let weightedMultiplier = 0;

    const tiers: ColonyTier[] = ['pioneer', 'colonist', 'technician', 'engineer', 'director'];
    for (const tier of tiers) {
      const pop = this._tierPopulation.get(tier) ?? 0;
      if (pop > 0) {
        const basicPct = this._tierBasicNeedsPct.get(tier) ?? 1.0;
        const tierMultiplier = calcProductivityMultiplier(basicPct);
        weightedMultiplier += tierMultiplier * pop;
        totalWeight += pop;
      }
    }

    if (totalWeight === 0) return 0.15;
    return weightedMultiplier / totalWeight;
  }

  update(delta: number, depot: StorageDepot): void {
    this._dayTimer += delta;
    this._advancementTimer += delta;

    if (this._dayTimer >= DAY_SECONDS) {
      this._dayTimer -= DAY_SECONDS;
      this._runDayTick(depot);
    }

    // Check for tier advancements
    if (this._advancementTimer >= ADVANCEMENT_INTERVAL) {
      this._advancementTimer -= ADVANCEMENT_INTERVAL;
      this._checkAdvancements();
    }
  }

  private _runDayTick(depot: StorageDepot): void {
    const stockpile = depot.getStockpile();
    const tiers: ColonyTier[] = ['pioneer', 'colonist', 'technician', 'engineer', 'director'];

    // Calculate basic need satisfaction for each tier
    for (const tier of tiers) {
      const pop = this._tierPopulation.get(tier) ?? 0;
      if (pop === 0) {
        this._tierBasicNeedsPct.set(tier, 1.0);
        continue;
      }

      const consumption = TIER_CONSUMPTION_RATES[tier];
      let satisfactionPct = 1.0;

      // Check each basic need
      const basicNeeds = consumption.basicNeeds;
      for (const [oreType, ratePerPerson] of Object.entries(basicNeeds)) {
        const totalNeeded = pop * ratePerPerson;
        const available = stockpile.get(oreType as OreType) ?? 0;
        const consumed = depot.pull(oreType as OreType, Math.min(totalNeeded, available));
        const pct = totalNeeded > 0 ? consumed / totalNeeded : 1.0;
        satisfactionPct = Math.min(satisfactionPct, pct);
      }

      this._tierBasicNeedsPct.set(tier, satisfactionPct);
    }

    // Calculate luxury need satisfaction for tiers that have them
    for (const tier of tiers) {
      const pop = this._tierPopulation.get(tier) ?? 0;
      if (pop === 0) {
        this._tierLuxuryNeedsPct.set(tier, 1.0);
        continue;
      }

      const consumption = TIER_CONSUMPTION_RATES[tier];
      if (!consumption.luxuryNeeds) {
        this._tierLuxuryNeedsPct.set(tier, 1.0);
        continue;
      }

      const luxuryNeeded = pop * 1; // 1 unit per person per day
      const luxuryAvail = stockpile.get(consumption.luxuryNeeds) ?? 0;
      const luxuryConsumed = depot.pull(consumption.luxuryNeeds, Math.min(luxuryNeeded, luxuryAvail));
      const luxuryPct = luxuryNeeded > 0 ? luxuryConsumed / luxuryNeeded : 1.0;
      this._tierLuxuryNeedsPct.set(tier, luxuryPct);
    }

    const pioneerGasPct = this._tierBasicNeedsPct.get('pioneer') ?? 1.0;
    const pioneerWaterPct = this._tierBasicNeedsPct.get('pioneer') ?? 1.0;
    EventBus.emit('needs:changed', pioneerGasPct, pioneerWaterPct);
  }

  private _checkAdvancements(): void {
    const tiers: ColonyTier[] = ['pioneer', 'colonist', 'technician', 'engineer'];
    const nextTiers: Record<ColonyTier, ColonyTier> = {
      pioneer: 'colonist',
      colonist: 'technician',
      technician: 'engineer',
      engineer: 'director',
      director: 'director',
    };

    for (const tier of tiers) {
      const pop = this._tierPopulation.get(tier) ?? 0;
      if (pop === 0) continue;

      const consumption = TIER_CONSUMPTION_RATES[tier];
      if (!consumption.luxuryNeeds) continue;

      const luxuryPct = this._tierLuxuryNeedsPct.get(tier) ?? 0;

      // Track luxury satisfaction
      const currentTimer = this._luxurySatisfiedTimer.get(tier) ?? 0;
      if (luxuryPct >= 1.0) {
        this._luxurySatisfiedTimer.set(tier, currentTimer + 0.5);
      } else {
        this._luxurySatisfiedTimer.set(tier, 0);
      }

      // Check if we can advance
      const advancementTimer = this._luxurySatisfiedTimer.get(tier) ?? 0;
      const total = this.getTotalPopulation();
      if (advancementTimer >= LUXURY_TIMER_THRESHOLD && total < this._housingCapacity) {
        // Advance 1 person
        this._tierPopulation.set(tier, pop - 1);
        const nextTier = nextTiers[tier];
        const nextTierPop = this._tierPopulation.get(nextTier) ?? 0;
        this._tierPopulation.set(nextTier, nextTierPop + 1);
        this._luxurySatisfiedTimer.set(tier, 0);
        EventBus.emit('population:changed', this.getTotalPopulation(), this._housingCapacity);
      }
    }
  }

  reset(): void {
    this._tierPopulation.set('pioneer', 4);
    this._tierPopulation.set('colonist', 0);
    this._tierPopulation.set('technician', 0);
    this._tierPopulation.set('engineer', 0);
    this._tierPopulation.set('director', 0);

    for (const tier of ['pioneer', 'colonist', 'technician', 'engineer', 'director'] as ColonyTier[]) {
      this._tierBasicNeedsPct.set(tier, 1.0);
      this._tierLuxuryNeedsPct.set(tier, 1.0);
      this._luxurySatisfiedTimer.set(tier, 0);
    }

    this._housingCapacity = 0;
    this._dayTimer = 0;
    this._advancementTimer = 0;
  }
}

export const consumptionManager = new ConsumptionManager();
