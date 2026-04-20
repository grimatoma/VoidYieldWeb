import { Container, Graphics } from 'pixi.js';
import type { DepositData, QualityLot, OreType } from '@data/types';

const ORE_COLORS: Record<OreType, number> = {
  vorax: 0xFF8C42,
  krysite: 0x00B8D4,
  gas: 0xA8E063,
  steel_bars: 0xD4A843,
  compressed_gas: 0x90CAF9,
  water: 0x29B6F6,
};

export class Deposit {
  readonly container: Container;
  readonly data: DepositData;
  private circle: Graphics;

  constructor(data: DepositData) {
    this.data = { ...data };
    this.container = new Container();
    this.container.x = data.x;
    this.container.y = data.y;
    this.circle = new Graphics();
    this._redraw();
    this.container.addChild(this.circle);
  }

  /** Extract up to `amount` units. Returns a QualityLot (empty attributes for M2). */
  mine(amount: number): QualityLot {
    const actual = Math.min(amount, this.data.yieldRemaining);
    this.data.yieldRemaining -= actual;
    if (this.data.yieldRemaining <= 0) {
      this.data.isExhausted = true;
      this._redraw(); // grey out
    }
    return { oreType: this.data.oreType, quantity: actual, attributes: {} };
  }

  private _redraw(): void {
    this.circle.clear();
    const color = this.data.isExhausted ? 0x555555 : ORE_COLORS[this.data.oreType];
    this.circle.circle(0, 0, 12);
    this.circle.fill(color);
  }

  serialize(): DepositData {
    return { ...this.data };
  }
}
