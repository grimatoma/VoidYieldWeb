import { Container, Graphics } from 'pixi.js';
import type { OreType, QualityLot, QualityAttributes } from '@data/types';
import { consumptionManager } from '@services/ConsumptionManager';

export type HarvesterState = 'RUNNING' | 'FUEL_EMPTY' | 'HOPPER_FULL' | 'IDLE';

export interface HarvesterConfig {
  ber: number;              // Base Extraction Rate
  hopperCapacity: number;
  fuelPerHour: number;      // 0 = self-powered (GasCollector)
  oreType: OreType;
  worldX: number;
  worldY: number;
  depositConcentration: number; // 0–100
  depositAttributes?: QualityAttributes;
}

export class HarvesterBase {
  readonly container: Container;
  readonly config: HarvesterConfig;
  hopperCurrent = 0;
  fuelCurrent: number;
  state: HarvesterState = 'IDLE';

  private body: Graphics;
  private _accumulatedUnits = 0; // fractional unit accumulator

  constructor(config: HarvesterConfig) {
    this.config = config;
    this.fuelCurrent = config.fuelPerHour > 0 ? 50 : Infinity; // start with 50 gas or infinite if self-powered

    this.container = new Container();
    this.container.x = config.worldX;
    this.container.y = config.worldY;

    this.body = new Graphics();
    this._redraw();
    this.container.addChild(this.body);
  }

  /** Called every frame. delta = seconds elapsed. */
  update(delta: number): void {
    if (this.state === 'HOPPER_FULL') return;
    if (this.config.fuelPerHour > 0 && this.fuelCurrent <= 0) {
      this.state = 'FUEL_EMPTY';
      this._redraw();
      return;
    }
    if (this.hopperCurrent >= this.config.hopperCapacity) {
      this.state = 'HOPPER_FULL';
      this._redraw();
      return;
    }

    this.state = 'RUNNING';

    // BER formula with ER attribute (spec 01/03)
    const erMultiplier = (this.config.depositAttributes?.ER ?? 500) / 500; // ER 500 = 1.0x, 1000 = 2.0x
    const flBonus = (this.config.depositAttributes?.FL ?? 0) / 1000 * this.config.ber * 0.5;
    const unitsPerSec = ((this.config.ber * this.config.depositConcentration / 100 * erMultiplier) + flBonus) / 60;
    this._accumulatedUnits += unitsPerSec * delta * consumptionManager.productivityMultiplier;

    // Flush whole units into hopper
    const whole = Math.floor(this._accumulatedUnits);
    if (whole > 0) {
      this._accumulatedUnits -= whole;
      const added = Math.min(whole, this.config.hopperCapacity - this.hopperCurrent);
      this.hopperCurrent += added;
    }

    // Consume fuel
    if (this.config.fuelPerHour > 0) {
      this.fuelCurrent -= (this.config.fuelPerHour / 3600) * delta;
      if (this.fuelCurrent < 0) this.fuelCurrent = 0;
    }

    this._redraw();
  }

  /** Refuel. Returns amount actually added. */
  refuel(amount: number): number {
    const cap = this.config.fuelPerHour * 2; // 2-hour tank
    const space = cap - this.fuelCurrent;
    const added = Math.min(amount, space);
    this.fuelCurrent += added;
    if (this.state === 'FUEL_EMPTY' && this.fuelCurrent > 0) this.state = 'IDLE';
    return added;
  }

  /** Empty hopper. Returns the QualityLot extracted. */
  emptyHopper(): QualityLot {
    const qty = Math.floor(this.hopperCurrent);
    this.hopperCurrent = 0;
    if (this.state === 'HOPPER_FULL') this.state = 'IDLE';
    this._redraw();
    return { oreType: this.config.oreType, quantity: qty, attributes: {} };
  }

  get hopperFillPct(): number {
    return this.hopperCurrent / this.config.hopperCapacity;
  }

  private _redraw(): void {
    this.body.clear();
    const color = this.state === 'RUNNING'     ? 0x4A90D9
                : this.state === 'FUEL_EMPTY'  ? 0xFFCC00
                : this.state === 'HOPPER_FULL' ? 0xFF4444
                : 0x666666;
    // 32x32 square centered
    this.body.rect(-16, -16, 32, 32).fill(color);
    this.body.rect(-16, -16, 32, 32).stroke({ width: 1, color: 0xFFFFFF });
  }
}
