import { EventBus } from '@services/EventBus';
import type { StorageDepot } from '@entities/StorageDepot';

/** 1 in-game day = 20 real minutes = 1200 seconds */
const DAY_SECONDS = 1200;
/** Population grows 1 Pioneer every 90s when needs at 100% */
const GROWTH_INTERVAL = 90;

export class ConsumptionManager {
  private _pioneers = 4;
  private _housingCapacity = 0;
  private _compressedGasPct = 1.0;
  private _waterPct = 1.0;
  private _dayTimer = 0;
  private _growthTimer = 0;

  /** Called by HabitationModule on construction */
  addHousing(capacity: number): void {
    this._housingCapacity += capacity;
    EventBus.emit('population:changed', this._pioneers, this._housingCapacity);
  }

  get pioneers(): number { return this._pioneers; }
  get housingCapacity(): number { return this._housingCapacity; }
  get compressedGasPct(): number { return this._compressedGasPct; }
  get waterPct(): number { return this._waterPct; }

  /**
   * Productivity multiplier based on average need satisfaction.
   * 100% supply → 1.0×, 50% → 0.65×, 0% → 0.15×
   */
  get productivityMultiplier(): number {
    const avg = (this._compressedGasPct + this._waterPct) / 2;
    return this._calcMultiplier(avg);
  }

  private _calcMultiplier(s: number): number {
    const clamped = Math.max(0, Math.min(1, s));
    if (clamped >= 1) return 1.0;
    if (clamped >= 0.5) return 0.65 + (clamped - 0.5) * 0.7;
    return 0.15 + clamped * 1.0;
  }

  update(delta: number, depot: StorageDepot): void {
    this._dayTimer += delta;

    if (this._dayTimer >= DAY_SECONDS) {
      this._dayTimer -= DAY_SECONDS;
      this._runDayTick(depot);
    }

    // Population growth: only if housing available and needs fully met
    if (
      this._pioneers < this._housingCapacity &&
      this._compressedGasPct >= 1.0 &&
      this._waterPct >= 1.0
    ) {
      this._growthTimer += delta;
      if (this._growthTimer >= GROWTH_INTERVAL) {
        this._growthTimer -= GROWTH_INTERVAL;
        this._pioneers++;
        EventBus.emit('population:changed', this._pioneers, this._housingCapacity);
      }
    } else {
      this._growthTimer = 0;
    }
  }

  private _runDayTick(depot: StorageDepot): void {
    const stockpile = depot.getStockpile();

    // Compressed Gas: 2 units/pioneer/day
    const gasNeeded = this._pioneers * 2;
    const gasAvail = stockpile.get('compressed_gas') ?? 0;
    const gasConsumed = depot.pull('compressed_gas', Math.min(gasNeeded, gasAvail));
    this._compressedGasPct = gasNeeded > 0 ? gasConsumed / gasNeeded : 1.0;

    // Water: 1 unit/pioneer/day
    const waterNeeded = this._pioneers * 1;
    const waterAvail = stockpile.get('water') ?? 0;
    const waterConsumed = depot.pull('water', Math.min(waterNeeded, waterAvail));
    this._waterPct = waterNeeded > 0 ? waterConsumed / waterNeeded : 1.0;

    EventBus.emit('needs:changed', this._compressedGasPct, this._waterPct);
  }

  reset(): void {
    this._pioneers = 4;
    this._housingCapacity = 0;
    this._compressedGasPct = 1.0;
    this._waterPct = 1.0;
    this._dayTimer = 0;
    this._growthTimer = 0;
  }
}

export const consumptionManager = new ConsumptionManager();
